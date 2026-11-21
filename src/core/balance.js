// 밸런스 공식. DOM 을 건드리지 않는 순수 함수만 둔다(테스트·시뮬레이션에서 그대로 쓴다).
import { FORMS, GOAL_SIZE, CAUSE_BY_ID, GADGET_BY_ID, MISSION_BY_ID } from '../data/content.js';

export const BAL = {
  startSize: 30,
  /** 새 사건을 하나 발견할 때마다 다음 기체의 시작 지름이 이만큼 곱해진다. */
  startGrowthPerCause: 1.22,
  /** 세대가 하나 늘 때마다 성장량 보너스(가산). */
  genGainBonus: 0.02,
  genGainBonusCap: 2.0,
  /** 관측 완료 1회당 성장량 보너스(가산). */
  clearGainBonus: 0.1,
  /** 같은 사건으로 다시 들킬 때마다 그 사건의 발각 확률에 곱해지는 값. */
  decay: { specimen: 0.7, gaze: 0.8, mission: 0.8, special: 0.5 },
  /** 발각 확률의 하한. 완전한 면역은 없다. */
  floor: { specimen: 0.003, gaze: 0.08, mission: 0.05, special: 0.004 },
  newCauseGrantMult: 3,
  reportGrantBase: 10,
  reportGrantGrowth: 1.6,
  missionGrantBase: 4,
  missionGrantGrowth: 1.35,
  formGrantBase: 5,
  formGrantGrowth: 1.6,
  baseSpecimensPerMission: 10,
  cloakBase: 3,
  cloakPerLevel: 0.4,
  cooldownBase: 30,
  cooldownPerLevel: 1.5,
  noticeBase: 0.7,
  noticePerLevel: 0.15,
  droneYield: 0.3,
  /** 자동 관측: 초당 성장량(형태 기준 지름의 비율) = 레벨 * 이 값 */
  offlineRatePerLevel: 0.0001,
  offlineCapBaseHours: 2,
  offlineCapPerLevelHours: 0.5,
  dailyBase: 30,
  dailyStreakCap: 7,
  clearGrant: 500,
};

export function formIndexForSize(size) {
  let idx = 0;
  for (let i = 0; i < FORMS.length; i++) if (size >= FORMS[i].min) idx = i;
  return idx;
}

/** 형태 idx 의 상한(다음 형태의 min, 마지막 형태는 목표 지름). */
export function formCeiling(idx) {
  return idx + 1 < FORMS.length ? FORMS[idx + 1].min : GOAL_SIZE;
}

/** 사건 causeId 로 count 번 들킨 뒤의 발각 확률. */
export function detectChance(causeId, count = 0) {
  const c = CAUSE_BY_ID[causeId];
  if (!c) return 0;
  const p = c.base * Math.pow(BAL.decay[c.kind], count);
  return Math.max(Math.min(p, 1), Math.min(BAL.floor[c.kind], c.base));
}

/** 임무의 현재 발각 확률(사건이 여럿이면 평균). */
export function missionRisk(missionId, resist) {
  const m = MISSION_BY_ID[missionId];
  let sum = 0;
  for (const c of m.causes) sum += detectChance(c, resist[c] || 0);
  return sum / m.causes.length;
}

/** 발견한 사건 수에 따른 다음 기체의 시작 지름. */
export function startSizeFor(uniqueCauses) {
  const cap = FORMS[6].min * 0.9;
  return Math.min(BAL.startSize * Math.pow(BAL.startGrowthPerCause, uniqueCauses), cap);
}

export function gainMultiplier({ gen, clears, beamLevel }) {
  const genBonus = Math.min((gen - 1) * BAL.genGainBonus, BAL.genGainBonusCap);
  return (1 + 0.1 * beamLevel) * (1 + genBonus) * (1 + clears * BAL.clearGainBonus);
}

export function gadgetCost(id, level) {
  const g = GADGET_BY_ID[id];
  return Math.round(g.base * Math.pow(g.growth, level));
}

export const cloakDuration = (lv) => BAL.cloakBase + BAL.cloakPerLevel * lv;
export const cloakCooldown = (lv) => BAL.cooldownBase - BAL.cooldownPerLevel * lv;
export const noticeTime = (lv) => BAL.noticeBase + BAL.noticePerLevel * lv;
export const specimensPerMission = (lv) => BAL.baseSpecimensPerMission - lv;
/** 수집 드론이 한 번 움직이는 간격(초). 0 레벨이면 드론이 없다(Infinity). */
export const droneInterval = (lv) => (lv <= 0 ? Infinity : Math.max(5, 10.6 - 0.6 * lv));
export const grantMultiplier = (lv) => 1 + 0.08 * lv;
export const offlineCapSeconds = (lv) =>
  lv <= 0 ? 0 : (BAL.offlineCapBaseHours + BAL.offlineCapPerLevelHours * lv) * 3600;

/** 사건 보고서로 받는 연구비. 멀리 갈수록, 새 사건일수록 많다. */
export function reportGrant({ formIndex, progress, isNew, aiLevel }) {
  const base = BAL.reportGrantBase * Math.pow(BAL.reportGrantGrowth, formIndex) * (0.6 + 0.8 * progress);
  return Math.max(1, Math.round(base * (isNew ? BAL.newCauseGrantMult : 1) * grantMultiplier(aiLevel)));
}

export function missionGrant(missionIndex, aiLevel) {
  return Math.round(BAL.missionGrantBase * Math.pow(BAL.missionGrantGrowth, missionIndex) * grantMultiplier(aiLevel));
}

export function formGrant(formIndex, aiLevel) {
  return Math.round(BAL.formGrantBase * Math.pow(BAL.formGrantGrowth, formIndex) * grantMultiplier(aiLevel));
}

/**
 * 자리를 비운 동안의 성장. 형태가 바뀌면 성장 속도도 따라 바뀌므로 구간별로 적분한다.
 * 목표 지름의 99% 에서 멈춘다(엔딩은 직접 봐야 하니까).
 */
export function offlineGrowth(size, seconds, autopilotLevel, mult = 1) {
  const cap = offlineCapSeconds(autopilotLevel);
  let left = Math.min(Math.max(seconds, 0), cap);
  const limit = GOAL_SIZE * 0.99;
  let s = size;
  const start = size;
  if (left <= 0 || s >= limit) return { size: s, gained: 0, seconds: 0 };
  const used = left;
  let guard = 0;
  while (left > 0 && s < limit && guard++ < 32) {
    const idx = formIndexForSize(s);
    const rate = FORMS[idx].min * BAL.offlineRatePerLevel * autopilotLevel * mult; // cm / 초
    const ceiling = Math.min(formCeiling(idx), limit);
    const need = (ceiling - s) / rate;
    if (need > left) {
      s += rate * left;
      left = 0;
    } else {
      s = ceiling;
      left -= need;
    }
  }
  return { size: s, gained: s - start, seconds: used - left };
}
