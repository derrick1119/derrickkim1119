/**
 * [스튜디오 M0] arcade/games/duckbath.ts(공장 23라운드 프로토타입)를 그대로 옮겨 온 것. 이후 스튜디오에서 키운다.
 *
 * 욕조 물결 오리 (23라운드: 완전히 다른 장르) — 물결 밀기 × 가리키기 × 상자 밀기 퍼즐.
 * 기준 9(손이 하는 일은 하나): 물을 톡 = '찰박!' 그 자리에서 물결 고리가 퍼진다. 꾹 누르고 있으면 오리가 어디로 갈지 흐린 점선으로
 *   미리 보이고, 손을 떼는 순간 찰박(물 밖에서 떼면 취소). 키보드는 화살표로 커서 + 스페이스(누르는 동안 미리 보기, 떼면 찰박).
 * 규칙(결정적, 2줄): 물결은 일정한 속도로 퍼지는 고리다. 고리에 닿은 것은 고리 바깥쪽으로 PMAX×(1−거리/RMAX)만큼 밀린다(멀수록 약하게).
 *   오리는 둥지에 들어가면 멈춘다. 벽에 닿은 물결은 거울처럼 되돌아와(세기 0.6배) 한 번 더 밀고, 두 물결이 잇달아(0.2초 안) 닿으면 1.5배.
 *   (유체 계산 없음: 고리 = 원, 반사 = 벽 너머 거울 자리에서 퍼지는 원. 그래서 '여기 치면 저리 간다'가 읽힌다)
 * 와우: 첫 톡에 '찰박!' 고리가 퍼져 가운데 모인 오리 셋과 황금 오리가 사방의 비누 둥지로 둥둥 — 한 번에 넷.
 * 판(목욕) 8개: 목표 = 오리를 모두 둥지에. 별 = ★ 다 넣음 · ★ 톡 N번 이하 · ★ 황금 오리(마지막 오리보다 먼저 넣어야 — 순서가 수).
 *   실패 = 오리가 배수구로 쏙 / 상어가 꿀꺽 / 톡을 다 쓰고 물이 잔잔해짐 → 같은 판 다시(스튜디오 D001: 하트 없음, 몇 번이든). 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1판 넓은 둥지 → 2판 거품 섬(물결 그늘: 뒤에 숨은 오리는 안 밀림 → 골라 밀기) → 3판 배수구(바깥에서 치면
 *   빨려 듦 → 배수구 쪽에서 쳐서 밀어내기) → 4판 색깔 둥지(섞인 오리를 갈라 밀기) → 5판 장난감 배(무거워 바로 옆을 쳐야 함, 부두로)
 *   → 6판 고무 상어(오리에게 다가옴 → 물결로 밀면 어질어질) → 7판 수도꼭지 물줄기(태우면 저절로 실려 감) → 8판 비누 미끄럼(살살 쳐야).
 * 웃음: 맞은 오리는 '꽥!' 하며 뒤뚱 돌고, 벽에 콩 부딪히면 어질어질 별, 둥지에 들면 엄마 오리 옆으로 쪼르르. 욕조 모서리의
 *   고양이는 앞발로 물을 건드리려다 물결이 오면 '냐앗!' 하고 털을 세워 펄쩍. 고무 상어는 사팔눈에 혀를 내민 바보 얼굴.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from './core.ts';
import { juice } from './juice.ts';

const A = 1.52;
/** 욕조 물 평면: 가로 0~W, 세로 0~H (0 = 수도꼭지 쪽 뒤, H = 앞) */
const W = 1, H = 1.2;
/** 물결: 한 틱에 RS씩 퍼지고 반지름 RMAX에서 사라진다. 고리에 닿은 것은 PMAX×(1−r/RMAX)만큼 밀린다 */
const RS = 0.011, RMAX = 0.7, PMAX = 0.4;
/** 벽에 튕긴 물결의 세기 · 두 물결이 DUO_T틱 안에 잇달아 닿으면 배수 */
const REFL = 0.6, DUO = 1.5, DUO_T = 12;
/** 물의 마찰(틱마다 속도에 곱함) · 비누 미끄럼 위 · 멈춤 기준 */
const FR = 0.95, FR_SLICK = 0.985, STOP = 0.0005;
const DR = 0.045, BIG = 0.062;
/** 오리가 거품 고리에 닿으면(중심이 반지름+이만큼 안) 둥지에 든다 */
const NEST_TOUCH = 0.03;
/** 배수구: 끌어당기는 반지름 · 빨려 드는 반지름 · 당기는 힘 */
const PULL_R = 0.17, SUCK_R = 0.035, PULL = 0.0002;
/** 상어: 다가오는 속도 · 닿으면 꿀꺽(몸이 닿는 거리보다 조금 넓게) · 물결 맞으면 어질어질 */
const SHARK_V = 0.0015, CHOMP = 0.115, STUN = 150;
const STREAM_V = 0.0045;
const RESULT = 170, RESULT_OK = 200, NEWS_T = 170, CARD_T = 150;
const STAR_PTS = 100, LEFT_PTS = 10, WIN_PTS = 300;

const DUCK = 0, GOLD = 1, BOAT = 2, SHARK = 3;
const FREE = -1, SUCKED = -2, EATEN = -3;
const WEIGHT = [1, 1, 0.45, 0.8];
const RAD = [DR, DR, BIG, BIG];
/** 🐥 아기 오리는 0.6배 (D016) — 앞과 0.06 간격으로 붙어 다녀도 부딪혀 밀려나지 않게 */
const rad = (o: { k: number; lead: number }) => (o.lead >= 0 ? RAD[o.k] * 0.6 : RAD[o.k]);
const MASS = [1, 1, 2.5, 1.3];

interface StageDef {
  /** 판 id '욕실-번호' (D007, CONTENT v0.3) — 저장·판 고르기의 열쇠. 순서는 STAGES 배열 순서 */
  id: string;
  key: string;
  news: string;
  hint: string;
  /** [x, y, 색(0 노랑·1 분홍), 잠꾸러기(1 = 💤, D013)] */
  ducks: number[][];
  gold: number[];
  boat?: number[];
  shark?: number[];
  /** D016 상어 여럿 [x, y][] (3-9) — shark와 함께 써도 된다 */
  sharks?: number[][];
  /** D016 🐥 오리 가족 줄 [앞 오리 번호(ducks 안), 마리 수, 줄 방향 x, y(기본 0, −1 = 위로)] (CONTENT §2) */
  chicks?: number[][];
  /** [x, y, 반지름, 색(-1 아무나), 부두(1), 엄마 없음(1)] */
  nests: number[][];
  islands?: number[][];
  drains?: number[][];
  /** [x0, y0, x1, y1, dx, dy] — 이 네모 안에서는 (dx,dy) 쪽으로 계속 흐른다 */
  streams?: number[][];
  slicks?: number[][];
  /** D015 🎈 물풍선 [x, y] (CONTENT §2): 진짜 물결 앞머리가 지나가면 그 자리에서 찰박 한 번 · 톡 안 씀 · 연쇄 · 오리와 안 부딪힘 */
  balloons?: number[][];
  taps: number;
  par: number;
  /** 실패 카드 팁(없으면 hint). 1판 hint는 별 조건이라 실패 이유가 아니다 (🧪 D005) */
  failHint?: string;
  /** 판 시작 카드에 띄우는 '이 판의 질문' 한 줄 (CONTENT §1, D002) */
  ask?: string;
  /** 판별 배수구 끌림 반지름·세기 (없으면 PULL_R·PULL, CONTENT §1 3판) */
  pullR?: number;
  pull?: number;
}

/** 욕실(월드) 3개 × 10칸 (D007, CONTENT v0.3). 아직 안 만든 칸은 판 고르기에서 '준비 중' */
export const WORLDS = [
  { name: '민트 욕실', emoji: '🛁' },
  { name: '할머니 댁 욕조', emoji: '🧶' },
  { name: '놀이 욕조', emoji: '🧸' },
];
export const SLOTS = 10;
/** 판 id의 욕실 (D007 🧪: 판 이름을 HUD·띠·판 고르기에서 하나로) */
export const worldOf = (id: string) => WORLDS[Number(id.split('-')[0]) - 1] ?? WORLDS[0];
/**
 * 만든 판들(욕실 순서). 좌표는 뒤집기 전 — 판마다 시드로 좌우를 뒤집고 오리 자리를 살짝 흔든다.
 * D007: M1의 8판을 CONTENT v0.3 자리로 옮겼다(1-1·1-2·1-3·2-1·2-4·2-9·3-2·3-4). 판 순서가 바뀌어 판 번호(인덱스)도 바뀜.
 */
export const STAGES: StageDef[] = [
  {
    id: '1-1', key: '', news: '', hint: '👑 황금 오리가 꼴찌만 아니면 ★', failHint: '오리 무리 한가운데를 톡 — 사방으로 밀려 나가요',
    ducks: [[0.5, 0.42, 0], [0.62, 0.6, 0], [0.38, 0.6, 0]], gold: [0.5, 0.78],
    nests: [[0.5, 0.12, 0.2, -1], [0.88, 0.6, 0.2, -1], [0.12, 0.6, 0.2, -1], [0.5, 1.08, 0.2, -1], [0.1, 0.1, 0.15, -1, 0, 1], [0.9, 0.1, 0.15, -1, 0, 1], [0.1, 1.1, 0.15, -1, 0, 1], [0.9, 1.1, 0.15, -1, 0, 1]],
    taps: 12, par: 1, ask: '가운데를 톡! 한 번에 몇 마리?', // D002 CONTENT §1: 톡 9→12 (첫 판은 거의 못 진다)
  },
  {
    id: '1-2', key: 'island', news: '🫧 거품 섬 뒤에 숨은 오리는 물결이 안 닿아요', hint: '거품 섬 뒤에 숨은 오리는 안 밀려요 — 골라 밀기',
    // D009: 양옆 오리가 옆 둥지 입성 거리(r + 0.03 = 0.19)에서 0.014 떨어져 흔들기(±0.02)로 저절로 드는 시드가 있었다(시드 3, 강화한 '가만히 두면' 검사)
    // → 오리 자리는 M1 그대로 두고 옆 둥지 r 0.16 → 0.15 (오리를 안쪽으로 옮기면 캐주얼 ★톡 n=300 .21로 '두 번에 다'가 깨짐)
    ducks: [[0.5, 0.38, 0], [0.3, 0.64, 0], [0.7, 0.64, 0]], gold: [0.5, 0.85],
    islands: [[0.5, 0.6, 0.1]],
    nests: [[0.5, 0.1, 0.16, -1], [0.9, 0.6, 0.15, -1], [0.1, 0.6, 0.15, -1], [0.5, 1.1, 0.16, -1], [0.1, 0.1, 0.13, -1, 0, 1], [0.9, 0.1, 0.13, -1, 0, 1], [0.1, 1.1, 0.13, -1, 0, 1], [0.9, 1.1, 0.13, -1, 0, 1]],
    taps: 10, par: 2, ask: '섬 뒤에 숨은 오리까지, 두 번에 다!', // D002: 큰 둥지 r 0.15→0.16, 톡 8→10
  },
  {
    id: '1-3', key: 'drain', news: '🕳️ 배수구 가까이 멈추면 쭈욱 빨려 가요!', hint: '배수구 쪽에서 치면 밖으로, 바깥에서 치면 안으로!',
    // D002 CONTENT §1 전면 재설계: 배수구를 셋이 둘러싸고 끌림을 약하게 — 배수구 바로 옆을 치면 밖으로 튕겨 나간다
    // D008 CONTENT v0.3 §4 ①: 오리 3 → 5 (배수구 위 좌우, 끌림 0.12 밖) · 톡 10 → 14 · par 2 → 3 (P1: 캐주얼 톡 30%점 3)
    ducks: [[0.5, 0.42, 0], [0.34, 0.72, 0], [0.66, 0.72, 0], [0.3, 0.45, 0], [0.7, 0.45, 0]], gold: [0.5, 0.84],
    drains: [[0.5, 0.6]], pullR: 0.12, pull: 0.00012,
    nests: [[0.12, 0.14, 0.17, -1], [0.88, 0.14, 0.17, -1], [0.12, 1.06, 0.17, -1], [0.88, 1.06, 0.17, -1], [0.1, 0.6, 0.14, -1, 0, 1], [0.9, 0.6, 0.14, -1, 0, 1]],
    taps: 14, par: 3, ask: '배수구 바로 옆을 톡 — 오리가 밖으로 튕겨요!',
  },
  // D009 첫 새 판 (CONTENT v0.3 §1 1욕실 조합 판). 좌표·톡·par는 ✏️가 판 하나 실험(scratchpad d009)으로 정하고 funqa로 다시 잼.
  {
    id: '1-4', key: '', news: '', hint: '숨은 오리는 섬 반대쪽에서 — 그늘 밖에서 톡', failHint: '섬 그늘에 숨은 오리는 섬을 돌아가는 물결로 꺼내요',
    // D011 📐 재설계: 무리 셋(왼쪽 위 섬 · 오른쪽 아래 섬 · 섬 사이 가운데 둘), 황금은 가운데 무리 옆 — 캐주얼 5톡 · 숙련 3톡 · par 4 (n300: ★톡 .31 · ★황금 .71 · 별 2.02 · 21.4초 · K1 .28 · D1 2 — 📐 plan11 하네스, funqa 런과 같은 난수)
    ducks: [[0.32, 0.26, 0], [0.3, 0.58, 0], [0.14, 0.4, 0], [0.7, 0.62, 0], [0.68, 0.94, 0], [0.86, 0.8, 0], [0.5, 0.5, 0], [0.5, 0.74, 0]], gold: [0.4, 0.62],
    islands: [[0.3, 0.4, 0.09], [0.7, 0.8, 0.09]],
    nests: [[0.12, 0.12, 0.17, -1], [0.88, 0.12, 0.17, -1], [0.12, 1.08, 0.17, -1], [0.88, 1.08, 0.17, -1], [0.08, 0.6, 0.12, -1, 0, 1], [0.92, 0.6, 0.12, -1, 0, 1]],
    taps: 11, par: 4, ask: '섬이 둘 — 숨은 오리를 누구부터 꺼낼까?',
  },
  {
    id: '1-5', key: '', news: '', hint: '배수구 쪽에서 치면 밖으로 — 섬 그늘도 써 봐요', failHint: '섬 뒤 배수구 — 오리를 배수구 쪽으로 미는 톡은 피해요',
    // 섬이 배수구 위를 가린다. 오리 여섯이 배수구를 둘러싸고, 황금은 왼쪽 위 구석 가까이(입성 거리 r + 0.03에서 0.08 떨어뜨림 — 흔들기로 저절로 들지 않게)
    ducks: [[0.5, 0.3, 0], [0.28, 0.62, 0], [0.72, 0.62, 0], [0.3, 0.92, 0], [0.7, 0.92, 0], [0.5, 0.87, 0]], gold: [0.38, 0.86], // D010 (🧪 D009 5.1): 황금 (0.26, 0.36) → (0.38, 0.86) — 왼쪽 위 구석 둥지 옆이라 공짜(.97) → .64 · K1 .17
    // D017 📐 고치기: 맨 아래 오리 (0.5, 0.98) → (0.5, 0.87) — 숙련 톡이 4로 굳어 D1 몫 .72 → .600
    islands: [[0.5, 0.5, 0.09]], drains: [[0.5, 0.72]], pullR: 0.12, pull: 0.00012,
    nests: [[0.12, 0.12, 0.17, -1], [0.88, 0.12, 0.17, -1], [0.12, 1.08, 0.17, -1], [0.88, 1.08, 0.17, -1]],
    taps: 9, par: 4, ask: '섬이 배수구를 가려요. 어디서 쳐야 안 빨릴까?', // D009: 톡 11 → 9 — 무작위 봇이 새 판에서 별을 모아 '잘하는 사람이 확실히 더 높다'(3×)가 깨짐
  },
  {
    id: '1-6', key: '', news: '', hint: '두 배수구 사이 틈으로 — 가운데 오리는 위나 아래로', failHint: '배수구 둘 사이에서는 위·아래로만 밀어요',
    // 배수구 둘이 가운데 줄을 막는다. 가운데 세 마리는 위·아래 틈으로, 양옆 둘은 벽 쪽으로
    ducks: [[0.5, 0.6, 0], [0.5, 0.42, 0], [0.5, 0.8, 0], [0.16, 0.6, 0], [0.84, 0.6, 0]], gold: [0.5, 0.25],
    drains: [[0.3, 0.6], [0.7, 0.6]], pullR: 0.11, pull: 0.00012,
    nests: [[0.2, 0.1, 0.16, -1], [0.8, 0.1, 0.16, -1], [0.2, 1.1, 0.16, -1], [0.8, 1.1, 0.16, -1]],
    taps: 9, par: 5, ask: '배수구가 둘! 오리를 어느 틈으로 빼낼까?', // D009: 톡 10 → 9 (같은 이유)
  },
  // D011 📐 1욕실 완성: 1-7 벽 물결(소개) · 1-8 벽+섬 · 1-9 벽+배수구 · 1-10 큰 판. 값은 📐 plan11 하네스(funqa 런과 같은 (시드, 판 id) 난수) n300 — funqa로 다시 잼
  {
    id: '1-7', key: 'wallpull', news: '🧱 벽에 붙은 오리는 앞에서 톡 — 끌려 나와요', hint: '벽에 붙은 오리는 오리 앞을 톡 — 되돌아온 물결이 끌어내요', failHint: '벽과 오리 사이는 좁아요 — 오리 앞쪽을 톡',
    // 벽 물결 소개: 왼벽·뒷벽·오른벽에 붙은 오리 셋(거울 아님) + 떠 있는 하나. 오리 앞 둥지(끌어오기) / 구석 둥지(벽 따라 밀기). key 'wall'은 반사 알림과 겹쳐 'wallpull'
    ducks: [[0.045, 0.56, 0], [0.66, 0.045, 0], [0.4, 0.62, 0], [0.955, 0.86, 0]], gold: [0.72, 0.56],
    nests: [[0.12, 1.08, 0.15, -1, 0, 1], [0.3, 0.88, 0.12, -1], [0.88, 0.12, 0.15, -1, 0, 1], [0.62, 0.36, 0.12, -1], [0.88, 1.08, 0.15, -1, 0, 1]],
    taps: 10, par: 3, ask: '벽에 딱 붙은 오리, 어떻게 떼어 낼까?',
  },
  {
    id: '1-8', key: '', news: '', hint: '섬 뒤 벽 오리는 비스듬히 — 섬을 비켜 벽에 맞힌 물결이 끌어내요', failHint: '섬 정면에서 치면 그늘이라 안 닿아요 — 옆으로 비켜서 톡',
    // 벽+섬 무리 셋(왼벽·뒷벽·오른벽, 섬이 정면을 가림) + 떠 있는 둘. 둥지는 오리 앞 비스듬히 · 아래 구석
    ducks: [[0.045, 0.4, 0], [0.4, 0.5, 0], [0.68, 0.045, 0], [0.5, 0.32, 0], [0.62, 0.9, 0], [0.955, 0.74, 0]], gold: [0.6, 0.62], // D017 📐 고치기: 왼쪽 떠 있는 오리를 둥지에서 뗌(숙련 지름길 끊기 → E2 1) · 오른쪽 안 둥지 r .11 → .105(D1 몫 .61 → .56)
    islands: [[0.19, 0.4, 0.08], [0.68, 0.19, 0.08], [0.81, 0.74, 0.08]],
    nests: [[0.27, 0.76, 0.11, -1], [0.9, 0.34, 0.105, -1], [0.12, 1.08, 0.15, -1, 0, 1], [0.88, 1.08, 0.15, -1, 0, 1]],
    taps: 14, par: 6, ask: '섬 뒤 벽에 붙은 오리 — 물결이 닿을 길은?',
  },
  {
    id: '1-9', key: '', news: '', hint: '벽 오리는 앞에서 끌어내요 — 배수구 쪽에서 치면 배수구 반대로 밀려요', failHint: '배수구 반대쪽에서 치면 쭈욱 — 배수구 쪽에서 톡',
    // 왼벽·뒷벽 오리가 가장 가까운 구석 둥지로 벽 따라 가면 배수구 위를 지난다(캐주얼 덫) → 끌어내 아래·오른쪽 둥지로
    ducks: [[0.045, 0.58, 0], [0.5, 0.045, 0], [0.56, 0.62, 0], [0.42, 1.155, 0]], gold: [0.74, 0.86],
    drains: [[0.1, 0.32], [0.3, 0.16]], pullR: 0.12, pull: 0.00012,
    nests: [[0.12, 0.12, 0.13, -1, 0, 1], [0.2, 1.04, 0.13, -1], [0.9, 0.4, 0.12, -1], [0.88, 1.08, 0.15, -1, 0, 1]],
    taps: 12, par: 5, ask: '벽에 붙은 오리 옆에 배수구! 쏙 없이 꺼내려면?',
  },
  {
    id: '1-10', key: '', news: '', hint: '무리마다 따로 — 벽 오리는 앞에서, 배수구는 배수구 쪽에서', failHint: '한 무리씩 끝내요 — 배수구 쪽으로 미는 톡은 피해요',
    // 무리 셋: 왼벽+섬 / 뒷벽+배수구(+둘) / 오른벽+앞 배수구(+둘), 가운데 섬이 무리를 가른다. 둥지는 구석 셋뿐. 오리 8이라 질문을 '여덟'로(CONTENT 표는 '일곱')
    ducks: [[0.045, 0.56, 0], [0.3, 0.8, 0], [0.56, 0.045, 0], [0.72, 0.3, 0], [0.955, 0.7, 0], [0.56, 0.98, 0], [0.72, 0.8, 0], [0.26, 0.3, 0]], gold: [0.4, 0.42],
    islands: [[0.19, 0.56, 0.08], [0.5, 0.56, 0.09]], drains: [[0.36, 0.1], [0.82, 0.98]], pullR: 0.12, pull: 0.00012,
    nests: [[0.12, 0.12, 0.12, -1, 0, 1], [0.88, 0.12, 0.12, -1, 0, 1], [0.12, 1.08, 0.12, -1, 0, 1]],
    taps: 20, par: 8, ask: '우리 집 욕실 대청소 — 여덟 마리 다!',
  },
  {
    id: '2-1', key: 'color', news: '🎨 색깔 둥지 — 같은 색 오리만 들어가요', hint: '오리는 톡 반대쪽으로 밀려요 — 같은 색 둥지 쪽으로!',
    // D003 CONTENT v0.2: '오리 바로 뒤를 톡'을 가르치는 판. 노랑은 위·분홍은 아래로 엇갈려 세운다 — 가운데 톡이면 둘 다 위아래 벽으로 가서 0마리.
    // 큰 둥지는 제 벽 가운데, 작은 구석 둥지는 반대 색(틀린 벽에 붙어도 구석으로 미끄러져 빠져나온다)
    // D008 CONTENT v0.3 §4 ①: 엇갈린 짝 하나 더(위 분홍·아래 노랑) · 톡 8 → 12 · par 2 그대로(P1: 캐주얼 ★톡 .50)
    ducks: [[0.46, 0.4, 0], [0.54, 0.8, 1], [0.46, 0.2, 1], [0.54, 1.0, 0]], gold: [0.5, 0.6],
    nests: [[0.12, 0.6, 0.3, 0], [0.88, 0.6, 0.3, 1], [0.12, 0.08, 0.18, 1, 0, 1], [0.12, 1.12, 0.18, 1, 0, 1], [0.88, 0.08, 0.18, 0, 0, 1], [0.88, 1.12, 0.18, 0, 0, 1]],
    taps: 12, par: 2, ask: '노랑은 노랑 둥지로! 어디를 톡 해야 할까?',
  },
  // D012 📐 2욕실 새 판(시간 상자 25분, plan12 하네스 = funqa 런과 같은 난수): 2-2 조합 · 2-3 배 소개 · 2-5 비누 소개 — 배·비누 소개를 2-4·2-9에서 옮겨 옴
  {
    id: '2-2', key: '', news: '', hint: '섬 뒤 오리는 물결이 안 닿아요 — 하나만 골라 밀어요', failHint: '틀린 색 둥지 쪽으로 밀리면 구석 둥지로 빼요',
    // 위아래 색 둥지 + 가운데 섬, 엇갈린 짝 둘(왼 위 분홍·오른 위 노랑). D013 (📋 D012 ②): par 5 ★톡이 시드 계열 1000·5000·9000에서 .30·.29·.30(합 .297 < .3) →
    // 📐 D012 예비안 — 다섯째 오리를 섬 아래 (0.5, 0.82)로, 황금을 왼벽 (0.14, 0.6)으로, par 6 (n100 ★톡 .35 · E2 1)
    ducks: [[0.3, 0.5, 1], [0.3, 0.7, 0], [0.7, 0.5, 0], [0.7, 0.7, 1], [0.5, 0.82, 0]], gold: [0.14, 0.6],
    islands: [[0.5, 0.6, 0.09]],
    nests: [[0.5, 0.08, 0.18, 0], [0.5, 1.12, 0.18, 1], [0.08, 0.08, 0.13, 1, 0, 1], [0.92, 1.12, 0.13, 0, 0, 1]],
    taps: 12, par: 6, ask: '노랑 셋 분홍 둘이 뒤섞였어요 — 누구부터 가를까?',
  },
  {
    id: '2-3', key: 'boat', news: '⛵ 장난감 배는 무거워요 — 부두에 넣어요', hint: '배는 무거워요 — 바로 옆을 쳐야 움직여요', failHint: '배는 바로 옆에서 — 멀리서 치면 꿈쩍도 안 해요',
    // 배 혼자 왼쪽 위, 큰 부두(r .22) 오른쪽 아래 — 배를 부두에 넣어야 클리어 (n300 P1 par 6)
    ducks: [], gold: [0.72, 0.42], boat: [0.24, 0.2],
    nests: [[0.88, 0.12, 0.15, -1], [0.1, 0.72, 0.15, -1], [0.6, 1.06, 0.22, -1, 1]],
    taps: 14, par: 6, ask: '배는 무거워요 — 부두까지 몇 번이면 될까?',
  },
  {
    id: '2-4', key: '', news: '', // D012: 배 소개는 2-3으로
    hint: '배는 무거워요 — 바로 옆을 쳐야 움직여요',
    ducks: [[0.25, 0.5, 0], [0.75, 0.5, 0], [0.5, 0.28, 0]], gold: [0.24, 0.92],
    boat: [0.5, 0.72],
    nests: [[0.13, 0.13, 0.14, -1], [0.87, 0.13, 0.14, -1], [0.12, 1.07, 0.13, -1], [0.5, 1.1, 0.12, -1, 1]],
    taps: 12, par: 4, ask: '배와 오리 셋 — 배가 길을 막아요', // D003 CONTENT v0.2: 톡 7→12 (배우는 처음 봇 첫 시도 0.2→0.4, 여유 꺾임 완화)
  },
  {
    id: '2-5', key: 'slick', news: '🧼 비누 미끄럼 — 밀리면 훨씬 멀리 미끄러져요', hint: '비누 위의 오리는 살살 — 멀리서 쳐요', failHint: '비누 위에서 세게 밀면 둥지를 지나쳐요 — 멀리서 살살',
    // 오리 여섯이 모두 큰 비누(r .3) 위에서 시작, 둥지는 마주 보는 구석 둘 (n300 P1 par 6, E2 2 = 천장 빚)
    ducks: [[0.3, 0.6, 0], [0.7, 0.6, 0], [0.5, 0.42, 0], [0.5, 0.8, 0], [0.4, 0.84, 0], [0.6, 0.36, 0]], gold: [0.5, 1.02],
    slicks: [[0.5, 0.6, 0.3]],
    nests: [[0.12, 0.12, 0.14, -1], [0.88, 1.08, 0.14, -1]],
    taps: 12, par: 6, ask: '비누 위 오리는 쭉~ 얼마나 세게 쳐야 할까?',
  },
  {
    id: '2-6', key: '', news: '', hint: '배는 바로 옆에서, 비누 오리는 멀리서 살살', failHint: '배는 바로 옆을 쳐야 움직여요 — 멀리서 친 물결엔 비누 오리만 쭉',
    // D013 📐 꿈쩍과 쭉: 비누(r .22) 위 오리 셋 + 비누 밖 배. 배와 비누 오리 사이를 톡하면 배는 조금, 비누 오리는 쭉 — 첫 톡 무리 셋(비누 쪽 · 배-비누 사이 · 배 오른쪽)
    ducks: [[0.4, 0.42, 0], [0.4, 0.62, 0], [0.24, 0.52, 0]], gold: [0.76, 0.3], boat: [0.62, 0.48],
    slicks: [[0.36, 0.52, 0.22]],
    nests: [[0.12, 0.12, 0.15, -1], [0.12, 1.08, 0.15, -1], [0.88, 0.12, 0.15, -1], [0.7, 1.06, 0.2, -1, 1]],
    taps: 12, par: 5, ask: '배는 꿈쩍, 비누 오리는 쭉 — 한 물결에 둘 다?',
  },
  {
    id: '2-7', key: 'sleepy', news: '💤 잠꾸러기는 처음 물결엔 깨기만 해요 — 깬 뒤엔 보통 오리', hint: '💤 잠꾸러기는 첫 물결엔 깨기만 — 벽에서 되돌아온 물결부터 밀려요', failHint: '자는 오리는 처음 물결엔 안 밀려요 — 되돌아온 물결이나 다음 톡에 밀려요',
    // D014 📐 💤 소개 재배치(🧪 D013 부분 차단): 2-8 구조를 색 없이 줄임 — 💤는 왼쪽 아래 구석(위 짝 톡의 0.7 밖)이라 위 짝 톡으론 안 깨고, 가운데 오리를 넣는 톡으로 함께 깨운 뒤 다음 톡에 넣는다
    ducks: [[0.22, 1.04, 0, 1], [0.42, 0.74, 0], [0.66, 0.3, 0]], gold: [0.42, 0.3],
    nests: [[0.1, 0.42, 0.23, -1], [0.86, 0.96, 0.26, -1], [0.92, 0.1, 0.13, -1], [0.08, 0.08, 0.13, -1]],
    taps: 10, par: 3, ask: '쿨쿨 잠꾸러기 — 물결이 몇 번 닿아야 움직일까?', // 🧪 D014 보완 1: '언제 깨울까'는 이 판에 없는 결정이라 규칙형 질문으로
  },
  {
    id: '2-8', key: '', news: '', hint: '잠꾸러기는 처음 물결엔 꿈쩍 안 해요 — 그 틈을 써요', failHint: '깬 분홍이는 이제 밀려요 — 노랑 둥지 쪽으로 밀리지 않게',
    // D013 📐 쿨쿨 분홍이: 💤 분홍이는 왼쪽 아래 구석이라 위 무리 톡(0.7 밖)으로는 안 깬다. 분홍이를 깨우는 톡으로 노랑이를 함께 넣는 게 수 (D1 2 · 가장 큰 무리 몫(물 대비) .32 ✓ — 한 무리를 25% 조항으로 2, 🧪 D013)
    ducks: [[0.22, 1.04, 1, 1], [0.42, 0.74, 0], [0.66, 0.3, 0], [0.78, 0.52, 1]], gold: [0.42, 0.3],
    nests: [[0.1, 0.42, 0.2, 0], [0.86, 0.96, 0.23, 1], [0.92, 0.1, 0.13, 1, 0, 1], [0.08, 0.08, 0.13, 0, 0, 1]],
    taps: 12, par: 5, ask: '잠꾸러기 분홍이 깨는 사이에 노랑이는?',
  },
  {
    id: '2-9', key: '', news: '', // D012: 비누 소개는 2-5로
    hint: '비누 위의 오리는 살살 — 멀리서 쳐요',
    ducks: [[0.3, 0.56, 0], [0.68, 0.78, 0], [0.64, 0.42, 1], [0.36, 0.86, 1]], gold: [0.5, 0.62],
    slicks: [[0.5, 0.62, 0.21]],
    islands: [[0.86, 0.6, 0.08]],
    // D008 CONTENT v0.3 §4 ② 안 A: 배수구를 뒷벽 구석 (0.14, 0.22) → (0.08, 0.10), 끌림 0.17 → 0.12 — 비누에서 미끄러진 오리가 뒷벽을 따라 빨려 들던 길을 막는다
    drains: [[0.08, 0.10]], pullR: 0.12,
    nests: [[0.12, 1.07, 0.13, 0], [0.88, 0.13, 0.13, 1]],
    taps: 12, par: 8, ask: '미끄러운 비누판 — 배수구를 피해 색깔대로!', // D003: 톡 9→10 · par 6→8 (FUN E6) · D004: 톡 10→12 (🧪 여유 비율 r 2.0, 배우는 봇 C5 — 톡은 12가 상한, 배수구 이동은 M2)
  },
  {
    id: '2-10', key: '', news: '', hint: '색깔 둥지 · 배 · 비누 · 잠꾸러기 — 한 무리씩', failHint: '배는 바로 옆에서, 비누 오리는 살살, 잠꾸러기는 깨우는 김에',
    // D014 📐 2욕실 큰 판: 위는 엇갈린 색 짝(노랑 오른쪽·분홍 왼쪽 → 벽 쪽에서 톡), 가운데는 비누 노랑·분홍·배·황금, 왼쪽 아래 💤 — 💤 끔 판보다 숙련 톡 +.55
    ducks: [[0.62, 0.3, 0], [0.38, 0.3, 1], [0.74, 0.6, 0], [0.28, 0.62, 1], [0.28, 0.94, 0, 1], [0.5, 0.5, 0]], gold: [0.62, 0.66], boat: [0.5, 0.8],
    slicks: [[0.76, 0.6, 0.13]],
    nests: [[0.1, 0.1, 0.17, 0], [0.9, 0.1, 0.17, 1], [0.08, 0.62, 0.13, -1], [0.93, 0.62, 0.12, -1], [0.1, 1.1, 0.15, -1, 0, 1], [0.5, 1.08, 0.2, -1, 1]],
    taps: 14, par: 5, ask: '할머니 댁 대목욕 — 다 같이 둥지로!',
  },
  {
    id: '3-1', key: 'shark', news: '🦈 고무 상어가 오리를 노려요! 물결로 밀어요', hint: '상어가 다가오면 물결로 밀어내요 (맞으면 잠깐 멈춰요)', failHint: '상어와 가까운 오리부터 — 물결이 닿으면 상어가 잠깐 멈춰요',
    // D014 📐 상어 소개(key를 3-2에서 옮김): 두 오리를 0.72 떼고 상어는 오른쪽 오리 옆(.27)·왼쪽 오리에서 .82 — 왼쪽부터 치면 상어가 안 멈춰 오른쪽이 꿀꺽, 둥지는 아래뿐이라 수도꼭지 뿅이 지름길이 아님
    ducks: [[0.14, 0.38, 0], [0.86, 0.46, 0]], gold: [0.5, 0.7], shark: [0.94, 0.23],
    nests: [[0.12, 1.08, 0.17, -1], [0.88, 1.08, 0.17, -1]],
    taps: 12, par: 4, ask: '고무 상어가 슬금슬금 — 둘 다 지켜라!',
  },
  {
    id: '3-2', key: '', news: '', // D014: 상어 소개는 3-1로
    hint: '상어가 다가오면 물결로 밀어내요 (맞으면 잠깐 멈춰요)',
    ducks: [[0.22, 0.66, 0], [0.78, 0.66, 0], [0.5, 0.38, 0]], gold: [0.5, 0.6],
    shark: [0.5, 0.88],
    nests: [[0.13, 0.13, 0.14, -1], [0.87, 0.13, 0.14, -1]],
    taps: 7, par: 5, ask: '상어 하나, 오리 셋 — 누구부터 피난?', // D003: par 3→5 (FUN E6) · D004: 5→4를 시도했으나 판정 캐주얼(황금 50%, FUN v1.3)로 ★톡 .22 < .30 → PM 규칙대로 5로 되돌림, E2 2는 천장 빚
  },
  {
    id: '3-3', key: 'stream', news: '🚰 수도꼭지 물줄기 — 태우면 저절로 실려 가요', hint: '물줄기에 밀어 넣으면 둥지까지 흘러가요', failHint: '물줄기를 건너는 동안 아래로 떠내려가요 — 더 위에서 비스듬히',
    // D015 📐 🚰 소개(key를 3-4에서 옮김): 줄기는 위→아래 벽(끝에 둥지 없음), 둥지는 건너편 위·아래 — 곧장 밀면 떠내려가 아래 벽에 갇히고, 위쪽에서 태우면 아래 둥지 쪽으로 실림
    ducks: [[0.16, 0.3, 0], [0.18, 0.82, 0]], gold: [0.25, 0.56], streams: [[0.41, 0, 0.59, 1.2, 0, 1]],
    nests: [[0.86, 0.26, 0.16, -1], [0.86, 0.86, 0.16, -1]],
    taps: 8, par: 4, ask: '물줄기를 건너야 둥지 — 어디서 쳐야 덜 떠내려갈까?',
  },
  {
    id: '3-4', key: '', news: '', // D015: 물줄기 소개는 3-3으로
    hint: '물줄기에 밀어 넣으면 둥지까지 흘러가요',
    // D009 (🧪 D008 4.3): 황금 첫 자리 (0.82, 0.2) → (0.66, 0.3) — 하나뿐인 둥지에서 가장 먼 구석이라 늘 꼴찌가 되던 자리 (캐주얼 ★황금 판 하나 .32 → .69)
    ducks: [[0.2, 0.26, 0], [0.8, 0.5, 0], [0.22, 0.76, 0]], gold: [0.66, 0.3],
    streams: [[0.4, 0, 0.6, 0.95, 0, 1]],
    drains: [[0.86, 1.02]],
    nests: [[0.5, 1.07, 0.13, -1]],
    taps: 6, par: 4, ask: '물줄기 옆 배수구 조심 — 황금이까지 다 태워 보내기!', // D003: par 3→4 (FUN E6)
  },
  {
    id: '3-5', key: 'balloon', news: '🎈 물풍선 — 물결이 닿으면 팡! 한 번 더 찰박', hint: '오리가 풍선을 지나간 뒤에 팡 — 오리 뒤에서 터지면 한 번 더 밀어요', failHint: '오리가 풍선보다 위에 있을 때 터지면 되밀려요',
    // D015 📐 🎈 소개: 풍선은 왼쪽 오리 길목(첫 톡 자리에서 .7 밖) — 지나간 뒤 터지면 한 번 더 밀고, 위에 있을 때 터지면 되밂
    ducks: [[0.3, 0.12, 0], [0.75, 0.2, 0]], gold: [0.5, 0.45], balloons: [[0.42, 0.85]],
    nests: [[0.16, 1.07, 0.15, -1], [0.86, 1.07, 0.15, -1]],
    taps: 8, par: 5, ask: '풍선은 언제 터뜨릴까?',
  },
  {
    id: '3-6', key: '', news: '', hint: '풍선 물결은 상어도 오리도 밀어요 — 터질 자리를 보고 쳐요', failHint: '아래 풍선이 터지면 상어가 위로 밀려와요',
    // D015 📐 3-2 꼴 + 풍선 둘: 위(.5,.2)는 둥지 사이, 아래(.5,1.15)는 상어 뒤 .27 — 터지면 상어가 오리 쪽으로 밀림, 🎈 끔보다 숙련 톡 +.28
    // (🎈 배치 주의 ✗: 위 풍선이 첫 톡에 늘 터짐 — 📐 가장 가까운 안, D015 공개)
    ducks: [[0.22, 0.66, 0], [0.78, 0.66, 0], [0.5, 0.38, 0]], gold: [0.5, 0.6], shark: [0.5, 0.88], balloons: [[0.5, 0.2], [0.5, 1.15]],
    nests: [[0.13, 0.13, 0.14, -1], [0.87, 0.13, 0.14, -1]],
    taps: 12, par: 5, ask: '상어 뒤 풍선 — 터지면 누가 밀릴까?',
  },
  {
    id: '3-7', key: 'chicks', news: '🐥 아기 오리는 물결에 안 밀려요 — 앞 오리를 졸졸 따라가요', hint: '아기 줄이 엉키지 않게 — 한 가족씩 차례로 둥지로', failHint: '아기들은 앞 오리가 끌고 가요 — 한 가족씩 둥지로',
    // D016 📐 🐥 소개: 두 앞 오리의 아기 줄이 안쪽(가운데)으로 나 있다. 곧장 밀면 줄이 남의 물결 길을 막는다. 🐥 끔보다 숙련 톡 −1, 캐주얼 +.2 (Δ +1.21)
    ducks: [[0.22, 0.3, 0], [0.78, 0.3, 0]], chicks: [[0, 3, 1, 0], [1, 3, -1, 0]], gold: [0.5, 0.75],
    nests: [[0.14, 1.07, 0.15, -1], [0.86, 1.07, 0.15, -1]],
    taps: 10, par: 5, ask: '앞 오리만 밀면 아기들이 졸졸 — 어느 길로?',
  },
  {
    id: '3-8', key: '', news: '', hint: '물줄기를 건너는 동안 아기들이 떠내려가요 — 줄을 짧게 건너요', failHint: '물줄기 안에서 아기 줄이 꺾쇠 쪽으로 쓸려요 — 앞 오리를 빨리 건네요',
    // D016 📐 3-7 꼴 + 가로 물줄기(오른 벽으로 흐름, 하류 = 벽, 둥지 아님) · 아기 2마리씩(꼬리 .12 ≤ 줄기 폭 .14) (Δ +.95)
    ducks: [[0.22, 0.3, 0], [0.78, 0.3, 0]], chicks: [[0, 2, 1, 0], [1, 2, -1, 0]], gold: [0.5, 0.8], streams: [[0, 0.6, 1, 0.74, 1, 0]],
    nests: [[0.14, 1.07, 0.15, -1], [0.86, 1.07, 0.15, -1]],
    taps: 10, par: 5, ask: '아기 줄을 끌고 물줄기 건너기 — 어디서 칠까?',
  },
  {
    id: '3-9', key: '', news: '', hint: '상어가 둘 — 풍선 물결로 먼 상어를 밀어내요', failHint: '풍선이 터지면 상어도 밀려와요 — 오리를 먼저 위로',
    // D016 📐 상어는 아래 양 구석에 하나씩, 풍선은 왼아래 구석·오른위 구석(서로 1.4 떨어짐), 황금은 위 가운데 (배치 주의 ②는 경계: 숙련은 첫 톡에 풍선 하나를 늘 터뜨림)
    ducks: [[0.22, 0.62, 0], [0.78, 0.62, 0], [0.5, 0.36, 0]], gold: [0.5, 0.2], sharks: [[0.12, 1.0], [0.88, 1.0]], balloons: [[0.06, 1.15], [0.97, 0.04]],
    nests: [[0.13, 0.13, 0.14, -1], [0.87, 0.13, 0.14, -1]],
    taps: 12, par: 4, ask: '상어 둘, 풍선 둘 — 무엇부터 터뜨릴까?',
  },
  {
    id: '3-10', key: '', news: '', hint: '상어는 물결로 멈추고, 풍선은 오리 뒤에서 터뜨려요 — 아기는 앞 오리가 끌고 가요', failHint: '상어와 가까운 오리부터 — 풍선이 터지면 상어도 밀려와요',
    // D017 📐 3욕실 큰 판(r, 가장 가까운 안): 3-9 꼴(상어 둘은 아래 안쪽, 둥지는 위 구석) + 벽 옆 오리 둘 + 가운데 오리 뒤 🐥 둘(옆줄) + 🚰 가로 줄기(왼벽으로, 하류는 벽) + 🎈 아래 가운데 + 황금은 상어 사이 미끼
    // 요소 끔 Δ 🦈 +.62 · 🚰 +.33 · 🎈 +.30 (v1.16 d ✓) · E2 중앙 2(평균 1.58) — 3욕실 천장 빚 2/2(🧪 D017 정정: 3-6은 3톡 .29 < .35라 빚 아님 → 3-2·3-10, 예산 0)
    ducks: [[0.22, 0.62, 0], [0.78, 0.62, 0], [0.5, 0.32, 0], [0.06, 0.4, 0], [0.94, 0.4, 0]], chicks: [[2, 2, 1, 0]], gold: [0.5, 0.58],
    sharks: [[0.14, 0.94], [0.86, 0.94]], balloons: [[0.5, 1.15]], streams: [[0, 0.44, 1, 0.52, -1, 0]],
    nests: [[0.13, 0.13, 0.14, -1], [0.87, 0.13, 0.14, -1]],
    taps: 14, par: 6, ask: '놀이 욕조 대소동 — 다 모여라!',
  },
];
export const STAGE_COUNT = STAGES.length;

interface Obj {
  k: number; col: number; x: number; y: number; vx: number; vy: number;
  /** 판 시작 자리 (뿅 재등장 겹침 예외용, CONTENT §0) */
  sx: number; sy: number;
  /** FREE 떠 있음 · 0 이상 들어간 둥지 · SUCKED 배수구 · EATEN 상어 */
  st: number;
  hitT: number; hitR: number; stun: number; ord: number;
  /** D013 💤 잠꾸러기 (CONTENT §2): 1 = 자는 중 — 처음 맞은 물결엔 깨기만, 자는 동안 꼼짝 안 함 */
  zz: number;
  /** D016 🐥 아기 오리면 따라가는 앞 것(objs 번호), 아니면 −1 — 물결에 안 밀리고 졸졸 */
  lead: number;
  // 연출 (시뮬레이션 결과와 무관)
  face: number; spin: number; mood: number; moodT: number;
}
interface Ring { id: number; x: number; y: number; r: number; hit: number[] }
interface Nest { x: number; y: number; r: number; col: number; dock: boolean; mom: boolean }
interface Circle { x: number; y: number; r: number }
interface Stream { x0: number; y0: number; x1: number; y1: number; dx: number; dy: number }
interface Drain { x: number; y: number; r: number; pr: number; pw: number }
interface Layout { nests: Nest[]; islands: Circle[]; drains: Drain[]; streams: Stream[]; slicks: Circle[]; balloons: { x: number; y: number }[] }
/** pen = 이번 판에서 쏙·꿀꺽으로 재등장한 횟수 (= 잃은 톡 수, CONTENT §0) */
/** popped: 🎈 터진 풍선 비트 (미리 보기·봇 복제가 같이 가져간다) */
interface Sim { pen: number; t: number; objs: Obj[]; rings: Ring[]; rid: number; awake: boolean; L: Layout; popped: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string }

export interface DuckState extends Sim {
  rng: Rng; seed: number; stage: number; phase: 'play' | 'result'; pt: number;
  jit: { flip: boolean; j: number[] }[];
  taps: number; used: number; lastTap: number; penA: number; sucks: number; chomps: number; stageTries: number; stars: number; got: number; starOk: boolean[]; pts: number;
  ok: boolean; why: string; down: boolean; aim: { x: number; y: number } | null;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null;
  /** D004: 브라우저는 결과·실패 카드에서 버튼을 기다린다(봇·측정은 false = 예전처럼 저절로 넘어감) */
  manual: boolean;
  /** D004: 판별 최고 별·점수 — 같은 판을 다시 해도 별이 두 번 쌓이지 않는다 */
  best: number[]; bestPts: number[];
  events: Ev[]; dead: boolean; won: boolean; catT: number; tries: number; firstTap: boolean;
  /** D009 (ART 12장): 황금 '꼴찌 위기'가 켜진 틱 (-1 = 꺼짐) — 연출 전용 */
  crisisT: number; again: boolean;
}

const ev = (s: DuckState, kind: string, x: number, y: number, text?: string, col?: string) => s.events.push({ t: s.t, kind, x, y, text, col });
function see(s: DuckState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}

// ───────── 화면 배치 (가로 0~1, 세로 0~A) — 앞에서 비스듬히 내려다본 욕조: 뒤(수도꼭지)가 좁고 앞이 넓다 ─────────
const WY0 = 0.36, KY = 0.66, SB = 0.74, SF = 0.88;
const scl = (y: number) => SB + (SF - SB) * (y / H);
const PX = (x: number, y: number) => 0.5 + (x - 0.5) * scl(y);
const PY = (y: number) => WY0 + y * KY;
const WY1 = PY(H);
const BAND = 1.272;
function toPlane(sx: number, sy: number) {
  const y = (sy - WY0) / KY;
  return { x: 0.5 + (sx - 0.5) / scl(y), y };
}
const inWater = (x: number, y: number, m = 0) => x >= m && x <= W - m && y >= m && y <= H - m;

// ───────────────────────────── 시뮬레이션 ─────────────────────────────
const mk = (k: number, col: number, x: number, y: number): Obj => ({ sx: x, sy: y, k, col, x, y, vx: 0, vy: 0, st: FREE, hitT: -99, hitR: -1, stun: 0, ord: 0, zz: 0, lead: -1, face: x < 0.5 ? 1 : -1, spin: 0, mood: k === SHARK ? 5 : 0, moodT: 0 });

function fits(o: Obj, n: Nest) {
  if (o.k === BOAT) return n.dock;
  if (o.k === SHARK || n.dock) return false;
  return o.k === GOLD || n.col < 0 || n.col === o.col;
}

function segBlocked(L: Layout, ax: number, ay: number, bx: number, by: number) {
  for (const is of L.islands) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const u = l2 > 0 ? Math.max(0, Math.min(1, ((is.x - ax) * dx + (is.y - ay) * dy) / l2)) : 0;
    const px = ax + dx * u - is.x, py = ay + dy * u - is.y;
    if (px * px + py * py < is.r * is.r) return true;
  }
  return false;
}
/** 물결 그늘: 물결의 출발점 → (벽에 닿은 점 →) 대상 사이에 거품 섬이 있으면 안 닿는다 */
function shadow(L: Layout, gx: number, gy: number, ix: number, iy: number, tx: number, ty: number, im: number) {
  if (im === 0) return segBlocked(L, gx, gy, tx, ty);
  let qx: number, qy: number;
  if (im <= 2) {
    const wx = im === 1 ? 0 : W, u = (wx - ix) / (tx - ix || 1e-9);
    (qx = wx), (qy = iy + (ty - iy) * u);
  } else {
    const wy = im === 3 ? 0 : H, u = (wy - iy) / (ty - iy || 1e-9);
    (qy = wy), (qx = ix + (tx - ix) * u);
  }
  return segBlocked(L, gx, gy, qx, qy) || segBlocked(L, qx, qy, tx, ty);
}
/** 거울 자리: 0 = 진짜 물결, 1 왼벽 · 2 오른벽 · 3 뒷벽 · 4 앞벽 너머 */
const imgX = (g: Ring, im: number) => (im === 1 ? -g.x : im === 2 ? 2 * W - g.x : g.x);
const imgY = (g: Ring, im: number) => (im === 3 ? -g.y : im === 4 ? 2 * H - g.y : g.y);

function splash(S: Sim, x: number, y: number) {
  S.rings.push({ id: S.rid++, x, y, r: 0, hit: [0, 0, 0, 0, 0] });
  S.awake = true;
}

/** 한 틱. E가 있으면(진짜 판) 연출 사건을 남긴다 — 미리 보기·봇의 내다보기는 E 없이 같은 규칙으로 돈다 */
/** 수도꼭지 바로 앞 — 쏙·꿀꺽된 오리가 '뿅!' 하고 다시 나오는 자리 (CONTENT §0) */
export const FAUCET = { x: 0.5, y: 0.06 };
/**
 * D002 (CONTENT §0): 배수구에 빨리거나 상어에게 먹힌 오리·황금 오리·배는 사라지지 않고 수도꼭지에서 '뿅!' 다시 나온다 — 대가는 톡 1개.
 * 수도꼭지 자리가 둥지에 닿거나(공짜 입성)·배수구 끌림 안이거나(다시 쏙)·물줄기 안이면(공짜 운반) 그 오리의 판 시작 자리로.
 */
function respawn(S: Sim, o: Obj, E: DuckState | null) {
  S.pen++;
  let x = FAUCET.x, y = FAUCET.y;
  const bad =
    S.L.nests.some((n) => fits(o, n) && Math.hypot(x - n.x, y - n.y) < n.r + NEST_TOUCH + RAD[o.k]) ||
    S.L.drains.some((d) => Math.hypot(x - d.x, y - d.y) < d.pr) ||
    S.L.streams.some((st) => x > st.x0 && x < st.x1 && y > st.y0 && y < st.y1);
  if (bad) (x = o.sx), (y = o.sy);
  o.x = x;
  o.y = y;
  o.vx = o.vy = 0;
  o.st = FREE;
  o.stun = 0;
  o.zz = 0;
  o.hitT = -99;
  o.hitR = -1;
  if (E) (o.mood = 4), (o.moodT = 70), (o.spin = 6), ev(E, 'pop', x, y, '뿅! 톡 −1');
}

function phys(S: Sim, E: DuckState | null) {
  S.t++;
  const L = S.L, objs = S.objs;
  // 1) 물결 고리: 앞머리가 지나가는 순간 한 번 민다
  for (let ri = S.rings.length - 1; ri >= 0; ri--) {
    const g = S.rings[ri];
    g.r += RS;
    if (g.r >= RMAX) {
      S.rings.splice(ri, 1);
      continue;
    }
    for (let im = 0; im < 5; im++) {
      const ix = imgX(g, im), iy = imgY(g, im);
      for (let i = 0; i < objs.length; i++) {
        const o = objs[i];
        if (o.st !== FREE || o.lead >= 0 || (g.hit[im] >> i) & 1) continue; // 🐥 아기는 고리에 안 밀린다
        const dx = o.x - ix, dy = o.y - iy, d = Math.hypot(dx, dy);
        if (d > g.r || d < g.r - 4 * RS) continue;
        g.hit[im] |= 1 << i;
        if (L.islands.length && shadow(L, g.x, g.y, ix, iy, o.x, o.y, im)) continue;
        if (o.zz) {
          // 💤 처음 맞은 물결엔 깨기만 — 밀지 않는다. 같은 톡의 반사 물결(다른 im)은 깬 뒤라 민다.
          // 🧪 D013: 깨운 물결은 쌍물결 짝으로 치지 않는다(hitT를 찍지 않음 — 규칙 2줄에 없는 ×1.5 덤 방지)
          o.zz = 0;
          if (E) (o.mood = 1), (o.moodT = 40), (o.spin = 1.2), ev(E, 'wake', o.x, o.y, '번쩍! 깼다!');
          continue;
        }
        if (d < 0.02) {
          if (E) (o.mood = 1), (o.moodT = 40), (o.spin = 1), ev(E, 'quack', o.x, o.y, '꽥?!');
          continue;
        }
        let p = PMAX * (1 - d / RMAX) * (im ? REFL : 1) * WEIGHT[o.k];
        const tag = g.id * 8 + im;
        const duo = S.t - o.hitT <= DUO_T && o.hitR !== tag;
        if (duo) p *= DUO;
        o.hitT = S.t;
        o.hitR = tag;
        o.vx += (dx / d) * p * (1 - FR);
        o.vy += (dy / d) * p * (1 - FR);
        if (o.k === SHARK) o.stun = STUN;
        if (E && p > 0.02) {
          o.spin = Math.min(1.4, 0.5 + p * 3);
          o.mood = o.k === SHARK ? 2 : 1;
          o.moodT = o.k === SHARK ? STUN : 34;
          if (dx) o.face = dx > 0 ? 1 : -1;
          if (duo) ev(E, 'duo', o.x, o.y, '쌍물결! ×1.5'), see(E, 'duo', '💥 두 물결이 잇달아 닿으면 1.5배!');
          else if (im) ev(E, 'refl', o.x, o.y, '되돌아온 물결!'), see(E, 'wall', '↩️ 벽에 부딪힌 물결은 되돌아와 또 밀어요');
          else if (o.k === SHARK) ev(E, 'stun', o.x, o.y, '어어? 어질어질~');
          else if (o.k === BOAT) ev(E, 'quack', o.x, o.y, '뿌우~', '#dff4ff');
          else ev(E, 'quack', o.x, o.y, o.k === GOLD ? '꽥! ✨' : '꽥!');
        }
      }
    }
  }
  // 1½) 🎈 물풍선: 진짜 물결(im 0)의 앞머리가 지나가는 틱에 터져 그 자리에서 찰박 (섬 그늘이면 안 터짐 · 한 번만 · 연쇄는 다음 틱부터)
  if (L.balloons.length) {
    const pop: number[] = [];
    for (const g of S.rings)
      L.balloons.forEach((b, j) => {
        if ((S.popped >> j) & 1 || pop.includes(j)) return;
        const d = Math.hypot(b.x - g.x, b.y - g.y);
        if (d > g.r || d < g.r - RS) return;
        if (L.islands.length && shadow(L, g.x, g.y, g.x, g.y, b.x, b.y, 0)) return;
        pop.push(j);
      });
    for (const j of pop) {
      const b = L.balloons[j];
      S.popped |= 1 << j;
      splash(S, b.x, b.y);
      if (E) ev(E, 'balloon', b.x, b.y, '팡! 🎈'), see(E, 'balloon', '🎈 물풍선 — 물결이 닿으면 팡! 한 번 더 찰박');
    }
  }
  // 2) 흐름 · 배수구 · 상어 · 마찰 · 벽 · 섬 · 둥지
  for (let i = 0; i < objs.length; i++) {
    const o = objs[i];
    if (o.st !== FREE || o.zz) continue; // 💤 자는 동안은 흐름·배수구·이동 없이 꼼짝 안 함
    if (o.lead >= 0) {
      // 🐥 앞(오리·아기)과 0.06을 넘게 떨어지면 넘은 만큼 ×0.12씩(틱당 ≤ 0.006) 다가간다. 앞이 둥지에 들었으면 그 둥지 가운데로 따라 들어간다
      const ld = objs[o.lead], tg = ld.st >= 0 ? L.nests[ld.st] : ld, gap = ld.st >= 0 ? 0 : 0.06;
      const dx = tg.x - o.x, dy = tg.y - o.y, d = Math.hypot(dx, dy);
      if (d > gap + 1e-9) {
        const m = Math.min(0.006, (d - gap) * 0.12, d);
        o.x += (dx / d) * m;
        o.y += (dy / d) * m;
      }
      o.vx = o.vy = 0;
    }
    let f = FR;
    for (const sl of L.slicks) if ((o.x - sl.x) ** 2 + (o.y - sl.y) ** 2 < sl.r * sl.r) f = FR_SLICK;
    for (const st of L.streams)
      if (o.x > st.x0 && o.x < st.x1 && o.y > st.y0 && o.y < st.y1) (o.vx += st.dx * STREAM_V * (1 - FR)), (o.vy += st.dy * STREAM_V * (1 - FR));
    for (const dr of L.drains) {
      const dx = dr.x - o.x, dy = dr.y - o.y, d = Math.hypot(dx, dy);
      if (d < SUCK_R) {
        o.vx = o.vy = 0;
        if (E) ev(E, 'suck', dr.x, dr.y, o.k === SHARK ? '상어도 쏙! 🦈' : o.k === GOLD ? '황금 오리 쏙…' : '쭈욱… 쏙!');
        if (o.k === SHARK) o.st = SUCKED; // 상어가 빨리는 건 상 — 벌 없음
        else {
          if (E) E.sucks++;
          respawn(S, o, E);
        }
        break;
      }
      if (d < dr.pr) {
        const a = (dr.pw * (1 - d / dr.pr)) / Math.max(0.6, WEIGHT[o.k]);
        o.vx += (dx / d) * a;
        o.vy += (dy / d) * a;
      }
    }
    if (o.st !== FREE) continue;
    if (o.k === SHARK) {
      if (o.stun > 0) o.stun--;
      else if (S.awake && Math.hypot(o.vx, o.vy) < 0.003) {
        let bj = -1, bd = 9;
        for (let j = 0; j < objs.length; j++) {
          const q = objs[j];
          if (q.st !== FREE || (q.k !== DUCK && q.k !== GOLD)) continue;
          const d = Math.hypot(q.x - o.x, q.y - o.y);
          if (d < bd) (bd = d), (bj = j);
        }
        if (bj >= 0) {
          const q = objs[bj];
          if (bd < CHOMP) {
            o.stun = STUN;
            if (E) (o.mood = 6), (o.moodT = 90), ev(E, 'chomp', q.x, q.y, q.k === GOLD ? '황금 오리 꿀꺽!' : '꿀꺽!'), E.chomps++;
            respawn(S, q, E);
          } else {
            o.x += ((q.x - o.x) / bd) * SHARK_V;
            o.y += ((q.y - o.y) / bd) * SHARK_V;
            if (E) o.face = q.x > o.x ? 1 : -1;
          }
        }
      }
    }
    o.vx *= f;
    o.vy *= f;
    o.x += o.vx;
    o.y += o.vy;
    const rr = rad(o);
    let bonk = 0;
    if (o.x < rr) (o.x = rr), o.vx < 0 && ((bonk = -o.vx), (o.vx = -o.vx * 0.45));
    if (o.x > W - rr) (o.x = W - rr), o.vx > 0 && ((bonk = o.vx), (o.vx = -o.vx * 0.45));
    if (o.y < rr) (o.y = rr), o.vy < 0 && ((bonk = -o.vy), (o.vy = -o.vy * 0.45));
    if (o.y > H - rr) (o.y = H - rr), o.vy > 0 && ((bonk = o.vy), (o.vy = -o.vy * 0.45));
    for (const is of L.islands) {
      const dx = o.x - is.x, dy = o.y - is.y, d = Math.hypot(dx, dy) || 1e-6, m = is.r + rr;
      if (d < m) {
        const nx = dx / d, ny = dy / d, vn = o.vx * nx + o.vy * ny;
        o.x = is.x + nx * m;
        o.y = is.y + ny * m;
        if (vn < 0) (o.vx -= 1.45 * vn * nx), (o.vy -= 1.45 * vn * ny), (bonk = Math.max(bonk, -vn));
      }
    }
    if (E && bonk > 0.006 && o.k !== BOAT) (o.mood = 2), (o.moodT = 70), (o.spin = 1.2), ev(E, 'bonk', o.x, o.y, o.k === SHARK ? '쿵!' : '콩!');
    for (let j = 0; j < L.nests.length; j++) {
      const n = L.nests[j];
      if (!fits(o, n) || (o.x - n.x) ** 2 + (o.y - n.y) ** 2 >= (n.r + NEST_TOUCH) ** 2) continue;
      o.st = j;
      o.vx = o.vy = 0;
      o.ord = S.t;
      if (E) {
        o.mood = 3;
        if (o.k === GOLD) ev(E, 'gold', o.x, o.y, '황금 오리! ★'), see(E, 'gold', '👑 황금 오리가 꼴찌만 아니면 ★');
        else ev(E, 'nest', o.x, o.y, o.k === BOAT ? '부두 도착! ⚓' : ['쏙! 엄마~', '쪼르르~', '도착!'][(S.t + i) % 3]);
        see(E, 'nest', '🫧 둥지에 든 오리는 멈춰서 엄마 옆으로 쪼르르');
      }
      break;
    }
  }
  // 3) 떠 있는 것끼리 부딪힘 (탄성 — 오리가 오리를 밀어 준다)
  for (let i = 0; i < objs.length; i++) {
    const a = objs[i];
    if (a.st !== FREE) continue;
    for (let j = i + 1; j < objs.length; j++) {
      const b = objs[j];
      if (b.st !== FREE) continue;
      if (a.lead === j || b.lead === i) continue; // 🐥 줄(앞 ↔ 바로 뒤 아기)끼리는 서로 밀지 않는다
      const dx = b.x - a.x, dy = b.y - a.y, m = rad(a) + rad(b), d2 = dx * dx + dy * dy;
      if (d2 >= m * m || d2 < 1e-10) continue;
      const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ma = MASS[a.k], mb = MASS[b.k], ov = m - d;
      if (a.zz || b.zz) {
        // 💤 자는 오리는 벽처럼 꼼짝 안 함 — 부딪힌 쪽만 밀려나고 튕긴다
        if (a.zz && b.zz) continue;
        const q = a.zz ? b : a, sg = a.zz ? 1 : -1, rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        q.x += sg * nx * ov;
        q.y += sg * ny * ov;
        if (rv < 0) (q.vx -= sg * 1.8 * rv * nx), (q.vy -= sg * 1.8 * rv * ny); // 무한 질량과 부딪힘 (반발 .8)
        continue;
      }
      a.x -= nx * ov * (mb / (ma + mb));
      a.y -= ny * ov * (mb / (ma + mb));
      b.x += nx * ov * (ma / (ma + mb));
      b.y += ny * ov * (ma / (ma + mb));
      const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rv < 0) {
        const jj = (-1.8 * rv) / (1 / ma + 1 / mb);
        a.vx -= (jj / ma) * nx;
        a.vy -= (jj / ma) * ny;
        b.vx += (jj / mb) * nx;
        b.vy += (jj / mb) * ny;
      }
    }
  }
}

/** 🐥 아기가 아직 걷는 중인가 — 속도 없이 위치만 움직여서 속도로는 못 잰다 (🧪 D016 차단: calm이 걷는 아기를 '잔잔'으로 봄) */
const walking = (S: Sim, o: Obj) => {
  const ld = S.objs[o.lead], tg = ld.st >= 0 ? S.L.nests[ld.st] : ld, gap = ld.st >= 0 ? 0 : 0.06;
  return Math.hypot(tg.x - o.x, tg.y - o.y) > gap + 0.002;
};
const calm = (S: Sim) => S.objs.every((o) => o.st !== FREE || o.k === SHARK || (Math.hypot(o.vx, o.vy) < STOP * 1.5 && !(o.lead >= 0 && walking(S, o))));
/** 판의 결과: 1 = 다 넣음, -1 = 잃음(배수구·상어), 0 = 아직 */
function verdict(S: Sim) {
  let all = true;
  for (const o of S.objs) {
    if (o.k !== DUCK && o.k !== BOAT) continue;
    if (o.st === SUCKED || o.st === EATEN) return -1;
    if (o.st < 0) all = false;
  }
  return all ? 1 : 0;
}

function clone(S: Sim): Sim {
  return { pen: S.pen, t: S.t, objs: S.objs.map((o) => ({ ...o })), rings: S.rings.map((g) => ({ ...g, hit: g.hit.slice() })), rid: S.rid, awake: S.awake, L: S.L, popped: S.popped };
}
/** 미리 보기: 이 자리에 찰박하면 어디로 가나 — 화면과 테스트가 함께 쓴다(🧪 D017 조건부 해제 조건: 미리 보기 경로가 둥지까지) */
export function previewPaths(s: Sim, x: number, y: number) {
  const S = clone(s);
  splash(S, x, y);
  const paths = S.objs.map((o) => ({ k: o.k, col: o.col, pts: [o.x, o.y], end: o.st }));
  for (let k = 0; k < 200; k++) {
    phys(S, null);
    if (k % 3 === 0) S.objs.forEach((o, i) => o.st === FREE && paths[i].pts.push(o.x, o.y));
    if (k > 8 && S.rings.length === 0 && calm(S)) break;
  }
  S.objs.forEach((o, i) => {
    paths[i].end = o.st;
    paths[i].pts.push(o.x, o.y);
  });
  return paths;
}
/** 잔잔해질 때까지(또는 끝날 때까지) 돌린다 */
function run(S: Sim, maxT: number) {
  for (let k = 0; k < maxT; k++) {
    phys(S, null);
    if (verdict(S) !== 0) break;
    if (k > 8 && S.rings.length === 0 && calm(S)) break;
  }
  return S;
}

function slot(n: Nest, k: number) {
  if (n.dock) return { x: n.x, y: n.y };
  if (!n.mom) return { x: n.x + (k ? Math.cos(k * 2.1) * 0.07 : 0), y: n.y + (k ? Math.sin(k * 2.1) * 0.06 : 0) };
  const side = k % 2 ? -1 : 1, row = Math.floor(k / 2);
  return { x: n.x + side * (0.075 + row * 0.05), y: n.y - n.r * 0.32 + row * 0.055 };
}

function newStage(s: DuckState) {
  const d = STAGES[s.stage], jt = s.jit[s.stage];
  const fx = (x: number) => (jt.flip ? W - x : x);
  let ji = 0;
  const J = (a: number) => (jt.j[ji++ % jt.j.length] - 0.5) * 2 * a;
  s.L = {
    nests: d.nests.map(([x, y, r, col, dock, nomom]) => ({ x: fx(x), y, r, col, dock: !!dock, mom: !dock && !nomom })),
    islands: (d.islands ?? []).map(([x, y, r]) => ({ x: fx(x), y, r })),
    drains: (d.drains ?? []).map(([x, y]) => ({ x: fx(x), y, r: SUCK_R, pr: d.pullR ?? PULL_R, pw: d.pull ?? PULL })),
    streams: (d.streams ?? []).map(([x0, y0, x1, y1, dx, dy]) => (jt.flip ? { x0: W - x1, y0, x1: W - x0, y1, dx: -dx, dy } : { x0, y0, x1, y1, dx, dy })),
    slicks: (d.slicks ?? []).map(([x, y, r]) => ({ x: fx(x), y, r })),
    balloons: (d.balloons ?? []).map(([x, y]) => ({ x: fx(x), y })),
  };
  s.popped = 0;
  s.objs = [];
  for (const [x, y, col, zz] of d.ducks) s.objs.push({ ...mk(DUCK, col, fx(x) + J(0.02), y + J(0.02)), zz: zz ? 1 : 0 });
  for (const [li, n, ux = 0, uy = -1] of d.chicks ?? []) {
    const h = Math.hypot(ux, uy) || 1, ax = ((jt.flip ? -ux : ux) / h) * 0.06, ay = (uy / h) * 0.06, front = s.objs[li];
    for (let k = 1, prev = li; k <= n; k++) {
      s.objs.push({ ...mk(DUCK, front.col, front.x + ax * k, front.y + ay * k), lead: prev });
      prev = s.objs.length - 1;
    }
  }
  s.objs.push(mk(GOLD, 0, fx(d.gold[0]) + J(0.02), d.gold[1] + J(0.02)));
  if (d.boat) s.objs.push(mk(BOAT, 0, fx(d.boat[0]), d.boat[1]));
  if (d.shark) s.objs.push(mk(SHARK, 0, fx(d.shark[0]), d.shark[1]));
  for (const [x, y] of d.sharks ?? []) s.objs.push(mk(SHARK, 0, fx(x), y));
  s.rings = [];
  s.awake = false;
  s.taps = d.taps;
  s.used = 0;
  s.lastTap = s.t;
  s.phase = 'play';
  s.pt = 0;
  s.crisisT = -1;
  s.pen = s.penA = s.sucks = s.chomps = 0;
  s.starOk = [false, false, false];
  // 판의 새것은 판 카드 셋째 줄에 바로 보인다 (알림 띠 대기열에는 넣지 않는다)
  if (d.key) s.seen.add(d.key);
}

/**
 * D004 (브라우저 카드 버튼): 결과·실패 카드에서 '다음' 또는 '다시'.
 * 실패 카드의 '다시'와 결과 카드의 '다시'는 같은 판을 처음부터. 마지막 판의 '다음'은 게임 끝(점수 화면).
 */
export function advance(s: DuckState, action: 'next' | 'retry') {
  if (s.phase !== 'result') return;
  if (s.ok && action === 'next') {
    if (s.stage === STAGES.length - 1) return void (s.dead = true);
    s.again = false;
    s.stageTries = 0;
    s.stage++;
  } else {
    s.again = true;
    if (s.ok) s.stageTries = 0; // 🧪 D004: 깬 판을 별 사냥으로 다시 할 때는 ↺2 손가락을 끈다
  }
  newStage(s);
}

const hintMemo = new WeakMap<object, { key: string; p: { x: number; y: number } | null }>();
/**
 * D004 ↺2 손가락 힌트: 같은 판을 두 번 넘게 실패하고 다시 시작했을 때(아직 톡 전) 숙련 봇의 첫 톡 자리.
 * 화면 좌표(캔버스 폭 0~1, 높이 0~1)로 돌려준다. 판·시도마다 한 번만 계산한다.
 */
export function hintPoint(s: DuckState): { x: number; y: number } | null {
  if (s.phase !== 'play' || s.stageTries < 2 || s.used > 0) return null;
  const key = `${s.stage}:${s.tries}`;
  let m = hintMemo.get(s);
  if (!m || m.key !== key) {
    const p = plan(s).p;
    hintMemo.set(s, (m = { key, p: p ? { x: PX(p.x, p.y), y: PY(p.y) / A } : null }));
  }
  return m.p;
}

/**
 * D005 실패 카드 문구 (🧪 D004·D005): 톡을 가져간 주범(쏙·꿀꺽)이 크면(쓴 톡의 25% 이상) 주범 제목,
 * 아니면 '톡 바닥' 제목에 그 판의 hint 줄(판의 교훈). 브라우저 카드와 funqa N4가 같은 함수를 쓴다.
 */
/** 실패 카드 제목 (갈래마다 셋, 같은 판 다시 횟수로 돌림 — D011 N6-a) */
export const FAIL_TITLES = {
  suck: ['꼬르륵~ 톡이 배수구로 샜어요', '쭈욱~ 배수구 미끄럼틀을 또 탔대요', '퐁당! 오리가 배수구 구경 갔어요'],
  chomp: ['냠! 상어 간식인 줄 알았대요', '꿀꺽! 상어가 오리랑 놀고 싶었대요', '앙! 고무 상어가 또 배고팠대요'],
  taps: ['톡이 바닥! 오리들 아직 둥둥~', '톡 다 썼다! 오리들은 아직 수영 중~', '물결이 모자랐어요 — 오리들 둥실둥실'],
};

export function failText(s: DuckState): { kind: 'suck' | 'chomp' | 'taps'; title: string; tip: string } {
  const pen = s.sucks + s.chomps, big = s.used > 0 && pen / s.used >= 0.25; // 🧪 D005: '2톡 이상' 조항은 8판(톡 12)에서 틀린 제목을 만들어 뺐다
  // D011 (N6-a): 같은 판을 거푸 지면 제목을 돌려 쓴다 — 같은 카드가 되풀이되면 웃음이 닳는다(FUN N6). 팁(그 판의 교훈)은 그대로
  // 🧪 D012: 판마다 0으로 돌아가는 다시 횟수 대신 런 전체 실패 수로 — 판마다 첫 실패 제목이 늘 같던 것을 없앤다
  const pick = (xs: string[]) => xs[Math.max(0, s.tries - 1) % xs.length];
  if (big && s.sucks >= s.chomps) return { kind: 'suck', title: pick(FAIL_TITLES.suck), tip: '빙글 원 안으로는 밀지 말기' };
  if (big) return { kind: 'chomp', title: pick(FAIL_TITLES.chomp), tip: '물결을 맞히면 상어가 어질어질' };
  return { kind: 'taps', title: pick(FAIL_TITLES.taps), tip: STAGES[s.stage].failHint ?? STAGES[s.stage].hint };
}

/**
 * D005 👆 미리 계산 (🧪 D004: 첫 프레임 탐색 20~82ms → 폰에서 멈칫): 실패 카드가 떠 있는 동안 부른다.
 * 같은 시드·같은 판은 늘 같은 배치라 새 상태로 판 시작을 만들어 숙련 봇 첫 톡을 구해 두고, 다시 시작한 판의 hintPoint가 그대로 쓴다.
 */
export function precomputeHint(s: DuckState) {
  if (s.phase !== 'result' || s.ok || s.stageTries < 2) return;
  const t = duckbath.create(s.seed);
  startStage(t, s.stage);
  const p = plan(t).p;
  hintMemo.set(s, { key: `${s.stage}:${s.tries}`, p: p ? { x: PX(p.x, p.y), y: PY(p.y) / A } : null });
}

/** 테스트·측정용: i번째 판(0부터)을 처음부터 시작 */
export function startStage(s: DuckState, i: number) {
  s.stage = i;
  s.stageTries = 0;
  s.again = false;
  newStage(s);
}

function tap(s: DuckState, sx: number, sy: number) {
  if (s.phase !== 'play') return;
  const q = toPlane(sx, sy);
  if (!inWater(q.x, q.y, -0.03)) return; // 물 밖에서 떼면 취소
  if (s.taps <= 0) return void ev(s, 'nope', Math.max(0.1, Math.min(0.9, q.x)), Math.max(0.1, Math.min(1.1, q.y)), '톡을 다 썼어요');
  const x = Math.max(0.005, Math.min(W - 0.005, q.x)), y = Math.max(0.005, Math.min(H - 0.005, q.y));
  s.taps--;
  s.used++;
  s.lastTap = s.t;
  s.firstTap = true;
  const sh = s.awake ? undefined : s.objs.find((o) => o.k === SHARK && o.st === FREE);
  if (sh) ev(s, 'pong', sh.x, sh.y, '퐁! 상어 깼다'); // ART 14장 2③: 상어는 물결이 닿을 때가 아니라 톡 한 순간 깬다
  splash(s, x, y);
  ev(s, 'splash', x, y, '찰박!');
  see(s, 'splash', '🌊 물결 고리가 닿은 오리를 바깥쪽으로 밀어요');
}

function endStage(s: DuckState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  const d = STAGES[s.stage];
  if (ok) {
    const gold = s.objs.find((o) => o.k === GOLD);
    s.starOk = [true, s.used <= d.par, !!gold && gold.st >= 0];
    s.got = s.starOk.filter(Boolean).length;
    s.best[s.stage] = Math.max(s.best[s.stage], s.got);
    s.bestPts[s.stage] = Math.max(s.bestPts[s.stage], s.got * STAR_PTS + s.taps * LEFT_PTS);
    if (s.stage === STAGES.length - 1) s.won = true;
    s.stars = s.best.reduce((a, b) => a + b, 0);
    s.pts = s.bestPts.reduce((a, b) => a + b, 0) + (s.won ? WIN_PTS : 0);
    ev(s, 'clear', 0.5, 0.6, s.won ? '목욕 다 끝! 🛁' : '목욕 끝!');
  } else {
    s.stageTries++;
    s.tries++;
    ev(s, 'fail', 0.5, 0.6, why);
    // D006 (S4): 실패하는 순간 고양이가 웃는다 — 실패는 벌이 아니라 웃음
    s.catT = s.t;
    ev(s, 'cat', CAT.x - 0.04, -0.03, ['냐하하!', '꽥?! 냥~', '냐핫!'][s.tries % 3]);
  }
}

/** 고양이 앞발 자리 (뒤 오른쪽 모서리) */
const CAT = { x: 0.95, y: 0.04 };

export const duckbath: GameDef<DuckState> = {
  id: 'duckbath',
  name: '욕조 물결 오리',
  genes: ['ripple', 'pointer', 'pushbox'],
  twist: '물결은 일정한 속도로 퍼지는 고리라서 "여기 치면 저리 간다"가 읽힌다 — 가까울수록 세게 밀고, 벽에 부딪힌 물결은 되돌아와 한 번 더 밀고, 두 물결이 잇달아 닿으면 1.5배로 민다',
  rules: [
    '물을 톡 = 찰박! 물결 고리가 퍼지며 닿은 오리를 바깥쪽으로 밀어요 (가까울수록 세게, 벽에 닿은 물결은 되돌아와요).',
    '오리를 모두 비누 둥지에 넣으면 끝 — 꾹 누르고 있으면 어디로 갈지 보이고, 떼면 찰박!',
  ],
  controls: 'touch',
  hint: '물을 톡 = 찰박! (꾹 누르면 미리 보기) / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '욕조 디오라마 — 고무 오리 목욕 시간',
    mood: '김이 모락모락 나는 민트 타일 욕실, 하얀 법랑 욕조에 맑은 물이 찰랑이고 물결 무늬 빛이 바닥에 일렁인다. 비누 거품 둥지에서 엄마 오리가 기다리고, 욕조 모서리의 고양이가 앞발을 뻗다가 물결에 화들짝.',
    palette: { bg: '#123a48', ink: '#fffaf0', muted: '#a9d3dc', accent: '#ffd84a', hot: '#ff6b6b', soft: '#bfeaf2' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const jit = STAGES.map((d) => jitFor(seed, d.id));
    const s = {
      pen: 0, penA: 0, sucks: 0, chomps: 0, rng, seed, t: 0, objs: [], rings: [], rid: 0, awake: false,
      L: { nests: [], islands: [], drains: [], streams: [], slicks: [], balloons: [] }, popped: 0,
      stage: 0, phase: 'play', pt: 0, jit, taps: 0, used: 0, lastTap: 0, stageTries: 0, stars: 0, got: 0, starOk: [false, false, false], pts: 0, manual: false, best: STAGES.map(() => 0), bestPts: STAGES.map(() => 0),
      ok: false, why: '', down: false, aim: null, seen: new Set<string>(), newsQ: [], news: null, events: [], dead: false, won: false, catT: -999, tries: 0, crisisT: -1, firstTap: false, again: false,
    } as DuckState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    // 손을 대고 있는 동안은 겨누기(미리 보기), 떼는 순간 찰박
    const p = inp.pointer ?? null;
    if (p) (s.down = true), (s.aim = { x: p.x, y: p.y * A });
    else if (s.down) {
      s.down = false;
      if (s.aim) tap(s, s.aim.x, s.aim.y);
      s.aim = null;
    }
    s.pt++;
    s.events = s.events.filter((e) => s.t - e.t < 110);
    phys(s, s);
    // 쏙·꿀꺽 = 톡 1개 (쓴 톡으로도 센다 → ★톡에 영향). 실패 판정은 '뿅'을 볼 만큼 늦춘다 (CONTENT §0)
    if (s.pen > s.penA) {
      const k = s.pen - s.penA;
      s.penA = s.pen;
      s.taps = Math.max(0, s.taps - k);
      s.used += k;
      s.lastTap = s.t;
    }
    cosmetic(s);
    // D009 (🧪 D008): 옛 goldLost(황금이 쏙·꿀꺽당함)는 뿅 규칙(D002) 뒤로 켜지는 길이 없어 지웠다 — 황금 별은 '꼴찌'로만 잃는다.
    // 꼴찌 위기 = 남은 보통 오리(배 포함) 1 + 황금이 아직 물 위 (ART 12장 ①: 켜진 틱을 기억, 조건이 깨지면 바로 끔)
    const gold = s.objs.find((o) => o.k === GOLD), all = s.objs.filter((o) => o.k === DUCK || o.k === BOAT), left = all.filter((o) => o.st === FREE).length;
    // 🧪 D012: 보통 오리(배 포함)가 처음부터 하나뿐인 판(2-3 배 혼자)은 판 내내 켜져 경보가 닳는다 → 둘 이상인 판에서만
    const crisis = s.phase === 'play' && !!gold && gold.st === FREE && left === 1 && all.length >= 2;
    s.crisisT = crisis ? (s.crisisT < 0 ? s.t : s.crisisT) : -1;
    if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
    if (s.phase === 'result') {
      if (!s.manual && s.pt >= (s.ok ? RESULT_OK : RESULT)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), (s.stageTries = 0), s.stage++, newStage(s);
        } else (s.again = true), newStage(s); // D001: 하트 없음 — 실패하면 그 판만 다시 (오너 기준 7)
      }
      return;
    }
    const v = verdict(s);
    if (v < 0) {
      const lost = s.objs.find((o) => (o.k === DUCK || o.k === BOAT) && o.st < FREE)!;
      return endStage(s, false, lost.st === SUCKED ? (lost.k === BOAT ? '배가 배수구로 쏙…' : '오리가 배수구로 쏙…') : '상어가 오리를 꿀꺽!');
    }
    if (v > 0) return endStage(s, true, '');
    if (s.taps <= 0 && s.rings.length === 0 && (calm(s) || s.t - s.lastTap > 420) && s.t - s.lastTap > 30) endStage(s, false, '톡을 다 썼어요');
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

/** 연출용 상태: 표정·회전 줄이기, 둥지에 든 오리는 엄마 옆으로 쪼르르, 고양이 깜짝 */
function cosmetic(s: DuckState) {
  for (const o of s.objs) {
    o.spin *= 0.94;
    if (o.moodT > 0 && --o.moodT === 0 && o.mood !== 3) o.mood = 0;
    if (o.st === FREE && o.k !== SHARK && o.k !== BOAT) {
      if (Math.abs(o.vx) > 0.0015) o.face = o.vx > 0 ? 1 : -1;
      if (o.moodT <= 0) {
        let scared = false;
        for (const d of s.L.drains) if (Math.hypot(o.x - d.x, o.y - d.y) < d.pr + 0.03) scared = true;
        for (const q of s.objs) if (q.k === SHARK && q.st === FREE && s.awake && q.stun <= 0 && Math.hypot(o.x - q.x, o.y - q.y) < 0.25) scared = true;
        o.mood = o.zz ? 7 : scared ? 4 : 0;
      }
    }
    if (o.k === SHARK && o.st === FREE && o.moodT <= 0) o.mood = !s.awake ? 5 : o.stun > 0 ? 2 : 0;
  }
  s.L.nests.forEach((n, j) => {
    s.objs
      .filter((o) => o.st === j)
      .sort((a, b) => a.ord - b.ord)
      .forEach((o, k) => {
        const q = slot(n, k);
        o.x += (q.x - o.x) * 0.07;
        o.y += (q.y - o.y) * 0.07;
        if (Math.abs(q.x - o.x) > 0.004) o.face = q.x > o.x ? 1 : -1;
        else o.face = n.x > o.x ? 1 : -1;
      });
  });
  // 물결 앞머리가 고양이 앞발에 닿으면 화들짝 (한 번 놀라면 잠깐은 다시 안 놀람)
  const wet = s.rings.some((g) => g.r < RMAX && Math.abs(Math.hypot(g.x - CAT.x, g.y - CAT.y) - g.r) < RS * 1.2);
  if (wet && s.t - s.catT > 60) (s.catT = s.t), ev(s, 'cat', CAT.x - 0.04, -0.03, ['냐앗!', '히익!', '냥?!'][s.t % 3]);
}

// ───────────────────────────── 봇 ─────────────────────────────
function nestDist(L: Layout, o: Obj) {
  let best = 3;
  for (const n of L.nests) if (fits(o, n)) best = Math.min(best, Math.max(0, Math.hypot(o.x - n.x, o.y - n.y) - n.r * 0.8));
  return best;
}
/** 잘하는 봇이 내다본 판의 값: 다 넣었으면 별 셋 기준, 아니면 둥지까지 남은 거리·위험(배수구·상어) */
function value(s: DuckState, S: Sim, plies: number) {
  const d = STAGES[s.stage];
  let v = 0, all = true, goldIn = false;
  for (const o of S.objs) {
    if (o.k === DUCK || o.k === BOAT) {
      if (o.st === SUCKED || o.st === EATEN) return -100000;
      if (o.st >= 0) v += 500;
      else (all = false), (v -= 900 * nestDist(S.L, o));
    } else if (o.k === GOLD) {
      if (o.st >= 0) (goldIn = true), (v += 450);
      else if (o.st === FREE) v -= 260 * nestDist(S.L, o);
      else v -= 450;
    }
  }
  v -= S.pen * 700;
  if (all) return 100000 - S.pen * 30000 + (goldIn ? 30000 : 0) + (s.used + plies <= d.par ? 30000 : 0) + (s.taps - plies) * 100;
  const shs = S.objs.filter((o) => o.k === SHARK && o.st === FREE); // D016 sharks[]: 상어 여럿
  for (const o of S.objs) {
    if (o.st !== FREE || o.k === SHARK) continue;
    const wgt = o.k === GOLD ? 300 : 1600;
    for (const dr of S.L.drains) {
      const dd = Math.hypot(o.x - dr.x, o.y - dr.y);
      if (dd < dr.pr + 0.05) v -= wgt * (1 - dd / (dr.pr + 0.05));
    }
    for (const sh of shs) {
      const dd = Math.hypot(o.x - sh.x, o.y - sh.y);
      if (dd < 0.45) v -= (o.k === GOLD ? 400 : 1300) * (0.45 - dd) * (sh.stun > 30 ? 0.4 : 1);
    }
  }
  return v;
}
/** 겨눌 자리 후보: 떠 있는 것마다 둘레 여러 방향·거리 + 성긴 격자 */
function cands(S: Sim, level: number) {
  const out: { x: number; y: number }[] = [];
  const dists = level === 1 ? [0.06, 0.13, 0.22] : [0.08, 0.17], dirs = level === 1 ? 10 : 8;
  const ok = (x: number, y: number) => inWater(x, y, 0.012) && !S.L.islands.some((is) => Math.hypot(x - is.x, y - is.y) < is.r);
  for (const o of S.objs) {
    if (o.st !== FREE) continue;
    for (const dd of dists)
      for (let k = 0; k < dirs; k++) {
        const a = (k / dirs) * Math.PI * 2 + (level === 1 ? 0.3 : 0.7) + dd * 3, x = o.x + Math.cos(a) * dd, y = o.y + Math.sin(a) * dd;
        if (ok(x, y)) out.push({ x, y });
      }
  }
  if (level === 1) for (let gx = 0; gx < 6; gx++) for (let gy = 0; gy < 7; gy++) out.push({ x: 0.08 + gx * 0.168, y: 0.08 + gy * 0.173 });
  return out;
}

function plan(s: DuckState): { p: { x: number; y: number } | null; until: number } {
  const res: { x: number; y: number; v: number; S: Sim }[] = [];
  for (const c of cands(s, 1)) {
    const S = clone(s);
    splash(S, c.x, c.y);
    run(S, 170);
    res.push({ x: c.x, y: c.y, v: value(s, S, 1), S });
  }
  res.sort((a, b) => b.v - a.v);
  let best = res[0], bv = best.v;
  if (bv < 155000 && s.taps >= 2) {
    // 아직 안 끝난 후보 중 좋은 셋을 한 수 더 내다본다 (바로 끝내는 수보다 황금 오리를 먼저 넣는 길이 나을 수 있다)
    for (const r of res.filter((q) => q.v > -50000 && verdict(q.S) === 0).slice(0, 4)) {
      for (const c of cands(r.S, 2)) {
        const S2 = clone(r.S);
        splash(S2, c.x, c.y);
        run(S2, 170);
        const v2 = value(s, S2, 2) - 20;
        if (v2 > bv) (bv = v2), (best = r);
      }
    }
  }
  // 흐름·배수구·상어가 있는 판: 가만히 두는 게 낫다면 기다린다
  if (s.L.streams.length) {
    const S0 = run(clone(s), 120), v0 = value(s, S0, 0);
    if (v0 > bv + 40) return { p: null, until: s.t + 60 };
  }
  return { p: { x: best.x, y: best.y }, until: 0 };
}

const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x: PX(x, y), y: PY(y) / A } });
const brain = new WeakMap<object, { key: string; p: { x: number; y: number } | null; until: number }>();

/** 봇: 물이 잔잔해지면, 칠 자리 후보를 모두 내다보고(두 수 앞까지) 가장 좋은 자리를 찰박 */
export const duckbathSmart: Bot<DuckState> = {
  name: '물결 박사',
  act(s) {
    if (s.down || s.phase !== 'play' || s.taps <= 0) return NO;
    if (s.t - s.lastTap < 40 || s.rings.length) return NO;
    if (!calm(s) && s.t - s.lastTap < 150) return NO;
    const key = `${s.stage}:${s.tries}:${s.used}`;
    let m = brain.get(s);
    if (!m || m.key !== key) brain.set(s, (m = { key, ...plan(s) }));
    if (!m.p) {
      if (s.t >= m.until) brain.delete(s);
      return NO;
    }
    return at(m.p.x, m.p.y);
  },
};

/**
 * 봇(캐주얼, D001 · FUN.md 제안 1): 미리 보기를 쓰지 않고 '상식'으로 친다 — 아직 떠 있는 오리(goldLast 확률로 황금 오리는 맨 나중, D003 FUN E6) 하나를 골라
 * 가장 가까운 맞는 둥지의 반대편 0.06~0.15 거리를 톡. 자리는 사람 손처럼 σ≈0.03 흔들린다. 물이 잔잔해지면 친다. 내다보기 없음.
 */
export function makeCasual(goldLast = 0.75): Bot<DuckState> {
  const casMem = new WeakMap<object, { key: string; p: { x: number; y: number } | null }>();
  return {
  name: goldLast === 0.5 ? '캐주얼' : `캐주얼(황금 나중 ${goldLast})`,
  act(s, rng) {
    if (s.down || s.phase !== 'play' || s.taps <= 0) return NO;
    if (s.t - s.lastTap < 50 || s.rings.length) return NO;
    if (!calm(s) && s.t - s.lastTap < 170) return NO;
    const key = `${s.stage}:${s.tries}:${s.used}`;
    let m = casMem.get(s);
    if (!m || m.key !== key) {
      const free = s.objs.filter((o) => o.st === FREE && o.k !== SHARK && o.lead < 0); // 🐥 앞 오리만 겨눈다
      const pool = free.some((o) => o.k !== GOLD) && rng() < goldLast ? free.filter((o) => o.k !== GOLD) : free;
      const o = pool[Math.floor(rng() * pool.length)];
      let p: { x: number; y: number } | null = null;
      if (o) {
        let n: Nest | null = null, nd = 9;
        for (const q of s.L.nests) if (fits(o, q) && Math.hypot(o.x - q.x, o.y - q.y) < nd) (nd = Math.hypot(o.x - q.x, o.y - q.y)), (n = q);
        if (n) {
          const ux = (o.x - n.x) / (nd || 1), uy = (o.y - n.y) / (nd || 1), g = () => (rng() + rng() + rng() - 1.5) * 0.05;
          const dd = 0.06 + rng() * 0.09;
          p = { x: Math.max(0.01, Math.min(W - 0.01, o.x + ux * dd + g())), y: Math.max(0.01, Math.min(H - 0.01, o.y + uy * dd + g())) };
        }
      }
      casMem.set(s, (m = { key, p }));
    }
    return m.p ? at(m.p.x, m.p.y) : NO;
  },
};
}
/** 기본(판정) 캐주얼: 황금 오리를 50% 확률로 맨 나중에 민다 (FUN v1.3, D004 — 전에는 75%) */
export const duckbathCasual = makeCasual(0.5);

/**
 * D007 미리 보기 봇 (M2, FUN P1 후보): 사람이 꾹 눌러 점선을 보며 고르는 것처럼 — 캐주얼식 후보 k곳(오리 뒤·둥지 반대편, 흔들림)을
 * 실제 물리로 한 번씩 미리 돌려 보고(미리 보기 = 같은 시뮬레이션), 둥지에 든 오리가 가장 많고 쏙·꿀꺽이 적은 곳을 친다. 두 수 앞은 안 본다.
 * k가 작아도 숙련 봇만큼 풀리면 '미리 보기 끌기로 다 풀린다'(고민 없음, 기준 1·6).
 */
export function makePreviewer(k: number): Bot<DuckState> {
  const memo = new WeakMap<object, { key: string; p: { x: number; y: number } | null }>();
  return {
    name: `미리 보기 k=${k}`,
    act(s, rng) {
      if (s.down || s.phase !== 'play' || s.taps <= 0) return NO;
      if (s.t - s.lastTap < 50 || s.rings.length) return NO;
      if (!calm(s) && s.t - s.lastTap < 170) return NO;
      const key = `${s.stage}:${s.tries}:${s.used}`;
      let m = memo.get(s);
      if (!m || m.key !== key) {
        const free = s.objs.filter((o) => o.st === FREE && o.k !== SHARK && o.lead < 0); // 🐥 앞 오리만 겨눈다
        let best: { x: number; y: number } | null = null, bv = -Infinity;
        for (let c = 0; c < k && free.length; c++) {
          const o = free[Math.floor(rng() * free.length)];
          let n: Nest | null = null, nd = 9;
          for (const q of s.L.nests) if (fits(o, q) && Math.hypot(o.x - q.x, o.y - q.y) < nd) (nd = Math.hypot(o.x - q.x, o.y - q.y)), (n = q);
          if (!n) continue;
          const ux = (o.x - n.x) / (nd || 1), uy = (o.y - n.y) / (nd || 1), g = () => (rng() + rng() + rng() - 1.5) * 0.05, dd = 0.06 + rng() * 0.09;
          const x = Math.max(0.01, Math.min(W - 0.01, o.x + ux * dd + g())), y = Math.max(0.01, Math.min(H - 0.01, o.y + uy * dd + g()));
          const S = clone(s);
          splash(S, x, y);
          run(S, 200);
          // FUN v1.6 K1 고르는 순서: 쏙·꿀꺽 0 > 둥지에 든 오리·배 수 > 황금 입성 > 먼저 뽑은 곳 (끝 상태만, value() 안 씀)
          const v = (S.pen === 0 ? 1000 : 0) + S.objs.filter((q) => (q.k === DUCK || q.k === BOAT) && q.st >= 0).length * 10 + (S.objs.some((q) => q.k === GOLD && q.st >= 0) ? 1 : 0);
          if (v > bv) (bv = v), (best = { x, y });
        }
        memo.set(s, (m = { key, p: best }));
      }
      return m.p ? at(m.p.x, m.p.y) : NO;
    },
  };
}

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number }>();
/** 봇: 아무 데나, 아무 때나 찰박 (대개 물 위, 가끔 화면 아무 데나) */
export const duckbathRandom: Bot<DuckState> = {
  name: '아무 데나 찰박',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 60), hold: 0, x: 0, y: 0 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y / A } } : NO;
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 110);
    if (rng() < 0.1) (m.x = rng()), (m.y = rng() * A);
    else {
      const px = rng() * W, py = rng() * H;
      (m.x = PX(px, py)), (m.y = PY(py));
    }
    m.hold = 2 + Math.floor(rng() * 4);
    return { tap: false, dir: 0, pointer: { x: m.x, y: m.y / A } };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const DUCK_COL = [
  ['#fff59a', '#ffd23a', '#e29a00'],
  ['#ffd3e6', '#ff8fbe', '#d9548c'],
];
const GOLD_COL = ['#fff8c4', '#ffcf3a', '#b97800'];
const NEST_TINT = ['rgba(255,226,90,', 'rgba(255,140,190,'];
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
const PREV = new WeakMap<object, { key: string; paths: { k: number; col: number; pts: number[]; end: number }[] }>();

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** 고무 오리 (비스듬히 본 옆모습). mood: 0 평온 · 1 꽥(놀람) · 2 어질어질 · 3 행복 · 4 겁먹음 */
/** HUD 별 칩 셋의 상태 (D010: 테스트하려고 그리기에서 뺐다). ok = 노란 테, bad = 흐린 테(그 별은 이번 시도에서 끝남) */
export function starChips(s: DuckState) {
  const d = STAGES[s.stage];
  const ducksIn = s.objs.filter((o) => (o.k === DUCK || o.k === BOAT) && o.st >= 0).length, ducksAll = s.objs.filter((o) => o.k === DUCK || o.k === BOAT).length;
  const gold = s.objs.find((o) => o.k === GOLD);
  const okk = s.phase === 'result' && s.ok ? s.starOk : [ducksIn === ducksAll, s.used <= d.par, !!gold && gold.st >= 0];
  // D009: 셋째 칩은 황금이 꼴찌로 확정된 판(깼는데 황금이 아직 물 위)에서 꺼진다 — 옛 goldLost는 켜지는 길이 없었다(🧪 D008)
  const bad = [s.phase === 'result' && !s.ok, s.used > d.par, s.phase === 'result' && s.ok && !s.starOk[2]];
  return { ducksIn, ducksAll, okk, bad };
}

/** D010 (🧪 D009 5.3): 판 흔들기 난수는 (시드, 판 id)에서 — 판을 끼워 넣어도 다른 판의 흔들림·뒤집힘이 그대로. 옛: 시드 하나에서 판 순서대로 뽑았다 */
export function jitFor(seed: number, id: string) {
  let h = 0x811c9dc5;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193);
  const r = mulberry32((seed ^ h) >>> 0);
  return { flip: r() < 0.5, j: Array.from({ length: 24 }, () => r()) };
}

/** 🧪 D009: 위기가 이만큼(틱) 이어져야 보인다 — 1-1에서 위기가 시도의 84%에 켜지지만 지속 중앙 4틱(0.07초)이라 손쓸 수 없는 번쩍임이었다 */
export const CRISIS_DELAY = 18;
/** 화면에 보이는 위기인가 (그리기·칩 공통) */
export const crisisShown = (s: DuckState) => s.crisisT >= 0 && s.t - s.crisisT >= CRISIS_DELAY;
/** 브라우저의 '동작 줄이기' (ART 12장 ④). 노드(봇·테스트)에서는 false */
const CALM = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function drawDuck(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, col: string[], face: number, tilt: number, mood: number, t: number, extra: number) {
  ctx.save();
  ctx.translate(x, y);
  // 물에 비친 그림자와 물 테두리
  ctx.fillStyle = 'rgba(0,55,80,.24)';
  ctx.beginPath();
  ctx.ellipse(u * 0.12, u * 0.3, u * 1.12, u * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(tilt);
  ctx.scale(face, 1);
  if (mood === 4) ctx.translate(Math.sin(t * 1.3) * u * 0.05, 0);
  // 몸통
  const g = ctx.createLinearGradient(0, -u * 0.6, 0, u * 0.45);
  g.addColorStop(0, col[0]);
  g.addColorStop(0.45, col[1]);
  g.addColorStop(1, col[2]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-u * 1.08, -u * 0.62);
  ctx.quadraticCurveTo(-u * 1.0, -u * 0.05, -u * 0.72, u * 0.2);
  ctx.quadraticCurveTo(0, u * 0.52, u * 0.82, u * 0.16);
  ctx.quadraticCurveTo(u * 1.08, -u * 0.18, u * 0.6, -u * 0.36);
  ctx.quadraticCurveTo(-u * 0.15, -u * 0.52, -u * 0.62, -u * 0.26);
  ctx.quadraticCurveTo(-u * 0.86, -u * 0.36, -u * 1.08, -u * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,70,0,.35)';
  ctx.lineWidth = Math.max(1, u * 0.05);
  ctx.stroke();
  // 날개
  ctx.strokeStyle = col[2];
  ctx.lineWidth = u * 0.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(-u * 0.18, -u * 0.12, u * 0.34, 0.25, Math.PI * 0.85);
  ctx.stroke();
  // 물에 잠긴 아랫부분 (물빛이 비친다)
  ctx.fillStyle = 'rgba(80,190,220,.28)';
  ctx.beginPath();
  ctx.ellipse(0, u * 0.24, u * 0.95, u * 0.2, 0, 0, Math.PI);
  ctx.fill();
  // 머리
  const hx = u * 0.42, hy = -u * 0.78, hr = u * 0.47;
  const hg = ctx.createRadialGradient(hx - hr * 0.35, hy - hr * 0.4, hr * 0.1, hx, hy, hr * 1.1);
  hg.addColorStop(0, col[0]);
  hg.addColorStop(0.6, col[1]);
  hg.addColorStop(1, col[2]);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,70,0,.3)';
  ctx.lineWidth = Math.max(1, u * 0.05);
  ctx.stroke();
  // 볼
  ctx.fillStyle = 'rgba(255,120,120,.45)';
  ctx.beginPath();
  ctx.ellipse(hx + hr * 0.15, hy + hr * 0.38, hr * 0.22, hr * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  // 부리
  const bx = hx + hr * 0.92, by = hy + hr * 0.12, open = mood === 1 ? 1 : mood === 3 ? 0.3 : 0;
  ctx.fillStyle = '#ff8a2a';
  ctx.beginPath();
  ctx.ellipse(bx, by - open * u * 0.06, u * 0.3, u * 0.12, -0.12 - open * 0.3, 0, Math.PI * 2);
  ctx.fill();
  if (open) {
    ctx.fillStyle = '#e8661a';
    ctx.beginPath();
    ctx.ellipse(bx - u * 0.02, by + u * 0.1 * open, u * 0.24, u * 0.09, 0.3 * open, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a2a1a';
    ctx.beginPath();
    ctx.ellipse(bx - u * 0.12, by + u * 0.03, u * 0.08, u * 0.05 * open + 1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 눈
  const ex = hx + hr * 0.3, ey = hy - hr * 0.15;
  ctx.fillStyle = '#1a1a1a';
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = Math.max(1.2, u * 0.08);
  if (mood === 1 || mood === 4) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, ey, u * 0.17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(ex + u * 0.04, ey, u * 0.06, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === 2) {
    ctx.beginPath();
    for (let k = 0; k < 14; k++) {
      const a = k * 0.6 + t * 0.3, rr = (k / 14) * u * 0.16;
      ctx.lineTo(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr);
    }
    ctx.lineWidth = Math.max(1, u * 0.05);
    ctx.stroke();
  } else if (mood === 3) {
    ctx.beginPath();
    ctx.arc(ex, ey + u * 0.04, u * 0.1, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else if (mood === 7) {
    // 💤 감은 눈 (ART 14장 ③: 굵게)
    ctx.lineWidth = Math.max(1.8, u * 0.13);
    ctx.beginPath();
    ctx.arc(ex, ey - u * 0.02, u * 0.14, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(ex, ey, u * 0.075, u * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex + u * 0.025, ey - u * 0.035, u * 0.03, 0, Math.PI * 2);
    ctx.fill();
  }
  if (mood === 4) {
    ctx.fillStyle = '#9fe3ff';
    ctx.beginPath();
    ctx.ellipse(hx - hr * 0.7, hy - hr * 0.2 + (t % 30) * u * 0.01, u * 0.07, u * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 엄마 리본 · 황금 왕관
  if (extra === 2) {
    ctx.fillStyle = '#ff5c8a';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx - hr * 0.2, hy - hr * 0.85);
      ctx.lineTo(hx - hr * 0.2 + sd * hr * 0.55, hy - hr * 1.15);
      ctx.lineTo(hx - hr * 0.2 + sd * hr * 0.5, hy - hr * 0.6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(hx - hr * 0.2, hy - hr * 0.86, hr * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  if (mood === 7) {
    // 💤 뜨개 나이트캡 (ART 14장 ①②, 🎨 D014): 남색 고깔이 머리 뒤로 늘어지고 끝에 흰 방울 — 1배에서 실루엣이 달라 보이게
    const tipX = hx - u * 0.95, tipY = hy - u * 0.6;
    ctx.strokeStyle = '#1C2E73';
    ctx.lineWidth = Math.max(1, u * 0.06);
    ctx.fillStyle = '#3B5BDB';
    ctx.beginPath();
    ctx.moveTo(hx - u * 0.5, hy - u * 0.32);
    ctx.quadraticCurveTo(hx - u * 0.55, hy - u * 0.9, tipX, tipY);
    ctx.quadraticCurveTo(hx + u * 0.05, hy - u * 1.25, hx + u * 0.4, hy - u * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(hx - u * 0.5, hy - u * 0.4, u * 0.9, u * 0.2, u * 0.1);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(tipX, tipY, u * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  if (extra === 1 || extra === 3) {
    ctx.fillStyle = '#ffe14d';
    ctx.strokeStyle = extra === 3 ? '#ff9f43' : '#b97800';
    ctx.lineWidth = extra === 3 ? 2 : 1;
    ctx.beginPath();
    const cx = hx - hr * 0.05, cw = hr * 0.5;
    let cy = hy - hr * 0.88;
    if (extra === 3) {
      // ART 12장 ②: 왕관 들썩 — 밑변 가운데를 축으로 ±0.3rad, 위로 0.12u, 32틱 (t = 전역 s.t, 칩과 같은 박자). reduced-motion이면 회전 0
      const ph = Math.sin((t / 32) * Math.PI * 2);
      cy -= u * 0.12 * Math.max(0, ph);
      if (!CALM) {
        ctx.translate(cx, cy + cw * 0.5);
        ctx.rotate(0.3 * ph);
        ctx.translate(-cx, -(cy + cw * 0.5));
      }
    }
    ctx.moveTo(cx - cw, cy + cw * 0.5);
    ctx.lineTo(cx - cw, cy - cw * 0.3);
    ctx.lineTo(cx - cw * 0.5, cy + cw * 0.1);
    ctx.lineTo(cx, cy - cw * 0.55);
    ctx.lineTo(cx + cw * 0.5, cy + cw * 0.1);
    ctx.lineTo(cx + cw, cy - cw * 0.3);
    ctx.lineTo(cx + cw, cy + cw * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  // 물 테두리 (기울지 않음)
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.3, u * (1.05 + 0.05 * Math.sin(t * 0.08 + x)), u * 0.3, 0, 0.1, Math.PI - 0.1);
  ctx.stroke();
  if (mood === 2)
    for (let k = 0; k < 3; k++) {
      const a = t * 0.12 + (k * Math.PI * 2) / 3;
      ctx.fillStyle = '#fff27a';
      star(ctx, x + face * u * 0.4 + Math.cos(a) * u * 0.55, y - u * 1.45 + Math.sin(a) * u * 0.18, u * 0.16);
      ctx.fill();
    }
  if (mood === 7) {
    // 'Z z' 거품 — 위로 천천히 (reduced-motion이면 제자리)
    const k = CALM ? 0.5 : (t % 90) / 90;
    // 🖐 D013: 390px에서 오리(u ≈ 10px)보다 Z가 작아 안 읽혀 — Z를 오리 머리만큼 키우고 테두리를 굵게
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1C2E73'; // ART 14장 ④: 'Z'와 남색은 💤 오리만
    ctx.lineWidth = Math.max(2, u * 0.16);
    ctx.lineJoin = 'round';
    ctx.font = `900 ${Math.round(u * 0.95)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.strokeText('Z', x + face * u * 1.2, y - u * (1.2 + k * 0.5));
    ctx.fillText('Z', x + face * u * 1.2, y - u * (1.2 + k * 0.5));
    ctx.font = `900 ${Math.round(u * 0.65)}px system-ui, sans-serif`;
    ctx.strokeText('z', x + face * u * 1.95, y - u * (1.95 + k * 0.5));
    ctx.fillText('z', x + face * u * 1.95, y - u * (1.95 + k * 0.5));
  }
  if ((extra === 1 || extra === 3) && (t + Math.floor(x)) % 40 < 20) {
    ctx.fillStyle = '#fffbe0';
    star(ctx, x - face * u * 0.7, y - u * 0.9, u * 0.14 * (1 + Math.sin(t * 0.3)));
    ctx.fill();
  }
}

/** 고무 상어: 사팔눈에 혀를 내민 바보 얼굴. mood 0 다가옴 · 2 어질어질 · 5 쿨쿨 · 6 꿀꺽 */
function drawShark(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, face: number, mood: number, t: number, gulp = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,55,80,.26)';
  ctx.beginPath();
  ctx.ellipse(u * 0.1, u * 0.32, u * 1.7, u * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(face, 1);
  ctx.rotate(Math.sin(t * 0.12) * 0.05);
  // 꼬리
  ctx.fillStyle = '#6f8fb0';
  ctx.beginPath();
  ctx.moveTo(-u * 1.3, -u * 0.05);
  ctx.lineTo(-u * 1.95, -u * 0.7 + Math.sin(t * 0.2) * u * 0.1);
  ctx.lineTo(-u * 1.75, u * 0.05);
  ctx.lineTo(-u * 1.95, u * 0.45);
  ctx.closePath();
  ctx.fill();
  // 몸
  const g = ctx.createLinearGradient(0, -u * 0.8, 0, u * 0.5);
  g.addColorStop(0, '#a6c3df');
  g.addColorStop(0.5, '#7d9dc0');
  g.addColorStop(1, '#55759a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.12, u * 1.45, u * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  // 등지느러미
  ctx.fillStyle = '#7d9dc0';
  ctx.beginPath();
  ctx.moveTo(-u * 0.45, -u * 0.62);
  ctx.quadraticCurveTo(-u * 0.2, -u * 1.45, u * 0.25, -u * 1.25);
  ctx.quadraticCurveTo(u * 0.05, -u * 0.95, u * 0.15, -u * 0.6);
  ctx.closePath();
  ctx.fill();
  // 배
  ctx.fillStyle = '#eef4fa';
  ctx.beginPath();
  ctx.ellipse(u * 0.25, u * 0.12, u * 1.0, u * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  // 입 (바보 웃음 · 뭉툭한 이)
  const open = mood === 6 ? 1 : mood === 5 ? 0.15 : 0.55;
  ctx.fillStyle = '#7a2a3a';
  ctx.beginPath();
  ctx.ellipse(u * 0.95, u * 0.05, u * 0.38, u * 0.16 + u * 0.18 * open, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.roundRect(u * (0.68 + k * 0.15), u * (-0.08 - 0.1 * open), u * 0.1, u * 0.12, u * 0.04);
    ctx.fill();
  }
  if (gulp) {
    // 입에 오리 꼬리가 삐죽 (꿀꺽 개그)
    ctx.save();
    ctx.translate(u * 1.15, u * 0.02);
    ctx.rotate(-0.5 + Math.sin(t * 0.4) * 0.25);
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath();
    ctx.ellipse(u * 0.15, 0, u * 0.32, u * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff8a2a';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(u * 0.45, sd * u * 0.12, u * 0.13, u * 0.06, sd * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  if (mood !== 5) {
    ctx.fillStyle = '#ff7a9a';
    ctx.beginPath();
    ctx.ellipse(u * 1.12, u * (0.16 + 0.12 * open), u * 0.14, u * 0.09, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // 사팔눈
  for (const [ex, sz] of [[0.5, 0.2], [0.85, 0.16]]) {
    const exx = u * ex, eyy = -u * 0.42;
    if (mood === 5) {
      ctx.strokeStyle = '#2a3a4a';
      ctx.lineWidth = Math.max(1.2, u * 0.07);
      ctx.beginPath();
      ctx.arc(exx, eyy, u * sz * 0.8, 0.2, Math.PI - 0.2);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(exx, eyy, u * sz, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2a3a4a';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#1a1a1a';
    if (mood === 2) {
      ctx.beginPath();
      for (let k = 0; k < 12; k++) {
        const a = k * 0.7 - t * 0.3, rr = (k / 12) * u * sz * 0.85;
        ctx.lineTo(exx + Math.cos(a) * rr, eyy + Math.sin(a) * rr);
      }
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else {
      const lk = ex < 0.6 ? 0.5 : -0.4;
      ctx.beginPath();
      ctx.arc(exx + u * sz * lk, eyy + u * sz * 0.3, u * sz * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (mood === 5) {
    // ART 14장 2 (🎨 D014): 잠든 상어는 Z 없이 콧방울 — 💤 오리('첫 물결은 막아 줌')와 다른 규칙('아무 톡에나 퐁, 그대로 밀림')
    const r = u * (CALM ? 0.3 : 0.275 + 0.125 * Math.sin((t / 120) * Math.PI * 2)), cx = u * 1.3 + 0.9 * r, cy = -u * 0.3 - 0.3 * r;
    ctx.fillStyle = 'rgba(230,250,255,.45)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(18,58,72,.55)';
    ctx.lineWidth = Math.max(3, u * 0.12);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, u * 0.07);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - r * 0.4, cy - r * 0.4, u * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (mood === 2)
    for (let k = 0; k < 3; k++) {
      const a = t * 0.12 + (k * Math.PI * 2) / 3;
      ctx.fillStyle = '#fff27a';
      star(ctx, x + Math.cos(a) * u * 0.8, y - u * 1.35 + Math.sin(a) * u * 0.2, u * 0.17);
      ctx.fill();
    }
}

/** 장난감 돛단배 */
function drawBoat(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, face: number, tilt: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,55,80,.26)';
  ctx.beginPath();
  ctx.ellipse(u * 0.1, u * 0.3, u * 1.45, u * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(tilt);
  ctx.scale(face, 1);
  // 돛대 · 돛
  ctx.strokeStyle = '#8a5a2a';
  ctx.lineWidth = Math.max(1.5, u * 0.09);
  ctx.beginPath();
  ctx.moveTo(0, -u * 0.2);
  ctx.lineTo(0, -u * 1.9);
  ctx.stroke();
  const sg = ctx.createLinearGradient(0, -u * 1.8, u, -u * 0.4);
  sg.addColorStop(0, '#ffffff');
  sg.addColorStop(1, '#dfe9f2');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(u * 0.08, -u * 1.8);
  ctx.quadraticCurveTo(u * 1.0, -u * 1.0, u * 0.95, -u * 0.42);
  ctx.lineTo(u * 0.08, -u * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4aa8e8';
  ctx.fillRect(u * 0.08, -u * 1.0, u * 0.72, u * 0.16);
  ctx.fillStyle = '#ff5c5c';
  ctx.beginPath();
  ctx.moveTo(0, -u * 1.9);
  ctx.lineTo(-u * 0.45, -u * 1.78);
  ctx.lineTo(0, -u * 1.66);
  ctx.fill();
  // 배 몸통
  const hg = ctx.createLinearGradient(0, -u * 0.4, 0, u * 0.35);
  hg.addColorStop(0, '#ff7b6b');
  hg.addColorStop(1, '#c4372e');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(-u * 1.25, -u * 0.38);
  ctx.lineTo(u * 1.3, -u * 0.38);
  ctx.quadraticCurveTo(u * 1.05, u * 0.32, u * 0.6, u * 0.32);
  ctx.lineTo(-u * 0.8, u * 0.32);
  ctx.quadraticCurveTo(-u * 1.15, u * 0.2, -u * 1.25, -u * 0.38);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-u * 1.12, -u * 0.18, u * 2.3, u * 0.1);
  ctx.fillStyle = '#ffe9a8';
  for (const px of [-0.6, 0.0, 0.6]) {
    ctx.beginPath();
    ctx.arc(u * px, u * 0.06, u * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 고양이 (욕조 뒤 오른쪽 모서리). mode 0 쉼 · 1 앞발 뻗기 · 2 화들짝 */
function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, mode: number, t: number) {
  ctx.save();
  ctx.translate(x, y - (mode === 2 ? u * 0.45 : 0));
  const puff = mode === 2 ? 1.15 : 1;
  // 꼬리
  ctx.strokeStyle = '#e07b2c';
  ctx.lineCap = 'round';
  ctx.lineWidth = u * (mode === 2 ? 0.4 : 0.2);
  ctx.beginPath();
  ctx.moveTo(u * 0.45, -u * 0.15);
  if (mode === 2) ctx.quadraticCurveTo(u * 0.95, -u * 0.6, u * 0.8, -u * 1.5);
  else ctx.quadraticCurveTo(u * 1.1, -u * 0.1 + Math.sin(t * 0.05) * u * 0.3, u * 0.95, -u * 0.9 + Math.sin(t * 0.05) * u * 0.2);
  ctx.stroke();
  // 몸
  const g = ctx.createLinearGradient(0, -u * 1.2, 0, 0);
  g.addColorStop(0, '#ffb066');
  g.addColorStop(1, '#e27a2c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.5, u * 0.55 * puff, u * 0.6 * puff, 0, 0, Math.PI * 2);
  ctx.fill();
  if (mode === 2) {
    ctx.strokeStyle = '#e27a2c';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * u * 0.6, -u * 0.5 + Math.sin(a) * u * 0.66);
      ctx.lineTo(Math.cos(a) * u * 0.78, -u * 0.5 + Math.sin(a) * u * 0.84);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#fff4e6';
  ctx.beginPath();
  ctx.ellipse(-u * 0.12, -u * 0.35, u * 0.25, u * 0.33, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,70,10,.55)';
  ctx.lineWidth = Math.max(1, u * 0.07);
  for (const k of [0, 1, 2]) {
    ctx.beginPath();
    ctx.arc(u * 0.15, -u * (0.75 - k * 0.2), u * 0.3, -0.4, 0.3);
    ctx.stroke();
  }
  // 앞발
  ctx.fillStyle = '#ffb066';
  if (mode === 1) {
    const ext = 0.5 + 0.5 * Math.sin(t * 0.25);
    ctx.save();
    ctx.translate(-u * 0.35, -u * 0.55);
    ctx.rotate(0.9 + ext * 0.3);
    ctx.beginPath();
    ctx.roundRect(-u * 0.11, 0, u * 0.22, u * (0.7 + ext * 0.25), u * 0.1);
    ctx.fill();
    ctx.fillStyle = '#ffd0d8';
    ctx.beginPath();
    ctx.arc(0, u * (0.75 + ext * 0.25), u * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    for (const px of [-0.3, 0.05]) {
      ctx.beginPath();
      ctx.ellipse(u * px, -u * 0.02, u * 0.14, u * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 머리
  const hx = -u * 0.12, hy = -u * 1.25;
  ctx.fillStyle = '#ffa95a';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + sd * u * 0.36, hy - u * 0.12);
    ctx.lineTo(hx + sd * u * 0.3, hy - u * (mode === 2 ? 0.75 : 0.62));
    ctx.lineTo(hx + sd * u * 0.06, hy - u * 0.32);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(hx, hy, u * 0.42, u * 0.37, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffc6cf';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + sd * u * 0.3, hy - u * 0.2);
    ctx.lineTo(hx + sd * u * 0.27, hy - u * 0.48);
    ctx.lineTo(hx + sd * u * 0.12, hy - u * 0.3);
    ctx.closePath();
    ctx.fill();
  }
  // 눈 (물 쪽을 본다 = 왼쪽 아래)
  for (const sd of [-1, 1]) {
    const ex = hx + sd * u * 0.16, ey = hy - u * 0.02;
    if (mode === 2) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, u * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(ex, ey, u * 0.035, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#9be36a';
      ctx.beginPath();
      ctx.ellipse(ex, ey, u * 0.09, u * (mode === 1 ? 0.1 : 0.08), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.ellipse(ex - u * 0.03, ey + u * 0.02, u * (mode === 1 ? 0.05 : 0.025), u * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#ff8fa3';
  ctx.beginPath();
  ctx.moveTo(hx - u * 0.05, hy + u * 0.1);
  ctx.lineTo(hx + u * 0.05, hy + u * 0.1);
  ctx.lineTo(hx, hy + u * 0.16);
  ctx.fill();
  ctx.strokeStyle = '#7a3a10';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (mode === 2) ctx.ellipse(hx, hy + u * 0.24, u * 0.06, u * 0.06, 0, 0, Math.PI * 2);
  else (ctx.arc(hx - u * 0.05, hy + u * 0.17, u * 0.05, 0, Math.PI), ctx.arc(hx + u * 0.05, hy + u * 0.17, u * 0.05, 0, Math.PI));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  for (const sd of [-1, 1])
    for (const dy of [0.12, 0.2]) {
      ctx.beginPath();
      ctx.moveTo(hx + sd * u * 0.18, hy + u * dy);
      ctx.lineTo(hx + sd * u * 0.5, hy + u * (dy - 0.04 + 0.08 * (dy > 0.15 ? 1 : 0)));
      ctx.stroke();
    }
  ctx.restore();
}

function drawAll(ctx: CanvasRenderingContext2D, s: DuckState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const L = s.L, d = STAGES[s.stage];
  const SX = (x: number, y: number) => X(PX(x, y)), SY = (y: number) => Y(PY(y));
  const dep = (y: number) => scl(y) / SF;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${R(sz)}px system-ui, sans-serif`);
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 40 && Math.abs(q.x - x) < w * 0.25 && Math.abs(q.y - y) < size + 4); k++) y -= size + 4;
    rec.push({ x, y, t: s.t });
    if (rec.length > 14) rec.shift();
    fx.pop(Math.max(w * 0.13, Math.min(w * 0.87, x)), y, text, col, size);
  };
  /** 평면 원을 화면에 (원근 때문에 살짝 찌그러진 타원) */
  const pcircle = (cx: number, cy: number, r: number) => {
    ctx.beginPath();
    for (let k = 0; k <= 40; k++) {
      const a = (k / 40) * Math.PI * 2, px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      if (k) ctx.lineTo(SX(px, py), SY(py));
      else ctx.moveTo(SX(px, py), SY(py));
    }
    ctx.closePath();
  };
  const quadPath = (pts: number[][], rad: number) => {
    ctx.beginPath();
    ctx.moveTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
    for (let k = 1; k <= 4; k++) ctx.arcTo(pts[k % 4][0], pts[k % 4][1], pts[(k + 1) % 4][0], pts[(k + 1) % 4][1], rad);
    ctx.closePath();
  };
  // 욕조 모서리 (화면 px): 물 · 안쪽 벽 · 테두리
  const wb = [[X(PX(0, 0)), SY(0)], [X(PX(W, 0)), SY(0)], [X(PX(W, H)), SY(H)], [X(PX(0, H)), SY(H)]];
  const off = (e: number[], zb: number, zf: number) => [[wb[0][0] - R(e[0]), wb[0][1] - R(zb)], [wb[1][0] + R(e[0]), wb[1][1] - R(zb)], [wb[2][0] + R(e[1]), wb[2][1] + R(zf)], [wb[3][0] - R(e[1]), wb[3][1] + R(zf)]];
  const inner = off([0.016, 0.014], 0.048, 0.0), rim = off([0.044, 0.046], 0.082, 0.03);

  ctx.save();
  fx.begin(ctx);
  // ── 타일 벽 ──
  ctx.fillStyle = '#86bdb3';
  ctx.fillRect(-10, -10, w + 20, Y(WY1) + 10);
  const ts = R(0.0625);
  for (let r = 0; r * ts < Y(WY1); r++)
    for (let c = -1; c * ts < w + ts; c++) {
      const x0 = c * ts + (r % 2 ? ts * 0.5 : 0), y0 = r * ts, hv = hsh(r * 31 + c * 7);
      ctx.fillStyle = r === 3 ? `hsl(176, 38%, ${54 + hv * 6}%)` : `hsl(166, 40%, ${80 + hv * 6}%)`;
      ctx.beginPath();
      ctx.roundRect(x0 + 1, y0 + 1, ts - 2, ts - 2, 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      ctx.fillRect(x0 + 3, y0 + 3, ts * 0.42, 1.6);
    }
  // 창문 빛 (오른쪽 위)
  {
    const cx = X(0.72), cy = Y(0.15), r0 = R(0.055);
    ctx.save();
    ctx.fillStyle = '#e9fbff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = R(0.06);
    ctx.beginPath();
    ctx.arc(cx, cy, r0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#d7c9a8';
    ctx.lineWidth = R(0.008);
    ctx.beginPath();
    ctx.arc(cx, cy, r0, 0, Math.PI * 2);
    ctx.moveTo(cx - r0, cy);
    ctx.lineTo(cx + r0, cy);
    ctx.moveTo(cx, cy - r0);
    ctx.lineTo(cx, cy + r0);
    ctx.stroke();
    const lg = ctx.createLinearGradient(cx, cy, cx - R(0.3), Y(0.6));
    lg.addColorStop(0, 'rgba(255,255,240,.22)');
    lg.addColorStop(1, 'rgba(255,255,240,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(cx - r0 * 0.7, cy);
    ctx.lineTo(cx + r0 * 0.7, cy);
    ctx.lineTo(X(0.45), Y(0.75));
    ctx.lineTo(X(0.05), Y(0.62));
    ctx.closePath();
    ctx.fill();
  }
  // 선반: 샴푸 · 비누
  {
    const sy = Y(0.205);
    ctx.fillStyle = 'rgba(220,245,255,.75)';
    ctx.fillRect(X(0.04), sy, R(0.22), R(0.012));
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    ctx.fillRect(X(0.05), sy + R(0.012), R(0.2), R(0.006));
    const bg = ctx.createLinearGradient(X(0.07), 0, X(0.12), 0);
    bg.addColorStop(0, '#ff9ec4');
    bg.addColorStop(1, '#e05a90');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(X(0.07), sy - R(0.075), R(0.05), R(0.075), R(0.012));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(X(0.085), sy - R(0.095), R(0.02), R(0.022));
    ctx.fillRect(X(0.09), sy - R(0.1), R(0.03), R(0.008));
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.fillRect(X(0.078), sy - R(0.065), R(0.008), R(0.05));
    ctx.fillStyle = '#8fe0b8';
    ctx.beginPath();
    ctx.roundRect(X(0.15), sy - R(0.03), R(0.07), R(0.03), R(0.01));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.arc(X(0.16 + k * 0.017), sy - R(0.034 + 0.006 * (k % 2)), R(0.008), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // ── 바닥 ──
  {
    const fy = Y(WY1 - 0.02);
    ctx.fillStyle = '#e9cdb6';
    ctx.fillRect(-10, fy, w + 20, h - fy + 10);
    ctx.strokeStyle = 'rgba(150,100,70,.25)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      ctx.moveTo(-10, fy + R(0.03 + k * 0.05));
      ctx.lineTo(w + 10, fy + R(0.03 + k * 0.05));
      ctx.stroke();
    }
    for (let k = -6; k < 7; k++) {
      ctx.beginPath();
      ctx.moveTo(X(0.5 + k * 0.12), fy);
      ctx.lineTo(X(0.5 + k * 0.16), h);
      ctx.stroke();
    }
    // 욕조 그림자
    ctx.fillStyle = 'rgba(60,30,20,.25)';
    ctx.beginPath();
    ctx.ellipse(w / 2, Y(1.262), R(0.47), R(0.03), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // ── 욕조 몸통 (앞면 · 다리) ──
  {
    const ty = Y(WY1 + 0.03), by = Y(1.248);
    const g = ctx.createLinearGradient(0, ty, 0, by);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#bccfd6');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(X(0.012), ty);
    ctx.quadraticCurveTo(X(0.03), by, X(0.14), by);
    ctx.lineTo(X(0.86), by);
    ctx.quadraticCurveTo(X(0.97), by, X(0.988), ty);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fillRect(X(0.1), ty + R(0.02), R(0.8), R(0.006));
    for (const fx0 of [0.15, 0.85]) {
      ctx.fillStyle = '#d9a63a';
      ctx.beginPath();
      ctx.ellipse(X(fx0), by + R(0.008), R(0.03), R(0.016), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath();
      ctx.ellipse(X(fx0) - R(0.008), by + R(0.002), R(0.01), R(0.005), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // ── 욕조 테두리 · 안쪽 벽 ──
  ctx.save();
  ctx.shadowColor = 'rgba(0,40,40,.3)';
  ctx.shadowBlur = R(0.03);
  ctx.shadowOffsetY = R(0.01);
  ctx.fillStyle = '#fbfbf7';
  quadPath(rim, R(0.07));
  ctx.fill();
  ctx.restore();
  {
    const g = ctx.createLinearGradient(0, rim[0][1], 0, rim[2][1]);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#e6eef0');
    ctx.fillStyle = g;
    quadPath(rim, R(0.07));
    ctx.fill();
    const ig = ctx.createLinearGradient(0, inner[0][1], 0, inner[0][1] + R(0.12));
    ig.addColorStop(0, '#e2ecee');
    ig.addColorStop(1, '#a9c3ca');
    ctx.fillStyle = ig;
    quadPath(inner, R(0.05));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 1.5;
    quadPath(inner, R(0.05));
    ctx.stroke();
  }
  // 수도꼭지 (뒤 가운데)
  const spout = { x: X(0.5), y: Y(WY0 - 0.035) };
  {
    const bx = X(0.5), by = Y(0.245);
    const cg = ctx.createLinearGradient(bx - R(0.05), 0, bx + R(0.05), 0);
    cg.addColorStop(0, '#9aa7b0');
    cg.addColorStop(0.45, '#ffffff');
    cg.addColorStop(1, '#7d8a94');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(bx, by, R(0.04), R(0.02), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(bx - R(0.016), by - R(0.006), R(0.032), spout.y - by + R(0.004), R(0.012));
    ctx.fill();
    ctx.fillStyle = '#5d6a74';
    ctx.beginPath();
    ctx.ellipse(spout.x, spout.y, R(0.014), R(0.006), 0, 0, Math.PI * 2);
    ctx.fill();
    for (const [hx0, c] of [[-0.085, '#ff6b6b'], [0.085, '#5fb4ff']] as [number, string][]) {
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(bx + R(hx0), by - R(0.005), R(0.016), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(bx + R(hx0), by - R(0.008), R(0.007), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 고양이 (뒤 오른쪽 모서리 테두리 위)
  {
    // D006 (🧪 S4): 실패 카드가 떠 있는 동안 고양이는 계속 깔깔(펄쩍) 자세
    const cAge = s.t - s.catT, mode = (cAge >= 0 && cAge < 55) || (s.manual && s.phase === 'result' && !s.ok) ? 2 : t % 420 > 300 ? 1 : 0;
    drawCat(ctx, X(0.9), Y(WY0 - 0.04), R(0.07), mode, t);
  }

  // ── 물 ──
  ctx.save();
  quadPath(wb, R(0.035));
  ctx.clip();
  {
    const g = ctx.createLinearGradient(0, wb[0][1], 0, wb[2][1]);
    g.addColorStop(0, '#a4e6f1');
    g.addColorStop(0.5, '#6ccbe0');
    g.addColorStop(1, '#3aa9c9');
    ctx.fillStyle = g;
    ctx.fillRect(0, wb[0][1] - 5, w, wb[2][1] - wb[0][1] + 10);
    // 바닥 법랑에 일렁이는 빛 무늬
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.lineWidth = 1.4;
    for (let k = 0; k < 13; k++) {
      ctx.beginPath();
      for (let x = 0; x <= 1.0001; x += 0.04) {
        const py = 0.04 + k * 0.09 + 0.018 * Math.sin(x * 9 + t * 0.025 + k * 1.7) + 0.008 * Math.sin(x * 23 - t * 0.04 + k);
        const sx = SX(x, py), sy = SY(py);
        if (x) ctx.lineTo(sx, sy);
        else ctx.moveTo(sx, sy);
      }
      ctx.stroke();
    }
    for (let k = 0; k < 18; k++) {
      const px = (hsh(k) + t * 0.0004 * (1 + (k % 3))) % 1, py = hsh(k + 50) * H;
      ctx.fillStyle = 'rgba(255,255,255,.07)';
      ctx.beginPath();
      ctx.ellipse(SX(px, py), SY(py), R(0.05 + 0.04 * hsh(k + 9)), R(0.02), 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    // 안쪽 벽 그늘 · 타일 반사
    const sg = ctx.createLinearGradient(0, wb[0][1], 0, wb[0][1] + R(0.08));
    sg.addColorStop(0, 'rgba(0,70,90,.28)');
    sg.addColorStop(1, 'rgba(0,70,90,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, wb[0][1], w, R(0.08));
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    for (let k = 0; k < 9; k++) {
      const px = 0.06 + k * 0.11, wob = Math.sin(t * 0.05 + k) * 0.006;
      ctx.fillRect(SX(px + wob, 0.02), SY(0.01), R(0.004), R(0.05));
    }
    // 창문 빛이 물에 비친 넓은 반사 · 가장자리로 갈수록 깊고 어둡게
    const sh = ctx.createLinearGradient(X(0.75), Y(0.38), X(0.3), Y(0.95));
    sh.addColorStop(0, 'rgba(255,255,255,0)');
    sh.addColorStop(0.45, 'rgba(255,255,255,.13)');
    sh.addColorStop(0.55, 'rgba(255,255,255,.13)');
    sh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(0, wb[0][1], w, wb[2][1] - wb[0][1]);
    ctx.strokeStyle = 'rgba(0,60,90,.2)';
    ctx.lineWidth = R(0.07);
    quadPath(wb, R(0.035));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,60,90,.14)';
    ctx.lineWidth = R(0.03);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // 비누 미끄럼
  for (const sl of L.slicks) {
    for (let k = 4; k >= 1; k--) {
      ctx.fillStyle = `hsla(${(t * 2 + k * 60) % 360}, 90%, 75%, ${0.1 + 0.03 * k})`;
      pcircle(sl.x + Math.sin(t * 0.03 + k) * 0.01, sl.y, sl.r * (k / 4));
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.setLineDash([R(0.01), R(0.008)]);
    ctx.lineWidth = 1.5;
    pcircle(sl.x, sl.y, sl.r);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let k = 0; k < 6; k++) {
      const a = k + t * 0.01, rr = sl.r * (0.3 + 0.6 * hsh(k + 3));
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      star(ctx, SX(sl.x + Math.cos(a) * rr, sl.y + Math.sin(a) * rr), SY(sl.y + Math.sin(a) * rr), R(0.008) * (1 + Math.sin(t * 0.2 + k)));
      ctx.fill();
    }
  }
  // 🎈 물풍선 (CONTENT §2 그림 단서 · 🎨: 빨강은 위험 색이라 파랑·보라) — 살랑살랑 + 꼭지 매듭 + 끈
  L.balloons.forEach((b, j) => {
    if ((s.popped >> j) & 1) return;
    const bx = SX(b.x, b.y) + (CALM ? 0 : Math.sin(t * 0.06 + j * 2) * R(0.004)), by = SY(b.y), br = R(0.04 * dep(b.y)); // 🧪 D015 보완 5: 0.032 → 0.04 + 진한 테두리(거품·공으로 읽히던 것)
    ctx.fillStyle = 'rgba(0,55,80,.22)';
    ctx.beginPath();
    ctx.ellipse(bx, by + br * 0.9, br * 1.1, br * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createRadialGradient(bx - br * 0.35, by - br * 0.5, br * 0.1, bx, by - br * 0.2, br * 1.2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.25, j % 2 ? '#c9b6ff' : '#9fd8ff');
    g.addColorStop(1, j % 2 ? '#7048e8' : '#1c7ed6');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(bx, by - br * 0.2, br * 0.9, br, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = j % 2 ? '#3b1f8f' : '#0b3d7a';
    ctx.lineWidth = Math.max(1.5, br * 0.12);
    ctx.stroke();
    ctx.fillStyle = j % 2 ? '#5f3dc4' : '#1864ab';
    ctx.beginPath();
    ctx.moveTo(bx, by + br * 0.75);
    ctx.lineTo(bx - br * 0.22, by + br * 1.0);
    ctx.lineTo(bx + br * 0.22, by + br * 1.0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, by + br);
    ctx.quadraticCurveTo(bx + br * 0.4, by + br * 1.4, bx - br * 0.1, by + br * 1.7);
    ctx.stroke();
  });
  // 물줄기 흐름
  for (const st of L.streams) {
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath();
    ctx.moveTo(SX(st.x0, st.y0), SY(st.y0));
    ctx.lineTo(SX(st.x1, st.y0), SY(st.y0));
    ctx.lineTo(SX(st.x1, st.y1), SY(st.y1));
    ctx.lineTo(SX(st.x0, st.y1), SY(st.y1));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = 2;
    // 🧪 D017 차단: 꺾쇠는 흐름(dx, dy) 쪽을 가리키고 그쪽으로 흐른다 — 가로 줄기(3-8·3-10)도 띠 폭 전체로
    const hz = Math.abs(st.dx) > Math.abs(st.dy), sg = (hz ? Math.sign(st.dx) : Math.sign(st.dy)) || 1;
    const a0 = hz ? st.x0 : st.y0, len = (hz ? st.x1 : st.y1) - a0, b0 = hz ? st.y0 : st.x0, b1 = hz ? st.y1 : st.x1;
    const c = (b0 + b1) / 2, hw = (b1 - b0) * (hz ? 0.42 : 0.32), dp = hz ? Math.min(0.03, (b1 - b0) * 0.4) : 0.03;
    const P = (u: number, v: number): [number, number] => (hz ? [SX(u, v), SY(v)] : [SX(v, u), SY(u)]);
    for (let k = 0; k < 8; k++) {
      const off = ((k / 8) * len + t * STREAM_V) % len, p = sg > 0 ? a0 + off : a0 + len - off, q = p - dp * sg;
      ctx.beginPath();
      ctx.moveTo(...P(q, c - hw));
      ctx.lineTo(...P(p, c));
      ctx.lineTo(...P(q, c + hw));
      ctx.stroke();
    }
  }
  // 배수구
  for (const dr of L.drains) {
    ctx.fillStyle = 'rgba(0,40,60,.18)';
    pcircle(dr.x, dr.y, dr.pr);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1.6;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      for (let q = 0; q <= 20; q++) {
        const a = -t * 0.06 + (k * Math.PI) / 2 + q * 0.16, rr = dr.pr * (1 - q / 22);
        const px = dr.x + Math.cos(a) * rr, py = dr.y + Math.sin(a) * rr;
        if (q) ctx.lineTo(SX(px, py), SY(py));
        else ctx.moveTo(SX(px, py), SY(py));
      }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,90,90,.45)';
    ctx.setLineDash([R(0.008), R(0.008)]);
    pcircle(dr.x, dr.y, dr.pr);
    ctx.stroke();
    ctx.setLineDash([]);
    const cg = ctx.createLinearGradient(SX(dr.x, dr.y) - R(0.04), 0, SX(dr.x, dr.y) + R(0.04), 0);
    cg.addColorStop(0, '#8c99a3');
    cg.addColorStop(0.5, '#f4f8fa');
    cg.addColorStop(1, '#6f7c86');
    ctx.fillStyle = cg;
    pcircle(dr.x, dr.y, 0.05);
    ctx.fill();
    ctx.fillStyle = '#1d2a33';
    pcircle(dr.x, dr.y, 0.034);
    ctx.fill();
    ctx.strokeStyle = '#b8c4cc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(SX(dr.x - 0.034, dr.y), SY(dr.y));
    ctx.lineTo(SX(dr.x + 0.034, dr.y), SY(dr.y));
    ctx.moveTo(SX(dr.x, dr.y - 0.034), SY(dr.y - 0.034));
    ctx.lineTo(SX(dr.x, dr.y + 0.034), SY(dr.y + 0.034));
    ctx.stroke();
  }
  // 둥지 (비누 거품 고리)
  L.nests.forEach((n, j) => {
    if (n.dock) {
      const cx = SX(n.x, n.y), cy = SY(n.y), ww = R(n.r * 2 * dep(n.y)), hh = R(n.r * KY * 1.5);
      ctx.fillStyle = 'rgba(80,170,255,.3)';
      ctx.beginPath();
      ctx.roundRect(cx - ww / 2, cy - hh / 2, ww, hh, R(0.02));
      ctx.fill();
      ctx.strokeStyle = '#3d8fd6';
      ctx.lineWidth = R(0.008);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.6)';
      ctx.lineWidth = 1.5;
      for (let k = 1; k < 5; k++) {
        ctx.beginPath();
        ctx.moveTo(cx - ww / 2 + (ww * k) / 5, cy - hh / 2 + 3);
        ctx.lineTo(cx - ww / 2 + (ww * k) / 5, cy + hh / 2 - 3);
        ctx.stroke();
      }
      return;
    }
    const tint = n.col >= 0 ? NEST_TINT[n.col] : 'rgba(255,255,255,', edge = n.col === 0 ? '#ffe680' : n.col === 1 ? '#ffb3d4' : '#cfeffa';
    const bubble = (px: number, py: number, br: number) => {
      const bx = SX(px, py), by = SY(py);
      const bg = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.4, br * 0.1, bx, by, br);
      bg.addColorStop(0, '#ffffff');
      bg.addColorStop(0.75, '#f4fbff');
      bg.addColorStop(1, edge);
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    };
    if (!n.mom) {
      // 모서리 거품 더미: 원 안이 거품으로 가득
      ctx.fillStyle = 'rgba(255,255,255,.42)';
      pcircle(n.x, n.y, n.r * 0.95);
      ctx.fill();
      for (let k = 0; k < 34; k++) {
        const a = hsh(k * 7 + j * 3) * Math.PI * 2, q = Math.sqrt(hsh(k * 11 + j)) * n.r * 0.95, px = n.x + Math.cos(a) * q, py = n.y + Math.sin(a) * q;
        bubble(px, py, R((0.012 + 0.012 * hsh(k * 5 + j)) * dep(py)) * (1 + 0.06 * Math.sin(t * 0.08 + k)));
      }
      return;
    }
    const cg = ctx.createRadialGradient(SX(n.x, n.y), SY(n.y), 0, SX(n.x, n.y), SY(n.y), R(n.r));
    cg.addColorStop(0, tint + (n.col >= 0 ? '.34)' : '.24)'));
    cg.addColorStop(1, tint + '.08)');
    ctx.fillStyle = cg;
    pcircle(n.x, n.y, n.r);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = R(0.022 * dep(n.y));
    pcircle(n.x, n.y, n.r);
    ctx.stroke();
    for (let k = 0; k < 34; k++) {
      const a = (k / 34) * Math.PI * 2 + j, rr = n.r * (0.94 + 0.12 * hsh(k + j * 13)), px = n.x + Math.cos(a) * rr, py = n.y + Math.sin(a) * rr;
      bubble(px, py, R((0.01 + 0.009 * hsh(k * 3 + j)) * dep(py)) * (1 + 0.08 * Math.sin(t * 0.1 + k)));
    }
  });
  // ── 물결 고리 ──
  const ringArc = (g: Ring, im: number, rr: number) => {
    const ix = imgX(g, im), iy = imgY(g, im), N = 80;
    let pen = false, any = false;
    ctx.beginPath();
    for (let k = 0; k <= N; k++) {
      const a = (k / N) * Math.PI * 2, px = ix + Math.cos(a) * rr, py = iy + Math.sin(a) * rr;
      const ok = px > -0.01 && px < W + 0.01 && py > -0.01 && py < H + 0.01 && !(L.islands.length && shadow(L, g.x, g.y, ix, iy, px, py, im));
      if (ok) {
        if (pen) ctx.lineTo(SX(px, py), SY(py));
        else ctx.moveTo(SX(px, py), SY(py));
        any = true;
      }
      pen = ok;
    }
    return any;
  };
  for (const g of s.rings) {
    const a = Math.max(0, 1 - g.r / RMAX);
    for (let im = 0; im < 5; im++) {
      const k = im ? REFL : 1;
      // 솟은 물마루(안쪽 밝은 띠) → 하얀 마루선 → 바깥 골(어두운 선)
      if (g.r > 0.03 && ringArc(g, im, g.r - 0.022)) {
        ctx.globalAlpha = 0.3 * a * k;
        ctx.strokeStyle = '#e8fbff';
        ctx.lineWidth = R(0.04) * a + 2;
        ctx.stroke();
      }
      if (ringArc(g, im, g.r)) {
        ctx.globalAlpha = 0.25 * a * k;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = R(0.03) * a + 2;
        ctx.stroke();
        ctx.globalAlpha = Math.min(1, 1.1 * a * k + 0.08);
        ctx.lineWidth = R(0.013) * a + 1.4;
        ctx.stroke();
      }
      if (ringArc(g, im, g.r + 0.014)) {
        ctx.globalAlpha = 0.42 * a * k;
        ctx.strokeStyle = '#1a6f8c';
        ctx.lineWidth = R(0.008) * a + 1;
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  // 밀려 가는 것 뒤의 물살 (V자)
  for (const o of s.objs) {
    const sp = Math.hypot(o.vx, o.vy);
    if (o.st !== FREE || sp < 0.002) continue;
    const ux = o.vx / sp, uy = o.vy / sp, bx = o.x - ux * RAD[o.k] * 0.9, by = o.y - uy * RAD[o.k] * 0.9, L0 = Math.min(0.055, sp * 3.5);
    ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.85, sp * 60)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const sd of [-1, 1]) {
      const ex = bx - ux * L0 + sd * -uy * L0 * 0.9, ey = by - uy * L0 + sd * ux * L0 * 0.9;
      ctx.moveTo(SX(bx, by), SY(by));
      ctx.lineTo(SX(ex, ey), SY(ey));
    }
    ctx.stroke();
  }
  // 두 고리가 만나는 자리: 반짝
  for (let i = 0; i < s.rings.length; i++)
    for (let j = i + 1; j < s.rings.length; j++) {
      const p = s.rings[i], q = s.rings[j], dx = q.x - p.x, dy = q.y - p.y, dd = Math.hypot(dx, dy);
      if (dd < 1e-6 || dd > p.r + q.r || dd < Math.abs(p.r - q.r)) continue;
      const a0 = (p.r * p.r - q.r * q.r + dd * dd) / (2 * dd), hh = Math.sqrt(Math.max(0, p.r * p.r - a0 * a0));
      for (const sd of [-1, 1]) {
        const px = p.x + (a0 * dx) / dd + (sd * hh * -dy) / dd, py = p.y + (a0 * dy) / dd + (sd * hh * dx) / dd;
        if (!inWater(px, py)) continue;
        ctx.fillStyle = '#ffffff';
        star(ctx, SX(px, py), SY(py), R(0.018) * (1 - Math.max(p.r, q.r) / RMAX) + 2);
        ctx.fill();
      }
    }
  // 1판 첫 톡 전: 여기를 톡!
  if (s.stage === 0 && !s.firstTap && s.phase === 'play') {
    const fr = s.objs.filter((o) => o.k === DUCK);
    const cx = fr.reduce((a, o) => a + o.x, 0) / fr.length, cy = fr.reduce((a, o) => a + o.y, 0) / fr.length + 0.02;
    const pulse = (t % 50) / 50;
    ctx.strokeStyle = `rgba(255,255,255,${1 - pulse})`;
    ctx.lineWidth = 3;
    pcircle(cx, cy, 0.02 + pulse * 0.12);
    ctx.stroke();
  }
  ctx.restore(); // 물 clip 끝

  // ── 미리 보기 (꾹 누르고 있는 동안): 이 자리에 찰박하면 어디로 가나 ──
  let pv: { x: number; y: number } | null = null;
  if (s.down && s.aim && s.phase === 'play' && s.taps > 0) {
    const q = toPlane(s.aim.x, s.aim.y);
    if (inWater(q.x, q.y, -0.03)) pv = { x: Math.max(0.005, Math.min(W - 0.005, q.x)), y: Math.max(0.005, Math.min(H - 0.005, q.y)) };
  }
  let paths: { k: number; col: number; pts: number[]; end: number }[] = [];
  if (pv) {
    const key = `${s.t}:${pv.x.toFixed(3)}:${pv.y.toFixed(3)}`;
    const c = PREV.get(s);
    if (c && c.key === key) paths = c.paths;
    else {
      paths = previewPaths(s, pv.x, pv.y);
      PREV.set(s, { key, paths });
    }
  }

  // ── 떠 있는 것들 (뒤에서 앞으로) ──
  const items: { y: number; f: () => void }[] = [];
  for (const is of L.islands)
    items.push({
      y: is.y,
      f: () => {
        const cx = SX(is.x, is.y), cy = SY(is.y), rr = R(is.r * scl(is.y));
        ctx.fillStyle = 'rgba(0,55,80,.25)';
        ctx.beginPath();
        ctx.ellipse(cx + rr * 0.1, cy + rr * 0.25, rr * 1.15, rr * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        for (let k = 0; k < 16; k++) {
          const a = hsh(k + is.x * 100) * Math.PI * 2, q = Math.sqrt(hsh(k * 7 + 3)), z = (1 - q) * 0.9;
          const bx = cx + Math.cos(a) * rr * q * 0.85, by = cy + Math.sin(a) * rr * q * 0.5 - rr * z * 0.7, br = rr * (0.3 + 0.18 * hsh(k + 11)) * (1 + 0.04 * Math.sin(t * 0.08 + k));
          const bg = ctx.createRadialGradient(bx - br * 0.35, by - br * 0.4, br * 0.1, bx, by, br);
          bg.addColorStop(0, '#ffffff');
          bg.addColorStop(0.7, '#eef9ff');
          bg.addColorStop(1, '#b6dbea');
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
        }
        // 섬 위에서 조는 고무 개구리
        const fx0 = cx, fy0 = cy - rr * 0.95, fu = rr * 0.32;
        ctx.fillStyle = '#7ed36a';
        ctx.beginPath();
        ctx.ellipse(fx0, fy0, fu * 1.2, fu * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        for (const sd of [-1, 1]) {
          ctx.fillStyle = '#7ed36a';
          ctx.beginPath();
          ctx.arc(fx0 + sd * fu * 0.55, fy0 - fu * 0.65, fu * 0.38, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#1a3a1a';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(fx0 + sd * fu * 0.55, fy0 - fu * 0.62, fu * 0.2, 0.2, Math.PI - 0.2);
          ctx.stroke();
        }
        ctx.strokeStyle = '#2a5a2a';
        ctx.beginPath();
        ctx.arc(fx0, fy0 + fu * 0.05, fu * 0.4, 0.3, Math.PI - 0.3);
        ctx.stroke();
      },
    });
  L.nests.forEach((n) => {
    if (!n.mom) return;
    const my = n.y - n.r * 0.55;
    items.push({ y: my, f: () => drawDuck(ctx, SX(n.x, my), SY(my), R(0.05 * dep(my)), n.col === 1 ? DUCK_COL[1] : DUCK_COL[0], n.x > 0.5 ? -1 : 1, Math.sin(t * 0.05 + n.x * 9) * 0.06, 3, t + 7, 2) });
  });
  s.objs.forEach((o, i) => {
    if (o.st === EATEN) return;
    if (o.st === SUCKED) {
      // 배수구에 엉덩이만 쏙 — 발을 버둥버둥 (실패는 웃음)
      const dr = L.drains.reduce((a, b) => (Math.hypot(b.x - o.x, b.y - o.y) < Math.hypot(a.x - o.x, a.y - o.y) ? b : a), L.drains[0]);
      if (!dr) return;
      items.push({
        y: dr.y,
        f: () => {
          const x = SX(dr.x, dr.y), y = SY(dr.y), u = R(0.046 * dep(dr.y)), col = o.k === GOLD ? GOLD_COL : DUCK_COL[o.col];
          ctx.save();
          ctx.translate(x, y - u * 0.2);
          ctx.rotate(Math.sin(t * 0.3 + i) * 0.35);
          ctx.fillStyle = col[1];
          ctx.beginPath();
          ctx.ellipse(0, -u * 0.35, u * 0.7, u * 0.55, 0, Math.PI, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = col[2];
          ctx.beginPath();
          ctx.moveTo(-u * 0.15, -u * 0.85);
          ctx.lineTo(u * 0.05, -u * 1.25);
          ctx.lineTo(u * 0.22, -u * 0.8);
          ctx.fill();
          ctx.fillStyle = '#ff8a2a';
          for (const sd of [-1, 1]) {
            ctx.save();
            ctx.translate(sd * u * 0.35, -u * 0.8);
            ctx.rotate(sd * (0.4 + Math.sin(t * 0.6 + sd) * 0.5));
            ctx.beginPath();
            ctx.ellipse(0, -u * 0.25, u * 0.13, u * 0.28, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();
          ctx.fillStyle = 'rgba(255,255,255,.8)';
          for (let k = 0; k < 3; k++) {
            const age = (t + k * 13) % 40;
            ctx.beginPath();
            ctx.arc(x + Math.sin(k * 2 + t * 0.1) * u * 0.7, y - u - age * u * 0.05, u * 0.12 * (1 - age / 40) + 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
        },
      });
      return;
    }
    items.push({
      y: o.y,
      f: () => {
        const x = SX(o.x, o.y), y = SY(o.y) + Math.sin(t * 0.07 + i * 2) * R(0.003), u = R((o.k === SHARK ? 0.06 : o.k === BOAT ? 0.05 : o.lead >= 0 ? 0.026 : 0.04) * dep(o.y)); // 🐥 아기는 0.65배
        const tilt = Math.sin(t * 0.35 + i) * 0.35 * o.spin + Math.sin(t * 0.05 + i) * 0.04;
        if (o.k === SHARK) drawShark(ctx, x, y, u, o.face, o.mood, t, s.objs.some((q) => q.st === EATEN));
        else if (o.k === BOAT) drawBoat(ctx, x, y, u, o.face, tilt);
        else {
          const cr = o.k === GOLD && crisisShown(s); // ART 12장: 황금 '꼴찌 위기'는 얼굴·몸은 그대로, 발밑 고리·왕관·말풍선만
          if (cr) {
            // ① 물 위 주황 고리 — 크기 고정, 알파 .35↔.95 (32틱), reduced-motion이면 .8
            ctx.save();
            ctx.globalAlpha = CALM ? 0.8 : 0.65 + 0.3 * Math.sin((t / 32) * Math.PI * 2);
            ctx.strokeStyle = '#ff9f43';
            ctx.lineWidth = Math.max(2, w * 0.007);
            ctx.beginPath();
            ctx.ellipse(x, y + u * 0.3, u * 1.35, u * 0.42, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
          drawDuck(ctx, x, y, u, o.k === GOLD ? GOLD_COL : DUCK_COL[o.col], o.face, tilt + (o.spin > 0.3 ? Math.sin(t * 0.5) * 0.2 * o.spin : 0), o.mood, cr ? t : t + i * 5, o.k === GOLD ? (cr ? 3 : 1) : 0);
          const age = s.t - s.crisisT - CRISIS_DELAY;
          if (cr && age < 90) {
            // ③ 첫 진입 말풍선 '나 먼저!' 90틱, 마지막 12틱 페이드 · 🧪 D009: 머리 위 대신 옆(욕조 가운데 쪽) — 황금을 칠 물을 가리지 않게
            ctx.save();
            ctx.globalAlpha = age > 78 ? (90 - age) / 12 : 1;
            font(0.036, 900);
            const txt = '나 먼저!', bw = ctx.measureText(txt).width + R(0.04), bh = R(0.05);
            const side = x < X(0.5) ? 1 : -1, bx0 = side > 0 ? x + u * 1.5 : x - u * 1.5 - bw;
            const bx = Math.max(X(0.08), Math.min(X(0.92) - bw, bx0)), by = y - u * 1.3 - bh / 2;
            ctx.fillStyle = '#fffaf0';
            ctx.strokeStyle = '#ff9f43';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(bx, by, bw, bh, bh / 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#123a48';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(txt, bx + bw / 2, by + bh / 2);
            ctx.restore();
          }
        }
      },
    });
  });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();

  // 미리 보기 그리기
  if (pv) {
    ctx.save();
    quadPath(wb, R(0.035));
    ctx.clip();
    ctx.setLineDash([R(0.012), R(0.01)]);
    ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.lineWidth = 1.5;
    pcircle(pv.x, pv.y, RMAX);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    pcircle(pv.x, pv.y, 0.025);
    ctx.stroke();
    for (const p of paths) {
      const n = p.pts.length / 2;
      if (n < 2) continue;
      const x0 = p.pts[0], y0 = p.pts[1], x1 = p.pts[p.pts.length - 2], y1 = p.pts[p.pts.length - 1];
      if (Math.hypot(x1 - x0, y1 - y0) < 0.012 && p.end === FREE) continue;
      const col = p.k === SHARK ? '#cfe0ff' : p.k === GOLD ? '#ffe066' : p.col === 1 ? '#ffb3d4' : '#fff6a0';
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([R(0.01), R(0.008)]);
      ctx.beginPath();
      for (let k = 0; k < n; k++) {
        const sx = SX(p.pts[k * 2], p.pts[k * 2 + 1]), sy = SY(p.pts[k * 2 + 1]);
        if (k) ctx.lineTo(sx, sy);
        else ctx.moveTo(sx, sy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      // 화살촉
      const xa = p.pts[p.pts.length - 4] ?? x0, ya = p.pts[p.pts.length - 3] ?? y0;
      const ex = SX(x1, y1), ey = SY(y1), ang = Math.atan2(ey - SY(ya), ex - SX(xa, ya));
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(ang) * R(0.022), ey + Math.sin(ang) * R(0.022));
      ctx.lineTo(ex + Math.cos(ang + 2.5) * R(0.018), ey + Math.sin(ang + 2.5) * R(0.018));
      ctx.lineTo(ex + Math.cos(ang - 2.5) * R(0.018), ey + Math.sin(ang - 2.5) * R(0.018));
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      if (p.end !== FREE) {
        const good = p.end >= 0;
        ctx.fillStyle = good ? '#3ccf7a' : '#ff5a5a';
        ctx.beginPath();
        ctx.arc(ex, ey - R(0.035), R(0.022), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        font(0.03, 900);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(good ? '✓' : '✗', ex, ey - R(0.034));
      }
    }
  }

  // 김 (모락모락)
  for (let k = 0; k < 6; k++) {
    const age = (t * 0.6 + k * 70) % 420, x = X(0.15 + 0.7 * hsh(k * 5 + Math.floor((t * 0.6 + k * 70) / 420))), y = Y(WY0 + 0.1) - age * R(0.0012);
    ctx.fillStyle = `rgba(255,255,255,${0.12 * Math.sin((age / 420) * Math.PI)})`;
    ctx.beginPath();
    ctx.arc(x + Math.sin(age * 0.03) * R(0.03), y, R(0.04 + age * 0.00012), 0, Math.PI * 2);
    ctx.fill();
  }
  // 물줄기 기둥 (수도꼭지에서)
  if (L.streams.length && Math.abs(L.streams[0].dx) > Math.abs(L.streams[0].dy)) {
    // 🧪 D017 차단: 가로 줄기(3-8·3-10)는 뒤 수도꼭지 물기둥과 안 이어진다 → 위쪽 끝 옆벽 꼭지에서 흐름 쪽으로 뿜는다
    const st = L.streams[0], sg = Math.sign(st.dx), cy = (st.y0 + st.y1) / 2, ex = SX(sg > 0 ? st.x0 : st.x1, cy), ey = SY(cy);
    ctx.fillStyle = '#9aa7b0';
    ctx.beginPath();
    ctx.roundRect(ex - R(0.028), ey - R(0.014), R(0.056), R(0.028), R(0.01));
    ctx.fill();
    ctx.fillStyle = '#5d6a74';
    ctx.beginPath();
    ctx.ellipse(ex + sg * R(0.026), ey, R(0.005), R(0.01), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let k = 0; k < 6; k++) {
      const f = ((t + k * 9) % 54) / 54;
      ctx.beginPath();
      ctx.arc(ex + sg * R(0.03 + f * 0.09), ey + Math.sin(t * 0.3 + k * 2) * R(0.012) * f, R(0.006 * (1 - f * 0.5)), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (L.streams.length) {
    const st = L.streams[0], ex = SX((st.x0 + st.x1) / 2, 0.02), ey = SY(0.02);
    const g = ctx.createLinearGradient(0, spout.y, 0, ey);
    g.addColorStop(0, 'rgba(220,250,255,.95)');
    g.addColorStop(1, 'rgba(160,230,250,.75)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(spout.x - R(0.01), spout.y);
    ctx.lineTo(spout.x + R(0.01), spout.y);
    ctx.lineTo(ex + R(0.016), ey);
    ctx.lineTo(ex - R(0.016), ey);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI + Math.sin(t * 0.3 + k) * 0.3;
      ctx.beginPath();
      ctx.arc(ex + Math.cos(a) * R(0.03), ey - Math.abs(Math.sin(a)) * R(0.02) - ((t + k * 7) % 14) * 0.6, R(0.006), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (t % 160 < 30) {
    ctx.fillStyle = 'rgba(200,240,255,.9)';
    ctx.beginPath();
    ctx.ellipse(spout.x, spout.y + (t % 160) * R(0.0012) + R(0.008), R(0.005), R(0.008), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 사건 연출 ──
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = SX(e.x, e.y), y = e.kind === 'cat' ? Y(WY0 - 0.15) : SY(e.y);
    if (e.kind === 'splash') fx.burst(x, y, '#ffffff', 22, 3.6, 2.6), fx.burst(x, y, '#8fe6ff', 14, 2.8, 2.2), fx.ring(x, y, '#ffffff', R(0.1), 4), fx.kick(3), say(x, y - R(0.05), e.text!, '#ffffff', 17);
    if (e.kind === 'quack') fx.burst(x, y - R(0.02), '#ffffff', 6, 1.8, 1.8), say(x, y - R(0.07), e.text!, e.col ?? '#fff3a0', 13);
    if (e.kind === 'balloon') fx.burst(x, y, '#9fd8ff', 16, 3.2, 2.2), fx.burst(x, y, '#ffffff', 8, 2.4, 1.8), fx.kick(3), say(x, y - R(0.07), e.text!, '#dff4ff', 15);
    if (e.kind === 'pong') (CALM || fx.burst(x + R(0.04), y - R(0.02), '#ffffff', 5, 1.8, 1.6)), say(x, y - R(0.09), e.text!, '#dff4ff', 14);
    if (e.kind === 'wake') fx.burst(x, y - R(0.04), '#5b7cfa', 10, 2.6, 2.2), fx.burst(x, y - R(0.03), '#ffffff', 8, 2, 2), say(x, y - R(0.08), e.text!, '#dfe6ff', 15);
    if (e.kind === 'refl') fx.ring(x, y, '#bff3ff', R(0.06), 2), say(x, y - R(0.07), e.text!, '#bff3ff', 13);
    if (e.kind === 'duo') fx.burst(x, y, '#bff3ff', 20, 4, 2.4), fx.ring(x, y, '#ffffff', R(0.08), 4), fx.kick(5), say(x, y - R(0.08), e.text!, '#9ff0ff', 15);
    if (e.kind === 'bonk') fx.burst(x, y - R(0.02), '#ffffff', 8, 2.2, 2), fx.kick(2), say(x, y - R(0.06), e.text!, '#ffe3b0', 13);
    if (e.kind === 'stun') fx.burst(x, y, '#fff27a', 12, 2.6, 2.2), fx.kick(3), say(x, y - R(0.09), e.text!, '#dfe9ff', 14);
    if (e.kind === 'nest') fx.burst(x, y - R(0.02), '#ffe066', 18, 3.4, 2.4), fx.burst(x, y, '#ffffff', 10, 2.4, 2.2), fx.ring(x, y, '#ffe066', R(0.07), 3), say(x, y - R(0.08), e.text!, '#fff3a0', 15);
    if (e.kind === 'gold') fx.burst(x, y - R(0.02), '#ffd43b', 32, 4.6, 2.8), fx.ring(x, y, '#ffe066', R(0.11), 5), fx.blink('#fff6c8', 0.18), say(x, y - R(0.08), e.text!, '#ffd84a', 17);
    if (e.kind === 'suck') fx.burst(x, y, '#9fdcef', 26, 4, 2.6), fx.ring(x, y, '#1d5a72', R(0.08), 4), fx.kick(7), say(x, y - R(0.07), e.text!, '#ffd0d0', 16);
    if (e.kind === 'pop') fx.burst(x, y, '#bff3ff', 18, 3.4, 2.4), fx.ring(x, y, '#ffffff', R(0.06), 3), say(x, y + R(0.06), e.text!, '#ffe9a8', 18);
    if (e.kind === 'chomp') fx.burst(x, y, '#ffffff', 26, 4.4, 2.8), fx.kick(9), fx.blink(th.hot, 0.2), say(x, y - R(0.09), e.text!, '#ffb3b3', 18);
    if (e.kind === 'cat') fx.burst(x, y, '#ffb066', 10, 2.6, 2), say(x - R(0.06), y, e.text!, '#ffd9b0', 14);
    if (e.kind === 'nope') say(x, y, e.text!, '#ffd6cc', 13), fx.kick(1.5);
    if (e.kind === 'clear') fx.burst(w * 0.3, Y(0.55), '#ffe066', 40, 6, 3.2), fx.burst(w * 0.7, Y(0.55), '#ff9ec4', 40, 6, 3.2), fx.burst(w * 0.5, Y(0.7), '#ffffff', 40, 6, 3), fx.ring(w / 2, Y(0.65), '#ffe066', R(0.45), 7), fx.blink('#fff6c8', 0.22);
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.18);
  }
  fx.memo.t = s.t;
  ctx.restore();

  // ═════════════ HUD ═════════════
  const hb = R(0.08);
  ctx.fillStyle = 'rgba(12,48,62,.86)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.045, 900);
  const wd = worldOf(STAGES[s.stage].id), ttl = `${wd.emoji} ${STAGES[s.stage].id}`, tw1 = ctx.measureText(ttl).width; // D007 🧪: 판 고르기와 같은 이름
  ctx.fillText(ttl, R(0.03), hb * 0.52);
  font(0.034, 800);
  ctx.fillStyle = th.muted;
  ctx.fillText(` ${wd.name}`, R(0.03) + tw1, hb * 0.56);
  ctx.textAlign = 'right';
  font(0.042, 900);
  ctx.fillStyle = '#ffd84a';
  const stt = `★ ${s.stars}/${STAGE_COUNT * 3}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  if (s.stageTries > 0) {
    font(0.036, 800);
    ctx.fillStyle = th.soft;
    ctx.fillText(`↺ ${s.stageTries}`, w - R(0.06) - ctx.measureText(stt).width * 1.15, hb * 0.52);
  }
  // 새것 알림 (타일 벽 위 띠)
  if (s.news && s.t - s.news.t < NEWS_T) {
    const age = s.t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tx = s.news.text, tw2 = Math.min(w - 10, ctx.measureText(tx).width + 24), by2 = Y(BAND - 0.036) + drop;
    ctx.fillStyle = 'rgba(12,48,62,.92)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.026), tw2, R(0.052), R(0.026));
    ctx.fill();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, by2, w - 24);
    ctx.globalAlpha = 1;
  }
  // 판 카드: 시작 · 목욕 끝 · 실패
  {
    let head = '', sub = '', nw = '', col = '#ffffff', age = 0, a = 1;
    if (s.phase === 'result' && s.manual) {
      // D004: 결과·실패 카드는 DOM(main.ts)이 그린다. 실패 때는 남은 오리에 '?' 표시
      if (!s.ok)
        for (const o of s.objs) {
          if (o.st !== FREE || (o.k !== DUCK && o.k !== BOAT)) continue; // 🧪 D004: '?'는 '🦆 n마리 남음'과 같은 것만(황금 오리 제외)
          const x = SX(o.x, o.y), y = SY(o.y), rr = R(0.06 * dep(o.y));
          ctx.strokeStyle = '#ff6b6b';
          ctx.lineWidth = 3;
          ctx.setLineDash([R(0.01), R(0.008)]);
          ctx.beginPath();
          ctx.arc(x, y - rr * 0.3, rr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          font(0.05, 900);
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#123a48';
          ctx.lineWidth = 4;
          ctx.strokeText('?', x, y - rr * 1.5);
          ctx.fillText('?', x, y - rr * 1.5);
        }
    } else if (s.phase === 'result') {
      age = s.pt;
      if (s.ok) (head = s.won ? '목욕 다 끝! 🛁' : '목욕 끝!'), (sub = `다 넣음 ✓ · 톡 ${s.used}번${s.used <= d.par ? ' ✓' : ` (≤${d.par} ✗)`} · 황금 오리 ${s.starOk[2] ? '✓' : '✗'}`), (col = '#ffd84a');
      else (head = `꽥… ${s.why}`), (sub = `${s.sucks ? `쏙 ×${s.sucks} · ` : ''}${s.chomps ? `꿀꺽 ×${s.chomps} · ` : ''}괜찮아요 — 같은 목욕 다시!`), (col = '#ffb3a8');
    } else if (s.pt < CARD_T) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20);
      head = `${s.again ? '다시! ' : ''}${worldOf(d.id).emoji} ${d.id} 목욕`;
      sub = d.ask ?? `오리 ${d.ducks.length}마리${d.boat ? ' + 배' : ''} · 톡 ${d.taps}번 · ★ 톡 ${d.par}번 이하`;
      nw = d.news;
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = Y(nw ? 0.165 : 0.19), ch = nw ? 0.158 : 0.11;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(12,48,62,.92)';
      ctx.beginPath();
      ctx.roundRect(-R(nw ? 0.44 : 0.38), -R(0.055), R(nw ? 0.88 : 0.76), R(ch), R(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.048, 900);
      if (s.phase === 'result' && s.ok) {
        const hw = ctx.measureText(head).width, sw = R(0.056), x0 = -(hw + R(0.02) + sw * 3) / 2;
        ctx.textAlign = 'left';
        ctx.fillText(head, x0, -R(0.018));
        for (let k = 0; k < 3; k++) {
          const ag = s.pt - (10 + k * 13);
          if (ag < 0) continue;
          const got = s.starOk[k], pop = ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1, sx = x0 + hw + R(0.02) + sw * (k + 0.5);
          ctx.save();
          ctx.translate(sx, -R(0.018));
          ctx.scale(pop, pop);
          star(ctx, 0, 0, R(0.024));
          ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.12)';
          ctx.fill();
          ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx, cyy - R(0.018), '#ffe066', 16, 3, 2.4);
        }
        ctx.textAlign = 'center';
      } else ctx.fillText(head, 0, -R(0.018), R(0.72));
      ctx.fillStyle = '#fffaf0';
      font(0.036, 800);
      ctx.fillText(sub, 0, R(0.03), R(0.72));
      if (nw) {
        ctx.fillStyle = '#ffe9a8';
        font(0.037, 900);
        ctx.fillText(nw, 0, R(0.077), R(0.84));
      }
      ctx.restore();
    }
  }
  // ═════════════ 아래 띠 ═════════════
  {
    const ty = BAND, tb = h / w;
    const g = ctx.createLinearGradient(0, Y(ty), 0, Y(tb));
    g.addColorStop(0, 'rgba(14,58,74,.94)');
    g.addColorStop(1, 'rgba(8,36,48,.97)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, Y(ty), w, Y(tb - ty) + 4, [R(0.03), R(0.03), 0, 0]);
    ctx.fill();
    // 톡 남은 수: 물방울 (★ 선까지 쓰면 별)
    const r1 = Y(ty + 0.04);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e6f8ff';
    font(0.038, 900);
    ctx.fillText('톡', X(0.03), r1);
    const dx0 = X(0.1), dstep = R(0.05);
    for (let k = 0; k < d.taps; k++) {
      const cx = dx0 + k * dstep + (k >= d.par ? R(0.018) : 0), used = k < s.used, inPar = k < d.par;
      ctx.beginPath();
      ctx.moveTo(cx, r1 - R(0.022));
      ctx.bezierCurveTo(cx + R(0.018), r1 - R(0.002), cx + R(0.016), r1 + R(0.016), cx, r1 + R(0.016));
      ctx.bezierCurveTo(cx - R(0.016), r1 + R(0.016), cx - R(0.018), r1 - R(0.002), cx, r1 - R(0.022));
      if (used) {
        ctx.strokeStyle = 'rgba(255,255,255,.3)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        const dg = ctx.createLinearGradient(0, r1 - R(0.02), 0, r1 + R(0.016));
        dg.addColorStop(0, inPar ? '#bff6ff' : '#9fd8ee');
        dg.addColorStop(1, inPar ? '#2fb4e8' : '#3a8fb8');
        ctx.fillStyle = dg;
        ctx.fill();
      }
    }
    // ★ 선
    const lx = dx0 + d.par * dstep - dstep / 2 + R(0.009);
    ctx.strokeStyle = '#ffd84a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, r1 - R(0.026));
    ctx.lineTo(lx, r1 + R(0.022));
    ctx.stroke();
    ctx.fillStyle = '#ffd84a';
    font(0.03, 900);
    ctx.textAlign = 'center';
    ctx.fillText('★', lx, r1 - R(0.034));
    ctx.textAlign = 'right';
    font(0.036, 800);
    ctx.fillStyle = s.taps > 0 ? '#bfeaf2' : '#ffb3a8';
    ctx.fillText(`${s.taps}번 남음`, X(0.97), r1);
    // 별 목표 셋
    const { ducksIn, ducksAll, okk, bad } = starChips(s);
    const labels = [`${d.boat ? '오리·배' : '오리'} ${ducksIn}/${ducksAll}`, `톡 ≤${d.par}`, '👑 꼴찌 말고']; // D007 CONTENT v0.3 ③: 황금 문구 통일 — 기준 문장 '👑 황금 오리가 꼴찌만 아니면 ★'
    // D007 ③ 꼴찌 위기: 남은 오리 1마리인데 황금 오리가 아직 떠 있으면 셋째 칩이 주황으로 깜박
    // ART 12장 3: 위기 동안 글자는 '👑 꼴찌 될라!'로 고정, 주황 테만 몸과 같은 32틱으로 숨쉰다
    const crisis = crisisShown(s);
    if (crisis) labels[2] = '👑 꼴찌 될라!';
    const r2 = Y(ty + 0.112), cw2 = R(0.3);
    for (let k = 0; k < 3; k++) {
      const cx1 = X(0.03) + k * (cw2 + R(0.017));
      ctx.fillStyle = okk[k] ? 'rgba(255,216,74,.25)' : bad[k] ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.08)';
      ctx.beginPath();
      ctx.roundRect(cx1, r2 - R(0.026), cw2, R(0.052), R(0.026));
      ctx.fill();
      ctx.strokeStyle = k === 2 && crisis ? `rgba(255,159,67,${CALM ? 0.8 : 0.65 + 0.3 * Math.sin((t / 32) * Math.PI * 2)})` : okk[k] ? '#ffd84a' : bad[k] ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = okk[k] ? '#ffd84a' : bad[k] ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.6)';
      font(0.04, 900);
      ctx.textAlign = 'center';
      ctx.fillText(bad[k] ? '✗' : '★', cx1 + R(0.03), r2 + R(0.002));
      ctx.fillStyle = okk[k] ? '#fff6dc' : bad[k] ? 'rgba(255,255,255,.4)' : '#e6f8ff';
      font(0.036, 800);
      ctx.textAlign = 'left';
      ctx.fillText(labels[k], cx1 + R(0.058), r2 + R(0.002), cw2 - R(0.066));
    }
    // 안내 한 줄
    let hint = d.hint;
    const first = s.stage === 0 && !s.firstTap && s.phase === 'play';
    if (first) hint = '👆 오리들 한가운데 물을 톡! 찰박 물결이 밀어 줘요';
    else if (s.down && s.phase === 'play') hint = s.taps > 0 ? '떼면 찰박! 점선 = 오리가 갈 길' : '톡을 다 썼어요';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 목욕 끝! 오리들이 뽀득뽀득' : `★ ${s.got}개! 다음 목욕엔 새것이 나와요`) : s.manual ? '' : '꾹 누르면 오리가 갈 길이 보여요'; // D006: 실패 카드가 팁을 말하는 동안 HUD 팁은 숨김(S7)
    else if (s.stage === 0) hint = '꾹 누르고 있으면 오리가 갈 길이 점선으로 보여요';
    ctx.textAlign = 'center';
    ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
    font(first ? 0.042 : 0.037, 900);
    ctx.fillText(hint, w / 2, Y(ty + 0.19), w - R(0.05));
  }
}
