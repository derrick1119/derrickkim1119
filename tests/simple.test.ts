import { describe, expect, it } from 'vitest';
import { generate } from '../engine/generator.ts';
import { parseFamilyId, regionClass } from '../engine/rules/family.ts';
import { getRules } from '../engine/rules/index.ts';
import { countSolutions } from '../engine/solver.ts';

describe('simplicity gate (0007)', () => {
  it('classifies counted regions', () => {
    const cls = (id: string) => regionClass(parseFamilyId(id)!);
    expect(cls('fam-d1-xline-none')).toBe('line');
    expect(cls('fam-d1-cross-none')).toBe('line');
    expect(cls('fam-d1-diag-none')).toBe('contact');
    expect(cls('fam-d1-cheb-notouch')).toBe('contact');
    expect(cls('fam-d2-cheb-notouch')).toBe('distant'); // = echo
    expect(cls('fam-d3-manh-notouch')).toBe('distant');
    expect(cls('fam-d1-knight-none')).toBe('distant');
  });

  it('x-line counts both full diagonals and makes unique puzzles', () => {
    const r = getRules('fam-d1-xline-none');
    expect(r.clueScope(0, 4, 4).sort((a, b) => a - b)).toEqual([5, 10, 15]);
    expect(r.rules).toHaveLength(2);
    const p = generate(r, { width: 7, height: 7, seed: 3, target: 'hard' })!;
    expect(countSolutions(p, r, 2).count).toBe(1);
  });
});
