// 게임 콘텐츠 테이블. 수치(밸런스)만 담고, 화면에 보이는 글은 src/i18n 에 둔다.
// 길이 단위는 전부 cm.

/** 기체 형태. min = 이 형태가 되는 최소 지름. */
export const FORMS = [
  { id: 'pod', min: 30, stage: 'farm', watchers: ['farmer'] },
  { id: 'mini', min: 100, stage: 'farm', watchers: ['farmer', 'kid'] },
  { id: 'scout', min: 400, stage: 'suburb', watchers: ['walker', 'kid'] },
  { id: 'ring', min: 1500, stage: 'camp', watchers: ['camper', 'fisher'] },
  { id: 'patrol', min: 6000, stage: 'city', watchers: ['worker', 'streamer', 'worker'] },
  { id: 'survey', min: 25000, stage: 'observatory', watchers: ['astronomer', 'photographer'] },
  { id: 'carrier', min: 100000, stage: 'cloudsea', watchers: ['balloonist', 'balloonist'] },
  { id: 'galaxy', min: 400000, stage: 'orbit', watchers: ['astronaut', 'astronaut'] },
];

/** 이 지름에 도달하면 관측 완료(엔딩). 15 km. */
export const GOAL_SIZE = 1500000;

/** 지상이 없는 무대. 지상 표본도 떠다닌다. */
export const AIRBORNE_STAGES = new Set(['cloudsea', 'orbit']);

/**
 * 날씨. 대원이 도착할 때와 관측 중 가끔 바뀐다.
 * weight = 무대별 확률 가중치, look = 올려다보기까지의 시간 배율, gaze = 시선 반폭 배율
 */
export const WEATHERS = {
  clear: { look: 1, gaze: 1 },
  rain: { look: 1.35, gaze: 0.85 },
  fog: { look: 1, gaze: 0.6 },
  storm: { look: 1.25, gaze: 0.85 },
  night: { look: 1.1, gaze: 0.75 },
};
export const STAGE_WEATHER = {
  farm: { clear: 6, rain: 1.4, fog: 1, storm: 0.6, night: 1 },
  suburb: { clear: 6, rain: 1.6, fog: 1, storm: 0.8, night: 1.4 },
  camp: { clear: 5, rain: 1.2, fog: 1.4, storm: 0.8, night: 2.2 },
  city: { clear: 6, rain: 1.8, fog: 1, storm: 1, night: 1.6 },
  observatory: { clear: 6, fog: 1, storm: 0.6, night: 2 },
  cloudsea: { clear: 6, fog: 2, storm: 1.4 },
  orbit: { clear: 1 },
};

/**
 * 무대마다 다른 규칙. 엄폐물(구름·연기)과 사람 말고도 시선을 보내는 것들.
 * covers = 엄폐물이 생기는 간격[초], source = 무대 고유 시선(예고 → 켜짐), every = 간격[초]
 */
export const STAGE_RULES = {
  farm: { covers: [16, 26] },
  suburb: { covers: [16, 26] },
  camp: { covers: [14, 22], smoke: true },
  city: { covers: [18, 28], source: { kind: 'window', cause: 'window_peek', every: [13, 21], warn: 1.1, on: 2.0, w: 0.11 } },
  observatory: { covers: [18, 28], source: { kind: 'dome', cause: 'observatory_dome', every: [16, 24], warn: 1.3, on: 3.0, w: 0.08 } },
  cloudsea: { covers: [5, 9] },
  orbit: { covers: null, source: { kind: 'iss', cause: 'iss_window', every: [18, 27], warn: 1.6, on: 4.5, w: 0.13 } },
};

/**
 * 하늘을 올려다보는 지구인.
 * detect = 시선 안에서 빔을 쐈을 때 들킬 기본 확률
 * walk/look = 걷는 시간, 올려다보는 시간의 [최소, 최대] 초
 * gaze = 시선의 모양. 시선은 기체가 떠 있는 높이에서 [gx - 반폭, gx + 반폭] 구간을 본다.
 *   w    = 반폭(화면 너비에 대한 비율)
 *   aim  = 고개를 들 때 기체 쪽을 겨냥할 확률(아니면 하늘 아무 데나)
 *   kind = aim(겨냥해서 가만히) · sudden(예고가 짧다) · drift(천천히 따라온다) · sweep(한쪽에서 반대쪽으로 훑는다)
 *          selfie(등 뒤 하늘을 화면에 담는다) · frame(3·2·1 뒤 플래시 순간에만 찍힌다) · track(기체를 끈질기게 따라온다)
 *   notice = 예고 시간 배율
 */
export const WATCHERS = {
  farmer: { cause: 'gaze_farmer', detect: 0.5, walk: [7, 13], look: [1.6, 2.6], speed: 14, gaze: { kind: 'aim', w: 0.15, aim: 0.6 } },
  kid: { cause: 'gaze_kid', detect: 0.7, walk: [6, 11], look: [1.2, 2.0], speed: 26, scale: 0.74, gaze: { kind: 'sudden', w: 0.12, aim: 0.5, notice: 0.55 } },
  walker: { cause: 'gaze_walker', detect: 0.55, walk: [7, 13], look: [1.5, 2.4], speed: 22, gaze: { kind: 'aim', w: 0.15, aim: 0.55 } },
  camper: { cause: 'gaze_camper', detect: 0.6, walk: [8, 14], look: [2.0, 3.0], speed: 10, gaze: { kind: 'drift', w: 0.19, aim: 0.35 } },
  fisher: { cause: 'gaze_fisher', detect: 0.45, walk: [9, 15], look: [2.2, 3.4], speed: 8, gaze: { kind: 'drift', w: 0.17, aim: 0.5 } },
  worker: { cause: 'gaze_worker', detect: 0.4, walk: [8, 14], look: [1.2, 2.0], speed: 24, gaze: { kind: 'sudden', w: 0.12, aim: 0.65, notice: 0.7 } },
  streamer: { cause: 'gaze_streamer', detect: 0.85, walk: [9, 15], look: [1.8, 2.6], speed: 18, gaze: { kind: 'selfie', w: 0.17, aim: 0 } },
  astronomer: { cause: 'gaze_astronomer', detect: 0.8, walk: [6, 10], look: [2.4, 3.2], speed: 12, gaze: { kind: 'sweep', w: 0.1, aim: 0 } },
  photographer: { cause: 'gaze_photographer', detect: 0.75, walk: [8, 13], look: [2.4, 3.0], speed: 12, gaze: { kind: 'frame', w: 0.15, aim: 0.75 } },
  balloonist: { cause: 'gaze_balloonist', detect: 0.65, walk: [7, 12], look: [1.8, 2.8], speed: 9, gaze: { kind: 'drift', w: 0.2, aim: 0.45 } },
  astronaut: { cause: 'gaze_astronaut', detect: 0.9, walk: [7, 12], look: [1.8, 2.8], speed: 7, gaze: { kind: 'sweep', w: 0.16, aim: 0 } },
  // 특별 손님: UFO 헌터. 무대에 정해져 있지 않고 가끔 찾아온다.
  hunter: { cause: 'gaze_hunter', detect: 0.9, walk: [3.5, 6], look: [3.2, 4.4], speed: 20, guest: true, gaze: { kind: 'track', w: 0.1, aim: 1, notice: 0.8 } },
};

/**
 * 표본. 터치하면 견인 빔으로 끌어올린다.
 * gain   = 한 번 모을 때 자라는 지름(cm). 표본마다 어울리는 기체 크기가 다르다.
 * risk   = 모으는 순간 들킬 기본 확률, cause = 그때 기록되는 사건
 * mode   = 화면에서 움직이는 방식, rarity = 등장 빈도 배수
 */
export const SPECIMENS = [
  { id: 'dandelion', cost: 0, gain: 2, risk: 0, cause: null, mode: 'float', rarity: 1 },
  { id: 'firefly', cost: 15, gain: 4, risk: 0, cause: null, mode: 'wander', rarity: 1 },
  { id: 'balloon', cost: 40, gain: 8, risk: 0.02, cause: 'balloon_kid', mode: 'float', rarity: 1 },
  { id: 'kite', cost: 100, gain: 28, risk: 0.025, cause: 'kite_string', mode: 'sway', rarity: 1 },
  { id: 'chicken', cost: 220, gain: 100, risk: 0.03, cause: 'chicken_alarm', mode: 'ground', rarity: 1 },
  { id: 'cow', cost: 450, gain: 400, risk: 0.035, cause: 'cow_moo', mode: 'ground', rarity: 1 },
  { id: 'drone', cost: 850, gain: 1600, risk: 0.04, cause: 'drone_cam', mode: 'drift', rarity: 1 },
  { id: 'weather', cost: 1500, gain: 6500, risk: 0.045, cause: 'weather_radar', mode: 'float', rarity: 1 },
  { id: 'satellite', cost: 2600, gain: 26000, risk: 0.05, cause: 'satellite_feed', mode: 'drift', rarity: 0.9 },
  { id: 'meteor', cost: 4200, gain: 65000, risk: 0.06, cause: 'meteor_wish', mode: 'streak', rarity: 0.45 },
];

/**
 * 새로 해금한 표본일수록 자주 나온다. 인덱스 = 최신 표본으로부터의 순위.
 * 오래된 표본이 화면을 덮어 성장이 막히는 일을 줄인다.
 */
export const SPAWN_RANK_WEIGHTS = [1, 0.9, 0.7, 0.5, 0.35, 0.25, 0.2, 0.15, 0.12, 0.1];

/**
 * 임무. 연료를 다 써서 출동한다. 성공하면 크게 자라고, 실패하면 들킨다.
 * gain = 성공 시 자라는 지름(cm)
 * risk = 기본 발각 확률. causes 중 하나가 무작위로 걸린다.
 */
export const MISSIONS = [
  { id: 'crop', cost: 0, gain: 25, risk: 0.2, causes: ['crop_art', 'crop_typo'] },
  { id: 'cvs', cost: 30, gain: 60, risk: 0.24, causes: ['cvs_clerk'] },
  { id: 'cloudnap', cost: 80, gain: 140, risk: 0.28, causes: ['cloud_gone', 'snore'] },
  { id: 'streetlamp', cost: 170, gain: 280, risk: 0.32, causes: ['lamp_complaint'] },
  { id: 'highway', cost: 320, gain: 1000, risk: 0.36, causes: ['dashcam', 'speedcam'] },
  { id: 'fireworks', cost: 560, gain: 2400, risk: 0.4, causes: ['fireworks_dud'] },
  { id: 'stadium', cost: 950, gain: 4500, risk: 0.44, causes: ['kisscam', 'homerun'] },
  { id: 'telescope', cost: 1500, gain: 20000, risk: 0.48, causes: ['telescope_eye'] },
  { id: 'airport', cost: 2300, gain: 45000, risk: 0.52, causes: ['tower_clearance'] },
  { id: 'forecast', cost: 3400, gain: 85000, risk: 0.56, causes: ['weathercast'] },
  { id: 'pyramid', cost: 4800, gain: 330000, risk: 0.6, causes: ['pyramid_photo'] },
  { id: 'moon', cost: 6500, gain: 750000, risk: 0.66, causes: ['eclipse_live'] },
];

/**
 * 특수 사건. 표본도 시선도 임무도 아닌 곳에서 터진다.
 * tier = 도감 등급(common · rare · legendary), hidden = 들키기 전까지 도감에 ??? 로만 보이는 숨은 사건
 */
export const SPECIALS = {
  sneeze: { risk: 0.02 }, // 은폐를 켜는 순간
  selfie: { risk: 0.04 }, // 형태가 바뀌는 순간
  tickle: { risk: 1, tier: 'rare', hidden: true }, // 기체를 연달아 건드렸을 때
  // 표본 다루기 실수
  cow_drop: { risk: 0.35 }, // 소를 들어 올리다 놓쳤을 때
  balloon_pop: { risk: 0.45 }, // 풍선을 세게 눌러 터뜨렸을 때
  kite_tangle: { risk: 0.3 }, // 연줄을 끊지 않고 연을 끌어당겼을 때
  // 날씨·무대
  lightning: { risk: 0.4, tier: 'rare' }, // 뇌우: 번개가 기체를 비췄을 때
  flashlight: { risk: 0.6 }, // 밤: 순찰 손전등에 걸렸을 때
  window_peek: { risk: 0.6 }, // 도시: 창밖을 내다본 사람
  observatory_dome: { risk: 0.7, tier: 'rare' }, // 천문대: 큰 망원경이 훑을 때
  iss_window: { risk: 0.75, tier: 'rare' }, // 궤도: 우주 정거장 창문
  // 숨은 사건
  viral: { risk: 0.5, tier: 'rare', hidden: true }, // 두 사람이 동시에 봤을 때
  cow_union: { risk: 0.25, tier: 'rare', hidden: true }, // 소를 잇달아 셋이나 데려갔을 때
  greedy: { risk: 0.3, tier: 'rare', hidden: true }, // 빔 다섯 줄을 한꺼번에 쐈을 때
  photobomb: { risk: 1, tier: 'rare', hidden: true }, // 셀카에 지구인이 찍혔을 때
};

/** 표본·시선·임무 사건 가운데 등급이 높은 것. 나머지는 common. */
const CAUSE_TIERS = {
  meteor_wish: 'rare',
  satellite_feed: 'rare',
  gaze_astronaut: 'rare',
  pyramid_photo: 'rare',
  tower_clearance: 'rare',
  eclipse_live: 'legendary',
  gaze_hunter: 'legendary',
};

/** 기체를 이만큼 연달아 건드리면 간지럼 사건 판정. */
export const TICKLE_POKES = 12;

/** 사건(발각 도감) 전체 목록을 만든다. 순서가 곧 도감 순서. */
function buildCauses() {
  const list = [];
  for (const s of SPECIMENS) {
    if (s.cause) list.push({ id: s.cause, kind: 'specimen', base: s.risk, ref: s.id });
  }
  const seenWatcher = new Set();
  for (const f of FORMS) {
    for (const w of f.watchers) {
      if (seenWatcher.has(w)) continue;
      seenWatcher.add(w);
      list.push({ id: WATCHERS[w].cause, kind: 'gaze', base: WATCHERS[w].detect, ref: w });
    }
  }
  for (const [w, cfg] of Object.entries(WATCHERS)) {
    if (cfg.guest) list.push({ id: cfg.cause, kind: 'gaze', base: cfg.detect, ref: w });
  }
  for (const m of MISSIONS) {
    for (const c of m.causes) list.push({ id: c, kind: 'mission', base: m.risk, ref: m.id });
  }
  for (const [id, sp] of Object.entries(SPECIALS)) {
    list.push({ id, kind: 'special', base: sp.risk, ref: id, tier: sp.tier, hidden: !!sp.hidden });
  }
  for (const c of list) {
    c.tier = c.tier || CAUSE_TIERS[c.id] || 'common';
    c.hidden = !!c.hidden;
  }
  return list;
}

/** id → 항목 표. 프로토타입이 없어 'constructor' 같은 이름은 없는 id 로 취급된다(저장본 검증용). */
const byId = (list) => Object.freeze(Object.assign(Object.create(null), Object.fromEntries(list.map((x) => [x.id, x]))));

export const CAUSES = buildCauses();
export const CAUSE_BY_ID = byId(CAUSES);
export const SPECIMEN_BY_ID = byId(SPECIMENS);
export const MISSION_BY_ID = byId(MISSIONS);

/**
 * 장비. cost(level) = base * growth^level.
 * 효과 계산은 core/balance.js 의 함수들이 맡는다.
 */
export const GADGETS = [
  { id: 'beam', max: 15, base: 30, growth: 1.42 },
  { id: 'cloak', max: 10, base: 40, growth: 1.5 },
  { id: 'cooler', max: 10, base: 40, growth: 1.5 },
  { id: 'radar', max: 6, base: 50, growth: 1.6 },
  { id: 'tank', max: 5, base: 60, growth: 1.9 },
  { id: 'drone', max: 9, base: 90, growth: 1.55 },
  { id: 'ai', max: 15, base: 60, growth: 1.42 },
  { id: 'autopilot', max: 5, base: 150, growth: 2.0 },
];
export const GADGET_BY_ID = byId(GADGETS);

const unique = (s) => Object.keys(s.seen).length;

/** 업적. stat(state) 가 goal 이상이면 달성, reward 만큼 연구비 지급. */
export const ACHIEVEMENTS = [
  { id: 'first_contact', reward: 20, goal: 1, stat: (s) => s.stats.discoveries },
  { id: 'archive_5', reward: 40, goal: 5, stat: unique },
  { id: 'archive_10', reward: 100, goal: 10, stat: unique },
  { id: 'archive_20', reward: 300, goal: 20, stat: unique },
  { id: 'archive_30', reward: 800, goal: 30, stat: unique },
  { id: 'archive_all', reward: 3000, goal: CAUSES.length, stat: unique },
  { id: 'form_mini', reward: 10, goal: 1, stat: (s) => s.stats.bestForm },
  { id: 'form_scout', reward: 25, goal: 2, stat: (s) => s.stats.bestForm },
  { id: 'form_ring', reward: 60, goal: 3, stat: (s) => s.stats.bestForm },
  { id: 'form_patrol', reward: 120, goal: 4, stat: (s) => s.stats.bestForm },
  { id: 'form_survey', reward: 250, goal: 5, stat: (s) => s.stats.bestForm },
  { id: 'form_carrier', reward: 500, goal: 6, stat: (s) => s.stats.bestForm },
  { id: 'form_galaxy', reward: 1000, goal: 7, stat: (s) => s.stats.bestForm },
  { id: 'specimens_100', reward: 30, goal: 100, stat: (s) => s.stats.specimens },
  { id: 'specimens_1000', reward: 200, goal: 1000, stat: (s) => s.stats.specimens },
  { id: 'specimens_5000', reward: 800, goal: 5000, stat: (s) => s.stats.specimens },
  { id: 'missions_10', reward: 60, goal: 10, stat: (s) => s.stats.missionsOk },
  { id: 'missions_50', reward: 400, goal: 50, stat: (s) => s.stats.missionsOk },
  { id: 'cloak_25', reward: 60, goal: 25, stat: (s) => s.stats.cloaks },
  { id: 'gen_10', reward: 50, goal: 10, stat: (s) => s.gen },
  { id: 'gen_50', reward: 300, goal: 50, stat: (s) => s.gen },
  { id: 'gen_100', reward: 800, goal: 100, stat: (s) => s.gen },
  { id: 'daredevil', reward: 120, goal: 1, stat: (s) => s.stats.daredevil },
  { id: 'patience', reward: 100, goal: 120, stat: (s) => s.stats.bestRunSpecimens },
  { id: 'combo_15', reward: 80, goal: 15, stat: (s) => s.stats.bestCombo || 0 },
  { id: 'near_miss_10', reward: 120, goal: 10, stat: (s) => s.stats.nearMisses || 0 },
  { id: 'excuse_1', reward: 60, goal: 1, stat: (s) => s.stats.excuses || 0 },
  { id: 'tickle', reward: 50, goal: 1, stat: (s) => (s.seen.tickle ? 1 : 0), hidden: true },
  { id: 'clear_1', reward: 1500, goal: 1, stat: (s) => s.clears },
  { id: 'true_end', reward: 3000, goal: 1, stat: (s) => (s.flags.trueEnding ? 1 : 0), hidden: true },
];
