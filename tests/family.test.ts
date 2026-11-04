import { describe, expect, it } from 'vitest';
import { deduce } from '../engine/deducer.ts';
import { generate } from '../engine/generator.ts';
import { buildModel, givenState } from '../engine/model.ts';
import { echo } from '../engine/rules/echo.ts';
import { familyId, makeFamily, parseFamilyId } from '../engine/rules/family.ts';
import { getRules } from '../engine/rules/index.ts';
import { countSolutions } from '../engine/solver.ts';

describe('rule family', () => {
  it('round-trips ids and resolves through getRules', () => {
    const p = { d: 3, metric: 'cheb', global: 'no2x2' } as const;
    expect(parseFamilyId(familyId(p))).toEqual(p);
    expect(getRules(familyId(p)).id).toBe('fam-d3-cheb-no2x2');
  });

  it('fam-d2-cheb-notouch is exactly echo', () => {
    const fam = makeFamily({ d: 2, metric: 'cheb', global: 'notouch' });
    const a = generate(echo, { width: 7, height: 7, seed: 5, target: 'medium' })!;
    const b = generate(fam, { width: 7, height: 7, seed: 5, target: 'medium' })!;
    expect(b.clues).toEqual(a.clues);
    expect(b.solution).toBe(a.solution);
  });

  for (const id of ['fam-d3-cheb-no2x2', 'fam-d3-cheb-none', 'fam-d2-manh-notouch']) {
    it(`${id}: generated puzzles are unique and soundly solvable`, () => {
      const rules = getRules(id);
      for (const target of ['easy', 'hard'] as const) {
        const p = generate(rules, { width: 7, height: 7, seed: 4242, target, attempts: 20 })!;
        expect(countSolutions(p, rules, 2).count).toBe(1);
        const m = buildModel(p, rules);
        const r = deduce(m, givenState(m));
        expect(r.solved).toBe(true);
        for (const s of r.steps) for (const c of s.cells) expect(String(s.value)).toBe(p.solution[c]);
      }
    });
  }
});
