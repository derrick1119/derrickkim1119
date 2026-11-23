/**
 * 🏰 성을 등에 진 거인 (43라운드 메뉴 5 — 오너가 고른 아이디어) — 성 쿵 내려놓기 × 땅마다 다른 일 × 성 키우기.
 * 메뉴 약속(그대로): 성을 통째로 등에 지고 걷는 거인 — 톡 한 곳에 쿵 내려놓으면 성 안 사람들이 우르르 쏟아져 나와 밭을 갈고 나무를 베고
 *   몬스터와 싸워요. 다 쓰면 다시 들쳐 메고 다음 땅으로.
 * 조작은 톡 하나:
 *   ① 땅을 톡 → 거인이 쿵쿵 걸어가 그 자리에 성을 **쿵** 내려놓는다. 쿵 한 번이 큰 일: 둘레 나무에서 통나무가 우수수, 강에서 물고기가 펄떡,
 *      바위가 쩍, 성 밑에 깔린 몬스터는 찌부, 떠돌이 사람들은 "성이다!" 하고 달려온다. 곧 성문이 열리며 작은 사람들이 개미떼처럼 쏟아져 나와
 *      저절로 그 땅의 일(나무꾼·농부·어부·광부·기사…). 얻은 것을 줄지어 성으로 나르면 성 위의 '바라는 부품'(그림 + 필요한 것)이 차고,
 *      다 차면 성이 한 층 자란다(망루·풍차·물레방아·대포·성벽·깃발탑…). 먹을 것 넷마다 새 사람이 창문에서 폴짝.
 *   ② 성이 내려져 있을 때 점선(일하는 범위) 안의 덩어리를 톡 → 거인이 큰 손으로 한 움큼 퍼 올려 성에 와르르(1초쯤 쉼).
 *      사람들이 일하던 덩어리면 더 많이 나온다(함께 하면 와르르). 떠돌이는 손에 담겨 식구가 되고, 몬스터는 휙 튕긴다(대장은 안 됨).
 *   ③ 점선 밖의 땅을 톡 → 뿌우 나팔! 사람들이 우르르 뛰어 돌아오고(늦은 사람은 창문으로 폴짝) 거인이 성을 들쳐 메고 그리로.
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
 * 별(쉬운 말 셋): 새 땅까지 가기 · 폭풍에 아무도 안 날리기 · 판마다 다른 솜씨 — 모두 '어디에 쿵 하나'를 묻는다:
 *   한 번 쿵에 N개(빽빽한 곳 한가운데) · 식구 N명 · 몬스터 찌부 N(몬스터 바로 위 — 앞줄·뒷줄을 겨눠야) · 쿵 N번 안에 새 땅(좋은 곳만 골라 건너뛰기)
 *   · 한 번에 N명 데려오기(떠돌이 넷 사이) · 대장을 N초 안에(대장 곁에 닿으면 재기 시작 — 쿵! 쿵! 쿵!).
 *   버릇 봇(늘 바로 앞 땅 · 늘 폭풍 직전까지 머물기)은 3판부터 별 셋이 드물다(폭풍 앞 바람이 오래 머문 일꾼을 날린다).
 * 점수: 나른 것 하나 1점(금 3점) · 부품 15점 · 찌부 10점 · 새 식구 5점, 판 점수는 별 수로 곱해진다(×1·×2·×4).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5, TAU = Math.PI * 2;
/** 3/4 시점 땅: 화면 좌표(가로 폭 = 1, 세로 0~1.5). y가 클수록 앞(가깝고 크게). 땅 = HZ(먼 끝) ~ 앞 끝, 물건은 B0~B1, 거인이 처음 서는 깊이 FEET */
const HZ = 0.7, FEET = 0.97, B0 = 0.76, B1 = 1.2;
/** 깊이에 따른 크기 (먼 끝 0.7 · 앞 끝 1.22) */
export const dscale = (y: number) => 0.7 + 0.52 * Math.max(0, Math.min(1, (y - B0) / (B1 - B0)));
const clampY = (y: number) => Math.max(B0 + 0.03, Math.min(B1 - 0.04, y));
/** 위 띠·지도 아래부터 놀이 화면 · 아래 띠 시작 */
const TOP = 0.17, BOT = 1.3;
/** 카메라: 성을 메고 있으면 거인이 화면 왼쪽 CAM_G 자리에, 내려놓으면 성이 CAM_C 자리에 */
const CAM_G = 0.3, CAM_C = 0.42;
/** 거인: 걸음(틱당) · 보폭 · 거인과 성 사이(내려놓는 자리) · 내려놓기 · 들기 · 나팔 뒤 기다림 최대 · 폭풍에 맞고 어질 */
const WALK_V = 0.0125, STRIDE = 0.19, DROP_DX = 0.19, DROP_T = 16, LIFT_T = 14, CALL_T = 40, DIZZY_T = 40;
/** 성 반폭(발자리) · 몬스터 찌부 판정(성 밑 가운데) */
const HALF = 0.11, SQ_X = 0.066, SQ_Y = 0.058;
/** 사람: 걷기 · 나르기 · 달려 돌아오기 (틱당) · 쏟아져 나오는 간격 · 처음 사람 수 · 최대 · 먹을 것 몇 개에 한 명 */
const P_WALK = 0.0048, P_CARRY = 0.0042, P_SPRINT = 0.014, POUR_EVERY = 1, POUR_N = 3, POP0 = 12, POP_MAX = 40, FOOD_PER = 4;
/** 일하는 범위(성에서 좌우) · 쿵 범위 (부품·레벨로 넓어진다) */
const WORK_R = 0.26, THUD_R = 0.15;
/** 결과 화면: 톡 받기 시작 · 저절로 넘어감 / 둘 중 하나: 톡 받기 시작 · 저절로 고름 · 고른 뒤 / 끝 */
const RES_MIN = 90, RES_AUTO = 60 * 9, PICK_MIN = 40, PICK_AUTO = 60 * 20, PICK_AFTER = 64, END_T = 210;
/** 도착 잔치 틱 · 판 점수 */
const ARRIVE_T = 84, CLEAR_PTS = 30, STAR_MUL = [1, 1, 2, 4], WIN_PTS = 150;
/** 폭풍 앞자락 앞으로 바람이 미치는 거리 */
const REACH = 0.1;
/** 쿵 소리에 떠돌이가 달려오는 거리 */
const JOIN_R = 0.14;
/** 대장 곁(이 안에 성을 내려놓으면 대장 싸움이 시작된 것) — 대포가 닿는 거리 */
const BOSS_NEAR = 0.7;
/** 큰 띠: 한 번 쿵에 이만큼 떨어지면 */
const WOW_N = 7;

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
  village: { name: '떠돌이 마을', gets: [], w: 0.4 },
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
  tree: { sub: 'log', amt: 2, work: 50, cap: 2, job: 'jack' },
  wheat: { sub: 'sheaf', amt: 2, work: 36, cap: 2, job: 'farm' },
  fishery: { sub: 'fish', amt: 3, work: 46, cap: 2, job: 'fisher' },
  rock: { sub: 'stone', amt: 3, work: 54, cap: 3, job: 'miner' },
  shroom: { sub: 'shroom', amt: 2, work: 30, cap: 2, job: 'shroomer' },
  fruit: { sub: 'fruit', amt: 3, work: 38, cap: 2, job: 'picker' },
  hot: { sub: 'stone', amt: 3, work: 46, cap: 2, job: 'smith' },
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

type StarK = 'thud' | 'pop' | 'squash' | 'slam' | 'parts' | 'join' | 'floors' | 'gold' | 'drops' | 'boss' | 'hand';
interface StageDef { key: string; ch: number; name: string; news: string; zones: ZK[]; storm: number; star: [StarK, number]; boss?: MK; newZ?: ZK; newP?: PK }
export const CHAPTERS = ['풀빛 골짜기', '바위 고개', '구름 너머'];
/**
 * 판 12개. 땅은 판마다 정해진 차례(너비·물건 수는 시드로 조금씩 다름). 폭풍 빠르기는 틱당(0.001 = 초당 화면 폭의 6%).
 * 별 셋째(솜씨)는 판마다 다르다 — 버릇 하나로는 안 되게(바로 앞 땅만 · 오래 머물기만).
 */
export const STAGES: StageDef[] = [
  { key: 'forest', ch: 0, name: '숲과 밀밭', news: '쿵! 하면 통나무가 우수수 — 나무꾼이 우르르', zones: ['forest', 'field', 'forest', 'field', 'forest', 'field', 'forest'], storm: 0.0009, star: ['hand', 6], newZ: 'forest' },
  { key: 'river', ch: 0, name: '물고기 강', news: '강가에 쿵 — 물고기 펄떡! 먹을 것은 새 식구', zones: ['field', 'river', 'forest', 'river', 'field', 'forest', 'river', 'field'], storm: 0.001, star: ['pop', 16], newZ: 'river' },
  { key: 'den', ch: 0, name: '몬스터 소굴', news: '몬스터 바로 위에 쿵 — 찌부! 보물이 와르르', zones: ['forest', 'den', 'field', 'river', 'den', 'forest', 'den', 'field'], storm: 0.00105, star: ['squash', 2], newZ: 'den' },
  { key: 'troll', ch: 0, name: '거대 트롤 산', news: '길을 막은 산 트롤 — 성으로 쿵! 쿵!', zones: ['forest', 'field', 'den', 'river', 'forest', 'lair'], storm: 0.0008, star: ['boss', 15], boss: 'troll' },
  { key: 'mine', ch: 1, name: '바위 광산', news: '광산에 쿵 — 돌이 쩍! 돌 성벽은 쿵을 키워요', zones: ['mine', 'forest', 'mine', 'river', 'field', 'mine', 'den', 'mine'], storm: 0.0011, star: ['drops', 7], newZ: 'mine' },
  { key: 'village', ch: 1, name: '떠돌이 마을', news: '떠돌이 곁에 쿵 — "성이다!" 우르르 식구가 돼요', zones: ['village', 'mine', 'forest', 'village', 'den', 'field', 'village', 'river', 'mine'], storm: 0.00115, star: ['join', 4], newZ: 'village' },
  { key: 'swamp', ch: 1, name: '버섯 늪', news: '늪엔 버섯이 잔뜩 — 대신 사람들이 느릿느릿', zones: ['swamp', 'forest', 'swamp', 'mine', 'den', 'swamp', 'village', 'field'], storm: 0.0012, star: ['drops', 7], newZ: 'swamp' },
  { key: 'yeti', ch: 1, name: '얼음 고개', news: '얼음 호수에 쿵 — 쩍! 끝엔 얼음 털보', zones: ['ice', 'mine', 'forest', 'ice', 'den', 'village', 'lair'], storm: 0.001, star: ['boss', 15], boss: 'yeti', newZ: 'ice' },
  { key: 'volcano', ch: 2, name: '불꽃 화산', news: '뜨거운 바위엔 돌과 금 — 김 구멍은 펑!', zones: ['volcano', 'forest', 'volcano', 'river', 'den', 'volcano', 'mine', 'field'], storm: 0.00125, star: ['hand', 8], newZ: 'volcano' },
  { key: 'cloud', ch: 2, name: '구름 과수원', news: '구름 나무에 쿵 — 열매가 주르르', zones: ['cloud', 'cloud', 'volcano', 'cloud', 'den', 'village', 'cloud', 'mine'], storm: 0.0013, star: ['drops', 7], newZ: 'cloud' },
  { key: 'gold', ch: 2, name: '보물 언덕', news: '소굴이 셋! 황금 지붕을 올려 봐요', zones: ['den', 'field', 'den', 'mine', 'cloud', 'den', 'volcano', 'village'], storm: 0.00135, star: ['squash', 3], newP: 'roof' },
  { key: 'drake', ch: 2, name: '천둥 용 봉우리', news: '마지막 대장 천둥 용 — 성으로 쿵! 쿵! 쿵!', zones: ['cloud', 'volcano', 'den', 'village', 'mine', 'cloud', 'lair'], storm: 0.0011, star: ['boss', 15], boss: 'drake' },
];
export const STAGE_COUNT = STAGES.length;
/** 장 끝 둘 중 하나(세상 속 큰 물건) */
export const PERKS: { name: string; line: string }[][] = [
  [{ name: '거대한 바퀴', line: '빨리 걷고 길가 것을 주워요' }, { name: '큰 종', line: '폭풍이 오면 저절로 땡땡' }],
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
  mk: MK | null; hp: number; hpMax: number; atkT: number; wind: number; stun: number; hx: number; hy: number; dir: number;
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
  gx: number; gy: number; gst: number; gt: number; tx: number; ty: number; pend: number; pendY: number; gdir: number; wph: number; gdz: number;
  /** 성이 땅에 있나 · 그 x · 쏟아져 나올 사람 수 · 카메라(화면 왼쪽 끝의 세상 x) */
  cdown: boolean; cx: number; cy: number; pourQ: number; cam: number;
  /** 폭풍 앞자락 x · 깨어났나 · 깨어나 기지개 켜는 틱 · 이번 판 폭풍에 맞은 수 · 날아간 사람 */
  sx: number; awake: boolean; swait: number; hits: number; lost: number;
  goalX: number;
  /** 이번 판: 내려놓은 수 · 한 번 쿵 최고 · 찌부 · 대장 쿵 · 한 번에 들어온 최고 · 지은 부품 · 금 · 판 틱 · 도착 잔치 */
  drops: number; bestThud: number; squash: number; slam: number; joinBest: number; partsStage: number; goldStage: number; stageT: number; arrive: number;
  /** 대장: 싸움이 시작된 틱(대장 곁 — 대포가 닿는 거리 — 에 처음 성을 내려놓거나 처음 맞은 때) · 쓰러진 틱 (없으면 -1) */
  boss0: number; bossKO: number;
  /** 지나온 길(세계 지도): 판마다 별 */
  route: number[];
  firstTap: number; firstBig: number; wowN: number; freeze: number; down: boolean;
  seen: Set<string>; events: Ev[];
  banner: { head: string; sub: string; t: number } | null;
  /** NEW 땅 스포트라이트(땅 번호) */
  spot: { zone: number; t: number } | null;
  /** 큰 이름표 카드(한 번에 하나 — 별 셋째 · 새 부품 처음 완성 · 대장 순간만). pic: 'p:부품' · 'star' · 'm:대장' */
  big: { text: string; t: number; n: number; star: boolean; sub?: string; pic: string } | null;
  /** 마지막 쿵 틱(성문 쪽 살짝 당기기) · 거인 손(한 움큼 퍼 올리기) · 다음 손을 쓸 수 있는 틱 · 퍼 올린 횟수 */
  landT: number; hand: { x: number; y: number; t: number; items: Item[]; got: boolean; n: number } | null; handCD: number; scoops: number; handBest: number;
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
export const foodPer = (s: GiantState) => FOOD_PER + Math.floor(s.people.length / 4) - (s.parts.garden ? 2 : 0);
export const floors = (s: GiantState) => s.built.length;
/** 성 그림 높이(화면 폭 단위): 문 층 + 지붕 + 층마다(층이 많아지면 얇게) */
export const floorH = (n: number) => Math.min(0.06, 0.39 / Math.max(1, n));
export const castleH = (n: number) => 0.26 + n * floorH(n);
const pop = (s: GiantState) => s.people.length;
const outside = (p: Per) => p.st !== P_IN && p.st !== P_BLOWN;
const alive = (o: Obj) => !o.dead && o.hp > 0;
const bossOf = (s: GiantState) => s.objs.find((o) => o.k === 'mon' && !o.dead && !!o.mk && !!MD[o.mk].boss);

/** 큰 순간 (계기판 '큰 순간' 수) — card가 있으면 큰 이름표 카드도 (별 셋째 · 새 부품 처음 · 대장만) */
function wow(s: GiantState, text: string, n = 0, star = false, card = '') {
  if (card) s.big = { text, t: s.t, n, star, pic: card };
  s.wowN++;
  if (s.firstBig < 0) s.firstBig = s.t;
}
/** 성문 쪽 살짝 당기기 (쿵 뒤 0.8초): 그리기와 톡 자리 셈이 같이 쓴다 */
export const ZOOM_T = 48;
export function zoomOf(s: GiantState): { f: number; x: number; y: number } {
  const k = s.t - s.landT;
  if (!s.cdown || k < 0 || k >= ZOOM_T || s.phase !== 'play') return { f: 1, x: 0, y: 0 };
  const e = k / ZOOM_T, amp = s.drops <= 1 ? 0.16 : 0.08, f = 1 + amp * Math.sin(Math.PI * Math.min(1, e * 1.25)) * (e < 0.8 ? 1 : 1 - (e - 0.8) / 0.2);
  return { f: Math.max(1, f), x: s.cx - s.cam, y: s.cy };
}

// ───────────────────────────── 판 만들기 ─────────────────────────────
function obj(s: GiantState, k: OK, x: number, y: number, zone: number, amt = 0): Obj {
  const o: Obj = {
    id: ++s.nid, k, x, y, amt, max: amt, zone, v: Math.floor(s.rng() * 1000), sub: OD[k]?.sub ?? 'coin', shaken: false, rolled: false, workers: 0, claim: -1,
    mk: null, hp: 1, hpMax: 1, atkT: 0, wind: 0, stun: 0, hx: x, hy: y, dir: 1, dead: false, z: 0, vz: 0, vx: 0, hitT: -99, fallT: -99, born: s.t, slamT: -99,
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
  /** 땅 위에 고르게 (가로 cols × 깊이 rows, 살짝 흐트러지게) */
  const grid = (cols: number, rows: number, f: (x: number, y: number, i: number) => void) => {
    let i = 0;
    for (let c = 0; c < cols; c++)
      for (let q = 0; q < rows; q++, i++) {
        const x = x0 + ((c + 0.5 + (q % 2 ? 0.25 : -0.25)) / cols) * w + (r() - 0.5) * (w / cols) * 0.3;
        f(clamp(x, x0 + 0.012, x0 + w - 0.012), B0 + 0.02 + ((q + 0.5 + (r() - 0.5) * 0.5) / rows) * (B1 - B0 - 0.04), i);
      }
  };
  const amt = (kk: OK) => OD[kk]!.amt + plus;
  switch (k) {
    case 'forest': grid(Math.max(3, Math.round(w / 0.06)), 3, (x, y) => obj(s, 'tree', x, y, zi, amt('tree'))); break;
    case 'field': grid(Math.max(3, Math.round(w / 0.065)), 3, (x, y) => obj(s, 'wheat', x, y, zi, amt('wheat'))); break;
    case 'river': grid(1, 4, (x, y) => obj(s, 'fishery', x, y, zi, amt('fishery'))); break;
    case 'ice': grid(2, 3, (x, y, i) => obj(s, i === 4 ? 'rock' : 'fishery', x, y, zi, amt(i === 4 ? 'rock' : 'fishery'))); break;
    case 'mine': grid(Math.max(2, Math.round(w / 0.085)), 2, (x, y) => obj(s, 'rock', x, y, zi, amt('rock'))); break;
    case 'swamp': grid(Math.max(3, Math.round(w / 0.065)), 3, (x, y) => obj(s, 'shroom', x, y, zi, amt('shroom'))); break;
    case 'cloud': grid(Math.max(3, Math.round(w / 0.075)), 2, (x, y) => obj(s, 'fruit', x, y, zi, amt('fruit'))); break;
    case 'volcano': grid(3, 2, (x, y, i) => (i === 2 || i === 5 ? obj(s, 'geyser', x, y, zi) : obj(s, 'hot', x, y, zi, amt('hot')))); break;
    case 'den': {
      const ms = denMons(s.stage, di);
      // 몬스터는 소굴 앞줄·뒷줄에 번갈아 (가운데 아무 데나 쿵 해서는 찌부가 안 되게 — 겨눠야 한다)
      ms.forEach((mk, i) => {
        const m = monster(s, mk, x0 + w * (0.15 + (0.7 * i) / Math.max(1, ms.length - 1)) + (r() - 0.5) * 0.02, (i + di) % 2 ? B0 + 0.07 + r() * 0.03 : B1 - 0.1 + r() * 0.03, zi);
        m.hy = m.y;
      });
      const c = obj(s, 'cage', x0 + w * 0.5, B0 + 0.03, zi, 2 + (s.stage > 5 ? 1 : 0));
      c.amt = c.max;
      break;
    }
    case 'village': grid(3, 2, (x, y, i) => (i + di) % 6 < 4 + (s.stage >= 5 ? 1 : 0) && obj(s, 'folk', x, y, zi, 1)); break;
    case 'lair': {
      const m = monster(s, STAGES[s.stage].boss!, x0 + w * 0.6, FEET, zi);
      // 성이 클수록 쿵이 세다 — 대장은 쿵 네댓 번은 버티게
      m.hp = m.hpMax = Math.max(m.hpMax, 3.5 * slamDmg(s) + 100);
      m.hy = m.y;
      break;
    }
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
  s.gy = FEET;
  s.gst = G_STAND;
  s.gt = 0;
  s.tx = NaN;
  s.ty = FEET;
  s.pend = NaN;
  s.pendY = FEET;
  s.gdir = 1;
  s.gdz = 0;
  s.cdown = false;
  s.cx = s.gx;
  s.cy = FEET;
  s.pourQ = 0;
  s.cam = 0;
  s.sx = 0.03;
  s.awake = false;
  s.swait = 0;
  s.hits = 0;
  s.lost = 0;
  s.drops = s.bestThud = s.squash = s.slam = s.joinBest = s.partsStage = s.goldStage = s.stageT = s.arrive = 0;
  s.boss0 = s.bossKO = -1;
  s.canT = 0;
  s.geyT = 0;
  s.star3At = -1;
  s.hand = null;
  s.handBest = 0;
  s.landT = -99;
  s.newDex = [];
  s.big = null;
  s.banner = { head: `${CHAPTERS[d.ch]} · ${s.stage + 1}판`, sub: d.news, t: s.t };
  const sz = d.newZ ? s.zones.findIndex((z) => z.k === d.newZ) : -1;
  s.spot = sz >= 0 ? { zone: sz, t: s.t } : null;
  see(s, 'stage' + s.stage);
  if (d.newZ) see(s, 'zone:' + d.newZ);
  if (d.boss) see(s, 'boss:' + d.boss);
  if (!s.wish) chooseWish(s);
  ev(s, 'stage', s.gx, s.gy);
}

// ───────────────────────────── 성: 바라는 부품 · 나른 것 ─────────────────────────────
/** 바라는 부품 고르기: 이번 판에 새로 풀린 것 먼저, 아니면 이 판 땅에서 구할 수 있는 것 중 창고로 가장 많이 찬 것 */
function chooseWish(s: GiantState, depth = 0) {
  const d = STAGES[s.stage], have = new Set<Res>();
  for (const k of d.zones) for (const r of ZRES[k] ?? []) have.add(r);
  const ok = (k: PK) => PD[k].from <= s.stage && s.parts[k] < PD[k].max && (Object.keys(PD[k].need) as Res[]).every((r) => have.has(r) || s.store[r] >= needOf(s, k, r));
  let best: PK | null = null, bv = -1e9;
  for (const k of PART_DEX) {
    if (!ok(k)) continue;
    let got = 0, tot = 0;
    for (const r of Object.keys(PD[k].need) as Res[]) {
      const n = needOf(s, k, r);
      tot += n;
      got += Math.min(n, r === 'food' ? s.food : s.store[r]);
    }
    let v = got / tot - tot * 0.01 - s.parts[k] * 0.15;
    if (s.parts[k] === 0) v += 0.5 + PD[k].from * 0.1;
    if (d.newP === k && s.parts[k] === 0) v += 5;
    if (v > bv) (bv = v), (best = k);
  }
  s.wish = best;
  s.wishGot = zero();
  if (!best) return;
  for (const r of Object.keys(PD[best].need) as Res[]) {
    const take = Math.min(needOf(s, best, r), r === 'food' ? s.food : s.store[r]);
    s.wishGot[r] += take;
    if (r === 'food') s.food -= take;
    else s.store[r] -= take;
  }
  if (wishDone(s) && depth < 6) build(s, depth + 1);
}
/** 부품 값: 성이 높을수록 다음 층이 비싸진다 */
export const needOf = (s: GiantState, k: PK, r: Res) => Math.round((PD[k].need[r] ?? 0) * (1 + 0.3 * floors(s)));
const wishDone = (s: GiantState) => !!s.wish && (Object.keys(PD[s.wish].need) as Res[]).every((r) => s.wishGot[r] >= needOf(s, s.wish!, r));
function build(s: GiantState, depth = 0) {
  const k = s.wish!;
  s.parts[k]++;
  s.built.push(k);
  s.partsStage++;
  s.sp += 15;
  const fresh = !s.dexP.includes(k);
  if (fresh) s.dexP.push(k), s.newDex.push('p:' + k), see(s, 'part:' + k);
  // 큰 띠는 새 부품이거나 다섯 층마다 — 나머지는 성 곁에 작은 글자
  const band = fresh || floors(s) % 5 === 0;
  ev(s, 'part', s.cdown ? s.cx : s.gx - 0.08, castleTop(s), floors(s), band ? 1 : 0, 0, k);
  if (band) wow(s, fresh ? `${PD[k].name} 완성!` : `성 ${floors(s)}층!`, floors(s), false, fresh ? 'p:' + k : '');
  if (fresh && s.big) s.big.sub = PD[k].line;
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
  const top = (s.cdown ? s.cy : s.gy) - castleH(floors(s)) * 0.55;
  const x = s.cdown ? s.cx : s.gx - 0.08;
  const p = newPerson(s, x, (s.cdown ? s.cy : s.gy) + 0.03, P_IN);
  if (!p) return void (s.sp += 2);
  s.sp += 5;
  ev(s, 'born', x, top, pop(s));
  checkStar3(s);
  if (s.cdown && s.gst === G_DOWN && s.arrive === 0) (p.st = P_IDLE), (p.tm = 0);
}
function addRes(s: GiantState, r: Res, n: number) {
  for (let guard = 0; n > 0 && guard < 20; guard++) {
    const w = s.wish ? needOf(s, s.wish, r) : 0;
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
  ev(s, 'dep', x, castleTop(s) + castleH(floors(s)) * 0.6, n, 0, 0, it);
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
    case 'drops': return s.phase === 'result' && s.drops <= n;
    case 'boss': return s.bossKO >= 0 && s.bossKO - s.boss0 <= n * 60;
    case 'hand': return s.handBest >= n;
  }
}
/** 별 셋째를 판 중에 처음 딴 순간: 띠 + 반짝 */
function checkStar3(s: GiantState) {
  if (s.star3At >= 0 || s.phase !== 'play' || STAGES[s.stage].star[0] === 'drops' || !star3(s)) return;
  s.star3At = s.t;
  ev(s, 'star3', s.cdown ? s.cx : s.gx, castleTop(s));
  if (s.big && s.big.t === s.t) s.big.star = true;
  else wow(s, '별 셋째!', 0, true, 'star');
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
    case 'drops': return `쿵 ${n}번 안에 새 땅`;
    case 'boss': return `대장을 ${n}초 안에`;
    case 'hand': return `손으로 한 번에 ${n}개`;
  }
};
export const starProg = (s: GiantState): [number, number] => {
  const [k, n] = STAGES[s.stage].star;
  if (k === 'boss') return [s.boss0 >= 0 ? Math.min(n, Math.floor(((s.bossKO >= 0 ? s.bossKO : s.t) - s.boss0) / 60)) : 0, n];
  const v = k === 'hand' ? s.handBest : k === 'thud' ? s.bestThud : k === 'pop' ? pop(s) : k === 'squash' ? s.squash : k === 'slam' ? s.slam : k === 'parts' ? s.partsStage : k === 'join' ? s.joinBest : k === 'floors' ? floors(s) : k === 'drops' ? s.drops : s.goldStage;
  return [k === 'drops' ? v : Math.min(v, n), n];
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
export const castleTop = (s: GiantState) => (s.cdown ? s.cy - castleH(floors(s)) * dscale(s.cy) : s.gy - (0.17 + castleH(floors(s))) * dscale(s.gy));
function onTap(s: GiantState, wx: number, wy: number) {
  if (s.arrive > 0 || wy < TOP) return;
  ev(s, 'tap', wx, wy);
  if (s.firstTap < 0) s.firstTap = s.t;
  const onCastle = s.cdown && Math.abs(wx - s.cx) < 0.14 * dscale(s.cy) && wy > castleTop(s) - 0.05 && wy < s.cy + 0.03;
  if (onCastle) {
    if (s.gst === G_DOWN) recall(s, NaN, s.cy);
    return;
  }
  const tx = clampTarget(s, wx), ty = clampY(wy);
  // 성이 내려져 있고 일하는 범위 안의 덩어리를 톡: 거인이 큰 손으로 한 움큼 퍼 올린다 (손이 바쁘면 그냥 기다림)
  if (s.gst === G_DOWN && s.arrive === 0 && Math.abs(wx - s.cx) < workR(s) && scoopables(s, wx, ty).length) {
    if (!s.hand && s.t >= s.handCD) startScoop(s, wx, ty);
    return;
  }
  if (s.gst === G_DOWN) recall(s, tx, ty);
  else if (s.gst === G_DROP) (s.pend = tx), (s.pendY = ty);
  else if (s.gst === G_CALL || s.gst === G_LIFT) (s.tx = tx), (s.ty = ty);
  else (s.tx = tx), (s.ty = ty), (s.gst = G_WALK), (s.gt = 0);
  if (s.spot && s.zones[s.spot.zone] && tx >= s.zones[s.spot.zone].x0 - 0.1 && tx <= s.zones[s.spot.zone].x1 + 0.1) s.spot = null;
}
// ───────────────────────────── 거인 손: 한 움큼 퍼 올리기 ─────────────────────────────
/** 손 크기(땅에서 이만큼 둘레) · 한 번에 최대 · 손이 내려가 닿는 틱 · 성에 쏟는 틱 · 다음 손까지 쉼 */
const SCOOP_R = 0.085, SCOOP_MAX = 8, HAND_DOWN = 12, HAND_POUR = 40, HAND_REST = 24;
function scoopables(s: GiantState, x: number, y: number): Obj[] {
  const out: Obj[] = [];
  for (const o of s.objs) {
    if (o.dead || hyp(o.x - x, (o.y - y) * 0.8) > SCOOP_R + (o.k === 'mon' && o.mk ? MD[o.mk].r * 0.6 : 0)) continue;
    if (o.k === 'mon' ? o.hp > 0 && !MD[o.mk!].boss : o.k === 'loot' ? o.z <= 0.001 && o.claim < 0 : o.k === 'folk' || ((!!OD[o.k] || o.k === 'chest') && o.amt > 0)) out.push(o);
  }
  return out;
}
function startScoop(s: GiantState, x: number, y: number) {
  s.hand = { x, y, t: 0, items: [], got: false, n: 0 };
  s.handCD = s.t + HAND_POUR + 8 + HAND_REST;
  s.scoops++;
  see(s, 'scoop');
  ev(s, 'reach', x, y);
}
/** 손이 땅에 닿는 순간: 둘레 것을 움켜쥔다 — 사람들이 일하던 것이면 더 많이 (함께하면 와르르) */
function grab(s: GiantState, h: NonNullable<GiantState['hand']>) {
  let n = 0;
  for (const o of scoopables(s, h.x, h.y)) {
    if (h.items.length >= SCOOP_MAX) break;
    if (o.k === 'mon' && o.mk) {
      const boss = !!MD[o.mk].boss;
      o.hp -= boss ? 14 : 16;
      o.hitT = s.t;
      o.stun = Math.max(o.stun, 60);
      if (boss && s.boss0 < 0) s.boss0 = s.t;
      ev(s, 'flick', o.x, o.y - MD[o.mk].r, boss ? 2 : 1);
      if (o.hp <= 0) kill(s, o, false);
      n++;
      continue;
    }
    if (o.k === 'folk') {
      join(s, o);
      n++;
      continue;
    }
    if (o.k === 'loot') {
      o.dead = true;
      h.items.push(o.sub);
      n++;
      continue;
    }
    const k = Math.min(o.amt, (o.k === 'chest' ? 3 : 2) + (o.workers > 0 ? 1 : 0), SCOOP_MAX - h.items.length);
    for (let i = 0; i < k; i++) h.items.push(o.k === 'hot' && s.rng() < 0.35 ? 'coin' : o.k === 'chest' ? 'coin' : OD[o.k]!.sub);
    o.amt -= k;
    o.hitT = s.t;
    n += k;
    if (o.amt <= 0) {
      o.fallT = s.t;
      o.dir = h.x < o.x ? 1 : -1;
      if (o.k === 'chest') o.dead = true;
      ev(s, 'empty', o.x, o.y, 0, 0, 0, o.k);
    }
  }
  h.got = true;
  h.n = n;
  if (n > s.handBest) s.handBest = n;
  ev(s, 'grab2', h.x, h.y, n);
  checkStar3(s);
}
function handStep(s: GiantState) {
  const h = s.hand;
  if (!h) return;
  h.t++;
  if (h.t === HAND_DOWN) grab(s, h);
  if (h.t >= HAND_POUR) handDone(s);
}
/** 성에 와르르 쏟아 넣는다 (나팔·폭풍으로 끊겨도 쥔 것은 넣는다) */
function handDone(s: GiantState) {
  const h = s.hand;
  if (!h) return;
  s.hand = null;
  if (!h.got) return;
  for (const it of h.items) deposit(s, it, s.cx);
  if (h.items.length) ev(s, 'pourin', s.cx, castleTop(s), h.items.length);
}
/** 뿌우 나팔: 사람들이 우르르 돌아온다 */
function recall(s: GiantState, tx: number, ty: number) {
  handDone(s);
  s.gst = G_CALL;
  s.gt = 0;
  s.tx = tx;
  s.ty = ty;
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
  const x = s.cx, y = s.cy, R = thudR(s);
  let n = 0, joined = 0, sq = 0;
  s.drops++;
  for (const o of [...s.objs]) {
    if (o.dead) continue;
    const dx = Math.abs(o.x - x), dy = Math.abs(o.y - y), de = hyp(dx, dy * 0.8);
    if (o.k === 'mon' && o.mk) {
      const md = MD[o.mk];
      if (dx < (md.boss ? HALF + md.r * 0.6 : SQ_X + md.r * 0.5) && dy < (md.boss ? 0.075 + md.r * 1.2 : SQ_Y + md.r * 0.5)) {
        if (md.boss) bossSlam(s, o);
        else (o.hp = 0), kill(s, o, true), sq++;
      } else if (de < R + md.r) (o.stun = Math.max(o.stun, 90)), (o.hitT = s.t);
      continue;
    }
    if (o.k === 'folk') {
      // 쿵 소리가 닿은 떠돌이만 "성이다!" (멀리 있는 이는 성이 곁에 오래 있으면 천천히 온다)
      if (de < JOIN_R) join(s, o), joined++;
      continue;
    }
    if (o.k === 'loot' || o.k === 'chest' || o.k === 'cage' || o.k === 'geyser') continue;
    if (de < R && !o.shaken && o.amt > 0) {
      o.shaken = true;
      o.hitT = s.t;
      // 성 바로 밑: 통째로 쓰러져(바깥쪽으로) 남은 것이 다 쏟아진다 · 둘레: 흔들려 몇 개 떨어진다
      // 성 밑과 성 앞(성문 쪽): 바깥으로 쓰러진다 — 성문과 쏟아지는 사람이 나무에 가리지 않게
      const under = o.k !== 'fishery' && dx < HALF * 1.05 && (o.y <= y ? y - o.y < 0.06 : o.y - y < 0.16);
      const k = under ? Math.min(o.amt, 4) : (LOOSE[o.k] ?? 1) + (o.k === 'fishery' && s.zones[o.zone]?.k === 'ice' ? 1 : 0);
      const top = o.k === 'tree' || o.k === 'fruit' ? 0.09 : o.k === 'fishery' ? 0.01 : 0.03, out = o.x < x ? -1 : 1;
      for (let i = 0; i < k; i++) {
        const it = o.k === 'hot' && s.rng() < 0.35 ? 'coin' : OD[o.k]!.sub;
        const lx = under ? x + out * (HALF + 0.01 + s.rng() * 0.05) : o.x + (s.rng() - 0.5) * 0.03;
        loot(s, it, lx, clamp(o.y + (s.rng() - 0.3) * 0.05, B0 + 0.01, B1), top, out * (0.0006 + s.rng() * 0.0012));
        n++;
      }
      if (under) {
        o.amt = 0;
        o.fallT = s.t;
        o.dir = out;
        ev(s, 'topple', o.x, o.y, out, 0, 0, o.k);
      }
    }
  }
  const prev = s.bestThud;
  s.bestThud = Math.max(s.bestThud, n);
  if (joined > s.joinBest) s.joinBest = joined;
  s.landT = s.t;
  const bb = bossOf(s);
  if (bb && s.boss0 < 0 && Math.abs(bb.x - x) < BOSS_NEAR) s.boss0 = s.t;
  ev(s, 'thud', x, y, n, floors(s), sq);
  if (!s.awake && s.stage >= 0) (s.awake = true), (s.swait = 150), ev(s, 'wake', s.sx, 0.5), see(s, 'storm');
  if (joined) ev(s, 'joinall', x, y - 0.1, joined);
  // 큰 띠: 찌부 · 여럿 데려옴 · 이 판 최고 쿵
  // 큰 순간이지만 카드는 아니다 — 그 자리의 숫자와 소리로 (브리프 규칙 11)
  if (sq || joined >= 3 || (n >= WOW_N && n > prev) || s.drops === 1) wow(s, '', n);
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
const slamDmg = (s: GiantState) => 22 + 3 * floors(s) + 5 * s.parts.wall + 2 * s.lv;
function bossSlam(s: GiantState, o: Obj) {
  const dmg = slamDmg(s);
  o.hp -= dmg;
  o.hitT = s.t;
  o.slamT = s.t;
  o.stun = 70;
  s.slam++;
  if (s.boss0 < 0) s.boss0 = s.t;
  ev(s, 'slam', o.x, o.y - MD[o.mk!].r * 1.2, Math.round(dmg), s.slam);
  if (o.hp <= 0) kill(s, o, false);
  else (o.x = Math.min(o.x + 0.11, s.goalX - 0.25)), (o.hx = o.x), wow(s, `대장에게 쿵! ${s.slam}`, s.slam, false, s.slam === 1 ? 'm:' + o.mk : '');
  checkStar3(s);
}
/** 몬스터가 쓰러진다: 보물 상자 · 소굴이 비면 갇힌 사람들이 풀려난다 */
function kill(s: GiantState, o: Obj, squash: boolean) {
  const md = MD[o.mk!];
  o.dead = true;
  o.hp = 0;
  for (const p of s.people) if (p.tgt === o) release(s, p), p.st === P_WORK && (p.st = P_IDLE);
  const c = obj(s, 'chest', o.x, clamp(o.y + 0.01, B0 + 0.01, B1), o.zone, md.gold + Math.floor(s.stage / 3));
  c.z = 0.05;
  c.vz = 0.006;
  if (squash) (s.squash++, (s.sp += 10)), see(s, 'squash');
  ev(s, squash ? 'squash' : 'mdie', o.x, o.y, md.boss ? 2 : 1, 0, 0, o.mk!);
  if (md.boss) {
    s.bossKO = s.t;
    if (s.boss0 < 0) s.boss0 = s.t;
    s.sp += 80;
    wow(s, `${md.name}을 물리쳤다!`, 10, false, 'm:' + o.mk);
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
  const dx = x - p.x, dy = y - p.y, d = hyp(dx, dy);
  if (d <= v) return (p.x = x), (p.y = y), true;
  p.x += (dx / d) * v;
  p.y += (dy / d) * v;
  if (Math.abs(dx) > 0.002) p.dir = dx > 0 ? 1 : -1;
  return false;
}
const gateY = (s: GiantState) => s.cy + 0.03;
function personStep(s: GiantState, p: Per) {
  const slow = slowAt(s, p.x) ? 0.6 : 1, flag = 1 + 0.12 * s.parts.flag, sprint = P_SPRINT * (s.perk[0] === 2 ? 1.6 : 1);
  if (p.z > 0 && (p.st === P_OUT || p.st === P_IDLE)) {
    // 쏟아져 나올 때의 폴짝
    p.z += p.vz;
    p.vz -= 0.0009;
    if (p.z <= 0) (p.z = 0), (p.vz = 0);
  }
  switch (p.st) {
    case P_OUT: {
      const o = p.tgt;
      if (!o || o.dead || (o.k !== 'mon' && o.k !== 'loot' && o.amt <= 0) || (o.k === 'mon' && o.hp <= 0)) return assign(s, p);
      const side = o.k === 'mon' ? (p.x < o.x ? -1 : 1) * (MD[o.mk!].r + 0.012 + (p.id % 3) * 0.008) : o.k === 'tree' || o.k === 'fruit' ? (p.id % 2 ? 0.012 : -0.012) : 0;
      if (moveTo(p, o.x + side, clamp(o.y + (o.k === 'tree' || o.k === 'fruit' ? 0.012 : 0.004), B0 - 0.01, B1 + 0.01), P_WALK * slow * flag)) {
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
          o.hp -= (MD[o.mk!].boss ? 0.25 : 1) * (s.parts.forge ? 2 : 1);
          if (MD[o.mk!].boss && s.boss0 < 0) s.boss0 = s.t;
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
      if (moveTo(p, s.cx + ((p.id % 5) - 2) * 0.004, gateY(s), P_CARRY * slow * flag)) {
        if (p.carry) deposit(s, p.carry, s.cx), (p.carry = null);
        if (s.gst === G_DOWN && s.arrive === 0) assign(s, p);
        else p.st = P_IN;
      }
      break;
    case P_IDLE:
      if (!s.cdown) return void ((p.st = P_HOP), (p.tm = 22));
      moveTo(p, p.hx, gateY(s) + 0.02 + (p.id % 4) * 0.022, P_WALK * 0.5);
      if (--p.tm <= 0 && s.arrive === 0) {
        p.tm = 24;
        assign(s, p);
      }
      break;
    case P_RUN:
      if (!s.cdown) return void ((p.st = P_HOP), (p.tm = 18));
      if (moveTo(p, s.cx, gateY(s), sprint)) {
        if (p.carry) deposit(s, p.carry, s.cx), (p.carry = null);
        p.st = P_IN;
      }
      break;
    case P_HOP: {
      // 창문으로 폴짝: 성을 메고 있으면 거인 등, 내려져 있으면 성문
      const tx = s.cdown ? s.cx : s.gx - 0.08, ty = s.cdown ? gateY(s) : s.gy;
      const k = 1 / Math.max(1, p.tm);
      p.x += (tx - p.x) * k;
      p.y += (ty - p.y) * k;
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
      if (moveTo(p, s.cx, gateY(s), P_WALK * 1.6)) {
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
  for (let i = 0; i < POUR_N && s.pourQ > 0; i++) pourOne(s);
}
/** 한 명이 성문에서 폴짝 (사람마다 먼지 한 줌) */
function pourOne(s: GiantState) {
  const p = s.people.find((q) => q.st === P_IN);
  if (!p) return void (s.pourQ = 0);
  s.pourQ--;
  p.x = s.cx + (s.rng() - 0.5) * 0.02;
  p.y = gateY(s);
  // 성문에서 폴짝 튀어나온다 (개미떼처럼 쏟아지는 모습이 나무 위로 보이게)
  p.z = 0.001;
  p.vz = 0.008 + s.rng() * 0.006;
  p.dir = p.id % 2 ? 1 : -1;
  if (s.arrive > 0) {
    p.st = P_IDLE;
    p.tm = 9999;
    p.hx = s.cx + ((p.id * 37) % 21 - 10) * 0.012;
  } else assign(s, p);
  ev(s, 'pour', p.x, gateY(s), pop(s) - s.pourQ);
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
          if (Math.abs(dx) < md.reach && Math.abs(p.y - o.y) < 0.06 + md.r) {
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
      o.x = o.hx + Math.sin((s.t + o.v) * 0.015) * 0.02;
      o.y = o.hy + Math.sin((s.t + o.v) * 0.011) * 0.012;
      o.dir = Math.cos((s.t + o.v) * 0.015) > 0 ? 1 : -1;
    }
  }
  // 김 구멍(화산): 가끔 펑 — 곁의 사람이 붕
  if (++s.geyT % 200 === 0)
    for (const g of s.objs) {
      if (g.k !== 'geyser' || g.dead) continue;
      let n = 0;
      for (const p of s.people)
        if (outside(p) && p.st !== P_FLY && p.st !== P_HOP && p.st !== P_BLOWN && hyp(p.x - g.x, p.y - g.y) < 0.05)
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
  let best: Obj | null = null, bd = BOSS_NEAR;
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
      const goal = s.tx - DROP_DX * dscale(s.ty), dx = goal - s.gx, dy = s.ty - s.gy, d = hyp(dx, dy), v = walkV(s);
      if (Math.abs(dx) > 0.004) s.gdir = dx >= 0 ? 1 : -1;
      const stp = Math.min(v, d);
      const ph0 = Math.floor(s.wph / STRIDE);
      if (d > 0) (s.gx += (dx / d) * stp), (s.gy += (dy / d) * stp);
      s.wph += stp;
      if (Math.floor(s.wph / STRIDE) !== ph0) ev(s, 'step', s.gx + s.gdir * 0.03, s.gy);
      // 거대한 바퀴: 걷는 길의 것을 성 창문에서 손을 뻗어 줍는다
      if (s.perk[0] === 1)
        for (const o of s.objs) {
          if (o.dead || o.rolled || !OD[o.k] || o.k === 'chest' || o.amt <= 0 || Math.abs(o.x - (s.gx - 0.03)) > 0.035 || Math.abs(o.y - s.gy) > 0.08) continue;
          o.rolled = true;
          o.amt--;
          o.hitT = s.t;
          if (o.amt <= 0) o.fallT = s.t;
          deposit(s, OD[o.k]!.sub, s.gx - 0.03);
          ev(s, 'grab', o.x, o.y - 0.05, 0, 0, 0, OD[o.k]!.sub);
        }
      if (d <= v) (s.gst = G_DROP), (s.gt = 0), (s.cx = s.tx), (s.cy = s.ty), (s.gdir = 1), ev(s, 'swing', s.gx, s.gy - 0.3);
      break;
    }
    case G_DROP:
      if (++s.gt >= DROP_T) {
        s.gst = G_DOWN;
        s.gt = 0;
        s.cdown = true;
        s.pourQ = s.people.filter((p) => p.st === P_IN).length;
        const goal = s.cx >= s.goalX - 0.03;
        if (goal) (s.arrive = 1), (s.awake = false), ev(s, 'arrive', s.cx, s.cy), see(s, 'arrive'), wow(s, '', 5);
        thud(s);
        if (!isNaN(s.pend)) {
          const q = s.pend;
          s.pend = NaN;
          if (!goal) recall(s, clampTarget(s, q), s.pendY);
        }
      }
      break;
    case G_DOWN:
      s.gt++;
      // 큰 종: 폭풍이 일하는 사람 곁에 오면 저절로 땡땡
      if (s.perk[0] === 2 && s.awake && s.people.some((p) => outside(p) && p.x < s.sx + 0.16)) recall(s, NaN, s.cy), ev(s, 'bell', s.cx, castleTop(s));
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
        s.gx = s.cx - DROP_DX * dscale(s.cy);
        s.gy = s.cy;
        if (isNaN(s.tx)) s.gst = G_STAND;
        else (s.gst = G_WALK), (s.gt = 0);
      }
      break;
  }
}

// ───────────────────────────── 폭풍 ─────────────────────────────
function stormStep(s: GiantState) {
  if (!s.awake || s.arrive) return;
  if (s.swait > 0) return void s.swait--;
  const body = s.cdown ? s.cx - HALF : s.gx - 0.05, gap = body - s.sx;
  // 멀리 처지면 서둘러 따라온다(늘 뒤에 보이게)
  s.sx += stormV(s) * (gap > 0.95 ? 2 : gap > 0.7 ? 1.4 : 1);
  // 앞자락 앞으로 거센 바람(REACH): 그 안에서 일하던 사람은 빙글빙글 날아간다
  for (const p of s.people)
    if (outside(p) && p.st !== P_BLOWN && p.st !== P_HOP && p.x < s.sx + REACH && pop(s) - countBlown(s) > 4) {
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
  handDone(s);
  s.hits++;
  // 폭풍에 닿으면 밖에 있던 사람 몇(폭풍 쪽 둘까지)은 빙글빙글 날아가고, 나머지는 성 창문으로 폴짝
  const out = s.people.filter((p) => outside(p) && p.st !== P_BLOWN).sort((a, b) => a.x - b.x);
  out.forEach((p, i) => {
    release(s, p);
    p.carry = null;
    if (i < 2 && pop(s) - countBlown(s) > 4) (p.st = P_BLOWN), (p.tm = 0), s.lost++, ev(s, 'blown', p.x, p.y - p.z);
    else (p.st = P_HOP), (p.tm = 20);
  });
  const at = s.cdown ? s.cx - DROP_DX * dscale(s.cy) : s.gx;
  if (s.cdown) s.gy = s.cy;
  s.cdown = false;
  s.pourQ = 0;
  s.gx = at + 0.2;
  s.gst = isNaN(s.tx) || s.gst === G_DOWN || s.gst === G_CALL || s.gst === G_LIFT || s.gst === G_DROP ? G_STAND : G_WALK;
  s.tx = s.gst === G_WALK ? Math.max(s.tx, s.gx + DROP_DX) : NaN;
  s.gdz = DIZZY_T;
  s.sx = s.gx - 0.62;
  s.freeze = 6;
  see(s, 'stormhit');
  ev(s, 'stormhit', s.gx, s.gy - 0.25);
  if (s.stage > 0) {
    s.hearts--;
    ev(s, 'heart', s.gx, s.gy - 0.45);
    if (s.hearts <= 0) return void ((s.phase = 'end'), (s.pt = 0), ev(s, 'end', s.gx, s.gy, 0));
  }
}

// ───────────────────────────── 판 흐름 ─────────────────────────────
function clearStage(s: GiantState) {
  s.phase = 'result';
  s.pt = 0;
  s.starOk = [true, s.lost === 0 && s.hits === 0, star3(s)];
  if (STAGES[s.stage].star[0] === 'drops' && s.starOk[2]) s.star3At = s.t;
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
  ev(s, 'clear', s.cx, s.cy, s.got);
}
function advance(s: GiantState) {
  const d = STAGES[s.stage];
  if (s.won) return void ((s.phase = 'end'), (s.pt = 0), ev(s, 'end', s.cx, s.cy, 1));
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
  handStep(s);
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
    '점선 안을 톡 하면 거인 손으로 한 움큼! 점선 밖을 톡 하면 성을 메고 그리로.',
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
      gx: 0.28, gy: FEET, gst: G_STAND, gt: 0, tx: NaN, ty: FEET, pend: NaN, pendY: FEET, gdir: 1, wph: 0, gdz: 0, cdown: false, cx: 0.28, cy: FEET, pourQ: 0, cam: 0,
      sx: 0.03, awake: false, swait: 0, hits: 0, lost: 0, goalX: 3,
      drops: 0, bestThud: 0, squash: 0, slam: 0, joinBest: 0, partsStage: 0, goldStage: 0, stageT: 0, arrive: 0, boss0: -1, bossKO: -1, route: [],
      firstTap: -1, firstBig: -1, wowN: 0, freeze: 0, down: false, seen: new Set<string>(), events: [], banner: null, spot: null, big: null, star3At: -1,
      landT: -99, hand: null, handCD: 0, scoops: 0, handBest: 0,
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
      if (tap && p) {
        const z = zoomOf(s), sx = (p.x - z.x) / z.f + z.x, sy = (p.y * A - z.y) / z.f + z.y;
        onTap(s, s.cam + sx, sy);
      }
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
const at = (s: GiantState, wx: number, wy = FEET): Input => {
  const z = zoomOf(s);
  return { tap: false, dir: 0, pointer: { x: clamp((wx - s.cam - z.x) * z.f + z.x, 0.01, 0.99), y: clamp(((wy - z.y) * z.f + z.y) / A, 0.01, 0.99) } };
};
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
  const need = !!s.wish && needOf(s, s.wish, r) > s.wishGot[r];
  return (r === 'gold' ? 3 : 1) * (need ? 1.8 : 1) * (r === 'food' && pop(s) >= POP_MAX ? 0.4 : 1);
}
/** 여기에 성을 내려놓으면 얼마나 얻을까 (어림셈). cur = 지금 내려져 있는 자리(쿵은 이미 했다) */
export function spotValue(s: GiantState, x: number, y: number, cur = false): number {
  const wr = workR(s), tr = thudR(s), [sk, sn] = STAGES[s.stage].star, want3 = s.star3At < 0;
  let v = 0, loose = 0, joined = 0;
  for (const o of s.objs) {
    if (o.dead) continue;
    const dx = Math.abs(o.x - x), dy = Math.abs(o.y - y), de = hyp(dx, dy * 0.8);
    if (dx > wr + 0.06) continue;
    if (o.k === 'mon' && o.mk) {
      const md = MD[o.mk];
      if (o.hp <= 0) continue;
      if (!cur && dx < (md.boss ? HALF + md.r * 0.6 : SQ_X + md.r * 0.5) && dy < (md.boss ? 0.075 + md.r * 1.2 : SQ_Y + md.r * 0.5)) v += md.boss ? 40 + (want3 && sk === 'slam' ? 30 : 0) : md.gold * 3 + 12 + (want3 && sk === 'squash' ? 30 : 0);
      else if (dx < wr) v += md.boss ? 6 : md.gold * 3 * (pop(s) >= 8 || s.parts.cannon ? 0.6 : 0.3);
      continue;
    }
    if (o.k === 'folk') {
      if (!cur && de < JOIN_R) (v += 6), joined++;
      else if (dx < wr) v += 2;
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
    if (!cur && de < tr && !o.shaken) {
      const k = dx < HALF * 0.95 && dy < 0.07 && o.k !== 'fishery' ? Math.min(o.amt, 4) : LOOSE[o.k] ?? 1;
      v += k * w * 1.5;
      loose += k;
    }
  }
  if (want3 && sk === 'thud' && loose >= sn) v += 25;
  if (want3 && sk === 'join' && joined >= sn) v += 25;
  return v;
}
/** 쿵 횟수 별: 남은 횟수로 새 땅까지 가려면 이번엔 얼마나 앞으로 가야 하나 */
function dropsPush(s: GiantState): number {
  const [k, n] = STAGES[s.stage].star;
  if (k !== 'drops' || s.drops >= n) return 0;
  const left = n - s.drops, need = (s.goalX - (s.cdown ? s.cx : s.gx)) / Math.max(1, left);
  return need;
}
/** 화면 안에서 가장 좋은 내려놓을 자리 (가는 시간·폭풍까지 셈) */
const DEPTHS = [B0 + 0.06, 0.88, FEET, 1.07, B1 - 0.05];
function bestSpot(s: GiantState): { x: number; y: number; v: number } {
  const v = stormV(s), lo = Math.max(s.cam + 0.04, s.awake ? s.sx + 0.3 : 0.2), hi = Math.min(s.cam + 0.98, s.goalX - 0.04);
  let bx = hi, by = FEET, bv = -1e9;
  const push = s.star3At < 0 ? dropsPush(s) : 0, from0 = s.cdown ? s.cx : s.gx + DROP_DX;
  for (let x = lo; x <= hi; x += 0.025)
    for (const y of DEPTHS) {
      if (s.cdown && Math.abs(x - s.cx) < workR(s) + 0.01) continue;
      const fx = s.cdown ? s.cx - DROP_DX : s.gx, fy = s.cdown ? s.cy : s.gy, travel = hyp(x - DROP_DX - fx, y - fy) / walkV(s) + (s.cdown ? 70 : 16);
      const safe = !s.awake || s.sx + v * 1.4 * (travel + 300) < x - HALF - 0.05;
      const val = spotValue(s, x, y) - travel * 0.04 - (safe ? 0 : 30) - (push > 0 && x - from0 < push * 0.85 ? 60 : 0);
      if (val > bv) (bv = val), (bx = x), (by = y);
    }
  if (s.goalX < s.cam + 1.0 && !bossOf(s) && (bv < 14 || (push > 0 && STAGES[s.stage].star[1] - s.drops <= 1))) return { x: s.goalX, y: FEET, v: 99 };
  return { x: bx, y: by, v: bv };
}
/** 봇: 성이 바라는 것 + 땅의 양 + 폭풍 거리를 셈해 내려놓고, 덜 남으면 메고 떠난다 */
export const castlegiantSmart: Bot<GiantState> = {
  name: '바라는 것 + 땅의 양 + 폭풍 거리',
  act(s) {
    const mid = between(s, s.stage < 4);
    if (mid) return mid;
    if (!can(s)) return NO;
    const [sk, sn] = STAGES[s.stage].star;
    if (s.gst === G_WALK && sk === 'drops' && s.star3At < 0 && sn - s.drops <= 1 && !bossOf(s) && s.tx < s.goalX - 0.01 && s.t % 12 === 0) return at(s, Math.min(s.goalX, s.cam + 0.98));
    if (s.gst !== G_DOWN && s.gst !== G_STAND) return NO;
    if (s.gst === G_DOWN) {
      if (s.gt < 30 || s.t % 6) return NO;
      let left = s.cx - HALF;
      for (const p of s.people) if (outside(p) && p.x < left) left = p.x;
      const danger = s.awake && s.swait <= 0 && s.sx + REACH + stormV(s) * 2 * 60 > left - 0.03;
      const idle = s.people.filter((p) => p.st === P_IDLE).length / Math.max(1, pop(s));
      const rem = spotValue(s, s.cx, s.cy, true);
      const b = bossOf(s);
      if (!danger && !(b && Math.abs(b.x - s.cx) < BOSS_NEAR + 0.05) && idle < 0.55 && s.gt < 900) {
        const c = bestSpot(s);
        if (rem > Math.max(5, c.v * 0.35)) {
          // 머무는 동안 손이 놀지 않게: 가장 많이 쥘 수 있는 덩어리를 거인 손으로
          const sc = !s.hand && s.t >= s.handCD && s.pourQ === 0 ? bestScoop(s) : null;
          return sc ? at(s, sc.x, sc.y) : NO;
        }
        return at(s, c.x, c.y);
      }
    }
    const b = bossOf(s);
    if (b && b.x < s.cam + 1.0) return at(s, b.x, b.y);
    const c = bestSpot(s);
    return at(s, c.x, c.y);
  },
};
/** 거인 손으로 퍼 올릴 가장 좋은 곳 (성 톡 자리는 피한다) */
function bestScoop(s: GiantState): { x: number; y: number } | null {
  const wr = workR(s), top = castleTop(s), ds = dscale(s.cy);
  let best: { x: number; y: number } | null = null, bv = 3.5;
  const last = lastScoop.get(s);
  for (const c of s.objs) {
    if (c.dead || Math.abs(c.x - s.cx) > wr - 0.01) continue;
    if (last && hyp(c.x - last.x, c.y - last.y) < 0.07) continue;
    if (Math.abs(c.x - s.cx) < 0.15 * ds && c.y > top - 0.06 && c.y < s.cy + 0.04) continue;
    let v = 0, items = 0;
    const saveMon = STAGES[s.stage].star[0] === 'squash' && s.star3At < 0;
    for (const o of scoopables(s, c.x, c.y)) {
      if (items >= SCOOP_MAX) break;
      if (o.k === 'mon' && o.mk) v += saveMon ? -50 : MD[o.mk].boss ? 4 : o.hp <= 16 ? MD[o.mk].gold * 3 : 2;
      else if (o.k === 'folk') v += 6;
      else if (o.k === 'loot') (v += resW(s, RES_OF[o.sub])), items++;
      else {
        const k = Math.min(o.amt, (o.k === 'chest' ? 3 : 2) + (o.workers > 0 ? 1 : 0));
        v += k * resW(s, RES_OF[o.k === 'chest' ? 'coin' : OD[o.k]!.sub]);
        items += k;
      }
    }
    const [sk, sn] = STAGES[s.stage].star;
    if (sk === 'hand' && s.star3At < 0 && items >= sn) v += 20;
    if (v > bv) (bv = v), (best = { x: c.x, y: c.y });
  }
  if (best) lastScoop.set(s, best);
  return best;
}
const lastScoop = new WeakMap<object, { x: number; y: number }>();
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
    const from = s.cdown ? s.cx + workR(s) + 0.02 : s.gx + DROP_DX + 0.02;
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
    const from = s.cdown ? s.cx + workR(s) + 0.02 : s.gx + DROP_DX;
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

// ───────────────────────────── 그리기: 도구 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const OUT = '#4a2e1f', INK = '#4b3020', MUTED = '#a08a70', CREAM = '#fff6dc';
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.001, rx), Math.max(0.001, ry), rot, 0, TAU);
}
function lin(ctx: C2, x0: number, y0: number, x1: number, y1: number, ...st: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function radg(ctx: C2, x: number, y: number, r0: number, r1: number, ...st: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.001, r1));
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
function ink(g: C2, fill: string | CanvasGradient, lw = 0.06, stroke = OUT) {
  g.fillStyle = fill;
  g.fill();
  if (lw > 0) (g.strokeStyle = stroke), (g.lineWidth = lw), g.stroke();
}
const devScale = (ctx: C2) => (typeof ctx.getTransform === 'function' ? Math.min(3, Math.max(1, Math.round(ctx.getTransform().a || 1))) : 1);

// ───────────────────────────── 스티커 굽기 ─────────────────────────────
/** 스티커 틀: 가로 w · 세로 h (단위), 기준점 = (ox, oy) */
interface Fr { w: number; h: number; ox: number; oy: number }
const SPR = new Map<string, HTMLCanvasElement>();
/** 굽는 크기는 1/3옥타브 계단으로 올려 맞춘다 — 크기가 조금씩 달라도 새로 굽지 않는다(줄여 찍기만) */
const sprQ = (px: number) => Math.ceil(2 ** (Math.ceil(Math.log2(Math.max(4, px)) * 3 - 1e-6) / 3));
function spr(key: string, fr: Fr, px: number, paint: (g: C2) => void): HTMLCanvasElement {
  const q = sprQ(px), k = key + ':' + q;
  let c = SPR.get(k);
  if (!c) {
    if (SPR.size > 2500) SPR.clear();
    c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(fr.w * q));
    c.height = Math.max(1, Math.ceil(fr.h * q));
    const g = c.getContext('2d')!;
    g.translate(fr.ox * q, fr.oy * q);
    g.scale(q, q);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    paint(g);
    SPR.set(k, c);
  }
  return c;
}
/** 자주 찍는 스티커는 숫자 열쇠로 바로 꺼낸다 (프레임마다 글자 열쇠를 만들지 않게) */
const MEMO = new Map<number, { q: number; c: HTMLCanvasElement }>();
function memo(k: number, px: number, make: () => HTMLCanvasElement) {
  const q = sprQ(px), m = MEMO.get(k);
  if (m && m.q === q) return m.c;
  const c = make();
  MEMO.set(k, { q, c });
  return c;
}
/** 스티커 찍기: 지금 원점이 기준점, u = 단위 하나의 px */
function stamp(ctx: C2, c: HTMLCanvasElement, fr: Fr, u: number) {
  ctx.drawImage(c, -fr.ox * u, -fr.oy * u, fr.w * u, fr.h * u);
}
function put(ctx: C2, c: HTMLCanvasElement, fr: Fr, x: number, y: number, u: number, flip = 1, rot = 0, alpha = 1) {
  if (!rot && flip > 0 && alpha >= 1) return void ctx.drawImage(c, x - fr.ox * u, y - fr.oy * u, fr.w * u, fr.h * u);
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (flip < 0) ctx.scale(-1, 1);
  if (alpha < 1) ctx.globalAlpha *= alpha;
  stamp(ctx, c, fr, u);
  ctx.restore();
}
/** 미리 굽기 줄: 그림 프레임 밖(setTimeout)으로 조금씩 — 느린 폰에서 놀이 중 한 프레임이 길어지지 않게 */
const WQ: (() => void)[] = [], WK = new Set<string>();
let pumping = false;
function want(key: string, make: () => void) {
  if (WK.has(key)) return;
  WK.add(key);
  WQ.push(make);
}
function idlePump() {
  if (pumping || !WQ.length || typeof setTimeout !== 'function') return;
  pumping = true;
  const go = () => {
    const a = performance.now();
    while (WQ.length && performance.now() - a < 6) WQ.shift()!();
    if (WQ.length) setTimeout(go, 16);
    else pumping = false;
  };
  setTimeout(go, 0);
}

// ───────────────────────────── 그림: 사람 (단위 = 키, 발 = (0,0), 오른쪽을 본다) ─────────────────────────────
const PF: Fr = { w: 1.5, h: 1.45, ox: 0.75, oy: 1.25 };
type Look = Job | 'folk';
const JOBC: Record<Look, [string, string]> = {
  folk: ['#c69a68', '#8f653d'], jack: ['#e65a45', '#a8352a'], farm: ['#86d35c', '#4f9a33'], fisher: ['#56a6ea', '#2f6fb0'], knight: ['#dfe6ef', '#8f9bb0'],
  miner: ['#f6a043', '#b8661c'], shroomer: ['#b48ae8', '#7650b0'], smith: ['#8a6650', '#4e3428'], picker: ['#f9b3d3', '#d1709e'],
};
const SKIN = ['#f8d3ac', '#ecb98c', '#cf946a', '#f6dcc2'];
/** 사람 한 장: fr 0 섬 · 1·2 걸음 · 3 나르기(두 팔 위) · 4 만세/허우적 · 5 연장 들기 · 6 연장 내리치기 */
function paintPerson(g: C2, look: Look, fr: number, skin: number) {
  const [c0, c1] = JOBC[look], sk = SKIN[skin];
  if (fr !== 4) {
    g.fillStyle = 'rgba(40,30,20,.22)';
    ell(g, 0, -0.01, 0.27, 0.075);
    g.fill();
  }
  const la = fr === 1 ? 0.42 : fr === 2 ? -0.42 : fr === 4 ? 0.3 : fr === 6 ? 0.2 : 0;
  // 다리
  for (const [hx, a, col] of [[-0.07, -la, '#5a4636'], [0.07, la, '#6e5644']] as [number, number, string][]) {
    g.strokeStyle = OUT;
    g.lineWidth = 0.17;
    g.beginPath();
    g.moveTo(hx, -0.3);
    g.lineTo(hx + Math.sin(a) * 0.26, -0.05);
    g.stroke();
    g.strokeStyle = col;
    g.lineWidth = 0.1;
    g.stroke();
    ell(g, hx + Math.sin(a) * 0.26 + 0.04, -0.04, 0.085, 0.05);
    ink(g, '#4a3326', 0.035);
  }
  // 팔 (뒤쪽)
  const arm = (sx: number, sy: number, ex: number, ey: number) => {
    g.strokeStyle = OUT;
    g.lineWidth = 0.15;
    g.beginPath();
    g.moveTo(sx, sy);
    g.lineTo(ex, ey);
    g.stroke();
    g.strokeStyle = c0;
    g.lineWidth = 0.08;
    g.stroke();
    ell(g, ex, ey, 0.06, 0.06);
    ink(g, sk, 0.03);
  };
  const back: [number, number] = fr === 3 ? [-0.1, -1.02] : fr === 4 ? [-0.36, -0.98] : fr >= 5 ? [-0.2, -0.36] : [-0.2 - la * 0.15, -0.34];
  arm(-0.14, -0.56, back[0], back[1]);
  // 몸통
  g.beginPath();
  g.moveTo(-0.2, -0.6);
  g.quadraticCurveTo(0, -0.7, 0.2, -0.6);
  g.lineTo(0.25, -0.26);
  g.quadraticCurveTo(0, -0.2, -0.25, -0.26);
  g.closePath();
  ink(g, lin(g, 0, -0.66, 0, -0.24, [0, c0], [1, c1]), 0.05);
  g.fillStyle = 'rgba(0,0,0,.18)';
  g.fillRect(-0.24, -0.36, 0.48, 0.05);
  if (look === 'knight') (g.fillStyle = '#ff5a4e'), g.fillRect(-0.04, -0.6, 0.08, 0.34);
  if (look === 'smith') (g.fillStyle = '#3a2a22'), g.fillRect(-0.12, -0.5, 0.24, 0.24);
  if (look === 'folk') {
    // 등짐
    ell(g, -0.24, -0.52, 0.14, 0.16);
    ink(g, '#d9b67a', 0.04);
  }
  // 머리
  ell(g, 0.02, -0.8, 0.21, 0.2);
  ink(g, sk, 0.05);
  ell(g, 0.11, -0.81, 0.032, 0.042);
  g.fillStyle = '#2a1c14';
  g.fill();
  ell(g, 0.12, -0.72, 0.05, 0.03);
  g.fillStyle = 'rgba(255,120,120,.45)';
  g.fill();
  g.strokeStyle = '#6a3a2a';
  g.lineWidth = 0.025;
  g.beginPath();
  g.arc(0.14, -0.73, 0.04, 0.2, Math.PI * 0.8);
  g.stroke();
  // 모자
  switch (look) {
    case 'folk':
      g.beginPath();
      g.arc(0.0, -0.84, 0.22, Math.PI * 0.95, Math.PI * 2.05);
      g.closePath();
      ink(g, '#a5774a', 0.04);
      break;
    case 'jack':
      g.beginPath();
      g.arc(0.02, -0.86, 0.2, Math.PI, TAU);
      g.closePath();
      ink(g, '#d8342a', 0.04);
      ell(g, 0.02, -1.08, 0.06, 0.06);
      ink(g, '#ffffff', 0.03);
      break;
    case 'farm':
      ell(g, 0.03, -0.92, 0.34, 0.07);
      ink(g, '#f3d36a', 0.04);
      ell(g, 0.02, -0.99, 0.16, 0.1);
      ink(g, '#f6dc7c', 0.04);
      g.fillStyle = '#e0533f';
      g.fillRect(-0.14, -0.96, 0.32, 0.03);
      break;
    case 'fisher':
      g.beginPath();
      g.moveTo(-0.24, -0.84);
      g.quadraticCurveTo(0.02, -1.14, 0.24, -0.88);
      g.lineTo(0.3, -0.84);
      g.closePath();
      ink(g, '#ffd23f', 0.04);
      break;
    case 'knight':
      g.beginPath();
      g.arc(0.02, -0.82, 0.23, Math.PI * 0.98, TAU * 1.01);
      g.lineTo(0.25, -0.74);
      g.lineTo(-0.21, -0.74);
      g.closePath();
      ink(g, lin(g, 0, -1.05, 0, -0.74, [0, '#ffffff'], [1, '#9aa7ba']), 0.04);
      g.strokeStyle = '#4a5468';
      g.lineWidth = 0.03;
      g.beginPath();
      g.moveTo(0.08, -0.82);
      g.lineTo(0.25, -0.82);
      g.stroke();
      g.beginPath();
      g.moveTo(-0.02, -1.04);
      g.quadraticCurveTo(-0.2, -1.2, -0.3, -1.0);
      g.lineWidth = 0.08;
      g.strokeStyle = '#ff4d4d';
      g.stroke();
      break;
    case 'miner':
      g.beginPath();
      g.arc(0.02, -0.86, 0.22, Math.PI, TAU);
      g.closePath();
      ink(g, '#ffd23f', 0.04);
      g.fillStyle = '#e0a020';
      g.fillRect(-0.22, -0.88, 0.48, 0.04);
      ell(g, 0.22, -0.95, 0.05, 0.05);
      ink(g, '#fffbe0', 0.03);
      break;
    case 'shroomer':
      g.beginPath();
      g.arc(0.02, -0.88, 0.26, Math.PI, TAU);
      g.closePath();
      ink(g, '#ff5a5a', 0.04);
      g.fillStyle = '#ffffff';
      for (const [dx, dy] of [[-0.1, -0.98], [0.08, -1.04], [0.17, -0.93]]) ell(g, dx, dy, 0.04, 0.035), g.fill();
      break;
    case 'smith':
      g.beginPath();
      g.arc(0.02, -0.86, 0.21, Math.PI, TAU);
      g.closePath();
      ink(g, '#e23b3b', 0.04);
      ell(g, -0.21, -0.86, 0.05, 0.04);
      ink(g, '#e23b3b', 0.03);
      break;
    case 'picker':
      for (const [dx, dy, r] of [[-0.1, -0.96, 0.11], [0.06, -1.02, 0.13], [0.18, -0.94, 0.1]]) ell(g, dx, dy, r, r * 0.85), ink(g, '#ffffff', 0.035);
      break;
  }
  // 앞쪽 팔 (+ 연장)
  const front: [number, number] = fr === 3 ? [0.14, -1.02] : fr === 4 ? [0.38, -0.98] : fr === 5 ? [0.2, -0.92] : fr === 6 ? [0.36, -0.46] : [0.2 + la * 0.15, -0.34];
  if (fr >= 5) {
    const [hx, hy] = front, up = fr === 5, a = up ? -2.2 : -0.5;
    g.save();
    g.translate(hx, hy);
    g.rotate(a);
    tool(g, look);
    g.restore();
  }
  arm(0.14, -0.56, front[0], front[1]);
}
/** 연장 (손 = 원점, +x 쪽으로 뻗는다) */
function tool(g: C2, look: Look) {
  const stick = (len: number, col = '#9a6a3a') => {
    g.strokeStyle = OUT;
    g.lineWidth = 0.08;
    g.beginPath();
    g.moveTo(-0.05, 0);
    g.lineTo(len, 0);
    g.stroke();
    g.strokeStyle = col;
    g.lineWidth = 0.04;
    g.stroke();
  };
  switch (look) {
    case 'jack':
      stick(0.42);
      g.beginPath();
      g.moveTo(0.32, -0.02);
      g.lineTo(0.44, -0.14);
      g.quadraticCurveTo(0.5, 0, 0.44, 0.12);
      g.lineTo(0.32, 0.03);
      g.closePath();
      ink(g, '#d6dde6', 0.03);
      break;
    case 'farm':
      stick(0.2);
      g.beginPath();
      g.arc(0.3, 0.02, 0.14, -2.6, 0.4);
      g.strokeStyle = OUT;
      g.lineWidth = 0.07;
      g.stroke();
      g.strokeStyle = '#e8eef4';
      g.lineWidth = 0.035;
      g.stroke();
      break;
    case 'fisher':
      stick(0.7, '#c08a50');
      g.strokeStyle = 'rgba(60,60,60,.8)';
      g.lineWidth = 0.015;
      g.beginPath();
      g.moveTo(0.7, 0);
      g.lineTo(0.72, 0.4);
      g.stroke();
      break;
    case 'knight':
      g.beginPath();
      g.moveTo(0.04, -0.035);
      g.lineTo(0.52, -0.02);
      g.lineTo(0.58, 0);
      g.lineTo(0.52, 0.02);
      g.lineTo(0.04, 0.035);
      g.closePath();
      ink(g, '#eef3f8', 0.03);
      g.fillStyle = '#c99a2e';
      g.fillRect(-0.02, -0.08, 0.05, 0.16);
      break;
    case 'miner':
    case 'smith':
      stick(0.4);
      g.beginPath();
      g.moveTo(0.4, 0);
      g.quadraticCurveTo(0.44, -0.18, 0.3, -0.26);
      g.moveTo(0.4, 0);
      g.quadraticCurveTo(0.46, 0.16, 0.36, 0.24);
      g.strokeStyle = OUT;
      g.lineWidth = 0.07;
      g.stroke();
      g.strokeStyle = look === 'smith' ? '#ffb24a' : '#c9d3df';
      g.lineWidth = 0.035;
      g.stroke();
      break;
    default:
      rr(g, 0.04, -0.06, 0.2, 0.14, 0.04);
      ink(g, '#c88a4a', 0.03);
  }
}
const LOOKS: Look[] = ['folk', 'jack', 'farm', 'fisher', 'knight', 'miner', 'shroomer', 'smith', 'picker'];
const personSpr = (look: Look, fr: number, skin: number, px: number, flip = 1) =>
  memo(1e6 + LOOKS.indexOf(look) * 100 + fr * 10 + skin + (flip < 0 ? 5e5 : 0), px, () => spr(`p${look}${fr}${skin}${flip < 0 ? 'f' : ''}`, PF, px, (g) => (flip < 0 && g.scale(-1, 1), paintPerson(g, look, fr, skin))));

// ───────────────────────────── 그림: 얻을 것 (단위 = 크기, 가운데 = (0,0)) ─────────────────────────────
const IF: Fr = { w: 1.7, h: 1.7, ox: 0.85, oy: 0.85 };
function paintItem(g: C2, it: Item) {
  const lw = 0.08;
  switch (it) {
    case 'log':
      g.save();
      g.rotate(-0.35);
      rr(g, -0.55, -0.22, 1.0, 0.44, 0.2);
      ink(g, lin(g, 0, -0.22, 0, 0.22, [0, '#c9854a'], [1, '#8a5428']), lw);
      ell(g, 0.45, 0, 0.13, 0.22);
      ink(g, '#f3cf8f', lw);
      ell(g, 0.45, 0, 0.06, 0.1);
      g.strokeStyle = '#b88550';
      g.lineWidth = 0.04;
      g.stroke();
      g.restore();
      break;
    case 'stone':
      g.beginPath();
      g.moveTo(-0.5, 0.25);
      g.lineTo(-0.42, -0.2);
      g.lineTo(-0.05, -0.42);
      g.lineTo(0.42, -0.25);
      g.lineTo(0.52, 0.2);
      g.lineTo(0.1, 0.4);
      g.closePath();
      ink(g, lin(g, 0, -0.42, 0, 0.4, [0, '#e2e2e2'], [1, '#8f9196']), lw);
      g.fillStyle = 'rgba(255,255,255,.6)';
      ell(g, -0.15, -0.18, 0.14, 0.07, -0.4);
      g.fill();
      break;
    case 'sheaf':
      for (let i = -3; i <= 3; i++) {
        g.strokeStyle = '#c99a2e';
        g.lineWidth = 0.07;
        g.beginPath();
        g.moveTo(i * 0.04, 0.45);
        g.lineTo(i * 0.11, -0.25);
        g.stroke();
        ell(g, i * 0.12, -0.32, 0.07, 0.14, i * 0.12);
        ink(g, '#ffd65a', 0.04, '#b0801c');
      }
      g.fillStyle = '#e0533f';
      g.fillRect(-0.2, 0.08, 0.4, 0.1);
      break;
    case 'fish':
      g.beginPath();
      g.moveTo(0.5, 0);
      g.quadraticCurveTo(0.2, -0.36, -0.3, -0.12);
      g.lineTo(-0.55, -0.32);
      g.lineTo(-0.48, 0);
      g.lineTo(-0.55, 0.32);
      g.lineTo(-0.3, 0.12);
      g.quadraticCurveTo(0.2, 0.36, 0.5, 0);
      g.closePath();
      ink(g, lin(g, 0, -0.3, 0, 0.3, [0, '#8fd8ff'], [1, '#3f8fd6']), lw);
      ell(g, 0.28, -0.05, 0.06, 0.06);
      g.fillStyle = '#1e2a3a';
      g.fill();
      break;
    case 'shroom':
      g.fillStyle = '#fff1dc';
      rr(g, -0.14, -0.05, 0.28, 0.45, 0.1);
      ink(g, '#fff1dc', lw);
      g.beginPath();
      g.arc(0, 0, 0.48, Math.PI, TAU);
      g.closePath();
      ink(g, lin(g, 0, -0.48, 0, 0, [0, '#ff7a6a'], [1, '#d8342a']), lw);
      g.fillStyle = '#ffffff';
      for (const [dx, dy, r] of [[-0.22, -0.18, 0.08], [0.1, -0.3, 0.07], [0.27, -0.12, 0.06]]) ell(g, dx, dy, r, r), g.fill();
      break;
    case 'fruit':
      ell(g, 0, 0.05, 0.42, 0.4);
      ink(g, radg(g, -0.15, -0.1, 0.02, 0.5, [0, '#ffe2ef'], [1, '#ff7fb3']), lw);
      ell(g, 0.18, -0.38, 0.16, 0.07, -0.5);
      ink(g, '#7fd36a', 0.05);
      break;
    case 'coin':
      ell(g, 0, 0, 0.45, 0.45);
      ink(g, radg(g, -0.15, -0.15, 0.02, 0.55, [0, '#fff6b0'], [0.6, '#ffc93c'], [1, '#e09a10']), lw);
      ell(g, 0, 0, 0.3, 0.3);
      g.strokeStyle = '#c9840c';
      g.lineWidth = 0.05;
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,.8)';
      ell(g, -0.14, -0.16, 0.08, 0.05, -0.6);
      g.fill();
      break;
  }
}
const ITEMS: Item[] = ['log', 'stone', 'sheaf', 'fish', 'shroom', 'fruit', 'coin'];
const itemSpr = (it: Item, px: number) => memo(2e6 + ITEMS.indexOf(it) * 1000 + Math.round(px), px, () => spr('i' + it, IF, px, (g) => paintItem(g, it)));
const RES_ITEM: Record<Res, Item> = { wood: 'log', stone: 'stone', food: 'sheaf', gold: 'coin' };

// ───────────────────────────── 그림: 땅의 것 (나무 · 밀 · 바위 · 버섯 · 몬스터 …) ─────────────────────────────
/** 나무: 단위 = 나무 키, 밑동 = (0,0). style 0 둥근 잎 · 1 뾰족 소나무 · 2 구름 나무 · 3 구름 열매 나무 · 9 그루터기 */
const TF: Fr = { w: 1.2, h: 1.14, ox: 0.6, oy: 1.06 };
function paintTree(g: C2, style: number, v: number) {
  const lw = 0.035, k = 1 + (v - 1) * 0.06;
  g.fillStyle = 'rgba(40,60,20,.22)';
  ell(g, 0, 0, style === 9 ? 0.12 : 0.3, 0.055);
  g.fill();
  const trunk = (top: number, col: string) => {
    g.beginPath();
    g.moveTo(-0.07, 0);
    g.lineTo(-0.045, top);
    g.lineTo(0.045, top);
    g.lineTo(0.07, 0);
    g.closePath();
    ink(g, lin(g, -0.07, 0, 0.07, 0, [0, col], [1, '#5e3a20']), lw);
  };
  if (style === 9) {
    trunk(-0.1, '#9a6a3a');
    ell(g, 0, -0.1, 0.05, 0.02);
    ink(g, '#f0c98a', 0.025);
    return;
  }
  if (style === 1) {
    trunk(-0.25, '#8a5a34');
    for (let i = 0; i < 3; i++) {
      const y0 = -0.18 - i * 0.24, wd = (0.36 - i * 0.08) * k;
      g.beginPath();
      g.moveTo(-wd, y0);
      g.lineTo(0, y0 - 0.38);
      g.lineTo(wd, y0);
      g.closePath();
      ink(g, lin(g, 0, y0 - 0.38, 0, y0, [0, '#4fae7a'], [1, '#2e6f52']), lw);
      g.beginPath();
      g.moveTo(-wd * 0.45, y0 - 0.21);
      g.lineTo(0, y0 - 0.38);
      g.lineTo(wd * 0.45, y0 - 0.21);
      g.quadraticCurveTo(0, y0 - 0.16, -wd * 0.45, y0 - 0.21);
      g.fillStyle = '#ffffff';
      g.fill();
    }
    return;
  }
  const cols: [string, string, string] = style === 0 ? ['#a6e870', '#5cbf4a', '#3a8f34'] : style === 2 ? ['#ffffff', '#f3ecff', '#cbbcf0'] : ['#fff4fb', '#ffd6ec', '#e7a6cf'];
  trunk(-0.42, style === 0 ? '#9a6a3a' : '#c4a0e0');
  const blobs: [number, number, number][] = v === 0 ? [[-0.2, -0.56, 0.24], [0.2, -0.55, 0.23], [0, -0.78, 0.3]] : v === 1 ? [[-0.22, -0.6, 0.22], [0.22, -0.62, 0.22], [-0.05, -0.82, 0.27], [0.12, -0.74, 0.2]] : [[-0.16, -0.52, 0.22], [0.18, -0.6, 0.25], [-0.02, -0.82, 0.25]];
  for (const [x, y, r] of blobs) ell(g, x * k, y, r * k, r * k * 0.92), ink(g, cols[2], lw * 2.2);
  for (const [x, y, r] of blobs) ell(g, x * k, y, r * k, r * k * 0.92), (g.fillStyle = radg(g, x * k - r * 0.3, y - r * 0.35, r * 0.1, r * 1.2, [0, cols[0]], [0.55, cols[1]], [1, cols[2]])), g.fill();
  g.fillStyle = 'rgba(255,255,255,.35)';
  ell(g, -0.12 * k, -0.86, 0.1, 0.05, -0.4);
  g.fill();
  if (style === 3)
    for (const [x, y] of [[-0.2, -0.55], [0.15, -0.66], [0.02, -0.86], [0.24, -0.5], [-0.08, -0.7]]) {
      ell(g, x * k, y, 0.055, 0.055);
      ink(g, radg(g, x * k - 0.02, y - 0.02, 0.005, 0.06, [0, '#ffffff'], [1, '#ff6fa8']), 0.02);
    }
  if (style === 0 && v === 2)
    for (const [x, y] of [[-0.18, -0.6], [0.16, -0.66], [0.04, -0.86]]) (g.fillStyle = '#ff5a4e'), ell(g, x, y, 0.035, 0.035), g.fill();
}
const treeSpr = (style: number, v: number, px: number) => memo(3e6 + style * 10 + v, px, () => spr(`t${style}${v}`, TF, px, (g) => paintTree(g, style, v)));
/** 밀 · 버섯 · 바위 무더기: 단위 = 너비, 바닥 가운데 = (0,0). q = 남은 양 0~3 */
const CF: Fr = { w: 1.3, h: 1.15, ox: 0.65, oy: 0.95 };
function paintCrop(g: C2, k: OK, q: number, v: number) {
  const lw = 0.03;
  if (k === 'wheat') {
    g.fillStyle = 'rgba(120,80,20,.25)';
    ell(g, 0, 0, 0.45, 0.08);
    g.fill();
    if (q === 0) {
      g.strokeStyle = '#b8924a';
      g.lineWidth = 0.035;
      for (let i = -4; i <= 4; i++) g.beginPath(), g.moveTo(i * 0.09, 0), g.lineTo(i * 0.09 + 0.02, -0.1), g.stroke();
      return;
    }
    const n = 3 + q * 3;
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5) / n - 0.5) * 0.85, hgt = 0.55 + hsh(i + v) * 0.25, lean = (hsh(i * 3 + v) - 0.5) * 0.15;
      g.strokeStyle = '#a8862e';
      g.lineWidth = 0.035;
      g.beginPath();
      g.moveTo(x, 0);
      g.quadraticCurveTo(x, -hgt * 0.5, x + lean, -hgt);
      g.stroke();
      ell(g, x + lean, -hgt - 0.07, 0.045, 0.1, lean);
      ink(g, lin(g, 0, -hgt - 0.17, 0, -hgt + 0.03, [0, '#fff0a0'], [1, '#f0b830']), lw, '#a8781c');
    }
    return;
  }
  if (k === 'shroom') {
    const n = q === 0 ? 0 : q + 1;
    g.fillStyle = 'rgba(40,60,30,.3)';
    ell(g, 0, 0, 0.45, 0.08);
    g.fill();
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 0.24, sz = 0.2 + hsh(i + v) * 0.12 + (i === 1 ? 0.08 : 0), y = -0.02 * (i % 2);
      rr(g, x - sz * 0.25, y - sz * 1.1, sz * 0.5, sz * 1.1, sz * 0.2);
      ink(g, '#fff1dc', lw);
      g.beginPath();
      g.arc(x, y - sz * 1.05, sz, Math.PI, TAU);
      g.closePath();
      ink(g, lin(g, 0, y - sz * 2, 0, y - sz, [0, v % 2 ? '#c88aff' : '#ff7a6a'], [1, v % 2 ? '#8a50d0' : '#d8342a']), lw);
      g.fillStyle = '#ffffff';
      ell(g, x - sz * 0.4, y - sz * 1.5, sz * 0.16, sz * 0.13);
      g.fill();
      ell(g, x + sz * 0.3, y - sz * 1.7, sz * 0.13, sz * 0.11);
      g.fill();
    }
    if (q === 0) (g.fillStyle = '#7a8a5a'), ell(g, 0, -0.02, 0.2, 0.05), g.fill();
    return;
  }
  // 바위 (rock: 회색 · hot: 불꽃 · ice: 얼음)
  const hot = k === 'hot', icy = v === 99;
  const sz = q === 0 ? 0.22 : 0.3 + q * 0.07;
  g.fillStyle = 'rgba(40,30,20,.25)';
  ell(g, 0, 0, sz * 1.3, 0.07);
  g.fill();
  if (q === 0) {
    for (const [x, r] of [[-0.18, 0.09], [0.05, 0.12], [0.22, 0.07]]) ell(g, x, -r * 0.6, r, r * 0.75), ink(g, hot ? '#6a3a2a' : '#a8a8a8', lw);
    return;
  }
  g.beginPath();
  g.moveTo(-sz * 1.2, 0);
  g.lineTo(-sz * 1.05, -sz * 0.9);
  g.lineTo(-sz * 0.3, -sz * 1.55);
  g.lineTo(sz * 0.55, -sz * 1.35);
  g.lineTo(sz * 1.15, -sz * 0.6);
  g.lineTo(sz * 1.2, 0);
  g.closePath();
  const c = hot ? ['#a0584a', '#5a2a22'] : icy ? ['#ffffff', '#9fd0ec'] : ['#e4e2dc', '#8f8c86'];
  ink(g, lin(g, -sz, -sz * 1.5, sz, 0, [0, c[0]], [1, c[1]]), lw * 1.5);
  g.fillStyle = 'rgba(255,255,255,.45)';
  g.beginPath();
  g.moveTo(-sz * 0.95, -sz * 0.85);
  g.lineTo(-sz * 0.3, -sz * 1.45);
  g.lineTo(sz * 0.1, -sz * 1.38);
  g.lineTo(-sz * 0.5, -sz * 0.75);
  g.closePath();
  g.fill();
  g.strokeStyle = hot ? '#ffb347' : 'rgba(60,50,40,.5)';
  g.lineWidth = hot ? 0.045 : 0.025;
  g.beginPath();
  g.moveTo(sz * 0.2, -sz * 1.3);
  g.lineTo(0, -sz * 0.8);
  g.lineTo(sz * 0.35, -sz * 0.45);
  g.moveTo(-sz * 0.6, -sz * 0.3);
  g.lineTo(-sz * 0.2, -sz * 0.5);
  g.stroke();
  if (!hot && !icy)
    for (const [x, y] of [[-0.12, -0.5], [0.25, -0.7], [0.1, -0.3]]) {
      g.fillStyle = v % 3 === 0 ? '#ffd23f' : '#9fe0ff';
      starPath(g, x * sz * 3, y * sz * 1.8, 0.04, 0.4);
      g.fill();
    }
}
const CROPK: OK[] = ['wheat', 'shroom', 'rock', 'hot'];
const cropSpr = (k: OK, q: number, v: number, px: number) => memo(4e6 + CROPK.indexOf(k) * 1000 + q * 100 + v, px, () => spr(`c${k}${q}${v}`, CF, px, (g) => paintCrop(g, k, q, v)));
/** 몬스터: 단위 = 반지름, 발 = (0,0). mood 0 평소 · 1 내리치려 함 · 2 아야 · 3 어질 */
const MF: Fr = { w: 3.6, h: 3.4, ox: 1.8, oy: 2.95 };
function eyes(g: C2, x: number, y: number, e: number, s: number, mood: number) {
  for (const sx of [-1, 1]) {
    const ex = x + sx * e;
    if (mood === 2) {
      g.strokeStyle = '#2a1a14';
      g.lineWidth = s * 0.5;
      g.beginPath();
      g.moveTo(ex - s, y - s);
      g.lineTo(ex + s, y + s);
      g.moveTo(ex + s, y - s);
      g.lineTo(ex - s, y + s);
      g.stroke();
    } else if (mood === 3) {
      g.strokeStyle = '#2a1a14';
      g.lineWidth = s * 0.4;
      g.beginPath();
      g.arc(ex, y, s, 0, Math.PI * 1.6);
      g.stroke();
    } else {
      ell(g, ex, y, s * 1.05, s * 1.25);
      ink(g, '#ffffff', s * 0.35, '#2a1a14');
      ell(g, ex + s * 0.25, y + s * 0.15, s * 0.55, s * 0.7);
      g.fillStyle = '#2a1a14';
      g.fill();
      ell(g, ex + s * 0.05, y - s * 0.25, s * 0.22, s * 0.22);
      g.fillStyle = '#ffffff';
      g.fill();
      if (mood === 1) {
        g.strokeStyle = '#2a1a14';
        g.lineWidth = s * 0.45;
        g.beginPath();
        g.moveTo(ex - s * 1.2 * sx, y - s * 1.9);
        g.lineTo(ex + s * 1.1 * sx, y - s * 1.3);
        g.stroke();
      }
    }
  }
}
function mouth(g: C2, x: number, y: number, wd: number, mood: number, teeth = false) {
  g.strokeStyle = '#2a1a14';
  g.lineWidth = wd * 0.18;
  g.beginPath();
  if (mood === 1) {
    g.moveTo(x - wd, y + wd * 0.2);
    g.quadraticCurveTo(x, y - wd * 0.4, x + wd, y + wd * 0.2);
    g.closePath();
    g.fillStyle = '#7a2a2a';
    g.fill();
    g.stroke();
  } else if (mood === 2 || mood === 3) {
    ell(g, x, y, wd * 0.45, wd * 0.35);
    g.fillStyle = '#7a2a2a';
    g.fill();
    g.stroke();
  } else {
    g.arc(x, y - wd * 0.5, wd, 0.25, Math.PI - 0.25);
    g.stroke();
  }
  if (teeth) {
    g.fillStyle = '#ffffff';
    for (const sx of [-1, 1]) g.beginPath(), g.moveTo(x + sx * wd * 0.6, y), g.lineTo(x + sx * wd * 0.45, y - wd * 0.55), g.lineTo(x + sx * wd * 0.3, y), g.closePath(), g.fill(), g.stroke();
  }
}
function club(g: C2, x: number, y: number, a: number, len: number, col: string) {
  g.save();
  g.translate(x, y);
  g.rotate(a);
  g.beginPath();
  g.moveTo(-0.08, 0);
  g.lineTo(-0.12 * len, -len);
  g.quadraticCurveTo(0, -len * 1.25, 0.22 * len, -len);
  g.lineTo(0.08, 0);
  g.closePath();
  ink(g, col, 0.07);
  g.restore();
}
function paintMon(g: C2, mk: MK, mood: number) {
  const lw = 0.09;
  g.fillStyle = 'rgba(40,20,30,.25)';
  ell(g, 0, 0, 1.05, 0.22);
  g.fill();
  const wind = mood === 1;
  switch (mk) {
    case 'slime': {
      const tall = wind ? 1.25 : mood === 2 ? 0.75 : 1;
      g.beginPath();
      g.moveTo(-1, 0);
      g.bezierCurveTo(-1.05, -1.3 * tall, 1.05, -1.3 * tall, 1, 0);
      g.quadraticCurveTo(0, 0.12, -1, 0);
      g.closePath();
      ink(g, radg(g, -0.3, -0.8 * tall, 0.05, 1.3, [0, '#d8ffb0'], [0.6, '#7fdc5c'], [1, '#3faa3a']), lw);
      g.fillStyle = 'rgba(255,255,255,.6)';
      ell(g, -0.45, -0.75 * tall, 0.18, 0.1, -0.6);
      g.fill();
      eyes(g, 0.12, -0.55 * tall, 0.28, 0.13, mood);
      mouth(g, 0.12, -0.28 * tall, 0.18, mood);
      break;
    }
    case 'goblin':
    case 'ogre': {
      const big = mk === 'ogre', body = big ? ['#d8a6ff', '#9a66d8', '#6e44a8'] : ['#c8e88a', '#8cbf4a', '#5a8a2e'];
      // 다리
      for (const sx of [-0.4, 0.4]) rr(g, sx - 0.18, -0.45, 0.36, 0.45, 0.12), ink(g, body[2], lw);
      // 뒤쪽 팔 + 몽둥이
      club(g, -0.75, -0.95, wind ? -0.9 : -0.25, big ? 1.1 : 0.85, '#a8743a');
      // 몸
      ell(g, 0, -1.0, 0.95, 0.85);
      ink(g, radg(g, -0.3, -1.4, 0.1, 1.2, [0, body[0]], [0.6, body[1]], [1, body[2]]), lw);
      ell(g, 0.1, -0.78, 0.5, 0.42);
      g.fillStyle = big ? 'rgba(255,230,255,.5)' : 'rgba(255,255,220,.45)';
      g.fill();
      // 귀 · 뿔
      if (big) for (const sx of [-1, 1]) g.beginPath(), g.moveTo(sx * 0.35, -1.7), g.lineTo(sx * 0.5, -2.15), g.lineTo(sx * 0.62, -1.62), g.closePath(), ink(g, '#fff3d6', lw * 0.8);
      else for (const sx of [-1, 1]) g.beginPath(), g.moveTo(sx * 0.75, -1.35), g.lineTo(sx * 1.35, -1.6), g.lineTo(sx * 0.85, -1.1), g.closePath(), ink(g, body[1], lw * 0.8);
      eyes(g, 0.15, -1.22, 0.3, 0.15, mood);
      ell(g, 0.32, -1.02, 0.17, 0.13);
      ink(g, body[2], lw * 0.6);
      mouth(g, 0.15, -0.72, 0.28, mood, big);
      break;
    }
    case 'troll':
    case 'yeti':
    case 'drake': {
      const C = mk === 'troll' ? ['#b8d0a0', '#7f9a6a', '#4e6a40', '#8aa86a'] : mk === 'yeti' ? ['#ffffff', '#e2ecf6', '#9fb4cc', '#7fb8e8'] : ['#bfe0ff', '#6a9ae8', '#3a5aa8', '#ffd84a'];
      if (mk === 'drake')
        for (const sx of [-1, 1]) {
          g.beginPath();
          g.moveTo(sx * 0.4, -1.4);
          g.quadraticCurveTo(sx * 1.6, -2.5, sx * 1.7, -1.3);
          g.quadraticCurveTo(sx * 1.2, -1.5, sx * 0.6, -1.0);
          g.closePath();
          ink(g, '#8fb8ff', lw);
        }
      for (const sx of [-0.45, 0.45]) rr(g, sx - 0.22, -0.5, 0.44, 0.5, 0.15), ink(g, C[2], lw);
      if (mk === 'troll') club(g, -0.85, -1.0, wind ? -1.0 : -0.3, 1.3, '#9a9a92');
      // 굵은 팔 + 주먹 (내리치려 하면 번쩍 든다)
      for (const sx of [-1, 1]) {
        if (mk === 'troll' && sx < 0) continue;
        const ay = wind ? -1.9 : -0.75;
        g.beginPath();
        g.moveTo(sx * 0.75, -1.2);
        g.quadraticCurveTo(sx * 1.25, -1.1, sx * 1.15, ay);
        g.lineWidth = 0.34;
        g.strokeStyle = OUT;
        g.stroke();
        g.lineWidth = 0.24;
        g.strokeStyle = C[1];
        g.stroke();
        ell(g, sx * 1.15, ay, 0.24, 0.22);
        ink(g, C[1], lw);
      }
      ell(g, 0, -1.05, 1.0, 0.95);
      ink(g, radg(g, -0.35, -1.5, 0.1, 1.3, [0, C[0]], [0.65, C[1]], [1, C[2]]), lw);
      ell(g, 0.05, -0.82, 0.55, 0.45);
      g.fillStyle = mk === 'drake' ? '#ffe9a0' : 'rgba(255,255,255,.4)';
      g.fill();
      if (mk === 'yeti') for (const sx of [-1, 1]) g.beginPath(), g.moveTo(sx * 0.4, -1.8), g.quadraticCurveTo(sx * 0.9, -2.3, sx * 0.75, -1.6), g.closePath(), ink(g, '#cfe3f5', lw * 0.8);
      if (mk === 'drake') for (const sx of [-1, 1]) g.beginPath(), g.moveTo(sx * 0.3, -1.85), g.lineTo(sx * 0.55, -2.45), g.lineTo(sx * 0.62, -1.75), g.closePath(), ink(g, '#ffd84a', lw * 0.8);
      if (mk === 'troll') for (const [x, y] of [[-0.5, -1.7], [0.2, -1.92], [0.6, -1.5]]) ell(g, x, y, 0.22, 0.12), ink(g, '#6fbf4a', lw * 0.6);
      // 얼굴
      ell(g, 0.2, -1.25, 0.55, 0.42);
      g.fillStyle = mk === 'yeti' ? '#9fd0f0' : 'rgba(255,255,255,.18)';
      g.fill();
      eyes(g, 0.22, -1.38, 0.28, 0.13, mood);
      ell(g, 0.42, -1.2, 0.16, 0.12);
      ink(g, C[3], lw * 0.6);
      mouth(g, 0.22, -0.95, 0.32, mood, true);
      // 왕관
      g.beginPath();
      g.moveTo(-0.32, -1.92);
      g.lineTo(-0.3, -2.22);
      g.lineTo(-0.12, -2.04);
      g.lineTo(0.02, -2.3);
      g.lineTo(0.16, -2.04);
      g.lineTo(0.34, -2.22);
      g.lineTo(0.36, -1.92);
      g.closePath();
      ink(g, lin(g, 0, -2.3, 0, -1.92, [0, '#fff6b0'], [1, '#f0b020']), lw * 0.7);
      break;
    }
  }
}
const MKS: MK[] = ['slime', 'goblin', 'ogre', 'troll', 'yeti', 'drake'];
const monSpr = (mk: MK, mood: number, px: number) => memo(5e6 + MKS.indexOf(mk) * 1000 + mood * 100 + Math.min(99, Math.round(px / 4)), px, () => spr(`m${mk}${mood}`, MF, px, (g) => paintMon(g, mk, mood)));
/** 보물 상자 · 우리(갇힌 사람) — 단위 = 너비 */
const BF: Fr = { w: 1.4, h: 1.4, ox: 0.7, oy: 1.15 };
function paintBox(g: C2, k: 'chest' | 'cage', open: number) {
  const lw = 0.05;
  if (k === 'chest') {
    rr(g, -0.5, -0.5, 1.0, 0.5, 0.06);
    ink(g, lin(g, 0, -0.5, 0, 0, [0, '#c98a4a'], [1, '#8a5428']), lw);
    if (open) {
      for (const [x, y] of [[-0.25, -0.55], [0, -0.62], [0.22, -0.56], [-0.1, -0.7], [0.12, -0.72]]) ell(g, x, y, 0.13, 0.11), ink(g, '#ffc93c', 0.03, '#b07a10');
      g.beginPath();
      g.moveTo(-0.5, -0.5);
      g.lineTo(-0.45, -0.95);
      g.lineTo(0.45, -0.95);
      g.lineTo(0.5, -0.5);
      ink(g, '#a8683a', lw);
    } else {
      g.beginPath();
      g.moveTo(-0.5, -0.5);
      g.quadraticCurveTo(0, -0.85, 0.5, -0.5);
      g.closePath();
      ink(g, '#b87a40', lw);
    }
    g.fillStyle = '#ffd23f';
    g.fillRect(-0.08, -0.56, 0.16, 0.18);
    g.strokeStyle = '#6a4020';
    g.lineWidth = 0.04;
    g.strokeRect(-0.5, -0.32, 1.0, 0.04);
    return;
  }
  // 우리: 나무 창살 + 안에서 손 흔드는 사람
  rr(g, -0.5, -0.9, 1.0, 0.9, 0.06);
  g.fillStyle = 'rgba(70,40,30,.35)';
  g.fill();
  for (const x of [-0.25, 0.08]) {
    ell(g, x + 0.1, -0.45, 0.13, 0.12);
    ink(g, SKIN[x < 0 ? 0 : 2], 0.03);
    g.fillStyle = '#2a1c14';
    ell(g, x + 0.14, -0.47, 0.02, 0.025);
    g.fill();
    g.strokeStyle = '#2a1c14';
    g.lineWidth = 0.025;
    g.beginPath();
    g.arc(x + 0.12, -0.38, 0.04, Math.PI * 1.1, Math.PI * 1.9);
    g.stroke();
  }
  g.strokeStyle = OUT;
  g.lineWidth = 0.1;
  for (let i = 0; i < 6; i++) g.beginPath(), g.moveTo(-0.45 + i * 0.18, -0.9), g.lineTo(-0.45 + i * 0.18, 0), g.stroke();
  g.strokeStyle = '#b8824a';
  g.lineWidth = 0.06;
  for (let i = 0; i < 6; i++) g.beginPath(), g.moveTo(-0.45 + i * 0.18, -0.9), g.lineTo(-0.45 + i * 0.18, 0), g.stroke();
  rr(g, -0.55, -1.0, 1.1, 0.14, 0.05);
  ink(g, '#9a6a3a', lw);
  rr(g, -0.55, -0.08, 1.1, 0.12, 0.05);
  ink(g, '#9a6a3a', lw);
}
const boxSpr = (k: 'chest' | 'cage', open: number, px: number) => spr(`b${k}${open}`, BF, px, (g) => paintBox(g, k, open));

// ───────────────────────────── 그림: 성 (단위 = 성 너비 0.2, 바닥 가운데 = (0,0)) ─────────────────────────────
const CW = 0.3;
/** 성 한 층 그리기: 바닥 y0(위로 -), 높이 fh. 창문에는 작은 얼굴이 내다본다 */
function paintFloor(g: C2, k: PK, y0: number, fh: number, i: number) {
  const lw = 0.025, x0 = -0.44, x1 = 0.44, top = y0 - fh;
  const wall = (c0: string, c1: string) => {
    g.beginPath();
    g.rect(x0, top, x1 - x0, fh);
    ink(g, lin(g, x0, 0, x1, 0, [0, c0], [0.7, c0], [1, c1]), lw);
  };
  const win = (x: number, glow = false) => {
    const wh = Math.min(0.16, fh * 0.55), ww = wh * 0.62, wy = top + fh * 0.5 - wh / 2;
    rr(g, x - ww / 2, wy, ww, wh, ww / 2);
    ink(g, glow ? '#ffb84a' : '#3a2a3a', lw);
    if (!glow && fh > 0.12) {
      ell(g, x, wy + wh * 0.6, ww * 0.34, ww * 0.32);
      ink(g, SKIN[(i + Math.round(x * 10)) & 3], 0.012);
    }
  };
  switch (k) {
    case 'tower':
      wall('#d9a066', '#a8703a');
      g.strokeStyle = 'rgba(90,50,20,.45)';
      g.lineWidth = 0.012;
      for (let y = top + fh / 3; y < y0 - 0.01; y += fh / 3) g.beginPath(), g.moveTo(x0, y), g.lineTo(x1, y), g.stroke();
      win(-0.2);
      win(0.2);
      g.fillStyle = '#8a5a30';
      g.fillRect(-0.52, y0 - 0.035, 1.04, 0.035);
      for (let x = -0.5; x <= 0.5; x += 0.1) g.fillRect(x - 0.008, y0 - 0.09, 0.016, 0.06);
      g.fillRect(-0.52, y0 - 0.1, 1.04, 0.02);
      break;
    case 'mill':
      wall('#fff4dc', '#e0c89a');
      win(-0.15);
      g.fillStyle = '#c98a4a';
      g.fillRect(x0, top, x1 - x0, Math.min(0.03, fh * 0.2));
      break;
    case 'wheel':
      wall('#cfe6f2', '#94b8cc');
      win(0.15);
      g.strokeStyle = 'rgba(40,80,110,.35)';
      g.lineWidth = 0.012;
      g.beginPath();
      g.moveTo(x0, y0 - fh * 0.3);
      g.lineTo(x1, y0 - fh * 0.3);
      g.stroke();
      break;
    case 'cannon':
      wall('#b8b8c0', '#83838e');
      win(-0.2);
      rr(g, 0.2, top + fh * 0.3, 0.42, fh * 0.4, fh * 0.2);
      ink(g, lin(g, 0, top + fh * 0.3, 0, top + fh * 0.7, [0, '#5a5a66'], [1, '#22222a']), lw);
      ell(g, 0.62, top + fh * 0.5, 0.04, fh * 0.2);
      ink(g, '#111', lw);
      break;
    case 'wall':
      wall('#c9c4b8', '#8f897c');
      g.strokeStyle = 'rgba(70,60,50,.4)';
      g.lineWidth = 0.012;
      for (let r = 0, y = top + fh / 3; y < y0 - 0.005; y += fh / 3, r++)
        for (let x = x0 + (r % 2 ? 0.08 : 0.16); x < x1; x += 0.16) g.beginPath(), g.moveTo(x, y - fh / 3), g.lineTo(x, y), g.stroke();
      for (let y = top + fh / 3; y < y0 - 0.005; y += fh / 3) g.beginPath(), g.moveTo(x0, y), g.lineTo(x1, y), g.stroke();
      g.fillStyle = '#b8b2a4';
      for (let x = x0; x < x1 - 0.05; x += 0.16) (g.beginPath(), g.rect(x, top - 0.05, 0.09, 0.05)), ink(g, '#c9c4b8', lw);
      break;
    case 'flag':
      wall('#ffe3ef', '#f0b0cc');
      for (const [x, c] of [[-0.3, '#ff5a4e'], [0, '#ffd23f'], [0.3, '#4fc3f7']] as [number, string][]) {
        g.beginPath();
        g.moveTo(x - 0.08, top + 0.01);
        g.lineTo(x + 0.08, top + 0.01);
        g.lineTo(x + 0.08, top + fh * 0.8);
        g.lineTo(x, top + fh * 0.62);
        g.lineTo(x - 0.08, top + fh * 0.8);
        g.closePath();
        ink(g, c, lw);
      }
      break;
    case 'forge':
      wall('#d8826a', '#a04a38');
      win(-0.18, true);
      rr(g, 0.22, top - 0.14, 0.12, 0.16, 0.02);
      ink(g, '#8a3a2a', lw);
      break;
    case 'garden':
      wall('#a8e08a', '#6fb85a');
      for (let x = x0 + 0.06; x < x1; x += 0.13) {
        ell(g, x, top + 0.02, 0.07, 0.05);
        ink(g, '#5aa83a', lw);
        ell(g, x + 0.02, top + 0.005, 0.025, 0.025);
        g.fillStyle = (x * 10) % 2 > 1 ? '#ff8ac0' : '#ffe36b';
        g.fill();
        g.strokeStyle = '#4f9a33';
        g.lineWidth = 0.02;
        g.beginPath();
        g.moveTo(x, top + 0.04);
        g.quadraticCurveTo(x + 0.03, top + fh * 0.5, x - 0.01, top + fh * 0.85);
        g.stroke();
      }
      break;
    case 'roof':
      wall('#fff0b0', '#e9c460');
      win(0);
      break;
  }
}
/** 성 문 층(바닥) */
function paintBase(g: C2) {
  const lw = 0.025, H = 0.5;
  // 옆 작은 탑
  for (const sx of [-1, 1]) {
    rr(g, sx * 0.58 - 0.1, -H - 0.06, 0.2, H + 0.06, 0.03);
    ink(g, lin(g, 0, -H, 0, 0, [0, '#fbeccf'], [1, '#e2c99a']), lw);
    g.beginPath();
    g.moveTo(sx * 0.58 - 0.13, -H - 0.05);
    g.lineTo(sx * 0.58, -H - 0.27);
    g.lineTo(sx * 0.58 + 0.13, -H - 0.05);
    g.closePath();
    ink(g, lin(g, 0, -H - 0.27, 0, -H, [0, '#ff8a6a'], [1, '#d8442e']), lw);
  }
  g.beginPath();
  g.rect(-0.5, -H, 1.0, H);
  ink(g, lin(g, -0.5, 0, 0.5, 0, [0, '#fbeccf'], [0.75, '#f3dfb8'], [1, '#d9bd8a']), lw);
  g.strokeStyle = 'rgba(140,100,60,.28)';
  g.lineWidth = 0.012;
  for (let r = 0, y = -H + 0.1; y < 0; y += 0.1, r++) {
    g.beginPath();
    g.moveTo(-0.5, y);
    g.lineTo(0.5, y);
    g.stroke();
    for (let x = -0.5 + (r % 2 ? 0.1 : 0.2); x < 0.5; x += 0.2) g.beginPath(), g.moveTo(x, y - 0.1), g.lineTo(x, y), g.stroke();
  }
  // 성문 (아치)
  g.beginPath();
  g.moveTo(-0.17, 0);
  g.lineTo(-0.17, -0.22);
  g.arc(0, -0.22, 0.17, Math.PI, TAU);
  g.lineTo(0.17, 0);
  g.closePath();
  ink(g, lin(g, 0, -0.39, 0, 0, [0, '#8a5428'], [1, '#5e3418']), lw * 1.4);
  g.strokeStyle = 'rgba(40,20,10,.5)';
  g.lineWidth = 0.014;
  for (const x of [-0.08, 0, 0.08]) g.beginPath(), g.moveTo(x, -0.36), g.lineTo(x, 0), g.stroke();
  g.fillStyle = '#4a4a52';
  g.fillRect(-0.17, -0.27, 0.34, 0.025);
  g.fillRect(-0.17, -0.1, 0.34, 0.025);
  // 창문 둘
  for (const x of [-0.33, 0.33]) {
    rr(g, x - 0.05, -0.4, 0.1, 0.14, 0.05);
    ink(g, '#3a2a3a', lw);
    ell(g, x, -0.31, 0.035, 0.032);
    ink(g, SKIN[x < 0 ? 1 : 0], 0.01);
  }
}
/** 꼭대기 지붕 (황금 지붕이면 금빛) */
function paintRoof(g: C2, y0: number, gold: boolean) {
  const lw = 0.025;
  g.fillStyle = '#e2c99a';
  for (let x = -0.44; x < 0.44; x += 0.16) (g.beginPath(), g.rect(x, y0 - 0.05, 0.09, 0.05)), ink(g, '#f3dfb8', lw);
  g.beginPath();
  g.moveTo(-0.34, y0 - 0.02);
  g.quadraticCurveTo(-0.1, y0 - 0.12, 0, y0 - 0.38);
  g.quadraticCurveTo(0.1, y0 - 0.12, 0.34, y0 - 0.02);
  g.closePath();
  ink(g, gold ? lin(g, -0.3, 0, 0.3, 0, [0, '#fff6b0'], [0.5, '#ffc93c'], [1, '#d89410']) : lin(g, -0.3, 0, 0.3, 0, [0, '#ff9a7a'], [0.6, '#e8503a'], [1, '#b8301e']), lw);
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 0.02;
  g.beginPath();
  g.moveTo(-0.2, y0 - 0.06);
  g.quadraticCurveTo(-0.06, y0 - 0.14, -0.01, y0 - 0.32);
  g.stroke();
  g.strokeStyle = OUT;
  g.lineWidth = 0.02;
  g.beginPath();
  g.moveTo(0, y0 - 0.37);
  g.lineTo(0, y0 - 0.56);
  g.stroke();
}
/** 층 높이(성 단위) */
const fhU = (n: number) => floorH(n) / CW;
const BASE_H = 0.5;
/** 성은 조각 스티커(문 층 · 층마다 · 지붕)로 찍는다 — 층이 늘어도, 크기가 바뀌어도 새로 굽지 않는다(층은 높이만 늘이고 줄여 찍기) */
const CBF: Fr = { w: 1.5, h: 0.84, ox: 0.75, oy: 0.8 }, CFF: Fr = { w: 1.5, h: 0.52, ox: 0.75, oy: 0.47 }, CRF: Fr = { w: 1.0, h: 0.66, ox: 0.5, oy: 0.62 };
const FH0 = 0.3;
const baseSpr = (px: number) => spr('cb', CBF, px, paintBase);
const floorSpr = (k: PK, px: number) => spr('cf' + k, CFF, px, (g) => paintFloor(g, k, 0, FH0, 1));
const roofSpr = (gold: boolean, px: number) => spr(gold ? 'cr1' : 'cr0', CRF, px, (g) => paintRoof(g, 0, gold));
const ghostFr: Fr = { w: 1.4, h: 0.4, ox: 0.7, oy: 0.36 };
const ghostSpr = (k: PK, px: number) => spr('ghost' + k, ghostFr, px, (g) => paintFloor(g, k, 0, 0.3, 0));

// ───────────────────────────── 그림: 거인 (단위 = 키 0.34, 오른쪽을 본다) ─────────────────────────────
const GH = 0.34;
/** 다리: 엉덩이 = (0,0), 아래로. back = 뒤쪽(어두움) */
const LF: Fr = { w: 0.42, h: 0.5, ox: 0.21, oy: 0.05 };
function paintLeg(g: C2, back: boolean) {
  const lw = 0.014;
  rr(g, -0.07, -0.02, 0.14, 0.3, 0.06);
  ink(g, lin(g, -0.07, 0, 0.07, 0, [0, back ? '#5a4a78' : '#7a68a0'], [1, back ? '#3e3256' : '#56487a']), lw);
  g.beginPath();
  g.moveTo(-0.085, 0.26);
  g.lineTo(-0.085, 0.33);
  g.quadraticCurveTo(-0.09, 0.38, -0.04, 0.38);
  g.lineTo(0.15, 0.38);
  g.quadraticCurveTo(0.17, 0.31, 0.06, 0.29);
  g.lineTo(0.07, 0.26);
  g.closePath();
  ink(g, back ? '#5e3a22' : '#8a5430', lw);
  g.fillStyle = 'rgba(255,255,255,.25)';
  g.fillRect(-0.06, 0.27, 0.12, 0.012);
}
const legSpr = (back: boolean, px: number) => spr(back ? 'gl0' : 'gl1', LF, px, (g) => paintLeg(g, back));
/** 팔: 어깨 = (0,0), 아래로 뻗는다. 커다란 손 */
const AF: Fr = { w: 0.36, h: 0.44, ox: 0.18, oy: 0.06 };
function paintArm(g: C2, back: boolean) {
  const lw = 0.014;
  rr(g, -0.055, -0.03, 0.11, 0.27, 0.05);
  ink(g, lin(g, -0.05, 0, 0.05, 0, [0, back ? '#2f7f7c' : '#4fb3ae'], [1, back ? '#22605e' : '#38908c']), lw);
  ell(g, 0, 0.29, 0.075, 0.07);
  ink(g, back ? '#d8986e' : '#f6c39a', lw);
  ell(g, 0.05, 0.27, 0.03, 0.025, 0.6);
  ink(g, back ? '#d8986e' : '#f6c39a', lw * 0.8);
}
const armSpr = (back: boolean, px: number) => spr(back ? 'ga0' : 'ga1', AF, px, (g) => paintArm(g, back));
/** 몸통 + 머리: 엉덩이 가운데 = (0,0). mood 0 웃음 · 1 힘줌 · 2 놀람 · 3 신남 · 4 걱정(뒤돌아봄) · 5 어질 · 6 나팔(볼 빵빵). band = 레벨 선물 수 */
const BFr: Fr = { w: 0.9, h: 0.92, ox: 0.45, oy: 0.82 };
function paintBody(g: C2, mood: number, band: number) {
  const lw = 0.014, skin = '#f6c39a', hair = '#a0522d';
  if (band >= 4) {
    // 망토
    g.beginPath();
    g.moveTo(-0.1, -0.36);
    g.quadraticCurveTo(-0.3, -0.15, -0.26, 0.05);
    g.lineTo(0.0, 0.0);
    g.closePath();
    ink(g, '#8a4ac8', lw);
  }
  // 몸통
  g.beginPath();
  g.moveTo(-0.15, -0.36);
  g.quadraticCurveTo(0.02, -0.42, 0.16, -0.34);
  g.quadraticCurveTo(0.24, -0.15, 0.17, 0.02);
  g.quadraticCurveTo(0, 0.06, -0.16, 0.02);
  g.quadraticCurveTo(-0.22, -0.18, -0.15, -0.36);
  g.closePath();
  ink(g, lin(g, -0.2, 0, 0.22, 0, [0, '#2f8f8a'], [0.55, '#4fb8b2'], [1, '#2f8580']), lw);
  g.fillStyle = 'rgba(255,255,255,.18)';
  ell(g, 0.06, -0.22, 0.07, 0.1);
  g.fill();
  // 허리띠
  g.beginPath();
  g.moveTo(-0.19, -0.06);
  g.quadraticCurveTo(0, -0.02, 0.2, -0.07);
  g.lineTo(0.2, -0.01);
  g.quadraticCurveTo(0, 0.04, -0.19, 0.0);
  g.closePath();
  ink(g, band >= 3 ? '#e0a020' : '#7a4a2a', lw);
  rr(g, 0.08, -0.07, 0.07, 0.06, 0.01);
  ink(g, band >= 3 ? '#fff3a8' : '#ffd23f', lw);
  // 목도리
  if (band >= 1) {
    rr(g, -0.1, -0.42, 0.22, 0.06, 0.03);
    ink(g, '#ff5a4e', lw);
    g.beginPath();
    g.moveTo(-0.08, -0.39);
    g.lineTo(-0.16, -0.26);
    g.lineTo(-0.1, -0.25);
    g.lineTo(-0.04, -0.37);
    g.closePath();
    ink(g, '#e8463a', lw);
  }
  // 머리
  const hx = 0.03, hy = -0.53;
  ell(g, hx - 0.12, hy + 0.01, 0.035, 0.05);
  ink(g, skin, lw);
  ell(g, hx, hy, 0.14, 0.135);
  ink(g, radg(g, hx + 0.03, hy - 0.04, 0.02, 0.16, [0, '#ffd9b8'], [1, '#eeb084']), lw);
  // 머리카락 · 수염
  g.beginPath();
  g.moveTo(hx - 0.14, hy - 0.01);
  g.quadraticCurveTo(hx - 0.15, hy - 0.16, hx - 0.01, hy - 0.15);
  g.quadraticCurveTo(hx + 0.12, hy - 0.16, hx + 0.13, hy - 0.06);
  g.quadraticCurveTo(hx + 0.02, hy - 0.1, hx - 0.06, hy - 0.07);
  g.quadraticCurveTo(hx - 0.09, hy - 0.02, hx - 0.14, hy - 0.01);
  g.closePath();
  ink(g, hair, lw);
  g.beginPath();
  g.moveTo(hx - 0.1, hy + 0.04);
  g.quadraticCurveTo(hx - 0.08, hy + 0.17, hx + 0.03, hy + 0.17);
  g.quadraticCurveTo(hx + 0.13, hy + 0.15, hx + 0.13, hy + 0.06);
  g.quadraticCurveTo(hx + 0.06, hy + 0.1, hx + 0.02, hy + 0.08);
  g.quadraticCurveTo(hx - 0.04, hy + 0.1, hx - 0.1, hy + 0.04);
  g.closePath();
  ink(g, hair, lw);
  // 볼 · 코
  ell(g, hx + 0.06, hy + 0.035, 0.035, 0.022);
  g.fillStyle = 'rgba(255,110,100,.45)';
  g.fill();
  ell(g, hx + 0.13, hy + 0.005, 0.04, 0.034);
  ink(g, '#f0a880', lw);
  // 눈 · 눈썹 · 입
  const ex = hx + 0.07, ey = hy - 0.025;
  g.strokeStyle = '#3a2216';
  g.fillStyle = '#3a2216';
  g.lineWidth = 0.014;
  if (mood === 1) {
    g.beginPath();
    g.moveTo(ex - 0.03, ey - 0.012);
    g.lineTo(ex + 0.015, ey);
    g.lineTo(ex - 0.03, ey + 0.012);
    g.stroke();
  } else if (mood === 3) {
    g.beginPath();
    g.arc(ex, ey + 0.01, 0.022, Math.PI * 1.1, Math.PI * 1.9);
    g.stroke();
  } else if (mood === 5) {
    g.beginPath();
    g.arc(ex, ey, 0.02, 0, Math.PI * 1.7);
    g.stroke();
  } else {
    ell(g, mood === 4 ? ex - 0.025 : ex, ey, 0.016, mood === 2 ? 0.026 : 0.021);
    g.fill();
    g.fillStyle = '#ffffff';
    ell(g, (mood === 4 ? ex - 0.025 : ex) - 0.005, ey - 0.007, 0.006, 0.006);
    g.fill();
  }
  g.strokeStyle = hair;
  g.lineWidth = 0.02;
  g.beginPath();
  if (mood === 4 || mood === 2) (g.moveTo(ex - 0.04, ey - 0.035), g.quadraticCurveTo(ex, ey - 0.06, ex + 0.035, ey - 0.045));
  else if (mood === 1) (g.moveTo(ex - 0.04, ey - 0.05), g.lineTo(ex + 0.03, ey - 0.03));
  else (g.moveTo(ex - 0.035, ey - 0.04), g.quadraticCurveTo(ex, ey - 0.055, ex + 0.035, ey - 0.04));
  g.stroke();
  const mx = hx + 0.07, my = hy + 0.075;
  g.strokeStyle = '#5a2a1a';
  g.lineWidth = 0.013;
  if (mood === 2) (ell(g, mx, my, 0.022, 0.026), ink(g, '#7a2a2a', 0.01));
  else if (mood === 1) (rr(g, mx - 0.04, my - 0.012, 0.07, 0.026, 0.01), ink(g, '#ffffff', 0.01));
  else if (mood === 6) {
    ell(g, hx + 0.08, hy + 0.06, 0.05, 0.04);
    ink(g, '#ffb090', lw);
  } else if (mood === 3) {
    g.beginPath();
    g.moveTo(mx - 0.04, my - 0.01);
    g.quadraticCurveTo(mx, my + 0.04, mx + 0.04, my - 0.012);
    g.closePath();
    ink(g, '#8a2a2a', 0.01);
  } else if (mood === 4 || mood === 5) {
    g.beginPath();
    g.moveTo(mx - 0.03, my + 0.005);
    g.quadraticCurveTo(mx, my - 0.012, mx + 0.03, my + 0.005);
    g.stroke();
  } else {
    g.beginPath();
    g.arc(mx - 0.005, my - 0.02, 0.035, 0.35, Math.PI - 0.5);
    g.stroke();
  }
  // 모자 · 왕관
  if (band >= 5) {
    g.beginPath();
    g.moveTo(hx - 0.1, hy - 0.12);
    g.lineTo(hx - 0.1, hy - 0.23);
    g.lineTo(hx - 0.05, hy - 0.17);
    g.lineTo(hx, hy - 0.25);
    g.lineTo(hx + 0.05, hy - 0.17);
    g.lineTo(hx + 0.1, hy - 0.23);
    g.lineTo(hx + 0.1, hy - 0.12);
    g.closePath();
    ink(g, lin(g, 0, hy - 0.25, 0, hy - 0.12, [0, '#fff6b0'], [1, '#f0b020']), lw);
  } else if (band >= 2) {
    ell(g, hx - 0.01, hy - 0.12, 0.17, 0.035, -0.08);
    ink(g, '#4f8a3a', lw);
    g.beginPath();
    g.moveTo(hx - 0.1, hy - 0.13);
    g.quadraticCurveTo(hx - 0.08, hy - 0.27, hx + 0.02, hy - 0.25);
    g.quadraticCurveTo(hx + 0.1, hy - 0.24, hx + 0.09, hy - 0.14);
    g.closePath();
    ink(g, '#5fa84a', lw);
    g.fillStyle = '#ff5a4e';
    g.fillRect(hx - 0.1, hy - 0.16, 0.19, 0.025);
  }
}
const bodySpr = (mood: number, band: number, px: number) => spr(`gb${mood}${band}`, BFr, px, (g) => paintBody(g, mood, band));
const giftBand = (lv: number) => (lv >= 11 ? 5 : lv >= 9 ? 4 : lv >= 7 ? 3 : lv >= 5 ? 2 : lv >= 3 ? 1 : 0);

// ───────────────────────────── 그림: 무대 (하늘 · 먼 산 · 땅) ─────────────────────────────
interface Pal { sky: [string, string, string]; sun: string; far: [string, string]; mid: [string, string]; grass: [string, string]; soil: [string, string]; tuft: string; storm: [string, string, string] }
const PALS: Pal[] = [
  { sky: ['#4fb8ec', '#9fdcf8', '#e2f6ff'], sun: '#fff4b8', far: ['#a6d7ea', '#8cc6dc'], mid: ['#9be07a', '#6fc055'], grass: ['#93d85c', '#74c147'], soil: ['#b8804c', '#8a5a34'], tuft: '#5cab3c', storm: ['#6a6f8c', '#474a66', '#2e3048'] },
  { sky: ['#f3a06a', '#ffd3a0', '#fff0d8'], sun: '#fff6d8', far: ['#c9a4c0', '#a8849e'], mid: ['#cdb08a', '#a88a64'], grass: ['#c9c98a', '#a9a968'], soil: ['#a07a58', '#76563a'], tuft: '#8f9a5a', storm: ['#6a5f7a', '#4a405a', '#2e2840'] },
  { sky: ['#a99af0', '#f0c4e8', '#fff2f8'], sun: '#fffbe6', far: ['#efe4ff', '#dccbf8'], mid: ['#ffffff', '#ebe2ff'], grass: ['#f6f2ff', '#e0d6fc'], soil: ['#cdb9f0', '#a994da'], tuft: '#c9b8f0', storm: ['#76689a', '#52457a', '#342a58'] },
];
const BG = new Map<string, HTMLCanvasElement>();
function bgCanvas(key: string, wpx: number, hpx: number, paint: (g: C2) => void, sc: number) {
  let c = BG.get(key);
  if (!c) {
    if (BG.size > 40) BG.clear();
    c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(wpx * sc));
    c.height = Math.max(1, Math.ceil(hpx * sc));
    const g = c.getContext('2d')!;
    g.scale(sc, sc);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    paint(g);
    BG.set(key, c);
  }
  return c;
}
function cloudShape(g: C2, x: number, y: number, k: number, col: string) {
  g.fillStyle = col;
  for (const [dx, dy, r] of [[-0.9, 0.1, 0.5], [-0.3, -0.25, 0.7], [0.45, -0.1, 0.6], [1.0, 0.15, 0.42], [0.1, 0.2, 0.75]]) ell(g, x + dx * k, y + dy * k, r * k, r * k * 0.8), g.fill();
}
/** 하늘 (화면 위 ~ 땅) */
const skyBg = (ch: number, w: number, sc: number) =>
  bgCanvas(`sky${ch}:${w}`, w, w * 1.0, (g) => {
    const P = PALS[ch];
    g.fillStyle = lin(g, 0, w * 0.1, 0, w * 1.0, [0, P.sky[0]], [0.55, P.sky[1]], [1, P.sky[2]]);
    g.fillRect(0, 0, w, w);
    g.fillStyle = radg(g, w * 0.8, w * 0.3, 0, w * 0.28, [0, P.sun], [0.25, P.sun], [1, 'rgba(255,255,255,0)']);
    g.fillRect(w * 0.45, 0, w * 0.55, w * 0.65);
    ell(g, w * 0.8, w * 0.3, w * 0.055, w * 0.055);
    g.fillStyle = '#ffffff';
    g.fill();
    if (ch === 2) for (let i = 0; i < 26; i++) (g.fillStyle = `rgba(255,255,255,${0.4 + hsh(i) * 0.5})`), starPath(g, hsh(i * 3) * w, w * (0.2 + hsh(i * 7) * 0.4), w * 0.006, 0.4), g.fill();
  }, sc);
/** 먼 산 줄(가로 2화면, 이어 붙는다): far = 먼 산 · 가까운 언덕 */
function hillBg(ch: number, w: number, sc: number, near: boolean) {
  return bgCanvas(`hill${ch}${near ? 1 : 0}:${w}`, w * 2, w * 0.5, (g) => {
    const P = PALS[ch], W = w * 2, H = w * 0.5, base = H;
    const f = (x: number) => {
      const u = (x / W) * TAU;
      return near ? 0.62 + 0.12 * Math.sin(u * 3 + 1) + 0.06 * Math.sin(u * 7 + 2) : 0.4 + (ch === 1 ? 0.22 : 0.14) * Math.sin(u * 2 + 0.5) + (ch === 1 ? 0.12 : 0.06) * Math.abs(Math.sin(u * 5 + 1.3));
    };
    g.beginPath();
    g.moveTo(0, base);
    for (let x = 0; x <= W; x += 4) g.lineTo(x, H * f(x));
    g.lineTo(W, base);
    g.closePath();
    const c = near ? P.mid : P.far;
    g.fillStyle = lin(g, 0, H * 0.3, 0, H, [0, c[0]], [1, c[1]]);
    g.fill();
    g.strokeStyle = near ? 'rgba(60,90,40,.25)' : 'rgba(255,255,255,.5)';
    g.lineWidth = 2;
    g.stroke();
    if (!near && ch === 1) {
      // 눈 덮인 봉우리
      g.fillStyle = 'rgba(255,255,255,.85)';
      for (let x = 0; x < W; x += 3) {
        const y = H * f(x);
        if (y < H * 0.36) g.fillRect(x, y, 3, Math.max(0, H * 0.36 - y) * 0.6 + 2);
      }
    }
    if (near)
      for (let i = 0; i < 26; i++) {
        const x = hsh(i * 5 + ch) * W, y = H * f(x) + 4;
        if (ch === 2) cloudShape(g, x, y + 6, w * 0.02, 'rgba(255,255,255,.9)');
        else {
          g.fillStyle = ch === 0 ? '#4f9a3a' : '#6f7a4a';
          ell(g, x, y, w * 0.012, w * 0.018);
          g.fill();
        }
      }
    if (!near && ch === 2) for (let i = 0; i < 4; i++) cloudShape(g, hsh(i * 11) * W, H * (0.35 + hsh(i * 13) * 0.2), w * 0.05, 'rgba(255,255,255,.8)');
  }, sc);
}
/** 앞 흙 단면 (가로 1화면, 이어 붙는다) */
const soilBg = (ch: number, w: number, sc: number) =>
  bgCanvas(`soil${ch}:${w}`, w, w * 0.16, (g) => {
    const P = PALS[ch], H = w * 0.16;
    g.fillStyle = lin(g, 0, 0, 0, H, [0, P.soil[0]], [1, P.soil[1]]);
    g.fillRect(0, 0, w, H);
    for (let i = 0; i < 18; i++) {
      const x = hsh(i * 7 + ch) * w, y = H * (0.3 + hsh(i * 3) * 0.6), r = w * (0.006 + hsh(i) * 0.01);
      ell(g, x, y, r * 1.4, r);
      g.fillStyle = ch === 2 ? 'rgba(255,255,255,.4)' : 'rgba(255,240,220,.28)';
      g.fill();
    }
    g.strokeStyle = ch === 2 ? 'rgba(255,255,255,.5)' : 'rgba(90,60,30,.35)';
    g.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const x = hsh(i * 13 + 5) * w;
      g.beginPath();
      g.moveTo(x, 2);
      g.quadraticCurveTo(x + 8, H * 0.4, x - 4, H * 0.7);
      g.stroke();
    }
    g.fillStyle = P.grass[1];
    g.fillRect(0, 0, w, w * 0.014);
    g.fillStyle = P.tuft;
    for (let x = 0; x < w; x += w * 0.025) g.beginPath(), g.moveTo(x, w * 0.012), g.lineTo(x + w * 0.006, w * 0.028), g.lineTo(x + w * 0.012, w * 0.012), g.fill();
  }, sc);
/** 땅 무늬(구역마다): 너비 0.5 × 띠 높이 — 땅 너비로 늘려 찍는다 */
const ZONE_BAND = 0.5;
function zoneTex(k: ZK, ch: number, w: number, sc: number) {
  return bgCanvas(`z${k}${ch}:${w}`, w * 0.5, w * ZONE_BAND, (g) => {
    const W = w * 0.5, H = w * ZONE_BAND, P = PALS[ch];
    const fill = (a: string, b: string) => {
      rr(g, 0, 0, W, H, H * 0.25);
      g.fillStyle = lin(g, 0, 0, 0, H, [0, a], [1, b]);
      g.fill();
    };
    switch (k) {
      case 'forest': fill(ch === 2 ? '#ece4ff' : ch === 1 ? '#8fa86a' : '#6fbf45', ch === 2 ? '#d8ccf8' : ch === 1 ? '#76905a' : '#5aa83a'); break;
      case 'field':
        fill('#e8c66a', '#d0a640');
        g.strokeStyle = 'rgba(140,90,30,.35)';
        g.lineWidth = 2;
        for (let y = H * 0.2; y < H; y += H * 0.18) g.beginPath(), g.moveTo(W * 0.04, y), g.lineTo(W * 0.96, y), g.stroke();
        break;
      case 'river':
      case 'ice': {
        const ice = k === 'ice';
        g.fillStyle = ice ? '#eefaff' : '#e8d8a8';
        g.fillRect(0, 0, W, H);
        rr(g, W * 0.08, 0, W * 0.84, H, W * 0.1);
        g.fillStyle = lin(g, 0, 0, 0, H, [0, ice ? '#c8ecff' : '#7fd3f5'], [1, ice ? '#9fd4f0' : '#3f9ed8']);
        g.fill();
        g.strokeStyle = ice ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.7)';
        g.lineWidth = 2;
        for (let i = 0; i < 7; i++) {
          const x = W * (0.2 + hsh(i * 3) * 0.6), y = H * (0.15 + hsh(i * 5) * 0.75);
          g.beginPath();
          if (ice) (g.moveTo(x, y), g.lineTo(x + W * 0.06, y + H * 0.06), g.lineTo(x + W * 0.1, y + H * 0.02));
          else (g.moveTo(x - W * 0.05, y), g.quadraticCurveTo(x, y - H * 0.05, x + W * 0.05, y));
          g.stroke();
        }
        break;
      }
      case 'den':
        fill('#9a8aa6', '#76668a');
        g.fillStyle = 'rgba(60,40,70,.3)';
        for (let i = 0; i < 9; i++) ell(g, hsh(i * 7) * W, hsh(i * 3) * H, W * 0.03, H * 0.04), g.fill();
        g.fillStyle = '#f3ecd8';
        for (let i = 0; i < 4; i++) ell(g, W * (0.15 + hsh(i * 9) * 0.7), H * (0.3 + hsh(i * 2) * 0.6), W * 0.02, H * 0.015, 0.4), g.fill();
        break;
      case 'mine':
        fill('#bdb6aa', '#9a9286');
        g.fillStyle = 'rgba(80,70,60,.35)';
        for (let i = 0; i < 16; i++) ell(g, hsh(i * 7) * W, hsh(i * 3 + 1) * H, W * 0.012, H * 0.02), g.fill();
        g.strokeStyle = '#7a5a3a';
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(0, H * 0.82);
        g.lineTo(W, H * 0.82);
        g.moveTo(0, H * 0.94);
        g.lineTo(W, H * 0.94);
        g.stroke();
        break;
      case 'village':
        fill(P.grass[0], P.grass[1]);
        rr(g, 0, H * 0.35, W, H * 0.35, H * 0.15);
        g.fillStyle = '#e9d29e';
        g.fill();
        break;
      case 'swamp':
        fill('#86a05e', '#6a8a48');
        g.fillStyle = 'rgba(70,110,100,.7)';
        for (let i = 0; i < 5; i++) ell(g, W * (0.1 + hsh(i * 5) * 0.8), H * (0.2 + hsh(i * 9) * 0.65), W * 0.08, H * 0.08), g.fill();
        g.fillStyle = '#5fb04a';
        for (let i = 0; i < 6; i++) ell(g, W * (0.1 + hsh(i * 7 + 2) * 0.8), H * (0.2 + hsh(i * 3 + 4) * 0.65), W * 0.022, H * 0.03), g.fill();
        break;
      case 'volcano':
        fill('#8a5444', '#5e3628');
        g.strokeStyle = '#ff9a3a';
        g.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          const x = W * (0.1 + hsh(i * 7) * 0.8), y = H * (0.2 + hsh(i * 3) * 0.6);
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + W * 0.05, y + H * 0.06);
          g.lineTo(x + W * 0.03, y + H * 0.14);
          g.stroke();
        }
        break;
      case 'cloud':
        fill('#ffffff', '#efe6ff');
        for (let i = 0; i < 6; i++) cloudShape(g, W * (0.1 + hsh(i * 3) * 0.8), H * (0.3 + hsh(i * 5) * 0.5), W * 0.03, 'rgba(255,240,250,.9)');
        break;
      case 'lair':
        fill('#a89a8a', '#857766');
        g.fillStyle = 'rgba(60,40,30,.3)';
        for (let i = 0; i < 12; i++) ell(g, hsh(i * 7) * W, hsh(i * 3) * H, W * 0.025, H * 0.03), g.fill();
        break;
      case 'goal':
        fill('#a6e87a', '#7ccc5a');
        g.fillStyle = '#ffe36b';
        for (let i = 0; i < 14; i++) starPath(g, hsh(i * 7) * W, H * (0.15 + hsh(i * 3) * 0.75), W * 0.012, 0.45), g.fill();
        break;
      default: break;
    }
    // 가장자리를 부드럽게 (먼 쪽은 풀밭으로 스며들고, 양옆은 살짝 흐리게)
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = lin(g, 0, 0, 0, H, [0, 'rgba(0,0,0,0)'], [0.08, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,1)']);
    g.fillRect(0, 0, W, H);
    g.fillStyle = lin(g, 0, 0, W, 0, [0, 'rgba(0,0,0,0.2)'], [0.06, 'rgba(0,0,0,1)'], [0.94, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0.2)']);
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
  }, sc);
}
/** 땅 뒤에 서 있는 것 (동굴 · 광산 입구 · 천막 · 화산 · 새 땅 언덕): 단위 = 화면 폭, 바닥 가운데 = (0,0) */
const LMF: Fr = { w: 0.6, h: 0.42, ox: 0.3, oy: 0.4 };
function paintMark(g: C2, k: ZK, ch: number) {
  const lw = 0.004;
  switch (k) {
    case 'den':
      g.beginPath();
      g.moveTo(-0.2, 0);
      g.quadraticCurveTo(-0.17, -0.16, -0.02, -0.17);
      g.quadraticCurveTo(0.15, -0.18, 0.2, 0);
      g.closePath();
      ink(g, lin(g, 0, -0.18, 0, 0, [0, '#8a7a96'], [1, '#5e4e6e']), lw);
      g.beginPath();
      g.moveTo(-0.07, 0);
      g.quadraticCurveTo(-0.07, -0.1, 0, -0.1);
      g.quadraticCurveTo(0.07, -0.1, 0.07, 0);
      g.closePath();
      ink(g, '#1e1626', lw);
      for (const sx of [-0.022, 0.022]) (g.fillStyle = '#ffe36b'), ell(g, sx, -0.055, 0.008, 0.006), g.fill();
      g.fillStyle = '#f3ecd8';
      ell(g, -0.13, -0.02, 0.018, 0.008, 0.3);
      g.fill();
      break;
    case 'mine':
      g.beginPath();
      g.moveTo(-0.18, 0);
      g.lineTo(-0.15, -0.12);
      g.lineTo(-0.05, -0.17);
      g.lineTo(0.1, -0.15);
      g.lineTo(0.18, 0);
      g.closePath();
      ink(g, lin(g, 0, -0.17, 0, 0, [0, '#c8c0b2'], [1, '#8a8276']), lw);
      g.beginPath();
      g.rect(-0.05, -0.09, 0.1, 0.09);
      ink(g, '#231a14', lw);
      g.strokeStyle = '#8a5a30';
      g.lineWidth = 0.012;
      g.beginPath();
      g.moveTo(-0.055, 0);
      g.lineTo(-0.055, -0.095);
      g.lineTo(0.055, -0.095);
      g.lineTo(0.055, 0);
      g.stroke();
      rr(g, 0.08, -0.04, 0.06, 0.035, 0.005);
      ink(g, '#7a7a86', lw);
      for (const x of [0.09, 0.13]) ell(g, x, -0.003, 0.008, 0.008), ink(g, '#333', lw * 0.7);
      break;
    case 'village':
      for (const [x, c] of [[-0.09, '#ff8a6a'], [0.08, '#6ac0ff']] as [number, string][]) {
        g.beginPath();
        g.moveTo(x - 0.06, 0);
        g.lineTo(x, -0.09);
        g.lineTo(x + 0.06, 0);
        g.closePath();
        ink(g, c, lw);
        g.beginPath();
        g.moveTo(x - 0.015, 0);
        g.lineTo(x, -0.04);
        g.lineTo(x + 0.015, 0);
        g.closePath();
        ink(g, '#3a2a2a', lw * 0.6);
      }
      g.fillStyle = '#ff9a3a';
      ell(g, 0, -0.01, 0.012, 0.016);
      g.fill();
      break;
    case 'volcano':
      g.beginPath();
      g.moveTo(-0.22, 0);
      g.lineTo(-0.06, -0.26);
      g.lineTo(0.05, -0.26);
      g.lineTo(0.22, 0);
      g.closePath();
      ink(g, lin(g, 0, -0.26, 0, 0, [0, '#8a5a4a'], [1, '#5a3428']), lw);
      g.fillStyle = '#ff7a3a';
      g.beginPath();
      g.moveTo(-0.055, -0.255);
      g.lineTo(0.045, -0.255);
      g.lineTo(0.02, -0.2);
      g.lineTo(0.0, -0.23);
      g.lineTo(-0.03, -0.19);
      g.closePath();
      g.fill();
      break;
    case 'lair':
      g.beginPath();
      g.moveTo(-0.3, 0);
      g.lineTo(-0.2, -0.22);
      g.lineTo(-0.08, -0.3);
      g.lineTo(0.06, -0.36);
      g.lineTo(0.18, -0.24);
      g.lineTo(0.3, 0);
      g.closePath();
      ink(g, lin(g, 0, -0.36, 0, 0, [0, ch === 1 ? '#e8f4ff' : ch === 2 ? '#d8c8ff' : '#a8b098'], [1, ch === 1 ? '#9fb4cc' : ch === 2 ? '#8a78c8' : '#6a7258']), lw);
      break;
    case 'goal':
      g.beginPath();
      g.moveTo(-0.3, 0);
      g.quadraticCurveTo(0, -0.22, 0.3, 0);
      g.closePath();
      ink(g, lin(g, 0, -0.2, 0, 0, [0, '#b8f08a'], [1, '#7ccc5a']), lw);
      g.strokeStyle = OUT;
      g.lineWidth = 0.008;
      g.beginPath();
      g.moveTo(0, -0.11);
      g.lineTo(0, -0.36);
      g.stroke();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 0.004;
      g.stroke();
      g.beginPath();
      g.moveTo(0, -0.36);
      g.lineTo(0.13, -0.32);
      g.lineTo(0, -0.27);
      g.closePath();
      ink(g, '#ff5a4e', lw);
      rr(g, -0.1, -0.2, 0.08, 0.05, 0.01);
      ink(g, '#f6dca0', lw);
      break;
    case 'river':
      g.beginPath();
      g.moveTo(-0.05, 0);
      g.quadraticCurveTo(-0.03, -0.06, -0.012, -0.12);
      g.lineTo(0.012, -0.12);
      g.quadraticCurveTo(0.03, -0.06, 0.05, 0);
      g.closePath();
      g.fillStyle = ch === 1 ? '#c8ecff' : '#7fd3f5';
      g.fill();
      break;
    case 'swamp':
      g.strokeStyle = '#5a4a3a';
      g.lineWidth = 0.008;
      g.beginPath();
      g.moveTo(0.06, 0);
      g.lineTo(0.06, -0.14);
      g.lineTo(0.02, -0.18);
      g.moveTo(0.06, -0.1);
      g.lineTo(0.11, -0.15);
      g.stroke();
      g.strokeStyle = '#4f8a3a';
      g.lineWidth = 0.005;
      for (let i = 0; i < 7; i++) g.beginPath(), g.moveTo(-0.15 + i * 0.03, 0), g.lineTo(-0.16 + i * 0.03, -0.05 - hsh(i) * 0.03), g.stroke();
      break;
    case 'cloud':
      g.lineWidth = 0.012;
      ['#ff8a8a', '#ffd36b', '#9fe08a', '#8ac8ff', '#c8a0ff'].forEach((c, i) => {
        g.strokeStyle = c;
        g.beginPath();
        g.arc(0, 0, 0.2 - i * 0.013, Math.PI, TAU);
        g.stroke();
      });
      break;
    default:
      break;
  }
}
const markSpr = (k: ZK, ch: number, px: number) => spr(`lm${k}${ch}`, LMF, px, (g) => paintMark(g, k, ch));

// ───────────────────────────── 그림: 폭풍 · 장 끝 선물 · 손가락 ─────────────────────────────
/** 폭풍 구름: 단위 = 화면 폭, 앞자락 = (0,0) (구름은 왼쪽으로 펼쳐진다) */
const SF: Fr = { w: 1.0, h: 0.8, ox: 0.82, oy: 0.42 };
function paintStorm(g: C2, ch: number) {
  const C = PALS[ch].storm;
  const blobs: [number, number, number][] = [[-0.7, -0.12, 0.2], [-0.5, -0.22, 0.22], [-0.3, -0.18, 0.2], [-0.12, -0.1, 0.15], [-0.6, 0.06, 0.2], [-0.38, 0.04, 0.22], [-0.16, 0.06, 0.16], [-0.02, 0.0, 0.1], [-0.25, -0.3, 0.15], [-0.75, -0.3, 0.16]];
  for (const [x, y, r] of blobs) ell(g, x, y, r + 0.008, r * 0.86 + 0.008), (g.fillStyle = C[2]), g.fill();
  for (const [x, y, r] of blobs) ell(g, x, y, r, r * 0.86), (g.fillStyle = radg(g, x - r * 0.3, y - r * 0.4, r * 0.1, r * 1.1, [0, C[0]], [0.6, C[1]], [1, C[2]])), g.fill();
  g.fillStyle = 'rgba(255,255,255,.12)';
  for (const [x, y, r] of blobs.slice(0, 5)) ell(g, x - r * 0.3, y - r * 0.45, r * 0.45, r * 0.25), g.fill();
}
const stormSpr = (ch: number, px: number) => spr('storm' + ch, SF, px, (g) => paintStorm(g, ch));
/** 장 끝 선물: 0장 거대한 바퀴 · 큰 종 / 1장 쇠망치 · 바람 돛. 단위 = 크기, 바닥 가운데 = (0,0) */
const KF: Fr = { w: 2.4, h: 2.4, ox: 1.2, oy: 2.2 };
function paintPerk(g: C2, ch: number, i: number) {
  const lw = 0.05;
  if (ch === 0 && i === 0) {
    ell(g, 0, -0.95, 0.9, 0.9);
    ink(g, '#c98a4a', lw * 1.5);
    ell(g, 0, -0.95, 0.72, 0.72);
    ink(g, '#f3dcae', lw);
    for (let k = 0; k < 8; k++) {
      const a = (k * TAU) / 8;
      g.strokeStyle = OUT;
      g.lineWidth = 0.14;
      g.beginPath();
      g.moveTo(0, -0.95);
      g.lineTo(Math.cos(a) * 0.72, -0.95 + Math.sin(a) * 0.72);
      g.stroke();
      g.strokeStyle = '#b8783a';
      g.lineWidth = 0.08;
      g.stroke();
    }
    ell(g, 0, -0.95, 0.16, 0.16);
    ink(g, '#8a5a30', lw);
  } else if (ch === 0) {
    g.strokeStyle = OUT;
    g.lineWidth = 0.1;
    g.beginPath();
    g.moveTo(-0.7, 0);
    g.lineTo(-0.6, -1.8);
    g.lineTo(0.6, -1.8);
    g.lineTo(0.7, 0);
    g.stroke();
    g.strokeStyle = '#9a6a3a';
    g.lineWidth = 0.06;
    g.stroke();
    g.beginPath();
    g.moveTo(-0.5, -0.45);
    g.quadraticCurveTo(-0.5, -1.55, 0, -1.6);
    g.quadraticCurveTo(0.5, -1.55, 0.5, -0.45);
    g.lineTo(0.62, -0.32);
    g.lineTo(-0.62, -0.32);
    g.closePath();
    ink(g, lin(g, -0.5, 0, 0.5, 0, [0, '#fff3a8'], [0.5, '#ffc93c'], [1, '#d08a10']), lw);
    ell(g, 0, -0.26, 0.12, 0.12);
    ink(g, '#d08a10', lw);
  } else if (i === 0) {
    g.save();
    g.rotate(-0.3);
    rr(g, -0.08, -1.7, 0.16, 1.6, 0.06);
    ink(g, '#a8743a', lw);
    rr(g, -0.55, -2.05, 1.1, 0.5, 0.08);
    ink(g, lin(g, 0, -2.05, 0, -1.55, [0, '#e2e6ee'], [1, '#7a8090']), lw);
    g.restore();
  } else {
    g.strokeStyle = OUT;
    g.lineWidth = 0.1;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, -2.0);
    g.stroke();
    g.strokeStyle = '#a8743a';
    g.lineWidth = 0.06;
    g.stroke();
    g.beginPath();
    g.moveTo(0.05, -1.9);
    g.quadraticCurveTo(0.95, -1.3, 0.05, -0.5);
    g.closePath();
    ink(g, lin(g, 0, -1.9, 0.8, -0.5, [0, '#ffffff'], [1, '#bfe6ff']), lw);
    g.beginPath();
    g.moveTo(-0.05, -1.7);
    g.quadraticCurveTo(-0.7, -1.2, -0.05, -0.7);
    g.closePath();
    ink(g, lin(g, 0, -1.7, -0.6, -0.7, [0, '#ffffff'], [1, '#ffd6e8']), lw);
  }
}
const perkSpr = (ch: number, i: number, px: number) => spr(`k${ch}${i}`, KF, px, (g) => paintPerk(g, ch, i));
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.12);
  ctx.rotate(-0.35);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-k * 0.12, -k * 0.05);
  ctx.lineTo(-k * 0.12, -k * 0.62);
  ctx.quadraticCurveTo(-k * 0.12, -k * 0.75, 0, -k * 0.75);
  ctx.quadraticCurveTo(k * 0.12, -k * 0.75, k * 0.12, -k * 0.62);
  ctx.lineTo(k * 0.12, -k * 0.28);
  ctx.quadraticCurveTo(k * 0.5, -k * 0.3, k * 0.42, k * 0.05);
  ctx.quadraticCurveTo(k * 0.4, k * 0.32, k * 0.1, k * 0.36);
  ctx.lineTo(-k * 0.2, k * 0.36);
  ctx.quadraticCurveTo(-k * 0.42, k * 0.2, -k * 0.38, -k * 0.1);
  ctx.quadraticCurveTo(-k * 0.3, -k * 0.2, -k * 0.12, -k * 0.05);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
}

// ───────────────────────────── 그리기: 장면 ─────────────────────────────
const PH = 0.072, TREE_H = 0.13, CROP_W = 0.055, ITEM_S = 0.022;
/** 스티커는 가장 앞(가장 큰 크기)으로 한 번만 굽고, 깊이에 따라 줄여 찍는다 — 걷거나 성이 날아가는 동안 새로 굽지 않게 */
const DMAX = 1.22;
type RF = (v: number) => number;
const PQ = (R: RF, sc2: number) => R(PH) * DMAX * sc2, IQ = (R: RF, sc2: number) => R(ITEM_S) * 1.3 * sc2, TQ = (R: RF, sc2: number) => R(TREE_H) * DMAX * 1.02 * sc2;
const BQ = (R: RF, sc2: number) => R(0.06) * DMAX * sc2;
const GHQ = (R: RF, sc2: number) => R(0.13) * sc2, HQ = (R: RF, sc2: number) => R(0.072) * DMAX * sc2;
const GQ = (R: RF, sc2: number) => R(GH) * DMAX * sc2, CQ = (R: RF, sc2: number) => R(CW) * DMAX * sc2;
const depth = dscale;
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const LV_GIFT: Record<number, string> = { 3: '빨간 목도리를 둘렀어요', 5: '초록 모자를 썼어요', 7: '금빛 허리띠!', 9: '망토가 생겼어요', 11: '왕관을 썼어요' };
const ZCOL: Partial<Record<ZK, string>> = { forest: '#4f9a3a', field: '#d8a838', river: '#3f9ed8', den: '#6e5e86', mine: '#8f8a80', village: '#d89a5a', swamp: '#5f8a48', ice: '#7fc0e8', volcano: '#c0583a', cloud: '#c8b8f0', lair: '#8a7a6a' };
const recent = new WeakMap<object, { x: number; y: number; t: number; size: number }[]>();
/** 화면에 쓰는 글꼴(px · 굵기) — 미리 불러 둔다 (juice 떠오르는 글자 크기 포함) */
const FONTS: [number, number][] = [[12, 700], [12, 800], [12, 900], [13, 800], [13, 900], [14, 800], [14, 900], [15, 800], [16, 800], [16, 900], [17, 800], [18, 800], [18, 900], [20, 800], [20, 900], [21, 900], [22, 800], [23, 900], [24, 900]];
const PART_MAX = 80;
let FONTC: C2 | null = null, GLC: C2 | null = null;
const POP_GLYPHS = '+-0123456789!~우르릉와휙층식구성이다명풀려났뿌땡찌부으앗붕쾅뜨거아하트새땅에쿵';
const PILL2 = [0, 0, 0];
const CLF: Fr = { w: 3.6, h: 2.2, ox: 1.8, oy: 1.1 };
const DRAWL: [number, number, Obj | Per | null][] = [];
/** 나무 모양: 장마다 · 구름 과수원은 열매 나무 */
const treeStyle = (s: GiantState, o: Obj) => (o.k === 'fruit' ? 3 : STAGES[s.stage].ch === 1 ? 1 : STAGES[s.stage].ch === 2 ? 2 : 0);
/** 한 판에 쓸 그림을 미리 굽기 줄에 (판마다 한 번) */
function wantStage(st: number, w: number, sc: number) {
  const tag = `st${st}:${w}:${sc}`;
  if (WK.has(tag)) return;
  WK.add(tag);
  const d = STAGES[st], ch = d.ch, R = (r: number) => r * w, sc2 = Math.min(2, sc);
  want(`sky${ch}${w}`, () => skyBg(ch, w, sc2));
  want(`hf${ch}${w}`, () => hillBg(ch, w, sc2, false));
  want(`hn${ch}${w}`, () => hillBg(ch, w, sc2, true));
  want(`so${ch}${w}`, () => soilBg(ch, w, sc2));
  want(`stm${ch}${w}`, () => stormSpr(ch, R(1) * sc2));
  for (const k of new Set<ZK>([...d.zones, 'goal'])) {
    want(`zt${k}${ch}${w}`, () => zoneTex(k, ch, w, sc2));
    want(`lm${k}${ch}${w}`, () => markSpr(k, ch, R(1) * sc2));
  }
  for (const it of Object.keys(RES_OF) as Item[]) want(`i${it}${w}`, () => itemSpr(it, R(ITEM_S) * 1.3 * sc2));
  const ts = ch === 1 ? 1 : ch === 2 ? 2 : 0;
  for (let v = 0; v < 3; v++) for (const stl of [ts, 3, 9]) want(`t${stl}${v}${w}`, () => treeSpr(stl, v, R(TREE_H) * DMAX * 1.02 * sc2));
  for (const k of ['wheat', 'shroom', 'rock', 'hot'] as OK[]) for (let q2 = 0; q2 < 4; q2++) for (let v = 0; v < 3; v++) want(`c${k}${q2}${v}${w}`, () => cropSpr(k, q2, v, R(CROP_W) * DMAX * 1.3 * sc2));
  for (const mk of Object.keys(MD) as MK[]) for (let m = 0; m < 4; m++) want(`m${mk}${m}${w}`, () => monSpr(mk, m, R(MD[mk].r) * DMAX * sc2));
  const looks: Look[] = ['folk', 'jack', 'farm', 'fisher', 'knight', 'miner', 'shroomer', 'smith', 'picker'];
  for (const lk of looks) for (let f = 0; f < 7; f++) for (let sk = 0; sk < 3; sk++) for (const fl of [1, -1]) want(`p${lk}${f}${sk}${fl}${w}`, () => personSpr(lk, f, sk, R(PH) * DMAX * sc2, fl));
  for (let g = 0; g < 7; g++) want(`gb${g}${giftBand(st + 1)}${w}`, () => bodySpr(g, giftBand(st + 1), R(GH) * DMAX * sc2));
  for (const k of PART_DEX) want(`cf${k}${w}`, () => (floorSpr(k, R(CW) * DMAX * sc2), ghostSpr(k, GHQ(R, sc2))));
  want(`hand${w}`, () => (bigHandSpr(false, HQ(R, sc2)), bigHandSpr(true, HQ(R, sc2))));
  for (const it of Object.keys(RES_OF) as Item[]) want(`ih${it}${w}`, () => itemSpr(it, IQ(R, sc2) * 1.3));
  for (const k of ['chest', 'cage'] as const) want(`bx${k}${w}`, () => (boxSpr(k, 0, BQ(R, sc2)), boxSpr(k, 1, BQ(R, sc2))));
  want(`cb${w}`, () => (baseSpr(R(CW) * DMAX * sc2), roofSpr(false, R(CW) * DMAX * sc2), roofSpr(true, R(CW) * DMAX * sc2)));
  // 처음 쓰는 글꼴 크기는 첫 순간에 끊긴다 — 그림 프레임 밖에서 하나씩 미리
  for (const [px, wg] of FONTS)
    want(`f${px}${wg}`, () => {
      const g = (FONTC ??= document.createElement('canvas').getContext('2d')!);
      g.font = `${wg} ${px}px system-ui, sans-serif`;
      g.measureText('가나다 쿵! 0123');
    });
  // 튀어 오르는 글자(찌부! · 와르르 +3 …)도 처음 한 번은 글자 모양을 만드느라 끊긴다 — 크기마다 미리 한 번 찍어 둔다
  for (const px of [14, 15, 16, 17, 18, 20, 22, 24, 26])
    want(`pg${px}:${sc}`, () => {
      const g = (GLC ??= Object.assign(document.createElement('canvas'), { width: 1040, height: 380 }).getContext('2d')!);
      g.setTransform(sc, 0, 0, sc, 0, 0);
      g.clearRect(0, 0, 1040, 380);
      g.font = `800 ${px}px system-ui, sans-serif`;
      g.lineWidth = 3;
      g.textBaseline = 'middle';
      [...POP_GLYPHS].forEach((ch2, i) => {
        const x = (i % 12) * px * 1.05 + px * 0.5, y = (Math.floor(i / 12) + 0.6) * px * 1.15;
        g.strokeText(ch2, x, y);
        g.fillText(ch2, x, y);
      });
      g.getImageData(0, 0, 1, 1);
    });
}
function drawAll(ctx: C2, s: GiantState, w: number, h: number, _th: Theme) {
  const fx = juice(s), t = s.t, sc = devScale(ctx), sc2 = Math.min(2, sc), seenT = fx.memo.t ?? -1;
  const d = STAGES[s.stage], ch = d.ch, P = PALS[ch];
  const X = (x: number) => (x - s.cam) * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const W0 = Math.round(w);
  wantStage(s.stage, W0, sc);
  // 다음 판 그림도 이번 판 동안 미리 (결과 화면은 짧다)
  if (s.stage + 1 < STAGES.length && (s.phase !== 'play' || WQ.length === 0)) wantStage(s.stage + 1, W0, sc);
  idlePump();
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  const text = (str: string, x: number, y: number, fill: string, stroke = 'rgba(75,48,32,.9)', lw = 3) => {
    ctx.lineJoin = 'round';
    if (lw > 0) (ctx.lineWidth = lw), (ctx.strokeStyle = stroke), ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  };
  const puff = (x: number, y: number, col: string, n: number, spd = 3, size = 3) => {
    if (fx.particles.length < PART_MAX) fx.burst(x, y, col, Math.min(n, PART_MAX - fx.particles.length), spd, size);
  };
  const say = (x: number, y: number, str: string, col: string, size: number) => {
    let rec = recent.get(s);
    if (!rec) recent.set(s, (rec = []));
    x = clamp(x, w * 0.12, w * 0.88);
    y = Math.max(Y(0.22), y);
    for (let k = 0; k < 5 && rec.some((q) => t - q.t < 30 && Math.abs(q.x - x) < w * 0.16 && Math.abs(q.y - y) < (size + q.size) * 0.55); k++) y -= size * 0.9;
    rec.push({ x, y, t, size });
    if (rec.length > 14) rec.shift();
    fx.pop(x, y, str, col, size);
  };
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  fx.begin(ctx);
  // 쿵 뒤 0.8초: 성문 쪽으로 살짝 당겼다가 돌아온다 (쏟아지는 사람들을 크게)
  const zm = zoomOf(s);
  if (zm.f > 1.001) ctx.translate(R(zm.x), Y(zm.y)), ctx.scale(zm.f, zm.f), ctx.translate(-R(zm.x), -Y(zm.y));

  // ── 하늘 · 구름 · 먼 산 (천천히 흐른다) ──
  ctx.drawImage(skyBg(ch, W0, sc2), 0, 0, w, w);
  {
    const cs = spr('cloud' + ch, CLF, R(0.05) * sc2, (g) => cloudShape(g, 0, 0, 1, ch === 1 ? 'rgba(255,246,234,.9)' : 'rgba(255,255,255,.92)'));
    for (let i = 0; i < 4; i++) {
      const k = R(0.035 + hsh(i) * 0.02), x = ((hsh(i * 3) * 1.6 - s.cam * 0.08 + t * 0.00006 * (1 + i * 0.3)) % 1.6 + 1.6) % 1.6 - 0.3;
      put(ctx, cs, CLF, R(x), Y(0.3 + hsh(i * 7) * 0.25), k);
    }
  }
  // 새 (하늘을 가로질러 난다)
  ctx.strokeStyle = ch === 2 ? '#8a78c8' : '#4b3a3a';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    const sp = 0.0011 + i * 0.0004, bx = (((hsh(i * 5 + 1) + t * sp - s.cam * 0.2) % 1.4) + 1.4) % 1.4 - 0.2, byy = 0.24 + hsh(i * 9) * 0.18 + Math.sin(t * 0.03 + i) * 0.01, fl = Math.sin(t * 0.3 + i * 2) * 0.008;
    ctx.beginPath();
    ctx.moveTo(R(bx) - R(0.014), Y(byy) - R(fl));
    ctx.quadraticCurveTo(R(bx) - R(0.006), Y(byy) - R(0.008), R(bx), Y(byy));
    ctx.quadraticCurveTo(R(bx) + R(0.006), Y(byy) - R(0.008), R(bx) + R(0.014), Y(byy) - R(fl));
    ctx.stroke();
  }
  for (const [near, par, top] of [[false, 0.12, HZ - 0.36], [true, 0.35, HZ - 0.28]] as [boolean, number, number][]) {
    const c = hillBg(ch, W0, sc2, near), off = -((((s.cam * par) % 2) + 2) % 2) * w;
    ctx.drawImage(c, off, Y(top), w * 2, w * 0.5);
    ctx.drawImage(c, off + w * 2, Y(top), w * 2, w * 0.5);
  }
  // ── 땅 (3/4 시점: 위가 멀고 아래가 가깝다) ──
  ctx.fillStyle = lin(ctx, 0, Y(HZ), 0, Y(1.24), [0, P.grass[0]], [1, P.grass[1]]);
  ctx.fillRect(0, Y(HZ), w, Y(1.24 - HZ));
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.fillRect(0, Y(HZ), w, 2);
  const vis = (x0: number, x1: number) => x1 > s.cam - 0.2 && x0 < s.cam + 1.2;
  // 땅 뒤에 선 것
  for (const z of s.zones) {
    if (!vis(z.x0 - 0.3, z.x1 + 0.3) || z.k === 'plain' || z.k === 'forest' || z.k === 'field') continue;
    const u = R(1), mx = z.k === 'goal' ? z.x0 + 0.12 : (z.x0 + z.x1) / 2;
    put(ctx, markSpr(z.k, ch, u * sc2), LMF, X(mx), Y(HZ + 0.03), u * 0.8);
  }
  // 땅 무늬
  for (const z of s.zones) {
    if (!vis(z.x0, z.x1) || z.k === 'plain') continue;
    ctx.drawImage(zoneTex(z.k, ch, W0, sc2), X(z.x0), Y(HZ + 0.02), R(z.x1 - z.x0), R(ZONE_BAND));
  }
  // 새 땅 팻말
  {
    const gx0 = X(s.goalX - 0.02), gy0 = Y(B0 + 0.04);
    if (gx0 > -R(0.2) && gx0 < w + R(0.2)) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(gx0, gy0);
      ctx.lineTo(gx0, gy0 - R(0.1));
      ctx.stroke();
      rr(ctx, gx0 - R(0.07), gy0 - R(0.15), R(0.14), R(0.06), R(0.012));
      ink(ctx, '#f6dca0', 2);
      ctx.textAlign = 'center';
      ctx.font = `900 ${Math.max(12, Math.round(R(0.034)))}px system-ui, sans-serif`;
      ctx.fillStyle = '#7a3a12';
      ctx.fillText('새 땅', gx0, gy0 - R(0.118));
    }
  }
  // NEW 땅 스포트라이트
  if (s.spot && s.phase === 'play' && t - s.spot.t < 900) {
    const z = s.zones[s.spot.zone], pul = 0.5 + 0.5 * Math.sin(t * 0.15);
    if (z && vis(z.x0, z.x1)) {
      rr(ctx, X(z.x0) - 3, Y(HZ + 0.015), R(z.x1 - z.x0) + 6, R(ZONE_BAND + 0.01), R(0.04));
      ctx.fillStyle = `rgba(255,240,140,${0.12 + 0.12 * pul})`;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([7, 5]);
      ctx.lineDashOffset = -t * 0.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // 일하는 범위(성이 내려져 있을 때) · 갈 곳 미리 보기
  const wr = workR(s), tr = thudR(s);
  if (s.cdown && s.gst === G_DOWN && s.arrive === 0 && s.phase === 'play') {
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 7]);
    ctx.lineDashOffset = -t * 0.3;
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.moveTo(X(s.cx + sx * wr), Y(B0)), ctx.lineTo(X(s.cx + sx * wr), Y(B1 + 0.02))), ctx.stroke();
    ctx.setLineDash([]);
  }
  const going = !isNaN(s.tx) && (s.gst === G_WALK || s.gst === G_CALL || s.gst === G_LIFT) && s.phase === 'play';
  if (going) {
    const tx = s.tx, ty = s.ty, pul = 0.5 + 0.5 * Math.sin(t * 0.25);
    ell(ctx, X(tx), Y(ty), R(tr), R(tr * 0.8 * 0.6));
    ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.1 * pul})`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -t * 0.6;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const ay = Y(ty) - R(0.1) + pul * R(0.012);
    ctx.moveTo(X(tx) - R(0.025), ay - R(0.03));
    ctx.lineTo(X(tx) + R(0.025), ay - R(0.03));
    ctx.lineTo(X(tx), ay);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // ── 땅 위 표지: 무엇을 얻나 (남아 있을 때만) ──
  for (let zi = 0; zi < s.zones.length; zi++) {
    const z = s.zones[zi], zd = ZD[z.k];
    if (!vis(z.x0, z.x1) || z.k === 'plain' || z.k === 'goal' || z.k === 'lair') continue;
    const left = s.objs.some((o) => o.zone === zi && !o.dead && (o.amt > 0 || o.k === 'mon' || o.k === 'folk'));
    if (!left) continue;
    const mx = (z.x0 + z.x1) / 2, by = Y(HZ - 0.04) + Math.sin(t * 0.05 + zi) * R(0.006), r = R(0.03);
    ctx.strokeStyle = 'rgba(75,48,32,.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(X(mx), by + r);
    ctx.lineTo(X(mx), Y(HZ + 0.03));
    ctx.stroke();
    const icons: Item[] = z.k === 'village' ? [] : zd.gets;
    const bw = r * (1.2 + icons.length * 0.95) + (z.k === 'den' || z.k === 'village' ? r * 0.9 : 0);
    rr(ctx, X(mx) - bw / 2, by - r, bw, r * 2, r);
    ctx.fillStyle = 'rgba(255,250,235,.95)';
    ctx.fill();
    ctx.strokeStyle = ZCOL[z.k] ?? OUT;
    ctx.lineWidth = 2;
    ctx.stroke();
    let ix = X(mx) - bw / 2 + r * 0.85;
    for (const it of icons) put(ctx, itemSpr(it, IQ(R, sc2)), IF, ix, by, R(ITEM_S) * 1.25), (ix += r * 0.95);
    if (z.k === 'den') put(ctx, monSpr('slime', 0, R(MD.slime.r) * DMAX * sc2), MF, ix + r * 0.05, by + r * 0.55, R(0.011));
    if (z.k === 'village') put(ctx, personSpr('folk', 4, 0, PQ(R, sc2)), PF, X(mx), by + r * 0.75, R(0.032));
  }

  // ── 세상: 깊이 차례로 (뒤 → 앞) ──
  // (2 = 거인, 3 = 땅에 내려진 성) — 배열은 다시 쓴다
  const list = DRAWL;
  list.length = 0;
  for (const o of s.objs) if ((!o.dead || o.k === 'tree' || o.k === 'fruit') && vis(o.x - 0.1, o.x + 0.1) && o.k !== 'geyser') list.push([o.y, 0, o]);
  for (const p of s.people) if (p.st !== P_IN && vis(p.x - 0.05, p.x + 0.05)) list.push([p.y + 0.001, 1, p]);
  list.push([s.gy, 2, null]);
  if (s.cdown && s.gst !== G_LIFT) list.push([s.cy + 0.02, 3, null]);
  list.sort((a, b) => a[0] - b[0]);
  // 김 구멍은 땅에 붙어 있다 (먼저)
  for (const o of s.objs) {
    if (o.k !== 'geyser' || !vis(o.x - 0.1, o.x + 0.1)) continue;
    const gx = X(o.x), gy = Y(o.y), age = t - o.hitT;
    ell(ctx, gx, gy, R(0.03), R(0.01));
    ink(ctx, '#3a2420', 2);
    if (age < 50) {
      const k = Math.sin(Math.min(1, age / 50) * Math.PI);
      ctx.fillStyle = lin(ctx, 0, gy - R(0.3) * k, 0, gy, [0, 'rgba(255,255,255,0)'], [1, 'rgba(255,240,230,.9)']);
      ctx.beginPath();
      ctx.moveTo(gx - R(0.02), gy);
      ctx.lineTo(gx - R(0.04), gy - R(0.3) * k);
      ctx.lineTo(gx + R(0.04), gy - R(0.3) * k);
      ctx.lineTo(gx + R(0.02), gy);
      ctx.closePath();
      ctx.fill();
    } else for (let i = 0; i < 2; i++) {
      const f = ((t * 0.02 + i * 0.5 + o.v * 0.01) % 1);
      ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - f)})`;
      ell(ctx, gx + Math.sin(f * 6 + i) * R(0.01), gy - f * R(0.08), R(0.012 + f * 0.015), R(0.012 + f * 0.015));
      ctx.fill();
    }
  }
  for (const [, kind, ref] of list) {
    if (kind === 2) drawGiant(ctx, s, w, sc2, X, Y, R);
    else if (kind === 3) drawDownCastle(ctx, s, w, sc2, X, Y, R);
    else if (kind === 0) drawObj(ctx, s, ref as Obj, sc2, X, Y, R);
    else drawPerson(ctx, s, ref as Per, sc2, X, Y, R);
  }
  // 거인 손: 어깨에서 뻗은 긴 팔 + 큰 손 (모든 것 위에)
  if (s.hand && s.cdown) drawHandArm(ctx, s, sc2, X, Y, R);
  // 대포알
  for (const sh of s.shots) {
    const k = sh.t / sh.T, x = sh.x0 + (sh.x1 - sh.x0) * k, y = sh.y0 + (sh.y1 - sh.y0) * k - Math.sin(k * Math.PI) * 0.12;
    ell(ctx, X(x), Y(y), R(0.009), R(0.009));
    ink(ctx, '#2a2a33', 1.5, '#000');
  }

  // ── 폭풍: 앞자락 왼쪽은 어둡고 비가 온다 ──
  if (s.phase === 'play' || s.phase === 'result') {
    const fx0 = X(s.sx);
    if (fx0 > -R(0.9)) {
      const awake = s.awake && s.arrive === 0, bob = Math.sin(t * 0.04) * R(0.01);
      if (awake && fx0 > 0) {
        ctx.fillStyle = lin(ctx, fx0 - R(0.25), 0, fx0 + R(0.06), 0, [0, 'rgba(30,30,60,.42)'], [1, 'rgba(30,30,60,0)']);
        ctx.fillRect(0, Y(TOP), fx0 + R(0.06), Y(BOT - TOP));
        ctx.strokeStyle = 'rgba(200,220,255,.55)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let i = 0; i < 22; i++) {
          const rx = fx0 - R(0.7) * hsh(i * 3) - R(0.02), ry = Y(0.42) + (((t * 9 + i * 53) % 260) / 260) * Y(0.8);
          if (rx < -5) continue;
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx + R(0.012), ry + R(0.04));
        }
        ctx.stroke();
        // 바람 줄 (앞자락 앞으로)
        ctx.strokeStyle = 'rgba(255,255,255,.7)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const f = ((t * 0.03 + i * 0.33) % 1), wx2 = fx0 + R(0.02 + f * 0.2), wy2 = Y(HZ + 0.08 + i * 0.15);
          ctx.globalAlpha = 1 - f;
          ctx.beginPath();
          ctx.moveTo(wx2, wy2);
          ctx.quadraticCurveTo(wx2 + R(0.05), wy2 - R(0.02), wx2 + R(0.09), wy2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      const lt = (t + 37) % 170;
      if (awake && lt < 6) {
        ctx.strokeStyle = '#fff7b0';
        ctx.lineWidth = 3;
        const bx = fx0 - R(0.2 + hsh(Math.floor((t + 37) / 170)) * 0.3);
        ctx.beginPath();
        ctx.moveTo(bx, Y(0.62));
        ctx.lineTo(bx + R(0.03), Y(0.74));
        ctx.lineTo(bx - R(0.01), Y(0.76));
        ctx.lineTo(bx + R(0.04), Y(0.92));
        ctx.stroke();
      }
      put(ctx, stormSpr(ch, R(1) * sc2), SF, fx0, Y(0.5) + bob, R(1) * (awake ? 1 : 0.85));
      // 얼굴
      const fxx = fx0 - R(awake ? 0.06 : 0.035), fyy = Y(0.5) + bob;
      if (fxx > -R(0.1)) {
        ctx.fillStyle = '#1e1a2e';
        ctx.strokeStyle = '#1e1a2e';
        ctx.lineWidth = 3;
        if (awake && s.swait > 0) {
          // 막 깨어나 기지개: 졸린 눈 · 하품
          for (const sx of [-1, 1]) ctx.beginPath(), ctx.moveTo(fxx + sx * R(0.045), fyy), ctx.lineTo(fxx + sx * R(0.015), fyy), ctx.stroke();
          ell(ctx, fxx, fyy + R(0.06), R(0.022), R(0.03 + 0.01 * Math.sin(t * 0.2)));
          ctx.fill();
        } else if (awake) {
          for (const sx of [-1, 1]) {
            ell(ctx, fxx + sx * R(0.035), fyy, R(0.018), R(0.022));
            ctx.fillStyle = '#fff6c8';
            ctx.fill();
            ell(ctx, fxx + sx * R(0.035) + R(0.006), fyy + R(0.004), R(0.009), R(0.011));
            ctx.fillStyle = '#1e1a2e';
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(fxx + sx * R(0.06), fyy - R(0.035));
            ctx.lineTo(fxx + sx * R(0.012), fyy - R(0.018));
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.arc(fxx, fyy + R(0.065), R(0.03), Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
        } else {
          for (const sx of [-1, 1]) ctx.beginPath(), ctx.arc(fxx + sx * R(0.03), fyy, R(0.014), 0.2, Math.PI - 0.2), ctx.stroke();
          font(0.04, 900);
          const zz = (t >> 5) % 3;
          text('z'.repeat(zz + 1), fxx + R(0.07), fyy - R(0.06) - zz * R(0.01), '#ffffff', '#1e1a2e', 3);
        }
      }
    }
  }
  // ── 앞 흙 단면 ──
  {
    const c = soilBg(ch, W0, sc2), off = -((((s.cam % 1) + 1) % 1)) * w;
    ctx.drawImage(c, off, Y(1.215), w, R(0.16));
    ctx.drawImage(c, off + w, Y(1.215), w, R(0.16));
  }

  // ── 방금 일어난 일: 소리 · 가루 · 흔들림 · 글자 (한 번만) ──
  let sn = 0, deps = 0;
  const snd = (n: Parameters<typeof fx.sound>[0], p = 1, v = 1) => void (sn++ < 3 && fx.sound(n, p, v));
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x), ey = Y(e.y);
    switch (e.k) {
      case 'tap': snd('tick', 1.5, 0.5); break;
      case 'step': snd('thud', 1.5, 0.45); fx.kick(2.5); puff(ex, ey, '#f3e6c8', 4, 1.6, 2.6); break;
      case 'swing': snd('whoosh', 0.75, 0.9); break;
      case 'thud': {
        const n = e.n, big = Math.min(1, (e.x2 + 2) / 12);
        fx.sound('thud', 0.5 - big * 0.12, 1.5);
        fx.sound('crack', 0.7, 0.9);
        fx.kick(12 + big * 8 + Math.min(8, n));
        fx.blink('#fff6dc', 0.18);
        fx.ring(ex, ey, '#ffffff', R(tr * 1.1), 5);
        puff(ex - R(0.09) * depth(e.y), ey, '#f6e6c4', 10, 4.5, 4);
        puff(ex + R(0.09) * depth(e.y), ey, '#f6e6c4', 10, 4.5, 4);
        fx.memo.landT = e.t;
        if (n > 0) say(ex, ey - R(0.34), `+${n}`, n >= WOW_N ? '#ffe36b' : '#fff3c4', n >= WOW_N ? 26 : 20);
        break;
      }
      case 'wake': fx.sound('thud', 0.35, 1.2); fx.sound('zap', 0.5, 0.7); say(Math.max(R(0.15), ex - R(0.1)), Y(0.36), '우르릉!', '#d8dcff', 18); break;
      case 'pour': if (t - (fx.memo.pourT ?? -99) > 2) (fx.memo.pourT = t), snd('pop', 0.8 + Math.min(1.2, e.n * 0.04), 0.55); puff(ex, ey, '#f6e6c4', 3, 2.6, 2.8); break;
      case 'reach': snd('whoosh', 0.7, 0.9); break;
      case 'grab2':
        fx.sound('thud', 1.1, 0.9);
        fx.sound('crack', 1.3, 0.6);
        fx.kick(5);
        puff(ex, ey, '#f3e2c0', 9, 3.6, 3.2);
        if (e.n) say(ex, ey - R(0.1), e.n >= 4 ? `와르르 +${e.n}` : `+${e.n}`, '#ffe9a0', e.n >= 4 ? 20 : 16);
        break;
      case 'pourin': fx.sound('coin', 1.1, 0.8); snd('pop', 1.4, 0.6); puff(ex, ey, '#ffe36b', 8, 3, 2.6); break;
      case 'flick': snd('boing', 0.9, 0.9); say(ex, ey - R(0.06), '휙!', '#ffffff', 17); puff(ex, ey, '#ffffff', 5, 3, 2.4); break;
      case 'chop': if (t - (fx.memo.chopT ?? -99) > 5) (fx.memo.chopT = t), snd('crack', 1.7, 0.35), puff(ex, ey, '#e8c890', 2, 2, 2); break;
      case 'clink': if (t - (fx.memo.clinkT ?? -99) > 5) (fx.memo.clinkT = t), snd('tick', 2.2, 0.4), puff(ex, ey, '#fff3a0', 3, 2.5, 1.8); break;
      case 'topple': if (t - (fx.memo.topT ?? -99) > 2) (fx.memo.topT = t), snd('crack', 1.0 + hsh(e.t + e.x) * 0.3, 0.6); puff(ex, ey - R(0.04), e.text === 'rock' || e.text === 'hot' ? '#d8d0c4' : '#9fe070', 5, 3.2, 2.6); break;
      case 'empty':
        if (e.text === 'tree' || e.text === 'fruit') snd('thud', 1.2, 0.7), snd('crack', 1.1, 0.5), fx.kick(3), puff(ex, ey - R(0.02), '#8fd06a', 6, 3, 2.6);
        else if (e.text === 'rock' || e.text === 'hot') snd('crack', 0.9, 0.6), puff(ex, ey - R(0.02), '#d8d0c4', 6, 3, 2.6);
        break;
      case 'pick': if (t - (fx.memo.pickT ?? -99) > 3) (fx.memo.pickT = t), snd('pop', 1.9, 0.3); break;
      case 'plop': if (t - (fx.memo.plopT ?? -99) > 3) (fx.memo.plopT = t), snd('tick', 1.3, 0.3); break;
      case 'dep':
        if (deps++ < 2 && t - (fx.memo.depT ?? -99) > 4) {
          fx.memo.depT = t;
          fx.memo.depN = (fx.memo.depN ?? 0) + 1;
          snd('coin', 1 + ((fx.memo.depN % 8) * 0.06), 0.45);
          puff(ex, ey, '#ffe36b', 2, 2, 2);
        }
        break;
      case 'part': {
        fx.memo.partT = e.t;
        if (!e.x2) say(ex, ey - R(0.04), `${PD[e.text as PK]?.name ?? ''} +1층`, '#fff3c4', 15);
        fx.sound('chime', 1, 1);
        fx.sound('clear', 1.2, 0.8);
        fx.kick(8);
        puff(ex, ey, '#ffd84a', 16, 5.5, 3.2);
        puff(ex, ey, '#ffffff', 8, 4, 2.6);
        fx.ring(ex, ey, '#ffe36b', R(0.18), 5);
        break;
      }
      case 'born': snd('boing', 1.7, 0.5); say(ex + R(0.04), ey, '+1 식구', '#ffd0e0', 14); puff(ex, ey, '#ff9ecb', 5, 2.4, 2.4); break;
      case 'join': snd('chime', 1.3, 0.6); if (t - (fx.memo.joinT ?? -99) > 24) (fx.memo.joinT = t), say(ex, ey, '성이다!', '#ffffff', 15); break;
      case 'joinall': snd('swell', 1.3, 0.8); say(ex, ey - R(0.06), `+${e.n}명`, '#ffd0e0', 22); break;
      case 'free': snd('chime', 1.1, 0.8); say(ex, ey, '풀려났다!', '#ffffff', 16); puff(ex, ey, '#ffe9a0', 10, 3.6, 2.8); break;
      case 'horn': fx.sound('swell', 0.55, 1); snd('whoosh', 0.6, 0.6); say(ex, ey - R(0.05), '뿌우~', '#fff3c4', 18); break;
      case 'bell': snd('ding', 1.2, 0.9); say(ex, ey - R(0.1), '땡땡!', '#ffe36b', 16); break;
      case 'lift': snd('swell', 1.2, 0.6); snd('whoosh', 0.9, 0.7); break;
      case 'squash': flat(s).push({ x: e.x, y: e.y, mk: e.text as MK, t: e.t }); say(ex, ey - R(0.12), '찌부!', '#c8f08a', 24); fx.sound('thud', 0.6, 1.3); fx.sound('splash', 0.7, 0.9); puff(ex, ey, '#c8f08a', 14, 5, 3.4); fx.kick(10); break;
      case 'mdie': snd('pop', 0.6, 0.9); snd('coin', 0.9, 0.7); puff(ex, ey - R(0.03), '#ffe36b', 10, 4, 3); puff(ex, ey - R(0.03), '#ffffff', 6, 3, 2.6); if (e.n === 2) fx.kick(18), fx.blink('#fff3c4', 0.4); break;
      case 'wind': if (t - (fx.memo.windT ?? -99) > 10) (fx.memo.windT = t), snd('swell', 1.8, 0.35); break;
      case 'mslam': snd('thud', 1.1, 0.8); fx.kick(4); puff(ex, ey, '#f3e6c8', 5, 3, 2.4); if (e.n) say(ex, ey - R(0.08), '으앗!', '#ffffff', 14); break;
      case 'bslam': fx.sound('thud', 0.55, 1.2); fx.kick(10); puff(ex, ey, '#f3e6c8', 10, 4.5, 3); if (e.n) say(ex, ey - R(0.12), `${e.n}명 붕~`, '#ffffff', 15); break;
      case 'whack': if (t - (fx.memo.whT ?? -99) > 6) (fx.memo.whT = t), snd('tick', 1.2, 0.45), puff(ex, ey, '#ffffff', 2, 2.2, 2); break;
      case 'cannon': snd('thud', 1.3, 0.7); puff(ex, ey, '#d8d8d8', 6, 2.2, 3); break;
      case 'boom': snd('crack', 0.8, 0.8); snd('thud', 0.9, 0.7); fx.kick(5); puff(ex, ey, '#ffb347', 8, 4, 3); puff(ex, ey, '#666666', 4, 2.5, 3); if (e.n) say(ex, ey - R(0.05), '쾅!', '#ffd84a', 16); break;
      case 'geyser': snd('splash', 1.4, 0.7); snd('whoosh', 1.3, 0.5); if (e.n) say(ex, ey - R(0.15), '앗 뜨거!', '#ffd0c0', 14); break;
      case 'blown':
        if (t - (fx.memo.blT ?? -99) > 8) (fx.memo.blT = t), snd('whoosh', 1.6, 0.8), snd('fail', 1.5, 0.4), say(ex + R(0.05), ey - R(0.06), '으아아~', '#e6ecff', 15);
        break;
      case 'stormhit': fx.sound('fail', 0.9, 1); fx.sound('thud', 0.45, 1.2); fx.kick(18); fx.blink('#5a5f7a', 0.35); say(ex, ey - R(0.1), '와르르!', '#e6ecff', 20); break;
      case 'heart': snd('fail', 0.8, 0.9); say(ex, ey, '하트 -1', '#ff8a7a', 18); break;
      case 'land': if (t - (fx.memo.landP ?? -99) > 4) (fx.memo.landP = t), snd('thud', 2, 0.25), puff(ex, ey, '#f3e6c8', 3, 1.8, 2); break;
      case 'grab': snd('pop', 1.6, 0.5); puff(ex, ey, '#ffe36b', 3, 2, 2); break;
      case 'slam':
        fx.sound('thud', 0.42, 1.5);
        fx.sound('crack', 0.6, 1.1);
        fx.kick(22);
        fx.blink('#fff3c4', 0.3);
        puff(ex, ey, '#ffd84a', 14, 6, 3.4);
        say(ex, ey - R(0.1), `-${e.n}`, '#ffe36b', 22);
        break;
      case 'star3': fx.sound('coin', 1.2, 1); puff(ex, ey, '#ffd84a', 14, 5.5, 3.2); fx.ring(ex, ey, '#ffd84a', R(0.2), 5); break;
      case 'arrive': say(ex, ey - R(0.4), '새 땅에 쿵!', '#fff3c4', 26); fx.sound('clear', 0.9, 1); puff(ex - R(0.1), ey - R(0.25), '#ff9ecb', 16, 6, 3.2); puff(ex + R(0.1), ey - R(0.25), '#9ff0ff', 16, 6, 3.2); break;
      case 'stage': snd('ding', 1, 0.6); break;
      case 'clear': fx.sound('clear', 1, 1); puff(w * 0.3, Y(0.7), '#ffd84a', 16, 6, 3.2); puff(w * 0.7, Y(0.7), '#9ff0ff', 16, 6, 3.2); break;
      case 'pickopen': snd('swell', 1.1, 0.9); break;
      case 'perk': fx.sound('coin', 1, 1); fx.sound('chime', 1.1, 0.9); puff(R(e.x), Y(e.y) - R(0.1), '#ffe36b', 16, 5, 3.2); break;
      case 'end': fx.sound(e.n ? 'clear' : 'fail', 0.9, 1); break;
    }
  }
  if (s.big && (fx.memo.bigT ?? -1) !== s.big.t && s.big.t > seenT) (fx.memo.bigT = s.big.t), fx.sound('chime', 1 + Math.min(8, s.big.n) * 0.04, 1), fx.blink('#fff6c8', 0.2);
  fx.memo.t = t;
  ctx.restore();
  drawHud(ctx, s, w, h, sc2);
}
/** 성 밑에 깔린 몬스터 (연출) */
const FLAT = new WeakMap<object, { x: number; y: number; mk: MK; t: number }[]>();
const flat = (s: GiantState) => {
  let a = FLAT.get(s);
  if (!a) FLAT.set(s, (a = []));
  if (a.length > 6) a.shift();
  return a;
};
type XF = (v: number) => number;
function drawObj(ctx: C2, s: GiantState, o: Obj, sc2: number, X: XF, Y: XF, R: XF) {
  const t = s.t, ox = X(o.x), oy = Y(o.y), dp = depth(o.y);
  switch (o.k) {
    case 'tree':
    case 'fruit': {
      const stl = treeStyle(s, o), u = R(TREE_H) * dp * (0.88 + (o.v % 3) * 0.07);
      if (o.amt > 0) {
        const a = t - o.hitT, shake = a < 36 ? Math.sin(a * 0.7) * 0.14 * (1 - a / 36) : o.workers > 0 ? Math.sin(t * 0.6 + o.v) * 0.025 : 0;
        put(ctx, treeSpr(stl, o.v % 3, TQ(R, sc2)), TF, ox, oy, u, 1, shake);
      } else {
        put(ctx, treeSpr(9, 0, TQ(R, sc2)), TF, ox, oy, u);
        const a = t - o.fallT;
        if (a < 44) {
          const k = Math.min(1, a / 16), side = o.dir !== 1 && o.dir !== -1 ? (o.v % 2 ? 1 : -1) : o.dir;
          put(ctx, treeSpr(stl, o.v % 3, TQ(R, sc2)), TF, ox, oy, u, 1, side * k * k * 1.45, a < 28 ? 1 : 1 - (a - 28) / 16);
        }
      }
      break;
    }
    case 'wheat':
    case 'shroom':
    case 'rock':
    case 'hot': {
      const q = o.amt <= 0 ? 0 : Math.ceil((o.amt / o.max) * 3), icy = o.k === 'rock' && s.zones[o.zone]?.k === 'ice';
      const u = R(CROP_W) * dp * (o.k === 'rock' || o.k === 'hot' ? 1.3 : 1);
      const a = t - o.hitT, shake = a < 20 ? Math.sin(a * 1.2) * 0.12 * (1 - a / 20) : o.k === 'wheat' && o.workers > 0 ? Math.sin(t * 0.3 + o.v) * 0.06 : 0;
      put(ctx, cropSpr(o.k, q, icy ? 99 : o.k === 'rock' ? o.v % 3 : o.v % 2, R(CROP_W) * DMAX * 1.3 * sc2), CF, ox, oy, u, 1, shake);
      if (o.k === 'hot' && q > 0 && (t + o.v) % 50 < 25) {
        ctx.fillStyle = 'rgba(255,170,60,.5)';
        ell(ctx, ox, oy - u * 0.4, u * 0.25, u * 0.2);
        ctx.fill();
      }
      break;
    }
    case 'fishery': {
      const ice = s.zones[o.zone]?.k === 'ice', u = R(0.03) * dp;
      if (ice) {
        ell(ctx, ox, oy, u * 0.9, u * 0.32);
        ink(ctx, o.shaken ? '#2f7fb8' : '#9fd0ec', 1.5, '#ffffff');
      } else
        for (let i = 0; i < 2; i++) {
          const f = (((t + o.v) / 70 + i * 0.5) % 1);
          ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - f)})`;
          ctx.lineWidth = 1.5;
          ell(ctx, ox, oy, u * (0.3 + f), u * (0.1 + f * 0.3));
          ctx.stroke();
        }
      if (o.amt > 0 && (!ice || o.shaken)) {
        const busy = t - o.hitT < 70, per = busy ? 40 : 150;
        for (let j = 0; j < (busy ? 2 : 1); j++) {
          const ph = (t + o.v * 7 + j * 20) % per;
          if (ph >= 34) continue;
          const k = ph / 34, fx2 = ox + (k - 0.5) * R(0.05) * (j ? -1 : 1), fy = oy - Math.sin(k * Math.PI) * R(0.075);
          put(ctx, itemSpr('fish', IQ(R, sc2)), IF, fx2, fy, R(ITEM_S) * dp, j ? -1 : 1, (k - 0.5) * 1.6 * (j ? -1 : 1));
        }
      }
      break;
    }
    case 'mon': {
      if (!o.mk || o.dead) break;
      const md = MD[o.mk], u = R(md.r) * dp, mood = o.stun > 0 ? 3 : t - o.hitT < 8 ? 2 : o.wind > 0 ? 1 : 0;
      const hop = mood === 0 ? Math.abs(Math.sin(t * 0.1 + o.v)) * u * 0.12 : 0, sq = t - o.slamT < 20 ? 1 - 0.25 * Math.sin(((t - o.slamT) / 20) * Math.PI) : 1;
      ctx.save();
      ctx.translate(ox, oy - hop);
      ctx.scale((o.dir < 0 ? -1 : 1) * (2 - sq), sq);
      stamp(ctx, monSpr(o.mk, mood, R(md.r) * DMAX * sc2), MF, u);
      ctx.restore();
      if (o.stun > 0)
        for (let i = 0; i < 3; i++) {
          const a = t * 0.15 + (i * TAU) / 3;
          ctx.fillStyle = '#ffe36b';
          starPath(ctx, ox + Math.cos(a) * u * 0.7, oy - u * 2.2 + Math.sin(a) * u * 0.2, R(0.008), 0.45);
          ctx.fill();
        }
      if (o.hp < o.hpMax) {
        const bw = md.boss ? R(0.2) : u * 1.6, by = oy - u * (md.boss ? 2.55 : 2.3), q = clamp(o.hp / o.hpMax, 0, 1);
        rr(ctx, ox - bw / 2 - 1.5, by - 1.5, bw + 3, R(0.012) + 3, 3);
        ctx.fillStyle = OUT;
        ctx.fill();
        rr(ctx, ox - bw / 2, by, bw * q, R(0.012), 2);
        ctx.fillStyle = md.boss ? '#ff5a4e' : '#ff8a5a';
        ctx.fill();
      }
      break;
    }
    case 'folk': {
      const u = R(PH) * dp, fr = ((t + o.v) >> 3) % 2 ? 1 : 2;
      put(ctx, personSpr('folk', s.cdown && Math.abs(o.x - s.cx) < 0.4 ? 4 : fr, o.v % 3, PQ(R, sc2)), PF, ox, oy, u, Math.cos((t + o.v) * 0.02) > 0 ? 1 : -1);
      break;
    }
    case 'loot': {
      if (o.dead) break;
      const u = R(ITEM_S) * dp;
      put(ctx, itemSpr(o.sub, IQ(R, sc2)), IF, ox, oy - R(o.z) - u * 0.4, u, 1, o.z > 0 ? (t * 0.3 + o.v) % TAU : 0);
      break;
    }
    case 'chest':
    case 'cage': {
      if (o.dead) break;
      const u = R(o.k === 'chest' ? 0.04 : 0.06) * dp;
      put(ctx, boxSpr(o.k, o.k === 'chest' && o.amt < o.max ? 1 : 0, BQ(R, sc2)), BF, ox, oy - R(o.z), u);
      if (o.k === 'cage' && (t + o.v) % 120 < 40) {
        ctx.textAlign = 'center';
        ctx.font = `800 ${Math.max(12, Math.round(R(0.032)))}px system-ui, sans-serif`;
        ctx.lineWidth = 3;
        ctx.strokeStyle = OUT;
        ctx.strokeText('살려줘!', ox, oy - u * 1.3);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('살려줘!', ox, oy - u * 1.3);
      }
      break;
    }
    default:
      break;
  }
}
function drawPerson(ctx: C2, s: GiantState, p: Per, sc2: number, X: XF, Y: XF, R: XF) {
  const t = s.t, look: Look = p.job ?? 'folk', skin = p.seed % 3, dp = depth(p.y), u = R(PH) * dp;
  let fr = 0, rot = 0, bob = 0;
  const walk = ((t + p.id * 5) >> (p.st === P_RUN ? 2 : 3)) % 2 ? 1 : 2;
  switch (p.st) {
    case P_OUT:
    case P_JOIN:
    case P_RUN:
      fr = p.z > 0.003 ? 4 : walk;
      break;
    case P_BACK:
      fr = 3;
      bob = ((t + p.id) >> 3) % 2 ? R(0.002) : 0;
      break;
    case P_WORK:
      fr = (t + p.id * 3) % 22 < 11 ? 5 : 6;
      break;
    case P_IDLE:
      if (s.arrive > 0 || (t + p.id * 13) % 220 < 36 || t - (juice(s).memo.partT ?? -99) < 50) (fr = 4), (bob = Math.abs(Math.sin(t * 0.25 + p.id)) * R(0.012));
      else fr = Math.abs(p.x - p.hx) > 0.004 ? walk : 0;
      break;
    case P_FLY:
    case P_BLOWN:
      fr = 4;
      rot = t * 0.3 + p.id;
      break;
    case P_DIZZY:
      rot = Math.sin(t * 0.3 + p.id) * 0.15;
      break;
    case P_HOP:
      fr = 4;
      break;
  }
  const x = X(p.x), y = Y(p.y) - R(p.z) - bob;
  if (fr === 4) {
    ctx.fillStyle = 'rgba(40,30,20,.2)';
    ell(ctx, x, Y(p.y), u * 0.26, u * 0.07);
    ctx.fill();
  }
  put(ctx, personSpr(look, fr, skin, PQ(R, sc2), rot ? 1 : p.dir), PF, x, y - (rot ? u * 0.5 : 0), u, rot ? p.dir : 1, rot);
  if (p.carry) put(ctx, itemSpr(p.carry, IQ(R, sc2)), IF, x + p.dir * u * 0.05, y - u * 1.12, R(ITEM_S) * dp);
  if (p.st === P_DIZZY)
    for (let i = 0; i < 2; i++) {
      const a = t * 0.2 + i * Math.PI;
      ctx.fillStyle = '#ffe36b';
      starPath(ctx, x + Math.cos(a) * u * 0.3, y - u * 1.1 + Math.sin(a) * u * 0.08, R(0.006), 0.45);
      ctx.fill();
    }
  // 폭풍이 코앞: 머리 위에 '!'
  if (s.awake && (p.st === P_WORK || p.st === P_OUT) && p.x < s.sx + REACH + 0.12 && (t >> 3) % 2) {
    ctx.font = `900 ${Math.max(12, Math.round(R(0.034)))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = OUT;
    ctx.strokeText('!', x, y - u * 1.25);
    ctx.fillStyle = '#ffe36b';
    ctx.fillText('!', x, y - u * 1.25);
  }
}
/** 성 그리기: (x, y) = 성 바닥 가운데(화면 px), 기울기 · 세로 눌림 */
/** 성 층 더미 한 장: 층은 늘 FH0 간격으로 쌓아 두고(새 층은 위에 한 장만 덧찍기 — 다시 굽지 않음),
 *  찍을 때 세로로 눌러(fh/FH0) 원래 모습과 같게. 문 층 · 지붕은 따로 찍는다 */
interface Lay { c: HTMLCanvasElement; g: C2; q: number; cap: number; built: PK[] }
const LAYS = new Map<number, Lay>();
const layY0 = (L: Lay) => L.c.height - (CFF.h - CFF.oy) * L.q;
function floorLayer(built: PK[], cq: number) {
  const q = sprQ(cq);
  let L = LAYS.get(q);
  const n = built.length, fresh = !L || L.built.length > n || L.built.some((k, i) => built[i] !== k);
  if (!L || fresh || n > L.cap) {
    const cap = Math.max(8, Math.ceil(n / 8) * 8);
    const old = !fresh && L ? L : null;
    if (!L || cap !== L.cap) {
      const c = document.createElement('canvas');
      c.width = Math.ceil(CFF.w * q);
      c.height = Math.ceil(((cap - 1) * FH0 + CFF.h) * q);
      const g = c.getContext('2d')!;
      if (old) g.drawImage(old.c, 0, c.height - old.c.height);
      L = { c, g, q, cap, built: old ? old.built : [] };
      if (LAYS.size > 3) LAYS.clear();
      LAYS.set(q, L);
    } else L.g.clearRect(0, 0, L.c.width, L.c.height), (L.built = []);
  }
  for (let i = L.built.length; i < n; i++) {
    L.g.drawImage(floorSpr(built[i], cq), 0, layY0(L) - (i * FH0 + CFF.oy) * q, CFF.w * q, CFF.h * q);
    L.built.push(built[i]);
  }
  return L;
}
function drawCastle(ctx: C2, s: GiantState, x: number, y: number, rot: number, sy: number, cq: number, cu: number) {
  const t = s.t, n = floors(s), fh = fhU(n), kk = fh / FH0, L = floorLayer(s.built, cq);
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (sy !== 1) ctx.scale(2 - sy, sy);
  stamp(ctx, baseSpr(cq), CBF, cu);
  if (n) {
    const top = layY0(L) - ((n - 1) * FH0 + CFF.oy) * L.q, sh = L.c.height - top, k = cu / L.q;
    ctx.drawImage(L.c, 0, top, L.c.width, sh, -CFF.ox * cu, -BASE_H * cu + (top - layY0(L)) * k * kk, L.c.width * k, sh * k * kk);
  }
  put(ctx, roofSpr(s.parts.roof > 0, cq), CRF, 0, -(BASE_H + n * fh) * cu, cu);
  // 풍차 날개 · 물레방아 · 대장간 연기 · 꼭대기 깃발
  s.built.forEach((k, i) => {
    const fy = -(BASE_H + (i + 0.5) * fh) * cu;
    if (k === 'mill') {
      const hx = 0.46 * cu, L = Math.min(0.42, 0.2 + fh) * cu, a0 = t * 0.06;
      for (let j = 0; j < 4; j++) {
        const a = a0 + (j * Math.PI) / 2;
        ctx.save();
        ctx.translate(hx, fy);
        ctx.rotate(a);
        ctx.fillStyle = '#fff8e8';
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 1.2;
        ctx.fillRect(L * 0.15, -L * 0.09, L * 0.85, L * 0.18);
        ctx.strokeRect(L * 0.15, -L * 0.09, L * 0.85, L * 0.18);
        ctx.restore();
      }
      ell(ctx, hx, fy, cu * 0.04, cu * 0.04);
      ink(ctx, '#8a5a30', 1.2);
    } else if (k === 'wheel') {
      const hx = -0.46 * cu, r = Math.min(0.3, 0.12 + fh * 0.8) * cu;
      ell(ctx, hx, fy, r, r);
      ink(ctx, '#b8824a', 1.5);
      ctx.strokeStyle = '#7a4a22';
      ctx.lineWidth = 1.5;
      for (let j = 0; j < 6; j++) {
        const a = -t * 0.05 + (j * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(hx, fy);
        ctx.lineTo(hx + Math.cos(a) * r, fy + Math.sin(a) * r);
        ctx.stroke();
      }
    } else if (k === 'forge' && t % 6 < 3) {
      const f = ((t * 0.02) % 1);
      ctx.fillStyle = `rgba(220,220,220,${0.7 * (1 - f)})`;
      ell(ctx, 0.28 * cu + f * cu * 0.1, fy - fh * cu * 0.5 - 0.16 * cu - f * cu * 0.3, cu * (0.05 + f * 0.06), cu * (0.05 + f * 0.06));
      ctx.fill();
    }
  });
  // 성문: 내려놓은 뒤 쏟아져 나오는 동안 활짝 (안이 어둡고 문짝이 양옆으로)
  const open = s.cdown && (s.pourQ > 0 || s.gst === G_CALL || t - (juice(s).memo.landT ?? -99) < 50) ? 1 : 0;
  if (open) {
    ctx.beginPath();
    ctx.moveTo(-0.15 * cu, 0);
    ctx.lineTo(-0.15 * cu, -0.21 * cu);
    ctx.arc(0, -0.21 * cu, 0.15 * cu, Math.PI, TAU);
    ctx.lineTo(0.15 * cu, 0);
    ctx.closePath();
    ctx.fillStyle = '#2a1a14';
    ctx.fill();
    ctx.fillStyle = 'rgba(255,200,120,.35)';
    ctx.fillRect(-0.12 * cu, -0.12 * cu, 0.24 * cu, 0.12 * cu);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * 0.16 * cu, 0);
      ctx.lineTo(sd * 0.27 * cu, 0.02 * cu);
      ctx.lineTo(sd * 0.27 * cu, -0.3 * cu);
      ctx.lineTo(sd * 0.16 * cu, -0.36 * cu);
      ctx.closePath();
      ctx.fillStyle = '#8a5428';
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  } else if (!s.cdown && s.phase === 'play') {
    // 창문에서 손 흔드는 식구들
    for (const [wx, wy, ph] of [[-0.33, -0.31, 0], [0.33, -0.31, 1.7]]) {
      const a = Math.sin(t * 0.25 + ph) * 0.6;
      ctx.strokeStyle = SKIN[ph ? 0 : 1];
      ctx.lineWidth = Math.max(1.5, cu * 0.025);
      ctx.beginPath();
      ctx.moveTo(wx * cu + (wx < 0 ? -0.03 : 0.03) * cu, wy * cu);
      ctx.lineTo(wx * cu + (wx < 0 ? -0.08 : 0.08) * cu, (wy - 0.06) * cu + a * 0.03 * cu);
      ctx.stroke();
    }
  }
  const py = -(BASE_H + n * fh + 0.56) * cu, wv = Math.sin(t * 0.15) * 0.04 * cu;
  ctx.beginPath();
  ctx.moveTo(0, py);
  ctx.quadraticCurveTo(0.12 * cu, py + 0.02 * cu + wv, 0.24 * cu, py + 0.05 * cu - wv);
  ctx.lineTo(0, py + 0.14 * cu);
  ctx.closePath();
  ctx.fillStyle = s.parts.roof ? '#ffd23f' : '#ff5a4e';
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}
/** 거인 자세와 성 자리 (성은 등 · 들어 올리는 중 · 땅) */
interface Pose { mood: number; legF: number; legB: number; armF: number; armB: number; bob: number; lean: number; horn: boolean; front: boolean; carried: boolean; cx: number; cy: number; crot: number; csy: number; cs: number; reach: boolean }
function pose(s: GiantState, fx: ReturnType<typeof juice>, R: XF): Pose {
  const t = s.t, gs = dscale(s.gy), ease = (e: number) => e * e * (3 - 2 * e);
  const backX = s.gx - 0.125 * gs, backY = s.gy - 0.17 * gs;
  const P: Pose = { mood: 0, legF: 0, legB: 0, armF: 0.3, armB: -0.15, bob: Math.sin(t * 0.06) * R(0.002), lean: 0, horn: false, front: false, carried: !s.cdown, cx: backX, cy: backY, crot: -0.04 + Math.sin(t * 0.05) * 0.01, csy: 1, cs: gs, reach: false };
  const stormNear = s.awake && s.arrive === 0 && s.sx > (s.cdown ? s.cx : s.gx) - 0.5;
  if (P.carried) (P.armB = -0.75), (P.lean = 0.05);
  if (s.gst === G_WALK) {
    const ph = (s.wph / STRIDE) * Math.PI;
    P.legF = 0.5 * Math.sin(ph);
    P.legB = -P.legF;
    P.bob = Math.abs(Math.cos(ph)) * R(0.012);
    P.armF = 0.35 - 0.25 * Math.sin(ph);
    P.armB = -0.75 + 0.1 * Math.sin(ph);
    P.lean = 0.08;
    P.crot = -0.05 + Math.sin(ph) * 0.05;
    P.mood = stormNear ? 4 : 0;
  } else if (s.gst === G_DROP) {
    const e = s.gt / DROP_T, k = ease(e), ds = dscale(s.cy);
    P.cx = backX + (s.cx - backX) * k;
    P.cy = backY + (s.cy - backY) * e * e - Math.sin(Math.PI * e) * 0.2 * gs;
    P.cs = gs + (ds - gs) * e;
    P.crot = -Math.sin(Math.PI * e) * 0.55;
    P.armF = P.armB = 0.4 + Math.sin(Math.PI * Math.min(1, e * 1.4)) * 2.4 * (1 - e * 0.5);
    P.mood = 1;
    P.lean = 0;
    P.front = e > 0.45;
    P.carried = true;
  } else if (s.gst === G_LIFT) {
    const e = s.gt / LIFT_T, k = ease(e), ds = dscale(s.cy);
    P.cx = s.cx + (backX - s.cx) * k;
    P.cy = s.cy + (backY - s.cy) * k - Math.sin(Math.PI * e) * 0.2 * gs;
    P.cs = ds + (gs - ds) * e;
    P.crot = -Math.sin(Math.PI * e) * 0.55;
    P.armF = P.armB = 0.4 + Math.sin(Math.PI * Math.max(0, 1 - e * 1.2)) * 2.4;
    P.mood = 1;
    P.lean = 0;
    P.front = e < 0.55;
    P.carried = true;
  } else if (s.cdown) {
    P.cx = s.cx;
    P.cy = s.cy;
    P.cs = dscale(s.cy);
    P.crot = 0;
    P.lean = 0;
    const k = t - (fx.memo.landT ?? -99);
    P.csy = k < 14 ? 1 - 0.13 * Math.sin((k / 14) * Math.PI) : 1;
    if (s.hand) (P.reach = true), (P.mood = s.hand.t < HAND_DOWN ? 1 : 3), (P.armB = 0.5), (P.lean = 0.04);
    else if (s.gst === G_CALL) (P.horn = true), (P.armF = 2.35), (P.mood = 6);
    else if (s.arrive > 0) (P.armF = 2.8), (P.armB = 2.6), (P.mood = 3), (P.bob = Math.abs(Math.sin(t * 0.2)) * R(0.02));
    else if (k < 50) (P.mood = 3), (P.armF = 0.9), (P.armB = 0.7);
    else if (stormNear) (P.mood = 4), (P.armF = 0.2);
    else if ((t + 90) % 320 < 40) (P.armF = 2.6), (P.mood = 1);
    else (P.armF = 0.5), (P.armB = 0.35);
  } else if (stormNear) P.mood = 4;
  if (s.gdz > 0) (P.mood = 5), (P.lean = Math.sin(t * 0.25) * 0.08);
  return P;
}
/** 땅에 내려진 성 (깔린 몬스터가 밑에서 삐죽) + 바라는 부품 말풍선 */
function drawDownCastle(ctx: C2, s: GiantState, w: number, sc2: number, X: XF, Y: XF, R: XF) {
  const t = s.t, P = pose(s, juice(s), R);
  for (const f of flat(s)) {
    if (t - f.t > 90) continue;
    const mu = R(MD[f.mk].r) * dscale(f.y);
    ctx.save();
    ctx.translate(X(f.x), Y(f.y) + R(0.004));
    ctx.scale(1.7, 0.22);
    stamp(ctx, monSpr(f.mk, 2, R(MD[f.mk].r) * DMAX * sc2), MF, mu);
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(40,30,20,.25)';
  ell(ctx, X(P.cx), Y(P.cy), R(CW * 0.62) * P.cs, R(0.03) * P.cs);
  ctx.fill();
  drawCastle(ctx, s, X(P.cx), Y(P.cy), 0, P.csy, CQ(R, sc2), R(CW) * P.cs);
  drawWish(ctx, s, w, sc2, X(P.cx), Y(P.cy) - R(castleH(floors(s))) * P.cs * P.csy, R);
}
function drawWish(ctx: C2, s: GiantState, w: number, sc2: number, bx: number, topY: number, R: XF) {
  if (!s.wish || s.phase !== 'play' || s.gst === G_DROP || s.gst === G_LIFT) return;
  // 말풍선: [다음 층 그림 크게] + 모자란 것 하나 (예: 통나무 3/6) — 꼬리가 성 지붕을 가리킨다
  const t = s.t, bobw = Math.sin(t * 0.08) * R(0.004), need = Object.keys(PD[s.wish].need) as Res[];
  const r = need.find((q) => s.wishGot[q] < needOf(s, s.wish!, q)) ?? need[need.length - 1], got = s.wishGot[r], nd = needOf(s, s.wish, r);
  const bh = R(0.082), bw = R(0.31), lx = clamp(bx + R(0.05), R(0.02), w - bw - R(0.02)), ly = Math.max(R(0.27), topY - R(0.02) + bobw);
  ctx.beginPath();
  ctx.moveTo(clamp(bx + R(0.04), lx + R(0.04), lx + bw - R(0.04)), ly - bh / 2 + R(0.01));
  ctx.lineTo(bx + R(0.01), Math.max(ly + R(0.03), topY + R(0.03)));
  ctx.lineTo(clamp(bx + R(0.1), lx + R(0.08), lx + bw - R(0.01)), ly - bh / 2 + R(0.01));
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,250,235,.97)';
  ctx.fill();
  ctx.strokeStyle = '#e0a020';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  rr(ctx, lx, ly - bh * 1.5, bw, bh, bh / 2.4);
  ctx.fill();
  ctx.stroke();
  const my = ly - bh;
  put(ctx, ghostSpr(s.wish, GHQ(R, sc2)), ghostFr, lx + R(0.075), my + R(0.022), R(0.13));
  put(ctx, itemSpr(RES_ITEM[r], IQ(R, sc2)), IF, lx + R(0.17), my, R(ITEM_S) * 1.5);
  ctx.textAlign = 'left';
  ctx.font = `900 ${Math.max(12, Math.round(R(0.042)))}px system-ui, sans-serif`;
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText(`${got}/${nd}`, lx + R(0.195), my + 1);
  ctx.fillStyle = got >= nd ? '#2f9a3a' : INK;
  ctx.fillText(`${got}/${nd}`, lx + R(0.195), my + 1);
  ctx.textAlign = 'center';
}
/** 거인의 큰 손 (단위 = 손 크기, 가운데 = (0,0)) — 0 펼침 · 1 움켜쥠 */
const HF: Fr = { w: 2.4, h: 2.4, ox: 1.2, oy: 1.2 };
function paintBigHand(g: C2, fist: boolean) {
  const skin = '#f6c39a', lw = 0.07;
  if (fist) {
    ell(g, 0, 0, 0.8, 0.66);
    ink(g, radg(g, -0.2, -0.25, 0.05, 0.9, [0, '#ffd9b8'], [1, '#e9a87a']), lw);
    g.strokeStyle = 'rgba(120,60,30,.55)';
    g.lineWidth = 0.05;
    for (const x of [-0.35, 0, 0.35]) g.beginPath(), g.moveTo(x, 0.15), g.lineTo(x, 0.6), g.stroke();
    ell(g, -0.72, -0.1, 0.24, 0.32, 0.4);
    ink(g, skin, lw);
    return;
  }
  for (let i = 0; i < 4; i++) {
    const x = -0.45 + i * 0.3;
    rr(g, x - 0.13, 0.1, 0.26, 0.85 - Math.abs(i - 1.5) * 0.12, 0.13);
    ink(g, skin, lw);
  }
  ell(g, 0, 0, 0.75, 0.55);
  ink(g, radg(g, -0.2, -0.2, 0.05, 0.9, [0, '#ffd9b8'], [1, '#eeb084']), lw);
  ell(g, -0.78, 0.15, 0.22, 0.42, 0.5);
  ink(g, skin, lw);
}
const bigHandSpr = (fist: boolean, px: number) => spr(fist ? 'bh1' : 'bh0', HF, px, (g) => paintBigHand(g, fist));
function drawHandArm(ctx: C2, s: GiantState, sc2: number, X: XF, Y: XF, R: XF) {
  const h = s.hand!, gs = dscale(s.gy), u = R(GH) * gs, ease = (e: number) => e * e * (3 - 2 * e);
  const sx = X(s.gx) + 0.08 * u, sy = Y(s.gy) - 0.38 * u - 0.33 * u;
  const top = { x: X(s.cx), y: Y(castleTop(s)) - R(0.03) }, tg = { x: X(h.x), y: Y(h.y) - R(0.02) };
  let hx: number, hy: number, fist = false;
  if (h.t < HAND_DOWN) {
    const e = ease(h.t / HAND_DOWN), st = { x: (sx + tg.x) / 2, y: Math.min(sy, tg.y) - R(0.18) };
    hx = st.x + (tg.x - st.x) * e;
    hy = st.y + (tg.y - st.y) * e;
  } else {
    const e = ease(Math.min(1, (h.t - HAND_DOWN) / (HAND_POUR - HAND_DOWN - 6)));
    hx = tg.x + (top.x - tg.x) * e;
    hy = tg.y + (top.y - tg.y) * e - Math.sin(Math.PI * e) * R(0.14);
    fist = h.t < HAND_POUR - 6;
  }
  // 팔 (소매 + 손목)
  const cx = (sx + hx) / 2, cy = Math.min(sy, hy) - R(0.12);
  for (const [lw, col] of [[R(0.075) * gs, OUT], [R(0.058) * gs, '#4fb3ae'], [R(0.02) * gs, 'rgba(255,255,255,.25)']] as [number, string][]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(cx, cy, hx, hy);
    ctx.stroke();
  }
  const hu = R(0.072) * gs, iu = R(ITEM_S) * gs * 1.5;
  if (fist && h.items.length) for (let i = 0; i < Math.min(5, h.items.length); i++) put(ctx, itemSpr(h.items[i], IQ(R, sc2) * 1.3), IF, hx + (i - 2) * hu * 0.38, hy - hu * 0.7 - (i % 2) * hu * 0.25, iu);
  put(ctx, bigHandSpr(fist, HQ(R, sc2)), HF, hx, hy, hu);
  if (!fist && h.t >= HAND_POUR - 6)
    for (let i = 0; i < Math.min(6, h.items.length); i++) put(ctx, itemSpr(h.items[i], IQ(R, sc2) * 1.3), IF, hx + (i - 2.5) * hu * 0.32, hy + hu * (0.5 + ((h.t - HAND_POUR + 6) / 6) * 1.4 + (i % 2) * 0.3), iu);
}
/** 거인 (+ 등에 진 성 · 들어 올리는 성) */
function drawGiant(ctx: C2, s: GiantState, w: number, sc2: number, X: XF, Y: XF, R: XF) {
  const t = s.t, gs = dscale(s.gy), u = R(GH) * gs, band = giftBand(s.lv), P = pose(s, juice(s), R);
  const withG = P.carried;
  const gx = X(s.gx), gy = Y(s.gy), hipY = gy - 0.38 * u - P.bob;
  const drawC = () => {
    const cu = R(CW) * P.cs;
    if (P.carried && !P.front && s.gst !== G_DROP && s.gst !== G_LIFT) {
      // 등에 진 성: 거인이 앞으로 숙인 만큼 같이 기운다 (발을 축으로)
      const a = P.lean * (s.gdir < 0 && s.gst === G_WALK ? -1 : 1), dx = X(P.cx) - gx, dy = Y(P.cy) - gy;
      drawCastle(ctx, s, gx + dx * Math.cos(a) - dy * Math.sin(a), gy + dx * Math.sin(a) + dy * Math.cos(a), P.crot + a, P.csy, CQ(R, sc2), cu);
    } else drawCastle(ctx, s, X(P.cx), Y(P.cy), P.crot, P.csy, CQ(R, sc2), cu);
  };
  ctx.fillStyle = 'rgba(40,30,20,.25)';
  ell(ctx, gx, gy, u * 0.24, u * 0.06);
  ctx.fill();
  if (withG && !P.front) drawC();
  ctx.save();
  ctx.translate(gx, 0);
  if (s.gdir < 0 && s.gst === G_WALK) ctx.scale(-1, 1);
  if (P.lean) (ctx.translate(0, gy), ctx.rotate(P.lean), ctx.translate(0, -gy));
  put(ctx, armSpr(true, GQ(R, sc2)), AF, -0.05 * u, hipY - 0.33 * u, u, 1, -P.armB);
  put(ctx, legSpr(true, GQ(R, sc2)), LF, -0.045 * u, hipY, u, 1, -P.legB);
  put(ctx, bodySpr(P.mood, band, GQ(R, sc2)), BFr, 0, hipY, u);
  put(ctx, legSpr(false, GQ(R, sc2)), LF, 0.045 * u, hipY, u, 1, -P.legF);
  if (!s.cdown && s.gst !== G_DROP && s.gst !== G_LIFT) {
    // 멜빵 (성을 진 끈)
    for (const [x0, y0, x1, y1] of [[0.02, -0.37, -0.17, -0.12], [0.11, -0.3, -0.16, -0.02]]) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = Math.max(3, u * 0.04);
      ctx.beginPath();
      ctx.moveTo(x0 * u, hipY + y0 * u);
      ctx.quadraticCurveTo((x0 + x1) * 0.5 * u + 0.05 * u, hipY + (y0 + y1) * 0.5 * u + 0.05 * u, x1 * u, hipY + y1 * u);
      ctx.stroke();
      ctx.strokeStyle = '#a8703a';
      ctx.lineWidth = Math.max(1.5, u * 0.022);
      ctx.stroke();
    }
  }
  if (!P.reach) put(ctx, armSpr(false, GQ(R, sc2)), AF, 0.08 * u, hipY - 0.33 * u, u, 1, -P.armF);
  if (P.horn) {
    const a = -P.armF + Math.PI / 2, hx = 0.08 * u + Math.cos(a) * 0.3 * u, hy = hipY - 0.33 * u + Math.sin(a) * 0.3 * u;
    ctx.beginPath();
    ctx.moveTo(hx - 0.02 * u, hy);
    ctx.quadraticCurveTo(hx + 0.1 * u, hy - 0.05 * u, hx + 0.2 * u, hy - 0.18 * u);
    ctx.lineTo(hx + 0.26 * u, hy - 0.12 * u);
    ctx.quadraticCurveTo(hx + 0.12 * u, hy + 0.02 * u, hx - 0.02 * u, hy + 0.04 * u);
    ctx.closePath();
    ink(ctx, lin(ctx, hx, 0, hx + 0.25 * u, 0, [0, '#ffe08a'], [1, '#d89a20']), 1.5);
    for (let i = 0; i < 2; i++) {
      const f = ((t * 0.04 + i * 0.5) % 1);
      ctx.globalAlpha = 1 - f;
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.max(12, Math.round(R(0.035)))}px system-ui, sans-serif`;
      ctx.fillText('♪', hx + 0.3 * u + f * R(0.05), hy - 0.2 * u - f * R(0.06));
    }
    ctx.globalAlpha = 1;
  }
  if (P.mood === 1 && (t >> 3) % 2) {
    ctx.fillStyle = '#9fdcff';
    ell(ctx, 0.2 * u, hipY - 0.62 * u, u * 0.02, u * 0.03);
    ctx.fill();
  }
  ctx.restore();
  if (withG && P.front) drawC();
  if (withG && s.gst !== G_DROP && s.gst !== G_LIFT) drawWish(ctx, s, w, sc2, X(P.cx), Y(P.cy) - R(castleH(floors(s))) * P.cs, R);
}

// ───────────────────────────── 그리기: 띠 · 결과 · 선물 ─────────────────────────────
/** 글자 띠는 내용이 바뀔 때만 다시 그려 두고, 프레임마다는 그 한 장을 찍는다 */
const BARS = new Map<string, { c: HTMLCanvasElement; key: string }>();
function bar(id: string, w: number, hpx: number, sc: number, key: string, paint: (g: C2) => void): HTMLCanvasElement {
  const slot = `${id}:${Math.round(w)}:${sc}`;
  let b = BARS.get(slot);
  if (!b) BARS.set(slot, (b = { c: document.createElement('canvas'), key: '' }));
  if (b.key !== key) {
    b.key = key;
    const c = b.c, cw = Math.ceil(w * sc), chh = Math.ceil(hpx * sc);
    if (c.width !== cw || c.height !== chh) (c.width = cw), (c.height = chh);
    const g = c.getContext('2d')!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cw, chh);
    g.setTransform(sc, 0, 0, sc, 0, 0);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.textBaseline = 'middle';
    paint(g);
  }
  return b.c;
}
const CARD_T = 54;
/** 첫 판 안내용: 성 둘레에서 가장 덩어리진 곳 (성 톡 자리는 피함) */
function hintScoop(s: GiantState): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null, bv = 0;
  const top = castleTop(s), ds = dscale(s.cy);
  for (const c of s.objs) {
    if (c.dead || Math.abs(c.x - s.cx) > workR(s) - 0.02 || (Math.abs(c.x - s.cx) < 0.15 * ds && c.y > top - 0.06 && c.y < s.cy + 0.04)) continue;
    const v = scoopables(s, c.x, c.y).reduce((a, o) => a + (o.amt || 1), 0) + (c.x > s.cx + 0.12 ? 2 : 0);
    if (v > bv) (bv = v), (best = { x: c.x, y: c.y });
  }
  return best;
}
const STAR_WORDS = (s: GiantState) => ['새 땅까지 가기', '폭풍에 아무도 안 날리기', starWord(STAGES[s.stage].star)];
function drawHud(ctx: C2, s: GiantState, w: number, h: number, sc2: number) {
  const t = s.t, d = STAGES[s.stage], R = (r: number) => r * w, Y = (y: number) => y * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  const text = (str: string, x: number, y: number, fill: string, stroke = '', lw = 0) => {
    ctx.lineJoin = 'round';
    if (lw > 0) (ctx.lineWidth = lw), (ctx.strokeStyle = stroke), ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  };
  ctx.textBaseline = 'middle';
  const sc = devScale(ctx);
  const mapSpan = s.goalX + 0.1, mx = (x: number) => R(0.05 + 0.88 * clamp(x / mapSpan, 0, 1)), my = Y(0.137);
  // ── 위 띠 + 지도 바탕: 내용이 바뀔 때만 다시 그려 둔다 ──
  const done = s.zones.map((z, zi) => (z.k === 'goal' || z.k === 'plain' || !s.objs.some((o) => o.zone === zi && !o.dead && (o.amt > 0 || o.k === 'mon' || o.k === 'folk')) ? 1 : 0)).join('');
  ctx.drawImage(bar('top', w, Y(0.17), sc, `${s.stage}|${s.hearts}|${s.stars}|${s.lv}|${done}|${s.seed}|${s.goalX}`, (c) => {
    const fontC = (sz: number, wgt = 800) => (c.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
    const textC = (str: string, x: number, y: number, fill: string, stroke = '', lw = 0) => {
      if (lw > 0) (c.lineWidth = lw), (c.strokeStyle = stroke), c.strokeText(str, x, y);
      c.fillStyle = fill;
      c.fillText(str, x, y);
    };
    // ── 위 띠: 판 · 이름 · 하트 · 별 · 거인 레벨 ──
    c.fillStyle = CREAM;
    c.fillRect(0, 0, w, Y(0.1));
    ell(c, R(0.062), Y(0.05), R(0.036), R(0.036));
    c.fillStyle = '#ff8a3d';
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 2;
    c.stroke();
    c.textAlign = 'center';
    fontC(0.046, 900);
    textC(String(s.stage + 1), R(0.062), Y(0.052), '#ffffff');
    c.textAlign = 'left';
    fontC(0.042, 900);
    textC(d.name, R(0.115), Y(0.052), INK);
    for (let i = 0; i < 3; i++) {
      heartPath(c, R(0.6 + i * 0.048), Y(0.05), R(0.016));
      c.fillStyle = i < s.hearts ? '#ff4d5e' : '#e6d6bc';
      c.fill();
      c.strokeStyle = INK;
      c.lineWidth = 1.5;
      c.stroke();
    }
    starPath(c, R(0.76), Y(0.049), R(0.021));
    c.fillStyle = '#ffc93c';
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 1.5;
    c.stroke();
    fontC(0.038, 900);
    textC(String(s.stars), R(0.787), Y(0.053), INK);
    put(c, bodySpr(3, giftBand(s.lv), R(0.13) * sc), BFr, R(0.875), Y(0.105), R(0.13));
    fontC(0.034, 900);
    textC(`Lv${s.lv}`, R(0.905), Y(0.053), '#2f7f7c');
    // ── 지도 띠: 지나갈 땅 · 거인 · 폭풍 · 새 땅 ──
    c.fillStyle = '#f4e4bc';
    c.fillRect(0, Y(0.1), w, Y(0.068));
    c.fillStyle = '#e0c48c';
    c.fillRect(0, Y(0.1), w, 2);
    c.fillRect(0, Y(0.168) - 2, w, 2);
    c.strokeStyle = 'rgba(120,80,40,.5)';
    c.lineWidth = 2;
    c.setLineDash([4, 4]);
    c.beginPath();
    c.moveTo(mx(0), my);
    c.lineTo(mx(s.goalX), my);
    c.stroke();
    c.setLineDash([]);
    s.zones.forEach((z, zi) => {
      if (z.k === 'goal' || z.k === 'plain') return;
      const zd = done[zi] === '1';
      rr(c, mx(z.x0), my - R(0.009), Math.max(3, mx(z.x1) - mx(z.x0)), R(0.018), R(0.009));
      c.fillStyle = zd ? '#d8c8a0' : ZCOL[z.k] ?? '#999';
      c.fill();
      if (z.k === 'lair') {
        const b = s.objs.find((o) => o.zone === zi && o.k === 'mon' && !o.dead);
        if (b) put(c, monSpr(b.mk!, 0, R(0.011) * sc), MF, (mx(z.x0) + mx(z.x1)) / 2, my + R(0.012), R(0.011));
      }
    });

  }), 0, 0, w, Y(0.17));
  // 보이는 화면
  rr(ctx, mx(s.cam), Y(0.106), Math.max(6, mx(s.cam + 1) - mx(s.cam)), Y(0.056), 4);
  ctx.strokeStyle = 'rgba(75,48,32,.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // 새 땅 깃발
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(mx(s.goalX), my + R(0.012));
  ctx.lineTo(mx(s.goalX), my - R(0.026));
  ctx.stroke();
  ctx.fillStyle = '#ff5a4e';
  ctx.beginPath();
  ctx.moveTo(mx(s.goalX), my - R(0.026));
  ctx.lineTo(mx(s.goalX) + R(0.028), my - R(0.018));
  ctx.lineTo(mx(s.goalX), my - R(0.009));
  ctx.closePath();
  ctx.fill();
  // 폭풍
  if (s.sx > -0.3) {
    const sx = Math.max(R(0.03), mx(Math.max(0, s.sx)));
    ctx.fillStyle = s.awake ? '#474a66' : '#8a8ea8';
    for (const [dx, dy, r] of [[-0.02, 0, 0.014], [-0.005, -0.008, 0.016], [0.01, 0, 0.012]]) ell(ctx, sx + R(dx), my + R(dy), R(r), R(r * 0.8)), ctx.fill();
    if (s.awake && (t >> 4) % 2) {
      ctx.strokeStyle = '#fff36b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, my + R(0.006));
      ctx.lineTo(sx - R(0.006), my + R(0.018));
      ctx.lineTo(sx + R(0.004), my + R(0.018));
      ctx.lineTo(sx - R(0.002), my + R(0.03));
      ctx.stroke();
    }
  }
  // 거인 (머리)
  {
    const gxm = mx(s.cdown ? s.cx : s.gx);
    put(ctx, bodySpr(0, giftBand(s.lv), R(0.075) * sc2), BFr, gxm, my + R(0.066), R(0.075));
  }

  // ── 아래 띠: 별 셋 · 도움말 · 성 · 식구 (내용이 바뀔 때만 다시 그린다) ──
  const res = s.phase === 'result', [pv, pn] = starProg(s);
  const dropsOver = (d.star[0] === 'drops' && s.drops > d.star[1]) || (d.star[0] === 'boss' && s.boss0 >= 0 && s.star3At < 0 && (s.bossKO >= 0 ? s.bossKO : s.t) - s.boss0 > d.star[1] * 60);
  const state = [res ? 1 : 0, s.lost > 0 || s.hits > 0 ? -1 : res ? 1 : 0, s.star3At >= 0 || (res && s.starOk[2]) ? 1 : res || dropsOver ? -1 : 0];
  const timer = d.star[0] === 'boss' && state[2] === 0 && s.boss0 >= 0 && s.bossKO < 0 && !res;
  const words = STAR_WORDS(s), labels = words.map((q, i) => q + (i === 2 && state[2] === 0 && pv > 0 && d.star[0] !== 'boss' ? ` ${pv}/${pn}` : ''));
  const b = bossOf(s), idle = s.cdown && s.gst === G_DOWN && s.pourQ === 0 && s.people.every((p) => p.st === P_IN || p.st === P_IDLE);
  let tip = `${d.name}: ${d.news}`;
  if (s.phase === 'pick') tip = '세상 속 큰 물건 둘 중 하나를 톡!';
  else if (s.phase === 'result') tip = s.got === 3 ? '별 셋! 판 점수가 네 배' : '별이 많을수록 판 점수가 곱해져요';
  else if (s.phase === 'end') tip = s.won ? '모든 땅을 지나 새 나라에 닿았어요!' : '누르면 다시 해요';
  else if (s.arrive > 0) tip = '새 땅에 쿵! 다들 신났어요';
  else if (s.stage === 0 && s.drops === 0) tip = '숲을 톡! 거인이 성을 쿵 내려놓아요';
  else if (s.stage === 0 && s.drops === 1 && s.gst === G_DOWN && s.scoops < 2) tip = '점선 안 덩어리를 톡 — 거인 손으로 한 움큼!';
  else if (s.stage === 0 && s.drops === 1 && s.gst === G_DOWN) tip = '점선 밖 땅을 톡 — 나팔 불고 성을 메고 가요';
  else if (s.awake && s.cdown && s.sx > s.cx - 0.45) tip = '폭풍이 와요! 앞 땅을 톡 — 성을 메고 떠나요';
  else if (idle) tip = '여긴 다 썼어요 — 다음 땅을 톡!';
  else if (b && b.x < s.cam + 1.1) tip = `${MD[b.mk!].name}에게 성을 쿵! 성이 클수록 세요`;
  else if (s.goalX < s.cam + 1.05) tip = '오른쪽 끝 깃발 언덕을 톡 — 새 땅에 쿵!';
  const perks = PERKS.map((p, i) => (s.perk[i] ? p[s.perk[i] - 1].name : '')).filter(Boolean);
  const status = `성 ${floors(s)}층 · 식구 ${pop(s)}명 · 거인 Lv${s.lv}${perks.length ? ' · ' + perks.join(' · ') : ''}`;
  // 세 줄을 따로 굽는다 — 식구 수 · 별 진행이 바뀌어도 그 줄만 다시
  const strip = (id: string, y0: number, y1: number, key: string, paint: (c: C2, oy: number) => void) => {
    const p0 = Math.round(Y(y0)), p1 = y1 >= 1.5 ? Math.ceil(h) : Math.round(Y(y1));
    ctx.drawImage(bar(id, w, p1 - p0, sc, key, (c) => ((c.fillStyle = CREAM), c.fillRect(0, 0, w, p1 - p0), paint(c, -p0))), 0, p0, w, p1 - p0);
  };
  const fontC = (c: C2, sz: number, wgt = 800) => (c.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  const textC = (c: C2, str: string, x: number, y: number, fill: string) => ((c.fillStyle = fill), c.fillText(str, x, y));
  strip('bot0', BOT, 1.373, `${labels.join('|')}|${state.join('')}`, (c, oy) => {
    c.fillStyle = '#e3c48c';
    c.fillRect(0, 0, w, 2);
    fontC(c, 0.033, 800);
    const gap = R(0.012), pad = Math.min(R(0.065), (w - R(0.03) - gap * 2 - labels.reduce((a, q) => a + c.measureText(q).width, 0)) / 3);
    const ws = labels.map((q) => c.measureText(q).width + pad), total = ws.reduce((a, q) => a + q, 0) + gap * 2;
    let cx = (w - total) / 2;
    labels.forEach((q, i) => {
      const cw = ws[i], cy = Y(1.345) + oy, on = state[i] > 0, off = state[i] < 0;
      rr(c, cx, cy - R(0.026), cw, R(0.052), R(0.026));
      c.fillStyle = on ? '#ffe9a0' : off ? '#efe4cf' : '#ffffff';
      c.fill();
      c.strokeStyle = on ? '#e0a020' : off ? '#d6c6a8' : '#c9a878';
      c.lineWidth = on ? 2 : 1.4;
      c.stroke();
      starPath(c, cx + pad * 0.42, cy - 0.5, R(0.016));
      c.fillStyle = on ? '#ffb800' : off ? '#d6c6a8' : '#e9d9b8';
      c.fill();
      c.textAlign = 'left';
      textC(c, q, cx + pad * 0.76, cy + 0.5, off ? '#b8a688' : INK);
      if (off) (c.fillStyle = '#b8a688'), c.fillRect(cx + pad * 0.72, cy, cw - pad, 1.5);
      if (i === 2) PILL2.splice(0, 3, cx, cw, pad);
      cx += cw + gap;
    });
  });
  if (timer) {
    // 대장 초읽기: 띠를 다시 굽지 않고 알약 아래에 줄어드는 막대만
    const [px, pw, pd] = PILL2, f = clamp(1 - (s.t - s.boss0) / (d.star[1] * 60), 0, 1), by = Y(1.345) + R(0.017);
    ctx.fillStyle = 'rgba(201,168,120,.35)';
    ctx.fillRect(px + pd * 0.72, by, pw - pd, R(0.005));
    ctx.fillStyle = f < 0.3 ? '#e8590c' : '#e0a020';
    ctx.fillRect(px + pd * 0.72, by, (pw - pd) * f, R(0.005));
  }
  strip('bot1', 1.373, 1.423, tip, (c, oy) => {
    c.textAlign = 'center';
    fontC(c, 0.034, 800);
    textC(c, tip, w / 2, Y(1.398) + oy, INK);
  });
  strip('bot2', 1.423, 1.5, status, (c, oy) => {
    c.textAlign = 'center';
    fontC(c, 0.032, 700);
    textC(c, status, w / 2, Y(1.448) + oy, MUTED);
  });
  // ── 판 시작 띠 (NEW 한 줄) ──
  if (s.banner && s.phase === 'play' && !(s.big && s.big.t >= s.banner.t)) {
    const age = t - s.banner.t, T = 200;
    if (age < T) {
      const a = Math.min(1, age / 10, (T - age) / 14), slide = (1 - Math.min(1, age / 10)) * R(0.05), by = Y(0.182) - slide;
      ctx.globalAlpha = clamp(a, 0, 1);
      rr(ctx, R(0.04), by, R(0.92), R(0.11), R(0.03));
      ctx.fillStyle = 'rgba(255,250,235,.96)';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      const nw = d.newZ ? ZD[d.newZ].name : d.newP ? PD[d.newP].name : d.boss ? MD[d.boss].name : '';
      font(0.038, 900);
      const hw = ctx.measureText(s.banner.head).width, nw2 = ctx.measureText(nw).width, pill = nw ? R(0.1) : 0, gap2 = R(0.014), tot = hw + (nw ? gap2 + pill + gap2 + nw2 : 0);
      let bx0 = w / 2 - tot / 2;
      ctx.textAlign = 'left';
      text(s.banner.head, bx0, by + R(0.033), '#d9480f');
      if (nw) {
        bx0 += hw + gap2;
        rr(ctx, bx0, by + R(0.013), pill, R(0.04), R(0.02));
        ctx.fillStyle = d.boss ? '#7a3ad8' : '#ff3b30';
        ctx.fill();
        font(0.032, 900);
        ctx.textAlign = 'center';
        text(d.boss ? '대장' : 'NEW', bx0 + pill / 2, by + R(0.034), '#ffffff');
        ctx.textAlign = 'left';
        font(0.038, 900);
        text(nw, bx0 + pill + gap2, by + R(0.033), INK);
      }
      ctx.textAlign = 'center';
      font(0.034, 800);
      text(s.banner.sub, w / 2, by + R(0.08), INK);
      ctx.globalAlpha = 1;
    }
  }
  // ── 손가락 (첫 판 첫 톡) ──
  if (s.phase === 'play' && s.stage === 0 && s.drops === 0 && s.gst === G_STAND) {
    const z = s.zones[0], zx = ((z.x0 + z.x1) / 2 - s.cam) * w, press = Math.max(0, Math.sin(t * 0.14)), hy = Y(FEET + 0.04);
    ell(ctx, zx, Y(FEET), R(0.1 + 0.02 * press), R(0.05 + 0.01 * press));
    ctx.strokeStyle = `rgba(255,255,255,${0.95 - 0.5 * press})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    drawHand(ctx, zx + R(0.03), hy, R(0.085), press);
    font(0.046, 900);
    text('톡!', zx + R(0.11), hy - R(0.03), '#ffffff', INK, 4);
  }
  // ── 손가락: 첫 판 처음 성을 내려놓은 뒤 — 덩어리를 톡하면 거인 손으로 한 움큼 ──
  if (s.phase === 'play' && s.stage === 0 && s.cdown && s.gst === G_DOWN && s.scoops === 0 && s.gt > 70 && s.pourQ === 0 && !s.arrive) {
    const sp = hintScoop(s);
    if (sp) {
      const zx = (sp.x - s.cam) * w, zy = Y(sp.y), press = Math.max(0, Math.sin(t * 0.14));
      ell(ctx, zx, zy, R(SCOOP_R + 0.01 * press), R(SCOOP_R * 0.7));
      ctx.strokeStyle = `rgba(255,255,255,${0.95 - 0.5 * press})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      drawHand(ctx, zx + R(0.02), zy + R(0.03), R(0.085), press);
      font(0.04, 900);
      text('톡! 손으로 한 움큼', clamp(zx, R(0.24), w - R(0.24)), zy + R(0.12), '#ffffff', INK, 4);
    }
  }
  // ── 큰 이름표 카드 (별 셋째 · 새 부품 처음 · 대장만, 0.9초) ──
  if (s.big && s.big.pic && t - s.big.t < CARD_T && s.phase === 'play') {
    const age = t - s.big.t, open = age < 6 ? (age / 6) * 1.08 : age < 9 ? 1.08 - 0.08 * ((age - 6) / 3) : 1, f = age > CARD_T - 8 ? (age - CARD_T + 8) / 8 : 0;
    const cw = R(0.86), chh = R(0.17), pic = -cw / 2 + chh * 0.55;
    ctx.save();
    ctx.translate(w / 2, Y(0.33));
    ctx.scale(1 - f * 0.08, Math.max(0.02, open * (1 - f * f)));
    rr(ctx, -cw / 2, -chh / 2 + R(0.008), cw, chh, R(0.035));
    ctx.fillStyle = 'rgba(74,44,29,.22)';
    ctx.fill();
    rr(ctx, -cw / 2, -chh / 2, cw, chh, R(0.035));
    ctx.fillStyle = lin(ctx, 0, -chh / 2, 0, chh / 2, [0, '#ffffff'], [1, '#fff1c9']);
    ctx.fill();
    ctx.strokeStyle = s.big.pic === 'star' ? '#e0a020' : s.big.pic.startsWith('m:') ? '#7a3ad8' : '#f08c00';
    ctx.lineWidth = Math.max(3, R(0.008));
    ctx.stroke();
    ell(ctx, pic, 0, chh * 0.42, chh * 0.42);
    ctx.fillStyle = s.big.pic.startsWith('m:') ? '#efe4ff' : '#dff4ff';
    ctx.fill();
    if (s.big.pic === 'star') {
      starPath(ctx, pic, 0, chh * 0.32);
      ink(ctx, '#ffc93c', 2, '#a06a12');
    } else if (s.big.pic.startsWith('p:')) put(ctx, ghostSpr(s.big.pic.slice(2) as PK, GHQ(R, sc2)), ghostFr, pic, chh * 0.12, R(0.12));
    else {
      const mk = s.big.pic.slice(2) as MK;
      put(ctx, monSpr(mk, 0, R(MD[mk].r) * DMAX * sc2), MF, pic, chh * 0.36, R(0.035));
    }
    const tx = pic + chh * 0.55;
    ctx.textAlign = 'left';
    font(0.056, 900);
    text(s.big.text, tx, -R(0.025), '#d9480f', '#ffffff', 5);
    const sub = s.big.star ? (s.big.text === '별 셋째!' ? starWord(d.star) : `★ 별 셋째! ${starWord(d.star)}`) : s.big.sub ?? '';
    font(0.034, 800);
    text(sub, tx, R(0.035), INK);
    ctx.restore();
    ctx.textAlign = 'center';
  }
  if (s.phase === 'result') drawResult(ctx, s, w, sc2);
  else if (s.phase === 'pick') drawPick(ctx, s, w, sc2);
  else if (s.phase === 'end') {
    const a = Math.min(1, s.pt / 14);
    ctx.globalAlpha = a;
    rr(ctx, R(0.08), Y(0.36), R(0.84), R(0.56), R(0.04));
    ctx.fillStyle = '#fffaf0';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    put(ctx, bodySpr(s.won ? 3 : 5, giftBand(s.lv), R(0.3) * sc2), BFr, w / 2, Y(0.62), R(0.3));
    font(0.05, 900);
    text(s.won ? '새 나라에 닿았다!' : '거인이 지쳤어요…', w / 2, Y(0.68), '#d9480f');
    font(0.038, 800);
    text(`${s.won ? STAGES.length : s.stage + 1}판 · 별 ${s.stars}/${STAGES.length * 3} · 성 ${floors(s)}층 · 식구 ${pop(s)}명`, w / 2, Y(0.745), INK);
    font(0.06, 900);
    text(`${fmt(s.pts + s.sp)}점`, w / 2, Y(0.82), INK);
    font(0.034, 700);
    text(s.won ? `거인 Lv${s.lv} — 가장 큰 성을 진 거인!` : '다시 하면 더 멀리 갈 수 있어요', w / 2, Y(0.88), MUTED);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'center';
}
/** 판 결과: 별 · 점수 · 거인 레벨 · 성 · 세계 지도 · 도감 */
function drawResult(ctx: C2, s: GiantState, w: number, sc2: number) {
  const t = s.t, d = STAGES[s.stage], fx = juice(s), R = (r: number) => r * w, Y = (y: number) => y * w, pt = s.pt;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  const text = (str: string, x: number, y: number, fill: string, stroke = '', lw = 0) => {
    if (lw > 0) (ctx.lineWidth = lw), (ctx.strokeStyle = stroke), ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  };
  const a = Math.min(1, pt / 10), slide = (1 - a) * R(0.06), cx0 = R(0.05), cy0 = Y(0.185) - slide, cw = R(0.9), chh = R(0.98);
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
  rr(ctx, R(0.2), cy0 - R(0.012), R(0.6), R(0.07), R(0.02));
  ctx.fillStyle = '#ff8a3d';
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  font(0.046, 900);
  text(s.won ? '모든 땅을 지났다!' : `${s.stage + 1}판 깼다!`, w / 2, cy0 + R(0.025), '#ffffff');
  // 별 셋
  for (let i = 0; i < 3; i++) {
    const at = 12 + i * 12, sx0 = R(0.22 + i * 0.28), sy0 = cy0 + R(0.12), on = s.starOk[i] && pt >= at, pop2 = on ? 1 + Math.max(0, 1 - (pt - at) / 8) * 0.6 : 1;
    starPath(ctx, sx0, sy0, R(0.048) * pop2);
    ctx.fillStyle = on ? '#ffc93c' : '#eadfc8';
    ctx.fill();
    ctx.strokeStyle = on ? '#a06a12' : '#cdbd9c';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (on && (fx.memo['st' + i] ?? -1) !== s.stage) (fx.memo['st' + i] = s.stage), fx.sound('ding', 1 + i * 0.18, 0.9), fx.burst(sx0, sy0, '#ffd84a', 10, 3, 2.4);
    font(0.032, 800);
    const lab = STAR_WORDS(s)[i], cut = ctx.measureText(lab).width > R(0.27) ? lab.indexOf(' ', Math.floor(lab.length / 2) - 2) : -1;
    const col = s.starOk[i] ? INK : '#b8a688';
    if (cut > 0) text(lab.slice(0, cut), sx0, sy0 + R(0.062), col), text(lab.slice(cut + 1), sx0, sy0 + R(0.094), col);
    else text(lab, sx0, sy0 + R(0.074), col);
  }
  // 점수
  rr(ctx, R(0.12), cy0 + R(0.235), R(0.76), R(0.056), R(0.02));
  ctx.fillStyle = '#fff0cc';
  ctx.fill();
  font(0.042, 900);
  text(`+${fmt(s.gain)}점`, R(0.34), cy0 + R(0.264), '#d9480f');
  font(0.032, 800);
  text(`별 ${s.got}개 = 판 점수 ×${STAR_MUL[s.got]}`, R(0.66), cy0 + R(0.265), INK);
  // 거인 · 성
  put(ctx, bodySpr(3, giftBand(s.lv), R(0.11) * sc2), BFr, R(0.16), cy0 + R(0.385), R(0.11));
  ctx.textAlign = 'left';
  font(0.036, 900);
  text(`거인 Lv${s.lv - 1} → Lv${s.lv}`, R(0.22), cy0 + R(0.335), '#2f7f7c');
  font(0.032, 700);
  text(LV_GIFT[s.lv] ?? '보폭이 넓어지고 쿵이 커져요', R(0.22), cy0 + R(0.372), LV_GIFT[s.lv] ? '#d9480f' : INK);
  text(`성 ${floors(s)}층 · 식구 ${pop(s)}명`, R(0.22), cy0 + R(0.408), INK);
  drawCastle(ctx, s, R(0.86), cy0 + R(0.445), 0, 1, CQ(R, sc2), Math.min(R(0.2), R(0.14) / Math.max(0.5, castleH(floors(s)) / CW)));
  // 세계 지도: 장 셋 × 판 넷 — 지나온 길
  ctx.textAlign = 'left';
  font(0.032, 800);
  text('세계 지도', R(0.1), cy0 + R(0.47), MUTED);
  for (let c = 0; c < 3; c++) {
    const ry = cy0 + R(0.515 + c * 0.06);
    font(0.03, 800);
    ctx.textAlign = 'left';
    text(CHAPTERS[c], R(0.1), ry, c <= d.ch ? INK : '#c8b898');
    for (let i = 0; i < 4; i++) {
      const k = c * 4 + i, px = R(0.43 + i * 0.12), done = k < s.route.length, cur = k === s.stage;
      if (i < 3) (ctx.strokeStyle = done ? '#e0a020' : '#ddd0b0'), (ctx.lineWidth = 2), ctx.setLineDash([3, 3]), ctx.beginPath(), ctx.moveTo(px + R(0.02), ry), ctx.lineTo(px + R(0.1), ry), ctx.stroke(), ctx.setLineDash([]);
      ell(ctx, px, ry, R(0.018), R(0.018));
      ctx.fillStyle = cur ? '#ff8a3d' : done ? '#ffe9a0' : '#f1e8d4';
      ctx.fill();
      ctx.strokeStyle = cur ? '#d9480f' : '#c9a878';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (STAGES[k].boss) (ctx.fillStyle = '#7a3ad8'), starPath(ctx, px, ry - R(0.026), R(0.008), 0.5), ctx.fill();
      if (done) {
        ctx.textAlign = 'center';
        font(0.03, 900);
        text(String(s.route[k]), px, ry + 0.5, '#a06a12');
      }
    }
  }
  // 도감: 성 부품 9 · 사람 직업 8 (새로 얻은 것은 반짝)
  ctx.textAlign = 'left';
  font(0.032, 800);
  text(`도감 ${s.dexP.length + s.dexJ.length}/${PART_DEX.length + JOB_DEX.length}`, R(0.1), cy0 + R(0.715), MUTED);
  PART_DEX.forEach((k, i) => {
    const px = R(0.12 + i * 0.087), py = cy0 + R(0.775), has = s.dexP.includes(k), isNew = s.newDex.includes('p:' + k);
    if (isNew) (ell(ctx, px, py - R(0.008), R(0.038), R(0.032)), (ctx.fillStyle = '#ffe9a0'), ctx.fill());
    if (has) put(ctx, ghostSpr(k, GHQ(R, sc2)), ghostFr, px, py + R(0.008), R(0.075));
    else (ell(ctx, px, py - R(0.008), R(0.025), R(0.02)), (ctx.fillStyle = '#efe6d2'), ctx.fill(), (ctx.textAlign = 'center'), font(0.03, 900), text('?', px, py - R(0.006), '#c8b898'));
  });
  JOB_DEX.forEach((k, i) => {
    const px = R(0.14 + i * 0.096), py = cy0 + R(0.87), has = s.dexJ.includes(k), isNew = s.newDex.includes('j:' + k);
    if (isNew) (ell(ctx, px, py - R(0.022), R(0.03), R(0.035)), (ctx.fillStyle = '#ffe9a0'), ctx.fill());
    if (has) put(ctx, personSpr(k, 4, i % 3, PQ(R, sc2)), PF, px, py, R(0.05) + (isNew ? Math.abs(Math.sin(t * 0.2 + i)) * R(0.004) : 0));
    else (ell(ctx, px, py - R(0.022), R(0.02), R(0.024)), (ctx.fillStyle = '#efe6d2'), ctx.fill(), (ctx.textAlign = 'center'), font(0.03, 900), text('?', px, py - R(0.02), '#c8b898'));
  });
  ctx.textAlign = 'center';
  font(0.036, 900);
  const nx = STAGES[s.stage + 1];
  if (pt >= RES_MIN) text(s.won ? '톡!' : d.boss && d.ch < PERKS.length ? '톡 하면 장 끝 선물!' : '톡 하면 다음 땅으로', w / 2, cy0 + chh - R(0.032), (t >> 3) % 2 ? '#d9480f' : '#ff8a3d');
  else if (nx) text(nx.newZ ? `다음 판: 새 땅 ${ZD[nx.newZ].name}` : nx.boss ? `다음 판: 대장 ${MD[nx.boss].name}` : `다음 판: ${nx.name}`, w / 2, cy0 + chh - R(0.032), MUTED);
  ctx.globalAlpha = 1;
}
/** 장 끝: 세상 속 큰 물건 둘 중 하나 */
function drawPick(ctx: C2, s: GiantState, w: number, sc2: number) {
  const t = s.t, d = STAGES[s.stage], R = (r: number) => r * w, Y = (y: number) => y * w, pt = s.pt, picked = s.picked, opts = PERKS[d.ch];
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  const text = (str: string, x: number, y: number, fill: string) => ((ctx.fillStyle = fill), ctx.fillText(str, x, y));
  ctx.fillStyle = 'rgba(40,30,20,.35)';
  ctx.fillRect(0, Y(0.17), w, Y(1.13));
  rr(ctx, R(0.06), Y(0.2), R(0.88), R(0.12), R(0.03));
  ctx.fillStyle = 'rgba(255,250,235,.97)';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  font(0.042, 900);
  text(`${CHAPTERS[d.ch]} 끝! 선물 하나`, w / 2, Y(0.238), '#d9480f');
  font(0.034, 800);
  text(picked < 0 ? '세상 속 큰 물건 둘 중 하나를 톡!' : `${opts[picked].name}: ${opts[picked].line}`, w / 2, Y(0.285), INK);
  opts.forEach((o, i) => {
    const px = R(i ? 0.72 : 0.28), drop = picked < 0 ? Math.max(0, 1 - pt / 16) : 0, py = Y(0.92) - drop * drop * R(0.5);
    const chosen = picked === i, other = picked >= 0 && !chosen, k = R(0.16) * (chosen ? 1 + 0.15 * Math.sin(Math.min(1, pt / 12) * Math.PI) : 1);
    ctx.globalAlpha = other ? Math.max(0, 1 - pt / 20) : 1;
    ctx.fillStyle = 'rgba(50,35,10,.25)';
    ell(ctx, px, Y(0.925), R(0.15), R(0.035));
    ctx.fill();
    if (picked < 0 && pt >= PICK_MIN) {
      ell(ctx, px, Y(0.925), R(0.18 + 0.012 * Math.sin(t * 0.2)), R(0.05));
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 6]);
      ctx.lineDashOffset = -t * 0.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    put(ctx, perkSpr(d.ch, i, R(0.16) * 1.15 * sc2), KF, px, py, k);
    rr(ctx, px - R(0.21), Y(0.97), R(0.42), R(0.11), R(0.025));
    ctx.fillStyle = chosen ? '#ffe9a0' : 'rgba(255,250,235,.97)';
    ctx.fill();
    ctx.strokeStyle = chosen ? '#e0a020' : INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    font(0.04, 900);
    text(o.name, px, Y(1.005), '#d9480f');
    font(0.03, 800);
    text(o.line, px, Y(1.05), INK);
    ctx.globalAlpha = 1;
  });
}
/** 스크린샷용: 첫 판 손 안내 자리 */
export const __hintScoop = (s: GiantState) => hintScoop(s);
/** 스크린샷·모음 그림용 (게임에서는 쓰지 않는다) */
export const __art = { personSpr, monSpr, perkSpr };
