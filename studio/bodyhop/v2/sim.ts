/**
 * 👻 몸 갈아타기 스튜디오 2기 — 규칙만: 1기 game.ts(= 공장 arcade/games/bodyhop.ts 복사)에서 결정적 시뮬레이션과 봇만 떼어 왔다.
 * 그림·UI는 가져오지 않는다(draw는 빈 함수 — 2기 그림은 오너가 고른 컨셉으로 새로 짠다). 아래 설명은 프로토타입 규칙 그대로.
 *
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
import { mulberry32, type Rng } from '../rng.ts';
import type { Bot, GameDef, Input } from '../core.ts';

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
  { key: 'crab', ch: 1, name: '대장 집게', news: '두 집게로 쿵쿵. 보호막을 깨고 타요', n: 7, shield: 380, summon: [['mole', 1], ['goat', 1], ['bean', 8]], swarm: [['turtle', 1], ['mole', 2], ['goat', 2], ['bean', 16]], waves: [W(0, 0, ['crab', 1], ['turtle', 1], ['goat', 1], ['mole', 1], ['bean', 11])] },
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

/** 빗변: Math.hypot은 엔진마다 끝자리가 다를 수 있어 제곱근으로 직접 (그래도 sin·cos 구현이 다른 엔진끼리는 같은 시드가 달리 흐를 수 있다 — 한 엔진 안에서는 늘 같다) */
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
  /** 2기: 그림은 시뮬레이션 밖에서(새 렌더러) 그린다 */
  draw() {},
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
/** 3D 화면(look.ts)이 시뮬 좌표를 마당 평면에 올릴 때 쓰는 값 — 시뮬과 같은 상수 */
export const GEO = { A, CX, CY, AR, YS, HOME_X, HOME_Y, GATE_X, GATE_Y, ENTER, IDLE, WIND, DASH, REST, SKILL, CLAIM, CHARGE_T };
export const __jump = (s: HopState, k: number, lv = k + 1, perk: number[] = [k > 3 ? 1 : 0, k > 7 ? 1 : 0]) => ((s.stage = k), (s.lv = lv), (s.perk = perk), newStage(s));
