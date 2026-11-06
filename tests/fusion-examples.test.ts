import { describe, expect, it } from 'vitest';
import { ATOMS } from '../fusion/atoms.ts';
import { exampleFor } from '../fusion/examples.ts';

describe('rule examples (실험 0008)', () => {
  it('every atom except givens gets a picture that matches its definition', () => {
    for (const a of Object.values(ATOMS)) {
      const ex = exampleFor(a.id);
      if (a.id === 'givens') {
        expect(ex.kind).toBe('none');
        continue;
      }
      expect(ex.kind).not.toBe('none');
      if (ex.kind === 'scope') {
        expect(ex.cells).toEqual(a.scope!(ex.center, ex.w, ex.h));
        expect(ex.filled.some((i) => ex.cells.includes(i))).toBe(true);
      }
      if (ex.kind === 'grid' && a.constraints) {
        const sol = [...ex.sol].map(Number);
        for (const c of a.constraints(ex.w, ex.h)) {
          const n = c.cells.reduce((s, i) => s + sol[i], 0);
          expect(n).toBeGreaterThanOrEqual(c.min), expect(n).toBeLessThanOrEqual(c.max);
        }
      }
    }
  });
});
