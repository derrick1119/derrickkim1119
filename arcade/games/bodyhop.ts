/**
 * 👻 몸 갈아타기 (40라운드: 생각 부담 없는 실시간 전투) — 몸 갈아타기 × 연쇄 × 도감.
 * 규칙 한 줄: 톡 한 적의 몸으로 옮겨 탄다 — 가장 센 적이 곧 내 몸이고, 버린 몸은 펑 터진다. 나는 싸울 줄 모르는 꼬마 유령.
 * 조작은 톡 하나: 톡한 곳에서 가장 가까운 적으로 유령이 '슝' 날아가 쏙(큰 몸일수록 잘 잡힌다). 싸움은 탄 몸이 저절로 한다.
 *   옮겨 타는 순간 ① 버린 몸이 펑(둘레의 적이 함께 터짐 — 붐빌 때 버릴수록 이득) ② 새 몸은 체력 가득·잠깐 무적·등장 기술 한 방.
 *   유령 기운 고리가 다 차야(약 1초) 다시 갈아탄다 — 연타는 소용없다. 정답 있는 판·수 제한·되돌리기·힌트 없음: 어떻게 타도 판은 깨진다.
 * 뒤집힘: 센 적이 나올수록 반갑다(다음에 탈 몸). 적은 '쓰러뜨릴 것'이 아니라 '탈 것'이고, 가장 쉬운 처치는 타고 나서 버리는 것.
 * 몸이 쓰러지면 유령이 튀어나와 3초 떠다닌다 — 아무 적이나 톡 하면 복귀. 3초가 지나면 하트 -1 뒤 가장 가까운 적에게 저절로 들어간다.
 *   판 시작엔 유령이 등불 위에 안전하게 앉아 있다(첫 톡 전에는 아무도 다치지 않는다). 1판은 하트를 잃지 않는다.
 * 판 12개(장 3 × 4판, 장 끝은 대장): 1 돌주먹 곰(쿵 — 둘레) → 2 가시 고슴도치(데굴데굴 — 줄) → 3 긴 혀 개구리(쭈욱 — 끌어모으기) → 4 대장 멧돼지
 *   → 5 폭탄 두더지(타자마자 대폭발, 유령은 튀어나옴) → 6 박치기 염소(돌진 — 밀려난 적이 도미노) → 7 방패 거북(빙글 — 튼튼, 모으기) → 8 대장 집게
 *   → 9 번개 구름(연쇄 번개) → 10 포자 버섯(묻은 적은 터질 때 옆도 터뜨림) → 11 분신 너구리(분신 둘 — 펑이 세 번) → 12 대장 천둥 용.
 * 대장: 왕관 보호막 때문에 못 탄다 → 졸개 몸의 펑·기술로 보호막을 깨면 '대장 몸에 타기!' → 대장 몸으로 남은 적을 싹쓸이.
 * 성장: 판을 깨면 유령 레벨 +1(펑 크기·기술 세기·유령 모습) · 장 끝에 마당의 큰 물건 둘 중 하나를 톡(쌍둥이 펑 / 얼음 착지 · 빨아들이는 펑 / 번개 꼬리) · 도감 = 타 본 몸.
 * 별(쉬운 말 셋): 마당 비우기 · 몸 한 번도 안 쓰러지기 · 한 번에 N마리 펑.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5, TAU = Math.PI * 2;
/** 씨름 마당: 화면 좌표(가로 폭 = 1). 세로는 YS배로 눌린 3/4 시점 — 거리 계산은 늘 dist()로 */
const CX = 0.5, CY = 0.805, AR = 0.452, YS = 0.84;
/** 유령이 판 시작에 앉아 있는 등불 */
const HOME_X = 0.5, HOME_Y = 0.345;
/** 한 화면의 적 상한 · 유령 기운이 차는 틱 · 날아가는 틱 · 새 몸 무적 · 쓰러진 뒤 어질 · 몸 밖에서 버티는 틱 */
const CAP = 24, CHARGE_T = 62, FLY_T = 9, INV_T = 50, DIZZY_T = 34, OUT_T = 180;
/** 결과 화면: 톡 받기 시작 · 저절로 넘어감 / 둘 중 하나: 톡 받기 시작 · 저절로 고름 · 고른 뒤 */
const RES_MIN = 90, RES_AUTO = 420, PICK_MIN = 45, PICK_AUTO = 900, PICK_AFTER = 80, END_T = 300;
const WOW_N = 4, CLEAR_PTS = 100, STAR_PTS = 250, WIN_PTS = 600;
/** 내 몸이 이만큼 다가오면 그 떼가 화를 낸다 */
const AGGRO_R = 0.23;

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
  bear: { name: '돌주먹 곰', skill: '쿵!', line: '타면 쿵! 둘레를 한 번에', r: 0.066, hp: 64, spd: 0.0021, foe: F(0, 0.115, 0.15, 0, 54, 90, 15), me: M(0.1, 0.07, 50, 10), pop: 0.17 },
  hedge: { name: '가시 고슴도치', skill: '데굴데굴!', line: '타면 데굴데굴 줄지어 꿰뚫어요', r: 0.046, hp: 38, spd: 0.0034, foe: F(2, 0.34, 0.05, 0.5, 40, 84, 9), me: M(0.08, 0.045, 32, 7), pop: 0.145 },
  frog: { name: '긴 혀 개구리', skill: '쭈욱!', line: '타면 쭈욱! 멀리 있는 적을 끌어모아요', r: 0.05, hp: 34, spd: 0.0026, foe: F(3, 0.36, 0.04, 0.42, 36, 92, 6), me: M(0.28, 0.04, 46, 8), pop: 0.15 },
  mole: { name: '폭탄 두더지', skill: '대폭발!', line: '타자마자 대폭발! 유령은 튀어나와요', r: 0.043, hp: 26, spd: 0.004, foe: F(0, 0.08, 0.16, 0, 56, 0, 24), me: M(0.07, 0.045, 40, 7), pop: 0.14 },
  goat: { name: '박치기 염소', skill: '돌진!', line: '타면 돌진! 밀려난 적이 도미노처럼', r: 0.052, hp: 48, spd: 0.0028, foe: F(2, 0.5, 0.06, 0.75, 48, 100, 14), me: M(0.09, 0.05, 44, 10), pop: 0.15 },
  turtle: { name: '방패 거북', skill: '빙글빙글!', line: '튼튼해요. 타면 빙글 돌며 적을 끌어모아요', r: 0.064, hp: 130, spd: 0.0014, foe: F(0, 0.1, 0.11, 0, 40, 84, 7), me: M(0.09, 0.07, 52, 8), pop: 0.2 },
  cloud: { name: '번개 구름', skill: '찌릿찌릿!', line: '타면 번개가 적에서 적으로 줄줄이', r: 0.052, hp: 32, spd: 0.0024, foe: F(1, 0.4, 0.075, 0, 46, 84, 9), me: M(0.3, 0.04, 38, 8), pop: 0.145 },
  shroom: { name: '포자 버섯', skill: '포자 퐁!', line: '포자 묻은 적은 터질 때 옆도 터뜨려요', r: 0.048, hp: 42, spd: 0.0018, foe: F(0, 0.1, 0.14, 0, 50, 100, 7), me: M(0.09, 0.06, 50, 8), pop: 0.15 },
  tanuki: { name: '분신 너구리', skill: '분신 뿅!', line: '분신 둘이 생겨 펑이 세 번 터져요', r: 0.05, hp: 42, spd: 0.003, foe: F(1, 0.09, 0.06, 0, 30, 72, 8), me: M(0.08, 0.045, 38, 8), pop: 0.145 },
  boar: { name: '대장 멧돼지', skill: '대돌진!', line: '왕관 보호막을 깨면 탈 수 있어요', r: 0.1, hp: 150, spd: 0.0022, foe: F(2, 0.55, 0.1, 0.7, 60, 120, 20), me: M(0.14, 0.2, 34, 40), pop: 0.4, boss: true },
  crab: { name: '대장 집게', skill: '집게 회오리!', line: '두 집게로 쿵쿵. 보호막을 깨고 타요', r: 0.105, hp: 180, spd: 0.002, foe: F(1, 0.34, 0.13, 0, 54, 110, 20), me: M(0.14, 0.2, 34, 44), pop: 0.42, boss: true },
  dragon: { name: '대장 천둥 용', skill: '천둥 숨결!', line: '마지막 대장. 타면 온 마당에 벼락', r: 0.11, hp: 220, spd: 0.002, foe: F(3, 0.5, 0.08, 0.72, 58, 110, 22), me: M(0.16, 0.22, 34, 50), pop: 0.44, boss: true },
};
/** 도감 차례(타 본 몸) */
export const DEX: K[] = ['bean', 'bear', 'hedge', 'frog', 'boar', 'mole', 'goat', 'turtle', 'crab', 'cloud', 'shroom', 'tanuki', 'dragon'];

/** 떼 하나 = 한곳에 뭉쳐 서로 투닥거리는 무리(큰 놈 둘레에 콩알이들) */
type Pack = [K, number][];
interface Wave { need: number; wait: number; packs: Pack[] }
interface StageDef {
  key: K; ch: number; name: string; news: string; n: number; waves: Wave[];
  /** 대장 판: 보호막 · 졸개 부르기 · 대장 몸에 탄 뒤 몰려오는 마지막 떼 */
  shield?: number; summon?: Pack[]; swarm?: Pack[];
}
export const CHAPTERS = ['풀밭 씨름 마당', '바닷가 모래 마당', '구름 위 하늘 마당'];
const W = (need: number, wait: number, ...packs: Pack[]): Wave => ({ need, wait, packs });
const P = (k: K | null, beans: number, k2: K | null = null): Pack => [...(k ? [[k, 1] as [K, number]] : []), ...(k2 ? [[k2, 1] as [K, number]] : []), ['bean', beans]];
/** 판 12개. 첫 떼는 마당에 미리 서 있고(서로 투닥거리는 구경거리), 다음 떼는 적이 줄거나 시간이 지나면 울타리를 넘어 뛰어든다 */
export const STAGES: StageDef[] = [
  { key: 'bear', ch: 0, name: '돌주먹 곰', news: '타면 쿵! 둘레를 한 번에', n: 4, waves: [W(0, 0, P('bear', 6), P('bear', 4)), W(3, 260, P('bear', 5), P(null, 5)), W(3, 320, P('bear', 6), P(null, 5))] },
  { key: 'hedge', ch: 0, name: '가시 고슴도치', news: '타면 데굴데굴 줄지어 꿰뚫어요', n: 6, waves: [W(0, 0, P('hedge', 5), P('bear', 5), P(null, 5)), W(4, 260, P('hedge', 5), P('bear', 5)), W(4, 320, P('hedge', 5), P('hedge', 5))] },
  { key: 'frog', ch: 0, name: '긴 혀 개구리', news: '타면 쭈욱! 멀리 있는 적을 끌어모아요', n: 8, waves: [W(0, 0, P('frog', 5), P('bear', 5), P('hedge', 5)), W(4, 260, P('frog', 6), P('bear', 5)), W(4, 320, P('frog', 5), P('hedge', 6))] },
  { key: 'boar', ch: 0, name: '대장 멧돼지', news: '왕관 보호막을 깨면 탈 수 있어요', n: 9, shield: 120, summon: [P('bear', 5), P(null, 5)], swarm: [P('hedge', 6), P('bear', 6), P(null, 6)], waves: [W(0, 0, P('boar', 0), P('bear', 5), P('frog', 5), P(null, 4))] },
  { key: 'mole', ch: 1, name: '폭탄 두더지', news: '타자마자 대폭발! 유령은 튀어나와요', n: 8, waves: [W(0, 0, P('mole', 6), P('bear', 5), P('hedge', 5)), W(4, 260, P('mole', 5, 'mole'), P('frog', 5)), W(4, 320, P('mole', 6), P('bear', 6))] },
  { key: 'goat', ch: 1, name: '박치기 염소', news: '타면 돌진! 밀려난 적이 도미노처럼', n: 8, waves: [W(0, 0, P('goat', 6), P('mole', 5), P('bear', 5)), W(4, 260, P('goat', 5), P('frog', 6)), W(4, 320, P('goat', 6), P('mole', 5, 'hedge'))] },
  { key: 'turtle', ch: 1, name: '방패 거북', news: '튼튼해요. 타면 빙글 돌며 적을 끌어모아요', n: 9, waves: [W(0, 0, P('turtle', 6), P('goat', 5), P('mole', 5)), W(4, 260, P('turtle', 5), P('hedge', 6)), W(4, 320, P('bear', 6), P('goat', 5), P('mole', 3))] },
  { key: 'crab', ch: 1, name: '대장 집게', news: '두 집게로 쿵쿵. 보호막을 깨고 타요', n: 10, shield: 180, summon: [P('mole', 5), P('goat', 5)], swarm: [P('turtle', 6), P('mole', 6), P('goat', 6)], waves: [W(0, 0, P('crab', 0), P('turtle', 5), P('goat', 5), P('mole', 4))] },
  { key: 'cloud', ch: 2, name: '번개 구름', news: '타면 번개가 적에서 적으로 줄줄이', n: 10, waves: [W(0, 0, P('cloud', 6), P('goat', 5), P('turtle', 5)), W(4, 260, P('cloud', 6), P('mole', 5, 'bear')), W(4, 320, P('cloud', 6), P('frog', 6))] },
  { key: 'shroom', ch: 2, name: '포자 버섯', news: '포자 묻은 적은 터질 때 옆도 터뜨려요', n: 11, waves: [W(0, 0, P('shroom', 6), P('cloud', 5), P('goat', 5)), W(4, 260, P('shroom', 6), P('frog', 5, 'mole')), W(4, 320, P('shroom', 6), P('bear', 6))] },
  { key: 'tanuki', ch: 2, name: '분신 너구리', news: '분신 둘이 생겨 펑이 세 번 터져요', n: 11, waves: [W(0, 0, P('tanuki', 6), P('shroom', 5), P('cloud', 5)), W(4, 260, P('tanuki', 6), P('turtle', 5, 'mole')), W(4, 320, P('tanuki', 6), P('goat', 6))] },
  { key: 'dragon', ch: 2, name: '대장 천둥 용', news: '마지막 대장. 타면 온 마당에 벼락', n: 12, shield: 250, summon: [P('cloud', 5), P('tanuki', 5)], swarm: [P('shroom', 6), P('tanuki', 6), P('goat', 6)], waves: [W(0, 0, P('dragon', 0), P('tanuki', 5), P('shroom', 5), P('cloud', 4))] },
];
export const STAGE_COUNT = STAGES.length;
/** 장 끝 둘 중 하나(마당의 큰 물건) */
export const PERKS: { name: string; line: string }[][] = [
  [{ name: '쌍둥이 북', line: '펑이 두 번 터져요' }, { name: '얼음 종', line: '옮겨 타면 둘레 적이 얼어붙어요' }],
  [{ name: '큰 자석', line: '펑이 적을 빨아들이고 터져요' }, { name: '번개 깃발', line: '날아가는 길의 적이 찌릿' }],
];
/** 배우는 판은 너그럽게: 적이 주는 피해 배수 */
const EZ = [0.3, 0.55, 0.8, 0.9, 1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35];

// ───────────────────────────── 상태 ─────────────────────────────
/** 적 상태: 뛰어드는 중 · 어슬렁/쫓기 · 뜸 들이기 · 돌진 · 쉼 · (내 몸) 등장 기술 · 유령이 날아오는 중 */
const ENTER = 0, IDLE = 1, WIND = 2, DASH = 3, REST = 4, SKILL = 5, CLAIM = 6;
const ENTER_T = 34;
interface Mon {
  id: number; k: K; x: number; y: number; r: number; hp: number; max: number; shield: number; shieldMax: number;
  st: number; tm: number; cool: number; ang: number; ax: number; ay: number;
  vx: number; vy: number; air: number; stun: number; frozen: number; spore: number; inv: number;
  /** 등장 기술·돌진 진행: 남은 구간 · 이번 구간에 친 적 · 기술 틱 · 기술 피해의 출처(갈아탄 번호, 0 = 자동) */
  legs: number; hits: number[]; sk: number; sksrc: number; ult: number;
  /** 마지막으로 때린 출처 · 도미노 쉼 */
  src: number; dom: number;
  /** 떼 번호 · 화남(내 몸을 쫓는다) */
  pack: number; mad: boolean;
  fx0: number; fy0: number; dead: boolean;
  // 연출 (시뮬레이션 결과와 무관)
  seed: number; born: number; hurtT: number; face: number; bumpT: number; spar: number; atkT: number; walkT: number;
}
interface Decoy { x: number; y: number; hp: number; born: number }
/** 뒤에 일어날 일: 포자 터짐 · 두 번째 펑 · 번개 한 칸 · 마지막 떼 */
interface Q { t: number; k: 'burst' | 'pop2' | 'bolt' | 'swarm'; x: number; y: number; r: number; dmg: number; src: number; left: number; hit: number[] }
/** 사라진 몸 (연출): 0 터짐 · 1 내 몸 쓰러짐 · 2 대폭발 · 3 버린 몸 펑 */
interface Corpse { k: K; x: number; y: number; t: number; how: number; vx: number; vy: number; seed: number; n: number }
interface Ev { t: number; k: string; x: number; y: number; n: number; x2: number; y2: number; text: string }
interface Line { k: number; x0: number; y0: number; x1: number; y1: number; t: number; id: number }

export interface HopState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result' | 'pick' | 'end'; pt: number;
  hearts: number; pts: number; stars: number; got: number; starOk: boolean[]; dead: boolean; won: boolean;
  /** 유령 레벨 · 장 끝에 고른 것(0 아직 · 1 왼쪽 · 2 오른쪽) · 방금 고른 것 · 도감 · 이번 판에 새로 탄 몸 */
  lv: number; perk: number[]; picked: number; dex: K[]; newDex: K[];
  mons: Mon[]; nid: number; npack: number; me: number; gx: number; gy: number; home: boolean;
  fly: { x0: number; y0: number; to: number; t: number; T: number } | null;
  charge: number; dizzy: number; out: number; hopped: boolean; hops: number;
  /** 이번 갈아타기: 번호 · 틱 · 한 번에 터뜨린 수 */
  hop: { id: number; t: number; n: number };
  best: number; kos: number; kills: number;
  wave: number; waveT: number; summonT: number; swarmed: boolean; rode: boolean; clearT: number;
  decoys: Decoy[]; q: Q[]; corpses: Corpse[]; events: Ev[]; lines: Line[];
  down: boolean; wowN: number; firstTap: number; firstBig: number; denyT: number; readyT: number;
  seen: Set<string>;
  banner: { head: string; sub: string; t: number } | null; spot: { id: number; t: number; label: string } | null;
  big: { text: string; t: number; n: number } | null;
}

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, (ay - by) / YS);
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

function wow(s: HopState, text: string, n = 0) {
  s.wowN++;
  if (s.firstBig < 0 && s.firstTap >= 0) s.firstBig = s.t;
  s.big = { text, t: s.t, n };
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
}
function corpse(s: HopState, m: Mon, how: number, n = 0) {
  s.corpses.push({ k: m.k, x: m.x, y: m.y, t: s.t, how, vx: m.vx, vy: m.vy, seed: m.seed, n });
  if (s.corpses.length > 28) s.corpses.shift();
}

// ───────────────────────────── 떼 ─────────────────────────────
function add(s: HopState, k: K, x: number, y: number, from: number | null, pack: number): Mon {
  const d = KD[k], hp = Math.round(d.hp * (1 + 0.1 * s.stage));
  const m: Mon = {
    id: ++s.nid, k, x, y, r: d.r, hp, max: hp, shield: 0, shieldMax: 0, st: from === null ? IDLE : ENTER, tm: from === null ? 0 : ENTER_T,
    cool: 24 + Math.floor(s.rng() * 70), ang: 0, ax: x, ay: y, vx: 0, vy: 0, air: 0, stun: 0, frozen: 0, spore: 0, inv: 0,
    legs: 0, hits: [], sk: 0, sksrc: 0, ult: 0, src: 0, dom: 0, pack, mad: !!d.boss, fx0: x, fy0: y, dead: false,
    seed: Math.floor(s.rng() * 1e6), born: s.t, hurtT: -99, face: x < CX ? 1 : -1, bumpT: -99, spar: 0, atkT: -99, walkT: -99,
  };
  if (from !== null) {
    m.fx0 = CX + Math.cos(from) * (AR + 0.17);
    m.fy0 = CY + Math.sin(from) * (AR + 0.17) * YS;
    m.x = m.fx0;
    m.y = m.fy0;
  }
  if (d.boss) m.shield = m.shieldMax = Math.round((STAGES[s.stage].shield ?? 100) * 1);
  if (!s.seen.has('k:' + k)) see(s, 'k:' + k);
  s.mons.push(m);
  return m;
}
/** 떼가 설 자리: 미리 선 떼는 가운데 + 둘레로 고르게, 뛰어드는 떼는 내 몸에서 먼 쪽으로 */
function packSpots(s: HopState, n: number, pre: boolean): [number, number, number][] {
  const out: [number, number, number][] = [], b = body(s);
  let base = s.rng() * TAU;
  if (pre && s.stage === 0) base = 0.55;
  if (!pre && b && dist(b.x, b.y, CX, CY) > 0.08) base = angTo(b.x, b.y, CX, CY) + (s.rng() - 0.5) * 0.8;
  for (let i = 0; i < n; i++) {
    if (pre && i === 0) {
      out.push([CX, CY + 0.01, -Math.PI / 2]);
      continue;
    }
    const k = pre ? i - 1 : i, cnt = pre ? n - 1 : n, span = pre ? TAU : Math.min(TAU, cnt * 1.6);
    const a = base + (cnt > 1 ? (k / cnt - (pre ? 0 : 0.5 - 0.5 / cnt)) * span : 0) + (s.rng() - 0.5) * 0.25, q = pre ? 0.3 : 0.25 + s.rng() * 0.06;
    out.push([CX + Math.cos(a) * q, CY + Math.sin(a) * q * YS, a]);
  }
  return out;
}
function spawn(s: HopState, packs: Pack[], pre: boolean) {
  const spots = packSpots(s, packs.length, pre);
  packs.forEach((pk, pi) => {
    const [px, py, pa] = spots[pi], id = ++s.npack;
    let i = 0, ring = 0;
    const total = pk.reduce((a, q) => a + q[1], 0), bigs = pk.reduce((a, q) => a + (q[0] === 'bean' ? 0 : q[1]), 0);
    for (const [k, n] of pk)
      for (let j = 0; j < n; j++, i++) {
        if (others(s) >= CAP) return;
        // 큰 놈은 가운데, 콩알이는 둘레에 빙 둘러
        let x = px, y = py;
        if (k !== 'bean') (x += bigs > 1 ? (i - (bigs - 1) / 2) * 0.1 : 0), (y += 0);
        else {
          const cnt = total - bigs, a = 0.5 + (ring * TAU) / Math.max(1, cnt) + id, q = (bigs ? 0.105 + (KD[pk[0][0]].r - 0.05) : 0.06) + (ring % 2) * 0.012;
          x += Math.cos(a) * q;
          y += Math.sin(a) * q * YS;
          ring++;
        }
        const c = { x, y, r: KD[k].r };
        keepIn(c);
        if (pre) add(s, k, c.x, c.y, null, id);
        else {
          const m = add(s, k, c.x, c.y, pa, id);
          m.fx0 += c.x - px;
          m.fy0 += c.y - py;
          m.x = m.fx0;
          m.y = m.fy0;
          m.ax = c.x;
          m.ay = c.y;
          m.tm = ENTER_T + ((i * 3) % 10);
        }
      }
  });
}
function spawnWave(s: HopState) {
  const d = STAGES[s.stage], w = d.waves[s.wave];
  spawn(s, w.packs, s.wave === 0);
  if (s.wave > 0) ev(s, 'wave', CX, CY, s.wave);
  s.wave++;
  s.waveT = 0;
}
/** 떼 전체가 화를 낸다 */
function anger(s: HopState, pack: number) {
  for (const m of s.mons) if (m.pack === pack && !m.mad && !m.dead) (m.mad = true), ev(s, 'mad', m.x, m.y - m.r * 2);
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
  s.phase = 'play';
  s.pt = 0;
  s.starOk = [false, false, false];
  s.got = 0;
  s.newDex = [];
  s.big = null;
  spawnWave(s);
  const first = s.stage === 0 || STAGES[s.stage - 1].ch !== d.ch, nw = s.mons.find((m) => m.k === d.key);
  s.banner = { head: `${first ? CHAPTERS[d.ch] + ' · ' : ''}${s.stage + 1}판`, sub: `NEW ${d.name} — ${d.news}`, t: s.t };
  s.spot = nw ? { id: nw.id, t: s.t, label: 'NEW ' + d.name } : null;
  see(s, 'stage' + s.stage);
  if (first) see(s, 'ch' + d.ch);
  ev(s, 'stage', CX, CY, s.stage);
}

// ───────────────────────────── 때리기 ─────────────────────────────
function kill(s: HopState, m: Mon, src: number) {
  if (m.dead) return;
  m.dead = true;
  s.kills++;
  let n = 0;
  if (src > 0 && src === s.hop.id) {
    n = ++s.hop.n;
    s.best = Math.max(s.best, n);
    s.pts += 4 * n * n; // n번째는 4·n² — 한 번에 많이 터뜨릴수록 훨씬 크다
    if (n === WOW_N) wow(s, `${n}마리 한 방!`, n);
    else if (n > WOW_N && s.big) (s.big.text = `${n}마리 한 방!`), (s.big.n = n), (s.big.t = Math.max(s.big.t, s.t - 8));
  } else s.pts += 5;
  corpse(s, m, 0, n);
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
      m.stun = 170;
      m.st = IDLE;
      m.tm = 0;
      wow(s, '보호막 와장창!');
      ev(s, 'break', m.x, m.y - m.r);
      see(s, 'break');
      s.spot = { id: m.id, t: s.t, label: '대장 몸에 타기!' };
    }
    return;
  }
  m.hp -= amt;
  if (!m.mad) anger(s, m.pack);
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
    const v = Math.hypot(m.x - x, m.y - m.r * 0.8 - y) - m.r * 1.6;
    if (v < bv) (bv = v), (best = m);
  }
  return best;
}
/** 버린 몸이 펑 */
function abandon(s: HopState, b: Mon) {
  const r = popR(s, b.k), dmg = popDmg(s), src = s.hop.id;
  b.dead = true;
  s.kills++;
  s.pts += 5;
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
    const dx = m.x - x0, dy = (m.y - m.r - y0) / YS, L = Math.hypot(dx, dy) || 1e-6;
    for (const o of s.mons) {
      if (!hittable(s, o)) continue;
      const u = clamp(((o.x - x0) * dx + ((o.y - o.r - y0) / YS) * dy) / (L * L), 0, 1);
      if (Math.hypot(o.x - (x0 + dx * u), (o.y - o.r - y0) / YS - dy * u) < 0.075 + o.r * 0.5) {
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
  s.gx = m.x;
  s.gy = m.y - m.r;
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
const BEAR_R = 0.2, HEDGE_W = 0.05, GOAT_W = 0.065, FROG_R = 0.46, MOLE_R = 0.28, TURTLE_R = 0.3, BOLT_N = 8, SPORE_R = 0.46;
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
      if (t === 0) (m.legs = 3), (m.hits = []), (m.ang = bestDir(s, m.x, m.y, HEDGE_W, 24 * mul));
      if (t === 5) ev(s, 'roll', m.x, m.y, 0, 0, 0, m.k);
      if (t >= 5) rollStep(s, m, 0.034, HEDGE_W, 24 * mul, 0.012);
      break;
    case 'goat':
      if (t === 0) (m.legs = 2), (m.hits = []), (m.ang = bestDir(s, m.x, m.y, GOAT_W, 26 * mul));
      if (t === 6) ev(s, 'roll', m.x, m.y, 0, 0, 0, m.k);
      if (t >= 6) rollStep(s, m, 0.042, GOAT_W, 26 * mul, 0.034);
      break;
    case 'frog':
      if (t === 7) {
        const list = s.mons.filter((o) => hittable(s, o) && !KD[o.k].boss && dist(m.x, m.y, o.x, o.y) < FROG_R).sort((a, b) => dist(m.x, m.y, a.x, a.y) - dist(m.x, m.y, b.x, b.y)).slice(0, 14);
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
        s.pts += 5;
        corpse(s, m, 2);
        s.me = 0;
        s.gx = m.x;
        s.gy = m.y - 0.1;
        s.dizzy = 16;
        s.out = 0;
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
      if (t === 0) (m.legs = 4), (m.hits = []), (m.ang = bestDir(s, m.x, m.y, 0.16, 999));
      if (t === 8) ev(s, 'roll', m.x, m.y, 0, 0, 0, m.k);
      if (t >= 8) rollStep(s, m, 0.044, 0.16, 140 * mul, 0.03);
      break;
    case 'crab':
      if (t % 12 === 6) {
        ev(s, 'spin', m.x, m.y, 0, 0.5);
        for (const o of s.mons) {
          if (!hittable(s, o)) continue;
          const d = dist(m.x, m.y, o.x, o.y), a = angTo(o.x, o.y, m.x, m.y);
          if (d < 0.3) hurt(s, o, 50 * mul, src);
          if (!o.dead) (o.vx = Math.cos(a) * d * 0.09), (o.vy = Math.sin(a) * d * 0.09), (o.air = Math.max(o.air, 8)), (o.stun = Math.max(o.stun, 30));
        }
      }
      if (t >= 80) endSkill(m);
      break;
    case 'dragon':
      if (t === 8) s.q.push({ t: s.t, k: 'bolt', x: m.x, y: m.y, r: 3, dmg: 160 * mul, src, left: 24, hit: [] });
      if (t >= 40) endSkill(m);
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
      s.pts += 5;
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
/** 유령이 몸 밖에 있을 때: 서로 투닥거리며 논다 (다치지 않는다 — 구경거리) */
function spar(s: HopState, m: Mon) {
  if (KD[m.k].boss) return;
  let p = m.spar ? s.mons.find((o) => o.id === m.spar && !o.dead && o.st === IDLE) : undefined;
  if (!p || (s.t + m.seed) % 150 === 0) {
    let bd = 1e9;
    p = undefined;
    for (const o of s.mons) {
      if (o === m || o.dead || o.st !== IDLE || o.id === s.me) continue;
      const d = dist(m.x, m.y, o.x, o.y) + ((o.seed + m.seed) % 7) * 0.02 + (o.pack === m.pack ? 0 : 0.5);
      if (d < bd) (bd = d), (p = o);
    }
    m.spar = p ? p.id : 0;
  }
  if (!p) return;
  const d = dist(m.x, m.y, p.x, p.y), a = angTo(m.x, m.y, p.x, p.y);
  if (s.t - m.bumpT < 26) return;
  if (d > m.r + p.r + 0.004) walk(s, m, a, KD[m.k].spd * 0.7);
  else {
    // 툭! 서로 밀려난다
    const pm = KD[p.k].boss ? 0 : 1;
    m.vx = -Math.cos(a) * 0.011;
    m.vy = -Math.sin(a) * 0.011;
    p.vx = Math.cos(a) * 0.011 * pm;
    p.vy = Math.sin(a) * 0.011 * pm;
    m.bumpT = p.bumpT = s.t;
    m.face = Math.cos(a) > 0 ? 1 : -1;
    p.face = -m.face;
    ev(s, 'bump', (m.x + p.x) / 2, (m.y + p.y) / 2 - m.r);
  }
}
function foeStep(s: HopState, m: Mon) {
  const d = KD[m.k], f = d.foe;
  if (m.st === ENTER) {
    const u = clamp(1 - --m.tm / ENTER_T, 0, 1);
    m.x = m.fx0 + (m.ax - m.fx0) * u;
    m.y = m.fy0 + (m.ay - m.fy0) * u;
    if (m.tm <= 0) (m.st = IDLE), (m.x = m.ax), (m.y = m.ay), ev(s, 'land', m.x, m.y, 0, 0, 0, m.k);
    return;
  }
  if (m.st === CLAIM) return;
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
    if (td < AGGRO_R) anger(s, m.pack);
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
  else if (dd > reach * 0.92) walk(s, m, a, d.spd);
  else if (Math.abs(Math.cos(a)) > 0.25) m.face = Math.cos(a) > 0 ? 1 : -1;
}
/** 내 몸: 가장 가까운 적에게 걸어가 저절로 싸운다 */
function myStep(s: HopState, m: Mon) {
  if (m.inv > 0) m.inv--;
  if (m.st === SKILL) return skillStep(s, m);
  if (m.air > 0) return;
  if (m.cool > 0) m.cool--;
  const d = KD[m.k];
  let o: Mon | null = null, od = 1e9;
  for (const q of s.mons) {
    if (!hittable(s, q)) continue;
    const dq = dist(m.x, m.y, q.x, q.y) - q.r * 0.6;
    if (dq < od) (od = dq), (o = q);
  }
  if (!o) return;
  // 대장 몸: 큰 기술을 저절로 되풀이한다 (싹쓸이)
  if (d.boss && ++m.ult >= 170 && others(s) >= 3) return void ((m.st = SKILL), (m.sk = 0), (m.sksrc = s.t - s.hop.t < 400 ? s.hop.id : 0), (m.ult = 0));
  const a = angTo(m.x, m.y, o.x, o.y);
  if (od > d.me.range) walk(s, m, a, d.spd * 1.2);
  else {
    if (Math.abs(Math.cos(a)) > 0.25) m.face = Math.cos(a) > 0 ? 1 : -1;
    if (m.cool <= 0) {
      m.cool = d.me.per;
      m.atkT = s.t;
      m.ang = a;
      ev(s, 'myhit', o.x, o.y - o.r, 0, 0, 0, m.k);
      if (d.me.range > 0.2) s.lines.push({ k: m.k === 'frog' ? 0 : 2, x0: m.x, y0: m.y - m.r, x1: o.x, y1: o.y - o.r, t: s.t, id: 0 });
      blast(s, o.x, o.y, d.me.r, d.me.dmg * skillMul(s), 0, 0.008);
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
      const dx = b.x - a.x, dy = (b.y - a.y) / YS, d = Math.hypot(dx, dy), min = (a.r + b.r) * 0.86;
      if (d >= min) continue;
      // 도미노: 세게 밀려난 적이 다른 적에 부딪히면 그 적도 다치고 밀린다
      for (const [p, q] of [[a, b], [b, a]] as [Mon, Mon][]) {
        const sp = Math.hypot(p.vx, p.vy);
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
      spawn(s, STAGES[s.stage].swarm ?? [], false);
      ev(s, 'wave', CX, CY, 9);
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
  s.pts += CLEAR_PTS + s.got * STAR_PTS;
  s.lv++;
  see(s, 'lv' + s.lv);
  s.spot = null;
  if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * 100);
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
  // 몸 밖의 유령: 3초(1판은 얼마든지) 안에 아무 적이나 톡 — 지나면 하트 -1 뒤 가장 가까운 적에게 저절로
  if (!b && !s.fly && !s.home && s.dizzy === 0 && s.stage > 0 && s.mons.some((m) => ridable(s, m))) {
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
  // 다음 떼 · 대장의 졸개 부르기
  const n = others(s);
  if (s.hopped) s.waveT++;
  if (s.hopped && s.wave < d.waves.length) {
    const w = d.waves[s.wave], size = w.packs.reduce((a, pk) => a + pk.reduce((c, q) => c + q[1], 0), 0);
    if (n <= w.need || (s.waveT >= w.wait && n + size <= CAP)) spawnWave(s);
  }
  const boss = d.shield ? s.mons.find((m) => KD[m.k].boss && m.id !== s.me) : undefined;
  if (boss && s.hopped && d.summon) {
    const minions = n - 1;
    if (++s.summonT >= 260 || (minions <= 2 && s.summonT >= 40)) (s.summonT = 0), minions < 12 && (spawn(s, d.summon, false), ev(s, 'summon', boss.x, boss.y - boss.r));
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
    '몸이 쓰러지면 3초 안에 아무 적이나 톡. 마당을 비우면 다음 판!',
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
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, hearts: 3, pts: 0, stars: 0, got: 0, starOk: [false, false, false], dead: false, won: false,
      lv: 1, perk: [0, 0], picked: -1, dex: [], newDex: [], mons: [], nid: 0, npack: 0, me: 0, gx: HOME_X, gy: HOME_Y, home: true, fly: null,
      charge: 1, dizzy: 0, out: 0, hopped: false, hops: 0, hop: { id: 0, t: -999, n: 0 }, best: 0, kos: 0, kills: 0,
      wave: 0, waveT: 0, summonT: 0, swarmed: false, rode: false, clearT: 0, decoys: [], q: [], corpses: [], events: [], lines: [],
      down: false, wowN: 0, firstTap: -1, firstBig: -1, denyT: -99, readyT: -99, seen: new Set<string>(), banner: null, spot: null, big: null,
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
      playStep(s);
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
  score: (s) => s.pts,
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
function judge(s: HopState, c: Mon): { kills: number; soft: number } {
  const b = body(s), mul = skillMul(s), hp = new Map<number, number>();
  const list = s.mons.filter((o) => hittable(s, o) && o !== c);
  for (const o of list) hp.set(o.id, o.shield > 0 ? 1e6 + o.shield : o.hp / (o.frozen > 0 ? 1.5 : 1));
  let soft = 0;
  const hit = (o: Mon, dmg: number) => {
    const v = hp.get(o.id)!;
    if (v > 1e5) soft += Math.min(dmg, v - 1e6) * 0.012;
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
  const near = (r: number) => list.reduce((a, o) => a + (hp.get(o.id)! > 0 && dist(c.x, c.y, o.x, o.y) < r ? 1 : 0), 0);
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
  return { kills, soft };
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
    let best: Mon | null = null, bv = -1e9, bk = 0;
    for (const m of s.mons) {
      if (!ridable(s, m)) continue;
      const j = judge(s, m);
      let v = j.kills + j.soft + KD[m.k].hp * 0.004;
      if (KD[m.k].boss) v += 4;
      if (!s.dex.includes(m.k)) v += 1.5;
      if (v > bv) (bv = v), (best = m), (bk = j.kills);
    }
    if (!best) return NO;
    if (!b) return tapOn(best);
    const key = `${s.stage}:${s.hop.id}`;
    let w = waitMem.get(s);
    if (!w || w.key !== key) waitMem.set(s, (w = { key, since: s.t }));
    const waited = s.t - w.since, n = others(s);
    const urgent = b.hp / b.max < 0.42 || (b.max < 20 && b.hp / b.max < 0.75);
    const want = Math.min(Math.max(1, n - 1), s.best < d.n ? d.n : 3);
    if (urgent || bk >= want || bv >= want + 1 || waited > (s.best < d.n ? 110 : 45)) return tapOn(best);
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

function drawAll(_ctx: CanvasRenderingContext2D, s: HopState, _w: number, _h: number, _th: Theme) {
  juice(s);
}
