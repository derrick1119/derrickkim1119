/**
 * 발견의 계기판.
 *
 *  융합도(synergy) : 사람식 풀이에서 single이 아닌 단계(pair/trial) 중 **서로 다른 원자 2개 이상**의
 *                    제약을 함께 써야 했던 단계의 비율. 재료를 그냥 나란히 놓은 게 아니라
 *                    서로 맞물려야 풀린다는 뜻 — "조합에서 새로운 것이 나왔다"의 정량 정의.
 *  필수성(necessity): 원자 하나를 빼면(같은 단서로) 해가 2개 이상이 되는 퍼즐의 비율.
 *                    빼도 멀쩡하면 그 원자는 장식이다. 조합의 필수성 = 원자별 값의 최솟값.
 */
import { deduce, type Step } from '../engine/deducer.ts';
import { buildModel, evalConstraint, givenState, propagateSingle, type Model } from '../engine/model.ts';
import { countSolutions } from '../engine/solver.ts';
import type { Tier } from '../engine/types.ts';
import { clueCount, generateFusion } from './generator.ts';
import { atomsOf, buildFusionRules, fusionId, knownGenre, withoutAtom, type FusionPuzzle, type FusionSpec } from './spec.ts';

const atomOfKind = (kind: string): string | null => (kind === 'clue-cell' || kind === 'givens' ? null : kind);

export function stepAtoms(m: Model, spec: FusionSpec, before: Int8Array, step: Step): Set<string> {
  const out = new Set<string>();
  const add = (ci: number) => {
    const a = atomOfKind(m.cons[ci].kind);
    if (a) out.add(a);
  };
  if (step.technique !== 'trial') {
    step.constraints.forEach(add);
    return out;
  }
  const s2 = before.slice();
  s2[step.assumed!] = (1 - step.value) as 0 | 1;
  const ok = propagateSingle(m, s2, (ci) => add(ci));
  if (!ok) {
    let found = false;
    m.cons.forEach((c, ci) => {
      const { filled, unknown } = evalConstraint(c, s2);
      if (filled > c.max || filled + unknown.length < c.min) (add(ci), (found = true));
    });
    if (!found) for (const g of spec.globals) if (g === 'conne' || g === 'connf') out.add(g);
  }
  return out;
}

export interface PuzzleAnalysis {
  nonSingle: number;
  cross: number;
  /** 원자 id → 이 원자를 빼면 해가 여러 개가 되는가 */
  necessary: Record<string, boolean>;
}

export function analyzePuzzle(spec: FusionSpec, p: FusionPuzzle): PuzzleAnalysis {
  const rules = buildFusionRules(spec);
  const m = buildModel(p, rules);
  const start = givenState(m);
  const { steps } = deduce(m, start);
  const state = start.slice();
  let nonSingle = 0, cross = 0;
  for (const s of steps) {
    if (s.technique !== 'single') {
      nonSingle++;
      if (stepAtoms(m, spec, state, s).size >= 2) cross++;
    }
    for (const c of s.cells) state[c] = s.value;
  }
  const necessary: Record<string, boolean> = {};
  for (const a of atomsOf(spec)) {
    const reduced = withoutAtom(spec, a.id);
    const data = { ...p, rules: fusionId(reduced) };
    if (!reduced.cell) data.clues = data.clues.map(() => null);
    if (!reduced.edge) delete data.edges;
    necessary[a.id] = countSolutions(data, buildFusionRules(reduced), 2).count >= 2;
  }
  return { nonSingle, cross, necessary };
}

export const FUSION_PLAN: { tier: Tier; size: number }[] = [
  { tier: 'easy', size: 6 },
  { tier: 'medium', size: 6 },
  { tier: 'hard', size: 6 },
  { tier: 'expert', size: 8 },
];

export interface FusionReport {
  id: string;
  n: number;
  known: string | null;
  atoms: number;
  hitRate: number;
  density: number;
  synergy: number;
  necessity: Record<string, number>;
  necessityMin: number;
  hardMs: number;
  failures: number;
  fitness: number;
  discovery: boolean;
}

/** 발견 기준. 바꿀 땐 실험 기록에 근거를 남기고, 과거 발견을 재평가한다 */
export const DISCOVERY_RULE = { hitRate: 0.75, synergy: 0.35, necessityMin: 0.7, atoms: 2 };

export function evaluateFusion(spec: FusionSpec, n: number, attempts = 15): FusionReport {
  let hits = 0, total = 0, density = 0, ok = 0, failures = 0, hardMs = 0;
  let nonSingle = 0, cross = 0;
  const necCount: Record<string, number> = {};
  const atoms = atomsOf(spec);
  atoms.forEach((a) => (necCount[a.id] = 0));
  for (const { tier, size } of FUSION_PLAN) {
    for (let s = 0; s < n; s++) {
      total++;
      const t0 = performance.now();
      const p = generateFusion(spec, { width: size, height: size, seed: 7_919 * (s + 1) + size, target: tier, attempts });
      if (tier === 'hard') hardMs += performance.now() - t0;
      if (!p) {
        failures++;
        continue;
      }
      ok++;
      if (p.difficulty.tier === tier) hits++;
      density += clueCount(p) / (size * size);
      const a = analyzePuzzle(spec, p);
      nonSingle += a.nonSingle;
      cross += a.cross;
      for (const id in a.necessary) if (a.necessary[id]) necCount[id]++;
    }
  }
  const necessity: Record<string, number> = {};
  for (const id in necCount) necessity[id] = ok ? +(necCount[id] / ok).toFixed(3) : 0;
  const necessityMin = Math.min(...Object.values(necessity));
  const hitRate = hits / total;
  const dens = ok ? density / ok : 1;
  const synergy = nonSingle ? cross / nonSingle : 0;
  const msHard = hardMs / n;
  const fitness = hitRate * (1 - dens) * (0.25 + synergy) * necessityMin * (msHard <= 3000 ? 1 : 0.5);
  const known = knownGenre(spec);
  const r: FusionReport = {
    id: fusionId(spec),
    n,
    known,
    atoms: atoms.length,
    hitRate: +hitRate.toFixed(3),
    density: +dens.toFixed(3),
    synergy: +synergy.toFixed(3),
    necessity,
    necessityMin: +necessityMin.toFixed(3),
    hardMs: Math.round(msHard),
    failures,
    fitness: +fitness.toFixed(4),
    discovery: false,
  };
  r.discovery =
    !known &&
    r.atoms >= DISCOVERY_RULE.atoms &&
    r.hitRate >= DISCOVERY_RULE.hitRate &&
    r.synergy >= DISCOVERY_RULE.synergy &&
    r.necessityMin >= DISCOVERY_RULE.necessityMin;
  return r;
}
