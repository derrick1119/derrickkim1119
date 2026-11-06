/**
 * 아케이드 발견 공장의 공통 틀 (실험 0011).
 *
 * 게임 하나 = 기존 장르에서 떼어낸 유전자(GENES) 2~3개의 조합 + 변형.
 * 모든 게임은 **결정적 시뮬레이션**(같은 시드·같은 입력 → 같은 결과)으로 짜서,
 * 사람이 브라우저에서 하는 것과 똑같은 코드를 봇이 node에서 수천 번 돌려 잴 수 있게 한다.
 */
import { mulberry32, type Rng } from '../engine/rng.ts';

/** 입력은 버튼 몇 개의 눌림 상태뿐 — 조작이 단순할수록 좋은 게임이라는 공장의 가정 */
export interface Input {
  /** 원버튼 게임의 탭(이번 틱에 새로 눌렸는가) */
  tap: boolean;
  /** 좌우 조작 게임: -1 왼쪽, 0 정지, 1 오른쪽 */
  dir: -1 | 0 | 1;
  /** 포인터로 직접 가리킨 x(0~1). 있으면 dir보다 우선 */
  aim?: number;
}

export const NO_INPUT: Input = { tap: false, dir: 0 };
export const TICK = 1 / 60;

export interface Gene {
  id: string;
  /** 어떤 장르에서 떼어왔나 */
  from: string;
  /** 한 줄 설명 */
  what: string;
}

/** 조합 재료. 새 게임은 이 목록에서 골라 섞고 비튼다 */
export const GENES: Record<string, Gene> = {
  brick: { id: 'brick', from: '벽돌깨기', what: '튕기는 공으로 블록을 부순다' },
  defense: { id: 'defense', from: '타워 디펜스', what: '적이 다가오고, 선을 넘으면 진다' },
  gacha: { id: 'gacha', from: '랜덤 뽑기·머지', what: '강화가 무작위로 나오고, 같은 것끼리 합치면 세진다' },
  snake: { id: 'snake', from: '스네이크', what: '먹을수록 꼬리가 길어지고, 꼬리에 닿으면 끝' },
  onebutton: { id: 'onebutton', from: '원버튼 캐주얼', what: '버튼 하나, 타이밍만으로 조작' },
  orbit: { id: 'orbit', from: '궤도 아케이드', what: '중심을 도는 원 궤도 위를 움직인다' },
  endless: { id: 'endless', from: '무한 러너', what: '끝이 없고 점점 빨라진다, 최고 기록 경쟁' },
  stack: { id: 'stack', from: '타이밍 쌓기', what: '움직이는 블록을 제때 멈춰 쌓는다' },
  merge: { id: 'merge', from: '2048·수박게임', what: '같은 것끼리 부딪히면 한 단계 위로 합쳐진다' },
  survivor: { id: 'survivor', from: '탄막 서바이버', what: '공격은 자동, 플레이어는 움직임만' },
};

export interface GameDef<S> {
  id: string;
  name: string;
  /** 조합한 유전자 id들 */
  genes: string[];
  /** 어떤 비틀기를 했나 (한 문장) */
  twist: string;
  /** 플레이어용 규칙 (짧을수록 좋다, 3줄 이하 권장) */
  rules: string[];
  /** 조작: 원버튼 탭 / 좌우 */
  controls: 'tap' | 'leftright';
  /** 화면 세로 ÷ 가로 (없으면 좌우 1.5, 탭 1) */
  aspect?: number;
  create(seed: number): S;
  step(s: S, input: Input): void;
  over(s: S): boolean;
  score(s: S): number;
  /** 캔버스 그리기 (브라우저 전용, 시뮬레이션과 분리) */
  draw(ctx: CanvasRenderingContext2D, s: S, w: number, h: number, theme: Theme): void;
}

export interface Theme {
  bg: string;
  ink: string;
  muted: string;
  accent: string;
  hot: string;
  soft: string;
}

export interface Bot<S> {
  name: string;
  act(s: S, rng: Rng): Input;
}

export interface RunResult {
  score: number;
  ticks: number;
  /** 입력이 바뀐 횟수 — 결정 밀도 계산용 */
  changes: number;
}

/** 봇 한 판. maxTicks(기본 3분)에서 끊는다 */
export function runBot<S>(g: GameDef<S>, bot: Bot<S>, seed: number, maxTicks = 60 * 180): RunResult {
  const s = g.create(seed);
  const rng = mulberry32(seed ^ 0x9e3779b9);
  let ticks = 0, changes = 0, last = '';
  while (!g.over(s) && ticks < maxTicks) {
    const inp = bot.act(s, rng);
    const key = `${inp.tap ? 1 : 0}${inp.dir}${inp.aim === undefined ? '' : Math.round(inp.aim * 8)}`;
    if (key !== last && (inp.tap || inp.dir !== 0 || inp.aim !== undefined)) changes++;
    last = key;
    g.step(s, inp);
    ticks++;
  }
  return { score: g.score(s), ticks, changes };
}
