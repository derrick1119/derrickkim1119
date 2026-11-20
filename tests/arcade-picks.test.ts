import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { machinePicks } from '../arcade/picks.ts';

const r = (id: string, fun: number, skillGap: number, h3?: number, habitGap?: number) =>
  ({ id, fun, skillGap, habitGap, habitStar3: h3 === undefined ? undefined : { rate: h3, stage: 1, bot: 'b' } });

describe('기계 추천 계산 (0114)', () => {
  it('추천 1은 재미 최고, 0.005 안 동률이면 숙련 격차 큰 쪽', () => {
    expect(machinePicks([r('a', 0.9, 30), r('b', 0.95, 5)]).pick1).toBe('b');
    expect(machinePicks([r('a', 1, 11.8), r('b', 1, 32.9), r('c', 0.964, 7.2)]).pick1).toBe('b');
    expect(machinePicks([r('a', 0.998, 40), r('b', 1, 5)]).pick1).toBe('a');
  });
  it('추천 2는 버릇 ★3 최저, 동률이면 버릇 격차 큰 쪽, 버릇 봇 없는 게임은 빠짐', () => {
    expect(machinePicks([r('a', 1, 1, 0.4, 9), r('b', 1, 1, 0.1, 2)]).pick2).toBe('b');
    expect(machinePicks([r('a', 1, 1, 0, 4.65), r('b', 1, 1, 0, 6.69), r('c', 1, 1, 0, 3.39)]).pick2).toBe('b');
    expect(machinePicks([r('a', 1, 1), r('b', 1, 1, 0.5, 1)]).pick2).toBe('b');
    expect(machinePicks([]).pick1).toBeUndefined();
  });
  it('열린 라운드 ab.json의 기계 추천 기록이 계산과 같다(손으로 잘못 적지 않게)', () => {
    const root = join(import.meta.dirname, '..', 'arcade');
    const ab = JSON.parse(readFileSync(join(root, 'ab.json'), 'utf8'));
    const evals = JSON.parse(readFileSync(join(root, 'reports', 'eval.json'), 'utf8'));
    const cur = ab.rounds.at(-1);
    if (cur.winner || !cur.games || !cur.games.every((id: string) => evals[id])) return;
    const p = machinePicks(cur.games.map((id: string) => evals[id]));
    expect(cur.machinePick).toBe(p.pick1);
    if (cur.machinePick2 !== undefined) expect(cur.machinePick2).toBe(p.pick2);
  });
});
