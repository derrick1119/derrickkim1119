/**
 * A|B 후보 평가: 챔피언(A)과 도전자 후보들을 같은 조건으로 재고, 자격을 갖춘 후보 중 재미 최고를 B로 고른다.
 *   npm run abtest -- --a echo --cands fam-d1-knight-none,fam-d1-knight-notouch [--n 10] [--sets 2]
 * 결과: factory/reports/ab.json  (계기판이 읽는다)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getRules } from '../engine/rules/index.ts';
import { evaluateRules, type EvalReport } from './lib/evaluate.ts';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const A = arg('a', 'echo');
const cands = arg('cands', '').split(',').filter(Boolean);
const n = Number(arg('n', '10'));
const sets = Number(arg('sets', '2'));
const t0 = performance.now();
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a: number[]) => Math.sqrt(a.reduce((x, y) => x + (y - mean(a)) ** 2, 0) / Math.max(1, a.length - 1));

function measure(id: string) {
  const reps: EvalReport[] = Array.from({ length: sets }, (_, k) => evaluateRules(getRules(id), n, 20, k + 1));
  const tierKeys = Object.keys(reps[0].tiers) as (keyof EvalReport['tiers'])[];
  const tiers = Object.fromEntries(tierKeys.map((t) => {
    const xs = reps.map((r) => r.tiers[t]);
    const avg = (f: (x: (typeof xs)[0]) => number) => +mean(xs.map(f)).toFixed(3);
    return [t, { hitRate: avg((x) => x.hitRate), genMs: Math.round(avg((x) => x.genMs)), clueDensity: avg((x) => x.clueDensity),
      scanLoad: avg((x) => x.scanLoad), fun: avg((x) => x.fun), tension: avg((x) => x.tension), spread: avg((x) => x.spread), aha: avg((x) => x.aha) }];
  }));
  const minHit = Math.min(...tierKeys.map((t) => tiers[t].hitRate));
  const eligible = minHit >= 0.9 && reps.every((r) => r.monotonic) && tiers.hard.genMs <= 2000;
  const row = {
    id,
    name: getRules(id).tagline,
    fitness: +mean(reps.map((r) => r.fitness)).toFixed(4),
    fitnessSd: +sd(reps.map((r) => r.fitness)).toFixed(4),
    fun: +mean(reps.map((r) => r.fun)).toFixed(3),
    funSd: +sd(reps.map((r) => r.fun)).toFixed(3),
    eligible,
    tiers,
  };
  console.log(`${id.padEnd(24)} fun=${row.fun}±${row.funSd} fitness=${row.fitness}±${row.fitnessSd} minHit=${minHit} hardMs=${tiers.hard.genMs} ${eligible ? '자격' : '미달'}`);
  return row;
}

const a = measure(A);
const rows = cands.map(measure);
const b = rows.filter((r) => r.eligible).sort((x, y) => y.fun - x.fun)[0] ?? null;
const out = { generatedAt: new Date().toISOString(), n, sets, elapsedSec: Math.round((performance.now() - t0) / 1000), a, b: b?.id ?? null, candidates: rows };
const dir = join(import.meta.dirname, '..', 'factory', 'reports');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'ab.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`B = ${out.b}  (${out.elapsedSec}s)`);
