/**
 * 출시 게이트: 웹에 실리는 모든 퍼즐 파일을 독립 솔버로 재검증한다.
 * 이 테스트가 실패하면 절대 배포하지 않는다.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WEEKDAY_PLAN, weekday } from '../engine/daily.ts';
import { deduce } from '../engine/deducer.ts';
import { buildModel, givenState } from '../engine/model.ts';
import { getRules } from '../engine/rules/index.ts';
import { countSolutions } from '../engine/solver.ts';
import type { Puzzle } from '../engine/types.ts';

const dir = join(import.meta.dirname, '..', 'web', 'public', 'puzzles');
const files = readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));

describe('puzzle bank', () => {
  it('has at least 30 days of puzzles', () => {
    expect(files.length).toBeGreaterThanOrEqual(30);
  });

  it('index.json lists every file', () => {
    const idx = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'));
    expect([...idx.dates].sort()).toEqual(files.map((f) => f.slice(0, 10)).sort());
  });

  it('every puzzle has exactly one solution and is logically solvable', () => {
    for (const f of files) {
      const p: Puzzle & { date: string } = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      const rules = getRules(p.rules);
      expect(p.date).toBe(f.slice(0, 10));
      expect(p.width).toBe(WEEKDAY_PLAN[weekday(p.date)].size);
      const proof = countSolutions(p, rules, 2);
      expect(proof.count, f).toBe(1);
      expect(Array.from(proof.first!).join(''), f).toBe(p.solution);
      const m = buildModel(p, rules);
      expect(deduce(m, givenState(m)).solved, f).toBe(true);
    }
  });
});
