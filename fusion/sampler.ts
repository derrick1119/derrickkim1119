import { buildModel, propagateSingle } from '../engine/model.ts';
import type { Rng } from '../engine/rng.ts';
import { buildFusionRules, type FusionPuzzleData, type FusionSpec } from './spec.ts';

/**
 * 전역 원자들만 만족하는 무작위 정답 격자. 전파 + 무작위 분기 DFS라서
 * 어떤 전역 원자 조합이든 따로 코드를 짤 필요가 없다. 불가능하거나 너무 어려우면 null.
 */
export function sampleSolution(spec: FusionSpec, w: number, h: number, rng: Rng, nodeLimit = 4000): Uint8Array | null {
  const rules = buildFusionRules({ ...spec, cell: null, edge: null });
  const blank: FusionPuzzleData = { rules: rules.id, width: w, height: h, clues: Array(w * h).fill(null) };
  const m = buildModel(blank, rules);
  const dens = 0.22 + rng() * 0.2;
  let nodes = 0;

  const rec = (state: Int8Array): Int8Array | null => {
    if (++nodes > nodeLimit) return null;
    if (!propagateSingle(m, state)) return null;
    const unknown: number[] = [];
    for (let i = 0; i < state.length; i++) if (state[i] === -1) unknown.push(i);
    if (unknown.length === 0) return state;
    const c = unknown[Math.floor(rng() * unknown.length)];
    const first = rng() < dens ? 1 : 0;
    for (const v of [first, 1 - first]) {
      const s2 = state.slice();
      s2[c] = v;
      const r = rec(s2);
      if (r) return r;
      if (nodes > nodeLimit) return null;
    }
    return null;
  };

  const r = rec(new Int8Array(w * h).fill(-1));
  return r ? Uint8Array.from(r) : null;
}
