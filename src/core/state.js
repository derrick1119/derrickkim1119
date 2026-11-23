// 저장 데이터의 모양과 검증. 저장본은 사용자가 내보내고 불러올 수 있으므로
// 불러올 때는 항상 sanitize() 를 거쳐 알 수 없는 값·깨진 값을 걸러 낸다.
import { CAUSE_BY_ID, SPECIMEN_BY_ID, MISSION_BY_ID, GADGETS, ACHIEVEMENTS, GOAL_SIZE } from '../data/content.js';
import { BAL, formIndexForSize } from './balance.js';
import { initialExt, sanitizeExt } from './features.js';
import './featureList.js';

export const SAVE_VERSION = 1;

export function defaultRun(size = BAL.startSize) {
  return {
    size,
    form: formIndexForSize(size),
    fuel: 0,
    specimens: 0,
    missions: 0,
    time: 0,
    cloakT: 0,
    cloakCd: 0,
    combo: 0,
    comboT: 0,
    excuseUsed: false,
  };
}

export function defaultState() {
  return {
    v: SAVE_VERSION,
    lang: null, // null = 기기 언어를 따른다
    settings: { sfx: true, music: true, haptics: true },
    grant: 0,
    gen: 1,
    clears: 0,
    phase: 'play', // play | discovered | ending
    run: defaultRun(),
    resist: {}, // causeId -> 들킨 횟수
    seen: {}, // causeId -> 처음 들킨 세대
    unlocked: { specimens: { dandelion: true }, missions: { crop: true } },
    gadgets: Object.fromEntries(GADGETS.map((g) => [g.id, 0])),
    ach: {}, // achievementId -> 달성 시각
    stats: {
      discoveries: 0,
      specimens: 0,
      missionsOk: 0,
      missionsFail: 0,
      cloaks: 0,
      bestSize: BAL.startSize,
      bestForm: 0,
      bestRunSpecimens: 0,
      daredevil: 0,
      bestCombo: 0,
      nearMisses: 0,
      excuses: 0,
      shinies: 0,
      playTime: 0,
      bySpecimen: {},
    },
    tutorial: {},
    daily: { last: null, streak: 0 },
    flags: { intro: false, ending: false, trueEnding: false },
    lastReport: null, // 발각 직후 앱을 닫았을 때 보고서를 다시 보여 주기 위한 값
    lastSeen: 0,
    ext: initialExt(), // 기능 모듈별 저장 슬롯(features.js)
  };
}

const num = (v, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(Math.max(v, min), max) : fallback;
const int = (v, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) => Math.floor(num(v, fallback, min, max));
const bool = (v, fallback) => (typeof v === 'boolean' ? v : fallback);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

/** 아무 값이나 받아 올바른 저장 상태로 만든다. 못 쓰는 입력이면 새 게임을 돌려준다. */
export function sanitize(raw) {
  const d = defaultState();
  const r = obj(raw);
  if (!raw || typeof raw !== 'object' || typeof r.v !== 'number') return d;

  const s = d;
  s.lang = r.lang === 'ko' || r.lang === 'en' ? r.lang : null;
  const st = obj(r.settings);
  s.settings = { sfx: bool(st.sfx, true), music: bool(st.music, true), haptics: bool(st.haptics, true) };
  s.grant = int(r.grant, 0);
  s.gen = int(r.gen, 1, 1);
  s.clears = int(r.clears, 0);

  const run = obj(r.run);
  const size = num(run.size, BAL.startSize, 1, GOAL_SIZE);
  s.run = {
    size,
    form: formIndexForSize(size),
    fuel: num(run.fuel, 100, 0, 100),
    specimens: int(run.specimens, 0),
    missions: int(run.missions, 0),
    time: num(run.time, 0),
    cloakT: num(run.cloakT, 0, 0, 60),
    cloakCd: num(run.cloakCd, 0, 0, 120),
    combo: 0,
    comboT: 0,
    excuseUsed: bool(run.excuseUsed, false),
  };

  for (const [id, n] of Object.entries(obj(r.resist))) {
    if (CAUSE_BY_ID[id]) s.resist[id] = int(n, 0);
  }
  for (const [id, g] of Object.entries(obj(r.seen))) {
    if (CAUSE_BY_ID[id]) {
      s.seen[id] = int(g, 1, 1);
      if (!s.resist[id]) s.resist[id] = 1; // 도감에 있는데 횟수가 0 일 수는 없다
    }
  }

  const un = obj(r.unlocked);
  for (const id of Object.keys(obj(un.specimens))) if (SPECIMEN_BY_ID[id] && un.specimens[id]) s.unlocked.specimens[id] = true;
  for (const id of Object.keys(obj(un.missions))) if (MISSION_BY_ID[id] && un.missions[id]) s.unlocked.missions[id] = true;

  const gd = obj(r.gadgets);
  for (const g of GADGETS) s.gadgets[g.id] = int(gd[g.id], 0, 0, g.max);

  const achIds = new Set(ACHIEVEMENTS.map((a) => a.id));
  for (const [id, t] of Object.entries(obj(r.ach))) if (achIds.has(id)) s.ach[id] = num(t, 1, 1);

  const rs = obj(r.stats);
  s.stats = {
    discoveries: int(rs.discoveries, 0),
    specimens: int(rs.specimens, 0),
    missionsOk: int(rs.missionsOk, 0),
    missionsFail: int(rs.missionsFail, 0),
    cloaks: int(rs.cloaks, 0),
    bestSize: num(rs.bestSize, size, 1, GOAL_SIZE),
    bestForm: int(rs.bestForm, 0, 0, 7),
    bestRunSpecimens: int(rs.bestRunSpecimens, 0),
    daredevil: int(rs.daredevil, 0),
    bestCombo: int(rs.bestCombo, 0),
    nearMisses: int(rs.nearMisses, 0),
    excuses: int(rs.excuses, 0),
    shinies: int(rs.shinies, 0),
    playTime: num(rs.playTime, 0),
    bySpecimen: {},
  };
  for (const [id, n] of Object.entries(obj(rs.bySpecimen))) {
    if (SPECIMEN_BY_ID[id]) s.stats.bySpecimen[id] = int(n, 0);
  }

  for (const [k, v] of Object.entries(obj(r.tutorial))) if (typeof v === 'boolean' && k.length < 24) s.tutorial[k] = v;

  const daily = obj(r.daily);
  s.daily = {
    last: typeof daily.last === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(daily.last) ? daily.last : null,
    streak: int(daily.streak, 0, 0, 9999),
  };

  const fl = obj(r.flags);
  s.flags = { intro: bool(fl.intro, false), ending: bool(fl.ending, false), trueEnding: bool(fl.trueEnding, false) };

  s.phase = r.phase === 'discovered' || r.phase === 'ending' ? r.phase : 'play';
  const rep = obj(r.lastReport);
  if (s.phase === 'discovered' && CAUSE_BY_ID[rep.cause]) {
    s.lastReport = {
      cause: rep.cause,
      isNew: bool(rep.isNew, false),
      grant: int(rep.grant, 0),
      before: num(rep.before, 0, 0, 1),
      after: num(rep.after, 0, 0, 1),
      size: num(rep.size, size, 0, GOAL_SIZE),
      form: int(rep.form, 0, 0, 7),
      specimens: int(rep.specimens, 0),
      missions: int(rep.missions, 0),
      gen: int(rep.gen, s.gen, 1),
      nextStart: num(rep.nextStart, BAL.startSize, 1, GOAL_SIZE),
      prevStart: num(rep.prevStart, BAL.startSize, 1, GOAL_SIZE),
    };
  } else if (s.phase === 'discovered') {
    s.phase = 'play';
  }
  s.lastSeen = num(r.lastSeen, 0);
  s.ext = sanitizeExt(r.ext);
  return s;
}

/** 저장본을 사람이 옮길 수 있는 한 줄 코드로 만든다. */
export function encodeSave(state) {
  const json = JSON.stringify(state);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `SHHUFO1.${btoa(bin)}`;
}

/** 내보낸 코드를 저장 상태로 되돌린다. 형식이 틀리면 null. */
export function decodeSave(code) {
  try {
    const text = String(code).trim();
    if (!text.startsWith('SHHUFO1.')) return null;
    const bin = atob(text.slice(8));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const raw = JSON.parse(new TextDecoder().decode(bytes));
    if (!raw || typeof raw !== 'object' || typeof raw.v !== 'number') return null;
    return sanitize(raw);
  } catch {
    return null;
  }
}
