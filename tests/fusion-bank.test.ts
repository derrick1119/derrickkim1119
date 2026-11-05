/**
 * 교차점 출시 게이트: 웹에 실리는 모든 퍼즐(데일리 + 발견 갤러리)을 독립 솔버로 재검증한다.
 * 이 테스트가 실패하면 절대 배포하지 않는다.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { weekday } from '../engine/daily.ts';
import { deduce } from '../engine/deducer.ts';
import { buildModel, givenState } from '../engine/model.ts';
import { countSolutions } from '../engine/solver.ts';
import { FUSION_WEEKDAY } from '../fusion/daily.ts';
import { buildFusionRules, parseFusionId, type FusionPuzzle } from '../fusion/spec.ts';

const root = join(import.meta.dirname, '..');
const dailyDir = join(root, 'web/public/fusion/daily');
const galleryDir = join(root, 'web/public/fusion/gallery');
const daily = readdirSync(dailyDir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
const discoveries: { id: string }[] = JSON.parse(readFileSync(join(root, 'fusion/discoveries/index.json'), 'utf8'));

function proveOne(p: FusionPuzzle, label: string) {
  const spec = parseFusionId(p.rules);
  expect(spec, label).not.toBeNull();
  const rules = buildFusionRules(spec!);
  const proof = countSolutions(p, rules, 2);
  expect(proof.count, label).toBe(1);
  expect(Array.from(proof.first!).join(''), label).toBe(p.solution);
  const m = buildModel(p, rules);
  expect(deduce(m, givenState(m)).solved, label).toBe(true);
}

describe('fusion bank', () => {
  it('has at least 30 days and a matching index', () => {
    expect(daily.length).toBeGreaterThanOrEqual(30);
    const idx = JSON.parse(readFileSync(join(dailyDir, 'index.json'), 'utf8'));
    expect([...idx.dates].sort()).toEqual(daily.map((f) => f.slice(0, 10)).sort());
  });

  it('every daily puzzle is proven unique and logically solvable', () => {
    for (const f of daily) {
      const p = JSON.parse(readFileSync(join(dailyDir, f), 'utf8'));
      expect(p.date).toBe(f.slice(0, 10));
      expect(p.width).toBe(FUSION_WEEKDAY[weekday(p.date)].size);
      proveOne(p, f);
    }
  });

  it('every discovery has a card and a proven gallery', () => {
    expect(discoveries.length).toBeGreaterThan(0);
    for (const d of discoveries) {
      expect(existsSync(join(root, 'fusion/discoveries', `${d.id}.md`)), d.id).toBe(true);
      const g = JSON.parse(readFileSync(join(galleryDir, `${d.id}.json`), 'utf8'));
      expect(g.puzzles.length, d.id).toBeGreaterThan(0);
      g.puzzles.forEach((p: FusionPuzzle, i: number) => proveOne(p, `${d.id}#${i}`));
    }
  });
});
