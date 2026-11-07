import { describe, expect, it } from 'vitest';
import { GENES, REACT, runBot } from '../arcade/core.ts';
import { GAMES } from '../arcade/registry.ts';

describe('arcade factory (실험 0011)', () => {
  for (const { game, dumb, smart } of GAMES) {
    it(`${game.name}: deterministic, simple, and skill matters`, () => {
      expect(runBot(game, smart, 42, 60 * 40, REACT)).toEqual(runBot(game, smart, 42, 60 * 40, REACT));
      expect(game.rules.length).toBeLessThanOrEqual(3);
      expect(game.genes.length).toBeGreaterThanOrEqual(2);
      for (const g of game.genes) expect(GENES[g]).toBeDefined();
      const seeds = [11, 22, 33, 44];
      const d = seeds.reduce((a, sd) => a + runBot(game, dumb, sd, 60 * 90).score, 0);
      const m = seeds.reduce((a, sd) => a + runBot(game, smart, sd, 60 * 90, REACT).score, 0);
      expect(m).toBeGreaterThan(d * 1.5);
    });
  }
});
