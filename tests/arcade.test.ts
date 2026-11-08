import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GENES, REACT, runBot } from '../arcade/core.ts';
import { GAMES } from '../arcade/registry.ts';

describe('genes (0018)', () => {
  it('every gene has a kind and the pool is diverse', () => {
    const kinds = new Set(Object.values(GENES).map((x) => x.kind));
    expect([...kinds].sort()).toEqual(['control', 'core', 'meta', 'twist']);
    expect(Object.keys(GENES).length).toBeGreaterThanOrEqual(50);
    for (const [id, x] of Object.entries(GENES)) expect(x.id).toBe(id);
  });
});

describe('arcade factory (실험 0011)', () => {
  it('열린 라운드의 두 게임은 등록돼 있고, 폐기한 게임은 다시 보이지 않는다 (오너 규칙 2026-11-07)', () => {
    const ab = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'arcade', 'ab.json'), 'utf8'));
    const ids = GAMES.map((e) => e.game.id), cur = ab.rounds.at(-1);
    // 한 게임 라운드(B 없음, 오너 아이디어 '좋아/별로' 2026-11-08)도 그 게임은 반드시 등록돼 있어야 한다
    if (!cur.winner) expect(ids).toEqual(expect.arrayContaining([cur.A, cur.B].filter(Boolean)));
    expect(cur.A).toBeTruthy();
    for (const d of ab.discarded ?? []) expect(ids).not.toContain(d.id);
  });
  for (const { game, dumb, smart } of GAMES) {
    it(`${game.name}: deterministic, simple, and skill matters`, () => {
      expect(runBot(game, smart, 42, 60 * 40, REACT)).toEqual(runBot(game, smart, 42, 60 * 40, REACT));
      expect(game.rules.length).toBeLessThanOrEqual(3);
      expect(game.genes.length).toBeGreaterThanOrEqual(2);
      for (const g of game.genes) expect(GENES[g]).toBeDefined();
      expect(game.art?.concept.length).toBeGreaterThan(1);
      if (game.reveals) {
        // 펼쳐짐(0022): 처음엔 적게, 판이 흐르면 늘어난다
        const st = game.create(7);
        const first = game.reveals(st);
        for (let t = 0; t < 60 * 90 && !game.over(st); t++) game.step(st, { tap: t % 40 === 0, hold: t % 80 < 40, dir: 0, move: t % 50 === 0 ? 'up' : undefined });
        expect(game.reveals(st)).toBeGreaterThanOrEqual(first);
      }
      const seeds = [11, 22, 33, 44];
      const d = seeds.reduce((a, sd) => a + runBot(game, dumb, sd, 60 * 90).score, 0);
      const m = seeds.reduce((a, sd) => a + runBot(game, smart, sd, 60 * 90, REACT).score, 0);
      expect(m).toBeGreaterThan(d * 1.5);
    });
  }
});
