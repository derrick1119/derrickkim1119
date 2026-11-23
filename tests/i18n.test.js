import { test } from 'node:test';
import assert from 'node:assert/strict';
import ko from '../src/i18n/ko.js';
import en from '../src/i18n/en.js';
import { t, tList, setLang, resolveJosa, formatDuration } from '../src/i18n/index.js';
import { FORMS, WATCHERS, SPECIMENS, MISSIONS, CAUSES, GADGETS, ACHIEVEMENTS } from '../src/data/content.js';

/** 모든 잎(문자열)의 경로와 값을 모은다. 배열은 길이도 함께 기록한다. */
function leaves(node, path = '', out = new Map()) {
  if (typeof node === 'string') out.set(path, node);
  else if (Array.isArray(node)) {
    out.set(`${path}.#length`, String(node.length));
    node.forEach((v, i) => leaves(v, `${path}[${i}]`, out));
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) leaves(v, path ? `${path}.${k}` : k, out);
  } else {
    throw new Error(`문자열이 아닌 값: ${path}`);
  }
  return out;
}

const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

test('한국어와 영어의 키 구조가 같다', () => {
  const a = leaves(ko);
  const b = leaves(en);
  const onlyKo = [...a.keys()].filter((k) => !b.has(k));
  const onlyEn = [...b.keys()].filter((k) => !a.has(k));
  assert.deepEqual(onlyKo, [], '영어에 없는 키');
  assert.deepEqual(onlyEn, [], '한국어에 없는 키');
  for (const [k, v] of a) {
    if (k.endsWith('.#length')) assert.equal(b.get(k), v, `배열 길이 ${k}`);
    else assert.equal(placeholders(b.get(k)), placeholders(v), `자리표시자 ${k}`);
  }
});

test('빈 문구가 없고, 영어에 한글·조사 표기가 섞이지 않았다', () => {
  for (const [k, v] of leaves(ko)) assert.ok(v.trim().length > 0, `ko ${k}`);
  for (const [k, v] of leaves(en)) {
    assert.ok(v.trim().length > 0, `en ${k}`);
    if (k.endsWith('.#length')) continue;
    assert.ok(!/[가-힣]/.test(v), `en ${k} 에 한글`);
  }
});

test('콘텐츠 테이블의 모든 항목에 문구가 있다', () => {
  for (const pack of [ko, en]) {
    for (const f of FORMS) {
      assert.ok(pack.form[f.id]?.name && pack.form[f.id]?.desc, `form ${f.id}`);
      assert.ok(pack.stage[f.stage], `stage ${f.stage}`);
    }
    for (const w of Object.keys(WATCHERS)) assert.ok(pack.watcher[w], `watcher ${w}`);
    for (const s of SPECIMENS) assert.ok(pack.specimen[s.id]?.name && pack.specimen[s.id]?.desc, `specimen ${s.id}`);
    for (const m of MISSIONS) {
      assert.ok(pack.mission[m.id]?.name && pack.mission[m.id]?.desc, `mission ${m.id}`);
      assert.ok(pack.mission[m.id].success.length >= 1, `mission ${m.id} 성공 대사`);
    }
    for (const c of CAUSES) {
      const e = pack.cause[c.id];
      assert.ok(e?.title && e?.report && e?.lesson && e?.hint, `cause ${c.id}`);
      assert.ok(pack.kind[c.kind], `kind ${c.kind}`);
    }
    assert.equal(Object.keys(pack.cause).length, CAUSES.length, '남는 사건 문구 없음');
    for (const g of GADGETS) assert.ok(pack.gadget[g.id]?.name && pack.gadget[g.id]?.effect, `gadget ${g.id}`);
    for (const a of ACHIEVEMENTS) assert.ok(pack.ach[a.id]?.name && pack.ach[a.id]?.desc, `ach ${a.id}`);
  }
});

test('조사 고르기', () => {
  assert.equal(resolveJosa('농부(이)가'), '농부가');
  assert.equal(resolveJosa('꼬마(이)가'), '꼬마가');
  assert.equal(resolveJosa('직장인(이)가'), '직장인이');
  assert.equal(resolveJosa('꼬마 접시(으)로'), '꼬마 접시로');
  assert.equal(resolveJosa('순찰선(으)로'), '순찰선으로');
  assert.equal(resolveJosa('은하 모선(으)로'), '은하 모선으로');
  assert.equal(resolveJosa('연(으)로'), '연으로');
  assert.equal(resolveJosa('물(으)로'), '물로', 'ㄹ 받침 뒤에는 로');
  assert.equal(resolveJosa('「음메 사건」(으)로 들켰습니다'), '「음메 사건」으로 들켰습니다');
  assert.equal(resolveJosa('젖소을(를)'), '젖소를');
  assert.equal(resolveJosa('닭은(는)'), '닭은');
  assert.equal(resolveJosa('UFO(으)로'), 'UFO로');
});

test('문구 조회와 치환', () => {
  setLang('ko');
  assert.equal(t('hud.gen', { n: 3 }), '제 3대 관측대원');
  assert.equal(t('toast.formUp', { name: '순찰선' }), '순찰선으로 승급!');
  assert.equal(t('gaze.look', { who: '농부' }), '쉿! 농부가 하늘을 봐요');
  assert.equal(t('없는.키'), '없는.키');
  assert.equal(tList('tips').length, ko.tips.length);
  assert.equal(formatDuration(7500), '2시간 5분');
  assert.equal(formatDuration(95), '1분 35초');
  assert.equal(formatDuration(42), '42초');
  setLang('en');
  assert.equal(t('hud.gen', { n: 3 }), en.hud.gen.replace('{n}', '3'));
  assert.equal(formatDuration(7500), '2h 5m');
  setLang('ko');
});

test('기능 모듈 문구도 한국어와 영어의 키 구조가 같다', async () => {
  await import('../src/i18n/packs/index.js');
  const { EXTRA } = await import('../src/i18n/index.js');
  for (const [ns, packs] of Object.entries(EXTRA)) {
    const a = leaves(packs.ko || {});
    const b = leaves(packs.en || {});
    assert.deepEqual([...a.keys()].filter((k) => !b.has(k)), [], `${ns}: 영어에 없는 키`);
    assert.deepEqual([...b.keys()].filter((k) => !a.has(k)), [], `${ns}: 한국어에 없는 키`);
    for (const [k, v] of a) {
      if (k.endsWith('.#length')) assert.equal(b.get(k), v, `${ns} 배열 길이 ${k}`);
      else assert.equal(placeholders(b.get(k)), placeholders(v), `${ns} 자리표시자 ${k}`);
    }
    for (const [k, v] of b) if (!k.endsWith('.#length')) assert.ok(!/[가-힣]/.test(v), `${ns} en ${k} 에 한글`);
  }
});
