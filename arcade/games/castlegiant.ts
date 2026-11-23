/**
 * 🏰 성을 등에 진 거인 (43라운드 메뉴 5 — 오너가 고른 아이디어) — 성 쿵 내려놓기 × 땅마다 다른 일 × 성 키우기.
 * 메뉴 약속(그대로): 성을 통째로 등에 지고 걷는 거인 — 톡 한 곳에 쿵 내려놓으면 성 안 사람들이 우르르 쏟아져 나와 밭을 갈고 나무를 베고
 *   몬스터와 싸워요. 다 쓰면 다시 들쳐 메고 다음 땅으로.
 * 조작은 톡 하나:
 *   ① 땅을 톡 → 거인이 쿵쿵 걸어가 그 자리에 성을 **쿵** 내려놓는다. 쿵 한 번이 큰 일: 둘레 나무에서 통나무가 우수수, 강에서 물고기가 펄떡,
 *      바위가 쩍, 성 밑에 깔린 몬스터는 찌부, 떠돌이 사람들은 "성이다!" 하고 달려온다. 곧 성문이 열리며 작은 사람들이 개미떼처럼 쏟아져 나와
 *      저절로 그 땅의 일(나무꾼·농부·어부·광부·기사…). 얻은 것을 줄지어 성으로 나르면 성 위의 '바라는 부품'(그림 + 필요한 것)이 차고,
 *      다 차면 성이 한 층 자란다(망루·풍차·물레방아·대포·성벽·깃발탑…). 먹을 것 넷마다 새 사람이 창문에서 폴짝.
 *   ② 성이 내려져 있을 때 다른 땅을 톡 → 뿌우 나팔! 사람들이 우르르 뛰어 돌아오고(늦은 사람은 창문으로 폴짝) 거인이 성을 들쳐 메고 그리로.
 *      성을 톡 하면 나팔만(성을 메고 선다).
 * 떠나야 하는 까닭(기다림 아님): 첫 쿵 소리에 뒤에서 자던 폭풍 구름이 깨어나 천천히 따라온다. 땅은 쓸수록 줄고(다 베면 그루터기),
 *   오래 머물면 폭풍에 닿아 밖에 있던 사람이 빙글빙글 날아가고 하트 -1(1판은 하트를 잃지 않음), 일찍 떠나면 덜 얻는다 — '어디에·얼마나'.
 * 0.5~2초 판단: 앞에 어떤 땅이 있나(땅 위에 얻을 것 그림) · 성이 바라는 것(성 위 그림) · 폭풍까지 얼마나(위 지도) → 어디에 내려놓고 언제 메나.
 *   쿵 자리가 곧 솜씨: 숲 한가운데면 통나무가 많이, 몬스터 바로 위면 찌부, 두 땅 사이면 둘 다.
 * 정답 없음: 어디에 내려놓아도 무언가 얻는다(바라는 부품에 안 맞는 것은 창고로 가서 다음 부품에 쓰이고, 먹을 것은 사람이 된다).
 * 디펜스 아님: 성은 지키는 대상이 아니라 자라는 놀잇감. 몬스터는 내가 고른 소굴에만 있고 다가오지 않는다(대장도 길을 막고 설 뿐).
 * 판 12개(장 3 × 4판, 장 끝은 큰 판): 숲과 밀밭 → 물고기 강 → 몬스터 소굴 → [대장] 거대 트롤 산 → 바위 광산 → 떠돌이 마을 → 버섯 늪
 *   → [대장] 얼음 고개 → 불꽃 화산 → 구름 과수원 → 보물 언덕 → [대장] 천둥 용 봉우리. 큰 판의 대장은 길을 막고 선다 — 성으로 쿵! 쿵!(성이 클수록 세다)
 * 성장: 판을 깨면 거인 Lv+1(보폭·쿵 크기, 목도리 → 모자 → 허리띠 → 망토 → 왕관) · 성 층수는 다음 판으로 이어짐 · 세계 지도에 지나온 길 ·
 *   장 끝 세상 속 큰 물건 둘 중 하나(거대한 바퀴 / 큰 종 · 쇠망치 / 바람 돛) · 도감 = 성 부품 9 + 사람 직업 8.
 * 별(쉬운 말 셋): 새 땅까지 가기 · 폭풍에 아무도 안 날리기 · 판마다 다른 솜씨(한 번 쿵에 N개 · 사람 N명 · 몬스터 찌부 · 대장에게 성 쿵 N번 …).
 * 점수: 나른 것 하나 1점(금 3점) · 부품 15점 · 찌부 10점 · 새 식구 5점, 판 점수는 별 수로 곱해진다(×1·×2·×4).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5, TAU = Math.PI * 2;
/** 옆에서 본 땅: 화면 좌표(가로 폭 = 1, 세로 0~1.5). 거인·성이 서는 줄 FEET, 사람이 걷는 띠 B0~B1(아래로 갈수록 앞) */
const FEET = 1.0, B0 = 0.985, B1 = 1.15;
/** 위 띠·지도 아래부터 놀이 화면 · 아래 띠 시작 */
const TOP = 0.17, BOT = 1.3;
/** 카메라: 성을 메고 있으면 거인이 화면 왼쪽 CAM_G 자리에, 내려놓으면 성이 CAM_C 자리에 */
const CAM_G = 0.3, CAM_C = 0.42;
/** 거인: 걸음(틱당) · 보폭 · 거인과 성 사이(내려놓는 자리) · 내려놓기 · 들기 · 나팔 뒤 기다림 최대 · 폭풍에 맞고 어질 */
const WALK_V = 0.0105, STRIDE = 0.19, DROP_DX = 0.15, DROP_T = 16, LIFT_T = 14, CALL_T = 40, DIZZY_T = 40;
/** 성 반폭(발자리) */
const HALF = 0.085;
/** 사람: 걷기 · 나르기 · 달려 돌아오기 (틱당) · 쏟아져 나오는 간격 · 처음 사람 수 · 최대 · 먹을 것 몇 개에 한 명 */
const P_WALK = 0.0048, P_CARRY = 0.0042, P_SPRINT = 0.014, POUR_EVERY = 2, POP0 = 10, POP_MAX = 40, FOOD_PER = 4;
/** 일하는 범위(성에서 좌우) · 쿵 범위 (부품·레벨로 넓어진다) */
const WORK_R = 0.26, THUD_R = 0.12;
/** 결과 화면: 톡 받기 시작 · 저절로 넘어감 / 둘 중 하나: 톡 받기 시작 · 저절로 고름 · 고른 뒤 / 끝 */
const RES_MIN = 90, RES_AUTO = 60 * 9, PICK_MIN = 40, PICK_AUTO = 60 * 20, PICK_AFTER = 64, END_T = 210;
/** 도착 잔치 틱 · 판 점수 */
const ARRIVE_T = 84, CLEAR_PTS = 30, STAR_MUL = [1, 1, 2, 4], WIN_PTS = 150;
/** 큰 띠: 한 번 쿵에 이만큼 떨어지면 */
const WOW_N = 4;

// ───────────────────────────── 땅 · 얻을 것 · 부품 ─────────────────────────────
export type Res = 'wood' | 'stone' | 'food' | 'gold';
export type Item = 'log' | 'stone' | 'sheaf' | 'fish' | 'shroom' | 'fruit' | 'coin';
const RES_OF: Record<Item, Res> = { log: 'wood', stone: 'stone', sheaf: 'food', fish: 'food', shroom: 'food', fruit: 'food', coin: 'gold' };
export const RES_NAME: Record<Res, string> = { wood: '나무', stone: '돌', food: '먹을 것', gold: '금' };
export type Job = 'jack' | 'farm' | 'fisher' | 'knight' | 'miner' | 'shroomer' | 'smith' | 'picker';
export const JOB_NAME: Record<Job, string> = { jack: '나무꾼', farm: '농부', fisher: '어부', knight: '기사', miner: '광부', shroomer: '버섯지기', smith: '불 광부', picker: '구름지기' };
export const JOB_DEX: Job[] = ['jack', 'farm', 'fisher', 'knight', 'miner', 'shroomer', 'smith', 'picker'];
export type ZK = 'plain' | 'forest' | 'field' | 'river' | 'den' | 'mine' | 'village' | 'swamp' | 'ice' | 'volcano' | 'cloud' | 'lair' | 'goal';
/** 땅 이름 · 땅 위에 뜨는 얻을 것 그림 · 너비 */
export const ZD: Record<ZK, { name: string; gets: Item[]; w: number }> = {
  plain: { name: '풀밭', gets: [], w: 0.1 },
  forest: { name: '숲', gets: ['log'], w: 0.3 },
  field: { name: '밀밭', gets: ['sheaf'], w: 0.26 },
  river: { name: '강가', gets: ['fish'], w: 0.17 },
  den: { name: '몬스터 소굴', gets: ['coin'], w: 0.3 },
  mine: { name: '광산', gets: ['stone'], w: 0.27 },
  village: { name: '떠돌이 마을', gets: [], w: 0.27 },
  swamp: { name: '버섯 늪', gets: ['shroom'], w: 0.28 },
  ice: { name: '얼음 호수', gets: ['fish'], w: 0.26 },
  volcano: { name: '불꽃 바위', gets: ['stone', 'coin'], w: 0.28 },
  cloud: { name: '구름 과수원', gets: ['fruit'], w: 0.28 },
  lair: { name: '대장', gets: ['coin'], w: 0.5 },
  goal: { name: '새 땅', gets: [], w: 0.5 },
};
type OK = 'tree' | 'wheat' | 'fishery' | 'rock' | 'shroom' | 'fruit' | 'hot' | 'mon' | 'folk' | 'loot' | 'chest' | 'geyser' | 'cage';
interface ODef { sub: Item; amt: number; work: number; cap: number; job: Job }
const OD: Partial<Record<OK, ODef>> = {
  tree: { sub: 'log', amt: 3, work: 50, cap: 2, job: 'jack' },
  wheat: { sub: 'sheaf', amt: 3, work: 36, cap: 2, job: 'farm' },
  fishery: { sub: 'fish', amt: 3, work: 46, cap: 2, job: 'fisher' },
  rock: { sub: 'stone', amt: 4, work: 54, cap: 3, job: 'miner' },
  shroom: { sub: 'shroom', amt: 3, work: 30, cap: 2, job: 'shroomer' },
  fruit: { sub: 'fruit', amt: 4, work: 38, cap: 2, job: 'picker' },
  hot: { sub: 'stone', amt: 4, work: 46, cap: 2, job: 'smith' },
  chest: { sub: 'coin', amt: 4, work: 10, cap: 3, job: 'knight' },
};
const ITEM_JOB: Record<Item, Job> = { log: 'jack', stone: 'miner', sheaf: 'farm', fish: 'fisher', shroom: 'shroomer', fruit: 'picker', coin: 'knight' };
export type MK = 'slime' | 'goblin' | 'ogre' | 'troll' | 'yeti' | 'drake';
export const MD: Record<MK, { name: string; hp: number; r: number; gold: number; atk: number; reach: number; boss?: boolean }> = {
  slime: { name: '말랑 슬라임', hp: 8, r: 0.03, gold: 3, atk: 110, reach: 0.055 },
  goblin: { name: '심술 도깨비', hp: 15, r: 0.034, gold: 4, atk: 95, reach: 0.062 },
  ogre: { name: '배불뚝 도깨비', hp: 30, r: 0.05, gold: 7, atk: 115, reach: 0.08 },
  troll: { name: '산 트롤', hp: 200, r: 0.11, gold: 14, atk: 170, reach: 0.17, boss: true },
  yeti: { name: '얼음 털보', hp: 270, r: 0.11, gold: 16, atk: 160, reach: 0.17, boss: true },
  drake: { name: '천둥 용', hp: 340, r: 0.12, gold: 20, atk: 150, reach: 0.19, boss: true },
};
export type PK = 'tower' | 'mill' | 'wheel' | 'cannon' | 'wall' | 'flag' | 'forge' | 'garden' | 'roof';
interface PDef { name: string; line: string; need: Partial<Record<Res, number>>; max: number; from: number }
export const PD: Record<PK, PDef> = {
  tower: { name: '나무 망루', line: '사람들이 더 멀리까지 일해요', need: { wood: 6 }, max: 99, from: 0 },
  mill: { name: '풍차', line: '밀이 두 배', need: { wood: 2, food: 4 }, max: 1, from: 0 },
  wheel: { name: '물레방아', line: '물고기가 두 배', need: { wood: 2, food: 4 }, max: 1, from: 1 },
  cannon: { name: '대포', line: '몬스터를 쾅!', need: { wood: 2, gold: 3 }, max: 3, from: 2 },
  wall: { name: '돌 성벽', line: '성이 무거워져 쿵이 커져요', need: { stone: 6 }, max: 99, from: 4 },
  flag: { name: '깃발탑', line: '신나서 일이 빨라져요', need: { gold: 4, wood: 1 }, max: 3, from: 5 },
  forge: { name: '대장간', line: '기사가 두 배로 세져요', need: { stone: 3, gold: 3 }, max: 1, from: 8 },
  garden: { name: '구름 정원', line: '먹을 것 셋에 한 명씩', need: { food: 5, gold: 2 }, max: 1, from: 9 },
  roof: { name: '황금 지붕', line: '나른 것 점수가 두 배', need: { gold: 10 }, max: 1, from: 10 },
};
export const PART_DEX: PK[] = ['tower', 'mill', 'wheel', 'cannon', 'wall', 'flag', 'forge', 'garden', 'roof'];
/** 땅마다 나오는 것(바라는 부품을 고를 때 이 판에서 구할 수 있는 것만) */
const ZRES: Partial<Record<ZK, Res[]>> = { forest: ['wood'], field: ['food'], river: ['food'], den: ['gold'], mine: ['stone'], swamp: ['food'], ice: ['food', 'stone'], volcano: ['stone', 'gold'], cloud: ['food'], lair: ['gold'] };

type StarK = 'thud' | 'pop' | 'squash' | 'slam' | 'parts' | 'join' | 'floors' | 'gold';
interface StageDef { key: string; ch: number; name: string; news: string; zones: ZK[]; storm: number; star: [StarK, number]; boss?: MK; newZ?: ZK; newP?: PK }
export const CHAPTERS = ['풀빛 골짜기', '바위 고개', '구름 너머'];
/**
 * 판 12개. 땅은 판마다 정해진 차례(너비·물건 수는 시드로 조금씩 다름). 폭풍 빠르기는 틱당(0.001 = 초당 화면 폭의 6%).
 * 별 셋째(솜씨)는 판마다 다르다 — 버릇 하나로는 안 되게(바로 앞 땅만 · 오래 머물기만).
 */
export const STAGES: StageDef[] = [
  { key: 'forest', ch: 0, name: '숲과 밀밭', news: '쿵! 하면 통나무가 우수수 — 나무꾼이 우르르', zones: ['forest', 'field', 'forest', 'field', 'forest', 'field', 'forest'], storm: 0.0009, star: ['thud', 5], newZ: 'forest' },
  { key: 'river', ch: 0, name: '물고기 강', news: '강가에 쿵 — 물고기 펄떡! 먹을 것은 새 식구', zones: ['field', 'river', 'forest', 'river', 'field', 'forest', 'river', 'field'], storm: 0.001, star: ['pop', 16], newZ: 'river' },
  { key: 'den', ch: 0, name: '몬스터 소굴', news: '몬스터 바로 위에 쿵 — 찌부! 보물이 와르르', zones: ['forest', 'den', 'field', 'river', 'den', 'forest', 'den', 'field'], storm: 0.00105, star: ['squash', 2], newZ: 'den' },
  { key: 'troll', ch: 0, name: '거대 트롤 산', news: '길을 막은 산 트롤 — 성으로 쿵! 쿵!', zones: ['forest', 'field', 'den', 'river', 'forest', 'lair'], storm: 0.0008, star: ['slam', 3], boss: 'troll' },
  { key: 'mine', ch: 1, name: '바위 광산', news: '광산에 쿵 — 돌이 쩍! 돌 성벽은 쿵을 키워요', zones: ['mine', 'forest', 'mine', 'river', 'field', 'mine', 'den', 'mine'], storm: 0.0011, star: ['parts', 3], newZ: 'mine' },
  { key: 'village', ch: 1, name: '떠돌이 마을', news: '떠돌이 곁에 쿵 — "성이다!" 우르르 식구가 돼요', zones: ['village', 'mine', 'forest', 'village', 'den', 'field', 'village', 'river', 'mine'], storm: 0.00115, star: ['join', 4], newZ: 'village' },
  { key: 'swamp', ch: 1, name: '버섯 늪', news: '늪엔 버섯이 잔뜩 — 대신 사람들이 느릿느릿', zones: ['swamp', 'forest', 'swamp', 'mine', 'den', 'swamp', 'village', 'field'], storm: 0.0012, star: ['floors', 14], newZ: 'swamp' },
  { key: 'yeti', ch: 1, name: '얼음 고개', news: '얼음 호수에 쿵 — 쩍! 끝엔 얼음 털보', zones: ['ice', 'mine', 'forest', 'ice', 'den', 'village', 'lair'], storm: 0.001, star: ['slam', 4], boss: 'yeti', newZ: 'ice' },
  { key: 'volcano', ch: 2, name: '불꽃 화산', news: '뜨거운 바위엔 돌과 금 — 김 구멍은 펑!', zones: ['volcano', 'forest', 'volcano', 'river', 'den', 'volcano', 'mine', 'field'], storm: 0.00125, star: ['gold', 16], newZ: 'volcano' },
  { key: 'cloud', ch: 2, name: '구름 과수원', news: '구름 나무에 쿵 — 열매가 주르르', zones: ['cloud', 'cloud', 'volcano', 'cloud', 'den', 'village', 'cloud', 'mine'], storm: 0.0013, star: ['thud', 9], newZ: 'cloud' },
  { key: 'gold', ch: 2, name: '보물 언덕', news: '소굴이 셋! 황금 지붕을 올려 봐요', zones: ['den', 'field', 'den', 'mine', 'cloud', 'den', 'volcano', 'village'], storm: 0.00135, star: ['squash', 3], newP: 'roof' },
  { key: 'drake', ch: 2, name: '천둥 용 봉우리', news: '마지막 대장 천둥 용 — 성으로 쿵! 쿵! 쿵!', zones: ['cloud', 'volcano', 'den', 'village', 'mine', 'cloud', 'lair'], storm: 0.0011, star: ['slam', 5], boss: 'drake' },
];
export const STAGE_COUNT = STAGES.length;
/** 장 끝 둘 중 하나(세상 속 큰 물건) */
export const PERKS: { name: string; line: string }[][] = [
  [{ name: '거대한 바퀴', line: '걸음이 빨라지고 길가 것을 주워요' }, { name: '큰 종', line: '폭풍이 오면 저절로 땡땡' }],
  [{ name: '쇠망치', line: '쿵이 훨씬 넓어져요' }, { name: '바람 돛', line: '폭풍이 느려져요' }],
];

// ───────────────────────────── 상태 ─────────────────────────────
/** 사람: 성 안 · 일하러 감 · 일함 · 나름 · 날아감(몬스터) · 어질 · 나팔에 달려옴 · 창문으로 폴짝 · 폭풍에 날아감 · 성 둘레에서 놂 · 새 식구가 달려옴 */
const P_IN = 0, P_OUT = 1, P_WORK = 2, P_BACK = 3, P_FLY = 4, P_DIZZY = 5, P_RUN = 6, P_HOP = 7, P_BLOWN = 8, P_IDLE = 9, P_JOIN = 10;
/** 거인: 섬 · 걸음 · 내려놓음 · 성이 땅에 · 나팔(사람 기다림) · 들쳐 멤 */
const G_STAND = 0, G_WALK = 1, G_DROP = 2, G_DOWN = 3, G_CALL = 4, G_LIFT = 5;
interface Zone { k: ZK; x0: number; x1: number; seed: number }
interface Obj {
  id: number; k: OK; x: number; y: number; amt: number; max: number; zone: number; v: number; sub: Item;
  shaken: boolean; rolled: boolean; workers: number; claim: number;
  /** 몬스터·대장 */
  mk: MK | null; hp: number; hpMax: number; atkT: number; wind: number; stun: number; hx: number; dir: number;
  dead: boolean; z: number; vz: number; vx: number;
  // 연출 (시뮬레이션 결과와 무관)
  hitT: number; fallT: number; born: number; slamT: number;
}
interface Per {
  id: number; x: number; y: number; z: number; vx: number; vz: number; st: number; tgt: Obj | null; job: Job | null; carry: Item | null;
  tm: number; seed: number; dir: number; born: number; hx: number;
}
interface Shot { x0: number; y0: number; x1: number; y1: number; t: number; T: number; tgt: Obj; boss: boolean }
interface Ev { t: number; k: string; x: number; y: number; n: number; x2: number; y2: number; text: string }

export interface GiantState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result' | 'pick' | 'end'; pt: number;
  hearts: number; pts: number; sp: number; stars: number; got: number; starOk: boolean[]; dead: boolean; won: boolean; gain: number;
  /** 거인 레벨 · 장 끝 선물(0 아직 · 1 왼쪽 · 2 오른쪽) · 방금 고른 것 */
  lv: number; perk: number[]; picked: number;
  /** 성: 부품 수 · 쌓인 차례(층) · 창고 · 바라는 부품과 찬 양 · 먹을 것(사람이 되기 전) */
  parts: Record<PK, number>; built: PK[]; store: Record<Res, number>; wish: PK | null; wishGot: Record<Res, number>; food: number;
  dexP: PK[]; dexJ: Job[]; newDex: string[];
  zones: Zone[]; objs: Obj[]; people: Per[]; nid: number; shots: Shot[]; canT: number; geyT: number;
  /** 거인 x · 상태 · 상태 틱 · 갈 곳(성을 내려놓을 x, 없으면 NaN) · 내려놓는 중에 들어온 다음 곳 · 향한 쪽 · 걸음 위상 · 어질 */
  gx: number; gst: number; gt: number; tx: number; pend: number; gdir: number; wph: number; gdz: number;
  /** 성이 땅에 있나 · 그 x · 쏟아져 나올 사람 수 · 카메라(화면 왼쪽 끝의 세상 x) */
  cdown: boolean; cx: number; pourQ: number; cam: number;
  /** 폭풍 앞자락 x · 깨어났나 · 이번 판 폭풍에 맞은 수 · 날아간 사람 */
  sx: number; awake: boolean; hits: number; lost: number;
  goalX: number;
  /** 이번 판: 내려놓은 수 · 한 번 쿵 최고 · 찌부 · 대장 쿵 · 한 번에 들어온 최고 · 지은 부품 · 금 · 판 틱 · 도착 잔치 */
  drops: number; bestThud: number; squash: number; slam: number; joinBest: number; partsStage: number; goldStage: number; stageT: number; arrive: number;
  /** 지나온 길(세계 지도): 판마다 별 */
  route: number[];
  firstTap: number; firstBig: number; wowN: number; freeze: number; down: boolean;
  seen: Set<string>; events: Ev[];
  banner: { head: string; sub: string; t: number } | null;
  /** NEW 땅 스포트라이트(땅 번호) */
  spot: { zone: number; t: number } | null;
  /** 큰 띠(한 번에 하나) */
  big: { text: string; t: number; n: number; star: boolean } | null;
  star3At: number;
}

const hyp = (a: number, b: number) => Math.sqrt(a * a + b * b);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ev = (s: GiantState, k: string, x: number, y: number, n = 0, x2 = 0, y2 = 0, text = '') => s.events.push({ t: s.t, k, x, y, n, x2, y2, text });
const see = (s: GiantState, key: string) => void s.seen.add(key);
const zero = (): Record<Res, number> => ({ wood: 0, stone: 0, food: 0, gold: 0 });

/** 거인 힘: 일하는 범위 · 쿵 범위 · 걸음 · 폭풍 빠르기 · 먹을 것 몇에 한 명 · 성 층수 */
export const workR = (s: GiantState) => WORK_R + 0.025 * Math.min(4, s.parts.tower);
export const thudR = (s: GiantState) => (THUD_R + 0.012 * Math.min(5, s.parts.wall) + 0.004 * (s.lv - 1)) * (s.perk[1] === 1 ? 1.6 : 1);
const walkV = (s: GiantState) => WALK_V * (1 + 0.03 * (s.lv - 1)) * (s.perk[0] === 1 ? 1.3 : 1);
const stormV = (s: GiantState) => STAGES[s.stage].storm * (s.perk[1] === 2 ? 0.7 : 1);
export const foodPer = (s: GiantState) => FOOD_PER + Math.floor(s.people.length / 6) - (s.parts.garden ? 2 : 0);
export const floors = (s: GiantState) => s.built.length;
/** 성 그림 높이(화면 폭 단위): 문 층 + 지붕 + 층마다(층이 많아지면 얇게) */
export const floorH = (n: number) => Math.min(0.046, 0.3 / Math.max(1, n));
export const castleH = (n: number) => 0.15 + n * floorH(n);
const pop = (s: GiantState) => s.people.length;
const outside = (p: Per) => p.st !== P_IN && p.st !== P_BLOWN;
const alive = (o: Obj) => !o.dead && o.hp > 0;
const bossOf = (s: GiantState) => s.objs.find((o) => o.k === 'mon' && !o.dead && !!o.mk && !!MD[o.mk].boss);

function wow(s: GiantState, text: string, n = 0, star = false) {
  s.big = { text, t: s.t, n, star };
  s.wowN++;
  if (s.firstBig < 0) s.firstBig = s.t;
}

// ───────────────────────────── 판 만들기 ─────────────────────────────
let OID = 0;
function obj(s: GiantState, k: OK, x: number, y: number, zone: number, amt = 0): Obj {
  const o: Obj = {
    id: ++OID, k, x, y, amt, max: amt, zone, v: Math.floor(s.rng() * 1000), sub: OD[k]?.sub ?? 'coin', shaken: false, rolled: false, workers: 0, claim: -1,
    mk: null, hp: 1, hpMax: 1, atkT: 0, wind: 0, stun: 0, hx: x, dir: 1, dead: false, z: 0, vz: 0, vx: 0, hitT: -99, fallT: -99, born: s.t, slamT: -99,
  };
  s.objs.push(o);
  return o;
}
function monster(s: GiantState, mk: MK, x: number, y: number, zone: number): Obj {
  const o = obj(s, 'mon', x, y, zone);
  o.mk = mk;
  o.hp = o.hpMax = MD[mk].hp * (MD[mk].boss ? 1 : 1 + 0.06 * s.stage);
  o.atkT = Math.floor(s.rng() * 60);
  o.dir = -1;
  return o;
}
/** 소굴의 몬스터 차례 (판이 갈수록 큰 놈이 섞인다) */
function denMons(stage: number, i: number): MK[] {
  if (stage <= 2) return i % 2 ? ['slime', 'goblin'] : ['slime', 'slime'];
  if (stage <= 6) return i % 2 ? ['goblin', 'slime', 'goblin'] : ['ogre', 'slime'];
  return i % 2 ? ['ogre', 'goblin', 'slime'] : ['goblin', 'ogre', 'goblin'];
}
function genZone(s: GiantState, k: ZK, x0: number, w: number, zi: number, di: number) {
  const r = s.rng, plus = Math.floor(s.stage / 4);
  const spread = (n: number, f: (x: number, i: number) => void) => {
    for (let i = 0; i < n; i++) f(x0 + ((i + 0.5) / n) * w + (r() - 0.5) * (w / n) * 0.35, i);
  };
  switch (k) {
    case 'forest': spread(Math.max(4, Math.round(w / 0.043)), (x, i) => obj(s, 'tree', x, B0 + 0.004 + (i % 2) * 0.03 + r() * 0.012, zi, OD.tree!.amt + plus)); break;
    case 'field': spread(Math.max(4, Math.round(w / 0.048)), (x, i) => obj(s, 'wheat', x, 1.03 + (i % 2) * 0.05 + r() * 0.02, zi, OD.wheat!.amt + plus)); break;
    case 'river': spread(3, (x, i) => obj(s, 'fishery', x, 1.0 + i * 0.05 + r() * 0.01, zi, OD.fishery!.amt + plus)); break;
    case 'ice': spread(4, (x, i) => obj(s, i === 3 ? 'rock' : 'fishery', x, 1.0 + (i % 3) * 0.05 + r() * 0.01, zi, (i === 3 ? OD.rock!.amt : OD.fishery!.amt) + plus)); break;
    case 'mine': spread(Math.max(3, Math.round(w / 0.058)), (x, i) => obj(s, 'rock', x, 0.995 + (i % 3) * 0.045 + r() * 0.01, zi, OD.rock!.amt + plus)); break;
    case 'swamp': spread(Math.max(4, Math.round(w / 0.046)), (x, i) => obj(s, 'shroom', x, 1.02 + (i % 3) * 0.04 + r() * 0.015, zi, OD.shroom!.amt + plus)); break;
    case 'cloud': spread(Math.max(4, Math.round(w / 0.056)), (x, i) => obj(s, 'fruit', x, B0 + 0.004 + (i % 2) * 0.03 + r() * 0.01, zi, OD.fruit!.amt + plus)); break;
    case 'volcano':
      spread(4, (x, i) => (i === 1 ? obj(s, 'geyser', x, 1.06, zi) : obj(s, 'hot', x, 0.995 + (i % 2) * 0.05 + r() * 0.012, zi, OD.hot!.amt + plus)));
      break;
    case 'den': {
      const ms = denMons(s.stage, di);
      ms.forEach((mk, i) => monster(s, mk, x0 + w * (0.22 + (0.56 * i) / Math.max(1, ms.length - 1)) + (r() - 0.5) * 0.02, 1.04 + (i % 2) * 0.05, zi));
      const c = obj(s, 'cage', x0 + w * 0.5, 0.99, zi, 2 + (s.stage > 5 ? 1 : 0));
      c.amt = c.max;
      break;
    }
    case 'village': spread(3 + (s.stage > 6 ? 1 : 0), (x, i) => obj(s, 'folk', x, 1.03 + (i % 2) * 0.06, zi, 1)); break;
    case 'lair': monster(s, STAGES[s.stage].boss!, x0 + w * 0.6, 1.04, zi); break;
    default: break;
  }
}

function newStage(s: GiantState) {
  const d = STAGES[s.stage], r = s.rng;
  s.phase = 'play';
  s.pt = 0;
  s.zones = [];
  s.objs = [];
  s.shots = [];
  s.people = s.people.filter((p) => p.st !== P_BLOWN);
  for (const p of s.people) (p.st = P_IN), (p.tgt = null), (p.carry = null), (p.z = 0);
  let x = 0.46;
  d.zones.forEach((k, i) => {
    const w = ZD[k].w * (k === 'lair' ? 1 : 0.9 + 0.2 * r());
    s.zones.push({ k, x0: x, x1: x + w, seed: Math.floor(r() * 1e6) });
    genZone(s, k, x, w, s.zones.length - 1, d.zones.slice(0, i).filter((q) => q === k).length);
    x += w + 0.05 + 0.06 * r();
  });
  s.goalX = x + 0.12;
  s.zones.push({ k: 'goal', x0: s.goalX - 0.06, x1: s.goalX + 0.6, seed: 7 });
  s.gx = 0.28;
  s.gst = G_STAND;
  s.gt = 0;
  s.tx = NaN;
  s.pend = NaN;
  s.gdir = 1;
  s.gdz = 0;
  s.cdown = false;
  s.cx = s.gx;
  s.pourQ = 0;
  s.cam = 0;
  s.sx = -0.36;
  s.awake = false;
  s.hits = 0;
  s.lost = 0;
  s.drops = s.bestThud = s.squash = s.slam = s.joinBest = s.partsStage = s.goldStage = s.stageT = s.arrive = 0;
  s.canT = 0;
  s.geyT = 0;
  s.star3At = -1;
  s.newDex = [];
  s.big = null;
  s.banner = { head: `${CHAPTERS[d.ch]} · ${s.stage + 1}판`, sub: d.news, t: s.t };
  const sz = d.newZ ? s.zones.findIndex((z) => z.k === d.newZ) : -1;
  s.spot = sz >= 0 ? { zone: sz, t: s.t } : null;
  see(s, 'stage' + s.stage);
  if (d.newZ) see(s, 'zone:' + d.newZ);
  if (d.boss) see(s, 'boss:' + d.boss);
  if (!s.wish) chooseWish(s);
  ev(s, 'stage', s.gx, FEET);
}

// ───────────────────────────── 성: 바라는 부품 · 나른 것 ─────────────────────────────
/** 바라는 부품 고르기: 이번 판에 새로 풀린 것 먼저, 아니면 이 판 땅에서 구할 수 있는 것 중 창고로 가장 많이 찬 것 */
function chooseWish(s: GiantState, depth = 0) {
  const d = STAGES[s.stage], have = new Set<Res>();
  for (const k of d.zones) for (const r of ZRES[k] ?? []) have.add(r);
  const ok = (k: PK) => PD[k].from <= s.stage && s.parts[k] < PD[k].max && Object.keys(PD[k].need).every((r) => have.has(r as Res) || s.store[r as Res] >= (PD[k].need[r as Res] ?? 0));
  let best: PK | null = null, bv = -1e9;
  for (const k of PART_DEX) {
    if (!ok(k)) continue;
    const need = PD[k].need;
    let got = 0, tot = 0;
    for (const r of Object.keys(need) as Res[]) (tot += need[r]!), (got += Math.min(need[r]!, r === 'food' ? s.food : s.store[r]));
    let v = got / tot - tot * 0.01 - s.parts[k] * 0.15;
    if (s.parts[k] === 0) v += 0.5 + PD[k].from * 0.1;
    if (d.newP === k && s.parts[k] === 0) v += 5;
    if (v > bv) (bv = v), (best = k);
  }
  s.wish = best;
  s.wishGot = zero();
  if (!best) return;
  const need = PD[best].need;
  for (const r of Object.keys(need) as Res[]) {
    const take = Math.min(need[r]!, r === 'food' ? s.food : s.store[r]);
    s.wishGot[r] += take;
    if (r === 'food') s.food -= take;
    else s.store[r] -= take;
  }
  if (wishDone(s) && depth < 6) build(s, depth + 1);
}
const wishDone = (s: GiantState) => !!s.wish && (Object.keys(PD[s.wish].need) as Res[]).every((r) => s.wishGot[r] >= PD[s.wish!].need[r]!);
function build(s: GiantState, depth = 0) {
  const k = s.wish!;
  s.parts[k]++;
  s.built.push(k);
  s.partsStage++;
  s.sp += 15;
  if (!s.dexP.includes(k)) s.dexP.push(k), s.newDex.push('p:' + k), see(s, 'part:' + k);
  const top = FEET - castleH(floors(s));
  ev(s, 'part', s.cdown ? s.cx : s.gx - 0.03, top, floors(s), 0, 0, k);
  wow(s, `${PD[k].name} 완성!`, floors(s));
  checkStar3(s);
  s.wish = null;
  chooseWish(s, depth);
}
/** 새 식구 하나 (먹을 것 · 떠돌이 · 갇혀 있던 사람) */
function newPerson(s: GiantState, x: number, y: number, st: number): Per | null {
  if (pop(s) >= POP_MAX) return null;
  const p: Per = { id: ++s.nid, x, y, z: 0, vx: 0, vz: 0, st, tgt: null, job: null, carry: null, tm: 0, seed: Math.floor(s.rng() * 1000), dir: 1, born: s.t, hx: x };
  s.people.push(p);
  return p;
}
function born(s: GiantState) {
  const top = FEET - castleH(floors(s)) * 0.55;
  const x = s.cdown ? s.cx : s.gx - 0.03;
  const p = newPerson(s, x, FEET + 0.01, P_IN);
  if (!p) return void (s.sp += 2);
  s.sp += 5;
  ev(s, 'born', x, top, pop(s));
  checkStar3(s);
  if (s.cdown && s.gst === G_DOWN && s.arrive === 0) (p.st = P_IDLE), (p.tm = 0);
}
function addRes(s: GiantState, r: Res, n: number) {
  for (let guard = 0; n > 0 && guard < 20; guard++) {
    const w = s.wish ? PD[s.wish].need[r] ?? 0 : 0;
    if (w > s.wishGot[r]) {
      const k = Math.min(n, w - s.wishGot[r]);
      s.wishGot[r] += k;
      n -= k;
      if (wishDone(s)) build(s);
      continue;
    }
    if (r === 'food') {
      s.food += n;
      n = 0;
      while (s.food >= foodPer(s)) (s.food -= foodPer(s)), born(s);
    } else (s.store[r] += n), (n = 0);
    // 창고에 쌓여서 바라는 부품이 생길 수도
    if (!s.wish) chooseWish(s);
  }
}
function deposit(s: GiantState, it: Item, x: number) {
  const r = RES_OF[it], n = (it === 'sheaf' && s.parts.mill) || (it === 'fish' && s.parts.wheel) ? 2 : 1;
  s.sp += (r === 'gold' ? 3 : 1) * n * (s.parts.roof ? 2 : 1);
  if (r === 'gold') s.goldStage += n;
  ev(s, 'dep', x, FEET - castleH(floors(s)) * 0.4, n, 0, 0, it);
  addRes(s, r, n);
  checkStar3(s);
}

// ───────────────────────────── 별 ─────────────────────────────
function star3(s: GiantState): boolean {
  const [k, n] = STAGES[s.stage].star;
  switch (k) {
    case 'thud': return s.bestThud >= n;
    case 'pop': return pop(s) >= n;
    case 'squash': return s.squash >= n;
    case 'slam': return s.slam >= n;
    case 'parts': return s.partsStage >= n;
    case 'join': return s.joinBest >= n;
    case 'floors': return floors(s) >= n;
    case 'gold': return s.goldStage >= n;
  }
}
/** 별 셋째를 판 중에 처음 딴 순간: 띠 + 반짝 */
function checkStar3(s: GiantState) {
  if (s.star3At >= 0 || s.phase !== 'play' || !star3(s)) return;
  s.star3At = s.t;
  ev(s, 'star3', s.cdown ? s.cx : s.gx, FEET - 0.3);
  wow(s, '별 셋째!', 0, true);
}
export const starWord = (st: [StarK, number]) => {
  const [k, n] = st;
  switch (k) {
    case 'thud': return `한 번 쿵에 ${n}개`;
    case 'pop': return `식구 ${n}명`;
    case 'squash': return `몬스터 찌부 ${n}`;
    case 'slam': return `대장에게 쿵 ${n}번`;
    case 'parts': return `부품 ${n}개 짓기`;
    case 'join': return `한 번에 ${n}명 데려오기`;
    case 'floors': return `성 ${n}층`;
    case 'gold': return `금 ${n}개`;
  }
};
export const starProg = (s: GiantState): [number, number] => {
  const [k, n] = STAGES[s.stage].star;
  const v = k === 'thud' ? s.bestThud : k === 'pop' ? pop(s) : k === 'squash' ? s.squash : k === 'slam' ? s.slam : k === 'parts' ? s.partsStage : k === 'join' ? s.joinBest : k === 'floors' ? floors(s) : s.goldStage;
  return [Math.min(v, n), n];
};

// ───────────────────────────── 톡 ─────────────────────────────
/** 톡한 곳 → 성을 내려놓을 x (폭풍 속·대장 너머·새 땅 너머로는 안 간다) */
function clampTarget(s: GiantState, x: number) {
  let tx = Math.max(x, 0.2);
  if (s.awake) tx = Math.max(tx, s.sx + 0.22);
  const b = bossOf(s);
  if (b) tx = Math.min(tx, b.x + 0.02);
  return Math.min(tx, s.goalX);
}
export const castleTop = (s: GiantState) => FEET - castleH(floors(s));
function onTap(s: GiantState, wx: number, wy: number) {
  if (s.arrive > 0 || wy < TOP) return;
  ev(s, 'tap', wx, wy);
  if (s.firstTap < 0) s.firstTap = s.t;
  const onCastle = s.cdown && Math.abs(wx - s.cx) < 0.1 && wy > castleTop(s) - 0.05 && wy < FEET + 0.07;
  if (onCastle) {
    if (s.gst === G_DOWN) recall(s, NaN);
    return;
  }
  const tx = clampTarget(s, wx);
  if (s.gst === G_DOWN) recall(s, tx);
  else if (s.gst === G_DROP) s.pend = tx;
  else if (s.gst === G_CALL || s.gst === G_LIFT) s.tx = tx;
  else (s.tx = tx), (s.gst = G_WALK), (s.gt = 0);
  if (s.spot && s.zones[s.spot.zone] && tx >= s.zones[s.spot.zone].x0 - 0.1 && tx <= s.zones[s.spot.zone].x1 + 0.1) s.spot = null;
}
/** 뿌우 나팔: 사람들이 우르르 돌아온다 */
function recall(s: GiantState, tx: number) {
  s.gst = G_CALL;
  s.gt = 0;
  s.tx = tx;
  for (const p of s.people) if (outside(p) && p.st !== P_FLY && p.st !== P_HOP) release(s, p), (p.st = P_RUN);
  ev(s, 'horn', s.cx, castleTop(s));
}

// ───────────────────────────── 쿵 ─────────────────────────────
/** 쿵 한 번에 떨어지는 것 (나무 하나에 통나무 하나 · 물고기 둘 · 열매 둘…) */
const LOOSE: Partial<Record<OK, number>> = { tree: 1, wheat: 1, fishery: 2, rock: 1, shroom: 1, fruit: 2, hot: 1 };
function loot(s: GiantState, it: Item, x: number, y: number, z: number, vx: number) {
  const o = obj(s, 'loot', x, y, -1, 1);
  o.sub = it;
  o.z = z;
  o.vz = 0.004 + s.rng() * 0.004;
  o.vx = vx;
  return o;
}
function thud(s: GiantState) {
  const x = s.cx, R = thudR(s), wr = workR(s);
  let n = 0, joined = 0, sq = 0;
  s.drops++;
  for (const o of [...s.objs]) {
    if (o.dead) continue;
    const dx = Math.abs(o.x - x);
    if (o.k === 'mon' && o.mk) {
      const md = MD[o.mk];
      if (dx < HALF + md.r * 0.6) {
        if (md.boss) bossSlam(s, o);
        else (o.hp = 0), kill(s, o, true), sq++;
      } else if (dx < R + md.r) (o.stun = Math.max(o.stun, 90)), (o.hitT = s.t);
      continue;
    }
    if (o.k === 'folk') {
      if (dx < wr) join(s, o), joined++;
      continue;
    }
    if (o.k === 'loot' || o.k === 'chest' || o.k === 'cage' || o.k === 'geyser') continue;
    if (dx < R && !o.shaken && o.amt > 0) {
      o.shaken = true;
      o.hitT = s.t;
      const k = (LOOSE[o.k] ?? 1) + (o.k === 'fishery' && s.zones[o.zone]?.k === 'ice' ? 1 : 0);
      const top = o.k === 'tree' || o.k === 'fruit' ? 0.09 : o.k === 'fishery' ? 0.01 : 0.03;
      for (let i = 0; i < k; i++) {
        const it = o.k === 'hot' && s.rng() < 0.35 ? 'coin' : OD[o.k]!.sub;
        loot(s, it, o.x + (s.rng() - 0.5) * 0.03, clamp(o.y + 0.02 + s.rng() * 0.03, B0 + 0.01, B1), top, (o.x < x ? -1 : 1) * (0.0006 + s.rng() * 0.0012));
        n++;
      }
    }
  }
  const prev = s.bestThud;
  s.bestThud = Math.max(s.bestThud, n);
  if (joined > s.joinBest) s.joinBest = joined;
  ev(s, 'thud', x, FEET, n, floors(s), sq);
  if (!s.awake && s.stage >= 0) (s.awake = true), ev(s, 'wake', s.sx, 0.55), see(s, 'storm');
  if (joined) ev(s, 'joinall', x, FEET - 0.1, joined);
  // 큰 띠: 찌부 · 여럿 데려옴 · 이 판 최고 쿵
  if (sq) wow(s, sq > 1 ? `찌부! ×${sq}` : '찌부!', sq);
  else if (joined >= 3) wow(s, `+${joined}명! "성이다!"`, joined);
  else if (n >= WOW_N && n > prev) wow(s, `쿵! ${n}개 우수수`, n);
  s.freeze = Math.max(s.freeze, n >= 6 || sq ? 5 : 3);
  checkStar3(s);
}
function join(s: GiantState, o: Obj) {
  o.dead = true;
  const p = newPerson(s, o.x, o.y, P_JOIN);
  if (p) (s.sp += 5), (p.job = null);
  ev(s, 'join', o.x, o.y - 0.05, pop(s));
  checkStar3(s);
}
function bossSlam(s: GiantState, o: Obj) {
  const dmg = 22 + 3 * floors(s) + 5 * s.parts.wall + 2 * s.lv;
  o.hp -= dmg;
  o.hitT = s.t;
  o.slamT = s.t;
  o.stun = 70;
  s.slam++;
  ev(s, 'slam', o.x, o.y - MD[o.mk!].r * 1.2, Math.round(dmg), s.slam);
  if (o.hp <= 0) kill(s, o, false);
  else (o.x += 0.07), (o.hx = o.x), wow(s, `대장에게 쿵! ${s.slam}`, s.slam);
  checkStar3(s);
}
/** 몬스터가 쓰러진다: 보물 상자 · 소굴이 비면 갇힌 사람들이 풀려난다 */
function kill(s: GiantState, o: Obj, squash: boolean) {
  const md = MD[o.mk!];
  o.dead = true;
  o.hp = 0;
  for (const p of s.people) if (p.tgt === o) release(s, p), p.st === P_WORK && (p.st = P_IDLE);
  const c = obj(s, 'chest', o.x, clamp(o.y + 0.01, B0 + 0.02, B1), o.zone, md.gold + Math.floor(s.stage / 3));
  c.z = 0.05;
  c.vz = 0.006;
  if (squash) (s.squash++, (s.sp += 10)), see(s, 'squash');
  ev(s, squash ? 'squash' : 'mdie', o.x, o.y, md.boss ? 2 : 1, 0, 0, o.mk!);
  if (md.boss) {
    s.sp += 80;
    wow(s, `${md.name}을 물리쳤다!`, 10);
    see(s, 'bosskill');
  }
  if (!s.objs.some((q) => q.k === 'mon' && q.zone === o.zone && !q.dead))
    for (const c2 of s.objs)
      if (c2.k === 'cage' && c2.zone === o.zone && !c2.dead) {
        c2.dead = true;
        let k = 0;
        for (let i = 0; i < c2.amt; i++) if (newPerson(s, c2.x + (i - 1) * 0.015, c2.y + 0.03, P_JOIN)) k++;
        s.sp += 5 * k;
        ev(s, 'free', c2.x, c2.y - 0.04, k);
        checkStar3(s);
      }
  checkStar3(s);
}

// ───────────────────────────── 사람 ─────────────────────────────
function release(_s: GiantState, p: Per) {
  const o = p.tgt;
  if (o) {
    if (o.k === 'loot') o.claim === p.id && (o.claim = -1);
    else o.workers = Math.max(0, o.workers - 1);
  }
  p.tgt = null;
}
const jobOf = (o: Obj): Job => (o.k === 'mon' || o.k === 'chest' ? 'knight' : o.k === 'loot' ? ITEM_JOB[o.sub] : OD[o.k]!.job);
/** 일감 고르기: 떨어진 것 먼저, 그다음 가까운 일(나무는 둘, 바위는 셋까지) */
function assign(s: GiantState, p: Per) {
  release(s, p);
  const wr = workR(s), cx = s.cx;
  let best: Obj | null = null, bd = 1e9;
  for (const o of s.objs) {
    if (o.dead) continue;
    const dx = Math.abs(o.x - cx);
    if (dx > wr + (o.k === 'mon' ? 0.05 : 0)) continue;
    let c = Math.abs(o.x - p.x) + Math.abs(o.y - p.y) * 0.5;
    if (o.k === 'loot') {
      if (o.claim >= 0 || o.z > 0.001) continue;
      c -= 0.08;
    } else if (o.k === 'mon') {
      if (o.hp <= 0 || o.workers >= (MD[o.mk!].boss ? 16 : 5)) continue;
      c += 0.02;
    } else if (o.k === 'chest') {
      if (o.amt <= 0 || o.workers >= 3 || o.z > 0.001) continue;
      c -= 0.04;
    } else {
      const od = OD[o.k];
      if (!od || o.amt <= 0 || o.workers >= od.cap) continue;
    }
    if (c < bd) (bd = c), (best = o);
  }
  if (!best) {
    p.st = P_IDLE;
    p.tm = 20 + (p.id % 7) * 3;
    p.hx = cx + ((p.id * 37) % 13 - 6) * 0.011;
    return;
  }
  p.tgt = best;
  p.st = P_OUT;
  if (best.k === 'loot') best.claim = p.id;
  else best.workers++;
  const j = jobOf(best);
  p.job = j;
  if (!s.dexJ.includes(j)) s.dexJ.push(j), s.newDex.push('j:' + j), see(s, 'job:' + j);
}
const slowAt = (s: GiantState, x: number) => s.zones.some((z) => z.k === 'swamp' && x > z.x0 && x < z.x1);
/** (x,y)로 한 걸음 — 닿으면 true */
function moveTo(p: Per, x: number, y: number, v: number) {
  const dx = x - p.x, dy = (y - p.y) * 1.6, d = hyp(dx, dy);
  if (d <= v) return (p.x = x), (p.y = y), true;
  p.x += (dx / d) * v;
  p.y += (dy / d) * v / 1.6;
  if (Math.abs(dx) > 0.002) p.dir = dx > 0 ? 1 : -1;
  return false;
}
const gateY = FEET + 0.012;
function personStep(s: GiantState, p: Per) {
  const slow = slowAt(s, p.x) ? 0.6 : 1, flag = 1 + 0.12 * s.parts.flag, sprint = P_SPRINT * (s.perk[0] === 2 ? 1.6 : 1);
  switch (p.st) {
    case P_OUT: {
      const o = p.tgt;
      if (!o || o.dead || (o.k !== 'mon' && o.k !== 'loot' && o.amt <= 0) || (o.k === 'mon' && o.hp <= 0)) return assign(s, p);
      const side = o.k === 'mon' ? (p.x < o.x ? -1 : 1) * (MD[o.mk!].r + 0.012 + (p.id % 3) * 0.008) : o.k === 'tree' || o.k === 'fruit' ? (p.id % 2 ? 0.012 : -0.012) : 0;
      if (moveTo(p, o.x + side, clamp(o.y + (o.k === 'tree' || o.k === 'fruit' ? 0.012 : 0.004), B0, B1), P_WALK * slow * flag)) {
        if (o.k === 'loot') {
          o.dead = true;
          p.carry = o.sub;
          p.tgt = null;
          p.st = P_BACK;
          ev(s, 'pick', o.x, o.y);
        } else {
          p.st = P_WORK;
          p.tm = o.k === 'mon' ? 20 : Math.round((OD[o.k]?.work ?? 30) / flag);
          p.dir = o.x >= p.x ? 1 : -1;
        }
      }
      break;
    }
    case P_WORK: {
      const o = p.tgt;
      if (!o || o.dead || (o.k !== 'mon' && o.amt <= 0)) return assign(s, p);
      if (o.k === 'mon') {
        if (o.hp <= 0) return assign(s, p);
        if (--p.tm <= 0) {
          p.tm = 34;
          o.hp -= (MD[o.mk!].boss ? 0.5 : 1) * (s.parts.forge ? 2 : 1);
          o.hitT = s.t;
          if (s.t % 3 === 0) ev(s, 'whack', o.x + (p.x - o.x) * 0.5, o.y - 0.02);
          if (o.hp <= 0) kill(s, o, false);
        }
        break;
      }
      if (--p.tm <= 0) {
        o.amt--;
        p.carry = o.k === 'hot' && s.rng() < 0.35 ? 'coin' : o.k === 'chest' ? 'coin' : OD[o.k]!.sub;
        if (o.k === 'tree' || o.k === 'rock' || o.k === 'hot') ev(s, o.k === 'tree' ? 'chop' : 'clink', o.x, o.y - 0.03);
        if (o.amt <= 0) {
          o.fallT = s.t;
          if (o.k === 'chest') o.dead = true;
          ev(s, 'empty', o.x, o.y, 0, 0, 0, o.k);
        }
        release(s, p);
        p.st = P_BACK;
      }
      break;
    }
    case P_BACK:
      if (!s.cdown) return void ((p.st = P_HOP), (p.tm = 22));
      if (moveTo(p, s.cx + ((p.id % 5) - 2) * 0.004, gateY, P_CARRY * slow * flag)) {
        if (p.carry) deposit(s, p.carry, s.cx), (p.carry = null);
        if (s.gst === G_DOWN && s.arrive === 0) assign(s, p);
        else p.st = P_IN;
      }
      break;
    case P_IDLE:
      if (!s.cdown) return void ((p.st = P_HOP), (p.tm = 22));
      moveTo(p, p.hx, gateY + 0.02 + (p.id % 4) * 0.02, P_WALK * 0.5);
      if (--p.tm <= 0 && s.arrive === 0) {
        p.tm = 24;
        assign(s, p);
      }
      break;
    case P_RUN:
      if (!s.cdown) return void ((p.st = P_HOP), (p.tm = 18));
      if (moveTo(p, s.cx, gateY, sprint)) {
        if (p.carry) deposit(s, p.carry, s.cx), (p.carry = null);
        p.st = P_IN;
      }
      break;
    case P_HOP: {
      // 창문으로 폴짝: 성을 메고 있으면 거인 등, 내려져 있으면 성문
      const tx = s.cdown ? s.cx : s.gx - 0.035;
      const k = 1 / Math.max(1, p.tm);
      p.x += (tx - p.x) * k;
      p.y += (gateY - p.y) * k;
      p.z = Math.max(p.z, 0) + 0.004 * Math.max(0, p.tm - 9) - (p.tm < 9 ? 0.004 : 0);
      if (--p.tm <= 0) {
        if (p.carry) deposit(s, p.carry, tx), (p.carry = null);
        p.z = 0;
        p.st = P_IN;
      }
      break;
    }
    case P_FLY:
      p.x += p.vx;
      p.z += p.vz;
      p.vz -= 0.0008;
      if (p.z <= 0 && p.vz < 0) (p.z = 0), (p.st = P_DIZZY), (p.tm = 55), ev(s, 'land', p.x, p.y);
      break;
    case P_DIZZY:
      if (--p.tm <= 0) {
        if (s.cdown && s.gst === G_DOWN && s.arrive === 0) assign(s, p);
        else if (s.cdown) p.st = P_RUN;
        else (p.st = P_HOP), (p.tm = 24);
      }
      break;
    case P_JOIN:
      if (!s.cdown) {
        (p.st = P_HOP), (p.tm = 26);
        break;
      }
      if (moveTo(p, s.cx, gateY, P_WALK * 1.6)) {
        if (s.gst === G_DOWN && s.arrive === 0) assign(s, p);
        else p.st = P_IN;
      }
      break;
    case P_BLOWN:
      p.x -= 0.006 + p.tm * 0.0002;
      p.z += 0.005;
      p.tm++;
      break;
  }
}
function pourStep(s: GiantState) {
  if (!s.cdown || s.gst !== G_DOWN || s.pourQ <= 0) return;
  if (s.gt % POUR_EVERY) return;
  const p = s.people.find((q) => q.st === P_IN);
  if (!p) return void (s.pourQ = 0);
  s.pourQ--;
  p.x = s.cx + (s.rng() - 0.5) * 0.02;
  p.y = gateY;
  p.z = 0;
  p.dir = p.id % 2 ? 1 : -1;
  if (s.arrive > 0) {
    p.st = P_IDLE;
    p.tm = 9999;
    p.hx = s.cx + ((p.id * 37) % 21 - 10) * 0.012;
  } else assign(s, p);
  if (s.pourQ % 3 === 0) ev(s, 'pour', s.cx, gateY, pop(s) - s.pourQ);
}

// ───────────────────────────── 몬스터 · 김 구멍 · 떠돌이 ─────────────────────────────
function objStep(s: GiantState) {
  for (const o of s.objs) {
    if (o.dead) continue;
    if (o.k === 'loot' || o.k === 'chest') {
      if (o.z > 0 || o.vz > 0) {
        o.z += o.vz;
        o.vz -= 0.0007;
        o.x += o.vx;
        if (o.z <= 0) {
          o.z = 0;
          o.vx *= 0.4;
          o.vz = o.vz < -0.004 ? -o.vz * 0.3 : 0;
          if (!o.vz) ev(s, 'plop', o.x, o.y, 0, 0, 0, o.sub);
        }
      }
      continue;
    }
    if (o.k === 'folk') {
      // 떠돌이: 어슬렁 — 내려진 성 곁에 오면 들어온다
      o.x += Math.sin((s.t + o.v) * 0.02) * 0.0005;
      if (s.cdown && s.gst === G_DOWN && s.arrive === 0 && Math.abs(o.x - s.cx) < workR(s) * 0.8) join(s, o);
      continue;
    }
    if (o.k !== 'mon' || !o.mk) continue;
    const md = MD[o.mk];
    if (o.stun > 0) {
      o.stun--;
      continue;
    }
    if (o.wind > 0) {
      if (--o.wind === 0) {
        // 내리친다: 곁의 사람이 붕 날아간다
        let n = 0;
        for (const p of s.people) {
          if (!outside(p) || p.st === P_FLY || p.st === P_HOP || p.st === P_BLOWN) continue;
          const dx = p.x - o.x;
          if (Math.abs(dx) < md.reach && Math.abs(p.y - o.y) < 0.09) {
            release(s, p);
            p.st = P_FLY;
            p.vx = (dx >= 0 ? 1 : -1) * (0.003 + ((p.id * 13) % 7) * 0.0006);
            p.vz = 0.011 + ((p.id * 7) % 5) * 0.0012;
            n++;
          }
        }
        ev(s, md.boss ? 'bslam' : 'mslam', o.x + o.dir * md.r * 0.8, o.y, n);
      }
      continue;
    }
    const near = s.people.some((p) => (p.st === P_WORK || p.st === P_OUT) && p.tgt === o && Math.abs(p.x - o.x) < md.reach + 0.03);
    if (near) {
      if (++o.atkT >= md.atk) (o.atkT = 0), (o.wind = md.boss ? 34 : 24), ev(s, 'wind', o.x, o.y - md.r * 2);
    } else if (!md.boss) {
      // 어슬렁 (소굴 안에서만)
      o.x = o.hx + Math.sin((s.t + o.v) * 0.015) * 0.03;
      o.dir = Math.cos((s.t + o.v) * 0.015) > 0 ? 1 : -1;
    }
  }
  // 김 구멍(화산): 가끔 펑 — 곁의 사람이 붕
  if (++s.geyT % 200 === 0)
    for (const g of s.objs) {
      if (g.k !== 'geyser' || g.dead) continue;
      let n = 0;
      for (const p of s.people)
        if (outside(p) && p.st !== P_FLY && p.st !== P_HOP && p.st !== P_BLOWN && Math.abs(p.x - g.x) < 0.045)
          release(s, p), (p.st = P_FLY), (p.vx = (p.x >= g.x ? 1 : -1) * 0.002), (p.vz = 0.016), n++;
      g.hitT = s.t;
      ev(s, 'geyser', g.x, g.y, n);
    }
  if (s.objs.length > 140 || s.t % 120 === 0) s.objs = s.objs.filter((o) => !o.dead || o.k === 'cage' || s.t - o.born < 2);
}
/** 대포: 성이 내려져 있으면 가까운 몬스터에게 쾅 */
function cannonStep(s: GiantState) {
  for (const sh of s.shots) {
    if (++sh.t < sh.T) continue;
    const o = sh.tgt;
    if (!o.dead && o.hp > 0) {
      const dmg = sh.boss ? 9 : 6;
      o.hp -= dmg;
      o.hitT = s.t;
      o.stun = Math.max(o.stun, 24);
      ev(s, 'boom', sh.x1, sh.y1, dmg);
      if (o.hp <= 0) kill(s, o, false);
    } else ev(s, 'boom', sh.x1, sh.y1, 0);
  }
  s.shots = s.shots.filter((q) => q.t < q.T);
  const n = s.parts.cannon;
  if (!n || !s.cdown || s.gst !== G_DOWN || s.arrive) return;
  if (++s.canT < Math.max(36, 110 - 25 * (n - 1))) return;
  let best: Obj | null = null, bd = 0.7;
  for (const o of s.objs) if (o.k === 'mon' && alive(o) && Math.abs(o.x - s.cx) < bd) (bd = Math.abs(o.x - s.cx)), (best = o);
  if (!best) return;
  s.canT = 0;
  const top = castleTop(s), y0 = top + 0.06, boss = !!MD[best.mk!].boss;
  s.shots.push({ x0: s.cx + (best.x > s.cx ? 0.06 : -0.06), y0, x1: best.x, y1: best.y - MD[best.mk!].r, t: 0, T: 22, tgt: best, boss });
  ev(s, 'cannon', s.cx + (best.x > s.cx ? 0.06 : -0.06), y0);
}

// ───────────────────────────── 거인 ─────────────────────────────
function giantStep(s: GiantState) {
  if (s.gdz > 0) return void s.gdz--;
  switch (s.gst) {
    case G_WALK: {
      const goal = s.tx - DROP_DX, dx = goal - s.gx, v = walkV(s);
      s.gdir = dx >= 0 ? 1 : -1;
      const stp = Math.min(v, Math.abs(dx));
      const ph0 = Math.floor(s.wph / STRIDE);
      s.gx += s.gdir * stp;
      s.wph += stp;
      if (Math.floor(s.wph / STRIDE) !== ph0) ev(s, 'step', s.gx + s.gdir * 0.03, FEET);
      // 거대한 바퀴: 걷는 길의 것을 성 창문에서 손을 뻗어 줍는다
      if (s.perk[0] === 1)
        for (const o of s.objs) {
          if (o.dead || o.rolled || !OD[o.k] || o.k === 'chest' || o.amt <= 0 || Math.abs(o.x - (s.gx - 0.03)) > 0.03) continue;
          o.rolled = true;
          o.amt--;
          o.hitT = s.t;
          if (o.amt <= 0) o.fallT = s.t;
          deposit(s, OD[o.k]!.sub, s.gx - 0.03);
          ev(s, 'grab', o.x, o.y - 0.05, 0, 0, 0, OD[o.k]!.sub);
        }
      if (Math.abs(dx) <= v) (s.gst = G_DROP), (s.gt = 0), (s.cx = s.tx), ev(s, 'swing', s.gx, FEET - 0.3);
      break;
    }
    case G_DROP:
      if (++s.gt >= DROP_T) {
        s.gst = G_DOWN;
        s.gt = 0;
        s.cdown = true;
        s.pourQ = s.people.filter((p) => p.st === P_IN).length;
        const goal = s.cx >= s.goalX - 0.03;
        if (goal) (s.arrive = 1), (s.awake = false), ev(s, 'arrive', s.cx, FEET), see(s, 'arrive');
        thud(s);
        if (!isNaN(s.pend)) {
          const q = s.pend;
          s.pend = NaN;
          if (!goal) recall(s, clampTarget(s, q));
        }
      }
      break;
    case G_DOWN:
      s.gt++;
      // 큰 종: 폭풍이 일하는 사람 곁에 오면 저절로 땡땡
      if (s.perk[0] === 2 && s.awake && s.people.some((p) => outside(p) && p.x < s.sx + 0.16)) recall(s, NaN), ev(s, 'bell', s.cx, castleTop(s));
      break;
    case G_CALL: {
      s.gt++;
      const out = s.people.filter((p) => outside(p) && p.st !== P_FLY && p.st !== P_DIZZY).length;
      if (out === 0 || s.gt >= (s.perk[0] === 2 ? 18 : CALL_T)) {
        s.gst = G_LIFT;
        s.gt = 0;
        ev(s, 'lift', s.cx, castleTop(s));
      }
      break;
    }
    case G_LIFT:
      if (++s.gt >= LIFT_T) {
        s.cdown = false;
        // 아직 밖에 있던 사람은 창문으로 폴짝
        for (const p of s.people) if (outside(p) && p.st !== P_HOP && p.st !== P_FLY && p.st !== P_DIZZY) release(s, p), (p.st = P_HOP), (p.tm = 20);
        s.gx = s.cx - DROP_DX;
        if (isNaN(s.tx)) s.gst = G_STAND;
        else (s.gst = G_WALK), (s.gt = 0);
      }
      break;
  }
}

// ───────────────────────────── 폭풍 ─────────────────────────────
function stormStep(s: GiantState) {
  if (!s.awake || s.arrive) return;
  const body = s.cdown ? s.cx - HALF : s.gx - 0.05, gap = body - s.sx;
  // 멀리 처지면 서둘러 따라온다(늘 뒤에 보이게)
  s.sx += stormV(s) * (gap > 0.95 ? 2 : gap > 0.7 ? 1.4 : 1);
  for (const p of s.people)
    if (outside(p) && p.st !== P_BLOWN && p.x < s.sx + 0.01 && pop(s) - countBlown(s) > 4) {
      release(s, p);
      p.st = P_BLOWN;
      p.tm = 0;
      p.carry = null;
      s.lost++;
      ev(s, 'blown', p.x, p.y - p.z);
      see(s, 'blown');
    }
  if (s.people.some((p) => p.st === P_BLOWN && p.tm > 80)) s.people = s.people.filter((p) => !(p.st === P_BLOWN && p.tm > 80));
  if (s.sx >= body) stormHit(s);
}
const countBlown = (s: GiantState) => s.people.reduce((a, p) => a + (p.st === P_BLOWN ? 1 : 0), 0);
function stormHit(s: GiantState) {
  s.hits++;
  // 폭풍에 닿으면 밖에 있던 사람 몇(폭풍 쪽 둘까지)은 빙글빙글 날아가고, 나머지는 성 창문으로 폴짝
  const out = s.people.filter((p) => outside(p) && p.st !== P_BLOWN).sort((a, b) => a.x - b.x);
  out.forEach((p, i) => {
    release(s, p);
    p.carry = null;
    if (i < 2 && pop(s) - countBlown(s) > 4) (p.st = P_BLOWN), (p.tm = 0), s.lost++, ev(s, 'blown', p.x, p.y - p.z);
    else (p.st = P_HOP), (p.tm = 20);
  });
  const at = s.cdown ? s.cx - DROP_DX : s.gx;
  s.cdown = false;
  s.pourQ = 0;
  s.gx = at + 0.2;
  s.gst = isNaN(s.tx) || s.gst === G_DOWN || s.gst === G_CALL || s.gst === G_LIFT || s.gst === G_DROP ? G_STAND : G_WALK;
  s.tx = s.gst === G_WALK ? Math.max(s.tx, s.gx + DROP_DX) : NaN;
  s.gdz = DIZZY_T;
  s.sx = s.gx - 0.62;
  s.freeze = 6;
  see(s, 'stormhit');
  ev(s, 'stormhit', s.gx, FEET - 0.25);
  if (s.stage > 0) {
    s.hearts--;
    ev(s, 'heart', s.gx, FEET - 0.45);
    if (s.hearts <= 0) return void ((s.phase = 'end'), (s.pt = 0), ev(s, 'end', s.gx, FEET, 0));
  }
}

// ───────────────────────────── 판 흐름 ─────────────────────────────
function clearStage(s: GiantState) {
  s.phase = 'result';
  s.pt = 0;
  s.starOk = [true, s.lost === 0 && s.hits === 0, star3(s)];
  s.got = s.starOk.filter(Boolean).length;
  s.stars += s.got;
  s.gain = (s.sp + CLEAR_PTS + pop(s) * 2) * STAR_MUL[s.got];
  s.pts += s.gain;
  s.sp = 0;
  s.lv++;
  s.route.push(s.got);
  see(s, 'lv' + s.lv);
  s.spot = null;
  if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * 30);
  ev(s, 'clear', s.cx, FEET, s.got);
}
function advance(s: GiantState) {
  const d = STAGES[s.stage];
  if (s.won) return void ((s.phase = 'end'), (s.pt = 0), ev(s, 'end', s.cx, FEET, 1));
  if (d.boss && d.ch < PERKS.length && !s.perk[d.ch]) return void ((s.phase = 'pick'), (s.pt = 0), (s.picked = -1), see(s, 'pick' + d.ch), ev(s, 'pickopen', 0.5, FEET));
  s.stage++;
  newStage(s);
}
function camStep(s: GiantState) {
  const want = s.cdown ? s.cx - CAM_C : s.gx - CAM_G;
  s.cam += (want - s.cam) * (s.gst === G_WALK ? 0.12 : 0.07);
}
function playStep(s: GiantState) {
  s.stageT++;
  giantStep(s);
  pourStep(s);
  for (const p of s.people) personStep(s, p);
  objStep(s);
  cannonStep(s);
  stormStep(s);
  if (s.phase !== 'play') return;
  camStep(s);
  if (s.arrive > 0 && ++s.arrive >= ARRIVE_T) clearStage(s);
}

const game: GameDef<GiantState> & { wows(s: GiantState): number } = {
  id: 'castlegiant',
  name: '🏰 성을 등에 진 거인',
  genes: ['castlegiant', 'pointer', 'collect'],
  twist: '성이 곧 망치이자 곳간 — 톡 한 곳에 성을 쿵 내려놓는 순간 그 땅이 흔들려 통나무·물고기가 쏟아지고, 성문에서 사람들이 개미떼처럼 나와 그 땅을 쓴다. 다 쓰면 메고 폭풍을 피해 다음 땅으로',
  rules: [
    '땅을 톡 하면 거인이 그 자리에 성을 쿵! 사람들이 쏟아져 나와 일해요.',
    '다른 땅을 톡 하면 사람들을 불러 성을 메고 그리로. 모은 것으로 성이 자라요.',
    '뒤에서 폭풍이 따라와요. 새 땅까지 가면 다음 판!',
  ],
  controls: 'touch',
  hint: '땅을 톡 — 거인이 그 자리에 성을 쿵! / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '성을 등에 진 순한 거인의 여행 — 옆으로 펼쳐진 그림책 땅',
    mood: '햇살 가득한 골짜기를 커다란 거인이 쿵쿵 걷는다. 등에 진 작은 성의 창문마다 사람들이 손을 흔들고, 성을 내려놓으면 성문에서 개미떼처럼 쏟아져 나와 나무를 베고 물고기를 낚는다. 뒤에선 심술궂은 먹구름이 우르릉 따라온다.',
    palette: { bg: '#9fdcf5', ink: '#3b2a20', muted: '#8a7a66', accent: '#ffb84a', hot: '#ff5a4e', soft: '#f6e7c1' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.hearts,
  cleared: (s) => (s.phase === 'result' ? { stage: s.stage, got: s.got, of: 3 } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, hearts: 3, pts: 0, sp: 0, stars: 0, got: 0, starOk: [false, false, false], dead: false, won: false, gain: 0,
      lv: 1, perk: [0, 0], picked: -1,
      parts: { tower: 0, mill: 0, wheel: 0, cannon: 0, wall: 0, flag: 0, forge: 0, garden: 0, roof: 0 }, built: [], store: zero(), wish: null, wishGot: zero(), food: 0,
      dexP: [], dexJ: [], newDex: [], zones: [], objs: [], people: [], nid: 0, shots: [], canT: 0, geyT: 0,
      gx: 0.28, gst: G_STAND, gt: 0, tx: NaN, pend: NaN, gdir: 1, wph: 0, gdz: 0, cdown: false, cx: 0.28, pourQ: 0, cam: 0,
      sx: -0.36, awake: false, hits: 0, lost: 0, goalX: 3,
      drops: 0, bestThud: 0, squash: 0, slam: 0, joinBest: 0, partsStage: 0, goldStage: 0, stageT: 0, arrive: 0, route: [],
      firstTap: -1, firstBig: -1, wowN: 0, freeze: 0, down: false, seen: new Set<string>(), events: [], banner: null, spot: null, big: null, star3At: -1,
    } as GiantState;
    for (let i = 0; i < POP0; i++) newPerson(s, 0.25, FEET, P_IN);
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
      if (tap && p) onTap(s, s.cam + p.x, p.y * A);
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
      } else if (s.pt >= PICK_AFTER) s.stage++, newStage(s);
    } else if (s.pt >= END_T) s.dead = true;
    if (s.events.length > 120) s.events.splice(0, s.events.length - 120);
    while (s.events.length && s.t - s.events[0].t > 120) s.events.shift();
  },
  over: (s) => s.dead,
  score: (s) => s.pts + s.sp,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const castlegiant = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
/** 세상 x에 톡 (땅 높이) */
const at = (s: GiantState, wx: number, wy = FEET + 0.07): Input => ({ tap: false, dir: 0, pointer: { x: clamp(wx - s.cam, 0.01, 0.99), y: wy / A } });
const can = (s: GiantState) => s.phase === 'play' && !s.down && s.arrive === 0 && s.gdz === 0;
/** 결과 화면·둘 중 하나는 버릇 봇도 그냥 넘긴다 */
function between(s: GiantState, left: boolean): Input | null {
  if (s.phase === 'play') return null;
  if (s.down) return NO;
  if (s.phase === 'result') return s.pt >= RES_MIN ? { tap: false, dir: 0, pointer: { x: 0.5, y: 0.8 / A } } : NO;
  if (s.phase === 'pick') return s.picked < 0 && s.pt >= PICK_MIN ? { tap: false, dir: 0, pointer: { x: left ? 0.28 : 0.72, y: 0.86 / A } } : NO;
  return NO;
}
/** 지금 성이 바라는 것이면 더 값지다 */
function resW(s: GiantState, r: Res) {
  const need = !!s.wish && (PD[s.wish].need[r] ?? 0) > s.wishGot[r];
  return (r === 'gold' ? 3 : 1) * (need ? 1.8 : 1) * (r === 'food' && pop(s) >= POP_MAX ? 0.4 : 1);
}
/** 여기에 성을 내려놓으면 얼마나 얻을까 (어림셈). cur = 지금 내려져 있는 자리(쿵은 이미 했다) */
export function spotValue(s: GiantState, x: number, cur = false): number {
  const wr = workR(s), tr = thudR(s), [sk, sn] = STAGES[s.stage].star, want3 = s.star3At < 0;
  let v = 0, loose = 0, joined = 0;
  for (const o of s.objs) {
    if (o.dead) continue;
    const dx = Math.abs(o.x - x);
    if (dx > wr + 0.06) continue;
    if (o.k === 'mon' && o.mk) {
      const md = MD[o.mk];
      if (o.hp <= 0) continue;
      if (!cur && dx < HALF + md.r * 0.6) v += md.boss ? 40 + (want3 && sk === 'slam' ? 30 : 0) : md.gold * 3 + 12 + (want3 && sk === 'squash' ? 30 : 0);
      else if (dx < wr) v += md.boss ? 6 : md.gold * 3 * (pop(s) >= 8 || s.parts.cannon ? 0.6 : 0.3);
      continue;
    }
    if (o.k === 'folk') {
      if (dx < wr) (v += 6), joined++;
      continue;
    }
    if (o.k === 'loot') {
      if (dx < wr) v += resW(s, RES_OF[o.sub]);
      continue;
    }
    if (o.k === 'chest') {
      if (dx < wr) v += o.amt * 3;
      continue;
    }
    const od = OD[o.k];
    if (!od || dx > wr || o.amt <= 0) continue;
    const w = resW(s, RES_OF[od.sub]);
    v += o.amt * w * 0.8;
    if (!cur && dx < tr && !o.shaken) {
      const k = LOOSE[o.k] ?? 1;
      v += k * w * 1.5;
      loose += k;
    }
  }
  if (want3 && sk === 'thud' && loose >= sn) v += 25;
  if (want3 && sk === 'join' && joined >= sn) v += 25;
  return v;
}
/** 화면 안에서 가장 좋은 내려놓을 자리 (가는 시간·폭풍까지 셈) */
function bestSpot(s: GiantState): { x: number; v: number } {
  const v = stormV(s), lo = Math.max(s.cam + 0.04, s.awake ? s.sx + 0.3 : 0.2), hi = Math.min(s.cam + 0.98, s.goalX - 0.04);
  let bx = hi, bv = -1e9;
  for (let x = lo; x <= hi; x += 0.02) {
    if (s.cdown && Math.abs(x - s.cx) < 0.12) continue;
    const from = s.cdown ? s.cx - DROP_DX : s.gx, travel = Math.abs(x - DROP_DX - from) / walkV(s) + (s.cdown ? 70 : 16);
    const safe = !s.awake || s.sx + v * 1.4 * (travel + 300) < x - HALF - 0.05;
    const val = spotValue(s, x) - travel * 0.04 - (safe ? 0 : 30);
    if (val > bv) (bv = val), (bx = x);
  }
  if (s.goalX < s.cam + 1.0 && !bossOf(s) && bv < 14) return { x: s.goalX, v: 99 };
  return { x: bx, v: bv };
}
/** 봇: 성이 바라는 것 + 땅의 양 + 폭풍 거리를 셈해 내려놓고, 덜 남으면 메고 떠난다 */
export const castlegiantSmart: Bot<GiantState> = {
  name: '바라는 것 + 땅의 양 + 폭풍 거리',
  act(s) {
    const mid = between(s, s.stage < 4);
    if (mid) return mid;
    if (!can(s)) return NO;
    if (s.gst !== G_DOWN && s.gst !== G_STAND) return NO;
    if (s.gst === G_DOWN) {
      if (s.gt < 30 || s.t % 6) return NO;
      const danger = s.awake && s.sx + stormV(s) * 150 > s.cx - HALF - 0.1;
      const idle = s.people.filter((p) => p.st === P_IDLE).length / Math.max(1, pop(s));
      const rem = spotValue(s, s.cx, true);
      const b = bossOf(s);
      if (!danger && !(b && Math.abs(b.x - s.cx) < 0.5 && b.stun <= 0) && idle < 0.55 && s.gt < 900) {
        const c = bestSpot(s);
        if (rem > Math.max(5, c.v * 0.35)) return NO;
        return at(s, c.x);
      }
    }
    const b = bossOf(s);
    if (b && b.x < s.cam + 1.0) return at(s, b.x);
    return at(s, bestSpot(s).x);
  },
};
/** 봇: 아무 때나 아무 데나 톡 */
export const castlegiantRandom: Bot<GiantState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    if (s.down) return NO;
    return rng() < 1 / 40 ? { tap: false, dir: 0, pointer: { x: 0.04 + rng() * 0.92, y: (0.2 + rng() * 1.1) / A } } : NO;
  },
};
const hasStuff = (s: GiantState, zi: number) => s.objs.some((o) => o.zone === zi && !o.dead && (o.amt > 0 || o.k === 'mon' || o.k === 'folk'));
/** 버릇 봇: 사람들이 일을 다 하면, 늘 바로 앞 땅의 첫머리에 */
export const castlegiantHabit: Bot<GiantState> = {
  name: '버릇: 늘 바로 앞 땅',
  act(s) {
    const mid = between(s, true);
    if (mid) return mid;
    if (!can(s)) return NO;
    if (s.gst === G_DOWN) {
      if (s.gt < 40) return NO;
      const busy = s.pourQ > 0 || s.people.some((p) => p.st === P_OUT || p.st === P_WORK || p.st === P_BACK);
      if (busy && !(s.awake && s.sx > s.cx - HALF - 0.2)) return NO;
    } else if (s.gst !== G_STAND) return NO;
    const from = s.cdown ? s.cx + 0.12 : s.gx + DROP_DX + 0.02;
    const zi = s.zones.findIndex((z, i) => z.k !== 'goal' && z.x1 > from && hasStuff(s, i));
    const x = zi >= 0 ? Math.max(s.zones[zi].x0 + 0.03, from) : s.goalX;
    return at(s, x);
  },
};
/** 독립 버릇 봇: 늘 오래 머물기(폭풍이 코앞에 올 때까지) — 그다음 다음 땅 한가운데 */
export const castlegiantHabit2: Bot<GiantState> = {
  name: '버릇: 늘 오래 머물기(폭풍 직전까지)',
  act(s) {
    const mid = between(s, false);
    if (mid) return mid;
    if (!can(s)) return NO;
    if (s.gst === G_DOWN) {
      if (!(s.awake && s.sx > s.cx - HALF - 0.24)) return NO;
    } else if (s.gst !== G_STAND) return NO;
    const from = s.cdown ? s.cx + 0.16 : s.gx + DROP_DX;
    const zi = s.zones.findIndex((z, i) => z.k !== 'goal' && (z.x0 + z.x1) / 2 > from && hasStuff(s, i));
    const x = zi >= 0 ? (s.zones[zi].x0 + s.zones[zi].x1) / 2 : s.goalX;
    return at(s, x);
  },
};
/** 측정·스크린샷용: k판으로 건너뛰기 (성 부품·식구·레벨을 그 판쯤으로) */
export const __jump = (s: GiantState, k: number) => {
  s.stage = k;
  s.lv = k + 1;
  s.perk = [k > 3 ? 1 : 0, k > 7 ? 2 : 0];
  const seq: PK[] = ['tower', 'mill', 'tower', 'wheel', 'cannon', 'tower', 'wall', 'cannon', 'wall', 'flag', 'wall', 'forge', 'flag', 'garden', 'wall'];
  for (const p of seq.slice(0, Math.round(k * 1.3))) if (PD[p].from <= k && s.parts[p] < PD[p].max) s.parts[p]++, s.built.push(p), s.dexP.includes(p) || s.dexP.push(p);
  for (let i = 0; i < k * 2; i++) newPerson(s, 0.25, FEET, P_IN);
  s.wish = null;
  newStage(s);
};

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
function drawAll(ctx: C2, s: GiantState, w: number, h: number, _th: Theme) {
  const fx = juice(s);
  fx.memo.t = s.t;
  ctx.fillStyle = '#9fdcf5';
  ctx.fillRect(0, 0, w, h);
}
