import { buildModel, initialState, propagateSingle, type Model } from './model.ts';
import type { PuzzleData, RuleSet } from './types.ts';

/**
 * 완전 탐색(전파 + 분기)으로 해의 개수를 limit까지 센다.
 * 난이도 판정기와 독립적인 "증명" 경로 — 둘이 다르면 버그.
 */
export function countSolutions(
  p: PuzzleData,
  rules: RuleSet,
  limit = 2,
  model?: Model,
): { count: number; first?: Int8Array } {
  const m = model ?? buildModel(p, rules);
  let count = 0;
  let first: Int8Array | undefined;

  const rec = (state: Int8Array) => {
    if (count >= limit) return;
    if (!propagateSingle(m, state)) return;
    // 가장 많은 제약에 걸린 미정 칸에서 분기
    let best = -1;
    let bestDeg = -1;
    for (let i = 0; i < m.n; i++) {
      if (state[i] === -1 && m.byCell[i].length > bestDeg) {
        best = i;
        bestDeg = m.byCell[i].length;
      }
    }
    if (best < 0) {
      count++;
      if (!first) first = state.slice();
      return;
    }
    for (const v of [1, 0] as const) {
      const s2 = state.slice();
      s2[best] = v;
      rec(s2);
      if (count >= limit) return;
    }
  };

  rec(initialState(m));
  return { count, first };
}
