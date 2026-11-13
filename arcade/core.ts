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
}

export const NO_INPUT: Input = { tap: false, dir: 0 };
export const TICK = 1 / 60;

/**
 * 재료 종류 (0018). 새 게임 = 핵심 놀이 1~2 + 조작 1 + 비틀기·성장 0~1.
 *  core    무엇을 하며 노는가 (장르의 심장)
 *  control 어떻게 조작하는가
 *  twist   판·규칙을 어떻게 비트는가
 *  meta    판 안팎에서 무엇이 성장하는가
 */
export type GeneKind = 'core' | 'control' | 'twist' | 'meta';
export const GENE_KIND_LABEL: Record<GeneKind, string> = { core: '핵심 놀이', control: '조작', twist: '비틀기', meta: '성장' };

export interface Gene {
  id: string;
  kind: GeneKind;
  /** 어떤 장르에서 떼어왔나 (장르 이름만 — 특정 게임의 이름·캐릭터는 쓰지 않는다) */
  from: string;
  /** 한 줄 설명 */
  what: string;
}

const g = (id: string, kind: GeneKind, from: string, what: string): Gene => ({ id, kind, from, what });

/** 조합 재료. 새 게임은 이 목록에서 골라 섞고 비튼다. 오너 요청(2026-11-07)으로 12 → 56개 */
export const GENES: Record<string, Gene> = Object.fromEntries(
  [
    // ── 핵심 놀이 ──────────────────────────────────────────────
    g('brick', 'core', '벽돌깨기', '튕기는 공으로 블록을 부순다'),
    g('defense', 'core', '타워 디펜스', '적이 다가오고, 선을 넘으면 진다'),
    g('snake', 'core', '스네이크', '먹을수록 꼬리가 길어지고, 꼬리에 닿으면 끝'),
    g('endless', 'core', '무한 러너', '끝이 없고 점점 빨라진다, 최고 기록 경쟁'),
    g('stack', 'core', '타이밍 쌓기', '움직이는 블록을 제때 멈춰 쌓는다'),
    g('merge', 'core', '합치기(2048류)', '같은 것끼리 부딪히면 한 단계 위로 합쳐진다'),
    g('survivor', 'core', '탄막 서바이버', '공격은 자동, 플레이어는 움직임만'),
    g('rhythm', 'core', '리듬 게임', '박자에 맞춰 누르면 보상이 커진다'),
    g('absorb', 'core', '덩치 키우기(.io)', '나보다 작은 건 먹고 커지고, 큰 건 피한다'),
    g('match3', 'core', '3매치', '같은 색 셋 이상을 붙이면 터진다'),
    g('fallblock', 'core', '낙하 블록 퍼즐', '떨어지는 조각을 돌려 끼워 줄을 채우면 사라진다'),
    g('bubble', 'core', '버블 슈터', '색 구슬을 쏘아 붙이고, 같은 색이 모이면 떨어진다'),
    g('pinball', 'core', '핀볼', '양쪽 날개로 공을 쳐 올려 점수판을 맞힌다'),
    g('slingshot', 'core', '새총 물리', '당겼다 놓아 포물선으로 날려 무너뜨린다'),
    g('artillery', 'core', '포격전', '각도와 힘을 정해 포물선으로 맞힌다, 바람이 변수'),
    g('golf', 'core', '미니 골프', '한 번의 방향·세기로 굴려 구멍에 넣는다'),
    g('billiards', 'core', '당구', '공으로 공을 맞혀 원하는 곳에 보낸다'),
    g('pong', 'core', '공 받아치기(퐁)', '양쪽에서 공을 받아쳐 상대 뒤로 넘긴다'),
    g('catch', 'core', '받아내기', '위에서 떨어지는 것을 바구니로 받는다, 나쁜 건 피한다'),
    g('dodge', 'core', '피하기', '쏟아지는 것을 피해 오래 버틴다'),
    g('shmup', 'core', '슈팅(종스크롤)', '앞으로 쏘며 날아오는 적과 탄을 피한다'),
    g('flap', 'core', '날갯짓 통과', '누르면 떠오르고 놓으면 떨어진다, 틈을 지나간다'),
    g('lane', 'core', '차선 러너', '몇 개의 차선을 오가며 장애물을 피한다'),
    g('fortify', 'core', '지어서 버티기', '공격·재난이 오기 전에 짓고, 날아오고 몰려오는 것을 견딘다 (오너 아이디어 2026-11-09)'),
    g('decorate', 'core', '꾸미기·디오라마', '놓은 것끼리 어울리면 변신하고, 작은 세계가 점점 예뻐진다 (오너 방향 2026-11-08)'),
    g('tiles', 'core', '타일 놓기', '다음 조각을 어디에 놓을지 골라 이웃과 맞춘다'),
    g('crossing', 'core', '길 건너기', '차가 오가는 줄을 한 칸씩 건너 앞으로, 틈을 노린다 (오너 아이디어 2026-11-08)'),
    g('racing', 'core', '레이싱', '코너를 돌며 더 빨리, 남보다 먼저'),
    g('drift', 'core', '드리프트', '미끄러지며 커브를 돈다, 길에서 벗어나면 끝'),
    g('grapple', 'core', '밧줄 그네', '천장에 줄을 걸어 흔들리다 놓아 날아간다'),
    g('whack', 'core', '두더지 잡기', '잠깐 튀어나온 것을 재빨리 친다'),
    g('illusion', 'core', '착시 그림', '눈이 속는 그림에서 진짜 답을 가려낸다 (오너 아이디어 2026-11-08)'),
    g('multiply', 'core', '곱하기 문', '지나가면 수가 곱해지는 문을 골라 지나가 크게 불린다'),
    g('fishing', 'core', '낚시', '기다렸다가 입질이 오면 제때 당긴다'),
    g('pushbox', 'core', '상자 밀기 퍼즐', '상자를 밀어 정해진 칸에 넣는다, 되돌릴 수 없다'),
    g('territory', 'core', '땅따먹기', '선을 그어 둘러싼 만큼 내 땅이 된다, 선이 끊기면 끝'),
    g('memory', 'core', '짝 맞추기', '뒤집힌 카드를 기억해 같은 짝을 찾는다'),
    g('farm', 'core', '농사·수확', '심고 기다렸다 제때 거둔다, 늦으면 시든다'),
    g('order', 'core', '주문 처리', '밀려드는 주문을 순서대로 빨리 처리한다'),
    g('traffic', 'core', '교차로 신호', '신호를 바꿔 차들이 부딪히지 않게 흘려보낸다'),
    g('autobattle', 'core', '자동 전투', '배치만 하고 싸움은 저절로 벌어진다'),
    g('idle', 'core', '방치형', '시간이 지나면 자원이 쌓이고, 쓸 곳을 고른다'),
    g('deck', 'core', '덱 빌딩', '카드를 모아 덱을 키우고, 뽑힌 카드로 싸운다'),
    g('herd', 'core', '몰이', '직접 움직이지 않고 겁을 줘서 무리를 원하는 곳으로 몬다 (23라운드 2026-11-11)'),
    g('claw', 'core', '인형 뽑기', '움직이는 집게를 알맞은 때에 내려 집어 올린다 (23라운드 2026-11-11)'),
    g('ripple', 'core', '물결 밀기', '물결을 일으켜 떠 있는 것들을 밀어 옮긴다 (23라운드 2026-11-11)'),
    g('sort', 'core', '분류하기', '흘러오는 것을 알맞은 쪽으로 나눠 담는다 (23라운드 2026-11-11)'),
    g('pegdrop', 'core', '핀 떨구기', '위에서 떨군 공이 핀에 튕기며 내려와 칸에 들어간다 (23라운드 2026-11-11)'),
    g('reflect', 'core', '빛 반사', '거울을 돌려 빛줄기를 꺾어 목표에 닿게 한다 (24라운드 2026-11-12)'),
    g('unscrew', 'core', '나사 풀기', '겹친 판자를 붙든 나사를 하나씩 빼서 같은 색 상자에 모으면 판자가 떨어진다 (25라운드 2026-11-13)'),
    g('boarding', 'core', '줄 서서 태우기', '길이 트인 손님부터 나와 같은 색 탈것에 탄다, 대기 자리는 모자란다 (25라운드 2026-11-13)'),
    g('linefill', 'core', '줄 채워 지우기', '조각을 판에 놓아 가로·세로 한 줄을 꽉 채우면 그 줄이 사라진다 (25라운드 2026-11-13)'),
    g('demolish', 'core', '무너뜨리기', '정해진 곳에 폭약을 붙여 구조물을 원하는 쪽으로 무너뜨린다 (25라운드 2026-11-13)'),
    // ── 조작 ─────────────────────────────────────────────────
    g('onebutton', 'control', '원버튼', '버튼 하나, 누르는 타이밍만으로 조작'),
    g('hold', 'control', '꾹 눌렀다 떼기', '누르고 있는 시간만큼 힘이 차고, 떼는 순간 발동'),
    g('twobutton', 'control', '투버튼', '왼쪽·오른쪽 두 버튼'),
    g('swipe', 'control', '스와이프', '상하좌우로 밀어 한 칸씩 움직인다'),
    g('dragaim', 'control', '드래그 조준', '끌어서 방향과 세기를 정하고 놓아 발사'),
    g('slide', 'control', '좌우 미끄러지기', '손가락을 따라 좌우로 움직인다'),
    g('pointer', 'control', '가리키기', '누른 곳으로 간다·누른 곳에 한다 (가장 손에 붙는 조작)'),
    // ── 비틀기 ────────────────────────────────────────────────
    g('orbit', 'twist', '원 궤도', '평면 대신 중심을 도는 원 위에서 움직인다'),
    g('gravityflip', 'twist', '중력 뒤집기', '위아래가 뒤집힌다, 천장이 바닥이 된다'),
    g('mirror', 'twist', '거울 쌍둥이', '한 번의 조작으로 둘이 반대로 움직인다'),
    g('shrink', 'twist', '좁아지는 판', '시간이 갈수록 판이 줄어든다'),
    g('rolereverse', 'twist', '역할 뒤집기', '원래 장르에서 당하는 쪽을 플레이한다'),
    g('turnbased', 'twist', '턴제화', '실시간 장르를 한 수씩 두는 차례로 바꾼다'),
    g('rewind', 'twist', '되감기', '실수하면 몇 초 전으로 돌아간다, 대신 대가가 있다'),
    g('ghost', 'twist', '유령 경주', '내 지난 판의 유령과 함께 달린다'),
    g('chain', 'twist', '연쇄 폭발', '터진 것이 이웃을 터뜨리며 이어진다'),
    g('daynight', 'twist', '낮과 밤', '낮엔 키우고 밤엔 지킨다, 하는 일이 번갈아 바뀐다'),
    g('forecast', 'twist', '재난 예보', '무엇이 얼마나 어디서 오는지 미리 보고 대비한다 (오너 아이디어 2026-11-09: 물이 몇 리터 어디서)'),
    g('depth', 'twist', '깊어지는 판', '나아갈수록 새 구역이 열리고, 새 것이 나온다'),
    // ── 성장 ─────────────────────────────────────────────────
    g('gacha', 'meta', '랜덤 뽑기', '강화가 무작위로 나온다'),
    g('pick3', 'meta', '셋 중 하나 고르기', '레벨이 오를 때 강화 셋 중 하나를 고른다'),
    g('unlock', 'meta', '영구 해금', '판이 끝나도 남는 성장, 다음 판이 조금 쉬워진다'),
    g('collect', 'meta', '도감 수집', '여러 종류를 모아 도감을 채운다'),
    g('combo', 'meta', '콤보 피버', '끊기지 않고 이어 가면 점점 세지고 피버가 터진다'),
  ].map((x) => [x.id, x]),
);

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
