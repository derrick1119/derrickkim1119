/**
 * 👊 땅 주먹 저글링 (41라운드: 실시간 전투 · 새 뼈대) — 땅 주먹 × 연쇄 × 도감.
 * 규칙 한 줄: 톡 한 땅에서 거대한 흙 주먹이 '쾅!' 솟아 둘레 놈들을 하늘로 날린다 — 떨어지는 놈 아래를 또 치면 더 높이(공중 연속),
 *   떨어지는 놈은 아래 놈들을 깔아 함께 기절시킨다. 기절한 놈은 동전으로 펑.
 * 뒤집힘: 나는 땅 그 자체(꼬마 흙 정령)다. 적을 때리지 않는다 — 땅을 쳐서 띄우고, 띄운 놈을 무기로 떨어뜨린다.
 * 무대: 밝은 낮의 들판 → 숲 → 사막 길을 옆에서 보며 오른쪽으로 나아간다(카메라가 천천히 흐르고, 길이 비면 휙 앞으로 — 꽃길 가까이에 놈이 있으면 기다려 준다).
 *   지킬 기지는 없다: 길에서 어슬렁대는 작은 무리(3~6)가 화면 왼쪽 끝(지나온 꽃길)까지 걸어오면 꽃을 밟는다(하트 -1). '지키기'가 아니라 '길을 쓸며 나아가기'.
 * 조작은 톡 하나(주먹 사이 쉼 0.5초): 어디를 쳐도 주먹은 솟는다(길 위 놈은 화면 폭 14% 안, 떨어지는 놈은 17% 안 — 그림자 근처 아무 데나, 떨어지는 1.5초 내내).
 *   주먹 가운데에서 먼 놈일수록 바깥쪽으로 날아간다 → 무리의 가장자리를 치면 날아간 놈들이 옆 무리 위로 떨어진다(떨어질 자리 고리: 아래에 깔릴 놈이 있으면 금빛).
 * 솜씨 = 눈덩이: 떨어지는 무리가 다음 무리 위에 올 때 그 자리를 치면 한 주먹에 둘 다 뜨고, 그것을 또 앞 무리 위로 — '한 주먹에 N마리'(별 셋째).
 *   한 놈은 공중에서 세 번까지 맞는다 — 세 번째에 별똥별(불꼬리)이 되어 더는 안 맞고, 높이서 떨어지는 놈(공중 둘 이상·무거운 놈)은 쿵! 둘레를 들썩 띄운다.
 *   정답은 없다: 아무 데나 쳐도 누군가는 뜬다. 기다릴 것도 없다: 무리는 처음부터 뭉쳐 있고, 쉼만 끝나면 늘 칠 것이 있다.
 * 판 12개(장 3 × 4판, 장 끝은 대장): 들판 1 말랑이 → 2 덩치 곰(낮게 뜨고 쿵! 넓게) → 3 우산 두더지(둥실둥실 — 또 치기 쉬움) → 4 대장 거인 멧돼지
 *   → 숲 5 고무공 거북(떨어지면 통통 두 번 더) → 6 바위 골렘(두 번째 주먹에 와장창 — 파편이 둘레를 띄움) → 7 구름 밭(구름에 걸린 놈은 오래 떠 있다) → 8 대장 버섯 왕
 *   → 사막 9 선인장 밭(선인장에 떨어지면 '앗!' 또 튐) → 10 폭탄 풍뎅이(떨어지면 펑 — 둘레가 다 뜸) → 11 모래 회오리(치면 회오리가 둘레를 빨아올림) → 12 대장 거인 전갈.
 * 대장: 너무 무거워 주먹으로 안 뜬다(끄떡없다!) → 곁에서 솟아나는 졸개를 띄워 머리 위로 떨어뜨리면 휘청(높이 떠 있던 놈·무거운 놈일수록 크게) → 휘청 눈금이 차면
 *   '땅이 통째로 솟는다!' — 땅 기둥이 대장을 들어 올려 하늘 끝으로 날리고, 길 위의 졸개도 모두 뜬다.
 * 성장(저절로): 판을 깨면 흙 정령 레벨 +1(주먹 크기·띄우는 높이·모습: 풀 머리 → 꽃 → 꽃 둘 → 나무 왕관 → 금빛) · 장 끝에 길 위의 큰 돌상 둘 중 하나를 톡
 *   (용암 주먹 / 쌍둥이 주먹 · 천둥 착지 / 회오리 주먹 — 쌍둥이 주먹이 띄운 놈은 '한 주먹' 수에 안 든다) · 도감 = 띄워 본 몬스터 10.
 * 별(쉬운 말 셋): 길 끝까지 · 꽃길 안 밟히기 · 한 주먹에 N마리(주먹이 바로 띄운 수 — 쾅! 하는 순간에 정해진다).
 * 점수: 기절한 놈 하나 = ⌈마지막으로 친 주먹이 바로 띄운 수 × (1 + 공중에서 맞은 횟수) ÷ 2⌉ — 큰 한 주먹과 오래 띄우기가 곧 점수, 판 점수는 별 수로 곱(×1·×2·×4).
 * 큰 띠는 아낀다: 그 판 최고 한 주먹을 둘 이상 넘을 때 · 별 셋째 · 대장이 솟을 때만. 나머지는 사건 자리의 작은 숫자와 소리.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5, TAU = Math.PI * 2, DT = 1 / 60;
/** 길(옆에서 본 띠, 화면 폭 = 1): 발이 닿는 뒤 가장자리 y · 길의 깊이 · 흙 단면 위 · 아래 띠 */
const GY = 0.985, DZ = 0.15, SOIL = 1.19, HUD_B = 1.305;
/** 주먹: 반지름(화면 폭 비) · 공중 놈은 이만큼 더 넉넉히 · 주먹 사이 쉼(틱) · 떨어지는 중으로 치는 빠르기(이보다 느리게 오르면 이미 '떨어지는 중') */
const RF = 0.14, AIR_K = 1.2, CD = 30, FALLING = 0.35;
/** 뜨기: 오를 때 중력(화면 폭/초²) · 가장 높이 · 옆으로 밀리는 빠르기 · 공중 연속 한 번마다 높이 */
const G_UP = 3.3, H_MAX = 0.8, VX = 0.4, UP_PER = 0.18;
/** 한 놈을 공중에서 칠 수 있는 횟수 — 세 번째로 맞으면 별똥별: 더는 안 맞고 쿵! 크게 떨어진다 */
const C_MAX = 3;
/** 카메라: 길이 비었을 때 · 판 시작 뒤 저절로 움직이기까지(1판은 첫 톡까지) */
const CAM_FAST = 0.24, CAM_WAIT = 90;
/** 꽃길(화면 왼쪽 끝) · 한 번 밟힌 뒤 하트를 또 잃지 않는 틱 · 화면의 적 상한 */
const EDGE = 0.035, SAFE_T = 150, CAP = 24;
/** 구름에 걸려 있는 틱 · 기절한 놈이 동전이 되기까지 · 회오리가 도는 틱 · 용암이 남는 틱 */
const CATCH_T = 200, KO_T = 34, TWIST_T = 110, LAVA_T = 72, UP_LIFT = 26;
/** 결과 화면: 톡 받기 시작 · 저절로 넘어감 / 둘 중 하나: 톡 받기 시작 · 저절로 고름 · 고른 뒤 */
const RES_MIN = 90, RES_AUTO = 420, PICK_MIN = 40, PICK_AUTO = 900, PICK_AFTER = 64, END_T = 210;
/** 점수: 큰 띠가 뜨는 한 주먹 수 · 판 점수 배수(별 0~3) · 판 깸 · 다 깸 */
const WOW_N = 4, STAR_MUL = [1, 1, 2, 4], CLEAR_PTS = 20, WIN_PTS = 100;

type K = 'blob' | 'bear' | 'mole' | 'boar' | 'turtle' | 'golem' | 'shroom' | 'bomb' | 'twister' | 'scorp';
interface KDef {
  name: string; line: string; r: number;
  /** 첫 주먹에 뜨는 높이 · 깔아뭉개는 반지름 · 내려올 때 중력 · 내려오는 가장 빠른 속도 · 옆 끌림(틱마다 곱) */
  H: number; sq: number; gdn: number; vt: number; drag: number;
  heavy?: boolean; boss?: boolean;
}
export const KD: Record<K, KDef> = {
  blob: { name: '말랑이', line: '가볍게 붕! 높이 떠요', r: 0.037, H: 0.5, sq: 0.06, gdn: 0.7, vt: 0.42, drag: 0.975 },
  bear: { name: '덩치 곰', line: '낮게 뜨지만 떨어지면 쿵! 둘레가 들썩', r: 0.06, H: 0.27, sq: 0.11, gdn: 2.2, vt: 1.0, drag: 0.965, heavy: true },
  mole: { name: '우산 두더지', line: '우산 펴고 둥실둥실 — 또 치기 쉬워요', r: 0.039, H: 0.5, sq: 0.06, gdn: 0.45, vt: 0.15, drag: 0.99 },
  boar: { name: '거인 멧돼지', line: '안 떠요 — 졸개를 머리 위로 떨어뜨려요', r: 0.14, H: 0, sq: 0, gdn: 1, vt: 1, drag: 1, boss: true },
  turtle: { name: '고무공 거북', line: '떨어지면 통통! 두 번 더 튀며 깔아요', r: 0.045, H: 0.44, sq: 0.066, gdn: 0.9, vt: 0.55, drag: 0.982 },
  golem: { name: '바위 골렘', line: '첫 주먹엔 쩍! 두 번째엔 와장창 파편', r: 0.054, H: 0.3, sq: 0.08, gdn: 1.6, vt: 0.85, drag: 0.97, heavy: true },
  shroom: { name: '버섯 왕', line: '포자 방패 — 머리 위로 떨어뜨려요', r: 0.14, H: 0, sq: 0, gdn: 1, vt: 1, drag: 1, boss: true },
  bomb: { name: '폭탄 풍뎅이', line: '떨어지면 펑! 둘레가 다 떠요', r: 0.04, H: 0.46, sq: 0.06, gdn: 0.8, vt: 0.5, drag: 0.975 },
  twister: { name: '모래 회오리', line: '치면 회오리 — 둘레 놈들을 빨아올려요', r: 0.043, H: 0.52, sq: 0.06, gdn: 0.7, vt: 0.42, drag: 0.975 },
  scorp: { name: '거인 전갈', line: '마지막 대장 — 머리 위로 우르르', r: 0.145, H: 0, sq: 0, gdn: 1, vt: 1, drag: 1, boss: true },
};
/** 도감 차례(띄워 본 몬스터 · 대장은 솟게 해 본 것) */
export const DEX: K[] = ['blob', 'bear', 'mole', 'boar', 'turtle', 'golem', 'shroom', 'bomb', 'twister', 'scorp'];
const CHAR: Record<string, K> = { b: 'blob', B: 'bear', m: 'mole', t: 'turtle', g: 'golem', x: 'bomb', w: 'twister' };

interface HerdDef { x: number; m: string; sp?: number }
interface StageDef {
  /** 이 판의 새것: 몬스터 · 구름 밭 · 선인장 밭 */
  key: K | 'cloud' | 'cactus'; ch: number; name: string; news: string;
  /** 별 셋째(한 주먹에 N) · 무리가 다가오는 빠르기 · 카메라 평소 빠르기 · 무리 사이 · 무리들(길을 따라 차례로) */
  n: number; v: number; cv: number; gap: number; herds: string[];
  clouds?: number[]; cacti?: number[];
  boss?: { k: K; need: number; summon: string[] };
}
export const CHAPTERS = ['햇살 들판 길', '버섯 숲 길', '노을 사막 길'];
/**
 * 판 12개. 작은 무리(3~6)가 길을 따라 gap 간격으로 이어진다 — 무리 가장자리를 치면 날아간 놈들이 옆 무리 위로 떨어진다(gap ≈ 가장 멀리 날아가는 거리).
 * 첫 톡 뒤로 무리는 천천히 왼쪽(꽃길)으로 다가오고, 카메라는 길이 비면 휙 앞으로. 사람 기준 한 판 30~45초.
 * 구름·선인장은 길 위 x(시작에서 화면 폭 몇 개).
 */
export const STAGES: StageDef[] = [
  { key: 'blob', ch: 0, name: '말랑이', news: '땅을 톡! 흙 주먹이 쾅 — 하늘로 붕', n: 7, v: 0.012, cv: 0.045, gap: 0.27,
    herds: ['bbbbbb', 'bbbb', 'bbbbb', 'bbb', 'bbbbb', 'bbbb', 'bbbbbb', 'bbbb', 'bbbbb', 'bbbb', 'bbbbbb'] },
  { key: 'bear', ch: 0, name: '덩치 곰', news: '낮게 뜨지만 떨어지면 쿵! 둘레가 들썩', n: 9, v: 0.015, cv: 0.05, gap: 0.27,
    herds: ['bbBbb', 'bbbb', 'bBbb', 'bbbbb', 'bbBb', 'bbbb', 'Bbbbb', 'bbbb', 'bbBbb', 'bbbb', 'bbbbBb'] },
  { key: 'mole', ch: 0, name: '우산 두더지', news: '둥실둥실 — 떨어지기 전에 또 톡!', n: 10, v: 0.017, cv: 0.052, gap: 0.27,
    herds: ['bbmbb', 'bbbb', 'mbbm', 'bbBbb', 'bmbb', 'bbbbm', 'mbbb', 'bBbb', 'bbmbb', 'mbbbb', 'bbmbbm'] },
  { key: 'boar', ch: 0, name: '대장 거인 멧돼지', news: '안 떠요 — 졸개를 머리 위로 떨어뜨려요', n: 9, v: 0.016, cv: 0.05, gap: 0.27,
    herds: ['bbbbb', 'bBbb', 'bbmbb', 'bbbb'], boss: { k: 'boar', need: 7, summon: ['bbbm', 'bBbb'] } },
  { key: 'turtle', ch: 1, name: '고무공 거북', news: '떨어지면 통통! 두 번 더 튀며 깔아요', n: 11, v: 0.019, cv: 0.055, gap: 0.27,
    herds: ['bbtbb', 'bbmb', 'btbbb', 'bbBb', 'tbbbb', 'bbmb', 'bbtbb', 'bBbt', 'bbbbb', 'btbb', 'bbtbbB'] },
  { key: 'golem', ch: 1, name: '바위 골렘', news: '두 번 치면 와장창! 파편이 둘레를 띄워요', n: 11, v: 0.019, cv: 0.055, gap: 0.27,
    herds: ['bbgbb', 'btbb', 'bbbgb', 'bbmb', 'gbbbb', 'bbBb', 'bbgbbb', 'btbb', 'bbbgb', 'bmbb', 'bgbbgb'] },
  { key: 'cloud', ch: 1, name: '구름 밭', news: '구름에 걸린 놈은 오래 떠 있어요 — 모아서 톡', n: 12, v: 0.02, cv: 0.055, gap: 0.27,
    herds: ['bbbbb', 'bbtb', 'bmbbb', 'bbgb', 'bbbbb', 'btbm', 'bbbbbb', 'bBbg', 'bbbbb', 'bmbb', 'bbbmbb'], clouds: [0.75, 1.45, 2.15, 2.85, 3.55] },
  { key: 'shroom', ch: 1, name: '대장 버섯 왕', news: '포자 방패 — 머리 위로 떨어뜨려요', n: 11, v: 0.02, cv: 0.055, gap: 0.27,
    herds: ['bbtbb', 'bgbb', 'bbbtb', 'bmbb'], clouds: [1.75], boss: { k: 'shroom', need: 9, summon: ['bbtb', 'bgbb'] } },
  { key: 'cactus', ch: 2, name: '선인장 밭', news: '선인장 위로 떨어지면 앗! 또 튀어요', n: 12, v: 0.022, cv: 0.058, gap: 0.27,
    herds: ['bbbbb', 'bbtb', 'bbmbb', 'bgbb', 'bbbbB', 'btbm', 'bbbbbb', 'bbgt', 'bbmbb', 'btbb', 'bbbbbb'], cacti: [0.64, 1.18, 1.72, 2.26, 2.8, 3.34] },
  { key: 'bomb', ch: 2, name: '폭탄 풍뎅이', news: '떨어지면 펑! 둘레가 다 떠요', n: 13, v: 0.023, cv: 0.06, gap: 0.27,
    herds: ['bbxbb', 'bbtb', 'bxbbx', 'bbgb', 'bbxbB', 'bmbb', 'xbbbx', 'bbgt', 'bbxbb', 'btbb', 'bbxbbx'], cacti: [1.18, 2.26, 3.34] },
  { key: 'twister', ch: 2, name: '모래 회오리', news: '치면 회오리 — 둘레 놈들을 빨아올려요', n: 14, v: 0.024, cv: 0.06, gap: 0.27,
    herds: ['bbwbb', 'bxbb', 'bbbwb', 'bbgt', 'wbbxb', 'bbBb', 'bbbwbb', 'bxbg', 'bbwbb', 'bmbb', 'bbwbbx'], cacti: [1.72, 2.8] },
  { key: 'scorp', ch: 2, name: '대장 거인 전갈', news: '마지막 대장 — 머리 위로 우르르', n: 12, v: 0.022, cv: 0.058, gap: 0.27,
    herds: ['bbxbb', 'bwbb', 'bbgbx', 'btbb'], cacti: [1.18], boss: { k: 'scorp', need: 11, summon: ['bbxb', 'bwbb', 'bBbt'] } },
];
/** 무리 자리: 첫 무리는 화면 가운데, 다음은 gap마다 (조금씩 흔들어) — 길 길이는 마지막 무리 뒤로 조금 */
const herdX = (d: StageDef, i: number, j: number) => 0.5 + i * d.gap + (i ? (j - 0.5) * 0.05 : 0);
const roadLen = (d: StageDef) => (d.boss ? 0.5 + d.herds.length * d.gap + 0.85 : 0.5 + (d.herds.length - 1) * d.gap + 0.42);
export const STAGE_COUNT = STAGES.length;
/** 장 끝 둘 중 하나(길 위의 큰 돌상) */
export const PERKS: { name: string; line: string }[][] = [
  [{ name: '용암 주먹', line: '친 자리에 잠깐 용암' }, { name: '쌍둥이 주먹', line: '옆에 작은 주먹 하나 더' }],
  [{ name: '천둥 착지', line: '떨어질 때 쿵이 더 넓게' }, { name: '회오리 주먹', line: '주먹이 더 넓게' }],
];

// ───────────────────────────── 상태 ─────────────────────────────
/** 몬스터 상태: 길을 어슬렁 · 공중 · 구름에 걸림 · 기절(곧 동전) · 꽃을 밟고 달아남 · 회오리 · 대장 · 대장이 솟음 */
const WALK = 0, AIR = 1, CAUGHT = 2, KO = 3, FLEE = 4, TWIST = 5, BOSS = 6, UPHEAVE = 7;
interface Mon {
  id: number; k: K; x: number; z: number; h: number; vx: number; vh: number; r: number;
  st: number; tm: number;
  /** 공중 연속(이번에 몇 번째로 공중에서 맞았나) · 이번 비행의 꼭대기 · 마지막으로 친 주먹 · 기절할 때 받을 점수 · 마지막으로 센 주먹 */
  c: number; top: number; tap: number; val: number; cnt: number;
  spin: number; spinV: number; face: number; hid: number; ox: number; ph: number;
  /** 골렘 단단함 · 거북 남은 튐 · 이번 비행에 대장 머리를 쳤나 · 걸린 구름 · 기절 모양(0 떨어짐 · 1 깔림 · 2 와장창 · 3 펑 · 4 대장) */
  hp: number; bounce: number; bonked: boolean; cl: number; how: number; dead: boolean;
  // 연출 (시뮬레이션 결과와 무관)
  seed: number; born: number; hurtT: number; landT: number;
}
interface Herd { x: number; v: number }
/** 주먹 하나의 몫: 휘말린 수(점수 차례 — 깔린 놈까지) · 주먹이 바로 띄운 수(별 셋째 · 큰 띠) · 그중 공중 놈 */
interface Tap { id: number; x: number; n: number; hit: number; air: number; t: number }
interface Fist { x: number; z: number; t: number; k: number; combo: number; n: number; small: boolean }
interface Ev { t: number; k: string; x: number; y: number; n: number; x2: number; text: string }

export interface GPState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result' | 'pick' | 'end'; pt: number;
  /** 하트 · 지난 판까지 점수 · 이번 판 점수(별로 곱해지기 전) · 별 */
  hearts: number; pts: number; sp: number; stars: number; got: number; starOk: boolean[]; dead: boolean; won: boolean;
  /** 정령 레벨 · 장 끝에 고른 것(0 아직 · 1 왼쪽 · 2 오른쪽) · 방금 고른 것 · 도감 · 이번 판에 새로 띄운 몬스터 */
  lv: number; perk: number[]; picked: number; dex: K[]; newDex: K[];
  mons: Mon[]; herds: Herd[]; nid: number; cam: number; camV: number; L: number; started: boolean;
  cd: number; down: boolean; tapN: number; taps: Tap[];
  /** 공중 연속: 지금 · 마지막으로 이어진 틱 · 이 판 최고 */
  combo: number; comboT: number; maxCombo: number;
  /** 이 판 최고 한 주먹 · 마지막 큰 띠의 수 · 꽃길이 밟혔나 · 다시 하트를 잃을 수 있는 틱 · 기절시킨 수 · 판 끝 세기 */
  best: number; bandAt: number; lost: boolean; safeT: number; kos: number; clearT: number;
  fists: Fist[]; lavas: { x: number; t: number; tap: number }[]; clouds: { x: number; h: number; w: number }[]; cacti: { x: number; z: number }[];
  /** 꽃길이 밟힌 틱 · 정령(화면 x · 표정 · 표정 틱) */
  trampT: number; sx: number; mood: number; moodT: number;
  /** 대장: 몬스터 번호 · 휘청 · 필요한 휘청 · 깨어난 틱 · 솟은 틱 · 별 셋째가 정해짐(솟은 뒤로는 못 딴다) · 졸개 부르기 */
  boss: number; sway: number; swayNeed: number; bossOn: number; upT: number; sealed: boolean; summonT: number; summonN: number;
  /** 멈칫(큰 순간에 세상이 몇 틱 멈춘다) · 세상 시계(멈칫 동안은 안 간다 — 주먹도 같이 멈춘다) */
  freeze: number; wt: number;
  wowN: number; firstTap: number; firstBig: number;
  seen: Set<string>; events: Ev[];
  banner: { head: string; sub: string; t: number } | null; spot: { id: number; t: number } | null;
  /** 큰 띠(한 번에 하나): 이 판 최고 한 주먹을 넘을 때 · 별 셋째 · 대장이 솟을 때 */
  big: { text: string; sub: string; t: number; n: number; tap: number; star: boolean } | null;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ev = (s: GPState, k: string, x: number, y: number, n = 0, x2 = 0, text = '') => s.events.push({ t: s.t, k, x, y, n, x2, text });
const see = (s: GPState, key: string) => void s.seen.add(key);
const isBoss = (m: Mon) => KD[m.k].boss === true;
const grounded = (m: Mon) => !m.dead && m.st === WALK;
const flying = (m: Mon) => !m.dead && (m.st === AIR || m.st === CAUGHT);
/** 다시 칠 수 있는 공중 놈: 떨어지는 중(꼭대기 근처부터)이거나 구름에 걸렸다 */
const falling = (m: Mon) => !m.dead && ((m.st === AIR && m.vh < FALLING) || m.st === CAUGHT);
/** 주먹에 맞는 공중 놈: 떨어지는 중이고 아직 별똥별이 아니다 */
const juggly = (m: Mon) => falling(m) && m.c < C_MAX;
const bossOf = (s: GPState): Mon | undefined => (s.boss ? s.mons.find((m) => m.id === s.boss && !m.dead) : undefined);
/** 정령 레벨이 주는 힘: 주먹 반지름 · 띄우는 높이 배수 · 깔아뭉개는 반지름 배수 */
export const fistR = (s: GPState) => RF * (1 + 0.022 * (s.lv - 1)) * (s.perk[1] === 2 ? 1.28 : 1);
const liftMul = (s: GPState) => 1 + 0.02 * (s.lv - 1);
const squashMul = (s: GPState) => (s.perk[1] === 1 ? 1.55 : 1) * (1 + 0.015 * (s.lv - 1));
/** 이 놈이 떨어지면 깔아뭉개는 반지름 (공중 연속이 쌓일수록 넓다) */
export const sqR = (s: GPState, m: Mon) => KD[m.k].sq * (1 + 0.16 * Math.min(4, m.c)) * squashMul(s);
/** 이대로 떨어지면 닿는 x (옆 끌림이 다 줄어든 뒤) */
export const landX = (m: Mon) => m.x + (m.vx * DT) / (1 - KD[m.k].drag);
/** 높이 떨어지면 쿵! 둘레가 들썩 (무겁거나 공중 연속 둘 이상) */
const quakes = (m: Mon) => KD[m.k].heavy === true || m.c >= 2;

function wow(s: GPState, text: string, sub: string, n: number, tap: number, star = false) {
  s.wowN++;
  if (s.firstBig < 0 && s.firstTap >= 0) s.firstBig = s.t;
  s.big = { text, sub, t: s.t, n, tap, star };
  s.freeze = Math.max(s.freeze, 4);
  see(s, 'wow');
}

// ───────────────────────────── 무리 ─────────────────────────────
function add(s: GPState, k: K, x: number, z: number, hid: number, ox: number): Mon {
  const kd = KD[k], m: Mon = {
    id: ++s.nid, k, x, z, h: 0, vx: 0, vh: 0, r: kd.r, st: isBossK(k) ? BOSS : WALK, tm: 0, c: 0, top: 0, tap: 0, val: 1, cnt: 0,
    spin: 0, spinV: 0, face: -1, hid, ox, ph: s.rng() * TAU, hp: k === 'golem' ? 2 : 1, bounce: k === 'turtle' ? 2 : 0, bonked: false, cl: -1, how: 0, dead: false,
    seed: Math.floor(s.rng() * 1e6), born: s.t, hurtT: -99, landT: -99,
  };
  s.mons.push(m);
  return m;
}
const isBossK = (k: K) => KD[k].boss === true;
/** 무리 하나: 무리 가운데 둘레에 서로 겹치지 않게 (큰 놈 먼저) */
function placeHerd(s: GPState, hd: HerdDef, v: number) {
  const hid = s.herds.length, kinds = [...hd.m].map((c) => CHAR[c]).sort((a, b) => KD[b].r - KD[a].r);
  s.herds.push({ x: hd.x, v: v * (0.85 + 0.3 * s.rng()) });
  const sp = hd.sp ?? 0.024 + 0.008 * kinds.length, mine: Mon[] = [];
  for (const k of kinds) {
    let bx = 0, bz = DZ / 2, bd = -1;
    for (let i = 0; i < 10; i++) {
      const ox = (s.rng() * 2 - 1) * sp, z = 0.015 + s.rng() * (DZ - 0.03);
      let d = 9;
      for (const o of mine) d = Math.min(d, Math.hypot(o.ox - ox, (o.z - z) * 1.6) - (o.r + KD[k].r) * 0.75);
      if (d > bd) (bd = d), (bx = ox), (bz = z);
      if (d > 0.01) break;
    }
    mine.push(add(s, k, hd.x + bx, bz, hid, bx));
  }
}
function newStage(s: GPState) {
  const d = STAGES[s.stage];
  Object.assign(s, {
    phase: 'play', pt: 0, sp: 0, got: 0, starOk: [false, false, false], mons: [], herds: [], cam: 0, camV: 0, L: roadLen(d), started: false,
    cd: 0, taps: [], combo: 0, comboT: -99, maxCombo: 0, best: 0, bandAt: 0, lost: false, safeT: 0, kos: 0, clearT: 0,
    fists: [], lavas: [], clouds: (d.clouds ?? []).map((x, i) => ({ x, h: i % 2 ? 0.5 : 0.45, w: 0.2 })), cacti: (d.cacti ?? []).map((x, i) => ({ x, z: i % 2 ? 0.02 : 0.005 })),
    trampT: -99, sx: 0.2, mood: 0, moodT: -99, boss: 0, sway: 0, swayNeed: d.boss?.need ?? 0, bossOn: -1, upT: -1, sealed: false, summonT: 0, summonN: 0,
    freeze: 0, events: [], spot: null, big: null, newDex: [],
  } as Partial<GPState>);
  d.herds.forEach((m, i) => placeHerd(s, { x: herdX(d, i, s.rng()), m, sp: i === 0 && s.stage === 0 ? 0.07 : undefined }, d.v));
  if (d.boss) {
    const b = add(s, d.boss.k, s.L - 0.42, DZ * 0.45, -1, 0);
    s.boss = b.id;
  }
  // 새것 스포트라이트: 새 몬스터면 처음 보이는 그놈
  const nk = d.key as K;
  const first = KD[nk] ? s.mons.filter((m) => m.k === nk).sort((a, b) => a.x - b.x)[0] : undefined;
  s.spot = first && s.stage > 0 ? { id: first.id, t: s.t } : null;
  s.banner = { head: `${CHAPTERS[d.ch]} · ${s.stage + 1}판`, sub: d.news, t: s.t };
  if (d.clouds) see(s, 'cloud');
  if (d.cacti) see(s, 'cactus');
  see(s, 'stage' + s.stage);
  ev(s, 'stage', 0.5, 0.6);
}

// ───────────────────────────── 주먹 ─────────────────────────────
const tapOf = (s: GPState, id: number): Tap | undefined => {
  for (let i = s.taps.length - 1; i >= 0; i--) if (s.taps[i].id === id) return s.taps[i];
  return undefined;
};
/** 기절한 놈의 점수: ⌈마지막으로 친 주먹이 바로 띄운 수 × (1 + 공중에서 맞은 횟수) ÷ 2⌉ (무거운 놈 두 배) — 큰 한 주먹 · 오래 띄우기가 곧 점수. 작은 주먹으로 다시 치면 작아진다 */
const valOf = (hit: number, m: Mon) => Math.ceil((Math.max(1, hit) * (1 + m.c)) / 2) * (KD[m.k].heavy ? 2 : 1);
/** 이 주먹의 몫으로 센다 */
function count(s: GPState, m: Mon, tap: Tap | undefined) {
  if (!tap) return;
  m.tap = tap.id;
  if (m.cnt === tap.id) return;
  m.cnt = tap.id;
  tap.n++;
  if (!s.dex.includes(m.k)) (s.dex.push(m.k), s.newDex.push(m.k), see(s, 'dex:' + m.k));
}
const BAND = ['와르르!', '하늘 가득!', '땅이 들썩!', '대지의 주먹!'];
/** 한 주먹 기록(주먹이 바로 띄운 수): 이 판 최고를 크게 넘을 때·별 셋째를 딸 때만 큰 띠 */
function record(s: GPState, tap: Tap) {
  const n = tap.hit;
  if (s.sealed || n <= s.best) return;
  const d = STAGES[s.stage], prev = s.best;
  s.best = n;
  const star = prev < d.n && n >= d.n;
  if (star || (n >= WOW_N && n >= s.bandAt + 2)) (wow(s, `한 주먹에 ${n}마리!`, BAND[n >= 13 ? 3 : n >= 10 ? 2 : n >= 7 ? 1 : 0], n, tap.id, star), (s.bandAt = n));
  if (star) ev(s, 'star3', tap.x, 0.5, n), see(s, 'star3');
}
/** 띄우기: 꼭대기 높이 H(지금 높이보다 조금이라도 더) */
function launch(s: GPState, m: Mon, H: number) {
  const top = Math.min(H_MAX, Math.max(m.h + 0.1, H));
  m.vh = Math.sqrt(2 * G_UP * Math.max(0.02, top - m.h));
  m.top = top;
  m.st = AIR;
  m.tm = 0;
  m.bonked = false;
  m.cl = -1;
  m.spinV = (s.rng() < 0.5 ? -1 : 1) * (0.09 + 0.08 * s.rng()) * (KD[m.k].heavy ? 0.6 : 1);
}
/** 땅에서 살짝 뜨기(쿵! 들썩 · 파편 · 펑 · 회오리): 바깥으로 */
function hop(s: GPState, o: Mon, fromX: number, H: number, push: number, tap: Tap | undefined) {
  if (o.k === 'golem' && o.hp > 1) return crack(s, o, tap);
  o.vx = (o.x >= fromX ? 1 : -1) * push * (0.7 + 0.3 * s.rng());
  o.c = 0;
  launch(s, o, H * liftMul(s));
  count(s, o, tap);
  see(s, 'hop');
}
function crack(s: GPState, m: Mon, tap: Tap | undefined) {
  m.hp = 1;
  m.hurtT = s.t;
  count(s, m, tap);
  ev(s, 'crack', m.x, GY + m.z - m.r, 0);
  see(s, 'crack');
}
/** 바위 골렘 와장창: 파편이 둘레를 띄운다 */
function shatter(s: GPState, m: Mon, tap: Tap | undefined) {
  count(s, m, tap);
  ko(s, m, 2);
  ev(s, 'shatter', m.x, GY + m.z - m.r, 0);
  see(s, 'shatter');
  for (const o of s.mons) if (grounded(o) && o !== m && !isBoss(o) && Math.abs(o.x - m.x) <= 0.19 + o.r * 0.5) hop(s, o, m.x, 0.36, 0.22, tap);
}
/** 폭탄 풍뎅이 펑: 둘레가 다 뜬다 */
function blast(s: GPState, m: Mon, tap: Tap | undefined) {
  count(s, m, tap);
  ko(s, m, 3);
  ev(s, 'blast', m.x, GY + m.z - m.r, 0);
  see(s, 'blast');
  for (const o of s.mons) {
    if (o === m || o.dead || isBoss(o)) continue;
    if (grounded(o) && Math.abs(o.x - m.x) <= 0.18 + o.r * 0.5) {
      if (o.k === 'bomb') (o.hp = 0), hop(s, o, m.x, 0.34, 0.3, tap);
      else hop(s, o, m.x, 0.34, 0.3, tap);
    }
  }
}
/** 모래 회오리: 그 자리에서 빙글빙글 — 둘레 놈들을 빨아올린다 */
function twist(s: GPState, m: Mon, tap: Tap | undefined) {
  count(s, m, tap);
  m.st = TWIST;
  m.tm = 0;
  ev(s, 'twist', m.x, GY + m.z - m.r, 0);
  see(s, 'twist');
}
function ko(s: GPState, m: Mon, how: number) {
  const tp = tapOf(s, m.tap);
  if (tp) m.val = valOf(tp.hit, m);
  m.st = KO;
  m.tm = 0;
  m.how = how;
  m.h = 0;
  m.vx = 0;
  m.vh = 0;
  s.kos++;
  s.sp += Math.max(1, m.val);
}
/** 톡: 그 자리 땅에서 흙 주먹이 쾅! */
function onTap(s: GPState, px: number, py: number) {
  if (s.firstTap < 0) s.firstTap = s.t;
  if (s.cd > 0) return void ev(s, 'cool', s.cam + px, py);
  s.cd = CD;
  s.started = true;
  const fx = s.cam + clamp(px, 0.02, 0.98), z = py > GY - 0.06 && py < GY + DZ + 0.08 ? clamp(py - GY, 0.01, DZ - 0.01) : DZ * 0.55;
  const tap: Tap = { id: ++s.tapN, x: fx, n: 0, hit: 0, air: 0, t: s.t };
  s.taps.push(tap);
  if (s.taps.length > 40) s.taps.shift();
  const rf = fistR(s);
  let n = punch(s, fx, z, rf, tap, false);
  // 쌍둥이 주먹: 무리가 더 많은 쪽 옆에 작은 주먹 하나 더
  if (s.perk[0] === 2) {
    let l = 0, r = 0;
    for (const m of s.mons) if (grounded(m) || falling(m)) (m.x < fx - rf && m.x > fx - 0.5 ? l++ : m.x > fx + rf && m.x < fx + 0.5 ? r++ : 0);
    const x2 = clamp(fx + (r >= l ? 1 : -1) * rf * 1.55, s.cam + 0.03, s.cam + 0.97);
    n += punch(s, x2, z, rf * 0.62, tap, true);
    see(s, 'twin');
  }
  if (s.perk[0] === 1) s.lavas.push({ x: fx, t: s.t, tap: tap.id }), see(s, 'lava');
  record(s, tap);
  s.sx = clamp(px, 0.1, 0.9);
  s.mood = n >= 6 ? 3 : n > 0 ? 1 : 4;
  s.moodT = s.t;
}
/** 주먹 하나: 둘레의 길 위 놈은 하늘로, 떨어지는 놈은 더 높이(공중 연속) */
function punch(s: GPState, fx: number, z: number, rf: number, tap: Tap, small: boolean): number {
  const air: Mon[] = [], ground: Mon[] = [];
  let tink = false;
  for (const m of s.mons) {
    if (m.dead) continue;
    const dx = Math.abs(m.x - fx);
    if (isBoss(m)) {
      if (m.st === BOSS && dx <= rf * 0.8 + m.r * 0.5) tink = true;
      continue;
    }
    if (juggly(m) && dx <= rf * AIR_K + m.r * 0.5) air.push(m);
    else if ((m.st === WALK || m.st === TWIST) && dx <= rf + m.r * 0.5) ground.push(m);
  }
  if (!small) {
    if (air.length) (s.combo++, (s.comboT = s.t), (s.maxCombo = Math.max(s.maxCombo, s.combo)), see(s, 'combo'));
    else s.combo = 0;
  }
  tap.air += air.length;
  let met = 0, mx = 0, my = 0;
  for (const m of air) {
    m.c++;
    if (m.c >= C_MAX) (met++, (mx = m.x), (my = GY + m.z - m.h - m.r));
    const dir = clamp((m.x - fx) / rf, -1, 1);
    m.vx = dir * VX * 0.8;
    launch(s, m, KD[m.k].H * liftMul(s) * (1 + UP_PER * m.c));
    count(s, m, tap);
  }
  for (const m of ground) {
    if (m.st === TWIST) continue;
    if (m.k === 'golem') {
      if (m.hp > 1) crack(s, m, tap);
      else shatter(s, m, tap);
      continue;
    }
    if (m.k === 'twister') {
      twist(s, m, tap);
      continue;
    }
    const dir = clamp((m.x - fx) / rf, -1, 1);
    m.vx = dir * VX * (KD[m.k].heavy ? 0.75 : 1) + (Math.abs(dir) < 0.15 ? (s.rng() - 0.5) * 0.08 : 0);
    m.c = 0;
    launch(s, m, KD[m.k].H * liftMul(s) * (0.92 + 0.16 * s.rng()));
    count(s, m, tap);
  }
  if (met) ev(s, 'meteor', mx, my, met), see(s, 'meteor');
  const n = air.length + ground.length;
  // 쌍둥이 주먹(옆의 작은 주먹)이 띄운 놈은 '한 주먹' 수에 안 든다
  if (!small) tap.hit += n;
  s.fists.push({ x: fx, z, t: s.wt, k: (rf / RF) * (1 + 0.07 * Math.min(6, s.combo)), combo: s.combo, n, small });
  ev(s, small ? 'punch2' : 'punch', fx, GY + z, n, s.combo, tink ? 'tink' : '');
  if (tink) see(s, 'tink');
  see(s, 'punch');
  if (air.length) ev(s, 'combo', fx, GY + z - 0.25, s.combo, air.length);
  if (n >= 3) s.freeze = Math.max(s.freeze, 3);
  return n;
}

// ───────────────────────────── 하늘 · 착지 ─────────────────────────────
function airStep(s: GPState, m: Mon) {
  const kd = KD[m.k];
  if (m.st === CAUGHT) {
    // 구름에 걸림: 둥실 — 시간이 지나면 굴러떨어진다
    const c = s.clouds[m.cl];
    m.tm++;
    m.h = (c ? c.h : m.h) + 0.012 * Math.sin(m.tm * 0.12 + m.ph);
    if (c) m.x += clamp(c.x + m.ox * 0.6 - m.x, -0.002, 0.002);
    if (m.tm >= CATCH_T || !c) (m.st = AIR), (m.vh = 0.4), (m.vx = (s.rng() - 0.5) * 0.2), ev(s, 'uncaught', m.x, GY + m.z - m.h);
    return;
  }
  m.tm++;
  m.x += m.vx * DT;
  m.vx *= kd.drag;
  // 화면 밖으로는 안 날아간다 (가장자리에서 통)
  if (m.x < s.cam + 0.03) (m.x = s.cam + 0.03), m.vx < 0 && (m.vx = -m.vx * 0.5);
  if (m.x > s.cam + 0.97) (m.x = s.cam + 0.97), m.vx > 0 && (m.vx = -m.vx * 0.5);
  if (m.vh > 0) m.vh -= G_UP * DT;
  else m.vh = Math.max(-kd.vt, m.vh - kd.gdn * DT);
  m.h += m.vh * DT;
  m.spin += m.spinV * (m.k === 'mole' && m.vh < 0 ? 0.25 : 1);
  if (m.vh < 0) {
    // 구름 밭: 위에서 떨어지다 구름에 닿으면 걸린다
    for (let i = 0; i < s.clouds.length; i++) {
      const c = s.clouds[i];
      if (!kd.heavy && m.cl !== i && Math.abs(m.x - c.x) < c.w * 0.5 && m.h <= c.h + 0.015 && m.h >= c.h - 0.05 && m.top > c.h + 0.03) {
        m.st = CAUGHT;
        m.tm = 0;
        m.cl = i;
        m.ox = clamp(m.x - c.x, -c.w * 0.4, c.w * 0.4) / 0.6;
        ev(s, 'caught', m.x, GY + m.z - m.h);
        see(s, 'caught');
        return;
      }
    }
    // 대장 머리 위
    const b = bossOf(s);
    if (b && b.st === BOSS && !m.bonked && Math.abs(m.x - b.x) < b.r * 1.05 && m.h <= b.r * 2.05 && m.h > b.r * 0.9) return bonk(s, b, m);
  }
  if (m.h <= 0 && m.vh <= 0) land(s, m);
}
/** 대장 머리에 쿵: 휘청 (높이 떠 있던 놈 · 무거운 놈일수록 크게) */
function bonk(s: GPState, b: Mon, m: Mon) {
  m.bonked = true;
  const add = 1 + (KD[m.k].heavy ? 1 : 0) + Math.min(2, m.c);
  s.sway = Math.min(s.swayNeed, s.sway + add);
  b.hurtT = s.t;
  m.vx = (m.x >= b.x ? 1 : -1) * 0.34;
  m.vh = 0.95;
  m.h = Math.max(m.h, b.r * 1.9);
  ev(s, 'bonk', b.x, GY + b.z - b.r * 2.1, add, s.sway / Math.max(1, s.swayNeed));
  see(s, 'bonk');
  if (s.sway >= s.swayNeed) upheave(s, b, tapOf(s, m.tap));
}
/** 땅이 통째로 솟는다! 대장은 하늘 끝까지, 길 위의 졸개도 모두 뜬다 */
function upheave(s: GPState, b: Mon, tap: Tap | undefined) {
  s.upT = s.t;
  b.st = UPHEAVE;
  b.tm = 0;
  b.vh = 0;
  b.spinV = 0.06;
  let n = 0;
  for (const o of s.mons) if (grounded(o) || o.st === TWIST) (n++, (o.st = WALK), hop(s, o, b.x, 0.45 + 0.2 * s.rng(), 0.3, undefined), (o.tap = tap?.id ?? 0));
  s.sealed = true;
  if (!s.dex.includes(b.k)) (s.dex.push(b.k), s.newDex.push(b.k), see(s, 'dex:' + b.k));
  wow(s, '땅이 통째로 솟는다!', n ? `졸개 ${n}마리도 함께` : `${KD[b.k].name} 하늘 끝까지`, n, -1);
  s.freeze = 10;
  ev(s, 'upheave', b.x, GY + b.z, n);
  see(s, 'upheave');
}
/** 착지: 아래 놈들을 깔아 같이 기절 · 높이서 떨어지면 둘레가 들썩 */
function land(s: GPState, m: Mon) {
  m.h = 0;
  m.landT = s.t;
  const tap = tapOf(s, m.tap);
  // 선인장 밭: 선인장 위로 떨어지면 '앗!' 또 튄다
  for (const c of s.cacti) {
    if (Math.abs(m.x - c.x) < 0.045 + m.r * 0.4) {
      m.vx = (m.x >= c.x ? 1 : -1) * 0.34;
      launch(s, m, Math.max(0.26, m.top * 0.6));
      ev(s, 'ouch', m.x, GY + m.z - m.r * 2);
      see(s, 'ouch');
      return;
    }
  }
  const sq = sqR(s, m), qr = quakes(m) ? sq * 1.9 : 0;
  let n = 0, q = 0;
  for (const o of s.mons) {
    if (o === m || o.dead || isBoss(o) || (o.st !== WALK && o.st !== TWIST)) continue;
    const dx = Math.abs(o.x - m.x);
    if (dx <= sq + o.r * 0.5) {
      if (o.k === 'golem') {
        if (o.hp > 1) crack(s, o, tap);
        else shatter(s, o, tap);
      } else if (o.k === 'bomb') blast(s, o, tap);
      else if (o.st === WALK) (count(s, o, tap), (o.c = m.c), ko(s, o, 1), n++);
    } else if (qr && dx <= qr + o.r * 0.5 && o.st === WALK) (hop(s, o, m.x, 0.15 + 0.03 * Math.min(3, m.c), 0.16, tap), q++);
  }
  if (n) see(s, 'squash');
  if (qr) see(s, 'quake');
  ev(s, 'land', m.x, GY + m.z, n, q, m.k);
  // 고무공 거북: 통통 두 번 더
  if (m.k === 'turtle' && m.bounce > 0) {
    m.bounce--;
    launch(s, m, m.top * 0.55);
    m.top = Math.max(0.12, m.top);
    ev(s, 'boing', m.x, GY + m.z, 2 - m.bounce);
    see(s, 'boing');
    return;
  }
  if (m.k === 'bomb') return blast(s, m, tap);
  ko(s, m, 0);
}

// ───────────────────────────── 길 위 ─────────────────────────────
function walkStep(s: GPState, m: Mon) {
  const hd = s.herds[m.hid];
  if (!hd) return;
  const tx = hd.x + m.ox + 0.013 * Math.sin(s.t * 0.028 + m.ph), dx = tx - m.x, sp = 0.0011;
  m.x += clamp(dx, -sp, sp);
  if (Math.abs(dx) > 0.0015) m.face = dx < 0 ? -1 : 1;
  // 용암 주먹: 남은 용암을 밟으면 붕
  for (const l of s.lavas) if (s.t - l.t < LAVA_T && Math.abs(m.x - l.x) < 0.05 + m.r * 0.4) return void (hop(s, m, l.x, 0.3, 0.12, tapOf(s, l.tap)), ev(s, 'lava', m.x, GY + m.z));
  // 꽃길을 밟았다 (화면 왼쪽 끝)
  if (m.x < s.cam + EDGE) trample(s, m);
}
function trample(s: GPState, m: Mon) {
  m.st = FLEE;
  m.tm = 0;
  m.face = -1;
  s.trampT = s.t;
  ev(s, 'trample', m.x, GY + m.z - m.r * 2);
  see(s, 'trample');
  if (s.t < s.safeT) return;
  s.safeT = s.t + SAFE_T;
  s.hearts--;
  s.lost = true;
  s.mood = 2;
  s.moodT = s.t;
  ev(s, 'heart', s.cam + 0.08, GY - 0.1);
  see(s, 'heart');
  if (s.hearts <= 0) (s.phase = 'end'), (s.pt = 0), ev(s, 'end', 0.5, 0.6, 0);
}
function twistStep(s: GPState, m: Mon) {
  const tap = tapOf(s, m.tap);
  m.tm++;
  m.spin += 0.5;
  for (const o of s.mons) {
    if (!grounded(o) || o === m || isBoss(o)) continue;
    const dx = m.x - o.x;
    if (Math.abs(dx) > 0.27 + o.r * 0.5) continue;
    o.x += clamp(dx, -0.0042, 0.0042);
    if (Math.abs(dx) < 0.03 + o.r * 0.4) {
      if (o.k === 'golem' && o.hp > 1) (o.hp = 1), (o.hurtT = s.t);
      o.vx = (s.rng() - 0.5) * 0.25;
      o.c = 0;
      launch(s, o, (0.44 + 0.12 * s.rng()) * liftMul(s));
      count(s, o, tap);
      ev(s, 'suck', o.x, GY + o.z - o.r);
    }
  }
  if (m.tm >= TWIST_T) {
    m.vx = (s.rng() - 0.5) * 0.2;
    m.c = 0;
    launch(s, m, KD.twister.H * liftMul(s));
  }
}
function bossStep(s: GPState, b: Mon) {
  const d = STAGES[s.stage];
  if (b.st === UPHEAVE) {
    // 땅 기둥이 대장을 들어 올리고(0.4초) → 하늘 끝으로 휙 → 쿵! 떨어진다
    b.tm++;
    if (b.tm <= UP_LIFT) {
      b.h = 0.5 * (1 - (1 - b.tm / UP_LIFT) ** 3);
      if (b.tm === UP_LIFT) (b.vh = 2.6), ev(s, 'fling', b.x, GY + b.z - b.h - b.r * 2);
      return;
    }
    b.vh -= G_UP * DT * 0.8;
    b.h += b.vh * DT;
    b.spin += b.spinV;
    if (b.vh < 0 && b.h <= 0) {
      b.h = 0;
      b.val = 30 + 10 * s.stage;
      ko(s, b, 4);
      ev(s, 'bossdown', b.x, GY + b.z, 0);
    }
    return;
  }
  // 깨어나기: 카메라가 대장 앞에 멈추면
  if (s.bossOn < 0) {
    if (s.cam >= s.L - 1 - 1e-6) (s.bossOn = s.t), ev(s, 'roar', b.x, GY + b.z - b.r * 2.2), see(s, 'boss');
    return;
  }
  // 천천히 다가오고(쿵쿵), 너무 다가오면 꽃길을 밟고 펄쩍 물러난다
  b.x -= 0.0055 * DT;
  if (b.x < s.cam + 0.22) {
    trample(s, b);
    b.st = BOSS;
    b.x = s.cam + 0.58;
    ev(s, 'leap', b.x, GY + b.z - b.r);
  }
  // 졸개 부르기
  const minions = s.mons.reduce((a, m) => a + (!m.dead && !isBoss(m) && m.st !== KO && m.st !== FLEE ? 1 : 0), 0);
  if (++s.summonT >= 230 || (minions <= 3 && s.summonT >= 60)) {
    s.summonT = 0;
    if (minions <= 10 && d.boss) {
      // 졸개는 대장 곁(오른쪽 · 가끔 왼쪽)에서 땅을 뚫고 나와 꽃길 쪽으로 걷는다
      const list = d.boss.summon, m = list[s.summonN % list.length], side = s.summonN++ % 3 === 2 ? -1 : 1;
      placeHerd(s, { x: clamp(b.x + side * 0.2, s.cam + 0.2, s.cam + 0.92), m }, d.v * 1.2);
      ev(s, 'summon', b.x, GY + b.z - b.r * 2.2);
    }
  }
}
function camStep(s: GPState) {
  const d = STAGES[s.stage], end = s.L - 1;
  if (!s.started && s.stage > 0 && s.pt >= CAM_WAIT) s.started = true;
  if (!s.started) return;
  let quiet = true, near = false;
  for (const m of s.mons) {
    if (!grounded(m) && m.st !== TWIST) continue;
    if (m.x > s.cam + 0.15 && m.x < s.cam + 1.02) quiet = false;
    if (m.x < s.cam + 0.26) near = true;
  }
  // 꽃길 가까이에 놈이 있으면 카메라는 기다려 준다 (밀어붙이는 것은 놈들 자신의 걸음뿐)
  const target = s.cam >= end || near ? 0 : quiet ? CAM_FAST : d.cv;
  s.camV += (target - s.camV) * (target > s.camV ? 0.04 : 0.12);
  s.cam = Math.min(end, s.cam + s.camV * DT);
  for (const h of s.herds) h.x -= h.v * DT;
}

// ───────────────────────────── 판 흐름 ─────────────────────────────
function clearStage(s: GPState) {
  const d = STAGES[s.stage];
  s.phase = 'result';
  s.pt = 0;
  s.starOk = [true, !s.lost, s.best >= d.n];
  s.got = s.starOk.filter(Boolean).length;
  s.stars += s.got;
  const gain = (s.sp + CLEAR_PTS) * STAR_MUL[s.got];
  s.pts += gain;
  s.sp = 0;
  s.lv++;
  see(s, 'lv' + s.lv);
  s.spot = null;
  if (d.boss && s.hearts < 3) s.hearts++;
  if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * 30);
  ev(s, 'clear', 0.5, 0.7, s.got, gain);
}
function advance(s: GPState) {
  const d = STAGES[s.stage];
  if (s.won) return void ((s.phase = 'end'), (s.pt = 0), ev(s, 'end', 0.5, 0.6, 1));
  if (d.boss && d.ch < PERKS.length && !s.perk[d.ch]) return void ((s.phase = 'pick'), (s.pt = 0), (s.picked = -1), see(s, 'pick' + d.ch), ev(s, 'pickopen', 0.5, 0.6));
  s.stage++;
  newStage(s);
}
function playStep(s: GPState) {
  s.wt++;
  if (s.cd > 0) s.cd--;
  camStep(s);
  for (const m of s.mons) {
    if (m.dead) continue;
    switch (m.st) {
      case WALK: walkStep(s, m); break;
      case AIR: case CAUGHT: airStep(s, m); break;
      case TWIST: twistStep(s, m); break;
      case BOSS: case UPHEAVE: bossStep(s, m); break;
      case KO:
        if (++m.tm >= KO_T) (m.dead = true), ev(s, 'coin', m.x, GY + m.z - m.r, m.val, m.how, m.k);
        break;
      case FLEE:
        m.x -= 0.006;
        if (++m.tm >= 50) m.dead = true;
        break;
    }
    if (s.phase !== 'play') return;
  }
  if (s.mons.some((m) => m.dead)) s.mons = s.mons.filter((m) => !m.dead);
  if (s.lavas.length && s.t - s.lavas[0].t > LAVA_T) s.lavas = s.lavas.filter((l) => s.t - l.t <= LAVA_T);
  if (s.fists.length && s.wt - s.fists[0].t > 40) s.fists = s.fists.filter((f) => s.wt - f.t <= 40);
  if (s.combo && s.t - s.comboT > 150 && !s.mons.some(flying)) s.combo = 0;
  // 판 끝: 길 끝에 닿았고 길 위에 아무도 없다
  const d = STAGES[s.stage];
  const done = s.cam >= s.L - 1 - 1e-6 && !s.mons.length && (!d.boss || s.upT >= 0);
  if (done) {
    if (++s.clearT >= 40) clearStage(s);
  } else s.clearT = 0;
  // 길 위 상한: 넘치면 뒤 무리의 다가오기를 잠깐 늦춘다
  if (s.mons.length > CAP + 6) for (const h of s.herds) h.x += h.v * DT * 0.5;
}

const game: GameDef<GPState> & { wows(s: GPState): number } = {
  id: 'groundpunch',
  name: '👊 땅 주먹 저글링',
  genes: ['groundpunch', 'chain', 'collect'],
  twist: '나는 땅 그 자체 — 적을 때리지 않고 땅을 쳐서 하늘로 띄우고, 떨어지는 놈을 또 쳐서 오래 띄울수록 높이서 쿵! 아래 무리를 더 넓게 깔아뭉갠다',
  rules: [
    '땅을 톡! 흙 주먹이 쾅 솟아 둘레 놈들을 하늘로 날려요.',
    '떨어지는 놈은 아래 놈들을 깔아뭉개요. 그림자 근처를 또 치면 더 높이!',
    '놈들이 왼쪽 꽃길을 밟기 전에 길 끝까지 쓸어 가요.',
  ],
  controls: 'touch',
  hint: '땅을 톡 — 흙 주먹이 쾅! / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '한낮의 들판 길 — 흙 정령의 그림책 모험',
    mood: '햇살 가득한 들판·버섯 숲·노을 사막 길을 옆에서 본다. 땅속 꼬마 흙 정령이 얼굴을 내밀고 톡 하면, 길에서 거대한 흙 주먹이 쾅 솟아 동글동글한 몬스터들이 으아아 하늘로 빙글빙글 날아간다.',
    palette: { bg: '#8fd6f2', ink: '#3b2a20', muted: '#8a7a66', accent: '#ff9a3d', hot: '#ff5a4e', soft: '#f6e7c1' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.hearts,
  cleared: (s) => (s.phase === 'result' ? { stage: s.stage, got: s.got, of: 3 } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, hearts: 3, pts: 0, sp: 0, stars: 0, got: 0, starOk: [false, false, false], dead: false, won: false,
      lv: 1, perk: [0, 0], picked: -1, dex: [], newDex: [], mons: [], herds: [], nid: 0, cam: 0, camV: 0, L: 4, started: false,
      cd: 0, down: false, tapN: 0, taps: [], combo: 0, comboT: -99, maxCombo: 0, best: 0, bandAt: 0, lost: false, safeT: 0, kos: 0, clearT: 0,
      fists: [], lavas: [], clouds: [], cacti: [], trampT: -99, sx: 0.2, mood: 0, moodT: -99,
      boss: 0, sway: 0, swayNeed: 0, bossOn: -1, upT: -1, sealed: false, summonT: 0, summonN: 0, freeze: 0, wt: 0, wowN: 0, firstTap: -1, firstBig: -1,
      seen: new Set<string>(), events: [], banner: null, spot: null, big: null,
    } as GPState;
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
        if (s.picked >= 0) (s.perk[ch] = s.picked + 1), (s.pt = 0), see(s, `perk${ch}${s.picked}`), ev(s, 'perk', s.picked ? 0.72 : 0.28, 0.9, s.picked);
      } else if (s.pt >= PICK_AFTER) (s.stage++), newStage(s);
    } else if (s.pt >= END_T) s.dead = true;
    if (s.events.length > 90) s.events.splice(0, s.events.length - 90);
    while (s.events.length && s.t - s.events[0].t > 120) s.events.shift();
    if (s.spot && s.t - s.spot.t > 260) s.spot = null;
  },
  over: (s) => s.dead,
  score: (s) => s.pts + s.sp,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const groundpunch = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
/** 화면 x(0~1)의 길 가운데를 톡 */
const at = (x: number, y = GY + DZ * 0.55): Input => ({ tap: false, dir: 0, pointer: { x: clamp(x, 0.01, 0.99), y: y / A } });
const ready = (s: GPState) => s.phase === 'play' && !s.down && s.cd === 0;
/** 결과 화면·둘 중 하나는 버릇 봇도 그냥 넘긴다 */
function between(s: GPState, left: boolean): Input | null {
  if (s.phase === 'play') return null;
  if (s.down) return NO;
  if (s.phase === 'result') return s.pt >= RES_MIN ? at(0.5, 0.8) : NO;
  if (s.phase === 'pick') return s.picked < 0 && s.pt >= PICK_MIN ? at(left ? 0.28 : 0.72, 0.9) : NO;
  return NO;
}
/** 졸개를 대장 머리 위로: 떨어지는 놈은 대장 쪽으로 밀어 올리고(멀면 한 번에 갈 수 있는 만큼), 대장 둘레 길 위 놈은 머리 위로 띄운다 */
function bossShot(s: GPState, b: Mon): number | null {
  const rf = fistR(s);
  let best: number | null = null, bv = 9;
  for (const m of s.mons) {
    if (m.dead || isBoss(m) || m.x < s.cam || m.x > s.cam + 1) continue;
    let reach = 0;
    if (juggly(m) && !m.bonked) reach = (VX * 0.8 * DT) / (1 - KD[m.k].drag);
    else if (grounded(m) && Math.abs(m.x - b.x) < 0.3) reach = (VX * (KD[m.k].heavy ? 0.75 : 1) * DT) / (1 - KD[m.k].drag);
    else continue;
    // 화면 안에서 칠 수 있는 만큼만 (오른쪽 끝의 놈은 덜 밀린다)
    const fx = clamp(m.x - clamp((b.x - m.x) / reach, -1, 1) * rf, s.cam + 0.02, s.cam + 0.98), dir = clamp((m.x - fx) / rf, -1, 1);
    if (Math.abs(m.x - fx) > rf * (juggly(m) ? AIR_K : 1)) continue;
    const miss = Math.abs(b.x - (m.x + dir * reach));
    if (miss > b.r * 0.85) continue;
    // 머리에 닿는 놈 중 낮게 떨어지는 놈부터 (길 위 놈은 그다음)
    const v = miss / b.r + (juggly(m) ? m.h : 0.6);
    if (v < bv) (bv = v), (best = fx);
  }
  return best;
}
/** 여기를 치면 바로 뜨는 수와, 뜬 놈들이 떨어질 자리에서 다음 주먹이 한 번에 잡을 수(눈덩이: 떨어지는 무리 + 그 아래 무리) */
export function plan(s: GPState, fx: number): { hit: number; air: number; edge: number; pot: number } {
  const rf = fistR(s), lands: number[] = [], hitIds = new Set<number>();
  let hit = 0, air = 0, edge = 0;
  for (const m of s.mons) {
    if (m.dead || isBoss(m)) continue;
    const dx = Math.abs(m.x - fx), dir = clamp((m.x - fx) / rf, -1, 1);
    if (juggly(m) && dx <= rf * AIR_K + m.r * 0.5) {
      hit++, air++, hitIds.add(m.id);
      if (m.c + 1 < C_MAX) lands.push(m.x + (dir * VX * 0.8 * DT) / (1 - KD[m.k].drag));
    } else if (grounded(m) && dx <= rf + m.r * 0.5) {
      hit++, hitIds.add(m.id);
      if (m.x - s.cam < 0.3) edge++;
      if (m.k !== 'golem' && m.k !== 'twister') lands.push(m.x + (dir * VX * (KD[m.k].heavy ? 0.75 : 1) * DT) / (1 - KD[m.k].drag));
    }
  }
  let pot = 0;
  for (const p of lands) {
    if (p < s.cam + 0.05 || p > s.cam + 1.1) continue;
    let n = 0;
    for (const q of lands) if (Math.abs(q - p) <= rf * AIR_K * 0.8) n++;
    for (const o of s.mons) if (grounded(o) && !hitIds.has(o.id) && !isBoss(o) && Math.abs(o.x - p) <= rf * 0.9) n++;
    pot = Math.max(pot, n);
  }
  return { hit, air, edge, pot };
}
const lastTap = new WeakMap<object, number>();
/** 봇(눈덩이): 무리 가장자리를 쳐서 옆 무리 위로 떨어뜨리고, 떨어지는 무리와 아래 무리를 한 주먹에 잡아 다시 앞 무리 위로 */
export const groundpunchSmart: Bot<GPState> = {
  name: '눈덩이 — 떨어지는 무리와 아래 무리를 한 주먹에',
  act(s) {
    const mid = between(s, true);
    if (mid) return mid;
    if (!ready(s)) return NO;
    const d = STAGES[s.stage], rf = fistR(s), b = bossOf(s), since = s.t - (lastTap.get(s) ?? -999);
    const go = (x: number) => (lastTap.set(s, s.t), at(x - s.cam));
    // 대장: 떨어지는 졸개를 머리 위로
    if (b && b.st === BOSS && s.bossOn >= 0) {
      const x = bossShot(s, b);
      if (x !== null && x > s.cam + 0.02 && x < s.cam + 0.98) return go(x);
    }
    const cands: number[] = [];
    for (let i = 0; i <= 20; i++) cands.push(s.cam + 0.03 + (i * 0.94) / 20);
    let jug = 0;
    for (const m of s.mons) {
      if (m.dead || isBoss(m) || m.x < s.cam || m.x > s.cam + 1) continue;
      if (juggly(m)) jug++, cands.push(m.x, m.x - rf * 0.5, m.x - rf, m.x + rf * 0.5);
      else if (grounded(m)) cands.push(m.x, m.x - rf * 0.95, m.x - rf * 0.6, m.x + rf * 0.6);
    }
    let cx = -1, cv = -1, ch = 0, sx = -1, sv = -1, ex = -1, evv = -1;
    // 손가락이 조금 빗나가도 되는 자리: 양옆 2.5%를 쳐도 잡히는 수 (가장 적은 쪽)
    const robust = (x: number) => {
      const a = plan(s, x), l = plan(s, x - 0.025), r = plan(s, x + 0.025);
      return { hit: Math.min(a.hit, l.hit, r.hit), pot: Math.min(a.pot, l.pot, r.pot), air: a.air, edge: a.edge };
    };
    // 먼저 그 자리만 재고, 앞선 몇 곳만 양옆까지 다시 잰다 (가볍게)
    const first = cands.filter((x) => x >= s.cam + 0.02 && x <= s.cam + 0.98).map((x) => ({ x, p: plan(s, x) }));
    const top = new Set<number>();
    first.sort((a, b) => b.p.hit + 0.45 * b.p.pot - (a.p.hit + 0.45 * a.p.pot)).slice(0, 6).forEach((q) => top.add(q.x));
    first.sort((a, b) => b.p.pot + 0.3 * b.p.hit - (a.p.pot + 0.3 * a.p.hit)).slice(0, 4).forEach((q) => top.add(q.x));
    first.filter((q) => q.p.edge).sort((a, b) => b.p.hit - a.p.hit).slice(0, 2).forEach((q) => top.add(q.x));
    for (const x of top) {
      const p = robust(x);
      const vc = p.hit + 0.45 * p.pot + 0.2 * p.air;
      if (p.hit > ch || (p.hit === ch && vc > cv)) (ch = p.hit), (cv = vc), (cx = x);
      const vs = p.pot + 0.3 * p.hit;
      if (p.hit && vs > sv) (sv = vs), (sx = x);
      if (p.edge && vc > evv) (evv = vc), (ex = x);
    }
    if (cx < 0 || ch === 0) return NO;
    // 꽃길이 위험하면 바로
    if (ex >= 0 && s.mons.some((m) => grounded(m) && !isBoss(m) && m.x - s.cam < 0.18)) return go(ex);
    // 한 주먹에 크게 잡을 수 있으면 잡는다 (별 셋째 전엔 N, 그 뒤엔 여섯 — 오래 못 기다린다)
    const goal = Math.max(3, (s.best < d.n ? d.n : 8) - Math.floor(since / 50));
    if (ch >= goal) return go(cx);
    // 떨어지는 무리가 있으면 아래 무리 위로 올 때까지 잠깐 (잡을 거리가 늘어난다)
    if (jug && since < 70) return NO;
    // 없으면 눈덩이를 시작: 다음 주먹이 크게 잡을 자리로 띄운다
    if (sx >= 0 && (sv >= 7 || since > 75)) return go(sx);
    return since > 110 ? go(cx) : NO;
  },
};
/** 봇: 아무 때나 아무 데나 톡 */
export const groundpunchRandom: Bot<GPState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    if (s.down) return NO;
    return rng() < 1 / 40 ? { tap: false, dir: 0, pointer: { x: 0.06 + rng() * 0.88, y: (0.42 + rng() * 0.8) / A } } : NO;
  },
};
/** 버릇 봇: 쉼이 끝나면 늘 가장 앞(꽃길 쪽) 무리 */
export const groundpunchHabit: Bot<GPState> = {
  name: '버릇: 늘 가장 앞 무리',
  act(s) {
    const mid = between(s, true);
    if (mid) return mid;
    if (!ready(s)) return NO;
    let f: Mon | null = null;
    for (const m of s.mons) if (grounded(m) && !isBoss(m) && m.x > s.cam && m.x < s.cam + 1 && (!f || m.x < f.x)) f = m;
    if (!f) return NO;
    let sx = 0, n = 0;
    for (const m of s.mons) if (grounded(m) && !isBoss(m) && Math.abs(m.x - f.x) < 0.15) (sx += m.x), n++;
    return at(sx / n - s.cam);
  },
};
/** 독립 버릇 봇: 쉼이 끝나면 늘 가장 낮게 떨어지는 공중 놈 아래 (없으면 가장 가까운 무리) */
export const groundpunchHabit2: Bot<GPState> = {
  name: '버릇: 늘 공중 놈 아래만',
  act(s) {
    const mid = between(s, false);
    if (mid) return mid;
    if (!ready(s)) return NO;
    let f: Mon | null = null;
    for (const m of s.mons) if (juggly(m) && m.x > s.cam && m.x < s.cam + 1 && (!f || m.h < f.h)) f = m;
    if (f) return at(f.x - s.cam);
    let g: Mon | null = null;
    for (const m of s.mons) if (grounded(m) && !isBoss(m) && m.x > s.cam && m.x < s.cam + 1 && (!g || m.x < g.x)) g = m;
    return g ? at(g.x - s.cam) : NO;
  },
};
/** 측정·스크린샷용: k판으로 건너뛰기 */
export const __jump = (s: GPState, k: number, lv = k + 1, perk: number[] = [k > 3 ? 1 : 0, k > 7 ? 1 : 0]) => ((s.stage = k), (s.lv = lv), (s.perk = perk), newStage(s));

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
/** 단위 좌표: 몸 반지름 = 1, 발 가운데 = (0,0), 위쪽이 -y. 테두리 굵기 */
const LW = 0.1;
/** 채우고 테두리 */
function ink(g: C2, fill: string | CanvasGradient, lw = LW, stroke = OUT) {
  g.fillStyle = fill;
  g.fill();
  if (lw > 0) (g.strokeStyle = stroke), (g.lineWidth = lw), g.stroke();
}

// ───────────────────────────── 그리기: 몬스터 스티커 ─────────────────────────────
/** 표정: 평소 · 으아아(날아감) · 어질(기절) · 우쭐(꽃을 밟음) · 아야(깔림) · 화남(대장) */
const M_IDLE = 0, M_FLY = 1, M_DIZZY = 2, M_SMUG = 3, M_HURT = 4, M_ANGRY = 5;
/** 얼굴: (cx,cy) = 두 눈 사이, e = 눈 간격의 절반, s = 눈 크기, my = 입까지 거리 */
function face(g: C2, cx: number, cy: number, e: number, s: number, mood: number, my: number, mw = 1) {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const sd of [-1, 1]) {
    const x = cx + sd * e, y = cy;
    if (mood === M_HURT) {
      g.strokeStyle = OUT;
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
        const a = i * 0.75 * sd, q = s * (0.12 + i * 0.058);
        if (i) g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
        else g.moveTo(x + q, y);
      }
      g.stroke();
    } else if (mood === M_SMUG) {
      g.strokeStyle = OUT;
      g.lineWidth = s * 0.36;
      g.beginPath();
      g.arc(x, y + s * 0.3, s * 0.7, Math.PI * 1.12, Math.PI * 1.88);
      g.stroke();
    } else {
      const wide = mood === M_FLY ? 1.22 : 1;
      ell(g, x, y, s * 0.86 * wide, s * 1.0 * wide);
      ink(g, '#ffffff', s * 0.2);
      const pr = mood === M_FLY ? 0.3 : 0.46;
      ell(g, x + (mood === M_FLY ? 0 : s * 0.1), y + s * (mood === M_FLY ? -0.05 : 0.1), s * pr, s * (pr + 0.1));
      g.fillStyle = '#2a1a12';
      g.fill();
      ell(g, x - s * 0.06, y - s * 0.16, s * 0.17, s * 0.2);
      g.fillStyle = '#ffffff';
      g.fill();
      if (mood === M_ANGRY) {
        g.strokeStyle = OUT;
        g.lineWidth = s * 0.42;
        g.beginPath();
        g.moveTo(x + sd * s * 1.05, y - s * 1.6);
        g.lineTo(x - sd * s * 0.75, y - s * 0.95);
        g.stroke();
      } else if (mood === M_FLY) {
        g.strokeStyle = OUT;
        g.lineWidth = s * 0.26;
        g.beginPath();
        g.moveTo(x - s * 0.7, y - s * 1.55 + sd * s * 0.1);
        g.quadraticCurveTo(x, y - s * 1.95, x + s * 0.7, y - s * 1.55 - sd * s * 0.1);
        g.stroke();
      }
    }
  }
  const y = cy + my, w = s * 1.25 * mw;
  g.strokeStyle = OUT;
  g.lineWidth = s * 0.3;
  if (mood === M_FLY) {
    ell(g, cx, y + s * 0.3, w * 0.55, s * 0.95);
    ink(g, '#8c2f2f', s * 0.26);
    ell(g, cx, y + s * 0.75, w * 0.32, s * 0.32);
    g.fillStyle = '#ff8a8a';
    g.fill();
  } else if (mood === M_HURT) {
    ell(g, cx, y + s * 0.15, s * 0.42, s * 0.5);
    ink(g, '#8c2f2f', s * 0.24);
  } else if (mood === M_DIZZY) {
    g.beginPath();
    g.moveTo(cx - w, y);
    g.quadraticCurveTo(cx - w * 0.5, y - s * 0.5, cx, y);
    g.quadraticCurveTo(cx + w * 0.5, y + s * 0.5, cx + w, y);
    g.stroke();
  } else if (mood === M_ANGRY) {
    ell(g, cx, y + s * 0.2, w * 0.75, s * 0.7);
    ink(g, '#8c2f2f', s * 0.26);
    g.fillStyle = '#ffffff';
    g.fillRect(cx - w * 0.5, y - s * 0.38, w, s * 0.28);
  } else if (mood === M_SMUG) {
    g.beginPath();
    g.moveTo(cx - w, y - s * 0.15);
    g.quadraticCurveTo(cx, y + s * 1.35, cx + w, y - s * 0.15);
    g.closePath();
    ink(g, '#8c2f2f', s * 0.26);
  } else {
    g.beginPath();
    g.moveTo(cx - w * 0.6, y);
    g.quadraticCurveTo(cx, y + s * 0.7, cx + w * 0.6, y);
    g.stroke();
  }
}
function blush(g: C2, cx: number, cy: number, e: number, r: number) {
  g.fillStyle = 'rgba(255,110,130,.42)';
  for (const sd of [-1, 1]) ell(g, cx + sd * e, cy, r, r * 0.62), g.fill();
}
function shine(g: C2, x: number, y: number, rx: number, ry: number, rot = -0.5) {
  g.fillStyle = 'rgba(255,255,255,.5)';
  ell(g, x, y, rx, ry, rot);
  g.fill();
}
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
/** 말랑이 빛깔: 본색 · 밝은색 · 어두운색 */
const BLOB_COL = [['#ff9fc6', '#ffd6e8', '#e0609a'], ['#7fe0c0', '#c8f7e6', '#3fae8c'], ['#ffd65c', '#fff2b8', '#e0a020'], ['#b9a0f5', '#e2d6ff', '#8462d8'], ['#ffae6c', '#ffe0c4', '#e07a34']];
const PAINT: Record<K, (g: C2, mood: number, v: number) => void> = {
  blob(g, mood, v) {
    const [c, lt, dk] = BLOB_COL[v % BLOB_COL.length];
    for (const sd of [-1, 1]) ell(g, sd * 0.5, -0.08, 0.32, 0.16), ink(g, dk, LW * 0.9);
    g.beginPath();
    g.moveTo(-1.05, -0.12);
    g.bezierCurveTo(-1.18, -1.35, -0.62, -2.02, 0, -2.02);
    g.bezierCurveTo(0.62, -2.02, 1.18, -1.35, 1.05, -0.12);
    g.quadraticCurveTo(0, 0.1, -1.05, -0.12);
    g.closePath();
    ink(g, lin(g, 0, -2, 0, 0, [0, lt], [0.45, c], [1, dk]), LW * 1.2);
    // 머리 위 꼬불
    g.beginPath();
    g.moveTo(-0.05, -1.98);
    g.bezierCurveTo(-0.1, -2.45, 0.45, -2.5, 0.42, -2.18);
    g.bezierCurveTo(0.4, -2.0, 0.15, -2.05, 0.2, -2.2);
    g.strokeStyle = dk;
    g.lineWidth = LW * 1.6;
    g.stroke();
    shine(g, -0.48, -1.5, 0.3, 0.16);
    face(g, 0, -1.08, 0.4, 0.27, mood, 0.45);
    blush(g, 0, -0.8, 0.7, 0.16);
  },
  bear(g, mood) {
    for (const sd of [-1, 1]) {
      ell(g, sd * 0.68, -1.86, 0.32, 0.32);
      ink(g, '#a9682f');
      ell(g, sd * 0.68, -1.84, 0.16, 0.16);
      g.fillStyle = '#f2b6a0';
      g.fill();
    }
    for (const sd of [-1, 1]) ell(g, sd * 0.52, -0.08, 0.36, 0.18), ink(g, '#7a4a22', LW * 0.9);
    ell(g, 0, -1.0, 1.04, 1.02);
    ink(g, lin(g, 0, -2, 0, 0, [0, '#d4955a'], [1, '#9c5f2a']), LW * 1.15);
    ell(g, 0, -0.56, 0.64, 0.48);
    g.fillStyle = '#f1d3a2';
    g.fill();
    shine(g, -0.45, -1.62, 0.3, 0.14);
    ell(g, 0, -1.0, 0.4, 0.28);
    ink(g, '#f6e2bd', LW * 0.6);
    ell(g, 0, -1.1, 0.15, 0.1);
    g.fillStyle = '#3a2418';
    g.fill();
    face(g, 0, -1.36, 0.42, 0.2, mood, mood === M_FLY ? 0.42 : 0.5, 0.8);
    // 빨간 목도리
    g.beginPath();
    g.moveTo(-0.86, -0.62);
    g.quadraticCurveTo(0, -0.38, 0.86, -0.62);
    g.lineTo(0.8, -0.4);
    g.quadraticCurveTo(0, -0.16, -0.8, -0.4);
    g.closePath();
    ink(g, '#ff5a4e', LW * 0.8);
    g.beginPath();
    g.moveTo(0.4, -0.4);
    g.lineTo(0.62, 0.02);
    g.lineTo(0.3, -0.05);
    g.closePath();
    ink(g, '#e8433a', LW * 0.7);
    for (const sd of [-1, 1]) ell(g, sd * 0.98, -0.72, 0.24, 0.3, sd * 0.5), ink(g, '#b97a3c', LW * 0.9);
  },
  mole(g, mood) {
    // 등에 진 접힌 우산
    g.strokeStyle = '#6b4a2a';
    g.lineWidth = LW * 1.3;
    g.beginPath();
    g.moveTo(0.55, -0.4);
    g.lineTo(1.0, -2.3);
    g.stroke();
    g.beginPath();
    g.moveTo(0.98, -2.25);
    g.quadraticCurveTo(1.35, -1.6, 0.7, -0.95);
    g.quadraticCurveTo(0.85, -1.7, 0.98, -2.25);
    ink(g, '#4fb8ff', LW * 0.8);
    for (const sd of [-1, 1]) ell(g, sd * 0.42, -0.06, 0.34, 0.16), ink(g, '#f6a6b8', LW * 0.8);
    g.beginPath();
    g.moveTo(-0.95, -0.1);
    g.bezierCurveTo(-1.1, -1.4, -0.55, -1.95, 0, -1.95);
    g.bezierCurveTo(0.55, -1.95, 1.1, -1.4, 0.95, -0.1);
    g.quadraticCurveTo(0, 0.08, -0.95, -0.1);
    ink(g, lin(g, 0, -2, 0, 0, [0, '#b29a8a'], [1, '#7a6050']), LW * 1.15);
    ell(g, 0, -0.62, 0.58, 0.45);
    g.fillStyle = '#d9c8b8';
    g.fill();
    shine(g, -0.42, -1.45, 0.26, 0.13);
    face(g, 0, -1.2, 0.38, 0.22, mood, 0.55, 0.8);
    // 분홍 코
    ell(g, 0, -0.98, 0.2, 0.14);
    ink(g, '#ff8fb0', LW * 0.6);
    blush(g, 0, -0.86, 0.62, 0.13);
    // 발톱 손
    for (const sd of [-1, 1]) ell(g, sd * 0.9, -0.62, 0.22, 0.17, sd * 0.4), ink(g, '#ffd0dc', LW * 0.7);
  },
  turtle(g, mood) {
    for (const sd of [-1, 1]) ell(g, sd * 0.68, -0.14, 0.26, 0.2), ink(g, '#7ad06a', LW * 0.9);
    // 머리
    ell(g, -0.92, -0.95, 0.5, 0.46);
    ink(g, lin(g, 0, -1.4, 0, -0.5, [0, '#9fe08a'], [1, '#5bb84e']), LW * 1.1);
    face(g, -0.98, -1.02, 0.2, 0.15, mood, 0.25, 0.6);
    // 고무공 등껍질 (빨강·하양·파랑·노랑)
    g.save();
    g.beginPath();
    g.moveTo(-0.95, -0.3);
    g.bezierCurveTo(-1.0, -1.65, 1.0, -1.65, 0.95, -0.3);
    g.closePath();
    g.clip();
    const cols = ['#ff5a4e', '#ffffff', '#3fa9ff', '#ffd84a', '#ff5a4e', '#ffffff'];
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.moveTo(0, -0.3);
      g.arc(0, -0.3, 1.6, Math.PI + (i * Math.PI) / 6, Math.PI + ((i + 1) * Math.PI) / 6);
      g.closePath();
      g.fillStyle = cols[i];
      g.fill();
    }
    g.restore();
    g.beginPath();
    g.moveTo(-0.95, -0.3);
    g.bezierCurveTo(-1.0, -1.65, 1.0, -1.65, 0.95, -0.3);
    g.closePath();
    g.strokeStyle = OUT;
    g.lineWidth = LW * 1.2;
    g.stroke();
    shine(g, -0.35, -1.1, 0.25, 0.12);
    rr(g, -1.02, -0.4, 2.04, 0.26, 0.12);
    ink(g, '#ffe9b0', LW * 0.9);
  },
  golem(g, mood, v) {
    for (const sd of [-1, 1]) rr(g, sd * 0.55 - 0.3, -0.32, 0.6, 0.34, 0.14), ink(g, '#8b95a3', LW);
    rr(g, -1.0, -1.95, 2.0, 1.72, 0.5);
    ink(g, lin(g, 0, -1.95, 0, -0.2, [0, '#c8cfd8'], [1, '#8b95a3']), LW * 1.2);
    // 이끼
    g.beginPath();
    g.moveTo(-0.95, -1.58);
    g.quadraticCurveTo(-0.9, -2.0, -0.3, -1.98);
    g.quadraticCurveTo(0.3, -2.12, 0.8, -1.9);
    g.quadraticCurveTo(1.0, -1.75, 0.96, -1.55);
    g.quadraticCurveTo(0.5, -1.7, 0.1, -1.6);
    g.quadraticCurveTo(-0.5, -1.72, -0.95, -1.58);
    ink(g, '#79c955', LW * 0.8);
    // 돌 무늬
    g.fillStyle = 'rgba(90,100,115,.35)';
    for (const [x, y, r] of [[-0.6, -0.6, 0.13], [0.65, -0.85, 0.1], [0.4, -0.45, 0.08]] as [number, number, number][]) ell(g, x, y, r, r * 0.7), g.fill();
    // 빛나는 눈
    for (const sd of [-1, 1]) {
      const x = sd * 0.36, y = -1.18;
      if (mood === M_DIZZY || mood === M_HURT) {
        g.strokeStyle = '#2a3440';
        g.lineWidth = 0.11;
        g.beginPath();
        g.moveTo(x - 0.16, y - 0.12);
        g.lineTo(x + 0.16, y + 0.12);
        g.moveTo(x + 0.16, y - 0.12);
        g.lineTo(x - 0.16, y + 0.12);
        g.stroke();
      } else {
        rr(g, x - 0.17, y - (mood === M_FLY ? 0.2 : 0.12), 0.34, mood === M_FLY ? 0.4 : 0.24, 0.1);
        ink(g, radg(g, x, y, 0, 0.2, [0, '#ffffff'], [1, '#5fe8ff']), LW * 0.6, '#2a3440');
      }
    }
    if (mood === M_FLY) (ell(g, 0, -0.68, 0.2, 0.22), ink(g, '#3a3440', LW * 0.6));
    else (g.strokeStyle = '#3a4450'), (g.lineWidth = 0.09), g.beginPath(), g.moveTo(-0.25, -0.72), g.lineTo(0.25, -0.72), g.stroke();
    for (const sd of [-1, 1]) rr(g, sd * 1.12 - 0.22, -1.25, 0.44, 0.78, 0.2), ink(g, '#a9b2be', LW);
    // 금 간 골렘
    if (v === 1) {
      g.strokeStyle = '#3a3440';
      g.lineWidth = 0.08;
      g.beginPath();
      g.moveTo(-0.2, -1.95);
      g.lineTo(-0.05, -1.55);
      g.lineTo(-0.3, -1.3);
      g.lineTo(0.05, -0.95);
      g.moveTo(-0.05, -1.55);
      g.lineTo(0.35, -1.45);
      g.moveTo(0.6, -0.3);
      g.lineTo(0.45, -0.6);
      g.lineTo(0.7, -0.75);
      g.stroke();
    }
  },
  bomb(g, mood) {
    for (const sd of [-1, 1]) for (const k of [-0.4, 0.35]) (g.strokeStyle = OUT), (g.lineWidth = LW * 1.1), g.beginPath(), g.moveTo(sd * 0.5 + k * 0.4, -0.3), g.lineTo(sd * 0.75 + k * 0.5, 0), g.stroke();
    ell(g, 0, -0.85, 1.05, 0.78);
    ink(g, radg(g, -0.35, -1.25, 0, 1.3, [0, '#7f8fd8'], [0.6, '#3a4a8a'], [1, '#26305e']), LW * 1.2);
    g.strokeStyle = 'rgba(20,26,60,.7)';
    g.lineWidth = LW * 0.9;
    g.beginPath();
    g.moveTo(0.15, -1.6);
    g.lineTo(0.15, -0.1);
    g.stroke();
    shine(g, -0.5, -1.25, 0.32, 0.14);
    // 머리
    ell(g, -0.88, -0.62, 0.42, 0.38);
    ink(g, '#2e3760', LW);
    face(g, -0.94, -0.68, 0.16, 0.13, mood, 0.2, 0.6);
    // 도화선
    g.strokeStyle = '#c9a46a';
    g.lineWidth = LW * 1.2;
    g.beginPath();
    g.moveTo(0.3, -1.6);
    g.quadraticCurveTo(0.5, -2.1, 0.85, -2.05);
    g.stroke();
    burstPath(g, 0.88, -2.08, 0.24, 6, 0.45);
    ink(g, '#ffd84a', LW * 0.6, '#ff7a2e');
  },
  twister(g, mood) {
    const rows = [[-2.15, 1.05], [-1.7, 0.95], [-1.25, 0.8], [-0.8, 0.6], [-0.38, 0.4], [-0.05, 0.22]];
    for (let i = 0; i < rows.length; i++) {
      const [y, r] = rows[i];
      ell(g, (i % 2 ? 0.08 : -0.08), y, r, 0.26);
      ink(g, i % 2 ? '#f0d08a' : '#e5bd6c', LW * 0.9, '#8a6a3a');
    }
    g.strokeStyle = 'rgba(255,255,255,.7)';
    g.lineWidth = LW * 0.8;
    for (let i = 0; i < 4; i++) {
      const [y, r] = rows[i];
      g.beginPath();
      g.ellipse(0, y, r * 0.75, 0.15, 0, 0.3, 2.2);
      g.stroke();
    }
    face(g, 0, -1.55, 0.36, 0.2, mood, 0.4, 0.8);
  },
  boar(g, mood) {
    // 갈기
    g.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * (1.15 + i * 0.09), q = i % 2 ? 1.12 : 1.38;
      const x = Math.cos(a) * q * 1.05, y = -1.0 + Math.sin(a) * q;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.closePath();
    ink(g, '#6b3a2a', LW * 0.8);
    for (const sd of [-1, 1]) rr(g, sd * 0.5 - 0.2, -0.36, 0.4, 0.38, 0.12), ink(g, '#4a2a22', LW * 0.8);
    ell(g, 0, -1.0, 1.08, 0.96);
    ink(g, lin(g, 0, -2, 0, 0, [0, '#d08a6a'], [1, '#9a5a42']), LW * 1.15);
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.72, -1.72);
      g.lineTo(sd * 1.02, -2.08);
      g.lineTo(sd * 0.95, -1.55);
      g.closePath();
      ink(g, '#b06a4a', LW * 0.8);
    }
    shine(g, -0.5, -1.6, 0.28, 0.12);
    face(g, 0, -1.38, 0.42, 0.2, mood === M_IDLE ? M_ANGRY : mood, 0.62, 0.9);
    // 코와 엄니
    ell(g, 0, -0.86, 0.36, 0.26);
    ink(g, '#ffb0a0', LW * 0.8);
    for (const sd of [-1, 1]) ell(g, sd * 0.13, -0.86, 0.06, 0.09), (g.fillStyle = '#7a3a2a'), g.fill();
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.3, -0.7);
      g.quadraticCurveTo(sd * 0.62, -0.72, sd * 0.6, -1.12);
      g.quadraticCurveTo(sd * 0.48, -0.86, sd * 0.24, -0.82);
      g.closePath();
      ink(g, '#fff8e8', LW * 0.6);
    }
    crown(g, 0, -1.92, 0.36);
  },
  shroom(g, mood) {
    // 줄기(얼굴)
    for (const sd of [-1, 1]) ell(g, sd * 0.4, -0.08, 0.3, 0.16), ink(g, '#d9c29a', LW * 0.8);
    rr(g, -0.62, -1.25, 1.24, 1.2, 0.45);
    ink(g, lin(g, 0, -1.25, 0, 0, [0, '#fff6e4'], [1, '#e8d4b0']), LW * 1.1);
    face(g, 0, -0.75, 0.3, 0.16, mood === M_IDLE ? M_ANGRY : mood, 0.38, 0.8);
    blush(g, 0, -0.55, 0.44, 0.1);
    // 빨간 갓
    g.beginPath();
    g.moveTo(-1.25, -1.12);
    g.bezierCurveTo(-1.35, -2.45, 1.35, -2.45, 1.25, -1.12);
    g.quadraticCurveTo(0, -0.92, -1.25, -1.12);
    g.closePath();
    ink(g, lin(g, 0, -2.3, 0, -1.0, [0, '#ff7a6a'], [1, '#d9342a']), LW * 1.2);
    g.fillStyle = '#ffffff';
    for (const [x, y, r] of [[-0.6, -1.55, 0.2], [0.2, -1.95, 0.17], [0.75, -1.45, 0.15], [-0.15, -1.42, 0.12]] as [number, number, number][]) ell(g, x, y, r, r * 0.8), g.fill();
    shine(g, -0.7, -1.9, 0.25, 0.1);
    crown(g, 0, -2.16, 0.34);
  },
  scorp(g, mood) {
    // 꼬리
    g.strokeStyle = OUT;
    g.lineWidth = LW * 1.2;
    const seg: [number, number, number][] = [[0.75, -0.9, 0.3], [1.05, -1.35, 0.27], [1.12, -1.85, 0.24], [0.9, -2.3, 0.22], [0.5, -2.5, 0.2]];
    for (const [x, y, r] of seg) ell(g, x, y, r, r), ink(g, lin(g, 0, y - r, 0, y + r, [0, '#ff9a6a'], [1, '#d9502e']), LW * 1.1);
    g.beginPath();
    g.moveTo(0.38, -2.55);
    g.quadraticCurveTo(0.05, -2.55, 0.12, -2.25);
    g.lineTo(0.35, -2.4);
    g.closePath();
    ink(g, '#5a3a3a', LW * 0.8);
    for (const sd of [-1, 1]) for (const k of [-0.45, 0, 0.45]) (g.strokeStyle = OUT), (g.lineWidth = LW * 1.1), g.beginPath(), g.moveTo(k * 0.9, -0.3), g.lineTo(k * 0.9 + sd * 0.35, 0), g.stroke();
    ell(g, 0, -0.78, 1.0, 0.62);
    ink(g, lin(g, 0, -1.4, 0, -0.15, [0, '#ff9a6a'], [1, '#c9442a']), LW * 1.2);
    for (const k of [-0.35, 0.05, 0.45]) (g.strokeStyle = 'rgba(120,30,20,.45)'), (g.lineWidth = LW * 0.8), g.beginPath(), g.arc(k, -0.78, 0.55, Math.PI * 1.25, Math.PI * 1.75), g.stroke();
    shine(g, -0.45, -1.1, 0.28, 0.1);
    face(g, -0.38, -1.02, 0.25, 0.16, mood === M_IDLE ? M_ANGRY : mood, 0.32, 0.8);
    // 집게 둘
    for (const sd of [0, 1]) {
      const x = -1.2 + sd * 0.25, y = -0.7 - sd * 0.55;
      g.strokeStyle = OUT;
      g.lineWidth = LW * 2.2;
      g.beginPath();
      g.moveTo(-0.6, -0.8);
      g.lineTo(x + 0.2, y + 0.1);
      g.stroke();
      g.strokeStyle = '#e8603c';
      g.lineWidth = LW * 1.2;
      g.stroke();
      g.beginPath();
      g.moveTo(x + 0.25, y);
      g.arc(x, y, 0.36, -0.4, Math.PI + 0.6, true);
      g.lineTo(x - 0.05, y - 0.05);
      g.arc(x, y, 0.16, Math.PI + 0.6, -0.4);
      g.closePath();
      ink(g, '#ff8a5c', LW);
    }
    crown(g, -0.3, -1.42, 0.3);
  },
};
/** 미리 그려 둔 스티커 (종류·표정마다 한 장) */
const SW = 4.6, SH = 3.9, SOX = 2.3, SOY = 3.2;
const SPR = new Map<string, HTMLCanvasElement>();
const spriteKey = (k: K, mood: number, v: number, px: number) => `${k}:${mood}:${v}:${Math.max(6, Math.round(px))}`;
function sprite(k: K, mood: number, v: number, px: number): HTMLCanvasElement {
  const q = Math.max(6, Math.round(px)), key = spriteKey(k, mood, v, px);
  let c = SPR.get(key);
  if (!c) {
    if (SPR.size > 320) SPR.clear();
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
/** 아직 띄워 보지 못한 몬스터: 그림자 스티커 */
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
/** 스티커 찍기: (0,0) = 발 가운데, u = 화면에서 몸 반지름 px */
function stamp(ctx: C2, c: HTMLCanvasElement, u: number) {
  ctx.drawImage(c, -SOX * u, -SOY * u, SW * u, SH * u);
}
/** 우산 두더지가 떨어질 때 펴는 우산 (단위: 몸 반지름 u, (0,0) = 몸 가운데) */
function umbrella(ctx: C2, u: number, t: number) {
  ctx.save();
  ctx.rotate(Math.sin(t * 0.08) * 0.12);
  ctx.strokeStyle = '#6b4a2a';
  ctx.lineWidth = u * 0.14;
  ctx.beginPath();
  ctx.moveTo(0, -u * 0.6);
  ctx.lineTo(0, -u * 2.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-u * 1.9, -u * 2.2);
  ctx.quadraticCurveTo(0, -u * 4.0, u * 1.9, -u * 2.2);
  for (let i = 4; i >= 0; i--) ctx.quadraticCurveTo(-u * 1.9 + (i + 0.5) * u * 0.76, -u * 2.5, -u * 1.9 + i * u * 0.76, -u * 2.2);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -u * 3.4, 0, -u * 2.2, [0, '#7fd0ff'], [1, '#2f9be8']);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, u * 0.1);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.moveTo(-u * 1.2, -u * 2.55);
  ctx.quadraticCurveTo(-u * 0.6, -u * 3.3, 0, -u * 3.35);
  ctx.quadraticCurveTo(-u * 0.5, -u * 3.0, -u * 0.7, -u * 2.45);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ───────────────────────────── 그리기: 흙 정령 · 주먹 · 손가락 · 장 끝 돌상 ─────────────────────────────
/** 꼬마 흙 정령. (x,y) = 머리 가운데, k = 머리 반지름 px, mood: 0 평소 · 1 으랏차(주먹) · 2 걱정 · 3 신남 · 4 헛방 */
function drawSpirit(ctx: C2, x: number, y: number, k: number, lv: number, t: number, mood: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const lw = Math.max(1.2, k * 0.09);
  // 금빛 (Lv10)
  if (lv >= 10) {
    ctx.fillStyle = radg(ctx, 0, -k * 0.3, k * 0.6, k * 2.2, [0, 'rgba(255,230,120,.55)'], [1, 'rgba(255,230,120,0)']);
    ell(ctx, 0, -k * 0.3, k * 2.2, k * 2.2);
    ctx.fill();
  }
  // 머리카락: 풀 → 꽃 → 꽃 둘 → 나무 왕관
  const sway = Math.sin(t * 0.07) * 0.12;
  if (lv >= 7) {
    ctx.fillStyle = '#8a5a34';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw;
    rr(ctx, -k * 0.12, -k * 1.65, k * 0.24, k * 0.7, k * 0.08);
    ctx.fill();
    ctx.stroke();
    for (const [dx, dy, r] of [[-0.5, -1.75, 0.45], [0.5, -1.75, 0.45], [0, -2.1, 0.55]] as [number, number, number][]) {
      ell(ctx, k * dx + sway * k * 0.3, k * dy, k * r, k * r * 0.85);
      ctx.fillStyle = lin(ctx, 0, k * (dy - r), 0, k * (dy + r), [0, '#8fe06a'], [1, '#3f9e3a']);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#ff5a6e';
    for (const [dx, dy] of [[-0.55, -1.7], [0.3, -2.2], [0.62, -1.62]]) ell(ctx, k * dx, k * dy, k * 0.11, k * 0.11), ctx.fill();
  } else {
    const blades = lv >= 5 ? 5 : 3;
    for (let i = 0; i < blades; i++) {
      const a = -Math.PI / 2 + (i - (blades - 1) / 2) * 0.42 + sway, L = k * (0.75 + (i % 2) * 0.2);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a + 0.25) * k * 0.82, Math.sin(a + 0.25) * k * 0.82);
      ctx.quadraticCurveTo(Math.cos(a) * (k + L), Math.sin(a) * (k + L) - k * 0.1, Math.cos(a) * (k + L), Math.sin(a) * (k + L));
      ctx.quadraticCurveTo(Math.cos(a) * (k + L * 0.4), Math.sin(a) * (k + L * 0.4), Math.cos(a - 0.25) * k * 0.82, Math.sin(a - 0.25) * k * 0.82);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? '#6fcf4f' : '#8fe06a';
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = lw * 0.8;
      ctx.stroke();
    }
    if (lv >= 3) {
      const flowers: [number, number, string][] = lv >= 5 ? [[-0.55, -1.25, '#ff7aa8'], [0.62, -1.3, '#ffd84a']] : [[0.45, -1.3, '#ffffff']];
      for (const [fx, fy, col] of flowers) {
        for (let j = 0; j < 5; j++) {
          const a = (j * TAU) / 5 + t * 0.01;
          ell(ctx, k * fx + Math.cos(a) * k * 0.18, k * fy + Math.sin(a) * k * 0.18, k * 0.14, k * 0.14);
          ctx.fillStyle = col;
          ctx.fill();
          ctx.strokeStyle = 'rgba(75,48,32,.6)';
          ctx.lineWidth = lw * 0.5;
          ctx.stroke();
        }
        ell(ctx, k * fx, k * fy, k * 0.12, k * 0.12);
        ctx.fillStyle = col === '#ffd84a' ? '#ff9a3d' : '#ffd84a';
        ctx.fill();
      }
    }
  }
  // 머리
  ell(ctx, 0, 0, k, k * 0.95);
  ctx.fillStyle = lin(ctx, 0, -k, 0, k, [0, '#c99360'], [1, '#93603a']);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.stroke();
  ell(ctx, 0, k * 0.22, k * 0.72, k * 0.6);
  ctx.fillStyle = '#f4d4a8';
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ell(ctx, -k * 0.45, -k * 0.5, k * 0.22, k * 0.12, -0.5);
  ctx.fill();
  // 흙 알갱이
  ctx.fillStyle = 'rgba(90,55,30,.35)';
  for (const [dx, dy] of [[-0.75, -0.2], [0.78, -0.3], [0.6, 0.55]]) ell(ctx, k * dx, k * dy, k * 0.06, k * 0.05), ctx.fill();
  // 얼굴
  const ey = k * 0.08, e = k * 0.34, es = k * 0.17;
  for (const sd of [-1, 1]) {
    const ex = sd * e;
    if (mood === 3) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = es * 0.5;
      ctx.beginPath();
      ctx.arc(ex, ey + es * 0.4, es * 0.85, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (mood === 1) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = es * 0.45;
      ctx.beginPath();
      ctx.moveTo(ex - sd * es * 0.8, ey - es * 0.7);
      ctx.lineTo(ex + sd * es * 0.6, ey);
      ctx.lineTo(ex - sd * es * 0.8, ey + es * 0.7);
      ctx.stroke();
    } else {
      ell(ctx, ex, ey, es * 0.95, es * 1.15);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = es * 0.22;
      ctx.stroke();
      ell(ctx, ex + es * 0.12, ey + es * 0.12, es * 0.55, es * 0.68);
      ctx.fillStyle = mood === 2 ? '#4a6a9a' : '#2a1a12';
      ctx.fill();
      ell(ctx, ex - es * 0.05, ey - es * 0.2, es * 0.22, es * 0.25);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      if (mood === 2) {
        ctx.strokeStyle = OUT;
        ctx.lineWidth = es * 0.35;
        ctx.beginPath();
        ctx.moveTo(ex - sd * es * 1.0, ey - es * 1.5);
        ctx.lineTo(ex + sd * es * 0.7, ey - es * 1.9);
        ctx.stroke();
      }
    }
  }
  ctx.fillStyle = 'rgba(255,110,130,.45)';
  for (const sd of [-1, 1]) ell(ctx, sd * k * 0.58, k * 0.38, k * 0.15, k * 0.09), ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = es * 0.35;
  if (mood === 1 || mood === 3) {
    ctx.beginPath();
    ctx.moveTo(-k * 0.2, k * 0.4);
    ctx.quadraticCurveTo(0, k * 0.72, k * 0.2, k * 0.4);
    ctx.closePath();
    ctx.fillStyle = '#8c2f2f';
    ctx.fill();
    ctx.stroke();
  } else if (mood === 2 || mood === 4) {
    ctx.beginPath();
    ctx.moveTo(-k * 0.16, k * 0.52);
    ctx.quadraticCurveTo(0, k * 0.4, k * 0.16, k * 0.52);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-k * 0.14, k * 0.42);
    ctx.quadraticCurveTo(0, k * 0.58, k * 0.14, k * 0.42);
    ctx.stroke();
  }
  ctx.restore();
}
/** 정령의 손 (흙 가장자리를 잡고 있다가 주먹을 번쩍) */
function spiritHand(ctx: C2, x: number, y: number, k: number, up: number) {
  ell(ctx, x, y - up * k * 0.9, k * 0.36, k * 0.3);
  ctx.fillStyle = '#b57e4e';
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, k * 0.08);
  ctx.stroke();
}
/** 흙 주먹: (x,y) = 땅, k = 크기 px, age = 솟은 뒤 틱, combo = 공중 연속 */
function drawFist(ctx: C2, x: number, y: number, k: number, age: number, combo: number, small: boolean) {
  const rise = age < 8 ? 1 - (1 - age / 8) ** 2 : age < 13 ? 1 : Math.max(0, 1 - (age - 13) / 12);
  if (rise <= 0) return;
  const hc = k * (small ? 2.0 : 2.7) * rise, cw = k * 0.62, hot = Math.min(1, combo / 4);
  ctx.save();
  ctx.lineJoin = 'round';
  // 기둥 (흙 켜켜이)
  ctx.beginPath();
  ctx.moveTo(x - cw * 1.25, y + k * 0.08);
  ctx.quadraticCurveTo(x - cw * 0.95, y - hc * 0.4, x - cw * 0.82, y - hc);
  ctx.lineTo(x + cw * 0.82, y - hc);
  ctx.quadraticCurveTo(x + cw * 0.95, y - hc * 0.4, x + cw * 1.25, y + k * 0.08);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, x - cw, 0, x + cw, 0, [0, '#8a5a34'], [0.45, '#b9824e'], [1, '#7a4c2a']);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.5, k * 0.07);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(70,40,20,.35)';
  ctx.lineWidth = Math.max(1, k * 0.05);
  for (let i = 1; i <= 3; i++) {
    const yy = y - (hc * i) / 4;
    if (yy > y - hc + k * 0.1) (ctx.beginPath(), ctx.moveTo(x - cw * 0.9, yy), ctx.quadraticCurveTo(x, yy + k * 0.1, x + cw * 0.9, yy - k * 0.04), ctx.stroke());
  }
  ctx.fillStyle = '#9aa3ad';
  for (const [dx, dy] of [[-0.4, 0.3], [0.35, 0.62], [-0.2, 0.8]]) if (hc * dy > k * 0.3) (ell(ctx, x + cw * dx, y - hc * dy, k * 0.1, k * 0.07), ctx.fill());
  // 주먹 (손가락 마디가 위로)
  const fy = y - hc - k * 0.45, fw = k * (small ? 0.75 : 1.0);
  if (age < 7 && !small) {
    // 쾅! 터지는 별 (처음 몇 틱)
    const q = age / 7;
    burstPath(ctx, x, fy - fw * 0.3, fw * (1.4 + 1.6 * q), 12, 0.55, age * 0.08);
    ctx.fillStyle = `rgba(255,246,190,${0.9 * (1 - q)})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,150,50,${0.9 * (1 - q)})`;
    ctx.lineWidth = Math.max(2, k * 0.08);
    ctx.stroke();
  }
  if (hot > 0) {
    ctx.fillStyle = radg(ctx, x, fy, fw * 0.3, fw * 2.2, [0, `rgba(255,190,80,${0.55 * hot})`], [1, 'rgba(255,120,40,0)']);
    ell(ctx, x, fy, fw * 2.2, fw * 2.0);
    ctx.fill();
  }
  rr(ctx, x - fw * 0.95, fy - fw * 0.55, fw * 1.9, fw * 1.25, fw * 0.48);
  ctx.fillStyle = lin(ctx, 0, fy - fw * 0.6, 0, fy + fw * 0.7, [0, hot > 0.5 ? '#ffb070' : '#e0a46a'], [1, hot > 0.5 ? '#d9602e' : '#a86a3a']);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.5, k * 0.08);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const kx = x - fw * 0.7 + i * fw * 0.47;
    ell(ctx, kx, fy - fw * 0.5, fw * 0.27, fw * 0.24);
    ctx.fillStyle = hot > 0.5 ? '#ffc890' : '#ecb47a';
    ctx.fill();
    ctx.stroke();
  }
  // 엄지
  ctx.beginPath();
  ctx.moveTo(x - fw * 0.95, fy + fw * 0.05);
  ctx.quadraticCurveTo(x - fw * 0.2, fy + fw * 0.05, x + fw * 0.1, fy - fw * 0.12);
  ctx.quadraticCurveTo(x + fw * 0.3, fy + fw * 0.15, x - fw * 0.1, fy + fw * 0.32);
  ctx.quadraticCurveTo(x - fw * 0.6, fy + fw * 0.4, x - fw * 0.95, fy + fw * 0.3);
  ctx.fillStyle = hot > 0.5 ? '#ffb880' : '#dda06a';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ell(ctx, x - fw * 0.55, fy - fw * 0.25, fw * 0.25, fw * 0.1, -0.3);
  ctx.fill();
  // 불꽃 (공중 연속 셋부터)
  if (combo >= 3) {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.45, L = fw * (0.9 + 0.4 * Math.abs(Math.sin(age * 0.5 + i)));
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a - 0.2) * fw * 0.8, fy - fw * 0.4 + Math.sin(a - 0.2) * fw * 0.3);
      ctx.quadraticCurveTo(x + Math.cos(a) * (fw + L), fy - fw * 0.4 + Math.sin(a) * (fw * 0.3 + L), x + Math.cos(a + 0.2) * fw * 0.8, fy - fw * 0.4 + Math.sin(a + 0.2) * fw * 0.3);
      ctx.fillStyle = i % 2 ? 'rgba(255,214,90,.85)' : 'rgba(255,120,50,.8)';
      ctx.fill();
    }
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
/** 장 끝 돌상 (길 위의 큰 물건): 0장 용암 주먹 · 쌍둥이 주먹 / 1장 천둥 착지 · 회오리 주먹. (x,y) = 바닥 가운데, k = 크기 px */
function drawPerk(ctx: C2, ch: number, i: number, x: number, y: number, k: number, t: number) {
  ctx.save();
  ctx.lineJoin = 'round';
  const lw = Math.max(1.5, k * 0.035);
  // 받침돌
  rr(ctx, x - k * 0.5, y - k * 0.28, k, k * 0.28, k * 0.06);
  ctx.fillStyle = lin(ctx, 0, y - k * 0.28, 0, y, [0, '#c8cfd8'], [1, '#8b95a3']);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.stroke();
  const cx = x, cy = y - k * 0.75;
  if (ch === 0 && i === 0) {
    // 용암 주먹: 붉게 달아오른 주먹
    ctx.fillStyle = radg(ctx, cx, cy, k * 0.1, k * 0.7, [0, 'rgba(255,170,60,.6)'], [1, 'rgba(255,90,30,0)']);
    ell(ctx, cx, cy, k * 0.7, k * 0.7);
    ctx.fill();
    drawFist(ctx, cx, y - k * 0.26, k * 0.32, 8, 4, false);
    ctx.fillStyle = '#ff7a2e';
    for (let j = 0; j < 4; j++) ell(ctx, cx + (j - 1.5) * k * 0.16, y - k * 0.3 - Math.abs(Math.sin(t * 0.1 + j)) * k * 0.1, k * 0.04, k * 0.04), ctx.fill();
  } else if (ch === 0) {
    // 쌍둥이 주먹
    drawFist(ctx, cx - k * 0.2, y - k * 0.26, k * 0.26, 8, 0, false);
    drawFist(ctx, cx + k * 0.26, y - k * 0.26, k * 0.2, 8, 0, true);
  } else if (i === 0) {
    // 천둥 착지: 먹구름과 번개
    for (const [dx, dy, r] of [[-0.22, -0.95, 0.22], [0.12, -1.05, 0.26], [0.32, -0.9, 0.18], [-0.02, -0.85, 0.2]] as [number, number, number][]) ell(ctx, cx + dx * k, y + dy * k, r * k, r * k * 0.8), (ctx.fillStyle = '#8f9bb8'), ctx.fill(), (ctx.strokeStyle = OUT), (ctx.lineWidth = lw), ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + k * 0.05, y - k * 0.78);
    ctx.lineTo(cx - k * 0.12, y - k * 0.5);
    ctx.lineTo(cx + k * 0.02, y - k * 0.5);
    ctx.lineTo(cx - k * 0.1, y - k * 0.3);
    ctx.lineTo(cx + k * 0.16, y - k * 0.56);
    ctx.lineTo(cx + k * 0.02, y - k * 0.56);
    ctx.lineTo(cx + k * 0.14, y - k * 0.78);
    ctx.closePath();
    ctx.fillStyle = (t >> 3) % 2 ? '#fff07a' : '#ffd23f';
    ctx.fill();
    ctx.stroke();
  } else {
    // 회오리 주먹: 소용돌이 돌
    ell(ctx, cx, cy, k * 0.36, k * 0.42);
    ctx.fillStyle = lin(ctx, 0, cy - k * 0.42, 0, cy + k * 0.42, [0, '#d8f0ff'], [1, '#7fb8e8']);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.strokeStyle = '#2f6fb0';
    ctx.lineWidth = lw * 1.2;
    ctx.beginPath();
    for (let j = 0; j <= 30; j++) {
      const a = j * 0.42 + t * 0.06, q = k * 0.02 + j * k * 0.0105;
      if (j) ctx.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q * 1.1);
      else ctx.moveTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q * 1.1);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ───────────────────────────── 그리기: 무대 (미리 구운 시차 배경) ─────────────────────────────
interface Pal { sky: [string, string, string]; far: [string, string]; mid: [string, string, string]; road: string; road2: string; verge: string; lip: string; soil: [string, string, string]; flower: string[] }
const PALS: Pal[] = [
  { sky: ['#5fc1ee', '#a6e0f7', '#e9f8ff'], far: ['#a9d8c8', '#8cc8b0'], mid: ['#9ad86a', '#74c24e', '#4f9e3a'], road: '#f0d59c', road2: '#ddb97a', verge: '#7ccb55', lip: '#5fb84a', soil: ['#a8744a', '#8e5f38', '#76492a'], flower: ['#ff7aa8', '#ffd84a', '#ffffff', '#8fc8ff'] },
  { sky: ['#6cc4e0', '#b0e2e0', '#eaf7e2'], far: ['#94c4a8', '#7ab090'], mid: ['#6db45e', '#4e9848', '#356f3a'], road: '#e6c690', road2: '#ceaa6e', verge: '#64b24c', lip: '#4d9c40', soil: ['#8f603e', '#774c2e', '#603c24'], flower: ['#ff6b6b', '#fff3a8', '#c39af5', '#ffffff'] },
  { sky: ['#ffa86e', '#ffd49c', '#fff1d2'], far: ['#f2b08c', '#e39a7a'], mid: ['#f6c870', '#eab058', '#d39440'], road: '#f6dda6', road2: '#e8c482', verge: '#c8b45c', lip: '#b49c4a', soil: ['#cc9252', '#b47a40', '#966232'], flower: ['#ff7a5c', '#ffe36b', '#ffffff', '#7fd0c0'] },
];
interface Bg { sky: HTMLCanvasElement; far: HTMLCanvasElement; mid: HTMLCanvasElement; road: HTMLCanvasElement }
const BGS = new Map<string, Bg>();
/** 위쪽 끝(이어 붙일 때 끊기지 않게 x = 0 근처 것은 w 너머에도 한 번 더) */
function wrap(w: number, x: number, r: number, paint: (x: number) => void) {
  paint(x);
  if (x - r < 0) paint(x + w);
  if (x + r > w) paint(x - w);
}
const FAR_Y = 0.56, FAR_H = 0.42, MID_Y = 0.68, MID_H = 0.33, ROAD_Y = GY - 0.045;
function bakeBg(ch: number, w: number, h: number, sc: number): Bg {
  const key = `${ch}:${w}:${h}:${sc}`;
  const got = BGS.get(key);
  if (got) return got;
  if (BGS.size > 6) BGS.clear();
  const P = PALS[ch], R = (v: number) => v * w;
  const sky = layer(w, R(GY + 0.02), sc, (g) => {
    g.fillStyle = lin(g, 0, R(0.1), 0, R(GY), [0, P.sky[0]], [0.55, P.sky[1]], [1, P.sky[2]]);
    g.fillRect(0, 0, w, R(GY + 0.02));
    const sx = ch === 2 ? R(0.7) : R(0.82), sy = ch === 2 ? R(0.52) : R(0.24), sr = R(ch === 2 ? 0.12 : 0.07);
    g.fillStyle = radg(g, sx, sy, sr * 0.6, sr * 4, [0, ch === 2 ? 'rgba(255,240,180,.75)' : 'rgba(255,255,220,.75)'], [1, 'rgba(255,255,220,0)']);
    g.fillRect(0, 0, w, R(GY));
    ell(g, sx, sy, sr, sr);
    g.fillStyle = ch === 2 ? '#fff2b0' : '#fffbe0';
    g.fill();
    // 떠 있는 장식 구름
    for (let i = 0; i < (ch === 2 ? 3 : 5); i++) {
      const cx = R(0.08 + hsh(i * 3 + ch) * 0.84), cy = R(0.2 + hsh(i * 7 + ch) * 0.3), k = R(0.035 + hsh(i * 11) * 0.03);
      g.fillStyle = ch === 2 ? 'rgba(255,246,230,.75)' : 'rgba(255,255,255,.85)';
      for (const [dx, dy, q] of [[-1.3, 0.2, 0.8], [0, 0, 1.2], [1.3, 0.25, 0.85], [0.5, -0.5, 0.8]]) ell(g, cx + dx * k, cy + dy * k, q * k, q * k * 0.8), g.fill();
    }
  });
  const far = layer(w, R(FAR_H), sc, (g) => {
    const base = R(FAR_H);
    for (let row = 0; row < 2; row++) {
      g.fillStyle = row ? P.far[1] : P.far[0];
      g.beginPath();
      g.moveTo(0, base);
      const n = ch === 1 ? 26 : 9;
      for (let i = 0; i <= n; i++) {
        const x = (i / n) * w, hgt = ch === 1 ? (i % 2 ? 0.12 : 0.22) + hsh(i * 5 + row * 31) * 0.1 : 0.16 + 0.12 * Math.sin((i / n) * TAU * 2 + row * 1.7 + ch) + hsh(i + row * 17) * 0.08;
        const y = base - R(hgt * (row ? 0.75 : 1)) - R(row ? 0 : 0.06);
        if (ch === 2 && i % 3 === 1) (g.lineTo(x - R(0.03), y), g.lineTo(x + R(0.05), y));
        else if (ch === 1) g.lineTo(x, y);
        else g.quadraticCurveTo(x - w / n / 2, y - R(0.03), x, y);
      }
      g.lineTo(w, base);
      g.closePath();
      g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,.18)';
    g.fillRect(0, 0, w, base);
  });
  const mid = layer(w * 1.5, R(MID_H), sc, (g) => {
    const W2 = w * 1.5, base = R(MID_H);
    g.fillStyle = P.mid[0];
    g.beginPath();
    g.moveTo(0, base);
    for (let i = 0; i <= 12; i++) g.quadraticCurveTo(((i - 0.5) / 12) * W2, base - R(0.1 + 0.05 * Math.sin(i * 1.9 + ch)), (i / 12) * W2, base - R(0.08 + 0.04 * Math.sin(i * 2.3 + ch * 2)));
    g.lineTo(W2, base);
    g.closePath();
    g.fill();
    for (let i = 0; i < 9; i++) {
      const x = ((i + 0.3 + hsh(i * 13 + ch) * 0.4) / 9) * W2, k = R(0.05 + hsh(i * 7 + ch) * 0.035), y = base - R(0.06);
      wrap(W2, x, k * 1.6, (px) => {
        g.lineWidth = Math.max(1.2, k * 0.06);
        g.strokeStyle = 'rgba(75,48,32,.45)';
        if (ch === 0) {
          rr(g, px - k * 0.12, y - k * 1.1, k * 0.24, k * 1.15, k * 0.06);
          g.fillStyle = '#9a6a44';
          g.fill();
          for (const [dx, dy, q] of [[0, -1.6, 0.75], [-0.5, -1.25, 0.55], [0.5, -1.3, 0.55]]) ell(g, px + dx * k, y + dy * k, q * k, q * k * 0.9), (g.fillStyle = dx ? P.mid[1] : P.mid[2]), g.fill(), g.stroke();
          g.fillStyle = 'rgba(255,255,255,.3)';
          ell(g, px - k * 0.25, y - k * 1.85, k * 0.25, k * 0.12, -0.4);
          g.fill();
        } else if (ch === 1) {
          if (i % 3 === 1) {
            rr(g, px - k * 0.18, y - k * 1.0, k * 0.36, k * 1.0, k * 0.1);
            g.fillStyle = '#fff3dc';
            g.fill();
            g.stroke();
            g.beginPath();
            g.moveTo(px - k * 0.9, y - k * 0.95);
            g.bezierCurveTo(px - k * 0.95, y - k * 1.9, px + k * 0.95, y - k * 1.9, px + k * 0.9, y - k * 0.95);
            g.closePath();
            g.fillStyle = i % 2 ? '#ff7a6a' : '#c39af5';
            g.fill();
            g.stroke();
            g.fillStyle = '#ffffff';
            for (const [dx, dy] of [[-0.4, -1.3], [0.2, -1.55], [0.55, -1.2]]) ell(g, px + dx * k, y + dy * k, k * 0.12, k * 0.1), g.fill();
          } else {
            rr(g, px - k * 0.14, y - k * 1.5, k * 0.28, k * 1.5, k * 0.06);
            g.fillStyle = '#7a5236';
            g.fill();
            for (let j = 0; j < 3; j++) {
              g.beginPath();
              g.moveTo(px - k * (0.9 - j * 0.15), y - k * (0.9 + j * 0.55));
              g.lineTo(px, y - k * (1.9 + j * 0.55));
              g.lineTo(px + k * (0.9 - j * 0.15), y - k * (0.9 + j * 0.55));
              g.closePath();
              g.fillStyle = j % 2 ? P.mid[1] : P.mid[2];
              g.fill();
              g.stroke();
            }
          }
        } else {
          if (i % 3 === 0) {
            // 선인장 그림자
            g.fillStyle = '#8fb860';
            rr(g, px - k * 0.16, y - k * 1.4, k * 0.32, k * 1.4, k * 0.16);
            g.fill();
            g.stroke();
            rr(g, px - k * 0.55, y - k * 1.0, k * 0.22, k * 0.55, k * 0.11);
            g.fill();
            g.stroke();
            rr(g, px + k * 0.33, y - k * 1.15, k * 0.22, k * 0.6, k * 0.11);
            g.fill();
            g.stroke();
          } else {
            g.fillStyle = i % 2 ? '#d99a6a' : '#e8ae7c';
            g.beginPath();
            g.moveTo(px - k * 0.9, y);
            g.lineTo(px - k * 0.6, y - k * 0.9);
            g.lineTo(px + k * 0.5, y - k * 1.0);
            g.lineTo(px + k * 0.9, y);
            g.closePath();
            g.fill();
            g.stroke();
            g.fillStyle = 'rgba(255,255,255,.25)';
            g.fillRect(px - k * 0.55, y - k * 0.92, k * 1.0, k * 0.12);
          }
        }
      });
    }
    g.fillStyle = P.mid[1];
    g.beginPath();
    g.moveTo(0, base);
    for (let i = 0; i <= 10; i++) g.quadraticCurveTo(((i - 0.5) / 10) * W2, base - R(0.055 + 0.02 * Math.sin(i * 2.7 + ch)), (i / 10) * W2, base - R(0.04));
    g.lineTo(W2, base);
    g.closePath();
    g.fill();
  });
  const top = ROAD_Y, H2 = HUD_B - top + 0.01;
  const road = layer(w, R(H2), sc, (g) => {
    const Y = (y: number) => R(y - top);
    // 뒤 풀섶
    g.fillStyle = P.verge;
    g.fillRect(0, 0, w, Y(GY + 0.01));
    g.fillStyle = 'rgba(0,0,0,.08)';
    g.fillRect(0, Y(GY - 0.012), w, R(0.02));
    for (let i = 0; i < 40; i++) {
      const x = (i / 40) * w + hsh(i) * R(0.02), k = R(0.012 + hsh(i * 3) * 0.01);
      wrap(w, x, k, (px) => {
        g.fillStyle = i % 3 ? P.lip : P.mid[2];
        g.beginPath();
        g.moveTo(px - k, Y(GY - 0.005));
        g.lineTo(px, Y(GY - 0.005) - k * 1.6);
        g.lineTo(px + k, Y(GY - 0.005));
        g.closePath();
        g.fill();
      });
    }
    for (let i = 0; i < 10; i++) {
      const x = ((i + hsh(i * 9 + ch)) / 10) * w, k = R(0.009);
      wrap(w, x, k * 2, (px) => {
        g.fillStyle = P.flower[i % P.flower.length];
        for (let j = 0; j < 5; j++) ell(g, px + Math.cos(j * 1.256) * k, Y(GY - 0.02) + Math.sin(j * 1.256) * k, k * 0.75, k * 0.75), g.fill();
        g.fillStyle = '#ffcf3a';
        ell(g, px, Y(GY - 0.02), k * 0.55, k * 0.55);
        g.fill();
      });
    }
    // 흙길
    g.fillStyle = lin(g, 0, Y(GY), 0, Y(GY + DZ + 0.03), [0, P.road2], [0.15, P.road], [1, P.road]);
    g.fillRect(0, Y(GY), w, R(DZ + 0.03));
    g.fillStyle = 'rgba(160,110,60,.12)';
    for (const ry of [0.045, 0.11]) g.fillRect(0, Y(GY + ry), w, R(0.012));
    for (let i = 0; i < 46; i++) {
      const x = hsh(i * 5 + ch * 3) * w, y = GY + 0.01 + hsh(i * 7 + 1) * (DZ + 0.01), k = R(0.004 + hsh(i * 11) * 0.007);
      wrap(w, x, k, (px) => {
        ell(g, px, Y(y), k, k * 0.65);
        g.fillStyle = i % 4 ? 'rgba(150,105,60,.35)' : 'rgba(255,255,255,.45)';
        g.fill();
      });
    }
    // 앞 풀 가장자리
    const lip = GY + DZ + 0.022;
    g.fillStyle = P.lip;
    g.beginPath();
    g.moveTo(0, Y(SOIL + 0.01));
    g.lineTo(0, Y(lip));
    for (let i = 0; i <= 30; i++) g.quadraticCurveTo(((i - 0.5) / 30) * w, Y(lip - 0.016), (i / 30) * w, Y(lip));
    g.lineTo(w, Y(SOIL + 0.01));
    g.closePath();
    g.fill();
    g.fillStyle = P.verge;
    g.fillRect(0, Y(lip + 0.006), w, R(0.012));
    // 흙 단면
    g.fillStyle = lin(g, 0, Y(SOIL), 0, Y(HUD_B), [0, P.soil[0]], [0.5, P.soil[1]], [1, P.soil[2]]);
    g.fillRect(0, Y(SOIL), w, R(HUD_B - SOIL + 0.01));
    g.strokeStyle = 'rgba(60,35,20,.25)';
    g.lineWidth = Math.max(1, R(0.004));
    for (const sy of [0.04, 0.085]) {
      g.beginPath();
      g.moveTo(0, Y(SOIL + sy));
      for (let i = 1; i <= 8; i++) g.quadraticCurveTo(((i - 0.5) / 8) * w, Y(SOIL + sy + 0.008 * Math.sin(i * 2.1 + sy * 50)), (i / 8) * w, Y(SOIL + sy));
      g.stroke();
    }
    for (let i = 0; i < 14; i++) {
      const x = hsh(i * 13 + ch) * w, y = SOIL + 0.02 + hsh(i * 17) * 0.09, k = R(0.008 + hsh(i * 19) * 0.012);
      wrap(w, x, k * 1.3, (px) => {
        ell(g, px, Y(y), k * 1.3, k);
        g.fillStyle = i % 3 ? 'rgba(200,205,215,.85)' : 'rgba(240,220,190,.75)';
        g.fill();
        g.strokeStyle = 'rgba(60,35,20,.45)';
        g.lineWidth = 1;
        g.stroke();
      });
    }
    // 뿌리
    g.strokeStyle = 'rgba(70,45,25,.45)';
    g.lineWidth = Math.max(1, R(0.004));
    for (let i = 0; i < 5; i++) {
      const x = ((i + 0.5) / 5) * w;
      g.beginPath();
      g.moveTo(x, Y(SOIL));
      g.quadraticCurveTo(x + R(0.02), Y(SOIL + 0.03), x - R(0.01), Y(SOIL + 0.05 + hsh(i) * 0.03));
      g.stroke();
    }
  });
  const bg = { sky, far, mid, road };
  BGS.set(key, bg);
  return bg;
}
function tile(ctx: C2, img: HTMLCanvasElement, off: number, y: number, tw: number, th: number, w: number) {
  let x = -(((off % tw) + tw) % tw);
  for (; x < w; x += tw) ctx.drawImage(img, x, y, tw, th);
}

// ───────────────────────────── 그리기: 장면 ─────────────────────────────
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/** 터질 때 색종이 색 */
const KCOL: Record<K, string> = { blob: '#ff9fc6', bear: '#d9a066', mole: '#b29a8a', boar: '#c0705a', turtle: '#ff5a4e', golem: '#c8cfd8', shroom: '#ff7a6a', bomb: '#7f8fd8', twister: '#f0d08a', scorp: '#ff8a5c' };
/** 정령 레벨이 오르면 달라지는 모습 */
const LV_GIFT: Record<number, string> = { 3: '머리에 꽃이 피었어요', 5: '꽃이 둘 — 주먹이 커져요', 7: '나무 왕관을 썼어요', 10: '금빛으로 빛나요' };
const STAR_WORDS = (s: GPState) => ['길 끝까지', '꽃길 안 밟히기', `한 주먹에 ${STAGES[s.stage].n}마리`];
const recent = new WeakMap<object, { x: number; y: number; t: number; size: number }[]>();
const blobV = (m: Mon, ch: number) => (m.seed + ch * 2) % BLOB_COL.length;

function drawAll(ctx: C2, s: GPState, w: number, h: number, _th: Theme) {
  const fx = juice(s), cam = s.cam, t = s.t;
  const X = (x: number) => (x - cam) * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const sc = typeof ctx.getTransform === 'function' ? Math.min(3, Math.max(1, Math.round(ctx.getTransform().a || 1))) : 1;
  const d = STAGES[s.stage], ch = d.ch, P = PALS[ch], seenT = fx.memo.t ?? -1;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
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
    y = Math.max(Y(0.17), y);
    for (let k = 0; k < 5 && rec.some((q) => t - q.t < 30 && Math.abs(q.x - x) < w * 0.16 && Math.abs(q.y - y) < (size + q.size) * 0.55); k++) y -= size * 0.9;
    rec.push({ x, y, t, size });
    if (rec.length > 14) rec.shift();
    fx.pop(x, y, str, col, size);
  };
  const since = (k: string) => {
    for (let i = s.events.length - 1; i >= 0; i--) if (s.events[i].k === k) return t - s.events[i].t;
    return 999;
  };
  const q2 = Math.min(2, sc);
  // 미리 굽기(끊김 줄이기): 결과·선물 화면에서 다음 장의 배경을 한 번, 판 중에는 이 판(또는 다음 판)에 나올 스티커를 프레임마다 하나씩
  {
    const rest = s.phase === 'result' || s.phase === 'pick', ns = rest && s.stage + 1 < STAGES.length ? s.stage + 1 : s.stage, nd = STAGES[ns];
    if (rest && s.pt === 24 && nd.ch !== ch) bakeBg(nd.ch, Math.round(w), Math.round(h), q2);
    else {
      const kinds = [...new Set([...nd.herds.join(''), ...(nd.boss?.summon.join('') ?? '')].map((c) => CHAR[c]))];
      if (nd.boss) kinds.push(nd.boss.k);
      const list: [K, number, number][] = [];
      for (const k of kinds) for (const mood of [M_IDLE, M_FLY, M_DIZZY, M_HURT, M_ANGRY]) for (let v = 0; v < (k === 'blob' ? BLOB_COL.length : k === 'golem' ? 2 : 1); v++) list.push([k, mood, v]);
      const key = 'wm' + ns;
      let i = fx.memo[key] ?? 0;
      for (let did = 0; i < list.length && did < (rest ? 3 : 1); i++) {
        const [k, mood, v] = list[i], px = Math.round(R(KD[k].r) * 1.1 * q2);
        if (!SPR.has(spriteKey(k, mood, v, px))) (sprite(k, mood, v, px), did++);
      }
      fx.memo[key] = i;
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.save();
  fx.begin(ctx);
  // ── 하늘 · 먼 산 · 가까운 언덕 · 길 (시차) ──
  const bg = bakeBg(ch, Math.round(w), Math.round(h), q2);
  ctx.drawImage(bg.sky, 0, 0, w, R(GY + 0.02));
  tile(ctx, bg.far, cam * w * 0.12, R(FAR_Y), w, R(FAR_H), w);
  // 구경꾼 새 (큰 순간엔 빙글)
  const cheer = (s.big && t - s.big.t < 70) || s.phase === 'result';
  for (let i = 0; i < 3; i++) {
    const bx = ((t * (0.35 + i * 0.08) + i * 150) % (w + 80)) - 40, by = R(0.2 + i * 0.07) + Math.sin(t * 0.05 + i) * R(0.012) - (cheer ? Math.abs(Math.sin(t * 0.25 + i)) * R(0.03) : 0);
    const flap = Math.sin(t * 0.3 + i * 2) * R(0.012), k = R(0.016);
    ctx.fillStyle = ['#ffffff', '#ffe36b', '#ffb0c8'][i];
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.4;
    ell(ctx, bx, by, k, k * 0.8);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx - k * 0.2, by - k * 0.2);
    ctx.quadraticCurveTo(bx - k * 1.2, by - k * 0.6 - flap, bx - k * 1.6, by - flap * 1.5);
    ctx.quadraticCurveTo(bx - k * 0.8, by + k * 0.2, bx - k * 0.2, by + k * 0.1);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff9a3d';
    ctx.beginPath();
    ctx.moveTo(bx + k * 0.9, by - k * 0.1);
    ctx.lineTo(bx + k * 1.4, by + k * 0.05);
    ctx.lineTo(bx + k * 0.9, by + k * 0.25);
    ctx.fill();
    ctx.fillStyle = OUT;
    ell(ctx, bx + k * 0.45, by - k * 0.2, k * 0.14, k * 0.18);
    ctx.fill();
  }
  tile(ctx, bg.mid, cam * w * 0.45, R(MID_Y), w * 1.5, R(MID_H), w);
  tile(ctx, bg.road, cam * w, R(ROAD_Y), w, R(HUD_B - ROAD_Y + 0.01), w);

  // ── 길 끝 표지 (꽃 아치) ──
  const endX = X(s.L - 0.04);
  if (endX < w + R(0.1)) {
    const k = R(0.09), ex = endX, ey = Y(GY + 0.005);
    ctx.lineWidth = Math.max(1.5, k * 0.06);
    ctx.strokeStyle = OUT;
    for (const sd of [-1, 1]) rr(ctx, ex + sd * k * 0.7 - k * 0.08, ey - k * 1.6, k * 0.16, k * 1.6, k * 0.05), (ctx.fillStyle = '#a06e44'), ctx.fill(), ctx.stroke();
    ctx.beginPath();
    ctx.arc(ex, ey - k * 1.5, k * 0.7, Math.PI, 0);
    ctx.lineWidth = k * 0.22;
    ctx.strokeStyle = P.lip;
    ctx.stroke();
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI + (i * Math.PI) / 6;
      ctx.fillStyle = P.flower[i % P.flower.length];
      ell(ctx, ex + Math.cos(a) * k * 0.7, ey - k * 1.5 + Math.sin(a) * k * 0.7, k * 0.12, k * 0.12);
      ctx.fill();
    }
  }

  // ── 구름 밭 ──
  for (let i = 0; i < s.clouds.length; i++) {
    const c = s.clouds[i], cx = X(c.x), cy = Y(GY + DZ * 0.5 - c.h) + R(0.02), k = R(c.w * 0.5);
    if (cx < -k * 1.5 || cx > w + k * 1.5) continue;
    const held = s.mons.some((m) => m.st === CAUGHT && m.cl === i), bob = Math.sin(t * 0.04 + i) * R(0.004);
    ctx.fillStyle = 'rgba(80,110,150,.18)';
    ell(ctx, cx, Y(GY + DZ * 0.5) + R(0.01), k * 0.8, R(0.012));
    ctx.fill();
    // 구름 밭: 아래는 보랏빛 몽실몽실, 위는 평평한 풀밭 (걸린 놈이 앉는 곳)
    const y0 = cy + bob;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(90,100,150,.6)';
    for (const [dx, dy, q] of [[-0.78, 0.16, 0.3], [-0.42, 0.28, 0.36], [0, 0.32, 0.4], [0.42, 0.28, 0.36], [0.78, 0.16, 0.3]] as [number, number, number][]) {
      ell(ctx, cx + dx * k, y0 + dy * k, q * k, q * k * 0.75);
      ctx.fillStyle = '#d9d4ff';
      ctx.fill();
      ctx.stroke();
    }
    rr(ctx, cx - k * 1.02, y0 - k * 0.12, k * 2.04, k * 0.4, k * 0.2);
    ctx.fillStyle = held ? '#fffbe8' : '#ffffff';
    ctx.fill();
    ctx.stroke();
    rr(ctx, cx - k * 0.95, y0 - k * 0.2, k * 1.9, k * 0.14, k * 0.07);
    ctx.fillStyle = '#9fe07a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,120,50,.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    for (let j = 0; j < 4; j++) {
      const fx0 = cx + (-0.7 + j * 0.46) * k, fy0 = y0 - k * 0.22;
      ctx.fillStyle = ['#ff7aa8', '#ffd84a', '#ffffff', '#c39af5'][(j + i) % 4];
      for (let q = 0; q < 5; q++) ell(ctx, fx0 + Math.cos(q * 1.256) * k * 0.05, fy0 + Math.sin(q * 1.256) * k * 0.05, k * 0.04, k * 0.04), ctx.fill();
    }
    if ((t + i * 17) % 50 < 25) {
      ctx.fillStyle = '#ffffff';
      starPath(ctx, cx + k * (0.6 - (i % 2) * 1.1), y0 - k * 0.5, R(0.008), 0.4);
      ctx.fill();
    }
  }

  // ── 선인장 ──
  for (const c of s.cacti) {
    const cx = X(c.x), cy = Y(GY + c.z), k = R(0.034);
    if (cx < -k * 2 || cx > w + k * 2) continue;
    const ouch = since('ouch') < 14 && s.events.some((e) => e.k === 'ouch' && t - e.t < 14 && Math.abs(e.x - c.x) < 0.08);
    ctx.save();
    ctx.translate(cx, cy);
    if (ouch) ctx.rotate(Math.sin(t * 1.2) * 0.08);
    ctx.lineWidth = Math.max(1.3, k * 0.08);
    ctx.strokeStyle = OUT;
    ctx.fillStyle = 'rgba(60,40,20,.2)';
    ell(ctx, 0, 0, k * 1.1, k * 0.3);
    ctx.fill();
    const body = lin(ctx, -k, 0, k, 0, [0, '#5fb84a'], [0.5, '#8fd86a'], [1, '#4a9a3e']);
    for (const [x0, y0, ww, hh] of [[-0.45, -2.6, 0.9, 2.6], [-1.25, -1.9, 0.55, 1.0], [0.72, -2.2, 0.55, 1.1]] as [number, number, number, number][]) rr(ctx, x0 * k, y0 * k, ww * k, hh * k, ww * k * 0.5), (ctx.fillStyle = body), ctx.fill(), ctx.stroke();
    rr(ctx, -1.25 * k, -1.2 * k, 0.9 * k, 0.4 * k, 0.2 * k);
    ctx.fill();
    ctx.stroke();
    rr(ctx, 0.35 * k, -1.4 * k, 0.9 * k, 0.4 * k, 0.2 * k);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 1;
    for (const [px, py] of [[-0.25, -2.2], [0.2, -1.7], [-0.15, -1.1], [0.25, -0.6]]) (ctx.beginPath(), ctx.moveTo(px * k, py * k), ctx.lineTo(px * k + k * 0.18, py * k - k * 0.08), ctx.stroke());
    for (let j = 0; j < 5; j++) ell(ctx, Math.cos(j * 1.256) * k * 0.2, -2.65 * k + Math.sin(j * 1.256) * k * 0.2, k * 0.16, k * 0.16), (ctx.fillStyle = '#ff7aa8'), ctx.fill();
    ctx.fillStyle = '#ffe36b';
    ell(ctx, 0, -2.65 * k, k * 0.12, k * 0.12);
    ctx.fill();
    ctx.restore();
  }

  // ── 용암 ──
  for (const l of s.lavas) {
    const age = t - l.t, a = Math.min(1, age / 4, (LAVA_T - age) / 14);
    if (a <= 0) continue;
    const lx = X(l.x), ly = Y(GY + DZ * 0.55), k = R(0.06);
    ctx.globalAlpha = a;
    ctx.fillStyle = radg(ctx, lx, ly, 0, k * 1.3, [0, '#fff07a'], [0.4, '#ff9a3d'], [1, 'rgba(230,70,30,0)']);
    ell(ctx, lx, ly, k * 1.3, k * 0.45);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    for (let j = 0; j < 3; j++) ell(ctx, lx + (j - 1) * k * 0.5, ly - Math.abs(Math.sin(t * 0.15 + j * 2)) * k * 0.5, k * 0.08, k * 0.08), ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ── 꽃길 (화면 왼쪽 끝 · 정령의 꽃밭) ──
  {
    const tr = t - s.trampT < 70, k = R(0.016);
    for (let i = 0; i < 6; i++) {
      const px = R(0.012 + (i % 3) * 0.022), py = Y(GY + 0.02 + Math.floor(i / 3) * 0.075 + (i % 2) * 0.02), flat = tr ? 0.4 : 1;
      ctx.strokeStyle = '#4a9a3e';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(px, py + k);
      ctx.lineTo(px + Math.sin(t * 0.05 + i) * k * 0.2, py - k * 0.6 * flat);
      ctx.stroke();
      ctx.fillStyle = P.flower[i % P.flower.length];
      for (let j = 0; j < 5; j++) ell(ctx, px + Math.cos(j * 1.256) * k * 0.75, py - k * 0.8 * flat + Math.sin(j * 1.256) * k * 0.75 * flat, k * 0.55, k * 0.55 * flat), ctx.fill();
      ctx.fillStyle = '#ffcf3a';
      ell(ctx, px, py - k * 0.8 * flat, k * 0.4, k * 0.4 * flat);
      ctx.fill();
    }
  }

  // ── 그림자 · 떨어질 자리 고리 (금빛이면 아래에 깔릴 놈이 있다) ──
  const groundList = s.mons.filter((m) => grounded(m));
  for (const m of s.mons) {
    if (!flying(m)) continue;
    const gx = X(m.x), gy = Y(GY + m.z), sz = Math.max(0.35, 1 - m.h * 1.1), u = R(m.r);
    ctx.fillStyle = `rgba(60,40,20,${0.12 + 0.18 * sz})`;
    ell(ctx, gx, gy, u * 1.05 * sz, u * 0.32 * sz);
    ctx.fill();
    if (!falling(m)) continue;
    const lx = landX(m), meteor = m.c >= C_MAX, r = sqR(s, m), under = groundList.some((o) => Math.abs(o.x - lx) <= r + o.r * 0.5), pul = 0.5 + 0.5 * Math.sin(t * 0.25 + m.id);
    // 높이 있을 때는 흐리게, 내려올수록 진하게 (어디에 떨어질지 = 어디를 치면 되는지)
    const near = clamp(1.25 - m.h * 1.9, 0.15, 1), col = meteor && near > 0.6 ? '255,90,60' : under ? '255,190,40' : '255,255,255';
    ctx.globalAlpha = near;
    const rr0 = R(r) * (0.92 + 0.08 * pul);
    ell(ctx, X(lx), gy, rr0, rr0 * 0.3);
    ctx.fillStyle = `rgba(${col},${(under ? 0.2 : 0.1) + 0.16 * near})`;
    ctx.fill();
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = 'rgba(75,48,32,.3)';
    ctx.stroke();
    ctx.setLineDash([R(0.022), R(0.016)]);
    ctx.lineDashOffset = -t * 0.8;
    ctx.strokeStyle = `rgba(${col},${0.75 + 0.25 * near})`;
    ctx.lineWidth = under || meteor ? 3 : 2.2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    // 떨어지는 줄 (어디를 치면 되나)
    if (m.st === AIR && m.h > 0.12) {
      ctx.strokeStyle = 'rgba(255,255,255,.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 6]);
      ctx.beginPath();
      ctx.moveTo(gx, Y(GY + m.z - m.h) + R(0.005));
      ctx.lineTo(X(lx), gy - R(0.01));
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // ── NEW 스포트라이트 ──
  const spotM = s.spot && s.phase === 'play' ? s.mons.find((m) => m.id === s.spot!.id && m.st === WALK) : undefined;
  if (spotM) {
    const u = R(spotM.r), pul = 0.5 + 0.5 * Math.sin(t * 0.2), sx = X(spotM.x), sy = Y(GY + spotM.z);
    ctx.fillStyle = `rgba(255,236,120,${0.3 + 0.2 * pul})`;
    ell(ctx, sx, sy, u * (1.8 + pul * 0.3), u * (0.6 + pul * 0.1));
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -t * 0.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── 몬스터 ──
  const drawMon = (m: Mon) => {
    const kd = KD[m.k], u = R(m.r), boss = !!kd.boss;
    let x = X(m.x), y = Y(GY + m.z - m.h);
    if (x < -u * 3 || x > w + u * 3) return;
    let mood = M_IDLE, rot = 0, sx = 1, sy = 1, alpha = 1;
    if (m.st === WALK) {
      const bob = Math.abs(Math.sin(t * 0.18 + m.ph));
      y -= bob * u * 0.12;
      sy = 1 + 0.05 * bob;
      sx = 1 - 0.03 * bob;
      // 무리끼리 투닥투닥 (구경거리 · 그림만): 가끔 폴짝 뛰어 옆 놈을 툭
      const hp = (t + m.seed) % 130;
      if (hp < 16) {
        const q = hp / 16;
        y -= Math.sin(q * Math.PI) * u * 0.55;
        rot = m.face * 0.22 * Math.sin(q * Math.PI);
        if (hp === 15 && fx.particles.length < 120) (puff(x + m.face * u * 0.8, Y(GY + m.z), '#ecd7a8', 3, 1.6, 2.2), m.seed % 3 === 0 && say(x + m.face * u, y - u * 1.6, '툭!', '#ffffff', 13));
      }
      if (t - m.hurtT < 20) mood = M_HURT;
      else if (hp < 26) mood = M_ANGRY;
    } else if (m.st === AIR || m.st === CAUGHT) {
      mood = M_FLY;
      rot = m.st === CAUGHT ? Math.sin(t * 0.15 + m.ph) * 0.15 : m.spin;
      const st = m.vh > 0 ? Math.min(0.15, m.vh * 0.06) : 0;
      sy = 1 + st;
      sx = 1 - st * 0.6;
    } else if (m.st === KO) {
      mood = M_DIZZY;
      const f = m.tm / KO_T;
      sy = m.how === 1 ? 0.45 : m.how === 2 || m.how === 3 ? 0.8 : 0.68 + 0.1 * Math.max(0, 1 - m.tm / 6);
      sx = m.how === 1 ? 1.25 : 1.1;
      alpha = f > 0.75 ? 1 - (f - 0.75) * 4 : 1;
      if (m.tm < 6) (sy *= 0.75 + 0.04 * m.tm), (sx *= 1.15 - 0.025 * m.tm);
    } else if (m.st === FLEE) {
      mood = M_SMUG;
      y -= Math.abs(Math.sin(t * 0.4 + m.ph)) * u * 0.3;
      alpha = Math.max(0, 1 - m.tm / 50);
    } else if (m.st === TWIST) {
      mood = M_FLY;
      rot = Math.sin(t * 0.5) * 0.2;
    } else if (boss) {
      mood = t - m.hurtT < 26 ? M_HURT : s.sway / Math.max(1, s.swayNeed) > 0.6 ? M_DIZZY : M_ANGRY;
      if (t - m.hurtT < 26) rot = Math.sin((t - m.hurtT) * 0.6) * 0.14 * (1 - (t - m.hurtT) / 26);
      if (m.st === UPHEAVE) (mood = M_FLY), (rot = m.spin);
      const stomp = Math.max(0, Math.sin(t * 0.06)) ** 8;
      if (m.st === BOSS) (y -= stomp * u * 0.06), (sy = 1 - stomp * 0.03);
    }
    if (m.st === WALK || m.st === BOSS || m.st === TWIST) {
      ctx.fillStyle = 'rgba(60,40,20,.22)';
      ell(ctx, x, Y(GY + m.z), u * 1.05, u * 0.3);
      ctx.fill();
    }
    if (m.st === TWIST) {
      // 모래 회오리 기둥
      const H2 = R(0.34), age = m.tm;
      for (let i = 0; i < 7; i++) {
        const yy = Y(GY + m.z) - (H2 * i) / 6, rw = R(0.03 + i * 0.022) * (0.9 + 0.1 * Math.sin(t * 0.3 + i));
        ctx.strokeStyle = `rgba(232,196,130,${0.75 - i * 0.06})`;
        ctx.lineWidth = R(0.012);
        ctx.beginPath();
        ctx.ellipse(x + Math.sin(t * 0.2 + i) * R(0.01), yy, rw, rw * 0.3, 0, ((t * 0.4 + i) % TAU), ((t * 0.4 + i) % TAU) + 4.2);
        ctx.stroke();
      }
      if (age % 3 === 0) puff(x + (hsh(t) - 0.5) * R(0.2), Y(GY + m.z) - R(0.02), '#f0d08a', 1, 2, 2.5);
    }
    if (m.st === AIR && m.vh > 0.9) {
      // 붕! 솟는 줄
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.8, (m.vh - 0.9) * 0.8)})`;
      ctx.lineWidth = 2;
      for (const dx of [-0.6, 0, 0.6]) (ctx.beginPath(), ctx.moveTo(x + dx * u, y + u * 0.2), ctx.lineTo(x + dx * u, y + u * (0.6 + m.vh * 0.5 + Math.abs(dx) * -0.3)), ctx.stroke());
    }
    if (m.st === AIR && m.c >= C_MAX) {
      // 별똥별: 불꼬리
      for (let i = 4; i >= 1; i--) {
        ell(ctx, x - m.vx * R(0.02) * i, y - u - Math.min(0.4, -m.vh) * R(0.06) * i * -1 - R(0.018) * i, u * (1.1 - i * 0.16), u * (1.1 - i * 0.16));
        ctx.fillStyle = i % 2 ? `rgba(255,120,50,${0.5 - i * 0.08})` : `rgba(255,214,90,${0.6 - i * 0.1})`;
        ctx.fill();
      }
      ctx.fillStyle = radg(ctx, x, y - u, u * 0.5, u * 2, [0, 'rgba(255,200,90,.5)'], [1, 'rgba(255,120,50,0)']);
      ell(ctx, x, y - u, u * 2, u * 2);
      ctx.fill();
    }
    const v = m.k === 'blob' ? blobV(m, ch) : m.k === 'golem' && m.hp <= 1 ? 1 : 0;
    const spr = sprite(m.k, mood, v, Math.round(u * 1.1 * q2));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y - u);
    if (rot) ctx.rotate(rot);
    ctx.translate(0, u);
    ctx.scale(sx * (m.face > 0 && m.k !== 'turtle' && m.k !== 'bomb' && m.k !== 'scorp' ? -1 : 1) * (m.face > 0 && (m.k === 'turtle' || m.k === 'bomb') ? -1 : 1), sy);
    stamp(ctx, spr, u);
    ctx.restore();
    if (m.k === 'mole' && m.st === AIR && m.vh < 0) {
      ctx.save();
      ctx.translate(x, y - u);
      umbrella(ctx, u, t + m.id * 7);
      ctx.restore();
    }
    // 기절: 머리 위 빙글 별
    if (m.st === KO || (boss && s.sway / Math.max(1, s.swayNeed) > 0.6 && m.st === BOSS)) {
      for (let i = 0; i < 3; i++) {
        const a = t * 0.15 + (i * TAU) / 3, rx = u * 0.9, sy0 = y - u * (m.st === KO ? 1.5 : 2.6);
        starPath(ctx, x + Math.cos(a) * rx, sy0 + Math.sin(a) * rx * 0.3, Math.max(3, u * 0.22));
        ctx.fillStyle = '#ffe36b';
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    // 우는 소리 (공중)
    if ((m.st === AIR || m.st === CAUGHT) && (m.id + Math.floor(t / 40)) % 5 === 0 && u > 8) {
      font(0.034, 900);
      text(m.st === CAUGHT ? '살려줘~' : kd.heavy ? '으어어' : '으아아', x + u * 1.2, y - u * 2.4, '#ffffff', OUT, 3);
    }
  };
  const ground = s.mons.filter((m) => !flying(m) && m.st !== UPHEAVE && m.st !== BOSS).sort((a, b) => a.z - b.z || a.id - b.id);
  for (const m of ground) drawMon(m);
  // NEW 이름표
  if (spotM && t - s.spot!.t < 240) {
    const u = R(spotM.r), sx = X(spotM.x), sy = Y(GY + spotM.z) - u * 2.6 - R(0.03);
    font(0.036, 900);
    const label = `NEW ${KD[spotM.k].name}`, lw2 = ctx.measureText(label).width + R(0.04);
    rr(ctx, sx - lw2 / 2, sy - R(0.024), lw2, R(0.048), R(0.024));
    ctx.fillStyle = '#ff3b30';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(label, sx, sy + 1, '#ffffff', '', 0);
  }
  // ── 대장이 솟는다: 땅 기둥 ──
  const bossM = s.mons.find((m) => isBoss(m));
  if (bossM && bossM.st === UPHEAVE) {
    const age = bossM.tm, ph = age <= UP_LIFT ? bossM.h : age - UP_LIFT < 18 ? 0.5 : Math.max(0, 0.5 * (1 - (age - UP_LIFT - 18) / 22));
    const bx = X(bossM.x), by = Y(GY + bossM.z), hh = ph * w, cw = R(bossM.r * 1.1);
    if (hh > 2) {
      ctx.beginPath();
      ctx.moveTo(bx - cw * 1.4, by + R(0.01));
      ctx.lineTo(bx - cw, by - hh);
      ctx.lineTo(bx + cw, by - hh);
      ctx.lineTo(bx + cw * 1.4, by + R(0.01));
      ctx.closePath();
      ctx.fillStyle = lin(ctx, bx - cw, 0, bx + cw, 0, [0, '#8a5a34'], [0.5, '#c08a54'], [1, '#7a4c2a']);
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = P.verge;
      rr(ctx, bx - cw * 1.05, by - hh - R(0.012), cw * 2.1, R(0.024), R(0.012));
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(70,40,20,.35)';
      ctx.lineWidth = 2;
      for (let i = 1; i < 5; i++) (ctx.beginPath(), ctx.moveTo(bx - cw, by - (hh * i) / 5), ctx.lineTo(bx + cw, by - (hh * i) / 5 + R(0.006)), ctx.stroke());
    }
  }
  // ── 흙 주먹 ──
  for (const f of s.fists) {
    const age = s.wt - f.t + 2, fxp = X(f.x), fyp = Y(GY + f.z);
    if (age < 20) {
      // 갈라진 땅
      ctx.strokeStyle = `rgba(90,55,30,${0.7 * (1 - age / 20)})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + f.t, L = R(0.05 + 0.04 * hsh(f.t + i)) * f.k;
        ctx.beginPath();
        ctx.moveTo(fxp, fyp);
        ctx.lineTo(fxp + Math.cos(a) * L * 0.5, fyp + Math.sin(a) * L * 0.12);
        ctx.lineTo(fxp + Math.cos(a + 0.3) * L, fyp + Math.sin(a + 0.3) * L * 0.2);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(80,50,25,${0.5 * (1 - age / 20)})`;
      ell(ctx, fxp, fyp, R(0.07) * f.k, R(0.02) * f.k);
      ctx.fill();
    }
    drawFist(ctx, fxp, fyp, R(0.08) * f.k, age, f.combo, f.small);
  }
  // 대장 (주먹보다 앞) · 머리 위 과녁 (떨어지는 졸개가 있을 때)
  if (bossM && bossM.st === BOSS) {
    drawMon(bossM);
    if (s.bossOn >= 0 && s.mons.some((m) => falling(m))) {
      const bx = X(bossM.x), by = Y(GY + bossM.z) - R(bossM.r) * 2.5, pul = 0.5 + 0.5 * Math.sin(t * 0.2);
      ctx.strokeStyle = `rgba(255,236,120,${0.7 + 0.3 * pul})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -t * 0.6;
      ell(ctx, bx, by, R(bossM.r) * (0.9 + 0.08 * pul), R(bossM.r) * 0.32);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffe36b';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const ay = by - R(0.05) - pul * R(0.012);
      ctx.moveTo(bx, ay + R(0.035));
      ctx.lineTo(bx - R(0.022), ay);
      ctx.lineTo(bx - R(0.009), ay);
      ctx.lineTo(bx - R(0.009), ay - R(0.03));
      ctx.lineTo(bx + R(0.009), ay - R(0.03));
      ctx.lineTo(bx + R(0.009), ay);
      ctx.lineTo(bx + R(0.022), ay);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  // 하늘의 놈들 (가장 위)
  for (const m of s.mons) if (flying(m) || m.st === UPHEAVE) drawMon(m);
  // 화면 위로 넘어간 놈: 화살표
  for (const m of s.mons) {
    if (!flying(m) && m.st !== UPHEAVE) continue;
    const y = Y(GY + m.z - m.h) - R(m.r) * 2;
    if (y > Y(0.12)) continue;
    const x = X(m.x);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath();
    ctx.moveTo(x, Y(0.118));
    ctx.lineTo(x - R(0.015), Y(0.14));
    ctx.lineTo(x + R(0.015), Y(0.14));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // ── 흙 정령 (땅속에서 얼굴을 내밀고) ──
  {
    const tx = s.sx * w;
    fx.memo.sx = fx.memo.sx === undefined ? tx : fx.memo.sx + (tx - fx.memo.sx) * 0.18;
    const k = R(0.058), px = fx.memo.sx, moodAge = t - s.moodT;
    let mood = moodAge < 40 ? s.mood : 0;
    if (s.big && t - s.big.t < 60) mood = 3;
    if (s.phase === 'result' || (s.phase === 'end' && s.won)) mood = 3;
    if (s.phase === 'end' && !s.won) mood = 2;
    const pop = moodAge < 10 && s.mood !== 2 ? Math.sin((moodAge / 10) * Math.PI) * k * 0.35 : 0;
    const py = Y(SOIL + 0.03) - pop + Math.sin(t * 0.06) * R(0.003);
    // 구멍
    ctx.fillStyle = '#3e2414';
    ell(ctx, px, Y(SOIL + 0.06), k * 1.25, k * 0.38);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.rect(px - k * 2.5, py - k * 4, k * 5, Y(SOIL + 0.06) - (py - k * 4));
    ctx.clip();
    drawSpirit(ctx, px, py, k, s.lv, t, mood);
    ctx.restore();
    // 구멍 앞 흙더미 · 손
    ctx.fillStyle = P.soil[0];
    ctx.strokeStyle = 'rgba(60,35,20,.6)';
    ctx.lineWidth = 1.5;
    ell(ctx, px, Y(SOIL + 0.068), k * 1.45, k * 0.3);
    ctx.fill();
    ctx.stroke();
    const up = mood === 1 && moodAge < 16 ? 1 : 0;
    spiritHand(ctx, px - k * 0.95, Y(SOIL + 0.058), k, 0);
    spiritHand(ctx, px + k * 0.95, Y(SOIL + 0.058), k, up);
    if (s.combo >= 2 && t - s.comboT < 140 && s.phase === 'play') {
      font(0.036, 900);
      text(`공중 연속 ${s.combo}`, px, py - k * (s.lv >= 7 ? 2.9 : 2.2), s.combo >= 4 ? '#ffd23f' : '#ffffff', OUT, 4);
    }
  }

  // ── 첫 톡 손가락 (1판, 아직 안 쳤을 때) ──
  if (s.phase === 'play' && s.stage === 0 && !s.started && s.herds.length) {
    const hx = X(s.herds[0].x), hy = Y(GY + DZ * 0.55), press = Math.max(0, Math.sin(t * 0.14)), rf = R(fistR(s));
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(1, 0.28);
    ctx.beginPath();
    ctx.arc(0, 0, rf * (0.95 + 0.05 * press), 0, TAU);
    ctx.fillStyle = `rgba(255,236,150,${0.18 + 0.12 * press})`;
    ctx.fill();
    ctx.setLineDash([R(0.024), R(0.018)]);
    ctx.lineDashOffset = -t * 0.6;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3 / 0.28 * 0.28;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    drawHand(ctx, hx + R(0.02), hy - R(0.02), R(0.085), press);
    font(0.05, 900);
    text('톡!', hx + R(0.11), hy - R(0.03), '#ffffff', OUT, 4);
  }

  // ── 방금 일어난 일: 소리 · 흙먼지 · 흔들림 · 글자 (한 번만) ──
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x), ey = Y(e.y);
    switch (e.k) {
      case 'stage': fx.sound('ding', 1, 0.6); break;
      case 'cool': fx.sound('tick', 0.7, 0.4); puff(ex, Y(GY + DZ * 0.5), '#d9b878', 2, 1.5, 2); break;
      case 'punch': case 'punch2': {
        const n = e.n, big = Math.min(1, n / 8), small = e.k === 'punch2';
        fx.sound('thud', Math.max(0.55, 1.05 - big * 0.45) * (small ? 1.3 : 1), 0.7 + big * 0.8);
        if (n) fx.sound('crack', 1.1 - big * 0.3, 0.5 + big * 0.5);
        else fx.sound('whoosh', 0.8, 0.5);
        if (e.x2 > 0 && n) fx.sound('zap', 0.8 + Math.min(8, e.x2) * 0.12, 0.5);
        if (e.text === 'tink') (fx.sound('ding', 0.6, 0.6), say(ex, ey - R(0.2), '끄떡없다!', '#ffd0c8', 15));
        fx.kick(small ? 2 : 3 + Math.min(9, n * 1.2));
        puff(ex, ey, '#c99360', 8 + Math.min(10, n), 4 + big * 2, 3.2);
        puff(ex, ey, '#f3dfb0', 5, 3, 2.6);
        fx.ring(ex, ey, n ? '#fff3c4' : 'rgba(255,255,255,.6)', R(0.09 + 0.06 * big), 4);
        if (!small) {
          font(0.05, 900);
          if (!n) say(ex, ey - R(0.18), '헛방~', '#f3dfb0', 14);
          else if (!e.x2) say(ex, ey - R(0.34), n >= 5 ? '콰쾅!' : '쾅!', n >= 5 ? '#ffd23f' : '#ffffff', Math.round(R(0.05 + 0.02 * big)));
        }
        break;
      }
      case 'combo':
        fx.sound('chime', 0.9 + Math.min(10, e.n) * 0.08, 0.6);
        say(ex, ey, `연속 ${e.n}!`, e.n >= 4 ? '#ffd23f' : '#bff3ff', Math.round(R(0.042 + Math.min(5, e.n) * 0.004)));
        break;
      case 'land': {
        const k = e.text as K, heavy = KD[k]?.heavy, n = e.n;
        fx.sound('thud', heavy ? 0.6 : 1.4 - Math.min(0.5, n * 0.08), heavy ? 1.2 : 0.55 + Math.min(0.6, n * 0.12));
        if (n) fx.sound('pop', 0.9 + Math.min(8, n) * 0.09, 0.8);
        if (e.x2) (fx.sound('thud', 0.5, 1.1), fx.kick(6), fx.ring(ex, ey, '#f3dfb0', R(0.16), 5));
        puff(ex, ey, '#e8cfa0', heavy ? 10 : 4 + n, heavy ? 4 : 2.6, 2.8);
        if (n || heavy) fx.kick(heavy ? 7 : 2 + n);
        if (n) say(ex, ey - R(0.1), n >= 3 ? `쿵! ${n}마리 납작` : '쿵! 납작', '#fff3c4', n >= 3 ? 17 : 14);
        else if (heavy) say(ex, ey - R(0.1), '쿵!', '#fff3c4', 16);
        break;
      }
      case 'coin': {
        const big = e.n >= 10;
        fx.sound('coin', 1 + Math.min(10, e.n) * 0.04, big ? 0.7 : 0.4);
        puff(ex, ey, '#ffd84a', big ? 6 : 3, 2.6, 2.4);
        puff(ex, ey, KCOL[e.text as K] ?? '#ffffff', 3, 2.2, 2.2);
        if (e.x2 === 4) (fx.sound('clear', 0.8, 1), puff(ex, ey, '#ffd84a', 20, 6, 3.4));
        say(ex, ey - R(0.02), `+${e.n}`, big ? '#ffd23f' : '#fff6c8', big ? 16 : 13);
        break;
      }
      case 'crack': fx.sound('crack', 1.3, 0.8); puff(ex, ey, '#c8cfd8', 6, 3, 2.6); say(ex, ey - R(0.06), '쩍!', '#e6edf5', 16); break;
      case 'shatter': fx.sound('crack', 0.7, 1.2); fx.sound('thud', 0.8, 1); fx.kick(9); puff(ex, ey, '#c8cfd8', 16, 6, 3.4); fx.ring(ex, ey, '#e6edf5', R(0.19), 5); say(ex, ey - R(0.08), '와장창!', '#ffffff', 19); break;
      case 'blast': fx.sound('thud', 0.6, 1.3); fx.sound('zap', 0.6, 0.8); fx.kick(11); fx.blink('#fff3c4', 0.3); puff(ex, ey, '#ff9a3d', 14, 6, 3.4); puff(ex, ey, '#ffe36b', 10, 5, 3); fx.ring(ex, ey, '#ffb070', R(0.18), 6); say(ex, ey - R(0.08), '펑!', '#ffd23f', 21); break;
      case 'twist': fx.sound('whoosh', 0.6, 1.2); fx.sound('swell', 0.8, 0.7); say(ex, ey - R(0.14), '회오리!', '#fff3c4', 18); break;
      case 'suck': fx.sound('whoosh', 1.5, 0.4); break;
      case 'meteor': fx.sound('zap', 1.3, 0.6); puff(ex, ey, '#ffb070', 6, 3, 2.6); say(ex, ey - R(0.05), e.n > 1 ? `별똥별 ${e.n}!` : '별똥별!', '#ffb070', 16); break;
      case 'fling': fx.sound('whoosh', 0.5, 1.3); fx.sound('swell', 1.4, 0.8); puff(ex, ey, '#ffe36b', 12, 5, 3); break;
      case 'caught': fx.sound('swell', 1.6, 0.4); puff(ex, ey, '#ffffff', 4, 2, 2.6); break;
      case 'uncaught': fx.sound('whoosh', 1.2, 0.35); break;
      case 'boing': fx.sound('boing', 1 + e.n * 0.2, 0.8); puff(ex, ey, '#ffffff', 3, 2, 2.2); say(ex, ey - R(0.08), '통!', '#bff3ff', 15); break;
      case 'ouch': fx.sound('boing', 1.7, 0.7); fx.sound('tick', 2, 0.5); say(ex, ey, '앗!', '#ffd0c8', 17); break;
      case 'lava': fx.sound('splash', 0.7, 0.7); puff(ex, ey, '#ff9a3d', 6, 3, 2.6); break;
      case 'bonk': fx.sound('thud', 0.7, 1.2); fx.sound('boing', 0.6, 0.9); fx.kick(6 + e.n * 2); puff(ex, ey, '#ffe36b', 8, 4, 3); say(ex, ey - R(0.04), e.n >= 3 ? `휘청휘청! +${e.n}` : `휘청! +${e.n}`, '#ffe36b', 17 + e.n); break;
      case 'upheave': fx.sound('swell', 0.6, 1.3); fx.sound('thud', 0.45, 1.5); fx.sound('crack', 0.6, 1.2); fx.blink('#fff3c4', 0.5); fx.kick(18); puff(ex, ey, '#c99360', 30, 7, 3.6); fx.ring(ex, ey, '#ffe36b', R(0.4), 7); break;
      case 'bossdown': fx.sound('thud', 0.4, 1.5); fx.kick(16); puff(ex, ey, '#e8cfa0', 24, 6, 3.4); break;
      case 'roar': fx.sound('swell', 0.7, 1); fx.kick(5); say(ex, ey, '크아앙!', '#ffd0c8', 19); break;
      case 'leap': fx.sound('boing', 0.6, 1); say(ex, ey - R(0.1), '펄쩍!', '#ffffff', 16); break;
      case 'summon': fx.sound('swell', 1, 0.7); say(ex, ey, '졸개들아!', '#ffd0c8', 16); break;
      case 'trample': fx.sound('tick', 0.6, 0.5); puff(R(0.03), Y(GY + 0.06), P.flower[0], 6, 3, 2.6); puff(R(0.03), Y(GY + 0.06), '#7ccb55', 4, 2.5, 2.2); say(R(0.16), Y(GY - 0.12), '꽃을 밟았다!', '#ffd0c8', 15); break;
      case 'heart': fx.sound('fail', 0.8, 1); fx.blink('#ff3b30', 0.3); say(R(0.2), Y(GY - 0.2), '하트 -1', '#ff8a7a', 18); break;
      case 'star3': fx.sound('coin', 1.2, 1); puff(w / 2, Y(0.3), '#ffd84a', 14, 5.5, 3.2); break;
      case 'clear':
        fx.sound('clear', 1, 1);
        puff(w * 0.3, Y(0.7), '#ffd84a', 16, 6, 3.2);
        puff(w * 0.7, Y(0.7), '#9ff0ff', 16, 6, 3.2);
        break;
      case 'pickopen': fx.sound('swell', 1.1, 0.9); break;
      case 'perk': fx.sound('coin', 1, 1); fx.sound('chime', 1.1, 0.9); puff(e.x * w, Y(0.8), '#ffe36b', 16, 5, 3.2); fx.ring(e.x * w, Y(0.8), '#ffe36b', R(0.2), 5); break;
      case 'end': fx.sound(e.n ? 'clear' : 'fail', 0.9, 1); break;
    }
  }
  if (s.big && (fx.memo.bigT ?? -1) !== s.big.t && s.big.t > seenT) (fx.memo.bigT = s.big.t), fx.sound('chime', 1 + Math.min(8, s.big.n) * 0.04, 1), fx.blink('#fff6c8', 0.22), fx.kick(7);
  fx.memo.t = t;
  ctx.restore();
  drawHud(ctx, s, w, h);
}

/** 위·아래 띠와 띠 위에 뜨는 것(시작 띠 · 큰 순간 · 결과 · 둘 중 하나 · 끝) */
function drawHud(ctx: C2, s: GPState, w: number, h: number) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const sc = typeof ctx.getTransform === 'function' ? Math.min(3, Math.max(1, Math.round(ctx.getTransform().a || 1))) : 1;
  const d = STAGES[s.stage], q2 = Math.min(2, sc);
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  const text = (str: string, x: number, y: number, fill: string, stroke = '', lw = 0) => {
    ctx.lineJoin = 'round';
    if (lw > 0) (ctx.lineWidth = lw), (ctx.strokeStyle = stroke), ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  };
  const INK = '#4b3020', MUTED = '#a08a70', CREAM = '#fff6dc';
  ctx.textBaseline = 'middle';
  // ── 위 띠: 판 · 이름 · 하트 · 별 · 정령 레벨 ──
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
  font(d.name.length > 6 ? 0.039 : 0.043, 900);
  text(d.name, X(0.115), Y(0.052), INK);
  const nw = ctx.measureText(d.name).width;
  font(0.034, 700);
  text(`/ ${STAGES.length}`, X(0.115) + nw + R(0.012), Y(0.054), MUTED);
  for (let i = 0; i < 3; i++) {
    heartPath(ctx, X(0.585 + i * 0.05), Y(0.05), R(0.017));
    ctx.fillStyle = i < s.hearts ? '#ff4d5e' : '#e6d6bc';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  starPath(ctx, X(0.74), Y(0.049), R(0.022));
  ctx.fillStyle = '#ffc93c';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  font(0.04, 900);
  text(String(s.stars), X(0.768), Y(0.053), INK);
  drawSpirit(ctx, X(0.865), Y(0.056), R(0.019), Math.min(s.lv, 6), 0, 0);
  font(0.036, 900);
  text(`Lv${s.lv}`, X(0.895), Y(0.055), '#8a5a34');

  // ── 길 진행 · 대장 휘청 눈금 ──
  const boss = s.mons.find((m) => isBoss(m));
  if (s.phase === 'play') {
    const bx = X(0.06), bw = R(0.88), by = Y(0.112), bh = R(0.018);
    if (boss && s.bossOn >= 0) {
      const q = clamp(s.sway / Math.max(1, s.swayNeed), 0, 1), by2 = Y(0.118), bh2 = R(0.03);
      rr(ctx, X(0.2) - 2, by2 - 2, R(0.6) + 4, bh2 + 4, bh2);
      ctx.fillStyle = INK;
      ctx.fill();
      rr(ctx, X(0.2), by2, R(0.6), bh2, bh2);
      ctx.fillStyle = '#6b5340';
      ctx.fill();
      if (q > 0) {
        rr(ctx, X(0.2), by2, Math.max(bh2, R(0.6) * q), bh2, bh2);
        ctx.fillStyle = lin(ctx, 0, by2, 0, by2 + bh2, [0, '#fff3a8'], [1, '#f5b921']);
        ctx.fill();
      }
      ctx.textAlign = 'center';
      font(0.034, 900);
      if (!(s.big && t - s.big.t < 62)) text(`${KD[boss.k].name} 휘청 ${s.sway}/${s.swayNeed}`, w / 2, by2 + bh2 / 2 + 0.5, INK, 'rgba(255,255,255,.75)', 3);
    } else {
      const p = clamp(s.cam / Math.max(0.01, s.L - 1), 0, 1);
      rr(ctx, bx, by, bw, bh, bh / 2);
      ctx.fillStyle = 'rgba(75,48,32,.35)';
      ctx.fill();
      rr(ctx, bx, by, Math.max(bh, bw * p), bh, bh / 2);
      ctx.fillStyle = '#8fe06a';
      ctx.fill();
      ctx.strokeStyle = 'rgba(75,48,32,.6)';
      ctx.lineWidth = 1.2;
      rr(ctx, bx, by, bw, bh, bh / 2);
      ctx.stroke();
      // 끝 꽃
      for (let j = 0; j < 5; j++) ell(ctx, bx + bw + Math.cos(j * 1.256) * R(0.009), by + bh / 2 + Math.sin(j * 1.256) * R(0.009), R(0.007), R(0.007)), (ctx.fillStyle = '#ff7aa8'), ctx.fill();
      drawSpirit(ctx, bx + bw * p, by + bh / 2, R(0.014), 1, t, 0);
    }
  }

  // ── 아래 띠: 별 셋 · 한 줄 도움말 · 도감 ──
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, Y(HUD_B), w, h - Y(HUD_B));
  ctx.fillStyle = '#e3c48c';
  ctx.fillRect(0, Y(HUD_B), w, 2);
  const words = STAR_WORDS(s), res = s.phase === 'result';
  const state = [res ? 1 : 0, s.lost ? -1 : res ? 1 : 0, s.best >= d.n ? 1 : res || s.sealed ? -1 : 0];
  font(0.035, 800);
  const prog = s.best > 0 && s.best < d.n && !res && !s.sealed ? ` ${s.best}/${d.n}` : '';
  const labels = words.map((q, i) => q + (i === 2 ? prog : ''));
  const gap = R(0.012), pad = Math.min(R(0.07), (w - R(0.03) - gap * 2 - labels.reduce((a, q) => a + ctx.measureText(q).width, 0)) / 3);
  const ws = labels.map((q) => ctx.measureText(q).width + pad), total = ws.reduce((a, c) => a + c, 0) + gap * 2;
  let cx = (w - total) / 2;
  labels.forEach((q, i) => {
    const cw = ws[i], cy = Y(1.348), on = state[i] > 0, off = state[i] < 0;
    const pulse = i === 2 && on && t - (fx.memo.s3 ?? -99) < 30 ? 1 + 0.1 * Math.sin((t - (fx.memo.s3 ?? 0)) * 0.5) : 1;
    if (i === 2 && on && fx.memo.s3st !== s.stage) (fx.memo.s3 = t), (fx.memo.s3st = s.stage);
    ctx.save();
    ctx.translate(cx + cw / 2, cy);
    ctx.scale(pulse, pulse);
    rr(ctx, -cw / 2, -R(0.027), cw, R(0.054), R(0.027));
    ctx.fillStyle = on ? '#ffe9a0' : off ? '#efe4cf' : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = on ? '#e0a020' : off ? '#d6c6a8' : '#c9a878';
    ctx.lineWidth = on ? 2 : 1.4;
    ctx.stroke();
    starPath(ctx, -cw / 2 + pad * 0.42, -0.5, R(0.017));
    ctx.fillStyle = on ? '#ffb800' : off ? '#d6c6a8' : '#e9d9b8';
    ctx.fill();
    ctx.textAlign = 'left';
    font(0.035, 800);
    text(q, -cw / 2 + pad * 0.76, 0.5, off ? '#b8a688' : INK);
    if (off) (ctx.fillStyle = '#b8a688'), ctx.fillRect(-cw / 2 + pad * 0.72, 0, cw - pad, 1.5);
    ctx.restore();
    cx += cw + gap;
  });
  ctx.textAlign = 'center';
  let tip = `${d.name}: ${d.news}`;
  const anyFalling = s.mons.some((m) => falling(m));
  if (s.phase === 'pick') tip = '길 위의 큰 돌상 둘 중 하나를 톡!';
  else if (s.phase === 'result') tip = s.newDex.length ? `새 친구 ${KD[s.newDex[s.newDex.length - 1]].name}: ${KD[s.newDex[s.newDex.length - 1]].line}` : s.got === 3 ? '별 셋! 판 점수가 네 배' : '별이 많을수록 판 점수가 곱해져요';
  else if (s.phase === 'end') tip = s.won ? '모든 길을 쓸었어요!' : '누르면 다시 해요';
  else if (s.stage === 0 && !s.started) tip = '땅을 톡! 흙 주먹이 쾅 솟아 하늘로 붕';
  else if (boss && s.bossOn >= 0 && s.upT < 0) tip = `${KD[boss.k].name}는 안 떠요 — 떨어지는 졸개를 머리 위로!`;
  else if (s.stage === 0 && s.tapN < 4) tip = anyFalling ? '떨어지는 놈 그림자 근처를 또 톡 — 더 높이!' : '무리 가장자리를 치면 옆 무리 위로 떨어져요';
  else if (anyFalling && s.stage < 3 && s.best < d.n) tip = '금빛 고리 아래 무리를 같이 톡 — 한 주먹에 많이!';
  font(0.036, 800);
  text(tip, w / 2, Y(1.402), INK);
  font(0.034, 700);
  const perks = PERKS.map((p, i) => (s.perk[i] ? p[s.perk[i] - 1].name : '')).filter(Boolean);
  text(`흙 정령 Lv${s.lv} · 도감 ${s.dex.length}/${DEX.length}${perks.length ? ' · ' + perks.join(' · ') : ''}`, w / 2, Y(1.452), MUTED);

  // ── 판 시작 띠 (NEW 한 줄) ──
  if (s.banner && s.phase === 'play' && !(s.big && s.big.t >= s.banner.t)) {
    const age = t - s.banner.t, T = 190;
    if (age < T) {
      const a = Math.min(1, age / 10, (T - age) / 14), slide = (1 - Math.min(1, age / 10)) * R(0.05), by = Y(0.15) - slide;
      ctx.globalAlpha = clamp(a, 0, 1);
      rr(ctx, X(0.05), by, R(0.9), R(0.112), R(0.03));
      ctx.fillStyle = 'rgba(255,250,235,.96)';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      font(0.039, 900);
      const isNew = s.stage > 0, hw = ctx.measureText(s.banner.head).width, nw2 = ctx.measureText(d.name).width, pill = isNew ? R(0.105) : 0, gap2 = R(0.014);
      const tot = hw + (isNew ? gap2 + pill + gap2 + nw2 : 0);
      let bx0 = w / 2 - tot / 2;
      ctx.textAlign = 'left';
      text(s.banner.head, bx0, by + R(0.033), '#d9480f');
      if (isNew) {
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
      }
      ctx.textAlign = 'center';
      font(0.035, 800);
      text(s.banner.sub, w / 2, by + R(0.081), INK);
      ctx.globalAlpha = 1;
    }
  }

  // ── 큰 순간 띠 ──
  if (s.big && t - s.big.t < 62 && s.phase !== 'end') {
    const age = t - s.big.t, pop = age < 7 ? 1.4 - 0.4 * (age / 7) : 1 + 0.03 * Math.sin(age * 0.5), a = Math.min(1, (62 - age) / 14), n = s.big.n;
    const by = Y(0.3), size = 0.058 + Math.min(0.016, n * 0.0012);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, by);
    ctx.rotate(-0.05);
    ctx.save();
    ctx.scale(1, 0.5);
    burstPath(ctx, 0, 0, R(0.33) * Math.min(1.15, pop), 18, 0.8, age * 0.02);
    ctx.fillStyle = 'rgba(255,244,170,.92)';
    ctx.fill();
    ctx.strokeStyle = '#ff8a3d';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    font(size, 900);
    ctx.save();
    ctx.scale(pop, pop);
    text(s.big.text, 0, -R(0.012), '#ff5a2e', '#ffffff', 6);
    ctx.restore();
    font(0.038, 900);
    const sub = s.big.star ? `${s.big.sub} 별 셋째!` : s.big.sub;
    text(sub, 0, R(0.04), '#b06a00', '#ffffff', 4);
    if (s.big.star) {
      const sw = ctx.measureText(sub).width, k = R(0.022) * (1 + 0.15 * Math.sin(age * 0.5));
      starPath(ctx, sw / 2 + k * 1.3, R(0.04), k);
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
    const cx0 = X(0.06), cy0 = Y(0.17) - slide, cw = R(0.88), chh = R(0.6);
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
    text(s.won ? '모든 길을 쓸었다!' : `${s.stage + 1}판 깼다!`, w / 2, cy0 + R(0.025), '#ffffff');
    for (let i = 0; i < 3; i++) {
      const at0 = 12 + i * 12, sx0 = X(0.23 + i * 0.27), sy0 = cy0 + R(0.125), on = s.starOk[i] && pt >= at0, pop = on ? 1 + Math.max(0, 1 - (pt - at0) / 8) * 0.6 : 1;
      starPath(ctx, sx0, sy0, R(0.052) * pop);
      ctx.fillStyle = on ? '#ffc93c' : '#eadfc8';
      ctx.fill();
      ctx.strokeStyle = on ? '#a06a12' : '#cdbd9c';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (on && (fx.memo['st' + i] ?? -1) !== s.stage) (fx.memo['st' + i] = s.stage), fx.sound('ding', 1 + i * 0.18, 0.9), fx.burst(sx0, sy0, '#ffd84a', 10, 3, 2.4);
      font(0.034, 800);
      text(STAR_WORDS(s)[i], sx0, sy0 + R(0.078), s.starOk[i] ? INK : '#b8a688');
    }
    rr(ctx, X(0.12), cy0 + R(0.243), R(0.76), R(0.058), R(0.02));
    ctx.fillStyle = '#fff0cc';
    ctx.fill();
    font(0.044, 900);
    const gain = s.events.find((e) => e.k === 'clear')?.x2 ?? 0;
    text(`+${fmt(gain)}점`, X(0.34), cy0 + R(0.273), '#d9480f');
    font(0.034, 800);
    text(`별 ${s.got}개 = 판 점수 ×${STAR_MUL[s.got]}`, X(0.66), cy0 + R(0.274), INK);
    font(0.034, 800);
    text(`최고 한 주먹 ${s.best}마리 · 최고 공중 연속 ${s.maxCombo}`, w / 2, cy0 + R(0.33), MUTED);
    drawSpirit(ctx, X(0.14), cy0 + R(0.39), R(0.024), s.lv, t, 3);
    ctx.textAlign = 'left';
    font(0.037, 900);
    text(`흙 정령 Lv${s.lv - 1} → Lv${s.lv}`, X(0.19), cy0 + R(0.392), '#8a5a34');
    const lw0 = ctx.measureText(`흙 정령 Lv${s.lv - 1} → Lv${s.lv}`).width;
    font(0.034, 700);
    text(LV_GIFT[s.lv] ?? '주먹이 더 크고 높이', X(0.19) + lw0 + R(0.02), cy0 + R(0.394), LV_GIFT[s.lv] ? '#d9480f' : INK);
    const nx: StageDef | undefined = STAGES[s.stage + 1];
    font(0.034, 800);
    text(`도감 ${s.dex.length}/${DEX.length}`, X(0.1), cy0 + R(0.45), MUTED);
    if (s.newDex.length) {
      ctx.textAlign = 'right';
      text(`새 친구! ${s.newDex.map((k) => KD[k].name).slice(-2).join(' · ')}`, X(0.9), cy0 + R(0.45), '#d9480f');
    }
    ctx.textAlign = 'center';
    DEX.forEach((k, i) => {
      const has = s.dex.includes(k), isNew = s.newDex.includes(k), u = R(KD[k].boss ? 0.019 : 0.024), px = X(0.13 + i * 0.082), py = cy0 + R(0.54) - (isNew ? Math.abs(Math.sin(t * 0.18 + i)) * R(0.01) : 0);
      if (isNew) {
        ell(ctx, px, py - u, u * 1.6, u * 1.6);
        ctx.fillStyle = '#ffe9a0';
        ctx.fill();
        ctx.strokeStyle = '#e0a020';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      const next = !has && !!nx && nx.key === k;
      if (next) {
        ell(ctx, px, py - u, u * 1.6, u * 1.6);
        ctx.strokeStyle = '#ff8a3d';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 3]);
        ctx.lineDashOffset = -t * 0.3;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.save();
      ctx.translate(px, py);
      stamp(ctx, has ? sprite(k, M_SMUG, k === 'blob' ? 0 : 0, Math.round(u * 1.1 * q2)) : silhouette(k, Math.round(u * 1.1 * q2)), u);
      ctx.restore();
      if (next) (font(0.04, 900), text('?', px, py - u, '#ff8a3d', '#ffffff', 3));
    });
    font(0.037, 900);
    if (pt >= RES_MIN) text(s.won ? '톡!' : d.boss && d.ch < PERKS.length ? '톡 하면 장 끝 선물!' : '톡 하면 다음 판', w / 2, cy0 + chh - R(0.033), (t >> 3) % 2 ? '#d9480f' : '#ff8a3d');
    else if (nx) text(d.boss ? `다음 길: ${CHAPTERS[nx.ch]}` : `다음 판: ${nx.name}`, w / 2, cy0 + chh - R(0.033), MUTED);
    ctx.globalAlpha = 1;
  }

  // ── 장 끝: 둘 중 하나 ──
  if (s.phase === 'pick') {
    const pt = s.pt, picked = s.picked, opts = PERKS[d.ch];
    rr(ctx, X(0.08), Y(0.17), R(0.84), R(0.105), R(0.03));
    ctx.fillStyle = 'rgba(255,250,235,.96)';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    font(0.042, 900);
    text(`${CHAPTERS[d.ch]} 끝! 선물 하나`, w / 2, Y(0.203), '#d9480f');
    font(0.035, 800);
    text(picked < 0 ? '길 위의 큰 돌상 둘 중 하나를 톡!' : `${opts[picked].name}: ${opts[picked].line}`, w / 2, Y(0.247), INK);
    opts.forEach((o, i) => {
      const px = X(i ? 0.72 : 0.28), drop = picked < 0 ? Math.max(0, 1 - pt / 16) : 0, py = Y(GY + 0.1) - drop * drop * R(0.5);
      const chosen = picked === i, other = picked >= 0 && !chosen, k = R(0.26) * (chosen ? 1 + 0.15 * Math.sin(Math.min(1, pt / 12) * Math.PI) : 1);
      ctx.globalAlpha = other ? Math.max(0, 1 - pt / 20) : 1;
      ctx.fillStyle = 'rgba(50,35,10,.2)';
      ell(ctx, px, Y(GY + 0.105), R(0.14), R(0.03));
      ctx.fill();
      if (picked < 0 && pt >= PICK_MIN) {
        ell(ctx, px, Y(GY + 0.105), R(0.18 + 0.012 * Math.sin(t * 0.2)), R(0.045));
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.setLineDash([7, 6]);
        ctx.lineDashOffset = -t * 0.5;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      drawPerk(ctx, d.ch, i, px, py, k, t);
      rr(ctx, px - R(0.215), Y(0.4), R(0.43), R(0.105), R(0.025));
      ctx.fillStyle = chosen ? '#ffe9a0' : 'rgba(255,250,235,.96)';
      ctx.fill();
      ctx.strokeStyle = chosen ? '#e0a020' : INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      font(0.04, 900);
      text(o.name, px, Y(0.435), '#d9480f');
      font(0.034, 800);
      text(o.line, px, Y(0.479), INK);
      ctx.globalAlpha = 1;
    });
  }

  // ── 끝 ──
  if (s.phase === 'end') {
    const a = Math.min(1, s.pt / 14);
    ctx.globalAlpha = a;
    rr(ctx, X(0.08), Y(0.3), R(0.84), R(0.56), R(0.04));
    ctx.fillStyle = '#fffaf0';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    drawSpirit(ctx, w / 2, Y(0.45) + Math.sin(t * 0.1) * R(0.01), R(0.07), s.lv, t, s.won ? 3 : 2);
    font(0.052, 900);
    text(s.won ? '길 셋을 모두 쓸었다!' : '꽃길이 다 밟혔어요…', w / 2, Y(0.585), '#d9480f');
    font(0.04, 800);
    text(`${s.won ? STAGES.length : s.stage + 1}판 · 별 ${s.stars}/${STAGES.length * 3} · 도감 ${s.dex.length}/${DEX.length}`, w / 2, Y(0.655), INK);
    font(0.06, 900);
    text(`${fmt(s.pts + s.sp)}점`, w / 2, Y(0.74), INK);
    font(0.035, 700);
    text(s.won ? `흙 정령 Lv${s.lv} — 최고의 땅 주먹!` : '다시 하면 더 멀리 갈 수 있어요', w / 2, Y(0.81), MUTED);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'center';
}
/** 스크린샷·모음 그림용 (게임에서는 쓰지 않는다) */
export const __art = { sprite, stamp, drawSpirit, drawPerk, silhouette, drawFist };
