/**
 * 재미의 대리 지표 (실험 0003). 기계는 재미를 직접 못 잰다 — 사람식 풀이 기록에서
 * 재미와 관련 있다고 가정한 모양을 뽑는다. 가중치는 임시값이고 오너의 A|B 선택으로 보정한다.
 */
import { deduce } from '../engine/deducer.ts';
import { buildModel, givenState } from '../engine/model.ts';
import type { Tier } from '../engine/types.ts';
import { stepAtoms } from './analyze.ts';
import { clueCount, generateFusion } from './generator.ts';
import { atomsOf, buildFusionRules, type FusionPuzzle, type FusionSpec } from './spec.ts';

export const FUN_PARTS = ['aha', 'cascade', 'interplay', 'balance', 'mental', 'elegance'] as const;
export type FunPart = (typeof FUN_PARTS)[number];
export const FUN_LABEL: Record<FunPart, string> = {
  aha: '아하',
  cascade: '열쇠',
  interplay: '맞물림',
  balance: '고른 재료',
  mental: '머릿속 부담',
  elegance: '간결함',
};
export const FUN_WEIGHT: Record<FunPart, number> = { aha: 1, cascade: 1, interplay: 1.5, balance: 1, mental: 1, elegance: 1 };

const clamp = (x: number) => Math.max(0, Math.min(1, x));

export function funOfPuzzle(spec: FusionSpec, p: FusionPuzzle): Record<FunPart, number> {
  const m = buildModel(p, buildFusionRules(spec));
  const state = givenState(m);
  const { steps } = deduce(m, state);
  const used: Record<string, number> = {};
  let hard = 0, cross = 0, depth = 0, trials = 0;
  const cascades: number[] = [];
  let run = -1;
  for (const s of steps) {
    const atoms = stepAtoms(m, spec, state, s);
    atoms.forEach((a) => (used[a] = (used[a] ?? 0) + 1));
    if (s.technique === 'single') {
      if (run >= 0) run += s.cells.length;
    } else {
      if (run >= 0) cascades.push(run);
      run = 0;
      hard++;
      if (atoms.size >= 2) cross++;
      if (s.technique === 'trial') (trials++, (depth += s.depth ?? 0));
    }
    for (const c of s.cells) state[c] = s.value;
  }
  if (run >= 0) cascades.push(run);
  const r = steps.length ? hard / steps.length : 0;
  const k = atomsOf(spec).filter((a) => a.id !== 'givens').length;
  const tot = Object.values(used).reduce((a, b) => a + b, 0);
  const ent = tot ? -Object.values(used).reduce((e, c) => e + (c / tot) * Math.log(c / tot), 0) : 0;
  const meanCascade = cascades.length ? cascades.reduce((a, b) => a + b, 0) / cascades.length : 0;
  const meanDepth = trials ? depth / trials : 0;
  const atomCost = { 1: 1, 2: 1, 3: 0.85, 4: 0.7 }[atomsOf(spec).length] ?? 0.6;
  const density = clueCount(p) / (p.width * p.height);
  return {
    aha: clamp(1 - Math.abs(r - 0.3) / 0.3),
    cascade: clamp(meanCascade / 6),
    interplay: hard ? cross / hard : 0,
    balance: k <= 1 ? 1 : clamp(ent / Math.log(k)),
    mental: 1 / (1 + Math.max(0, meanDepth - 3) / 3),
    elegance: atomCost * Math.sqrt(1 - density),
  };
}

export function funScore(parts: Record<FunPart, number>): number {
  let lw = 0, wsum = 0;
  for (const k of FUN_PARTS) (lw += FUN_WEIGHT[k] * Math.log(0.05 + parts[k])), (wsum += FUN_WEIGHT[k]);
  return Math.exp(lw / wsum) / 1.05; // 모든 항목이 1일 때 1
}

export interface FunReport {
  id: string;
  n: number;
  fun: number;
  se: number;
  parts: Record<FunPart, number>;
}

export const FUN_PLAN: { tier: Tier; size: number }[] = [
  { tier: 'medium', size: 6 },
  { tier: 'hard', size: 6 },
];

export function evaluateFun(spec: FusionSpec, id: string, n = 10): FunReport {
  const scores: number[] = [];
  const acc = Object.fromEntries(FUN_PARTS.map((k) => [k, 0])) as Record<FunPart, number>;
  for (const { tier, size } of FUN_PLAN)
    for (let s = 0; s < n; s++) {
      const p = generateFusion(spec, { width: size, height: size, seed: 104_729 * (s + 1) + size, target: tier, attempts: 15 });
      if (!p) continue;
      const parts = funOfPuzzle(spec, p);
      scores.push(funScore(parts));
      for (const k of FUN_PARTS) acc[k] += parts[k];
    }
  const N = scores.length;
  const mean = N ? scores.reduce((a, b) => a + b, 0) / N : 0;
  const sd = N > 1 ? Math.sqrt(scores.reduce((a, b) => a + (b - mean) ** 2, 0) / (N - 1)) : 0;
  for (const k of FUN_PARTS) acc[k] = N ? +(acc[k] / N).toFixed(3) : 0;
  return { id, n: N, fun: +mean.toFixed(3), se: +(N ? sd / Math.sqrt(N) : 0).toFixed(3), parts: acc };
}
