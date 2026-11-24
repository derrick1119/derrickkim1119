import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { World } from '../src/core/world.js';
import { defaultState, sanitize } from '../src/core/state.js';
import { seededRng } from '../src/core/rng.js';
import { PLACEMENTS, BOOST, LADDER, PIECES_PER_COSTUME, grantUnit } from '../src/features/monetize/index.js';

const always = (v) => () => v;
/** 시계를 손으로 돌리는 게임. */
function setup({ rng = always(0.999), patch = (s) => s } = {}) {
  const clock = { t: Date.parse('2026-11-24T10:00:00') };
  const g = new Game(patch(defaultState()), { rng, now: () => clock.t });
  return { g, fx: g.fx.monetize, clock };
}
const HOUR = 3600 * 1000;

test('광고 자리마다 하루 한도가 있고, 날짜가 바뀌면 다시 찬다', () => {
  const { fx, clock } = setup();
  for (let i = 0; i < PLACEMENTS.cloak.cap; i++) assert.ok(fx.recordView('cloak'));
  assert.equal(fx.canWatch('cloak').ok, false);
  assert.equal(fx.canWatch('cloak').reason, 'cap');
  assert.equal(fx.recordView('cloak'), null, '한도를 넘으면 기록되지 않는다');
  clock.t += 24 * HOUR;
  assert.ok(fx.canWatch('cloak').ok);
  assert.equal(fx.stamps(), 0, '도장도 새로 시작');
});

test('긴급 무마는 대원당 한 번', () => {
  const { g, fx } = setup();
  assert.ok(fx.recordView('coverUp'));
  assert.equal(fx.canWatch('coverUp').reason, 'cadet');
  g.state.gen++;
  assert.ok(fx.canWatch('coverUp').ok, '다음 대원은 다시');
});

test('도장 사다리: 단계에 닿으면 받을 수 있고 보상이 들어온다', () => {
  const { g, fx } = setup();
  for (let i = 0; i < 12; i++) fx.recordView(i % 2 ? 'supply' : 'boost');
  const ladder = fx.ladder();
  assert.deepEqual(ladder.filter((s) => s.reached).map((s) => s.at), [3, 7, 12]);
  const before = g.state.grant;
  const r3 = fx.claim(3);
  assert.ok(r3.grant > 0 && g.state.grant === before + r3.grant);
  assert.equal(fx.claim(3), null, '두 번 받을 수 없다');
  assert.equal(fx.claim(20), null, '아직 안 닿은 단계');
  const r7 = fx.claim(7);
  assert.equal(r7.shinyNext, 1);
  const r12 = fx.claim(12);
  assert.equal(r12.lessonTicket, 1);
  assert.equal(fx.lessonTickets(), 1);
});

test('다음 표본 반짝이 확정은 표본 하나에만 쓰인다', () => {
  const { g, fx } = setup();
  const w = new World(g, { rng: seededRng(5) });
  w.specimens = [];
  g.state.ext.monetize.shinyNext = 1;
  const a = w._spawn('dandelion');
  const b = w._spawn('dandelion');
  assert.equal(a.shiny, true);
  assert.equal(b.shiny, false, 'rng 0.999 라 두 번째는 보통');
  void fx;
});

test('7일 연속 하루 20개면 주간 보너스(의상 조각 2개)', () => {
  const { fx, clock } = setup();
  for (let d = 0; d < 7; d++) {
    for (let i = 0; i < 20; i++) fx.recordView(['supply', 'boost', 'cloak', 'report', 'reroll', 'retry'][i % 6]);
    if (d < 6) assert.equal(fx.week().ready, false);
    clock.t += 24 * HOUR;
  }
  assert.equal(fx.week().ready, true);
  const r = fx.claimWeekly();
  assert.equal(r.piece, 2);
  assert.equal(fx.pieces().have, 2);
  assert.equal(fx.week().ready, false);
});

test('의상 조각 7개면 요원 의상 완성', () => {
  const { g, fx } = setup();
  assert.equal(fx.owns('outfit', 'agent'), false);
  g.state.ext.monetize.pieces = PIECES_PER_COSTUME - 1;
  for (const [id, n] of [
    ['supply', 20],
    ['boost', 9],
    ['cloak', 1],
  ])
    for (let i = 0; i < n; i++) fx.recordView(id);
  assert.equal(fx.stamps(), 30);
  fx.claim(30);
  assert.equal(fx.owns('outfit', 'agent'), true);
  assert.ok(fx.equip('outfit', 'agent'));
  assert.equal(fx.look().outfit, 'agent');
  assert.equal(fx.equip('outfit', 'bunny'), false, '없는 의상은 못 입는다');
});

test('부스터: 광고 한 편에 20분 성장 ×2, 최대 3시간', () => {
  const { g, fx, clock } = setup();
  const base = g.gainMult;
  fx.recordView('boost');
  fx.reward('boost');
  assert.ok(Math.abs(fx.boostLeft() - BOOST.perAd) < 1);
  assert.ok(Math.abs(g.gainMult - base * 2) < 1e-9);
  for (let i = 0; i < 8; i++) fx.reward('boost');
  assert.ok(fx.boostLeft() <= BOOST.max + 1);
  clock.t += BOOST.max * 1000 + 1000;
  assert.ok(Math.abs(g.gainMult - base) < 1e-9, '끝나면 원래대로');
});

test('보급 풍선 보상: 연구비·연료·반짝이', () => {
  const { g, fx } = setup({ rng: always(0) });
  const before = g.state.grant;
  const r = fx.reward('supply');
  assert.equal(r.kind, 'grant');
  assert.ok(g.state.grant > before);
  g.rng = always(0.62);
  const f = fx.reward('supply');
  assert.equal(f.kind, 'fuel');
  assert.equal(g.run.fuel, 50);
  g.rng = always(0.99);
  const s = fx.reward('supply');
  assert.equal(s.kind, 'shiny');
  assert.ok(fx.shinyBuffLeft() > 59);
  assert.ok(Math.abs(g.mod('shinyChance', 0.02) - 0.06) < 1e-9);
});

test('보고서 연구비 ×3 은 보고서마다 한 번', () => {
  const { g, fx } = setup();
  const report = { gen: 1, grant: 40 };
  const before = g.state.grant;
  assert.equal(fx.reward('report', { report }).amount, 80);
  assert.equal(g.state.grant, before + 80);
  assert.equal(fx.reward('report', { report }).ok, false);
});

test('긴급 무마: 들킨 일을 없던 일로', () => {
  const { g, fx } = setup({ rng: always(0) });
  g.incident('cow_moo', {});
  assert.equal(g.phase, 'discovered');
  assert.ok(g.canCoverUp);
  const r = fx.reward('coverUp');
  assert.ok(r.ok);
  assert.equal(g.phase, 'play');
  assert.equal(g.uniqueCauses, 0);
});

test('교훈 카드 다시 뽑기와 희귀 선택권', () => {
  const { g, fx } = setup({ rng: seededRng(9) });
  g.incident('cow_moo', {});
  const first = g.fx.lessons.pending().ids.join();
  let changed = false;
  for (let i = 0; i < 5 && !changed; i++) changed = g.fx.lessons.reroll().ids.join() !== first;
  assert.ok(changed, '다시 뽑으면 다른 카드가 나온다');
  g.fx.lessons.dismiss();
  g.state.ext.monetize.lessonTickets = 1;
  assert.ok(fx.useLessonTicket());
  const o = g.fx.lessons.pending();
  assert.ok(o.bonus);
  for (const id of o.ids) assert.ok(['rare', 'epic'].includes(g.fx.lessons.def(id).rarity) || id === 'cash', `${id} 희귀 이상`);
});

test('자리 비움·출석 ×2 는 한 번씩', () => {
  const { g, fx } = setup();
  fx.noteDaily(100);
  const before = g.state.grant;
  assert.equal(fx.reward('daily').amount, 100);
  assert.equal(g.state.grant, before + 100);
  assert.equal(fx.reward('daily').amount, undefined);
  fx.noteOffline(20);
  const size = g.run.size;
  assert.equal(fx.reward('offline').amount, 20);
  assert.ok(g.run.size > size);
});

test('구매: 같은 거래는 한 번만, 영구 상품은 다시 못 산다, 소모형은 여러 번', () => {
  const { g, fx } = setup();
  const before = g.state.grant;
  const r = fx.applyPurchase('shh.grant.m', 'tx-1');
  assert.ok(r.grant >= grantUnit(g) * 45 * 0.99);
  assert.deepEqual(fx.applyPurchase('shh.grant.m', 'tx-1'), { duplicate: true });
  assert.equal(g.state.grant, before + r.grant);
  assert.ok(fx.canBuy('shh.grant.m'));
  fx.applyPurchase('shh.freepass', 'tx-2');
  assert.ok(fx.hasFreePass());
  assert.equal(fx.canBuy('shh.freepass'), false);
  assert.ok(fx.owns('paint', 'gold'), '프리패스 선물');
});

test('시즌 패스: 30일 성장 +25% 와 매일 연구비', () => {
  const { g, fx, clock } = setup();
  const base = g.gainMult;
  fx.applyPurchase('shh.season', 'tx-s');
  assert.ok(fx.seasonActive());
  assert.ok(Math.abs(g.gainMult - base * 1.25) < 1e-9);
  assert.ok(fx.claimSeason().grant > 0);
  assert.equal(fx.claimSeason(), null, '하루 한 번');
  clock.t += 24 * HOUR;
  assert.ok(fx.claimSeason());
  clock.t += 30 * 24 * HOUR;
  assert.equal(fx.seasonActive(), false);
  assert.ok(fx.owns('outfit', 'star'), '시즌 의상은 남는다');
});

test('한정 제안: 스타터 팩(3대째부터 48시간), 새 형태 기념 팩(24시간, 형태마다 한 번)', () => {
  const { g, fx, clock } = setup();
  assert.equal(fx.starterOffer(), null);
  g.state.gen = 3;
  g.emit('generation');
  assert.ok(fx.starterOffer());
  assert.ok(fx.canBuy('shh.starter'));
  const r = fx.applyPurchase('shh.starter', 'tx-st');
  assert.ok(r.cosmetics.includes('outfit:cadet'));
  assert.equal(g.fx.collection.slots(), 4, '진열장 한 칸');
  assert.equal(fx.canBuy('shh.starter'), false);
  assert.equal(fx.canBuy('shh.formpack'), false, '제안이 없으면 못 산다');
  g.emit('formUp', { form: 2 });
  assert.ok(fx.formOffer());
  fx.applyPurchase('shh.formpack', 'tx-f');
  assert.equal(fx.formOffer(), null, '그 형태의 팩은 한 번만');
  g.emit('formUp', { form: 3 });
  clock.t += 25 * HOUR;
  assert.equal(fx.formOffer(), null, '24시간이 지나면 끝');
});

test('구매 복원: 영구 상품과 남은 구독', () => {
  const { g, fx, clock } = setup();
  const list = fx.restore([{ id: 'shh.freepass' }, { id: 'shh.outfit.bunny' }, { id: 'shh.season', expiresAt: clock.t + 5 * 24 * HOUR }, { id: 'shh.grant.s' }, { id: 'nope' }]);
  assert.deepEqual(list.sort(), ['shh.freepass', 'shh.outfit.bunny', 'shh.season'].sort());
  assert.ok(fx.hasFreePass() && fx.owns('outfit', 'bunny') && fx.seasonActive());
  void g;
});

test('엉터리 저장 슬롯은 안전하게 걸러진다', () => {
  const s = defaultState();
  s.ext.monetize = { views: { cloak: 'x', boost: 3, hack: 9 }, stamps: -4, claimed: [3, 99, 'x'], owned: ['outfit:bunny', 'outfit:zzz', 5], look: { outfit: 'astro', paint: 'navy' }, products: { 'shh.freepass': 1, fake: 3 }, tx: [1, 'ok'], boostUntil: 'soon', offers: { form: { 2: 5, 9: 1, a: 3 } } };
  const out = sanitize(JSON.parse(JSON.stringify(s))).ext.monetize;
  assert.deepEqual(out.views, { boost: 3 });
  assert.equal(out.stamps, 0);
  assert.deepEqual(out.claimed, [3]);
  assert.deepEqual(out.owned, ['outfit:bunny']);
  assert.equal(out.look.outfit, 'none', '가지지 않은 의상은 입을 수 없다');
  assert.deepEqual(out.products, { 'shh.freepass': 1 });
  assert.deepEqual(out.tx, ['ok']);
  assert.equal(out.boostUntil, 0);
  assert.deepEqual(out.offers.form, { 2: 5 });
  assert.equal(LADDER.length, 5);
});
