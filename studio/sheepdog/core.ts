/**
 * 양치기 멍멍 스튜디오의 공통 틀 — 발견 공장 arcade/core.ts에서 필요한 부분만 복사(2026-11-12, M0).
 * 결정적 시뮬레이션: 같은 시드·같은 입력 → 같은 결과. 봇이 node에서 사람과 같은 코드를 돌려 밸런스를 잰다.
 */
import { mulberry32 } from './rng.ts';
import type { Rng } from './rng.ts';

/** 입력은 버튼 몇 개의 눌림 상태뿐 — 조작이 단순할수록 좋은 게임이라는 공장의 가정 */
export interface Input {
  /** 원버튼 게임의 탭(이번 틱에 새로 눌렸는가) */
  tap: boolean;
  /** 버튼을 누르고 있는가 (꾹 눌렀다 떼기 게임, 0020) */
  hold?: boolean;
  /** 좌우 조작 게임: -1 왼쪽, 0 정지, 1 오른쪽 */
  dir: -1 | 0 | 1;
  /** 포인터로 직접 가리킨 x(0~1). 있으면 dir보다 우선 */
  aim?: number;
  /** 'touch' 게임: 누르고 있는 동안의 포인터 위치(캔버스 기준 0~1), 안 누르면 null (0021) */
  pointer?: { x: number; y: number } | null;
  /** 'touch' 게임: 숫자 키 1·2·3으로 고른 카드 (0부터) */
  pick?: number;
  /** 'swipe' 게임: 이번 틱에 밀어낸 방향 (한 번만 들어온다, 0022) */
  move?: 'left' | 'right' | 'up' | 'down';
  /** ↺ 다시: 지금 판을 처음부터 (스튜디오 C002) */
  retry?: boolean;
}

export const NO_INPUT: Input = { tap: false, dir: 0 };
export const TICK = 1 / 60;

/** 게임마다 입히는 디자인 컨셉 (오너 요청 2026-11-07). 게임 하나가 한 세계의 색을 쓴다 */
export interface Art {
  /** 컨셉 이름 (예: "작은 행성 방어") */
  concept: string;
  /** 분위기 한 줄 */
  mood: string;
  palette: Theme;
}

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
  controls: 'tap' | 'hold' | 'leftright' | 'touch' | 'swipe';
  /** 오너가 직접 준 아이디어로 만든 게임이면 그 출처 (계기판의 '오너 아이디어' 칸에 따로 보인다, 2026-11-08) */
  origin?: string;
  /** 시작 화면·접근성 문구에 쓸 조작 안내 (없으면 조작 종류별 기본 문구, 0023) */
  hint?: string;
  /** 화면 세로 ÷ 가로 (없으면 좌우 1.5, 탭 1) */
  aspect?: number;
  /** 디자인 컨셉. 있으면 페이지 색 대신 이 팔레트로 그린다 */
  art?: Art;
  /**
   * 지금까지 판에 "새로 등장한 것"의 수 (새 적 종류·새 능력·사건·판의 변화…). 0022 오너 피드백:
   * "목표가 너무 쉽게 눈에 들어오고, 계속해도 어떨지가 단번에 느껴진다" → 판이 흐르며 펼쳐져야 한다.
   * 0023부터 새 게임은 필수. 계기판이 30·60·120초 시점 값을 잰다.
   */
  reveals?(s: S): number;
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

/** 잘하는 봇의 반응 간격(틱). 사람처럼 0.05초에 한 번 판단 — 매 틱 완벽하면 어떤 게임도 안 죽어서 난이도를 잴 수 없다 (실험 0016) */
export const REACT = 3;

/** 봇 한 판. maxTicks(기본 3분)에서 끊는다. react틱마다 한 번 판단하고, 사이 틱엔 직전 입력을 유지(탭은 다시 누르지 않음) */
export function runBot<S>(g: GameDef<S>, bot: Bot<S>, seed: number, maxTicks = 60 * 180, react = 1): RunResult {
  const s = g.create(seed);
  const rng = mulberry32(seed ^ 0x9e3779b9);
  let ticks = 0, changes = 0, last = '', held: Input = NO_INPUT;
  while (!g.over(s) && ticks < maxTicks) {
    const inp = ticks % react === 0 ? (held = bot.act(s, rng)) : { ...held, tap: false, move: undefined, pick: undefined };
    const key = `${inp.tap ? 1 : 0}${inp.hold ? 1 : 0}${inp.dir}${inp.move ?? ''}${inp.aim === undefined ? '' : Math.round(inp.aim * 8)}`;
    if (key !== last && (inp.tap || inp.hold || inp.move || inp.dir !== 0 || inp.aim !== undefined)) changes++;
    last = key;
    g.step(s, inp);
    ticks++;
  }
  return { score: g.score(s), ticks, changes };
}
