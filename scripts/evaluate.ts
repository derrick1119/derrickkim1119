/**
 * 규칙 세트의 "퍼즐로서의 품질"을 숫자로 측정한다. 공장 루프의 핵심 계기판.
 *
 *   npm run evaluate -- [--rules echo] [--n 20]
 *
 * 측정 항목
 *  - hitRate      : 목표 난이도를 정확히 맞춘 비율 (생성기의 통제력)
 *  - genMs        : 퍼즐 1개 생성 시간
 *  - clueDensity  : 단서 칸 / 전체 칸 (낮을수록 우아함)
 *  - techniqueMix : 단계 중 pair/trial 비율 (높을수록 단순 반복이 아님)
 *  - depthSpread  : 난이도 구간별 평균 점수 차 (난이도 곡선이 실제로 벌어지는가)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generate } from '../engine/generator.ts';
import { getRules } from '../engine/rules/index.ts';
import type { Tier } from '../engine/types.ts';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const rulesId = arg('rules', 'echo');
const N = Number(arg('n', '20'));
const rules = getRules(rulesId);

const plan: { tier: Tier; size: number }[] = [
  { tier: 'easy', size: 6 },
  { tier: 'medium', size: 7 },
  { tier: 'hard', size: 7 },
  { tier: 'expert', size: 8 },
];

const report: Record<string, unknown> = { rules: rulesId, n: N, generatedAt: new Date().toISOString() };
const tiers: Record<string, unknown> = {};
for (const { tier, size } of plan) {
  let hits = 0, ms = 0, density = 0, mix = 0, score = 0, fails = 0;
  for (let s = 0; s < N; s++) {
    const t0 = performance.now();
    const p = generate(rules, { width: size, height: size, seed: 1_000_003 * (s + 1), target: tier });
    ms += performance.now() - t0;
    if (!p) {
      fails++;
      continue;
    }
    if (p.difficulty.tier === tier) hits++;
    const c = p.difficulty.counts;
    const total = c.single + c.pair + c.trial;
    density += p.clues.filter((x) => x !== null).length / (size * size);
    mix += (c.pair + c.trial) / total;
    score += p.difficulty.score;
  }
  const ok = N - fails;
  tiers[tier] = {
    size,
    hitRate: +(hits / N).toFixed(3),
    genMs: Math.round(ms / N),
    clueDensity: +(density / ok).toFixed(3),
    techniqueMix: +(mix / ok).toFixed(3),
    avgScore: +(score / ok).toFixed(1),
    failures: fails,
  };
}
report.tiers = tiers;
const scores = plan.map((p) => (tiers[p.tier] as { avgScore: number }).avgScore);
report.depthSpread = +(scores.at(-1)! - scores[0]).toFixed(1);
report.monotonic = scores.every((v, i) => i === 0 || v >= scores[i - 1]);

const dir = join(import.meta.dirname, '..', 'factory', 'reports');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, `${rulesId}.json`), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
