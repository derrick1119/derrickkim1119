// 교훈 카드. 들킨 뒤 보고서를 덮으면 카드 세 장 중 한 장을 고른다. 고른 카드는 영구히 쌓인다(카드마다 최대 단계).
// 세 장 중 한 장은 이번 사건 종류에 맞춘 카드(시선 → 레이더·시야, 표본 → 그 사건 대비·성장, 임무 → 임무 위험·성장, 특수 → 은폐·변명).
//
// 밸런스 상한: 교훈으로 줄어드는 발각 확률은 사건 하나에 대해 합쳐서 25% 를 넘지 않는다(LESSON_DETECT_CAP).
//   - 임무가 아닌 사건은 'detect' 로, 임무 사건은 'missionRisk' 로만 줄인다(이중 적용 없음, 임무 화면의 확률과 실제가 같다).
import { defineFeature, clean } from '../../core/features.js';
import { CAUSE_BY_ID, MISSION_BY_ID } from '../../data/content.js';
import { reportGrant } from '../../core/balance.js';
import { kindOf, slotOf, pickWeighted } from './shared.js';

export const RARITY_WEIGHT = { common: 60, rare: 30, epic: 10 };
export const LESSON_DETECT_CAP = 0.25;
/** 임무 위험은 한 번에 크게 움직이므로(출동 여부가 갈린다) 상한을 더 낮게 둔다. */
export const LESSON_MISSION_CAP = 0.12;
export const DRILL_STEP = 0.1;
export const DRILL_MAX = 2;
export const CASH_ID = 'cash';

/**
 * 카드 표.
 *   pct  = 단계마다 능력치에 (1 + pct × 단계) 를 곱한다
 *   add  = 단계마다 더한다
 *   red  = 발각 확률 감소(kind: 사건 종류, '*' = 모든 사건), 단계마다 step
 */
export const CARDS = [
  { id: 'radar', theme: 'gaze', rarity: 'common', max: 5, key: 'noticeTime', add: 0.06 },
  { id: 'lowkey', theme: 'gaze', rarity: 'common', max: 4, key: 'gazeWidth', pct: -0.04 },
  { id: 'eyeDrill', theme: 'gaze', rarity: 'rare', max: 4, red: { kind: 'gaze', step: 0.04 } },
  { id: 'polish', theme: 'specimen', rarity: 'common', max: 3, key: 'specimenGain', pct: 0.03 },
  { id: 'gloves', theme: 'specimen', rarity: 'rare', max: 4, red: { kind: 'specimen', step: 0.04 } },
  { id: 'overtime', theme: 'mission', rarity: 'common', max: 4, key: 'missionGain', pct: 0.04 },
  { id: 'brief', theme: 'mission', rarity: 'rare', max: 3, red: { kind: 'mission', step: 0.03 } },
  { id: 'wax', theme: 'special', rarity: 'common', max: 4, key: 'cloakDuration', add: 0.2 },
  { id: 'fan', theme: 'special', rarity: 'common', max: 4, key: 'cloakCooldown', add: -0.75 },
  { id: 'phrasebook', theme: 'special', rarity: 'rare', max: 3, key: 'excuseChance', add: 0.04 },
  { id: 'snack', theme: null, rarity: 'common', max: 3, key: 'fuelPerSpecimen', pct: 0.04 },
  { id: 'rhythm', theme: null, rarity: 'common', max: 4, key: 'comboWindow', add: 0.15 },
  { id: 'clover', theme: null, rarity: 'rare', max: 3, key: 'shinyChance', pct: 0.2 },
  { id: 'paperwork', theme: null, rarity: 'rare', max: 3, key: 'grant', pct: 0.03 },
  { id: 'warmup', theme: null, rarity: 'epic', max: 2, key: 'startSize', pct: 0.05 },
  { id: 'growth', theme: null, rarity: 'epic', max: 3, key: 'gainMult', pct: 0.03 },
  { id: 'study', theme: null, rarity: 'epic', max: 2, red: { kind: '*', step: 0.03 } },
];
export const CARD_BY_ID = Object.freeze(Object.assign(Object.create(null), Object.fromEntries(CARDS.map((c) => [c.id, c]))));
const BY_KEY = {};
for (const c of CARDS) if (c.key) (BY_KEY[c.key] ||= []).push(c);

/** 'drill:cow_moo' → 'cow_moo'(그 사건만 대비하는 카드). 아니면 null. */
export function drillCause(id) {
  if (typeof id !== 'string' || !id.startsWith('drill:')) return null;
  const cause = id.slice(6);
  return CAUSE_BY_ID[cause] ? cause : null;
}

/** 카드 정보(사건 대비·비상금 카드 포함). 모르는 id 면 null. */
export function cardDef(id) {
  if (CARD_BY_ID[id]) return CARD_BY_ID[id];
  const cause = drillCause(id);
  if (cause) return { id, theme: kindOf(cause), rarity: 'rare', max: DRILL_MAX, drill: cause };
  if (id === CASH_ID) return { id, theme: null, rarity: 'common', max: Infinity, cash: true };
  return null;
}

const isCardId = (id) => !!cardDef(id) && id !== CASH_ID;

const initial = () => ({ stacks: {}, offer: null, picks: 0 });

const stackOf = (stacks, id) => (stacks && Number.isFinite(stacks[id]) ? stacks[id] : 0);

/** 사건 하나에 대한 교훈의 발각 감소(0..LESSON_DETECT_CAP). 임무 사건은 0(임무는 missionReduction 이 맡는다). */
export function detectReduction(stacks, causeId) {
  const kind = kindOf(causeId);
  if (!kind || kind === 'mission') return 0;
  let r = stackOf(stacks, 'study') * CARD_BY_ID.study.red.step + stackOf(stacks, `drill:${causeId}`) * DRILL_STEP;
  if (kind === 'gaze') r += stackOf(stacks, 'eyeDrill') * CARD_BY_ID.eyeDrill.red.step;
  if (kind === 'specimen') r += stackOf(stacks, 'gloves') * CARD_BY_ID.gloves.red.step;
  return Math.min(LESSON_DETECT_CAP, Math.max(0, r));
}

/** 임무 하나에 대한 교훈의 위험 감소(0..LESSON_MISSION_CAP). 사건이 여럿인 임무는 사건 대비 카드를 평균 낸다. */
export function missionReduction(stacks, missionId) {
  const m = MISSION_BY_ID[missionId];
  if (!m) return 0;
  let drill = 0;
  for (const c of m.causes) drill += stackOf(stacks, `drill:${c}`) * DRILL_STEP;
  drill /= m.causes.length || 1;
  const r = stackOf(stacks, 'brief') * CARD_BY_ID.brief.red.step + stackOf(stacks, 'study') * CARD_BY_ID.study.red.step + drill;
  return Math.min(LESSON_MISSION_CAP, Math.max(0, r));
}

/** 희귀도를 먼저 뽑고(60/30/10), 그 안에서 고르게 고른다. */
function pickByRarity(rng, ids) {
  if (!ids.length) return null;
  const groups = {};
  for (const id of ids) (groups[cardDef(id).rarity] ||= []).push(id);
  const rarity = pickWeighted(rng, Object.keys(groups), (r) => RARITY_WEIGHT[r] || 1);
  const g = groups[rarity];
  return g[Math.min(g.length - 1, Math.floor(rng() * g.length))];
}

/**
 * 카드 세 장을 뽑는다. 첫 장은 이번 사건에 맞춘 카드(있으면).
 * 모든 카드를 다 모았으면 비상금 카드로 채운다.
 */
export function makeOffer(rng, stacks, causeId, { minRarity = null } = {}) {
  const RANK = { common: 0, rare: 1, epic: 2 };
  // minRarity 를 주면(본부 지원 선택권) 그 등급 이상만 나온다
  const avail = (id) => stackOf(stacks, id) < cardDef(id).max && (!minRarity || RANK[cardDef(id).rarity] >= RANK[minRarity]);
  const kind = kindOf(causeId);
  const themedPool = CARDS.filter((c) => kind && c.theme === kind && avail(c.id)).map((c) => c.id);
  if (causeId && CAUSE_BY_ID[causeId] && avail(`drill:${causeId}`)) themedPool.push(`drill:${causeId}`);
  const ids = [];
  const first = pickByRarity(rng, themedPool);
  if (first) ids.push(first);
  const general = CARDS.filter((c) => avail(c.id)).map((c) => c.id);
  while (ids.length < 3) {
    const id = pickByRarity(
      rng,
      general.filter((x) => !ids.includes(x)),
    );
    if (!id) break;
    ids.push(id);
  }
  if (ids.length < 3) ids.push(CASH_ID);
  return { ids, themed: first ? 0 : -1 };
}

/** 비상금 카드의 기본 금액(보정 전). */
export function cashBase(form, aiLevel) {
  return Math.max(5, Math.round(reportGrant({ formIndex: form, progress: 0.5, isNew: false, aiLevel }) * 0.6));
}

defineFeature({
  id: 'lessons',
  initial,
  sanitize(raw, init) {
    const r = clean.obj(raw);
    const stacks = {};
    let count = 0;
    for (const [id, n] of Object.entries(clean.obj(r.stacks))) {
      if (!isCardId(id) || count >= 200) continue;
      const v = clean.int(n, 0, 0, cardDef(id).max);
      if (v > 0) {
        stacks[id] = v;
        count++;
      }
    }
    let offer = null;
    const o = clean.obj(r.offer);
    const ids = clean.arr(o.ids, (id) => (typeof id === 'string' && cardDef(id) ? id : undefined), 3);
    if (ids.length && new Set(ids).size === ids.length) {
      offer = {
        gen: clean.int(o.gen, 1, 1),
        cause: typeof o.cause === 'string' && CAUSE_BY_ID[o.cause] ? o.cause : null,
        ids,
        themed: clean.int(o.themed, -1, -1, ids.length - 1),
        cash: clean.int(o.cash, 5, 0, 1e9),
        bonus: clean.bool(o.bonus, false),
        rerolled: clean.int(o.rerolled, 0, 0, 99),
      };
    }
    return { stacks, offer, picks: clean.int(r.picks, init.picks, 0) };
  },
  install(game) {
    const slot = () => slotOf(game, 'lessons', initial);
    game.on('discovered', (report) => {
      const s = slot();
      const { ids, themed } = makeOffer(game.rng, s.stacks, report.cause);
      s.offer = { gen: report.gen, cause: report.cause, ids, themed, cash: cashBase(report.form, game.state.gadgets.ai || 0) };
    });
    // 변명이 통하면 들킨 일이 없던 일이 되므로 교훈도 없다
    game.on('excused', () => {
      slot().offer = null;
    });
    return {
      /** 고를 차례인 카드 묶음({gen, cause, ids, themed, cash}) 또는 null. */
      pending: () => {
        const o = game.state.ext?.lessons?.offer;
        return o && Array.isArray(o.ids) && o.ids.length ? o : null;
      },
      /** 카드를 고른다. @returns {{ok: boolean, id?: string, level?: number, cash?: number}} */
      pick(id) {
        const s = slot();
        const o = s.offer;
        if (!o || !o.ids.includes(id)) return { ok: false };
        const def = cardDef(id);
        s.offer = null;
        s.picks++;
        let out;
        if (def.cash) {
          const cash = game.grantFor(o.cash, 'lesson');
          game.state.grant += cash;
          out = { ok: true, id, level: 0, cash };
        } else {
          s.stacks[id] = Math.min(def.max, stackOf(s.stacks, id) + 1);
          out = { ok: true, id, level: s.stacks[id] };
        }
        game.emit('progression:lesson', out);
        game.emit('change');
        return out;
      },
      /** 고르지 않고 넘긴다(저장본을 바꾸는 등). */
      dismiss() {
        slot().offer = null;
      },
      /** 지금 나온 카드 세 장을 새로 뽑는다(광고 보상). @returns 새 묶음 또는 null */
      reroll() {
        const s = slot();
        const o = s.offer;
        if (!o) return null;
        const { ids, themed } = makeOffer(game.rng, s.stacks, o.bonus ? null : o.cause, o.bonus ? { minRarity: 'rare' } : {});
        s.offer = { ...o, ids, themed, rerolled: (o.rerolled || 0) + 1 };
        game.emit('change');
        return s.offer;
      },
      /** 희귀 이상 카드 세 장 중 하나를 고르는 선택권(본부 지원 도장 보상). 이미 고를 카드가 있으면 false. */
      offerBonus() {
        const s = slot();
        if (s.offer) return false;
        const { ids } = makeOffer(game.rng, s.stacks, null, { minRarity: 'rare' });
        s.offer = { gen: game.state.gen, cause: null, ids, themed: -1, cash: cashBase(game.formIndex, game.state.gadgets.ai || 0), bonus: true };
        game.emit('change');
        return true;
      },
      level: (id) => stackOf(game.state.ext?.lessons?.stacks, id),
      /** 모은 카드 목록 [{id, level, max}] (단계가 높은 순). */
      owned() {
        const st = game.state.ext?.lessons?.stacks || {};
        return Object.entries(st)
          .filter(([id, n]) => n > 0 && cardDef(id))
          .map(([id, n]) => ({ id, level: n, max: cardDef(id).max }))
          .sort((a, b) => b.level - a.level || a.id.localeCompare(b.id));
      },
      def: cardDef,
      detectReduction: (cause) => detectReduction(game.state.ext?.lessons?.stacks, cause),
      missionReduction: (id) => missionReduction(game.state.ext?.lessons?.stacks, id),
    };
  },
  modify(key, value, ctx, game) {
    const st = game.state.ext?.lessons?.stacks;
    if (!st) return value;
    if (key === 'detect') return value * (1 - detectReduction(st, ctx?.cause));
    if (key === 'missionRisk') return value * (1 - missionReduction(st, ctx?.id));
    const list = BY_KEY[key];
    if (!list) return value;
    let v = value;
    for (const c of list) {
      const n = stackOf(st, c.id);
      if (!n) continue;
      if (c.pct) v *= 1 + c.pct * n;
      if (c.add) v += c.add * n;
    }
    return v;
  },
});
