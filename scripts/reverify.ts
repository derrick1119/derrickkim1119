/**
 * 후보 규칙 재검증: 시드 집합 여러 개로 fitness를 다시 재서 평균·표준편차를 낸다.
 *   npm run reverify -- --only echo,fam-d3-cheb-no2x2 [--n 20] [--sets 4]
 * 결과: factory/reports/top.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getRules } from '../engine/rules/index.ts';
import { evaluateRules } from './lib/evaluate.ts';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const ids = arg('only', 'echo').split(',');
const n = Number(arg('n', '20'));
const sets = Number(arg('sets', '4'));
const t0 = performance.now();

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a: number[]) => Math.sqrt(a.reduce((x, y) => x + (y - mean(a)) ** 2, 0) / Math.max(1, a.length - 1));

const rows = ids.map((id) => {
  const reports = Array.from({ length: sets }, (_, k) => evaluateRules(getRules(id), n, 20, k + 1));
  const f = reports.map((r) => r.fitness);
  const v1 = reports.map((r) => r.fitnessV1);
  const row = {
    id,
    fitness: +mean(f).toFixed(4),
    sd: +sd(f).toFixed(4),
    fitnessV1: +mean(v1).toFixed(4),
    perSet: f,
    monotonicSets: reports.filter((r) => r.monotonic).length,
    hardGenMs: Math.round(mean(reports.map((r) => r.tiers.hard.genMs))),
    hitRate: +mean(reports.map((r) => mean(Object.values(r.tiers).map((t) => t.hitRate)))).toFixed(3),
  };
  console.log(`${id.padEnd(22)} ${row.fitness} ± ${row.sd}  sets=${f.join(' ')}  mono=${row.monotonicSets}/${sets}`);
  return row;
});
rows.sort((a, b) => b.fitness - a.fitness);
const out = { generatedAt: new Date().toISOString(), n, sets, elapsedSec: Math.round((performance.now() - t0) / 1000), ranking: rows };
const dir = join(import.meta.dirname, '..', 'factory', 'reports');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'top.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`done in ${out.elapsedSec}s`);
