// 기능 모듈 등록소.
//
// 게임의 부가 기능(성격 특성, 교훈 카드, 판별 목표, 날씨, 수집 등)은 각자 한 파일에 담고 여기에 등록한다.
// 그러면 game.js·state.js 를 고치지 않고도 기능을 더하거나 뺄 수 있다.
//
// 기능 모듈의 모양
//   defineFeature({
//     id: 'traits',                       // 저장 슬롯 이름: state.ext.traits
//     initial: () => ({ ... }),           // 새 게임의 슬롯 값(JSON 으로 저장할 수 있는 값만)
//     sanitize: (raw, initial) => slot,   // 불러온 저장본의 슬롯을 검증해 돌려준다(깨졌으면 initial)
//     install: (game) => api,             // 게임이 만들어질 때 한 번. 이벤트를 구독하고, 다른 곳에서 쓸 API 를 돌려준다(game.fx[id])
//     modify: (key, value, ctx, game) => value,  // 능력치 보정(아래 MOD_KEYS). 안 건드리면 value 그대로 돌려준다
//   })
//
// 능력치 보정 키(game.mod 가 이 순서로 모든 기능을 거친다)
//   detect        발각 확률(ctx.cause)            specimenGain  표본 성장량(ctx.id, ctx.auto)
//   missionGain   임무 성장량(ctx.id)             missionRisk   임무 발각 확률 배율(ctx.id)
//   grant         받는 연구비(ctx.source: report|mission|form|daily|goal|...)
//   gainMult      모든 성장량 배율                 startSize     다음 대원의 시작 지름
//   cloakDuration · cloakCooldown · noticeTime · fuelPerSpecimen(표본 하나가 채우는 연료 %)
//   gazeWidth     지구인 시선 반폭(px, ctx.type)   lookDelay     지구인이 다시 하늘을 보기까지의 시간 배율(ctx.type)
//   spawnRate     표본이 생기는 속도 배율          shinyChance   반짝이 변종이 나올 확률
//   comboWindow   콤보가 끊기기까지의 시간(초)      excuseChance  변명이 통할 확률(ctx.cause, ctx.excuse)

const registry = [];

/** 기능을 등록한다. 같은 id 를 두 번 등록하면 나중 것이 이긴다(개발 중 다시 불러올 때). */
export function defineFeature(feature) {
  const i = registry.findIndex((f) => f.id === feature.id);
  if (i >= 0) registry.splice(i, 1, feature);
  else registry.push(feature);
  return feature;
}

/** 등록된 기능 목록(등록 순서). */
export function features() {
  return registry;
}

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/** 모든 기능의 새 게임 슬롯. */
export function initialExt() {
  const ext = {};
  for (const f of registry) {
    try {
      ext[f.id] = f.initial ? f.initial() : {};
    } catch {
      ext[f.id] = {};
    }
  }
  return ext;
}

/** 불러온 저장본의 ext 를 기능별로 검증한다. 모르는 슬롯은 버린다. */
export function sanitizeExt(raw) {
  const src = isObj(raw) ? raw : {};
  const ext = {};
  for (const f of registry) {
    const init = f.initial ? f.initial() : {};
    try {
      ext[f.id] = f.sanitize ? f.sanitize(src[f.id], init) : isObj(src[f.id]) ? src[f.id] : init;
    } catch {
      ext[f.id] = init;
    }
    if (ext[f.id] === undefined || ext[f.id] === null) ext[f.id] = init;
  }
  return ext;
}

// ───────── 검증 도우미(기능 모듈의 sanitize 에서 쓴다) ─────────

export const clean = {
  obj: (v) => (isObj(v) ? v : {}),
  num: (v, fallback, min = -Infinity, max = Infinity) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(Math.max(v, min), max) : fallback,
  int: (v, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.floor(Math.min(Math.max(v, min), max)) : fallback,
  bool: (v, fallback) => (typeof v === 'boolean' ? v : fallback),
  str: (v, fallback, allowed = null, maxLen = 64) =>
    typeof v === 'string' && v.length <= maxLen && (!allowed || allowed.includes(v)) ? v : fallback,
  /** 배열을 검증한다. item 이 undefined 를 돌려주면 그 항목은 버린다. */
  arr: (v, item, maxLen = 200) => (Array.isArray(v) ? v.slice(0, maxLen).map(item).filter((x) => x !== undefined) : []),
};
