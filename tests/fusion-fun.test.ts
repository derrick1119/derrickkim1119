import { describe, expect, it } from 'vitest';
import { FUN_PARTS, funOfPuzzle, funScore } from '../fusion/fun.ts';
import { generateFusion } from '../fusion/generator.ts';
import { parseFusionId } from '../fusion/spec.ts';

describe('fun metric (실험 0003)', () => {
  const spec = parseFusionId('fx-knight-rowcol-nothree')!;
  const p = generateFusion(spec, { width: 6, height: 6, seed: 11, target: 'medium', attempts: 30 })!;
  it('parts are in [0,1] and deterministic', () => {
    const a = funOfPuzzle(spec, p), b = funOfPuzzle(spec, p);
    expect(a).toEqual(b);
    for (const k of FUN_PARTS) expect(a[k]).toBeGreaterThanOrEqual(0), expect(a[k]).toBeLessThanOrEqual(1);
  });
  it('score is monotone in each part', () => {
    const base = Object.fromEntries(FUN_PARTS.map((k) => [k, 0.5])) as Record<(typeof FUN_PARTS)[number], number>;
    for (const k of FUN_PARTS) expect(funScore({ ...base, [k]: 0.9 })).toBeGreaterThan(funScore(base));
    expect(funScore(Object.fromEntries(FUN_PARTS.map((k) => [k, 1])) as typeof base)).toBeLessThanOrEqual(1);
  });
});
