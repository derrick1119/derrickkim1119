/**
 * 🐭 치즈 도둑 생쥐 (43라운드: 오너가 메뉴에서 고른 놀이 4) — 몰래 훔치기 × 가리키기 × 도감.
 * 메뉴 약속(그대로): 고양이 열 마리가 지키는 부엌에서 치즈를 훔쳐요 — 톡 한 곳으로 생쥐가 쪼르르, 고양이 눈길(노란 빛)을 피해 찻잔 뒤에 숨고,
 *   들키면 온 부엌이 와장창 추격전. 첫 톡에 생쥐가 찻잔 뒤로 쏙, 코앞을 고양이가 하품하며 지나가요. 언제 움직일지는 고르지만 박자 맞추기는 없음.
 * 조작은 톡 하나: 톡한 곳에서 가장 가까운 것(둘레 화면 폭 15%)으로 생쥐가 길을 저절로 찾아 쪼르르 —
 *   치즈 = 덥석(보따리에) · 숨을 곳(찻잔·냄비·식빵 봉지·쿠션…) = 쏙(안 보임) · 쥐구멍 = 보따리 저장(판 점수) · 소리 물건 = 툭! 날아가 땡그랑(근처 고양이가 그쪽으로)
 *   · 로봇 청소기 = 올라타기(고양이들이 도망) · 아무것도 없는 바닥 = 거기로.
 * 고양이: 정해진 길을 느리게 어슬렁(바닥에 옅은 발자국), 앞으로 노란 눈길 부채꼴(가구에 가려진다). 눈길에 들면 머리 위 '?'가 0.8초 동안 차오르고
 *   (그 안에 숨거나 벗어나면 '어 아닌가' 하품) 다 차면 '!' → 추격. 추격은 웃기게: 모퉁이에서 미끄러지고, 그릇·냄비를 와장창 엎고(소리에 다른 고양이가 돌아봄),
 *   다른 고양이와 쿵 부딪쳐 어질어질. 잡히면 보따리 치즈가 사방으로 흩어지고 하트 -1(1판은 안 잃음), 생쥐는 쥐구멍에서 다시.
 * 고양이마다 버릇: 줄무늬·잿빛이(보통) · 졸보(자다 깨다, Zzz가 작아지면 곧 깸) · 눈 밝은 놈(안경, 눈길이 길다) · 냄새 맡는 놈(큰 보따리를 킁킁 따라오고 숨어도 찾아냄)
 *   · 파티 고양이(케이크 둘레 기차) · 등대 고양이(캣타워에서 눈길이 빙글빙글) · 까망이(날쌤) · 샴 공주(갸웃갸웃) · 뚱보 왕(섬 위에서 낮잠, 깨면 온 부엌을 데굴데굴).
 * 판 12개(장 3 × 4판, 장 끝은 큰 판): 아침 부엌(찻잔 → 숟가락 → 졸보 → 뚱보 왕) → 거실(안경 → 청소기 → 냄새 → 생일 파티) → 고양이 카페(털실 → 등대 → 밥그릇 → 열 마리).
 *   정답 없음: 길은 여러 갈래, 숨기·꾀기·뛰기를 어떻게 섞어도 된다. 보따리가 클수록 느리고(냄새도 나고) 점수는 조각 수의 제곱.
 * 성장(저절로): 판을 깨면 생쥐 레벨 +1(빠르기·모습: 목도리 → 모자 → 망토 → 왕관) · 쥐구멍 마을에 집이 하나씩(빵집·도서관·놀이터…)
 *   · 장 끝에 큰 물건 둘 중 하나를 톡(골무 투구 / 방울 장난감 · 롤러스케이트 / 치즈 자석) · 도감 = 만난 고양이 10 · 맛본 치즈 8.
 * 별(쉬운 말 셋): 치즈 다 훔치기 · 안 잡히기 · 판마다 다른 솜씨(한 보따리에 N조각 · 한 번에 N마리 꾀기 · 왕 안 깨우기 · 안 들키기 …).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5, TAU = Math.PI * 2;
/** 바닥(3/4 시점): 화면 좌표(가로 폭 = 1). 세로는 YS배로 눌려 있다 — 거리는 늘 dist()로 */
const YS = 0.84;
/** 바닥 칸: 19×19. 칸 너비 · 칸 높이(화면) · 바닥 위쪽 끝(뒷벽 밑) */
const COLS = 19, ROWS = 19, GX0 = 0.025, CW = 0.05, GY0 = 0.36, CH = 0.93 / 19, CELLS = COLS * ROWS;
const FY1 = GY0 + ROWS * CH;
/** 결과 화면: 톡 받기 시작 · 저절로 넘어감 / 둘 중 하나: 톡 받기 시작 · 저절로 고름 · 고른 뒤 */
const RES_MIN = 90, RES_AUTO = 60 * 60 * 30, PICK_MIN = 40, PICK_AUTO = 60 * 60 * 30, PICK_AFTER = 64, END_T = 210;
const CLEAR_PTS = 30, STAR_MUL = [1, 1, 2, 4], WIN_PTS = 100;
/** 톡 판정 반지름(화면 폭 15%) */
const PICK_R = 0.15;
/** 고양이: '?'가 차는 틱 · '!' 뜀 · 두리번 · 하품 · 소리 물건 앞에서 노는 시간 · 어질 · 우쭐 · 놀라 도망 · 들여다보기 · 추격 지침 */
const SUS_T = 40, ALERT_T = 24, SEARCH_T = 70, YAWN_T = 46, PLAY_T = 150, DIZZY_T = 120, HAPPY_T = 70, FLEE_T = 80, PEEK_T = 32, CHASE_MAX = 330;
/** 와락 덮치기: 거리 · 날아가는 틱 · 헛방 뒤 쉼 */
const POUNCE_R = 0.1, POUNCE_T = 13, MISS_T = 26;
/** 생쥐: 기본 빠르기 · 잡힌 뒤 쥐구멍까지 · 지나가며 줍는 거리 */
const M_SPD = 0.0074, CAUGHT_T = 60, GRAB_R = 0.034, GRAB_T = 14;
/** 고양이 빠르기: 볼일 보러 가기 · 도망 · 추격(판마다 배수) · 잡는 거리 · 서로 부딪는 거리 · 물건을 엎는 거리 */
const C_GO = 0.0044, C_FLEE = 0.0062, CATCH_R = 0.05, BONK_R = 0.072, KNOCK_R = 0.07;
/** 소리 물건이 부르는 거리 · 냄새 맡는 거리 · 냄새 나는 보따리 크기 · 청소기 빠르기 · 청소기를 무서워하는 거리 */
const NOISE_R = 0.34, SMELL_R = 0.42, SMELL_BAG = 3, VAC_SPD = 0.0034, VAC_R = 0.14;
/** 졸보: 깨어 있는 틱 · 자는 틱 / 등대 고양이: 한 바퀴 틱 / 뚱보 왕: 깨는 눈금 · 데굴데굴 틱 */
const AWAKE_T = 230, SLEEP_T = 330, TOWER_T = 460, KING_WAKE = 3, ROLL_T = 330;

// ───────────────────────────── 재료 ─────────────────────────────
export type CatK = 'tabby' | 'gray' | 'sleepy' | 'specs' | 'sniff' | 'party' | 'tower' | 'black' | 'siam' | 'king';
interface CatKD { name: string; line: string; vr: number; va: number; walk: number; run: number; sway: number }
export const KD: Record<CatK, CatKD> = {
  tabby: { name: '줄무늬', line: '느릿느릿 순찰', vr: 0.23, va: 0.62, walk: 0.0026, run: 1, sway: 0.6 },
  gray: { name: '잿빛이', line: '느긋한 순찰', vr: 0.22, va: 0.62, walk: 0.0024, run: 0.96, sway: 0.5 },
  sleepy: { name: '졸보', line: '자다 깨다 — Zzz가 작아지면 곧 깨요', vr: 0.2, va: 0.7, walk: 0.0021, run: 0.9, sway: 0.8 },
  specs: { name: '눈 밝은 놈', line: '안경 너머 멀리까지 봐요', vr: 0.38, va: 0.34, walk: 0.0024, run: 1, sway: 0.5 },
  sniff: { name: '냄새 맡는 놈', line: '큰 보따리는 숨어도 킁킁 찾아내요', vr: 0.15, va: 0.7, walk: 0.0025, run: 1, sway: 0.4 },
  party: { name: '파티 고양이', line: '케이크 둘레를 기차놀이', vr: 0.21, va: 0.52, walk: 0.0027, run: 1, sway: 0.2 },
  tower: { name: '등대 고양이', line: '캣타워에서 눈길이 빙글빙글', vr: 0.34, va: 0.42, walk: 0.0026, run: 1, sway: 0 },
  black: { name: '까망이', line: '날쌘 순찰', vr: 0.23, va: 0.6, walk: 0.0033, run: 1.08, sway: 0.5 },
  siam: { name: '샴 공주', line: '고개를 갸웃갸웃 넓게 봐요', vr: 0.24, va: 0.6, walk: 0.0024, run: 1, sway: 1.15 },
  king: { name: '뚱보 왕', line: '섬 위 낮잠 — 깨면 온 부엌을 데굴데굴', vr: 0.2, va: Math.PI, walk: 0.0062, run: 1, sway: 0 },
};
export const CAT_DEX: CatK[] = ['tabby', 'gray', 'sleepy', 'king', 'specs', 'sniff', 'party', 'black', 'tower', 'siam'];
export type QK = 'ched' | 'swiss' | 'mozz' | 'gouda' | 'brie' | 'blue' | 'cake' | 'parm';
export const QD: Record<QK, { name: string; col: string }> = {
  ched: { name: '체다', col: '#ffc531' },
  swiss: { name: '구멍 치즈', col: '#ffe066' },
  mozz: { name: '모차렐라', col: '#fffaf0' },
  gouda: { name: '고다 바퀴', col: '#ffb02e' },
  brie: { name: '브리', col: '#fff3d6' },
  blue: { name: '블루 치즈', col: '#eaf0ff' },
  cake: { name: '치즈케이크', col: '#fff0c2' },
  parm: { name: '파르메산', col: '#ffd98a' },
};
export const Q_DEX: QK[] = ['ched', 'swiss', 'mozz', 'gouda', 'brie', 'blue', 'cake', 'parm'];
export type HK = 'cup' | 'pot' | 'bread' | 'boot' | 'cushion' | 'slipper' | 'box' | 'bag' | 'basket';
export const HD: Record<HK, string> = { cup: '찻잔', pot: '냄비', bread: '식빵 봉지', boot: '장화', cushion: '쿠션', slipper: '실내화', box: '선물 상자', bag: '종이 봉투', basket: '바구니' };
export type LK = 'spoon' | 'egg' | 'lid' | 'balloon' | 'yarn' | 'bowl';
export const LD: Record<LK, { name: string; r: number; once: boolean; fly: number }> = {
  spoon: { name: '숟가락', r: NOISE_R, once: false, fly: 26 },
  egg: { name: '달걀', r: NOISE_R, once: true, fly: 46 },
  lid: { name: '냄비 뚜껑', r: 0.4, once: false, fly: 40 },
  balloon: { name: '풍선', r: 0.33, once: true, fly: 1 },
  yarn: { name: '털실 공', r: 0.3, once: true, fly: 170 },
  bowl: { name: '밥그릇 종', r: 9, once: true, fly: 1 },
};
export type FK = 'island' | 'fridge' | 'plant' | 'table' | 'bin' | 'sofa' | 'ctable' | 'armchair' | 'chest' | 'lamp' | 'tower' | 'rtable' | 'counter';
type CK = 'pan' | 'plates' | 'books' | 'blocks' | 'cups';

interface Room { name: string; hole: number; furn: [FK, number, number, number, number][]; clutter: [CK, number, number][] }
export const ROOMS: Room[] = [
  {
    name: '아침 부엌', hole: 3,
    furn: [['island', 7, 7, 11, 9], ['fridge', 15, 0, 18, 1], ['plant', 0, 13, 1, 14], ['table', 13, 12, 15, 14], ['bin', 17, 8, 18, 9]],
    clutter: [['pan', 12, 8], ['plates', 6, 10], ['cups', 16, 15]],
  },
  {
    name: '거실', hole: 12,
    furn: [['sofa', 1, 0, 6, 2], ['ctable', 7, 8, 11, 10], ['armchair', 15, 4, 17, 6], ['plant', 17, 14, 18, 15], ['chest', 0, 14, 2, 15], ['lamp', 15, 0, 15, 0]],
    clutter: [['books', 6, 11], ['blocks', 12, 7], ['cups', 14, 13]],
  },
  {
    name: '고양이 카페', hole: 5,
    furn: [['tower', 1, 4, 2, 5], ['tower', 16, 9, 17, 10], ['rtable', 7, 6, 8, 7], ['rtable', 11, 12, 12, 13], ['counter', 12, 0, 18, 1], ['plant', 0, 16, 1, 17]],
    clutter: [['cups', 9, 8], ['plates', 13, 11], ['blocks', 4, 12]],
  },
];

/** 고양이 하나: 종류 · 순찰 길(칸) · 왕복인가 · 출발 위치(길 비율) · 졸보 시작 틱 */
interface CatSpec { k: CatK; r: [number, number][]; pp?: boolean; at?: number; zz?: number }
type StarK = 'bag' | 'lure' | 'nowake' | 'unseen' | 'ride' | 'scare' | 'yarn' | 'bowl';
interface StageDef {
  name: string; ch: number; key: string; news: string;
  cats: CatSpec[];
  hides: [HK, number, number][];
  lures: [LK, number, number, number, number][];
  cheese: [QK, number, number, number?][];
  vac?: [number, number][];
  king?: [number, number][];
  star: { k: StarK; n: number };
  /** 추격 빠르기 배수 */
  chase: number;
}
export const CHAPTERS = ['아침 부엌', '거실', '고양이 카페'];
const c = (k: CatK, r: [number, number][], pp = false, at = 0, zz = 0): CatSpec => ({ k, r, pp, at, zz });
/** 판 12개. 칸 좌표 (열, 줄) — 줄 0이 뒷벽 밑 */
export const STAGES: StageDef[] = [
  {
    name: '찻잔', ch: 0, key: 'hide', news: '찻잔을 톡 — 쏙 숨으면 고양이가 못 봐요',
    cats: [c('tabby', [[9, 3], [2, 3], [12, 3]], true, 0), c('gray', [[12, 6], [16, 6], [17, 11], [17, 16], [10, 16], [10, 11]], false, 0.15)],
    hides: [['cup', 5, 2], ['pot', 12, 10], ['bread', 4, 14]],
    lures: [],
    cheese: [['ched', 2, 8], ['ched', 15, 3], ['ched', 7, 15], ['ched', 14, 17]],
    star: { k: 'bag', n: 2 }, chase: 0.76,
  },
  {
    name: '숟가락', ch: 0, key: 'lure', news: '숟가락을 톡 — 땡그랑! 고양이들이 그쪽으로',
    cats: [c('tabby', [[4, 5], [14, 5]], true, 0.5), c('gray', [[3, 11], [11, 11], [11, 16], [3, 16]], false, 0), c('tabby', [[16, 3], [16, 16]], true, 0.2)],
    hides: [['cup', 6, 2], ['pot', 12, 13], ['bread', 2, 9]],
    lures: [['spoon', 9, 5, 17, 13], ['spoon', 5, 17, 13, 17]],
    cheese: [['ched', 10, 2], ['swiss', 2, 14], ['swiss', 14, 9], ['ched', 8, 15], ['swiss', 17, 4]],
    star: { k: 'lure', n: 2 }, chase: 0.8,
  },
  {
    name: '졸보', ch: 0, key: 'sleepy', news: '졸보는 자다 깨다 — Zzz가 작아지면 곧 깨요',
    cats: [c('sleepy', [[6, 4], [10, 4]], true, 0, 120), c('sleepy', [[4, 13], [4, 9]], true, 0, 300), c('tabby', [[12, 10], [16, 10], [16, 16], [10, 16]], false, 0.5), c('gray', [[14, 3], [12, 6]], true, 0)],
    hides: [['cup', 2, 4], ['pot', 9, 11], ['bread', 17, 6], ['boot', 6, 16]],
    lures: [['spoon', 12, 4, 6, 1]],
    cheese: [['ched', 8, 3], ['swiss', 1, 11], ['brie', 7, 11], ['brie', 15, 10], ['ched', 12, 16], ['swiss', 13, 4]],
    star: { k: 'bag', n: 4 }, chase: 0.95,
  },
  {
    name: '뚱보 왕', ch: 0, key: 'king', news: '섬 위 낮잠 — 깨면 온 부엌을 데굴데굴',
    cats: [c('tabby', [[3, 5], [3, 15]], true, 0.2), c('sleepy', [[15, 4], [12, 4]], true, 0, 200), c('gray', [[12, 15], [17, 15], [17, 11], [12, 11]], false, 0)],
    hides: [['cup', 6, 2], ['pot', 5, 11], ['bread', 13, 6], ['boot', 9, 16]],
    lures: [['spoon', 1, 2, 1, 17], ['lid', 17, 17, 16, 3]],
    cheese: [['gouda', 6, 6], ['gouda', 12, 6], ['gouda', 6, 10], ['gouda', 12, 10], ['gouda', 9, 11], ['ched', 1, 9], ['ched', 17, 13]],
    king: [[6, 6], [12, 6], [12, 10], [6, 10]],
    star: { k: 'nowake', n: 0 }, chase: 1,
  },
  {
    name: '안경 고양이', ch: 1, key: 'specs', news: '안경 고양이는 멀리까지 봐요 — 가구 뒤로',
    cats: [c('specs', [[9, 4], [9, 15]], true, 0.3), c('tabby', [[3, 6], [3, 12], [6, 12], [6, 6]], false, 0), c('gray', [[13, 11], [17, 11], [17, 17], [13, 17]], false, 0.5)],
    hides: [['cushion', 7, 3], ['slipper', 12, 12], ['cushion', 1, 9], ['box', 16, 8]],
    lures: [['spoon', 13, 4, 5, 16]],
    cheese: [['mozz', 4, 4], ['mozz', 14, 2], ['brie', 12, 9], ['mozz', 2, 16], ['brie', 9, 17], ['mozz', 17, 13]],
    star: { k: 'unseen', n: 0 }, chase: 1,
  },
  {
    name: '로봇 청소기', ch: 1, key: 'vac', news: '청소기를 톡 — 올라타면 고양이들이 도망쳐요',
    cats: [c('tabby', [[4, 4], [4, 12]], true, 0), c('specs', [[13, 15], [5, 15]], true, 0.5), c('gray', [[14, 8], [17, 8], [17, 12], [13, 12]], false, 0), c('sleepy', [[9, 4], [12, 4]], true, 0, 150)],
    hides: [['cushion', 7, 3], ['slipper', 2, 9], ['box', 13, 10], ['cushion', 9, 13]],
    lures: [['spoon', 16, 2, 6, 6]],
    cheese: [['mozz', 3, 3], ['brie', 6, 6], ['mozz', 12, 6], ['brie', 6, 12], ['mozz', 12, 12], ['brie', 16, 16], ['mozz', 1, 16]],
    vac: [[4, 6], [14, 6], [14, 12], [4, 12]],
    star: { k: 'ride', n: 3 }, chase: 1.02,
  },
  {
    name: '냄새 맡는 놈', ch: 1, key: 'sniff', news: '보따리가 크면 킁킁 — 숨어도 찾아내요',
    cats: [c('sniff', [[13, 13], [13, 4]], true, 0.4), c('specs', [[3, 6], [12, 6]], true, 0), c('tabby', [[4, 12], [4, 17], [10, 17], [10, 12]], false, 0.3), c('gray', [[16, 9], [16, 17]], true, 0.6)],
    hides: [['cushion', 8, 3], ['slipper', 1, 10], ['box', 13, 9], ['basket', 7, 14], ['cushion', 17, 2]],
    lures: [['spoon', 11, 2, 2, 5], ['egg', 15, 16, 7, 17]],
    cheese: [['blue', 3, 3], ['blue', 11, 4], ['brie', 6, 11], ['blue', 1, 17], ['brie', 12, 16], ['blue', 17, 12], ['brie', 15, 7]],
    star: { k: 'bag', n: 5 }, chase: 1.04,
  },
  {
    name: '생일 파티', ch: 1, key: 'party', news: '고양이 기차 — 풍선을 톡 하면 펑! 깜짝',
    cats: [c('party', [[6, 7], [12, 7], [12, 11], [6, 11]], false, 0), c('party', [[6, 7], [12, 7], [12, 11], [6, 11]], false, 0.25), c('party', [[6, 7], [12, 7], [12, 11], [6, 11]], false, 0.5), c('party', [[6, 7], [12, 7], [12, 11], [6, 11]], false, 0.75), c('specs', [[2, 4], [2, 16]], true, 0.5)],
    hides: [['box', 4, 4], ['box', 14, 4], ['box', 4, 14], ['box', 14, 14], ['cushion', 9, 3]],
    lures: [['balloon', 5, 9, 5, 9], ['balloon', 13, 9, 13, 9], ['balloon', 9, 13, 9, 13]],
    cheese: [['cake', 7, 8], ['cake', 11, 8], ['cake', 8, 11], ['cake', 10, 11], ['cake', 9, 7], ['brie', 17, 17], ['mozz', 17, 3]],
    star: { k: 'scare', n: 3 }, chase: 1.04,
  },
  {
    name: '털실 공', ch: 2, key: 'yarn', news: '털실 공을 톡 — 데굴데굴, 고양이들이 졸졸',
    cats: [c('black', [[3, 9], [10, 9], [10, 15], [3, 15]], false, 0), c('siam', [[13, 4], [13, 9]], true, 0.3), c('tabby', [[15, 13], [15, 17], [8, 17]], true, 0.5), c('gray', [[9, 3], [9, 5], [4, 7]], true, 0)],
    hides: [['basket', 10, 3], ['cushion', 3, 11], ['bag', 14, 7], ['cushion', 9, 11], ['box', 18, 16]],
    lures: [['yarn', 6, 10, 15, 16], ['spoon', 16, 5, 6, 1]],
    cheese: [['parm', 3, 2], ['parm', 7, 9], ['ched', 14, 11], ['parm', 6, 17], ['ched', 17, 3], ['parm', 12, 16], ['ched', 2, 14]],
    star: { k: 'yarn', n: 2 }, chase: 1.06,
  },
  {
    name: '등대 고양이', ch: 2, key: 'tower', news: '캣타워 위 등대 고양이 — 눈길이 빙글빙글',
    cats: [c('tower', [[3, 5]], false, 0), c('tower', [[15, 10]], false, 0.5), c('black', [[6, 13], [12, 13], [12, 17], [6, 17]], false, 0), c('siam', [[10, 3], [10, 9]], true, 0.5)],
    hides: [['basket', 7, 2], ['cushion', 1, 9], ['bag', 13, 8], ['cushion', 6, 10], ['box', 17, 16]],
    lures: [['spoon', 4, 16, 14, 3], ['yarn', 9, 12, 2, 16]],
    cheese: [['parm', 2, 2], ['ched', 12, 4], ['parm', 4, 8], ['ched', 17, 6], ['parm', 9, 14], ['ched', 14, 15], ['parm', 1, 15], ['ched', 17, 13]],
    star: { k: 'bag', n: 5 }, chase: 1.08,
  },
  {
    name: '밥그릇 종', ch: 2, key: 'bowl', news: '밥그릇을 톡 — 땡땡! 모두 밥 먹으러 우르르',
    cats: [c('tower', [[15, 10]], false, 0.25), c('black', [[3, 9], [10, 9], [10, 15], [3, 15]], false, 0.5), c('siam', [[13, 3], [13, 8]], true, 0), c('sleepy', [[6, 3], [9, 3]], true, 0, 100), c('sniff', [[15, 16], [8, 16]], true, 0.3), c('specs', [[3, 6], [3, 17]], true, 0.6)],
    hides: [['basket', 10, 2], ['cushion', 1, 12], ['bag', 13, 9], ['cushion', 6, 11], ['box', 17, 17]],
    lures: [['bowl', 9, 10, 9, 10], ['spoon', 17, 4, 7, 17]],
    cheese: [['ched', 2, 2], ['parm', 12, 5], ['ched', 6, 7], ['parm', 17, 7], ['ched', 4, 15], ['parm', 11, 16], ['ched', 14, 13], ['parm', 1, 9]],
    star: { k: 'bowl', n: 4 }, chase: 1.08,
  },
  {
    name: '고양이 열 마리', ch: 2, key: 'ten', news: '고양이 열 마리 카페 — 몽땅 털어 보자!',
    cats: [
      c('tower', [[3, 5]], false, 0), c('tower', [[15, 10]], false, 0.5), c('black', [[5, 9], [10, 9], [10, 15], [5, 15]], false, 0),
      c('siam', [[13, 3], [13, 8]], true, 0.5), c('sleepy', [[7, 3], [10, 3]], true, 0, 80), c('sleepy', [[2, 13], [2, 10]], true, 0, 260),
      c('sniff', [[15, 16], [8, 17]], true, 0.3), c('specs', [[17, 3], [17, 7]], true, 0), c('tabby', [[13, 14], [13, 17]], true, 0.4), c('gray', [[7, 11], [9, 12]], true, 0.6),
    ],
    hides: [['basket', 10, 2], ['cushion', 1, 8], ['bag', 14, 6], ['cushion', 6, 12], ['box', 17, 17], ['basket', 3, 17]],
    lures: [['bowl', 9, 10, 9, 10], ['yarn', 5, 6, 16, 15], ['balloon', 15, 3, 15, 3]],
    cheese: [['ched', 1, 2], ['parm', 11, 4], ['gouda', 4, 7], ['blue', 17, 5], ['mozz', 8, 14], ['parm', 12, 10], ['cake', 15, 13], ['swiss', 1, 15], ['brie', 11, 17]],
    star: { k: 'bag', n: 6 }, chase: 1.1,
  },
];
export const STAGE_COUNT = STAGES.length;
/** 장 끝 둘 중 하나 (세상 속 큰 물건) */
export const PERKS: { name: string; line: string }[][] = [
  [{ name: '골무 투구', line: '판마다 한 번은 잡혀도 땡!' }, { name: '방울 장난감', line: '땡그랑이 더 멀리·오래' }],
  [{ name: '롤러스케이트', line: '생쥐가 더 빨리 쪼르르' }, { name: '치즈 자석', line: '줍는 김에 둘레 치즈도 쏙' }],
];
/** 쥐구멍 마을: 판을 깰 때마다 하나씩 */
export const TOWN = ['치즈 창고', '빵집', '우체국', '도서관', '놀이터', '시계탑', '학교', '극장', '온천', '기차역', '꽃밭', '치즈 성'];

// ───────────────────────────── 상태 ─────────────────────────────
interface P { x: number; y: number }
/** 생쥐: 쥐구멍 · 달림 · 서 있음 · 숨음 · 청소기 탐 · 잡힘 */
const HOLE = 0, RUN = 1, IDLE = 2, HIDE = 3, RIDE = 4, CAUGHT = 5;
type TgK = 'cheese' | 'hide' | 'hole' | 'lure' | 'vac' | 'floor';
interface Tgt { k: TgK; id: number; x: number; y: number }
interface Mouse {
  x: number; y: number; st: number; mt: number; path: P[]; pi: number; tgt: Tgt | null; hide: number; bag: number; bagK: QK[];
  face: number; dir: number; at: number; trail: P[]; hop: number; popT: number;
  /** 덥석 넣는 동안 (서 있음) · 그동안 톡한 곳 */
  busy: number; next: Tgt | null; vx: number; vy: number;
}
/** 고양이 몸짓 */
const PATROL = 0, PAUSE = 1, SUSP = 2, ALERT = 3, CHASE = 4, SEARCH = 5, YAWN = 6, GO = 7, PLAY = 8, DIZZY = 9, HAPPY = 10, SLEEP = 11, FLEE = 12, PEEK = 13, ROLL = 14, FOLLOW = 15, EAT = 16, HOLD = 17, POUNCE = 18, MISS = 19;
interface Cat {
  id: number; k: CatK; x: number; y: number; face: number; look: number;
  mode: number; mt: number; prev: number; path: P[]; pi: number;
  route: P[]; stop: boolean[]; ri: number; pp: boolean; rdir: number; pauseT: number;
  sus: number; susMax: number; lx: number; ly: number; seeT: number; chaseT: number; repath: number; slip: number;
  gx: number; gy: number; after: number; playT: number; awake: number; sleepLen: number; meter: number; follow: number; peekCool: number;
  hx: number; hy: number; jx: number; jy: number;
  // 연출
  seed: number; walkT: number; flip: number; hitT: number; jumpT: number;
}
interface Hide { id: number; k: HK; x: number; y: number; shake: number }
interface Lure {
  id: number; k: LK; x: number; y: number; ax: number; ay: number; bx: number; by: number; side: number;
  fly: { t: number; T: number; x0: number; y0: number; x1: number; y1: number } | null; cool: number; used: boolean; spin: number;
}
interface Cheese { id: number; k: QK; x: number; y: number; v: number; born: number; fx: number; fy: number }
interface Clutter { k: CK; x: number; y: number; knocked: number; vx: number; vy: number }
interface Vac { x: number; y: number; route: P[]; ri: number; face: number }
interface Ev { t: number; k: string; x: number; y: number; n: number; x2: number; y2: number; text: string }

export interface MouseState {
  rng: Rng; seed: number; t: number; st: number; stage: number; phase: 'play' | 'result' | 'pick' | 'end'; pt: number;
  hearts: number; pts: number; sp: number; stars: number; got: number; starOk: boolean[]; dead: boolean; won: boolean;
  lv: number; perk: number[]; picked: number; dexC: CatK[]; dexQ: QK[]; newDex: string[]; town: number; total: number; gain: number;
  blk: Uint8Array; cblk: Uint8Array; hx: number; hy: number; hc: number;
  m: Mouse; cats: Cat[]; hides: Hide[]; lures: Lure[]; cheese: Cheese[]; clutter: Clutter[]; vac: Vac | null;
  nid: number; events: Ev[]; seen: Set<string>;
  /** 이 판 기록: 잡힘 · '!' · 가장 큰 보따리 · 한 번에 꾄 수 · 왕이 깼나 · 청소기 위에서 주운 수 · 놀래킨 수 · 털실 · 밥그릇 · 투구 남음 */
  catches: number; alerts: number; bestBag: number; lureMax: number; woke: boolean; rideGrab: number; scareMax: number; yarnMax: number; bowlMax: number; helmet: number;
  down: boolean; wowN: number; firstTap: number; firstBig: number; sim: boolean; clearT: number; tapped: boolean; freeze: number;
  /** 연출: 판 시작 띠 · 새것 스포트라이트 · 큰 띠 · 가는 길 미리 보기 */
  banner: { head: string; sub: string; t: number } | null; spot: { k: string; t: number } | null;
  big: { text: string; t: number; n: number; star: boolean; y: number } | null; plan: { pts: P[]; t: number; x: number; y: number } | null;
  phewT: number; bonkN: number;
}

// ───────────────────────────── 도구 ─────────────────────────────
const hyp = (a: number, b: number) => Math.sqrt(a * a + b * b);
const dist = (ax: number, ay: number, bx: number, by: number) => hyp(ax - bx, (ay - by) / YS);
const angTo = (ax: number, ay: number, bx: number, by: number) => Math.atan2((by - ay) / YS, bx - ax);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const angDiff = (a: number, b: number) => {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};
const cxOf = (col: number) => GX0 + (col + 0.5) * CW;
const cyOf = (row: number) => GY0 + (row + 0.5) * CH;
const colAt = (x: number) => clamp(Math.floor((x - GX0) / CW), 0, COLS - 1);
const rowAt = (y: number) => clamp(Math.floor((y - GY0) / CH), 0, ROWS - 1);
const cellAt = (x: number, y: number) => colAt(x) + rowAt(y) * COLS;
const ev = (s: MouseState, k: string, x: number, y: number, n = 0, x2 = 0, y2 = 0, text = '') => void (s.sim || s.events.push({ t: s.t, k, x, y, n, x2, y2, text }));
const see = (s: MouseState, key: string) => void (s.sim || s.seen.add(key));
const visible = (m: Mouse) => m.st === RUN || m.st === IDLE;
/** 큰 순간: 큰 띠는 한 번에 하나 — 별 셋째와 정말 큰 순간(왕 깸·여럿 따돌림·판의 첫 아슬아슬·밥 시간)에만. 나머지는 짧은 글자 하나(그리기 쪽) */
function wow(s: MouseState, text: string, n = 0, star = false) {
  s.wowN++;
  if (s.firstBig < 0) s.firstBig = s.t;
  if (!s.sim && (!s.big || s.t - s.big.t > 62 || star)) s.big = { text, t: s.t, n, star, y: s.m ? s.m.y : 1 };
}

// ───────────────────────────── 길 찾기 ─────────────────────────────
const QB = new Int32Array(CELLS), PREV = new Int32Array(CELLS), STAMP = new Uint32Array(CELLS);
let stampN = 0;
const DC = [1, -1, 0, 0, 1, 1, -1, -1], DR = [0, 0, 1, -1, 1, -1, 1, -1];
/** 칸 길 (8방향, 모서리 자르기 없음). 닿을 수 없으면 null */
function bfs(blk: Uint8Array, from: number, to: number): number[] | null {
  if (from === to) return [to];
  if (blk[to]) return null;
  stampN++;
  let h = 0, tl = 0;
  QB[tl++] = from;
  STAMP[from] = stampN;
  PREV[from] = -1;
  while (h < tl) {
    const i = QB[h++];
    if (i === to) break;
    const cc = i % COLS, rr = (i - cc) / COLS;
    for (let k = 0; k < 8; k++) {
      const dc = DC[k], dr = DR[k], nc = cc + dc, nr = rr + dr;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      const j = nc + nr * COLS;
      if (STAMP[j] === stampN || blk[j]) continue;
      if (dc && dr && (blk[cc + dc + rr * COLS] || blk[cc + (rr + dr) * COLS])) continue;
      STAMP[j] = stampN;
      PREV[j] = i;
      QB[tl++] = j;
    }
  }
  if (STAMP[to] !== stampN) return null;
  const out: number[] = [];
  for (let i = to; i !== -1; i = PREV[i]) out.push(i);
  return out.reverse();
}
/** 가장 가까운 빈칸 (막힌 칸을 톡 했을 때) */
function freeNear(blk: Uint8Array, x: number, y: number): number {
  const c0 = colAt(x), r0 = rowAt(y);
  if (!blk[c0 + r0 * COLS]) return c0 + r0 * COLS;
  let best = -1, bd = 1e9;
  for (let r = Math.max(0, r0 - 4); r <= Math.min(ROWS - 1, r0 + 4); r++)
    for (let cc = Math.max(0, c0 - 4); cc <= Math.min(COLS - 1, c0 + 4); cc++) {
      if (blk[cc + r * COLS]) continue;
      const d = dist(x, y, cxOf(cc), cyOf(r));
      if (d < bd) (bd = d), (best = cc + r * COLS);
    }
  return best < 0 ? c0 + r0 * COLS : best;
}
/** 곧은 줄이 막힌 칸을 지나는가 (pad만큼 두껍게) */
function clearLine(blk: Uint8Array, x0: number, y0: number, x1: number, y1: number, pad = 0): boolean {
  const d = dist(x0, y0, x1, y1), n = Math.max(1, Math.ceil(d / 0.016));
  for (let i = 1; i < n; i++) {
    const q = i / n, x = x0 + (x1 - x0) * q, y = y0 + (y1 - y0) * q;
    if (blk[cellAt(x, y)]) return false;
    if (pad > 0 && (blk[cellAt(x + pad, y)] || blk[cellAt(x - pad, y)] || blk[cellAt(x, y + pad * YS)] || blk[cellAt(x, y - pad * YS)])) return false;
  }
  return true;
}
/** 칸 길 → 꺾이는 점들 (줄 긋기로 펴기) */
function smooth(blk: Uint8Array, cells: number[], x0: number, y0: number, x1: number, y1: number, pad: number): P[] {
  const pts: P[] = [{ x: x0, y: y0 }];
  for (let i = 1; i < cells.length - 1; i++) pts.push({ x: cxOf(cells[i] % COLS), y: cyOf(Math.floor(cells[i] / COLS)) });
  pts.push({ x: x1, y: y1 });
  const out: P[] = [];
  let i = 0;
  while (i < pts.length - 1) {
    let j = Math.min(pts.length - 1, i + 12);
    while (j > i + 1 && !clearLine(blk, pts[i].x, pts[i].y, pts[j].x, pts[j].y, pad)) j--;
    out.push(pts[j]);
    i = j;
  }
  return out;
}
function pathFor(blk: Uint8Array, x0: number, y0: number, x1: number, y1: number, pad: number): P[] | null {
  const a = freeNear(blk, x0, y0), b = freeNear(blk, x1, y1), cells = bfs(blk, a, b);
  if (!cells) return null;
  return smooth(blk, cells, x0, y0, x1, y1, pad);
}
/** 점들을 따라 spd만큼 걷는다 — 다 왔으면 true */
function walk(e: { x: number; y: number; path: P[]; pi: number }, spd: number): boolean {
  let left = spd;
  while (left > 1e-9 && e.pi < e.path.length) {
    const p = e.path[e.pi], dx = p.x - e.x, dy = (p.y - e.y) / YS, d = hyp(dx, dy);
    if (d <= left) (e.x = p.x), (e.y = p.y), e.pi++, (left -= d);
    else (e.x += (dx / d) * left), (e.y += (dy / d) * left * YS), (left = 0);
  }
  return e.pi >= e.path.length;
}
/** 고양이 눈길 안에 (x,y)가 드나 (가구에 가려지면 못 본다) */
function inCone(s: MouseState, c: Cat, x: number, y: number, extra = 0): boolean {
  const kd = KD[c.k], d = dist(c.x, c.y, x, y);
  if (d > kd.vr + extra) return false;
  if (d > 0.03 && Math.abs(angDiff(angTo(c.x, c.y, x, y), c.face + c.look)) > kd.va) return false;
  return clearLine(s.blk, c.x, c.y, x, y);
}
const awakeEyes = (c: Cat) => c.mode !== SLEEP && c.mode !== DIZZY && c.mode !== HAPPY && c.mode !== FLEE && c.mode !== EAT && c.mode !== ALERT && c.mode !== CHASE && c.mode !== ROLL && c.mode !== HOLD && c.mode !== POUNCE && c.mode !== MISS;
const calm = (c: Cat) => c.mode === PATROL || c.mode === PAUSE || c.mode === GO || c.mode === PLAY || c.mode === SLEEP || c.mode === YAWN || c.mode === PEEK || c.mode === SEARCH || c.mode === SUSP || c.mode === HOLD || c.mode === FOLLOW;
const lvSpd = (s: MouseState) => 1 + 0.01 * (s.lv - 1);
/** 쫓기는 동안은 생쥐도 젖먹던 힘까지 (조금 빨라진다 — 아슬아슬하게 쏙) */
const chased = (s: MouseState) => s.cats.some((c2) => c2.mode === CHASE || c2.mode === POUNCE || c2.mode === MISS || c2.mode === ROLL);
const mouseSpd = (s: MouseState) => M_SPD * lvSpd(s) * (s.perk[1] === 1 ? 1.12 : 1) * Math.max(0.62, 1 - 0.055 * s.m.bag) * (chased(s) ? 1.25 : 1);
const chaseSpd = (s: MouseState) => M_SPD * lvSpd(s) * STAGES[s.stage].chase;
const bell = (s: MouseState) => (s.perk[0] === 2 ? 1.5 : 1);
const holeTgt = (s: MouseState): Tgt => ({ k: 'hole', id: 0, x: s.hx, y: s.hy });

// ───────────────────────────── 판 만들기 ─────────────────────────────
function buildGrid(s: MouseState) {
  const room = ROOMS[STAGES[s.stage].ch];
  s.blk = new Uint8Array(CELLS);
  for (const [, c0, r0, c1, r1] of room.furn) for (let r = r0; r <= r1; r++) for (let cc = c0; cc <= c1; cc++) s.blk[cc + r * COLS] = 1;
  // 고양이 길: 가구 둘레 한 칸(가로)까지 막는다 — 생쥐만 지나는 좁은 틈이 생긴다
  s.cblk = new Uint8Array(CELLS);
  for (let i = 0; i < CELLS; i++) {
    if (!s.blk[i]) continue;
    const cc = i % COLS;
    s.cblk[i] = 1;
    if (cc > 0) s.cblk[i - 1] = 1;
    if (cc < COLS - 1) s.cblk[i + 1] = 1;
  }
  s.hc = room.hole;
  s.hx = cxOf(room.hole);
  s.hy = GY0 + 0.012;
}
function routeOf(s: MouseState, cells: [number, number][], loop: boolean): { pts: P[]; stop: boolean[] } {
  const pts: P[] = [], stop: boolean[] = [];
  const n = cells.length, segs = loop ? n : n - 1;
  if (n === 1) return { pts: [{ x: cxOf(cells[0][0]), y: cyOf(cells[0][1]) }], stop: [true] };
  for (let i = 0; i < segs; i++) {
    const a = cells[i], b = cells[(i + 1) % n];
    const p = pathFor(s.cblk, cxOf(a[0]), cyOf(a[1]), cxOf(b[0]), cyOf(b[1]), 0.012) ?? [{ x: cxOf(b[0]), y: cyOf(b[1]) }];
    if (i === 0) pts.push({ x: cxOf(a[0]), y: cyOf(a[1]) }), stop.push(true);
    for (let k = 0; k < p.length; k++) pts.push(p[k]), stop.push(k === p.length - 1);
  }
  if (loop) pts.pop(), stop.pop();
  return { pts, stop };
}
function addCat(s: MouseState, sp: CatSpec): Cat {
  const pp = !!sp.pp, rt = routeOf(s, sp.r, !pp && sp.r.length > 2);
  // 판마다 조금씩 다르게: 출발 위치를 시드로 흔든다 (1판 첫 고양이는 그대로 — 첫 3초 장면)
  const jit = s.stage === 0 && s.cats.length === 0 ? 0 : s.rng() * 0.3;
  const ri = Math.min(rt.pts.length - 1, Math.floor((((sp.at ?? 0) + jit) % 1) * rt.pts.length));
  const p = rt.pts[ri], nx = rt.pts[(ri + 1) % rt.pts.length];
  const cat: Cat = {
    id: ++s.nid, k: sp.k, x: p.x, y: p.y, face: rt.pts.length > 1 ? angTo(p.x, p.y, nx.x, nx.y) : (s.rng() * TAU), look: 0,
    mode: PATROL, mt: 0, prev: PATROL, path: [], pi: 0, route: rt.pts, stop: rt.stop, ri: (ri + 1) % rt.pts.length, pp, rdir: 1, pauseT: 50,
    sus: 0, susMax: 0, lx: 0, ly: 0, seeT: 0, chaseT: 0, repath: 0, slip: 0, gx: 0, gy: 0, after: PATROL, playT: 0,
    awake: 0, sleepLen: SLEEP_T, meter: 0, follow: -1, peekCool: 0, hx: p.x, hy: p.y, jx: 0, jy: 0,
    seed: Math.floor(s.rng() * 1000), walkT: 0, flip: 1, hitT: -99, jumpT: -99,
  };
  if (rt.pts.length === 1) (cat.mode = PAUSE), (cat.pauseT = 1e9), (cat.ri = 0);
  if (sp.k === 'sleepy') (cat.mode = SLEEP), (cat.mt = (sp.zz ?? 0) + Math.floor(s.rng() * 120)), (cat.sleepLen = SLEEP_T);
  if (sp.k === 'tower') cat.face = ((sp.at ?? 0) + s.rng() * 0.25) * TAU;
  s.cats.push(cat);
  return cat;
}
function newStage(s: MouseState) {
  const d = STAGES[s.stage];
  buildGrid(s);
  s.phase = 'play';
  s.pt = 0;
  s.st = 0;
  s.sp = 0;
  s.cats = [];
  s.hides = d.hides.map(([k, cc, r], i) => ({ id: i, k, x: cxOf(cc), y: cyOf(r), shake: 0 }));
  s.lures = d.lures.map(([k, a, b, c2, d2], i) => ({ id: i, k, x: cxOf(a), y: cyOf(b), ax: cxOf(a), ay: cyOf(b), bx: cxOf(c2), by: cyOf(d2), side: 0, fly: null, cool: 0, used: false, spin: 0 }));
  // 치즈는 시드에 따라 한 칸쯤 흔들린다 (1판은 그대로)
  s.cheese = d.cheese.map(([k, cc, r, v]) => {
    let c2 = cc, r2 = r;
    if (s.stage > 0 && !d.vac) {
      const o = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(s.rng() * 5)];
      if (!s.blk[clamp(cc + o[0], 0, COLS - 1) + clamp(r + o[1], 0, ROWS - 1) * COLS]) (c2 = clamp(cc + o[0], 0, COLS - 1)), (r2 = clamp(r + o[1], 0, ROWS - 1));
    }
    return { id: ++s.nid, k, x: cxOf(c2), y: cyOf(r2), v: v ?? 1, born: -99, fx: 0, fy: 0 };
  });
  s.clutter = ROOMS[d.ch].clutter.map(([k, cc, r]) => ({ k, x: cxOf(cc), y: cyOf(r), knocked: -1, vx: 0, vy: 0 }));
  for (const sp of d.cats) addCat(s, sp);
  if (d.king) {
    const isl = ROOMS[0].furn[0];
    const kc: Cat = addCat(s, { k: 'king', r: d.king, pp: false, at: 0 });
    kc.hx = (cxOf(isl[1]) + cxOf(isl[3])) / 2;
    kc.hy = (cyOf(isl[2]) + cyOf(isl[4])) / 2;
    kc.x = kc.hx;
    kc.y = kc.hy;
    kc.mode = SLEEP;
    kc.mt = 0;
    kc.face = 0;
  }
  s.vac = d.vac ? (() => { const rt = routeOf(s, d.vac!, true); return { x: rt.pts[0].x, y: rt.pts[0].y, route: rt.pts, ri: 1, face: 0 }; })() : null;
  s.m = { x: s.hx, y: s.hy, st: HOLE, mt: 0, path: [], pi: 0, tgt: null, hide: -1, bag: 0, bagK: [], face: Math.PI / 2, dir: 1, at: 0, trail: [], hop: -99, popT: -99, busy: 0, next: null, vx: 0, vy: 0 };
  // 1판 첫 장면: 생쥐는 찻잔 바로 옆에 서 있고, 줄무늬가 찻잔 쪽으로 걸어오다 눈길이 닿기 한 뼘 앞에서 앉아 세수 —
  // 첫 톡에 생쥐는 0.2초 만에 쏙, 줄무늬는 일어나 찻잔 코앞까지 와서 킁킁 → 하품 (톡 뒤 1초 안)
  if (s.stage === 0) {
    const a = s.cats[0], cup = s.hides[0];
    s.m.x = cup.x - 0.062;
    s.m.y = cup.y + 0.008;
    s.m.st = IDLE;
    s.m.dir = 1;
    a.x = cxOf(14);
    a.y = cup.y + CH;
    a.path = [{ x: cup.x + 0.205, y: cup.y + CH }];
    a.pi = 0;
    a.after = HOLD;
    a.mode = GO;
    a.face = Math.PI;
    a.flip = -1;
  }
  coverHides(s);
  s.catches = 0;
  s.alerts = 0;
  s.bestBag = 0;
  s.lureMax = 0;
  s.woke = false;
  s.rideGrab = 0;
  s.scareMax = 0;
  s.yarnMax = 0;
  s.bowlMax = 0;
  s.helmet = s.perk[0] === 1 ? 1 : 0;
  s.clearT = 0;
  s.plan = null;
  s.bonkN = 0;
  s.phewT = -999;
  s.newDex = [];
  s.big = null;
  see(s, 's' + d.key);
  s.banner = { head: `${CHAPTERS[d.ch]} · ${s.stage + 1}판`, sub: d.news, t: s.t };
  s.spot = { k: d.key, t: s.t };
  for (const k of new Set(d.cats.map((q) => q.k).concat(d.king ? ['king'] : []))) meetCat(s, k as CatK);
  ev(s, 'stage', 0.5, 0.7);
}
/** 숨을 곳 채우기: 어디서 들켜도 두세 걸음(화면 폭 약 20%) 안에 숨을 곳이나 쥐구멍이 있게 — 가장 먼 빈칸부터 하나씩 */
const COVER: HK[][] = [['pot', 'bread', 'boot', 'cup'], ['cushion', 'box', 'slipper'], ['basket', 'cushion', 'bag', 'box']];
function coverHides(s: MouseState) {
  const ch = STAGES[s.stage].ch, kinds = COVER[ch];
  const cap = s.stage < 2 ? s.hides.length + 1 : 7;
  for (let it = 0; it < 6 && s.hides.length < cap; it++) {
    let best = -1, bd = 0;
    for (let i = 0; i < CELLS; i++) {
      const cc = i % COLS, r = (i - cc) / COLS;
      if (s.blk[i] || r < 1 || r > ROWS - 2 || cc < 1 || cc > COLS - 2) continue;
      const x = cxOf(cc), y = cyOf(r);
      if (s.cheese.some((q) => dist(q.x, q.y, x, y) < 0.1) || s.lures.some((l) => dist(l.ax, l.ay, x, y) < 0.1 || dist(l.bx, l.by, x, y) < 0.08) || s.clutter.some((q) => dist(q.x, q.y, x, y) < 0.08)) continue;
      let d = dist(s.hx, s.hy, x, y);
      for (const h of s.hides) d = Math.min(d, dist(h.x, h.y, x, y));
      if (d > bd) (bd = d), (best = i);
    }
    if (best < 0 || bd <= 0.22) break;
    s.hides.push({ id: s.hides.length, k: kinds[it % kinds.length], x: cxOf(best % COLS), y: cyOf(Math.floor(best / COLS)), shake: 0 });
  }
}
function meetCat(s: MouseState, k: CatK) {
  if (s.dexC.includes(k)) return;
  s.dexC.push(k);
  s.newDex.push('c' + k);
  see(s, 'c' + k);
}

// ───────────────────────────── 생쥐 ─────────────────────────────
/** 톡한 곳에서 가장 가까운 것 (둘레 화면 폭 15%) — 없으면 바닥 */
export function pickAt(s: MouseState, x: number, y: number): Tgt {
  let best: Tgt | null = null, bd = PICK_R;
  const consider = (k: TgK, id: number, px: number, py: number, bonus = 0) => {
    const d = dist(x, y, px, py) - bonus;
    if (d < bd) (bd = d), (best = { k, id, x: px, y: py });
  };
  consider('hole', 0, s.hx, s.hy + 0.02, 0.01);
  for (const h of s.hides) consider('hide', h.id, h.x, h.y, 0.005);
  for (const l of s.lures) if (!l.used && !l.fly && l.cool <= 0) consider('lure', l.id, l.x, l.y);
  for (const q of s.cheese) consider('cheese', q.id, q.x, q.y, 0.008);
  if (s.vac) consider('vac', 0, s.vac.x, s.vac.y, 0.01);
  if (best) return best;
  const cell = freeNear(s.blk, x, Math.max(GY0 + 0.01, Math.min(FY1 - 0.01, y)));
  const fx = colAt(x) === cell % COLS && rowAt(y) === Math.floor(cell / COLS) ? x : cxOf(cell % COLS), fy = colAt(x) === cell % COLS && rowAt(y) === Math.floor(cell / COLS) ? clamp(y, GY0 + 0.01, FY1 - 0.01) : cyOf(Math.floor(cell / COLS));
  return { k: 'floor', id: 0, x: fx, y: fy };
}
/** 생쥐를 tg로 보낸다 (길은 저절로) */
function goTo(s: MouseState, tg: Tgt): boolean {
  const m = s.m;
  if (m.st === CAUGHT) return false;
  if (m.st === HIDE && tg.k === 'hide' && tg.id === m.hide) return false;
  if (m.st === HOLE && tg.k === 'hole') return false;
  if (m.st === RIDE && tg.k === 'vac') return false;
  const p = pathFor(s.blk, m.x, m.st === HOLE ? GY0 + 0.02 : m.y, tg.x, tg.y, 0.004);
  if (!p) return false;
  if (m.st === HOLE) p.unshift({ x: s.hx, y: GY0 + 0.02 });
  if (m.st === HIDE) (s.hides[m.hide].shake = 10), ev(s, 'unhide', m.x, m.y);
  if (m.st === RIDE) ev(s, 'hopoff', m.x, m.y);
  m.path = p;
  m.pi = 0;
  m.tgt = tg;
  m.st = RUN;
  m.mt = 0;
  m.hide = -1;
  if (!s.sim) s.plan = { pts: [{ x: m.x, y: m.y }, ...p], t: s.t, x: tg.x, y: tg.y };
  return true;
}
function onTap(s: MouseState, x: number, y: number) {
  if (s.clearT > 0) return;
  const tg = pickAt(s, x, y);
  if (s.firstTap < 0) s.firstTap = s.t;
  if (!s.tapped) {
    s.tapped = true;
    for (const c2 of s.cats) if (c2.mode === HOLD || (c2.mode === GO && c2.after === HOLD)) (c2.mode = PATROL), (c2.mt = 0), (c2.jumpT = s.t), (c2.ri = 1), (c2.rdir = 1);
  }
  if (s.m.busy > 0 && s.m.st !== CAUGHT) return void ((s.m.next = tg), ev(s, 'tap', tg.x, tg.y, 0, 0, 0, tg.k));
  if (goTo(s, tg)) ev(s, 'tap', tg.x, tg.y, 0, 0, 0, tg.k);
}
function grab(s: MouseState, q: Cheese, ride = false) {
  const m = s.m;
  s.cheese = s.cheese.filter((o) => o !== q);
  m.bag += q.v;
  for (let i = 0; i < q.v; i++) m.bagK.push(q.k);
  if (ride) s.rideGrab += q.v;
  else m.busy = GRAB_T;
  if (!s.dexQ.includes(q.k)) (s.dexQ.push(q.k), s.newDex.push('q' + q.k), see(s, 'q' + q.k));
  ev(s, 'grab', q.x, q.y, m.bag, 0, 0, q.k);
  // 치즈 자석: 둘레 치즈도 쏙
  if (s.perk[1] === 2)
    for (const o of [...s.cheese]) if (dist(o.x, o.y, q.x, q.y) < 0.16) (s.cheese = s.cheese.filter((z) => z !== o)), (m.bag += o.v), m.bagK.push(o.k), ev(s, 'magnet', o.x, o.y, m.bag, q.x, q.y, o.k);
}
function deposit(s: MouseState) {
  const m = s.m, n = m.bag;
  if (n <= 0) return;
  const gain = Math.round(10 * n * n * (1 + 0.15 * s.stage));
  s.sp += gain;
  s.total += n;
  const prevBest = s.bestBag;
  s.bestBag = Math.max(s.bestBag, n);
  m.bag = 0;
  m.bagK = [];
  ev(s, 'deposit', s.hx, s.hy, n, gain);
  const d = STAGES[s.stage];
  if (d.star.k === 'bag' && prevBest < d.star.n && n >= d.star.n) wow(s, `한 보따리 ${n}조각!`, n, true), ev(s, 'star3', s.hx, s.hy + 0.05);
}
function kick(s: MouseState, l: Lure) {
  const d = LD[l.k];
  const to = l.side === 0 ? [l.bx, l.by] : [l.ax, l.ay];
  l.fly = { t: 0, T: d.fly, x0: l.x, y0: l.y, x1: to[0], y1: to[1] };
  l.spin = 0;
  ev(s, 'kick', l.x, l.y, 0, to[0], to[1], l.k);
  see(s, 'l' + l.k);
}
function arrive(s: MouseState) {
  const m = s.m, tg = m.tgt;
  m.st = IDLE;
  m.mt = 0;
  if (!tg) return;
  if (tg.k === 'cheese') {
    const q = s.cheese.find((o) => o.id === tg.id);
    if (q && dist(q.x, q.y, m.x, m.y) < 0.05) grab(s, q);
  } else if (tg.k === 'hide') {
    m.st = HIDE;
    m.hide = tg.id;
    s.hides[tg.id].shake = 14;
    ev(s, 'hide', m.x, m.y, tg.id);
    see(s, 'hid');
    // 아슬아슬: '?'가 차던 고양이나 쫓던 고양이가 바로 곁에서 놓쳤다
    const near = s.cats.filter((c2) => (c2.mode === CHASE || c2.mode === ALERT || (c2.mode === SUSP && c2.sus > 0.3)) && dist(c2.x, c2.y, m.x, m.y) < 0.32);
    if (near.length) phew(s, near.length);
  } else if (tg.k === 'hole') {
    m.st = HOLE;
    m.x = s.hx;
    m.y = s.hy;
    ev(s, 'home', s.hx, s.hy, m.bag);
    const near = s.cats.filter((c2) => (c2.mode === CHASE || c2.mode === ALERT) && dist(c2.x, c2.y, s.hx, s.hy) < 0.3);
    if (near.length) phew(s, near.length);
    deposit(s);
  } else if (tg.k === 'lure') {
    const l = s.lures[tg.id];
    if (l && !l.used && !l.fly && l.cool <= 0 && dist(l.x, l.y, m.x, m.y) < 0.05) kick(s, l);
  } else if (tg.k === 'vac') {
    if (s.vac && dist(s.vac.x, s.vac.y, m.x, m.y) < 0.06) (m.st = RIDE), ev(s, 'ride', m.x, m.y), see(s, 'rode');
  }
  m.tgt = null;
}
function phew(s: MouseState, n: number) {
  if (s.t - s.phewT < 120) return;
  const first = s.phewT < 0 || s.phewT < s.t - s.st;
  s.phewT = s.t;
  ev(s, 'phew', s.m.x, s.m.y, n, first || n >= 3 ? 1 : 0);
  // 판의 첫 아슬아슬 · 셋 넘게 따돌리면 큰 띠, 그 뒤는 작은 '휴~'
  if (first || n >= 3) wow(s, n > 1 ? `${n}마리 따돌림!` : '아슬아슬!', n);
}
function mouseStep(s: MouseState) {
  const m = s.m, px = m.x, py = m.y;
  mouseMove(s);
  m.vx = m.x - px;
  m.vy = m.y - py;
}
function mouseMove(s: MouseState) {
  const m = s.m;
  m.mt++;
  m.at++;
  if (m.st === CAUGHT) {
    if (m.mt >= CAUGHT_T) (m.st = HOLE), (m.x = s.hx), (m.y = s.hy), (m.mt = 0), ev(s, 'respawn', s.hx, s.hy), s.hearts <= 0 && ((s.phase = 'end'), (s.pt = 0), ev(s, 'end', 0.5, 0.7, 0));
    return;
  }
  if (m.busy > 0) {
    // 덥석: 치즈를 보따리에 넣는 동안은 서 있다 (그동안 톡한 곳으로는 끝나자마자)
    if (--m.busy === 0 && m.next) {
      const nx = m.next;
      m.next = null;
      if (m.st === RUN || m.st === IDLE) goTo(s, nx);
    }
    if (m.st === RUN) return;
  }
  if (m.st === RUN) {
    const tg = m.tgt;
    if (tg && tg.k === 'vac' && s.vac && m.mt % 10 === 0) {
      const p = pathFor(s.blk, m.x, m.y, s.vac.x, s.vac.y, 0.004);
      if (p) (m.path = p), (m.pi = 0), (tg.x = s.vac.x), (tg.y = s.vac.y);
    }
    const x0 = m.x, y0 = m.y, done = walk(m, mouseSpd(s));
    if (Math.abs(m.x - x0) > 1e-6 || Math.abs(m.y - y0) > 1e-6) m.face = angTo(x0, y0, m.x, m.y), (m.dir = m.x > x0 + 1e-6 ? 1 : m.x < x0 - 1e-6 ? -1 : m.dir);
    for (const q of s.cheese) if (dist(q.x, q.y, m.x, m.y) < GRAB_R && s.t - q.born > 30) { grab(s, q); break; }
    if (tg && tg.k === 'vac' && s.vac && dist(s.vac.x, s.vac.y, m.x, m.y) < 0.05) return arrive(s);
    if (m.bag >= SMELL_BAG && m.at % 10 === 0 && !s.sim) (m.trail.push({ x: m.x, y: m.y }), m.trail.length > 14 && m.trail.shift());
    if (done) arrive(s);
  } else if (m.st === RIDE) {
    const v = s.vac!;
    m.x = v.x;
    m.y = v.y;
    for (const q of s.cheese) if (dist(q.x, q.y, m.x, m.y) < 0.055 && s.t - q.born > 30) { grab(s, q, true); break; }
  }
  if (m.bag < SMELL_BAG && m.trail.length && m.at % 10 === 0) m.trail.shift();
}

// ───────────────────────────── 고양이 ─────────────────────────────
function setMode(c: Cat, mode: number) {
  c.mode = mode;
  c.mt = 0;
}
/** 고양이가 cblk 길로 (x,y)에 간다 */
function catGo(s: MouseState, c: Cat, x: number, y: number, after: number, playT = 0) {
  const p = pathFor(s.cblk, c.x, c.y, x, y, 0.012) ?? [{ x, y }];
  c.path = p;
  c.pi = 0;
  c.gx = x;
  c.gy = y;
  c.after = after;
  c.playT = playT;
  setMode(c, GO);
}
/** 순찰 길의 가장 가까운 점으로 돌아간다 */
function backToRoute(s: MouseState, c: Cat) {
  c.sus = 0;
  c.susMax = 0;
  c.look = 0;
  let bi = 0, bd = 1e9;
  for (let i = 0; i < c.route.length; i++) {
    const d = dist(c.x, c.y, c.route[i].x, c.route[i].y);
    if (d < bd) (bd = d), (bi = i);
  }
  c.ri = bi;
  if (c.k === 'king') return void ((c.x = c.hx), (c.y = c.hy), setMode(c, SLEEP), (c.meter = 0));
  catGo(s, c, c.route[bi].x, c.route[bi].y, c.route.length === 1 ? PAUSE : PATROL);
}
function turnTo(c: Cat, a: number, k = 0.14) {
  const d = angDiff(a, c.face);
  c.face += clamp(d, -k, k);
}
function stepToward(s: MouseState, c: Cat, x: number, y: number, spd: number) {
  const dx = x - c.x, dy = (y - c.y) / YS, d = hyp(dx, dy);
  if (d < 1e-6) return;
  const k = Math.min(spd, d), nx = c.x + (dx / d) * k, ny = c.y + (dy / d) * k * YS;
  if (!s.blk[cellAt(nx, ny)]) (c.x = nx), (c.y = ny);
  else if (!s.blk[cellAt(nx, c.y)]) c.x = nx;
  else if (!s.blk[cellAt(c.x, ny)]) c.y = ny;
}
function moveCat(c: Cat, spd: number): boolean {
  const x0 = c.x, y0 = c.y, done = walk(c, spd);
  if (Math.abs(c.x - x0) + Math.abs(c.y - y0) > 1e-7) {
    const a = angTo(x0, y0, c.x, c.y);
    turnTo(c, a, 0.22);
    if (Math.abs(c.x - x0) > 1e-5) c.flip = c.x > x0 ? 1 : -1;
    c.walkT++;
  }
  return done;
}
function alertCat(s: MouseState, c: Cat) {
  setMode(c, ALERT);
  c.sus = 1;
  c.jumpT = s.t;
  c.lx = s.m.x;
  c.ly = s.m.y;
  s.alerts++;
  ev(s, 'alert', c.x, c.y, c.id, 0, 0, c.k);
  see(s, 'chase');
  kingStir(s, 0.8);
  // '!' 소리에 둘레 고양이가 돌아본다
  for (const o of s.cats) {
    if (o === c || o.k === 'king' || !calm(o) || o.mode === SLEEP || dist(o.x, o.y, c.x, c.y) > 0.32) continue;
    o.face = angTo(o.x, o.y, s.m.x, s.m.y);
    o.look = 0;
    o.sus = Math.max(o.sus, 0.45);
    if (o.mode !== SUSP) (o.prev = o.mode === HOLD ? PATROL : o.mode), setMode(o, SUSP);
  }
}
function caught(s: MouseState, c: Cat) {
  const m = s.m;
  if (s.helmet > 0) {
    s.helmet--;
    setMode(c, DIZZY);
    c.hitT = s.t;
    ev(s, 'helmet', m.x, m.y);
    // 생쥐는 튕겨 나가 서 있다
    m.st = IDLE;
    m.path = [];
    return;
  }
  m.st = CAUGHT;
  m.mt = 0;
  m.busy = 0;
  m.next = null;
  m.path = [];
  m.tgt = null;
  s.plan = null;
  // 보따리 치즈가 사방으로
  const n = m.bag;
  for (let i = 0; i < n; i++) {
    let x = m.x, y = m.y;
    for (let k = 0; k < 8; k++) {
      const a = s.rng() * TAU, r = 0.07 + s.rng() * 0.08, tx = clamp(m.x + Math.cos(a) * r, 0.05, 0.95), ty = clamp(m.y + Math.sin(a) * r * YS, GY0 + 0.03, FY1 - 0.03);
      if (!s.blk[cellAt(tx, ty)]) { x = tx; y = ty; break; }
    }
    s.cheese.push({ id: ++s.nid, k: m.bagK[i] ?? 'ched', x, y, v: 1, born: s.t, fx: m.x, fy: m.y });
  }
  m.bag = 0;
  m.bagK = [];
  s.catches++;
  if (s.stage > 1) s.hearts--;
  ev(s, 'caught', m.x, m.y, n, c.x, c.y, c.k);
  see(s, 'caught');
  setMode(c, HAPPY);
  c.hitT = s.t;
  for (const o of s.cats) if (o !== c && (o.mode === CHASE || o.mode === ALERT || o.mode === POUNCE || o.mode === MISS)) setMode(o, SEARCH);
  kingStir(s, 1);
}
function noise(s: MouseState, x: number, y: number, r: number, kind: 'lure' | 'crash' | 'scare' | 'bowl' | 'egg', lid = -1): number {
  let n = 0;
  for (const c of s.cats) {
    if (c.k === 'king') {
      if (dist(c.x, c.y, x, y) <= r * 1.25 && kind !== 'crash') kingStir(s, 1.25);
      continue;
    }
    const d = dist(c.x, c.y, x, y);
    if (d > r) continue;
    if (kind === 'crash') {
      // 와장창 소리: 돌아본다
      if (calm(c) && c.mode !== SLEEP) (c.face = angTo(c.x, c.y, x, y)), (c.look = 0), c.mode === PATROL && ((c.prev = PATROL), setMode(c, PAUSE), (c.pauseT = 50));
      continue;
    }
    if (!calm(c) && !(kind === 'bowl' && c.mode !== CHASE && c.mode !== DIZZY)) continue;
    if (kind === 'scare') {
      const a = angTo(x, y, c.x, c.y), tx = clamp(c.x + Math.cos(a) * 0.3, 0.06, 0.94), ty = clamp(c.y + Math.sin(a) * 0.3 * YS, GY0 + 0.04, FY1 - 0.04);
      const p = pathFor(s.cblk, c.x, c.y, tx, ty, 0.012) ?? [{ x: tx, y: ty }];
      c.path = p;
      c.pi = 0;
      setMode(c, FLEE);
      c.jumpT = s.t;
      c.sus = 0;
      n++;
      continue;
    }
    // 소리 쪽으로 (둘레 자리를 나눠 선다)
    const a = (n * 2.1 + c.id) % TAU, rr = kind === 'bowl' ? 0.075 : 0.05;
    const tx = clamp(x + Math.cos(a) * rr, 0.06, 0.94), ty = clamp(y + Math.sin(a) * rr * YS, GY0 + 0.03, FY1 - 0.03);
    c.follow = lid;
    catGo(s, c, tx, ty, kind === 'bowl' ? EAT : PLAY, Math.round(PLAY_T * (kind === 'egg' ? 1.6 : kind === 'bowl' ? 1.7 : 1) * bell(s)));
    c.sus = 0;
    c.jumpT = s.t;
    n++;
  }
  return n;
}
function kingStir(s: MouseState, amt: number) {
  const k = s.cats.find((c) => c.k === 'king');
  if (!k || k.mode !== SLEEP) return;
  k.meter += amt;
  ev(s, 'stir', k.x, k.y, k.meter);
  if (k.meter >= KING_WAKE) {
    setMode(k, ALERT);
    k.jumpT = s.t;
    s.woke = true;
    ev(s, 'kingwake', k.x, k.y);
    see(s, 'kingwake');
    wow(s, '왕이 깼다! 데굴데굴', 1);
  }
}
/** 숨은 생쥐를 코앞에서 들여다본다 → 하품 (첫 3초의 그 장면) */
function peekHide(s: MouseState, c: Cat): boolean {
  const m = s.m;
  if (m.st !== HIDE || c.peekCool > 0 || c.k === 'tower') return false;
  const h = s.hides[m.hide];
  if (dist(c.x, c.y, h.x, h.y) > 0.16 || !inCone(s, c, h.x, h.y)) return false;
  c.prev = c.mode;
  setMode(c, PEEK);
  c.face = angTo(c.x, c.y, h.x, h.y);
  c.look = 0;
  c.peekCool = 420;
  h.shake = 30;
  ev(s, 'peek', h.x, h.y, c.id);
  return true;
}
function patrolStep(s: MouseState, c: Cat) {
  const kd = KD[c.k];
  if (c.route.length === 1) return void (setMode(c, PAUSE), (c.pauseT = 1e9));
  const t = c.route[c.ri];
  c.path = [t];
  c.pi = 0;
  // 1판 첫 장면의 줄무늬는 찻잔까지 서둘러 온다
  const hurry = s.stage === 0 && c === s.cats[0] && !s.seen.has('peekwow') && s.firstTap >= 0 && s.t - s.firstTap < 100 ? 2.2 : 1;
  if (moveCat(c, kd.walk * hurry)) {
    if (c.stop[c.ri] && hurry === 1) (c.prev = PATROL), setMode(c, PAUSE), (c.pauseT = 46 + (c.seed % 30));
    if (c.pp) {
      if (c.ri + c.rdir < 0 || c.ri + c.rdir >= c.route.length) c.rdir = -c.rdir;
      c.ri += c.rdir;
    } else c.ri = (c.ri + 1) % c.route.length;
  }
}
function chaseStep(s: MouseState, c: Cat) {
  const m = s.m;
  c.chaseT++;
  const seeNow = visible(m) && dist(c.x, c.y, m.x, m.y) < 0.6 && clearLine(s.blk, c.x, c.y, m.x, m.y);
  if (seeNow) (c.lx = m.x), (c.ly = m.y), (c.seeT = 0);
  else c.seeT++;
  // 가까우면 와락 — 생쥐가 계속 달리면 헛방, 멈춰 있으면 덥석
  if (seeNow && dist(c.x, c.y, m.x, m.y) < POUNCE_R && c.chaseT > 6) {
    setMode(c, POUNCE);
    c.jx = c.x;
    c.jy = c.y;
    // 달리는 쪽을 앞질러 덮친다 — 열린 바닥에선 숨을 곳까지 달려야 산다
    // (배우는 1·2판은 앞지르지 않는다 — 계속 달리면 헛방)
    const lead = s.stage < 2 ? 0 : POUNCE_T * 0.8;
    const lx = clamp(m.x + m.vx * lead, 0.04, 0.96), ly = clamp(m.y + m.vy * lead, GY0 + 0.01, FY1 - 0.01);
    c.gx = s.blk[cellAt(lx, ly)] ? m.x : lx;
    c.gy = s.blk[cellAt(lx, ly)] ? m.y : ly;
    c.flip = c.gx > c.x ? 1 : -1;
    c.face = angTo(c.x, c.y, m.x, m.y);
    ev(s, 'pounce', c.x, c.y, c.id);
    return;
  }
  const spd = chaseSpd(s) * KD[c.k].run * (c.slip > 0 ? 0.3 : 1);
  if (c.slip > 0) c.slip--;
  const a0 = c.face;
  if (seeNow && dist(c.x, c.y, m.x, m.y) < 0.13 && clearLine(s.blk, c.x, c.y, m.x, m.y, 0.01)) {
    const x0 = c.x, y0 = c.y;
    stepToward(s, c, m.x, m.y, spd);
    if (Math.abs(c.x - x0) > 1e-5) c.flip = c.x > x0 ? 1 : -1;
    c.face = angTo(x0, y0, c.x, c.y);
    c.walkT++;
  } else {
    if (--c.repath <= 0) {
      c.repath = 8;
      c.path = pathFor(s.cblk, c.x, c.y, c.lx, c.ly, 0.012) ?? [{ x: c.lx, y: c.ly }];
      c.pi = 0;
    }
    const done = moveCat(c, spd);
    if (done && !seeNow) return void (setMode(c, SEARCH), (c.look = 0));
  }
  // 모퉁이에서 미끄러짐 (끼익)
  if (c.slip <= 0 && Math.abs(angDiff(c.face, a0)) > 1.0 && c.chaseT > 20) (c.slip = 16), ev(s, 'skid', c.x, c.y, c.flip);
  if (c.chaseT > (s.stage < 2 ? CHASE_MAX * 0.6 : CHASE_MAX) || (!seeNow && c.seeT > 90)) setMode(c, SEARCH);
}
function catStep(s: MouseState, c: Cat) {
  const m = s.m, kd = KD[c.k];
  c.mt++;
  if (c.peekCool > 0) c.peekCool--;
  if (c.k === 'king') return kingStep(s, c);
  if (awakeEyes(c)) {
    let sees = false;
    if (visible(m)) {
      const d = dist(c.x, c.y, m.x, m.y);
      // 코앞에 닿으면 바로 '!'
      if (d < 0.055) return alertCat(s, c);
      sees = inCone(s, c, m.x, m.y);
      if (sees) {
        c.sus = Math.min(1, c.sus + (d < 0.09 ? 3 : d < kd.vr * 0.55 ? 2 : 1) / (SUS_T * (s.stage === 0 ? 1.7 : s.stage === 1 ? 1.5 : 1)));
        c.susMax = Math.max(c.susMax, c.sus);
        c.lx = m.x;
        c.ly = m.y;
        if (c.mode !== SUSP) (c.prev = c.mode === SEARCH || c.mode === YAWN || c.mode === PEEK ? PATROL : c.mode), setMode(c, SUSP), ev(s, 'huh', c.x, c.y, c.id);
        if (c.sus >= 1) return alertCat(s, c);
      }
    }
    // 숨으면 금방 '어 아닌가', 눈길만 벗어나면 천천히 식는다
    if (!sees && c.sus > 0) c.sus = Math.max(0, c.sus - 1 / (SUS_T * (visible(m) ? 2.6 : 0.6)));
  }
  // 냄새 맡는 놈: 큰 보따리를 따라온다 (숨어 있어도)
  if (c.k === 'sniff' && s.t > c.awake && (c.mode === PATROL || c.mode === PAUSE || (c.mode === GO && c.after === PATROL)) && m.bag >= SMELL_BAG && m.st !== HOLE && m.st !== CAUGHT && m.st !== RIDE && dist(c.x, c.y, m.x, m.y) < SMELL_R) {
    setMode(c, FOLLOW);
    c.follow = -2;
    c.repath = 0;
    ev(s, 'sniff', c.x, c.y);
    see(s, 'sniffed');
  }
  switch (c.mode) {
    case HOLD:
      c.look = Math.sin(s.t * 0.03) * 0.25;
      break;
    case PATROL:
      if (peekHide(s, c)) break;
      patrolStep(s, c);
      if (c.k === 'sleepy' && ++c.awake >= AWAKE_T) (c.awake = 0), setMode(c, SLEEP), ev(s, 'doze', c.x, c.y);
      break;
    case PAUSE:
      if (peekHide(s, c)) break;
      if (c.k === 'tower') {
        c.face += TAU / TOWER_T;
        c.look = 0;
        if (dist(c.x, c.y, c.route[0].x, c.route[0].y) > 0.02) backToRoute(s, c);
        break;
      }
      c.look = Math.sin(c.mt * 0.045) * kd.sway;
      if (c.k === 'sleepy' && ++c.awake >= AWAKE_T) (c.awake = 0), setMode(c, SLEEP), ev(s, 'doze', c.x, c.y);
      else if (c.mt >= c.pauseT) (c.look = 0), setMode(c, PATROL);
      break;
    case SUSP: {
      turnTo(c, angTo(c.x, c.y, c.lx, c.ly), 0.12);
      c.look *= 0.85;
      if (c.sus <= 0) {
        if (c.susMax > 0.3) setMode(c, YAWN), ev(s, 'yawn', c.x, c.y, c.id);
        else setMode(c, c.prev), c.prev === PAUSE && (c.pauseT = 30);
        c.susMax = 0;
      }
      break;
    }
    case ALERT:
      if (c.mt >= ALERT_T) (setMode(c, CHASE), (c.chaseT = 0), (c.repath = 0), (c.seeT = 0), ev(s, 'chase', c.x, c.y, c.id));
      break;
    case CHASE:
      chaseStep(s, c);
      break;
    case POUNCE: {
      const q = Math.min(1, c.mt / POUNCE_T), nx = c.jx + (c.gx - c.jx) * q, ny = c.jy + (c.gy - c.jy) * q;
      if (!s.blk[cellAt(nx, ny)]) (c.x = nx), (c.y = ny);
      if (c.mt >= POUNCE_T) {
        if (visible(m) && dist(c.x, c.y, m.x, m.y) < CATCH_R + 0.012) return caught(s, c);
        setMode(c, MISS);
        c.hitT = s.t;
        ev(s, 'miss', c.x, c.y, c.id);
        see(s, 'miss');
      }
      break;
    }
    case MISS:
      if (c.mt >= MISS_T) (setMode(c, CHASE), (c.repath = 0), (c.chaseT = Math.max(c.chaseT, 60)));
      break;
    case SEARCH:
      c.look = Math.sin(c.mt * 0.12) * 1.1;
      if (c.mt >= SEARCH_T) setMode(c, YAWN), ev(s, 'yawn', c.x, c.y, c.id);
      break;
    case YAWN:
      c.look *= 0.9;
      if (c.mt >= YAWN_T) {
        if (c.prev === PATROL || c.prev === PAUSE || c.prev === GO || c.prev === PLAY) {
          const pv = c.prev;
          c.prev = PATROL;
          setMode(c, pv === PAUSE ? PATROL : pv);
          if (pv === GO && c.pi >= c.path.length) backToRoute(s, c);
        } else backToRoute(s, c);
      }
      break;
    case PEEK:
      if (c.mt >= (s.stage === 0 && !s.seen.has('peekwow') ? 18 : PEEK_T)) {
        setMode(c, YAWN);
        ev(s, 'yawn', c.x, c.y, c.id, 1);
        // 첫 3초 장면 (1판 첫 숨기) · 아니면 작은 '휴'
        if (m.st === HIDE) {
          if (s.stage === 0 && !s.seen.has('peekwow')) (see(s, 'peekwow'), phew(s, 1));
          else ev(s, 'close', m.x, m.y);
        }
      }
      break;
    case GO: {
      if (c.after === PATROL && peekHide(s, c)) break;
      const done = moveCat(c, c.after === PATROL || c.after === PAUSE ? kd.walk * 1.4 : C_GO * (c.after === EAT ? 1.25 : 1));
      if (done) {
        if (c.after === PLAY || c.after === EAT) setMode(c, c.after), (c.face = angTo(c.x, c.y, c.gx, c.gy));
        else if (c.after === PAUSE) setMode(c, PAUSE), (c.pauseT = c.route.length === 1 ? 1e9 : 40);
        else setMode(c, c.after === PATROL ? PATROL : c.after);
      }
      break;
    }
    case PLAY:
      c.look = Math.sin(c.mt * 0.2) * 0.25;
      if (c.mt >= c.playT) backToRoute(s, c);
      break;
    case EAT:
      c.look = 0;
      if (c.mt >= c.playT) backToRoute(s, c);
      break;
    case DIZZY:
      if (c.mt >= DIZZY_T) backToRoute(s, c);
      break;
    case HAPPY:
      if (c.mt >= HAPPY_T) backToRoute(s, c);
      break;
    case SLEEP:
      if (c.mt >= c.sleepLen) (setMode(c, YAWN), (c.prev = PATROL), ev(s, 'wake', c.x, c.y, c.id));
      break;
    case FLEE:
      if (moveCat(c, C_FLEE) || c.mt >= FLEE_T) (setMode(c, PAUSE), (c.pauseT = 40), (c.prev = PATROL));
      break;
    case FOLLOW: {
      // 털실을 졸졸 · 냄새를 킁킁
      if (c.follow >= 0) {
        const l = s.lures[c.follow];
        if (!l || !l.fly) {
          setMode(c, PLAY);
          c.playT = Math.round(PLAY_T * bell(s));
          break;
        }
        stepToward(s, c, l.x, l.y, C_GO * 1.1);
        turnTo(c, angTo(c.x, c.y, l.x, l.y), 0.2);
        c.flip = l.x > c.x ? 1 : -1;
        c.walkT++;
      } else {
        if (m.bag < SMELL_BAG || m.st === HOLE || m.st === RIDE || m.st === CAUGHT || c.mt > 600) {
          backToRoute(s, c);
          break;
        }
        if (--c.repath <= 0) (c.repath = 20), (c.path = pathFor(s.cblk, c.x, c.y, m.x, m.y, 0.012) ?? [{ x: m.x, y: m.y }]), (c.pi = 0);
        if (dist(c.x, c.y, m.x, m.y) < 0.12 && clearLine(s.blk, c.x, c.y, m.x, m.y, 0.01)) stepToward(s, c, m.x, m.y, kd.walk * 1.5), c.walkT++, (c.face = angTo(c.x, c.y, m.x, m.y)), (c.flip = m.x > c.x ? 1 : -1);
        else moveCat(c, kd.walk * 1.5);
        if (dist(c.x, c.y, m.x, m.y) < 0.06) {
          if (m.st === HIDE) (s.hides[m.hide].shake = 24), ev(s, 'flush', m.x, m.y), (m.st = IDLE), (m.hide = -1), (m.mt = 0);
          // 한 번 찾아낸 뒤엔 한동안 코가 쉰다 (같은 자리에서 맴돌지 않게)
          c.awake = s.t + 420;
          alertCat(s, c);
        }
      }
      break;
    }
  }
}
function kingStep(s: MouseState, c: Cat) {
  const m = s.m;
  if (c.mode === SLEEP) {
    c.meter = Math.max(0, c.meter - 0.0012);
    if (visible(m) && dist(c.x, c.y, m.x, m.y) < 0.17) {
      c.meter += 0.03;
      if (c.meter >= KING_WAKE) kingStir(s, 0);
    }
    return;
  }
  if (c.mode === ALERT) {
    if (c.mt >= 54) {
      setMode(c, ROLL);
      c.ri = 0;
      let bd = 1e9;
      // 섬 위에서 쿵 뛰어내려 둘레를 데굴데굴 (가까운 길목으로)
      for (let i = 0; i < c.route.length; i++) {
        const mm = s.m, d = dist(mm.x, mm.y, c.route[i].x, c.route[i].y);
        if (d < bd) (bd = d), (c.ri = i);
      }
      c.x = c.route[c.ri].x;
      c.y = c.route[c.ri].y;
      c.ri = (c.ri + 1) % c.route.length;
      ev(s, 'roll', c.x, c.y);
      noise(s, c.x, c.y, 0.28, 'crash');
    }
    return;
  }
  if (c.mode === ROLL) {
    // 데굴데굴: 보이는 생쥐 쪽으로 쏠리고, 아니면 섬 둘레를 돈다
    const seeM = visible(m) && dist(c.x, c.y, m.x, m.y) < 0.3 && clearLine(s.blk, c.x, c.y, m.x, m.y);
    const tx = seeM ? m.x : c.route[c.ri].x, ty = seeM ? m.y : c.route[c.ri].y;
    const x0 = c.x, y0 = c.y;
    stepToward(s, c, tx, ty, KD.king.walk);
    if (Math.abs(c.x - x0) > 1e-5) c.flip = c.x > x0 ? 1 : -1;
    c.face = angTo(x0, y0, c.x, c.y);
    c.walkT += 2;
    if (!seeM && dist(c.x, c.y, tx, ty) < 0.02) c.ri = (c.ri + 1) % c.route.length;
    if (visible(m) && dist(c.x, c.y, m.x, m.y) < 0.075) return caught(s, c);
    if (c.mt >= ROLL_T) (setMode(c, GO), (c.path = [{ x: c.hx, y: c.hy }]), (c.pi = 0), (c.after = SLEEP), ev(s, 'kinghome', c.x, c.y));
    return;
  }
  if (c.mode === GO) {
    if (walk(c, 0.006)) (setMode(c, SLEEP), (c.meter = 0), ev(s, 'doze', c.x, c.y));
    return;
  }
  if (c.mode === HAPPY && c.mt >= HAPPY_T) (setMode(c, ROLL), (c.mt = Math.max(0, ROLL_T - 120)));
}
/** 쫓는 고양이끼리 쿵 · 엎기 · 청소기 */
function bumps(s: MouseState) {
  const cs = s.cats;
  for (let i = 0; i < cs.length; i++) {
    const a = cs[i];
    const fast = a.mode === CHASE || a.mode === ROLL || a.mode === POUNCE;
    if (!fast) continue;
    for (let j = 0; j < cs.length; j++) {
      if (i === j) continue;
      const b = cs[j];
      if (b.mode === DIZZY || b.mode === MISS || (b.mode === SLEEP && b.k === 'king') || (a.k === 'king' && b.k === 'king')) continue;
      // 쫓는 놈끼리(또는 데굴데굴 왕이) 부딪힐 때만 쿵 — 순찰하는 놈과 스치는 건 그냥 지나간다
      const bFast = b.mode === CHASE || b.mode === POUNCE || b.mode === ROLL;
      if (!bFast && a.k !== 'king') continue;
      if (dist(a.x, a.y, b.x, b.y) > (a.k === 'king' ? 0.11 : BONK_R)) continue;
      if (a.k !== 'king') setMode(a, DIZZY), (a.hitT = s.t);
      if (b.k !== 'king') setMode(b, DIZZY), (b.hitT = s.t);
      s.bonkN++;
      ev(s, 'bonk', (a.x + b.x) / 2, (a.y + b.y) / 2, s.bonkN);
      see(s, 'bonk');
      break;
    }
    if (a.mode !== CHASE && a.mode !== ROLL && a.mode !== POUNCE) continue;
    for (const q of s.clutter)
      if (q.knocked < 0 && dist(a.x, a.y, q.x, q.y) < KNOCK_R + (a.k === 'king' ? 0.04 : 0)) {
        q.knocked = s.t;
        q.vx = Math.cos(a.face) * 0.02;
        q.vy = -0.02;
        ev(s, 'crash', q.x, q.y, 0, 0, 0, q.k);
        see(s, 'crash');
        noise(s, q.x, q.y, 0.3, 'crash');
      }
    for (const l of s.lures)
      if (!l.used && !l.fly && l.cool <= 0 && l.k !== 'bowl' && l.k !== 'balloon' && dist(a.x, a.y, l.x, l.y) < KNOCK_R) kick(s, l);
  }
}
function lureStep(s: MouseState) {
  for (const l of s.lures) {
    if (l.cool > 0) l.cool--;
    if (!l.fly) continue;
    const f = l.fly;
    f.t++;
    const q = Math.min(1, f.t / f.T);
    l.x = f.x0 + (f.x1 - f.x0) * q;
    l.y = f.y0 + (f.y1 - f.y0) * q;
    l.spin += 0.4;
    if (l.k === 'yarn') {
      // 데굴데굴 굴러가는 동안 둘레 고양이가 졸졸
      let n = 0;
      for (const c of s.cats) {
        if (c.mode === FOLLOW && c.follow === l.id) (n++, 0);
        else if (c.k !== 'king' && calm(c) && c.mode !== SLEEP && c.mode !== FOLLOW && dist(c.x, c.y, l.x, l.y) < LD.yarn.r * bell(s)) (setMode(c, FOLLOW), (c.follow = l.id), (c.jumpT = s.t), n++, ev(s, 'yarncat', c.x, c.y));
      }
      if (n > s.yarnMax) {
        const was = s.yarnMax;
        s.yarnMax = n;
        const d = STAGES[s.stage];
        if (d.star.k === 'yarn' && was < d.star.n && n >= d.star.n) wow(s, `털실 따라 ${n}마리!`, n, true), ev(s, 'star3', l.x, l.y);
      }
    }
    if (f.t >= f.T) {
      l.fly = null;
      l.side = 1 - l.side;
      l.cool = 70;
      const d = STAGES[s.stage];
      if (l.k === 'yarn') {
        l.used = true;
        ev(s, 'yarnstop', l.x, l.y);
        continue;
      }
      if (LD[l.k].once) l.used = true;
      const kind = l.k === 'balloon' ? 'scare' : l.k === 'bowl' ? 'bowl' : l.k === 'egg' ? 'egg' : 'lure';
      const n = noise(s, l.x, l.y, LD[l.k].r * (kind === 'bowl' ? 1 : bell(s)), kind, l.id);
      ev(s, 'land', l.x, l.y, n, 0, 0, l.k);
      if (kind === 'scare') {
        const was = s.scareMax;
        s.scareMax = Math.max(s.scareMax, n);
        if (d.star.k === 'scare' && was < d.star.n && n >= d.star.n) wow(s, `펑! ${n}마리 깜짝`, n, true), ev(s, 'star3', l.x, l.y);
      } else if (kind === 'bowl') {
        const was = s.bowlMax;
        s.bowlMax = Math.max(s.bowlMax, n);
        if (d.star.k === 'bowl' && was < d.star.n && n >= d.star.n) wow(s, `밥 시간! ${n}마리 우르르`, n, true), ev(s, 'star3', l.x, l.y);
        else if (n >= 4) wow(s, `밥 시간! ${n}마리 우르르`, n);
      } else {
        const was = s.lureMax;
        s.lureMax = Math.max(s.lureMax, n);
        if (d.star.k === 'lure' && was < d.star.n && n >= d.star.n) wow(s, `땡그랑! ${n}마리 우르르`, n, true), ev(s, 'star3', l.x, l.y);
      }
    }
  }
}
function vacStep(s: MouseState) {
  const v = s.vac;
  if (!v) return;
  const t = v.route[v.ri], x0 = v.x, y0 = v.y;
  const dx = t.x - v.x, dy = (t.y - v.y) / YS, d = hyp(dx, dy);
  if (d <= VAC_SPD) (v.x = t.x), (v.y = t.y), (v.ri = (v.ri + 1) % v.route.length);
  else (v.x += (dx / d) * VAC_SPD), (v.y += (dy / d) * VAC_SPD * YS);
  if (Math.abs(v.x - x0) + Math.abs(v.y - y0) > 1e-7) v.face = angTo(x0, y0, v.x, v.y);
  for (const c of s.cats) {
    if (c.k === 'king' || c.mode === FLEE || c.mode === DIZZY || dist(c.x, c.y, v.x, v.y) > VAC_R) continue;
    const a = angTo(v.x, v.y, c.x, c.y), tx = clamp(c.x + Math.cos(a) * 0.25, 0.06, 0.94), ty = clamp(c.y + Math.sin(a) * 0.25 * YS, GY0 + 0.04, FY1 - 0.04);
    c.path = pathFor(s.cblk, c.x, c.y, tx, ty, 0.012) ?? [{ x: tx, y: ty }];
    c.pi = 0;
    setMode(c, FLEE);
    c.jumpT = s.t;
    c.sus = 0;
    ev(s, 'eek', c.x, c.y, c.id);
  }
}
// ───────────────────────────── 판 흐름 ─────────────────────────────
function starNow(s: MouseState): boolean {
  const d = STAGES[s.stage], st = d.star;
  switch (st.k) {
    case 'bag': return s.bestBag >= st.n;
    case 'lure': return s.lureMax >= st.n;
    case 'nowake': return !s.woke;
    case 'unseen': return s.alerts === 0;
    case 'ride': return s.rideGrab >= st.n;
    case 'scare': return s.scareMax >= st.n;
    case 'yarn': return s.yarnMax >= st.n;
    case 'bowl': return s.bowlMax >= st.n;
  }
}
function clearStage(s: MouseState) {
  s.phase = 'result';
  s.pt = 0;
  s.starOk = [true, s.catches === 0, starNow(s)];
  s.got = s.starOk.filter(Boolean).length;
  s.stars += s.got;
  s.gain = (s.sp + CLEAR_PTS) * STAR_MUL[s.got];
  s.pts += s.gain;
  s.sp = 0;
  s.lv++;
  s.town = Math.min(TOWN.length, s.town + 1);
  s.hearts = Math.min(3, s.hearts + 1);
  see(s, 'lv' + s.lv);
  see(s, 'town' + s.town);
  s.spot = null;
  if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * 30);
  ev(s, 'clear', 0.5, 0.8, s.got);
}
function advance(s: MouseState) {
  const d = STAGES[s.stage];
  if (s.won) return void ((s.phase = 'end'), (s.pt = 0), ev(s, 'end', 0.5, 0.7, 1));
  if (s.stage % 4 === 3 && d.ch < PERKS.length && !s.perk[d.ch]) return void ((s.phase = 'pick'), (s.pt = 0), (s.picked = -1), see(s, 'pick' + d.ch), ev(s, 'pickopen', 0.5, 0.8));
  s.stage++;
  newStage(s);
}
function playStep(s: MouseState) {
  s.st++;
  mouseStep(s);
  if (s.phase !== 'play') return;
  for (const c2 of s.cats) catStep(s, c2);
  bumps(s);
  lureStep(s);
  vacStep(s);
  for (const h of s.hides) if (h.shake > 0) h.shake--;
  for (const q of s.clutter) if (q.knocked >= 0 && s.t - q.knocked < 30) (q.x += q.vx), (q.y += q.vy), (q.vy += 0.003), (q.vx *= 0.92);
  // 마지막 보따리를 넣으면 판 끝 (그 뒤 톡은 받지 않는다)
  if (s.clearT > 0 || (s.cheese.length === 0 && s.m.bag === 0 && s.m.st === HOLE)) {
    if (++s.clearT >= 34) clearStage(s);
  }
}

const game: GameDef<MouseState> & { wows(s: MouseState): number } = {
  id: 'cheesemouse',
  name: '🐭 치즈 도둑 생쥐',
  genes: ['cheesemouse', 'pointer', 'collect'],
  twist: '몰래 훔치기를 톡 하나로 — 생쥐는 길을 저절로 찾고 나는 언제·어디로만 고른다. 노란 눈길을 피해 숨고, 숟가락을 날려 꾀고, 들키면 고양이끼리 와장창 부딪히는 추격전',
  rules: [
    '톡 한 곳으로 생쥐가 쪼르르 — 치즈는 덥석, 쥐구멍을 톡 하면 보따리 저장!',
    '노란 눈길에 들면 ?가 차요. 찻잔·냄비를 톡 하면 쏙 숨어요.',
    '숟가락 같은 물건을 톡 하면 땡그랑 — 고양이들이 그쪽으로 우르르.',
  ],
  controls: 'touch',
  hint: '치즈·찻잔·쥐구멍을 톡 — 생쥐가 쪼르르 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '햇살 드는 부엌의 고양이 열 마리 — 그림책 디오라마',
    mood: '체크무늬 타일 위로 아침 햇살이 비치는 따뜻한 부엌. 통통한 고양이들이 노란 눈길을 비추며 어슬렁거리고, 큰 귀 생쥐가 치즈 보따리를 메고 찻잔 속에 쏙 숨는다. 들키면 냄비가 와장창.',
    palette: { bg: '#fff1d6', ink: '#4a2c1d', muted: '#a08a70', accent: '#ffc531', hot: '#ff6b4a', soft: '#ffe7b8' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.hearts,
  cleared: (s) => (s.phase === 'result' ? { stage: s.stage, got: s.got, of: 3 } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, st: 0, stage: 0, phase: 'play', pt: 0, hearts: 3, pts: 0, sp: 0, stars: 0, got: 0, starOk: [false, false, false], dead: false, won: false,
      lv: 1, perk: [0, 0], picked: -1, dexC: [], dexQ: [], newDex: [], town: 0, total: 0, gain: 0,
      blk: new Uint8Array(CELLS), cblk: new Uint8Array(CELLS), hx: 0, hy: 0, hc: 0,
      m: null as unknown as Mouse, cats: [], hides: [], lures: [], cheese: [], clutter: [], vac: null, nid: 0, events: [], seen: new Set<string>(),
      catches: 0, alerts: 0, bestBag: 0, lureMax: 0, woke: false, rideGrab: 0, scareMax: 0, yarnMax: 0, bowlMax: 0, helmet: 0,
      down: false, wowN: 0, firstTap: -1, firstBig: -1, sim: false, clearT: 0, tapped: false, freeze: 0,
      banner: null, spot: null, big: null, plan: null, phewT: -999, bonkN: 0,
    } as MouseState;
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
    if (!s.sim) {
      if (s.events.length > 90) s.events.splice(0, s.events.length - 90);
      while (s.events.length && s.t - s.events[0].t > 150) s.events.shift();
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts + s.sp,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const cheesemouse = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
/** 결과 화면·둘 중 하나는 버릇 봇도 그냥 넘긴다 */
function between(s: MouseState, left: boolean): Input | null {
  if (s.phase === 'play') return null;
  if (s.down) return NO;
  if (s.phase === 'result') return s.pt >= RES_MIN ? at(0.5, 0.8) : NO;
  if (s.phase === 'pick') return s.picked < 0 && s.pt >= PICK_MIN ? at(left ? 0.28 : 0.72, 0.9) : NO;
  return NO;
}
const tgtOf = (k: TgK, o: { id: number; x: number; y: number }): Tgt => ({ k, id: o.id, x: o.x, y: o.y });
/** 앞날 흉내: 상태를 베껴 tg로 가 본다 */
function clone(s: MouseState): MouseState {
  return {
    ...s, sim: true, events: [], rng: mulberry32((s.t * 2654435761) >>> 0), starOk: s.starOk.slice(), perk: s.perk.slice(), dexC: s.dexC.slice(), dexQ: s.dexQ.slice(), newDex: [],
    m: { ...s.m, bagK: s.m.bagK.slice(), tgt: s.m.tgt ? { ...s.m.tgt } : null, trail: [] },
    cats: s.cats.map((k) => ({ ...k })), hides: s.hides.map((h) => ({ ...h })), lures: s.lures.map((l) => ({ ...l, fly: l.fly ? { ...l.fly } : null })),
    cheese: s.cheese.map((q) => ({ ...q })), clutter: s.clutter.map((q) => ({ ...q })), vac: s.vac ? { ...s.vac } : null,
    banner: null, spot: null, big: null, plan: null,
  };
}
interface SimR { ok: boolean; bad: boolean; t: number; sus: number; s: MouseState }
function sim(s: MouseState, tg: Tgt | null, T: number, margin: number): SimR {
  const c = clone(s);
  if (tg && !goTo(c, tg)) return { ok: false, bad: true, t: 1e9, sus: 1, s: c };
  const k0 = c.catches, a0 = c.alerts, w0 = c.woke;
  let arr = -1, sus = 0, t = 0;
  for (; t < T; t++) {
    c.t++;
    playStep(c);
    if (c.phase !== 'play') break;
    if (c.catches > k0 || c.alerts > a0 || (c.woke && !w0)) return { ok: true, bad: true, t, sus: 1, s: c };
    if (visible(c.m)) for (const q of c.cats) if (q.mode === SUSP && q.sus > sus) sus = q.sus;
    if (arr < 0 && c.m.st !== RUN) arr = t;
    if (arr >= 0 && t - arr >= margin) break;
  }
  return { ok: true, bad: sus > 0.62 || arr < 0, t: arr < 0 ? t : arr, sus, s: c };
}
/** 판의 별 셋째에 맞춘 보따리 크기 */
function wantBag(s: MouseState, left: number) {
  const st = STAGES[s.stage].star;
  const goal = st.k === 'bag' && s.bestBag < st.n ? Math.max(st.n, 4) : 4;
  return Math.max(1, Math.min(goal, left + s.m.bag));
}
const near = (s: MouseState, list: Cheese[], n: number) => [...list].sort((a, b) => dist(a.x, a.y, s.m.x, s.m.y) - dist(b.x, b.y, s.m.x, s.m.y)).slice(0, n);
/** 별 셋째에 쓰는 소리 물건인가 · 그 기록 */
const starLure = (s: MouseState, l: Lure) => {
  const st = STAGES[s.stage].star;
  return (st.k === 'lure' && (l.k === 'spoon' || l.k === 'lid' || l.k === 'egg') && s.lureMax < st.n) || (st.k === 'scare' && l.k === 'balloon' && s.scareMax < st.n) || (st.k === 'yarn' && l.k === 'yarn' && s.yarnMax < st.n) || (st.k === 'bowl' && l.k === 'bowl' && s.bowlMax < st.n);
};
const starScore = (s: MouseState) => s.lureMax * 1 + s.scareMax + s.yarnMax + s.bowlMax;
function decide(s: MouseState, danger: boolean, bold = false): Tgt | null {
  const m = s.m, d = STAGES[s.stage];
  const left = s.cheese.reduce((a, q) => a + q.v, 0), want = wantBag(s, left);
  const hides = s.hides.map((h) => tgtOf('hide', h));
  if (danger && (visible(m) || m.st === HIDE)) {
    // 도망: 숨을 곳·쥐구멍 중 안 잡히고 가장 빨리
    // 냄새 맡는 놈에게 들켰으면 숨어도 소용없다 — 쥐구멍이나 먼 숨을 곳으로
    const sniffed = s.cats.some((q) => q.k === 'sniff' && (q.mode === ALERT || q.mode === CHASE || q.mode === FOLLOW) && dist(q.x, q.y, m.x, m.y) < 0.3);
    const opts = [holeTgt(s), ...hides.filter((h) => !(sniffed && dist(h.x, h.y, m.x, m.y) < 0.2))].sort((a, b) => dist(a.x, a.y, m.x, m.y) - dist(b.x, b.y, m.x, m.y)).slice(0, 4);
    let best: Tgt | null = null, bt = 1e9;
    for (const tg of opts) {
      if (m.st === HIDE && tg.k === 'hide' && tg.id === m.hide) continue;
      const r = sim(s, tg, 160, 0);
      const caughtNow = r.s.catches > s.catches;
      const v = caughtNow ? 1e6 + r.t : r.t + (tg.k === 'hole' ? -10 : 0);
      if (v < bt) (bt = v), (best = tg);
    }
    if (m.st === HIDE) {
      // 숨어 있는데 냄새 맡는 놈이 오면 자리를 옮긴다, 아니면 그대로
      const sn = s.cats.some((q) => q.mode === FOLLOW && q.follow === -2 && dist(q.x, q.y, m.x, m.y) < 0.2);
      return sn && best && !(best.k === 'hide' && best.id === m.hide) ? best : null;
    }
    return best;
  }
  // 별 셋째: 소리 물건으로 여럿 꾀기
  for (const l of s.lures) {
    if (l.used || l.fly || l.cool > 0 || !starLure(s, l)) continue;
    const r = sim(s, tgtOf('lure', l), 300, l.k === 'yarn' ? 170 : 50);
    if (!r.bad && starScore(r.s) > starScore(s) && (starNow(r.s) || starScore(r.s) >= starScore(s) + 2)) return tgtOf('lure', l);
  }
  // 별 셋째: 청소기 타고 줍기 (청소기 길 위에 치즈가 남아 있을 때만)
  const onRoute = s.vac ? s.cheese.filter((q) => s.vac!.route.some((p, i) => { const b = s.vac!.route[(i + 1) % s.vac!.route.length]; for (let k = 0; k <= 10; k++) if (dist(q.x, q.y, p.x + ((b.x - p.x) * k) / 10, p.y + ((b.y - p.y) * k) / 10) < 0.05) return true; return false; })).length : 0;
  if (s.vac && d.star.k === 'ride' && s.rideGrab < d.star.n && onRoute > 0) {
    if (m.st === RIDE) return null;
    const r = sim(s, { k: 'vac', id: 0, x: s.vac.x, y: s.vac.y }, 200, 120);
    if (!r.bad && r.s.rideGrab > s.rideGrab) return { k: 'vac', id: 0, x: s.vac.x, y: s.vac.y };
  }
  const cands: [Tgt, number][] = [];
  if (m.bag > 0 && (m.bag >= want || left === 0)) cands.push([holeTgt(s), 6]);
  if (m.bag < want || left > 0) for (const q of near(s, s.cheese, 4)) cands.push([tgtOf('cheese', q), q.v * (m.bag < want ? 1 : 0.35)]);
  if (m.bag > 0 && !cands.some(([t]) => t.k === 'hole')) cands.push([holeTgt(s), 0.5 + m.bag * 0.3]);
  let best: Tgt | null = null, bv = -1, risky: Tgt | null = null, rv = 1e9;
  for (const [tg, val] of cands) {
    const r = sim(s, tg, 260, tg.k === 'cheese' ? 18 : 0);
    if (r.s.catches === s.catches && r.sus + (r.s.alerts > s.alerts ? 1 : 0) < rv) (rv = r.sus + (r.s.alerts > s.alerts ? 1 : 0)), (risky = tg);
    if (r.bad) continue;
    const v = (val * 100) / (r.t + 25) - r.sus * 0.8;
    if (v > bv) (bv = v), (best = tg);
  }
  if (best) return best;
  // 오래 기다렸으면 덜 위험한 쪽으로 무릅쓴다
  if (bold && risky) return risky;
  // 길이 막혔으면 소리 물건으로 비킨다
  for (const l of s.lures) {
    if (l.used || l.fly || l.cool > 0 || l.k === 'bowl' && s.cats.length < 5) continue;
    const r = sim(s, tgtOf('lure', l), 260, l.k === 'yarn' ? 120 : 45);
    if (r.bad) continue;
    for (const q of near(r.s, r.s.cheese, 2)) {
      const r2 = sim(r.s, tgtOf('cheese', q), 200, 12);
      if (!r2.bad) return tgtOf('lure', l);
    }
  }
  // 치즈 가까운 숨을 곳으로 옮겨 기다린다
  const tq = near(s, s.cheese, 1)[0];
  if (tq && m.st !== RIDE) {
    const stage = s.hides.filter((h) => !(m.st === HIDE && h.id === m.hide)).sort((a, b) => dist(a.x, a.y, tq.x, tq.y) - dist(b.x, b.y, tq.x, tq.y))[0];
    const here = m.st === HIDE ? dist(s.hides[m.hide].x, s.hides[m.hide].y, tq.x, tq.y) : m.st === HOLE ? dist(s.hx, s.hy, tq.x, tq.y) : 9;
    if (stage && dist(stage.x, stage.y, tq.x, tq.y) < here - 0.08) {
      const r = sim(s, tgtOf('hide', stage), 220, 0);
      if (!r.bad) return tgtOf('hide', stage);
    }
  }
  if (m.st === HIDE || m.st === HOLE || (m.st === RIDE && onRoute > 0)) return null;
  // 서 있는데 갈 데가 없으면 가장 덜 위험한 숨을 곳으로
  let hb: Tgt | null = null, hv = 1e9;
  for (const tg of [holeTgt(s), ...hides].sort((a, b) => dist(a.x, a.y, m.x, m.y) - dist(b.x, b.y, m.x, m.y)).slice(0, 3)) {
    const r = sim(s, tg, 160, 0);
    const v = (r.s.catches > s.catches ? 1e5 : 0) + r.sus * 100 + r.t;
    if (v < hv) (hv = v), (hb = tg);
  }
  return hb;
}
const smartMem = new WeakMap<object, { next: number; wait: number }>();
/** 봇: 눈길을 앞질러 셈해, 안전한 길로 큰 보따리를 만들고, 막히면 숟가락으로 비킨다 */
export const cheesemouseSmart: Bot<MouseState> = {
  name: '눈길을 셈해 숨고 꾀며 크게',
  act(s) {
    const mid = between(s, s.stage < 4);
    if (mid) return mid;
    if (s.down) return NO;
    const m = s.m;
    if (m.st === CAUGHT) return NO;
    let me = smartMem.get(s);
    if (!me) smartMem.set(s, (me = { next: 0, wait: 0 }));
    const danger = s.cats.some((q) => q.mode === ALERT || q.mode === CHASE || q.mode === ROLL || q.mode === POUNCE || q.mode === MISS || (q.mode === FOLLOW && q.follow === -2 && dist(q.x, q.y, m.x, m.y) < 0.25));
    const soft = !danger && visible(m) && s.cats.some((q) => q.mode === SUSP && q.sus > 0.15);
    if (!danger && !soft && s.t < me.next) return NO;
    me.next = s.t + (m.st === RUN ? 30 : 12);
    if (m.st === RUN && !danger && m.tgt) {
      // 가는 중: 계속 가도 안전한가만 본다
      const r = sim(s, null, 200, m.tgt.k === 'cheese' ? 18 : 0);
      if (!r.bad) return NO;
    }
    if (danger) me.next = s.t + 9;
    let tg = decide(s, danger, me.wait > 360);
    // 너무 오래 막혔으면 (15초) 남은 치즈나 쥐구멍으로 무릅쓰고 간다
    if (!tg && me.wait > 900 && (m.st === HIDE || m.st === HOLE)) tg = m.bag > 0 && m.st !== HOLE ? holeTgt(s) : near(s, s.cheese, 1)[0] ? tgtOf('cheese', near(s, s.cheese, 1)[0]) : null;
    if (!tg) {
      if (m.st === HIDE || m.st === HOLE) me.wait += 12;
      return NO;
    }
    me.wait = 0;
    if (m.tgt && m.tgt.k === tg.k && m.tgt.id === tg.id && m.st === RUN) return NO;
    return at(tg.x, tg.y);
  },
};
/** 봇: 생쥐가 멈춰 있으면 아무 때나(평균 0.8초 뒤) 눈에 띄는 아무것이나 톡 — 넷에 하나는 빈 바닥. 고양이는 안 본다 (처음 하는 사람) */
export const cheesemouseRandom: Bot<MouseState> = {
  name: '아무 때나 아무거나 톡',
  act(s, rng) {
    if (s.down || (s.phase === 'play' && s.m.st === RUN) || rng() >= 1 / 50) return NO;
    if (s.phase !== 'play' || rng() < 0.25) return at(0.05 + rng() * 0.9, 0.3 + rng() * 1.0);
    const all: P[] = [{ x: s.hx, y: s.hy }, ...s.hides, ...s.cheese, ...s.lures.filter((l) => !l.used && !l.fly), ...(s.vac ? [s.vac] : [])];
    const o = all[Math.floor(rng() * all.length)];
    return at(o.x, o.y);
  },
};
/** 버릇 봇: 늘 가장 가까운 치즈, 다 주우면 쥐구멍 (숨지 않는다) */
export const cheesemouseHabit: Bot<MouseState> = {
  name: '버릇: 늘 가장 가까운 치즈',
  act(s) {
    const mid = between(s, true);
    if (mid) return mid;
    const m = s.m;
    if (s.down || m.st === RUN || m.st === CAUGHT) return NO;
    const q = near(s, s.cheese, 1)[0];
    if (q) return at(q.x, q.y);
    return m.bag > 0 && m.st !== HOLE ? at(s.hx, s.hy) : NO;
  },
};
/** 독립 버릇 봇: 한 조각 주우면 곧장 쥐구멍 */
export const cheesemouseHabit2: Bot<MouseState> = {
  name: '버릇: 한 조각마다 곧장 쥐구멍',
  act(s) {
    const mid = between(s, false);
    if (mid) return mid;
    const m = s.m;
    if (s.down || m.st === RUN || m.st === CAUGHT) return NO;
    if (m.bag > 0) return m.st !== HOLE ? at(s.hx, s.hy) : NO;
    const q = near(s, s.cheese, 1)[0];
    return q ? at(q.x, q.y) : NO;
  },
};
/** 측정·스크린샷용: k판으로 건너뛰기 */
export const __jump = (s: MouseState, k: number, lv = k + 1, perk: number[] = [k > 3 ? 1 : 0, k > 7 ? 1 : 0]) => ((s.stage = k), (s.lv = lv), (s.perk = perk), (s.town = k), newStage(s));

// ───────────────────────────── 그리기: 도구 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const OUT = '#4a2c1d', LW = 0.09;
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
  for (const [o, c2] of st) g.addColorStop(o, c2);
  return g;
}
function radg(ctx: C2, x: number, y: number, r0: number, r1: number, ...st: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.01, r1));
  for (const [o, c2] of st) g.addColorStop(o, c2);
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
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  paint(cv.getContext('2d')!);
  return cv;
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
function blush(g: C2, x: number, y: number, r: number) {
  ell(g, x, y, r, r * 0.62);
  g.fillStyle = 'rgba(255,120,140,.42)';
  g.fill();
}
/** 굽는 그림 안의 글자: 지금 배율을 읽어 px 글꼴로 (아주 작은 글꼴 크기를 피한다) */
function wtext(g: C2, str: string, x: number, y: number, size: number, weight: number, col: string, align: CanvasTextAlign = 'center') {
  const K = g.getTransform().a || 1;
  g.save();
  g.translate(x, y);
  g.scale(1 / K, 1 / K);
  g.font = `${weight} ${Math.max(1, Math.round(size * K))}px system-ui, sans-serif`;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.fillStyle = col;
  g.fillText(str, 0, 0);
  g.restore();
}
function line(g: C2, x0: number, y0: number, x1: number, y1: number, col: string, lw: number) {
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.strokeStyle = col;
  g.lineWidth = lw;
  g.stroke();
}

// ───────────────────────────── 스티커 굽기 ─────────────────────────────
const SPR = new Map<string, HTMLCanvasElement>();
/** 굽는 크기는 1/3옥타브 계단 — 조금씩 달라도 새로 굽지 않는다 */
const sprQ = (px: number) => Math.ceil(2 ** (Math.ceil(Math.log2(Math.max(6, px)) * 3 - 1e-6) / 3));
interface Frame { w: number; h: number; ox: number; oy: number }
const F_CAT: Frame = { w: 4.6, h: 3.4, ox: 2.3, oy: 2.85 }, F_MOUSE: Frame = { w: 3.8, h: 3.2, ox: 1.9, oy: 2.6 }, F_PROP: Frame = { w: 3, h: 3, ox: 1.5, oy: 2.4 }, F_KING: Frame = { w: 3.4, h: 3.2, ox: 1.7, oy: 2.6 };
function spr(key: string, fr: Frame, px: number, paint: (g: C2) => void): HTMLCanvasElement {
  const q = sprQ(px), k = key + ':' + q;
  let cv = SPR.get(k);
  if (!cv) {
    if (SPR.size > 420) SPR.clear();
    cv = layer(fr.w * q, fr.h * q, (g) => {
      g.translate(fr.ox * q, fr.oy * q);
      g.scale(q, q);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      paint(g);
    });
    SPR.set(k, cv);
  }
  return cv;
}
/** 스티커 찍기: (0,0) = 발 가운데, u = 단위 px */
function stamp(ctx: C2, cv: HTMLCanvasElement, fr: Frame, u: number) {
  ctx.drawImage(cv, -fr.ox * u, -fr.oy * u, fr.w * u, fr.h * u);
}
/** 미리 굽기 줄: 그림 프레임 밖(setTimeout)에서 조금씩 — 놀이 중 한 프레임이 길어지지 않게 */
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

// ───────────────────────────── 고양이 (단위: 몸 반지름 ≈ 1, 발 = (0,0), 오른쪽을 본다) ─────────────────────────────
interface Coat { base: string; dark: string; light: string; belly: string; nose: string; eye: string }
const COAT: Record<CatK, Coat> = {
  tabby: { base: '#f7a94b', dark: '#d9772b', light: '#ffd49a', belly: '#fff3e0', nose: '#ff8fa3', eye: '#86c443' },
  gray: { base: '#a9b5c7', dark: '#7f8ca3', light: '#d6dee9', belly: '#ffffff', nose: '#ff9fb2', eye: '#ffc93a' },
  sleepy: { base: '#f7e6c6', dark: '#e2c597', light: '#fff8ea', belly: '#ffffff', nose: '#ffa3b5', eye: '#7fb0e6' },
  specs: { base: '#43465c', dark: '#2c2e3e', light: '#62667f', belly: '#ffffff', nose: '#ff9fb2', eye: '#9be35a' },
  sniff: { base: '#c48d5f', dark: '#94633d', light: '#e6b98e', belly: '#fff0e0', nose: '#ff7f98', eye: '#5a3a22' },
  party: { base: '#fffaf2', dark: '#e6dccf', light: '#ffffff', belly: '#ffffff', nose: '#ff9fb2', eye: '#58b4e8' },
  tower: { base: '#f3eee8', dark: '#d3cbbf', light: '#ffffff', belly: '#ffffff', nose: '#ff9fb2', eye: '#ffc23a' },
  black: { base: '#353546', dark: '#23232e', light: '#55556c', belly: '#454558', nose: '#6a5268', eye: '#ffd23a' },
  siam: { base: '#f6ead8', dark: '#6e4e3c', light: '#fffaf0', belly: '#fffaf0', nose: '#7a4e40', eye: '#4fb0ff' },
  king: { base: '#f7a94b', dark: '#d9772b', light: '#ffd49a', belly: '#fff3e0', nose: '#ff8fa3', eye: '#86c443' },
};
/** 자세: 걷기 둘 · 서서 두리번 · 앉아 세수 · 하품 · '!' · 달리기 둘 · 덮치기 · 어질 · 잠 · 킁킁 · 우쭐 · 깜짝 · 냠냠 */
const PW0 = 0, PW1 = 1, PST = 2, PSIT = 3, PYAWN = 4, PALERT = 5, PR0 = 6, PR1 = 7, PPOUNCE = 8, PDIZZY = 9, PSLEEP = 10, PSNIFF = 11, PHAPPY = 12, PSCARED = 13, PEAT = 14;
const POSES = 15;
/** 얼굴: 눈 모양 0 보통(반쯤 감은) · 1 동그랗게(놀람) · 2 감음(호) · 3 웃음(^^) · 4 어질(소용돌이) · 5 졸림(일자) · 6 매서움 */
function catFace(g: C2, k: CatK, hx: number, hy: number, eyes: number, mouth: number) {
  const C = COAT[k];
  // 주둥이 · 볼
  ell(g, hx + 0.2, hy + 0.12, 0.3, 0.2);
  g.fillStyle = k === 'specs' || k === 'black' ? (k === 'specs' ? '#ffffff' : C.light) : C.belly;
  g.fill();
  const ex = [hx + 0.02, hx + 0.34], ey = hy - 0.08;
  for (let i = 0; i < 2; i++) {
    const x = ex[i], r = i ? 0.13 : 0.11;
    if (eyes === 2 || eyes === 5) {
      g.beginPath();
      if (eyes === 2) g.arc(x, ey + 0.02, r, Math.PI * 0.15, Math.PI * 0.85);
      else (g.moveTo(x - r, ey + 0.02), g.lineTo(x + r, ey + 0.02));
      g.strokeStyle = OUT;
      g.lineWidth = 0.07;
      g.stroke();
    } else if (eyes === 3) {
      g.beginPath();
      g.arc(x, ey + 0.06, r, Math.PI * 1.15, Math.PI * 1.85);
      g.strokeStyle = OUT;
      g.lineWidth = 0.07;
      g.stroke();
    } else if (eyes === 4) {
      g.beginPath();
      for (let a = 0; a < 9; a += 0.4) g.lineTo(x + Math.cos(a) * a * 0.016, ey + Math.sin(a) * a * 0.016);
      g.strokeStyle = OUT;
      g.lineWidth = 0.05;
      g.stroke();
    } else {
      const big = eyes === 1 ? 1.25 : 1;
      ell(g, x, ey, r * big, r * 1.15 * big);
      ink(g, '#ffffff', 0.05);
      ell(g, x + 0.01, ey + 0.01, r * 0.82 * big, r * 0.98 * big);
      g.fillStyle = C.eye;
      g.fill();
      ell(g, x + 0.02, ey + 0.01, eyes === 1 ? 0.035 : 0.04, eyes === 1 ? 0.06 : r * 0.8);
      g.fillStyle = '#1e1410';
      g.fill();
      ell(g, x - 0.03, ey - 0.05, 0.035, 0.035);
      g.fillStyle = '#ffffff';
      g.fill();
      if (eyes === 0) {
        // 반쯤 감긴 눈꺼풀 (심드렁)
        g.beginPath();
        g.ellipse(x, ey, r * 1.05, r * 1.2, 0, Math.PI, TAU);
        g.fillStyle = C.base;
        g.fill();
        g.beginPath();
        g.moveTo(x - r * 1.05, ey);
        g.lineTo(x + r * 1.05, ey);
        g.strokeStyle = OUT;
        g.lineWidth = 0.05;
        g.stroke();
      } else if (eyes === 6) {
        line(g, x - r, ey - r * 1.2, x + r, ey - r * 0.5, OUT, 0.07);
      }
    }
  }
  // 코 · 입
  g.beginPath();
  g.moveTo(hx + 0.3, hy + 0.04);
  g.lineTo(hx + 0.42, hy + 0.04);
  g.lineTo(hx + 0.36, hy + 0.12);
  g.closePath();
  ink(g, C.nose, 0.04);
  if (k === 'sniff') (ell(g, hx + 0.4, hy + 0.08, 0.13, 0.1), ink(g, C.nose, 0.05), shine(g, hx + 0.37, hy + 0.04, 0.04, 0.025));
  g.strokeStyle = OUT;
  g.lineWidth = 0.05;
  if (mouth === 1) {
    // 하품 · 놀람: 크게 벌린 입
    ell(g, hx + 0.3, hy + 0.3, 0.15, 0.2);
    ink(g, '#c2405a', 0.05);
    ell(g, hx + 0.3, hy + 0.38, 0.09, 0.07);
    g.fillStyle = '#ff8fa3';
    g.fill();
  } else if (mouth === 2) {
    // 혀 빼꼼
    g.beginPath();
    g.moveTo(hx + 0.2, hy + 0.17);
    g.quadraticCurveTo(hx + 0.32, hy + 0.24, hx + 0.44, hy + 0.17);
    g.stroke();
    ell(g, hx + 0.33, hy + 0.26, 0.06, 0.08);
    ink(g, '#ff7f98', 0.04);
  } else {
    g.beginPath();
    g.moveTo(hx + 0.22, hy + 0.17);
    g.quadraticCurveTo(hx + 0.29, hy + 0.23, hx + 0.36, hy + 0.15);
    g.quadraticCurveTo(hx + 0.43, hy + 0.23, hx + 0.5, hy + 0.17);
    g.stroke();
  }
  // 수염
  g.strokeStyle = 'rgba(74,44,29,.55)';
  g.lineWidth = 0.035;
  for (const dy of [-0.02, 0.06]) (g.beginPath(), g.moveTo(hx + 0.5, hy + 0.1 + dy), g.lineTo(hx + 0.85, hy + 0.03 + dy * 1.6), g.stroke());
  blush(g, hx + 0.4, hy + 0.06, 0.09);
}
function catHead(g: C2, k: CatK, hx: number, hy: number, eyes: number, mouth: number, earBack = 0) {
  const C = COAT[k], fluffy = k === 'sleepy' || k === 'tower';
  // 귀
  for (const [ex, tip] of [[-0.12, -0.25], [0.3, 0.15]] as [number, number][]) {
    const back = earBack * 0.18;
    g.beginPath();
    g.moveTo(hx + ex - 0.18, hy - 0.32);
    g.lineTo(hx + tip - back, hy - 0.82 + earBack * 0.2);
    g.lineTo(hx + ex + 0.24, hy - 0.4);
    g.closePath();
    ink(g, k === 'siam' ? C.dark : C.base);
    g.beginPath();
    g.moveTo(hx + ex - 0.08, hy - 0.38);
    g.lineTo(hx + tip - back + 0.02, hy - 0.68 + earBack * 0.2);
    g.lineTo(hx + ex + 0.14, hy - 0.42);
    g.closePath();
    g.fillStyle = '#ffb3c2';
    g.fill();
  }
  // 머리
  ell(g, hx, hy, fluffy ? 0.54 : 0.5, 0.44);
  ink(g, lin(g, 0, hy - 0.45, 0, hy + 0.45, [0, COAT[k].light], [0.55, C.base], [1, C.base]));
  if (fluffy) for (const a of [2.4, 2.9, 3.4]) (ell(g, hx + Math.cos(a) * 0.5, hy + Math.sin(a) * 0.38, 0.12, 0.09), (g.fillStyle = C.base), g.fill());
  // 무늬
  if (k === 'tabby' || k === 'king') {
    g.strokeStyle = C.dark;
    g.lineWidth = 0.07;
    for (const dx of [-0.12, 0.02, 0.16]) (g.beginPath(), g.moveTo(hx + dx, hy - 0.42), g.lineTo(hx + dx + 0.02, hy - 0.26), g.stroke());
  }
  if (k === 'siam') {
    ell(g, hx + 0.18, hy + 0.08, 0.32, 0.26);
    g.fillStyle = 'rgba(110,78,60,.75)';
    g.fill();
  }
  if (k === 'party') {
    ell(g, hx - 0.18, hy - 0.16, 0.22, 0.2);
    g.fillStyle = '#f4a35a';
    g.fill();
    ell(g, hx + 0.3, hy - 0.26, 0.14, 0.12);
    g.fillStyle = '#3d3a44';
    g.fill();
  }
  if (k === 'specs') {
    // 턱시도: 얼굴 가운데 흰 무늬
    g.beginPath();
    g.moveTo(hx + 0.12, hy - 0.35);
    g.quadraticCurveTo(hx + 0.05, hy + 0.1, hx + 0.02, hy + 0.42);
    g.lineTo(hx + 0.5, hy + 0.3);
    g.quadraticCurveTo(hx + 0.4, hy - 0.05, hx + 0.2, hy - 0.35);
    g.closePath();
    g.fillStyle = '#ffffff';
    g.fill();
  }
  shine(g, hx - 0.2, hy - 0.2, 0.14, 0.08, -0.6, 0.35);
  catFace(g, k, hx, hy, eyes, mouth);
  // 꾸밈
  if (k === 'specs') {
    // 큰 동그란 안경
    for (const x of [hx + 0.02, hx + 0.36]) (ell(g, x, hy - 0.08, 0.17, 0.17), (g.fillStyle = 'rgba(200,235,255,.28)'), g.fill(), (g.strokeStyle = '#c99a2e'), (g.lineWidth = 0.065), g.stroke());
    line(g, hx + 0.19, hy - 0.1, hx + 0.19, hy - 0.1, '#c99a2e', 0.06);
    g.beginPath();
    g.moveTo(hx + 0.17, hy - 0.12);
    g.quadraticCurveTo(hx + 0.19, hy - 0.17, hx + 0.21, hy - 0.12);
    g.stroke();
    line(g, hx - 0.15, hy - 0.1, hx - 0.38, hy - 0.16, '#c99a2e', 0.05);
  } else if (k === 'sleepy') {
    // 고깔 잠옷 모자
    g.beginPath();
    g.moveTo(hx - 0.42, hy - 0.3);
    g.quadraticCurveTo(hx - 0.1, hy - 0.62, hx + 0.38, hy - 0.36);
    g.quadraticCurveTo(hx - 0.05, hy - 0.9, hx - 0.62, hy - 0.82);
    g.closePath();
    ink(g, '#7fa8f0');
    for (const q of [0.3, 0.6]) line(g, hx - 0.42 + q * 0.1, hy - 0.4 - q * 0.35, hx + 0.2 - q * 0.4, hy - 0.42 - q * 0.3, '#ffffff', 0.06);
    ell(g, hx - 0.64, hy - 0.82, 0.12, 0.12);
    ink(g, '#ffffff', 0.05);
  } else if (k === 'party') {
    g.beginPath();
    g.moveTo(hx - 0.24, hy - 0.36);
    g.lineTo(hx + 0.02, hy - 1.06);
    g.lineTo(hx + 0.26, hy - 0.4);
    g.closePath();
    ink(g, lin(g, hx - 0.2, 0, hx + 0.2, 0, [0, '#ff6b9a'], [1, '#ffb347']));
    for (const q of [0.35, 0.65]) line(g, hx - 0.24 + q * 0.26, hy - 0.36 - q * 0.7, hx + 0.26 - q * 0.24, hy - 0.4 - q * 0.66, '#fff36b', 0.06);
    ell(g, hx + 0.02, hy - 1.08, 0.08, 0.08);
    ink(g, '#fff36b', 0.04);
  } else if (k === 'tower') {
    // 선장 모자
    rr(g, hx - 0.34, hy - 0.62, 0.62, 0.22, 0.08);
    ink(g, '#2f4f8f');
    rr(g, hx - 0.42, hy - 0.44, 0.8, 0.1, 0.05);
    ink(g, '#22396b', 0.05);
    line(g, hx - 0.32, hy - 0.5, hx + 0.26, hy - 0.5, '#ffd23a', 0.06);
  } else if (k === 'black') {
    // 빨간 두건
    g.beginPath();
    g.moveTo(hx - 0.46, hy - 0.12);
    g.quadraticCurveTo(hx, hy - 0.62, hx + 0.46, hy - 0.2);
    g.lineTo(hx + 0.3, hy - 0.3);
    g.quadraticCurveTo(hx, hy - 0.42, hx - 0.3, hy - 0.2);
    g.closePath();
    ink(g, '#e8454f', 0.05);
    for (const d of [0, 1]) (g.beginPath(), g.moveTo(hx - 0.46, hy - 0.12), g.lineTo(hx - 0.72, hy - 0.2 + d * 0.16), g.lineTo(hx - 0.58, hy - 0.02), g.closePath(), ink(g, '#e8454f', 0.04));
  } else if (k === 'siam') {
    for (const sd of [-1, 1]) (g.beginPath(), g.moveTo(hx + 0.32, hy - 0.42), g.lineTo(hx + 0.32 + sd * 0.16, hy - 0.54), g.lineTo(hx + 0.32 + sd * 0.16, hy - 0.3), g.closePath(), ink(g, '#ff7fb0', 0.04));
    ell(g, hx + 0.32, hy - 0.42, 0.06, 0.06);
    ink(g, '#ff4f90', 0.04);
  }
}
function catTail(g: C2, k: CatK, x: number, y: number, mode: number) {
  const C = COAT[k], col = k === 'siam' ? C.dark : C.base;
  g.beginPath();
  g.moveTo(x, y);
  if (mode === 1) g.bezierCurveTo(x - 0.25, y - 0.2, x - 0.25, y - 0.9, x - 0.15, y - 1.2); // 쫑긋 (놀람)
  else if (mode === 2) g.bezierCurveTo(x - 0.4, y + 0.02, x - 0.7, y - 0.05, x - 0.95, y - 0.12); // 뒤로 쭉 (달리기)
  else g.bezierCurveTo(x - 0.45, y + 0.05, x - 0.55, y - 0.6, x - 0.32, y - 0.9); // 물음표 꼬리
  g.strokeStyle = OUT;
  g.lineWidth = mode === 1 ? 0.42 : 0.3;
  g.stroke();
  g.strokeStyle = col;
  g.lineWidth = mode === 1 ? 0.3 : 0.2;
  g.stroke();
  if (k === 'tabby' || k === 'king') {
    g.setLineDash([0.06, 0.16]);
    g.strokeStyle = C.dark;
    g.stroke();
    g.setLineDash([]);
  }
}
function catLeg(g: C2, k: CatK, x: number, top: number, dx: number, far: boolean, run = 0) {
  const C = COAT[k];
  g.beginPath();
  g.moveTo(x - 0.1, top);
  g.lineTo(x - 0.09 + dx, -0.06 - run);
  g.quadraticCurveTo(x + dx, 0.02 - run, x + 0.11 + dx, -0.06 - run);
  g.lineTo(x + 0.1, top);
  g.closePath();
  ink(g, far ? C.dark : k === 'gray' || k === 'specs' || k === 'party' ? '#ffffff' : k === 'siam' ? C.dark : C.base, 0.07);
}
function catBody(g: C2, k: CatK, bx: number, by: number, rx: number, ry: number, rot = 0, puff = false) {
  const C = COAT[k];
  if (puff) {
    burstPath(g, bx, by, rx * 1.12, 14, 0.84, 0.2);
    ink(g, C.base);
  }
  ell(g, bx, by, rx, ry, rot);
  ink(g, lin(g, 0, by - ry, 0, by + ry, [0, C.light], [0.5, C.base], [1, C.dark]));
  // 배
  ell(g, bx + rx * 0.25, by + ry * 0.35, rx * 0.55, ry * 0.5, rot);
  g.fillStyle = k === 'black' ? C.light : C.belly;
  g.globalAlpha = k === 'black' ? 0.6 : 1;
  g.fill();
  g.globalAlpha = 1;
  if (k === 'tabby' || k === 'king') {
    g.strokeStyle = C.dark;
    g.lineWidth = 0.08;
    for (const dx of [-0.45, -0.15, 0.15]) (g.beginPath(), g.moveTo(bx + dx * rx, by - ry * 0.95), g.quadraticCurveTo(bx + dx * rx + 0.1, by - ry * 0.4, bx + dx * rx - 0.02, by - ry * 0.1), g.stroke());
  }
  if (k === 'party') {
    ell(g, bx - rx * 0.4, by - ry * 0.3, rx * 0.3, ry * 0.45);
    g.fillStyle = '#f4a35a';
    g.fill();
    ell(g, bx + rx * 0.15, by - ry * 0.55, rx * 0.22, ry * 0.3);
    g.fillStyle = '#3d3a44';
    g.fill();
  }
  if (k === 'siam') {
    ell(g, bx - rx * 0.7, by, rx * 0.3, ry * 0.6);
    g.fillStyle = 'rgba(110,78,60,.45)';
    g.fill();
  }
  shine(g, bx - rx * 0.35, by - ry * 0.55, rx * 0.3, ry * 0.18, -0.2, 0.35);
}
/** 목걸이 (방울) */
function collar(g: C2, k: CatK, hx: number, hy: number) {
  if (k === 'sleepy' || k === 'tower' || k === 'black') return;
  const col = k === 'gray' ? '#3cbf7a' : k === 'specs' ? '#e8454f' : k === 'party' ? '#7a5cff' : k === 'siam' ? '#ff4f90' : '#e8454f';
  g.beginPath();
  g.ellipse(hx - 0.05, hy + 0.34, 0.34, 0.12, 0.3, 0.2, Math.PI - 0.2);
  g.strokeStyle = OUT;
  g.lineWidth = 0.14;
  g.stroke();
  g.strokeStyle = col;
  g.lineWidth = 0.09;
  g.stroke();
  if (k === 'party') {
    // 나비넥타이
    for (const sd of [-1, 1]) (g.beginPath(), g.moveTo(hx, hy + 0.44), g.lineTo(hx + sd * 0.18, hy + 0.34), g.lineTo(hx + sd * 0.18, hy + 0.56), g.closePath(), ink(g, '#7a5cff', 0.04));
  } else {
    ell(g, hx + 0.02, hy + 0.5, 0.08, 0.08);
    ink(g, '#ffd23a', 0.04);
  }
}
function paintCat(g: C2, k: CatK, pose: number) {
  const C = COAT[k];
  if (pose === PSLEEP) {
    // 동그랗게 말아 잔다
    catTail(g, k, -0.6, -0.25, 0);
    ell(g, 0, -0.42, 0.95, 0.46);
    ink(g, lin(g, 0, -0.9, 0, 0, [0, C.light], [0.5, C.base], [1, C.dark]));
    if (k === 'tabby') for (const dx of [-0.4, -0.1, 0.2]) line(g, dx, -0.86, dx + 0.05, -0.55, C.dark, 0.08);
    catHead(g, k, 0.55, -0.48, 5, 0, 0.6);
    g.beginPath();
    g.moveTo(-0.85, -0.12);
    g.quadraticCurveTo(0, 0.12, 0.7, -0.08);
    g.strokeStyle = OUT;
    g.lineWidth = 0.3;
    g.stroke();
    g.strokeStyle = k === 'siam' ? C.dark : C.base;
    g.lineWidth = 0.2;
    g.stroke();
    return;
  }
  if (pose === PDIZZY) {
    // 벌러덩 — 발이 하늘로
    for (const x of [-0.45, -0.15, 0.25, 0.5]) (g.beginPath(), g.moveTo(x, -0.6), g.lineTo(x + 0.08, -1.0), g.strokeStyle = OUT, (g.lineWidth = 0.26), g.stroke(), (g.strokeStyle = C.base), (g.lineWidth = 0.17), g.stroke());
    catTail(g, k, -0.8, -0.3, 2);
    ell(g, -0.05, -0.38, 0.92, 0.4);
    ink(g, lin(g, 0, -0.8, 0, 0, [0, C.belly], [1, C.base]));
    catHead(g, k, 0.72, -0.46, 4, 2, 0.4);
    return;
  }
  const sit = pose === PSIT || pose === PYAWN || pose === PHAPPY;
  const run = pose === PR0 || pose === PR1 || pose === PPOUNCE;
  const low = pose === PSNIFF || pose === PEAT;
  const puff = pose === PALERT || pose === PSCARED;
  if (sit) {
    catTail(g, k, -0.4, -0.12, 0);
    catLeg(g, k, -0.2, -0.5, 0, true);
    ell(g, -0.1, -0.72, 0.6, 0.66);
    ink(g, lin(g, 0, -1.4, 0, 0, [0, C.light], [0.5, C.base], [1, C.dark]));
    ell(g, 0.12, -0.6, 0.32, 0.44);
    g.fillStyle = k === 'black' ? C.light : C.belly;
    g.fill();
    if (k === 'tabby') for (const dx of [-0.4, -0.2]) line(g, dx, -1.2, dx + 0.06, -0.8, C.dark, 0.08);
    // 앞발 (세수할 땐 하나를 입가로)
    catLeg(g, k, 0.14, -0.6, 0, false);
    if (pose === PSIT) (ell(g, 0.62, -1.26, 0.12, 0.14), ink(g, C.base, 0.06));
    else catLeg(g, k, 0.36, -0.6, 0.02, false);
    const hx = 0.32, hy = -1.48;
    catHead(g, k, hx, hy, pose === PYAWN ? 2 : pose === PHAPPY ? 3 : 2, pose === PYAWN ? 1 : 0, pose === PYAWN ? 0.4 : 0);
    collar(g, k, hx, hy);
    return;
  }
  const bx = -0.12, by = run ? -0.66 : low ? -0.6 : -0.62, rx = run ? 0.95 : 0.82, ry = run ? 0.36 : 0.42;
  const hx = run ? 0.9 : low ? 0.8 : 0.68, hy = run ? -0.92 : low ? -0.5 : puff ? -1.16 : -1.06;
  catTail(g, k, bx - rx * 0.85, by - 0.05, puff ? 1 : run ? 2 : 0);
  // 다리: 먼 쪽 → 몸 → 가까운 쪽
  const st = pose === PW0 ? 1 : pose === PW1 ? -1 : 0, rs = pose === PR0 ? 1 : pose === PR1 ? -1 : 0;
  const lift = puff ? 0.12 : 0;
  if (run) {
    catLeg(g, k, -0.55, by + 0.1, -0.3 * rs - 0.15, true, 0.05);
    catLeg(g, k, 0.45, by + 0.1, 0.3 * rs + 0.25, true, 0.05);
  } else {
    catLeg(g, k, -0.5, by + 0.2, -0.12 * st, true, lift);
    catLeg(g, k, 0.36, by + 0.2, 0.12 * st, true, lift);
  }
  catBody(g, k, bx, by - lift, rx, ry, run ? -0.08 : 0, puff);
  if (run) {
    catLeg(g, k, -0.35, by + 0.1, 0.32 * rs - 0.2, false, 0.03);
    catLeg(g, k, 0.62, by + 0.1, -0.3 * rs + 0.32, false, 0.03);
  } else {
    catLeg(g, k, -0.3, by + 0.2, 0.12 * st, false, lift);
    catLeg(g, k, 0.56, by + 0.2, -0.12 * st, false, lift);
  }
  const eyes = puff ? 1 : run ? 6 : low ? 2 : pose === PPOUNCE ? 6 : k === 'sleepy' ? 5 : 0;
  catHead(g, k, hx, hy - lift, eyes, puff ? 1 : 0, run ? 1 : puff ? 0.5 : 0);
  collar(g, k, hx, hy - lift);
}
/** 뚱보 왕: 자세 0 잠 · 1 벌떡 · 2 데굴데굴(공) */
function paintKing(g: C2, pose: number) {
  const C = COAT.king;
  if (pose === 2) {
    ell(g, 0, -0.78, 0.8, 0.78);
    ink(g, lin(g, 0, -1.56, 0, 0, [0, C.light], [0.5, C.base], [1, C.dark]), 0.08);
    g.strokeStyle = C.dark;
    g.lineWidth = 0.1;
    for (let i = 0; i < 4; i++) (g.beginPath(), g.arc(0, -0.78, 0.62, i * 1.6, i * 1.6 + 0.8), g.stroke());
    catFace(g, 'king', 0.1, -0.72, 4, 1);
    return;
  }
  // 몸통 (둥근 떡)
  const by = pose === 1 ? -0.95 : -0.62;
  catTail(g, 'king', -0.9, by + 0.2, pose === 1 ? 1 : 0);
  ell(g, 0, by, 1.05, pose === 1 ? 0.88 : 0.62);
  ink(g, lin(g, 0, by - 0.9, 0, by + 0.6, [0, C.light], [0.5, C.base], [1, C.dark]), 0.08);
  ell(g, 0.2, by + 0.18, 0.62, 0.38);
  g.fillStyle = C.belly;
  g.fill();
  g.strokeStyle = C.dark;
  g.lineWidth = 0.1;
  for (const dx of [-0.6, -0.25, 0.1]) (g.beginPath(), g.moveTo(dx, by - 0.58), g.quadraticCurveTo(dx + 0.1, by - 0.25, dx, by), g.stroke());
  // 망토
  g.beginPath();
  g.moveTo(-0.2, by - 0.6);
  g.quadraticCurveTo(-1.0, by - 0.4, -1.1, by + 0.4);
  g.quadraticCurveTo(-0.6, by + 0.5, -0.1, by + 0.3);
  g.closePath();
  ink(g, lin(g, -1, 0, 0, 0, [0, '#b8222e'], [1, '#ff4f5a']), 0.07);
  for (let i = 0; i < 4; i++) (ell(g, -1.02 + i * 0.26, by + 0.42 - i * 0.04, 0.07, 0.05), (g.fillStyle = '#ffffff'), g.fill());
  const hx = 0.62, hy = pose === 1 ? by - 0.62 : by - 0.3;
  catHead(g, 'king', hx, hy, pose === 1 ? 1 : 5, pose === 1 ? 1 : 0, 0);
  // 왕관
  g.beginPath();
  g.moveTo(hx - 0.3, hy - 0.34);
  for (const [x, y] of [[-0.3, -0.7], [-0.15, -0.5], [0, -0.78], [0.15, -0.5], [0.3, -0.7], [0.3, -0.34]] as [number, number][]) g.lineTo(hx + x, hy + y);
  g.closePath();
  ink(g, lin(g, 0, hy - 0.8, 0, hy - 0.3, [0, '#fff3a8'], [1, '#f5b921']), 0.06);
  for (const x of [-0.15, 0.15]) (ell(g, hx + x, hy - 0.42, 0.05, 0.05), (g.fillStyle = '#ff4f5a'), g.fill());
}

// ───────────────────────────── 생쥐 (단위: 몸 반지름 ≈ 1, 발 = (0,0), 오른쪽을 본다) ─────────────────────────────
/** 생쥐 자세: 달리기 둘 · 서 있기 · 덥석(치즈 번쩍) · 만세 · 납작 */
const MR0 = 0, MR1 = 1, MST = 2, MGRAB = 3, MCHEER = 4, MFLAT = 5;
const M_BODY = '#bdb6dc', M_DARK = '#8c84b8', M_LIGHT = '#e9e5ff', M_PINK = '#ffb0c4';
/** 레벨이 오르며 달라지는 모습: 0 없음 · 1 목도리 · 2 + 모자 · 3 + 망토 · 4 + 왕관 */
const tierOf = (lv: number) => (lv >= 9 ? 4 : lv >= 7 ? 3 : lv >= 5 ? 2 : lv >= 3 ? 1 : 0);
function paintMouse(g: C2, pose: number, tier: number) {
  if (pose === MFLAT) {
    ell(g, 0, -0.18, 1.1, 0.24);
    ink(g, M_BODY, 0.08);
    for (const x of [0.35, 0.65]) (g.beginPath(), g.moveTo(x - 0.08, -0.26), g.lineTo(x + 0.08, -0.14), g.moveTo(x + 0.08, -0.26), g.lineTo(x - 0.08, -0.14), (g.strokeStyle = OUT), (g.lineWidth = 0.06), g.stroke());
    ell(g, 0.1, -0.5, 0.36, 0.2);
    ink(g, M_PINK, 0.07);
    return;
  }
  const run = pose === MR0 || pose === MR1, s = pose === MR0 ? 1 : pose === MR1 ? -1 : 0, up = pose === MCHEER || pose === MGRAB;
  // 꼬리
  g.beginPath();
  g.moveTo(-0.55, -0.35);
  g.bezierCurveTo(-1.0, -0.2, -1.25, -0.5 - s * 0.1, -1.1, -0.85);
  g.bezierCurveTo(-1.0, -1.05, -0.8, -0.95, -0.9, -0.82);
  g.strokeStyle = OUT;
  g.lineWidth = 0.16;
  g.stroke();
  g.strokeStyle = M_PINK;
  g.lineWidth = 0.09;
  g.stroke();
  // 망토 (Lv7)
  if (tier >= 3) {
    g.beginPath();
    g.moveTo(0.1, -1.0);
    g.quadraticCurveTo(-0.7, -0.9 - s * 0.05, -0.85, -0.3);
    g.quadraticCurveTo(-0.3, -0.25, 0.15, -0.55);
    g.closePath();
    ink(g, lin(g, -0.8, 0, 0.1, 0, [0, '#ffb800'], [1, '#ffe36b']), 0.06);
  }
  // 발
  for (const [x, d] of [[-0.25, -s], [0.3, s]] as [number, number][]) (ell(g, x + d * 0.14, -0.06, 0.2, 0.1), ink(g, M_PINK, 0.06));
  // 몸
  ell(g, 0, -0.58, 0.66, 0.54, run ? -0.12 : 0);
  ink(g, lin(g, 0, -1.1, 0, 0, [0, M_LIGHT], [0.45, M_BODY], [1, M_DARK]));
  ell(g, 0.2, -0.42, 0.36, 0.3);
  g.fillStyle = '#ffffff';
  g.fill();
  shine(g, -0.25, -0.9, 0.2, 0.1, -0.3, 0.5);
  // 팔
  if (up) for (const [x, y] of [[0.15, -1.3], [0.58, -1.25]] as [number, number][]) (g.beginPath(), g.moveTo(x - 0.05, -0.75), g.lineTo(x, y), (g.strokeStyle = OUT), (g.lineWidth = 0.16), g.stroke(), (g.strokeStyle = M_BODY), (g.lineWidth = 0.09), g.stroke(), ell(g, x, y, 0.08, 0.08), ink(g, M_PINK, 0.04));
  else (ell(g, 0.48, -0.5 + s * 0.04, 0.14, 0.1), ink(g, M_PINK, 0.05));
  // 머리
  const hx = 0.55, hy = -1.02;
  // 귀 (아주 큼)
  for (const [x, y, r] of [[hx - 0.34, hy - 0.42, 0.36], [hx + 0.12, hy - 0.5, 0.32]] as [number, number, number][]) {
    ell(g, x, y, r, r);
    ink(g, M_BODY);
    ell(g, x + 0.03, y + 0.03, r * 0.68, r * 0.68);
    g.fillStyle = M_PINK;
    g.fill();
  }
  // 얼굴 (뾰족 주둥이)
  g.beginPath();
  g.moveTo(hx - 0.36, hy - 0.2);
  g.quadraticCurveTo(hx - 0.3, hy - 0.46, hx + 0.08, hy - 0.4);
  g.quadraticCurveTo(hx + 0.42, hy - 0.3, hx + 0.6, hy + 0.02);
  g.quadraticCurveTo(hx + 0.4, hy + 0.3, hx - 0.05, hy + 0.3);
  g.quadraticCurveTo(hx - 0.42, hy + 0.22, hx - 0.36, hy - 0.2);
  g.closePath();
  ink(g, lin(g, 0, hy - 0.4, 0, hy + 0.3, [0, M_LIGHT], [1, M_BODY]));
  ell(g, hx + 0.6, hy + 0.0, 0.1, 0.09);
  ink(g, '#ff7f9a', 0.05);
  shine(g, hx + 0.57, hy - 0.03, 0.035, 0.025, 0, 0.8);
  // 눈
  if (pose === MCHEER || pose === MGRAB) {
    g.beginPath();
    g.arc(hx + 0.18, hy - 0.06, 0.1, Math.PI * 1.1, Math.PI * 1.9);
    g.strokeStyle = OUT;
    g.lineWidth = 0.07;
    g.stroke();
  } else {
    ell(g, hx + 0.18, hy - 0.08, 0.11, 0.13);
    g.fillStyle = '#1e1410';
    g.fill();
    ell(g, hx + 0.15, hy - 0.13, 0.04, 0.04);
    g.fillStyle = '#ffffff';
    g.fill();
  }
  blush(g, hx + 0.12, hy + 0.12, 0.09);
  g.strokeStyle = 'rgba(74,44,29,.55)';
  g.lineWidth = 0.03;
  for (const dy of [-0.02, 0.06]) (g.beginPath(), g.moveTo(hx + 0.5, hy + 0.06 + dy), g.lineTo(hx + 0.85, hy + dy * 2), g.stroke());
  if (pose === MGRAB || pose === MCHEER) (g.beginPath(), g.arc(hx + 0.34, hy + 0.14, 0.08, 0.2, Math.PI - 0.2), (g.strokeStyle = OUT), (g.lineWidth = 0.05), g.stroke());
  // 목도리 (Lv3)
  if (tier >= 1) {
    g.beginPath();
    g.ellipse(hx - 0.15, hy + 0.32, 0.36, 0.13, 0.2, 0, TAU);
    ink(g, '#ff5a5a', 0.06);
    g.beginPath();
    g.moveTo(hx - 0.4, hy + 0.36);
    g.lineTo(hx - 0.72, hy + 0.5 - s * 0.08);
    g.lineTo(hx - 0.66, hy + 0.62 - s * 0.08);
    g.lineTo(hx - 0.36, hy + 0.46);
    g.closePath();
    ink(g, '#ff5a5a', 0.05);
    line(g, hx - 0.3, hy + 0.27, hx - 0.25, hy + 0.4, '#ffffff', 0.04);
  }
  // 모자 (Lv5) · 왕관 (Lv9)
  if (tier >= 4) {
    g.beginPath();
    g.moveTo(hx - 0.22, hy - 0.4);
    for (const [x, y] of [[-0.22, -0.68], [-0.1, -0.52], [0.02, -0.74], [0.14, -0.52], [0.26, -0.68], [0.26, -0.4]] as [number, number][]) g.lineTo(hx + x, hy + y);
    g.closePath();
    ink(g, lin(g, 0, hy - 0.75, 0, hy - 0.4, [0, '#fff3a8'], [1, '#f5b921']), 0.05);
  } else if (tier >= 2) {
    g.beginPath();
    g.ellipse(hx - 0.02, hy - 0.4, 0.3, 0.2, 0, Math.PI, TAU);
    g.closePath();
    ink(g, '#3f7fe0', 0.06);
    g.beginPath();
    g.ellipse(hx + 0.22, hy - 0.4, 0.2, 0.06, 0, 0, TAU);
    ink(g, '#2f5fb0', 0.05);
  }
}
/** 보따리: 막대 끝 보자기 (조각 수만큼 커짐, 치즈가 삐죽) */
function drawBundle(ctx: C2, x: number, y: number, u: number, n: number, dir: number, t: number) {
  if (n <= 0) return;
  const r = u * (0.3 + 0.1 * Math.min(9, n)), bx = x - dir * u * 0.75, by = y - u * 1.25 - r * 0.6 + Math.sin(t * 0.4) * u * 0.04;
  ctx.save();
  ctx.lineJoin = 'round';
  line(ctx, x + dir * u * 0.2, y - u * 0.6, bx, by + r * 0.2, OUT, Math.max(1.5, u * 0.14));
  line(ctx, x + dir * u * 0.2, y - u * 0.6, bx, by + r * 0.2, '#b97a3a', Math.max(1, u * 0.08));
  // 삐죽 나온 치즈
  for (let i = 0; i < Math.min(4, n); i++) {
    const a = -Math.PI / 2 + (i - 1.5) * 0.5, cx = bx + Math.cos(a) * r * 0.75, cy = by + Math.sin(a) * r * 0.75;
    ctx.beginPath();
    ctx.moveTo(cx - u * 0.16, cy + u * 0.05);
    ctx.lineTo(cx + Math.cos(a) * u * 0.3, cy + Math.sin(a) * u * 0.3);
    ctx.lineTo(cx + u * 0.16, cy + u * 0.05);
    ctx.closePath();
    ink(ctx, '#ffc531', Math.max(1, u * 0.06));
  }
  ell(ctx, bx, by, r, r * 0.88);
  ink(ctx, radg(ctx, bx - r * 0.3, by - r * 0.3, 0, r * 1.2, [0, '#ff8a8a'], [1, '#e04848']), Math.max(1, u * 0.07));
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) (ell(ctx, bx + Math.cos(i * 2.4) * r * 0.55, by + Math.sin(i * 2.4) * r * 0.5, r * 0.11, r * 0.1), ctx.fill());
  // 매듭
  ell(ctx, bx + dir * r * 0.2, by - r * 0.85, r * 0.22, r * 0.16);
  ink(ctx, '#e04848', Math.max(1, u * 0.05));
  ctx.restore();
}

// ───────────────────────────── 물건 (단위: 1 = 물건 반지름, 바닥 가운데 = (0,0)) ─────────────────────────────
function paintCheese(g: C2, k: QK) {
  const col = QD[k].col;
  ell(g, 0, 0, 0.9, 0.3);
  g.fillStyle = 'rgba(60,35,10,.22)';
  g.fill();
  if (k === 'mozz') {
    ell(g, 0, -0.55, 0.62, 0.55);
    ink(g, radg(g, -0.2, -0.75, 0, 0.8, [0, '#ffffff'], [1, '#f1e9d6']));
    line(g, -0.3, -0.5, 0.1, -0.35, '#7fc241', 0.12);
    return;
  }
  if (k === 'cake') {
    g.beginPath();
    g.moveTo(-0.8, -0.2);
    g.lineTo(0.7, -0.05);
    g.lineTo(0.7, -0.55);
    g.lineTo(-0.8, -0.95);
    g.closePath();
    ink(g, '#fff0c2');
    g.beginPath();
    g.moveTo(-0.8, -0.95);
    g.lineTo(0.7, -0.55);
    g.lineTo(0.75, -0.7);
    g.lineTo(-0.75, -1.1);
    g.closePath();
    ink(g, '#ff7f9a', 0.07);
    rr(g, -0.8, -0.3, 1.5, 0.22, 0.05);
    ink(g, '#c98a4a', 0.06);
    ell(g, -0.1, -1.18, 0.2, 0.18);
    ink(g, '#ff3b5a', 0.06);
    return;
  }
  if (k === 'gouda') {
    // 빨간 껍질 바퀴 조각
    g.beginPath();
    g.moveTo(-0.85, -0.2);
    g.quadraticCurveTo(0, 0.12, 0.85, -0.2);
    g.lineTo(0.85, -0.6);
    g.lineTo(0, -1.0);
    g.lineTo(-0.85, -0.6);
    g.closePath();
    ink(g, lin(g, 0, -1, 0, 0, [0, '#ffd56b'], [1, '#f0a830']));
    g.beginPath();
    g.moveTo(-0.85, -0.2);
    g.quadraticCurveTo(0, 0.12, 0.85, -0.2);
    g.lineTo(0.85, -0.38);
    g.quadraticCurveTo(0, -0.06, -0.85, -0.38);
    g.closePath();
    ink(g, '#e8303f', 0.06);
    return;
  }
  // 세모 조각 (체다·구멍·브리·블루·파르메산)
  g.beginPath();
  g.moveTo(-0.85, -0.15);
  g.lineTo(0.85, -0.15);
  g.lineTo(0.85, -0.6);
  g.lineTo(-0.85, -0.95);
  g.closePath();
  ink(g, lin(g, 0, -0.95, 0, -0.15, [0, k === 'brie' || k === 'blue' ? '#ffffff' : col], [1, k === 'parm' ? '#e8b24a' : k === 'brie' ? '#f3e4c0' : k === 'blue' ? '#dfe6f6' : '#f0a020']));
  g.beginPath();
  g.moveTo(-0.85, -0.95);
  g.lineTo(0.85, -0.6);
  g.lineTo(0.55, -0.82);
  g.lineTo(-0.95, -1.08);
  g.closePath();
  ink(g, k === 'brie' ? '#ffffff' : k === 'blue' ? '#f4f6ff' : '#ffe58a', 0.07);
  if (k === 'swiss') for (const [x, y, r] of [[-0.4, -0.5, 0.14], [0.2, -0.38, 0.11], [0.5, -0.45, 0.08], [-0.05, -0.68, 0.08]] as [number, number, number][]) (ell(g, x, y, r, r * 0.8), (g.fillStyle = '#e8a628'), g.fill());
  if (k === 'blue') for (let i = 0; i < 6; i++) (g.beginPath(), g.moveTo(-0.6 + i * 0.25, -0.3 - (i % 2) * 0.2), g.lineTo(-0.5 + i * 0.25, -0.5 - (i % 3) * 0.1), (g.strokeStyle = '#6f86e8'), (g.lineWidth = 0.06), g.stroke());
  if (k === 'parm') for (let i = 0; i < 5; i++) (ell(g, -0.6 + i * 0.3, -0.35 - (i % 2) * 0.2, 0.05, 0.04), (g.fillStyle = '#ffffff'), g.fill());
  shine(g, -0.4, -0.75, 0.25, 0.06, -0.2, 0.6);
}
function paintHide(g: C2, k: HK) {
  ell(g, 0, 0, 1.0, 0.34);
  g.fillStyle = 'rgba(60,35,10,.25)';
  g.fill();
  switch (k) {
    case 'cup': {
      // 받침 접시 + 찻잔 (파란 꽃무늬)
      ell(g, 0, -0.08, 1.0, 0.3);
      ink(g, '#ffffff');
      g.beginPath();
      g.moveTo(-0.72, -1.15);
      g.quadraticCurveTo(-0.7, -0.2, 0, -0.18);
      g.quadraticCurveTo(0.7, -0.2, 0.72, -1.15);
      g.closePath();
      ink(g, lin(g, -0.7, 0, 0.7, 0, [0, '#ffffff'], [0.6, '#f4f8ff'], [1, '#d6e2f6']));
      g.beginPath();
      g.arc(0.85, -0.75, 0.24, -1.4, 1.4);
      g.strokeStyle = OUT;
      g.lineWidth = 0.2;
      g.stroke();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 0.1;
      g.stroke();
      ell(g, 0, -1.15, 0.72, 0.2);
      ink(g, '#8a5a3a', 0.08);
      for (const [x, y] of [[-0.35, -0.65], [0.25, -0.55]] as [number, number][]) for (let i = 0; i < 5; i++) (ell(g, x + Math.cos(i * 1.257) * 0.1, y + Math.sin(i * 1.257) * 0.1, 0.07, 0.07), (g.fillStyle = '#5a8fe0'), g.fill());
      line(g, -0.7, -0.98, 0.7, -0.98, '#5a8fe0', 0.06);
      break;
    }
    case 'pot': {
      rr(g, -0.85, -1.1, 1.7, 1.0, 0.25);
      ink(g, lin(g, -0.8, 0, 0.8, 0, [0, '#ff7a6a'], [0.5, '#ff5a4e'], [1, '#c83a32']));
      for (const sd of [-1, 1]) (rr(g, sd * 0.85 - (sd < 0 ? 0.3 : 0), -0.9, 0.3, 0.16, 0.08), ink(g, '#3a3a48', 0.06));
      ell(g, 0, -1.12, 0.92, 0.22);
      ink(g, '#c9ccd6', 0.08);
      ell(g, 0, -1.3, 0.18, 0.1);
      ink(g, '#3a3a48', 0.06);
      shine(g, -0.45, -0.75, 0.16, 0.3, 0, 0.45);
      break;
    }
    case 'bread': {
      g.beginPath();
      g.moveTo(-0.9, -0.1);
      g.lineTo(-0.82, -1.0);
      g.quadraticCurveTo(0, -1.25, 0.82, -1.0);
      g.lineTo(0.9, -0.1);
      g.closePath();
      ink(g, 'rgba(230,245,255,.9)');
      g.beginPath();
      g.moveTo(-0.75, -0.2);
      g.lineTo(-0.7, -0.85);
      g.quadraticCurveTo(-0.7, -1.1, -0.4, -1.08);
      g.quadraticCurveTo(0, -1.25, 0.4, -1.08);
      g.quadraticCurveTo(0.7, -1.1, 0.7, -0.85);
      g.lineTo(0.75, -0.2);
      g.closePath();
      ink(g, lin(g, 0, -1.1, 0, -0.2, [0, '#e8a25a'], [1, '#f6d6a0']), 0.06);
      line(g, -0.55, -0.6, 0.55, -0.6, 'rgba(200,120,50,.4)', 0.06);
      rr(g, -0.25, -1.4, 0.5, 0.22, 0.06);
      ink(g, '#3cbf7a', 0.06);
      shine(g, -0.6, -0.7, 0.08, 0.3, 0, 0.7);
      break;
    }
    case 'boot': {
      g.beginPath();
      g.moveTo(-0.6, -1.3);
      g.lineTo(0.2, -1.3);
      g.lineTo(0.25, -0.45);
      g.quadraticCurveTo(0.95, -0.4, 0.95, -0.1);
      g.lineTo(-0.6, -0.1);
      g.closePath();
      ink(g, lin(g, -0.6, 0, 0.9, 0, [0, '#ffe36b'], [1, '#f5b921']));
      ell(g, -0.2, -1.3, 0.42, 0.14);
      ink(g, '#c98a12', 0.07);
      rr(g, -0.65, -0.22, 1.62, 0.14, 0.06);
      ink(g, '#3a3a48', 0.05);
      shine(g, -0.4, -0.8, 0.08, 0.3, 0, 0.6);
      break;
    }
    case 'cushion': {
      ell(g, 0, -0.45, 1.0, 0.5);
      ink(g, radg(g, -0.3, -0.7, 0, 1.1, [0, '#ffd0e0'], [1, '#ff8fb8']));
      for (const [x, y] of [[-0.45, -0.5], [0.4, -0.5], [0, -0.3], [0, -0.7]] as [number, number][]) (ell(g, x, y, 0.06, 0.05), (g.fillStyle = '#d65a8a'), g.fill());
      for (const sd of [-1, 1]) (ell(g, sd * 0.95, -0.45, 0.14, 0.18), ink(g, '#ff8fb8', 0.05));
      break;
    }
    case 'slipper': {
      // 토끼 실내화
      ell(g, 0, -0.35, 1.0, 0.42);
      ink(g, lin(g, 0, -0.8, 0, 0, [0, '#ffffff'], [1, '#e6ecf6']));
      for (const x of [0.3, 0.6]) (ell(g, x, -1.05, 0.13, 0.42, 0.2), ink(g, '#ffffff', 0.06), ell(g, x, -1.05, 0.06, 0.28, 0.2), (g.fillStyle = M_PINK), g.fill());
      ell(g, 0.45, -0.6, 0.35, 0.28);
      ink(g, '#ffffff', 0.06);
      for (const x of [0.35, 0.55]) (ell(g, x, -0.65, 0.04, 0.05), (g.fillStyle = OUT), g.fill());
      ell(g, -0.3, -0.45, 0.45, 0.16);
      g.fillStyle = '#4a3a5a';
      g.fill();
      break;
    }
    case 'box': {
      rr(g, -0.85, -1.15, 1.7, 1.05, 0.06);
      ink(g, lin(g, -0.8, 0, 0.8, 0, [0, '#7fd0ff'], [1, '#4fa8e8']));
      rr(g, -0.95, -1.35, 1.9, 0.3, 0.06);
      ink(g, '#8fdcff', 0.07);
      rr(g, -0.14, -1.35, 0.28, 1.25, 0.02);
      ink(g, '#ff5a8a', 0.05);
      for (const sd of [-1, 1]) (g.beginPath(), g.moveTo(0, -1.38), g.quadraticCurveTo(sd * 0.55, -1.85, sd * 0.3, -1.38), g.closePath(), ink(g, '#ff5a8a', 0.06));
      break;
    }
    case 'bag': {
      g.beginPath();
      g.moveTo(-0.8, -0.1);
      g.lineTo(-0.72, -1.3);
      g.lineTo(0.72, -1.3);
      g.lineTo(0.8, -0.1);
      g.closePath();
      ink(g, lin(g, -0.8, 0, 0.8, 0, [0, '#e3b47a'], [1, '#c48a4a']));
      for (let i = 0; i < 6; i++) (g.beginPath(), g.moveTo(-0.72 + i * 0.29, -1.3), g.lineTo(-0.62 + i * 0.29, -1.42), (g.strokeStyle = OUT), (g.lineWidth = 0.06), g.stroke());
      line(g, -0.5, -0.9, 0.5, -0.9, 'rgba(120,70,30,.35)', 0.05);
      break;
    }
    case 'basket': {
      g.beginPath();
      g.moveTo(-0.95, -0.9);
      g.lineTo(-0.7, -0.1);
      g.lineTo(0.7, -0.1);
      g.lineTo(0.95, -0.9);
      g.closePath();
      ink(g, lin(g, 0, -0.9, 0, 0, [0, '#e0a860'], [1, '#b8783a']));
      g.strokeStyle = 'rgba(90,50,20,.5)';
      g.lineWidth = 0.05;
      for (let i = 0; i < 4; i++) (g.beginPath(), g.moveTo(-0.9 + i * 0.05, -0.75 + i * 0.18), g.lineTo(0.9 - i * 0.05, -0.75 + i * 0.18), g.stroke());
      g.beginPath();
      g.arc(0, -0.9, 0.7, Math.PI, TAU);
      g.strokeStyle = OUT;
      g.lineWidth = 0.18;
      g.stroke();
      g.strokeStyle = '#c98a4a';
      g.lineWidth = 0.1;
      g.stroke();
      ell(g, 0, -0.92, 0.95, 0.2);
      ink(g, '#ff9ecb', 0.06);
      break;
    }
  }
}
function paintLure(g: C2, k: LK) {
  if (k !== 'balloon') {
    ell(g, 0, 0, 0.9, 0.3);
    g.fillStyle = 'rgba(60,35,10,.22)';
    g.fill();
  }
  switch (k) {
    case 'spoon':
      g.save();
      g.rotate(-0.25);
      rr(g, -0.95, -0.36, 1.2, 0.18, 0.09);
      ink(g, lin(g, 0, -0.4, 0, -0.18, [0, '#ffffff'], [1, '#b8c0cc']), 0.07);
      ell(g, 0.5, -0.3, 0.42, 0.26);
      ink(g, radg(g, 0.4, -0.38, 0, 0.5, [0, '#ffffff'], [1, '#aab4c2']), 0.07);
      shine(g, 0.4, -0.38, 0.15, 0.06, 0, 0.9);
      g.restore();
      break;
    case 'egg':
      ell(g, 0, -0.62, 0.48, 0.62);
      ink(g, radg(g, -0.15, -0.85, 0, 0.8, [0, '#ffffff'], [1, '#f1e4cc']));
      shine(g, -0.18, -0.9, 0.1, 0.16, -0.3, 0.8);
      break;
    case 'lid':
      ell(g, 0, -0.4, 0.95, 0.32);
      ink(g, lin(g, 0, -0.7, 0, -0.1, [0, '#e6eaf0'], [1, '#9aa4b2']));
      ell(g, 0, -0.62, 0.22, 0.12);
      ink(g, '#3a3a48', 0.06);
      shine(g, -0.4, -0.5, 0.3, 0.06, 0, 0.7);
      break;
    case 'balloon':
      ell(g, 0.15, -0.05, 0.3, 0.12);
      g.fillStyle = 'rgba(60,35,10,.2)';
      g.fill();
      g.beginPath();
      g.moveTo(0, -0.1);
      g.quadraticCurveTo(-0.2, -0.8, 0.05, -1.3);
      g.strokeStyle = OUT;
      g.lineWidth = 0.04;
      g.stroke();
      rr(g, -0.15, -0.2, 0.3, 0.2, 0.05);
      ink(g, '#3a3a48', 0.04);
      ell(g, 0.05, -1.85, 0.5, 0.58);
      ink(g, radg(g, -0.1, -2.0, 0, 0.7, [0, '#ff9a9a'], [1, '#ff3b4a']));
      shine(g, -0.12, -2.05, 0.12, 0.18, -0.4, 0.75);
      g.beginPath();
      g.moveTo(0, -1.27);
      g.lineTo(0.1, -1.27);
      g.lineTo(0.05, -1.34);
      g.closePath();
      ink(g, '#ff3b4a', 0.04);
      break;
    case 'yarn':
      ell(g, 0, -0.62, 0.62, 0.6);
      ink(g, radg(g, -0.2, -0.85, 0, 0.8, [0, '#ffb3d0'], [1, '#ff5a9a']));
      g.strokeStyle = 'rgba(180,40,90,.55)';
      g.lineWidth = 0.06;
      for (let i = 0; i < 4; i++) (g.beginPath(), g.ellipse(0, -0.62, 0.55, 0.2 + i * 0.1, 0.6 + i * 0.5, 0, TAU), g.stroke());
      g.beginPath();
      g.moveTo(0.5, -0.3);
      g.quadraticCurveTo(0.9, -0.1, 0.8, 0.05);
      g.strokeStyle = '#ff5a9a';
      g.lineWidth = 0.08;
      g.stroke();
      break;
    case 'bowl':
      ell(g, 0, -0.25, 1.0, 0.34);
      ink(g, '#5aa0ff');
      g.beginPath();
      g.moveTo(-1.0, -0.25);
      g.lineTo(-0.82, -0.62);
      g.lineTo(0.82, -0.62);
      g.lineTo(1.0, -0.25);
      g.closePath();
      ink(g, lin(g, 0, -0.6, 0, -0.2, [0, '#8fc4ff'], [1, '#4a8ae8']));
      ell(g, 0, -0.62, 0.82, 0.22);
      ink(g, '#b0702e', 0.07);
      for (let i = 0; i < 7; i++) (ell(g, -0.5 + (i % 4) * 0.32, -0.66 + Math.floor(i / 4) * 0.08, 0.1, 0.06), (g.fillStyle = '#8a4e1e'), g.fill());
      // 생선 그림 · 방울
      g.beginPath();
      g.moveTo(-0.3, -0.4);
      g.quadraticCurveTo(0, -0.52, 0.25, -0.4);
      g.quadraticCurveTo(0, -0.3, -0.3, -0.4);
      g.closePath();
      ink(g, '#ffffff', 0.04);
      ell(g, 0.95, -0.85, 0.2, 0.2);
      ink(g, radg(g, 0.9, -0.92, 0, 0.25, [0, '#fff3a8'], [1, '#f5b921']), 0.06);
      break;
  }
}
function paintClutter(g: C2, k: CK) {
  ell(g, 0, 0, 0.9, 0.3);
  g.fillStyle = 'rgba(60,35,10,.22)';
  g.fill();
  switch (k) {
    case 'pan':
      ell(g, -0.1, -0.3, 0.7, 0.26);
      ink(g, '#3a3a48');
      ell(g, -0.1, -0.34, 0.56, 0.18);
      g.fillStyle = '#5a5a6e';
      g.fill();
      rr(g, 0.5, -0.4, 0.6, 0.14, 0.07);
      ink(g, '#8a5a3a', 0.06);
      break;
    case 'plates':
      for (let i = 0; i < 4; i++) (ell(g, 0, -0.18 - i * 0.16, 0.75, 0.22), ink(g, i % 2 ? '#ffffff' : '#f1f4fb', 0.06), line(g, -0.6, -0.18 - i * 0.16, 0.6, -0.18 - i * 0.16, '#7fb0e6', 0.04));
      break;
    case 'books':
      for (let i = 0; i < 3; i++) (rr(g, -0.7 + i * 0.05, -0.32 - i * 0.26, 1.3 - i * 0.1, 0.24, 0.04), ink(g, ['#e8454f', '#3cbf7a', '#5a8fe0'][i], 0.06));
      break;
    case 'blocks':
      for (const [x, y, col, ch] of [[-0.45, -0.1, '#ff6b6b', '가'], [0.35, -0.1, '#5a8fe0', '나'], [-0.05, -0.72, '#ffd23a', '다']] as [number, number, string, string][]) {
        rr(g, x - 0.32, y - 0.6, 0.64, 0.6, 0.06);
        ink(g, col, 0.06);
        wtext(g, ch, x, y - 0.3, 0.4, 800, '#ffffff');
      }
      break;
    case 'cups':
      for (const [x, col] of [[-0.4, '#ffb347'], [0.4, '#7fd0ff'], [0, '#ff8fb8']] as [number, string][]) {
        const y = x === 0 ? -0.55 : 0;
        g.beginPath();
        g.moveTo(x - 0.32, y - 0.6);
        g.lineTo(x - 0.25, y - 0.05);
        g.lineTo(x + 0.25, y - 0.05);
        g.lineTo(x + 0.32, y - 0.6);
        g.closePath();
        ink(g, col, 0.06);
      }
      break;
  }
}
function paintVac(g: C2) {
  ell(g, 0, 0, 1.1, 0.36);
  g.fillStyle = 'rgba(40,30,20,.25)';
  g.fill();
  g.beginPath();
  g.ellipse(0, -0.3, 1.0, 0.36, 0, 0, Math.PI);
  g.lineTo(-1.0, -0.5);
  g.ellipse(0, -0.5, 1.0, 0.36, 0, Math.PI, 0, true);
  g.closePath();
  ink(g, '#8f97a6');
  ell(g, 0, -0.52, 1.0, 0.36);
  ink(g, lin(g, 0, -0.9, 0, -0.2, [0, '#ffffff'], [1, '#d8dde6']));
  ell(g, 0, -0.56, 0.5, 0.18);
  ink(g, '#3a3f52', 0.06);
  ell(g, 0.3, -0.58, 0.08, 0.05);
  g.fillStyle = '#5affd0';
  g.fill();
  // 고양이 귀 장식 (청소기 머리띠)
  for (const sd of [-1, 1]) (g.beginPath(), g.moveTo(sd * 0.45, -0.78), g.lineTo(sd * 0.62, -1.08), g.lineTo(sd * 0.75, -0.72), g.closePath(), ink(g, '#ff8fb8', 0.05));
  shine(g, -0.4, -0.66, 0.3, 0.07, 0, 0.8);
}

// ───────────────────────────── 가구 (화면 단위로 굽는다: 1 = 화면 폭) ─────────────────────────────
const FH: Record<FK, number> = { island: 0.075, fridge: 0.25, plant: 0.13, table: 0.075, bin: 0.075, sofa: 0.1, ctable: 0.05, armchair: 0.1, chest: 0.07, lamp: 0.22, tower: 0.21, rtable: 0.07, counter: 0.14 };
interface FRect { k: FK; x0: number; x1: number; y0: number; y1: number; h: number }
const furnRect = (f: [FK, number, number, number, number]): FRect => ({ k: f[0], x0: GX0 + f[1] * CW, x1: GX0 + (f[3] + 1) * CW, y0: GY0 + f[2] * CH, y1: GY0 + (f[4] + 1) * CH, h: FH[f[0]] });
/** 상자 하나: 윗면(밝게) + 앞면 — (x0..x1) × (y0..y1) 바닥 자리, 높이 h */
function box(g: C2, x0: number, x1: number, y0: number, y1: number, h: number, top: string | CanvasGradient, front: string | CanvasGradient, lw = 0.004, r = 0.008) {
  rr(g, x0, y1 - h, x1 - x0, h, r);
  ink(g, front, lw);
  rr(g, x0, y0 - h, x1 - x0, y1 - y0, r);
  ink(g, top, lw);
}
function paintFurn(g: C2, f: FRect, ch: number) {
  const { x0, x1, y0, y1, h } = f, W = x1 - x0, cx = (x0 + x1) / 2;
  // 바닥 그림자
  ell(g, cx, y1 - 0.004, W * 0.56, (y1 - y0) * 0.3 + 0.012);
  g.fillStyle = 'rgba(70,40,20,.18)';
  g.fill();
  switch (f.k) {
    case 'island': {
      box(g, x0, x1, y0 + 0.01, y1, h, lin(g, 0, y0 - h, 0, y1 - h, [0, '#fffaf2'], [1, '#efe6d8']), lin(g, x0, 0, x1, 0, [0, '#a8d8c8'], [1, '#7cc0aa']));
      // 서랍·손잡이
      for (let i = 0; i < 3; i++) {
        const dx0 = x0 + 0.012 + (i * (W - 0.024)) / 3;
        rr(g, dx0, y1 - h + 0.018, (W - 0.024) / 3 - 0.008, h - 0.026, 0.004);
        ink(g, 'rgba(255,255,255,.18)', 0.003);
        rr(g, dx0 + (W - 0.024) / 6 - 0.014, y1 - h + 0.026, 0.02, 0.006, 0.003);
        ink(g, '#ffd23a', 0.002);
      }
      // 도마 · 과일 그릇
      rr(g, x0 + 0.03, y0 - h + 0.022, 0.08, 0.05, 0.008);
      ink(g, '#e3b47a', 0.003);
      ell(g, x1 - 0.06, y0 - h + 0.045, 0.04, 0.02);
      ink(g, '#ffffff', 0.003);
      for (const [dx, col] of [[-0.018, '#ff5a4e'], [0.006, '#ffd23a'], [0.02, '#7fc241']] as [number, string][]) (ell(g, x1 - 0.06 + dx, y0 - h + 0.036, 0.012, 0.012), ink(g, col, 0.002));
      break;
    }
    case 'fridge': {
      box(g, x0 + 0.01, x1 - 0.004, y0, y1, h, '#dff6f0', lin(g, x0, 0, x1, 0, [0, '#bfeee2'], [1, '#8fd8c6']), 0.004, 0.02);
      line(g, x0 + 0.014, y1 - h * 0.62, x1 - 0.008, y1 - h * 0.62, OUT, 0.003);
      for (const y of [y1 - h * 0.8, y1 - h * 0.4]) (rr(g, x0 + 0.03, y, 0.012, 0.05, 0.004), ink(g, '#e6eaf0', 0.002));
      // 자석·그림
      rr(g, x0 + 0.08, y1 - h * 0.92, 0.05, 0.04, 0.003);
      ink(g, '#ffffff', 0.002);
      heartPath(g, x0 + 0.105, y1 - h * 0.9, 0.008);
      g.fillStyle = '#ff5a8a';
      g.fill();
      for (const [dx, dy, col] of [[0.16, 0.85, '#ffd23a'], [0.12, 0.5, '#ff5a4e'], [0.17, 0.42, '#5a8fe0']] as [number, number, string][]) (ell(g, x0 + dx, y1 - h * dy, 0.008, 0.008), ink(g, col, 0.002));
      shine(g, x0 + 0.025, y1 - h * 0.85, 0.006, 0.03, 0, 0.6);
      break;
    }
    case 'plant': {
      g.beginPath();
      g.moveTo(cx - W * 0.32, y1 - 0.06);
      g.lineTo(cx - W * 0.25, y1 - 0.004);
      g.lineTo(cx + W * 0.25, y1 - 0.004);
      g.lineTo(cx + W * 0.32, y1 - 0.06);
      g.closePath();
      ink(g, lin(g, x0, 0, x1, 0, [0, '#ff9a6a'], [1, '#d9643a']), 0.004);
      ell(g, cx, y1 - 0.06, W * 0.32, 0.012);
      ink(g, '#8a5a3a', 0.003);
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * 0.33, L = 0.06 + (i % 3) * 0.02;
        ell(g, cx + Math.cos(a) * L * 0.6, y1 - 0.07 + Math.sin(a) * L * 0.9, 0.016, 0.034, a + Math.PI / 2);
        ink(g, i % 2 ? '#5cbf4a' : '#7fd65a', 0.003);
      }
      break;
    }
    case 'table': {
      for (const lx of [x0 + 0.02, x1 - 0.02]) (rr(g, lx - 0.006, y1 - h + 0.01, 0.012, h - 0.01, 0.004), ink(g, '#b97a3a', 0.003));
      ell(g, cx, y0 + (y1 - y0) / 2 - h, W * 0.52, (y1 - y0) * 0.5);
      ink(g, '#ffffff', 0.004);
      g.save();
      g.clip();
      g.fillStyle = 'rgba(255,90,90,.55)';
      for (let i = -6; i < 6; i++) g.fillRect(cx + i * 0.03, y0 - h - 0.02, 0.015, 0.2);
      for (let i = -6; i < 6; i++) g.fillRect(x0 - 0.02, y0 - h + i * 0.03, W + 0.04, 0.015);
      g.restore();
      // 식탁보 늘어진 자락
      g.beginPath();
      g.moveTo(x0 - 0.002, y0 + (y1 - y0) / 2 - h);
      g.quadraticCurveTo(cx, y1 - h + 0.05, x1 + 0.002, y0 + (y1 - y0) / 2 - h);
      g.lineTo(x1 - 0.008, y1 - h + 0.03);
      g.quadraticCurveTo(cx, y1 - h + 0.06, x0 + 0.008, y1 - h + 0.03);
      g.closePath();
      ink(g, '#fff0f0', 0.003);
      ell(g, cx, y0 + (y1 - y0) / 2 - h - 0.004, 0.02, 0.01);
      ink(g, '#ffffff', 0.002);
      for (let i = 0; i < 3; i++) (ell(g, cx - 0.008 + i * 0.008, y0 + (y1 - y0) / 2 - h - 0.02 - (i % 2) * 0.008, 0.008, 0.008), ink(g, ['#ff7fb0', '#ffd23a', '#ff5a5a'][i], 0.002));
      break;
    }
    case 'bin': {
      rr(g, x0 + 0.015, y1 - h, W - 0.03, h, 0.012);
      ink(g, lin(g, x0, 0, x1, 0, [0, '#e6eaf0'], [1, '#aab4c2']), 0.004);
      ell(g, cx, y1 - h, (W - 0.03) / 2, 0.014);
      ink(g, '#c9d0da', 0.003);
      rr(g, cx - 0.012, y1 - h - 0.012, 0.024, 0.01, 0.004);
      ink(g, '#8a93a3', 0.002);
      shine(g, x0 + 0.03, y1 - h * 0.6, 0.004, 0.02, 0, 0.7);
      break;
    }
    case 'sofa': {
      box(g, x0, x1, y0, y1, h * 0.55, lin(g, 0, y0 - h, 0, y1, [0, '#ffb39a'], [1, '#ff8f6f']), '#e8735a', 0.004, 0.014);
      rr(g, x0, y0 - h * 1.2, W, h * 0.75, 0.016);
      ink(g, lin(g, 0, y0 - h * 1.2, 0, y0 - h * 0.4, [0, '#ffc4b0'], [1, '#ff9a7e']), 0.004);
      for (const ax of [x0, x1 - 0.035]) (rr(g, ax, y0 - h * 0.85, 0.035, y1 - y0 + h * 0.55, 0.014), ink(g, '#ff9a7e', 0.004));
      for (let i = 0; i < 2; i++) (rr(g, x0 + 0.045 + i * ((W - 0.09) / 2), y0 - h * 0.45, (W - 0.09) / 2 - 0.006, (y1 - y0) * 0.8, 0.012), ink(g, 'rgba(255,255,255,.18)', 0.003));
      break;
    }
    case 'ctable': {
      for (const lx of [x0 + 0.02, x1 - 0.02]) (rr(g, lx - 0.006, y1 - h, 0.012, h, 0.003), ink(g, '#8a5a3a', 0.003));
      box(g, x0, x1, y0 + 0.01, y1 - 0.01, h, lin(g, 0, y0 - h, 0, y1 - h, [0, '#e3b47a'], [1, '#c48a4a']), '#a8703a', 0.004, 0.012);
      ell(g, x0 + 0.05, y0 - h + 0.04, 0.025, 0.014);
      ink(g, '#ffffff', 0.003);
      rr(g, x1 - 0.1, y0 - h + 0.03, 0.06, 0.035, 0.004);
      ink(g, '#5a8fe0', 0.003);
      break;
    }
    case 'armchair': {
      box(g, x0, x1, y0 + 0.01, y1, h * 0.5, '#9fd6ff', '#6fb4e8', 0.004, 0.014);
      rr(g, x0 + 0.005, y0 - h * 1.05, W - 0.01, h * 0.6, 0.02);
      ink(g, lin(g, 0, y0 - h, 0, y0 - h * 0.4, [0, '#bfe4ff'], [1, '#8fc8f4']), 0.004);
      for (const ax of [x0, x1 - 0.03]) (rr(g, ax, y0 - h * 0.7, 0.03, y1 - y0 + h * 0.3, 0.012), ink(g, '#8fc8f4', 0.004));
      break;
    }
    case 'chest': {
      box(g, x0 + 0.005, x1 - 0.005, y0 + 0.008, y1, h, lin(g, 0, y0 - h, 0, y1 - h, [0, '#ffd27a'], [1, '#f0b040']), lin(g, x0, 0, x1, 0, [0, '#e8a040'], [1, '#c87a2a']), 0.004, 0.01);
      for (const [dx, col] of [[0.03, '#ff5a5a'], [0.06, '#5a8fe0'], [0.09, '#3cbf7a']] as [number, string][]) (ell(g, x0 + dx, y0 - h + 0.012, 0.012, 0.012), ink(g, col, 0.002));
      wtext(g, '장난감', cx, y1 - h / 2, 0.02, 900, OUT);
      break;
    }
    case 'lamp': {
      line(g, cx, y1 - 0.004, cx, y1 - h + 0.05, OUT, 0.008);
      line(g, cx, y1 - 0.004, cx, y1 - h + 0.05, '#c99a2e', 0.004);
      ell(g, cx, y1 - 0.004, 0.022, 0.008);
      ink(g, '#c99a2e', 0.003);
      g.beginPath();
      g.moveTo(cx - 0.026, y1 - h + 0.055);
      g.lineTo(cx - 0.016, y1 - h);
      g.lineTo(cx + 0.016, y1 - h);
      g.lineTo(cx + 0.026, y1 - h + 0.055);
      g.closePath();
      ink(g, lin(g, 0, y1 - h, 0, y1 - h + 0.05, [0, '#fff6c8'], [1, '#ffd27a']), 0.003);
      break;
    }
    case 'tower': {
      // 캣타워: 기둥 + 판 셋
      rr(g, cx - 0.012, y1 - h, 0.024, h, 0.004);
      ink(g, '#e3c79a', 0.003);
      g.strokeStyle = 'rgba(120,80,40,.35)';
      g.lineWidth = 0.002;
      for (let y = y1 - h + 0.01; y < y1; y += 0.008) (g.beginPath(), g.moveTo(cx - 0.012, y), g.lineTo(cx + 0.012, y + 0.004), g.stroke());
      for (const [dy, wd] of [[0, 1], [0.48, 0.8], [0.95, 0.95]] as [number, number][]) {
        const yy = y1 - h * (1 - dy) + (dy ? 0 : 0.0);
        box(g, cx - (W / 2) * wd, cx + (W / 2) * wd, yy - (y1 - y0) * 0.5 + 0.01, yy + 0.008, 0.016, '#ff9ecb', '#e070a8', 0.003, 0.008);
      }
      ell(g, cx + W * 0.3, y1 - h * 0.5 + 0.03, 0.012, 0.012);
      ink(g, '#ffd23a', 0.002);
      break;
    }
    case 'rtable': {
      rr(g, cx - 0.006, y1 - h, 0.012, h, 0.003);
      ink(g, '#8a5a3a', 0.003);
      ell(g, cx, y1 - 0.004, 0.03, 0.01);
      ink(g, '#8a5a3a', 0.003);
      ell(g, cx, (y0 + y1) / 2 - h, W * 0.55, (y1 - y0) * 0.55);
      ink(g, lin(g, 0, y0 - h, 0, y1 - h, [0, '#ffffff'], [1, '#ffe4ec']), 0.004);
      ell(g, cx - 0.012, (y0 + y1) / 2 - h - 0.006, 0.018, 0.01);
      ink(g, '#ffffff', 0.002);
      ell(g, cx + 0.02, (y0 + y1) / 2 - h - 0.004, 0.012, 0.01);
      ink(g, '#ff9ecb', 0.002);
      break;
    }
    case 'counter': {
      box(g, x0, x1, y0, y1, h, lin(g, 0, y0 - h, 0, y1 - h, [0, '#fff6f0'], [1, '#f3e2d6']), lin(g, x0, 0, x1, 0, [0, '#ffc4d6'], [1, '#ff9eb8']), 0.004, 0.01);
      // 진열장 (케이크)
      rr(g, x0 + 0.03, y0 - h - 0.06, W * 0.55, 0.07, 0.01);
      ink(g, 'rgba(220,245,255,.65)', 0.003);
      for (let i = 0; i < 4; i++) {
        const kx = x0 + 0.05 + i * 0.045;
        rr(g, kx, y0 - h - 0.025, 0.03, 0.02, 0.004);
        ink(g, ['#fff0c2', '#ff9ecb', '#c48a4a', '#fff0c2'][i], 0.002);
      }
      for (let i = 0; i < 3; i++) (rr(g, x0 + 0.02 + (i * W) / 3, y1 - h + 0.02, W / 3 - 0.03, h - 0.04, 0.006), ink(g, 'rgba(255,255,255,.2)', 0.003));
      break;
    }
  }
  void ch;
}

// ───────────────────────────── 방 배경 (벽 + 바닥) ─────────────────────────────
interface RoomPal { wall: [string, string]; stripe: string; floorA: string; floorB: string; base: string; trim: string }
const RPAL: RoomPal[] = [
  { wall: ['#fff3dc', '#ffe6c2'], stripe: 'rgba(255,200,150,.25)', floorA: '#fff6e6', floorB: '#ffd6aa', base: '#c98a4a', trim: '#ffffff' },
  { wall: ['#dff2d8', '#c8e6be'], stripe: 'rgba(255,255,255,.35)', floorA: '#efb479', floorB: '#e0a066', base: '#8a5a3a', trim: '#fff8ea' },
  { wall: ['#ffe2ea', '#ffd0dc'], stripe: 'rgba(255,255,255,.4)', floorA: '#e6f8f0', floorB: '#c6eede', base: '#c97a9a', trim: '#ffffff' },
];
const BGS = new Map<string, HTMLCanvasElement>();
function bakeBg(ch: number, hc: number, w: number, h: number, sc: number): HTMLCanvasElement {
  const key = `${ch}:${hc}:${w}:${h}:${sc}`;
  let cv = BGS.get(key);
  if (cv) return cv;
  if (BGS.size > 6) BGS.clear();
  const P = RPAL[ch];
  cv = layer(w * sc, h * sc, (g) => {
    g.scale(sc * w, sc * w);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const H = h / w, WALL0 = 0.1, WALL1 = GY0;
    // 벽
    g.fillStyle = lin(g, 0, WALL0, 0, WALL1, [0, P.wall[0]], [1, P.wall[1]]);
    g.fillRect(0, 0, 1, WALL1 + 0.01);
    g.fillStyle = P.stripe;
    for (let i = 0; i < 20; i++) g.fillRect(i * 0.05, WALL0, 0.022, WALL1 - WALL0);
    if (ch === 0) {
      // 창문 · 햇살 · 커튼
      rr(g, 0.36, 0.125, 0.28, 0.115, 0.01);
      ink(g, lin(g, 0, 0.125, 0, 0.24, [0, '#8fd8ff'], [1, '#d8f4ff']), 0.004);
      ell(g, 0.58, 0.16, 0.02, 0.02);
      g.fillStyle = '#fff3a8';
      g.fill();
      for (const [x, y, k] of [[0.42, 0.2, 0.02], [0.5, 0.17, 0.016]] as [number, number, number][]) (ell(g, x, y, k * 1.6, k), (g.fillStyle = '#ffffff'), g.fill());
      line(g, 0.5, 0.125, 0.5, 0.24, OUT, 0.004);
      line(g, 0.36, 0.182, 0.64, 0.182, OUT, 0.003);
      for (const sd of [-1, 1]) {
        const cx0 = sd < 0 ? 0.33 : 0.67;
        g.beginPath();
        g.moveTo(cx0 - 0.03, 0.115);
        g.lineTo(cx0 + 0.03, 0.115);
        g.quadraticCurveTo(cx0 + sd * 0.01, 0.2, cx0 + 0.035 * -sd + 0.0, 0.255);
        g.lineTo(cx0 - 0.0 + sd * 0.035, 0.255);
        g.closePath();
        ink(g, '#ff8a8a', 0.003);
        g.fillStyle = 'rgba(255,255,255,.5)';
        for (let i = 0; i < 4; i++) g.fillRect(cx0 - 0.03, 0.12 + i * 0.03, 0.06, 0.008);
      }
      rr(g, 0.33, 0.108, 0.34, 0.012, 0.004);
      ink(g, '#c98a4a', 0.003);
      // 선반 · 병
      rr(g, 0.04, 0.17, 0.22, 0.01, 0.003);
      ink(g, '#c98a4a', 0.003);
      for (const [x, col, hh] of [[0.07, '#ffd23a', 0.04], [0.12, '#ff8a6a', 0.05], [0.17, '#7fd0ff', 0.035], [0.22, '#a6e07a', 0.045]] as [number, string, number][]) (rr(g, x - 0.016, 0.17 - hh, 0.032, hh, 0.006), ink(g, col, 0.003), rr(g, x - 0.012, 0.17 - hh - 0.008, 0.024, 0.01, 0.003), ink(g, '#ffffff', 0.002));
      // 뒷벽 조리대 (가스레인지 · 싱크)
      rr(g, 0, 0.262, 1, 0.016, 0.004);
      ink(g, '#fffaf2', 0.003);
      g.fillStyle = lin(g, 0, 0.278, 0, WALL1, [0, '#ffe0b0'], [1, '#f6c98a']);
      g.fillRect(0, 0.278, 1, WALL1 - 0.278);
      for (let i = 0; i < 7; i++) (rr(g, 0.01 + i * 0.142, 0.286, 0.13, WALL1 - 0.296, 0.006), ink(g, 'rgba(255,255,255,.25)', 0.003), rr(g, 0.065 + i * 0.142, 0.296, 0.02, 0.006, 0.003), ink(g, '#c98a4a', 0.002));
      rr(g, 0.7, 0.245, 0.17, 0.02, 0.004);
      ink(g, '#3a3a48', 0.003);
      for (const x of [0.74, 0.83]) (ell(g, x, 0.254, 0.022, 0.006), ink(g, '#5a5a6e', 0.002));
      // 주전자
      ell(g, 0.74, 0.232, 0.03, 0.022);
      ink(g, lin(g, 0, 0.21, 0, 0.25, [0, '#ffffff'], [1, '#ff9a8a']), 0.003);
      line(g, 0.765, 0.228, 0.79, 0.215, OUT, 0.006);
      line(g, 0.765, 0.228, 0.79, 0.215, '#ff9a8a', 0.003);
      rr(g, 0.05, 0.248, 0.12, 0.016, 0.004);
      ink(g, '#c9d6e6', 0.003);
    } else if (ch === 1) {
      // 액자 (고양이 초상) · 창문 · 책장
      for (const [x, y, ww, hh, col] of [[0.1, 0.14, 0.09, 0.07, '#ffd27a'], [0.24, 0.13, 0.07, 0.09, '#9fd6ff']] as [number, number, number, number, string][]) {
        rr(g, x, y, ww, hh, 0.004);
        ink(g, col, 0.006);
        ell(g, x + ww / 2, y + hh * 0.6, ww * 0.28, hh * 0.25);
        g.fillStyle = '#f7a94b';
        g.fill();
        for (const sd of [-1, 1]) (g.beginPath(), g.moveTo(x + ww / 2 + sd * ww * 0.08, y + hh * 0.45), g.lineTo(x + ww / 2 + sd * ww * 0.22, y + hh * 0.28), g.lineTo(x + ww / 2 + sd * ww * 0.25, y + hh * 0.5), (g.fillStyle = '#f7a94b'), g.fill());
      }
      rr(g, 0.42, 0.12, 0.2, 0.13, 0.01);
      ink(g, lin(g, 0, 0.12, 0, 0.25, [0, '#8fd8ff'], [1, '#e8f8ff']), 0.004);
      line(g, 0.52, 0.12, 0.52, 0.25, OUT, 0.004);
      for (const sd of [-1, 1]) (rr(g, sd < 0 ? 0.39 : 0.6, 0.11, 0.05, 0.16, 0.01), ink(g, '#ffd0a0', 0.003));
      rr(g, 0.76, 0.12, 0.2, 0.22, 0.006);
      ink(g, '#b97a3a', 0.004);
      for (let r = 0; r < 3; r++) {
        line(g, 0.76, 0.18 + r * 0.06, 0.96, 0.18 + r * 0.06, OUT, 0.003);
        for (let i = 0; i < 6; i++) (rr(g, 0.77 + i * 0.03, 0.135 + r * 0.06, 0.022, 0.043, 0.003), ink(g, ['#e8454f', '#3cbf7a', '#5a8fe0', '#ffd23a', '#ff8fb8', '#a080ff'][(i + r * 2) % 6], 0.002));
      }
      g.fillStyle = lin(g, 0, 0.3, 0, WALL1, [0, '#f6e6c8'], [1, '#e8d2a8']);
      g.fillRect(0, 0.3, 1, WALL1 - 0.3);
      line(g, 0, 0.3, 1, 0.3, P.base, 0.005);
    } else {
      // 고양이 카페: 칠판 메뉴 · 선반 · 조명 · 간판
      rr(g, 0.06, 0.13, 0.26, 0.13, 0.008);
      ink(g, '#3f5a4a', 0.006);
      wtext(g, '오늘의 메뉴', 0.08, 0.155, 0.024, 800, '#ffffff', 'left');
      wtext(g, '츄르 라떼 · 생선 쿠키', 0.08, 0.19, 0.018, 700, '#ffffff', 'left');
      wtext(g, '참치 케이크 ♥', 0.08, 0.22, 0.018, 700, '#ffe36b', 'left');
      rr(g, 0.4, 0.115, 0.22, 0.05, 0.02);
      ink(g, '#ff9eb8', 0.004);
      wtext(g, '고양이 카페', 0.51, 0.142, 0.026, 900, '#ffffff');
      for (const x of [0.45, 0.57]) (line(g, x, 0.1, x, 0.19, OUT, 0.002), ell(g, x, 0.2, 0.018, 0.012), ink(g, '#fff3a8', 0.003), ell(g, x, 0.215, 0.03, 0.02), (g.fillStyle = 'rgba(255,240,170,.35)'), g.fill());
      rr(g, 0.4, 0.24, 0.22, 0.008, 0.003);
      ink(g, '#ffffff', 0.003);
      for (const [x, col] of [[0.43, '#ff9ecb'], [0.49, '#ffd23a'], [0.55, '#7fd0ff']] as [number, string][]) (ell(g, x, 0.23, 0.014, 0.012), ink(g, col, 0.002));
      g.fillStyle = lin(g, 0, 0.29, 0, WALL1, [0, '#fff6f8'], [1, '#ffe4ec']);
      g.fillRect(0, 0.29, 1, WALL1 - 0.29);
      for (let i = 0; i < 25; i++) line(g, i * 0.04, 0.295, i * 0.04, WALL1 - 0.005, 'rgba(200,120,150,.25)', 0.003);
    }
    // 걸레받이
    g.fillStyle = P.base;
    g.fillRect(0, WALL1 - 0.014, 1, 0.014);
    // 바닥
    const FB = FY1 + 0.02;
    g.save();
    g.beginPath();
    g.rect(0, WALL1, 1, H - WALL1);
    g.clip();
    if (ch === 1) {
      g.fillStyle = P.floorA;
      g.fillRect(0, WALL1, 1, FB - WALL1 + 0.3);
      for (let r = 0; r < 24; r++) {
        const y = WALL1 + r * 0.04;
        line(g, 0, y, 1, y, 'rgba(120,70,30,.22)', 0.003);
        for (let i = 0; i < 4; i++) line(g, ((r * 0.37 + i * 0.29) % 1), y, ((r * 0.37 + i * 0.29) % 1), y + 0.04, 'rgba(120,70,30,.18)', 0.003);
        if (r % 2) (g.fillStyle = 'rgba(255,255,255,.06)'), g.fillRect(0, y, 1, 0.04);
      }
      // 둥근 깔개
      ell(g, 0.5, 0.88, 0.38, 0.24);
      ink(g, '#5ab4c8', 0.004);
      ell(g, 0.5, 0.88, 0.32, 0.19);
      g.strokeStyle = '#ffffff';
      g.lineWidth = 0.008;
      g.setLineDash([0.02, 0.015]);
      g.stroke();
      g.setLineDash([]);
      ell(g, 0.5, 0.88, 0.24, 0.14);
      g.fillStyle = '#7fd0e0';
      g.fill();
    } else {
      const tw = ch === 0 ? 0.1 : 0.0833, th2 = tw * YS;
      // 바닥을 먼저 꽉 채운다 (타일 틈이 비면 지난 프레임이 비친다)
      g.fillStyle = P.floorA;
      g.fillRect(0, WALL1, 1, FB - WALL1 + 0.3);
      for (let r = 0; r * th2 < FB - WALL1 + 0.3; r++)
        for (let i = 0; i < Math.ceil(1 / tw) + 1; i++) {
          const x = i * tw - (ch === 2 && r % 2 ? tw / 2 : 0), y = WALL1 + r * th2;
          if (ch === 2) {
            g.fillStyle = P.floorB;
            g.beginPath();
            g.moveTo(x + tw / 2, y + th2 * 0.12);
            g.lineTo(x + tw * 0.88, y + th2 / 2);
            g.lineTo(x + tw / 2, y + th2 * 0.88);
            g.lineTo(x + tw * 0.12, y + th2 / 2);
            g.closePath();
            g.fill();
          } else if ((i + r) % 2 === 0) (g.fillStyle = P.floorB), g.fillRect(x, y, tw, th2);
        }
    }
    // 창 햇살 · 벽 밑 그늘 · 가장자리
    if (ch !== 2) {
      g.beginPath();
      g.moveTo(ch === 0 ? 0.36 : 0.42, WALL1);
      g.lineTo(ch === 0 ? 0.64 : 0.62, WALL1);
      g.lineTo(ch === 0 ? 0.8 : 0.76, WALL1 + 0.42);
      g.lineTo(ch === 0 ? 0.46 : 0.5, WALL1 + 0.42);
      g.closePath();
      g.fillStyle = lin(g, 0, WALL1, 0, WALL1 + 0.42, [0, 'rgba(255,250,210,.5)'], [1, 'rgba(255,250,210,0)']);
      g.fill();
    }
    g.fillStyle = lin(g, 0, WALL1, 0, WALL1 + 0.05, [0, 'rgba(90,50,20,.22)'], [1, 'rgba(90,50,20,0)']);
    g.fillRect(0, WALL1, 1, 0.05);
    for (const sd of [0, 1]) (g.fillStyle = lin(g, sd, 0, sd ? 0.93 : 0.07, 0, [0, 'rgba(90,50,20,.12)'], [1, 'rgba(90,50,20,0)'])), g.fillRect(sd ? 0.93 : 0, WALL1, 0.07, FB);
    g.restore();
    // 쥐구멍 (걸레받이에 동그란 문 · 등불 · 발판)
    const hx = cxOf(hc), hy = WALL1 + 0.004;
    g.beginPath();
    g.moveTo(hx - 0.04, hy);
    g.lineTo(hx - 0.04, hy - 0.035);
    g.arc(hx, hy - 0.035, 0.04, Math.PI, TAU);
    g.lineTo(hx + 0.04, hy);
    g.closePath();
    ink(g, '#8a5a3a', 0.006);
    g.beginPath();
    g.moveTo(hx - 0.03, hy);
    g.lineTo(hx - 0.03, hy - 0.035);
    g.arc(hx, hy - 0.035, 0.03, Math.PI, TAU);
    g.lineTo(hx + 0.03, hy);
    g.closePath();
    g.fillStyle = radg(g, hx, hy - 0.02, 0, 0.05, [0, '#6a3a1a'], [1, '#2a160a']);
    g.fill();
    ell(g, hx, hy + 0.008, 0.045, 0.01);
    ink(g, '#ff9ecb', 0.003);
    line(g, hx + 0.055, hy - 0.02, hx + 0.055, hy - 0.06, OUT, 0.003);
    ell(g, hx + 0.055, hy - 0.062, 0.008, 0.01);
    ink(g, '#fff3a8', 0.002);
    ell(g, hx + 0.055, hy - 0.062, 0.02, 0.02);
    g.fillStyle = 'rgba(255,240,150,.35)';
    g.fill();
  });
  BGS.set(key, cv);
  return cv;
}
const FSPR = new Map<string, { c: HTMLCanvasElement; x: number; y: number; w: number; h: number }>();
/** 가구 한 점을 굽는다 (화면 폭 w, 배율 sc) */
function furnSpr(ch: number, i: number, w: number, sc: number) {
  const key = `${ch}:${i}:${w}:${sc}`;
  let o = FSPR.get(key);
  if (o) return o;
  if (FSPR.size > 60) FSPR.clear();
  const f = furnRect(ROOMS[ch].furn[i]), m = 0.03, x = f.x0 - m, y = f.y0 - f.h - 0.08 - m, ww = f.x1 - f.x0 + 2 * m, hh = f.y1 - f.y0 + f.h + 0.08 + 2 * m;
  const c2 = layer(ww * w * sc, hh * w * sc, (g) => {
    g.scale(w * sc, w * sc);
    g.translate(-x, -y);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    paintFurn(g, f, ch);
  });
  FSPR.set(key, (o = { c: c2, x, y, w: ww, h: hh }));
  return o;
}
/** 판 바닥 한 장: 방 배경 + 발자국(순찰 길) — 프레임마다 큰 그림은 한 번만 찍는다 */
const PAWS = new Map<string, HTMLCanvasElement>();
const pawKey = (s: MouseState, w: number, sc: number) => `${s.stage}:${s.seed}:${s.cats.length}:${w}:${sc}`;
function pawLayer(s: MouseState, w: number, h: number, sc: number) {
  const key = pawKey(s, w, sc);
  let cv = PAWS.get(key);
  if (cv) return cv;
  if (PAWS.size > 4) PAWS.clear();
  const bg = bakeBg(STAGES[s.stage].ch, s.hc, w, h, sc);
  cv = layer(w * sc, h * sc, (g) => {
    g.drawImage(bg, 0, 0);
    g.scale(w * sc, w * sc);
    for (const c2 of s.cats) {
      if (c2.route.length < 2 || c2.k === 'king') continue;
      const pts = c2.pp ? c2.route : [...c2.route, c2.route[0]];
      let carry = 0;
      for (let i = 0; i + 1 < pts.length; i++) {
        const a = pts[i], b = pts[i + 1], d = dist(a.x, a.y, b.x, b.y), ang = angTo(a.x, a.y, b.x, b.y);
        for (let q = carry; q < d; q += 0.05) {
          const x = a.x + ((b.x - a.x) * q) / d, y = a.y + ((b.y - a.y) * q) / d, side = Math.round(q / 0.05) % 2 ? 1 : -1;
          const px = x - Math.sin(ang) * 0.008 * side, py = y + Math.cos(ang) * 0.008 * side * YS;
          g.fillStyle = 'rgba(150,100,60,.11)';
          ell(g, px, py, 0.0045, 0.0034);
          g.fill();
          for (let k = 0; k < 3; k++) (ell(g, px + Math.cos(ang + (k - 1) * 0.7) * 0.007, py + Math.sin(ang + (k - 1) * 0.7) * 0.005, 0.0017, 0.0014), g.fill());
        }
        carry = 0;
      }
    }
  });
  PAWS.set(key, cv);
  return cv;
}

// ───────────────────────────── 그리기: 장면 ─────────────────────────────
const depthK = (y: number) => 0.9 + 0.2 * clamp((y - GY0) / (FY1 - GY0), 0, 1);
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const LV_GIFT: Record<number, string> = { 3: '목도리를 둘렀어요', 5: '모자를 썼어요', 7: '망토가 생겼어요', 9: '왕관을 썼어요' };
function starWord(st: { k: StarK; n: number }): string {
  switch (st.k) {
    case 'bag': return `한 보따리에 ${st.n}조각`;
    case 'lure': return `한 번에 ${st.n}마리 꾀기`;
    case 'nowake': return '왕 안 깨우기';
    case 'unseen': return '한 번도 안 들키기';
    case 'ride': return `청소기 타고 ${st.n}조각`;
    case 'scare': return `풍선으로 ${st.n}마리 깜짝`;
    case 'yarn': return `털실로 ${st.n}마리 꾀기`;
    case 'bowl': return `밥그릇으로 ${st.n}마리`;
  }
}
const STAR_WORDS = (s: MouseState) => ['치즈 다 훔치기', '안 잡히기', starWord(STAGES[s.stage].star)];
const recent = new WeakMap<object, { x: number; y: number; t: number; size: number }[]>();
const PART_MAX = 60;
/** 자주 쓰는 짧은 글자는 한 번 구워 찍는다 (느린 폰에서 글자 모양 잡기가 무겁다) */
const GLY = new Map<string, HTMLCanvasElement>();
function gtext(ctx: C2, str: string, x: number, y: number, px: number, wgt: number, fill: string, stroke: string, lw: number) {
  const sc = devScale(ctx), size = Math.max(12, Math.round(px)), key = `${str}|${size}|${wgt}|${fill}|${stroke}|${lw}|${sc}`;
  let cv = GLY.get(key);
  if (!cv) {
    if (GLY.size > 120) GLY.clear();
    const font = `${wgt} ${size}px system-ui, sans-serif`;
    const probe = document.createElement('canvas').getContext('2d')!;
    probe.font = font;
    const tw = Math.ceil(probe.measureText(str).width + lw * 2 + 4), th = Math.ceil(size * 1.4 + lw * 2);
    cv = layer(tw * sc, th * sc, (g) => {
      g.scale(sc, sc);
      g.font = font;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      if (lw > 0) (g.lineWidth = lw), (g.strokeStyle = stroke), g.strokeText(str, tw / 2, th / 2);
      g.fillStyle = fill;
      g.fillText(str, tw / 2, th / 2);
    });
    GLY.set(key, cv);
  }
  ctx.drawImage(cv, x - cv.width / sc / 2, y - cv.height / sc / 2, cv.width / sc, cv.height / sc);
}
/** 구경꾼 고양이 (자거나 밥 먹는 — 놀이와 무관, 와장창·쿵에 깜짝): 종류 · x · y(발) · 크기 · 자세(0 잠 · 1 냠냠) · 올라앉은 가구(-1 벽 쪽) */
type Deco = [CatK, number, number, number, number, number];
const WALL_DECO: Deco[][] = [
  [['gray', 0.27, 0.268, 0.62, 0, -1], ['sleepy', 0.565, 0.247, 0.5, 0, -1]],
  [['sleepy', 0.69, 0.302, 0.6, 0, -1], ['gray', 0.9, 0.124, 0.45, 0, -1]],
  [['siam', 0.36, 0.292, 0.6, 0, -1], ['sleepy', 0.6, 0.243, 0.48, 0, -1]],
];
const D_FRIDGE: Deco = ['black', 0.875, 0.178, 0.6, 0, 1], D_TABLE: Deco = ['siam', 0.75, 0.962, 0.6, 0, 3], D_BIN: Deco = ['tabby', 0.925, 0.79, 0.5, 0, 4], D_ISLAND: Deco = ['party', 0.43, 0.725, 0.6, 0, 0], D_EAT: Deco = ['gray', 0.085, 0.27, 0.55, 1, -1];
const D_SOFA: Deco = ['tabby', 0.2, 0.43, 0.62, 0, 0], D_ARM: Deco = ['black', 0.85, 0.64, 0.6, 0, 2], D_CHEST: Deco = ['siam', 0.1, 1.02, 0.55, 0, 4], D_TV: Deco = ['party', 0.3, 0.3, 0.5, 1, -1];
const D_COUNTER: Deco = ['tabby', 0.925, 0.3, 0.6, 0, 4], D_TAB1: Deco = ['gray', 0.425, 0.665, 0.52, 0, 2], D_TAB2: Deco = ['black', 0.625, 0.955, 0.52, 0, 3], D_TOW0: Deco = ['party', 0.075, 0.47, 0.55, 0, 0], D_TOW1: Deco = ['sniff', 0.825, 0.77, 0.55, 0, 1];
/** 판마다 구경꾼 — 4판(뚱보 왕)부터는 깨어 있는 놈과 합쳐 부엌에 열 마리 (고양이 소굴) */
const STAGE_DECO: Deco[][] = [
  [D_FRIDGE, D_TABLE], [D_FRIDGE, D_TABLE, D_BIN], [D_FRIDGE, D_TABLE, D_BIN, D_ISLAND], [D_FRIDGE, D_TABLE, D_BIN, D_EAT],
  [D_SOFA, D_ARM, D_CHEST], [D_SOFA, D_ARM, D_CHEST], [D_SOFA, D_CHEST, D_TV], [D_SOFA, D_ARM],
  [D_COUNTER, D_TAB1, D_TAB2, D_TOW0, D_TOW1], [D_COUNTER, D_TAB1, D_TAB2], [D_COUNTER, D_TOW0], [],
];
const decoOf = (st: number) => [...WALL_DECO[STAGES[st].ch], ...STAGE_DECO[st]];
/** 눈길 부채꼴은 미리 그려 둔 한 장을 돌려 찍는다 (가구에 가려지면 그 모양으로 오려 찍는다) */
const CONE = new Map<string, HTMLCanvasElement>();
function coneSpr(va: number, col: string, a0: number, a1: number, px: number) {
  const q = Math.max(8, Math.round(px)), key = `${va.toFixed(2)}|${col}|${a0}|${q}`;
  let cv = CONE.get(key);
  if (!cv) {
    if (CONE.size > 80) CONE.clear();
    cv = layer(q * 2 + 4, q * 2 + 4, (g) => {
      g.translate(q + 2, q + 2);
      const full = va >= Math.PI - 1e-6;
      g.beginPath();
      g.moveTo(0, 0);
      if (full) g.arc(0, 0, q, 0, TAU);
      else g.arc(0, 0, q, -va, va);
      g.closePath();
      const gr = g.createRadialGradient(0, 0, q * 0.06, 0, 0, q);
      gr.addColorStop(0, `rgba(${col},${a0})`);
      gr.addColorStop(0.7, `rgba(${col},${(a0 + a1) / 2})`);
      gr.addColorStop(1, `rgba(${col},${a1})`);
      g.fillStyle = gr;
      g.fill();
      g.beginPath();
      if (full) g.arc(0, 0, q - 1.5, 0, TAU);
      else g.arc(0, 0, q - 1.5, -va, va);
      g.strokeStyle = `rgba(${col},0.95)`;
      g.lineWidth = 2.5;
      g.stroke();
    });
    CONE.set(key, cv);
  }
  return cv;
}

/** 스티커 크기(화면 폭 비율): 고양이 · 생쥐 · 숨을 곳 · 소리 물건 · 치즈 · 잡동사니 · 청소기 · 왕 */
const U_CAT = 0.066, U_MOUSE = 0.075, U_HIDE = 0.05, U_LURE = 0.042, U_Q = 0.052, U_CL = 0.04, U_VAC = 0.062, U_KING = 0.13;
const catSpr = (k: CatK, pose: number, px: number) => spr('c' + k + pose, F_CAT, px, (g) => paintCat(g, k, pose));
const kingSpr = (pose: number, px: number) => spr('k' + pose, F_KING, px, (g) => paintKing(g, pose));
const mouseSpr = (pose: number, tier: number, px: number) => spr('m' + pose + ':' + tier, F_MOUSE, px, (g) => paintMouse(g, pose, tier));
const hideSpr = (k: HK, px: number) => spr('h' + k, F_PROP, px, (g) => paintHide(g, k));
const lureSpr = (k: LK, px: number) => spr('l' + k, F_PROP, px, (g) => paintLure(g, k));
const qSpr = (k: QK, px: number) => spr('q' + k, F_PROP, px, (g) => paintCheese(g, k));
const clSpr = (k: CK, px: number) => spr('x' + k, F_PROP, px, (g) => paintClutter(g, k));
const vacSpr = (px: number) => spr('vac', F_PROP, px, (g) => paintVac(g));
/** 한 판에 쓸 그림을 미리 굽기 줄에 (판마다 한 번) */
function wantStage(st: number, w: number, h: number, sc: number) {
  const tag = `st${st}:${w}:${h}:${sc}`;
  if (WK.has(tag)) return;
  WK.add(tag);
  const d = STAGES[st], sc2 = Math.min(2, sc), R = (r: number) => r * w * sc2 * 1.1, room = ROOMS[d.ch];
  want(`bg${d.ch}:${w}:${h}:${sc}`, () => bakeBg(d.ch, room.hole, w, h, sc));
  room.furn.forEach((_, i) => want(`f${d.ch}:${i}:${w}:${sc}`, () => furnSpr(d.ch, i, w, sc)));
  const kinds = new Set<CatK>(d.cats.map((q) => q.k));
  for (const [k] of decoOf(st)) for (const p of [PSLEEP, PSCARED, PEAT]) want(`c${k}${p}:${sprQ(R(U_CAT))}`, () => catSpr(k, p, R(U_CAT)));
  for (const k of kinds) for (let p = 0; p < POSES; p++) want(`c${k}${p}:${sprQ(R(U_CAT))}`, () => catSpr(k, p, R(U_CAT)));
  if (d.king) for (let p = 0; p < 3; p++) want(`k${p}:${sprQ(R(U_KING))}`, () => kingSpr(p, R(U_KING)));
  for (const [k] of d.hides) want(`h${k}:${sprQ(R(U_HIDE))}`, () => hideSpr(k, R(U_HIDE)));
  for (const [k] of d.lures) want(`l${k}:${sprQ(R(U_LURE))}`, () => lureSpr(k, R(U_LURE)));
  for (const [k] of d.cheese) want(`q${k}:${sprQ(R(U_Q))}`, () => qSpr(k, R(U_Q)));
  for (const [k] of room.clutter) want(`x${k}:${sprQ(R(U_CL))}`, () => clSpr(k, R(U_CL)));
  if (d.vac) want(`vac:${sprQ(R(U_VAC))}`, () => vacSpr(R(U_VAC)));
  for (const k of kinds) want(`cone${k}:${w}`, () => coneSpr(KD[k].va, '255,215,70', 0.62, 0.22, KD[k].vr * w * sc2));
  if (d.king) want(`coneking:${w}`, () => coneSpr(Math.PI, '255,110,80', 0.62, 0.22, 0.17 * w * sc2));
  const tier = tierOf(st + 1);
  for (let p = 0; p < 6; p++) want(`m${p}:${tier}:${sprQ(R(U_MOUSE))}`, () => mouseSpr(p, tier, R(U_MOUSE)));
}
function catPose(c: Cat, t: number): number {
  switch (c.mode) {
    case HOLD: return (t >> 5) % 3 === 2 ? PST : PSIT;
    case PATROL: case GO: case FOLLOW: return (c.walkT >> 3) & 1 ? PW1 : PW0;
    case PAUSE: case SEARCH: case SUSP: return PST;
    case ALERT: return PALERT;
    case CHASE: return (c.walkT >> 2) & 1 ? PR1 : PR0;
    case POUNCE: return PPOUNCE;
    case MISS: case DIZZY: return PDIZZY;
    case YAWN: return PYAWN;
    case PEEK: return PSNIFF;
    case PLAY: return (c.mt >> 4) & 1 ? PSNIFF : PSIT;
    case EAT: return PEAT;
    case HAPPY: return PHAPPY;
    case SLEEP: return PSLEEP;
    case FLEE: return c.mt < 18 ? PSCARED : (c.walkT >> 2) & 1 ? PR1 : PR0;
    default: return PST;
  }
}
/** 손가락 (톡 할 곳 안내) */
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.12);
  ctx.rotate(-0.35);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-k * 0.13, -k * 0.05);
  ctx.lineTo(-k * 0.13, -k * 0.62);
  ctx.quadraticCurveTo(0, -k * 0.75, k * 0.13, -k * 0.62);
  ctx.lineTo(k * 0.13, -k * 0.2);
  ctx.quadraticCurveTo(k * 0.45, -k * 0.25, k * 0.42, k * 0.05);
  ctx.quadraticCurveTo(k * 0.4, k * 0.45, 0, k * 0.5);
  ctx.quadraticCurveTo(-k * 0.38, k * 0.45, -k * 0.38, k * 0.12);
  ctx.quadraticCurveTo(-k * 0.38, -k * 0.08, -k * 0.13, -k * 0.05);
  ctx.closePath();
  ink(ctx, '#ffffff', Math.max(2, k * 0.06));
  ell(ctx, 0, -k * 0.55, k * 0.08, k * 0.05);
  ctx.fillStyle = '#ffd6e0';
  ctx.fill();
  ctx.restore();
}
/** 장 끝 선물: 0 골무 투구 · 1 방울 장난감 · 2 롤러스케이트 · 3 치즈 자석 */
function drawPerk(ctx: C2, id: number, x: number, y: number, k: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  const lw = Math.max(2, k * 0.05);
  ell(ctx, 0, 0, k * 0.8, k * 0.22);
  ctx.fillStyle = 'rgba(60,35,10,.2)';
  ctx.fill();
  if (id === 0) {
    ctx.beginPath();
    ctx.moveTo(-k * 0.55, -k * 0.1);
    ctx.quadraticCurveTo(-k * 0.6, -k * 1.1, 0, -k * 1.15);
    ctx.quadraticCurveTo(k * 0.6, -k * 1.1, k * 0.55, -k * 0.1);
    ctx.closePath();
    ink(ctx, lin(ctx, -k * 0.6, 0, k * 0.6, 0, [0, '#ffffff'], [0.5, '#d6dce6'], [1, '#9aa4b2']), lw);
    ctx.fillStyle = 'rgba(90,100,120,.45)';
    for (let r = 0; r < 4; r++) for (let i = 0; i < 6 - r; i++) (ell(ctx, -k * 0.38 + i * k * 0.15 + r * k * 0.07, -k * 0.3 - r * k * 0.2, k * 0.035, k * 0.03), ctx.fill());
    rr(ctx, -k * 0.6, -k * 0.2, k * 1.2, k * 0.14, k * 0.05);
    ink(ctx, '#ff5a5a', lw);
    shine(ctx, -k * 0.3, -k * 0.85, k * 0.08, k * 0.2, -0.3, 0.8);
  } else if (id === 1) {
    line(ctx, -k * 0.6, -k * 0.02, k * 0.2, -k * 1.0, OUT, lw * 2.2);
    line(ctx, -k * 0.6, -k * 0.02, k * 0.2, -k * 1.0, '#c98a4a', lw * 1.2);
    ctx.beginPath();
    ctx.moveTo(k * 0.2, -k * 1.0);
    ctx.quadraticCurveTo(k * 0.6, -k * 1.2 + Math.sin(t * 0.2) * k * 0.05, k * 0.45, -k * 0.6);
    ctx.strokeStyle = '#ff5a9a';
    ctx.lineWidth = lw;
    ctx.stroke();
    ell(ctx, k * 0.45, -k * 0.5, k * 0.24, k * 0.24);
    ink(ctx, radg(ctx, k * 0.38, -k * 0.58, 0, k * 0.3, [0, '#fff3a8'], [1, '#f5b921']), lw);
    line(ctx, k * 0.3, -k * 0.45, k * 0.6, -k * 0.45, OUT, lw * 0.7);
    for (let i = 0; i < 5; i++) (ell(ctx, k * 0.2 + Math.cos(i * 1.2) * k * 0.08, -k * 1.0 + Math.sin(i * 1.2) * k * 0.08, k * 0.1, k * 0.05, i), ink(ctx, ['#ff9ecb', '#7fd0ff', '#ffd23a', '#a6e07a', '#ff8a6a'][i], lw * 0.5));
  } else if (id === 2) {
    for (const sd of [-1, 1]) {
      const bx = sd * k * 0.32;
      rr(ctx, bx - k * 0.25, -k * 0.85, k * 0.42, k * 0.6, k * 0.12);
      ink(ctx, lin(ctx, 0, -k * 0.85, 0, -k * 0.25, [0, '#ff8fb8'], [1, '#ff5a8a']), lw);
      rr(ctx, bx - k * 0.32, -k * 0.32, k * 0.62, k * 0.14, k * 0.06);
      ink(ctx, '#ffffff', lw);
      for (const wx of [-0.2, 0.16]) (ell(ctx, bx + wx * k, -k * 0.12, k * 0.09, k * 0.09), ink(ctx, '#ffd23a', lw * 0.8));
    }
  } else {
    ctx.beginPath();
    ctx.arc(0, -k * 0.55, k * 0.42, Math.PI, TAU);
    ctx.lineTo(k * 0.42, -k * 0.15);
    ctx.lineTo(k * 0.18, -k * 0.15);
    ctx.lineTo(k * 0.18, -k * 0.55);
    ctx.arc(0, -k * 0.55, k * 0.18, 0, Math.PI, true);
    ctx.lineTo(-k * 0.18, -k * 0.15);
    ctx.lineTo(-k * 0.42, -k * 0.15);
    ctx.closePath();
    ink(ctx, '#ff4f5a', lw);
    for (const sd of [-1, 1]) (rr(ctx, sd * k * 0.3 - k * 0.12, -k * 0.2, k * 0.24, k * 0.14, k * 0.02), ink(ctx, '#e6eaf0', lw * 0.8));
    for (let i = 0; i < 3; i++) {
      const a = t * 0.1 + i * 2.1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * k * 0.7 - k * 0.08, -k * 0.6 + Math.sin(a) * k * 0.3);
      ctx.lineTo(Math.cos(a) * k * 0.7 + k * 0.1, -k * 0.6 + Math.sin(a) * k * 0.3 - k * 0.06);
      ctx.lineTo(Math.cos(a) * k * 0.7 + k * 0.1, -k * 0.6 + Math.sin(a) * k * 0.3 + k * 0.06);
      ctx.closePath();
      ink(ctx, '#ffc531', lw * 0.6);
    }
  }
  ctx.restore();
}
/** 쥐구멍 마을 집 하나 */
function drawHouse(ctx: C2, i: number, x: number, y: number, k: number, built: boolean, glow: number) {
  const cols = ['#ffd27a', '#ff9a8a', '#8fd0ff', '#a6e07a', '#ff9ecb', '#c6a4ff', '#ffb347', '#7fe0c0', '#ffe36b', '#9ab8ff', '#ff8fb8', '#ffc531'];
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  const lw = Math.max(1.2, k * 0.08);
  if (!built) {
    ctx.setLineDash([3, 3]);
    rr(ctx, -k * 0.5, -k * 0.9, k, k * 0.9, k * 0.1);
    ctx.strokeStyle = '#c9b48a';
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    return;
  }
  if (glow > 0) (ell(ctx, 0, -k * 0.5, k * (0.9 + glow * 0.3), k * (0.9 + glow * 0.3)), (ctx.fillStyle = `rgba(255,240,150,${0.5 * glow})`), ctx.fill());
  rr(ctx, -k * 0.5, -k * 0.75, k, k * 0.75, k * 0.08);
  ink(ctx, cols[i % cols.length], lw);
  ctx.beginPath();
  if (i % 3 === 2) ctx.arc(0, -k * 0.75, k * 0.55, Math.PI, TAU);
  else (ctx.moveTo(-k * 0.65, -k * 0.7), ctx.lineTo(0, -k * 1.25), ctx.lineTo(k * 0.65, -k * 0.7));
  ctx.closePath();
  ink(ctx, i % 2 ? '#e8454f' : '#8a5a3a', lw);
  rr(ctx, -k * 0.14, -k * 0.38, k * 0.28, k * 0.38, k * 0.12);
  ink(ctx, '#8a5a3a', lw * 0.7);
  rr(ctx, k * 0.2, -k * 0.62, k * 0.2, k * 0.18, k * 0.04);
  ink(ctx, '#fff3a8', lw * 0.6);
  ctx.restore();
}

function drawAll(ctx: C2, s: MouseState, w: number, h: number, _th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const sc = devScale(ctx), sc2 = Math.min(2, sc), Q = (u: number) => R(u) * sc2 * 1.1;
  const d = STAGES[s.stage], ch = d.ch, m = s.m, seenT = fx.memo.t ?? -1, room = ROOMS[ch];
  let sn = 0;
  const snd = (n: Parameters<typeof fx.sound>[0], p = 1, v = 1) => void (sn++ < 2 && fx.sound(n, p, v));
  // 결과·선물·끝 화면이 뜨면 떠 있던 짧은 글자는 걷는다 (카드 위에 겹치지 않게)
  if (s.phase !== 'play' && fx.memo.clr !== s.stage * 10 + (s.phase === 'result' ? 1 : s.phase === 'pick' ? 2 : 3)) (fx.memo.clr = s.stage * 10 + (s.phase === 'result' ? 1 : s.phase === 'pick' ? 2 : 3)), (fx.popups.length = 0);
  wantStage(s.stage, Math.round(w), Math.round(h), sc);
  if ((s.phase === 'result' || s.phase === 'pick') && s.stage + 1 < STAGES.length) wantStage(s.stage + 1, Math.round(w), Math.round(h), sc);
  idlePump();
  const puff = (x: number, y: number, col: string, n: number, spd = 3, size = 3) => {
    if (fx.particles.length < PART_MAX) fx.burst(x, y, col, Math.min(n, PART_MAX - fx.particles.length), spd, size);
  };
  /** 사건 하나에 짧은 글자 하나, 화면에 동시에 둘까지 (중요한 것(hi)은 가장 오래된 것을 밀어낸다) */
  const say = (x: number, y: number, str: string, col: string, size: number, hi = false) => {
    let rec = recent.get(s);
    if (!rec) recent.set(s, (rec = []));
    if (fx.popups.length >= 2) {
      if (!hi) return;
      while (fx.popups.length >= 2) fx.popups.shift();
    }
    x = clamp(x, w * 0.12, w * 0.88);
    y = Math.max(Y(0.14), y);
    for (let k = 0; k < 5 && rec.some((q) => t - q.t < 30 && Math.abs(q.x - x) < w * 0.16 && Math.abs(q.y - y) < (size + q.size) * 0.55); k++) y -= size * 0.9;
    rec.push({ x, y, t, size });
    if (rec.length > 14) rec.shift();
    fx.pop(x, y, str, col, size);
  };
  const since = (k: string) => {
    for (let i = s.events.length - 1; i >= 0; i--) if (s.events[i].k === k) return t - s.events[i].t;
    return 999;
  };
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.save();
  fx.begin(ctx);
  {
    // 판 바닥(배경+발자국) 한 장은 그림 프레임 밖에서 굽고, 그동안은 방 배경만 찍는다 (판 첫 프레임이 끊기지 않게)
    const pk = pawKey(s, Math.round(w), sc), pl = PAWS.get(pk);
    if (pl) ctx.drawImage(pl, 0, 0, w, h);
    else {
      ctx.drawImage(bakeBg(ch, room.hole, Math.round(w), Math.round(h), sc), 0, 0, w, h);
      const ws = Math.round(w), hs = Math.round(h);
      want('paw' + pk, () => pawLayer(s, ws, hs, sc));
      idlePump();
    }
  }
  // ── 구경꾼 고양이 (자거나 밥 먹는 — 와장창·쿵에 깜짝 깬다) ──
  const jolt = Math.min(since('crash'), since('bonk'), since('caught'), since('kingwake'), since('roll'));
  const drawDeco = (dc: Deco) => {
    const [k, x, y, sz, pose] = dc, up = jolt < 50, u = R(U_CAT) * sz;
    ctx.save();
    ctx.translate(X(x), Y(y) - (up ? Math.sin((jolt / 50) * Math.PI) * R(0.025) : 0));
    if (x > 0.5) ctx.scale(-1, 1);
    if (pose === 1 && !up) {
      // 밥그릇 (먹는 고개가 까딱까딱)
      ell(ctx, u * 1.05, -u * 0.12, u * 0.42, u * 0.16);
      ink(ctx, '#5aa0ff', 1.2);
      ctx.translate(0, Math.abs(Math.sin(t * 0.15 + x * 9)) * u * 0.06);
    }
    stamp(ctx, catSpr(k, up ? PSCARED : pose === 1 ? PEAT : PSLEEP, Q(U_CAT)), F_CAT, u);
    ctx.restore();
    if (!up && pose === 0) {
      const f = (t * 0.012 + x * 3) % 1;
      ctx.globalAlpha = 1 - f;
      gtext(ctx, 'z', X(x) + (x > 0.5 ? -1 : 1) * R(0.04) + f * R(0.02), Y(y) - u * 1.3 - f * R(0.03), R(0.03), 900, '#7fa8f0', '#ffffff', 3);
      ctx.globalAlpha = 1;
    }
  };
  const decos = decoOf(s.stage);
  for (const dc of decos) if (dc[5] < 0) drawDeco(dc);
  // ── 살아 있는 부엌: 주전자 김 · 햇살 먼지 ──
  if (ch === 0) {
    for (let i = 0; i < 3; i++) {
      const f = (t * 0.012 + i / 3) % 1;
      ctx.globalAlpha = 0.5 * (1 - f);
      ell(ctx, X(0.795 + Math.sin(f * 6 + i) * 0.012), Y(0.21 - f * 0.08), R(0.012 + f * 0.02), R(0.01 + f * 0.016));
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = 'rgba(255,250,220,.7)';
  for (let i = 0; i < 7; i++) {
    const f = (t * 0.003 + hsh(i) ) % 1;
    ctx.globalAlpha = 0.5 * Math.sin(f * Math.PI);
    ell(ctx, X(0.42 + hsh(i + 9) * 0.3 + f * 0.08), Y(0.4 + f * 0.36), R(0.004), R(0.004));
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // ── 바닥 위: 발자국 · 냄새 · 털실 · 달걀 ──
  if (s.cats.some((c2) => c2.k === 'sniff') && m.trail.length > 1) {
    ctx.strokeStyle = 'rgba(160,200,60,.45)';
    ctx.lineWidth = 2;
    for (let i = 0; i < m.trail.length; i++) {
      const p = m.trail[i], q = i / m.trail.length;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) ctx.lineTo(X(p.x) + Math.sin(k * 1.4 + t * 0.15 + i) * R(0.006), Y(p.y) - k * R(0.007) * q * 1.5);
      ctx.stroke();
    }
  }
  for (const l of s.lures) {
    if (l.k === 'yarn' && (l.fly || l.used)) {
      ctx.beginPath();
      ctx.moveTo(X(l.ax), Y(l.ay));
      const mx = (l.ax + l.x) / 2 + Math.sin(t * 0.02) * 0.005, my = (l.ay + l.y) / 2 + 0.02;
      ctx.quadraticCurveTo(X(mx), Y(my), X(l.x), Y(l.y));
      ctx.strokeStyle = '#ff5a9a';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    if (l.k === 'egg' && l.used) {
      ctx.fillStyle = '#ffffff';
      burstPath(ctx, X(l.x), Y(l.y), R(0.035), 9, 0.7);
      ink(ctx, '#ffffff', 1.5);
      ell(ctx, X(l.x), Y(l.y), R(0.013), R(0.011));
      ink(ctx, '#ffc531', 1.2);
    }
  }
  // ── 노란 눈길 (미리 그린 부채꼴 한 장을 돌려 찍고, 가구에 가려지면 가려진 모양으로 오린다) ──
  for (const c2 of s.cats) {
    const kd = KD[c2.k], sus = c2.mode === SUSP ? c2.sus : 0;
    const open = c2.k === 'king' ? c2.mode === ROLL : awakeEyes(c2);
    const drowsy = c2.k === 'sleepy' && c2.mode === SLEEP && c2.sleepLen - c2.mt < 90;
    if (!open && !drowsy) continue;
    const isK = c2.k === 'king', vr = isK ? 0.17 : kd.vr, va = isK ? Math.PI : kd.va, a0 = c2.face + c2.look, N = isK ? 16 : 10;
    let cut = false;
    const pts: number[] = [];
    for (let i = 0; i <= N; i++) {
      const a = isK ? (i / N) * TAU : a0 - va + (2 * va * i) / N, ca = Math.cos(a), sa = Math.sin(a);
      let dd = 0.03;
      for (; dd < vr; dd += 0.028) {
        const x = c2.x + ca * dd, y = c2.y + sa * dd * YS;
        if (x < 0.005 || x > 0.995 || y < GY0 || y > FY1 || s.blk[cellAt(x, y)]) break;
      }
      if (dd < vr) cut = true;
      dd = Math.min(dd, vr);
      pts.push(X(c2.x + ca * dd), Y(c2.y + sa * dd * YS));
    }
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(X(c2.x), Y(c2.y));
      for (let i = 0; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
      ctx.closePath();
    };
    if (drowsy) {
      path();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = `rgba(255,210,60,${0.4 + 0.3 * Math.sin(t * 0.3)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      continue;
    }
    const lvl = sus > 0.66 ? 2 : sus > 0 ? 1 : 0;
    const col = isK ? '255,110,80' : lvl === 2 ? '255,110,60' : lvl === 1 ? '255,170,60' : '255,215,70';
    const img = coneSpr(va, col, 0.62, 0.22, R(vr) * sc2);
    ctx.save();
    if (cut) (path(), ctx.clip());
    ctx.translate(X(c2.x), Y(c2.y));
    ctx.scale(1, YS);
    if (!isK) ctx.rotate(a0);
    const q = Math.max(8, Math.round(R(vr) * sc2)), f = R(vr) / q;
    ctx.drawImage(img, -(q + 2) * f, -(q + 2) * f, (2 * q + 4) * f, (2 * q + 4) * f);
    ctx.restore();
  }
  // ── 소리 고리 · 가는 길 미리 보기 ──
  for (const e of s.events) {
    const age = t - e.t;
    if (e.k === 'land' && age < 34 && e.text !== 'yarn') {
      const q = age / 34, r = (e.text === 'bowl' ? 0.6 : LD[e.text as LK]?.r ?? NOISE_R) * bell(s) * Math.min(1, q * 1.6);
      ctx.save();
      ctx.translate(X(e.x), Y(e.y));
      ctx.scale(1, YS);
      ctx.beginPath();
      ctx.arc(0, 0, R(r), 0, TAU);
      ctx.strokeStyle = e.text === 'balloon' ? `rgba(255,80,90,${1 - q})` : `rgba(120,200,255,${1 - q})`;
      ctx.lineWidth = 4 * (1 - q) + 1;
      ctx.stroke();
      ctx.restore();
    }
  }
  if (s.plan && t - s.plan.t < 56 && s.phase === 'play' && (m.st === RUN || t - s.plan.t < 14)) {
    const a = 1 - (t - s.plan.t) / 56;
    ctx.globalAlpha = a;
    ctx.setLineDash([R(0.012), R(0.014)]);
    ctx.lineDashOffset = -t * 0.8;
    ctx.beginPath();
    ctx.moveTo(X(m.x), Y(m.y));
    for (let i = Math.max(0, m.pi); i < s.plan.pts.length - 1 + 1 && i < m.path.length; i++) ctx.lineTo(X(m.path[i].x), Y(m.path[i].y));
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);
    ell(ctx, X(s.plan.x), Y(s.plan.y), R(0.04) * (1 + 0.15 * Math.sin(t * 0.3)), R(0.04) * YS * 0.7);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // ── 새것 스포트라이트 ──
  if (s.spot && s.phase === 'play' && t - s.spot.t < 280) {
    const k = s.spot.k, pul = 0.5 + 0.5 * Math.sin(t * 0.2);
    const marks: P[] = [];
    if (k === 'hide') marks.push(s.hides[0]);
    else if (k === 'lure' || k === 'party' || k === 'yarn' || k === 'bowl') for (const l of s.lures) if ((k === 'lure' && l.k === 'spoon') || (k === 'party' && l.k === 'balloon') || (k === 'yarn' && l.k === 'yarn') || (k === 'bowl' && l.k === 'bowl')) marks.push(l);
    if (k === 'vac' && s.vac) marks.push(s.vac);
    for (const c2 of s.cats) if ((k === 'sleepy' && c2.k === 'sleepy') || (k === 'king' && c2.k === 'king') || (k === 'specs' && c2.k === 'specs') || (k === 'sniff' && c2.k === 'sniff') || (k === 'tower' && c2.k === 'tower') || k === 'ten') marks.push(c2);
    for (const p of marks) {
      ell(ctx, X(p.x), Y(p.y), R(0.06 + 0.01 * pul), R(0.06 + 0.01 * pul) * YS * 0.7);
      ctx.fillStyle = `rgba(255,236,120,${0.25 + 0.15 * pul})`;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -t * 0.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // ── 깊이 순서대로: 가구 · 숨을 곳 · 소리 물건 · 치즈 · 잡동사니 · 고양이 · 생쥐 · 청소기 ──
  const items: { y: number; f: () => void }[] = [];
  room.furn.forEach((f, i) => {
    const fr = furnRect(f);
    items.push({ y: fr.y1 - 0.002, f: () => { const o = furnSpr(ch, i, Math.round(w), sc); ctx.drawImage(o.c, X(o.x), Y(o.y), R(o.w), R(o.h)); } });
  });
  for (const dc of decos) if (dc[5] >= 0 && room.furn[dc[5]]) items.push({ y: furnRect(room.furn[dc[5]]).y1 + 0.0005, f: () => drawDeco(dc) });
  const shadow = (x: number, y: number, rx: number) => {
    ell(ctx, X(x), Y(y), rx, rx * 0.3);
    ctx.fillStyle = 'rgba(60,35,10,.2)';
    ctx.fill();
  };
  for (const hd of s.hides) {
    items.push({ y: hd.y, f: () => {
      const u = R(U_HIDE) * depthK(hd.y), sh = hd.shake > 0 ? Math.sin(hd.shake * 1.3) * 0.12 * (hd.shake / 30) : 0;
      const mine = m.st === HIDE && m.hide === hd.id;
      ctx.save();
      ctx.translate(X(hd.x), Y(hd.y));
      ctx.rotate(sh);
      if (mine) {
        // 숨은 생쥐: 발밑 고리 + 큰 귀 둘과 눈이 빼꼼 ('내가 저기 있다')
        const mu = R(U_MOUSE) * depthK(hd.y), pul = 0.5 + 0.5 * Math.sin(t * 0.15);
        ell(ctx, 0, 0, u * (1.25 + 0.1 * pul), u * (0.45 + 0.04 * pul));
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 4]);
        ctx.lineDashOffset = -t * 0.4;
        ctx.stroke();
        ctx.setLineDash([]);
        const tremble = s.cats.some((c2) => (c2.mode === PEEK || c2.mode === SUSP || c2.mode === CHASE || c2.mode === FOLLOW) && dist(c2.x, c2.y, hd.x, hd.y) < 0.25) ? Math.sin(t * 1.7) * mu * 0.05 : 0;
        const top = (hd.k === 'slipper' || hd.k === 'cushion' ? -0.95 : -1.3) * u;
        for (const [ex, r] of [[-0.3, 0.34], [0.22, 0.3]] as [number, number][]) (ell(ctx, ex * mu + tremble, top - r * mu * 0.55, r * mu, r * mu), ink(ctx, M_BODY, Math.max(1.2, mu * 0.06)), ell(ctx, ex * mu + tremble, top - r * mu * 0.55, r * mu * 0.6, r * mu * 0.6), (ctx.fillStyle = M_PINK), ctx.fill());
        for (const ex of [-0.1, 0.12]) (ell(ctx, ex * mu + tremble, top + mu * 0.02, mu * 0.075, mu * 0.095), (ctx.fillStyle = '#1e1410'), ctx.fill(), ell(ctx, ex * mu + tremble - mu * 0.02, top - mu * 0.01, mu * 0.025, mu * 0.025), (ctx.fillStyle = '#ffffff'), ctx.fill());
      }
      stamp(ctx, hideSpr(hd.k, Q(U_HIDE)), F_PROP, u);
      ctx.restore();
    } });
  }
  for (const l of s.lures) {
    if (l.k === 'egg' && l.used) continue;
    items.push({ y: l.y, f: () => {
      const u = R(U_LURE) * depthK(l.y);
      let lift = 0, rot = 0;
      if (l.fly) {
        const q = l.fly.t / l.fly.T;
        lift = l.k === 'yarn' || l.k === 'egg' || l.k === 'lid' ? 0 : Math.sin(q * Math.PI) * R(0.12);
        rot = l.k === 'spoon' ? l.spin : l.k === 'yarn' || l.k === 'egg' ? l.spin * 0.6 : l.k === 'lid' ? Math.sin(l.spin) * 0.3 : 0;
      }
      if (l.k === 'balloon' && l.used) {
        // 터진 풍선 조각
        ctx.fillStyle = '#ff3b4a';
        for (let i = 0; i < 4; i++) (ell(ctx, X(l.x) + Math.cos(i * 1.7) * R(0.015), Y(l.y) - R(0.006), R(0.008), R(0.004), i), ctx.fill());
        return;
      }
      shadow(l.x, l.y, u * 0.8);
      ctx.save();
      ctx.translate(X(l.x), Y(l.y) - lift - (l.k === 'balloon' ? Math.sin(t * 0.05 + l.id) * R(0.006) : 0));
      if (rot) (ctx.translate(0, -u * 0.5), ctx.rotate(rot), ctx.translate(0, u * 0.5));
      stamp(ctx, lureSpr(l.k, Q(U_LURE)), F_PROP, u * (l.k === 'balloon' ? 1.15 : 1));
      ctx.restore();
      // 날아갈 곳 (작은 점선 화살)
      if (!l.fly && !l.used && l.cool <= 0 && l.k !== 'balloon' && l.k !== 'bowl' && s.phase === 'play') {
        const tx = l.side === 0 ? l.bx : l.ax, ty = l.side === 0 ? l.by : l.ay;
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(X(l.x), Y(l.y) - u * 0.5);
        ctx.quadraticCurveTo(X((l.x + tx) / 2), Y((l.y + ty) / 2) - R(0.1), X(tx), Y(ty));
        ctx.strokeStyle = '#5a8fe0';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
        ell(ctx, X(tx), Y(ty), R(0.018), R(0.012));
        ctx.strokeStyle = '#5a8fe0';
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    } });
  }
  for (const q of s.cheese) {
    items.push({ y: q.y, f: () => {
      const u = R(U_Q) * depthK(q.y), age = t - q.born;
      let x = X(q.x), y = Y(q.y);
      if (age < 30) {
        const f = age / 30;
        x = X(q.fx + (q.x - q.fx) * f);
        y = Y(q.fy + (q.y - q.fy) * f) - Math.sin(f * Math.PI) * R(0.08);
      }
      const bob = Math.sin(t * 0.08 + q.id) * u * 0.08;
      ell(ctx, x, Y(q.y), u * 1.2, u * 0.38);
      ctx.fillStyle = 'rgba(255,230,120,.35)';
      ctx.fill();
      ctx.save();
      ctx.translate(x, y - bob);
      stamp(ctx, qSpr(q.k, Q(U_Q)), F_PROP, u);
      ctx.restore();
      if ((t + q.id * 13) % 70 < 12) {
        const f = ((t + q.id * 13) % 70) / 12;
        starPath(ctx, x + u * 0.5, y - u * 1.1, u * 0.35 * Math.sin(f * Math.PI), 0.3, 0, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    } });
  }
  for (const q of s.clutter) {
    items.push({ y: q.y, f: () => {
      const u = R(U_CL) * depthK(q.y), age = q.knocked >= 0 ? t - q.knocked : -1;
      ctx.save();
      ctx.translate(X(q.x), Y(q.y));
      if (age >= 0) ctx.rotate(Math.min(1, age / 20) * (q.vx >= 0 ? 1.3 : -1.3));
      stamp(ctx, clSpr(q.k, Q(U_CL)), F_PROP, u);
      ctx.restore();
    } });
  }
  if (s.vac) {
    const v = s.vac;
    items.push({ y: v.y, f: () => {
      const u = R(U_VAC) * depthK(v.y);
      ctx.save();
      ctx.translate(X(v.x), Y(v.y));
      stamp(ctx, vacSpr(Q(U_VAC)), F_PROP, u);
      ctx.restore();
      // 빙글빙글 솔
      for (const sd of [-1, 1]) {
        const bx = X(v.x) + sd * u * 0.7, by = Y(v.y) - u * 0.12;
        for (let i = 0; i < 3; i++) line(ctx, bx, by, bx + Math.cos(t * 0.5 * sd + i * 2.1) * u * 0.3, by + Math.sin(t * 0.5 * sd + i * 2.1) * u * 0.1, OUT, 1.2);
      }
      if (m.st === RIDE) {
        const mu = R(U_MOUSE) * depthK(v.y);
        ctx.save();
        ctx.translate(X(v.x), Y(v.y) - u * 0.75);
        if (v.face > Math.PI / 2 || v.face < -Math.PI / 2) ctx.scale(-1, 1);
        stamp(ctx, mouseSpr(MCHEER, tierOf(s.lv), Q(U_MOUSE)), F_MOUSE, mu);
        ctx.restore();
        drawBundle(ctx, X(v.x), Y(v.y) - u * 0.75, mu, m.bag, 1, t);
      }
    } });
  }
  // 캣타워 위 등대 고양이 높이
  const towerTop = (c2: Cat) => {
    if (c2.k !== 'tower' || dist(c2.x, c2.y, c2.route[0].x, c2.route[0].y) > 0.03) return 0;
    if (c2.mode === PAUSE || c2.mode === SUSP) return R(0.16);
    if (c2.mode === ALERT) return R(0.16) * Math.max(0, 1 - c2.mt / ALERT_T);
    return 0;
  };
  for (const c2 of s.cats) {
    items.push({ y: c2.y + (c2.k === 'king' && (c2.mode === SLEEP || c2.mode === ALERT) ? 0.08 : 0), f: () => {
      const isK = c2.k === 'king', u = R(isK ? U_KING : U_CAT) * depthK(c2.y);
      let lift = 0;
      if (c2.mode === POUNCE) lift = Math.sin(Math.min(1, c2.mt / POUNCE_T) * Math.PI) * R(0.06);
      if (c2.mode === ALERT && t - c2.jumpT < 14) lift = Math.sin(((t - c2.jumpT) / 14) * Math.PI) * R(0.03);
      if (c2.mode === FLEE && c2.mt < 18) lift = Math.sin((c2.mt / 18) * Math.PI) * R(0.05);
      if (isK && (c2.mode === SLEEP || c2.mode === ALERT)) lift = R(0.075);
      const tt = towerTop(c2);
      lift += tt;
      if (!tt && !(isK && lift > 0)) shadow(c2.x, c2.y, u * (isK ? 1.1 : 0.95));
      ctx.save();
      ctx.translate(X(c2.x), Y(c2.y) - lift);
      if (isK) {
        const pose = c2.mode === ROLL || c2.mode === GO || c2.mode === HAPPY ? 2 : c2.mode === ALERT ? 1 : 0;
        if (pose === 2) (ctx.translate(0, -u * 0.78), ctx.rotate(c2.walkT * 0.08 * c2.flip), ctx.translate(0, u * 0.78));
        else if (c2.flip < 0) ctx.scale(-1, 1);
        if (pose === 0) ctx.scale(1 + Math.sin(t * 0.05) * 0.02, 1 - Math.sin(t * 0.05) * 0.02);
        stamp(ctx, kingSpr(pose, Q(U_KING)), F_KING, u);
      } else {
        if (c2.flip < 0) ctx.scale(-1, 1);
        const pose = catPose(c2, t);
        if (pose === PW0 || pose === PW1) ctx.translate(0, -Math.abs(Math.sin(c2.walkT * 0.2)) * u * 0.06);
        stamp(ctx, catSpr(c2.k, pose, Q(U_CAT)), F_CAT, u);
      }
      ctx.restore();
    } });
  }
  // 생쥐
  if (m.st === RUN || m.st === IDLE || m.st === CAUGHT) {
    items.push({ y: m.y + 0.001, f: () => {
      const u = R(U_MOUSE) * depthK(m.y), tier = tierOf(s.lv);
      if (m.st === CAUGHT) {
        // 찍! 발밑에 납작 (0.25초) → 빙글빙글 빠져나와 쥐구멍으로 쏙 (0.75초)
        const f = m.mt / CAUGHT_T;
        ctx.save();
        if (f < 0.25) {
          ctx.translate(X(m.x), Y(m.y));
          stamp(ctx, mouseSpr(MFLAT, tier, Q(U_MOUSE)), F_MOUSE, u);
        } else {
          const q = (f - 0.25) / 0.75, e2 = q * q * (3 - 2 * q), x = m.x + (s.hx - m.x) * e2, y = m.y + (s.hy - m.y) * e2 - Math.sin(q * Math.PI) * 0.1;
          ctx.translate(X(x), Y(y));
          ctx.rotate(q * TAU * 2.5);
          ctx.translate(0, u * 0.6);
          ctx.globalAlpha = q > 0.85 ? Math.max(0, 1 - (q - 0.85) * 6.6) : 1;
          stamp(ctx, mouseSpr(MR0, tier, Q(U_MOUSE)), F_MOUSE, u * (1 - q * 0.35));
          ctx.globalAlpha = 1;
        }
        ctx.restore();
        return;
      }
      // 내 생쥐는 늘 눈에 띄게: 발밑 밝은 고리 (두근두근)
      const pul = 0.5 + 0.5 * Math.sin(t * 0.18);
      ell(ctx, X(m.x), Y(m.y), u * (1.15 + 0.08 * pul), u * (0.42 + 0.03 * pul));
      ctx.fillStyle = 'rgba(255,248,190,.7)';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      const busy = m.busy > 0, pose = busy ? MGRAB : m.st === RUN ? ((m.at >> 2) & 1 ? MR1 : MR0) : MST;
      const hop = m.st === RUN ? Math.abs(Math.sin(m.at * 0.4)) * u * 0.12 : 0;
      ctx.save();
      ctx.translate(X(m.x), Y(m.y) - hop);
      if (m.dir < 0) ctx.scale(-1, 1);
      stamp(ctx, mouseSpr(pose, tier, Q(U_MOUSE)), F_MOUSE, u);
      ctx.restore();
      drawBundle(ctx, X(m.x), Y(m.y) - hop, u, m.bag, m.dir, t);
      // 쪼르르 먼지
      if (m.st === RUN && m.at % 6 === 0) puff(X(m.x) - m.dir * u * 0.6, Y(m.y), '#fff6dc', 1, 1, 2);
    } });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();
  // 쥐구멍 안의 생쥐 (빼꼼)
  if (m.st === HOLE && s.phase === 'play') {
    const u = R(U_MOUSE) * 0.9, bx = X(s.hx), by = Y(GY0 - 0.012), tw = Math.sin(t * 0.06) * u * 0.05;
    for (const [ex, r] of [[-0.35, 0.3], [0.3, 0.27]] as [number, number][]) (ell(ctx, bx + ex * u + tw, by - u * 0.5, r * u, r * u), ink(ctx, M_BODY, 1.2), ell(ctx, bx + ex * u + tw, by - u * 0.5, r * u * 0.6, r * u * 0.6), (ctx.fillStyle = M_PINK), ctx.fill());
    for (const ex of [-0.12, 0.12]) (ell(ctx, bx + ex * u + tw, by - u * 0.12, u * 0.07, u * 0.09), (ctx.fillStyle = '#ffffff'), ctx.fill());
    if (m.bag > 0) drawBundle(ctx, bx, by + u * 0.4, u, m.bag, 1, t);
  }

  // ── 머리 위: ? · ! · Zzz · 별 · 킁킁 ──
  for (const c2 of s.cats) {
    const isK = c2.k === 'king', u = R(isK ? U_KING : U_CAT) * depthK(c2.y), tt = towerTop(c2);
    const hx = X(c2.x) + c2.flip * u * (isK ? 0.4 : 0.6), hy = Y(c2.y) - tt - u * (isK ? (c2.mode === SLEEP ? 1.9 : 2.2) : 2.15) - (isK && (c2.mode === SLEEP || c2.mode === ALERT) ? R(0.075) : 0);
    if (c2.mode === SUSP && c2.sus > 0) {
      const k = R(0.026) * (1 + c2.sus * 0.25), wob = Math.sin(t * 0.5) * c2.sus * 2;
      rr(ctx, hx - k + wob, hy - k * 1.2, k * 2, k * 2.1, k * 0.6);
      ink(ctx, '#ffffff', 2);
      ctx.save();
      rr(ctx, hx - k + wob, hy - k * 1.2, k * 2, k * 2.1, k * 0.6);
      ctx.clip();
      ctx.fillStyle = c2.sus > 0.66 ? '#ff6b4a' : '#ffb347';
      ctx.fillRect(hx - k + wob, hy - k * 1.2 + k * 2.1 * (1 - c2.sus), k * 2, k * 2.1 * c2.sus);
      ctx.restore();
      gtext(ctx, '?', hx + wob, hy - k * 0.12, R(0.05), 900, '#4a2c1d', '#ffffff', 3);
    } else if (c2.mode === ALERT || c2.mode === CHASE || c2.mode === POUNCE || (isK && c2.mode === ROLL)) {
      const age = c2.mode === ALERT ? c2.mt : 99, k = R(0.03) * (age < 8 ? 1.5 - age / 16 : 1);
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(Math.sin(t * 0.6) * 0.1);
      burstPath(ctx, 0, 0, k * 1.25, 8, 0.72);
      ink(ctx, '#ff3b30', 2);
      gtext(ctx, '!', 0, 0, R(0.05), 900, '#ffffff', '#b8202a', 3);
      ctx.restore();
    } else if (c2.mode === SLEEP && !isK) {
      const left = clamp((c2.sleepLen - c2.mt) / c2.sleepLen, 0, 1), k = 0.5 + left * 0.8;
      for (let i = 0; i < 3; i++) {
        const f = (t * 0.015 + i / 3) % 1;
        ctx.globalAlpha = (1 - f) * (0.4 + 0.6 * left);
        gtext(ctx, 'z', hx + f * R(0.05) * k, hy + R(0.02) - f * R(0.05) * k, R(left > 0.5 ? 0.05 : left > 0.25 ? 0.04 : 0.032), 900, left < 0.25 ? '#ff8a3d' : '#7fa8f0', '#ffffff', 3);
      }
      ctx.globalAlpha = 1;
    } else if (isK && c2.mode === SLEEP) {
      // 코 풍선: 자는 깊이 (깨려 하면 주황, 눈금 셋)
      const q = clamp(c2.meter / KING_WAKE, 0, 1), br = R(0.022) * (1 + 0.45 * Math.sin(t * 0.05)) * (1 - q * 0.4);
      ell(ctx, hx + u * 0.25, hy + u * 0.9, br, br);
      ctx.fillStyle = q > 0.6 ? 'rgba(255,170,90,.7)' : 'rgba(200,235,255,.75)';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ell(ctx, hx - R(0.03) + i * R(0.03), hy + u * 0.2, R(0.011), R(0.011));
        ink(ctx, c2.meter >= i + 1 ? '#ff6b4a' : c2.meter > i ? '#ffb347' : '#ffffff', 1.5);
      }
    } else if (c2.mode === DIZZY || c2.mode === MISS) {
      for (let i = 0; i < 3; i++) {
        const a = t * 0.15 + (i * TAU) / 3;
        starPath(ctx, X(c2.x) + Math.cos(a) * u * 0.7, Y(c2.y) - u * 1.1 + Math.sin(a) * u * 0.25, u * 0.2);
        ink(ctx, '#ffd23a', 1.2);
      }
    } else if (c2.mode === FOLLOW && c2.follow === -2 && t % 40 < 26) {
      gtext(ctx, '킁킁', hx, hy, R(0.034), 900, '#7fbf3a', '#ffffff', 3);
    } else if (c2.mode === EAT && t % 50 < 30) {
      gtext(ctx, '냠냠', hx, hy, R(0.034), 900, '#ff8a3d', '#ffffff', 3);
    } else if (c2.mode === PLAY && t % 60 < 16) {
      heartPath(ctx, hx, hy, R(0.012));
      ink(ctx, '#ff7fb0', 1.2);
    }
  }

  // ── 방금 일어난 일: 소리 · 가루 · 흔들림 · 짧은 글자 (한 번만) ──
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x), ey = Y(e.y);
    switch (e.k) {
      case 'tap': snd('tick', 1.6, 0.5); fx.ring(X(e.x), Y(e.y), '#ffffff', R(0.05), 3); break;
      case 'grab': snd('coin', 1 + Math.min(8, e.n) * 0.06, 0.8); puff(ex, ey - R(0.02), '#ffd23a', 8, 3, 2.6); say(ex, ey - R(0.06), '+1', '#ffe36b', 17); break;
      case 'magnet': snd('coin', 1.4, 0.6); puff(ex, ey, '#ff4f5a', 4, 2.4, 2.2); break;
      case 'hide': snd('pop', 1.1, 0.9); puff(ex, ey - R(0.03), '#ffffff', 6, 2.4, 2.4); say(ex, ey - R(0.08), '쏙!', '#ffffff', 16); break;
      case 'unhide': snd('pop', 0.8, 0.5); break;
      case 'home': snd('whoosh', 1.4, 0.6); break;
      case 'deposit': {
        snd('chime', 1 + Math.min(6, e.n) * 0.04, 0.9);
        snd('coin', 0.9, 0.9);
        puff(ex, ey, '#ffd23a', 6 + e.n * 2, 4, 3);
        fx.ring(ex, ey, '#ffd23a', R(0.08 + e.n * 0.012), 4);
        say(ex, ey + R(0.03), `+${e.x2}`, '#ffd23a', 16 + Math.min(8, e.n), true);
        if (e.n >= 3) fx.kick(3 + e.n);
        break;
      }
      case 'kick': snd('whoosh', 1.5, 0.7); break;
      case 'land': {
        const k = e.text as LK;
        if (k === 'balloon') (snd('pop', 0.5, 1.4), snd('crack', 0.9, 1), fx.kick(10), fx.blink('#ffd6d6', 0.3), puff(ex, ey - R(0.07), '#ff3b4a', 14, 5.5, 3), say(ex, ey - R(0.1), '펑!', '#ff6b6b', 22));
        else if (k === 'bowl') (snd('ding', 1.2, 1), snd('chime', 1.2, 1), fx.kick(5), puff(ex, ey, '#ffe36b', 10, 4, 3), say(ex, ey - R(0.08), '땡땡!', '#ffe36b', 20));
        else if (k === 'egg') (snd('splash', 1.3, 0.9), snd('crack', 1.5, 0.7), puff(ex, ey, '#ffffff', 8, 3, 2.6), puff(ex, ey, '#ffc531', 4, 2.5, 2.4), say(ex, ey - R(0.06), '퍽!', '#ffffff', 18));
        else if (k === 'lid') (snd('thud', 1.3, 0.8), snd('ding', 0.8, 1), fx.kick(5), puff(ex, ey, '#e6eaf0', 8, 3.5, 2.6), say(ex, ey - R(0.06), '와르릉!', '#e6f0ff', 19));
        else if (k !== 'yarn') (snd('ding', 1.5, 1), snd('crack', 2, 0.5), fx.kick(4), puff(ex, ey, '#e6eaf0', 7, 3.5, 2.4), say(ex, ey - R(0.06), '땡그랑!', '#e6f0ff', 19));
        break;
      }
      case 'yarnstop': snd('boing', 0.8, 0.6); break;
      case 'yarncat': snd('tick', 1.8, 0.4); break;
      case 'huh': snd('tick', 2.2, 0.5); break;
      case 'alert': snd('zap', 1.2, 0.8); snd('boing', 1.8, 0.6); fx.kick(4); break;
      case 'chase': snd('whoosh', 1.1, 0.8); break;
      case 'pounce': snd('whoosh', 1.8, 0.7); break;
      case 'miss': snd('thud', 1.3, 0.8); snd('boing', 0.7, 0.7); fx.kick(5); puff(ex, ey, '#f3dfb0', 8, 3, 2.6); say(ex, ey - R(0.08), '헛방!', '#ffe9a0', 18); break;
      case 'skid': snd('whoosh', 0.6, 0.6); puff(ex, ey, '#ffffff', 4, 2, 2); say(ex, ey - R(0.05), '끼익', '#ffffff', 13); break;
      case 'crash': snd('crack', 0.9, 1.1); snd('thud', 0.9, 1); fx.kick(9); puff(ex, ey - R(0.02), '#ffffff', 10, 4.5, 2.8); puff(ex, ey, '#ffd27a', 6, 4, 2.4); say(ex, ey - R(0.07), '와장창!', '#ffffff', 21); break;
      case 'bonk': snd('thud', 0.6, 1.3); snd('boing', 0.9, 0.9); fx.kick(11); fx.blink('#fff6c8', 0.2); puff(ex, ey - R(0.05), '#ffe36b', 12, 5, 3); say(ex, ey - R(0.1), '쿵!', '#ffe36b', 24); break;
      case 'caught': snd('fail', 1.1, 1); snd('thud', 1.2, 0.9); fx.kick(10); fx.blink('#ff8a7a', 0.25); puff(ex, ey - R(0.02), '#ffd23a', 10, 5, 3); say(ex, ey - R(0.09), e.n ? '팡! 찍!' : '찍!', '#ff8a7a', 22, true); if (e.n) puff(ex, ey - R(0.05), '#ffc531', 14, 6, 3.4); break;
      case 'helmet': snd('ding', 0.8, 1.2); fx.kick(6); puff(ex, ey - R(0.04), '#e6eaf0', 10, 4, 2.6); say(ex, ey - R(0.09), '땡! 골무', '#e6f0ff', 19); break;
      case 'respawn': snd('pop', 1.4, 0.6); puff(ex, ey, '#ffffff', 6, 2.4, 2.4); break;
      case 'yawn': snd('swell', 0.7, 0.5); say(ex + R(0.03), ey - R(0.13), '하암~', '#ffffff', 14); break;
      case 'peek': snd('tick', 0.9, 0.5); break;
      case 'close': snd('chime', 1.4, 0.4); say(ex, ey - R(0.1), '휴~', '#bff3ff', 14); break;
      case 'phew': snd('chime', 1.25, 0.9); puff(ex, ey - R(0.04), '#bff3ff', 8, 3, 2.4); if (!e.x2) say(ex, ey - R(0.1), '휴~', '#bff3ff', 15); break;
      case 'flush': snd('pop', 0.7, 1); snd('zap', 1.6, 0.6); break;
      case 'sniff': snd('tick', 1.2, 0.4); break;
      case 'eek': snd('boing', 2.1, 0.7); say(ex, ey - R(0.12), '꺅!', '#ffd0e0', 15); break;
      case 'stir': snd('tick', 0.6, 0.5); say(ex, ey - R(0.2), '음냐…', '#ffffff', 14); break;
      case 'kingwake': snd('thud', 0.45, 1.5); snd('crack', 0.6, 1.2); fx.kick(16); fx.blink('#ffd6a0', 0.35); puff(ex, ey - R(0.1), '#ffd27a', 16, 6, 3.2); break;
      case 'roll': snd('thud', 0.5, 1.4); snd('whoosh', 0.55, 1); fx.kick(14); puff(ex, ey, '#f3dfb0', 14, 5, 3.2); say(ex, ey - R(0.12), '쿵! 데굴데굴', '#ffd27a', 20); break;
      case 'kinghome': snd('swell', 0.6, 0.6); break;
      case 'doze': snd('shrink', 0.8, 0.3); break;
      case 'wake': snd('swell', 0.9, 0.4); break;
      case 'ride': snd('boing', 1.3, 0.9); say(ex, ey - R(0.08), '부릉!', '#bff3ff', 16); break;
      case 'hopoff': snd('boing', 1.0, 0.6); break;
      case 'star3': snd('coin', 1.2, 1); puff(ex, ey, '#ffd84a', 14, 5.5, 3.2); fx.ring(ex, ey, '#ffd84a', R(0.2), 5); break;
      case 'stage': snd('ding', 1, 0.6); break;
      case 'clear': snd('clear', 1, 1); puff(w * 0.3, Y(0.7), '#ffd84a', 16, 6, 3.2); puff(w * 0.7, Y(0.7), '#ff9ecb', 16, 6, 3.2); break;
      case 'pickopen': snd('swell', 1.1, 0.9); break;
      case 'perk': snd('coin', 1, 1); snd('chime', 1.1, 0.9); puff(ex, Y(0.8), '#ffe36b', 16, 5, 3.2); fx.ring(ex, Y(0.8), '#ffe36b', R(0.2), 5); break;
      case 'end': snd(e.n ? 'clear' : 'fail', 0.9, 1); break;
    }
  }
  if (s.big && (fx.memo.bigT ?? -1) !== s.big.t && s.big.t > seenT) (fx.memo.bigT = s.big.t), fx.sound('chime', 1 + Math.min(8, s.big.n) * 0.04, 1), fx.blink('#fff6c8', 0.18), fx.kick(6);
  fx.memo.t = t;
  ctx.restore();
  drawHud(ctx, s, w, h, sc2, since);
}

// ───────────────────────────── 띠 · 결과 · 선물 ─────────────────────────────
/** 글자 띠는 내용이 바뀔 때만 다시 그려 두고, 프레임마다는 그 한 장을 찍는다 (느린 폰) */
const BARS = new Map<string, { c: HTMLCanvasElement; key: string }>();
function bar(id: string, w: number, hpx: number, sc: number, key: string, paint: (g: C2) => void): HTMLCanvasElement {
  const slot = `${id}:${Math.round(w)}:${sc}`;
  let b = BARS.get(slot);
  if (!b) BARS.set(slot, (b = { c: document.createElement('canvas'), key: '' }));
  if (b.key !== key) {
    b.key = key;
    const cv = b.c, cw = Math.ceil(w * sc), chh = Math.ceil(hpx * sc);
    if (cv.width !== cw || cv.height !== chh) (cv.width = cw), (cv.height = chh);
    const g = cv.getContext('2d')!;
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
function drawHud(main: C2, s: MouseState, w: number, h: number, sc2: number, since: (k: string) => number) {
  let ctx: C2 = main;
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const d = STAGES[s.stage], m = s.m, fx = juice(s);
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  const text = (str: string, x: number, y: number, fill: string, stroke = '', lw = 0) => {
    ctx.lineJoin = 'round';
    if (lw > 0) (ctx.lineWidth = lw), (ctx.strokeStyle = stroke), ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  };
  const INK = '#4a2c1d', MUTED = '#a08a70', CREAM = '#fff6dc', scD = devScale(main);
  main.textBaseline = 'middle';
  // ── 위 띠: 판 · 이름 · 하트 · 별 · 생쥐 레벨 ──
  // (띠 둘은 내용이 바뀔 때만 다시 그린다)
  const topKey = `${s.stage}|${s.hearts}|${s.stars}|${s.lv}`;
  main.drawImage(bar('top', w, Y(0.1), scD, topKey, (g) => {
  ctx = g;
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, w, Y(0.1));
  ctx.fillStyle = '#e3c48c';
  ctx.fillRect(0, Y(0.1) - 2, w, 2);
  ell(ctx, X(0.062), Y(0.05), R(0.036), R(0.036));
  ink(ctx, '#ffb800', 2);
  ctx.textAlign = 'center';
  font(0.046, 900);
  text(String(s.stage + 1), X(0.062), Y(0.052), '#ffffff', INK, 3);
  ctx.textAlign = 'left';
  font(0.042, 900);
  text(d.name, X(0.115), Y(0.052), INK);
  const nw = ctx.measureText(d.name).width;
  font(0.032, 700);
  text(`/ ${STAGES.length}`, X(0.115) + nw + R(0.012), Y(0.054), MUTED);
  for (let i = 0; i < 3; i++) {
    heartPath(ctx, X(0.585 + i * 0.05), Y(0.05), R(0.017));
    ink(ctx, i < s.hearts ? '#ff4d5e' : '#e6d6bc', 1.5);
  }
  starPath(ctx, X(0.745), Y(0.049), R(0.022));
  ink(ctx, '#ffc93c', 1.5);
  font(0.04, 900);
  text(String(s.stars), X(0.772), Y(0.053), INK);
  ctx.save();
  ctx.translate(X(0.87), Y(0.08));
  stamp(ctx, mouseSpr(MST, tierOf(s.lv), R(0.02) * sc2), F_MOUSE, R(0.02));
  ctx.restore();
  font(0.034, 900);
  text(`Lv${s.lv}`, X(0.9), Y(0.053), '#7a5cff');
  ctx = main;
  }), 0, 0, w, Y(0.1));

  // ── 아래 띠: 별 셋 · 한 줄 도움말 · 마을 · 도감 (내용이 바뀔 때만 다시) ──
  const B0 = Y(1.305);
  const words = STAR_WORDS(s), res = s.phase === 'result';
  const state = [res ? 1 : 0, s.catches > 0 ? -1 : res ? 1 : 0, starNow(s) ? 1 : res || (d.star.k === 'nowake' && s.woke) || (d.star.k === 'unseen' && s.alerts > 0) ? -1 : 0];
  const prog = d.star.k === 'bag' && !res && s.bestBag < d.star.n && m.bag > 0 ? ` ${m.bag}/${d.star.n}` : '';
  const labels = words.map((q, i) => q + (i === 2 ? prog : ''));
  const chased = s.cats.some((c2) => c2.mode === CHASE || c2.mode === ALERT || c2.mode === POUNCE);
  const susp = s.cats.some((c2) => c2.mode === SUSP && c2.sus > 0.15);
  let tip = `${d.name}: ${d.news}`;
  if (s.phase === 'pick') tip = '부엌 바닥의 큰 물건 둘 중 하나를 톡!';
  else if (s.phase === 'result') tip = s.got === 3 ? '별 셋! 판 점수가 네 배' : '별이 많을수록 판 점수가 곱해져요';
  else if (s.phase === 'end') tip = s.won ? '고양이 열 마리를 모두 따돌렸어요!' : '누르면 다시 해요';
  else if (!s.tapped && s.stage === 0) tip = '찻잔을 톡! 생쥐가 쪼르르 — 쏙 숨어요';
  else if (m.st === CAUGHT) tip = '찍! 치즈가 흩어졌어요 — 다시 주우면 돼요';
  else if (chased) tip = '들켰다! 숨을 곳이나 쥐구멍을 톡!';
  else if (susp && (m.st === RUN || m.st === IDLE)) tip = '?가 다 차면 들켜요 — 눈길 밖으로, 숨을 곳으로!';
  else if (m.st === HIDE && s.cats.some((c2) => c2.mode === PEEK)) tip = '쉿… 숨은 생쥐는 고양이가 못 봐요';
  else if (m.bag > 0 && s.cheese.length === 0) tip = '쥐구멍을 톡 — 보따리를 저장하면 판 끝!';
  else if (s.stage === 0 && m.bag === 0 && s.tapped && s.total === 0) tip = '치즈를 톡 — 덥석! 다 모으면 쥐구멍으로';
  else if (s.stage === 1 && s.lureMax === 0 && since('kick') > 600) tip = '숟가락을 톡 — 땡그랑! 고양이가 그쪽으로 가요';
  const botKey = `${labels.join('|')}|${state.join('')}|${tip}|${s.town}|${s.dexC.length}|${s.dexQ.length}`;
  main.drawImage(bar('bot', w, h - B0, scD, botKey, (g) => {
  ctx = g;
  ctx.translate(0, -B0);
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, B0, w, h - B0);
  ctx.fillStyle = '#e3c48c';
  ctx.fillRect(0, B0, w, 2);
  font(0.033, 800);
  const gap = R(0.012), pad = Math.min(R(0.07), (w - R(0.03) - gap * 2 - labels.reduce((a, q) => a + ctx.measureText(q).width, 0)) / 3);
  const ws = labels.map((q) => ctx.measureText(q).width + pad), total = ws.reduce((a, c2) => a + c2, 0) + gap * 2;
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
    font(0.033, 800);
    text(q, cx + pad * 0.76, cy + 0.5, off ? '#b8a688' : INK);
    if (off) (ctx.fillStyle = '#b8a688'), ctx.fillRect(cx + pad * 0.72, cy, cw - pad, 1.5);
    cx += cw + gap;
  });
  ctx.textAlign = 'center';
  font(0.034, 800);
  text(tip, w / 2, Y(1.402), INK);
  font(0.031, 700);
  text(`쥐구멍 마을 ${s.town}/${TOWN.length} · 고양이 도감 ${s.dexC.length}/${CAT_DEX.length} · 치즈 ${s.dexQ.length}/${Q_DEX.length}`, w / 2, Y(1.452), MUTED);
  ctx = main;
  }), 0, B0, w, h - B0);

  // ── 판 시작 띠 (NEW 한 줄) — 한 장 구워 미끄러뜨린다 ──
  if (s.banner && s.phase === 'play' && !(s.big && s.big.t >= s.banner.t)) {
    const age = t - s.banner.t, T = 200;
    if (age < T) {
      const a = Math.min(1, age / 10, (T - age) / 14), slide = (1 - Math.min(1, age / 10)) * R(0.05), by = Y(0.125) - slide, bh = R(0.12);
      const bn = s.banner;
      const img = bar('banner', w, bh, scD, `${bn.head}|${bn.sub}|${d.name}`, (g) => {
        ctx = g;
        const by = R(0.004);
        rr(ctx, X(0.05), by, R(0.9), R(0.112), R(0.03));
        ctx.fillStyle = 'rgba(255,250,235,.97)';
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.stroke();
        font(0.039, 900);
        const hw = ctx.measureText(bn.head).width, nw2 = ctx.measureText(d.name).width, pill = R(0.105), gap2 = R(0.014), tot = hw + gap2 + pill + gap2 + nw2;
        let bx0 = w / 2 - tot / 2;
        ctx.textAlign = 'left';
        text(bn.head, bx0, by + R(0.033), '#d9480f');
        bx0 += hw + gap2;
        rr(ctx, bx0, by + R(0.012), pill, R(0.042), R(0.021));
        ctx.fillStyle = '#ff3b30';
        ctx.fill();
        font(0.033, 900);
        ctx.textAlign = 'center';
        text('NEW', bx0 + pill / 2, by + R(0.034), '#ffffff');
        ctx.textAlign = 'left';
        font(0.039, 900);
        text(d.name, bx0 + pill + gap2, by + R(0.033), INK);
        ctx.textAlign = 'center';
        font(0.034, 800);
        text(bn.sub, w / 2, by + R(0.081), INK);
        ctx = main;
      });
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.drawImage(img, 0, by - R(0.004), w, bh);
      ctx.globalAlpha = 1;
    }
  }
  // ── 손가락: 1판 첫 톡 (찻잔) ──
  if (s.phase === 'play' && s.stage === 0 && !s.tapped && s.hides[0]) {
    const hd = s.hides[0], press = Math.max(0, Math.sin(t * 0.14)), hx = X(hd.x) + R(0.05), hy = Y(hd.y) - R(0.01);
    ell(ctx, X(hd.x), Y(hd.y) - R(0.03), R(0.06 * (1 + 0.25 * press)), R(0.06 * (1 + 0.25 * press)));
    ctx.strokeStyle = `rgba(255,255,255,${0.95 - 0.5 * press})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    drawHand(ctx, hx, hy + R(0.04), R(0.085), press);
    gtext(ctx, '톡!', X(hd.x) - R(0.06), Y(hd.y) + R(0.075) + press * R(0.006), R(0.046), 900, '#ffffff', INK, 4);
  }
  // ── 큰 순간 띠 (한 번에 하나, 벽 쪽에) ──
  if (s.big && t - s.big.t < 62 && s.phase !== 'end') {
    const age = t - s.big.t, pop = age < 7 ? 1.4 - 0.4 * (age / 7) : 1 + 0.03 * Math.sin(age * 0.5), a = Math.min(1, (62 - age) / 14);
    ctx.save();
    ctx.globalAlpha = a;
    // 생쥐가 위쪽(벽 가까이)에 있으면 띠는 아래로 — 지금 벌어진 일을 가리지 않게
    ctx.translate(w / 2, Y(s.big.y < 0.8 ? 1.12 : 0.235));
    ctx.rotate(-0.04);
    ctx.scale(1, 0.5);
    burstPath(ctx, 0, 0, R(0.34) * Math.min(1.15, pop), 18, 0.8, age * 0.02);
    ctx.fillStyle = 'rgba(255,244,170,.93)';
    ctx.fill();
    ctx.strokeStyle = '#ff8a3d';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.scale(1, 2);
    font(0.056, 900);
    ctx.save();
    ctx.scale(pop, pop);
    text(s.big.text, 0, s.big.star ? -R(0.02) : 0, '#ff5a2e', '#ffffff', 6);
    ctx.restore();
    if (s.big.star) {
      font(0.038, 900);
      const sw = ctx.measureText('별 셋째!').width, k = R(0.022);
      text('별 셋째!', k * 0.9, R(0.038), '#b06a00', '#ffffff', 4);
      starPath(ctx, -sw / 2 - k * 0.4, R(0.036), k);
      ink(ctx, '#ffc93c', 2, '#a06a12');
    }
    ctx.restore();
  }
  if (s.phase === 'result') drawResult(ctx, s, w, sc2);
  else if (s.phase === 'pick') drawPick(ctx, s, w);
  else if (s.phase === 'end') {
    const a = Math.min(1, s.pt / 14);
    ctx.globalAlpha = a;
    rr(ctx, X(0.08), Y(0.36), R(0.84), R(0.56), R(0.04));
    ink(ctx, '#fffaf0', 2.5, INK);
    ctx.save();
    ctx.translate(w / 2, Y(0.56));
    stamp(ctx, mouseSpr(s.won ? MCHEER : MFLAT, tierOf(s.lv), R(0.07) * sc2), F_MOUSE, R(0.07));
    ctx.restore();
    if (s.won) drawBundle(ctx, w / 2, Y(0.56), R(0.07), 9, 1, t);
    font(0.052, 900);
    text(s.won ? '치즈를 몽땅 훔쳤다!' : '찍… 하트가 없어요', w / 2, Y(0.645), '#d9480f');
    font(0.04, 800);
    text(`${s.won ? STAGES.length : s.stage + 1}판 · 별 ${s.stars}/${STAGES.length * 3} · 치즈 ${s.total}조각`, w / 2, Y(0.715), INK);
    font(0.06, 900);
    text(`${fmt(s.pts + s.sp)}점`, w / 2, Y(0.8), INK);
    font(0.035, 700);
    text(s.won ? `쥐구멍 마을 완성 — 생쥐 Lv${s.lv}!` : '다시 하면 더 멀리 갈 수 있어요', w / 2, Y(0.87), MUTED);
    ctx.globalAlpha = 1;
  }
  void fx;
}
/** 판 결과: 별 · 점수 · 생쥐 레벨 · 쥐구멍 마을 · 도감 — 카드 바탕은 한 번 구워 두고, 별·새 집·'톡'만 움직인다 */
function drawResult(main: C2, s: MouseState, w: number, sc2: number) {
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t, d = STAGES[s.stage], fx = juice(s), scD = devScale(main);
  let ctx: C2 = main;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  const text = (str: string, x: number, y: number, fill: string, stroke = '', lw = 0) => {
    if (lw > 0) (ctx.lineWidth = lw), (ctx.strokeStyle = stroke), ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  };
  const INK = '#4a2c1d', MUTED = '#a08a70';
  const pt = s.pt, a = Math.min(1, pt / 10), slide = (1 - a) * R(0.06);
  const base = Y(0.13), top = base - R(0.03), chh = R(0.69), cw = R(0.88), hh = chh + R(0.03) + 8;
  const key = `${s.stage}|${s.got}|${s.town}|${s.dexC.join()}|${s.dexQ.join()}|${s.lv}|${s.gain}|${s.won}`;
  const card = bar('result', w, hh, scD, key, (g) => {
    ctx = g;
    ctx.translate(0, -top);
    const cx0 = X(0.06), cy0 = base;
    rr(ctx, cx0, cy0 + 4, cw, chh, R(0.04));
    ctx.fillStyle = 'rgba(74,44,29,.25)';
    ctx.fill();
    rr(ctx, cx0, cy0, cw, chh, R(0.04));
    ink(ctx, '#fffaf0', 2.5, INK);
    rr(ctx, X(0.2), cy0 - R(0.012), R(0.6), R(0.07), R(0.02));
    ink(ctx, '#ffb800', 2.5, INK);
    ctx.textAlign = 'center';
    font(0.046, 900);
    text(s.won ? '모든 판을 깼다!' : `${s.stage + 1}판 깼다!`, w / 2, cy0 + R(0.025), '#ffffff', INK, 3);
    for (let i = 0; i < 3; i++) {
      const sx0 = X(0.23 + i * 0.27), sy0 = cy0 + R(0.125);
      starPath(ctx, sx0, sy0, R(0.052));
      ink(ctx, '#eadfc8', 2, '#cdbd9c');
      font(0.031, 800);
      text(STAR_WORDS(s)[i], sx0, sy0 + R(0.078), s.starOk[i] ? INK : '#b8a688');
    }
    rr(ctx, X(0.12), cy0 + R(0.243), R(0.76), R(0.058), R(0.02));
    ctx.fillStyle = '#fff0cc';
    ctx.fill();
    font(0.044, 900);
    text(`+${fmt(s.gain)}점`, X(0.34), cy0 + R(0.273), '#d9480f');
    font(0.032, 800);
    text(`별 ${s.got}개 = 판 점수 ×${STAR_MUL[s.got]}`, X(0.66), cy0 + R(0.274), INK);
    ctx.save();
    ctx.translate(X(0.14), cy0 + R(0.37));
    stamp(ctx, mouseSpr(MCHEER, tierOf(s.lv), R(U_MOUSE) * sc2 * 1.1), F_MOUSE, R(0.026));
    ctx.restore();
    ctx.textAlign = 'left';
    font(0.036, 900);
    text(`생쥐 Lv${s.lv - 1} → Lv${s.lv}`, X(0.19), cy0 + R(0.345), '#7a5cff');
    const lw0 = ctx.measureText(`생쥐 Lv${s.lv - 1} → Lv${s.lv}`).width;
    font(0.031, 700);
    text(LV_GIFT[s.lv] ?? '조금 더 빨라져요', X(0.19) + lw0 + R(0.02), cy0 + R(0.347), LV_GIFT[s.lv] ? '#d9480f' : INK);
    font(0.031, 800);
    text(`쥐구멍 마을 ${s.town}/${TOWN.length}`, X(0.1), cy0 + R(0.405), MUTED);
    ctx.textAlign = 'right';
    text(`새 집: ${TOWN[s.town - 1] ?? ''}!`, X(0.9), cy0 + R(0.405), '#d9480f');
    ctx.textAlign = 'center';
    rr(ctx, X(0.09), cy0 + R(0.425), R(0.82), R(0.085), R(0.02));
    ctx.fillStyle = '#8a5a3a';
    ctx.fill();
    ctx.fillStyle = '#6a3a1a';
    ctx.fillRect(X(0.09), cy0 + R(0.495), R(0.82), R(0.015));
    for (let i = 0; i < TOWN.length; i++) {
      if (i === s.town - 1) continue;
      drawHouse(ctx, i, X(0.125 + i * 0.0685), cy0 + R(0.5), R(0.026), i < s.town, 0);
      if (i === s.town) (font(0.03, 900), text('?', X(0.125 + i * 0.0685), cy0 + R(0.475), '#ffe36b', '#4a2c1d', 3));
    }
    font(0.03, 800);
    ctx.textAlign = 'left';
    text(`도감 — 고양이 ${s.dexC.length}/${CAT_DEX.length} · 치즈 ${s.dexQ.length}/${Q_DEX.length}`, X(0.1), cy0 + R(0.54), MUTED);
    ctx.textAlign = 'center';
    CAT_DEX.forEach((k, i) => {
      const has = s.dexC.includes(k), px = X(0.1 + i * 0.058), py = cy0 + R(0.605), u = R(0.02);
      ctx.save();
      ctx.translate(px, py);
      // 이미 구워 둔 큰 스티커를 줄여 찍는다 (결과 화면에서 새로 굽지 않게)
      if (has) stamp(ctx, k === 'king' ? kingSpr(0, R(U_KING) * sc2 * 1.1) : catSpr(k, PST, R(U_CAT) * sc2 * 1.1), k === 'king' ? F_KING : F_CAT, k === 'king' ? u * 0.75 : u);
      else (ell(ctx, 0, -u * 0.6, u * 0.8, u * 0.7), (ctx.fillStyle = '#e6d6bc'), ctx.fill(), font(0.028, 900), text('?', 0, -u * 0.6, '#b8a688'));
      ctx.restore();
    });
    Q_DEX.forEach((k, i) => {
      const has = s.dexQ.includes(k), px = X(0.705 + (i % 4) * 0.058), py = cy0 + R(0.57 + Math.floor(i / 4) * 0.05);
      ctx.save();
      ctx.translate(px, py);
      if (has) stamp(ctx, qSpr(k, R(U_Q) * sc2 * 1.1), F_PROP, R(0.019));
      else (ell(ctx, 0, -R(0.008), R(0.016), R(0.012)), (ctx.fillStyle = '#e6d6bc'), ctx.fill());
      ctx.restore();
    });
    const nx = STAGES[s.stage + 1];
    font(0.036, 900);
    if (nx) text(s.stage % 4 === 3 ? `다음 집: ${CHAPTERS[nx.ch]}` : `다음 판: ${nx.name} (NEW)`, w / 2, cy0 + chh - R(0.028), MUTED);
    ctx = main;
  });
  ctx.globalAlpha = a;
  ctx.drawImage(card, 0, top - slide, w, hh);
  const cy0 = base - slide;
  // 움직이는 것: 별 셋 (차례로 팡) · 새 집 (반짝 · 쿵) · 톡
  for (let i = 0; i < 3; i++) {
    const at = 12 + i * 12, sx0 = X(0.23 + i * 0.27), sy0 = cy0 + R(0.125), on = s.starOk[i] && pt >= at, pop = on ? 1 + Math.max(0, 1 - (pt - at) / 8) * 0.6 : 1;
    if (!on) continue;
    starPath(ctx, sx0, sy0, R(0.052) * pop);
    ink(ctx, '#ffc93c', 2, '#a06a12');
    if ((fx.memo['st' + i] ?? -1) !== s.stage) (fx.memo['st' + i] = s.stage), fx.sound('ding', 1 + i * 0.18, 0.9), fx.burst(sx0, sy0, '#ffd84a', 10, 3, 2.4);
  }
  if (s.town > 0) {
    const i = s.town - 1, bob = Math.max(0, 1 - pt / 20);
    drawHouse(ctx, i, X(0.125 + i * 0.0685), cy0 + R(0.5) - bob * R(0.05), R(0.026), true, 0.6 + 0.4 * Math.sin(t * 0.2));
  }
  if (pt >= RES_MIN) {
    rr(ctx, X(0.12), cy0 + chh - R(0.055), R(0.76), R(0.052), R(0.02));
    ctx.fillStyle = '#fffaf0';
    ctx.fill();
    gtext(ctx, s.won ? '톡!' : s.stage % 4 === 3 && d.ch < PERKS.length ? '톡 하면 장 끝 선물!' : '톡 하면 다음 판', w / 2, cy0 + chh - R(0.028), R(0.036), 900, (t >> 3) % 2 ? '#d9480f' : '#ff8a3d', '', 0);
  }
  ctx.globalAlpha = 1;
}
function drawPick(ctx: C2, s: MouseState, w: number) {
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t, d = STAGES[s.stage];
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  const text = (str: string, x: number, y: number, fill: string) => ((ctx.fillStyle = fill), ctx.fillText(str, x, y));
  const INK = '#4a2c1d';
  const pt = s.pt, picked = s.picked, opts = PERKS[d.ch];
  ctx.fillStyle = 'rgba(255,246,220,.72)';
  ctx.fillRect(0, Y(0.1), w, Y(1.205));
  rr(ctx, X(0.08), Y(0.135), R(0.84), R(0.105), R(0.03));
  ink(ctx, 'rgba(255,250,235,.97)', 2, INK);
  ctx.textAlign = 'center';
  font(0.042, 900);
  text(`${CHAPTERS[d.ch]} 끝! 선물 하나`, w / 2, Y(0.168), '#d9480f');
  font(0.034, 800);
  text(picked < 0 ? '바닥의 큰 물건 둘 중 하나를 톡!' : `${opts[picked].name}: ${opts[picked].line}`, w / 2, Y(0.212), INK);
  opts.forEach((o, i) => {
    const px = X(i ? 0.72 : 0.28), drop = picked < 0 ? Math.max(0, 1 - pt / 16) : 0, py = Y(0.9) - drop * drop * R(0.5);
    const chosen = picked === i, other = picked >= 0 && !chosen, k = R(0.15) * (chosen ? 1 + 0.15 * Math.sin(Math.min(1, pt / 12) * Math.PI) : 1);
    ctx.globalAlpha = other ? Math.max(0, 1 - pt / 20) : 1;
    if (picked < 0 && pt >= PICK_MIN) {
      ell(ctx, px, Y(0.905), R(0.17 + 0.012 * Math.sin(t * 0.2)), R(0.05));
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 6]);
      ctx.lineDashOffset = -t * 0.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    drawPerk(ctx, d.ch * 2 + i, px, py, k, t);
    rr(ctx, px - R(0.2), Y(0.955), R(0.4), R(0.105), R(0.025));
    ink(ctx, chosen ? '#ffe9a0' : 'rgba(255,250,235,.97)', 2, chosen ? '#e0a020' : INK);
    font(0.04, 900);
    text(o.name, px, Y(0.99), '#d9480f');
    font(0.03, 800);
    text(o.line, px, Y(1.034), INK);
    ctx.globalAlpha = 1;
  });
}
/** 스크린샷·모음 그림용 (게임에서는 쓰지 않는다) */
export const __art = { paintCat, paintMouse, paintKing, catSpr, mouseSpr, stamp, F_CAT, F_MOUSE };
