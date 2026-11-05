import { deduce, rate } from '../engine/deducer.ts';
import { buildModel, givenState, satisfiesAll } from '../engine/model.ts';
import { mulberry32, shuffle } from '../engine/rng.ts';
import { countSolutions } from '../engine/solver.ts';
import type { Technique, Tier } from '../engine/types.ts';
import { sampleSolution } from './sampler.ts';
import { atomsOf, buildFusionRules, fitsBoard, fusionId, withoutAtom, type FusionPuzzle, type FusionPuzzleData, type FusionSpec } from './spec.ts';

export interface FusionGenOptions {
  width: number;
  height: number;
  seed: number;
  target: Tier;
  attempts?: number;
  /** 실험 0004: 원자 하나를 빼도 유일해가 남는 퍼즐(장식 재료)을 버린다. 평가에는 쓰지 않는다 */
  requireAllAtoms?: boolean;
}

/** 모든 원자가 필요한가: 어느 원자를 빼도(같은 단서로) 해가 2개 이상이 되어야 한다 */
export function allAtomsNecessary(spec: FusionSpec, p: FusionPuzzleData): boolean {
  return atomsOf(spec).every((a) => {
    const reduced = withoutAtom(spec, a.id);
    const data: FusionPuzzleData = { ...p, rules: fusionId(reduced) };
    if (!reduced.cell) data.clues = data.clues.map(() => null);
    if (!reduced.edge) delete data.edges;
    return countSolutions(data, buildFusionRules(reduced), 2).count >= 2;
  });
}

const MAX_TECH: Record<Tier, Technique> = { easy: 'single', medium: 'pair', hard: 'trial', expert: 'trial' };
const RANK: Record<Tier, number> = { easy: 0, medium: 1, hard: 2, expert: 3 };

type Item = { kind: 'cell' | 'row' | 'col'; idx: number; value: number };

function assemble(spec: FusionSpec, w: number, h: number, items: Item[], on: boolean[]): FusionPuzzleData {
  const p: FusionPuzzleData = { rules: fusionId(spec), width: w, height: h, clues: Array(w * h).fill(null) };
  if (spec.edge) p.edges = { rows: Array(h).fill(null), cols: Array(w).fill(null) };
  items.forEach((it, k) => {
    if (!on[k]) return;
    if (it.kind === 'cell') p.clues[it.idx] = it.value;
    else if (it.kind === 'row') p.edges!.rows[it.idx] = it.value;
    else p.edges!.cols[it.idx] = it.value;
  });
  return p;
}

/**
 * 단서 항목(칸 단서 + 가장자리 숫자)을 모두 둔 뒤 하나씩 빼보며,
 * 목표 기법만으로 여전히 풀리면 뺀 채로 둔다. 마지막에 독립 솔버로 유일해를 증명한다.
 */
export function generateFusion(spec: FusionSpec, opt: FusionGenOptions): FusionPuzzle | null {
  const { width: w, height: h, seed, target } = opt;
  if (!fitsBoard(spec, w, h)) return null;
  const rules = buildFusionRules(spec);
  const rng = mulberry32(seed);
  const max = MAX_TECH[target];
  let best: FusionPuzzle | null = null;

  const solves = (p: FusionPuzzleData) => {
    const m = buildModel(p, rules);
    return { ...deduce(m, givenState(m), max), m };
  };

  for (let a = 0; a < (opt.attempts ?? 30); a++) {
    const sol = sampleSolution(spec, w, h, rng);
    if (!sol) continue;
    const items: Item[] = [];
    if (spec.cell) {
      for (let i = 0; i < w * h; i++) {
        const v = rules.clueFor(sol, w, h, i);
        if (v !== null) items.push({ kind: 'cell', idx: i, value: v });
      }
    }
    if (spec.edge) {
      for (let y = 0; y < h; y++) items.push({ kind: 'row', idx: y, value: [...Array(w).keys()].reduce((s, x) => s + sol[y * w + x], 0) });
      for (let x = 0; x < w; x++) items.push({ kind: 'col', idx: x, value: [...Array(h).keys()].reduce((s, y) => s + sol[y * w + x], 0) });
    }
    const on = items.map(() => true);
    if (!solves(assemble(spec, w, h, items, on)).solved) continue;
    for (const k of shuffle([...items.keys()], rng)) {
      on[k] = false;
      if (!solves(assemble(spec, w, h, items, on)).solved) on[k] = true;
    }
    const data = assemble(spec, w, h, items, on);
    const final = solves(data);
    const proof = countSolutions(data, rules, 2, final.m);
    if (proof.count !== 1) throw new Error(`soundness bug in ${rules.id}: ${proof.count} solutions (seed ${seed})`);
    if (Array.from(proof.first!).join('') !== Array.from(final.state).join('')) throw new Error('deducer/solver disagree');
    if (!satisfiesAll(final.m, final.state)) throw new Error('solution violates rules');
    const difficulty = rate(final.steps);
    const puzzle: FusionPuzzle = {
      id: `${rules.id}-${w}x${h}-${seed.toString(36)}`,
      seed,
      ...data,
      solution: Array.from(final.state).join(''),
      difficulty,
    };
    if (opt.requireAllAtoms && !allAtomsNecessary(spec, data)) continue;
    if (difficulty.tier === target) return puzzle;
    const d = (p: FusionPuzzle) => Math.abs(RANK[p.difficulty.tier] - RANK[target]);
    if (!best || d(puzzle) < d(best)) best = puzzle;
  }
  return best;
}

/** 이 퍼즐의 단서 항목 수 (밀도 계산용) */
export function clueCount(p: FusionPuzzleData): number {
  const e = p.edges ? [...p.edges.rows, ...p.edges.cols].filter((v) => v !== null).length : 0;
  return p.clues.filter((c) => c !== null).length + e;
}
