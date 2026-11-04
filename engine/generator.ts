import { deduce, rate } from './deducer.ts';
import { buildModel, givenState, satisfiesAll } from './model.ts';
import { mulberry32, shuffle } from './rng.ts';
import { countSolutions } from './solver.ts';
import type { Puzzle, PuzzleData, RuleSet, Technique, Tier } from './types.ts';

export interface GenOptions {
  width: number;
  height: number;
  seed: number;
  target: Tier;
  attempts?: number;
}

const MAX_TECH: Record<Tier, Technique> = {
  easy: 'single',
  medium: 'pair',
  hard: 'trial',
  expert: 'trial',
};
const TIER_RANK: Record<Tier, number> = { easy: 0, medium: 1, hard: 2, expert: 3 };

/** 단서가 주어진 퍼즐이 지정 기법 이하로 끝까지 풀리는지 */
export function solvableWith(p: PuzzleData, rules: RuleSet, max: Technique) {
  const m = buildModel(p, rules);
  const r = deduce(m, givenState(m), max);
  return { ...r, model: m };
}

/**
 * 1) 규칙을 만족하는 무작위 정답을 만든다
 * 2) 가능한 모든 칸에 단서를 둔다
 * 3) 무작위 순서로 단서를 하나씩 빼보며, 목표 기법만으로 여전히 풀리면 뺀 채로 둔다
 * 4) 독립 솔버로 해가 정확히 1개임을 다시 증명한다
 * 목표 난이도에 맞을 때까지 반복하고, 못 맞추면 가장 가까운 결과를 돌려준다.
 */
export function generate(rules: RuleSet, opt: GenOptions): Puzzle | null {
  const { width: w, height: h, seed, target } = opt;
  const attempts = opt.attempts ?? 40;
  const rng = mulberry32(seed);
  const max = MAX_TECH[target];
  let best: Puzzle | null = null;

  for (let a = 0; a < attempts; a++) {
    const sol = rules.randomSolution(w, h, rng);
    const clues: (number | null)[] = Array.from({ length: w * h }, (_, i) =>
      rules.clueFor(sol, w, h, i),
    );
    const base: PuzzleData = { rules: rules.id, width: w, height: h, clues };
    if (!solvableWith(base, rules, max).solved) continue;

    const candidates = shuffle(
      clues.flatMap((c, i) => (c === null ? [] : [i])),
      rng,
    );
    for (const cell of candidates) {
      const saved = clues[cell];
      clues[cell] = null;
      if (!solvableWith(base, rules, max).solved) clues[cell] = saved;
    }

    const final = solvableWith(base, rules, max);
    const proof = countSolutions(base, rules, 2, final.model);
    if (proof.count !== 1) throw new Error(`soundness bug: ${proof.count} solutions (seed ${seed})`);
    for (let i = 0; i < w * h; i++) {
      if (final.state[i] !== proof.first![i]) throw new Error('deducer/solver disagree');
    }
    if (!satisfiesAll(final.model, final.state)) throw new Error('solution violates rules');

    const difficulty = rate(final.steps);
    const puzzle: Puzzle = {
      id: `${rules.id}-${w}x${h}-${seed.toString(36)}`,
      seed,
      ...base,
      clues: [...clues],
      solution: Array.from(final.state).join(''),
      difficulty,
    };
    if (difficulty.tier === target) return puzzle;
    const dist = (p: Puzzle) => Math.abs(TIER_RANK[p.difficulty.tier] - TIER_RANK[target]);
    if (!best || dist(puzzle) < dist(best)) best = puzzle;
  }
  return best;
}
