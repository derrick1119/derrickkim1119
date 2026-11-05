import { describe, expect, it } from 'vitest';
import { measureFun } from '../engine/fun.ts';
import { generate } from '../engine/generator.ts';
import { buildModel } from '../engine/model.ts';
import { getRules } from '../engine/rules/index.ts';
import { countSolutions } from '../engine/solver.ts';

describe('fun metric', () => {
  it('is bounded, deterministic, and zero-aha on single-only puzzles', () => {
    const r = getRules('echo');
    const easy = generate(r, { width: 6, height: 6, seed: 11, target: 'easy' })!;
    const f1 = measureFun(buildModel(easy, r));
    expect(f1).toEqual(measureFun(buildModel(easy, r)));
    expect(f1.aha).toBe(0);
    const hard = generate(r, { width: 7, height: 7, seed: 11, target: 'hard' })!;
    const f2 = measureFun(buildModel(hard, r));
    for (const k of ['tension', 'spread', 'aha', 'fun'] as const) {
      expect(f2[k]).toBeGreaterThanOrEqual(0);
      expect(f2[k]).toBeLessThanOrEqual(1);
    }
  });
});

describe('knight echo', () => {
  it('rings are knight moves and puzzles are unique', () => {
    const r = getRules('fam-d1-knight-notouch');
    expect(r.clueScope(0, 5, 5).sort((a, b) => a - b)).toEqual([7, 11]);
    expect(r.clueScope(12, 5, 5)).toHaveLength(8);
    expect(() => getRules('fam-d2-knight-none')).toThrow();
    const p = generate(r, { width: 7, height: 7, seed: 99, target: 'medium' })!;
    expect(countSolutions(p, r, 2).count).toBe(1);
  });
});
