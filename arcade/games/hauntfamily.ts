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
const BIG = 27, BIG_SCREAM = 23, SMALL = 3, LEAK = 1.5, DEPTH_UP = 0.15;
/** 유령: 날아가는 틱(거리에 따라) · 장난 뒤 쉼 · 물건 쉼(레벨마다 줄어듦) · 톡 판정 반지름 */
const FLY_T0 = 7, FLY_T1 = 12, G_REST = 28, OBJ_REST = 78, PICK_R = 0.16;
/** 비명이 옆방에 닿는 틱 · 와장창(쏟음) 틱 · 멍멍 틱 */
const SCREAM_D = 20, CRASH_D = 14, BARK_D = 12;
/** 처음 10초는 겁이 식지 않는다 · 겁이 식는 빠르기(틱당) · 놀란 뒤 이만큼은 안 식음 · 놀란 뒤 상자를 못 푸는 틱 */
const SAFE_T = 600, DECAY = 0.035, DECAY_WAIT = 200, SHAKE_T = 240;
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
interface Layout { name: string; rooms: RoomDef[]; stairs: Stair[]; roofY: number; objs: [OK, number, number, Place][]; spots: [number, number, Act][] }
/** 사람이 하는 일 (자리마다 하나) */
export type Act = 'cook' | 'wash' | 'tv' | 'sofa' | 'bath' | 'brush' | 'nap' | 'window' | 'desk' | 'piano' | 'read' | 'fridge' | 'look';
const STREET = 1.08, DOOR_X = 0.045, CAR_X = 0.27, CAR_Y = 1.245;
const L2F = (y0: number, y1: number, k0: RK, k1: RK): RoomDef[] => [{ x0: 0.045, y0, x1: 0.5, y1, kind: k0 }, { x0: 0.5, y0, x1: 0.955, y1, kind: k1 }];
export const LAYOUTS: Layout[] = [
  {
    name: '아담한 이층집',
    rooms: [...L2F(0.42, 0.75, 'bath', 'bed'), ...L2F(0.75, 1.08, 'kitchen', 'living')],
    stairs: [{ lo: 3, hi: 1, xl: 0.845, xh: 0.915 }],
    roofY: 0.42,
    objs: [
      ['web', 0, 0.09, 'ceil'], ['lamp', 0, 0.29, 'ceil'], ['tub', 0, 0.32, 'floor'], ['stool', 0, 0.13, 'floor'],
      ['wardrobe', 1, 0.565, 'floor'], ['frame', 1, 0.75, 'wall'], ['curtain', 1, 0.655, 'wall'], ['lamp', 1, 0.75, 'ceil'],
      ['frame', 2, 0.22, 'wall'], ['pot', 2, 0.43, 'floor'], ['sink', 2, 0.32, 'floor'], ['lamp', 2, 0.28, 'ceil'], ['web', 2, 0.46, 'ceil'],
      ['tv', 3, 0.58, 'floor'], ['chair', 3, 0.69, 'floor'], ['web', 3, 0.54, 'ceil'], ['fishbowl', 3, 0.79, 'shelf'], ['lamp', 3, 0.7, 'ceil'],
    ],
    spots: [
      [0, 0.32, 'bath'], [0, 0.14, 'brush'], [0, 0.22, 'look'],
      [1, 0.75, 'nap'], [1, 0.655, 'window'], [1, 0.58, 'look'],
      [2, 0.43, 'cook'], [2, 0.32, 'wash'], [2, 0.15, 'fridge'], [2, 0.27, 'look'],
      [3, 0.75, 'sofa'], [3, 0.62, 'tv'], [3, 0.8, 'look'],
    ],
  },
  {
    name: '삼층 타운하우스',
    rooms: [...L2F(0.36, 0.6, 'study', 'music'), ...L2F(0.6, 0.84, 'bath', 'bed'), ...L2F(0.84, 1.08, 'kitchen', 'living')],
    stairs: [{ lo: 5, hi: 3, xl: 0.845, xh: 0.915 }, { lo: 3, hi: 1, xl: 0.845, xh: 0.915 }],
    roofY: 0.36,
    objs: [
      ['web', 0, 0.09, 'ceil'], ['frame', 0, 0.3, 'wall'], ['lamp', 0, 0.25, 'ceil'], ['musicbox', 0, 0.43, 'shelf'],
      ['piano', 1, 0.6, 'floor'], ['doll', 1, 0.79, 'shelf'], ['curtain', 1, 0.7, 'wall'], ['chair', 1, 0.77, 'floor'],
      ['tub', 2, 0.32, 'floor'], ['web', 2, 0.09, 'ceil'], ['lamp', 2, 0.27, 'ceil'], ['stool', 2, 0.13, 'floor'],
      ['wardrobe', 3, 0.565, 'floor'], ['frame', 3, 0.75, 'wall'], ['curtain', 3, 0.655, 'wall'], ['doll', 3, 0.81, 'shelf'],
      ['frame', 4, 0.22, 'wall'], ['pot', 4, 0.43, 'floor'], ['sink', 4, 0.32, 'floor'], ['lamp', 4, 0.28, 'ceil'], ['web', 4, 0.46, 'ceil'],
      ['tv', 5, 0.58, 'floor'], ['chair', 5, 0.69, 'floor'], ['fishbowl', 5, 0.79, 'shelf'], ['lamp', 5, 0.7, 'ceil'], ['web', 5, 0.54, 'ceil'],
    ],
    spots: [
      [0, 0.3, 'desk'], [0, 0.42, 'read'], [0, 0.16, 'look'],
      [1, 0.6, 'piano'], [1, 0.7, 'window'], [1, 0.8, 'look'],
      [2, 0.32, 'bath'], [2, 0.14, 'brush'], [2, 0.22, 'look'],
      [3, 0.75, 'nap'], [3, 0.655, 'window'], [3, 0.58, 'look'],
      [4, 0.43, 'cook'], [4, 0.32, 'wash'], [4, 0.15, 'fridge'], [4, 0.27, 'look'],
      [5, 0.75, 'sofa'], [5, 0.62, 'tv'], [5, 0.8, 'look'],
    ],
  },
  {
    name: '언덕 위 저택',
    rooms: [...L2F(0.36, 0.6, 'study', 'bed'), ...L2F(0.6, 0.84, 'bath', 'music'), ...L2F(0.84, 1.08, 'kitchen', 'living')],
    stairs: [{ lo: 5, hi: 3, xl: 0.845, xh: 0.915 }, { lo: 3, hi: 1, xl: 0.845, xh: 0.915 }],
    roofY: 0.36,
    objs: [
      ['books', 0, 0.42, 'shelf'], ['web', 0, 0.09, 'ceil'], ['lamp', 0, 0.25, 'ceil'], ['frame', 0, 0.2, 'wall'], ['musicbox', 0, 0.3, 'shelf'],
      ['wardrobe', 1, 0.565, 'floor'], ['frame', 1, 0.75, 'wall'], ['curtain', 1, 0.655, 'wall'], ['doll', 1, 0.81, 'shelf'],
      ['tub', 2, 0.33, 'floor'], ['mirror', 2, 0.15, 'wall'], ['lamp', 2, 0.27, 'ceil'], ['web', 2, 0.46, 'ceil'],
      ['piano', 3, 0.6, 'floor'], ['books', 3, 0.79, 'shelf'], ['curtain', 3, 0.7, 'wall'], ['lamp', 3, 0.7, 'ceil'],
      ['frame', 4, 0.22, 'wall'], ['pot', 4, 0.43, 'floor'], ['sink', 4, 0.32, 'floor'], ['lamp', 4, 0.28, 'ceil'], ['web', 4, 0.46, 'ceil'],
      ['tv', 5, 0.58, 'floor'], ['radio', 5, 0.79, 'shelf'], ['chair', 5, 0.69, 'floor'], ['mirror', 5, 0.72, 'wall'], ['lamp', 5, 0.7, 'ceil'],
    ],
    spots: [
      [0, 0.3, 'desk'], [0, 0.42, 'read'], [0, 0.16, 'look'],
      [1, 0.75, 'nap'], [1, 0.655, 'window'], [1, 0.58, 'look'],
      [2, 0.33, 'bath'], [2, 0.14, 'brush'], [2, 0.22, 'look'],
      [3, 0.6, 'piano'], [3, 0.7, 'window'], [3, 0.8, 'look'],
      [4, 0.43, 'cook'], [4, 0.32, 'wash'], [4, 0.15, 'fridge'], [4, 0.27, 'look'],
      [5, 0.75, 'sofa'], [5, 0.62, 'tv'], [5, 0.8, 'look'],
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
  /** 별 셋째: 한 번에 N명 비명 · 한 번에 N명 이삿짐 · 미끄러뜨리기 N번 */
  star: { k: 'chain' | 'pack' | 'slip'; n: number };
  big?: boolean; pal: number; safe?: boolean;
}
export const CHAPTERS = ['아담한 이층집', '삼층 타운하우스', '언덕 위 저택'];
const M = (k: MK, fear: Fear, name: string, item: Item = 'none', room?: number, x?: number, act?: Act, max?: number, costume?: number): Mem => ({ k, fear, name, item, room, x, act, max, costume });
/**
 * 판 12개. 판마다 새 가족이 이사 온다. 겁 종류는 판이 갈수록 늘어난다(큰 소리·거미 → 어둠 → 물 → 노래하는 인형).
 * 1판은 첫 톡의 약속을 위해 자리가 정해져 있다: 부엌의 아빠(큰 소리, 우유) 옆 액자 · 위층 욕실 할머니(큰 소리, 틀니) · 거실 강아지 · 침실 엄마(거미).
 */
export const STAGES: StageDef[] = [
  { fam: '왁자지껄네', ch: 0, key: 'frame', news: '액자를 톡! 큰 소리를 무서워하는 사람이 펄쩍', mems: [M('dad', LOUD, '아빠', 'milk', 2, 0.3, 'look'), M('grandma', LOUD, '할머니', 'none', 0, 0.15, 'brush'), M('mom', SPIDER, '엄마', 'none', 1, 0.62, 'window')], dog: 3, boxes: 8, unpack: 330, star2: 'box', star: { k: 'chain', n: 2 }, pal: 0, safe: true },
  { fam: '잠꾸러기네', ch: 0, key: 'lamp', news: '전등을 톡 하면 방이 깜깜 — 어둠을 무서워하는 사람!', mems: [M('dad', DARK, '아빠'), M('mom', LOUD, '엄마', 'plate'), M('girl', DARK, '누나'), M('grandpa', LOUD, '할아버지')], dog: 3, boxes: 9, unpack: 300, star2: 'box', star: { k: 'chain', n: 3 }, pal: 1 },
  { fam: '깔끔쟁이네', ch: 0, key: 'sink', news: '수도꼭지 콸콸 — 젖은 바닥에서 놀라면 미끄러져요', mems: [M('mom', WATER, '엄마'), M('dad', SPIDER, '아빠', 'book'), M('boy', WATER, '형'), M('grandma', LOUD, '할머니')], dog: 3, boxes: 9, unpack: 290, star2: 'box', star: { k: 'slip', n: 2 }, pal: 2 },
  {
    fam: '집들이 파티', ch: 0, key: 'party', news: '손님 열 명! 비명이 이 방 저 방 터져요', big: true, pal: 3,
    mems: [M('dad', LOUD, '아빠', 'milk'), M('mom', DARK, '엄마'), M('guestF', LOUD, '손님', 'plate', undefined, undefined, undefined, 55), M('guestM', SPIDER, '손님', 'none', undefined, undefined, undefined, 55), M('guestF', WATER, '손님', 'none', undefined, undefined, undefined, 55), M('guestM', LOUD, '손님', 'milk', undefined, undefined, undefined, 55), M('guestF', DARK, '손님', 'none', undefined, undefined, undefined, 55), M('guestM', WATER, '손님', 'plate', undefined, undefined, undefined, 55), M('guestF', SPIDER, '손님', 'none', undefined, undefined, undefined, 55), M('guestM', LOUD, '손님', 'none', undefined, undefined, undefined, 55), M('grandpa', LOUD, '손님', 'none', undefined, undefined, undefined, 55), M('girl', DARK, '손님', 'none', undefined, undefined, undefined, 55)],
    dog: 3, boxes: 12, unpack: 420, star2: 'box', star: { k: 'chain', n: 5 },
  },
  { fam: '음악가네', ch: 1, key: 'doll', news: '노래하는 인형·피아노·오르골 — 노래를 무서워하는 사람!', mems: [M('dad', DOLL, '아빠'), M('mom', LOUD, '엄마', 'plate'), M('girl', DOLL, '누나'), M('grandpa', SPIDER, '할아버지'), M('boy', LOUD, '형', 'book')], dog: 5, boxes: 10, unpack: 280, star2: 'box', star: { k: 'pack', n: 2 }, pal: 4 },
  { fam: '개구쟁이네', ch: 1, key: 'kid', news: '겁 없는 꼬마 — 꼬마가 있는 방은 까르르 웃어서 덜 놀라요', mems: [M('kid', LOUD, '꼬마'), M('dad', WATER, '아빠'), M('mom', DARK, '엄마', 'milk'), M('grandma', LOUD, '할머니'), M('boy', DOLL, '형')], dog: 5, boxes: 10, unpack: 270, star2: 'box', star: { k: 'chain', n: 3 }, pal: 5 },
  { fam: '퇴마사네', ch: 1, key: 'exorcist', news: '퇴마사 할머니 — 할머니 방에서 장난치면 소금! 옆방 비명으로 놀래요', mems: [M('exorcist', LOUD, '퇴마사 할머니'), M('dad', SPIDER, '아빠'), M('mom', DOLL, '엄마', 'plate'), M('boy', LOUD, '형'), M('girl', WATER, '누나')], dog: 5, boxes: 10, unpack: 270, star2: 'salt', star: { k: 'chain', n: 4 }, pal: 6 },
  {
    fam: '할로윈 밤', ch: 1, key: 'pumpkin', news: '호박등 — 어둠도 큰 소리도 한꺼번에! 분장한 손님들', big: true, pal: 7,
    mems: [M('dad', DOLL, '아빠', 'none', undefined, undefined, undefined, undefined, 1), M('mom', SPIDER, '엄마', 'none', undefined, undefined, undefined, undefined, 2), M('kid', LOUD, '꼬마', 'none', undefined, undefined, undefined, undefined, 3), M('guestF', DARK, '손님', 'plate', undefined, undefined, undefined, 60, 4), M('guestM', LOUD, '손님', 'none', undefined, undefined, undefined, 60, 1), M('guestF', WATER, '손님', 'none', undefined, undefined, undefined, 60, 2), M('guestM', DARK, '손님', 'milk', undefined, undefined, undefined, 60, 4), M('girl', LOUD, '손님', 'none', undefined, undefined, undefined, 60, 3), M('boy', SPIDER, '손님', 'none', undefined, undefined, undefined, 60, 1)],
    dog: 5, boxes: 12, unpack: 360, star2: 'box', star: { k: 'chain', n: 5 },
  },
  { fam: '멋쟁이네', ch: 2, key: 'mirror', news: '거울에 얼굴 — 그 방 사람이 모두 크게 놀라요', mems: [M('dad', WATER, '아빠'), M('mom', DOLL, '엄마', 'milk'), M('grandpa', DARK, '할아버지'), M('girl', SPIDER, '누나'), M('boy', LOUD, '형', 'book')], dog: 5, boxes: 10, unpack: 260, star2: 'box', star: { k: 'pack', n: 2 }, pal: 8 },
  { fam: '책벌레네', ch: 2, key: 'books', news: '책 날리기 — 책이 벽을 넘어 옆방까지 휙휙!', mems: [M('dad', LOUD, '아빠', 'book'), M('mom', SPIDER, '엄마', 'book'), M('grandma', DARK, '할머니'), M('boy', LOUD, '형', 'book'), M('girl', DOLL, '누나')], dog: 5, boxes: 10, unpack: 250, star2: 'box', star: { k: 'chain', n: 4 }, pal: 9 },
  { fam: '수다쟁이네', ch: 2, key: 'radio', news: '라디오 목소리 — 같은 층 모든 방에 "나가…"', mems: [M('dad', DOLL, '아빠'), M('mom', DOLL, '엄마', 'plate'), M('grandma', LOUD, '할머니'), M('boy', WATER, '형'), M('girl', DARK, '누나'), M('grandpa', SPIDER, '할아버지')], dog: 5, boxes: 11, unpack: 250, star2: 'box', star: { k: 'pack', n: 3 }, pal: 10 },
  {
    fam: '유튜버 가족', ch: 2, key: 'youtuber', news: '유튜버 — 그 방에서 장난치면 찍혀요! 유튜버는 어둠만 무서워해요', big: true, pal: 11,
    mems: [M('youtuber', DARK, '유튜버'), M('mom', LOUD, '엄마', 'milk'), M('girl', DOLL, '누나'), M('boy', SPIDER, '형', 'book'), M('grandpa', WATER, '할아버지'), M('grandma', LOUD, '할머니'), M('kid', DARK, '꼬마')],
    dog: 5, boxes: 12, unpack: 300, star2: 'cam', star: { k: 'chain', n: 5 },
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
  teeth: boolean; wig: boolean; walkT: number; speed: number; laughT: number; filmT: number; saltT: number;
}
interface Chain { id: number; t: number; big: number; small: number; packs: number; x: number; y: number; lastT: number; star: boolean }
type EK = 'prank' | 'scream' | 'crash' | 'bark' | 'leak' | 'yell' | 'clock' | 'hiss';
interface Pend { t: number; room: number; fear: Fear; fear2: number; all: boolean; depth: number; chain: number; kind: EK; x: number; y: number; src: number }
interface Ev { t: number; k: string; x: number; y: number; n: number; x2: number; y2: number; text: string }
/** 비명 줄(그림): 소리가 벽을 넘어 옆방으로 */
interface Wave { t: number; x0: number; y0: number; x1: number; y1: number; depth: number }

export interface HauntState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result' | 'pick' | 'end' | 'settle'; pt: number;
  hearts: number; pts: number; sp: number; stars: number; got: number; starOk: boolean[]; dead: boolean; won: boolean;
  lv: number; perk: number[]; picked: number; rdex: RX[]; newRx: RX[]; fams: number[];
  rooms: Room[]; objs: Obj[]; boxes: Box[]; people: Person[]; nid: number; seats: number;
  /** 유령: 자리 · 날아가는 중 · 다음 톡을 받는 틱 · 기억해 둔 톡 · 물건이 쉬길 기다림 · 소금 맞아 어질 · 바라보는 쪽 */
  gx: number; gy: number; fly: { x0: number; y0: number; obj: number; t: number; T: number } | null; gReady: number; queue: number; gWait: number; gStun: number; gFace: number; gLast: number;
  pend: Pend[]; chains: Chain[]; cid: number; waves: Wave[]; events: Ev[];
  started: boolean; boxLeft: number; best: number; bestPack: number; slips: number; salted: number; filmed: number; clearT: number;
  clockT: number; freeze: number; down: boolean; wowN: number; firstTap: number; firstBig: number; taps: number;
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
export const personH = (r: RoomDef) => Math.min(0.15, (r.y1 - r.y0) * 0.52);
const human = (p: Person) => p.k !== 'dog' && p.k !== 'cat';
const fearless = (p: Person) => p.k === 'kid';
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
    climb: null, outT: 0, seat: -1, teeth: false, wig: false, walkT: 0, speed: 0.0032, laughT: -999, filmT: -999, saltT: -999,
  };
  s.people.push(p);
  return p;
}
function newStage(s: HauntState) {
  const d = STAGES[s.stage], L = layoutOf(s);
  buildRooms(s);
  s.objs = [];
  for (const [k, room, x, place] of L.objs) if (OD[k].from <= s.stage) addObj(s, k, room, x, place);
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
    // 첫 톡의 약속: 아빠는 액자 옆에서 우유를 들고 서 있다
    const dad = s.people[0];
    dad.face = -1;
    dad.stLen = 9999;
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
  // 반쯤은 지금 방이나 바로 옆방, 나머지는 아무 데나
  const near = cand.filter((i) => sp[i][0] === prefer || s.rooms[p.room].walk.includes(sp[i][0]));
  const pool = near.length && s.rng() < 0.6 ? near : cand;
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
  if (human(p) && awake(p) && s.t > SAFE_T && s.t - p.lastScare > DECAY_WAIT && s.perk[1] !== 2 && p.fv > 0) p.fv = Math.max(0, p.fv - DECAY);
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
      } else if (p.stT >= p.stLen) setState(p, 'idle', 10 + Math.floor(s.rng() * 30));
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
  const c: Chain = { id: ++s.cid, t: s.t, big: 0, small: 0, packs: 0, x, y, lastT: s.t, star: false };
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
  if (p.k === 'grandma' && !p.teeth) return 'teeth';
  if (p.k === 'grandpa' && !p.wig) return 'wig';
  if (p.item !== 'none') return 'spill';
  if (r.wet > 0) return 'slip';
  if (r.dark > 0 || (e.kind === 'prank' && e.fear === DARK)) return 'bump';
  if (p.fv >= p.max * 0.78 && p.fv < p.max) return 'faint';
  return 'jump';
}
function addRx(s: HauntState, rx: RX) {
  if (!s.rdex.includes(rx)) (s.rdex.push(rx), s.newRx.push(rx), see(s, 'rx' + rx), ev(s, 'newrx', 0.5, 0.6, REACTS.indexOf(rx)));
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
  if (rx === 'teeth') p.teeth = true;
  if (rx === 'wig') p.wig = true;
  if (rx === 'slip') s.slips++;
  ev(s, 'big', p.x, p.y - personH(s.rooms[p.room]), c.big, e.depth, p.id, rx);
  scream(s, p, e.depth, c.id);
  // 손에 든 것을 쏟으면 와장창 (큰 소리 한 번 더)
  if (p.item !== 'none') {
    ev(s, 'spill', p.x + p.face * 0.03, p.y - 0.06, p.id, 0, 0, p.item);
    push(s, { t: s.t + CRASH_D, room: p.room, fear: LOUD, depth: e.depth + 1, chain: c.id, kind: 'crash', x: p.x + p.face * 0.05, y: p.y - 0.02, src: p.id });
    p.item = 'none';
  }
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
  p.lastScare = s.t;
  p.startT = s.t;
  p.hs.push(c.id);
  if (p.hs.length > 6) p.hs.shift();
  c.small++;
  s.sp += 1;
}
function starCheck(s: HauntState, c: Chain) {
  const st = STAGES[s.stage].star;
  if (s.starOk[2]) return;
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
    const match = e.all || p.fear === e.fear || p.fear === e.fear2;
    if (match && e.kind !== 'leak') {
      bigScare(s, p, e, c, damp);
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
  s.starOk[1] = d.star2 === 'box' ? s.boxLeft >= Math.ceil(d.boxes / 2) : d.star2 === 'salt' ? s.salted === 0 : s.filmed === 0;
  s.got = s.starOk.filter(Boolean).length;
  s.stars += s.got;
  s.sp = Math.round((s.sp + CLEAR_PTS) * STAR_MUL[s.got] * (1 + s.stage * 0.2));
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
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, hearts: 3, pts: 0, sp: 0, stars: 0, got: 0, starOk: [false, false, false], dead: false, won: false,
      lv: 1, perk: [0, 0], picked: -1, rdex: [], newRx: [], fams: [], rooms: [], objs: [], boxes: [], people: [], nid: 0, seats: 0,
      gx: 0.5, gy: 0.3, fly: null, gReady: 0, queue: -1, gWait: -1, gStun: 0, gFace: 1, gLast: -1,
      pend: [], chains: [], cid: 0, waves: [], events: [], started: false, boxLeft: 0, best: 0, bestPack: 0, slips: 0, salted: 0, filmed: 0, clearT: 0,
      clockT: 0, freeze: 0, down: false, wowN: 0, firstTap: -1, firstBig: -1, taps: 0, seen: new Set<string>(), banner: null, spot: null, big: null,
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
interface Sim { id: number; k: Person['k']; room: number; fear: Fear; fv: number; max: number; item: Item; on: boolean; big: boolean; small: boolean; unpack: boolean; teeth: boolean }
export function judge(s: HauntState, o: Obj): { v: number; big: number; packs: number; salt: boolean } {
  const d = OD[o.k], r = s.rooms[o.room], mul = lvMul(s);
  const ps: Sim[] = s.people.filter((p) => inHouse(p) && p.st !== 'flee').map((p) => ({ id: p.id, k: p.k, room: p.room, fear: p.fear, fv: p.fv, max: p.max, item: p.item, on: awake(p) && p.st !== 'react' && p.fv < p.max, big: false, small: false, unpack: p.act === 'unpack' && p.st === 'act', teeth: false }));
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
      const match = e.all || p.fear === e.fear || p.fear === e.fear2;
      if (match && e.kind !== 'leak') {
        const amt = (e.kind === 'prank' ? BIG : BIG_SCREAM) * (1 + DEPTH_UP * Math.min(6, e.depth - 1)) * mul * damp, gain = Math.min(p.max - p.fv, amt);
        p.fv += gain;
        p.big = true;
        big++;
        v += gain + 4 + (p.unpack ? 10 : 0) + 3 * big;
        const rr = s.rooms[p.room];
        q.push({ room: p.room, fear: LOUD, fear2: -1, all: false, depth: e.depth + 1, kind: 'scream', src: p.id });
        for (const n of rr.nb) q.push({ room: n, fear: LOUD, fear2: -1, all: false, depth: e.depth + 1, kind: 'scream', src: p.id });
        if (s.perk[0] === 2) for (const n of rr.nb2) q.push({ room: n, fear: LOUD, fear2: -1, all: false, depth: e.depth + 2, kind: 'scream', src: p.id });
        if (p.item !== 'none') (p.item = 'none'), q.push({ room: p.room, fear: LOUD, fear2: -1, all: false, depth: e.depth + 1, kind: 'crash', src: p.id });
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
      // 별 셋째(한 번에 N명)를 아직 못 땄으면 그만큼 번지는 수에 덤
      if (!s.starOk[2] && ((st.k === 'chain' && j.big >= st.n) || (st.k === 'pack' && j.packs >= st.n))) v += 60;
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

// ───────────────────────────── 그리기 (임시) ─────────────────────────────
function drawAll(ctx: CanvasRenderingContext2D, s: HauntState, w: number, h: number, _th: Theme) {
  const fx = juice(s);
  void fx;
  ctx.fillStyle = '#223';
  ctx.fillRect(0, 0, w, h);
  void s;
}
