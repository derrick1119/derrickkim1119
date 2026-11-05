import { findPair, findSingle, findTrial, type Step } from './deducer.ts';
import { evalConstraint, givenState, isComplete, type Model } from './model.ts';

/**
 * 재미 대리 지표 (0006). 사람식 추론기로 풀면서 매 단계 '판의 상태'를 관찰한다.
 *  tension : 그 시점에 확정 가능한 칸이 2개 이하인 단계 비율 — 막혔다 뚫리는 맛
 *  spread  : 연속 단계 사이 맨해튼 거리 ÷ 무작위 기대값 — 판 전체를 오가는가
 *  aha     : pair/trial 한 번이 뒤이어 single로 풀어주는 칸 수 — 돌파의 보상 크기
 * 각 값은 [0, 1], fun = 셋의 평균. 기계는 재미를 '대리'할 뿐 — 최종 판정은 오너의 A|B 선택.
 */
export interface FunReport {
  tension: number;
  spread: number;
  aha: number;
  fun: number;
  steps: number;
}

/** 지금 상태에서 가장 쉬운 기법으로 확정 가능한 칸 수 (trial만 남으면 1) */
export function frontier(m: Model, state: Int8Array): number {
  const cells = new Set<number>();
  for (const c of m.cons) {
    const { filled, unknown } = evalConstraint(c, state);
    if (unknown.length === 0) continue;
    if (filled === c.max || filled + unknown.length === c.min) unknown.forEach((x) => cells.add(x));
  }
  if (cells.size) return cells.size;
  findPair(m, state, (p) => p.cells.forEach((x) => cells.add(x)));
  return cells.size || 1;
}

export function measureFun(m: Model, initial = givenState(m)): FunReport {
  const state = initial.slice();
  const steps: Step[] = [];
  let tight = 0;
  while (!isComplete(state)) {
    const f = frontier(m, state);
    const step = findSingle(m, state) ?? findPair(m, state) ?? findTrial(m, state);
    if (!step) break;
    if (f <= 2) tight++;
    for (const c of step.cells) state[c] = step.value;
    steps.push(step);
  }
  const n = steps.length || 1;
  const centroid = (s: Step) => {
    let x = 0, y = 0;
    for (const c of s.cells) {
      x += c % m.w;
      y += Math.floor(c / m.w);
    }
    return [x / s.cells.length, y / s.cells.length];
  };
  let dist = 0;
  for (let i = 1; i < steps.length; i++) {
    const [ax, ay] = centroid(steps[i - 1]), [bx, by] = centroid(steps[i]);
    dist += Math.abs(ax - bx) + Math.abs(ay - by);
  }
  const expected = (2 * (m.w + m.h)) / 6; // 무작위 두 점의 평균 맨해튼 거리 ≈ (w+h)/3
  const spread = Math.min(1, dist / Math.max(1, steps.length - 1) / expected);

  const cascades: number[] = [];
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].technique === 'single') continue;
    let k = 0;
    for (let j = i + 1; j < steps.length && steps[j].technique === 'single'; j++) k += steps[j].cells.length;
    cascades.push(k);
  }
  const meanCascade = cascades.length ? cascades.reduce((a, b) => a + b, 0) / cascades.length : 0;
  const aha = Math.min(1, meanCascade / (m.n * 0.15));
  const tension = tight / n;
  const r = (v: number) => +v.toFixed(3);
  return { tension: r(tension), spread: r(spread), aha: r(aha), fun: r((tension + spread + aha) / 3), steps: steps.length };
}
