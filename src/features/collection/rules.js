// 수집 기능의 규칙(순수 함수와 표). DOM·three.js 를 쓰지 않는다.
//   · 반짝이 도감: 종류별로 모은 반짝이 수와 처음 찾은 세대
//   · 관측실 선반: 모은 표본을 진열하면 작은 보정. 반짝이를 올리면 두 배. 서식지 세트를 맞추면 덤.
//   · 셀카 앨범: 사진 수와 찍은 관측지(사진 자체는 저장본 밖에 둔다)
import { SPECIMENS, SPECIMEN_BY_ID, FORMS } from '../../data/content.js';
import { clean } from '../../core/features.js';

/** 처음 여는 진열 자리 수와 최대 자리 수. */
export const SHELF_START = 3;
export const SHELF_MAX = 8;
/** 4번째 ~ 8번째 자리를 여는 연구비. */
export const SLOT_COSTS = [120, 400, 1100, 2800, 6500];
/** 반짝이 표본을 진열하면 효과가 이만큼 곱해진다. */
export const SHINY_DISPLAY_MULT = 2;
/** 앨범에 남기는 사진 수(즐겨찾기한 사진은 밀려나지 않는다). */
export const ALBUM_MAX = 12;
/** 사진을 찍을 때 누군가 하늘을 보고 있으면 이 확률로 '사진에 찍힌 지구인' 사건(발각 저항이 붙으면 줄어든다). */
export const PHOTOBOMB_CHANCE = 0.06;
/** 사진기 재사용 대기(초). */
export const PHOTO_COOLDOWN = 8;
const DEX_MAX = 999999;

/**
 * 진열 효과. op: mul = 값 × (1 + v), add = 값 + v.  v 는 반짝이가 아닐 때의 값.
 * 키는 core/features.js 의 능력치 보정 키.
 */
export const ROOM_BONUS = {
  dandelion: { key: 'specimenGain', op: 'mul', v: 0.03 },
  firefly: { key: 'noticeTime', op: 'add', v: 0.05 },
  balloon: { key: 'excuseChance', op: 'add', v: 0.02 },
  kite: { key: 'comboWindow', op: 'add', v: 0.1 },
  chicken: { key: 'fuelPerSpecimen', op: 'mul', v: 0.04 },
  cow: { key: 'missionGain', op: 'mul', v: 0.04 },
  drone: { key: 'cloakCooldown', op: 'mul', v: -0.03 },
  weather: { key: 'gazeWidth', op: 'mul', v: -0.03 },
  satellite: { key: 'detect', op: 'mul', v: -0.02 },
  meteor: { key: 'shinyChance', op: 'add', v: 0.005 },
};

/** 서식지 세트: 같은 서식지의 표본을 need 종류 이상 진열하면 켜진다. */
export const ROOM_SETS = [
  { id: 'meadow', kinds: ['dandelion', 'firefly', 'chicken', 'cow'], need: 3, key: 'gainMult', op: 'mul', v: 0.03 },
  { id: 'sky', kinds: ['balloon', 'kite', 'weather'], need: 3, key: 'lookDelay', op: 'mul', v: 0.05 },
  { id: 'space', kinds: ['drone', 'satellite', 'meteor'], need: 3, key: 'grant', op: 'mul', v: 0.05 },
];

/** 관측실 보정 합계의 상한(절댓값). 한 종류는 한 자리에만 올리므로 보통은 닿지 않는 안전장치다. */
export const ROOM_CAPS = {
  specimenGain: 0.06,
  noticeTime: 0.1,
  excuseChance: 0.04,
  comboWindow: 0.2,
  fuelPerSpecimen: 0.08,
  missionGain: 0.08,
  cloakCooldown: 0.06,
  gazeWidth: 0.06,
  detect: 0.04,
  shinyChance: 0.01,
  gainMult: 0.03,
  lookDelay: 0.05,
  grant: 0.05,
};

/** 앨범 업적. stat = shots(찍은 사진 수) | stages(사진을 찍은 관측지 수) */
export const ALBUM_GOALS = [
  { id: 'firstPhoto', stat: 'shots', need: 1, reward: 20 },
  { id: 'tourist', stat: 'stages', need: 4, reward: 250 },
  { id: 'globetrotter', stat: 'stages', need: 7, reward: 1200 },
];
const GOAL_IDS = ALBUM_GOALS.map((g) => g.id);

/** 관측지 id 목록(형태 순서). */
export const STAGE_IDS = [...new Set(FORMS.map((f) => f.stage))];

/** 종류별 첫 반짝이 보상(연구비, 보정 전). 비싼 표본일수록 많다. */
export function shinyReward(kind) {
  const i = SPECIMENS.findIndex((s) => s.id === kind);
  return i < 0 ? 0 : Math.round(25 * Math.pow(1.6, i));
}

/** 다음 진열 자리 값. 다 열었으면 null. */
export function slotCost(slots) {
  const i = slots - SHELF_START;
  return i >= 0 && i < SLOT_COSTS.length ? SLOT_COSTS[i] : null;
}

export function initialSlot() {
  return {
    dex: {}, // kind → { n: 모은 반짝이 수, gen: 처음 찾은 세대 }
    slots: SHELF_START,
    shelf: Array(SHELF_START).fill(null), // { id, shiny } | null
    album: { shots: 0, stages: [], got: [] },
  };
}

/** 불러온 저장본의 슬롯을 검증한다. 모르는 값·깨진 값은 버린다. */
export function sanitizeSlot(raw) {
  const r = clean.obj(raw);
  const out = initialSlot();
  for (const [id, e] of Object.entries(clean.obj(r.dex))) {
    if (!SPECIMEN_BY_ID[id]) continue;
    const o = clean.obj(e);
    const n = clean.int(o.n, 0, 0, DEX_MAX);
    if (n > 0) out.dex[id] = { n, gen: clean.int(o.gen, 1, 1) };
  }
  out.slots = clean.int(r.slots, SHELF_START, SHELF_START, SHELF_MAX);
  const shelf = Array.isArray(r.shelf) ? r.shelf : [];
  const used = new Set();
  out.shelf = Array.from({ length: out.slots }, (_, i) => {
    const e = clean.obj(shelf[i]);
    const id = clean.str(e.id, null, null, 24);
    if (!id || !SPECIMEN_BY_ID[id] || used.has(id)) return null;
    used.add(id);
    return { id, shiny: clean.bool(e.shiny, false) && !!out.dex[id] };
  });
  const a = clean.obj(r.album);
  const uniq = (list, allowed) => [...new Set(clean.arr(list, (v) => (typeof v === 'string' && allowed.includes(v) ? v : undefined), 32))];
  out.album = { shots: clean.int(a.shots, 0), stages: uniq(a.stages, STAGE_IDS), got: uniq(a.got, GOAL_IDS) };
  return out;
}

// ───────── 반짝이 도감 ─────────

/**
 * 반짝이를 하나 기록한다(슬롯을 바꾼다).
 * @returns {{count: number, first: boolean}}
 */
export function recordShiny(slot, kind, gen) {
  if (!SPECIMEN_BY_ID[kind]) return { count: 0, first: false };
  const e = slot.dex[kind];
  if (e) {
    e.n = Math.min(DEX_MAX, e.n + 1);
    return { count: e.n, first: false };
  }
  slot.dex[kind] = { n: 1, gen: Math.max(1, Math.floor(gen) || 1) };
  return { count: 1, first: true };
}

// ───────── 관측실 ─────────

/** 진열할 수 있는지. collected = 그 종류를 한 번이라도 모았는지(stats.bySpecimen). */
export function canPlace(slot, index, kind, shiny, collected) {
  if (!Number.isInteger(index) || index < 0 || index >= slot.slots) return false;
  if (!SPECIMEN_BY_ID[kind] || !collected) return false;
  if (shiny && !slot.dex[kind]) return false;
  // 같은 종류는 한 자리에만(지금 그 자리에 있는 것은 바꿔 올려도 된다)
  return !slot.shelf.some((e, i) => e && e.id === kind && i !== index);
}

/** 자리 index 에 올린다(슬롯을 바꾼다). */
export function place(slot, index, kind, shiny, collected) {
  if (!canPlace(slot, index, kind, shiny, collected)) return false;
  slot.shelf[index] = { id: kind, shiny: !!shiny };
  return true;
}

/** 진열 자리를 하나 늘린다(연구비 계산은 부르는 쪽). */
export function addSlot(slot) {
  if (slot.slots >= SHELF_MAX) return false;
  slot.slots++;
  while (slot.shelf.length < slot.slots) slot.shelf.push(null);
  return true;
}

/**
 * 진열 효과를 모은다.
 * @param {object} slot
 * @param {(kind: string) => boolean} collected 그 종류를 모은 적이 있는지(없으면 효과 없음)
 * @returns {{items: object[], sets: object[], totals: Record<string, {op: string, v: number}>}}
 */
export function roomBonuses(slot, collected) {
  const items = [];
  const shown = new Set();
  const raw = {};
  const addTo = (key, op, v) => {
    if (!raw[key]) raw[key] = { op, v: 0 };
    raw[key].v += v;
  };
  slot.shelf.forEach((e, index) => {
    if (!e) return;
    const b = ROOM_BONUS[e.id];
    const shiny = !!e.shiny && !!slot.dex[e.id];
    const active = !!b && !shown.has(e.id) && collected(e.id);
    const v = b ? b.v * (shiny ? SHINY_DISPLAY_MULT : 1) : 0;
    items.push({ index, id: e.id, shiny, active, key: b?.key, op: b?.op, v });
    if (!active) return;
    shown.add(e.id);
    addTo(b.key, b.op, v);
  });
  const sets = ROOM_SETS.map((s) => {
    const have = s.kinds.filter((k) => shown.has(k)).length;
    const done = have >= s.need;
    if (done) addTo(s.key, s.op, s.v);
    return { id: s.id, kinds: s.kinds, have, need: s.need, done, key: s.key, op: s.op, v: s.v };
  });
  const totals = {};
  for (const [key, { op, v }] of Object.entries(raw)) {
    const cap = ROOM_CAPS[key] ?? 0.05;
    const c = Math.min(Math.max(v, -cap), cap);
    if (c !== 0) totals[key] = { op, v: c };
  }
  return { items, sets, totals };
}

/** 모아 둔 보정을 값 하나에 적용한다. */
export function applyTotal(total, value) {
  if (!total) return value;
  return total.op === 'mul' ? value * (1 + total.v) : value + total.v;
}

// ───────── 셀카 앨범 ─────────

/**
 * 사진 한 장을 기록하고 새로 이룬 앨범 업적을 돌려준다(슬롯을 바꾼다).
 * @returns {{newStage: boolean, goals: {id: string, reward: number}[]}}
 */
export function recordPhoto(slot, stageId) {
  const a = slot.album;
  a.shots = Math.min(a.shots + 1, DEX_MAX);
  const newStage = STAGE_IDS.includes(stageId) && !a.stages.includes(stageId);
  if (newStage) a.stages.push(stageId);
  const goals = [];
  for (const g of ALBUM_GOALS) {
    if (a.got.includes(g.id)) continue;
    const have = g.stat === 'shots' ? a.shots : a.stages.length;
    if (have >= g.need) {
      a.got.push(g.id);
      goals.push({ id: g.id, reward: g.reward });
    }
  }
  return { newStage, goals };
}

/**
 * 사진을 찍는 순간 지구인에게 찍힐 확률.
 * @param {{watching: number, cloaked: boolean, rel?: number}} o rel = 사건 저항·보정이 반영된 상대 배율(0..1)
 */
export function photobombChance({ watching, cloaked, rel = 1 }) {
  if (!(watching > 0) || cloaked) return 0;
  return PHOTOBOMB_CHANCE * Math.min(1, Math.max(0, rel));
}
