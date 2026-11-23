// 임무 → 미니게임 틀과 난이도. 순수 데이터와 함수만 둔다(테스트에서 쓴다).
import { MISSIONS } from '../../data/content.js';
import { tuneLerp as L } from './score.js';

/** 틀 여섯 가지. */
export const TEMPLATES = ['draw', 'redlight', 'shadow', 'hold', 'lanes', 'rhythm'];

/** 임무마다 어떤 틀로 노는지. */
export const MISSION_GAMES = {
  crop: 'draw',
  cvs: 'redlight',
  cloudnap: 'shadow',
  streetlamp: 'hold',
  highway: 'lanes',
  fireworks: 'rhythm',
  stadium: 'hold',
  telescope: 'redlight',
  airport: 'lanes',
  forecast: 'rhythm',
  pyramid: 'shadow',
  moon: 'shadow',
};

/** 임무 순번(0..11)을 0..1 로. 모르는 임무는 0. */
export function missionLevel(id) {
  const i = MISSIONS.findIndex((m) => m.id === id);
  return i <= 0 ? 0 : i / (MISSIONS.length - 1);
}

/**
 * 임무 하나의 놀이 설정. 뒤쪽 임무일수록 조금씩 어렵다.
 * @returns {{tpl: string, theme: string, level: number, duration: number, [k: string]: any}}
 */
export function tuneFor(id) {
  const tpl = MISSION_GAMES[id] || 'hold';
  const k = missionLevel(id);
  const base = { tpl, theme: MISSION_GAMES[id] ? id : 'stadium', level: k };
  switch (tpl) {
    case 'draw':
      return { ...base, duration: 7, slack: 0.03, tol: 0.2, reach: 0.12, budget: 1.8, guide: L(0.55, 0.4, k) };
    case 'redlight':
      return {
        ...base,
        duration: 8,
        firstAway: [1.3, 1.8],
        away: [L(1.0, 0.75, k), L(1.9, 1.5, k)],
        tell: L(0.62, 0.48, k),
        look: [L(0.9, 1.0, k), L(1.4, 1.6, k)],
        feint: id === 'telescope' ? 0.28 : L(0, 0.15, k),
        grace: 0.12,
        pushback: 0.1,
        stun: 0.7,
        invuln: 1.0,
        margin: L(0.86, 0.8, k),
      };
    case 'shadow':
      return {
        ...base,
        duration: 7.5,
        radius: L(0.155, 0.14, k),
        speed: L(0.45, 0.52, k),
        ax: 0.26,
        ay: 0.3,
        soft: 0.05,
      };
    case 'hold':
      return {
        ...base,
        duration: 7.5,
        half: L(0.125, 0.105, k),
        swing: L(0.14, 0.18, k),
        rate: L(0.42, 0.55, k),
        lift: 2.0,
        gravity: 1.6,
        damp: 4,
        wobble: L(0.65, 0.85, k),
        kicks: id === 'stadium' ? 3 : 0,
      };
    case 'lanes':
      return {
        ...base,
        duration: 8,
        interval: [L(0.9, 0.62, k), L(1.1, 0.8, k)],
        double: L(0.28, 0.45, k),
        sweep: id === 'airport' ? 0.3 : 0,
        approach: L(1.35, 1.05, k),
      };
    case 'rhythm':
      return {
        ...base,
        duration: 7.5,
        bpm: Math.round(L(96, 124, k)),
        lead: 1.3,
        rest: L(0.15, 0.2, k),
        offbeat: L(0.05, 0.22, k),
        approach: L(1.0, 0.8, k),
      };
    default:
      return { ...base, duration: 7 };
  }
}
