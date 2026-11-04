import type { Tier } from './types.ts';

/** 요일별 난이도 곡선: 월·화 쉬움 → 일요일 최고 난이도 */
export const WEEKDAY_PLAN: { tier: Tier; size: number }[] = [
  { tier: 'expert', size: 8 }, // 일
  { tier: 'easy', size: 6 }, // 월
  { tier: 'easy', size: 6 }, // 화
  { tier: 'medium', size: 7 }, // 수
  { tier: 'medium', size: 7 }, // 목
  { tier: 'hard', size: 7 }, // 금
  { tier: 'hard', size: 8 }, // 토
];

export const LAUNCH_DATE = '2026-11-05';

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekday(iso: string): number {
  return new Date(iso + 'T00:00:00Z').getUTCDay();
}

/** 출시일 기준 퍼즐 번호 (#1부터) */
export function puzzleNumber(iso: string): number {
  const ms = Date.parse(iso + 'T00:00:00Z') - Date.parse(LAUNCH_DATE + 'T00:00:00Z');
  return Math.round(ms / 86_400_000) + 1;
}

export const TIER_LABEL: Record<Tier, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
  expert: '지옥',
};
