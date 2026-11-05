import type { Tier } from '../engine/types.ts';

/** 요일별 난이도 (일=0). 반반 원자 때문에 판은 짝수 크기만 쓴다 */
export const FUSION_WEEKDAY: { tier: Tier; size: number }[] = [
  { tier: 'expert', size: 8 },
  { tier: 'easy', size: 6 },
  { tier: 'easy', size: 6 },
  { tier: 'medium', size: 6 },
  { tier: 'medium', size: 6 },
  { tier: 'hard', size: 6 },
  { tier: 'hard', size: 8 },
];
export const FUSION_LAUNCH = '2026-11-05';
