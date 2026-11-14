/**
 * 나사 풀기 공방 스튜디오의 공통 틀 — arcade/core.ts에서 이 게임이 쓰는 것만 옮겨 왔다(공장 코드와 분리).
 * 결정적 시뮬레이션: 같은 시드·같은 입력 → 같은 결과. 봇이 node에서 사람과 같은 코드를 돈다.
 */
import { mulberry32, type Rng } from './rng.ts';

export interface Input {
  tap: boolean;
  hold?: boolean;
  dir: -1 | 0 | 1;
  /** 누르고 있는 동안의 포인터 위치(캔버스 기준 0~1), 안 누르면 null */
  pointer?: { x: number; y: number } | null;
}

export const NO_INPUT: Input = { tap: false, dir: 0 };
export const TICK = 1 / 60;

export interface Theme { bg: string; ink: string; muted: string; accent: string; hot: string; soft: string }
export interface Art { concept: string; mood: string; palette: Theme }

export interface GameDef<S> {
  id: string;
  name: string;
  genes: string[];
  twist: string;
  rules: string[];
  controls: 'touch';
  hint?: string;
  aspect?: number;
  art?: Art;
  reveals?(s: S): number;
  create(seed: number): S;
  step(s: S, input: Input): void;
  over(s: S): boolean;
  score(s: S): number;
  draw(ctx: CanvasRenderingContext2D, s: S, w: number, h: number, theme: Theme): void;
}

export interface Bot<S> { name: string; act(s: S, rng: Rng): Input }

/** 봇 한 판(최대 maxTicks). 끝난 상태도 돌려줘서 판별 지표를 뽑는다 */
export function runBot<S>(g: GameDef<S>, bot: Bot<S>, seed: number, maxTicks = 60 * 1200): { s: S; score: number; ticks: number } {
  const s = g.create(seed);
  const rng = mulberry32(seed ^ 0x9e3779b9);
  let ticks = 0;
  while (!g.over(s) && ticks < maxTicks) {
    g.step(s, bot.act(s, rng));
    ticks++;
  }
  return { s, score: g.score(s), ticks };
}
