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
 * 하늘을 올려다보는 지구인.
 * detect = 올려다보는 중에 빔을 쐈을 때 들킬 기본 확률
 * walk/look = 걷는 시간, 올려다보는 시간의 [최소, 최대] 초
 */
export const WATCHERS = {
  farmer: { cause: 'gaze_farmer', detect: 0.5, walk: [7, 13], look: [1.6, 2.6], speed: 14 },
  kid: { cause: 'gaze_kid', detect: 0.7, walk: [6, 11], look: [1.2, 2.0], speed: 26, scale: 0.74 },
  walker: { cause: 'gaze_walker', detect: 0.55, walk: [7, 13], look: [1.5, 2.4], speed: 22 },
  camper: { cause: 'gaze_camper', detect: 0.6, walk: [8, 14], look: [2.0, 3.0], speed: 10 },
  fisher: { cause: 'gaze_fisher', detect: 0.45, walk: [9, 15], look: [2.2, 3.4], speed: 8 },
  worker: { cause: 'gaze_worker', detect: 0.4, walk: [8, 14], look: [1.2, 2.0], speed: 24 },
  streamer: { cause: 'gaze_streamer', detect: 0.85, walk: [9, 15], look: [1.4, 2.2], speed: 18 },
  astronomer: { cause: 'gaze_astronomer', detect: 0.8, walk: [6, 10], look: [2.2, 3.2], speed: 12 },
  photographer: { cause: 'gaze_photographer', detect: 0.75, walk: [8, 13], look: [2.4, 3.4], speed: 12 },
  balloonist: { cause: 'gaze_balloonist', detect: 0.65, walk: [7, 12], look: [1.8, 2.8], speed: 9 },
  astronaut: { cause: 'gaze_astronaut', detect: 0.9, walk: [7, 12], look: [1.6, 2.6], speed: 7 },
};

/**
 * 표본. 터치하면 견인 빔으로 끌어올린다.
 * gain   = 한 번 모을 때 자라는 지름(cm). 표본마다 어울리는 기체 크기가 다르다.
 * risk   = 모으는 순간 들킬 기본 확률, cause = 그때 기록되는 사건
 * mode   = 화면에서 움직이는 방식, rarity = 등장 빈도 배수
 */
export const SPECIMENS = [
  { id: 'dandelion', cost: 0, gain: 1, risk: 0, cause: null, mode: 'float', rarity: 1 },
  { id: 'firefly', cost: 15, gain: 2.5, risk: 0, cause: null, mode: 'wander', rarity: 1 },
  { id: 'balloon', cost: 40, gain: 6, risk: 0.03, cause: 'balloon_kid', mode: 'float', rarity: 1 },
  { id: 'kite', cost: 100, gain: 24, risk: 0.04, cause: 'kite_string', mode: 'sway', rarity: 1 },
  { id: 'chicken', cost: 220, gain: 90, risk: 0.05, cause: 'chicken_alarm', mode: 'ground', rarity: 1 },
  { id: 'cow', cost: 450, gain: 360, risk: 0.06, cause: 'cow_moo', mode: 'ground', rarity: 1 },
  { id: 'drone', cost: 850, gain: 1500, risk: 0.07, cause: 'drone_cam', mode: 'drift', rarity: 1 },
  { id: 'weather', cost: 1500, gain: 6000, risk: 0.08, cause: 'weather_radar', mode: 'float', rarity: 1 },
  { id: 'satellite', cost: 2600, gain: 24000, risk: 0.09, cause: 'satellite_feed', mode: 'drift', rarity: 0.9 },
  { id: 'meteor', cost: 4200, gain: 60000, risk: 0.1, cause: 'meteor_wish', mode: 'streak', rarity: 0.45 },
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
  { id: 'crop', cost: 0, gain: 15, risk: 0.35, causes: ['crop_art', 'crop_typo'] },
  { id: 'cvs', cost: 30, gain: 40, risk: 0.4, causes: ['cvs_clerk'] },
  { id: 'cloudnap', cost: 80, gain: 90, risk: 0.45, causes: ['cloud_gone', 'snore'] },
  { id: 'streetlamp', cost: 170, gain: 180, risk: 0.5, causes: ['lamp_complaint'] },
  { id: 'highway', cost: 320, gain: 700, risk: 0.52, causes: ['dashcam', 'speedcam'] },
  { id: 'fireworks', cost: 560, gain: 1600, risk: 0.55, causes: ['fireworks_dud'] },
  { id: 'stadium', cost: 950, gain: 3000, risk: 0.58, causes: ['kisscam', 'homerun'] },
  { id: 'telescope', cost: 1500, gain: 13000, risk: 0.62, causes: ['telescope_eye'] },
  { id: 'airport', cost: 2300, gain: 30000, risk: 0.66, causes: ['tower_clearance'] },
  { id: 'forecast', cost: 3400, gain: 55000, risk: 0.7, causes: ['weathercast'] },
  { id: 'pyramid', cost: 4800, gain: 220000, risk: 0.74, causes: ['pyramid_photo'] },
  { id: 'moon', cost: 6500, gain: 500000, risk: 0.8, causes: ['eclipse_live'] },
];

/** 특수 사건. 표본도 시선도 임무도 아닌 곳에서 터진다. */
export const SPECIALS = {
  sneeze: { risk: 0.02 }, // 은폐를 켜는 순간
  selfie: { risk: 0.04 }, // 형태가 바뀌는 순간
  tickle: { risk: 1 }, // 기체를 연달아 건드렸을 때
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
  for (const m of MISSIONS) {
    for (const c of m.causes) list.push({ id: c, kind: 'mission', base: m.risk, ref: m.id });
  }
  for (const [id, sp] of Object.entries(SPECIALS)) {
    list.push({ id, kind: 'special', base: sp.risk, ref: id });
  }
  return list;
}

export const CAUSES = buildCauses();
export const CAUSE_BY_ID = Object.fromEntries(CAUSES.map((c) => [c.id, c]));
export const SPECIMEN_BY_ID = Object.fromEntries(SPECIMENS.map((s) => [s.id, s]));
export const MISSION_BY_ID = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

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
export const GADGET_BY_ID = Object.fromEntries(GADGETS.map((g) => [g.id, g]));

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
  { id: 'tickle', reward: 50, goal: 1, stat: (s) => (s.seen.tickle ? 1 : 0), hidden: true },
  { id: 'clear_1', reward: 1500, goal: 1, stat: (s) => s.clears },
  { id: 'true_end', reward: 3000, goal: 1, stat: (s) => (s.flags.trueEnding ? 1 : 0), hidden: true },
];
