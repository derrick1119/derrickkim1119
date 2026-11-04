import { describe, expect, it } from 'vitest';
import { deduce, nextStep, rate } from '../engine/deducer.ts';
import { generate } from '../engine/generator.ts';
import { buildModel, givenState, satisfiesAll } from '../engine/model.ts';
import { hashString, mulberry32 } from '../engine/rng.ts';
import { echo, ring } from '../engine/rules/echo.ts';
import { countSolutions } from '../engine/solver.ts';
import type { Tier } from '../engine/types.ts';

describe('rng', () => {
  it('is deterministic', () => {
    const a = mulberry32(42), b = mulberry32(42);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
    expect(hashString('echo:2026-11-05')).toBe(hashString('echo:2026-11-05'));
  });
});

describe('echo ring', () => {
  it('is the 5x5 border, clipped to the grid', () => {
    expect(ring(24, 7, 7).length).toBe(16); // 중앙
    expect(ring(0, 7, 7).sort((a, b) => a - b)).toEqual([2, 9, 14, 15, 16]); // 모서리
  });
});

describe('solver', () => {
  it('counts an unconstrained cell as two solutions', () => {
    const r = countSolutions({ rules: 'echo', width: 1, height: 1, clues: [null] }, echo, 5);
    expect(r.count).toBe(2);
  });
  it('respects no-touch: 1x2 with no clues has 3 solutions', () => {
    const r = countSolutions({ rules: 'echo', width: 2, height: 1, clues: [null, null] }, echo, 10);
    expect(r.count).toBe(3);
  });
});

const tiers: [Tier, number][] = [
  ['easy', 6],
  ['medium', 7],
  ['hard', 7],
  ['expert', 8],
];

describe('generator', () => {
  for (const [tier, size] of tiers) {
    it(`${tier}: unique, logically solvable, every step sound`, () => {
      for (let s = 1; s <= 4; s++) {
        const p = generate(echo, { width: size, height: size, seed: s * 31337, target: tier })!;
        expect(p).toBeTruthy();
        // 독립 증명: 해는 정확히 하나
        const proof = countSolutions(p, echo, 2);
        expect(proof.count).toBe(1);
        expect(Array.from(proof.first!).join('')).toBe(p.solution);
        // 사람식 풀이: 모든 단계가 정답과 일치 (건전성)
        const m = buildModel(p, echo);
        const r = deduce(m, givenState(m));
        expect(r.solved).toBe(true);
        for (const step of r.steps)
          for (const c of step.cells) expect(String(step.value)).toBe(p.solution[c]);
        expect(satisfiesAll(m, r.state)).toBe(true);
        expect(rate(r.steps).score).toBeGreaterThan(0);
      }
    });
  }

  it('is deterministic per seed', () => {
    const a = generate(echo, { width: 7, height: 7, seed: 99, target: 'medium' });
    const b = generate(echo, { width: 7, height: 7, seed: 99, target: 'medium' });
    expect(a).toEqual(b);
  });
});

describe('hints', () => {
  it('always offers a next step from any correct partial state', () => {
    const p = generate(echo, { width: 7, height: 7, seed: 7, target: 'hard' })!;
    const m = buildModel(p, echo);
    const rng = mulberry32(1);
    for (let t = 0; t < 20; t++) {
      const st = givenState(m);
      for (let i = 0; i < m.n; i++) if (rng() < 0.4) st[i] = Number(p.solution[i]);
      if (st.every((v) => v !== -1)) continue;
      const step = nextStep(m, st);
      expect(step).not.toBeNull();
      for (const c of step!.cells) expect(String(step!.value)).toBe(p.solution[c]);
    }
  });
});
