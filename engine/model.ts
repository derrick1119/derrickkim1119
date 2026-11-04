import type { CardConstraint, PuzzleData, RuleSet } from './types.ts';

export interface Model {
  w: number;
  h: number;
  n: number;
  cons: CardConstraint[];
  byCell: number[][];
  /** 칸을 공유하는 제약 쌍 */
  pairs: [number, number][];
  rules: RuleSet;
}

export function buildModel(p: PuzzleData, rules: RuleSet): Model {
  const n = p.width * p.height;
  const cons = rules.constraints(p);
  const byCell: number[][] = Array.from({ length: n }, () => []);
  cons.forEach((c, i) => c.cells.forEach((cell) => byCell[cell].push(i)));
  const pairSet = new Set<number>();
  const pairs: [number, number][] = [];
  for (const list of byCell) {
    for (let a = 0; a < list.length; a++) {
      for (let b = a + 1; b < list.length; b++) {
        const i = list[a], j = list[b];
        // 크기 1짜리 제약끼리의 쌍은 정보가 없음
        if (cons[i].cells.length < 2 && cons[j].cells.length < 2) continue;
        const key = i * 100003 + j;
        if (!pairSet.has(key)) {
          pairSet.add(key);
          pairs.push([i, j]);
        }
      }
    }
  }
  return { w: p.width, h: p.height, n, cons, byCell, pairs, rules };
}

export function initialState(m: Model): Int8Array {
  return new Int8Array(m.n).fill(-1);
}

/** 플레이어에게 처음부터 주어지는 상태: 크기 1 고정 제약(예: 숫자 칸은 빈칸)을 반영 */
export function givenState(m: Model): Int8Array {
  const s = initialState(m);
  for (const c of m.cons) if (c.cells.length === 1 && c.min === c.max) s[c.cells[0]] = c.min as 0 | 1;
  return s;
}

/** 제약 하나를 현재 상태에서 평가 */
export function evalConstraint(c: CardConstraint, state: Int8Array) {
  let filled = 0;
  const unknown: number[] = [];
  for (const cell of c.cells) {
    const v = state[cell];
    if (v === 1) filled++;
    else if (v === -1) unknown.push(cell);
  }
  return { filled, unknown };
}

/**
 * 단일 제약 전파를 고정점까지. 모순이면 false.
 * steps 콜백은 (제약 index, 바뀐 칸들, 값)을 받는다.
 */
export function propagateSingle(
  m: Model,
  state: Int8Array,
  onStep?: (ci: number, cells: number[], value: 0 | 1) => void,
): boolean {
  const { cons, byCell } = m;
  const inQ = new Uint8Array(cons.length);
  const q: number[] = [];
  for (let i = cons.length - 1; i >= 0; i--) {
    q.push(i);
    inQ[i] = 1;
  }
  while (q.length) {
    const ci = q.pop()!;
    inQ[ci] = 0;
    const c = cons[ci];
    const { filled, unknown } = evalConstraint(c, state);
    if (filled > c.max || filled + unknown.length < c.min) return false;
    if (unknown.length === 0) continue;
    let fill: 0 | 1 | -1 = -1;
    if (filled === c.max) fill = 0;
    else if (filled + unknown.length === c.min) fill = 1;
    if (fill < 0) continue;
    for (const cell of unknown) {
      state[cell] = fill;
      for (const cj of byCell[cell]) {
        if (!inQ[cj]) {
          inQ[cj] = 1;
          q.push(cj);
        }
      }
    }
    onStep?.(ci, unknown, fill as 0 | 1);
  }
  if (m.rules.globalCheck && !m.rules.globalCheck(state, m.w, m.h)) return false;
  return true;
}

export function isComplete(state: Int8Array): boolean {
  for (let i = 0; i < state.length; i++) if (state[i] === -1) return false;
  return true;
}

/** 완성된(또는 미정=빈칸으로 간주한) 상태가 모든 규칙을 만족하는지 */
export function satisfiesAll(m: Model, state: Int8Array): boolean {
  const full = Int8Array.from(state, (v) => (v === 1 ? 1 : 0));
  for (const c of m.cons) {
    const { filled } = evalConstraint(c, full);
    if (filled < c.min || filled > c.max) return false;
  }
  if (m.rules.globalCheck && !m.rules.globalCheck(full, m.w, m.h)) return false;
  return true;
}
