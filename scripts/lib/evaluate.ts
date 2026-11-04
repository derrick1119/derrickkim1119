import { generate } from '../../engine/generator.ts';
import type { RuleSet, Tier } from '../../engine/types.ts';

export const EVAL_PLAN: { tier: Tier; size: number }[] = [
  { tier: 'easy', size: 6 },
  { tier: 'medium', size: 7 },
  { tier: 'hard', size: 7 },
  { tier: 'expert', size: 8 },
];

export interface TierStats {
  size: number;
  hitRate: number;
  genMs: number;
  clueDensity: number;
  techniqueMix: number;
  avgScore: number;
  failures: number;
}

export interface EvalReport {
  rules: string;
  n: number;
  tiers: Record<Tier, TierStats>;
  depthSpread: number;
  monotonic: boolean;
  fitness: number;
}

/**
 * fitness = 평균적중률 × (1 − 평균단서밀도) × (0.5 + 평균기법혼합) × (단조?1:0.5) × (hard ≤ 2s ? 1 : 0.5)
 * 높을수록: 난이도 통제가 잘 되고, 단서가 적고, 단순 반복이 아닌 추론을 요구한다.
 */
export function evaluateRules(rules: RuleSet, n: number, attempts = 40): EvalReport {
  const tiers = {} as Record<Tier, TierStats>;
  for (const { tier, size } of EVAL_PLAN) {
    let hits = 0, ms = 0, density = 0, mix = 0, score = 0, fails = 0;
    for (let s = 0; s < n; s++) {
      const t0 = performance.now();
      const p = generate(rules, { width: size, height: size, seed: 1_000_003 * (s + 1), target: tier, attempts });
      ms += performance.now() - t0;
      if (!p) {
        fails++;
        continue;
      }
      if (p.difficulty.tier === tier) hits++;
      const c = p.difficulty.counts;
      density += p.clues.filter((x) => x !== null).length / (size * size);
      mix += (c.pair + c.trial) / Math.max(1, c.single + c.pair + c.trial);
      score += p.difficulty.score;
    }
    const ok = Math.max(1, n - fails);
    tiers[tier] = {
      size,
      hitRate: +(hits / n).toFixed(3),
      genMs: Math.round(ms / n),
      clueDensity: +(density / ok).toFixed(3),
      techniqueMix: +(mix / ok).toFixed(3),
      avgScore: +(score / ok).toFixed(1),
      failures: fails,
    };
  }
  const list = EVAL_PLAN.map((p) => tiers[p.tier]);
  const avg = (f: (t: TierStats) => number) => list.reduce((a, t) => a + f(t), 0) / list.length;
  const scores = list.map((t) => t.avgScore);
  const monotonic = scores.every((v, i) => i === 0 || v >= scores[i - 1]);
  const fitness =
    avg((t) => t.hitRate) *
    (1 - avg((t) => t.clueDensity)) *
    (0.5 + avg((t) => t.techniqueMix)) *
    (monotonic ? 1 : 0.5) *
    (tiers.hard.genMs <= 2000 ? 1 : 0.5);
  return {
    rules: rules.id,
    n,
    tiers,
    depthSpread: +(scores.at(-1)! - scores[0]).toFixed(1),
    monotonic,
    fitness: +fitness.toFixed(4),
  };
}
