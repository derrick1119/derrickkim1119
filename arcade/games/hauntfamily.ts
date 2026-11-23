/**
 * 👻 이사 온 가족 쫓아내기 (43라운드: 오너가 메뉴에서 고른 셋 중 하나) — 겁주기 연쇄 × 도감.
 * 약속(메뉴 문구 그대로): 내 집에 이사 온 시끄러운 가족을 꼬마 유령이 쫓아내요 — 물건을 톡 하면 덜컹! 아빠가 비명 지르며 넘어지고,
 *   그 소리에 강아지가 짖고, 할머니 틀니가 날아가는 겁주기 연쇄. 첫 톡에 액자가 덜컹 떨어지고, 아빠가 펄쩍 뛰어 우유를 쏟아요.
 * 무대: 옆에서 자른 집(인형의 집) 한 화면 — 방 4~6개, 아늑한 밤 조명. 가족은 저절로 산다(요리·TV·목욕·숙제·낮잠·상자 풀기).
 * 조작은 톡 하나: 톡한 곳에서 가장 가까운 물건(둘레 화면 폭 16%, 쉬는 물건이면 가까운 다른 물건)으로 유령이 휙 — 그 물건에 장난.
 *   물건마다 1초 남짓 쉼. 유령은 장난 하나에 0.6초쯤 걸린다(그 사이 톡은 기억해 뒀다가 바로).
 * 겁 = 사람마다 다름: 머리 위 말풍선 그림(큰 소리·거미·어둠·물·노래하는 인형). 맞는 장난이면 크게 놀라고, 아니어도 조금은 놀란다.
 *   어떤 장난이든 옆방까지 '덜컹' 소리가 새서 누군가는 놀란다(정답 없음).
 * 겁주기 연쇄(핵심): 크게 놀란 사람은 비명 → 비명은 옆방(옆·위·아래)으로 번져 '큰 소리'를 무서워하는 사람이 또 크게 놀람
 *   → 손에 든 것(우유·접시·책)을 쏟으면 와장창(큰 소리 한 번 더) → 큰 소리가 닿은 강아지는 멍멍(옆방까지) → …
 *   연쇄가 길수록 한 사람이 받는 겁이 커지고(칸마다 +15%), 숫자·소리·흔들림이 커진다.
 * 웃긴 반응이 재미의 절반: 펄쩍 · 우유 쏟기 · 틀니 날아감 · 가발 날아감 · 젖은 바닥에 미끄러짐 · 깜깜한 데서 쿵 · 이불 뒤집어쓰기
 *   · 욕조에서 풍덩 · 기절 · 이삿짐 우다다. 겁 막대(말풍선 둘레 고리)가 차면 가방을 싸서 현관으로 우다다 → 집 밖 차에 탄다. 모두 타면 판 깨기.
 * 지는 법: 가족이 놀라지 않고 쉬는 동안 이삿짐 상자를 하나씩 푼다 — 상자가 다 풀리면 '우리 집이다!' 눌러앉아 하트 -1, 그 판만 다시.
 *   상자는 첫 톡 뒤부터 풀린다(손 안 대면 아무 일 없음). 1판은 상자가 다 풀리지 않는다. 놀란 사람은 몇 초 동안 상자를 못 푼다.
 * 판 12개(장 3 × 4판, 장 끝은 큰 판): 이층집(덜컹 액자 → 불 끄기 → 수도꼭지 → 집들이 파티 손님 열 명)
 *   → 삼층 타운하우스(노래하는 인형 → 겁 없는 꼬마 → 퇴마사 할머니 → 할로윈 밤 호박등)
 *   → 언덕 위 저택(거울에 얼굴 → 책 날리기 → 라디오 목소리 → 유튜버 가족 카메라). 판마다 새 가족이 이사 온다.
 * 성장: 판을 깨면 유령 레벨 +1(겁 세기·물건 쉼 짧아짐·모습: 나비넥타이 → 고깔 → 망토 → 왕관) · 장 끝에 집의 큰 물건 둘 중 하나를 톡
 *   (낡은 괘종시계 / 저주받은 인형 · 검은 고양이 / 으스스 안개) · 도감 = 겁주기 반응 12가지와 쫓아낸 가족 12집.
 * 별(쉬운 말 셋): 가족 쫓아내기 · 상자 반 남기기(퇴마사 판은 소금 안 맞기, 유튜버 판은 카메라에 안 찍히기) · 판마다 솜씨(한 번에 N명 비명 등).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5, TAU = Math.PI * 2;
/** 겁: 0 큰 소리 · 1 거미 · 2 어둠 · 3 물 · 4 노래하는 인형 */
export type Fear = 0 | 1 | 2 | 3 | 4;
const LOUD: Fear = 0, SPIDER: Fear = 1, DARK: Fear = 2, WATER: Fear = 3, DOLL: Fear = 4;
export const FEAR_NAME = ['큰 소리', '거미', '어둠', '물', '노래하는 인형'];
/** 겁 세기: 맞는 장난 · 비명(큰 소리)이 맞음 · 안 맞는 장난 · 옆방으로 샌 소리. 연쇄 한 칸마다 +DEPTH_UP */
const BIG = 21, BIG_SCREAM = 18, SMALL = 3, LEAK = 1.5, DEPTH_UP = 0.15;
/** 겁이 이만큼 차면 조마조마 — 무서워하는 것이 아니어도 크게 놀란다(조금 덜) */
const JUMPY = 0.6, JUMPY_MUL = 0.7;
/** 유령: 날아가는 틱(거리에 따라) · 장난 뒤 쉼 · 물건 쉼(레벨마다 줄어듦) · 톡 판정 반지름 */
const FLY_T0 = 7, FLY_T1 = 12, G_REST = 28, OBJ_REST = 78, PICK_R = 0.16;
/** 비명이 옆방에 닿는 틱 · 와장창(쏟음) 틱 · 멍멍 틱 */
const SCREAM_D = 20, CRASH_D = 14, BARK_D = 12;
/** 처음 10초는 겁이 식지 않는다 · 겁이 식는 빠르기(틱당) · 놀란 뒤 이만큼은 안 식음 · 놀란 뒤 상자를 못 푸는 틱 */
const SAFE_T = 600, DECAY = 0.045, DECAY_WAIT = 180, SHAKE_T = 240, TEETH_T = 420;
/** 결과 화면: 톡 받기 시작 · (손을 안 대면 기다린다) / 둘 중 하나: 톡 받기 · 고른 뒤 · 끝 화면 · 눌러앉음 연출 */
const RES_MIN = 90, RES_AUTO = 60 * 60 * 30, PICK_MIN = 40, PICK_AUTO = 60 * 60 * 30, PICK_AFTER = 64, END_T = 210, SETTLE_T = 150;
const CLEAR_PTS = 40, STAR_MUL = [1, 1, 2, 4], WIN_PTS = 200;

// ───────────────────────────── 집 ─────────────────────────────
export type RK = 'kitchen' | 'living' | 'bath' | 'bed' | 'study' | 'music';
interface RoomDef { x0: number; y0: number; x1: number; y1: number; kind: RK }
/** 계단(오른쪽 계단실): 아래 방 · 위 방 · 아래 x · 위 x */
interface Stair { lo: number; hi: number; xl: number; xh: number }
/** 물건 자리: 벽 · 천장 · 바닥 · 선반 */
type Place = 'wall' | 'ceil' | 'floor' | 'shelf';
/** 물건: 종류 · 방 · x · 자리 · (있으면) 이 판부터 */
interface Layout { name: string; rooms: RoomDef[]; stairs: Stair[]; roofY: number; objs: [OK, number, number, Place, number?][]; spots: [number, number, Act][] }
/** 사람이 하는 일 (자리마다 하나) */
export type Act = 'cook' | 'wash' | 'tv' | 'sofa' | 'bath' | 'brush' | 'nap' | 'window' | 'desk' | 'piano' | 'read' | 'fridge' | 'look';
const DOOR_X = 0.045, CAR_X = 0.27, CAR_Y = 1.245;
const L2F = (y0: number, y1: number, k0: RK, k1: RK): RoomDef[] => [{ x0: 0.045, y0, x1: 0.5, y1, kind: k0 }, { x0: 0.5, y0, x1: 0.955, y1, kind: k1 }];
export const LAYOUTS: Layout[] = [
  {
    name: '아담한 이층집',
    rooms: [...L2F(0.38, 0.73, 'bath', 'bed'), ...L2F(0.73, 1.08, 'kitchen', 'living')],
    stairs: [{ lo: 3, hi: 1, xl: 0.845, xh: 0.915 }],
    roofY: 0.38,
    objs: [
      ['web', 0, 0.09, 'ceil', 1], ['lamp', 0, 0.29, 'ceil'], ['tub', 0, 0.32, 'floor'], ['stool', 0, 0.45, 'floor'],
      ['wardrobe', 1, 0.565, 'floor'], ['frame', 1, 0.75, 'wall', 1], ['curtain', 1, 0.655, 'wall'], ['lamp', 1, 0.75, 'ceil'],
      ['frame', 2, 0.22, 'wall'], ['pot', 2, 0.43, 'floor'], ['sink', 2, 0.32, 'floor'], ['lamp', 2, 0.28, 'ceil'], ['web', 2, 0.46, 'ceil', 1],
      ['tv', 3, 0.58, 'floor'], ['chair', 3, 0.675, 'floor'], ['web', 3, 0.54, 'ceil', 1], ['fishbowl', 3, 0.79, 'shelf'], ['lamp', 3, 0.7, 'ceil'],
    ],
    spots: [
      [0, 0.32, 'bath'], [0, 0.14, 'brush'], [0, 0.22, 'look'],
      [1, 0.75, 'nap'], [1, 0.655, 'window'], [1, 0.58, 'look'],
      [2, 0.43, 'cook'], [2, 0.32, 'wash'], [2, 0.16, 'fridge'], [2, 0.27, 'look'],
      [3, 0.775, 'sofa'], [3, 0.675, 'tv'], [3, 0.58, 'look'],
    ],
  },
  {
    name: '삼층 타운하우스',
    rooms: [...L2F(0.33, 0.58, 'study', 'music'), ...L2F(0.58, 0.83, 'bath', 'bed'), ...L2F(0.83, 1.08, 'kitchen', 'living')],
    stairs: [{ lo: 5, hi: 3, xl: 0.845, xh: 0.915 }, { lo: 3, hi: 1, xl: 0.845, xh: 0.915 }],
    roofY: 0.33,
    objs: [
      ['web', 0, 0.09, 'ceil'], ['frame', 0, 0.3, 'wall'], ['lamp', 0, 0.25, 'ceil'], ['musicbox', 0, 0.43, 'shelf'],
      ['piano', 1, 0.6, 'floor'], ['doll', 1, 0.79, 'shelf'], ['curtain', 1, 0.7, 'wall'], ['chair', 1, 0.77, 'floor'],
      ['tub', 2, 0.32, 'floor'], ['web', 2, 0.09, 'ceil'], ['lamp', 2, 0.27, 'ceil'], ['stool', 2, 0.45, 'floor'],
      ['wardrobe', 3, 0.565, 'floor'], ['frame', 3, 0.75, 'wall'], ['curtain', 3, 0.655, 'wall'], ['doll', 3, 0.81, 'shelf'],
      ['frame', 4, 0.22, 'wall'], ['pot', 4, 0.43, 'floor'], ['sink', 4, 0.32, 'floor'], ['lamp', 4, 0.28, 'ceil'], ['web', 4, 0.46, 'ceil'],
      ['tv', 5, 0.58, 'floor'], ['chair', 5, 0.675, 'floor'], ['fishbowl', 5, 0.79, 'shelf'], ['lamp', 5, 0.7, 'ceil'], ['web', 5, 0.54, 'ceil'],
    ],
    spots: [
      [0, 0.3, 'desk'], [0, 0.42, 'read'], [0, 0.16, 'look'],
      [1, 0.6, 'piano'], [1, 0.7, 'window'], [1, 0.8, 'look'],
      [2, 0.32, 'bath'], [2, 0.14, 'brush'], [2, 0.22, 'look'],
      [3, 0.75, 'nap'], [3, 0.655, 'window'], [3, 0.58, 'look'],
      [4, 0.43, 'cook'], [4, 0.32, 'wash'], [4, 0.16, 'fridge'], [4, 0.27, 'look'],
      [5, 0.775, 'sofa'], [5, 0.675, 'tv'], [5, 0.58, 'look'],
    ],
  },
  {
    name: '언덕 위 저택',
    rooms: [...L2F(0.33, 0.58, 'study', 'bed'), ...L2F(0.58, 0.83, 'bath', 'music'), ...L2F(0.83, 1.08, 'kitchen', 'living')],
    stairs: [{ lo: 5, hi: 3, xl: 0.845, xh: 0.915 }, { lo: 3, hi: 1, xl: 0.845, xh: 0.915 }],
    roofY: 0.33,
    objs: [
      ['books', 0, 0.42, 'shelf'], ['web', 0, 0.09, 'ceil'], ['lamp', 0, 0.25, 'ceil'], ['frame', 0, 0.2, 'wall'], ['musicbox', 0, 0.3, 'shelf'],
      ['wardrobe', 1, 0.565, 'floor'], ['frame', 1, 0.75, 'wall'], ['curtain', 1, 0.655, 'wall'], ['doll', 1, 0.81, 'shelf'],
      ['tub', 2, 0.33, 'floor'], ['mirror', 2, 0.15, 'wall'], ['lamp', 2, 0.27, 'ceil'], ['web', 2, 0.46, 'ceil'],
      ['piano', 3, 0.6, 'floor'], ['books', 3, 0.79, 'shelf'], ['curtain', 3, 0.7, 'wall'], ['lamp', 3, 0.7, 'ceil'],
      ['frame', 4, 0.22, 'wall'], ['pot', 4, 0.43, 'floor'], ['sink', 4, 0.32, 'floor'], ['lamp', 4, 0.28, 'ceil'], ['web', 4, 0.46, 'ceil'],
      ['tv', 5, 0.58, 'floor'], ['radio', 5, 0.79, 'shelf'], ['chair', 5, 0.675, 'floor'], ['mirror', 5, 0.72, 'wall'], ['lamp', 5, 0.7, 'ceil'],
    ],
    spots: [
      [0, 0.3, 'desk'], [0, 0.42, 'read'], [0, 0.16, 'look'],
      [1, 0.75, 'nap'], [1, 0.655, 'window'], [1, 0.58, 'look'],
      [2, 0.33, 'bath'], [2, 0.14, 'brush'], [2, 0.22, 'look'],
      [3, 0.6, 'piano'], [3, 0.7, 'window'], [3, 0.8, 'look'],
      [4, 0.43, 'cook'], [4, 0.32, 'wash'], [4, 0.16, 'fridge'], [4, 0.27, 'look'],
      [5, 0.775, 'sofa'], [5, 0.675, 'tv'], [5, 0.58, 'look'],
    ],
  },
];
/** 방 이름(그림·도움말) */
export const RK_NAME: Record<RK, string> = { kitchen: '부엌', living: '거실', bath: '욕실', bed: '침실', study: '공부방', music: '음악방' };

// ───────────────────────────── 물건(장난) ─────────────────────────────
export type OK = 'frame' | 'pot' | 'chair' | 'stool' | 'web' | 'wardrobe' | 'lamp' | 'tv' | 'curtain' | 'sink' | 'tub' | 'fishbowl' | 'doll' | 'piano' | 'musicbox' | 'mirror' | 'books' | 'radio' | 'pumpkin';
/** 장난 범위: 그 방 · 그 방 모두 크게(거울) · 그 방 + 옆방으로 날아감(책) · 같은 층 모든 방(라디오) · 두 가지 겁(호박등) */
type Mode = 'room' | 'all' | 'throw' | 'floor' | 'two';
interface ODef { name: string; fear: Fear; mode: Mode; verb: string; from: number; rest: number }
/** from: 이 물건이 처음 쓰이는 판(0부터). 그 전 판에서는 집에 없다 */
export const OD: Record<OK, ODef> = {
  frame: { name: '액자', fear: LOUD, mode: 'room', verb: '덜컹!', from: 0, rest: 1 },
  pot: { name: '냄비', fear: LOUD, mode: 'room', verb: '와장창!', from: 0, rest: 1 },
  chair: { name: '흔들의자', fear: LOUD, mode: 'room', verb: '쿠당탕!', from: 0, rest: 1 },
  stool: { name: '의자', fear: LOUD, mode: 'room', verb: '쿵!', from: 0, rest: 1 },
  web: { name: '거미줄', fear: SPIDER, mode: 'room', verb: '스르륵', from: 0, rest: 1 },
  wardrobe: { name: '옷장', fear: SPIDER, mode: 'room', verb: '우글우글', from: 0, rest: 1.1 },
  lamp: { name: '전등', fear: DARK, mode: 'room', verb: '깜깜!', from: 1, rest: 1.2 },
  tv: { name: 'TV', fear: DARK, mode: 'room', verb: '지지직', from: 1, rest: 1 },
  curtain: { name: '커튼', fear: DARK, mode: 'room', verb: '휘이잉', from: 1, rest: 1 },
  sink: { name: '수도꼭지', fear: WATER, mode: 'room', verb: '콸콸!', from: 2, rest: 1 },
  tub: { name: '욕조', fear: WATER, mode: 'room', verb: '철퍽!', from: 2, rest: 1.1 },
  fishbowl: { name: '어항', fear: WATER, mode: 'room', verb: '첨벙!', from: 2, rest: 1 },
  doll: { name: '인형', fear: DOLL, mode: 'room', verb: '랄랄라~', from: 4, rest: 1 },
  piano: { name: '피아노', fear: DOLL, mode: 'room', verb: '띠리링~', from: 4, rest: 1.1 },
  musicbox: { name: '오르골', fear: DOLL, mode: 'room', verb: '딩동댕~', from: 4, rest: 1 },
  mirror: { name: '거울', fear: LOUD, mode: 'all', verb: '히히히', from: 8, rest: 2.2 },
  books: { name: '책', fear: LOUD, mode: 'throw', verb: '휙휙!', from: 9, rest: 1.5 },
  radio: { name: '라디오', fear: DOLL, mode: 'floor', verb: '나가…', from: 10, rest: 2 },
  pumpkin: { name: '호박등', fear: DARK, mode: 'two', verb: '크하하!', from: 99, rest: 1.2 },
};

// ───────────────────────────── 사람 ─────────────────────────────
/** 생김새: 아빠 · 엄마 · 할머니 · 할아버지 · 누나 · 형 · 꼬마 · 퇴마사 할머니 · 유튜버 · 손님(여)·손님(남) */
export type MK = 'dad' | 'mom' | 'grandma' | 'grandpa' | 'girl' | 'boy' | 'kid' | 'exorcist' | 'youtuber' | 'guestF' | 'guestM';
/** 손에 든 것 */
export type Item = 'milk' | 'plate' | 'book' | 'none';
interface Mem { k: MK; fear: Fear; item?: Item; name: string; room?: number; x?: number; act?: Act; max?: number; costume?: number }
interface StageDef {
  fam: string; ch: number; key: string; news: string;
  mems: Mem[]; dog: number; boxes: number; unpack: number;
  /** 별 둘째: 상자 반 남기기 · 소금 안 맞기 · 카메라에 안 찍히기 */
  star2: 'box' | 'salt' | 'cam';
  /** 별 셋째: 한 번에 N명 비명 · 한 번에 N명 이삿짐 · 미끄러뜨리기 N번 · (첫 톡부터) N초 안에 쫓아내기 */
  star: { k: 'chain' | 'pack' | 'slip' | 'fast'; n: number };
  big?: boolean; pal: number; safe?: boolean;
}
export const CHAPTERS = ['아담한 이층집', '삼층 타운하우스', '언덕 위 저택'];
const M = (k: MK, fear: Fear, name: string, item: Item = 'none', room?: number, x?: number, act?: Act, max?: number, costume?: number): Mem => ({ k, fear, name, item, room, x, act, max, costume });
/**
 * 판 12개. 판마다 새 가족이 이사 온다. 겁 종류는 판이 갈수록 늘어난다(큰 소리·거미 → 어둠 → 물 → 노래하는 인형).
 * 1판은 첫 톡의 약속을 위해 자리가 정해져 있다: 부엌의 아빠(큰 소리, 우유) 옆 액자 · 위층 욕실 할머니(큰 소리, 틀니) · 거실 강아지 · 침실 엄마(거미).
 */
export const STAGES: StageDef[] = [
  { fam: '왁자지껄네', ch: 0, key: 'frame', news: '액자를 톡! 큰 소리를 무서워하는 사람이 펄쩍', mems: [M('dad', LOUD, '아빠', 'milk', 2, 0.3, 'look', 80), M('grandma', LOUD, '할머니', 'none', 0, 0.15, 'brush', 80), M('mom', SPIDER, '엄마', 'none', 1, 0.62, 'window', 80)], dog: 3, boxes: 8, unpack: 330, star2: 'box', star: { k: 'chain', n: 2 }, pal: 0, safe: true },
  { fam: '잠꾸러기네', ch: 0, key: 'lamp', news: '전등을 톡 하면 방이 깜깜 — 어둠을 무서워하는 사람!', mems: [M('dad', DARK, '아빠'), M('mom', LOUD, '엄마', 'plate'), M('girl', DARK, '누나'), M('grandpa', LOUD, '할아버지')], dog: 3, boxes: 9, unpack: 300, star2: 'box', star: { k: 'chain', n: 4 }, pal: 1 },
  { fam: '깔끔쟁이네', ch: 0, key: 'sink', news: '수도꼭지 콸콸 — 쏟은 우유도 물! 젖은 바닥에선 미끄덩', mems: [M('mom', WATER, '엄마'), M('dad', LOUD, '아빠', 'milk'), M('boy', WATER, '형'), M('grandma', LOUD, '할머니'), M('girl', SPIDER, '누나', 'book')], dog: 3, boxes: 9, unpack: 290, star2: 'box', star: { k: 'fast', n: 40 }, pal: 2 },
  {
    fam: '집들이 파티', ch: 0, key: 'party', news: '손님 열 명! 비명이 이 방 저 방 터져요', big: true, pal: 3,
    mems: [M('dad', LOUD, '아빠', 'milk'), M('mom', DARK, '엄마'), M('guestF', LOUD, '손님', 'plate', undefined, undefined, undefined, 55), M('guestM', SPIDER, '손님', 'none', undefined, undefined, undefined, 55), M('guestF', WATER, '손님', 'none', undefined, undefined, undefined, 55), M('guestM', LOUD, '손님', 'milk', undefined, undefined, undefined, 55), M('guestF', DARK, '손님', 'none', undefined, undefined, undefined, 55), M('guestM', WATER, '손님', 'plate', undefined, undefined, undefined, 55), M('guestF', SPIDER, '손님', 'none', undefined, undefined, undefined, 55), M('guestM', LOUD, '손님', 'none', undefined, undefined, undefined, 55), M('grandpa', LOUD, '손님', 'none', undefined, undefined, undefined, 55), M('girl', DARK, '손님', 'none', undefined, undefined, undefined, 55)],
    dog: 3, boxes: 12, unpack: 420, star2: 'box', star: { k: 'pack', n: 5 },
  },
  { fam: '음악가네', ch: 1, key: 'doll', news: '노래하는 인형·피아노 — 노래를 무서워하는 사람!', mems: [M('dad', DOLL, '아빠'), M('mom', LOUD, '엄마', 'plate'), M('girl', DOLL, '누나'), M('grandma', LOUD, '할머니'), M('boy', SPIDER, '형', 'book')], dog: 5, boxes: 10, unpack: 280, star2: 'box', star: { k: 'chain', n: 4 }, pal: 4 },
  { fam: '개구쟁이네', ch: 1, key: 'kid', news: '겁 없는 꼬마 — 꼬마 옆에선 까르르, 덜 놀라요', mems: [M('kid', LOUD, '꼬마'), M('dad', WATER, '아빠'), M('mom', DARK, '엄마', 'milk'), M('grandma', LOUD, '할머니'), M('boy', DOLL, '형')], dog: 5, boxes: 10, unpack: 270, star2: 'box', star: { k: 'pack', n: 2 }, pal: 5 },
  { fam: '퇴마사네', ch: 1, key: 'exorcist', news: '퇴마사 할머니 방에서 장난치면 소금! 옆방에서 놀래요', mems: [M('exorcist', LOUD, '퇴마사 할머니'), M('dad', SPIDER, '아빠'), M('mom', DOLL, '엄마', 'plate'), M('boy', LOUD, '형'), M('girl', WATER, '누나')], dog: 5, boxes: 10, unpack: 270, star2: 'salt', star: { k: 'fast', n: 50 }, pal: 6 },
  {
    fam: '할로윈 밤', ch: 1, key: 'pumpkin', news: '호박등 — 어둠도 큰 소리도 한꺼번에! 분장한 손님들', big: true, pal: 7,
    mems: [M('dad', DOLL, '아빠', 'none', undefined, undefined, undefined, undefined, 1), M('mom', SPIDER, '엄마', 'none', undefined, undefined, undefined, undefined, 2), M('kid', LOUD, '꼬마', 'none', undefined, undefined, undefined, undefined, 3), M('guestF', DARK, '손님', 'plate', undefined, undefined, undefined, 60, 4), M('guestM', LOUD, '손님', 'none', undefined, undefined, undefined, 60, 1), M('guestF', WATER, '손님', 'none', undefined, undefined, undefined, 60, 2), M('guestM', DARK, '손님', 'milk', undefined, undefined, undefined, 60, 4), M('girl', LOUD, '손님', 'none', undefined, undefined, undefined, 60, 3), M('boy', SPIDER, '손님', 'none', undefined, undefined, undefined, 60, 1)],
    dog: 5, boxes: 12, unpack: 360, star2: 'box', star: { k: 'pack', n: 3 },
  },
  { fam: '멋쟁이네', ch: 2, key: 'mirror', news: '거울에 얼굴 — 그 방 사람이 모두 크게 놀라요', mems: [M('dad', WATER, '아빠'), M('mom', DOLL, '엄마', 'milk'), M('grandpa', DARK, '할아버지'), M('girl', SPIDER, '누나'), M('boy', LOUD, '형', 'book')], dog: 5, boxes: 10, unpack: 260, star2: 'box', star: { k: 'chain', n: 4 }, pal: 8 },
  { fam: '책벌레네', ch: 2, key: 'books', news: '책 날리기 — 책이 벽을 넘어 옆방까지 휙휙!', mems: [M('dad', LOUD, '아빠', 'book'), M('mom', SPIDER, '엄마', 'book'), M('grandma', DARK, '할머니'), M('boy', LOUD, '형', 'book'), M('girl', DOLL, '누나')], dog: 5, boxes: 10, unpack: 250, star2: 'box', star: { k: 'chain', n: 4 }, pal: 9 },
  { fam: '수다쟁이네', ch: 2, key: 'radio', news: '라디오 목소리 — 같은 층 모든 방에 "나가…"', mems: [M('dad', DOLL, '아빠'), M('mom', DOLL, '엄마', 'plate'), M('grandma', LOUD, '할머니'), M('boy', WATER, '형'), M('girl', DARK, '누나'), M('grandpa', SPIDER, '할아버지')], dog: 5, boxes: 11, unpack: 250, star2: 'box', star: { k: 'chain', n: 4 }, pal: 10 },
  {
    fam: '유튜버 가족', ch: 2, key: 'youtuber', news: '유튜버 방에선 불 끄기만! 다른 장난은 찍혀요', big: true, pal: 11,
    mems: [M('youtuber', DARK, '유튜버'), M('mom', LOUD, '엄마', 'milk'), M('girl', DOLL, '누나'), M('boy', SPIDER, '형', 'book'), M('grandpa', WATER, '할아버지'), M('grandma', LOUD, '할머니'), M('kid', DARK, '꼬마')],
    dog: 5, boxes: 12, unpack: 300, star2: 'cam', star: { k: 'chain', n: 4 },
  },
];
export const STAGE_COUNT = STAGES.length;
/** 장 끝 둘 중 하나(집의 큰 물건) */
export const PERKS: { name: string; line: string }[][] = [
  [{ name: '낡은 괘종시계', line: '자정마다 온 집이 덜컹' }, { name: '저주받은 인형', line: '비명이 한 칸 더 번져요' }],
  [{ name: '검은 고양이', line: '큰 소리에 캬악 — 옆방까지' }, { name: '으스스 안개', line: '겁이 식지 않고 작은 놀람 두 배' }],
];
/** 겁주기 반응 도감 */
export type RX = 'jump' | 'spill' | 'teeth' | 'wig' | 'slip' | 'bump' | 'blanket' | 'splash' | 'faint' | 'bark' | 'pack' | 'laugh';
export const REACTS: RX[] = ['jump', 'spill', 'teeth', 'bark', 'pack', 'bump', 'slip', 'wig', 'blanket', 'splash', 'faint', 'laugh'];
export const RX_NAME: Record<RX, string> = { jump: '펄쩍', spill: '와장창 쏟기', teeth: '틀니 날아감', wig: '가발 날아감', slip: '미끄러짐', bump: '깜깜 쿵', blanket: '이불 뒤집어쓰기', splash: '욕조 풍덩', faint: '기절', bark: '강아지 멍멍', pack: '이삿짐 우다다', laugh: '꼬마 까르르' };
/** 반응마다 몸짓 틱 */
const RX_T: Record<RX, number> = { jump: 40, spill: 48, teeth: 54, wig: 54, slip: 62, bump: 56, blanket: 110, splash: 56, faint: 84, bark: 40, pack: 44, laugh: 50 };

// ───────────────────────────── 상태 ─────────────────────────────
interface Room extends RoomDef { i: number; nb: number[]; nb2: number[]; walk: number[]; dark: number; wet: number; H: number; fl: number }
interface Obj { id: number; k: OK; room: number; x: number; y: number; cy: number; place: Place; rest: number; restMax: number; at: number; hits: number }
interface Box { id: number; room: number; x: number; claim: number; done: boolean; doneT: number; deco: number }
/** 걷는 길: 바닥 위 x까지 · 계단 오르내리기 · 현관 밖으로 */
type Step = { k: 'w'; x: number } | { k: 'c'; st: number; up: boolean } | { k: 'o' };
/** 사람·동물 상태 */
type PS = 'idle' | 'walk' | 'act' | 'react' | 'panic' | 'pack' | 'flee' | 'out' | 'gone' | 'bark' | 'cheer';
export interface Person {
  id: number; k: MK | 'dog' | 'cat'; name: string; fear: Fear; max: number; fv: number; item: Item; costume: number;
  room: number; x: number; y: number; face: 1 | -1; st: PS; stT: number; stLen: number;
  path: Step[]; act: Act | 'unpack' | null; spot: number; box: number;
  rx: RX | null; rxT: number; lastScare: number; shakeT: number; startT: number; hb: number[]; hs: number[];
  climb: { st: number; up: boolean; t: number; T: number } | null; outT: number; seat: number;
  teethT: number; wigT: number; walkT: number; speed: number; laughT: number; filmT: number; saltT: number;
}
/** 한 번의 장난에서 이어진 연쇄: 크게 놀란 수 · 이사 수 · 마지막으로 크게 놀란 자리(숫자 띄울 곳) */
interface Chain { id: number; t: number; big: number; small: number; packs: number; x: number; y: number; lastT: number; star: boolean; lx: number; ly: number }
type EK = 'prank' | 'scream' | 'crash' | 'bark' | 'leak' | 'yell' | 'clock' | 'hiss' | 'spill' | 'bugs' | 'teeth' | 'wig' | 'drip';
interface Pend { t: number; room: number; fear: Fear; fear2: number; all: boolean; depth: number; chain: number; kind: EK; x: number; y: number; src: number }
interface Ev { t: number; k: string; x: number; y: number; n: number; x2: number; y2: number; text: string }
/** 비명 줄(그림): 소리가 벽을 넘어 옆방으로 */
interface Wave { t: number; x0: number; y0: number; x1: number; y1: number; depth: number }

export interface HauntState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result' | 'pick' | 'end' | 'settle'; pt: number;
  hearts: number; pts: number; sp: number; gain: number; stars: number; got: number; starOk: boolean[]; dead: boolean; won: boolean;
  lv: number; perk: number[]; picked: number; rdex: RX[]; newRx: RX[]; fams: number[];
  rooms: Room[]; objs: Obj[]; boxes: Box[]; people: Person[]; nid: number; seats: number;
  /** 유령: 자리 · 날아가는 중 · 다음 톡을 받는 틱 · 기억해 둔 톡 · 물건이 쉬길 기다림 · 소금 맞아 어질 · 바라보는 쪽 */
  gx: number; gy: number; fly: { x0: number; y0: number; obj: number; t: number; T: number } | null; gReady: number; queue: number; gWait: number; gStun: number; gFace: number; gLast: number;
  pend: Pend[]; chains: Chain[]; cid: number; waves: Wave[]; events: Ev[];
  started: boolean; boxLeft: number; best: number; bestPack: number; slips: number; salted: number; filmed: number; clearT: number;
  clockT: number; freeze: number; down: boolean; wowN: number; firstTap: number; firstBig: number; taps: number; stTaps: number;
  seen: Set<string>;
  banner: { head: string; sub: string; t: number } | null; spot: { id: number; t: number } | null;
  big: { text: string; t: number; n: number; star: boolean } | null;
}

const hyp = (a: number, b: number) => Math.sqrt(a * a + b * b);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ev = (s: HauntState, k: string, x: number, y: number, n = 0, x2 = 0, y2 = 0, text = '') => s.events.push({ t: s.t, k, x, y, n, x2, y2, text });
const see = (s: HauntState, key: string) => void s.seen.add(key);
const layoutOf = (s: HauntState) => LAYOUTS[STAGES[s.stage].ch];
const floorY = (r: RoomDef) => r.y1 - 0.02;
/** 사람 키 (방 높이에 맞춤) */
export const personH = (r: RoomDef) => Math.min(0.19, (r.y1 - r.y0) * 0.54);
const human = (p: Person) => p.k !== 'dog' && p.k !== 'cat';
/** 놀랄 수 있는 사람(집 안에서 살고 있음) */
const awake = (p: Person) => human(p) && p.st !== 'pack' && p.st !== 'flee' && p.st !== 'out' && p.st !== 'gone';
const inHouse = (p: Person) => p.st !== 'out' && p.st !== 'gone';
const lvMul = (s: HauntState) => 1 + 0.04 * (s.lv - 1);
const objReady = (o: Obj) => o.rest <= 0;
const doorRoom = (s: HauntState) => s.rooms.length - 2;
/** 그 방에 지금 있는 사람(계단 위는 출발한 방) */
const peopleIn = (s: HauntState, r: number) => s.people.filter((p) => p.room === r && awake(p));
export const roomAt = (s: HauntState, x: number, y: number) => s.rooms.findIndex((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);

function wow(s: HauntState, text: string, n = 0, star = false) {
  s.wowN++;
  if (s.firstBig < 0 && s.firstTap >= 0) s.firstBig = s.t;
  s.big = { text, t: s.t, n, star };
  s.freeze = Math.max(s.freeze, 5);
  see(s, 'wow');
}

// ───────────────────────────── 판 만들기 ─────────────────────────────
function buildRooms(s: HauntState) {
  const L = layoutOf(s);
  s.rooms = L.rooms.map((r, i) => ({ ...r, i, nb: [], nb2: [], walk: [], dark: 0, wet: 0, H: r.y1 - r.y0, fl: floorY(r) }));
  for (const a of s.rooms)
    for (const b of s.rooms) {
      if (a === b) continue;
      const sameFloor = Math.abs(a.y0 - b.y0) < 1e-6 && (Math.abs(a.x1 - b.x0) < 1e-6 || Math.abs(b.x1 - a.x0) < 1e-6);
      const stacked = Math.abs(a.x0 - b.x0) < 1e-6 && (Math.abs(a.y1 - b.y0) < 1e-6 || Math.abs(b.y1 - a.y0) < 1e-6);
      if (sameFloor || stacked) a.nb.push(b.i);
      if (sameFloor) a.walk.push(b.i);
    }
  for (const st of L.stairs) s.rooms[st.lo].walk.push(st.hi), s.rooms[st.hi].walk.push(st.lo);
  for (const a of s.rooms) a.nb2 = [...new Set(a.nb.flatMap((b) => s.rooms[b].nb))].filter((c) => c !== a.i && !a.nb.includes(c));
}
function objCy(k: OK, r: Room, place: Place) {
  if (place === 'ceil') return r.y0 + 0.032;
  if (place === 'wall') return r.fl - r.H * 0.56;
  if (place === 'shelf') return r.fl - r.H * 0.43;
  const hgt: Partial<Record<OK, number>> = { tub: 0.06, piano: 0.1, wardrobe: 0.15, chair: 0.085, stool: 0.05, pot: 0.1, sink: 0.1, tv: 0.1, pumpkin: 0.05 };
  return r.fl - (hgt[k] ?? 0.06) * (r.H / 0.33) ** 0.5 * 0.55;
}
function addObj(s: HauntState, k: OK, room: number, x: number, place: Place) {
  const r = s.rooms[room], o: Obj = { id: s.objs.length + 1, k, room, x, y: place === 'floor' ? r.fl : objCy(k, r, place), cy: objCy(k, r, place), place, rest: 0, restMax: 0, at: -999, hits: 0 };
  s.objs.push(o);
  return o;
}
function spotsOf(s: HauntState) {
  return layoutOf(s).spots;
}
function addPerson(s: HauntState, m: Mem | null, k: MK | 'dog' | 'cat', room: number, x: number): Person {
  const r = s.rooms[room];
  const p: Person = {
    id: ++s.nid, k, name: m?.name ?? (k === 'cat' ? '고양이' : '강아지'), fear: m?.fear ?? LOUD, max: m?.max ?? 100, fv: 0, item: m?.item ?? 'none', costume: m?.costume ?? 0,
    room, x, y: r.fl, face: s.rng() < 0.5 ? 1 : -1, st: 'idle', stT: 0, stLen: 30 + Math.floor(s.rng() * 90),
    path: [], act: null, spot: -1, box: -1, rx: null, rxT: -999, lastScare: -999, shakeT: 0, startT: -999, hb: [], hs: [],
    climb: null, outT: 0, seat: -1, teethT: -999, wigT: -999, walkT: 0, speed: 0.0032, laughT: -999, filmT: -999, saltT: -999,
  };
  s.people.push(p);
  return p;
}
function newStage(s: HauntState) {
  const d = STAGES[s.stage], L = layoutOf(s);
  buildRooms(s);
  s.objs = [];
  for (const [k, room, x, place, from] of L.objs) if (Math.max(OD[k].from, from ?? 0) <= s.stage) addObj(s, k, room, x, place);
  // 할로윈: 방마다 호박등 하나
  if (d.key === 'pumpkin') for (const r of s.rooms) addObj(s, 'pumpkin', r.i, r.i % 2 ? r.x0 + 0.1 : r.x1 - 0.1, 'floor');
  s.people = [];
  s.nid = 0;
  s.seats = 0;
  // 상자: 방마다 고르게 (문·계단 자리는 피해서)
  s.boxes = [];
  for (let i = 0; i < d.boxes; i++) {
    const r = s.rooms[(i * 3 + s.stage) % s.rooms.length], lo = r.x0 + (r.i === doorRoom(s) ? 0.1 : 0.05), hi = r.x1 - (r.x0 > 0.4 ? 0.14 : 0.06);
    s.boxes.push({ id: i, room: r.i, x: lo + s.rng() * (hi - lo), claim: 0, done: false, doneT: 0, deco: Math.floor(s.rng() * 6) });
  }
  s.boxLeft = d.boxes;
  // 사람: 정해진 자리가 없으면 서로 다른 방·자리에 흩어 둔다
  const used = new Set<number>(), sp = spotsOf(s);
  for (const m of d.mems) {
    let room = m.room, x = m.x, act = m.act;
    if (room === undefined) {
      const free = sp.map((_, i) => i).filter((i) => !used.has(i));
      const i = free[Math.floor(s.rng() * free.length)] ?? 0;
      used.add(i);
      [room, x, act] = [sp[i][0], sp[i][1] + (s.rng() - 0.5) * 0.04, sp[i][2]];
    } else used.add(sp.findIndex((q) => q[0] === room && Math.abs(q[1] - (x ?? 0)) < 0.06));
    const p = addPerson(s, m, m.k, room, x!);
    if (act) (p.st = 'act'), (p.act = act), (p.stT = 0), (p.stLen = 240 + Math.floor(s.rng() * 200)), (p.face = act === 'look' ? 1 : p.face);
  }
  addPerson(s, null, 'dog', d.dog, d.dog === 3 && d.ch === 0 ? 0.66 : s.rooms[d.dog].x0 + 0.2);
  if (s.perk[1] === 1 && d.ch >= 2) addPerson(s, null, 'cat', 1, s.rooms[1].x0 + 0.25);
  if (s.stage === 0) {
    // 첫 톡의 약속: 아빠는 액자 옆에서 우유를 들고 서 있다 · 엄마는 침실을 왔다 갔다 · 할머니는 양치 중
    const [dad, gm, mom] = s.people;
    dad.face = -1;
    dad.stLen = 9999;
    gm.stLen = 200;
    planTo(s, mom, 1, 0.585);
    mom.st = 'walk';
    mom.act = 'look';
  }
  s.pend = [];
  s.chains = [];
  s.waves = [];
  s.fly = null;
  s.queue = -1;
  s.gWait = -1;
  s.gStun = 0;
  s.gReady = 0;
  const frame = s.objs.find((o) => o.k === d.key) ?? s.objs[0];
  s.gx = s.stage === 0 ? 0.62 : 0.5;
  s.gy = s.stage === 0 ? 0.3 : 0.27;
  s.gFace = 1;
  s.gLast = -1;
  s.started = false;
  s.stTaps = 0;
  s.best = 0;
  s.bestPack = 0;
  s.slips = 0;
  s.salted = 0;
  s.filmed = 0;
  s.clearT = 0;
  s.clockT = 0;
  s.phase = 'play';
  s.pt = 0;
  s.starOk = [false, false, false];
  s.got = 0;
  s.newRx = [];
  s.big = null;
  s.banner = { head: `${s.stage + 1}판 · ${d.fam} 이사 왔다!`, sub: d.news, t: s.t };
  s.spot = d.key === 'party' || d.key === 'kid' || d.key === 'exorcist' || d.key === 'youtuber' ? null : { id: frame.id, t: s.t };
  if (d.key === 'kid' || d.key === 'exorcist' || d.key === 'youtuber') {
    const who = s.people.find((p) => p.k === d.key);
    if (who) s.spot = { id: -who.id, t: s.t };
  }
  see(s, 'stage' + s.stage);
  see(s, 'ch' + d.ch);
  ev(s, 'stage', 0.5, 0.7, s.stage);
}

// ───────────────────────────── 걷기 ─────────────────────────────
/** 방 a → b 걷는 길 (같은 층 문 · 계단) */
function route(s: HauntState, a: number, b: number): number[] {
  if (a === b) return [a];
  const prev = new Map<number, number>([[a, -1]]), q = [a];
  while (q.length) {
    const c = q.shift()!;
    if (c === b) break;
    for (const n of s.rooms[c].walk) if (!prev.has(n)) prev.set(n, c), q.push(n);
  }
  const out: number[] = [];
  for (let c: number | undefined = b; c !== undefined && c !== -1; c = prev.get(c)) out.unshift(c);
  return out[0] === a ? out : [a];
}
function planTo(s: HauntState, p: Person, room: number, x: number) {
  const rs = route(s, p.room, room), L = layoutOf(s);
  p.path = [];
  for (let i = 1; i < rs.length; i++) {
    const a = rs[i - 1], b = rs[i];
    const st = L.stairs.findIndex((q) => (q.lo === a && q.hi === b) || (q.hi === a && q.lo === b));
    if (st >= 0) {
      const q = L.stairs[st], up = q.lo === a;
      p.path.push({ k: 'w', x: up ? q.xl : q.xh }, { k: 'c', st, up });
    }
  }
  p.path.push({ k: 'w', x });
}
/** 길을 한 틱 걷는다 — 다 왔으면 true */
function walkStep(s: HauntState, p: Person, spd: number): boolean {
  if (p.climb) {
    const c = p.climb, q = layoutOf(s).stairs[c.st];
    c.t++;
    const f = clamp(c.t / c.T, 0, 1), lo = s.rooms[q.lo], hi = s.rooms[q.hi], k = c.up ? f : 1 - f;
    p.x = q.xl + (q.xh - q.xl) * k;
    p.y = lo.fl + (hi.fl - lo.fl) * k;
    p.face = (q.xh > q.xl) === c.up ? 1 : -1;
    p.walkT++;
    if (c.t >= c.T) {
      p.room = c.up ? q.hi : q.lo;
      p.y = s.rooms[p.room].fl;
      p.climb = null;
      p.path.shift();
    }
    return false;
  }
  const st = p.path[0];
  if (!st) return true;
  if (st.k === 'c') {
    p.climb = { st: st.st, up: st.up, t: 0, T: Math.round(0.07 / spd) + 12 };
    return false;
  }
  if (st.k === 'o') return true;
  const dx = st.x - p.x;
  if (Math.abs(dx) <= spd) {
    p.x = st.x;
    p.path.shift();
    return p.path.length === 0;
  }
  p.x += Math.sign(dx) * spd;
  p.face = dx > 0 ? 1 : -1;
  p.walkT++;
  // 같은 층 옆방으로 넘어가면 방이 바뀐다
  const r = s.rooms[p.room];
  if (p.x < r.x0 || p.x > r.x1) {
    const n = s.rooms.find((q) => Math.abs(q.y0 - r.y0) < 1e-6 && p.x >= q.x0 && p.x <= q.x1);
    if (n) p.room = n.i;
  }
  return false;
}
function freeSpot(s: HauntState, p: Person, prefer: number): number {
  const sp = spotsOf(s);
  const taken = new Set(s.people.filter((q) => q !== p && q.spot >= 0 && inHouse(q)).map((q) => q.spot));
  const cand = sp.map((_, i) => i).filter((i) => !taken.has(i) && i !== p.spot);
  if (!cand.length) return -1;
  // 가족은 모여 지낸다: 반쯤은 누가 있는 방으로, 나머지는 지금 방·옆방이나 아무 데나
  const busy = new Set(s.people.filter((q) => q !== p && human(q) && awake(q)).map((q) => q.room));
  const withFam = cand.filter((i) => busy.has(sp[i][0]));
  const near = cand.filter((i) => sp[i][0] === prefer || s.rooms[p.room].walk.includes(sp[i][0]));
  const r = s.rng(), pool = withFam.length && r < 0.45 ? withFam : near.length && r < 0.75 ? near : cand;
  return pool[Math.floor(s.rng() * pool.length)];
}
function setState(p: Person, st: PS, len: number) {
  p.st = st;
  p.stT = 0;
  p.stLen = len;
}
/** 다음에 할 일 고르기 */
function decide(s: HauntState, p: Person) {
  const d = STAGES[s.stage];
  p.act = null;
  p.spot = -1;
  if (p.box >= 0) (s.boxes[p.box].claim = 0), (p.box = -1);
  if (p.k === 'dog' || p.k === 'cat') {
    // 동물: 1층(고양이는 위층)을 어슬렁, 가끔 엎드려 쉰다
    if (s.rng() < 0.35) return setState(p, 'act', 150 + Math.floor(s.rng() * 200)), void (p.act = 'look');
    const rooms = s.rooms.filter((r) => (p.k === 'dog' ? r.y1 > 1 : r.y1 < 0.9));
    const r = rooms[Math.floor(s.rng() * rooms.length)];
    planTo(s, p, r.i, r.x0 + 0.08 + s.rng() * (r.x1 - r.x0 - 0.22));
    return setState(p, 'walk', 9999);
  }
  if (p.k === 'kid') {
    // 겁 없는 꼬마: 유령이 있는 방으로 쫄래쫄래 따라간다
    const gr = roomAt(s, s.gx, s.gy + 0.08);
    const r = s.rooms[gr >= 0 ? gr : p.room];
    if (r.i === p.room && s.rng() < 0.6) return setState(p, 'act', 60 + Math.floor(s.rng() * 60)), void (p.act = 'look');
    planTo(s, p, r.i, clamp(s.gx + (s.rng() - 0.5) * 0.16, r.x0 + 0.06, r.x1 - 0.14));
    return setState(p, 'walk', 9999);
  }
  // 상자 풀기 (첫 톡 뒤부터, 놀란 지 얼마 안 됐으면 못 푼다)
  const minLeft = d.safe ? 3 : 1;
  if (s.started && p.shakeT <= 0 && s.boxLeft >= minLeft && s.rng() < 0.5) {
    let bi = -1, bd = 1e9;
    for (const b of s.boxes) {
      if (b.done || b.claim) continue;
      const dd = Math.abs(s.rooms[b.room].y0 - s.rooms[p.room].y0) * 3 + Math.abs(b.x - p.x) + (b.room === p.room ? 0 : 0.2);
      if (dd < bd) (bd = dd), (bi = b.id);
    }
    if (bi >= 0 && s.boxes.filter((b) => b.claim).length < s.boxLeft - (minLeft - 1)) {
      const b = s.boxes[bi];
      b.claim = p.id;
      p.box = bi;
      p.act = 'unpack';
      planTo(s, p, b.room, b.x + 0.035);
      return setState(p, 'walk', 9999);
    }
  }
  const i = freeSpot(s, p, p.room);
  if (i < 0) return setState(p, 'act', 120), void (p.act = 'look');
  const q = spotsOf(s)[i];
  p.spot = i;
  p.act = q[2];
  planTo(s, p, q[0], q[1]);
  setState(p, 'walk', 9999);
}
function actLen(s: HauntState, p: Person): number {
  if (p.act === 'unpack') return STAGES[s.stage].unpack;
  if (p.act === 'nap' || p.act === 'bath') return 360 + Math.floor(s.rng() * 240);
  return 200 + Math.floor(s.rng() * 220);
}
/** 집 밖으로: 현관까지 뛰어가 계단을 내려가 차에 탄다 */
function flee(s: HauntState, p: Person) {
  const dr = s.rooms[doorRoom(s)];
  planTo(s, p, dr.i, DOOR_X + 0.03);
  p.path.push({ k: 'o' });
  p.climb = null;
  setState(p, 'flee', 9999);
  ev(s, 'flee', p.x, p.y - 0.08, p.id);
}
function personStep(s: HauntState, p: Person) {
  p.stT++;
  if (p.shakeT > 0) p.shakeT--;
  // 겁이 아주 천천히 식는다 (처음 10초·안개 장난감은 안 식음)
  if (human(p) && awake(p) && s.t > SAFE_T && s.t - p.lastScare > DECAY_WAIT && s.perk[1] !== 2 && p.fv > 0 && !STAGES[s.stage].safe) p.fv = Math.max(0, p.fv - DECAY);
  switch (p.st) {
    case 'idle':
      if (p.stT >= p.stLen) decide(s, p);
      break;
    case 'walk': {
      const spd = p.k === 'dog' || p.k === 'cat' ? 0.0042 : p.k === 'kid' ? 0.0045 : p.shakeT > 0 ? 0.0042 : 0.0032;
      if (walkStep(s, p, s.rooms[p.room].dark > 0 ? spd * 0.6 : spd)) {
        setState(p, 'act', actLen(s, p));
        if (p.act === 'tv') p.face = -1;
        else if (p.act === 'look') p.face = s.rng() < 0.5 ? 1 : -1;
      }
      break;
    }
    case 'act':
      if (p.act === 'unpack' && p.box >= 0 && p.stT >= p.stLen) {
        const b = s.boxes[p.box];
        b.done = true;
        b.doneT = s.t;
        b.claim = 0;
        p.box = -1;
        s.boxLeft--;
        ev(s, 'unpack', b.x, s.rooms[b.room].fl - 0.03, s.boxLeft, b.deco);
        see(s, 'unpack');
        if (s.boxLeft <= 0) settle(s);
        setState(p, 'idle', 20);
      } else if (p.stT >= p.stLen) {
        if (p.item === 'none' && human(p) && p.k !== 'kid' && s.rng() < 0.6) p.item = p.act === 'fridge' ? 'milk' : p.act === 'cook' ? 'plate' : p.act === 'read' || p.act === 'desk' ? 'book' : 'none';
        setState(p, 'idle', 10 + Math.floor(s.rng() * 30));
      }
      break;
    case 'react':
      if (p.stT >= p.stLen) {
        if (p.fv >= p.max) {
          setState(p, 'pack', RX_T.pack);
          p.rx = 'pack';
          p.rxT = s.t;
          ev(s, 'pack', p.x, p.y - 0.1, p.id);
        } else if (p.rx === 'blanket' || p.rx === 'faint' || p.rx === 'splash') setState(p, 'idle', 20);
        else {
          // 놀라서 옆방으로 후다닥
          const nb = s.rooms[p.room].walk, r = s.rooms[nb[Math.floor(s.rng() * nb.length)] ?? p.room];
          planTo(s, p, r.i, r.x0 + 0.08 + s.rng() * (r.x1 - r.x0 - 0.24));
          setState(p, 'panic', 9999);
        }
      }
      break;
    case 'panic':
      if (walkStep(s, p, 0.0075)) setState(p, 'idle', 30 + Math.floor(s.rng() * 30));
      break;
    case 'pack':
      if (p.stT >= p.stLen) flee(s, p);
      break;
    case 'flee':
      if (walkStep(s, p, p.k === 'kid' ? 0.007 : 0.0095)) {
        p.path = [];
        setState(p, 'out', 9999);
        p.outT = 0;
        ev(s, 'door', DOOR_X, s.rooms[doorRoom(s)].fl - 0.08, p.id);
      }
      break;
    case 'out':
      p.outT++;
      if (p.outT >= 70) {
        setState(p, 'gone', 9999);
        p.seat = s.seats++;
        ev(s, 'seat', CAR_X, CAR_Y - 0.06, p.id);
      }
      break;
    case 'bark':
      if (p.stT >= p.stLen) setState(p, 'idle', 20);
      break;
    case 'cheer':
      break;
    case 'gone':
      break;
  }
}

// ───────────────────────────── 겁주기 ─────────────────────────────
function newChain(s: HauntState, x: number, y: number): Chain {
  const c: Chain = { id: ++s.cid, t: s.t, big: 0, small: 0, packs: 0, x, y, lastT: s.t, star: false, lx: x, ly: y };
  s.chains.push(c);
  if (s.chains.length > 12) s.chains.shift();
  return c;
}
const chainOf = (s: HauntState, id: number) => s.chains.find((c) => c.id === id);
function push(s: HauntState, e: Omit<Pend, 'fear2' | 'all'> & { fear2?: number; all?: boolean }) {
  s.pend.push({ fear2: -1, all: false, ...e });
}
/** 크게 놀란 사람의 비명: 같은 방(조금 일찍) · 옆방(위·아래·옆) · (저주받은 인형) 두 칸 옆 */
function scream(s: HauntState, p: Person, depth: number, chain: number, kind: EK = 'scream') {
  const r = s.rooms[p.room], y = p.y - personH(r) * 0.9;
  push(s, { t: s.t + 8, room: p.room, fear: LOUD, depth: depth + 1, chain, kind, x: p.x, y, src: p.id });
  for (const n of r.nb) {
    push(s, { t: s.t + SCREAM_D, room: n, fear: LOUD, depth: depth + 1, chain, kind, x: p.x, y, src: p.id });
    const q = s.rooms[n];
    s.waves.push({ t: s.t, x0: p.x, y0: y, x1: (q.x0 + q.x1) / 2, y1: q.fl - q.H * 0.45, depth: depth + 1 });
  }
  if (s.perk[0] === 2)
    for (const n of r.nb2) {
      push(s, { t: s.t + SCREAM_D * 2, room: n, fear: LOUD, depth: depth + 2, chain, kind, x: p.x, y, src: p.id });
      const q = s.rooms[n];
      s.waves.push({ t: s.t + SCREAM_D, x0: p.x, y0: y, x1: (q.x0 + q.x1) / 2, y1: q.fl - q.H * 0.45, depth: depth + 2 });
    }
  if (s.waves.length > 24) s.waves.splice(0, s.waves.length - 24);
}
/** 크게 놀랐을 때 반응 고르기 (상황에 따라 웃긴 몸짓) */
function pickRx(s: HauntState, p: Person, e: Pend): RX {
  const r = s.rooms[p.room];
  if (p.st === 'act' && p.act === 'bath') return 'splash';
  if (p.st === 'act' && p.act === 'nap') return 'blanket';
  if (p.k === 'grandma' && s.t - p.teethT > TEETH_T) return 'teeth';
  if (p.k === 'grandpa' && s.t - p.wigT > TEETH_T) return 'wig';
  if (p.item !== 'none') return 'spill';
  if (r.wet > 0) return 'slip';
  if (r.dark > 0 || (e.kind === 'prank' && e.fear === DARK)) return 'bump';
  if (p.fv >= p.max * 0.78 && p.fv < p.max) return 'faint';
  return 'jump';
}
function addRx(s: HauntState, rx: RX) {
  if (!s.rdex.includes(rx)) (s.rdex.push(rx), s.newRx.push(rx), see(s, 'rx' + rx), ev(s, 'newrx', 0.5, 0.6, REACTS.indexOf(rx)));
}
/** 옆방 중 (나 말고) 사람이 가장 많은 방 */
function busiest(s: HauntState, rooms: number[], not: number): number {
  let to = -1, tn = -1;
  for (const n of rooms) {
    const k = s.people.reduce((a, q) => a + (q.room === n && q.id !== not && awake(q) ? 1 : 0), 0);
    if (k > tn) (tn = k), (to = n);
  }
  return to;
}
/**
 * 반응이 다음 겁을 나른다 (연쇄의 길):
 *  우유 쏟음 → 물(그 방 바닥이 흥건) · 접시 → 와장창(큰 소리) · 책 → 책 사이 거미 우르르(거미)
 *  할머니 틀니 → 옆방으로 날아가 딱딱딱(노래하는 인형 같은 으스스한 장난감) · 할아버지 가발 → 옆방 누군가 머리에 툭(거미인 줄!)
 *  욕조 풍덩 → 아래층 천장에서 물이 뚝뚝(물)
 */
function carry(s: HauntState, p: Person, rx: RX, depth: number, chain: number) {
  const r = s.rooms[p.room], base = { depth: depth + 1, chain, src: p.id };
  if (p.item !== 'none') {
    const it = p.item, x = p.x + p.face * 0.05, y = p.y - 0.02;
    ev(s, 'spill', p.x + p.face * 0.03, p.y - 0.06, p.id, 0, 0, it);
    if (it === 'milk') (r.wet = Math.max(r.wet, 360)), push(s, { ...base, t: s.t + CRASH_D, room: p.room, fear: WATER, kind: 'spill', x, y });
    else if (it === 'book') push(s, { ...base, t: s.t + CRASH_D, room: p.room, fear: SPIDER, kind: 'bugs', x, y });
    else push(s, { ...base, t: s.t + CRASH_D, room: p.room, fear: LOUD, kind: 'crash', x, y });
    p.item = 'none';
  }
  if (rx === 'teeth' || rx === 'wig') {
    const to = busiest(s, r.nb, p.id);
    if (to >= 0) {
      const q = s.rooms[to], tx = clamp(p.x + (q.x0 + q.x1 - r.x0 - r.x1) / 2, q.x0 + 0.08, q.x1 - 0.12), ty = rx === 'teeth' ? q.fl - 0.075 : q.fl - personH(q) * 0.9;
      push(s, { ...base, t: s.t + 26, room: to, fear: rx === 'teeth' ? DOLL : SPIDER, kind: rx, x: tx, y: ty });
      ev(s, rx === 'teeth' ? 'teethfly' : 'wigfly', p.x, p.y - personH(r) * 0.75, p.id, tx, ty);
      if (rx === 'teeth') p.teethT = s.t;
      else p.wigT = s.t;
    }
  }
  if (rx === 'splash') {
    const below = r.nb.find((n) => s.rooms[n].y0 > r.y0 + 0.01);
    if (below !== undefined) {
      const q = s.rooms[below];
      q.wet = Math.max(q.wet, 300);
      push(s, { ...base, t: s.t + 30, room: below, fear: WATER, kind: 'drip', x: p.x, y: q.y0 + 0.02 });
      ev(s, 'drip', p.x, q.y0 + 0.02, below);
    }
  }
}
function bigScare(s: HauntState, p: Person, e: Pend, c: Chain, damp: number) {
  const base = e.kind === 'prank' ? BIG : BIG_SCREAM;
  const amt = base * (1 + DEPTH_UP * Math.min(6, e.depth - 1)) * lvMul(s) * damp;
  p.fv = Math.min(p.max, p.fv + amt);
  p.lastScare = s.t;
  p.shakeT = SHAKE_T;
  p.hb.push(c.id);
  if (p.hb.length > 6) p.hb.shift();
  c.big++;
  c.lastT = s.t;
  c.lx = p.x;
  c.ly = p.y - personH(s.rooms[p.room]) * 1.42;
  s.sp += 3 * c.big * c.big;
  const rx = pickRx(s, p, e);
  if (p.box >= 0) (s.boxes[p.box].claim = 0), (p.box = -1);
  p.climb = null;
  p.y = s.rooms[p.room].fl;
  p.path = [];
  p.rx = rx;
  p.rxT = s.t;
  setState(p, 'react', RX_T[rx]);
  addRx(s, rx);
  if (rx === 'slip') s.slips++;
  ev(s, 'big', p.x, p.y - personH(s.rooms[p.room]), c.big, e.depth, p.id, rx);
  scream(s, p, e.depth, c.id);
  carry(s, p, rx, e.depth, c.id);
  if (p.fv >= p.max) {
    c.packs++;
    s.sp += 20 * c.packs;
    if (c.packs >= 2 && c.packs > s.bestPack) wow(s, `${c.packs}명 한꺼번에 이사!`, c.packs);
    s.bestPack = Math.max(s.bestPack, c.packs);
    // 이삿짐 비명: 짐 싸며 '이사 갈래!'도 큰 소리
    push(s, { t: s.t + RX_T[rx] + 6, room: p.room, fear: LOUD, depth: e.depth + 1, chain: c.id, kind: 'yell', x: p.x, y: p.y - 0.1, src: p.id });
  }
  starCheck(s, c);
  if (c.big >= 3 && c.big > s.best && !c.star) wow(s, `${c.big}명 비명!`, c.big);
  s.best = Math.max(s.best, c.big);
}
function smallScare(s: HauntState, p: Person, c: Chain, amt: number) {
  p.fv = Math.min(p.max - 1, p.fv + amt * lvMul(s) * (s.perk[1] === 2 ? 2 : 1));
  p.startT = s.t;
  p.hs.push(c.id);
  if (p.hs.length > 6) p.hs.shift();
  c.small++;
  s.sp += 1;
}
function starCheck(s: HauntState, c: Chain) {
  const st = STAGES[s.stage].star;
  if (s.starOk[2] || st.k === 'fast') return;
  const ok = st.k === 'chain' ? c.big >= st.n : st.k === 'pack' ? c.packs >= st.n : s.slips >= st.n;
  if (!ok) return;
  s.starOk[2] = true;
  c.star = true;
  wow(s, st.k === 'chain' ? `한 번에 ${c.big}명 비명!` : st.k === 'pack' ? `한 번에 ${c.packs}명 이사!` : `미끄러뜨리기 ${s.slips}번!`, c.big, true);
  ev(s, 'star3', c.x, c.y);
}
/** 소리·장난이 방에 닿았다 */
function land(s: HauntState, e: Pend) {
  const c = chainOf(s, e.chain);
  if (!c) return;
  const r = s.rooms[e.room], here = s.people.filter((p) => p.room === e.room && inHouse(p) && p.st !== 'flee' && p.st !== 'out');
  // 겁 없는 꼬마가 있으면 그 방은 덜 무섭다 (까르르)
  const kid = here.find((p) => p.k === 'kid' && p.st !== 'pack' && p.st !== 'flee');
  // 유튜버: 그 방에서 어둠 말고 다른 장난을 치면 찍힌다 (그 방은 덜 무섭다)
  const yt = here.find((p) => p.k === 'youtuber' && awake(p) && p.st !== 'react');
  let damp = kid ? 0.45 : 1;
  if (kid && e.kind !== 'leak') (kid.laughT = s.t), addRx(s, 'laugh'), ev(s, 'laugh', kid.x, kid.y - 0.12, kid.id);
  if (yt && e.kind === 'prank' && e.fear !== DARK && !e.all) {
    damp *= 0.5;
    yt.filmT = s.t;
    s.filmed++;
    ev(s, 'film', yt.x, yt.y - 0.12, yt.id);
  }
  for (const p of here) {
    if (p.id === e.src || p.k === 'kid') continue;
    if (p.k === 'dog' || p.k === 'cat') {
      // 큰 소리가 닿으면 멍멍 (한 연쇄에 한 번)
      if (e.fear === LOUD && e.kind !== 'leak' && !p.hb.includes(c.id) && p.st !== 'gone' && p.st !== 'out') {
        p.hb.push(c.id);
        if (p.hb.length > 6) p.hb.shift();
        setState(p, 'bark', RX_T.bark);
        p.path = [];
        p.climb = null;
        p.y = r.fl;
        p.rxT = s.t;
        addRx(s, 'bark');
        ev(s, p.k === 'cat' ? 'hiss' : 'bark', p.x, p.y - 0.06, c.id);
        const kind: EK = p.k === 'cat' ? 'hiss' : 'bark';
        push(s, { t: s.t + BARK_D, room: p.room, fear: LOUD, depth: e.depth + 1, chain: c.id, kind, x: p.x, y: p.y - 0.05, src: p.id });
        for (const n of r.nb) {
          push(s, { t: s.t + BARK_D + 10, room: n, fear: LOUD, depth: e.depth + 1, chain: c.id, kind, x: p.x, y: p.y - 0.05, src: p.id });
          const q = s.rooms[n];
          s.waves.push({ t: s.t, x0: p.x, y0: p.y - 0.05, x1: (q.x0 + q.x1) / 2, y1: q.fl - q.H * 0.45, depth: e.depth + 1 });
        }
      }
      continue;
    }
    // 몸짓 중이거나 겁이 꽉 찬 사람은 더 놀라지 않는다 (짐 싸러 간다)
    if (!awake(p) || p.hb.includes(c.id) || p.st === 'react' || p.fv >= p.max) continue;
    // 겁이 반 넘게 찬 사람은 조마조마 — 무엇에든 크게 놀란다 (조금 덜)
    const match = e.all || p.fear === e.fear || p.fear === e.fear2, jumpy = p.fv >= p.max * JUMPY;
    if ((match || jumpy) && e.kind !== 'leak') {
      bigScare(s, p, e, c, damp * (match ? 1 : JUMPY_MUL));
    } else if (!p.hs.includes(c.id)) smallScare(s, p, c, (e.kind === 'leak' ? LEAK : SMALL) * damp);
  }
}
/** 유령이 물건에 장난 */
function prank(s: HauntState, o: Obj) {
  const d = OD[o.k], r = s.rooms[o.room];
  o.rest = o.restMax = Math.round(OBJ_REST * d.rest * Math.max(0.6, 1 - 0.035 * (s.lv - 1)));
  o.at = s.t;
  o.hits++;
  s.gLast = o.id;
  const c = newChain(s, o.x, o.cy);
  ev(s, 'prank', o.x, o.cy, o.id, 0, 0, o.k);
  see(s, 'obj' + o.k);
  if (o.k === 'lamp' || o.k === 'curtain') r.dark = 170;
  if (o.k === 'sink' || o.k === 'tub' || o.k === 'fishbowl') r.wet = 420;
  // 퇴마사 할머니: 그 방에서 장난치면 소금을 뿌린다 → 유령 어질, 하트 -1
  const ex = s.people.find((p) => p.k === 'exorcist' && p.room === o.room && awake(p) && p.st !== 'react');
  if (ex) {
    ex.saltT = s.t;
    ex.face = o.x > ex.x ? 1 : -1;
    s.gStun = 80;
    s.queue = -1;
    s.salted++;
    ev(s, 'salt', ex.x, ex.y - 0.1, ex.id, o.x, o.cy);
    see(s, 'salt');
    if (s.stage > 0) {
      s.hearts--;
      ev(s, 'heart', s.gx, s.gy);
      if (s.hearts <= 0) return void ((s.phase = 'end'), (s.pt = 0), ev(s, 'end', 0.5, 0.7, 0));
    }
  }
  const base = { depth: 1, chain: c.id, x: o.x, y: o.cy, src: -1 };
  if (d.mode === 'floor') {
    for (const q of s.rooms) if (Math.abs(q.y0 - r.y0) < 1e-6) push(s, { ...base, t: s.t + (q.i === r.i ? 0 : 10), room: q.i, fear: d.fear, kind: 'prank' });
  } else if (d.mode === 'throw') {
    push(s, { ...base, t: s.t, room: r.i, fear: LOUD, kind: 'prank' });
    let to = r.nb[0], tn = -1;
    for (const n of r.nb) {
      const k = peopleIn(s, n).length;
      if (k > tn) (tn = k), (to = n);
    }
    const q = s.rooms[to];
    push(s, { ...base, t: s.t + 16, room: to, fear: LOUD, kind: 'prank' });
    ev(s, 'throw', o.x, o.cy, to, (q.x0 + q.x1) / 2, q.fl - q.H * 0.4);
  } else push(s, { ...base, t: s.t, room: r.i, fear: d.fear, fear2: d.mode === 'two' ? LOUD : -1, all: d.mode === 'all', kind: 'prank' });
  // 어떤 장난이든 옆방까지 '덜컹' 소리가 샌다 (누군가는 놀란다)
  for (const n of r.nb) push(s, { ...base, t: s.t + 12, room: n, fear: d.fear, kind: 'leak' });
}

// ───────────────────────────── 유령 ─────────────────────────────
/** 톡한 곳에서 가장 가까운 물건 (둘레 PICK_R 안에 쉬지 않는 물건이 있으면 그것, 없으면 가장 가까운 것) */
export function pickObj(s: HauntState, x: number, y: number): Obj | null {
  let best: Obj | null = null, bd = 1e9, ready: Obj | null = null, rd = 1e9;
  for (const o of s.objs) {
    const d = hyp(o.x - x, o.cy - y);
    if (d < bd) (bd = d), (best = o);
    if (objReady(o) && d < rd) (rd = d), (ready = o);
  }
  return ready && rd <= PICK_R ? ready : best;
}
function startFly(s: HauntState, o: Obj) {
  const T = Math.round(FLY_T0 + Math.min(1, hyp(o.x - s.gx, o.cy - s.gy) / 0.7) * (FLY_T1 - FLY_T0));
  s.fly = { x0: s.gx, y0: s.gy, obj: o.id, t: 0, T };
  s.gFace = o.x >= s.gx ? 1 : -1;
  s.queue = -1;
  ev(s, 'fly', s.gx, s.gy, o.id);
}
function onTap(s: HauntState, x: number, y: number) {
  const o = pickObj(s, x, y);
  ev(s, 'tap', x, y);
  if (!o) return;
  s.taps++;
  s.stTaps++;
  if (s.firstTap < 0) s.firstTap = s.t;
  if (!s.started) (s.started = true), see(s, 'start');
  if (s.spot && s.spot.id === o.id) s.spot = null;
  if (s.gStun > 0 || s.fly || s.t < s.gReady || s.gWait >= 0) s.queue = o.id;
  else startFly(s, o);
}
function ghostStep(s: HauntState) {
  if (s.gStun > 0) {
    s.gStun--;
    return;
  }
  if (s.fly) {
    const f = s.fly, o = s.objs.find((q) => q.id === f.obj)!;
    f.t++;
    const k = f.t / f.T, e = 1 - (1 - k) * (1 - k);
    s.gx = f.x0 + (o.x - f.x0) * e;
    s.gy = f.y0 + (o.cy - 0.02 - f.y0) * e - Math.sin(k * Math.PI) * 0.05;
    if (f.t >= f.T) {
      s.fly = null;
      if (objReady(o)) (prank(s, o), (s.gReady = s.t + G_REST));
      else s.gWait = o.id;
    }
    return;
  }
  if (s.gWait >= 0) {
    const o = s.objs.find((q) => q.id === s.gWait)!;
    if (s.queue >= 0 && s.queue !== o.id) s.gWait = -1;
    else if (objReady(o)) (s.gWait = -1), prank(s, o), (s.gReady = s.t + G_REST);
    return;
  }
  if (s.queue >= 0 && s.t >= s.gReady) {
    const o = s.objs.find((q) => q.id === s.queue);
    s.queue = -1;
    if (o) startFly(s, o);
  }
}

// ───────────────────────────── 판 흐름 ─────────────────────────────
function settle(s: HauntState) {
  if (STAGES[s.stage].safe) return;
  s.phase = 'settle';
  s.pt = 0;
  for (const p of s.people) if (awake(p)) (p.st = 'cheer'), (p.stT = 0), (p.path = []), (p.climb = null), (p.y = s.rooms[p.room].fl);
  ev(s, 'settle', 0.5, 0.7);
  see(s, 'settle');
}
function clearStage(s: HauntState) {
  const d = STAGES[s.stage];
  s.phase = 'result';
  s.pt = 0;
  s.starOk[0] = true;
  if (d.star.k === 'fast') s.starOk[2] = (s.t - s.firstTap) / 60 <= d.star.n;
  s.starOk[1] = d.star2 === 'box' ? s.boxLeft >= Math.ceil(d.boxes / 2) : d.star2 === 'salt' ? s.salted === 0 : s.filmed === 0;
  s.got = s.starOk.filter(Boolean).length;
  s.stars += s.got;
  s.sp = Math.round((s.sp + CLEAR_PTS) * STAR_MUL[s.got] * (1 + s.stage * 0.2));
  s.gain = s.sp;
  s.pts += s.sp;
  s.sp = 0;
  s.lv++;
  if (!s.fams.includes(s.stage)) s.fams.push(s.stage);
  see(s, 'lv' + s.lv);
  s.spot = null;
  if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * 50);
  ev(s, 'clear', 0.5, 0.7, s.got);
}
function advance(s: HauntState) {
  const d = STAGES[s.stage];
  if (s.won) return void ((s.phase = 'end'), (s.pt = 0), ev(s, 'end', 0.5, 0.7, 1));
  if (d.big && d.ch < PERKS.length && !s.perk[d.ch]) return void ((s.phase = 'pick'), (s.pt = 0), (s.picked = -1), see(s, 'pick' + d.ch), ev(s, 'pickopen', 0.5, 0.7));
  s.stage++;
  newStage(s);
}
function playStep(s: HauntState) {
  for (const o of s.objs) if (o.rest > 0) o.rest--;
  for (const r of s.rooms) {
    if (r.dark > 0) r.dark--;
    if (r.wet > 0) r.wet--;
  }
  ghostStep(s);
  if (s.phase !== 'play') return;
  // 소리·장난이 닿는다 (먼저 일어난 것부터)
  if (s.pend.length) {
    const due = s.pend.filter((e) => e.t <= s.t);
    if (due.length) {
      s.pend = s.pend.filter((e) => e.t > s.t);
      for (const e of due) {
        if (e.kind === 'crash') ev(s, 'crash', e.x, e.y, e.depth);
        land(s, e);
      }
    }
  }
  for (const p of s.people) personStep(s, p);
  if (s.phase !== 'play') return;
  // 괘종시계: 첫 톡 뒤 12초마다 온 집이 덜컹
  if (s.perk[0] === 1 && s.started && ++s.clockT >= 720) {
    s.clockT = 0;
    const c = newChain(s, 0.5, 0.7);
    for (const r of s.rooms) push(s, { t: s.t + 6, room: r.i, fear: LOUD, depth: 1, chain: c.id, kind: 'clock', x: 0.5, y: r.fl - 0.1, src: -1 });
    ev(s, 'clock', 0.5, 0.7);
    see(s, 'clock');
  }
  // 어른이 다 떠나면 꼬마도 끌려 나간다
  const adults = s.people.filter((p) => human(p) && p.k !== 'kid' && inHouse(p) && p.st !== 'flee');
  if (!adults.length) for (const p of s.people) if (p.k === 'kid' && awake(p)) (p.st = 'pack'), (p.stT = 0), (p.stLen = 20), (p.rx = 'pack'), (p.rxT = s.t);
  const left = s.people.filter((p) => human(p) && p.st !== 'gone').length;
  if (left === 0 && !s.pend.length) {
    if (++s.clearT >= 50) clearStage(s);
  }
}

const game: GameDef<HauntState> & { wows(s: HauntState): number } = {
  id: 'hauntfamily',
  name: '👻 이사 온 가족 쫓아내기',
  genes: ['hauntfamily', 'chain', 'collect'],
  twist: '내가 쫓는 게 아니라 비명이 쫓는다 — 물건 하나를 톡 해 한 사람을 놀래면, 그 비명이 벽을 넘어 옆방 사람을 놀래고, 쏟은 우유와 짖는 강아지가 또 다음 사람을 놀래는 겁주기 연쇄',
  rules: [
    '물건을 톡 하면 꼬마 유령이 장난! 머리 위 그림이 그 사람이 무서워하는 것이에요.',
    '크게 놀란 사람의 비명은 옆방·위아래 방까지 번져 또 다른 사람을 놀래요.',
    '겁이 차면 이삿짐 싸서 도망! 상자를 다 풀기 전에 모두 쫓아내요.',
  ],
  controls: 'touch',
  hint: '물건을 톡 — 꼬마 유령이 장난쳐요 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '밤의 인형의 집 — 옆에서 자른 집 단면, 따뜻한 방 불빛',
    mood: '별이 뜬 푸른 밤, 노란 불이 켜진 방마다 새로 이사 온 가족이 산다. 하얀 꼬마 유령이 휙 날아가 액자를 덜컹 — 아빠는 펄쩍, 우유는 철퍽, 강아지는 멍멍.',
    palette: { bg: '#1f2a52', ink: '#3b2a20', muted: '#8a7a66', accent: '#ffd36b', hot: '#ff5a4e', soft: '#fff3d6' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.hearts,
  cleared: (s) => (s.phase === 'result' ? { stage: s.stage, got: s.got, of: 3 } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, hearts: 3, pts: 0, sp: 0, gain: 0, stars: 0, got: 0, starOk: [false, false, false], dead: false, won: false,
      lv: 1, perk: [0, 0], picked: -1, rdex: [], newRx: [], fams: [], rooms: [], objs: [], boxes: [], people: [], nid: 0, seats: 0,
      gx: 0.5, gy: 0.3, fly: null, gReady: 0, queue: -1, gWait: -1, gStun: 0, gFace: 1, gLast: -1,
      pend: [], chains: [], cid: 0, waves: [], events: [], started: false, boxLeft: 0, best: 0, bestPack: 0, slips: 0, salted: 0, filmed: 0, clearT: 0,
      clockT: 0, freeze: 0, down: false, wowN: 0, firstTap: -1, firstBig: -1, taps: 0, stTaps: 0, seen: new Set<string>(), banner: null, spot: null, big: null,
    } as HauntState;
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
    } else if (s.phase === 'settle') {
      for (const q of s.people) q.stT++;
      if (s.pt >= SETTLE_T) {
        s.hearts--;
        ev(s, 'heart', 0.5, 0.6);
        see(s, 'heart');
        s.sp = 0;
        if (s.hearts <= 0) return void ((s.phase = 'end'), (s.pt = 0), ev(s, 'end', 0.5, 0.7, 0));
        newStage(s);
        s.banner = { head: `다시! ${s.stage + 1}판 · ${STAGES[s.stage].fam}`, sub: '상자를 다 풀기 전에 쫓아내요', t: s.t };
      }
    } else if (s.phase === 'result') {
      for (const q of s.people) if (q.st === 'gone' || q.k === 'dog' || q.k === 'cat') q.stT++;
      if ((tap && s.pt >= RES_MIN) || s.pt >= RES_AUTO) advance(s);
    } else if (s.phase === 'pick') {
      const ch = STAGES[s.stage].ch;
      if (s.picked < 0) {
        if (tap && p && s.pt >= PICK_MIN) s.picked = p.x < 0.5 ? 0 : 1;
        else if (s.pt >= PICK_AUTO) s.picked = 0;
        if (s.picked >= 0) (s.perk[ch] = s.picked + 1), (s.pt = 0), see(s, `perk${ch}${s.picked}`), ev(s, 'perk', s.picked ? 0.72 : 0.28, 0.9, s.picked);
      } else if (s.pt >= PICK_AFTER) (s.stage++), newStage(s);
    } else if (s.pt >= END_T) s.dead = true;
    if (s.events.length > 120) s.events.splice(0, s.events.length - 120);
    while (s.events.length && s.t - s.events[0].t > 150) s.events.shift();
    if (s.waves.length) s.waves = s.waves.filter((w) => s.t - w.t < 40);
    if (s.spot && s.t - s.spot.t > 420) s.spot = null;
  },
  over: (s) => s.dead,
  score: (s) => s.pts + s.sp,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const hauntfamily = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
const tapObj = (o: Obj) => at(o.x, o.cy);
/** 유령이 지금 장난을 받을 수 있나 (기억해 두는 톡도 있지만, 봇은 비어 있을 때만 누른다) */
const canAct = (s: HauntState) => s.phase === 'play' && !s.down && !s.fly && s.t >= s.gReady && s.gStun === 0 && s.gWait < 0 && s.queue < 0;
/** 결과 화면·둘 중 하나는 버릇 봇도 그냥 넘긴다 */
function between(s: HauntState, left: boolean): Input | null {
  if (s.phase === 'play') return null;
  if (s.down) return NO;
  if (s.phase === 'result') return s.pt >= RES_MIN ? at(0.5, 0.8) : NO;
  if (s.phase === 'pick') return s.picked < 0 && s.pt >= PICK_MIN ? at(left ? 0.28 : 0.72, 0.9) : NO;
  return NO;
}

/** 이 물건에 지금 장난치면 어떻게 번질까 — 사람 자리를 그대로 두고 연쇄를 따라가 본다 (어림셈) */
interface Sim { id: number; k: Person['k']; room: number; fear: Fear; fv: number; max: number; item: Item; on: boolean; big: boolean; small: boolean; unpack: boolean; teeth: boolean; act: string }
export function judge(s: HauntState, o: Obj): { v: number; big: number; packs: number; salt: boolean } {
  const d = OD[o.k], r = s.rooms[o.room], mul = lvMul(s);
  const ps: Sim[] = s.people.filter((p) => inHouse(p) && p.st !== 'flee').map((p) => ({ id: p.id, k: p.k, room: p.room, fear: p.fear, fv: p.fv, max: p.max, item: p.item, on: awake(p) && p.st !== 'react' && p.fv < p.max, big: false, small: false, unpack: p.act === 'unpack' && p.st === 'act', teeth: (p.k === 'grandma' && s.t - p.teethT > TEETH_T) || (p.k === 'grandpa' && s.t - p.wigT > TEETH_T), act: p.st === 'act' ? p.act ?? '' : '' }));
  type E = { room: number; fear: Fear; fear2: number; all: boolean; depth: number; kind: EK; src: number };
  const q: E[] = [];
  const salt = s.people.some((p) => p.k === 'exorcist' && p.room === o.room && awake(p) && p.st !== 'react');
  if (d.mode === 'floor') {
    for (const x of s.rooms) if (Math.abs(x.y0 - r.y0) < 1e-6) q.push({ room: x.i, fear: d.fear, fear2: -1, all: false, depth: 1, kind: 'prank', src: -1 });
  } else if (d.mode === 'throw') {
    q.push({ room: r.i, fear: LOUD, fear2: -1, all: false, depth: 1, kind: 'prank', src: -1 });
    let to = r.nb[0], tn = -1;
    for (const n of r.nb) {
      const k = ps.filter((p) => p.room === n && p.on).length;
      if (k > tn) (tn = k), (to = n);
    }
    q.push({ room: to, fear: LOUD, fear2: -1, all: false, depth: 1, kind: 'prank', src: -1 });
  } else q.push({ room: r.i, fear: d.fear, fear2: d.mode === 'two' ? LOUD : -1, all: d.mode === 'all', depth: 1, kind: 'prank', src: -1 });
  for (const n of r.nb) q.push({ room: n, fear: d.fear, fear2: -1, all: false, depth: 1, kind: 'leak', src: -1 });
  let v = 0, big = 0, packs = 0, smallMul = s.perk[1] === 2 ? 2 : 1;
  const barked = new Set<number>();
  for (let i = 0; i < q.length && i < 80; i++) {
    const e = q[i];
    const here = ps.filter((p) => p.room === e.room);
    const kid = here.some((p) => p.k === 'kid' && p.on);
    let damp = kid ? 0.45 : 1;
    if (e.kind === 'prank' && e.fear !== DARK && !e.all && here.some((p) => p.k === 'youtuber' && p.on)) (damp *= 0.5), (v -= 6);
    for (const p of here) {
      if (p.id === e.src || p.k === 'kid') continue;
      if (p.k === 'dog' || p.k === 'cat') {
        if (e.fear === LOUD && e.kind !== 'leak' && !barked.has(p.id)) {
          barked.add(p.id);
          q.push({ room: p.room, fear: LOUD, fear2: -1, all: false, depth: e.depth + 1, kind: 'bark', src: p.id });
          for (const n of s.rooms[p.room].nb) q.push({ room: n, fear: LOUD, fear2: -1, all: false, depth: e.depth + 1, kind: 'bark', src: p.id });
        }
        continue;
      }
      if (!p.on || p.big) continue;
      const match = e.all || p.fear === e.fear || p.fear === e.fear2, jumpy = p.fv >= p.max * JUMPY;
      if ((match || jumpy) && e.kind !== 'leak') {
        const amt = (e.kind === 'prank' ? BIG : BIG_SCREAM) * (1 + DEPTH_UP * Math.min(6, e.depth - 1)) * mul * damp * (match ? 1 : JUMPY_MUL), gain = Math.min(p.max - p.fv, amt);
        p.fv += gain;
        p.big = true;
        big++;
        v += gain + 4 + (p.unpack ? 10 : 0) + 3 * big;
        const rr = s.rooms[p.room];
        q.push({ room: p.room, fear: LOUD, fear2: -1, all: false, depth: e.depth + 1, kind: 'scream', src: p.id });
        for (const n of rr.nb) q.push({ room: n, fear: LOUD, fear2: -1, all: false, depth: e.depth + 1, kind: 'scream', src: p.id });
        if (s.perk[0] === 2) for (const n of rr.nb2) q.push({ room: n, fear: LOUD, fear2: -1, all: false, depth: e.depth + 2, kind: 'scream', src: p.id });
        if (p.item !== 'none') q.push({ room: p.room, fear: p.item === 'milk' ? WATER : p.item === 'book' ? SPIDER : LOUD, fear2: -1, all: false, depth: e.depth + 1, kind: 'crash', src: p.id }), (p.item = 'none');
        if (p.act === 'bath') {
          const below = rr.nb.find((n) => s.rooms[n].y0 > rr.y0 + 0.01);
          if (below !== undefined) q.push({ room: below, fear: WATER, fear2: -1, all: false, depth: e.depth + 1, kind: 'drip', src: p.id });
        } else if (p.act !== 'nap' && p.teeth) {
          let to = -1, tn = -1;
          for (const n of rr.nb) {
            const k = ps.filter((x) => x.room === n && x.on && x.id !== p.id).length;
            if (k > tn) (tn = k), (to = n);
          }
          if (to >= 0) q.push({ room: to, fear: p.k === 'grandma' ? DOLL : SPIDER, fear2: -1, all: false, depth: e.depth + 1, kind: 'teeth', src: p.id });
        }
        if (p.fv >= p.max) (packs++, (v += 30 + 15 * packs), (p.on = false), q.push({ room: p.room, fear: LOUD, fear2: -1, all: false, depth: e.depth + 1, kind: 'yell', src: p.id }));
      } else if (!p.small) {
        p.small = true;
        const gain = Math.min(p.max - 1 - p.fv, (e.kind === 'leak' ? LEAK : SMALL) * mul * damp * smallMul);
        p.fv += Math.max(0, gain);
        v += Math.max(0, gain) * 0.8 + (p.unpack ? 2 : 0);
      }
    }
  }
  return { v: salt && s.stage > 0 ? v - 400 : v, big, packs, salt };
}

/** 봇: 연쇄가 가장 크게 번질 물건을 골라 톡 */
export const hauntfamilySmart: Bot<HauntState> = {
  name: '가장 크게 번질 물건으로',
  act(s) {
    const mid = between(s, true);
    if (mid) return mid;
    if (!canAct(s)) return NO;
    const st = STAGES[s.stage].star;
    let best: Obj | null = null, bv = -1e9;
    for (const o of s.objs) {
      if (!objReady(o)) continue;
      const j = judge(s, o);
      let v = j.v;
      // 별 셋째(한 번에 N명)를 아직 못 땄으면 길게 번지는 수를 더 친다
      if (!s.starOk[2]) {
        if (st.k === 'chain') v += j.big * j.big * 5 + (j.big >= st.n ? 80 : 0);
        else if (st.k === 'pack') v += j.packs * j.packs * 25 + (j.packs >= st.n ? 80 : 0);
      }
      if (v > bv) (bv = v), (best = o);
    }
    return best ? tapObj(best) : NO;
  },
};

/** 봇: 아무 때나 아무 데나 톡 */
export const hauntfamilyRandom: Bot<HauntState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    if (s.down) return NO;
    return rng() < 1 / 40 ? { tap: false, dir: 0, pointer: { x: 0.06 + rng() * 0.88, y: 0.25 + rng() * 0.48 } } : NO;
  },
};

/** 버릇 봇: 늘 유령에게서 가장 가까운 물건 */
export const hauntfamilyHabit: Bot<HauntState> = {
  name: '버릇: 늘 가장 가까운 물건',
  act(s) {
    const mid = between(s, true);
    if (mid) return mid;
    if (!canAct(s)) return NO;
    let best: Obj | null = null, bd = 1e9;
    for (const o of s.objs) {
      if (!objReady(o) || o.id === s.gLast) continue;
      const d = hyp(o.x - s.gx, o.cy - s.gy);
      if (d < bd) (bd = d), (best = o);
    }
    return best ? tapObj(best) : NO;
  },
};

/** 독립 버릇 봇: 판이 시작할 때 사람이 가장 많던 방만 (그 방 물건을 돌아가며) */
const habitRoom = new WeakMap<object, { st: number; t: number; room: number }>();
export const hauntfamilyHabit2: Bot<HauntState> = {
  name: '버릇: 늘 같은 방만',
  act(s) {
    const mid = between(s, false);
    if (mid) return mid;
    if (!canAct(s)) return NO;
    let m = habitRoom.get(s);
    if (!m || m.st !== s.stage || s.t < m.t) {
      let room = 0, n = -1;
      for (const r of s.rooms) {
        const k = peopleIn(s, r.i).length;
        if (k > n) (n = k), (room = r.i);
      }
      habitRoom.set(s, (m = { st: s.stage, t: s.t, room }));
    }
    let best: Obj | null = null, bt = 1e9;
    for (const o of s.objs) if (o.room === m.room && objReady(o) && o.at < bt) (bt = o.at), (best = o);
    return best ? tapObj(best) : NO;
  },
};
/** 측정·스크린샷용: k판으로 건너뛰기 */
export const __jump = (s: HauntState, k: number, lv = k + 1, perk: number[] = [k > 3 ? 1 : 0, k > 7 ? 1 : 0]) => ((s.stage = k), (s.lv = lv), (s.perk = perk), newStage(s));

// ───────────────────────────── 그리기: 도구 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const OUT = '#3b2a20';
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
function starPath(ctx: C2, x: number, y: number, r: number, k = 0.47, rot = -Math.PI / 2, n = 5) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, q = i % 2 ? r * k : r;
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
function layer(w: number, h: number, paint: (c: C2) => void) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  paint(c.getContext('2d')!);
  return c;
}
const devScale = (ctx: C2) => (typeof ctx.getTransform === 'function' ? Math.min(3, Math.max(1, Math.round(ctx.getTransform().a || 1))) : 1);
/** 채우고 테두리 */
function ink(g: C2, fill: string | CanvasGradient, lw = LW, stroke = OUT) {
  g.fillStyle = fill;
  g.fill();
  if (lw > 0) (g.strokeStyle = stroke), (g.lineWidth = lw), g.stroke();
}
function shine(g: C2, x: number, y: number, rx: number, ry: number, rot = -0.5, a = 0.55) {
  ell(g, x, y, rx, ry, rot);
  g.fillStyle = `rgba(255,255,255,${a})`;
  g.fill();
}
/** 선 하나 */
function seg(g: C2, x0: number, y0: number, x1: number, y1: number, lw: number, col: string) {
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.strokeStyle = col;
  g.lineWidth = lw;
  g.stroke();
}

// ───────────────────────────── 그리기: 사람 (단위: 키 = 1, 발 가운데 = (0,0), 위 = -y, 오른쪽을 본다) ─────────────────────────────
const LW = 0.045;
type Pose = 'stand' | 'walk0' | 'walk1' | 'sit' | 'kneel' | 'jump' | 'fall' | 'run0' | 'run1' | 'cheer' | 'head';
type Mood = 'calm' | 'worry' | 'scared' | 'shock' | 'dizzy' | 'happy' | 'sleep';
interface Look { skin: string; hair: string; shirt: string; shirt2: string; pants: string; shoe: string; style: MK; costume: number; party: boolean }
/** 판(가족)마다 옷 색 */
const FAM_COL: [string, string, string][] = [
  ['#ff8a5c', '#5aa9e6', '#ffd166'], ['#7bc96f', '#b388eb', '#ff9fb2'], ['#4dc4c4', '#ffb703', '#e76f51'], ['#ff6b9a', '#6bc5ff', '#ffd23f'],
  ['#9b8cf0', '#ff9f6b', '#64d2a8'], ['#ffb347', '#5fa8ff', '#ff6f91'], ['#8ac926', '#c77dff', '#ff595e'], ['#ff7b00', '#7b2cbf', '#43aa8b'],
  ['#00bbf9', '#f15bb5', '#fee440'], ['#90be6d', '#f9844a', '#577590'], ['#e9c46a', '#2a9d8f', '#e76f51'], ['#ef476f', '#118ab2', '#06d6a0'],
];
const HAIR: Record<MK, string> = { dad: '#5a3a24', mom: '#3d2a22', grandma: '#e9e4ea', grandpa: '#cfcbd6', girl: '#8a4a2a', boy: '#2e2622', kid: '#d48a3a', exorcist: '#f2f0f5', youtuber: '#3a2a1e', guestF: '#c8743a', guestM: '#4a3a2e' };
function lookOf(p: Person, stage: number): Look {
  const fc = FAM_COL[STAGES[stage].pal % FAM_COL.length], i = p.id;
  const k = p.k as MK, alt = (i * 7) % 3;
  const shirt = k === 'exorcist' ? '#7b4bc4' : k === 'youtuber' ? '#ff4d4d' : fc[i % 3];
  const guestHair = ['#c8743a', '#2e2622', '#e8c15a', '#a0522d', '#4a3a2e'][(i * 3) % 5];
  return {
    skin: ['#ffd8b8', '#f6c9a0', '#e8b48a', '#ffe0c4'][(i * 5 + stage) % 4], hair: k === 'guestF' || k === 'guestM' ? guestHair : HAIR[k],
    shirt, shirt2: fc[(i + 1) % 3], pants: ['#4a5a8a', '#6a4a3a', '#3a6a5a'][alt], shoe: '#4a3020', style: k, costume: p.costume, party: STAGES[stage].key === 'party' && (k === 'guestF' || k === 'guestM'),
  };
}
/** 얼굴 (머리 가운데 기준, 머리 반지름 r) */
function paintFace(g: C2, r: number, mood: Mood, L: Look) {
  const ex = r * 0.38, ey = r * 0.05, dark = '#2a1d16';
  const glasses = L.style === 'grandma' || L.style === 'grandpa';
  // 볼
  if (mood !== 'scared' && mood !== 'shock') {
    g.fillStyle = 'rgba(255,120,120,.45)';
    ell(g, -ex - r * 0.15, ey + r * 0.32, r * 0.17, r * 0.1);
    g.fill();
    ell(g, ex + r * 0.2, ey + r * 0.32, r * 0.17, r * 0.1);
    g.fill();
  }
  for (const sd of [-1, 1]) {
    const x = sd * ex + r * 0.08, y = ey;
    if (mood === 'dizzy') {
      g.strokeStyle = dark;
      g.lineWidth = r * 0.07;
      g.beginPath();
      for (let k = 0; k < 14; k++) {
        const a = k * 0.9, q = r * 0.02 + k * r * 0.011;
        if (k) g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
        else g.moveTo(x, y);
      }
      g.stroke();
    } else if (mood === 'happy' || mood === 'sleep') {
      g.strokeStyle = dark;
      g.lineWidth = r * 0.08;
      g.beginPath();
      if (mood === 'happy') g.arc(x, y + r * 0.06, r * 0.12, Math.PI * 1.15, Math.PI * 1.85);
      else (g.moveTo(x - r * 0.12, y + r * 0.02), g.quadraticCurveTo(x, y + r * 0.1, x + r * 0.12, y + r * 0.02));
      g.stroke();
    } else if (mood === 'scared' || mood === 'shock') {
      // 놀란 눈: 흰자 크게, 눈동자 콩알
      const k = mood === 'shock' ? 1.25 : 1;
      ell(g, x, y - r * 0.02, r * 0.17 * k, r * 0.21 * k);
      g.fillStyle = '#ffffff';
      g.fill();
      g.strokeStyle = dark;
      g.lineWidth = r * 0.055;
      g.stroke();
      ell(g, x + r * 0.02, y, r * 0.055, r * 0.065);
      g.fillStyle = dark;
      g.fill();
    } else {
      ell(g, x, y, r * 0.085, r * (mood === 'worry' ? 0.11 : 0.12));
      g.fillStyle = dark;
      g.fill();
      ell(g, x - r * 0.03, y - r * 0.045, r * 0.03, r * 0.035);
      g.fillStyle = '#ffffff';
      g.fill();
    }
    // 눈썹
    if (mood === 'worry' || mood === 'scared' || mood === 'shock') {
      g.strokeStyle = L.style === 'grandma' || L.style === 'grandpa' || L.style === 'exorcist' ? '#a8a0a8' : dark;
      g.lineWidth = r * 0.06;
      g.beginPath();
      const by = y - r * (mood === 'shock' ? 0.36 : 0.26);
      g.moveTo(x - r * 0.12, by + sd * -r * 0.0 + r * 0.05 * (sd > 0 ? 1 : 0));
      g.lineTo(x + r * 0.12, by + r * 0.05 * (sd > 0 ? 0 : 1));
      g.stroke();
    }
  }
  if (glasses && mood !== 'shock') {
    g.strokeStyle = '#6a5a4a';
    g.lineWidth = r * 0.05;
    for (const sd of [-1, 1]) (ell(g, sd * ex + r * 0.08, ey, r * 0.18, r * 0.16), g.stroke());
    seg(g, -ex + r * 0.26, ey - r * 0.02, ex - r * 0.1, ey - r * 0.02, r * 0.05, '#6a5a4a');
  }
  // 코
  ell(g, r * 0.2, ey + r * 0.2, r * 0.06, r * 0.05);
  g.fillStyle = 'rgba(200,110,90,.55)';
  g.fill();
  // 입
  const my = ey + r * 0.42, mx = r * 0.1;
  g.strokeStyle = dark;
  g.lineWidth = r * 0.06;
  if (mood === 'shock') {
    // 비명: 크게 벌린 입 (틀니 할머니는 이가 반짝)
    ell(g, mx, my + r * 0.05, r * 0.17, r * 0.22);
    g.fillStyle = '#6a1f1f';
    g.fill();
    g.stroke();
    ell(g, mx, my + r * 0.16, r * 0.1, r * 0.07);
    g.fillStyle = '#ff7a8a';
    g.fill();
  } else if (mood === 'scared') {
    ell(g, mx, my + r * 0.02, r * 0.09, r * 0.12);
    g.fillStyle = '#6a1f1f';
    g.fill();
    g.stroke();
  } else if (mood === 'worry') {
    g.beginPath();
    g.moveTo(mx - r * 0.14, my + r * 0.04);
    g.quadraticCurveTo(mx - r * 0.07, my - r * 0.03, mx, my + r * 0.04);
    g.quadraticCurveTo(mx + r * 0.07, my + r * 0.1, mx + r * 0.14, my + r * 0.02);
    g.stroke();
  } else if (mood === 'happy') {
    g.beginPath();
    g.moveTo(mx - r * 0.16, my - r * 0.02);
    g.quadraticCurveTo(mx, my + r * 0.26, mx + r * 0.16, my - r * 0.02);
    g.closePath();
    g.fillStyle = '#7a2a2a';
    g.fill();
    g.stroke();
  } else if (mood === 'sleep') {
    ell(g, mx, my, r * 0.05, r * 0.04);
    g.fillStyle = dark;
    g.fill();
  } else if (mood === 'dizzy') {
    g.beginPath();
    g.moveTo(mx - r * 0.14, my);
    g.quadraticCurveTo(mx - r * 0.07, my - r * 0.08, mx, my);
    g.quadraticCurveTo(mx + r * 0.07, my + r * 0.08, mx + r * 0.14, my);
    g.stroke();
  } else {
    g.beginPath();
    g.arc(mx, my - r * 0.06, r * 0.13, Math.PI * 0.2, Math.PI * 0.8);
    g.stroke();
  }
  // 콧수염 (아빠·할아버지)
  if ((L.style === 'dad' || L.style === 'grandpa') && mood !== 'shock') {
    g.fillStyle = L.style === 'dad' ? '#4a2f1e' : '#d8d2dc';
    g.beginPath();
    g.moveTo(mx - r * 0.2, my - r * 0.06);
    g.quadraticCurveTo(mx, my - r * 0.2, mx + r * 0.24, my - r * 0.06);
    g.quadraticCurveTo(mx + r * 0.05, my - r * 0.02, mx - r * 0.2, my - r * 0.06);
    g.fill();
  }
}
/** 머리 (머리 가운데 = (0,0), 반지름 r): 뒷머리 → 얼굴 → 앞머리 → 모자 */
function paintHead(g: C2, r: number, L: Look, mood: Mood, hairUp: boolean, wig: boolean) {
  const h = L.hair, lw = r * 0.16;
  g.lineJoin = 'round';
  // 뒷머리
  if (L.style === 'mom' || L.style === 'grandma' || L.style === 'exorcist') {
    ell(g, -r * 0.35, -r * 0.92, r * 0.42, r * 0.38);
    ink(g, h, lw);
  }
  if (L.style === 'girl') {
    for (const sd of [-1, 1]) {
      ell(g, sd * r * 1.02, r * 0.15, r * 0.3, r * 0.45, sd * 0.4);
      ink(g, h, lw);
      ell(g, sd * r * 0.88, -r * 0.22, r * 0.16, r * 0.12);
      ink(g, L.shirt2, lw * 0.7);
    }
  }
  if (L.style === 'guestF') {
    ell(g, -r * 0.1, r * 0.05, r * 1.12, r * 1.02);
    ink(g, h, lw);
  }
  // 얼굴
  ell(g, 0, 0, r, r * 0.98);
  ink(g, lin(g, 0, -r, 0, r, [0, L.skin], [1, shade(L.skin, -14)]), lw);
  // 귀
  ell(g, -r * 0.78, r * 0.1, r * 0.17, r * 0.22);
  ink(g, L.skin, lw * 0.8);
  // 앞머리
  g.fillStyle = h;
  g.strokeStyle = OUT;
  g.lineWidth = lw;
  g.beginPath();
  switch (L.style) {
    case 'dad':
    case 'guestM':
      g.moveTo(-r * 0.98, r * 0.05);
      g.quadraticCurveTo(-r * 1.05, -r * 1.05, r * 0.1, -r * 1.02);
      g.quadraticCurveTo(r * 0.95, -r * 0.95, r * 0.98, -r * 0.2);
      g.quadraticCurveTo(r * 0.5, -r * 0.55, r * 0.05, -r * 0.45);
      g.quadraticCurveTo(-r * 0.45, -r * 0.4, -r * 0.62, -r * 0.05);
      break;
    case 'boy':
    case 'kid':
      g.moveTo(-r * 0.98, r * 0.1);
      for (let k = 0; k <= 6; k++) {
        const a = Math.PI * (1.05 + k * 0.15), q = k % 2 ? r * 1.05 : r * (hairUp ? 1.45 : 1.25);
        g.lineTo(Math.cos(a) * q, Math.sin(a) * q - r * 0.05);
      }
      g.quadraticCurveTo(r * 0.6, -r * 0.4, -r * 0.1, -r * 0.42);
      g.quadraticCurveTo(-r * 0.55, -r * 0.35, -r * 0.7, r * 0.05);
      break;
    case 'grandpa':
      // 대머리 옆머리 (가발이 있으면 위에 갈색 가발)
      g.moveTo(-r * 0.98, r * 0.2);
      g.quadraticCurveTo(-r * 1.08, -r * 0.4, -r * 0.7, -r * 0.55);
      g.quadraticCurveTo(-r * 0.7, -r * 0.1, -r * 0.6, r * 0.2);
      break;
    case 'grandma':
    case 'exorcist':
    case 'mom':
      g.moveTo(-r * 0.98, r * 0.15);
      g.quadraticCurveTo(-r * 1.1, -r * 1.05, r * 0.15, -r * 1.02);
      g.quadraticCurveTo(r * 1.0, -r * 0.9, r * 0.98, -r * 0.05);
      g.quadraticCurveTo(r * 0.7, -r * 0.5, r * 0.2, -r * 0.5);
      g.quadraticCurveTo(-r * 0.2, -r * 0.62, -r * 0.55, -r * 0.3);
      g.quadraticCurveTo(-r * 0.7, -r * 0.1, -r * 0.7, r * 0.15);
      break;
    case 'girl':
    case 'guestF':
      g.moveTo(-r * 1.0, r * 0.3);
      g.quadraticCurveTo(-r * 1.12, -r * 1.05, r * 0.15, -r * 1.04);
      g.quadraticCurveTo(r * 1.05, -r * 0.95, r * 1.0, r * 0.1);
      g.quadraticCurveTo(r * 0.75, -r * 0.4, r * 0.35, -r * 0.42);
      g.lineTo(r * 0.3, -r * 0.62);
      g.quadraticCurveTo(-r * 0.3, -r * 0.4, -r * 0.62, -r * 0.2);
      g.quadraticCurveTo(-r * 0.75, r * 0.05, -r * 0.72, r * 0.3);
      break;
    case 'youtuber':
      g.moveTo(-r * 0.98, r * 0.05);
      g.quadraticCurveTo(-r * 1.0, -r * 0.6, -r * 0.6, -r * 0.62);
      g.lineTo(-r * 0.62, r * 0.05);
      break;
  }
  g.closePath();
  g.fill();
  g.stroke();
  if (hairUp && L.style !== 'boy' && L.style !== 'kid') {
    // 머리카락 쭈뼛
    g.strokeStyle = h === '#e9e4ea' || h === '#cfcbd6' || h === '#f2f0f5' ? '#a8a0b0' : h;
    g.lineWidth = r * 0.12;
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI * (0.25 + k * 0.125);
      g.beginPath();
      g.moveTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
      g.lineTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5);
      g.stroke();
    }
  }
  if (L.style === 'grandpa' && wig) {
    g.beginPath();
    g.moveTo(-r * 0.85, -r * 0.35);
    g.quadraticCurveTo(-r * 0.7, -r * 1.25, r * 0.3, -r * 1.12);
    g.quadraticCurveTo(r * 0.95, -r * 0.95, r * 0.85, -r * 0.4);
    g.quadraticCurveTo(r * 0.2, -r * 0.62, -r * 0.85, -r * 0.35);
    ink(g, '#7a4a28', lw);
  }
  // 모자·장식
  if (L.style === 'exorcist') {
    rr(g, -r * 1.02, -r * 0.62, r * 2.04, r * 0.22, r * 0.08);
    ink(g, '#ffffff', lw * 0.8);
    rr(g, -r * 0.18, -r * 0.7, r * 0.36, r * 0.62, r * 0.04);
    ink(g, '#ffe36b', lw * 0.6);
    seg(g, -r * 0.08, -r * 0.55, r * 0.08, -r * 0.25, r * 0.06, '#d0302a');
    seg(g, r * 0.08, -r * 0.55, -r * 0.08, -r * 0.25, r * 0.06, '#d0302a');
  }
  if (L.style === 'youtuber') {
    // 거꾸로 쓴 모자
    g.beginPath();
    g.moveTo(-r * 0.98, -r * 0.25);
    g.quadraticCurveTo(-r * 0.9, -r * 1.2, r * 0.2, -r * 1.12);
    g.quadraticCurveTo(r * 1.02, -r * 0.95, r * 0.98, -r * 0.3);
    g.closePath();
    ink(g, '#222831', lw);
    rr(g, -r * 1.55, -r * 0.42, r * 0.7, r * 0.2, r * 0.08);
    ink(g, '#222831', lw);
    ell(g, r * 0.15, -r * 0.75, r * 0.14, r * 0.12);
    ink(g, '#ff4d4d', lw * 0.6);
  }
  if (L.party) {
    g.beginPath();
    g.moveTo(-r * 0.4, -r * 0.82);
    g.lineTo(r * 0.05, -r * 1.75);
    g.lineTo(r * 0.5, -r * 0.82);
    g.closePath();
    ink(g, L.shirt2, lw);
    ell(g, r * 0.05, -r * 1.78, r * 0.13, r * 0.13);
    ink(g, '#ffe36b', lw * 0.6);
    seg(g, -r * 0.2, -r * 1.12, r * 0.3, -r * 1.2, r * 0.1, '#ffffff');
  }
  // 할로윈 분장: 1 마녀 모자 · 2 고양이 귀 · 3 호박 모자 · 4 뱀파이어 머리
  if (L.costume === 1) {
    g.beginPath();
    g.moveTo(-r * 1.25, -r * 0.72);
    g.quadraticCurveTo(0, -r * 0.95, r * 1.25, -r * 0.72);
    g.quadraticCurveTo(r * 0.5, -r * 0.7, r * 0.42, -r * 0.85);
    g.lineTo(r * 0.35, -r * 1.9);
    g.quadraticCurveTo(-r * 0.1, -r * 1.6, -r * 0.42, -r * 0.85);
    g.quadraticCurveTo(-r * 0.6, -r * 0.7, -r * 1.25, -r * 0.72);
    ink(g, '#3a2a5a', lw);
    rr(g, -r * 0.45, -r * 1.02, r * 0.9, r * 0.16, r * 0.04);
    ink(g, '#9b5de5', lw * 0.6);
  } else if (L.costume === 2) {
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * r * 0.25, -r * 0.92);
      g.lineTo(sd * r * 0.62, -r * 1.55);
      g.lineTo(sd * r * 0.85, -r * 0.62);
      g.closePath();
      ink(g, '#2b2b2b', lw);
    }
  } else if (L.costume === 3) {
    ell(g, 0, -r * 1.0, r * 0.62, r * 0.4);
    ink(g, '#ff9a2e', lw);
    seg(g, 0, -r * 1.38, r * 0.1, -r * 1.6, r * 0.14, '#3a7a2a');
  } else if (L.costume === 4) {
    g.beginPath();
    g.moveTo(-r * 0.2, -r * 0.98);
    g.lineTo(0, -r * 0.6);
    g.lineTo(r * 0.2, -r * 0.98);
    g.closePath();
    g.fillStyle = '#1a1a2a';
    g.fill();
  }
  paintFace(g, r, mood, L);
}
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16), f = (v: number) => clamp(Math.round(v + k * 2.55), 0, 255);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
};
/** 팔 하나: 어깨 → 손 */
function arm(g: C2, x0: number, y0: number, x1: number, y1: number, L: Look) {
  g.lineCap = 'round';
  seg(g, x0, y0, x1, y1, 0.115, OUT);
  seg(g, x0, y0, x1, y1, 0.075, L.style === 'exorcist' ? '#7b4bc4' : L.shirt);
  ell(g, x1, y1, 0.045, 0.045);
  ink(g, L.skin, LW * 0.7);
}
/** 다리 하나: 엉덩이 → 무릎 → 발 */
function leg(g: C2, x0: number, y0: number, xk: number, yk: number, x1: number, y1: number, L: Look, face = 1) {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(xk, yk);
  g.lineTo(x1, y1);
  g.strokeStyle = OUT;
  g.lineWidth = 0.12;
  g.stroke();
  g.strokeStyle = L.pants;
  g.lineWidth = 0.08;
  g.stroke();
  ell(g, x1 + face * 0.03, y1 + 0.005, 0.06, 0.035);
  ink(g, L.shoe, LW * 0.7);
}
/** 몸통 */
function torso(g: C2, L: Look, y0: number, y1: number, lean = 0) {
  g.save();
  g.translate(0, y1);
  g.rotate(lean);
  const h = y1 - y0;
  g.beginPath();
  g.moveTo(-0.15, 0);
  g.quadraticCurveTo(-0.2, -h * 0.55, -0.13, -h);
  g.quadraticCurveTo(0, -h * 1.08, 0.13, -h);
  g.quadraticCurveTo(0.2, -h * 0.55, 0.15, 0);
  g.closePath();
  if (L.style === 'exorcist') {
    g.moveTo(-0.15, 0);
    g.lineTo(-0.2, h * 0.55);
    g.lineTo(0.2, h * 0.55);
    g.lineTo(0.15, 0);
  }
  ink(g, lin(g, 0, -h, 0, 0, [0, L.shirt], [1, shade(L.shirt, -12)]), LW);
  // 옷 무늬: 줄무늬 · 앞치마 · 후드
  if (L.style === 'mom') {
    rr(g, -0.09, -h * 0.75, 0.18, h * 0.85, 0.03);
    ink(g, '#fff4e0', LW * 0.6);
  } else if (L.style === 'dad' || L.style === 'guestM') {
    g.beginPath();
    g.moveTo(-0.03, -h);
    g.lineTo(0, -h * 0.55);
    g.lineTo(0.03, -h);
    g.fillStyle = L.shirt2;
    g.fill();
  } else if (L.style === 'boy' || L.style === 'kid') {
    for (const yy of [0.3, 0.62]) seg(g, -0.15, -h * yy, 0.15, -h * yy, 0.035, 'rgba(255,255,255,.75)');
  } else if (L.style === 'grandma') {
    for (let k = 0; k < 3; k++) (ell(g, -0.06 + k * 0.06, -h * 0.5, 0.018, 0.018), (g.fillStyle = '#ffffff'), g.fill());
  }
  if (L.costume === 4) {
    g.beginPath();
    g.moveTo(-0.14, -h);
    g.lineTo(-0.3, h * 0.2);
    g.lineTo(0.3, h * 0.2);
    g.lineTo(0.14, -h);
    g.closePath();
    ink(g, '#3a0a1a', LW);
  }
  g.restore();
}
/** 손에 든 것 (손 자리) */
function paintItem(g: C2, it: Item, x: number, y: number) {
  if (it === 'milk') {
    rr(g, x - 0.05, y - 0.13, 0.1, 0.14, 0.015);
    ink(g, '#ffffff', LW * 0.7);
    g.beginPath();
    g.moveTo(x - 0.05, y - 0.13);
    g.lineTo(x, y - 0.18);
    g.lineTo(x + 0.05, y - 0.13);
    g.closePath();
    ink(g, '#eaf6ff', LW * 0.7);
    rr(g, x - 0.05, y - 0.08, 0.1, 0.04, 0.005);
    g.fillStyle = '#5aa9e6';
    g.fill();
  } else if (it === 'plate') {
    for (let k = 0; k < 3; k++) (ell(g, x, y - 0.02 - k * 0.025, 0.1, 0.025), ink(g, k === 2 ? '#ffffff' : '#f3efe6', LW * 0.6));
  } else if (it === 'book') {
    for (let k = 0; k < 3; k++) (rr(g, x - 0.08 + k * 0.01, y - 0.04 - k * 0.04, 0.15, 0.04, 0.008), ink(g, ['#e85d5d', '#5aa9e6', '#7bc96f'][k], LW * 0.6));
  }
}
/** 사람 한 장 (단위: 키 = 1) */
function paintPerson(g: C2, L: Look, pose: Pose, mood: Mood, item: Item, wig: boolean) {
  const kid = L.style === 'kid';
  if (kid) g.scale(0.82, 0.82);
  const hr = kid ? 0.28 : 0.24, hy = -0.74 - (kid ? 0.02 : 0);
  if (pose === 'head') {
    g.translate(0, -hy);
    paintHead(g, hr, L, mood, false, wig);
    return;
  }
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const hairUp = pose === 'jump' || mood === 'shock';
  let hip = -0.2, top = -0.52, lean = 0, headDx = 0, headDy = 0;
  // 다리
  switch (pose) {
    case 'stand': case 'cheer':
      leg(g, -0.06, hip, -0.065, -0.1, -0.07, -0.02, L);
      leg(g, 0.06, hip, 0.065, -0.1, 0.07, -0.02, L);
      break;
    case 'walk0': case 'walk1': {
      const k = pose === 'walk0' ? 1 : -1;
      leg(g, -0.04, hip, -0.04 + k * 0.06, -0.11, -0.03 + k * 0.1, -0.02, L);
      leg(g, 0.04, hip, 0.04 - k * 0.05, -0.1, 0.04 - k * 0.09, -0.02, L);
      break;
    }
    case 'run0': case 'run1': {
      const k = pose === 'run0' ? 1 : -1;
      hip = -0.22;
      top = -0.53;
      lean = 0.28;
      headDx = 0.12;
      leg(g, -0.02, hip, 0.12 * k + 0.04, -0.13, 0.17 * k, -0.04, L);
      leg(g, 0.02, hip, -0.1 * k + 0.02, -0.08, -0.18 * k, -0.06, L);
      break;
    }
    case 'sit':
      hip = -0.3;
      top = -0.62;
      leg(g, -0.04, hip, 0.14, hip, 0.15, -0.02, L);
      leg(g, 0.04, hip, 0.2, hip + 0.01, 0.21, -0.02, L);
      break;
    case 'kneel':
      hip = -0.26;
      top = -0.58;
      lean = 0.15;
      headDx = 0.06;
      leg(g, -0.04, hip, 0.1, -0.12, -0.06, -0.03, L);
      leg(g, 0.04, hip, 0.18, -0.2, 0.2, -0.02, L);
      break;
    case 'jump':
      leg(g, -0.06, hip, -0.17, -0.12, -0.1, -0.02, L);
      leg(g, 0.06, hip, 0.17, -0.12, 0.12, -0.03, L);
      break;
    case 'fall':
      hip = -0.07;
      top = -0.4;
      lean = -0.35;
      headDx = -0.13;
      headDy = 0.02;
      leg(g, -0.02, hip, 0.1, -0.3, 0.2, -0.42, L);
      leg(g, 0.04, hip, 0.22, -0.2, 0.32, -0.32, L);
      break;
  }
  // 뒤팔
  const sh = top + 0.05;
  const armBack = (): [number, number] =>
    pose === 'jump' || pose === 'cheer' ? [-0.3, sh - 0.25] : pose === 'fall' ? [-0.28, hip - 0.08] : pose === 'run0' || pose === 'run1' ? [-0.16, sh + 0.2] : pose === 'sit' ? [0.06, hip - 0.02] : pose === 'kneel' ? [0.22, hip + 0.1] : [-0.17, sh + 0.24];
  {
    const [x, y] = armBack();
    g.save();
    if (lean) g.translate(0, hip), g.rotate(lean * 0.6), g.translate(0, -hip);
    arm(g, -0.1, sh, x, y, L);
    g.restore();
  }
  torso(g, L, top, hip, lean);
  // 머리
  g.save();
  g.translate(headDx, hy + (top + 0.52) + headDy);
  if (pose === 'fall') g.rotate(-0.3);
  if (pose === 'run0' || pose === 'run1') g.rotate(0.15);
  paintHead(g, hr, L, mood, hairUp, wig);
  g.restore();
  // 앞팔 + 든 것
  {
    let x = 0.17, y = sh + 0.24;
    if (pose === 'jump' || pose === 'cheer') (x = 0.3), (y = sh - 0.27);
    else if (pose === 'fall') (x = 0.3), (y = hip - 0.15);
    else if (pose === 'run0' || pose === 'run1') (x = 0.3), (y = sh + 0.05);
    else if (pose === 'sit') (x = 0.24), (y = hip - 0.05);
    else if (pose === 'kneel') (x = 0.28), (y = hip + 0.12);
    else if (item !== 'none') (x = 0.2), (y = sh + 0.16);
    g.save();
    if (lean) g.translate(0, hip), g.rotate(lean * 0.6), g.translate(0, -hip);
    if (item !== 'none' && (pose === 'stand' || pose === 'walk0' || pose === 'walk1' || pose === 'sit')) paintItem(g, item, x + 0.02, y + 0.02);
    arm(g, 0.1, sh, x, y, L);
    g.restore();
  }
}

// ───────────────────────────── 그리기: 강아지 · 고양이 (단위: 몸 길이 = 1, 발 가운데 = (0,0)) ─────────────────────────────
type APose = 'stand' | 'walk0' | 'walk1' | 'sleep' | 'bark';
function paintPet(g: C2, cat: boolean, pose: APose) {
  const fur = cat ? '#3a3448' : '#f2c27a', fur2 = cat ? '#2a2436' : '#ffffff', ear = cat ? '#2a2436' : '#b86a3a', lw = 0.05;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const up = pose === 'bark' ? -0.12 : 0, low = pose === 'sleep';
  // 꼬리
  g.beginPath();
  if (cat) (g.moveTo(-0.36, -0.28), g.quadraticCurveTo(-0.62, -0.4, -0.5, -0.72));
  else (g.moveTo(-0.36, -0.3), g.quadraticCurveTo(-0.5, -0.5 + up, -0.42, -0.62 + up));
  g.strokeStyle = OUT;
  g.lineWidth = 0.13;
  g.stroke();
  g.strokeStyle = fur;
  g.lineWidth = 0.08;
  g.stroke();
  // 다리
  if (!low)
    for (const [x, k] of [[-0.25, 0], [-0.12, 1], [0.18, 0], [0.3, 1]] as [number, number][]) {
      const sw = pose === 'walk0' ? (k ? 0.05 : -0.05) : pose === 'walk1' ? (k ? -0.05 : 0.05) : 0;
      const yy = pose === 'bark' && x > 0 ? -0.18 : 0;
      seg(g, x, -0.2 + (x > 0 ? up : 0), x + sw, -0.02 + yy, 0.12, OUT);
      seg(g, x, -0.2 + (x > 0 ? up : 0), x + sw, -0.02 + yy, 0.08, fur);
    }
  // 몸
  g.save();
  if (pose === 'bark') g.rotate(-0.25);
  ell(g, 0, low ? -0.14 : -0.3, 0.4, low ? 0.15 : 0.18);
  ink(g, lin(g, 0, -0.45, 0, -0.1, [0, fur], [1, shade(fur.length === 7 ? fur : '#f2c27a', -10)]), lw);
  ell(g, 0.08, low ? -0.08 : -0.2, 0.22, 0.07);
  g.fillStyle = fur2;
  g.fill();
  g.restore();
  // 머리
  const hx = low ? 0.38 : 0.36, hy = low ? -0.2 : -0.5 + up * 1.4;
  g.save();
  g.translate(hx, hy);
  if (cat) {
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.05 - 0.04, -0.14);
      g.lineTo(sd * 0.14 - 0.02, -0.32);
      g.lineTo(sd * 0.2 - 0.02, -0.08);
      g.closePath();
      ink(g, ear, lw);
    }
  } else {
    ell(g, -0.16, -0.02, 0.09, 0.17, 0.5);
    ink(g, ear, lw);
  }
  ell(g, 0, 0, 0.2, 0.18);
  ink(g, fur, lw);
  if (!cat) {
    ell(g, 0.12, 0.06, 0.13, 0.1);
    ink(g, '#ffffff', lw * 0.7);
    ell(g, 0.23, 0.02, 0.045, 0.035);
    g.fillStyle = OUT;
    g.fill();
  }
  // 눈·입
  if (low) seg(g, 0.0, -0.03, 0.09, -0.02, 0.03, OUT);
  else {
    ell(g, 0.05, -0.04, 0.035, pose === 'bark' ? 0.05 : 0.04);
    g.fillStyle = cat ? '#ffe36b' : OUT;
    g.fill();
    if (cat) (ell(g, 0.05, -0.04, 0.012, 0.035), (g.fillStyle = OUT), g.fill());
  }
  if (pose === 'bark') {
    ell(g, 0.17, 0.11, 0.07, 0.06);
    ink(g, '#7a2a2a', lw * 0.6);
  }
  g.restore();
  if (!cat && !low) {
    rr(g, 0.18, -0.4 + up, 0.12, 0.05, 0.02);
    ink(g, '#e23b3b', lw * 0.6);
  }
}

// ───────────────────────────── 그리기: 겁 그림 (단위: 반지름 = 1) ─────────────────────────────
function paintFearIcon(g: C2, f: Fear | 'kid' | 'yt') {
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const lw = 0.13;
  if (f === 'kid') {
    heartPath(g, 0, 0.05, 0.62);
    ink(g, '#ff6f91', lw);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 0.1;
    g.beginPath();
    g.arc(0, 0.05, 0.25, 0.2, Math.PI - 0.2);
    g.stroke();
    return;
  }
  switch (f) {
    case 0: // 큰 소리: 스피커 + 소리 물결
      g.beginPath();
      g.moveTo(-0.62, -0.2);
      g.lineTo(-0.38, -0.2);
      g.lineTo(-0.05, -0.5);
      g.lineTo(-0.05, 0.5);
      g.lineTo(-0.38, 0.2);
      g.lineTo(-0.62, 0.2);
      g.closePath();
      ink(g, '#5a6378', lw);
      for (const [r, a] of [[0.32, 0.9], [0.58, 0.85]] as [number, number][]) {
        g.beginPath();
        g.arc(0.02, 0, r, -a, a);
        g.strokeStyle = '#ff7a1a';
        g.lineWidth = 0.16;
        g.stroke();
      }
      break;
    case 1: // 거미
      g.strokeStyle = '#2a2230';
      g.lineWidth = 0.1;
      for (const sd of [-1, 1])
        for (let k = 0; k < 4; k++) {
          const a = -0.9 + k * 0.6;
          g.beginPath();
          g.moveTo(0, 0.05);
          g.quadraticCurveTo(sd * 0.5, -0.2 + a * 0.35, sd * 0.72, 0.15 + a * 0.4);
          g.stroke();
        }
      ell(g, 0, 0.12, 0.38, 0.34);
      ink(g, '#2a2230', 0.06, '#120a18');
      ell(g, 0, -0.26, 0.24, 0.2);
      ink(g, '#2a2230', 0.06, '#120a18');
      for (const sd of [-1, 1]) (ell(g, sd * 0.1, -0.28, 0.08, 0.09), (g.fillStyle = '#ffffff'), g.fill(), ell(g, sd * 0.1, -0.26, 0.035, 0.045), (g.fillStyle = '#120a18'), g.fill());
      break;
    case 2: // 어둠: 깜깜한 동그라미 + 달 + 빛나는 눈
      ell(g, 0, 0, 0.7, 0.7);
      ink(g, '#1d2148', lw);
      g.beginPath();
      g.arc(-0.12, -0.05, 0.36, 0, TAU);
      g.fillStyle = '#ffe36b';
      g.fill();
      g.beginPath();
      g.arc(0.04, -0.14, 0.32, 0, TAU);
      g.fillStyle = '#1d2148';
      g.fill();
      for (const sd of [-1, 1]) (ell(g, 0.2 + sd * 0.12, 0.3, 0.07, 0.05), (g.fillStyle = '#c8f0ff'), g.fill());
      break;
    case 3: // 물방울
      g.beginPath();
      g.moveTo(0, -0.72);
      g.bezierCurveTo(0.2, -0.38, 0.55, -0.05, 0.55, 0.22);
      g.arc(0, 0.22, 0.55, 0, Math.PI);
      g.bezierCurveTo(-0.55, -0.05, -0.2, -0.38, 0, -0.72);
      g.closePath();
      ink(g, lin(g, 0, -0.7, 0, 0.8, [0, '#8fdcff'], [1, '#2f8ee0']), lw, '#1d5a9a');
      shine(g, -0.2, 0.15, 0.1, 0.18, 0.3, 0.8);
      break;
    case 4: // 노래하는 인형: 곰 인형 얼굴 + 음표
      for (const sd of [-1, 1]) (ell(g, sd * 0.36, -0.4, 0.17, 0.17), ink(g, '#c8834a', lw));
      ell(g, 0, -0.02, 0.5, 0.46);
      ink(g, '#d9965a', lw);
      ell(g, 0, 0.12, 0.2, 0.15);
      ink(g, '#f3d2a8', lw * 0.6);
      for (const sd of [-1, 1]) (ell(g, sd * 0.18, -0.1, 0.06, 0.07), (g.fillStyle = '#c0182a'), g.fill());
      g.strokeStyle = '#7a2fd0';
      g.lineWidth = 0.1;
      g.beginPath();
      g.moveTo(0.52, -0.62);
      g.lineTo(0.52, -0.12);
      g.moveTo(0.52, -0.62);
      g.lineTo(0.72, -0.52);
      g.stroke();
      ell(g, 0.44, -0.1, 0.1, 0.08, -0.4);
      g.fillStyle = '#7a2fd0';
      g.fill();
      break;
  }
}

// ───────────────────────────── 스티커 굽기 ─────────────────────────────
/** 사람 스티커 틀 (키 단위): 가로 1.4 · 세로 1.6, 발 = (0.7, 1.35) */
const PW = 1.5, PH = 1.75, POX = 0.75, POY = 1.45;
const SPR = new Map<string, HTMLCanvasElement>();
/** 굽는 크기는 1/3옥타브 계단 */
const sprQ = (px: number) => Math.ceil(2 ** (Math.ceil(Math.log2(Math.max(8, px)) * 3 - 1e-6) / 3));
function spr(key: string, px: number, w: number, h: number, ox: number, oy: number, paint: (g: C2) => void): HTMLCanvasElement {
  const q = sprQ(px), k = key + ':' + q;
  let c = SPR.get(k);
  if (!c) {
    if (SPR.size > 700) SPR.clear();
    c = layer(w * q, h * q, (g) => {
      g.translate(ox * q, oy * q);
      g.scale(q, q);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      paint(g);
    });
    SPR.set(k, c);
  }
  return c;
}
const personKey = (L: Look, pose: Pose, mood: Mood, item: Item, wig: boolean) => `p${L.style}${L.skin}${L.hair}${L.shirt}${L.pants}${L.costume}${L.party ? 1 : 0}${pose}${mood}${item}${wig ? 1 : 0}`;
const personSpr = (L: Look, pose: Pose, mood: Mood, item: Item, wig: boolean, px: number) => spr(personKey(L, pose, mood, item, wig), px, PW, PH, POX, POY, (g) => paintPerson(g, L, pose, mood, item, wig));
function stampP(ctx: C2, c: HTMLCanvasElement, u: number) {
  ctx.drawImage(c, -POX * u, -POY * u, PW * u, PH * u);
}
const petSpr = (cat: boolean, pose: APose, px: number) => spr(`a${cat ? 1 : 0}${pose}`, px, 1.4, 1.1, 0.65, 0.95, (g) => paintPet(g, cat, pose));
function stampA(ctx: C2, c: HTMLCanvasElement, u: number) {
  ctx.drawImage(c, -0.65 * u, -0.95 * u, 1.4 * u, 1.1 * u);
}
const iconSpr = (f: Fear | 'kid', px: number) => spr(`i${f}`, px, 1.8, 1.8, 0.9, 0.9, (g) => paintFearIcon(g, f));
/**
 * 미리 굽기 줄: 판 시작 전·결과 화면에서 그림 프레임 밖(setTimeout)으로 조금씩 굽는다 — 느린 폰에서 놀이 중 한 프레임이 길어지지 않게.
 */
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

// ───────────────────────────── 그리기: 꼬마 유령 ─────────────────────────────
const GOUT = '#3a5a9a';
/** 유령. (x,y) = 몸 가운데, k = 반지름 px, mood: 0 둥실 · 1 휙(날기) · 2 우왁!(장난) · 3 어질(소금) · 4 신남 */
function drawGhost(ctx: C2, x: number, y: number, k: number, lv: number, t: number, mood: number, dir: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const wv = Math.sin(t * 0.2), lw = Math.max(1.6, k * 0.12), boo = mood === 2;
  // 빛
  ctx.fillStyle = radg(ctx, 0, 0, k * 0.3, k * 2.2, [0, lv >= 11 ? 'rgba(255,236,150,.55)' : 'rgba(200,235,255,.5)'], [1, 'rgba(200,235,255,0)']);
  ell(ctx, 0, 0, k * 2.2, k * 2.2);
  ctx.fill();
  if (boo) ctx.scale(1.15, 1.12);
  // 망토 (Lv7~)
  if (lv >= 7) {
    ctx.beginPath();
    ctx.moveTo(-k * 0.75, -k * 0.2);
    ctx.quadraticCurveTo(-dir * k * 1.6, k * 0.4 + wv * k * 0.15, -dir * k * 1.5, k * 1.4);
    ctx.quadraticCurveTo(-dir * k * 0.5, k * 1.15, k * 0.1, k * 1.25);
    ctx.lineTo(k * 0.75, -k * 0.2);
    ctx.closePath();
    ctx.fillStyle = '#6a3fc8';
    ctx.fill();
    ctx.strokeStyle = '#3a1f7a';
    ctx.lineWidth = lw * 0.8;
    ctx.stroke();
  }
  // 몸 (아래가 물결치는 이불 유령)
  ctx.beginPath();
  ctx.moveTo(-k, 0);
  ctx.bezierCurveTo(-k, -k * 1.42, k, -k * 1.42, k, 0);
  ctx.lineTo(k * 1.02, k * 0.75);
  for (let i = 0; i < 4; i++) {
    const x0 = k * (1.02 - (i + 0.5) * 0.51), x1 = k * (1.02 - (i + 1) * 0.51), dy = Math.sin(t * 0.25 + i * 1.6) * k * 0.08;
    ctx.quadraticCurveTo(x0, k * (1.12 + (i % 2 ? -0.05 : 0.08)) + dy, x1, k * 0.82 + dy * 0.5);
  }
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -k * 1.1, 0, k, [0, '#ffffff'], [0.65, '#eef7ff'], [1, '#c9e6ff']);
  ctx.fill();
  ctx.strokeStyle = GOUT;
  ctx.lineWidth = lw;
  ctx.stroke();
  shine(ctx, -k * 0.45, -k * 0.75, k * 0.18, k * 0.28, -0.5, 0.9);
  // 팔 (우왁! 이면 번쩍)
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    const ax = sd * k * 0.98, ay = -k * 0.05;
    if (boo) (ctx.moveTo(ax, ay), ctx.quadraticCurveTo(sd * k * 1.5, -k * 0.5, sd * k * 1.35, -k * 0.95));
    else (ctx.moveTo(ax, ay), ctx.quadraticCurveTo(sd * k * 1.35, k * 0.15 + wv * k * 0.1, sd * k * 1.28, k * 0.42));
    ctx.strokeStyle = GOUT;
    ctx.lineWidth = k * 0.36;
    ctx.stroke();
    ctx.strokeStyle = '#f4faff';
    ctx.lineWidth = k * 0.24;
    ctx.stroke();
  }
  // 나비넥타이 (Lv3~)
  if (lv >= 3) {
    ctx.fillStyle = '#ff4d6d';
    ctx.strokeStyle = '#8f1f3a';
    ctx.lineWidth = lw * 0.6;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, k * 0.36);
      ctx.lineTo(sd * k * 0.34, k * 0.2);
      ctx.lineTo(sd * k * 0.34, k * 0.54);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ell(ctx, 0, k * 0.37, k * 0.08, k * 0.08);
    ctx.fill();
  }
  // 얼굴
  const fx0 = dir * k * 0.12, ey = -k * 0.32;
  for (const sd of [-1, 1]) {
    const px = fx0 + sd * k * 0.36;
    if (mood === 3) {
      ctx.strokeStyle = '#27407a';
      ctx.lineWidth = k * 0.09;
      ctx.beginPath();
      ctx.moveTo(px - k * 0.13, ey - k * 0.13);
      ctx.lineTo(px + k * 0.13, ey + k * 0.13);
      ctx.moveTo(px + k * 0.13, ey - k * 0.13);
      ctx.lineTo(px - k * 0.13, ey + k * 0.13);
      ctx.stroke();
    } else if (mood === 4 || boo) {
      ctx.strokeStyle = '#27407a';
      ctx.lineWidth = k * 0.1;
      ctx.beginPath();
      if (boo) (ctx.moveTo(px - k * 0.14, ey - k * 0.1 * sd * -1 - k * 0.04), ctx.lineTo(px + k * 0.14, ey + k * 0.06 * sd));
      else ctx.arc(px, ey + k * 0.08, k * 0.15, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      if (boo) (ell(ctx, px, ey + k * 0.1, k * 0.12, k * 0.15), (ctx.fillStyle = '#27407a'), ctx.fill());
    } else {
      ell(ctx, px, ey, k * 0.16, k * 0.24);
      ctx.fillStyle = '#27407a';
      ctx.fill();
      ell(ctx, px - k * 0.05, ey - k * 0.09, k * 0.06, k * 0.08);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,140,170,.6)';
  for (const sd of [-1, 1]) (ell(ctx, fx0 + sd * k * 0.64, -k * 0.02, k * 0.15, k * 0.09), ctx.fill());
  ctx.strokeStyle = '#27407a';
  ctx.lineWidth = k * 0.09;
  if (boo) {
    // 우왁! 크게 벌린 입 + 혀
    ell(ctx, fx0, k * 0.2, k * 0.3, k * 0.27);
    ctx.fillStyle = '#3a1a3a';
    ctx.fill();
    ctx.stroke();
    ell(ctx, fx0, k * 0.34, k * 0.16, k * 0.1);
    ctx.fillStyle = '#ff6f91';
    ctx.fill();
  } else if (mood === 1) {
    ell(ctx, fx0, k * 0.06, k * 0.1, k * 0.12);
    ctx.fillStyle = '#27407a';
    ctx.fill();
  } else if (mood === 3) {
    ctx.beginPath();
    ctx.moveTo(fx0 - k * 0.2, k * 0.08);
    ctx.quadraticCurveTo(fx0 - k * 0.1, k * -0.02, fx0, k * 0.08);
    ctx.quadraticCurveTo(fx0 + k * 0.1, k * 0.18, fx0 + k * 0.2, k * 0.08);
    ctx.stroke();
  } else {
    // 장난스러운 미소 + 메롱
    ctx.beginPath();
    ctx.arc(fx0, -k * 0.02, k * 0.17, Math.PI * 0.12, Math.PI * 0.88);
    ctx.stroke();
    ell(ctx, fx0 + k * 0.05, k * 0.17, k * 0.07, k * 0.07);
    ctx.fillStyle = '#ff6f91';
    ctx.fill();
  }
  // 머리 위: 고깔(Lv5~) → 왕관(Lv9~)
  if (lv >= 9) {
    ctx.save();
    ctx.translate(0, -k * 1.02);
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
    ctx.moveTo(-k * 0.6, -k * 0.9);
    ctx.quadraticCurveTo(-k * 0.1, -k * 1.55, -dir * k * 0.45 + wv * k * 0.06, -k * 2.0);
    ctx.quadraticCurveTo(k * 0.25, -k * 1.4, k * 0.6, -k * 0.9);
    ctx.quadraticCurveTo(0, -k * 1.12, -k * 0.6, -k * 0.9);
    ctx.fillStyle = '#3a2a5a';
    ctx.fill();
    ctx.strokeStyle = '#1a0a3a';
    ctx.lineWidth = lw * 0.8;
    ctx.stroke();
    ctx.fillStyle = '#ffe36b';
    starPath(ctx, k * 0.02, -k * 1.25, k * 0.17);
    ctx.fill();
  }
  if (mood === 3) {
    // 소금 맞음: 머리 위 별 빙글
    for (let i = 0; i < 3; i++) {
      const a = t * 0.2 + (i * TAU) / 3;
      starPath(ctx, Math.cos(a) * k * 0.8, -k * 1.25 + Math.sin(a) * k * 0.2, k * 0.17);
      ctx.fillStyle = '#ffe36b';
      ctx.fill();
    }
  }
  ctx.restore();
}
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.12);
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

// ───────────────────────────── 그리기: 물건 (단위: 1 = 화면 폭 10%, 바닥·선반 물건은 아래 가운데 = (0,0), 벽 물건은 가운데, 천장 물건은 매단 곳) ─────────────────────────────
const OW = 2.6, OH = 3.0, OOX = 1.3, OOY = 1.75, OLW = 0.05;
const wood = (g: C2, y0: number, y1: number) => lin(g, 0, y0, 0, y1, [0, '#c8884e'], [1, '#9a6234']);
const OBJ_PAINT: Record<OK, (g: C2) => void> = {
  frame: (g) => {
    rr(g, -0.42, -0.34, 0.84, 0.68, 0.06);
    ink(g, wood(g, -0.34, 0.34), OLW);
    rr(g, -0.32, -0.25, 0.64, 0.5, 0.03);
    ink(g, '#bfe6ff', OLW * 0.6);
    // 가족 사진: 웃는 얼굴 둘
    ell(g, 0, 0.2, 0.32, 0.12);
    g.fillStyle = '#9fd67a';
    g.fill();
    for (const [x, c] of [[-0.12, '#ffd8b8'], [0.13, '#f6c9a0']] as [number, string][]) (ell(g, x, -0.02, 0.09, 0.09), ink(g, c, OLW * 0.5), ell(g, x, 0.14, 0.08, 0.06), ink(g, x < 0 ? '#ff8a5c' : '#5aa9e6', OLW * 0.5));
    seg(g, 0, -0.34, 0, -0.5, 0.03, '#6a4a2a');
    ell(g, 0, -0.52, 0.04, 0.04);
    ink(g, '#d8b060', 0.02);
  },
  pot: (g) => {
    // 가스레인지 + 냄비
    rr(g, -0.55, -0.82, 1.1, 0.82, 0.06);
    ink(g, lin(g, 0, -0.82, 0, 0, [0, '#f4f1ea'], [1, '#d9d3c6']), OLW);
    rr(g, -0.42, -0.6, 0.84, 0.45, 0.05);
    ink(g, '#3a3a44', OLW);
    rr(g, -0.36, -0.54, 0.72, 0.33, 0.04);
    g.fillStyle = 'rgba(255,170,80,.35)';
    g.fill();
    for (let k = 0; k < 3; k++) (ell(g, -0.3 + k * 0.3, -0.72, 0.06, 0.06), ink(g, '#8a8a96', OLW * 0.6));
    ell(g, 0.05, -0.85, 0.45, 0.06);
    ink(g, '#2a2a30', OLW);
    rr(g, -0.32, -1.22, 0.74, 0.38, 0.08);
    ink(g, lin(g, -0.3, 0, 0.4, 0, [0, '#e04a3a'], [1, '#a82a22']), OLW);
    rr(g, -0.36, -1.28, 0.82, 0.1, 0.05);
    ink(g, '#c8392b', OLW);
    ell(g, 0.05, -1.34, 0.07, 0.05);
    ink(g, '#3a2a20', OLW * 0.6);
    for (const sd of [-1, 1]) (rr(g, sd > 0 ? 0.42 : -0.46, -1.12, 0.1, 0.06, 0.02), ink(g, '#3a2a20', OLW * 0.5));
    shine(g, -0.15, -1.1, 0.06, 0.12, 0.2, 0.6);
  },
  chair: (g) => {
    // 흔들의자
    g.beginPath();
    g.moveTo(-0.55, -0.04);
    g.quadraticCurveTo(0, 0.12, 0.55, -0.04);
    g.strokeStyle = OUT;
    g.lineWidth = 0.14;
    g.stroke();
    g.strokeStyle = '#a0643a';
    g.lineWidth = 0.08;
    g.stroke();
    for (const x of [-0.32, 0.28]) (seg(g, x, -0.05, x, -0.48, 0.12, OUT), seg(g, x, -0.05, x, -0.48, 0.07, '#b87442'));
    rr(g, -0.42, -0.56, 0.82, 0.12, 0.04);
    ink(g, '#c8884e', OLW);
    rr(g, -0.4, -1.2, 0.18, 0.68, 0.05);
    ink(g, wood(g, -1.2, -0.5), OLW);
    rr(g, -0.34, -1.1, 0.5, 0.5, 0.12);
    ink(g, '#e8a0b8', OLW);
    rr(g, -0.36, -0.68, 0.72, 0.16, 0.06);
    ink(g, '#e8a0b8', OLW);
  },
  stool: (g) => {
    for (const x of [-0.25, 0.25]) (seg(g, x * 0.7, -0.45, x, 0, 0.12, OUT), seg(g, x * 0.7, -0.45, x, 0, 0.07, '#b87442'));
    rr(g, -0.32, -0.56, 0.64, 0.14, 0.06);
    ink(g, '#d99a5a', OLW);
  },
  web: (g) => {
    // 천장 구석 거미줄 + 작은 거미
    g.strokeStyle = 'rgba(235,235,245,.85)';
    g.lineWidth = 0.035;
    for (let k = 0; k < 5; k++) {
      const a = Math.PI * 0.1 + (k * Math.PI * 0.8) / 4;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * 0.62, Math.sin(a) * 0.62);
      g.stroke();
    }
    for (const r of [0.2, 0.38, 0.55]) {
      g.beginPath();
      for (let k = 0; k <= 4; k++) {
        const a = Math.PI * 0.1 + (k * Math.PI * 0.8) / 4;
        if (k) g.quadraticCurveTo(Math.cos(a - 0.3) * r * 0.85, Math.sin(a - 0.3) * r * 0.85, Math.cos(a) * r, Math.sin(a) * r);
        else g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.stroke();
    }
    paintSpider(g, 0.05, 0.38, 0.13);
  },
  wardrobe: (g) => {
    rr(g, -0.42, -1.5, 0.84, 1.5, 0.06);
    ink(g, wood(g, -1.5, 0), OLW);
    rr(g, -0.48, -1.56, 0.96, 0.12, 0.04);
    ink(g, '#8a5428', OLW);
    for (const sd of [-1, 1]) {
      rr(g, sd > 0 ? 0.02 : -0.36, -1.36, 0.34, 1.2, 0.04);
      ink(g, '#b97a44', OLW * 0.7);
      rr(g, sd > 0 ? 0.08 : -0.3, -1.24, 0.22, 0.42, 0.03);
      g.strokeStyle = 'rgba(80,40,20,.35)';
      g.lineWidth = 0.03;
      g.stroke();
      ell(g, sd * 0.07, -0.8, 0.035, 0.035);
      ink(g, '#ffd36b', 0.02);
    }
    rr(g, -0.38, -0.1, 0.12, 0.1, 0.02);
    ink(g, '#6a3a1a', OLW * 0.6);
    rr(g, 0.26, -0.1, 0.12, 0.1, 0.02);
    ink(g, '#6a3a1a', OLW * 0.6);
  },
  lamp: (g) => {
    seg(g, 0, 0, 0, 0.3, 0.035, '#5a4a3a');
    g.beginPath();
    g.moveTo(-0.08, 0.3);
    g.lineTo(-0.34, 0.6);
    g.lineTo(0.34, 0.6);
    g.lineTo(0.08, 0.3);
    g.closePath();
    ink(g, lin(g, 0, 0.3, 0, 0.6, [0, '#ffd88a'], [1, '#f0a04a']), OLW);
  },
  tv: (g) => {
    rr(g, -0.5, -0.42, 1.0, 0.42, 0.04);
    ink(g, wood(g, -0.42, 0), OLW);
    rr(g, -0.42, -0.32, 0.36, 0.22, 0.03);
    g.strokeStyle = 'rgba(80,40,20,.4)';
    g.lineWidth = 0.03;
    g.stroke();
    rr(g, -0.46, -1.1, 0.92, 0.66, 0.08);
    ink(g, '#3a3f4a', OLW);
    rr(g, -0.38, -1.02, 0.76, 0.5, 0.05);
    ink(g, '#1d2438', OLW * 0.6);
    seg(g, -0.15, -1.1, -0.3, -1.38, 0.035, '#5a5a6a');
    seg(g, 0.15, -1.1, 0.3, -1.38, 0.035, '#5a5a6a');
  },
  curtain: (g) => {
    rr(g, -0.38, -0.46, 0.76, 0.86, 0.04);
    ink(g, '#e8d8b0', OLW);
    rr(g, -0.32, -0.4, 0.64, 0.74, 0.02);
    g.fillStyle = lin(g, 0, -0.4, 0, 0.34, [0, '#1e2a66'], [1, '#3a3f8a']);
    g.fill();
    ell(g, 0.12, -0.18, 0.08, 0.08);
    g.fillStyle = '#fff4c0';
    g.fill();
    seg(g, 0, -0.4, 0, 0.34, 0.04, '#e8d8b0');
    seg(g, -0.32, -0.03, 0.32, -0.03, 0.04, '#e8d8b0');
    seg(g, -0.52, -0.52, 0.52, -0.52, 0.06, '#8a5428');
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.5, -0.52);
      g.quadraticCurveTo(sd * 0.3, -0.1, sd * 0.42, 0.46);
      g.lineTo(sd * 0.56, 0.46);
      g.lineTo(sd * 0.56, -0.52);
      g.closePath();
      ink(g, '#d0506a', OLW * 0.8);
    }
  },
  sink: (g) => {
    rr(g, -0.5, -0.82, 1.0, 0.82, 0.05);
    ink(g, lin(g, 0, -0.82, 0, 0, [0, '#8fc8e8'], [1, '#5a9ac0']), OLW);
    for (const sd of [-1, 1]) (rr(g, sd > 0 ? 0.04 : -0.42, -0.68, 0.38, 0.6, 0.04), (g.strokeStyle = 'rgba(30,60,90,.4)'), (g.lineWidth = 0.03), g.stroke(), ell(g, sd * 0.08, -0.4, 0.03, 0.05), ink(g, '#ffffff', 0.02));
    rr(g, -0.56, -0.92, 1.12, 0.12, 0.04);
    ink(g, '#e8e4dc', OLW);
    // 수도꼭지
    g.beginPath();
    g.moveTo(0.1, -0.92);
    g.lineTo(0.1, -1.18);
    g.quadraticCurveTo(0.1, -1.3, -0.05, -1.3);
    g.lineTo(-0.15, -1.3);
    g.lineTo(-0.15, -1.2);
    g.strokeStyle = OUT;
    g.lineWidth = 0.12;
    g.stroke();
    g.strokeStyle = '#c8d0d8';
    g.lineWidth = 0.07;
    g.stroke();
    ell(g, 0.1, -1.08, 0.08, 0.04);
    ink(g, '#e04a4a', OLW * 0.6);
  },
  tub: (g) => {
    for (const x of [-0.55, 0.55]) (ell(g, x, -0.06, 0.08, 0.07), ink(g, '#d8b060', OLW));
    g.beginPath();
    g.moveTo(-0.72, -0.58);
    g.lineTo(0.72, -0.58);
    g.quadraticCurveTo(0.7, -0.06, 0.4, -0.08);
    g.lineTo(-0.4, -0.08);
    g.quadraticCurveTo(-0.7, -0.06, -0.72, -0.58);
    g.closePath();
    ink(g, lin(g, 0, -0.6, 0, -0.08, [0, '#ffffff'], [1, '#d8e6ef']), OLW);
    rr(g, -0.78, -0.64, 1.56, 0.1, 0.05);
    ink(g, '#f4f8fb', OLW);
    // 거품
    for (let k = 0; k < 6; k++) (ell(g, -0.5 + k * 0.2, -0.66 - (k % 2) * 0.05, 0.1, 0.08), ink(g, '#f4fbff', 0.02, '#a8c8dc'));
    // 샤워기
    g.beginPath();
    g.moveTo(0.66, -0.6);
    g.lineTo(0.66, -1.25);
    g.quadraticCurveTo(0.66, -1.35, 0.52, -1.35);
    g.strokeStyle = OUT;
    g.lineWidth = 0.1;
    g.stroke();
    g.strokeStyle = '#c8d0d8';
    g.lineWidth = 0.06;
    g.stroke();
    ell(g, 0.48, -1.3, 0.09, 0.05, -0.4);
    ink(g, '#c8d0d8', OLW * 0.6);
    paintDuck(g, -0.35, -0.72);
  },
  fishbowl: (g) => {
    ell(g, 0, -0.3, 0.32, 0.3);
    ink(g, 'rgba(190,235,255,.75)', OLW);
    g.save();
    ell(g, 0, -0.3, 0.3, 0.28);
    g.clip();
    g.fillStyle = 'rgba(80,170,230,.55)';
    g.fillRect(-0.4, -0.38, 0.8, 0.5);
    g.restore();
    ell(g, 0, -0.56, 0.2, 0.05);
    ink(g, 'rgba(220,245,255,.9)', OLW * 0.6);
    paintFish(g, 0.02, -0.26, 0.1);
    shine(g, -0.15, -0.42, 0.04, 0.08, -0.3, 0.8);
  },
  doll: (g) => {
    // 앉아 있는 곰 인형 (리본)
    ell(g, 0, -0.22, 0.24, 0.22);
    ink(g, '#d9965a', OLW);
    for (const sd of [-1, 1]) (ell(g, sd * 0.2, -0.06, 0.1, 0.08), ink(g, '#c8834a', OLW * 0.8));
    for (const sd of [-1, 1]) (ell(g, sd * 0.16, -0.72, 0.08, 0.08), ink(g, '#c8834a', OLW * 0.8));
    ell(g, 0, -0.56, 0.22, 0.2);
    ink(g, '#d9965a', OLW);
    ell(g, 0, -0.5, 0.09, 0.07);
    ink(g, '#f3d2a8', OLW * 0.5);
    for (const sd of [-1, 1]) (ell(g, sd * 0.08, -0.6, 0.03, 0.035), (g.fillStyle = OUT), g.fill());
    g.fillStyle = '#ff4d6d';
    for (const sd of [-1, 1]) (g.beginPath(), g.moveTo(0, -0.37), g.lineTo(sd * 0.12, -0.42), g.lineTo(sd * 0.12, -0.3), g.closePath(), g.fill());
  },
  piano: (g) => {
    rr(g, -0.62, -1.12, 1.24, 1.12, 0.05);
    ink(g, lin(g, 0, -1.1, 0, 0, [0, '#3a2a3a'], [1, '#22161f']), OLW);
    rr(g, -0.68, -1.18, 1.36, 0.1, 0.04);
    ink(g, '#4a3448', OLW);
    rr(g, -0.56, -0.62, 1.12, 0.16, 0.02);
    ink(g, '#ffffff', OLW * 0.6);
    g.fillStyle = OUT;
    for (let k = 0; k < 9; k++) if (k % 7 !== 2 && k % 7 !== 6) g.fillRect(-0.5 + k * 0.12, -0.62, 0.05, 0.09);
    rr(g, -0.3, -1.02, 0.6, 0.3, 0.03);
    ink(g, '#f4ead0', OLW * 0.6);
    for (const x of [-0.55, 0.5]) (rr(g, x, -0.46, 0.06, 0.46, 0.02), ink(g, '#3a2a3a', OLW * 0.6));
    shine(g, -0.4, -0.95, 0.05, 0.12, 0, 0.35);
  },
  musicbox: (g) => {
    rr(g, -0.3, -0.3, 0.6, 0.3, 0.04);
    ink(g, lin(g, 0, -0.3, 0, 0, [0, '#ff9fb2'], [1, '#e0607a']), OLW);
    rr(g, -0.33, -0.38, 0.66, 0.1, 0.04);
    ink(g, '#ffd36b', OLW);
    ell(g, 0, -0.16, 0.06, 0.06);
    ink(g, '#ffd36b', OLW * 0.5);
  },
  mirror: (g) => {
    ell(g, 0, 0, 0.36, 0.5);
    ink(g, '#d8b060', OLW * 1.4);
    ell(g, 0, 0, 0.28, 0.42);
    ink(g, lin(g, -0.3, -0.4, 0.3, 0.4, [0, '#e8f6ff'], [1, '#9fc8e0']), OLW * 0.6);
    seg(g, -0.12, -0.25, 0.04, -0.33, 0.05, 'rgba(255,255,255,.9)');
    seg(g, -0.16, -0.12, 0.08, -0.24, 0.04, 'rgba(255,255,255,.7)');
  },
  books: (g) => {
    rr(g, -0.5, -0.06, 1.0, 0.06, 0.02);
    ink(g, '#8a5428', OLW * 0.8);
    const cols = ['#e85d5d', '#5aa9e6', '#7bc96f', '#ffd166', '#b388eb', '#ff9f6b'];
    for (let k = 0; k < 6; k++) {
      const hgt = 0.42 + ((k * 7) % 3) * 0.06;
      rr(g, -0.44 + k * 0.14, -0.06 - hgt, 0.12, hgt, 0.02);
      ink(g, cols[k], OLW * 0.7);
      seg(g, -0.44 + k * 0.14 + 0.02, -0.06 - hgt * 0.75, -0.44 + k * 0.14 + 0.1, -0.06 - hgt * 0.75, 0.025, 'rgba(255,255,255,.7)');
    }
  },
  radio: (g) => {
    rr(g, -0.42, -0.5, 0.84, 0.5, 0.1);
    ink(g, lin(g, 0, -0.5, 0, 0, [0, '#e8b070'], [1, '#b8783a']), OLW);
    rr(g, -0.34, -0.42, 0.4, 0.34, 0.05);
    ink(g, '#5a3a22', OLW * 0.6);
    for (let k = 0; k < 4; k++) seg(g, -0.3, -0.36 + k * 0.08, 0.02, -0.36 + k * 0.08, 0.025, '#8a6a4a');
    ell(g, 0.2, -0.32, 0.09, 0.09);
    ink(g, '#f4ead0', OLW * 0.6);
    ell(g, 0.2, -0.13, 0.06, 0.06);
    ink(g, '#3a2a20', OLW * 0.5);
    seg(g, 0.3, -0.5, 0.48, -0.8, 0.03, '#5a5a6a');
  },
  pumpkin: (g) => {
    for (const [x, rx] of [[-0.25, 0.25], [0.25, 0.25], [0, 0.3]] as [number, number][]) (ell(g, x, -0.3, rx, 0.3), ink(g, lin(g, 0, -0.6, 0, 0, [0, '#ffae42'], [1, '#e06a10']), OLW));
    seg(g, 0, -0.58, 0.05, -0.74, 0.08, '#3a7a2a');
    g.fillStyle = '#ffe36b';
    for (const sd of [-1, 1]) (g.beginPath(), g.moveTo(sd * 0.16, -0.42), g.lineTo(sd * 0.06, -0.3), g.lineTo(sd * 0.24, -0.3), g.closePath(), g.fill());
    g.beginPath();
    g.moveTo(-0.2, -0.2);
    for (let k = 0; k <= 4; k++) g.lineTo(-0.2 + k * 0.1, k % 2 ? -0.1 : -0.18);
    g.lineTo(0.2, -0.08);
    g.quadraticCurveTo(0, 0.0, -0.2, -0.08);
    g.closePath();
    g.fill();
  },
};
function paintSpider(g: C2, x: number, y: number, r: number) {
  g.strokeStyle = '#1a1420';
  g.lineWidth = r * 0.25;
  for (const sd of [-1, 1])
    for (let k = 0; k < 4; k++) {
      const a = -0.7 + k * 0.45;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + sd * r * 1.3, y + a * r - r * 0.6, x + sd * r * 1.8, y + a * r * 1.2 + r * 0.3);
      g.stroke();
    }
  ell(g, x, y, r, r * 0.9);
  ink(g, '#2a2230', r * 0.15, '#120a18');
  for (const sd of [-1, 1]) (ell(g, x + sd * r * 0.35, y - r * 0.15, r * 0.25, r * 0.28), (g.fillStyle = '#ffffff'), g.fill(), ell(g, x + sd * r * 0.35, y - r * 0.08, r * 0.12, r * 0.14), (g.fillStyle = '#120a18'), g.fill());
}
function paintDuck(g: C2, x: number, y: number) {
  ell(g, x, y, 0.12, 0.08);
  ink(g, '#ffd23f', OLW * 0.6);
  ell(g, x + 0.08, y - 0.1, 0.07, 0.07);
  ink(g, '#ffd23f', OLW * 0.6);
  g.fillStyle = '#ff8a2e';
  g.beginPath();
  g.moveTo(x + 0.14, y - 0.1);
  g.lineTo(x + 0.22, y - 0.08);
  g.lineTo(x + 0.14, y - 0.06);
  g.fill();
}
function paintFish(g: C2, x: number, y: number, r: number) {
  ell(g, x, y, r, r * 0.6);
  ink(g, '#ff8a2e', r * 0.25);
  g.beginPath();
  g.moveTo(x - r * 0.9, y);
  g.lineTo(x - r * 1.5, y - r * 0.5);
  g.lineTo(x - r * 1.5, y + r * 0.5);
  g.closePath();
  ink(g, '#ff8a2e', r * 0.25);
  ell(g, x + r * 0.45, y - r * 0.15, r * 0.14, r * 0.14);
  g.fillStyle = OUT;
  g.fill();
}
const objSpr = (k: OK, px: number) => spr('o' + k, px, OW, OH, OOX, OOY, (g) => OBJ_PAINT[k](g));
function stampO(ctx: C2, c: HTMLCanvasElement, u: number) {
  ctx.drawImage(c, -OOX * u, -OOY * u, OW * u, OH * u);
}
/** 물건 크기 배수 (방이 낮은 집은 조금 작게) */
const objK = (r: RoomDef) => Math.sqrt((r.y1 - r.y0) / 0.33);
/** 물건 그림 기준점: 바닥·선반은 바닥, 벽은 가운데, 천장은 매단 곳 */
function objAnchor(s: HauntState, o: Obj): [number, number] {
  const r = s.rooms[o.room];
  if (o.place === 'ceil') return [o.x, r.y0 + 0.004];
  if (o.place === 'shelf') return [o.x, r.fl - r.H * 0.38];
  if (o.place === 'wall') return [o.x, o.cy];
  return [o.x, r.fl];
}

// ───────────────────────────── 그리기: 상자 · 풀린 상자(새 살림) ─────────────────────────────
function paintBox(g: C2) {
  rr(g, -0.32, -0.5, 0.64, 0.5, 0.03);
  ink(g, lin(g, 0, -0.5, 0, 0, [0, '#e0b070'], [1, '#c08a48']), OLW);
  g.beginPath();
  g.moveTo(-0.32, -0.5);
  g.lineTo(-0.2, -0.62);
  g.lineTo(0.42, -0.62);
  g.lineTo(0.32, -0.5);
  g.closePath();
  ink(g, '#ecc488', OLW);
  rr(g, -0.06, -0.5, 0.12, 0.5, 0.01);
  g.fillStyle = 'rgba(120,80,40,.35)';
  g.fill();
  seg(g, -0.2, -0.3, 0.2, -0.3, 0.03, 'rgba(120,70,30,.5)');
}
/** 풀린 상자에서 나온 살림: 화분 · 기타 · 스탠드 · 곰돌이 · 지구본 · 꽃병 */
function paintDeco(g: C2, k: number) {
  switch (k % 6) {
    case 0:
      rr(g, -0.18, -0.3, 0.36, 0.3, 0.05);
      ink(g, '#d0703a', OLW);
      for (const [x, y, a] of [[-0.15, -0.55, -0.6], [0.12, -0.6, 0.5], [0, -0.75, 0]] as [number, number, number][]) (ell(g, x, y, 0.1, 0.24, a), ink(g, '#5fb04a', OLW * 0.7));
      break;
    case 1:
      ell(g, 0, -0.22, 0.2, 0.22);
      ink(g, '#e08a3a', OLW);
      ell(g, 0, -0.46, 0.14, 0.14);
      ink(g, '#e08a3a', OLW);
      seg(g, 0, -0.55, 0.05, -1.0, 0.08, '#6a3a1a');
      ell(g, 0, -0.26, 0.06, 0.06);
      g.fillStyle = OUT;
      g.fill();
      break;
    case 2:
      seg(g, 0, 0, 0, -0.7, 0.06, '#5a5a6a');
      ell(g, 0, -0.02, 0.15, 0.04);
      ink(g, '#5a5a6a', OLW * 0.6);
      g.beginPath();
      g.moveTo(-0.08, -0.7);
      g.lineTo(-0.2, -0.95);
      g.lineTo(0.2, -0.95);
      g.lineTo(0.08, -0.7);
      g.closePath();
      ink(g, '#ffe08a', OLW);
      break;
    case 3:
      ell(g, 0, -0.18, 0.18, 0.17);
      ink(g, '#c8a0e8', OLW);
      ell(g, 0, -0.42, 0.15, 0.14);
      ink(g, '#c8a0e8', OLW);
      for (const sd of [-1, 1]) (ell(g, sd * 0.12, -0.54, 0.05, 0.05), ink(g, '#c8a0e8', OLW * 0.6));
      for (const sd of [-1, 1]) (ell(g, sd * 0.05, -0.44, 0.02, 0.025), (g.fillStyle = OUT), g.fill());
      break;
    case 4:
      seg(g, 0, 0, 0, -0.25, 0.06, '#8a5428');
      ell(g, 0, -0.02, 0.14, 0.04);
      ink(g, '#8a5428', OLW * 0.6);
      ell(g, 0, -0.45, 0.2, 0.2);
      ink(g, lin(g, -0.2, -0.6, 0.2, -0.3, [0, '#6ac8ff'], [1, '#3a8ad0']), OLW);
      ell(g, -0.05, -0.47, 0.08, 0.06);
      g.fillStyle = '#7bc96f';
      g.fill();
      break;
    default:
      g.beginPath();
      g.moveTo(-0.1, 0);
      g.quadraticCurveTo(-0.2, -0.2, -0.08, -0.35);
      g.lineTo(0.08, -0.35);
      g.quadraticCurveTo(0.2, -0.2, 0.1, 0);
      g.closePath();
      ink(g, '#5aa9e6', OLW);
      for (const [x, c] of [[-0.1, '#ff6f91'], [0.08, '#ffd23f'], [0, '#ffffff']] as [number, string][]) (ell(g, x, -0.5 - Math.abs(x), 0.08, 0.08), ink(g, c, OLW * 0.6));
  }
}
const boxSpr = (px: number) => spr('box', px, 1.2, 1.2, 0.5, 0.9, (g) => paintBox(g));
const decoSpr = (k: number, px: number) => spr('deco' + (k % 6), px, 1.2, 1.4, 0.6, 1.2, (g) => paintDeco(g, k));

// ───────────────────────────── 그리기: 차 (단위: 차 길이 = 1, 바퀴 바닥 = 0) ─────────────────────────────
function paintCar(g: C2, col: string) {
  g.lineJoin = 'round';
  rr(g, -0.5, -0.3, 1.0, 0.22, 0.08);
  ink(g, lin(g, 0, -0.3, 0, -0.08, [0, col], [1, shade(col, -18)]), 0.018);
  g.beginPath();
  g.moveTo(-0.34, -0.3);
  g.quadraticCurveTo(-0.3, -0.52, -0.1, -0.52);
  g.lineTo(0.18, -0.52);
  g.quadraticCurveTo(0.34, -0.5, 0.4, -0.3);
  g.closePath();
  ink(g, col, 0.018);
  for (const [x0, x1] of [[-0.29, -0.07], [-0.03, 0.18], [0.21, 0.34]] as [number, number][]) {
    g.beginPath();
    g.moveTo(x0, -0.32);
    g.lineTo(x0 + (x0 < -0.2 ? 0.04 : 0), -0.47);
    g.lineTo(x1 - (x1 > 0.3 ? 0.06 : 0), -0.47);
    g.lineTo(x1, -0.32);
    g.closePath();
    ink(g, 'rgba(190,230,255,.9)', 0.012);
  }
  for (const x of [-0.3, 0.3]) {
    ell(g, x, -0.08, 0.09, 0.09);
    ink(g, '#2a2a30', 0.018);
    ell(g, x, -0.08, 0.04, 0.04);
    ink(g, '#c8c8d0', 0.01);
  }
  ell(g, 0.48, -0.22, 0.03, 0.04);
  ink(g, '#fff4b0', 0.01);
  rr(g, -0.52, -0.2, 0.05, 0.05, 0.01);
  ink(g, '#ff5a4e', 0.01);
  shine(g, -0.2, -0.27, 0.12, 0.02, 0, 0.5);
}
const carSpr = (col: string, px: number) => spr('car' + col, px, 1.2, 0.7, 0.6, 0.62, (g) => paintCar(g, col));

// ───────────────────────────── 그리기: 장 끝 선물 (집의 큰 물건) ─────────────────────────────
/** 0장: 0 낡은 괘종시계 · 1 저주받은 인형 / 1장: 0 검은 고양이 · 1 으스스 안개. (x,y) = 바닥 가운데, k = 크기 px */
function drawPerk(ctx: C2, ch: number, i: number, x: number, y: number, k: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const lw = 0.035;
  if (ch === 0 && i === 0) {
    rr(ctx, -0.22, -1.0, 0.44, 1.0, 0.05);
    ink(ctx, lin(ctx, 0, -1, 0, 0, [0, '#9a5a2a'], [1, '#6a3a1a']), lw);
    ell(ctx, 0, -0.78, 0.17, 0.17);
    ink(ctx, '#f8f0d8', lw);
    const a = t * 0.05;
    seg(ctx, 0, -0.78, Math.sin(a) * 0.1, -0.78 - Math.cos(a) * 0.1, 0.03, OUT);
    seg(ctx, 0, -0.78, 0.0, -0.9, 0.03, OUT);
    rr(ctx, -0.12, -0.52, 0.24, 0.4, 0.04);
    ink(ctx, '#2a1a10', lw * 0.6);
    const sw = Math.sin(t * 0.08) * 0.35;
    seg(ctx, 0, -0.5, Math.sin(sw) * 0.25, -0.5 + Math.cos(sw) * 0.25, 0.02, '#d8b060');
    ell(ctx, Math.sin(sw) * 0.25, -0.5 + Math.cos(sw) * 0.25, 0.05, 0.05);
    ink(ctx, '#ffd36b', lw * 0.6);
    g2Roof(ctx);
  } else if (ch === 0) {
    // 저주받은 인형: 보라 드레스 · 레이스 모자 · 단추 눈(빨갛게 번쩍) · 꿰맨 입
    ctx.beginPath();
    ctx.moveTo(-0.08, -0.5);
    ctx.quadraticCurveTo(-0.34, -0.2, -0.3, 0);
    ctx.lineTo(0.3, 0);
    ctx.quadraticCurveTo(0.34, -0.2, 0.08, -0.5);
    ctx.closePath();
    ink(ctx, lin(ctx, 0, -0.5, 0, 0, [0, '#8a5be0'], [1, '#5a2fa8']), lw);
    for (let k = 0; k < 5; k++) (ell(ctx, -0.24 + k * 0.12, -0.02, 0.07, 0.04), ink(ctx, '#ffffff', lw * 0.6));
    for (const sd of [-1, 1]) (seg(ctx, sd * 0.1, -0.44, sd * 0.24, -0.26, 0.07, OUT), seg(ctx, sd * 0.1, -0.44, sd * 0.24, -0.26, 0.045, '#8a5be0'), ell(ctx, sd * 0.25, -0.24, 0.04, 0.04), ink(ctx, '#fbe8dc', lw * 0.6));
    ell(ctx, 0, -0.66, 0.19, 0.18);
    ink(ctx, lin(ctx, 0, -0.84, 0, -0.48, [0, '#fff6f0'], [1, '#f2d8cc']), lw);
    ctx.beginPath();
    ctx.moveTo(-0.27, -0.62);
    ctx.quadraticCurveTo(-0.28, -0.95, 0, -0.95);
    ctx.quadraticCurveTo(0.28, -0.95, 0.27, -0.62);
    ctx.quadraticCurveTo(0.2, -0.82, 0, -0.84);
    ctx.quadraticCurveTo(-0.2, -0.82, -0.27, -0.62);
    ink(ctx, '#f4f0ff', lw);
    const glow = Math.sin(t * 0.15) > 0.3;
    for (const sd of [-1, 1]) {
      ell(ctx, sd * 0.075, -0.67, 0.045, 0.045);
      ctx.fillStyle = glow ? '#ff2a2a' : '#1a1020';
      ctx.fill();
      if (glow) (ell(ctx, sd * 0.075, -0.67, 0.09, 0.09), (ctx.fillStyle = 'rgba(255,40,40,.25)'), ctx.fill());
    }
    ctx.strokeStyle = '#8a1010';
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.moveTo(-0.07, -0.58);
    ctx.quadraticCurveTo(0, -0.54, 0.07, -0.58);
    ctx.stroke();
    for (let k = 0; k < 3; k++) seg(ctx, -0.05 + k * 0.05, -0.6, -0.05 + k * 0.05, -0.55, 0.012, '#8a1010');
    ell(ctx, -0.12, -0.6, 0.035, 0.02);
    ctx.fillStyle = 'rgba(255,120,140,.5)';
    ctx.fill();
  } else if (i === 0) {
    ctx.scale(0.9, 0.9);
    paintPet(ctx, true, Math.sin(t * 0.1) > 0.7 ? 'bark' : 'stand');
  } else {
    for (let k = 0; k < 5; k++) {
      const ph = (t * 0.01 + k * 0.2) % 1;
      ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.8;
      ell(ctx, -0.3 + k * 0.15, -0.3 - ph * 0.5, 0.25, 0.12);
      ctx.fillStyle = '#d8d0f0';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ell(ctx, 0, -0.18, 0.3, 0.2);
    ink(ctx, '#3a3448', lw);
    rr(ctx, -0.32, -0.36, 0.64, 0.08, 0.04);
    ink(ctx, '#4a4458', lw);
    ell(ctx, 0, -0.36, 0.26, 0.05);
    ctx.fillStyle = '#9b7bd8';
    ctx.fill();
  }
  ctx.restore();
}
function g2Roof(ctx: C2) {
  ctx.beginPath();
  ctx.moveTo(-0.26, -1.0);
  ctx.lineTo(0, -1.16);
  ctx.lineTo(0.26, -1.0);
  ctx.closePath();
  ink(ctx, '#7a4220', 0.035);
}

// ───────────────────────────── 그리기: 무대 (미리 굽는 배경) ─────────────────────────────
interface Pal { sky: [string, string, string]; wall: string; trim: string; roof: string; roof2: string; car: string; paper: Record<RK, [string, string]> }
const PALS: Pal[] = [
  { sky: ['#141c48', '#2c3474', '#5a4f8e'], wall: '#f3e6c8', trim: '#7fb5d8', roof: '#c8553d', roof2: '#a03a28', car: '#ff6b5a', paper: { kitchen: ['#fff2c8', '#f6dfa0'], living: ['#ffe2cc', '#f6c8a8'], bath: ['#d8f1f6', '#b8e2ea'], bed: ['#e9dcff', '#d4c2f6'], study: ['#e2f2d4', '#c8e2b4'], music: ['#ffdce6', '#f6bccc'] } },
  { sky: ['#101a40', '#23306a', '#4a3f80'], wall: '#c9785a', trim: '#f4e6d0', roof: '#4a5a7a', roof2: '#334058', car: '#4dc4c4', paper: { kitchen: ['#fff0d0', '#f4dca8'], living: ['#e6f0ff', '#c8daf6'], bath: ['#dff6ee', '#bfe8d8'], bed: ['#ffe6d8', '#f6cbb6'], study: ['#f4ecd8', '#e2d4b4'], music: ['#efe2ff', '#d8c4f6'] } },
  { sky: ['#0e1236', '#241e5a', '#4a2f6e'], wall: '#b8aed0', trim: '#f4efe6', roof: '#3a2f5a', roof2: '#241c3e', car: '#ffd23f', paper: { kitchen: ['#fff4dc', '#f2dfb6'], living: ['#ffe8d6', '#f2c8a8'], bath: ['#e0f0ff', '#c0d8f2'], bed: ['#ffe0ec', '#f2c0d4'], study: ['#e8f4d8', '#cfe4b8'], music: ['#f2e4ff', '#dcc6f4'] } },
];
const BGS = new Map<string, HTMLCanvasElement>();
/** 방 하나 배경 가구 (화면 좌표: X·Y는 px 변환, r은 방) */
function paintRoomFurniture(g: C2, r: RoomDef & { i: number }, L: Layout, R: (v: number) => number, X: (v: number) => number, Y: (v: number) => number, ch: number) {
  const fl = floorY(r), H = r.y1 - r.y0, lw = R(0.004);
  const box = (x0: number, y0: number, x1: number, y1: number, fill: string | CanvasGradient, rad = 0.006) => {
    rr(g, X(x0), Y(y0), R(x1 - x0), R(y1 - y0), R(rad));
    ink(g, fill, lw);
  };
  const win = (cx: number, cy: number, ww: number, hh: number) => {
    box(cx - ww / 2 - 0.006, cy - hh / 2 - 0.006, cx + ww / 2 + 0.006, cy + hh / 2 + 0.006, '#f4ead6');
    rr(g, X(cx - ww / 2), Y(cy - hh / 2), R(ww), R(hh), R(0.003));
    g.fillStyle = lin(g, 0, Y(cy - hh / 2), 0, Y(cy + hh / 2), [0, '#1e2a66'], [1, '#3e3f8a']);
    g.fill();
    for (let k = 0; k < 3; k++) (ell(g, X(cx - ww * 0.3 + hsh(k + cx * 50) * ww * 0.6), Y(cy - hh * 0.3 + hsh(k + 7 + cx * 50) * hh * 0.4), R(0.002), R(0.002)), (g.fillStyle = '#fff8d0'), g.fill());
    seg(g, X(cx), Y(cy - hh / 2), X(cx), Y(cy + hh / 2), R(0.005), '#f4ead6');
    seg(g, X(cx - ww / 2), Y(cy), X(cx + ww / 2), Y(cy), R(0.005), '#f4ead6');
  };
  const frameDeco = (cx: number, cy: number, ww: number, hh: number, col: string) => {
    box(cx - ww / 2, cy - hh / 2, cx + ww / 2, cy + hh / 2, '#c8884e', 0.003);
    rr(g, X(cx - ww / 2 + 0.005), Y(cy - hh / 2 + 0.005), R(ww - 0.01), R(hh - 0.01), R(0.002));
    g.fillStyle = col;
    g.fill();
  };
  const k = H / 0.33;
  switch (r.kind) {
    case 'kitchen': {
      // 윗장 · 냉장고 · 조리대 · 창문 · 시계
      box(r.x0 + 0.335, r.y0 + 0.02, r.x1 - 0.02, r.y0 + 0.02 + 0.06 * k, lin(g, 0, Y(r.y0), 0, Y(r.y0 + 0.08), [0, '#f6f2e8'], [1, '#e2dacb']), 0.004);
      for (let x = r.x0 + 0.345; x < r.x1 - 0.05; x += 0.065) (rr(g, X(x + 0.006), Y(r.y0 + 0.028), R(0.063), R(0.06 * k - 0.016), R(0.003)), (g.strokeStyle = 'rgba(120,100,80,.35)'), (g.lineWidth = 1), g.stroke(), ell(g, X(x + 0.04), Y(r.y0 + 0.02 + 0.05 * k), R(0.004), R(0.004)), (g.fillStyle = '#c8a060'), g.fill());
      box(r.x0 + 0.08, fl - 0.17 * k, r.x0 + 0.155, fl, lin(g, X(r.x0 + 0.08), 0, X(r.x0 + 0.16), 0, [0, '#ffffff'], [1, '#d8e8f0']), 0.012);
      seg(g, X(r.x0 + 0.08), Y(fl - 0.11 * k), X(r.x0 + 0.155), Y(fl - 0.11 * k), lw, OUT);
      for (const yy of [fl - 0.14 * k, fl - 0.07 * k]) seg(g, X(r.x0 + 0.142), Y(yy - 0.015), X(r.x0 + 0.142), Y(yy + 0.015), R(0.005), '#9aa8b0');
      ell(g, X(r.x0 + 0.1), Y(fl - 0.15 * k), R(0.008), R(0.008));
      ink(g, '#ff6f91', lw);
      win(r.x0 + 0.275, r.y0 + 0.11 * k + 0.035, 0.08, 0.07 * k);
      break;
    }
    case 'living': {
      // 소파 · 깔개 · 벽 선반 · 화분 · 액자
      ell(g, X(r.x0 + 0.2), Y(fl + 0.004), R(0.13), R(0.012));
      g.fillStyle = 'rgba(210,90,90,.55)';
      g.fill();
      const sx = r.x0 + 0.215, sw = 0.12;
      box(sx - 0.005, fl - 0.085 * k, sx + sw + 0.005, fl - 0.04 * k, '#d0506a', 0.012);
      box(sx, fl - 0.05 * k, sx + sw, fl - 0.012, '#e8687e', 0.01);
      for (const x of [sx - 0.012, sx + sw - 0.006]) box(x, fl - 0.065 * k, x + 0.018, fl - 0.012, '#c04058', 0.008);
      for (const x of [sx + 0.01, sx + sw - 0.015]) seg(g, X(x), Y(fl - 0.012), X(x), Y(fl), R(0.006), '#6a3a1a');
      win(r.x0 + 0.1, r.y0 + 0.11 * k + 0.035, 0.07, 0.07 * k);
      box(r.x0 + 0.04, fl - 0.04, r.x0 + 0.07, fl, '#d0703a', 0.004);
      for (const [dx, dy, a] of [[0.0, 0.06, -0.5], [0.02, 0.07, 0.4], [0.01, 0.09, 0]] as [number, number, number][]) (ell(g, X(r.x0 + 0.055 + dx - 0.01), Y(fl - dy), R(0.012), R(0.03), a), ink(g, '#5fb04a', lw));
      break;
    }
    case 'bath': {
      // 아래 반 타일 · 세면대 + 거울 · 수건
      g.save();
      rr(g, X(r.x0), Y(fl - H * 0.42), R(r.x1 - r.x0), R(H * 0.42), 0);
      g.clip();
      g.fillStyle = 'rgba(255,255,255,.45)';
      g.fillRect(X(r.x0), Y(fl - H * 0.42), R(r.x1 - r.x0), R(H * 0.42));
      g.strokeStyle = 'rgba(120,170,190,.35)';
      g.lineWidth = 1;
      for (let y = fl - H * 0.42; y < fl; y += 0.025) seg(g, X(r.x0), Y(y), X(r.x1), Y(y), 1, 'rgba(120,170,190,.35)');
      for (let x = r.x0; x < r.x1; x += 0.025) seg(g, X(x), Y(fl - H * 0.42), X(x), Y(fl), 1, 'rgba(120,170,190,.35)');
      g.restore();
      const bx = r.x0 + 0.1;
      box(bx - 0.035, fl - 0.08 * k, bx + 0.035, fl - 0.065 * k, '#ffffff', 0.006);
      seg(g, X(bx), Y(fl - 0.065 * k), X(bx), Y(fl), R(0.012), '#e8eef2');
      if (!L.objs.some((o) => o[0] === 'mirror' && o[1] === r.i)) {
        ell(g, X(bx), Y(fl - 0.155 * k), R(0.028), R(0.036 * k));
        ink(g, lin(g, 0, Y(fl - 0.19 * k), 0, Y(fl - 0.12 * k), [0, '#e8f6ff'], [1, '#a8d0e8']), lw);
      }
      box(r.x1 - 0.07, r.y0 + 0.08 * k, r.x1 - 0.03, r.y0 + 0.16 * k, '#ff9fb2', 0.004);
      seg(g, X(r.x1 - 0.075), Y(r.y0 + 0.08 * k), X(r.x1 - 0.025), Y(r.y0 + 0.08 * k), R(0.004), '#a0a0a8');
      break;
    }
    case 'bed': {
      // 침대 · 협탁 · 깔개
      const bx0 = r.x0 + 0.18, bx1 = r.x0 + 0.34;
      box(bx1 - 0.012, fl - 0.12 * k, bx1 + 0.004, fl, '#8a5428', 0.006);
      box(bx0 - 0.004, fl - 0.075 * k, bx0 + 0.01, fl, '#8a5428', 0.006);
      box(bx0, fl - 0.06 * k, bx1 - 0.008, fl - 0.025 * k, '#ffffff', 0.008);
      box(bx0 + 0.005, fl - 0.065 * k, bx1 - 0.06, fl - 0.025 * k, lin(g, X(bx0), 0, X(bx1), 0, [0, '#7fb5ff'], [1, '#5a8ae0']), 0.01);
      box(bx1 - 0.055, fl - 0.075 * k, bx1 - 0.015, fl - 0.05 * k, '#ffffff', 0.01);
      box(bx0 + 0.005, fl - 0.025 * k, bx1 - 0.012, fl - 0.012 * k, '#6a4a3a', 0.003);
      box(r.x0 + 0.12, fl - 0.05 * k, r.x0 + 0.16, fl, '#b97a44', 0.004);
      ell(g, X(r.x0 + 0.14), Y(fl - 0.065 * k), R(0.014), R(0.014));
      ink(g, '#ffe08a', lw);
      ell(g, X(r.x0 + 0.25), Y(fl + 0.004), R(0.12), R(0.01));
      g.fillStyle = 'rgba(160,110,220,.45)';
      g.fill();
      break;
    }
    case 'study': {
      box(r.x0 + 0.2, fl - 0.065 * k, r.x0 + 0.33, fl - 0.055 * k, '#9a6234', 0.003);
      for (const x of [r.x0 + 0.21, r.x0 + 0.32]) seg(g, X(x), Y(fl - 0.055 * k), X(x), Y(fl), R(0.006), '#6a3a1a');
      seg(g, X(r.x0 + 0.3), Y(fl - 0.065 * k), X(r.x0 + 0.31), Y(fl - 0.11 * k), R(0.004), '#5a5a6a');
      ell(g, X(r.x0 + 0.315), Y(fl - 0.115 * k), R(0.014), R(0.008));
      ink(g, '#ffd36b', lw);
      const bh = H * 0.38;
      box(r.x0 + 0.34, fl - bh, r.x0 + 0.44, fl, '#a0643a', 0.004);
      for (let j = 0; j < 2; j++) {
        const yy = fl - bh + 0.01 + j * bh * 0.5;
        for (let q = 0; q < 5; q++) (rr(g, X(r.x0 + 0.35 + q * 0.017), Y(yy), R(0.014), R(bh * 0.4), R(0.002)), ink(g, ['#e85d5d', '#5aa9e6', '#7bc96f', '#ffd166', '#b388eb'][(q + j) % 5], 1));
      }
      win(r.x0 + 0.1, r.y0 + 0.11 * k + 0.03, 0.07, 0.07 * k);
      break;
    }
    case 'music': {
      ell(g, X(r.x0 + 0.15), Y(fl + 0.004), R(0.12), R(0.01));
      g.fillStyle = 'rgba(230,120,160,.45)';
      g.fill();
      frameDeco(r.x0 + 0.1, r.y0 + 0.07 * k + 0.03, 0.04, 0.05, '#c8a0ff');
      break;
    }
  }
  void L;
  void ch;
}
/** 배경 한 장: 밤하늘 · 언덕 · 길 · 집 단면(벽지·바닥·가구·계단·현관) */
function bakeBg(ch: number, w: number, h: number, sc: number): HTMLCanvasElement {
  const key = `${ch}:${w}:${h}:${sc}`;
  let c = BGS.get(key);
  if (c) return c;
  const P = PALS[ch], L = LAYOUTS[ch], X = (x: number) => x * w, Y = (y: number) => y * w, R = (v: number) => v * w;
  c = layer(w * sc, h * sc, (g) => {
    g.scale(sc, sc);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    // 밤하늘
    g.fillStyle = lin(g, 0, 0, 0, Y(1.1), [0, P.sky[0]], [0.55, P.sky[1]], [1, P.sky[2]]);
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {
      const x = hsh(i * 3.1) * w, y = Y(0.1 + hsh(i * 7.7) * 0.55), r = 0.6 + hsh(i * 1.3) * 1.3;
      g.globalAlpha = 0.45 + hsh(i * 5.3) * 0.55;
      ell(g, x, y, r, r);
      g.fillStyle = '#fff8e0';
      g.fill();
    }
    g.globalAlpha = 1;
    // 달
    g.fillStyle = radg(g, X(0.84), Y(0.2), R(0.02), R(0.16), [0, 'rgba(255,246,200,.45)'], [1, 'rgba(255,246,200,0)']);
    g.fillRect(X(0.66), Y(0.04), R(0.36), R(0.34));
    ell(g, X(0.84), Y(0.2), R(0.055), R(0.055));
    g.fillStyle = lin(g, X(0.79), Y(0.15), X(0.89), Y(0.25), [0, '#fffbe6'], [1, '#ffe7a0']);
    g.fill();
    for (const [dx, dy, r] of [[-0.015, -0.01, 0.012], [0.02, 0.015, 0.008], [0.005, 0.03, 0.006]] as [number, number, number][]) (ell(g, X(0.84 + dx), Y(0.2 + dy), R(r), R(r)), (g.fillStyle = 'rgba(230,200,120,.4)'), g.fill());
    // 구름
    for (const [x, y, k] of [[0.14, 0.17, 1], [0.6, 0.12, 0.8], [0.95, 0.3, 0.7]] as [number, number, number][]) {
      g.fillStyle = 'rgba(200,200,255,.16)';
      for (const [dx, dy, rx] of [[-0.05, 0, 0.05], [0, -0.015, 0.06], [0.06, 0, 0.05]] as [number, number, number][]) (ell(g, X(x + dx * k), Y(y + dy * k), R(rx * k), R(rx * k * 0.55)), g.fill());
    }
    // 먼 언덕·나무
    g.fillStyle = '#1c2a4a';
    g.beginPath();
    g.moveTo(0, Y(1.02));
    for (let i = 0; i <= 12; i++) g.lineTo(X(i / 12), Y(0.98 - Math.sin(i * 0.9 + ch) * 0.025 - hsh(i + ch) * 0.02));
    g.lineTo(w, Y(1.1));
    g.lineTo(0, Y(1.1));
    g.fill();
    // 땅: 풀 · 보도 · 길
    g.fillStyle = lin(g, 0, Y(1.08), 0, Y(1.17), [0, '#3f7a4a'], [1, '#2f5f3a']);
    g.fillRect(0, Y(1.08), w, R(0.09));
    g.fillStyle = '#9a95a8';
    g.fillRect(0, Y(1.165), w, R(0.035));
    g.fillStyle = 'rgba(255,255,255,.18)';
    for (let x = 0; x < 1; x += 0.08) g.fillRect(X(x), Y(1.165), 1, R(0.035));
    g.fillStyle = lin(g, 0, Y(1.2), 0, h, [0, '#3a3a4c'], [1, '#2a2a38']);
    g.fillRect(0, Y(1.2), w, h - Y(1.2));
    g.fillStyle = 'rgba(255,230,140,.6)';
    for (let x = 0.03; x < 1; x += 0.14) g.fillRect(X(x), Y(1.275), R(0.07), R(0.006));
    // 가로등 (오른쪽)
    g.fillStyle = radg(g, X(0.93), Y(1.04), R(0.01), R(0.2), [0, 'rgba(255,220,140,.35)'], [1, 'rgba(255,220,140,0)']);
    g.fillRect(X(0.73), Y(0.84), R(0.4), R(0.4));
    seg(g, X(0.93), Y(1.19), X(0.93), Y(1.02), R(0.008), '#2a2a38');
    ell(g, X(0.93), Y(1.02), R(0.018), R(0.014));
    ink(g, '#ffe8a0', R(0.004), '#2a2a38');
    // 수풀·꽃
    for (let i = 0; i < 9; i++) {
      const x = 0.4 + i * 0.07 + hsh(i + 3) * 0.02;
      if (x > 0.9) break;
      ell(g, X(x), Y(1.1), R(0.03), R(0.022));
      ink(g, i % 2 ? '#3f8a4a' : '#4a9a52', R(0.003), '#1f3a2a');
      if (i % 3 === 0) (ell(g, X(x + 0.008), Y(1.095), R(0.006), R(0.006)), (g.fillStyle = '#ff9fb2'), g.fill());
    }
    // ── 집 ──
    const top = L.roofY, x0 = 0.03, x1 = 0.97;
    // 지붕
    g.save();
    g.beginPath();
    if (ch === 1) {
      g.moveTo(X(x0 - 0.02), Y(top));
      g.lineTo(X(x0 + 0.06), Y(top - 0.13));
      g.lineTo(X(x1 - 0.06), Y(top - 0.13));
      g.lineTo(X(x1 + 0.02), Y(top));
    } else {
      g.moveTo(X(x0 - 0.025), Y(top));
      g.lineTo(X(0.5), Y(top - (ch === 2 ? 0.2 : 0.22)));
      g.lineTo(X(x1 + 0.025), Y(top));
    }
    g.closePath();
    g.fillStyle = lin(g, 0, Y(top - 0.22), 0, Y(top), [0, P.roof], [1, P.roof2]);
    g.fill();
    g.clip();
    g.strokeStyle = 'rgba(0,0,0,.22)';
    g.lineWidth = 1.2;
    for (let y = top - 0.22; y < top; y += 0.022) {
      seg(g, 0, Y(y), w, Y(y), 1.2, 'rgba(0,0,0,.22)');
      for (let x = ((y * 50) % 2) * 0.02; x < 1; x += 0.04) seg(g, X(x), Y(y), X(x), Y(y + 0.022), 1, 'rgba(0,0,0,.15)');
    }
    g.restore();
    g.beginPath();
    if (ch === 1) (g.moveTo(X(x0 - 0.02), Y(top)), g.lineTo(X(x0 + 0.06), Y(top - 0.13)), g.lineTo(X(x1 - 0.06), Y(top - 0.13)), g.lineTo(X(x1 + 0.02), Y(top)));
    else (g.moveTo(X(x0 - 0.025), Y(top)), g.lineTo(X(0.5), Y(top - (ch === 2 ? 0.2 : 0.22))), g.lineTo(X(x1 + 0.025), Y(top)));
    g.strokeStyle = OUT;
    g.lineWidth = R(0.006);
    g.stroke();
    // 굴뚝
    rr(g, X(0.72), Y(top - 0.17), R(0.055), R(0.12), 0);
    ink(g, '#a0503a', R(0.005));
    rr(g, X(0.71), Y(top - 0.185), R(0.075), R(0.02), R(0.004));
    ink(g, '#8a4030', R(0.005));
    // 다락 동그란 창 (불빛)
    const ay = top - (ch === 1 ? 0.065 : 0.085);
    g.fillStyle = radg(g, X(0.5), Y(ay), R(0.01), R(0.07), [0, 'rgba(255,220,120,.5)'], [1, 'rgba(255,220,120,0)']);
    g.fillRect(X(0.42), Y(ay - 0.08), R(0.16), R(0.16));
    ell(g, X(0.5), Y(ay), R(0.032), R(0.032));
    ink(g, lin(g, 0, Y(ay - 0.03), 0, Y(ay + 0.03), [0, '#ffe8a0'], [1, '#ffb84a']), R(0.006), '#f4ead6');
    seg(g, X(0.5), Y(ay - 0.032), X(0.5), Y(ay + 0.032), R(0.004), '#f4ead6');
    seg(g, X(0.468), Y(ay), X(0.532), Y(ay), R(0.004), '#f4ead6');
    if (ch === 2) {
      // 저택 탑
      rr(g, X(0.08), Y(top - 0.14), R(0.09), R(0.14), 0);
      ink(g, P.wall, R(0.005));
      g.beginPath();
      g.moveTo(X(0.065), Y(top - 0.14));
      g.lineTo(X(0.125), Y(top - 0.26));
      g.lineTo(X(0.185), Y(top - 0.14));
      g.closePath();
      ink(g, P.roof, R(0.005));
      ell(g, X(0.125), Y(top - 0.08), R(0.018), R(0.024));
      ink(g, '#ffd88a', R(0.004));
    }
    // 바깥벽 (두께) + 기초
    rr(g, X(x0 - 0.012), Y(top - 0.004), R(x1 - x0 + 0.024), Y(1.09) - Y(top - 0.004), R(0.004));
    ink(g, P.wall, R(0.006));
    rr(g, X(x0 - 0.02), Y(1.078), R(x1 - x0 + 0.04), R(0.026), R(0.004));
    ink(g, lin(g, 0, Y(1.078), 0, Y(1.104), [0, '#a8a0b0'], [1, '#7a7488']), R(0.004));
    for (let x = x0; x < x1; x += 0.06) seg(g, X(x), Y(1.08), X(x), Y(1.102), 1, 'rgba(0,0,0,.25)');
    // 방마다: 벽지(불빛) · 바닥 · 걸레받이 · 가구
    for (const [i, r] of L.rooms.entries()) {
      const fl = floorY(r), H = r.y1 - r.y0, [p0, p1] = P.paper[r.kind];
      g.save();
      rr(g, X(r.x0), Y(r.y0), R(r.x1 - r.x0), R(H), 0);
      g.clip();
      g.fillStyle = lin(g, 0, Y(r.y0), 0, Y(fl), [0, p1], [0.5, p0], [1, p1]);
      g.fillRect(X(r.x0), Y(r.y0), R(r.x1 - r.x0), R(H));
      // 벽지 무늬
      g.fillStyle = 'rgba(255,255,255,.35)';
      if (r.kind === 'bed' || r.kind === 'music') for (let y = r.y0 + 0.02; y < fl; y += 0.04) for (let x = r.x0 + 0.02 + ((y * 25) % 2) * 0.02; x < r.x1; x += 0.04) (ell(g, X(x), Y(y), R(0.004), R(0.004)), g.fill());
      else if (r.kind === 'living' || r.kind === 'study') for (let x = r.x0 + 0.015; x < r.x1; x += 0.03) g.fillRect(X(x), Y(r.y0), R(0.012), R(H));
      else if (r.kind === 'kitchen') for (let y = r.y0 + 0.03; y < fl - H * 0.35; y += 0.035) for (let x = r.x0 + 0.02; x < r.x1; x += 0.035) (starPath(g, X(x), Y(y), R(0.004), 0.5, 0, 4), g.fill());
      // 천장 등불빛
      const lamp = L.objs.find((o) => o[1] === i && o[0] === 'lamp');
      const lx = lamp ? lamp[2] : (r.x0 + r.x1) / 2;
      g.fillStyle = radg(g, X(lx), Y(r.y0 + 0.05), R(0.02), R(0.3), [0, 'rgba(255,236,170,.5)'], [1, 'rgba(255,236,170,0)']);
      g.fillRect(X(r.x0), Y(r.y0), R(r.x1 - r.x0), R(H));
      g.fillStyle = lin(g, 0, Y(r.y0), 0, Y(r.y0 + 0.03), [0, 'rgba(60,40,30,.25)'], [1, 'rgba(60,40,30,0)']);
      g.fillRect(X(r.x0), Y(r.y0), R(r.x1 - r.x0), R(0.03));
      paintRoomFurniture(g, { ...r, i }, L, R, X, Y, ch);
      for (const o of L.objs) {
        if (o[1] !== i || o[3] !== 'shelf' || (r.kind === 'study' && o[2] > r.x0 + 0.33)) continue;
        const sy = fl - H * 0.38;
        rr(g, X(o[2] - 0.05), Y(sy), R(0.1), R(0.009), R(0.002));
        ink(g, '#9a6234', R(0.003));
        for (const sd of [-1, 1]) (g.beginPath(), g.moveTo(X(o[2] + sd * 0.035), Y(sy + 0.009)), g.lineTo(X(o[2] + sd * 0.035), Y(sy + 0.025)), g.lineTo(X(o[2] + sd * 0.02), Y(sy + 0.009)), (g.strokeStyle = '#7a4a24'), (g.lineWidth = R(0.003)), g.stroke());
      }
      // 바닥(나무 판자) · 걸레받이
      g.fillStyle = lin(g, 0, Y(fl), 0, Y(r.y1), [0, '#c8884e'], [1, '#8a5428']);
      g.fillRect(X(r.x0), Y(fl), R(r.x1 - r.x0), R(0.02));
      for (let x = r.x0 + ((i * 0.013) % 0.05); x < r.x1; x += 0.05) seg(g, X(x), Y(fl), X(x), Y(r.y1), 1, 'rgba(90,50,20,.45)');
      g.fillStyle = 'rgba(255,255,255,.55)';
      g.fillRect(X(r.x0), Y(fl - 0.01), R(r.x1 - r.x0), R(0.01));
      seg(g, X(r.x0), Y(fl), X(r.x1), Y(fl), R(0.003), 'rgba(90,50,20,.7)');
      g.restore();
    }
    // 계단 (아래 방 오른쪽에서 위층 바닥 구멍으로)
    for (const st of L.stairs) {
      const lo = L.rooms[st.lo], hi = L.rooms[st.hi], fl = floorY(lo), top2 = floorY(hi), n = 7;
      g.save();
      rr(g, X(lo.x0), Y(lo.y0), R(lo.x1 - lo.x0), R(lo.y1 - lo.y0), 0);
      g.clip();
      g.beginPath();
      g.moveTo(X(st.xl - 0.012), Y(fl));
      for (let k = 0; k < n; k++) {
        const xa = st.xl - 0.012 + ((st.xh + 0.04 - st.xl) * k) / n, ya = fl - ((fl - top2) * (k + 1)) / n;
        g.lineTo(X(xa), Y(ya));
        g.lineTo(X(xa + (st.xh + 0.04 - st.xl) / n), Y(ya));
      }
      g.lineTo(X(lo.x1), Y(top2 + 0.02));
      g.lineTo(X(lo.x1), Y(fl));
      g.closePath();
      ink(g, lin(g, 0, Y(top2), 0, Y(fl), [0, '#c8884e'], [1, '#9a6234']), R(0.004));
      // 난간
      g.strokeStyle = '#6a3a1a';
      g.lineWidth = R(0.005);
      g.beginPath();
      g.moveTo(X(st.xl - 0.005), Y(fl - 0.07));
      g.lineTo(X(st.xh + 0.03), Y(top2 - 0.07));
      g.stroke();
      for (let k = 0; k <= 4; k++) {
        const q = k / 4, xx = st.xl - 0.005 + (st.xh + 0.035 - st.xl) * q, yy = fl - 0.07 + (top2 - fl) * q;
        seg(g, X(xx), Y(yy), X(xx), Y(yy + 0.07 - 0.012 * (1 - q)), R(0.003), '#6a3a1a');
      }
      g.restore();
      // 위층 바닥 구멍 · 난간
      g.fillStyle = 'rgba(40,24,16,.85)';
      g.fillRect(X(0.88), Y(hi.y1 - 0.021), R(0.075), R(0.025));
      seg(g, X(0.875), Y(top2 - 0.05), X(0.875), Y(top2), R(0.005), '#6a3a1a');
      seg(g, X(0.86), Y(top2 - 0.05), X(0.89), Y(top2 - 0.05), R(0.005), '#6a3a1a');
    }
    // 방 사이 벽 (문틈) · 층 사이 바닥판
    for (const r of L.rooms) {
      if (Math.abs(r.x0 - 0.5) < 1e-6) {
        const fl = floorY(r), dh = Math.min(0.16, (r.y1 - r.y0) * 0.62);
        rr(g, X(0.493), Y(r.y0), R(0.014), R(fl - dh - r.y0), 0);
        ink(g, P.wall, R(0.003));
        seg(g, X(0.49), Y(fl - dh), X(0.51), Y(fl - dh), R(0.006), '#8a5428');
        seg(g, X(0.49), Y(fl - dh), X(0.49), Y(fl), R(0.004), '#8a5428');
        seg(g, X(0.51), Y(fl - dh), X(0.51), Y(fl), R(0.004), '#8a5428');
      }
    }
    for (const r of L.rooms) {
      if (r.y1 > 1.07) continue;
      g.fillStyle = lin(g, 0, Y(r.y1 - 0.004), 0, Y(r.y1 + 0.006), [0, '#7a5038'], [1, '#5a3828']);
      g.fillRect(X(r.x0), Y(r.y1 - 0.003), R(r.x1 - r.x0), R(0.009));
    }
    // 현관문 (1층 왼쪽 방 왼쪽)
    {
      const dr = L.rooms[L.rooms.length - 2], fl = floorY(dr), dh = Math.min(0.13, (dr.y1 - dr.y0) * 0.55);
      rr(g, X(0.052), Y(fl - dh - 0.008), R(0.066), R(dh + 0.008), R(0.006));
      ink(g, '#f4ead6', R(0.004));
      rr(g, X(0.058), Y(fl - dh), R(0.054), R(dh), R(0.004));
      ink(g, lin(g, 0, Y(fl - dh), 0, Y(fl), [0, '#a8643a'], [1, '#7a4220']), R(0.004));
      ell(g, X(0.104), Y(fl - dh * 0.48), R(0.005), R(0.005));
      ink(g, '#ffd36b', 1);
      rr(g, X(0.066), Y(fl - dh * 0.85), R(0.038), R(dh * 0.3), R(0.004));
      ink(g, '#ffe8a0', 1);
      ell(g, X(0.085), Y(fl + 0.002), R(0.04), R(0.006));
      g.fillStyle = 'rgba(200,80,80,.6)';
      g.fill();
      // 바깥 계단 (현관에서 보도로)
      for (let k = 0; k < 3; k++) (rr(g, X(0.0), Y(1.105 + k * 0.02), R(0.1 - k * 0.012), R(0.02), R(0.002)), ink(g, '#b8b0c0', R(0.003), '#6a6478'));
    }
    // 바깥벽 테두리 선 (문틈 위)
    rr(g, X(x0), Y(top), R(x1 - x0), Y(1.08) - Y(top), 0);
    g.strokeStyle = shade(P.trim, -20);
    g.lineWidth = R(0.005);
    g.stroke();
    // 우편함 · 울타리
    seg(g, X(0.16), Y(1.165), X(0.16), Y(1.12), R(0.006), '#6a4a3a');
    rr(g, X(0.142), Y(1.105), R(0.036), R(0.022), R(0.006));
    ink(g, P.trim, R(0.004));
  });
  if (BGS.size > 6) BGS.clear();
  BGS.set(key, c);
  return c;
}

// ───────────────────────────── 그리기: 장면 ─────────────────────────────
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const LV_GIFT: Record<number, string> = { 3: '나비넥타이를 맸어요', 5: '마녀 고깔을 썼어요', 7: '망토가 생겼어요', 9: '왕관을 썼어요', 11: '금빛으로 빛나요' };
const recent = new WeakMap<object, { x: number; y: number; t: number; size: number }[]>();
const PART_MAX = 110;
/** 반응마다 비명 글자 */
const YELL: Record<RX, string> = { jump: '꺄악!', spill: '으악!', teeth: '어머나!', wig: '내 가발!', slip: '미끄덩!', bump: '쿵!', blanket: '히익!', splash: '풍덩!', faint: '꼴까닥', bark: '멍멍!', pack: '이사 갈래!', laugh: '까르르!' };
/** 장난마다 소리 */
function prankSound(fx: ReturnType<typeof juice>, k: OK) {
  switch (k) {
    case 'frame': fx.sound('crack', 0.9, 1.1); fx.sound('thud', 1.0, 1); break;
    case 'pot': fx.sound('crack', 1.3, 1.1); fx.sound('ding', 0.7, 0.8); break;
    case 'chair': case 'stool': fx.sound('thud', 0.8, 1.1); fx.sound('crack', 0.8, 0.6); break;
    case 'web': fx.sound('shrink', 0.7, 0.9); break;
    case 'wardrobe': fx.sound('swell', 0.7, 0.9); fx.sound('tick', 0.9, 0.7); break;
    case 'lamp': case 'curtain': fx.sound('zap', 0.6, 0.8); fx.sound('shrink', 0.5, 0.8); break;
    case 'tv': fx.sound('zap', 1.2, 0.9); break;
    case 'sink': case 'tub': case 'fishbowl': fx.sound('splash', k === 'tub' ? 0.7 : 1, 1.1); break;
    case 'doll': case 'musicbox': fx.sound('chime', 1.4, 0.9); break;
    case 'piano': fx.sound('chime', 0.8, 1); fx.sound('ding', 0.6, 0.6); break;
    case 'mirror': fx.sound('swell', 1.3, 1); fx.sound('crack', 1.6, 0.6); break;
    case 'books': fx.sound('whoosh', 1.2, 1); break;
    case 'radio': fx.sound('swell', 0.5, 1); fx.sound('zap', 0.4, 0.5); break;
    case 'pumpkin': fx.sound('boing', 0.6, 1); fx.sound('zap', 0.7, 0.6); break;
  }
}
/** 사람마다 미리 구울 몸짓·표정 */
const PRE: [Pose, Mood][] = [['stand', 'calm'], ['walk0', 'calm'], ['walk1', 'calm'], ['jump', 'shock'], ['sit', 'calm'], ['run0', 'scared'], ['run1', 'scared'], ['kneel', 'calm'], ['stand', 'scared'], ['walk0', 'scared'], ['walk1', 'scared'], ['sit', 'scared'], ['kneel', 'scared'], ['fall', 'dizzy'], ['stand', 'dizzy'], ['cheer', 'happy'], ['head', 'sleep'], ['head', 'happy'], ['head', 'shock'], ['head', 'scared']];
/** 장면에 쓸 그림 미리 굽기 (한 판에 한 번 줄 세움) */
function wantStage(st: number, w: number, h: number, sc: number) {
  const tag = `st${st}:${w}:${h}:${sc}`;
  if (WK.has(tag)) return;
  WK.add(tag);
  const d = STAGES[st], L = LAYOUTS[d.ch], sc2 = Math.min(2, sc);
  want(`bg${d.ch}:${w}:${h}:${sc}`, () => bakeBg(d.ch, w, h, sc));
  const k0 = objK(L.rooms[0]), u = 0.1 * w * k0 * sc2;
  for (const [k] of L.objs) want('o' + k + sprQ(u), () => objSpr(k, u));
  want('box' + sprQ(u), () => boxSpr(u * 0.9));
  const ph = personH(L.rooms[0]) * w * sc2;
  // 이 판 가족 (번호는 판을 만들 때와 같은 순서: 1부터)
  d.mems.forEach((m, i) => {
      const p = { id: i + 1, k: m.k, costume: m.costume ?? 0, item: m.item ?? 'none' } as Person;
      const Lk = lookOf(p, st);
      for (const [pose, mood] of PRE)
        for (const it of p.item === 'none' ? (['none'] as Item[]) : ([p.item, 'none'] as Item[])) {
          const m: Mood = p.k === 'kid' && mood !== 'sleep' ? 'happy' : mood;
          if (pose === 'head' || pose === 'run0' || pose === 'run1' || pose === 'fall' || pose === 'cheer') if (it !== 'none') continue;
          want(personKey(Lk, pose, m, it, true) + sprQ(ph), () => personSpr(Lk, pose, m, it, true, ph));
          if (p.k === 'grandpa') want(personKey(Lk, pose, m, it, false) + sprQ(ph), () => personSpr(Lk, pose, m, it, false, ph));
        }
  });
  // 결과 화면 도감 그림 · 가방 · 말풍선 그림
  const ku = 0.055 * w;
  want('rxicons' + Math.round(ku * sc2), () => {
    const Lb: Look = { skin: '#ffd8b8', hair: '#5a3a24', shirt: '#ff8a5c', shirt2: '#5aa9e6', pants: '#4a5a8a', shoe: '#4a3020', style: 'dad', costume: 0, party: false };
    personSpr(Lb, 'jump', 'shock', 'none', true, ku * 1.1 * sc2);
    for (const st2 of ['mom', 'boy'] as MK[]) personSpr({ ...Lb, style: st2, hair: HAIR[st2] }, 'fall', 'dizzy', 'none', true, ku * 1.1 * sc2);
    personSpr({ ...Lb, style: 'mom', hair: HAIR.mom }, 'head', 'shock', 'none', true, ku * sc2);
    personSpr({ ...Lb, style: 'kid', hair: HAIR.kid }, 'head', 'happy', 'none', true, ku * sc2);
    petSpr(false, 'bark', ku * 0.9 * sc2);
  });
  for (const f of [0, 1, 2, 3, 4, 'kid'] as (Fear | 'kid')[]) want('icon' + f + w, () => iconSpr(f, 0.026 * w * Math.sqrt(objK(L.rooms[0])) * 1.1 * sc2));
}
function drawAll(ctx: C2, s: HauntState, w: number, h: number, _th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const sc = devScale(ctx), sc2 = Math.min(2, sc), d = STAGES[s.stage], ch = d.ch, P = PALS[ch], seenT = fx.memo.t ?? -1;
  // 소리는 한 프레임에 셋까지 (먼저 일어난 일부터)
  let sn = 0;
  const snd = (n: Parameters<typeof fx.sound>[0], p = 1, v = 1) => void (sn++ < 3 && fx.sound(n, p, v));
  wantStage(s.stage, Math.round(w), Math.round(h), sc);
  if ((s.phase === 'result' || s.phase === 'pick') && s.stage + 1 < STAGES.length) wantStage(s.stage + 1, Math.round(w), Math.round(h), sc);
  idlePump();
  const puff = (x: number, y: number, col: string, n: number, spd = 3, size = 3) => {
    if (fx.particles.length < PART_MAX) fx.burst(x, y, col, Math.min(n, PART_MAX - fx.particles.length), spd, size);
  };
  const say = (x: number, y: number, str: string, col: string, size: number) => {
    let rec = recent.get(s);
    if (!rec) recent.set(s, (rec = []));
    x = clamp(x, w * 0.12, w * 0.88);
    y = Math.max(Y(0.14), y);
    for (let k = 0; k < 5 && rec.some((q) => t - q.t < 30 && Math.abs(q.x - x) < w * 0.16 && Math.abs(q.y - y) < (size + q.size) * 0.55); k++) y -= size * 0.9;
    rec.push({ x, y, t, size });
    if (rec.length > 14) rec.shift();
    fx.pop(x, y, str, col, size);
  };
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.save();
  fx.begin(ctx);
  ctx.drawImage(bakeBg(ch, Math.round(w), Math.round(h), sc), 0, 0, w, h);
  // 굴뚝 연기 · 하늘 반짝
  for (let i = 0; i < 3; i++) {
    const f = (t * 0.006 + i / 3) % 1, top = LAYOUTS[ch].roofY;
    ctx.globalAlpha = 0.35 * (1 - f);
    ell(ctx, X(0.75 + f * 0.05 + Math.sin(t * 0.02 + i) * 0.01), Y(top - 0.19 - f * 0.12), R(0.015 + f * 0.02), R(0.012 + f * 0.015));
    ctx.fillStyle = '#d8d8ee';
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── 장 끝에 고른 집의 큰 물건: 마당 괘종시계 · 다락 창 인형 · 으스스 안개 ──
  if (s.perk[0] === 1) {
    const ring = s.events.some((e) => e.k === 'clock' && t - e.t < 40), sh = ring ? Math.sin(t * 1.2) * 0.06 : 0;
    ctx.save();
    ctx.translate(X(0.55), Y(1.165));
    ctx.rotate(sh);
    drawPerk(ctx, 0, 0, 0, 0, R(0.13), t);
    ctx.restore();
  } else if (s.perk[0] === 2) {
    const ay = LAYOUTS[ch].roofY - (ch === 1 ? 0.065 : 0.085);
    drawPerk(ctx, 0, 1, X(0.5), Y(ay + 0.03), R(0.07), t);
  }
  if (s.perk[1] === 2) {
    for (let i = 0; i < 6; i++) {
      const f = (t * 0.002 + i / 6) % 1;
      ctx.globalAlpha = 0.22 * Math.sin(f * Math.PI);
      ell(ctx, X(-0.1 + f * 1.2), Y(1.06 + (i % 3) * 0.035), R(0.16), R(0.035));
      ctx.fillStyle = '#d8d0f0';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // ── 방: 물웅덩이 ──
  for (const r of s.rooms) {
    if (r.wet <= 0) continue;
    const a = Math.min(1, r.wet / 60);
    ctx.globalAlpha = 0.75 * a;
    ctx.fillStyle = 'rgba(110,190,255,.7)';
    for (let k = 0; k < 3; k++) (ell(ctx, X(r.x0 + 0.08 + k * 0.13 + hsh(r.i + k) * 0.05), Y(r.fl + 0.003), R(0.05 + hsh(k + r.i * 3) * 0.03), R(0.007)), ctx.fill());
    ctx.globalAlpha = 1;
  }
  // ── 상자 · 풀린 상자(새 살림) ──
  {
    const k0 = objK(s.rooms[0]), u = R(0.1) * k0 * 0.9;
    for (const b of s.boxes) {
      const r = s.rooms[b.room], stack = s.boxes.filter((q) => q.room === b.room && q.id < b.id && Math.abs(q.x - b.x) < 0.045 && !q.done).length;
      ctx.save();
      ctx.translate(X(b.x), Y(r.fl) - stack * u * 0.5);
      if (b.done) {
        const age = t - b.doneT, pop = age < 12 ? 1 + 0.4 * Math.sin((age / 12) * Math.PI) : 1;
        ctx.scale(pop, pop);
        ctx.drawImage(decoSpr(b.deco, u * sc2), -0.6 * u, -1.2 * u, 1.2 * u, 1.4 * u);
      } else {
        const opening = b.claim && s.people.some((p) => p.id === b.claim && p.st === 'act' && p.act === 'unpack');
        if (opening) ctx.rotate(Math.sin(t * 0.5) * 0.06);
        ctx.drawImage(boxSpr(u * sc2), -0.5 * u, -0.9 * u, 1.2 * u, 1.2 * u);
      }
      ctx.restore();
    }
  }
  // ── 물건 (+ 장난 몸짓) ──
  for (const o of s.objs) drawObj(ctx, s, o, X, Y, R, sc2, t);
  // ── NEW 스포트라이트 (물건 또는 사람) ──
  if (s.spot && s.phase === 'play') {
    let sx = -1, sy = 0, rad = R(0.07);
    if (s.spot.id > 0) {
      const o = s.objs.find((q) => q.id === s.spot!.id);
      if (o) (sx = X(o.x)), (sy = Y(o.cy)), (rad = R(0.075));
    } else {
      const p = s.people.find((q) => q.id === -s.spot!.id && inHouse(q));
      if (p) (sx = X(p.x)), (sy = Y(p.y - personH(s.rooms[p.room]) * 0.55)), (rad = R(0.085));
    }
    if (sx >= 0) {
      const pul = 0.5 + 0.5 * Math.sin(t * 0.2);
      ctx.fillStyle = `rgba(255,236,120,${0.18 + 0.12 * pul})`;
      ell(ctx, sx, sy, rad * (1 + 0.12 * pul), rad * (1 + 0.12 * pul));
      ctx.fill();
      ctx.strokeStyle = '#fff6c0';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -t * 0.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // ── 퇴마사 할머니 방: 보랏빛 (그 방에서 장난치면 소금) ──
  for (const p of s.people) {
    if (p.k !== 'exorcist' || !awake(p)) continue;
    const r = s.rooms[p.room], pul = 0.5 + 0.5 * Math.sin(t * 0.12);
    ctx.fillStyle = `rgba(170,110,255,${0.13 + 0.07 * pul})`;
    ctx.fillRect(X(r.x0), Y(r.y0), R(r.x1 - r.x0), R(r.H));
    ctx.strokeStyle = `rgba(200,150,255,${0.6 + 0.3 * pul})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = t * 0.4;
    ctx.strokeRect(X(r.x0) + 2, Y(r.y0) + 2, R(r.x1 - r.x0) - 4, R(r.H) - 4);
    ctx.setLineDash([]);
  }
  // ── 사람·동물 (집 안) ──
  const order = s.people.filter((p) => inHouse(p)).sort((a, b) => a.y - b.y || a.x - b.x);
  for (const p of order) drawPerson(ctx, s, p, X, Y, R, sc2, t);
  // ── 깜깜한 방 (불 끄기·커튼): 눈만 반짝 ──
  for (const r of s.rooms) {
    if (r.dark <= 0) continue;
    const a = Math.min(1, r.dark / 20) * (r.dark > 150 && (t >> 2) % 2 ? 0.4 : 1);
    ctx.globalAlpha = 0.8 * a;
    ctx.fillStyle = '#0a0d2a';
    ctx.fillRect(X(r.x0), Y(r.y0), R(r.x1 - r.x0), R(r.H));
    ctx.globalAlpha = a;
    for (const p of s.people) {
      if (p.room !== r.i || !inHouse(p)) continue;
      const hy = p.k === 'dog' || p.k === 'cat' ? p.y - 0.035 : p.y - personH(r) * 0.74;
      for (const sd of [-1, 1]) (ell(ctx, X(p.x + sd * 0.009 + p.face * 0.004), Y(hy), R(0.006), R(0.008)), (ctx.fillStyle = '#fff6a0'), ctx.fill());
    }
    ctx.globalAlpha = 1;
  }
  // ── 겁 말풍선 (그림 + 둘레 고리 = 겁 막대) — 깜깜해도 보이게 ──
  for (const p of order) drawBubble(ctx, s, p, X, Y, R, sc2, t);
  // ── 비명이 벽을 넘는다 (소리 물결) ──
  for (const wv of s.waves) {
    const age = t - wv.t;
    if (age < 0 || age > 26) continue;
    const q = age / 22, x = wv.x0 + (wv.x1 - wv.x0) * Math.min(1, q), y = wv.y0 + (wv.y1 - wv.y0) * Math.min(1, q), a = Math.atan2(wv.y1 - wv.y0, wv.x1 - wv.x0);
    ctx.save();
    ctx.translate(X(x), Y(y));
    ctx.rotate(a);
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, q - 0.7) / 0.5);
    ctx.strokeStyle = wv.depth >= 3 ? '#ff5a4e' : '#ffb03a';
    ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      ctx.lineWidth = R(0.009) * (1 + Math.min(4, wv.depth) * 0.15);
      ctx.beginPath();
      ctx.arc(-R(0.022) * k, 0, R(0.03 + k * 0.016), -0.85, 0.85);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // ── 연쇄 숫자: 연쇄마다 하나 — 마지막으로 놀란 사람 위에 'N명!'이 쿵 커진다 ──
  let top: Chain | null = null;
  for (const c of s.chains) if (c.big >= 2 && t - c.lastT <= 70 && (!top || c.lastT > top.lastT)) top = c;
  for (const c of top ? [top] : []) {
    const age = t - c.lastT;
    const pop = age < 8 ? 1 + 0.5 * Math.sin((age / 8) * Math.PI) : 1, a = Math.min(1, (70 - age) / 15), sz = Math.min(0.075, 0.042 + c.big * 0.005);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(clamp(X(c.lx), w * 0.1, w * 0.9), Math.max(Y(0.15), Y(c.ly) - age * 0.25));
    ctx.scale(pop, pop);
    font(sz, 900);
    ctx.lineWidth = 5;
    ctx.strokeStyle = OUT;
    ctx.strokeText(`${c.big}명!`, 0, 0);
    ctx.fillStyle = c.big >= 4 ? '#ff7a3a' : '#ffd84a';
    ctx.fillText(`${c.big}명!`, 0, 0);
    ctx.restore();
  }
  // ── 날아가는 것: 틀니 · 가발 · 책 ──
  for (const e of s.events) {
    const age = t - e.t;
    if ((e.k === 'teethfly' || e.k === 'wigfly') && age < 26) {
      const q = age / 26, x = e.x + (e.x2 - e.x) * q, y = e.y + (e.y2 - e.y) * q - Math.sin(q * Math.PI) * 0.12;
      ctx.save();
      ctx.translate(X(x), Y(y));
      ctx.rotate(q * 9);
      if (e.k === 'teethfly') drawTeeth(ctx, R(0.04), t);
      else drawWig(ctx, R(0.034));
      ctx.restore();
    } else if (e.k === 'teethfly' && age < 90) {
      // 딱딱딱 — 착지한 틀니가 저절로 딱딱
      ctx.save();
      ctx.translate(X(e.x2), Y(e.y2 + 0.07) - Math.abs(Math.sin(age * 0.5)) * R(0.016));
      drawTeeth(ctx, R(0.04), t);
      ctx.restore();
    } else if (e.k === 'wigfly' && age < 80) {
      ctx.save();
      ctx.translate(X(e.x2), Y(e.y2 - 0.005));
      drawWig(ctx, R(0.034));
      ctx.restore();
    } else if (e.k === 'throw' && age < 18) {
      const q = age / 16;
      for (let k = 0; k < 3; k++) {
        const qq = clamp(q - k * 0.12, 0, 1), x = e.x + (e.x2 - e.x) * qq, y = e.y + (e.y2 - e.y) * qq - Math.sin(qq * Math.PI) * 0.06;
        ctx.save();
        ctx.translate(X(x), Y(y));
        ctx.rotate(qq * 6 + k);
        rr(ctx, -R(0.015), -R(0.01), R(0.03), R(0.02), R(0.003));
        ink(ctx, ['#e85d5d', '#5aa9e6', '#7bc96f'][k], 1.5);
        ctx.restore();
      }
    } else if (e.k === 'drip' && age < 50) {
      const r = s.rooms[e.n];
      for (let k = 0; k < 4; k++) {
        const f = ((age + k * 9) % 30) / 30;
        ell(ctx, X(e.x + (k - 1.5) * 0.03), Y(r.y0 + 0.02 + f * (r.fl - r.y0 - 0.02)), R(0.005), R(0.008));
        ctx.fillStyle = '#7fc8ff';
        ctx.fill();
      }
    }
  }
  // ── 유령 ──
  drawGhostNow(ctx, s, X, Y, R, t);
  ctx.restore();

  // ── 집 밖: 차 · 차로 뛰어가는 사람 · 지붕 위 짐 ──
  ctx.save();
  {
    const leaving = s.phase === 'result' || (s.phase === 'end' && s.won) || s.phase === 'pick';
    const drive = leaving ? Math.min(1, Math.max(0, (s.pt - 20) / 80)) : 0;
    const cx = CAR_X - drive * drive * 0.9, cy = CAR_Y + 0.045, cu = R(0.3), bounce = s.events.some((e) => e.k === 'seat' && t - e.t < 10) ? Math.sin((t % 10) * 0.6) * R(0.006) : 0;
    ctx.save();
    ctx.translate(X(cx), Y(cy) + bounce);
    // 지붕 짐 (탄 사람만큼)
    const seated = s.people.filter((p) => p.st === 'gone' && human(p)).sort((a, b) => a.seat - b.seat);
    for (let i = 0; i < Math.min(5, seated.length); i++) {
      rr(ctx, -cu * 0.32 + i * cu * 0.13, -cu * 0.52 - (i % 2) * cu * 0.06 - cu * 0.08, cu * 0.12, cu * 0.08 + (i % 2) * cu * 0.06, cu * 0.015);
      ink(ctx, ['#c08a48', '#e85d5d', '#5aa9e6', '#7bc96f', '#b388eb'][i % 5], 1.5);
    }
    // 창문 속 머리
    for (let i = 0; i < Math.min(4, seated.length); i++) {
      const p = seated[i], L = lookOf(p, s.stage), u = cu * 0.42;
      ctx.save();
      ctx.translate(-cu * 0.2 + i * cu * 0.15, -cu * 0.34);
      ctx.scale(p.face, 1);
      stampP(ctx, personSpr(L, 'head', 'scared', 'none', true, u * sc2), u);
      ctx.restore();
    }
    ctx.drawImage(carSpr(P.car, cu * sc2), -0.6 * cu, -0.62 * cu, 1.2 * cu, 0.7 * cu);
    if (seated.length > 4) {
      font(0.032, 900);
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUT;
      ctx.strokeText(`+${seated.length - 4}`, cu * 0.38, -cu * 0.6);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`+${seated.length - 4}`, cu * 0.38, -cu * 0.6);
    }
    if (drive > 0) for (let k = 0; k < 3; k++) (ell(ctx, cu * (0.55 + k * 0.12), -cu * 0.1 - k * cu * 0.03, cu * (0.04 + k * 0.02), cu * (0.03 + k * 0.015)), (ctx.fillStyle = 'rgba(220,220,235,.5)'), ctx.fill());
    ctx.restore();
    // 차로 뛰어가는 사람 (현관 → 계단 → 보도 → 차)
    for (const p of s.people) {
      if (p.st !== 'out') continue;
      const q = p.outT / 70, L = lookOf(p, s.stage), u = R(personH(s.rooms[doorRoom(s)])) * 0.85;
      const x = q < 0.25 ? 0.07 - q * 0.12 : 0.04 + ((q - 0.25) / 0.75) * (CAR_X - 0.08), y = q < 0.25 ? 1.1 + q * 0.32 : 1.19 + Math.abs(Math.sin(q * 20)) * -0.01;
      ctx.save();
      ctx.translate(X(x), Y(y));
      ctx.globalAlpha = q < 0.05 ? q / 0.05 : 1;
      ctx.drawImage(suitcase(sc2, R(0.03)), -R(0.04), -R(0.05), R(0.04), R(0.04));
      stampP(ctx, personSpr(L, (p.outT >> 3) % 2 ? 'run0' : 'run1', 'scared', 'none', p.k !== 'grandpa' || t - p.wigT > TEETH_T, u * sc2), u);
      ctx.restore();
    }
    // 강아지도 따라 나간다 (결과 화면)
    if (leaving) {
      const dog = s.people.find((p) => p.k === 'dog');
      if (dog && drive < 0.3) {
        const u = R(0.06), x = 0.06 + Math.min(1, s.pt / 40) * (CAR_X - 0.05);
        ctx.save();
        ctx.translate(X(x), Y(1.2));
        stampA(ctx, petSpr(false, (t >> 3) % 2 ? 'walk0' : 'walk1', u * sc2), u);
        ctx.restore();
      }
    }
  }
  ctx.restore();

  // ── 첫 톡 손가락 (1판, 아직 안 눌렀을 때) ──
  if (s.phase === 'play' && s.firstTap < 0 && s.stage === 0) {
    const o = s.objs.find((q) => q.k === 'frame' && q.room === 2);
    if (o) drawHand(ctx, X(o.x) + R(0.01), Y(o.cy) + R(0.01), R(0.07), Math.max(0, Math.sin(t * 0.14)));
  } else if (s.phase === 'play' && s.stTaps === 0 && s.spot && s.spot.id > 0 && t - s.spot.t > 90) {
    const o = s.objs.find((q) => q.id === s.spot!.id);
    if (o) drawHand(ctx, X(o.x) + R(0.01), Y(o.cy) + R(0.01), R(0.065), Math.max(0, Math.sin(t * 0.14)));
  }

  // ── 방금 일어난 일: 소리 · 파티클 · 흔들림 · 짧은 글자 (한 번만) ──
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x), ey = Y(e.y);
    switch (e.k) {
      case 'tap': snd('tick', 1.6, 0.4); break;
      case 'fly': snd('whoosh', 1.5, 0.7); break;
      case 'prank': {
        const k = e.text as OK;
        prankSound(fx, k);
        sn++;
        puff(ex, ey, k === 'sink' || k === 'tub' || k === 'fishbowl' ? '#8fd8ff' : k === 'lamp' || k === 'curtain' || k === 'tv' ? '#3a3f8a' : k === 'web' || k === 'wardrobe' ? '#2a2230' : '#fff3c4', 10, 3.6, 2.6);
        fx.kick(k === 'frame' || k === 'pot' || k === 'chair' ? 6 : 3);
        const o = s.objs.find((q) => q.id === e.n);
        say(ex, o && o.place === 'ceil' ? ey + R(0.09) : ey - R(0.055), OD[k].verb, '#ffffff', 19);
        break;
      }
      case 'big': {
        const n = e.n, rx = e.text as RX;
        snd('boing', 1.5 + Math.min(8, n) * 0.08, 0.9);
        if (n >= 2) snd('ding', 1 + Math.min(8, n) * 0.1, 0.5);
        puff(ex, ey, '#bfe8ff', 6 + n * 2, 3.2, 2.4);
        fx.kick(Math.min(14, 3 + n * 2));
        if (n === 1) say(ex, ey - R(0.03), YELL[rx], '#ffffff', 17);
        if (n >= 2) fx.ring(ex, ey, n >= 3 ? '#ffd84a' : '#ffffff', R(0.05 + n * 0.015), 3);
        break;
      }
      case 'spill': {
        const it = e.text as Item;
        snd(it === 'milk' ? 'splash' : 'crack', it === 'milk' ? 1.3 : 1.1, 0.9);
        puff(ex, ey, it === 'milk' ? '#ffffff' : it === 'book' ? '#e85d5d' : '#f3efe6', 14, 4.2, 3);
        if (it === 'milk') say(ex, ey + R(0.02), '철퍽!', '#e8f6ff', 16);
        break;
      }
      case 'crash': snd('crack', 1.2, 0.7); fx.kick(4); break;
      case 'bark': snd('boing', 0.75, 0.9); snd('thud', 1.6, 0.4); say(ex, ey - R(0.03), '멍멍!', '#ffe8a0', 17); fx.ring(ex, ey, '#ffe8a0', R(0.08), 3); break;
      case 'hiss': snd('zap', 1.8, 0.6); fx.ring(ex, ey, '#e0c8ff', R(0.07), 3); break;
      case 'teethfly': snd('whoosh', 1.8, 0.7); snd('tick', 2.2, 0.6); say(ex, ey - R(0.05), '틀니가!', '#ffd0e0', 17); break;
      case 'wigfly': snd('whoosh', 1.3, 0.7); break;
      case 'drip': snd('splash', 1.6, 0.5); break;
      case 'throw': snd('whoosh', 0.9, 0.8); break;
      case 'pack': snd('swell', 1.2, 0.9); puff(ex, ey, '#ffe36b', 10, 3.5, 2.6); break;
      case 'flee': snd('whoosh', 0.8, 0.6); break;
      case 'door': snd('thud', 1.4, 0.5); snd('tick', 0.7, 0.5); break;
      case 'seat': snd('pop', 0.8, 0.9); snd('coin', 1.1, 0.6); puff(X(CAR_X), Y(CAR_Y - 0.06), '#ffe36b', 8, 3, 2.4); break;
      case 'unpack': snd('pop', 1.4, 0.6); puff(ex, ey, '#f3d49a', 8, 2.6, 2.4); break;
      case 'laugh': snd('chime', 1.8, 0.6); say(ex, ey - R(0.03), '까르르!', '#ffd0e0', 15); break;
      case 'film': snd('tick', 2.4, 0.8); fx.blink('#ffffff', 0.25); say(ex, ey - R(0.04), '찰칵! 찍었다', '#ffe0e0', 15); break;
      case 'salt': snd('crack', 1.7, 0.9); snd('fail', 1.2, 0.7); puff(X(e.x2), Y(e.y2), '#ffffff', 18, 4.5, 2.6); say(X(e.x2), Y(e.y2) - R(0.05), '소금!', '#ffffff', 19); break;
      case 'heart': snd('fail', 0.8, 1); fx.blink('#ff3b30', 0.3); say(ex, ey, '하트 -1', '#ff8a7a', 18); break;
      case 'star3': snd('coin', 1.2, 1); puff(ex, ey, '#ffd84a', 14, 5, 3); fx.ring(ex, ey, '#ffd84a', R(0.2), 5); break;
      case 'newrx': snd('ding', 1.4, 0.5); break;
      case 'clock': snd('thud', 0.5, 1.2); snd('chime', 0.6, 0.9); fx.kick(9); fx.blink('#fff3c4', 0.15); say(X(0.5), Y(0.62), '댕— 댕—', '#fff3c4', 20); break;
      case 'stage': snd('ding', 1, 0.6); break;
      case 'clear': snd('clear', 1, 1); puff(X(CAR_X), Y(CAR_Y - 0.08), '#ffd84a', 18, 6, 3.2); puff(X(0.5), Y(0.7), '#9ff0ff', 14, 6, 3); break;
      case 'settle': snd('fail', 0.9, 1); fx.kick(6); break;
      case 'pickopen': snd('swell', 1.1, 0.9); break;
      case 'perk': snd('coin', 1, 1); snd('chime', 1.1, 0.9); puff(ex, ey - R(0.1), '#ffe36b', 16, 5, 3.2); fx.ring(ex, ey - R(0.08), '#ffe36b', R(0.2), 5); break;
      case 'end': snd(e.n ? 'clear' : 'fail', 0.9, 1); break;
    }
  }
  if (s.big && (fx.memo.bigT ?? -1) !== s.big.t && s.big.t > seenT) (fx.memo.bigT = s.big.t), fx.sound('chime', 1 + Math.min(8, s.big.n) * 0.05, 1), fx.blink('#fff6c8', 0.2), fx.kick(8);
  fx.memo.t = t;
  drawHud(ctx, s, w, h, sc2);
}
/** 짐 가방 */
const SUIT = new Map<string, HTMLCanvasElement>();
function suitcase(sc2: number, px: number) {
  const k = `${Math.round(px * sc2)}`;
  let c = SUIT.get(k);
  if (!c) {
    const q = px * sc2;
    c = layer(q * 1.4, q * 1.4, (g) => {
      g.scale(q, q);
      g.lineJoin = 'round';
      rr(g, 0.15, 0.35, 1.1, 0.9, 0.12);
      ink(g, lin(g, 0, 0.35, 0, 1.25, [0, '#e85d5d'], [1, '#b83a3a']), 0.08);
      rr(g, 0.5, 0.12, 0.4, 0.26, 0.08);
      g.strokeStyle = OUT;
      g.lineWidth = 0.08;
      g.stroke();
      seg(g, 0.15, 0.8, 1.25, 0.8, 0.08, '#ffd36b');
    });
    SUIT.set(k, c);
  }
  return c;
}
function drawTeeth(ctx: C2, k: number, t: number) {
  const open = Math.abs(Math.sin(t * 0.6)) * k * 0.35;
  ell(ctx, 0, -open, k, k * 0.45);
  ink(ctx, '#ff8a9a', 1.5);
  ell(ctx, 0, open, k, k * 0.45);
  ink(ctx, '#ff8a9a', 1.5);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 4; i++) {
    rr(ctx, -k * 0.7 + i * k * 0.36, -open - k * 0.05, k * 0.3, k * 0.32, k * 0.08);
    ctx.fill();
    rr(ctx, -k * 0.7 + i * k * 0.36, open - k * 0.27, k * 0.3, k * 0.32, k * 0.08);
    ctx.fill();
  }
}
function drawWig(ctx: C2, k: number) {
  ctx.beginPath();
  ctx.moveTo(-k, k * 0.3);
  ctx.quadraticCurveTo(-k * 0.9, -k * 0.9, 0, -k * 0.8);
  ctx.quadraticCurveTo(k, -k * 0.7, k, k * 0.3);
  ctx.quadraticCurveTo(0, -k * 0.1, -k, k * 0.3);
  ink(ctx, '#7a4a28', 1.6);
}
/** 물건 한 개 + 장난 몸짓 */
function drawObj(ctx: C2, s: HauntState, o: Obj, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, sc2: number, t: number) {
  const r = s.rooms[o.room], k = objK(r), u = R(0.1) * k, [ax, ay] = objAnchor(s, o), age = t - o.at, c = objSpr(o.k, u * sc2);
  const ready = o.rest <= 0, readyPulse = ready && s.phase === 'play' ? 0.5 + 0.5 * Math.sin(t * 0.09 + o.id * 1.3) : 0;
  ctx.save();
  ctx.translate(X(ax), Y(ay));
  // 쓸 수 있는 물건은 살짝 반짝 (쉬는 물건은 흐리게)
  if (ready && s.phase === 'play' && age > 70) {
    ctx.fillStyle = `rgba(255,250,200,${0.12 + 0.12 * readyPulse})`;
    ell(ctx, 0, o.place === 'floor' || o.place === 'shelf' ? -R(0.04) * k : o.place === 'ceil' ? R(0.035) * k : 0, R(0.055) * k, R(0.05) * k);
    ctx.fill();
  }
  const A = age < 90;
  switch (o.k) {
    case 'frame': {
      if (A && age < 60) {
        // 떨어져 바닥에 쾅 → 기울어 누움
        const f = Math.min(1, age / 12), drop = (r.fl - o.cy - 0.03) * f * f;
        ctx.translate(0, Y(o.cy + drop) - Y(o.cy));
        ctx.rotate(f * 0.5 + (age > 12 ? Math.sin(age * 0.6) * 0.05 * Math.max(0, 1 - (age - 12) / 20) : 0));
      } else if (A) ctx.globalAlpha = (age - 60) / 30;
      stampO(ctx, c, u);
      break;
    }
    case 'pot': {
      const jig = A && age < 40 ? Math.sin(age * 1.2) * R(0.004) * (1 - age / 40) : 0;
      ctx.translate(jig, 0);
      stampO(ctx, c, u);
      if (A && age < 50) {
        const ly = -1.3 * u - Math.sin(Math.min(1, age / 30) * Math.PI) * u * 0.9;
        ell(ctx, u * 0.05 + age * 0.4, ly, u * 0.4, u * 0.08, age * 0.2);
        ink(ctx, '#c8392b', 1.6);
      }
      if (A && age < 80) for (let i = 0; i < 3; i++) (ctx.globalAlpha = 0.6 * (1 - age / 80), ell(ctx, u * (-0.2 + i * 0.2), -1.5 * u - age * 0.5 - i * 4, u * 0.18, u * 0.12), (ctx.fillStyle = '#ffffff'), ctx.fill());
      break;
    }
    case 'chair': case 'stool': {
      if (A && age < 70) {
        const tip = age < 14 ? Math.sin(age * 0.9) * 0.45 : age < 55 ? 1.4 : 1.4 * (1 - (age - 55) / 15), sd = tip >= 0 ? 1 : -1;
        ctx.translate(u * 0.5 * sd, 0);
        ctx.rotate(tip);
        ctx.translate(-u * 0.5 * sd, 0);
      } else ctx.rotate(Math.sin(t * 0.05 + o.id) * 0.04);
      stampO(ctx, c, u);
      break;
    }
    case 'web': {
      stampO(ctx, c, u);
      if (A) {
        // 큰 거미가 줄을 타고 쭉
        const f = age < 18 ? age / 18 : age < 60 ? 1 : 1 - (age - 60) / 30, len = (r.fl - r.y0) * 0.55 * f;
        seg(ctx, u * 0.05, u * 0.3, u * 0.05, Y(r.y0 + len) - Y(r.y0), 1.2, 'rgba(240,240,255,.9)');
        ctx.save();
        ctx.translate(u * 0.05, Y(r.y0 + len) - Y(r.y0));
        ctx.rotate(Math.sin(age * 0.4) * 0.3);
        paintSpider(ctx, 0, 0, u * 0.28);
        ctx.restore();
      }
      break;
    }
    case 'wardrobe': {
      stampO(ctx, c, u);
      if (A && age < 80) {
        const op = Math.min(1, age / 8);
        for (const sd of [-1, 1]) {
          rr(ctx, sd > 0 ? u * 0.38 : -u * 0.38 - u * 0.36 * op, -1.36 * u, u * 0.36 * op, 1.2 * u, u * 0.04);
          ink(ctx, '#9a6234', 1.5);
        }
        rr(ctx, -u * 0.36, -1.36 * u, u * 0.72, 1.2 * u, 0);
        ctx.fillStyle = '#2a1a10';
        ctx.fill();
        for (let i = 0; i < 9; i++) {
          const a = hsh(i + o.id) * Math.PI - Math.PI, sp = 0.4 + hsh(i * 3 + 1) * 0.8, dd = Math.min(age, 60) * sp * u * 0.04;
          ctx.save();
          ctx.translate(Math.cos(a) * dd + (hsh(i) - 0.5) * u * 0.5, -0.7 * u + Math.sin(a) * dd * 0.6 + (age > 30 ? (age - 30) * u * 0.01 : 0));
          paintSpider(ctx, 0, 0, u * 0.09);
          ctx.restore();
        }
      }
      break;
    }
    case 'lamp': {
      const on = !(r.dark > 0) && !(A && age < 20 && (age >> 2) % 2 === 0);
      if (on) {
        ctx.fillStyle = radg(ctx, 0, u * 0.6, u * 0.05, u * 0.9, [0, 'rgba(255,240,170,.55)'], [1, 'rgba(255,240,170,0)']);
        ell(ctx, 0, u * 0.6, u * 0.9, u * 0.9);
        ctx.fill();
      }
      ctx.rotate(A ? Math.sin(age * 0.35) * 0.25 * Math.max(0, 1 - age / 60) : Math.sin(t * 0.03 + o.id) * 0.03);
      stampO(ctx, c, u);
      ell(ctx, 0, u * 0.62, u * 0.1, u * 0.06);
      ctx.fillStyle = on ? '#fff8c0' : '#5a5a6a';
      ctx.fill();
      break;
    }
    case 'tv': {
      stampO(ctx, c, u);
      const sx = -0.38 * u, sy = -1.02 * u, sw = 0.76 * u, sh = 0.5 * u;
      if (A && age < 60) {
        for (let i = 0; i < 12; i++) {
          ctx.fillStyle = hsh(i + age * 7) > 0.5 ? '#e8e8f0' : '#6a6a7a';
          ctx.fillRect(sx + hsh(i * 3 + age) * sw * 0.85, sy + hsh(i * 5 + age * 2) * sh * 0.85, sw * 0.15, sh * 0.15);
        }
        if (age > 20) {
          ctx.globalAlpha = Math.min(1, (age - 20) / 10);
          ell(ctx, 0, sy + sh * 0.5, sh * 0.32, sh * 0.38);
          ink(ctx, '#ffffff', 1.5);
          for (const sd of [-1, 1]) (ell(ctx, sd * sh * 0.12, sy + sh * 0.45, sh * 0.06, sh * 0.09), (ctx.fillStyle = OUT), ctx.fill());
          ell(ctx, 0, sy + sh * 0.68, sh * 0.08, sh * 0.07);
          ctx.fillStyle = OUT;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      } else if (!A) {
        ctx.fillStyle = `rgba(120,200,255,${0.35 + 0.1 * Math.sin(t * 0.3)})`;
        ctx.fillRect(sx + 2, sy + 2, sw - 4, sh - 4);
        ctx.fillStyle = 'rgba(255,230,120,.6)';
        ell(ctx, sx + sw * (0.3 + 0.2 * Math.sin(t * 0.05)), sy + sh * 0.6, sw * 0.1, sh * 0.15);
        ctx.fill();
      }
      break;
    }
    case 'curtain': {
      stampO(ctx, c, u);
      if (A && age < 70) {
        const f = Math.sin(Math.min(1, age / 70) * Math.PI);
        for (const sd of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(sd * 0.5 * u, -0.52 * u);
          ctx.quadraticCurveTo(sd * (0.1 - f * 0.3) * u, 0, sd * (0.05 - f * 0.4) * u, 0.5 * u);
          ctx.lineTo(sd * 0.56 * u, 0.46 * u);
          ctx.lineTo(sd * 0.56 * u, -0.52 * u);
          ctx.closePath();
          ink(ctx, '#d0506a', 1.5);
        }
        ctx.strokeStyle = 'rgba(255,255,255,.7)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) (ctx.beginPath(), ctx.moveTo(-u * 0.2 + age * 0.6, -u * 0.2 + i * u * 0.2), ctx.quadraticCurveTo(u * 0.2 + age * 0.6, -u * 0.3 + i * u * 0.2, u * 0.5 + age * 0.6, -u * 0.15 + i * u * 0.2), ctx.stroke());
      }
      break;
    }
    case 'sink': case 'tub': case 'fishbowl': {
      stampO(ctx, c, u);
      if (A && age < 70) {
        const top = o.k === 'sink' ? -1.22 * u : o.k === 'tub' ? -0.7 * u : -0.55 * u, sx = o.k === 'sink' ? -0.15 * u : 0;
        ctx.fillStyle = 'rgba(120,200,255,.85)';
        ctx.strokeStyle = '#2f8ee0';
        ctx.lineWidth = 1.5;
        if (o.k === 'tub') {
          const hh = Math.sin(Math.min(1, age / 50) * Math.PI) * u * 1.3;
          ctx.beginPath();
          ctx.moveTo(-u * 0.25, top);
          ctx.quadraticCurveTo(-u * 0.1, top - hh, 0, top - hh * 1.05);
          ctx.quadraticCurveTo(u * 0.1, top - hh, u * 0.25, top);
          ctx.fill();
          ctx.stroke();
        } else if (o.k === 'sink') {
          ctx.beginPath();
          ctx.moveTo(sx, top);
          ctx.quadraticCurveTo(sx - u * 0.6, top + u * 0.1, sx - u * 0.8 - age * 0.3, 0);
          ctx.lineTo(sx - u * 0.6 - age * 0.3, 0);
          ctx.quadraticCurveTo(sx - u * 0.4, top + u * 0.2, sx + u * 0.08, top + u * 0.05);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          const q = Math.min(1, age / 40), fx0 = Math.sin(q * Math.PI) * u * 0.9;
          ctx.save();
          ctx.translate(q * u * 0.4, top - fx0);
          ctx.rotate(q * 6);
          paintFish(ctx, 0, 0, u * 0.12);
          ctx.restore();
        }
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (hsh(i + o.id) - 0.5) * 2.2, dd = age * u * 0.03 * (0.5 + hsh(i * 7));
          ell(ctx, sx + Math.cos(a) * dd, top + Math.sin(a) * dd + age * age * u * 0.0006, u * 0.05, u * 0.07);
          ctx.fill();
        }
      } else if (o.k === 'fishbowl') {
        ctx.save();
        ctx.translate(Math.sin(t * 0.04 + o.id) * u * 0.12, -0.26 * u);
        ctx.scale(Math.cos(t * 0.04 + o.id) > 0 ? 1 : -1, 1);
        paintFish(ctx, 0, 0, u * 0.1);
        ctx.restore();
      }
      break;
    }
    case 'doll': case 'musicbox': case 'piano': case 'radio': {
      if (o.k === 'doll' && A && age < 70) {
        ctx.translate(0, -0.56 * u);
        ctx.rotate(age * 0.35);
        ctx.translate(0, 0.56 * u);
      }
      stampO(ctx, c, u);
      if (o.k === 'musicbox' && A && age < 80) {
        ctx.save();
        ctx.translate(0, -0.42 * u);
        ctx.scale(Math.cos(age * 0.4), 1);
        ell(ctx, 0, -0.2 * u, u * 0.06, u * 0.06);
        ink(ctx, '#ffd8b8', 1);
        ell(ctx, 0, -0.08 * u, u * 0.12, u * 0.05);
        ink(ctx, '#ff9fb2', 1);
        ctx.restore();
      }
      if (o.k === 'doll' && A && age < 70) for (const sd of [-1, 1]) (ell(ctx, sd * 0.08 * u, -0.6 * u, u * 0.05, u * 0.05), (ctx.fillStyle = '#ff2a2a'), ctx.fill());
      if (A && age < 80) {
        // 음표가 둥실
        for (let i = 0; i < 4; i++) {
          const f = ((age + i * 14) % 56) / 56, nx = (hsh(i + o.id) - 0.5) * u * 1.4 + Math.sin(f * 6 + i) * u * 0.2, ny = -1.0 * u - f * u * 1.4;
          ctx.globalAlpha = Math.sin(f * Math.PI);
          ctx.fillStyle = o.k === 'radio' ? '#c8b0ff' : '#ff6fd0';
          ell(ctx, nx, ny, u * 0.09, u * 0.07, -0.4);
          ctx.fill();
          seg(ctx, nx + u * 0.08, ny, nx + u * 0.08, ny - u * 0.3, u * 0.04, ctx.fillStyle as string);
          ctx.globalAlpha = 1;
        }
        if (o.k === 'radio') for (let i = 0; i < 3; i++) (ctx.globalAlpha = 1 - ((age + i * 10) % 30) / 30, ell(ctx, 0, -0.3 * u, u * (0.4 + ((age + i * 10) % 30) * 0.05), u * (0.3 + ((age + i * 10) % 30) * 0.04)), (ctx.strokeStyle = '#c8b0ff'), (ctx.lineWidth = 2), ctx.stroke(), (ctx.globalAlpha = 1));
        if (o.k === 'piano') for (let i = 0; i < 4; i++) if (((age >> 2) + i) % 3 === 0) (ctx.fillStyle = 'rgba(255,220,120,.85)'), ctx.fillRect(-0.5 * u + i * 0.26 * u, -0.62 * u, 0.1 * u, 0.15 * u);
      }
      break;
    }
    case 'mirror': {
      stampO(ctx, c, u);
      if (A && age < 80) {
        ctx.globalAlpha = Math.min(1, age / 8) * (age > 60 ? (80 - age) / 20 : 1);
        drawGhost(ctx, 0, u * 0.02, u * 0.2, 1, t, 2, 1);
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'books': {
      stampO(ctx, c, u);
      break;
    }
    case 'pumpkin': {
      const glow = A && age < 60 ? 1 : 0.5 + 0.2 * Math.sin(t * 0.2 + o.id);
      ctx.fillStyle = radg(ctx, 0, -0.3 * u, u * 0.1, u * (0.6 + glow * 0.6), [0, `rgba(255,170,60,${0.4 * glow})`], [1, 'rgba(255,170,60,0)']);
      ell(ctx, 0, -0.3 * u, u * 1.2, u * 1.2);
      ctx.fill();
      if (A && age < 50) ctx.scale(1 + Math.sin(age * 0.5) * 0.1, 1 + Math.sin(age * 0.5) * 0.1);
      stampO(ctx, c, u);
      break;
    }
  }
  ctx.restore();
}
/** 사람·동물 한 명 */
function drawPerson(ctx: C2, s: HauntState, p: Person, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, sc2: number, t: number) {
  const r = s.rooms[p.room];
  if (p.k === 'dog' || p.k === 'cat') {
    const u = R(p.k === 'dog' ? 0.075 : 0.065) * objK(r), cat = p.k === 'cat';
    const pose: APose = p.st === 'bark' ? 'bark' : p.st === 'walk' ? ((p.walkT >> 3) % 2 ? 'walk0' : 'walk1') : p.st === 'act' ? 'sleep' : 'stand';
    ctx.save();
    ctx.translate(X(p.x), Y(p.y) - (p.st === 'bark' ? Math.abs(Math.sin(p.stT * 0.5)) * R(0.012) : 0));
    ctx.scale(p.face, 1);
    stampA(ctx, petSpr(cat, pose, u * sc2), u);
    if (pose === 'sleep' && (t >> 5) % 2) (ctx.scale(p.face, 1), (ctx.font = `800 ${Math.round(R(0.026))}px system-ui`), (ctx.fillStyle = '#ffffff'), ctx.fillText('z', R(0.03), -R(0.05)));
    ctx.restore();
    return;
  }
  const ph = personH(r), u = R(ph), L = lookOf(p, s.stage), age = t - p.rxT;
  const worry = p.fv >= p.max * JUMPY && p.k !== 'kid', startle = t - p.startT < 24;
  let pose: Pose = 'stand', mood: Mood = p.k === 'kid' ? 'happy' : 'calm', dy = 0, rot = 0, dx = 0, special = '';
  const shake = worry && p.st !== 'react' ? Math.sin(t * 1.3 + p.id) * R(0.0018) : 0;
  switch (p.st) {
    case 'walk': pose = (p.walkT >> 3) % 2 ? 'walk0' : 'walk1'; break;
    case 'panic': case 'flee': pose = (p.walkT >> 2) % 2 ? 'run0' : 'run1'; mood = p.k === 'kid' ? 'happy' : 'scared'; break;
    case 'act':
      if (p.act === 'sofa' || p.act === 'tv' || p.act === 'desk' || p.act === 'piano') (pose = 'sit'), (dy = -0.022);
      else if (p.act === 'unpack') pose = 'kneel';
      else if (p.act === 'nap') special = 'nap';
      else if (p.act === 'bath') special = 'bath';
      if (p.act === 'piano' || p.act === 'desk') p.face = -1;
      break;
    case 'react': {
      const rx = p.rx!;
      mood = 'shock';
      if (rx === 'slip' || rx === 'bump') (pose = 'fall'), (mood = 'dizzy'), (dx = rx === 'slip' ? -p.face * Math.min(1, age / 14) * 0.03 : 0);
      else if (rx === 'faint') (pose = 'stand'), (mood = 'dizzy'), (rot = Math.min(1, age / 10));
      else if (rx === 'blanket') special = 'blanket';
      else if (rx === 'splash') special = 'bath';
      else {
        pose = 'jump';
        const q = Math.min(1, age / 26);
        dy = Math.sin(q * Math.PI) * ph * 0.55;
      }
      if (rx === 'jump' || rx === 'spill' || rx === 'teeth' || rx === 'wig') dy = Math.sin(Math.min(1, age / 26) * Math.PI) * ph * 0.55;
      break;
    }
    case 'pack': pose = 'kneel'; mood = 'scared'; break;
    case 'cheer': pose = 'cheer'; mood = 'happy'; dy = Math.abs(Math.sin(p.stT * 0.25)) * ph * 0.12; break;
    default: if (startle) (mood = 'scared'), (dy = Math.sin(Math.min(1, (t - p.startT) / 12) * Math.PI) * ph * 0.08);
  }
  if (p.k === 'kid' && t - p.laughT < 50) (mood = 'happy'), (pose = p.st === 'walk' ? pose : 'cheer'), (dy = Math.abs(Math.sin((t - p.laughT) * 0.4)) * ph * 0.1);
  if (startle && p.st !== 'react' && p.k !== 'kid') mood = 'scared';
  if (p.st === 'act' || p.st === 'idle') dy += Math.max(0, Math.sin(t * 0.09 + p.id * 1.7)) * ph * 0.012;
  if (!special) {
    ell(ctx, X(p.x + dx), Y(p.y) + 1, u * 0.2 * (1 - Math.min(0.5, dy / ph)), u * 0.045);
    ctx.fillStyle = 'rgba(60,30,20,.22)';
    ctx.fill();
  }
  const wig = !(p.k === 'grandpa' && t - p.wigT < TEETH_T);
  const item = p.st === 'react' && p.rx === 'spill' ? 'none' : p.item;
  ctx.save();
  ctx.translate(X(p.x + dx) + shake, Y(p.y - dy));
  if (special === 'nap' || special === 'blanket') {
    // 침대에 누워 (이불 뒤집어쓰면 이불 덩어리가 덜덜)
    const bx = X(r.x0 + 0.26) - X(p.x), shiver = special === 'blanket' ? Math.sin(t * 1.4) * R(0.002) : 0;
    ctx.translate(bx + shiver, -u * 0.32);
    if (special === 'nap') {
      ctx.save();
      ctx.translate(u * 0.42, -u * 0.02);
      ctx.rotate(-1.35);
      stampP(ctx, personSpr(L, 'head', 'sleep', 'none', wig, u * sc2), u);
      ctx.restore();
    }
    rr(ctx, -u * 0.5, -u * (special === 'blanket' ? 0.18 : 0.06), u * (special === 'blanket' ? 1.0 : 0.72), u * 0.24, u * 0.1);
    ink(ctx, lin(ctx, 0, -u * 0.2, 0, u * 0.2, [0, '#ffd0e0'], [1, '#f2a0bc']), 1.6);
    if (special === 'blanket') for (const sd of [-1, 1]) (ell(ctx, u * 0.32 + sd * u * 0.06, -u * 0.08, u * 0.03, u * 0.04), (ctx.fillStyle = '#ffffff'), ctx.fill(), ell(ctx, u * 0.32 + sd * u * 0.06, -u * 0.075, u * 0.014, u * 0.018), (ctx.fillStyle = OUT), ctx.fill());
    if (special === 'nap' && (t >> 5) % 2) (ctx.font = `800 ${Math.round(R(0.026))}px system-ui`), (ctx.fillStyle = '#ffffff'), ctx.fillText('z z', u * 0.55, -u * 0.45);
    ctx.restore();
    return;
  }
  if (special === 'bath') {
    // 욕조 속: 머리 + 거품 (놀라면 물보라)
    const tub = s.objs.find((o) => o.k === 'tub' && o.room === p.room), tx = tub ? X(tub.x) - X(p.x) : 0;
    const jump = p.st === 'react' ? Math.sin(Math.min(1, age / 24) * Math.PI) * u * 0.5 : 0;
    ctx.translate(tx, -u * 0.32 - jump);
    ctx.scale(p.face, 1);
    stampP(ctx, personSpr(L, 'head', p.st === 'react' ? 'shock' : 'happy', 'none', wig, u * sc2), u);
    ctx.restore();
    return;
  }
  // 하는 일마다 몸을 살랑 (서 있는 일만)
  if (p.st === 'act' && pose === 'stand' && !rot) ctx.rotate(Math.sin(t * 0.11 + p.id * 2) * 0.045);
  if (rot) {
    const sd = p.x < (r.x0 + r.x1) / 2 ? 1 : -1;
    ctx.translate(sd * u * 0.1 * rot, -u * 0.12 * rot);
    ctx.rotate(sd * (Math.PI / 2) * rot);
  }
  ctx.scale(p.face, 1);
  stampP(ctx, personSpr(L, pose, mood, item, wig, u * sc2), u);
  // 짐 싸기 · 도망: 가방
  if (p.st === 'pack') {
    const pop = Math.min(1, p.stT / 10);
    ctx.drawImage(suitcase(sc2, u * 0.32), u * 0.2, -u * 0.36 * pop, u * 0.4 * pop, u * 0.4 * pop);
    if ((p.stT >> 3) % 2) (ell(ctx, u * 0.4, -u * 0.42, u * 0.08, u * 0.05, p.stT * 0.3), ink(ctx, '#ffd166', 1));
  } else if (p.st === 'flee') ctx.drawImage(suitcase(sc2, u * 0.3), -u * 0.42, -u * 0.38, u * 0.34, u * 0.34);
  // 하는 일 작은 몸짓: 양치(칫솔·거품) · 요리(김) · 피아노(음표) · 설거지(거품)
  if (p.st === 'act' && p.act && p.k !== 'kid') {
    const ph2 = (t * 0.05 + p.id) % 1;
    if (p.act === 'brush') {
      const bx = u * 0.16 + Math.sin(t * 0.6) * u * 0.04;
      seg(ctx, bx, -u * 0.62, bx + u * 0.16, -u * 0.5, u * 0.035, '#5aa9e6');
      for (let k = 0; k < 3; k++) (ell(ctx, u * 0.14 + k * u * 0.05, -u * 0.66 - ((ph2 + k * 0.3) % 1) * u * 0.2, u * 0.03, u * 0.03), (ctx.fillStyle = 'rgba(255,255,255,.9)'), ctx.fill());
    } else if (p.act === 'cook' || p.act === 'wash') {
      for (let k = 0; k < 3; k++) {
        const f = (ph2 + k * 0.33) % 1;
        ctx.globalAlpha = 0.7 * (1 - f);
        ell(ctx, u * (0.3 + Math.sin(f * 6 + k) * 0.05), -u * (0.5 + f * 0.5), u * (0.05 + f * 0.05), u * (0.04 + f * 0.04));
        ctx.fillStyle = p.act === 'cook' ? '#ffffff' : '#bfe8ff';
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (p.act === 'piano' && (t >> 4) % 3 === 0) {
      ell(ctx, u * 0.2, -u * (1.0 + ph2 * 0.2), u * 0.05, u * 0.04, -0.4);
      ctx.fillStyle = '#ff6fd0';
      ctx.fill();
    }
  }
  // 유튜버: 셀카봉 카메라 (빨간 녹화 불)
  if (p.k === 'youtuber' && p.st !== 'react') {
    seg(ctx, u * 0.18, -u * 0.38, u * 0.42, -u * 0.72, u * 0.03, '#5a5a6a');
    rr(ctx, u * 0.36, -u * 0.84, u * 0.16, u * 0.12, u * 0.02);
    ink(ctx, '#2a2a30', 1.2);
    ell(ctx, u * 0.48, -u * 0.8, u * 0.025, u * 0.025);
    ctx.fillStyle = (t >> 4) % 2 ? '#ff3b30' : '#8a1a10';
    ctx.fill();
    if (t - p.filmT < 12) (ctx.fillStyle = 'rgba(255,255,255,.8)'), ell(ctx, u * 0.44, -u * 0.78, u * 0.25, u * 0.2), ctx.fill();
  }
  // 퇴마사 할머니: 소금 그릇 (소금 뿌리는 중이면 휙)
  if (p.k === 'exorcist' && p.st !== 'react' && p.st !== 'flee') {
    const throwing = t - p.saltT < 20;
    ctx.save();
    ctx.translate(u * 0.24, -u * (throwing ? 0.72 : 0.36));
    if (throwing) ctx.rotate(-0.8);
    ell(ctx, 0, 0, u * 0.1, u * 0.05);
    ink(ctx, '#d0c0a0', 1.2);
    ell(ctx, 0, -u * 0.02, u * 0.08, u * 0.03);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }
  // 쏟는 순간: 우유·접시·책이 날아간다
  if (p.st === 'react' && p.rx === 'spill' && age < 30) {
    const q = age / 30, it = s.events.find((e) => e.k === 'spill' && e.n === p.id && t - e.t < 40)?.text as Item | undefined;
    ctx.save();
    ctx.translate(u * (0.3 + q * 0.6), -u * 0.6 + q * q * u * 0.9 - Math.sin(q * Math.PI) * u * 0.4);
    ctx.rotate(q * 7);
    ctx.scale(u * 0.9, u * 0.9);
    paintItem(ctx, it ?? 'milk', 0, 0.05);
    ctx.restore();
  }
  ctx.restore();
}
/** 머리 위 말풍선: 무서워하는 것 그림 + 둘레 고리(겁 막대) */
function drawBubble(ctx: C2, s: HauntState, p: Person, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, sc2: number, t: number) {
  if (!human(p) || p.st === 'flee' || p.st === 'out' || p.st === 'gone' || s.phase === 'settle') return;
  const r = s.rooms[p.room], ph = personH(r), br = R(0.026) * Math.sqrt(objK(r)), kid = p.k === 'kid';
  let hy = p.y - ph * (kid ? 0.98 : 1.13);
  if (p.st === 'act' && (p.act === 'nap' || p.act === 'bath')) hy = p.y - ph * 0.72;
  if (p.st === 'act' && (p.act === 'sofa' || p.act === 'tv' || p.act === 'desk' || p.act === 'piano')) hy += 0.012;
  const pack = p.st === 'pack', f = clamp(p.fv / p.max, 0, 1), hot = f >= JUMPY && !kid;
  const bx = X(p.st === 'act' && p.act === 'nap' ? r.x0 + 0.26 + ph * 0.4 : p.x), by = Y(hy) - (hot ? Math.abs(Math.sin(t * 0.3 + p.id)) * R(0.003) : 0);
  ctx.save();
  // 꼬리 동그라미
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ell(ctx, bx - br * 0.35, by + br * 1.25, br * 0.22, br * 0.2);
  ctx.fill();
  ell(ctx, bx, by, br * 1.12, br * 1.12);
  ctx.fillStyle = 'rgba(255,255,255,.96)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(59,42,32,.5)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // 겁 막대: 둘레 고리
  if (!kid) {
    ctx.beginPath();
    ctx.arc(bx, by, br * 1.32, 0, TAU);
    ctx.strokeStyle = 'rgba(40,30,60,.35)';
    ctx.lineWidth = br * 0.32;
    ctx.stroke();
    if (f > 0.01) {
      ctx.beginPath();
      ctx.arc(bx, by, br * 1.32, -Math.PI / 2, -Math.PI / 2 + TAU * f);
      ctx.strokeStyle = f >= 1 || pack ? '#ff3b30' : hot ? ((t >> 3) % 2 ? '#ff5a4e' : '#ff8a3a') : f > 0.35 ? '#ffb03a' : '#ffd84a';
      ctx.lineWidth = br * 0.32;
      ctx.stroke();
    }
  }
  if (pack) ctx.drawImage(suitcase(sc2, br * 1.4), bx - br * 0.85, by - br * 0.85, br * 1.7, br * 1.7);
  else {
    const ic = iconSpr(kid ? 'kid' : p.fear, br * 1.1 * sc2);
    ctx.drawImage(ic, bx - br * 0.9 * 1.1, by - br * 0.9 * 1.1, br * 1.8 * 1.1, br * 1.8 * 1.1);
  }
  // 퇴마사: 소금 표시 · 유튜버: 녹화 표시
  if (p.k === 'exorcist') {
    ell(ctx, bx + br * 1.1, by - br * 0.9, br * 0.45, br * 0.45);
    ink(ctx, '#9b5de5', 1.2, '#ffffff');
    ell(ctx, bx + br * 1.1, by - br * 0.95, br * 0.22, br * 0.12);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  } else if (p.k === 'youtuber') {
    rr(ctx, bx + br * 0.7, by - br * 1.4, br * 1.2, br * 0.6, br * 0.2);
    ink(ctx, '#ff3b30', 1, '#ffffff');
  }
  // 땀방울 (조마조마)
  if (hot && !pack) {
    const ph2 = (t * 0.05 + p.id) % 1;
    ctx.globalAlpha = 1 - ph2;
    ell(ctx, bx + br * 1.7, by + br * 0.4 + ph2 * br, br * 0.22, br * 0.32);
    ctx.fillStyle = '#8fdcff';
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
function drawGhostNow(ctx: C2, s: HauntState, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, t: number) {
  if (s.phase === 'end' && !s.won) return;
  const k = R(0.052), bob = Math.sin(t * 0.08) * R(0.008);
  const recentPrank = s.events.some((e) => e.k === 'prank' && t - e.t < 26);
  const mood = s.gStun > 0 ? 3 : s.fly ? 1 : recentPrank ? 2 : s.phase === 'result' || (s.big && t - s.big.t < 60) ? 4 : 0;
  let gx = s.gx, gy = s.gy;
  if (s.phase !== 'play') (gx = 0.5 + Math.sin(t * 0.03) * 0.2), (gy = (LAYOUTS[STAGES[s.stage].ch].roofY - 0.06));
  // 날아온 자취
  if (s.fly) {
    const f = s.fly, o = s.objs.find((q) => q.id === f.obj);
    if (o)
      for (let i = 1; i <= 5; i++) {
        const q = Math.max(0, f.t / f.T - i * 0.12);
        const e = 1 - (1 - q) * (1 - q), x = f.x0 + (o.x - f.x0) * e, y = f.y0 + (o.cy - 0.02 - f.y0) * e - Math.sin(q * Math.PI) * 0.05;
        ctx.globalAlpha = 0.7 - i * 0.12;
        starPath(ctx, X(x), Y(y), R(0.012 - i * 0.0015), 0.45, t * 0.2 + i, 4);
        ctx.fillStyle = '#e8f6ff';
        ctx.fill();
      }
    ctx.globalAlpha = 1;
  }
  if (s.queue >= 0 && s.phase === 'play') {
    const o = s.objs.find((q) => q.id === s.queue);
    if (o) {
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ell(ctx, X(o.x), Y(o.cy), R(0.035), R(0.035));
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  drawGhost(ctx, X(gx), Y(gy) + bob, k, s.lv, t, mood, s.gFace);
}

// ───────────────────────────── 그리기: 띠 · 결과 · 선물 ─────────────────────────────
const starWord = (s: HauntState) => {
  const d = STAGES[s.stage];
  return [
    '가족 쫓아내기',
    d.star2 === 'box' ? '상자 반 남기기' : d.star2 === 'salt' ? '소금 안 맞기' : '카메라에 안 찍히기',
    d.star.k === 'chain' ? `한 번에 ${d.star.n}명 비명` : d.star.k === 'pack' ? `한 번에 ${d.star.n}명 이사` : d.star.k === 'fast' ? `${d.star.n}초 안에 쫓아내기` : `미끄러뜨리기 ${d.star.n}번`,
  ];
};
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
/** 반응 도감 그림 (가운데 (0,0), 크기 k px) */
function drawRxIcon(ctx: C2, rx: RX, k: number, sc2: number, t: number) {
  const L: Look = { skin: '#ffd8b8', hair: '#5a3a24', shirt: '#ff8a5c', shirt2: '#5aa9e6', pants: '#4a5a8a', shoe: '#4a3020', style: 'dad', costume: 0, party: false };
  const pp = (pose: Pose, mood: Mood, style: MK = 'dad', yy = 0.5) => {
    const u = k * 1.1;
    ctx.save();
    ctx.translate(0, k * yy);
    stampP(ctx, personSpr({ ...L, style, hair: HAIR[style], shirt: style === 'grandma' ? '#b388eb' : L.shirt }, pose, mood, 'none', true, u * sc2), u);
    ctx.restore();
  };
  switch (rx) {
    case 'jump': pp('jump', 'shock'); break;
    case 'spill': ctx.save(); ctx.scale(k * 0.9, k * 0.9); ctx.rotate(0.6); paintItem(ctx, 'milk', 0, 0.08); ctx.restore(); for (let i = 0; i < 4; i++) (ell(ctx, k * (-0.3 + i * 0.2), k * 0.3, k * 0.08, k * 0.06), (ctx.fillStyle = '#ffffff'), ctx.fill()); break;
    case 'teeth': drawTeeth(ctx, k * 0.4, t); break;
    case 'wig': drawWig(ctx, k * 0.45); break;
    case 'bark': ctx.save(); ctx.translate(0, k * 0.35); stampA(ctx, petSpr(false, 'bark', k * 0.9 * sc2), k * 0.9); ctx.restore(); break;
    case 'pack': ctx.drawImage(suitcase(sc2, k * 0.7), -k * 0.4, -k * 0.4, k * 0.8, k * 0.8); break;
    case 'bump': case 'slip': case 'faint': pp('fall', 'dizzy', rx === 'faint' ? 'mom' : 'boy', 0.35); if (rx === 'slip') (ell(ctx, 0, k * 0.38, k * 0.45, k * 0.07), (ctx.fillStyle = 'rgba(110,190,255,.8)'), ctx.fill()); if (rx === 'bump') (starPath(ctx, k * 0.25, -k * 0.35, k * 0.15), (ctx.fillStyle = '#ffe36b'), ctx.fill()); break;
    case 'blanket': rr(ctx, -k * 0.45, -k * 0.15, k * 0.9, k * 0.35, k * 0.15); ink(ctx, '#f2a0bc', 1.4); for (const sd of [-1, 1]) (ell(ctx, sd * k * 0.08 + k * 0.2, -k * 0.05, k * 0.04, k * 0.05), (ctx.fillStyle = '#ffffff'), ctx.fill()); break;
    case 'splash': ctx.save(); ctx.translate(0, k * 0.25); stampP(ctx, personSpr({ ...L, style: 'mom', hair: HAIR.mom }, 'head', 'shock', 'none', true, k * sc2), k); ctx.restore(); for (let i = 0; i < 5; i++) (ell(ctx, k * (-0.4 + i * 0.2), k * (0.35 - (i % 2) * 0.1), k * 0.08, k * 0.1), (ctx.fillStyle = '#8fd8ff'), ctx.fill()); break;
    case 'laugh': ctx.save(); ctx.translate(0, k * 0.2); stampP(ctx, personSpr({ ...L, style: 'kid', hair: HAIR.kid }, 'head', 'happy', 'none', true, k * sc2), k); ctx.restore(); break;
  }
}
function drawHud(ctx: C2, s: HauntState, w: number, h: number, sc2: number) {
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const d = STAGES[s.stage], scD = devScale(ctx);
  let G: C2 = ctx;
  const font = (sz: number, wgt = 800) => (G.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  const text = (str: string, x: number, y: number, fill: string, stroke = '', lw = 0) => {
    G.lineJoin = 'round';
    if (lw > 0) (G.lineWidth = lw), (G.strokeStyle = stroke), G.strokeText(str, x, y);
    G.fillStyle = fill;
    G.fillText(str, x, y);
  };
  const cached = (id: string, hpx: number, key: string, paint: (g: C2) => void) =>
    bar(id, w, hpx, scD, key, (g) => {
      G = g;
      paint(g);
      G = ctx;
    });
  const INK = '#3b2a20', MUTED = '#9a8670', CREAM = '#fff6dc';
  ctx.textBaseline = 'middle';
  // ── 위 띠: 판 · 가족 이름 · 남은 상자 · 하트 · 별 ──
  ctx.drawImage(cached('top', Y(0.1), `${s.stage}|${s.hearts}|${s.stars}|${s.boxLeft}|${d.boxes}`, (ctx) => {
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, w, Y(0.1));
    ctx.fillStyle = '#e3c48c';
    ctx.fillRect(0, Y(0.1) - 2, w, 2);
    ell(ctx, X(0.062), Y(0.05), R(0.036), R(0.036));
    ctx.fillStyle = '#7b5cd6';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    font(0.046, 900);
    text(String(s.stage + 1), X(0.062), Y(0.052), '#ffffff');
    ctx.textAlign = 'left';
    font(0.042, 900);
    text(d.fam, X(0.115), Y(0.052), INK);
    // 남은 상자
    const bxX = X(0.43);
    ctx.save();
    ctx.translate(bxX, Y(0.068));
    ctx.drawImage(boxSpr(R(0.04) * scD), -0.5 * R(0.04), -0.9 * R(0.04), 1.2 * R(0.04), 1.2 * R(0.04));
    ctx.restore();
    font(0.04, 900);
    text(`${s.boxLeft}`, bxX + R(0.032), Y(0.053), s.boxLeft <= 3 && !d.safe ? '#e03a2a' : INK);
    for (let i = 0; i < 3; i++) {
      heartPath(ctx, X(0.62 + i * 0.05), Y(0.05), R(0.017));
      ctx.fillStyle = i < s.hearts ? '#ff4d5e' : '#e6d6bc';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    starPath(ctx, X(0.8), Y(0.049), R(0.022));
    ctx.fillStyle = '#ffc93c';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    font(0.04, 900);
    text(String(s.stars), X(0.83), Y(0.053), INK);
  }), 0, 0, w, Y(0.1));
  // 레벨: 작은 유령 (둥실이니 프레임마다)
  drawGhost(ctx, X(0.94), Y(0.052), R(0.02), s.lv, t, 0, -1);
  if (s.boxLeft <= 3 && !d.safe && s.phase === 'play' && (t >> 4) % 2) {
    ctx.strokeStyle = '#ff3b30';
    ctx.lineWidth = 2.5;
    rr(ctx, X(0.405), Y(0.018), R(0.1), R(0.065), R(0.015));
    ctx.stroke();
  }

  // ── 아래 띠: 별 셋 · 한 줄 도움말 · 레벨/도감 ──
  const words = starWord(s), res = s.phase === 'result';
  const st = d.star, now = st.k === 'chain' ? s.best : st.k === 'pack' ? s.bestPack : s.slips;
  const left = st.k === 'fast' ? st.n - (s.firstTap < 0 ? 0 : Math.floor((s.t - s.firstTap) / 60)) : 0;
  const prog = res || s.starOk[2] ? '' : st.k === 'fast' ? (left >= 0 ? ` ${left}` : '') : ` ${Math.min(now, st.n)}/${st.n}`;
  const lost2 = d.star2 === 'box' ? s.boxLeft < Math.ceil(d.boxes / 2) : d.star2 === 'salt' ? s.salted > 0 : s.filmed > 0;
  const state = [res ? 1 : 0, res ? (s.starOk[1] ? 1 : -1) : lost2 ? -1 : 0, s.starOk[2] ? 1 : res || (st.k === 'fast' && left < 0) ? -1 : 0];
  const labels = words.map((q, i) => q + (i === 2 ? prog : ''));
  const kidIn = s.people.some((p) => p.k === 'kid' && awake(p)), exIn = s.people.some((p) => p.k === 'exorcist' && awake(p)), ytIn = s.people.some((p) => p.k === 'youtuber' && awake(p));
  const jumpy = s.people.some((p) => human(p) && awake(p) && p.k !== 'kid' && p.fv >= p.max * JUMPY);
  let tip = '비명은 옆방·위아래 방까지 번져요';
  if (s.phase === 'pick') tip = '집에 둘 큰 물건 하나를 톡!';
  else if (s.phase === 'result') tip = s.newRx.length ? `새 반응 '${RX_NAME[s.newRx[s.newRx.length - 1]]}'!` : s.got === 3 ? '별 셋! 점수가 네 배' : '별이 많을수록 점수가 곱해져요';
  else if (s.phase === 'end') tip = s.won ? '집을 되찾았어요!' : '누르면 다시 해요';
  else if (s.phase === 'settle') tip = '상자를 다 풀면 눌러앉아요!';
  else if (s.stage === 0 && s.firstTap < 0) tip = '액자를 톡! 아빠는 큰 소리가 무서워요';
  else if (s.stage === 0 && s.taps < 4) tip = '머리 위 그림 = 그 사람이 무서워하는 것';
  else if (exIn) tip = '보랏빛 방에서 장난치면 소금! 옆방 비명으로 놀래요';
  else if (ytIn) tip = '유튜버 방에선 불 끄기만 — 다른 장난은 찍혀요';
  else if (kidIn) tip = '꼬마 옆에선 까르르 — 덜 무서워해요';
  else if (s.boxLeft <= 3 && !d.safe) tip = '상자가 거의 다 풀렸어요! 서둘러요';
  else if (jumpy) tip = '겁이 반 넘게 찬 사람은 무엇에든 펄쩍!';
  else if (s.stage === 2) tip = '쏟은 우유도 물! 물을 무서워하는 사람 옆에서';
  else if (s.stage === 1) tip = '할아버지 가발이 옆방으로 — 거미인 줄 알아요';
  const perks = PERKS.map((p, i) => (s.perk[i] ? p[s.perk[i] - 1].name : '')).filter(Boolean);
  const lvLine = `유령 Lv${s.lv} · 반응 ${s.rdex.length}/${REACTS.length} · 쫓아낸 집 ${s.fams.length}/${STAGES.length}${perks.length ? ' · ' + perks.join(' · ') : ''}`, yb = Y(1.305);
  const wide = words.map((q, i) => q + (i === 2 && prog ? (st.k === 'fast' ? ` ${st.n}` : ` ${st.n}/${st.n}`) : ''));
  ctx.drawImage(cached('bot', h - yb, `${labels.join('|')}#${state.join(',')}#${lvLine}#${tip}`, (ctx) => {
    ctx.translate(0, -yb);
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, Y(1.305), w, h - Y(1.305));
    ctx.fillStyle = '#e3c48c';
    ctx.fillRect(0, Y(1.305), w, 2);
    font(0.031, 800);
    const gap = R(0.01), pad = Math.min(R(0.06), (w - R(0.02) - gap * 2 - wide.reduce((a, q) => a + ctx.measureText(q).width, 0)) / 3);
    const ws = wide.map((q) => ctx.measureText(q).width + pad), total = ws.reduce((a, b) => a + b, 0) + gap * 2;
    let cx = (w - total) / 2;
    labels.forEach((q, i) => {
      const cw = ws[i], cy = Y(1.348), on = state[i] > 0, off = state[i] < 0;
      rr(ctx, cx, cy - R(0.027), cw, R(0.054), R(0.027));
      ctx.fillStyle = on ? '#ffe9a0' : off ? '#efe4cf' : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = on ? '#e0a020' : off ? '#d6c6a8' : '#c9a878';
      ctx.lineWidth = on ? 2 : 1.4;
      ctx.stroke();
      starPath(ctx, cx + pad * 0.42, cy - 0.5, R(0.016));
      ctx.fillStyle = on ? '#ffb800' : off ? '#d6c6a8' : '#e9d9b8';
      ctx.fill();
      ctx.textAlign = 'left';
      font(0.031, 800);
      text(q, cx + pad * 0.74, cy + 0.5, off ? '#b8a688' : INK);
      if (off) (ctx.fillStyle = '#b8a688'), ctx.fillRect(cx + pad * 0.7, cy, cw - pad, 1.5);
      cx += cw + gap;
    });
    ctx.textAlign = 'center';
    font(0.034, 800);
    text(tip, w / 2, Y(1.402), INK);
    font(0.03, 700);
    text(lvLine, w / 2, Y(1.452), MUTED);
  }), 0, yb, w, h - yb);

  // ── 판 시작 띠 (NEW 한 줄) — 하늘 자리, 방은 가리지 않는다 ──
  if (s.banner && (s.phase === 'play' || s.phase === 'settle') && !(s.big && s.big.t >= s.banner.t && t - s.big.t < 64)) {
    const age = t - s.banner.t, T = 200;
    if (age < T) {
      const a = Math.min(1, age / 10, (T - age) / 14), slide = (1 - Math.min(1, age / 10)) * R(0.05), by = Y(0.115) - slide;
      ctx.globalAlpha = clamp(a, 0, 1);
      rr(ctx, X(0.04), by, R(0.92), R(0.112), R(0.03));
      ctx.fillStyle = 'rgba(255,250,235,.96)';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      font(0.038, 900);
      const head = s.banner.head, hw = ctx.measureText(head).width, pill = R(0.105), gap2 = R(0.014), isNew = s.banner.head.indexOf('다시') < 0;
      const tot = hw + (isNew ? gap2 + pill : 0);
      let bx0 = w / 2 - tot / 2;
      ctx.textAlign = 'left';
      text(head, bx0, by + R(0.033), '#d9480f');
      bx0 += hw + gap2;
      if (isNew) {
        rr(ctx, bx0, by + R(0.012), pill, R(0.042), R(0.021));
        ctx.fillStyle = '#ff3b30';
        ctx.fill();
        font(0.034, 900);
        ctx.textAlign = 'center';
        text('NEW', bx0 + pill / 2, by + R(0.034), '#ffffff');
      }
      ctx.textAlign = 'center';
      let fs = 0.033;
      font(fs, 800);
      while (ctx.measureText(s.banner.sub).width > R(0.86) && fs > 0.026) font((fs -= 0.001), 800);
      text(s.banner.sub, w / 2, by + R(0.081), INK);
      ctx.globalAlpha = 1;
    }
  }
  // ── 큰 순간 띠 (한 번에 하나): 하늘 자리 가운데 ──
  if (s.big && t - s.big.t < 64 && s.phase === 'play') {
    const age = t - s.big.t, k = age < 8 ? 0.6 + (age / 8) * 0.55 : age < 14 ? 1.15 - ((age - 8) / 6) * 0.15 : 1, a = Math.min(1, (64 - age) / 12);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, Y(0.28));
    ctx.scale(k, k);
    ctx.fillStyle = s.big.star ? '#ffd23f' : '#ff7a3a';
    burstPath(ctx, 0, 0, R(0.2), 14, 0.8, t * 0.01);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.textAlign = 'center';
    font(0.058, 900);
    text(s.big.text, 0, R(0.004), '#ffffff', INK, 6);
    if (s.big.star) {
      starPath(ctx, 0, -R(0.075), R(0.03));
      ctx.fillStyle = '#fff6c0';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }
  // ── 눌러앉음 (상자를 다 풀었다) ──
  if (s.phase === 'settle') {
    const a = Math.min(1, s.pt / 14);
    ctx.globalAlpha = a;
    rr(ctx, X(0.1), Y(0.2), R(0.8), R(0.17), R(0.04));
    ctx.fillStyle = 'rgba(255,246,220,.96)';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    font(0.058, 900);
    text('"우리 집이다!"', w / 2, Y(0.255), '#e8663a');
    font(0.034, 800);
    text(`상자를 다 풀었어요 · 하트 -1 · ${STAGES[s.stage].fam} 다시`, w / 2, Y(0.32), INK);
    ctx.globalAlpha = 1;
  }
  if (s.phase === 'result') drawResult(ctx, s, w, sc2);
  else if (s.phase === 'pick') drawPick(ctx, s, w, h);
  else if (s.phase === 'end') {
    const a = Math.min(1, s.pt / 20);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(255,246,220,.95)';
    rr(ctx, X(0.08), Y(0.36), R(0.84), R(0.6), R(0.04));
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    font(0.06, 900);
    text(s.won ? '내 집을 되찾았다!' : '엉엉… 하트가 없어요', w / 2, Y(0.44), s.won ? '#7b5cd6' : '#e8663a');
    font(0.042, 800);
    text(`점수 ${fmt(s.pts + s.sp)} · 별 ${s.stars}개`, w / 2, Y(0.52), INK);
    text(`쫓아낸 가족 ${s.fams.length}/${STAGES.length} · 반응 ${s.rdex.length}/${REACTS.length}`, w / 2, Y(0.58), MUTED);
    REACTS.forEach((rx, i) => {
      const px = X(0.17 + (i % 6) * 0.132), py = Y(0.68 + Math.floor(i / 6) * 0.12);
      ell(ctx, px, py, R(0.045), R(0.045));
      ctx.fillStyle = s.rdex.includes(rx) ? '#fff0c8' : '#e8dcc4';
      ctx.fill();
      ctx.save();
      ctx.translate(px, py);
      if (s.rdex.includes(rx)) drawRxIcon(ctx, rx, R(0.04), sc2, t);
      else (font(0.04, 900), text('?', 0, 0, '#c8b898'));
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }
}
/** 판 결과: 별 · 점수 · 반응 도감 · 다음 집 */
function drawResult(ctx: C2, s: HauntState, w: number, sc2: number) {
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t, a = Math.min(1, s.pt / 14);
  const INK = '#3b2a20', MUTED = '#9a8670';
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  const text = (str: string, x: number, y: number, fill: string) => ((ctx.fillStyle = fill), ctx.fillText(str, x, y));
  const top = Y(0.2) + (1 - a) * R(0.2);
  ctx.globalAlpha = a;
  rr(ctx, X(0.06), top, R(0.88), R(0.84), R(0.05));
  ctx.fillStyle = 'rgba(255,248,228,.97)';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.textAlign = 'center';
  font(0.056, 900);
  text(`${STAGES[s.stage].fam} 쫓아냈다!`, w / 2, top + R(0.065), '#7b5cd6');
  for (let i = 0; i < 3; i++) {
    const ok = s.starOk[i], show = s.pt > 16 + i * 12, k = show ? Math.min(1, (s.pt - 16 - i * 12) / 8) : 0;
    const sx = X(0.27 + i * 0.23), sy = top + R(0.165);
    starPath(ctx, sx, sy, R(0.052) * (ok ? 0.7 + 0.3 * k + (k < 1 ? 0.3 * Math.sin(k * Math.PI) : 0) : 1));
    ctx.fillStyle = ok && show ? '#ffc93c' : '#eadcc0';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    font(0.027, 700);
    const wd = starWord(s)[i], sp = wd.indexOf(' ', 3);
    if (wd.length > 7 && sp > 0) (text(wd.slice(0, sp), sx, sy + R(0.075), ok ? INK : MUTED), text(wd.slice(sp + 1), sx, sy + R(0.106), ok ? INK : MUTED));
    else text(wd, sx, sy + R(0.078), ok ? INK : MUTED);
    if (ok && show && (juice(s).memo['rs' + i] ?? -1) !== s.stage) (juice(s).memo['rs' + i] = s.stage), juice(s).sound('ding', 1 + i * 0.2, 0.9), juice(s).burst(sx, sy, '#ffd84a', 12, 4, 2.6);
  }
  font(0.046, 900);
  text(`+${fmt(s.gain)}점 (별 ${s.got}개 ×${STAR_MUL[s.got]})`, w / 2, top + R(0.32), INK);
  font(0.03, 700);
  text(`점수 ${fmt(s.pts)} · 유령 Lv${s.lv}${LV_GIFT[s.lv] ? ' — ' + LV_GIFT[s.lv] : ''}`, w / 2, top + R(0.375), MUTED);
  // 반응 도감
  font(0.031, 800);
  text(`겁주기 반응 도감 ${s.rdex.length}/${REACTS.length}`, w / 2, top + R(0.44), INK);
  REACTS.forEach((rx, i) => {
    const px = X(0.155 + (i % 6) * 0.138), py = top + R(0.53 + Math.floor(i / 6) * 0.115);
    const nw = s.newRx.includes(rx), has = s.rdex.includes(rx);
    ell(ctx, px, py, R(0.054), R(0.054));
    ctx.fillStyle = nw ? `rgba(255,220,110,${0.7 + 0.3 * Math.sin(t * 0.2)})` : has ? '#fff0c8' : '#ece0c8';
    ctx.fill();
    ctx.save();
    ctx.translate(px, py);
    if (has) drawRxIcon(ctx, rx, R(0.055), sc2, t);
    else (font(0.04, 900), text('?', 0, 0, '#c8b898'));
    ctx.restore();
    if (nw) (font(0.022, 900), ctx.lineWidth = 3, (ctx.strokeStyle = '#ffffff'), ctx.strokeText('NEW', px, py - R(0.06)), text('NEW', px, py - R(0.06), '#ff3b30'));
  });
  // 다음 집 미리 보기
  const nx = STAGES[s.stage + 1];
  if (nx) {
    font(0.031, 800);
    text(`다음 집: ${nx.fam} — NEW ${nx.news.split(' — ')[0].split('!')[0].slice(0, 16)}`, w / 2, top + R(0.75), INK);
  }
  if (s.pt >= RES_MIN) {
    font(0.033, 900);
    text('톡 하면 다음 집', w / 2, top + R(0.8), (t >> 4) % 2 ? '#e8663a' : '#ff9a3c');
  }
  ctx.globalAlpha = 1;
}
/** 장 끝 선물: 집의 큰 물건 둘 중 하나를 톡 */
function drawPick(ctx: C2, s: HauntState, w: number, h: number) {
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const INK = '#3b2a20';
  const ch = STAGES[s.stage].ch, a = Math.min(1, s.pt / 16);
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  ctx.globalAlpha = a * 0.6;
  ctx.fillStyle = '#120e30';
  ctx.fillRect(0, Y(0.1), w, Y(1.205));
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  font(0.054, 900);
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.strokeText('새 집에 둘 큰 물건! 하나를 톡', w / 2, Y(0.3));
  ctx.fillStyle = '#ffe36b';
  ctx.fillText('새 집에 둘 큰 물건! 하나를 톡', w / 2, Y(0.3));
  for (let i = 0; i < 2; i++) {
    const px = X(i ? 0.72 : 0.28), py = Y(0.88), chosen = s.picked === i, other = s.picked >= 0 && !chosen;
    ctx.globalAlpha = a * (other ? 0.35 : 1);
    ctx.fillStyle = `rgba(255,236,120,${0.25 + 0.15 * Math.sin(t * 0.15 + i)})`;
    ell(ctx, px, py, R(0.18), R(0.05));
    ctx.fill();
    drawPerk(ctx, ch, i, px, py, R(chosen ? 0.3 : 0.26), t);
    font(0.04, 900);
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.strokeText(PERKS[ch][i].name, px, py + R(0.08));
    ctx.fillStyle = '#ffffff';
    ctx.fillText(PERKS[ch][i].name, px, py + R(0.08));
    font(0.03, 800);
    const ln = PERKS[ch][i].line, cut = ln.indexOf(' ', Math.floor(ln.length / 2) - 2);
    const rows = cut > 0 ? [ln.slice(0, cut), ln.slice(cut + 1)] : [ln];
    rows.forEach((r, j) => {
      ctx.strokeText(r, px, py + R(0.125 + j * 0.042));
      ctx.fillStyle = '#fff3c4';
      ctx.fillText(r, px, py + R(0.125 + j * 0.042));
    });
  }
  ctx.globalAlpha = 1;
  if (s.picked < 0 && s.pt > PICK_MIN) drawHand(ctx, X(0.28) + R(0.05), Y(0.74), R(0.08), Math.max(0, Math.sin(t * 0.14)));
  void h;
}
/** 측정·스크린샷용 그림 도구 */
export const __art = { personSpr, lookOf, drawGhost, drawPerk, paintFearIcon, objSpr, stampO, stampP };
