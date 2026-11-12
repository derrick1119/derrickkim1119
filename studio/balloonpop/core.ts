/**
 * 풍선 팡 연쇄 스튜디오의 공통 틀 — 공장 `arcade/core.ts`에서 이 게임에 필요한 것만 옮겨 왔다(M0).
 * 결정적 시뮬레이션: 같은 시드·같은 입력 → 같은 결과. 브라우저와 봇이 같은 코드를 돈다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';

export interface Input {
  tap: boolean;
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
export interface RunResult { score: number; ticks: number; changes: number }

/** 봇 한 판. maxTicks(기본 3분)에서 끊는다 */
export function runBot<S>(g: GameDef<S>, bot: Bot<S>, seed: number, maxTicks = 60 * 180): RunResult {
  const s = g.create(seed);
  const rng = mulberry32(seed ^ 0x9e3779b9);
  let ticks = 0, changes = 0;
  while (!g.over(s) && ticks < maxTicks) {
    const inp = bot.act(s, rng);
    if (inp.pointer) changes++;
    g.step(s, inp);
    ticks++;
  }
  return { score: g.score(s), ticks, changes };
}
