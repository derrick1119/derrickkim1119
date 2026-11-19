/**
 * 🥷 느린 시간 닌자 스튜디오 — M0: 공장 arcade/games/slowdash.ts(읽기만)를 복사해 여기서 키운다. 아래 설명은 프로토타입 그대로.
 *
 * 느린 시간 닌자 (31라운드: 실시간 액션) — 느린 시간 돌진 × 가리키기 × 연쇄.
 * 기준 9(손이 하는 일은 하나): 화면을 꾹 = 세상이 느려지고(색이 바래고 '스으…') 닌자에서 손가락까지 돌진 선이 보인다.
 *   떼는 순간 '번쩍!' 그 선을 따라 한순간에 돌진하며 선 위의 적을 모두 벤다. 키보드는 화살표로 커서 + 스페이스(누르는 동안 느려짐).
 * 규칙(결정적, 3줄): 돌진 값 = 5 + 22×길이(멀리 갈수록 비싸다). 꾹 누르고 있는 동안에도 게이지가 조금씩 준다(다 떨어지면 저절로 돌진).
 *   한 번에 n번째로 벤 적은 게이지 +7n·점수 ×n — 그래서 여럿을 한 줄에 세워 베야 게이지가 오히려 찬다(아끼기·줄 세우기).
 *   게이지가 모자라면 갈 수 있는 데까지만, 바닥이면 짧게(공짜)만 돌진한다. 닌자 위에서 떼면 취소.
 *   맞으면 체력 -1, 체력 셋을 다 잃으면 하트 -1·그 판 다시(하트 셋을 다 잃거나 8판을 마치면 끝).
 * 와우: 첫 꾹에 세상이 회색으로 느려지고, 떼자 허수아비 셋이 한 줄로 '번쩍' — 칼을 집어넣는 '찰칵'과 함께 셋이 반으로 갈라진다.
 * 판 8개: 목표 = 숲·지붕·마당 지나가기(적을 모두 베기). 별 = ★ 지나가기 · ★·★ 판마다 다른 쉬운 한 줄(한 번에 넷 베기 · 한 번도 안 맞기 …).
 * 펼쳐짐(하는 일이 바뀐다): 1판 허수아비(줄 세워 베기) → 2판 칼잡이(다가와 휘두름 → 몰려올 때 한 줄로) → 3판 화살병(날아오는 화살 피하기·베기)
 *   → 4판 수리검(부채꼴 셋 → 비껴 서기) → 5판 방패 무사(앞에서 베면 튕김 → 옆으로 지나가 뒤에서) → 6판 폭탄 통(꾀어 모아 같이 펑)
 *   → 7판 거울(선이 꺾임 → 돌아서 베기) → 8판 대장 + 연기(연기 속에 내리면 적이 나를 못 봄).
 * 웃음: 헛방 친 칼잡이는 칼이 땅에 박혀 버둥, 맞은 닌자는 꼬리털이 부스스, 베인 적은 반으로 갈라져 '어라?' 하고 미끄러진다.
 *   대나무 위 부엉이가 큰 순간마다 '부엉!' 날개를 펄럭인다.
 */
import { mulberry32, type Rng } from './rng.ts';
import type { Bot, GameDef, Input, Theme } from './core.ts';
import { juice } from './juice.ts';

const A = 1.52;
/** ✏️ M2 S9 크기 ①(📋 S8): 플레이 빌드에서만 참(build.ts define). 어느 판에도 없는 장치(보류한 🔔 종 · 거울 · 연기)의 코드를 번들에서만 뺀다 —
 *  시뮬·테스트·측정(tsx·vitest)에서는 그대로 돈다. 판에 이 장치가 다시 들어가면 테스트 '배포 판에 없는 장치'가 막는다(㊿⑦ (57)) */
declare global { var __SHIP__: boolean | undefined }
/** 땅(발 자리) 범위: 가로 X0~X1, 세로 Y0(먼 쪽)~Y1(가까운 쪽) — 화면 좌표(가로 폭 = 1)와 같다 */
const X0 = 0.06, X1 = 0.94, Y0 = 0.47, Y1 = 1.27;
/** 닌자가 맞는 거리 · 칼날 반폭(선에서 이만큼 + 적 몸 반지름 안이면 베임) */
const NIN_HIT = 0.036, BW = 0.026;
/** 돌진 최대 길이 · 게이지가 모자랄 때 짧게 뛰기 */
const DMAX = 0.85, HOP = 0.16;
/** 게이지: 최대 · 판 시작 · 꾹 누르는 동안 틱마다 · 안 누를 때 틱마다 차는 양 · n번째로 벤 적이 주는 양(×n) */
const GMAX = 100, G0 = 70, DRAIN = 0.2, REGEN = 0.07, GAIN = 7, SHOT_G = 8;
/** 돌진 값 = 기본 + 길이×PER — 길게 갈수록 많이 든다. 게이지가 모자라면 갈 수 있는 데까지만 */
const GBASE = 5, GPER = 22;
const dashCost = (len: number) => GBASE + GPER * len;
const reachOf = (g: number) => Math.min(DMAX, (g - GBASE) / GPER);
/** 시간 배속: 꾹 누르는 동안 · 큰 순간(셋 이상) 뒤 잠깐 */
const SLOW = 0.12, SLOW2 = 0.35;
const HP = 3, INV_HURT = 60, INV_DASH = 8;
const ENTER_T = 36, BLAST = 0.19, FUSE = 14, LOCK = 18;
const ARROW_V = 0.016, STAR_V = 0.011;
const RESULT_OK = 190, RESULT_FAIL = 160, CARD_T = 160, NEWS_T = 150;
const STAR_PTS = 150, WIN_PTS = 300;

type K = 'dummy' | 'sword' | 'archer' | 'shuri' | 'shield' | 'boss' | 'leaf' | 'bell';
const RAD: Record<K, number> = { dummy: 0.042, sword: 0.035, archer: 0.035, shuri: 0.035, shield: 0.04, boss: 0.066, leaf: 0.04, bell: 0.045 };
const PTS: Record<K, number> = { dummy: 10, sword: 20, archer: 25, shuri: 25, shield: 40, boss: 60, leaf: 30, bell: 50 };
const SPD: Record<K, number> = { dummy: 0, sword: 0.0032, archer: 0.0012, shuri: 0.0016, shield: 0.0024, boss: 0.0026, leaf: 0, bell: 0 };
/** ✏️ M2 S1 🍃 잎 너구리(📐): 이 획의 첫 방향과 LEAF_A(25°) 안으로 지나는 칼은 '휙' 피한다 — 꺾어 들어온 칼에만 베인다 */
const LEAF_A = 0.44, LEAF_HOP = 0.1, LEAF_DEMO = 1;
/** M2 S4 부엉이 귀띔: 같은 판 OWL_FAILS번 지거나, 한 시도에 휙 OWL_DODGES번이면 묻는다 */
const OWL_FAILS = 3, OWL_DODGES = 3; // M2 S2: 휙 두 번이면 손가락 시범(🧪 낭떠러지 ㉛)
/** 칼 드는 틱(측정용으로 바꿀 수 있게). ✏️ S003 실험: 24·30·40, 16·22·30으로 줄여도 F5(꾹−탭 ★ 차)가 안 움직여 그대로 둠 — 버릇 봇은 쉬지 않고 돌진해 칼잡이가 닿지 않는다 */
export const WIND_T = { sword: 42, shield: 50, boss: 64 };
const MELEE: Partial<Record<K, { start: number; reach: number; wind: number; rest: number }>> = {
  sword: { start: 0.1, reach: 0.125, get wind() { return WIND_T.sword; }, rest: 50 },
  shield: { start: 0.1, reach: 0.13, get wind() { return WIND_T.shield; }, rest: 60 },
  boss: { start: 0.15, reach: 0.19, get wind() { return WIND_T.boss; }, rest: 70 },
};
/** S003: 방패 무사가 도는 속도(rad/틱, 예전 .03 — 사람 반응 한 번에 등이 다시 앞이 되던 것) · 헛방 벌(먹 · 경직 틱 · 근처 칼잡이 반격 거리).
 *  ✏️ S003 측정(24시드): 먹 -10은 '옮겨 서기' 빈 획까지 벌해 장인 5판 클리어 1 → .67, 경직 20틱은 장인 5판 ★3 .92 → .04 · 연타(24틱 간격)엔 한 번도 안 걸림 → 둘 다 0.
 *  남긴 것: 헛방을 세고 근처 칼잡이가 바로 칼을 든다. */
/** strikeR: 일격 반지름 · strikeOn: 측정용 끄기(1/0) · strikeT: 판에 값이 없을 때 쓸 실험값(0이면 판 값) */
export const STRIKE = { r: 0.075, on: 1, t: 0 };
export const TUNE = { shieldTurn: 0.015, whiffG: 0, stiff: 0, whiffR: 0.2, counterR: 0, counterT: 14 };
/** ✏️ S003 📐 안 A '착지 반격': 내린 자리 counterR 안의 칼잡이·방패·대장이 곧바로 짧은 칼(counterT틱 — 사람 반응 0.5초보다 짧다)을 든다.
 *  꾹 하면 세상이 0.12배라 내릴 자리를 읽고 비켜 내릴 수 있다 = 느린 시간이 '읽는 시간'. 0이면 끔(측정용).
 *  S003 실험(12시드, R .08·.11·.14 × T 20·14·10): 공짜 별 4 그대로 · F5 ★ 차 −.08~−.03 · 처음 하는 사람 5·7판 클리어 0~.33으로 무너짐 → 끔 */
/** 배우는 판은 너그럽게: [게이지 차는 배수, 칼 드는 시간 배수, 걷는 속도 배수] (1판·2판·그 뒤) */
const EASE = [[5, 1.5, 0.8], [3, 1.5, 0.8], [1, 1, 1]];
/** 적 상태 */
const ENTER = 0, IDLE = 1, WIND = 2, REST = 3, STUN = 4, AIM = 5;

type Star = { k: 'multi' | 'nohit' | 'arrow' | 'back' | 'boom' | 'mirror' | 'boss'; n?: number; label: string };
/** [종류, x, y, 들어오는 쪽(0 그 자리 펑 · 1 왼쪽 · 2 오른쪽 · 3 뒤쪽 대숲)] */
type Spawn = [K | 'barrel' | 'bamboo', number, number, number];
interface Wave { need: number; wait: number; foes: Spawn[] }
interface StageDef {
  key: string; name: string; place: number; news: string; hint: string; goal: string;
  start: [number, number]; mirrors?: number[][]; barrels?: number[][]; smokes?: number[][]; /** M2 S9 📐 2-10: 이 판의 대장은 잎 성질(곧은 칼은 휙) */ leafBoss?: boolean;
  /** ✏️ S009 가시덤불 [x, y, r]: 돌진 길이 지나가면 꼬리 하나를 잃는다(계속 간다) — 곧은 줄은 걸리고, 꺾어 돌면 안 걸린다 */
  thorns?: number[][];
  waves: Wave[];
  /** ✏️ M2 S3 새것 카드(GDD §7): 판 시작 카드의 6~10자 한 줄(없으면 news) */
  card?: string;
  /** M2 S5: 다 벤 뒤 다음 웨이브까지 최소 틱(없으면 80) */
  gap?: number;
  /** ✏️ M1 S002 별 틀(📐 GDD §5 · CONTENT §1): ★ 지나가기 · ★★ 한 번에 n 베기 · ★★★ 꼬리 하나도 안 잃기 — 모든 판 같음 */
  n: number;
  /** 판별 시작 먹(없으면 G0) · 너그러움 [먹 차는 배수, 칼 드는 시간 배수, 걷는 속도 배수](없으면 EASE) · ★★★ 선물 별(맞을 수 없는 판) */
  g0?: number; ease?: [number, number, number]; gift3?: boolean;
  /** ✏️ S004 '찾아오는 위협'(🧪 처방 · 📋 실험): 내린 자리에 몇 틱 뒤 일격(0이면 없음) */
  strike?: number;
  stars: [Star, Star];
}

const S3 = (k: Star['k'], n: number, label: string): Star => ({ k, n, label });
/** 판 8개. 좌표는 뒤집기 전 — 판마다(다시 할 때도) 시드로 좌우를 뒤집고 살짝 흔든다 */
const RAW: Omit<StageDef, 'stars'>[] = [
  // ✏️ M1 S007: 📐 CONTENT v2 — 1-1~1-5 꺾기 판(한붓 획). 뒤의 다섯(수리검 · 방패 · 통 · 거울 · 대장)은 S008에 다시 짠다
  {
    key: 'dummy', name: '대숲 입구', place: 0, news: '', goal: '숲 지나가기',
    hint: '꾹 누르고 줄 끝을 겨눠요', start: [0.5, 1.17], g0: 70, ease: [5, 1.5, 0.8],
    waves: [
      { need: 0, wait: 1e9, foes: [['dummy', 0.5, 0.95, 0], ['dummy', 0.5, 0.79, 0], ['dummy', 0.5, 0.63, 0]] },
      { need: 0, wait: 1e9, foes: [['dummy', 0.24, 1.0, 0], ['dummy', 0.41, 1.0, 0], ['dummy', 0.59, 1.0, 0], ['dummy', 0.76, 1.0, 0]] },
      { need: 0, wait: 1e9, foes: [['dummy', 0.7, 0.62, 0], ['dummy', 0.58, 0.62, 0], ['dummy', 0.46, 0.62, 0], ['dummy', 0.34, 0.62, 0], ['dummy', 0.22, 0.62, 0], ['dummy', 0.7, 0.76, 0], ['dummy', 0.7, 0.9, 0]] },
    ],
    n: 4, gift3: true,
  },
  {
    key: 'bend', name: '갈림길', place: 0, news: '한붓 획 — 누른 채 그으면 그 길로 벤다', goal: '숲 지나가기', card: '길게 그을수록 먹이 들어요',
    hint: '누른 채 꺾어 그어요', start: [0.5, 1.17], g0: 50, ease: [3, 1.5, 0.8],
    waves: [
      { need: 0, wait: 1e9, foes: [['dummy', 0.5, 0.6, 0], ['dummy', 0.5, 0.98, 0], ['dummy', 0.5, 0.86, 0], ['dummy', 0.5, 0.73, 0], ['dummy', 0.63, 0.6, 0], ['dummy', 0.76, 0.6, 0], ['dummy', 0.89, 0.6, 0]] },
      { need: 0, wait: 1e9, foes: [['dummy', 0.8, 0.6, 0], ['dummy', 0.2, 0.6, 0], ['dummy', 0.35, 0.6, 0], ['dummy', 0.5, 0.6, 0], ['dummy', 0.65, 0.6, 0], ['dummy', 0.8, 0.78, 0], ['dummy', 0.8, 0.92, 0], ['dummy', 0.2, 0.78, 0], ['dummy', 0.2, 0.92, 0]] },
      { need: 0, wait: 1e9, foes: [['dummy', 0.5, 1.12, 0], ['dummy', 0.18, 0.6, 0], ['dummy', 0.82, 0.6, 0], ['dummy', 0.42, 0.99, 0], ['dummy', 0.34, 0.86, 0], ['dummy', 0.26, 0.73, 0], ['dummy', 0.58, 0.99, 0], ['dummy', 0.66, 0.86, 0], ['dummy', 0.74, 0.73, 0]] },
    ],
    n: 6,
  },
  {
    key: 'sword', name: '오솔길', place: 0, news: '칼잡이가 와요 · 가시덤불은 꺾어 돌아요', goal: '숲 지나가기', card: '칼잡이 · 덤불은 돌아요',
    hint: '덤불을 돌아 꺾어 이어요', start: [0.5, 1.12], g0: 60, ease: [1.5, 1.2, 1],
    thorns: [[0.33, 0.96, 0.06], [0.67, 0.96, 0.06]], // ✏️ S009 📐 가시덤불
    waves: [
      { need: 1, wait: 1e9, foes: [['sword', 0.14, 0.7, 1], ['sword', 0.2, 0.77, 1], ['sword', 0.26, 0.84, 1], ['sword', 0.8, 0.6, 2], ['sword', 0.88, 0.6, 2], ['sword', 0.84, 0.68, 2]] },
      { need: 1, wait: 600, foes: [['sword', 0.86, 0.7, 2], ['sword', 0.8, 0.77, 2], ['sword', 0.74, 0.84, 2], ['sword', 0.2, 0.52, 3], ['sword', 0.28, 0.52, 3], ['sword', 0.24, 0.6, 3]] },
      { need: 0, wait: 660, foes: [['sword', 0.12, 0.66, 1], ['sword', 0.2, 0.74, 1], ['sword', 0.28, 0.82, 1], ['sword', 0.88, 0.66, 2], ['sword', 0.8, 0.74, 2], ['sword', 0.72, 0.82, 2], ['sword', 0.46, 0.52, 3], ['sword', 0.54, 0.52, 3]] },
    ],
    n: 5,
  },
  {
    key: 'twin', name: '두 갈래', place: 0, news: '두 무리 — 덤불 사이로 돌아서 한 획에', goal: '숲 지나가기', card: '두 무리를 한 획에',
    hint: '덤불 위로 U자로 돌아 이어요', start: [0.5, 1.1], g0: 60, ease: [1, 1, 1],
    thorns: [[0.3, 1.04, 0.055], [0.7, 1.04, 0.055]], // ✏️ S009 📐 가시덤불
    waves: [
      { need: 1, wait: 1e9, foes: [['sword', 0.14, 0.76, 1], ['sword', 0.14, 0.88, 1], ['sword', 0.14, 1.0, 1], ['sword', 0.86, 0.76, 2], ['sword', 0.86, 0.88, 2], ['sword', 0.86, 1.0, 2]] },
      { need: 1, wait: 720, foes: [['sword', 0.3, 0.52, 3], ['sword', 0.42, 0.52, 3], ['sword', 0.58, 0.52, 3], ['sword', 0.7, 0.52, 3], ['sword', 0.12, 1.18, 1], ['sword', 0.88, 1.18, 2]] },
      { need: 1, wait: 720, foes: [['sword', 0.12, 0.6, 1], ['sword', 0.12, 0.72, 1], ['sword', 0.24, 0.6, 1], ['sword', 0.88, 0.6, 2], ['sword', 0.88, 0.72, 2], ['sword', 0.76, 0.6, 2]] },
      { need: 0, wait: 720, foes: [['sword', 0.14, 0.9, 1], ['sword', 0.14, 1.02, 1], ['sword', 0.86, 0.9, 2], ['sword', 0.86, 1.02, 2], ['sword', 0.44, 0.52, 3], ['sword', 0.56, 0.52, 3]] },
    ],
    n: 5,
  },
  {
    key: 'archer', name: '달빛 언덕', place: 0, news: '화살병 — 날아오는 화살도 벨 수 있어요', goal: '언덕 넘어가기', card: '화살도 벨 수 있어요',
    hint: '덤불을 끼고 꺾어 화살병까지', start: [0.5, 1.15], g0: 55, ease: [1, 1, 1],
    thorns: [[0.5, 0.8, 0.06], [0.3, 1.0, 0.05], [0.7, 1.0, 0.05]], // ✏️ S009 📐 가시덤불
    waves: [
      { need: 1, wait: 1e9, foes: [['sword', 0.26, 0.82, 1], ['sword', 0.2, 0.74, 1], ['sword', 0.14, 0.65, 1], ['archer', 0.42, 0.56, 3], ['archer', 0.58, 0.56, 3]] },
      { need: 1, wait: 720, foes: [['sword', 0.74, 0.82, 2], ['sword', 0.8, 0.74, 2], ['sword', 0.86, 0.65, 2], ['archer', 0.5, 0.5, 3], ['sword', 0.2, 0.52, 3], ['sword', 0.28, 0.52, 3]] },
      { need: 0, wait: 780, foes: [['sword', 0.24, 0.84, 1], ['sword', 0.18, 0.76, 1], ['sword', 0.12, 0.68, 1], ['archer', 0.44, 0.52, 3], ['archer', 0.56, 0.52, 3], ['sword', 0.76, 0.84, 2], ['sword', 0.82, 0.76, 2], ['sword', 0.88, 0.68, 2]] },
    ],
    n: 5, // 📐 CONTENT v2: strike 없음(고리 일격은 꺾기 판에서 뺀다)
  },
  // ✏️ M1 S008: 📐 1-6~1-10 꺾기 판(방패 · 통 · 섞기 · 수리검 · 대장) — 고리 일격 없음. 거울 판은 M2로(잘라내기 ③)
  {
    key: 'shield', name: '높은 지붕', place: 1, news: '방패 무사 — 앞은 튕겨요, 꺾어 등 뒤를 베요', goal: '지붕 건너가기', card: '앞은 튕겨요, 등 뒤를!',
    hint: '덤불 옆으로 올라가 꺾어 등을 베요', start: [0.5, 1.15], g0: 60, ease: [1.3, 2.5, 0.8],
    thorns: [[0.5, 0.93, 0.05], [0.2, 1.04, 0.05], [0.8, 1.04, 0.05]], // ✏️ S009 📐 가시덤불
    waves: [
      { need: 0, wait: 1e9, foes: [['shield', 0.5, 0.74, 3], ['dummy', 0.36, 0.82, 0], ['dummy', 0.29, 0.66, 0], ['dummy', 0.26, 0.58, 0], ['dummy', 0.64, 0.83, 0]] },
      { need: 1, wait: 780, foes: [['shield', 0.5, 0.72, 3], ['dummy', 0.5, 0.52, 0], ['sword', 0.16, 0.6, 1], ['sword', 0.84, 0.6, 2]] },
      { need: 0, wait: 780, foes: [['shield', 0.34, 0.7, 3], ['shield', 0.66, 0.7, 3], ['dummy', 0.5, 0.52, 0], ['sword', 0.14, 0.92, 1], ['sword', 0.86, 0.92, 2]] },
    ],
    n: 5,
  },
  {
    key: 'barrel', name: '창고 마당', place: 2, news: '폭탄 통 — 베면 둘레까지 펑! 방패도 날려요', goal: '마당 지나가기', card: '통을 베면 펑!',
    hint: '칼잡이를 꿰고 꺾어 통을 지나 멀리 (펑!)', start: [0.5, 1.17], g0: 60, ease: [1.3, 2.5, 0.8],
    barrels: [[0.5, 0.64]],
    waves: [
      { need: 0, wait: 1e9, foes: [['sword', 0.24, 0.9, 1], ['sword', 0.18, 0.78, 1], ['sword', 0.12, 0.66, 1], ['dummy', 0.42, 0.58, 0], ['dummy', 0.58, 0.58, 0], ['dummy', 0.5, 0.52, 0]] },
      { need: 1, wait: 780, foes: [['shield', 0.42, 0.56, 3], ['shield', 0.58, 0.56, 3], ['sword', 0.76, 0.9, 2], ['sword', 0.82, 0.78, 2], ['sword', 0.88, 0.66, 2], ['barrel', 0.5, 0.64, 0]] },
      { need: 0, wait: 780, foes: [['shield', 0.3, 0.6, 3], ['sword', 0.14, 0.86, 1], ['sword', 0.86, 0.86, 2], ['sword', 0.74, 0.62, 2], ['sword', 0.62, 0.52, 3], ['barrel', 0.34, 0.72, 0]] },
    ],
    n: 5,
  },
  {
    key: 'mix', name: '창고 처마', place: 2, news: '섞여 와요 — 화살병 먼저, 방패는 등 뒤로', goal: '처마 지나가기', card: '화살병 먼저!',
    hint: '덤불 사이로 올라가 갈라 꺾어요', start: [0.5, 1.15], g0: 60, ease: [1.2, 3, 0.7],
    thorns: [[0.36, 1.0, 0.05], [0.64, 1.0, 0.05]], // ✏️ S009 📐 가시덤불
    waves: [
      { need: 1, wait: 1e9, foes: [['sword', 0.26, 0.84, 1], ['sword', 0.2, 0.75, 1], ['sword', 0.14, 0.66, 1], ['archer', 0.4, 0.52, 3], ['archer', 0.6, 0.52, 3]] },
      { need: 1, wait: 720, foes: [['shield', 0.5, 0.72, 3], ['archer', 0.3, 0.5, 3], ['sword', 0.86, 0.9, 2], ['sword', 0.74, 0.9, 2]] },
      { need: 0, wait: 780, foes: [['shield', 0.32, 0.68, 3], ['shield', 0.68, 0.68, 3], ['archer', 0.5, 0.5, 3], ['sword', 0.14, 0.9, 1], ['sword', 0.86, 0.9, 2]] },
    ],
    n: 4,
  },
  {
    key: 'shuri', name: '성벽 위', place: 2, news: '수리검 — 셋이 부채꼴로 날아와요', goal: '성벽 건너가기', card: '부채꼴 틈으로',
    hint: '덤불을 비껴 옆에서 꺾어 꿰요', start: [0.5, 1.15], g0: 60, ease: [1.2, 3, 0.7],
    thorns: [[0.3, 0.72, 0.05], [0.7, 0.72, 0.05]], // ✏️ S009 📐 가시덤불
    waves: [
      { need: 1, wait: 1e9, foes: [['shuri', 0.2, 0.55, 1], ['sword', 0.5, 0.52, 3], ['sword', 0.5, 0.64, 3], ['sword', 0.5, 0.76, 3], ['dummy', 0.75, 0.6, 0]] },
      { need: 1, wait: 720, foes: [['shield', 0.5, 0.7, 3], ['shuri', 0.5, 0.5, 3], ['sword', 0.14, 0.86, 1], ['sword', 0.26, 0.86, 1]] },
      { need: 0, wait: 780, foes: [['shuri', 0.74, 0.5, 3], ['shield', 0.4, 0.66, 3], ['shield', 0.6, 0.66, 3], ['sword', 0.14, 0.86, 1], ['sword', 0.86, 0.86, 2]] },
    ],
    n: 4,
  },
  {
    key: 'boss', name: '성 마당', place: 2, news: '대장 곰 — 네 번 베야 쓰러져요', goal: '대장 이기기', card: '대장은 네 번 베요',
    hint: '졸개를 꿰고 꺾어 대장까지 한 획에', start: [0.5, 1.17], g0: 60, ease: [1.2, 2.5, 0.8],
    waves: [
      { need: 1, wait: 1e9, foes: [['boss', 0.5, 0.74, 3], ['sword', 0.3, 0.92, 1], ['sword', 0.2, 0.8, 1], ['sword', 0.7, 0.92, 2], ['sword', 0.8, 0.8, 2]] },
      { need: 1, wait: 600, foes: [['shield', 0.3, 0.6, 3], ['shield', 0.7, 0.6, 3], ['archer', 0.5, 0.48, 3]] },
      { need: 1, wait: 700, foes: [['sword', 0.2, 0.5, 3], ['sword', 0.32, 0.56, 3], ['sword', 0.68, 0.56, 3], ['sword', 0.8, 0.5, 3], ['shield', 0.5, 0.9, 1]] },
    ],
    n: 4,
  },
];
const NUM = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱'];
/** S002 별 틀(S007~S008 📐 CONTENT v2로 판마다 N)(📋 — 장인 ★★ ≥ .8 · 버릇 ★★ 낮게, funqa 24시드로 고름). 10판 표(CONTENT)는 S005~S006에 */
export const STAGES: StageDef[] = RAW.map((d) => ({ ...d, stars: [S3('multi', d.n, `한 번에 ${NUM[d.n]} 베기`), S3('nohit', 0, '한 대도 안 맞기')] }));
export const STAGE_COUNT = STAGES.length;
/** ✏️ M2 S1 시험 판(📐 월드 2 표): 아직 판 목록에 안 넣는다 — funqa가 잴 때만 STAGES 끝에 잠깐 붙인다(1~10 지표가 안 바뀌게) */
/** 월드 2 판에 별 셋(★ 지나가기 · ★★ 한 번에 N · ★★★ 한 대도 안 맞기)을 붙인다 */
const starsOf = (a: Omit<StageDef, 'stars'>[]): StageDef[] => a.map((d) => ({ ...d, stars: [S3('multi', d.n, `한 번에 ${NUM[d.n]} 베기`), S3('nohit', 0, '한 대도 안 맞기')] as [Star, Star] }));
export const TRIAL: StageDef[] = starsOf([
  { // M2 S2: 잎 5 → 3(소개 판 — 처음 하는 사람 중앙값 74초) · 마지막 잎은 위 가운데(가운데면 휘젓기 .54)
    key: 'leaf', name: '첫 기와', place: 1, news: '잎 너구리 — 곧게 오면 휙! 꺾어 들어가 베요', goal: '지붕 건너가기', card: '곧게 오면 휙! 꺾어요',
    // M2 S7 ㊻: 간격 끔(96시드: 첫 도전 .57→.69 · 3번 합친 87→54초)
    hint: '꺾어 들어가요', start: [0.5, 1.15], g0: 70, ease: [3, 1.5, 0.8],
    waves: [
      { need: 1, wait: 1e9, foes: [['dummy', 0.5, 0.95, 0], ['dummy', 0.5, 0.82, 0], ['dummy', 0.5, 0.69, 0], ['leaf', 0.7, 0.62, 0]] },
      { need: 0, wait: 900, foes: [['dummy', 0.32, 0.82, 0], ['dummy', 0.44, 0.82, 0], ['dummy', 0.56, 0.82, 0], ['leaf', 0.2, 0.82, 0]] },
      { need: 0, wait: 900, foes: [['sword', 0.14, 0.7, 1], ['sword', 0.2, 0.78, 1], ['sword', 0.26, 0.86, 1], ['dummy', 0.5, 0.56, 0]] },
      { need: 0, wait: 900, foes: [['sword', 0.15, 0.75, 1], ['sword', 0.22, 0.85, 1], ['sword', 0.85, 0.75, 2], ['sword', 0.78, 0.85, 2], ['leaf', 0.5, 0.56, 3]] },
    ],
    n: 4,
  },
  // ✏️ M2 S5: 📐 CONTENT §4 월드 2 표 2-2~2-5(잎 섞기 · 연기) — 좌표는 표를 그대로 옮김
  {
    key: 'leafWait', name: '빨랫줄 골목', place: 1, news: '줄 서길 기다려 꺾어 잎까지', card: '줄 세워 꺾어 잎까지', goal: '골목 지나가기',
    hint: '줄 서면 꺾어 잎까지', start: [0.5, 1.15], gap: 420, g0: 60, ease: [1.2, 1.5, 0.9], thorns: [[0.5, 0.95, 0.05]],
    waves: [
      { need: 1, wait: 1e9, foes: [['sword', 0.14, 0.62, 1], ['sword', 0.2, 0.7, 1], ['sword', 0.26, 0.78, 1], ['sword', 0.32, 0.86, 1], ['leaf', 0.8, 0.56, 0]] },
      { need: 0, wait: 900, foes: [['sword', 0.86, 0.62, 2], ['sword', 0.8, 0.7, 2], ['sword', 0.74, 0.78, 2], ['sword', 0.4, 0.52, 3], ['sword', 0.6, 0.52, 3], ['leaf', 0.2, 0.56, 0]] },
      { need: 0, wait: 900, foes: [['sword', 0.14, 0.7, 1], ['sword', 0.2, 0.8, 1], ['sword', 0.26, 0.9, 1], ['sword', 0.86, 0.7, 2], ['sword', 0.8, 0.8, 2], ['sword', 0.74, 0.9, 2], ['leaf', 0.42, 0.52, 3], ['leaf', 0.58, 0.52, 3]] },
    ],
    n: 5,
  },
  {
    key: 'leafShuri', name: '처마 끝', place: 1, news: '수리검 부채꼴 사이로 꺾어 잎까지', card: '부채꼴 비껴 꺾어요', goal: '처마 건너가기',
    hint: '수리검 사이로 꺾어', start: [0.5, 1.15], gap: 420, g0: 60, ease: [1.2, 2, 0.8], thorns: [[0.3, 1.0, 0.05], [0.7, 1.0, 0.05]],
    waves: [
      { need: 1, wait: 1e9, foes: [['shuri', 0.2, 0.52, 3], ['sword', 0.86, 0.66, 2], ['sword', 0.8, 0.74, 2], ['sword', 0.74, 0.82, 2], ['leaf', 0.18, 0.8, 0]] },
      { need: 0, wait: 900, foes: [['shuri', 0.8, 0.52, 3], ['sword', 0.14, 0.66, 1], ['sword', 0.2, 0.74, 1], ['sword', 0.26, 0.82, 1], ['leaf', 0.82, 0.8, 0]] },
      { need: 0, wait: 900, foes: [['shuri', 0.3, 0.5, 3], ['shuri', 0.7, 0.5, 3], ['sword', 0.14, 0.8, 1], ['sword', 0.22, 0.88, 1], ['sword', 0.86, 0.8, 2], ['sword', 0.78, 0.88, 2], ['leaf', 0.5, 0.7, 0]] },
      { need: 0, wait: 900, foes: [['sword', 0.4, 0.55, 3], ['sword', 0.5, 0.55, 3], ['sword', 0.6, 0.55, 3], ['leaf', 0.5, 0.8, 0]] },
    ],
    n: 5,
  },
  {
    key: 'smoke', name: '굴뚝 골목', place: 1, news: '화살·수리검도 돌진 선에 끊겨요 — 줄과 한 획에', card: '날아오는 것도 베요', goal: '골목 지나가기', // ✏️ M2 S8: 연기는 뺐다(숨어도 별 차이 0 → M5) · 키는 그대로(M5에 연기가 이 판으로 돌아옴 · 저장된 별) · 🧪 S8: 글을 못 바꿨던 것 고침
    hint: '날아오는 쪽으로 줄 따라 쭉', start: [0.5, 1.15], g0: 60, ease: [1.2, 1.5, 0.9], // 📐 S8: 간격 끔 · 다음 무리는 남은 적 둘 이하거나 8초(빈 기다림 58→7%)
    waves: [
      { need: 1, wait: 1e9, foes: [['sword', 0.14, 0.62, 1], ['sword', 0.2, 0.7, 1], ['sword', 0.26, 0.78, 1], ['sword', 0.32, 0.86, 1], ['archer', 0.5, 0.5, 3]] },
      { need: 2, wait: 480, foes: [['sword', 0.86, 0.62, 2], ['sword', 0.8, 0.7, 2], ['sword', 0.74, 0.78, 2], ['sword', 0.68, 0.86, 2], ['archer', 0.3, 0.5, 3], ['leaf', 0.8, 0.6, 0]] },
      { need: 2, wait: 480, foes: [['sword', 0.14, 0.7, 1], ['sword', 0.2, 0.8, 1], ['sword', 0.26, 0.9, 1], ['sword', 0.86, 0.7, 2], ['sword', 0.8, 0.8, 2], ['sword', 0.74, 0.9, 2], ['shuri', 0.5, 0.5, 3], ['leaf', 0.5, 0.8, 0]] },
    ],
    n: 5,
  },
  {
    key: 'leafShield', name: '용마루', place: 1, news: '방패 등 뒤의 잎 — U자로 돌아요', card: 'U자로 돌아 등과 잎', goal: '용마루 건너가기',
    hint: 'U자로 돌아 등과 잎', start: [0.5, 1.15], gap: 420, g0: 60, ease: [1.2, 2.5, 0.8], thorns: [[0.2, 1.04, 0.05], [0.8, 1.04, 0.05]],
    waves: [
      { need: 1, wait: 1e9, foes: [['shield', 0.5, 0.72, 3], ['leaf', 0.5, 0.58, 0], ['dummy', 0.36, 0.82, 0], ['dummy', 0.64, 0.82, 0]] },
      { need: 0, wait: 900, foes: [['shield', 0.34, 0.7, 3], ['shield', 0.66, 0.7, 3], ['sword', 0.14, 0.8, 1], ['sword', 0.86, 0.8, 2], ['leaf', 0.5, 0.55, 0]] },
      { need: 0, wait: 900, foes: [['shield', 0.3, 0.62, 3], ['shield', 0.7, 0.62, 3], ['sword', 0.14, 0.86, 1], ['sword', 0.2, 0.94, 1], ['sword', 0.86, 0.86, 2], ['archer', 0.5, 0.5, 3], ['leaf', 0.5, 0.75, 0]] },
      { need: 0, wait: 900, foes: [['sword', 0.4, 0.55, 3], ['sword', 0.5, 0.55, 3], ['sword', 0.6, 0.55, 3], ['leaf', 0.5, 0.8, 0]] },
    ],
    n: 4, // M2 S5(🧪): 5는 장인 .04 · 사람 0 — 아무도 못 받는 별
  },
  // ✏️ M2 S7: 📐 2-6 뒤뜰 대밭 — 🎋 대나무(꺾어 넘겨 덤불 너머 베기). 소개 판이라 간격은 2-1과 같게(㊻)
  {
    key: 'bamboo', name: '뒤뜰 대밭', place: 1, news: '대나무 — 꺾어 베면 칼 간 쪽으로 쓰러져요', card: '꺾어 베면 쓰러져요', goal: '대밭 지나가기',
    // 📐 S8: 간격 끔 · 다음 무리는 9초 뒤(새 F12 — 빈 기다림 57→11%)
    hint: '옆에서 꺾어 줄 쪽으로', start: [0.5, 1.15], g0: 70, ease: [3, 1.5, 0.8], thorns: [[0.39, 0.7, 0.05], [0.61, 0.6, 0.05]],
    waves: [
      { need: 1, wait: 1e9, foes: [['bamboo', 0.5, 0.9, 0], ['dummy', 0.41, 0.9, 0], ['dummy', 0.2, 0.9, 0], ['dummy', 0.59, 0.9, 0], ['dummy', 0.8, 0.9, 0]] }, // 📐 S8: 대나무 한가운데 — 허수아비에서 허수아비로 그은 선이 대나무를 지나 쓰러짐을 봄(처음 대나무로 벤 판 .39→.53, 288시드)
      { need: 0, wait: 540, foes: [['bamboo', 0.52, 0.7, 0], ['dummy', 0.64, 0.7, 0], ['dummy', 0.29, 0.7, 0], ['dummy', 0.21, 0.7, 0], ['dummy', 0.13, 0.7, 0]] }, // ✏️ 둘째 배치: 칼잡이 2 뺌(걸어와 덤불 너머 줄과 한 줄이 돼 대나무 없이도 넷 — 낙차 0)
      { need: 0, wait: 540, foes: [['bamboo', 0.38, 0.94, 0], ['sword', 0.26, 0.78, 1], ['sword', 0.2, 0.7, 1], ['sword', 0.14, 0.62, 1], ['leaf', 0.72, 0.66, 0]] },
      { need: 0, wait: 540, foes: [['bamboo', 0.48, 0.6, 0], ['leaf', 0.34, 0.6, 0], ['archer', 0.71, 0.6, 3], ['archer', 0.79, 0.6, 3], ['archer', 0.87, 0.6, 3]] }, // ✏️ 둘째 배치: 칼잡이 2 뺌
    ],
    n: 4,
  },
  // ✏️ M2 S8: 📐 2-7~2-9 섞기 판(새 코드 0) — 간격 없이 앞 무리가 남아 있을 때 다음 무리가 걸어 들어온다(새 F12: 할 일 시간)
  {
    key: 'roofs', name: '두 지붕 사이', place: 1, news: '대나무로 건너편 줄까지', card: '양쪽 줄을 한 획에', goal: '지붕 건너가기',
    hint: '한쪽은 칼, 건너편은 대나무', start: [0.5, 1.15], g0: 70, ease: [2, 3, 0.7], thorns: [[0.3, 0.76, 0.05], [0.7, 0.76, 0.05]],
    waves: [
      { need: 1, wait: 1e9, foes: [['bamboo', 0.5, 0.86, 0], ['sword', 0.14, 0.64, 1], ['sword', 0.2, 0.72, 1], ['sword', 0.26, 0.8, 1], ['sword', 0.86, 0.64, 2], ['sword', 0.8, 0.72, 2], ['sword', 0.74, 0.8, 2]] },
      { need: 1, wait: 540, foes: [['leaf', 0.5, 0.56, 0], ['dummy', 0.5, 0.7, 0], ['sword', 0.14, 0.62, 1], ['sword', 0.2, 0.7, 1], ['sword', 0.26, 0.78, 1], ['archer', 0.8, 0.5, 3]] },
      { need: 1, wait: 540, foes: [['bamboo', 0.5, 0.62, 0], ['dummy', 0.38, 0.62, 0], ['dummy', 0.2, 0.62, 0], ['sword', 0.86, 0.62, 2], ['sword', 0.8, 0.7, 2], ['sword', 0.74, 0.78, 2], ['archer', 0.2, 0.5, 3]] },
      { need: 1, wait: 540, foes: [['sword', 0.14, 0.72, 1], ['sword', 0.2, 0.8, 1], ['sword', 0.26, 0.88, 1], ['sword', 0.86, 0.72, 2], ['sword', 0.8, 0.8, 2], ['sword', 0.74, 0.88, 2], ['leaf', 0.5, 0.56, 0]] },
    ],
    n: 5,
  },
  {
    key: 'jars', name: '장독대', place: 1, news: '장독은 펑, 대나무는 쓰러짐 — 골라요', card: '펑은 위, 대나무는 옆', goal: '장독대 지나가기',
    hint: '위 무리는 장독, 옆 줄은 대나무', start: [0.5, 1.15], g0: 60, ease: [1.5, 3, 0.7], thorns: [[0.34, 0.8, 0.05], [0.66, 0.8, 0.05]],
    waves: [
      { need: 1, wait: 1e9, foes: [['barrel', 0.5, 0.6, 0], ['dummy', 0.42, 0.54, 0], ['dummy', 0.58, 0.54, 0], ['dummy', 0.5, 0.5, 0], ['sword', 0.14, 0.66, 1], ['sword', 0.2, 0.74, 1], ['sword', 0.26, 0.82, 1]] },
      { need: 1, wait: 480, foes: [['bamboo', 0.5, 0.86, 0], ['dummy', 0.62, 0.86, 0], ['dummy', 0.8, 0.86, 0], ['sword', 0.86, 0.62, 2], ['sword', 0.8, 0.7, 2], ['sword', 0.74, 0.78, 2], ['archer', 0.3, 0.5, 3]] },
      { need: 1, wait: 480, foes: [['barrel', 0.34, 0.62, 0], ['dummy', 0.26, 0.54, 0], ['dummy', 0.42, 0.54, 0], ['sword', 0.14, 0.66, 1], ['sword', 0.2, 0.74, 1], ['sword', 0.26, 0.82, 1], ['leaf', 0.66, 0.9, 0]] },
      { need: 1, wait: 480, foes: [['barrel', 0.62, 0.6, 0], ['shield', 0.56, 0.52, 3], ['dummy', 0.7, 0.52, 0], ['sword', 0.14, 0.86, 1], ['sword', 0.22, 0.94, 1], ['leaf', 0.3, 0.6, 0]] },
    ],
    n: 5, // 📐: 방패는 하나(방패 다섯 + 수리검은 처음 3번 안 .04)
  },
  {
    key: 'moon', name: '달 밝은 마루', place: 1, news: '섞여 와요 — 잎부터 꺾어요', card: '잎 먼저, 줄은 나중', goal: '마루 건너가기',
    hint: '잎 먼저 꺾고 남은 줄 기다려', start: [0.5, 1.15], g0: 60, ease: [1.2, 2, 0.9], thorns: [[0.38, 0.78, 0.05], [0.62, 0.78, 0.05]],
    waves: [
      { need: 1, wait: 1e9, foes: [['leaf', 0.36, 0.66, 0], ['leaf', 0.64, 0.66, 0], ['sword', 0.14, 0.66, 1], ['sword', 0.2, 0.74, 1], ['sword', 0.26, 0.82, 1], ['shuri', 0.5, 0.5, 3]] },
      { need: 1, wait: 420, foes: [['bamboo', 0.5, 0.88, 0], ['shield', 0.5, 0.64, 3], ['sword', 0.86, 0.62, 2], ['sword', 0.8, 0.7, 2], ['sword', 0.74, 0.78, 2], ['dummy', 0.24, 0.6, 0], ['dummy', 0.16, 0.6, 0]] },
      { need: 2, wait: 420, foes: [['bamboo', 0.24, 0.92, 0], ['sword', 0.14, 0.6, 1], ['sword', 0.2, 0.68, 1], ['sword', 0.26, 0.76, 1], ['leaf', 0.7, 0.62, 0], ['shield', 0.62, 0.56, 3], ['archer', 0.4, 0.5, 3]] },
      { need: 1, wait: 420, foes: [['barrel', 0.5, 0.68, 0], ['sword', 0.14, 0.72, 1], ['sword', 0.2, 0.8, 1], ['sword', 0.26, 0.88, 1], ['sword', 0.86, 0.72, 2], ['sword', 0.8, 0.8, 2], ['sword', 0.74, 0.88, 2], ['leaf', 0.5, 0.54, 0], ['archer', 0.8, 0.5, 3], ['shield', 0.5, 0.86, 0]] },
    ],
    n: 5, // 📐: N 6이면 장인 ★★ .04
  },
  // ✏️ M2 S9: 📐 2-10 큰 너구리 지붕 — 1-10 대장 틀(hp 4 · 맞으면 밀림) + 잎 성질(leafBoss). 통은 두지 않음(펑에 휙인지 한 대인지 헷갈림)
  {
    key: 'boss2', name: '큰 너구리 지붕', place: 1, news: '큰 너구리 — 곧은 칼은 휙, 꺾어 네 번', card: '꺾어서 네 번 베요', goal: '큰 너구리 이기기',
    hint: '졸개 꿰고 꺾어 너구리까지', start: [0.5, 1.15], g0: 70, ease: [1.5, 2.5, 0.8], thorns: [[0.5, 0.98, 0.05]], leafBoss: true,
    waves: [
      { need: 1, wait: 1e9, foes: [['boss', 0.5, 0.7, 3], ['sword', 0.3, 0.92, 1], ['sword', 0.2, 0.8, 1], ['sword', 0.7, 0.92, 2], ['sword', 0.8, 0.8, 2]] },
      { need: 1, wait: 540, foes: [['leaf', 0.3, 0.6, 0], ['leaf', 0.7, 0.6, 0], ['archer', 0.5, 0.5, 3], ['shuri', 0.2, 0.5, 3]] },
      { need: 1, wait: 540, foes: [['bamboo', 0.5, 0.86, 0], ['sword', 0.14, 0.62, 1], ['sword', 0.2, 0.7, 1], ['sword', 0.26, 0.78, 1], ['shield', 0.7, 0.6, 3]] },
      { need: 1, wait: 540, foes: [['sword', 0.14, 0.72, 1], ['sword', 0.2, 0.8, 1], ['sword', 0.26, 0.88, 1], ['sword', 0.86, 0.72, 2], ['sword', 0.8, 0.8, 2], ['sword', 0.74, 0.88, 2], ['leaf', 0.5, 0.56, 0]] },
    ],
    n: 5, // 📐: 너구리만 남으면 다음 졸개가 걸어 들어와 '너구리 + 졸개 넷' 한 줄이 ★★
  },
] as Omit<StageDef, 'stars'>[]);
/** ✏️ M2 S6 보류: 🔔 종루(2-6)는 미리 정한 폐기 기준에 걸려(사용 .46 < .5 · 낙차 .12 < .2 · 처음 봇 0~.08) 판 목록에서 뺀다 — 코드와 판은 다시 잴 수 있게 남김(M2 S7: 플레이 빌드에선 빠지게 따로 둠) */
export const SHELVED: StageDef[] = /* @__PURE__ */ starsOf([
  // ✏️ M2 S6: 📐 2-6 종루 — 🔔 종(되돌아 두 번). 소개 판이라 다음 무리 간격은 짧게(㊻)
  {
    key: 'bell', name: '종루', place: 1, news: '종 — 한 획에 두 번 지나가야 깨져요', card: '갔다가 되돌아 두 번', goal: '종루 지나가기',
    hint: '갔다가 되돌아 두 번', start: [0.5, 1.15], gap: 240, g0: 70, ease: [2, 1.5, 0.8],
    waves: [
      { need: 1, wait: 1e9, foes: [['bell', 0.5, 0.7, 0], ['dummy', 0.5, 0.92, 0], ['dummy', 0.5, 0.82, 0], ['dummy', 0.39, 0.85, 0], ['dummy', 0.34, 0.96, 0]] },
      { need: 0, wait: 900, foes: [['bell', 0.5, 0.62, 0], ['sword', 0.14, 0.66, 1], ['sword', 0.2, 0.74, 1], ['sword', 0.26, 0.82, 1]] },
      { need: 0, wait: 900, foes: [['bell', 0.35, 0.62, 0], ['bell', 0.65, 0.62, 0], ['sword', 0.14, 0.8, 1], ['sword', 0.22, 0.88, 1], ['sword', 0.86, 0.8, 2], ['sword', 0.78, 0.88, 2], ['dummy', 0.5, 0.85, 0], ['dummy', 0.5, 0.75, 0]] },
      { need: 0, wait: 900, foes: [['bell', 0.5, 0.6, 0], ['sword', 0.14, 0.7, 1], ['sword', 0.2, 0.78, 1], ['sword', 0.86, 0.7, 2], ['sword', 0.8, 0.78, 2]] },
    ],
    n: 4,
  },
] as Omit<StageDef, 'stars'>[]);
const easeOf = (s: DashState) => STAGES[s.stage].ease ?? EASE[Math.min(s.stage, 2)];

interface Foe {
  id: number; k: K; x: number; y: number; tx: number; ty: number; ex: number; ey: number; hp: number;
  st: number; tm: number; fa: number; cool: number; ax: number; ay: number;
  // 연출 (시뮬레이션 결과와 무관)
  hurtT: number; whiff: number; seed: number;
}
interface Shot { k: number; x: number; y: number; vx: number; vy: number; a: number }
interface Barrel { id: number; x: number; y: number; fuse: number; owner: number; born: number }
interface Mirror { ax: number; ay: number; bx: number; by: number }
interface Smoke { x: number; y: number; r: number; vx: number; vy: number }
/** ✏️ M2 S7 🎋 대나무(📐): 꺾어 들어간 칼에 베이면 칼이 가던 쪽(dx,dy)으로 쓰러진다 — fall = 쓰러진 틱(-1 서 있음) · wob = 마지막 '툭' */
interface Bamboo { id: number; x: number; y: number; fall: number; dx: number; dy: number; wob: number }
/** 베인 적 (연출: 잠깐 멈췄다 반으로 갈라진다) */
interface Cut { k: K; x: number; y: number; a: number; t: number; face: number; n: number; seed: number; boom: boolean }
interface Ink { x: number; y: number; r: number; t: number; seed: number }
interface Ev { t: number; kind: string; x: number; y: number; n?: number; text?: string }
interface Path { legs: number[][]; hits: { id: number; leg: number }[]; bounce: boolean; barrels: number[]; shots: number[]; ex: number; ey: number; dodges: { id: number; leg: number }[]; bells: { id: number; n: number }[]; falls: { id: number; leg: number; dx: number; dy: number; k?: number }[]; toks: number[] }

export interface DashState {
  rng: Rng; seed: number; t: number; wt: number; stage: number; phase: 'play' | 'result'; pt: number; ok: boolean; why: string;
  stars: number; base: number; got: number; starOk: boolean[]; pts: number; won: boolean; dead: boolean; again: boolean; tries: number;
  nx: number; ny: number; face: number; hp: number; inv: number; g: number;
  down: boolean; lock: boolean; stiff: number; whiffs: number; aim: { x: number; y: number } | null; holdT: number;
  /** ✏️ 오너 피드백(2026-11-19 "한붓그리기처럼 그은 위치대로 단칼에"): 꾹 누른 채 그은 점들 — 떼면 이 길을 따라 한 번에 돌진하며 벤다 */
  stroke: { x: number; y: number }[];
  /** 처음 누른 자리(획의 첫 점) · 닌자 위에 머문 틱(다시 그리기) */
  anchor: { x: number; y: number } | null; dwell: number;
  freeze: number; slowT: number;
  strikes: { x: number; y: number; t: number; t0: number }[];
  foes: Foe[]; shots: Shot[]; barrels: Barrel[]; mirrors: Mirror[]; smokes: Smoke[]; bamboos: Bamboo[]; thorns: { x: number; y: number; r: number }[]; nid: number;
  wave: number; waveT: number;
  dashN: number; chain: number; best: number; hits: number; arrows: number; backK: number; boomBest: number; boomBy: Record<number, number>;
  mirK: number; bounceT: number; bents: number; leafGuide: boolean; leafCut: boolean; dodgeN: number; bellGuide: boolean; bambooGuide: boolean;
  /** ✏️ M2 S4 부엉이 귀띔: 이 판에서 진 수 · 물어봄(화면이 카드를 띄운다) · 거절함(이 시도) · 쓰는 중(★★★ 없음, 길을 보여 줌) */
  failN: number; owlAsk: boolean; owlNo: boolean; owl: boolean;
  /** 오너 피드백 → 🧪: 싹쓸이 뒤 '공짜 한 획' — 남은 틱 동안 꾹 해도 먹이 안 줄고, 다음 돌진은 먹이 안 든다(돌진하면 끝) */
  free: number; bossCombo: number; dashes: number; firstDash: boolean; firstBig: number; firstPress: number;
  combo: { id: number; n: number; t: number };
  seen: Set<string>; spotted: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; spot: { id: number; t: number; label: string } | null;
  events: Ev[]; cuts: Cut[]; inks: Ink[]; trail: { legs: number[][]; t: number; n: number; sw?: boolean } | null;
  // 연출용 (시뮬레이션 결과와 무관)
  camX: number; mood: number; moodT: number; owlT: number; sheathT: number; slowVis: number;
}

const ev = (s: DashState, kind: string, x: number, y: number, n?: number, text?: string) => s.events.push({ t: s.t, kind, x, y, n, text });
function see(s: DashState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  if (!text) return;
  // ✏️ S012: 덤불 알림은 지금 일어난 일이라 줄 맨 앞에 끼워 바로 띄운다(판 소개 뒤로 밀려 안 보이던 것 · 🧪 S011)
  if (URGENT.has(key)) (s.newsQ.unshift(text), (s.news = null));
  else s.newsQ.push(text);
}
const URGENT = new Set(['thorn', 'thornRed', 'leaf', 'leafDemo', 'bell', 'bamboo']);
/** 🍃 잎 성질: 잎 너구리 · 2-10 큰 너구리(leafBoss 판의 대장) — 첫 방향 25° 안의 칼은 휙 */
const leafy = (s: DashState, f: Foe) => f.k === 'leaf' || (f.k === 'boss' && !!STAGES[s.stage].leafBoss);
const nameOf = (s: DashState, f: Foe) => (f.k === 'boss' && STAGES[s.stage].leafBoss ? '큰 너구리' : KIND_NAME[f.k]);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const KIND_NAME: Record<K, string> = { dummy: '허수아비', sword: '칼잡이', archer: '화살병', shuri: '수리검', shield: '방패 무사', boss: '대장 곰', leaf: '잎 너구리', bell: '종' };

// ───────────────────────────── 시뮬레이션 ─────────────────────────────

/** (x,y)에서 (dx,dy) 쪽으로 땅 안에 머무를 수 있는 최대 거리 */
function boxExit(x: number, y: number, dx: number, dy: number) {
  let t = 1e9;
  if (dx > 1e-9) t = Math.min(t, (X1 - x) / dx);
  if (dx < -1e-9) t = Math.min(t, (X0 - x) / dx);
  if (dy > 1e-9) t = Math.min(t, (Y1 - y) / dy);
  if (dy < -1e-9) t = Math.min(t, (Y0 - y) / dy);
  return Math.max(0, t);
}

/** 방패 무사를 앞에서 베려 하는가 (방패가 돌진 쪽을 향하고 있으면 튕긴다) */
const fromFront = (f: Foe, dx: number, dy: number) => f.k === 'shield' && f.st !== STUN && dx * Math.cos(f.fa) + dy * Math.sin(f.fa) < -0.15 * Math.hypot(dx, dy);

/**
 * 돌진 선 따라가기 (시뮬레이션·미리 보기·봇이 모두 같은 것을 쓴다).
 * 거울에 닿으면 꺾여 남은 길이만큼 이어 가고(최대 3토막), 방패를 앞에서 만나면 거기서 튕겨 멈춘다.
 */
function trace(s: DashState, px: number, py: number, tx: number, ty: number, maxLen: number, cut: boolean, bw = BW, fd?: number[]): Path {
  let dx = tx - px, dy = ty - py;
  const L = Math.hypot(dx, dy);
  if (L < 1e-6) (dx = 0), (dy = -1);
  else (dx /= L), (dy /= L);
  let rem = Math.min(L, maxLen), x = px, y = py, skip = -1;
  const out: Path = { legs: [], hits: [], bounce: false, barrels: [], shots: [], ex: px, ey: py, dodges: [], bells: [], falls: [], toks: [] };
  const used = new Set<number>();
  for (let leg = 0; leg < 3 && rem > 1e-4; leg++) {
    let len = Math.min(rem, boxExit(x, y, dx, dy)), mi = -1;
    if (!globalThis.__SHIP__) s.mirrors.forEach((m, j) => {
      if (j === skip) return;
      const ex = m.bx - m.ax, ey = m.by - m.ay, den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) return;
      const u = ((m.ax - x) * ey - (m.ay - y) * ex) / den, v = ((m.ax - x) * dy - (m.ay - y) * dx) / den;
      if (u > 1e-6 && u < len && v >= 0 && v <= 1) (len = u), (mi = j);
    });
    let end = len;
    if (cut) {
      const cand: { f: Foe; u: number }[] = [];
      for (const f of s.foes) {
        if (used.has(f.id)) continue;
        const r = RAD[f.k] + bw, qx = f.x - x, qy = f.y - y, u = qx * dx + qy * dy;
        if (u < -r * 0.5 || u > len + r * 0.5) continue;
        if (Math.abs(qx * dy - qy * dx) > r) continue;
        cand.push({ f, u });
      }
      cand.sort((a, b) => a.u - b.u);
      for (const c of cand) {
        if (fromFront(c.f, dx, dy)) {
          end = Math.max(0, Math.min(len, c.u - RAD.shield - 0.02));
          out.bounce = true;
          break;
        }
        if (c.f.k === 'bell') continue; // 🔔 종은 토막 하나로는 안 깨진다 — 한 획 전체에서 따로 두 번 들어왔는지 tracePath가 센다
        if (leafy(s, c.f)) { // 🍃 첫 방향과 거의 같은 칼이면 '휙'(fd 없으면 이 토막이 첫 방향)
          const [fx, fy] = fd ?? (leg === 0 ? [dx, dy] : [Number.NaN, 0]);
          if (fx * dx + fy * dy > Math.cos(LEAF_A)) {
            if (!out.dodges.some((q) => q.id === c.f.id)) out.dodges.push({ id: c.f.id, leg });
            continue;
          }
        }
        used.add(c.f.id);
        out.hits.push({ id: c.f.id, leg });
      }
      for (const b of s.bamboos) { // 🎋 첫 방향과 25° 안이면 '툭'(잎과 같은 말) · 꺾어 들어가면 이 토막 쪽으로 쓰러짐
        const qx = b.x - x, qy = b.y - y, u = qx * dx + qy * dy, r = BAMBOO.r + bw;
        if (b.fall >= 0 || u < -r * 0.5 || u > end + r * 0.5 || Math.abs(qx * dy - qy * dx) > r || out.falls.some((q) => q.id === b.id)) continue;
        const [fx, fy] = fd ?? (leg === 0 ? [dx, dy] : [Number.NaN, 0]);
        if (fx * dx + fy * dy > Math.cos(LEAF_A)) out.toks.includes(b.id) || out.toks.push(b.id);
        else out.falls.push({ id: b.id, leg, dx, dy });
      }
      for (const b of s.barrels) {
        const qx = b.x - x, qy = b.y - y, u = qx * dx + qy * dy;
        if (u < -0.03 || u > end + 0.03 || Math.abs(qx * dy - qy * dx) > 0.034 + BW) continue;
        if (!out.barrels.includes(b.id)) out.barrels.push(b.id);
      }
      s.shots.forEach((sh, j) => {
        const qx = sh.x - x, qy = sh.y - y, u = qx * dx + qy * dy;
        if (u < -0.03 || u > end + 0.03 || Math.abs(qx * dy - qy * dx) > BW + 0.022) return;
        if (!out.shots.includes(j)) out.shots.push(j);
      });
    }
    out.legs.push([x, y, x + dx * end, y + dy * end]);
    x += dx * end;
    y += dy * end;
    rem -= end;
    if (globalThis.__SHIP__ || out.bounce || mi < 0 || end < len) break;
    const m = s.mirrors[mi], mx = m.bx - m.ax, my = m.by - m.ay, ml = Math.hypot(mx, my), nx = -my / ml, ny = mx / ml, dd = dx * nx + dy * ny;
    dx -= 2 * dd * nx;
    dy -= 2 * dd * ny;
    skip = mi;
  }
  if (!out.legs.length) out.legs.push([x, y, x, y]);
  out.ex = clamp(x, X0, X1);
  out.ey = clamp(y, Y0, Y1);
  return out;
}

/** ✏️ M2 S6 🔔 종(📐): 한 획의 길이 종 둘레(RAD + 칼날 반폭) 안에 '따로' 두 번 들어가면 쩍 — 두 번째로 들어간 토막에서 '한 번에'에 든다.
 *  꺾는 점이 둘레 안이면 앞뒤 토막은 한 번으로 친다(밖으로 나갔다 다시 들어와야 함). 한 번뿐이면 '댕'(종이 흔들리고 끝) */
function bellsOf(s: DashState, out: Path, bw: number) {
  for (const f of s.foes) {
    if (f.k !== 'bell' || f.st === ENTER) continue;
    const r = RAD.bell + bw;
    let n = 0, inside = Math.hypot(out.legs[0][0] - f.x, out.legs[0][1] - f.y) < r, at = -1;
    out.legs.forEach((l, li) => {
      const dx = l[2] - l[0], dy = l[3] - l[1], L2 = dx * dx + dy * dy || 1e-12, fx = l[0] - f.x, fy = l[1] - f.y;
      const b = fx * dx + fy * dy, c = fx * fx + fy * fy - r * r, disc = b * b - L2 * c;
      if (disc < 0) return void (inside = false);
      const t1 = (-b - Math.sqrt(disc)) / L2, t2 = (-b + Math.sqrt(disc)) / L2;
      if (t2 < 0 || t1 > 1) return void (inside = c < 0);
      if (!inside && t1 >= 0) (n++, n === 2 && (at = li)); // 밖에서 들어옴
      inside = t2 > 1; // 이 토막 끝이 안이면 다음 토막은 이어서 안
    });
    if (n === 0) continue;
    out.bells.push({ id: f.id, n });
    if (n >= 2) out.hits.splice(out.hits.filter((h) => h.leg < at).length, 0, { id: f.id, leg: at });
  }
}

/** 한붓 획: 닌자에서 점들을 차례로 이어 maxLen까지 돌진 선을 이어 붙인다(같은 적은 한 번만 · 방패 앞에서 튕기면 거기서 멈춤) */
const STROKE_STEP = 0.035, STROKE_MAX = 40, STROKE_LEN = 1.6, ERASE_R = 0.045, ERASE_DWELL = 12; // M2 S2: ⅓초 → 0.2초(🧪 1-6·1-9) // 오너 질문 뒤: 점 한도 24 → 40(큰 원)
/** ✏️ S009 꺾는 점 너그럽게(📋): 꺾인 한붓 획은 칼날 폭이 BEND_W배 — 손가락으로 그린 길은 적 위를 정확히 지나기 어렵다 */
export const BEND = { w: 1.8 };
/** ✏️ M2 S7 🎋 대나무 맞는 반지름 · 쓰러지는 길이(📐 .40 — 휘젓기 ★★ > .25면 .32로) */
export const BAMBOO = { r: 0.03, L: 0.4 };
/** 한 줄은 DMAX(.85)까지, 꺾인 한붓 획은 먹이 되는 만큼 STROKE_LEN까지(먹 값은 길이대로) */
const reachFor = (s: DashState, pts: unknown[]) => (pts.length > 1 ? Math.min(STROKE_LEN, (s.g - GBASE) / GPER) : reachOf(s.g));
function tracePath(s: DashState, pts: { x: number; y: number }[], maxLen: number): Path {
  const out: Path = { legs: [], hits: [], bounce: false, barrels: [], shots: [], ex: s.nx, ey: s.ny, dodges: [], bells: [], falls: [], toks: [] };
  const used = new Set<number>();
  let x = s.nx, y = s.ny, rem = maxLen;
  // 🍃 이 획의 첫 방향: 닌자에서 .08 넘게 떨어진 첫 점 쪽(손가락 점은 촘촘해서 첫 토막만으로는 방향이 흔들린다)
  const q0 = pts.find((q) => Math.hypot(q.x - s.nx, q.y - s.ny) > 0.08) ?? pts[pts.length - 1], d0 = q0 ? Math.hypot(q0.x - s.nx, q0.y - s.ny) || 1 : 1;
  const fd = q0 ? [(q0.x - s.nx) / d0, (q0.y - s.ny) / d0] : undefined;
  for (const q of pts) {
    if (rem <= 1e-4) break;
    if (Math.hypot(q.x - x, q.y - y) < 1e-4) continue;
    const P = trace(s, x, y, q.x, q.y, rem, true, pts.length > 1 ? BW * BEND.w : BW, fd), base = out.legs.length;
    for (const h of P.dodges) if (!out.dodges.some((q) => q.id === h.id)) out.dodges.push({ id: h.id, leg: base + h.leg });
    for (const h of P.falls) if (!out.falls.some((q) => q.id === h.id)) out.falls.push({ ...h, leg: base + h.leg });
    for (const id of P.toks) out.toks.includes(id) || out.toks.push(id);
    out.legs.push(...P.legs);
    for (const h of P.hits) if (!used.has(h.id)) used.add(h.id), out.hits.push({ id: h.id, leg: base + h.leg });
    for (const b of P.barrels) if (!out.barrels.includes(b)) out.barrels.push(b);
    for (const j of P.shots) if (!out.shots.includes(j)) out.shots.push(j);
    rem -= P.legs.reduce((a, l) => a + Math.hypot(l[2] - l[0], l[3] - l[1]), 0);
    (x = P.ex), (y = P.ey);
    if (P.bounce) {
      out.bounce = true;
      break;
    }
  }
  if (!out.legs.length) out.legs.push([s.nx, s.ny, s.nx, s.ny]);
  (out.ex = x), (out.ey = y);
  out.toks = out.toks.filter((id) => !out.falls.some((q) => q.id === id)); // 🎋 앞에서 툭 했어도 뒤 꺾인 토막이 베면 쓰러짐
  for (const fl of out.falls) { // 🎋 쓰러진 줄(길이 BAMBOO.L · 곧은 칼 폭)은 펑과 같다 — 방패도 앞뒤 없이 · 잎은 휙 · 덤불은 넘어감 · 연쇄 없음
    const b = s.bamboos.find((q) => q.id === fl.id)!;
    fl.k = 0;
    for (const f of s.foes) {
      const u = clamp((f.x - b.x) * fl.dx + (f.y - b.y) * fl.dy, 0, BAMBOO.L);
      if (used.has(f.id) || f.k === 'bell' || Math.hypot(b.x + fl.dx * u - f.x, b.y + fl.dy * u - f.y) > RAD[f.k] + BW) continue;
      if (f.k === 'leaf') out.dodges.some((q) => q.id === f.id) || out.dodges.push({ id: f.id, leg: fl.leg });
      else used.add(f.id), out.hits.push({ id: f.id, leg: fl.leg }), fl.k++;
    }
  }
  out.hits.sort((a, b) => a.leg - b.leg);
  out.dodges = out.dodges.filter((q) => !used.has(q.id)); // 앞에서 휙 했어도 뒤 꺾인 토막이 베면 베인 것
  if (!globalThis.__SHIP__) bellsOf(s, out, pts.length > 1 ? BW * BEND.w : BW);
  return out;
}
const strokeOf = (s: DashState) => (s.aim ? [...s.stroke, s.aim] : s.stroke);
const strokeLen = (s: DashState) => {
  let x = s.nx, y = s.ny, L = 0;
  for (const q of strokeOf(s)) (L += Math.hypot(q.x - x, q.y - y)), (x = q.x), (y = q.y);
  return L;
};
const pathLen = (P: Path) => P.legs.reduce((a, l) => a + Math.hypot(l[2] - l[0], l[3] - l[1]), 0);
/** ✏️ S009 가시덤불: 돌진 길(토막들)이 처음 걸리는 덤불의 [덤불, 걸린 자리] — 없으면 null */
function thornOf(s: DashState, legs: number[][]) {
  for (const l of legs) {
    const dx = l[2] - l[0], dy = l[3] - l[1], L2 = dx * dx + dy * dy;
    for (const m of s.thorns) {
      const u = L2 > 1e-9 ? clamp(((m.x - l[0]) * dx + (m.y - l[1]) * dy) / L2, 0, 1) : 0, cx = l[0] + dx * u, cy = l[1] + dy * u;
      if (Math.hypot(cx - m.x, cy - m.y) < m.r + NIN_HIT) return { m, x: cx, y: cy }; // 📐 닌자 맞는 거리만큼 넓게
    }
  }
  return null;
}

function hurt(s: DashState, x: number, y: number, why: string) {
  if (s.phase !== 'play' || s.inv > 0) return;
  s.hp--;
  s.hits++;
  s.inv = INV_HURT;
  s.chain = 0;
  s.mood = 3;
  s.moodT = 50;
  ev(s, 'hurt', x, y, s.hp, why);
  if (s.hp <= 0) endStage(s, false, why);
}

function kill(s: DashState, f: Foe, n: number, a: number, boom: boolean) {
  const i = s.foes.indexOf(f);
  if (i >= 0) s.foes.splice(i, 1);
  s.cuts.push({ k: f.k, x: f.x, y: f.y, a, t: s.t, face: Math.cos(f.fa) >= 0 ? 1 : -1, n, seed: f.seed, boom });
  if (s.cuts.length > 24) s.cuts.shift();
  s.inks.push({ x: f.x + Math.cos(a) * 0.03, y: f.y + Math.sin(a) * 0.02, r: 0.03 + 0.01 * Math.min(4, n), t: s.t, seed: f.seed });
  if (s.inks.length > 14) s.inks.shift();
}

function explode(s: DashState, b: Barrel) {
  s.barrels.splice(s.barrels.indexOf(b), 1);
  ev(s, 'boom', b.x, b.y);
  let k = 0;
  for (const f of [...s.foes]) {
    if (Math.hypot(f.x - b.x, f.y - b.y) > BLAST + RAD[f.k] * 0.5) continue;
    if (!globalThis.__SHIP__ && f.k === 'bell') { // 🔔 펑에도 댕
      ev(s, 'ding', f.x, f.y);
      continue;
    }
    if (f.k === 'leaf') { // 🍃 펑도 휙 — 날아가 비켜 선다
      const d = Math.hypot(f.x - b.x, f.y - b.y) || 1;
      (f.x = clamp(f.x + ((f.x - b.x) / d) * LEAF_HOP, X0 + 0.02, X1 - 0.02)), (f.y = clamp(f.y + ((f.y - b.y) / d) * LEAF_HOP, Y0 + 0.02, Y1 - 0.02));
      ev(s, 'dodge', f.x, f.y);
      continue;
    }
    if (f.k === 'boss') {
      f.hp--;
      f.hurtT = 30;
      (f.st = STUN), (f.tm = 50);
      if (f.hp > 0) continue;
    }
    k++;
    s.pts += PTS[f.k] * 2;
    s.g = Math.min(GMAX, s.g + GAIN);
    kill(s, f, k, Math.atan2(f.y - b.y, f.x - b.x), true);
  }
  for (const o of s.barrels) if (o.fuse < 0 && Math.hypot(o.x - b.x, o.y - b.y) < BLAST + 0.04) (o.fuse = 8), (o.owner = b.owner);
  s.boomBy[b.owner] = (s.boomBy[b.owner] ?? 0) + k;
  s.boomBest = Math.max(s.boomBest, s.boomBy[b.owner]);
  if (s.combo.id === b.owner && k) {
    s.combo.n += k;
    s.best = Math.max(s.best, s.combo.n);
    ev(s, 'multi', b.x, b.y - 0.05, s.combo.n);
  }
  if (Math.hypot(s.nx - b.x, s.ny - b.y) < BLAST) hurt(s, s.nx, s.ny, '내가 터뜨린 통에 펑!');
}

/** 떼는 순간: 선을 따라 한순간에 돌진하며 벤다 */
function doDash(s: DashState, pts: { x: number; y: number }[]) {
  if (s.phase !== 'play') return;
  const L = reachOf(s.g), full = L >= HOP;
  const P = tracePath(s, pts, full ? reachFor(s, pts) : HOP);
  // 닌자 바로 위에서 떼면 취소 (게이지도 안 든다)
  if (pathLen(P) < 0.03 && !P.hits.length && !P.bounce) return void ev(s, 'cancel', s.nx, s.ny); // S003: 방패 바로 앞 0길이는 취소가 아니라 '챙' 튕김(헛방)
  if (full && !(s.free > 0)) s.g = Math.max(0, s.g - dashCost(pathLen(P))); // 공짜 한 획이면 먹이 안 든다
  s.free = 0;
  s.dashes++;
  if (!s.firstDash) s.firstDash = true;
  see(s, 'dash', '');
  const id = ++s.dashN;
  let n = 0, gain = 0, boss = false;
  for (const h of P.hits) {
    const f = s.foes.find((q) => q.id === h.id);
    if (!f) continue;
    const lg = P.legs[h.leg], a = Math.atan2(lg[3] - lg[1], lg[2] - lg[0]);
    n++;
    gain += GAIN * n;
    s.pts += PTS[f.k] * n;
    if (h.leg > 0) s.mirK++;
    if (leafy(s, f)) (s.leafCut = true), (s.leafGuide = false), (s.dodgeN = 0);
    if (f.k === 'boss') {
      boss = true;
      f.hp--;
      f.hurtT = 30;
      if (f.hp > 0) {
        (f.st = STUN), (f.tm = 55);
        f.x = clamp(f.x + Math.cos(a) * 0.06, X0, X1);
        f.y = clamp(f.y + Math.sin(a) * 0.06, Y0, Y1);
        ev(s, 'bosshit', f.x, f.y, f.hp);
        continue;
      }
      s.pts += 300;
    }
    if (f.k === 'shield') s.backK++;
    if (!globalThis.__SHIP__ && f.k === 'bell') (s.bellGuide = false), (s.dodgeN = 0), see(s, 'bellCut', '쩍!'); // M2 S8 번들 덜기 ⓑ: 보류한 종의 알림 글은 짧게(어느 판에도 종이 없음)
    kill(s, f, n, a, false);
  }
  if (boss && n >= 3) s.bossCombo = Math.max(s.bossCombo, n - 1);
  for (const fl of P.falls) { // 🎋 쓰러짐
    const b = s.bamboos.find((q) => q.id === fl.id)!;
    (b.fall = s.t), (b.dx = fl.dx), (b.dy = fl.dy);
    (s.bambooGuide = false), (s.dodgeN = 0);
    ev(s, 'fall', b.x, b.y, fl.k);
    see(s, 'bambooFall', '쓰러진 대나무가 줄을 베어요!');
  }
  for (const id of P.toks) { // 🎋 곧은 칼엔 '툭' — 흔들리기만(벌 없음 · 먹도 안 돌려줌)
    const b = s.bamboos.find((q) => q.id === id)!;
    b.wob = s.t;
    ev(s, 'tok', b.x, b.y);
    see(s, 'bamboo', '대나무는 곧은 칼엔 툭! 꺾어 들어가요');
    if (!s.bambooGuide) (s.bambooGuide = true), s.dodgeN++;
  }
  if (!globalThis.__SHIP__) for (const bq of P.bells) if (bq.n === 1) { // 🔔 한 번만 지나면 '댕' — 다음엔 되돌아 두 번
    const f = s.foes.find((q) => q.id === bq.id);
    if (!f) continue;
    f.hurtT = 20;
    ev(s, 'ding', f.x, f.y);
    see(s, 'bell', '종은 두 번 지나야 깨져요');
    s.bellGuide = true;
    s.dodgeN++;
  }
  // 🍃 '휙'만 난 획은 먹을 돌려준다 — 처음 하는 사람이 휙에 먹이 말라 갇히지 않게(휙만으로는 판이 안 끝나서 연타엔 득이 없다)
  if (full && n === 0 && (P.dodges.length || P.bells.length) && !P.shots.length && !P.barrels.length) s.g = Math.min(GMAX, s.g + dashCost(pathLen(P))); // 🔔 댕만 난 획도
  // 🍃 '휙': 피한 잎 너구리는 그 토막에 수직으로, 닌자가 내릴 자리에서 먼 쪽으로 옮겨 선다
  for (const dq of P.dodges) {
    const f = s.foes.find((q) => q.id === dq.id);
    if (!f) continue;
    const lg = P.legs[dq.leg] ?? P.legs[0], L = Math.hypot(lg[2] - lg[0], lg[3] - lg[1]) || 1, nx = -(lg[3] - lg[1]) / L, ny = (lg[2] - lg[0]) / L;
    const sg = (f.x - P.ex) * nx + (f.y - P.ey) * ny >= 0 ? 1 : -1;
    f.x = clamp(f.x + nx * sg * LEAF_HOP, X0 + 0.02, X1 - 0.02);
    f.y = clamp(f.y + ny * sg * LEAF_HOP, Y0 + 0.02, Y1 - 0.02);
    ev(s, 'dodge', f.x, f.y, dq.leg); // n = 휙 난 토막(0 = 첫 토막)
    see(s, 'leaf', '잎 너구리는 곧은 칼을 휙! 꺾어 들어가 베요');
    if (n === 0) s.g = Math.min(GMAX, s.g + GAIN); // 휙만 난 획에만(🧪 M2 S1: 섞인 판에서 '먹 우물' 막기) 휙 하며 먹을 흘린다(+7) — 잎만 남으면 먹을 얻을 길이 없어 처음 하는 사람이 말라 갇히던 것(꾹 동안 주는 먹 > 쉬는 동안 차는 먹)
    s.dodgeN++;
    if (s.dodgeN >= OWL_DODGES && !s.owl && !s.owlNo) s.owlAsk = true; // M2 S4 ㉛: 2-1에서 휙 세 번이면 부엉이가 묻는다 · S10: 큰 너구리 휙을 빼 보니 카드 .92→.75지만 처음 첫 도전 .45→.36 · 3번 안 .81→.73(카드가 돕고 있음) → 그대로(📋)
    if (s.dodgeN === LEAF_DEMO) see(s, 'leafDemo', '손가락을 따라 옆에서 꺾어 그어 보세요');
    s.leafGuide = true; // 휙 뒤: 다음에 잎을 벨 때까지 잎 길잡이(📐 첫 휙 뒤 한 번 → 처음 봇이 먹이 말라 다시 막혀서 휙마다)
  }
  for (const bid of P.barrels) {
    const b = s.barrels.find((q) => q.id === bid);
    if (b && b.fuse < 0) (b.fuse = FUSE), (b.owner = id);
  }
  for (const j of [...P.shots].sort((a, b) => b - a)) {
    const sh = s.shots[j];
    ev(s, 'shotcut', sh.x, sh.y, sh.k);
    s.shots.splice(j, 1);
    s.arrows++;
    gain += SHOT_G;
    s.pts += 5;
    see(s, 'shotcut', '날아오는 화살·수리검도 돌진 선에 끊겨요!');
  }
  s.g = Math.min(GMAX, s.g + gain);
  {
    const th = thornOf(s, P.legs);
    if (th) {
      // 꼬리털만 걸린다: ★★★(꼬리 하나도 안 잃기)만 놓치고 목숨은 안 준다 — 처음 하는 사람이 덤불 때문에 지지는 않게
      see(s, 'thorn', '덤불도 한 대! ★★★ 놓침 — 꺾어 돌아가요');
      s.hits++;
      ev(s, 'hurt', th.x, th.y, s.hp, '가시덤불에 걸렸어요 — ★★★ 놓침');
    }
  }
  const last = P.legs[P.legs.length - 1];
  if (Math.abs(last[2] - last[0]) > 0.005) s.face = last[2] > last[0] ? 1 : -1;
  s.nx = P.ex;
  s.ny = P.ey;
  // ✏️ S011 압박: 아무것도 못 벤 튕김이 60틱 안에 또 오면 무적을 안 준다 — 방패 앞 연타 튕김으로 서서 버티던 구멍(한 번 튕김은 그대로 봐줌)
  const idle = n === 0 && P.bounce && s.t - s.bounceT < 12;
  if (P.bounce && n === 0) s.bounceT = s.t;
  if (P.legs.length > 1 && pts.length > 1) s.bents++; // S012 꺾은 획 수(1-2 길잡이를 끄는 데 씀)
  if (!idle) s.inv = Math.max(s.inv, INV_DASH);
  s.combo = { id, n, t: s.t };
  s.best = Math.max(s.best, n);
  if (n > 0 || P.shots.length) s.chain++;
  else s.chain = 0;
  if (s.chain >= 3) see(s, 'chain', '연쇄 — 쉬지 않고 이어 베면 점수가 불어나요');
  s.freeze = n > 0 ? Math.min(8, 2 + n) : P.bounce && !idle ? 3 : 0; // S011: 연달아 튕기면 멈칫도 없다(세상이 멈춰 서서 버티던 진짜 원인)
  if (n >= 3) s.slowT = 30;
  if (n >= 3 && s.firstBig < 0) s.firstBig = s.t;
  s.trail = { legs: P.legs, t: s.t, n };
  s.sheathT = s.t;
  s.mood = n >= 3 ? 2 : n > 0 ? 1 : 0;
  s.moodT = 70;
  if (n >= 3) s.owlT = s.t;
  ev(s, 'dash', P.ex, P.ey, n, full ? '' : 'hop');
  if (n >= 2) {
    const ks = s.cuts.slice(-n);
    ev(s, 'multi', ks.reduce((a, c) => a + c.x, 0) / ks.length, ks.reduce((a, c) => a + c.y, 0) / ks.length, n);
  }
  // ✏️ 오너 피드백(M2 S9 뒤 "한방에 그어서 처치하면 시간이 다 찬다던지 더 멋있는 연출"): 한 획 싹쓸이 —
  //   한 돌진에 셋 넘게 베고 화면에 남은 적이 없으면 느린 시간 게이지가 가득 차고 슬로가 두 배(연출은 금빛 칼자국 · 화면 가로 먹 띠 '싹쓸이!' · 게이지 금테)
  if (n >= 3 && !s.foes.some((f) => f.st !== ENTER)) {
    s.g = GMAX;
    s.slowT = 60;
    s.free = 240; // 🧪: 셋을 베면 먹이 이미 가득인 때가 많아(76~89%) '가득'만으로는 안 느껴짐 → 다음 한 획 공짜(꾹 4초까지)
    s.trail.sw = true;
    ev(s, 'sweep', P.ex, P.ey, n);
    see(s, 'sweep', '싹쓸이! 다음 한 획은 먹이 안 들어요');
  }
  if (P.bounce) ev(s, 'bounce', P.ex, P.ey);
  // ✏️ S004 '찾아오는 위협': 너구리 포수가 내린 자리를 노린다 — 빨간 고리가 조이고, 그 자리에 남아 있으면 맞는다.
  //   실시간 사람 반응(0.5초)보다 짧게 닿고, 꾹 하면(세상 0.12배) 비켜 갈 틈이 생긴다.
  {
    const T = STRIKE.on ? STRIKE.t || STAGES[s.stage].strike || 0 : 0;
    if (T > 0) s.strikes.push({ x: s.nx, y: s.ny, t: T, t0: T });
  }
  if (TUNE.counterR > 0)
    for (const f of s.foes)
      if (MELEE[f.k] && (f.st === IDLE || f.st === REST) && Math.hypot(f.x - s.nx, f.y - s.ny) < TUNE.counterR) {
        f.st = WIND;
        f.tm = TUNE.counterT * easeOf(s)[1];
        ev(s, 'counter', f.x, f.y);
      }
  // ✏️ S003 헛방 벌(📐 CONTENT 개발 메모 2): 아무것도 못 벤 획 — 먹 -10 · 20틱 다시 못 긋기 · 근처 칼잡이가 그 틈에 바로 칼을 든다
  if (n === 0 && !P.shots.length && !P.barrels.length && !P.toks.length && !P.falls.length) {
    s.g = Math.max(0, s.g - TUNE.whiffG);
    s.stiff = TUNE.stiff;
    s.whiffs++;
    for (const f of s.foes) if (MELEE[f.k] && f.st === IDLE && Math.hypot(f.x - s.nx, f.y - s.ny) < TUNE.whiffR) f.cool = 0;
    ev(s, 'whiffme', s.nx, s.ny);
  }
  if (s.chain >= 2 && n > 0) ev(s, 'chain', P.ex, P.ey, s.chain);
}

function turnTo(a: number, want: number, rate: number) {
  let d = want - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + clamp(d, -rate, rate);
}
const inSmoke = (s: DashState, x: number, y: number) => s.smokes.some((m) => Math.hypot(x - m.x, y - m.y) < m.r);

function foeStep(s: DashState, f: Foe, dt: number, hidden: boolean) {
  if (f.hurtT > 0) f.hurtT -= dt;
  if (f.whiff > 0) f.whiff -= dt;
  if (f.st === ENTER) {
    f.tm += dt;
    const u = Math.min(1, f.tm / ENTER_T);
    f.x = f.ex + (f.tx - f.ex) * u;
    f.y = f.ey + (f.ty - f.ey) * u;
    if (u >= 1) {
      (f.st = IDLE), (f.tm = 0);
      if (!s.spotted.has(f.k) && f.k !== 'dummy') {
        s.spotted.add(f.k);
        s.spot = { id: f.id, t: s.t, label: nameOf(s, f) };
      }
    }
    return;
  }
  if (f.k === 'dummy' || f.k === 'leaf' || f.k === 'bell') return;
  const dx = s.nx - f.x, dy = s.ny - f.y, d = Math.hypot(dx, dy) || 1e-6;
  if (!hidden) f.fa = turnTo(f.fa, Math.atan2(dy, dx), (f.k === 'shield' ? TUNE.shieldTurn : 0.3) * dt);
  const m = MELEE[f.k];
  if (m) {
    if (f.st === IDLE) {
      f.cool -= dt;
      if (d > m.start) {
        if (!hidden) {
          const v = SPD[f.k] * dt * easeOf(s)[2];
          f.x += (dx / d) * v;
          f.y += (dy / d) * v;
        }
      } else if (!hidden && f.cool <= 0) (f.st = WIND), (f.tm = m.wind * easeOf(s)[1]);
    } else if (f.st === WIND) {
      f.tm -= dt;
      if (f.tm <= 0) {
        if (d < m.reach && s.inv <= 0) {
          ev(s, 'slash', f.x, f.y, 1);
          hurt(s, s.nx, s.ny, `${nameOf(s, f)}에게 베였어요`);
        } else {
          ev(s, 'whiff', f.x, f.y, 0);
          f.whiff = 40;
        }
        (f.st = REST), (f.tm = m.rest + (d < m.reach ? 0 : 20));
      }
    } else {
      f.tm -= dt;
      if (f.tm <= 0) f.st = IDLE;
    }
    return;
  }
  // 멀리서 쏘는 적: 너무 가까우면 물러서고, 겨눈 뒤 쏜다
  if (f.st === IDLE) {
    if (d < 0.24) {
      f.x = clamp(f.x - (dx / d) * SPD[f.k] * dt, X0, X1);
      f.y = clamp(f.y - (dy / d) * SPD[f.k] * dt, Y0, Y1);
    }
    f.cool -= dt;
    if (f.cool <= 0 && !hidden && d > 0.12) (f.st = AIM), (f.tm = f.k === 'archer' ? 72 : 60), (f.ax = s.nx), (f.ay = s.ny);
  } else if (f.st === AIM) {
    f.tm -= dt;
    if (f.tm > LOCK && !hidden) (f.ax = s.nx), (f.ay = s.ny);
    if (f.tm <= 0) {
      const a = Math.atan2(f.ay - f.y, f.ax - f.x);
      if (f.k === 'archer') s.shots.push({ k: 0, x: f.x, y: f.y, vx: Math.cos(a) * ARROW_V, vy: Math.sin(a) * ARROW_V, a });
      else for (const o of [-0.3, 0, 0.3]) s.shots.push({ k: 1, x: f.x, y: f.y, vx: Math.cos(a + o) * STAR_V, vy: Math.sin(a + o) * STAR_V, a: 0 });
      ev(s, 'shoot', f.x, f.y, f.k === 'archer' ? 0 : 1);
      (f.st = IDLE), (f.cool = (f.k === 'archer' ? 90 : 150) + s.rng() * 60);
    }
  } else {
    f.tm -= dt;
    if (f.tm <= 0) f.st = IDLE;
  }
}

function segHit(ax: number, ay: number, bx: number, by: number, m: Mirror) {
  const rx = bx - ax, ry = by - ay, ex = m.bx - m.ax, ey = m.by - m.ay, den = rx * ey - ry * ex;
  if (Math.abs(den) < 1e-12) return false;
  const u = ((m.ax - ax) * ey - (m.ay - ay) * ex) / den, v = ((m.ax - ax) * ry - (m.ay - ay) * rx) / den;
  return u >= 0 && u <= 1 && v >= 0 && v <= 1;
}

function world(s: DashState, dt: number) {
  if (dt <= 0) return;
  s.wt += dt;
  s.waveT += dt;
  if (s.bamboos.some((b) => b.fall >= 0 && s.t - b.fall > 30)) s.bamboos = s.bamboos.filter((b) => b.fall < 0 || s.t - b.fall <= 30); // 🎋 쓰러지고 0.5초 뒤 사라짐
  const hidden = !globalThis.__SHIP__ && inSmoke(s, s.nx, s.ny);
  for (const f of [...s.foes]) foeStep(s, f, dt, hidden);
  for (const k of s.strikes) {
    k.t -= dt;
    if (k.t <= 0) {
      ev(s, 'strike', k.x, k.y);
      if (Math.hypot(s.nx - k.x, s.ny - k.y) < STRIKE.r) hurt(s, s.nx, s.ny, '내린 자리를 노렸어요');
    }
  }
  s.strikes = s.strikes.filter((k) => k.t > 0);
  if (s.phase !== 'play') return;
  // 서로 겹치지 않게
  for (let i = 0; i < s.foes.length; i++)
    for (let j = i + 1; j < s.foes.length; j++) {
      const a = s.foes[i], b = s.foes[j];
      if (a.st === ENTER || b.st === ENTER || a.k === 'dummy' || b.k === 'dummy') continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), want = RAD[a.k] + RAD[b.k] + 0.004;
      if (d >= want || d < 1e-6) continue;
      const push = ((want - d) / 2) * Math.min(1, dt * 2);
      a.x = clamp(a.x - (dx / d) * push, X0, X1);
      a.y = clamp(a.y - (dy / d) * push, Y0, Y1);
      b.x = clamp(b.x + (dx / d) * push, X0, X1);
      b.y = clamp(b.y + (dy / d) * push, Y0, Y1);
    }
  for (let i = s.shots.length - 1; i >= 0; i--) {
    const sh = s.shots[i], ox = sh.x, oy = sh.y;
    sh.x += sh.vx * dt;
    sh.y += sh.vy * dt;
    if (sh.k === 1) sh.a += 0.5 * dt;
    if (s.mirrors.some((m) => segHit(ox, oy, sh.x, sh.y, m))) {
      ev(s, 'clink', sh.x, sh.y);
      s.shots.splice(i, 1);
      continue;
    }
    if (Math.hypot(sh.x - s.nx, sh.y - s.ny) < NIN_HIT && s.inv <= 0) {
      s.shots.splice(i, 1);
      hurt(s, s.nx, s.ny, sh.k ? '수리검에 맞았어요' : '화살에 맞았어요');
      if (s.phase !== 'play') return;
      continue;
    }
    if (sh.x < -0.1 || sh.x > 1.1 || sh.y < Y0 - 0.2 || sh.y > Y1 + 0.2) s.shots.splice(i, 1);
  }
  for (const b of [...s.barrels]) {
    if (b.fuse < 0) continue;
    b.fuse -= dt;
    if (b.fuse <= 0 && s.barrels.includes(b)) explode(s, b);
    if (s.phase !== 'play') return;
  }
  if (!globalThis.__SHIP__) for (const m of s.smokes) {
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    if (m.x < X0 + m.r * 0.6 || m.x > X1 - m.r * 0.6) m.vx = -m.vx;
    if (m.y < Y0 + m.r * 0.6 || m.y > Y1 - m.r * 0.6) m.vy = -m.vy;
  }
  const d = STAGES[s.stage];
  if (s.wave < d.waves.length) {
    const w = d.waves[s.wave];
    const alive = s.foes.length;
    const gap = d.gap ?? 80; // ✏️ M2 S5(🧪): 월드 2는 다 베어도 다음 무리까지 gap틱 — 판 = 웨이브 수 × 3초라 사람 한붓이 9~18초였다
    if ((alive === 0 && s.waveT >= gap) || (alive <= w.need && s.waveT >= Math.max(150, gap)) || s.waveT >= w.wait) spawnWave(s);
  } else if (s.foes.length === 0) endStage(s, true, '');
}

function spawnWave(s: DashState) {
  const d = STAGES[s.stage], w = d.waves[s.wave], flip = s.stage > 0 && s.rng() < 0.5;
  const J = () => (s.rng() - 0.5) * 0.04;
  for (const [k, x0, y0, side] of w.foes) {
    const x = clamp((flip ? 1 - x0 : x0) + (s.stage ? J() : 0), X0 + 0.01, X1 - 0.01), y = clamp(y0 + (s.stage ? J() : 0), Y0 + 0.01, Y1 - 0.01);
    if (k === 'barrel') {
      s.barrels.push({ id: ++s.nid, x, y, fuse: -1, owner: 0, born: s.t });
      continue;
    }
    if (k === 'bamboo') { // 🎋 적이 아니다 — 깨기·need 셈에 안 들고, 안 쓰면 남는다
      s.bamboos.push({ id: ++s.nid, x, y, fall: -1, dx: 0, dy: -1, wob: -99 });
      continue;
    }
    const sd = side === 1 ? (flip ? 2 : 1) : side === 2 ? (flip ? 1 : 2) : side;
    const ex = sd === 1 ? -0.08 : sd === 2 ? 1.08 : x, ey = sd === 3 ? Y0 - 0.12 : y;
    const instant = s.stage === 0 && s.wave === 0;
    s.foes.push({
      id: ++s.nid, k, x: instant ? x : ex, y: instant ? y : ey, tx: x, ty: y, ex, ey, hp: k === 'boss' ? 4 : 1,
      st: instant ? IDLE : ENTER, tm: 0, fa: Math.atan2(s.ny - y, s.nx - x), cool: k === 'archer' ? 20 + s.rng() * 40 : k === 'shuri' ? 60 + s.rng() * 60 : 20,
      ax: s.nx, ay: s.ny, hurtT: 0, whiff: 0, seed: Math.floor(s.rng() * 1e6),
    });
  }
  s.wave++;
  s.waveT = 0;
  ev(s, 'wave', 0.5, 0.6, s.wave);
}

function newStage(s: DashState) {
  const d = STAGES[s.stage], flip = s.stage > 0 && s.rng() < 0.5, F = (x: number) => (flip ? 1 - x : x);
  s.nx = d.start[0];
  s.ny = d.start[1];
  s.face = 1;
  s.hp = HP;
  s.inv = 30;
  s.g = d.g0 ?? G0;
  s.down = false;
  s.stiff = 0;
  s.aim = null;
  s.freeze = 0;
  s.slowT = 0;
  s.foes = [];
  s.shots = [];
  s.strikes = [];
  s.barrels = (d.barrels ?? []).map(([x, y]) => ({ id: ++s.nid, x: F(x), y, fuse: -1, owner: 0, born: s.t }));
  s.mirrors = (d.mirrors ?? []).map(([ax, ay, bx, by]) => ({ ax: F(ax), ay, bx: F(bx), by }));
  s.thorns = (d.thorns ?? []).map(([x, y, r]) => ({ x: F(x), y, r }));
  s.bamboos = [];
  s.bambooGuide = false;
  s.smokes = (d.smokes ?? []).map(([x, y, r], k) => ({ x: F(x), y, r, vx: (k % 2 ? -1 : 1) * 0.0006, vy: (k % 2 ? 1 : -1) * 0.0004 }));
  s.wave = 0;
  s.waveT = 0;
  s.chain = 0;
  s.best = 0;
  s.hits = 0;
  s.arrows = 0;
  s.backK = 0;
  s.boomBest = 0;
  s.boomBy = {};
  s.mirK = 0;
  s.bossCombo = 0;
  s.combo = { id: -1, n: 0, t: -99 };
  s.phase = 'play';
  s.pt = 0;
  s.trail = null;
  s.starOk = [false, false, false];
  if (!s.again) s.base = s.pts;
  s.owlNo = false;
  s.free = 0;
  s.owlAsk = !s.owl && s.failN >= OWL_FAILS; // M2 S4: 같은 판 세 번 지면 부엉이가 묻는다
  s.seen.add(d.key);
  if (d.smokes) s.seen.add('smoke');
  spawnWave(s);
}

/** ✏️ M2 S4 부엉이 귀띔에 답한다: yes면 이 판을 깰 때까지 길을 보여 주고(★★★ 없음), no면 이 시도에선 다시 안 묻는다 */
export function useOwl(s: DashState, yes: boolean) {
  s.owlAsk = false;
  if (yes) s.owl = true;
  else s.owlNo = true;
}
/** M2 S4 월드 잠금(📐 GDD §6.1): 월드 n을 열려면 앞 월드들 별 합이 18×(n−1) */
export const WORLD_LOCK = 18;
export const worldStars = (best: Record<string, number>, keys: string[]) => keys.reduce((a, k) => a + (best[k] ?? 0), 0);

/** 측정·판 고르기용: k판부터 새로 시작한다(하트·점수는 그대로) — ✏️ M0 */
export function startStage(s: DashState, k: number) {
  s.stage = Math.max(0, Math.min(STAGES.length - 1, k));
  s.again = false;
  (s.failN = 0), (s.owl = false);
  newStage(s);
}

function starMet(s: DashState, st: Star) {
  switch (st.k) {
    case 'multi': return s.best >= (st.n ?? 0);
    case 'nohit': return s.hits === 0 || !!STAGES[s.stage].gift3;
    case 'arrow': return s.arrows >= (st.n ?? 0);
    case 'back': return s.backK >= (st.n ?? 0);
    case 'boom': return s.boomBest >= (st.n ?? 0);
    case 'mirror': return s.mirK >= (st.n ?? 0);
    case 'boss': return s.bossCombo >= (st.n ?? 0);
  }
}
/** 결과 화면: 놓친 별마다 무엇이 모자랐는지(✏️ S002 · 📋 M1 완료 기준 ②) — 다 땄으면 '' */
export function missOf(s: DashState) {
  const d = STAGES[s.stage];
  return [!s.starOk[1] ? `한 번에 ${s.best} / ${d.n}` : '', !s.starOk[2] ? `맞음 ${s.hits}` : ''].filter(Boolean).join(' · ');
}
function starNow(s: DashState, st: Star): string {
  const n = st.n ?? 0, v = st.k === 'multi' ? s.best : st.k === 'arrow' ? s.arrows : st.k === 'back' ? s.backK : st.k === 'boom' ? s.boomBest : st.k === 'mirror' ? s.mirK : -1;
  return v > 0 && v < n ? `${v}/${n}` : '';
}

function endStage(s: DashState, ok: boolean, why: string) {
  if (s.phase !== 'play') return;
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  s.down = false;
  s.aim = null;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = [true, starMet(s, d.stars[0]), starMet(s, d.stars[1]) && !(s.owl && d.stars[1].k === 'nohit')]; // M2 S4: 귀띔을 쓰면 ★★★ 없음
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    s.mood = 2;
    s.moodT = 999;
    ev(s, 'clear', 0.5, 0.8);
  } else {
    s.pts = s.base; // ✏️ S002(🧪): 진 시도의 점수는 남기지 않는다(오래 머물수록 점수가 쌓이던 것)
    s.tries++; // ✏️ S002: 하트 폐지 — 지면 그 판만 바로 다시(📐 GDD §10)
    s.failN++;
    s.mood = 4;
    s.moodT = 999;
    ev(s, 'fail', s.nx, s.ny, 0, why);
  }
}

function cosmetic(s: DashState) {
  s.camX += (s.nx - 0.5 - s.camX) * 0.08;
  if (s.moodT > 0 && --s.moodT === 0) s.mood = 0;
  s.slowVis += ((s.down && s.g > 0 && s.phase === 'play' ? 1 : 0) - s.slowVis) * 0.25;
  s.events = s.events.filter((e) => s.t - e.t < 90);
  s.cuts = s.cuts.filter((c) => s.t - c.t < 80);
  s.inks = s.inks.filter((k) => s.t - k.t < 420);
  if (s.spot && s.t - s.spot.t > 110) s.spot = null;
  if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
}

export const slowdash: GameDef<DashState> = {
  id: 'slowdash',
  name: '느린 시간 닌자',
  controls: 'touch',
  aspect: A,
  art: {
    palette: { bg: '#141a33', ink: '#f4ead2', muted: '#8c93b8', accent: '#ffd36b', hot: '#ff5a4e', soft: '#2a3358' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, wt: 0, stage: 0, phase: 'play', pt: 0, ok: false, why: '',
      stars: 0, base: 0, got: 0, starOk: [false, false, false], pts: 0, won: false, dead: false, again: false, tries: 0,
      nx: 0.5, ny: 1.17, face: 1, hp: HP, inv: 0, g: GMAX, down: false, lock: false, stiff: 0, whiffs: 0, stroke: [], anchor: null, dwell: 0, aim: null, holdT: 0, freeze: 0, slowT: 0,
      strikes: [], foes: [], shots: [], barrels: [], mirrors: [], smokes: [], bamboos: [], thorns: [], nid: 0, wave: 0, waveT: 0,
      dashN: 0, chain: 0, best: 0, hits: 0, arrows: 0, backK: 0, boomBest: 0, boomBy: {}, mirK: 0, bounceT: -999, bents: 0, leafGuide: false, leafCut: false, dodgeN: 0, bellGuide: false, bambooGuide: false, failN: 0, free: 0, owlAsk: false, owlNo: false, owl: false, bossCombo: 0, dashes: 0,
      firstDash: false, firstBig: -1, firstPress: -1, combo: { id: -1, n: 0, t: -99 },
      seen: new Set<string>(), spotted: new Set<string>(), newsQ: [], news: null, spot: null, events: [], cuts: [], inks: [], trail: null,
      camX: 0, mood: 0, moodT: 0, owlT: -999, sheathT: -999, slowVis: 0,
    } as DashState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null;
    if (s.phase === 'play') {
      if (p) {
        if (!s.down && !s.lock && s.stiff <= 0) {
          s.down = true;
          s.holdT = 0;
          s.stroke = [];
          s.anchor = null;
          s.dwell = 0;
          if (s.firstPress < 0) s.firstPress = s.t;
        }
        if (s.down) {
          const q = { x: clamp(p.x, X0, X1), y: clamp(p.y * A, Y0, Y1) };
          // 한붓 획: 처음 누른 점, 그다음은 손가락이 STROKE_STEP 넘게 움직일 때마다 점을 남긴다(가만히 누르면 지금처럼 한 줄)
          // ✏️ 오너 질문(M2 전 "어떨 때는 원이 그려지고 어떨 때는 직선만"): 전에는 첫 점을 '한 틱 전 손가락'과 비교해서,
          //   천천히 그리기 시작하면(한 프레임에 판 3.5% 미만) 획이 끝내 시작되지 않고 곧은 줄이 됐다 → 처음 누른 자리(anchor)와 비교한다
          if (!s.anchor) s.anchor = q;
          // ✏️ S010 다시 그리기 → 손가락을 닌자 위에 잠깐(⅓초) 두면 지워진다 — 원을 닌자 쪽으로 닫거나 스쳐 지날 때 지워지던 것 막기
          const onNinja = Math.hypot(q.x - s.nx, q.y - s.ny) < ERASE_R;
          s.dwell = onNinja && s.stroke.length ? s.dwell + 1 : 0;
          if (s.dwell >= ERASE_DWELL) (s.stroke = []), (s.anchor = q), (s.dwell = 0), ev(s, 'erase', s.nx, s.ny);
          const last = s.stroke[s.stroke.length - 1];
          if (!last) {
            if (Math.hypot(q.x - s.anchor.x, q.y - s.anchor.y) >= STROKE_STEP) s.stroke.push(s.anchor);
          } else if (Math.hypot(q.x - last.x, q.y - last.y) >= STROKE_STEP && s.stroke.length < STROKE_MAX) s.stroke.push(q);
          s.aim = q;
          s.holdT++;
          // ✏️ S011 첫 빨간 덤불: 그리는 길이 처음 덤불에 걸리면 한 번 알려 준다(다시 그리기를 배우게)
          if (s.thorns.length && !s.seen.has('thornRed') && s.holdT % 4 === 0 && thornOf(s, tracePath(s, strokeOf(s), reachFor(s, strokeOf(s))).legs)) see(s, 'thornRed', '빨간 덤불은 한 대! 손가락을 닌자 위에 잠깐 두면 지워져요');
        }
      } else {
        if (s.down && s.aim) doDash(s, strokeOf(s));
        s.down = false;
        s.lock = false;
        s.aim = null;
      }
      if (s.down) {
        if (s.free > 0) s.free--; // 싹쓸이 뒤 공짜 한 획: 꾹 하는 동안 먹이 안 준다
        else if (s.dwell === 0) s.g -= DRAIN; // M2 S2: 닌자 위에 머물며 지우는 동안엔 먹이 안 준다(⅓초 머물기가 1-6·1-9 사람 한붓 클리어 .96→.88을 깎던 것)
        if (s.g <= 0) {
          s.g = 0;
          if (s.aim) doDash(s, strokeOf(s));
          s.down = false;
          s.lock = true;
          s.aim = null;
          ev(s, 'empty', s.nx, s.ny);
        }
      } else s.g = Math.min(GMAX, s.g + REGEN * easeOf(s)[0]);
    } else {
      s.down = false;
      s.aim = null;
      s.lock = !!p;
    }
    if (s.inv > 0) s.inv--;
    if (s.stiff > 0) s.stiff--;
    let dt = 1;
    if (s.freeze > 0) (s.freeze--, (dt = 0));
    else if (s.down && s.g > 0) dt = SLOW;
    else if (s.slowT > 0) (s.slowT--, (dt = SLOW2));
    if (s.phase === 'result') {
      s.pt++;
      cosmetic(s);
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), (s.failN = 0), (s.owl = false), s.stage++, newStage(s);
        } else (s.again = true), newStage(s);
      }
      return;
    }
    world(s, dt);
    cosmetic(s);
    s.pt++;
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
/** ✏️ M2 S7 번들 덜기: 공장 때 설계 메모(화면에서 안 씀) — 플레이 빌드는 이 export를 안 가져가서 빠진다 */
export const NOTES = {
  genes: ['bullettime', 'pointer', 'chain'],
  twist: '누르고 있는 동안만 세상이 느려지는데 그 게이지가 돌진(길수록 많이)에도 들어서, 적을 한 줄에 여럿 세워 벨 때만 게이지가 오히려 찬다 — 기다려 줄 세우기와 날아오는 것 피하기 사이의 줄타기',
  rules: [
    '꾹 누르면 세상이 느려지고 닌자에서 손가락까지 선이 보여요. 떼면 번쩍! 그 선 위의 적을 모두 베요.',
    '선이 길수록·오래 누를수록 게이지가 줄고, 한 번에 여럿 벨수록 많이 차요.',
    '맞으면 체력 -1, 다 잃으면 하트 -1(그 판 다시). 적을 모두 베면 다음 판!',
  ],
  hint: '꾹 누르면 느려지고, 떼면 번쩍 돌진! / 화살표로 겨누고 스페이스',
  art: {
    concept: '달밤 대나무 숲의 여우 닌자 — 먹물 그림책',
    mood: '커다란 보름달 아래 대나무 숲 실루엣이 겹겹이 흔들리고, 반딧불이 떠다닌다. 누르면 세상이 먹빛 회색으로 바래며 느려지고, 떼는 순간 하얀 칼빛이 번쩍 — 베인 너구리 졸개들이 반으로 갈라져 먹물이 튄다.',
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });

/** (qx,qy)에 서 있으면 몇 틱 뒤에 맞는가 (skip = 이번 돌진으로 사라질 적·화살) */
function danger(s: DashState, qx: number, qy: number, skipF: Set<number>, skipS: Set<number>) {
  let T = 999;
  s.shots.forEach((sh, j) => {
    if (skipS.has(j)) return;
    const vv = sh.vx * sh.vx + sh.vy * sh.vy, rx = qx - sh.x, ry = qy - sh.y, tt = Math.max(0, (rx * sh.vx + ry * sh.vy) / vv);
    if (tt > 160) return;
    const cx = sh.x + sh.vx * tt - qx, cy = sh.y + sh.vy * tt - qy;
    if (Math.hypot(cx, cy) < NIN_HIT + 0.018) T = Math.min(T, tt);
  });
  for (const k of s.strikes) if (Math.hypot(k.x - qx, k.y - qy) < STRIKE.r + 0.02) T = Math.min(T, k.t);
  const hidden = !globalThis.__SHIP__ && inSmoke(s, qx, qy);
  for (const f of s.foes) {
    if (skipF.has(f.id) || f.st === ENTER) continue;
    const d = Math.hypot(f.x - qx, f.y - qy), m = MELEE[f.k];
    if (m) {
      if (TUNE.counterR > 0 && (f.st === IDLE || f.st === REST) && d < TUNE.counterR) T = Math.min(T, TUNE.counterT); // S003 착지 반격
      if (f.st === WIND && d < m.reach + 0.025) T = Math.min(T, f.tm);
      else if (!hidden && f.st === IDLE && d < m.start + 0.03) T = Math.min(T, m.wind + Math.max(0, f.cool));
      else if (!hidden && (f.st === IDLE || f.st === REST) && d < 0.3) T = Math.min(T, m.wind + (d - m.start) / SPD[f.k] + (f.st === REST ? f.tm : 0));
    } else if (f.st === AIM && !hidden) {
      const v = f.k === 'archer' ? ARROW_V : STAR_V;
      if (f.tm <= LOCK) {
        if (Math.hypot(f.ax - qx, f.ay - qy) < 0.06) T = Math.min(T, f.tm + d / v);
      } else T = Math.min(T, f.tm + d / v);
    }
  }
  for (const b of s.barrels) if (b.fuse >= 0 && Math.hypot(b.x - qx, b.y - qy) < BLAST + 0.02) T = Math.min(T, b.fuse);
  return T;
}

/** (x,y)에서 한 줄로 꿸 수 있는 적의 최대 수 (다음 돌진 내다보기) */
function lineUp(s: DashState, x: number, y: number, skip: Set<number>, maxL: number) {
  let best = 0;
  const fs = s.foes.filter((f) => !skip.has(f.id) && f.st !== ENTER && (f.k !== 'shield' || !fromFront(f, f.x - x, f.y - y)));
  for (const f of fs) {
    const dx = f.x - x, dy = f.y - y, d = Math.hypot(dx, dy);
    if (d < 0.02 || d > maxL) continue;
    const ux = dx / d, uy = dy / d;
    let c = 0;
    for (const g of fs) {
      const qx = g.x - x, qy = g.y - y, u = qx * ux + qy * uy;
      if (u < 0 || u > maxL) continue;
      if (Math.abs(qx * uy - qy * ux) <= RAD[g.k] + BW * 0.8) c++;
    }
    best = Math.max(best, c);
  }
  return best;
}

/** 셋 이상이 한 줄에 서 있는 줄을 찾아, 그 줄의 끝(밖)에 설 자리 */
function lineSpots(s: DashState) {
  const fs = s.foes.filter((f) => f.st !== ENTER && f.k !== 'shield');
  const out: { x: number; y: number; c: number }[] = [];
  for (let i = 0; i < fs.length; i++)
    for (let j = i + 1; j < fs.length; j++) {
      const a = fs[i], dx = fs[j].x - a.x, dy = fs[j].y - a.y, d = Math.hypot(dx, dy);
      if (d < 0.03) continue;
      const ux = dx / d, uy = dy / d;
      let c = 0, lo = 1e9, hi = -1e9;
      for (const g of fs) {
        const qx = g.x - a.x, qy = g.y - a.y;
        if (Math.abs(qx * uy - qy * ux) > RAD[g.k] + BW * 0.6) continue;
        const u = qx * ux + qy * uy;
        c++;
        lo = Math.min(lo, u);
        hi = Math.max(hi, u);
      }
      if (c < 3 || hi - lo > DMAX - 0.12) continue;
      for (const [u, sg] of [[lo - 0.1, 1], [hi + 0.1, -1]]) {
        const x = a.x + ux * u, y = a.y + uy * u;
        if (x >= X0 && x <= X1 && y >= Y0 && y <= Y1) out.push({ x, y, c: c * sg });
      }
    }
  return out;
}

function cands(s: DashState, L: number) {
  const out: { x: number; y: number }[] = [];
  const push = (x: number, y: number) => out.push({ x: clamp(x, X0, X1), y: clamp(y, Y0, Y1) });
  const P = { x: s.nx, y: s.ny };
  const tg = [...s.foes.filter((f) => f.st !== ENTER).map((f) => ({ x: f.x, y: f.y })), ...s.barrels.filter((b) => b.fuse < 0), ...s.shots.map((q) => ({ x: q.x + q.vx * 4, y: q.y + q.vy * 4 }))];
  for (const f of tg) {
    const dx = f.x - P.x, dy = f.y - P.y, d = Math.hypot(dx, dy) || 1e-6;
    for (const e of [d + 0.07, d + 0.2, L]) push(P.x + (dx / d) * Math.min(L, e), P.y + (dy / d) * Math.min(L, e));
  }
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    for (const e of [0.18, 0.4, 0.7]) push(P.x + Math.cos(a) * Math.min(L, e), P.y + Math.sin(a) * Math.min(L, e));
  }
  for (const f of s.foes)
    if (f.k === 'shield' && f.st !== ENTER)
      for (const o of [Math.PI / 2, -Math.PI / 2, 2.3, -2.3, Math.PI]) for (const r of [0.12, 0.2]) push(f.x + Math.cos(f.fa + o) * r, f.y + Math.sin(f.fa + o) * r);
  for (const b of s.barrels) if (b.fuse < 0) for (let k = 0; k < 6; k++) push(b.x + Math.cos(k * 1.047) * 0.05, b.y + Math.sin(k * 1.047) * 0.05);
  for (const m of s.mirrors)
    for (const u of [0.15, 0.4, 0.6, 0.85]) {
      const mx = m.ax + (m.bx - m.ax) * u, my = m.ay + (m.by - m.ay) * u, dx = mx - P.x, dy = my - P.y, d = Math.hypot(dx, dy) || 1e-6;
      push(P.x + (dx / d) * L, P.y + (dy / d) * L);
    }
  for (const m of s.smokes) push(m.x, m.y);
  for (const q of lineSpots(s)) push(q.x, q.y);
  return out;
}

interface Choice { x: number; y: number; v: number; n: number; safe: number; line: number; boom: number; obj: number; cost: number }
let farm = false;
function judge(s: DashState, x: number, y: number, L: number): Choice {
  const d = STAGES[s.stage];
  const P = trace(s, s.nx, s.ny, x, y, L, true);
  const skipF = new Set<number>(), skipS = new Set<number>(P.shots);
  let n = 0, v = 0, obj = 0, bossIn = false;
  for (const h of P.hits) {
    const f = s.foes.find((q) => q.id === h.id)!;
    n++;
    v += PTS[f.k] * n;
    if (f.k !== 'boss' || f.hp <= 1) skipF.add(f.id);
    if (f.k === 'boss') bossIn = true;
    if (f.k === 'shield' && d.key === 'shield') obj += 90;
    if (f.k === 'archer' && farm) obj -= 400;
    if (h.leg > 0 && goal(d, 'mirror') && s.mirK < 3) obj += 130;
  }
  if ((d.key === 'boss' || d.leafBoss) && n >= 3 && bossIn) obj += 300;
  let boom = 0;
  for (const bid of P.barrels) {
    const b = s.barrels.find((q) => q.id === bid)!;
    if (b.fuse >= 0) continue;
    if (Math.hypot(b.x - P.ex, b.y - P.ey) < BLAST + 0.03) v -= 900;
    for (const f of s.foes) if (!skipF.has(f.id) && Math.hypot(f.x - b.x, f.y - b.y) < BLAST + 0.01) boom++;
  }
  v += boom * 45 - (P.barrels.some((bid) => s.barrels.find((q) => q.id === bid)!.fuse < 0) && boom === 0 ? 40 : 0);
  if (d.key === 'barrel' && boom >= 3 && s.boomBest < 3) obj += 75 * boom;
  v += P.shots.length * 8;
  if (goal(d, 'arrow') && s.arrows < 3) obj += P.shots.length * 130;
  if (P.bounce) v -= 80;
  if (thornOf(s, P.legs)) v -= 650; // S009 가시덤불은 돌아간다
  const cost = reachOf(s.g) >= HOP ? dashCost(pathLen(P)) : 0, after = s.g - cost + GAIN * ((n * (n + 1)) / 2) + P.shots.length * SHOT_G;
  v += 1.2 * (after - s.g);
  const safe = danger(s, P.ex, P.ey, skipF, skipS);
  if (safe < 25) v -= 700;
  else if (safe < 50) v -= 220;
  else if (safe < 90) v -= 50;
  const line = lineUp(s, P.ex, P.ey, skipF, Math.max(HOP, reachOf(after)));
  v += 14 * line;
  // 폭탄 통 판: 통 곁에 서서 적을 꾀어 모은다
  if (d.key === 'barrel' && n === 0) for (const b of s.barrels) if (b.fuse < 0 && Math.hypot(b.x - P.ex, b.y - P.ey) < 0.08) v += 10 * s.foes.filter((f) => MELEE[f.k]).length;
  return { x, y, v: v + obj, n, safe, line, boom, obj, cost };
}

/** 프로토타입 별(화살·거울 …)을 노리는 장인 버릇 — S002 별 틀에는 없어서 꺼진다 */
const goal = (d: StageDef, k: Star['k']) => d.stars.some((q) => q.k === k);
const waitMem = new WeakMap<object, { since: number; key: string }>();
/**
 * 봇: 후보 선을 모두 그어 보고(벨 수·게이지·내릴 곳의 위험·다음 줄 세우기·판 목표) 고른다.
 * 안전하면 기다리거나 줄의 끝으로 옮겨 서서 더 긴 줄을 한 번에 벤다. 위험하면 피한다.
 */
export const slowdashSmart: Bot<DashState> = {
  name: '줄 세워 베기',
  act(s) {
    if (s.phase !== 'play' || s.down || s.lock) return NO;
    const none = new Set<number>();
    const here = danger(s, s.nx, s.ny, none, none), L = Math.max(HOP, reachOf(s.g));
    const live = s.foes.filter((f) => f.st !== ENTER), d = STAGES[s.stage];
    if (!live.length && here > 40) return NO;
    // ✏️ S008(🧪 S007 1-1 탭 봇 300초 멈춤): 적이 하나만 남으면 줄 세울 일이 없다 — 옮겨 서기 굴레 대신 바로 벤다
    if (live.length === 1 && here > 40 && live[0].k !== 'shield') return at(live[0].x, live[0].y); // 방패는 앞이면 튕기니 예전처럼 돌아간다
    const wm = waitMem.get(s);
    farm = goal(d, 'arrow') && s.arrows < 3 && (!wm || s.t - wm.since < 900);
    let best: Choice | null = null, repo: Choice | null = null, kill: Choice | null = null;
    for (const c of cands(s, L)) {
      if (Math.hypot(c.x - s.nx, c.y - s.ny) < 0.04) continue;
      const j = judge(s, c.x, c.y, L);
      if (!best || j.v > best.v) best = j;
      if (j.n > 0 && j.safe >= 25 && (!kill || j.v > kill.v)) kill = j;
      if (j.safe >= 90 && j.line > j.n && (!repo || j.line * 100 + j.v > repo.line * 100 + repo.v)) repo = j;
    }
    if (!best) return NO;
    const want = Math.min(live.length, Math.max(3, d.key === 'barrel' && s.boomBest < 3 ? 3 : 0, ...d.stars.map((q) => (q.k === 'multi' ? q.n ?? 0 : 0))));
    const key = `${s.stage}:${s.wave}:${s.tries}:${live.length}`;
    let m = waitMem.get(s);
    if (!m || m.key !== key) waitMem.set(s, (m = { since: s.t, key }));
    const waited = s.t - m.since;
    const ranged = live.some((f) => f.k === 'archer' || f.k === 'shuri') && live.every((f) => !MELEE[f.k]) && !(goal(d, 'arrow') && s.arrows < 3 && s.wave >= d.waves.length && waited < 900);
    if (s.g < 30) {
      // 게이지가 바닥: 위험할 때만 — 벨 수 있으면 베며 비키고, 아니면 가장 싸게 비킨다
      if (here >= 30) return kill && kill.safe >= 50 && (kill.n >= 2 || waited > 240 || ranged) ? at(kill.x, kill.y) : NO;
      let pick: Choice | null = null, pv = -1e9;
      for (const c of cands(s, L)) {
        if (Math.hypot(c.x - s.nx, c.y - s.ny) < 0.04) continue;
        const j = judge(s, c.x, c.y, L), v = (j.safe >= 60 ? 1000 : j.safe * 10) + j.n * 150 + j.boom * 60 - j.cost * 4;
        if (v > pv) (pv = v), (pick = j);
      }
      return pick ? at(pick.x, pick.y) : NO;
    }
    if (ranged && kill && kill.safe >= 40 && (best.n === 0 || here >= 40)) return at(kill.x, kill.y);
    if (here < 40 || best.n + best.boom >= want || best.obj >= 120) return at(best.x, best.y);
    // 폭탄 통 판: 칼잡이가 셋 이상이면 통 곁으로 가서 꾀어 모은다
    if (d.key === 'barrel' && s.boomBest < 3 && live.filter((f) => MELEE[f.k]).length >= 3) {
      const near = s.barrels.some((b) => b.fuse < 0 && Math.hypot(b.x - s.nx, b.y - s.ny) < 0.08);
      if (!near && waited < 400) {
        let lure: Choice | null = null;
        for (const b of s.barrels)
          if (b.fuse < 0)
            for (let k = 0; k < 6; k++) {
              const j = judge(s, b.x + Math.cos(k * 1.047) * 0.05, b.y + Math.sin(k * 1.047) * 0.05, L);
              if (j.safe >= 50 && Math.hypot(b.x - j.x, b.y - j.y) < 0.08 && (!lure || j.v > lure.v)) lure = j;
            }
        if (lure) return at(lure.x, lure.y);
      }
      if (near && waited < 400) return NO;
    }
    if (repo && repo.line >= Math.min(want, 3) && repo.line > best.n && s.g - repo.cost >= dashCost(0.5)) return at(repo.x, repo.y);
    if (best.n >= 1 && (ranged || waited > 180 || s.g >= 95)) return at(best.x, best.y);
    if (best.n >= 2 && (s.g >= 70 || waited > 90)) return at(best.x, best.y);
    if (kill && waited > 240) return at(kill.x, kill.y);
    if (waited > 300 && repo) return at(repo.x, repo.y);
    return NO;
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number }>();
/** 봇: 아무 때나 아무 데나 꾹 눌렀다 뗀다 */
export const slowdashRandom: Bot<DashState> = {
  name: '아무 데나 번쩍',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 60), hold: 0, x: 0.5, y: 0.5 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 40 + Math.floor(rng() * 120);
    m.x = rng();
    m.y = (Y0 + rng() * (Y1 - Y0)) / A;
    m.hold = 2 + Math.floor(rng() * 40);
    return { tap: false, dir: 0, pointer: { x: m.x, y: m.y } };
  },
};

/** 버릇 봇: 게이지가 되면 늘 가장 가까운 적으로 돌진 (줄 세우기·피하기·아끼기 없음) */
export const slowdashHabit: Bot<DashState> = {
  name: '늘 가장 가까운 적으로',
  act(s) {
    if (s.phase !== 'play' || s.down || s.lock) return NO;
    let best: Foe | null = null, bd = 1e9;
    for (const f of s.foes) {
      if (f.st === ENTER) continue;
      const d = Math.hypot(f.x - s.nx, f.y - s.ny);
      if (d < bd) (bd = d), (best = f);
    }
    return best ? at(best.x, best.y) : NO;
  },
};

/** 독립 버릇 봇: 게이지가 되면 바로, 지금 가장 많이 꿰는 선으로 (기다리기·피하기·판 목표 없음) */
export const slowdashHabit2: Bot<DashState> = {
  name: '늘 가장 많이 꿰는 줄로 바로',
  act(s) {
    if (s.phase !== 'play' || s.down || s.lock) return NO;
    let best: { x: number; y: number; n: number; d: number } | null = null;
    for (const f of s.foes) {
      if (f.st === ENTER) continue;
      const dx = f.x - s.nx, dy = f.y - s.ny, d = Math.hypot(dx, dy) || 1e-6;
      const x = s.nx + (dx / d) * Math.min(DMAX, d + 0.12), y = s.ny + (dy / d) * Math.min(DMAX, d + 0.12);
      const n = trace(s, s.nx, s.ny, x, y, Math.max(HOP, reachOf(s.g)), true).hits.length;
      if (!best || n > best.n || (n === best.n && d < best.d)) best = { x, y, n, d };
    }
    return best ? at(best.x, best.y) : NO;
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
type C2 = CanvasRenderingContext2D;
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}
function lin(ctx: C2, x0: number, y0: number, x1: number, y1: number, ...st: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function radg(ctx: C2, x: number, y: number, r0: number, r1: number, ...st: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.1, r1));
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)));
}
function starPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r * 0.45 : r;
    if (k) ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
    else ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
function heartPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.9, y - r * 1.25, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.9, y - r * 1.25, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
  ctx.closePath();
}
/** 펄럭이는 띠 (두건 끈·목도리·허리띠 꼬리) */
function ribbon(ctx: C2, x0: number, y0: number, len: number, wd: number, t: number, ph: number, col: string, droop = 0.25) {
  const pts: number[][] = [];
  for (let i = 0; i <= 7; i++) {
    const u = i / 7;
    pts.push([x0 - len * u, y0 + len * droop * u + Math.sin(t * 0.18 + ph + u * 4.5) * wd * 1.4 * u]);
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [c, lw] of [['#0b0e1c', wd + 2.4], [col, wd]] as [string, number][]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
}
const OUT = '#0b0e1c';

// ── 장소별 팔레트: 0 대숲 · 1 지붕 · 2 마당 ──
const PAL = [
  { sky: ['#060a1d', '#15204a', '#34467a'], moon: '#fff3d2', far: '#2c3d6c', mid: '#162243', g: ['#2a3f4c', '#3d564c', '#4d6852'], mist: '120,145,205', place: '대숲' },
  { sky: ['#08081e', '#211c4a', '#4f437a'], moon: '#ffe8c2', far: '#342c5e', mid: '#1b1736', g: ['#323c5e', '#435078', '#52608c'], mist: '150,130,200', place: '지붕' },
  { sky: ['#0b0a1b', '#271d40', '#5e4562'], moon: '#ffdcb0', far: '#3a2b4c', mid: '#20172d', g: ['#5a5868', '#77727e', '#8b8590'], mist: '190,150,190', place: '마당' },
];
const HZ = 0.415, GB = 1.31;

interface Bg { sky: HTMLCanvasElement; far: HTMLCanvasElement; mid: HTMLCanvasElement; ground: HTMLCanvasElement; paper: HTMLCanvasElement }
const BG = new Map<string, Bg>();
function layer(w: number, h: number, sc: number, paint: (c: C2) => void) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * sc));
  c.height = Math.max(1, Math.ceil(h * sc));
  const g = c.getContext('2d')!;
  g.scale(sc, sc);
  paint(g);
  return c;
}
function bamboo(g: C2, x: number, top: number, bot: number, wd: number, col: string, hi: string, seed: number, leaves: number, lean: number) {
  g.save();
  g.translate(x, bot);
  g.rotate(lean);
  const L = bot - top;
  g.fillStyle = col;
  g.fillRect(-wd / 2, -L, wd, L);
  g.fillStyle = hi;
  g.fillRect(-wd / 2 + wd * 0.15, -L, wd * 0.18, L);
  g.strokeStyle = 'rgba(0,0,0,.35)';
  g.lineWidth = Math.max(1, wd * 0.12);
  for (let yy = -wd * 3 - hsh(seed) * wd * 6; yy > -L; yy -= wd * (6 + hsh(seed + yy) * 3)) {
    g.beginPath();
    g.moveTo(-wd * 0.6, yy);
    g.lineTo(wd * 0.6, yy);
    g.stroke();
  }
  g.fillStyle = col;
  for (let k = 0; k < leaves; k++) {
    const ly = -L * (0.35 + hsh(seed * 3 + k) * 0.6), dir = hsh(seed + k * 7) < 0.5 ? -1 : 1;
    for (let j = 0; j < 4; j++) {
      const a = dir * (0.25 + j * 0.28) + (dir < 0 ? Math.PI : 0), ll = wd * (5 + hsh(seed + k + j) * 3);
      g.save();
      g.translate(0, ly + j * wd * 0.4);
      g.rotate(a + 0.35 * dir);
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(ll * 0.5, -ll * 0.16, ll, 0);
      g.quadraticCurveTo(ll * 0.5, ll * 0.16, 0, 0);
      g.fill();
      g.restore();
    }
  }
  g.restore();
}
function roofLine(g: C2, x0: number, x1: number, y: number, hgt: number, col: string, curl: number) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x0 - curl, y - curl * 0.6);
  g.quadraticCurveTo(x0 + (x1 - x0) * 0.12, y, (x0 + x1) / 2, y - hgt * 0.15);
  g.quadraticCurveTo(x1 - (x1 - x0) * 0.12, y, x1 + curl, y - curl * 0.6);
  g.lineTo(x1 - (x1 - x0) * 0.18, y - hgt);
  g.lineTo(x0 + (x1 - x0) * 0.18, y - hgt);
  g.closePath();
  g.fill();
}
function getBg(w: number, h: number, place: number, sc: number): Bg {
  const key = `${w}x${h}:${place}:${sc}`;
  const hit = BG.get(key);
  if (hit) return hit;
  const P = PAL[place], hz = HZ * w, gb = GB * w;
  const sky = layer(w, hz + w * 0.04, sc, (g) => {
    g.fillStyle = lin(g, 0, 0, 0, hz, [0, P.sky[0]], [0.55, P.sky[1]], [1, P.sky[2]]);
    g.fillRect(0, 0, w, hz + w * 0.04);
    for (let k = 0; k < 70; k++) {
      g.globalAlpha = 0.25 + hsh(k * 3.1) * 0.6;
      g.fillStyle = k % 9 ? '#dfe6ff' : '#ffe9b0';
      const r = k % 7 ? 0.7 : 1.3;
      g.beginPath();
      g.arc(hsh(k) * w, hsh(k + 99) * hz * 0.8, r, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
    const mx = w * 0.7, my = w * 0.255, mr = w * 0.1;
    g.fillStyle = radg(g, mx, my, mr * 0.8, mr * 3.2, [0, `rgba(255,240,200,.35)`], [0.4, `rgba(255,230,190,.10)`], [1, 'rgba(255,230,190,0)']);
    g.fillRect(0, 0, w, hz);
    g.fillStyle = radg(g, mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mr, [0, '#fffdf2'], [0.7, P.moon], [1, '#e8cf9e']);
    g.beginPath();
    g.arc(mx, my, mr, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(160,130,90,.13)';
    for (const [cx, cy, cr] of [[-0.3, 0.2, 0.22], [0.25, -0.15, 0.15], [0.1, 0.4, 0.12], [-0.1, -0.4, 0.1]]) {
      g.beginPath();
      g.arc(mx + cx * mr, my + cy * mr, cr * mr, 0, TAU);
      g.fill();
    }
    // 달에 걸친 구름
    for (let k = 0; k < 4; k++) {
      const cy = my + (k - 1.5) * mr * 0.55 + mr * 0.3, cx = mx - mr * 1.6 + k * mr * 0.9;
      g.fillStyle = `rgba(${P.mist},${0.1 + 0.05 * (k % 2)})`;
      ell(g, cx, cy, mr * (1.4 + hsh(k) * 0.6), mr * 0.12);
      g.fill();
    }
    // 먼 산 능선
    g.fillStyle = P.far;
    g.globalAlpha = 0.55;
    g.beginPath();
    g.moveTo(0, hz + 4);
    for (let x = 0; x <= w; x += w / 24) g.lineTo(x, hz - w * (0.05 + 0.04 * Math.sin(x / w * 7 + 1) + 0.02 * Math.sin(x / w * 19)));
    g.lineTo(w, hz + 4);
    g.fill();
    g.globalAlpha = 1;
  });
  const fw = w * 1.3, fh = hz + w * 0.05;
  const far = layer(fw, fh, sc, (g) => {
    if (place === 0) {
      for (let k = 0; k < 22; k++) {
        const x = (k / 22) * fw + hsh(k) * 10, mx = w * 0.7 + w * 0.15;
        if (Math.abs(x - mx) < w * 0.09) continue;
        bamboo(g, x, -10, fh, w * (0.007 + hsh(k + 5) * 0.006), P.far, 'rgba(160,190,255,.12)', k + 10, 2, (hsh(k + 1) - 0.5) * 0.06);
      }
    } else if (place === 1) {
      g.fillStyle = P.far;
      for (let k = 0; k < 9; k++) {
        const x0 = (k / 9) * fw + hsh(k) * 20, bw = w * (0.16 + hsh(k + 3) * 0.1), y = fh - w * (0.02 + hsh(k + 7) * 0.05);
        roofLine(g, x0, x0 + bw, y - w * 0.04, w * 0.05, P.far, w * 0.02);
        g.fillRect(x0 + bw * 0.12, y - w * 0.045, bw * 0.76, fh - y + w * 0.05);
        g.fillStyle = 'rgba(255,200,120,.5)';
        if (hsh(k + 2) < 0.6) g.fillRect(x0 + bw * 0.4, y - w * 0.02, w * 0.012, w * 0.012);
        g.fillStyle = P.far;
      }
      // 먼 탑
      const px = fw * 0.22, py = fh - w * 0.04;
      for (let j = 0; j < 4; j++) roofLine(g, px - w * (0.07 - j * 0.012), px + w * (0.07 - j * 0.012), py - j * w * 0.055, w * 0.03, P.far, w * 0.015);
      g.fillRect(px - w * 0.004, py - w * 0.29, w * 0.008, w * 0.08);
    } else {
      g.fillStyle = P.far;
      const cx = fw * 0.3, by = fh - w * 0.02;
      g.fillRect(cx - w * 0.12, by - w * 0.08, w * 0.24, w * 0.1);
      for (let j = 0; j < 3; j++) {
        roofLine(g, cx - w * (0.16 - j * 0.03), cx + w * (0.16 - j * 0.03), by - w * 0.08 - j * w * 0.065, w * 0.04, P.far, w * 0.02);
        g.fillRect(cx - w * (0.1 - j * 0.025), by - w * 0.12 - j * w * 0.065, w * (0.2 - j * 0.05), w * 0.04);
      }
      g.fillStyle = 'rgba(255,190,120,.45)';
      for (let j = 0; j < 5; j++) g.fillRect(cx - w * 0.08 + j * w * 0.04, by - w * 0.05, w * 0.012, w * 0.016);
      g.fillStyle = P.far;
      for (let x = 0; x < fw; x += w * 0.05) g.fillRect(x, by - w * 0.03 - (x > cx - w * 0.2 && x < cx + w * 0.2 ? 0 : 0), w * 0.045, w * 0.06);
    }
    g.fillStyle = lin(g, 0, fh - w * 0.12, 0, fh, [0, `rgba(${P.mist},0)`], [1, `rgba(${P.mist},.45)`]);
    g.fillRect(0, fh - w * 0.12, fw, w * 0.12);
  });
  const mw = w * 1.4, mh = hz + w * 0.06;
  const mid = layer(mw, mh, sc, (g) => {
    if (place === 0) {
      for (let k = 0; k < 9; k++) {
        const x = (k / 9) * mw + hsh(k + 40) * 30, mx = w * 0.7 + w * 0.2;
        if (Math.abs(x - mx) < w * 0.12) continue;
        bamboo(g, x, -20, mh, w * (0.016 + hsh(k + 41) * 0.012), P.mid, 'rgba(150,180,240,.18)', k + 50, 4, (hsh(k + 42) - 0.5) * 0.08);
      }
    } else if (place === 1) {
      for (let k = 0; k < 5; k++) {
        const x0 = (k / 5) * mw + hsh(k + 20) * 30, bw = w * (0.26 + hsh(k + 21) * 0.12), y = mh - w * (0.0 + hsh(k + 22) * 0.04);
        g.fillStyle = P.mid;
        g.fillRect(x0 + bw * 0.1, y - w * 0.06, bw * 0.8, w * 0.1);
        roofLine(g, x0, x0 + bw, y - w * 0.055, w * 0.06, P.mid, w * 0.03);
        g.fillStyle = 'rgba(255,190,110,.55)';
        g.fillRect(x0 + bw * 0.3, y - w * 0.035, w * 0.018, w * 0.02);
        g.fillRect(x0 + bw * 0.6, y - w * 0.035, w * 0.018, w * 0.02);
      }
    } else {
      for (let k = 0; k < 5; k++) {
        const x0 = (k / 5) * mw + hsh(k + 60) * 40, y = mh;
        g.fillStyle = P.mid;
        g.fillRect(x0 - w * 0.008, y - w * 0.18, w * 0.016, w * 0.18);
        for (let j = 0; j < 4; j++) {
          ell(g, x0 + (j % 2 ? 1 : -1) * w * 0.04, y - w * (0.12 + j * 0.035), w * (0.08 - j * 0.012), w * 0.022);
          g.fill();
        }
      }
      g.fillStyle = P.mid;
      g.fillRect(0, mh - w * 0.045, mw, w * 0.05);
      g.fillStyle = 'rgba(255,255,255,.08)';
      g.fillRect(0, mh - w * 0.047, mw, 2);
    }
    g.fillStyle = lin(g, 0, mh - w * 0.1, 0, mh, [0, `rgba(${P.mist},0)`], [1, `rgba(${P.mist},.35)`]);
    g.fillRect(0, mh - w * 0.1, mw, w * 0.1);
  });
  const ground = layer(w, gb - hz, sc, (g) => {
    const gh = gb - hz;
    g.fillStyle = lin(g, 0, 0, 0, gh, [0, P.g[0]], [0.45, P.g[1]], [1, P.g[2]]);
    g.fillRect(0, 0, w, gh);
    if (place === 0) {
      for (let k = 0; k < 26; k++) {
        const y = hsh(k + 3) * gh, x = hsh(k + 9) * w, d = 0.5 + y / gh;
        g.fillStyle = k % 3 ? 'rgba(110,150,95,.20)' : 'rgba(150,170,110,.14)';
        ell(g, x, y, w * 0.07 * d, w * 0.018 * d);
        g.fill();
      }
      for (let k = 0; k < 40; k++) {
        const y = hsh(k + 70) * gh, x = hsh(k + 71) * w, d = 0.5 + y / gh, a = hsh(k + 72) * TAU;
        g.fillStyle = k % 4 ? 'rgba(150,170,90,.35)' : 'rgba(200,180,110,.35)';
        g.save();
        g.translate(x, y);
        g.rotate(a);
        ell(g, 0, 0, w * 0.014 * d, w * 0.003 * d);
        g.fill();
        g.restore();
      }
      for (let k = 0; k < 9; k++) {
        const y = hsh(k + 30) * gh, x = hsh(k + 31) * w, d = 0.6 + y / gh;
        g.fillStyle = 'rgba(0,0,0,.25)';
        ell(g, x + 2, y + 2, w * 0.016 * d, w * 0.007 * d);
        g.fill();
        g.fillStyle = lin(g, x, y - w * 0.01, x, y + w * 0.01, [0, '#8e95a6'], [1, '#4c5262']);
        ell(g, x, y, w * 0.015 * d, w * 0.008 * d);
        g.fill();
      }
    } else if (place === 1) {
      // 기와 줄: 먼 쪽은 촘촘, 가까운 쪽은 넓게
      let y = 0, row = 0;
      while (y < gh) {
        const d = 0.45 + y / gh, rh = w * 0.045 * d;
        g.fillStyle = row % 2 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.03)';
        g.fillRect(0, y, w, rh);
        const tw = w * 0.05 * d;
        for (let x = (row % 2) * tw * 0.5 - tw; x < w + tw; x += tw) {
          g.fillStyle = lin(g, x, 0, x + tw, 0, [0, 'rgba(255,245,225,.16)'], [0.45, 'rgba(255,255,255,.03)'], [1, 'rgba(0,0,0,.25)']);
          rr(g, x + tw * 0.08, y + rh * 0.05, tw * 0.84, rh * 0.95, tw * 0.4);
          g.fill();
        }
        g.fillStyle = 'rgba(0,0,0,.35)';
        g.fillRect(0, y + rh - 1.5, w, 1.5);
        y += rh;
        row++;
      }
      g.fillStyle = 'rgba(20,22,40,.9)';
      g.fillRect(0, 0, w, w * 0.02);
      g.fillStyle = 'rgba(160,170,220,.25)';
      g.fillRect(0, w * 0.02, w, 1.5);
    } else {
      // 갈퀴로 고른 모래 무늬
      g.strokeStyle = 'rgba(255,255,255,.10)';
      for (let k = 0; k < 34; k++) {
        const y0 = (k / 34) * gh, d = 0.5 + y0 / gh;
        g.lineWidth = 1.2 * d;
        g.beginPath();
        for (let x = 0; x <= w; x += w / 30) g.lineTo(x, y0 + Math.sin(x / w * 6 + k * 0.4) * w * 0.006 * d);
        g.stroke();
      }
      g.strokeStyle = 'rgba(0,0,0,.08)';
      for (let k = 0; k < 34; k++) {
        const y0 = (k / 34) * gh + 2, d = 0.5 + y0 / gh;
        g.lineWidth = 1 * d;
        g.beginPath();
        for (let x = 0; x <= w; x += w / 30) g.lineTo(x, y0 + Math.sin(x / w * 6 + k * 0.4) * w * 0.006 * d);
        g.stroke();
      }
      for (const [x, y, r] of [[0.08, 0.15, 0.03], [0.93, 0.5, 0.035], [0.1, 0.78, 0.028]]) {
        const cx = x * w, cy = y * gh, cr = r * w;
        g.strokeStyle = 'rgba(255,255,255,.12)';
        for (let j = 1; j < 4; j++) {
          g.lineWidth = 1.2;
          ell(g, cx, cy, cr * (1 + j * 0.5), cr * (0.45 + j * 0.22));
          g.stroke();
        }
        g.fillStyle = 'rgba(0,0,0,.3)';
        ell(g, cx + 3, cy + 3, cr, cr * 0.5);
        g.fill();
        g.fillStyle = lin(g, cx, cy - cr, cx, cy + cr, [0, '#9a9aa8'], [1, '#55556a']);
        ell(g, cx, cy - cr * 0.15, cr, cr * 0.55);
        g.fill();
        g.fillStyle = 'rgba(90,140,90,.6)';
        ell(g, cx - cr * 0.2, cy - cr * 0.45, cr * 0.5, cr * 0.18);
        g.fill();
      }
    }
    // 달빛에 드리운 대나무 그림자 (비스듬한 띠)
    if (place === 0)
      for (let k = 0; k < 7; k++) {
        const x0 = w * (-0.2 + k * 0.2 + hsh(k + 900) * 0.08), bw = w * (0.012 + hsh(k + 901) * 0.02);
        g.fillStyle = 'rgba(6,12,30,.16)';
        g.beginPath();
        g.moveTo(x0, 0);
        g.lineTo(x0 + bw, 0);
        g.lineTo(x0 + bw - w * 0.35, gh);
        g.lineTo(x0 - w * 0.35 - bw * 0.5, gh);
        g.closePath();
        g.fill();
      }
    // 풀포기 (가까울수록 크게)
    if (place === 0)
      for (let k = 0; k < 140; k++) {
        const y = hsh(k + 300) * gh, x = hsh(k + 301) * w, d = 0.45 + y / gh, hgt = w * 0.016 * d;
        g.strokeStyle = k % 5 ? 'rgba(30,60,40,.55)' : 'rgba(20,40,30,.6)';
        g.lineWidth = 1.2 * d;
        for (let j = -1; j <= 1; j++) {
          g.beginPath();
          g.moveTo(x + j * hgt * 0.15, y);
          g.quadraticCurveTo(x + j * hgt * 0.3, y - hgt * 0.6, x + j * hgt * 0.55, y - hgt * (1 - Math.abs(j) * 0.25));
          g.stroke();
        }
        g.strokeStyle = 'rgba(170,220,150,.35)';
        g.lineWidth = 0.8 * d;
        g.beginPath();
        g.moveTo(x, y - hgt * 0.5);
        g.lineTo(x, y - hgt * 0.95);
        g.stroke();
      }
    // 달빛 웅덩이 · 가장자리 그늘 · 먼 쪽 안개
    g.fillStyle = radg(g, w * 0.6, gh * 0.25, 0, w * 0.75, [0, 'rgba(255,240,210,.16)'], [0.6, 'rgba(255,240,210,.05)'], [1, 'rgba(255,240,210,0)']);
    g.fillRect(0, 0, w, gh);
    g.fillStyle = lin(g, 0, 0, w, 0, [0, 'rgba(4,8,20,.45)'], [0.18, 'rgba(4,8,20,0)'], [0.82, 'rgba(4,8,20,0)'], [1, 'rgba(4,8,20,.45)']);
    g.fillRect(0, 0, w, gh);
    g.fillStyle = lin(g, 0, gh * 0.7, 0, gh, [0, 'rgba(4,8,20,0)'], [1, 'rgba(4,8,20,.35)']);
    g.fillRect(0, gh * 0.7, w, gh * 0.3);
    g.fillStyle = lin(g, 0, 0, 0, w * 0.1, [0, `rgba(${P.mist},.35)`], [1, `rgba(${P.mist},0)`]);
    g.fillRect(0, 0, w, w * 0.1);
  });
  const paper = layer(w, h, sc, (g) => {
    for (let k = 0; k < 900; k++) {
      g.fillStyle = k % 2 ? 'rgba(255,245,220,.05)' : 'rgba(0,0,0,.05)';
      g.fillRect(hsh(k * 1.7) * w, hsh(k * 2.3 + 5) * h, 1 + (k % 3), 1);
    }
    g.strokeStyle = 'rgba(255,240,210,.035)';
    g.lineWidth = 0.8;
    for (let k = 0; k < 120; k++) {
      const x = hsh(k + 500) * w, y = hsh(k + 600) * h, a = hsh(k + 700) * TAU, l = 4 + hsh(k + 800) * 10;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 2, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
  });
  const out = { sky, far, mid, ground, paper };
  if (BG.size > 12) BG.clear();
  BG.set(key, out);
  return out;
}

// ── 캐릭터 ──
/** 여우 닌자. pose 0 서기 · 1 겨눔(느린 시간) · 2 벤 직후 · 3 아얏 · 4 만세 · 5 어질어질 */
function drawFox(ctx: C2, x: number, y: number, k: number, face: number, pose: number, t: number, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(4,6,18,.42)';
  ell(ctx, 0, 0, k * 0.3, k * 0.075);
  ctx.fill();
  ctx.scale(face, 1);
  const br = Math.sin(t * 0.07) * 0.012 * k;
  const lean = [0, 0.16, 0.24, -0.22, 0, Math.sin(t * 0.09) * 0.2][pose] ?? 0;
  const lo = ([0, 0.07, 0.05, 0, -0.02, 0][pose] ?? 0) * k;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.rotate(lean * 0.5);
  // 꼬리
  ctx.save();
  ctx.translate(-k * 0.13, -k * 0.3 + lo);
  ctx.rotate(-0.55 + Math.sin(t * 0.06) * 0.2 + (pose === 3 ? -0.6 : 0) + (pose === 2 ? 0.35 : 0));
  const puff = pose === 3 || pose === 5 ? 1.25 : 1;
  ctx.fillStyle = lin(ctx, 0, -k * 0.1, -k * 0.45, k * 0.1, [0, '#ffa250'], [1, '#c5561d']);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = k * 0.03;
  ell(ctx, -k * 0.24, 0, k * 0.25 * puff, k * 0.105 * puff);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff4e6';
  ell(ctx, -k * 0.42 * puff, 0, k * 0.075 * puff, k * 0.07 * puff);
  ctx.fill();
  if (puff > 1) {
    ctx.strokeStyle = '#c5561d';
    ctx.lineWidth = k * 0.02;
    for (let j = 0; j < 5; j++) {
      const a = j * 1.25;
      ctx.beginPath();
      ctx.moveTo(-k * 0.24 + Math.cos(a) * k * 0.24, Math.sin(a) * k * 0.1);
      ctx.lineTo(-k * 0.24 + Math.cos(a) * k * 0.34, Math.sin(a) * k * 0.16);
      ctx.stroke();
    }
  }
  ctx.restore();
  // 다리 · 버선
  const sp = pose === 1 || pose === 2 ? 0.05 * k : 0;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = k * 0.032;
  ctx.fillStyle = '#1a2042';
  rr(ctx, -k * 0.13 - sp, -k * 0.25 + lo, k * 0.1, k * 0.25 - lo, k * 0.04);
  ctx.fill();
  ctx.stroke();
  rr(ctx, k * 0.03 + sp, -k * 0.25 + lo, k * 0.1, k * 0.25 - lo, k * 0.04);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#39427a';
  ell(ctx, -k * 0.07 - sp, -k * 0.015, k * 0.075, k * 0.033);
  ctx.fill();
  ctx.stroke();
  ell(ctx, k * 0.1 + sp, -k * 0.015, k * 0.075, k * 0.033);
  ctx.fill();
  ctx.stroke();
  // 허리띠 꼬리 (뒤)
  ribbon(ctx, -k * 0.16, -k * 0.28 + lo, k * (pose === 2 ? 0.34 : 0.22), k * 0.045, t, 1.3, '#c8303c');
  // 몸통
  const top = -k * 0.57 + lo + br;
  ctx.fillStyle = lin(ctx, -k * 0.16, top, k * 0.16, -k * 0.2, [0, '#45549a'], [1, '#1c2352']);
  rr(ctx, -k * 0.17, top, k * 0.34, -k * 0.2 + lo - top, k * 0.12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2a3470';
  ctx.beginPath();
  ctx.moveTo(-k * 0.02, top + k * 0.02);
  ctx.lineTo(k * 0.06, top + k * 0.15);
  ctx.lineTo(k * 0.14, top + k * 0.03);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c8303c';
  rr(ctx, -k * 0.176, -k * 0.33 + lo, k * 0.352, k * 0.065, k * 0.03);
  ctx.fill();
  ctx.lineWidth = k * 0.016;
  ctx.stroke();
  // 칼집 (허리 뒤로)
  ctx.strokeStyle = '#0a0b14';
  ctx.lineWidth = k * 0.055;
  ctx.beginPath();
  ctx.moveTo(-k * 0.34, -k * 0.2 + lo);
  ctx.lineTo(k * 0.1, -k * 0.34 + lo);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(160,180,255,.35)';
  ctx.lineWidth = k * 0.012;
  ctx.beginPath();
  ctx.moveTo(-k * 0.32, -k * 0.215 + lo);
  ctx.lineTo(k * 0.08, -k * 0.352 + lo);
  ctx.stroke();
  // 팔 · 칼
  const sh = { x: k * 0.07, y: top + k * 0.08 };
  let hand = { x: k * 0.21, y: -k * 0.37 + lo };
  if (pose === 1) hand = { x: k * 0.25, y: -k * 0.39 + lo };
  if (pose === 2) hand = { x: -k * 0.02, y: -k * 0.4 + lo };
  if (pose === 3) hand = { x: k * 0.1, y: -k * 0.85 };
  if (pose === 4) hand = { x: k * 0.14, y: -k * 0.98 };
  if (pose === 5) hand = { x: k * 0.2, y: -k * 0.3 };
  if (pose !== 2) {
    // 칼자루 (앞 허리)
    const hx0 = k * 0.1, hy0 = -k * 0.34 + lo, hx1 = pose === 4 ? hand.x : k * 0.3, hy1 = pose === 4 ? hand.y - k * 0.1 : -k * 0.42 + lo;
    ctx.strokeStyle = '#1a1220';
    ctx.lineWidth = k * 0.05;
    ctx.beginPath();
    ctx.moveTo(pose === 4 ? hand.x : hx0, pose === 4 ? hand.y + k * 0.25 : hy0);
    ctx.lineTo(hx1, hy1);
    ctx.stroke();
    ctx.fillStyle = '#d9a83a';
    ell(ctx, pose === 4 ? hand.x : hx0 + k * 0.02, pose === 4 ? hand.y + k * 0.05 : hy0 - k * 0.005, k * 0.022, k * 0.04, pose === 4 ? 1.57 : -0.4);
    ctx.fill();
  } else {
    // 벤 직후: 칼날을 뒤로 낮게 — 칼빛
    ctx.save();
    ctx.shadowColor = '#bff4ff';
    ctx.shadowBlur = k * 0.25;
    ctx.strokeStyle = lin(ctx, hand.x, hand.y, -k * 0.75, -k * 0.16 + lo, [0, '#ffffff'], [1, '#9fb6d8']);
    ctx.lineWidth = k * 0.045;
    ctx.beginPath();
    ctx.moveTo(hand.x, hand.y);
    ctx.lineTo(-k * 0.78, -k * 0.16 + lo);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#1a1220';
    ctx.lineWidth = k * 0.05;
    ctx.beginPath();
    ctx.moveTo(hand.x + k * 0.1, hand.y - k * 0.02);
    ctx.lineTo(hand.x, hand.y);
    ctx.stroke();
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = k * 0.11;
  ctx.beginPath();
  ctx.moveTo(sh.x, sh.y);
  ctx.lineTo(hand.x, hand.y);
  ctx.stroke();
  ctx.strokeStyle = '#2b3570';
  ctx.lineWidth = k * 0.075;
  ctx.stroke();
  ctx.fillStyle = '#39427a';
  ctx.beginPath();
  ctx.arc(hand.x, hand.y, k * 0.04, 0, TAU);
  ctx.fill();
  ctx.lineWidth = k * 0.016;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  // 목도리
  ribbon(ctx, -k * 0.1, top + k * 0.02, k * (pose === 2 ? 0.55 : pose === 1 ? 0.42 : 0.32), k * 0.055, t, 0, '#e2404a', pose === 2 ? 0.05 : 0.2);
  ctx.fillStyle = '#e2404a';
  rr(ctx, -k * 0.13, top - k * 0.03, k * 0.27, k * 0.075, k * 0.035);
  ctx.fill();
  ctx.lineWidth = k * 0.016;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  // 머리 (조금 크게: 귀여운 비율)
  ctx.save();
  ctx.translate(k * 0.03, top);
  ctx.scale(1.2, 1.2);
  ctx.translate(-k * 0.03, -top);
  const hx = k * 0.03, hy = top - k * 0.17, hr = k * 0.2;
  for (const [ex, ey, rot] of [[hx - k * 0.1, hy - hr * 0.7, -0.35], [hx + k * 0.08, hy - hr * 0.78, 0.18]]) {
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(rot + (pose === 3 ? -0.3 : 0));
    ctx.fillStyle = '#f08a3c';
    ctx.beginPath();
    ctx.moveTo(-k * 0.065, k * 0.02);
    ctx.lineTo(0, -k * 0.17);
    ctx.lineTo(k * 0.065, k * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = k * 0.03;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ctx.fillStyle = '#ffd3ae';
    ctx.beginPath();
    ctx.moveTo(-k * 0.03, 0);
    ctx.lineTo(0, -k * 0.1);
    ctx.lineTo(k * 0.03, 0);
    ctx.fill();
    ctx.fillStyle = '#3a1a0c';
    ctx.beginPath();
    ctx.moveTo(-k * 0.022, -k * 0.11);
    ctx.lineTo(0, -k * 0.17);
    ctx.lineTo(k * 0.022, -k * 0.11);
    ctx.fill();
    ctx.restore();
  }
  ribbon(ctx, hx - hr * 0.85, hy - k * 0.03, k * (pose === 2 ? 0.38 : 0.24), k * 0.035, t, 2.2, '#e2404a', 0.15);
  ctx.fillStyle = lin(ctx, hx - hr, hy - hr, hx + hr, hy + hr, [0, '#4a5aa6'], [1, '#1b2250']);
  ell(ctx, hx, hy, hr, hr * 0.96);
  ctx.fill();
  ctx.lineWidth = k * 0.034;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.fillStyle = '#f39a4b';
  ell(ctx, hx + k * 0.075, hy + k * 0.025, k * 0.135, k * 0.105);
  ctx.fill();
  ctx.fillStyle = '#fff1df';
  ell(ctx, hx + k * 0.15, hy + k * 0.065, k * 0.08, k * 0.05);
  ctx.fill();
  ctx.fillStyle = '#1a1016';
  ell(ctx, hx + k * 0.222, hy + k * 0.048, k * 0.024, k * 0.017);
  ctx.fill();
  const eyes = [[hx + k * 0.035, hy - k * 0.0], [hx + k * 0.13, hy - k * 0.008]];
  for (const [ex, ey] of eyes) {
    if (pose === 1) {
      ctx.save();
      ctx.shadowColor = '#7ff0ff';
      ctx.shadowBlur = k * 0.18;
      ctx.strokeStyle = '#d6fdff';
      ctx.lineWidth = k * 0.028;
      ctx.beginPath();
      ctx.moveTo(ex - k * 0.032, ey + k * 0.008);
      ctx.lineTo(ex + k * 0.03, ey - k * 0.01);
      ctx.stroke();
      ctx.restore();
    } else if (pose === 3) {
      ctx.strokeStyle = '#1a1016';
      ctx.lineWidth = k * 0.02;
      ctx.beginPath();
      ctx.moveTo(ex - k * 0.025, ey - k * 0.025);
      ctx.lineTo(ex + k * 0.02, ey);
      ctx.lineTo(ex - k * 0.025, ey + k * 0.025);
      ctx.stroke();
    } else if (pose === 4 || (pose === 2 && ex < hx + k * 0.1)) {
      ctx.strokeStyle = '#1a1016';
      ctx.lineWidth = k * 0.03;
      ctx.beginPath();
      ctx.arc(ex, ey + k * 0.012, k * 0.025, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (pose === 5) {
      ctx.strokeStyle = '#1a1016';
      ctx.lineWidth = k * 0.014;
      ctx.beginPath();
      for (let a = 0; a < 9; a += 0.4) ctx.lineTo(ex + Math.cos(a + t * 0.2) * a * k * 0.004, ey + Math.sin(a + t * 0.2) * a * k * 0.004);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ell(ctx, ex, ey, k * 0.03, k * 0.037);
      ctx.fill();
      ctx.fillStyle = '#1a1016';
      ell(ctx, ex + k * 0.008, ey + k * 0.004, k * 0.019, k * 0.026);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + k * 0.013, ey - k * 0.01, k * 0.007, 0, TAU);
      ctx.fill();
    }
  }
  ctx.strokeStyle = 'rgba(170,200,255,.6)';
  ctx.lineWidth = k * 0.025;
  ctx.beginPath();
  ctx.arc(hx, hy, hr * 0.84, -2.7, -1.5);
  ctx.stroke();
  ctx.restore();
  if (pose === 5) {
    for (let j = 0; j < 3; j++) {
      const a = t * 0.12 + (j * TAU) / 3;
      ctx.fillStyle = '#ffe066';
      starPath(ctx, hx + Math.cos(a) * k * 0.24, hy - k * 0.2 + Math.sin(a) * k * 0.06, k * 0.045);
      ctx.fill();
    }
  }
  ctx.restore();
}

interface Pose { k: K; st: number; tm: number; fa: number; seed: number; hurt: number; whiff: number; hp: number; moving: boolean; cut: boolean }
function eyePair(ctx: C2, pts: number[][], r: number, mood: number, iris = '#ffffff', pupil = '#14101a') {
  for (const [ex, ey] of pts) {
    if (mood === 2) {
      ctx.strokeStyle = pupil;
      ctx.lineWidth = r * 0.6;
      ctx.beginPath();
      ctx.moveTo(ex - r, ey - r);
      ctx.lineTo(ex + r, ey + r);
      ctx.moveTo(ex + r, ey - r);
      ctx.lineTo(ex - r, ey + r);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = iris;
    ctx.beginPath();
    ctx.arc(ex, ey, r * (mood === 3 ? 1.3 : 1), 0, TAU);
    ctx.fill();
    ctx.fillStyle = pupil;
    ctx.beginPath();
    ctx.arc(ex + r * 0.25, ey + r * 0.1, r * (mood === 3 ? 0.35 : 0.55), 0, TAU);
    ctx.fill();
  }
}
function brows(ctx: C2, pts: number[][], r: number, angry: boolean) {
  ctx.strokeStyle = '#140d10';
  ctx.lineWidth = r * 0.55;
  for (const [ex, ey] of pts) {
    const inner = ex > pts[0][0] ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(ex - r * 1.1 * inner, ey - r * (angry ? 2.1 : 1.6));
    ctx.lineTo(ex + r * 1.0 * inner, ey - r * (angry ? 1.3 : 1.7));
    ctx.stroke();
  }
}
function blade(ctx: C2, x0: number, y0: number, x1: number, y1: number, wd: number, glow: string | null) {
  ctx.save();
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = wd * 4;
  }
  ctx.strokeStyle = lin(ctx, x0, y0, x1, y1, [0, '#c9d4e6'], [1, '#ffffff']);
  ctx.lineWidth = wd;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

/** 적 하나 (발 자리 원점, 오른쪽 보기). k = 키 */
function drawFoeBody(ctx: C2, k: number, p: Pose, t: number) {
  const O = OUT;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const bob = p.moving ? -Math.abs(Math.sin(t * 0.22 + p.seed)) * k * 0.035 : Math.sin(t * 0.06 + p.seed) * k * 0.01;
  const wind = p.st === WIND || p.st === AIM, scared = p.cut || p.hurt > 0;
  const mood = p.cut ? 3 : 0;
  // M2 S6 🔔 종 그림·미리 보기는 보류하며 번들에서 뺐다(gzip 40KB 문턱 · 🧪) — 되살리면 git 기록 참고
  if (p.k === 'leaf') { // ✏️ M2 S1 🍃 잎 너구리(임시 그림 — 🎨 M3): 둥근 몸 · 눈가 얼룩 · 머리에 큰 잎
    ctx.save();
    ctx.translate(0, bob);
    ctx.fillStyle = lin(ctx, 0, -k * 0.5, 0, 0, [0, '#9a6a3e'], [1, '#5e3d22']);
    ell(ctx, 0, -k * 0.24, k * 0.17, k * 0.22);
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.lineWidth = k * 0.03;
    ctx.stroke();
    const hy = -k * 0.55;
    ctx.fillStyle = '#a7744a';
    for (const ex of [-k * 0.1, k * 0.1]) (ell(ctx, ex, hy - k * 0.11, k * 0.05, k * 0.05), ctx.fill(), ctx.stroke());
    ell(ctx, 0, hy, k * 0.15, k * 0.13);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3b2616';
    ell(ctx, 0, hy + k * 0.01, k * 0.11, k * 0.05);
    ctx.fill();
    const ep = [[-k * 0.045, hy], [k * 0.045, hy]];
    eyePair(ctx, ep, k * 0.022, mood, '#fff6dc');
    ctx.save(); // 머리 위 잎(살랑)
    ctx.translate(0, hy - k * 0.16);
    ctx.rotate(Math.sin(t * 0.08 + p.seed) * 0.25 - 0.3);
    ctx.fillStyle = '#5fbf4a';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(k * 0.16, -k * 0.08, k * 0.02, -k * 0.3);
    ctx.quadraticCurveTo(-k * 0.14, -k * 0.1, 0, 0);
    ctx.fill();
    ctx.strokeStyle = '#2d6a24';
    ctx.lineWidth = k * 0.018;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(k * 0.015, -k * 0.27);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    return;
  }
  if (p.k === 'dummy') {
    ctx.save();
    ctx.rotate(Math.sin(t * 0.035 + p.seed) * 0.05);
    ctx.fillStyle = lin(ctx, -k * 0.03, 0, k * 0.03, 0, [0, '#5e3f24'], [1, '#93673d']);
    ctx.strokeStyle = O;
    ctx.lineWidth = k * 0.03;
    rr(ctx, -k * 0.028, -k * 0.62, k * 0.056, k * 0.62, k * 0.02);
    ctx.fill();
    ctx.stroke();
    // 짚 다리
    ctx.strokeStyle = '#e3c06a';
    ctx.lineWidth = k * 0.014;
    for (let j = 0; j < 7; j++) {
      ctx.beginPath();
      ctx.moveTo(-k * 0.1 + j * k * 0.033, -k * 0.24);
      ctx.lineTo(-k * 0.13 + j * k * 0.045, -k * 0.12 + (j % 2) * k * 0.02);
      ctx.stroke();
    }
    // 옷
    ctx.fillStyle = lin(ctx, 0, -k * 0.52, 0, -k * 0.22, [0, '#5a6ca4'], [1, '#33406e']);
    ctx.beginPath();
    ctx.moveTo(-k * 0.2, -k * 0.53);
    ctx.lineTo(k * 0.2, -k * 0.53);
    ctx.lineTo(k * 0.15, -k * 0.22);
    ctx.lineTo(-k * 0.15, -k * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.lineWidth = k * 0.03;
    ctx.stroke();
    ctx.fillStyle = '#b8733c';
    rr(ctx, k * 0.03, -k * 0.44, k * 0.08, k * 0.08, k * 0.01);
    ctx.fill();
    ctx.strokeStyle = '#f4e2b8';
    ctx.lineWidth = k * 0.008;
    ctx.setLineDash([k * 0.015, k * 0.012]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#d8b25a';
    ctx.lineWidth = k * 0.025;
    ctx.beginPath();
    ctx.moveTo(-k * 0.16, -k * 0.27);
    ctx.lineTo(k * 0.16, -k * 0.27);
    ctx.stroke();
    // 팔 막대 + 짚
    ctx.fillStyle = '#6e4a2c';
    rr(ctx, -k * 0.32, -k * 0.53, k * 0.64, k * 0.045, k * 0.02);
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.lineWidth = k * 0.018;
    ctx.stroke();
    ctx.strokeStyle = '#efcd75';
    ctx.lineWidth = k * 0.014;
    for (const sx of [-1, 1])
      for (let j = 0; j < 5; j++) {
        ctx.beginPath();
        ctx.moveTo(sx * k * 0.3, -k * 0.51);
        ctx.lineTo(sx * k * (0.38 + (j % 2) * 0.03), -k * 0.56 + j * k * 0.025);
        ctx.stroke();
      }
    // 자루 얼굴
    ctx.fillStyle = lin(ctx, -k * 0.12, -k * 0.78, k * 0.12, -k * 0.55, [0, '#ead2a2'], [1, '#bf9b66']);
    ell(ctx, 0, -k * 0.665, k * 0.13, k * 0.12);
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.lineWidth = k * 0.03;
    ctx.stroke();
    ctx.fillStyle = 'rgba(120,80,40,.25)';
    for (let j = 0; j < 8; j++) ctx.fillRect(-k * 0.09 + hsh(p.seed + j) * k * 0.18, -k * 0.75 + hsh(p.seed + j + 9) * k * 0.15, k * 0.012, k * 0.012);
    ctx.strokeStyle = '#3a2614';
    ctx.lineWidth = k * 0.016;
    for (const ex of [-k * 0.045, k * 0.05]) {
      if (p.cut) {
        ctx.beginPath();
        ctx.arc(ex, -k * 0.68, k * 0.022, 0, TAU);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(ex - k * 0.02, -k * 0.7);
        ctx.lineTo(ex + k * 0.02, -k * 0.66);
        ctx.moveTo(ex + k * 0.02, -k * 0.7);
        ctx.lineTo(ex - k * 0.02, -k * 0.66);
        ctx.stroke();
      }
    }
    ctx.beginPath();
    if (p.cut) ctx.arc(0, -k * 0.6, k * 0.025, 0, TAU);
    else ctx.arc(0, -k * 0.64, k * 0.05, 0.35, Math.PI - 0.35);
    ctx.stroke();
    // 삿갓
    ctx.fillStyle = lin(ctx, -k * 0.2, -k * 0.86, k * 0.2, -k * 0.74, [0, '#f0cc72'], [1, '#a9832f']);
    ctx.beginPath();
    ctx.moveTo(-k * 0.23, -k * 0.74);
    ctx.quadraticCurveTo(0, -k * 0.79, k * 0.23, -k * 0.74);
    ctx.lineTo(0, -k * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.lineWidth = k * 0.02;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(110,80,30,.6)';
    ctx.lineWidth = k * 0.008;
    for (let j = -2; j <= 2; j++) {
      ctx.beginPath();
      ctx.moveTo(0, -k * 0.89);
      ctx.lineTo(j * k * 0.09, -k * 0.755);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  if (p.k === 'sword') {
    ctx.translate(0, bob);
    const lean = wind ? -0.18 : p.whiff > 0 ? 0.25 : 0;
    ctx.rotate(lean);
    // 줄무늬 꼬리
    ctx.save();
    ctx.translate(-k * 0.15, -k * 0.2);
    ctx.rotate(-0.6 + Math.sin(t * 0.08 + p.seed) * 0.15);
    ctx.fillStyle = '#7a4c2c';
    ctx.strokeStyle = O;
    ctx.lineWidth = k * 0.03;
    ell(ctx, -k * 0.12, 0, k * 0.15, k * 0.075);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#3a2214';
    ctx.lineWidth = k * 0.028;
    for (const xx of [-0.1, -0.18]) {
      ctx.beginPath();
      ctx.moveTo(xx * k, -k * 0.06);
      ctx.lineTo(xx * k - k * 0.01, k * 0.06);
      ctx.stroke();
    }
    ctx.fillStyle = '#2e1a10';
    ell(ctx, -k * 0.25, 0, k * 0.035, k * 0.045);
    ctx.fill();
    ctx.restore();
    // 발
    const st = p.moving ? Math.sin(t * 0.22 + p.seed) * k * 0.03 : 0;
    ctx.fillStyle = '#3a2416';
    ell(ctx, -k * 0.07, -k * 0.03 - Math.max(0, st), k * 0.065, k * 0.04);
    ctx.fill();
    ell(ctx, k * 0.08, -k * 0.03 - Math.max(0, -st), k * 0.065, k * 0.04);
    ctx.fill();
    // 몸
    ctx.fillStyle = lin(ctx, 0, -k * 0.5, 0, -k * 0.05, [0, '#a46e45'], [1, '#6a4127']);
    ell(ctx, 0, -k * 0.27, k * 0.19, k * 0.21);
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.lineWidth = k * 0.032;
    ctx.stroke();
    ctx.fillStyle = '#e8cb9c';
    ell(ctx, k * 0.05, -k * 0.24, k * 0.11, k * 0.13);
    ctx.fill();
    ctx.fillStyle = '#3d4a6a';
    rr(ctx, -k * 0.19, -k * 0.33, k * 0.38, k * 0.05, k * 0.02);
    ctx.fill();
    // 머리
    const hy = -k * 0.56;
    ctx.save();
    ctx.translate(0, -k * 0.42);
    ctx.scale(1.18, 1.18);
    ctx.translate(0, k * 0.42);
    ctx.fillStyle = '#4a2c1a';
    ell(ctx, -k * 0.1, hy - k * 0.11, k * 0.045, k * 0.045);
    ctx.fill();
    ell(ctx, k * 0.12, hy - k * 0.115, k * 0.045, k * 0.045);
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, hy - k * 0.14, 0, hy + k * 0.14, [0, '#b07a4e'], [1, '#7e5232']);
    ell(ctx, k * 0.02, hy, k * 0.165, k * 0.145);
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.lineWidth = k * 0.032;
    ctx.stroke();
    ctx.fillStyle = '#3a2416';
    ell(ctx, k * 0.07, hy - k * 0.005, k * 0.12, k * 0.05);
    ctx.fill();
    ctx.fillStyle = '#f2dfc4';
    ell(ctx, k * 0.13, hy + k * 0.055, k * 0.06, k * 0.04);
    ctx.fill();
    ctx.fillStyle = '#140d10';
    ell(ctx, k * 0.185, hy + k * 0.035, k * 0.022, k * 0.016);
    ctx.fill();
    const ep = [[k * 0.035, hy - k * 0.01], [k * 0.11, hy - k * 0.012]];
    eyePair(ctx, ep, k * 0.026, mood);
    if (!scared) brows(ctx, ep, k * 0.024, true);
    // 진가사 (납작한 삿갓)
    ctx.fillStyle = lin(ctx, -k * 0.2, hy - k * 0.24, k * 0.24, hy - k * 0.1, [0, '#3b3b4c'], [1, '#17171f']);
    ctx.beginPath();
    ctx.moveTo(-k * 0.22, hy - k * 0.1);
    ctx.quadraticCurveTo(k * 0.02, hy - k * 0.15, k * 0.26, hy - k * 0.1);
    ctx.lineTo(k * 0.03, hy - k * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.lineWidth = k * 0.02;
    ctx.stroke();
    ctx.strokeStyle = '#c0403f';
    ctx.lineWidth = k * 0.016;
    ctx.beginPath();
    ctx.moveTo(-k * 0.2, hy - k * 0.105);
    ctx.quadraticCurveTo(k * 0.02, hy - k * 0.145, k * 0.24, hy - k * 0.105);
    ctx.stroke();
    ctx.restore();
    // 칼
    if (wind) {
      blade(ctx, k * 0.02, -k * 0.6, -k * 0.28, -k * 1.0, k * 0.035, '#ff6a5a');
      const gl = 0.5 + 0.5 * Math.sin(t * 0.5);
      ctx.fillStyle = `rgba(255,120,100,${0.5 + gl * 0.5})`;
      starPath(ctx, -k * 0.28, -k * 1.0, k * (0.05 + gl * 0.03));
      ctx.fill();
      ctx.fillStyle = '#7a4c2c';
      ell(ctx, k * 0.02, -k * 0.6, k * 0.045, k * 0.045);
      ctx.fill();
    } else if (p.whiff > 0) {
      blade(ctx, k * 0.2, -k * 0.24, k * 0.42, k * 0.03, k * 0.035, null);
      ctx.fillStyle = '#7a4c2c';
      ell(ctx, k * 0.2, -k * 0.24, k * 0.045, k * 0.045);
      ctx.fill();
      ctx.fillStyle = '#9fd8ff';
      ell(ctx, -k * 0.1, hy - k * 0.12, k * 0.025, k * 0.04);
      ctx.fill();
    } else {
      blade(ctx, k * 0.16, -k * 0.32, k * 0.42, -k * 0.14, k * 0.035, null);
      ctx.fillStyle = '#7a4c2c';
      ell(ctx, k * 0.16, -k * 0.32, k * 0.045, k * 0.045);
      ctx.fill();
    }
    return;
  }
  if (p.k === 'archer') {
    ctx.translate(0, bob);
    // 화살통
    ctx.fillStyle = '#6e4326';
    ctx.save();
    ctx.rotate(-0.3);
    rr(ctx, -k * 0.2, -k * 0.5, k * 0.08, k * 0.26, k * 0.02);
    ctx.fill();
    ctx.fillStyle = '#e8e2d2';
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      ctx.moveTo(-k * 0.19 + j * k * 0.025, -k * 0.5);
      ctx.lineTo(-k * 0.2 + j * k * 0.025, -k * 0.58);
      ctx.lineTo(-k * 0.17 + j * k * 0.025, -k * 0.5);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#2f6a2c';
    ell(ctx, -k * 0.1, -k * 0.05, k * 0.09, k * 0.05);
    ctx.fill();
    ell(ctx, k * 0.1, -k * 0.05, k * 0.09, k * 0.05);
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -k * 0.5, 0, 0, [0, '#79c75c'], [1, '#3a7832']);
    ell(ctx, 0, -k * 0.24, k * 0.17, k * 0.21);
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.lineWidth = k * 0.032;
    ctx.stroke();
    ctx.fillStyle = '#e4efb4';
    ell(ctx, k * 0.05, -k * 0.21, k * 0.1, k * 0.14);
    ctx.fill();
    const hy = -k * 0.5;
    ctx.fillStyle = lin(ctx, 0, hy - k * 0.1, 0, hy + k * 0.1, [0, '#86d266'], [1, '#4b8d3c']);
    ell(ctx, k * 0.02, hy, k * 0.18, k * 0.11);
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.stroke();
    ctx.strokeStyle = '#1b2a16';
    ctx.lineWidth = k * 0.018;
    ctx.beginPath();
    ctx.arc(k * 0.06, hy + k * 0.0, k * 0.12, 0.25, Math.PI - 0.6);
    ctx.stroke();
    const ep = [[-k * 0.06, hy - k * 0.1], [k * 0.1, hy - k * 0.11]];
    for (const [ex, ey] of ep) {
      ctx.fillStyle = '#86d266';
      ctx.beginPath();
      ctx.arc(ex, ey, k * 0.07, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = O;
      ctx.lineWidth = k * 0.02;
      ctx.stroke();
    }
    eyePair(ctx, ep, k * 0.048, mood, '#fff3c4');
    ctx.fillStyle = '#1b1b24';
    rr(ctx, -k * 0.16, hy - k * 0.05, k * 0.34, k * 0.035, k * 0.015);
    ctx.fill();
    ribbon(ctx, -k * 0.15, hy - k * 0.035, k * 0.14, k * 0.022, t, p.seed, '#1b1b24', 0.4);
    // 활
    const pull = p.st === AIM ? Math.min(1, (p.tm > LOCK ? 0.5 : 1)) : 0;
    ctx.strokeStyle = '#7a4a26';
    ctx.lineWidth = k * 0.035;
    ctx.beginPath();
    ctx.arc(k * 0.12, -k * 0.34, k * 0.26, -1.15, 1.15);
    ctx.stroke();
    const tx = k * 0.12 + Math.cos(1.15) * k * 0.26, ty0 = -k * 0.34 - Math.sin(1.15) * k * 0.26, ty1 = -k * 0.34 + Math.sin(1.15) * k * 0.26;
    const sx = tx - pull * k * 0.16;
    ctx.strokeStyle = '#efe6d0';
    ctx.lineWidth = k * 0.01;
    ctx.beginPath();
    ctx.moveTo(tx, ty0);
    ctx.lineTo(sx, -k * 0.34);
    ctx.lineTo(tx, ty1);
    ctx.stroke();
    if (pull) {
      ctx.strokeStyle = '#d8b07a';
      ctx.lineWidth = k * 0.016;
      ctx.beginPath();
      ctx.moveTo(sx, -k * 0.34);
      ctx.lineTo(k * 0.44, -k * 0.34);
      ctx.stroke();
      ctx.fillStyle = '#dfe6f2';
      ctx.beginPath();
      ctx.moveTo(k * 0.48, -k * 0.34);
      ctx.lineTo(k * 0.43, -k * 0.37);
      ctx.lineTo(k * 0.43, -k * 0.31);
      ctx.fill();
    }
    ctx.fillStyle = '#4b8d3c';
    ell(ctx, sx, -k * 0.34, k * 0.035, k * 0.035);
    ctx.fill();
    return;
  }
  if (p.k === 'shuri') {
    ctx.translate(0, bob);
    ctx.strokeStyle = '#e9a12f';
    ctx.lineWidth = k * 0.02;
    ctx.beginPath();
    ctx.moveTo(-k * 0.05, -k * 0.1);
    ctx.lineTo(-k * 0.07, 0);
    ctx.moveTo(k * 0.05, -k * 0.1);
    ctx.lineTo(k * 0.07, 0);
    ctx.stroke();
    ribbon(ctx, -k * 0.08, -k * 0.42, k * 0.26, k * 0.04, t, p.seed, '#6a5a9a', 0.3);
    ctx.fillStyle = lin(ctx, 0, -k * 0.5, 0, -k * 0.05, [0, '#3a3f58'], [1, '#14151e']);
    ell(ctx, 0, -k * 0.28, k * 0.16, k * 0.22);
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.lineWidth = k * 0.032;
    ctx.stroke();
    // 날개 팔
    ctx.fillStyle = '#20222f';
    ctx.save();
    ctx.translate(-k * 0.1, -k * 0.38);
    ctx.rotate(wind ? -1.6 : 0.5);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-k * 0.12, k * 0.12, -k * 0.04, k * 0.26);
    ctx.lineTo(k * 0.05, k * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (wind) {
      for (let j = -1; j <= 1; j++) {
        ctx.save();
        ctx.translate(-k * 0.04 + j * k * 0.05, k * 0.27 + Math.abs(j) * k * 0.02);
        ctx.rotate(t * 0.2 + j);
        shuriPath(ctx, k * 0.05);
        ctx.fillStyle = '#d7deea';
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
    const hy = -k * 0.56;
    ctx.fillStyle = lin(ctx, 0, hy - k * 0.13, 0, hy + k * 0.12, [0, '#41465f'], [1, '#181a24']);
    ell(ctx, k * 0.03, hy, k * 0.145, k * 0.135);
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.stroke();
    ctx.fillStyle = '#5c6283';
    rr(ctx, -k * 0.1, hy - k * 0.045, k * 0.27, k * 0.07, k * 0.02);
    ctx.fill();
    ctx.fillStyle = '#f2b134';
    ctx.beginPath();
    ctx.moveTo(k * 0.13, hy - k * 0.0);
    ctx.lineTo(k * 0.32, hy + k * 0.04);
    ctx.lineTo(k * 0.13, hy + k * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.lineWidth = k * 0.016;
    ctx.stroke();
    const ep = [[k * 0.03, hy - k * 0.012], [k * 0.1, hy - k * 0.014]];
    eyePair(ctx, ep, k * 0.024, mood, '#ffd84a');
    if (!scared) brows(ctx, ep, k * 0.022, true);
    return;
  }
  if (p.k === 'shield') {
    ctx.translate(0, bob);
    ctx.fillStyle = '#3a2a22';
    ell(ctx, -k * 0.09, -k * 0.03, k * 0.075, k * 0.045);
    ctx.fill();
    ell(ctx, k * 0.1, -k * 0.03, k * 0.075, k * 0.045);
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -k * 0.55, 0, -k * 0.05, [0, '#c4434a'], [1, '#7a1f26']);
    ell(ctx, 0, -k * 0.29, k * 0.23, k * 0.25);
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.lineWidth = k * 0.034;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(40,8,12,.55)';
    ctx.lineWidth = k * 0.014;
    for (let j = 0; j < 4; j++) {
      ctx.beginPath();
      ctx.arc(0, -k * 0.6 + j * k * 0.08, k * 0.36, 1.2, Math.PI - 1.2);
      ctx.stroke();
    }
    ctx.fillStyle = '#d9a83a';
    rr(ctx, -k * 0.2, -k * 0.2, k * 0.4, k * 0.035, k * 0.015);
    ctx.fill();
    const hy = -k * 0.6;
    ctx.fillStyle = lin(ctx, 0, hy - k * 0.15, 0, hy + k * 0.14, [0, '#8a7262'], [1, '#55443a']);
    ell(ctx, k * 0.05, hy, k * 0.17, k * 0.15);
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.stroke();
    ctx.fillStyle = '#e6b0a6';
    ell(ctx, k * 0.19, hy + k * 0.04, k * 0.07, k * 0.055);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5a2a2a';
    ell(ctx, k * 0.17, hy + k * 0.04, k * 0.012, k * 0.016);
    ctx.fill();
    ell(ctx, k * 0.215, hy + k * 0.04, k * 0.012, k * 0.016);
    ctx.fill();
    ctx.fillStyle = '#fffbe8';
    ctx.beginPath();
    ctx.moveTo(k * 0.13, hy + k * 0.08);
    ctx.lineTo(k * 0.14, hy + k * 0.0);
    ctx.lineTo(k * 0.16, hy + k * 0.08);
    ctx.fill();
    const ep = [[k * 0.04, hy - k * 0.03], [k * 0.11, hy - k * 0.035]];
    eyePair(ctx, ep, k * 0.022, mood);
    if (!scared) brows(ctx, ep, k * 0.02, true);
    // 투구
    ctx.fillStyle = lin(ctx, 0, hy - k * 0.25, 0, hy - k * 0.05, [0, '#5a6070'], [1, '#2a2e38']);
    ctx.beginPath();
    ctx.arc(k * 0.04, hy - k * 0.06, k * 0.16, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.lineWidth = k * 0.02;
    ctx.stroke();
    ctx.fillStyle = '#e8c04a';
    ctx.beginPath();
    ctx.moveTo(k * 0.04, hy - k * 0.2);
    ctx.lineTo(k * 0.0, hy - k * 0.32);
    ctx.lineTo(k * 0.04, hy - k * 0.27);
    ctx.lineTo(k * 0.08, hy - k * 0.32);
    ctx.closePath();
    ctx.fill();
    if (wind) {
      ctx.fillStyle = 'rgba(255,110,90,.8)';
      starPath(ctx, k * 0.3, -k * 0.75, k * 0.05);
      ctx.fill();
    }
    return;
  }
  // 대장 곰
  ctx.translate(0, bob);
  ctx.fillStyle = '#21160f';
  ell(ctx, -k * 0.1, -k * 0.03, k * 0.08, k * 0.045);
  ctx.fill();
  ell(ctx, k * 0.1, -k * 0.03, k * 0.08, k * 0.045);
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, -k * 0.6, 0, 0, [0, '#5e4230'], [1, '#2c1d14']);
  ell(ctx, 0, -k * 0.3, k * 0.26, k * 0.28);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = k * 0.032;
  ctx.stroke();
  ctx.fillStyle = lin(ctx, 0, -k * 0.5, 0, -k * 0.15, [0, '#a52a33'], [1, '#6a141c']);
  rr(ctx, -k * 0.17, -k * 0.5, k * 0.34, k * 0.32, k * 0.07);
  ctx.fill();
  ctx.strokeStyle = '#e8c04a';
  ctx.lineWidth = k * 0.014;
  ctx.stroke();
  for (let j = 1; j < 4; j++) {
    ctx.beginPath();
    ctx.moveTo(-k * 0.16, -k * 0.5 + j * k * 0.08);
    ctx.lineTo(k * 0.16, -k * 0.5 + j * k * 0.08);
    ctx.stroke();
  }
  const hy = -k * 0.66;
  ctx.fillStyle = '#4a3324';
  ell(ctx, -k * 0.12, hy - k * 0.14, k * 0.055, k * 0.055);
  ctx.fill();
  ell(ctx, k * 0.16, hy - k * 0.14, k * 0.055, k * 0.055);
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, hy - k * 0.18, 0, hy + k * 0.16, [0, '#6e4c36'], [1, '#3a2719']);
  ell(ctx, k * 0.03, hy, k * 0.2, k * 0.18);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.fillStyle = '#c9a07a';
  ell(ctx, k * 0.15, hy + k * 0.06, k * 0.085, k * 0.065);
  ctx.fill();
  ctx.fillStyle = '#140d10';
  ell(ctx, k * 0.2, hy + k * 0.03, k * 0.03, k * 0.022);
  ctx.fill();
  const ep = [[k * 0.02, hy - k * 0.02], [k * 0.11, hy - k * 0.025]];
  eyePair(ctx, ep, k * 0.026, mood, '#ffd84a');
  if (!scared) brows(ctx, ep, k * 0.026, true);
  ctx.strokeStyle = 'rgba(255,220,200,.5)';
  ctx.lineWidth = k * 0.01;
  ctx.beginPath();
  ctx.moveTo(-k * 0.06, hy - k * 0.08);
  ctx.lineTo(-k * 0.02, hy + k * 0.05);
  ctx.stroke();
  ctx.fillStyle = lin(ctx, 0, hy - k * 0.3, 0, hy - k * 0.08, [0, '#4a5060'], [1, '#1e2028']);
  ctx.beginPath();
  ctx.arc(k * 0.03, hy - k * 0.08, k * 0.19, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = k * 0.02;
  ctx.stroke();
  ctx.strokeStyle = '#f2c94c';
  ctx.lineWidth = k * 0.035;
  ctx.beginPath();
  ctx.arc(k * 0.03, hy - k * 0.32, k * 0.14, 0.3, Math.PI - 0.3, true);
  ctx.stroke();
  if (wind) blade(ctx, k * 0.05, -k * 0.62, -k * 0.35, -k * 1.15, k * 0.05, '#ff5a4e');
  else blade(ctx, k * 0.18, -k * 0.32, k * 0.55, -k * 0.62, k * 0.05, null);
  ctx.fillStyle = '#5e4230';
  ell(ctx, wind ? k * 0.05 : k * 0.18, wind ? -k * 0.62 : -k * 0.32, k * 0.06, k * 0.06);
  ctx.fill();
}
function shuriPath(ctx: C2, r: number) {
  ctx.beginPath();
  for (let j = 0; j < 8; j++) {
    const a = (j * Math.PI) / 4, q = j % 2 ? r * 0.32 : r;
    if (j) ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q);
    else ctx.moveTo(Math.cos(a) * q, Math.sin(a) * q);
  }
  ctx.closePath();
}
/** 방패 (3/4 시점: 방패가 향한 쪽에 따라 얇아지거나 넓어진다) */
function drawShieldDisc(ctx: C2, k: number, fa: number, flash: number) {
  const nx = Math.cos(fa), ny = Math.sin(fa), R = k * 0.22;
  const cx = nx * k * 0.2, cy = -k * 0.32 + ny * k * 0.06;
  const rx = R * Math.max(0.28, Math.abs(ny)), front = ny > -0.2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = front ? lin(ctx, -rx, -R, rx, R, [0, '#f0c763'], [0.5, '#c28a2c'], [1, '#7a5216']) : '#5a3a1e';
  ell(ctx, 0, 0, rx, R);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = k * 0.028;
  ctx.stroke();
  if (front) {
    ctx.strokeStyle = 'rgba(90,50,10,.7)';
    ctx.lineWidth = k * 0.016;
    ell(ctx, 0, 0, rx * 0.68, R * 0.68);
    ctx.stroke();
    ctx.fillStyle = '#ffe9a0';
    ell(ctx, 0, 0, rx * 0.22, R * 0.22);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ell(ctx, -rx * 0.35, -R * 0.4, rx * 0.25, R * 0.15, -0.5);
    ctx.fill();
  }
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,220,${flash})`;
    ell(ctx, 0, 0, rx, R);
    ctx.fill();
  }
  ctx.restore();
}
function drawBarrel(ctx: C2, x: number, y: number, k: number, fuse: number, t: number, pop: number) {
  ctx.save();
  const shake = fuse >= 0 ? Math.sin(t * 1.7) * k * 0.02 : 0;
  ctx.translate(x + shake, y);
  ctx.fillStyle = 'rgba(4,6,18,.4)';
  ell(ctx, 0, 0, k * 0.2, k * 0.06);
  ctx.fill();
  ctx.scale(pop, pop);
  ctx.fillStyle = lin(ctx, -k * 0.16, 0, k * 0.16, 0, [0, '#4e3119'], [0.45, '#a47040'], [1, '#4a2e17']);
  ctx.beginPath();
  ctx.moveTo(-k * 0.14, 0);
  ctx.quadraticCurveTo(-k * 0.19, -k * 0.21, -k * 0.14, -k * 0.42);
  ctx.lineTo(k * 0.14, -k * 0.42);
  ctx.quadraticCurveTo(k * 0.19, -k * 0.21, k * 0.14, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = k * 0.024;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(30,15,5,.45)';
  ctx.lineWidth = k * 0.01;
  for (const sx of [-0.08, -0.025, 0.03, 0.085]) {
    ctx.beginPath();
    ctx.moveTo(sx * k, -k * 0.01);
    ctx.quadraticCurveTo(sx * k * 1.2, -k * 0.21, sx * k, -k * 0.41);
    ctx.stroke();
  }
  for (const hy of [-0.07, -0.35]) {
    ctx.strokeStyle = '#26262e';
    ctx.lineWidth = k * 0.035;
    ctx.beginPath();
    ctx.moveTo(-k * 0.165, hy * k);
    ctx.quadraticCurveTo(0, hy * k + k * 0.035, k * 0.165, hy * k);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200,210,240,.35)';
    ctx.lineWidth = k * 0.008;
    ctx.stroke();
  }
  ctx.fillStyle = '#c0383e';
  ctx.beginPath();
  ctx.arc(0, -k * 0.21, k * 0.06, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1a0f10';
  ctx.beginPath();
  ctx.arc(0, -k * 0.2, k * 0.035, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#fff2c0';
  ctx.lineWidth = k * 0.01;
  ctx.beginPath();
  ctx.moveTo(k * 0.02, -k * 0.23);
  ctx.lineTo(k * 0.045, -k * 0.25);
  ctx.stroke();
  ctx.fillStyle = '#b4824e';
  ell(ctx, 0, -k * 0.42, k * 0.14, k * 0.04);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = k * 0.018;
  ctx.stroke();
  ctx.strokeStyle = '#d9c08a';
  ctx.lineWidth = k * 0.018;
  ctx.beginPath();
  ctx.moveTo(0, -k * 0.43);
  ctx.bezierCurveTo(k * 0.06, -k * 0.5, -k * 0.02, -k * 0.54, k * 0.05, -k * 0.6);
  ctx.stroke();
  if (fuse >= 0) {
    const fl = 0.6 + 0.4 * Math.sin(t * 0.9);
    ctx.fillStyle = radg(ctx, k * 0.05, -k * 0.6, 0, k * 0.16, [0, `rgba(255,240,150,${fl})`], [1, 'rgba(255,120,40,0)']);
    ctx.beginPath();
    ctx.arc(k * 0.05, -k * 0.6, k * 0.16, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff6c0';
    starPath(ctx, k * 0.05, -k * 0.6, k * 0.05 * (0.8 + fl * 0.5));
    ctx.fill();
    ctx.fillStyle = `rgba(255,60,40,${0.18 + 0.15 * fl})`;
    ell(ctx, 0, -k * 0.21, k * 0.2, k * 0.24);
    ctx.fill();
  }
  ctx.restore();
}
// ✏️ M2 S7 번들 덜기: drawMirror(거울 그림)는 뺐다 — 거울은 어느 판에도 없다(시뮬 반사 규칙은 남김). 다시 쓰면 git 기록에서 되살림
/** ✏️ S009 가시덤불: 먹빛 덤불 + 가시. hot = 지금 그리는 길이 걸림 */
/** S012 1-2 길잡이: 적 a를 지나 꺾어 적 b 너머까지 — 셋 넘게 베는 길 중 가장 많이 베는 것(그리기 전용, 시뮬과 무관) */
function guideOf(s: DashState, min = 4) {
  const F = s.foes.filter((f) => f.st !== ENTER);
  let best: { x: number; y: number }[] | null = null, bn = min - 1;
  for (const a of F)
    for (const b of F) {
      if (a === b) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, pts = [{ x: a.x, y: a.y }, { x: b.x + (dx / d) * 0.08, y: b.y + (dy / d) * 0.08 }];
      const n = tracePath(s, pts, reachFor(s, pts)).hits.length;
      if (n > bn) (bn = n), (best = pts);
    }
  return best;
}
/** ✏️ M2 S1 🍃 잎 길잡이(📐): 첫 '휙' 뒤 아직 잎을 못 베었으면, 잎 옆에서 꺾어 들어가는 길(가장 많이 베는 것) */
function leafGuideOf(s: DashState) {
  let best: { x: number; y: number }[] | null = null, bn = 0;
  for (const L of s.foes.filter((f) => leafy(s, f) && f.st !== ENTER)) {
    const dx = L.x - s.nx, dy = L.y - s.ny, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    for (const sg of [1, -1]) {
      const p1 = { x: clamp(L.x + nx * sg * 0.15, X0, X1), y: clamp(L.y + ny * sg * 0.15, Y0, Y1) };
      const ex = L.x - p1.x, ey = L.y - p1.y, e = Math.hypot(ex, ey) || 1, pts = [p1, { x: L.x + (ex / e) * 0.08, y: L.y + (ey / e) * 0.08 }];
      const P = tracePath(s, pts, reachFor(s, pts));
      if (P.hits.some((h) => h.id === L.id) && P.hits.length > bn) (bn = P.hits.length), (best = pts);
    }
  }
  return best;
}
/** ✏️ M2 S3 온보딩 스위치(측정용 켬/끔): 1-1 둘째 웨이브 '줄 끝으로 옮겨 서기' 손가락 시범 */
export const ONBOARD = { moveDemo: true };
/** 1-1 둘째 웨이브(가로 넷)이고 아직 꺾은 획을 안 그었으면: 손가락이 줄 끝으로 가서 꺾어 긋는 길을 그어 보인다(GDD §7) */
const moveDemo = (s: DashState) => ONBOARD.moveDemo && s.stage === 0 && s.wave === 2 && s.bents === 0;
/** M2 S2 손가락 시범: 잎 길잡이가 보이고 휙이 LEAF_DEMO번 넘게 났을 때 · M2 S3: 1-1 옮겨 서기 시범도 손가락 */
/** 🧪 M2 S7: 대나무를 처음 쓰러뜨리기 전까지는 '툭' 전에도 대나무 길과 손가락 시범(처음 하는 사람이 쓰러짐 보상을 .17만 봄) */
const bambooIntro = (s: DashState) => !s.seen.has('bambooFall') && s.bamboos.some((b) => b.fall < 0);
const demoNow = (s: DashState) => s.owl || moveDemo(s) || ((s.leafGuide || s.bellGuide || s.bambooGuide) && s.dodgeN >= LEAF_DEMO) || (bambooIntro(s) && !s.leafGuide);
/** ✏️ M2 S6 🔔 종 길잡이: 종 너머 .13까지 갔다가 ±20~35° 돌아 .30 되돌아오는 V(종을 두 번 지나는 것 중 가장 많이 베는 길) */
function bellGuideOf(s: DashState) {
  let best: { x: number; y: number }[] | null = null, bn = 0;
  for (const B of s.foes.filter((f) => f.k === 'bell' && f.st !== ENTER)) {
    const dx = B.x - s.nx, dy = B.y - s.ny, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const V = { x: clamp(B.x + ux * 0.13, X0, X1), y: clamp(B.y + uy * 0.13, Y0, Y1) };
    for (const a of [0.35, -0.35, 0.6, -0.6]) {
      const rx = -ux * Math.cos(a) + uy * Math.sin(a), ry = -uy * Math.cos(a) - ux * Math.sin(a), pts = [V, { x: clamp(V.x + rx * 0.3, X0, X1), y: clamp(V.y + ry * 0.3, Y0, Y1) }];
      const P = tracePath(s, pts, reachFor(s, pts));
      if (P.hits.some((h) => h.id === B.id) && P.hits.length > bn) (bn = P.hits.length), (best = pts);
    }
  }
  return best;
}
/** ✏️ M2 S7 🎋 대나무 길잡이(📐 bambooPlan): 쓰러짐 줄에 적이 가장 많이 걸리는 방향 u로 [대나무 − u×.16 → 대나무] 꺾어 들어감.
 *  닌자에서 첫 점까지가 u와 30° 안이면 앞에 옆걸음 점(u에 수직 .12)을 넣는다 · 덤불에 걸리는 길은 뒤로 */
function bambooGuideOf(s: DashState, safe?: (P: Path) => boolean) {
  let best: { x: number; y: number }[] | null = null, bn = 0;
  for (const B of s.bamboos) {
    if (B.fall >= 0) continue;
    for (let i = 0; i < 16; i++) {
      const ux = Math.cos((i * TAU) / 16), uy = Math.sin((i * TAU) / 16), p1 = { x: B.x - ux * 0.16, y: B.y - uy * 0.16 };
      if (p1.x < X0 || p1.x > X1 || p1.y < Y0 || p1.y > Y1) continue;
      const d = Math.hypot(p1.x - s.nx, p1.y - s.ny) || 1, pts = [p1, { x: B.x, y: B.y }];
      if (((p1.x - s.nx) * ux + (p1.y - s.ny) * uy) / d > Math.cos(0.52)) pts.unshift({ x: clamp(p1.x - uy * 0.12, X0, X1), y: clamp(p1.y + ux * 0.12, Y0, Y1) });
      const P = tracePath(s, pts, reachFor(s, pts));
      if (!P.falls.some((q) => q.id === B.id) || (safe && !safe(P))) continue;
      const v = P.hits.length - (thornOf(s, P.legs) ? 0.5 : 0);
      if (v > bn) (bn = v), (best = pts);
    }
  }
  return best;
}
/** 지금 화면에 그려 주는 길잡이(1-2 ㄱ자 · 첫 휙 뒤 잎) — 그리기와 측정 봇이 같은 것을 본다 */
function guideNow(s: DashState) {
  if (s.phase !== 'play' || s.down) return null;
  if (s.owl) return (s.foes.some((f) => leafy(s, f) && f.st !== ENTER) ? leafGuideOf(s) : null) ?? (!globalThis.__SHIP__ && s.foes.some((f) => f.k === 'bell' && f.st !== ENTER) ? bellGuideOf(s) : null) ?? bambooGuideOf(s) ?? guideOf(s, 2) ?? guideOf(s, 1); // M2 S4 부엉이: 지금 가장 많이 베는 길
  if (moveDemo(s)) return guideOf(s, 3); // 🧪 S3: 하나 베어도 남은 셋을 꿰는 길로 계속
  if (s.stage === 1 && s.bents === 0) return guideOf(s);
  if (s.leafGuide) return leafGuideOf(s);
  if (!globalThis.__SHIP__ && s.bellGuide) return bellGuideOf(s);
  if (s.bambooGuide || bambooIntro(s)) return bambooGuideOf(s);
  return null;
}

function drawThorn(ctx: C2, x: number, y: number, r: number, t: number, hot: boolean) {
  ctx.save();
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.5);
  ctx.fillStyle = hot ? `rgba(220,50,40,${0.35 + 0.2 * pulse})` : `rgba(150,70,120,${0.45 + 0.1 * pulse})`; // S010: 풀빛과 다른 자줏빛 덤불
  ell(ctx, x, y, r, r * 0.55);
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.strokeStyle = hot ? 'rgba(255,120,100,.95)' : 'rgba(255,190,230,.85)';
  ctx.setLineDash([4, 3]);
  ell(ctx, x, y, r, r * 0.55);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = hot ? 'rgba(255,200,190,.95)' : 'rgba(255,225,240,.95)';
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.lineCap = 'round';
  for (let k = 0; k < 14; k++) {
    const a = k * 2.399, q = 0.3 + ((k * 37) % 10) / 16, px = x + Math.cos(a) * r * q * 0.8, py = y + Math.sin(a) * r * q * 0.45;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(a + 1.2) * r * 0.3, py - Math.abs(Math.sin(a + 1.2)) * r * 0.36);
    ctx.stroke();
  }
  ctx.restore();
}

// ✏️ M2 S8 번들 덜기 ⓐ: drawSmoke(연기 그림)는 뺐다 — 2-4에서 연기를 빼 어느 판에도 없다(시뮬은 남김, M5에 다시 짤 때 git 기록에서 되살림)
/** 부엉이 구경꾼 (대숲 위 가지) */
function drawOwl(ctx: C2, x: number, y: number, k: number, t: number, look: number, hoot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#1a1424';
  ctx.lineWidth = k * 0.08;
  ctx.beginPath();
  ctx.moveTo(-k * 0.9, k * 0.02);
  ctx.lineTo(k * 0.7, -k * 0.06);
  ctx.stroke();
  const flap = hoot > 0 ? Math.sin(t * 0.8) * 0.8 : 0;
  ctx.fillStyle = '#6a5848';
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * k * 0.26, -k * 0.35);
    ctx.rotate(sd * (0.2 + Math.abs(flap)));
    ell(ctx, sd * k * 0.05, k * 0.12, k * 0.1, k * 0.24);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = lin(ctx, 0, -k * 0.7, 0, 0, [0, '#9a8470'], [1, '#5e4c3e']);
  ell(ctx, 0, -k * 0.33, k * 0.28, k * 0.34);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = k * 0.04;
  ctx.stroke();
  ctx.fillStyle = '#d9c8a8';
  ell(ctx, 0, -k * 0.2, k * 0.16, k * 0.18);
  ctx.fill();
  ctx.fillStyle = '#7a6656';
  ctx.beginPath();
  ctx.moveTo(-k * 0.24, -k * 0.55);
  ctx.lineTo(-k * 0.2, -k * 0.78);
  ctx.lineTo(-k * 0.08, -k * 0.6);
  ctx.moveTo(k * 0.24, -k * 0.55);
  ctx.lineTo(k * 0.2, -k * 0.78);
  ctx.lineTo(k * 0.08, -k * 0.6);
  ctx.fill();
  const blink = Math.sin(t * 0.021) > 0.985;
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#f5d24a';
    ctx.beginPath();
    ctx.arc(sd * k * 0.11, -k * 0.45, k * (hoot > 0 ? 0.105 : 0.09), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = k * 0.025;
    ctx.stroke();
    if (blink) {
      ctx.beginPath();
      ctx.moveTo(sd * k * 0.11 - k * 0.08, -k * 0.45);
      ctx.lineTo(sd * k * 0.11 + k * 0.08, -k * 0.45);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#140d10';
      ctx.beginPath();
      ctx.arc(sd * k * 0.11 + look * k * 0.035, -k * 0.44, k * 0.045, 0, TAU);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#e8a63a';
  ctx.beginPath();
  ctx.moveTo(-k * 0.04, -k * 0.37);
  ctx.lineTo(k * 0.04, -k * 0.37);
  ctx.lineTo(0, -k * (hoot > 0 ? 0.25 : 0.29));
  ctx.fill();
  ctx.restore();
}
/** 손가락 그림 (첫 안내) */
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.1);
  ctx.rotate(-0.25);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = k * 0.07;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-k * 0.12, 0);
  ctx.lineTo(-k * 0.12, k * 0.55);
  ctx.quadraticCurveTo(-k * 0.45, k * 0.42, -k * 0.38, k * 0.62);
  ctx.lineTo(-k * 0.12, k * 1.05);
  ctx.quadraticCurveTo(k * 0.1, k * 1.25, k * 0.42, k * 1.05);
  ctx.quadraticCurveTo(k * 0.55, k * 0.75, k * 0.48, k * 0.5);
  ctx.quadraticCurveTo(k * 0.45, k * 0.38, k * 0.32, k * 0.4);
  ctx.quadraticCurveTo(k * 0.3, k * 0.3, k * 0.18, k * 0.32);
  ctx.quadraticCurveTo(k * 0.15, k * 0.24, k * 0.1, k * 0.26);
  ctx.lineTo(k * 0.1, 0);
  ctx.quadraticCurveTo(-k * 0.01, -k * 0.14, -k * 0.12, 0);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}


function lantern(ctx: C2, x: number, y: number, k: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  const fl = 0.75 + 0.25 * Math.sin(t * 0.13) * Math.sin(t * 0.07);
  ctx.fillStyle = radg(ctx, 0, -k * 0.62, 0, k * 0.9, [0, `rgba(255,200,120,${0.35 * fl})`], [1, 'rgba(255,200,120,0)']);
  ctx.beginPath();
  ctx.arc(0, -k * 0.62, k * 0.9, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(4,6,18,.4)';
  ell(ctx, 0, 0, k * 0.3, k * 0.08);
  ctx.fill();
  const stone = lin(ctx, -k * 0.2, 0, k * 0.2, 0, [0, '#8d92a3'], [1, '#4a4e5e']);
  ctx.fillStyle = stone;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = k * 0.03;
  rr(ctx, -k * 0.22, -k * 0.12, k * 0.44, k * 0.12, k * 0.03);
  ctx.fill();
  ctx.stroke();
  rr(ctx, -k * 0.07, -k * 0.45, k * 0.14, k * 0.34, k * 0.03);
  ctx.fill();
  ctx.stroke();
  rr(ctx, -k * 0.2, -k * 0.52, k * 0.4, k * 0.08, k * 0.03);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = `rgba(255,214,140,${fl})`;
  rr(ctx, -k * 0.13, -k * 0.74, k * 0.26, k * 0.22, k * 0.02);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(80,50,30,.6)';
  ctx.fillRect(-k * 0.015, -k * 0.74, k * 0.03, k * 0.22);
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.moveTo(-k * 0.3, -k * 0.74);
  ctx.quadraticCurveTo(0, -k * 0.82, k * 0.3, -k * 0.74);
  ctx.lineTo(0, -k * 0.98);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
/** 앞쪽 소품 (화면 아래 모서리 — 깊이감) */
function frontProps(ctx: C2, place: number, w: number, t: number) {
  const R = (r: number) => r * w, gb = GB * w;
  if (place === 0) {
    ctx.fillStyle = 'rgba(4,6,18,.35)';
    ell(ctx, R(0.05), gb - R(0.01), R(0.12), R(0.03));
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, gb - R(0.08), 0, gb, [0, '#6e7488'], [1, '#2e3240']);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-R(0.02), gb);
    ctx.quadraticCurveTo(-R(0.01), gb - R(0.07), R(0.05), gb - R(0.075));
    ctx.quadraticCurveTo(R(0.11), gb - R(0.07), R(0.12), gb);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(110,170,90,.85)';
    ell(ctx, R(0.04), gb - R(0.066), R(0.045), R(0.014));
    ctx.fill();
    for (const [x, hgt] of [[0.9, 0.07], [0.95, 0.1], [0.985, 0.06]]) {
      ctx.fillStyle = lin(ctx, R(x) - R(0.02), 0, R(x) + R(0.02), 0, [0, '#7a8a3a'], [1, '#3e4a1e']);
      ctx.beginPath();
      ctx.moveTo(R(x) - R(0.022), gb);
      ctx.quadraticCurveTo(R(x) - R(0.012), gb - R(hgt) * 0.6, R(x), gb - R(hgt));
      ctx.quadraticCurveTo(R(x) + R(0.012), gb - R(hgt) * 0.6, R(x) + R(0.022), gb);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(30,40,10,.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(R(x) - R(0.016), gb - R(hgt) * 0.25);
      ctx.lineTo(R(x) + R(0.012), gb - R(hgt) * 0.35);
      ctx.stroke();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
    }
  } else if (place === 1) {
    ctx.fillStyle = '#121528';
    ctx.fillRect(0, gb - R(0.014), w, R(0.02));
    for (let x = R(0.02); x < w; x += R(0.06)) {
      ctx.fillStyle = lin(ctx, x - R(0.02), 0, x + R(0.02), 0, [0, '#5a6688'], [1, '#2a3048']);
      ctx.beginPath();
      ctx.arc(x, gb - R(0.012), R(0.02), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(200,210,255,.35)';
      ctx.beginPath();
      ctx.arc(x, gb - R(0.012), R(0.011), 0, TAU);
      ctx.stroke();
    }
  } else {
    lantern(ctx, R(0.06), gb - R(0.005), R(0.13), t);
    ctx.fillStyle = '#141820';
    for (let j = 0; j < 4; j++) {
      ell(ctx, w - R(0.04) - j * R(0.035), gb - R(0.05) + j * R(0.018), R(0.07 - j * 0.01), R(0.02));
      ctx.fill();
    }
  }
}
const recentSay = new WeakMap<object, { x: number; y: number; t: number; size: number }[]>();
/** 화면 위 크기: 먼 쪽은 작게, 가까운 쪽은 크게 */
const depth = (y: number) => 0.84 + 0.26 * ((y - Y0) / (Y1 - Y0));
const FOE_H: Record<K, number> = { dummy: 0.175, sword: 0.165, archer: 0.165, shuri: 0.165, shield: 0.18, boss: 0.27, leaf: 0.15, bell: 0.16 };
const NIN_H = 0.18;

function foePose(f: Foe, moving: boolean): Pose {
  return { k: f.k, st: f.st, tm: f.tm, fa: f.fa, seed: f.seed, hurt: f.hurtT, whiff: f.whiff, hp: f.hp, moving, cut: false };
}

function drawAll(ctx: C2, s: DashState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const d = STAGES[s.stage], P = PAL[d.place], t = s.t, wt = s.wt;
  const sc = typeof ctx.getTransform === 'function' ? ctx.getTransform().a || 1 : 1;
  const bg = getBg(Math.round(w), Math.round(h), d.place, Math.min(3, Math.max(1, Math.round(sc))));
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const sv = s.slowVis;
  const L = reachOf(s.g), canCut = L >= HOP;
  const prev = s.down && s.aim && s.phase === 'play' ? tracePath(s, strokeOf(s), canCut ? reachFor(s, strokeOf(s)) : HOP) : null;
  const targets = new Set(prev ? [...prev.hits, ...prev.dodges].map((q) => q.id) : []); // M2 S1: 휙 할 잎도 느린 세상에서 또렷하게

  ctx.save();
  fx.begin(ctx);
  // ── 하늘 · 먼 숲 · 가까운 숲 (시차) ──
  ctx.fillStyle = P.sky[0];
  ctx.fillRect(-20, -20, w + 40, h + 40);
  ctx.drawImage(bg.sky, 0, 0, w, Y(HZ) + R(0.04));
  const cam = s.camX;
  ctx.drawImage(bg.far, -R(0.15) - cam * R(0.06), Y(HZ) + R(0.05) - bg.far.height / sc, bg.far.width / sc, bg.far.height / sc);
  ctx.drawImage(bg.mid, -R(0.2) - cam * R(0.14), Y(HZ) + R(0.06) - bg.mid.height / sc, bg.mid.width / sc, bg.mid.height / sc);
  // 부엉이 (가지 위 구경꾼)
  {
    const hoot = Math.max(0, 60 - (t - s.owlT));
    const ox = X(0.14) - cam * R(0.14), oy = Y(0.3);
    drawOwl(ctx, ox, oy, R(0.1), t, clamp((s.nx - 0.14) * 3, -1, 1), hoot);
    if (hoot > 40) {
      font(0.036, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff3c4';
      ctx.strokeStyle = 'rgba(0,0,0,.5)';
      ctx.lineWidth = 3;
      ctx.strokeText('부엉!', ox + R(0.07), oy - R(0.08));
      ctx.fillText('부엉!', ox + R(0.07), oy - R(0.08));
    }
  }
  ctx.drawImage(bg.ground, 0, Y(HZ), w, Y(GB) - Y(HZ));
  if (d.place !== 1) for (const lx of [0.035, 0.965]) lantern(ctx, X(lx), Y(HZ + 0.06), R(0.085), t + lx * 50);
  // ── 땅 위: 먹물 자국 · 그림자 · 위험 표시 ──
  for (const k of s.inks) {
    const a = Math.max(0, 1 - (t - k.t) / 420) * Math.min(1, Math.max(0, t - k.t - 8) / 6);
    if (a <= 0) continue;
    ctx.fillStyle = `rgba(20,12,40,${0.42 * a})`;
    const cx = X(k.x), cy = Y(k.y), r0 = R(k.r);
    for (let j = 0; j < 6; j++) {
      const ang = hsh(k.seed + j) * TAU, dd = r0 * (0.2 + hsh(k.seed + j + 3) * 0.7);
      ell(ctx, cx + Math.cos(ang) * dd, cy + Math.sin(ang) * dd * 0.45, r0 * (0.3 + hsh(k.seed + j * 2) * 0.35), r0 * 0.16);
      ctx.fill();
    }
    ell(ctx, cx, cy, r0 * 0.6, r0 * 0.24);
    ctx.fill();
  }
  for (const f of s.foes) {
    if (f.st === ENTER) continue;
    const m = MELEE[f.k], fx0 = X(f.x), fy0 = Y(f.y);
    if (m && f.st === WIND) {
      const u = 1 - f.tm / (m.wind * easeOf(s)[1]);
      ctx.fillStyle = `rgba(255,70,60,${0.12 + 0.28 * u})`;
      ctx.beginPath();
      if (f.k === 'boss') ell(ctx, fx0, fy0, R(m.reach), R(m.reach) * 0.5);
      else {
        ctx.moveTo(fx0, fy0);
        ctx.ellipse(fx0, fy0, R(m.reach), R(m.reach) * 0.5, 0, f.fa - 1.2, f.fa + 1.2);
        ctx.closePath();
      }
      ctx.fill();
      ctx.strokeStyle = `rgba(255,120,100,${0.5 + 0.5 * u})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (f.k === 'shield') {
      ctx.strokeStyle = 'rgba(255,214,110,.75)';
      ctx.lineWidth = R(0.008);
      ctx.beginPath();
      ctx.ellipse(fx0, fy0, R(0.065), R(0.03), 0, f.fa - 1.0, f.fa + 1.0);
      ctx.stroke();
      if (s.down) {
        ctx.strokeStyle = 'rgba(140,255,170,.8)';
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.ellipse(fx0, fy0, R(0.075), R(0.035), 0, f.fa + Math.PI - 0.9, f.fa + Math.PI + 0.9);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    if (f.st === AIM) {
      const locked = f.tm <= LOCK, a = locked ? 0.85 : 0.25 + 0.3 * (1 - f.tm / 72);
      ctx.strokeStyle = `rgba(255,80,70,${a})`;
      ctx.lineWidth = locked ? 2.2 : 1.4;
      ctx.setLineDash(locked ? [] : [5, 5]);
      const spread = f.k === 'shuri' ? [-0.3, 0, 0.3] : [0];
      const ang = Math.atan2(f.ay - f.y, f.ax - f.x), len = Math.hypot(f.ax - f.x, f.ay - f.y) + 0.1;
      for (const o of spread) {
        ctx.beginPath();
        ctx.moveTo(fx0, fy0);
        ctx.lineTo(X(f.x + Math.cos(ang + o) * len), Y(f.y + Math.sin(ang + o) * len));
        ctx.stroke();
      }
      ctx.setLineDash([]);
      if (locked) {
        ctx.strokeStyle = 'rgba(255,90,80,.9)';
        ctx.lineWidth = 2;
        ell(ctx, X(f.ax), Y(f.ay), R(0.035), R(0.017));
        ctx.stroke();
      }
    }
  }
  // ✏️ S009 가시덤불(땅): 그리는 길이 걸리면 빨갛게
  for (const b of s.barrels) {
    if (b.fuse < 0 && !(prev && prev.barrels.includes(b.id))) continue;
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.6);
    ctx.strokeStyle = b.fuse >= 0 ? `rgba(255,90,60,${0.5 + 0.4 * pulse})` : 'rgba(255,170,80,.7)';
    ctx.fillStyle = b.fuse >= 0 ? `rgba(255,80,40,${0.08 + 0.08 * pulse})` : 'rgba(255,170,80,.08)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ell(ctx, X(b.x), Y(b.y), R(BLAST), R(BLAST) * 0.5);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // ── 서 있는 것들: 깊이(발 y) 순서로 ──
  type Item = { y: number; draw: () => void };
  const items: Item[] = [];
  {
    const hot = prev ? thornOf(s, prev.legs)?.m : null;
    for (const m of s.thorns) items.push({ y: m.y - m.r * 0.6, draw: () => drawThorn(ctx, X(m.x), Y(m.y), R(m.r) * 1.25, t, m === hot) });
  }
  for (const b of s.barrels) {
    const pop = Math.min(1, 0.4 + (t - b.born) / 14);
    items.push({ y: b.y, draw: () => drawBarrel(ctx, X(b.x), Y(b.y), R(0.15) * depth(b.y), b.fuse, t, pop) });
  }
  const drawFoe = (f: Foe, alpha: number, outline: boolean) => {
    let x = f.x, y = f.y, z = 0, sc2 = 1;
    if (f.st === ENTER) {
      const u = Math.min(1, f.tm / ENTER_T);
      if (Math.abs(f.ex - f.tx) + Math.abs(f.ey - f.ty) > 0.01) z = Math.sin(u * Math.PI) * 0.09;
      else sc2 = Math.min(1, 0.3 + u * 1.2);
    }
    const k = R(FOE_H[f.k]) * depth(y) * sc2, face = Math.cos(f.fa) >= 0 ? 1 : -1;
    const moving = (f.st === IDLE && !!MELEE[f.k] && Math.hypot(s.nx - f.x, s.ny - f.y) > (MELEE[f.k]?.start ?? 0)) || f.st === ENTER;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(X(x), Y(y));
    ctx.fillStyle = 'rgba(4,6,18,.4)';
    ell(ctx, 0, 0, k * (f.k === 'boss' ? 0.38 : 0.26), k * 0.07);
    ctx.fill();
    ctx.translate(0, -R(z));
    if (f.hurtT > 0) ctx.translate(Math.sin(t * 2) * k * 0.04, 0);
    const pose = foePose(f, moving);
    const shieldBehind = f.k === 'shield' && Math.sin(f.fa) <= -0.2;
    if (shieldBehind) drawShieldDisc(ctx, k, f.fa, 0);
    ctx.save();
    ctx.scale(face, 1);
    if (outline) {
      ctx.shadowColor = '#fff1b0';
      ctx.shadowBlur = k * 0.25;
    }
    drawFoeBody(ctx, k, pose, wt);
    ctx.restore();
    if (f.k === 'shield' && !shieldBehind) drawShieldDisc(ctx, k, f.fa, Math.max(0, 1 - (t - (fx.memo['bn' + f.id] ?? -99)) / 10));
    if (f.k === 'boss') {
      if (d.leafBoss) { // ✏️ M2 S9 2-10 큰 너구리(임시 그림 — 1-10 곰 + 머리에 큰 잎 · 🎨 M3)
        ctx.fillStyle = '#7ad070';
        ctx.save();
        ctx.translate(k * 0.05, -k * 1.12);
        ctx.rotate(-0.5);
        ell(ctx, 0, 0, k * 0.2, k * 0.08);
        ctx.fill();
        ctx.restore();
      }
      for (let j = 0; j < 4; j++) {
        ctx.fillStyle = j < f.hp ? '#ff5a4e' : 'rgba(255,255,255,.2)';
        ctx.save();
        ctx.translate((j - 1.5) * k * 0.13, -k * 1.32);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-k * 0.035, -k * 0.035, k * 0.07, k * 0.07);
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-k * 0.035, -k * 0.035, k * 0.07, k * 0.07);
        ctx.restore();
      }
    }
    if (inSmoke(s, s.nx, s.ny) && f.k !== 'dummy' && s.phase === 'play') {
      font(0.04, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('?', k * 0.15, -k * 1.0);
    }
    ctx.restore();
  };
  for (const f of s.foes) items.push({ y: f.y, draw: () => drawFoe(f, 1, false) });
  for (const b of s.bamboos) items.push({ y: b.y, draw: () => { // ✏️ M2 S7 🎋 대나무(임시 그림 — 🎨 M3): 밑동이 베는 자리 · 툭이면 흔들 · 꺾어 베면 칼 간 쪽으로 쓰러짐
    const H = R(BAMBOO.L * 0.7), bx = X(b.x), by = Y(b.y), p = b.fall < 0 ? 0 : Math.min(1, (t - b.fall) / 12), w0 = t - b.wob;
    let a = Math.atan2(b.dy, b.dx) + Math.PI / 2;
    if (a > Math.PI) a -= TAU;
    ctx.save();
    ctx.globalAlpha = b.fall < 0 ? 1 : Math.max(0, 1 - (t - b.fall - 12) / 18);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ell(ctx, bx, by, R(0.03), R(0.012));
    ctx.fill();
    bamboo(ctx, bx, by - H - (R(BAMBOO.L) - H) * p, by, R(0.024), '#7ad070', 'rgba(235,255,220,.55)', b.id, 2, b.fall < 0 ? (w0 < 24 ? Math.sin(w0 * 0.9) * 0.18 * (1 - w0 / 24) : 0) : a * p * p);
    if (b.fall < 0) { // 베는 자리: 밑동 고리
      ctx.strokeStyle = `rgba(255,236,150,${0.55 + 0.25 * Math.sin(t * 0.2)})`;
      ctx.lineWidth = 2;
      ell(ctx, bx, by - R(0.015), R(0.026), R(0.011));
      ctx.stroke();
    }
    ctx.restore();
  } });
  // 베인 적: 잠깐 멈췄다가(칼을 집어넣는 '찰칵') 반으로 갈라진다
  const SPLIT = 10;
  for (const c of s.cuts) {
    const age = t - c.t;
    items.push({
      y: c.y,
      draw: () => {
        const k = R(FOE_H[c.k]) * depth(c.y), pose: Pose = { k: c.k, st: IDLE, tm: 0, fa: c.face > 0 ? 0 : Math.PI, seed: c.seed, hurt: 0, whiff: 0, hp: 0, moving: false, cut: true };
        const cx = X(c.x), cy = Y(c.y), mid = cy - k * 0.42;
        if (c.boom) {
          const u = age;
          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - u / 40);
          ctx.translate(cx + Math.cos(c.a) * u * 2.4, cy + Math.sin(c.a) * u * 1.2 - u * 3.2 + u * u * 0.09);
          ctx.rotate(u * 0.18 * (c.face || 1));
          ctx.scale(c.face, 1);
          drawFoeBody(ctx, k, pose, wt);
          ctx.restore();
          return;
        }
        if (age < SPLIT) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.fillStyle = 'rgba(4,6,18,.4)';
          ell(ctx, 0, 0, k * 0.26, k * 0.07);
          ctx.fill();
          ctx.scale(c.face, 1);
          drawFoeBody(ctx, k, pose, wt);
          ctx.restore();
          ctx.save();
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 10;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cx - Math.cos(c.a) * k * 0.55, mid - Math.sin(c.a) * k * 0.55);
          ctx.lineTo(cx + Math.cos(c.a) * k * 0.55, mid + Math.sin(c.a) * k * 0.55);
          ctx.stroke();
          ctx.restore();
          return;
        }
        const u = age - SPLIT, nx = -Math.sin(c.a), ny = Math.cos(c.a), Lc = k * 3, fall = u * u * 0.06;
        for (const sd of [1, -1]) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - u / 45);
          ctx.translate(nx * sd * (3 + u * 1.6) + Math.cos(c.a) * sd * u * 0.6, ny * sd * (2 + u * 0.8) + fall * (sd > 0 ? 1.3 : 0.5));
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(c.a) * Lc, mid + Math.sin(c.a) * Lc);
          ctx.lineTo(cx + Math.cos(c.a) * Lc + nx * sd * Lc, mid + Math.sin(c.a) * Lc + ny * sd * Lc);
          ctx.lineTo(cx - Math.cos(c.a) * Lc + nx * sd * Lc, mid - Math.sin(c.a) * Lc + ny * sd * Lc);
          ctx.lineTo(cx - Math.cos(c.a) * Lc, mid - Math.sin(c.a) * Lc);
          ctx.closePath();
          ctx.clip();
          ctx.translate(cx, cy);
          ctx.rotate(sd * u * 0.03);
          ctx.scale(c.face, 1);
          drawFoeBody(ctx, k, pose, wt);
          ctx.restore();
        }
        if (u < 8) {
          ctx.strokeStyle = `rgba(255,255,255,${1 - u / 8})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx - Math.cos(c.a) * k * 0.7, mid - Math.sin(c.a) * k * 0.7);
          ctx.lineTo(cx + Math.cos(c.a) * k * 0.7, mid + Math.sin(c.a) * k * 0.7);
          ctx.stroke();
        }
      },
    });
  }
  // S004 일격 고리: 빨간 고리가 조여 들고 닿는 순간 번쩍(위험 빨강만)
  for (const k of s.strikes) {
    const u = 1 - k.t / k.t0, rr0 = R(STRIKE.r) * (1.8 - 0.8 * u);
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.55 * u;
    ctx.strokeStyle = '#ff4a3d';
    ctx.lineWidth = R(0.006) + R(0.008) * u;
    ell(ctx, X(k.x), Y(k.y), rr0, rr0 * 0.45);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,74,61,${0.12 + 0.28 * u})`;
    ell(ctx, X(k.x), Y(k.y), R(STRIKE.r), R(STRIKE.r) * 0.45);
    ctx.fill();
    ctx.restore();
  }
  // 닌자
  const since = t - (s.trail?.t ?? -999);
  const ninPose = () =>
    s.phase === 'result' ? (s.ok ? 4 : 5) : s.inv > INV_DASH && s.t - (fx.memo.hurtT ?? -99) < 40 ? 3 : s.down ? 1 : since < 26 && (s.trail?.n ?? 0) > 0 ? 2 : 0;
  const drawNinja = (alpha = 1) => {
    const k = R(NIN_H) * depth(s.ny);
    const blinkOff = s.inv > INV_DASH && s.phase === 'play' && Math.floor(t / 4) % 2 === 0;
    ctx.fillStyle = radg(ctx, X(s.nx), Y(s.ny), 0, k * 0.55, [0, 'rgba(200,235,255,.32)'], [1, 'rgba(200,235,255,0)']);
    ell(ctx, X(s.nx), Y(s.ny), k * 0.55, k * 0.2);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = 'rgba(150,215,255,.75)';
    ctx.shadowBlur = k * 0.12;
    drawFox(ctx, X(s.nx), Y(s.ny), k, s.face, ninPose(), wt + t * 0.3, blinkOff ? 0.45 * alpha : alpha);
    ctx.restore();
    if (s.phase === 'play' && (s.hp < HP || t - (fx.memo.hurtT ?? -99) < 90)) {
      for (let j = 0; j < HP; j++) {
        ctx.fillStyle = j < s.hp ? '#ff5a6a' : 'rgba(255,255,255,.25)';
        heartPath(ctx, X(s.nx) + (j - 1) * R(0.03), Y(s.ny) - k * 1.18, R(0.011));
        ctx.fill();
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
    // 위험 경고: 곧 맞을 것 같으면 머리 위 '!'
    if (s.phase === 'play' && !s.down) {
      const none = new Set<number>(), T = danger(s, s.nx, s.ny, none, none);
      if (T < 40) {
        const pulse = 1 + 0.15 * Math.sin(t * 0.6);
        ctx.save();
        ctx.translate(X(s.nx) + R(0.05), Y(s.ny) - k * 1.15);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = '#ff4a3d';
        ctx.beginPath();
        ctx.arc(0, 0, R(0.022), 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        font(0.032, 900);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', 0, R(0.002));
        ctx.restore();
      }
    }
  };
  items.push({ y: s.ny + 0.0001, draw: () => drawNinja() });
  // 날아오는 것
  for (const sh of s.shots) {
    items.push({
      y: sh.y,
      draw: () => {
        const sx = X(sh.x), sy = Y(sh.y), hz2 = R(0.05) * depth(sh.y), a = Math.atan2(sh.vy, sh.vx);
        ctx.fillStyle = 'rgba(4,6,18,.35)';
        ell(ctx, sx, sy, R(0.016), R(0.006));
        ctx.fill();
        const tl = R(sh.k ? 0.04 : 0.07) * (1 - sv * 0.7);
        ctx.strokeStyle = 'rgba(255,255,255,.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy - hz2);
        ctx.lineTo(sx - Math.cos(a) * tl * 1.6, sy - hz2 - Math.sin(a) * tl * 1.6);
        ctx.stroke();
        ctx.save();
        ctx.translate(sx, sy - hz2);
        if (sh.k === 0) {
          ctx.rotate(a);
          const al = R(0.07);
          ctx.strokeStyle = '#3a2412';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(-al, 0);
          ctx.lineTo(0, 0);
          ctx.stroke();
          ctx.strokeStyle = '#e2bc84';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#eef3ff';
          ctx.beginPath();
          ctx.moveTo(R(0.016), 0);
          ctx.lineTo(-R(0.004), -R(0.008));
          ctx.lineTo(-R(0.004), R(0.008));
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = OUT;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = '#e2404a';
          for (const sd of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(-al, 0);
            ctx.lineTo(-al - R(0.012), sd * R(0.01));
            ctx.lineTo(-al + R(0.016), 0);
            ctx.fill();
          }
        } else {
          ctx.rotate(sh.a);
          shuriPath(ctx, R(0.022));
          ctx.fillStyle = lin(ctx, -R(0.02), -R(0.02), R(0.02), R(0.02), [0, '#ffffff'], [1, '#8a96ad']);
          ctx.fill();
          ctx.strokeStyle = OUT;
          ctx.lineWidth = 1.4;
          ctx.stroke();
          ctx.fillStyle = OUT;
          ctx.beginPath();
          ctx.arc(0, 0, R(0.005), 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      },
    });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
  // ── 돌진 자국: 칼빛 선 + 잔상 ──
  const sw = !!s.trail?.sw, life = sw ? 40 : 24;
  if (s.trail && since < life) {
    const a = 1 - since / life;
    for (const lg of s.trail.legs) {
      const x0 = X(lg[0]), y0 = Y(lg[1]) - R(0.05), x1 = X(lg[2]), y1 = Y(lg[3]) - R(0.05);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = sw ? `rgba(255,214,90,${0.5 * a})` : `rgba(150,230,255,${0.35 * a})`; // 싹쓸이는 금빛 칼자국
      ctx.lineWidth = R(sw ? 0.11 : 0.07) * (0.6 + a * 0.6);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.shadowColor = sw ? '#ffd84a' : '#bff4ff';
      ctx.shadowBlur = sw ? 28 : 16;
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = R(0.012) * (0.5 + a);
      ctx.stroke();
      ctx.restore();
      if (since < 14) for (const u of [0.25, 0.5, 0.75]) drawFox(ctx, X(lg[0] + (lg[2] - lg[0]) * u), Y(lg[1] + (lg[3] - lg[1]) * u), R(NIN_H) * depth(lg[1] + (lg[3] - lg[1]) * u), s.face, 2, wt, 0.16 * (1 - since / 14) * (0.5 + u));
    }
  }
  frontProps(ctx, d.place, w, t);
  // 연기 (가린다)
  if (inSmoke(s, s.nx, s.ny) && s.phase === 'play') {
    font(0.034, 900);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8ecff';
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 3;
    ctx.strokeText('숨었다!', X(s.nx), Y(s.ny) - R(0.16));
    ctx.fillText('숨었다!', X(s.nx), Y(s.ny) - R(0.16));
  }
  // 떨어지는 댓잎 · 반딧불 (느린 시간엔 같이 느려진다)
  for (let j = 0; j < 7; j++) {
    const sp = 0.4 + hsh(j) * 0.4, yy = ((hsh(j + 3) * h + wt * sp) % (h * 0.95)) - R(0.05), xx = hsh(j + 7) * w + Math.sin(wt * 0.02 + j) * R(0.04);
    ctx.save();
    ctx.translate(xx, yy);
    ctx.rotate(Math.sin(wt * 0.03 + j * 2) * 1.2);
    ctx.fillStyle = d.place === 2 ? 'rgba(255,170,190,.75)' : 'rgba(150,200,120,.7)';
    ctx.beginPath();
    ctx.moveTo(-R(0.014), 0);
    ctx.quadraticCurveTo(0, -R(0.006), R(0.014), 0);
    ctx.quadraticCurveTo(0, R(0.006), -R(0.014), 0);
    ctx.fill();
    ctx.restore();
  }
  for (let j = 0; j < 9; j++) {
    const xx = (hsh(j + 20) * w + Math.sin(wt * 0.011 + j) * R(0.06)) % w, yy = Y(HZ) + hsh(j + 21) * R(0.8) + Math.sin(wt * 0.017 + j * 3) * R(0.03);
    const gl = 0.4 + 0.6 * Math.abs(Math.sin(wt * 0.03 + j));
    ctx.fillStyle = radg(ctx, xx, yy, 0, R(0.018), [0, `rgba(255,240,150,${0.7 * gl})`], [1, 'rgba(255,240,150,0)']);
    ctx.beginPath();
    ctx.arc(xx, yy, R(0.018), 0, TAU);
    ctx.fill();
  }
  // 가까운 대나무 (화면 가장자리, 시차가 가장 크다)
  for (const [bx, wd, sd] of [[-0.015, 0.035, 1], [0.035, 0.018, 2], [1.0, 0.03, 3], [0.965, 0.016, 4]]) {
    const xx = X(bx) - cam * R(0.25);
    ctx.fillStyle = '#05070f';
    ctx.fillRect(xx - R(wd) / 2, -10, R(wd), h * 0.9);
    ctx.fillStyle = 'rgba(120,150,220,.12)';
    ctx.fillRect(xx - R(wd) / 2 + R(wd) * 0.15, -10, R(wd) * 0.2, h * 0.9);
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    for (let yy = R(0.12) + sd * 7; yy < h * 0.9; yy += R(0.16)) ctx.fillRect(xx - R(wd) * 0.6, yy, R(wd) * 1.2, R(0.006));
  }
  // ── 느린 시간: 세상이 먹빛으로 바랜다 → 닌자·겨눈 적·선만 또렷하게 ──
  if (sv > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = `rgba(128,128,128,${0.85 * sv})`;
    ctx.fillRect(-20, -20, w + 40, h + 40);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(16,24,60,${0.28 * sv})`;
    ctx.fillRect(-20, -20, w + 40, h + 40);
    ctx.fillStyle = radg(ctx, X(s.nx), Y(s.ny) - R(0.1), R(0.2), R(0.95), [0, 'rgba(0,0,0,0)'], [1, `rgba(0,0,10,${0.45 * sv})`]);
    ctx.fillRect(-20, -20, w + 40, h + 40);
    // 시간이 늘어지는 물결
    for (let j = 0; j < 3; j++) {
      const ph = ((t * 0.012 + j / 3) % 1);
      ctx.strokeStyle = `rgba(190,235,255,${0.35 * sv * (1 - ph)})`;
      ctx.lineWidth = 1.5;
      ell(ctx, X(s.nx), Y(s.ny), R(0.05 + ph * 0.3), R(0.025 + ph * 0.15));
      ctx.stroke();
    }
    ctx.restore();
    { // ✏️ S009 느린 세상에서도 가시덤불은 또렷하게(길을 읽는 시간) — 걸리면 빨갛게
      const hot = prev ? thornOf(s, prev.legs)?.m : null;
      for (const m of s.thorns) drawThorn(ctx, X(m.x), Y(m.y), R(m.r) * 1.25, t, m === hot);
    }
    for (const f of s.foes) if (targets.has(f.id)) drawFoe(f, 1, true);
    drawNinja(1);
  }
  // ✏️ S012 1-2 길잡이(🧪 S011 '글로는 한붓을 못 배운다'): 꺾은 획을 한 번도 안 그었으면, 가장 많이 베는 ㄱ자 길을 손가락이 그려 보인다
  {
    const g = guideNow(s);
    if (g) {
      const pts = [{ x: s.nx, y: s.ny }, ...g], u = (t % 100) / 70;
      ctx.save();
      ctx.setLineDash([R(0.02), R(0.016)]);
      ctx.lineCap = 'round';
      ctx.lineWidth = R(0.012);
      ctx.strokeStyle = 'rgba(255,240,180,.75)';
      ctx.beginPath();
      pts.forEach((q, i) => (i ? ctx.lineTo(X(q.x), Y(q.y) - R(0.04)) : ctx.moveTo(X(q.x), Y(q.y) - R(0.04))));
      ctx.stroke();
      ctx.setLineDash([]);
      if (u <= 1) { // 손가락 점이 길을 따라 간다
        const L = [Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y), Math.hypot(pts[2].x - pts[1].x, pts[2].y - pts[1].y)], d = u * (L[0] + L[1]);
        const [a0, a1, k] = d < L[0] ? [pts[0], pts[1], d / L[0]] : [pts[1], pts[2], (d - L[0]) / L[1]];
        const hx = X(a0.x + (a1.x - a0.x) * k), hy = Y(a0.y + (a1.y - a0.y) * k) - R(0.04);
        if (demoNow(s)) drawHand(ctx, hx, hy, R(0.09), 1); // ✏️ M2 S2 휙 두 번 뒤: 손가락 그림이 직접 그어 보인다
        else {
          ctx.fillStyle = 'rgba(255,250,220,.95)';
          ctx.beginPath();
          ctx.arc(hx, hy, R(0.022), 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }
  // 겨눈 선
  if (prev && s.aim) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.4);
    ctx.save();
    ctx.lineCap = 'round';
    for (const lg of prev.legs) {
      const x0 = X(lg[0]), y0 = Y(lg[1]) - R(0.04), x1 = X(lg[2]), y1 = Y(lg[3]) - R(0.04);
      ctx.strokeStyle = canCut ? 'rgba(10,14,30,.55)' : 'rgba(10,14,30,.35)';
      ctx.lineWidth = R(0.026);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.shadowColor = '#9ff0ff';
      ctx.shadowBlur = canCut ? 14 : 0;
      ctx.strokeStyle = canCut ? '#f4ffff' : 'rgba(220,230,255,.6)';
      ctx.lineWidth = R(0.009);
      ctx.setLineDash(canCut ? [R(0.03), R(0.014)] : [R(0.012), R(0.012)]);
      ctx.lineDashOffset = -t * 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
    }
    const last = prev.legs[prev.legs.length - 1];
    const want = strokeLen(s);
    // 그은 획(먹 붓 자국) — 실제 돌진 선은 그 위에 흰 칼빛으로
    if (s.stroke.length) {
      ctx.strokeStyle = 'rgba(10,14,30,.28)';
      ctx.lineWidth = R(0.012);
      ctx.beginPath();
      ctx.moveTo(X(s.nx), Y(s.ny) - R(0.04));
      for (const q of strokeOf(s)) ctx.lineTo(X(q.x), Y(q.y) - R(0.04));
      ctx.stroke();
    }
    if (want > pathLen(prev) + 0.03 && !prev.bounce) {
      ctx.strokeStyle = 'rgba(255,140,120,.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(X(last[2]), Y(last[3]) - R(0.04));
      ctx.lineTo(X(s.aim.x), Y(s.aim.y) - R(0.04));
      ctx.stroke();
      ctx.setLineDash([]);
      font(0.034, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffb3a6';
      ctx.fillText(canCut ? '게이지만큼만!' : '게이지 부족 — 짧게만', X(s.aim.x), Y(s.aim.y) - R(0.08));
    }
    for (let j = 1; j < prev.legs.length && s.mirrors.length; j++) { // 거울 꺾임 별(한붓 꺾임에는 안 그림)
      ctx.fillStyle = `rgba(255,255,255,${0.6 + 0.4 * pulse})`;
      starPath(ctx, X(prev.legs[j][0]), Y(prev.legs[j][1]) - R(0.04), R(0.022));
      ctx.fill();
    }
    // 내릴 자리: 닌자 그림자
    drawFox(ctx, X(prev.ex), Y(prev.ey), R(NIN_H) * depth(prev.ey), Math.sign(last[2] - last[0]) || s.face, 1, wt, 0.32);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ell(ctx, X(prev.ex), Y(prev.ey), R(0.035), R(0.016));
    ctx.stroke();
    if (prev.bounce) {
      ctx.strokeStyle = '#ffcf4a';
      ctx.lineWidth = 3;
      const bx = X(prev.ex), by = Y(prev.ey) - R(0.06);
      ctx.beginPath();
      ctx.moveTo(bx - R(0.02), by - R(0.02));
      ctx.lineTo(bx + R(0.02), by + R(0.02));
      ctx.moveTo(bx + R(0.02), by - R(0.02));
      ctx.lineTo(bx - R(0.02), by + R(0.02));
      ctx.stroke();
      font(0.034, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd86b';
      ctx.fillText('방패에 튕겨요!', bx, by - R(0.04));
    }
    // 벨 차례 번호
    prev.hits.forEach((hq, i) => {
      const f = s.foes.find((q) => q.id === hq.id);
      if (!f) return;
      const k = R(FOE_H[f.k]) * depth(f.y), bx = X(f.x), by = Y(f.y) - k * 1.15;
      ctx.fillStyle = '#ff4a3d';
      ctx.beginPath();
      ctx.arc(bx, by, R(0.022), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      font(0.03, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), bx, by + 1);
    });
    for (const fl of prev.falls) { // 🎋 쓰러질 줄(점선)
      const b = s.bamboos.find((q) => q.id === fl.id);
      if (!b) continue;
      ctx.setLineDash([R(0.014), R(0.012)]);
      ctx.strokeStyle = '#ffd84a';
      ctx.lineWidth = R(0.012);
      ctx.beginPath();
      ctx.moveTo(X(b.x), Y(b.y));
      ctx.lineTo(X(b.x + fl.dx * BAMBOO.L), Y(b.y + fl.dy * BAMBOO.L));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const dq of [...prev.dodges, ...prev.toks.map((id) => ({ id }))]) { // 🍃 곧은 칼이면 '휙' · 🎋 '툭' — 꺾어 들어가야 베인다
      const f = s.foes.find((q) => q.id === dq.id) ?? s.bamboos.find((q) => q.id === dq.id), txt = 'k' in (f ?? {}) ? '휙! 꺾어요' : '툭! 꺾어요';
      if (!f) continue;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,.6)';
      font(0.04, 900); // 🧪 M2 S1: 머리 위는 '×명 한 줄!'에 가려서 발밑으로·크게
      ctx.strokeText(txt, X(f.x), Y(f.y) + R(0.05));
      ctx.fillStyle = '#c8ffb0';
      ctx.fillText(txt, X(f.x), Y(f.y) + R(0.05));
    }
    if (prev.hits.length >= 2) {
      font(0.05, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(10,8,20,.75)';
      const txt = `${prev.hits.length}명 한 줄!`;
      const tx = clamp(X(prev.ex), R(0.16), w - R(0.16)), ty = Y(prev.ey) - R(0.17);
      ctx.strokeText(txt, tx, ty);
      ctx.fillStyle = prev.hits.length >= 3 ? '#ffd84a' : '#ffffff';
      ctx.fillText(txt, tx, ty);
    }
    // 손가락 자리
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(X(s.aim.x), Y(s.aim.y), R(0.02 + 0.006 * pulse), 0, TAU);
    ctx.stroke();
    ctx.restore();
    // '스으…'
    if (s.g > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, sv * 1.4);
      ctx.translate(X(s.nx) - R(0.1) * s.face, Y(s.ny) - R(0.2) + Math.sin(t * 0.05) * 3);
      ctx.rotate(-0.12);
      font(0.05, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(8,10,24,.8)';
      ctx.strokeText('스으…', 0, 0);
      ctx.fillStyle = '#dff6ff';
      ctx.fillText('스으…', 0, 0);
      ctx.restore();
    }
  }
  // 첫 안내: 손가락 그림 하나 (허수아비 너머를 꾹)
  if (s.stage === 0 && !s.firstDash && s.phase === 'play' && !s.down) {
    const tx = X(0.5), ty = Y(0.5), cyc = (t % 90) / 90, press = cyc < 0.5 ? cyc * 2 : 1 - (cyc - 0.5) * 2;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -t * 0.8;
    ctx.beginPath();
    ctx.moveTo(X(s.nx), Y(s.ny) - R(0.05));
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = `rgba(255,255,255,${0.9 - press * 0.5})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(tx, ty, R(0.03 + press * 0.03), 0, TAU);
    ctx.stroke();
    ctx.translate(tx, ty);
    ctx.rotate(Math.PI + 0.25);
    drawHand(ctx, 0, R(0.01), R(0.085), press);
    ctx.restore();
  }
  // 새 적 스포트라이트
  if (s.spot) {
    const f = s.foes.find((q) => q.id === s.spot!.id), age = t - s.spot.t;
    if (f && age < 110) {
      const a = Math.min(1, age / 10, (110 - age) / 20), k = R(FOE_H[f.k]) * depth(f.y), cx = X(f.x), cy = Y(f.y) - k * 0.5, r0 = k * 0.9;
      ctx.save();
      ctx.fillStyle = `rgba(4,6,16,${0.5 * a})`;
      ctx.beginPath();
      ctx.rect(-20, -20, w + 40, Y(GB) + 20);
      ctx.arc(cx, cy, r0, 0, TAU, true);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,216,74,${a})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r0 + Math.sin(t * 0.3) * 2, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = a;
      font(0.04, 900);
      const label = `NEW  ${s.spot.label}`, tw = ctx.measureText(label).width + R(0.04), lx = clamp(cx, tw / 2 + 6, w - tw / 2 - 6), ly = cy - r0 - R(0.04) < Y(0.3) ? cy + r0 + R(0.04) : cy - r0 - R(0.04);
      ctx.fillStyle = '#ffd84a';
      rr(ctx, lx - tw / 2, ly - R(0.026), tw, R(0.052), R(0.026));
      ctx.fill();
      ctx.fillStyle = '#1a1424';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx, ly + 1);
      ctx.restore();
    }
  }
  // ── 사건 연출 ──
  const seenT = fx.memo.t ?? -1;
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    x = clamp(x, w * 0.14, w * 0.86);
    y = Math.max(Y(0.3), y);
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 36 && Math.abs(q.x - x) < w * 0.3 && Math.abs(q.y - y) < (size + q.size) * 0.6); k++) y += size + 4;
    rec.push({ x, y, t, size });
    if (rec.length > 12) rec.shift();
    fx.pop(x, y, text, col, size);
  };
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x), ey = Y(e.y);
    if (e.kind === 'dash') {
      const n = e.n ?? 0;
      if (e.text === 'hop') say(ex, ey - R(0.12), '폴짝', '#dfe6ff', 13);
      else {
        fx.blink('#ffffff', Math.min(0.6, 0.18 + n * 0.1));
        fx.kick(2 + n * 2.5);
        fx.ring(ex, ey - R(0.04), '#e8fbff', R(0.08 + n * 0.02), 3);
        fx.burst(ex, ey - R(0.04), '#ffffff', 8 + n * 3, 3, 2);
        if (n > 0 && t - (fx.memo.bz ?? -99) > 40 && !s.events.some((q) => q.t === e.t && q.kind === 'sweep')) (fx.memo.bz = t), say(ex, ey - R(0.25), n >= 3 ? '번쩍!!' : '번쩍!', '#ffffff', 16 + Math.min(4, n) * 3);
        if (n > 1) fx.memo.sheath = t;
      }
    }
    if (e.kind === 'multi') {
      const n = e.n ?? 2;
      (fx.memo.bigT = t), (fx.memo.bigN = n), (fx.memo.bigX = ex), (fx.memo.bigY = ey);
      fx.burst(ex, ey, '#ffd84a', 10 + n * 5, 4 + n * 0.5, 2.6);
      fx.ring(ex, ey, '#ffd84a', R(0.12 + n * 0.03), 5);
    }
    if (e.kind === 'sweep') { // 한 획 싹쓸이
      fx.memo.swT = t;
      fx.blink('#fff3c4', 0.6);
      fx.kick(14);
      fx.ring(ex, ey - R(0.04), '#ffd84a', R(0.7), 9);
      fx.burst(ex, ey - R(0.04), '#ffd84a', 40, 7, 3);
      fx.burst(ex, ey - R(0.04), '#1a1028', 20, 5, 4);
    }
    if (e.kind === 'chain' && (e.n ?? 0) >= 3) say(w * 0.8, Y(0.56), `연쇄 ×${e.n}`, '#9ff0ff', Math.min(26, 14 + (e.n ?? 2) * 1.5));
    if (e.kind === 'bounce') {
      say(ex, ey - R(0.14), '챙!', '#ffd86b', 18);
      fx.burst(ex, ey - R(0.06), '#ffe9a0', 14, 3.4, 2);
      fx.kick(5);
      for (const f of s.foes) if (f.k === 'shield' && Math.hypot(f.x - e.x, f.y - e.y) < 0.12) fx.memo['bn' + f.id] = t;
    }
    if (e.kind === 'shotcut') {
      fx.burst(ex, ey - R(0.05), '#ffffff', 8, 2.6, 1.6);
      say(ex, ey - R(0.1), '탁!', '#e8f4ff', 14);
    }
    if (e.kind === 'hurt') {
      fx.blink('#ff3b30', 0.28);
      fx.kick(9);
      fx.burst(ex, ey - R(0.06), '#ff8a7a', 14, 3.2, 2.2);
      say(ex, ey - R(0.16), '아얏!', '#ffb3a8', 18);
      fx.memo.hurtT = t;
    }
    if (e.kind === 'whiff') say(ex, ey - R(0.15), '헛방!', '#d8dcef', 14);
    if (e.kind === 'slash') fx.burst(ex, ey - R(0.05), '#ff6a5a', 10, 3, 2);
    if (e.kind === 'shoot') say(ex, ey - R(0.14), e.n ? '휙휙휙' : '슝', '#ffd0c8', 12);
    if (e.kind === 'clink') {
      fx.burst(ex, ey - R(0.05), '#ffffff', 10, 2.6, 1.6);
      say(ex, ey - R(0.1), '팅!', '#e8f4ff', 14);
      fx.memo.flm = t;
    }
    if (e.kind === 'boom') {
      fx.burst(ex, ey - R(0.05), '#ffd166', 30, 6, 3.2);
      fx.burst(ex, ey - R(0.05), '#ff6a3d', 20, 4.5, 3);
      fx.burst(ex, ey - R(0.05), '#2a2030', 14, 2.6, 4);
      fx.ring(ex, ey, '#ffb347', R(BLAST), 7);
      fx.kick(12);
      fx.blink('#ffb347', 0.35);
      say(ex, ey - R(0.12), '펑!', '#ffd166', 26);
    }
    if (e.kind === 'bosshit') {
      say(ex, ey - R(0.24), '으윽!', '#ffd0c8', 18);
      fx.kick(7);
    }
    if (e.kind === 'empty') say(ex, ey - R(0.18), '게이지 바닥!', '#ffb3a8', 14);
    if (e.kind === 'clear') {
      fx.burst(w * 0.3, Y(0.7), '#ffd84a', 36, 6, 3);
      fx.burst(w * 0.7, Y(0.7), '#9ff0ff', 36, 6, 3);
      fx.ring(w / 2, Y(0.75), '#ffd84a', R(0.45), 7);
      fx.blink('#fff6c8', 0.25);
      s.owlT = Math.max(s.owlT, t);
    }
    if (e.kind === 'fail') fx.kick(7);
  }
  // 찰칵 (칼을 집어넣는 순간 = 갈라지는 순간)
  if (fx.memo.sheath !== undefined && t - fx.memo.sheath >= SPLIT - 1 && fx.memo.sheathDone !== fx.memo.sheath) {
    fx.memo.sheathDone = fx.memo.sheath;
    say(X(s.nx) - R(0.1) * s.face, Y(s.ny) - R(0.05), '찰칵', '#cfe8ff', 13);
  }
  for (const c of s.cuts) {
    const key = 'c' + c.t + ':' + c.seed;
    if (c.boom || t - c.t < SPLIT - 1 || fx.memo[key] !== undefined) continue;
    fx.memo[key] = 1;
    fx.burst(X(c.x), Y(c.y) - R(0.05), '#1a1028', 10, 3, 3);
    fx.burst(X(c.x), Y(c.y) - R(0.05), '#ffffff', 6, 2.5, 1.6);
  }
  fx.memo.t = t;
  ctx.drawImage(bg.paper, 0, 0, w, h);
  ctx.restore();
  // 큰 순간 띠: 먹물 붓자국 위에 'N명 베기!'
  const swB = fx.memo.swT === fx.memo.bigT, bl = swB ? 80 : 52; // 싹쓸이 띠는 더 크게 · 더 오래 · 화면 가로로
  if (fx.memo.bigT !== undefined && t - fx.memo.bigT < bl) {
    const age = t - fx.memo.bigT, n = fx.memo.bigN, sc2 = age < 6 ? 1.8 - 0.8 * (age / 6) : 1, a = Math.min(1, (bl - age) / 16);
    const bx = swB ? w / 2 : clamp(fx.memo.bigX, w * 0.3, w * 0.7), by = swB ? Y(s.ny < 0.72 ? 0.88 : 0.36) : clamp(fx.memo.bigY - R(0.2), Y(0.3), Y(1.1)); // 🧪: 싹쓸이 띠는 닌자 반대쪽에(덮지 않게)
    const txt = swB ? '싹쓸이!' : `${n}명 베기!`, size = swB ? 44 : Math.min(36, 20 + n * 3.2); // 🧪: '싹둑'은 '싹쓸이'와 헷갈려 뺌
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(bx, by);
    ctx.rotate(-0.07);
    ctx.scale(sc2, sc2);
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    const tw = ctx.measureText(txt).width, rx = swB ? w * 0.5 : tw / 2 + 18, ry = size * (swB ? 0.95 : 0.75);
    ctx.fillStyle = 'rgba(16,10,34,.88)';
    ctx.beginPath();
    for (let i = 0; i <= 18; i++) {
      const an = (i / 18) * TAU, q = 0.82 + 0.3 * hsh(i * 7 + fx.memo.bigT);
      const px = Math.cos(an) * rx * q, py = Math.sin(an) * ry * q;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const an = hsh(i + fx.memo.bigT * 3) * TAU, dd = 1.05 + hsh(i + 11) * 0.35;
      ctx.beginPath();
      ctx.arc(Math.cos(an) * rx * dd, Math.sin(an) * ry * dd, 2 + hsh(i + 5) * 4, 0, TAU);
      ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#0b0818';
    ctx.strokeText(txt, 0, 2);
    ctx.fillStyle = lin(ctx, 0, -size / 2, 0, size / 2, [0, '#fff6c2'], [0.55, '#ffd23f'], [1, '#ff9a2e']);
    ctx.fillText(txt, 0, 2);
    if (swB) {
      ctx.font = `800 ${R(0.036)}px system-ui, sans-serif`;
      ctx.fillStyle = '#cfefff';
      ctx.fillText(`${n}명 한 획 · 다음 한 획은 공짜!`, 0, size * 0.72);
    }
    if (n >= 3)
      for (let i = 0; i < 3; i++) {
        const an = t * 0.08 + (i * TAU) / 3;
        ctx.fillStyle = '#fff3b0';
        starPath(ctx, Math.cos(an) * (rx + 8), Math.sin(an) * (ry + 6), 5);
        ctx.fill();
      }
    ctx.restore();
  }

  // ═════════════ HUD ═════════════
  ctx.textBaseline = 'middle';
  const hb = R(0.085);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, 'rgba(8,10,26,.92)'], [1, 'rgba(14,18,42,.85)']);
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(255,214,110,.5)';
  ctx.fillRect(0, hb - 1.5, w, 1.5);
  {
    const cx = R(0.055), cy = hb / 2;
    ctx.fillStyle = lin(ctx, cx, cy - R(0.03), cx, cy + R(0.03), [0, '#ffe08a'], [1, '#c8902a']);
    ctx.beginPath();
    ctx.arc(cx, cy, R(0.03), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#2a1a08';
    font(0.036, 900);
    ctx.textAlign = 'center';
    if (s.stage >= STAGE_COUNT) font(0.026, 900);
    ctx.fillText(s.stage >= STAGE_COUNT ? `${2}-${s.stage - STAGE_COUNT + 1}` : String(s.stage + 1), cx, cy + 1); // M2 S1 시험 판은 '2-1'
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff6e0';
    font(0.044, 900);
    ctx.fillText(d.name, R(0.1), cy + 1);
    const nw = ctx.measureText(d.name).width;
    font(0.036, 700);
    ctx.fillStyle = '#9aa3cc';
    ctx.fillText(s.stage >= STAGE_COUNT ? ` / 2-${TRIAL.length}` : ` / ${STAGE_COUNT}`, R(0.1) + nw, cy + 2); // M2 S5 월드 2
  }
  {
    const cy = hb / 2;
    ctx.textAlign = 'right';
    font(0.042, 900);
    const st = String(s.stars), sw = ctx.measureText(st).width;
    ctx.fillStyle = '#ffd84a';
    ctx.fillText(st, w - R(0.03), cy + 1);
    starPath(ctx, w - R(0.03) - sw - R(0.025), cy, R(0.02));
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  // ✏️ M2 S3 켜자마자 1-1(GDD §7): 제목은 첫 판을 깬 뒤에 크게 한 번
  if (s.phase === 'result' && s.ok && s.stage === 0) {
    const a = Math.min(1, s.pt / 14);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    font(0.095, 900);
    ctx.lineWidth = R(0.014);
    ctx.strokeStyle = 'rgba(10,12,30,.85)';
    ctx.strokeText('느린 시간 닌자', w / 2, Y(0.6));
    ctx.fillStyle = '#fff3cf';
    ctx.fillText('느린 시간 닌자', w / 2, Y(0.6));
    font(0.04, 800);
    ctx.lineWidth = R(0.008);
    ctx.strokeText('꾹 · 긋기 · 떼기 — 다음 판으로!', w / 2, Y(0.6) + R(0.085));
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('꾹 · 긋기 · 떼기 — 다음 판으로!', w / 2, Y(0.6) + R(0.085));
    ctx.restore();
  }
  // 판 카드 (하늘 띠 안 — 놀이터를 가리지 않는다)
  {
    let head = '', sub = '', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      a = Math.min(1, age / 8);
      if (s.ok) {
        head = s.won ? '성까지 다 지나왔다!' : `${d.goal} 성공!`;
        // ✏️ S002(📋 M1 완료 기준 ②): 놓친 별은 무엇이 모자랐는지 쉬운 말로
        sub = missOf(s);
      } else (head = `으앗… ${s.why}`), (sub = '그 판만 바로 다시');
    } else if (s.pt < CARD_T && (s.stage > 0 || s.again)) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20, age / 6);
      head = `${s.again ? '다시! ' : ''}${s.stage + 1}판 · ${d.name}`;
      sub = d.card ? `NEW  ${d.card}` : d.news ? `NEW  ${d.news}` : '꾹 누르면 세상이 느려져요';
    }
    if (head) {
      const cy = Y(0.165), unroll = Math.min(1, 0.3 + age / 10);
      ctx.save();
      ctx.globalAlpha = a;
      font(0.045, 900);
      const w1 = ctx.measureText(head).width;
      font(0.036, 800);
      const w2 = sub ? ctx.measureText(sub).width : 0;
      const cw = Math.min(w - R(0.06), Math.max(w1, w2) + R(0.1)) * unroll, ch = sub ? R(0.13) : R(0.08);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      rr(ctx, w / 2 - cw / 2 + 3, cy - ch / 2 + 4, cw, ch, R(0.02));
      ctx.fill();
      ctx.fillStyle = lin(ctx, 0, cy - ch / 2, 0, cy + ch / 2, [0, '#f7eed6'], [1, '#e3d3ac']);
      rr(ctx, w / 2 - cw / 2, cy - ch / 2, cw, ch, R(0.02));
      ctx.fill();
      ctx.strokeStyle = '#7a5a2c';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#5a3a1a';
      for (const sx of [-1, 1]) {
        rr(ctx, w / 2 + (sx * cw) / 2 - R(0.012), cy - ch / 2 - R(0.01), R(0.024), ch + R(0.02), R(0.01));
        ctx.fill();
      }
      ctx.beginPath();
      ctx.rect(w / 2 - cw / 2, cy - ch / 2, cw, ch);
      ctx.clip();
      ctx.textAlign = 'center';
      font(0.045, 900);
      ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#8a5a0a' : '#9a2a20') : '#2a1a0c';
      if (s.phase === 'result' && s.ok) {
        const up = sub ? R(0.022) : 0;
        ctx.fillText(head, w / 2, cy - R(0.022) - up);
        if (sub) {
          font(0.034, 800);
          ctx.fillStyle = '#7a3a1a';
          ctx.fillText(sub, w / 2, cy + R(0.05), w - R(0.1));
        }
        for (let j = 0; j < 3; j++) {
          const ag = s.pt - (12 + j * 12);
          const sx = w / 2 + (j - 1) * R(0.07), sy = cy + R(0.03) - up;
          const pop = ag < 0 ? 0 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
          starPath(ctx, sx, sy, R(0.026) * (ag < 0 ? 1 : pop));
          ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(90,60,20,.18)';
          ctx.fill();
          ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#7a4a08' : 'rgba(90,60,20,.4)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(sx, sy, '#ffd84a', 16, 3, 2.4);
        }
      } else {
        ctx.fillText(head, w / 2, cy - (sub ? R(0.025) : 0), w - R(0.1));
        if (sub) {
          font(0.036, 800);
          ctx.fillStyle = d.news && s.phase === 'play' ? '#a2281e' : '#4a3418';
          ctx.fillText(sub, w / 2, cy + R(0.032), w - R(0.1));
        }
      }
      ctx.restore();
    }
  }
  // ═════════════ 아래 띠: 게이지 · 체력 · 별 · 안내 ═════════════
  {
    const ty = Y(GB);
    ctx.fillStyle = lin(ctx, 0, ty, 0, h, [0, 'rgba(14,18,42,.96)'], [1, 'rgba(6,8,22,.98)']);
    rr(ctx, 0, ty, w, h - ty + 4, R(0.025));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,214,110,.45)';
    ctx.fillRect(R(0.02), ty, w - R(0.04), 1.5);
    // 1줄: 모래시계 + 게이지 + 체력
    const r1 = ty + R(0.042);
    {
      const ix = R(0.04);
      ctx.fillStyle = '#9ff0ff';
      ctx.beginPath();
      ctx.moveTo(ix - R(0.014), r1 - R(0.018));
      ctx.lineTo(ix + R(0.014), r1 - R(0.018));
      ctx.lineTo(ix - R(0.014), r1 + R(0.018));
      ctx.lineTo(ix + R(0.014), r1 + R(0.018));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#e9fbff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      const gx = R(0.07), gw = w - R(0.07) - R(0.24), gh = R(0.03);
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      rr(ctx, gx, r1 - gh / 2, gw, gh, gh / 2);
      ctx.fill();
      const fr = clamp(s.g / GMAX, 0, 1), cost = prev && canCut ? Math.min(s.g, dashCost(pathLen(prev))) / GMAX : 0;
      const low = s.g < dashCost(0.3);
      ctx.fillStyle = s.free > 0 ? lin(ctx, gx, 0, gx + gw, 0, [0, '#ffb92e'], [1, '#fff3b0']) : low ? lin(ctx, gx, 0, gx + gw, 0, [0, '#ff7a6a'], [1, '#ffb36b']) : lin(ctx, gx, 0, gx + gw, 0, [0, '#3fc9ff'], [1, '#e9fbff']); // 공짜 한 획 동안 금빛
      if (fr > 0.005) {
        rr(ctx, gx, r1 - gh / 2, gw * fr, gh, gh / 2);
        ctx.fill();
      }
      if (s.free > 0 || t - (fx.memo.swT ?? -99) < 60) { // 싹쓸이: 게이지 금테(공짜 한 획 동안 계속)
        ctx.save();
        ctx.shadowColor = '#ffd84a';
        ctx.shadowBlur = 16;
        ctx.strokeStyle = '#ffd84a';
        ctx.lineWidth = 3;
        rr(ctx, gx, r1 - gh / 2, gw, gh, gh / 2);
        ctx.stroke();
        ctx.restore();
      }
      if (cost > 0) {
        ctx.fillStyle = `rgba(255,90,80,${0.55 + 0.25 * Math.sin(t * 0.4)})`;
        rr(ctx, gx + gw * (fr - cost), r1 - gh / 2, gw * cost, gh, gh / 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 1;
      for (let j = 1; j < 5; j++) {
        ctx.beginPath();
        ctx.moveTo(gx + (gw * j) / 5, r1 - gh / 2 + 2);
        ctx.lineTo(gx + (gw * j) / 5, r1 + gh / 2 - 2);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(160,220,255,.6)';
      ctx.lineWidth = 1.5;
      rr(ctx, gx, r1 - gh / 2, gw, gh, gh / 2);
      ctx.stroke();
      font(0.034, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0b1a2a';
      if (fr > 0.35) ctx.fillText('느린 시간', gx + (gw * fr) / 2, r1 + 1);
      else {
        ctx.fillStyle = '#ffb3a8';
        ctx.fillText(low ? '게이지 부족 — 여럿 베면 차요' : '느린 시간', gx + gw / 2 + R(0.04), r1 + 1, gw - R(0.02));
      }
      // 체력
      const hx0 = w - R(0.21);
      font(0.034, 800);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#dfe6ff';
      ctx.fillText('목숨', hx0, r1 + 1); // ✏️ S002(🧪): 별 칩 '꼬리 하나도 안 잃기'와 말 맞춤 — 꼬리 아이콘은 S007
      for (let j = 0; j < HP; j++) {
        const hx = hx0 + R(0.085) + j * R(0.04);
        heartPath(ctx, hx, r1, R(0.014));
        ctx.fillStyle = j < s.hp ? '#ff6a7a' : 'rgba(255,255,255,.12)';
        ctx.fill();
        ctx.strokeStyle = j < s.hp ? OUT : 'rgba(255,255,255,.3)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
    // 2줄: 별 셋 (쉬운 말)
    const r2 = ty + R(0.1);
    {
      const pr = s.phase === 'play' ? [starNow(s, d.stars[0]), starNow(s, d.stars[1])] : ['', ''];
      const labels = [d.goal, d.stars[0].label + (pr[0] && !starMet(s, d.stars[0]) && d.stars[0].k !== 'nohit' ? ` ${pr[0]}` : ''), d.stars[1].label + (pr[1] && !starMet(s, d.stars[1]) && d.stars[1].k !== 'nohit' ? ` ${pr[1]}` : '')];
      const ok = s.phase === 'result' && s.ok ? s.starOk : [false, starMet(s, d.stars[0]) && d.stars[0].k !== 'nohit', starMet(s, d.stars[1]) && (d.stars[1].k !== 'nohit' || !!d.gift3)]; // 선물 별은 처음부터 켜짐(🧪 S002)
      const bad = [false, d.stars[0].k === 'nohit' && (s.hits > 0 || s.owl), d.stars[1].k === 'nohit' && (s.hits > 0 || s.owl)]; // M2 S4: 귀띔 쓰면 ★★★ 꺼짐
      font(0.034, 800);
      const ws = labels.map((l) => ctx.measureText(l).width + R(0.07));
      const gap = R(0.012), tot = ws.reduce((a2, b2) => a2 + b2, 0) + gap * 2, scale = Math.min(1, (w - R(0.03)) / tot);
      let xx = (w - tot * scale) / 2;
      for (let j = 0; j < 3; j++) {
        const pw = ws[j] * scale;
        ctx.fillStyle = ok[j] ? 'rgba(255,216,74,.22)' : bad[j] ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.07)';
        rr(ctx, xx, r2 - R(0.025), pw, R(0.05), R(0.025));
        ctx.fill();
        ctx.strokeStyle = ok[j] ? '#ffd84a' : bad[j] ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.28)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        starPath(ctx, xx + R(0.026) * scale + 2, r2, R(0.014));
        ctx.fillStyle = ok[j] ? '#ffd84a' : bad[j] ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.55)';
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.fillStyle = ok[j] ? '#fff6dc' : bad[j] ? 'rgba(255,255,255,.35)' : '#e6ecff';
        font(0.034, 800);
        ctx.fillText(labels[j], xx + R(0.05) * scale, r2 + 1, pw - R(0.058) * scale);
        xx += pw + gap * scale;
      }
    }
    // 3줄: 안내 한 줄
    {
      let hint = d.hint;
      const fresh = s.news && s.phase === 'play' && s.t - s.news.t < NEWS_T; // ✏️ S012: 처음 알림(see)이 여기 뜬다 — 전엔 어디에도 안 그려졌다
      if (fresh) hint = s.news!.text;
      else if (s.stage === 0 && !s.firstDash && s.phase === 'play') hint = '꾹 누르면 느려져요 — 떼면 번쩍!';
      else if (moveDemo(s) && !s.down && s.phase === 'play') hint = '끝에서 꺾어 쭉!'; // 🧪 S3: 그림(꺾기)과 같은 말
      else if (s.owl && !s.down && s.phase === 'play') hint = '부엉이 길 — 손가락을 따라 그어요(★★★ 없음)'; // M2 S4
      else if (s.down && s.phase === 'play') hint = canCut ? '떼면 번쩍! 선 위의 적을 모두 베요' : '게이지가 모자라 짧게만 돌진해요';
      else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 판을 지나왔어요!' : `★ ${s.got}개! 다음 판엔 새 적이 나와요`) : '날아오는 건 비켜 서요 — 빨간 표시를 보세요';
      const first = s.stage === 0 && !s.firstDash;
      font(first ? 0.04 : 0.035, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = fresh ? '#ffb4a8' : first ? '#ffffff' : '#ffe9a8';
      ctx.fillText(hint, w / 2, ty + R(0.163), w - R(0.04));
    }
  }
  void th;
}

/** 측정용(✏️ M1 S001 funqa 봇): 돌진 선 따라가기·닿는 거리·땅 범위 — 시뮬과 같은 것을 쓴다 */
export const measureKit = { trace: (s: DashState, tx: number, ty: number) => trace(s, s.nx, s.ny, tx, ty, Math.max(HOP, reachOf(s.g)), true),
  /** S006: 한붓 획 미리 보기(시뮬과 같은 tracePath · 길이 한도) · 내릴 자리 위험(장인과 같은 danger, 틱) */
  path: (s: DashState, pts: { x: number; y: number }[]) => tracePath(s, pts, reachOf(s.g) >= HOP ? reachFor(s, pts) : HOP),
  danger: (s: DashState, x: number, y: number, skip: Set<number>) => danger(s, x, y, skip, new Set()),
  thorn: (s: DashState, P: Path) => !!thornOf(s, P.legs),
  /** M2 S1: 화면에 그려 주는 길잡이(처음 하는 사람 봇이 보고 따라 그린다) */
  guide: (s: DashState) => guideNow(s),
  /** M2 S7 🎋 장인 봇 bambooPlan(safe = 내릴 자리·덤불 거르기) */
  bamboo: (s: DashState, safe?: (P: Path) => boolean) => bambooGuideOf(s, safe),
  demo: (s: DashState) => !!guideNow(s) && demoNow(s),
  owl: (s: DashState) => s.owl,
  STROKE_STEP, reachOf, HOP, DMAX, A, X0, X1, Y0, Y1, GBASE, GPER, SLOW, ENTER };
