import type { Rng } from './rng.ts';

/** 셀 상태: -1 미정, 0 빈칸, 1 칠함 */
export const UNKNOWN = -1;
export const EMPTY = 0;
export const FILLED = 1;

/**
 * 모든 규칙은 "이 칸들 중 칠해진 개수는 [min, max]" 형태의 제약으로 환원된다.
 * 이렇게 하면 솔버·난이도 판정기·힌트 시스템이 규칙과 무관하게 재사용된다.
 */
export interface CardConstraint {
  cells: number[];
  min: number;
  max: number;
  /** 힌트 문구/UI 하이라이트용 분류 */
  kind: string;
  /** 이 제약을 만든 단서 칸 (있다면) */
  anchor?: number;
}

export interface PuzzleData {
  rules: string;
  width: number;
  height: number;
  /** 칸별 단서. null = 단서 없음 */
  clues: (number | null)[];
}

export type Technique = 'single' | 'pair' | 'trial';
export type Tier = 'easy' | 'medium' | 'hard' | 'expert';

export interface DifficultyReport {
  tier: Tier;
  score: number;
  counts: Record<Technique, number>;
  maxTrialDepth: number;
}

export interface Puzzle extends PuzzleData {
  id: string;
  seed: number;
  /** '0'/'1' 문자열. 힌트와 오답 표시용 */
  solution: string;
  difficulty: DifficultyReport;
}

export interface RuleSet {
  id: string;
  name: string;
  tagline: string;
  /** 플레이어에게 보여줄 규칙 설명 (한 줄씩) */
  rules: string[];
  constraints(p: PuzzleData): CardConstraint[];
  /** 규칙을 만족하는 무작위 정답 격자 */
  randomSolution(w: number, h: number, rng: Rng): Uint8Array;
  /** 정답 격자에서 이 칸에 둘 단서 값 (단서가 될 수 없으면 null) */
  clueFor(solution: Uint8Array, w: number, h: number, cell: number): number | null;
  /** 단서가 영향을 주는 칸들 (UI 하이라이트) */
  clueScope(cell: number, w: number, h: number): number[];
  /** 지역 제약으로 표현 못 하는 전역 규칙. 부분 상태에서 "확실히 위반"이면 false */
  globalCheck?(state: Int8Array, w: number, h: number): boolean;
}
