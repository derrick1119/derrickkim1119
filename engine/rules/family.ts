import { shuffle, type Rng } from '../rng.ts';
import type { CardConstraint, PuzzleData, RuleSet } from '../types.ts';

/**
 * 고리 단서 규칙 패밀리. 공장이 규칙 공간을 기계적으로 탐색하기 위한 생성기.
 *   d       : 단서가 세는 고리의 거리
 *   metric  : cheb(정사각 테두리) | manh(마름모 테두리)
 *   global  : none | notouch(칠한 칸 맞닿기 금지) | no2x2(2×2 전부 칠하기 금지)
 * id 형식: fam-d2-cheb-notouch
 */
export type Metric = 'cheb' | 'manh';
export type Global = 'none' | 'notouch' | 'no2x2';
export interface FamilyParams {
  d: number;
  metric: Metric;
  global: Global;
}

export const FAMILY_SPACE = {
  d: [1, 2, 3],
  metric: ['cheb', 'manh'] as Metric[],
  global: ['none', 'notouch', 'no2x2'] as Global[],
};

/** 잘 알려진 장르와 사실상 같은 조합 — 탐색은 하되 '오리지널'로 치지 않는다 */
export function knownGenre(p: FamilyParams): string | null {
  if (p.d === 1 && p.metric === 'cheb' && p.global === 'none') return '지뢰찾기류';
  if (p.d === 1 && p.metric === 'manh') return '상하좌우 개수 단서류';
  return null;
}

export function familyId(p: FamilyParams): string {
  return `fam-d${p.d}-${p.metric}-${p.global}`;
}

export function parseFamilyId(id: string): FamilyParams | null {
  const m = /^fam-d(\d)-(cheb|manh)-(none|notouch|no2x2)$/.exec(id);
  return m ? { d: Number(m[1]), metric: m[2] as Metric, global: m[3] as Global } : null;
}

export function ringOf(cell: number, w: number, h: number, d: number, metric: Metric): number[] {
  const x = cell % w, y = Math.floor(cell / w);
  const out: number[] = [];
  for (let dy = -d; dy <= d; dy++) {
    for (let dx = -d; dx <= d; dx++) {
      const dist = metric === 'cheb' ? Math.max(Math.abs(dx), Math.abs(dy)) : Math.abs(dx) + Math.abs(dy);
      if (dist !== d) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h) out.push(ny * w + nx);
    }
  }
  return out;
}

export function makeFamily(p: FamilyParams): RuleSet {
  const ring = (c: number, w: number, h: number) => ringOf(c, w, h, p.d, p.metric);
  return {
    id: familyId(p),
    name: familyId(p),
    tagline: `거리 ${p.d} ${p.metric} 고리, 전역 ${p.global}`,
    rules: [`숫자 = 거리 ${p.d}(${p.metric}) 고리의 칠한 칸 수`, `전역 규칙: ${p.global}`],

    constraints(pz: PuzzleData): CardConstraint[] {
      const { width: w, height: h } = pz;
      const out: CardConstraint[] = [];
      pz.clues.forEach((clue, i) => {
        if (clue === null) return;
        out.push({ cells: [i], min: 0, max: 0, kind: 'clue-cell', anchor: i });
        out.push({ cells: ring(i, w, h), min: clue, max: clue, kind: 'echo', anchor: i });
      });
      for (let i = 0; i < w * h; i++) {
        const x = i % w, y = Math.floor(i / w);
        if (p.global === 'notouch') {
          if (x < w - 1) out.push({ cells: [i, i + 1], min: 0, max: 1, kind: 'no-touch' });
          if (y < h - 1) out.push({ cells: [i, i + w], min: 0, max: 1, kind: 'no-touch' });
        } else if (p.global === 'no2x2' && x < w - 1 && y < h - 1) {
          out.push({ cells: [i, i + 1, i + w, i + w + 1], min: 0, max: 3, kind: 'no-2x2' });
        }
      }
      return out;
    },

    randomSolution(w: number, h: number, rng: Rng): Uint8Array {
      const sol = new Uint8Array(w * h);
      const order = shuffle([...Array(w * h).keys()], rng);
      const dens = p.global === 'notouch' ? 0.45 + rng() * 0.25 : 0.3 + rng() * 0.25;
      for (const c of order) {
        if (rng() >= dens) continue;
        const x = c % w, y = Math.floor(c / w);
        if (p.global === 'notouch') {
          const nb = [x > 0 && c - 1, x < w - 1 && c + 1, y > 0 && c - w, y < h - 1 && c + w];
          if (nb.some((n) => n !== false && sol[n] === 1)) continue;
        }
        sol[c] = 1;
        if (p.global === 'no2x2') {
          // c를 포함하는 2×2 중 하나라도 꽉 차면 취소
          for (const [ox, oy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
            const bx = x + ox, by = y + oy;
            if (bx < 0 || by < 0 || bx >= w - 1 || by >= h - 1) continue;
            const b = by * w + bx;
            if (sol[b] && sol[b + 1] && sol[b + w] && sol[b + w + 1]) {
              sol[c] = 0;
              break;
            }
          }
        }
      }
      return sol;
    },

    clueFor(solution, w, h, cell) {
      if (solution[cell] === 1) return null;
      return ring(cell, w, h).reduce((s, c) => s + solution[c], 0);
    },

    clueScope: ring,
  };
}
