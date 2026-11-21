/**
 * 🧺 식탁보 빼기 (41라운드: 생각 부담 없는 실시간 전투 — 새 뼈대) — 식탁보 빼기 × 연쇄 × 도감.
 * 규칙 한 줄: 톡 한 깔개를 홱 잡아 빼면 그 위의 놈들이 전부 공중제비로 뒤집혀 날아가고, 날아간 놈들이 옆 무리와 부딪혀 또 넘어진다.
 * 뒤집힘: 나는 몬스터를 직접 치지 않는다 — 놈들이 밟고 선 바닥을 뺀다. 깔개 위에 많이 올라설수록 반갑다.
 * 무대: 한낮의 몬스터 먹자 축제 광장(3/4 시점 한 화면). 바닥엔 돗자리·식탁보·멍석이 깔려 있고 가운데엔 떡·꼬치·수박.
 *   몬스터들이 사방 문에서 들어와 먹을 것 쪽으로 몰려가 깔개 위에 올라선다(저절로 — 늘 어딘가 붐빈다).
 *   나는 오른쪽 아래 단상의 장난꾸러기 꼬마 요리사(킥킥).
 * 조작은 톡 하나: 깔개 어디를 톡 해도 그 깔개가 '홱!' 빠지고, 위의 놈들은 공중제비로 **가장 가까운 다른 무리** 쪽으로 날아간다
 *   (없으면 광장 가운데로). 깔개마다 날아갈 쪽을 은은한 점선 화살표로 늘 보여 준다 — 판단은 '어느 깔개?' 하나.
 *   깔개 밖을 톡 하면 가장 가까운 깔개. 회전 원판(2장)은 사방으로, 겹친 깔개(3장)는 겹친 곳을 톡 하면 두 장이 한꺼번에.
 *   먹을 것은 제자리에 '탁' 남고 다시 가득. 뺀 깔개는 1.5초 동안 구겨진 천 뭉치가 펴지며 다시 깔리고, 손님이 다시 모이는 데 1초쯤.
 * 날아간 놈 → 떨어지며 미끄러지고(볼링) → 서 있는 놈에 부딪히면 그놈도 넘어져 굴러간다(도미노) → 넘어진 놈은 별이 돌다 동전으로 펑.
 * 0.5초짜리 판단: 어느 깔개가 붐비고, 그 화살표 끝 무리도 붐비나 · 배고픈 놈이 요리사 쪽으로 오나.
 * 지는 것: 먹을 것이 바닥나면 그 깔개 놈들이 '배고파!' 하고 요리사 앞 매트로 몰려온다 — 매트에서 1.5초 버티면 요리사 콩, 하트 -1.
 *   (매트도 깔개라 빼면 된다.) 첫 톡 전에는 아무도 배고프지 않고, 1판은 콩 맞아도 하트를 잃지 않는다. 하트 셋을 다 잃으면 끝.
 * 판 12개(장 3 × 4판, 장 끝은 대장): 1 말랑 떡도깨비 → 2 덩치 곰(안 날아가고 그 자리에 쿵 — 둘레가 튕김) → 3 물풍선 개구리(떨어지면 펑, 물바다는 쭈욱 미끄럼)
 *   → 4 대장 배부른 돼지 왕 → 5 쟁반 너구리(쟁반이 멀리까지 슝) → 6 사뿐 고양이(제 깔개로는 안 넘어짐 — 날아온 놈에 맞아야) → 7 풍선 돼지(둥실 멀리, 쿵)
 *   → 8 대장 수박 문어 → 9 병아리 떼(한 깔개에 잔뜩) → 10 폭죽 다람쥐(떨어지면 펑!) → 11 통통 젤리(세 번 튕김) → 12 대장 도깨비 왕.
 *   장마다 새 깔개: 1장 돗자리·식탁보·멍석 · 2장 회전 원판(빼면 사방으로) · 3장 겹친 깔개(한 번에 두 장).
 * 대장: 커다란 잔칫상 위에 앉아 있다. 졸개를 날려 잔칫상에 부딪히게 하면 흔들 눈금이 차고, 꽉 차면 '잔칫상 식탁보 빼기!' — 톡 하면 대장이 데굴데굴.
 *   장마다 다른 짓: 돼지 왕은 가만히 · 수박 문어는 먹물을 뿜어 깔개 하나를 미끄럼판으로(빼면 멀리 쭉) · 도깨비 왕은 잔칫상째 광장을 돌아다닌다(상 밑 깔개를 빼면 덜컹).
 * 판 시작엔 광장이 반쯤 비어 있고 첫 3초 동안 손님이 우르르 몰려든다. 별 셋째(한 번 빼서 N마리)는 판 시작 10초 뒤부터 센다.
 * 성장(저절로): 판을 깨면 요리사 레벨 +1 — 빼는 힘(날아가는 거리)·다시 깔리는 빠르기·모자. 장 끝에 광장의 큰 물건 둘 중 하나를 톡
 *   (기름 항아리 / 고무 깔개 · 큰 부채 / 폭죽 상자). 도감 = 날려 본 몬스터.
 * 별(쉬운 말 셋): 축제 지키기 · 하트 안 잃고 · 한 번 빼서 N마리. 점수: 한 번 빼서 n번째로 넘어진 놈은 ⌈n²/4⌉점, 판 점수는 별 수로 곱해진다.
 * 큰 띠는 연쇄가 끝난 뒤 한 번: 그 판 최고 기록을 직전 띠보다 3 넘게 넘을 때(다섯부터, 띠 사이 2초)·별 셋째·대장 순간에만.
 *   나머지는 연쇄가 끝난 자리의 작은 'N마리!' 하나와 소리.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5, TAU = Math.PI * 2;
/** 광장: 화면 좌표(가로 폭 = 1). 바닥은 YS배로 눌린 3/4 시점 — 바닥 거리는 늘 dist()로 */
const YS = 0.78;
const PX0 = 0.035, PX1 = 0.965, PY0 = 0.255, PY1 = 1.265;
/** 요리사 단상(오른쪽 아래 구석, 굴러온 놈은 튕긴다) */
const CHEF_X = 0.85, CHEF_Y = 1.2, POD_R = 0.085;
/** 손이 쉬는 틱(톡 사이) · 깔개가 다시 깔리는 틱(레벨이 오르면 빨라짐) · 서 있는 손님 상한 · 화면의 적 상한 · 문으로 한 마리씩 들어오는 간격 */
const HAND_T = 36, RELAY_T = 90, CAP_UP = 20, MAX_MONS = 24, GATE_EVERY = 5;
/** 다시 깔린 뒤 손님이 다시 오기 시작하는 틱 · 판 시작 손님 몰려옴(틱) · 별 셋째를 세기 시작하는 틱 · 큰 띠 사이 · 날아갈 무리를 찾는 거리 */
const OPEN_T = 22, RUSH_T = 180, STAR_T = 600, BAND_GAP = 120, AIM_R = 0.72;
/** 날기: 기본 거리 · 떨어진 뒤 미끄러지는 빠르기 · 마찰(물바다·기름) · 넘어뜨리는 최소 빠르기 · 기절 틱 */
const FLING_L = 0.27, SKID_V = 0.012, FRIC = 0.94, FRIC_WET = 0.976, FRIC_OIL = 0.952, KNOCK_V = 0.0026, STOP_V = 0.0013, DIZZY_T = 22;
/** 배고픔: 매트에서 버티는 틱(지나면 요리사 콩) · 배고픈 놈 걷는 빠르기 */
const DOOR_T = 92, HUNGRY_SPD = 0.0036;
/** 결과 화면: 톡 받기 시작 · 저절로 넘어감 / 둘 중 하나 · 끝 */
const RES_MIN = 90, RES_AUTO = 420, PICK_MIN = 40, PICK_AUTO = 900, PICK_AFTER = 64, END_T = 210;
/** 큰 띠는 다섯부터 · 판 깸 점수 · 별 배수 · 다 깸 */
const WOW_N = 5, CLEAR_PTS = 20, STAR_MUL = [1, 1, 2, 4], WIN_PTS = 100;

export type K = 'mochi' | 'bear' | 'frog' | 'tanuki' | 'cat' | 'pig' | 'chick' | 'squirrel' | 'jelly' | 'kingpig' | 'octo' | 'goblin';
interface KDef { name: string; line: string; r: number; spd: number; slot: number; boss?: boolean }
export const KD: Record<K, KDef> = {
  mochi: { name: '말랑 떡도깨비', line: '깔개를 빼면 데굴데굴 날아가요', r: 0.036, spd: 0.0113, slot: 1 },
  bear: { name: '덩치 곰', line: '무거워서 안 날아가요. 그 자리에 쿵! 둘레가 튕겨요', r: 0.056, spd: 0.0084, slot: 1 },
  frog: { name: '물풍선 개구리', line: '떨어지면 펑! 물바다에선 쭈욱 미끄러져요', r: 0.037, spd: 0.0105, slot: 1 },
  tanuki: { name: '쟁반 너구리', line: '쟁반이 멀리까지 슝! 줄줄이 넘어뜨려요', r: 0.04, spd: 0.0102, slot: 1 },
  cat: { name: '사뿐 고양이', line: '제 깔개로는 사뿐 착지! 날아온 놈에 맞아야 넘어져요', r: 0.035, spd: 0.0120, slot: 1 },
  pig: { name: '풍선 돼지', line: '풍선 덕에 둥실 멀리 — 떨어지면 쿵!', r: 0.042, spd: 0.0091, slot: 1 },
  chick: { name: '병아리 떼', line: '작아서 한 깔개에 잔뜩! 한 번에 우르르', r: 0.025, spd: 0.0127, slot: 0.5 },
  squirrel: { name: '폭죽 다람쥐', line: '떨어지면 펑! 둘레가 다 날아가요', r: 0.035, spd: 0.0116, slot: 1 },
  jelly: { name: '통통 젤리', line: '떨어지면 통! 통! 통! 세 번 튕겨요', r: 0.037, spd: 0.0095, slot: 1 },
  kingpig: { name: '배부른 돼지 왕', line: '잔칫상에 졸개를 날려 흔들어요', r: 0.098, spd: 0, slot: 0, boss: true },
  octo: { name: '수박 문어 대감', line: '여덟 다리로 수박을 와구와구', r: 0.1, spd: 0, slot: 0, boss: true },
  goblin: { name: '도깨비 왕', line: '방망이로 뚝딱! 마지막 대장', r: 0.104, spd: 0, slot: 0, boss: true },
};
/** 도감 차례(날려 본 몬스터) */
export const DEX: K[] = ['mochi', 'bear', 'frog', 'kingpig', 'tanuki', 'cat', 'pig', 'octo', 'chick', 'squirrel', 'jelly', 'goblin'];

/** 깔개: 돗자리 · 식탁보 · 멍석(둥글고 큼) · 회전 원판 · 문 앞 매트 · 잔칫상 */
export type RT = 'mat' | 'cloth' | 'mung' | 'spin' | 'door' | 'feast';
type Food = 'tteok' | 'skewer' | 'melon' | 'dumpling' | 'jeon' | 'corn' | 'none';
/** x·y 가운데(화면) · w·h 반폭(바닥 단위, 화면 높이는 h·YS) · 겹친 짝(같은 번호끼리 겹침) */
interface RugDef { t: RT; x: number; y: number; w: number; h: number; food: Food; cap?: number; pair?: number }
const RG = (t: RT, x: number, y: number, w: number, h: number, food: Food, cap?: number, pair?: number): RugDef => ({ t, x, y, w, h, food, cap, pair });
const CAPS: Record<RT, number> = { mat: 3, cloth: 4, mung: 6, spin: 10, door: 0, feast: 6 };

interface StageDef {
  key: K; ch: number; name: string; news: string;
  /** 날려 보낼 손님 수(축제 지키기) · 별 셋째 '한 번 빼서 N마리' */
  n: number; star: number;
  /** 문으로 들어오는 손님 섞음 비율 */
  mix: [K, number][];
  rugs: RugDef[];
  /** 먹는 빠르기(한 놈이 한 틱에 먹는 양, 가득 = 1) */
  eat: number;
  /** 대장 판: 흔들 눈금 · 끝없이 오는 졸개 */
  boss?: { k: K; meter: number; minions: [K, number][] };
}
export const CHAPTERS = ['떡 잔치 마당', '바닷가 수박 축제', '눈 내린 군밤 장터'];
const DOOR = RG('door', 0.655, 1.175, 0.085, 0.06, 'none');
/** 판 12개. 깔개 자리는 판마다 조금씩 다르다 — 이웃 깔개끼리 날아가 닿을 거리(0.3~0.45)에 둔다 */
export const STAGES: StageDef[] = [
  {
    key: 'mochi', ch: 0, name: '말랑 떡도깨비', news: '깔개를 톡! 위의 놈들이 화살표 쪽 무리로 날아가요', n: 100, star: 6, eat: 0.0002,
    mix: [['mochi', 1]],
    rugs: [RG('cloth', 0.27, 0.8, 0.13, 0.1, 'tteok'), RG('mung', 0.68, 0.74, 0.15, 0.15, 'tteok'), RG('mat', 0.3, 0.42, 0.12, 0.08, 'skewer'), RG('cloth', 0.72, 0.43, 0.13, 0.095, 'jeon'), DOOR],
  },
  {
    key: 'bear', ch: 0, name: '덩치 곰', news: '곰은 안 날아가요 — 그 자리에 쿵! 둘레가 튕겨요', n: 130, star: 9, eat: 0.00045,
    mix: [['bear', 2], ['mochi', 12]],
    rugs: [RG('mung', 0.5, 0.68, 0.15, 0.15, 'tteok'), RG('cloth', 0.22, 0.43, 0.13, 0.095, 'skewer'), RG('cloth', 0.78, 0.43, 0.13, 0.095, 'jeon'), RG('mat', 0.24, 0.98, 0.12, 0.08, 'dumpling'), DOOR],
  },
  {
    key: 'frog', ch: 0, name: '물풍선 개구리', news: '떨어지면 펑! 물바다에선 쭈욱 미끄러져요', n: 145, star: 13, eat: 0.0007,
    mix: [['frog', 3], ['bear', 1], ['mochi', 10]],
    rugs: [RG('cloth', 0.25, 0.49, 0.13, 0.1, 'tteok'), RG('cloth', 0.74, 0.49, 0.13, 0.1, 'skewer'), RG('mung', 0.47, 1.0, 0.14, 0.14, 'jeon'), RG('mat', 0.15, 0.8, 0.1, 0.07, 'dumpling'), DOOR],
  },
  {
    key: 'kingpig', ch: 0, name: '배부른 돼지 왕', news: '잔칫상에 졸개를 날려 흔들어요 — 꽉 차면 잔칫상 빼기!', n: 0, star: 10, eat: 0.00055,
    mix: [], boss: { k: 'kingpig', meter: 100, minions: [['mochi', 7], ['frog', 2], ['bear', 1]] },
    rugs: [RG('feast', 0.5, 0.43, 0.25, 0.1, 'tteok'), RG('cloth', 0.2, 0.77, 0.12, 0.09, 'skewer'), RG('cloth', 0.8, 0.77, 0.12, 0.09, 'jeon'), RG('mung', 0.47, 1.0, 0.13, 0.13, 'tteok'), DOOR],
  },
  {
    key: 'tanuki', ch: 1, name: '쟁반 너구리', news: '쟁반이 멀리까지 슝! 가는 길을 줄줄이 넘어뜨려요', n: 150, star: 15, eat: 0.00065,
    mix: [['tanuki', 3], ['frog', 1], ['bear', 1], ['mochi', 9]],
    rugs: [RG('spin', 0.5, 0.7, 0.13, 0.13, 'melon'), RG('cloth', 0.2, 0.44, 0.12, 0.09, 'corn'), RG('cloth', 0.8, 0.44, 0.12, 0.09, 'skewer'), RG('mat', 0.24, 1.02, 0.11, 0.08, 'melon'), DOOR],
  },
  {
    key: 'cat', ch: 1, name: '사뿐 고양이', news: '제 깔개로는 사뿐 착지! 날아온 놈에 맞아야 넘어져요', n: 150, star: 15, eat: 0.00065,
    mix: [['cat', 3], ['tanuki', 1], ['frog', 1], ['bear', 1], ['mochi', 8]],
    rugs: [RG('mung', 0.28, 0.53, 0.14, 0.14, 'melon'), RG('spin', 0.72, 0.66, 0.12, 0.12, 'corn'), RG('cloth', 0.3, 0.99, 0.12, 0.09, 'skewer'), RG('mat', 0.76, 0.35, 0.11, 0.07, 'melon'), DOOR],
  },
  {
    key: 'pig', ch: 1, name: '풍선 돼지', news: '풍선 덕에 둥실 멀리 — 떨어지면 쿵! 둘레가 튕겨요', n: 170, star: 18, eat: 0.0007,
    mix: [['pig', 3], ['cat', 1], ['tanuki', 1], ['frog', 1], ['bear', 1], ['mochi', 8]],
    rugs: [RG('spin', 0.5, 0.53, 0.13, 0.13, 'melon'), RG('cloth', 0.18, 0.79, 0.12, 0.09, 'corn'), RG('cloth', 0.82, 0.79, 0.12, 0.09, 'skewer'), RG('mung', 0.44, 1.01, 0.13, 0.13, 'melon'), DOOR],
  },
  {
    key: 'octo', ch: 1, name: '수박 문어 대감', news: '먹물 뿜은 깔개는 미끄럼판 — 빼면 쭉 미끄러져요', n: 0, star: 13, eat: 0.00065,
    mix: [], boss: { k: 'octo', meter: 105, minions: [['mochi', 6], ['tanuki', 1], ['pig', 1], ['cat', 1], ['frog', 1]] },
    rugs: [RG('feast', 0.5, 0.43, 0.25, 0.1, 'melon'), RG('spin', 0.22, 0.79, 0.12, 0.12, 'corn'), RG('cloth', 0.78, 0.77, 0.12, 0.09, 'skewer'), RG('mat', 0.47, 1.05, 0.11, 0.075, 'melon'), DOOR],
  },
  {
    key: 'chick', ch: 2, name: '병아리 떼', news: '작아서 한 깔개에 잔뜩! 겹친 곳을 톡 하면 두 장이 한꺼번에', n: 185, star: 16, eat: 0.00065,
    mix: [['chick', 3], ['pig', 1], ['tanuki', 1], ['frog', 1], ['bear', 1], ['mochi', 7]],
    rugs: [RG('cloth', 0.29, 0.55, 0.14, 0.1, 'dumpling', 4, 1), RG('mat', 0.46, 0.64, 0.11, 0.075, 'tteok', 3, 1), RG('mung', 0.74, 0.43, 0.13, 0.13, 'corn'), RG('cloth', 0.3, 0.99, 0.12, 0.09, 'dumpling'), DOOR],
  },
  {
    key: 'squirrel', ch: 2, name: '폭죽 다람쥐', news: '떨어지면 펑! 둘레가 다 날아가요', n: 185, star: 17, eat: 0.0007,
    mix: [['squirrel', 3], ['chick', 1], ['cat', 1], ['pig', 1], ['bear', 1], ['mochi', 8]],
    rugs: [RG('mung', 0.27, 0.5, 0.13, 0.13, 'corn', 6, 2), RG('mat', 0.43, 0.63, 0.11, 0.075, 'dumpling', 3, 2), RG('cloth', 0.77, 0.48, 0.12, 0.09, 'tteok'), RG('spin', 0.47, 0.99, 0.12, 0.12, 'corn'), DOOR],
  },
  {
    key: 'jelly', ch: 2, name: '통통 젤리', news: '떨어지면 통! 통! 통! 세 번 튕기며 넘어뜨려요', n: 200, star: 19, eat: 0.00072,
    mix: [['jelly', 3], ['squirrel', 1], ['chick', 1], ['cat', 1], ['tanuki', 1], ['mochi', 8]],
    rugs: [RG('cloth', 0.25, 0.47, 0.13, 0.095, 'tteok', 4, 3), RG('mat', 0.41, 0.58, 0.11, 0.075, 'corn', 3, 3), RG('spin', 0.76, 0.5, 0.12, 0.12, 'dumpling'), RG('mung', 0.47, 0.98, 0.13, 0.13, 'corn'), DOOR],
  },
  {
    key: 'goblin', ch: 2, name: '도깨비 왕', news: '잔칫상이 돌아다녀요 — 상 밑 깔개를 빼면 덜컹!', n: 0, star: 15, eat: 0.0007,
    mix: [], boss: { k: 'goblin', meter: 140, minions: [['mochi', 5], ['chick', 1], ['squirrel', 1], ['jelly', 1], ['cat', 1], ['pig', 1]] },
    rugs: [RG('feast', 0.5, 0.49, 0.2, 0.09, 'corn'), RG('cloth', 0.22, 0.68, 0.12, 0.09, 'dumpling', 4, 4), RG('mat', 0.35, 0.79, 0.1, 0.07, 'tteok', 3, 4), RG('spin', 0.78, 0.66, 0.12, 0.12, 'corn'), RG('mat', 0.5, 0.97, 0.11, 0.075, 'dumpling'), DOOR],
  },
];
export const STAGE_COUNT = STAGES.length;
/** 장 끝 둘 중 하나(광장의 큰 물건) */
export const PERKS: { name: string; line: string }[][] = [
  [{ name: '기름 항아리', line: '미끌미끌 더 멀리 굴러요' }, { name: '고무 깔개', line: '튕겨 와서 한 번 더 홱!' }],
  [{ name: '큰 부채', line: '먼 무리까지 날아가요' }, { name: '폭죽 상자', line: '떨어지면 작게 펑!' }],
];
/** 문: 광장 밖에서 안으로 들어오는 길 (밖 x·y → 안 x·y) */
const GATES: [number, number, number, number][] = [
  [0.14, PY0 - 0.06, 0.15, PY0 + 0.05], [0.5, PY0 - 0.06, 0.5, PY0 + 0.05], [0.86, PY0 - 0.06, 0.85, PY0 + 0.05],
  [PX0 - 0.06, 0.76, PX0 + 0.06, 0.76], [PX1 + 0.06, 0.82, PX1 - 0.06, 0.82],
];

// ───────────────────────────── 상태 ─────────────────────────────
/** 몬스터 상태: 들어오는 중 · 먹는 중 · 서성 · 배고파 걷는 중 · 매트 위(요리사 노림) · 공중제비 · 데굴데굴 · 기절 · 그 자리에 쿵(곰) */
const ENTER = 0, EAT = 1, WANDER = 2, HUNGRY = 3, DOORST = 4, FLY = 5, ROLL = 6, DIZZY = 7, SLAM = 8;
const upright = (st: number) => st <= DOORST;
interface Mon {
  id: number; k: K; x: number; y: number; r: number; st: number; tm: number;
  /** 가는 곳 · 차지한 깔개·자리(-1 없음) */
  tx: number; ty: number; rug: number; spot: number;
  vx: number; vy: number;
  /** 날기: 출발 · 도착 · 걸리는 틱 · 높이 · 남은 튕김(젤리) · 착지 모양 */
  fx0: number; fy0: number; fx1: number; fy1: number; fT: number; fH: number; hops: number; soft: boolean;
  /** 넘어뜨린 빼기 번호(0 없음) · 셌나 · 대장 눈금에 넣었나 */
  src: number; counted: boolean; metered: boolean; slick: boolean;
  face: number; seed: number; born: number; bumpT: number; hurtT: number; spin: number; hungryT: number;
  dead: boolean;
}
interface Rug {
  id: number; t: RT; x: number; y: number; w: number; h: number; food: Food; cap: number; pair: number;
  /** 먹을 것 양(1 가득) · 다시 깔리기까지 남은 틱 · 빠진 쪽(각) · 마지막으로 뺀 틱 · 회전 원판 각 · 자리(가운데 기준 바닥 좌표) */
  amt: number; relay: number; relayMax: number; pullA: number; pullT: number; rot: number; spots: [number, number][];
  /** 고무 깔개: 튕겨 돌아올 틱 · 다시 손님을 받는 틱 · 먹물(미끄럼판) 끝나는 틱 */
  snap: number; seed: number; openT: number; ink: number;
}
/** 날아가는 쟁반 */
interface Tray { x: number; y: number; vx: number; vy: number; src: number; t: number; hit: number[]; metered: boolean }
/** 물바다 */
interface Puddle { x: number; y: number; r: number; t: number; life: number }
/** 사라진 몬스터(연출): 0 동전 펑 · 1 배불러 떠남 */
interface Gone { k: K; x: number; y: number; t: number; how: number; seed: number; n: number }
interface Ev { t: number; k: string; x: number; y: number; n: number; x2: number; y2: number; text: string }

export interface RugState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result' | 'pick' | 'end'; pt: number;
  /** 하트 · 지난 판까지 점수 · 이번 판 점수(별로 곱하기 전) · 모은 별 · 이번 판 별 */
  hearts: number; pts: number; sp: number; stars: number; got: number; starOk: boolean[]; dead: boolean; won: boolean;
  /** 요리사 레벨 · 장 끝에 고른 것 · 방금 고른 것 · 도감 · 이번 판에 새로 날려 본 것 */
  lv: number; perk: number[]; picked: number; dex: K[]; newDex: K[];
  mons: Mon[]; rugs: Rug[]; trays: Tray[]; puddles: Puddle[]; gone: Gone[]; events: Ev[];
  /** 문 밖 줄 · 다음 한 마리 · 문 차례 · 날려 보낸 수 · 날려 보낼 수 */
  nid: number; inbox: K[]; gateT: number; gateI: number; done: number; total: number;
  /** 손 쉼 · 빼기 번호 · 빼기마다 넘어뜨린 수 · 이 판 최고 · 요리사 콩 맞은 수 · 첫 빼기를 했나 */
  hand: number; yank: number; tally: Map<number, number>; best: number; bonks: number; started: boolean; yanks: number;
  /** 대장: 흔들 눈금 · 꽉 참(별 셋째 봉인) · 잔칫상을 뺐나 · 대장이 쓰러진 뒤 */
  meter: number; full: boolean; pulled: boolean; bossDown: number; clearT: number;
  /** 요리사 연출: 마지막 빼기 · 콩 맞은 틱 */
  chefT: number; chefHitT: number; chefA: number; lastGain: number;
  freeze: number; down: boolean; wowN: number; firstTap: number; firstBig: number; denyT: number;
  seen: Set<string>;
  banner: { head: string; sub: string; t: number } | null; spot: { id: number; t: number; label: string } | null;
  big: { text: string; t: number; n: number; yank: number; star: boolean } | null;
  /** 판 시작 틱 · 별 셋째로 세는 최고(10초 뒤) · 마지막 큰 띠 수·틱 · 아직 끝나지 않은 빼기 · 대장 짓(먹물 틱 · 잔칫상 길 각) */
  t0: number; bestStar: number; bandN: number; bandT: number; open: Open[]; inkT: number; path: number;
  /** 대장 판: 빼기마다 흔든 칸 (별 셋째 '한 번 빼서 N칸 들썩') */
  mtally: Map<number, number>;
}
/** 아직 연쇄가 이어지는 빼기: 번호 · 뺀 틱 · 마지막으로 넘어진 틱 · 수 · 마지막 자리 · 잔칫상 빼기 뒤인가 */
interface Open { id: number; t0: number; last: number; n: number; x: number; y: number; sealed: boolean }

/** 빗변 (Math.hypot 대신 제곱근으로) */
const hyp = (a: number, b: number) => Math.sqrt(a * a + b * b);
const dist = (ax: number, ay: number, bx: number, by: number) => hyp(ax - bx, (ay - by) / YS);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const ev = (s: RugState, k: string, x: number, y: number, n = 0, x2 = 0, y2 = 0, text = '') => s.events.push({ t: s.t, k, x, y, n, x2, y2, text });
const see = (s: RugState, key: string) => void s.seen.add(key);
const boss = (s: RugState) => s.mons.find((m) => KD[m.k].boss && !m.dead);
const feast = (s: RugState) => s.rugs.find((r) => r.t === 'feast');
/** 요리사 레벨이 주는 힘: 날아가는 거리 · 다시 깔리는 틱 */
export const flingL = (s: RugState) => FLING_L * (1 + 0.035 * (s.lv - 1)) * (s.perk[1] === 1 ? 1.32 : 1);
/** 날아갈 무리를 찾는 거리 (큰 부채면 더 멀리) */
const aimR = (s: RugState) => AIM_R * (s.perk[1] === 1 ? 1.3 : 1);
const relayT = (s: RugState, r: Rug) => (r.t === 'door' ? 60 : Math.max(78, RELAY_T - (s.lv - 1)));

// ───────────────────────────── 깔개 ─────────────────────────────
const round = (r: { t: RT }) => r.t === 'mung' || r.t === 'spin';
/** 깔개 안인가 (발 위치, m = 여유 배수) */
function inside(r: Rug, x: number, y: number, m = 1): boolean {
  const lx = (x - r.x) / r.w, ly = (y - r.y) / (r.h * YS);
  return round(r) ? lx * lx + ly * ly <= m * m : Math.abs(lx) <= m && Math.abs(ly) <= m;
}
/** 깔개 가장자리까지 바닥 거리(밖이면 +) — 대충 */
function edgeGap(r: Rug, x: number, y: number) {
  const lx = (x - r.x) / r.w, ly = (y - r.y) / (r.h * YS);
  const q = round(r) ? hyp(lx, ly) : Math.max(Math.abs(lx), Math.abs(ly));
  return (q - 1) * Math.min(r.w, r.h);
}
function mkRug(d: RugDef, id: number, seed: number): Rug {
  const cap = d.cap ?? CAPS[d.t];
  const spots: [number, number][] = [];
  if (d.t === 'feast') {
    // 잔칫상: 대장은 뒤 가운데, 졸개는 앞쪽에 한 줄 + 옆에 하나씩
    for (let i = 0; i < 4; i++) spots.push([(-0.75 + i * 0.5) * d.w, 0.62 * d.h]);
    spots.push([-0.86 * d.w, -0.1 * d.h], [0.86 * d.w, -0.1 * d.h]);
  } else if (cap > 0) {
    const rx = d.w * (round(d) ? 0.62 : 0.64), ry = d.h * (round(d) ? 0.62 : 0.6);
    for (let i = 0; i < cap; i++) {
      const a = -Math.PI / 2 + ((i + 0.5) * TAU) / cap;
      spots.push([Math.cos(a) * rx, Math.sin(a) * ry]);
    }
  }
  return { id, t: d.t, x: d.x, y: d.y, w: d.w, h: d.h, food: d.food, cap, pair: d.pair ?? 0, amt: 1, relay: 0, relayMax: 1, pullA: 0, pullT: -999, rot: 0, spots, snap: -1, seed, openT: 0, ink: -1 };
}
/** 자리의 화면 좌표 (회전 원판은 돈다) */
function spotXY(r: Rug, i: number): [number, number] {
  let [sx, sy] = r.spots[i];
  if (r.t === 'spin') {
    const c = Math.cos(r.rot), sn = Math.sin(r.rot);
    [sx, sy] = [sx * c - sy * sn, sx * sn + sy * c];
  }
  return [r.x + sx, r.y + sy * YS];
}
const laid = (r: Rug) => r.relay <= 0;
const occ = (s: RugState, r: Rug, i: number) => s.mons.reduce((a, m) => a + (!m.dead && m.rug === r.id && m.spot === i ? KD[m.k].slot : 0), 0);
/** 빈자리 (먹을 것이 있고, 다시 깔린 지 조금 지난 깔개 — 손님이 다시 모이는 데 1초쯤) */
function freeSpots(s: RugState, r: Rug, slot: number): number[] {
  if (r.cap <= 0 || r.amt < 0.3 || !laid(r) || s.t < r.openT) return [];
  const out: number[] = [];
  for (let i = 0; i < r.spots.length; i++) if (occ(s, r, i) + slot <= 1.001) out.push(i);
  return out;
}

// ───────────────────────────── 손님 ─────────────────────────────
function add(s: RugState, k: K, x: number, y: number, st: number): Mon {
  const d = KD[k];
  const m: Mon = {
    id: ++s.nid, k, x, y, r: d.r, st, tm: 0, tx: x, ty: y, rug: -1, spot: -1, vx: 0, vy: 0,
    fx0: x, fy0: y, fx1: x, fy1: y, fT: 1, fH: 0, hops: k === 'jelly' || k === 'cat' ? 2 : 0, soft: false, src: 0, counted: false, metered: false, slick: false,
    face: x < 0.5 ? 1 : -1, seed: Math.floor(s.rng() * 1e6), born: s.t, bumpT: -99, hurtT: -99, spin: 0, hungryT: -99, dead: false,
  };
  if (!s.seen.has('k:' + k)) see(s, 'k:' + k);
  s.mons.push(m);
  return m;
}
/** 앉을 깔개 고르기: 빈자리가 많고 가까운 곳(조금 섞어서) — 없으면 깔개 가장자리에서 서성 */
function claim(s: RugState, m: Mon) {
  const slot = KD[m.k].slot;
  let br: Rug | null = null, bi = -1, bv = -1e9;
  for (const r of s.rugs) {
    if (r.t === 'door') continue;
    const fr = freeSpots(s, r, slot);
    if (!fr.length) continue;
    const v = fr.length * 0.35 - dist(m.x, m.y, r.x, r.y) * 2.2 + s.rng() * 0.9;
    if (v > bv) {
      bv = v;
      br = r;
      // 그 깔개에서 가장 가까운 빈자리
      let bd = 1e9;
      for (const i of fr) {
        const [px, py] = spotXY(r, i), dd = dist(m.x, m.y, px, py);
        if (dd < bd) (bd = dd), (bi = i);
      }
    }
  }
  if (br) {
    m.rug = br.id;
    m.spot = bi;
    [m.tx, m.ty] = spotXY(br, bi);
    if (m.k === 'chick') m.tx += (occ(s, br, bi) > 0.6 ? 1 : -1) * 0.016;
    m.st = ENTER;
  } else {
    // 깔개 가장자리 바깥에서 서성 (날아온 놈에 맞기 좋다)
    const rugs = s.rugs.filter((r) => r.t !== 'door' && r.t !== 'feast');
    const r = rugs[Math.floor(s.rng() * rugs.length)] ?? s.rugs[0], a = s.rng() * TAU, q = 1.4 + s.rng() * 0.45;
    m.tx = clamp(r.x + Math.cos(a) * r.w * q, PX0 + 0.05, PX1 - 0.05);
    m.ty = clamp(r.y + Math.sin(a) * r.h * q * YS, PY0 + 0.05, PY1 - 0.06);
    m.rug = -1;
    m.spot = -1;
    m.st = WANDER;
  }
  m.tm = 0;
}
function free(m: Mon) {
  m.rug = -1;
  m.spot = -1;
}
/** 문으로 한 마리 */
function spawn(s: RugState) {
  const k = s.inbox.shift()!;
  // 병아리는 같은 문으로 줄줄이
  const gi = k === 'chick' && s.mons.some((o) => o.k === 'chick' && o.st === ENTER && s.t - o.born < 30) ? s.gateI : (s.gateI = (s.gateI + 1 + Math.floor(s.rng() * 2)) % GATES.length);
  const [ox, oy, ix, iy] = GATES[gi];
  const m = add(s, k, ox + (s.rng() - 0.5) * 0.04, oy + (s.rng() - 0.5) * 0.03, ENTER);
  m.tx = ix;
  m.ty = iy;
  claim(s, m);
  m.st = m.st === WANDER ? WANDER : ENTER;
}
/** 문 밖 줄 채우기 (판의 섞음 비율대로, 병아리는 셋씩) */
function refill(s: RugState) {
  const d = STAGES[s.stage], mix = d.boss ? d.boss.minions : d.mix, tot = mix.reduce((a, [, n]) => a + n, 0);
  while (s.inbox.length < 6) {
    let q = s.rng() * tot, k = mix[0][0];
    for (const [kk, n] of mix) if ((q -= n) < 0) {
      k = kk;
      break;
    }
    if (k === 'chick') s.inbox.push('chick', 'chick', 'chick');
    else s.inbox.push(k);
  }
}

function newStage(s: RugState) {
  const d = STAGES[s.stage];
  s.rugs = d.rugs.map((r, i) => mkRug(r, i, Math.floor(s.rng() * 1e6)));
  s.mons = [];
  s.trays = [];
  s.puddles = [];
  s.inbox = [];
  s.gateT = 6;
  s.done = 0;
  s.total = d.n;
  s.hand = 0;
  s.tally = new Map();
  s.best = 0;
  s.bonks = 0;
  s.started = s.stage > 0;
  s.meter = 0;
  s.full = false;
  s.pulled = false;
  s.bossDown = -1;
  s.clearT = 0;
  s.phase = 'play';
  s.pt = 0;
  s.starOk = [false, false, false];
  s.got = 0;
  s.newDex = [];
  s.big = null;
  s.t0 = s.t;
  s.bestStar = 0;
  s.bandN = 0;
  s.bandT = -999;
  s.open = [];
  s.mtally = new Map();
  s.inkT = s.t + 200;
  s.path = 0;
  if (d.boss?.k === 'goblin') moveFeast(s, 0);
  // 문 밖 줄: 새 손님이 맨 앞에 꼭 하나
  if (d.boss) {
    const f = s.rugs.find((r) => r.t === 'feast')!, b = add(s, d.boss.k, f.x, f.y - f.h * YS * 0.3, EAT);
    b.rug = f.id;
    b.spot = -1;
    b.face = 1;
  } else s.inbox.push(d.key);
  refill(s);
  // 첫 장면: 깔개가 반쯤 차 있고 (첫 판은 식탁보·멍석에 무리) 첫 3초 동안 문으로 우르르 몰려든다
  const pre = s.stage === 0 ? [4, 5, 0, 0, 0] : d.rugs.map((r) => (r.t === 'door' ? 0 : r.t === 'feast' ? 2 : Math.max(1, Math.floor((r.cap ?? CAPS[r.t]) / 3))));
  s.rugs.forEach((r, ri) => {
    for (let j = 0; j < (pre[ri] ?? 0); j++) {
      const fr = freeSpots(s, r, 1);
      if (!fr.length) break;
      refill(s);
      const k = s.inbox.shift()!, i = fr[Math.floor(s.rng() * fr.length)], [x, y] = spotXY(r, i), m = add(s, k, x, y, EAT);
      m.rug = r.id;
      m.spot = i;
      m.face = x < r.x ? 1 : -1;
    }
  });
  // 몇은 걸어 들어오는 중
  for (let j = 0; j < (s.stage === 0 ? 1 : 2); j++) {
    refill(s);
    const k = s.inbox.shift()!, [ox, oy, ix, iy] = GATES[(j * 2) % GATES.length];
    const m = add(s, k, ox + (ix - ox) * 0.9, oy + (iy - oy) * 0.9, ENTER);
    m.x += (ix - ox) * 0.6;
    m.y += (iy - oy) * 0.6;
    claim(s, m);
  }
  const first = s.stage === 0 || STAGES[s.stage - 1].ch !== d.ch;
  s.banner = { head: `${first ? CHAPTERS[d.ch] + ' · ' : ''}${s.stage + 1}판`, sub: d.news, t: s.t };
  const nw = s.mons.find((m) => m.k === d.key);
  s.spot = nw ? { id: nw.id, t: s.t, label: 'NEW ' + d.name } : { id: -1, t: s.t, label: 'NEW ' + d.name };
  see(s, 'stage' + s.stage);
  if (first) see(s, 'ch' + d.ch);
  if (s.rugs.some((r) => r.t === 'spin')) see(s, 'rug:spin');
  if (s.rugs.some((r) => r.pair)) see(s, 'rug:pair');
  ev(s, 'stage', 0.5, 0.7, s.stage);
}

// ───────────────────────────── 넘어뜨리기 ─────────────────────────────
/** 빼기 번호 src로 몇 번째 넘어졌나 — 점수 (큰 띠·별은 연쇄가 끝난 뒤 settle에서) */
function count(s: RugState, m: Mon, src: number) {
  if (m.counted || KD[m.k].boss) return;
  m.counted = true;
  m.src = src;
  const n = (s.tally.get(src) ?? 0) + 1;
  s.tally.set(src, n);
  s.done++;
  s.sp += Math.ceil((n * n) / 4);
  if (!s.dex.includes(m.k)) s.dex.push(m.k), s.newDex.push(m.k), see(s, 'dex:' + m.k);
  ev(s, 'down', m.x, m.y - m.r, n, 0, 0, m.k);
  const o = s.open.find((q) => q.id === src);
  if (o) (o.n = n), (o.last = s.t), (o.x = m.x), (o.y = m.y - m.r);
}
/** 연쇄가 끝난 빼기: 그 자리에 'N마리!' 하나 · 최고 기록 큰 띠(직전 띠보다 3 넘게, 띠 사이 2초) · 별 셋째(판 시작 10초 뒤의 빼기만) */
function settle(s: RugState) {
  if (!s.open.length) return;
  const d = STAGES[s.stage];
  for (const o of [...s.open]) {
    const busy = s.t - o.t0 < 300 && (s.mons.some((m) => m.src === o.id && (m.st === FLY || m.st === SLAM || (m.st === ROLL && hyp(m.vx, m.vy) > KNOCK_V))) || s.trays.some((q) => q.src === o.id));
    if (busy || s.t - o.last < 8 || s.t - o.t0 < 12) continue;
    s.open.splice(s.open.indexOf(o), 1);
    const n = s.tally.get(o.id) ?? o.n;
    if (n >= 2) ev(s, 'tally', o.x, o.y, n);
    if (o.sealed) continue;
    const prev = s.best;
    s.best = Math.max(s.best, n);
    // 별 셋째: 보통 판은 한 번 빼서 넘어진 수 · 대장 판은 한 번 빼서 흔든 칸
    const sv = d.boss ? s.mtally.get(o.id) ?? 0 : n;
    let star = false;
    if (o.t0 - s.t0 >= STAR_T && sv > s.bestStar) {
      star = s.bestStar < d.star && sv >= d.star;
      s.bestStar = sv;
    }
    if (star) {
      wow(s, d.boss ? `${sv}칸 들썩!` : `${n}마리 한 방!`, d.boss ? 0 : n, o.id);
      s.big!.star = true;
      ev(s, 'star3', o.x, o.y);
    } else if (n > prev && n >= WOW_N && n >= s.bandN + 3 && s.t - s.bandT >= BAND_GAP) wow(s, `${n}마리 한 방!`, n, o.id);
  }
}
function wow(s: RugState, text: string, n = 0, src = 0) {
  s.wowN++;
  if (n) (s.bandN = n), (s.bandT = s.t);
  if (s.firstBig < 0 && s.firstTap >= 0) s.firstBig = s.t;
  s.big = { text, t: s.t, n, yank: src, star: false };
  s.freeze = Math.max(s.freeze, 4);
  see(s, 'wow');
}
/** 서 있는 놈이 넘어져 굴러간다 */
function knock(s: RugState, o: Mon, vx: number, vy: number, src: number) {
  if (o.dead || !upright(o.st)) return;
  if (KD[o.k].boss) return;
  free(o);
  o.st = ROLL;
  o.tm = 0;
  const kk = o.k === 'chick' ? 1.3 : o.k === 'bear' ? 0.55 : 1;
  o.vx = vx * kk;
  o.vy = vy * kk;
  o.hurtT = s.t;
  count(s, o, src);
}
/** 둥글게 넘어뜨린다 (곰 쿵 · 물풍선 · 폭죽 · 풍선 돼지) */
function blast(s: RugState, x: number, y: number, r: number, v: number, src: number, skip: Mon | null) {
  let n = 0;
  for (const o of s.mons) {
    if (o === skip || o.dead || !upright(o.st) || KD[o.k].boss) continue;
    const d = dist(x, y, o.x, o.y);
    if (d > r + o.r * 0.6) continue;
    const a = d > 1e-4 ? Math.atan2((o.y - y) / YS, o.x - x) : hsh(o.id) * TAU, k = v * (1.1 - 0.5 * Math.min(1, d / r));
    knock(s, o, Math.cos(a) * k, Math.sin(a) * k, src);
    n++;
  }
  hitBoss(s, x, y, r, src, null);
  return n;
}
/** 대장 잔칫상 흔들기: 이 자리(반지름 r)가 잔칫상·대장에 닿으면 눈금 +1 */
function hitBoss(s: RugState, x: number, y: number, r: number, src: number, m: Mon | null) {
  const f = feast(s), b = boss(s);
  if (!f || !b || s.full || s.pulled || (m && m.metered)) return false;
  if (!inside(f, x, y, 1 + r / Math.min(f.w, f.h)) && dist(x, y, b.x, b.y) > b.r + r) return false;
  if (m) m.metered = true;
  addMeter(s, m && (m.k === 'bear' || m.k === 'pig' || m.slick) ? 2 : 1, src);
  return true;
}
function addMeter(s: RugState, add: number, src: number) {
  const f = feast(s), b = boss(s);
  if (!f || !b || s.full || s.pulled) return;
  s.meter = Math.min(STAGES[s.stage].boss!.meter, s.meter + add);
  s.mtally.set(src, (s.mtally.get(src) ?? 0) + add);
  const o = s.open.find((q) => q.id === src);
  if (o) o.last = Math.max(o.last, s.t);
  b.bumpT = s.t;
  ev(s, 'shake', b.x, b.y - b.r, s.meter);
  see(s, 'shake');
  if (s.meter >= STAGES[s.stage].boss!.meter) {
    s.full = true;
    wow(s, '잔칫상이 들썩!', 0, src);
    ev(s, 'full', f.x, f.y);
    see(s, 'full');
    s.spot = { id: b.id, t: s.t, label: '잔칫상 식탁보 빼기!' };
  }
}
/** 도깨비 왕: 잔칫상이 광장을 천천히 돌아다닌다 (대장·상 앞 졸개도 함께) */
const FEAST_PATH = { x: 0.5, y: 0.66, rx: 0.21, ry: 0.17, spd: (TAU / 60) / 15 };
function moveFeast(s: RugState, dph: number) {
  const f = feast(s);
  if (!f) return;
  s.path += dph;
  const nx = FEAST_PATH.x + Math.sin(s.path) * FEAST_PATH.rx, ny = FEAST_PATH.y - Math.cos(s.path) * FEAST_PATH.ry, dx = nx - f.x, dy = ny - f.y;
  f.x = nx;
  f.y = ny;
  for (const m of s.mons) {
    if (m.dead || m.rug !== f.id || !upright(m.st)) continue;
    if (KD[m.k].boss) (m.x += dx), (m.y += dy);
    else if (m.spot >= 0) {
      const [px, py] = spotXY(f, m.spot);
      if (m.st === EAT) (m.x = px), (m.y = py);
      else (m.tx = px), (m.ty = py);
    }
  }
}
/** 도깨비 왕 판: 이 깔개 위를 잔칫상이 지나는 중인가 */
export const underFeast = (s: RugState, r: Rug) => {
  const f = feast(s);
  return !!f && r !== f && r.t !== 'door' && STAGES[s.stage].boss?.k === 'goblin' && !s.pulled && Math.abs(r.x - f.x) < r.w + f.w * 0.85 && Math.abs(r.y - f.y) < (r.h + f.h) * YS * 0.95;
};
/** 깔개 위의 놈을 날린다 (ang = 바닥 각) */
function fling(s: RugState, m: Mon, ang: number, src: number, own: boolean, L0: number) {
  free(m);
  m.src = src;
  if (KD[m.k].boss) {
    // 잔칫상 식탁보 빼기: 대장이 공중제비로 높이 붕 → 쿵! (둘레가 다 넘어짐) → 데굴데굴 굴러가며 또 넘어뜨린다
    m.st = FLY;
    m.tm = 0;
    m.soft = false;
    m.fx0 = m.x;
    m.fy0 = m.y;
    m.fx1 = clamp(m.x + Math.cos(ang) * 0.3, PX0 + m.r, PX1 - m.r);
    m.fy1 = clamp(m.y + Math.sin(ang) * 0.3 * YS, PY0 + 0.2, PY1 - 0.15);
    m.fT = 56;
    m.fH = 0.34;
    m.vx = Math.cos(ang);
    m.vy = Math.sin(ang);
    m.hurtT = s.t;
    if (!s.dex.includes(m.k)) s.dex.push(m.k), s.newDex.push(m.k), see(s, 'dex:' + m.k);
    ev(s, 'bossroll', m.x, m.y, 0, 0, 0, m.k);
    return;
  }
  if (m.k === 'bear') {
    // 곰은 안 날아간다: 그 자리에서 들썩 → 쿵
    m.st = SLAM;
    m.tm = 0;
    count(s, m, src);
    return;
  }
  // 고양이: 제 깔개로는 두 번까지 사뿐 착지 (세 번째엔 어질)
  const soft = own && m.k === 'cat' && m.hops > 0;
  if (soft) m.hops--;
  else count(s, m, src);
  const L = L0;
  m.st = FLY;
  m.tm = 0;
  m.soft = soft;
  m.fx0 = m.x;
  m.fy0 = m.y;
  m.fx1 = clamp(m.x + Math.cos(ang) * L, PX0 + m.r, PX1 - m.r);
  m.fy1 = clamp(m.y + Math.sin(ang) * L * YS, PY0 + m.r * 0.6, PY1 - m.r * 0.5);
  m.fT = Math.round((m.k === 'pig' ? 34 : 20) + L * (m.k === 'pig' ? 40 : 34));
  m.fH = (m.k === 'pig' ? 0.2 : 0.07) + L * 0.26;
  m.vx = Math.cos(ang);
  m.vy = Math.sin(ang);
  m.face = Math.cos(ang) >= 0 ? 1 : -1;
  m.hurtT = s.t;
  if (m.k === 'tanuki' && !soft) {
    // 쟁반이 먼저 슝 — 벽까지 곧장
    s.trays.push({ x: m.x, y: m.y - 0.02, vx: Math.cos(ang) * 0.019, vy: Math.sin(ang) * 0.019, src, t: s.t, hit: [], metered: false });
    if (s.trays.length > 4) s.trays.shift();
    ev(s, 'tray', m.x, m.y, 0, ang);
    see(s, 'tray');
  }
}
/** 이 깔개를 빼면 위의 놈들이 날아갈 곳: 가장 가까운 다른 무리(다른 깔개 위 둘 이상 · 깔개 밖 셋 이상 모인 곳 · 대장 잔칫상) — 없으면 광장 가운데 */
export function targetOf(s: RugState, r: Rug): { x: number; y: number; n: number } {
  const ups = s.mons.filter((m) => !m.dead && upright(m.st) && !inside(r, m.x, m.y, 1.05));
  let bx = 0.5, by = 0.72, bn = 0, bd = 1e9;
  const take = (x: number, y: number, n: number) => {
    const d = dist(r.x, r.y, x, y);
    if (d < Math.min(r.w, r.h) * 0.9 || d > aimR(s)) return;
    if (d < bd) (bd = d), (bx = x), (by = y), (bn = n);
  };
  const used = new Set<number>();
  for (const q of s.rugs) {
    if (q === r) continue;
    let n = 0, sx = 0, sy = 0;
    for (const m of ups) {
      if (KD[m.k].boss || !inside(q, m.x, m.y, 1.05)) continue;
      used.add(m.id);
      n++;
      sx += m.x;
      sy += m.y;
    }
    if (n >= 2) take(sx / n, sy / n, n);
  }
  const b = boss(s), f = feast(s);
  if (b && f && !s.pulled && r !== f && upright(b.st)) take(b.x, b.y + b.r * 0.3, 6);
  // 깔개 밖에 셋 이상 모인 곳
  const loose = ups.filter((m) => !used.has(m.id) && !KD[m.k].boss);
  for (const m of loose) {
    let n = 0, sx = 0, sy = 0;
    for (const o of loose) if (dist(m.x, m.y, o.x, o.y) < 0.1) (n++, (sx += o.x), (sy += o.y));
    if (n >= 3) take(sx / n, sy / n, n);
  }
  if (bn === 0 && dist(r.x, r.y, bx, by) < 0.12) {
    // 가운데 깔개인데 무리가 없다: 요리사 반대쪽으로
    const a = Math.atan2((r.y - CHEF_Y) / YS, r.x - CHEF_X);
    return { x: r.x + Math.cos(a) * 0.3, y: r.y + Math.sin(a) * 0.3 * YS, n: 0 };
  }
  return { x: bx, y: by, n: bn };
}
/** 깔개 위(발이 깔개 안)에 서 있는 놈들 */
function riders(s: RugState, r: Rug): Mon[] {
  return s.mons.filter((m) => !m.dead && upright(m.st) && (KD[m.k].boss ? r.t === 'feast' && s.full && m.rug === r.id : inside(r, m.x, m.y, 1.05)));
}
/** 톡 한 곳의 깔개들: 겹친 곳은 두 장 · 깔개 밖은 가장 가까운 깔개 */
export function rugsAt(s: RugState, x: number, y: number): { rugs: Rug[]; deny: Rug | null } {
  const can = (r: Rug) => laid(r) && (r.t !== 'feast' || (s.full && !s.pulled));
  const hit = (r: Rug, m: number) => inside(r, x, y, m) || inside(r, x, y + 0.045, m);
  const strict = s.rugs.filter((r) => hit(r, 1));
  const ok = strict.filter(can);
  if (ok.length >= 2) {
    const p = ok.find((r) => r.pair);
    if (p) return { rugs: ok.filter((r) => r.pair === p.pair), deny: null };
  }
  const nR = (r: Rug) => riders(s, r).length;
  if (ok.length) return { rugs: [ok.reduce((a, b) => (nR(b) > nR(a) ? b : a))], deny: null };
  if (strict.length) return { rugs: [], deny: strict[0] };
  const near = s.rugs.filter((r) => can(r) && hit(r, 1.35));
  if (near.length) return { rugs: [near.reduce((a, b) => (nR(b) > nR(a) ? b : a))], deny: null };
  let best: Rug | null = null, bd = 1e9;
  for (const r of s.rugs) {
    if (!can(r) || !nR(r)) continue;
    const d = edgeGap(r, x, y);
    if (d < bd) (bd = d), (best = r);
  }
  return { rugs: best ? [best] : [], deny: null };
}
/** 깔개를 홱! */
function yank(s: RugState, set: Rug[]) {
  const id = ++s.yank;
  s.tally.set(id, 0);
  s.hand = HAND_T;
  s.yanks++;
  s.chefT = s.t;
  if (!s.started) s.started = true;
  let total = 0;
  for (const r of set) {
    const spin = r.t === 'spin', tg = targetOf(s, r), a = Math.atan2((tg.y - r.y) / YS, tg.x - r.x), rs = riders(s, r), slick = s.t < r.ink;
    s.chefA = a;
    s.open.push({ id, t0: s.t, last: s.t, n: 0, x: r.x, y: r.y, sealed: s.full });
    if (underFeast(s, r)) addMeter(s, 3 + Math.min(4, rs.length), id), ev(s, 'jolt', r.x, r.y), see(s, 'jolt');
    if (slick) (r.ink = -1), ev(s, 'inkslide', r.x, r.y), see(s, 'inkslide');
    r.relay = r.relayMax = relayT(s, r) + (r.t === 'feast' ? 999 : 0);
    r.pullA = spin ? hsh(id) * TAU : a + Math.PI;
    r.pullT = s.t;
    r.amt = 1;
    if (s.perk[0] === 2 && r.t !== 'feast') r.snap = s.t + 16;
    for (const m of rs) {
      m.slick = slick;
      if (spin) {
        fling(s, m, Math.atan2((m.y - r.y) / YS, m.x - r.x) + 0.25, id, true, flingL(s) * 0.62 * (0.9 + 0.2 * hsh(m.id + id)));
        continue;
      }
      // 무리 한가운데보다 조금 앞에 떨어지도록 (떨어져 미끄러지며 무리를 훑는다)
      const lx = tg.x + (m.x - r.x) * 0.35 - Math.cos(a) * 0.03, ly = tg.y + (m.y - r.y) * 0.35 - Math.sin(a) * 0.03 * YS;
      const ma = KD[m.k].boss ? a : Math.atan2((ly - m.y) / YS, lx - m.x), L = clamp(dist(m.x, m.y, lx, ly), 0.12, 0.62);
      fling(s, m, ma, id, true, L);
    }
    total += rs.length;
    // 이 깔개로 걸어오던 놈들은 다른 데를 찾는다
    for (const m of s.mons) if (!m.dead && m.st === ENTER && m.rug === r.id) claim(s, m);
    ev(s, 'yank', r.x, r.y, rs.length, a, spin ? 1 : 0, r.t);
    see(s, 'rug:' + r.t);
    if (r.t === 'feast') {
      s.pulled = true;
      wow(s, '잔칫상 식탁보 빼기!', 0, id);
      ev(s, 'feastpull', r.x, r.y);
      see(s, 'feastpull');
    }
  }
  if (set.length > 1) ev(s, 'double', set[0].x, set[0].y), see(s, 'double');
  if (!total) ev(s, 'whiff', set[0].x, set[0].y);
}
function onTap(s: RugState, x: number, y: number) {
  if (s.firstTap < 0) s.firstTap = s.t;
  if (s.hand > 0) return void ((s.denyT = s.t), ev(s, 'deny', x, y));
  // 첫 판 첫 톡: 어디를 눌러도 식탁보가 멍석 무리 쪽으로 (이 게임에서 가장 시원한 순간)
  if (s.stage === 0 && s.yanks === 0) {
    const r = s.rugs[0];
    ev(s, 'tap', r.x, r.y);
    yank(s, [r]);
    return;
  }
  const { rugs, deny } = rugsAt(s, x, y);
  if (!rugs.length) return void (deny ? ((s.denyT = s.t), ev(s, 'deny', x, y, 1)) : ev(s, 'miss', x, y));
  ev(s, 'tap', x, y);
  yank(s, rugs);
}

// ───────────────────────────── 한 틱 ─────────────────────────────
function land(s: RugState, m: Mon) {
  m.x = m.fx1;
  m.y = m.fy1;
  const c = m.vx, sn = m.vy;
  if (KD[m.k].boss) {
    // 대장 착지: 쿵!! 둘레가 다 넘어지고 데굴데굴
    blast(s, m.x, m.y, 0.26, 0.012, m.src, m);
    ev(s, 'bossland', m.x, m.y, 0, 0, 0, m.k);
    m.st = ROLL;
    m.tm = 0;
    m.vx = c * 0.013;
    m.vy = sn * 0.013;
    return;
  }
  if (m.soft) {
    // 고양이: 사뿐 착지 — 다시 먹을 데를 찾는다
    m.soft = false;
    m.st = WANDER;
    m.tm = 0;
    ev(s, 'catland', m.x, m.y - m.r);
    see(s, 'catland');
    claim(s, m);
    return;
  }
  const fire = s.perk[1] === 2 ? 0.038 : 0;
  ev(s, 'land', m.x, m.y, 0, 0, 0, m.k);
  hitBoss(s, m.x, m.y, m.r, m.src, m);
  if (m.k === 'frog') {
    blast(s, m.x, m.y, 0.11, 0.0088, m.src, m);
    s.puddles.push({ x: m.x, y: m.y, r: 0.12, t: s.t, life: 420 });
    if (s.puddles.length > 4) s.puddles.shift();
    ev(s, 'splash', m.x, m.y);
    see(s, 'puddle');
  } else if (m.k === 'squirrel') {
    blast(s, m.x, m.y, 0.17, 0.011, m.src, m);
    ev(s, 'boom', m.x, m.y);
    see(s, 'boom');
  } else if (m.k === 'pig') {
    blast(s, m.x, m.y, 0.125, 0.0092, m.src, m);
    ev(s, 'thump', m.x, m.y);
  } else if (fire) {
    blast(s, m.x, m.y, m.r + fire + 0.02, 0.0075, m.src, m);
    ev(s, 'firecracker', m.x, m.y);
  }
  // 떨어진 자리의 놈들이 넘어진다
  for (const o of s.mons) {
    if (o === m || o.dead || !upright(o.st) || KD[o.k].boss || o.k === 'bear') continue;
    const d = dist(m.x, m.y, o.x, o.y);
    if (d > m.r + o.r + 0.012) continue;
    const a = d > 1e-4 ? Math.atan2((o.y - m.y) / YS, o.x - m.x) : Math.atan2(sn, c);
    knock(s, o, c * 0.0075 + Math.cos(a) * 0.004, sn * 0.0075 + Math.sin(a) * 0.004, m.src);
  }
  if (m.k === 'jelly' && m.hops > 0) {
    // 통! 한 번 더 튕긴다 (반 거리)
    m.hops--;
    const L = flingL(s) * 0.48;
    m.tm = 0;
    m.fx0 = m.x;
    m.fy0 = m.y;
    m.fx1 = clamp(m.x + c * L, PX0 + m.r, PX1 - m.r);
    m.fy1 = clamp(m.y + sn * L * YS, PY0 + m.r * 0.6, PY1 - m.r * 0.5);
    m.fT = 16 + Math.round(L * 30);
    m.fH = 0.05 + L * 0.3;
    ev(s, 'bounce', m.x, m.y, 2 - m.hops);
    see(s, 'bounce');
    return;
  }
  m.st = ROLL;
  m.tm = 0;
  const sk = (m.k === 'pig' || m.k === 'squirrel' ? 0.55 : 1) * (m.slick ? 1.9 : 1) * (1 + 0.03 * (s.lv - 1));
  m.vx = c * SKID_V * sk;
  m.vy = sn * SKID_V * sk;
}
const wet = (s: RugState, x: number, y: number) => s.puddles.some((p) => dist(p.x, p.y, x, y) < p.r);
function wall(s: RugState, m: Mon) {
  let hit = false;
  const sp = hyp(m.vx, m.vy);
  if (m.x < PX0 + m.r) (m.x = PX0 + m.r), (m.vx = Math.abs(m.vx) * 0.55), (hit = true);
  if (m.x > PX1 - m.r) (m.x = PX1 - m.r), (m.vx = -Math.abs(m.vx) * 0.55), (hit = true);
  if (m.y < PY0 + m.r * 0.6) (m.y = PY0 + m.r * 0.6), (m.vy = Math.abs(m.vy) * 0.55), (hit = true);
  if (m.y > PY1 - m.r * 0.5) (m.y = PY1 - m.r * 0.5), (m.vy = -Math.abs(m.vy) * 0.55), (hit = true);
  const pd = dist(m.x, m.y, CHEF_X, CHEF_Y - 0.02);
  if (pd < POD_R + m.r) {
    const nx = (m.x - CHEF_X) / pd, ny = (m.y - CHEF_Y + 0.02) / YS / pd, vn = m.vx * nx + m.vy * ny;
    m.x = CHEF_X + nx * (POD_R + m.r);
    m.y = CHEF_Y - 0.02 + ny * (POD_R + m.r) * YS;
    if (vn < 0) (m.vx -= 1.6 * vn * nx), (m.vy -= 1.6 * vn * ny);
    hit = true;
  }
  if (hit && sp > 0.004 && s.t - m.bumpT > 8) (m.bumpT = s.t), ev(s, 'wall', m.x, m.y, 0, 0, 0, m.k);
}
/** 굴러가는 놈 · 날아가는 쟁반이 서 있는 놈을 넘어뜨린다 */
function physics(s: RugState) {
  const ups = s.mons.filter((o) => !o.dead && upright(o.st));
  const f = feast(s);
  for (const m of s.mons) {
    if (m.dead || m.st !== ROLL) continue;
    const isBoss = !!KD[m.k].boss;
    const fr = isBoss ? 0.977 : m.slick || wet(s, m.x, m.y) ? FRIC_WET : s.perk[0] === 1 ? FRIC_OIL : FRIC;
    m.x += m.vx;
    m.y += m.vy * YS;
    m.vx *= fr;
    m.vy *= fr;
    m.spin += hyp(m.vx, m.vy) * 9 * (m.vx >= 0 ? 1 : -1);
    wall(s, m);
    // 잔칫상에 부딪힘 (대장 판, 빼기 전): 튕겨 나오며 눈금
    if (f && !s.pulled && !isBoss && inside(f, m.x, m.y, 1.02)) {
      hitBoss(s, m.x, m.y, m.r, m.src, m);
      const lx = (m.x - f.x) / f.w, ly = (m.y - f.y) / (f.h * YS);
      if (Math.abs(lx) > Math.abs(ly)) (m.x = f.x + Math.sign(lx) * f.w * 1.03), (m.vx = Math.sign(lx) * Math.abs(m.vx) * 0.6);
      else (m.y = f.y + Math.sign(ly) * f.h * YS * 1.03), (m.vy = Math.sign(ly) * Math.abs(m.vy) * 0.6);
    }
    const sp = hyp(m.vx, m.vy);
    for (const o of ups) {
      if (o === m || o.dead || !upright(o.st)) continue;
      const d = dist(m.x, m.y, o.x, o.y), rr = m.r + o.r;
      if (d >= rr) continue;
      const nx = d > 1e-5 ? (o.x - m.x) / d : 1, ny = d > 1e-5 ? (o.y - m.y) / YS / d : 0;
      if (isBoss) {
        knock(s, o, m.vx * 0.7 + nx * 0.006, m.vy * 0.7 + ny * 0.006, m.src);
        continue;
      }
      if (o.k === 'bear' || KD[o.k].boss) {
        // 무거운 놈에 맞으면 튕겨 나온다
        const vn = m.vx * nx + m.vy * ny;
        if (vn > 0) (m.vx -= 1.7 * vn * nx), (m.vy -= 1.7 * vn * ny);
        m.x = o.x - nx * rr * 1.01;
        m.y = o.y - ny * rr * 1.01 * YS;
        if (s.t - o.bumpT > 6) (o.bumpT = s.t), ev(s, 'bonk', o.x, o.y - o.r, 0, 0, 0, o.k);
        if (KD[o.k].boss) hitBoss(s, m.x, m.y, m.r, m.src, m);
        continue;
      }
      if (sp >= KNOCK_V) {
        const ux = m.vx / sp, uy = m.vy / sp, k = sp * 0.86;
        knock(s, o, (ux * 0.55 + nx * 0.45) * k, (uy * 0.55 + ny * 0.45) * k, m.src);
        const vn = m.vx * nx + m.vy * ny;
        m.vx = (m.vx - vn * nx * 0.5) * 0.56;
        m.vy = (m.vy - vn * ny * 0.5) * 0.56;
        ev(s, 'knock', o.x, o.y - o.r * 0.5, 0, 0, 0, o.k);
      } else {
        // 살살 밀기
        o.x += nx * (rr - d) * 0.5;
        o.y += ny * (rr - d) * 0.5 * YS;
      }
    }
    if (hyp(m.vx, m.vy) < (isBoss ? 0.002 : STOP_V)) (m.st = DIZZY), (m.tm = 0), ev(s, 'dizzy', m.x, m.y - m.r, 0, 0, 0, m.k);
  }
  // 쟁반: 벽까지 곧장, 가는 길의 놈을 줄줄이
  for (const q of s.trays) {
    q.x += q.vx;
    q.y += q.vy * YS;
    for (const o of ups) {
      if (o.dead || !upright(o.st) || q.hit.includes(o.id) || KD[o.k].boss || o.k === 'bear') continue;
      if (dist(q.x, q.y, o.x, o.y) < o.r + 0.034) {
        q.hit.push(o.id);
        const side = (q.hit.length % 2 ? 1 : -1) * 0.004;
        knock(s, o, q.vx * 0.38 - (q.vy / 0.019) * side, q.vy * 0.38 + (q.vx / 0.019) * side, q.src);
        ev(s, 'trayhit', o.x, o.y - o.r, q.hit.length);
      }
    }
    if (!q.metered && hitBoss(s, q.x, q.y, 0.03, q.src, null)) q.metered = true;
  }
  const gone = s.trays.filter((q) => q.x < PX0 || q.x > PX1 || q.y < PY0 || q.y > PY1 || s.t - q.t > 90);
  for (const q of gone) ev(s, 'trayend', clamp(q.x, PX0, PX1), clamp(q.y, PY0, PY1));
  if (gone.length) s.trays = s.trays.filter((q) => !gone.includes(q));
}
/** 서 있는 놈들 걷기 · 먹기 · 배고픔 */
function monStep(s: RugState, m: Mon) {
  m.tm++;
  if (m.st === FLY) {
    if (m.tm >= m.fT) land(s, m);
    return;
  }
  if (m.st === SLAM) {
    if (m.tm === 10) blast(s, m.x, m.y, 0.17, 0.0095, m.src, m), ev(s, 'slam', m.x, m.y, 0, 0, 0, m.k), see(s, 'slam');
    if (m.tm >= 18) (m.st = DIZZY), (m.tm = 0);
    return;
  }
  if (m.st === DIZZY) {
    if (m.tm >= (KD[m.k].boss ? 110 : DIZZY_T)) pop(s, m);
    return;
  }
  if (m.st === ROLL) return;
  if (KD[m.k].boss) {
    m.face = Math.sin(s.t * 0.01 + m.seed) > 0 ? 1 : -1;
    return;
  }
  // 회전 원판 위: 함께 돈다
  if (m.st === EAT && m.rug >= 0) {
    const r = s.rugs[m.rug];
    if (r && r.t === 'spin' && m.spot >= 0) [m.x, m.y] = spotXY(r, m.spot), (m.face = m.x < r.x ? 1 : -1);
    return;
  }
  if (m.st === DOORST) {
    if (m.tm >= DOOR_T) bonk(s, m);
    return;
  }
  // 걷기
  const spd = m.st === HUNGRY ? HUNGRY_SPD : m.st === WANDER ? KD[m.k].spd * 0.5 : KD[m.k].spd;
  const dx = m.tx - m.x, dy = (m.ty - m.y) / YS, dd = hyp(dx, dy);
  if (dd > spd) {
    m.x += (dx / dd) * spd;
    m.y += (dy / dd) * spd * YS;
    if (Math.abs(dx) > 0.004) m.face = dx > 0 ? 1 : -1;
    return;
  }
  m.x = m.tx;
  m.y = m.ty;
  if (m.st === ENTER) {
    const r = m.rug >= 0 ? s.rugs[m.rug] : null;
    if (r && m.spot >= 0) {
      m.st = EAT;
      m.tm = 0;
      m.face = m.x < r.x ? 1 : -1;
      ev(s, 'sit', m.x, m.y, 0, 0, 0, m.k);
    } else claim(s, m);
  } else if (m.st === HUNGRY) {
    m.st = DOORST;
    m.tm = 0;
    m.face = 1;
    ev(s, 'door', m.x, m.y - m.r);
    see(s, 'door');
  } else if (m.st === WANDER && m.tm > 8 + (m.seed % 12)) {
    claim(s, m);
    if (m.st === WANDER) (m.tm = 0), (m.tx = clamp(m.x + (s.rng() - 0.5) * 0.06, PX0 + 0.04, PX1 - 0.04)), (m.ty = clamp(m.y + (s.rng() - 0.5) * 0.04, PY0 + 0.04, PY1 - 0.05));
  }
}
/** 매트에서 버틴 배고픈 놈이 요리사를 콩 — 매트 위 무리가 한꺼번에 '냠냠' 하고 떠난다 (한 번 몰려오면 하트 하나) */
function bonk(s: RugState, m: Mon) {
  s.bonks++;
  s.chefHitT = s.t;
  for (const o of s.mons) {
    if (o.dead || (o !== m && o.st !== DOORST)) continue;
    o.dead = true;
    s.gone.push({ k: o.k, x: o.x, y: o.y, t: s.t, how: 1, seed: o.seed, n: 0 });
  }
  ev(s, 'bonk', CHEF_X, CHEF_Y - 0.15, s.stage > 0 ? 1 : 0, 0, 0, m.k);
  see(s, 'chefbonk');
  if (s.stage > 0) {
    s.hearts--;
    ev(s, 'heart', CHEF_X, CHEF_Y - 0.2);
    if (s.hearts <= 0) (s.phase = 'end'), (s.pt = 0), ev(s, 'end', 0.5, 0.7, 0);
  }
}
/** 기절이 끝나면 동전으로 펑 */
function pop(s: RugState, m: Mon) {
  m.dead = true;
  s.gone.push({ k: m.k, x: m.x, y: m.y, t: s.t, how: 0, seed: m.seed, n: s.tally.get(m.src) ?? 0 });
  if (s.gone.length > 30) s.gone.shift();
  ev(s, 'coin', m.x, m.y - m.r, KD[m.k].boss ? 9 : 1, 0, 0, m.k);
  if (KD[m.k].boss) {
    // 대장이 쓰러지면 남은 졸개들이 털썩
    s.bossDown = s.t;
    s.inbox = [];
    wow(s, `${KD[m.k].name} 데굴데굴!`, 0, m.src);
    for (const o of s.mons) if (!o.dead && upright(o.st)) knock(s, o, (o.x - m.x) * 0.02, (o.y - m.y) * 0.02, m.src);
    ev(s, 'bossdown', m.x, m.y, 0, 0, 0, m.k);
    see(s, 'bossdown');
  }
}
/** 먹을 것이 줄고, 바닥나면 그 깔개 놈들이 배고파서 요리사에게 */
function hunger(s: RugState, d: StageDef) {
  if (!s.started) return;
  const door = s.rugs.find((r) => r.t === 'door');
  for (const r of s.rugs) {
    if (r.t === 'door') continue;
    const eaters = s.mons.filter((m) => !m.dead && m.st === EAT && m.rug === r.id && !KD[m.k].boss);
    if (!eaters.length) {
      r.amt = Math.min(1, r.amt + 0.003);
      continue;
    }
    r.amt -= eaters.reduce((a, m) => a + KD[m.k].slot, 0) * d.eat;
    if (r.amt > 0) continue;
    r.amt = 0;
    ev(s, 'foodout', r.x, r.y - r.h * YS, eaters.length);
    for (const m of eaters) {
      free(m);
      m.st = HUNGRY;
      m.tm = 0;
      m.hungryT = s.t;
      if (door) (m.tx = door.x + (hsh(m.id) - 0.5) * door.w * 1.1), (m.ty = door.y + (hsh(m.id + 3) - 0.5) * door.h * YS * 0.9);
      ev(s, 'hungry', m.x, m.y - m.r * 2.2, 0, 0, 0, m.k);
    }
    see(s, 'hungry');
  }
}
function playStep(s: RugState) {
  const d = STAGES[s.stage];
  if (s.hand > 0) s.hand--;
  for (const r of s.rugs) {
    if (r.relay > 0 && --r.relay === 0) (r.openT = s.t + OPEN_T), ev(s, 'relay', r.x, r.y, 0, 0, 0, r.t);
    if (r.t === 'spin' && laid(r)) r.rot += 0.011;
    if (r.snap === s.t) {
      // 고무 깔개: 튕겨 돌아오며 한 번 더 홱 (반대쪽으로)
      const rs = riders(s, r);
      for (const m of rs) fling(s, m, r.pullA, s.yank, false, flingL(s));
      ev(s, 'snap', r.x, r.y, rs.length, r.pullA);
      see(s, 'snap');
    }
  }
  // 대장마다 다른 짓
  if (d.boss?.k === 'goblin' && !s.pulled) moveFeast(s, FEAST_PATH.spd);
  if (d.boss?.k === 'octo' && !s.full && !s.pulled && s.t >= s.inkT) {
    // 수박 문어: 먹물을 뿜어 깔개 하나를 미끄럼판으로 (가장 붐비는 깔개)
    s.inkT = s.t + 330;
    const b = boss(s);
    let best: Rug | null = null, bn = -1;
    for (const r of s.rugs) {
      if (r.t === 'door' || r.t === 'feast' || s.t < r.ink) continue;
      const n = riders(s, r).length + hsh(r.id + s.t) * 0.5;
      if (n > bn) (bn = n), (best = r);
    }
    if (best && b) (best.ink = s.t + 540), ev(s, 'ink', b.x, b.y - b.r, 0, best.x, best.y), see(s, 'ink');
  }
  for (const m of s.mons) if (!m.dead) monStep(s, m);
  physics(s);
  settle(s);
  hunger(s, d);
  if (s.mons.some((m) => m.dead)) s.mons = s.mons.filter((m) => !m.dead);
  if (s.puddles.length) s.puddles = s.puddles.filter((p) => s.t - p.t < p.life);
  // 문으로 손님: 서 있는 손님이 줄면 바로바로 (대장 판은 대장이 쓰러질 때까지 끝없이)
  const ending = d.boss ? s.bossDown >= 0 : s.done >= s.total;
  if (!ending) {
    refill(s);
    const ups = s.mons.reduce((a, m) => a + (upright(m.st) ? 1 : 0), 0);
    if (--s.gateT <= 0 && ups < CAP_UP && s.mons.length < MAX_MONS) (spawn(s), (s.gateT = s.t - s.t0 < RUSH_T ? 12 : GATE_EVERY));
  }
  if (s.phase !== 'play') return;
  // 다 날려 보냈다: 굴러가던 놈들이 다 멈추면 판 깸
  if (ending && !s.mons.some((m) => !upright(m.st))) {
    if (++s.clearT >= 30) clearStage(s);
  } else s.clearT = 0;
}

// ───────────────────────────── 판 흐름 ─────────────────────────────
function clearStage(s: RugState) {
  const d = STAGES[s.stage];
  s.phase = 'result';
  s.pt = 0;
  s.starOk = [true, s.bonks === 0, s.bestStar >= d.star];
  s.got = s.starOk.filter(Boolean).length;
  s.stars += s.got;
  const gain = (s.sp + CLEAR_PTS) * STAR_MUL[s.got];
  s.pts += gain;
  s.sp = 0;
  s.lastGain = gain;
  s.lv++;
  see(s, 'lv' + s.lv);
  s.spot = null;
  if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * 30);
  ev(s, 'clear', 0.5, 0.7, s.got);
}
function advance(s: RugState) {
  const d = STAGES[s.stage];
  if (s.won) return void ((s.phase = 'end'), (s.pt = 0), ev(s, 'end', 0.5, 0.7, 1));
  if (d.boss && d.ch < PERKS.length && !s.perk[d.ch]) return void ((s.phase = 'pick'), (s.pt = 0), (s.picked = -1), see(s, 'pick' + d.ch), ev(s, 'pickopen', 0.5, 0.7));
  s.stage++;
  newStage(s);
}

const game: GameDef<RugState> & { wows(s: RugState): number } = {
  id: 'rugpull',
  name: '🧺 식탁보 빼기',
  genes: ['rugpull', 'chain', 'collect'],
  twist: '몬스터를 직접 치지 않고 놈들이 밟고 선 깔개를 홱 뺀다 — 공중제비로 날아간 놈들이 옆 무리를 도미노처럼 넘어뜨려서, 깔개에 많이 올라설수록 반갑다',
  rules: [
    '깔개를 톡! 홱 빠지면서 위의 놈들이 화살표 쪽 무리로 날아가요.',
    '날아간 놈에 부딪힌 놈도 넘어져요 — 붐비는 깔개를 골라요!',
    '먹을 게 바닥난 놈은 요리사 앞 매트로 와요. 매트도 빼면 돼요.',
  ],
  controls: 'touch',
  hint: '깔개를 톡 — 위의 놈들이 화살표 쪽 무리로 날아가요 / 화살표 키로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '한낮의 몬스터 먹자 축제 광장 — 스티커 그림책',
    mood: '청사초롱과 만국기가 걸린 밝은 광장에 알록달록 돗자리·식탁보·멍석이 깔려 있고, 동글동글한 몬스터들이 떡과 수박을 먹으러 몰려든다. 꼬마 요리사가 깔개를 홱 빼면 몬스터들이 공중제비로 날아가 도미노처럼 넘어진다.',
    palette: { bg: '#9fdcf5', ink: '#3b2a20', muted: '#8a7a66', accent: '#ff8a3d', hot: '#ff4d4d', soft: '#f6e7c1' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.hearts,
  cleared: (s) => (s.phase === 'result' ? { stage: s.stage, got: s.got, of: 3 } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, hearts: 3, pts: 0, sp: 0, stars: 0, got: 0, starOk: [false, false, false], dead: false, won: false,
      lv: 1, perk: [0, 0], picked: -1, dex: [], newDex: [], mons: [], rugs: [], trays: [], puddles: [], gone: [], events: [],
      nid: 0, inbox: [], gateT: 0, gateI: 0, done: 0, total: 0, hand: 0, yank: 0, tally: new Map(), best: 0, bonks: 0, started: false, yanks: 0,
      meter: 0, full: false, pulled: false, bossDown: -1, clearT: 0, chefT: -99, chefHitT: -99, chefA: 0, lastGain: 0, t0: 0, bestStar: 0, bandN: 0, bandT: -999, open: [], inkT: 0, path: 0, mtally: new Map(),
      freeze: 0, down: false, wowN: 0, firstTap: -1, firstBig: -1, denyT: -99, seen: new Set<string>(), banner: null, spot: null, big: null,
    } as RugState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    if (s.dead) return;
    s.t++;
    const p = inp.pointer ?? null, tap = !!p && !s.down;
    s.down = !!p;
    s.pt++;
    if (s.phase === 'play') {
      if (tap && p) onTap(s, p.x, p.y * A);
      if (s.freeze > 0) s.freeze--;
      else playStep(s);
    } else if (s.phase === 'result') {
      if ((tap && s.pt >= RES_MIN) || s.pt >= RES_AUTO) advance(s);
    } else if (s.phase === 'pick') {
      const ch = STAGES[s.stage].ch;
      if (s.picked < 0) {
        if (tap && p && s.pt >= PICK_MIN) s.picked = p.x < 0.5 ? 0 : 1;
        else if (s.pt >= PICK_AUTO) s.picked = 0;
        if (s.picked >= 0) (s.perk[ch] = s.picked + 1), (s.pt = 0), see(s, `perk${ch}${s.picked}`), ev(s, 'perk', s.picked ? 0.72 : 0.28, 0.86, s.picked);
      } else if (s.pt >= PICK_AFTER) (s.stage++), newStage(s);
    } else if (s.pt >= END_T) s.dead = true;
    if (s.events.length > 100) s.events.splice(0, s.events.length - 100);
    while (s.events.length && s.t - s.events[0].t > 120) s.events.shift();
    if (s.gone.length) s.gone = s.gone.filter((c) => s.t - c.t < 50);
    if (s.spot && s.t - s.spot.t > 220 && !s.spot.label.startsWith('잔칫상')) s.spot = null;
    if (s.tally.size > 40) for (const k of [...s.tally.keys()].slice(0, s.tally.size - 40)) s.tally.delete(k);
    if (s.mtally.size > 40) for (const k of [...s.mtally.keys()].slice(0, s.mtally.size - 40)) s.mtally.delete(k);
  },
  over: (s) => s.dead,
  score: (s) => s.pts + s.sp,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const rugpull = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
const ready = (s: RugState) => s.phase === 'play' && !s.down && s.hand <= 0;
const yankable = (s: RugState, r: Rug) => laid(r) && (r.t !== 'feast' || (s.full && !s.pulled));
/** 결과 화면·둘 중 하나는 버릇 봇도 그냥 넘긴다 */
function between(s: RugState, left: boolean): Input | null {
  if (s.phase === 'play') return null;
  if (s.down) return NO;
  if (s.phase === 'result') return s.pt >= RES_MIN ? at(0.5, 0.8) : NO;
  if (s.phase === 'pick') return s.picked < 0 && s.pt >= PICK_MIN ? at(left ? 0.28 : 0.72, 0.86) : NO;
  return NO;
}

/** 이 깔개(들)를 빼면 몇이 넘어질까 — 화살표 끝 무리에 떨어져 미끄러지는 길 · 두 번째 도미노까지 어림 */
function judge(s: RugState, set: Rug[], out?: { meter: number }): number {
  const L = flingL(s), fire = s.perk[1] === 2 ? 0.038 : 0, oil = s.perk[0] === 1 ? 1.35 : 1;
  const ups = s.mons.filter((o) => !o.dead && upright(o.st) && !KD[o.k].boss);
  const hit = new Set<number>(), ride = new Set<number>();
  let v = 0, meter = 0;
  const f = feast(s), b = boss(s);
  const capsule = (x0: number, y0: number, c: number, sn: number, len: number, wd: number, out: Mon[]) => {
    for (const o of ups) {
      if (ride.has(o.id) || hit.has(o.id) || o.k === 'bear') continue;
      const ox = o.x - x0, oy = (o.y - y0) / YS, u = ox * c + oy * sn;
      if (u < -wd || u > len + wd) continue;
      if (Math.abs(-ox * sn + oy * c) <= wd + o.r) hit.add(o.id), out.push(o);
    }
  };
  const ring = (x: number, y: number, r: number, out: Mon[]) => {
    for (const o of ups) if (!ride.has(o.id) && !hit.has(o.id) && dist(x, y, o.x, o.y) < r + o.r * 0.6) hit.add(o.id), out.push(o);
  };
  const feastHit = (x: number, y: number) => !!f && !!b && !s.full && !s.pulled && (inside(f, x, y, 1.15) || dist(x, y, b.x, b.y) < b.r + 0.06);
  for (const r of set) {
    const spin = r.t === 'spin', tg = targetOf(s, r), a = Math.atan2((tg.y - r.y) / YS, tg.x - r.x), rs = riders(s, r), slick = s.t < r.ink ? 1.9 : 1;
    if (r.t === 'feast') v += 60;
    if (underFeast(s, r)) meter += 3 + Math.min(4, rs.length);
    for (const m of rs) ride.add(m.id);
    for (const m of rs) {
      if (KD[m.k].boss) continue;
      let qx: number, qy: number, c: number, sn: number;
      if (spin) {
        const ma = Math.atan2((m.y - r.y) / YS, m.x - r.x) + 0.25;
        (c = Math.cos(ma)), (sn = Math.sin(ma)), (qx = m.x + c * L * 0.62), (qy = m.y + sn * L * 0.62 * YS);
      } else {
        qx = tg.x + (m.x - r.x) * 0.35 - Math.cos(a) * 0.03;
        qy = tg.y + (m.y - r.y) * 0.35 - Math.sin(a) * 0.03 * YS;
        const ma = Math.atan2((qy - m.y) / YS, qx - m.x);
        (c = Math.cos(ma)), (sn = Math.sin(ma));
      }
      const first: Mon[] = [];
      if (m.k === 'bear') {
        v += 1;
        ring(m.x, m.y, 0.17, first);
      } else {
        if (m.k !== 'cat' || m.hops <= 0) v += 1;
        if (feastHit(qx, qy)) meter += m.k === 'pig' ? 2 : 1;
        if (m.k === 'cat' && m.hops > 0) continue;
        capsule(qx, qy, c, sn, 0.14 * oil * slick * (m.k === 'pig' || m.k === 'squirrel' ? 0.55 : 1), m.r + 0.014 + fire, first);
        if (m.k === 'frog') ring(qx, qy, 0.11, first);
        if (m.k === 'squirrel') ring(qx, qy, 0.17, first);
        if (m.k === 'pig') ring(qx, qy, 0.125, first);
        if (m.k === 'jelly') capsule(qx + c * L * 0.48, qy + sn * L * 0.48 * YS, c, sn, 0.04, m.r + 0.02, first);
        if (m.k === 'tanuki') capsule(m.x, m.y, c, sn, 0.9, 0.034, first);
      }
      // 두 번째 도미노: 넘어진 놈이 같은 쪽으로 조금 더
      for (const o of first) {
        v += 1;
        const sec: Mon[] = [];
        capsule(o.x, o.y, c, sn, 0.08 * oil * slick, o.r * 1.6, sec);
        v += sec.length * 0.8;
        if (feastHit(o.x + c * 0.06, o.y + sn * 0.06 * YS)) meter += 1;
      }
    }
  }
  if (f && b && !s.full) v += meter * 0.9;
  if (out) out.meter = meter;
  // 배고파 매트에 선 놈 · 먹을 게 바닥나는 깔개는 서둘러
  for (const r of set) {
    const rs = riders(s, r);
    if (r.t === 'door') v += rs.reduce((a, m) => a + (m.st === DOORST ? 3 + m.tm * 0.15 : 1.5), 0);
    else if (r.amt < 0.25 && s.started) v += rs.length * 0.6;
  }
  return v;
}
/** 봇이 톡 할 자리: 깔개 가운데 (겹친 짝은 겹친 곳도) */
function taps(s: RugState, r: Rug): [number, number][] {
  const out: [number, number][] = [[r.x, r.y]];
  if (r.pair) {
    const o = s.rugs.find((q) => q !== r && q.pair === r.pair);
    if (o && yankable(s, o)) out.push([(r.x + o.x) / 2, (r.y + o.y) / 2]);
  }
  return out;
}
const lastYank = new WeakMap<object, number>();
/** 봇: 넘어질 수가 큰 깔개를 고른다 — 작은 한 방은 아끼고(손님이 더 모이게) 배고픈 놈은 서둘러 */
export const rugpullSmart: Bot<RugState> = {
  name: '많이 넘어질 깔개',
  act(s) {
    const mid = between(s, true);
    if (mid) return mid;
    if (!ready(s)) return NO;
    let bx = 0, by = 0, bv = 0, bm = 0, urgent = false;
    // 지금 날아가는 놈이 떨어질 깔개는 건드리지 않는다 (어차피 넘어진다 — 연쇄를 가로채지 않기)
    const incoming = (r: Rug) => s.mons.some((m) => (m.st === FLY && !m.soft && inside(r, m.fx1, m.fy1, 1.5)) || (m.st === ROLL && hyp(m.vx, m.vy) > 0.004 && inside(r, m.x + m.vx * 14, m.y + m.vy * 14 * YS, 1.2)));
    for (const r of s.rugs) {
      if (!yankable(s, r) || (r.t !== 'door' && incoming(r))) continue;
      if (r.t === 'door' && riders(s, r).some((m) => m.st === DOORST && m.tm > 30)) urgent = true;
      for (const [x, y] of taps(s, r)) {
        const { rugs } = rugsAt(s, x, y);
        if (!rugs.length || !rugs.includes(r)) continue;
        const o = { meter: 0 }, v0 = judge(s, rugs, o) + (r.t === 'door' && riders(s, r).some((m) => m.st === DOORST && m.tm > 30) ? 30 : 0);
        // 대장 판: 별 셋째(한 번에 N칸 들썩)를 노리는 동안은 잔칫상을 크게 흔드는 빼기를 더 쳐준다
        const v = boss(s) && !s.full && s.bestStar < STAGES[s.stage].star ? v0 + o.meter * 1.2 : v0;
        if (v > bv) (bv = v), (bx = x), (by = y), (bm = o.meter);
      }
    }
    const since = s.t - (lastYank.get(s) ?? -999), d = STAGES[s.stage];
    const want = Math.max(6, d.star * 0.7), seek = !!d.boss && !s.full && s.bestStar < d.star && s.t - s.t0 >= 540;
    if (bv >= 2 && (urgent || (seek ? bm >= d.star * 0.85 : bv >= want) || since > (seek ? 100 : 170) || (s.full && !s.pulled))) {
      lastYank.set(s, s.t);
      return at(bx, by);
    }
    return NO;
  },
};

/** 봇: 아무 때나 아무 데나 톡 */
export const rugpullRandom: Bot<RugState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    if (s.down) return NO;
    return rng() < 1 / 40 ? at(0.06 + rng() * 0.88, PY0 + rng() * (PY1 - PY0)) : NO;
  },
};

/** 버릇 봇: 늘 가장 큰 깔개 가운데를 톡 */
export const rugpullHabit: Bot<RugState> = {
  name: '버릇: 늘 가장 큰 깔개',
  act(s) {
    const mid = between(s, true);
    if (mid) return mid;
    if (!ready(s)) return NO;
    let best: Rug | null = null, bv = 0;
    for (const r of s.rugs) {
      if (!yankable(s, r) || !riders(s, r).length) continue;
      const v = r.w * r.h * (round(r) ? 0.8 : 1) + (r.t === 'feast' ? 9 : 0);
      if (v > bv) (bv = v), (best = r);
    }
    return best ? at(best.x, best.y) : NO;
  },
};

/** 독립 버릇 봇: 늘 요리사에게 가장 가까운 깔개 가운데를 톡 */
export const rugpullHabit2: Bot<RugState> = {
  name: '버릇: 늘 요리사에게 가장 가까운 깔개',
  act(s) {
    const mid = between(s, false);
    if (mid) return mid;
    if (!ready(s)) return NO;
    let best: Rug | null = null, bd = 1e9;
    for (const r of s.rugs) {
      if (!yankable(s, r) || !riders(s, r).length) continue;
      const d = dist(r.x, r.y, CHEF_X, CHEF_Y) - (r.t === 'feast' ? 9 : 0);
      if (d < bd) (bd = d), (best = r);
    }
    return best ? at(best.x, best.y) : NO;
  },
};
/** 측정·스크린샷용: k판으로 건너뛰기 */
export const __judge = judge;
export const __jump = (s: RugState, k: number, lv = k + 1, perk: number[] = [k > 3 ? 1 : 0, k > 7 ? 1 : 0]) => ((s.stage = k), (s.lv = lv), (s.perk = perk), newStage(s));

// ───────────────────────────── 그리기: 도구 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const OUT = '#4b3020';
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
}
function lin(ctx: C2, x0: number, y0: number, x1: number, y1: number, ...st: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function radg(ctx: C2, x: number, y: number, r0: number, r1: number, ...st: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.01, r1));
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)));
}
function starPath(ctx: C2, x: number, y: number, r: number, k = 0.47) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r * k : r;
    if (i) ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
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
function burstPath(ctx: C2, x: number, y: number, r: number, n: number, k: number, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, q = i % 2 ? r * k : r;
    if (i) ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
    else ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
function layer(w: number, h: number, sc: number, paint: (c: C2) => void) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * sc));
  c.height = Math.max(1, Math.ceil(h * sc));
  const g = c.getContext('2d')!;
  g.scale(sc, sc);
  paint(g);
  return c;
}
/** 채우고 테두리 */
function ink(g: C2, fill: string | CanvasGradient, lw = LW, stroke = OUT) {
  g.fillStyle = fill;
  g.fill();
  if (lw > 0) (g.strokeStyle = stroke), (g.lineWidth = lw), g.stroke();
}

// ───────────────────────────── 그리기: 몬스터 스티커 ─────────────────────────────
/** 단위 좌표: 몸 반지름 = 1, 발 가운데 = (0,0), 위쪽이 -y */
const LW = 0.11;
/** 표정: 냠냠 · 걷기 · 으악(날아감) · 어질 · 배고파 · 신남 */
const M_EAT = 0, M_WALK = 1, M_FLY = 2, M_DIZZY = 3, M_HUNGRY = 4, M_HAPPY = 5;
function blush(g: C2, x: number, y: number, r: number) {
  g.fillStyle = 'rgba(255,120,140,.45)';
  ell(g, x, y, r, r * 0.6);
  g.fill();
}
/** 얼굴: (cx, cy) 눈 사이 가운데 · e 눈 간격 · s 크기 */
function face(g: C2, cx: number, cy: number, e: number, s: number, mood: number) {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const eye = (x: number) => {
    if (mood === M_EAT || mood === M_HAPPY) {
      g.strokeStyle = OUT;
      g.lineWidth = s * 0.13;
      g.beginPath();
      g.arc(x, cy + s * 0.08, s * 0.2, Math.PI * 1.12, Math.PI * 1.88);
      g.stroke();
    } else if (mood === M_DIZZY) {
      g.strokeStyle = OUT;
      g.lineWidth = s * 0.09;
      g.beginPath();
      for (let i = 0; i < 14; i++) {
        const a = i * 0.9, q = s * 0.03 + i * s * 0.016;
        if (i) g.lineTo(x + Math.cos(a) * q, cy + Math.sin(a) * q);
        else g.moveTo(x, cy);
      }
      g.stroke();
    } else {
      const big = mood === M_FLY ? 1.25 : 1, pr = mood === M_FLY ? 0.09 : mood === M_HUNGRY ? 0.14 : 0.15;
      g.fillStyle = '#ffffff';
      ell(g, x, cy, s * 0.21 * big, s * 0.26 * big);
      g.fill();
      g.strokeStyle = OUT;
      g.lineWidth = s * 0.07;
      g.stroke();
      g.fillStyle = '#2a1a12';
      ell(g, x + (mood === M_HUNGRY ? 0 : s * 0.03), cy + s * 0.03, s * pr, s * pr * 1.15);
      g.fill();
      g.fillStyle = '#ffffff';
      ell(g, x - s * 0.04, cy - s * 0.05, s * 0.05, s * 0.05);
      g.fill();
    }
  };
  eye(cx - e);
  eye(cx + e);
  // 눈썹 (배고파 = 화남)
  if (mood === M_HUNGRY) {
    g.strokeStyle = OUT;
    g.lineWidth = s * 0.12;
    for (const d of [-1, 1]) {
      g.beginPath();
      g.moveTo(cx + d * (e + s * 0.22), cy - s * 0.36);
      g.lineTo(cx + d * (e - s * 0.12), cy - s * 0.22);
      g.stroke();
    }
  }
  const my = cy + s * 0.42;
  g.strokeStyle = OUT;
  g.lineWidth = s * 0.1;
  if (mood === M_EAT) {
    // 오물오물: 볼록한 입 + 부스러기
    g.fillStyle = '#7a2c2c';
    ell(g, cx, my, s * 0.16, s * 0.1);
    g.fill();
    g.stroke();
    g.fillStyle = '#fff3d6';
    ell(g, cx + s * 0.28, my + s * 0.05, s * 0.06, s * 0.05);
    g.fill();
  } else if (mood === M_FLY) {
    g.fillStyle = '#6b1f1f';
    ell(g, cx, my + s * 0.04, s * 0.16, s * 0.21);
    g.fill();
    g.stroke();
  } else if (mood === M_DIZZY) {
    g.beginPath();
    g.moveTo(cx - s * 0.24, my);
    g.quadraticCurveTo(cx - s * 0.12, my - s * 0.1, cx, my);
    g.quadraticCurveTo(cx + s * 0.12, my + s * 0.1, cx + s * 0.24, my);
    g.stroke();
  } else if (mood === M_HUNGRY) {
    g.fillStyle = '#7a1f1f';
    g.beginPath();
    g.moveTo(cx - s * 0.26, my - s * 0.04);
    g.quadraticCurveTo(cx, my + s * 0.34, cx + s * 0.26, my - s * 0.04);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#ffffff';
    g.fillRect(cx - s * 0.14, my - s * 0.04, s * 0.09, s * 0.08);
    g.fillRect(cx + s * 0.05, my - s * 0.04, s * 0.09, s * 0.08);
    // 침
    g.fillStyle = '#9fe0ff';
    ell(g, cx + s * 0.2, my + s * 0.18, s * 0.05, s * 0.09);
    g.fill();
  } else {
    g.beginPath();
    g.arc(cx, my - s * 0.08, s * 0.2, Math.PI * 0.15, Math.PI * 0.85);
    g.stroke();
  }
  if (mood !== M_DIZZY) blush(g, cx - e - s * 0.16, cy + s * 0.32, s * 0.15), blush(g, cx + e + s * 0.16, cy + s * 0.32, s * 0.15);
}
function shine(g: C2, x: number, y: number, rx: number, ry: number, rot = -0.5) {
  g.fillStyle = 'rgba(255,255,255,.55)';
  ell(g, x, y, rx, ry, rot);
  g.fill();
}
function crown(g: C2, x: number, y: number, k: number) {
  g.beginPath();
  g.moveTo(x - k, y);
  g.lineTo(x - k, y - k * 0.8);
  g.lineTo(x - k * 0.5, y - k * 0.35);
  g.lineTo(x, y - k * 1.05);
  g.lineTo(x + k * 0.5, y - k * 0.35);
  g.lineTo(x + k, y - k * 0.8);
  g.lineTo(x + k, y);
  g.closePath();
  ink(g, lin(g, 0, y - k, 0, y, [0, '#fff3a0'], [1, '#f2b31c']), LW * 0.8);
  g.fillStyle = '#ff4d6d';
  ell(g, x, y - k * 0.35, k * 0.16, k * 0.16);
  g.fill();
}
/** 몬스터 한 마리 (단위 좌표) */
function paintMon(g: C2, k: K, mood: number) {
  const hungry = mood === M_HUNGRY;
  const feet = (col: string, sp = 0.5) => {
    g.fillStyle = col;
    for (const d of [-1, 1]) (ell(g, d * sp, -0.08, 0.3, 0.16), ink(g, col, LW * 0.8));
  };
  const tint = (x: number, y: number, r: number) => {
    if (!hungry) return;
    g.fillStyle = 'rgba(255,60,60,.22)';
    ell(g, x, y, r, r);
    g.fill();
  };
  switch (k) {
    case 'mochi': {
      feet('#f4c7cf');
      for (const d of [-1, 1]) {
        g.beginPath();
        g.moveTo(d * 0.42, -1.72);
        g.lineTo(d * 0.3, -2.15);
        g.lineTo(d * 0.15, -1.78);
        g.closePath();
        ink(g, '#ffd34d', LW * 0.8);
      }
      g.beginPath();
      g.moveTo(-1.02, -0.2);
      g.bezierCurveTo(-1.15, -1.3, -0.6, -1.92, 0, -1.92);
      g.bezierCurveTo(0.6, -1.92, 1.15, -1.3, 1.02, -0.2);
      g.quadraticCurveTo(0, 0.05, -1.02, -0.2);
      g.closePath();
      ink(g, radg(g, -0.3, -1.3, 0.1, 1.6, [0, '#ffffff'], [0.55, '#ffe6ee'], [1, '#ffa8c2']));
      tint(0, -0.95, 0.95);
      shine(g, -0.45, -1.45, 0.22, 0.12);
      face(g, 0, -1.0, 0.36, 0.95, mood);
      break;
    }
    case 'bear': {
      feet('#7a4a22', 0.55);
      for (const d of [-1, 1]) (ell(g, d * 0.68, -1.72, 0.32, 0.32), ink(g, '#a8683a'), ell(g, d * 0.68, -1.72, 0.16, 0.16), ink(g, '#f3b79a', 0));
      ell(g, 0, -1.0, 1.0, 0.98);
      ink(g, radg(g, -0.3, -1.4, 0.1, 1.5, [0, '#e0a36c'], [1, '#9a5f34']));
      tint(0, -1, 1);
      ell(g, 0, -0.48, 0.55, 0.38);
      ink(g, '#f1d2a8', 0);
      ell(g, 0, -0.7, 0.42, 0.28);
      ink(g, '#f6dfb8', LW * 0.7);
      ell(g, 0, -0.8, 0.13, 0.09);
      ink(g, '#3a2418', 0);
      shine(g, -0.45, -1.5, 0.22, 0.12);
      face(g, 0, -1.12, 0.36, 0.85, mood);
      break;
    }
    case 'frog': {
      // 물풍선 (머리 위)
      g.strokeStyle = 'rgba(75,48,32,.7)';
      g.lineWidth = 0.06;
      g.beginPath();
      g.moveTo(0.1, -1.7);
      g.quadraticCurveTo(0.35, -2.0, 0.15, -2.25);
      g.stroke();
      ell(g, 0.15, -2.75, 0.55, 0.6);
      ink(g, radg(g, 0, -2.95, 0.05, 0.8, [0, '#e6f9ff'], [0.55, '#7fd4ff'], [1, '#3a9fe0']));
      shine(g, -0.05, -3.0, 0.16, 0.1);
      feet('#3f9a33', 0.6);
      ell(g, 0, -0.82, 1.06, 0.84);
      ink(g, radg(g, -0.3, -1.2, 0.1, 1.4, [0, '#a8f07a'], [1, '#4fb83c']));
      tint(0, -0.85, 0.95);
      ell(g, 0, -0.55, 0.62, 0.36);
      ink(g, '#e8f8c0', 0);
      for (const d of [-1, 1]) (ell(g, d * 0.42, -1.48, 0.34, 0.32), ink(g, '#7fdc5c'));
      face(g, 0, -1.42, 0.42, 0.85, mood);
      break;
    }
    case 'tanuki': {
      // 꼬리 (뒤)
      g.beginPath();
      g.ellipse(-0.95, -0.55, 0.32, 0.6, -0.7, 0, TAU);
      ink(g, '#8a6a4c');
      g.fillStyle = '#4a3426';
      ell(g, -1.08, -0.78, 0.2, 0.12, -0.7);
      g.fill();
      feet('#4a3426', 0.5);
      // 쟁반 든 팔
      g.strokeStyle = OUT;
      g.lineWidth = 0.32;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0.55, -1.2);
      g.lineTo(0.75, -1.95);
      g.stroke();
      g.strokeStyle = '#b99876';
      g.lineWidth = 0.2;
      g.stroke();
      ell(g, 0, -0.95, 0.96, 0.95);
      ink(g, radg(g, -0.3, -1.3, 0.1, 1.4, [0, '#d9bf9c'], [1, '#9c7a58']));
      tint(0, -0.95, 0.95);
      for (const d of [-1, 1]) {
        g.beginPath();
        g.moveTo(d * 0.42, -1.75);
        g.lineTo(d * 0.75, -2.0);
        g.lineTo(d * 0.82, -1.45);
        g.closePath();
        ink(g, '#9c7a58', LW * 0.8);
      }
      // 눈 둘레 검은 띠
      g.fillStyle = '#4a3426';
      ell(g, -0.36, -1.08, 0.33, 0.24, 0.3);
      g.fill();
      ell(g, 0.36, -1.08, 0.33, 0.24, -0.3);
      g.fill();
      ell(g, 0, -0.62, 0.45, 0.3);
      ink(g, '#f6ead6', 0);
      // 나비넥타이
      g.beginPath();
      g.moveTo(0, -0.22);
      g.lineTo(-0.3, -0.38);
      g.lineTo(-0.3, -0.06);
      g.closePath();
      g.moveTo(0, -0.22);
      g.lineTo(0.3, -0.38);
      g.lineTo(0.3, -0.06);
      g.closePath();
      ink(g, '#ff4d5e', LW * 0.6);
      face(g, 0, -1.05, 0.36, 0.85, mood);
      // 쟁반 + 만두
      ell(g, 0.75, -2.02, 0.85, 0.2);
      ink(g, lin(g, 0, -2.2, 0, -1.85, [0, '#ffffff'], [1, '#aeb8c4']), LW * 0.8);
      for (const [dx, c] of [[0.45, '#fff6e0'], [0.85, '#ffe9c4'], [1.15, '#fff6e0']] as [number, string][]) {
        ell(g, dx, -2.16, 0.2, 0.16);
        ink(g, c, LW * 0.6);
      }
      break;
    }
    case 'cat': {
      // 꼬리
      g.strokeStyle = OUT;
      g.lineWidth = 0.34;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0.7, -0.4);
      g.quadraticCurveTo(1.45, -0.6, 1.25, -1.5);
      g.stroke();
      g.strokeStyle = '#f59a3c';
      g.lineWidth = 0.2;
      g.stroke();
      feet('#ffffff', 0.45);
      for (const d of [-1, 1]) {
        g.beginPath();
        g.moveTo(d * 0.25, -1.72);
        g.lineTo(d * 0.72, -2.15);
        g.lineTo(d * 0.85, -1.38);
        g.closePath();
        ink(g, '#f59a3c', LW * 0.8);
        g.beginPath();
        g.moveTo(d * 0.42, -1.72);
        g.lineTo(d * 0.68, -1.95);
        g.lineTo(d * 0.74, -1.55);
        g.closePath();
        g.fillStyle = '#ffc2cf';
        g.fill();
      }
      ell(g, 0, -0.92, 0.95, 0.92);
      ink(g, radg(g, -0.3, -1.3, 0.1, 1.4, [0, '#ffd08a'], [1, '#f0882c']));
      tint(0, -0.92, 0.95);
      g.strokeStyle = '#c8641c';
      g.lineWidth = 0.1;
      for (const d of [-0.25, 0, 0.25]) (g.beginPath(), g.moveTo(d, -1.82), g.lineTo(d * 0.6, -1.55), g.stroke());
      ell(g, 0, -0.55, 0.5, 0.34);
      ink(g, '#fff6ea', 0);
      g.strokeStyle = 'rgba(75,48,32,.6)';
      g.lineWidth = 0.05;
      for (const d of [-1, 1]) for (const k2 of [0, 1]) (g.beginPath(), g.moveTo(d * 0.4, -0.66 + k2 * 0.1), g.lineTo(d * 0.95, -0.72 + k2 * 0.2), g.stroke());
      face(g, 0, -1.02, 0.36, 0.85, mood);
      break;
    }
    case 'pig': {
      // 풍선
      g.strokeStyle = 'rgba(75,48,32,.75)';
      g.lineWidth = 0.06;
      g.beginPath();
      g.moveTo(0.35, -1.5);
      g.quadraticCurveTo(0.9, -2.1, 0.62, -2.6);
      g.stroke();
      ell(g, 0.7, -3.2, 0.6, 0.68);
      ink(g, radg(g, 0.5, -3.45, 0.05, 0.9, [0, '#ffd0d0'], [0.5, '#ff5a5a'], [1, '#d6283a']));
      shine(g, 0.5, -3.45, 0.15, 0.1);
      g.beginPath();
      g.moveTo(0.62, -2.54);
      g.lineTo(0.78, -2.54);
      g.lineTo(0.7, -2.62);
      ink(g, '#d6283a', LW * 0.6);
      feet('#e8849c', 0.5);
      for (const d of [-1, 1]) {
        g.beginPath();
        g.moveTo(d * 0.35, -1.75);
        g.lineTo(d * 0.85, -1.95);
        g.lineTo(d * 0.78, -1.42);
        g.closePath();
        ink(g, '#ffb0c2', LW * 0.8);
      }
      ell(g, 0, -0.92, 1.0, 0.92);
      ink(g, radg(g, -0.3, -1.3, 0.1, 1.5, [0, '#ffe0e8'], [1, '#ff98b0']));
      tint(0, -0.92, 0.95);
      ell(g, 0, -0.72, 0.34, 0.24);
      ink(g, '#ffb6c6', LW * 0.7);
      g.fillStyle = '#b85068';
      ell(g, -0.12, -0.72, 0.06, 0.08);
      g.fill();
      ell(g, 0.12, -0.72, 0.06, 0.08);
      g.fill();
      face(g, 0, -1.18, 0.4, 0.8, mood);
      break;
    }
    case 'chick': {
      feet('#ff9a2c', 0.4);
      ell(g, 0, -0.9, 0.95, 0.9);
      ink(g, radg(g, -0.3, -1.25, 0.1, 1.4, [0, '#fff6a8'], [1, '#ffc928']));
      tint(0, -0.9, 0.9);
      // 머리 깃
      g.beginPath();
      g.moveTo(-0.1, -1.75);
      g.quadraticCurveTo(0, -2.2, 0.2, -1.95);
      g.quadraticCurveTo(0.05, -1.85, 0.12, -1.72);
      ink(g, '#ffd84a', LW * 0.7);
      for (const d of [-1, 1]) (ell(g, d * 0.85, -0.75, 0.25, 0.38, d * 0.4), ink(g, '#ffd23f', LW * 0.7));
      face(g, 0, -1.05, 0.34, 0.85, mood);
      g.beginPath();
      g.moveTo(-0.17, -0.78);
      g.lineTo(0.17, -0.78);
      g.lineTo(0, -0.58);
      g.closePath();
      ink(g, '#ff8a2c', LW * 0.6);
      break;
    }
    case 'squirrel': {
      // 큰 꼬리
      g.beginPath();
      g.moveTo(-0.6, -0.3);
      g.bezierCurveTo(-1.8, -0.5, -1.7, -2.3, -0.7, -2.3);
      g.bezierCurveTo(-0.2, -2.3, -0.35, -1.7, -0.75, -1.7);
      g.bezierCurveTo(-1.05, -1.6, -1.0, -0.9, -0.4, -0.75);
      g.closePath();
      ink(g, radg(g, -1.0, -1.5, 0.1, 1.2, [0, '#f6c890'], [1, '#c07a3c']));
      // 등의 폭죽 (빨간 막대 둘 + 심지 불꽃)
      for (const dx of [0.45, 0.75]) {
        rr(g, dx - 0.13, -2.0, 0.26, 0.85, 0.08);
        ink(g, lin(g, dx - 0.13, 0, dx + 0.13, 0, [0, '#ff6a5a'], [1, '#c8202a']), LW * 0.7);
        g.fillStyle = '#ffe36b';
        g.fillRect(dx - 0.13, -1.78, 0.26, 0.08);
      }
      g.strokeStyle = OUT;
      g.lineWidth = 0.05;
      g.beginPath();
      g.moveTo(0.6, -2.0);
      g.quadraticCurveTo(0.7, -2.25, 0.85, -2.3);
      g.stroke();
      burstPath(g, 0.88, -2.33, 0.18, 6, 0.45);
      ink(g, '#ffd84a', 0);
      feet('#7a4422', 0.45);
      for (const d of [-1, 1]) {
        g.beginPath();
        g.moveTo(d * 0.3, -1.6);
        g.lineTo(d * 0.55, -2.05);
        g.lineTo(d * 0.75, -1.45);
        g.closePath();
        ink(g, '#c07a3c', LW * 0.8);
      }
      ell(g, 0, -0.9, 0.88, 0.88);
      ink(g, radg(g, -0.3, -1.25, 0.1, 1.3, [0, '#e8a868'], [1, '#a8622c']));
      tint(0, -0.9, 0.88);
      ell(g, 0, -0.55, 0.48, 0.32);
      ink(g, '#fbe6c8', 0);
      face(g, 0, -1.0, 0.34, 0.82, mood);
      break;
    }
    case 'jelly': {
      rr(g, -0.95, -1.9, 1.9, 1.85, 0.55);
      ink(g, lin(g, 0, -1.9, 0, -0.05, [0, 'rgba(190,255,236,.95)'], [1, 'rgba(70,214,176,.95)']));
      tint(0, -0.95, 0.9);
      g.fillStyle = 'rgba(255,255,255,.5)';
      for (const [x, y, r] of [[-0.5, -0.5, 0.1], [0.55, -0.4, 0.07], [0.4, -1.55, 0.06]]) (ell(g, x, y, r, r), g.fill());
      shine(g, -0.5, -1.55, 0.25, 0.12, -0.2);
      face(g, 0, -1.05, 0.36, 0.85, mood);
      break;
    }
    case 'kingpig': {
      feet('#e8849c', 0.55);
      for (const d of [-1, 1]) {
        g.beginPath();
        g.moveTo(d * 0.4, -1.75);
        g.lineTo(d * 0.95, -1.98);
        g.lineTo(d * 0.86, -1.38);
        g.closePath();
        ink(g, '#ffb0c2', LW * 0.6);
      }
      ell(g, 0, -0.95, 1.05, 0.95);
      ink(g, radg(g, -0.3, -1.3, 0.1, 1.5, [0, '#ffe0e8'], [1, '#ff8ca8']), LW * 0.6);
      // 턱받이
      g.beginPath();
      g.moveTo(-0.55, -0.62);
      g.quadraticCurveTo(0, -0.1, 0.55, -0.62);
      g.quadraticCurveTo(0, -0.45, -0.55, -0.62);
      ink(g, '#ffffff', LW * 0.5);
      g.fillStyle = '#ff5a6a';
      for (const [x, y] of [[-0.2, -0.45], [0.15, -0.38], [0.02, -0.25]]) (ell(g, x, y, 0.05, 0.05), g.fill());
      ell(g, 0, -0.82, 0.3, 0.2);
      ink(g, '#ffb6c6', LW * 0.5);
      g.fillStyle = '#b85068';
      ell(g, -0.1, -0.82, 0.05, 0.07);
      g.fill();
      ell(g, 0.1, -0.82, 0.05, 0.07);
      g.fill();
      face(g, 0, -1.22, 0.38, 0.72, mood);
      crown(g, 0, -1.82, 0.42);
      // 닭다리
      g.save();
      g.translate(0.95, -0.9);
      g.rotate(-0.6);
      ell(g, 0, -0.25, 0.22, 0.3);
      ink(g, '#c8742c', LW * 0.5);
      rr(g, -0.05, 0, 0.1, 0.3, 0.05);
      ink(g, '#fff6e0', LW * 0.4);
      g.restore();
      break;
    }
    case 'octo': {
      // 다리 여섯
      for (let i = 0; i < 6; i++) {
        const x = -0.95 + i * 0.38, d = i < 3 ? -1 : 1;
        g.beginPath();
        g.moveTo(x - 0.16, -0.6);
        g.quadraticCurveTo(x + d * 0.1, -0.1, x + d * 0.35, -0.05);
        g.quadraticCurveTo(x + d * 0.42, -0.25, x + 0.16, -0.6);
        ink(g, '#ff7a4a', LW * 0.6);
      }
      ell(g, 0, -1.15, 1.0, 0.92);
      ink(g, radg(g, -0.3, -1.5, 0.1, 1.5, [0, '#ffb48c'], [1, '#e8502a']), LW * 0.6);
      g.fillStyle = 'rgba(255,240,220,.5)';
      for (const [x, y] of [[-0.55, -1.55], [0.5, -1.65], [0.65, -1.2]]) (ell(g, x, y, 0.1, 0.08), g.fill());
      // 밀짚모자
      ell(g, 0, -1.92, 0.95, 0.22);
      ink(g, '#f6d47a', LW * 0.5);
      g.beginPath();
      g.ellipse(0, -1.98, 0.55, 0.42, 0, Math.PI, TAU);
      ink(g, '#f2c65a', LW * 0.5);
      g.fillStyle = '#ff4d5e';
      g.fillRect(-0.55, -2.08, 1.1, 0.1);
      face(g, 0, -1.2, 0.38, 0.72, mood);
      // 수박 조각
      g.save();
      g.translate(1.05, -0.95);
      g.rotate(0.3);
      g.beginPath();
      g.moveTo(-0.35, 0);
      g.arc(0, 0, 0.35, Math.PI, 0, true);
      g.closePath();
      ink(g, '#ff4d5e', LW * 0.5);
      g.strokeStyle = '#3fae4a';
      g.lineWidth = 0.08;
      g.beginPath();
      g.arc(0, 0, 0.35, 0, Math.PI);
      g.stroke();
      g.restore();
      break;
    }
    case 'goblin': {
      feet('#3a6ab0', 0.55);
      // 호랑이 무늬 바지
      rr(g, -0.8, -0.75, 1.6, 0.55, 0.25);
      ink(g, '#ffc22c', LW * 0.6);
      g.fillStyle = '#4b3020';
      for (const x of [-0.5, -0.1, 0.3, 0.6]) (g.beginPath(), g.moveTo(x, -0.75), g.lineTo(x + 0.1, -0.45), g.lineTo(x + 0.18, -0.75), g.fill());
      ell(g, 0, -1.15, 0.98, 0.88);
      ink(g, radg(g, -0.3, -1.5, 0.1, 1.5, [0, '#8fc4ff'], [1, '#3f7ad6']), LW * 0.6);
      for (const d of [-1, 1]) {
        g.beginPath();
        g.moveTo(d * 0.3, -1.85);
        g.quadraticCurveTo(d * 0.45, -2.45, d * 0.15, -2.55);
        g.quadraticCurveTo(d * 0.25, -2.1, d * 0.05, -1.92);
        ink(g, '#fff3c4', LW * 0.5);
      }
      // 더벅머리
      g.fillStyle = '#2a2a4a';
      for (let i = 0; i < 5; i++) (ell(g, -0.5 + i * 0.25, -1.95, 0.18, 0.12), g.fill());
      face(g, 0, -1.25, 0.38, 0.72, mood);
      g.fillStyle = '#ffffff';
      for (const d of [-1, 1]) (g.beginPath(), g.moveTo(d * 0.12, -0.83), g.lineTo(d * 0.2, -0.65), g.lineTo(d * 0.28, -0.83), g.fill());
      // 금 방망이
      g.save();
      g.translate(1.0, -1.0);
      g.rotate(0.5);
      rr(g, -0.08, 0, 0.16, 0.6, 0.06);
      ink(g, '#a8642c', LW * 0.4);
      ell(g, 0, -0.25, 0.3, 0.42);
      ink(g, lin(g, -0.3, 0, 0.3, 0, [0, '#fff3a0'], [1, '#e8a812']), LW * 0.5);
      g.fillStyle = '#ffffff';
      for (const y of [-0.45, -0.2, 0.0]) (ell(g, 0.1, y, 0.05, 0.05), g.fill());
      g.restore();
      break;
    }
  }
}
/** 몬스터 스티커 캐시 (종류 · 표정 · 크기) */
const sprites = new Map<string, HTMLCanvasElement>();
const SPR_W = 3.6, SPR_TOP = 4.0, SPR_BOT = 0.45;
function sprite(k: K, mood: number, px: number): HTMLCanvasElement {
  const key = `${k}:${mood}:${Math.max(6, Math.round(px))}`;
  let c = sprites.get(key);
  if (c) return c;
  const u = Math.max(6, Math.round(px));
  c = layer(SPR_W * u, (SPR_TOP + SPR_BOT) * u, 1, (g) => {
    g.translate((SPR_W / 2) * u, SPR_TOP * u);
    g.scale(u, u);
    paintMon(g, k, mood);
  });
  sprites.set(key, c);
  if (sprites.size > 260) sprites.delete(sprites.keys().next().value!);
  return c;
}
/** 스티커 찍기: 지금 원점이 발, u = 화면에서 몸 반지름(px) */
function stamp(ctx: C2, c: HTMLCanvasElement, u: number) {
  ctx.drawImage(c, (-SPR_W / 2) * u, -SPR_TOP * u, SPR_W * u, (SPR_TOP + SPR_BOT) * u);
}
function silhouette(k: K, px: number): HTMLCanvasElement {
  const key = `sil:${k}:${Math.round(px)}`;
  let c = sprites.get(key);
  if (c) return c;
  const src = sprite(k, M_WALK, px);
  c = layer(src.width, src.height, 1, (g) => {
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#c9b48e';
    g.fillRect(0, 0, src.width, src.height);
  });
  sprites.set(key, c);
  return c;
}

// ───────────────────────────── 그리기: 꼬마 요리사 ─────────────────────────────
/** 요리사: (x, y) 발 · k 키 단위(몸 반지름) · pose 0 킥킥 · 1 홱 · 2 만세 · 3 콩 맞음 · 4 걱정 · dir 당기는 쪽(-1 왼쪽) */
function drawChef(ctx: C2, x: number, y: number, k: number, pose: number, lv: number, t: number, dir: number) {
  ctx.save();
  ctx.translate(x, y);
  const bob = pose === 0 ? Math.abs(Math.sin(t * 0.09)) * k * 0.06 : pose === 2 ? Math.abs(Math.sin(t * 0.25)) * k * 0.18 : 0;
  const lean = pose === 1 ? -dir * 0.22 : pose === 3 ? Math.sin(t * 0.3) * 0.12 : 0;
  ctx.translate(0, -bob);
  ctx.scale(k, k);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const lw = 0.11;
  // 다리
  for (const d of [-1, 1]) {
    rr(ctx, d * 0.32 - 0.16, -0.75, 0.32, 0.72, 0.12);
    ink(ctx, '#3d4a6a', lw);
    ell(ctx, d * 0.34, -0.04, 0.3, 0.15);
    ink(ctx, '#5a3a24', lw);
  }
  ctx.rotate(lean);
  // 팔 (뒤)
  const arm = (side: number) => {
    let ax = side * 0.75, ay = -1.2;
    if (pose === 1) (ax = dir * 1.25), (ay = -1.15 + side * 0.12);
    else if (pose === 2) (ax = side * 0.95), (ay = -2.4);
    else if (pose === 3) (ax = side * 0.9), (ay = -1.7 - side * 0.2);
    else if (pose === 4) (ax = side * 0.35), (ay = -1.95);
    else (ax = side * 0.72), (ay = -0.95);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 0.38;
    ctx.beginPath();
    ctx.moveTo(side * 0.55, -1.45);
    ctx.lineTo(ax, ay);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.24;
    ctx.stroke();
    ell(ctx, ax, ay, 0.17, 0.17);
    ink(ctx, '#ffd9b8', lw * 0.8);
  };
  // 몸통 (흰 요리사 옷)
  rr(ctx, -0.68, -1.75, 1.36, 1.1, 0.4);
  ink(ctx, lin(ctx, 0, -1.75, 0, -0.65, [0, '#ffffff'], [1, '#e6ecf2']), lw);
  ctx.fillStyle = '#c8d2dc';
  for (const yy of [-1.45, -1.15]) for (const d of [-1, 1]) (ell(ctx, d * 0.18, yy, 0.06, 0.06), ctx.fill());
  // 앞치마 끈 · 목수건
  ctx.beginPath();
  ctx.moveTo(-0.45, -1.78);
  ctx.lineTo(0.45, -1.78);
  ctx.lineTo(0, -1.45);
  ctx.closePath();
  ink(ctx, '#ff4d5e', lw * 0.8);
  arm(-1);
  arm(1);
  // 머리
  ell(ctx, 0, -2.3, 0.62, 0.58);
  ink(ctx, radg(ctx, -0.2, -2.45, 0.05, 0.8, [0, '#ffe8d2'], [1, '#ffcaa0']), lw);
  // 귀
  for (const d of [-1, 1]) (ell(ctx, d * 0.6, -2.25, 0.12, 0.15), ink(ctx, '#ffcaa0', lw * 0.7));
  // 앞머리
  ctx.fillStyle = '#6a3a1e';
  ctx.beginPath();
  ctx.moveTo(-0.6, -2.4);
  ctx.quadraticCurveTo(-0.3, -2.95, 0.55, -2.55);
  ctx.quadraticCurveTo(0.2, -2.6, 0.1, -2.42);
  ctx.quadraticCurveTo(-0.15, -2.62, -0.6, -2.4);
  ctx.fill();
  // 얼굴
  const ey = -2.3;
  ctx.strokeStyle = OUT;
  ctx.fillStyle = '#2a1a12';
  if (pose === 3) {
    for (const d of [-1, 1]) {
      ctx.lineWidth = 0.07;
      ctx.beginPath();
      ctx.moveTo(d * 0.22 - 0.08, ey - 0.08);
      ctx.lineTo(d * 0.22 + 0.08, ey + 0.08);
      ctx.moveTo(d * 0.22 + 0.08, ey - 0.08);
      ctx.lineTo(d * 0.22 - 0.08, ey + 0.08);
      ctx.stroke();
    }
  } else if (pose === 0 && Math.sin(t * 0.05) > 0.2) {
    // 킥킥 (눈웃음)
    ctx.lineWidth = 0.08;
    for (const d of [-1, 1]) (ctx.beginPath(), ctx.arc(d * 0.22, ey + 0.04, 0.1, Math.PI * 1.1, Math.PI * 1.9), ctx.stroke());
  } else {
    const big = pose === 4 ? 1.3 : 1;
    for (const d of [-1, 1]) {
      ell(ctx, d * 0.22, ey, 0.08 * big, 0.11 * big);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, d * 0.22 - 0.03, ey - 0.04, 0.03, 0.03);
      ctx.fill();
      ctx.fillStyle = '#2a1a12';
    }
  }
  blush(ctx, -0.38, ey + 0.17, 0.11);
  blush(ctx, 0.38, ey + 0.17, 0.11);
  ctx.fillStyle = 'rgba(160,90,50,.5)';
  for (const d of [-1, 1]) for (let i = 0; i < 3; i++) (ell(ctx, d * (0.32 + i * 0.06), ey + 0.1 + (i % 2) * 0.05, 0.018, 0.018), ctx.fill());
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.08;
  if (pose === 1 || pose === 2) {
    ctx.fillStyle = '#7a2c2c';
    ell(ctx, 0, ey + 0.3, 0.16, pose === 1 ? 0.14 : 0.12);
    ctx.fill();
    ctx.stroke();
  } else if (pose === 3 || pose === 4) {
    ctx.beginPath();
    ctx.moveTo(-0.14, ey + 0.32);
    ctx.quadraticCurveTo(0, ey + 0.22, 0.14, ey + 0.32);
    ctx.stroke();
    if (pose === 4) (ctx.fillStyle = '#9fe0ff'), ell(ctx, 0.5, ey - 0.25, 0.06, 0.1), ctx.fill();
  } else {
    ctx.fillStyle = '#7a2c2c';
    ctx.beginPath();
    ctx.arc(0, ey + 0.18, 0.2, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // 요리사 모자: 레벨이 오를수록 높아지고 꾸밈이 붙는다
  const hh = 0.55 + Math.min(10, lv - 1) * 0.07, tilt = pose === 3 ? 0.35 : 0;
  ctx.save();
  ctx.translate(0, -2.72);
  ctx.rotate(tilt);
  rr(ctx, -0.5, -0.2, 1.0, 0.3, 0.1);
  ink(ctx, '#ffffff', lw);
  ctx.beginPath();
  ctx.moveTo(-0.45, -0.15);
  ctx.bezierCurveTo(-0.85, -0.3 - hh * 0.4, -0.6, -0.4 - hh, -0.2, -0.3 - hh);
  ctx.bezierCurveTo(-0.05, -0.55 - hh, 0.25, -0.55 - hh, 0.32, -0.3 - hh);
  ctx.bezierCurveTo(0.75, -0.35 - hh, 0.85, -0.3 - hh * 0.4, 0.45, -0.15);
  ctx.closePath();
  ink(ctx, lv >= 11 ? lin(ctx, 0, -1.2, 0, 0, [0, '#fff3a0'], [1, '#ffd23f']) : '#ffffff', lw);
  if (lv >= 5) (ctx.fillStyle = '#ff4d5e'), ctx.fillRect(-0.48, -0.16, 0.96, 0.1);
  if (lv >= 7) (starPath(ctx, 0, -0.45 - hh * 0.4, 0.16), ink(ctx, '#ffd23f', lw * 0.6));
  if (lv >= 9) crown(ctx, 0, -0.3 - hh - 0.05, 0.22);
  ctx.restore();
  if (pose === 3) {
    // 혹 · 별
    ell(ctx, 0.3, -2.85, 0.14, 0.12);
    ink(ctx, '#ffb0a0', lw * 0.6);
    for (let i = 0; i < 3; i++) {
      const a = t * 0.2 + (i * TAU) / 3;
      starPath(ctx, Math.cos(a) * 0.6, -3.05 + Math.sin(a) * 0.15, 0.13);
      ink(ctx, '#ffe36b', lw * 0.5);
    }
  }
  ctx.restore();
}

// ───────────────────────────── 그리기: 먹을 것 ─────────────────────────────
/** 접시 위 먹을 것: (x, y) 접시 가운데 · k 크기 · amt 남은 양 */
function drawFood(ctx: C2, f: Food, x: number, y: number, k: number, amt: number, hop: number) {
  if (f === 'none') return;
  ctx.save();
  ctx.translate(x, y - hop);
  // 접시
  ell(ctx, 0, 0, k * 1.15, k * 0.5);
  ctx.fillStyle = 'rgba(60,40,20,.18)';
  ctx.fill();
  ell(ctx, 0, -k * 0.06, k * 1.1, k * 0.46);
  ink(ctx, lin(ctx, 0, -k * 0.5, 0, k * 0.4, [0, '#ffffff'], [1, '#d8dee6']), 1.2);
  ell(ctx, 0, -k * 0.08, k * 0.7, k * 0.27);
  ctx.strokeStyle = 'rgba(120,140,170,.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
  const n = amt <= 0 ? 0 : Math.max(1, Math.ceil(amt * 6));
  const lw = Math.max(1, k * 0.08);
  const spots: [number, number][] = [[-0.42, -0.12], [0.42, -0.12], [0, -0.05], [-0.22, -0.42], [0.22, -0.42], [0, -0.72]];
  for (let i = 0; i < n; i++) {
    const [sx, sy] = spots[i], px = sx * k, py = sy * k;
    switch (f) {
      case 'tteok': {
        const col = ['#ffffff', '#ffb6c8', '#b8e88c', '#ffffff', '#ffd27a', '#ffb6c8'][i];
        ell(ctx, px, py, k * 0.3, k * 0.2);
        ink(ctx, col, lw);
        ell(ctx, px - k * 0.08, py - k * 0.06, k * 0.08, k * 0.04);
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.fill();
        break;
      }
      case 'skewer': {
        ctx.strokeStyle = '#c89a5a';
        ctx.lineWidth = Math.max(1, k * 0.06);
        ctx.beginPath();
        ctx.moveTo(px - k * 0.3, py + k * 0.1);
        ctx.lineTo(px + k * 0.35, py - k * 0.25);
        ctx.stroke();
        for (let j = 0; j < 3; j++) (ell(ctx, px - k * 0.18 + j * k * 0.18, py - j * k * 0.1, k * 0.13, k * 0.12), ink(ctx, j % 2 ? '#e8743c' : '#a8401c', lw));
        break;
      }
      case 'melon': {
        ctx.save();
        ctx.translate(px, py + k * 0.05);
        ctx.beginPath();
        ctx.moveTo(-k * 0.32, 0);
        ctx.arc(0, 0, k * 0.32, Math.PI, 0, false);
        ctx.closePath();
        ink(ctx, '#ff4d5e', lw);
        ctx.strokeStyle = '#3fae4a';
        ctx.lineWidth = Math.max(1.5, k * 0.1);
        ctx.beginPath();
        ctx.moveTo(-k * 0.32, 0);
        ctx.lineTo(k * 0.32, 0);
        ctx.stroke();
        ctx.fillStyle = '#2a1a12';
        for (const d of [-0.12, 0.05, 0.16]) (ell(ctx, d * k, -k * 0.12, k * 0.025, k * 0.04), ctx.fill());
        ctx.restore();
        break;
      }
      case 'dumpling': {
        ell(ctx, px, py, k * 0.3, k * 0.22);
        ink(ctx, '#fff6e6', lw);
        ctx.strokeStyle = 'rgba(160,120,80,.6)';
        ctx.lineWidth = 1;
        for (const d of [-1, 0, 1]) (ctx.beginPath(), ctx.moveTo(px + d * k * 0.1, py - k * 0.2), ctx.lineTo(px + d * k * 0.06, py - k * 0.05), ctx.stroke());
        break;
      }
      case 'jeon': {
        ell(ctx, px, py, k * 0.32, k * 0.16);
        ink(ctx, '#f6c25a', lw);
        ctx.fillStyle = '#5fbf4a';
        ell(ctx, px - k * 0.08, py - k * 0.03, k * 0.07, k * 0.03);
        ctx.fill();
        ctx.fillStyle = '#ff6a4a';
        ell(ctx, px + k * 0.1, py, k * 0.05, k * 0.025);
        ctx.fill();
        break;
      }
      case 'corn': {
        ell(ctx, px, py, k * 0.32, k * 0.15, -0.3);
        ink(ctx, '#ffd23f', lw);
        ctx.fillStyle = 'rgba(200,120,30,.5)';
        for (let j = -2; j <= 2; j++) (ell(ctx, px + j * k * 0.1, py - j * k * 0.03, k * 0.03, k * 0.03), ctx.fill());
        break;
      }
    }
  }
  if (n === 0) {
    ctx.fillStyle = 'rgba(200,170,120,.8)';
    for (let i = 0; i < 4; i++) (ell(ctx, (hsh(i) - 0.5) * k, -k * 0.1 + (hsh(i + 9) - 0.5) * k * 0.3, k * 0.05, k * 0.03), ctx.fill());
  }
  ctx.restore();
}

// ───────────────────────────── 그리기: 깔개 ─────────────────────────────
/** 깔개 무늬 (위에서 본 평면, 가운데가 원점, 반폭 w·h px — 화면에서 세로로 눌러 그린다) */
function paintRug(g: C2, t: RT, w: number, h: number, seed: number, ch: number) {
  const round = t === 'mung' || t === 'spin';
  const path = (pad = 0) => (round ? ell(g, 0, 0, w + pad, h + pad) : rr(g, -w - pad, -h - pad, 2 * (w + pad), 2 * (h + pad), Math.min(w, h) * 0.18));
  // 두께 (아래로 살짝)
  g.save();
  g.translate(0, h * 0.09);
  path();
  g.fillStyle = 'rgba(60,40,20,.35)';
  g.fill();
  g.restore();
  path();
  g.save();
  g.clip();
  const palettes: Record<RT, string[]> = {
    mat: [['#f4d88a', '#e6b95a'], ['#9fdcf0', '#5fb8e0'], ['#ffd6e0', '#ff9ab8']][ch].concat(),
    cloth: [['#ffffff', '#ff5a5a'], ['#ffffff', '#3f8fe8'], ['#ffffff', '#3fae6a']][ch].concat(),
    mung: ['#e9c27a', '#c8954a'],
    spin: ['#fff2d0', '#ff8a3d'],
    door: ['#d8433c', '#a8282a'],
    feast: ['#ff5a5a', '#ffd23f'],
  };
  const [c0, c1] = palettes[t];
  g.fillStyle = c0;
  g.fillRect(-w - 2, -h - 2, 2 * w + 4, 2 * h + 4);
  if (t === 'cloth') {
    // 체크무늬
    const n = 6, cw = (2 * w) / n, chh = (2 * h) / n;
    g.fillStyle = c1;
    g.globalAlpha = 0.45;
    for (let i = 0; i < n; i++) g.fillRect(-w + i * cw + cw * 0.25, -h, cw * 0.5, 2 * h);
    for (let j = 0; j < n; j++) g.fillRect(-w, -h + j * chh + chh * 0.25, 2 * w, chh * 0.5);
    g.globalAlpha = 1;
  } else if (t === 'mat') {
    // 돗자리 줄무늬 + 짠 결
    g.fillStyle = c1;
    const n = 9;
    for (let i = 0; i < n; i += 2) g.fillRect(-w, -h + (i * 2 * h) / n, 2 * w, (2 * h) / n);
    g.strokeStyle = 'rgba(120,80,30,.25)';
    g.lineWidth = 1;
    for (let x = -w; x < w; x += 4) (g.beginPath(), g.moveTo(x, -h), g.lineTo(x, h), g.stroke());
  } else if (t === 'mung') {
    // 멍석: 둥글게 감긴 짚
    g.strokeStyle = c1;
    for (let i = 1; i < 9; i++) {
      g.lineWidth = Math.max(1.5, w * 0.05);
      ell(g, 0, 0, (w * i) / 8.5, (h * i) / 8.5);
      g.stroke();
    }
    g.strokeStyle = 'rgba(255,240,200,.5)';
    g.lineWidth = 1;
    for (let i = 0; i < 24; i++) {
      const a = (i * TAU) / 24;
      g.beginPath();
      g.moveTo(Math.cos(a) * w * 0.2, Math.sin(a) * h * 0.2);
      g.lineTo(Math.cos(a) * w, Math.sin(a) * h);
      g.stroke();
    }
  } else if (t === 'spin') {
    // 회전 원판: 나무 원판 + 색 조각
    const cols = ['#ff8a3d', '#ffd23f', '#5fd0b0', '#ff6a8a', '#7fb6ff', '#b8e88c'];
    for (let i = 0; i < 12; i++) {
      g.beginPath();
      g.moveTo(0, 0);
      g.ellipse(0, 0, w, h, 0, (i * TAU) / 12, ((i + 1) * TAU) / 12);
      g.closePath();
      g.fillStyle = cols[i % cols.length];
      g.globalAlpha = 0.75;
      g.fill();
    }
    g.globalAlpha = 1;
    ell(g, 0, 0, w * 0.3, h * 0.3);
    ink(g, '#fff2d0', 1.5);
  } else if (t === 'door') {
    g.fillStyle = c1;
    for (let i = 0; i < 6; i++) g.fillRect(-w + (i * 2 * w) / 6, -h, w / 6, 2 * h);
    g.fillStyle = '#ffe9a0';
    g.font = `900 ${Math.max(9, Math.round(h * 0.9))}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
  } else if (t === 'feast') {
    g.fillStyle = c1;
    for (let i = 0; i < 14; i++) {
      const x = -w + ((i + 0.5) * 2 * w) / 14;
      ell(g, x, h * 0.92, w * 0.045, h * 0.12);
      g.fill();
    }
    g.strokeStyle = '#ffd23f';
    g.lineWidth = 2;
    rr(g, -w * 0.9, -h * 0.8, w * 1.8, h * 1.6, h * 0.3);
    g.stroke();
  }
  // 빛 번짐
  g.fillStyle = lin(g, 0, -h, 0, h, [0, 'rgba(255,255,255,.25)'], [1, 'rgba(0,0,0,.08)']);
  g.fillRect(-w - 2, -h - 2, 2 * w + 4, 2 * h + 4);
  g.restore();
  path();
  g.strokeStyle = t === 'door' ? '#7a1a1c' : 'rgba(75,48,32,.75)';
  g.lineWidth = 1.6;
  g.stroke();
  if (t === 'cloth' || t === 'feast') {
    // 가장자리 술
    g.fillStyle = t === 'feast' ? '#ffd23f' : 'rgba(255,255,255,.9)';
    for (let i = 0; i < 12; i++) {
      const x = -w + ((i + 0.5) * 2 * w) / 12;
      ell(g, x, h + 2, 2.2, 2.2);
      g.fill();
    }
  }
  if (t === 'mat') {
    g.strokeStyle = 'rgba(120,80,30,.7)';
    g.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const y = -h + ((i + 0.5) * 2 * h) / 10;
      for (const d of [-1, 1]) (g.beginPath(), g.moveTo(d * w, y), g.lineTo(d * (w + 4), y + 1), g.stroke());
    }
  }
  void seed;
}
const rugSprites = new Map<string, HTMLCanvasElement>();
function rugSprite(r: Rug, ch: number, wpx: number, hpx: number, sc: number): HTMLCanvasElement {
  const key = `${r.t}:${ch}:${Math.round(wpx)}:${Math.round(hpx)}:${sc}`;
  let c = rugSprites.get(key);
  if (c) return c;
  const pad = 8;
  c = layer(2 * wpx + 2 * pad, 2 * hpx + 2 * pad, sc, (g) => {
    g.translate(wpx + pad, hpx + pad);
    paintRug(g, r.t, wpx, hpx, r.seed, ch);
  });
  rugSprites.set(key, c);
  if (rugSprites.size > 60) rugSprites.delete(rugSprites.keys().next().value!);
  return c;
}

// ───────────────────────────── 그리기: 광장 배경 (장마다 한 번 굽기) ─────────────────────────────
/** 장마다 색: 하늘 · 뒤 · 바닥 둘 · 차양 둘 · 초롱 */
const PALS = [
  { sky: ['#bfe9ff', '#e8f7ff'], back: '#f3dfb8', floor: ['#f4d9a0', '#e2bb78'], tile: 'rgba(150,100,50,.2)', awn: ['#ff5a5a', '#ffffff'], edge: '#8fd06a', fence: '#b7794a' },
  { sky: ['#9fe0ff', '#dff6ff'], back: '#7fd0f0', floor: ['#fbe7b8', '#f0d08c'], tile: 'rgba(200,150,80,.16)', awn: ['#3f8fe8', '#ffffff'], edge: '#ffe9b0', fence: '#d9a86a' },
  { sky: ['#d6e9ff', '#f4f9ff'], back: '#e9f2ff', floor: ['#ffffff', '#e2ecf8'], tile: 'rgba(120,150,200,.14)', awn: ['#3fae6a', '#fff6e6'], edge: '#ffffff', fence: '#9a6a44' },
];
const bgCache = new Map<string, HTMLCanvasElement>();
function getBg(ch: number, w: number, h: number, sc: number): HTMLCanvasElement {
  const key = `${ch}:${w}:${h}:${sc}`;
  let c = bgCache.get(key);
  if (c) return c;
  const P = PALS[ch], X = (x: number) => x * w, Y = (y: number) => y * w, U = (r: number) => r * w;
  c = layer(w, h, sc, (g) => {
    g.lineJoin = 'round';
    // 하늘 · 먼 풍경
    g.fillStyle = lin(g, 0, 0, 0, Y(0.26), [0, P.sky[0]], [1, P.sky[1]]);
    g.fillRect(0, 0, w, Y(0.27));
    if (ch === 1) {
      // 바다
      g.fillStyle = lin(g, 0, Y(0.155), 0, Y(0.215), [0, '#3fb4ee'], [1, '#7fdaf6']);
      g.fillRect(0, Y(0.155), w, Y(0.065));
      g.strokeStyle = 'rgba(255,255,255,.8)';
      g.lineWidth = 1.5;
      for (let i = 0; i < 9; i++) {
        const x = X(0.05 + i * 0.11), y = Y(0.17 + (i % 3) * 0.014);
        g.beginPath();
        g.arc(x, y, U(0.018), Math.PI * 1.1, Math.PI * 1.9);
        g.stroke();
      }
    } else if (ch === 2) {
      // 눈 덮인 소나무
      for (let i = 0; i < 7; i++) {
        const x = X(0.04 + i * 0.155), y = Y(0.215), k = U(0.05 + (i % 2) * 0.012);
        g.beginPath();
        g.moveTo(x, y - k * 2.2);
        g.lineTo(x - k, y);
        g.lineTo(x + k, y);
        g.closePath();
        ink(g, '#3f8a5a', 1.2, 'rgba(40,60,40,.6)');
        g.beginPath();
        g.moveTo(x, y - k * 2.2);
        g.lineTo(x - k * 0.45, y - k * 1.2);
        g.lineTo(x + k * 0.45, y - k * 1.2);
        g.closePath();
        g.fillStyle = '#ffffff';
        g.fill();
      }
    } else {
      // 먼 언덕
      g.fillStyle = '#a8e08a';
      g.beginPath();
      g.moveTo(0, Y(0.21));
      g.quadraticCurveTo(X(0.25), Y(0.14), X(0.5), Y(0.2));
      g.quadraticCurveTo(X(0.75), Y(0.15), w, Y(0.2));
      g.lineTo(w, Y(0.27));
      g.lineTo(0, Y(0.27));
      g.fill();
    }
    // 구름
    g.fillStyle = 'rgba(255,255,255,.9)';
    for (const [cx, cy, k] of [[0.2, 0.125, 0.03], [0.66, 0.118, 0.026], [0.9, 0.13, 0.022]]) {
      for (const [dx, dy, r] of [[-1, 0.2, 0.7], [0, 0, 1], [1, 0.2, 0.75]]) (ell(g, X(cx + dx * k), Y(cy + dy * k), U(k * r), U(k * r * 0.7)), g.fill());
    }
    // 노점(포장마차) 넷 — 차양 · 판대 (구경꾼은 따로 움직인다)
    for (const sx of [0.32, 0.68]) {
      const x0 = X(sx - 0.115), x1 = X(sx + 0.115), top = Y(0.165), bot = Y(0.245);
      rr(g, x0, top + U(0.02), x1 - x0, bot - top - U(0.02), U(0.008));
      ink(g, ch === 2 ? '#a8744a' : '#c88a54', 1.3);
      // 판대
      rr(g, x0 - U(0.008), Y(0.222), x1 - x0 + U(0.016), U(0.026), U(0.006));
      ink(g, ch === 2 ? '#fff6e6' : '#f6e2b8', 1.3);
      // 줄무늬 차양
      const n = 6, ww = (x1 - x0 + U(0.03)) / n;
      for (let i = 0; i < n; i++) {
        g.beginPath();
        g.moveTo(x0 - U(0.015) + i * ww, top);
        g.lineTo(x0 - U(0.015) + (i + 1) * ww, top);
        g.lineTo(x0 - U(0.015) + (i + 1) * ww, top + U(0.026));
        g.quadraticCurveTo(x0 - U(0.015) + (i + 0.5) * ww, top + U(0.04), x0 - U(0.015) + i * ww, top + U(0.026));
        g.closePath();
        g.fillStyle = P.awn[i % 2];
        g.fill();
      }
      g.strokeStyle = 'rgba(75,48,32,.6)';
      g.lineWidth = 1.2;
      g.strokeRect(x0 - U(0.015), top, x1 - x0 + U(0.03), U(0.026));
      if (ch === 2) {
        g.fillStyle = '#ffffff';
        rr(g, x0 - U(0.02), top - U(0.01), x1 - x0 + U(0.04), U(0.016), U(0.008));
        g.fill();
      }
    }
    // 문 셋 (위) — 나무 문틀 · 현판
    for (const gx of [0.14, 0.5, 0.86]) {
      const x = X(gx), k = U(0.075), top = Y(0.158);
      g.fillStyle = 'rgba(60,40,20,.15)';
      g.fillRect(x - k, Y(0.2), 2 * k, Y(0.06));
      for (const d of [-1, 1]) (rr(g, x + d * k - U(0.009), top, U(0.018), Y(0.258) - top, U(0.004)), ink(g, '#d6473a', 1.2));
      rr(g, x - k - U(0.014), top - U(0.012), 2 * k + U(0.028), U(0.02), U(0.005));
      ink(g, '#3a3a3a', 1.2);
      rr(g, x - k * 0.55, top + U(0.012), k * 1.1, U(0.022), U(0.004));
      ink(g, '#fff3c4', 1);
    }
    // 바닥 (광장)
    const fy0 = Y(PY0 - 0.012), fy1 = Y(PY1 + 0.03);
    g.fillStyle = lin(g, 0, fy0, 0, fy1, [0, P.floor[1]], [1, P.floor[0]]);
    g.fillRect(0, fy0, w, fy1 - fy0);
    if (ch === 0) {
      // 돌 타일 (앞으로 올수록 크게)
      g.strokeStyle = P.tile;
      g.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const y = fy0 + (fy1 - fy0) * (i / 12) ** 1.05;
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(w, y);
        g.stroke();
      }
      for (let i = -6; i <= 6; i++) {
        g.beginPath();
        g.moveTo(X(0.5 + i * 0.085), fy0);
        g.lineTo(X(0.5 + i * 0.105), fy1);
        g.stroke();
      }
    } else if (ch === 1) {
      // 모래 물결 · 조개
      g.strokeStyle = 'rgba(200,150,80,.25)';
      g.lineWidth = 1.2;
      for (let i = 0; i < 26; i++) {
        const x = X(hsh(i) * 0.9 + 0.05), y = Y(PY0 + 0.03 + hsh(i + 50) * (PY1 - PY0 - 0.06));
        g.beginPath();
        g.arc(x, y, U(0.03), Math.PI * 1.15, Math.PI * 1.85);
        g.stroke();
      }
      for (let i = 0; i < 6; i++) {
        const x = X(0.08 + hsh(i + 7) * 0.84), y = Y(PY0 + 0.05 + hsh(i + 70) * (PY1 - PY0 - 0.1));
        ell(g, x, y, U(0.008), U(0.006));
        ink(g, i % 2 ? '#ffc2d0' : '#ffffff', 0.8, 'rgba(120,80,40,.5)');
      }
    } else {
      // 눈 위 발자국 · 반짝임
      g.fillStyle = 'rgba(140,170,220,.22)';
      for (let i = 0; i < 30; i++) {
        const x = X(0.06 + hsh(i + 3) * 0.88), y = Y(PY0 + 0.04 + hsh(i + 33) * (PY1 - PY0 - 0.08));
        ell(g, x, y, U(0.006), U(0.004), 0.4);
        g.fill();
        ell(g, x + U(0.012), y + U(0.01), U(0.006), U(0.004), 0.4);
        g.fill();
      }
    }
    // 안쪽 그늘 (가장자리)
    g.fillStyle = lin(g, 0, 0, X(0.08), 0, [0, 'rgba(60,40,20,.14)'], [1, 'rgba(60,40,20,0)']);
    g.fillRect(0, fy0, X(0.08), fy1 - fy0);
    g.fillStyle = lin(g, w, 0, X(0.92), 0, [0, 'rgba(60,40,20,.14)'], [1, 'rgba(60,40,20,0)']);
    g.fillRect(X(0.92), fy0, X(0.08), fy1 - fy0);
    // 위 울타리 (문 자리는 비움)
    const gaps = [0.14, 0.5, 0.86];
    for (let i = 0; i < 26; i++) {
      const x = 0.02 + i * 0.0385;
      if (gaps.some((gx) => Math.abs(gx - x) < 0.07)) continue;
      rr(g, X(x) - U(0.008), Y(PY0 - 0.045), U(0.016), U(0.05), U(0.004));
      ink(g, P.fence, 1, 'rgba(75,48,32,.7)');
    }
    g.fillStyle = P.fence;
    for (const [a, b] of [[0, 0.07], [0.21, 0.43], [0.57, 0.79], [0.93, 1]]) {
      rr(g, X(a), Y(PY0 - 0.034), X(b - a), U(0.01), U(0.004));
      ink(g, P.fence, 1, 'rgba(75,48,32,.7)');
    }
    // 양옆 풀·눈 둔덕 (옆문 자리는 비움)
    for (const [x0, ys] of [[0, [[PY0, 0.7], [0.83, PY1 + 0.04]]], [1, [[PY0, 0.76], [0.89, PY1 + 0.04]]]] as [number, [number, number][]][]) {
      for (const [a, b] of ys) {
        g.fillStyle = P.edge;
        g.beginPath();
        const dx = x0 ? -1 : 1;
        g.moveTo(X(x0), Y(a));
        for (let y = a; y <= b; y += 0.04) g.quadraticCurveTo(X(x0 + dx * 0.035), Y(y + 0.02), X(x0 + dx * 0.022), Y(y + 0.04));
        g.lineTo(X(x0), Y(b));
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(75,48,32,.35)';
        g.lineWidth = 1;
        g.stroke();
        if (ch === 0)
          for (let y = a + 0.03; y < b; y += 0.09) {
            g.fillStyle = ['#ff8ab0', '#ffd23f', '#ffffff'][Math.floor(y * 100) % 3];
            ell(g, X(x0 + dx * 0.016), Y(y), U(0.008), U(0.008));
            g.fill();
          }
      }
    }
    // 모서리 꾸밈: 화분(봄·여름) · 눈사람(겨울)
    for (const [px, py] of [[0.075, PY0 + 0.035], [0.925, PY0 + 0.035], [0.06, PY1 - 0.03]]) {
      const x = X(px), y = Y(py), k = U(0.026);
      g.fillStyle = 'rgba(60,40,20,.18)';
      ell(g, x, y + k * 0.2, k * 1.1, k * 0.35);
      g.fill();
      if (ch === 2) {
        ell(g, x, y - k * 0.5, k * 0.8, k * 0.75);
        ink(g, '#ffffff', 1.2, 'rgba(90,110,150,.7)');
        ell(g, x, y - k * 1.55, k * 0.55, k * 0.5);
        ink(g, '#ffffff', 1.2, 'rgba(90,110,150,.7)');
        g.fillStyle = '#ff8a3d';
        g.beginPath();
        g.moveTo(x, y - k * 1.55);
        g.lineTo(x + k * 0.45, y - k * 1.5);
        g.lineTo(x, y - k * 1.45);
        g.fill();
        g.fillStyle = '#ff4d5e';
        g.fillRect(x - k * 0.55, y - k * 1.15, k * 1.1, k * 0.18);
      } else {
        g.beginPath();
        g.moveTo(x - k * 0.6, y - k * 0.8);
        g.lineTo(x + k * 0.6, y - k * 0.8);
        g.lineTo(x + k * 0.45, y);
        g.lineTo(x - k * 0.45, y);
        g.closePath();
        ink(g, ch === 1 ? '#5fb8e0' : '#d9774a', 1.2);
        for (const [dx, dy, col] of [[-0.35, -1.25, '#ff6a8a'], [0.3, -1.35, '#ffd23f'], [0, -1.6, '#ff8ab0'], [-0.05, -1.1, '#ffffff']] as [number, number, string][]) {
          g.fillStyle = '#5fbf4a';
          ell(g, x + dx * k * 0.6, y + dy * k * 0.75, k * 0.3, k * 0.22);
          g.fill();
          ell(g, x + dx * k, y + dy * k, k * 0.26, k * 0.26);
          ink(g, col, 1, 'rgba(75,48,32,.6)');
        }
      }
    }
    // 요리사 단상 자리 그늘
    g.fillStyle = 'rgba(60,40,20,.18)';
    ell(g, X(CHEF_X), Y(CHEF_Y + 0.02), U(0.11), U(0.04));
    g.fill();
  });
  bgCache.set(key, c);
  if (bgCache.size > 6) bgCache.delete(bgCache.keys().next().value!);
  return c;
}

/** 단상 (요리사가 서는 곳) */
function drawPodium(ctx: C2, x: number, y: number, k: number, ch: number, t: number) {
  // 나무 상자 + 줄무늬 천
  rr(ctx, x - k, y - k * 0.55, 2 * k, k * 0.62, k * 0.08);
  ink(ctx, lin(ctx, 0, y - k * 0.55, 0, y, [0, '#d9965a'], [1, '#a8683a']), 1.6);
  ell(ctx, x, y - k * 0.55, k, k * 0.22);
  ink(ctx, '#e8b07a', 1.6);
  const P = PALS[ch];
  for (let i = 0; i < 6; i++) {
    const x0 = x - k + (i * 2 * k) / 6;
    ctx.fillStyle = P.awn[i % 2];
    ctx.beginPath();
    ctx.moveTo(x0, y - k * 0.45);
    ctx.lineTo(x0 + (2 * k) / 6, y - k * 0.45);
    ctx.lineTo(x0 + (2 * k) / 6, y - k * 0.3);
    ctx.quadraticCurveTo(x0 + k / 6, y - k * 0.22, x0, y - k * 0.3);
    ctx.fill();
  }
  // 깃발
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + k * 0.85, y - k * 0.6);
  ctx.lineTo(x + k * 0.85, y - k * 1.9);
  ctx.stroke();
  const wv = Math.sin(t * 0.08) * k * 0.06;
  ctx.beginPath();
  ctx.moveTo(x + k * 0.85, y - k * 1.9);
  ctx.quadraticCurveTo(x + k * 1.05, y - k * 1.82 + wv, x + k * 1.25, y - k * 1.78);
  ctx.lineTo(x + k * 0.85, y - k * 1.55);
  ctx.closePath();
  ink(ctx, '#ffd23f', 1.2);
}

/** 손가락 (톡 안내) */
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.15);
  ctx.rotate(-0.35);
  ctx.lineJoin = 'round';
  rr(ctx, -k * 0.16, -k * 0.05, k * 0.32, k * 0.62, k * 0.16);
  ink(ctx, '#ffffff', 2.2);
  rr(ctx, -k * 0.34, k * 0.32, k * 0.68, k * 0.55, k * 0.22);
  ink(ctx, '#ffffff', 2.2);
  ctx.restore();
}

// ───────────────────────────── 그리기: 장면 ─────────────────────────────
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/** 터질 때 색 */
const KCOL: Record<K, string> = { mochi: '#ffd6e2', bear: '#d9a066', frog: '#7fdc5c', tanuki: '#c9ab88', cat: '#ffb35c', pig: '#ff98b0', chick: '#ffe45c', squirrel: '#e8a868', jelly: '#8ff0d6', kingpig: '#ff98b0', octo: '#ff8a5a', goblin: '#7fb0ff' };
/** 요리사 레벨이 오르면 달라지는 모습 */
const LV_GIFT: Record<number, string> = { 3: '모자가 높아졌어요', 5: '모자에 빨간 띠', 7: '모자에 금별', 9: '모자에 왕관', 11: '금빛 모자!' };
const STAR_WORDS = (s: RugState) => (STAGES[s.stage].boss ? ['대장 쓰러뜨리기', '하트 안 잃고', `한 번 빼서 ${STAGES[s.stage].star}칸 들썩`] : ['축제 지키기', '하트 안 잃고', `한 번 빼서 ${STAGES[s.stage].star}마리`]);
const recent = new WeakMap<object, { x: number; y: number; t: number; size: number }[]>();
const FONTS: [number, number][] = [[0.034, 700], [0.034, 800], [0.034, 900], [0.036, 800], [0.036, 900], [0.04, 900], [0.042, 900], [0.046, 900], [0.05, 900], [0.058, 900], [0.066, 900]];
const moodOf = (s: RugState, m: Mon) =>
  m.st === EAT ? ((s.t + m.seed) % 90 < 70 ? M_EAT : M_WALK) : m.st === HUNGRY || m.st === DOORST ? M_HUNGRY : m.st === FLY || m.st === ROLL ? (m.soft ? M_HAPPY : M_FLY) : m.st === DIZZY || m.st === SLAM ? M_DIZZY : M_WALK;

/** 미리 굽기(끊김 줄이기): 결과·선물 화면에서는 다음 판의 배경·스티커·깔개를, 판 중에는 이 판 손님 스티커를 프레임마다 조금씩 */
function warmUp(s: RugState, fx: ReturnType<typeof juice>, w: number, h: number, qual: number, U: (r: number) => number) {
  const rest = s.phase === 'result' || s.phase === 'pick';
  if ((rest && s.pt < 12) || (!rest && s.t % 6)) return;
  const ns = rest && s.stage + 1 < STAGES.length ? s.stage + 1 : s.stage, nd = STAGES[ns];
  if (!bgCache.has(`${nd.ch}:${w}:${h}:${qual}`)) return void getBg(nd.ch, w, h, qual);
  const kinds = [...new Set<K>([nd.key, ...nd.mix.map((m) => m[0]), ...(nd.boss ? nd.boss.minions.map((m) => m[0]) : [])])];
  const moods = [M_WALK, M_EAT, M_FLY, M_DIZZY, M_HUNGRY, M_HAPPY], key = 'warm' + ns, total = kinds.length * moods.length;
  let i = fx.memo[key] ?? 0, did = 0;
  for (; i < total && did < (rest ? 3 : 1); i++) {
    const k = kinds[Math.floor(i / moods.length)], px = Math.max(6, Math.round(U(KD[k].r) * qual)), mo = moods[i % moods.length];
    if (!sprites.has(`${k}:${mo}:${px}`)) sprite(k, mo, px), did++;
  }
  fx.memo[key] = i;
  if (did) return;
  // 결과 화면 도감 스티커·그림자 (결과 카드 첫 프레임이 무겁지 않게)
  let j0 = fx.memo.wdex ?? 0;
  if (j0 < DEX.length * 2) {
    const k = DEX[j0 >> 1], px = Math.round(U(KD[k].boss ? 0.013 : 0.016) * qual);
    if (j0 % 2) silhouette(k, px);
    else sprite(k, M_HAPPY, px);
    fx.memo.wdex = ++j0;
    return;
  }
  if (!rest) return;
  // 다음 판 깔개
  const j = fx.memo['wr' + ns] ?? 0;
  if (j < nd.rugs.length) {
    const r = nd.rugs[j], wpx = U(r.w), spin = r.t === 'spin';
    rugSprite({ t: r.t, seed: 0 } as Rug, nd.ch, wpx, spin ? wpx : U(r.h * YS), qual);
    fx.memo['wr' + ns] = j + 1;
  }
}

function drawAll(ctx: C2, s: RugState, w: number, h: number, _th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, U = (r: number) => r * w, t = s.t;
  const sc = typeof ctx.getTransform === 'function' ? Math.min(3, Math.max(1, Math.round(ctx.getTransform().a || 1))) : 1;
  const d = STAGES[s.stage], ch = d.ch, seenT = fx.memo.t ?? -1;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(U(sz)))}px system-ui, sans-serif`);
  {
    const fi = fx.memo.wf ?? 0;
    if (fi < FONTS.length && t % 3 === 0) font(FONTS[fi][0], FONTS[fi][1]), ctx.measureText('가나다 한 방! 0123'), (fx.memo.wf = fi + 1);
  }
  const text = (str: string, x: number, y: number, fill: string, stroke = 'rgba(75,48,32,.9)', lw = 3) => {
    ctx.lineJoin = 'round';
    if (lw > 0) (ctx.lineWidth = lw), (ctx.strokeStyle = stroke), ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  };
  const puff = (x: number, y: number, col: string, n: number, spd = 3, size = 3) => {
    if (fx.particles.length < 150) fx.burst(x, y, col, Math.min(n, 150 - fx.particles.length), spd, size);
  };
  const say = (x: number, y: number, str: string, col: string, size: number) => {
    let rec = recent.get(s);
    if (!rec) recent.set(s, (rec = []));
    x = clamp(x, w * 0.12, w * 0.88);
    y = Math.max(Y(0.2), y);
    for (let k = 0; k < 5 && rec.some((q) => t - q.t < 30 && Math.abs(q.x - x) < w * 0.16 && Math.abs(q.y - y) < (size + q.size) * 0.55); k++) y -= size * 0.9;
    rec.push({ x, y, t, size });
    if (rec.length > 14) rec.shift();
    fx.pop(x, y, str, col, Math.round(size));
  };
  const qual = Math.min(2, sc);
  warmUp(s, fx, Math.round(w), Math.round(h), qual, U);
  const cheer = (s.big && t - s.big.t < 80) || s.phase === 'result' || (s.phase === 'end' && s.won);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.save();
  fx.begin(ctx);
  ctx.drawImage(getBg(ch, Math.round(w), Math.round(h), qual), 0, 0, w, h);

  // ── 구경꾼 (노점 판대 뒤) · 청사초롱 줄 ──
  [0.25, 0.32, 0.39, 0.61, 0.68, 0.75].forEach((bx, i) => {
    const k = U(0.016), hop = cheer ? Math.abs(Math.sin(t * 0.3 + i * 1.7)) * U(0.018) : Math.max(0, Math.sin(t * 0.05 + i * 2.1) - 0.9) * U(0.05);
    const kk = (['mochi', 'cat', 'chick', 'pig', 'frog', 'tanuki'] as K[])[(i + ch * 2) % 6];
    ctx.save();
    ctx.translate(X(bx), Y(0.232) - hop);
    if (i % 2) ctx.scale(-1, 1);
    stamp(ctx, sprite(kk, cheer ? M_HAPPY : M_WALK, k * qual), k);
    ctx.restore();
  });
  for (const sx of [0.32, 0.68]) {
    rr(ctx, X(sx - 0.123), Y(0.222), U(0.246), U(0.026), U(0.006));
    ctx.fillStyle = ch === 2 ? '#fff6e6' : '#f6e2b8';
    ctx.fill();
    ctx.strokeStyle = 'rgba(75,48,32,.8)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }
  {
    // 초롱 줄 (흔들)
    ctx.strokeStyle = 'rgba(75,48,32,.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, Y(0.118));
    ctx.quadraticCurveTo(X(0.5), Y(0.16), w, Y(0.118));
    ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const q = (i + 0.5) / 9, px = X(q), py = Y(0.118 + 0.042 * 4 * q * (1 - q) * 0.95), sw = Math.sin(t * 0.05 + i * 1.3) * 0.15, k = U(0.014);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(sw);
      ell(ctx, 0, k * 1.3, k * 0.85, k * 1.1);
      ink(ctx, lin(ctx, 0, k * 0.2, 0, k * 2.4, [0, '#ff5a5a'], [0.55, '#ff5a5a'], [0.56, '#3f6fe8'], [1, '#3f6fe8']), 1);
      ctx.fillStyle = 'rgba(255,240,180,.45)';
      ell(ctx, -k * 0.25, k * 1.05, k * 0.2, k * 0.45);
      ctx.fill();
      ctx.restore();
    }
  }
  if (ch === 2) {
    // 눈송이
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 26; i++) {
      const x = ((hsh(i) * w + t * 0.15 * (0.5 + hsh(i + 9))) % w), y = (hsh(i + 20) * h + t * (0.35 + hsh(i + 40) * 0.3)) % Y(1.28);
      ell(ctx, x, y, 1.6, 1.6);
      ctx.fill();
    }
  }

  // ── 물바다 ──
  for (const p of s.puddles) {
    const age = t - p.t, a = Math.min(1, age / 8, (p.life - age) / 40);
    ctx.globalAlpha = clamp(a, 0, 1) * 0.85;
    ell(ctx, X(p.x), Y(p.y), U(p.r) * (0.7 + 0.3 * Math.min(1, age / 10)), U(p.r * YS) * (0.7 + 0.3 * Math.min(1, age / 10)));
    ctx.fillStyle = radg(ctx, X(p.x), Y(p.y), 0, U(p.r), [0, 'rgba(150,220,255,.9)'], [1, 'rgba(90,170,240,.55)']);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ell(ctx, X(p.x - p.r * 0.35), Y(p.y - p.r * YS * 0.3), U(p.r * 0.25), U(p.r * 0.08));
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ── 깔개 (잔칫상은 맨 나중 — 도깨비 왕의 상은 다른 깔개 위를 지나간다) ──
  const feastR = feast(s);
  for (const r of [...s.rugs.filter((q) => q.t !== 'feast'), ...(feastR ? [feastR] : [])]) {
    const wpx = U(r.w), hpx = U(r.h * YS), cx = X(r.x), cy = Y(r.y), spin = r.t === 'spin';
    const sp = rugSprite(r, ch, wpx, spin ? wpx : hpx, qual), pad = 8;
    const drawRug = (alpha = 1) => {
      ctx.globalAlpha = alpha;
      if (spin) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, YS);
        ctx.rotate(r.rot);
        ctx.drawImage(sp, -wpx - pad, -wpx - pad, 2 * wpx + 2 * pad, 2 * wpx + 2 * pad);
        ctx.restore();
      } else ctx.drawImage(sp, cx - wpx - pad, cy - hpx - pad, 2 * wpx + 2 * pad, 2 * hpx + 2 * pad);
      ctx.globalAlpha = 1;
    };
    if (laid(r)) {
      // 고를 수 있는 깔개는 살짝 들썩 · 잔칫상은 꽉 차면 반짝
      drawRug();
      if (r.t === 'feast' && s.full && !s.pulled) {
        const pul = 0.5 + 0.5 * Math.sin(t * 0.25);
        rr(ctx, cx - wpx - 4, cy - hpx - 4, 2 * wpx + 8, 2 * hpx + 8, U(0.02));
        ctx.strokeStyle = `rgba(255,230,90,${0.6 + 0.4 * pul})`;
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      if (r.t === 'door') {
        const n = s.mons.filter((m) => !m.dead && m.st === DOORST).length;
        if (n) {
          const pul = 0.5 + 0.5 * Math.sin(t * 0.4);
          rr(ctx, cx - wpx - 3, cy - hpx - 3, 2 * wpx + 6, 2 * hpx + 6, U(0.012));
          ctx.strokeStyle = `rgba(255,60,50,${0.55 + 0.45 * pul})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }
      // 수박 문어의 먹물: 미끄럼판
      if (s.t < r.ink) {
        const age = t - (r.ink - 540), a = Math.min(1, age / 12);
        ctx.save();
        ctx.globalAlpha = a * 0.9;
        for (let i = 0; i < 6; i++) {
          const bx = cx + (hsh(r.id * 7 + i) - 0.5) * wpx * 1.4, by = cy + (hsh(r.id * 11 + i) - 0.5) * hpx * 1.3, k = U(0.022 + 0.018 * hsh(i + r.id));
          ell(ctx, bx, by, k, k * 0.6);
          ctx.fillStyle = '#2a2648';
          ctx.fill();
          ctx.fillStyle = 'rgba(190,200,255,.55)';
          ell(ctx, bx - k * 0.3, by - k * 0.2, k * 0.35, k * 0.14);
          ctx.fill();
        }
        ctx.restore();
        const pul = 0.5 + 0.5 * Math.sin(t * 0.3);
        ctx.strokeStyle = `rgba(120,110,255,${0.5 + 0.4 * pul})`;
        ctx.lineWidth = 3;
        if (spin || r.t === 'mung') ell(ctx, cx, cy, wpx + 3, hpx + 3);
        else rr(ctx, cx - wpx - 3, cy - hpx - 3, 2 * wpx + 6, 2 * hpx + 6, U(0.012));
        ctx.stroke();
      }
      // 도깨비 왕의 잔칫상이 지나는 깔개: 빼면 상이 덜컹
      if (underFeast(s, r)) {
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -t * 0.6;
        ctx.strokeStyle = 'rgba(255,220,60,.95)';
        ctx.lineWidth = 3;
        if (spin || r.t === 'mung') ell(ctx, cx, cy, wpx + 4, hpx + 4);
        else rr(ctx, cx - wpx - 4, cy - hpx - 4, 2 * wpx + 8, 2 * hpx + 8, U(0.012));
        ctx.stroke();
        ctx.setLineDash([]);
      }
      continue;
    }
    // 빠지는 중 / 말려 있다가 다시 펴지는 중
    const p = 1 - r.relay / r.relayMax, age = t - r.pullT;
    const sa = spin ? 0 : Math.atan2(Math.sin(r.pullA) * YS, Math.cos(r.pullA)), dx = Math.cos(sa), dy = Math.sin(sa);
    const reach = spin ? 0 : Math.abs(dx) * wpx + Math.abs(dy) * hpx;
    if (age < 10 && !spin) {
      // 홱! 미끄러져 나감 + 바람 줄
      const q = age / 10, off = (1 - (1 - q) * (1 - q)) * reach * 1.6;
      ctx.save();
      ctx.translate(dx * off, dy * off);
      drawRug(1 - q * 0.5);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        const ox = -dy * i * hpx * 0.4, oy = dx * i * hpx * 0.4;
        ctx.beginPath();
        ctx.moveTo(cx + ox - dx * reach * 0.6, cy + oy - dy * reach * 0.6);
        ctx.lineTo(cx + ox - dx * reach * (0.6 + 0.9 * (1 - q)), cy + oy - dy * reach * (0.6 + 0.9 * (1 - q)));
        ctx.stroke();
      }
    } else if (spin && age < 16) {
      // 회전 원판: 빙글 날아가며 작아짐
      const q = age / 16;
      ctx.save();
      ctx.translate(cx, cy - U(0.06) * Math.sin(q * Math.PI));
      ctx.scale(1 - q * 0.8, (1 - q * 0.8) * YS);
      ctx.rotate(r.rot + q * 6);
      ctx.globalAlpha = 1 - q * 0.6;
      ctx.drawImage(sp, -wpx - pad, -wpx - pad, 2 * wpx + 2 * pad, 2 * wpx + 2 * pad);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    // 빈 자리 테두리 (다시 깔릴 곳)
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(120,90,50,.45)';
    ctx.lineWidth = 1.5;
    if (spin || r.t === 'mung') ell(ctx, cx, cy, wpx, hpx);
    else rr(ctx, cx - wpx, cy - hpx, 2 * wpx, 2 * hpx, Math.min(wpx, hpx) * 0.18);
    ctx.stroke();
    ctx.setLineDash([]);
    if (p > 0.55) {
      // 데굴 말렸던 천이 쭉 펴진다
      const q = clamp((p - 0.55) / 0.45, 0, 1), e = 1 - (1 - q) * (1 - q);
      ctx.save();
      if (spin) {
        ctx.translate(cx, cy);
        ctx.scale(e, e * YS);
        ctx.rotate(r.rot);
        ctx.drawImage(sp, -wpx - pad, -wpx - pad, 2 * wpx + 2 * pad, 2 * wpx + 2 * pad);
      } else {
        ctx.translate(cx + dx * reach, cy + dy * reach);
        ctx.rotate(sa);
        ctx.scale(e, 1);
        ctx.rotate(-sa);
        ctx.translate(-dx * reach, -dy * reach);
        ctx.drawImage(sp, -wpx - pad, -hpx - pad, 2 * wpx + 2 * pad, 2 * hpx + 2 * pad);
      }
      ctx.restore();
    } else if (!spin && age >= 10) {
      // 구겨진 천 뭉치 (빠진 쪽 가장자리)
      const k = Math.min(wpx, hpx * 1.4) * 0.5, bx = cx + dx * (reach + k * 0.3), by = cy + dy * (reach + k * 0.3);
      const cols: Record<RT, [string, string]> = { mat: ['#f4d88a', '#c89a4a'], cloth: ['#ffffff', ch === 1 ? '#7fb6f6' : ch === 2 ? '#7fd09a' : '#ff8a8a'], mung: ['#e9c27a', '#b8843c'], spin: ['#ffd23f', '#ff8a3d'], door: ['#d8433c', '#a8282a'], feast: ['#ff6a6a', '#ffd23f'] };
      const [c0, c1] = cols[r.t];
      ctx.fillStyle = 'rgba(60,40,20,.2)';
      ell(ctx, bx, by + k * 0.35, k * 1.1, k * 0.35);
      ctx.fill();
      for (const [ox, oy, rx, ry, col] of [[-0.45, 0.05, 0.62, 0.42, c1], [0.4, 0.08, 0.58, 0.4, c1], [0, -0.12, 0.7, 0.5, c0]] as [number, number, number, number, string][]) {
        ell(ctx, bx + ox * k, by + oy * k, rx * k, ry * k);
        ink(ctx, col, 1.4, 'rgba(75,48,32,.75)');
      }
      ctx.strokeStyle = 'rgba(75,48,32,.45)';
      ctx.lineWidth = 1.2;
      for (const d of [-0.3, 0.15]) (ctx.beginPath(), ctx.moveTo(bx + d * k, by - k * 0.45), ctx.quadraticCurveTo(bx + (d + 0.15) * k, by - k * 0.1, bx + (d - 0.05) * k, by + k * 0.25), ctx.stroke());
    }
  }

  // ── 날아갈 쪽: 깔개마다 은은한 점선 화살표 (가장 가까운 다른 무리로) ──
  if (s.phase === 'play' && !(s.stage === 0 && s.yanks === 0)) {
    for (const r of s.rugs) {
      if (!laid(r) || (r.t === 'feast' && !(s.full && !s.pulled))) continue;
      const n = riders(s, r).length, al = n ? 0.9 : 0.32;
      if (r.t === 'spin') {
        // 회전 원판: 사방으로
        for (let i = 0; i < 4; i++) {
          const a = r.rot * 2 + (i * TAU) / 4, c = Math.cos(a), sn = Math.sin(a), x0 = X(r.x + c * r.w * 1.08), y0 = Y(r.y + sn * r.h * YS * 1.08), x1 = X(r.x + c * r.w * 1.45), y1 = Y(r.y + sn * r.h * YS * 1.45);
          ctx.strokeStyle = `rgba(255,255,255,${al})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
          const ha = Math.atan2(y1 - y0, x1 - x0), k = U(0.014);
          ctx.fillStyle = `rgba(255,255,255,${al})`;
          ctx.beginPath();
          ctx.moveTo(x1 + Math.cos(ha) * k, y1 + Math.sin(ha) * k);
          ctx.lineTo(x1 + Math.cos(ha + 2.4) * k, y1 + Math.sin(ha + 2.4) * k);
          ctx.lineTo(x1 + Math.cos(ha - 2.4) * k, y1 + Math.sin(ha - 2.4) * k);
          ctx.fill();
        }
        continue;
      }
      const tg = targetOf(s, r), a = Math.atan2((tg.y - r.y) / YS, tg.x - r.x), c = Math.cos(a), sn = Math.sin(a);
      const te = round(r) ? r.w : Math.min(r.w / Math.max(1e-6, Math.abs(c)), r.h / Math.max(1e-6, Math.abs(sn))), x0 = X(r.x + c * te * 0.92), y0 = Y(r.y + sn * te * YS * 0.92);
      const len = dist(r.x, r.y, tg.x, tg.y), x1 = X(tg.x - c * 0.04), y1 = Y(tg.y - sn * 0.04 * YS);
      if (Math.hypot(x1 - x0, y1 - y0) < U(0.04)) continue;
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - U(0.03 + 0.08 * len);
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -t * 0.45;
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(75,48,32,${al * 0.35})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(mx, my, x1, y1);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${al})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.setLineDash([]);
      const ha = Math.atan2(y1 - my, x1 - mx), k = U(0.02);
      ctx.fillStyle = `rgba(255,255,255,${al})`;
      ctx.strokeStyle = `rgba(75,48,32,${al * 0.35})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x1 + Math.cos(ha) * k, y1 + Math.sin(ha) * k);
      ctx.lineTo(x1 + Math.cos(ha + 2.45) * k, y1 + Math.sin(ha + 2.45) * k);
      ctx.lineTo(x1 + Math.cos(ha - 2.45) * k, y1 + Math.sin(ha - 2.45) * k);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  // 먹물 줄기 (문어 → 깔개)
  for (const e of s.events) {
    if (e.k !== 'ink' || t - e.t > 20) continue;
    const q = (t - e.t) / 20;
    for (let i = 0; i < 5; i++) {
      const u = clamp(q * 1.3 - i * 0.07, 0, 1), x = X(e.x + (e.x2 - e.x) * u), y = Y(e.y + (e.y2 - e.y) * u) - Math.sin(u * Math.PI) * U(0.12);
      ell(ctx, x, y, U(0.014 - i * 0.002), U(0.012 - i * 0.002));
      ctx.fillStyle = '#2a2648';
      ctx.fill();
    }
  }

  // ── 그림자 (먼저 바닥에) ──
  for (const m of s.mons) {
    let gx = m.x, gy = m.y, hgt = 0;
    if (m.st === FLY) {
      const q = m.tm / m.fT;
      gx = m.fx0 + (m.fx1 - m.fx0) * q;
      gy = m.fy0 + (m.fy1 - m.fy0) * q;
      hgt = Math.sin(q * Math.PI) * m.fH;
    }
    const k = U(m.r) * (1 - Math.min(0.5, hgt * 2.5));
    ctx.fillStyle = `rgba(60,40,20,${0.22 - Math.min(0.12, hgt)})`;
    ell(ctx, X(gx), Y(gy), k * 1.05, k * 0.38);
    ctx.fill();
  }

  // ── 서 있는 것 (앞뒤 차례) ──
  type Item = { y: number; f: () => void };
  const items: Item[] = [];
  for (const r of s.rugs) {
    if (r.food === 'none') continue;
    const age = t - r.pullT, hop = age < 16 ? Math.sin((age / 16) * Math.PI) * U(0.035) : 0;
    const k = U(Math.min(r.w, r.h * YS * 1.25)) * (r.t === 'feast' ? 0.34 : 0.4);
    items.push({
      y: r.y + 0.001,
      f: () => {
        if (r.t === 'feast') {
          // 잔칫상 위 음식 셋
          for (const dx of [-0.6, 0, 0.6]) drawFood(ctx, r.food, X(r.x + dx * r.w * 0.6), Y(r.y + 0.01), k, r.amt, hop);
        } else drawFood(ctx, r.food, X(r.x), Y(r.y), k, r.amt, hop);
        // 먹을 게 바닥나 간다 — 빨간 '!' (곧 배고파서 요리사에게 간다)
        if (s.started && r.amt < 0.3 && s.phase === 'play' && s.mons.some((m) => m.st === EAT && m.rug === r.id)) {
          const pul = 0.5 + 0.5 * Math.sin(t * 0.35), bx = X(r.x), by = Y(r.y) - k * 1.4 - U(0.02);
          ell(ctx, bx, by, U(0.022) * (1 + 0.15 * pul), U(0.022) * (1 + 0.15 * pul));
          ink(ctx, '#ff4d4d', 2, '#ffffff');
          font(0.034, 900);
          text('!', bx, by + 1, '#ffffff', '', 0);
        }
      },
    });
  }
  const sorted = s.mons.filter((m) => m.st !== FLY);
  for (const m of sorted) {
    items.push({
      y: m.y,
      f: () => {
        const u = U(m.r) * (KD[m.k].boss ? 1 : 1.0), mood = moodOf(s, m);
        const c = sprite(m.k, mood, Math.round(u * qual));
        ctx.save();
        ctx.translate(X(m.x), Y(m.y));
        if (m.st === ROLL) {
          ctx.translate(0, -u * 0.9);
          ctx.rotate(m.spin);
          ctx.translate(0, u * 0.9);
        } else if (m.st === DIZZY) {
          const f = Math.min(1, m.tm / 6);
          ctx.rotate((m.face >= 0 ? 1 : -1) * f * 1.35);
          ctx.globalAlpha = m.tm > (KD[m.k].boss ? 104 : DIZZY_T - 6) ? Math.max(0, 1 - (m.tm - (KD[m.k].boss ? 104 : DIZZY_T - 6)) / 6) : 1;
        } else if (m.st === SLAM) {
          const q = m.tm / 10;
          ctx.translate(0, m.tm < 10 ? -Math.sin(q * Math.PI) * u * 0.9 : 0);
          if (m.tm >= 10) ctx.scale(1.15, 0.85);
        } else if (m.st === EAT) {
          const b = Math.sin(t * 0.22 + m.seed) * 0.04;
          ctx.scale(1 + b, 1 - b);
        } else if (m.st === ENTER || m.st === WANDER || m.st === HUNGRY) {
          ctx.translate(0, -Math.abs(Math.sin(t * 0.28 + m.seed)) * u * 0.18);
        } else if (m.st === DOORST) {
          ctx.translate(Math.sin(t * 0.6 + m.seed) * u * 0.08, 0);
        }
        if (KD[m.k].boss && t - m.bumpT < 16) ctx.rotate(Math.sin((t - m.bumpT) * 0.9) * 0.08 * (1 - (t - m.bumpT) / 16));
        if (m.face < 0) ctx.scale(-1, 1);
        stamp(ctx, c, u);
        ctx.restore();
        ctx.globalAlpha = 1;
        // 어질어질 별
        if (m.st === DIZZY) {
          for (let i = 0; i < 3; i++) {
            const a = t * 0.18 + (i * TAU) / 3, sx = X(m.x) + Math.cos(a) * u * 0.9, sy = Y(m.y) - u * 0.9 + Math.sin(a) * u * 0.3;
            starPath(ctx, sx, sy, u * 0.24);
            ink(ctx, '#ffe36b', 1);
          }
        }
        // 매트에서 요리사를 노리는 중: 빨간 시계 고리
        if (m.st === DOORST) {
          const q = m.tm / DOOR_T, bx = X(m.x), by = Y(m.y) - u * 2.6;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.arc(bx, by, u * 0.42, -Math.PI / 2, -Math.PI / 2 + q * TAU);
          ctx.closePath();
          ctx.fillStyle = 'rgba(255,60,50,.85)';
          ctx.fill();
          ell(ctx, bx, by, u * 0.42, u * 0.42);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      },
    });
  }
  if (feastR) {
    // 잔칫상 앞판 (대장이 상 뒤에 앉은 것처럼)
    items.push({
      y: feastR.y + feastR.h * YS * 0.95,
      f: () => {
        if (!laid(feastR) && t - feastR.pullT < 12) return;
        const wpx = U(feastR.w), hpx = U(feastR.h * YS), cx = X(feastR.x), cy = Y(feastR.y);
        rr(ctx, cx - wpx * 0.96, cy + hpx * 0.75, wpx * 1.92, U(0.03), U(0.006));
        ink(ctx, lin(ctx, 0, cy + hpx * 0.75, 0, cy + hpx * 0.75 + U(0.03), [0, '#b8502c'], [1, '#7a2c1c']), 1.5);
        for (const d of [-1, 1]) (rr(ctx, cx + d * wpx * 0.85 - U(0.008), cy + hpx * 0.75 + U(0.025), U(0.016), U(0.022), U(0.004)), ink(ctx, '#7a2c1c', 1.2));
      },
    });
  }
  // 요리사 · 단상
  items.push({
    y: CHEF_Y + 0.01,
    f: () => {
      const k = U(0.09);
      drawPodium(ctx, X(CHEF_X), Y(CHEF_Y + 0.05), k, ch, t);
      const door = s.mons.some((m) => !m.dead && m.st === DOORST);
      const pose = t - s.chefHitT < 70 ? 3 : t - s.chefT < 16 ? 1 : cheer ? 2 : door ? 4 : 0;
      const dir = Math.cos(s.chefA + Math.PI) >= 0 ? 1 : -1;
      drawChef(ctx, X(CHEF_X), Y(CHEF_Y + 0.05) - k * 0.62, U(0.045), pose, s.lv, t, dir);
    },
  });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();

  // ── 날아가는 것 (맨 위) ──
  for (const m of s.mons) {
    if (m.st !== FLY) continue;
    const q = m.tm / m.fT, gx = m.fx0 + (m.fx1 - m.fx0) * q, gy = m.fy0 + (m.fy1 - m.fy0) * q, hgt = Math.sin(q * Math.PI) * m.fH;
    const u = U(m.r), c = sprite(m.k, moodOf(s, m), Math.round(u * qual));
    // 꼬리 바람
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = Math.max(1.5, u * 0.3);
    ctx.beginPath();
    const q0 = Math.max(0, q - 0.18), gx0 = m.fx0 + (m.fx1 - m.fx0) * q0, gy0 = m.fy0 + (m.fy1 - m.fy0) * q0 - Math.sin(q0 * Math.PI) * m.fH;
    ctx.moveTo(X(gx0), Y(gy0) - u);
    ctx.lineTo(X(gx), Y(gy - hgt) - u);
    ctx.stroke();
    ctx.save();
    ctx.translate(X(gx), Y(gy - hgt) - u * 0.9);
    ctx.rotate(m.soft ? Math.sin(q * Math.PI) * 0.3 * m.face : q * TAU * (m.face >= 0 ? 1 : -1));
    ctx.translate(0, u * 0.9);
    if (m.face < 0) ctx.scale(-1, 1);
    stamp(ctx, c, u);
    ctx.restore();
  }
  // 쟁반
  for (const q of s.trays) {
    const k = U(0.03), a = (t - q.t) * 0.5;
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(X(q.x - q.vx * 6), Y(q.y - q.vy * 6 * YS) - k);
    ctx.lineTo(X(q.x), Y(q.y) - k);
    ctx.stroke();
    ctx.save();
    ctx.translate(X(q.x), Y(q.y) - k);
    ctx.scale(1, 0.45);
    ctx.rotate(a);
    ell(ctx, 0, 0, k * 1.2, k * 1.2);
    ink(ctx, radg(ctx, -k * 0.3, -k * 0.3, 0, k * 1.3, [0, '#ffffff'], [1, '#9aa6b4']), 1.5);
    ctx.restore();
  }
  // 동전 펑 · 배불러 떠남
  for (const g of s.gone) {
    const age = t - g.t, x = X(g.x), y = Y(g.y);
    if (g.how === 0) {
      const q = age / 40, k = U(0.017) * (KD[g.k].boss ? 2 : 1);
      ctx.globalAlpha = Math.max(0, 1 - q * q);
      ell(ctx, x, y - U(0.03) - q * U(0.09), k * Math.abs(Math.cos(age * 0.3)) + 0.5, k);
      ink(ctx, lin(ctx, 0, y - k, 0, y + k, [0, '#fff3a0'], [1, '#f2b31c']), 1.3, '#a06a12');
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = Math.max(0, 1 - age / 40);
      font(0.034, 900);
      text('꺼억~', x, y - U(0.05) - age * 0.4, '#ffffff');
      ctx.globalAlpha = 1;
    }
  }

  // ── 새 손님 스포트라이트 ──
  if (s.spot && s.phase === 'play' && s.spot.id >= 0) {
    const m = s.mons.find((o) => o.id === s.spot!.id && !o.dead && upright(o.st));
    if (m) {
      const u = U(m.r), pul = 0.5 + 0.5 * Math.sin(t * 0.2), big = KD[m.k].boss;
      ell(ctx, X(m.x), Y(m.y), u * (1.7 + pul * 0.3), u * (1.7 + pul * 0.3) * 0.55);
      ctx.fillStyle = `rgba(255,236,120,${0.25 + 0.2 * pul})`;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -t * 0.5;
      ctx.stroke();
      ctx.setLineDash([]);
      if (!big) {
        font(0.034, 900);
        const lab = s.spot.label, tw = ctx.measureText(lab).width + U(0.03), bx = clamp(X(m.x), tw / 2 + 4, w - tw / 2 - 4), by = Y(m.y) - u * (m.k === 'frog' || m.k === 'pig' ? 4.3 : 3.0);
        rr(ctx, bx - tw / 2, by - U(0.022), tw, U(0.044), U(0.022));
        ctx.fillStyle = '#ff3b30';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        text(lab, bx, by + 1, '#ffffff', '', 0);
      }
    }
  }

  // ── 방금 일어난 일: 소리 · 색종이 · 흔들림 · 글자 (한 번만) ──
  let downs = 0;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x), ey = Y(e.y), k = e.text as K;
    switch (e.k) {
      case 'tap': fx.sound('tick', 1.5, 0.45); break;
      case 'deny': fx.sound('tick', 0.7, 0.45); if (e.n) say(ex, ey - U(0.03), '아직 펴는 중!', '#fff3c4', 14); break;
      case 'miss': fx.sound('tick', 0.9, 0.3); break;
      case 'yank': {
        const big = e.n, sz = e.text === 'mung' || e.text === 'feast' ? 0.75 : 1;
        fx.sound('whoosh', 1.25 * sz, 0.9);
        fx.sound('crack', 1.35 * sz, 0.55 + Math.min(0.5, big * 0.06));
        fx.kick(2 + Math.min(6, big * 0.8));
        say(ex, ey - U(0.06), e.y2 ? '빙글!' : '홱!', '#ffffff', 18);
        puff(ex, ey, '#fff6dc', 6, 3, 2.6);
        break;
      }
      case 'whiff': fx.sound('whoosh', 1.6, 0.4); say(ex, ey - U(0.04), '텅~', '#fff3c4', 14); break;
      case 'double': fx.sound('chime', 1.25, 0.8); say(ex, ey - U(0.1), '두 장 한꺼번에!', '#ffe36b', 17); break;
      case 'down': {
        const n = e.n;
        if (downs++ < 6) fx.sound('pop', 0.9 + Math.min(16, n) * 0.07, 0.6 + Math.min(0.5, n * 0.04));
        puff(ex, ey, KCOL[k] ?? '#ffffff', 4, 3, 2.8);
        break;
      }
      case 'tally': say(ex, ey - U(0.05), `${e.n}마리!`, e.n >= d.star ? '#ffe36b' : '#ffffff', Math.min(24, 14 + e.n * 0.7)); break;
      case 'ink': fx.sound('splash', 0.6, 1); fx.sound('whoosh', 0.8, 0.6); say(ex, ey - U(0.06), '푸악! 먹물', '#c8c4ff', 17); break;
      case 'inkslide': fx.sound('whoosh', 0.7, 1); fx.sound('splash', 1.3, 0.6); say(ex, ey - U(0.07), '쭈욱~ 미끄럼!', '#c8c4ff', 18); break;
      case 'jolt': fx.sound('thud', 0.8, 1.1); fx.sound('crack', 1.1, 0.7); fx.kick(7); say(ex, ey - U(0.08), '상이 덜컹!', '#ffe36b', 18); break;
      case 'land': fx.sound('thud', 1.6, 0.35); puff(ex, ey, '#f3dfb0', 3, 2.2, 2.4); break;
      case 'knock': fx.sound('boing', 1.3 + hsh(e.t) * 0.4, 0.35); break;
      case 'wall': fx.sound('boing', 0.8, 0.4); puff(ex, ey, '#f3dfb0', 3, 2, 2.2); break;
      case 'bonk':
        if (e.x > 0.7 && e.y > 0.9) {
          // 요리사 콩
          fx.sound('thud', 1.1, 1.1);
          fx.sound('fail', 1.1, 0.8);
          fx.kick(9);
          say(ex, ey - U(0.05), e.n ? '콩! 배고파!' : '콩! (연습 판은 괜찮아요)', '#ffd0c8', 17);
        } else fx.sound('crack', 1.5, 0.5), puff(ex, ey, '#ffffff', 3, 2.5, 2);
        break;
      case 'slam': fx.sound('thud', 0.6, 1.4); fx.kick(10); puff(ex, ey, '#f3dfb0', 14, 5, 3.2); fx.ring(ex, ey, '#fff3c4', U(0.17), 4); say(ex, ey - U(0.1), '쿵!', '#fff3c4', 22); break;
      case 'splash': fx.sound('splash', 1, 1.1); fx.kick(4); puff(ex, ey - U(0.02), '#9fe0ff', 14, 4.5, 3); fx.ring(ex, ey, '#bfefff', U(0.11), 3); say(ex, ey - U(0.06), '퐁당!', '#bfefff', 18); break;
      case 'boom': fx.sound('crack', 0.7, 1.2); fx.sound('thud', 0.5, 1.4); fx.kick(14); fx.blink('#ffb347', 0.35); puff(ex, ey - U(0.03), '#ffd166', 14, 6, 3.4); puff(ex, ey - U(0.03), '#ff6a3d', 10, 4.5, 3); fx.ring(ex, ey, '#ffd166', U(0.17), 5); say(ex, ey - U(0.08), '펑!', '#ffd166', 24); break;
      case 'thump': fx.sound('thud', 0.7, 1.2); fx.sound('pop', 0.6, 0.8); fx.kick(8); puff(ex, ey, '#ff8a8a', 8, 4, 3); fx.ring(ex, ey, '#ffd0d0', U(0.125), 4); say(ex, ey - U(0.08), '쿵!', '#ffd0d0', 20); break;
      case 'firecracker': fx.sound('pop', 1.4, 0.6); puff(ex, ey, '#ffd166', 5, 3.5, 2.4); break;
      case 'tray': fx.sound('whoosh', 1.7, 0.8); fx.sound('ding', 1.4, 0.4); say(ex, ey - U(0.08), '쟁반 슝!', '#ffffff', 16); break;
      case 'trayhit': fx.sound('ding', 1.1 + e.n * 0.08, 0.5); puff(ex, ey, '#e6eef6', 3, 3, 2.2); break;
      case 'trayend': fx.sound('crack', 1.8, 0.5); puff(ex, ey, '#ffffff', 5, 3, 2.4); break;
      case 'catland': fx.sound('chime', 1.6, 0.6); say(ex, ey - U(0.04), '냥! 사뿐', '#ffe0b0', 16); break;
      case 'bounce': fx.sound('boing', 1 + e.n * 0.25, 0.8); puff(ex, ey, '#bff7e6', 6, 3, 2.6); say(ex, ey - U(0.04), '통!', '#bff7e6', 16); break;
      case 'snap': fx.sound('boing', 0.7, 1); say(ex, ey - U(0.06), '한 번 더 홱!', '#ffe36b', 16); break;
      case 'dizzy': if (downs < 6) fx.sound('tick', 2.4, 0.2); break;
      case 'coin': fx.sound('coin', 1 + hsh(e.t) * 0.2, e.n > 1 ? 1 : 0.35); if (e.n > 1) puff(ex, ey, '#ffd84a', 18, 5, 3); else puff(ex, ey, '#ffd84a', 2, 2, 2); break;
      case 'sit': break;
      case 'hungry': fx.sound('tick', 0.6, 0.4); say(ex, ey, '배고파!', '#ff8a7a', 15); break;
      case 'foodout': fx.sound('fail', 1.6, 0.4); break;
      case 'door': fx.sound('tick', 0.5, 0.6); break;
      case 'heart': fx.sound('fail', 0.8, 1); fx.blink('#ff3b30', 0.3); say(ex, ey - U(0.08), '하트 -1', '#ff8a7a', 18); break;
      case 'relay': fx.sound('whoosh', 2.1, 0.18); break;
      case 'shake': fx.sound('thud', 1.2, 0.6); fx.sound('crack', 1.6, 0.4); puff(ex, ey, '#ffe36b', 4, 3, 2.4); if (t - (fx.memo.shT ?? -99) > 24) (fx.memo.shT = t), say(ex, ey - U(0.06), '들썩!', '#ffe36b', 16); break;
      case 'full': fx.sound('swell', 1, 1); fx.sound('chime', 1, 0.9); break;
      case 'feastpull': fx.sound('crack', 0.6, 1.4); fx.sound('thud', 0.5, 1.4); fx.kick(18); fx.blink('#fff3c4', 0.5); puff(ex, ey, '#ffd23f', 18, 6, 3.4); break;
      case 'bossroll': fx.sound('whoosh', 0.55, 1.2); fx.sound('boing', 0.5, 1); say(ex, ey - U(0.16), '으아아~', '#ffffff', 20); break;
      case 'bossland': fx.sound('thud', 0.4, 1.5); fx.sound('crack', 0.6, 1.2); fx.kick(20); fx.blink('#fff3c4', 0.45); puff(ex, ey, '#f3dfb0', 20, 7, 3.6); fx.ring(ex, ey, '#ffffff', U(0.26), 6); say(ex, ey - U(0.12), '쿠웅!!', '#fff3c4', 28); break;
      case 'bossdown': fx.sound('clear', 0.8, 1); fx.kick(12); puff(ex, ey, '#ffd84a', 20, 6, 3.4); fx.ring(ex, ey, '#ffd84a', U(0.4), 6); break;
      case 'star3': fx.sound('coin', 1.2, 1); puff(ex, ey, '#ffd84a', 14, 5.5, 3.2); fx.ring(ex, ey, '#ffd84a', U(0.2), 5); break;
      case 'stage': fx.sound('ding', 1, 0.6); break;
      case 'clear':
        fx.sound('clear', 1, 1);
        puff(w * 0.3, Y(0.7), '#ffd84a', 16, 6, 3.2);
        puff(w * 0.7, Y(0.7), '#ff8a8a', 16, 6, 3.2);
        break;
      case 'pickopen': fx.sound('swell', 1.1, 0.9); break;
      case 'perk': fx.sound('coin', 1, 1); fx.sound('chime', 1.1, 0.9); puff(ex, ey - U(0.1), '#ffe36b', 16, 5, 3.2); fx.ring(ex, ey - U(0.08), '#ffe36b', U(0.2), 5); break;
      case 'end': fx.sound(e.n ? 'clear' : 'fail', 0.9, 1); break;
    }
  }
  if (s.big && (fx.memo.bigT ?? -1) !== s.big.t && s.big.t > seenT) (fx.memo.bigT = s.big.t), fx.sound('chime', 1 + Math.min(10, s.big.n) * 0.04, 1), fx.blink('#fff6c8', 0.22), fx.kick(7);
  fx.memo.t = t;
  ctx.restore();
  drawHud(ctx, s, w, h);
}

/** 장 끝 선물: 광장의 큰 물건 (ch 장 · i 왼쪽/오른쪽) */
function drawPerk(ctx: C2, ch: number, i: number, x: number, y: number, k: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  const lw = 2;
  if (ch === 0 && i === 0) {
    // 기름 항아리
    ell(ctx, 0, -k * 0.55, k * 0.62, k * 0.6);
    ink(ctx, radg(ctx, -k * 0.2, -k * 0.75, 0, k * 0.8, [0, '#e8a86a'], [1, '#9a5a2c']), lw);
    rr(ctx, -k * 0.3, -k * 1.25, k * 0.6, k * 0.22, k * 0.06);
    ink(ctx, '#7a4422', lw);
    ell(ctx, 0, -k * 1.25, k * 0.3, k * 0.08);
    ink(ctx, '#ffd23f', lw);
    // 흐르는 기름
    ctx.fillStyle = 'rgba(255,210,60,.9)';
    ctx.beginPath();
    ctx.moveTo(-k * 0.2, -k * 1.2);
    ctx.quadraticCurveTo(-k * 0.6, -k * 0.6, -k * 0.75, -k * 0.05 + Math.sin(t * 0.1) * k * 0.03);
    ctx.lineTo(-k * 0.6, -k * 0.05);
    ctx.quadraticCurveTo(-k * 0.45, -k * 0.6, -k * 0.1, -k * 1.15);
    ctx.fill();
    ell(ctx, -k * 0.7, 0, k * 0.4, k * 0.1);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ell(ctx, -k * 0.25, -k * 0.8, k * 0.12, k * 0.22, -0.3);
    ctx.fill();
  } else if (ch === 0) {
    // 고무 깔개 (둘둘 말린 탱탱한 고무)
    ctx.save();
    ctx.translate(0, -k * 0.45);
    rr(ctx, -k * 0.85, -k * 0.35, k * 1.7, k * 0.7, k * 0.35);
    ink(ctx, lin(ctx, 0, -k * 0.35, 0, k * 0.35, [0, '#9ff0a8'], [1, '#3fae5a']), lw);
    ell(ctx, k * 0.85, 0, k * 0.2, k * 0.35);
    ink(ctx, '#2f8a44', lw);
    for (let j = 1; j < 3; j++) (ell(ctx, k * 0.85, 0, k * 0.2 * (j / 3), k * 0.35 * (j / 3)), (ctx.strokeStyle = '#1f6a34'), (ctx.lineWidth = 1.2), ctx.stroke());
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2;
    const b = Math.abs(Math.sin(t * 0.15)) * k * 0.1;
    ctx.beginPath();
    ctx.arc(0, -k * 1.05 - b, k * 0.18, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else if (ch === 1 && i === 0) {
    // 큰 부채
    const sw = Math.sin(t * 0.12) * 0.12;
    ctx.rotate(sw);
    for (let j = 0; j < 7; j++) {
      const a0 = -Math.PI * 0.85 + (j * Math.PI * 0.7) / 7, a1 = a0 + (Math.PI * 0.7) / 7;
      ctx.beginPath();
      ctx.moveTo(0, -k * 0.1);
      ctx.arc(0, -k * 0.1, k * 1.05, a0, a1);
      ctx.closePath();
      ink(ctx, j % 2 ? '#ff8a3d' : '#ffe36b', 1.5);
    }
    rr(ctx, -k * 0.07, -k * 0.15, k * 0.14, k * 0.4, k * 0.05);
    ink(ctx, '#7a4422', 1.5);
  } else {
    // 폭죽 상자
    rr(ctx, -k * 0.7, -k * 0.75, k * 1.4, k * 0.75, k * 0.08);
    ink(ctx, lin(ctx, 0, -k * 0.75, 0, 0, [0, '#ff6a5a'], [1, '#c8202a']), lw);
    ctx.fillStyle = '#ffe36b';
    ctx.fillRect(-k * 0.7, -k * 0.5, k * 1.4, k * 0.12);
    for (let j = 0; j < 4; j++) {
      const x0 = -k * 0.45 + j * k * 0.3;
      rr(ctx, x0 - k * 0.07, -k * 1.15, k * 0.14, k * 0.42, k * 0.04);
      ink(ctx, j % 2 ? '#3f8fe8' : '#ffd23f', 1.3);
      const fl = (t * 0.3 + j) % 1;
      burstPath(ctx, x0, -k * 1.22, k * (0.08 + 0.06 * fl), 6, 0.45, t * 0.1);
      ink(ctx, '#fff3a0', 0);
    }
  }
  ctx.restore();
}

/** 위·아래 띠와 띠 위에 뜨는 것 (시작 띠 · 큰 순간 · 결과 · 둘 중 하나 · 끝) */
function drawHud(ctx: C2, s: RugState, w: number, h: number) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, U = (r: number) => r * w, t = s.t;
  const sc = typeof ctx.getTransform === 'function' ? Math.min(3, Math.max(1, Math.round(ctx.getTransform().a || 1))) : 1;
  const d = STAGES[s.stage], qual = Math.min(2, sc);
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(U(sz)))}px system-ui, sans-serif`);
  const text = (str: string, x: number, y: number, fill: string, stroke = '', lw = 0) => {
    ctx.lineJoin = 'round';
    if (lw > 0) (ctx.lineWidth = lw), (ctx.strokeStyle = stroke), ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  };
  const INK = '#4b3020', MUTED = '#a08a70', CREAM = '#fff6dc';
  ctx.textBaseline = 'middle';
  // ── 위 띠: 판 · 새 손님 · 하트 · 별 · 요리사 레벨 ──
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, w, Y(0.1));
  ctx.fillStyle = '#e3c48c';
  ctx.fillRect(0, Y(0.1) - 2, w, 2);
  ell(ctx, X(0.062), Y(0.05), U(0.036), U(0.036));
  ctx.fillStyle = '#ff8a3d';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  font(0.046, 900);
  text(String(s.stage + 1), X(0.062), Y(0.052), '#ffffff');
  ctx.textAlign = 'left';
  font(0.042, 900);
  const nm = d.name.length > 8 ? d.name.slice(0, 8) + '…' : d.name;
  text(nm, X(0.112), Y(0.052), INK);
  const nw = ctx.measureText(nm).width;
  font(0.034, 700);
  text(`/ ${STAGES.length}`, X(0.112) + nw + U(0.01), Y(0.054), MUTED);
  for (let i = 0; i < 3; i++) {
    heartPath(ctx, X(0.575 + i * 0.05), Y(0.05), U(0.017));
    ctx.fillStyle = i < s.hearts ? '#ff4d5e' : '#e6d6bc';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  starPath(ctx, X(0.735), Y(0.049), U(0.022));
  ctx.fillStyle = '#ffc93c';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  font(0.04, 900);
  text(String(s.stars), X(0.762), Y(0.053), INK);
  drawChef(ctx, X(0.855), Y(0.088), U(0.0125), 0, s.lv, 0, 1);
  font(0.036, 900);
  text(`Lv${s.lv}`, X(0.885), Y(0.053), '#d9480f');

  // ── 진행 띠 (축제 지키기 · 대장 흔들기) ──
  if (s.phase === 'play') {
    const bx = X(0.2), bw = U(0.6), by = Y(0.108), bh = U(0.026);
    const q = d.boss ? s.meter / d.boss.meter : s.done / Math.max(1, s.total);
    rr(ctx, bx - 2, by - 2, bw + 4, bh + 4, bh);
    ctx.fillStyle = INK;
    ctx.fill();
    rr(ctx, bx, by, bw, bh, bh);
    ctx.fillStyle = '#6b5340';
    ctx.fill();
    if (q > 0) {
      rr(ctx, bx, by, Math.max(bh, bw * clamp(q, 0, 1)), bh, bh);
      ctx.fillStyle = d.boss ? lin(ctx, 0, by, 0, by + bh, [0, '#fff3a8'], [1, '#f5b921']) : lin(ctx, 0, by, 0, by + bh, [0, '#bff79a'], [1, '#4fc23c']);
      ctx.fill();
    }
    font(0.032, 900);
    ctx.textAlign = 'center';
    const lab = d.boss ? (s.full ? (s.pulled ? '데굴데굴!' : '잔칫상을 톡!') : `잔칫상 흔들기 ${s.meter}/${d.boss.meter}`) : `날려 보낸 손님 ${Math.min(s.done, s.total)}/${s.total}`;
    text(lab, w / 2, by + bh / 2 + 0.5, d.boss && s.full ? ((t >> 3) % 2 ? '#ffe36b' : '#ffffff') : '#ffffff', INK, 3);
  }

  // ── 아래 띠: 별 셋 · 한 줄 도움말 · 도감 ──
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, Y(1.305), w, h - Y(1.305));
  ctx.fillStyle = '#e3c48c';
  ctx.fillRect(0, Y(1.305), w, 2);
  const words = STAR_WORDS(s), res = s.phase === 'result';
  const state = [res ? 1 : 0, s.bonks > 0 ? -1 : res ? 1 : 0, s.bestStar >= d.star ? 1 : res || s.full ? -1 : 0];
  font(0.034, 800);
  const early = s.phase === 'play' && s.t - s.t0 < STAR_T;
  const prog = s.bestStar > 0 && s.bestStar < d.star && !res && !s.full ? ` ${s.bestStar}/${d.star}` : '';
  const labels = words.map((q, i) => q + (i === 2 ? prog : ''));
  const gap = U(0.012), pad = Math.min(U(0.065), (w - U(0.03) - gap * 2 - labels.reduce((a, q) => a + ctx.measureText(q).width, 0)) / 3);
  const ws = labels.map((q) => ctx.measureText(q).width + pad), total = ws.reduce((a, c) => a + c, 0) + gap * 2;
  let cx = (w - total) / 2;
  labels.forEach((q, i) => {
    const cw = ws[i], cy = Y(1.348), on = state[i] > 0, off = state[i] < 0;
    rr(ctx, cx, cy - U(0.027), cw, U(0.054), U(0.027));
    ctx.fillStyle = on ? '#ffe9a0' : off ? '#efe4cf' : '#ffffff';
    ctx.fill();
    if (i === 2 && early) {
      // 판 시작 10초 동안은 별 셋째를 세지 않는다: 칩이 천천히 차오른다
      ctx.save();
      rr(ctx, cx, cy - U(0.027), cw, U(0.054), U(0.027));
      ctx.clip();
      ctx.fillStyle = 'rgba(200,180,140,.35)';
      ctx.fillRect(cx, cy - U(0.027), cw * (1 - (s.t - s.t0) / STAR_T), U(0.054));
      ctx.restore();
    }
    ctx.strokeStyle = on ? '#e0a020' : off ? '#d6c6a8' : '#c9a878';
    ctx.lineWidth = on ? 2 : 1.4;
    ctx.stroke();
    starPath(ctx, cx + pad * 0.42, cy - 0.5, U(0.016));
    ctx.fillStyle = on ? '#ffb800' : off ? '#d6c6a8' : '#e9d9b8';
    ctx.fill();
    ctx.textAlign = 'left';
    font(0.034, 800);
    text(q, cx + pad * 0.76, cy + 0.5, off ? '#b8a688' : INK);
    if (off) (ctx.fillStyle = '#b8a688'), ctx.fillRect(cx + pad * 0.72, cy, cw - pad, 1.5);
    cx += cw + gap;
  });
  ctx.textAlign = 'center';
  const door = s.mons.some((m) => !m.dead && m.st === DOORST), hungry = s.mons.some((m) => !m.dead && m.st === HUNGRY), low = s.started && s.rugs.some((r) => r.amt < 0.3 && s.mons.some((m) => m.st === EAT && m.rug === r.id));
  let tip = `${d.name}: ${d.news}`;
  if (s.phase === 'pick') tip = '광장의 큰 물건 둘 중 하나를 톡!';
  else if (s.phase === 'result') tip = s.newDex.length ? `새 손님 ${KD[s.newDex[s.newDex.length - 1]].name}: ${KD[s.newDex[s.newDex.length - 1]].line}` : s.got === 3 ? '별 셋! 판 점수가 네 배' : '별이 많을수록 판 점수가 곱해져요';
  else if (s.phase === 'end') tip = s.won ? '모든 잔치를 지켰어요!' : '누르면 다시 해요';
  else if (s.stage === 0 && s.yanks === 0) tip = '깔개를 톡! 위의 놈들이 옆 무리로 날아가요';
  else if (door) tip = '요리사 앞 매트에 배고픈 놈! 매트를 톡 해서 날려요';
  else if (d.boss && s.full && !s.pulled) tip = '잔칫상이 들썩! 잔칫상을 톡 — 대장이 데굴데굴';
  else if (d.boss?.k === 'octo' && s.rugs.some((r) => s.t < r.ink)) tip = '먹물 깔개를 빼면 쭈욱 미끄러져요 — 잔칫상까지!';
  else if (d.boss?.k === 'goblin' && s.rugs.some((r) => underFeast(s, r))) tip = '노란 점선 깔개 위를 상이 지나요 — 빼면 덜컹!';
  else if (d.boss && s.pulled) tip = '잔칫상 빼기 성공! 대장이 데굴데굴 — 졸개들도 털썩';
  else if (hungry) tip = '배고픈 놈이 요리사에게 와요 — 매트에 서면 톡!';
  else if (low) tip = '빨간 ! 깔개는 먹을 게 바닥나요 — 먼저 빼면 다시 가득';
  else if (d.boss) tip = '화살표가 잔칫상으로 가는 깔개를 톡 — 부딪히면 들썩';
  else if (early && s.stage < 3) tip = '손님이 몰려와요 — 화살표 끝 무리가 붐빌수록 와르르';
  else if (s.stage < 2 && s.yanks < 12) tip = '깔개 위 무리도, 화살표 끝 무리도 붐비는 깔개를 톡!';
  font(0.035, 800);
  text(tip, w / 2, Y(1.402), INK);
  font(0.033, 700);
  const perks = PERKS.map((p, i) => (s.perk[i] ? p[s.perk[i] - 1].name : '')).filter(Boolean);
  text(`요리사 Lv${s.lv} · 도감 ${s.dex.length}/${DEX.length}${perks.length ? ' · ' + perks.join(' · ') : ''}`, w / 2, Y(1.452), MUTED);

  // ── 판 시작 띠 (NEW 한 줄) ──
  if (s.banner && s.phase === 'play' && !(s.big && s.big.t >= s.banner.t)) {
    const age = t - s.banner.t, T = 190;
    if (age < T) {
      const a = Math.min(1, age / 10, (T - age) / 14), slide = (1 - Math.min(1, age / 10)) * U(0.05), by = Y(0.145) - slide;
      ctx.globalAlpha = clamp(a, 0, 1);
      rr(ctx, X(0.05), by, U(0.9), U(0.112), U(0.03));
      ctx.fillStyle = 'rgba(255,250,235,.96)';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      font(0.039, 900);
      const hw = ctx.measureText(s.banner.head).width, nw2 = ctx.measureText(d.name).width, pill = U(0.105), gap2 = U(0.014), tot = hw + gap2 + pill + gap2 + nw2;
      let bx0 = w / 2 - tot / 2;
      ctx.textAlign = 'left';
      text(s.banner.head, bx0, by + U(0.033), '#d9480f');
      bx0 += hw + gap2;
      rr(ctx, bx0, by + U(0.012), pill, U(0.042), U(0.021));
      ctx.fillStyle = '#ff3b30';
      ctx.fill();
      font(0.034, 900);
      ctx.textAlign = 'center';
      text('NEW', bx0 + pill / 2, by + U(0.034), '#ffffff');
      ctx.textAlign = 'left';
      font(0.039, 900);
      text(d.name, bx0 + pill + gap2, by + U(0.033), INK);
      ctx.textAlign = 'center';
      font(0.034, 800);
      text(s.banner.sub, w / 2, by + U(0.081), INK);
      ctx.globalAlpha = 1;
    }
  }
  // ── 손가락 (첫 톡 · 잔칫상 빼기) ──
  const fr = feast(s);
  let hand: [number, number] | null = null;
  if (s.phase === 'play' && s.stage === 0 && s.yanks === 0) {
    const r = s.rugs[0];
    hand = [X(r.x + r.w * 0.2), Y(r.y + 0.01)];
  } else if (s.phase === 'play' && fr && s.full && !s.pulled) hand = [X(fr.x + fr.w * 0.5), Y(fr.y + fr.h * YS * 0.4)];
  if (hand) {
    const press = Math.max(0, Math.sin(t * 0.14)), [hx, hy] = hand;
    ell(ctx, hx, hy, U(0.035 + 0.012 * press), U(0.035 + 0.012 * press) * 0.6);
    ctx.strokeStyle = `rgba(255,255,255,${0.95 - 0.5 * press})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    drawHand(ctx, hx + U(0.01), hy + U(0.012), U(0.085), press);
    font(0.046, 900);
    text('톡!', hx + U(0.1), hy - U(0.02), '#ffffff', INK, 4);
    if (s.stage === 0) {
      // 날아갈 쪽 화살표
      const r = s.rugs[0], b = s.rugs[1], ax0 = X(r.x + r.w * 1.05), ax1 = X(b.x - b.w * 0.9), ay = Y((r.y + b.y) / 2) - U(0.03), wob = Math.sin(t * 0.14) * U(0.008);
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -t * 0.6;
      ctx.beginPath();
      ctx.moveTo(ax0, ay);
      ctx.quadraticCurveTo((ax0 + ax1) / 2, ay - U(0.09), ax1 + wob, ay);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(ax1 + U(0.025) + wob, ay + U(0.005));
      ctx.lineTo(ax1 - U(0.01) + wob, ay - U(0.025));
      ctx.lineTo(ax1 - U(0.012) + wob, ay + U(0.022));
      ctx.closePath();
      ctx.fill();
    }
  }

  // ── 큰 순간 띠 ──
  if (s.big && t - s.big.t < 62 && s.phase !== 'end') {
    const age = t - s.big.t, pop = age < 7 ? 1.4 - 0.4 * (age / 7) : 1 + 0.03 * Math.sin(age * 0.5), a = Math.min(1, (62 - age) / 14), n = s.big.n;
    const by = Y(d.boss ? 0.66 : 0.29), size = 0.058 + Math.min(0.02, n * 0.0015);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, by);
    ctx.rotate(-0.05);
    ctx.scale(1, 0.5);
    burstPath(ctx, 0, 0, U(0.32) * Math.min(1.15, pop), 18, 0.8, age * 0.02);
    ctx.fillStyle = 'rgba(255,244,170,.92)';
    ctx.fill();
    ctx.strokeStyle = '#ff8a3d';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.scale(1, 2);
    font(size, 900);
    ctx.textAlign = 'center';
    ctx.save();
    ctx.scale(pop, pop);
    text(s.big.text, 0, s.big.star ? -U(0.022) : 0, '#ff5a2e', '#ffffff', 6);
    ctx.restore();
    if (s.big.star) {
      font(0.04, 900);
      const sw = ctx.measureText('별 셋째!').width, k = U(0.024) * (1 + 0.15 * Math.sin(age * 0.5));
      text('별 셋째!', k * 0.9, U(0.04), '#b06a00', '#ffffff', 4);
      starPath(ctx, -sw / 2 - k * 0.4, U(0.038), k);
      ctx.fillStyle = '#ffc93c';
      ctx.fill();
      ctx.strokeStyle = '#a06a12';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── 결과 ──
  if (s.phase === 'result') {
    const pt = s.pt, a = Math.min(1, pt / 10), slide = (1 - a) * U(0.06);
    const cx0 = X(0.06), cy0 = Y(0.13) - slide, cw = U(0.88), chh = U(0.56);
    ctx.globalAlpha = a;
    rr(ctx, cx0, cy0 + 4, cw, chh, U(0.04));
    ctx.fillStyle = 'rgba(75,48,32,.25)';
    ctx.fill();
    rr(ctx, cx0, cy0, cw, chh, U(0.04));
    ctx.fillStyle = '#fffaf0';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    rr(ctx, X(0.2), cy0 - U(0.012), U(0.6), U(0.07), U(0.02));
    ctx.fillStyle = '#ff8a3d';
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    font(0.046, 900);
    text(s.won ? '모든 잔치를 지켰다!' : `${s.stage + 1}판 잔치 지켰다!`, w / 2, cy0 + U(0.025), '#ffffff');
    for (let i = 0; i < 3; i++) {
      const at = 12 + i * 12, sx0 = X(0.23 + i * 0.27), sy0 = cy0 + U(0.125), on = s.starOk[i] && pt >= at, pop = on ? 1 + Math.max(0, 1 - (pt - at) / 8) * 0.6 : 1;
      starPath(ctx, sx0, sy0, U(0.052) * pop);
      ctx.fillStyle = on ? '#ffc93c' : '#eadfc8';
      ctx.fill();
      ctx.strokeStyle = on ? '#a06a12' : '#cdbd9c';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (on && (fx.memo['st' + i] ?? -1) !== s.stage) (fx.memo['st' + i] = s.stage), fx.sound('ding', 1 + i * 0.18, 0.9), fx.burst(sx0, sy0, '#ffd84a', 10, 3, 2.4);
      font(0.034, 800);
      const lab = STAR_WORDS(s)[i], cut = ctx.measureText(lab).width > U(0.26) ? lab.indexOf(' ', Math.floor(lab.length / 2) - 2) : -1;
      if (cut > 0) text(lab.slice(0, cut), sx0, sy0 + U(0.066), s.starOk[i] ? INK : '#b8a688'), text(lab.slice(cut + 1), sx0, sy0 + U(0.099), s.starOk[i] ? INK : '#b8a688');
      else text(lab, sx0, sy0 + U(0.078), s.starOk[i] ? INK : '#b8a688');
    }
    rr(ctx, X(0.12), cy0 + U(0.243), U(0.76), U(0.058), U(0.02));
    ctx.fillStyle = '#fff0cc';
    ctx.fill();
    font(0.044, 900);
    text(`+${fmt(s.lastGain)}점`, X(0.34), cy0 + U(0.273), '#d9480f');
    font(0.034, 800);
    text(`최고 ${s.best}마리 · 별 ${s.got}개 ×${STAR_MUL[s.got]}`, X(0.66), cy0 + U(0.274), INK);
    // 요리사 레벨
    drawChef(ctx, X(0.14), cy0 + U(0.372), U(0.014), 2, s.lv, t, 1);
    ctx.textAlign = 'left';
    font(0.037, 900);
    const lvs = `요리사 Lv${s.lv - 1} → Lv${s.lv}`;
    text(lvs, X(0.19), cy0 + U(0.345), '#d9480f');
    const lw0 = ctx.measureText(lvs).width;
    font(0.033, 700);
    text(LV_GIFT[s.lv] ?? '더 멀리 홱!', X(0.19) + lw0 + U(0.018), cy0 + U(0.347), LV_GIFT[s.lv] ? '#2f6fb0' : INK);
    // 도감 (날려 본 손님) — 다음 판 새 손님은 점선 동그라미
    const nx: StageDef | undefined = STAGES[s.stage + 1];
    font(0.034, 800);
    text(`도감 ${s.dex.length}/${DEX.length}`, X(0.1), cy0 + U(0.405), MUTED);
    if (s.newDex.length) {
      ctx.textAlign = 'right';
      text(`새 손님! ${s.newDex.map((k) => KD[k].name).slice(-1).join(' · ')}`, X(0.9), cy0 + U(0.405), '#d9480f');
    }
    ctx.textAlign = 'center';
    DEX.forEach((k, i) => {
      const has = s.dex.includes(k), isNew = s.newDex.includes(k), u = U(KD[k].boss ? 0.013 : 0.016), px = X(0.115 + i * 0.07), py = cy0 + U(0.5) - (isNew ? Math.abs(Math.sin(t * 0.18 + i)) * U(0.01) : 0);
      if (isNew) {
        ell(ctx, px, py - u, u * 2, u * 2);
        ctx.fillStyle = '#ffe9a0';
        ctx.fill();
        ctx.strokeStyle = '#e0a020';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      const next = !has && !!nx && nx.key === k;
      if (next) {
        ell(ctx, px, py - u, u * 2, u * 2);
        ctx.strokeStyle = '#ff8a3d';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 3]);
        ctx.lineDashOffset = -t * 0.3;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.save();
      ctx.translate(px, py + u * 0.4);
      stamp(ctx, has ? sprite(k, M_HAPPY, Math.round(u * qual)) : silhouette(k, Math.round(u * qual)), u);
      ctx.restore();
      if (next) (font(0.04, 900), text('?', px, py - u, '#ff8a3d', '#ffffff', 3));
    });
    font(0.037, 900);
    if (pt >= RES_MIN) text(s.won ? '톡!' : d.boss && d.ch < PERKS.length ? '톡 하면 장 끝 선물!' : '톡 하면 다음 판', w / 2, cy0 + chh - U(0.033), (t >> 3) % 2 ? '#d9480f' : '#ff8a3d');
    else if (nx) text(d.boss ? `다음 잔치: ${CHAPTERS[nx.ch]}` : '다음 판엔 새 손님이 와요', w / 2, cy0 + chh - U(0.033), MUTED);
    ctx.globalAlpha = 1;
  }

  // ── 장 끝: 둘 중 하나 ──
  if (s.phase === 'pick') {
    const pt = s.pt, picked = s.picked, opts = PERKS[d.ch];
    ctx.fillStyle = 'rgba(255,246,220,.35)';
    ctx.fillRect(0, Y(0.1), w, Y(1.2));
    rr(ctx, X(0.08), Y(0.135), U(0.84), U(0.105), U(0.03));
    ctx.fillStyle = 'rgba(255,250,235,.96)';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    font(0.042, 900);
    text(`${CHAPTERS[d.ch]} 끝! 선물 하나`, w / 2, Y(0.168), '#d9480f');
    font(0.035, 800);
    text(picked < 0 ? '광장의 큰 물건 둘 중 하나를 톡!' : `${opts[picked].name}: ${opts[picked].line}`, w / 2, Y(0.212), INK);
    opts.forEach((o, i) => {
      const px = X(i ? 0.72 : 0.28), drop = picked < 0 ? Math.max(0, 1 - pt / 16) : 0, py = Y(0.9) - drop * drop * U(0.5);
      const chosen = picked === i, other = picked >= 0 && !chosen, k = U(0.15) * (chosen ? 1 + 0.15 * Math.sin(Math.min(1, pt / 12) * Math.PI) : 1);
      ctx.globalAlpha = other ? Math.max(0, 1 - pt / 20) : 1;
      ctx.fillStyle = 'rgba(50,35,10,.2)';
      ell(ctx, px, Y(0.905), U(0.13), U(0.035));
      ctx.fill();
      if (picked < 0 && pt >= PICK_MIN) {
        ell(ctx, px, Y(0.905), U(0.17 + 0.012 * Math.sin(t * 0.2)), U(0.05));
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.setLineDash([7, 6]);
        ctx.lineDashOffset = -t * 0.5;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      drawPerk(ctx, d.ch, i, px, py, k, t);
      rr(ctx, px - U(0.205), Y(0.955), U(0.41), U(0.105), U(0.025));
      ctx.fillStyle = chosen ? '#ffe9a0' : 'rgba(255,250,235,.96)';
      ctx.fill();
      ctx.strokeStyle = chosen ? '#e0a020' : INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      font(0.04, 900);
      text(o.name, px, Y(0.99), '#d9480f');
      font(0.031, 800);
      text(o.line, px, Y(1.034), INK);
      ctx.globalAlpha = 1;
    });
  }

  // ── 끝 ──
  if (s.phase === 'end') {
    const a = Math.min(1, s.pt / 14);
    ctx.globalAlpha = a;
    rr(ctx, X(0.08), Y(0.36), U(0.84), U(0.56), U(0.04));
    ctx.fillStyle = '#fffaf0';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    drawChef(ctx, w / 2, Y(0.6), U(0.03), s.won ? 2 : 3, s.lv, t, 1);
    ctx.textAlign = 'center';
    font(0.052, 900);
    text(s.won ? '세 잔치를 모두 지켰다!' : '요리사가 콩 맞았어요…', w / 2, Y(0.66), '#d9480f');
    font(0.04, 800);
    text(`${s.won ? STAGES.length : s.stage + 1}판 · 별 ${s.stars}/${STAGES.length * 3} · 도감 ${s.dex.length}/${DEX.length}`, w / 2, Y(0.73), INK);
    font(0.06, 900);
    text(`${fmt(s.pts + s.sp)}점`, w / 2, Y(0.81), INK);
    font(0.035, 700);
    text(s.won ? `요리사 Lv${s.lv} — 최고의 꼬마 요리사!` : '다시 하면 더 멀리 갈 수 있어요', w / 2, Y(0.875), MUTED);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'center';
}
/** 스크린샷·모음 그림용 (게임에서는 쓰지 않는다) */
export const __art = { sprite, stamp, drawChef, drawPerk, silhouette };
