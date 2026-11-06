/**
 * 규칙 예시 그림 데이터 (실험 0008). 규칙 문장 옆에 붙일 작은 그림을, 원자의 실제 정의에서 만든다 —
 * 그림과 규칙이 어긋날 수 없다.
 *  - 숫자 원자: 5×5 판 가운데 숫자 칸 + 그 숫자가 세는 칸
 *  - 가장자리·전역 원자: 그 규칙만 지킨 4×4 예시 정답 (가장자리 원자는 줄마다 칠한 칸 수 표시)
 */
import { hashString, mulberry32 } from '../engine/rng.ts';
import { sampleSolution } from './sampler.ts';
import { ATOMS } from './atoms.ts';
import { atomsOf, type FusionSpec } from './spec.ts';

export type RuleExample =
  | { kind: 'scope'; w: number; h: number; center: number; cells: number[]; filled: number[] }
  | { kind: 'grid'; w: number; h: number; sol: string; edges?: { rows: number[]; cols: number[] } }
  | { kind: 'none' };

export function exampleFor(atomId: string): RuleExample {
  const spec: FusionSpec = { cell: null, edge: null, globals: [] };
  const found = ATOMS[atomId];
  if (found?.role === 'cell') {
    if (!found.scope) return { kind: 'none' }; // givens
    const w = 5, h = 5, center = 12;
    const cells = found.scope(center, w, h);
    // 세는 칸 중 일부만 칠하고(숫자 = 그 개수), 세지 않는 칸 하나도 칠해서 대비를 준다
    const counted = cells.filter((_, k) => k % 3 !== 1).slice(0, Math.max(1, Math.ceil(cells.length / 2)));
    const outside = [...Array(w * h).keys()].find((i) => i !== center && !cells.includes(i));
    return { kind: 'scope', w, h, center, cells, filled: outside === undefined ? counted : [...counted, outside] };
  }
  const w = 4, h = 4;
  const rng = mulberry32(hashString(`example:${atomId}`));
  if (atomId === 'rowcol') {
    const sol = Array.from({ length: w * h }, (): number => (rng() < 0.4 ? 1 : 0));
    const rows = [...Array(h).keys()].map((y) => sol.slice(y * w, y * w + w).reduce((s, v) => s + v, 0));
    const cols = [...Array(w).keys()].map((x) => [...Array(h).keys()].reduce((s, y) => s + sol[y * w + x], 0));
    return { kind: 'grid', w, h, sol: sol.join(''), edges: { rows, cols } };
  }
  spec.globals = [atomId];
  for (let t = 0; t < 20; t++) {
    const sol = sampleSolution(spec, w, h, rng);
    if (sol && sol.some((v) => v === 1)) return { kind: 'grid', w, h, sol: Array.from(sol).join('') };
  }
  return { kind: 'none' };
}

export function ruleExamples(spec: FusionSpec): Record<string, RuleExample> {
  return Object.fromEntries(atomsOf(spec).map((a) => [a.id, exampleFor(a.id)]));
}
