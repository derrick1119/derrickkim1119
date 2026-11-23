// 대원 성격(특성). 대원이 올 때마다 하나(8대부터는 둘)를 뽑는다. 장점과 단점이 하나씩 있다.
// 이름: 피포 7호 ‘겁쟁이’. 문구는 strings.js 의 progression.trait.list.<id>.
import { defineFeature, clean } from '../../core/features.js';
import { applyEffect, NON_MISSION, slotOf } from './shared.js';

/** 이 세대부터 성격이 둘이다. */
export const TWO_TRAITS_GEN = 8;

/**
 * 성격 표. fx[0] 이 장점, 나머지가 단점(화면 문구는 up/down).
 * 순서 주의: core 시험이 rng 를 0 · 0.5 · 0.999 로 고정해 첫 대원을 만든 뒤 정확한 성장량·연료를 본다.
 * 그래서 0번·가운데(6번)·마지막 항목은 표본 성장·연료·확률 하한을 건드리지 않는 성격으로 둔다.
 */
export const TRAITS = [
  { id: 'sleepy', fx: [{ key: 'cloakDuration', add: 1.5 }, { key: 'cloakCooldown', mul: 1.3 }] },
  { id: 'scaredy', fx: [{ key: 'noticeTime', add: 0.4 }, { key: 'specimenGain', mul: 0.9 }] },
  { id: 'glutton', fx: [{ key: 'fuelPerSpecimen', mul: 1.25 }, { key: 'detect', mul: 1.2, kinds: ['specimen'] }] },
  { id: 'lucky', fx: [{ key: 'shinyChance', mul: 2 }, { key: 'detect', mul: 1.5, kinds: ['special'] }] },
  { id: 'clumsy', fx: [{ key: 'gainMult', mul: 1.15 }, { key: 'comboWindow', add: -0.5 }] },
  {
    id: 'keen',
    fx: [{ key: 'detect', mul: 0.85, kinds: NON_MISSION }, { key: 'missionRisk', mul: 0.85 }, { key: 'gainMult', mul: 0.9 }],
  },
  { id: 'daredevil', fx: [{ key: 'missionGain', mul: 1.25 }, { key: 'missionRisk', mul: 1.15 }] },
  { id: 'nerd', fx: [{ key: 'grant', mul: 1.2 }, { key: 'gainMult', mul: 0.92 }] },
  { id: 'smooth', fx: [{ key: 'excuseChance', add: 0.2 }, { key: 'detect', mul: 1.1, kinds: ['gaze'] }] },
  { id: 'easygoing', fx: [{ key: 'comboWindow', add: 0.8 }, { key: 'spawnRate', mul: 0.88 }] },
  { id: 'shy', fx: [{ key: 'lookDelay', mul: 1.15 }, { key: 'missionGain', mul: 0.88 }] },
  { id: 'fidget', fx: [{ key: 'spawnRate', mul: 1.25 }, { key: 'gazeWidth', mul: 1.15 }] },
];
export const TRAIT_BY_ID = Object.freeze(Object.assign(Object.create(null), Object.fromEntries(TRAITS.map((x) => [x.id, x]))));
const IDS = TRAITS.map((x) => x.id);

const initial = () => ({ gen: 0, list: [], announced: 0, tally: {} });

/** 이 세대 대원이 가질 성격 수. */
export const traitCount = (gen) => (gen >= TWO_TRAITS_GEN ? 2 : 1);

/** 성격을 뽑는다(서로 다르게). 바로 앞 대원과 똑같은 조합은 피한다. */
export function rollTraits(rng, gen, prev = []) {
  const n = traitCount(gen);
  for (let attempt = 0; attempt < 4; attempt++) {
    const pool = IDS.slice();
    const out = [];
    for (let i = 0; i < n && pool.length; i++) {
      const k = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
      out.push(pool.splice(k, 1)[0]);
    }
    const same = out.length === prev.length && out.every((id) => prev.includes(id));
    if (!same) return out;
  }
  return IDS.filter((id) => !prev.includes(id)).slice(0, n);
}

function roll(game) {
  const slot = slotOf(game, 'traits', initial);
  const gen = game.state.gen;
  slot.list = rollTraits(game.rng, gen, slot.list);
  slot.gen = gen;
  for (const id of slot.list) slot.tally[id] = (slot.tally[id] || 0) + 1;
  game.emit('progression:traits', { gen, list: slot.list.slice() });
}

defineFeature({
  id: 'traits',
  initial,
  sanitize(raw, init) {
    const r = clean.obj(raw);
    const seen = new Set();
    const list = clean.arr(r.list, (id) => {
      if (typeof id !== 'string' || !TRAIT_BY_ID[id] || seen.has(id)) return undefined;
      seen.add(id);
      return id;
    }, 12).slice(0, 2);
    const tally = {};
    for (const [id, n] of Object.entries(clean.obj(r.tally))) if (TRAIT_BY_ID[id]) tally[id] = clean.int(n, 0, 0, 1e6);
    return {
      gen: clean.int(r.gen, init.gen, 0),
      list,
      announced: clean.int(r.announced, init.announced, 0),
      tally,
    };
  },
  install(game) {
    const ensure = () => {
      const slot = slotOf(game, 'traits', initial);
      if (slot.gen !== game.state.gen || !slot.list.length || slot.list.length !== traitCount(game.state.gen)) roll(game);
    };
    ensure();
    game.on('generation', () => roll(game));
    game.on('replaced', ensure);
    return {
      /** 지금 대원의 성격 id 목록. */
      current: () => (game.state.ext?.traits?.list || []).slice(),
      /** 지금 대원을 아직 소개하지 않았는지(도착 카드). */
      needsAnnounce: () => (game.state.ext?.traits?.announced || 0) !== game.state.gen,
      markAnnounced: () => {
        slotOf(game, 'traits', initial).announced = game.state.gen;
      },
      def: (id) => TRAIT_BY_ID[id] || null,
    };
  },
  modify(key, value, ctx, game) {
    const list = game.state.ext?.traits?.list;
    if (!Array.isArray(list) || !list.length) return value;
    let v = value;
    for (const id of list) {
      const tr = TRAIT_BY_ID[id];
      if (!tr) continue;
      for (const e of tr.fx) v = applyEffect(e, key, v, ctx);
    }
    return v;
  },
});
