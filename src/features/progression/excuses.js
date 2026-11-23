// 변명하기. 들킨 직후 목격자에게 둘러댈 말 세 가지를 고른다(대원마다 한 번, 판정은 game.excuse).
// 변명마다 사건 종류에 따라 그럴듯함(fit)이 다르고, 같은 변명을 자꾸 쓰면 지구인도 눈치챈다.
import { defineFeature, clean } from '../../core/features.js';
import { CAUSE_BY_ID } from '../../data/content.js';
import { kindOf, slotOf } from './shared.js';

/** 종류에 맞지 않는 변명(무리수)의 보정. */
export const ABSURD = -0.15;
/** 같은 변명을 한 번 쓸 때마다 깎이는 확률(최대 3번까지 센다). */
export const REPEAT_PENALTY = 0.06;
/** 사건에 꼭 맞는 변명의 덤. */
export const CAUSE_BONUS = 0.06;

/** 변명 표. fit[kind] = 확률 보정. 없는 종류에는 ABSURD. */
export const EXCUSES = [
  { id: 'balloon', fit: { specimen: 0.1, gaze: 0.04 } },
  { id: 'birds', fit: { gaze: 0.1, special: 0.02 } },
  { id: 'delivery', fit: { specimen: 0.1, mission: 0.04 } },
  { id: 'weather', fit: { mission: 0.1, gaze: 0.04 } },
  { id: 'costume', fit: { special: 0.1, gaze: 0.04 } },
  { id: 'film', fit: { mission: 0.1, special: 0.04 } },
  { id: 'lightshow', fit: { mission: 0.08, gaze: 0.06 } },
  { id: 'swampgas', fit: { gaze: 0.1 } },
  { id: 'dream', fit: { special: 0.1, gaze: 0.02 } },
  { id: 'art', fit: { mission: 0.1 } },
  { id: 'moon', fit: { gaze: 0.06, special: 0.04 } },
  { id: 'kite', fit: { specimen: 0.08, gaze: 0.02 } },
  { id: 'magic', fit: { specimen: 0.04, mission: 0.06, special: 0.04 } },
  { id: 'cousin', fit: { special: 0.02 } },
];
export const EXCUSE_BY_ID = Object.freeze(Object.assign(Object.create(null), Object.fromEntries(EXCUSES.map((e) => [e.id, e]))));

/** 사건에 딱 맞는(그래서 웃긴) 변명. 이 사건이면 덤을 주고, 보기에 꼭 넣는다. */
export const PERFECT_FOR = {
  balloon_kid: 'balloon',
  kite_string: 'kite',
  chicken_alarm: 'dream',
  cow_moo: 'magic',
  drone_cam: 'delivery',
  weather_radar: 'weather',
  satellite_feed: 'film',
  meteor_wish: 'moon',
  gaze_farmer: 'swampgas',
  gaze_kid: 'costume',
  gaze_walker: 'birds',
  gaze_camper: 'moon',
  gaze_fisher: 'kite',
  gaze_streamer: 'film',
  gaze_astronomer: 'weather',
  gaze_photographer: 'lightshow',
  gaze_balloonist: 'balloon',
  gaze_astronaut: 'moon',
  crop_art: 'art',
  crop_typo: 'art',
  cvs_clerk: 'costume',
  cloud_gone: 'weather',
  snore: 'dream',
  lamp_complaint: 'lightshow',
  dashcam: 'film',
  speedcam: 'delivery',
  fireworks_dud: 'lightshow',
  kisscam: 'costume',
  homerun: 'balloon',
  telescope_eye: 'swampgas',
  tower_clearance: 'weather',
  weathercast: 'weather',
  pyramid_photo: 'art',
  eclipse_live: 'moon',
  sneeze: 'dream',
  selfie: 'costume',
  tickle: 'cousin',
  // 숨은·특수 사건(없는 id 는 무시된다)
  gaze_hunter: 'birds',
  lightning: 'weather',
  observatory_dome: 'moon',
  iss_window: 'film',
  viral: 'film',
  cow_union: 'magic',
  greedy: 'cousin',
  photobomb: 'costume',
};

const initial = () => ({ used: {}, tries: 0, wins: 0, offer: null });

/** 변명 excuseId 가 사건 causeId 에 얼마나 그럴듯한지(확률 보정, 반복 감점 전). */
export function excuseFit(causeId, excuseId) {
  const ex = EXCUSE_BY_ID[excuseId];
  if (!ex) return 0;
  const kind = kindOf(causeId);
  let fit = kind && typeof ex.fit[kind] === 'number' ? ex.fit[kind] : ABSURD;
  if (PERFECT_FOR[causeId] === excuseId) fit += CAUSE_BONUS;
  return fit;
}

/** 보기 세 개: 그럴듯한 것 하나, 애매한 것 하나, 아무거나 하나(무리수일 수도). 사건에 꼭 맞는 변명이 있으면 꼭 넣는다. */
export function excuseOptions(rng, causeId) {
  const pick = (list) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
  const all = EXCUSES.map((e) => e.id);
  const fitOf = (id) => excuseFit(causeId, id);
  const out = [];
  const perfect = PERFECT_FOR[causeId];
  if (perfect && EXCUSE_BY_ID[perfect]) out.push(perfect);
  const good = all.filter((id) => !out.includes(id) && fitOf(id) >= 0.08);
  if (!out.length && good.length) out.push(pick(good));
  const meh = all.filter((id) => !out.includes(id) && fitOf(id) > ABSURD && fitOf(id) < 0.08);
  if (meh.length) out.push(pick(meh));
  while (out.length < 3) {
    const rest = all.filter((id) => !out.includes(id));
    if (!rest.length) break;
    out.push(pick(rest));
  }
  // 순서를 섞는다(정답이 늘 맨 위에 있지 않게)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

defineFeature({
  id: 'excuses',
  initial,
  sanitize(raw, init) {
    const r = clean.obj(raw);
    const used = {};
    for (const [id, n] of Object.entries(clean.obj(r.used))) if (EXCUSE_BY_ID[id]) used[id] = clean.int(n, 0, 0, 999);
    const o = clean.obj(r.offer);
    const ids = clean.arr(o.ids, (id) => (typeof id === 'string' && EXCUSE_BY_ID[id] ? id : undefined), 3);
    const offer =
      ids.length && typeof o.cause === 'string' && CAUSE_BY_ID[o.cause]
        ? { gen: clean.int(o.gen, 1, 1), cause: o.cause, ids }
        : null;
    return { used, tries: clean.int(r.tries, init.tries, 0), wins: clean.int(r.wins, init.wins, 0), offer };
  },
  install(game) {
    const slot = () => slotOf(game, 'excuses', initial);
    game.on('discovered', (report) => {
      slot().offer = { gen: report.gen, cause: report.cause, ids: excuseOptions(game.rng, report.cause) };
    });
    const done = (win) => (e) => {
      const s = slot();
      s.tries++;
      if (win) s.wins++;
      if (EXCUSE_BY_ID[e?.excuse]) s.used[e.excuse] = (s.used[e.excuse] || 0) + 1;
      s.offer = null;
    };
    game.on('excused', done(true));
    game.on('excuseFailed', done(false));
    game.on('generation', () => {
      slot().offer = null;
    });
    return {
      /** 지금 고를 수 있는 변명 [{id, chance, fit, used}]. 변명할 수 없으면 []. */
      options() {
        const s = game.state.ext?.excuses;
        const o = s?.offer;
        if (!game.canExcuse || !o) return [];
        return o.ids.map((id) => ({
          id,
          chance: game.excuseChance(id),
          fit: excuseFit(o.cause, id),
          used: s.used[id] || 0,
          perfect: PERFECT_FOR[o.cause] === id,
        }));
      },
      cause: () => game.state.ext?.excuses?.offer?.cause || null,
      stats: () => ({ tries: game.state.ext?.excuses?.tries || 0, wins: game.state.ext?.excuses?.wins || 0 }),
    };
  },
  modify(key, value, ctx, game) {
    if (key !== 'excuseChance' || !ctx || !EXCUSE_BY_ID[ctx.excuse]) return value;
    const used = Math.min(3, game.state.ext?.excuses?.used?.[ctx.excuse] || 0);
    return value + excuseFit(ctx.cause, ctx.excuse) - used * REPEAT_PENALTY;
  },
});
