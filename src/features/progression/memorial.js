// 명예의 전당(추모관). 귀환한 대원 30명의 기록과 역대 기록(가장 크게, 가장 오래, 표본왕)을 남긴다.
// 들킨 순간 기록을 만들어 두고(pending), 다음 대원이 오면 벽에 건다. 변명이 통하면 버린다.
import { defineFeature, clean } from '../../core/features.js';
import { CAUSE_BY_ID, GOAL_SIZE, FORMS } from '../../data/content.js';
import { TRAIT_BY_ID } from './traits.js';
import { slotOf } from './shared.js';

export const MEMORIAL_SIZE = 30;
/** 관측 완료(엔딩)로 귀환한 대원의 사유. */
export const CLEAR = 'clear';
export const RECORD_KEYS = ['size', 'time', 'specimens'];

const initial = () => ({ list: [], rec: { size: null, time: null, specimens: null }, pending: null, total: 0 });

function cleanEntry(raw) {
  const e = clean.obj(raw);
  const gen = clean.int(e.gen, 0, 0);
  if (gen < 1) return null;
  const seen = new Set();
  const traits = clean.arr(e.traits, (id) => {
    if (typeof id !== 'string' || !TRAIT_BY_ID[id] || seen.has(id)) return undefined;
    seen.add(id);
    return id;
  }, 12).slice(0, 2);
  return {
    gen,
    traits,
    size: clean.num(e.size, 30, 0, GOAL_SIZE),
    form: clean.int(e.form, 0, 0, FORMS.length - 1),
    cause: e.cause === CLEAR || (typeof e.cause === 'string' && CAUSE_BY_ID[e.cause]) ? e.cause : null,
    specimens: clean.int(e.specimens, 0, 0),
    missions: clean.int(e.missions, 0, 0),
    time: Math.round(clean.num(e.time, 0, 0, 1e8)),
    goals: clean.int(e.goals, 0, 0, 3),
  };
}

const better = (key, a, b) => !b || a[key] > b[key];

/** 기록 하나가 어느 역대 기록을 깼는지(같으면 먼저 세운 대원이 그대로 가진다). */
export function recordsBroken(rec, entry) {
  return RECORD_KEYS.filter((k) => better(k, entry, rec?.[k]));
}

function snapshot(game, report, cause) {
  const s = game.state;
  const goals = (s.ext?.goals?.gen === s.gen ? s.ext.goals.list : []).filter((g) => g.done).length;
  return cleanEntry({
    gen: report?.gen ?? s.gen,
    traits: (s.ext?.traits?.list || []).slice(),
    size: report?.size ?? s.run.size,
    form: report?.form ?? s.run.form,
    cause,
    specimens: report?.specimens ?? s.run.specimens,
    missions: report?.missions ?? s.run.missions,
    time: s.run.time,
    goals,
  });
}

function commit(game) {
  const slot = slotOf(game, 'memorial', initial);
  const e = slot.pending;
  if (!e) return null;
  slot.pending = null;
  slot.list.push(e);
  if (slot.list.length > MEMORIAL_SIZE) slot.list.splice(0, slot.list.length - MEMORIAL_SIZE);
  slot.total++;
  const broken = recordsBroken(slot.rec, e);
  for (const k of broken) slot.rec[k] = { ...e, traits: e.traits.slice() };
  game.emit('progression:memorial', { entry: e, broken });
  return e;
}

defineFeature({
  id: 'memorial',
  initial,
  sanitize(raw, init) {
    const r = clean.obj(raw);
    const list = clean.arr(r.list, (x) => cleanEntry(x) || undefined, MEMORIAL_SIZE);
    const rr = clean.obj(r.rec);
    const rec = {};
    for (const k of RECORD_KEYS) rec[k] = cleanEntry(rr[k]);
    return {
      list,
      rec,
      pending: cleanEntry(r.pending),
      total: clean.int(r.total, Math.max(init.total, list.length), list.length),
    };
  },
  install(game) {
    const slot = () => slotOf(game, 'memorial', initial);
    game.on('discovered', (report) => {
      slot().pending = snapshot(game, report, report.cause);
    });
    game.on('excused', () => {
      slot().pending = null;
    });
    game.on('ending', () => {
      slot().pending = snapshot(game, null, CLEAR);
    });
    // 대원이 바뀌는 순간 벽에 건다(성격은 들킨 순간에 이미 적어 뒀다)
    game.on('generation', () => commit(game));
    return {
      /** 벽에 걸린 대원(오래된 것부터). */
      list: () => (game.state.ext?.memorial?.list || []).slice(),
      records: () => ({ ...(game.state.ext?.memorial?.rec || {}) }),
      /** 들켜서 귀환을 기다리는 대원의 기록(보고서에 쓴다). */
      pending: () => game.state.ext?.memorial?.pending || null,
      total: () => game.state.ext?.memorial?.total || 0,
      /** entry 가 지금 역대 기록을 가진 대원인지 → ['size', ...] */
      holds(entry) {
        const rec = game.state.ext?.memorial?.rec || {};
        return RECORD_KEYS.filter((k) => rec[k] && rec[k].gen === entry.gen && rec[k][k] === entry[k]);
      },
      recordsBroken: (entry) => recordsBroken(game.state.ext?.memorial?.rec, entry),
    };
  },
});
