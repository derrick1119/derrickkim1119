/**
 * 🕳️ 함정문 탑 (41라운드: 생각 부담 없는 실시간 전투 · 새 뼈대) — 함정문 × 연쇄 × 깊어지는 판.
 * 규칙 한 줄: 톡 한 바닥 칸이 쩍 열려 그 위 무리가 아래층으로 와르르 떨어지고, 떨어진 놈들이 아래층 놈들을 깔아뭉갠다.
 * 뒤집힘: 나는 꼬마 도둑 너구리 — 몬스터 탑을 꼭대기부터 아래로 내려가며 무너뜨린다. 위층에서 많이 떨어뜨릴수록 아래층이 미리 비어
 *   쉬워진다(쌓아 떨어뜨리기). 떨어진 무게가 크면 아래층 바닥도 쩍 금이 가 깔린 놈들까지 한 층 더 와르르 — 연쇄 낙하가 큰 순간.
 * 조작은 톡 하나: 화면 어디를 톡 해도 그 세로줄의 '지금 층' 바닥 두 칸(Lv7부터 세 칸)이 함정문으로 쩍(그 줄에 아무도 없으면 가장 가까운 무리 쪽 칸).
 *   함정문은 0.7초 뒤 닫히고, 톡 사이엔 0.4초 쉼 — 연타는 소용없다. 정답 있는 판·수 제한·되돌리기·힌트 없음: 어디를 열어도 누군가 떨어진다.
 * 0.5초짜리 판단: 지금 층 어디가 붐비나(무게) × 그 아래층 어디가 붐비나(깔릴 수) — 두 무리가 세로로 겹치는 줄을 열면 바닥이 깨져 두 층 연쇄.
 *   덩치 곰은 혼자서도 바닥을 깬다. 위험은 빨갛게: 너구리 곁(왼쪽 사다리)에 온 놈이 '!' 하고 2초 뒤 퍽 — 그 줄을 열어 떨어뜨리면 휴.
 * 구경거리: 층마다 몬스터가 저절로 요리·낮잠·베개 싸움. 떨어지는 놈은 '으아아', 깔린 놈은 납작, 기절한 놈은 별을 돌리다 동전으로 펑.
 * 판 12개(장 3 × 4판, 장 끝은 대장): 1 꼬마 도깨비 → 2 덩치 곰(혼자서도 바닥을 깸) → 3 풍선 박쥐(떨어지는 무리가 지나가면 붙잡혀 펑, 넓게 깔림)
 *   → 4 대장 두더지 주방장 → 5 트램펄린(떨어진 놈이 옆으로 통 튕겨 한 번 더) → 6 물탱크(풍덩 물결이 탱크 전체를 쓸어감)
 *   → 7 컨베이어(놈들이 한쪽 벽으로 실려 가 쌓임) → 8 대장 대왕 문어 → 9 폭죽 통(떨어지면 쾅, 바닥이 반드시 깨짐)
 *   → 10 얼음 바닥(미끄러지며 볼링) → 11 도미노 책장(쓰러지며 옆 책장까지) → 12 대장 대왕 부엉이.
 * 대장(장마다 맨 아래 보물방): 위에서 떨어진 무게만큼 대장 머리 위 '쿵 게이지'가 차고(머리에 떨어지면 세 배), 꽉 차면 '천장째 와르르!'.
 * 성장(저절로): 판을 깨면 너구리 Lv+1 — 쿵 힘(떨어지는 무게 +5%/Lv) · 모습(고글 → 보자기 망토 → 3칸 함정문 → 왕관 → 금빛 보따리).
 *   장 끝에 보물방의 큰 물건 둘 중 하나를 톡(모래주머니 / 미끄럼틀 · 폭죽 상자 / 쌍둥이 문). 모으는 것 = 탑마다 보물 하나(12) · 도감(떨어뜨려 본 몬스터 8).
 * 별(쉬운 말 셋): 보물방 닿기 · 하트 안 잃기 · 한 번에 N마리 깔기(함정문으로 떨어진 놈 말고 깔린 놈만). 점수: 한 번에 n번째로 쓰러진 놈은 2n점, 판 점수는 별 수로 곱해진다(×1·×2·×4).
 * 큰 띠는 그 판 최고 기록을 넘을 때·별 셋째·대장 순간에만 — 나머지는 떨어진 자리의 작은 숫자와 소리.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5, TAU = Math.PI * 2;
/** 탑 단면(가로 폭 = 1): 왼쪽 사다리 칸 · 바닥 칸 시작·끝 · 칸 수 · 칸 폭 · 층 높이 · 바닥 두께 · 바닥 깊이(3/4 시점, 뒤쪽 가장자리까지) */
const WL = 0.1, WR = 0.97, NT = 8, TW = (WR - WL) / NT, FH = 0.44, TH = 0.05, DEP = 0.075;
/** 지금 층 바닥이 오는 화면 높이 · 놀이 화면 위·아래 (한 화면에 지금 층 + 아래 1.5층) */
const VIEW_Y = 0.47, TOP_Y = 0.085, BOT_Y = 1.36;
/** 너구리 자리(사다리 옆 선반) · 망보기가 튀어나오는 자리 */
const PERCH_X = 0.07, SPOT_R = 0.13, PERCH_H = 0.16, LOOK_X = 0.235;
/** 떨어지기 · 쉼 · 함정문 열림 · 금 간 바닥 · 기절 · 납작 · 내려가기 · 트램펄린 · 박쥐 끌려옴 · 책장 쓰러짐 */
const GRAV = 0.0021, TAP_REST = 36, DOOR_T = 42, CRACK_T = 44, STUN_T = 26, FLAT_T = 20, DESC_T = 46, ARC_T = 34, SNAG_T = 8, SHELF_T = 14;
/** 결과 화면: 톡 받기 시작 · 저절로 넘어감 / 둘 중 하나: 톡 받기 시작 · 저절로 고름 · 고른 뒤 */
const RES_MIN = 90, RES_AUTO = 420, PICK_MIN = 40, PICK_AUTO = 900, PICK_AFTER = 64, END_T = 210;
/** 큰 띠를 띄우는 최소 마릿수 · 판 깸 점수 · 별 배수 · 다 깼을 때 · 대장 */
/** 바닥이 한 층 더 깨질 때마다 깔려야 하는 무게 배수 · 큰 띠가 떠 있는 틱(0.8초) */
const CRACK_MUL = 1.7, BIG_T = 48;
const WOW_N = 5, CLEAR_PTS = 20, STAR_MUL = [1, 1, 2, 4], WIN_PTS = 100, BOSS_PTS = 120;
/** 한 번에 n번째로 쓰러진 놈의 점수 */
const PTS = (n: number) => Math.ceil((n * n) / 4);
/** 문으로 들어오는 간격(우르르) · 화면에 보이는 몬스터 상한(넘치면 문 앞에서 기다림) · 이만큼 남으면 겁먹고 스스로 사다리 구멍으로 */
const GATE_RUSH = 8, VIS_CAP = 22, PANIC_N = 3, BAT_H = 0.25;
/** 아래층에 하나둘 들어오는 간격 · 그 층 무리가 이만큼 되면 멈춤 · 층마다 들어올 몫 */
const LOW_EVERY = 55, LOW_CAP = 7, LOW_RES = 7, ROPE_V = 0.014;
/** 곁에 쿵: 이만큼 안의 무리가 놀라 흩어진다 · 흩어져 있는 틱 */
const SPOOK_R = 0.3, SPOOK_T = 100;
/** 끌리는 것: 종이 다시 울리기까지(틱) · 공 빠르기 · 빛 빠르기 · 무리가 퍼지는 폭 · 따라가는 놈 비율 */
const RING_T = 200, BALL_V = 0.0024, WISP_V = 0.0048, CROWD = 0.085, FOLLOW = 0.82;

type K = 'imp' | 'bear' | 'bat' | 'mole' | 'octo' | 'owl';
interface KDef { name: string; line: string; r: number; w: number; spd: number; boss?: boolean }
export const KD: Record<K, KDef> = {
  imp: { name: '꼬마 도깨비', line: '작고 가벼워요. 무리로 떨어뜨려요', r: 0.034, w: 1, spd: 0.0016 },
  bear: { name: '덩치 곰', line: '무거워서 혼자 떨어져도 바닥이 쩍!', r: 0.056, w: 3, spd: 0.0009 },
  bat: { name: '풍선 박쥐', line: '둥실 떠 있어요. 떨어지는 무리가 지나가면 펑!', r: 0.036, w: 1, spd: 0.0011 },
  mole: { name: '대장 두더지 주방장', line: '머리 위로 떨어뜨려 쿵 게이지를 채워요', r: 0.115, w: 6, spd: 0.0007, boss: true },
  octo: { name: '대왕 문어 창고지기', line: '여덟 다리로 휘청휘청. 머리에 쿵!', r: 0.115, w: 6, spd: 0.0009, boss: true },
  owl: { name: '대왕 부엉이 마법사', line: '마지막 대장. 천장째 와르르!', r: 0.115, w: 6, spd: 0.0008, boss: true },
};
/** 도감(떨어뜨려 본 몬스터): 도깨비는 탑마다 차림이 다르다 */
export const DEX: { key: string; k: K; v: number; name: string }[] = [
  { key: 'imp0', k: 'imp', v: 0, name: '요리사 도깨비' }, { key: 'bear', k: 'bear', v: 0, name: '덩치 곰' }, { key: 'bat', k: 'bat', v: 0, name: '풍선 박쥐' },
  { key: 'mole', k: 'mole', v: 0, name: '두더지 주방장' }, { key: 'imp1', k: 'imp', v: 1, name: '상자 도깨비' }, { key: 'octo', k: 'octo', v: 0, name: '대왕 문어' },
  { key: 'imp2', k: 'imp', v: 2, name: '꼬마 마법사' }, { key: 'owl', k: 'owl', v: 0, name: '대왕 부엉이' },
];
const dexKey = (k: K, v: number) => (k === 'imp' ? 'imp' + v : k);

/** 층의 장치 */
interface Feat {
  /** 트램펄린: [칸, 튕기는 쪽] */
  tramp?: [number, -1 | 1][];
  /** 물탱크: 칸 a..b */
  water?: [number, number];
  /** 컨베이어: 실어 가는 쪽 */
  belt?: -1 | 1;
  /** 폭죽 통이 놓인 칸 */
  keg?: number[];
  /** 얼음 바닥: 미끄러지는 쪽 */
  ice?: -1 | 1;
  /** 책장이 선 칸 */
  shelf?: number[];
}
interface FDef { init: [K, number][]; door: [K, number][]; hot: number[]; room: number; feat?: Feat }
interface SDef {
  key: string; ch: number; name: string; news: string; n: number;
  /** 바닥이 깨지는 데 깔려야 하는 무게(도깨비 1 · 곰 3) */
  thr: number; floors: FDef[]; vault: [K, number][];
  boss?: K; gauge?: number; alert: number; loot: string;
}
export const CHAPTERS = ['부엌 탑', '장난감 창고 탑', '마법사 탑'];
/** 방 그림: 0 다락 식료품방 · 1 부엌 · 2 식당 · 3 빵 굽는 방 · 4 지하 술통방 · 5 상자 창고 · 6 장난감 방 · 7 놀이방 · 8 물탱크실 · 9 공장
 *  · 10 별 관측실 · 11 도서관 · 12 물약방 · 13 얼음방 · 14 폭죽 창고 */
export const ROOMS = ['식료품방', '부엌', '식당', '빵 굽는 방', '술통방', '상자 창고', '장난감 방', '놀이방', '물탱크실', '공장', '별 관측실', '도서관', '물약방', '얼음방', '폭죽 창고'];
const Fl = (room: number, hot: number[], init: [K, number][], door: [K, number][], feat?: Feat): FDef => ({ room, hot, init, door, feat });
const I = (n: number): [K, number] => ['imp', n], B = (n: number): [K, number] => ['bear', n], T = (n: number): [K, number] => ['bat', n];
/**
 * 판 12개. 탑 하나 = 층 4~5개 + 맨 아래 보물방(대장 판은 층 둘·셋 + 대장 방).
 * 층마다 처음 서 있는 무리(init — 위에서 떨어뜨려 미리 줄일 수 있다)와 너구리가 그 층에 오면 문으로 들어오는 무리(door).
 * 무리가 모이는 자리(hot)는 층마다 달라서 '위아래가 겹치는 줄'을 눈으로 찾는다 — 1판만 세 층이 한가운데 줄로 겹쳐 첫 톡이 크게 터진다.
 */
export const STAGES: SDef[] = [
  {
    key: 'imp', ch: 0, name: '꼬마 도깨비', news: '톡 한 칸이 쩍! 위 무리가 아래층을 깔아요', n: 8, thr: 3, alert: 9999, loot: '황금 국자',
    floors: [
      Fl(0, [0.56, 0.84], [I(6)], [I(6)]), Fl(1, [0.56, 0.3], [I(6)], [I(6)]), Fl(2, [0.54, 0.85], [I(6)], [I(6)]), Fl(3, [0.36, 0.72], [I(6)], [I(6)]),
      Fl(4, [0.62, 0.3], [I(5)], [I(6)]),
    ],
    vault: [I(4)],
  },
  {
    key: 'bear', ch: 0, name: '덩치 곰', news: '무거워서 혼자 떨어져도 바닥이 쩍!', n: 12, thr: 4, alert: 130, loot: '은 접시',
    floors: [
      Fl(0, [0.72, 0.4], [I(5), B(1)], [I(6)]), Fl(1, [0.35, 0.8], [I(5), B(1)], [I(5), B(1)]), Fl(2, [0.7, 0.45], [I(6)], [I(6), B(1)]),
      Fl(3, [0.5, 0.86], [I(5), B(1)], [I(6)]), Fl(4, [0.3, 0.66], [I(6)], [I(5), B(1)]),
    ],
    vault: [I(4)],
  },
  {
    key: 'bat', ch: 0, name: '풍선 박쥐', news: '떨어지는 무리가 박쥐를 지나가면 펑! 넓게', n: 15, thr: 4, alert: 125, loot: '꿀단지',
    floors: [
      Fl(1, [0.4, 0.78], [I(5), B(1)], [I(6)]), Fl(2, [0.62, 0.3], [I(5), T(2)], [I(6)]), Fl(3, [0.42, 0.82], [I(5), B(1), T(2)], [I(6)]),
      Fl(0, [0.68, 0.32], [I(5), T(2)], [I(5), B(1)]), Fl(4, [0.5, 0.82], [I(5), T(1)], [I(6)]),
    ],
    vault: [I(4)],
  },
  {
    key: 'mole', ch: 0, name: '대장 두더지 주방장', news: '대장 머리 위로 떨어뜨려 쿵 게이지를 채워요', n: 8, thr: 4, alert: 125, loot: '주방장의 금 냄비',
    floors: [Fl(1, [0.44, 0.8], [I(6), B(1)], [I(6)]), Fl(3, [0.6, 0.3], [I(5), T(2)], [I(6), B(1)])],
    vault: [I(3)], boss: 'mole', gauge: 60,
  },
  {
    key: 'tramp', ch: 1, name: '트램펄린', news: '트램펄린에 떨어지면 옆으로 통! 한 번 더 깔아요', n: 12, thr: 4, alert: 120, loot: '태엽 로봇',
    floors: [
      Fl(5, [0.4, 0.8], [I(5), B(1)], [I(6)]), Fl(7, [0.3, 0.75], [I(5)], [I(6), B(1)], { tramp: [[2, 1]] }), Fl(6, [0.58, 0.85], [I(5), B(1), T(1)], [I(6)], { tramp: [[6, -1]] }),
      Fl(7, [0.32, 0.7], [I(5)], [I(6)], { tramp: [[4, 1]] }), Fl(5, [0.55, 0.85], [I(5), T(1)], [I(6)]), Fl(6, [0.4, 0.75], [I(5), B(1)], [I(6)], { tramp: [[1, 1]] }),
    ],
    vault: [I(4)],
  },
  {
    key: 'water', ch: 1, name: '물탱크', news: '물에 풍덩! 물결이 탱크 전체를 쓸어가요', n: 14, thr: 4, alert: 120, loot: '오리 잠수함',
    floors: [
      Fl(6, [0.45, 0.82], [I(5), B(1)], [I(6)]), Fl(8, [0.55, 0.3], [I(6)], [I(6)], { water: [3, 6] }), Fl(5, [0.72, 0.4], [I(5), B(1), T(1)], [I(6)]),
      Fl(8, [0.35, 0.8], [I(6)], [I(5), B(1)], { water: [1, 4] }), Fl(7, [0.6, 0.85], [I(5)], [I(6)], { tramp: [[2, 1]] }), Fl(8, [0.5, 0.25], [I(5), B(1)], [I(6)], { water: [2, 5] }),
    ],
    vault: [I(4)],
  },
  {
    key: 'belt', ch: 1, name: '컨베이어', news: '컨베이어가 놈들을 한쪽 벽으로 실어 쌓아요', n: 15, thr: 4, alert: 115, loot: '황금 팽이',
    floors: [
      Fl(9, [0.5, 0.8], [I(6), B(1)], [I(6)], { belt: 1 }), Fl(9, [0.4, 0.75], [I(6)], [I(6), B(1)], { belt: -1 }), Fl(8, [0.6, 0.3], [I(5), T(1)], [I(6)], { water: [4, 7] }),
      Fl(9, [0.45, 0.8], [I(5), B(1)], [I(6)], { belt: 1 }), Fl(6, [0.5, 0.82], [I(5), T(1)], [I(6)]), Fl(9, [0.6, 0.35], [I(5), B(1)], [I(6)], { belt: -1 }),
    ],
    vault: [I(4)],
  },
  {
    key: 'octo', ch: 1, name: '대장 대왕 문어', news: '여덟 다리 문어 — 머리에 떨어뜨려 쿵!', n: 9, thr: 4, alert: 115, loot: '문어의 진주 왕관',
    floors: [Fl(7, [0.4, 0.8], [I(6), B(1)], [I(6)], { tramp: [[5, -1]] }), Fl(8, [0.55, 0.3], [I(5), T(1)], [I(6)], { water: [2, 4] }), Fl(9, [0.55, 0.3], [I(5), T(1)], [I(6), B(1)], { belt: 1 })],
    vault: [I(3)], boss: 'octo', gauge: 75,
  },
  {
    key: 'keg', ch: 2, name: '폭죽 통', news: '폭죽 통 위에 떨어지면 쾅! 바닥이 꼭 깨져요', n: 30, thr: 4.5, alert: 110, loot: '별똥별 지팡이',
    floors: [
      Fl(10, [0.45, 0.82], [I(6), B(1)], [I(6)]), Fl(14, [0.3, 0.72], [I(6)], [I(6), B(1)], { keg: [2, 6] }), Fl(12, [0.6, 0.85], [I(5), T(1)], [I(6)], { keg: [4] }),
      Fl(14, [0.4, 0.8], [I(5), B(1)], [I(6)], { keg: [1, 5] }), Fl(11, [0.55, 0.85], [I(5), T(1)], [I(6)]), Fl(14, [0.35, 0.7], [I(5), B(1)], [I(6)], { keg: [3, 6] }),
    ],
    vault: [I(4)],
  },
  {
    key: 'ice', ch: 2, name: '얼음 바닥', news: '얼음에 떨어지면 주르륵 미끄러지며 볼링!', n: 16, thr: 4.5, alert: 110, loot: '얼음 수정구',
    floors: [
      Fl(12, [0.5, 0.82], [I(6), B(1)], [I(6)]), Fl(13, [0.6, 0.3], [I(6)], [I(6), B(1)], { ice: 1 }), Fl(14, [0.45, 0.8], [I(5), T(1)], [I(6)], { keg: [5] }),
      Fl(13, [0.4, 0.78], [I(6)], [I(5), B(1)], { ice: -1 }), Fl(10, [0.55, 0.85], [I(5), T(1)], [I(6)]), Fl(13, [0.6, 0.3], [I(5), B(1)], [I(6)], { ice: 1 }),
    ],
    vault: [I(4)],
  },
  {
    key: 'shelf', ch: 2, name: '도미노 책장', news: '책장에 떨어지면 쿵 쓰러지며 옆 책장까지!', n: 19, thr: 4.5, alert: 105, loot: '마법 주문서',
    floors: [
      Fl(10, [0.45, 0.8], [I(6), B(1)], [I(6)]), Fl(11, [0.35, 0.75], [I(6)], [I(6), B(1)], { shelf: [1, 3, 5] }), Fl(13, [0.6, 0.3], [I(5), T(1)], [I(6)], { ice: 1 }),
      Fl(11, [0.5, 0.82], [I(5), B(1)], [I(6)], { shelf: [2, 4, 6] }), Fl(12, [0.4, 0.8], [I(5), T(1)], [I(6)], { keg: [3] }), Fl(11, [0.6, 0.3], [I(5), B(1)], [I(6)], { shelf: [0, 2, 4] }),
    ],
    vault: [I(4)],
  },
  {
    key: 'owl', ch: 2, name: '대장 대왕 부엉이', news: '마지막 대장 — 천장째 와르르!', n: 4, thr: 4.5, alert: 105, loot: '부엉이의 별 왕관',
    floors: [Fl(11, [0.4, 0.78], [I(6), B(1)], [I(6)], { shelf: [2, 5] }), Fl(14, [0.6, 0.3], [I(5), T(1)], [I(6), B(1)], { keg: [4] }), Fl(13, [0.45, 0.8], [I(5), B(1)], [I(6)], { ice: -1 })],
    vault: [I(3)], boss: 'owl', gauge: 90,
  },
];
export const STAGE_COUNT = STAGES.length;
/** 장 끝 둘 중 하나(보물방의 큰 물건) */
export const PERKS: { name: string; line: string; long: string }[][] = [
  [{ name: '모래주머니', line: '바닥이 잘 깨져요', long: '떨어지는 놈이 더 무거워 바닥이 잘 깨져요' }, { name: '미끄럼틀', line: '데굴데굴 더 깔아요', long: '떨어진 놈이 옆으로 데굴데굴 더 깔아요' }],
  [{ name: '폭죽 상자', line: '펑! 넓게 깔아요', long: '떨어진 자리에서 펑! 더 넓게 깔아요' }, { name: '쌍둥이 문', line: '아래층도 함께 쩍', long: '아래층 같은 자리도 함께 쩍 열려요' }],
];
/** 너구리 레벨이 오르면 달라지는 모습 */
export const LV_GIFT: Record<number, string> = { 3: '고글을 썼어요', 5: '보자기 망토가 생겼어요', 7: '함정문이 세 칸으로!', 9: '왕관을 썼어요', 11: '금빛 보따리를 멨어요' };

// ───────────────────────────── 상태 ─────────────────────────────
/** 몬스터 상태: 문으로 들어옴 · 걷기 · 멈춰서 놀기 · 떨어짐 · 기절 · 납작 · 트램펄린 · 미끄러짐 · 둥실(박쥐) · 너구리에게 덤빔 · 튕겨 남 · 도망 · 박쥐 끌려옴 · 밧줄 타고 내려옴 */
const ENTER = 0, WALK = 1, IDLE = 2, FALL = 3, STUN = 4, FLAT = 5, ARC = 6, SKID = 7, FLOAT = 8, LEAP = 9, HIT = 10, FLEE = 11, SNAG = 12, ROPE = 13;
interface Mon {
  id: number; k: K; v: number; f: number; x: number; z: number; y: number; vx: number; vy: number; r: number; w: number;
  st: number; tm: number; dir: number; tx: number; nap: boolean; act: number;
  /** 어느 톡의 연쇄에 휘말렸나 · 이미 쓰러졌나 · 너구리를 본 지 몇 틱 · 다시 보기까지 */
  drop: number; ko: boolean; alert: number; acool: number;
  /** 트램펄린 · 미끄러짐: 출발 x · 도착 x · 걸리는 틱 */
  ax: number; bx: number; aT: number;
  /** 이번 연쇄에서 몇 번 내려앉았나 (덩치 곰은 처음 내려앉은 바닥만 반드시 깬다) */
  falls: number;
  /** 무리 안의 제자리(끌리는 것에서 떨어진 만큼) · 끌리는 것을 따라가나 */
  ox: number; fol: boolean;
  /** 곁에 쿵 떨어져 놀라 흩어진 틱 (그동안 끌리는 것을 안 따라간다) */
  spook: number;
  /** 함정문으로 떨어졌다면 그 톡 번호 (깔린 수를 셀 때 뺀다) */
  door: number;
  dead: boolean; seed: number; born: number; land: number; hurtT: number; face: number;
}
interface Tile { open: number; crack: number; drop: number; patch: number; at: number }
interface Keg { x: number; live: boolean }
interface Shelf { x: number; st: number; dir: number; t: number; drop: number }
/** 층마다 무리가 끌려가는 것: 0 땡! 종이 울리는 화덕(부엌 탑) · 1 굴러가는 공(장난감 탑) · 2 떠다니는 빛(마법사 탑) */
interface Lure { kind: number; x: number; vx: number; tx: number; next: number; ring: number; spots: number[] }
interface Floor { tiles: Tile[]; feat: Feat; queue: K[]; qT: number; res: number; rT: number; kegs: Keg[]; shelves: Shelf[]; room: number; hot: number[]; tramp: number[]; gone: boolean; lure: Lure }
/** 톡 한 번의 연쇄: 쓰러뜨린 수 · 깨뜨린 바닥 수 · 처음 열린 자리 · 가장 깊이 간 층 · 점수 · 그중 깔린 수(함정문으로 떨어진 놈 말고) */
interface Drop { id: number; n: number; t: number; cracks: number; x: number; f0: number; deep: number; pts: number; vic: number }
/** 같은 연쇄가 같은 층에 내려앉은 무리(바닥이 깨질지 셈) */
interface Land { id: number; f: number; t: number; w: number; vw: number; x0: number; x1: number; done: boolean; noCrack: boolean; force: boolean; splash: boolean; n0: number }
interface Ev { t: number; k: string; x: number; y: number; n: number; x2: number; y2: number; text: string }

export interface TrapState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result' | 'pick' | 'end'; pt: number;
  hearts: number; pts: number; sp: number; stars: number; got: number; starOk: boolean[]; dead: boolean; won: boolean;
  /** 너구리 레벨 · 장 끝에 고른 것(0 아직 · 1 왼쪽 · 2 오른쪽) · 방금 고른 것 · 도감 · 이번 판에 새로 떨어뜨린 몬스터 · 모은 보물(판 번호) */
  lv: number; perk: number[]; picked: number; dex: string[]; newDex: string[]; loot: number[];
  floors: Floor[]; nf: number; c: number; cam: number; desc: number; descTo: number; vaultT: number; tumble: number;
  mons: Mon[]; nid: number; drops: Drop[]; lands: Land[]; did: number;
  rest: number; down: boolean; firstTap: number; firstBig: number; wowN: number; hurt: number; lost: number; best: number; bestVic: number; bestWar: number; warN: number; star3: boolean;
  /** 이 층의 망보기가 너구리를 알아채는 틱 */
  watchT: number;
  stT: number; safeT: number; taps: number; kills: number; gain: number; clearT: number; twin: { f: number; i0: number; wd: number; t: number; id: number }[];
  gauge: number; gaugeMax: number; bonkT: number; bossDown: boolean; collapseT: number; summonT: number;
  events: Ev[]; seen: Set<string>;
  banner: { head: string; sub: string; t: number } | null; spot: { id: number; t: number; label: string } | null;
  /** 큰 띠(한 번에 하나): 이 판 최고 기록을 넘을 때 · 별 셋째 · 대장 순간 */
  big: { text: string; t: number; n: number; drop: number; star: boolean } | null;
  freeze: number; lastDrop: number;
}

/** 층 바닥(앞 가장자리)의 세계 높이 · 깊이 z(0 뒤 ~ 1 앞)에 선 발 높이 */
const FY = (k: number) => k * FH;
const feetY = (k: number, z: number) => FY(k) - DEP * (1 - z);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const tileOf = (x: number) => clamp(Math.floor((x - WL) / TW), 0, NT - 1);
const tileX = (i: number) => WL + (i + 0.5) * TW;
const ev = (s: TrapState, k: string, x: number, y: number, n = 0, x2 = 0, y2 = 0, text = '') => s.events.push({ t: s.t, k, x, y, n, x2, y2, text });
const see = (s: TrapState, key: string) => void s.seen.add(key);
const isVault = (s: TrapState, f: number) => f >= s.nf - 1;
const bossOf = (s: TrapState) => s.mons.find((m) => KD[m.k].boss && !m.dead && !m.ko);
/** 함정문 칸 수 (Lv7부터 세 칸) · 떨어지는 무게 배수 */
export const doorW = (s: TrapState) => (s.lv >= 7 ? 3 : 2);
const power = (s: TrapState) => (1 + 0.05 * (s.lv - 1)) * (s.perk[0] === 1 ? 1.35 : 1);
/** 바닥에 서 있어 떨어질 수 있는 상태 */
const grounded = (m: Mon) => m.st === WALK || m.st === IDLE || m.st === ENTER || m.st === STUN || m.st === FLAT || m.st === HIT || m.st === FLEE;
/** 지금 층에 남아 있어 비워야 하는 놈 */
const counts = (m: Mon) => !m.dead && m.st !== FLOAT && m.st !== SNAG && m.st !== FLEE && !KD[m.k].boss;
const open = (t: Tile) => t.open > 0 || t.crack > 0;

// ───────────────────────────── 떼 ─────────────────────────────
function add(s: TrapState, k: K, f: number, x: number, z: number, st: number): Mon {
  const kd = KD[k], r = kd.r * (k === 'imp' ? 0.94 + s.rng() * 0.12 : 1);
  const m: Mon = {
    id: ++s.nid, k, v: STAGES[s.stage].ch, f, x: clamp(x, WL + r * 0.8, WR - r * 0.8), z, y: feetY(f, z), vx: 0, vy: 0, r, w: kd.w,
    st, tm: 0, dir: s.rng() < 0.5 ? -1 : 1, tx: x, nap: false, act: Math.floor(s.rng() * 3),
    drop: 0, ko: false, alert: -1, acool: 0, ax: 0, bx: 0, aT: 0, falls: 0, door: 0, spook: 0, ox: (s.rng() - 0.5) * 2 * CROWD, fol: !kd.boss && s.rng() < FOLLOW, dead: false, seed: s.rng(), born: s.t, land: -99, hurtT: -99, face: s.rng() < 0.5 ? -1 : 1,
  };
  if (k === 'bat') (m.st = FLOAT), (m.y = FY(f) - BAT_H - s.rng() * 0.035), (m.z = 0.5), (m.fol = false);
  s.mons.push(m);
  return m;
}
function expand(list: [K, number][]): K[] {
  const out: K[] = [];
  for (const [k, n] of list) for (let i = 0; i < n; i++) out.push(k);
  return out;
}
/** 층에 무리를 놓는다: 열에 여덟은 그 층의 '끌리는 것'(종 울린 화덕 · 공 · 빛) 둘레에 모여 따라다니고, 나머지는 어슬렁 */
function placeFloor(s: TrapState, f: number, list: [K, number][]) {
  const F = s.floors[f];
  for (const k of expand(list)) {
    if (k === 'bat') {
      add(s, k, f, 0.25 + s.rng() * 0.62, 0.5, FLOAT);
      continue;
    }
    const m = add(s, k, f, 0.5, 0.14 + s.rng() * 0.8, IDLE);
    m.x = clamp(m.fol && (f > 0 || s.stage === 0) ? F.lure.x + m.ox : WL + 0.06 + s.rng() * (WR - WL - 0.12), WL + m.r, WR - m.r);
    if (f === 0 && m.x < WL + SPOT_R + 0.04) m.x += 0.16;
    m.tx = m.x;
    m.tm = Math.floor(20 + s.rng() * 120);
  }
}
/** 너구리가 내려오면 그 층 무리가 '앗!' 하고 흩어진다 */
function scatter(s: TrapState, f: number) {
  for (const m of s.mons) if (m.f === f && !m.dead && (m.st === WALK || m.st === IDLE) && !KD[m.k].boss) (m.st = WALK), (m.tx = clamp(m.x + (s.rng() - 0.5) * 0.6, WL + 0.06, WR - 0.06)), (m.tm = 0);
  ev(s, 'scatter', 0.5, FY(f) - 0.1, f);
}
/** 새로 오는 놈: 천장 구멍에서 밧줄 타고 그 층 무리 한가운데로 쪼르르 (내려오는 동안은 못 떨어뜨린다) */
function ropeIn(s: TrapState, k: K, f: number): Mon {
  const F = s.floors[f], m = add(s, k, f, 0.5, 0.25 + s.rng() * 0.6, ROPE);
  m.fol = true;
  m.x = clamp(f === s.c ? WL + 0.08 + s.rng() * (WR - WL - 0.14) : F.lure.x + m.ox, WL + m.r, WR - m.r);
  m.tx = m.x;
  m.y = FY(f) - FH + TH + 0.03;
  m.tm = 0;
  ev(s, 'rope', m.x, m.y, f);
  return m;
}
/** 끌리는 것: 부엌 탑은 화덕 셋 중 하나에서 땡! · 장난감 탑은 굴러가는 공 · 마법사 탑은 떠다니는 빛 (판마다 층마다 다르게 흩는다) */
function newLure(s: TrapState, k: number, ch: number): Lure {
  const first = s.stage === 0 && k < 3, base = [0.24, 0.53, 0.82].map((x) => x + (s.rng() - 0.5) * 0.06);
  for (let i = 2; i > 0; i--) {
    const j = Math.floor(s.rng() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  if (first) base[0] = 0.56;
  const x = base[0];
  return {
    kind: ch, x, tx: x, vx: (s.rng() < 0.5 ? -1 : 1) * BALL_V * (0.75 + s.rng() * 0.5), spots: base, ring: -99,
    // 층마다 엇갈려 울린다 (1판 위 세 층은 처음 6초 동안 한 줄로 겹쳐 첫 톡이 크게 터진다)
    next: first ? 360 + k * 45 : 90 + k * 47 + Math.floor(s.rng() * 90),
  };
}
function lureStep(s: TrapState) {
  for (let f = 0; f < s.nf - 1; f++) {
    const F = s.floors[f], L = F.lure, seen = f >= s.c && f <= s.c + 2;
    if (F.gone) continue;
    if (L.kind === 0) {
      if (s.t >= L.next) {
        const others = L.spots.filter((x) => Math.abs(x - L.x) > 0.05);
        L.x = others[Math.floor(s.rng() * others.length)];
        L.ring = s.t;
        L.next = s.t + RING_T + Math.floor(s.rng() * 60);
        if (seen) ev(s, 'ring', L.x, FY(f), f);
      }
    } else if (L.kind === 1) {
      L.x += L.vx;
      if (L.x < WL + 0.07 || L.x > WR - 0.07) (L.vx = -L.vx), (L.x = clamp(L.x, WL + 0.07, WR - 0.07)), seen && ev(s, 'kick', L.x, FY(f), 0);
      if (s.t >= L.next) {
        L.vx = (s.rng() < 0.5 ? -1 : 1) * BALL_V * (0.75 + s.rng() * 0.6);
        L.next = s.t + 220 + Math.floor(s.rng() * 120);
        L.ring = s.t;
        if (seen) ev(s, 'kick', L.x, FY(f), 1);
      }
    } else {
      if (s.t >= L.next) {
        let tx = WL + 0.1 + s.rng() * (WR - WL - 0.2);
        if (Math.abs(tx - L.x) < 0.25) tx = L.x < 0.53 ? tx + 0.3 : tx - 0.3;
        L.tx = clamp(tx, WL + 0.08, WR - 0.08);
        L.next = s.t + 150 + Math.floor(s.rng() * 90);
        L.ring = s.t;
        if (seen) ev(s, 'wisp', L.tx, FY(f), f);
      }
      L.x += clamp(L.tx - L.x, -WISP_V, WISP_V);
    }
  }
}
function newStage(s: TrapState) {
  const d = STAGES[s.stage];
  s.phase = 'play';
  s.pt = 0;
  s.mons = [];
  s.drops = [];
  s.lands = [];
  s.twin = [];
  s.nf = d.floors.length + 1;
  s.floors = [];
  for (let k = 0; k < s.nf; k++) {
    const fd: FDef | undefined = d.floors[k], feat = fd?.feat ?? {}, tramp = new Array(NT).fill(0);
    for (const [i, dir] of feat.tramp ?? []) tramp[i] = dir;
    s.floors.push({
      tiles: Array.from({ length: NT }, () => ({ open: 0, crack: 0, drop: 0, patch: 0, at: -99 })), feat, queue: fd ? expand(fd.door) : [], qT: 0, res: LOW_RES, rT: 30 + k * 17,
      kegs: (feat.keg ?? []).map((i) => ({ x: tileX(i), live: true })), shelves: (feat.shelf ?? []).map((i) => ({ x: tileX(i), st: 0, dir: 1, t: 0, drop: 0 })),
      room: fd ? fd.room : 15 + d.ch, hot: fd ? hotSpots(s, k, fd.hot) : [0.5], tramp, gone: false, lure: newLure(s, k, d.ch),
    });
  }
  for (let k = 0; k < d.floors.length; k++) placeFloor(s, k, d.floors[k].init);
  // 보물방: 보물 상자 곁에서 꾸벅꾸벅 조는 문지기들 · (대장 판) 대장
  const vf = s.nf - 1;
  for (const k of expand(d.vault)) {
    const m = add(s, k, vf, 0.3 + s.rng() * 0.36, 0.2 + s.rng() * 0.7, IDLE);
    m.tm = 200 + Math.floor(s.rng() * 300);
    m.nap = !d.boss;
  }
  if (d.boss) {
    const b = add(s, d.boss, vf, 0.5, 0.45, WALK);
    b.tx = 0.42;
    b.v = 0;
  }
  s.c = 0;
  s.cam = camFor(s, 0);
  s.desc = -1;
  s.vaultT = -1;
  s.tumble = -1;
  s.rest = 0;
  s.hurt = 0;
  s.lost = 0;
  s.best = 0;
  s.bestVic = 0;
  s.bestWar = 0;
  s.warN = 0;
  s.star3 = false;
  s.stT = 0;
  s.safeT = 0;
  s.watchT = 1e9;
  s.taps = 0;
  s.clearT = 0;
  s.gauge = 0;
  s.gaugeMax = d.gauge ?? 0;
  s.bossDown = !d.boss;
  s.collapseT = -1;
  s.summonT = 0;
  s.big = null;
  s.freeze = 0;
  s.newDex = [];
  s.lastDrop = 0;
  s.floors[0].qT = 50;
  s.banner = { head: `${CHAPTERS[d.ch]} · ${s.stage + 1}판`, sub: d.news, t: s.t };
  // NEW 스포트라이트: 이 판에 새로 나온 몬스터(보이는 층) — 장치 판은 그 장치 자리
  const nk = d.key as K;
  const first = KD[nk] ? s.mons.find((m) => m.k === nk && m.f <= 2) : undefined;
  s.spot = first ? { id: first.id, t: s.t, label: KD[nk].boss ? '대장' : 'NEW' } : { id: 0, t: s.t, label: d.key };
  see(s, 'stage' + s.stage);
  see(s, 'new:' + d.key);
  ev(s, 'stage', 0.5, FY(0), s.stage);
}
/** 낮잠 자리·모이는 자리: 판마다 새로 흩는다(1판 위 세 층만 한 줄로 겹쳐 첫 톡이 크게 터진다) — 위아래가 겹치는 줄은 매번 눈으로 찾는다 */
function hotSpots(s: TrapState, k: number, def: number[]): number[] {
  if (s.stage === 0 && k < 3) return def;
  // 위층 더미와 같은 줄(반) 또는 멀찍이(반) — 세 층이 한 줄로 겹치는 자리는 판마다 한두 곳뿐
  const prev = k > 0 ? s.floors[k - 1]?.hot[0] : undefined;
  let a = 0.24 + s.rng() * 0.6;
  if (prev !== undefined) a = s.rng() < 0.5 ? clamp(prev + (s.rng() - 0.5) * 0.05, 0.22, 0.86) : prev < 0.55 ? 0.62 + s.rng() * 0.24 : 0.22 + s.rng() * 0.24;
  const b = a < 0.55 ? a + 0.3 + s.rng() * 0.12 : a - 0.3 - s.rng() * 0.12;
  return [a, clamp(b, WL + 0.14, WR - 0.08)];
}
/** 카메라: 지금 층 바닥이 화면 VIEW_Y에 — 맨 아래 두 층에서는 보물방 바닥이 화면 아래 띠 바로 위에 오게 */
const camFor = (s: TrapState, k: number) => Math.min(FY(k) - VIEW_Y, FY(s.nf - 1) - 1.29);

// ───────────────────────────── 톡: 함정문 ─────────────────────────────
const span = (x: number, wd: number) => clamp(Math.round((x - WL) / TW - wd / 2), 0, NT - wd);
/** 칸 가장자리에 걸친 놈도 떨어진다(칸 폭의 이만큼) */
const EDGE = 0.24;
function holeAt(F: Floor, x: number): Tile | null {
  const i = tileOf(x), t = F.tiles[i];
  if (open(t)) return t;
  const e = (x - WL) / TW - i;
  if (e < EDGE && i > 0 && open(F.tiles[i - 1])) return F.tiles[i - 1];
  if (e > 1 - EDGE && i < NT - 1 && open(F.tiles[i + 1])) return F.tiles[i + 1];
  return null;
}
const inSpan = (m: Mon, i0: number, wd: number) => m.x > WL + (i0 - EDGE) * TW && m.x < WL + (i0 + wd + EDGE) * TW;
/** 이 칸들을 열면 떨어질 놈 */
export const catchers = (s: TrapState, f: number, i0: number, wd: number) => s.mons.filter((m) => !m.dead && m.f === f && grounded(m) && !KD[m.k].boss && inSpan(m, i0, wd));
const canTap = (s: TrapState) => s.phase === 'play' && s.rest === 0 && s.desc < 0 && s.vaultT < 0 && s.tumble < 0 && !isVault(s, s.c) && !s.floors[s.c].gone;
function dropOf(s: TrapState, id: number): Drop {
  let D = s.drops.find((q) => q.id === id);
  if (!D) {
    D = { id, n: 0, t: s.t, cracks: 0, x: 0.5, f0: s.c, deep: s.c, pts: 0, vic: 0 };
    s.drops.push(D);
  }
  return D;
}
function onTap(s: TrapState, px: number, wy: number) {
  if (s.firstTap < 0) s.firstTap = s.t;
  ev(s, 'tap', px, wy);
  if (!canTap(s)) return void ev(s, 'deny', px, wy);
  const F = s.floors[s.c], wd = doorW(s);
  let i0 = span(px, wd);
  // 그 줄에 아무도 없으면 가장 가까운 놈 쪽 칸이 열린다 (어디를 톡 해도 누군가 떨어진다)
  if (!catchers(s, s.c, i0, wd).length) {
    let best: Mon | null = null, bd = 9;
    for (const m of s.mons) if (!m.dead && m.f === s.c && grounded(m) && !KD[m.k].boss && Math.abs(m.x - px) < bd) (bd = Math.abs(m.x - px)), (best = m);
    if (best) i0 = span(best.x, wd);
  }
  const D: Drop = { id: ++s.did, n: 0, t: s.t, cracks: 0, x: WL + (i0 + wd / 2) * TW, f0: s.c, deep: s.c, pts: 0, vic: 0 };
  s.drops.push(D);
  if (s.drops.length > 16) s.drops.shift();
  for (let i = i0; i < i0 + wd; i++) {
    const tl = F.tiles[i];
    tl.open = DOOR_T;
    tl.drop = D.id;
    tl.at = s.t;
  }
  s.rest = TAP_REST;
  s.taps++;
  s.lastDrop = D.id;
  if (s.perk[1] === 2 && !isVault(s, s.c + 1)) s.twin.push({ f: s.c + 1, i0, wd, t: s.t + 12, id: D.id });
  ev(s, 'door', D.x, FY(s.c), wd, catchers(s, s.c, i0, wd).length);
  see(s, 'door');
}

// ───────────────────────────── 떨어짐 · 깔림 · 깨짐 ─────────────────────────────
function wow(s: TrapState, text: string, n: number, drop: number) {
  s.wowN++;
  if (s.firstBig < 0 && s.firstTap >= 0) s.firstBig = s.t;
  s.big = { text, t: s.t, n, drop, star: false };
  s.freeze = Math.max(s.freeze, 3);
  see(s, 'wow');
}
function ko(s: TrapState, m: Mon, D: Drop) {
  if (m.ko) return;
  m.ko = true;
  m.drop = D.id;
  D.n++;
  const p = PTS(D.n) * (1 + s.stage);
  D.pts += p;
  s.sp += p;
  s.kills++;
  const key = dexKey(m.k, m.v);
  if (!s.dex.includes(key)) s.dex.push(key), s.newDex.push(key), see(s, 'dex:' + key);
  if (m.door !== D.id) D.vic++;
  ev(s, 'ko', m.x, m.y, D.n, D.vic, 0, m.k);
  const live = !!s.big && s.big.drop === D.id && s.t - s.big.t < BIG_T;
  if (D.n > s.best) {
    s.best = D.n;
    if (D.n >= WOW_N) {
      if (live) (s.big!.n = D.n), (s.big!.text = `${D.n}마리 한 방!`), (s.big!.t = Math.max(s.big!.t, s.t - 10));
      else wow(s, `${D.n}마리 한 방!`, D.n, D.id);
    }
  }
  if (D.vic > s.bestVic) s.bestVic = D.vic;
  starCheck(s, D, m.x, m.y);
}
function startFall(s: TrapState, m: Mon, tl: Tile) {
  if (m.st !== STUN && m.st !== FLAT) ev(s, 'fall', m.x, m.y, 0, 0, 0, m.k);
  m.st = FALL;
  m.vy = 0;
  m.vx = 0;
  m.alert = -1;
  m.tm = 0;
  m.drop = tl.drop;
  if (tl.open > 0 && !m.ko) m.door = tl.drop;
}
function landOf(s: TrapState, id: number, f: number): Land {
  for (const L of s.lands) if (L.id === id && L.f === f && !L.done && s.t - L.t <= 5) return L;
  const L: Land = { id, f, t: s.t, w: 0, vw: 0, x0: 9, x1: -9, done: false, noCrack: false, force: false, splash: false, n0: dropOf(s, id).n };
  s.lands.push(L);
  return L;
}
/** 내려앉은 놈 아래·곁의 놈들이 깔린다 */
function crush(s: TrapState, m: Mon, D: Drop, L: Land | null, reach: number) {
  const ice = s.floors[m.f].feat.ice;
  for (const o of s.mons) {
    if (o === m || o.dead || o.f !== m.f || KD[o.k].boss) continue;
    if (!(grounded(o) || o.st === SKID)) continue;
    if (o.st === STUN && o.drop === m.drop && s.t - o.land < 10) continue;
    if (Math.abs(o.x - m.x) > reach + o.r * 0.6) continue;
    if (L) L.vw += o.w;
    if (!o.ko) {
      ko(s, o, D);
      if (isVault(s, o.f) && bossOf(s)) s.gauge += 0.5;
    }
    if (ice && !isVault(s, o.f) && o.st !== SKID) (o.st = SKID), (o.vx = ice * 0.009), (o.tm = 0);
    else if (o.st !== SKID) (o.st = FLAT), (o.tm = FLAT_T);
    o.drop = D.id;
    o.hurtT = s.t;
    o.alert = -1;
  }
}
function area(s: TrapState, f: number, x0: number, x1: number, D: Drop, L: Land | null, tm = FLAT_T) {
  let n = 0;
  for (const o of s.mons) {
    if (o.dead || o.f !== f || KD[o.k].boss || !(grounded(o) || o.st === SKID) || o.x < x0 - o.r * 0.6 || o.x > x1 + o.r * 0.6) continue;
    if (L) L.vw += o.w;
    if (!o.ko) (ko(s, o, D), n++);
    o.st = FLAT;
    o.tm = tm;
    o.drop = D.id;
    o.hurtT = s.t;
    o.alert = -1;
  }
  return n;
}
function land(s: TrapState, m: Mon) {
  const F = s.floors[m.f], vault = isVault(s, m.f);
  if (!vault) {
    const tl = holeAt(F, m.x);
    if (tl) return void ((m.drop = tl.drop), (m.vy *= 0.6));
  }
  const D = dropOf(s, m.drop);
  m.st = STUN;
  m.tm = STUN_T;
  m.vy = 0;
  m.land = s.t;
  m.hurtT = s.t;
  ko(s, m, D);
  const L = landOf(s, D.id, m.f);
  L.w += m.w * power(s);
  // 덩치 곰: 처음 내려앉은 바닥은 혼자서도 쩍
  if (m.k === 'bear' && ++m.falls === 1 && !vault) (L.force = true), ev(s, 'heavy', m.x, m.y);
  L.x0 = Math.min(L.x0, m.x - m.r);
  L.x1 = Math.max(L.x1, m.x + m.r);
  if (D.deep < m.f) D.deep = m.f;
  ev(s, 'land', m.x, m.y, 0, m.w, 0, m.k);
  // 떨어지는 길에 있던 풍선 박쥐가 붙잡혀 끌려 내려온다
  for (const b of s.mons) if (!b.dead && b.st === FLOAT && b.f === m.f && Math.abs(b.x - m.x) < b.r + m.r + 0.035) (b.st = SNAG), (b.tm = 0), (b.drop = D.id), (b.ax = b.y), ev(s, 'snag', b.x, b.y);
  crush(s, m, D, L, m.r * 0.8 + (s.perk[0] === 2 ? TW * 0.45 : 0) + (s.perk[1] === 1 ? 0.035 : 0));
  // 곁에 쿵: 깔리지 않은 무리는 놀라 흩어진다 (정통으로 깔아야 무리째 — 아무 데나 톡 하면 아래층 무리가 흩어져 큰 한 방이 사라진다)
  if (!vault) spookAt(s, m.f, m.x);
  // 대장 방: 떨어진 무게만큼 쿵 게이지 (머리에 떨어지면 세 배)
  const b = vault ? bossOf(s) : undefined;
  if (b && s.collapseT < 0) {
    s.gauge += 1;
    if (Math.abs(b.x - m.x) < b.r * 0.95 + m.r) {
      s.gauge += 2;
      b.hurtT = s.t;
      if (s.t - s.bonkT > 6) (s.bonkT = s.t), ev(s, 'bonk', b.x, b.y - b.r * 2, m.w);
    }
    if (s.gauge >= s.gaugeMax) collapse(s);
  }
  if (vault) return;
  // 장치
  const i = tileOf(m.x);
  if (F.tramp[i]) {
    L.noCrack = true;
    m.st = ARC;
    m.ax = m.x;
    m.bx = clamp(m.x + F.tramp[i] * 2.3 * TW, WL + m.r, WR - m.r);
    m.aT = ARC_T;
    m.tm = 0;
    ev(s, 'boing', tileX(i), FY(m.f), F.tramp[i]);
    see(s, 'tramp');
    return;
  }
  const wt = F.feat.water;
  if (wt && i >= wt[0] && i <= wt[1]) {
    L.noCrack = true;
    if (!L.splash) {
      L.splash = true;
      const x0 = WL + (wt[0] - 0.7) * TW, x1 = WL + (wt[1] + 1.7) * TW;
      const n = area(s, m.f, x0, x1, D, L, FLAT_T + 12);
      ev(s, 'splash', m.x, FY(m.f), n, x0, x1);
      see(s, 'splash');
    }
  }
  for (const kg of F.kegs) {
    if (!kg.live || Math.abs(kg.x - m.x) > 0.055 + m.r) continue;
    kg.live = false;
    L.force = true;
    L.x0 = Math.min(L.x0, kg.x - TW * 0.9);
    L.x1 = Math.max(L.x1, kg.x + TW * 0.9);
    const n = area(s, m.f, kg.x - 0.21, kg.x + 0.21, D, L);
    ev(s, 'boom', kg.x, FY(m.f), n);
    see(s, 'boom');
  }
  for (const sh of F.shelves) if (sh.st === 0 && Math.abs(sh.x - m.x) < 0.06 + m.r) topple(s, m.f, sh, m.x <= sh.x ? 1 : -1, D);
  if (F.feat.ice && m.st === STUN) {
    L.noCrack = true;
    m.st = SKID;
    m.vx = F.feat.ice * 0.0105;
    m.tm = 0;
    ev(s, 'skid', m.x, m.y, F.feat.ice);
    see(s, 'skid');
  }
}
function topple(s: TrapState, f: number, sh: Shelf, dir: number, D: Drop) {
  sh.st = 1;
  sh.t = s.t;
  sh.dir = dir;
  sh.drop = D.id;
  ev(s, 'topple', sh.x, FY(f), dir);
  see(s, 'topple');
}
/** 바닥 깨짐: 그 칸들이 열려 깔린 놈·기절한 놈·지나가던 놈이 모두 한 층 더 */
function crack(s: TrapState, f: number, x0: number, x1: number, D: Drop) {
  const F = s.floors[f], a = tileOf(x0), b = tileOf(x1);
  for (let i = a; i <= b; i++) (F.tiles[i].crack = CRACK_T), (F.tiles[i].drop = D.id), (F.tiles[i].at = s.t);
  D.cracks++;
  if (D.cracks === 1 && D.x > WL) s.warN++;
  if (D.deep < f) D.deep = f;
  starCheck(s, D, (WL + a * TW + WL + (b + 1) * TW) / 2, FY(f));
  ev(s, 'crack', (WL + a * TW + WL + (b + 1) * TW) / 2, FY(f), D.cracks, a, b);
  see(s, 'crack');
  if (D.cracks >= 2) see(s, 'crack2');
}
function spookAt(s: TrapState, f: number, x: number) {
  let n = 0;
  for (const o of s.mons) {
    if (o.dead || o.f !== f || !o.fol || o.ko || KD[o.k].boss || !(o.st === WALK || o.st === IDLE) || Math.abs(o.x - x) > SPOOK_R) continue;
    if (o.spook <= 0) n++;
    o.spook = SPOOK_T + Math.floor(s.rng() * 30);
    o.tx = clamp(o.x + Math.sign(o.x - x || 1) * (0.15 + s.rng() * 0.2), WL + 0.05, WR - 0.05);
    o.st = WALK;
  }
  if (n >= 2) ev(s, 'spook', x, FY(f), n);
}
/** 별 셋째: 한 번에 두 층 이상 와르르(바닥이 한 번은 깨짐) + 깔린 놈 N마리 */
function starCheck(s: TrapState, D: Drop, x: number, y: number) {
  const d = STAGES[s.stage];
  if (D.cracks >= 1 && D.vic > s.bestWar) s.bestWar = D.vic;
  if (s.star3 || D.vic < d.n || D.cracks < 1) return;
  s.star3 = true;
  if (!(s.big && s.big.drop === D.id && s.t - s.big.t < BIG_T)) wow(s, `${D.n}마리 한 방!`, D.n, D.id);
  s.big!.star = true;
  ev(s, 'star3', x, y);
}
/** 쿵 게이지가 꽉: 대장 방 천장(맨 아래층 바닥)이 통째로 무너진다 */
function collapse(s: TrapState) {
  const f = s.nf - 2, F = s.floors[f];
  const D: Drop = { id: ++s.did, n: 0, t: s.t, cracks: 1, x: 0.5, f0: f, deep: f + 1, pts: 0, vic: 0 };
  s.drops.push(D);
  for (const tl of F.tiles) (tl.crack = 99999), (tl.drop = D.id), (tl.at = s.t);
  F.gone = true;
  F.queue = [];
  s.collapseT = 0;
  wow(s, '천장째 와르르!', 0, D.id);
  s.freeze = 8;
  if (s.c === f && s.desc < 0) s.tumble = 0;
  ev(s, 'collapse', 0.5, FY(f));
  see(s, 'collapse');
}

// ───────────────────────────── 몬스터의 몸짓 ─────────────────────────────
function target(s: TrapState, m: Mon, F: Floor) {
  const u = s.rng();
  m.tx = u < 0.5 ? F.hot[Math.floor(s.rng() * F.hot.length)] + (s.rng() - 0.5) * 0.15 : WL + 0.05 + s.rng() * (WR - WL - 0.1);
  m.tx = clamp(m.tx, WL + m.r, WR - m.r);
}
function alertT(s: TrapState) {
  return STAGES[s.stage].alert;
}
/** 망보기는 더 빨리 덤빈다 (층에 내려오자마자 한 놈이 알아챈다) */
function lookT(s: TrapState) {
  return s.stage === 1 ? 160 : s.stage < 4 ? 110 : 95;
}
function walkStep(s: TrapState, m: Mon, F: Floor) {
  if (m.acool > 0) m.acool--;
  const spd = KD[m.k].spd;
  if (m.alert >= 0) {
    // 너구리를 봤다: 사다리 쪽으로 쿵쿵 — 다 차면 덤빈다
    m.alert++;
    m.face = -1;
    const near = PERCH_X + 0.05 + m.r;
    if (m.x > near) m.x = Math.max(near, m.x - spd * (m.x > near + 0.12 ? 2.4 : 0.7));
    if (m.alert >= (m.act === 9 ? lookT(s) : alertT(s)) && m.x < near + 0.1) (m.st = LEAP), (m.tm = 0), (m.ax = m.x), ev(s, 'leap', m.x, m.y);
    return;
  }
  if (m.st === ENTER) {
    m.x -= spd * 1.9;
    m.face = -1;
    if (m.x <= m.tx) (m.st = IDLE), (m.tm = 10 + Math.floor(s.rng() * 20));
  } else if (m.nap) {
    if (--m.tm <= 0) m.nap = false;
  } else if (m.spook > 0) {
    // 놀라서 우다다 흩어진다
    m.spook--;
    const dx = m.tx - m.x;
    if (Math.abs(dx) > spd * 2.6) (m.x += Math.sign(dx) * spd * 2.6), (m.face = Math.sign(dx)), (m.st = WALK);
    else m.st = IDLE;
  } else if (m.fol && m.f !== s.c) {
    // 아래층 무리는 끌리는 것을 따라간다: 종이 땡 울리면 우르르 뛰어간다 (너구리가 있는 층에서는 놀라 흩어져 어슬렁)
    const L = F.lure, rush = L.kind === 0 && s.t - L.ring < 90, tx = clamp(L.x + m.ox * (L.kind === 1 ? 1.25 : 1), WL + m.r, WR - m.r), dx = tx - m.x;
    const v = spd * (rush ? 3.0 : L.kind === 0 ? 1.0 : 1.7);
    if (Math.abs(dx) > v + 0.004) (m.st = WALK), (m.x += Math.sign(dx) * v), (m.face = Math.sign(dx));
    else if (m.st === WALK) (m.st = IDLE), (m.act = 1 + Math.floor(s.rng() * 2));
  } else if (m.st === IDLE) {
    if (--m.tm <= 0) (m.st = WALK), target(s, m, F);
  } else {
    const dx = m.tx - m.x;
    if (Math.abs(dx) <= spd) (m.st = IDLE), (m.tm = Math.floor(50 + s.rng() * 160)), (m.act = Math.floor(s.rng() * 3));
    else (m.x += Math.sign(dx) * spd), (m.face = Math.sign(dx));
  }
  if (F.feat.belt && m.st !== ENTER) m.x += F.feat.belt * (m.fol ? 0.0006 : 0.0013);
  m.x = clamp(m.x, WL + m.r * 0.8, WR - m.r * 0.8);
}
function monStep(s: TrapState, m: Mon) {
  const F = s.floors[m.f];
  switch (m.st) {
    case ENTER: case WALK: case IDLE:
      if (KD[m.k].boss) return bossStep(s, m);
      return walkStep(s, m, F);
    case FALL: {
      m.vy = Math.min(0.045, m.vy + GRAV);
      m.y += m.vy;
      const ty = feetY(m.f + 1, m.z);
      if (m.y >= ty) {
        m.f++;
        m.y = ty;
        land(s, m);
      }
      return;
    }
    case STUN: case FLAT:
      if (--m.tm <= 0) (m.dead = true), ev(s, 'coin', m.x, m.y - m.r, 0, 0, 0, m.k);
      return;
    case ARC: {
      m.tm++;
      const q = m.tm / m.aT;
      m.x = m.ax + (m.bx - m.ax) * q;
      m.y = feetY(m.f, m.z) - 0.17 * 4 * q * (1 - q);
      if (m.tm >= m.aT) {
        m.y = feetY(m.f, m.z);
        const tl = holeAt(F, m.x);
        if (tl) startFall(s, m, tl);
        else land(s, m);
      }
      return;
    }
    case SKID: {
      m.x += m.vx;
      m.vx *= 0.994;
      const D = dropOf(s, m.drop);
      // 볼링: 아직 서 있는 놈만 쓰러뜨린다 (이미 쓰러진 몸끼리 벽에서 서로 밀어 대며 영영 안 사라지지 않게)
      if (Math.abs(m.vx) >= 0.004)
      for (const o of s.mons) {
        if (o === m || o.dead || o.f !== m.f || KD[o.k].boss || !grounded(o) || Math.abs(o.x - m.x) > m.r + o.r * 0.9) continue;
        if (o.ko && (o.st === STUN || o.st === FLAT)) continue;
        if (!o.ko) ko(s, o, D);
        o.st = SKID;
        o.vx = m.vx * 0.95;
        o.drop = D.id;
        o.hurtT = s.t;
        o.alert = -1;
        ev(s, 'bowl', o.x, o.y, D.n);
      }
      const tl = holeAt(F, m.x);
      if (tl) return startFall(s, m, tl);
      if (m.x <= WL + m.r || m.x >= WR - m.r || Math.abs(m.vx) < 0.0022) {
        m.x = clamp(m.x, WL + m.r, WR - m.r);
        if (Math.abs(m.vx) >= 0.0022) ev(s, 'wallbonk', m.x, m.y);
        m.st = STUN;
        m.tm = STUN_T;
        m.land = s.t;
      }
      return;
    }
    case ROPE: {
      const ty = feetY(m.f, m.z);
      m.y = Math.min(ty, m.y + ROPE_V);
      if (m.y >= ty) (m.st = IDLE), (m.act = 1), (m.tm = 10), ev(s, 'ropeland', m.x, m.y);
      return;
    }
    case FLOAT:
      // 풍선 박쥐: 천장 아래를 둥실둥실
      m.x += m.dir * KD.bat.spd;
      if (m.x < WL + 0.08 || m.x > WR - 0.06) m.dir = -m.dir;
      m.y = FY(m.f) - BAT_H + Math.sin((s.t + m.seed * 400) * 0.05) * 0.012;
      return;
    case SNAG: {
      m.tm++;
      m.y = m.ax + (feetY(m.f, 0.5) - m.ax) * Math.min(1, m.tm / SNAG_T);
      if (m.tm >= SNAG_T) {
        const D = dropOf(s, m.drop), L = s.lands.find((q) => q.id === D.id && q.f === m.f && !q.done) ?? null;
        ko(s, m, D);
        m.dead = true;
        const n = area(s, m.f, m.x - 0.2, m.x + 0.2, D, L);
        ev(s, 'batpop', m.x, feetY(m.f, 0.5), n);
        see(s, 'batpop');
      }
      return;
    }
    case LEAP: {
      m.tm++;
      const q = Math.min(1, m.tm / 18);
      m.x = m.ax + (PERCH_X + 0.03 - m.ax) * q;
      m.y = feetY(m.f, m.z) - (PERCH_H + 0.02) * Math.sin(q * Math.PI * 0.62) * 1.12;
      if (m.tm >= 18) {
        if (s.hurt === 0 && s.desc < 0 && s.c === m.f) {
          s.hearts--;
          s.lost++;
          s.hurt = 100;
          ev(s, 'ouch', PERCH_X, FY(s.c) - PERCH_H - 0.05, s.hearts);
          see(s, 'ouch');
          if (s.hearts <= 0) (s.phase = 'end'), (s.pt = 0), ev(s, 'end', 0.5, FY(s.c), 0);
        }
        m.st = HIT;
        m.tm = 34;
        m.vx = 0.011;
        m.alert = -1;
        m.acool = 360;
      }
      return;
    }
    case HIT:
      m.x = clamp(m.x + m.vx, WL + m.r, WR - m.r);
      m.vx *= 0.9;
      m.y += (feetY(m.f, m.z) - m.y) * 0.3;
      if (--m.tm <= 0) (m.st = IDLE), (m.tm = 60), (m.y = feetY(m.f, m.z));
      return;
    case FLEE:
      if (isVault(s, m.f)) {
        m.x += 0.0065;
        m.face = 1;
        if (m.x >= WR - 0.01) m.dead = true;
        return;
      }
      // 겁먹고 사다리 구멍으로 우다다 → 폴짝 뛰어내린다
      m.x -= 0.012;
      m.face = -1;
      if (m.x <= WL + 0.015) (m.st = FALL), (m.vy = -0.012), (m.tm = 0), ev(s, 'jump', m.x, m.y);
      return;
  }
}
function bossStep(s: TrapState, b: Mon) {
  const spd = KD[b.k].spd;
  if (s.t - b.hurtT < 30) return;
  if (b.st === IDLE) {
    if (--b.tm <= 0) (b.st = WALK), (b.tx = 0.25 + s.rng() * 0.5);
  } else {
    const dx = b.tx - b.x;
    if (Math.abs(dx) <= spd) (b.st = IDLE), (b.tm = 40 + Math.floor(s.rng() * 80));
    else (b.x += Math.sign(dx) * spd), (b.face = Math.sign(dx));
  }
}
/** 같은 층에서 너무 겹친 놈들을 살짝 떼어 놓는다 */
function spread(s: TrapState) {
  const list = s.mons.filter((m) => !m.dead && (m.st === WALK || m.st === IDLE) && !KD[m.k].boss).sort((a, b) => a.f - b.f || a.x - b.x);
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (b.f !== a.f || b.x - a.x > (a.r + b.r) * 0.6) break;
      if (Math.abs(a.z - b.z) < 0.3) (a.x -= 0.0007), (b.x += 0.0007);
    }
  }
}

// ───────────────────────────── 판 흐름 ─────────────────────────────
function canSpot(s: TrapState) {
  return s.stage > 0 && s.stT >= 240 && s.t >= s.safeT && s.hurt === 0 && s.desc < 0 && s.vaultT < 0 && s.tumble < 0 && !isVault(s, s.c);
}
function startDescend(s: TrapState) {
  let to = s.c + 1;
  while (!isVault(s, to) && s.floors[to].gone) to++;
  s.desc = 0;
  s.clearT = 0;
  ev(s, 'desc', PERCH_X, FY(s.c), to - s.c);
  s.descTo = to;
}
function arriveVault(s: TrapState) {
  s.vaultT = 0;
  for (const m of s.mons) if (m.f === s.c && !m.ko && !m.dead && grounded(m) && !KD[m.k].boss) (m.st = FLEE), (m.nap = false), (m.alert = -1);
  ev(s, 'vault', 0.8, FY(s.c));
}
function clearStage(s: TrapState) {
  s.phase = 'result';
  s.pt = 0;
  s.starOk = [true, s.lost === 0, s.star3];
  s.got = s.starOk.filter(Boolean).length;
  s.stars += s.got;
  s.gain = (s.sp + CLEAR_PTS) * STAR_MUL[s.got];
  s.pts += s.gain;
  s.sp = 0;
  s.lv++;
  see(s, 'lv' + s.lv);
  if (!s.loot.includes(s.stage)) s.loot.push(s.stage), see(s, 'loot' + s.stage);
  s.spot = null;
  if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * 30);
  ev(s, 'clear', 0.5, FY(s.c), s.got);
}
function advance(s: TrapState) {
  const d = STAGES[s.stage];
  if (s.won) return void ((s.phase = 'end'), (s.pt = 0), ev(s, 'end', 0.5, FY(s.c), 1));
  if (d.boss && d.ch < PERKS.length && !s.perk[d.ch]) return void ((s.phase = 'pick'), (s.pt = 0), (s.picked = -1), see(s, 'pick' + d.ch), ev(s, 'pickopen', 0.5, FY(s.c)));
  s.stage++;
  newStage(s);
}
function playStep(s: TrapState) {
  const d = STAGES[s.stage];
  s.stT++;
  if (s.rest > 0) s.rest--;
  if (s.hurt > 0) s.hurt--;
  for (const F of s.floors)
    for (const tl of F.tiles) {
      if (tl.open > 0) tl.open--;
      if (tl.crack > 0 && tl.crack < 9999 && --tl.crack === 0) tl.patch = 1;
    }
  // 쌍둥이 문: 아래층 같은 자리도 쩍
  if (s.twin.length) {
    for (const q of s.twin) {
      if (s.t < q.t || isVault(s, q.f)) continue;
      const F = s.floors[q.f];
      for (let i = q.i0; i < q.i0 + q.wd; i++) if (!F.tiles[i].crack) (F.tiles[i].crack = CRACK_T), (F.tiles[i].drop = q.id), (F.tiles[i].at = s.t);
      ev(s, 'twin', WL + (q.i0 + q.wd / 2) * TW, FY(q.f));
    }
    s.twin = s.twin.filter((q) => s.t < q.t);
  }
  lureStep(s);
  for (let i = 0; i < s.mons.length; i++) if (!s.mons[i].dead) monStep(s, s.mons[i]);
  // 열린 칸 위의 놈은 떨어진다
  for (const m of s.mons) {
    if (m.dead || isVault(s, m.f) || !grounded(m) || KD[m.k].boss) continue;
    const tl = holeAt(s.floors[m.f], m.x);
    if (tl) startFall(s, m, tl);
  }
  // 내려앉은 무리: 무거우면 그 바닥도 깨진다
  for (const L of s.lands) {
    if (L.done || s.t - L.t < 3) continue;
    L.done = true;
    if (isVault(s, L.f) || L.noCrack || L.x1 < L.x0) continue;
    // 낮잠 더미(덩치 곰은 셋으로 친다)를 깔고 내려앉으면 그 바닥이 쩍 — 더미가 줄줄이 겹친 줄은 끝까지 와르르
    const D = dropOf(s, L.id);
    // 쿵 힘(너구리 Lv · 모래주머니)이 셀수록 적게 깔려도 깨진다
    const need = d.thr * CRACK_MUL ** D.cracks;
    if (L.force || L.vw * power(s) >= need) crack(s, L.f, L.x0 + 0.012, L.x1 - 0.012, D);
    else if (L.vw * power(s) >= need - 1) ev(s, 'creak', (L.x0 + L.x1) / 2, FY(L.f));
  }
  if (s.lands.length > 24) s.lands = s.lands.filter((L) => !L.done || s.t - L.t < 8);
  // 책장 도미노
  for (let f = 0; f < s.floors.length; f++)
    for (const sh of s.floors[f].shelves) {
      if (sh.st !== 1 || s.t - sh.t < SHELF_T) continue;
      sh.st = 2;
      const x0 = Math.min(sh.x, sh.x + sh.dir * 0.25), x1 = Math.max(sh.x, sh.x + sh.dir * 0.25), D = dropOf(s, sh.drop);
      const n = area(s, f, x0, x1, D, null);
      ev(s, 'shelfland', (x0 + x1) / 2, FY(f), n, sh.dir);
      for (const o of s.floors[f].shelves) if (o.st === 0 && o.x > x0 - 0.01 && o.x < x1 + 0.01) topple(s, f, o, sh.dir, D);
    }
  if (s.t % 2 === 0) spread(s);
  // 망보기: 너구리가 층에 내려오면 사다리 곁 상자 뒤에서 망보기 도깨비가 쏙 — '!' 하고 곧 덤빈다 (층마다 한 놈)
  if (canSpot(s) && s.stT >= s.watchT) {
    s.watchT = 1e9;
    const o = add(s, 'imp', s.c, LOOK_X, 0.62, WALK);
    o.alert = 0;
    o.act = 9;
    o.face = -1;
    ev(s, 'peek', LOOK_X, o.y - o.r * 2.6, 1);
    see(s, 'alert');
  }
  // 문으로 들어오는 무리 (지금 층만) — 층이 비어 가면 우르르
  const F = s.floors[s.c];
  // 화면에 보이는 몬스터는 스물 남짓까지만 (느린 폰에서도 가볍게) — 넘치면 문 앞에서 잠깐 기다린다
  const shown = s.mons.reduce((a, m) => a + (!m.dead && m.f >= s.c && m.f <= s.c + 2 ? 1 : 0), 0), room = shown < VIS_CAP;
  if (!isVault(s, s.c) && !F.gone && s.desc < 0) {
    const n = s.mons.reduce((a, m) => a + (m.f === s.c && grounded(m) && counts(m) ? 1 : 0), 0);
    if (F.queue.length && --F.qT <= 0 && n < 8 && (room || n <= 2)) {
      ropeIn(s, F.queue.shift()!, s.c);
      F.qT = GATE_RUSH;
    }
    // 아래층(보이는 두 층)에는 문으로 하나둘 계속 들어와 무리에 붙는다 — 깔아뭉갤 무리가 늘 있다 (층마다 남은 몫이 바닥나면 끝)
    for (let f = s.c + 1; f <= s.c + 2 && f < s.nf - 1; f++) {
      const G2 = s.floors[f];
      if (!room || G2.gone || G2.res <= 0 || --G2.rT > 0) continue;
      G2.rT = LOW_EVERY;
      if (s.mons.reduce((a, m) => a + (m.f === f && !m.dead && counts(m) && grounded(m) ? 1 : 0), 0) >= LOW_CAP) continue;
      G2.res--;
      ropeIn(s, s.rng() < 0.15 && STAGES[s.stage].floors[f].init.some(([q]) => q === 'bear') ? 'bear' : 'imp', f);
    }
    // 대장 판 맨 아래층: 대장이 졸개를 계속 올려 보낸다
    if (!s.bossDown && s.c === s.nf - 2 && !F.queue.length && n <= 3 && (room || n <= 1) && ++s.summonT >= 46) {
      s.summonT = 0;
      F.queue.push(...expand([['imp', 5], ...((s.rng() < 0.45 ? [['bear', 1]] : []) as [K, number][])]));
      F.qT = 10;
      const b = bossOf(s);
      if (b) ev(s, 'summon', b.x, b.y - b.r * 2.2);
    }
  }
  // 대장 방에도 졸개가 들락날락
  if (!s.bossDown && s.collapseT < 0 && s.t % 200 === 0) {
    const vf = s.nf - 1, n = s.mons.reduce((a, m) => a + (m.f === vf && !m.ko && !m.dead && grounded(m) && !KD[m.k].boss ? 1 : 0), 0);
    if (n < 3 && shown < VIS_CAP) for (let i = 0; i < 2; i++) (add(s, 'imp', vf, WR + 0.02 + i * 0.05, 0.3 + s.rng() * 0.6, ENTER).tx = 0.55 + s.rng() * 0.3);
  }
  // 천장째 와르르 → 대장 납작
  if (s.collapseT >= 0 && !s.bossDown) {
    if (++s.collapseT >= 26) {
      const b = bossOf(s);
      if (b) {
        const D = dropOf(s, s.drops[s.drops.length - 1].id);
        b.hurtT = s.t;
        ko(s, b, D);
        b.st = FLAT;
        b.tm = 80;
        s.sp += BOSS_PTS;
        ev(s, 'bossko', b.x, b.y, 0, 0, 0, b.k);
        see(s, 'bossko');
      }
      s.bossDown = true;
    }
  }
  if (s.mons.some((m) => m.dead)) s.mons = s.mons.filter((m) => !m.dead);
  // 너구리: 층 비우면 사다리로 · 천장째 무너지면 같이 와르르 · 보물방
  if (s.tumble >= 0) {
    s.tumble++;
    s.cam += (camFor(s, s.nf - 1) - s.cam) * 0.12;
    if (s.tumble >= 40) (s.tumble = -1), (s.c = s.nf - 1), (s.cam = camFor(s, s.c)), ev(s, 'thump', PERCH_X + 0.1, FY(s.c)), arriveVault(s);
  } else if (s.desc >= 0) {
    const to = s.descTo, T = DESC_T * (to - s.c > 1 ? 1.4 : 1), q = Math.min(1, ++s.desc / T), e = q * q * (3 - 2 * q);
    s.cam = camFor(s, s.c) + (camFor(s, to) - camFor(s, s.c)) * e;
    if (q >= 1) {
      s.c = to;
      s.desc = -1;
      s.safeT = s.t + 10;
      s.cam = camFor(s, s.c);
      ev(s, 'arrive', PERCH_X, FY(s.c));
      if (isVault(s, s.c)) arriveVault(s);
      else (s.floors[s.c].qT = 20), (s.watchT = s.c % 2 === 1 ? s.stT + 14 + Math.floor(s.rng() * 16) : 1e9), scatter(s, s.c);
    }
  } else if (s.vaultT >= 0) {
    s.vaultT++;
    if (s.vaultT === 26) ev(s, 'chest', 0.82, FY(s.c));
    if (s.vaultT >= 72) clearStage(s);
  } else if (!isVault(s, s.c) && (s.bossDown || s.c < s.nf - 2)) {
    let left = 0, busy = 0;
    for (const m of s.mons) {
      if (m.f !== s.c || m.dead) continue;
      if (m.st === FALL || m.st === FLEE) busy++;
      else if (counts(m)) left++;
    }
    // 셋 이하만 남으면 겁먹고 스스로 사다리 구멍으로 뛰어내린다 (치우기 톡 없음 · 아래층에 작은 깔기 보너스)
    if (left > 0 && left <= PANIC_N && !F.queue.length && s.rest < TAP_REST - 6) {
      const D: Drop = { id: ++s.did, n: 0, t: s.t, cracks: 0, x: WL, f0: s.c, deep: s.c, pts: 0, vic: 0 };
      s.drops.push(D);
      if (s.drops.length > 16) s.drops.shift();
      for (const m of s.mons) if (m.f === s.c && !m.dead && counts(m) && m.st !== FALL) (m.st = FLEE), (m.alert = -1), (m.drop = D.id), (m.door = D.id);
      ev(s, 'panic', 0.5, FY(s.c) - 0.12, left);
      see(s, 'panic');
      left = 0;
      busy++;
    }
    if (left === 0 && !F.queue.length && !busy) {
      if (++s.clearT >= 20) startDescend(s);
    } else s.clearT = 0;
  }
}

const game: GameDef<TrapState> & { wows(s: TrapState): number } = {
  id: 'trapdoor',
  name: '🕳️ 함정문 탑',
  genes: ['trapdoor', 'chain', 'depth'],
  twist: '적을 치지 않고 그 발밑 바닥을 연다 — 위층에서 떨어뜨린 무리가 아래층 무리를 깔고, 무거우면 아래 바닥까지 깨져 탑이 위에서부터 와르르 무너진다',
  rules: [
    '바닥을 톡 하면 함정문이 쩍! 위 놈들이 떨어져 아래층 놈들을 깔아요.',
    '무겁게 떨어지면 아래 바닥도 깨져 한 층 더 와르르 — 겹친 줄을 노려요.',
    '층을 비우면 너구리가 내려가요. 너구리 곁의 (!)는 얼른 떨어뜨려요.',
  ],
  controls: 'touch',
  hint: '바닥을 톡 — 그 줄의 함정문이 쩍 열려요 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '몬스터 탑 단면 — 층층이 방이 보이는 인형의 집',
    mood: '층층이 불 켜진 방(부엌·식당·장난감 창고·도서관)에서 동글동글한 몬스터들이 요리하고 낮잠 자고 베개 싸움을 한다. 꼬마 도둑 너구리가 사다리에 매달려 바닥 한 칸을 톡 열면 와르르, 아래층이 납작해진다.',
    palette: { bg: '#f6d9a8', ink: '#3b2a20', muted: '#8a7a66', accent: '#ffb02e', hot: '#ff5a4e', soft: '#fff1d6' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.hearts,
  cleared: (s) => (s.phase === 'result' ? { stage: s.stage, got: s.got, of: 3 } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, hearts: 3, pts: 0, sp: 0, stars: 0, got: 0, starOk: [false, false, false], dead: false, won: false,
      lv: 1, perk: [0, 0], picked: -1, dex: [], newDex: [], loot: [], floors: [], nf: 0, c: 0, cam: 0, desc: -1, descTo: 0, vaultT: -1, tumble: -1,
      mons: [], nid: 0, drops: [], lands: [], did: 0, rest: 0, down: false, firstTap: -1, firstBig: -1, wowN: 0, hurt: 0, lost: 0, best: 0, bestVic: 0, bestWar: 0, warN: 0, star3: false,
      stT: 0, watchT: 0, safeT: 0, taps: 0, kills: 0, gain: 0, clearT: 0, twin: [], gauge: 0, gaugeMax: 0, bonkT: -99, bossDown: true, collapseT: -1, summonT: 0,
      events: [], seen: new Set<string>(), banner: null, spot: null, big: null, freeze: 0, lastDrop: 0,
    } as TrapState;
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
      if (tap && p) onTap(s, p.x, s.cam + p.y * A);
      if (s.freeze > 0) s.freeze--;
      else playStep(s);
    } else if (s.phase === 'result') {
      if ((tap && s.pt >= RES_MIN) || s.pt >= RES_AUTO) advance(s);
    } else if (s.phase === 'pick') {
      const ch = STAGES[s.stage].ch;
      if (s.picked < 0) {
        if (tap && p && s.pt >= PICK_MIN) s.picked = p.x < 0.5 ? 0 : 1;
        else if (s.pt >= PICK_AUTO) s.picked = 0;
        if (s.picked >= 0) (s.perk[ch] = s.picked + 1), (s.pt = 0), see(s, `perk${ch}${s.picked}`), ev(s, 'perk', s.picked ? 0.72 : 0.28, s.cam + 0.86, s.picked);
      } else if (s.pt >= PICK_AFTER) (s.stage++), newStage(s);
    } else if (s.pt >= END_T) s.dead = true;
    if (s.events.length > 90) s.events.splice(0, s.events.length - 90);
    while (s.events.length && s.t - s.events[0].t > 120) s.events.shift();
    if (s.spot && s.t - s.spot.t > 220) s.spot = null;
  },
  over: (s) => s.dead,
  score: (s) => s.pts + s.sp,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const trapdoor = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
/** 세계 좌표 (x, 세계 y)를 톡 */
const at = (s: TrapState, x: number, wy: number): Input => ({ tap: false, dir: 0, pointer: { x, y: clamp((wy - s.cam) / A, 0.02, 0.98) } });
/** 지금 층 방 한가운데 높이에서 x를 톡 */
const tapX = (s: TrapState, x: number) => at(s, x, FY(s.c) - 0.13);
const spanX = (i0: number, wd: number) => WL + (i0 + wd / 2) * TW;
/** 그 칸들 위의 무리 한가운데를 톡 (사람처럼: 칸 가운데가 아니라 놈들을 보고 누른다) */
function tapSpan(s: TrapState, i0: number, wd: number): Input {
  const c = catchers(s, s.c, i0, wd), cx = spanX(i0, wd);
  if (!c.length) return tapX(s, cx);
  const mx = c.reduce((a, m) => a + m.x, 0) / c.length, my = c.reduce((a, m) => a + m.y - m.r, 0) / c.length;
  return at(s, clamp(mx, cx - TW * 0.42, cx + TW * 0.42), my);
}
/** 결과 화면·둘 중 하나는 버릇 봇도 그냥 넘긴다 */
function between(s: TrapState, left: boolean): Input | null {
  if (s.phase === 'play') return null;
  if (s.down) return NO;
  if (s.phase === 'result') return s.pt >= RES_MIN ? { tap: false, dir: 0, pointer: { x: 0.5, y: 0.6 } } : NO;
  if (s.phase === 'pick') return s.picked < 0 && s.pt >= PICK_MIN ? { tap: false, dir: 0, pointer: { x: left ? 0.28 : 0.72, y: 0.6 } } : NO;
  return NO;
}

/** T틱 뒤 이 놈은 어디쯤 있을까 (무리는 끌리는 것을 따라 움직인다 — 떨어지는 동안 아래층 무리도 옮겨 간다) */
function predX(s: TrapState, o: Mon, T: number): number {
  if (!(o.st === WALK || o.st === IDLE || o.st === ENTER) || o.nap || o.alert >= 0) return o.x;
  if (o.spook > T) return o.x + clamp(o.tx - o.x, -KD[o.k].spd * 2.6 * T, KD[o.k].spd * 2.6 * T);
  const F = s.floors[o.f], spd = KD[o.k].spd;
  if (!o.fol) return o.st === WALK ? o.x + clamp(o.tx - o.x, -spd * T, spd * T) : o.x;
  const L = F.lure;
  let lx = L.x;
  if (L.kind === 1) lx = clamp(L.x + L.vx * T, WL + 0.07, WR - 0.07);
  else if (L.kind === 2) lx = L.x + clamp(L.tx - L.x, -WISP_V * T, WISP_V * T);
  const rush = L.kind === 0 && s.t - L.ring < 90, v = spd * (rush ? 3.0 : L.kind === 0 ? 1.0 : 1.7), tx = clamp(lx + o.ox * (L.kind === 1 ? 1.25 : 1), WL + o.r, WR - o.r);
  return o.x + clamp(tx - o.x, -v * T, v * T);
}
/** 이 칸들을 지금 열면 몇 마리가 쓰러질까 — 떨어짐·깔림·바닥 깨짐·장치를 가볍게 어림셈 (잘하는 봇의 눈) */
export function judge(s: TrapState, i0: number, wd: number): { n: number; fall: number; cracks: number; gauge: number; alert: number } {
  const d = STAGES[s.stage], pw = power(s), used = new Set<number>();
  let mass = catchers(s, s.c, i0, wd);
  const fall = mass.length;
  if (!fall) return { n: 0, fall: 0, cracks: 0, gauge: 0, alert: -1 };
  let n = 0, cracks = 0, gauge = 0, alert = -1;
  for (const m of mass) (used.add(m.id), m.ko || n++), m.alert >= 0 && (alert = Math.max(alert, m.alert));
  const reachX = (s.perk[0] === 2 ? TW * 0.45 : 0) + (s.perk[1] === 1 ? 0.035 : 0);
  const R0 = 0.8, R1 = 0.6;
  const take = (o: Mon, out: Mon[]) => {
    if (used.has(o.id)) return;
    used.add(o.id);
    out.push(o);
    if (!o.ko) n++;
  };
  let T = 0;
  const areaOn = (f: number, x0: number, x1: number, out: Mon[]) => {
    for (const o of s.mons) if (!o.dead && o.f === f && !KD[o.k].boss && grounded(o) && predX(s, o, T) >= x0 - o.r * 0.6 && predX(s, o, T) <= x1 + o.r * 0.6) take(o, out);
  };
  for (let f = s.c + 1; f < s.nf; f++) {
    const F = s.floors[f], vault = isVault(s, f), vic: Mon[] = [];
    T = f === s.c + 1 ? 21 : T + 26;
    let W = 0, noCrack = false, force = false;
    for (const m of mass) W += m.w * pw;
    for (const o of s.mons) {
      if (o.dead || o.f !== f || KD[o.k].boss || used.has(o.id)) continue;
      if (o.st === FLOAT) {
        if (mass.some((m) => Math.abs(o.x - m.x) < o.r + m.r + 0.035)) (used.add(o.id), n++), areaOn(f, o.x - 0.2, o.x + 0.2, vic);
        continue;
      }
      const ox = predX(s, o, T);
      if (grounded(o) && mass.some((m) => Math.abs(ox - m.x) <= m.r * R0 + reachX + o.r * R1)) take(o, vic);
    }
    if (vault) {
      const b = bossOf(s);
      if (b) for (const m of mass) gauge += m.w * (Math.abs(b.x - m.x) < b.r * 0.95 + m.r ? 3 : 1);
      break;
    }
    for (const m of mass) {
      const i = tileOf(m.x);
      if (F.tramp[i]) {
        noCrack = true;
        const bx = clamp(m.x + F.tramp[i] * 2.3 * TW, WL, WR);
        for (const o of s.mons) if (!o.dead && o.f === f && grounded(o) && !KD[o.k].boss && Math.abs(o.x - bx) <= m.r * R0 + o.r * R1) take(o, vic);
      }
      const wt = F.feat.water;
      if (wt && i >= wt[0] && i <= wt[1]) (noCrack = true), areaOn(f, WL + (wt[0] - 0.7) * TW, WL + (wt[1] + 1.7) * TW, vic);
      for (const kg of F.kegs) if (kg.live && Math.abs(kg.x - m.x) <= 0.055 + m.r) (force = true), areaOn(f, kg.x - 0.21, kg.x + 0.21, vic);
      for (const sh of F.shelves) if (sh.st === 0 && Math.abs(sh.x - m.x) < 0.06 + m.r) areaOn(f, Math.min(sh.x, sh.x + (m.x <= sh.x ? 0.5 : -0.5)), Math.max(sh.x, sh.x + (m.x <= sh.x ? 0.5 : -0.5)), vic);
      if (F.feat.ice && !F.tramp[i]) {
        noCrack = true;
        const dir = F.feat.ice;
        for (const o of s.mons) if (!o.dead && o.f === f && grounded(o) && !KD[o.k].boss && (o.x - m.x) * dir > 0) take(o, vic);
      }
    }
    let vw = 0;
    for (const o of vic) vw += o.w;
    void W;
    if (mass.some((m) => m.k === 'bear' && (m.f === f - 1 || !m.ko) && cracks === 0)) force = true;
    if (noCrack) break;
    if (force || vw * pw >= d.thr * CRACK_MUL ** cracks) {
      cracks++;
      mass = mass.concat(vic);
      continue;
    }
    break;
  }
  return { n, fall, cracks, gauge, alert };
}
const waitMem = new WeakMap<object, { t: number }>();
const WAIT_T = 60;
/** 잘하는 봇: 열 수 있는 자리마다 연쇄를 어림셈해 가장 크게 터질 줄을 연다. 너구리를 본 놈(!)이 반쯤 차면 그 줄 먼저 */
export const trapdoorSmart: Bot<TrapState> = {
  name: '위아래 겹친 줄을 노려 크게',
  act(s) {
    const mid = between(s, true);
    if (mid) return mid;
    if (s.down) return NO;
    if (!canTap(s)) return (waitMem.delete(s), NO);
    const d = STAGES[s.stage], wd = doorW(s), boss = !s.bossDown && !!bossOf(s);
    let w = waitMem.get(s);
    if (!w) waitMem.set(s, (w = { t: s.t }));
    let bi = -1, bv = -1, bn = 0, bc = 0, ai = -1, av = -1;
    const danger = s.mons.reduce((a, m) => (m.f === s.c && m.alert >= 0 && !m.dead ? Math.max(a, m.alert) : a), -1);
    for (let i0 = 0; i0 <= NT - wd; i0++) {
      const j = judge(s, i0, wd);
      if (!j.fall) continue;
      const v = j.n + (s.star3 ? 0 : (j.n - j.fall) * (j.cracks ? 0.8 : 0.3)) + j.cracks * 1.2 + (boss ? j.gauge * 0.45 : 0) + j.fall * 0.15;
      if (v > bv) (bv = v), (bi = i0), (bn = j.n - j.fall), (bc = j.cracks);
      if (j.alert >= 0 && j.alert === danger && v > av) (av = v), (ai = i0);
    }
    if (bi < 0) return NO;
    if (ai >= 0 && danger > lookT(s) * 0.4) return tapSpan(s, ai, wd);
    // 세 층을 읽고 '지금 좋은 줄'이 보이면 바로 — 아래층 무리 위에 아무도 없으면 잠깐(사람이 읽는 만큼) 보다가 그중 나은 데
    const waited = s.t - w.t, good = bc >= 1 || bn >= Math.max(4, d.thr);
    if (good || waited >= WAIT_T || boss) return tapSpan(s, bi, wd);
    return NO;
  },
};

/** 못하는 봇: 아무 때나 아무 데나 톡 */
export const trapdoorRandom: Bot<TrapState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    if (s.down) return NO;
    return rng() < 1 / 40 ? { tap: false, dir: 0, pointer: { x: 0.04 + rng() * 0.92, y: 0.08 + rng() * 0.8 } } : NO;
  },
};

/** 버릇 봇: 쉼이 끝나면 늘 지금 층에서 가장 붐비는 칸 (아래층은 안 본다) */
export const trapdoorHabit: Bot<TrapState> = {
  name: '버릇: 늘 가장 붐비는 칸',
  act(s) {
    const mid = between(s, true);
    if (mid) return mid;
    if (s.down || !canTap(s)) return NO;
    const wd = doorW(s);
    let bi = -1, bn = 0;
    for (let i0 = 0; i0 <= NT - wd; i0++) {
      const n = catchers(s, s.c, i0, wd).reduce((a, m) => a + m.w, 0);
      if (n > 0 && n >= bn) (bn = n), (bi = i0);
    }
    return bi < 0 ? NO : tapSpan(s, bi, wd);
  },
};

/** 독립 버릇 봇: 쉼이 끝나면 늘 너구리에게 가장 가까운 놈의 칸 */
export const trapdoorHabit2: Bot<TrapState> = {
  name: '버릇: 늘 너구리에게 가장 가까운 칸',
  act(s) {
    const mid = between(s, false);
    if (mid) return mid;
    if (s.down || !canTap(s)) return NO;
    let best: Mon | null = null;
    for (const m of s.mons) if (!m.dead && m.f === s.c && grounded(m) && !KD[m.k].boss && (!best || m.x < best.x)) best = m;
    return best ? tapX(s, best.x) : NO;
  },
};
/** 측정·스크린샷용: k판으로 건너뛰기 */
export const __jump = (s: TrapState, k: number, lv = k + 1, perk: number[] = [k > 3 ? 1 : 0, k > 7 ? 2 : 0]) => ((s.stage = k), (s.lv = lv), (s.perk = perk), newStage(s));

// ───────────────────────────── 그리기: 도구 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const OUT = '#4b3020';
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
function ink(g: C2, fill: string | CanvasGradient, lw = LW, stroke = OUT) {
  g.fillStyle = fill;
  g.fill();
  if (lw > 0) (g.strokeStyle = stroke), (g.lineWidth = lw), g.stroke();
}
function shine(g: C2, x: number, y: number, rx: number, ry: number, rot = -0.5) {
  g.fillStyle = 'rgba(255,255,255,.5)';
  ell(g, x, y, rx, ry, rot);
  g.fill();
}
function blush(g: C2, cx: number, cy: number, e: number, r: number) {
  g.fillStyle = 'rgba(255,110,120,.45)';
  for (const sd of [-1, 1]) ell(g, cx + sd * e, cy, r, r * 0.62), g.fill();
}

// ───────────────────────────── 몬스터 스티커 ─────────────────────────────
/** 표정: 평소 · 화남(너구리를 봤다) · 으아아(떨어짐) · 어질(기절) · 쿨쿨(낮잠) · 신남 · 아야(깔림) */
const M_IDLE = 0, M_MAD = 1, M_FALL = 2, M_DIZZY = 3, M_SLEEP = 4, M_HAPPY = 5, M_OUCH = 6;
/** 얼굴: (cx,cy) 두 눈 사이 · e 눈 간격의 반 · s 눈 크기 · my 입까지 */
function face(g: C2, cx: number, cy: number, e: number, s: number, mood: number, my: number) {
  g.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const x = cx + sd * e, y = cy;
    if (mood === M_DIZZY) {
      g.strokeStyle = OUT;
      g.lineWidth = s * 0.26;
      g.beginPath();
      for (let i = 0; i <= 14; i++) {
        const a = i * 0.75 * sd, q = s * (0.12 + i * 0.058);
        if (i) g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
        else g.moveTo(x + q, y);
      }
      g.stroke();
    } else if (mood === M_SLEEP || mood === M_HAPPY) {
      g.strokeStyle = OUT;
      g.lineWidth = s * 0.34;
      g.beginPath();
      if (mood === M_SLEEP) g.arc(x, y - s * 0.2, s * 0.6, Math.PI * 0.15, Math.PI * 0.85);
      else g.arc(x, y + s * 0.3, s * 0.65, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
    } else if (mood === M_OUCH) {
      g.strokeStyle = OUT;
      g.lineWidth = s * 0.34;
      g.beginPath();
      g.moveTo(x - sd * s * 0.6, y - s * 0.55);
      g.lineTo(x + sd * s * 0.45, y);
      g.lineTo(x - sd * s * 0.6, y + s * 0.55);
      g.stroke();
    } else {
      const big = mood === M_FALL ? 1.22 : 1;
      ell(g, x, y, s * 0.82 * big, s * 0.98 * big);
      ink(g, '#ffffff', s * 0.18);
      const px = mood === M_FALL ? 0 : s * 0.12, py = mood === M_FALL ? -s * 0.18 : s * 0.12, pr = mood === M_FALL ? 0.32 : 0.46;
      ell(g, x + px, y + py, s * pr, s * pr * 1.18);
      g.fillStyle = '#2a1a12';
      g.fill();
      ell(g, x + px - s * 0.14, y + py - s * 0.18, s * 0.15, s * 0.17);
      g.fillStyle = '#ffffff';
      g.fill();
      if (mood === M_MAD) {
        g.strokeStyle = OUT;
        g.lineWidth = s * 0.4;
        g.beginPath();
        g.moveTo(x + sd * s * 1.0, y - s * 1.55);
        g.lineTo(x - sd * s * 0.7, y - s * 0.95);
        g.stroke();
      }
    }
  }
  const y = cy + my, w = s * 1.15;
  g.strokeStyle = OUT;
  g.lineWidth = s * 0.28;
  if (mood === M_FALL || mood === M_OUCH) {
    ell(g, cx, y + s * 0.25, s * 0.5, s * (mood === M_FALL ? 0.75 : 0.42));
    ink(g, '#8c2f2f', s * 0.22);
    ell(g, cx, y + s * 0.55, s * 0.3, s * 0.2);
    g.fillStyle = '#ff8a8a';
    if (mood === M_FALL) g.fill();
  } else if (mood === M_MAD) {
    g.beginPath();
    g.moveTo(cx - w * 0.75, y + s * 0.35);
    g.quadraticCurveTo(cx, y - s * 0.4, cx + w * 0.75, y + s * 0.35);
    g.stroke();
  } else if (mood === M_DIZZY) {
    g.beginPath();
    g.moveTo(cx - w, y);
    g.quadraticCurveTo(cx - w * 0.5, y - s * 0.5, cx, y);
    g.quadraticCurveTo(cx + w * 0.5, y + s * 0.5, cx + w, y);
    g.stroke();
  } else if (mood === M_SLEEP) {
    ell(g, cx, y + s * 0.15, s * 0.28, s * 0.22);
    ink(g, '#8c2f2f', s * 0.16);
  } else {
    g.beginPath();
    g.moveTo(cx - w * 0.75, y - s * 0.1);
    g.quadraticCurveTo(cx, y + s * (mood === M_HAPPY ? 1.3 : 0.8), cx + w * 0.75, y - s * 0.1);
    if (mood === M_HAPPY) (g.closePath(), ink(g, '#8c2f2f', s * 0.24));
    else g.stroke();
  }
}

/** 도깨비 몸 색 (탑마다 · 세 가지) */
const IMP_COL = [
  [['#8fdc6a', '#c9f5a6', '#5aa83c'], ['#7fd4a0', '#c2f2d4', '#46a06e'], ['#b4e05a', '#e2f7a8', '#7fae2c']],
  [['#ffab5c', '#ffd8a8', '#d9772c'], ['#ff8f7a', '#ffc9bd', '#d65a48'], ['#ffc94a', '#ffe7a0', '#d99a1c']],
  [['#a98cf5', '#d8c9ff', '#7558cf'], ['#7fb2ff', '#c7dcff', '#4a7ed6'], ['#e48cf0', '#f5c9fa', '#b45ac2']],
];
/** 몬스터 그리기 (단위: 몸 반지름 = 1, 발 가운데 = (0,0), 위가 -y) */
const PAINT: Record<K, (g: C2, mood: number, v: number, c: number) => void> = {
  imp(g, mood, v, c) {
    const [base, lt, dk] = IMP_COL[v][c % 3];
    // 발
    for (const sd of [-1, 1]) ell(g, sd * 0.45, -0.1, 0.32, 0.2), ink(g, dk);
    // 팔 (떨어질 땐 만세)
    const up = mood === M_FALL;
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.78, -0.95);
      g.quadraticCurveTo(sd * (up ? 1.25 : 1.15), up ? -1.75 : -0.75, sd * (up ? 1.05 : 1.05), up ? -2.15 : -0.45);
      g.lineWidth = 0.36;
      g.strokeStyle = OUT;
      g.stroke();
      g.lineWidth = 0.2;
      g.strokeStyle = base;
      g.stroke();
    }
    // 몸
    g.beginPath();
    g.moveTo(-0.95, -0.55);
    g.bezierCurveTo(-1.05, -1.75, -0.6, -2.2, 0, -2.2);
    g.bezierCurveTo(0.6, -2.2, 1.05, -1.75, 0.95, -0.55);
    g.bezierCurveTo(0.9, -0.12, -0.9, -0.12, -0.95, -0.55);
    ink(g, lin(g, 0, -2.2, 0, -0.1, [0, lt], [0.45, base], [1, dk]));
    ell(g, 0, -0.75, 0.55, 0.38);
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.fill();
    shine(g, -0.45, -1.75, 0.22, 0.14);
    // 머리 장식: 요리사 모자 · 상자 투구 · 마법사 모자 (+ 뿔 하나)
    if (v === 0) {
      ell(g, -0.12, -2.05, 0.12, 0.18, -0.3);
      ink(g, '#ffe9a8', 0.07);
      g.beginPath();
      g.moveTo(-0.5, -2.05);
      g.lineTo(0.5, -2.05);
      g.lineTo(0.44, -2.35);
      g.lineTo(-0.44, -2.35);
      g.closePath();
      ink(g, '#ffffff', 0.08);
      for (const [dx, r] of [[-0.35, 0.3], [0.05, 0.36], [0.4, 0.28]]) ell(g, dx, -2.55, r, r * 0.9), ink(g, '#ffffff', 0.08);
    } else if (v === 1) {
      g.beginPath();
      g.moveTo(-0.72, -1.95);
      g.lineTo(0.72, -1.95);
      g.lineTo(0.62, -2.6);
      g.lineTo(-0.62, -2.6);
      g.closePath();
      ink(g, lin(g, 0, -2.6, 0, -1.95, [0, '#e8c48a'], [1, '#c99a5c']), 0.08);
      g.strokeStyle = '#9a6e3a';
      g.lineWidth = 0.08;
      g.beginPath();
      g.moveTo(0, -2.6);
      g.lineTo(0, -1.95);
      g.stroke();
      g.fillStyle = '#ff5a4e';
      rr(g, -0.2, -2.42, 0.4, 0.14, 0.05);
      g.fill();
    } else {
      g.beginPath();
      g.moveTo(-0.75, -1.95);
      g.quadraticCurveTo(0.05, -2.2, 0.75, -1.95);
      g.lineTo(0.25, -3.1);
      g.quadraticCurveTo(0.55, -3.25, 0.62, -3.4);
      g.lineTo(-0.1, -3.05);
      g.closePath();
      ink(g, lin(g, 0, -3.3, 0, -1.95, [0, '#5b4bb8'], [1, '#3a2c86']), 0.08);
      g.fillStyle = '#ffe36b';
      starPath(g, 0.05, -2.45, 0.16);
      g.fill();
    }
    face(g, 0, -1.35, 0.36, 0.25, mood, 0.42);
    if (mood === M_IDLE || mood === M_HAPPY || mood === M_SLEEP) blush(g, 0, -1.02, 0.62, 0.15);
  },
  bear(g, mood) {
    for (const sd of [-1, 1]) ell(g, sd * 0.5, -0.12, 0.36, 0.22), ink(g, '#7a4a22');
    for (const sd of [-1, 1]) ell(g, sd * 0.68, -2.0, 0.3, 0.3), ink(g, '#b57a44'), ell(g, sd * 0.68, -2.0, 0.15, 0.15), (g.fillStyle = '#f0b9a0'), g.fill();
    g.beginPath();
    g.moveTo(-1.0, -0.5);
    g.bezierCurveTo(-1.15, -1.9, -0.65, -2.25, 0, -2.25);
    g.bezierCurveTo(0.65, -2.25, 1.15, -1.9, 1.0, -0.5);
    g.bezierCurveTo(0.92, -0.08, -0.92, -0.08, -1.0, -0.5);
    ink(g, lin(g, 0, -2.25, 0, -0.1, [0, '#e2a56a'], [0.5, '#c98a50'], [1, '#9a6232']));
    ell(g, 0, -0.85, 0.6, 0.48);
    ink(g, '#f3d2a8', 0.06);
    shine(g, -0.5, -1.8, 0.22, 0.14);
    for (const sd of [-1, 1]) {
      ell(g, sd * 0.95, -0.95, 0.24, 0.34, sd * 0.3);
      ink(g, '#b57a44', 0.08);
    }
    ell(g, 0, -1.25, 0.34, 0.24);
    ink(g, '#f3d2a8', 0.06);
    ell(g, 0, -1.36, 0.12, 0.08);
    g.fillStyle = '#3a2216';
    g.fill();
    face(g, 0, -1.6, 0.34, 0.2, mood, 0.32);
  },
  bat(g, mood) {
    // 풍선처럼 부푼 박쥐: 아래 매듭과 실 · 박쥐 날개
    g.strokeStyle = 'rgba(75,48,32,.7)';
    g.lineWidth = 0.06;
    g.beginPath();
    g.moveTo(0, -0.2);
    g.quadraticCurveTo(0.2, 0.25, -0.05, 0.6);
    g.stroke();
    g.beginPath();
    g.moveTo(-0.15, -0.28);
    g.lineTo(0.15, -0.28);
    g.lineTo(0, -0.5);
    g.closePath();
    ink(g, '#d0609e', 0.06);
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.7, -1.4);
      g.quadraticCurveTo(sd * 1.6, -2.0, sd * 1.95, -1.5);
      g.quadraticCurveTo(sd * 1.6, -1.35, sd * 1.65, -1.05);
      g.quadraticCurveTo(sd * 1.3, -1.2, sd * 1.2, -0.9);
      g.quadraticCurveTo(sd * 0.95, -1.1, sd * 0.7, -1.0);
      g.closePath();
      ink(g, '#8a5fb8', 0.08);
    }
    ell(g, 0, -1.3, 0.92, 0.88);
    ink(g, radg(g, -0.3, -1.65, 0.1, 1.1, [0, '#ffd0ec'], [0.5, '#f28cc8'], [1, '#c8569a']));
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.35, -2.0);
      g.lineTo(sd * 0.55, -2.45);
      g.lineTo(sd * 0.7, -1.9);
      g.closePath();
      ink(g, '#e070b0', 0.07);
    }
    shine(g, -0.4, -1.75, 0.25, 0.16);
    face(g, 0, -1.35, 0.32, 0.2, mood === M_IDLE ? M_SLEEP : mood, 0.3);
    if (mood !== M_FALL) {
      g.fillStyle = '#ffffff';
      for (const sd of [-1, 1]) {
        g.beginPath();
        g.moveTo(sd * 0.12, -1.05);
        g.lineTo(sd * 0.2, -0.88);
        g.lineTo(sd * 0.28, -1.05);
        g.fill();
      }
    }
  },
  mole(g, mood) {
    for (const sd of [-1, 1]) ell(g, sd * 0.55, -0.12, 0.38, 0.2), ink(g, '#f6b9c0');
    g.beginPath();
    g.moveTo(-1.0, -0.4);
    g.bezierCurveTo(-1.1, -1.85, -0.6, -2.2, 0, -2.2);
    g.bezierCurveTo(0.6, -2.2, 1.1, -1.85, 1.0, -0.4);
    g.bezierCurveTo(0.9, -0.05, -0.9, -0.05, -1.0, -0.4);
    ink(g, lin(g, 0, -2.2, 0, -0.1, [0, '#a88a78'], [0.5, '#8a6a58'], [1, '#62483a']));
    // 앞치마
    g.beginPath();
    g.moveTo(-0.55, -1.05);
    g.lineTo(0.55, -1.05);
    g.lineTo(0.65, -0.25);
    g.lineTo(-0.65, -0.25);
    g.closePath();
    ink(g, '#ffffff', 0.07);
    shine(g, -0.5, -1.8, 0.22, 0.14);
    // 요리사 모자
    g.beginPath();
    g.moveTo(-0.55, -2.05);
    g.lineTo(0.55, -2.05);
    g.lineTo(0.48, -2.4);
    g.lineTo(-0.48, -2.4);
    g.closePath();
    ink(g, '#ffffff', 0.07);
    for (const [dx, r] of [[-0.38, 0.32], [0.05, 0.4], [0.42, 0.3]]) ell(g, dx, -2.65, r, r * 0.9), ink(g, '#ffffff', 0.07);
    // 국자
    g.strokeStyle = '#8a8a96';
    g.lineWidth = 0.14;
    g.beginPath();
    g.moveTo(0.95, -0.7);
    g.lineTo(1.35, -2.0);
    g.stroke();
    ell(g, 1.35, -2.1, 0.22, 0.16);
    ink(g, '#c9ccd6', 0.06);
    // 분홍 코 · 작은 눈
    ell(g, 0, -1.25, 0.26, 0.2);
    ink(g, '#ff8fa6', 0.07);
    face(g, 0, -1.6, 0.3, 0.16, mood === M_IDLE ? M_HAPPY : mood, 0.55);
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) ell(g, sd * (0.95 + i * 0.08), -0.55 + i * 0.05, 0.08, 0.14, sd * 0.4), ink(g, '#ffe0e6', 0.04);
  },
  octo(g, mood) {
    for (let i = 0; i < 8; i++) {
      const a = -0.95 + (i / 7) * 1.9, x0 = Math.sin(a) * 0.75, sd = Math.sign(x0) || 1;
      g.beginPath();
      g.moveTo(x0 - 0.12, -0.7);
      g.quadraticCurveTo(x0 + sd * 0.4, -0.25, x0 + sd * 0.55 + Math.sin(i) * 0.1, -0.05);
      g.quadraticCurveTo(x0 + sd * 0.25, -0.12, x0 + 0.12, -0.65);
      g.closePath();
      ink(g, i % 2 ? '#e05a4e' : '#f0705c', 0.07);
    }
    ell(g, 0, -1.4, 1.0, 0.95);
    ink(g, radg(g, -0.35, -1.8, 0.1, 1.2, [0, '#ffb0a0'], [0.5, '#f0705c'], [1, '#c2443a']));
    for (const [dx, dy, r] of [[-0.55, -1.95, 0.12], [0.6, -1.7, 0.1], [0.3, -2.1, 0.08]] as [number, number, number][]) ell(g, dx, dy, r, r), (g.fillStyle = 'rgba(255,230,220,.7)'), g.fill();
    // 선장 모자
    g.beginPath();
    g.moveTo(-0.7, -2.15);
    g.quadraticCurveTo(0, -2.6, 0.7, -2.15);
    g.quadraticCurveTo(0, -2.05, -0.7, -2.15);
    ink(g, '#2f3b6e', 0.07);
    rr(g, -0.42, -2.75, 0.84, 0.45, 0.15);
    ink(g, '#3b4a86', 0.07);
    g.fillStyle = '#ffe36b';
    ell(g, 0, -2.5, 0.12, 0.12);
    g.fill();
    shine(g, -0.45, -1.85, 0.22, 0.14);
    face(g, 0, -1.35, 0.36, 0.22, mood, 0.38);
  },
  owl(g, mood) {
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.3, -0.1);
      g.lineTo(sd * 0.5, 0.02);
      g.lineTo(sd * 0.7, -0.1);
      g.lineWidth = 0.12;
      g.strokeStyle = '#e0a020';
      g.stroke();
    }
    g.beginPath();
    g.moveTo(-1.0, -0.4);
    g.bezierCurveTo(-1.1, -2.0, -0.6, -2.25, 0, -2.25);
    g.bezierCurveTo(0.6, -2.25, 1.1, -2.0, 1.0, -0.4);
    g.bezierCurveTo(0.9, -0.05, -0.9, -0.05, -1.0, -0.4);
    ink(g, lin(g, 0, -2.25, 0, -0.1, [0, '#c9a0e8'], [0.5, '#9a72c8'], [1, '#6a4a9a']));
    ell(g, 0, -0.85, 0.6, 0.5);
    ink(g, '#f0e2ff', 0.06);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) (g.beginPath(), g.arc(-0.25 + j * 0.5, -1.05 + i * 0.22, 0.12, 0.2, Math.PI - 0.2), (g.strokeStyle = '#b89ad8'), (g.lineWidth = 0.05), g.stroke());
    for (const sd of [-1, 1]) ell(g, sd * 0.38, -1.55, 0.36, 0.36), ink(g, '#ffffff', 0.07);
    face(g, 0, -1.55, 0.38, 0.27, mood, 0.4);
    g.beginPath();
    g.moveTo(-0.1, -1.38);
    g.lineTo(0.1, -1.38);
    g.lineTo(0, -1.15);
    g.closePath();
    ink(g, '#ffb02e', 0.05);
    // 마법사 모자
    g.beginPath();
    g.moveTo(-0.85, -2.05);
    g.quadraticCurveTo(0, -2.35, 0.85, -2.05);
    g.lineTo(0.2, -3.5);
    g.quadraticCurveTo(0.6, -3.6, 0.7, -3.8);
    g.lineTo(-0.15, -3.4);
    g.closePath();
    ink(g, lin(g, 0, -3.7, 0, -2.05, [0, '#3a3a9a'], [1, '#26266a']), 0.08);
    g.fillStyle = '#ffe36b';
    starPath(g, -0.1, -2.6, 0.2);
    g.fill();
    starPath(g, 0.3, -3.05, 0.11);
    g.fill();
    shine(g, -0.5, -1.95, 0.2, 0.12);
  },
};
/** 그림 틀(몸 반지름 배수) · 발 자리 */
const SW = 4.6, SH = 4.6, SOX = 2.3, SOY = 3.95;
const SPR = new Map<string, HTMLCanvasElement>();
const spriteKey = (k: K, mood: number, v: number, c: number, px: number) => `${k}:${mood}:${k === 'imp' ? v * 3 + (c % 3) : 0}:${Math.max(6, Math.round(px))}`;
function sprite(k: K, mood: number, v: number, c: number, px: number): HTMLCanvasElement {
  const q = Math.max(6, Math.round(px)), key = spriteKey(k, mood, v, c, px);
  let cv = SPR.get(key);
  if (!cv) {
    if (SPR.size > 360) SPR.clear();
    cv = layer(SW * q, SH * q, 1, (g) => {
      g.translate(SOX * q, SOY * q);
      g.scale(q, q);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      PAINT[k](g, mood, v, c);
    });
    SPR.set(key, cv);
  }
  return cv;
}
function warmSprite(k: K, mood: number, v: number, c: number, px: number) {
  if (SPR.has(spriteKey(k, mood, v, c, px))) return false;
  sprite(k, mood, v, c, px);
  return true;
}
function silhouette(k: K, v: number, px: number): HTMLCanvasElement {
  const q = Math.max(6, Math.round(px)), key = `${k}:sil:${v}:${q}`;
  let cv = SPR.get(key);
  if (!cv) {
    cv = layer(SW * q, SH * q, 1, (g) => {
      g.save();
      g.translate(SOX * q, SOY * q);
      g.scale(q, q);
      g.lineJoin = 'round';
      PAINT[k](g, M_IDLE, v, 0);
      g.restore();
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = '#c3ae8e';
      g.fillRect(0, 0, SW * q, SH * q);
    });
    SPR.set(key, cv);
  }
  return cv;
}
/** 스티커 찍기: (0,0) = 발 가운데, u = 화면에서 몸 반지름 px */
function stamp(ctx: C2, cv: HTMLCanvasElement, u: number) {
  ctx.drawImage(cv, -SOX * u, -SOY * u, SW * u, SH * u);
}

// ───────────────────────────── 너구리 · 손가락 · 보물 · 장 끝 선물 ─────────────────────────────
/** 꼬마 도둑 너구리. (x,y) = 발, k = 몸 크기 px(머리 반지름쯤), mood: 0 킥킥 · 1 깜짝(!) · 2 아야(어질) · 3 신남 · 4 미끄럼(사다리) · 5 으악(떨어짐) */
function drawRaccoon(ctx: C2, x: number, y: number, k: number, lv: number, t: number, mood: number, dir = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  const bob = mood === 3 ? -Math.abs(Math.sin(t * 0.3)) * k * 0.25 : Math.sin(t * 0.08) * k * 0.04;
  ctx.translate(0, bob);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const lw = Math.max(1.4, k * 0.09), O = '#3a2a24';
  const fillS = (f: string | CanvasGradient) => ((ctx.fillStyle = f), ctx.fill(), (ctx.strokeStyle = O), (ctx.lineWidth = lw), ctx.stroke());
  // 망토 (Lv5)
  if (lv >= 5) {
    ctx.beginPath();
    ctx.moveTo(-k * 0.55, -k * 1.55);
    ctx.quadraticCurveTo(-k * 1.25, -k * 0.6, -k * 0.95 + Math.sin(t * 0.1) * k * 0.1, -k * 0.05);
    ctx.lineTo(k * 0.5, -k * 0.2);
    ctx.lineTo(k * 0.45, -k * 1.5);
    ctx.closePath();
    fillS(lv >= 11 ? '#ffcf3a' : '#ff5a4e');
  }
  // 줄무늬 꼬리
  ctx.save();
  ctx.translate(-k * 0.55, -k * 0.45);
  ctx.rotate(-0.6 + Math.sin(t * 0.12) * 0.18);
  ell(ctx, -k * 0.55, 0, k * 0.62, k * 0.3);
  fillS('#9a9aa6');
  ctx.fillStyle = '#3a3440';
  for (const dx of [-0.25, -0.65, -1.0]) (ell(ctx, k * dx, 0, k * 0.1, k * 0.28), ctx.fill());
  ctx.restore();
  // 보따리 (Lv11 금빛)
  ell(ctx, -k * 0.62, -k * 1.05, k * 0.42, k * 0.4);
  fillS(lv >= 11 ? lin(ctx, 0, -k * 1.4, 0, -k * 0.7, [0, '#fff3a8'], [1, '#f5b921']) : '#e8d0a0');
  ctx.strokeStyle = O;
  ctx.lineWidth = lw * 0.7;
  ctx.beginPath();
  ctx.moveTo(-k * 0.78, -k * 1.38);
  ctx.lineTo(-k * 0.46, -k * 1.42);
  ctx.stroke();
  // 몸
  ctx.beginPath();
  ctx.moveTo(-k * 0.5, -k * 0.15);
  ctx.bezierCurveTo(-k * 0.65, -k * 1.0, -k * 0.35, -k * 1.35, 0, -k * 1.35);
  ctx.bezierCurveTo(k * 0.4, -k * 1.35, k * 0.62, -k * 1.0, k * 0.5, -k * 0.15);
  ctx.closePath();
  fillS(lin(ctx, 0, -k * 1.35, 0, 0, [0, '#b8b8c4'], [1, '#86869a']));
  ell(ctx, k * 0.05, -k * 0.6, k * 0.3, k * 0.35);
  ctx.fillStyle = '#e8e8f0';
  ctx.fill();
  // 발
  for (const sd of [-1, 1]) (ell(ctx, sd * k * 0.28, -k * 0.06, k * 0.2, k * 0.12), fillS('#3a3440'));
  // 팔
  const armUp = mood === 3 || mood === 5;
  ctx.strokeStyle = O;
  ctx.lineWidth = k * 0.22;
  ctx.beginPath();
  ctx.moveTo(k * 0.35, -k * 0.95);
  ctx.lineTo(k * 0.78, armUp ? -k * 1.75 : mood === 4 ? -k * 1.5 : -k * 0.75);
  ctx.stroke();
  ctx.strokeStyle = '#9a9aa6';
  ctx.lineWidth = k * 0.13;
  ctx.stroke();
  // 머리
  const hy = -k * 1.75;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * k * 0.35, hy - k * 0.45);
    ctx.lineTo(sd * k * 0.62, hy - k * 0.95);
    ctx.lineTo(sd * k * 0.75, hy - k * 0.3);
    ctx.closePath();
    fillS('#a6a6b4');
    ctx.beginPath();
    ctx.moveTo(sd * k * 0.45, hy - k * 0.45);
    ctx.lineTo(sd * k * 0.6, hy - k * 0.75);
    ctx.lineTo(sd * k * 0.66, hy - k * 0.42);
    ctx.closePath();
    ctx.fillStyle = '#ffb8c8';
    ctx.fill();
  }
  ell(ctx, 0, hy, k * 0.78, k * 0.62);
  fillS(lin(ctx, 0, hy - k * 0.6, 0, hy + k * 0.6, [0, '#c8c8d4'], [1, '#9a9aa8']));
  // 흰 얼굴 · 검은 가면(도둑)
  ell(ctx, k * 0.1, hy + k * 0.22, k * 0.42, k * 0.3);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-k * 0.72, hy - k * 0.1);
  ctx.quadraticCurveTo(0, hy - k * 0.42, k * 0.78, hy - k * 0.1);
  ctx.quadraticCurveTo(k * 0.8, hy + k * 0.18, k * 0.35, hy + k * 0.12);
  ctx.quadraticCurveTo(k * 0.05, hy - k * 0.02, -k * 0.25, hy + k * 0.12);
  ctx.quadraticCurveTo(-k * 0.7, hy + k * 0.18, -k * 0.72, hy - k * 0.1);
  ctx.fillStyle = '#2a2430';
  ctx.fill();
  // 눈
  for (const ex of [-0.25, 0.42]) {
    const xx = k * ex, yy = hy - k * 0.04;
    if (mood === 2) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = k * 0.07;
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const a = i * 0.8, q = k * (0.03 + i * 0.012);
        if (i) ctx.lineTo(xx + Math.cos(a) * q, yy + Math.sin(a) * q);
        else ctx.moveTo(xx + q, yy);
      }
      ctx.stroke();
    } else if (mood === 3 || mood === 0) {
      ell(ctx, xx, yy, k * 0.12, k * 0.14);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ell(ctx, xx + k * 0.03, yy + k * 0.02, k * 0.07, k * 0.09);
      ctx.fillStyle = '#1a1418';
      ctx.fill();
      ell(ctx, xx, yy - k * 0.03, k * 0.03, k * 0.03);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    } else {
      ell(ctx, xx, yy, k * 0.16, k * 0.18);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ell(ctx, xx, yy, k * 0.06, k * 0.07);
      ctx.fillStyle = '#1a1418';
      ctx.fill();
    }
  }
  // 고글 (Lv3)
  if (lv >= 3 && lv < 9) {
    ctx.strokeStyle = '#6a4a2a';
    ctx.lineWidth = k * 0.08;
    ctx.beginPath();
    ctx.moveTo(-k * 0.75, hy - k * 0.32);
    ctx.lineTo(k * 0.78, hy - k * 0.32);
    ctx.stroke();
    for (const ex of [-0.18, 0.35]) (ell(ctx, k * ex, hy - k * 0.42, k * 0.17, k * 0.13), fillS('#9fe8ff'));
  }
  // 코 · 입
  ell(ctx, k * 0.2, hy + k * 0.16, k * 0.1, k * 0.07);
  ctx.fillStyle = '#2a2430';
  ctx.fill();
  ctx.strokeStyle = '#2a2430';
  ctx.lineWidth = k * 0.06;
  ctx.beginPath();
  if (mood === 1 || mood === 5) (ell(ctx, k * 0.2, hy + k * 0.36, k * 0.09, k * 0.11), (ctx.fillStyle = '#8c2f2f'), ctx.fill());
  else if (mood === 2) (ctx.moveTo(k * 0.05, hy + k * 0.36), ctx.lineTo(k * 0.35, hy + k * 0.33), ctx.stroke());
  else (ctx.moveTo(k * 0.02, hy + k * 0.3), ctx.quadraticCurveTo(k * 0.2, hy + k * (mood === 3 ? 0.52 : 0.42), k * 0.4, hy + k * 0.28), ctx.stroke());
  // 왕관 (Lv9)
  if (lv >= 9) {
    const cy = hy - k * 0.58, c = k * 0.32;
    ctx.beginPath();
    ctx.moveTo(-c, cy);
    ctx.lineTo(-c * 1.1, cy - c * 0.95);
    ctx.lineTo(-c * 0.5, cy - c * 0.5);
    ctx.lineTo(0, cy - c * 1.2);
    ctx.lineTo(c * 0.5, cy - c * 0.5);
    ctx.lineTo(c * 1.1, cy - c * 0.95);
    ctx.lineTo(c, cy);
    ctx.closePath();
    fillS(lin(ctx, 0, cy - c * 1.2, 0, cy, [0, '#fff3a8'], [1, '#f5b921']));
  }
  ctx.restore();
}
/** 톡 할 곳을 가리키는 손가락 */
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.15);
  ctx.rotate(-0.35);
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(40,25,15,.22)';
  ell(ctx, k * 0.1, k * 0.95, k * 0.45, k * 0.14);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-k * 0.12, 0);
  ctx.quadraticCurveTo(-k * 0.13, -k * 0.62, 0, -k * 0.62);
  ctx.quadraticCurveTo(k * 0.13, -k * 0.62, k * 0.12, 0);
  ctx.lineTo(k * 0.12, k * 0.2);
  ctx.quadraticCurveTo(k * 0.5, k * 0.1, k * 0.48, k * 0.42);
  ctx.quadraticCurveTo(k * 0.45, k * 0.85, k * 0.05, k * 0.85);
  ctx.quadraticCurveTo(-k * 0.42, k * 0.85, -k * 0.38, k * 0.42);
  ctx.quadraticCurveTo(-k * 0.35, k * 0.18, -k * 0.12, k * 0.18);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.5, k * 0.07);
  ctx.stroke();
  ctx.restore();
}
/** 탑마다 보물 (판 번호) — 작은 그림 */
function drawLoot(ctx: C2, i: number, x: number, y: number, k: number, has = true) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1, k * 0.12);
  ctx.strokeStyle = has ? OUT : '#c3ae8e';
  const F = (c: string) => ((ctx.fillStyle = has ? c : '#e8dcc4'), ctx.fill(), ctx.stroke());
  const gold = has ? lin(ctx, 0, -k, 0, k, [0, '#fff3a8'], [1, '#f0a818']) : '#e8dcc4';
  switch (i) {
    case 0: // 황금 국자
      rr(ctx, -k * 0.12, -k * 0.95, k * 0.24, k * 1.2, k * 0.1), ((ctx.fillStyle = gold), ctx.fill(), ctx.stroke());
      ell(ctx, 0, k * 0.45, k * 0.55, k * 0.4), ((ctx.fillStyle = gold), ctx.fill(), ctx.stroke());
      break;
    case 1: // 은 접시
      ell(ctx, 0, k * 0.2, k * 0.95, k * 0.45), F('#e6eaf2');
      ell(ctx, 0, k * 0.15, k * 0.55, k * 0.22), F('#c9d0dc');
      break;
    case 2: // 꿀단지
      ell(ctx, 0, k * 0.25, k * 0.75, k * 0.65), F('#ffb02e');
      rr(ctx, -k * 0.5, -k * 0.7, k, k * 0.35, k * 0.1), F('#d9772c');
      break;
    case 3: case 7: case 11: { // 대장의 왕관
      ctx.beginPath();
      ctx.moveTo(-k, k * 0.5);
      ctx.lineTo(-k, -k * 0.4);
      ctx.lineTo(-k * 0.5, k * 0.05);
      ctx.lineTo(0, -k * 0.75);
      ctx.lineTo(k * 0.5, k * 0.05);
      ctx.lineTo(k, -k * 0.4);
      ctx.lineTo(k, k * 0.5);
      ctx.closePath();
      ctx.fillStyle = gold;
      ctx.fill();
      ctx.stroke();
      ell(ctx, 0, k * 0.15, k * 0.18, k * 0.18), F(i === 3 ? '#ff5a6e' : i === 7 ? '#ffffff' : '#7fb2ff');
      break;
    }
    case 4: // 태엽 로봇
      rr(ctx, -k * 0.6, -k * 0.5, k * 1.2, k * 1.1, k * 0.2), F('#9fd8ff');
      ell(ctx, -k * 0.25, -k * 0.05, k * 0.14, k * 0.14), F('#ffffff');
      ell(ctx, k * 0.25, -k * 0.05, k * 0.14, k * 0.14), F('#ffffff');
      rr(ctx, -k * 0.1, -k * 0.95, k * 0.2, k * 0.45, k * 0.05), F('#ffd84a');
      break;
    case 5: // 오리 잠수함
      ell(ctx, 0, k * 0.2, k * 0.95, k * 0.55), F('#ffd84a');
      ell(ctx, k * 0.35, -k * 0.35, k * 0.38, k * 0.35), F('#ffd84a');
      ell(ctx, -k * 0.25, k * 0.15, k * 0.2, k * 0.2), F('#9fe8ff');
      break;
    case 6: // 황금 팽이
      ctx.beginPath();
      ctx.moveTo(-k * 0.85, -k * 0.3);
      ctx.lineTo(k * 0.85, -k * 0.3);
      ctx.lineTo(0, k * 0.9);
      ctx.closePath();
      ctx.fillStyle = gold;
      ctx.fill();
      ctx.stroke();
      rr(ctx, -k * 0.12, -k * 0.85, k * 0.24, k * 0.55, k * 0.08), F('#ff5a4e');
      break;
    case 8: // 별똥별 지팡이
      rr(ctx, -k * 0.09, -k * 0.2, k * 0.18, k * 1.1, k * 0.08), F('#c98a50');
      starPath(ctx, 0, -k * 0.45, k * 0.6), ((ctx.fillStyle = gold), ctx.fill(), ctx.stroke());
      break;
    case 9: // 얼음 수정구
      ell(ctx, 0, -k * 0.1, k * 0.7, k * 0.7), F('#bff0ff');
      rr(ctx, -k * 0.55, k * 0.5, k * 1.1, k * 0.35, k * 0.1), F('#8a6a58');
      break;
    case 10: // 마법 주문서
      rr(ctx, -k * 0.75, -k * 0.6, k * 1.5, k * 1.2, k * 0.15), F('#fff1d6');
      starPath(ctx, 0, 0, k * 0.35), F('#a98cf5');
      break;
  }
  if (has) {
    ell(ctx, -k * 0.35, -k * 0.35, k * 0.15, k * 0.1, -0.6);
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fill();
  }
  ctx.restore();
}
/** 장 끝 선물(보물방의 큰 물건): ch 장 · i 왼쪽/오른쪽 · k 크기 px */
function drawPerk(ctx: C2, ch: number, i: number, x: number, y: number, k: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, k * 0.05);
  ctx.strokeStyle = OUT;
  const F = (c: string | CanvasGradient) => ((ctx.fillStyle = c), ctx.fill(), ctx.stroke());
  const bob = Math.sin(t * 0.08 + i) * k * 0.03;
  ctx.translate(0, bob);
  if (ch === 0 && i === 0) {
    // 모래주머니: 불룩한 자루 셋
    for (const [dx, dy, s] of [[-0.35, 0, 0.5], [0.35, 0, 0.5], [0, -0.45, 0.48]] as [number, number, number][]) {
      ell(ctx, dx * k, dy * k - k * 0.35, k * s, k * s * 0.72);
      F(lin(ctx, 0, (dy - 0.8) * k, 0, dy * k, [0, '#e8c48a'], [1, '#b8864a']));
      ctx.beginPath();
      ctx.moveTo(dx * k - k * 0.12, (dy - 0.68) * k);
      ctx.lineTo(dx * k + k * 0.12, (dy - 0.68) * k);
      ctx.stroke();
    }
    ctx.fillStyle = '#4b3020';
    ctx.font = `900 ${Math.round(k * 0.3)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('10t', 0, -k * 0.62);
  } else if (ch === 0) {
    // 미끄럼틀
    ctx.beginPath();
    ctx.moveTo(-k * 0.9, -k * 1.1);
    ctx.quadraticCurveTo(-k * 0.2, -k * 1.0, k * 0.2, -k * 0.35);
    ctx.quadraticCurveTo(k * 0.5, 0, k * 0.95, 0);
    ctx.lineTo(k * 0.95, -k * 0.2);
    ctx.quadraticCurveTo(k * 0.5, -k * 0.2, k * 0.05, -k * 0.6);
    ctx.quadraticCurveTo(-k * 0.3, -k * 1.25, -k * 0.9, -k * 1.32);
    ctx.closePath();
    F(lin(ctx, 0, -k * 1.3, 0, 0, [0, '#ff8fa6'], [1, '#e0506e']));
    rr(ctx, -k * 1.0, -k * 1.35, k * 0.18, k * 1.35, k * 0.05);
    F('#ffd84a');
    for (let j = 0; j < 4; j++) (ctx.beginPath(), ctx.moveTo(-k * 1.0, -k * 0.3 * j - k * 0.2), ctx.lineTo(-k * 0.82, -k * 0.3 * j - k * 0.2), ctx.stroke());
  } else if (i === 0) {
    // 폭죽 상자
    rr(ctx, -k * 0.8, -k * 0.85, k * 1.6, k * 0.85, k * 0.1);
    F(lin(ctx, 0, -k * 0.85, 0, 0, [0, '#ff7a5a'], [1, '#d6402e']));
    for (let j = 0; j < 4; j++) {
      const rx = -k * 0.55 + j * k * 0.37;
      rr(ctx, rx - k * 0.1, -k * 1.35 - (j % 2) * k * 0.15, k * 0.2, k * 0.55, k * 0.05);
      F(['#ffd84a', '#9fe8ff', '#b4f07a', '#ff9ecb'][j]);
    }
    starPath(ctx, 0, -k * 0.42, k * 0.22);
    F('#ffe36b');
  } else {
    // 쌍둥이 문
    for (const sd of [-1, 1]) {
      rr(ctx, sd * k * 0.5 - k * 0.38, -k * 1.2, k * 0.76, k * 1.2, k * 0.35);
      F(lin(ctx, 0, -k * 1.2, 0, 0, [0, '#d9a066'], [1, '#9a6232']));
      ell(ctx, sd * k * 0.5 + sd * k * 0.2, -k * 0.55, k * 0.07, k * 0.07);
      F('#ffd84a');
    }
  }
  ctx.restore();
}

// ───────────────────────────── 그리기: 탑 (판마다 한 장으로 미리 굽는다) ─────────────────────────────
interface Pal { stone: string; stone2: string; mortar: string; wood: string; wood2: string; woodDk: string; sky0: string; sky1: string }
const PALS: Pal[] = [
  { stone: '#d8c2a2', stone2: '#c6ad8a', mortar: '#a88e6c', wood: '#e0a866', wood2: '#c98a4c', woodDk: '#8a5a2e', sky0: '#8fd6f2', sky1: '#d8f2ff' },
  { stone: '#c9d2dc', stone2: '#b2bccb', mortar: '#8f9aab', wood: '#e8c27a', wood2: '#d2a456', woodDk: '#94682c', sky0: '#7fd0f0', sky1: '#e0f6ff' },
  { stone: '#b8b2d6', stone2: '#a29bc6', mortar: '#7e76a8', wood: '#c98a68', wood2: '#a86a4c', woodDk: '#6a3e2c', sky0: '#5a6ad0', sky1: '#a6b8f5' },
];
/** 방마다 벽지 (밝은 색 · 무늬 색) */
const WALLS: [string, string][] = [
  ['#ffe9c4', '#ffd9a0'], ['#ffd9c2', '#ffc4a4'], ['#fff0d0', '#f6dcae'], ['#ffd8b0', '#f5c08a'], ['#e9d6b8', '#d8c09a'],
  ['#d9f0e0', '#bfe4cc'], ['#dff0ff', '#c4e0fa'], ['#fff2b8', '#ffe28a'], ['#d2eef5', '#b2dcea'], ['#e4e6ee', '#cfd3e0'],
  ['#2c3470', '#3a4486'], ['#e9dcf5', '#d6c4ec'], ['#d8f0d8', '#bfe2c0'], ['#e4f6ff', '#c8ecfb'], ['#ffe0d8', '#f9c8bc'],
  ['#c9925a', '#a8703e'], ['#8fb0c8', '#6a8aa8'], ['#9a86c8', '#7462a8'],
];
const BAKE = new Map<string, { c: HTMLCanvasElement; y0: number }>();
/** 방 가구 (단위: 가로 폭 = 1, (x0,y0)~(x1,y1) = 방의 벽 영역) */
function decor(g: C2, room: number, x0: number, y0: number, x1: number, y1: number, ch: number) {
  const W2 = x1 - x0, H2 = y1 - y0, LWd = 0.004;
  const box = (x: number, y: number, w: number, h: number, c: string, r = 0.004) => (rr(g, x, y, w, h, r), ink(g, c, LWd));
  const circ = (x: number, y: number, r: number, c: string) => (ell(g, x, y, r, r), ink(g, c, LWd));
  const window = (x: number, y: number, w: number, h: number, night = false) => {
    rr(g, x - 0.008, y - 0.008, w + 0.016, h + 0.016, 0.02);
    ink(g, PALS[ch].wood2, LWd);
    rr(g, x, y, w, h, 0.014);
    g.fillStyle = night ? lin(g, 0, y, 0, y + h, [0, '#1c2458'], [1, '#3a4aa0']) : lin(g, 0, y, 0, y + h, [0, PALS[ch].sky0], [1, PALS[ch].sky1]);
    g.fill();
    if (night) for (let i = 0; i < 5; i++) (g.fillStyle = '#ffffff'), ell(g, x + w * hsh(i + room), y + h * hsh(i * 3 + room), 0.0025, 0.0025), g.fill();
    else (g.fillStyle = 'rgba(255,255,255,.9)'), ell(g, x + w * 0.35, y + h * 0.55, w * 0.22, h * 0.12), g.fill(), ell(g, x + w * 0.55, y + h * 0.5, w * 0.18, h * 0.14), g.fill();
    g.strokeStyle = PALS[ch].wood2;
    g.lineWidth = 0.006;
    g.beginPath();
    g.moveTo(x + w / 2, y);
    g.lineTo(x + w / 2, y + h);
    g.moveTo(x, y + h / 2);
    g.lineTo(x + w, y + h / 2);
    g.stroke();
  };
  const fy = y1; // 바닥 뒤쪽 가장자리
  switch (room) {
    case 0: // 다락 식료품방: 선반·항아리·마늘
      window(x0 + W2 * 0.62, y0 + H2 * 0.18, 0.12, 0.1);
      box(x0 + 0.04, y0 + H2 * 0.3, 0.3, 0.012, PALS[ch].wood2);
      for (let i = 0; i < 5; i++) box(x0 + 0.05 + i * 0.058, y0 + H2 * 0.3 - 0.045, 0.04, 0.045, ['#ffb02e', '#ff8a5c', '#9fd86a', '#ffd84a', '#ff9ecb'][i], 0.01);
      for (let i = 0; i < 4; i++) circ(x0 + W2 * 0.86 + (i % 2) * 0.02, y0 + H2 * 0.2 + i * 0.03, 0.016, '#fff6e0');
      box(x0 + W2 * 0.4, fy - 0.07, 0.07, 0.07, '#d8b070', 0.02);
      box(x0 + W2 * 0.47, fy - 0.055, 0.06, 0.055, '#c9a060', 0.02);
      break;
    case 1: // 부엌: 화덕 · 냄비 · 걸린 프라이팬
      box(x0 + W2 * 0.07, fy - 0.12, 0.17, 0.12, '#b8b0a8', 0.01);
      box(x0 + W2 * 0.09, fy - 0.08, 0.13, 0.05, '#4a3a34', 0.008);
      g.fillStyle = radg(g, x0 + W2 * 0.155, fy - 0.055, 0, 0.05, [0, '#ffe36b'], [1, 'rgba(255,90,40,0)']);
      g.fillRect(x0 + W2 * 0.09, fy - 0.08, 0.13, 0.05);
      ell(g, x0 + W2 * 0.155, fy - 0.135, 0.06, 0.03);
      ink(g, '#6a6a78', LWd);
      for (let i = 0; i < 3; i++) circ(x0 + W2 * (0.45 + i * 0.09), y0 + H2 * 0.25, 0.03, ['#3a3a44', '#c98a4c', '#3a3a44'][i]);
      window(x0 + W2 * 0.75, y0 + H2 * 0.2, 0.13, 0.1);
      break;
    case 2: // 식당: 긴 식탁 · 촛대 · 액자
      box(x0 + W2 * 0.3, fy - 0.06, 0.32, 0.018, PALS[ch].wood2);
      for (const dx of [0.33, 0.58]) box(x0 + W2 * dx, fy - 0.045, 0.012, 0.045, PALS[ch].woodDk, 0.002);
      for (const dx of [0.4, 0.5]) (box(x0 + W2 * dx, fy - 0.09, 0.008, 0.03, '#fff6e0', 0.002), circ(x0 + W2 * dx + 0.004, fy - 0.095, 0.006, '#ffd84a'));
      box(x0 + W2 * 0.1, y0 + H2 * 0.2, 0.12, 0.09, '#ffd84a', 0.008);
      box(x0 + W2 * 0.115, y0 + H2 * 0.22, 0.09, 0.06, '#9fd8ff', 0.004);
      window(x0 + W2 * 0.78, y0 + H2 * 0.18, 0.11, 0.1);
      break;
    case 3: // 빵 굽는 방: 벽돌 화덕 · 빵
      g.beginPath();
      g.moveTo(x0 + W2 * 0.55, fy);
      g.lineTo(x0 + W2 * 0.55, fy - 0.1);
      g.quadraticCurveTo(x0 + W2 * 0.68, fy - 0.2, x0 + W2 * 0.81, fy - 0.1);
      g.lineTo(x0 + W2 * 0.81, fy);
      g.closePath();
      ink(g, '#d0704e', LWd);
      g.beginPath();
      g.moveTo(x0 + W2 * 0.61, fy);
      g.lineTo(x0 + W2 * 0.61, fy - 0.06);
      g.quadraticCurveTo(x0 + W2 * 0.68, fy - 0.11, x0 + W2 * 0.75, fy - 0.06);
      g.lineTo(x0 + W2 * 0.75, fy);
      g.closePath();
      g.fillStyle = radg(g, x0 + W2 * 0.68, fy - 0.02, 0, 0.07, [0, '#ffe36b'], [0.6, '#ff7a30'], [1, '#5a2a1a']);
      g.fill();
      for (let i = 0; i < 3; i++) (ell(g, x0 + W2 * (0.12 + i * 0.07), y0 + H2 * 0.32, 0.026, 0.014), ink(g, '#e8a850', LWd));
      box(x0 + W2 * 0.08, y0 + H2 * 0.36, 0.24, 0.01, PALS[ch].wood2);
      break;
    case 4: // 지하 술통방: 술통 · 등불
      for (let i = 0; i < 3; i++) {
        const bx = x0 + W2 * (0.12 + i * 0.1), by = fy - 0.055;
        ell(g, bx, by, 0.04, 0.055);
        ink(g, lin(g, bx - 0.04, 0, bx + 0.04, 0, [0, '#a86a3a'], [0.5, '#d29a5c'], [1, '#a86a3a']), LWd);
        g.strokeStyle = '#6a6a78';
        g.lineWidth = 0.005;
        g.beginPath();
        g.moveTo(bx - 0.035, by - 0.03);
        g.lineTo(bx + 0.035, by - 0.03);
        g.moveTo(bx - 0.035, by + 0.03);
        g.lineTo(bx + 0.035, by + 0.03);
        g.stroke();
      }
      circ(x0 + W2 * 0.7, y0 + H2 * 0.3, 0.02, '#ffd84a');
      break;
    case 5: // 상자 창고
      for (const [dx, dy, s2] of [[0.06, 0, 0.08], [0.15, 0, 0.07], [0.1, 1, 0.065], [0.7, 0, 0.09], [0.8, 0, 0.07]] as [number, number, number][]) {
        const bx = x0 + W2 * dx, by = fy - s2 * (dy + 1) - 0.002 * dy;
        box(bx, by, s2, s2, '#e8c48a', 0.004);
        g.strokeStyle = '#b08a52';
        g.lineWidth = 0.004;
        g.beginPath();
        g.moveTo(bx, by);
        g.lineTo(bx + s2, by + s2);
        g.moveTo(bx + s2, by);
        g.lineTo(bx, by + s2);
        g.stroke();
      }
      window(x0 + W2 * 0.42, y0 + H2 * 0.18, 0.12, 0.1);
      break;
    case 6: // 장난감 방: 블록 · 공 · 별 벽지
      for (let i = 0; i < 4; i++) box(x0 + W2 * (0.08 + i * 0.05), fy - 0.045, 0.04, 0.045, ['#ff5a4e', '#ffd84a', '#5ad1ff', '#7fdc5c'][i], 0.006);
      box(x0 + W2 * 0.105, fy - 0.09, 0.04, 0.045, '#ff9ecb', 0.006);
      circ(x0 + W2 * 0.78, fy - 0.035, 0.035, '#ff8a3d');
      g.fillStyle = 'rgba(255,255,255,.7)';
      for (let i = 0; i < 6; i++) (starPath(g, x0 + W2 * (0.3 + i * 0.1), y0 + H2 * (0.2 + (i % 2) * 0.15), 0.012), g.fill());
      break;
    case 7: // 놀이방: 무지개 · 공
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.arc(x0 + W2 * 0.5, fy + 0.02, 0.2 - i * 0.025, Math.PI, 0);
        g.strokeStyle = ['#ff5a4e', '#ffb02e', '#ffe36b', '#7fdc5c', '#5ad1ff'][i];
        g.lineWidth = 0.022;
        g.stroke();
      }
      for (let i = 0; i < 5; i++) circ(x0 + W2 * (0.08 + i * 0.04), fy - 0.02, 0.016, ['#ff5a4e', '#5ad1ff', '#ffd84a', '#7fdc5c', '#ff9ecb'][i]);
      break;
    case 8: // 물탱크실: 파이프 · 계기판
      g.strokeStyle = '#8a96aa';
      g.lineWidth = 0.018;
      g.beginPath();
      g.moveTo(x0, y0 + H2 * 0.3);
      g.lineTo(x0 + W2 * 0.3, y0 + H2 * 0.3);
      g.lineTo(x0 + W2 * 0.3, fy - 0.02);
      g.moveTo(x1, y0 + H2 * 0.22);
      g.lineTo(x0 + W2 * 0.72, y0 + H2 * 0.22);
      g.stroke();
      circ(x0 + W2 * 0.52, y0 + H2 * 0.3, 0.03, '#ffffff');
      g.strokeStyle = '#ff5a4e';
      g.lineWidth = 0.005;
      g.beginPath();
      g.moveTo(x0 + W2 * 0.52, y0 + H2 * 0.3);
      g.lineTo(x0 + W2 * 0.54, y0 + H2 * 0.27);
      g.stroke();
      break;
    case 9: // 공장: 톱니바퀴
      for (const [dx, dy, r] of [[0.15, 0.3, 0.05], [0.24, 0.42, 0.035], [0.82, 0.28, 0.045]] as [number, number, number][]) {
        burstPath(g, x0 + W2 * dx, y0 + H2 * dy, r, 8, 0.78);
        ink(g, '#b8c0cc', LWd);
        circ(x0 + W2 * dx, y0 + H2 * dy, r * 0.35, '#8a96aa');
      }
      window(x0 + W2 * 0.48, y0 + H2 * 0.16, 0.12, 0.1);
      break;
    case 10: // 별 관측실: 둥근 밤 창 · 망원경
      ell(g, x0 + W2 * 0.68, y0 + H2 * 0.42, 0.09, 0.09);
      ink(g, lin(g, 0, y0, 0, y0 + H2 * 0.6, [0, '#1c2458'], [1, '#4a5ac0']), LWd);
      g.fillStyle = '#ffffff';
      for (let i = 0; i < 7; i++) (ell(g, x0 + W2 * 0.68 + (hsh(i) - 0.5) * 0.14, y0 + H2 * 0.42 + (hsh(i + 9) - 0.5) * 0.14, 0.003, 0.003), g.fill());
      g.fillStyle = '#ffe36b';
      for (let i = 0; i < 8; i++) (starPath(g, x0 + W2 * (0.05 + hsh(i + 3) * 0.4), y0 + H2 * (0.15 + hsh(i + 7) * 0.5), 0.008), g.fill());
      g.save();
      g.translate(x0 + W2 * 0.2, fy - 0.08);
      g.rotate(-0.5);
      box(-0.01, -0.012, 0.11, 0.026, '#c98a50', 0.01);
      g.restore();
      break;
    case 11: // 도서관: 벽 책장
      for (let j = 0; j < 2; j++) {
        const sx = x0 + W2 * (j ? 0.7 : 0.08), sw = W2 * 0.22;
        box(sx, y0 + H2 * 0.15, sw, H2 * 0.7, PALS[ch].woodDk, 0.004);
        for (let r2 = 0; r2 < 3; r2++)
          for (let b = 0; b < 7; b++) {
            g.fillStyle = ['#ff5a4e', '#5ad1ff', '#ffd84a', '#7fdc5c', '#ff9ecb', '#a98cf5', '#ffb02e'][(b + r2 * 3 + j) % 7];
            g.fillRect(sx + 0.006 + b * (sw - 0.012) / 7, y0 + H2 * (0.18 + r2 * 0.22), (sw - 0.012) / 7 - 0.002, H2 * 0.17);
          }
      }
      break;
    case 12: // 물약방: 가마솥 · 병
      ell(g, x0 + W2 * 0.75, fy - 0.045, 0.07, 0.05);
      ink(g, '#3a3a44', LWd);
      ell(g, x0 + W2 * 0.75, fy - 0.08, 0.06, 0.015);
      ink(g, '#7fdc5c', LWd);
      box(x0 + W2 * 0.06, y0 + H2 * 0.36, 0.26, 0.01, PALS[ch].wood2);
      for (let i = 0; i < 5; i++) (ell(g, x0 + W2 * (0.09 + i * 0.05), y0 + H2 * 0.36 - 0.022, 0.016, 0.02), ink(g, ['#ff5a6e', '#5ad1ff', '#b4f07a', '#ffd84a', '#c39af5'][i], LWd));
      break;
    case 13: // 얼음방: 고드름 · 서리
      g.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = 0; i < 12; i++) {
        const ix = x0 + W2 * (0.04 + i * 0.08);
        g.beginPath();
        g.moveTo(ix - 0.012, y0);
        g.lineTo(ix + 0.012, y0);
        g.lineTo(ix, y0 + 0.03 + hsh(i) * 0.03);
        g.closePath();
        g.fill();
      }
      for (let i = 0; i < 6; i++) (starPath(g, x0 + W2 * (0.1 + hsh(i + 2) * 0.8), y0 + H2 * (0.3 + hsh(i + 5) * 0.4), 0.012, 0.3), (g.fillStyle = 'rgba(255,255,255,.7)'), g.fill());
      break;
    case 14: // 폭죽 창고: 로켓
      for (let i = 0; i < 4; i++) {
        const rx = x0 + W2 * (0.06 + i * 0.05);
        box(rx, fy - 0.1, 0.03, 0.1, ['#ff5a4e', '#5ad1ff', '#ffd84a', '#b4f07a'][i], 0.004);
        g.beginPath();
        g.moveTo(rx - 0.004, fy - 0.1);
        g.lineTo(rx + 0.015, fy - 0.13);
        g.lineTo(rx + 0.034, fy - 0.1);
        g.closePath();
        ink(g, '#fff6e0', LWd);
      }
      window(x0 + W2 * 0.7, y0 + H2 * 0.18, 0.12, 0.1, true);
      break;
    default: { // 보물방: 금화 더미 · 횃불 · 보물 상자 자리
      for (let i = 0; i < 18; i++) (ell(g, x0 + W2 * (0.55 + hsh(i) * 0.4), fy - 0.004 - hsh(i + 30) * 0.02, 0.014, 0.008), ink(g, '#ffd23f', 0.003));
      for (const dx of [0.12, 0.9]) {
        box(x0 + W2 * dx, y0 + H2 * 0.28, 0.012, 0.05, PALS[ch].woodDk, 0.002);
        g.fillStyle = radg(g, x0 + W2 * dx + 0.006, y0 + H2 * 0.25, 0, 0.06, [0, 'rgba(255,220,120,.9)'], [1, 'rgba(255,160,60,0)']);
        g.fillRect(x0 + W2 * dx - 0.06, y0 + H2 * 0.25 - 0.06, 0.13, 0.12);
      }
    }
  }
}
function bakeTower(s: TrapState, w: number, sc: number) {
  const d = STAGES[s.stage], ch = d.ch, P = PALS[ch], key = `${s.stage}:${Math.round(w)}:${sc}`;
  const hit = BAKE.get(key);
  if (hit) return hit;
  if (BAKE.size > 3) BAKE.clear();
  const nf = d.floors.length + 1, y0 = FY(0) - FH - 0.3, y1 = FY(nf - 1) + 0.75;
  const c = layer(w, (y1 - y0) * w, sc, (g) => {
    g.scale(w, w);
    g.translate(0, -y0);
    g.lineJoin = 'round';
    // 바깥 하늘 · 흙
    g.fillStyle = lin(g, 0, y0, 0, FY(0) - FH, [0, P.sky0], [1, P.sky1]);
    g.fillRect(0, y0, 1, FY(0) - FH - y0 + 0.05);
    g.fillStyle = lin(g, 0, FY(nf - 1), 0, y1, [0, '#8a5a3a'], [1, '#5a3a28']);
    g.fillRect(0, FY(nf - 1), 1, y1 - FY(nf - 1));
    for (let i = 0; i < 40; i++) (ell(g, hsh(i) * 1, FY(nf - 1) + 0.08 + hsh(i + 50) * 0.6, 0.01 + hsh(i + 9) * 0.02, 0.008 + hsh(i + 3) * 0.012), (g.fillStyle = i % 7 ? 'rgba(60,35,20,.35)' : '#7fe0ff'), g.fill());
    for (let k = 0; k < nf; k++) {
      const vault = k === nf - 1, room = vault ? 15 + ch : d.floors[k].room, [wa, wb] = WALLS[room];
      const top = k === 0 ? FY(0) - FH + 0.02 : FY(k - 1) + TH, bot = FY(k) - DEP;
      // 벽지 + 무늬
      g.fillStyle = lin(g, 0, top, 0, bot, [0, wa], [1, wb]);
      g.fillRect(0.02, top, 0.96, bot - top + 0.002);
      g.fillStyle = 'rgba(255,255,255,.18)';
      if (room % 3 === 0) for (let x = 0.06; x < 1; x += 0.08) g.fillRect(x, top, 0.025, bot - top);
      else if (room % 3 === 1) for (let i = 0; i < 26; i++) (ell(g, 0.05 + (i % 9) * 0.11 + ((i / 9) | 0) % 2 * 0.055, top + 0.03 + ((i / 9) | 0) * 0.08, 0.007, 0.007), g.fill());
      else for (let y = top + 0.03; y < bot; y += 0.06) g.fillRect(0.02, y, 0.96, 0.008);
      // 천장 그늘 · 바닥 쪽 그늘
      g.fillStyle = lin(g, 0, top, 0, top + 0.05, [0, 'rgba(60,35,20,.28)'], [1, 'rgba(60,35,20,0)']);
      g.fillRect(0.02, top, 0.96, 0.05);
      decor(g, room, WL, top, WR, bot, ch);
      if (k === 0) {
        // 다락 지붕 서까래
        g.strokeStyle = P.woodDk;
        g.lineWidth = 0.014;
        for (let x = 0.12; x < 1; x += 0.2) (g.beginPath(), g.moveTo(x, top), g.lineTo(x + 0.06, top + 0.045), g.stroke());
      }
      // 오른쪽 벽의 문 (몬스터가 들어오는 곳)
      if (!vault || d.boss) {
        rr(g, WR - 0.035, bot - 0.11, 0.07, 0.115, 0.03);
        ink(g, '#3a2418', 0.004);
        rr(g, WR - 0.03, bot - 0.105, 0.03, 0.105, 0.012);
        ink(g, P.wood2, 0.003);
      }
      // 바닥: 윗면(3/4 시점) — 칸마다 함정문 판자와 고리
      const fy = FY(k);
      if (vault) {
        g.fillStyle = lin(g, 0, fy - DEP, 0, fy, [0, P.stone2], [1, P.stone]);
        g.fillRect(0.02, fy - DEP, 0.96, DEP);
        g.fillStyle = lin(g, 0, fy, 0, fy + TH, [0, P.mortar], [1, P.stone2]);
        g.fillRect(0, fy, 1, TH);
      } else {
        g.fillStyle = lin(g, 0, fy - DEP, 0, fy, [0, P.wood2], [1, P.wood]);
        g.fillRect(WL - 0.07, fy - DEP, WR - WL + 0.08, DEP);
        g.strokeStyle = 'rgba(90,55,25,.55)';
        g.lineWidth = 0.003;
        for (let i = 0; i <= NT; i++) {
          const x = WL + i * TW, xb = 0.5 + (x - 0.5) * 0.93;
          g.beginPath();
          g.moveTo(xb, fy - DEP);
          g.lineTo(x, fy);
          g.stroke();
        }
        for (let j = 1; j < 3; j++) (g.beginPath(), g.moveTo(WL - 0.07, fy - DEP + (DEP * j) / 3), g.lineTo(WR, fy - DEP + (DEP * j) / 3), (g.strokeStyle = 'rgba(90,55,25,.2)'), g.stroke());
        for (let i = 0; i < NT; i++) (ell(g, tileX(i), fy - DEP * 0.45, 0.009, 0.005), (g.strokeStyle = '#8a6a3a'), (g.lineWidth = 0.003), g.stroke());
        // 앞면(두께): 들보 + 못
        g.fillStyle = lin(g, 0, fy, 0, fy + TH, [0, P.woodDk], [1, '#4a2e18']);
        g.fillRect(0.0, fy, 1, TH);
        g.fillStyle = 'rgba(255,230,190,.25)';
        g.fillRect(0, fy, 1, 0.005);
        g.fillStyle = 'rgba(30,18,8,.5)';
        for (let i = 0; i <= NT; i++) g.fillRect(WL + i * TW - 0.001, fy + 0.004, 0.002, TH - 0.008);
        for (let i = 0; i < NT * 2; i++) (ell(g, WL + (i + 0.5) * TW * 0.5, fy + TH * 0.5, 0.003, 0.003), (g.fillStyle = '#c9b08a'), g.fill());
      }
      // 너구리 선반 (사다리 곁)
      if (!vault) {
        const py = fy - PERCH_H;
        rr(g, 0.018, py, 0.1, 0.014, 0.004);
        ink(g, P.wood2, 0.003);
        g.strokeStyle = P.woodDk;
        g.lineWidth = 0.006;
        g.beginPath();
        g.moveTo(0.03, py + 0.014);
        g.lineTo(0.025, py + 0.05);
        g.stroke();
      }
    }
    // 바깥 돌벽 (양쪽)
    for (const [xa, xb] of [[0, 0.022], [WR + 0.002, 1]] as [number, number][]) {
      g.fillStyle = P.stone;
      g.fillRect(xa, FY(0) - FH, xb - xa, FY(nf - 1) - FY(0) + FH + TH);
      for (let y = FY(0) - FH; y < FY(nf - 1) + TH; y += 0.04) {
        const off = ((Math.round(y / 0.04) % 2) * 0.02);
        g.fillStyle = P.stone2;
        for (let x = xa - off; x < xb; x += 0.04) (rr(g, Math.max(xa, x) + 0.002, y + 0.002, Math.min(0.036, xb - Math.max(xa, x) - 0.004), 0.036, 0.006), g.fill());
      }
    }
    // 사다리 (꼭대기부터 맨 아래층까지)
    const ly0 = FY(0) - FH + 0.04, ly1 = FY(nf - 1) - 0.01;
    g.strokeStyle = P.woodDk;
    g.lineWidth = 0.008;
    for (const x of [0.034, 0.078]) (g.beginPath(), g.moveTo(x, ly0), g.lineTo(x, ly1), g.stroke());
    g.lineWidth = 0.006;
    g.strokeStyle = P.wood2;
    for (let y = ly0 + 0.02; y < ly1; y += 0.04) (g.beginPath(), g.moveTo(0.034, y), g.lineTo(0.078, y), g.stroke());
    // 지붕 (맨 위)
    g.beginPath();
    g.moveTo(-0.05, FY(0) - FH + 0.03);
    g.lineTo(0.5, FY(0) - FH - 0.26);
    g.lineTo(1.05, FY(0) - FH + 0.03);
    g.closePath();
    ink(g, lin(g, 0, FY(0) - FH - 0.26, 0, FY(0) - FH, [0, '#ff7a5a'], [1, '#d6402e']), 0.006);
  });
  const out = { c, y0 };
  BAKE.set(key, out);
  return out;
}

// ───────────────────────────── 그리기: 장면 ─────────────────────────────
/** 몬스터는 판정보다 조금 크게 그린다 (손가락보다 크게 보이게) */
const VIS = 1.54;
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/** 터질 때 색종이 색 */
const KCOL: Record<K, string> = { imp: '#9fe05c', bear: '#d9a066', bat: '#f28cc8', mole: '#a88a78', octo: '#f0705c', owl: '#c9a0e8' };
const VCOL = ['#9fe05c', '#ffab5c', '#a98cf5'];
const STAR_WORDS = (s: TrapState) => ["보물방 닿기", "하트 안 잃기", `두 층 와르르 ${STAGES[s.stage].n}마리`];
const recent = new WeakMap<object, { x: number; y: number; t: number; size: number }[]>();
/** 처음 쓰는 순간 끊기지 않게 미리 불러 두는 글꼴 */
const FONTS: [number, number][] = [[0.034, 700], [0.034, 800], [0.034, 900], [0.036, 800], [0.036, 900], [0.038, 900], [0.04, 800], [0.04, 900], [0.042, 900], [0.044, 900], [0.046, 900], [0.05, 900], [0.052, 900], [0.06, 900], [0.064, 900], [0.07, 900]];

function moodOf(s: TrapState, m: Mon) {
  if (m.alert >= 0 || m.st === LEAP) return M_MAD;
  switch (m.st) {
    case FALL: case ARC: case SNAG: case FLEE: return M_FALL;
    case STUN: case SKID: return M_DIZZY;
    case FLAT: case HIT: return M_OUCH;
    case FLOAT: return M_IDLE;
  }
  if (m.nap) return M_SLEEP;
  if (KD[m.k].boss) return s.t - m.hurtT < 30 ? M_OUCH : s.collapseT >= 0 ? M_FALL : M_IDLE;
  return m.act === 1 && m.st === IDLE ? M_HAPPY : M_IDLE;
}

function drawAll(ctx: C2, s: TrapState, w: number, h: number, _th: Theme) {
  const fx = juice(s), t = s.t, d = STAGES[s.stage], ch = d.ch;
  const X = (x: number) => x * w, Y = (wy: number) => (wy - s.cam) * w, R = (r: number) => r * w;
  const sc = typeof ctx.getTransform === 'function' ? Math.min(2, Math.max(1, Math.round(ctx.getTransform().a || 1))) : 1;
  const seenT = fx.memo.t ?? -1;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  const text = (str: string, x: number, y: number, fill: string, stroke = 'rgba(75,48,32,.92)', lw = 3) => {
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
    x = clamp(x, w * 0.14, w * 0.86);
    y = clamp(y, R(TOP_Y + 0.06), R(BOT_Y - 0.05));
    for (let k = 0; k < 5 && rec.some((q) => t - q.t < 30 && Math.abs(q.x - x) < w * 0.18 && Math.abs(q.y - y) < (size + q.size) * 0.55); k++) y -= size * 0.9;
    rec.push({ x, y, t, size });
    if (rec.length > 14) rec.shift();
    fx.pop(x, y, str, col, size);
  };
  const since = (k: string) => {
    for (let i = s.events.length - 1; i >= 0; i--) if (s.events[i].k === k) return t - s.events[i].t;
    return 999;
  };
  // 미리 굽기: 결과·선물 화면에서 다음 판의 탑과 스티커를 (끊김 줄이기)
  if ((s.phase === 'result' || s.phase === 'pick') && s.pt > 14 && s.stage + 1 < STAGES.length && !(fx.memo.warm === s.stage)) {
    const nx = { ...s, stage: s.stage + 1 } as TrapState;
    bakeTower(nx, w, sc);
    fx.memo.warm = s.stage;
  }
  {
    const fi = fx.memo.wf ?? 0;
    if (fi < FONTS.length && t % 2 === 0) font(FONTS[fi][0], FONTS[fi][1]), ctx.measureText('가나다 한 방! 0123'), (fx.memo.wf = fi + 1);
    // 이 탑에 나올 스티커를 프레임마다 하나씩 미리 굽는다 (처음 보는 표정에서 끊기지 않게)
    const wi = fx.memo.ws ?? 0, list: [K, number, number][] = [];
    for (const mood of [M_IDLE, M_FALL, M_DIZZY, M_OUCH, M_SLEEP, M_MAD, M_HAPPY]) for (let c = 0; c < 3; c++) list.push(['imp', mood, c]);
    for (const mood of [M_IDLE, M_FALL, M_DIZZY, M_OUCH, M_SLEEP, M_MAD, M_HAPPY]) list.push(['bear', mood, 0]);
    for (const mood of [M_IDLE, M_FALL]) list.push(['bat', mood, 0]);
    if (d.boss) for (const mood of [M_IDLE, M_OUCH, M_FALL]) list.push([d.boss, mood, 0]);
    for (let n = 0; n < 2 && (fx.memo.ws ?? 0) < list.length; n++) {
      const [k, mood, c] = list[fx.memo.ws ?? 0];
      warmSprite(k, mood, ch, c, Math.round(R(KD[k].r) * (KD[k].boss ? 1.05 : VIS) * sc));
      fx.memo.ws = (fx.memo.ws ?? 0) + 1;
    }
    void wi;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  fx.begin(ctx);

  // ── 탑 (미리 구운 한 장에서 보이는 만큼) ──
  const bk = bakeTower(s, w, sc), sy = (s.cam - bk.y0) * w * sc;
  ctx.drawImage(bk.c, 0, Math.max(0, sy), bk.c.width, Math.min(bk.c.height - Math.max(0, sy), h * sc), 0, Math.max(0, -sy / sc), w, Math.min(h, (bk.c.height - Math.max(0, sy)) / sc));
  const visible = (k: number) => Y(FY(k)) > -R(0.05) && Y(FY(k) - FH) < h + R(0.05);
  const P = PALS[ch];

  // ── 방마다 살아 있는 것: 냄비 김 · 화덕 불 · 횃불 ──
  for (let k = 0; k < s.nf; k++) {
    if (!visible(k)) continue;
    const room = isVault(s, k) ? 15 : STAGES[s.stage].floors[k].room, fy = FY(k) - DEP;
    if (room === 1) for (let i = 0; i < 3; i++) {
      const q = ((t * 0.012 + i / 3) % 1), x = X(WL + (WR - WL) * 0.155) + Math.sin(q * 6 + i) * R(0.01);
      ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - q)})`;
      ell(ctx, x, Y(fy - 0.15 - q * 0.1), R(0.015 + q * 0.02), R(0.012 + q * 0.015));
      ctx.fill();
    }
    if (room === 3 || room === 15) {
      const a = 0.25 + 0.15 * Math.sin(t * 0.3 + k);
      ctx.fillStyle = `rgba(255,190,80,${a})`;
      ell(ctx, X(room === 3 ? WL + (WR - WL) * 0.68 : WL + (WR - WL) * 0.12 + 0.006), Y(room === 3 ? fy - 0.03 : FY(k) - FH + TH + (FH - TH - DEP) * 0.25), R(0.05), R(0.04));
      ctx.fill();
    }
  }

  // ── 너구리 곁의 위험: '!' 놈이 있으면 사다리 쪽 칸이 빨갛게 숨 쉰다 ──
  const danger = s.mons.filter((m) => m.f === s.c && m.alert >= 0 && !m.dead);
  if (danger.length && s.phase === 'play') {
    const pul = 0.5 + 0.5 * Math.sin(t * 0.35);
    ctx.fillStyle = `rgba(255,60,50,${0.1 + 0.1 * pul})`;
    ctx.fillRect(X(0.02), Y(FY(s.c) - FH + TH), X(WL + TW * 2.2) - X(0.02), R(FH - TH));
  }

  // ── 층의 장치 (물탱크 · 트램펄린 · 컨베이어 · 얼음 · 폭죽 통 · 책장) ──
  for (let k = 0; k < s.nf - 1; k++) {
    if (!visible(k)) continue;
    const F = s.floors[k], fy = FY(k), ft = Y(fy - DEP), fb = Y(fy);
    if (F.feat.ice) {
      ctx.fillStyle = 'rgba(200,240,255,.72)';
      ctx.fillRect(X(WL), ft, X(WR) - X(WL), fb - ft);
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      for (let i = 0; i < 6; i++) ctx.fillRect(X(WL + 0.05 + i * 0.15 + ((t * 0.001 * F.feat.ice) % 0.15)), ft + R(0.012), R(0.05), R(0.006));
      font(0.034, 900);
      text(F.feat.ice > 0 ? '➜' : '⬅', X(0.53), Y(fy - DEP * 0.5), '#5ab8e0', '#ffffff', 2);
    }
    if (F.feat.belt) {
      ctx.fillStyle = '#4a4a56';
      ctx.fillRect(X(WL), ft, X(WR) - X(WL), fb - ft);
      ctx.fillStyle = '#ffd84a';
      const off = ((t * 0.0013 * F.feat.belt) % 0.06 + 0.06) % 0.06;
      for (let x = WL - 0.06 + off; x < WR; x += 0.06) {
        if (x < WL) continue;
        ctx.beginPath();
        ctx.moveTo(X(x), ft + 2);
        ctx.lineTo(X(x + 0.02 * F.feat.belt), (ft + fb) / 2);
        ctx.lineTo(X(x), fb - 2);
        ctx.lineTo(X(x + 0.012), fb - 2);
        ctx.lineTo(X(x + 0.012 + 0.02 * F.feat.belt), (ft + fb) / 2);
        ctx.lineTo(X(x + 0.012), ft + 2);
        ctx.closePath();
        ctx.fill();
      }
      for (const x of [WL + 0.01, WR - 0.01]) (ell(ctx, X(x), (ft + fb) / 2, R(0.014), R(0.02)), ink(ctx, '#8a96aa', 1.5));
    }
    if (F.feat.water) {
      const [a, b] = F.feat.water, x0 = X(WL + a * TW), x1 = X(WL + (b + 1) * TW);
      ctx.fillStyle = lin(ctx, 0, ft, 0, fb + R(TH), [0, 'rgba(90,200,255,.9)'], [1, 'rgba(40,120,220,.95)']);
      ctx.fillRect(x0, ft, x1 - x0, fb - ft + R(TH) * 0.6);
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 4) {
        const yy = ft + 2 + Math.sin(x * 0.08 + t * 0.12) * 1.5;
        if (x === x0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
      ctx.strokeStyle = P.woodDk;
      ctx.lineWidth = 3;
      ctx.strokeRect(x0, ft, x1 - x0, fb - ft + R(TH) * 0.6);
    }
    for (let i = 0; i < NT; i++) {
      if (!F.tramp[i]) continue;
      const cx = X(tileX(i)), last = s.events.reduce((a, e) => (e.k === 'boing' && Math.abs(e.x - tileX(i)) < 0.01 && e.y === fy ? Math.max(a, e.t) : a), -99), q = clamp((t - last) / 20, 0, 1), dip = (1 - q) * Math.sin(q * 9) * R(0.014);
      for (const sd of [-1, 1]) (ctx.strokeStyle = '#4a4a56'), (ctx.lineWidth = 3), ctx.beginPath(), ctx.moveTo(cx + sd * R(TW * 0.4), Y(fy - DEP * 0.45)), ctx.lineTo(cx + sd * R(TW * 0.42), Y(fy - DEP * 0.45) - R(0.02)), ctx.stroke();
      ell(ctx, cx, Y(fy - DEP * 0.45) - R(0.022) + dip, R(TW * 0.44), R(0.013));
      ink(ctx, lin(ctx, cx - R(TW * 0.44), 0, cx + R(TW * 0.44), 0, [0, '#ff5a4e'], [0.5, '#ffd84a'], [1, '#5ad1ff']), 2);
      font(0.034, 900);
      text(F.tramp[i] > 0 ? '↗' : '↖', cx, Y(fy - DEP * 0.45) - R(0.05), '#ffffff', '#d6402e', 3);
    }
    for (const kg of F.kegs) {
      if (!kg.live) continue;
      const cx = X(kg.x), by = Y(fy - DEP * 0.3);
      ell(ctx, cx, by - R(0.035), R(0.03), R(0.038));
      ink(ctx, lin(ctx, cx - R(0.03), 0, cx + R(0.03), 0, [0, '#b8382a'], [0.5, '#ff6a4e'], [1, '#b8382a']), 2);
      ctx.fillStyle = '#ffd84a';
      ctx.fillRect(cx - R(0.03), by - R(0.045), R(0.06), R(0.008));
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, by - R(0.073));
      ctx.quadraticCurveTo(cx + R(0.01), by - R(0.085), cx + R(0.005), by - R(0.095));
      ctx.stroke();
      if ((t >> 2) % 2) (ctx.fillStyle = '#ffe36b'), ell(ctx, cx + R(0.005), by - R(0.098), R(0.006), R(0.006)), ctx.fill();
      font(0.034, 900);
      text('쾅', cx, by - R(0.034), '#ffffff', 'rgba(120,20,10,.9)', 2);
    }
    for (const sh of F.shelves) {
      const cx = X(sh.x), by = Y(fy - DEP * 0.85), hgt = R(0.2), wid = R(0.06);
      const ang = sh.st === 0 ? 0 : sh.st === 1 ? clamp((t - sh.t) / SHELF_T, 0, 1) ** 2 * (Math.PI / 2) * sh.dir : (Math.PI / 2) * sh.dir;
      ctx.save();
      ctx.translate(cx + (sh.dir > 0 ? wid / 2 : -wid / 2) * (sh.st ? 1 : 0), by);
      ctx.rotate(ang);
      ctx.translate(sh.st ? (sh.dir > 0 ? -wid / 2 : wid / 2) : 0, 0);
      rr(ctx, -wid / 2, -hgt, wid, hgt, 3);
      ink(ctx, P.woodDk, 2);
      for (let r2 = 0; r2 < 4; r2++)
        for (let b2 = 0; b2 < 4; b2++) (ctx.fillStyle = ['#ff5a4e', '#5ad1ff', '#ffd84a', '#7fdc5c', '#ff9ecb', '#a98cf5'][(b2 + r2 * 2 + Math.round(sh.x * 10)) % 6]), ctx.fillRect(-wid / 2 + 3 + b2 * (wid - 6) / 4, -hgt + 4 + r2 * (hgt - 8) / 4, (wid - 6) / 4 - 1, (hgt - 8) / 4 - 3);
      ctx.restore();
    }
  }

  // ── 끌리는 것: 땡! 종 울리는 화덕(부엌) · 굴러가는 공(장난감) · 떠다니는 빛(마법사) — 무리가 이것을 따라 옮겨 다닌다 ──
  for (let k = 0; k < s.nf - 1; k++) {
    const F = s.floors[k], L = F.lure;
    if (!visible(k) || F.gone) continue;
    const fy = FY(k), age = t - L.ring;
    if (L.kind === 0) {
      for (const sx of L.spots) {
        const on = Math.abs(sx - L.x) < 0.01, cx = X(sx), by = Y(fy - DEP * 0.92), sw = R(0.085), sh = R(0.07);
        rr(ctx, cx - sw / 2, by - sh, sw, sh, 3);
        ink(ctx, lin(ctx, 0, by - sh, 0, by, [0, '#c9c2bc'], [1, '#8a827c']), 1.5);
        rr(ctx, cx - sw * 0.32, by - sh * 0.62, sw * 0.64, sh * 0.42, 2);
        ctx.fillStyle = on ? radg(ctx, cx, by - sh * 0.4, 0, sw * 0.4, [0, '#ffe36b'], [1, '#ff6a2e']) : '#4a3a34';
        ctx.fill();
        // 종 (울리면 흔들흔들)
        const sway = on && age < 50 ? Math.sin(age * 0.6) * 0.6 * (1 - age / 50) : 0, bk = R(0.027) * (on ? 1.3 : 0.9);
        ctx.save();
        ctx.translate(cx, by - sh - 2);
        ctx.rotate(sway);
        ctx.beginPath();
        ctx.moveTo(-bk, 0);
        ctx.quadraticCurveTo(-bk, -bk * 1.6, 0, -bk * 1.7);
        ctx.quadraticCurveTo(bk, -bk * 1.6, bk, 0);
        ctx.closePath();
        ink(ctx, on ? lin(ctx, 0, -bk * 1.7, 0, 0, [0, '#fff3a8'], [1, '#f0a818']) : '#c9b07a', 1.5);
        ell(ctx, 0, bk * 0.15, bk * 0.28, bk * 0.28);
        ctx.fillStyle = OUT;
        ctx.fill();
        ctx.restore();
        if (on && age < 46) {
          const q = age / 46;
          for (let j = 0; j < 2; j++) (ell(ctx, cx, by - sh - bk, R(0.04 + 0.07 * q + j * 0.03), R(0.03 + 0.05 * q + j * 0.02)), (ctx.strokeStyle = `rgba(255,236,120,${(1 - q) * (1 - j * 0.4)})`), (ctx.lineWidth = 3), ctx.stroke());
          font(0.05, 900);
          ctx.globalAlpha = Math.min(1, (46 - age) / 12);
          textK('땡!', cx, by - sh - R(0.075) - q * R(0.03), age < 6 ? 1.4 - age * 0.07 : 1, '#ffe36b', OUT, 4);
          ctx.globalAlpha = 1;
        }
      }
    } else if (L.kind === 1) {
      const cx = X(L.x), r = R(0.045), cy = Y(fy - DEP * 0.55) - r, rot = L.x / 0.045;
      ctx.fillStyle = 'rgba(50,30,15,.22)';
      ell(ctx, cx, Y(fy - DEP * 0.55), r * 0.9, r * 0.25);
      ctx.fill();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ell(ctx, 0, 0, r, r);
      ink(ctx, '#ffffff', 2);
      ctx.beginPath();
      ctx.arc(0, 0, r, -0.6, 0.6);
      ctx.arc(0, 0, r * 0.2, 0.6, -0.6, true);
      ctx.fillStyle = '#ff5a4e';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, r, Math.PI - 0.6, Math.PI + 0.6);
      ctx.arc(0, 0, r * 0.2, Math.PI + 0.6, Math.PI - 0.6, true);
      ctx.fillStyle = '#5ad1ff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, r, Math.PI / 2 - 0.6, Math.PI / 2 + 0.6);
      ctx.arc(0, 0, r * 0.2, Math.PI / 2 + 0.6, Math.PI / 2 - 0.6, true);
      ctx.fillStyle = '#ffd84a';
      ctx.fill();
      ell(ctx, 0, 0, r, r);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      shine(ctx, cx - r * 0.35, cy - r * 0.4, r * 0.25, r * 0.15);
      if (age < 24) (font(0.04, 900), (ctx.globalAlpha = 1 - age / 24), text('통!', cx, cy - r * 2, '#ffffff', '#d6402e', 3), (ctx.globalAlpha = 1));
    } else {
      const cx = X(L.x), cy = Y(fy - 0.22) + Math.sin(t * 0.08 + k) * R(0.01), r = R(0.04) * (1 + 0.1 * Math.sin(t * 0.2));
      ctx.fillStyle = radg(ctx, cx, cy, 0, r * 3, [0, 'rgba(255,250,200,.9)'], [0.35, 'rgba(180,230,255,.5)'], [1, 'rgba(150,200,255,0)']);
      ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6);
      ell(ctx, cx, cy, r * 0.75, r * 0.75);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.fillStyle = '#fff3a8';
      for (let j = 0; j < 4; j++) starPath(ctx, cx + Math.cos(t * 0.1 + j * 1.6) * r * 1.6, cy + Math.sin(t * 0.1 + j * 1.6) * r * 1.2, r * 0.3), ctx.fill();
      if (Math.abs(L.tx - L.x) > 0.02) {
        ctx.strokeStyle = 'rgba(255,255,255,.45)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(X(L.tx), cy);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  // ── 바닥 칸: 열린 함정문(두 쪽 판자가 아래로 덜렁) · 깨진 바닥 · 덧댄 판자 ──
  for (let k = 0; k < s.nf - 1; k++) {
    if (!visible(k)) continue;
    const F = s.floors[k], fy = FY(k), ft = Y(fy - DEP), fb = Y(fy);
    for (let i = 0; i < NT; i++) {
      const tl = F.tiles[i], x0 = X(WL + i * TW), x1 = X(WL + (i + 1) * TW), age = t - tl.at;
      if (tl.open > 0 || tl.crack > 0) {
        const isDoor = tl.open > 0 && !tl.crack, xb0 = X(0.5 + (WL + i * TW - 0.5) * 0.93), xb1 = X(0.5 + (WL + (i + 1) * TW - 0.5) * 0.93);
        // 구멍: 뒤가 좁은 사다리꼴 + 앞면이 뚫림
        ctx.beginPath();
        ctx.moveTo(xb0 + 1, ft);
        ctx.lineTo(xb1 - 1, ft);
        ctx.lineTo(x1 - 1, fb + R(TH));
        ctx.lineTo(x0 + 1, fb + R(TH));
        ctx.closePath();
        ctx.fillStyle = lin(ctx, 0, ft, 0, fb + R(TH), [0, '#1a0f08'], [1, 'rgba(40,24,12,.92)']);
        ctx.fill();
        if (isDoor) {
          // 함정문 두 쪽이 경첩을 축으로 아래로 쩍 (처음 6틱에 확 열리고, 닫힐 때 다시 올라온다)
          const q = Math.min(1, age / 5) * Math.min(1, tl.open / 8), ang = q * 1.45;
          for (const sd of [-1, 1]) {
            const hx = sd < 0 ? x0 : x1, len = (x1 - x0) / 2;
            ctx.save();
            ctx.translate(hx, fb);
            ctx.rotate(-sd * ang);
            ctx.fillStyle = P.wood;
            ctx.fillRect(sd < 0 ? 0 : -len, -R(0.006), len, R(0.012));
            ctx.strokeStyle = OUT;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(sd < 0 ? 0 : -len, -R(0.006), len, R(0.012));
            ctx.restore();
          }
        } else {
          // 깨진 가장자리: 들쭉날쭉한 판자 조각
          ctx.fillStyle = P.wood2;
          for (let j = 0; j < 4; j++) {
            const jx = x0 + ((x1 - x0) * (j + 0.5)) / 4, jh = R(0.012 + hsh(i * 7 + j + k * 3) * 0.02);
            ctx.beginPath();
            ctx.moveTo(jx - (x1 - x0) / 9, fb);
            ctx.lineTo(jx, fb + jh);
            ctx.lineTo(jx + (x1 - x0) / 9, fb);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = OUT;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      } else if (tl.patch) {
        // 덧댄 판자 (X자 못질)
        ctx.strokeStyle = 'rgba(255,240,210,.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0 + 4, fb + 3);
        ctx.lineTo(x1 - 4, fb + R(TH) - 3);
        ctx.moveTo(x1 - 4, fb + 3);
        ctx.lineTo(x0 + 4, fb + R(TH) - 3);
        ctx.stroke();
      }
    }
    // 지금 층: 열 수 있는 칸의 고리가 반짝 (만질 수 있는 것)
    if (k === s.c && canTap(s) && s.stage === 0) {
      for (let i = 0; i < NT; i++) {
        const pul = 0.5 + 0.5 * Math.sin(t * 0.12 + i * 0.7);
        ell(ctx, X(tileX(i)), Y(fy - DEP * 0.45), R(0.012), R(0.007));
        ctx.strokeStyle = `rgba(255,236,150,${0.4 + 0.5 * pul})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  // ── 몬스터 (층마다 뒤→앞) ──
  const list = s.mons.filter((m) => !m.dead && Y(m.y) > -R(0.1) && Y(m.y) < h + R(0.2)).sort((a, b) => a.f - b.f || a.z - b.z || a.id - b.id);
  const spotM = s.spot && s.phase === 'play' ? s.mons.find((m) => m.id === s.spot!.id) : undefined;
  for (const m of list) {
    const boss = KD[m.k].boss, u = R(m.r) * (0.92 + 0.12 * m.z) * (boss ? 1.05 : VIS), mx = X(m.x), my = Y(m.y), mood = moodOf(s, m);
    const floorY = Y(feetY(m.f, m.z));
    if (m.st === ROPE) (ctx.strokeStyle = '#8a6a3a'), (ctx.lineWidth = 2), ctx.beginPath(), ctx.moveTo(mx, Y(FY(m.f) - FH + TH)), ctx.lineTo(mx, my - u * 2.2), ctx.stroke();
    // 그림자 (바닥에 있을 때만)
    if (m.st !== FALL && m.st !== FLOAT && m.st !== SNAG) {
      const air = clamp((floorY - my) / R(0.2), 0, 1);
      ctx.fillStyle = `rgba(50,30,15,${0.22 * (1 - air * 0.6)})`;
      ell(ctx, mx, floorY, u * (m.st === FLAT ? 1.5 : 0.95) * (1 - air * 0.3), u * 0.28);
      ctx.fill();
    }
    if (spotM === m) {
      const pul = 0.5 + 0.5 * Math.sin(t * 0.2);
      ell(ctx, mx, floorY, u * (1.9 + pul * 0.3), u * 0.6);
      ctx.fillStyle = `rgba(255,236,120,${0.3 + 0.2 * pul})`;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.lineDashOffset = -t * 0.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.save();
    ctx.translate(mx, my);
    let sx = 1, sy2 = 1, rot = 0;
    const la = t - m.land;
    if (m.st === FALL) (sx = 0.9), (sy2 = 1.12), (rot = Math.sin(t * 0.4 + m.id) * 0.25);
    else if (m.st === FLAT) (sx = 1.55), (sy2 = 0.36);
    else if (m.st === STUN) (rot = 0.18 * Math.sin(m.id)), la < 8 && ((sx = 1.25 - la * 0.03), (sy2 = 0.75 + la * 0.03));
    else if (m.st === ARC) rot = ((t - m.land) * 0.3) * Math.sign(m.bx - m.ax);
    else if (m.st === SKID) rot = 1.2 * Math.sign(m.vx);
    else if (m.st === WALK || m.st === ENTER || m.st === FLEE) sy2 = 1 + 0.06 * Math.sin((t + m.id * 9) * 0.35);
    else if (m.st === IDLE && !m.nap) {
      // 노는 중: 1 냠냠(몸을 흔든다) · 2 베개 싸움(통통 뛴다)
      if (m.act === 2) ctx.translate(0, -Math.abs(Math.sin((t + m.id * 11) * 0.16)) * u * 0.5), (sy2 = 1 + 0.08 * Math.sin((t + m.id * 11) * 0.32));
      else if (m.act === 1) rot = 0.12 * Math.sin((t + m.id * 7) * 0.2);
      else sy2 = 1 + 0.03 * Math.sin((t + m.id * 13) * 0.12);
    } else if (m.nap) sy2 = 1 + 0.04 * Math.sin((t + m.id * 13) * 0.06);
    if (boss && t - m.hurtT < 20 && m.st !== FLAT) (sx = 1.15), (sy2 = 0.85), ctx.translate(Math.sin(t * 2) * 3, 0);
    if (m.st === LEAP) rot = -0.4;
    ctx.rotate(rot);
    ctx.scale(sx * (m.face < 0 ? -1 : 1), sy2);
    // 스티커는 종류마다 한 크기로만 굽고(깊이에 따른 크기는 찍을 때 늘린다) — 크기마다 새로 굽느라 끊기지 않게
    stamp(ctx, sprite(m.k, mood, m.v, m.id, Math.round(R(KD[m.k].r) * (boss ? 1.05 : VIS) * sc)), u);
    ctx.restore();
    // 머리 위: 낮잠 zZ · 기절 별 · '!' · 땀
    const top = my - u * (boss ? 2.6 : 2.4);
    if (m.nap && m.st === IDLE && m.f !== s.c && (m.id % 3 === 0)) {
      const q = ((t + m.id * 17) % 90) / 90;
      ctx.globalAlpha = 1 - q;
      font(0.034, 900);
      text('z', mx + u * 0.6 + q * R(0.02), top - q * R(0.03), '#ffffff', '#6a7ab8', 2.5);
      ctx.globalAlpha = 1;
    }
    if (m.st === STUN || m.st === FLAT) {
      ctx.fillStyle = '#ffe36b';
      for (let i = 0; i < 3; i++) starPath(ctx, mx + Math.cos(t * 0.25 + i * 2.1) * u * 0.9, my - u * (m.st === FLAT ? 0.9 : 2.0) + Math.sin(t * 0.25 + i * 2.1) * u * 0.25, u * 0.28), ctx.fill();
    }
    if (m.alert >= 0) {
      const lim = m.act === 9 ? lookT(s) : alertT(s), q = clamp(m.alert / lim, 0, 1), bx = mx, by = top - R(0.02);
      ell(ctx, bx, by, R(0.03), R(0.03));
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,20,10,.35)';
      ctx.lineWidth = R(0.008);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx, by, R(0.03), -Math.PI / 2, -Math.PI / 2 + TAU * q);
      ctx.strokeStyle = q > 0.66 ? ((t >> 2) % 2 ? '#ff3b30' : '#ffffff') : '#ff3b30';
      ctx.lineWidth = R(0.008);
      ctx.stroke();
      font(0.044, 900);
      textK('!', bx, by + 1, 1 + 0.15 * Math.sin(t * 0.5), '#ff3b30', '#ffffff', 0);
    }
    if (m.st === FLEE && (t >> 3) % 2) (font(0.034, 900), text('으앗', mx, top, '#ffffff', OUT, 3));
    const L = !isVault(s, m.f) ? s.floors[m.f].lure : null;
    if (L && m.fol && m.f !== s.c && m.st === WALK && m.spook <= 0 && L.kind === 0 && t - L.ring < 45 && m.id % 2 === 0) (font(0.036, 900), text('!', mx, top, '#ffe36b', OUT, 3));
    if (m.spook > 0 && (m.st === WALK || m.st === IDLE) && m.id % 2 === 0) (font(0.034, 900), text('!?', mx, top, '#ffffff', '#6a7ab8', 3));
  }

  // ── 망보기 '!': 그 줄에 큰 손가락 ──
  if (danger.length && s.phase === 'play' && canTap(s)) {
    const o = danger[0], press = Math.max(0, Math.sin(t * 0.25)), hx = X(o.x) + R(0.035), hy = Y(o.y) - R(0.03);
    drawHand(ctx, hx, hy, R(0.09), press);
  }

  // ── 대장: 쿵 게이지 ──
  const bossM = s.mons.find((m) => KD[m.k].boss && !m.dead);
  if (bossM && !s.bossDown && s.gaugeMax > 0) {
    const bx = X(bossM.x), by = Y(bossM.y) - R(bossM.r) * 3.2, bw = R(0.24), bh = R(0.026), q = clamp(s.gauge / s.gaugeMax, 0, 1);
    rr(ctx, bx - bw / 2 - 2, by - 2, bw + 4, bh + 4, bh);
    ctx.fillStyle = OUT;
    ctx.fill();
    rr(ctx, bx - bw / 2, by, bw, bh, bh);
    ctx.fillStyle = '#6b5340';
    ctx.fill();
    if (q > 0) (rr(ctx, bx - bw / 2, by, Math.max(bh, bw * q), bh, bh), (ctx.fillStyle = lin(ctx, 0, by, 0, by + bh, [0, '#ffe38a'], [1, '#ff7a30'])), ctx.fill());
    font(0.034, 900);
    text('쿵 게이지', bx, by - R(0.022), '#ffffff', OUT, 3);
  }

  // ── 보물 상자 (보물방) ──
  {
    const vf = s.nf - 1, cx = X(0.84), cy = Y(FY(vf) - DEP * 0.4), k = R(0.05), open = s.vaultT >= 26 ? clamp((s.vaultT - 26) / 10, 0, 1) : 0;
    if (Y(FY(vf)) < h + R(0.1)) {
      if (open > 0) (ctx.fillStyle = radg(ctx, cx, cy - k, 0, k * 3, [0, 'rgba(255,240,150,.85)'], [1, 'rgba(255,200,60,0)'])), ctx.fillRect(cx - k * 3, cy - k * 4, k * 6, k * 5);
      rr(ctx, cx - k, cy - k * 0.9, k * 2, k * 0.9, k * 0.15);
      ink(ctx, lin(ctx, 0, cy - k, 0, cy, [0, '#c98a50'], [1, '#8a5a2e']), 2);
      ctx.save();
      ctx.translate(cx, cy - k * 0.9);
      ctx.rotate(-open * 1.1);
      rr(ctx, -k, -k * 0.55, k * 2, k * 0.55, k * 0.3);
      ink(ctx, lin(ctx, 0, -k * 0.55, 0, 0, [0, '#e0a866'], [1, '#a86a3a']), 2);
      ctx.restore();
      rr(ctx, cx - k * 0.15, cy - k * 0.95, k * 0.3, k * 0.35, 3);
      ink(ctx, '#ffd84a', 1.5);
      if (open > 0) drawLoot(ctx, s.stage, cx, cy - k * 1.4 - open * k * 0.9, k * 0.75);
    }
  }

  // ── 너구리 ──
  {
    const k = R(0.05), lv = s.lv;
    let rx = X(PERCH_X), ry = Y(FY(s.c) - PERCH_H), mood = 0;
    if (s.desc >= 0) {
      const T = DESC_T * (s.descTo - s.c > 1 ? 1.4 : 1), q = clamp(s.desc / T, 0, 1), e = q * q * (3 - 2 * q);
      ry = Y(FY(s.c) - PERCH_H + (FY(s.descTo) - FY(s.c)) * e);
      rx = X(0.056);
      mood = 4;
    } else if (s.tumble >= 0) {
      const q = clamp(s.tumble / 40, 0, 1);
      ry = Y(FY(s.nf - 2) - PERCH_H + (FY(s.nf - 1) - FY(s.nf - 2) + PERCH_H) * q * q);
      rx = X(PERCH_X + 0.1 * q);
      mood = 5;
    } else if (isVault(s, s.c)) {
      rx = X(0.62 + Math.min(1, Math.max(0, s.vaultT) / 30) * 0.1);
      ry = Y(FY(s.c) - DEP * 0.4);
      mood = s.vaultT >= 30 ? 3 : 0;
    } else if (s.hurt > 0) mood = 2;
    else if (danger.length) mood = 1;
    else if (s.big && t - s.big.t < 60) mood = 3;
    if (s.phase === 'end' && !s.won) mood = 2;
    if (s.phase === 'result' || (s.phase === 'end' && s.won)) mood = 3;
    ctx.fillStyle = 'rgba(40,25,15,.22)';
    if (s.desc < 0 && s.tumble < 0) (ell(ctx, rx, ry, k * 0.7, k * 0.18), ctx.fill());
    drawRaccoon(ctx, rx, ry, k, lv, t, mood, s.desc >= 0 ? 1 : 1);
    if (s.hurt > 0) {
      ctx.fillStyle = '#ffe36b';
      for (let i = 0; i < 3; i++) starPath(ctx, rx + Math.cos(t * 0.25 + i * 2.1) * k * 0.9, ry - k * 2.6 + Math.sin(t * 0.25 + i * 2.1) * k * 0.25, k * 0.22), ctx.fill();
    }
    if (s.stage === 0 && s.taps === 0 && s.phase === 'play') {
      // 처음 보는 사람에게: 이 너구리가 나
      const lx = rx + k * 1.1, ly = ry - k * 1.25;
      font(0.036, 900);
      rr(ctx, lx - R(0.01), ly - R(0.026), ctx.measureText('나: 꼬마 도둑').width + R(0.04), R(0.052), R(0.026));
      ctx.fillStyle = '#5a5a78';
      ctx.fill();
      ctx.textAlign = 'left';
      text('나: 꼬마 도둑', lx + R(0.01), ly + 0.5, '#ffffff', '', 0);
      ctx.textAlign = 'center';
    }
  }

  // ── 사건 그림 (나이에 따라): 쾅 닫힘 선 · 쩍 금 · 착지 먼지 · 물결 · 폭발 ──
  const bandOn = !!s.big && t - s.big.t < BIG_T;
  for (const e of s.events) {
    const age = t - e.t, ex = X(e.x), ey = Y(e.y);
    if (e.k === 'crack' && age < 40) {
      const q = age / 40, pop = age < 6 ? 1.5 - 0.5 * (age / 6) : 1;
      ctx.globalAlpha = Math.min(1, (40 - age) / 10) * (bandOn ? 0.75 : 1);
      font(e.n >= 2 ? 0.06 : 0.05, 900);
      textK(e.n >= 2 ? `와르르 ${e.n + 1}층!` : '쩍!', clamp(ex, w * 0.18, w * 0.82), ey - R(0.08) - q * R(0.03), pop, e.n >= 2 ? '#ffe36b' : '#ffffff', OUT, Math.max(3.5, R(0.012)));
      ctx.globalAlpha = 1;
      if (age < 12) {
        ctx.strokeStyle = `rgba(255,250,220,${1 - age / 12})`;
        ctx.lineWidth = 3;
        for (let j = 0; j < 6; j++) {
          const a = -Math.PI / 2 + (j - 2.5) * 0.45;
          ctx.beginPath();
          ctx.moveTo(ex + Math.cos(a) * R(0.03), ey + Math.sin(a) * R(0.02));
          ctx.lineTo(ex + Math.cos(a) * R(0.08 + age * 0.004), ey + Math.sin(a) * R(0.05 + age * 0.003));
          ctx.stroke();
        }
      }
    } else if (e.k === 'door' && age < 10) {
      ctx.strokeStyle = `rgba(255,255,255,${1 - age / 10})`;
      ctx.lineWidth = 2.5;
      for (const sd of [-1, 1]) (ctx.beginPath(), ctx.moveTo(ex + sd * R(TW * e.n * 0.5 + 0.01), ey - R(0.01)), ctx.lineTo(ex + sd * R(TW * e.n * 0.5 + 0.04 + age * 0.003), ey - R(0.04)), ctx.stroke());
    } else if (e.k === 'land' && age < 14 && e.x2 >= 3) {
      const q = age / 14;
      ell(ctx, ex, ey, R(0.04 + 0.08 * q), R(0.012 + 0.02 * q));
      ctx.strokeStyle = `rgba(255,240,210,${1 - q})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (e.k === 'splash' && age < 30) {
      const q = age / 30, x0 = X(e.x2), x1 = X(e.y2);
      ctx.fillStyle = `rgba(160,225,255,${0.8 * (1 - q)})`;
      for (let x = x0; x < x1; x += R(0.03)) (ell(ctx, x, ey - R(0.02) - Math.sin(q * Math.PI) * R(0.06) * (0.6 + hsh(x) * 0.6), R(0.014), R(0.02)), ctx.fill());
      if (age < 34) (font(0.048, 900), (ctx.globalAlpha = 1 - q), textK('풍덩!', clamp(ex, w * 0.2, w * 0.8), ey - R(0.12), 1 + (1 - q) * 0.3, '#ffffff', '#2a7ad0', 4), (ctx.globalAlpha = 1));
    } else if ((e.k === 'boom' || e.k === 'batpop') && age < 20) {
      const q = age / 20, big = e.k === 'boom' ? 0.22 : 0.17;
      burstPath(ctx, ex, ey - R(0.04), R(big * (0.4 + 0.6 * q)), 12, 0.6, e.t);
      ctx.fillStyle = e.k === 'boom' ? `rgba(255,210,90,${1 - q})` : `rgba(255,190,230,${1 - q})`;
      ctx.fill();
      ctx.globalAlpha = Math.min(1, (20 - age) / 8);
      font(0.05, 900);
      textK(e.k === 'boom' ? '쾅!' : '펑!', clamp(ex, w * 0.18, w * 0.82), ey - R(0.12), age < 5 ? 1.4 - age * 0.08 : 1, '#ffffff', e.k === 'boom' ? '#c2361f' : '#b0407e', 4);
      ctx.globalAlpha = 1;
    } else if (e.k === 'boing' && age < 18) {
      font(0.042, 900);
      ctx.globalAlpha = 1 - age / 18;
      textK('통!', ex, ey - R(0.1) - age * 0.5, 1.2, '#ffffff', '#d6402e', 3.5);
      ctx.globalAlpha = 1;
    } else if (e.k === 'shelfland' && age < 24) {
      font(0.044, 900);
      ctx.globalAlpha = 1 - age / 24;
      textK('우당탕!', clamp(ex, w * 0.2, w * 0.8), ey - R(0.13), 1.1, '#ffffff', OUT, 3.5);
      ctx.globalAlpha = 1;
    } else if (e.k === 'collapse' && age < 50) {
      ctx.fillStyle = `rgba(80,50,30,${0.35 * (1 - age / 50)})`;
      ctx.fillRect(0, ey - R(0.05), w, R(0.25));
    } else if (e.k === 'tap' && age < 12) {
      ell(ctx, ex, Y(e.y), R(0.02 + 0.05 * (age / 12)), R(0.02 + 0.05 * (age / 12)));
      ctx.strokeStyle = `rgba(255,255,255,${1 - age / 12})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } else if (e.k === 'startle' && age < 26 && e.n >= 2) {
      font(0.036, 900);
      ctx.globalAlpha = 1 - age / 26;
      text('!?', clamp(ex, w * 0.15, w * 0.85), ey - R(0.12) - age * 0.4, '#ffffff', '#6a7ab8', 3);
      ctx.globalAlpha = 1;
    }
  }

  // ── 이번 톡의 작은 숫자: 떨어진 자리에 'N마리' (최고 기록·별일 때만 큰 띠가 대신) ──
  {
    const D = s.drops.find((q) => q.id === s.lastDrop);
    if (D && D.n >= 2 && t - D.t < 110 && s.phase === 'play' && !(s.big && s.big.drop === D.id && bandOn)) {
      const lx = clamp(X(D.x), w * 0.16, w * 0.84), ly = clamp(Y(FY(Math.min(D.deep, s.nf - 1)) - FH * 0.6), R(TOP_Y + 0.08), R(BOT_Y - 0.06));
      const n = D.n, changed = fx.memo.dn !== n;
      if (changed) (fx.memo.dn = n), (fx.memo.dnT = t);
      const pop = t - (fx.memo.dnT ?? 0) < 6 ? 1.3 - 0.05 * (t - (fx.memo.dnT ?? 0)) : 1;
      ctx.globalAlpha = Math.min(1, (110 - (t - D.t)) / 15);
      font(0.044 + Math.min(0.012, n * 0.0008), 900);
      textK(`${n}마리`, lx, ly, pop, '#ffffff', OUT, 4);
      if (D.vic > 0) (font(0.034, 800), text(`깔린 ${D.vic}`, lx, ly + R(0.042), '#ffe36b', OUT, 3));
      ctx.globalAlpha = 1;
    }
  }

  // ── 첫 톡 손가락: 1판, 아직 안 눌렀을 때 — 세 층이 겹친 줄 ──
  if (s.stage === 0 && s.taps === 0 && s.phase === 'play') {
    const wd = doorW(s);
    let bi = 3, bv = -1;
    for (let i0 = 0; i0 <= NT - wd; i0++) {
      const j = judge(s, i0, wd);
      if (j.n > bv) (bv = j.n), (bi = i0);
    }
    const cx = X(WL + (bi + wd / 2) * TW), cy = Y(FY(s.c) - 0.1), press = Math.max(0, Math.sin(t * 0.14));
    ctx.fillStyle = `rgba(255,236,120,${0.18 + 0.12 * press})`;
    ctx.fillRect(X(WL + bi * TW), Y(FY(s.c) - DEP), R(TW * wd), Y(FY(s.c + 2)) - Y(FY(s.c) - DEP));
    ctx.strokeStyle = `rgba(255,255,255,${0.9 - 0.5 * press})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 6]);
    ctx.lineDashOffset = -t * 0.6;
    ctx.strokeRect(X(WL + bi * TW), Y(FY(s.c) - DEP), R(TW * wd), Y(FY(s.c)) - Y(FY(s.c) - DEP) + R(TH));
    ctx.setLineDash([]);
    drawHand(ctx, cx + R(0.03), cy, R(0.09), press);
    font(0.05, 900);
    text('톡!', cx + R(0.12), cy - R(0.05), '#ffffff', OUT, 4);
  }

  // ── 방금 일어난 일: 소리 · 색종이 · 흔들림 · 글자 (한 번만) ──
  let kos = 0;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x), ey = Y(e.y), k = e.text as K;
    switch (e.k) {
      case 'tap': fx.sound('tick', 1.5, 0.45); break;
      case 'deny': fx.sound('tick', 0.7, 0.4); break;
      case 'door':
        fx.sound('crack', 1.6, 0.55);
        fx.sound('whoosh', 1.25, 0.6);
        fx.kick(2.5);
        puff(ex, ey, '#f3dfb0', 5, 2.5, 2.4);
        break;
      case 'fall': if (t - (fx.memo.fallT ?? -99) > 3) (fx.memo.fallT = t), fx.sound('whoosh', 0.9 + hsh(e.t) * 0.3, 0.5); break;
      case 'land': {
        const big = e.x2;
        if (t - (fx.memo.landT ?? -99) > 2) (fx.memo.landT = t), fx.sound('thud', big >= 3 ? 0.55 : 1.15 + hsh(e.t) * 0.3, big >= 3 ? 1.3 : 0.6);
        puff(ex, ey, '#f3dfb0', big >= 3 ? 10 : 4, big >= 3 ? 4.5 : 2.6, 2.8);
        fx.kick(big >= 3 ? 9 : 2.5);
        break;
      }
      case 'heavy': fx.sound('thud', 0.45, 1.4); fx.kick(10); say(ex, ey - R(0.12), '쿵!', '#ffe36b', 20); break;
      case 'ko': {
        const n = e.n;
        if (kos++ < 3) fx.sound('pop', 0.85 + Math.min(18, n) * 0.06, 0.65);
        puff(ex, ey - R(0.03), VCOL[ch] ?? KCOL[k], 3, 3.2, 2.8);
        if (n >= 8 && n % 4 === 0) fx.kick(Math.min(10, 3 + n * 0.25));
        break;
      }
      case 'crack':
        fx.sound('crack', 0.75, 1.2);
        fx.sound('thud', 0.6, 1.2);
        fx.kick(8 + e.n * 4);
        if (e.n >= 2) fx.blink('#fff3c4', 0.28);
        puff(ex, ey, P.wood, 14, 5, 3.2);
        puff(ex, ey, '#f3dfb0', 8, 3.5, 2.6);
        break;
      case 'creak': fx.sound('tick', 0.55, 0.5); break;
      case 'snag': fx.sound('boing', 1.6, 0.6); break;
      case 'batpop':
        fx.sound('pop', 0.6, 1.2);
        fx.sound('boing', 0.9, 0.7);
        fx.kick(7);
        fx.ring(ex, ey - R(0.04), '#ffb8e0', R(0.2), 5);
        puff(ex, ey - R(0.04), '#f28cc8', 14, 5, 3);
        break;
      case 'boing': fx.sound('boing', 1.0, 1); puff(ex, ey, '#ffffff', 5, 3, 2.4); break;
      case 'splash': fx.sound('splash', 0.9, 1.2); fx.kick(6); puff(ex, ey - R(0.03), '#9fe0ff', 16, 5, 3); break;
      case 'boom':
        fx.sound('crack', 0.6, 1.3);
        fx.sound('thud', 0.45, 1.5);
        fx.kick(15);
        fx.blink('#ffb347', 0.38);
        puff(ex, ey - R(0.04), '#ffd166', 16, 6, 3.4);
        puff(ex, ey - R(0.04), '#ff6a3d', 10, 4.5, 3);
        break;
      case 'topple': fx.sound('whoosh', 0.7, 0.8); break;
      case 'shelfland': fx.sound('thud', 0.7, 1.1); fx.sound('crack', 1.1, 0.7); fx.kick(7); puff(ex, ey, '#ffd84a', 10, 4, 2.6); break;
      case 'skid': fx.sound('whoosh', 1.6, 0.6); break;
      case 'bowl': if (t - (fx.memo.bowlT ?? -99) > 4) (fx.memo.bowlT = t), fx.sound('pop', 1.3 + Math.min(10, e.n) * 0.06, 0.6), say(ex, ey - R(0.08), '볼링!', '#d6f4ff', 15); break;
      case 'wallbonk': fx.sound('thud', 1.2, 0.7); fx.kick(3); puff(ex, ey, '#ffffff', 4, 2.6, 2.2); break;
      case 'coin': if (t - (fx.memo.coinT ?? -99) > 5) (fx.memo.coinT = t), fx.sound('coin', 1 + hsh(e.t) * 0.3, 0.32); puff(ex, ey, '#ffd23f', 4, 2.6, 2.4); break;
      case 'peek': fx.sound('boing', 1.9, 0.65); fx.sound('tick', 2.2, 0.55); say(ex, ey - R(0.05), '망보기!', '#ffd0c8', 15); break;
      case 'alert': fx.sound('boing', 1.9, 0.5); fx.sound('tick', 2.2, 0.5); break;
      case 'leap': fx.sound('whoosh', 1.5, 0.7); break;
      case 'ouch':
        fx.sound('fail', 0.95, 1);
        fx.sound('thud', 1.4, 0.7);
        fx.kick(10);
        fx.blink('#ff3b30', 0.25);
        say(ex + R(0.12), ey - R(0.02), '아야! 하트 -1', '#ff8a7a', 18);
        break;
      case 'ring': if (t - (fx.memo.ringT ?? -99) > 4) (fx.memo.ringT = t), fx.sound('ding', e.n === s.c + 1 ? 1.0 : 1.25, 0.6); break;
      case 'kick': if (t - (fx.memo.kickT ?? -99) > 8) (fx.memo.kickT = t), fx.sound('boing', 1.3, 0.4); break;
      case 'wisp': if (t - (fx.memo.wispT ?? -99) > 8) (fx.memo.wispT = t), fx.sound('chime', 1.6, 0.35); break;
      case 'rope': if (t - (fx.memo.ropeT ?? -99) > 6) (fx.memo.ropeT = t), fx.sound('whoosh', 1.8, 0.3); break;
      case 'ropeland': if (t - (fx.memo.rlT ?? -99) > 6) (fx.memo.rlT = t), fx.sound('tick', 1.3, 0.3); break;
      case 'panic': fx.sound('shrink', 1.2, 0.8); say(w / 2, ey, `으앗! ${e.n}마리가 도망쳐요`, '#ffffff', 16); break;
      case 'jump': if (t - (fx.memo.jumpT ?? -99) > 6) (fx.memo.jumpT = t), fx.sound('whoosh', 1.4, 0.6); puff(ex, ey, '#f3dfb0', 3, 2, 2.2); break;
      case 'spook': fx.sound('tick', 1.6, 0.45); break;
      case 'scatter': fx.sound('boing', 1.6, 0.35); break;
      case 'enter': if (t - (fx.memo.entT ?? -99) > 20) (fx.memo.entT = t), fx.sound('tick', 0.9, 0.3); break;
      case 'flee': fx.sound('shrink', 1.3, 0.6); say(ex, ey, '도망!', '#ffffff', 14); break;
      case 'desc': fx.sound('whoosh', 0.6, 0.8); fx.sound('rewind', 0.8, 0.35); break;
      case 'arrive': fx.sound('thud', 1.8, 0.4); puff(ex, ey, '#f3dfb0', 4, 2, 2.2); break;
      case 'thump': fx.sound('thud', 0.8, 1); fx.kick(6); say(ex, ey - R(0.1), '으악… 쿵!', '#ffffff', 16); break;
      case 'vault': fx.sound('chime', 0.9, 0.7); break;
      case 'chest': fx.sound('chime', 1.2, 1); fx.sound('coin', 1.1, 0.9); puff(ex, ey - R(0.05), '#ffd84a', 18, 5, 3.2); fx.ring(ex, ey - R(0.05), '#ffe36b', R(0.18), 5); break;
      case 'star3': fx.sound('coin', 1.25, 1); puff(ex, ey, '#ffd84a', 14, 5.5, 3.2); fx.ring(ex, ey, '#ffd84a', R(0.2), 5); break;
      case 'summon': fx.sound('swell', 0.9, 0.8); say(ex, ey - R(0.06), '졸개들아!', '#ffd0c8', 17); break;
      case 'bonk': fx.sound('thud', 0.5, 1.4); fx.sound('boing', 0.6, 0.7); fx.kick(8); say(ex, ey - R(0.04), '대장 머리에 쿵!', '#ffe36b', 16); break;
      case 'collapse': fx.sound('crack', 0.5, 1.5); fx.sound('thud', 0.4, 1.5); fx.kick(18); fx.blink('#fff3c4', 0.5); break;
      case 'bossko': fx.sound('clear', 0.8, 1.2); fx.kick(14); puff(ex, ey - R(0.06), '#ffd84a', 20, 6, 3.4); puff(ex, ey - R(0.06), KCOL[k] ?? '#ffffff', 14, 5, 3); break;
      case 'twin': fx.sound('crack', 1.3, 0.7); break;
      case 'stage': fx.sound('ding', 1, 0.6); break;
      case 'clear':
        fx.sound('clear', 1, 1);
        puff(w * 0.3, h * 0.5, '#ffd84a', 16, 6, 3.2);
        puff(w * 0.7, h * 0.5, '#9ff0ff', 16, 6, 3.2);
        break;
      case 'pickopen': fx.sound('swell', 1.1, 0.9); break;
      case 'perk': fx.sound('coin', 1, 1); fx.sound('chime', 1.1, 0.9); puff(ex, ey, '#ffe36b', 16, 5, 3.2); break;
      case 'end': fx.sound(e.n ? 'clear' : 'fail', 0.9, 1); break;
    }
  }
  if (s.big && (fx.memo.bigT ?? -1) !== s.big.t && s.big.t > seenT) (fx.memo.bigT = s.big.t), fx.sound('chime', 1 + Math.min(10, s.big.n) * 0.04, 1), fx.blink('#fff6c8', 0.2), fx.kick(8);
  if (since('wave') > 9999) void 0;
  fx.memo.t = t;
  ctx.restore();
  drawHud(ctx, s, w, h);
}

/** 위·아래 띠와 띠 위에 뜨는 것(시작 띠 · 큰 순간 · 결과 · 둘 중 하나 · 끝) */
function drawHud(ctx: C2, s: TrapState, w: number, h: number) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const sc = typeof ctx.getTransform === 'function' ? Math.min(2, Math.max(1, Math.round(ctx.getTransform().a || 1))) : 1;
  const d = STAGES[s.stage];
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  const text = (str: string, x: number, y: number, fill: string, stroke = '', lw = 0) => {
    ctx.lineJoin = 'round';
    if (lw > 0) (ctx.lineWidth = lw), (ctx.strokeStyle = stroke), ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  };
  const INK = '#4b3020', MUTED = '#a08a70', CREAM = '#fff6dc';
  ctx.textBaseline = 'middle';
  // ── 위 띠: 판 · 이름 · 하트 · 별 · 너구리 레벨 ──
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, w, Y(TOP_Y));
  ctx.fillStyle = '#e3c48c';
  ctx.fillRect(0, Y(TOP_Y) - 2, w, 2);
  ell(ctx, X(0.062), Y(0.043), R(0.033), R(0.033));
  ctx.fillStyle = '#ff8a3d';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  font(0.046, 900);
  text(String(s.stage + 1), X(0.062), Y(0.045), '#ffffff');
  ctx.textAlign = 'left';
  font(0.042, 900);
  const nm = d.name.length > 7 ? d.name.replace('대장 ', '') : d.name;
  text(nm, X(0.115), Y(0.045), INK);
  const nw = ctx.measureText(nm).width;
  font(0.034, 700);
  text(`/ ${STAGES.length}`, X(0.115) + nw + R(0.012), Y(0.047), MUTED);
  for (let i = 0; i < 3; i++) {
    heartPath(ctx, X(0.585 + i * 0.048), Y(0.043), R(0.017));
    ctx.fillStyle = i < s.hearts ? '#ff4d5e' : '#e6d6bc';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  starPath(ctx, X(0.74), Y(0.042), R(0.022));
  ctx.fillStyle = '#ffc93c';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  font(0.04, 900);
  text(String(s.stars), X(0.768), Y(0.046), INK);
  drawRaccoon(ctx, X(0.865), Y(0.078), R(0.02), s.lv, 0, 0);
  font(0.036, 900);
  text(`Lv${s.lv}`, X(0.895), Y(0.046), '#5a5a78');

  // ── 아래 띠: 별 셋 · 한 줄 도움말 · 모은 것 ──
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, Y(BOT_Y), w, h - Y(BOT_Y));
  ctx.fillStyle = '#e3c48c';
  ctx.fillRect(0, Y(BOT_Y), w, 2);
  const words = STAR_WORDS(s), res = s.phase === 'result';
  const state = [res ? 1 : 0, s.lost > 0 ? -1 : res ? 1 : 0, s.star3 ? 1 : res ? -1 : 0];
  font(0.034, 800);
  const prog = s.bestVic > 0 && !s.star3 && !res ? ` ${s.bestVic}/${d.n}` : '';
  const labels = words.map((q, i) => q + (i === 2 ? prog : ''));
  const gap = R(0.012), pad = Math.min(R(0.06), (w - R(0.03) - gap * 2 - labels.reduce((a, q) => a + ctx.measureText(q).width, 0)) / 3);
  const ws = labels.map((q) => ctx.measureText(q).width + pad), total = ws.reduce((a, c) => a + c, 0) + gap * 2;
  let cx = (w - total) / 2;
  labels.forEach((q, i) => {
    const cw = ws[i], cy = Y(BOT_Y + 0.04), on = state[i] > 0, off = state[i] < 0;
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
    font(0.034, 800);
    text(q, cx + pad * 0.76, cy + 0.5, off ? '#b8a688' : INK);
    if (off) (ctx.fillStyle = '#b8a688'), ctx.fillRect(cx + pad * 0.72, cy, cw - pad, 1.5);
    cx += cw + gap;
  });
  ctx.textAlign = 'center';
  const danger = s.mons.some((m) => m.f === s.c && m.alert >= 0 && !m.dead);
  const boss = s.mons.find((m) => KD[m.k].boss && !m.dead && !m.ko);
  let tip = `${d.name}: ${d.news}`;
  if (s.phase === 'pick') tip = '보물방의 큰 물건 둘 중 하나를 톡!';
  else if (s.phase === 'result') tip = s.got === 3 ? '별 셋! 판 점수가 네 배' : '별이 많을수록 판 점수가 곱해져요';
  else if (s.phase === 'end') tip = s.won ? '탑 셋을 모두 무너뜨렸어요!' : '누르면 다시 해요';
  else if (s.stage === 0 && s.taps === 0) tip = '바닥을 톡! 그 줄의 함정문이 쩍 열려요';
  else if (danger) tip = '너구리 곁의 (!)를 떨어뜨려요 — 사다리 쪽을 톡!';
  else if (s.desc >= 0) tip = '층을 비웠다! 사다리로 쪼르르';
  else if (boss && s.c === s.nf - 2) tip = '대장 머리 위를 톡 — 쿵 게이지를 채워요';
  else if (s.stage === 0 && s.taps < 3) tip = '아래층 무리 위로 떨어뜨리면 바닥째 쩍!';
  else if (d.ch === 0) tip = '땡! 종이 울린 화덕으로 무리가 우르르 — 그 위를 톡';
  else if (d.ch === 1) tip = '공을 쫓는 무리 위를 톡 — 아무 데나 쿵 하면 흩어져요';
  else tip = '빛을 따라가는 무리 위를 톡 — 세 층이 겹친 줄!';
  font(0.035, 800);
  text(tip, w / 2, Y(BOT_Y + 0.098), INK);

  // ── 판 시작 띠 (NEW 한 줄) ──
  if (s.banner && s.phase === 'play' && !(s.big && s.big.t >= s.banner.t)) {
    const age = t - s.banner.t, T = 190;
    if (age < T) {
      const a = Math.min(1, age / 10, (T - age) / 14), slide = (1 - Math.min(1, age / 10)) * R(0.05), by = Y(TOP_Y + 0.012) - slide;
      ctx.globalAlpha = clamp(a, 0, 1);
      rr(ctx, X(0.05), by, R(0.9), R(0.112), R(0.03));
      ctx.fillStyle = 'rgba(255,250,235,.96)';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
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
      text(KD[d.key as K]?.boss ? '대장' : 'NEW', bx0 + pill / 2, by + R(0.034), '#ffffff');
      ctx.textAlign = 'left';
      font(0.039, 900);
      text(d.name, bx0 + pill + gap2, by + R(0.033), INK);
      ctx.textAlign = 'center';
      font(0.035, 800);
      text(s.banner.sub, w / 2, by + R(0.081), INK);
      ctx.globalAlpha = 1;
    }
  }

  // ── 큰 순간 띠 (한 번에 하나) ──
  if (s.big && t - s.big.t < BIG_T && s.phase !== 'end') {
    const age = t - s.big.t, pop = age < 7 ? 1.4 - 0.4 * (age / 7) : 1 + 0.03 * Math.sin(age * 0.5), a = Math.min(1, (BIG_T - age) / 10), n = s.big.n;
    const by = Y(BOT_Y - 0.13), size = 0.06 + Math.min(0.02, n * 0.001);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, by);
    ctx.rotate(-0.05);
    ctx.scale(1, 0.5);
    burstPath(ctx, 0, 0, R(0.32) * Math.min(1.15, pop), 18, 0.8, age * 0.02);
    ctx.fillStyle = 'rgba(255,244,170,.92)';
    ctx.fill();
    ctx.strokeStyle = '#ff8a3d';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.scale(1, 2);
    font(size, 900);
    ctx.save();
    ctx.scale(pop, pop);
    text(s.big.text, 0, s.big.star ? -R(0.022) : 0, '#ff5a2e', '#ffffff', 6);
    ctx.restore();
    if (s.big.star) {
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
    const cx0 = X(0.06), cy0 = Y(0.15) - slide, cw = R(0.88), chh = R(0.6);
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
    text(s.won ? '탑 셋을 다 무너뜨렸다!' : `${s.stage + 1}판 깼다!`, w / 2, cy0 + R(0.025), '#ffffff');
    for (let i = 0; i < 3; i++) {
      const at = 12 + i * 12, sx0 = X(0.23 + i * 0.27), sy0 = cy0 + R(0.125), on = s.starOk[i] && pt >= at, pp = on ? 1 + Math.max(0, 1 - (pt - at) / 8) * 0.6 : 1;
      starPath(ctx, sx0, sy0, R(0.052) * pp);
      ctx.fillStyle = on ? '#ffc93c' : '#eadfc8';
      ctx.fill();
      ctx.strokeStyle = on ? '#a06a12' : '#cdbd9c';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (on && (fx.memo['st' + i] ?? -1) !== s.stage) (fx.memo['st' + i] = s.stage), fx.sound('ding', 1 + i * 0.18, 0.9), fx.burst(sx0, sy0, '#ffd84a', 10, 3, 2.4);
      font(0.034, 800);
      const lab = STAR_WORDS(s)[i], cut = ctx.measureText(lab).width > R(0.26) ? lab.indexOf(' ', Math.floor(lab.length / 2) - 2) : -1;
      if (cut > 0) text(lab.slice(0, cut), sx0, sy0 + R(0.066), s.starOk[i] ? INK : '#b8a688'), text(lab.slice(cut + 1), sx0, sy0 + R(0.099), s.starOk[i] ? INK : '#b8a688');
      else text(lab, sx0, sy0 + R(0.078), s.starOk[i] ? INK : '#b8a688');
    }
    rr(ctx, X(0.12), cy0 + R(0.243), R(0.76), R(0.058), R(0.02));
    ctx.fillStyle = '#fff0cc';
    ctx.fill();
    font(0.044, 900);
    text(`+${fmt(s.gain)}점`, X(0.34), cy0 + R(0.273), '#d9480f');
    font(0.034, 800);
    text(`별 ${s.got}개 = 판 점수 ×${STAR_MUL[s.got]}`, X(0.66), cy0 + R(0.274), INK);
    // 너구리 레벨
    drawRaccoon(ctx, X(0.14), cy0 + R(0.37), R(0.026), s.lv, t, 3);
    ctx.textAlign = 'left';
    font(0.037, 900);
    const lvs = `너구리 Lv${s.lv - 1} → Lv${s.lv}`;
    text(lvs, X(0.19), cy0 + R(0.345), '#5a5a78');
    const lw0 = ctx.measureText(lvs).width;
    font(0.034, 700);
    text(LV_GIFT[s.lv] ?? '쿵 힘이 세져요', X(0.19) + lw0 + R(0.02), cy0 + R(0.347), LV_GIFT[s.lv] ? '#d9480f' : INK);
    // 보물 진열장 (12) — 이번 보물은 반짝, 다음 탑은 ?
    font(0.034, 800);
    text(`보물 ${s.loot.length}/${STAGES.length}: ${d.loot}!`, X(0.1), cy0 + R(0.405), '#d9480f');
    ctx.textAlign = 'right';
    text(`도감 ${s.dex.length}/${DEX.length}`, X(0.9), cy0 + R(0.405), MUTED);
    ctx.textAlign = 'center';
    for (let i = 0; i < STAGES.length; i++) {
      const px = X(0.115 + i * 0.07), py = cy0 + R(0.47), has = s.loot.includes(i), isNew = i === s.stage, next = i === s.stage + 1;
      rr(ctx, px - R(0.031), py - R(0.031), R(0.062), R(0.062), R(0.012));
      ctx.fillStyle = isNew ? '#ffe9a0' : has ? '#fff0cc' : '#f0e6d2';
      ctx.fill();
      ctx.strokeStyle = isNew ? '#e0a020' : '#d6c6a8';
      ctx.lineWidth = isNew ? 2 : 1;
      ctx.stroke();
      if (has) drawLoot(ctx, i, px, py - (isNew ? Math.abs(Math.sin(t * 0.18)) * R(0.008) : 0), R(0.02));
      else if (next) (font(0.036, 900), text('?', px, py, '#ff8a3d', '#ffffff', 3));
    }
    // 도감 줄 (떨어뜨려 본 몬스터)
    DEX.forEach((e, i) => {
      const has = s.dex.includes(e.key), isNew = s.newDex.includes(e.key), u = R(KD[e.k].boss ? 0.012 : 0.015), px = X(0.2 + i * 0.085), py = cy0 + R(0.555);
      if (isNew) (ell(ctx, px, py - u * 1.4, u * 2, u * 2), (ctx.fillStyle = '#ffe9a0'), ctx.fill());
      ctx.save();
      ctx.translate(px, py);
      stamp(ctx, has ? sprite(e.k, M_HAPPY, e.v, 0, Math.round(u * sc)) : silhouette(e.k, e.v, Math.round(u * sc)), u);
      ctx.restore();
    });
    font(0.037, 900);
    const nx: SDef | undefined = STAGES[s.stage + 1];
    if (pt >= RES_MIN) text(s.won ? '톡!' : d.boss && d.ch < PERKS.length ? '톡 하면 장 끝 선물!' : '톡 하면 다음 탑', w / 2, cy0 + chh - R(0.03), (t >> 3) % 2 ? '#d9480f' : '#ff8a3d');
    else if (nx) text(d.boss ? `다음: ${CHAPTERS[nx.ch]}` : `다음 탑엔 NEW ${nx.name}`, w / 2, cy0 + chh - R(0.03), MUTED);
    ctx.globalAlpha = 1;
  }

  // ── 장 끝: 둘 중 하나 (보물방 바닥의 큰 물건) ──
  if (s.phase === 'pick') {
    const pt = s.pt, picked = s.picked, opts = PERKS[d.ch];
    ctx.fillStyle = 'rgba(40,25,15,.35)';
    ctx.fillRect(0, Y(TOP_Y), w, Y(BOT_Y) - Y(TOP_Y));
    rr(ctx, X(0.08), Y(0.16), R(0.84), R(0.105), R(0.03));
    ctx.fillStyle = 'rgba(255,250,235,.96)';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    font(0.042, 900);
    text(`${CHAPTERS[d.ch]} 끝! 선물 하나`, w / 2, Y(0.193), '#d9480f');
    font(0.035, 800);
    text(picked < 0 ? '보물방의 큰 물건 둘 중 하나를 톡!' : opts[picked].long, w / 2, Y(0.237), INK);
    opts.forEach((o, i) => {
      const px = X(i ? 0.72 : 0.28), drop = picked < 0 ? Math.max(0, 1 - pt / 16) : 0, py = Y(0.82) - drop * drop * R(0.5);
      const chosen = picked === i, other = picked >= 0 && !chosen, k = R(0.16) * (chosen ? 1 + 0.15 * Math.sin(Math.min(1, pt / 12) * Math.PI) : 1);
      ctx.globalAlpha = other ? Math.max(0, 1 - pt / 20) : 1;
      ctx.fillStyle = 'rgba(50,35,10,.3)';
      ell(ctx, px, Y(0.825), R(0.15), R(0.035));
      ctx.fill();
      if (picked < 0 && pt >= PICK_MIN) {
        ell(ctx, px, Y(0.825), R(0.18 + 0.012 * Math.sin(t * 0.2)), R(0.05));
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.setLineDash([7, 6]);
        ctx.lineDashOffset = -t * 0.5;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      drawPerk(ctx, d.ch, i, px, py, k, t);
      rr(ctx, px - R(0.205), Y(0.875), R(0.41), R(0.105), R(0.025));
      ctx.fillStyle = chosen ? '#ffe9a0' : 'rgba(255,250,235,.96)';
      ctx.fill();
      ctx.strokeStyle = chosen ? '#e0a020' : INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      font(0.04, 900);
      text(o.name, px, Y(0.91), '#d9480f');
      font(0.034, 800);
      text(o.line, px, Y(0.952), INK);
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
    drawRaccoon(ctx, w / 2, Y(0.6), R(0.07), s.lv, t, s.won ? 3 : 2);
    font(0.052, 900);
    text(s.won ? '몬스터 탑 셋을 다 무너뜨렸다!' : '너구리가 들켰어요…', w / 2, Y(0.665), '#d9480f');
    font(0.04, 800);
    text(`${s.won ? STAGES.length : s.stage + 1}판 · 별 ${s.stars}/${STAGES.length * 3} · 보물 ${s.loot.length}/${STAGES.length}`, w / 2, Y(0.73), INK);
    font(0.06, 900);
    text(`${fmt(s.pts + s.sp)}점`, w / 2, Y(0.81), INK);
    font(0.035, 700);
    text(s.won ? `너구리 Lv${s.lv} — 전설의 꼬마 도둑!` : '다시 하면 더 깊이 내려갈 수 있어요', w / 2, Y(0.875), MUTED);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'center';
}
/** 스크린샷·모음 그림용 (게임에서는 쓰지 않는다) */
export const __art = { sprite, stamp, drawRaccoon, drawPerk, drawLoot, silhouette };
