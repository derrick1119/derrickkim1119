import { evalConstraint, isComplete, propagateSingle, type Model } from './model.ts';
import type { DifficultyReport, Technique, Tier } from './types.ts';

/**
 * 사람이 쓰는 추론을 흉내 내는 풀이기. 각 단계는 "왜 그 칸이 확정되는지"를 담고 있어
 * 난이도 측정과 설명형 힌트에 그대로 쓰인다.
 *
 *  single : 제약 하나만 보고 확정 (이미 다 찼다 / 남은 칸을 다 채워야 한다)
 *  pair   : 겹치는 두 제약을 비교해서 확정 (지뢰찾기의 부분집합 추론 일반화)
 *  trial  : "이 칸을 칠하면?" 가정 → single 연쇄로 모순 → 반대가 확정
 */
export interface Step {
  technique: Technique;
  cells: number[];
  value: 0 | 1;
  constraints: number[];
  /** trial: 모순까지 걸린 연쇄 길이 */
  depth?: number;
  /** trial: 가정한 칸 */
  assumed?: number;
}

const LEVEL: Record<Technique, number> = { single: 0, pair: 1, trial: 2 };

export function findSingle(m: Model, state: Int8Array): Step | null {
  for (let ci = 0; ci < m.cons.length; ci++) {
    const c = m.cons[ci];
    const { filled, unknown } = evalConstraint(c, state);
    if (unknown.length === 0) continue;
    if (filled === c.max) return { technique: 'single', cells: unknown, value: 0, constraints: [ci] };
    if (filled + unknown.length === c.min)
      return { technique: 'single', cells: unknown, value: 1, constraints: [ci] };
  }
  return null;
}

export function findPair(m: Model, state: Int8Array): Step | null {
  for (const [i, j] of m.pairs) {
    const A = m.cons[i], B = m.cons[j];
    const ea = evalConstraint(A, state);
    const eb = evalConstraint(B, state);
    if (ea.unknown.length === 0 || eb.unknown.length === 0) continue;
    const setB = new Set(eb.unknown);
    const I = ea.unknown.filter((c) => setB.has(c));
    if (I.length === 0) continue;
    const setI = new Set(I);
    const Ao = ea.unknown.filter((c) => !setI.has(c));
    const Bo = eb.unknown.filter((c) => !setI.has(c));
    const needAlo = A.min - ea.filled, needAhi = A.max - ea.filled;
    const needBlo = B.min - eb.filled, needBhi = B.max - eb.filled;
    const xlo = Math.max(0, needAlo - Ao.length, needBlo - Bo.length);
    const xhi = Math.min(I.length, needAhi, needBhi);
    if (xlo > xhi) continue; // 모순 — 정상 퍼즐에선 single이 먼저 잡음
    const alo = Math.max(0, needAlo - xhi), ahi = Math.min(Ao.length, needAhi - xlo);
    const blo = Math.max(0, needBlo - xhi), bhi = Math.min(Bo.length, needBhi - xlo);
    const groups: [number[], number, number][] = [
      [Ao, alo, ahi],
      [Bo, blo, bhi],
      [I, xlo, xhi],
    ];
    for (const [cells, lo, hi] of groups) {
      if (cells.length === 0) continue;
      if (hi === 0) return { technique: 'pair', cells, value: 0, constraints: [i, j] };
      if (lo === cells.length) return { technique: 'pair', cells, value: 1, constraints: [i, j] };
    }
  }
  return null;
}

export function findTrial(m: Model, state: Int8Array, maxDepth = 64): Step | null {
  let best: Step | null = null;
  for (let cell = 0; cell < m.n; cell++) {
    if (state[cell] !== -1) continue;
    for (const v of [1, 0] as const) {
      const s2 = state.slice();
      s2[cell] = v;
      let depth = 0;
      const ok = propagateSingle(m, s2, () => depth++);
      if (!ok && depth <= maxDepth && (!best || depth < best.depth!)) {
        best = {
          technique: 'trial',
          cells: [cell],
          value: (1 - v) as 0 | 1,
          constraints: [],
          depth,
          assumed: cell,
        };
        if (depth <= 1) return best;
      }
    }
  }
  return best;
}

export function nextStep(m: Model, state: Int8Array, max: Technique = 'trial'): Step | null {
  return (
    findSingle(m, state) ??
    (LEVEL[max] >= 1 ? findPair(m, state) : null) ??
    (LEVEL[max] >= 2 ? findTrial(m, state) : null)
  );
}

export interface DeduceResult {
  solved: boolean;
  state: Int8Array;
  steps: Step[];
}

export function deduce(m: Model, initial: Int8Array, max: Technique = 'trial'): DeduceResult {
  const state = initial.slice();
  const steps: Step[] = [];
  while (!isComplete(state)) {
    const step = nextStep(m, state, max);
    if (!step) break;
    for (const c of step.cells) state[c] = step.value;
    steps.push(step);
  }
  return { solved: isComplete(state), state, steps };
}

export function rate(steps: Step[]): DifficultyReport {
  const counts: Record<Technique, number> = { single: 0, pair: 0, trial: 0 };
  let score = 0;
  let maxTrialDepth = 0;
  for (const s of steps) {
    counts[s.technique]++;
    if (s.technique === 'single') score += 1;
    else if (s.technique === 'pair') score += 4;
    else {
      score += 8 + (s.depth ?? 0);
      maxTrialDepth = Math.max(maxTrialDepth, s.depth ?? 0);
    }
  }
  let tier: Tier = 'easy';
  if (counts.trial >= 3 || maxTrialDepth >= 6) tier = 'expert';
  else if (counts.trial >= 1) tier = 'hard';
  else if (counts.pair >= 2) tier = 'medium';
  return { tier, score, counts, maxTrialDepth };
}
