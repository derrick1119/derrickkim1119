import { describe, expect, it } from 'vitest';
import { addReminder, needsReminder, roundAgeHours } from '../scripts/lib/ab.ts';

const open = { round: 2, winner: null, openedAt: '2026-11-05T04:47:00Z' };
const at = (h: number) => new Date(Date.parse(open.openedAt) + h * 3_600_000);

describe('A|B wait reminder (0011)', () => {
  it('fires once, only after 24h, only while open', () => {
    expect(roundAgeHours(open, at(5))).toBeCloseTo(5);
    expect(needsReminder(open, at(23))).toBe(false);
    expect(needsReminder(open, at(25))).toBe(true);
    expect(needsReminder({ ...open, remindedAt: at(25).toISOString() }, at(50))).toBe(false);
    expect(needsReminder({ ...open, winner: 'B' }, at(50))).toBe(false);
    expect(needsReminder({ round: 1, winner: null }, at(50))).toBe(false);
  });

  it('adds exactly one line under 오너에게, idempotently', () => {
    const state = '# s\n\n## 오너에게\n- 기존 줄\n';
    const once = addReminder(state, open, 25);
    expect(addReminder(once, open, 30)).toBe(once);
    expect(once.split('\n')[3]).toContain('2라운드 A|B가 25시간째');
    expect(once).toContain('- 기존 줄');
  });
});
