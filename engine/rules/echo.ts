import type { CardConstraint, PuzzleData, RuleSet } from '../types.ts';
import { shuffle, type Rng } from '../rng.ts';

/**
 * 메아리 (Echo) — 이 공장의 첫 오리지널 규칙.
 *
 *  1. 일부 칸을 칠한다. 숫자 칸은 칠하지 않는다.
 *  2. 숫자는 "정확히 두 칸 떨어진 고리"(5×5 테두리)에 있는 칠한 칸의 수다.
 *     바로 옆 칸은 세지 않는다 — 소리는 가까이선 안 들리고 한 박자 뒤에 울린다.
 *  3. 칠한 칸끼리는 상하좌우로 맞닿을 수 없다.
 *
 * 지뢰찾기는 "바로 옆"을 센다. 메아리는 바로 옆을 비워둔 채 한 겹 바깥을 세서,
 * 서로 먼 숫자들의 고리가 겹치며 의외의 연쇄가 생긴다.
 */
export const ECHO_DISTANCE = 2;

export function ring(cell: number, w: number, h: number, d = ECHO_DISTANCE): number[] {
  const x = cell % w, y = Math.floor(cell / w);
  const out: number[] = [];
  for (let dy = -d; dy <= d; dy++) {
    for (let dx = -d; dx <= d; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h) out.push(ny * w + nx);
    }
  }
  return out;
}

function orthNeighbors(cell: number, w: number, h: number): number[] {
  const x = cell % w, y = Math.floor(cell / w);
  const out: number[] = [];
  if (x > 0) out.push(cell - 1);
  if (x < w - 1) out.push(cell + 1);
  if (y > 0) out.push(cell - w);
  if (y < h - 1) out.push(cell + w);
  return out;
}

export const echo: RuleSet = {
  id: 'echo',
  name: '메아리',
  tagline: '숫자는 두 칸 너머에서 울린다',
  rules: [
    '몇몇 칸을 칠하세요. 숫자 칸은 칠하지 않습니다.',
    '숫자 = 그 칸에서 정확히 두 칸 떨어진 고리(5×5 테두리) 안의 칠한 칸 수. 바로 옆 칸은 세지 않아요.',
    '칠한 칸끼리는 상하좌우로 붙을 수 없습니다.',
  ],

  constraints(p: PuzzleData): CardConstraint[] {
    const { width: w, height: h } = p;
    const out: CardConstraint[] = [];
    p.clues.forEach((clue, i) => {
      if (clue === null) return;
      out.push({ cells: [i], min: 0, max: 0, kind: 'clue-cell', anchor: i });
      out.push({ cells: ring(i, w, h), min: clue, max: clue, kind: 'echo', anchor: i });
    });
    for (let i = 0; i < w * h; i++) {
      const x = i % w;
      if (x < w - 1) out.push({ cells: [i, i + 1], min: 0, max: 1, kind: 'no-touch' });
      if (i + w < w * h) out.push({ cells: [i, i + w], min: 0, max: 1, kind: 'no-touch' });
    }
    return out;
  },

  randomSolution(w: number, h: number, rng: Rng): Uint8Array {
    const sol = new Uint8Array(w * h);
    const order = shuffle([...Array(w * h).keys()], rng);
    const p = 0.45 + rng() * 0.25;
    for (const c of order) {
      if (rng() < p && orthNeighbors(c, w, h).every((n) => sol[n] === 0)) sol[c] = 1;
    }
    return sol;
  },

  clueFor(solution, w, h, cell) {
    if (solution[cell] === 1) return null;
    return ring(cell, w, h).reduce((s, c) => s + solution[c], 0);
  },

  clueScope(cell, w, h) {
    return ring(cell, w, h);
  },
};
