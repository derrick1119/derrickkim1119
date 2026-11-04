/**
 * 규칙 계보 탐색: 패밀리 전체를 평가해 fitness 순위표를 만든다.
 *   npm run explore -- [--n 6]
 * 결과: factory/reports/family.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { echo } from '../engine/rules/echo.ts';
import { FAMILY_SPACE, familyId, knownGenre, makeFamily, type FamilyParams } from '../engine/rules/family.ts';
import { evaluateRules } from './lib/evaluate.ts';

const args = process.argv.slice(2);
const n = Number(args[args.indexOf('--n') + 1] || 6) || 6;
const t0 = performance.now();

const rows: Record<string, unknown>[] = [];
const baseline = evaluateRules(echo, n, 20);
rows.push({ id: 'echo (기준)', fitness: baseline.fitness, original: true, report: baseline });
console.log(`echo baseline fitness=${baseline.fitness}`);

for (const d of FAMILY_SPACE.d)
  for (const metric of FAMILY_SPACE.metric)
    for (const global of FAMILY_SPACE.global) {
      const p: FamilyParams = { d, metric, global };
      const id = familyId(p);
      const t = performance.now();
      const r = evaluateRules(makeFamily(p), n, 20);
      const genre = knownGenre(p);
      rows.push({ id, fitness: r.fitness, original: !genre, knownAs: genre, report: r });
      const hit = Object.values(r.tiers).map((x) => x.hitRate.toFixed(2)).join('/');
      console.log(`${id.padEnd(24)} fitness=${r.fitness.toFixed(4)} hit=${hit} ${Math.round(performance.now() - t)}ms${genre ? ' [' + genre + ']' : ''}`);
    }

rows.sort((a, b) => (b.fitness as number) - (a.fitness as number));
const out = {
  generatedAt: new Date().toISOString(),
  n,
  elapsedSec: Math.round((performance.now() - t0) / 1000),
  ranking: rows.map(({ report, ...r }) => r),
  details: Object.fromEntries(rows.map((r) => [r.id, r.report])),
};
const dir = join(import.meta.dirname, '..', 'factory', 'reports');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'family.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`\ndone in ${out.elapsedSec}s. top 5:`);
for (const r of out.ranking.slice(0, 5)) console.log(' ', r.id, r.fitness, r.original ? '' : `(${r.knownAs})`);
