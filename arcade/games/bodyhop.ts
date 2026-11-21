/**
 * 👻 몸 갈아타기 (40라운드: 생각 부담 없는 실시간 전투) — 몸 갈아타기 × 연쇄 × 도감.
 * 규칙 한 줄: 톡 한 적의 몸으로 옮겨 탄다 — 가장 센 적이 곧 내 몸이고, 버린 몸은 펑 터진다. 나는 싸울 줄 모르는 꼬마 유령.
 * 조작은 톡 하나: 톡한 곳에서 가장 가까운 적으로 유령이 '슝' 날아가 쏙(큰 몸일수록 잘 잡힌다 — 늘 누군가는 잡힌다). 싸움은 탄 몸이 저절로 한다.
 *   옮겨 타는 순간 ① 버린 몸이 펑(둘레의 적이 함께 터짐) ② 새 몸은 체력 가득·잠깐 무적·등장 기술 한 방.
 *   유령 기운 고리가 다 차야(약 1초) 다시 갈아탄다 — 연타는 소용없다. 정답 있는 판·수 제한·되돌리기·힌트 없음: 어떻게 타도 판은 깨진다.
 * 뒤집힘: 센 적이 나올수록 반갑다(다음에 탈 몸). 적은 '쓰러뜨릴 것'이 아니라 '탈 것'이고, 가장 쉬운 처치는 타고 나서 버리는 것.
 * 타고 있는 동안이 구경거리: 몸마다 저절로 하는 짓이 다르다 — 곰은 느리지만 주먹 한 방이 크고, 고슴도치는 멈추지 않고 데굴데굴 핀볼처럼 튕기고,
 *   개구리는 2초마다 혀로 하나씩 끌어와 꿀꺽, 염소는 마당을 가로질러 왔다 갔다 박고, 거북은 등껍질로 빙글빙글 튕겨 내고, 구름은 찌릿찌릿,
 *   버섯은 포자를 퐁퐁, 너구리는 분신과 나뭇잎을 던진다(이렇게 쓰러뜨린 적은 '한 번에' 수에 들지 않는다).
 * 0.5초짜리 판단 셋: 누가 세 보이나(큰 놈) · 지금 버리면 몇 마리가 터지나(내 몸 둘레의 펑 범위 고리 — 안에 든 적이 반짝이고, 많이 들수록
 *   고리가 굵고 밝아지며 다섯부터 두근두근. 한 몸에 오래 버틸수록 적이 멀리서도 먼지를 일으키며 몰려온다: 내 몸 위에 '!' 한 번)
 *   · 지금 몸이 위험한가(체력 띠가 빨갛게 깜박 — 쓰러지면 펑도 못 하고 유령이 튀어나온다). 갈아타면 멀리 있던 적은 나를 놓친다(?).
 * 몸이 쓰러지면 유령이 튀어나와 4초 떠다닌다(그동안 세상이 살짝 느려지고 탈 수 있는 적에 손가락) — 아무 적이나 톡 하면 복귀.
 *   4초가 지나면 하트 -1 뒤 가장 가까운 적에게 저절로 들어간다(막힘 없음). 판 시작엔 유령이 등불 위에 안전하게 앉아 있다
 *   (첫 톡 전에는 적들끼리 투닥거릴 뿐 아무도 다치지 않는다). 1판은 하트를 잃지 않는다.
 * 판 12개(장 3 × 4판, 장 끝은 대장): 1 돌주먹 곰 → 2 가시 고슴도치 → 3 긴 혀 개구리 → 4 대장 멧돼지 → 5 폭탄 두더지(타자마자 대폭발, 유령은 튀어나옴)
 *   → 6 박치기 염소 → 7 방패 거북 → 8 대장 집게 → 9 번개 구름(연쇄 번개) → 10 포자 버섯(묻은 적은 터질 때 옆도 터뜨림) → 11 분신 너구리(펑이 세 번) → 12 대장 천둥 용.
 *   한 판은 사람 기준 30~45초: 첫 떼는 마당에 서 있고, 뒤 물결은 마당이 비는 대로 쉴 틈 없이 문에서 우르르 뛰어 들어온다.
 * 대장(순수한 보상): 왕관 보호막 때문에 못 탄다 → 졸개 몸의 펑·기술로 보호막을 깨면 그 뒤로는 언제 타도 온 마당을 쓰는 큰 기술(때 맞추기 없음).
 *   대장 판의 별 셋째는 '보호막을 깨는 동안 한 번에 N마리'(대장을 타는 순간과 무관).
 * 성장: 판을 깨면 유령 레벨 +1(펑 크기·기술 세기·유령 모습: 목도리 → 고깔 → 망토 → 왕관) · 장 끝에 마당의 큰 물건 둘 중 하나를 톡
 *   (쌍둥이 북 / 얼음 종 · 큰 자석 / 번개 깃발) · 도감 = 타 본 몸 13가지.
 * 별(쉬운 말 셋): 마당 비우기 · 몸 안 쓰러지기 · 한 번에 N마리. 점수(판당 수백~수천): 한 번에 n번째로 터진 적은 ⌈n²/4⌉점, 판 점수는 별 수로 곱해진다(×1·×2·×4).
 * 큰 띠('N마리 한 방!')는 그 판의 최고 기록을 넘을 때·별 셋째를 딸 때·대장 보호막/타기에만 — 나머지는 펑 자리에 작은 숫자. 큰 글자는 한 번에 하나.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5, TAU = Math.PI * 2;
/** 씨름 마당: 화면 좌표(가로 폭 = 1). 세로는 YS배로 눌린 3/4 시점 — 거리 계산은 늘 dist()로 */
const CX = 0.5, CY = 0.805, AR = 0.452, YS = 0.84;
/** 유령이 판 시작에 앉아 있는 등불 */
const HOME_X = 0.5, HOME_Y = 0.345;
/** 한 화면의 적 상한(내 몸까지 24) · 유령 기운이 차는 틱 · 날아가는 틱 · 새 몸 무적 · 쓰러진 뒤 어질 · 몸 밖에서 버티는 틱(4초) */
const CAP = 23, CHARGE_T = 62, FLY_T = 9, INV_T = 50, DIZZY_T = 30, OUT_T = 240;
/** 문(울타리 가운데): 새 떼가 우르르 들어오는 곳 · 한 마리씩 들어오는 간격(틱) · 유령이 떠다니는 동안 세상이 흐르는 빠르기 */
const GATE_X = 0.5, GATE_Y = 0.395, GATE_EVERY = 8, FLOAT_SLOW = 0.55;
/** 결과 화면: 톡 받기 시작 · 저절로 넘어감 / 둘 중 하나: 톡 받기 시작 · 저절로 고름 · 고른 뒤 */
const RES_MIN = 90, RES_AUTO = 420, PICK_MIN = 40, PICK_AUTO = 900, PICK_AFTER = 64, END_T = 210;
/** 점수(판당 수백~수천): 한 번에 n번째로 터진 적은 ⌈n²/4⌉점, 저절로 쓰러뜨린 적은 1점 · 판 점수는 별 수만큼 곱해진다(별 하나 ×1 · 둘 ×2 · 셋 ×4) */
const WOW_N = 4, CLEAR_PTS = 20, STAR_MUL = [1, 1, 2, 4], WIN_PTS = 100;
/** 내 몸 둘레 이만큼 안의 적이 화를 내고 덤빈다 — 한 몸에 오래 있을수록(AGGRO_WAIT틱 뒤부터 틱마다 AGGRO_UP) 멀리서도 몰려온다. 갈아타면 멀리 있던 적은 나를 놓친다 */
const AGGRO_R = 0.17, AGGRO_WAIT = 45, AGGRO_UP = 0.003, AGGRO_MAX = 0.8, MAD_SPD = 1.2;

type K = 'bean' | 'bear' | 'hedge' | 'frog' | 'mole' | 'goat' | 'turtle' | 'cloud' | 'shroom' | 'tanuki' | 'boar' | 'crab' | 'dragon';
/** 적일 때 공격 — 모양: 0 제자리 원 · 1 겨눈 곳 원 · 2 줄 돌진 · 3 줄(혀·숨결, 제자리) */
interface FoeAtk { shape: 0 | 1 | 2 | 3; range: number; r: number; len: number; wind: number; rest: number; dmg: number }
/** 내 몸일 때 자동 공격 */
interface MyAtk { range: number; r: number; per: number; dmg: number }
interface KDef { name: string; skill: string; line: string; r: number; hp: number; spd: number; foe: FoeAtk; me: MyAtk; pop: number; boss?: boolean }
const F = (shape: 0 | 1 | 2 | 3, range: number, r: number, len: number, wind: number, rest: number, dmg: number): FoeAtk => ({ shape, range, r, len, wind, rest, dmg });
const M = (range: number, r: number, per: number, dmg: number): MyAtk => ({ range, r, per, dmg });
export const KD: Record<K, KDef> = {
  bean: { name: '콩알이', skill: '콩!', line: '작고 약해요. 급할 때만 타요', r: 0.034, hp: 12, spd: 0.003, foe: F(1, 0.075, 0.05, 0, 22, 62, 3), me: M(0.07, 0.045, 40, 7), pop: 0.1 },
  bear: { name: '돌주먹 곰', skill: '쿵!', line: '타면 쿵! 느리지만 주먹 한 방이 커요', r: 0.066, hp: 64, spd: 0.0021, foe: F(0, 0.115, 0.15, 0, 54, 90, 15), me: M(0.1, 0.07, 50, 10), pop: 0.17 },
  hedge: { name: '가시 고슴도치', skill: '데굴데굴!', line: '타면 데굴데굴! 핀볼처럼 통통 튕겨요', r: 0.046, hp: 38, spd: 0.0034, foe: F(2, 0.34, 0.05, 0.5, 40, 84, 9), me: M(0.08, 0.045, 32, 7), pop: 0.145 },
  frog: { name: '긴 혀 개구리', skill: '쭈욱!', line: '타면 쭈욱 끌어모으고 하나씩 꿀꺽', r: 0.05, hp: 34, spd: 0.0026, foe: F(3, 0.36, 0.04, 0.42, 36, 92, 6), me: M(0.28, 0.04, 46, 8), pop: 0.15 },
  mole: { name: '폭탄 두더지', skill: '대폭발!', line: '타자마자 대폭발! 유령은 튀어나와요', r: 0.043, hp: 26, spd: 0.004, foe: F(0, 0.08, 0.16, 0, 56, 0, 24), me: M(0.07, 0.045, 40, 7), pop: 0.14 },
  goat: { name: '박치기 염소', skill: '돌진!', line: '타면 왔다 갔다 쿵! 적이 도미노처럼', r: 0.052, hp: 48, spd: 0.0028, foe: F(2, 0.5, 0.06, 0.75, 48, 100, 14), me: M(0.09, 0.05, 44, 10), pop: 0.15 },
  turtle: { name: '방패 거북', skill: '빙글빙글!', line: '튼튼해요. 빙글빙글 모았다가 통통 튕겨 내요', r: 0.064, hp: 130, spd: 0.0014, foe: F(0, 0.1, 0.11, 0, 40, 84, 7), me: M(0.09, 0.07, 52, 8), pop: 0.2 },
  cloud: { name: '번개 구름', skill: '찌릿찌릿!', line: '타면 번개가 적에서 적으로 줄줄이', r: 0.052, hp: 32, spd: 0.0024, foe: F(1, 0.4, 0.075, 0, 46, 84, 9), me: M(0.3, 0.04, 38, 8), pop: 0.145 },
  shroom: { name: '포자 버섯', skill: '포자 퐁!', line: '포자 묻은 적은 터질 때 옆도 터뜨려요', r: 0.048, hp: 42, spd: 0.0018, foe: F(0, 0.1, 0.14, 0, 50, 100, 7), me: M(0.09, 0.06, 50, 8), pop: 0.15 },
  tanuki: { name: '분신 너구리', skill: '분신 뿅!', line: '분신 둘이 생겨 펑이 세 번 터져요', r: 0.05, hp: 42, spd: 0.003, foe: F(1, 0.09, 0.06, 0, 30, 72, 8), me: M(0.08, 0.045, 38, 8), pop: 0.145 },
  boar: { name: '대장 멧돼지', skill: '대지진!', line: '왕관 보호막을 깨면 탈 수 있어요', r: 0.1, hp: 150, spd: 0.0022, foe: F(2, 0.55, 0.1, 0.7, 60, 120, 20), me: M(0.14, 0.2, 34, 40), pop: 0.4, boss: true },
  crab: { name: '대장 집게', skill: '집게 쾅쾅!', line: '두 집게로 쿵쿵. 보호막을 깨고 타요', r: 0.105, hp: 180, spd: 0.002, foe: F(1, 0.34, 0.13, 0, 54, 110, 20), me: M(0.14, 0.2, 34, 44), pop: 0.42, boss: true },
  dragon: { name: '대장 천둥 용', skill: '천둥 숨결!', line: '마지막 대장. 타면 온 마당에 벼락', r: 0.11, hp: 220, spd: 0.002, foe: F(3, 0.5, 0.08, 0.72, 58, 110, 22), me: M(0.16, 0.22, 34, 50), pop: 0.44, boss: true },
};
/** 도감 차례(타 본 몸) */
export const DEX: K[] = ['bean', 'bear', 'hedge', 'frog', 'boar', 'mole', 'goat', 'turtle', 'crab', 'cloud', 'shroom', 'tanuki', 'dragon'];

interface Wave { need: number; wait: number; mons: [K, number][] }
interface StageDef {
  key: K; ch: number; name: string; news: string; n: number; waves: Wave[];
  /** 대장 판: 보호막 · 졸개 부르기 · 대장 몸에 탄 뒤 몰려오는 마지막 떼 */
  shield?: number; summon?: [K, number][]; swarm?: [K, number][];
}
export const CHAPTERS = ['풀밭 씨름 마당', '바닷가 모래 마당', '구름 위 하늘 마당'];
const W = (need: number, wait: number, ...mons: [K, number][]): Wave => ({ need, wait, mons });
/**
 * 판 12개. 첫 떼는 마당에 미리 흩어져 서로 투닥거리고(구경거리), 다음 물결은 마당의 적이 need 아래로 줄면 쉴 틈 없이 문으로 우르르 들어온다.
 * 사람 기준 한 판 30~45초 · 갈아타기 8~14번이 되게 문으로 들어오는 물결 4~5개(대장 판은 졸개를 계속 부른다).
 * 물결을 둘셋으로 크게 묶으면 마당이 늘 꽉 차서 아무 때나 갈아타도 별 셋이 나온다(버릇 봇 71%) — 한 물결 17마리쯤이 '붐빌 때를 고르는 맛'을 지킨다.
 */
export const STAGES: StageDef[] = [
  { key: 'bear', ch: 0, name: '돌주먹 곰', news: '타면 쿵! 둘레를 한 번에', n: 5, waves: [W(0, 0, ['bear', 2], ['bean', 12]), W(6, 420, ['bear', 2], ['bean', 14]), W(7, 480, ['bear', 2], ['bean', 15]), W(7, 480, ['bear', 2], ['bean', 14]), W(7, 480, ['bear', 1], ['bean', 10])] },
  { key: 'hedge', ch: 0, name: '가시 고슴도치', news: '타면 데굴데굴 핀볼처럼 튕겨요', n: 8, waves: [W(0, 0, ['hedge', 2], ['bear', 1], ['bean', 14]), W(8, 480, ['hedge', 2], ['bear', 1], ['bean', 14]), W(8, 480, ['hedge', 2], ['bear', 1], ['bean', 14]), W(8, 480, ['hedge', 2], ['bear', 1], ['bean', 14]), W(8, 480, ['hedge', 1], ['bear', 1], ['bean', 12])] },
  { key: 'frog', ch: 0, name: '긴 혀 개구리', news: '타면 쭈욱! 끌어모아 하나씩 꿀꺽', n: 11, waves: [W(0, 0, ['frog', 1], ['bear', 2], ['hedge', 1], ['bean', 14]), W(8, 480, ['frog', 1], ['bear', 2], ['bean', 14]), W(8, 480, ['frog', 1], ['bear', 1], ['hedge', 1], ['bean', 14]), W(8, 480, ['frog', 1], ['bear', 2], ['bean', 14]), W(8, 480, ['frog', 1], ['bear', 2], ['bean', 12])] },
  { key: 'boar', ch: 0, name: '대장 멧돼지', news: '왕관 보호막을 깨면 탈 수 있어요', n: 8, shield: 260, summon: [['bear', 1], ['hedge', 1], ['bean', 8]], swarm: [['hedge', 2], ['bear', 2], ['frog', 1], ['bean', 16]], waves: [W(0, 0, ['boar', 1], ['bear', 1], ['frog', 1], ['hedge', 1], ['bean', 11])] },
  { key: 'mole', ch: 1, name: '폭탄 두더지', news: '타자마자 대폭발! 유령은 튀어나와요', n: 11, waves: [W(0, 0, ['mole', 2], ['bear', 1], ['hedge', 1], ['bean', 14]), W(8, 480, ['mole', 2], ['frog', 1], ['bean', 14]), W(8, 480, ['mole', 2], ['bear', 1], ['bean', 14]), W(8, 480, ['mole', 2], ['frog', 1], ['bean', 14]), W(8, 480, ['mole', 1], ['hedge', 2], ['bean', 13])] },
  { key: 'goat', ch: 1, name: '박치기 염소', news: '타면 마당을 가로질러 왔다 갔다 쿵', n: 10, waves: [W(0, 0, ['goat', 2], ['mole', 1], ['bear', 1], ['bean', 14]), W(8, 480, ['goat', 2], ['frog', 1], ['bean', 14]), W(8, 480, ['goat', 1], ['mole', 2], ['bean', 14]), W(8, 480, ['goat', 2], ['bear', 1], ['bean', 14]), W(8, 480, ['goat', 1], ['hedge', 1], ['bear', 1], ['bean', 13])] },
  { key: 'turtle', ch: 1, name: '방패 거북', news: '튼튼해요. 빙글빙글 돌며 통통 튕겨 내요', n: 12, waves: [W(0, 0, ['turtle', 1], ['goat', 1], ['mole', 2], ['bean', 14]), W(8, 480, ['turtle', 1], ['hedge', 2], ['bean', 14]), W(8, 480, ['turtle', 1], ['goat', 1], ['mole', 1], ['bean', 14]), W(8, 480, ['turtle', 1], ['goat', 1], ['hedge', 1], ['bean', 14]), W(8, 480, ['bear', 1], ['frog', 1], ['mole', 1], ['bean', 13])] },
  { key: 'crab', ch: 1, name: '대장 집게', news: '두 집게로 쿵쿵. 보호막을 깨고 타요', n: 8, shield: 380, summon: [['mole', 1], ['goat', 1], ['bean', 8]], swarm: [['turtle', 1], ['mole', 2], ['goat', 2], ['bean', 16]], waves: [W(0, 0, ['crab', 1], ['turtle', 1], ['goat', 1], ['mole', 1], ['bean', 11])] },
  { key: 'cloud', ch: 2, name: '번개 구름', news: '타면 번개가 적에서 적으로 줄줄이', n: 12, waves: [W(0, 0, ['cloud', 2], ['goat', 1], ['turtle', 1], ['bean', 14]), W(8, 480, ['cloud', 2], ['mole', 1], ['bean', 14]), W(8, 480, ['cloud', 1], ['bear', 1], ['frog', 1], ['bean', 14]), W(8, 480, ['cloud', 2], ['turtle', 1], ['bean', 14]), W(8, 480, ['cloud', 1], ['hedge', 1], ['bear', 1], ['bean', 14]), W(8, 480, ['cloud', 1], ['goat', 1], ['mole', 1], ['bean', 13])] },
  { key: 'shroom', ch: 2, name: '포자 버섯', news: '포자 묻은 적은 터질 때 옆도 터뜨려요', n: 15, waves: [W(0, 0, ['shroom', 2], ['cloud', 1], ['goat', 1], ['bean', 14]), W(8, 480, ['shroom', 1], ['frog', 1], ['mole', 1], ['bean', 14]), W(8, 480, ['shroom', 2], ['bear', 1], ['bean', 14]), W(8, 480, ['shroom', 2], ['goat', 1], ['bean', 14]), W(8, 480, ['shroom', 1], ['turtle', 1], ['bean', 14]), W(8, 480, ['shroom', 1], ['cloud', 1], ['hedge', 1], ['bean', 13])] },
  { key: 'tanuki', ch: 2, name: '분신 너구리', news: '분신 둘이 생겨 펑이 세 번 터져요', n: 15, waves: [W(0, 0, ['tanuki', 2], ['shroom', 1], ['cloud', 1], ['bean', 14]), W(8, 480, ['tanuki', 1], ['turtle', 1], ['mole', 1], ['bean', 14]), W(8, 480, ['tanuki', 2], ['goat', 1], ['bean', 14]), W(8, 480, ['tanuki', 2], ['cloud', 1], ['bean', 14]), W(8, 480, ['tanuki', 1], ['frog', 1], ['bear', 1], ['bean', 14]), W(8, 480, ['tanuki', 1], ['shroom', 1], ['cloud', 1], ['bean', 13])] },
  { key: 'dragon', ch: 2, name: '대장 천둥 용', news: '마지막 대장. 타면 온 마당에 벼락', n: 9, shield: 500, summon: [['cloud', 1], ['tanuki', 1], ['bean', 8]], swarm: [['shroom', 1], ['tanuki', 1], ['goat', 2], ['cloud', 1], ['bean', 16]], waves: [W(0, 0, ['dragon', 1], ['tanuki', 1], ['shroom', 1], ['cloud', 1], ['bean', 11])] },
];
export const STAGE_COUNT = STAGES.length;
/** 장 끝 둘 중 하나(마당의 큰 물건) */
export const PERKS: { name: string; line: string }[][] = [
  [{ name: '쌍둥이 북', line: '펑이 두 번 터져요' }, { name: '얼음 종', line: '타는 순간 둘레가 꽁꽁' }],
  [{ name: '큰 자석', line: '펑이 적을 빨아들여요' }, { name: '번개 깃발', line: '날아가는 길에 번개' }],
];
/** 배우는 판은 너그럽게: 적이 주는 피해 배수 */
const EZ = [0.3, 0.55, 0.8, 0.9, 1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35];

// ───────────────────────────── 상태 ─────────────────────────────
/** 적 상태: 뛰어드는 중 · 어슬렁/쫓기 · 뜸 들이기 · 돌진 · 쉼 · (내 몸) 등장 기술 · 유령이 날아오는 중 */
const ENTER = 0, IDLE = 1, WIND = 2, DASH = 3, REST = 4, SKILL = 5, CLAIM = 6;
interface Mon {
  id: number; k: K; x: number; y: number; r: number; hp: number; max: number; shield: number; shieldMax: number;
  /** 상태 · 상태 틱 · 쉼 · 향한 각 · 겨눈 곳 · 문에서 들어오는 데 걸리는 틱 · 마지막으로 걸은 쪽 · 삼켜지기까지 */
  st: number; tm: number; cool: number; ang: number; ax: number; ay: number; et: number; wa: number; gulp: number;
  vx: number; vy: number; air: number; stun: number; frozen: number; spore: number; inv: number;
  /** 등장 기술·돌진 진행: 남은 구간 · 이번 구간에 친 적 · 기술 틱 · 기술 피해의 출처(갈아탄 번호, 0 = 자동) */
  legs: number; hits: number[]; sk: number; sksrc: number; ult: number;
  /** 마지막으로 때린 출처 · 도미노 쉼 */
  src: number; dom: number;
  /** 화남(내 몸을 쫓는다) — 내 몸이 가까이 오거나 맞으면 · 제자리(투닥거리다 돌아오는 곳) */
  mad: boolean; hx: number; hy: number;
  fx0: number; fy0: number; dead: boolean;
  // 연출 (시뮬레이션 결과와 무관)
  seed: number; born: number; hurtT: number; face: number; bumpT: number; spar: number; atkT: number; walkT: number;
}
interface Decoy { x: number; y: number; hp: number; born: number }
/** 뒤에 일어날 일: 포자 터짐 · 두 번째 펑 · 번개 한 칸 · 마지막 떼 */
interface Q { t: number; k: 'burst' | 'pop2' | 'bolt' | 'swarm'; x: number; y: number; r: number; dmg: number; src: number; left: number; hit: number[] }
/** 사라진 몸 (연출): 0 터짐 · 1 내 몸 쓰러짐 · 2 대폭발 · 3 버린 몸 펑 · 4 개구리가 꿀꺽 */
interface Corpse { k: K; x: number; y: number; t: number; how: number; vx: number; vy: number; seed: number; n: number }
interface Ev { t: number; k: string; x: number; y: number; n: number; x2: number; y2: number; text: string }
interface Line { k: number; x0: number; y0: number; x1: number; y1: number; t: number; id: number }

export interface HopState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result' | 'pick' | 'end'; pt: number;
  /** 하트 · 지난 판까지의 점수 · 이번 판 점수(별로 곱해지기 전) */
  hearts: number; pts: number; sp: number; stars: number; got: number; starOk: boolean[]; dead: boolean; won: boolean;
  /** 유령 레벨 · 장 끝에 고른 것(0 아직 · 1 왼쪽 · 2 오른쪽) · 방금 고른 것 · 도감 · 이번 판에 새로 탄 몸 */
  lv: number; perk: number[]; picked: number; dex: K[]; newDex: K[];
  mons: Mon[]; nid: number; me: number; gx: number; gy: number; home: boolean;
  fly: { x0: number; y0: number; to: number; t: number; T: number } | null;
  charge: number; dizzy: number; out: number; hopped: boolean; hops: number; inT: number;
  /** 이번 갈아타기: 번호 · 틱 · 한 번에 터뜨린 수 */
  hop: { id: number; t: number; n: number };
  best: number; kos: number; kills: number; gain: number;
  wave: number; waveT: number; summonT: number; swarmed: boolean; rode: boolean; clearT: number;
  /** 문 밖에 줄 선 떼 · 다음 한 마리가 들어올 틱 · (대장 판) 보호막이 깨져 별 셋째가 정해짐 · 떠다니는 동안 느린 시간 모음 · 이번 몸에서 '!'를 띄웠나 */
  inbox: K[]; gateT: number; sealed: boolean; slow: number; alerted: boolean;
  decoys: Decoy[]; q: Q[]; corpses: Corpse[]; events: Ev[]; lines: Line[];
  /** 멈칫: 큰 순간에 세상이 몇 틱 멈춘다(손맛) */
  freeze: number;
  down: boolean; wowN: number; firstTap: number; firstBig: number; denyT: number; readyT: number;
  seen: Set<string>;
  banner: { head: string; sub: string; t: number } | null; spot: { id: number; t: number; label: string } | null;
  /** 큰 띠(한 번에 하나): 이 판 최고 기록을 넘을 때 · 별 셋째를 딸 때 · 보호막 깨짐 · 대장 타기 */
  big: { text: string; t: number; n: number; hop: number; star: boolean } | null;
}

/** 빗변: Math.hypot은 브라우저마다 끝자리가 달라 같은 시드가 다르게 흘러갈 수 있어 제곱근으로 직접 */
const hyp = (a: number, b: number) => Math.sqrt(a * a + b * b);
const dist = (ax: number, ay: number, bx: number, by: number) => hyp(ax - bx, (ay - by) / YS);
const angTo = (ax: number, ay: number, bx: number, by: number) => Math.atan2((by - ay) / YS, bx - ax);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ev = (s: HopState, k: string, x: number, y: number, n = 0, x2 = 0, y2 = 0, text = '') => s.events.push({ t: s.t, k, x, y, n, x2, y2, text });
const see = (s: HopState, key: string) => void s.seen.add(key);
const body = (s: HopState): Mon | null => (s.me ? s.mons.find((m) => m.id === s.me && !m.dead) ?? null : null);
const others = (s: HopState) => s.mons.reduce((a, m) => a + (!m.dead && m.id !== s.me ? 1 : 0), 0);
const ridable = (s: HopState, m: Mon) => !m.dead && m.id !== s.me && m.st !== ENTER && m.st !== CLAIM && m.shield <= 0;
const hittable = (s: HopState, m: Mon) => !m.dead && m.id !== s.me && m.st !== ENTER && m.st !== CLAIM;
/** 유령 레벨이 주는 힘: 기술 배수 · 펑 피해 · 펑 반지름 */
const skillMul = (s: HopState) => 1 + 0.07 * (s.lv - 1);
const popDmg = (s: HopState) => 24 + 3 * (s.lv - 1);
export const popR = (s: HopState, k: K) => KD[k].pop * (1 + 0.025 * (s.lv - 1));

/** 지금 화를 내는 거리 (한 몸에 오래 있을수록 넓어진다) */
export const aggroR = (s: HopState) => Math.min(AGGRO_MAX, AGGRO_R + Math.max(0, s.t - s.inT - AGGRO_WAIT) * AGGRO_UP);

function wow(s: HopState, text: string, n = 0) {
  s.wowN++;
  if (s.firstBig < 0 && s.firstTap >= 0) s.firstBig = s.t;
  s.big = { text, t: s.t, n, hop: s.hop.id, star: false };
  s.freeze = Math.max(s.freeze, 4);
  see(s, 'wow');
}
function keepIn(m: { x: number; y: number; r: number }) {
  const d = dist(m.x, m.y, CX, CY), lim = AR - m.r * 0.6;
  if (d <= lim) return false;
  m.x = CX + ((m.x - CX) * lim) / d;
  m.y = CY + ((m.y - CY) * lim) / d;
  return true;
}
function walk(s: HopState, m: Mon, a: number, spd: number) {
  m.x += Math.cos(a) * spd;
  m.y += Math.sin(a) * spd * YS;
  if (Math.abs(Math.cos(a)) > 0.25) m.face = Math.cos(a) > 0 ? 1 : -1;
  m.walkT = s.t;
  m.wa = a;
}
function corpse(s: HopState, m: Mon, how: number, n = 0) {
  s.corpses.push({ k: m.k, x: m.x, y: m.y, t: s.t, how, vx: m.vx, vy: m.vy, seed: m.seed, n });
  if (s.corpses.length > 28) s.corpses.shift();
}

// ───────────────────────────── 떼 ─────────────────────────────
function add(s: HopState, k: K, x: number, y: number, gate: boolean): Mon {
  const d = KD[k], hp = Math.round(d.hp * (1 + 0.1 * s.stage));
  const m: Mon = {
    id: ++s.nid, k, x, y, r: d.r, hp, max: hp, shield: 0, shieldMax: 0, st: gate ? ENTER : IDLE, tm: 0, et: 1, wa: 0, gulp: 0,
    cool: 24 + Math.floor(s.rng() * 70), ang: 0, ax: x, ay: y, vx: 0, vy: 0, air: 0, stun: 0, frozen: 0, spore: 0, inv: 0,
    legs: 0, hits: [], sk: 0, sksrc: 0, ult: 0, src: 0, dom: 0, mad: !!d.boss, hx: x, hy: y, fx0: x, fy0: y, dead: false,
    seed: Math.floor(s.rng() * 1e6), born: s.t, hurtT: -99, face: x < CX ? 1 : -1, bumpT: -99, spar: 0, atkT: -99, walkT: -99,
  };
  if (gate) {
    // 문에서 제자리까지 폴짝폴짝 뛰어 들어온다 (멀수록 오래)
    m.fx0 = GATE_X + (s.rng() - 0.5) * 0.1;
    m.fy0 = GATE_Y;
    m.x = m.fx0;
    m.y = m.fy0;
    m.et = m.tm = 20 + Math.round(dist(m.fx0, m.fy0, x, y) * 34);
  }
  if (d.boss) m.shield = m.shieldMax = STAGES[s.stage].shield ?? 100;
  if (!s.seen.has('k:' + k)) see(s, 'k:' + k);
  s.mons.push(m);
  return m;
}
/** 마당 안 빈자리: 다른 몸·내 몸과 떨어진 곳 (몇 번 다시 뽑아 가장 한적한 곳) */
function freeSpot(s: HopState, r: number, rmax: number, gap: number): [number, number] {
  const b = body(s);
  let bx = CX, by = CY, bd = -9;
  for (let k = 0; k < 12; k++) {
    const a = s.rng() * TAU, q = Math.sqrt(s.rng()) * rmax, x = CX + Math.cos(a) * q, y = CY + Math.sin(a) * q * YS;
    let near = b ? (dist(x, y, b.x, b.y) - 0.2) * 0.5 : 9;
    for (const o of s.mons) if (!o.dead) near = Math.min(near, dist(x, y, o.st === ENTER ? o.ax : o.x, o.st === ENTER ? o.ay : o.y) - o.r - r);
    if (near > bd) (bd = near), (bx = x), (by = y);
    if (near > gap) break;
  }
  return [bx, by];
}
/** 미리 서 있는 떼: 대장은 뒤쪽 가운데, 큰 놈부터 자리를 잡고 콩알이는 빈 데를 채운다 */
function place(s: HopState, mons: [K, number][]) {
  for (const [k, n] of mons)
    for (let j = 0; j < n; j++) {
      const d = KD[k], [x, y] = d.boss ? [CX, CY - 0.14] : freeSpot(s, d.r, AR - 0.05 - d.r, 0.04);
      add(s, k, x, y, false);
    }
}
/** 문 밖에 줄을 세운다 (큰 놈이 콩알이 사이사이 섞이게) — 마당에 자리가 나는 대로 한 마리씩 우르르 들어온다 */
function enqueue(s: HopState, mons: [K, number][]) {
  const bigs: K[] = [], beans: K[] = [];
  for (const [k, n] of mons) for (let j = 0; j < n; j++) (k === 'bean' ? beans : bigs).push(k);
  const every = bigs.length ? Math.max(1, Math.floor(beans.length / bigs.length)) : 0;
  let bi = 0;
  beans.forEach((k, i) => {
    if (every && i % every === 0 && bi < bigs.length) s.inbox.push(bigs[bi++]);
    s.inbox.push(k);
  });
  while (bi < bigs.length) s.inbox.push(bigs[bi++]);
}
function spawnWave(s: HopState) {
  const d = STAGES[s.stage], w = d.waves[s.wave];
  if (s.stage === 0 && s.wave === 0) {
    // 1판 첫 장면: 곰 둘레에 콩알이 여섯 — 첫 톡이 '쿵! 6마리 한 방'
    add(s, 'bear', CX, CY + 0.01, false);
    for (let i = 0; i < 6; i++) add(s, 'bean', CX + Math.cos(0.5 + (i * TAU) / 6) * 0.135, CY + 0.01 + Math.sin(0.5 + (i * TAU) / 6) * 0.135 * YS, false);
    add(s, 'bear', CX + 0.27, CY + 0.17, false);
    place(s, [['bean', 6]]);
  } else if (s.wave === 0) place(s, w.mons);
  else enqueue(s, w.mons), ev(s, 'wave', GATE_X, GATE_Y, s.wave);
  s.wave++;
  s.waveT = 0;
}
/** 화를 낸다 (내 몸을 쫓기 시작) */
function anger(s: HopState, m: Mon) {
  if (m.mad || m.dead) return;
  m.mad = true;
  ev(s, 'mad', m.x, m.y - m.r * 2);
}

function newStage(s: HopState) {
  const d = STAGES[s.stage];
  s.mons = [];
  s.decoys = [];
  s.q = [];
  s.lines = [];
  s.fly = null;
  s.me = 0;
  s.gx = HOME_X;
  s.gy = HOME_Y;
  s.home = true;
  s.charge = 1;
  s.dizzy = 0;
  s.out = 0;
  s.hopped = false;
  s.hop = { id: s.hop.id, t: -999, n: 0 };
  s.best = 0;
  s.kos = 0;
  s.wave = 0;
  s.waveT = 0;
  s.summonT = 0;
  s.swarmed = false;
  s.rode = false;
  s.clearT = 0;
  s.inbox = [];
  s.gateT = 0;
  s.sealed = false;
  s.slow = 0;
  s.alerted = false;
  s.phase = 'play';
  s.pt = 0;
  s.starOk = [false, false, false];
  s.got = 0;
  s.newDex = [];
  s.big = null;
  spawnWave(s);
  const first = s.stage === 0 || STAGES[s.stage - 1].ch !== d.ch, nw = s.mons.find((m) => m.k === d.key);
  s.banner = { head: `${first ? CHAPTERS[d.ch] + ' · ' : ''}${s.stage + 1}판`, sub: d.news, t: s.t };
  s.spot = nw ? { id: nw.id, t: s.t, label: 'NEW ' + d.name } : null;
  see(s, 'stage' + s.stage);
  if (first) see(s, 'ch' + d.ch);
  ev(s, 'stage', CX, CY, s.stage);
}

// ───────────────────────────── 때리기 ─────────────────────────────
function kill(s: HopState, m: Mon, src: number, how = 0) {
  if (m.dead) return;
  m.dead = true;
  s.kills++;
  let n = 0;
  if (src > 0 && src === s.hop.id) {
    n = ++s.hop.n;
    s.sp += Math.ceil((n * n) / 4); // n번째는 ⌈n²/4⌉점 — 한 번에 많이 터뜨릴수록 훨씬 크다
    if (!s.sealed && n > s.best) {
      // 이 판 최고 기록을 넘는 중 — 큰 띠는 이때(넷부터)와 별 셋째를 딸 때만
      const star = s.best < STAGES[s.stage].n && n >= STAGES[s.stage].n;
      s.best = n;
      if (n >= WOW_N || star) {
        if (s.big && s.big.hop === s.hop.id && s.big.n > 0) (s.big.text = `${n}마리 한 방!`), (s.big.n = n), (s.big.t = Math.max(s.big.t, s.t - 8));
        else wow(s, `${n}마리 한 방!`, n);
        if (star) (s.big!.star = true), ev(s, 'star3', m.x, m.y - m.r);
      }
    }
  } else s.sp += 1;
  corpse(s, m, how, n);
  ev(s, 'kill', m.x, m.y - m.r, n, 0, 0, m.k);
  if (m.spore > 0) s.q.push({ t: s.t + 6, k: 'burst', x: m.x, y: m.y, r: 0.115, dmg: 18 * skillMul(s), src, left: 0, hit: [] });
}
/** 적을 때린다 (src: 갈아탄 번호 — 한 번에 몇 마리인지 센다 · 0 자동 공격) */
function hurt(s: HopState, m: Mon, amt: number, src: number, kx = 0, ky = 0) {
  if (!hittable(s, m)) return;
  if (m.frozen > 0) amt *= 1.5;
  m.hurtT = s.t;
  m.src = src;
  if (m.shield > 0) {
    m.shield -= amt;
    ev(s, 'shield', m.x, m.y - m.r * 1.6, Math.round(amt));
    if (m.shield <= 0) {
      m.shield = 0;
      m.stun = 420;
      m.st = IDLE;
      m.tm = 0;
      // 별 셋째('보호막을 깨는 동안 한 번에 N마리')는 여기서 정해진다 — 이제 대장 몸은 언제 타도 되는 순수한 보상
      s.sealed = true;
      wow(s, '보호막 와장창!');
      ev(s, 'break', m.x, m.y - m.r);
      see(s, 'break');
      s.spot = { id: m.id, t: s.t, label: '대장 몸에 타기!' };
    }
    return;
  }
  m.hp -= amt;
  anger(s, m);
  if (!KD[m.k].boss && (kx || ky)) {
    m.vx += kx;
    m.vy += ky;
    m.air = Math.max(m.air, 10);
  }
  if (m.hp <= 0) kill(s, m, src);
}
/** 둥근 범위의 적을 모두 때리고 바깥으로 민다 */
function blast(s: HopState, x: number, y: number, r: number, dmg: number, src: number, knock: number) {
  let n = 0;
  for (const m of s.mons) {
    if (!hittable(s, m)) continue;
    const d = dist(x, y, m.x, m.y);
    if (d > r + m.r * 0.5) continue;
    const a = d > 1e-4 ? angTo(x, y, m.x, m.y) : m.seed, kk = knock * (1.2 - 0.6 * Math.min(1, d / r));
    hurt(s, m, dmg, src, Math.cos(a) * kk, Math.sin(a) * kk);
    n++;
  }
  return n;
}
function ko(s: HopState, b: Mon) {
  b.dead = true;
  corpse(s, b, 1);
  s.kos++;
  s.kills++;
  s.me = 0;
  s.gx = b.x;
  s.gy = b.y - b.r * 1.3;
  s.dizzy = DIZZY_T;
  s.charge = 0;
  s.out = 0;
  for (const d of s.decoys) ev(s, 'poof', d.x, d.y);
  s.decoys = [];
  for (const o of s.mons) (o.hx = o.x), (o.hy = o.y);
  ev(s, 'ko', b.x, b.y, 0, 0, 0, b.k);
  see(s, 'ko');
}
/** 내 몸이 맞는다 */
function hurtMe(s: HopState, b: Mon, amt: number, kx = 0, ky = 0) {
  if (b.dead || b.inv > 0 || b.st === CLAIM) return;
  if (b.k === 'turtle') amt *= 0.5;
  if (KD[b.k].boss) amt *= 0.25;
  b.hp -= amt;
  b.hurtT = s.t;
  if (b.st !== SKILL && !KD[b.k].boss) (b.vx += kx), (b.vy += ky);
  ev(s, 'ouch', b.x, b.y - b.r * 1.5, Math.round(amt));
  if (b.hp <= 0) ko(s, b);
}
/** 적의 공격이 닿는 것: 내 몸 · 분신 */
function foeHit(s: HopState, inside: (x: number, y: number, r: number) => boolean, dmg: number, kx = 0, ky = 0) {
  const b = body(s);
  if (b && inside(b.x, b.y, b.r)) hurtMe(s, b, dmg, kx, ky);
  for (const d of s.decoys) if (d.hp > 0 && inside(d.x, d.y, 0.04)) d.hp -= dmg;
}

// ───────────────────────────── 갈아타기 ─────────────────────────────
/** 톡한 곳에서 가장 가까운 적 (큰 몸일수록 넉넉히 잡힌다 — 늘 누군가는 잡힌다) */
export function pick(s: HopState, x: number, y: number): Mon | null {
  let best: Mon | null = null, bv = 1e9;
  for (const m of s.mons) {
    if (!ridable(s, m)) continue;
    const v = hyp(m.x - x, m.y - m.r * 0.8 - y) - m.r * 1.6;
    if (v < bv) (bv = v), (best = m);
  }
  return best;
}
/** 버린 몸이 펑 */
function abandon(s: HopState, b: Mon) {
  const r = popR(s, b.k), dmg = popDmg(s), src = s.hop.id;
  b.dead = true;
  s.kills++;
  s.sp += 1;
  corpse(s, b, 3);
  ev(s, 'pop', b.x, b.y, 0, r, 0, b.k);
  see(s, 'pop');
  if (s.perk[1] === 1) {
    // 큰 자석: 먼저 빨아들인다
    for (const m of s.mons) {
      if (!hittable(s, m) || KD[m.k].boss) continue;
      const d = dist(b.x, b.y, m.x, m.y);
      if (d < r * 1.9 && d > r * 0.5) (m.x += (b.x - m.x) * 0.55), (m.y += (b.y - m.y) * 0.55), ev(s, 'suck', m.x, m.y, 0, b.x, b.y);
    }
  }
  blast(s, b.x, b.y, r, dmg, src, 0.02);
  if (s.perk[0] === 1) s.q.push({ t: s.t + 20, k: 'pop2', x: b.x, y: b.y, r: r * 0.9, dmg: dmg * 0.7, src, left: 0, hit: [] });
  s.decoys.forEach((d, i) => s.q.push({ t: s.t + 5 + i * 5, k: 'pop2', x: d.x, y: d.y, r: r * 0.95, dmg, src, left: 1, hit: [] }));
  s.decoys = [];
}
function hopTo(s: HopState, m: Mon) {
  const b = body(s), x0 = b ? b.x : s.gx, y0 = b ? b.y - b.r : s.gy;
  s.hop = { id: s.hop.id + 1, t: s.t, n: 0 };
  s.hops++;
  s.hopped = true;
  s.home = false;
  m.st = CLAIM;
  m.tm = 0;
  m.vx = m.vy = 0;
  m.stun = m.frozen = 0;
  s.fly = { x0, y0, to: m.id, t: 0, T: FLY_T + Math.round(dist(x0, y0, m.x, m.y) * 8) };
  s.out = 0;
  s.charge = 0;
  ev(s, 'hop', x0, y0, 0, m.x, m.y - m.r, m.k);
  if (b) abandon(s, b);
  s.me = 0;
  if (s.perk[1] === 2) {
    // 번개 깃발: 날아가는 길의 적이 찌릿
    const dx = m.x - x0, dy = (m.y - m.r - y0) / YS, L = hyp(dx, dy) || 1e-6;
    for (const o of s.mons) {
      if (!hittable(s, o)) continue;
      const u = clamp(((o.x - x0) * dx + ((o.y - o.r - y0) / YS) * dy) / (L * L), 0, 1);
      if (hyp(o.x - (x0 + dx * u), (o.y - o.r - y0) / YS - dy * u) < 0.075 + o.r * 0.5) {
        o.stun = Math.max(o.stun, 45);
        hurt(s, o, 18 * skillMul(s), s.hop.id);
        ev(s, 'zap', o.x, o.y - o.r);
      }
    }
  }
}
function arrive(s: HopState) {
  const f = s.fly!, m = s.mons.find((o) => o.id === f.to && !o.dead);
  s.fly = null;
  if (!m) return void ((s.dizzy = 10), (s.out = 0));
  s.me = m.id;
  m.hp = m.max;
  m.inv = INV_T;
  m.st = SKILL;
  m.sk = 0;
  m.sksrc = s.hop.id;
  m.ult = 0;
  m.spore = 0;
  m.cool = 20;
  m.tm = 0;
  m.legs = 0;
  m.hits = [];
  m.gulp = 0;
  s.alerted = false;
  s.gx = m.x;
  s.gy = m.y - m.r;
  s.inT = s.t;
  // 유령이 몸을 바꾸면 멀리 있던 적은 나를 놓친다 (어? 어디 갔지?)
  for (const o of s.mons) if (o.mad && !o.dead && o !== m && !KD[o.k].boss && dist(o.x, o.y, m.x, m.y) > AGGRO_R + 0.06) (o.mad = false), (o.hx = o.x), (o.hy = o.y), o.st === IDLE && ev(s, 'huh', o.x, o.y - o.r * 2);
  if (!s.dex.includes(m.k)) s.dex.push(m.k), s.newDex.push(m.k), see(s, 'dex:' + m.k);
  ev(s, 'in', m.x, m.y - m.r, 0, 0, 0, m.k);
  if (KD[m.k].boss) {
    s.rode = true;
    m.max = m.hp = m.max * 3;
    wow(s, '대장 몸에 탔다!');
    see(s, 'ride');
    if (STAGES[s.stage].swarm && !s.swarmed) s.q.push({ t: s.t + 80, k: 'swarm', x: 0, y: 0, r: 0, dmg: 0, src: 0, left: 0, hit: [] });
  }
  if (s.perk[0] === 2) {
    // 얼음 종: 내려앉은 둘레가 얼어붙는다
    let n = 0;
    for (const o of s.mons) if (hittable(s, o) && !KD[o.k].boss && dist(m.x, m.y, o.x, o.y) < 0.24) (o.frozen = 120), n++;
    ev(s, 'frost', m.x, m.y, n, 0.24);
  }
}
function onTap(s: HopState, x: number, y: number) {
  if (s.firstTap < 0) s.firstTap = s.t;
  if (s.fly) return;
  if (s.charge < 1 || s.dizzy > 0) return void ((s.denyT = s.t), ev(s, 'deny', x, y));
  const m = s.stage === 0 && !s.hopped ? s.mons.find((o) => o.k === 'bear' && ridable(s, o)) ?? pick(s, x, y) : pick(s, x, y);
  if (!m) {
    if (s.mons.some((o) => !o.dead && o.shield > 0)) ev(s, 'deny', x, y, 1);
    return;
  }
  ev(s, 'tap', x, y);
  hopTo(s, m);
}

// ───────────────────────────── 등장 기술 ─────────────────────────────
/** 기술 크기: 곰 쿵 · 고슴도치·염소 폭 · 개구리 혀 · 두더지 대폭발 · 거북 빙글 · 번개 칸 수 · 포자 */
const BEAR_R = 0.2, HEDGE_W = 0.05, GOAT_W = 0.065, FROG_R = 0.42, MOLE_R = 0.27, TURTLE_R = 0.3, BOLT_N = 5, SPORE_R = 0.42;
/** (x,y)에서 a 쪽으로 벽까지 굴러가면 꿰는 적 (쓰러질 적은 1, 다치기만 하면 0.4) */
function rayCount(s: HopState, x: number, y: number, a: number, wd: number, dmg: number) {
  const c = Math.cos(a), sn = Math.sin(a), px = x - CX, py = (y - CY) / YS;
  const b = px * c + py * sn, L = -b + Math.sqrt(Math.max(0, b * b - (px * px + py * py - AR * AR)));
  let n = 0;
  for (const o of s.mons) {
    if (!hittable(s, o)) continue;
    const ox = o.x - x, oy = (o.y - y) / YS, u = ox * c + oy * sn;
    if (u < 0 || u > L) continue;
    if (Math.abs(-ox * sn + oy * c) <= wd + o.r * 0.6) n += o.shield > 0 ? 0.6 : o.hp <= dmg ? 1 : 0.4;
  }
  return n;
}
/** 가장 많이 꿰는 쪽 (24방향) */
function bestDir(s: HopState, x: number, y: number, wd: number, dmg: number, inward = false) {
  let best = 0, bv = -1;
  for (let k = 0; k < 24; k++) {
    const a = (k * TAU) / 24 + 0.01;
    if (inward && Math.cos(a) * (x - CX) + (Math.sin(a) * (y - CY)) / YS > -0.08) continue;
    const v = rayCount(s, x, y, a, wd, dmg);
    if (v > bv) (bv = v), (best = a);
  }
  return best;
}
function endSkill(m: Mon) {
  m.st = IDLE;
  m.cool = 14;
  m.legs = 0;
}
/** 굴러가며 꿰뚫기 (고슴도치·염소·대장 멧돼지): 벽에 닿으면 다음 줄을 다시 겨눈다 */
function rollStep(s: HopState, m: Mon, spd: number, wd: number, dmg: number, knock: number) {
  const c = Math.cos(m.ang), sn = Math.sin(m.ang);
  m.x += c * spd;
  m.y += sn * spd * YS;
  if (Math.abs(c) > 0.2) m.face = c > 0 ? 1 : -1;
  m.walkT = s.t;
  for (const o of s.mons) {
    if (!hittable(s, o) || m.hits.includes(o.id)) continue;
    if (dist(m.x, m.y, o.x, o.y) > wd + o.r * 0.6) continue;
    m.hits.push(o.id);
    const side = Math.sign(-(o.x - m.x) * sn + ((o.y - m.y) / YS) * c) || 1;
    ev(s, 'bonk', o.x, o.y - o.r, 0, 0, 0, m.k);
    hurt(s, o, dmg, m.sksrc, c * knock - sn * side * knock * 0.45, sn * knock + c * side * knock * 0.45);
  }
  if (dist(m.x, m.y, CX, CY) >= AR - m.r * 0.6) {
    keepIn(m);
    m.legs--;
    m.hits = [];
    ev(s, 'wall', m.x, m.y);
    if (m.legs <= 0 || !s.mons.some((o) => hittable(s, o))) endSkill(m);
    else m.ang = bestDir(s, m.x, m.y, wd, dmg, true);
  }
}
function skillStep(s: HopState, m: Mon) {
  const t = m.sk++, mul = skillMul(s), src = m.sksrc;
  if (t === 3) ev(s, 'shout', m.x, m.y - m.r * 2, 0, 0, 0, m.k);
  switch (m.k) {
    case 'bean':
      if (t === 6) ev(s, 'slam', m.x, m.y, 0, 0.09, 0, m.k), blast(s, m.x, m.y, 0.09, 14 * mul, src, 0.012);
      if (t >= 14) endSkill(m);
      break;
    case 'bear':
      if (t === 8) ev(s, 'slam', m.x, m.y, 0, BEAR_R, 0, m.k), blast(s, m.x, m.y, BEAR_R, 38 * mul, src, 0.022);
      if (t >= 26) endSkill(m);
      break;
    case 'hedge':
      if (t === 0) (m.legs = 2), (m.hits = []), (m.ang = bestDir(s, m.x, m.y, HEDGE_W, 24 * mul));
      if (t === 5) ev(s, 'roll', m.x, m.y, 0, 0, 0, m.k);
      if (t >= 5) rollStep(s, m, 0.034, HEDGE_W, 24 * mul, 0.012);
      break;
    case 'goat':
      if (t === 0) (m.legs = 1), (m.hits = []), (m.ang = bestDir(s, m.x, m.y, GOAT_W, 26 * mul));
      if (t === 6) ev(s, 'roll', m.x, m.y, 0, 0, 0, m.k);
      if (t >= 6) rollStep(s, m, 0.042, GOAT_W, 26 * mul, 0.034);
      break;
    case 'frog':
      if (t === 7) {
        const list = s.mons.filter((o) => hittable(s, o) && !KD[o.k].boss && dist(m.x, m.y, o.x, o.y) < FROG_R).sort((a, b) => dist(m.x, m.y, a.x, a.y) - dist(m.x, m.y, b.x, b.y)).slice(0, 6);
        ev(s, 'tongue', m.x, m.y - m.r, list.length);
        list.forEach((o, i) => {
          const d = dist(m.x, m.y, o.x, o.y), go = Math.max(0, d - (m.r + o.r + 0.008 + (i % 3) * 0.02)), a = angTo(o.x, o.y, m.x, m.y);
          s.lines.push({ k: 0, x0: m.x, y0: m.y - m.r, x1: o.x, y1: o.y - o.r, t: s.t, id: o.id });
          o.vx = Math.cos(a) * go * 0.15;
          o.vy = Math.sin(a) * go * 0.15;
          o.air = 16;
          o.stun = Math.max(o.stun, 80);
          if (o.st === WIND || o.st === DASH) (o.st = REST), (o.tm = 40);
          hurt(s, o, 6 * mul, src);
        });
      }
      if (t >= 30) endSkill(m);
      break;
    case 'mole':
      if (t === 9) {
        ev(s, 'boom', m.x, m.y, 0, MOLE_R, 0, m.k);
        blast(s, m.x, m.y, MOLE_R, 70 * mul, src, 0.03);
        m.dead = true;
        s.kills++;
        s.sp += 1;
        corpse(s, m, 2);
        s.me = 0;
        s.gx = m.x;
        s.gy = m.y - 0.1;
        s.dizzy = 16;
        s.out = 0;
        for (const o of s.mons) (o.hx = o.x), (o.hy = o.y);
      }
      break;
    case 'turtle':
      if (t % 14 === 6) {
        ev(s, 'spin', m.x, m.y, 0, TURTLE_R);
        for (const o of s.mons) {
          if (!hittable(s, o)) continue;
          const d = dist(m.x, m.y, o.x, o.y);
          if (d > TURTLE_R) continue;
          const a = angTo(o.x, o.y, m.x, m.y), go = Math.max(0, d - m.r - o.r) * 0.5;
          if (d < 0.14) hurt(s, o, 9 * mul, src);
          if (!o.dead && !KD[o.k].boss) (o.vx = Math.cos(a) * go * 0.15), (o.vy = Math.sin(a) * go * 0.15), (o.air = Math.max(o.air, 6)), (o.stun = Math.max(o.stun, 30));
        }
      }
      if (t >= 58) endSkill(m);
      break;
    case 'cloud':
      if (t === 6) s.q.push({ t: s.t, k: 'bolt', x: m.x, y: m.y, r: 0.4, dmg: 30 * mul, src, left: BOLT_N, hit: [] });
      if (t >= 22) endSkill(m);
      break;
    case 'shroom':
      if (t === 8) {
        let n = 0;
        for (const o of s.mons) if (hittable(s, o) && dist(m.x, m.y, o.x, o.y) < SPORE_R) (o.spore = 900), n++, hurt(s, o, 5 * mul, src);
        ev(s, 'spore', m.x, m.y, n, SPORE_R);
        see(s, 'spore');
      }
      if (t >= 26) endSkill(m);
      break;
    case 'tanuki':
      if (t === 7) {
        // 분신 둘: 가장 붐비는 두 곳에 뿅
        const spots = s.mons.filter((o) => hittable(s, o) && dist(o.x, o.y, m.x, m.y) > 0.17).map((o) => ({ o, n: s.mons.reduce((a, q) => a + (hittable(s, q) && dist(o.x, o.y, q.x, q.y) < 0.16 ? 1 : 0), 0) })).sort((a, b) => b.n - a.n || a.o.id - b.o.id);
        const got: [number, number][] = [];
        for (const q of spots) if (got.length < 2 && got.every((g) => dist(g[0], g[1], q.o.x, q.o.y) > 0.2)) got.push([q.o.x, q.o.y]);
        while (got.length < 2) got.push([clamp(m.x + (got.length ? 0.2 : -0.2), CX - 0.3, CX + 0.3), m.y]);
        for (const [x, y] of got) {
          s.decoys.push({ x, y, hp: 40, born: s.t });
          ev(s, 'decoy', x, y, 0, 0.1);
          s.lines.push({ k: 1, x0: m.x, y0: m.y - m.r, x1: x, y1: y - 0.04, t: s.t, id: 0 });
          blast(s, x, y, 0.1, 14 * mul, src, 0.012);
        }
        see(s, 'decoy');
      }
      if (t >= 22) endSkill(m);
      break;
    case 'boar':
      // 대지진: 온 마당을 한 번에 (타는 순간 마당에 있는 적이 전부 — 졸개가 몰려든 뒤에 탈수록 크다)
      if (t === 10) ev(s, 'slam', m.x, m.y, 0, 0.62, 0, m.k), blast(s, m.x, m.y, 0.9, 160 * mul, src, 0.03);
      if (t >= 30) endSkill(m);
      break;
    case 'crab':
      // 집게 쾅쾅: 왼쪽·오른쪽 두 번에 온 마당
      if (t === 9 || t === 17) {
        const sd = t === 9 ? -1 : 1;
        ev(s, 'slam', clamp(m.x + sd * 0.2, 0.15, 0.85), m.y, 0, 0.42, 0, m.k);
        for (const o of s.mons) if (hittable(s, o) && (t === 17 || (o.x - m.x) * sd >= 0)) hurt(s, o, 170 * mul, src, sd * 0.02, 0);
      }
      if (t >= 34) endSkill(m);
      break;
    case 'dragon':
      // 천둥 숨결: 마당의 모든 적에게 한꺼번에 벼락
      if (t === 10) {
        ev(s, 'thunder', m.x, m.y - m.r);
        for (const o of s.mons) {
          if (!hittable(s, o)) continue;
          s.lines.push({ k: 2, x0: o.x + (o.seed % 7) * 0.01 - 0.03, y0: 0.12, x1: o.x, y1: o.y - o.r, t: s.t, id: 0 });
          ev(s, 'zap', o.x, o.y - o.r, 1);
          hurt(s, o, 180 * mul, src);
        }
      }
      if (t >= 34) endSkill(m);
      break;
  }
}

// ───────────────────────────── 적의 몸짓 ─────────────────────────────
/** 뜸이 끝나 내려치는 순간 */
function strike(s: HopState, m: Mon) {
  const f = KD[m.k].foe, dmg = f.dmg * EZ[s.stage];
  m.atkT = s.t;
  if (f.shape === 2) {
    m.st = DASH;
    m.tm = Math.round(f.len / 0.03);
    m.hits = [];
    ev(s, 'fdash', m.x, m.y, 0, 0, 0, m.k);
    return;
  }
  if (f.shape === 0) {
    ev(s, 'fstrike', m.x, m.y, 0, f.r, 0, m.k);
    foeHit(s, (x, y, r) => dist(m.x, m.y, x, y) <= f.r + r * 0.4, dmg);
    if (m.k === 'mole') {
      // 자폭: 둘레의 적도 휘말린다 (꾀어 모으면 이득)
      const src = s.t - s.hop.t < 150 ? s.hop.id : 0;
      m.dead = true;
      s.kills++;
      s.sp += 1;
      corpse(s, m, 2);
      ev(s, 'boom', m.x, m.y, 1, f.r, 0, m.k);
      blast(s, m.x, m.y, f.r, 30, src, 0.02);
      return;
    }
  } else if (f.shape === 1) {
    ev(s, 'fstrike', m.ax, m.ay, 0, f.r, 0, m.k);
    foeHit(s, (x, y, r) => dist(m.ax, m.ay, x, y) <= f.r + r * 0.4, dmg);
  } else {
    const c = Math.cos(m.ang), sn = Math.sin(m.ang);
    ev(s, 'fray', m.x, m.y - m.r, 0, m.x + c * f.len, m.y - m.r + sn * f.len * YS, m.k);
    foeHit(s, (x, y, r) => {
      const ox = x - m.x, oy = (y - m.y) / YS, u = ox * c + oy * sn;
      return u > 0 && u < f.len + r && Math.abs(-ox * sn + oy * c) < f.r + r * 0.5;
    }, dmg, m.k === 'frog' ? -c * 0.012 : 0, m.k === 'frog' ? -sn * 0.012 : 0);
  }
  m.st = REST;
  m.tm = f.rest;
  m.cool = 16;
}
/** 유령이 몸 밖에 있을 때(또는 아직 화나지 않았을 때): 곁의 친구와 툭 부딪치고 제자리로 돌아오며 논다 (다치지 않는다 — 구경거리) */
function spar(s: HopState, m: Mon) {
  if (KD[m.k].boss) return;
  const back = dist(m.x, m.y, m.hx, m.hy);
  if (s.t - m.bumpT < 30 + (m.seed % 26) || back > 0.075) {
    if (back > 0.01) walk(s, m, angTo(m.x, m.y, m.hx, m.hy), KD[m.k].spd * 0.6);
    return;
  }
  let p = m.spar ? s.mons.find((o) => o.id === m.spar && !o.dead && o.st === IDLE) : undefined;
  if (!p || (s.t + m.seed) % 150 === 0) {
    let bd = 0.24;
    p = undefined;
    for (const o of s.mons) {
      if (o === m || o.dead || o.st !== IDLE || o.id === s.me) continue;
      const d = dist(m.x, m.y, o.x, o.y) + ((o.seed + m.seed) % 7) * 0.012;
      if (d < bd) (bd = d), (p = o);
    }
    m.spar = p ? p.id : 0;
  }
  if (!p) return;
  const d = dist(m.x, m.y, p.x, p.y), a = angTo(m.x, m.y, p.x, p.y);
  if (d > m.r + p.r + 0.004) walk(s, m, a, KD[m.k].spd * 0.7);
  else {
    // 툭! 서로 밀려난다 (큰 놈은 덜 밀린다)
    const km = Math.min(1, (p.r / m.r) ** 2), kp = KD[p.k].boss ? 0 : Math.min(1, (m.r / p.r) ** 2);
    m.vx = -Math.cos(a) * 0.014 * km;
    m.vy = -Math.sin(a) * 0.014 * km;
    p.vx = Math.cos(a) * 0.014 * kp;
    p.vy = Math.sin(a) * 0.014 * kp;
    m.bumpT = p.bumpT = s.t;
    m.face = Math.cos(a) > 0 ? 1 : -1;
    p.face = -m.face;
    ev(s, 'bump', (m.x + p.x) / 2, (m.y + p.y) / 2 - m.r);
  }
}
function foeStep(s: HopState, m: Mon) {
  const d = KD[m.k], f = d.foe;
  if (m.st === ENTER) {
    const u = clamp(1 - --m.tm / m.et, 0, 1);
    m.x = m.fx0 + (m.ax - m.fx0) * u;
    m.y = m.fy0 + (m.ay - m.fy0) * u;
    if (m.tm <= 0) (m.st = IDLE), (m.x = m.ax), (m.y = m.ay), ev(s, 'land', m.x, m.y, 0, 0, 0, m.k);
    return;
  }
  if (m.st === CLAIM) return;
  if (m.gulp > 0) {
    // 개구리 혀에 끌려가는 중 → 꿀꺽
    if (--m.gulp === 0) {
      const b = body(s);
      if (b && b.k === 'frog' && dist(m.x, m.y, b.x, b.y) < 0.16) (b.hp = Math.min(b.max, b.hp + 4)), (b.atkT = s.t), ev(s, 'gulp', b.x, b.y - b.r, 0, 0, 0, m.k), kill(s, m, 0, 4);
    }
    return;
  }
  if (m.dom > 0) m.dom--;
  if (m.frozen > 0) return void m.frozen--;
  if (m.stun > 0) return void m.stun--;
  if (m.air > 0) return;
  if (m.cool > 0) m.cool--;
  if (m.st === WIND) {
    if (--m.tm <= 0) strike(s, m);
    return;
  }
  if (m.st === DASH) {
    const c = Math.cos(m.ang), sn = Math.sin(m.ang);
    m.x += c * 0.03;
    m.y += sn * 0.03 * YS;
    m.walkT = s.t;
    if (!m.hits.length) {
      const dmg = f.dmg * EZ[s.stage];
      foeHit(s, (x, y, r) => {
        const hit = dist(m.x, m.y, x, y) <= f.r + r * 0.6;
        if (hit) m.hits.push(1);
        return hit;
      }, dmg, c * 0.018, sn * 0.018);
    }
    if (--m.tm <= 0 || keepIn(m)) (m.st = REST), (m.tm = f.rest), (m.cool = 16);
    return;
  }
  if (m.st === REST) {
    if (--m.tm <= 0) m.st = IDLE;
    return;
  }
  // 누구를 노리나: 내 몸이나 분신 중 가까운 쪽
  const b = body(s);
  let tx = 0, ty = 0, tr = 0, td = 1e9;
  if (b && b.st !== CLAIM) (tx = b.x), (ty = b.y), (tr = b.r), (td = dist(m.x, m.y, b.x, b.y));
  for (const q of s.decoys) {
    const dq = dist(m.x, m.y, q.x, q.y) * 0.8;
    if (dq < td) (tx = q.x), (ty = q.y), (tr = 0.04), (td = dq);
  }
  if (td > 1e8) return spar(s, m);
  // 내 몸이 다가오면(또는 맞으면) 떼 전체가 화를 낸다 — 그 전엔 저희끼리 논다
  if (!m.mad) {
    if (td < aggroR(s)) anger(s, m);
    else return spar(s, m);
  }
  const dd = dist(m.x, m.y, tx, ty), far = f.range > 0.2, reach = f.range + (far ? 0 : tr * 0.6);
  const a = angTo(m.x, m.y, tx, ty);
  if (dd <= reach && m.cool <= 0) {
    m.st = WIND;
    m.tm = f.wind;
    m.ang = a;
    m.ax = f.shape === 1 ? tx : m.x;
    m.ay = f.shape === 1 ? ty : m.y;
    m.face = Math.cos(a) > 0 ? 1 : -1;
    ev(s, 'wind', m.x, m.y, 0, 0, 0, m.k);
    return;
  }
  if (far && dd < f.range * 0.5) walk(s, m, a + Math.PI, d.spd * 0.6);
  else if (dd > reach * 0.92) walk(s, m, a, d.spd * MAD_SPD);
  else if (Math.abs(Math.cos(a)) > 0.25) m.face = Math.cos(a) > 0 ? 1 : -1;
}
/** 내 몸: 몸마다 다른 짓을 저절로 한다 — 타고 있는 동안이 구경거리 (이렇게 쓰러뜨린 적은 '한 번에' 수에 안 든다) */
function myStep(s: HopState, m: Mon) {
  if (m.inv > 0) m.inv--;
  if (m.st === SKILL) return skillStep(s, m);
  if (m.cool > 0) m.cool--;
  const d = KD[m.k], mul = skillMul(s);
  let o: Mon | null = null, od = 1e9;
  for (const q of s.mons) {
    if (!hittable(s, q)) continue;
    const dq = dist(m.x, m.y, q.x, q.y) - q.r * 0.6;
    if (dq < od) (od = dq), (o = q);
  }
  const a = o ? angTo(m.x, m.y, o.x, o.y) : m.ang;
  const turn = () => void (Math.abs(Math.cos(a)) > 0.25 && (m.face = Math.cos(a) > 0 ? 1 : -1));
  switch (m.k) {
    case 'bear':
      // 느리지만 한 방이 크다: 주먹을 번쩍 들었다가 퍽! 맞은 놈이 날아가며 줄줄이 넘어뜨린다
      if (m.tm > 0) {
        if (--m.tm === 0) {
          const t = s.mons.find((q) => q.id === m.spar && hittable(s, q));
          m.atkT = s.t;
          m.cool = 56;
          if (t && dist(m.x, m.y, t.x, t.y) < 0.2) {
            const pa = angTo(m.x, m.y, t.x, t.y);
            m.ang = pa;
            ev(s, 'punch', t.x, t.y - t.r, 0, 0, 0, m.k);
            hurt(s, t, 44 * mul, 0, Math.cos(pa) * 0.06, Math.sin(pa) * 0.06);
          }
        }
        break;
      }
      if (!o) break;
      if (od > 0.095) walk(s, m, a, d.spd * 1.3);
      else if (m.cool <= 0) (m.tm = 18), (m.spar = o.id), (m.ang = a), turn(), ev(s, 'windup', m.x, m.y - m.r * 2);
      else turn();
      break;
    case 'hedge': {
      // 데굴데굴 핀볼: 멈추지 않고 굴러다니며 벽과 적에 통통 튕긴다
      if (!m.legs) (m.legs = 9), (m.ang = o ? a : m.seed), (m.ult = 0);
      const c = Math.cos(m.ang), sn = Math.sin(m.ang);
      m.x += c * 0.0125;
      m.y += sn * 0.0125 * YS;
      m.walkT = s.t;
      m.wa = m.ang;
      if (Math.abs(c) > 0.2) m.face = c > 0 ? 1 : -1;
      if (m.sk > 0) m.sk--;
      else m.ult = 0;
      let hit = false;
      for (const q of s.mons) {
        if (!hittable(s, q) || q.dom > 0) continue;
        const dq = dist(m.x, m.y, q.x, q.y);
        if (dq > (m.r + q.r) * 0.85) continue;
        // 범퍼: 적은 밀려나고 나는 반대로 튕긴다 (이어 튕길수록 소리가 올라간다)
        const nx = dq > 1e-5 ? (m.x - q.x) / dq : 1, ny = dq > 1e-5 ? (m.y - q.y) / YS / dq : 0, dot = c * nx + sn * ny;
        q.dom = 20;
        m.ult = Math.min(12, m.ult + 1);
        m.sk = 50;
        ev(s, 'ping', q.x, q.y - q.r, m.ult);
        hurt(s, q, 7 * mul, 0, -nx * 0.018, -ny * 0.018);
        if (dot < 0) m.ang = Math.atan2(sn - 2 * dot * ny, c - 2 * dot * nx);
        hit = true;
        break;
      }
      const dc = dist(m.x, m.y, CX, CY);
      if (!hit && dc >= AR - m.r * 0.6) {
        const nx = (m.x - CX) / dc, ny = (m.y - CY) / YS / dc, dot = c * nx + sn * ny;
        keepIn(m);
        let na = Math.atan2(sn - 2 * dot * ny, c - 2 * dot * nx);
        if (o) {
          // 벽에서는 적이 많은 쪽으로 반쯤 꺾는다
          const df = bestDir(s, m.x, m.y, 0.06, 7 * mul, true) - na;
          na += Math.atan2(Math.sin(df), Math.cos(df)) * 0.5;
        }
        m.ang = na;
        ev(s, 'wall', m.x, m.y);
      }
      break;
    }
    case 'goat': {
      // 마당을 가로질러 박고, 벽에 쿵 하고는 돌아서 또 박는다
      if (m.tm > 0) {
        m.tm--;
        break;
      }
      if (!o) break;
      if (!m.legs) (m.legs = 1), (m.hits = []), (m.ang = bestDir(s, m.x, m.y, GOAT_W, 9 * mul, dist(m.x, m.y, CX, CY) > AR * 0.55)), ev(s, 'charge', m.x, m.y, 0, 0, 0, m.k);
      const c = Math.cos(m.ang), sn = Math.sin(m.ang);
      m.x += c * 0.019;
      m.y += sn * 0.019 * YS;
      m.walkT = s.t;
      m.wa = m.ang;
      if (Math.abs(c) > 0.2) m.face = c > 0 ? 1 : -1;
      for (const q of s.mons) {
        if (!hittable(s, q) || m.hits.includes(q.id)) continue;
        if (dist(m.x, m.y, q.x, q.y) > GOAT_W + q.r * 0.6) continue;
        m.hits.push(q.id);
        const side = Math.sign(-(q.x - m.x) * sn + ((q.y - m.y) / YS) * c) || 1;
        ev(s, 'bonk', q.x, q.y - q.r, 0, 0, 0, m.k);
        hurt(s, q, 9 * mul, 0, c * 0.03 - sn * side * 0.014, sn * 0.03 + c * side * 0.014);
      }
      if (dist(m.x, m.y, CX, CY) >= AR - m.r * 0.6) keepIn(m), (m.legs = 0), (m.tm = 18), ev(s, 'thud', m.x, m.y);
      break;
    }
    case 'frog':
      // 2초마다 혀로 하나를 끌어와 꿀꺽 (큰 놈은 못 삼키고 찰싹 끌어오기만)
      turn();
      if (m.cool <= 0 && o) {
        let t: Mon | null = null, tv = 0.47;
        for (const q of s.mons) {
          if (!hittable(s, q) || KD[q.k].boss || q.gulp > 0) continue;
          const v = dist(m.x, m.y, q.x, q.y) + (q.hp > 34 * mul ? 0.25 : 0);
          if (v < tv) (tv = v), (t = q);
        }
        if (t) {
          const dq = dist(m.x, m.y, t.x, t.y), ta = angTo(t.x, t.y, m.x, m.y), go = Math.max(0, dq - m.r * 0.5);
          m.cool = 104;
          m.atkT = s.t;
          m.ang = ta + Math.PI;
          m.face = t.x > m.x ? 1 : -1;
          s.lines.push({ k: 0, x0: m.x, y0: m.y - m.r, x1: t.x, y1: t.y - t.r, t: s.t, id: t.id });
          ev(s, 'lick', m.x, m.y - m.r);
          t.vx = Math.cos(ta) * go * 0.15;
          t.vy = Math.sin(ta) * go * 0.15;
          t.air = 14;
          t.stun = Math.max(t.stun, 30);
          if (t.st === WIND || t.st === DASH) (t.st = REST), (t.tm = 30);
          if (t.hp <= 34 * mul && t.shield <= 0) t.gulp = 12;
          else hurt(s, t, 14 * mul, 0);
        }
      }
      if (o && od > 0.32) walk(s, m, a, d.spd);
      break;
    case 'turtle':
      // 빙글빙글: 다가오는 적을 등껍질로 통통 튕겨 낸다
      if (o && od > 0.03) walk(s, m, a, d.spd * 1.7);
      if ((s.t + m.seed) % 22 === 0 && o && od < 0.22) ev(s, 'whirl', m.x, m.y, 0, 0.13);
      for (const q of s.mons) {
        if (!hittable(s, q) || q.dom > 0) continue;
        const dq = dist(m.x, m.y, q.x, q.y);
        if (dq > m.r + q.r + 0.014) continue;
        const qa = dq > 1e-5 ? angTo(m.x, m.y, q.x, q.y) : q.seed;
        q.dom = 22;
        ev(s, 'bump2', q.x, q.y - q.r);
        hurt(s, q, 5 * mul, 0, Math.cos(qa) * 0.024, Math.sin(qa) * 0.024);
      }
      break;
    case 'cloud':
      // 둥실 떠다니며 가까운 적부터 셋에게 찌릿찌릿
      if (o && od > 0.12) walk(s, m, a, d.spd * 1.3);
      if (m.cool <= 0 && o && od < 0.36) (m.cool = 64), (m.atkT = s.t), s.q.push({ t: s.t, k: 'bolt', x: m.x, y: m.y, r: 0.4, dmg: 9 * mul, src: 0, left: 3, hit: [] });
      break;
    case 'shroom':
      // 뒤뚱뒤뚱 걸으며 포자를 퐁퐁: 묻은 적은 터질 때 옆도 터뜨린다
      if (o && od > 0.08) walk(s, m, a, d.spd * 1.3);
      if (m.cool <= 0 && o && od < 0.19) {
        m.cool = 80;
        m.atkT = s.t;
        ev(s, 'puff', m.x, m.y, 0, 0.18);
        for (const q of s.mons) if (hittable(s, q) && dist(m.x, m.y, q.x, q.y) < 0.18) (q.spore = 900), hurt(s, q, 4 * mul, 0);
      }
      break;
    case 'tanuki':
      // 분신 둘과 함께 나뭇잎을 휙휙 던진다
      if (o && od > 0.22) walk(s, m, a, d.spd);
      else turn();
      if (m.cool <= 0 && o && od < 0.36) {
        m.cool = 50;
        m.atkT = s.t;
        for (const [tx, ty] of [[m.x, m.y], ...s.decoys.map((q) => [q.x, q.y])]) {
          let t: Mon | null = null, td = 0.36;
          for (const q of s.mons) if (hittable(s, q) && dist(tx, ty, q.x, q.y) < td) (td = dist(tx, ty, q.x, q.y)), (t = q);
          if (!t) continue;
          s.lines.push({ k: 1, x0: tx, y0: ty - 0.05, x1: t.x, y1: t.y - t.r, t: s.t, id: 0 });
          ev(s, 'leaf', t.x, t.y - t.r);
          hurt(s, t, 6 * mul, 0);
        }
      }
      break;
    default:
      // 콩알이는 폴짝 깨물고, 대장 몸은 쿵쿵 걸으며 큰 기술을 저절로 되풀이한다 (싹쓸이)
      if (!o) break;
      if (d.boss && ++m.ult >= 150 && others(s) >= 3) return void ((m.st = SKILL), (m.sk = 0), (m.sksrc = 0), (m.ult = 0));
      if (od > d.me.range) walk(s, m, a, d.spd * 1.2);
      else {
        turn();
        if (m.cool <= 0) {
          m.cool = d.me.per;
          m.atkT = s.t;
          m.ang = a;
          ev(s, 'myhit', o.x, o.y - o.r, 0, 0, 0, m.k);
          blast(s, o.x, o.y, d.me.r, d.me.dmg * mul, 0, 0.008);
        }
      }
  }
}
function physics(s: HopState) {
  const L = s.mons;
  for (const m of L) {
    if (m.dead || m.st === ENTER) continue;
    if (m.vx || m.vy) {
      m.x += m.vx;
      m.y += m.vy * YS;
      m.vx *= 0.85;
      m.vy *= 0.85;
      if (Math.abs(m.vx) + Math.abs(m.vy) < 0.0006) m.vx = m.vy = 0;
    }
    if (m.air > 0) m.air--;
  }
  for (let i = 0; i < L.length; i++) {
    const a = L[i];
    if (a.dead || a.st === ENTER) continue;
    for (let j = i + 1; j < L.length; j++) {
      const b = L[j];
      if (b.dead || b.st === ENTER) continue;
      const dx = b.x - a.x, dy = (b.y - a.y) / YS, d = hyp(dx, dy), min = (a.r + b.r) * 0.86;
      if (d >= min) continue;
      // 도미노: 세게 밀려난 적이 다른 적에 부딪히면 그 적도 다치고 밀린다
      for (const [p, q] of [[a, b], [b, a]] as [Mon, Mon][]) {
        const sp = hyp(p.vx, p.vy);
        if (sp > 0.012 && p.dom === 0 && p.id !== s.me && q.id !== s.me && hittable(s, q)) {
          p.dom = 14;
          q.dom = 14;
          ev(s, 'domino', q.x, q.y - q.r);
          hurt(s, q, 12 * skillMul(s), p.src, p.vx * 0.7, p.vy * 0.7);
          p.vx *= 0.6;
          p.vy *= 0.6;
        }
      }
      if (a.dead || b.dead) continue;
      const ux = d > 1e-5 ? dx / d : Math.cos(a.seed), uy = d > 1e-5 ? dy / d : Math.sin(a.seed), push = min - d;
      const wa = a.id === s.me || KD[a.k].boss || a.st === CLAIM ? 0.12 : 1, wb = b.id === s.me || KD[b.k].boss || b.st === CLAIM ? 0.12 : 1;
      const ka = (wa / (wa + wb)) * push * 0.6, kb = (wb / (wa + wb)) * push * 0.6;
      if (a.st !== SKILL) (a.x -= ux * ka), (a.y -= uy * ka * YS);
      if (b.st !== SKILL) (b.x += ux * kb), (b.y += uy * kb * YS);
    }
  }
  for (const m of L) if (!m.dead && m.st !== ENTER && !(m.st === SKILL && m.legs > 0)) keepIn(m);
}
function queueStep(s: HopState) {
  if (!s.q.length) return;
  const due = s.q.filter((q) => q.t <= s.t);
  if (!due.length) return;
  s.q = s.q.filter((q) => q.t > s.t);
  for (const q of due) {
    if (q.k === 'burst') ev(s, 'burst', q.x, q.y, 0, q.r), blast(s, q.x, q.y, q.r, q.dmg, q.src, 0.012);
    else if (q.k === 'pop2') ev(s, 'pop', q.x, q.y, q.left ? 2 : 1, q.r), blast(s, q.x, q.y, q.r, q.dmg, q.src, 0.018);
    else if (q.k === 'swarm') {
      s.swarmed = true;
      enqueue(s, STAGES[s.stage].swarm ?? []);
      ev(s, 'wave', GATE_X, GATE_Y, 9);
    } else {
      // 번개 한 칸: 가장 가까운, 아직 안 맞은 적으로
      let o: Mon | null = null, od = q.r;
      for (const m of s.mons) {
        if (!hittable(s, m) || q.hit.includes(m.id)) continue;
        const d = dist(q.x, q.y, m.x, m.y);
        if (d < od) (od = d), (o = m);
      }
      if (!o) continue;
      s.lines.push({ k: 2, x0: q.x, y0: q.y - 0.04, x1: o.x, y1: o.y - o.r, t: s.t, id: 0 });
      ev(s, 'zap', o.x, o.y - o.r, q.hit.length);
      const nx = o.x, ny = o.y;
      o.stun = Math.max(o.stun, 20);
      hurt(s, o, q.dmg, q.src);
      if (q.left > 1) s.q.push({ ...q, t: s.t + 3, x: nx, y: ny, r: q.r > 1 ? q.r : 0.22, left: q.left - 1, hit: [...q.hit, o.id] });
    }
  }
}

// ───────────────────────────── 판 흐름 ─────────────────────────────
function clearStage(s: HopState) {
  const d = STAGES[s.stage];
  s.phase = 'result';
  s.pt = 0;
  s.starOk = [true, s.kos === 0, s.best >= d.n];
  s.got = s.starOk.filter(Boolean).length;
  s.stars += s.got;
  s.gain = (s.sp + CLEAR_PTS) * STAR_MUL[s.got];
  s.pts += s.gain;
  s.sp = 0;
  s.lv++;
  see(s, 'lv' + s.lv);
  s.spot = null;
  if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * 30);
  ev(s, 'clear', CX, CY, s.got);
}
function advance(s: HopState) {
  const d = STAGES[s.stage];
  if (s.won) return void ((s.phase = 'end'), (s.pt = 0), ev(s, 'end', CX, CY, 1));
  if (d.shield && d.ch < PERKS.length && !s.perk[d.ch]) return void ((s.phase = 'pick'), (s.pt = 0), (s.picked = -1), see(s, 'pick' + d.ch), ev(s, 'pickopen', CX, CY));
  s.stage++;
  newStage(s);
}
function playStep(s: HopState) {
  const d = STAGES[s.stage];
  if (s.fly && ++s.fly.t >= s.fly.T) arrive(s);
  const b = body(s);
  if (s.dizzy > 0) {
    if (--s.dizzy === 0) (s.charge = 1), ev(s, 'ready', s.gx, s.gy);
  } else if (b && s.charge < 1) {
    s.charge = Math.min(1, s.charge + 1 / CHARGE_T);
    if (s.charge >= 1) (s.readyT = s.t), ev(s, 'ready', b.x, b.y);
  }
  if (b) (s.gx = b.x), (s.gy = b.y - b.r);
  const floating = !b && !s.fly && !s.home;
  // 몸 밖의 유령: 4초(1판은 얼마든지) 안에 아무 적이나 톡 — 지나면 하트 -1 뒤 가장 가까운 적에게 저절로(막힘 없음)
  if (floating && s.dizzy === 0 && s.stage > 0 && s.mons.some((m) => ridable(s, m))) {
    if (++s.out >= OUT_T) {
      s.hearts--;
      ev(s, 'heart', s.gx, s.gy);
      see(s, 'heart');
      if (s.hearts <= 0) return void ((s.phase = 'end'), (s.pt = 0), ev(s, 'end', CX, CY, 0));
      let o: Mon | null = null, od = 1e9;
      for (const m of s.mons) if (ridable(s, m) && dist(s.gx, s.gy, m.x, m.y) < od) (od = dist(s.gx, s.gy, m.x, m.y)), (o = m);
      if (o) hopTo(s, o);
    }
  }
  // 유령이 떠다니는 동안 세상은 살짝 느리게 흐른다 (다음 몸을 고를 틈)
  if (floating) {
    s.slow += FLOAT_SLOW;
    if (s.slow < 1) return;
    s.slow -= 1;
  }
  // 한 몸에 오래 있어 멀리서도 몰려오기 시작하는 순간: 내 몸 위에 '!' 한 번
  if (b && !s.alerted && s.t - s.inT > AGGRO_WAIT && s.mons.some((m) => !m.mad && hittable(s, m))) (s.alerted = true), ev(s, 'alert', b.x, b.y - b.r * 2);
  for (const m of s.mons) {
    if (m.dead) continue;
    if (m.id === s.me) myStep(s, m);
    else foeStep(s, m);
  }
  physics(s);
  queueStep(s);
  if (s.decoys.length) {
    for (const q of s.decoys) if (q.hp <= 0) ev(s, 'poof', q.x, q.y);
    s.decoys = s.decoys.filter((q) => q.hp > 0);
  }
  if (s.mons.some((m) => m.dead)) s.mons = s.mons.filter((m) => !m.dead);
  // 문으로 우르르: 줄 선 떼가 자리가 나는 대로 한 마리씩 들어온다
  if (s.inbox.length && --s.gateT <= 0 && others(s) < CAP) {
    const k = s.inbox.shift()!, kd = KD[k], [x, y] = freeSpot(s, kd.r, AR - 0.05 - kd.r, 0.04);
    add(s, k, x, y, true);
    s.gateT = GATE_EVERY;
  }
  // 다음 물결(마당의 적이 줄면 쉴 틈 없이) · 대장의 졸개 부르기
  const n = others(s) + s.inbox.length;
  if (s.hopped) s.waveT++;
  if (s.hopped && s.wave < d.waves.length && (n <= d.waves[s.wave].need || s.waveT >= d.waves[s.wave].wait)) spawnWave(s);
  const boss = d.shield ? s.mons.find((m) => KD[m.k].boss && m.id !== s.me) : undefined;
  if (boss && s.hopped && d.summon && !s.inbox.length) {
    const minions = n - 1;
    if (++s.summonT >= 150 || (minions <= 4 && s.summonT >= 30)) (s.summonT = 0), minions <= 9 && (enqueue(s, d.summon), ev(s, 'summon', boss.x, boss.y - boss.r));
  }
  const pending = s.q.some((q) => q.k === 'swarm') || (!!d.swarm && s.rode && !s.swarmed);
  if (s.hopped && s.wave >= d.waves.length && n === 0 && !s.fly && !pending) {
    if (++s.clearT >= 44) clearStage(s);
  } else s.clearT = 0;
}

const game: GameDef<HopState> & { wows(s: HopState): number } = {
  id: 'bodyhop',
  name: '👻 몸 갈아타기',
  genes: ['bodyhop', 'chain', 'collect'],
  twist: '적은 쓰러뜨릴 것이 아니라 탈 것 — 톡 한 적의 몸으로 옮겨 타면 버린 몸이 펑 터지고 새 몸의 큰 기술이 바로 나가서, 센 적이 나올수록 반갑다',
  rules: [
    '적을 톡 하면 유령이 그 몸으로 옮겨 타요. 싸움은 몸이 저절로 해요.',
    '버린 몸은 펑! 둘레의 적이 함께 터지고, 새 몸은 타자마자 큰 기술 한 방.',
    '몸이 쓰러지면 4초 안에 아무 적이나 톡. 마당을 비우면 다음 판!',
  ],
  controls: 'touch',
  hint: '적을 톡 — 유령이 그 몸으로 옮겨 타요 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '한낮의 몬스터 씨름 마당 — 스티커 그림책',
    mood: '만국기가 걸린 밝은 씨름 마당에서 동글동글한 몬스터들이 투닥거린다. 하늘색 꼬마 유령이 슝 날아가 쏙 들어가면 그 몸의 눈이 반짝이고, 버린 몸은 색종이처럼 펑 터진다.',
    palette: { bg: '#8fd6f2', ink: '#3b2a20', muted: '#8a7a66', accent: '#5ad1ff', hot: '#ff5a4e', soft: '#f6e7c1' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.hearts,
  cleared: (s) => (s.phase === 'result' ? { stage: s.stage, got: s.got, of: 3 } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, hearts: 3, pts: 0, sp: 0, stars: 0, got: 0, starOk: [false, false, false], dead: false, won: false,
      lv: 1, perk: [0, 0], picked: -1, dex: [], newDex: [], mons: [], nid: 0, me: 0, gx: HOME_X, gy: HOME_Y, home: true, fly: null,
      charge: 1, dizzy: 0, out: 0, hopped: false, hops: 0, inT: 0, hop: { id: 0, t: -999, n: 0 }, best: 0, kos: 0, kills: 0, gain: 0,
      wave: 0, waveT: 0, summonT: 0, swarmed: false, rode: false, clearT: 0, inbox: [], gateT: 0, sealed: false, slow: 0, alerted: false, decoys: [], q: [], corpses: [], events: [], lines: [],
      freeze: 0, down: false, wowN: 0, firstTap: -1, firstBig: -1, denyT: -99, readyT: -99, seen: new Set<string>(), banner: null, spot: null, big: null,
    } as HopState;
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
    if (s.events.length > 90) s.events.splice(0, s.events.length - 90);
    while (s.events.length && s.t - s.events[0].t > 120) s.events.shift();
    if (s.lines.length) s.lines = s.lines.filter((l) => s.t - l.t < 16);
    if (s.corpses.length) s.corpses = s.corpses.filter((c) => s.t - c.t < 46);
    if (s.spot && s.t - s.spot.t > 200 && !(s.spot.label.startsWith('대장') && !s.rode)) s.spot = null;
  },
  over: (s) => s.dead,
  score: (s) => s.pts + s.sp,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const bodyhop = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
const tapOn = (m: Mon) => at(m.x, m.y - m.r * 0.8);
const canHop = (s: HopState) => s.phase === 'play' && !s.down && !s.fly && s.charge >= 1 && s.dizzy === 0;
/** 결과 화면·둘 중 하나는 버릇 봇도 그냥 넘긴다 */
function between(s: HopState, left: boolean): Input | null {
  if (s.phase === 'play') return null;
  if (s.down) return NO;
  if (s.phase === 'result') return s.pt >= RES_MIN ? at(0.5, 0.8) : NO;
  if (s.phase === 'pick') return s.picked < 0 && s.pt >= PICK_MIN ? at(left ? 0.28 : 0.72, 0.86) : NO;
  return NO;
}

/** 이 몸으로 지금 갈아타면 몇 마리가 터질까 (버린 몸의 펑 + 새 몸의 등장 기술) — 어림셈 */
function judge(s: HopState, c: Mon): { kills: number; soft: number; pop: number; near: number } {
  const b = body(s), mul = skillMul(s), hp = new Map<number, number>();
  const list = s.mons.filter((o) => hittable(s, o) && o !== c);
  for (const o of list) hp.set(o.id, o.shield > 0 ? 1e6 + o.shield : o.hp / (o.frozen > 0 ? 1.5 : 1));
  let soft = 0;
  const hit = (o: Mon, dmg: number) => {
    const v = hp.get(o.id)!;
    if (v > 1e5) soft += Math.min(dmg, v - 1e6) * 0.06;
    hp.set(o.id, v - dmg);
  };
  const ring = (x: number, y: number, r: number, dmg: number) => {
    for (const o of list) if (dist(x, y, o.x, o.y) <= r + o.r * 0.5) hit(o, dmg);
  };
  const ray = (x: number, y: number, wd: number, dmg: number) => {
    let ba = 0, bn = -1;
    for (let k = 0; k < 24; k++) {
      const a = (k * TAU) / 24 + 0.01, cs = Math.cos(a), sn = Math.sin(a), px = x - CX, py = (y - CY) / YS;
      const q = px * cs + py * sn, L = -q + Math.sqrt(Math.max(0, q * q - (px * px + py * py - AR * AR)));
      let n = 0;
      for (const o of list) {
        const ox = o.x - x, oy = (o.y - y) / YS, u = ox * cs + oy * sn;
        if (u >= 0 && u <= L && Math.abs(-ox * sn + oy * cs) <= wd + o.r * 0.6 && hp.get(o.id)! > 0) n += hp.get(o.id)! <= dmg ? 1 : 0.4;
      }
      if (n > bn) (bn = n), (ba = a);
    }
    const cs = Math.cos(ba), sn = Math.sin(ba);
    for (const o of list) {
      const ox = o.x - x, oy = (o.y - y) / YS, u = ox * cs + oy * sn;
      if (u >= 0 && Math.abs(-ox * sn + oy * cs) <= wd + o.r * 0.6) hit(o, dmg);
    }
  };
  if (b) {
    const r = popR(s, b.k), dmg = popDmg(s) * (s.perk[0] === 1 ? 1.7 : 1), rr = s.perk[1] === 1 ? r * 1.5 : r;
    ring(b.x, b.y, rr, dmg);
    for (const d of s.decoys) ring(d.x, d.y, r * 0.95, popDmg(s));
  }
  let pop = 0;
  for (const o of list) if (hp.get(o.id)! <= 0) pop++;
  const near = (r: number) => list.reduce((a, o) => a + (hp.get(o.id)! > 0 && dist(c.x, c.y, o.x, o.y) < r ? 1 : 0), 0);
  const gather = c.k === 'frog' ? near(FROG_R) : c.k === 'turtle' ? near(TURTLE_R) : c.k === 'shroom' ? near(SPORE_R) : c.k === 'tanuki' ? near(0.5) : 0;
  switch (c.k) {
    case 'bean': ring(c.x, c.y, 0.09, 14 * mul); soft -= 0.6; break;
    case 'bear': ring(c.x, c.y, BEAR_R, 38 * mul); break;
    case 'hedge': ray(c.x, c.y, HEDGE_W, 24 * mul); soft += Math.min(2, near(0.5) * 0.12); break;
    case 'goat': ray(c.x, c.y, GOAT_W, 26 * mul); soft += Math.min(1.5, near(0.5) * 0.1); break;
    case 'frog': soft += Math.min(4, near(FROG_R) * 0.4); break;
    case 'mole': ring(c.x, c.y, MOLE_R, 70 * mul); break;
    case 'turtle': ring(c.x, c.y, 0.14, 27 * mul); soft += Math.min(3, near(TURTLE_R) * 0.3); break;
    case 'cloud': {
      let x = c.x, y = c.y, r = 0.4;
      const done = new Set<number>();
      for (let k = 0; k < BOLT_N; k++) {
        let o: Mon | null = null, od = r;
        for (const q of list) if (!done.has(q.id) && dist(x, y, q.x, q.y) < od) (od = dist(x, y, q.x, q.y)), (o = q);
        if (!o) break;
        done.add(o.id);
        hit(o, 30 * mul);
        x = o.x;
        y = o.y;
        r = 0.22;
      }
      break;
    }
    case 'shroom': soft += Math.min(4, near(SPORE_R) * 0.35); break;
    case 'tanuki': soft += 2.5; break;
    default: ring(c.x, c.y, 2, 999);
  }
  let kills = 0;
  for (const o of list) if (hp.get(o.id)! <= 0) kills++;
  return { kills, soft, pop, near: gather };
}

const waitMem = new WeakMap<object, { key: string; since: number }>();
/** 봇: 가장 많이 터지는 몸을 골라, 붐빌 때 갈아탄다 */
export const bodyhopSmart: Bot<HopState> = {
  name: '많이 터질 때 센 몸으로',
  act(s) {
    const mid = between(s, true);
    if (mid) return mid;
    if (!canHop(s)) return NO;
    const b = body(s), d = STAGES[s.stage];
    // 별 셋째는 (대장 판에서는 보호막이 깨지기 전까지) 한 번에 N마리 — 아직이면 붐빌 때까지 버틴다
    const seek = s.best < d.n && !s.sealed, n = others(s), want = Math.min(Math.max(1, n - 1), seek ? d.n : Math.max(6, d.n - 3));
    let best: Mon | null = null, bv = -1e9, bk = 0, setup: Mon | null = null, sn = 0, popNow = 0;
    for (const m of s.mons) {
      if (!ridable(s, m)) continue;
      const j = judge(s, m);
      let v = j.kills + j.soft + KD[m.k].hp * 0.012 + KD[m.k].pop * 6;
      // 보호막이 깨진 대장 몸은 바로 탄다 (순수한 보상)
      if (KD[m.k].boss) v += 50;
      if (!s.dex.includes(m.k)) v += 1.5;
      if (v > bv) (bv = v), (best = m), (bk = j.kills);
      if (j.near > sn) (sn = j.near), (setup = m);
      popNow = j.pop;
    }
    if (!best) return NO;
    if (!b) return tapOn(setup && seek && sn >= 7 && bk < want ? setup : best);
    const key = `${s.stage}:${s.hop.id}`;
    let w = waitMem.get(s);
    if (!w || w.key !== key) waitMem.set(s, (w = { key, since: s.t }));
    const waited = s.t - w.since;
    const urgent = b.hp / b.max < 0.4 || (b.max < 30 && b.hp / b.max < 0.8);
    if (urgent || bk >= want) return tapOn(best);
    // 모으는 수: 끌어모으는 몸(개구리·거북·버섯·너구리) 둘레가 붐비고 지금 펑이 작으면, 먼저 타서 모은 뒤 다음에 터뜨린다
    if (seek && setup && sn >= 7 && popNow < 4 && setup.k !== b.k) return tapOn(setup);
    if (waited > (seek ? 200 : 140)) return tapOn(best);
    return NO;
  },
};

/** 봇: 아무 때나 아무 데나 톡 */
export const bodyhopRandom: Bot<HopState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    if (s.down) return NO;
    return rng() < 1 / 40 ? at(0.06 + rng() * 0.88, 0.42 + rng() * 0.8) : NO;
  },
};

/** 버릇 봇: 기운이 차면 늘 가장 가까운 적으로 */
export const bodyhopHabit: Bot<HopState> = {
  name: '버릇: 늘 가장 가까운 적',
  act(s) {
    const mid = between(s, true);
    if (mid) return mid;
    if (!canHop(s)) return NO;
    const b = body(s), x = b ? b.x : s.gx, y = b ? b.y : s.gy;
    let best: Mon | null = null, bd = 1e9;
    for (const m of s.mons) if (ridable(s, m) && dist(x, y, m.x, m.y) < bd) (bd = dist(x, y, m.x, m.y)), (best = m);
    return best ? tapOn(best) : NO;
  },
};

/** 독립 버릇 봇: 기운이 차면 늘 가장 큰 적으로 */
export const bodyhopHabit2: Bot<HopState> = {
  name: '버릇: 늘 가장 큰 적',
  act(s) {
    const mid = between(s, false);
    if (mid) return mid;
    if (!canHop(s)) return NO;
    const b = body(s), x = b ? b.x : s.gx, y = b ? b.y : s.gy;
    let best: Mon | null = null, bv = -1e9;
    for (const m of s.mons) {
      if (!ridable(s, m)) continue;
      const v = m.max * 10 - dist(x, y, m.x, m.y);
      if (v > bv) (bv = v), (best = m);
    }
    return best ? tapOn(best) : NO;
  },
};

/** 측정용(등록 안 함): 기운이 찬 뒤 2초 기다렸다가 가장 가까운 적 — '기다리기만 하면 되나'를 잰다 */
export const bodyhopPatient: Bot<HopState> = {
  name: '버릇: 2초 기다렸다 가까운 적',
  act(s) {
    const mid = between(s, true);
    if (mid) return mid;
    if (!canHop(s)) return NO;
    const b = body(s), x = b ? b.x : s.gx, y = b ? b.y : s.gy;
    if (b && s.t - s.readyT < 120 && b.hp / b.max > 0.35) return NO;
    let best: Mon | null = null, bd = 1e9;
    for (const m of s.mons) if (ridable(s, m) && dist(x, y, m.x, m.y) < bd) (bd = dist(x, y, m.x, m.y)), (best = m);
    return best ? tapOn(best) : NO;
  },
};
/** 측정·스크린샷용: k판으로 건너뛰기 */
export const __jump = (s: HopState, k: number, lv = k + 1, perk: number[] = [k > 3 ? 1 : 0, k > 7 ? 1 : 0]) => ((s.stage = k), (s.lv = lv), (s.perk = perk), newStage(s));

// ───────────────────────────── 그리기: 도구 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const OUT = '#4b3020';
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
/** 단위 좌표: 몸 반지름 = 1, 발 가운데 = (0,0), 위쪽이 -y. 테두리 굵기 */
const LW = 0.1;
/** 표정: 평소 · 화남 · 뜸(으르렁) · 아야 · 어질 · 유령이 탐 · 유령이 탄 채 아야 · 신남 · 유령이 탄 채 으랏차 */
const M_IDLE = 0, M_ANGRY = 1, M_WIND = 2, M_HURT = 3, M_DIZZY = 4, M_MINE = 5, M_MINEHIT = 6, M_HAPPY = 7, M_MINEATK = 8;

/** 얼굴: (cx,cy) = 두 눈 사이, e = 눈 간격의 절반, s = 눈 크기, my = 입까지 거리(0이면 입 없음), mw = 입 너비 배수 */
function face(g: C2, cx: number, cy: number, e: number, s: number, mood: number, my: number, mw = 1) {
  const mine = mood === M_MINE || mood === M_MINEHIT || mood === M_MINEATK, roar = mood === M_WIND || mood === M_MINEATK;
  g.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const x = cx + sd * e, y = cy;
    if (mood === M_HURT || mood === M_MINEHIT) {
      g.strokeStyle = mine ? '#1aa7e0' : OUT;
      g.lineWidth = s * 0.36;
      g.beginPath();
      g.moveTo(x - sd * s * 0.7, y - s * 0.6);
      g.lineTo(x + sd * s * 0.5, y);
      g.lineTo(x - sd * s * 0.7, y + s * 0.6);
      g.stroke();
    } else if (mood === M_DIZZY) {
      g.strokeStyle = OUT;
      g.lineWidth = s * 0.26;
      g.beginPath();
      for (let i = 0; i <= 14; i++) {
        const a = i * 0.75, q = s * (0.12 + i * 0.058);
        if (i) g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
        else g.moveTo(x + q, y);
      }
      g.stroke();
    } else if (mood === M_HAPPY) {
      g.strokeStyle = OUT;
      g.lineWidth = s * 0.36;
      g.beginPath();
      g.arc(x, y + s * 0.3, s * 0.7, Math.PI * 1.12, Math.PI * 1.88);
      g.stroke();
    } else {
      const wide = roar ? 1.12 : 1;
      ell(g, x, y, s * 0.86 * wide, s * 1.0 * wide);
      ink(g, mine ? '#e9ffff' : '#ffffff', s * 0.2);
      if (mine) {
        ell(g, x, y + s * 0.05, s * 0.56, s * 0.68);
        g.fillStyle = radg(g, x, y, 0, s * 0.7, [0, '#ffffff'], [0.45, '#7fe9ff'], [1, '#12a6e8']);
        g.fill();
        ell(g, x - s * 0.2, y - s * 0.28, s * 0.2, s * 0.24);
        g.fillStyle = '#ffffff';
        g.fill();
      } else {
        ell(g, x + s * 0.1, y + s * (roar ? 0 : 0.1), s * (roar ? 0.34 : 0.46), s * (roar ? 0.4 : 0.56));
        g.fillStyle = '#2a1a12';
        g.fill();
        ell(g, x - s * 0.06, y - s * 0.16, s * 0.17, s * 0.2);
        g.fillStyle = '#ffffff';
        g.fill();
      }
      if (mood === M_ANGRY || roar) {
        g.strokeStyle = OUT;
        g.lineWidth = s * 0.42;
        g.beginPath();
        g.moveTo(x + sd * s * 1.05, y - s * 1.65);
        g.lineTo(x - sd * s * 0.75, y - s * 0.95);
        g.stroke();
      }
    }
  }
  if (my <= 0) return;
  const y = cy + my, w = s * 1.25 * mw;
  g.strokeStyle = OUT;
  g.lineWidth = s * 0.3;
  if (roar) {
    ell(g, cx, y + s * 0.2, w * 0.75, s * 0.8);
    ink(g, '#8c2f2f', s * 0.26);
    ell(g, cx, y + s * 0.55, w * 0.42, s * 0.34);
    g.fillStyle = '#ff8a8a';
    g.fill();
  } else if (mood === M_HURT || mood === M_MINEHIT) {
    ell(g, cx, y + s * 0.15, s * 0.42, s * 0.5);
    ink(g, '#8c2f2f', s * 0.24);
  } else if (mood === M_DIZZY) {
    g.beginPath();
    g.moveTo(cx - w, y);
    g.quadraticCurveTo(cx - w * 0.5, y - s * 0.5, cx, y);
    g.quadraticCurveTo(cx + w * 0.5, y + s * 0.5, cx + w, y);
    g.stroke();
  } else if (mood === M_ANGRY) {
    g.beginPath();
    g.moveTo(cx - w * 0.8, y + s * 0.3);
    g.quadraticCurveTo(cx, y - s * 0.45, cx + w * 0.8, y + s * 0.3);
    g.stroke();
  } else if (mood === M_HAPPY || mood === M_MINE) {
    g.beginPath();
    g.moveTo(cx - w, y - s * 0.15);
    g.quadraticCurveTo(cx, y + s * 1.35, cx + w, y - s * 0.15);
    g.closePath();
    ink(g, mood === M_MINE ? '#ffffff' : '#8c2f2f', s * 0.26);
    if (mood === M_MINE) {
      g.lineWidth = s * 0.14;
      g.beginPath();
      g.moveTo(cx - w * 0.33, y - s * 0.05);
      g.lineTo(cx - w * 0.33, y + s * 0.42);
      g.moveTo(cx + w * 0.33, y - s * 0.05);
      g.lineTo(cx + w * 0.33, y + s * 0.42);
      g.stroke();
    }
  } else {
    g.beginPath();
    g.moveTo(cx - w * 0.7, y);
    g.quadraticCurveTo(cx, y + s * 0.75, cx + w * 0.7, y);
    g.stroke();
  }
}
/** 볼 터치 */
function blush(g: C2, cx: number, cy: number, e: number, r: number) {
  g.fillStyle = 'rgba(255,120,130,.42)';
  for (const sd of [-1, 1]) ell(g, cx + sd * e, cy, r, r * 0.62), g.fill();
}
/** 반짝 (왼쪽 위 흰 빛) */
function shine(g: C2, x: number, y: number, rx: number, ry: number, rot = -0.5) {
  g.fillStyle = 'rgba(255,255,255,.45)';
  ell(g, x, y, rx, ry, rot);
  g.fill();
}
/** 왕관 */
function crown(g: C2, x: number, y: number, k: number) {
  g.beginPath();
  g.moveTo(x - k, y);
  g.lineTo(x - k * 1.1, y - k * 0.95);
  g.lineTo(x - k * 0.5, y - k * 0.5);
  g.lineTo(x, y - k * 1.2);
  g.lineTo(x + k * 0.5, y - k * 0.5);
  g.lineTo(x + k * 1.1, y - k * 0.95);
  g.lineTo(x + k, y);
  g.closePath();
  ink(g, lin(g, x, y - k * 1.2, x, y, [0, '#fff3a8'], [1, '#f5b921']), LW * 0.9);
  for (const [dx, c] of [[-0.55, '#ff5a6e'], [0, '#49c8ff'], [0.55, '#ff5a6e']] as [number, string][]) ell(g, x + dx * k, y - k * 0.22, k * 0.13, k * 0.13), ink(g, c, LW * 0.4);
}

const BEAN_COL = [['#9fe05c', '#d3f79a', '#5fb53a'], ['#c6e454', '#ecf8a4', '#8fb52e'], ['#7fdc8e', '#c4f6cc', '#3fae62']];
/** 몬스터 그리기 (단위 좌표) */
const PAINT: Record<K, (g: C2, mood: number, v: number) => void> = {
  bean(g, mood, v) {
    const [c, lt, dk] = BEAN_COL[v % 3];
    g.beginPath();
    g.moveTo(0, -1.8);
    g.quadraticCurveTo(0.05, -2.2, 0.3, -2.3);
    g.strokeStyle = OUT;
    g.lineWidth = LW * 1.3;
    g.stroke();
    ell(g, 0.48, -2.36, 0.36, 0.19, -0.35);
    ink(g, dk);
    ell(g, 0, -0.95, 0.98, 0.93);
    ink(g, lin(g, 0, -1.9, 0, 0, [0, c], [1, dk]), LW * 1.25);
    ell(g, 0, -0.62, 0.62, 0.48);
    g.fillStyle = lt;
    g.globalAlpha = 0.75;
    g.fill();
    g.globalAlpha = 1;
    shine(g, -0.42, -1.5, 0.3, 0.15);
    face(g, 0.04, -1.08, 0.38, 0.27, mood, 0.45);
    blush(g, 0.04, -0.82, 0.66, 0.15);
  },
  bear(g, mood) {
    for (const sd of [-1, 1]) {
      ell(g, sd * 0.72, -1.92, 0.34, 0.34);
      ink(g, '#a9682f');
      ell(g, sd * 0.72, -1.9, 0.17, 0.17);
      g.fillStyle = '#f2b6a0';
      g.fill();
    }
    ell(g, 0, -1.0, 1.02, 1.03);
    ink(g, lin(g, 0, -2, 0, 0, [0, '#c98a4a'], [1, '#9c5f2a']), LW * 1.15);
    ell(g, 0, -0.56, 0.66, 0.5);
    g.fillStyle = '#f1d3a2';
    g.fill();
    shine(g, -0.45, -1.62, 0.3, 0.14);
    ell(g, 0, -0.98, 0.42, 0.3);
    ink(g, '#f6e2bd', LW * 0.6);
    ell(g, 0, -1.1, 0.15, 0.1);
    g.fillStyle = '#3a2418';
    g.fill();
    face(g, 0, -1.36, 0.42, 0.2, mood === M_IDLE ? M_ANGRY : mood, mood === M_WIND || mood === M_MINEATK || mood === M_HURT || mood === M_MINEHIT ? 0.52 : 0.46, 0.8);
    // 돌주먹
    for (const sd of [-1, 1]) {
      ell(g, sd * 1.12, -0.6, 0.47, 0.44);
      ink(g, lin(g, 0, -1.05, 0, -0.15, [0, '#c3ccd6'], [1, '#8b95a3']), LW * 1.1);
      g.strokeStyle = '#6d7684';
      g.lineWidth = LW * 0.55;
      g.beginPath();
      g.moveTo(sd * 1.0, -0.86);
      g.lineTo(sd * 1.12, -0.66);
      g.lineTo(sd * 1.02, -0.5);
      g.moveTo(sd * 1.12, -0.66);
      g.lineTo(sd * 1.3, -0.62);
      g.stroke();
      shine(g, sd * 1.12 - 0.14, -0.84, 0.13, 0.07);
    }
  },
  hedge(g, mood) {
    // 가시
    g.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (1.04 + (i * 0.92) / 8);
      const px = (q: number, rx: number) => Math.cos(q) * rx, py = (q: number, ry: number) => -0.92 + Math.sin(q) * ry;
      if (i) g.lineTo(px(a - 0.2, 0.9), py(a - 0.2, 0.86));
      else g.moveTo(px(a - 0.2, 0.9), py(a - 0.2, 0.86));
      g.lineTo(px(a, 1.5), py(a, 1.42));
      g.lineTo(px(a + 0.2, 0.9), py(a + 0.2, 0.86));
    }
    g.closePath();
    ink(g, lin(g, 0, -2.4, 0, -0.6, [0, '#a2708f'], [1, '#6f4763']), LW * 1.1);
    ell(g, 0, -0.9, 0.95, 0.9);
    ink(g, '#7e5270', LW * 1.15);
    ell(g, 0, -0.78, 0.76, 0.7);
    g.fillStyle = '#ffe9c9';
    g.fill();
    shine(g, -0.3, -1.2, 0.22, 0.1);
    ell(g, 0.03, -0.72, 0.13, 0.1);
    g.fillStyle = '#3a2418';
    g.fill();
    face(g, 0.03, -1.0, 0.36, 0.2, mood, 0.52, 0.8);
    blush(g, 0.03, -0.72, 0.5, 0.13);
  },
  frog(g, mood) {
    for (const sd of [-1, 1]) ell(g, sd * 0.52, -1.55, 0.44, 0.44), ink(g, '#5ec24a', LW * 1.1);
    ell(g, 0, -0.82, 1.1, 0.82);
    ink(g, lin(g, 0, -1.7, 0, 0, [0, '#74d458'], [1, '#3f9f3a']), LW * 1.15);
    for (const sd of [-1, 1]) ell(g, sd * 0.52, -1.5, 0.36, 0.3), (g.fillStyle = '#74d458'), g.fill();
    ell(g, 0, -0.5, 0.78, 0.46);
    g.fillStyle = '#f4f7b8';
    g.fill();
    g.fillStyle = 'rgba(40,120,40,.35)';
    for (const [x, y, r] of [[-0.78, -0.95, 0.1], [0.82, -0.8, 0.12], [0.7, -1.12, 0.07]]) ell(g, x, y, r, r * 0.8), g.fill();
    shine(g, -0.1, -1.22, 0.3, 0.09, 0);
    face(g, 0, -1.58, 0.52, 0.27, mood, 0.72, 2);
    blush(g, 0, -0.98, 0.82, 0.14);
  },
  mole(g, mood) {
    // 등에 진 폭탄
    ell(g, -0.72, -1.52, 0.56, 0.56);
    ink(g, radg(g, -0.9, -1.72, 0, 0.7, [0, '#6a6474'], [1, '#26222d']), LW * 1.1);
    g.strokeStyle = '#b98a4a';
    g.lineWidth = LW * 1.2;
    g.beginPath();
    g.moveTo(-0.92, -2.02);
    g.quadraticCurveTo(-1.0, -2.3, -1.22, -2.36);
    g.stroke();
    ell(g, 0, -0.92, 0.92, 0.93);
    ink(g, lin(g, 0, -1.85, 0, 0, [0, '#8a7a9c'], [1, '#5e4f70']), LW * 1.15);
    ell(g, 0, -0.55, 0.56, 0.46);
    g.fillStyle = '#cdbfe0';
    g.fill();
    shine(g, -0.38, -1.48, 0.26, 0.12);
    for (const sd of [-1, 1]) ell(g, sd * 0.86, -0.5, 0.26, 0.2, sd * 0.4), ink(g, '#f6b9c0', LW * 0.8);
    ell(g, 0.03, -0.92, 0.34, 0.24);
    ink(g, '#f6d5d8', LW * 0.6);
    ell(g, 0.03, -1.02, 0.14, 0.1);
    g.fillStyle = '#e8566e';
    g.fill();
    face(g, 0.03, -1.3, 0.34, 0.15, mood, 0.5, 0.9);
  },
  goat(g, mood) {
    // 뿔
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.3, -1.78);
      g.quadraticCurveTo(sd * 0.5, -2.75, sd * 1.25, -2.4);
      g.quadraticCurveTo(sd * 0.85, -2.3, sd * 0.78, -1.68);
      g.closePath();
      ink(g, lin(g, 0, -2.7, 0, -1.7, [0, '#f0d9a0'], [1, '#c79a52']), LW);
      ell(g, sd * 1.08, -1.32, 0.36, 0.17, sd * 0.5);
      ink(g, '#fbe3d4', LW * 0.9);
    }
    ell(g, 0, -0.95, 0.94, 0.96);
    ink(g, lin(g, 0, -1.9, 0, 0, [0, '#ffffff'], [1, '#e3d9c6']), LW * 1.15);
    // 앞머리 · 수염
    g.beginPath();
    g.moveTo(-0.3, -1.84);
    g.quadraticCurveTo(0, -1.4, 0.3, -1.84);
    g.quadraticCurveTo(0, -2.06, -0.3, -1.84);
    ink(g, '#f4ecdc', LW * 0.7);
    g.beginPath();
    g.moveTo(-0.2, -0.38);
    g.lineTo(0, 0.0);
    g.lineTo(0.2, -0.38);
    g.closePath();
    ink(g, '#f4ecdc', LW * 0.8);
    ell(g, 0, -0.78, 0.4, 0.28);
    ink(g, '#fbd9c6', LW * 0.6);
    g.fillStyle = '#b0705a';
    for (const sd of [-1, 1]) ell(g, sd * 0.13, -0.84, 0.05, 0.07), g.fill();
    face(g, 0, -1.3, 0.42, 0.2, mood === M_IDLE ? M_ANGRY : mood, 0.62, 0.7);
  },
  turtle(g, mood) {
    ell(g, 0, -1.02, 1.1, 0.98);
    ink(g, lin(g, 0, -2, 0, 0, [0, '#55c9a8'], [1, '#2a8f7a']), LW * 1.15);
    // 등딱지 무늬
    g.strokeStyle = '#1f7a68';
    g.lineWidth = LW * 0.8;
    g.beginPath();
    for (const [x, y, r] of [[0, -1.5, 0.34], [-0.62, -1.18, 0.26], [0.62, -1.18, 0.26]]) {
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6 + 0.52;
        if (i) g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.85);
        else g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.85);
      }
      g.closePath();
    }
    g.fillStyle = 'rgba(160,240,200,.35)';
    g.fill();
    g.stroke();
    shine(g, -0.5, -1.68, 0.3, 0.12);
    // 딱지 테두리 · 머리
    g.beginPath();
    g.ellipse(0, -0.55, 1.08, 0.42, 0, 0.08, Math.PI - 0.08);
    g.strokeStyle = '#fff1c4';
    g.lineWidth = LW * 2.4;
    g.stroke();
    g.strokeStyle = OUT;
    g.lineWidth = LW * 0.6;
    g.beginPath();
    g.ellipse(0, -0.5, 1.12, 0.5, 0, 0.1, Math.PI - 0.1);
    g.stroke();
    ell(g, 0, -0.62, 0.62, 0.52);
    ink(g, lin(g, 0, -1.1, 0, -0.1, [0, '#c8ea86'], [1, '#93c955']), LW * 1.05);
    face(g, 0, -0.76, 0.28, 0.17, mood, 0.33, 0.9);
    blush(g, 0, -0.56, 0.42, 0.1);
  },
  cloud(g, mood) {
    const puffs = [[-0.72, -0.92, 0.56], [0.72, -0.92, 0.56], [-0.32, -1.42, 0.6], [0.42, -1.46, 0.54], [0, -0.92, 0.78]];
    g.strokeStyle = '#51607e';
    g.lineWidth = LW * 2.4;
    for (const [x, y, r] of puffs) ell(g, x, y, r, r * 0.92), g.stroke();
    g.fillStyle = lin(g, 0, -2, 0, -0.2, [0, '#ffffff'], [1, '#cfdcf5']);
    for (const [x, y, r] of puffs) ell(g, x, y, r, r * 0.92), g.fill();
    shine(g, -0.4, -1.72, 0.28, 0.12);
    // 번개 꼬리
    g.beginPath();
    g.moveTo(-0.2, -0.28);
    g.lineTo(0.22, -0.28);
    g.lineTo(0.04, -0.04);
    g.lineTo(0.3, -0.04);
    g.lineTo(-0.22, 0.42);
    g.lineTo(-0.04, 0.06);
    g.lineTo(-0.3, 0.06);
    g.closePath();
    ink(g, '#ffd53d', LW * 0.8, '#a06a12');
    face(g, 0.02, -1.08, 0.38, 0.22, mood, 0.45);
    blush(g, 0.02, -0.82, 0.68, 0.14);
  },
  shroom(g, mood) {
    ell(g, 0, -0.62, 0.72, 0.64);
    ink(g, lin(g, 0, -1.2, 0, 0, [0, '#fff6e2'], [1, '#ecd7b2']), LW * 1.15);
    g.beginPath();
    g.moveTo(-1.22, -1.02);
    g.bezierCurveTo(-1.2, -2.42, 1.2, -2.42, 1.22, -1.02);
    g.quadraticCurveTo(0, -0.72, -1.22, -1.02);
    g.closePath();
    ink(g, lin(g, 0, -2.1, 0, -0.9, [0, '#bd8cf5'], [1, '#8a52d6']), LW * 1.15);
    g.fillStyle = '#f9e3ff';
    for (const [x, y, r] of [[-0.6, -1.5, 0.2], [0.1, -1.78, 0.24], [0.72, -1.4, 0.17], [-0.12, -1.26, 0.12]]) ell(g, x, y, r, r * 0.8), g.fill();
    shine(g, -0.62, -1.88, 0.2, 0.08);
    face(g, 0.02, -0.72, 0.3, 0.18, mood, 0.36, 0.9);
    blush(g, 0.02, -0.52, 0.5, 0.11);
  },
  tanuki(g, mood) {
    // 줄무늬 꼬리
    g.save();
    g.translate(0.98, -0.62);
    g.rotate(0.5);
    ell(g, 0, 0, 0.42, 0.74);
    ink(g, '#c98f5a', LW * 1.05);
    g.clip();
    g.fillStyle = '#6b4630';
    for (const y of [-0.5, -0.12, 0.26]) g.fillRect(-0.6, y, 1.2, 0.17);
    g.restore();
    for (const sd of [-1, 1]) {
      ell(g, sd * 0.64, -1.84, 0.3, 0.31);
      ink(g, '#6b4630');
      ell(g, sd * 0.64, -1.82, 0.14, 0.15);
      g.fillStyle = '#f2b6a0';
      g.fill();
    }
    ell(g, 0, -0.95, 0.96, 0.96);
    ink(g, lin(g, 0, -1.9, 0, 0, [0, '#dba56c'], [1, '#b87a44']), LW * 1.15);
    ell(g, 0, -0.55, 0.62, 0.48);
    g.fillStyle = '#f7e6c2';
    g.fill();
    for (const sd of [-1, 1]) ell(g, sd * 0.42, -1.24, 0.42, 0.3, sd * 0.35), (g.fillStyle = '#5c3b28'), g.fill();
    ell(g, 0, -0.9, 0.32, 0.22);
    ink(g, '#fbf0d6', LW * 0.6);
    ell(g, 0, -0.99, 0.12, 0.085);
    g.fillStyle = '#3a2418';
    g.fill();
    face(g, 0, -1.24, 0.42, 0.19, mood, 0.5, 0.75);
    // 머리 위 나뭇잎
    g.beginPath();
    g.moveTo(-0.08, -1.86);
    g.quadraticCurveTo(-0.5, -2.5, 0.28, -2.6);
    g.quadraticCurveTo(0.45, -2.1, -0.08, -1.86);
    ink(g, lin(g, 0, -2.6, 0, -1.9, [0, '#8be36a'], [1, '#3fae3a']), LW * 0.9);
    g.strokeStyle = '#2f8a2c';
    g.lineWidth = LW * 0.5;
    g.beginPath();
    g.moveTo(-0.04, -1.92);
    g.lineTo(0.22, -2.44);
    g.stroke();
  },
  boar(g, mood) {
    // 갈기
    g.beginPath();
    g.moveTo(-0.62, -1.75);
    for (let i = 0; i < 5; i++) g.lineTo(-0.47 + i * 0.25, -2.22 - (i % 2 ? 0 : 0.14)), g.lineTo(-0.36 + i * 0.25, -1.86);
    g.closePath();
    ink(g, '#4a2a22', LW);
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.55, -1.72);
      g.lineTo(sd * 1.12, -2.12);
      g.lineTo(sd * 0.98, -1.4);
      g.closePath();
      ink(g, '#8a4b3a', LW);
    }
    ell(g, 0, -1.0, 1.06, 1.02);
    ink(g, lin(g, 0, -2, 0, 0, [0, '#a8604a'], [1, '#70382c']), LW * 1.1);
    ell(g, 0, -0.5, 0.7, 0.44);
    g.fillStyle = '#c98a72';
    g.fill();
    shine(g, -0.5, -1.6, 0.28, 0.12);
    // 엄니 · 코
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.36, -0.68);
      g.quadraticCurveTo(sd * 0.82, -0.7, sd * 0.8, -1.3);
      g.quadraticCurveTo(sd * 0.56, -0.98, sd * 0.3, -0.94);
      g.closePath();
      ink(g, '#fff8e6', LW * 0.9);
    }
    ell(g, 0, -0.86, 0.5, 0.36);
    ink(g, '#f2a595', LW);
    g.fillStyle = '#8a3d3a';
    for (const sd of [-1, 1]) ell(g, sd * 0.18, -0.88, 0.08, 0.12), g.fill();
    face(g, 0, -1.42, 0.44, 0.17, mood === M_IDLE ? M_ANGRY : mood, 0);
    crown(g, 0, -1.98, 0.42);
  },
  crab(g, mood) {
    // 집게 팔
    for (const sd of [-1, 1]) {
      g.strokeStyle = OUT;
      g.lineWidth = 0.42;
      g.beginPath();
      g.moveTo(sd * 0.85, -0.95);
      g.quadraticCurveTo(sd * 1.45, -1.0, sd * 1.42, -1.6);
      g.stroke();
      g.strokeStyle = '#e8532f';
      g.lineWidth = 0.25;
      g.stroke();
      g.save();
      g.translate(sd * 1.38, -1.98);
      g.rotate(sd * 0.25);
      ell(g, 0, 0, 0.48, 0.56);
      ink(g, lin(g, 0, -0.56, 0, 0.56, [0, '#ff8a5c'], [1, '#e04a2a']), LW * 1.05);
      g.beginPath();
      g.moveTo(-sd * 0.05, -0.6);
      g.lineTo(-sd * 0.12, -0.02);
      g.lineTo(sd * 0.3, -0.52);
      g.closePath();
      ink(g, '#7a2a1c', LW * 0.6);
      shine(g, -0.18, -0.2, 0.12, 0.2, 0.2);
      g.restore();
    }
    // 다리
    g.strokeStyle = OUT;
    g.lineWidth = 0.2;
    g.beginPath();
    for (const sd of [-1, 1]) for (const k of [0, 1]) (g.moveTo(sd * (0.75 + k * 0.2), -0.42 + k * 0.08), g.lineTo(sd * (1.12 + k * 0.16), -0.02));
    g.stroke();
    // 눈자루
    for (const sd of [-1, 1]) {
      g.strokeStyle = OUT;
      g.lineWidth = 0.26;
      g.beginPath();
      g.moveTo(sd * 0.4, -1.4);
      g.lineTo(sd * 0.42, -1.95);
      g.stroke();
      g.strokeStyle = '#f0623e';
      g.lineWidth = 0.12;
      g.stroke();
    }
    ell(g, 0, -0.85, 1.16, 0.82);
    ink(g, lin(g, 0, -1.7, 0, 0, [0, '#ff8256'], [1, '#d8452a']), LW * 1.1);
    ell(g, 0, -0.5, 0.82, 0.42);
    g.fillStyle = '#ffc7a0';
    g.fill();
    shine(g, -0.55, -1.36, 0.3, 0.11);
    face(g, 0, -2.02, 0.42, 0.24, mood === M_IDLE ? M_ANGRY : mood, 0);
    // 입
    const mm = mood === M_WIND || mood === M_MINEATK ? 0.26 : 0.1;
    ell(g, 0, -0.98, 0.36, mm);
    ink(g, '#7a2a1c', LW * 0.7);
    blush(g, 0, -0.98, 0.72, 0.14);
    crown(g, 0, -1.6, 0.34);
  },
  dragon(g, mood) {
    // 날개 · 번개 꼬리
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.7, -1.3);
      g.lineTo(sd * 1.7, -2.15);
      g.lineTo(sd * 1.5, -1.6);
      g.lineTo(sd * 1.85, -1.5);
      g.lineTo(sd * 1.42, -1.12);
      g.lineTo(sd * 1.6, -0.92);
      g.lineTo(sd * 0.8, -0.8);
      g.closePath();
      ink(g, lin(g, 0, -2.1, 0, -0.8, [0, '#9fb8ff'], [1, '#6a7fe0']), LW);
    }
    g.beginPath();
    g.moveTo(0.7, -0.4);
    g.lineTo(1.5, -0.55);
    g.lineTo(1.3, -0.25);
    g.lineTo(1.85, -0.3);
    g.lineTo(1.2, 0.2);
    g.lineTo(1.3, -0.08);
    g.lineTo(0.8, -0.02);
    g.closePath();
    ink(g, '#ffd53d', LW, '#a06a12');
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.38, -1.82);
      g.quadraticCurveTo(sd * 0.55, -2.5, sd * 0.95, -2.5);
      g.quadraticCurveTo(sd * 0.8, -2.1, sd * 0.78, -1.7);
      g.closePath();
      ink(g, '#fff3c4', LW);
    }
    ell(g, 0, -1.0, 1.02, 1.05);
    ink(g, lin(g, 0, -2.05, 0, 0, [0, '#7a97f5'], [1, '#4a5fd0']), LW * 1.1);
    ell(g, 0, -0.52, 0.64, 0.5);
    g.fillStyle = '#ffe79a';
    g.fill();
    g.strokeStyle = '#e8b84a';
    g.lineWidth = LW * 0.55;
    g.beginPath();
    for (const y of [-0.72, -0.5, -0.28]) (g.moveTo(-0.45, y), g.quadraticCurveTo(0, y + 0.1, 0.45, y));
    g.stroke();
    shine(g, -0.48, -1.62, 0.28, 0.12);
    ell(g, 0, -1.0, 0.5, 0.32);
    ink(g, '#a8bcff', LW * 0.8);
    g.fillStyle = '#34449a';
    for (const sd of [-1, 1]) ell(g, sd * 0.2, -1.08, 0.06, 0.08), g.fill();
    face(g, 0, -1.45, 0.44, 0.19, mood === M_IDLE ? M_ANGRY : mood, mood === M_WIND || mood === M_MINEATK ? 0.62 : 0.58, 0.9);
    crown(g, 0, -2.02, 0.36);
  },
};
/** 타일 조각처럼 미리 그려 둔 스티커 (종류·표정마다 한 장) */
const SW = 4.4, SH = 3.7, SOX = 2.2, SOY = 3.1;
const SPR = new Map<string, HTMLCanvasElement>();
const spriteKey = (k: K, mood: number, v: number, px: number) => `${k}:${mood}:${k === 'bean' ? v % 3 : 0}:${Math.max(6, Math.round(px))}`;
function sprite(k: K, mood: number, v: number, px: number): HTMLCanvasElement {
  const q = Math.max(6, Math.round(px)), key = spriteKey(k, mood, v, px);
  let c = SPR.get(key);
  if (!c) {
    if (SPR.size > 300) SPR.clear();
    c = layer(SW * q, SH * q, 1, (g) => {
      g.translate(SOX * q, SOY * q);
      g.scale(q, q);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      PAINT[k](g, mood, v);
    });
    SPR.set(key, c);
  }
  return c;
}
/** 아직 안 구운 스티커면 굽고 true (남는 프레임에 조금씩 미리 굽기) */
function warmSprite(k: K, mood: number, v: number, px: number) {
  if (SPR.has(spriteKey(k, mood, v, px))) return false;
  sprite(k, mood, v, px);
  return true;
}
/** 아직 못 타 본 몸: 그림자 스티커 */
function silhouette(k: K, px: number): HTMLCanvasElement {
  const q = Math.max(6, Math.round(px)), key = `${k}:sil:${q}`;
  let c = SPR.get(key);
  if (!c) {
    c = layer(SW * q, SH * q, 1, (g) => {
      g.save();
      g.translate(SOX * q, SOY * q);
      g.scale(q, q);
      g.lineJoin = 'round';
      PAINT[k](g, M_IDLE, 0);
      g.restore();
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = '#b9a58a';
      g.fillRect(0, 0, SW * q, SH * q);
    });
    SPR.set(key, c);
  }
  return c;
}
/** 아직 안 구운 그림자 스티커면 굽고 true */
function warmSil(k: K, px: number) {
  if (SPR.has(`${k}:sil:${Math.max(6, Math.round(px))}`)) return false;
  silhouette(k, px);
  return true;
}
/** 스티커 찍기: (x,y) = 발 가운데, u = 화면에서 몸 반지름 px */
function stamp(ctx: C2, c: HTMLCanvasElement, u: number) {
  ctx.drawImage(c, -SOX * u, -SOY * u, SW * u, SH * u);
}

// ───────────────────────────── 그리기: 유령 · 손가락 · 장 끝 선물 ─────────────────────────────
const GOUT = '#2f6fb0';
/** 꼬마 유령. (x,y) = 몸 가운데, k = 몸 반지름 px, mood: 0 평소 · 1 슝 · 2 어질 · 3 신남 · 4 걱정 */
function drawGhost(ctx: C2, x: number, y: number, k: number, lv: number, t: number, mood: number, dir: number, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const wv = Math.sin(t * 0.22), lw = Math.max(1.4, k * 0.13);
  // 빛
  if (k > 7) {
    ctx.fillStyle = radg(ctx, 0, 0, k * 0.4, k * 2.1, [0, lv >= 11 ? 'rgba(255,236,150,.5)' : 'rgba(170,240,255,.45)'], [1, 'rgba(170,240,255,0)']);
    ell(ctx, 0, 0, k * 2.1, k * 2.1);
    ctx.fill();
  }
  // 망토 (Lv7~)
  if (lv >= 7) {
    ctx.beginPath();
    ctx.moveTo(-k * 0.7, -k * 0.1);
    ctx.quadraticCurveTo(-dir * k * 1.5, k * 0.5 + wv * k * 0.12, -dir * k * 1.45, k * 1.45 + wv * k * 0.1);
    ctx.quadraticCurveTo(-dir * k * 0.6, k * 1.15, k * 0.2, k * 1.3);
    ctx.lineTo(k * 0.7, -k * 0.1);
    ctx.closePath();
    ctx.fillStyle = '#e8476a';
    ctx.fill();
    ctx.strokeStyle = '#8f2440';
    ctx.lineWidth = lw * 0.8;
    ctx.stroke();
  }
  // 몸 + 꼬리
  ctx.beginPath();
  ctx.moveTo(-k, 0.05 * k);
  ctx.bezierCurveTo(-k, -k * 1.35, k, -k * 1.35, k, 0.05 * k);
  ctx.lineTo(k, k * 0.62);
  ctx.quadraticCurveTo(k * 0.72, k * (0.95 + wv * 0.08), k * 0.42, k * 0.7);
  ctx.quadraticCurveTo(k * 0.12, k * (1.08 - wv * 0.08), -k * 0.2, k * 0.78);
  ctx.quadraticCurveTo(-dir * k * 0.2 - k * 0.35, k * 1.3, -dir * k * (0.9 + wv * 0.1) - k * 0.2, k * (1.42 + wv * 0.06));
  ctx.quadraticCurveTo(-k * 1.02, k * 1.0, -k, k * 0.5);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -k, 0, k * 1.3, [0, '#ffffff'], [0.6, '#e6f8ff'], [1, '#bfe9ff']);
  ctx.fill();
  ctx.strokeStyle = GOUT;
  ctx.lineWidth = lw;
  ctx.stroke();
  // 목도리 (Lv3~)
  if (lv >= 3) {
    ctx.strokeStyle = '#8f2440';
    ctx.lineWidth = k * 0.36;
    ctx.beginPath();
    ctx.moveTo(-k * 0.93, k * 0.3);
    ctx.quadraticCurveTo(0, k * 0.62, k * 0.93, k * 0.3);
    ctx.stroke();
    ctx.strokeStyle = '#ff5a6e';
    ctx.lineWidth = k * 0.24;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-dir * k * 0.6, k * 0.44);
    ctx.quadraticCurveTo(-dir * k * 1.15, k * 0.5 + wv * k * 0.15, -dir * k * 1.5, k * 0.3 + wv * k * 0.22);
    ctx.stroke();
  }
  // 얼굴
  const ex = k * 0.36, ey = -k * 0.22 + (mood === 1 ? -k * 0.05 : 0), fx0 = dir * k * 0.1;
  for (const sd of [-1, 1]) {
    const px = fx0 + sd * ex;
    if (mood === 2) {
      ctx.strokeStyle = '#27407a';
      ctx.lineWidth = k * 0.09;
      ctx.beginPath();
      ctx.moveTo(px - k * 0.14, ey - k * 0.14);
      ctx.lineTo(px + k * 0.14, ey + k * 0.14);
      ctx.moveTo(px + k * 0.14, ey - k * 0.14);
      ctx.lineTo(px - k * 0.14, ey + k * 0.14);
      ctx.stroke();
    } else if (mood === 3) {
      ctx.strokeStyle = '#27407a';
      ctx.lineWidth = k * 0.1;
      ctx.beginPath();
      ctx.arc(px, ey + k * 0.08, k * 0.17, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      ell(ctx, px, ey, k * 0.17, k * (mood === 4 ? 0.2 : 0.25));
      ctx.fillStyle = '#27407a';
      ctx.fill();
      ell(ctx, px - k * 0.05, ey - k * 0.09, k * 0.06, k * 0.08);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,130,150,.55)';
  for (const sd of [-1, 1]) ell(ctx, fx0 + sd * k * 0.62, k * 0.06, k * 0.15, k * 0.1), ctx.fill();
  ctx.strokeStyle = '#27407a';
  ctx.lineWidth = k * 0.09;
  if (mood === 1 || mood === 4) {
    ell(ctx, fx0, k * 0.1, k * 0.1, k * 0.13);
    ctx.fillStyle = '#27407a';
    ctx.fill();
  } else if (mood === 2) {
    ctx.beginPath();
    ctx.moveTo(fx0 - k * 0.2, k * 0.14);
    ctx.quadraticCurveTo(fx0 - k * 0.1, k * 0.04, fx0, k * 0.14);
    ctx.quadraticCurveTo(fx0 + k * 0.1, k * 0.24, fx0 + k * 0.2, k * 0.14);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(fx0, k * 0.02, k * (mood === 3 ? 0.2 : 0.14), Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  // 머리 위: 고깔(Lv5~) → 왕관(Lv9~)
  if (lv >= 9) {
    ctx.save();
    ctx.translate(0, -k * 0.92);
    ctx.scale(k, k);
    ctx.lineWidth = 0.1;
    const kk = 0.44;
    ctx.beginPath();
    ctx.moveTo(-kk, 0);
    ctx.lineTo(-kk * 1.1, -kk * 0.95);
    ctx.lineTo(-kk * 0.5, -kk * 0.5);
    ctx.lineTo(0, -kk * 1.2);
    ctx.lineTo(kk * 0.5, -kk * 0.5);
    ctx.lineTo(kk * 1.1, -kk * 0.95);
    ctx.lineTo(kk, 0);
    ctx.closePath();
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
    ctx.strokeStyle = '#a06a12';
    ctx.stroke();
    ctx.restore();
  } else if (lv >= 5) {
    ctx.beginPath();
    ctx.moveTo(-k * 0.62, -k * 0.82);
    ctx.quadraticCurveTo(-k * 0.1, -k * 1.5, dir * -k * 0.5 + wv * k * 0.06, -k * 1.95);
    ctx.quadraticCurveTo(k * 0.25, -k * 1.35, k * 0.62, -k * 0.82);
    ctx.quadraticCurveTo(0, -k * 1.05, -k * 0.62, -k * 0.82);
    ctx.fillStyle = '#8a5be0';
    ctx.fill();
    ctx.strokeStyle = '#4a2a8f';
    ctx.lineWidth = lw * 0.8;
    ctx.stroke();
    ctx.fillStyle = '#ffe36b';
    starPath(ctx, k * 0.02, -k * 1.2, k * 0.17);
    ctx.fill();
  }
  ctx.restore();
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
/** 장 끝 선물 (마당의 큰 물건): 0장 쌍둥이 북 · 얼음 종 / 1장 큰 자석 · 번개 깃발. (x,y) = 바닥 가운데, k = 크기 px */
function drawPerk(ctx: C2, ch: number, i: number, x: number, y: number, k: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.6, k * 0.055);
  const id = ch * 2 + i, bob = Math.sin(t * 0.08 + i * 2) * k * 0.03;
  if (id === 0) {
    // 쌍둥이 북
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.translate(sd * k * 0.42, -k * 0.5 + bob * sd);
      ctx.rotate(sd * 0.12);
      rr(ctx, -k * 0.38, -k * 0.42, k * 0.76, k * 0.84, k * 0.16);
      ctx.fillStyle = lin(ctx, 0, -k * 0.4, 0, k * 0.4, [0, '#ff7a5c'], [1, '#d8432e']);
      ctx.fill();
      ctx.stroke();
      ell(ctx, 0, -k * 0.4, k * 0.38, k * 0.14);
      ctx.fillStyle = '#fff3d6';
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(-k * 0.36, -k * 0.12);
      ctx.lineTo(-k * 0.12, k * 0.3);
      ctx.lineTo(k * 0.12, -k * 0.12);
      ctx.lineTo(k * 0.36, k * 0.3);
      ctx.stroke();
      ctx.strokeStyle = OUT;
      ctx.restore();
    }
    for (const sd of [-1, 1]) {
      const a = sd * (0.5 + 0.35 * Math.sin(t * 0.3 + (sd > 0 ? 0 : Math.PI)));
      ctx.beginPath();
      ctx.moveTo(sd * k * 0.2, -k * 1.5);
      ctx.lineTo(sd * k * 0.2 + Math.sin(a) * k * 0.55, -k * 1.5 + Math.cos(a) * k * 0.55);
      ctx.strokeStyle = '#b9793f';
      ctx.lineWidth = k * 0.09;
      ctx.stroke();
      ell(ctx, sd * k * 0.2 + Math.sin(a) * k * 0.55, -k * 1.5 + Math.cos(a) * k * 0.55, k * 0.09, k * 0.09);
      ctx.fillStyle = '#fff3d6';
      ctx.fill();
    }
  } else if (id === 1) {
    // 얼음 종
    ctx.translate(0, bob);
    ctx.rotate(Math.sin(t * 0.09) * 0.1);
    ctx.beginPath();
    ctx.moveTo(-k * 0.62, -k * 0.22);
    ctx.quadraticCurveTo(-k * 0.5, -k * 0.5, -k * 0.46, -k * 0.9);
    ctx.bezierCurveTo(-k * 0.46, -k * 1.6, k * 0.46, -k * 1.6, k * 0.46, -k * 0.9);
    ctx.quadraticCurveTo(k * 0.5, -k * 0.5, k * 0.62, -k * 0.22);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, -k * 1.5, 0, -k * 0.2, [0, '#e6fbff'], [1, '#6ec8f5']);
    ctx.fill();
    ctx.stroke();
    ell(ctx, 0, -k * 0.14, k * 0.14, k * 0.14);
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
    ctx.stroke();
    ell(ctx, 0, -k * 1.5, k * 0.12, k * 0.12);
    ctx.fillStyle = '#b9e6ff';
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = k * 0.05;
    for (let j = 0; j < 3; j++) {
      const a = (j * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * k * 0.22, -k * 0.85 + Math.sin(a) * k * 0.22);
      ctx.lineTo(-Math.cos(a) * k * 0.22, -k * 0.85 - Math.sin(a) * k * 0.22);
      ctx.stroke();
    }
  } else if (id === 2) {
    // 큰 자석
    ctx.translate(0, -k * 0.75 + bob);
    ctx.rotate(Math.sin(t * 0.07) * 0.12);
    ctx.lineWidth = k * 0.5;
    ctx.strokeStyle = OUT;
    ctx.beginPath();
    ctx.arc(0, -k * 0.1, k * 0.42, Math.PI, 0);
    ctx.lineTo(k * 0.42, k * 0.55);
    ctx.moveTo(-k * 0.42, -k * 0.1);
    ctx.lineTo(-k * 0.42, k * 0.55);
    ctx.lineCap = 'butt';
    ctx.stroke();
    ctx.lineWidth = k * 0.39;
    ctx.strokeStyle = '#f0463e';
    ctx.beginPath();
    ctx.arc(0, -k * 0.1, k * 0.42, Math.PI, 0);
    ctx.lineTo(k * 0.42, k * 0.3);
    ctx.moveTo(-k * 0.42, -k * 0.1);
    ctx.lineTo(-k * 0.42, k * 0.3);
    ctx.stroke();
    ctx.strokeStyle = '#e9eef5';
    ctx.beginPath();
    ctx.moveTo(k * 0.42, k * 0.3);
    ctx.lineTo(k * 0.42, k * 0.52);
    ctx.moveTo(-k * 0.42, k * 0.3);
    ctx.lineTo(-k * 0.42, k * 0.52);
    ctx.stroke();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = k * 0.04;
    for (const sd of [-1, 1])
      for (let j = 0; j < 2; j++) {
        const q = ((t * 0.04 + j * 0.5) % 1) * k * 0.3;
        ctx.beginPath();
        ctx.arc(sd * k * 0.42, k * 0.62, k * 0.1 + q, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }
  } else {
    // 번개 깃발
    ctx.beginPath();
    ctx.moveTo(-k * 0.35, 0);
    ctx.lineTo(-k * 0.35, -k * 1.7);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = k * 0.14;
    ctx.stroke();
    ctx.strokeStyle = '#c9a56a';
    ctx.lineWidth = k * 0.08;
    ctx.stroke();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(1.6, k * 0.055);
    const fl = Math.sin(t * 0.14) * k * 0.06;
    ctx.beginPath();
    ctx.moveTo(-k * 0.33, -k * 1.66);
    ctx.quadraticCurveTo(k * 0.1, -k * 1.8 + fl, k * 0.72, -k * 1.56 - fl);
    ctx.lineTo(k * 0.66, -k * 0.78 + fl);
    ctx.quadraticCurveTo(k * 0.1, -k * 0.98 - fl, -k * 0.33, -k * 0.86);
    ctx.closePath();
    ctx.fillStyle = '#7a5be0';
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(k * 0.12, -k * 1.55);
    ctx.lineTo(k * 0.42, -k * 1.5);
    ctx.lineTo(k * 0.22, -k * 1.25);
    ctx.lineTo(k * 0.44, -k * 1.22);
    ctx.lineTo(k * 0.02, -k * 0.86);
    ctx.lineTo(k * 0.16, -k * 1.16);
    ctx.lineTo(-k * 0.06, -k * 1.2);
    ctx.closePath();
    ctx.fillStyle = '#ffd53d';
    ctx.fill();
    ctx.lineWidth = Math.max(1, k * 0.035);
    ctx.stroke();
  }
  ctx.restore();
}

// ───────────────────────────── 그리기: 무대 ─────────────────────────────
interface Pal {
  sky: [string, string]; sun: string; far: [string, string]; ground: [string, string]; ring: [string, string, string]; rope: [string, string]; rim: string;
  post: [string, string]; flag: string[]; tuft: string; ink: string;
}
const PALS: Pal[] = [
  { sky: ['#6ec6f2', '#d8f4ff'], sun: '#fff6c2', far: ['#a9e58a', '#86d46c'], ground: ['#9bdd62', '#74c44a'], ring: ['#fff0c2', '#f5d894', '#e9c076'], rope: ['#fffaf0', '#e0c9a0'], rim: '#5aa53a', post: ['#d9a566', '#a8713a'], flag: ['#ff6b6b', '#ffd23f', '#4fc3f7', '#7ed957', '#ff9ecb'], tuft: '#5cab3c', ink: '#3f8a2e' },
  { sky: ['#4fc3ee', '#c9f3ff'], sun: '#fffbe0', far: ['#3fb9d6', '#7fdcec'], ground: ['#fbe6ac', '#f1cf85'], ring: ['#f6d79a', '#eebf74', '#dba55a'], rope: ['#ffffff', '#b9d9e8'], rim: '#d2a860', post: ['#f3ead6', '#c9b48a'], flag: ['#ff7a5c', '#ffffff', '#4fc3f7', '#ffd23f', '#58d6b0'], tuft: '#e0b868', ink: '#c99a4e' },
  { sky: ['#ffc9b8', '#d6ecff'], sun: '#fff3d0', far: ['#fff4fb', '#e6dcff'], ground: ['#f7f1ff', '#dcd2fb'], ring: ['#fff7ff', '#f1dcfb', '#dcbff2'], rope: ['#fff3b8', '#f0bc3c'], rim: '#b8a4e8', post: ['#ffe9a8', '#e0a93c'], flag: ['#ff9ecb', '#ffe36b', '#9fd8ff', '#c6a4ff', '#9ff0c4'], tuft: '#c9bdf2', ink: '#a892e0' },
];
interface BgJob { c: HTMLCanvasElement; steps: (() => void)[] }
const BGS = new Map<string, BgJob>();
function cloudShape(g: C2, x: number, y: number, k: number, col: string) {
  g.fillStyle = col;
  for (const [dx, dy, r] of [[-0.9, 0.1, 0.5], [-0.3, -0.25, 0.7], [0.45, -0.1, 0.6], [1.0, 0.15, 0.42], [0.1, 0.2, 0.75]]) ell(g, x + dx * k, y + dy * k, r * k, r * k * 0.8), g.fill();
}
/**
 * 배경 한 장: 하늘 · 먼 풍경 · 바닥 · 울타리 · 씨름 마당 (가로 폭 w px). 다섯 걸음으로 나눠 굽는다 —
 * all = false면 한 걸음만(결과 화면 동안 남는 프레임에 다음 마당을 미리 구워, 판 첫 프레임이 끊기지 않게).
 */
function bakeBg(ch: number, w: number, h: number, sc: number, all: boolean): BgJob {
  const key = `${ch}:${w}:${h}:${sc}`;
  let job = BGS.get(key);
  if (!job) {
    if (BGS.size > 6) BGS.clear();
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * sc));
    c.height = Math.max(1, Math.ceil(h * sc));
    const g = c.getContext('2d')!;
    g.scale(sc, sc);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const P = PALS[ch], R = (v: number) => v * w, HZ = R(0.33);
    job = { c, steps: [() => {
    // 하늘
    g.fillStyle = lin(g, 0, 0, 0, HZ, [0, P.sky[0]], [1, P.sky[1]]);
    g.fillRect(0, 0, w, HZ + 2);
    g.fillStyle = radg(g, R(0.83), R(0.17), 0, R(0.2), [0, P.sun], [0.3, P.sun], [1, 'rgba(255,255,255,0)']);
    g.fillRect(R(0.55), 0, R(0.45), R(0.4));
    ell(g, R(0.83), R(0.17), R(0.05), R(0.05));
    g.fillStyle = '#ffffff';
    g.fill();
    if (ch === 2) {
      // 무지개
      const cols = ['#ff8f8f', '#ffc56b', '#fff07a', '#9fe89a', '#8fcfff', '#c7a8ff'];
      cols.forEach((col, i) => {
        g.strokeStyle = col;
        g.globalAlpha = 0.6;
        g.lineWidth = R(0.012);
        g.beginPath();
        g.arc(R(0.3), HZ + R(0.04), R(0.3 - i * 0.012), Math.PI, 0);
        g.stroke();
      });
      g.globalAlpha = 1;
    }
    cloudShape(g, R(0.18), R(0.16), R(0.05), 'rgba(255,255,255,.9)');
    cloudShape(g, R(0.62), R(0.2), R(0.035), 'rgba(255,255,255,.8)');
    cloudShape(g, R(0.4), R(0.135), R(0.025), 'rgba(255,255,255,.7)');
  }, () => {
    // 먼 풍경
    if (ch === 0) {
      g.fillStyle = P.far[0];
      g.beginPath();
      g.moveTo(0, HZ);
      g.quadraticCurveTo(R(0.15), HZ - R(0.11), R(0.36), HZ - R(0.03));
      g.quadraticCurveTo(R(0.55), HZ - R(0.13), R(0.78), HZ - R(0.04));
      g.quadraticCurveTo(R(0.9), HZ - R(0.09), w, HZ - R(0.05));
      g.lineTo(w, HZ + 2);
      g.lineTo(0, HZ + 2);
      g.fill();
      g.fillStyle = P.far[1];
      g.beginPath();
      g.moveTo(0, HZ - R(0.03));
      g.quadraticCurveTo(R(0.28), HZ - R(0.07), R(0.5), HZ - R(0.012));
      g.quadraticCurveTo(R(0.78), HZ - R(0.075), w, HZ - R(0.02));
      g.lineTo(w, HZ + 2);
      g.lineTo(0, HZ + 2);
      g.fill();
      for (const [x, k] of [[0.07, 1], [0.93, 1.1], [0.23, 0.7], [0.77, 0.75]]) {
        g.fillStyle = '#8a5a34';
        g.fillRect(R(x) - R(0.006) * k, HZ - R(0.045) * k, R(0.012) * k, R(0.05) * k);
        ell(g, R(x), HZ - R(0.07) * k, R(0.04) * k, R(0.045) * k);
        g.fillStyle = '#58b548';
        g.fill();
        ell(g, R(x) - R(0.012) * k, HZ - R(0.085) * k, R(0.018) * k, R(0.016) * k);
        g.fillStyle = 'rgba(255,255,255,.25)';
        g.fill();
      }
    } else if (ch === 1) {
      // 바다
      g.fillStyle = lin(g, 0, R(0.235), 0, HZ, [0, '#2fa9d8'], [1, '#7fe0ee']);
      g.fillRect(0, R(0.235), w, HZ - R(0.235) + 2);
      g.strokeStyle = 'rgba(255,255,255,.7)';
      g.lineWidth = R(0.004);
      for (let i = 0; i < 9; i++) {
        const x = R(hsh(i * 3 + 1)), y = R(0.25 + hsh(i * 5 + 2) * 0.07);
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + R(0.02), y - R(0.006), x + R(0.04), y);
        g.stroke();
      }
      g.fillStyle = '#58c28a';
      g.beginPath();
      g.moveTo(R(0.02), R(0.238));
      g.quadraticCurveTo(R(0.1), R(0.2), R(0.2), R(0.238));
      g.fill();
      // 돛단배
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(R(0.68), R(0.262));
      g.lineTo(R(0.68), R(0.215));
      g.lineTo(R(0.715), R(0.258));
      g.fill();
      g.fillStyle = '#ff7a5c';
      g.fillRect(R(0.66), R(0.262), R(0.06), R(0.008));
    } else {
      // 떠 있는 섬·구름 벽
      for (const [x, y, k] of [[0.12, 0.27, 1], [0.88, 0.25, 0.8]]) {
        g.fillStyle = '#c7b2f0';
        g.beginPath();
        g.moveTo(R(x - 0.06 * k), R(y));
        g.lineTo(R(x + 0.06 * k), R(y));
        g.lineTo(R(x), R(y + 0.05 * k));
        g.fill();
        ell(g, R(x), R(y), R(0.065 * k), R(0.016 * k));
        g.fillStyle = '#a8e6a0';
        g.fill();
      }
      for (let i = 0; i < 7; i++) cloudShape(g, R(i * 0.17 - 0.02), HZ - R(0.01), R(0.05), i % 2 ? P.far[0] : P.far[1]);
    }
  }, () => {
    // 바닥
    g.fillStyle = lin(g, 0, HZ, 0, h, [0, P.ground[0]], [1, P.ground[1]]);
    g.fillRect(0, HZ, w, h - HZ);
    if (ch === 2) for (let i = 0; i < 12; i++) cloudShape(g, R(hsh(i * 7 + 3)), R(0.4 + hsh(i * 11 + 5) * 0.9), R(0.03 + hsh(i) * 0.03), 'rgba(255,255,255,.55)');
    // 풀·모래 무늬
    for (let i = 0; i < 46; i++) {
      const x = R(hsh(i * 3.1 + ch)), y = R(0.36 + hsh(i * 7.7 + ch * 2) * 0.94);
      if (dist(x / w, y / w, CX, CY) < AR + 0.06) continue;
      if (ch === 0) {
        g.strokeStyle = P.tuft;
        g.lineWidth = R(0.005);
        g.beginPath();
        for (const dx of [-0.008, 0, 0.008]) (g.moveTo(x + R(dx), y), g.lineTo(x + R(dx * 1.8), y - R(0.014)));
        g.stroke();
        if (i % 3 === 0) {
          const col = ['#ffffff', '#ffe36b', '#ff9ecb'][i % 9 === 0 ? 2 : i % 2];
          for (let j = 0; j < 5; j++) ell(g, x + R(0.02) + Math.cos(j * 1.257) * R(0.006), y + Math.sin(j * 1.257) * R(0.006), R(0.005), R(0.005)), (g.fillStyle = col), g.fill();
          ell(g, x + R(0.02), y, R(0.004), R(0.004));
          g.fillStyle = '#ffb347';
          g.fill();
        }
      } else if (ch === 1) {
        ell(g, x, y, R(0.012), R(0.004));
        g.fillStyle = 'rgba(190,140,70,.28)';
        g.fill();
        if (i % 5 === 0) {
          // 불가사리
          g.fillStyle = '#ff9a7a';
          starPath(g, x + R(0.02), y, R(0.016), 0.5);
          g.fill();
          g.strokeStyle = '#d8643e';
          g.lineWidth = R(0.003);
          g.stroke();
        }
      } else if (i % 2 === 0) {
        g.fillStyle = 'rgba(255,225,120,.9)';
        starPath(g, x, y, R(0.009));
        g.fill();
      }
    }
  }, () => {
    // 울타리 (뒤쪽)
    const FY = R(0.378);
    if (ch !== 2) {
      g.strokeStyle = P.post[1];
      g.lineWidth = R(0.011);
      for (const dy of [-0.022, -0.046]) {
        g.beginPath();
        g.moveTo(-2, FY + R(dy));
        g.lineTo(w + 2, FY + R(dy));
        g.stroke();
      }
      for (let i = 0; i <= 12; i++) {
        const x = R(i / 12);
        rr(g, x - R(0.012), FY - R(0.066), R(0.024), R(0.07), R(0.008));
        g.fillStyle = lin(g, x - R(0.012), 0, x + R(0.012), 0, [0, P.post[0]], [1, P.post[1]]);
        g.fill();
        g.strokeStyle = 'rgba(75,48,32,.55)';
        g.lineWidth = R(0.004);
        g.stroke();
      }
    } else {
      for (let i = 0; i < 9; i++) cloudShape(g, R(i * 0.125), FY - R(0.03), R(0.04), '#ffffff');
    }
    // 가운데 문기둥 + 유령 등불
    for (const sd of [-1, 1]) {
      rr(g, R(0.5 + sd * 0.115) - R(0.017), R(0.26), R(0.034), R(0.125), R(0.01));
      g.fillStyle = lin(g, R(0.5 + sd * 0.115) - R(0.017), 0, R(0.5 + sd * 0.115) + R(0.017), 0, [0, P.post[0]], [1, P.post[1]]);
      g.fill();
      g.strokeStyle = OUT;
      g.lineWidth = R(0.005);
      g.stroke();
    }
    rr(g, R(0.36), R(0.268), R(0.28), R(0.036), R(0.012));
    g.fillStyle = ch === 2 ? '#f6b93c' : '#e8563e';
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = R(0.005);
    g.stroke();
    rr(g, R(0.372), R(0.274), R(0.256), R(0.009), R(0.004));
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.fill();
    // 등불 받침 (유령 자리)
    g.strokeStyle = OUT;
    g.lineWidth = R(0.012);
    g.beginPath();
    g.moveTo(R(HOME_X), R(0.305));
    g.lineTo(R(HOME_X), R(HOME_Y + 0.045));
    g.stroke();
    ell(g, R(HOME_X), R(HOME_Y + 0.05), R(0.045), R(0.014));
    g.fillStyle = '#ffe9a8';
    g.fill();
    g.lineWidth = R(0.005);
    g.stroke();
  }, () => {
    // 씨름 마당
    const rx = R(AR + 0.034), ry = R((AR + 0.034) * YS), cx = R(CX), cy = R(CY);
    // 두께가 있는 단(아래로 살짝 내려 그린 옆면) + 바닥 그림자
    ell(g, cx, cy + R(0.034), rx + R(0.02), ry + R(0.016));
    g.fillStyle = 'rgba(40,50,20,.2)';
    g.fill();
    ell(g, cx, cy + R(0.022), rx + R(0.006), ry + R(0.004));
    g.fillStyle = P.ring[2];
    g.fill();
    g.strokeStyle = 'rgba(75,48,32,.45)';
    g.lineWidth = R(0.005);
    g.stroke();
    g.save();
    ell(g, cx, cy + R(0.022), rx + R(0.006), ry + R(0.004));
    g.clip();
    g.fillStyle = 'rgba(75,48,32,.16)';
    for (let i = 0; i < 26; i++) g.fillRect(cx - rx + (i / 26) * rx * 2, cy, R(0.006), ry + R(0.04));
    g.restore();
    ell(g, cx, cy, rx + R(0.008), ry + R(0.008));
    g.fillStyle = P.rim;
    g.fill();
    ell(g, cx, cy, rx, ry);
    g.fillStyle = radg(g, cx, cy - ry * 0.25, rx * 0.1, rx * 1.05, [0, P.ring[0]], [0.7, P.ring[1]], [1, P.ring[2]]);
    g.fill();
    // 바닥 무늬
    g.save();
    ell(g, cx, cy, rx, ry);
    g.clip();
    for (let i = 0; i < 70; i++) {
      const a = hsh(i * 1.7) * TAU, q = Math.sqrt(hsh(i * 2.9 + 1)) * 0.98;
      ell(g, cx + Math.cos(a) * rx * q, cy + Math.sin(a) * ry * q, R(0.006 + hsh(i) * 0.008), R(0.0025));
      g.fillStyle = i % 3 ? 'rgba(160,110,50,.13)' : 'rgba(255,255,255,.3)';
      g.fill();
    }
    ell(g, cx, cy, rx * 0.5, ry * 0.5);
    g.strokeStyle = 'rgba(255,255,255,.4)';
    g.lineWidth = R(0.006);
    g.setLineDash([R(0.03), R(0.024)]);
    g.stroke();
    g.setLineDash([]);
    g.restore();
    // 밧줄 테두리
    ell(g, cx, cy, rx, ry);
    g.strokeStyle = 'rgba(75,48,32,.6)';
    g.lineWidth = R(0.021);
    g.stroke();
    g.strokeStyle = P.rope[0];
    g.lineWidth = R(0.014);
    g.stroke();
    g.strokeStyle = P.rope[1];
    g.lineWidth = R(0.014);
    g.setLineDash([R(0.008), R(0.02)]);
    g.stroke();
    g.setLineDash([]);
  }] };
    BGS.set(key, job);
  }
  while (job.steps.length) {
    job.steps.shift()!();
    if (!all) break;
  }
  return job;
}
const getBg = (ch: number, w: number, h: number, sc: number) => bakeBg(ch, w, h, sc, true).c;
/** 배경을 한 걸음 미리 굽는다 — 구울 것이 남아 있었으면 true */
function warmBg(ch: number, w: number, h: number, sc: number) {
  const job = BGS.get(`${ch}:${w}:${h}:${sc}`);
  if (job && !job.steps.length) return false;
  bakeBg(ch, w, h, sc, false);
  return true;
}
/** 판마다 미리 구워 둘 스티커 목록: 그 판에 나오는 몸 × 표정 (콩알이는 세 빛깔) */
const WARM = new Map<number, [K, number, number][]>();
function warmList(stage: number): [K, number, number][] {
  let list = WARM.get(stage);
  if (!list) {
    const d = STAGES[stage], kinds = new Set<K>(['bean']);
    for (const w of d.waves) for (const [k] of w.mons) kinds.add(k);
    for (const [k] of [...(d.summon ?? []), ...(d.swarm ?? [])]) kinds.add(k);
    list = [];
    for (const k of kinds) for (let mood = 0; mood <= M_MINEATK; mood++) for (let v = 0; v < (k === 'bean' ? 3 : 1); v++) list.push([k, mood, v]);
    WARM.set(stage, list);
  }
  return list;
}
/** 구경꾼 새 (울타리 위): 0 가만히 · 1 환호 */
const CROWD = new Map<string, HTMLCanvasElement>();
function crowdBird(col: number, cheer: number, px: number): HTMLCanvasElement {
  const q = Math.max(4, Math.round(px)), key = `${col}:${cheer}:${q}`;
  let c = CROWD.get(key);
  if (!c) {
    if (CROWD.size > 40) CROWD.clear();
    const cols = [['#ffd84a', '#f0a81e'], ['#ff9ecb', '#e0609a'], ['#8fd3ff', '#3f9fe0'], ['#ffffff', '#c9d3e0'], ['#b6ee8a', '#62b848']][col % 5];
    c = layer(3 * q, 3.2 * q, 1, (g) => {
      g.translate(1.5 * q, 2.6 * q);
      g.scale(q, q);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      if (cheer) {
        g.strokeStyle = OUT;
        g.lineWidth = 0.3;
        for (const sd of [-1, 1]) (g.beginPath(), g.moveTo(sd * 0.8, -1.1), g.lineTo(sd * 1.25, -1.9), g.stroke());
        g.strokeStyle = cols[0];
        g.lineWidth = 0.16;
        for (const sd of [-1, 1]) (g.beginPath(), g.moveTo(sd * 0.8, -1.1), g.lineTo(sd * 1.25, -1.9), g.stroke());
      }
      ell(g, 0, -1, 1, 0.98);
      ink(g, lin(g, 0, -2, 0, 0, [0, cols[0]], [1, cols[1]]), 0.13);
      ell(g, 0, -0.6, 0.6, 0.45);
      g.fillStyle = 'rgba(255,255,255,.5)';
      g.fill();
      if (cheer) face(g, 0, -1.25, 0.38, 0.24, M_HAPPY, 0);
      else for (const sd of [-1, 1]) ell(g, sd * 0.38, -1.25, 0.13, 0.17), (g.fillStyle = '#2a1a12'), g.fill();
      g.beginPath();
      g.moveTo(-0.2, -1.0);
      g.lineTo(0.2, -1.0);
      g.lineTo(0, cheer ? -0.62 : -0.76);
      g.closePath();
      ink(g, '#ff9a3c', 0.09);
      blush(g, 0, -0.95, 0.66, 0.14);
    });
    CROWD.set(key, c);
  }
  return c;
}

// ───────────────────────────── 그리기: 장면 ─────────────────────────────
const depth = (y: number) => 0.9 + 0.2 * clamp((y - (CY - AR * YS)) / (2 * AR * YS), 0, 1);
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/** 터질 때 색종이 색 · 발 색 */
const KCOL: Record<K, string> = { bean: '#b8ee6a', bear: '#d9a066', hedge: '#b98aa8', frog: '#7fdc5c', mole: '#a99abb', goat: '#ffffff', turtle: '#5fd0b0', cloud: '#e6efff', shroom: '#c39af5', tanuki: '#e0aa70', boar: '#c0705a', crab: '#ff8a5c', dragon: '#8fa8ff' };
const FOOT: Record<K, string> = { bean: '#5fa53a', bear: '#7a4a22', hedge: '#5e3c54', frog: '#3a8f36', mole: '#f6b9c0', goat: '#8a7a66', turtle: '#93c955', cloud: '#51607e', shroom: '#d9c29a', tanuki: '#6b4630', boar: '#4a2a22', crab: '#b83a22', dragon: '#34449a' };
/** 유령 레벨이 오르면 달라지는 모습 */
const LV_GIFT: Record<number, string> = { 3: '목도리를 둘렀어요', 5: '고깔모자를 썼어요', 7: '망토가 생겼어요', 9: '왕관을 썼어요', 11: '금빛으로 빛나요' };
/** 별 셋(쉬운 말). 대장 판의 셋째는 보호막을 깨는 동안에만 딸 수 있다 — 대장을 언제 타느냐와 무관 */
const STAR_WORDS = (s: HopState) => (STAGES[s.stage].shield ? ['비우기', '안 쓰러지기', `보호막 깨며 한 번에 ${STAGES[s.stage].n}마리`] : ['마당 비우기', '몸 안 쓰러지기', `한 번에 ${STAGES[s.stage].n}마리`]);
const recent = new WeakMap<object, { x: number; y: number; t: number; size: number }[]>();

function drawAll(ctx: C2, s: HopState, w: number, h: number, _th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const sc = typeof ctx.getTransform === 'function' ? Math.min(3, Math.max(1, Math.round(ctx.getTransform().a || 1))) : 1;
  const d = STAGES[s.stage], ch = d.ch, P = PALS[ch], b = body(s), seenT = fx.memo.t ?? -1;
  // 글꼴 크기는 정수 px로만 (커졌다 줄어드는 글자가 프레임마다 새 글꼴을 찾느라 끊기지 않게)
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  // 스티커 해상도는 2배까지만(느린 폰에서 첫 프레임이 무겁지 않게)
  const baseQ = (k: K) => Math.round(R(KD[k].r) * 1.12 * Math.min(2, sc));
  // 미리 굽기(끊김 줄이기): 결과·선물 화면에서는 다음 판의 배경(한 걸음씩)과 스티커를, 판 중에는 이 판에 나올 스티커를 프레임마다 조금씩
  {
    const rest = s.phase === 'result' || s.phase === 'pick', ws = rest && s.stage + 1 < STAGES.length ? s.stage + 1 : s.stage;
    // (결과 카드가 미끄러져 들어오는 첫 몇 프레임은 쉰다)
    if (!(rest && s.pt < 12) && !(rest && warmBg(STAGES[ws].ch, Math.round(w), Math.round(h), Math.min(2, sc)))) {
      const list = warmList(ws);
      let i = fx.memo['wm' + ws] ?? 0, did = 0;
      for (; i < list.length && did < (rest ? 2 : 1); i++) if (warmSprite(list[i][0], list[i][1], list[i][2], baseQ(list[i][0]))) did++;
      fx.memo['wm' + ws] = i;
      // 결과 화면 도감의 그림자 스티커도 판 중에 하나씩
      if (!did) for (const k of DEX) if (warmSil(k, Math.round(R(0.03) * Math.min(2, sc)))) break;
    }
  }
  /** 가장 최근에 일어난 사건의 나이(틱) */
  const since = (k: string) => {
    for (let i = s.events.length - 1; i >= 0; i--) if (s.events[i].k === k) return t - s.events[i].t;
    return 999;
  };
  const bandOn = !!s.big && t - s.big.t < 62;
  const floating = !b && !s.fly && !s.home && s.phase === 'play';
  const text = (str: string, x: number, y: number, fill: string, stroke = 'rgba(75,48,32,.9)', lw = 3) => {
    ctx.lineJoin = 'round';
    if (lw > 0) (ctx.lineWidth = lw), (ctx.strokeStyle = stroke), ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  };
  /** 커졌다 줄어드는 글자: 글꼴 크기는 그대로 두고 그림만 k배 (새 글꼴 크기를 만들지 않는다) */
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
    y = Math.max(Y(0.16), y);
    for (let k = 0; k < 5 && rec.some((q) => t - q.t < 30 && Math.abs(q.x - x) < w * 0.16 && Math.abs(q.y - y) < (size + q.size) * 0.55); k++) y -= size * 0.9;
    rec.push({ x, y, t, size });
    if (rec.length > 14) rec.shift();
    fx.pop(x, y, str, col, size);
  };
  const cheer = (s.big && t - s.big.t < 80) || s.phase === 'result' || (s.phase === 'end' && s.won);
  const gulpA = since('gulp'), alertA = s.alerted ? since('alert') : 999, waveA = since('wave');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.save();
  fx.begin(ctx);
  ctx.drawImage(getBg(ch, Math.round(w), Math.round(h), Math.min(2, sc)), 0, 0, w, h);

  // ── 만국기 · 구경꾼 ──
  for (const [x0, x1, y0, y1] of [[-0.02, 0.365, 0.2, 0.272], [1.02, 0.635, 0.2, 0.272]]) {
    const mx = (x0 + x1) / 2, my = Math.max(y0, y1) + 0.035;
    ctx.strokeStyle = 'rgba(75,48,32,.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(X(x0), Y(y0));
    ctx.quadraticCurveTo(X(mx), Y(my), X(x1), Y(y1));
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const q = (i + 0.6) / 6.4, px = (1 - q) * (1 - q) * x0 + 2 * q * (1 - q) * mx + q * q * x1, py = (1 - q) * (1 - q) * y0 + 2 * q * (1 - q) * my + q * q * y1;
      const sw = Math.sin(t * 0.06 + i * 1.3 + x0) * 0.22, k = R(0.02);
      ctx.fillStyle = P.flag[(i + (x0 < 0 ? 0 : 2)) % P.flag.length];
      ctx.beginPath();
      ctx.moveTo(X(px) - k * 0.7, Y(py));
      ctx.lineTo(X(px) + k * 0.7, Y(py));
      ctx.lineTo(X(px) + Math.sin(sw) * k * 1.5, Y(py) + k * 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(75,48,32,.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  [0.065, 0.165, 0.27, 0.73, 0.835, 0.935].forEach((bx, i) => {
    const k = R(0.026), hop = cheer ? Math.abs(Math.sin(t * 0.3 + i * 1.7)) * R(0.03) : Math.max(0, Math.sin(t * 0.05 + i * 2.1) - 0.93) * R(0.12);
    const c = crowdBird(i + ch, cheer ? 1 : 0, k * sc);
    ctx.drawImage(c, X(bx) - k * 1.5, Y(0.316) - k * 2.6 - hop, k * 3, k * 3.2);
  });

  // ── 문으로 우르르: 줄 선 떼가 남아 있는 동안 문에서 먼지가 인다 ──
  if (s.phase === 'play' && (s.inbox.length > 0 || waveA < 30)) {
    for (let i = 0; i < 5; i++) {
      const f = (t * 0.045 + i * 0.2) % 1, sd = i % 2 ? 1 : -1;
      ctx.fillStyle = `rgba(255,250,235,${0.7 * (1 - f)})`;
      ell(ctx, X(GATE_X + sd * (0.03 + 0.09 * f) + 0.012 * Math.sin(i * 2.3)), Y(GATE_Y + 0.012 - 0.03 * f), R(0.016 + 0.026 * f), R(0.013 + 0.02 * f));
      ctx.fill();
    }
  }
  // ── 유령이 떠다니는 동안: 세상이 살짝 느려지고(푸른 기운) 탈 수 있는 적 발밑에 고리 ──
  if (floating) {
    ctx.fillStyle = 'rgba(40,70,150,.15)';
    ctx.fillRect(0, Y(0.1), w, Y(1.205));
    if (s.dizzy === 0)
      for (const m of s.mons) {
        if (!ridable(s, m)) continue;
        const u = R(m.r) * depth(m.y), pul = 0.5 + 0.5 * Math.sin(t * 0.22 + m.id);
        ell(ctx, X(m.x), Y(m.y), u * (1.45 + 0.2 * pul), u * (1.45 + 0.2 * pul) * YS * 0.7);
        ctx.fillStyle = `rgba(190,245,255,${0.22 + 0.14 * pul})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${0.75 + 0.25 * pul})`;
        ctx.lineWidth = m.k === 'bean' ? 1.6 : 2.6;
        ctx.stroke();
      }
  }
  // ── 바닥 표시: 새 몸 스포트라이트 · 위험(빨강) · 내 몸 고리 ──
  const spotM = s.spot && s.phase === 'play' ? s.mons.find((m) => m.id === s.spot!.id && m.id !== s.me) : undefined;
  if (spotM) {
    const u = R(spotM.r), pul = 0.5 + 0.5 * Math.sin(t * 0.2);
    ctx.fillStyle = `rgba(255,236,120,${0.3 + 0.2 * pul})`;
    ell(ctx, X(spotM.x), Y(spotM.y), u * (1.9 + pul * 0.3), u * (1.9 + pul * 0.3) * YS * 0.7);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -t * 0.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const m of s.mons) {
    if (m.st !== WIND || m.k === 'bean' || m.id === s.me) continue;
    const f = KD[m.k].foe, q = clamp(1 - m.tm / f.wind, 0, 1), blinkA = m.k === 'mole' ? 0.25 * Math.abs(Math.sin(t * (0.25 + q * 0.5))) : 0;
    ctx.fillStyle = `rgba(255,70,60,${0.1 + 0.26 * q + blinkA})`;
    ctx.strokeStyle = `rgba(255,80,60,${0.55 + 0.45 * q})`;
    ctx.lineWidth = 2;
    if (f.shape < 2) {
      const cx = f.shape === 1 ? m.ax : m.x, cy = f.shape === 1 ? m.ay : m.y;
      ell(ctx, X(cx), Y(cy), R(f.r), R(f.r * YS));
      ctx.fill();
      ctx.stroke();
      ell(ctx, X(cx), Y(cy), R(f.r * q), R(f.r * YS * q));
      ctx.fillStyle = 'rgba(255,60,50,.22)';
      ctx.fill();
    } else {
      const c = Math.cos(m.ang), sn = Math.sin(m.ang);
      const poly = (len: number) => {
        ctx.beginPath();
        [[0, -f.r], [len, -f.r], [len + f.r * 0.6, 0], [len, f.r], [0, f.r]].forEach(([a, bb], i) => {
          const px = X(m.x + c * a - sn * bb), py = Y(m.y + (sn * a + c * bb) * YS);
          if (i) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        });
        ctx.closePath();
      };
      poly(f.len);
      ctx.fill();
      ctx.stroke();
      poly(f.len * q);
      ctx.fillStyle = 'rgba(255,60,50,.22)';
      ctx.fill();
    }
  }
  // ── 지금 버리면 몇 마리? 숫자 대신 그림: 펑 범위 고리(많이 들수록 굵고 밝게, 다섯부터 두근두근) + 그 안의 적이 반짝 ──
  const inPop = new Set<number>();
  let beat = 0, popReady = false, hb = false, ringR = 0;
  if (b && s.phase === 'play') {
    const u = R(b.r) * depth(b.y), pr = popR(s, b.k), ready = s.charge >= 1, bx = X(b.x), by = Y(b.y);
    for (const m of s.mons) if (hittable(s, m) && dist(b.x, b.y, m.x, m.y) <= pr + m.r * 0.5) inPop.add(m.id);
    const n = inPop.size, heat = Math.min(1, n / 8), ph2 = (t % 44) / 44;
    popReady = ready;
    hb = n >= 5 && ready;
    // 두근두근: 쿵-쿵 두 번 뛰고 쉰다
    beat = hb && ph2 < 0.5 ? Math.abs(Math.sin(ph2 * TAU * 2)) : 0;
    const pr1 = R(pr) * (1 + 0.04 * beat);
    ringR = pr1;
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(1, YS);
    ctx.beginPath();
    ctx.arc(0, 0, pr1, 0, TAU);
    if (ready) {
      const col = n >= 5 ? '255,226,120' : '150,232,255';
      ctx.fillStyle = radg(ctx, 0, 0, pr1 * 0.35, pr1, [0, `rgba(${col},0)`], [1, `rgba(${col},${0.1 + 0.22 * heat + 0.14 * beat})`]);
      ctx.fill();
      ctx.strokeStyle = n >= 5 ? `rgba(255,${236 + 19 * beat},${150 + 80 * beat},${0.8 + 0.2 * beat})` : `rgba(255,255,255,${0.4 + 0.5 * heat})`;
      ctx.lineWidth = 1.5 + Math.min(8, n) * 0.8 + beat * 3;
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.3)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 7]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    // 유령 기운 고리
    ell(ctx, bx, by, u * 1.45, u * 1.45 * YS * 0.62);
    ctx.strokeStyle = 'rgba(30,90,150,.35)';
    ctx.lineWidth = R(0.016);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(bx, by, u * 1.45, u * 1.45 * YS * 0.62, 0, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(s.charge, 0, 1));
    ctx.strokeStyle = ready ? (Math.sin(t * 0.3) > 0 ? '#ffffff' : '#8ff0ff') : '#49d3ff';
    ctx.lineWidth = R(0.011);
    ctx.stroke();
    if (b.k === 'turtle' && b.st !== SKILL) {
      // 거북: 등껍질이 일으키는 바람
      ell(ctx, bx, by, R(b.r + 0.03), R(b.r + 0.03) * YS);
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([R(0.04), R(0.035)]);
      ctx.lineDashOffset = t * 4;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (b.hp / b.max < 0.36) {
      ell(ctx, bx, by, u * 1.8, u * 1.8 * YS * 0.62);
      ctx.strokeStyle = `rgba(255,50,40,${0.4 + 0.5 * Math.abs(Math.sin(t * 0.3))})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  // ── 지나간 사건의 바닥 그림 (펑 자국·충격파) ──
  for (const e of s.events) {
    const age = t - e.t, ex = X(e.x), ey = Y(e.y);
    if (e.k === 'pop' && age < 16) {
      const q = age / 16, r = R(e.x2) * (0.55 + 0.45 * Math.min(1, q * 2.2));
      ell(ctx, ex, ey, r, r * YS);
      ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - q)})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(120,225,255,${1 - q})`;
      ctx.lineWidth = 5 * (1 - q) + 1;
      ctx.stroke();
    } else if (e.k === 'slam' && age < 22) {
      const q = age / 22, r = R(e.x2) * Math.min(1, 0.3 + q * 1.6);
      ell(ctx, ex, ey, r, r * YS);
      ctx.fillStyle = `rgba(255,236,170,${0.5 * (1 - q)})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${1 - q})`;
      ctx.lineWidth = 10 * (1 - q) + 1;
      ctx.stroke();
      ctx.strokeStyle = `rgba(120,80,40,${0.8 * (1 - q)})`;
      ctx.lineWidth = 4 * (1 - q) + 1;
      ctx.stroke();
      ctx.lineWidth = 2.5 * (1 - q);
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const a = (i * TAU) / 9 + e.t, r0 = R(e.x2) * 0.25, r1 = R(e.x2) * (0.6 + 0.35 * hsh(i + e.t));
        ctx.moveTo(ex + Math.cos(a) * r0, ey + Math.sin(a) * r0 * YS);
        ctx.lineTo(ex + Math.cos(a + 0.12) * r1 * 0.6, ey + Math.sin(a + 0.12) * r1 * 0.6 * YS);
        ctx.lineTo(ex + Math.cos(a) * r1, ey + Math.sin(a) * r1 * YS);
      }
      ctx.stroke();
    } else if ((e.k === 'spin' || e.k === 'frost' || e.k === 'spore' || e.k === 'burst' || e.k === 'decoy' || e.k === 'fstrike' || e.k === 'whirl' || e.k === 'puff') && age < 20) {
      const q = age / 20, r = R(e.x2) * Math.min(1, 0.35 + q * 1.5), wind = e.k === 'spin' || e.k === 'whirl';
      const col = e.k === 'frost' ? '150,225,255' : e.k === 'spore' || e.k === 'burst' || e.k === 'puff' ? '190,130,245' : e.k === 'fstrike' ? '255,80,60' : '255,255,255';
      ell(ctx, ex, ey, r, r * YS);
      ctx.fillStyle = `rgba(${col},${(wind ? 0.12 : 0.3) * (1 - q)})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${col},${0.9 * (1 - q)})`;
      ctx.lineWidth = 4 * (1 - q) + 1;
      if (wind) ctx.setLineDash([R(0.05), R(0.04)]), (ctx.lineDashOffset = t * 6);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // ── 몸들 (멀리 있는 것부터) ──
  const drawMon = (m: Mon) => {
    const kd = KD[m.k], mine = m.id === s.me, u = R(m.r) * depth(m.y), ph = m.seed % 97;
    let x = X(m.x), y = Y(m.y), z = 0, sx = 1, sy = 1, rot = 0;
    if (m.st === ENTER) {
      // 문에서 폴짝폴짝 뛰어 들어온다
      const q = clamp(1 - m.tm / m.et, 0, 1), hops = Math.max(2, Math.round(m.et / 12));
      z = Math.abs(Math.sin(q * Math.PI * hops)) * (R(0.03) + u * 0.5);
      rot = Math.sin(q * Math.PI * hops * 2) * 0.1 * (m.fx0 < m.ax ? 1 : -1);
    } else if (m.air > 0) z = Math.sin(Math.min(1, m.air / 12) * Math.PI) * R(0.04);
    if (m.k === 'cloud') z += R(0.035) + Math.sin(t * 0.08 + ph) * R(0.008);
    const walking = t - m.walkT < 3 && m.frozen <= 0, hurtA = t - m.hurtT, atkA = t - m.atkT, bumpA = t - m.bumpT;
    // 타고 있는 동안 저절로 하는 짓: 고슴도치는 늘 데굴데굴 · 염소는 돌진 · 거북은 빙글빙글 · 곰은 주먹 번쩍
    const riding = mine && m.st !== SKILL && s.phase === 'play';
    const rolling = m.legs > 0 && (m.st === SKILL || riding), ball = rolling && m.k === 'hedge';
    const spin = (m.st === SKILL && (m.k === 'turtle' || m.k === 'crab')) || (riding && m.k === 'turtle');
    const windup = riding && m.k === 'bear' && m.tm > 0, dazed = riding && m.k === 'goat' && m.tm > 0;
    const lit = popReady && inPop.has(m.id), ca = Math.cos(m.wa), sa = Math.sin(m.wa);
    if (m.frozen <= 0) (sy *= 1 + Math.sin(t * 0.11 + ph) * 0.035), (sx *= 1 - Math.sin(t * 0.11 + ph) * 0.02);
    if (walking && !rolling) (z += Math.abs(Math.sin(t * 0.3 + ph)) * u * 0.18), (rot += Math.sin(t * 0.3 + ph) * 0.08);
    if (hurtA < 10) (sx *= 1 + 0.22 * (1 - hurtA / 10)), (sy *= 1 - 0.18 * (1 - hurtA / 10));
    if (bumpA < 10) (sx *= 1 + 0.14 * (1 - bumpA / 10)), (sy *= 1 - 0.1 * (1 - bumpA / 10));
    if (m.st === WIND) {
      const q = clamp(1 - m.tm / kd.foe.wind, 0, 1);
      sy *= 1 + 0.12 * q;
      sx *= 1 - 0.05 * q;
      x += Math.sin(t * 1.4 + ph) * q * 1.6;
    }
    if (atkA < 9) {
      const q = Math.sin((atkA / 9) * Math.PI);
      x += Math.cos(m.ang) * q * u * 0.45;
      y += Math.sin(m.ang) * q * u * 0.45 * YS;
      sx *= 1 + 0.1 * q;
    }
    if (m.st === SKILL && !rolling && !spin && m.sk < 12) (sy *= 1 + 0.25 * Math.sin((m.sk / 12) * Math.PI)), (z += Math.sin((m.sk / 12) * Math.PI) * u * 0.5);
    if (m.st === CLAIM) (sy *= 1.1), (sx *= 0.94);
    if (windup) {
      const q = 1 - m.tm / 18;
      sy *= 1 + 0.16 * q;
      sx *= 1 - 0.06 * q;
      rot -= 0.2 * q * m.face;
    }
    if (dazed) (rot += Math.sin(t * 0.55) * 0.09), (sy *= 0.94), (sx *= 1.05);
    if (mine && m.k === 'frog' && gulpA < 14) {
      // 꿀꺽: 배가 볼록
      const q = Math.sin((gulpA / 14) * Math.PI);
      sx *= 1 + 0.24 * q;
      sy *= 1 - 0.08 * q;
    }
    if (riding && m.k === 'shroom' && atkA < 10) (sy *= 1 - 0.2 * Math.sin((atkA / 10) * Math.PI)), (sx *= 1 + 0.16 * Math.sin((atkA / 10) * Math.PI));
    let mood = M_IDLE;
    if (mine) mood = hurtA < 12 || dazed ? M_MINEHIT : atkA < 14 || windup || (rolling && (!ball || m.sk > 30)) || (m.k === 'frog' && gulpA < 14) ? M_MINEATK : M_MINE;
    else if (hurtA < 10 || m.st === CLAIM) mood = M_HURT;
    else if (m.stun > 0 && m.frozen <= 0) mood = M_DIZZY;
    else if (m.st === WIND) mood = M_WIND;
    else if (m.mad || kd.boss) mood = M_ANGRY;
    else if (bumpA < 18) mood = M_HAPPY;
    // 그림자 · 발
    const sh = clamp(1 - z / R(0.24), 0.45, 1);
    ctx.fillStyle = 'rgba(50,35,10,.2)';
    ell(ctx, X(m.x), Y(m.y) + u * 0.08, u * 1.05 * sh, u * 0.36 * sh);
    ctx.fill();
    if (lit) {
      // 지금 버리면 함께 터질 적: 발밑이 환하다
      ell(ctx, X(m.x), Y(m.y) + u * 0.06, u * 1.3, u * 0.52);
      ctx.fillStyle = `rgba(255,${beat > 0 ? 238 : 255},${beat > 0 ? 150 : 255},${0.5 + 0.3 * Math.sin(t * 0.3 + ph)})`;
      ctx.fill();
    }
    if (m.st !== ENTER && m.k !== 'cloud' && ((!mine && m.mad && walking) || (riding && rolling))) {
      // 달려오는 놈들 발밑의 먼지
      for (let i = 0, n = m.k === 'bean' ? 2 : 3; i < n; i++) {
        const f = (t * 0.07 + ph * 0.37 + i / n) % 1;
        ctx.fillStyle = `rgba(255,252,240,${0.95 * (1 - f)})`;
        ell(ctx, X(m.x) - ca * u * (0.7 + 1.4 * f), Y(m.y) - sa * u * (0.7 + 1.4 * f) * YS - f * u * 0.5, Math.max(2.5, u * (0.2 + 0.34 * f)), Math.max(2, u * (0.16 + 0.27 * f)));
        ctx.fill();
        ctx.strokeStyle = `rgba(170,125,70,${0.5 * (1 - f)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    if (mine) {
      ctx.fillStyle = radg(ctx, x, y - z - u, u * 0.6, u * 2.1, [0, 'rgba(140,235,255,.55)'], [1, 'rgba(140,235,255,0)']);
      ell(ctx, x, y - z - u, u * 2.1, u * 2.1);
      ctx.fill();
    }
    if (riding && rolling) {
      if (ball) {
        // 데굴데굴: 잔상
        for (let i = 2; i >= 1; i--) {
          ctx.save();
          ctx.globalAlpha = 0.3 / i;
          ctx.translate(x - ca * u * 0.85 * i, y - z - sa * u * 0.85 * i * YS - u);
          ctx.rotate((t - i * 2) * 0.75 * m.face);
          ctx.translate(0, u);
          ctx.scale(m.face, 1);
          stamp(ctx, sprite(m.k, M_MINE, 0, baseQ(m.k)), u);
          ctx.restore();
        }
      } else {
        // 돌진: 뒤로 흐르는 바람 줄
        ctx.strokeStyle = 'rgba(255,255,255,.85)';
        ctx.lineWidth = Math.max(2, u * 0.1);
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const o = 1.2 + ((t * 0.31 + i * 0.37) % 1) * 0.9, yy = y - z - u * (0.45 + i * 0.6);
          ctx.beginPath();
          ctx.moveTo(x - ca * u * o, yy - sa * u * o * YS);
          ctx.lineTo(x - ca * u * (o + 0.9), yy - sa * u * (o + 0.9) * YS);
          ctx.stroke();
        }
      }
    }
    if (m.k !== 'cloud' && m.st !== ENTER && !ball && z < u * 0.6) {
      const st = walking ? Math.sin(t * (rolling ? 0.95 : 0.3) + ph) : 0;
      ctx.fillStyle = FOOT[m.k];
      ctx.strokeStyle = OUT;
      ctx.lineWidth = Math.max(1, u * 0.08);
      for (const sd of [-1, 1]) {
        ell(ctx, x + sd * u * 0.45, y + u * 0.02 - Math.max(0, sd * st) * u * 0.22, u * 0.3, u * 0.17);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.save();
    ctx.translate(x, y - z);
    if (ball) (ctx.translate(0, -u), ctx.rotate(t * 0.75 * m.face), ctx.translate(0, u));
    else ctx.rotate(rot + (rolling ? 0.32 * m.face : 0));
    if (spin) sx *= (Math.cos(t * 0.7) < 0 ? -1 : 1) * Math.max(0.4, Math.abs(Math.cos(t * 0.7)));
    ctx.scale(m.face * sx, sy);
    stamp(ctx, sprite(m.k, mood, m.seed % 3, baseQ(m.k)), u);
    ctx.restore();
    const top = y - z - u * 2.05 * sy;
    if (lit) {
      // 반짝반짝: 몸이 환해지고 별빛이 깜박
      ctx.save();
      ctx.translate(x, y - z);
      ctx.scale(m.face * sx, sy);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.16 + 0.2 * Math.abs(Math.sin(t * 0.17 + ph)) + 0.2 * beat;
      stamp(ctx, sprite(m.k, mood, m.seed % 3, baseQ(m.k)), u);
      ctx.restore();
      for (let i = 0; i < 2; i++) {
        const tw = Math.abs(Math.sin(t * 0.17 + ph + i * 1.9));
        burstPath(ctx, x + (i ? -0.8 : 0.85) * u, y - z - u * (i ? 0.75 : 1.8), Math.max(3.5, u * 0.36) * (0.45 + 0.75 * tw), 4, 0.3, 0);
        ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.6 * tw})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255,190,60,${0.5 * tw})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    if (windup || (riding && m.k === 'bear' && atkA < 9)) {
      // 곰: 주먹을 번쩍 들었다가 퍽!
      const q = windup ? 1 - m.tm / 18 : 1, sw = windup ? 0 : Math.sin((atkA / 9) * Math.PI);
      const fpx = windup ? x + m.face * u * (0.95 - 0.45 * q) + Math.sin(t * 1.5) * q * 1.4 : x + Math.cos(m.ang) * u * (0.9 + 1.1 * sw);
      const fpy = windup ? y - z - u * (1.3 + 1.35 * q) : y - z - u * 0.95 + Math.sin(m.ang) * u * 1.1 * sw * YS;
      ell(ctx, fpx, fpy, u * (0.4 + 0.12 * q), u * (0.38 + 0.12 * q));
      ctx.fillStyle = '#c98a4e';
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = Math.max(1.5, u * 0.09);
      ctx.stroke();
      if (windup && q > 0.55) {
        burstPath(ctx, fpx + u * 0.3, fpy - u * 0.35, u * 0.42 * (0.6 + 0.4 * Math.sin(t * 0.9)), 4, 0.3, 0);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    }
    // 폭탄 두더지: 심지 불꽃 · 터지기 직전 빨갛게
    if (m.k === 'mole') {
      const fxp = x - m.face * u * 1.22, fyp = y - z - u * 2.36 * sy, hot = m.st === WIND && !mine;
      ctx.fillStyle = (t >> 1) % 2 ? '#ffe36b' : '#ff8a3d';
      starPath(ctx, fxp, fyp, u * (hot ? 0.45 : 0.24) * (0.8 + 0.4 * hsh(t + ph)), 0.4);
      ctx.fill();
      if (hot && (t >> 2) % 2) {
        ctx.fillStyle = 'rgba(255,40,30,.45)';
        ell(ctx, x, y - z - u, u * 1.05, u * 1.05);
        ctx.fill();
      }
    }
    if (m.frozen > 0) {
      ctx.fillStyle = 'rgba(170,228,255,.55)';
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 2;
      rr(ctx, x - u * 1.15, y - z - u * 2.2, u * 2.3, u * 2.3, u * 0.4);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - u * 0.7, y - z - u * 1.9);
      ctx.lineTo(x - u * 0.2, y - z - u * 1.3);
      ctx.stroke();
    } else if ((m.stun > 0 && !mine) || dazed) {
      ctx.fillStyle = '#ffe36b';
      for (let i = 0; i < 2; i++) starPath(ctx, x + Math.cos(t * 0.2 + i * Math.PI) * u * 0.8, top + u * 0.1 + Math.sin(t * 0.2 + i * Math.PI) * u * 0.2, Math.max(3, u * 0.22)), ctx.fill();
    }
    if (m.spore > 0) {
      ctx.fillStyle = '#b06ae0';
      for (let i = 0; i < 3; i++) ell(ctx, x + Math.cos(t * 0.09 + i * 2.1 + ph) * u * 0.9, y - z - u * (1.0 + 0.5 * Math.sin(t * 0.07 + i * 1.7)), Math.max(2, u * 0.16), Math.max(2, u * 0.16)), ctx.fill();
    }
    if (m.shield > 0) {
      const flash = hurtA < 8 ? 1 - hurtA / 8 : 0, cy0 = y - z - u * 1.05;
      ell(ctx, x, cy0, u * 1.6, u * 1.65);
      ctx.fillStyle = `rgba(255,${225 + 30 * flash},${120 + 135 * flash},${0.2 + 0.4 * flash})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,205,70,${0.85})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(x, cy0, u * 1.35, u * 1.4, 0, Math.PI * 1.1, Math.PI * 1.4);
      ctx.stroke();
    }
    // 체력 띠
    if (mine) {
      const gk = Math.max(R(0.03), u * 0.42), gy = top - gk * 0.55;
      drawGhost(ctx, x, gy + Math.sin(t * 0.15) * 1.2, gk, s.lv, t, hurtA < 14 ? 4 : (s.big && t - s.big.t < 50) || s.phase !== 'play' ? 3 : 0, m.face);
    }
    if (mine && s.phase === 'play') {
      const q = clamp(m.hp / m.max, 0, 1), bw = Math.max(R(0.11), u * 2.1), bh = Math.max(5, R(0.017)), gk = Math.max(R(0.03), u * 0.42), gy = top - gk * 0.55;
      const low = q < 0.36;
      const by0 = gy - gk * 1.5 - bh - (s.lv >= 5 ? gk * 0.8 : 0);
      rr(ctx, x - bw / 2 - 1.5, by0 - 1.5, bw + 3, bh + 3, bh);
      ctx.fillStyle = OUT;
      ctx.fill();
      rr(ctx, x - bw / 2, by0, bw, bh, bh);
      ctx.fillStyle = '#5a4030';
      ctx.fill();
      rr(ctx, x - bw / 2, by0, Math.max(bh, bw * q), bh, bh);
      ctx.fillStyle = low ? ((t >> 2) % 2 ? '#ff3b30' : '#ffb0a8') : q < 0.65 ? '#ffc93c' : '#5fe06a';
      ctx.fill();
      if (low && s.charge >= 1) {
        font(0.036, 900);
        text('위험!', x, by0 - R(0.03), (t >> 2) % 2 ? '#ff3b30' : '#ffffff');
      }
    } else if (!mine && m.k !== 'bean' && m.hp < m.max && m.shield <= 0 && m.st !== ENTER) {
      const q = clamp(m.hp / m.max, 0, 1), bw = u * 1.6, bh = Math.max(3, R(0.009));
      rr(ctx, x - bw / 2 - 1, top - bh - 1, bw + 2, bh + 2, bh);
      ctx.fillStyle = OUT;
      ctx.fill();
      rr(ctx, x - bw / 2, top - bh, Math.max(bh, bw * q), bh, bh);
      ctx.fillStyle = '#ff7a5c';
      ctx.fill();
    }
    if (mine && alertA < 46 && s.phase === 'play') {
      // 몰려온다! (한 몸에 오래 있어 멀리서도 달려오기 시작하는 순간 한 번)
      const pop = alertA < 6 ? 0.5 + (alertA / 6) * 0.75 : 1.25 - Math.min(0.25, (alertA - 6) / 16), ax0 = x + Math.max(u * 1.35, R(0.07)), ay0 = top + u * 0.15;
      ctx.globalAlpha = Math.min(1, (46 - alertA) / 8);
      burstPath(ctx, ax0, ay0, R(0.05) * pop, 9, 0.74, 0.2);
      ctx.fillStyle = '#ff4a3e';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      font(0.062, 900);
      textK('!', ax0, ay0 + 1, pop, '#ffffff', '', 0);
      ctx.globalAlpha = 1;
    }
    if (spotM === m) {
      const ly = top - R(0.05) - Math.abs(Math.sin(t * 0.15)) * R(0.012);
      font(0.036, 900);
      const tw = ctx.measureText(s.spot!.label).width + R(0.04), lx = clamp(x, tw / 2 + 4, w - tw / 2 - 4);
      rr(ctx, lx - tw / 2, ly - R(0.027), tw, R(0.054), R(0.027));
      ctx.fillStyle = '#ff5a4e';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - R(0.014), ly + R(0.026));
      ctx.lineTo(x, ly + R(0.046));
      ctx.lineTo(x + R(0.014), ly + R(0.026));
      ctx.fillStyle = '#ff5a4e';
      ctx.fill();
      text(s.spot!.label, lx, ly + 0.5, '#ffffff', '', 0);
    }
  };
  for (const q of s.decoys) {
    const u = R(KD.tanuki.r) * depth(q.y), age = t - q.born, pop = Math.min(1, age / 8);
    ctx.fillStyle = 'rgba(50,35,10,.16)';
    ell(ctx, X(q.x), Y(q.y) + u * 0.08, u, u * 0.34);
    ctx.fill();
    ctx.save();
    ctx.translate(X(q.x), Y(q.y) - Math.abs(Math.sin(t * 0.2 + q.x * 9)) * u * 0.25);
    ctx.scale(pop * (Math.sin(t * 0.2 + q.x * 9) > 0 ? 1 : -1), pop);
    ctx.globalAlpha = 0.78;
    stamp(ctx, sprite('tanuki', M_HAPPY, 0, baseQ('tanuki')), u);
    ctx.restore();
    ctx.fillStyle = '#7fe36a';
    starPath(ctx, X(q.x) + Math.cos(t * 0.15) * u, Y(q.y) - u * 2.4 + Math.sin(t * 0.15) * u * 0.3, Math.max(3, u * 0.22));
    ctx.fill();
  }
  const order = s.mons.filter((m) => !m.dead).sort((a, c) => a.y - c.y || a.id - c.id);
  for (const m of order) drawMon(m);
  if (b && popReady && inPop.size >= 2 && s.phase === 'play') {
    // 펑 범위 고리를 몸들 위로 한 번 더 (붐빌수록 몸에 가려지므로)
    const n = inPop.size;
    ell(ctx, X(b.x), Y(b.y), ringR, ringR * YS);
    ctx.strokeStyle = n >= 5 ? `rgba(255,${226 + 29 * beat},${110 + 110 * beat},${0.5 + 0.4 * beat})` : `rgba(255,255,255,${0.22 + 0.06 * n})`;
    ctx.lineWidth = 1.5 + Math.min(8, n) * 0.55 + beat * 3;
    ctx.stroke();
  }
  // 사라지는 몸
  for (const c of s.corpses) {
    const age = t - c.t, u = R(KD[c.k].r) * depth(c.y);
    if (c.how === 1) {
      const q = age / 46;
      ctx.save();
      ctx.translate(X(c.x), Y(c.y));
      ctx.globalAlpha = clamp(1.6 - q * 1.6, 0, 1);
      ctx.rotate(Math.min(1, age / 9) * 1.5 * (c.seed % 2 ? 1 : -1));
      stamp(ctx, sprite(c.k, M_DIZZY, c.seed % 3, baseQ(c.k)), u);
      ctx.restore();
      ctx.fillStyle = '#ffe36b';
      for (let i = 0; i < 3; i++) starPath(ctx, X(c.x) + Math.cos(t * 0.2 + i * 2.1) * u, Y(c.y) - u * 1.4 + Math.sin(t * 0.2 + i * 2.1) * u * 0.3, Math.max(3, u * 0.2)), ctx.fill();
    } else if (c.how === 4) {
      // 개구리가 꿀꺽: 입으로 빨려 들어가며 작아진다
      if (age < 9 && b) {
        const q = age / 9;
        ctx.save();
        ctx.translate(X(c.x + (b.x - c.x) * q), Y(c.y + (b.y - b.r - c.y) * q));
        ctx.scale(1 - q * 0.85, 1 - q * 0.85);
        stamp(ctx, sprite(c.k, M_HURT, c.seed % 3, baseQ(c.k)), u);
        ctx.restore();
      }
    } else if (age < 15) {
      // 펑: 바깥으로 튕겨 오르며 빙글, 부풀다 사라진다
      const q = age / 15, sp = Math.hypot(c.vx, c.vy), fl = sp > 1e-4 ? Math.min(3.2, 0.03 / sp) : 0;
      ctx.save();
      ctx.translate(X(c.x + c.vx * fl * age), Y(c.y + c.vy * fl * age * YS) - Math.sin(q * Math.PI) * R(c.how === 3 ? 0.02 : 0.07));
      ctx.globalAlpha = 1 - q * q * q;
      ctx.translate(0, -u);
      ctx.rotate((c.seed % 2 ? 1 : -1) * q * (c.how === 3 ? 0 : 2.2));
      ctx.scale(1 + q * (c.how === 3 ? 0.55 : 0.35), 1 + q * (c.how === 3 ? 0.55 : 0.35));
      ctx.translate(0, u);
      stamp(ctx, sprite(c.k, c.how === 3 ? M_HAPPY : M_HURT, c.seed % 3, baseQ(c.k)), u);
      ctx.restore();
    }
  }

  // ── 혀 · 번개 · 분신 길 ──
  for (const l of s.lines) {
    const age = t - l.t, a = clamp(1 - age / 16, 0, 1), tm = l.id ? s.mons.find((m) => m.id === l.id) : undefined;
    const x0 = X(l.x0), y0 = Y(l.y0), x1 = X(tm ? tm.x : l.x1), y1 = Y(tm ? tm.y - tm.r : l.y1);
    ctx.lineCap = 'round';
    if (l.k === 0) {
      ctx.strokeStyle = `rgba(150,40,70,${a})`;
      ctx.lineWidth = R(0.022);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,130,160,${a})`;
      ctx.lineWidth = R(0.013);
      ctx.stroke();
      ell(ctx, x1, y1, R(0.016), R(0.016));
      ctx.fillStyle = `rgba(255,130,160,${a})`;
      ctx.fill();
    } else if (l.k === 1) {
      ctx.strokeStyle = `rgba(110,220,90,${a})`;
      ctx.lineWidth = R(0.012);
      ctx.setLineDash([R(0.02), R(0.02)]);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - R(0.12), x1, y1);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (age < 10) {
      const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, n = Math.max(3, Math.round(L / R(0.05)));
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      for (let i = 1; i < n; i++) {
        const j = (hsh(l.t * 3 + i * 7 + (t >> 1)) - 0.5) * R(0.05);
        ctx.lineTo(x0 + (dx * i) / n + nx * j, y0 + (dy * i) / n + ny * j);
      }
      ctx.lineTo(x1, y1);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = `rgba(255,214,60,${1 - age / 10})`;
      ctx.lineWidth = R(0.02);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${1 - age / 10})`;
      ctx.lineWidth = R(0.008);
      ctx.stroke();
    }
  }
  // ── 지나간 사건의 공중 그림 ──
  for (const e of s.events) {
    const age = t - e.t, ex = X(e.x), ey = Y(e.y);
    if (e.k === 'boom' && age < 26) {
      const q = age / 26, r = R(e.x2) * Math.min(1, 0.35 + q * 1.4);
      ell(ctx, ex, ey - r * 0.15, r, r * 0.92);
      ctx.fillStyle = radg(ctx, ex, ey - r * 0.15, 0, r, [0, `rgba(255,255,230,${1 - q})`], [0.45, `rgba(255,200,60,${0.9 * (1 - q)})`], [0.8, `rgba(255,110,40,${0.7 * (1 - q)})`], [1, 'rgba(255,90,30,0)']);
      ctx.fill();
      ctx.fillStyle = `rgba(90,70,80,${0.5 * (1 - q)})`;
      for (let i = 0; i < 7; i++) {
        const a = (i * TAU) / 7 + e.t, rr2 = r * (0.5 + 0.6 * q);
        ell(ctx, ex + Math.cos(a) * rr2, ey - r * 0.15 + Math.sin(a) * rr2 * 0.8 - q * R(0.04), R(0.035) * (1 + q), R(0.03) * (1 + q));
        ctx.fill();
      }
    } else if (e.k === 'pop' && age < 12) {
      const q = age / 12, kk = R(e.x2) * (0.35 + 0.5 * q);
      burstPath(ctx, ex, ey - R(0.05), kk, 10, 0.6, e.t);
      ctx.fillStyle = `rgba(255,246,190,${0.9 * (1 - q)})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,150,60,${1 - q})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } else if (e.k === 'fray' && age < 10) {
      const a = 1 - age / 10;
      ctx.lineCap = 'round';
      ctx.strokeStyle = e.text === 'frog' ? `rgba(255,130,160,${a})` : `rgba(255,220,90,${a})`;
      ctx.lineWidth = R(e.text === 'frog' ? 0.02 : 0.05) * a + 2;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(X(e.x2), Y(e.y2));
      ctx.stroke();
    } else if (e.k === 'break' && age < 30) {
      const q = age / 30;
      ctx.fillStyle = `rgba(255,214,90,${1 - q})`;
      for (let i = 0; i < 10; i++) {
        const a = (i * TAU) / 10 + 0.3, r = R(0.06 + 0.22 * q), px = ex + Math.cos(a) * r, py = ey + Math.sin(a) * r * 0.8 + q * q * R(0.1);
        ctx.beginPath();
        ctx.moveTo(px, py - R(0.02));
        ctx.lineTo(px + R(0.016), py + R(0.012));
        ctx.lineTo(px - R(0.014), py + R(0.01));
        ctx.fill();
      }
    } else if ((e.k === 'shout' || (e.k === 'pop' && !e.n && s.hop.n < 2) || (e.k === 'boom' && e.n)) && age < 36) {
      // 외침: 기술 이름 · 펑! — 큰 띠가 떠 있는 동안은 작게 (큰 글자는 한 번에 하나)
      const k = e.text as K, boss = e.k === 'shout' && KD[k].boss, str = e.k === 'shout' ? KD[k].skill : e.k === 'pop' ? '펑!' : '자폭!';
      const pop = age < 6 ? 1.5 - 0.5 * (age / 6) : 1, sz = bandOn ? 0.036 : e.k === 'pop' ? 0.042 : boss ? 0.07 : k === 'bean' ? 0.038 : 0.05;
      ctx.globalAlpha = Math.min(1, (36 - age) / 10) * (bandOn ? 0.8 : 1);
      font(sz, 900);
      const yy = ey - R(e.k === 'pop' ? 0.11 : 0.1) - (age / 36) * R(0.04);
      textK(str, clamp(ex, w * 0.2, w * 0.8), Math.max(Y(0.42), yy), pop, e.k === 'pop' ? '#ffffff' : '#ffe36b', OUT, Math.max(3.5, R(0.011)));
      ctx.globalAlpha = 1;
    } else if (e.k === 'wave' && age < 40 && !bandOn) {
      // 문으로 우르르
      ctx.globalAlpha = Math.min(1, (40 - age) / 10);
      font(0.042, 900);
      textK(e.n === 9 ? '졸개 총출동!' : '우르르!', ex, ey - R(0.04) - (age / 40) * R(0.02), age < 6 ? 1.4 - 0.4 * (age / 6) : 1, '#fff3c4', OUT, 3.5);
      ctx.globalAlpha = 1;
    } else if (e.k === 'punch' && age < 11) {
      // 퍽! (곰 주먹이 닿은 자리)
      const q = age / 11;
      burstPath(ctx, ex, ey, R(0.04 + 0.07 * q), 9, 0.5, e.t);
      ctx.fillStyle = `rgba(255,250,210,${1 - q})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,140,50,${1 - q})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if ((e.k === 'ping' || e.k === 'bump2' || e.k === 'leaf' || e.k === 'thud') && age < 9) {
      // 통! (튕긴 자리의 별)
      const q = age / 9, big = e.k === 'thud' ? 1.8 : e.k === 'ping' ? 1 + Math.min(1, e.n * 0.12) : 1;
      burstPath(ctx, ex, ey, R(0.014 + 0.028 * q) * big, e.k === 'leaf' ? 5 : 4, 0.35, 0.4);
      ctx.fillStyle = e.k === 'leaf' ? `rgba(150,235,110,${1 - q})` : `rgba(255,255,255,${1 - q})`;
      ctx.fill();
      ctx.strokeStyle = e.k === 'leaf' ? `rgba(60,150,50,${1 - q})` : `rgba(255,190,60,${1 - q})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (e.k === 'bump' && age < 9) {
      // 툭! (서로 부딪친 자리의 별)
      burstPath(ctx, ex, ey, R(0.012 + 0.02 * (age / 9)), 4, 0.35, 0.4);
      ctx.fillStyle = `rgba(255,255,255,${1 - age / 9})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,190,60,${1 - age / 9})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (e.k === 'tap' && age < 12) {
      ell(ctx, ex, ey, R(0.02 + 0.05 * (age / 12)), R(0.02 + 0.05 * (age / 12)));
      ctx.strokeStyle = `rgba(255,255,255,${1 - age / 12})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } else if (e.k === 'suck' && age < 8) {
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - age / 8)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex, ey - R(0.03));
      ctx.lineTo(X(e.x2), Y(e.y2) - R(0.03));
      ctx.stroke();
    }
  }

  // ── 펑 자리의 작은 숫자: 이번 갈아타기로 몇 마리 (판 최고 기록·별 셋일 때만 큰 띠가 대신한다) ──
  {
    const killA = t - (fx.memo.killT ?? -99), n = s.hop.n;
    if (n >= 2 && killA < 44 && fx.memo.popId === s.hop.id && s.phase === 'play' && !(s.big && s.big.hop === s.hop.id && s.big.n > 0 && bandOn)) {
      const pop = killA < 5 ? 1.3 - 0.3 * (killA / 5) : 1;
      ctx.globalAlpha = Math.min(1, (44 - killA) / 10);
      font(0.036 + Math.min(0.006, n * 0.0006), 900);
      textK(`${n}마리`, clamp(fx.memo.popX, w * 0.14, w * 0.86), Math.max(Y(0.42), fx.memo.popY - R(0.1)), pop, '#ffffff', OUT, 3.5);
      ctx.globalAlpha = 1;
    }
  }

  // ── 유령 (몸 밖 · 날아가는 중) ──
  const gk = R(0.05) * (1 + 0.025 * Math.min(11, s.lv - 1));
  if (s.fly) {
    const f = s.fly, tm = s.mons.find((m) => m.id === f.to), q = clamp((f.t + 0.5) / f.T, 0, 1);
    const x0 = X(f.x0), y0 = Y(f.y0), x1 = X(tm ? tm.x : f.x0), y1 = Y(tm ? tm.y - tm.r * 2 : f.y0), mx = (x0 + x1) / 2, my = Math.min(y0, y1) - R(0.14);
    const at = (v: number): [number, number] => [(1 - v) * (1 - v) * x0 + 2 * v * (1 - v) * mx + v * v * x1, (1 - v) * (1 - v) * y0 + 2 * v * (1 - v) * my + v * v * y1];
    ctx.lineCap = 'round';
    for (let i = 5; i >= 1; i--) {
      const [px, py] = at(Math.max(0, q - i * 0.07));
      ctx.fillStyle = `rgba(190,245,255,${0.5 - i * 0.08})`;
      ell(ctx, px, py, gk * (1 - i * 0.12), gk * (1 - i * 0.12));
      ctx.fill();
    }
    const [gx, gy] = at(q);
    drawGhost(ctx, gx, gy, gk * 1.05, s.lv, t, 1, x1 >= x0 ? 1 : -1);
  } else if (!b && s.phase !== 'end') {
    const bob = Math.sin(t * 0.1) * R(0.008), gx = X(s.gx), gy = Y(s.gy) - (s.home ? gk * 0.75 : R(0.02)) + bob;
    if (!s.home && s.phase === 'play' && s.stage > 0 && s.dizzy === 0 && s.out > 0) {
      // 남은 시간 고리 (4초)
      const q = clamp(1 - s.out / OUT_T, 0, 1);
      ctx.beginPath();
      ctx.arc(gx, gy, gk * 1.75, 0, TAU);
      ctx.strokeStyle = 'rgba(30,60,120,.35)';
      ctx.lineWidth = R(0.018);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(gx, gy, gk * 1.75, -Math.PI / 2, -Math.PI / 2 + TAU * q);
      ctx.strokeStyle = q < 0.3 ? ((t >> 2) % 2 ? '#ff3b30' : '#ffffff') : '#ffffff';
      ctx.lineWidth = R(0.014);
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    drawGhost(ctx, gx, gy, gk, s.lv, t, s.dizzy > 0 ? 2 : s.home ? 0 : 4, spotM && spotM.x < s.gx ? -1 : 1);
    if (floating && s.dizzy === 0) {
      // 탈 수 있는 적에 큰 손가락 (큰 몸 먼저, 가까운 순으로 셋)
      const val = (m: Mon) => dist(s.gx, s.gy, m.x, m.y) - (m.k === 'bean' ? 0 : 0.5);
      const cand = s.mons.filter((m) => ridable(s, m)).sort((a, c) => val(a) - val(c) || a.id - c.id);
      for (let i = Math.min(3, cand.length) - 1; i >= 0; i--) {
        const m = cand[i], u = R(m.r), press = Math.max(0, Math.sin(t * 0.16 + i * 2.1));
        drawHand(ctx, X(m.x) + u * 0.6 + R(0.02), Y(m.y) - u * 0.5, R(i ? 0.075 : 0.095), press);
      }
    }
    if (s.home && s.stage === 0 && s.phase === 'play') {
      // 처음 보는 사람에게: 이 유령이 나
      const lx = gx + gk * 2.6, ly = gy - gk * 0.2;
      font(0.036, 900);
      rr(ctx, lx - R(0.085), ly - R(0.027), R(0.17), R(0.054), R(0.027));
      ctx.fillStyle = '#2f6fb0';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(lx - R(0.082), ly - R(0.012));
      ctx.lineTo(lx - R(0.108), ly);
      ctx.lineTo(lx - R(0.082), ly + R(0.012));
      ctx.fill();
      text('나: 유령', lx, ly + 0.5, '#ffffff', '', 0);
    }
    if (s.dizzy > 0) {
      ctx.fillStyle = '#ffe36b';
      for (let i = 0; i < 3; i++) starPath(ctx, gx + Math.cos(t * 0.25 + i * 2.1) * gk * 1.1, gy - gk * 1.2 + Math.sin(t * 0.25 + i * 2.1) * gk * 0.3, gk * 0.22), ctx.fill();
    } else if (!s.home && s.phase === 'play' && s.mons.some((m) => ridable(s, m))) {
      font(0.038, 900);
      text('아무 적이나 톡!', clamp(gx, w * 0.2, w * 0.8), gy - gk * 2.3, (t >> 3) % 2 ? '#ffffff' : '#bff3ff');
    }
  }

  // ── 앞쪽 풀·조개·구름 (가까운 층) ──
  for (const sd of [-1, 1]) {
    const fx0 = X(0.5 + sd * 0.46), fy0 = Y(1.275);
    for (let i = 0; i < 3; i++) {
      const px = fx0 - sd * i * R(0.05), py = fy0 + (i % 2) * R(0.012), k = R(0.05 - i * 0.008);
      ell(ctx, px, py, k, k * 0.82);
      ctx.fillStyle = ch === 0 ? ['#4fa83a', '#62bb48', '#7acb58'][i] : ch === 1 ? ['#e9c078', '#f3d28e', '#f9e0a4'][i] : ['#ffffff', '#f1eaff', '#e4dafb'][i];
      ctx.fill();
      ctx.strokeStyle = 'rgba(75,48,32,.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      if (ch === 0 && i === 1) {
        ctx.fillStyle = '#ff9ecb';
        for (let j = 0; j < 5; j++) ell(ctx, px + Math.cos(j * 1.257) * k * 0.2, py - k * 0.5 + Math.sin(j * 1.257) * k * 0.2, k * 0.13, k * 0.13), ctx.fill();
        ctx.fillStyle = '#ffe36b';
        ell(ctx, px, py - k * 0.5, k * 0.1, k * 0.1);
        ctx.fill();
      }
    }
  }

  // ── 방금 일어난 일: 소리 · 색종이 · 흔들림 · 글자 (한 번만) ──
  let marks = 0;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x), ey = Y(e.y), k = e.text as K;
    switch (e.k) {
      case 'tap': fx.sound('tick', 1.5, 0.5); break;
      case 'deny':
        fx.sound('tick', 0.7, 0.5);
        if (e.n) say(ex, ey - R(0.04), '보호막!', '#ffe36b', 15);
        break;
      case 'hop': fx.sound('whoosh', 1.35, 0.9); break;
      case 'pop': {
        const big = e.x2;
        if (!e.n) (fx.memo.popX = ex), (fx.memo.popY = ey), (fx.memo.popId = s.hop.id);
        fx.sound('pop', e.n ? 0.95 : Math.max(0.45, 0.9 - big * 1.6), 1.2);
        if (!e.n) fx.sound('thud', Math.max(0.6, 1.5 - big * 3), 0.5 + big * 2.2);
        puff(ex, ey - R(0.05), KCOL[k] ?? '#ffffff', e.n ? 6 : 12, 4.5, 3.4);
        puff(ex, ey - R(0.05), '#ffffff', 5, 3, 2.4);
        fx.kick(4 + big * 22);
        break;
      }
      case 'in':
        fx.sound('boing', clamp(1.7 - KD[k].r * 9, 0.6, 1.6), 0.8);
        puff(ex, ey, '#9fefff', 7, 2.6, 2.4);
        fx.ring(ex, ey + R(KD[k].r), '#bff3ff', R(KD[k].r * 2.4), 3);
        break;
      case 'kill': {
        const n = e.n;
        fx.sound('pop', 1 + Math.min(14, n) * 0.085, 0.75);
        puff(ex, ey, KCOL[k] ?? '#ffffff', 6, 3.6, 3.6);
        puff(ex, ey, '#ffffff', 2, 2.4, 2.4);
        if (n > 0) (fx.memo.killT = e.t), fx.kick(Math.min(9, 1.5 + n * 0.6));
        break;
      }
      case 'slam': {
        const small = k === 'bean', huge = KD[k].boss;
        fx.sound('thud', small ? 1.7 : huge ? 0.5 : 0.75, small ? 0.6 : huge ? 1.5 : 1.3);
        if (huge) fx.sound('crack', 0.7, 1), fx.blink('#fff3c4', 0.35);
        fx.kick(small ? 3 : huge ? 16 : 11);
        puff(ex, ey, '#f3dfb0', small ? 4 : 12, small ? 2.5 : 5, 3);
        break;
      }
      case 'roll': fx.sound('whoosh', k === 'boar' ? 0.6 : 0.9, 1); break;
      case 'bonk': fx.sound('crack', 1.4, 0.6); puff(ex, ey, '#ffffff', 4, 3, 2.2); break;
      case 'wall': fx.sound('boing', 0.85, 0.7); fx.kick(2); puff(ex, ey, '#f3dfb0', 5, 3, 2.6); break;
      // 타고 있는 동안 저절로 하는 짓
      case 'windup': fx.sound('swell', 1.5, 0.45); break;
      case 'punch': fx.sound('thud', 0.8, 1.2); fx.sound('crack', 1.2, 0.7); fx.kick(7); puff(ex, ey, '#fff3c4', 8, 4.5, 3); break;
      case 'ping': fx.sound('ding', 0.9 + e.n * 0.09, 0.55); fx.sound('boing', 1.2 + e.n * 0.06, 0.4); puff(ex, ey, '#fff07a', 4, 3.2, 2.2); if (e.n >= 3) fx.kick(2); break;
      case 'charge': fx.sound('whoosh', 1.05, 0.8); puff(ex, ey, '#f3dfb0', 5, 2.6, 2.6); break;
      case 'thud': fx.sound('thud', 0.9, 0.9); fx.sound('boing', 0.7, 0.5); fx.kick(5); puff(ex, ey, '#f3dfb0', 7, 3.4, 2.8); break;
      case 'lick': fx.sound('boing', 1.8, 0.7); fx.sound('whoosh', 1.7, 0.5); break;
      case 'gulp': fx.sound('pop', 0.55, 0.9); fx.sound('boing', 0.75, 0.6); puff(ex, ey, '#bff0a0', 5, 2.4, 2.4); say(ex, ey - R(0.09), '꿀꺽!', '#d8ffc0', 14); break;
      case 'whirl': fx.sound('whoosh', 1.3, 0.35); break;
      case 'bump2': fx.sound('boing', 1.3 + hsh(e.t) * 0.4, 0.5); puff(ex, ey, '#d6fff0', 3, 3, 2.2); break;
      case 'puff': fx.sound('splash', 1.5, 0.55); puff(ex, ey - R(0.05), '#c39af5', 8, 3.2, 2.8); break;
      case 'leaf': fx.sound('tick', 1.6, 0.45); puff(ex, ey, '#7fe36a', 3, 2.6, 2.2); break;
      case 'alert': fx.sound('boing', 1.9, 0.55); fx.sound('tick', 2.2, 0.5); break;
      case 'star3': fx.sound('coin', 1.2, 1); puff(ex, ey, '#ffd84a', 14, 5.5, 3.2); fx.ring(ex, ey, '#ffd84a', R(0.2), 5); break;
      case 'tongue': fx.sound('boing', 1.7, 0.9); fx.sound('whoosh', 1.6, 0.7); break;
      case 'boom':
        fx.sound('crack', 0.7, 1.2);
        fx.sound('thud', 0.5, 1.5);
        fx.kick(15);
        fx.blink('#ffb347', 0.4);
        puff(ex, ey - R(0.04), '#ffd166', 14, 6, 3.4);
        puff(ex, ey - R(0.04), '#ff6a3d', 10, 4.5, 3);
        break;
      case 'spin': fx.sound('whoosh', 1.1, 0.7); break;
      case 'zap': fx.sound('zap', 1 + Math.min(10, e.n) * 0.07, 0.8); puff(ex, ey, '#fff07a', 4, 3, 2.2); break;
      case 'thunder': fx.sound('zap', 0.6, 1.3); fx.sound('thud', 0.5, 1.2); fx.blink('#fff7b0', 0.5); fx.kick(14); break;
      case 'spore': fx.sound('splash', 1.3, 0.9); puff(ex, ey - R(0.05), '#c39af5', 12, 5, 3); break;
      case 'burst': fx.sound('pop', 1.55, 0.8); puff(ex, ey - R(0.03), '#c39af5', 6, 3.5, 2.6); break;
      case 'decoy': fx.sound('chime', 1.3, 0.7); puff(ex, ey - R(0.04), '#ffffff', 8, 3, 3.2); break;
      case 'poof': fx.sound('shrink', 1.2, 0.6); puff(ex, ey - R(0.04), '#ffffff', 6, 2.5, 3); break;
      case 'frost': fx.sound('ding', 1.5, 0.7); puff(ex, ey, '#d6f4ff', 8, 4, 2.4); break;
      case 'suck': if (t - (fx.memo.suckT ?? -99) > 6) (fx.memo.suckT = t), fx.sound('swell', 1.6, 0.6); break;
      case 'shield':
        if (t - (fx.memo.shT ?? -99) > 4) (fx.memo.shT = t), fx.sound('crack', 1.6, 0.5), say(ex, ey, `-${e.n}`, '#ffe36b', 14);
        break;
      case 'break': fx.sound('crack', 0.8, 1.3); fx.sound('chime', 1, 1); fx.kick(11); fx.blink('#ffe36b', 0.35); puff(ex, ey, '#ffd23f', 16, 6, 3.4); break;
      case 'ouch': fx.sound('thud', 1.9, 0.4); fx.memo.ouchT = t; puff(ex, ey + R(0.03), '#ff8a7a', 3, 2.5, 2.2); break;
      case 'ko': fx.sound('fail', 1.15, 0.9); fx.sound('shrink', 0.8, 0.8); fx.kick(8); say(ex, ey - R(0.12), '꽥! 쓰러졌다', '#ffd0c8', 17); break;
      case 'heart': fx.sound('fail', 0.8, 1); fx.blink('#ff3b30', 0.3); say(ex, ey - R(0.1), '하트 -1', '#ff8a7a', 18); break;
      case 'ready': fx.sound('tick', 2.2, 0.45); fx.ring(ex, ey, '#bff3ff', R(0.1), 2); break;
      case 'huh': if (marks++ < 2 && t - (fx.memo.huhT ?? -99) > 5) (fx.memo.huhT = t), say(ex, ey, '?', '#ffffff', 14); break;
      case 'bump': fx.sound('tick', 0.55 + hsh(e.t) * 0.3, 0.3); puff(ex, ey, '#ffffff', 2, 2, 2); break;
      case 'land': fx.sound('thud', 2, 0.3); puff(ex, ey, '#f3dfb0', 3, 2, 2.4); break;
      case 'fstrike': fx.sound('thud', 1.5, 0.45); break;
      case 'fdash': fx.sound('whoosh', 0.95, 0.5); break;
      case 'fray': fx.sound('whoosh', 1.7, 0.5); break;
      case 'myhit': fx.sound('tick', 1.05, 0.5); puff(ex, ey, '#ffffff', 3, 2.6, 2); break;
      case 'domino': fx.sound('crack', 1.7, 0.55); puff(ex, ey, '#fff3c4', 4, 3, 2.2); if (t - (fx.memo.domT ?? -99) > 30) (fx.memo.domT = t), say(ex, ey - R(0.06), '도미노!', '#fff3c4', 16); break;
      case 'wave': fx.sound('whoosh', 0.7, 0.9); fx.sound('thud', 1.7, 0.4); puff(ex, ey, '#fff6dc', 8, 3, 3); break;
      case 'summon': fx.sound('swell', 1, 0.8); say(ex, ey - R(0.1), '졸개들아!', '#ffd0c8', 17); break;
      case 'stage': fx.sound('ding', 1, 0.6); break;
      case 'clear':
        fx.sound('clear', 1, 1);
        puff(w * 0.3, Y(0.7), '#ffd84a', 16, 6, 3.2);
        puff(w * 0.7, Y(0.7), '#9ff0ff', 16, 6, 3.2);
        fx.ring(w / 2, Y(CY), '#ffd84a', R(0.45), 6);
        break;
      case 'pickopen': fx.sound('swell', 1.1, 0.9); break;
      case 'perk': fx.sound('coin', 1, 1); fx.sound('chime', 1.1, 0.9); puff(ex, ey - R(0.1), '#ffe36b', 16, 5, 3.2); fx.ring(ex, ey - R(0.08), '#ffe36b', R(0.2), 5); break;
      case 'end': fx.sound(e.n ? 'clear' : 'fail', 0.9, 1); break;
    }
  }
  // 두근두근 (다섯 마리 넘게 펑 범위에 들었다)
  if (hb && (t % 44 === 0 || t % 44 === 11)) fx.sound('thud', t % 44 ? 1.25 : 1.05, t % 44 ? 0.2 : 0.3);
  if (s.big && (fx.memo.bigT ?? -1) !== s.big.t && s.big.t > seenT) (fx.memo.bigT = s.big.t), fx.sound('chime', 1 + Math.min(8, s.big.n) * 0.04, 1), fx.blink('#fff6c8', 0.22), fx.kick(7);
  fx.memo.t = t;
  ctx.restore();
  drawHud(ctx, s, w, h);
}

/** 위·아래 띠와 띠 위에 뜨는 것(시작 띠 · 큰 순간 · 결과 · 둘 중 하나 · 끝) */
function drawHud(ctx: C2, s: HopState, w: number, h: number) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const sc = typeof ctx.getTransform === 'function' ? Math.min(3, Math.max(1, Math.round(ctx.getTransform().a || 1))) : 1;
  const d = STAGES[s.stage], b = body(s);
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  const text = (str: string, x: number, y: number, fill: string, stroke = '', lw = 0) => {
    ctx.lineJoin = 'round';
    if (lw > 0) (ctx.lineWidth = lw), (ctx.strokeStyle = stroke), ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  };
  const INK = '#4b3020', MUTED = '#a08a70', CREAM = '#fff6dc';
  ctx.textBaseline = 'middle';
  // ── 위 띠: 판 · 새 몸 이름 · 하트 · 별 · 유령 레벨 ──
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, w, Y(0.1));
  ctx.fillStyle = '#e3c48c';
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
  font(0.043, 900);
  text(d.name, X(0.115), Y(0.052), INK);
  const nw = ctx.measureText(d.name).width;
  font(0.034, 700);
  text(`/ ${STAGES.length}`, X(0.115) + nw + R(0.012), Y(0.054), MUTED);
  for (let i = 0; i < 3; i++) {
    heartPath(ctx, X(0.565 + i * 0.05), Y(0.05), R(0.017));
    ctx.fillStyle = i < s.hearts ? '#ff4d5e' : '#e6d6bc';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  starPath(ctx, X(0.725), Y(0.049), R(0.022));
  ctx.fillStyle = '#ffc93c';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  font(0.04, 900);
  text(String(s.stars), X(0.754), Y(0.053), INK);
  drawGhost(ctx, X(0.862), Y(0.05), R(0.02), s.lv, 0, 0, 1);
  font(0.036, 900);
  text(`Lv${s.lv}`, X(0.892), Y(0.053), '#2f6fb0');

  // ── 아래 띠: 별 셋 · 한 줄 도움말 · 도감 ──
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, Y(1.305), w, h - Y(1.305));
  ctx.fillStyle = '#e3c48c';
  ctx.fillRect(0, Y(1.305), w, 2);
  const words = STAR_WORDS(s), res = s.phase === 'result';
  // 셋째 별: 대장 판은 보호막이 깨지는 순간 정해진다(그 뒤로는 못 딴다)
  const state = [res ? 1 : 0, s.kos > 0 ? -1 : res ? 1 : 0, s.best >= d.n ? 1 : res || s.sealed ? -1 : 0];
  font(0.035, 800);
  const prog = s.best > 0 && s.best < d.n && !res && !s.sealed ? ` ${s.best}/${d.n}` : '';
  const labels = words.map((q, i) => q + (i === 2 ? prog : ''));
  const gap = R(0.012), pad = Math.min(R(0.07), (w - R(0.03) - gap * 2 - labels.reduce((a, q) => a + ctx.measureText(q).width, 0)) / 3);
  const ws = labels.map((q) => ctx.measureText(q).width + pad), total = ws.reduce((a, c) => a + c, 0) + gap * 2;
  let cx = (w - total) / 2;
  labels.forEach((q, i) => {
    const cw = ws[i], cy = Y(1.348), on = state[i] > 0, off = state[i] < 0;
    rr(ctx, cx, cy - R(0.027), cw, R(0.054), R(0.027));
    ctx.fillStyle = on ? '#ffe9a0' : off ? '#efe4cf' : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = on ? '#e0a020' : off ? '#d6c6a8' : '#c9a878';
    ctx.lineWidth = on ? 2 : 1.4;
    ctx.stroke();
    starPath(ctx, cx + pad * 0.42, cy - 0.5, R(0.017));
    ctx.fillStyle = on ? '#ffb800' : off ? '#d6c6a8' : '#e9d9b8';
    ctx.fill();
    ctx.textAlign = 'left';
    font(0.035, 800);
    text(q, cx + pad * 0.76, cy + 0.5, off ? '#b8a688' : INK);
    if (off) (ctx.fillStyle = '#b8a688'), ctx.fillRect(cx + pad * 0.72, cy, cw - pad, 1.5);
    cx += cw + gap;
  });
  ctx.textAlign = 'center';
  const boss = s.mons.find((m) => KD[m.k].boss && m.id !== s.me);
  let tip = `${d.name}: ${d.news}`;
  if (s.phase === 'pick') tip = '마당의 큰 물건 둘 중 하나를 톡!';
  else if (s.phase === 'result') tip = s.newDex.length ? `새 몸 ${KD[s.newDex[s.newDex.length - 1]].name}: ${KD[s.newDex[s.newDex.length - 1]].line}` : s.got === 3 ? '별 셋! 판 점수가 네 배' : '별이 많을수록 판 점수가 곱해져요';
  else if (s.phase === 'end') tip = s.won ? '모든 마당을 비웠어요!' : '누르면 다시 해요';
  else if (!s.hopped && s.stage === 0) tip = '적을 톡! 유령이 그 몸으로 옮겨 타요';
  else if (!b && !s.fly && !s.home) tip = s.stage ? '유령이 몸 밖에 있어요 — 4초 안에 아무 적이나 톡!' : '유령이 몸 밖에 있어요 — 아무 적이나 톡!';
  else if (b && b.hp / b.max < 0.36) tip = '몸이 위험해요! 다른 몸으로 톡';
  else if (boss && boss.shield > 0) tip = '대장은 보호막 때문에 못 타요 — 곁에서 펑! 펑!';
  else if (boss && !s.rode) tip = '보호막이 깨졌다! 언제든 대장을 톡 — 온 마당 싹쓸이';
  else if (s.stage === 0 && s.hops < 3) tip = '고리가 차면 다른 적을 톡 — 버린 몸은 펑!';
  else if (s.stage < 3 && s.best < d.n && s.hopped) tip = '버티면 적이 몰려와요 — 고리가 두근거릴 때 갈아타면 크게 펑';
  font(0.036, 800);
  text(tip, w / 2, Y(1.402), INK);
  font(0.034, 700);
  const perks = PERKS.map((p, i) => (s.perk[i] ? p[s.perk[i] - 1].name : '')).filter(Boolean);
  text(`유령 Lv${s.lv} · 도감 ${s.dex.length}/${DEX.length}${perks.length ? ' · ' + perks.join(' · ') : ''}`, w / 2, Y(1.452), MUTED);

  // ── 대장 보호막 띠 ──
  if (boss && s.phase === 'play') {
    const bx = X(0.2), bw = R(0.6), by = Y(0.118), bh = R(0.03), q = clamp(boss.shield / Math.max(1, boss.shieldMax), 0, 1);
    rr(ctx, bx - 2, by - 2, bw + 4, bh + 4, bh);
    ctx.fillStyle = INK;
    ctx.fill();
    rr(ctx, bx, by, bw, bh, bh);
    ctx.fillStyle = '#6b5340';
    ctx.fill();
    if (q > 0) {
      rr(ctx, bx, by, Math.max(bh, bw * q), bh, bh);
      ctx.fillStyle = lin(ctx, 0, by, 0, by + bh, [0, '#fff3a8'], [1, '#f5b921']);
      ctx.fill();
    }
    font(0.034, 900);
    if (!(s.big && t - s.big.t < 62)) text(q > 0 ? '왕관 보호막' : '보호막 깨짐 — 대장을 톡!', w / 2, by + bh / 2 + 0.5, q > 0 ? INK : (t >> 3) % 2 ? '#ffe36b' : '#ffffff', q > 0 ? 'rgba(255,255,255,.7)' : INK, 3);
  }

  // ── 판 시작 띠 (NEW 한 줄) ──
  if (s.banner && s.phase === 'play' && !(s.big && s.big.t >= s.banner.t)) {
    const age = t - s.banner.t, T = 190;
    if (age < T) {
      const a = Math.min(1, age / 10, (T - age) / 14), slide = (1 - Math.min(1, age / 10)) * R(0.05), by = Y(boss ? 0.185 : 0.14) - slide;
      ctx.globalAlpha = clamp(a, 0, 1);
      rr(ctx, X(0.05), by, R(0.9), R(0.112), R(0.03));
      ctx.fillStyle = 'rgba(255,250,235,.96)';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      // 첫 줄: '풀밭 씨름 마당 · 1판' + NEW 딱지 + 새 몸 이름 / 둘째 줄: 그 몸이 하는 일
      font(0.039, 900);
      const hw = ctx.measureText(s.banner.head).width, nw2 = ctx.measureText(d.name).width, pill = R(0.105), gap2 = R(0.014), tot = hw + gap2 + pill + gap2 + nw2;
      let bx0 = w / 2 - tot / 2;
      ctx.textAlign = 'left';
      text(s.banner.head, bx0, by + R(0.033), '#d9480f');
      bx0 += hw + gap2;
      rr(ctx, bx0, by + R(0.012), pill, R(0.042), R(0.021));
      ctx.fillStyle = '#ff3b30';
      ctx.fill();
      font(0.034, 900);
      ctx.textAlign = 'center';
      text('NEW', bx0 + pill / 2, by + R(0.034), '#ffffff');
      ctx.textAlign = 'left';
      font(0.039, 900);
      text(d.name, bx0 + pill + gap2, by + R(0.033), INK);
      ctx.textAlign = 'center';
      font(0.035, 800);
      text(s.banner.sub, w / 2, by + R(0.081), INK);
      ctx.globalAlpha = 1;
    }
  }
  // ── 손가락 (첫 톡 · 대장 타기) ──
  const first = s.phase === 'play' && s.stage === 0 && !s.hopped;
  const ride = s.phase === 'play' && boss && boss.shield <= 0 && !s.rode && s.charge >= 1 ? boss : undefined;
  const hm = first ? s.mons.find((m) => m.k === 'bear') : ride;
  if (hm) {
    const press = Math.max(0, Math.sin(t * 0.14)), hx = X(hm.x) + R(0.045), hy = Y(hm.y) - R(hm.r * 0.4);
    ell(ctx, X(hm.x), Y(hm.y) - R(hm.r), R(hm.r * (1.5 + 0.3 * press)), R(hm.r * (1.5 + 0.3 * press)));
    ctx.strokeStyle = `rgba(255,255,255,${0.9 - 0.5 * press})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    drawHand(ctx, hx, hy, R(0.085), press);
    font(0.046, 900);
    text('톡!', hx + R(0.085), hy - R(0.02), '#ffffff', INK, 4);
  }

  // ── 큰 순간 띠 ──
  if (s.big && t - s.big.t < 62 && s.phase !== 'end') {
    const age = t - s.big.t, pop = age < 7 ? 1.4 - 0.4 * (age / 7) : 1 + 0.03 * Math.sin(age * 0.5), a = Math.min(1, (62 - age) / 14), n = s.big.n;
    const by = Y(0.275), size = 0.058 + Math.min(0.02, n * 0.002);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, by);
    ctx.rotate(-0.05);
    ctx.scale(1, 0.5);
    burstPath(ctx, 0, 0, R(0.3) * Math.min(1.15, pop), 18, 0.8, age * 0.02);
    ctx.fillStyle = 'rgba(255,244,170,.9)';
    ctx.fill();
    ctx.strokeStyle = '#ff8a3d';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.scale(1, 1 / 0.5);
    font(size, 900);
    ctx.save();
    ctx.scale(pop, pop);
    text(s.big.text, 0, s.big.star ? -R(0.022) : 0, '#ff5a2e', '#ffffff', 6);
    ctx.restore();
    if (s.big.star) {
      // 별 셋째를 땄다
      font(0.04, 900);
      const sw = ctx.measureText('별 셋째!').width, k = R(0.024) * (1 + 0.15 * Math.sin(age * 0.5));
      text('별 셋째!', k * 0.9, R(0.04), '#b06a00', '#ffffff', 4);
      starPath(ctx, -sw / 2 - k * 0.4, R(0.038), k);
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
    const pt = s.pt, a = Math.min(1, pt / 10), slide = (1 - a) * R(0.06);
    const cx0 = X(0.06), cy0 = Y(0.13) - slide, cw = R(0.88), chh = R(0.565);
    ctx.globalAlpha = a;
    rr(ctx, cx0, cy0 + 4, cw, chh, R(0.04));
    ctx.fillStyle = 'rgba(75,48,32,.25)';
    ctx.fill();
    rr(ctx, cx0, cy0, cw, chh, R(0.04));
    ctx.fillStyle = '#fffaf0';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    rr(ctx, X(0.2), cy0 - R(0.012), R(0.6), R(0.07), R(0.02));
    ctx.fillStyle = '#ff8a3d';
    ctx.fill();
    ctx.stroke();
    font(0.046, 900);
    text(s.won ? '모든 판을 깼다!' : `${s.stage + 1}판 깼다!`, w / 2, cy0 + R(0.025), '#ffffff');
    // 별 셋
    for (let i = 0; i < 3; i++) {
      const at = 12 + i * 12, sx0 = X(0.23 + i * 0.27), sy0 = cy0 + R(0.125), on = s.starOk[i] && pt >= at, pop = on ? 1 + Math.max(0, 1 - (pt - at) / 8) * 0.6 : 1;
      starPath(ctx, sx0, sy0, R(0.052) * pop);
      ctx.fillStyle = on ? '#ffc93c' : '#eadfc8';
      ctx.fill();
      ctx.strokeStyle = on ? '#a06a12' : '#cdbd9c';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (on && (fx.memo['st' + i] ?? -1) !== s.stage) (fx.memo['st' + i] = s.stage), fx.sound('ding', 1 + i * 0.18, 0.9), fx.burst(sx0, sy0, '#ffd84a', 10, 3, 2.4);
      font(0.034, 800);
      const lab = STAR_WORDS(s)[i], cut = ctx.measureText(lab).width > R(0.27) ? lab.indexOf(' ', Math.floor(lab.length / 2) - 2) : -1;
      if (cut > 0) text(lab.slice(0, cut), sx0, sy0 + R(0.066), s.starOk[i] ? INK : '#b8a688'), text(lab.slice(cut + 1), sx0, sy0 + R(0.099), s.starOk[i] ? INK : '#b8a688');
      else text(lab, sx0, sy0 + R(0.078), s.starOk[i] ? INK : '#b8a688');
    }
    // 점수 (별이 곱한다)
    rr(ctx, X(0.12), cy0 + R(0.243), R(0.76), R(0.058), R(0.02));
    ctx.fillStyle = '#fff0cc';
    ctx.fill();
    font(0.044, 900);
    text(`+${fmt(s.gain)}점`, X(0.34), cy0 + R(0.273), '#d9480f');
    font(0.034, 800);
    text(`별 ${s.got}개 = 판 점수 ×${STAR_MUL[s.got]}`, X(0.66), cy0 + R(0.274), INK);
    // 유령 레벨
    drawGhost(ctx, X(0.14), cy0 + R(0.343), R(0.026), s.lv, t, 3, 1);
    ctx.textAlign = 'left';
    font(0.037, 900);
    text(`유령 Lv${s.lv - 1} → Lv${s.lv}`, X(0.19), cy0 + R(0.345), '#2f6fb0');
    const lw0 = ctx.measureText(`유령 Lv${s.lv - 1} → Lv${s.lv}`).width;
    font(0.034, 700);
    text(LV_GIFT[s.lv] ?? '펑이 더 크고 세져요', X(0.19) + lw0 + R(0.022), cy0 + R(0.347), LV_GIFT[s.lv] ? '#d9480f' : INK);
    // 도감 (타 본 몸) — 다음 판에 나올 새 몸은 점선 동그라미
    const nx: StageDef | undefined = STAGES[s.stage + 1];
    font(0.034, 800);
    text(`도감 ${s.dex.length}/${DEX.length}`, X(0.1), cy0 + R(0.402), MUTED);
    if (s.newDex.length) {
      ctx.textAlign = 'right';
      text(`새 몸! ${s.newDex.map((k) => KD[k].name).slice(-2).join(' · ')}`, X(0.9), cy0 + R(0.402), '#d9480f');
    }
    ctx.textAlign = 'center';
    DEX.forEach((k, i) => {
      const has = s.dex.includes(k), isNew = s.newDex.includes(k), u = R(KD[k].boss ? 0.017 : 0.021), px = X(0.115 + i * 0.0645), py = cy0 + R(0.498) - (isNew ? Math.abs(Math.sin(t * 0.18 + i)) * R(0.01) : 0);
      if (isNew) {
        ell(ctx, px, py - u, u * 1.7, u * 1.7);
        ctx.fillStyle = '#ffe9a0';
        ctx.fill();
        ctx.strokeStyle = '#e0a020';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      const next = !has && !!nx && nx.key === k;
      if (next) {
        ell(ctx, px, py - u, u * 1.7, u * 1.7);
        ctx.strokeStyle = '#ff8a3d';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 3]);
        ctx.lineDashOffset = -t * 0.3;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.save();
      ctx.translate(px, py);
      stamp(ctx, has ? sprite(k, M_HAPPY, 0, Math.round(R(KD[k].r) * 1.12 * Math.min(2, sc))) : silhouette(k, Math.round(R(0.03) * Math.min(2, sc))), u);
      ctx.restore();
      if (next) (font(0.04, 900), text('?', px, py - u, '#ff8a3d', '#ffffff', 3));
    });
    // 다음
    font(0.037, 900);
    if (pt >= RES_MIN) text(s.won ? '톡!' : d.shield && d.ch < PERKS.length ? '톡 하면 장 끝 선물!' : '톡 하면 다음 판', w / 2, cy0 + chh - R(0.033), (t >> 3) % 2 ? '#d9480f' : '#ff8a3d');
    else if (nx) text(d.shield ? `다음 마당: ${CHAPTERS[nx.ch]}` : '다음 판엔 새 몸이 나와요', w / 2, cy0 + chh - R(0.033), MUTED);
    ctx.globalAlpha = 1;
  }

  // ── 장 끝: 둘 중 하나 ──
  if (s.phase === 'pick') {
    const pt = s.pt, picked = s.picked, opts = PERKS[d.ch];
    rr(ctx, X(0.08), Y(0.135), R(0.84), R(0.105), R(0.03));
    ctx.fillStyle = 'rgba(255,250,235,.96)';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    font(0.042, 900);
    text(`${CHAPTERS[d.ch]} 끝! 선물 하나`, w / 2, Y(0.168), '#d9480f');
    font(0.035, 800);
    text(picked < 0 ? '마당의 큰 물건 둘 중 하나를 톡!' : `${opts[picked].name}: ${opts[picked].line}`, w / 2, Y(0.212), INK);
    opts.forEach((o, i) => {
      const px = X(i ? 0.72 : 0.28), drop = picked < 0 ? Math.max(0, 1 - pt / 16) : 0, py = Y(0.9) - drop * drop * R(0.5);
      const chosen = picked === i, other = picked >= 0 && !chosen, k = R(0.15) * (chosen ? 1 + 0.15 * Math.sin(Math.min(1, pt / 12) * Math.PI) : 1);
      ctx.globalAlpha = other ? Math.max(0, 1 - pt / 20) : 1;
      ctx.fillStyle = 'rgba(50,35,10,.2)';
      ell(ctx, px, Y(0.905), R(0.13), R(0.035));
      ctx.fill();
      if (picked < 0 && pt >= PICK_MIN) {
        ell(ctx, px, Y(0.905), R(0.17 + 0.012 * Math.sin(t * 0.2)), R(0.05));
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.setLineDash([7, 6]);
        ctx.lineDashOffset = -t * 0.5;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      drawPerk(ctx, d.ch, i, px, py, k, t);
      rr(ctx, px - R(0.205), Y(0.955), R(0.41), R(0.105), R(0.025));
      ctx.fillStyle = chosen ? '#ffe9a0' : 'rgba(255,250,235,.96)';
      ctx.fill();
      ctx.strokeStyle = chosen ? '#e0a020' : INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      font(0.04, 900);
      text(o.name, px, Y(0.99), '#d9480f');
      font(0.034, 800);
      text(o.line, px, Y(1.034), INK);
      ctx.globalAlpha = 1;
    });
  }

  // ── 끝 ──
  if (s.phase === 'end') {
    const a = Math.min(1, s.pt / 14);
    ctx.globalAlpha = a;
    rr(ctx, X(0.08), Y(0.36), R(0.84), R(0.56), R(0.04));
    ctx.fillStyle = '#fffaf0';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    drawGhost(ctx, w / 2, Y(0.5) + Math.sin(t * 0.1) * R(0.01), R(0.075), s.lv, t, s.won ? 3 : 2, 1);
    font(0.052, 900);
    text(s.won ? '마당 셋을 모두 비웠다!' : '유령이 지쳤어요…', w / 2, Y(0.645), '#d9480f');
    font(0.04, 800);
    text(`${s.won ? STAGES.length : s.stage + 1}판 · 별 ${s.stars}/${STAGES.length * 3} · 도감 ${s.dex.length}/${DEX.length}`, w / 2, Y(0.715), INK);
    font(0.06, 900);
    text(`${fmt(s.pts + s.sp)}점`, w / 2, Y(0.8), INK);
    font(0.035, 700);
    text(s.won ? `유령 Lv${s.lv} — 최고의 꼬마 유령!` : '다시 하면 더 멀리 갈 수 있어요', w / 2, Y(0.87), MUTED);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'center';
}
/** 스크린샷·모음 그림용 (게임에서는 쓰지 않는다) */
export const __art = { sprite, stamp, drawGhost, drawPerk, silhouette };
