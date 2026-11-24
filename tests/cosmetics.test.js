// 꾸미기(피포 의상·기체 도색·빔 색·기체 장식): 표가 서로 맞는지, 얻는 길(상품·세트·업적·조각)이 제대로 도는지.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { defaultState, sanitize } from '../src/core/state.js';
import { ACHIEVEMENTS } from '../src/data/content.js';
import { t, setLang } from '../src/i18n/index.js';
import {
  COSMETICS,
  COSMETIC_KINDS,
  COSMETIC_BY_KEY,
  DEFAULT_LOOK,
  PRODUCTS,
  SETS,
  PIECE_SERIES,
  PIECES_PER_COSTUME,
  cosmeticKey,
} from '../src/features/monetize/index.js';
import { PIPO_OUTFITS } from '../src/render3d/pipo.js';
import { PAINTS } from '../src/render3d/ufo3d.js';
import { BEAM_STYLES } from '../src/render3d/beams.js';
import { DECO_IDS } from '../src/render3d/decos.js';

function setup() {
  const clock = { t: Date.parse('2026-11-24T10:00:00') };
  const g = new Game(defaultState(), { rng: () => 0.999, now: () => clock.t });
  return { g, fx: g.fx.monetize, clock };
}

test('꾸미기 표: 모든 항목에 3D 모델이 있다', () => {
  const have = { outfit: PIPO_OUTFITS, paint: Object.keys(PAINTS), beam: Object.keys(BEAM_STYLES), deco: DECO_IDS };
  for (const c of COSMETICS) assert.ok(have[c.kind]?.includes(c.id), `${c.kind}:${c.id} 모델이 없다`);
  for (const kind of COSMETIC_KINDS) assert.ok(COSMETIC_BY_KEY[cosmeticKey(kind, DEFAULT_LOOK[kind])], `${kind} 기본값`);
});

test('꾸미기 표: 이름(한국어·영어)과 얻는 길이 모두 있다', () => {
  const cosmeticOwners = new Map();
  for (const p of PRODUCTS) for (const k of p.give.cosmetics || []) cosmeticOwners.set(k, [...(cosmeticOwners.get(k) || []), p.id]);
  for (const lang of ['ko', 'en']) {
    setLang(lang);
    for (const c of COSMETICS) {
      const key = `monetize.cosmetic.${c.kind}.${c.id}`;
      assert.notEqual(t(key), key, `${lang} 이름 없음: ${key}`);
    }
    for (const s of SETS) assert.notEqual(t(`monetize.cosmetic.set.${s.id}`), `monetize.cosmetic.set.${s.id}`);
    for (const p of PRODUCTS) {
      const k = `monetize.product.${p.id.replace(/\./g, '_')}.name`;
      assert.notEqual(t(k), k, `${lang} 상품 이름 없음: ${p.id}`);
    }
  }
  setLang('ko');
  for (const c of COSMETICS) {
    const key = cosmeticKey(c.kind, c.id);
    const owners = cosmeticOwners.get(key) || [];
    if (c.source === 'shop') assert.equal(owners.length, 1, `${key}: 낱개 상품 하나`);
    if (c.source === 'set') {
      const set = SETS.find((s) => s.id === c.set);
      assert.ok(set?.items.includes(key), `${key}: 세트 ${c.set} 에 들어 있어야`);
      assert.deepEqual(owners, [set.product], `${key}: 세트로만 판다`);
    }
    if (c.source === 'achievement') {
      assert.ok(ACHIEVEMENTS.some((a) => a.id === c.ach), `${key}: 업적 ${c.ach} 이 있어야`);
      assert.equal(owners.length, 0, `${key}: 업적 꾸미기는 팔지 않는다`);
    }
    if (c.source === 'ladder') assert.ok(PIECE_SERIES.includes(key), `${key}: 조각 차례에 있어야`);
  }
  for (const p of PRODUCTS) for (const k of p.give.cosmetics || []) assert.ok(COSMETIC_BY_KEY[k], `${p.id} 의 ${k}`);
  for (const s of SETS) {
    assert.deepEqual(
      s.items.map((k) => k.split(':')[0]),
      COSMETIC_KINDS,
      `${s.id}: 의상·도색·빔·장식 한 가지씩`,
    );
  }
});

test('테마 세트: 사면 네 가지를 모두 얻고, 한 번에 입을 수 있고, 복원된다', () => {
  const { fx } = setup();
  const set = SETS.find((s) => s.id === 'bee');
  assert.equal(fx.owns('outfit', 'bee'), false);
  const r = fx.applyPurchase(set.product, 'tx-bee');
  assert.deepEqual(r.cosmetics.sort(), [...set.items].sort());
  assert.equal(fx.canBuy(set.product), false, '세트는 한 번만');
  for (const key of set.items) {
    const [kind, id] = key.split(':');
    assert.ok(fx.equip(kind, id));
  }
  assert.deepEqual(fx.look(), { outfit: 'bee', paint: 'honey', beam: 'honey', deco: 'wings' });
  assert.ok(fx.sets().find((s) => s.id === 'bee').bought);

  // 다른 기기: 복원하면 네 가지가 돌아온다
  const other = setup();
  other.fx.restore([{ id: set.product }]);
  assert.ok(set.items.every((k) => other.fx.owns(...k.split(':'))));
});

test('업적 꾸미기: 업적을 이루면 공짜로 생기고, 저장했다 불러와도 입고 있다', () => {
  const { g, fx } = setup();
  const events = [];
  g.on('monetize:unlock', (e) => events.push(e.key));
  assert.equal(fx.owns('outfit', 'flower'), false);
  assert.equal(fx.equip('outfit', 'flower'), false);
  // 사건 10종을 기록하면 「사건 연구원」
  for (let i = 0; i < 10; i++) g.state.seen[`cause_${i}`] = 1;
  g._checkAchievements();
  assert.ok(g.state.ach.archive_10);
  assert.ok(events.includes('outfit:flower'));
  assert.ok(fx.owns('outfit', 'flower'));
  assert.ok(fx.equip('outfit', 'flower'));
  const loaded = sanitize(JSON.parse(JSON.stringify(g.state)));
  const g2 = new Game(loaded, { rng: () => 0.5, now: () => Date.parse('2026-11-25T10:00:00') });
  assert.equal(g2.fx.monetize.look().outfit, 'flower');
});

test('업적을 이루지 않았으면 저장본에 적혀 있어도 입을 수 없다', () => {
  const s = defaultState();
  s.ext.monetize = { look: { outfit: 'party', deco: 'crown', paint: 'chrome', beam: 'aurora' } };
  const g = new Game(sanitize(s), { rng: () => 0.5, now: () => Date.now() });
  assert.deepEqual(g.fx.monetize.look(), DEFAULT_LOOK);
});

test('조각 꾸미기는 차례대로(요원 → 기사 → 천사 고리), 다 모으면 남는 조각은 연구비', () => {
  const { g, fx } = setup();
  const slot = g.state.ext.monetize;
  assert.equal(fx.pieces().target, 'outfit:agent');
  const made = [];
  g.on('monetize:cosmetic', (e) => made.push(e.key));
  // 도장 보상과 같은 길(주간 보너스)로 조각을 준다
  for (let i = 0; i < PIECE_SERIES.length * PIECES_PER_COSTUME; i += 2) {
    slot.weeklyReady = true;
    fx.claimWeekly();
  }
  assert.deepEqual(made, PIECE_SERIES);
  assert.equal(fx.pieces().target, null);
  const before = g.state.grant;
  slot.weeklyReady = true;
  const r = fx.claimWeekly();
  assert.equal(slot.pieces, 0, '남는 조각은 쌓아 두지 않는다');
  assert.ok(r.grant > 0 && g.state.grant > before);
});

test('장식 종류: 장착·해제와 엉터리 저장값', () => {
  const { fx } = setup();
  assert.equal(fx.look().deco, 'none');
  fx.applyPurchase('shh.deco.propeller', 'tx-p');
  assert.ok(fx.equip('deco', 'propeller'));
  assert.equal(fx.look().deco, 'propeller');
  assert.ok(fx.equip('deco', 'none'));
  assert.equal(fx.equip('deco', 'rocket'), false, '없는 장식');
  const s = defaultState();
  s.ext.monetize = { owned: ['deco:bow', 'deco:zzz'], look: { deco: 'bow' } };
  const g = new Game(sanitize(s), { rng: () => 0.5, now: () => Date.now() });
  assert.equal(g.fx.monetize.look().deco, 'bow');
  assert.deepEqual(g.state.ext.monetize.owned, ['deco:bow']);
});
