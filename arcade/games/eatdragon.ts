/**
 * 🐉 먹고 바뀌는 아기 용 (42라운드: 톡마다 내가 바뀐다) — 먹고 바뀌기 × 연쇄 × 도감.
 * 규칙 한 줄: 떼지어 나는 것을 톡 하면 아기 용이 휙 날아가 한입에 꿀꺽 — 먹은 것의 부위가 내 몸에 돋는다
 *   (머리 = 숨결 · 등 = 갑옷·가시·날개 · 꼬리 = 휘두르기). 자리마다 하나, 새것이 옛것을 밀어내고 옛것은 폭죽처럼 펑 떨어져 나간다.
 * 조작은 톡 하나: 톡한 곳에서 가장 가까운 것을 먹으러 간다(한 입에 그 떼의 셋 — 톡 자체가 한 방). 먹은 뒤 0.5초는 꼭꼭 씹는다(연타 소용없음).
 *   싸움은 몸이 저절로 한다: 머리는 숨결을 뿜고, 등은 몸놀림을 바꾸고, 꼬리는 휘두른다. 세 자리의 조합이 곧 공격 전체다.
 * 무엇을 먹으면 무엇이 돋는지는 그 짐승의 모습에 그대로 보인다(불꽃 박쥐의 머리 불꽃 · 바위 딱정벌레의 등 바위 · 잠자리 꼬리의 바람개비).
 * 0.5초짜리 판단: 지금 몰려오는 게 떼냐(불) · 빠른 것이냐(얼음) · 큰 놈이냐(거품·망치) · 딱딱하냐(바위·망치) · 쏘는 것이냐(날개·번개)
 *   · 둘러쌌냐(가시·회오리) → 그 부위를 주는 떼를 톡. 지금 몸이 좋으면 다른 자리를 채우는 떼를 먹는다. 같은 것을 또 먹으면 그 부위가 한 단계 커진다.
 * 부위는 갑옷이기도 하다: 맞으면 금이 가고 다 깨지면 뚝 떨어진다. 맨몸으로 세게 맞으면 하트 -1(하트 셋을 다 잃으면 그 판만 다시).
 *   1판은 첫 톡 전엔 아무도 덤비지 않고, 배우는 판의 적은 약하다.
 * 판마다 '무서운 왕'(크고 불타고 뾰족한 왕 박쥐·왕 딱정벌레 …)이 하나 나온다 — 그걸 먹으면 그 부위가 단숨에 최고 단계(힘의 맛).
 * 판 12개(장 3 × 3판 + 대장): 1 불꽃 박쥐 → 2 바위 딱정벌레 → 3 바람개비 잠자리 → 4 대장 폭풍 독수리(깃털) → 5 얼음 나비 → 6 거품 해파리
 *   → 7 돌망치 다람쥐 → 8 대장 구름 고래(꼬리) → 9 번개 참새 → 10 가시 복어 → 11 바람 부엉이 → 12 대장 번개 용(뿔).
 *   대장은 못 먹는다 — 대장이 흘린 깃털·꼬리·뿔을 먹으면 그 대장의 힘이 내 몸에(화면이 확 바뀐다).
 * 둘이 만나면 새 모습: 불꽃 회오리 · 얼음 깨기 · 번개 가시 · 거품 바람 · 쿵쾅 박치기. 도감 = 돋아 본 부위 12 + 만든 조합.
 * 성장(저절로): 판을 깨면 용 레벨 +1(몸이 조금 크고 뿔이 자라고 힘이 세진다) · 장 끝에 하늘의 큰 물건 둘 중 하나를 톡.
 * 별(쉬운 말 셋): 하늘길 지나기 · 하트 안 잃고 · 한 번에 N마리. 점수: 공격 한 번에 n번째로 쓰러진 적은 ⌈n²/4⌉점, 판 점수는 별 수로 곱해진다.
 * 큰 띠는 처음 돋은 부위 · 새 조합 · 왕/대장의 힘 · 별 셋째 · 판 최고 기록에만. 나머지는 사건 자리의 작은 숫자와 소리.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5, TAU = Math.PI * 2;
/** 하늘 길: 화면 좌표(가로 폭 = 1, 세로 0~1.5). 용과 떼는 이 띠 안에서 난다 */
const FY0 = 0.17, FY1 = 1.22;
const HOME_X = 0.27, HOME_Y = 0.8;
/** 용은 화면 세로 40~60%에 머문다 (y 범위) · 그림은 몸보다 1.3배 크게 */
const ME_Y0 = 0.64, ME_Y1 = 0.96, DK = 1.3;
/** 한 화면의 적 상한 · 적 총알 상한 · 내 것(가시·거품·바람) 상한 */
const CAP = 24, SHOT_CAP = 100, MINE_CAP = 60;
/** 먹은 뒤 꼭꼭 씹는 틱(이동안 톡은 안 먹힌다) · 먹으러 날아가는 최소 틱 */
const CHEW_T = 36, GULP_T = 8;
/** 결과 화면: 톡 받기 시작 · 저절로 넘어감 / 둘 중 하나 · 실패 · 끝 */
const RES_MIN = 90, RES_AUTO = 420, PICK_MIN = 40, PICK_AUTO = 900, PICK_AFTER = 64, END_T = 210, FAIL_MIN = 70, FAIL_AUTO = 260;
/** 큰 띠(판 최고 기록) 문턱 · 판 깸 점수 · 별 곱 · 마지막 판 보너스 */
const WOW_N = 5, CLEAR_PTS = 20, STAR_MUL = [1, 1, 2, 6], WIN_PTS = 100;

/** 몸의 자리: 0 머리 · 1 등 · 2 꼬리 */
type Slot = 0 | 1 | 2;
type P = 'fire' | 'ice' | 'bubble' | 'bolt' | 'thunder' | 'rock' | 'spike' | 'wing' | 'storm' | 'twister' | 'hammer' | 'wave';
type K = 'bat' | 'beetle' | 'fly' | 'bfly' | 'jelly' | 'squir' | 'spark' | 'puff' | 'owl' | 'eagle' | 'whale' | 'drake';
type Beh = 'swarm' | 'zip' | 'orbit' | 'snipe' | 'float' | 'ram' | 'boss';

/** 부위: 자리 · 이름 · 조합 이름에 쓰는 말 · 하는 일 · 강한 상황 · 빛깔 · 공격 간격(틱) */
interface PDef { slot: Slot; name: string; adj: string; line: string; best: string; col: string; dk: string; per: number; boss?: boolean }
export const PD: Record<P, PDef> = {
  fire: { slot: 0, name: '불 숨결', adj: '불꽃', line: '앞으로 불을 확! 몰린 떼를 한 번에', best: '몰린 떼', col: '#ff7a2e', dk: '#c2410c', per: 40 },
  ice: { slot: 0, name: '얼음 숨결', adj: '얼음', line: '쭉 뻗는 얼음 — 빠른 것을 꽁꽁', best: '빠른 것', col: '#7fd8ff', dk: '#1f8ac0', per: 46 },
  bubble: { slot: 0, name: '거품 숨결', adj: '거품', line: '큰 놈을 거품에 가둬 둥실 — 펑!', best: '큰 놈', col: '#d9a6ff', dk: '#8a52c8', per: 60 },
  bolt: { slot: 0, name: '번개 숨결', adj: '번개', line: '번개가 튕겨 흩어진 것까지 찌릿', best: '흩어진 것', col: '#ffd93a', dk: '#c99400', per: 44 },
  thunder: { slot: 0, name: '천둥 뿔', adj: '천둥', line: '하늘에서 벼락이 우르르 — 대장의 힘', best: '전부', col: '#ffe066', dk: '#b07800', per: 66, boss: true },
  rock: { slot: 1, name: '바위 갑옷', adj: '바위', line: '맞아도 끄떡없고 쿵 박치기 — 껍데기도 깨요', best: '딱딱한 것', col: '#b3a796', dk: '#6b5d50', per: 74 },
  spike: { slot: 1, name: '가시 등', adj: '가시', line: '가시가 사방으로 퓽퓽 — 둘러싸였을 때', best: '둘러쌀 때', col: '#ffc34a', dk: '#c27a12', per: 58 },
  wing: { slot: 1, name: '큰 날개', adj: '날개', line: '휙 날며 바람 — 총알을 날려 버려요', best: '쏘는 것', col: '#b9a3ff', dk: '#6c55c8', per: 52 },
  storm: { slot: 1, name: '폭풍 깃털', adj: '폭풍', line: '날갯짓 한 번에 회오리바람 — 대장의 힘', best: '전부', col: '#9fd0ff', dk: '#2f6fb0', per: 76, boss: true },
  twister: { slot: 2, name: '바람개비 꼬리', adj: '회오리', line: '회오리가 작은 것을 빨아들여 빙글빙글', best: '작은 것 모으기', col: '#7ff0c8', dk: '#1f9e78', per: 130 },
  hammer: { slot: 2, name: '망치 꼬리', adj: '망치', line: '쾅! 큰 놈과 딱딱한 것을 내려찍어요', best: '큰 놈·딱딱한 것', col: '#c9b8a6', dk: '#7a6656', per: 66 },
  wave: { slot: 2, name: '고래 꼬리', adj: '고래', line: '철썩! 큰 물결이 하늘을 쓸어요 — 대장의 힘', best: '전부', col: '#5fc4ff', dk: '#1a6fb0', per: 100, boss: true },
};
export const SLOT_NAME = ['머리', '등', '꼬리'];
const SLOT_COL = ['#ff8a3d', '#4f9dff', '#2fc08e'];
/** 도감 차례(돋아 본 부위) */
export const DEXP: P[] = ['fire', 'rock', 'twister', 'storm', 'ice', 'bubble', 'hammer', 'wave', 'bolt', 'spike', 'wing', 'thunder'];
/** 둘이 만나면 새 모습 */
interface Combo { a: P; b: P; name: string; line: string }
export const COMBOS: Combo[] = [
  { a: 'fire', b: 'twister', name: '불꽃 회오리', line: '회오리가 활활 타요' },
  { a: 'ice', b: 'hammer', name: '얼음 깨기', line: '언 것을 쾅 — 와장창 퍼져요' },
  { a: 'bolt', b: 'spike', name: '번개 가시', line: '가시마다 번개가 튀어요' },
  { a: 'bubble', b: 'wing', name: '거품 바람', line: '바람이 닿은 것은 거품에 갇혀요' },
  { a: 'rock', b: 'hammer', name: '쿵쾅 박치기', line: '박치기 끝에 하늘이 울려요' },
];

/** 하늘 짐승: 주는 부위 · 크기 · 체력 · 빠르기 · 몸놀림 · 공격 세기·간격 · 몸빛 · 껍데기(숨결을 막음) · 피하기 */
interface KDef {
  name: string; p: P; r: number; hp: number; spd: number; beh: Beh; dmg: number; per: number; col: string;
  shell?: boolean; evade?: number; boss?: boolean; big?: boolean; small?: boolean; fast?: boolean; shoot?: boolean;
}
export const KD: Record<K, KDef> = {
  bat: { name: '불꽃 박쥐', p: 'fire', r: 0.034, hp: 12, spd: 0.0042, beh: 'swarm', dmg: 6, per: 150, col: '#ff8a4a', small: true },
  beetle: { name: '바위 딱정벌레', p: 'rock', r: 0.047, hp: 40, spd: 0.003, beh: 'ram', dmg: 10, per: 170, col: '#a89a8a', shell: true },
  fly: { name: '바람개비 잠자리', p: 'twister', r: 0.032, hp: 16, spd: 0.024, beh: 'orbit', dmg: 5, per: 150, col: '#4fd0c4', small: true, fast: true },
  bfly: { name: '얼음 나비', p: 'ice', r: 0.034, hp: 18, spd: 0.011, beh: 'zip', dmg: 5, per: 160, col: '#8fd8ff', small: true, fast: true, evade: 0.55 },
  jelly: { name: '거품 해파리', p: 'bubble', r: 0.07, hp: 70, spd: 0.0016, beh: 'float', dmg: 9, per: 60, col: '#e0a8ff', big: true },
  squir: { name: '돌망치 다람쥐', p: 'hammer', r: 0.043, hp: 28, spd: 0.003, beh: 'snipe', dmg: 7, per: 130, col: '#d9995a', shoot: true },
  spark: { name: '번개 참새', p: 'bolt', r: 0.033, hp: 18, spd: 0.0035, beh: 'snipe', dmg: 6, per: 110, col: '#ffd93a', small: true, shoot: true },
  puff: { name: '가시 복어', p: 'spike', r: 0.056, hp: 55, spd: 0.0022, beh: 'float', dmg: 11, per: 60, col: '#ffc34a', big: true },
  owl: { name: '바람 부엉이', p: 'wing', r: 0.052, hp: 40, spd: 0.003, beh: 'snipe', dmg: 7, per: 140, col: '#b9a3ff', shoot: true },
  eagle: { name: '대장 폭풍 독수리', p: 'storm', r: 0.115, hp: 1800, spd: 0.004, beh: 'boss', dmg: 14, per: 200, col: '#9fd0ff', boss: true, big: true },
  whale: { name: '대장 구름 고래', p: 'wave', r: 0.15, hp: 3800, spd: 0.0016, beh: 'boss', dmg: 12, per: 220, col: '#9fd8ff', boss: true, big: true },
  drake: { name: '대장 번개 용', p: 'thunder', r: 0.13, hp: 3400, spd: 0.0028, beh: 'boss', dmg: 16, per: 190, col: '#ffd84a', boss: true, big: true },
};
/** 왕: 크기·체력·세기 배수 */
const KING_R = 1.75, KING_HP = 5, KING_DMG = 1.5;
/** 대장이 흘리는 것 */
const DROP_NAME: Partial<Record<K, string>> = { eagle: '폭풍 깃털', whale: '고래 꼬리', drake: '번개 뿔' };

interface Fl { k: K; n: number; king?: boolean }
interface Wave { need: number; wait: number; fl: Fl[] }
/** 별 셋째: chain = 줄줄이 N마리(약점 연쇄) · pop = 폭죽 한 번에 N마리(기운 찬 부위를 바꿀 때) · sky = 대장 힘으로 한 번에 N마리 */
interface StageDef { key: K; ch: number; name: string; news: string; n: number; star: 'chain' | 'pop' | 'sky' | 'combo'; waves: Wave[]; summon?: Fl[][] }
const W = (need: number, wait: number, ...fl: Fl[]): Wave => ({ need, wait, fl });
const F = (k: K, n: number, king = false): Fl => ({ k, n, king });
export const CHAPTERS = ['아침 구름 들판', '무지개 폭포 섬', '노을 번개 성'];
/**
 * 판 12개. 첫 떼는 들어와 있고, 다음 물결은 하늘의 적이 need 아래로 줄면(또는 wait틱 뒤) 쉴 틈 없이 오른쪽에서 몰려온다.
 * 판마다 새 짐승 하나(= 새로 돋을 수 있는 부위 하나) + 그 부위가 빛나는 상황 + 무서운 왕 하나.
 */
export const STAGES: StageDef[] = [
  { key: 'bat', ch: 0, name: '불꽃 박쥐', news: '박쥐를 톡 — 꿀꺽 먹으면 불을 뿜어요', n: 6, star: 'chain', waves: [W(0, 0, F('bat', 8)), W(2, 420, F('bat', 7), F('bat', 5)), W(2, 420, F('bat', 8)), W(2, 420, F('bat', 1, true), F('bat', 6)), W(2, 420, F('bat', 8), F('bat', 5)), W(2, 420, F('bat', 7), F('bat', 5)), W(2, 420, F('bat', 8)), W(2, 420, F('bat', 1, true), F('bat', 6)), W(2, 420, F('bat', 8), F('bat', 5)), W(2, 420, F('bat', 7), F('bat', 5)), W(2, 420, F('bat', 8)), W(2, 420, F('bat', 1, true), F('bat', 6)), W(2, 420, F('bat', 8), F('bat', 5)), W(2, 420, F('bat', 7), F('bat', 5)), W(2, 420, F('bat', 8)), W(2, 420, F('bat', 7), F('bat', 5)), W(2, 420, F('bat', 8)), W(2, 420, F('bat', 1, true), F('bat', 6))] },
  { key: 'beetle', ch: 0, name: '바위 딱정벌레', news: '딱정벌레를 먹으면 바위 갑옷 — 쿵 박치기', n: 4, star: 'chain', waves: [W(0, 0, F('beetle', 4), F('bat', 6)), W(2, 420, F('bat', 8)), W(2, 420, F('beetle', 4)), W(2, 420, F('beetle', 1, true), F('bat', 6)), W(2, 420, F('beetle', 3), F('bat', 7)), W(2, 420, F('beetle', 4), F('bat', 5)), W(2, 420, F('bat', 8)), W(2, 420, F('beetle', 4)), W(2, 420, F('beetle', 1, true), F('bat', 6)), W(2, 420, F('beetle', 3), F('bat', 7)), W(2, 420, F('beetle', 4), F('bat', 5)), W(2, 420, F('bat', 8)), W(2, 420, F('beetle', 4)), W(2, 420, F('beetle', 1, true), F('bat', 6)), W(2, 420, F('beetle', 3), F('bat', 7)), W(2, 420, F('beetle', 4), F('bat', 5)), W(2, 420, F('bat', 8)), W(2, 420, F('beetle', 4))] },
  { key: 'fly', ch: 0, name: '바람개비 잠자리', news: '잠자리를 먹으면 바람개비 꼬리 — 빙글빙글', n: 25, star: 'combo', waves: [W(0, 0, F('fly', 6), F('bat', 6)), W(2, 420, F('bat', 8), F('bat', 6)), W(2, 420, F('fly', 6), F('beetle', 3)), W(2, 420, F('fly', 1, true), F('bat', 7)), W(2, 420, F('bat', 8), F('fly', 5)), W(2, 420, F('beetle', 3), F('fly', 6)), W(2, 420, F('bat', 8), F('bat', 6)), W(2, 420, F('fly', 6), F('beetle', 3)), W(2, 420, F('fly', 1, true), F('bat', 7)), W(2, 420, F('bat', 8), F('fly', 5)), W(2, 420, F('beetle', 3), F('fly', 6)), W(2, 420, F('bat', 8), F('bat', 6)), W(2, 420, F('fly', 6), F('beetle', 3)), W(2, 420, F('fly', 1, true), F('bat', 7))] },
  { key: 'eagle', ch: 0, name: '대장 폭풍 독수리', news: '대장은 못 먹어요 — 흘린 깃털을 톡!', n: 3, star: 'sky', waves: [W(0, 0, F('eagle', 1), F('bat', 6))], summon: [[F('bat', 7)], [F('fly', 6)], [F('beetle', 3), F('bat', 4)]] },
  { key: 'bfly', ch: 1, name: '얼음 나비', news: '나비를 먹으면 얼음 숨결 — 쭉 뻗는 얼음', n: 40, star: 'combo', waves: [W(0, 0, F('bfly', 6), F('fly', 5)), W(2, 420, F('fly', 6), F('bat', 5)), W(2, 420, F('bfly', 6), F('fly', 4)), W(2, 420, F('bfly', 1, true), F('fly', 5)), W(2, 420, F('fly', 6), F('bfly', 5)), W(2, 420, F('bfly', 6), F('fly', 4), F('bat', 4)), W(2, 420, F('fly', 6), F('bat', 5)), W(2, 420, F('bfly', 6), F('fly', 4)), W(2, 420, F('bfly', 1, true), F('fly', 5)), W(2, 420, F('fly', 6), F('bfly', 5)), W(2, 420, F('bfly', 6), F('fly', 4), F('bat', 4)), W(2, 420, F('fly', 6), F('bat', 5)), W(2, 420, F('bfly', 6), F('fly', 4)), W(2, 420, F('bfly', 1, true), F('fly', 5)), W(2, 420, F('fly', 6), F('bfly', 5)), W(2, 420, F('bfly', 6), F('fly', 4), F('bat', 4)), W(2, 420, F('fly', 6), F('bat', 5)), W(2, 420, F('bfly', 6), F('fly', 4))] },
  { key: 'jelly', ch: 1, name: '거품 해파리', news: '해파리를 먹으면 거품 숨결 — 가둬서 펑', n: 30, star: 'combo', waves: [W(0, 0, F('jelly', 2), F('bfly', 5)), W(2, 420, F('beetle', 3), F('jelly', 2)), W(2, 420, F('jelly', 3), F('bfly', 5)), W(2, 420, F('jelly', 1, true), F('bfly', 5)), W(2, 420, F('beetle', 3), F('jelly', 2), F('bfly', 3)), W(2, 420, F('jelly', 3), F('bfly', 5)), W(2, 420, F('beetle', 3), F('jelly', 2)), W(2, 420, F('jelly', 3), F('bfly', 5)), W(2, 420, F('jelly', 1, true), F('bfly', 5)), W(2, 420, F('beetle', 3), F('jelly', 2), F('bfly', 3)), W(2, 420, F('jelly', 3), F('bfly', 5)), W(2, 420, F('beetle', 3), F('jelly', 2)), W(2, 420, F('jelly', 3), F('bfly', 5)), W(2, 420, F('jelly', 1, true), F('bfly', 5)), W(2, 420, F('beetle', 3), F('jelly', 2), F('bfly', 3)), W(2, 420, F('beetle', 3), F('jelly', 2))] },
  { key: 'squir', ch: 1, name: '돌망치 다람쥐', news: '다람쥐를 먹으면 망치 꼬리 — 쾅!', n: 9, star: 'combo', waves: [W(0, 0, F('squir', 3), F('jelly', 2), F('bat', 5)), W(2, 420, F('jelly', 3), F('squir', 3)), W(2, 420, F('squir', 3), F('jelly', 2), F('bat', 5)), W(2, 420, F('squir', 1, true), F('jelly', 2)), W(2, 420, F('squir', 3), F('jelly', 2), F('bat', 5)), W(2, 420, F('jelly', 3), F('squir', 3)), W(2, 420, F('jelly', 3), F('squir', 3)), W(2, 420, F('squir', 3), F('jelly', 2), F('bat', 5)), W(2, 420, F('squir', 1, true), F('jelly', 2)), W(2, 420, F('jelly', 3), F('squir', 3)), W(2, 420, F('squir', 3), F('jelly', 2), F('bat', 5)), W(2, 420, F('squir', 1, true), F('jelly', 2))] },
  { key: 'whale', ch: 1, name: '대장 구름 고래', news: '대장은 못 먹어요 — 흘린 꼬리를 톡!', n: 3, star: 'sky', waves: [W(0, 0, F('whale', 1), F('jelly', 2), F('bfly', 3))], summon: [[F('bfly', 6), F('fly', 3)], [F('fly', 6)], [F('jelly', 2), F('bfly', 3)], [F('bat', 7)]] },
  { key: 'spark', ch: 2, name: '번개 참새', news: '참새를 먹으면 번개 숨결 — 찌릿 줄줄이', n: 20, star: 'combo', waves: [W(0, 0, F('spark', 5), F('fly', 4)), W(2, 420, F('bfly', 5), F('spark', 4), F('fly', 3)), W(2, 420, F('spark', 5), F('fly', 5)), W(2, 420, F('spark', 1, true), F('fly', 5)), W(2, 420, F('bfly', 5), F('spark', 4), F('fly', 3)), W(2, 420, F('spark', 5), F('fly', 5)), W(2, 420, F('bfly', 5), F('spark', 4), F('fly', 3)), W(2, 420, F('spark', 5), F('fly', 5)), W(2, 420, F('spark', 1, true), F('fly', 5)), W(2, 420, F('bfly', 5), F('spark', 4), F('fly', 3)), W(2, 420, F('spark', 5), F('fly', 5)), W(2, 420, F('bfly', 5), F('spark', 4), F('fly', 3)), W(2, 420, F('spark', 5), F('fly', 5)), W(2, 420, F('spark', 1, true), F('fly', 5)), W(2, 420, F('bfly', 5), F('spark', 4), F('fly', 3))] },
  { key: 'puff', ch: 2, name: '가시 복어', news: '복어를 먹으면 가시 등 — 사방으로 퓽퓽', n: 11, star: 'combo', waves: [W(0, 0, F('puff', 2), F('squir', 2), F('fly', 5)), W(2, 420, F('puff', 2), F('squir', 3)), W(2, 420, F('fly', 6), F('bat', 6)), W(2, 420, F('puff', 1, true), F('squir', 3)), W(2, 420, F('puff', 2), F('squir', 2), F('fly', 5)), W(2, 420, F('puff', 3), F('squir', 3)), W(2, 420, F('puff', 2), F('squir', 3)), W(2, 420, F('fly', 6), F('bat', 6)), W(2, 420, F('puff', 1, true), F('squir', 3)), W(2, 420, F('puff', 2), F('squir', 2), F('fly', 5)), W(2, 420, F('puff', 3), F('squir', 3)), W(2, 420, F('puff', 2), F('squir', 3))] },
  { key: 'owl', ch: 2, name: '바람 부엉이', news: '부엉이를 먹으면 큰 날개 — 휙 바람', n: 18, star: 'combo', waves: [W(0, 0, F('owl', 2), F('spark', 4), F('bat', 4)), W(2, 420, F('spark', 5), F('owl', 2)), W(2, 420, F('owl', 3), F('spark', 3), F('bat', 4)), W(2, 420, F('owl', 1, true), F('spark', 4)), W(2, 420, F('owl', 3), F('spark', 4)), W(2, 420, F('squir', 3), F('owl', 2), F('spark', 3)), W(2, 420, F('spark', 5), F('owl', 2)), W(2, 420, F('owl', 3), F('spark', 3), F('bat', 4)), W(2, 420, F('owl', 1, true), F('spark', 4)), W(2, 420, F('owl', 3), F('spark', 4)), W(2, 420, F('squir', 3), F('owl', 2), F('spark', 3)), W(2, 420, F('spark', 5), F('owl', 2)), W(2, 420, F('owl', 3), F('spark', 3), F('bat', 4)), W(2, 420, F('owl', 1, true), F('spark', 4)), W(2, 420, F('owl', 3), F('spark', 4)), W(2, 420, F('spark', 5), F('owl', 2)), W(2, 420, F('owl', 3), F('spark', 3), F('bat', 4))] },
  { key: 'drake', ch: 2, name: '대장 번개 용', news: '마지막 대장 — 흘린 뿔을 먹으면 천둥이 내 것', n: 3, star: 'sky', waves: [W(0, 0, F('drake', 1), F('spark', 4))], summon: [[F('spark', 6)], [F('fly', 6)], [F('spark', 4), F('fly', 3)], [F('bfly', 5)], [F('owl', 2), F('spark', 4)]] },
];
export const STAGE_COUNT = STAGES.length;
/** 장 끝 둘 중 하나(하늘의 큰 물건) */
export const PERKS: { name: string; line: string }[][] = [
  [{ name: '황금 이빨', line: '한 입에 둘 더 꿀꺽' }, { name: '용의 알 껍데기', line: '맞아도 반만 아파요' }],
  [{ name: '무지개 비늘', line: '떨어진 부위가 큰 폭죽' }, { name: '꿀단지', line: '같은 걸 또 먹으면 두 단계' }],
];
/** 배우는 판은 너그럽게: 적이 주는 피해 배수 */
const EZ = [0.35, 0.6, 0.85, 0.85, 1.2, 1.3, 1.25, 0.9, 1.2, 0.8, 1.4, 1.1];
/** 대장이 흘린 것: 잡히는 거리 · 머무는 틱 */
const ITEM_R = 0.13, ITEM_T = 360;
/** 대장이 제 부위를 흘리는 체력 */
const DROP_AT = [0.85, 0.6, 0.35, 0.12];
/** 가운데 이름표 카드가 머무는 틱 (0.9초) */
const CARD_T = 54;
/** 용 레벨이 오르면 달라지는 것 */
const LV_GIFT: Record<number, string> = { 3: '작은 뿔이 돋았어요', 5: '한 입이 커졌어요(넷)', 7: '등지느러미가 생겼어요', 9: '뿔이 크게 자랐어요', 11: '금빛 비늘이 반짝여요' };

// ───────────────────────────── 상태 ─────────────────────────────
/** 적 상태: 들어오는 중 · 날기 · 뜸 들이기 · 달려듦 · 돌아감 · 먹히는 중 */
const ENTER = 0, IDLE = 1, WIND = 2, DASH = 3, BACK = 4, HELD = 5;
interface Mon {
  id: number; k: K; fid: number; king: boolean; x: number; y: number; vx: number; vy: number; r: number; r0: number; hp: number; max: number;
  st: number; tm: number; et: number; cool: number; face: number;
  /** 대열에서의 자리 · 자기 자리(쏘는 놈) · 궤도 각 · 들어오는 출발점 · 겨눈 곳 */
  ox: number; oy: number; px: number; py: number; ang: number; fx0: number; fy0: number; ax: number; ay: number;
  /** 언 틱 · 거품에 갇힌 틱(거품 번호) · 회오리에 잡힘(회오리 번호) · 기절 · 맞은 뒤 쉼 · 부풂(복어) */
  frozen: number; trap: number; trapE: number; trapD: number; caught: number; stun: number; dom: number; puff: number;
  /** 화남: 안 듣는 공격에 맞으면 한동안 더 자주·세게 덤빈다 */
  rage: number;
  dead: boolean; drops: number;
  // 연출 (시뮬레이션 결과와 무관)
  seed: number; born: number; hurtT: number; atkT: number;
}
interface Flock { id: number; k: K; x: number; y: number; tx: number; ty: number; t: number; king: boolean; n0: number; oy: number }
/** 몸에 돋은 부위: 단계 · 튼튼함 · 기운(싸울수록 차오르고, 밀려날 때 그만큼 크게 터진다) */
interface Part { p: P; g: number; hp: number; max: number; born: number; ch: number }
interface Fly { x0: number; y0: number; to: number; ids: number[]; item: number; t: number; T: number }
interface Me {
  x: number; y: number; vx: number; vy: number; face: number; parts: (Part | null)[]; tint: string;
  chew: number; fly: Fly | null; inv: number; hurtT: number;
  /** 자리마다 공격 쉼 · 마지막 공격 틱 · 겨눈 각/거리 */
  cd: number[]; atkT: number[]; aim: number[]; reach: number[];
  /** 바위 박치기 남은 틱·방향 · 먹은 틱 · 맨몸 깨물기 쉼 · 꼬리 휘두름(망치) 자리 */
  ram: number; ramA: number; ramE: number; eatT: number; nib: number; tx: number; ty: number; foc: number;
}
/** 적 총알: 0 불티(참새) · 1 도토리(다람쥐, 포물선) · 2 바람(부엉이) · 3 물방울(고래) · 4 깃털 칼날(독수리) */
interface Shot { k: number; x: number; y: number; vx: number; vy: number; dmg: number; t: number; r: number }
/** 내 것: 가시 · 거품 · 바람 물결 · 폭풍 · 고래 물결 */
interface Mine { k: 'needle' | 'bubble' | 'gust' | 'storm' | 'wave'; x: number; y: number; vx: number; vy: number; t: number; T: number; r: number; dmg: number; eid: number; hit: number[]; tgt: number }
interface Twister { id: number; x: number; y: number; t: number; T: number; r: number; fire: boolean; eid: number; pw: number }
interface Item { id: number; k: K; p: P; x: number; y: number; vy: number; t: number; tx: number; ty: number }
/** 뒤에 일어날 일: 번개 용의 낙뢰 · 딱 맞는 공격의 연쇄 */
interface Q { t: number; k: 'strike' | 'chain'; x: number; y: number; r: number; dmg: number; eid?: number; kind?: Atk; left?: number; first?: boolean; hit?: number[] }
interface Ev { t: number; k: string; x: number; y: number; n: number; x2: number; y2: number; text: string }
/** 그려지는 줄: 0 번개 · 1 얼음 · 2 하늘 벼락 · 3 번개 용 숨결 · 4 연쇄 */
interface Line { k: number; x0: number; y0: number; x1: number; y1: number; t: number; col?: string }
/** 사라지는 몸 (연출): 0 터짐 · 1 먹힘 */
interface Corpse { k: K; x: number; y: number; t: number; how: number; vx: number; vy: number; seed: number; king: boolean; r: number }
/** 떨어져 나가는 옛 부위 (연출) */
interface Shed { p: P; g: number; x: number; y: number; vx: number; vy: number; t: number; pop: boolean }

export interface DrState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result' | 'pick' | 'fail' | 'end'; pt: number;
  /** 하트 · 지난 판까지 점수 · 이번 판 점수(별로 곱해지기 전) · 별 · 이번 판 별 */
  hearts: number; hp: number; pts: number; sp: number; stars: number; got: number; starOk: boolean[]; combo: number; comboT: number; comboBest: number; popBest: number; popN: number; popT: number; skyBest: number; skyE: number; skyC: number; dead: boolean; won: boolean; lostHeart: boolean;
  /** 용 레벨 · 장 끝에 고른 것(0 아직 · 1 왼쪽 · 2 오른쪽) · 방금 고른 것 · 도감(부위) · 이번 판에 새로 돋은 것 · 만든 조합 */
  lv: number; perk: number[]; picked: number; dex: P[]; newDex: P[]; combos: string[]; newCombo: string[]; forms: string[];
  me: Me; mons: Mon[]; flocks: Flock[]; nid: number; shots: Shot[]; mines: Mine[]; twisters: Twister[]; items: Item[]; q: Q[];
  /** 공격 번호 · 공격마다 쓰러뜨린 수 · 이 판 최고(한 번에) · 쓰러뜨린 수 · 먹은 수 · 결과 점수 */
  eid: number; chE: number; evN: Map<number, number>; best: number; kills: number; wkills: number; eats: number; gain: number; fast: number; stT: number;
  wave: number; waveT: number; inbox: Fl[]; summonT: number; summonI: number; dropT: number; clearT: number; started: boolean; calm: number;
  events: Ev[]; lines: Line[]; corpses: Corpse[]; sheds: Shed[];
  /** 멈칫: 큰 순간에 세상이 몇 틱 멈춘다(손맛) */
  freeze: number;
  down: boolean; wowN: number; firstTap: number; firstBig: number; denyT: number; fails: number;
  seen: Set<string>;
  banner: { head: string; sub: string; t: number } | null; spot: { id: number; t: number; label: string } | null;
  /** 큰 띠(한 번에 하나) */
  big: { text: string; sub: string; t: number; pri: number; col: string; n: number; eid: number; star: boolean; p: P | null } | null;
  /** 다음에 띄울 이름표 카드 (앞 카드가 0.5초는 보이게) */
  cardQ: { text: string; sub: string; t: number; pri: number; col: string; n: number; eid: number; star: boolean; p: P | null }[];
}

// ───────────────────────────── 도구 ─────────────────────────────
/** 빗변: Math.hypot은 엔진마다 끝자리가 다를 수 있어 제곱근으로 직접 */
const hyp = (a: number, b: number) => Math.sqrt(a * a + b * b);
const dist = (ax: number, ay: number, bx: number, by: number) => hyp(ax - bx, ay - by);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const angDiff = (a: number, b: number) => {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
};
const ev = (s: DrState, k: string, x: number, y: number, n = 0, x2 = 0, y2 = 0, text = '') => void s.events.push({ t: s.t, k, x, y, n, x2, y2, text });
const see = (s: DrState, key: string) => void s.seen.add(key);
const hittable = (m: Mon) => !m.dead && m.st !== ENTER && m.st !== HELD;
const isBoss = (m: Mon) => !!KD[m.k].boss;
export const has = (s: DrState, p: P) => s.me.parts[PD[p].slot]?.p === p;
const comboOn = (s: DrState, name: string) => COMBOS.some((c) => c.name === name && has(s, c.a) && has(s, c.b));
/** 용 몸 반지름(레벨이 오르면 조금씩) */
export const meR = (s: DrState) => 0.064 * (1 + 0.024 * (s.lv - 1)) * (has(s, 'rock') ? 1.1 : 1);
/** 부위 힘: 용 레벨 × 단계 */
const pw = (s: DrState, g = 1) => (1 + 0.06 * (s.lv - 1)) * [1, 1, 1.6, 2.4][g];
export const bite = (s: DrState) => 2 + (s.lv >= 5 ? 1 : 0) + (s.perk[0] === 1 ? 2 : 0);
/** 입 · 부위 자리 (화면 좌표) */
const mouth = (s: DrState): [number, number] => [s.me.x + s.me.face * meR(s) * DK * 1.35, s.me.y - meR(s) * DK * 0.45];
const slotPos = (s: DrState, slot: number): [number, number] => {
  const me = s.me, r = meR(s) * DK;
  return slot === 0 ? [me.x + me.face * r * 0.75, me.y - r * 1.35] : slot === 1 ? [me.x - me.face * r * 0.15, me.y - r * 0.9] : [me.x - me.face * r * 1.7, me.y - r * 0.1];
};
const foes = (s: DrState) => s.mons.reduce((a, m) => a + (!m.dead && !isBoss(m) ? 1 : 0), 0);
const aggressive = (s: DrState) => s.started && s.calm <= 0;
export const BARE_TINT = '#7fdc9a';
const kingMul = (m: Mon) => (m.king ? KING_DMG : 1);

/** 큰 순간을 센다 (계기판) */
function wowN(s: DrState) {
  s.wowN++;
  if (s.firstBig < 0 && s.firstTap >= 0) s.firstBig = s.t;
  see(s, 'wow');
}
/** 가운데 이름표 카드 (0.9초): 새 부위가 처음 돋을 때 · 별 셋째 · 대장 순간에만 */
function card(s: DrState, text: string, sub: string, pri: number, col: string, p: P | null, star = false) {
  wowN(s);
  const b = s.big, c = { text, sub, t: s.t, pri, col, n: 0, eid: 0, star, p };
  // 앞 카드가 막 떴으면 줄을 세운다 (첫 변신 카드가 별 카드에 바로 덮이지 않게)
  if (b && s.t - b.t < 30) return void (s.cardQ.length < 2 && s.cardQ.push(c));
  s.big = c;
  s.freeze = Math.max(s.freeze, 3);
}
function keepIn(m: { x: number; y: number; r: number }) {
  m.y = clamp(m.y, FY0 + m.r * 0.5, FY1 - m.r * 0.3);
  m.x = clamp(m.x, -0.04, 1.08);
}

// ───────────────────────────── 쓰러뜨리기 ─────────────────────────────
/** 쓰러뜨리기 — weak: 약점을 찌른 공격(딱 맞아!)이면 10점 + 줄줄이 n번째는 ⌈n²/4⌉점 더, 아니면 1점 */
function kill(s: DrState, m: Mon, eid: number, how = 0, weak = false) {
  if (m.dead) return;
  m.dead = true;
  s.kills++;
  let n = 0;
  if (eid > 0 && weak) {
    n = (s.evN.get(eid) ?? 0) + 1;
    s.evN.set(eid, n);
    if (s.evN.size > 40) s.evN.delete(s.evN.keys().next().value as number);
    // 딱 맞아 이어 가기: 맞는 공격으로 쓰러뜨릴 때마다 하나씩 쌓이고, 그만큼 점수
    s.combo++;
    s.comboT = s.t;
    s.hp = Math.min(HP_MAX, s.hp + 0.7);
    if (s.combo > s.comboBest) s.comboBest = s.combo;
    const d = STAGES[s.stage];
    if (d.star === 'combo' && s.combo === d.n) card(s, '별 셋째!', `딱 맞아 ${d.n}`, 3, '#ffb800', null, true), ev(s, 'star3', m.x, m.y);
    s.sp += (4 + s.combo) * stMul(s), (__dbg.weak += (4 + s.combo) * stMul(s));
    s.wkills++;
    if (n > s.best) {
      const star = d.star === 'chain' && s.best < d.n && n >= d.n;
      s.best = n;
      if (star) card(s, '별 셋째!', `줄줄이 ${n}마리`, 3, '#ffb800', null, true), ev(s, 'star3', m.x, m.y);
      else if (n === WOW_N) wowN(s);
    }
  } else (s.sp += 1), (__dbg.plain += 1);
  if (m.king) s.sp += 20;
  s.corpses.push({ k: m.k, x: m.x, y: m.y, t: s.t, how, vx: m.vx, vy: m.vy, seed: m.seed, king: m.king, r: m.r });
  if (s.corpses.length > 26) s.corpses.shift();
  ev(s, how === 1 ? 'eaten' : 'kill', m.x, m.y, n, m.r, 0, m.k);
  if (isBoss(m)) bossDown(s, m);
}
/** 공격 종류: 숨결 넷 · 하늘(대장의 힘) · 박치기 · 가시 · 바람 · 망치 · 회오리 · 떨어진 부위 · 깨물기 */
type Atk = 'fire' | 'ice' | 'bolt' | 'bubble' | 'sky' | 'ram' | 'needle' | 'gust' | 'hammer' | 'twist' | 'shed' | 'nibble' | 'pop';
/** 짐승마다 조금 덜 드는 것 (배수 0.8~1: 어떤 부위든 제 몫은 한다 — 딱딱한 껍데기는 숨결이 조금 미끄러진다) */
const RES: Partial<Record<K, Partial<Record<Atk, number>>>> = {
  beetle: { fire: 0.8, ice: 0.85, bolt: 0.85, needle: 0.8, gust: 0.85 },
  jelly: { fire: 0.85, needle: 0.85 },
  puff: { needle: 0.8 },
  owl: { gust: 0.85 },
};
/** 이 공격이 이 짐승에게 얼마나 드나 (봇의 셈) */
export const effk = (a: Atk, k: K) => resOf(k, a) * (WEAK[k].includes(a) ? WEAK_MUL : 1);
function resOf(k: K, a: Atk) {
  return WEAK[k].includes(a) ? 1 : RES[k]?.[a] ?? 1;
}
/** 어울림: 어울리는 공격은 두 배로 크게 터지고, 곁의 같은 짐승에게 줄줄이 번진다 (그림으로 짐작: 딱딱한 것엔 망치·박치기, 빠른 것엔 얼음, 작은 떼엔 불·회오리) */
export const WEAK: Record<K, Atk[]> = {
  bat: ['fire', 'twist', 'needle'], beetle: ['ram', 'hammer', 'bubble'], fly: ['ice', 'needle'], bfly: ['ice', 'twist', 'bolt'], jelly: ['ice', 'hammer'],
  squir: ['bubble', 'gust'], spark: ['twist', 'gust'], puff: ['hammer'], owl: ['bolt'], eagle: [], whale: [], drake: [],
};
const WEAK_MUL = 2;
/** 딱 맞아 이어 가기: 이만큼(3초) 딱 맞게 못 쓰러뜨리면 끊긴다 */
const COMBO_T = 180;
/** 용의 체력(하트 하나만큼) */
const HP_MAX = 30;
/** 연쇄 불티 빛깔 (공격 종류마다) */
const CHAIN_COL: Record<Atk, string> = { fire: '255,138,40', ice: '110,200,255', bolt: '255,214,40', bubble: '210,150,255', sky: '255,230,90', ram: '190,170,150', needle: '255,190,60', gust: '170,150,255', hammer: '200,170,140', twist: '90,230,190', shed: '255,255,255', nibble: '255,255,255', pop: '255,120,200' };
/** 부위의 공격 종류 */
const ATK_OF: Record<P, Atk> = { fire: 'fire', ice: 'ice', bubble: 'bubble', bolt: 'bolt', thunder: 'sky', rock: 'ram', spike: 'needle', wing: 'gust', storm: 'sky', twister: 'twist', hammer: 'hammer', wave: 'sky' };
/** 공격 종류가 나오는 자리 (연쇄 크기는 그 부위의 단계로) */
const ATK_SLOT: Record<Atk, number> = { fire: 0, ice: 0, bolt: 0, bubble: 0, sky: 0, ram: 1, needle: 1, gust: 1, hammer: 2, twist: 2, shed: 0, nibble: 0, pop: 0 };
/** 회오리에 빨려 드는 작은 것 */
const catchable = (m: Mon) => m.r0 <= 0.041 && !KD[m.k].shell && !KD[m.k].boss;
/** 적을 때린다 */
function hurt(s: DrState, m: Mon, amt: number, eid: number, kind: Atk, kx = 0, ky = 0, left = -1): boolean {
  if (!hittable(m)) return false;
  const kd = KD[m.k], weak = kind === 'sky' || WEAK[m.k].includes(kind);
  // 어울리는 공격: 두 배로 크게
  if (weak) amt *= WEAK_MUL;
  amt *= resOf(m.k, kind);
  if (m.frozen > 0) amt *= 1.8;
  // 대장은 대장의 힘에 크게 다친다 (다른 공격은 조금)
  if (kd.boss) amt *= kind === 'sky' ? 1.25 : 0.35;
  if (weak && eid > 0 && left !== 0) {
    // 딱 맞는 공격은 맞힌 순간 곁의 같은 약점으로 번진다 (부위가 클수록 멀리·많이)
    const g = s.me.parts[ATK_SLOT[kind]]?.g ?? 1, n = left < 0 ? [0, 3, 5, 8][g] : left - 1;
    if (n > 0) s.q.push({ t: s.t + 4, k: 'chain', x: m.x, y: m.y, r: 0.2 + 0.06 * g, dmg: amt / WEAK_MUL / (m.frozen > 0 ? 1.8 : 1), eid, kind, left: n, first: left < 0, hit: [m.id] });
  }
  m.hp -= amt;
  m.hurtT = s.t;
  if (!kd.boss && (kx || ky)) (m.vx += kx), (m.vy += ky);
  if (kd.boss) bossHurt(s, m);
  if (m.hp <= 0) {
    // 싸운 부위에 기운이 찬다 (딱 맞게 쓰러뜨리면 두 배)
    kill(s, m, eid, 0, weak);
    if (kind === 'sky' && eid > 0) skyScore(s, eid);
    return true;
  }
  return false;
}
/** 둥근 범위를 모두 때린다 */
function blast(s: DrState, x: number, y: number, r: number, dmg: number, eid: number, knock: number, kind: Atk) {
  let n = 0;
  for (const m of s.mons) {
    if (!hittable(m)) continue;
    const d = dist(x, y, m.x, m.y);
    if (d > r + m.r * 0.6) continue;
    const a = d > 1e-4 ? Math.atan2(m.y - y, m.x - x) : m.seed;
    hurt(s, m, dmg, eid, kind, Math.cos(a) * knock, Math.sin(a) * knock);
    n++;
  }
  return n;
}
function nearest(s: DrState, x: number, y: number, lim: number, ok: (m: Mon) => boolean = () => true): Mon | null {
  let o: Mon | null = null, od = lim;
  for (const m of s.mons) {
    if (!hittable(m) || !ok(m)) continue;
    const d = dist(x, y, m.x, m.y) - m.r;
    if (d < od) (od = d), (o = m);
  }
  return o;
}

// ───────────────────────────── 내가 맞는다 ─────────────────────────────
function hurtMe(s: DrState, dmg: number, x: number, y: number) {
  const me = s.me;
  if (me.inv > 0 || s.phase !== 'play') return;
  dmg *= EZ[s.stage];
  if (s.perk[0] === 2) dmg *= 0.5;
  if (has(s, 'rock')) dmg *= 0.3;
  else if (has(s, 'storm')) dmg *= 0.5;
  me.hurtT = s.t;
  me.inv = 14;
  // 용의 체력이 준다 — 다 닳으면 하트 하나 (부위는 싸움만 한다: 자주 먹는다고 안 다치지 않는다)
  s.hp -= dmg;
  ev(s, 'ouch', x, y, -1, dmg);
  if (s.hp > 0) return;
  s.hp = HP_MAX;
  s.hearts--;
  s.lostHeart = true;
  me.inv = 110;
  ev(s, 'heart', me.x, me.y - meR(s));
  see(s, 'heart');
  if (s.hearts <= 0) failStage(s);
}
// ───────────────────────────── 먹기 ─────────────────────────────
/** 톡한 곳에서 가장 가까운 먹을 것 (큰 몸일수록 넉넉히 잡힌다 — 늘 무언가는 잡힌다) */
export function pickEdible(s: DrState, x: number, y: number): { m: Mon | null; it: Item | null } | null {
  let bm: Mon | null = null, bi: Item | null = null, bv = 1e9;
  for (const m of s.mons) {
    if (!hittable(m) || isBoss(m)) continue;
    const v = dist(x, y, m.x, m.y) - m.r * 1.2;
    if (v < bv) (bv = v), (bm = m), (bi = null);
  }
  // 대장이 흘린 것은 그 가까이를 톡해야 잡힌다
  for (const it of s.items) {
    const d = dist(x, y, it.x, it.y);
    if (d < ITEM_R && d < bv) (bv = d), (bi = it), (bm = null);
  }
  return bm || bi ? { m: bm, it: bi } : null;
}
/** 이 짐승을 먹으러 가면 한 입에 들어갈 떼 (가까운 순) */
export function biteList(s: DrState, m: Mon): Mon[] {
  if (m.king || !KD[m.k].small) return [m];
  const mates = s.mons.filter((o) => o !== m && hittable(o) && o.fid === m.fid && !o.king && dist(o.x, o.y, m.x, m.y) < 0.22);
  mates.sort((a, b) => dist(a.x, a.y, m.x, m.y) - dist(b.x, b.y, m.x, m.y) || a.id - b.id);
  return [m, ...mates.slice(0, bite(s) - 1)];
}
function onTap(s: DrState, x: number, y: number) {
  if (s.firstTap < 0) s.firstTap = s.t;
  const me = s.me;
  if (me.fly) return;
  if (me.chew > 0) return void ((s.denyT = s.t), ev(s, 'deny', x, y));
  const c = pickEdible(s, x, y);
  if (!c) return;
  ev(s, 'tap', x, y);
  let ids: number[] = [], item = 0, tx = me.x, ty = me.y;
  if (c.it) (item = c.it.id), (tx = c.it.x), (ty = c.it.y);
  else if (c.m) {
    // 톡한 떼에서 용에게 가장 가까운 쪽부터 꿀꺽 (남은 떼가 앞에 남는다)
    let first = c.m;
    if (!c.m.king && KD[c.m.k].small)
      for (const o of s.mons) if (hittable(o) && o.fid === c.m.fid && !o.king && dist(o.x, o.y, me.x, me.y) < dist(first.x, first.y, me.x, me.y)) first = o;
    c.m = first;
    const list = biteList(s, c.m);
    ids = list.map((o) => o.id);
    tx = c.m.x;
    ty = c.m.y;
    for (const o of list) (o.st = HELD), (o.tm = 0), (o.vx = o.vy = 0), (o.frozen = o.trap = o.caught = 0);
  }
  me.face = tx >= me.x ? 1 : -1;
  me.ram = 0;
  me.fly = { x0: me.x, y0: me.y, to: ids[0] ?? 0, ids, item, t: 0, T: GULP_T + Math.round(dist(me.x, me.y, tx, ty) * 20) };
  s.started = true;
  ev(s, 'go', me.x, me.y, ids.length, tx, ty);
}
function flyStep(s: DrState) {
  const me = s.me, f = me.fly!, r = meR(s);
  f.t++;
  let tx = me.x, ty = me.y;
  const it = f.item ? s.items.find((i) => i.id === f.item) : undefined, m = f.to ? s.mons.find((o) => o.id === f.to && !o.dead) : undefined;
  if (it) (tx = it.x), (ty = it.y);
  else if (m) (tx = m.x), (ty = m.y);
  // 입이 먹이에 닿게
  tx -= me.face * r * 1.25;
  ty += r * 0.45;
  const q = clamp(f.t / f.T, 0, 1), e = q * q * (3 - 2 * q);
  me.x = f.x0 + (tx - f.x0) * e;
  me.y = f.y0 + (ty - f.y0) * e - Math.sin(q * Math.PI) * 0.05;
  if (f.t >= f.T) arrive(s);
}
function arrive(s: DrState) {
  const me = s.me, f = me.fly!;
  me.fly = null;
  me.vx = me.vy = 0;
  let p: P | null = null, k: K | null = null, power = false, n = 0;
  if (f.item) {
    const it = s.items.find((i) => i.id === f.item);
    if (it) (p = it.p), (k = it.k), (power = true), (s.items = s.items.filter((i) => i !== it));
  }
  for (const id of f.ids) {
    const m = s.mons.find((o) => o.id === id && !o.dead);
    if (!m) continue;
    k = m.k;
    p = KD[m.k].p;
    power ||= m.king;
    n++;
    kill(s, m, 0, 1);
  }
  me.chew = CHEW_T;
  me.eatT = s.t;
  s.eats++;
  // 꿀꺽 하고 뒤로 통 — 새 부위가 날뛸 자리를 만든다
  me.vx = -me.face * 0.012;
  me.vy = -0.003;
  if (s.combo >= 2) firework(s);
  if (!p || !k) return void ev(s, 'miss', me.x, me.y);
  ev(s, 'gulp', me.x, me.y, n, 0, 0, k);
  attach(s, p, k, power);
}
/** 먹은 것의 부위가 돋는다: 옛 부위는 폭죽처럼 펑 떨어져 나가고, 같은 것이면 한 단계 커진다 */
function attach(s: DrState, p: P, k: K, power: boolean) {
  const me = s.me, d = PD[p], slot = d.slot, old = me.parts[slot];
  const max = (p === 'rock' ? 44 : 18) * (d.boss ? 2 : 1);
  let g = power ? 3 : 1;
  const first = !s.dex.includes(p);
  if (old && old.p === p) {
    g = Math.min(3, Math.max(g, old.g + (s.perk[1] === 2 ? 2 : 1)));
    if (g > old.g) ev(s, 'grow', ...slotPos(s, slot), g, slot, 0, p);
  } else if (old) shed(s, old, slot);
  const fresh = !old || old.p !== p || g > old.g;
  me.parts[slot] = { p, g, hp: max, max, born: s.t, ch: old && old.p === p ? old.ch : 0 };
  me.tint = d.boss ? d.col : KD[k].col;
  // 새 부위(또는 커진 부위)는 돋자마자 한 번 날뛴다
  if (fresh) me.cd[slot] = 0;
  ev(s, 'part', ...slotPos(s, slot), g, slot, 0, p);
  see(s, 'p:' + p);
  if (first) s.dex.push(p), s.newDex.push(p);
  if (power) {
    see(s, 'power:' + k);
    if (d.boss) {
      // 대장의 힘: 먹은 횟수가 대장 판의 별 셋째
      // 대장의 힘: 먹은 횟수가 대장 판의 별 셋째
      s.skyBest++;
      s.sp += 30 * stMul(s);
      const sd = STAGES[s.stage];
      if (sd.star === 'sky' && s.skyBest === sd.n) card(s, '별 셋째!', `대장의 힘 ${sd.n}번`, 4, '#ffb800', null, true), ev(s, 'star3', me.x, me.y);
      else card(s, d.name, '대장의 힘!', 4, d.col, p);
    } else wowN(s);
    ev(s, 'power', me.x, me.y, 0, 0, 0, p);
  } else if (first) card(s, d.name, d.line, 2, d.col, p);
  for (const c of COMBOS) {
    if ((c.a !== p && c.b !== p) || !has(s, c.a) || !has(s, c.b)) continue;
    ev(s, 'combo', me.x, me.y - meR(s) * 2, 0, 0, 0, c.name);
    see(s, 'c:' + c.name);
    if (!s.combos.includes(c.name)) s.combos.push(c.name), s.newCombo.push(c.name), wowN(s);
  }
  if (me.parts.every(Boolean)) {
    const nm = formName(s);
    if (!s.forms.includes(nm)) s.forms.push(nm), see(s, 'f:' + nm);
  }
}
/** 지금 모습 이름 (예: 불꽃 바위 망치 용) */
export function formName(s: DrState): string {
  const ps = s.me.parts.filter(Boolean) as Part[];
  return ps.length ? ps.map((q) => PD[q.p].adj).join(' ') + ' 용' : '맨몸 아기 용';
}
/** 옛 부위가 반짝이며 떨어져 나가 작은 폭죽 (무지개 비늘이면 크게) */
function shed(s: DrState, old: Part, slot: number) {
  const me = s.me, rb = s.perk[1] === 1, R = rb ? 0.2 : 0.12, dmg = (rb ? 18 : 6) * pw(s, old.g), [x, y] = slotPos(s, slot);
  s.sheds.push({ p: old.p, g: old.g, x, y, vx: -me.face * 0.006 + (slot - 1) * 0.002, vy: -0.012, t: s.t, pop: true });
  ev(s, 'shed', x, y, 2, R, 0, old.p);
  blast(s, me.x, me.y, R, dmg, 0, 0.014, 'shed');
}
/** 먹는 순간, 쌓인 딱 맞아가 폭죽으로 펑 — 많이 쌓을수록 크고 세다 (붐비는 떼에서 먹으면 한꺼번에) */
function firework(s: DrState) {
  const me = s.me, n0 = Math.min(s.combo, 16), R = (0.07 + 0.02 * n0) * (s.perk[1] === 1 ? 1.25 : 1), dmg = (16 + 10 * n0) * pw(s, 1);
  ev(s, 'boom', me.x, me.y, n0, R);
  if (n0 >= 6) see(s, 'bigboom');
  s.combo = 0;
  const k0 = s.kills;
  blast(s, me.x, me.y, R, dmg, ++s.eid, 0.02, 'pop');
  popScore(s, s.kills - k0, me.x, me.y);
}
/** 딱 맞아 이어 가기가 끊긴다 (맞았거나 3초 동안 딱 맞게 못 쓰러뜨림) */
function comboBreak(s: DrState) {
  if (s.combo >= 3) ev(s, 'cbreak', s.me.x, s.me.y, s.combo);
  s.combo = 0;
}
/** 대장의 힘(천둥·폭풍·고래 물결) 한 번에 쓰러뜨린 수 */
function skyScore(s: DrState, eid: number) {
  s.skyC = s.skyE === eid ? s.skyC + 1 : 1;
  s.skyE = eid;
  const n = s.skyC;
  s.sp += Math.ceil((n * n) / 4) * stMul(s), (__dbg.sky += Math.ceil((n * n) / 4) * stMul(s));
  if (n >= WOW_N) wowN(s);
}
/** 이 판 별 셋째의 지금 기록 */
export const starNow = (s: DrState) => { const d = STAGES[s.stage]; return d.star === 'pop' ? s.popBest : d.star === 'sky' ? s.skyBest : d.star === 'combo' ? s.comboBest : s.best; };
/** 판이 갈수록 점수가 커진다 (뒤 판일수록 고르는 솜씨가 크게 갈린다) */
const stMul = (s: DrState) => 0.25 + s.stage;
/** 폭죽 한 번에 쓰러뜨린 수 (연쇄로 이어진 것은 다음 틱에 더해진다) */
function popScore(s: DrState, n: number, x: number, y: number) {
  if (n <= 0) return;
  // 폭죽: 한 번에 n마리면 1+4+9+…+n² 점 — 기운 찬 부위를 붐빌 때 바꿀수록 훨씬 크다
  for (let i = 1; i <= n; i++) (s.sp += 2 * i * i * stMul(s)), (__dbg.pop += 2 * i * i * stMul(s));
  s.popN = n;
  s.popT = s.t;
  ev(s, 'popn', x, y, n);
  if (n <= s.popBest) return;
  const d = STAGES[s.stage], star = d.star === 'pop' && s.popBest < d.n && n >= d.n;
  s.popBest = n;
  if (star) card(s, '별 셋째!', `폭죽 ${n}마리`, 3, '#ffb800', null, true), ev(s, 'star3', x, y);
  else if (n >= WOW_N) wowN(s);
}

// ───────────────────────────── 내 몸: 저절로 싸운다 ─────────────────────────────
/** 지금 몸이 노리는 적 (머리 숨결 → 등 → 꼬리 순으로 좋아하는 것) */
function focus(s: DrState): Mon | null {
  const me = s.me, [h, b, tl] = me.parts;
  let best: Mon | null = null, bv = -1e9;
  for (const m of s.mons) {
    if (!hittable(m)) continue;
    const kd = KD[m.k], d = dist(me.x, me.y, m.x, m.y);
    let near = 0;
    for (const o of s.mons) if (o !== m && hittable(o) && dist(m.x, m.y, o.x, o.y) < 0.14) near += KD[o.k].shell ? 0.3 : 1;
    let v = -d * 2;
    const hp = h?.p, tp = tl?.p, bp = b?.p;
    for (const q of me.parts) if (q && WEAK[m.k].includes(ATK_OF[q.p])) v += 2.5;
    if (hp === 'fire') v += near * 1.2 - (kd.shell ? 2 : 0);
    else if (hp === 'ice') v += (kd.fast ? 3 : 0) + near * 0.4;
    else if (hp === 'bubble') v += (kd.big ? 3 : 0) + (kd.boss ? 4 : 0);
    else if (hp === 'bolt') v += near * 0.3 + (kd.shoot ? 1 : 0);
    else if (tp === 'hammer') v += (kd.big ? 2 : 0) + (kd.shell ? 2.5 : 0);
    else if (bp === 'spike' || tp === 'twister') v += near * 1;
    else if (bp === 'rock') v += kd.shell ? 2 : 0;
    if (kd.boss) v += hp === 'thunder' || bp === 'storm' || tp === 'wave' ? 3 : 0.5;
    if (v > bv) (bv = v), (best = m);
  }
  return best;
}
function move(s: DrState) {
  const me = s.me, r = meR(s), [h, b, tl] = me.parts;
  if (!s.started) me.foc = 0;
  else if (s.t % 8 === 0 || !s.mons.some((m) => m.id === me.foc && hittable(m))) me.foc = focus(s)?.id ?? 0;
  const tgt = me.foc ? s.mons.find((m) => m.id === me.foc) : undefined;
  let tx = HOME_X, ty = HOME_Y + Math.sin(s.t * 0.012) * 0.12;
  if (tgt) {
    const side = tgt.x >= me.x - 0.08 ? 1 : -1, hp = h?.p;
    if (hp && hp !== 'thunder') {
      const gap = (hp === 'fire' ? 0.2 + 0.035 * h!.g : hp === 'ice' ? 0.3 : hp === 'bolt' ? 0.34 : 0.32) + tgt.r;
      tx = tgt.x - side * gap;
      ty = tgt.y + r * 0.45;
    } else if (b?.p === 'spike' || tl?.p === 'hammer' || tl?.p === 'twister' || !me.parts.some(Boolean)) {
      tx = tgt.x - side * (tgt.r + r) * 0.95;
      ty = tgt.y;
    } else {
      tx = Math.min(0.42, tgt.x - 0.28);
      ty = tgt.y;
    }
  }
  // 날아오는 것이 곧 닿으면 위아래로 살짝 비킨다 (저절로)
  let dodge = 0;
  for (const q of s.shots) {
    const rx = q.x - me.x, ry = q.y - me.y, vv = q.vx * q.vx + q.vy * q.vy;
    if (vv < 1e-8) continue;
    const tt = -(rx * q.vx + ry * q.vy) / vv;
    if (tt < 0 || tt > 40) continue;
    const cx = rx + q.vx * tt, cy = ry + q.vy * tt;
    if (Math.sqrt(cx * cx + cy * cy) < r + q.r + 0.02) dodge += cy > 0 ? -1 : 1;
  }
  if (dodge) ty = me.y + Math.sign(dodge) * 0.14;
  tx = clamp(tx, 0.07, 0.8);
  ty = clamp(ty, ME_Y0, ME_Y1);
  const spd = (dodge ? 1.6 : 1) * 0.0062 * (b?.p === 'wing' ? 1.9 : b?.p === 'storm' ? 1.7 : b?.p === 'rock' ? 0.85 : 1);
  const dx = tx - me.x, dy = ty - me.y, d = hyp(dx, dy), v = Math.min(spd, d * 0.09);
  if (d > 1e-4) (me.vx += ((dx / d) * v - me.vx) * 0.25), (me.vy += ((dy / d) * v - me.vy) * 0.25);
  me.x = clamp(me.x + me.vx, 0.05, 0.9);
  me.y = clamp(me.y + me.vy, ME_Y0 - 0.06, ME_Y1 + 0.06);
  if (tgt && Math.abs(tgt.x - me.x) > 0.04) me.face = tgt.x > me.x ? 1 : -1;
}
/** 바위 박치기 중: 곧장 달려 부딪친 것을 쿵 (껍데기도 깬다) */
function ramStep(s: DrState) {
  const me = s.me, r = meR(s), b = me.parts[1];
  me.ram--;
  me.x = clamp(me.x + Math.cos(me.ramA) * 0.026, 0.04, 0.94);
  me.y = clamp(me.y + Math.sin(me.ramA) * 0.026, ME_Y0 - 0.08, ME_Y1 + 0.08);
  const P = pw(s, b?.g ?? 1);
  for (const m of s.mons) {
    if (!hittable(m) || m.dom > 0 || dist(me.x, me.y, m.x, m.y) > r + m.r) continue;
    m.dom = 30;
    ev(s, 'bonk', m.x, m.y - m.r, 0, 0, 0, m.k);
    hurt(s, m, 22 * P, me.ramE, 'ram', Math.cos(me.ramA) * 0.03, Math.sin(me.ramA) * 0.03);
    blast(s, m.x, m.y, 0.1, 9 * P, me.ramE, 0.014, 'ram');
    me.ram = Math.min(me.ram, 4);
  }
  if (me.ram <= 0) {
    for (const m of s.mons) if (m.dom > 0) m.dom = Math.min(m.dom, 6);
    if (comboOn(s, '쿵쾅 박치기')) ev(s, 'quake', me.x, me.y, 0, 0.22), blast(s, me.x, me.y, 0.22, 30 * P, me.ramE, 0.02, 'hammer');
  }
}
/** 부채꼴 안의 적 */
function coneHits(s: DrState, mx: number, my: number, a: number, L: number, half: number): Mon[] {
  const out: Mon[] = [];
  for (const m of s.mons) {
    if (!hittable(m)) continue;
    const dx = m.x - mx, dy = m.y - my, d = hyp(dx, dy);
    if (d - m.r > L) continue;
    if (d < m.r + 0.025 || Math.abs(angDiff(Math.atan2(dy, dx), a)) < half + Math.atan2(m.r, Math.max(d, 1e-3)) * 0.8) out.push(m);
  }
  return out;
}
/** 줄(얼음) 위의 적 */
function beamHits(s: DrState, mx: number, my: number, a: number, L: number, wd: number): Mon[] {
  const c = Math.cos(a), sn = Math.sin(a), out: Mon[] = [];
  for (const m of s.mons) {
    if (!hittable(m)) continue;
    const ox = m.x - mx, oy = m.y - my, u = ox * c + oy * sn;
    if (u < -m.r || u > L + m.r) continue;
    if (Math.abs(-ox * sn + oy * c) <= wd + m.r * 0.8) out.push(m);
  }
  return out;
}
/** 얼굴 쪽 반 안에서 가장 많이 맞는 각 */
function bestAim(s: DrState, mx: number, my: number, L: number, score: (a: number) => number): [number, number] {
  const me = s.me, fa = me.face > 0 ? 0 : Math.PI;
  let ba = fa, bn = 0;
  for (const m of s.mons) {
    if (!hittable(m) || dist(mx, my, m.x, m.y) - m.r > L) continue;
    const a = Math.atan2(m.y - my, m.x - mx);
    if (Math.abs(angDiff(a, fa)) > 1.25) continue;
    const n = score(a);
    if (n > bn) (bn = n), (ba = a);
  }
  return [ba, bn];
}
const wt = (m: Mon, a: Atk) => (WEAK[m.k].includes(a) ? 3 : 1) * (KD[m.k].boss ? 2 : resOf(m.k, a) < 0.5 ? 0.2 : 1);
function headAtk(s: DrState, pt: Part) {
  const me = s.me, [mx, my] = mouth(s), g = pt.g, P = pw(s, g);
  switch (pt.p) {
    case 'fire': {
      // 불 숨결: 앞쪽 부채꼴을 한 번에 (몰린 떼에 최고 · 껍데기는 막는다)
      const L = 0.26 + 0.07 * (g - 1), half = 0.46 + 0.1 * (g - 1);
      const [a, n] = bestAim(s, mx, my, L, (q) => coneHits(s, mx, my, q, L, half).reduce((x, m) => x + wt(m, 'fire'), 0));
      if (n <= 0) return void (me.cd[0] = 6);
      const eid = ++s.eid;
      (me.aim[0] = a), (me.reach[0] = L), (me.atkT[0] = s.t), (me.cd[0] = PD.fire.per);
      ev(s, 'fire', mx, my, g, a, L);
      for (const m of coneHits(s, mx, my, a, L, half)) hurt(s, m, 9 * P, eid, 'fire', Math.cos(a) * 0.008, Math.sin(a) * 0.008);
      break;
    }
    case 'ice': {
      // 얼음 숨결: 쭉 뻗은 줄 위를 모두 얼린다 (언 것은 피하지도 못하고 더 아프게 맞는다)
      const L = 0.62, wd = 0.035 + 0.012 * g;
      const [a, n] = bestAim(s, mx, my, L, (q) => beamHits(s, mx, my, q, L, wd).reduce((x, m) => x + wt(m, 'ice') * (KD[m.k].fast ? 1.6 : 1) * (m.frozen > 30 ? 0.3 : 1), 0));
      if (n <= 0) return void (me.cd[0] = 6);
      const eid = ++s.eid;
      (me.aim[0] = a), (me.reach[0] = L), (me.atkT[0] = s.t), (me.cd[0] = PD.ice.per);
      ev(s, 'ice', mx, my, g, a, L);
      s.lines.push({ k: 1, x0: mx, y0: my, x1: mx + Math.cos(a) * L, y1: my + Math.sin(a) * L, t: s.t });
      for (const m of beamHits(s, mx, my, a, L, wd)) {
        if (!KD[m.k].boss) m.frozen = Math.max(m.frozen, 100 + 25 * g);
        hurt(s, m, 8 * P, eid, 'ice');
        if (!m.dead && !KD[m.k].boss) ev(s, 'freeze', m.x, m.y, 0, m.r);
      }
      break;
    }
    case 'bolt': {
      // 번개 숨결: 가장 가까운 적부터 튕기며 줄줄이 (흩어진 것에 최고)
      let o = nearest(s, mx, my, 0.62, (m) => WEAK[m.k].includes('bolt')) ?? nearest(s, mx, my, 0.62, (m) => !KD[m.k].shell) ?? nearest(s, mx, my, 0.62);
      if (!o) return void (me.cd[0] = 6);
      const eid = ++s.eid, hit: number[] = [];
      (me.atkT[0] = s.t), (me.cd[0] = PD.bolt.per), (me.aim[0] = Math.atan2(o.y - my, o.x - mx));
      let x = mx, y = my;
      for (let i = 0; i < 4 + g && o; i++) {
        s.lines.push({ k: 0, x0: x, y0: y, x1: o.x, y1: o.y, t: s.t });
        ev(s, 'zap', o.x, o.y, i);
        hit.push(o.id);
        (x = o.x), (y = o.y);
        o.stun = Math.max(o.stun, 18);
        hurt(s, o, 9 * P, eid, 'bolt');
        const from = o;
        o = nearest(s, x, y, 0.32, (m) => !hit.includes(m.id) && m !== from);
      }
      break;
    }
    case 'bubble': {
      // 거품 숨결: 가장 큰 놈에게 커다란 거품 — 갇히면 둥실 떠올라 펑
      let o: Mon | null = null, ov = -1e9;
      for (const m of s.mons) {
        if (!hittable(m) || m.trap > 0 || dist(mx, my, m.x, m.y) > 0.85) continue;
        const v = m.r * 30 + (KD[m.k].boss ? 4 : 0) + (WEAK[m.k].includes('bubble') ? 3 : 0) - dist(mx, my, m.x, m.y) * 3;
        if (v > ov) (ov = v), (o = m);
      }
      if (!o) return void (me.cd[0] = 6);
      const a = Math.atan2(o.y - my, o.x - mx), eid = ++s.eid;
      (me.aim[0] = a), (me.atkT[0] = s.t), (me.cd[0] = PD.bubble.per);
      addMine(s, { k: 'bubble', x: mx, y: my, vx: Math.cos(a) * 0.012, vy: Math.sin(a) * 0.012, t: 0, T: 100, r: 0.032 + 0.008 * g, dmg: 22 * P, eid, hit: [], tgt: o.id });
      ev(s, 'blow', mx, my, g);
      break;
    }
    case 'thunder': {
      // 천둥 뿔(대장의 힘): 하늘의 모든 적에게 한꺼번에 벼락
      const list = s.mons.filter(hittable).slice(0, 14);
      if (!list.length) return void (me.cd[0] = 8);
      const eid = ++s.eid;
      (me.atkT[0] = s.t), (me.cd[0] = PD.thunder.per);
      ev(s, 'thunder', mx, my, list.length);
      for (const m of list) {
        s.lines.push({ k: 2, x0: m.x + ((m.seed % 7) - 3) * 0.012, y0: FY0 - 0.04, x1: m.x, y1: m.y, t: s.t });
        m.stun = Math.max(m.stun, 30);
        hurt(s, m, 36 * P, eid, 'sky');
      }
      break;
    }
  }
}
function backAtk(s: DrState, pt: Part) {
  const me = s.me, r = meR(s), g = pt.g, P = pw(s, g);
  switch (pt.p) {
    case 'rock': {
      const o = nearest(s, me.x, me.y, 0.42, (m) => WEAK[m.k].includes('ram')) ?? nearest(s, me.x, me.y, 0.42);
      if (!o) return void (me.cd[1] = 8);
      (me.ram = 20), (me.ramA = Math.atan2(o.y - me.y, o.x - me.x)), (me.ramE = ++s.eid), (me.cd[1] = PD.rock.per), (me.atkT[1] = s.t);
      me.face = Math.cos(me.ramA) >= 0 ? 1 : -1;
      ev(s, 'ram', me.x, me.y, g, me.ramA);
      break;
    }
    case 'spike': {
      // 가시 등: 둘레에 적이 있으면 사방으로 가시가 퓽퓽
      if (!nearest(s, me.x, me.y, 0.36)) return void (me.cd[1] = 8);
      const eid = ++s.eid, n = 10 + 2 * (g - 1), a0 = (s.t % 17) * 0.11;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * TAU;
        addMine(s, { k: 'needle', x: me.x + Math.cos(a) * r, y: me.y + Math.sin(a) * r, vx: Math.cos(a) * 0.017, vy: Math.sin(a) * 0.017, t: 0, T: 22 + 3 * g, r: 0.012, dmg: 7 * P, eid, hit: [], tgt: 0 });
      }
      (me.atkT[1] = s.t), (me.cd[1] = PD.spike.per);
      ev(s, 'spikes', me.x, me.y, g);
      break;
    }
    case 'wing': {
      // 큰 날개: 날갯짓 한 번에 바람 물결 — 앞의 적을 밀고 총알을 날려 버린다
      const any = nearest(s, me.x, me.y, 0.75) || s.shots.some((q) => dist(q.x, q.y, me.x, me.y) < 0.5);
      if (!any) return void (me.cd[1] = 8);
      addMine(s, { k: 'gust', x: me.x + me.face * r, y: me.y, vx: me.face * 0.016, vy: 0, t: 0, T: 46, r: 0.1 + 0.025 * g, dmg: 7 * P, eid: ++s.eid, hit: [], tgt: 0 });
      (me.atkT[1] = s.t), (me.cd[1] = PD.wing.per);
      ev(s, 'gust', me.x, me.y, g);
      break;
    }
    case 'storm': {
      if (!s.mons.some(hittable) && !s.shots.length) return void (me.cd[1] = 8);
      addMine(s, { k: 'storm', x: me.x + me.face * r, y: (FY0 + FY1) / 2, vx: me.face * 0.02, vy: 0, t: 0, T: 58, r: 0.62, dmg: 28 * P, eid: ++s.eid, hit: [], tgt: 0 });
      (me.atkT[1] = s.t), (me.cd[1] = PD.storm.per);
      ev(s, 'storm', me.x, me.y, g);
      break;
    }
  }
}
function tailAtk(s: DrState, pt: Part) {
  const me = s.me, r = meR(s), g = pt.g, P = pw(s, g);
  switch (pt.p) {
    case 'hammer': {
      // 망치 꼬리: 곁의 가장 크고 딱딱한 놈을 쾅 (껍데기를 무시 · 언 것은 와장창)
      const ice = comboOn(s, '얼음 깨기');
      let o: Mon | null = null, ov = -1e9;
      for (const m of s.mons) {
        if (!hittable(m)) continue;
        const d = dist(me.x, me.y, m.x, m.y) - m.r;
        if (d > 0.27) continue;
        const kd = KD[m.k], v = (kd.big ? 2 : 0) + (WEAK[m.k].includes('hammer') ? 3 : 0) + (kd.boss ? 3 : 0) + (ice && m.frozen > 0 ? 2 : 0) - d * 4;
        if (v > ov) (ov = v), (o = m);
      }
      if (!o) return void (me.cd[2] = 8);
      const eid = ++s.eid, R = 0.1 + 0.022 * g;
      (me.tx = o.x), (me.ty = o.y), (me.atkT[2] = s.t), (me.cd[2] = PD.hammer.per);
      ev(s, 'slam', o.x, o.y, g, R);
      blast(s, o.x, o.y, R, 28 * P, eid, 0.022, 'hammer');
      if (ice)
        for (const m of s.mons)
          if (hittable(m) && m.frozen > 0 && dist(o.x, o.y, m.x, m.y) < 0.26) ev(s, 'shatter', m.x, m.y, 0, m.r), hurt(s, m, 50 * P, eid, 'hammer');
      break;
    }
    case 'twister': {
      // 바람개비 꼬리: 꼬리에서 회오리가 일어나 작은 것을 빨아들여 빙글빙글 — 끝에 휙 내던진다
      if (s.twisters.length >= 2 || !nearest(s, me.x, me.y, 0.6, catchable)) return void (me.cd[2] = 10);
      const [x, y] = slotPos(s, 2), fire = comboOn(s, '불꽃 회오리');
      s.twisters.push({ id: ++s.nid, x, y, t: 0, T: 116, r: 0.1 + 0.018 * g, fire, eid: ++s.eid, pw: P });
      (me.atkT[2] = s.t), (me.cd[2] = PD.twister.per);
      ev(s, 'twister', x, y, g, fire ? 1 : 0);
      break;
    }
    case 'wave': {
      // 고래 꼬리(대장의 힘): 철썩! 하늘을 가로지르는 큰 물결
      if (!s.mons.some(hittable)) return void (me.cd[2] = 8);
      addMine(s, { k: 'wave', x: me.x - me.face * r, y: (FY0 + FY1) / 2, vx: me.face * 0.022, vy: 0, t: 0, T: 58, r: 0.62, dmg: 46 * P, eid: ++s.eid, hit: [], tgt: 0 });
      (me.atkT[2] = s.t), (me.cd[2] = PD.wave.per);
      ev(s, 'wave', me.x, me.y, g);
      break;
    }
  }
}
function addMine(s: DrState, k: Mine) {
  if (s.mines.length < MINE_CAP) s.mines.push(k);
}
function myStep(s: DrState) {
  const me = s.me, r = meR(s);
  if (me.inv > 0) me.inv--;
  if (me.fly) return flyStep(s);
  if (me.chew > 0) me.chew--;
  if (me.ram > 0) ramStep(s);
  else move(s);
  for (let i = 0; i < 3; i++) if (me.cd[i] > 0) me.cd[i]--;
  const [h, b, tl] = me.parts;
  if (h && me.cd[0] <= 0) headAtk(s, h);
  if (b && me.cd[1] <= 0 && me.ram <= 0) backAtk(s, b);
  if (tl && me.cd[2] <= 0) tailAtk(s, tl);
  if (!h && !b && !tl) {
    // 맨몸: 콩 깨물기뿐 (그래서 얼른 먹고 싶다)
    if (me.nib > 0) me.nib--;
    else {
      const o = nearest(s, me.x, me.y, 0.1);
      if (o) (me.nib = 44), (me.atkT[0] = s.t), ev(s, 'nibble', o.x, o.y), hurt(s, o, 8, ++s.eid, 'nibble');
    }
  }
  if (b?.p === 'spike') {
    // 가시: 닿은 적은 따끔
    for (const m of s.mons) {
      if (!hittable(m) || m.dom > 0 || dist(me.x, me.y, m.x, m.y) > r + m.r) continue;
      m.dom = 20;
      const a = Math.atan2(m.y - me.y, m.x - me.x);
      ev(s, 'prick', m.x, m.y);
      hurt(s, m, 4 * pw(s, b.g), 0, 'needle', Math.cos(a) * 0.02, Math.sin(a) * 0.02);
    }
  }
}

// ───────────────────────────── 내 것: 가시 · 거품 · 바람 · 물결 · 회오리 ─────────────────────────────
function mineStep(s: DrState) {
  const bspike = comboOn(s, '번개 가시'), bwind = comboOn(s, '거품 바람');
  for (const k of s.mines) {
    k.t++;
    if (k.k === 'bubble') {
      const o = s.mons.find((m) => m.id === k.tgt && hittable(m));
      if (o) {
        const a = Math.atan2(o.y - k.y, o.x - k.x);
        k.vx += (Math.cos(a) * 0.012 - k.vx) * 0.08;
        k.vy += (Math.sin(a) * 0.012 - k.vy) * 0.08;
      }
    }
    k.x += k.vx;
    k.y += k.vy;
    if (k.k === 'needle' || k.k === 'bubble') {
      for (const m of s.mons) {
        if (!hittable(m) || k.hit.includes(m.id) || dist(k.x, k.y, m.x, m.y) > k.r + m.r) continue;
        k.hit.push(m.id);
        if (k.k === 'needle') {
          hurt(s, m, k.dmg, k.eid, 'needle');
          if (bspike) {
            const o = nearest(s, m.x, m.y, 0.22, (q) => q !== m);
            if (o) s.lines.push({ k: 0, x0: m.x, y0: m.y, x1: o.x, y1: o.y, t: s.t }), ev(s, 'zap', o.x, o.y, 1), hurt(s, o, k.dmg, k.eid, 'bolt');
          }
          k.t = k.T;
        } else {
          // 거품: 대장은 못 가두고 펑, 나머지는 둘레까지 함께 가둔다
          if (KD[m.k].boss) hurt(s, m, k.dmg, k.eid, 'bubble'), ev(s, 'bpop', k.x, k.y, 1, k.r);
          else {
            ev(s, 'trap', m.x, m.y, 0, m.r);
            for (const o of s.mons) if (hittable(o) && !KD[o.k].boss && o.trap <= 0 && dist(o.x, o.y, m.x, m.y) < 0.08 + o.r) (o.trap = 90), (o.trapE = k.eid), (o.trapD = k.dmg), (o.st = IDLE), (o.caught = 0);
          }
          k.t = k.T;
        }
        break;
      }
    } else {
      // 바람 물결 · 폭풍 · 고래 물결: 지나가는 길의 적을 한 번씩 때리고 밀며, 총알을 지운다
      const half = k.r, push = k.vx > 0 ? 1 : -1;
      for (const m of s.mons) {
        if (!hittable(m) || k.hit.includes(m.id)) continue;
        if (Math.abs(m.x - k.x) > 0.045 + m.r || Math.abs(m.y - k.y) > half + m.r * 0.5) continue;
        k.hit.push(m.id);
        if (k.k === 'gust' && bwind && catchable(m)) (m.trap = 80), (m.trapE = k.eid), (m.trapD = k.dmg * 1.6), ev(s, 'trap', m.x, m.y, 0, m.r);
        m.stun = Math.max(m.stun, k.k === 'gust' ? 24 : 40);
        hurt(s, m, k.dmg, k.eid, k.k === 'gust' ? 'gust' : 'sky', push * (k.k === 'gust' ? 0.018 : 0.026), 0);
      }
      const before = s.shots.length;
      s.shots = s.shots.filter((q) => Math.abs(q.x - k.x) > 0.06 || Math.abs(q.y - k.y) > half + 0.02);
      if (s.shots.length < before) ev(s, 'blowaway', k.x, k.y, before - s.shots.length);
    }
  }
  s.mines = s.mines.filter((k) => k.t < k.T && k.x > -0.25 && k.x < 1.25 && k.y > -0.1 && k.y < 1.6);
  for (const tw of s.twisters) twisterStep(s, tw);
  s.twisters = s.twisters.filter((tw) => tw.t < tw.T);
}
function twisterStep(s: DrState, tw: Twister) {
  tw.t++;
  // 작은 것이 가장 많은 쪽으로 천천히
  let tx = tw.x, ty = tw.y, bn = 0;
  for (const m of s.mons) {
    if (!hittable(m) || m.caught || !catchable(m)) continue;
    const d = dist(tw.x, tw.y, m.x, m.y);
    if (d < 0.5 && 1 - d > bn) (bn = 1 - d), (tx = m.x), (ty = m.y);
  }
  const d0 = dist(tw.x, tw.y, tx, ty);
  if (d0 > 0.01) (tw.x += ((tx - tw.x) / d0) * 0.006), (tw.y += ((ty - tw.y) / d0) * 0.006);
  tw.y = clamp(tw.y, FY0 + 0.05, FY1 - 0.05);
  const dmg = 0.8 * tw.pw * (tw.fire ? 2 : 1);
  for (const m of s.mons) {
    if (!hittable(m) || !catchable(m) || m.trap > 0) continue;
    if (m.caught === tw.id) {
      const a = s.t * 0.26 + (m.seed % 628) / 100, rr = tw.r * (0.3 + 0.5 * ((m.seed % 7) / 7));
      m.x += (tw.x + Math.cos(a) * rr - m.x) * 0.3;
      m.y += (tw.y - tw.r * 0.3 + Math.sin(a) * rr * 0.45 - ((m.seed % 5) - 2) * 0.014 - m.y) * 0.3;
      if (tw.t % 6 === 0) hurt(s, m, dmg, tw.eid, 'twist');
    } else if (!m.caught) {
      const d = dist(tw.x, tw.y, m.x, m.y);
      if (d < tw.r + m.r * 0.5) (m.caught = tw.id), (m.st = IDLE), ev(s, 'caught', m.x, m.y);
      else if (d < 0.33) (m.vx += ((tw.x - m.x) / d) * 0.0014), (m.vy += ((tw.y - m.y) / d) * 0.0014);
    }
  }
  if (tw.t >= tw.T) {
    // 휙 — 잡힌 것을 사방으로 내던진다
    let n = 0;
    for (const m of s.mons) {
      if (m.caught !== tw.id) continue;
      m.caught = 0;
      const a = Math.atan2(m.y - tw.y, m.x - tw.x) || m.seed;
      n++;
      hurt(s, m, 14 * tw.pw * (tw.fire ? 1.6 : 1), tw.eid, 'twist', Math.cos(a) * 0.03, Math.sin(a) * 0.03);
    }
    ev(s, 'fling', tw.x, tw.y, n, tw.r, tw.fire ? 1 : 0);
  }
}
/** 거품이 펑: 갇힌 놈은 크게, 둘레는 조금 */
function popBubble(s: DrState, m: Mon) {
  const eid = m.trapE;
  ev(s, 'bpop', m.x, m.y, 0, m.r + 0.02);
  hurt(s, m, m.trapD, eid, 'bubble');
  for (const o of s.mons) if (o !== m && hittable(o) && o.trap <= 0 && dist(o.x, o.y, m.x, m.y) < 0.13 + o.r) hurt(s, o, m.trapD * 0.4, eid, 'bubble');
}

// ───────────────────────────── 떼 ─────────────────────────────
function addMon(s: DrState, k: K, fid: number, king: boolean): Mon {
  const d = KD[k], hp = Math.round(d.hp * (1 + 0.07 * s.stage) * (king ? KING_HP : 1)), r = d.r * (king ? KING_R : 1);
  const m: Mon = {
    id: ++s.nid, k, fid, king, x: 1.1, y: 0.7, vx: 0, vy: 0, r, r0: r, hp, max: hp, st: IDLE, tm: 0, et: 1,
    cool: 40 + Math.floor(s.rng() * 90), face: -1, ox: 0, oy: 0, px: 0, py: 0, ang: 0, fx0: 1.1, fy0: 0.7, ax: 0, ay: 0,
    frozen: 0, trap: 0, trapE: 0, trapD: 0, caught: 0, stun: 0, dom: 0, puff: 0, rage: 0, dead: false, drops: 0,
    seed: Math.floor(s.rng() * 1e6), born: s.t, hurtT: -99, atkT: -99,
  };
  s.mons.push(m);
  return m;
}
function perch(s: DrState, m: Mon, i: number, n: number) {
  m.px = 0.62 + s.rng() * 0.26;
  m.py = FY0 + 0.1 + ((i + 0.5) / n) * (FY1 - FY0 - 0.2) + (s.rng() - 0.5) * 0.06;
}
/** 떼 하나: 오른쪽에서 몰려와(pre면 이미 와 있다) 제 대열에 선다 */
function spawnFlock(s: DrState, fl: Fl, pre: boolean) {
  const kd = KD[fl.k], id = ++s.nid;
  let tx = 0.68, ty = 0.7, bd = -1;
  for (let k = 0; k < 8; k++) {
    const x = 0.56 + s.rng() * 0.28, y = FY0 + 0.2 + s.rng() * (FY1 - FY0 - 0.32);
    let near = dist(x, y, s.me.x, s.me.y);
    for (const f of s.flocks) near = Math.min(near, dist(x, y, f.x, f.y));
    if (near > bd) (bd = near), (tx = x), (ty = y);
  }
  if (s.stage === 0 && pre && !s.flocks.length) (tx = 0.64), (ty = 0.66);
  if (kd.boss) (tx = 0.76), (ty = 0.5);
  s.flocks.push({ id, k: fl.k, x: tx, y: ty, tx, ty, t: 0, king: !!fl.king, n0: fl.n, oy: ty });
  const first: Mon[] = [];
  for (let i = 0; i < fl.n; i++) {
    const m = addMon(s, fl.k, id, !!fl.king);
    first.push(m);
    switch (kd.beh) {
      case 'swarm': {
        const rr = 0.026 + 0.03 * Math.sqrt(i), a = i * 2.4;
        (m.ox = Math.cos(a) * rr), (m.oy = Math.sin(a) * rr * 0.9);
        break;
      }
      case 'zip': (m.px = (s.rng() - 0.5) * 0.26), (m.py = (s.rng() - 0.5) * 0.22); break;
      case 'float': (m.ox = (i - (fl.n - 1) / 2) * 0.15), (m.oy = i % 2 ? 0.07 : -0.05); break;
      case 'orbit': m.ang = (i / fl.n) * TAU + s.rng() * 0.3; break;
      case 'snipe': case 'ram': perch(s, m, i, fl.n); break;
    }
    if (fl.king && kd.beh !== 'snipe' && kd.beh !== 'ram') (m.ox = 0), (m.oy = 0), (m.px = 0), (m.py = 0);
    const [hx, hy] = home(s, m);
    if (pre) (m.x = hx), (m.y = hy), (m.st = IDLE);
    else {
      m.st = ENTER;
      m.fx0 = 1.12 + i * 0.012;
      m.fy0 = clamp(hy + (s.rng() - 0.5) * 0.25, FY0 + 0.05, FY1 - 0.05);
      m.x = m.fx0;
      m.y = m.fy0;
      m.et = m.tm = (kd.boss ? 100 : 44) + i * 5 + (kd.big ? 16 : 0);
    }
  }
  see(s, 'k:' + fl.k);
  if (fl.king) {
    see(s, 'king:' + fl.k);
    s.spot = { id: first[0].id, t: s.t, label: `왕 ${kd.name}!` };
    ev(s, 'king', first[0].x, first[0].y, 0, 0, 0, fl.k);
  } else if (kd.boss) ev(s, 'boss', 1.0, 0.5, 0, 0, 0, fl.k);
  else if (!pre) ev(s, 'flock', 1.0, ty, fl.n, 0, 0, fl.k);
}
/** 대열에서 서야 할 곳 */
function home(s: DrState, m: Mon): [number, number] {
  const kd = KD[m.k], f = s.flocks.find((q) => q.id === m.fid), fx = f ? f.x : 0.7, fy = f ? f.y : 0.7;
  switch (kd.beh) {
    case 'zip': return [fx + m.px, fy + m.py];
    case 'orbit': {
      const R = 0.21 + 0.03 * Math.sin(s.t * 0.02 + m.seed);
      return [s.me.x + Math.cos(m.ang) * R, s.me.y + Math.sin(m.ang) * R * 0.85];
    }
    case 'snipe': case 'ram': return [m.px, m.py + Math.sin(s.t * 0.05 + m.seed) * 0.012];
    case 'boss': return [0.76, 0.5];
    default: return [fx + m.ox, fy + m.oy + Math.sin(s.t * 0.09 + m.seed) * 0.012];
  }
}
function flockStep(s: DrState, f: Flock) {
  const kd = KD[f.k], me = s.me;
  f.t++;
  // 떼는 제 높이와 용 높이 사이에 머문다 (화면 위아래를 고루 쓴다)
  const ly = clamp((f.oy + me.y) / 2, FY0 + 0.12, FY1 - 0.12);
  if (kd.beh === 'swarm') (f.tx = clamp(me.x + 0.36, 0.48, 0.84)), (f.ty += (ly - f.ty) * 0.01);
  else if (kd.beh === 'float') (f.tx = clamp(me.x + 0.24, 0.42, 0.86)), (f.ty += (ly - f.ty) * 0.008);
  else if (kd.beh === 'zip' && (f.t + f.id * 37) % 160 === 0) (f.tx = 0.45 + s.rng() * 0.4), (f.ty = FY0 + 0.15 + s.rng() * (FY1 - FY0 - 0.3));
  if (s.stage === 0 && !s.started) return;
  const d = dist(f.x, f.y, f.tx, f.ty), v = Math.min(kd.spd * (kd.beh === 'zip' ? 0.5 : 1), d);
  if (d > 1e-4) (f.x += ((f.tx - f.x) / d) * v), (f.y += ((f.ty - f.y) / d) * v);
}
/** 다가간다 (최고 빠르기 v) */
function steer(m: Mon, x: number, y: number, v: number, k = 0.12) {
  const dx = x - m.x, dy = y - m.y, d = hyp(dx, dy);
  if (d < 1e-5) return d;
  const sp = Math.min(v, d * k);
  m.x += (dx / d) * sp;
  m.y += (dy / d) * sp;
  if (Math.abs(dx) > 0.004) m.face = dx > 0 ? 1 : -1;
  return d;
}
function shoot(s: DrState, m: Mon) {
  const me = s.me, dmg = KD[m.k].dmg * kingMul(m), a = Math.atan2(me.y - m.y, me.x - m.x);
  m.atkT = s.t;
  m.face = me.x > m.x ? 1 : -1;
  if (m.k === 'spark') {
    for (const da of m.king ? [-0.25, 0, 0.25] : [0]) addShot(s, 0, m.x + m.face * m.r, m.y, Math.cos(a + da) * 0.011, Math.sin(a + da) * 0.011, dmg, 0.014);
  } else if (m.k === 'squir') {
    const T = 62;
    for (const dt of m.king ? [-12, 0, 12] : [0]) addShot(s, 1, m.x, m.y - m.r, (me.x - m.x) / (T + dt), (me.y - m.y) / (T + dt) - 0.5 * GR * (T + dt), dmg, 0.016);
  } else addShot(s, 2, m.x + m.face * m.r, m.y, Math.cos(a) * 0.0075, Math.sin(a) * 0.0075, dmg, m.king ? 0.075 : 0.05);
  ev(s, 'shoot', m.x, m.y, 0, 0, 0, m.k);
}
const GR = 0.00035;
function addShot(s: DrState, k: number, x: number, y: number, vx: number, vy: number, dmg: number, r: number) {
  if (s.shots.length < SHOT_CAP) s.shots.push({ k, x, y, vx, vy, dmg, t: 0, r });
}
function foeStep(s: DrState, m: Mon) {
  const kd = KD[m.k], me = s.me, mr = meR(s);
  if (m.st === HELD) return void m.tm++;
  if (m.st === ENTER) {
    const u = clamp(1 - --m.tm / m.et, 0, 1), e = 1 - (1 - u) * (1 - u), [hx, hy] = home(s, m);
    m.x = m.fx0 + (hx - m.fx0) * e;
    m.y = m.fy0 + (hy - m.fy0) * e;
    m.face = -1;
    if (m.tm <= 0) (m.st = IDLE), ev(s, 'arrive', m.x, m.y, 0, 0, 0, m.k);
    return;
  }
  if (m.vx || m.vy) {
    m.x += m.vx;
    m.y += m.vy;
    m.vx *= 0.86;
    m.vy *= 0.86;
    if (Math.abs(m.vx) + Math.abs(m.vy) < 2e-4) m.vx = m.vy = 0;
  }
  if (m.dom > 0) m.dom--;
  if (m.trap > 0) {
    m.y = Math.max(FY0 + m.r * 0.5, m.y - 0.0014);
    if (--m.trap === 0) popBubble(s, m);
    return;
  }
  if (m.caught) return;
  if (m.frozen > 0) return void m.frozen--;
  if (m.stun > 0) return void m.stun--;
  if (kd.boss) return bossStep(s, m);
  if (m.cool > 0) m.cool--;
  const ag = aggressive(s), [hx, hy] = home(s, m), dme = dist(m.x, m.y, me.x, me.y), per = kd.per * (1.1 - 0.035 * s.stage);
  const dmg = kd.dmg * kingMul(m);
  switch (kd.beh) {
    case 'swarm': case 'zip': case 'orbit': {
      if (kd.beh === 'zip' && (s.t + m.seed) % 34 === 0) (m.px = (s.rng() - 0.5) * 0.28), (m.py = (s.rng() - 0.5) * 0.24);
      if (kd.beh === 'orbit') m.ang += (0.019 + (m.seed % 5) * 0.002) * (m.fid % 2 ? 1 : -1);
      const quick = kd.beh !== 'swarm';
      if (m.st === IDLE) {
        steer(m, hx, hy, kd.beh === 'orbit' ? 0.016 : kd.beh === 'zip' ? 0.012 : 0.009, kd.beh === 'swarm' ? 0.12 : 0.18);
        if (ag && m.cool <= 0 && dme < 0.75) (m.st = WIND), (m.tm = quick ? 12 : 20), (m.ax = me.x), (m.ay = me.y), ev(s, 'wind', m.x, m.y, 0, 0, 0, m.k);
      } else if (m.st === WIND) {
        m.face = me.x > m.x ? 1 : -1;
        if (--m.tm <= 0) (m.st = DASH), (m.tm = quick ? 26 : 40), (m.ang = Math.atan2(m.ay - m.y, m.ax - m.x)), (m.atkT = s.t);
      } else if (m.st === DASH) {
        const sp = quick ? 0.02 : 0.016;
        m.ang += clamp(angDiff(Math.atan2(me.y - m.y, me.x - m.x), m.ang), -0.05, 0.05);
        m.x += Math.cos(m.ang) * sp;
        m.y += Math.sin(m.ang) * sp;
        m.face = Math.cos(m.ang) > 0 ? 1 : -1;
        if (dme < m.r + mr * 0.9) hurtMe(s, dmg, m.x, m.y), (m.st = BACK), (m.vx = -Math.cos(m.ang) * 0.012), (m.vy = -Math.sin(m.ang) * 0.012);
        else if (--m.tm <= 0) m.st = BACK;
        if (kd.beh === 'orbit' && m.st === BACK) m.ang = Math.atan2(m.y - me.y, m.x - me.x);
      } else if (m.st === BACK) {
        if (steer(m, hx, hy, 0.012, 0.2) < 0.03) (m.st = IDLE), (m.cool = Math.round(per * (0.7 + 0.6 * s.rng())));
      }
      break;
    }
    case 'float': {
      steer(m, hx, hy, kd.spd * 2.2, 0.06);
      m.face = me.x > m.x ? 1 : -1;
      if (m.k === 'puff') {
        const want = dme < 0.24 && ag ? 1 : 0;
        m.puff += (want - m.puff) * 0.08;
        m.r = m.r0 * (1 + 0.38 * m.puff);
      }
      if (ag && m.cool <= 0 && dme < m.r + mr * 0.9) hurtMe(s, dmg, m.x, m.y), (m.cool = per), (m.atkT = s.t), ev(s, 'sting', m.x, m.y, 0, 0, 0, m.k);
      break;
    }
    case 'snipe': {
      if ((s.t + m.seed) % 420 === 0) perch(s, m, m.seed % 5, 5);
      if (m.st === IDLE) {
        if (dme < 0.36 && s.started) {
          // 다가오면 휙 물러난다 — 멀리서만 쏜다 (번개·거품·바람이 닿는다)
          const a = Math.atan2(m.y - me.y, m.x - me.x);
          m.x += Math.cos(a) * 0.009;
          m.y += Math.sin(a) * 0.009;
          if (m.x > 0.95 || m.x < 0.05) m.y += (m.y < 0.7 ? 1 : -1) * 0.006;
          m.px = clamp(m.x, 0.3, 0.92);
          m.py = clamp(m.y, FY0 + 0.08, FY1 - 0.08);
        } else steer(m, hx, hy, kd.spd * 2, 0.08);
        m.face = me.x > m.x ? 1 : -1;
        if (ag && m.cool <= 0 && m.x < 1.0) (m.st = WIND), (m.tm = 26), ev(s, 'aim', m.x, m.y, 0, 0, 0, m.k);
      } else if (--m.tm <= 0) shoot(s, m), (m.st = IDLE), (m.cool = Math.round(per * (0.8 + 0.4 * s.rng())));
      break;
    }
    case 'ram': {
      if (m.st === IDLE) {
        steer(m, hx, hy, kd.spd * 2, 0.08);
        m.face = me.x > m.x ? 1 : -1;
        if (ag && m.cool <= 0) (m.st = WIND), (m.tm = 40), (m.ax = me.x), (m.ay = me.y), ev(s, 'wind', m.x, m.y, 0, 0, 0, m.k);
      } else if (m.st === WIND) {
        m.ang = Math.atan2(m.ay - m.y, m.ax - m.x);
        m.face = Math.cos(m.ang) > 0 ? 1 : -1;
        if (--m.tm <= 0) (m.st = DASH), (m.tm = 80), (m.atkT = s.t), ev(s, 'charge', m.x, m.y, 0, 0, 0, m.k);
      } else if (m.st === DASH) {
        m.ang += clamp(angDiff(Math.atan2(me.y - m.y, me.x - m.x), m.ang), -0.03, 0.03);
        m.x += Math.cos(m.ang) * 0.017;
        m.y += Math.sin(m.ang) * 0.017;
        if (dme < m.r + mr * 0.9) hurtMe(s, dmg, m.x, m.y), (m.st = BACK), (m.vx = -Math.cos(m.ang) * 0.02), (m.vy = -Math.sin(m.ang) * 0.02);
        else if (--m.tm <= 0 || m.x < 0 || m.x > 1.05 || m.y < FY0 || m.y > FY1) m.st = BACK;
      } else if (steer(m, hx, hy, 0.011, 0.2) < 0.03) (m.st = IDLE), (m.cool = Math.round(per * (0.75 + 0.5 * s.rng())));
      break;
    }
  }
  keepIn(m);
}
/** 겹치지 않게 살짝 밀어낸다 */
function separate(s: DrState) {
  const L = s.mons;
  for (let i = 0; i < L.length; i++) {
    const a = L[i];
    if (!hittable(a) || a.caught || a.st === DASH) continue;
    for (let j = i + 1; j < L.length; j++) {
      const b = L[j];
      if (!hittable(b) || b.caught || b.st === DASH) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = hyp(dx, dy), min = (a.r + b.r) * 0.8;
      if (d >= min) continue;
      const ux = d > 1e-5 ? dx / d : 1, uy = d > 1e-5 ? dy / d : 0, push = (min - d) * 0.3;
      const wa = isBoss(a) ? 0 : 1, wb = isBoss(b) ? 0 : 1, tot = wa + wb || 1;
      (a.x -= ux * push * (wa / tot)), (a.y -= uy * push * (wa / tot));
      (b.x += ux * push * (wb / tot)), (b.y += uy * push * (wb / tot));
    }
  }
}
function shotStep(s: DrState) {
  const me = s.me, mr = meR(s);
  for (const q of s.shots) {
    q.t++;
    if (q.k === 1 || (q.k === 3 && q.r < 0.03)) q.vy += GR;
    else if ((q.k === 0 || q.k === 4) && q.t < 70) {
      const a = Math.atan2(q.vy, q.vx), sp = hyp(q.vx, q.vy), na = a + clamp(angDiff(Math.atan2(me.y - q.y, me.x - q.x), a), -0.03, 0.03);
      (q.vx = Math.cos(na) * sp), (q.vy = Math.sin(na) * sp);
    }
    q.x += q.vx;
    q.y += q.vy;
    if (!me.fly && dist(q.x, q.y, me.x, me.y) < q.r + mr * 0.82) {
      hurtMe(s, q.dmg, q.x, q.y);
      if (q.k === 2) (me.vx += q.vx * 0.8), (me.vy += q.vy * 0.8);
      q.t = 999;
      ev(s, 'shothit', q.x, q.y, q.k);
    }
  }
  s.shots = s.shots.filter((q) => q.t < 420 && q.x > -0.1 && q.x < 1.12 && q.y > 0.05 && q.y < 1.35);
}

// ───────────────────────────── 대장 ─────────────────────────────
function bossHurt(s: DrState, m: Mon) {
  // 체력이 85·60·35·12%를 지날 때 제 부위를 하나씩 흘린다 (대장의 힘으로 때릴수록 빨리 또 흘린다)
  const q = m.hp / m.max;
  while (m.drops < DROP_AT.length && q < DROP_AT[m.drops]) m.drops++, dropItem(s, m);
}
function dropItem(s: DrState, m: Mon) {
  if (s.items.length >= 2) return;
  // 흘린 것은 용과 먼 쪽으로 둥실 날아간다 — 보고 톡해야 잡힌다
  s.items.push({ id: ++s.nid, k: m.k, p: KD[m.k].p, x: clamp(m.x - 0.05, 0.3, 0.8), y: m.y + m.r * 0.3, vy: 0, t: 0, tx: 0.84, ty: s.me.y < 0.75 ? 1.04 : 0.4 });
  s.dropT = 0;
  ev(s, 'drop', m.x, m.y, 0, 0, 0, m.k);
  see(s, 'drop:' + m.k);
  if (!s.spot || s.t - s.spot.t > 60) s.spot = { id: -s.items[s.items.length - 1].id, t: s.t, label: `NEW ${DROP_NAME[m.k]}` };
}
function bossDown(s: DrState, m: Mon) {
  card(s, '대장을 이겼다!', `${KD[m.k].name} 와르르`, 5, '#ffb800', KD[m.k].p);
  ev(s, 'bossdown', m.x, m.y, 0, m.r, 0, m.k);
  see(s, 'down:' + m.k);
  const eid = ++s.eid;
  for (const o of s.mons) if (!o.dead && o !== m) o.st === HELD || o.st === ENTER ? (o.dead = true) : kill(s, o, eid);
  s.inbox = [];
  s.items = [];
  s.shots = [];
}
function bossStep(s: DrState, m: Mon) {
  const me = s.me, kd = KD[m.k], ag = aggressive(s), mr = meR(s);
  let hx = 0.76, hy = 0.5;
  if (m.k === 'eagle') hy = 0.45 + Math.sin(s.t * 0.012) * 0.16;
  else if (m.k === 'whale') (hx = 0.74), (hy = 0.8 + Math.sin(s.t * 0.008) * 0.16);
  else hy = clamp(me.y + Math.sin(s.t * 0.01) * 0.12, 0.38, 1.02);
  if (m.cool > 0) m.cool--;
  const alt = m.drops + Math.floor(s.t / 200);
  if (m.st === IDLE) {
    steer(m, hx, hy, kd.spd, 0.05);
    m.face = -1;
    if (!ag || m.cool > 0) return;
    m.ang = Math.atan2(me.y - m.y, me.x - m.x);
    (m.ax = me.x), (m.ay = me.y);
    if (m.k === 'eagle') {
      if (alt % 2 === 0) (m.st = WIND), (m.tm = 50), ev(s, 'bosswind', m.x, m.y, 0, 0, 0, m.k);
      else {
        for (const da of [-0.3, 0, 0.3]) addShot(s, 4, m.x - m.r * 0.6, m.y, Math.cos(m.ang + da) * 0.012, Math.sin(m.ang + da) * 0.012, 6, 0.02);
        ev(s, 'flap', m.x, m.y, 0, 0, 0, m.k);
        m.atkT = s.t;
        m.cool = 140;
      }
    } else if (m.k === 'whale') {
      if (alt % 2 === 0) {
        for (let i = 0; i < 7; i++) addShot(s, 3, m.x - m.r * 0.3, m.y - m.r * 0.8, (me.x - m.x) / 90 + (i - 3) * 0.0016, -0.013 - (i % 3) * 0.002, 6, 0.018);
        ev(s, 'spout', m.x, m.y - m.r, 0, 0, 0, m.k);
      } else {
        addShot(s, 3, m.x - m.r, m.y, Math.cos(m.ang) * 0.009, Math.sin(m.ang) * 0.009, 10, 0.05);
        ev(s, 'splash', m.x, m.y, 0, 0, 0, m.k);
      }
      m.atkT = s.t;
      m.cool = 170;
    } else {
      if (alt % 2 === 0) (m.st = WIND), (m.tm = 44), ev(s, 'bosswind', m.x, m.y, 0, 0, 0, m.k);
      else {
        for (const [dx, dy] of [[0, 0], [-0.12, 0.06], [0.12, -0.05]]) s.q.push({ t: s.t + 50, k: 'strike', x: clamp(me.x + dx, 0.06, 0.94), y: clamp(me.y + dy, FY0 + 0.05, FY1 - 0.05), r: 0.085, dmg: 9 });
        ev(s, 'storm3', m.x, m.y, 0, 0, 0, m.k);
        m.atkT = s.t;
        m.cool = 200;
      }
    }
  } else if (m.st === WIND) {
    m.ang = Math.atan2(m.ay - m.y, m.ax - m.x);
    if (--m.tm > 0) return;
    m.atkT = s.t;
    if (m.k === 'eagle') (m.st = DASH), (m.tm = 50), ev(s, 'swoop', m.x, m.y, 0, 0, 0, m.k);
    else {
      // 번개 숨결: 겨눈 줄 위에 있으면 맞는다
      const c = Math.cos(m.ang), sn = Math.sin(m.ang), ox = me.x - m.x, oy = me.y - m.y, u = ox * c + oy * sn;
      s.lines.push({ k: 3, x0: m.x - m.r * 0.8, y0: m.y - m.r * 0.2, x1: m.x + c * 1.4, y1: m.y + sn * 1.4, t: s.t });
      ev(s, 'beam', m.x, m.y, 0, m.ang, 0, m.k);
      if (u > 0 && Math.abs(-ox * sn + oy * c) < mr + 0.045) hurtMe(s, kd.dmg, me.x, me.y);
      (m.st = IDLE), (m.cool = 160);
    }
  } else if (m.st === DASH) {
    m.x += Math.cos(m.ang) * 0.024;
    m.y += Math.sin(m.ang) * 0.024;
    if (dist(m.x, m.y, me.x, me.y) < m.r * 0.8 + mr) hurtMe(s, kd.dmg, me.x, me.y);
    if (--m.tm <= 0 || m.x < 0.02 || m.y < FY0 || m.y > FY1) (m.st = BACK), (m.tm = 0);
    keepIn(m);
  } else if (steer(m, hx, hy, 0.014, 0.1) < 0.03) (m.st = IDLE), (m.cool = 150);
}
function queueStep(s: DrState) {
  if (!s.q.length) return;
  const me = s.me, due = s.q.filter((q) => q.t <= s.t);
  s.q = s.q.filter((q) => q.t > s.t);
  for (const q of due) {
    if (q.k === 'chain') {
      const o = nearest(s, q.x, q.y, q.r, (m) => WEAK[m.k].includes(q.kind!) && !q.hit!.includes(m.id));
      if (q.first) ev(s, 'weak', q.x, q.y, 0, 0, 0, q.kind!);
      if (!o) continue;
      s.lines.push({ k: 4, x0: q.x, y0: q.y, x1: o.x, y1: o.y, t: s.t, col: CHAIN_COL[q.kind!] });
      ev(s, 'chain', o.x, o.y, s.evN.get(q.eid!) ?? 0, 0, 0, q.kind!);
      q.hit!.push(o.id);
      const keep = s.q.length;
      hurt(s, o, q.dmg, q.eid!, q.kind!, 0, 0, q.left!);
      // 이어지는 줄은 이미 맞은 놈을 건너뛴다
      for (let i = keep; i < s.q.length; i++) if (s.q[i].k === 'chain') s.q[i].hit = q.hit;
      continue;
    }
    s.lines.push({ k: 2, x0: q.x + 0.03, y0: FY0 - 0.05, x1: q.x, y1: q.y, t: s.t });
    ev(s, 'strike', q.x, q.y, 0, q.r);
    if (dist(q.x, q.y, me.x, me.y) < q.r + meR(s) * 0.6) hurtMe(s, q.dmg, me.x, me.y);
  }
}
function itemStep(s: DrState) {
  for (const it of s.items) {
    it.t++;
    it.x += (it.tx - it.x) * 0.03;
    it.y = clamp(it.y + (it.ty - it.y) * 0.03, FY0 + 0.05, FY1 - 0.1);
    it.x += Math.sin(it.t * 0.03) * 0.0006;
    if (it.t > ITEM_T) ev(s, 'fade', it.x, it.y);
  }
  s.items = s.items.filter((it) => it.t <= ITEM_T);
}

// ───────────────────────────── 판 흐름 ─────────────────────────────
function spawnWave(s: DrState) {
  const d = STAGES[s.stage], w = d.waves[s.wave];
  if (s.wave === 0) for (const fl of w.fl) spawnFlock(s, fl, !KD[fl.k].boss);
  else s.inbox.push(...w.fl), ev(s, 'wave', 1.0, 0.7, s.wave);
  s.wave++;
  s.waveT = 0;
}
function newStage(s: DrState) {
  const d = STAGES[s.stage], me = s.me;
  s.mons = [];
  s.flocks = [];
  s.shots = [];
  s.mines = [];
  s.twisters = [];
  s.items = [];
  s.q = [];
  s.inbox = [];
  s.lines = [];
  s.sheds = [];
  Object.assign(me, { x: HOME_X, y: HOME_Y, vx: 0, vy: 0, face: 1, parts: [null, null, null], tint: BARE_TINT, chew: 0, fly: null, inv: 0, cd: [0, 0, 0], ram: 0, nib: 0, foc: 0 });
  Object.assign(s, { hp: HP_MAX, combo: 0, comboT: -999, comboBest: 0, best: 0, popBest: 0, popN: 0, skyBest: 0, skyE: 0, skyC: 0, sp: 0, wave: 0, waveT: 0, summonT: 0, summonI: 0, dropT: 0, clearT: 0, started: s.stage > 0, calm: s.stage > 0 ? 110 : 0, phase: 'play', pt: 0, got: 0, lostHeart: false, big: null });
  s.starOk = [false, false, false];
  s.newDex = [];
  s.newCombo = [];
  s.stT = s.t;
  spawnWave(s);
  const first = s.stage === 0 || STAGES[s.stage - 1].ch !== d.ch, nw = s.mons.find((m) => m.k === d.key);
  s.banner = { head: `${first ? CHAPTERS[d.ch] + ' · ' : ''}${s.stage + 1}판`, sub: d.news, t: s.t };
  s.spot = nw ? { id: nw.id, t: s.t, label: KD[d.key].boss ? KD[d.key].name : `NEW ${KD[d.key].name} → ${PD[KD[d.key].p].name}` } : null;
  see(s, 'stage' + s.stage);
  if (first) see(s, 'ch' + d.ch);
  ev(s, 'stage', 0.5, 0.7, s.stage);
}
export const __dbg: Record<string, number> = { weak: 0, plain: 0, sky: 0, pop: 0, fast: 0, mulx: 0, clear: 0 };
function clearStage(s: DrState) {
  const d = STAGES[s.stage];
  s.phase = 'result';
  s.pt = 0;
  s.starOk = [true, !s.lostHeart, starNow(s) >= d.n];
  s.got = s.starOk.filter(Boolean).length;
  s.stars += s.got;
  s.fast = Math.max(0, Math.round((50 - (s.t - s.stT) / 60) * 2 * stMul(s)));
  s.gain = (s.sp + CLEAR_PTS + s.fast) * STAR_MUL[s.got];
  __dbg.fast += s.fast; __dbg.mulx += s.gain - s.sp - CLEAR_PTS - s.fast; __dbg.clear += CLEAR_PTS;
  s.pts += s.gain;
  s.sp = 0;
  s.lv++;
  see(s, 'lv' + s.lv);
  s.spot = null;
  if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * 30);
  ev(s, 'clear', 0.5, 0.7, s.got);
}
function failStage(s: DrState) {
  s.phase = 'fail';
  s.pt = 0;
  s.fails++;
  s.big = null;
  s.cardQ = [];
  ev(s, 'fail', s.me.x, s.me.y);
  see(s, 'fail');
}
function retry(s: DrState) {
  s.hearts = 3;
  newStage(s);
}
function advance(s: DrState) {
  const d = STAGES[s.stage];
  if (s.won) return void ((s.phase = 'end'), (s.pt = 0), ev(s, 'end', 0.5, 0.7, 1));
  if (KD[d.key].boss && d.ch < PERKS.length && !s.perk[d.ch]) return void ((s.phase = 'pick'), (s.pt = 0), (s.picked = -1), see(s, 'pick' + d.ch), ev(s, 'pickopen', 0.5, 0.7));
  s.stage++;
  newStage(s);
}
function playStep(s: DrState) {
  if (s.cardQ.length && (!s.big || s.t - s.big.t >= 34)) (s.big = s.cardQ.shift()!), (s.big.t = s.t);
  const d = STAGES[s.stage];
  if (s.calm > 0) s.calm--;
  if (s.combo > 0 && s.t - s.comboT > COMBO_T) comboBreak(s);
  myStep(s);
  for (const f of s.flocks) flockStep(s, f);
  for (const m of s.mons) if (!m.dead) foeStep(s, m);
  separate(s);
  shotStep(s);
  mineStep(s);
  itemStep(s);
  queueStep(s);
  if (s.phase !== 'play') return;
  if (s.mons.some((m) => m.dead)) s.mons = s.mons.filter((m) => !m.dead);
  if (s.flocks.length && s.t % 4 === 0) s.flocks = s.flocks.filter((f) => s.mons.some((m) => m.fid === f.id));
  // 오른쪽에서 몰려온다: 줄 선 떼가 자리가 나는 대로
  if (s.inbox.length && s.t % 14 === 0 && s.mons.length + s.inbox[0].n <= CAP) spawnFlock(s, s.inbox.shift()!, false);
  const n = foes(s) + s.inbox.reduce((a, f) => a + f.n, 0), boss = s.mons.find(isBoss);
  if (s.started) s.waveT++;
  if (s.started && s.wave < d.waves.length && (n <= d.waves[s.wave].need || s.waveT >= d.waves[s.wave].wait)) spawnWave(s);
  if (boss && boss.st !== ENTER && s.started) {
    // 대장 판: 졸개를 부르고, 부위를 흘린다 (기다리지 않게 처음엔 금방)
    if (d.summon && ++s.summonT >= 90 && n <= 4) (s.summonT = 0), s.inbox.push(...d.summon[s.summonI++ % d.summon.length]), ev(s, 'summon', boss.x, boss.y - boss.r, 0, 0, 0, boss.k);
    if (++s.dropT >= (boss.drops || s.skyBest ? 720 : 150) && !s.items.length) (boss.drops = Math.max(boss.drops, 0)), dropItem(s, boss);
  }
  if (s.wave >= d.waves.length && !s.inbox.length && s.mons.length === 0 && !s.me.fly) {
    if (++s.clearT >= 44) clearStage(s);
  } else s.clearT = 0;
}

const game: GameDef<DrState> & { wows(s: DrState): number } = {
  id: 'eatdragon',
  name: '🐉 먹고 바뀌는 아기 용',
  genes: ['eatdragon', 'chain', 'collect'],
  twist: '적은 쓰러뜨릴 것이 아니라 먹을 것 — 한 입마다 그 짐승의 부위가 내 몸에 돋아 머리·등·꼬리 세 자리의 조합이 공격 전체를 바꾸고, 무서운 왕일수록 맛있다',
  rules: [
    '떼를 톡 하면 아기 용이 날아가 꿀꺽! 먹은 짐승의 부위가 내 몸에 돋아요.',
    '머리는 숨결, 등은 몸놀림, 꼬리는 휘두르기 — 싸움은 저절로. 새것이 옛것을 밀어내요.',
    '부위가 다 떨어진 맨몸으로 맞으면 하트 -1. 하늘을 비우면 다음 판!',
  ],
  controls: 'touch',
  hint: '떼를 톡 — 아기 용이 날아가 꿀꺽 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '구름 위 하늘 섬 — 반짝이는 그림책',
    mood: '아침 햇살이 비치는 구름 들판·무지개 폭포·노을 번개 성을 통통한 아기 용이 날아간다. 먹을 때마다 불꽃 볏·바위 등·바람개비 꼬리가 펑펑 돋고, 몸빛이 먹은 짐승의 색으로 바뀐다.',
    palette: { bg: '#8fd3ff', ink: '#3b2a3f', muted: '#8a7a8e', accent: '#ff8a3d', hot: '#ff5a4e', soft: '#fff1d6' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.hearts,
  cleared: (s) => (s.phase === 'result' ? { stage: s.stage, got: s.got, of: 3 } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const me: Me = {
      x: HOME_X, y: HOME_Y, vx: 0, vy: 0, face: 1, parts: [null, null, null], tint: BARE_TINT, chew: 0, fly: null, inv: 0, hurtT: -99,
      cd: [0, 0, 0], atkT: [-99, -99, -99], aim: [0, 0, 0], reach: [0, 0, 0], ram: 0, ramA: 0, ramE: 0, eatT: -99, nib: 0, tx: 0, ty: 0, foc: 0,
    };
    const s: DrState = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, hearts: 3, pts: 0, sp: 0, stars: 0, got: 0, starOk: [false, false, false], hp: HP_MAX, combo: 0, comboT: -999, comboBest: 0, popBest: 0, popN: 0, popT: -99, skyBest: 0, skyE: 0, skyC: 0, dead: false, won: false, lostHeart: false,
      lv: 1, perk: [0, 0], picked: -1, dex: [], newDex: [], combos: [], newCombo: [], forms: [],
      me, mons: [], flocks: [], nid: 0, shots: [], mines: [], twisters: [], items: [], q: [],
      eid: 0, chE: 0, evN: new Map(), best: 0, kills: 0, wkills: 0, eats: 0, gain: 0, fast: 0, stT: 0,
      wave: 0, waveT: 0, inbox: [], summonT: 0, summonI: 0, dropT: 0, clearT: 0, started: false, calm: 0,
      events: [], lines: [], corpses: [], sheds: [], freeze: 0, down: false, wowN: 0, firstTap: -1, firstBig: -1, denyT: -99, fails: 0,
      seen: new Set<string>(), banner: null, spot: null, big: null, cardQ: [],
    };
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
      // 용은 두 선물 사이 위쪽으로 날아와 구경한다 (선물을 가리지 않게)
      (s.me.x += (0.5 - s.me.x) * 0.1), (s.me.y += (0.56 - s.me.y) * 0.1);
      if (s.picked < 0) {
        if (tap && p && s.pt >= PICK_MIN) s.picked = p.x < 0.5 ? 0 : 1;
        else if (s.pt >= PICK_AUTO) s.picked = 0;
        if (s.picked >= 0) (s.perk[ch] = s.picked + 1), (s.pt = 0), see(s, `perk${ch}${s.picked}`), ev(s, 'perk', s.picked ? 0.72 : 0.28, 0.86, s.picked);
      } else if (s.pt >= PICK_AFTER) s.stage++, newStage(s);
    } else if (s.phase === 'fail') {
      if ((tap && s.pt >= FAIL_MIN) || s.pt >= FAIL_AUTO) retry(s);
    } else if (s.pt >= END_T) s.dead = true;
    if (s.events.length > 90) s.events.splice(0, s.events.length - 90);
    while (s.events.length && s.t - s.events[0].t > 120) s.events.shift();
    if (s.lines.length) s.lines = s.lines.filter((l) => s.t - l.t < 18);
    if (s.corpses.length) s.corpses = s.corpses.filter((c) => s.t - c.t < 40);
    if (s.sheds.length) s.sheds = s.sheds.filter((c) => s.t - c.t < 60);
    if (s.spot && s.t - s.spot.t > 240) s.spot = null;
  },
  over: (s) => s.dead,
  score: (s) => s.pts + s.sp,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const eatdragon = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
const tapOn = (m: { x: number; y: number }) => at(m.x, m.y);
const canEat = (s: DrState) => s.phase === 'play' && !s.down && !s.me.fly && s.me.chew <= 0;
/** 결과·실패·둘 중 하나 화면은 버릇 봇도 그냥 넘긴다 */
function between(s: DrState, left: boolean): Input | null {
  if (s.phase === 'play') return null;
  if (s.down) return NO;
  if (s.phase === 'result') return s.pt >= RES_MIN ? at(0.5, 0.8) : NO;
  if (s.phase === 'fail') return s.pt >= FAIL_MIN ? at(0.5, 0.8) : NO;
  if (s.phase === 'pick') return s.picked < 0 && s.pt >= PICK_MIN ? at(left ? 0.28 : 0.72, 0.86) : NO;
  return NO;
}

/** 먹을 것 후보: 떼마다 하나(용에게 가장 가까운 놈) */
function candidates(s: DrState): Mon[] {
  const me = s.me, out: Mon[] = [], done = new Set<number>();
  const list = s.mons.filter((m) => hittable(m) && !isBoss(m)).sort((a, b) => dist(a.x, a.y, me.x, me.y) - dist(b.x, b.y, me.x, me.y) || a.id - b.id);
  for (const m of list) if (!done.has(m.fid)) done.add(m.fid), out.push(m);
  return out;
}
/** 지금 몸에 이 짐승과 어울리는 부위가 있나 */
const fits = (p: P, k: K) => ATK_OF[p] === 'sky' || WEAK[k].includes(ATK_OF[p]);
const covered = (s: DrState, k: K) => s.me.parts.some((q) => q && fits(q.p, k));
/**
 * 봇(잘하는): 한 줄 판단 — 대장이 흘린 것이 있으면 그것, 아니면 '지금 하늘에 가장 많은(남은 체력 합) 짐승'과 어울리는 부위를 주는 떼를 톡.
 * 이미 어울리는 부위가 있으면 먹지 않고 싸운다(같은 부위 떼가 있으면 먹어 키운다).
 */
export const eatdragonSmart: Bot<DrState> = {
  name: '가장 많은 짐승에 어울리는 부위로',
  act(s) {
    const mid = between(s, true);
    if (mid) return mid;
    if (!canEat(s)) return NO;
    const me = s.me;
    // 대장이 흘린 것이 보이면 곧장 톡 (대장의 힘)
    if (s.items.length) return tapOn(s.items[0]);
    const cand = candidates(s);
    if (!cand.length) return NO;
    if (me.parts.every((q) => !q)) return tapOn(cand[0]);
    // 딱 맞아가 쌓였으면 가장 붐비는 떼에 뛰어들어 폭죽으로 터뜨린다
    if (STAGES[s.stage].star === 'pop' && s.popBest < STAGES[s.stage].n && s.combo >= 8) {
      const crowd = (m: Mon) => s.mons.filter((o) => hittable(o) && !isBoss(o) && dist(o.x, o.y, m.x, m.y) < 0.09 + 0.02 * s.combo).length;
      let bm: Mon | null = null, bn = 3;
      for (const m of cand) { const n = crowd(m); if (n > bn) (bn = n), (bm = m); }
      if (bm) return tapOn(bm);
    }
    const cnt = new Map<K, number>();
    for (const m of s.mons) if (hittable(m) && !isBoss(m)) cnt.set(m.k, (cnt.get(m.k) ?? 0) + Math.max(0, m.hp));
    const kinds = [...cnt.keys()].sort((a, b) => cnt.get(b)! - cnt.get(a)! || a.localeCompare(b));
    // 덮인 자리는 지킨다: 위쪽(많은) 짐승을 덮고 있는 부위는 바꾸지 않는다
    const keep = new Set<number>();
    for (const k of kinds) {
      if (covered(s, k)) {
        me.parts.forEach((q, i) => q && fits(q.p, k) && keep.add(i));
        continue;
      }
      const c = cand.find((m) => WEAK[k].includes(ATK_OF[KD[m.k].p]) && !keep.has(PD[KD[m.k].p].slot));
      if (c) return tapOn(c);
    }
    // 다 덮였으면 지금 부위를 키운다
    const grow = cand.find((m) => { const q = me.parts[PD[KD[m.k].p].slot]; return !!q && q.p === KD[m.k].p && q.g < 3; });
    return grow ? tapOn(grow) : NO;
  },
};

/** 봇: 아무 때나 아무 데나 톡 */
export const eatdragonRandom: Bot<DrState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    if (s.down) return NO;
    return rng() < 1 / 40 ? at(0.06 + rng() * 0.88, 0.2 + rng() * 1.0) : NO;
  },
};

/** 버릇 봇: 씹기가 끝나면 늘 가장 가까운 떼 */
export const eatdragonHabit: Bot<DrState> = {
  name: '버릇: 늘 가장 가까운 떼',
  act(s) {
    const mid = between(s, true);
    if (mid) return mid;
    if (!canEat(s)) return NO;
    const me = s.me;
    let best: { x: number; y: number } | null = null, bd = 1e9;
    for (const m of s.mons) if (hittable(m) && !isBoss(m) && dist(me.x, me.y, m.x, m.y) < bd) (bd = dist(me.x, me.y, m.x, m.y)), (best = m);
    return best ? tapOn(best) : NO;
  },
};

/** 독립 버릇 봇: 씹기가 끝나면 늘 가장 큰 떼(마리 수) */
export const eatdragonHabit2: Bot<DrState> = {
  name: '버릇: 늘 가장 큰 떼',
  act(s) {
    const mid = between(s, false);
    if (mid) return mid;
    if (!canEat(s)) return NO;
    const me = s.me, cnt = new Map<number, number>();
    for (const m of s.mons) if (hittable(m) && !isBoss(m)) cnt.set(m.fid, (cnt.get(m.fid) ?? 0) + 1);
    let best: { x: number; y: number } | null = null, bv = -1e9;
    for (const m of s.mons) {
      if (!hittable(m) || isBoss(m)) continue;
      const v = (cnt.get(m.fid) ?? 0) * 10 - dist(me.x, me.y, m.x, m.y);
      if (v > bv) (bv = v), (best = m);
    }
    return best ? tapOn(best) : NO;
  },
};
/** 측정·스크린샷용: k판으로 건너뛰기 */
export const __jump = (s: DrState, k: number, lv = k + 1, perk: number[] = [k > 3 ? 1 : 0, k > 7 ? 1 : 0]) => ((s.stage = k), (s.lv = lv), (s.perk = perk), newStage(s));
/** 스크린샷용: 몸에 부위를 붙인다 */
export const __give = (s: DrState, ps: P[], g = 1) => {
  for (const p of ps) {
    const d = PD[p], max = p === 'rock' ? 44 : 18;
    s.me.parts[d.slot] = { p, g, hp: max, max, born: s.t - 60, ch: 0 };
    s.me.tint = d.boss ? d.col : KD[(Object.keys(KD) as K[]).find((k) => KD[k].p === p)!].col;
    if (!s.dex.includes(p)) s.dex.push(p);
  }
  s.started = true;
};

// ───────────────────────────── 그리기: 도구 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const OUT = '#3b2a3f';
const LW = 0.1;
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
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
/** 뾰족뾰족 터지는 모양 */
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
  g.lineJoin = 'round';
  g.lineCap = 'round';
  paint(g);
  return c;
}
/** 채우고 테두리 */
function ink(g: C2, fill: string | CanvasGradient, lw = LW, stroke = OUT) {
  g.fillStyle = fill;
  g.fill();
  if (lw > 0) (g.strokeStyle = stroke), (g.lineWidth = lw), g.stroke();
}
/** 색 섞기 (#rrggbb 둘) */
const CMIX = new Map<string, string>();
function mix(a: string, b: string, t: number) {
  const key = a + b + t.toFixed(2);
  let c = CMIX.get(key);
  if (!c) {
    const rgb = (c0: string) => (c0[0] === '#' ? [1, 3, 5].map((i) => parseInt(c0.slice(i, i + 2), 16)) : c0.slice(4, -1).split(',').map(Number));
    const pa = rgb(a), pb = rgb(b);
    c = `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
    if (CMIX.size > 400) CMIX.clear();
    CMIX.set(key, c);
  }
  return c;
}
const lite = (c: string, t = 0.45) => mix(c, '#ffffff', t);
const dark = (c: string, t = 0.35) => mix(c, '#2a1838', t);
function shine(g: C2, x: number, y: number, rx: number, ry: number, rot = -0.5, a = 0.5) {
  g.fillStyle = `rgba(255,255,255,${a})`;
  ell(g, x, y, rx, ry, rot);
  g.fill();
}
function blush(g: C2, cx: number, cy: number, e: number, r: number) {
  g.fillStyle = 'rgba(255,110,130,.42)';
  for (const sd of [-1, 1]) ell(g, cx + sd * e, cy, r, r * 0.62), g.fill();
}

// ───────────────────────────── 그리기: 얼굴 ─────────────────────────────
/** 표정: 평소 · 화남(뜸) · 아야 · 겁먹음(먹히는 중) · 어질 · 신남 */
const F_IDLE = 0, F_ANGRY = 1, F_HURT = 2, F_SCARED = 3, F_DIZZY = 4, F_HAPPY = 5;
/** (cx,cy) = 두 눈 사이, e = 눈 간격의 절반, s = 눈 크기, my = 입까지(0이면 입 없음) */
function face(g: C2, cx: number, cy: number, e: number, s: number, mood: number, my: number, mw = 1, eyeCol = '#2a1a22') {
  g.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const x = cx + sd * e, y = cy;
    if (mood === F_HURT) {
      g.strokeStyle = OUT;
      g.lineWidth = s * 0.36;
      g.beginPath();
      g.moveTo(x - sd * s * 0.7, y - s * 0.6);
      g.lineTo(x + sd * s * 0.5, y);
      g.lineTo(x - sd * s * 0.7, y + s * 0.6);
      g.stroke();
    } else if (mood === F_DIZZY) {
      g.strokeStyle = OUT;
      g.lineWidth = s * 0.26;
      g.beginPath();
      for (let i = 0; i <= 14; i++) {
        const a = i * 0.75, q = s * (0.12 + i * 0.058);
        if (i) g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
        else g.moveTo(x + q, y);
      }
      g.stroke();
    } else if (mood === F_HAPPY) {
      g.strokeStyle = OUT;
      g.lineWidth = s * 0.36;
      g.beginPath();
      g.arc(x, y + s * 0.3, s * 0.7, Math.PI * 1.12, Math.PI * 1.88);
      g.stroke();
    } else {
      const big = mood === F_SCARED ? 1.2 : 1;
      ell(g, x, y, s * 0.86 * big, s * 1.0 * big);
      ink(g, '#ffffff', s * 0.2);
      const pr = mood === F_SCARED ? 0.3 : 0.46;
      ell(g, x - s * 0.12, y + s * 0.05, s * pr, s * pr * 1.2);
      g.fillStyle = eyeCol;
      g.fill();
      ell(g, x - s * 0.24, y - s * 0.16, s * 0.17, s * 0.2);
      g.fillStyle = '#ffffff';
      g.fill();
      if (mood === F_ANGRY) {
        g.strokeStyle = OUT;
        g.lineWidth = s * 0.42;
        g.beginPath();
        g.moveTo(x + sd * s * 1.05, y - s * 1.6);
        g.lineTo(x - sd * s * 0.75, y - s * 0.95);
        g.stroke();
      } else if (mood === F_SCARED) {
        g.strokeStyle = OUT;
        g.lineWidth = s * 0.3;
        g.beginPath();
        g.moveTo(x - sd * s * 0.9, y - s * 1.55);
        g.lineTo(x + sd * s * 0.7, y - s * 1.3);
        g.stroke();
      }
    }
  }
  if (my <= 0) return;
  const y = cy + my, w = s * 1.1 * mw;
  g.strokeStyle = OUT;
  g.lineWidth = s * 0.3;
  if (mood === F_ANGRY || mood === F_SCARED) {
    ell(g, cx, y + s * 0.2, w * 0.6, s * (mood === F_SCARED ? 0.7 : 0.55));
    ink(g, '#8c2f3f', s * 0.26);
  } else if (mood === F_HURT) {
    ell(g, cx, y + s * 0.15, s * 0.42, s * 0.5);
    ink(g, '#8c2f3f', s * 0.24);
  } else if (mood === F_DIZZY) {
    g.beginPath();
    g.moveTo(cx - w, y);
    g.quadraticCurveTo(cx - w * 0.5, y - s * 0.5, cx, y);
    g.quadraticCurveTo(cx + w * 0.5, y + s * 0.5, cx + w, y);
    g.stroke();
  } else if (mood === F_HAPPY) {
    g.beginPath();
    g.moveTo(cx - w, y - s * 0.15);
    g.quadraticCurveTo(cx, y + s * 1.3, cx + w, y - s * 0.15);
    g.closePath();
    ink(g, '#8c2f3f', s * 0.26);
  } else {
    g.beginPath();
    g.moveTo(cx - w * 0.7, y);
    g.quadraticCurveTo(cx, y + s * 0.7, cx + w * 0.7, y);
    g.stroke();
  }
}

// ───────────────────────────── 그리기: 하늘 짐승 스티커 ─────────────────────────────
/** 단위 좌표: 몸 반지름 = 1, 몸 가운데 = (0,0), 왼쪽(용 쪽)을 본다. f = 날갯짓 장면(0·1) */
function flame(g: C2, x: number, y: number, k: number, f: number) {
  // 세 갈래 불꽃
  g.beginPath();
  g.moveTo(x - k * 0.55, y);
  g.quadraticCurveTo(x - k * 0.75, y - k * 0.6, x - k * 0.45, y - k * (1.05 + f * 0.1));
  g.quadraticCurveTo(x - k * 0.25, y - k * 0.6, x - k * 0.1, y - k * 0.75);
  g.quadraticCurveTo(x - k * 0.05, y - k * 1.4, x + k * 0.12, y - k * (1.75 - f * 0.12));
  g.quadraticCurveTo(x + k * 0.3, y - k * 1.0, x + k * 0.32, y - k * 0.7);
  g.quadraticCurveTo(x + k * 0.5, y - k * 0.8, x + k * 0.6, y - k * (1.15 + f * 0.1));
  g.quadraticCurveTo(x + k * 0.85, y - k * 0.5, x + k * 0.55, y);
  g.closePath();
  ink(g, lin(g, 0, y - k * 1.7, 0, y, [0, '#fff6a8'], [0.45, '#ffb02e'], [1, '#ff4f1f']), LW * 0.9, '#b8381a');
  g.beginPath();
  g.moveTo(x - k * 0.28, y);
  g.quadraticCurveTo(x - k * 0.3, y - k * 0.5, x + k * 0.05, y - k * 0.95);
  g.quadraticCurveTo(x + k * 0.3, y - k * 0.45, x + k * 0.28, y);
  g.closePath();
  g.fillStyle = '#fff3a0';
  g.fill();
}
function crystal(g: C2, x: number, y: number, k: number, rot: number) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.beginPath();
  g.moveTo(-k * 0.3, 0);
  g.lineTo(-k * 0.26, -k * 0.8);
  g.lineTo(0, -k * 1.3);
  g.lineTo(k * 0.26, -k * 0.8);
  g.lineTo(k * 0.3, 0);
  g.closePath();
  ink(g, lin(g, -k * 0.3, -k, k * 0.3, 0, [0, '#ffffff'], [0.5, '#bdeeff'], [1, '#5fb8f0']), LW * 0.8, '#2a6fa8');
  g.strokeStyle = 'rgba(255,255,255,.8)';
  g.lineWidth = LW * 0.5;
  g.beginPath();
  g.moveTo(-k * 0.1, -k * 0.15);
  g.lineTo(-k * 0.08, -k * 0.85);
  g.stroke();
  g.restore();
}
function zig(g: C2, x: number, y: number, k: number, flip = 1) {
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + flip * k * 0.45, y - k * 0.55);
  g.lineTo(x + flip * k * 0.12, y - k * 0.62);
  g.lineTo(x + flip * k * 0.62, y - k * 1.35);
  g.lineTo(x - flip * k * 0.05, y - k * 0.7);
  g.lineTo(x + flip * k * 0.22, y - k * 0.64);
  g.lineTo(x - flip * k * 0.22, y);
  g.closePath();
  ink(g, lin(g, 0, y - k * 1.3, 0, y, [0, '#fffbd0'], [0.5, '#ffe14a'], [1, '#ffab1a']), LW * 0.85, '#a86a00');
}
function pinwheel(g: C2, x: number, y: number, k: number, rot: number) {
  const cols = ['#ff7eb6', '#ffd84a', '#6fe8c0', '#7cc8ff'];
  for (let i = 0; i < 4; i++) {
    const a = rot + (i * Math.PI) / 2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
    g.quadraticCurveTo(x + Math.cos(a + 0.9) * k * 0.9, y + Math.sin(a + 0.9) * k * 0.9, x + Math.cos(a + Math.PI / 2) * k * 0.15, y + Math.sin(a + Math.PI / 2) * k * 0.15);
    g.closePath();
    ink(g, cols[i], LW * 0.7);
  }
  ell(g, x, y, k * 0.16, k * 0.16);
  ink(g, '#ffffff', LW * 0.6);
}
function mallet(g: C2, x: number, y: number, k: number, rot: number) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  rr(g, -k * 0.62, -k * 0.42, k * 1.24, k * 0.84, k * 0.22);
  ink(g, lin(g, 0, -k * 0.42, 0, k * 0.42, [0, '#e3dbd0'], [0.55, '#b0a494'], [1, '#857868']), LW * 0.9);
  rr(g, -k * 0.16, -k * 0.44, k * 0.32, k * 0.88, k * 0.08);
  ink(g, '#c9863e', LW * 0.6);
  g.strokeStyle = 'rgba(80,60,50,.5)';
  g.lineWidth = LW * 0.5;
  g.beginPath();
  g.moveTo(-k * 0.45, -k * 0.15);
  g.lineTo(-k * 0.3, k * 0.05);
  g.lineTo(-k * 0.4, k * 0.25);
  g.stroke();
  shine(g, -k * 0.38, -k * 0.24, k * 0.16, k * 0.07, 0, 0.6);
  g.restore();
}
function bubbleDot(g: C2, x: number, y: number, r: number) {
  ell(g, x, y, r, r);
  g.fillStyle = 'rgba(255,255,255,.35)';
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,.95)';
  g.lineWidth = r * 0.22;
  g.stroke();
  ell(g, x - r * 0.35, y - r * 0.35, r * 0.25, r * 0.18, -0.6);
  g.fillStyle = '#ffffff';
  g.fill();
}
const PAINT: Record<K, (g: C2, mood: number, f: number) => void> = {
  bat(g, mood, f) {
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.55, -0.25);
      g.quadraticCurveTo(sd * 1.3, f ? -1.25 : -0.55, sd * 2.0, f ? -1.0 : 0.05);
      g.quadraticCurveTo(sd * 1.75, f ? -0.55 : 0.35, sd * 1.5, f ? -0.4 : 0.42);
      g.quadraticCurveTo(sd * 1.3, f ? -0.1 : 0.62, sd * 1.0, f ? 0.0 : 0.55);
      g.quadraticCurveTo(sd * 0.75, 0.25, sd * 0.5, 0.35);
      g.closePath();
      ink(g, lin(g, 0, -1, 0, 0.6, [0, '#7c4590'], [1, '#4a2457']), LW * 1.1);
      g.strokeStyle = 'rgba(200,150,220,.55)';
      g.lineWidth = LW * 0.5;
      g.beginPath();
      g.moveTo(sd * 0.6, -0.15);
      g.lineTo(sd * 1.5, f ? -0.45 : 0.38);
      g.moveTo(sd * 0.6, -0.1);
      g.lineTo(sd * 1.05, f ? -0.05 : 0.5);
      g.stroke();
    }
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.25, -0.7);
      g.lineTo(sd * 0.62, -1.35);
      g.lineTo(sd * 0.72, -0.5);
      g.closePath();
      ink(g, '#6b3a7d', LW);
    }
    ell(g, 0, 0.02, 0.92, 0.86);
    ink(g, lin(g, 0, -0.9, 0, 0.9, [0, '#a066b4'], [1, '#5d2f6a']), LW * 1.2);
    ell(g, 0.05, 0.38, 0.55, 0.38);
    g.fillStyle = 'rgba(230,180,240,.6)';
    g.fill();
    shine(g, -0.38, -0.5, 0.26, 0.13);
    flame(g, 0.05, -0.62, 1.05, f);
    face(g, -0.2, -0.08, 0.3, 0.24, mood, 0.4, 0.9);
    if (mood === F_IDLE || mood === F_HAPPY) {
      g.fillStyle = '#ffffff';
      for (const sd of [-1, 1]) (g.beginPath(), g.moveTo(-0.2 + sd * 0.1, 0.38), g.lineTo(-0.2 + sd * 0.05, 0.52), g.lineTo(-0.2 + sd * 0.16, 0.39), g.fill());
    }
    blush(g, -0.18, 0.14, 0.52, 0.13);
  },
  beetle(g, mood, f) {
    // 날개(껍데기 밑에서 붕붕)
    for (const sd of [0.2, 0.7]) {
      ell(g, sd, -0.55, 0.55, 0.22, f ? -0.9 : -0.5);
      g.fillStyle = 'rgba(220,240,255,.55)';
      g.fill();
      g.strokeStyle = 'rgba(80,110,140,.5)';
      g.lineWidth = LW * 0.5;
      g.stroke();
    }
    g.strokeStyle = OUT;
    g.lineWidth = LW * 1.3;
    for (const x of [-0.5, 0.05, 0.6]) (g.beginPath(), g.moveTo(x, 0.45), g.lineTo(x - 0.18, 0.85), g.lineTo(x - 0.05, 0.95), g.stroke());
    ell(g, 0.1, 0.2, 1.0, 0.62);
    ink(g, lin(g, 0, -0.4, 0, 0.8, [0, '#4f86b0'], [1, '#2a4d6e']), LW * 1.1);
    ell(g, -0.82, 0.15, 0.48, 0.42);
    ink(g, lin(g, 0, -0.3, 0, 0.6, [0, '#5a92bd'], [1, '#30577a']), LW * 1.1);
    // 바위 껍데기(머리까지 덮는 투구)
    g.beginPath();
    g.moveTo(-1.28, 0.08);
    g.quadraticCurveTo(-1.25, -0.6, -0.55, -0.95);
    g.quadraticCurveTo(0.15, -1.35, 0.85, -0.85);
    g.quadraticCurveTo(1.3, -0.45, 1.15, 0.2);
    g.quadraticCurveTo(0.2, -0.05, -0.55, 0.0);
    g.quadraticCurveTo(-0.95, 0.02, -1.28, 0.08);
    g.closePath();
    ink(g, lin(g, 0, -1.3, 0, 0.2, [0, '#e6e0d6'], [0.5, '#bdb2a4'], [1, '#8a7e70']), LW * 1.25);
    g.strokeStyle = 'rgba(70,55,45,.55)';
    g.lineWidth = LW * 0.6;
    g.beginPath();
    g.moveTo(-0.2, -1.05);
    g.lineTo(-0.05, -0.7);
    g.lineTo(-0.25, -0.45);
    g.moveTo(-0.05, -0.7);
    g.lineTo(0.3, -0.55);
    g.moveTo(0.6, -0.9);
    g.lineTo(0.55, -0.55);
    g.stroke();
    g.fillStyle = '#7cc25a';
    for (const [x, y, r] of [[-0.75, -0.62, 0.14], [0.4, -1.02, 0.12], [0.95, -0.3, 0.1]]) ell(g, x, y, r, r * 0.7), g.fill();
    shine(g, -0.55, -0.82, 0.3, 0.12, -0.6, 0.6);
    g.beginPath();
    g.moveTo(-1.2, -0.05);
    g.lineTo(-1.5, -0.35);
    g.lineTo(-1.22, -0.3);
    ink(g, '#cfc5b6', LW * 0.9);
    face(g, -0.85, 0.22, 0.2, 0.17, mood, 0.32, 0.8);
  },
  fly(g, mood, f) {
    for (const [dx, k] of [[0.05, 1], [-0.25, 0.85]]) {
      for (const sd of [-1, 1]) {
        ell(g, dx + sd * 0.15, -0.35 + sd * 0.05, 1.5 * k, 0.34 * k, sd * (f ? 0.5 : 0.15) - 0.15);
        g.fillStyle = 'rgba(225,250,255,.6)';
        g.fill();
        g.strokeStyle = 'rgba(70,150,160,.6)';
        g.lineWidth = LW * 0.5;
        g.stroke();
      }
    }
    // 꼬리(긴 배)와 바람개비
    g.beginPath();
    g.moveTo(0.1, -0.12);
    g.quadraticCurveTo(0.9, -0.1, 1.55, 0.05);
    g.quadraticCurveTo(0.9, 0.2, 0.1, 0.18);
    g.closePath();
    ink(g, lin(g, 0, -0.1, 1.5, 0.1, [0, '#3fb8b0'], [1, '#2a7fb0']), LW * 0.9);
    g.strokeStyle = 'rgba(30,70,90,.5)';
    g.lineWidth = LW * 0.5;
    for (const x of [0.45, 0.75, 1.05, 1.3]) (g.beginPath(), g.moveTo(x, -0.1), g.lineTo(x, 0.14), g.stroke());
    pinwheel(g, 1.68, 0.05, 0.62, f ? Math.PI / 4 : 0);
    ell(g, -0.15, 0, 0.42, 0.36);
    ink(g, lin(g, 0, -0.4, 0, 0.4, [0, '#5ee0cc'], [1, '#2a9a96']), LW);
    ell(g, -0.72, -0.05, 0.48, 0.44);
    ink(g, '#4fd0c4', LW);
    for (const sd of [-1, 1]) {
      ell(g, -0.75 + sd * 0.18, -0.25, 0.26, 0.28);
      ink(g, radg(g, -0.8 + sd * 0.18, -0.32, 0.02, 0.3, [0, '#d8ffb0'], [1, '#3fae5a']), LW * 0.6);
      ell(g, -0.82 + sd * 0.18, -0.34, 0.08, 0.08);
      g.fillStyle = '#ffffff';
      g.fill();
    }
    g.strokeStyle = OUT;
    g.lineWidth = LW * 0.8;
    g.beginPath();
    if (mood === F_HURT || mood === F_SCARED) ell(g, -0.78, 0.12, 0.09, 0.1), ink(g, '#8c2f3f', LW * 0.6);
    else g.arc(-0.78, 0.05, 0.14, 0.2 * Math.PI, 0.8 * Math.PI), g.stroke();
    blush(g, -0.72, 0.1, 0.3, 0.09);
  },
  bfly(g, mood, f) {
    const sx = f ? 0.62 : 1;
    for (const sd of [-1, 1]) {
      g.save();
      g.scale(sx, 1);
      g.beginPath();
      g.moveTo(sd * 0.12, -0.25);
      g.lineTo(sd * 0.75, -1.3);
      g.lineTo(sd * 1.55, -1.05);
      g.lineTo(sd * 1.45, -0.25);
      g.lineTo(sd * 0.18, 0.05);
      g.closePath();
      ink(g, lin(g, 0, -1.3, 0, 0.1, [0, '#ffffff'], [0.45, '#bfeeff'], [1, '#62b8f0']), LW);
      g.beginPath();
      g.moveTo(sd * 0.15, 0.1);
      g.lineTo(sd * 1.15, 0.2);
      g.lineTo(sd * 1.0, 0.9);
      g.lineTo(sd * 0.3, 0.75);
      g.closePath();
      ink(g, lin(g, 0, 0, 0, 0.9, [0, '#d8f6ff'], [1, '#5aa8e8']), LW);
      g.strokeStyle = 'rgba(255,255,255,.9)';
      g.lineWidth = LW * 0.6;
      const cx = sd * 0.92, cy = -0.62;
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        g.beginPath();
        g.moveTo(cx - Math.cos(a) * 0.22, cy - Math.sin(a) * 0.22);
        g.lineTo(cx + Math.cos(a) * 0.22, cy + Math.sin(a) * 0.22);
        g.stroke();
      }
      g.restore();
    }
    ell(g, 0, 0.2, 0.17, 0.62);
    ink(g, '#2f4f8a', LW);
    ell(g, 0, -0.55, 0.34, 0.32);
    ink(g, lin(g, 0, -0.9, 0, -0.2, [0, '#5f88d8'], [1, '#2f4f8a']), LW);
    // 얼음 왕관(머리 = 얼음 숨결)
    crystal(g, -0.2, -0.78, 0.42, -0.35);
    crystal(g, 0, -0.84, 0.55, 0);
    crystal(g, 0.2, -0.78, 0.42, 0.35);
    face(g, -0.05, -0.52, 0.13, 0.11, mood, 0.16, 0.7);
    g.fillStyle = 'rgba(220,245,255,.85)';
    for (const [x, y, r] of [[-0.45, -0.35, 0.09], [-0.6, -0.3, 0.06], [-0.72, -0.22, 0.04]]) ell(g, x, y, r, r), g.fill();
  },
  jelly(g, mood, f) {
    g.strokeStyle = 'rgba(190,120,230,.85)';
    g.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const x = -0.6 + i * 0.3, ph = f * 1.2 + i;
      g.lineWidth = LW * (i % 2 ? 1.6 : 1.1);
      g.beginPath();
      g.moveTo(x, 0.15);
      g.bezierCurveTo(x + Math.sin(ph) * 0.2, 0.55, x - Math.sin(ph) * 0.25, 0.85, x + Math.sin(ph + 1) * 0.15, 1.25);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(-1.02, 0.2);
    g.bezierCurveTo(-1.05, -0.75, -0.55, -1.15, 0, -1.15);
    g.bezierCurveTo(0.55, -1.15, 1.05, -0.75, 1.02, 0.2);
    for (let i = 0; i < 6; i++) {
      const x0 = 1.02 - (i * 2.04) / 6, x1 = 1.02 - ((i + 1) * 2.04) / 6;
      g.quadraticCurveTo((x0 + x1) / 2, 0.42, x1, 0.2);
    }
    g.closePath();
    g.globalAlpha = 0.95;
    ink(g, radg(g, -0.25, -0.55, 0.1, 1.3, [0, '#fff0ff'], [0.5, '#eab8ff'], [1, '#b47ae8']), LW * 1.1, '#6b3a8a');
    g.globalAlpha = 1;
    for (const [x, y, r] of [[0.5, -0.5, 0.13], [0.65, -0.2, 0.08], [0.35, -0.85, 0.07], [-0.6, -0.25, 0.06]]) bubbleDot(g, x, y, r);
    shine(g, -0.45, -0.75, 0.32, 0.15, -0.6, 0.6);
    face(g, -0.2, -0.35, 0.24, 0.2, mood, 0.3, 0.6);
    // 거품을 부는 입 (머리 = 거품 숨결)
    if (mood !== F_HURT && mood !== F_DIZZY) bubbleDot(g, -0.68, -0.02, 0.17), bubbleDot(g, -0.95, -0.25, 0.1);
    blush(g, -0.2, -0.12, 0.42, 0.11);
  },
  squir(g, mood, f) {
    // 꼬리(돌망치) — 꼬리 = 망치 꼬리
    g.beginPath();
    g.moveTo(0.55, 0.25);
    g.quadraticCurveTo(1.35, 0.2, 1.45, -0.55);
    g.quadraticCurveTo(1.5, -0.95, 1.2, -1.05);
    g.quadraticCurveTo(1.05, -0.6, 0.6, -0.1);
    g.closePath();
    ink(g, lin(g, 0.5, 0, 1.5, -1, [0, '#c98a4e'], [1, '#e8b47a']), LW);
    mallet(g, 1.3, -1.25, 0.62, 0.35);
    // 날다람쥐 막
    g.beginPath();
    g.moveTo(-0.7, -0.1);
    g.quadraticCurveTo(-1.5, f ? -0.2 : 0.25, -1.25, 0.65);
    g.quadraticCurveTo(0, f ? 0.75 : 1.0, 1.05, 0.6);
    g.quadraticCurveTo(1.15, 0.2, 0.6, -0.05);
    g.closePath();
    ink(g, lin(g, 0, 0, 0, 1, [0, '#c98a4e'], [1, '#9a5f30']), LW);
    ell(g, 0, 0.1, 0.78, 0.62);
    ink(g, lin(g, 0, -0.5, 0, 0.7, [0, '#e0a666'], [1, '#b0703a']), LW * 1.1);
    ell(g, -0.05, 0.3, 0.45, 0.32);
    g.fillStyle = '#fbe6c6';
    g.fill();
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(-0.55 + sd * 0.25, -0.75);
      g.lineTo(-0.55 + sd * 0.38, -1.15);
      g.lineTo(-0.55 + sd * 0.05, -0.85);
      ink(g, '#c98a4e', LW * 0.9);
    }
    ell(g, -0.55, -0.45, 0.5, 0.45);
    ink(g, lin(g, 0, -0.9, 0, 0, [0, '#ebb67a'], [1, '#c4844a']), LW);
    face(g, -0.65, -0.48, 0.2, 0.16, mood, 0.28, 0.8);
    rr(g, -0.72, -0.2, 0.14, 0.12, 0.03);
    ink(g, '#ffffff', LW * 0.5);
    blush(g, -0.62, -0.26, 0.34, 0.1);
    shine(g, -0.3, -0.25, 0.2, 0.09);
  },
  spark(g, mood, f) {
    g.beginPath();
    g.moveTo(0.75, 0);
    g.lineTo(1.35, -0.25);
    g.lineTo(1.3, 0.1);
    g.lineTo(1.4, 0.35);
    g.lineTo(0.75, 0.3);
    g.closePath();
    ink(g, '#f0a81e', LW);
    ell(g, 0, 0, 0.95, 0.88);
    ink(g, lin(g, 0, -0.9, 0, 0.9, [0, '#fff08a'], [1, '#ffb81a']), LW * 1.2);
    ell(g, -0.1, 0.35, 0.55, 0.4);
    g.fillStyle = '#fff8dc';
    g.fill();
    g.beginPath();
    g.moveTo(0.1, -0.05);
    g.quadraticCurveTo(0.75, f ? -0.95 : -0.15, 1.05, f ? -0.8 : 0.3);
    g.quadraticCurveTo(0.55, f ? -0.15 : 0.45, 0.15, 0.3);
    g.closePath();
    ink(g, '#f5b820', LW);
    // 번개 볏 (머리 = 번개 숨결)
    zig(g, -0.1, -0.75, 0.95, -1);
    zig(g, 0.25, -0.7, 0.65, 1);
    g.beginPath();
    g.moveTo(-0.82, -0.1);
    g.lineTo(-1.28, 0.05);
    g.lineTo(-0.82, 0.2);
    g.closePath();
    ink(g, '#ff8a2e', LW * 0.9);
    g.fillStyle = '#fffbd0';
    starPath(g, -1.35, -0.12, 0.13, 0.4);
    g.fill();
    face(g, -0.35, -0.2, 0.25, 0.2, mood, 0.0001, 1);
    blush(g, -0.32, 0.1, 0.45, 0.12);
    shine(g, -0.4, -0.55, 0.25, 0.12);
  },
  puff(g, mood, f) {
    const L = f ? 0.62 : 0.32;
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU, b = a + TAU / 32, c = a + TAU / 16;
      if (i === 0) g.moveTo(Math.cos(a) * 0.92, Math.sin(a) * 0.88);
      g.lineTo(Math.cos(b) * (0.95 + L), Math.sin(b) * (0.9 + L));
      g.lineTo(Math.cos(c) * 0.92, Math.sin(c) * 0.88);
    }
    g.closePath();
    ink(g, lin(g, 0, -1.5, 0, 1.5, [0, '#fff1b0'], [1, '#e09a20']), LW * 0.9, '#9a5a12');
    g.beginPath();
    g.moveTo(0.9, -0.1);
    g.lineTo(1.35 + L * 0.3, -0.5);
    g.lineTo(1.35 + L * 0.3, 0.35);
    g.closePath();
    ink(g, '#f0b030', LW);
    ell(g, 0, 0, 1, 0.95);
    ink(g, radg(g, -0.3, -0.35, 0.1, 1.1, [0, '#fff3b8'], [0.6, '#ffd05a'], [1, '#e8a028']), LW * 1.2);
    g.fillStyle = 'rgba(190,110,20,.35)';
    for (const [x, y, r] of [[0.4, -0.45, 0.13], [0.6, 0.0, 0.1], [0.2, -0.7, 0.08], [0.45, 0.4, 0.09]]) ell(g, x, y, r, r), g.fill();
    ell(g, -0.1, 0.45, 0.6, 0.35);
    g.fillStyle = 'rgba(255,250,225,.7)';
    g.fill();
    shine(g, -0.42, -0.55, 0.3, 0.14);
    face(g, -0.38, -0.2, 0.3, 0.25, mood, 0.42, 0.55);
    blush(g, -0.35, 0.12, 0.52, 0.13);
  },
  owl(g, mood, f) {
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.55, -0.35);
      g.quadraticCurveTo(sd * 1.6, f ? -1.6 : -0.75, sd * 2.25, f ? -1.2 : -0.1);
      g.lineTo(sd * 2.0, f ? -0.85 : 0.15);
      g.lineTo(sd * 2.05, f ? -0.55 : 0.4);
      g.lineTo(sd * 1.65, f ? -0.35 : 0.5);
      g.lineTo(sd * 1.6, f ? -0.05 : 0.7);
      g.lineTo(sd * 1.2, f ? 0.05 : 0.65);
      g.quadraticCurveTo(sd * 0.8, 0.5, sd * 0.5, 0.35);
      g.closePath();
      ink(g, lin(g, 0, -1.4, 0, 0.7, [0, '#d8ccff'], [1, '#7d66d8']), LW * 1.1);
      g.strokeStyle = 'rgba(255,255,255,.7)';
      g.lineWidth = LW * 0.6;
      g.beginPath();
      g.moveTo(sd * 0.9, f ? -0.55 : -0.25);
      g.lineTo(sd * 1.7, f ? -1.05 : -0.2);
      g.moveTo(sd * 0.85, f ? -0.25 : 0.05);
      g.lineTo(sd * 1.5, f ? -0.55 : 0.3);
      g.stroke();
    }
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.25, -0.72);
      g.lineTo(sd * 0.6, -1.3);
      g.lineTo(sd * 0.68, -0.55);
      ink(g, '#9a86e8', LW);
    }
    ell(g, 0, 0.05, 0.85, 0.9);
    ink(g, lin(g, 0, -0.9, 0, 0.9, [0, '#d6caff'], [1, '#8f7ae0']), LW * 1.2);
    ell(g, 0, 0.4, 0.5, 0.42);
    g.fillStyle = '#f3eeff';
    g.fill();
    g.strokeStyle = 'rgba(140,120,210,.7)';
    g.lineWidth = LW * 0.6;
    for (const [x, y] of [[-0.2, 0.3], [0.15, 0.3], [-0.05, 0.5], [0.25, 0.5], [-0.3, 0.5]]) (g.beginPath(), g.arc(x, y, 0.09, 0.2, Math.PI - 0.2), g.stroke());
    for (const sd of [-1, 1]) (ell(g, -0.12 + sd * 0.3, -0.25, 0.3, 0.3), ink(g, '#ffd27a', LW * 0.7));
    face(g, -0.12, -0.25, 0.3, 0.2, mood, 0.0001, 1, '#3a2060');
    g.beginPath();
    g.moveTo(-0.2, -0.08);
    g.lineTo(-0.04, -0.08);
    g.lineTo(-0.12, 0.12);
    g.closePath();
    ink(g, '#ffa83a', LW * 0.7);
    shine(g, -0.4, -0.62, 0.22, 0.1);
  },
  eagle(g, mood, f) {
    for (const sd of [1, -1]) {
      g.beginPath();
      g.moveTo(sd * 0.4, -0.35);
      g.quadraticCurveTo(sd * 1.4, f ? -1.6 : -0.9, sd * 2.2, f ? -1.35 : -0.35);
      for (let i = 0; i < 5; i++) {
        const q = i / 4, x = sd * (2.2 - q * 1.3), y = (f ? -1.35 : -0.35) + q * (f ? 1.1 : 0.85);
        g.lineTo(x + sd * 0.12, y + 0.28);
        g.lineTo(x - sd * 0.12, y + 0.18);
      }
      g.quadraticCurveTo(sd * 0.7, 0.5, sd * 0.35, 0.3);
      g.closePath();
      ink(g, lin(g, 0, -1.4, 0, 0.6, [0, '#e8f4ff'], [0.4, '#8fc4f0'], [1, '#3a6fb0']), LW * 0.9);
      g.strokeStyle = 'rgba(255,255,255,.7)';
      g.lineWidth = LW * 0.5;
      g.beginPath();
      g.arc(sd * 1.3, f ? -0.75 : -0.2, 0.25, 0, Math.PI * 1.5);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(0.6, 0.2);
    g.lineTo(1.25, 0.55);
    g.lineTo(1.1, 0.2);
    g.lineTo(1.3, 0.0);
    g.lineTo(0.6, -0.1);
    g.closePath();
    ink(g, '#c9d8ea', LW * 0.9);
    ell(g, 0.1, 0.1, 0.85, 0.7);
    ink(g, lin(g, 0, -0.6, 0, 0.8, [0, '#f4f7fb'], [1, '#a8b8cc']), LW * 1.1);
    ell(g, -0.6, -0.45, 0.48, 0.44);
    ink(g, lin(g, 0, -0.9, 0, 0, [0, '#ffffff'], [1, '#d8e2ee']), LW);
    // 폭풍 깃털 볏 (흘리는 것)
    for (const [dx, k, rot] of [[-0.45, 0.75, -0.5], [-0.25, 0.9, -0.15], [-0.05, 0.7, 0.2]] as [number, number, number][]) {
      g.save();
      g.translate(-0.55 + dx + 0.5, -0.82);
      g.rotate(rot);
      ell(g, 0, -k * 0.5, k * 0.16, k * 0.52);
      ink(g, lin(g, 0, -k, 0, 0, [0, '#ffffff'], [1, '#6fb8ff']), LW * 0.6);
      g.restore();
    }
    g.beginPath();
    g.moveTo(-0.95, -0.5);
    g.quadraticCurveTo(-1.45, -0.45, -1.4, -0.15);
    g.quadraticCurveTo(-1.2, -0.28, -0.95, -0.3);
    g.closePath();
    ink(g, lin(g, 0, -0.5, 0, -0.1, [0, '#ffe36b'], [1, '#e0a020']), LW * 0.8);
    face(g, -0.68, -0.52, 0.17, 0.14, mood === F_IDLE ? F_ANGRY : mood, 0.0001, 1, '#7a4a00');
  },
  whale(g, mood, f) {
    // 꼬리 지느러미 (흘리는 것)
    g.save();
    g.translate(1.05, -0.05);
    g.rotate(f ? -0.25 : 0.1);
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(0.4, -0.15, 0.75, -0.75);
    g.quadraticCurveTo(0.65, -0.25, 0.95, -0.05);
    g.quadraticCurveTo(0.65, 0.15, 0.75, 0.6);
    g.quadraticCurveTo(0.4, 0.15, 0, 0.12);
    g.closePath();
    ink(g, lin(g, 0, -0.7, 0, 0.6, [0, '#e8f7ff'], [1, '#5fb0e8']), LW * 0.9);
    g.restore();
    // 구름 몸
    g.beginPath();
    g.moveTo(-1.2, 0.1);
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI + (i / 8) * Math.PI, x = Math.cos(a) * 1.15, y = Math.sin(a) * 0.72 - 0.05;
      g.arc(x, y, 0.22 + 0.05 * (i % 2), a + Math.PI, a + Math.PI * 2.2, false);
    }
    g.quadraticCurveTo(1.25, 0.6, 0.2, 0.7);
    g.quadraticCurveTo(-1.0, 0.72, -1.2, 0.1);
    g.closePath();
    ink(g, lin(g, 0, -0.9, 0, 0.75, [0, '#ffffff'], [0.5, '#d8f0ff'], [1, '#8fc8f0']), LW * 1.1, '#2f5f90');
    g.strokeStyle = 'rgba(80,140,200,.45)';
    g.lineWidth = LW * 0.6;
    for (let i = 0; i < 4; i++) (g.beginPath(), g.moveTo(-0.6 + i * 0.25, 0.42), g.quadraticCurveTo(-0.3 + i * 0.25, 0.62, 0.1 + i * 0.25, 0.48), g.stroke());
    // 물 뿜는 구멍
    g.fillStyle = 'rgba(220,245,255,.9)';
    for (const [x, y, r] of [[0.1, -1.0, 0.12], [-0.02, -1.15, 0.09], [0.22, -1.17, 0.08]]) ell(g, x, y, r, r), g.fill();
    face(g, -0.62, -0.12, 0.2, 0.15, mood === F_IDLE ? F_ANGRY : mood, 0.28, 1.2, '#1f3a60');
    blush(g, -0.6, 0.12, 0.35, 0.1);
    shine(g, -0.6, -0.55, 0.35, 0.14, -0.3);
  },
  drake(g, mood, f) {
    for (const sd of [1, -1]) {
      g.beginPath();
      g.moveTo(sd * 0.3, -0.4);
      g.lineTo(sd * 1.0, f ? -1.7 : -1.2);
      g.lineTo(sd * 2.0, f ? -1.35 : -0.75);
      g.quadraticCurveTo(sd * 1.75, f ? -0.85 : -0.3, sd * 1.55, f ? -0.75 : -0.15);
      g.quadraticCurveTo(sd * 1.35, f ? -0.45 : 0.05, sd * 1.05, f ? -0.4 : 0.1);
      g.quadraticCurveTo(sd * 0.8, 0.0, sd * 0.45, 0.25);
      g.closePath();
      ink(g, lin(g, 0, -1.6, 0, 0.3, [0, '#7a62c8'], [1, '#3a2a78']), LW * 1.1, '#1c1240');
      g.strokeStyle = 'rgba(180,160,255,.5)';
      g.lineWidth = LW * 0.6;
      g.beginPath();
      g.moveTo(sd * 0.4, -0.3);
      g.lineTo(sd * 1.55, f ? -0.75 : -0.15);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(0.5, 0.15);
    g.quadraticCurveTo(1.4, 0.5, 1.7, -0.1);
    g.lineTo(1.95, -0.35);
    g.lineTo(1.75, 0.15);
    g.quadraticCurveTo(1.3, 0.75, 0.4, 0.45);
    g.closePath();
    ink(g, lin(g, 0, -0.2, 0, 0.7, [0, '#4f4aa8'], [1, '#2a2470']), LW, '#1c1240');
    ell(g, 0.15, 0.15, 0.82, 0.62);
    ink(g, lin(g, 0, -0.5, 0, 0.8, [0, '#5a52b8'], [1, '#2a2470']), LW * 1.1, '#1c1240');
    ell(g, 0.1, 0.38, 0.5, 0.3);
    g.fillStyle = '#c9b8ff';
    g.fill();
    g.strokeStyle = '#ffd84a';
    g.lineWidth = LW * 0.9;
    for (const x of [-0.2, 0.25, 0.6]) (g.beginPath(), g.moveTo(x, -0.35), g.lineTo(x + 0.12, -0.12), g.lineTo(x - 0.02, -0.08), g.lineTo(x + 0.1, 0.12), g.stroke());
    // 목 · 머리
    g.beginPath();
    g.moveTo(-0.35, -0.2);
    g.quadraticCurveTo(-0.6, -0.75, -0.7, -0.95);
    g.lineTo(-0.35, -1.0);
    g.quadraticCurveTo(-0.15, -0.6, 0.05, -0.35);
    g.closePath();
    ink(g, '#4a44a0', LW, '#1c1240');
    ell(g, -0.75, -1.05, 0.48, 0.38, -0.15);
    ink(g, lin(g, 0, -1.4, 0, -0.7, [0, '#6a62c8'], [1, '#3a3290']), LW, '#1c1240');
    g.beginPath();
    g.moveTo(-1.0, -1.05);
    g.lineTo(-1.5, -0.95);
    g.lineTo(-1.42, -0.78);
    g.lineTo(-0.95, -0.8);
    g.closePath();
    ink(g, '#5a52b8', LW, '#1c1240');
    g.fillStyle = '#ffffff';
    for (const x of [-1.35, -1.2, -1.05]) (g.beginPath(), g.moveTo(x, -0.8), g.lineTo(x + 0.05, -0.68), g.lineTo(x + 0.1, -0.8), g.fill());
    // 번개 뿔 (흘리는 것)
    for (const [x, k, fl] of [[-0.55, 0.85, 1], [-0.85, 0.7, -1]] as [number, number, number][]) zig(g, x, -1.3, k, fl);
    for (const sd of [-1, 1]) {
      ell(g, -0.85 + sd * 0.16, -1.12, 0.12, 0.09, 0.2);
      ink(g, '#ffe14a', LW * 0.5, '#1c1240');
      ell(g, -0.87 + sd * 0.16, -1.12, 0.03, 0.07);
      g.fillStyle = '#1c1240';
      g.fill();
    }
    g.strokeStyle = '#1c1240';
    g.lineWidth = LW * 1.2;
    g.beginPath();
    g.moveTo(-1.08, -1.28);
    g.lineTo(-0.82, -1.2);
    g.moveTo(-0.6, -1.3);
    g.lineTo(-0.78, -1.22);
    g.stroke();
    void mood;
  },
};
/** 미리 그려 둔 스티커 (종류·표정·장면·크기마다 한 장) */
const SW = 6.2, SH = 5.6, SOX = 3.1, SOY = 2.9;
const SPR = new Map<string, HTMLCanvasElement>();
const spriteKey = (k: K, mood: number, f: number, px: number) => `${k}:${mood}:${f}:${Math.max(6, Math.round(px))}`;
function sprite(k: K, mood: number, f: number, px: number): HTMLCanvasElement {
  const q = Math.max(6, Math.round(px)), key = spriteKey(k, mood, f, px);
  let c = SPR.get(key);
  if (!c) {
    if (SPR.size > 320) SPR.clear();
    c = layer(SW * q, SH * q, 1, (g) => {
      g.translate(SOX * q, SOY * q);
      g.scale(q, q);
      PAINT[k](g, mood, f);
    });
    SPR.set(key, c);
  }
  return c;
}
function warmSprite(k: K, mood: number, f: number, px: number) {
  if (SPR.has(spriteKey(k, mood, f, px))) return false;
  sprite(k, mood, f, px);
  return true;
}
/** 스티커 찍기: (0,0) = 몸 가운데, u = 화면에서 몸 반지름 px */
function stamp(ctx: C2, c: HTMLCanvasElement, u: number) {
  ctx.drawImage(c, -SOX * u, -SOY * u, SW * u, SH * u);
}

// ───────────────────────────── 그리기: 부위 아이콘 (도감·띠·이름표) ─────────────────────────────
function paintIcon(g: C2, p: P) {
  switch (p) {
    case 'fire': flame(g, 0, 0.75, 1.05, 0); break;
    case 'ice': crystal(g, -0.45, 0.7, 0.75, -0.4), crystal(g, 0.45, 0.7, 0.75, 0.4), crystal(g, 0, 0.75, 1.1, 0); break;
    case 'bubble': bubbleDot(g, -0.2, 0.15, 0.55), bubbleDot(g, 0.5, -0.4, 0.32), bubbleDot(g, 0.45, 0.55, 0.22); break;
    case 'bolt': zig(g, -0.2, 0.75, 1.5, 1); break;
    case 'thunder':
      for (const [x, k, fl] of [[-0.35, 1.35, 1], [0.35, 1.2, -1]] as [number, number, number][]) zig(g, x, 0.8, k, fl);
      break;
    case 'rock':
      for (const [x, y, r] of [[-0.45, 0.25, 0.55], [0.35, 0.2, 0.62], [0, -0.35, 0.5]] as [number, number, number][]) {
        ell(g, x, y, r, r * 0.85);
        ink(g, lin(g, 0, y - r, 0, y + r, [0, '#e3dbd0'], [1, '#8a7e70']), LW * 0.9);
        shine(g, x - r * 0.3, y - r * 0.35, r * 0.3, r * 0.14, -0.4, 0.6);
      }
      break;
    case 'spike':
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.55;
        g.beginPath();
        g.moveTo(Math.cos(a - 0.22) * 0.25, 0.4 + Math.sin(a - 0.22) * 0.25);
        g.lineTo(Math.cos(a) * 1.15, 0.4 + Math.sin(a) * 1.15);
        g.lineTo(Math.cos(a + 0.22) * 0.25, 0.4 + Math.sin(a + 0.22) * 0.25);
        g.closePath();
        ink(g, lin(g, 0, -0.8, 0, 0.4, [0, '#fff1b0'], [1, '#e09a20']), LW * 0.8, '#9a5a12');
      }
      break;
    case 'wing': case 'storm': {
      const top = p === 'wing' ? ['#e6dcff', '#7d66d8'] : ['#ffffff', '#4f9de8'];
      g.beginPath();
      g.moveTo(-0.9, 0.6);
      g.quadraticCurveTo(-0.6, -0.9, 0.95, -0.95);
      g.lineTo(0.7, -0.5);
      g.lineTo(0.9, -0.3);
      g.lineTo(0.55, 0.0);
      g.lineTo(0.7, 0.25);
      g.lineTo(0.2, 0.4);
      g.quadraticCurveTo(-0.3, 0.45, -0.9, 0.6);
      g.closePath();
      ink(g, lin(g, 0, -1, 0, 0.6, [0, top[0]], [1, top[1]]), LW * 0.9);
      if (p === 'storm') (g.strokeStyle = '#ffffff'), (g.lineWidth = LW * 0.8), g.beginPath(), g.arc(0.05, -0.2, 0.32, 0, Math.PI * 1.6), g.stroke();
      break;
    }
    case 'twister': pinwheel(g, 0, 0, 1.0, 0.3); break;
    case 'hammer': mallet(g, 0, 0, 1.05, -0.35); break;
    case 'wave':
      g.beginPath();
      g.moveTo(-0.15, 0.85);
      g.quadraticCurveTo(0, 0.2, -0.85, -0.65);
      g.quadraticCurveTo(-0.2, -0.45, 0, -0.1);
      g.quadraticCurveTo(0.2, -0.45, 0.85, -0.65);
      g.quadraticCurveTo(0, 0.2, 0.15, 0.85);
      g.closePath();
      ink(g, lin(g, 0, -0.7, 0, 0.8, [0, '#e8f7ff'], [1, '#3f9ae0']), LW * 0.9);
      break;
  }
}
function icon(p: P, px: number): HTMLCanvasElement {
  const q = Math.max(6, Math.round(px)), key = `i:${p}:${q}`;
  let c = SPR.get(key);
  if (!c) {
    c = layer(3 * q, 3 * q, 1, (g) => {
      g.translate(1.5 * q, 1.5 * q);
      g.scale(q, q);
      paintIcon(g, p);
    });
    SPR.set(key, c);
  }
  return c;
}
/** 아이콘 찍기: 가운데 (x,y), k = 반지름 px */
function drawIcon(ctx: C2, p: P, x: number, y: number, k: number, sc: number) {
  ctx.drawImage(icon(p, k * sc), x - k * 1.5, y - k * 1.5, k * 3, k * 3);
}
/** 아직 안 돋아 본 부위: 그림자 */
function silIcon(p: P, px: number): HTMLCanvasElement {
  const q = Math.max(6, Math.round(px)), key = `s:${p}:${q}`;
  let c = SPR.get(key);
  if (!c) {
    c = layer(3 * q, 3 * q, 1, (g) => {
      g.save();
      g.translate(1.5 * q, 1.5 * q);
      g.scale(q, q);
      paintIcon(g, p);
      g.restore();
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = '#b9a8c8';
      g.fillRect(0, 0, 3 * q, 3 * q);
    });
    SPR.set(key, c);
  }
  return c;
}

// ───────────────────────────── 그리기: 아기 용 ─────────────────────────────
/** 용 표정: 0 평소 · 1 숨결(입 크게) · 2 냠냠(볼 빵빵) · 3 아야 · 4 걱정(맨몸) · 5 우쭐 */
const D_IDLE = 0, D_BREATH = 1, D_CHEW = 2, D_HURT = 3, D_WORRY = 4, D_PROUD = 5;
interface DrawOpt { t: number; lv: number; mood: number; tail: number; flap: number; pin: number; glow: number[]; crack: number[]; born: number[] }
/** 아기 용 그리기: (x,y) = 몸 가운데(화면 px), u = 몸 반지름 px, face = 1 오른쪽 */
function drawDragon(ctx: C2, x: number, y: number, u: number, face: number, tint: string, parts: (Part | null)[], o: DrawOpt) {
  const [hp, bp, tp] = parts, base = tint, lt = lite(base, 0.5), dk = dark(base, 0.38), gk = (g: number) => [1, 1, 1.22, 1.45][g];
  const lw = Math.max(1.4, u * 0.075);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face * u, u);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const L = lw / u;
  const fill = (f: string | CanvasGradient, w = L, st = OUT) => ink(ctx, f, w, st);
  const pop = (born: number) => Math.min(1, Math.max(0, (o.t - born) / 10));
  const popK = (born: number) => {
    const q = pop(born);
    return q < 1 ? 0.3 + q * 1.0 + Math.sin(q * Math.PI) * 0.4 : 1;
  };
  // ── 먼 쪽 날개 ──
  const bigWing = bp && (bp.p === 'wing' || bp.p === 'storm');
  const wingPath = (k: number, ang: number, far: boolean) => {
    ctx.save();
    ctx.translate(-0.1, -0.62);
    ctx.rotate(-ang);
    ctx.scale(k, k);
    if (bigWing) {
      const storm = bp!.p === 'storm';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-0.6, -1.9, -2.3, -2.2);
      ctx.lineTo(-2.0, -1.75);
      ctx.lineTo(-2.45, -1.55);
      ctx.lineTo(-2.05, -1.2);
      ctx.lineTo(-2.35, -0.9);
      ctx.lineTo(-1.8, -0.7);
      ctx.lineTo(-1.95, -0.35);
      ctx.lineTo(-1.2, -0.3);
      ctx.quadraticCurveTo(-0.6, 0.15, 0, 0.25);
      ctx.closePath();
      const c0 = storm ? '#ffffff' : '#efe8ff', c1 = storm ? '#5fa8f0' : '#8f78e8', c2 = storm ? '#2f6fb0' : '#5a44b8';
      fill(lin(ctx, 0, -2.2, 0, 0.3, [0, far ? mix(c0, '#9a8ab8', 0.3) : c0], [0.55, far ? dark(c1, 0.2) : c1], [1, far ? dark(c2, 0.2) : c2]), L * 1.1 / k);
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = (L * 0.7) / k;
      ctx.beginPath();
      ctx.moveTo(-0.3, -0.25);
      ctx.lineTo(-1.9, -1.75);
      ctx.moveTo(-0.3, -0.1);
      ctx.lineTo(-1.85, -1.0);
      ctx.moveTo(-0.3, 0.05);
      ctx.lineTo(-1.5, -0.45);
      ctx.stroke();
      if (storm) {
        ctx.strokeStyle = 'rgba(255,255,255,.9)';
        ctx.lineWidth = (L * 0.9) / k;
        ctx.beginPath();
        ctx.arc(-1.15, -1.2, 0.32, 0.3, Math.PI * 1.7);
        ctx.stroke();
      }
    } else {
      // 아기 날개 (작은 막)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-0.2, -0.75, -0.75, -0.85);
      ctx.quadraticCurveTo(-0.65, -0.5, -0.8, -0.35);
      ctx.quadraticCurveTo(-0.5, -0.25, -0.55, 0.0);
      ctx.quadraticCurveTo(-0.25, 0.05, 0, 0.2);
      ctx.closePath();
      fill(lin(ctx, 0, -0.85, 0, 0.2, [0, far ? dark(lt, 0.15) : lt], [1, far ? dark(base, 0.25) : base]), L / k);
    }
    ctx.restore();
  };
  const wingK = bigWing ? gk(bp!.g) * popK(bp!.born) : 1, wa = (bigWing ? 0.35 : 0.25) * Math.sin(o.flap);
  wingPath(wingK * 0.92, wa - 0.12, true);
  // ── 꼬리 ──
  ctx.save();
  ctx.translate(-0.68, 0.22);
  ctx.rotate(o.tail);
  ctx.beginPath();
  ctx.moveTo(0.1, -0.32);
  ctx.quadraticCurveTo(-0.55, -0.3, -1.02, -0.62);
  ctx.quadraticCurveTo(-1.18, -0.72, -1.15, -0.5);
  ctx.quadraticCurveTo(-0.6, 0.12, 0.12, 0.3);
  ctx.closePath();
  fill(lin(ctx, 0, -0.6, 0, 0.3, [0, base], [1, dk]));
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = L * 0.8;
  ctx.beginPath();
  ctx.moveTo(-0.05, -0.18);
  ctx.quadraticCurveTo(-0.5, -0.2, -0.9, -0.45);
  ctx.stroke();
  const tipX = -1.12, tipY = -0.58;
  if (tp) {
    const k = gk(tp.g) * popK(tp.born);
    ctx.save();
    ctx.translate(tipX, tipY);
    if (o.glow[2] > 0) chargeGlow(ctx, 0, 0, 0.75 * k, o.glow[2], PD[tp.p].col, o.t);
    if (tp.p === 'twister') pinwheel(ctx, -0.15, -0.15, 0.82 * k, o.pin);
    else if (tp.p === 'hammer') mallet(ctx, -0.3, -0.25, 0.8 * k, -0.6);
    else {
      // 고래 꼬리 지느러미
      ctx.rotate(-0.5);
      ctx.scale(k, k);
      ctx.beginPath();
      ctx.moveTo(0.1, 0);
      ctx.quadraticCurveTo(-0.3, -0.15, -0.75, -0.8);
      ctx.quadraticCurveTo(-0.6, -0.25, -0.95, -0.05);
      ctx.quadraticCurveTo(-0.6, 0.15, -0.75, 0.65);
      ctx.quadraticCurveTo(-0.3, 0.15, 0.1, 0.12);
      ctx.closePath();
      fill(lin(ctx, 0, -0.8, 0, 0.65, [0, '#e8f7ff'], [1, '#3f9ae0']), L / k);
    }
    if (o.crack[2] > 0) crackMark(ctx, 0, 0, 0.5 * k, o.crack[2], L);
    ctx.restore();
  } else {
    // 아기 꼬리 끝 (작은 화살촉)
    ctx.beginPath();
    ctx.moveTo(tipX + 0.05, tipY - 0.05);
    ctx.lineTo(tipX - 0.25, tipY - 0.25);
    ctx.lineTo(tipX - 0.05, tipY + 0.22);
    ctx.closePath();
    fill(dk);
  }
  ctx.restore();
  // ── 발 ──
  for (const [fx, fy] of [[-0.25, 0.78], [0.35, 0.82]]) {
    ell(ctx, fx, fy, 0.24, 0.17);
    fill(dk);
    ctx.fillStyle = '#ffffff';
    for (const d of [-0.1, 0, 0.1]) (ell(ctx, fx + 0.14 + d * 0.5, fy + 0.05 + Math.abs(d) * 0.2, 0.04, 0.035), ctx.fill());
  }
  // ── 몸통 ──
  const rock = bp?.p === 'rock', bulk = rock ? 1.08 : 1;
  ell(ctx, 0, 0.1, 0.98 * bulk, 0.84 * bulk);
  fill(lin(ctx, 0, -0.75, 0, 0.95, [0, lt], [0.55, base], [1, dk]), L * 1.1);
  ell(ctx, 0.32, 0.32, 0.55, 0.5, -0.2);
  ctx.fillStyle = '#fff3d2';
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,150,90,.45)';
  ctx.lineWidth = L * 0.7;
  for (let i = 0; i < 4; i++) (ctx.beginPath(), ctx.arc(0.32, 0.05 + i * 0.16, 0.4 - Math.abs(i - 1.5) * 0.06, 0.35 * Math.PI, 0.75 * Math.PI), ctx.stroke());
  shine(ctx, -0.35, -0.45, 0.32, 0.14, -0.5, 0.45);
  // 아기 등돌기 (등 부위가 없을 때)
  if (!bp || bigWing) {
    for (const [sx, sy, k] of [[-0.55, -0.6, 0.18], [-0.2, -0.78, 0.22], [0.15, -0.82, 0.18]]) {
      ctx.beginPath();
      ctx.moveTo(sx - k * 0.7, sy + k * 0.5);
      ctx.quadraticCurveTo(sx, sy - k * 1.3, sx + k * 0.7, sy + k * 0.5);
      ctx.closePath();
      fill(lt, L * 0.8);
    }
    if (o.lv >= 7) {
      ctx.beginPath();
      ctx.moveTo(-0.75, -0.35);
      ctx.quadraticCurveTo(-0.45, -1.05, 0.25, -0.85);
      ctx.quadraticCurveTo(-0.3, -0.6, -0.75, -0.35);
      fill(lite(base, 0.7), L * 0.7);
    }
  }
  // ── 등 부위 ──
  if (bp && !bigWing) {
    const k = gk(bp.g) * popK(bp.born);
    ctx.save();
    ctx.translate(-0.15, -0.72);
    ctx.scale(k, k);
    if (o.glow[1] > 0) chargeGlow(ctx, 0, -0.2, 0.9, o.glow[1], PD[bp.p].col, o.t);
    if (bp.p === 'rock') {
      for (const [rx, ry, r] of [[-0.7, 0.2, 0.46], [0.05, -0.15, 0.6], [0.72, 0.12, 0.42], [-0.32, -0.35, 0.38]] as [number, number, number][]) {
        ell(ctx, rx, ry, r, r * 0.85);
        fill(lin(ctx, 0, ry - r, 0, ry + r, [0, '#ebe5da'], [0.55, '#b8ac9c'], [1, '#867a6c']), L / k);
        shine(ctx, rx - r * 0.3, ry - r * 0.35, r * 0.32, r * 0.14, -0.4, 0.6);
      }
      ctx.strokeStyle = 'rgba(80,60,50,.5)';
      ctx.lineWidth = (L * 0.6) / k;
      ctx.beginPath();
      ctx.moveTo(0.05, -0.45);
      ctx.lineTo(0.15, -0.15);
      ctx.lineTo(0.0, 0.05);
      ctx.stroke();
      ctx.fillStyle = '#7cc25a';
      ell(ctx, 0.25, -0.45, 0.12, 0.07);
      ctx.fill();
    } else {
      // 가시 등: 복어 가시가 부채처럼
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI * 0.97 + (i / 6) * Math.PI * 0.94, r0 = 0.25, r1 = 1.2 + (i % 2) * 0.28;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.2) * r0, 0.35 + Math.sin(a - 0.2) * r0);
        ctx.lineTo(Math.cos(a) * r1, 0.35 + Math.sin(a) * r1);
        ctx.lineTo(Math.cos(a + 0.2) * r0, 0.35 + Math.sin(a + 0.2) * r0);
        ctx.closePath();
        fill(lin(ctx, 0, -0.8, 0, 0.4, [0, '#fff1b0'], [1, '#e09a20']), (L * 0.8) / k, '#9a5a12');
      }
    }
    if (o.crack[1] > 0) crackMark(ctx, 0, 0, 0.5, o.crack[1], L / k);
    ctx.restore();
  }
  // ── 앞발 ──
  ell(ctx, 0.72, 0.32, 0.17, 0.13, 0.5);
  fill(base, L * 0.9);
  // ── 머리 ──
  const HX = 0.72, HY = -0.62;
  ell(ctx, HX, HY, 0.66, 0.62);
  fill(lin(ctx, 0, HY - 0.62, 0, HY + 0.62, [0, lt], [0.6, base], [1, mix(base, '#2a1838', 0.15)]), L * 1.1);
  // 주둥이
  ell(ctx, HX + 0.55, HY + 0.16, 0.4, 0.3);
  fill(lin(ctx, 0, HY - 0.15, 0, HY + 0.45, [0, lite(base, 0.65)], [1, lite(base, 0.25)]), L);
  ctx.fillStyle = dark(base, 0.5);
  ell(ctx, HX + 0.82, HY + 0.05, 0.05, 0.035, 0.4);
  ctx.fill();
  shine(ctx, HX - 0.25, HY - 0.35, 0.22, 0.1, -0.5, 0.5);
  // 아기 뿔 (레벨)
  const hornK = o.lv >= 9 ? 1.5 : o.lv >= 3 ? 1.1 : 0.75;
  if (!hp || (hp.p !== 'thunder' && hp.p !== 'bolt')) {
    for (const [hx, hk] of [[HX - 0.22, 0.85], [HX + 0.12, 1]] as [number, number][]) {
      ctx.beginPath();
      ctx.moveTo(hx - 0.09 * hornK, HY - 0.5);
      ctx.quadraticCurveTo(hx - 0.1 * hornK, HY - 0.5 - 0.32 * hornK * hk, hx - 0.22 * hornK, HY - 0.55 - 0.38 * hornK * hk);
      ctx.quadraticCurveTo(hx + 0.05, HY - 0.6 - 0.15 * hornK, hx + 0.09 * hornK, HY - 0.5);
      ctx.closePath();
      fill(lin(ctx, 0, HY - 1.0, 0, HY - 0.5, [0, '#fff7dc'], [1, '#e8c890']), L * 0.8);
    }
  }
  // 눈 · 입
  const md = o.mood;
  const eye = (ex: number, ey: number, k: number) => {
    if (md === D_HURT) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = k * 0.42;
      ctx.beginPath();
      ctx.moveTo(ex - k * 0.6, ey - k * 0.55);
      ctx.lineTo(ex + k * 0.45, ey);
      ctx.lineTo(ex - k * 0.6, ey + k * 0.55);
      ctx.stroke();
    } else if (md === D_CHEW || md === D_PROUD) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = k * 0.4;
      ctx.beginPath();
      ctx.arc(ex, ey + k * 0.35, k * 0.65, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else {
      ell(ctx, ex, ey, k * 0.82, k * (md === D_WORRY ? 0.9 : 1));
      fill('#ffffff', k * 0.22);
      ell(ctx, ex + k * 0.12, ey + k * 0.08, k * 0.5, k * 0.58);
      ctx.fillStyle = '#26183a';
      ctx.fill();
      ell(ctx, ex - k * 0.02, ey - k * 0.2, k * 0.2, k * 0.22);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ell(ctx, ex + k * 0.25, ey + k * 0.3, k * 0.09, k * 0.09);
      ctx.fill();
      if (md === D_WORRY) {
        ctx.strokeStyle = OUT;
        ctx.lineWidth = k * 0.32;
        ctx.beginPath();
        ctx.moveTo(ex - k * 0.7, ey - k * 1.25);
        ctx.lineTo(ex + k * 0.6, ey - k * 1.45);
        ctx.stroke();
      }
    }
  };
  eye(HX + 0.28, HY - 0.15, 0.21);
  eye(HX - 0.12, HY - 0.18, 0.17);
  ctx.fillStyle = 'rgba(255,110,130,.45)';
  ell(ctx, HX + 0.3, HY + 0.22, 0.12, 0.07);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = L * 0.9;
  if (md === D_BREATH) {
    ctx.beginPath();
    ctx.moveTo(HX + 0.4, HY + 0.28);
    ctx.quadraticCurveTo(HX + 0.75, HY + 0.62, HX + 0.98, HY + 0.32);
    ctx.quadraticCurveTo(HX + 0.75, HY + 0.38, HX + 0.4, HY + 0.28);
    fill('#8c2f3f', L * 0.9);
  } else if (md === D_CHEW) {
    ell(ctx, HX + 0.45, HY + 0.3, 0.2, 0.15);
    fill(lite(base, 0.3), L * 0.8);
    ctx.beginPath();
    ctx.moveTo(HX + 0.55, HY + 0.33);
    ctx.quadraticCurveTo(HX + 0.7, HY + 0.4, HX + 0.82, HY + 0.32);
    ctx.stroke();
  } else if (md === D_HURT || md === D_WORRY) {
    ctx.beginPath();
    ctx.moveTo(HX + 0.5, HY + 0.38);
    ctx.quadraticCurveTo(HX + 0.65, HY + 0.3, HX + 0.82, HY + 0.38);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(HX + 0.48, HY + 0.3);
    ctx.quadraticCurveTo(HX + 0.68, HY + 0.46, HX + 0.88, HY + 0.3);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(HX + 0.78, HY + 0.33);
    ctx.lineTo(HX + 0.82, HY + 0.43);
    ctx.lineTo(HX + 0.86, HY + 0.31);
    ctx.fill();
  }
  // ── 머리 부위 ──
  if (hp) {
    const k = gk(hp.g) * popK(hp.born);
    ctx.save();
    ctx.translate(HX - 0.05, HY - 0.5);
    ctx.scale(k, k);
    if (o.glow[0] > 0) chargeGlow(ctx, 0, -0.35, 0.8, o.glow[0], PD[hp.p].col, o.t);
    const fl = (o.t >> 3) % 2;
    switch (hp.p) {
      case 'fire':
        flame(ctx, -0.1, 0.12, 0.95, fl);
        flame(ctx, -0.55, 0.18, 0.55, 1 - fl);
        break;
      case 'ice':
        crystal(ctx, -0.5, 0.15, 0.5, -0.55);
        crystal(ctx, -0.12, 0.08, 0.75, -0.15);
        crystal(ctx, 0.3, 0.1, 0.55, 0.35);
        break;
      case 'bubble':
        for (const sd of [-1, 1]) {
          for (let i = 0; i < 3; i++) {
            const a = -Math.PI / 2 + sd * (0.75 + i * 0.32);
            ctx.save();
            ctx.translate(sd * 0.2 - 0.05, 0.4);
            ctx.rotate(a + Math.PI / 2);
            ell(ctx, 0, -0.45, 0.13, 0.42);
            fill(lin(ctx, 0, -0.85, 0, 0, [0, '#ffd8f6'], [1, '#c77ae8']), (L * 0.8) / k);
            ctx.restore();
          }
        }
        bubbleDot(ctx, 0.75, 0.55, 0.16);
        bubbleDot(ctx, 0.95, 0.25, 0.1);
        break;
      case 'bolt':
        zig(ctx, -0.35, 0.25, 0.9, -1);
        zig(ctx, 0.15, 0.2, 1.0, 1);
        break;
      case 'thunder':
        zig(ctx, -0.45, 0.3, 1.35, -1);
        zig(ctx, 0.2, 0.25, 1.5, 1);
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(o.t * 0.4);
        ctx.fillStyle = '#fffbd0';
        starPath(ctx, -0.8, -0.9, 0.12, 0.35);
        ctx.fill();
        starPath(ctx, 0.85, -1.2, 0.1, 0.35);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
    }
    if (o.crack[0] > 0) crackMark(ctx, 0, -0.3, 0.45, o.crack[0], L / k);
    ctx.restore();
  }
  // ── 가까운 쪽 날개 ──
  wingPath(wingK, wa, false);
  ctx.restore();
}
/** 기운이 찬 부위: 은은한 빛이 맥박처럼 */
function chargeGlow(ctx: C2, x: number, y: number, r: number, q: number, col: string, t: number) {
  const pul = 0.75 + 0.25 * Math.sin(t * (q >= 1 ? 0.3 : 0.12));
  ctx.save();
  ctx.globalAlpha = Math.min(0.85, q * 0.7 * pul + (q >= 1 ? 0.15 : 0));
  ctx.fillStyle = radg(ctx, x, y, r * 0.2, r * (1.1 + 0.25 * q), [0, 'rgba(255,255,235,.95)'], [0.45, col], [1, 'rgba(255,255,255,0)']);
  ell(ctx, x, y, r * (1.1 + 0.25 * q), r * (1.1 + 0.25 * q));
  ctx.fill();
  ctx.restore();
}
/** 금 간 부위 */
function crackMark(ctx: C2, x: number, y: number, r: number, q: number, lw: number) {
  ctx.strokeStyle = 'rgba(60,30,40,.75)';
  ctx.lineWidth = lw * 0.9;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y - r * 0.5);
  ctx.lineTo(x - r * 0.1, y - r * 0.05);
  ctx.lineTo(x - r * 0.3, y + r * 0.35);
  if (q > 0.5) (ctx.moveTo(x - r * 0.1, y - r * 0.05), ctx.lineTo(x + r * 0.4, y - r * 0.2));
  ctx.stroke();
}

// ───────────────────────────── 그리기: 대장이 흘린 것 · 장 끝 선물 · 손가락 ─────────────────────────────
function drawItem(ctx: C2, it: Item, x: number, y: number, k: number, t: number) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 0.08 + it.id) * k * 0.12);
  ctx.fillStyle = radg(ctx, 0, 0, k * 0.2, k * 1.9, [0, 'rgba(255,255,220,.85)'], [0.5, 'rgba(255,230,120,.35)'], [1, 'rgba(255,230,120,0)']);
  ell(ctx, 0, 0, k * 1.9, k * 1.9);
  ctx.fill();
  ctx.rotate(Math.sin(t * 0.05 + it.id) * 0.2);
  ctx.scale(k, k);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (it.k === 'eagle') {
    ctx.rotate(-0.6);
    ctx.beginPath();
    ctx.moveTo(0, 1.1);
    ctx.quadraticCurveTo(-0.55, 0.2, -0.05, -1.1);
    ctx.quadraticCurveTo(0.6, 0.1, 0, 1.1);
    ctx.closePath();
    ink(ctx, lin(ctx, 0, -1.1, 0, 1.1, [0, '#ffffff'], [0.5, '#bfe2ff'], [1, '#4f9de8']), 0.1);
    ctx.strokeStyle = 'rgba(47,111,176,.8)';
    ctx.lineWidth = 0.07;
    ctx.beginPath();
    ctx.moveTo(0, 1.05);
    ctx.lineTo(0.02, -0.9);
    ctx.stroke();
  } else if (it.k === 'whale') paintIcon(ctx, 'wave');
  else paintIcon(ctx, 'thunder');
  ctx.restore();
  ctx.fillStyle = '#fffbd0';
  for (let i = 0; i < 3; i++) {
    const a = t * 0.06 + i * 2.1;
    starPath(ctx, x + Math.cos(a) * k * 1.4, y + Math.sin(a) * k * 1.1, k * 0.16 * (1 + 0.4 * Math.sin(t * 0.3 + i)), 0.35);
    ctx.fill();
  }
}
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
/** 장 끝 선물 (하늘의 큰 물건): 0장 황금 이빨 · 용의 알 껍데기 / 1장 무지개 비늘 · 꿀단지 */
function drawPerk(ctx: C2, ch: number, i: number, x: number, y: number, k: number, t: number) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 0.08 + i * 2) * k * 0.04);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // 받침 구름
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  for (const [dx, dy, r] of [[-0.55, 0.1, 0.35], [0, 0.18, 0.45], [0.55, 0.1, 0.35], [-0.25, -0.05, 0.3], [0.3, -0.05, 0.3]]) ell(ctx, dx * k, dy * k, r * k, r * k * 0.6), ctx.fill();
  ctx.scale(k, k);
  const L = 0.06;
  const id = ch * 2 + i;
  if (id === 0) {
    // 황금 이빨
    ctx.beginPath();
    ctx.moveTo(-0.42, -0.95);
    ctx.quadraticCurveTo(0, -1.15, 0.42, -0.95);
    ctx.quadraticCurveTo(0.5, -0.45, 0.3, -0.05);
    ctx.lineTo(0.18, -0.3);
    ctx.lineTo(0.0, -0.08);
    ctx.lineTo(-0.18, -0.3);
    ctx.lineTo(-0.3, -0.05);
    ctx.quadraticCurveTo(-0.5, -0.45, -0.42, -0.95);
    ctx.closePath();
    ink(ctx, lin(ctx, 0, -1.1, 0, 0, [0, '#fff6b8'], [0.5, '#ffd23f'], [1, '#d49a10']), L, '#8a5a00');
    shine(ctx, -0.18, -0.8, 0.12, 0.06, -0.3, 0.8);
  } else if (id === 1) {
    // 용의 알 껍데기
    ctx.beginPath();
    ctx.moveTo(-0.55, -0.35);
    ctx.quadraticCurveTo(-0.55, 0.05, 0, 0.05);
    ctx.quadraticCurveTo(0.55, 0.05, 0.55, -0.35);
    ctx.lineTo(0.38, -0.55);
    ctx.lineTo(0.22, -0.38);
    ctx.lineTo(0.05, -0.62);
    ctx.lineTo(-0.12, -0.4);
    ctx.lineTo(-0.3, -0.6);
    ctx.lineTo(-0.42, -0.42);
    ctx.closePath();
    ink(ctx, lin(ctx, 0, -0.6, 0, 0.05, [0, '#fff8ee'], [1, '#e8d4b8']), L);
    ctx.fillStyle = '#9fd6a8';
    for (const [sx, sy, r] of [[-0.25, -0.2, 0.08], [0.2, -0.15, 0.1], [0.0, -0.05, 0.06]]) ell(ctx, sx, sy, r, r * 0.8), ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.25, -0.95);
    ctx.lineTo(-0.1, -0.75);
    ctx.lineTo(0.05, -0.98);
    ctx.lineTo(0.2, -0.78);
    ctx.lineTo(0.3, -1.02);
    ctx.quadraticCurveTo(0.35, -1.35, 0.02, -1.38);
    ctx.quadraticCurveTo(-0.3, -1.35, -0.25, -0.95);
    ctx.closePath();
    ink(ctx, lin(ctx, 0, -1.4, 0, -0.75, [0, '#fff8ee'], [1, '#e8d4b8']), L);
  } else if (id === 2) {
    // 무지개 비늘
    const cols = ['#ff8f8f', '#ffc56b', '#fff07a', '#9fe89a', '#8fcfff', '#c7a8ff'];
    ctx.beginPath();
    ctx.moveTo(0, -1.2);
    ctx.quadraticCurveTo(0.6, -0.7, 0.45, -0.15);
    ctx.quadraticCurveTo(0, 0.05, -0.45, -0.15);
    ctx.quadraticCurveTo(-0.6, -0.7, 0, -1.2);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    cols.forEach((c, j) => ((ctx.fillStyle = c), ctx.fillRect(-0.7, -1.25 + j * 0.22, 1.4, 0.23)));
    ctx.restore();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = L;
    ctx.stroke();
    shine(ctx, -0.15, -0.85, 0.12, 0.06, -0.3, 0.8);
  } else {
    // 꿀단지
    ctx.beginPath();
    ctx.moveTo(-0.32, -0.85);
    ctx.lineTo(0.32, -0.85);
    ctx.quadraticCurveTo(0.65, -0.65, 0.55, -0.25);
    ctx.quadraticCurveTo(0.45, 0.05, 0, 0.05);
    ctx.quadraticCurveTo(-0.45, 0.05, -0.55, -0.25);
    ctx.quadraticCurveTo(-0.65, -0.65, -0.32, -0.85);
    ctx.closePath();
    ink(ctx, lin(ctx, 0, -0.85, 0, 0.05, [0, '#ffe08a'], [1, '#e09a20']), L);
    rr(ctx, -0.38, -1.0, 0.76, 0.18, 0.06);
    ink(ctx, '#c97a2e', L);
    ctx.beginPath();
    ctx.moveTo(-0.2, -0.85);
    ctx.quadraticCurveTo(-0.25, -0.55, -0.1, -0.5);
    ctx.quadraticCurveTo(0.0, -0.6, -0.05, -0.85);
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
    shine(ctx, -0.25, -0.5, 0.1, 0.18, 0, 0.6);
  }
  ctx.restore();
}

// ───────────────────────────── 그리기: 하늘 무대 ─────────────────────────────
interface Pal { sky: [string, string, string]; sun: string; far: string; isle: [string, string]; dirt: [string, string]; cloud: string; sea: [string, string] }
const PALS: Pal[] = [
  { sky: ['#5fbdf5', '#b5e5ff', '#fff2d6'], sun: '#fff6c2', far: '#c9ecff', isle: ['#9be06a', '#5fb84a'], dirt: ['#d9a66a', '#a8713a'], cloud: '#ffffff', sea: ['#ffffff', '#e2f2ff'] },
  { sky: ['#4cc2f5', '#c6f1ff', '#f2fff6'], sun: '#fffbe0', far: '#c2f0ea', isle: ['#86e08a', '#3fae72'], dirt: ['#c9a27a', '#8f6a48'], cloud: '#ffffff', sea: ['#ffffff', '#dff6ff'] },
  { sky: ['#ff9878', '#ffc8a0', '#eedcff'], sun: '#fff0c8', far: '#f6d6ff', isle: ['#c4a8f0', '#8a6ad8'], dirt: ['#a88ac8', '#6a4f98'], cloud: '#fff4f8', sea: ['#fff6fb', '#f0dcff'] },
];
function cloudBlob(g: C2, x: number, y: number, k: number, col: string, shade: string) {
  g.fillStyle = shade;
  for (const [dx, dy, r] of [[-0.9, 0.18, 0.5], [-0.3, -0.18, 0.7], [0.45, -0.05, 0.6], [1.0, 0.2, 0.42], [0.1, 0.25, 0.75]]) ell(g, x + dx * k, y + dy * k + k * 0.12, r * k, r * k * 0.8), g.fill();
  g.fillStyle = col;
  for (const [dx, dy, r] of [[-0.9, 0.1, 0.5], [-0.3, -0.25, 0.7], [0.45, -0.12, 0.6], [1.0, 0.15, 0.42], [0.1, 0.18, 0.75]]) ell(g, x + dx * k, y + dy * k, r * k, r * k * 0.8), g.fill();
}
/** 떠 있는 섬 (단위: 폭 = 1) */
function islePaint(g: C2, ch: number, w: number, seed: number) {
  const P = PALS[ch];
  g.beginPath();
  g.moveTo(-w * 0.5, 0);
  g.quadraticCurveTo(-w * 0.35, w * 0.35, -w * 0.05, w * 0.55);
  g.lineTo(w * 0.02, w * 0.75);
  g.lineTo(w * 0.1, w * 0.5);
  g.quadraticCurveTo(w * 0.38, w * 0.32, w * 0.5, 0);
  g.closePath();
  g.fillStyle = lin(g, 0, 0, 0, w * 0.7, [0, P.dirt[0]], [1, P.dirt[1]]);
  g.fill();
  g.strokeStyle = 'rgba(60,40,50,.35)';
  g.lineWidth = Math.max(1, w * 0.012);
  g.stroke();
  ell(g, 0, 0, w * 0.52, w * 0.1);
  g.fillStyle = lin(g, 0, -w * 0.1, 0, w * 0.1, [0, P.isle[0]], [1, P.isle[1]]);
  g.fill();
  g.stroke();
  // 나무 · 꽃
  for (let i = 0; i < 2; i++) {
    const tx = (hsh(seed + i) - 0.5) * w * 0.6, k = w * (0.09 + hsh(seed + i * 3) * 0.05);
    g.fillStyle = ch === 2 ? '#7a5aa8' : '#8a5a34';
    g.fillRect(tx - k * 0.12, -k * 1.1, k * 0.24, k * 1.1);
    ell(g, tx, -k * 1.4, k * 0.7, k * 0.65);
    g.fillStyle = ch === 2 ? '#e0a8ff' : ch === 1 ? '#5fd08a' : '#62c24a';
    g.fill();
    ell(g, tx - k * 0.25, -k * 1.6, k * 0.25, k * 0.2);
    g.fillStyle = 'rgba(255,255,255,.3)';
    g.fill();
  }
  if (ch === 1) {
    // 폭포
    g.fillStyle = 'rgba(230,250,255,.85)';
    g.fillRect(w * 0.18, w * 0.05, w * 0.07, w * 0.9);
    g.fillStyle = 'rgba(160,220,255,.8)';
    g.fillRect(w * 0.2, w * 0.05, w * 0.025, w * 0.9);
  }
}
const BGS = new Map<string, HTMLCanvasElement>();
/** 배경 한 장: 하늘 · 해 · 먼 구름 벽 (장마다) */
function getBg(ch: number, w: number, h: number, sc: number) {
  const key = `${ch}:${w}:${h}:${sc}`;
  let c = BGS.get(key);
  if (c) return c;
  if (BGS.size > 6) BGS.clear();
  const P = PALS[ch], R = (v: number) => v * w;
  c = layer(w, h, sc, (g) => {
    g.fillStyle = lin(g, 0, 0, 0, h, [0, P.sky[0]], [0.55, P.sky[1]], [1, P.sky[2]]);
    g.fillRect(0, 0, w, h);
    const sx = ch === 2 ? R(0.22) : R(0.82), sy = ch === 2 ? R(0.62) : R(0.25);
    g.fillStyle = radg(g, sx, sy, 0, R(0.32), [0, P.sun], [0.25, 'rgba(255,250,220,.55)'], [1, 'rgba(255,255,255,0)']);
    g.fillRect(0, 0, w, h);
    ell(g, sx, sy, R(0.065), R(0.065));
    g.fillStyle = '#ffffff';
    g.fill();
    if (ch === 1) {
      const cols = ['#ff8f8f', '#ffc56b', '#fff07a', '#9fe89a', '#8fcfff', '#c7a8ff'];
      cols.forEach((col, i) => {
        g.strokeStyle = col;
        g.globalAlpha = 0.5;
        g.lineWidth = R(0.016);
        g.beginPath();
        g.arc(R(0.35), R(0.95), R(0.5 - i * 0.016), Math.PI * 1.05, Math.PI * 1.95);
        g.stroke();
      });
      g.globalAlpha = 1;
    }
    if (ch === 2) {
      // 먼 번개 성
      g.fillStyle = 'rgba(150,110,200,.5)';
      for (const [x, tw, th] of [[0.66, 0.05, 0.22], [0.74, 0.07, 0.3], [0.83, 0.05, 0.2], [0.9, 0.04, 0.15]]) {
        g.fillRect(R(x - tw / 2), R(0.72 - th), R(tw), R(th));
        g.beginPath();
        g.moveTo(R(x - tw / 2 - 0.01), R(0.72 - th));
        g.lineTo(R(x), R(0.72 - th - 0.07));
        g.lineTo(R(x + tw / 2 + 0.01), R(0.72 - th));
        g.fill();
      }
      g.fillRect(R(0.62), R(0.62), R(0.32), R(0.1));
    }
    // 먼 구름 벽
    for (let i = 0; i < 9; i++) cloudBlob(g, R(i * 0.13 - 0.02), R(0.74 + (i % 2) * 0.03), R(0.08), P.far, 'rgba(150,180,220,.18)');
    for (let i = 0; i < 6; i++) cloudBlob(g, R(hsh(i * 5 + ch) * 1.0), R(0.12 + hsh(i * 7 + ch) * 0.45), R(0.035 + hsh(i) * 0.03), 'rgba(255,255,255,.7)', 'rgba(255,255,255,0)');
  });
  BGS.set(key, c);
  return c;
}
/** 흐르는 층: 0 섬 · 1 가까운 구름 바다 */
const STRIPS = new Map<string, HTMLCanvasElement>();
function strip(kind: number, ch: number, w: number, sc: number): HTMLCanvasElement {
  const key = `${kind}:${ch}:${w}:${sc}`;
  let c = STRIPS.get(key);
  if (c) return c;
  if (STRIPS.size > 8) STRIPS.clear();
  const P = PALS[ch], R = (v: number) => v * w, H = kind ? R(0.32) : R(0.5);
  c = layer(w, H, sc, (g) => {
    if (kind === 0) {
      for (let i = 0; i < 3; i++) {
        g.save();
        g.translate(R(0.17 + i * 0.33), R(0.1 + (i % 2) * 0.12));
        islePaint(g, ch, R(0.1 + hsh(i * 9 + ch) * 0.05), i * 13 + ch);
        g.restore();
      }
    } else {
      for (let i = 0; i < 9; i++) cloudBlob(g, R(i * 0.125), R(0.14 + (i % 3) * 0.025), R(0.085), P.sea[i % 2], 'rgba(140,170,210,.25)');
      g.fillStyle = P.sea[0];
      g.fillRect(0, R(0.2), w, H - R(0.2));
    }
  });
  STRIPS.set(key, c);
  return c;
}
/** 구경꾼: 구름 아기 (0 가만히 · 1 환호 · 2 깜짝) */
const CROWD = new Map<string, HTMLCanvasElement>();
function crowdKid(col: number, mood: number, px: number): HTMLCanvasElement {
  const q = Math.max(4, Math.round(px)), key = `${col}:${mood}:${q}`;
  let c = CROWD.get(key);
  if (!c) {
    if (CROWD.size > 40) CROWD.clear();
    const cols = ['#ffffff', '#fff1f8', '#f0f8ff', '#fffbe8', '#f4f0ff'][col % 5], cheek = ['#ffb0c0', '#ff9ec0', '#9fd0ff', '#ffc890', '#c8a8ff'][col % 5];
    c = layer(3 * q, 3 * q, 1, (g) => {
      g.translate(1.5 * q, 1.9 * q);
      g.scale(q, q);
      if (mood === 1) {
        g.strokeStyle = OUT;
        g.lineWidth = 0.14;
        for (const sd of [-1, 1]) (g.beginPath(), g.moveTo(sd * 0.75, -0.5), g.lineTo(sd * 1.15, -1.15), g.stroke());
      }
      g.beginPath();
      for (const [dx, dy, r] of [[-0.55, 0, 0.5], [0, -0.35, 0.65], [0.55, 0, 0.5]]) g.moveTo(dx + r, dy), g.arc(dx, dy, r, 0, TAU);
      ink(g, cols, 0.12);
      ell(g, 0, 0.05, 0.95, 0.45);
      g.fillStyle = cols;
      g.fill();
      if (mood === 1) face(g, 0, -0.3, 0.3, 0.2, F_HAPPY, 0.25, 0.8);
      else if (mood === 2) face(g, 0, -0.3, 0.3, 0.2, F_SCARED, 0.28, 0.6);
      else face(g, 0, -0.3, 0.3, 0.2, F_IDLE, 0.25, 0.7);
      g.fillStyle = cheek;
      g.globalAlpha = 0.6;
      for (const sd of [-1, 1]) ell(g, sd * 0.5, -0.05, 0.14, 0.08), g.fill();
      g.globalAlpha = 1;
    });
    CROWD.set(key, c);
  }
  return c;
}

// ───────────────────────────── 그리기: 장면 ─────────────────────────────
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const STAR_WORDS = (s: DrState) => {
  const d = STAGES[s.stage];
  return [KD[d.key].boss ? '대장 이기기' : '하늘 비우기', '하트 안 잃고', d.star === 'pop' ? `폭죽 한 번에 ${d.n}` : d.star === 'sky' ? `대장의 힘 ${d.n}번` : d.star === 'combo' ? `딱 맞아 ${d.n}` : `줄줄이 ${d.n}`];
};
const recent = new WeakMap<object, { x: number; y: number; t: number; size: number }[]>();
/** 화면에 쓰는 글꼴(크기·굵기) — 처음 쓰는 순간 끊기지 않게 판 초반에 하나씩 미리 불러 둔다 */
const FONTS: [number, number][] = [[0.034, 700], [0.034, 800], [0.034, 900], [0.036, 800], [0.036, 900], [0.038, 900], [0.04, 900], [0.042, 900], [0.044, 900], [0.046, 900], [0.05, 900], [0.052, 900], [0.058, 900], [0.062, 900], [0.07, 900]];
const FLAP: Partial<Record<K, number>> = { bat: 3, owl: 4, eagle: 4, drake: 4, fly: 2, bfly: 3, spark: 2, squir: 5, beetle: 1, jelly: 5, whale: 6 };
/** 판마다 미리 구워 둘 스티커: 그 판에 나오는 짐승 × 표정 × 장면 */
const WARM = new Map<number, [K, number, number][]>();
function warmList(stage: number): [K, number, number][] {
  let list = WARM.get(stage);
  if (!list) {
    const d = STAGES[stage], kinds = new Set<K>();
    for (const w of d.waves) for (const f of w.fl) kinds.add(f.k);
    for (const g of d.summon ?? []) for (const f of g) kinds.add(f.k);
    list = [];
    for (const k of kinds) for (let mood = 0; mood <= F_HAPPY; mood++) for (let f = 0; f < 2; f++) list.push([k, mood, f]);
    WARM.set(stage, list);
  }
  return list;
}
const WQ = new Map<string, (() => boolean)[]>(), WQI = new Map<string, number>();
/** 아이콘은 두 크기로만 굽는다 (작은 것: 띠·도감·떼 표, 큰 것: 이름표·떨어지는 부위) */
const ICON_S = 0.03, ICON_L = 0.05;
function iconAt(ctx: C2, p: P, x: number, y: number, k: number, base: number, sc: number, sil = false) {
  ctx.drawImage(sil ? silIcon(p, base * sc) : icon(p, base * sc), x - k * 1.5, y - k * 1.5, k * 3, k * 3);
}
/** 이 판에 쓸 그림 굽기 목록 (한 번 구운 것은 건너뛴다) */
function warmTasks(stage: number, w: number, h: number, sc: number, sc2: number, tr: number): (() => boolean)[] {
  const R = (r: number) => r * w, ch = STAGES[stage].ch, out: (() => boolean)[] = [];
  const once = (key: string, f: () => void) => () => (DONE.has(key) ? false : (DONE.add(key), f(), true));
  out.push(once(`bg${ch}:${w}:${h}:${sc2}`, () => getBg(ch, Math.round(w), Math.round(h), sc2)));
  for (const k of [0, 1]) out.push(once(`st${k}:${ch}:${w}:${sc2}`, () => strip(k, ch, Math.round(w), sc2)));
  for (const [k, mood, f] of warmList(stage)) out.push(() => warmSprite(k, mood, f, Math.round(R(KD[k].r) * sc2)));
  for (let i = 0; i < 5; i++) for (let mood = 0; mood < 3; mood++) out.push(once(`ck${i + ch}:${mood}:${w}:${sc}`, () => crowdKid(i + ch, mood, R(0.028) * sc)));
  // 결과·선물·판 시작 카드의 글자: 글꼴마다 글자 모양을 미리 한 번 그려 둔다 (첫 프레임에 글자 굽기가 몰리지 않게)
  for (const [sz, wg] of HUD_FONTS) {
    const f = `${wg} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`;
    for (let i = 0; i < GLYPHS.length; i += 24) out.push(once(`tx${f}:${tr}:${i}`, () => warmText(f, GLYPHS.slice(i, i + 24), tr)));
  }
  for (const p of DEXP) {
    out.push(once(`is${p}:${w}:${sc2}`, () => icon(p, R(ICON_S) * sc2)));
    out.push(once(`il${p}:${w}:${sc2}`, () => icon(p, R(ICON_L) * sc2)));
    out.push(once(`ss${p}:${w}:${sc2}`, () => silIcon(p, R(ICON_S) * sc2)));
  }
  return out;
}
const DONE = new Set<string>();
const HUD_FONTS: [number, number][] = [[0.03, 700], [0.03, 800], [0.03, 900], [0.031, 800], [0.032, 700], [0.032, 800], [0.032, 900], [0.033, 800], [0.034, 700], [0.034, 800], [0.034, 900], [0.035, 900], [0.036, 800], [0.036, 900], [0.037, 900], [0.038, 900], [0.04, 900], [0.042, 900], [0.044, 900], [0.046, 900], [0.05, 900], [0.062, 900]];
/** 카드·띠에 나올 수 있는 글자 모두 (겹친 글자는 한 번) */
const GLYPHS = [...new Set([
  '0123456789+-,/×·→!?:—()', '판 깼다 모든 하늘을 날았다 별 개 빨리 지남 점 아기 용 Lv 몸이 조금 커지고 힘이 세져요 도감 조합 모습 가지 새 부위 다음',
  '대장 이기기 하늘 비우기 하트 안 잃고 줄줄이 폭죽 한 번에 딱 맞아 대장의 힘 별 셋째 대장을 이겼다 와르르 끝 선물 하나 에 뜬 큰 물건 둘 중 를 톡 다시 누르면 해요 을 잃었어요 이 만',
  ...Object.values(LV_GIFT), ...CHAPTERS, ...STAGES.map((d) => d.name + d.news), ...DEXP.map((p) => PD[p].name + PD[p].line), ...COMBOS.map((c) => c.name + c.line),
  ...PERKS.flat().map((q) => q.name + q.line), ...Object.values(DROP_NAME), ...Object.values(KD).map((k) => k.name),
].join(''))].filter((c) => c !== ' ').join('');
let TXTC: CanvasRenderingContext2D | null = null;
function warmText(f: string, str: string, tr: number) {
  if (!TXTC) {
    const c = document.createElement('canvas');
    (c.width = 64), (c.height = 64);
    TXTC = c.getContext('2d');
  }
  if (!TXTC) return;
  TXTC.setTransform(tr, 0, 0, tr, 0, 0);
  TXTC.font = f;
  TXTC.fillText(str, 0, 20);
  TXTC.strokeText(str, 0, 20);
}
function drawAll(ctx: C2, s: DrState, w: number, h: number, _th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const sc = typeof ctx.getTransform === 'function' ? Math.min(3, Math.max(1, Math.round(ctx.getTransform().a || 1))) : 1, sc2 = Math.min(2, sc);
  const d = STAGES[s.stage], ch = d.ch, me = s.me, seenT = fx.memo.t ?? -1, mr = meR(s);
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  // 미리 굽기: 판 중에는 이 판(+결과 카드)에 쓸 그림을, 결과·선물 화면에서는 다음 판 것을 프레임마다 조금씩 — 판 시작·결과 첫 프레임이 튀지 않게
  {
    const rest = s.phase !== 'play', ws = rest && s.stage + 1 < STAGES.length ? s.stage + 1 : s.stage;
    if (!(rest && s.pt < 12)) {
      const key = `${ws}:${Math.round(w)}:${Math.round(h)}:${sc}`;
      let q = WQ.get(key);
      if (!q) WQ.set(key, (q = warmTasks(ws, w, h, sc, sc2, typeof ctx.getTransform === 'function' ? ctx.getTransform().a || 1 : 1)));
      let i = WQI.get(key) ?? 0, did = 0;
      for (let n = 0; i < q.length && did < 1 && n < 40; i++, n++) if (q[i]()) did++;
      WQI.set(key, i);
    }
    const fi = fx.memo.wf ?? 0;
    if (fi < FONTS.length && t % 3 === 0) font(FONTS[fi][0], FONTS[fi][1]), ctx.measureText('가나다 한 방! 0123'), (fx.memo.wf = fi + 1);
  }
  const text = (str: string, x: number, y: number, fill: string, stroke = 'rgba(59,42,63,.9)', lw = 3) => {
    ctx.lineJoin = 'round';
    if (lw > 0) (ctx.lineWidth = lw), (ctx.strokeStyle = stroke), ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  };
  const textK = (str: string, x: number, y: number, k: number, fill: string, stroke?: string, lw?: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    text(str, 0, 0, fill, stroke, lw);
    ctx.restore();
  };
  const puff = (x: number, y: number, col: string, n: number, spd = 3, size = 3) => {
    if (fx.particles.length < 150) fx.burst(x, y, col, Math.min(n, 150 - fx.particles.length), spd, size);
  };
  const say = (x: number, y: number, str: string, col: string, size: number) => {
    let rec = recent.get(s);
    if (!rec) recent.set(s, (rec = []));
    x = clamp(x, w * 0.12, w * 0.88);
    y = clamp(y, Y(0.26), Y(1.2));
    for (let k = 0; k < 5 && rec.some((q) => t - q.t < 30 && Math.abs(q.x - x) < w * 0.16 && Math.abs(q.y - y) < (size + q.size) * 0.55); k++) y -= size * 0.9;
    rec.push({ x, y, t, size });
    if (rec.length > 14) rec.shift();
    fx.pop(x, y, str, col, size);
  };
  const cheer = (s.big && t - s.big.t < 80) || s.phase === 'result' || (s.phase === 'end' && s.won);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.save();
  fx.begin(ctx);
  // ── 하늘 · 흐르는 섬 ──
  ctx.drawImage(getBg(ch, Math.round(w), Math.round(h), sc2), 0, 0, w, h);
  {
    const st0 = strip(0, ch, Math.round(w), sc2), ow = w, off = (t * 0.35) % ow;
    ctx.globalAlpha = 0.85;
    for (const k of [0, 1]) ctx.drawImage(st0, -off + k * ow, Y(0.24), ow, R(0.5));
    ctx.globalAlpha = 1;
  }
  // ── 경고: 박치기 화살 · 대장 돌진 줄 · 낙뢰 자리 ──
  for (const m of s.mons) {
    if (m.st !== WIND || m.dead) continue;
    const kd = KD[m.k];
    if (kd.beh === 'ram' || (kd.boss && m.k !== 'whale')) {
      const q = clamp(1 - m.tm / (kd.boss ? 50 : 40), 0, 1), a = Math.atan2(m.ay - m.y, m.ax - m.x), L = kd.boss ? 1.2 : 0.7;
      ctx.strokeStyle = `rgba(255,70,60,${0.35 + 0.5 * q})`;
      ctx.lineWidth = R(kd.boss ? 0.03 : 0.018) * (0.6 + 0.6 * q);
      ctx.setLineDash([R(0.035), R(0.025)]);
      ctx.lineDashOffset = -t * 2;
      ctx.beginPath();
      ctx.moveTo(X(m.x), Y(m.y));
      ctx.lineTo(X(m.x + Math.cos(a) * L), Y(m.y + Math.sin(a) * L));
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  for (const q of s.q) {
    if (q.k !== 'strike') continue;
    const k = clamp(1 - (q.t - t) / 50, 0, 1);
    ell(ctx, X(q.x), Y(q.y), R(q.r), R(q.r));
    ctx.fillStyle = `rgba(255,220,80,${0.12 + 0.25 * k})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,90,60,${0.5 + 0.5 * k})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ell(ctx, X(q.x), Y(q.y), R(q.r * k), R(q.r * k));
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.stroke();
  }
  // ── 회오리 (뒤쪽) ──
  for (const tw of s.twisters) {
    const x = X(tw.x), y = Y(tw.y), r = R(tw.r), a = Math.min(1, tw.t / 10, (tw.T - tw.t) / 12);
    ctx.save();
    ctx.globalAlpha = a * 0.9;
    for (let i = 0; i < 6; i++) {
      const k = 1 - i * 0.14, yy = y + r * 0.9 - i * r * 0.36, ww = r * (0.35 + k * 0.9);
      ell(ctx, x + Math.sin(t * 0.3 + i) * r * 0.08, yy, ww, ww * 0.32);
      ctx.fillStyle = tw.fire ? `rgba(255,${150 + i * 15},60,${0.18 + i * 0.04})` : `rgba(220,255,245,${0.25 + i * 0.05})`;
      ctx.fill();
      ctx.strokeStyle = tw.fire ? 'rgba(255,120,40,.85)' : 'rgba(90,200,170,.75)';
      ctx.lineWidth = 2;
      ctx.setLineDash([ww * 0.5, ww * 0.3]);
      ctx.lineDashOffset = -t * 4 - i * 7;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
  // ── 대장이 흘린 것 ──
  for (const it of s.items) {
    const fade = it.t > 700 ? Math.max(0, 1 - (it.t - 700) / 60) : 1;
    ctx.globalAlpha = fade * (it.t > 640 && (t >> 3) % 2 ? 0.6 : 1);
    drawItem(ctx, it, X(it.x), Y(it.y), R(0.05), t);
    ctx.globalAlpha = 1;
  }

  // ── 하늘 짐승 ──
  const myAtk = me.parts.filter(Boolean).map((q) => ATK_OF[q!.p]);
  const tagged = new Set<number>(), tops = new Map<number, Mon>();
  for (const m of s.mons) {
    if (m.dead || KD[m.k].boss || m.st === ENTER) continue;
    const tp = tops.get(m.fid);
    if (!tp || m.y - m.r < tp.y - tp.r) tops.set(m.fid, m);
  }
  for (const m of tops.values()) tagged.add(m.id);
  const drawMon = (m: Mon) => {
    const kd = KD[m.k], u = R(m.r0) * (m.k === 'puff' ? 1 + 0.38 * m.puff : 1), ph = m.seed % 97;
    let x = X(m.x), y = Y(m.y) + Math.sin(t * 0.1 + ph) * u * 0.08, sx = 1, sy = 1, rot = 0;
    const hurtA = t - m.hurtT, atkA = t - m.atkT;
    let mood = F_IDLE;
    if (m.st === HELD) (mood = F_SCARED), (x += Math.sin(t * 1.7 + ph) * 1.5), (sx = sy = 1 - Math.min(0.3, m.tm * 0.02));
    else if (hurtA < 9) (mood = F_HURT), (sx *= 1 + 0.2 * (1 - hurtA / 9)), (sy *= 1 - 0.15 * (1 - hurtA / 9));
    else if (m.stun > 0 || m.caught || m.trap > 0) mood = F_DIZZY;
    else if (m.st === WIND || m.rage > 0) (mood = F_ANGRY), (x += Math.sin(t * 1.4 + ph) * (m.st === WIND ? 1.5 : 0.6));
    else if (m.st === DASH && atkA < 30) mood = F_ANGRY;
    if (m.caught) rot = Math.sin(t * 0.4 + ph) * 0.8;
    if (m.st === ENTER) rot = -0.15;
    const fr = m.frozen > 0 ? 0 : m.k === 'puff' ? (m.puff > 0.5 ? 1 : 0) : ((t + ph) >> (FLAP[m.k] ?? 3)) % 2;
    const q = Math.round(R(kd.r) * sc2) * (m.king ? 1 : 1);
    // 그림자 (아래 구름에 비친)
    ctx.fillStyle = 'rgba(60,80,120,.12)';
    ell(ctx, x, y + u * 1.25, u * 0.85, u * 0.2);
    ctx.fill();
    // 지금 내 몸이 약점을 찌른다: 발밑이 반짝
    const weakToMe = myAtk.some((a) => WEAK[m.k].includes(a));
    const weakMark = weakToMe && s.phase === 'play' && m.st !== ENTER && m.st !== HELD;
    if (m.king) {
      ctx.fillStyle = radg(ctx, x, y, u * 0.4, u * 1.9, [0, 'rgba(255,120,60,.35)'], [1, 'rgba(255,120,60,0)']);
      ell(ctx, x, y, u * 1.9, u * 1.9);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale((m.face > 0 ? -1 : 1) * sx * (m.king ? KING_R : 1), sy * (m.king ? KING_R : 1));
    stamp(ctx, sprite(m.k, mood, fr, q), R(kd.r) * (m.k === 'puff' ? 1 + 0.38 * m.puff : 1));
    ctx.restore();
    const top = y - u * 1.35;
    if (m.king) {
      // 왕관
      ctx.save();
      ctx.translate(x, top - u * 0.1);
      const k = u * 0.42;
      ctx.beginPath();
      ctx.moveTo(-k, 0);
      ctx.lineTo(-k * 1.1, -k * 0.95);
      ctx.lineTo(-k * 0.5, -k * 0.5);
      ctx.lineTo(0, -k * 1.2);
      ctx.lineTo(k * 0.5, -k * 0.5);
      ctx.lineTo(k * 1.1, -k * 0.95);
      ctx.lineTo(k, 0);
      ctx.closePath();
      ctx.fillStyle = lin(ctx, 0, -k * 1.2, 0, 0, [0, '#fff3a8'], [1, '#f5b921']);
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();
    }
    if (m.frozen > 0) {
      ctx.fillStyle = 'rgba(180,232,255,.55)';
      ctx.strokeStyle = 'rgba(255,255,255,.95)';
      ctx.lineWidth = 2;
      rr(ctx, x - u * 1.2, y - u * 1.2, u * 2.4, u * 2.4, u * 0.45);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - u * 0.75, y - u * 0.9);
      ctx.lineTo(x - u * 0.3, y - u * 0.4);
      ctx.stroke();
    }
    if (m.trap > 0) bubbleDot(ctx, x, y, u * 1.45 * (1 + 0.04 * Math.sin(t * 0.3)));
    if (m.rage > 0) {
      // 화남: 머리 위 김 · 빨간 기운
      ctx.fillStyle = `rgba(255,80,60,${0.12 + 0.08 * Math.sin(t * 0.4 + ph)})`;
      ell(ctx, x, y, u * 1.25, u * 1.25);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = 0; i < 2; i++) {
        const f = ((t * 0.05 + i * 0.5 + ph * 0.01) % 1);
        ell(ctx, x + (i ? 1 : -1) * u * (0.4 + 0.2 * f), top - f * u * 0.8, u * (0.14 + 0.12 * f), u * (0.12 + 0.1 * f));
        ctx.fill();
      }
    }
    if (weakMark) {
      // 지금 내 몸이 약점을 찌른다: 머리 옆에 반짝
      const tw = 0.5 + 0.5 * Math.sin(t * 0.25 + ph);
      starPath(ctx, x - u * 0.95, top + u * 0.35, Math.max(3.5, u * 0.42) * (0.7 + 0.4 * tw), 0.36);
      ctx.fillStyle = '#fff3a0';
      ctx.fill();
      ctx.strokeStyle = '#e09a10';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    if ((m.st === WIND && kd.beh !== 'ram' && !kd.boss) || (kd.shoot && m.st === WIND)) {
      font(0.04, 900);
      text('!', x, top - R(0.01), '#ff4a3e', '#ffffff', 3);
    }
    // 체력 띠 (질긴 놈·왕)
    if ((kd.big || m.king || kd.shell) && m.hp < m.max && m.st !== ENTER && !kd.boss) {
      const qq = clamp(m.hp / m.max, 0, 1), bw = u * 1.7, bh = Math.max(3, R(0.009));
      rr(ctx, x - bw / 2 - 1, top - bh - 1, bw + 2, bh + 2, bh);
      ctx.fillStyle = OUT;
      ctx.fill();
      rr(ctx, x - bw / 2, top - bh, Math.max(bh, bw * qq), bh, bh);
      ctx.fillStyle = '#ff7a5c';
      ctx.fill();
    }
    // 먹으면 돋는 부위 (떼마다 하나)
    if (tagged.has(m.id) && s.phase === 'play' && m.st !== HELD) {
      const p = kd.p, bx = x, by = top - R(m.king ? 0.075 : 0.042), k = R(0.021), sl = PD[p].slot;
      ell(ctx, bx, by, k * 1.5, k * 1.5);
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      ctx.fill();
      ctx.strokeStyle = SLOT_COL[sl];
      ctx.lineWidth = 2.2;
      ctx.stroke();
      iconAt(ctx, p, bx, by, k, R(ICON_S), sc2);
    }
  };
  // 멀리 있는 것부터
  const order = s.mons.filter((m) => !m.dead).sort((a, b) => (isBoss(a) ? 0 : 1) - (isBoss(b) ? 0 : 1) || a.y - b.y || a.id - b.id);
  for (const m of order) drawMon(m);
  const boss = s.mons.find((m) => !m.dead && isBoss(m));

  // ── 사라지는 몸 ──
  for (const c of s.corpses) {
    const age = t - c.t, u = R(c.r);
    if (c.how === 1) {
      // 꿀꺽: 입으로 빨려 들어간다
      if (age < 10) {
        const k = age / 10, [mx, my] = mouth(s);
        ctx.save();
        ctx.translate(X(c.x + (mx - c.x) * k), Y(c.y + (my - c.y) * k));
        ctx.scale(1 - k * 0.85, 1 - k * 0.85);
        stamp(ctx, sprite(c.k, F_SCARED, 0, Math.round(R(KD[c.k].r) * sc2)), u);
        ctx.restore();
      }
    } else if (age < 14) {
      const k = age / 14;
      ctx.save();
      ctx.translate(X(c.x + c.vx * age), Y(c.y + c.vy * age) - Math.sin(k * Math.PI) * R(0.04));
      ctx.globalAlpha = 1 - k * k * k;
      ctx.rotate((c.seed % 2 ? 1 : -1) * k * 2.2);
      ctx.scale(1 + k * 0.4, 1 + k * 0.4);
      stamp(ctx, sprite(c.k, F_HURT, 0, Math.round(R(KD[c.k].r) * sc2)), u);
      ctx.restore();
    }
  }

  // ── 내 것: 거품 · 가시 · 바람 · 폭풍 · 고래 물결 ──
  for (const k of s.mines) {
    const x = X(k.x), y = Y(k.y);
    if (k.k === 'bubble') bubbleDot(ctx, x, y, R(k.r) * (1 + 0.06 * Math.sin(t * 0.4)));
    else if (k.k === 'needle') {
      const a = Math.atan2(k.vy, k.vx), L = R(0.032);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(L, 0);
      ctx.lineTo(-L * 0.6, -L * 0.28);
      ctx.lineTo(-L * 0.6, L * 0.28);
      ctx.closePath();
      ctx.fillStyle = comboOn(s, '번개 가시') ? '#fff27a' : '#ffd05a';
      ctx.fill();
      ctx.strokeStyle = '#9a5a12';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    } else if (k.k === 'gust') {
      const a = Math.min(1, (k.T - k.t) / 12), dir = k.vx > 0 ? 1 : -1, hh = R(k.r);
      ctx.save();
      ctx.globalAlpha = a;
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = i ? 'rgba(255,255,255,.8)' : 'rgba(185,163,255,.9)';
        ctx.lineWidth = R(0.018) - i * 2;
        ctx.beginPath();
        ctx.ellipse(x - dir * i * R(0.025), y, R(0.05), hh * (1 - i * 0.12), 0, dir > 0 ? -Math.PI / 2 : Math.PI / 2, dir > 0 ? Math.PI / 2 : Math.PI * 1.5);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // 폭풍 · 고래 물결: 하늘 높이만 한 벽
      const a = Math.min(1, k.t / 6, (k.T - k.t) / 12), dir = k.vx > 0 ? 1 : -1, top = Y(FY0 - 0.02), bot = Y(FY1 + 0.02);
      ctx.save();
      ctx.globalAlpha = a;
      if (k.k === 'storm') {
        for (let i = 0; i < 4; i++) {
          const yy = top + ((i + 0.5) / 4) * (bot - top), rr2 = R(0.11);
          ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,.9)' : 'rgba(150,205,255,.95)';
          ctx.lineWidth = R(0.016);
          ctx.beginPath();
          ctx.arc(x, yy, rr2, t * 0.4 * dir + i, t * 0.4 * dir + i + Math.PI * 1.5);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x, yy, rr2 * 0.55, -t * 0.5 * dir + i, -t * 0.5 * dir + i + Math.PI * 1.3);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(200,230,255,.25)';
        ctx.fillRect(x - R(0.06), top, R(0.12), bot - top);
      } else {
        ctx.fillStyle = lin(ctx, x - dir * R(0.12), 0, x + dir * R(0.04), 0, [0, 'rgba(60,150,230,0)'], [0.6, 'rgba(70,170,240,.75)'], [1, 'rgba(230,248,255,.95)']);
        ctx.beginPath();
        ctx.moveTo(x - dir * R(0.14), top);
        for (let i = 0; i <= 10; i++) {
          const yy = top + (i / 10) * (bot - top);
          ctx.lineTo(x + dir * R(0.04) * Math.sin(i * 1.3 + t * 0.3), yy);
        }
        ctx.lineTo(x - dir * R(0.14), bot);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 8; i++) ell(ctx, x + dir * R(0.02), top + ((i + 0.5) / 8) * (bot - top), R(0.018), R(0.012)), ctx.fill();
      }
      ctx.restore();
    }
  }

  // ── 아기 용 ──
  const r = R(mr * DK), bob = Math.sin(t * 0.12) * r * 0.06;
  if (s.phase !== 'end' || s.won) {
    let x = X(me.x), y = Y(me.y) + bob;
    const hurtA = t - me.hurtT, bare = me.parts.every((q) => !q);
    // 먹으러 가는 길 · 박치기 바람줄
    if (me.fly || me.ram > 0) {
      const a = me.fly ? Math.atan2(me.vy || 0.001, me.face) : me.ramA;
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = Math.max(2, r * 0.12);
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const o = 1.2 + ((t * 0.31 + i * 0.37) % 1) * 1.1, yy = y - r * (0.5 - i * 0.45), c = Math.cos(me.fly ? (me.face > 0 ? 0 : Math.PI) : a), sn = me.fly ? 0 : Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(x - c * r * o, yy - sn * r * o);
        ctx.lineTo(x - c * r * (o + 1), yy - sn * r * (o + 1));
        ctx.stroke();
      }
    }
    if (me.inv > 0 && me.inv < 100 && (t >> 2) % 2 && hurtA < 120) ctx.globalAlpha = 0.55;
    // 빛 · 그림자
    ctx.fillStyle = radg(ctx, x, y, r * 0.5, r * 2.4, [0, 'rgba(255,250,220,.4)'], [1, 'rgba(255,250,220,0)']);
    ell(ctx, x, y, r * 2.4, r * 2.4);
    ctx.fill();
    ctx.fillStyle = 'rgba(60,80,120,.14)';
    ell(ctx, x, y + r * 1.35, r * 1.1, r * 0.22);
    ctx.fill();
    let mood = D_IDLE;
    if (hurtA < 14) mood = D_HURT;
    else if (me.chew > 0 || t - me.eatT < 12) mood = D_CHEW;
    else if (me.parts[0] && t - me.atkT[0] < 14) mood = D_BREATH;
    else if (bare && s.started && s.phase === 'play') mood = D_WORRY;
    else if ((s.big && t - s.big.t < 60) || s.phase === 'result') mood = D_PROUD;
    if (me.chew > CHEW_T - 8) {
      const q = (CHEW_T - me.chew) / 8;
      x += 0;
      y -= Math.sin(q * Math.PI) * r * 0.15;
    }
    const tl = me.parts[2], tailSwing = tl && tl.p === 'hammer' && t - me.atkT[2] < 16 ? Math.sin(((t - me.atkT[2]) / 16) * Math.PI) * 1.9 : 0;
    const wavy = tl && tl.p === 'wave' && t - me.atkT[2] < 16 ? Math.sin(((t - me.atkT[2]) / 16) * Math.PI) * 1.2 : 0;
    drawDragon(ctx, x, y, r, me.face, me.tint, me.parts, {
      t, lv: s.lv, mood,
      tail: Math.sin(t * 0.09) * 0.16 + tailSwing + wavy,
      flap: t * (me.parts[1]?.p === 'wing' || me.parts[1]?.p === 'storm' ? 0.28 : 0.2),
      pin: t * 0.45,
      glow: me.parts.map((q) => (q ? q.ch : 0)),
      crack: me.parts.map((q) => (q && q.hp / q.max < 0.5 ? 1 - q.hp / q.max : 0)),
      born: me.parts.map((q) => (q ? q.born : -99)),
    });
    ctx.globalAlpha = 1;
    // 처음 보는 사람에게: 이 용이 나
    if (s.stage === 0 && !s.started && s.phase === 'play') {
      const lx = x, ly = y + r * 1.75;
      font(0.034, 900);
      rr(ctx, lx - R(0.085), ly - R(0.025), R(0.17), R(0.05), R(0.025));
      ctx.fillStyle = '#ff8a3d';
      ctx.fill();
      text('나: 아기 용', lx, ly + 0.5, '#ffffff', '', 0);
    }
  }
  // ── 숨결 ──
  {
    const hp0 = me.parts[0], [mx, my] = mouth(s), age = t - me.atkT[0];
    if (hp0?.p === 'fire' && age < 18 && s.phase === 'play') {
      const a = me.aim[0], L = R(me.reach[0]), half = 0.46 + 0.1 * (hp0.g - 1), k = age < 4 ? age / 4 : 1, fade = Math.min(1, (18 - age) / 8);
      ctx.save();
      ctx.translate(X(mx), Y(my) + bob);
      ctx.rotate(a);
      ctx.globalAlpha = fade;
      const LL = L * k;
      // 부채꼴 불: 입에서 노랗게 → 끝은 빨갛게, 가장자리는 넘실
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let i = 0; i <= 10; i++) {
        const aa = -half + (i / 10) * half * 2, bump = 0.88 + 0.16 * hsh(i * 7 + (t >> 2));
        ctx.lineTo(Math.cos(aa) * LL * bump, Math.sin(aa) * LL * bump);
      }
      ctx.closePath();
      ctx.fillStyle = lin(ctx, 0, 0, LL, 0, [0, '#fffbe0'], [0.3, '#ffd23f'], [0.7, '#ff8a1f'], [1, '#ff5a1f']);
      ctx.fill();
      ctx.strokeStyle = '#d9480f';
      ctx.lineWidth = 2;
      ctx.stroke();
      // 끝자락 불꽃 혀 (바깥을 향해)
      for (let i = 0; i < 5; i++) {
        const aa = -half * 0.8 + (i / 4) * half * 1.6, rr2 = LL * (0.82 + 0.1 * hsh(i + (t >> 2))), fk = R(0.028) * (0.8 + 0.4 * hsh(i * 5 + (t >> 1)));
        ctx.save();
        ctx.translate(Math.cos(aa) * rr2, Math.sin(aa) * rr2);
        ctx.rotate(aa);
        ctx.beginPath();
        ctx.moveTo(0, -fk * 0.7);
        ctx.quadraticCurveTo(fk * 1.2, -fk * 0.6, fk * 2.1, 0);
        ctx.quadraticCurveTo(fk * 1.2, fk * 0.6, 0, fk * 0.7);
        ctx.closePath();
        ctx.fillStyle = i % 2 ? '#ffb02e' : '#ff7a1f';
        ctx.fill();
        ctx.strokeStyle = '#d9480f';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
      // 속 불씨
      for (let i = 0; i < 5; i++) {
        const q = 0.25 + 0.6 * hsh(i * 3 + (t >> 1)), aa = (hsh(i * 11 + (t >> 2)) - 0.5) * half * 1.4;
        ell(ctx, Math.cos(aa) * LL * q, Math.sin(aa) * LL * q, R(0.014 + 0.012 * q), R(0.014 + 0.012 * q));
        ctx.fillStyle = '#fff6c8';
        ctx.fill();
      }
      ctx.restore();
    }
    if (hp0?.p === 'bubble' && age < 10) bubbleDot(ctx, X(mx), Y(my) + bob, R(0.02 + 0.003 * age));
  }
  // ── 줄: 번개 · 얼음 · 벼락 · 번개 용 숨결 · 연쇄 ──
  for (const l of s.lines) {
    const age = t - l.t, a = clamp(1 - age / 14, 0, 1), x0 = X(l.x0), y0 = Y(l.y0), x1 = X(l.x1), y1 = Y(l.y1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (l.k === 1) {
      ctx.strokeStyle = `rgba(120,210,255,${a})`;
      ctx.lineWidth = R(0.03) * a + 2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = R(0.011) * a + 1;
      ctx.stroke();
      ctx.fillStyle = `rgba(230,250,255,${a})`;
      for (let i = 1; i < 6; i++) {
        const q = i / 6;
        starPath(ctx, x0 + (x1 - x0) * q, y0 + (y1 - y0) * q, R(0.016), 0.4);
        ctx.fill();
      }
    } else if (l.k === 3) {
      ctx.strokeStyle = `rgba(150,110,255,${a})`;
      ctx.lineWidth = R(0.05) * a + 2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,240,140,${a})`;
      ctx.lineWidth = R(0.018) * a + 1;
      ctx.stroke();
    } else if (age < 11) {
      const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, n = Math.max(3, Math.round(L / R(0.05)));
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      for (let i = 1; i < n; i++) {
        const j = (hsh(l.t * 3 + i * 7 + (t >> 1)) - 0.5) * R(l.k === 4 ? 0.03 : 0.05);
        ctx.lineTo(x0 + (dx * i) / n + nx * j, y0 + (dy * i) / n + ny * j);
      }
      ctx.lineTo(x1, y1);
      const col = l.k === 4 ? l.col ?? '255,120,200' : '255,214,60';
      ctx.strokeStyle = `rgba(${col},${1 - age / 11})`;
      ctx.lineWidth = R(l.k === 2 ? 0.028 : 0.02);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${1 - age / 11})`;
      ctx.lineWidth = R(0.008);
      ctx.stroke();
      if (l.k === 4) {
        ctx.fillStyle = `rgba(255,230,120,${1 - age / 11})`;
        starPath(ctx, x1, y1, R(0.028) * (1 - age / 22), 0.4);
        ctx.fill();
      }
    }
  }
  // ── 적 총알 ──
  for (const q of s.shots) {
    const x = X(q.x), y = Y(q.y), k = R(q.r);
    if (q.k === 0) {
      ctx.fillStyle = '#fff27a';
      starPath(ctx, x, y, k * 1.4, 0.45);
      ctx.fill();
      ctx.strokeStyle = '#d49000';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else if (q.k === 1) {
      ell(ctx, x, y, k, k * 1.15);
      ctx.fillStyle = '#b8743a';
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ell(ctx, x, y - k * 0.7, k * 1.05, k * 0.45);
      ctx.fillStyle = '#7a4a22';
      ctx.fill();
    } else if (q.k === 2 || q.k === 4) {
      const a = Math.atan2(q.vy, q.vx);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.strokeStyle = q.k === 2 ? 'rgba(185,163,255,.95)' : 'rgba(160,210,255,.95)';
      ctx.lineWidth = Math.max(2, k * 0.35);
      ctx.beginPath();
      ctx.arc(-k * 0.4, 0, k, -1.1, 1.1);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = Math.max(1, k * 0.15);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y - k * 1.3);
      ctx.quadraticCurveTo(x + k, y, x, y + k);
      ctx.quadraticCurveTo(x - k, y, x, y - k * 1.3);
      ctx.fillStyle = 'rgba(120,200,255,.9)';
      ctx.fill();
      ctx.strokeStyle = '#2f6fb0';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
  // ── 떨어져 나가는 옛 부위 ──
  for (const c of s.sheds) {
    const age = t - c.t, k = R(0.04) * [1, 1, 1.2, 1.4][c.g];
    if (age < 40) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (40 - age) / 12);
      ctx.translate(X(c.x + c.vx * age), Y(c.y + c.vy * age + 0.0004 * age * age));
      ctx.rotate(age * 0.25 * (c.vx > 0 ? 1 : -1));
      iconAt(ctx, c.p, 0, 0, k, R(ICON_L), sc2);
      ctx.restore();
    }
  }
  // ── 지나간 사건의 그림 ──
  for (const e of s.events) {
    const age = t - e.t, ex = X(e.x), ey = Y(e.y);
    if (e.k === 'thunder' && age < 20) {
      // 천둥 뿔: 화면을 위에서 아래로 가르는 벼락 여러 줄 + 번쩍
      const q = age / 20;
      ctx.fillStyle = `rgba(255,250,200,${0.45 * (1 - q) * (age < 3 ? 1 : 0.6)})`;
      ctx.fillRect(0, Y(0.1), w, Y(1.2));
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let b = 0; b < 6; b++) {
        if (age > 12 + b) continue;
        const bx = w * (0.08 + 0.17 * b + (hsh(e.t + b * 13) - 0.5) * 0.08), n = 9;
        ctx.beginPath();
        ctx.moveTo(bx, Y(0.1));
        for (let i = 1; i <= n; i++) ctx.lineTo(bx + (hsh(e.t * 7 + b * 31 + i * 3 + (age >> 2)) - 0.5) * R(0.12), Y(0.1) + (Y(1.2) * i) / n);
        ctx.strokeStyle = `rgba(255,214,60,${1 - q})`;
        ctx.lineWidth = R(0.032) * (1 - q * 0.6);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${1 - q})`;
        ctx.lineWidth = R(0.012);
        ctx.stroke();
      }
    }
    if (e.k === 'shed' && age < 24) {
      // 폭죽: 기운만큼 크게, 그 부위 빛깔로
      const q = age / 24, rr2 = R(e.x2) * Math.min(1, 0.3 + q * 1.6), col = PD[e.text as P].col;
      ctx.save();
      ctx.globalAlpha = 1 - q;
      ctx.strokeStyle = col;
      ctx.lineWidth = 3 + e.n * 0.6;
      ell(ctx, ex, ey, rr2, rr2);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ell(ctx, ex, ey, rr2 * 0.75, rr2 * 0.75);
      ctx.stroke();
      for (let i = 0; i < 8 + e.n; i++) {
        const a = (i / (8 + e.n)) * TAU + e.t, d2 = rr2 * (0.6 + 0.4 * hsh(i + e.t));
        ctx.fillStyle = i % 2 ? '#ffffff' : col;
        starPath(ctx, ex + Math.cos(a) * d2, ey + Math.sin(a) * d2, R(0.012 + 0.002 * e.n) * (1 - q * 0.5), 0.4);
        ctx.fill();
      }
      ctx.restore();
    } else if (e.k === 'slam' && age < 20) {
      const q = age / 20, rr2 = R(e.x2) * Math.min(1, 0.3 + q * 1.6);
      ell(ctx, ex, ey, rr2, rr2);
      ctx.fillStyle = `rgba(255,240,200,${0.45 * (1 - q)})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${1 - q})`;
      ctx.lineWidth = 8 * (1 - q) + 1;
      ctx.stroke();
      burstPath(ctx, ex, ey, R(0.05 + 0.06 * q), 9, 0.5, e.t);
      ctx.fillStyle = `rgba(255,250,210,${1 - q})`;
      ctx.fill();
    } else if ((e.k === 'bpop' || e.k === 'fling' || e.k === 'quake' || e.k === 'spikes') && age < 16) {
      const q = age / 16, rr2 = R(e.x2 || 0.12) * Math.min(1, 0.4 + q * 1.4);
      ell(ctx, ex, ey, rr2, rr2);
      ctx.strokeStyle = e.k === 'bpop' ? `rgba(255,255,255,${1 - q})` : e.k === 'fling' ? `rgba(127,240,200,${1 - q})` : `rgba(255,214,90,${1 - q})`;
      ctx.lineWidth = 4 * (1 - q) + 1;
      ctx.stroke();
    } else if (e.k === 'power' && age < 30) {
      const q = age / 30, rr2 = R(0.08 + 0.35 * q);
      ell(ctx, ex, ey, rr2, rr2);
      ctx.strokeStyle = `rgba(255,214,70,${1 - q})`;
      ctx.lineWidth = 10 * (1 - q) + 1;
      ctx.stroke();
    } else if (e.k === 'tap' && age < 12) {
      ell(ctx, ex, ey, R(0.02 + 0.05 * (age / 12)), R(0.02 + 0.05 * (age / 12)));
      ctx.strokeStyle = `rgba(255,255,255,${1 - age / 12})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
  // ── 숫자 하나: 이번 공격으로 한 번에 쓰러뜨린 수 (그 자리에서 커진다) ──
  {
    const killA = t - (fx.memo.chainT ?? -99), n = fx.memo.chainN ?? 0;
    if (n >= 2 && killA < 40 && s.phase === 'play') {
      const big = Math.min(1.6, 0.8 + n * 0.08), k = (killA < 6 ? 1.5 - 0.5 * (killA / 6) : 1) * big;
      ctx.globalAlpha = Math.min(1, (40 - killA) / 10);
      font(0.05, 900);
      textK(String(n), clamp(fx.memo.chainX, w * 0.1, w * 0.9), clamp(fx.memo.chainY - R(0.06), Y(0.2), Y(1.18)), k, n >= WOW_N ? '#ffd23f' : '#ffffff', OUT, 4);
      ctx.globalAlpha = 1;
    }
  }
  // ── 딱 맞아 이어 가기: 용 곁의 숫자 배지 ──
  if (s.combo >= 2 && s.phase === 'play') {
    const gr = t - (fx.memo.cbT ?? -99);
    if (fx.memo.cbN !== s.combo) (fx.memo.cbN = s.combo), (fx.memo.cbT = t);
    const k = gr < 8 ? 1 + 0.35 * (1 - gr / 8) : 1, rr0 = R(0.034 + Math.min(0.02, s.combo * 0.0006)) * k;
    const bx = X(me.x) - me.face * R(mr * DK * 1.5), by = Y(me.y) - R(mr * DK * 1.8);
    ell(ctx, bx, by, rr0, rr0);
    ctx.fillStyle = s.combo >= 8 ? ((t >> 3) % 2 ? '#ff5fa8' : '#ff8ac2') : '#ff8ac2';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    font(0.036, 900);
    text(String(s.combo), bx, by + 1, '#ffffff', OUT, 2.5);
  }

  // ── 가까운 구름 바다 · 구경꾼 ──
  {
    const st1 = strip(1, ch, Math.round(w), sc2), off = (t * 0.9) % w;
    for (const k of [0, 1]) ctx.drawImage(st1, -off + k * w, Y(1.16), w, R(0.32));
    const scared = t - me.hurtT < 30 && s.phase === 'play';
    [0.1, 0.3, 0.52, 0.72, 0.9].forEach((bx, i) => {
      const k = R(0.028), hop = cheer ? Math.abs(Math.sin(t * 0.3 + i * 1.7)) * R(0.03) : Math.max(0, Math.sin(t * 0.05 + i * 2.1) - 0.9) * R(0.08);
      const c = crowdKid(i + ch, cheer ? 1 : scared ? 2 : 0, k * sc);
      ctx.drawImage(c, X(bx) - k * 1.5, Y(1.255) - k * 1.9 - hop, k * 3, k * 3);
    });
  }

  // ── 방금 일어난 일: 소리 · 색종이 · 흔들림 · 글자 (한 번만) ──
  let marks = 0;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x), ey = Y(e.y), k = e.text as K;
    switch (e.k) {
      case 'tap': fx.sound('tick', 1.5, 0.5); break;
      case 'deny': fx.sound('tick', 0.7, 0.5); break;
      case 'go': fx.sound('whoosh', 1.35, 0.9); break;
      case 'gulp':
        fx.sound('pop', 0.55, 1.1);
        fx.sound('boing', 0.8, 0.7);
        fx.kick(3 + e.n);
        puff(X(mouth(s)[0]), Y(mouth(s)[1]), KD[k]?.col ?? '#ffffff', 8, 3, 3);
        break;
      case 'part': {
        const p = e.text as P, col = PD[p].col;
        fx.sound('swell', [1.3, 1.0, 0.8][e.x2], 0.9);
        fx.sound('chime', 1 + e.x2 * 0.1, 0.7);
        puff(ex, ey, col, 14, 4.5, 3.4);
        puff(ex, ey, '#ffffff', 6, 3, 2.6);
        fx.ring(ex, ey, col, R(0.12), 4);
        fx.blink(col, 0.12);
        break;
      }
      case 'grow': fx.sound('chime', 1.4, 0.8); fx.sound('ding', 1.2 + e.n * 0.1, 0.6); fx.ring(ex, ey, '#ffe36b', R(0.09), 4); puff(ex, ey, '#ffe36b', 10, 4, 3); break;
      case 'shed': {
        const c = e.n / 10, col = PD[e.text as P].col;
        fx.sound('pop', 1.4 - c * 0.7, 0.8 + c);
        fx.sound('crack', 1.6 - c * 0.6, 0.5 + c * 0.6);
        if (c >= 0.3) fx.sound('thud', 1.2 - c * 0.5, 0.6 + c), fx.kick(4 + c * 14), fx.blink(col, 0.1 + c * 0.2);
        puff(ex, ey, col, 8 + e.n * 2, 3 + c * 4, 3);
        puff(ex, ey, '#ffffff', 4 + e.n, 3, 2.4);
        fx.ring(ex, ey, col, R(e.x2), 3 + c * 5);
        break;
      }
      case 'popn': if (e.n >= 2) say(ex, ey - R(0.12), String(e.n), '#ff9ee0', 20 + Math.min(16, e.n * 2)); break;
      case 'power': fx.sound('thud', 0.5, 1.3); fx.sound('chime', 0.9, 1); fx.blink('#fff3a8', 0.45); fx.kick(12); puff(ex, ey, '#ffd84a', 20, 6, 3.6); break;
      case 'combo': fx.sound('chime', 1.5, 0.9); fx.ring(ex, ey, '#ff9ee0', R(0.14), 4); puff(ex, ey, '#ff9ee0', 10, 4, 3); break;
      case 'full': fx.sound('ding', 1.8, 0.5); puff(ex, ey, '#ff9ee0', 8, 2.5, 2.4); break;
      case 'fire': fx.sound('whoosh', 0.6 + 0.08 * (3 - e.n), 0.9 + e.n * 0.15); fx.sound('splash', 1.8, 0.35); fx.kick(1 + e.n); break;
      case 'ice': fx.sound('ding', 1.6, 0.6); fx.sound('crack', 1.9, 0.45); break;
      case 'zap': fx.sound('zap', 1 + Math.min(10, e.n) * 0.08, 0.7); puff(ex, ey, '#fff07a', 4, 3, 2.2); break;
      case 'blow': fx.sound('boing', 1.7, 0.6); break;
      case 'trap': fx.sound('boing', 1.2, 0.7); puff(ex, ey, '#ffffff', 6, 2.5, 2.6); break;
      case 'bpop': fx.sound('pop', 0.9, 1); puff(ex, ey, '#e8d0ff', 10, 4, 3); fx.kick(3); break;
      case 'thunder': fx.sound('zap', 0.6, 1.3); fx.sound('zap', 0.9, 1); fx.sound('thud', 0.4, 1.4); fx.blink('#fff7b0', 0.6); fx.kick(22); puff(w / 2, Y(0.6), '#fff07a', 24, 7, 3.4); break;
      case 'ram': fx.sound('whoosh', 0.8, 1); break;
      case 'bonk': fx.sound('thud', 1.0, 1); fx.sound('crack', 1.2, 0.6); fx.kick(6); puff(ex, ey, '#e8e0d0', 7, 4, 3); break;
      case 'quake': fx.sound('thud', 0.5, 1.3); fx.kick(10); break;
      case 'spikes': fx.sound('tick', 2.0, 0.6); fx.sound('crack', 1.7, 0.4); break;
      case 'prick': if (t - (fx.memo.prT ?? -99) > 8) (fx.memo.prT = t), fx.sound('tick', 1.8, 0.4); break;
      case 'gust': fx.sound('whoosh', 1.2, 0.8); break;
      case 'storm': fx.sound('whoosh', 0.55, 1.3); fx.sound('swell', 0.8, 0.8); fx.blink('#d8f0ff', 0.25); fx.kick(10); break;
      case 'blowaway': if (t - (fx.memo.bwT ?? -99) > 10) (fx.memo.bwT = t), fx.sound('tick', 2.2, 0.5), puff(ex, ey, '#ffffff', 4, 3, 2.2); break;
      case 'slam': fx.sound('thud', 0.7, 1.3); fx.sound('crack', 0.9, 0.8); fx.kick(8 + e.n * 2); puff(ex, ey, '#f3e6d0', 12, 5, 3); fx.ring(ex, ey, '#f3e6d0', R(0.1 + 0.03 * e.n), 4); break;
      case 'shatter': fx.sound('crack', 1.4, 0.8); puff(ex, ey, '#d8f4ff', 8, 4, 2.6); break;
      case 'twister': fx.sound('swell', 0.9, 0.9); fx.sound('whoosh', 1.4, 0.6); break;
      case 'caught': if (t - (fx.memo.caT ?? -99) > 6) (fx.memo.caT = t), fx.sound('tick', 1.4, 0.4); break;
      case 'fling': fx.sound('whoosh', 1.0, 1); fx.sound('pop', 1.2, 0.8); fx.kick(4 + e.n); puff(ex, ey, e.y2 ? '#ffb347' : '#a8ffe0', 10, 5, 3); break;
      case 'wave': fx.sound('splash', 0.6, 1.4); fx.kick(10); fx.blink('#bfe6ff', 0.25); break;
      case 'nibble': fx.sound('tick', 1.2, 0.5); break;
      case 'freeze': if (t - (fx.memo.frT ?? -99) > 6) (fx.memo.frT = t), fx.sound('ding', 1.9, 0.4); puff(ex, ey, '#d8f4ff', 4, 2.4, 2.4); break;
      case 'kill': {
        fx.sound('pop', 1 + Math.min(14, e.n) * 0.085, 0.75);
        puff(ex, ey, KD[k]?.col ?? '#ffffff', 7, 3.6, 3.4);
        puff(ex, ey, '#ffffff', 2, 2.4, 2.4);
        if (e.n >= 2) (fx.memo.chainT = e.t), (fx.memo.chainN = e.n), (fx.memo.chainX = ex), (fx.memo.chainY = ey), fx.kick(Math.min(9, 1.5 + e.n * 0.6));
        break;
      }
      case 'eaten': fx.sound('pop', 1.5, 0.4); break;
      case 'weak': if (t - (fx.memo.wkT ?? -99) > 4) (fx.memo.wkT = t), fx.sound('chime', 1.3, 0.6); break;
      case 'chain': fx.sound('ding', 1 + Math.min(12, e.n) * 0.07, 0.6); puff(ex, ey, '#ffb0e0', 5, 3.4, 2.6); break;
                  case 'cbreak': fx.sound('shrink', 1.2, 0.5); break;
            case 'ouch': fx.sound('thud', 1.8, 0.5); puff(ex, ey, '#ff8a7a', 4, 2.5, 2.2); fx.kick(3); break;
            case 'heart': fx.sound('fail', 0.8, 1); fx.blink('#ff3b30', 0.3); fx.kick(6); puff(ex, ey, '#ff4d5e', 10, 4, 3); break;
      case 'fail': fx.sound('fail', 1.0, 1); break;
      case 'shoot': fx.sound(k === 'owl' ? 'whoosh' : 'tick', k === 'squir' ? 1.1 : 1.7, 0.4); break;
      case 'shothit': fx.sound('thud', 1.6, 0.5); break;
      case 'wind': if (marks++ < 2) fx.sound('tick', 1.0, 0.3); break;
      case 'charge': fx.sound('whoosh', 0.9, 0.7); break;
      case 'sting': fx.sound('thud', 1.4, 0.6); puff(ex, ey, '#ffd0c8', 4, 2.5, 2.2); break;
      case 'king': fx.sound('swell', 0.6, 1); fx.sound('thud', 0.6, 0.8); fx.kick(6); break;
      case 'boss': fx.sound('thud', 0.45, 1.4); fx.sound('swell', 0.5, 1); fx.kick(12); break;
      case 'bosswind': fx.sound('swell', 0.7, 0.8); break;
      case 'swoop': fx.sound('whoosh', 0.6, 1.2); fx.kick(4); break;
      case 'flap': fx.sound('whoosh', 0.8, 0.9); break;
      case 'spout': fx.sound('splash', 1.2, 0.9); break;
      case 'splash': fx.sound('splash', 0.8, 1); break;
      case 'storm3': fx.sound('zap', 0.8, 0.8); break;
      case 'beam': fx.sound('zap', 0.5, 1.2); fx.sound('thud', 0.8, 0.8); fx.kick(8); break;
      case 'strike': fx.sound('zap', 0.7, 1); fx.sound('thud', 1.0, 0.7); fx.blink('#fff7b0', 0.15); puff(ex, ey, '#fff07a', 8, 4, 2.6); break;
      case 'drop': fx.sound('chime', 1.0, 1); fx.sound('ding', 1.4, 0.7); puff(ex, ey, '#fff3a8', 12, 3.5, 3); break;
      case 'fade': fx.sound('shrink', 1.3, 0.5); break;
      case 'summon': fx.sound('swell', 1, 0.8); fx.ring(ex, ey, '#ffd0c8', R(0.16), 4); break;
      case 'bossdown': fx.sound('crack', 0.6, 1.3); fx.sound('thud', 0.4, 1.5); fx.blink('#fff3c4', 0.6); fx.kick(18); puff(ex, ey, '#ffd84a', 24, 7, 4); puff(ex, ey, '#ffffff', 16, 6, 3.4); break;
      case 'wave_in':
      case 'flock': if (marks++ < 3) fx.sound('whoosh', 1.1, 0.4); break;
      case 'stage': fx.sound('ding', 1, 0.6); break;
      case 'star3': fx.sound('coin', 1.2, 1); puff(ex, ey, '#ffd84a', 14, 5.5, 3.2); fx.ring(ex, ey, '#ffd84a', R(0.2), 5); break;
      case 'clear':
        fx.sound('clear', 1, 1);
        puff(w * 0.3, Y(0.7), '#ffd84a', 16, 6, 3.2);
        puff(w * 0.7, Y(0.7), '#9ff0ff', 16, 6, 3.2);
        break;
      case 'pickopen': fx.sound('swell', 1.1, 0.9); break;
      case 'perk': fx.sound('coin', 1, 1); fx.sound('chime', 1.1, 0.9); puff(X(e.x), Y(e.y) - R(0.1), '#ffe36b', 16, 5, 3.2); break;
      case 'end': fx.sound(e.n ? 'clear' : 'fail', 0.9, 1); break;
      case 'miss': fx.sound('tick', 0.8, 0.4); break;
    }
  }
  if (s.big && (fx.memo.bigT ?? -1) !== s.big.t && s.big.t > seenT) (fx.memo.bigT = s.big.t), fx.sound('chime', 1 + Math.min(8, s.big.n) * 0.04, 1), fx.blink('#fff6c8', 0.22), fx.kick(7);
  fx.memo.t = t;
  ctx.restore();
  drawHud(ctx, s, w, h, boss);
}

/** 위·아래 띠와 띠 위에 뜨는 것(시작 띠 · 큰 순간 · 결과 · 둘 중 하나 · 실패 · 끝) */
/** 빈 자리 실루엣: 머리(뿔 달린 머리) · 등(지느러미) · 꼬리 */
function slotSil(ctx: C2, slot: number, k: number) {
  ctx.fillStyle = '#e6d6c4';
  ctx.strokeStyle = '#d0b89e';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (slot === 0) {
    ctx.moveTo(-k * 0.55, -k * 0.45);
    ctx.lineTo(-k * 0.35, -k * 1.05);
    ctx.lineTo(-k * 0.1, -k * 0.6);
    ctx.lineTo(k * 0.15, -k * 1.05);
    ctx.lineTo(k * 0.3, -k * 0.5);
    ctx.quadraticCurveTo(k * 1.15, -k * 0.35, k * 0.95, k * 0.35);
    ctx.quadraticCurveTo(k * 0.4, k * 0.85, -k * 0.5, k * 0.6);
    ctx.quadraticCurveTo(-k * 0.95, k * 0.1, -k * 0.55, -k * 0.45);
  } else if (slot === 1) {
    ctx.moveTo(-k, k * 0.55);
    ctx.lineTo(-k * 0.6, -k * 0.35);
    ctx.lineTo(-k * 0.3, k * 0.05);
    ctx.lineTo(0, -k * 0.8);
    ctx.lineTo(k * 0.3, k * 0.05);
    ctx.lineTo(k * 0.6, -k * 0.35);
    ctx.lineTo(k, k * 0.55);
    ctx.closePath();
  } else {
    ctx.moveTo(-k * 0.95, k * 0.15);
    ctx.quadraticCurveTo(-k * 0.2, k * 0.95, k * 0.45, k * 0.05);
    ctx.lineTo(k * 1.0, -k * 0.55);
    ctx.lineTo(k * 0.55, k * 0.45);
    ctx.quadraticCurveTo(-k * 0.2, k * 1.25, -k * 0.95, k * 0.55);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
}
function drawHud(ctx: C2, s: DrState, w: number, h: number, boss: Mon | undefined) {
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t, me = s.me;
  const sc = typeof ctx.getTransform === 'function' ? Math.min(3, Math.max(1, Math.round(ctx.getTransform().a || 1))) : 1, sc2 = Math.min(2, sc);
  const d = STAGES[s.stage];
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  const text = (str: string, x: number, y: number, fill: string, stroke = '', lw = 0) => {
    ctx.lineJoin = 'round';
    if (lw > 0) (ctx.lineWidth = lw), (ctx.strokeStyle = stroke), ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  };
  const INK = '#3b2a3f', MUTED = '#9a8a9e', CREAM = '#fff6e6', LINE = '#e8c8a8';
  ctx.textBaseline = 'middle';
  // ── 위 띠: 판 · 이름 · 하트 · 별 · 용 레벨 ──
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, w, Y(0.1));
  ctx.fillStyle = LINE;
  ctx.fillRect(0, Y(0.1) - 2, w, 2);
  ell(ctx, X(0.062), Y(0.05), R(0.036), R(0.036));
  ctx.fillStyle = '#ff8a3d';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  font(0.046, 900);
  text(String(s.stage + 1), X(0.062), Y(0.052), '#ffffff');
  ctx.textAlign = 'left';
  font(d.name.length > 6 ? 0.038 : 0.043, 900);
  text(d.name, X(0.115), Y(0.052), INK);
  const nw = ctx.measureText(d.name).width;
  font(0.034, 700);
  text(`/ ${STAGES.length}`, X(0.115) + nw + R(0.012), Y(0.054), MUTED);
  for (let i = 0; i < 3; i++) {
    heartPath(ctx, X(0.585 + i * 0.048), Y(0.05), R(0.016));
    ctx.fillStyle = i < s.hearts ? '#ff4d5e' : '#eadbcc';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  starPath(ctx, X(0.745), Y(0.049), R(0.021));
  ctx.fillStyle = '#ffc93c';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  font(0.038, 900);
  text(String(s.stars), X(0.772), Y(0.053), INK);
  ell(ctx, X(0.87), Y(0.05), R(0.02), R(0.019));
  ctx.fillStyle = BARE_TINT;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  font(0.034, 900);
  text(`Lv${s.lv}`, X(0.9), Y(0.053), '#d9480f');

  // ── 아래 띠: 별 셋 · 내 몸 세 자리 · 한 줄 도움말 ──
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, Y(1.3), w, h - Y(1.3));
  ctx.fillStyle = LINE;
  ctx.fillRect(0, Y(1.3), w, 2);
  const words = STAR_WORDS(s), res = s.phase === 'result', bestNow = starNow(s);
  const state = [res ? 1 : 0, s.lostHeart ? -1 : res ? 1 : 0, bestNow >= d.n ? 1 : res ? -1 : 0];
  font(0.033, 800);
  const prog = bestNow > 0 && bestNow < d.n && !res ? ` ${bestNow}/${d.n}` : '';
  const labels = words.map((q, i) => q + (i === 2 ? prog : ''));
  const gap = R(0.012), pad = Math.min(R(0.065), (w - R(0.03) - gap * 2 - labels.reduce((a, q) => a + ctx.measureText(q).width, 0)) / 3);
  const ws = labels.map((q) => ctx.measureText(q).width + pad), total = ws.reduce((a, c) => a + c, 0) + gap * 2;
  let cx = (w - total) / 2;
  labels.forEach((q, i) => {
    const cw = ws[i], cy = Y(1.338), on = state[i] > 0, off = state[i] < 0;
    rr(ctx, cx, cy - R(0.025), cw, R(0.05), R(0.025));
    ctx.fillStyle = on ? '#ffe9a0' : off ? '#efe4d6' : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = on ? '#e0a020' : off ? '#d8c8b8' : '#d8b898';
    ctx.lineWidth = on ? 2 : 1.4;
    ctx.stroke();
    starPath(ctx, cx + pad * 0.42, cy - 0.5, R(0.016));
    ctx.fillStyle = on ? '#ffb800' : off ? '#d8c8b8' : '#ecdcc0';
    ctx.fill();
    ctx.textAlign = 'left';
    font(0.033, 800);
    text(q, cx + pad * 0.76, cy + 0.5, off ? '#b8a898' : INK);
    if (off) (ctx.fillStyle = '#b8a898'), ctx.fillRect(cx + pad * 0.72, cy, cw - pad, 1.5);
    cx += cw + gap;
  });
  // 내 몸: 머리 · 등 · 꼬리 — 아이콘 셋 (비면 빈 실루엣)
  for (let i = 0; i < 3; i++) {
    const pt = me.parts[i], cx2 = X(0.5 + (i - 1) * 0.2), cy2 = Y(s.stage === 0 ? 1.405 : 1.418), k = R(0.043), born = pt ? t - pt.born : 99;
    const popK = born < 12 ? 1 + Math.sin((born / 12) * Math.PI) * 0.3 : 1;
    ctx.save();
    ctx.translate(cx2, cy2);
    ctx.scale(popK, popK);
    ell(ctx, 0, 0, k, k);
    ctx.fillStyle = pt ? mix(PD[pt.p].col, '#ffffff', 0.72) : 'rgba(255,255,255,.5)';
    ctx.fill();
    if (pt) {
      ctx.strokeStyle = SLOT_COL[i];
      ctx.lineWidth = 3;
      ctx.stroke();
      // 기운: 둘레를 도는 고리
      const q = clamp(pt.ch, 0, 1);
      if (q > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, k + 3.5, -Math.PI / 2, -Math.PI / 2 + q * TAU);
        ctx.strokeStyle = q >= 1 ? ((t >> 3) % 2 ? '#ffd23f' : '#ff8a3d') : PD[pt.p].col;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      iconAt(ctx, pt.p, 0, 0, k * 0.62 * [1, 1, 1.12, 1.25][pt.g], R(ICON_S), sc2);
      // 단계: 작은 별
      for (let g = 1; g < pt.g; g++) {
        starPath(ctx, (g - (pt.g) / 2) * R(0.022), k * 0.95, R(0.011));
        ctx.fillStyle = '#ffc93c';
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    } else {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#d8c0a8';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      slotSil(ctx, i, k * 0.62);
    }
    ctx.restore();
  }
  ctx.textAlign = 'center';
  if (s.stage === 0 && s.phase === 'play') {
    const tip = !s.started ? '박쥐 떼를 톡! 꿀꺽 먹으면 불을 뿜어요' : me.parts.every((q) => !q) ? '아무 떼나 톡 — 먹으면 몸이 바뀌어요' : '다른 떼를 먹으면 또 바뀌어요';
    font(0.033, 800);
    text(tip, w / 2, Y(1.472), INK);
  }

  // ── 대장 체력 띠 ──
  if (boss && s.phase === 'play') {
    const bx = X(0.2), bw = R(0.6), by = Y(0.115), bh = R(0.028), q = clamp(boss.hp / boss.max, 0, 1);
    rr(ctx, bx - 2, by - 2, bw + 4, bh + 4, bh);
    ctx.fillStyle = INK;
    ctx.fill();
    rr(ctx, bx, by, bw, bh, bh);
    ctx.fillStyle = '#6b5370';
    ctx.fill();
    if (q > 0) {
      rr(ctx, bx, by, Math.max(bh, bw * q), bh, bh);
      ctx.fillStyle = lin(ctx, 0, by, 0, by + bh, [0, '#ff9a8a'], [1, '#e0483a']);
      ctx.fill();
    }
    font(0.03, 900);
    if (!(s.big && t - s.big.t < 62)) text(KD[boss.k].name, w / 2, by + bh / 2 + 0.5, '#ffffff', INK, 3);
  }
  // ── 판 시작 띠 (NEW 한 줄) ──
  if (s.banner && s.phase === 'play' && !(s.big && s.big.t >= s.banner.t)) {
    const age = t - s.banner.t, T = 200;
    if (age < T) {
      const a = Math.min(1, age / 10, (T - age) / 14), slide = (1 - Math.min(1, age / 10)) * R(0.05), by = Y(boss ? 0.16 : 0.125) - slide;
      ctx.globalAlpha = clamp(a, 0, 1);
      rr(ctx, X(0.04), by, R(0.92), R(0.108), R(0.03));
      ctx.fillStyle = 'rgba(255,250,240,.96)';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      font(0.037, 900);
      const nm = KD[d.key].name, hw = ctx.measureText(s.banner.head).width, nw2 = ctx.measureText(nm).width, pill = R(0.1), gap2 = R(0.012), tot = hw + gap2 + pill + gap2 + nw2;
      let bx0 = w / 2 - tot / 2;
      ctx.textAlign = 'left';
      text(s.banner.head, bx0, by + R(0.032), '#d9480f');
      bx0 += hw + gap2;
      rr(ctx, bx0, by + R(0.012), pill, R(0.04), R(0.02));
      ctx.fillStyle = '#ff3b30';
      ctx.fill();
      font(0.032, 900);
      ctx.textAlign = 'center';
      text(KD[d.key].boss ? '대장' : 'NEW', bx0 + pill / 2, by + R(0.033), '#ffffff');
      ctx.textAlign = 'left';
      font(0.037, 900);
      text(nm, bx0 + pill + gap2, by + R(0.032), INK);
      ctx.textAlign = 'center';
      font(0.033, 800);
      text(s.banner.sub, w / 2, by + R(0.079), INK);
      ctx.globalAlpha = 1;
    }
  }
  // ── 스포트라이트: 새 짐승 · 왕 · 대장이 흘린 것 (글자 없이 점선 고리만) ──
  if (s.spot && s.phase === 'play' && s.started) {
    const sp = s.spot, m = sp.id > 0 ? s.mons.find((o) => o.id === sp.id && !o.dead && o.st !== HELD) : undefined, it = sp.id < 0 ? s.items.find((o) => o.id === -sp.id) : undefined;
    const tx = m ? m.x : it ? it.x : -1, ty = m ? m.y : it ? it.y : -1, tr = m ? m.r : 0.05;
    if (tx >= 0 && t - sp.t < 240) {
      const pul = 0.5 + 0.5 * Math.sin(t * 0.2), u = R(tr);
      ell(ctx, X(tx), Y(ty), u * (1.9 + 0.2 * pul), u * (1.9 + 0.2 * pul));
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -t * 0.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // ── 대장이 흘린 것: 늘 반짝이는 고리 ──
  if (s.phase === 'play')
    for (const it of s.items) {
      const pul = 0.5 + 0.5 * Math.sin(t * 0.25), u = R(0.07 + 0.012 * pul);
      ell(ctx, X(it.x), Y(it.y), u, u);
      ctx.strokeStyle = it.t > ITEM_T - 90 && (t >> 2) % 2 ? '#ffffff' : '#ffd23f';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -t * 0.8;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  // ── 손가락 (첫 톡) ──
  if (s.phase === 'play' && s.stage === 0 && !s.started) {
    const hm = s.mons.find((m) => !m.dead && hittable(m));
    if (hm) {
      const press = Math.max(0, Math.sin(t * 0.14)), hx = X(hm.x) + R(0.03), hy = Y(hm.y) + R(0.02);
      ell(ctx, X(hm.x), Y(hm.y), R(0.12 + 0.02 * press), R(0.12 + 0.02 * press));
      ctx.strokeStyle = `rgba(255,255,255,${0.9 - 0.5 * press})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      drawHand(ctx, hx, hy, R(0.085), press);
      font(0.046, 900);
      text('톡!', hx + R(0.085), hy - R(0.02), '#ffffff', INK, 4);
    }
  }
  // ── 가운데 이름표 카드 (새 부위 · 별 셋째 · 대장 순간, 0.9초) ──
  if (s.big && t - s.big.t < CARD_T && s.phase === 'play') {
    const b = s.big, age = t - b.t, pop = age < 5 ? 0.7 + 0.45 * (age / 5) : age < 9 ? 1.15 - 0.15 * ((age - 5) / 4) : 1, a = Math.min(1, (CARD_T - age) / 8);
    const cw = R(0.78), ch = R(0.19), cy = Y(0.34);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, cy);
    ctx.scale(pop, pop);
    ctx.rotate(-0.025);
    // 그림자 · 카드
    rr(ctx, -cw / 2 + 3, -ch / 2 + 5, cw, ch, R(0.04));
    ctx.fillStyle = 'rgba(59,42,63,.22)';
    ctx.fill();
    rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.04));
    ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [0, '#ffffff'], [1, '#fff4d6']);
    ctx.fill();
    ctx.strokeStyle = b.col;
    ctx.lineWidth = 5;
    ctx.stroke();
    // 왼쪽: 큰 그림 (부위 · 별)
    const ix = -cw / 2 + R(0.115), ir = R(0.075);
    ell(ctx, ix, 0, ir, ir);
    ctx.fillStyle = mix(b.col, '#ffffff', 0.55);
    ctx.fill();
    ctx.strokeStyle = b.col;
    ctx.lineWidth = 3;
    ctx.stroke();
    if (b.star || !b.p) {
      starPath(ctx, ix, R(0.004), ir * 0.78);
      ctx.fillStyle = '#ffc93c';
      ctx.fill();
      ctx.strokeStyle = '#a06a12';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else iconAt(ctx, b.p, ix, 0, ir * 0.62 * (1 + 0.06 * Math.sin(age * 0.5)), R(ICON_L), sc2);
    // 오른쪽: 이름 (굵게) · 한 줄
    ctx.textAlign = 'left';
    const tx = ix + ir + R(0.035), maxW = cw / 2 - tx - R(0.03);
    font(0.062, 900);
    const nw = ctx.measureText(b.text).width;
    if (nw > maxW) font(0.062 * (maxW / nw), 900);
    text(b.text, tx, -R(0.03), mix(b.col, INK, 0.55), '#ffffff', 0);
    font(0.034, 800);
    const sw = ctx.measureText(b.sub).width;
    if (sw > maxW) font(0.034 * (maxW / sw), 800);
    text(b.sub, tx, R(0.042), INK);
    ctx.textAlign = 'center';
    ctx.restore();
  }

  // ── 결과 ──
  if (s.phase === 'result') {
    const pt = s.pt, a = Math.min(1, pt / 10), slide = (1 - a) * R(0.06);
    const cx0 = X(0.05), cy0 = Y(0.15) - slide, cw = R(0.9), chh = R(0.66);
    ctx.globalAlpha = a;
    rr(ctx, cx0, cy0 + 4, cw, chh, R(0.04));
    ctx.fillStyle = 'rgba(59,42,63,.25)';
    ctx.fill();
    rr(ctx, cx0, cy0, cw, chh, R(0.04));
    ctx.fillStyle = '#fffaf2';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    rr(ctx, X(0.2), cy0 - R(0.012), R(0.6), R(0.068), R(0.02));
    ctx.fillStyle = '#ff8a3d';
    ctx.fill();
    ctx.stroke();
    font(0.044, 900);
    text(s.won ? '모든 하늘을 날았다!' : `${s.stage + 1}판 깼다!`, w / 2, cy0 + R(0.023), '#ffffff');
    // 첫 몇 프레임에 나눠 그린다 (첫 프레임이 튀지 않게): 0 틀 · 1 별 · 2 점수 · 3 도감 · 4 아래 줄
    for (let i = 0; i < 3 && pt >= 1; i++) {
      const at = 12 + i * 12, sx0 = X(0.23 + i * 0.27), sy0 = cy0 + R(0.12), on = s.starOk[i] && pt >= at, k = on ? 1 + Math.max(0, 1 - (pt - at) / 8) * 0.6 : 1;
      starPath(ctx, sx0, sy0, R(0.05) * k);
      ctx.fillStyle = on ? '#ffc93c' : '#eadfc8';
      ctx.fill();
      ctx.strokeStyle = on ? '#a06a12' : '#cdbd9c';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (on && (juice(s).memo['st' + i] ?? -1) !== s.stage) (juice(s).memo['st' + i] = s.stage), juice(s).sound('ding', 1 + i * 0.18, 0.9), juice(s).burst(sx0, sy0, '#ffd84a', 10, 3, 2.4);
      font(0.032, 800);
      text(STAR_WORDS(s)[i], sx0, sy0 + R(0.072), s.starOk[i] ? INK : '#b8a688');
    }
    if (pt >= 2) {
    rr(ctx, X(0.1), cy0 + R(0.225), R(0.8), R(0.056), R(0.02));
    ctx.fillStyle = '#fff0cc';
    ctx.fill();
    font(0.042, 900);
    text(`+${fmt(s.gain)}점`, X(0.32), cy0 + R(0.254), '#d9480f');
    font(0.03, 800);
    text(`별 ${s.got}개 ×${STAR_MUL[s.got]}${s.fast > 0 ? ` · 빨리 지남 +${s.fast}` : ''}`, X(0.66), cy0 + R(0.255), INK);
    // 용 레벨
    ell(ctx, X(0.12), cy0 + R(0.322), R(0.022), R(0.02));
    ctx.fillStyle = BARE_TINT;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = 'left';
    font(0.035, 900);
    const lvs = `아기 용 Lv${s.lv - 1} → Lv${s.lv}`;
    text(lvs, X(0.16), cy0 + R(0.324), '#d9480f');
    const lw0 = ctx.measureText(lvs).width;
    font(0.03, 700);
    text(LV_GIFT[s.lv] ?? '몸이 조금 커지고 힘이 세져요', X(0.16) + lw0 + R(0.018), cy0 + R(0.326), LV_GIFT[s.lv] ? '#d9480f' : INK);
    }
    // 도감: 돋아 본 부위 (다음 판에 돋을 것은 점선)
    if (pt >= 3) {
    const nx: StageDef | undefined = STAGES[s.stage + 1];
    font(0.031, 800);
    text(`도감 ${s.dex.length}/${DEXP.length} · 조합 ${s.combos.length}/${COMBOS.length} · 모습 ${s.forms.length}가지`, X(0.09), cy0 + R(0.382), MUTED);
    if (s.newDex.length || s.newCombo.length) {
      ctx.textAlign = 'right';
      text(s.newCombo.length ? `새 조합! ${s.newCombo[s.newCombo.length - 1]}` : `새 부위! ${PD[s.newDex[s.newDex.length - 1]].name}`, X(0.91), cy0 + R(0.382), '#d9480f');
    }
    ctx.textAlign = 'center';
    const nextP = nx ? (KD[nx.key].boss ? KD[nx.key].p : KD[nx.key].p) : null;
    DEXP.forEach((p, i) => {
      const has2 = s.dex.includes(p), isNew = s.newDex.includes(p), col = i % 6, row = Math.floor(i / 6), px = X(0.14 + col * 0.144), py = cy0 + R(0.445 + row * 0.085) - (isNew ? Math.abs(Math.sin(t * 0.18 + i)) * R(0.008) : 0), k = R(0.022);
      ell(ctx, px, py, k * 1.55, k * 1.55);
      ctx.fillStyle = isNew ? '#ffe9a0' : has2 ? '#ffffff' : '#f1e8dc';
      ctx.fill();
      ctx.strokeStyle = isNew ? '#e0a020' : has2 ? SLOT_COL[PD[p].slot] : '#e0d0c0';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      const next = !has2 && p === nextP;
      if (next) {
        ell(ctx, px, py, k * 1.75, k * 1.75);
        ctx.strokeStyle = '#ff8a3d';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 3]);
        ctx.lineDashOffset = -t * 0.3;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      iconAt(ctx, p, px, py, k, R(ICON_S), sc2, !has2);
      if (next) (font(0.036, 900), text('?', px, py, '#ff8a3d', '#ffffff', 3));
    });
    }
    font(0.035, 900);
    if (pt < 4) void 0;
    else if (pt >= RES_MIN) text(s.won ? '톡!' : KD[d.key].boss && d.ch < PERKS.length ? '톡 하면 장 끝 선물!' : '톡 하면 다음 판', w / 2, cy0 + chh - R(0.03), (t >> 3) % 2 ? '#d9480f' : '#ff8a3d');
    else if (nx) text(KD[d.key].boss ? `다음 하늘: ${CHAPTERS[nx.ch]}` : `다음 판: ${KD[nx.key].name}`, w / 2, cy0 + chh - R(0.03), MUTED);
    ctx.globalAlpha = 1;
  }
  // ── 장 끝: 둘 중 하나 ──
  if (s.phase === 'pick') {
    const pt = s.pt, picked = s.picked, opts = PERKS[d.ch];
    rr(ctx, X(0.07), Y(0.135), R(0.86), R(0.105), R(0.03));
    ctx.fillStyle = 'rgba(255,250,240,.96)';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    font(0.04, 900);
    text(`${CHAPTERS[d.ch]} 끝! 선물 하나`, w / 2, Y(0.166), '#d9480f');
    font(0.033, 800);
    text(picked < 0 ? '하늘에 뜬 큰 물건 둘 중 하나를 톡!' : `${opts[picked].name}: ${opts[picked].line}`, w / 2, Y(0.21), INK);
    opts.forEach((o, i) => {
      if (pt < 1 + i && picked < 0) return;
      const px = X(i ? 0.72 : 0.28), drop = picked < 0 ? Math.max(0, 1 - pt / 16) : 0, py = Y(0.88) - drop * drop * R(0.5);
      const chosen = picked === i, other = picked >= 0 && !chosen, k = R(0.15) * (chosen ? 1 + 0.15 * Math.sin(Math.min(1, pt / 12) * Math.PI) : 1);
      ctx.globalAlpha = other ? Math.max(0, 1 - pt / 20) : 1;
      if (picked < 0 && pt >= PICK_MIN) {
        ell(ctx, px, Y(0.9), R(0.17 + 0.012 * Math.sin(t * 0.2)), R(0.05));
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.setLineDash([7, 6]);
        ctx.lineDashOffset = -t * 0.5;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      drawPerk(ctx, d.ch, i, px, py, k, t);
      rr(ctx, px - R(0.205), Y(0.96), R(0.41), R(0.1), R(0.025));
      ctx.fillStyle = chosen ? '#ffe9a0' : 'rgba(255,250,240,.96)';
      ctx.fill();
      ctx.strokeStyle = chosen ? '#e0a020' : INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      font(0.038, 900);
      text(o.name, px, Y(0.993), '#d9480f');
      font(0.031, 800);
      text(o.line, px, Y(1.035), INK);
      ctx.globalAlpha = 1;
    });
  }
  // ── 실패: 그 판만 다시 ──
  if (s.phase === 'fail') {
    const a = Math.min(1, s.pt / 12);
    ctx.globalAlpha = a;
    rr(ctx, X(0.1), Y(0.42), R(0.8), R(0.36), R(0.04));
    ctx.fillStyle = '#fffaf2';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    drawDragon(ctx, w / 2, Y(0.55) + Math.sin(t * 0.1) * R(0.008), R(0.05), 1, BARE_TINT, [null, null, null], { t, lv: s.lv, mood: D_HURT, tail: Math.sin(t * 0.2) * 0.4, flap: t * 0.3, pin: 0, glow: [0, 0, 0], crack: [0, 0, 0], born: [-99, -99, -99] });
    font(0.046, 900);
    text('으앗! 하트를 다 잃었어요', w / 2, Y(0.66), '#d9480f');
    font(0.034, 800);
    text(s.pt >= FAIL_MIN ? '톡 하면 이 판만 다시!' : '이 판만 다시 해요', w / 2, Y(0.72), s.pt >= FAIL_MIN && (t >> 3) % 2 ? '#ff8a3d' : INK);
    ctx.globalAlpha = 1;
  }
  // ── 끝 ──
  if (s.phase === 'end') {
    const a = Math.min(1, s.pt / 14);
    ctx.globalAlpha = a;
    rr(ctx, X(0.08), Y(0.36), R(0.84), R(0.56), R(0.04));
    ctx.fillStyle = '#fffaf2';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    drawDragon(ctx, w / 2, Y(0.52), R(0.07), 1, me.tint, me.parts, { t, lv: s.lv, mood: D_PROUD, tail: Math.sin(t * 0.1) * 0.2, flap: t * 0.25, pin: t * 0.4, glow: [0, 0, 0], crack: [0, 0, 0], born: [-99, -99, -99] });
    font(0.05, 900);
    text(s.won ? '하늘 셋을 모두 날았다!' : '아기 용이 지쳤어요…', w / 2, Y(0.665), '#d9480f');
    font(0.036, 800);
    text(`${s.won ? STAGES.length : s.stage + 1}판 · 별 ${s.stars}/${STAGES.length * 3} · 도감 ${s.dex.length}/${DEXP.length} · 조합 ${s.combos.length}`, w / 2, Y(0.725), INK);
    font(0.058, 900);
    text(`${fmt(s.pts + s.sp)}점`, w / 2, Y(0.8), INK);
    font(0.032, 700);
    text(s.won ? `용 Lv${s.lv} — ${formName(s)}` : '다시 하면 더 멀리 갈 수 있어요', w / 2, Y(0.87), MUTED);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'center';
}
/** 스크린샷·모음 그림용 (게임에서는 쓰지 않는다) */
export const __art = { sprite, stamp, drawDragon, drawIcon, drawPerk };
