import { measureFun } from '../../engine/fun.ts';
import { EVAL_ATTEMPTS, generate } from '../../engine/generator.ts';
import { buildModel } from '../../engine/model.ts';
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
  /** 단서당 판 안 고리 칸 수 평균 (사람이 세야 할 칸 수) */
  scanLoad: number;
  /** 고리 칸 중 판 밖으로 잘린 비율 */
  ringClip: number;
  /** 판 안 칸 하나가 평균 몇 개 단서 고리에 속하는가 */
  overlap: number;
  /** 재미 대리 지표 (engine/fun.ts) */
  fun: number;
  tension: number;
  spread: number;
  aha: number;
}

export interface EvalReport {
  rules: string;
  n: number;
  tiers: Record<Tier, TierStats>;
  depthSpread: number;
  monotonic: boolean;
  /** 0002 정의 (인지 부하 미반영) */
  fitnessV1: number;
  /** sqrt(min(1, 8 / 평균 scanLoad)) */
  loadFactor: number;
  /** fitnessV1 × loadFactor */
  fitness: number;
  /** 보통·어려움·지옥 평균 재미 (0006) */
  fun: number;
}

/** 사람이 편하게 세는 칸 수 기준 (지뢰찾기 단서 = 8칸) */
export const COMFORT_SCAN = 8;

/** 같은 단서가 무한 판에서 세는 칸 수 — 판 밖 잘림 비율의 분모 */
function fullRingSize(rules: RuleSet, size: number): number {
  const big = size * 4 + 1;
  const center = Math.floor(big / 2) * big + Math.floor(big / 2);
  return rules.clueScope(center, big, big).length;
}

/**
 * fitnessV1 = 평균적중률 × (1 − 평균단서밀도) × (0.5 + 평균기법혼합) × (단조?1:0.5) × (hard ≤ 2s ? 1 : 0.5)
 * fitness = fitnessV1 × loadFactor (0004: 단서당 세야 할 칸이 8칸을 넘으면 페널티)
 * 높을수록: 난이도 통제가 잘 되고, 단서가 적고, 단순 반복이 아닌 추론을 요구한다.
 */
/** seedBase: 시드 집합 번호. 0 = 0001~0004와 같은 시드 (재현성 기준선) */
export function evaluateRules(rules: RuleSet, n: number, attempts = EVAL_ATTEMPTS, seedBase = 0): EvalReport {
  const tiers = {} as Record<Tier, TierStats>;
  for (const { tier, size } of EVAL_PLAN) {
    let hits = 0, ms = 0, density = 0, mix = 0, score = 0, fails = 0;
    let scan = 0, clip = 0, over = 0;
    const fun = { fun: 0, tension: 0, spread: 0, aha: 0 };
    const full = fullRingSize(rules, size);
    for (let s = 0; s < n; s++) {
      const t0 = performance.now();
      const p = generate(rules, { width: size, height: size, seed: 1_000_003 * (s + 1) + seedBase * 7_919_011, target: tier, attempts });
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
      const clueCells = p.clues.flatMap((x, i) => (x === null ? [] : [i]));
      const cover = new Array<number>(size * size).fill(0);
      let ringSum = 0;
      for (const ci of clueCells) {
        const r = rules.clueScope(ci, size, size);
        ringSum += r.length;
        for (const c of r) cover[c]++;
      }
      const k = Math.max(1, clueCells.length);
      scan += ringSum / k;
      clip += 1 - ringSum / (k * full);
      over += cover.reduce((a, b) => a + b, 0) / (size * size);
      const fr = measureFun(buildModel(p, rules));
      for (const k of Object.keys(fun) as (keyof typeof fun)[]) fun[k] += fr[k];
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
      scanLoad: +(scan / ok).toFixed(2),
      ringClip: +(clip / ok).toFixed(3),
      overlap: +(over / ok).toFixed(2),
      fun: +(fun.fun / ok).toFixed(3),
      tension: +(fun.tension / ok).toFixed(3),
      spread: +(fun.spread / ok).toFixed(3),
      aha: +(fun.aha / ok).toFixed(3),
    };
  }
  const list = EVAL_PLAN.map((p) => tiers[p.tier]);
  const avg = (f: (t: TierStats) => number) => list.reduce((a, t) => a + f(t), 0) / list.length;
  const scores = list.map((t) => t.avgScore);
  const monotonic = scores.every((v, i) => i === 0 || v >= scores[i - 1]);
  const fitnessV1 =
    avg((t) => t.hitRate) *
    (1 - avg((t) => t.clueDensity)) *
    (0.5 + avg((t) => t.techniqueMix)) *
    (monotonic ? 1 : 0.5) *
    (tiers.hard.genMs <= 2000 ? 1 : 0.5);
  const loadFactor = Math.sqrt(Math.min(1, COMFORT_SCAN / avg((t) => t.scanLoad)));
  return {
    rules: rules.id,
    n,
    tiers,
    depthSpread: +(scores.at(-1)! - scores[0]).toFixed(1),
    monotonic,
    fitnessV1: +fitnessV1.toFixed(4),
    loadFactor: +loadFactor.toFixed(4),
    fitness: +(fitnessV1 * loadFactor).toFixed(4),
    fun: +((tiers.medium.fun + tiers.hard.fun + tiers.expert.fun) / 3).toFixed(3),
  };
}
