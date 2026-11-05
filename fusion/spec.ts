/**
 * 조합(Fusion) = 단서 원자 0~1개 + 가장자리 원자 0~1개 + 전역 원자 0~2개.
 * id 형식: fx-<cell|x>-<edge|x>-<global.global|x>   예) fx-knight-x-balanced.nothree
 */
import { hashString } from '../engine/rng.ts';
import type { CardConstraint, Puzzle, PuzzleData, RuleSet } from '../engine/types.ts';
import { ATOMS, CELL_ATOMS, EDGE_ATOMS, GLOBAL_ATOMS, type Atom } from './atoms.ts';

export interface FusionSpec {
  cell: string | null;
  edge: string | null;
  globals: string[];
}

export interface Edges {
  rows: (number | null)[];
  cols: (number | null)[];
}

export interface FusionPuzzleData extends PuzzleData {
  /** givens 원자: clues[i] = 0(빈칸 공개) | 1(칠함 공개). 그 외 cell 원자: 숫자 단서 */
  edges?: Edges;
}

export interface FusionPuzzle extends Puzzle {
  edges?: Edges;
}

const INCOMPATIBLE: [string, string][] = [
  ['notouch', 'kingtouch'], // 포함 관계
  ['kline', 'balanced'],
  ['connf', 'notouch'], // 칠한 칸이 맞닿을 수 없는데 연결돼야 함 → 불가능
  ['connf', 'kingtouch'],
  ['conne', 'kingtouch'], // kingtouch ⇒ 빈칸은 항상 연결 (실험 0002) → 장식
  ['no2x2f', 'kingtouch'], // 자명하게 성립(장식)
  ['no2x2f', 'notouch'],
  ['rowcol', 'kline'], // 바깥 숫자가 전부 2 → 장식
  ['rowcol', 'balanced'],
  // 실험 0006: 줄마다 하나
  ['kline1', 'kline'], ['kline1', 'balanced'],
  ['kline1', 'rowcol'], // 바깥 숫자가 전부 1 → 장식
  ['kline1', 'no2x2f'], // 자명하게 성립
  ['kline1', 'nothree'], ['kline1', 'no2x2e'], ['kline1', 'connf'], // 6칸 이상 판에서 불가능
];

export function fusionId(s: FusionSpec): string {
  const g = [...s.globals].sort().join('.');
  return `fx-${s.cell ?? 'x'}-${s.edge ?? 'x'}-${g || 'x'}`;
}

export function parseFusionId(id: string): FusionSpec | null {
  const m = /^fx-([a-z0-9]+)-([a-z0-9]+)-([a-z0-9.]+)$/.exec(id);
  if (!m) return null;
  const spec: FusionSpec = {
    cell: m[1] === 'x' ? null : m[1],
    edge: m[2] === 'x' ? null : m[2],
    globals: m[3] === 'x' ? [] : m[3].split('.').sort(),
  };
  return validSpec(spec) ? spec : null;
}

export function atomsOf(s: FusionSpec): Atom[] {
  return [s.cell, s.edge, ...s.globals].filter((x): x is string => !!x).map((id) => ATOMS[id]);
}

export function validSpec(s: FusionSpec): boolean {
  if (s.cell && !CELL_ATOMS.includes(s.cell)) return false;
  if (s.edge && !EDGE_ATOMS.includes(s.edge)) return false;
  if (s.globals.some((g) => !GLOBAL_ATOMS.includes(g))) return false;
  if (new Set(s.globals).size !== s.globals.length || s.globals.length > 2) return false;
  if (!s.cell && !s.edge) return false; // 단서가 없으면 퍼즐이 아님
  const ids = atomsOf(s).map((a) => a.id);
  return !INCOMPATIBLE.some(([a, b]) => ids.includes(a) && ids.includes(b));
}

/** 이미 잘 알려진 장르와 사실상 같은 조합 — 탐색은 하되 '발견'으로 치지 않는다 */
export function knownGenre(s: FusionSpec): string | null {
  const g = [...s.globals].sort().join('.');
  if (s.cell === 'nb8' && !s.edge && !g) return '지뢰찾기';
  if (s.cell === 'givens' && g === 'balanced.nothree') return '타쿠주/빈에리';
  if (s.cell === 'echo2' && !s.edge && g === 'notouch') return '메아리(발명 공장)';
  if (s.cell === 'givens' && g.includes('kline')) return '스타배틀류(영역 없음)';
  if (s.cell === 'givens' && s.globals.includes('kline1')) return '룩 배치(스타배틀류)';
  if (!s.cell && s.edge === 'rowcol' && g === 'kingtouch') return '배틀십류';
  return null;
}

export function allSpecs(): FusionSpec[] {
  const out: FusionSpec[] = [];
  const gsets: string[][] = [[]];
  for (let i = 0; i < GLOBAL_ATOMS.length; i++) {
    gsets.push([GLOBAL_ATOMS[i]]);
    for (let j = i + 1; j < GLOBAL_ATOMS.length; j++) gsets.push([GLOBAL_ATOMS[i], GLOBAL_ATOMS[j]].sort());
  }
  for (const cell of [null, ...CELL_ATOMS])
    for (const edge of [null, ...EDGE_ATOMS])
      for (const globals of gsets) {
        const s = { cell, edge, globals };
        if (validSpec(s)) out.push(s);
      }
  return out;
}

function hasBatchim(word: string): boolean {
  const c = word.charCodeAt(word.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
}

/** 발견에 붙일 이름: 재료 단어 조합 (결정적) */
export function fusionName(s: FusionSpec): string {
  const words = atomsOf(s).filter((a) => a.id !== 'givens').map((a) => a.word);
  if (words.length === 0) return '흔적';
  if (words.length === 1) return words[0];
  const head = words.slice(0, -1).join(' ');
  const last = hasBatchim(head);
  const joiners = ['의 ', last ? '과 ' : '와 ', ' 속 ', last ? '을 건넌 ' : '를 건넌 '];
  const j = joiners[hashString(fusionId(s)) % joiners.length];
  return head + j + words.at(-1);
}

export function usesNumberClues(s: FusionSpec): boolean {
  return !!s.cell && s.cell !== 'givens';
}

export function playerRules(s: FusionSpec): string[] {
  const out = ['몇몇 칸을 칠해서 아래 규칙을 모두 만족시키세요. 정답은 하나뿐입니다.'];
  for (const a of atomsOf(s)) out.push(a.rule);
  return out;
}

/** 원자를 하나 뺀 조합 (필수성 측정용). 유효성 검사는 하지 않는다 */
export function withoutAtom(s: FusionSpec, atomId: string): FusionSpec {
  return {
    cell: s.cell === atomId ? null : s.cell,
    edge: s.edge === atomId ? null : s.edge,
    globals: s.globals.filter((g) => g !== atomId),
  };
}

const cache = new Map<string, RuleSet>();

export function buildFusionRules(s: FusionSpec): RuleSet {
  const id = fusionId(s);
  const hit = cache.get(id);
  if (hit) return hit;
  const cellAtom = s.cell ? ATOMS[s.cell] : null;
  const globals = s.globals.map((g) => ATOMS[g]);
  const checks = globals.filter((g) => g.globalCheck);
  const rules: RuleSet = {
    id,
    name: fusionName(s),
    tagline: atomsOf(s).map((a) => a.name).join(' × '),
    rules: playerRules(s),
    constraints(p: FusionPuzzleData): CardConstraint[] {
      const { width: w, height: h } = p;
      const out: CardConstraint[] = [];
      if (cellAtom) {
        p.clues.forEach((clue, i) => {
          if (clue === null) return;
          if (cellAtom.id === 'givens') {
            out.push({ cells: [i], min: clue, max: clue, kind: 'givens', anchor: i });
          } else {
            out.push({ cells: [i], min: 0, max: 0, kind: 'clue-cell', anchor: i });
            out.push({ cells: cellAtom.scope!(i, w, h), min: clue, max: clue, kind: cellAtom.id, anchor: i });
          }
        });
      }
      if (s.edge && p.edges) {
        p.edges.rows.forEach((v, y) => {
          if (v !== null) out.push({ cells: [...Array(w).keys()].map((x) => y * w + x), min: v, max: v, kind: 'rowcol', anchor: -(y + 1) });
        });
        p.edges.cols.forEach((v, x) => {
          if (v !== null) out.push({ cells: [...Array(h).keys()].map((y) => y * w + x), min: v, max: v, kind: 'rowcol', anchor: -(1000 + x + 1) });
        });
      }
      for (const g of globals) if (g.constraints) out.push(...g.constraints(w, h));
      return out;
    },
    globalCheck: checks.length ? (st, w, h) => checks.every((g) => g.globalCheck!(st, w, h)) : undefined,
    randomSolution() {
      throw new Error('use fusion/sampler.ts');
    },
    clueFor(sol, w, h, cell) {
      if (!cellAtom) return null;
      if (cellAtom.id === 'givens') return sol[cell];
      if (sol[cell] === 1) return null;
      return cellAtom.scope!(cell, w, h).reduce((a, c) => a + sol[c], 0);
    },
    clueScope(cell, w, h) {
      return cellAtom?.scope ? cellAtom.scope(cell, w, h) : [];
    },
  };
  cache.set(id, rules);
  return rules;
}

export function fitsBoard(s: FusionSpec, w: number, h: number): boolean {
  return atomsOf(s).every((a) => !a.fits || a.fits(w, h));
}
