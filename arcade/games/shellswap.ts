/**
 * 🐚 소라게 껍데기 (42라운드: 톡마다 내가 바뀐다) — 소라게 껍데기 × 연쇄 × 도감.
 * 규칙 한 줄: 톡 한 껍데기로 소라게가 쏙 이사한다 — 껍데기가 곧 내 몸이자 무기. 버린 껍데기는 가장 붐비는 무리로 휙 날아가 쾅.
 * 조작은 톡 하나: 톡한 곳에서 가장 가까운 껍데기(둘레 화면 폭 18%, 없으면 화면에서 가장 가까운 것)로 소라게가 폴짝 — 맨몸(분홍 엉덩이)으로
 *   날아가 쏙 들어간다. 이사 직후 0.5초 쉼. 같은 껍데기를 또 톡 하면 아무 일 없음. 싸움은 들어간 껍데기가 저절로 한다.
 * 껍데기마다 다른 게임: 크기·모양·걸음·공격·소리가 다 바뀐다 (14가지, 장 3개에 걸쳐 풀림)
 *   꼬마 소라(빠름·집게 콕콕 — 흩어진 몇 놈) · 찻주전자(앞으로 김 부채꼴 — 벼룩 떼) · 깡통(데굴데굴 볼링 — 줄 지어 구르는 불가사리)
 *   · 모래성(느린 대포 — 큰 도깨비) · 장난감 로켓(하늘로 슝, 나는 놈 잡고 쾅 착지 — 갈매기) · 성게(가시, 둘러싸일수록 셈 — 집게 갱)
 *   · 유리병(햇빛 레이저가 방패를 뚫음 — 방패 게) · 해골(으스스, 둘레가 도망 — 데굴 박치기로 돌진하는 바닷가재)
 *   · 전구(번쩍 기절 — 해파리는 줄줄이 펑) · 비치볼(통통 튕겨 이 놈 저 놈 — 모래 속 숨은 조개) · 대왕 고둥(뿌우 — 파도가 모래밭을 싹)
 *   · 대장이 떨어뜨린 무서운 껍데기 셋: 선장 투구(뿔로 들이받기) · 왕 닻(빙빙 휩쓸기) · 잠망경 잠수함(어뢰 줄줄이).
 *   딱 맞는 껍데기로 맞히면 세 배(딱!) — 정답은 없다: 아무 껍데기로도 싸우지만, 맞는 걸 고르면 훨씬 빨리·크게 터진다.
 * 0.5초짜리 판단: 지금 몰려오는 게 떼냐·큰 놈이냐·하늘이냐·방패냐 → 그 모습의 껍데기를 톡. 버린 껍데기는 저절로 가장 붐비는 쪽으로.
 * 껍데기는 맞으면 금이 가다 깨진다 → 맨몸 소라게는 작고 약해 도망 다닌다(맨몸으로 맞으면 하트 -1, 엉엉 울며 가장 가까운 껍데기로 쏙).
 *   1판은 하트를 잃지 않고, 처음 10초는 누구도 하트를 잃지 않는다. 첫 톡 전에는 놈들이 장난만 친다.
 * 껍데기 공급: 물결이 들고 날 때마다 새 껍데기가 밀려와 모래에 꽂힌다(늘 3~6개, 오래된 것은 쓸려 감 — 기다리지 않음).
 * 판 12개(장 3 × 4판, 장 끝은 대장): 썰물 모래밭(벼룩 떼·불가사리 굴렁쇠·모래 도깨비·대장 해적 갈매기 선장)
 *   → 바위 웅덩이(집게 갱·방패 게·바닷가재·대장 모래성 문어 왕) → 산호 보물섬(해파리·숨은 조개·큰 밀물·대장 장난감 상어 잠수함).
 *   대장은 반쯤 다치면 무서운 껍데기(투구·닻·잠망경)를 떨어뜨린다 — 그걸 차지하면 화면이 확 바뀐다.
 * 성장(저절로): 판을 깨면 소라게 레벨 +1(집게·껍데기 버티기·던지기 힘, 머리띠 → 선글라스 → 스카프 → 왕관) · 장 끝에 바닷가의 큰 물건
 *   둘 중 하나를 톡(진주 조개 / 따개비 바위 · 큰 불가사리 / 소용돌이 소라) · 도감 = 살아 본 껍데기 14가지.
 * 별(쉬운 말 셋): 모두 쫓아내기 · 하트 지키기 · 판마다 다른 솜씨(한 번에 N마리 · 껍데기 N가지로 이사 · 던진 껍데기로 한 번에 N마리 · N초 안에).
 * 점수: 한 번(이사 한 번·공격 한 번)에 n번째로 쓰러진 놈은 ⌈n²/4⌉점, 딱 맞는 껍데기면 두 배. 판 점수는 별 수로 곱해진다(×1·×2·×4).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5, TAU = Math.PI * 2;
/** 모래밭(놀이 자리): 화면 좌표(가로 폭 = 1, 세로 0~1.5). 세로는 YS배로 눌린 3/4 시점 — 거리는 늘 dist()로. 물가(SHORE) 위는 바다 */
const YS = 0.84, BX0 = 0.06, BX1 = 0.94, BY0 = 0.47, BY1 = 1.235, SHORE = 0.43;
/** 화면의 놈 상한 · 모래밭 껍데기 최대/최소 · 이사 뒤 쉼 · 들어가서 첫 공격까지 · 처음 10초 · 맨몸 무적 */
const CAP = 24, SH_MAX = 5, SH_MIN = 3, REST_T = 30, ENTRY_T = 15, SAFE_T = 600, NAKED_INV = 45;
/** 물결(껍데기 배달): 평소 간격 · 껍데기가 모자랄 때 · 한 번 들고 나는 틱 */
const SURGE_T = 200, SURGE_FAST = 90, SURGE_LEN = 84;
/** 결과 화면: 톡 받기 시작 · 저절로 넘어감 / 둘 중 하나: 톡 받기 시작 · 저절로 고름 · 고른 뒤 */
const RES_MIN = 90, RES_AUTO = 420, PICK_MIN = 40, PICK_AUTO = 900, PICK_AFTER = 64, END_T = 210;
const CLEAR_PTS = 30, STAR_MUL = [1, 1, 2, 4], WIN_PTS = 100;
/** 톡 판정 반지름(화면 폭 18%) */
const PICK_R = 0.18;
/** 던진 껍데기: 무게(0 작음 · 1 보통 · 2 큼 · 3 대장)마다 쾅 반지름과 힘 */
const THROW_R = [0.085, 0.11, 0.14, 0.2], THROW_D = [15, 22, 34, 80];

export type SK = 'conch' | 'teapot' | 'can' | 'castle' | 'rocket' | 'urchin' | 'bottle' | 'skull' | 'bulb' | 'ball' | 'horn' | 'helmet' | 'anchor' | 'sub';
type Tag = 'swarm' | 'roll' | 'big' | 'fly' | 'gang' | 'shield' | 'charge' | 'jelly' | 'hide';
interface SDef {
  name: string; verb: string; line: string; r: number; hp: number; spd: number; per: number; dmg: number;
  /** 가장 센 상황: 놈의 꼬리표 · 'few' 몇 놈 안 남았을 때 · 'many' 놈이 많을 때 */
  best: Tag | 'few' | 'many'; heavy: number; armor: number; boss?: boolean; col: string; up: string;
}
export const SD: Record<SK, SDef> = {
  conch: { name: '꼬마 소라', verb: '콕콕!', line: '작고 빨라요. 흩어진 몇 놈을 콕콕 쫓아가요', r: 0.062, hp: 42, spd: 0.0064, per: 14, dmg: 8, best: 'few', heavy: 0, armor: 1, col: '#f7b9a0', up: '흩어진 몇 놈' },
  teapot: { name: '찻주전자', verb: '치이익!', line: '앞으로 김을 칙 — 벼룩 떼를 한꺼번에', r: 0.076, hp: 56, spd: 0.0034, per: 40, dmg: 9, best: 'swarm', heavy: 1, armor: 1, col: '#7fc8f8', up: '벼룩 떼' },
  can: { name: '깡통', verb: '데굴데굴!', line: '데굴데굴 굴러 줄 선 놈들을 볼링처럼', r: 0.07, hp: 62, spd: 0.003, per: 14, dmg: 16, best: 'roll', heavy: 1, armor: 0.9, col: '#e8eef2', up: '줄 지어 구르는 놈' },
  castle: { name: '모래성', verb: '펑!', line: '느리지만 대포 — 큰 놈에게 쾅', r: 0.1, hp: 130, spd: 0.0009, per: 54, dmg: 26, best: 'big', heavy: 2, armor: 0.6, col: '#f2cf8a', up: '큰 놈' },
  rocket: { name: '장난감 로켓', verb: '슈우웅!', line: '하늘로 슝 — 나는 놈을 잡고 쾅 착지', r: 0.072, hp: 46, spd: 0.003, per: 70, dmg: 24, best: 'fly', heavy: 1, armor: 1, col: '#ff6b5b', up: '하늘의 놈' },
  urchin: { name: '성게', verb: '따끔!', line: '가시! 둘러싸일수록 세져요', r: 0.074, hp: 72, spd: 0.0034, per: 22, dmg: 5, best: 'gang', heavy: 1, armor: 0.8, col: '#8a5cc8', up: '둘러싸는 놈' },
  bottle: { name: '유리병', verb: '지이잉!', line: '햇빛을 모아 레이저 — 방패를 뚫어요', r: 0.074, hp: 36, spd: 0.0028, per: 60, dmg: 20, best: 'shield', heavy: 1, armor: 1.2, col: '#7fe0b0', up: '방패 든 놈' },
  skull: { name: '해골', verb: '으스스!', line: '무서워서 둘레가 도망 — 데굴 박치기', r: 0.076, hp: 58, spd: 0.0036, per: 44, dmg: 22, best: 'charge', heavy: 1, armor: 0.9, col: '#f4f0e6', up: '돌진하는 놈' },
  bulb: { name: '전구', verb: '번쩍!', line: '번쩍! 둘레가 기절, 해파리는 줄줄이 펑', r: 0.072, hp: 40, spd: 0.003, per: 66, dmg: 10, best: 'jelly', heavy: 1, armor: 1.15, col: '#fff27a', up: '해파리' },
  ball: { name: '비치볼', verb: '통통!', line: '통통 튕겨 이 놈 저 놈 — 숨은 조개도', r: 0.068, hp: 52, spd: 0.012, per: 10, dmg: 10, best: 'hide', heavy: 0, armor: 1, col: '#ff8fb0', up: '숨은 놈' },
  horn: { name: '대왕 고둥', verb: '뿌우우!', line: '뿌우 — 파도를 불러 모래밭을 싹', r: 0.094, hp: 96, spd: 0.0012, per: 118, dmg: 24, best: 'many', heavy: 2, armor: 0.75, col: '#f6a96b', up: '바글바글할 때' },
  helmet: { name: '선장 투구', verb: '쿵쾅!', line: '대장의 무쇠 투구 — 뿔로 들이받아요', r: 0.112, hp: 260, spd: 0.004, per: 38, dmg: 46, best: 'fly', heavy: 3, armor: 0.45, boss: true, col: '#8d99a8', up: '대장' },
  anchor: { name: '왕 닻', verb: '휘이잉!', line: '대장의 닻 — 빙빙 돌려 싹쓸이', r: 0.112, hp: 280, spd: 0.0024, per: 0, dmg: 15, best: 'big', heavy: 3, armor: 0.45, boss: true, col: '#5b6b7c', up: '대장' },
  sub: { name: '잠망경 잠수함', verb: '어뢰 발사!', line: '대장의 잠수함 — 어뢰가 줄줄이', r: 0.118, hp: 280, spd: 0.0035, per: 34, dmg: 26, best: 'big', heavy: 3, armor: 0.45, boss: true, col: '#ffcf3f', up: '대장' },
};
/** 도감 차례(살아 본 껍데기) */
export const DEX: SK[] = ['conch', 'teapot', 'can', 'castle', 'rocket', 'helmet', 'urchin', 'bottle', 'skull', 'anchor', 'bulb', 'ball', 'horn', 'sub'];

export type EK = 'flea' | 'star' | 'goblin' | 'gull' | 'gang' | 'shield' | 'lobster' | 'jelly' | 'clam' | 'captain' | 'octo' | 'shark';
interface EDef { name: string; tag: Tag; r: number; hp: number; spd: number; dmg: number; rest: number; boss?: boolean; fly?: boolean }
export const ED: Record<EK, EDef> = {
  flea: { name: '모래 벼룩', tag: 'swarm', r: 0.025, hp: 12, spd: 0.0042, dmg: 3, rest: 48 },
  star: { name: '불가사리 굴렁쇠', tag: 'roll', r: 0.035, hp: 24, spd: 0.0082, dmg: 7, rest: 40 },
  goblin: { name: '모래 도깨비', tag: 'big', r: 0.074, hp: 170, spd: 0.0015, dmg: 16, rest: 80 },
  gull: { name: '갈매기', tag: 'fly', r: 0.042, hp: 28, spd: 0.0045, dmg: 7, rest: 170, fly: true },
  gang: { name: '집게 갱', tag: 'gang', r: 0.037, hp: 40, spd: 0.0034, dmg: 5, rest: 54 },
  shield: { name: '방패 게', tag: 'shield', r: 0.047, hp: 60, spd: 0.0022, dmg: 8, rest: 70 },
  lobster: { name: '바닷가재', tag: 'charge', r: 0.056, hp: 80, spd: 0.0018, dmg: 20, rest: 70 },
  jelly: { name: '해파리', tag: 'jelly', r: 0.041, hp: 30, spd: 0.0014, dmg: 4, rest: 44 },
  clam: { name: '숨은 조개', tag: 'hide', r: 0.037, hp: 36, spd: 0, dmg: 7, rest: 200 },
  captain: { name: '해적 갈매기 선장', tag: 'fly', r: 0.1, hp: 1000, spd: 0.0022, dmg: 9, rest: 150, boss: true, fly: true },
  octo: { name: '모래성 문어 왕', tag: 'big', r: 0.12, hp: 1400, spd: 0, dmg: 13, rest: 125, boss: true },
  shark: { name: '장난감 상어 잠수함', tag: 'big', r: 0.12, hp: 1700, spd: 0.0022, dmg: 10, rest: 105, boss: true },
};

/** 놈들이 들어오는 곳: 1 바다 · 2 왼쪽 덤불 · 3 오른쪽 덤불 · 4 아래 덤불 · 5 섞어서 */
type From = 1 | 2 | 3 | 4 | 5;
interface Grp { need: number; wait: number; from: From; mons: [EK, number][] }
type StarK = 'multi' | 'throw' | 'fast';
interface StageDef {
  key: SK; ch: number; name: string; news: string; foe: EK | null; start: SK;
  /** 물결이 가져올 껍데기 무게 */
  supply: [SK, number][]; star: { k: StarK; n: number }; groups: Grp[]; boss?: EK; bossShell?: SK;
}
export const CHAPTERS = ['썰물 모래밭', '바위 웅덩이', '산호 보물섬'];
const G = (need: number, wait: number, from: From, ...mons: [EK, number][]): Grp => ({ need, wait, from, mons });
/**
 * 판 12개. 첫 떼는 이미 물에서 올라와 있고, 다음 떼는 모래밭이 비는 대로(또는 시간이 되면) 쉴 틈 없이 바다·덤불에서 몰려온다.
 * 사람 기준 한 판 30~45초. 판마다 새 껍데기 하나 + 그 껍데기가 빛날 놈 하나.
 */
export const STAGES: StageDef[] = [
  { key: 'teapot', ch: 0, name: '찻주전자', news: '앞으로 김을 칙 — 벼룩 떼가 한꺼번에', foe: 'flea', start: 'conch', supply: [['teapot', 3], ['conch', 2]], star: { k: 'multi', n: 7 },
    groups: [G(0, 0, 1, ['flea', 12]), G(4, 420, 1, ['flea', 12]), G(4, 460, 2, ['flea', 10]), G(4, 460, 3, ['flea', 11]), G(3, 460, 1, ['flea', 12])] },
  { key: 'can', ch: 0, name: '깡통', news: '데굴데굴 굴러 줄 선 놈들을 볼링처럼', foe: 'star', start: 'teapot', supply: [['can', 3], ['teapot', 2], ['conch', 1]], star: { k: 'multi', n: 5 },
    groups: [G(0, 0, 1, ['flea', 8]), G(5, 300, 2, ['star', 5]), G(5, 420, 1, ['flea', 9], ['star', 4]), G(5, 420, 3, ['star', 6]), G(5, 420, 5, ['flea', 8], ['star', 5]), G(4, 420, 2, ['star', 6])] },
  { key: 'castle', ch: 0, name: '모래성', news: '느리지만 대포 — 큰 도깨비에게 쾅', foe: 'goblin', start: 'can', supply: [['castle', 3], ['teapot', 2], ['can', 2], ['conch', 1]], star: { k: 'fast', n: 45 },
    groups: [G(0, 0, 1, ['goblin', 1], ['flea', 8]), G(5, 360, 4, ['goblin', 2], ['flea', 6]), G(5, 420, 2, ['star', 5], ['flea', 6]), G(5, 420, 1, ['goblin', 2], ['flea', 8]), G(4, 420, 3, ['goblin', 1], ['star', 4], ['flea', 6])] },
  { key: 'rocket', ch: 0, name: '해적 갈매기 선장', news: '대장! 로켓으로 하늘을 — 투구가 떨어지면 차지해요', foe: 'gull', start: 'castle', supply: [['rocket', 4], ['teapot', 1], ['can', 1], ['castle', 1]], star: { k: 'fast', n: 60 },
    boss: 'captain', bossShell: 'helmet', groups: [G(0, 0, 1, ['captain', 1], ['gull', 3], ['flea', 6])] },
  { key: 'urchin', ch: 1, name: '성게', news: '가시! 둘러싸일수록 세져요', foe: 'gang', start: 'conch', supply: [['urchin', 3], ['teapot', 1], ['can', 1], ['castle', 1], ['rocket', 1]], star: { k: 'multi', n: 5 },
    groups: [G(0, 0, 5, ['gang', 6]), G(4, 360, 2, ['gang', 6], ['flea', 6]), G(4, 420, 3, ['gang', 6], ['gull', 2]), G(4, 420, 5, ['gang', 7], ['goblin', 1]), G(4, 420, 1, ['gang', 6], ['star', 4])] },
  { key: 'bottle', ch: 1, name: '유리병', news: '햇빛 레이저가 방패를 뚫어요', foe: 'shield', start: 'urchin', supply: [['bottle', 3], ['urchin', 2], ['teapot', 1], ['castle', 1], ['can', 1]], star: { k: 'throw', n: 4 },
    groups: [G(0, 0, 1, ['shield', 3], ['flea', 6]), G(4, 360, 2, ['shield', 3], ['gang', 4]), G(4, 420, 1, ['shield', 3], ['flea', 8]), G(4, 420, 3, ['shield', 4], ['gull', 2]), G(4, 420, 5, ['shield', 3], ['gang', 5])] },
  { key: 'skull', ch: 1, name: '해골', news: '으스스 — 돌진하던 바닷가재가 도망쳐요', foe: 'lobster', start: 'bottle', supply: [['skull', 3], ['urchin', 1], ['bottle', 1], ['teapot', 1], ['castle', 1], ['rocket', 1]], star: { k: 'fast', n: 45 },
    groups: [G(0, 0, 1, ['lobster', 2], ['flea', 8]), G(4, 360, 2, ['lobster', 2], ['gang', 4]), G(4, 420, 3, ['lobster', 2], ['shield', 2], ['flea', 6]), G(4, 420, 1, ['lobster', 3], ['gull', 2]), G(4, 420, 5, ['lobster', 2], ['goblin', 1], ['gang', 4])] },
  { key: 'anchor', ch: 1, name: '모래성 문어 왕', news: '대장! 반쯤 다치면 왕 닻을 떨어뜨려요', foe: null, start: 'skull', supply: [['urchin', 2], ['bottle', 2], ['skull', 2], ['castle', 2], ['teapot', 1]], star: { k: 'fast', n: 60 },
    boss: 'octo', bossShell: 'anchor', groups: [G(0, 0, 1, ['octo', 1], ['gang', 4], ['shield', 2])] },
  { key: 'bulb', ch: 2, name: '전구', news: '번쩍! 기절 — 해파리는 줄줄이 펑', foe: 'jelly', start: 'conch', supply: [['bulb', 3], ['teapot', 1], ['urchin', 1], ['bottle', 1], ['skull', 1], ['rocket', 1]], star: { k: 'multi', n: 6 },
    groups: [G(0, 0, 1, ['jelly', 7]), G(4, 360, 1, ['jelly', 6], ['gang', 4]), G(4, 420, 5, ['jelly', 6], ['gull', 3]), G(4, 420, 1, ['jelly', 7], ['shield', 2]), G(4, 420, 2, ['jelly', 6], ['lobster', 2])] },
  { key: 'ball', ch: 2, name: '비치볼', news: '통통 튕겨 숨은 조개까지', foe: 'clam', start: 'bulb', supply: [['ball', 3], ['bulb', 1], ['castle', 1], ['can', 1], ['skull', 1], ['urchin', 1]], star: { k: 'throw', n: 4 },
    groups: [G(0, 0, 5, ['clam', 6], ['flea', 6]), G(4, 360, 5, ['clam', 5], ['jelly', 4]), G(4, 420, 2, ['clam', 4], ['star', 5]), G(4, 420, 5, ['clam', 5], ['goblin', 1], ['flea', 6]), G(4, 420, 3, ['clam', 5], ['lobster', 2])] },
  { key: 'horn', ch: 2, name: '대왕 고둥', news: '뿌우 — 큰 밀물이 모래밭을 싹', foe: null, start: 'ball', supply: [['horn', 3], ['teapot', 1], ['urchin', 1], ['bulb', 1], ['ball', 1], ['castle', 1], ['rocket', 1]], star: { k: 'multi', n: 9 },
    groups: [G(0, 0, 5, ['flea', 8], ['gang', 5], ['jelly', 4]), G(6, 360, 5, ['flea', 8], ['star', 5], ['shield', 2]), G(6, 420, 5, ['gang', 6], ['jelly', 5], ['gull', 3]), G(6, 420, 5, ['flea', 10], ['lobster', 2], ['clam', 4]), G(5, 420, 5, ['goblin', 2], ['flea', 8], ['gang', 5])] },
  { key: 'sub', ch: 2, name: '장난감 상어 잠수함', news: '마지막 대장! 잠망경을 떨어뜨리면 차지해요', foe: null, start: 'horn', supply: [['horn', 2], ['bulb', 2], ['ball', 1], ['rocket', 1], ['bottle', 1], ['skull', 1], ['castle', 1]], star: { k: 'fast', n: 65 },
    boss: 'shark', bossShell: 'sub', groups: [G(0, 0, 1, ['shark', 1], ['jelly', 4], ['clam', 3])] },
];
export const STAGE_COUNT = STAGES.length;
/** 대장의 졸개 부르기 */
const SUMMON: Partial<Record<EK, [EK, number][][]>> = {
  captain: [[['gull', 3]], [['flea', 7]], [['gull', 2], ['flea', 4]]],
  octo: [[['gang', 5]], [['shield', 2], ['flea', 5]], [['lobster', 1], ['gang', 3]]],
  shark: [[['jelly', 5]], [['clam', 3], ['flea', 5]], [['jelly', 3], ['gull', 2]]],
};
/** 장 끝 둘 중 하나(바닷가의 큰 물건) */
export const PERKS: { name: string; line: string }[][] = [
  [{ name: '진주 조개', line: '이사할 때마다 진주 폭죽' }, { name: '따개비 바위', line: '껍데기가 두 배 버텨요' }],
  [{ name: '큰 불가사리', line: '던진 껍데기가 한 번 더 튕겨 쾅' }, { name: '소용돌이 소라', line: '이사하면 둘레 놈들이 빙글 끌려와요' }],
];
/** 배우는 판은 너그럽게: 놈이 주는 피해 배수 */
const EZ = [0.35, 0.55, 0.75, 0.85, 0.95, 1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3];

// ───────────────────────────── 상태 ─────────────────────────────
/** 놈 상태: 들어오는 중 · 어슬렁/쫓기 · 뜸 들이기 · 돌진 · 쉼 · 내리꽂기 · 날아오르기 */
const ENTER = 0, IDLE = 1, WIND = 2, DASH = 3, REST = 4, SWOOP = 5, RISE = 6;
interface Foe {
  id: number; k: EK; x: number; y: number; r: number; hp: number; max: number;
  st: number; tm: number; cool: number; ang: number; ax: number; ay: number; et: number; fx0: number; fy0: number;
  vx: number; vy: number; alt: number; stun: number; scared: number; open: number; slot: number; cd: number; rid: number;
  dead: boolean; seed: number; born: number; hurtT: number; face: number; atkT: number; walkT: number; dropped: boolean;
}
interface Shell { id: number; k: SK; x: number; y: number; hp: number; max: number; born: number; tilt: number; sx: number; sy: number; inT: number; boss: boolean }
interface Leap { x0: number; y0: number; x1: number; y1: number; t: number; T: number; sh: Shell }
interface Crab {
  x: number; y: number; k: SK | null; hp: number; max: number; boss: boolean; face: number;
  /** 공격 모드(껍데기마다 뜻이 다르다) · 모드 틱 · 다음 공격까지 · 겨눈 각 · 겨눈 곳 · 높이(로켓) */
  mode: number; mt: number; atk: number; ang: number; tx: number; ty: number; alt: number; vx: number; vy: number;
  inv: number; cry: number; walkT: number; atkT: number; hurtT: number; landT: number; entry: boolean; aid: number; hits: number[]; spin: number; chain: number;
  leap: Leap | null; nakedT: number;
}
interface Toss { k: SK; x0: number; y0: number; x1: number; y1: number; t: number; T: number; aid: number; dmg: number; r: number; boss: boolean; bounce: number; hp: number; max: number; land: boolean; spin: number }
/** 날아가는 것: 대포알 · 진주 · 폭탄 상자 · 놈 어뢰 · 내 어뢰 · 조개 침 */
interface Proj { k: 'cannon' | 'bomb' | 'torp' | 'mytorp' | 'spit'; x: number; y: number; x0: number; y0: number; x1: number; y1: number; t: number; T: number; dmg: number; r: number; aid: number; tgt: number }
/** 바닥에 미리 보이는 위험: 폭탄 · 문어 다리 */
interface Mark { k: 'bomb' | 'slam'; x: number; y: number; r: number; t: number; T: number; dmg: number }
interface Tide { y: number; t: number; aid: number; hit: number[] }
interface Surge { t: number; depth: number; drop: number; x: number }
interface Act { id: number; n: number; t: number; swap: boolean; thrown: number }
interface Ev { t: number; k: string; x: number; y: number; n: number; x2: number; y2: number; text: string }
interface Line { k: number; x0: number; y0: number; x1: number; y1: number; t: number }
/** 사라진 놈 (연출): 0 쓰러짐 · 1 해파리 펑 · 2 대장 */
interface Corpse { k: EK; x: number; y: number; t: number; how: number; vx: number; vy: number; seed: number }
/** 깨진 껍데기 조각 (연출) */
interface Shard { k: SK; x: number; y: number; t: number; seed: number; big: boolean }

export interface ShellState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result' | 'pick' | 'end'; pt: number;
  hearts: number; pts: number; sp: number; stars: number; got: number; starOk: boolean[]; dead: boolean; won: boolean;
  /** 소라게 레벨 · 장 끝에 고른 것(0 아직 · 1 왼쪽 · 2 오른쪽) · 방금 고른 것 · 도감 · 이번 판에 새로 살아 본 껍데기 */
  lv: number; perk: number[]; picked: number; dex: SK[]; newDex: SK[];
  crab: Crab; shells: Shell[]; foes: Foe[]; nid: number; aid: number;
  toss: Toss[]; proj: Proj[]; marks: Mark[]; lines: Line[]; tide: Tide | null; surge: Surge | null; surgeT: number;
  grp: number; grpT: number; inbox: { k: EK; from: From }[]; gateT: number; clearT: number; stageT: number; summonT: number; sumI: number;
  /** 이번 판: 한 번에 가장 많이 · 던진 껍데기로 한 번에 가장 많이 · 살아 본 껍데기 종류 · 하트를 잃었나 · 이사 수 */
  best: number; bestThrow: number; kinds: SK[]; lost: boolean; swaps: number; kills: number; gain: number;
  bossDrop: boolean; bossRode: boolean; bossDown: boolean; star3T: number;
  acts: Act[]; events: Ev[]; corpses: Corpse[]; shards: Shard[];
  freeze: number; down: boolean; restT: number; wowN: number; firstTap: number; firstBig: number; seen: Set<string>;
  banner: { head: string; sub: string; t: number } | null; spot: { id: number; t: number; label: string } | null;
  big: { text: string; t: number; n: number; star: boolean; k: SK | null } | null;
}

/** 빗변: Math.hypot은 엔진마다 끝자리가 다를 수 있어 제곱근으로 직접 */
const hyp = (a: number, b: number) => Math.sqrt(a * a + b * b);
const dist = (ax: number, ay: number, bx: number, by: number) => hyp(ax - bx, (ay - by) / YS);
const angTo = (ax: number, ay: number, bx: number, by: number) => Math.atan2((by - ay) / YS, bx - ax);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ev = (s: ShellState, k: string, x: number, y: number, n = 0, x2 = 0, y2 = 0, text = '') => s.events.push({ t: s.t, k, x, y, n, x2, y2, text });
const see = (s: ShellState, key: string) => void s.seen.add(key);
/** 맞힐 수 있는 놈(들어오는 중이 아닌) · 땅의 놈(하늘 높이 있지 않은) */
const live = (f: Foe) => !f.dead && f.st !== ENTER;
const low = (f: Foe) => live(f) && f.alt < 0.045;
const alive = (s: ShellState) => s.foes.reduce((a, f) => a + (f.dead ? 0 : 1), 0);
/** 레벨이 주는 힘: 공격 · 버티기 · 던지기 */
const lvAtk = (s: ShellState) => 1 + 0.06 * (s.lv - 1);
const lvHp = (s: ShellState) => (1 + 0.05 * (s.lv - 1)) * (s.perk[0] === 2 ? 2 : 1);
const lvThrow = (s: ShellState) => 1 + 0.08 * (s.lv - 1);
const crabR = (c: Crab) => (c.k ? SD[c.k].r : 0.045);
/** 딱 맞는 껍데기인가: 꼬리표가 같으면 세 배 · 고둥은 놈이 많을 때 1.6배 · 꼬마 소라는 몇 놈 안 남았을 때 두 배 */
function matchMul(s: ShellState, k: SK, f: Foe) {
  const b = SD[k].best;
  if (b === ED[f.k].tag) return ED[f.k].boss ? 2 : 3;
  if (b === 'many') return alive(s) >= 8 ? 1.6 : 1;
  if (b === 'few') return alive(s) <= 5 && !s.inbox.length ? 2 : 1;
  return 1;
}

function wow(s: ShellState, text: string, n = 0, k: SK | null = null, star = false) {
  s.wowN++;
  if (s.firstBig < 0 && s.firstTap >= 0) s.firstBig = s.t;
  s.big = { text, t: s.t, n, star, k };
  s.freeze = Math.max(s.freeze, 5);
  see(s, 'wow');
}
function keepIn(o: { x: number; y: number }, r: number) {
  const x = clamp(o.x, BX0 + r * 0.5, BX1 - r * 0.5), y = clamp(o.y, BY0, BY1);
  const hit = x !== o.x || y !== o.y;
  o.x = x;
  o.y = y;
  return hit;
}
function act(s: ShellState, id: number): Act {
  for (let i = s.acts.length - 1; i >= 0; i--) if (s.acts[i].id === id) return s.acts[i];
  const a = { id, n: 0, t: s.t, swap: false, thrown: 0 };
  s.acts.push(a);
  if (s.acts.length > 24) s.acts.shift();
  return a;
}

// ───────────────────────────── 놈들 ─────────────────────────────
/** 들어오는 곳에서 모래밭 자리로: 바다는 물에서 올라오고, 덤불은 옆·아래에서 뛰어든다 */
function spotFor(s: ShellState, from: From): [number, number, number, number] {
  const c = s.crab, r = s.rng;
  for (let k = 0; ; k++) {
    let x: number, y: number, ox: number, oy: number;
    if (from === 1) (x = 0.12 + r() * 0.76), (y = BY0 + 0.02 + r() * 0.2), (ox = x + (r() - 0.5) * 0.1), (oy = SHORE - 0.03);
    else if (from === 2) (x = BX0 + 0.04 + r() * 0.22), (y = 0.62 + r() * 0.55), (ox = -0.06), (oy = y + (r() - 0.5) * 0.1);
    else if (from === 3) (x = BX1 - 0.04 - r() * 0.22), (y = 0.62 + r() * 0.55), (ox = 1.06), (oy = y + (r() - 0.5) * 0.1);
    else (x = 0.14 + r() * 0.72), (y = 1.0 + r() * 0.2), (ox = x + (r() - 0.5) * 0.12), (oy = 1.33);
    if (dist(x, y, c.x, c.y) > 0.2 || k > 6) return [x, y, ox, oy];
  }
}
function addFoe(s: ShellState, k: EK, x: number, y: number, from: number, ox = x, oy = y): Foe {
  const d = ED[k], hp = Math.round(d.hp * (d.boss ? 1 : 1 + 0.05 * s.stage));
  const f: Foe = {
    id: ++s.nid, k, x, y, r: d.r, hp, max: hp, st: from ? ENTER : IDLE, tm: 0, cool: 40 + Math.floor(s.rng() * 70), ang: 0, ax: x, ay: y, et: 1, fx0: x, fy0: y,
    vx: 0, vy: 0, alt: d.fly ? 0.15 + s.rng() * 0.04 : 0, stun: 0, scared: 0, open: -Math.floor(s.rng() * 120), slot: s.nid * 2.4, cd: 0, rid: 0,
    dead: false, seed: Math.floor(s.rng() * 1e6), born: s.t, hurtT: -99, face: x < 0.5 ? 1 : -1, atkT: -99, walkT: -99, dropped: false,
  };
  if (from) {
    f.fx0 = ox;
    f.fy0 = oy;
    f.x = ox;
    f.y = oy;
    f.et = f.tm = k === 'clam' ? 26 : 14 + Math.round(dist(ox, oy, x, y) * 42);
  }
  if (d.boss) f.cool = 150;
  if (!s.seen.has('k:' + k)) see(s, 'k:' + k);
  s.foes.push(f);
  return f;
}
/** 불가사리 굴렁쇠: 줄을 지어 옆에서 굴러 들어온다 */
function convoy(s: ShellState, n: number, from: From) {
  const side = from === 2 ? -1 : from === 3 ? 1 : s.rng() < 0.5 ? -1 : 1, c = s.crab;
  const y0 = clamp(c.y + (s.rng() - 0.5) * 0.35, 0.6, 1.15), a = side < 0 ? (s.rng() - 0.5) * 0.5 : Math.PI + (s.rng() - 0.5) * 0.5;
  const ca = Math.cos(a), sa = Math.sin(a), v = ED.star.spd;
  for (let i = 0; i < n; i++) {
    const x = (side < 0 ? -0.05 : 1.05) - ca * i * 0.075, y = y0 - sa * i * 0.075 * YS;
    const f = addFoe(s, 'star', x, y, 0);
    f.st = ENTER;
    f.tm = -1;
    f.vx = ca * v;
    f.vy = sa * v * YS;
  }
  ev(s, 'convoy', side < 0 ? 0.04 : 0.96, y0, n);
}
/** 첫 떼: 막 물에서 올라와 모래밭 위쪽에 모인다 (조개는 모래 속에서 쏙) */
function placeFirst(s: ShellState, g: Grp) {
  const c = s.crab, cx0 = s.stage === 0 ? 0.5 : 0.3 + s.rng() * 0.4, cy0 = BY0 + 0.12;
  for (const [k, n] of g.mons)
    for (let j = 0; j < n; j++) {
      const d = ED[k];
      if (d.boss) {
        const bx = 0.5, by = k === 'octo' ? BY0 + 0.02 : k === 'shark' ? BY0 + 0.04 : 0.62;
        addFoe(s, k, bx, by, 1, bx, SHORE - 0.04);
        continue;
      }
      if (k === 'star') {
        convoy(s, n, g.from);
        break;
      }
      if (k === 'clam') {
        const [x, y] = freeSpot(s, 0.12, 0.17);
        addFoe(s, k, x, y, 1, x, y);
        continue;
      }
      if (g.from === 1 || g.from === 5) {
        const a = s.rng() * TAU, q = Math.sqrt(s.rng()) * (k === 'flea' ? 0.1 : 0.17);
        const x = clamp(cx0 + Math.cos(a) * q, 0.1, 0.9), y = clamp(cy0 + Math.sin(a) * q * YS, BY0 + 0.01, 0.8);
        const f = addFoe(s, k, x, y, 1, x + (s.rng() - 0.5) * 0.08, SHORE - 0.03);
        f.et = f.tm = 10 + Math.floor(s.rng() * 40);
      } else {
        const [x, y, ox, oy] = spotFor(s, g.from);
        addFoe(s, k, x, y, 1, ox, oy);
      }
      void c;
    }
}
function enqueue(s: ShellState, mons: [EK, number][], from: From) {
  // 큰 놈이 작은 놈 사이사이에 섞이게
  const bigs: EK[] = [], smalls: EK[] = [];
  for (const [k, n] of mons) for (let j = 0; j < n; j++) (ED[k].r > 0.045 || k === 'star' ? bigs : smalls).push(k);
  const every = bigs.length ? Math.max(1, Math.floor(smalls.length / bigs.length)) : 0;
  let bi = 0;
  smalls.forEach((k, i) => {
    if (every && i % every === 0 && bi < bigs.length) s.inbox.push({ k: bigs[bi++], from: from === 5 ? (1 + Math.floor(s.rng() * 4)) as From : from });
    s.inbox.push({ k, from: from === 5 ? (1 + Math.floor(s.rng() * 4)) as From : from });
  });
  while (bi < bigs.length) s.inbox.push({ k: bigs[bi++], from: from === 5 ? (1 + Math.floor(s.rng() * 4)) as From : from });
}
function spawnGroup(s: ShellState) {
  const g = STAGES[s.stage].groups[s.grp];
  if (s.grp === 0) placeFirst(s, g);
  else enqueue(s, g.mons, g.from), ev(s, 'group', 0.5, SHORE, s.grp, g.from);
  s.grp++;
  s.grpT = 0;
}
/** 줄 선 떼에서 한 마리(불가사리는 줄째로) 들여보낸다 */
function admit(s: ShellState) {
  const q = s.inbox.shift()!;
  if (q.k === 'star') {
    let n = 1;
    while (n < 6 && s.inbox.length && s.inbox[0].k === 'star') s.inbox.shift(), n++;
    return convoy(s, n, q.from);
  }
  if (q.k === 'clam') {
    const [x, y] = freeSpot(s, 0.12, 0.17);
    return void addFoe(s, 'clam', x, y, 1, x, y);
  }
  const [x, y, ox, oy] = spotFor(s, q.from === 5 ? 1 : q.from);
  addFoe(s, q.k, x, y, 1, ox, oy);
  if (ED[q.k].fly) ev(s, 'gullin', ox, oy);
}

// ───────────────────────────── 껍데기 공급(물결) ─────────────────────────────
/** 모래밭의 한적한 자리 (몇 번 뽑아 가장 넓은 곳) */
function freeSpot(s: ShellState, gap: number, crabGap: number, yMax = BY1 - 0.04): [number, number] {
  const c = s.crab;
  let bx = 0.5, by = 0.8, bd = -9;
  for (let k = 0; k < 14; k++) {
    const x = 0.11 + s.rng() * 0.78, y = BY0 + 0.04 + s.rng() * (yMax - BY0 - 0.04);
    let near = dist(x, y, c.x, c.y) - crabGap;
    for (const o of s.shells) near = Math.min(near, dist(x, y, o.x, o.y) - gap);
    for (const f of s.foes) if (!f.dead && f.alt < 0.05) near = Math.min(near, dist(x, y, f.x, f.y) - f.r - 0.03);
    if (near > bd) (bd = near), (bx = x), (by = y);
    if (near > 0.02) break;
  }
  return [bx, by];
}
function pickKind(s: ShellState): SK {
  const d = STAGES[s.stage];
  if (!SD[d.key].boss && !s.shells.some((o) => o.k === d.key)) return d.key;
  let tot = 0;
  const ok = d.supply.filter(([k]) => s.shells.filter((o) => o.k === k).length < 2);
  for (const [, w] of ok) tot += w;
  let r = s.rng() * tot;
  for (const [k, w] of ok) if ((r -= w) <= 0) return k;
  return d.supply[0][0];
}
function newShell(s: ShellState, k: SK, x: number, y: number, wash: boolean, hp = -1): Shell {
  const max = Math.round(SD[k].hp * lvHp(s));
  const sh: Shell = { id: ++s.nid, k, x, y, hp: hp < 0 ? max : Math.min(max, hp), max, born: s.t, tilt: (s.rng() - 0.5) * 0.5, sx: x, sy: wash ? SHORE + 0.005 : y, inT: wash ? 24 + Math.round((y - SHORE) * 30) : 0, boss: !!SD[k].boss };
  s.shells.push(sh);
  if (!s.seen.has('sh:' + k)) see(s, 'sh:' + k);
  return sh;
}
function surgeStep(s: ShellState) {
  if (s.surge && ++s.surge.t >= SURGE_LEN) s.surge = null;
  const n = s.shells.filter((o) => !o.boss).length;
  if (n < 2 && s.surgeT > SURGE_FAST) s.surgeT = SURGE_FAST;
  if (s.surge || --s.surgeT > 0) return;
  s.surgeT = SURGE_T;
  const depth = BY0 + 0.16 + s.rng() * 0.32, drop = n < SH_MIN ? SH_MIN - n + 1 : n < SH_MAX - 1 && s.rng() < 0.4 ? 2 : 1;
  s.surge = { t: 0, depth, drop, x: 0.2 + s.rng() * 0.6 };
  for (let i = 0; i < drop; i++) {
    // 가득하면 가장 오래된 것이 쓸려 간다
    if (s.shells.length >= SH_MAX) {
      let old: Shell | null = null;
      for (const o of s.shells) if (!o.boss && (!s.spot || s.spot.id !== o.id) && (!old || o.born < old.born)) old = o;
      if (!old) break;
      s.shells = s.shells.filter((o) => o !== old);
      ev(s, 'washout', old.x, old.y, 0, 0, 0, old.k);
    }
    const [x, y] = freeSpot(s, 0.13, 0.1, depth);
    newShell(s, pickKind(s), x, y, true);
  }
  ev(s, 'surge', 0.5, SHORE, drop);
}

// ───────────────────────────── 판 시작 ─────────────────────────────
function freshCrab(k: SK | null, hp: number): Crab {
  return {
    x: 0.5, y: 1.04, k, hp, max: hp, boss: false, face: 1, mode: 0, mt: 0, atk: 30, ang: -Math.PI / 2, tx: 0.5, ty: 0.8, alt: 0, vx: 0, vy: 0,
    inv: 0, cry: 0, walkT: -99, atkT: -99, hurtT: -99, landT: -99, entry: false, aid: 0, hits: [], spin: 0, chain: 0, leap: null, nakedT: -99,
  };
}
function newStage(s: ShellState) {
  const d = STAGES[s.stage];
  s.foes = [];
  s.toss = [];
  s.proj = [];
  s.marks = [];
  s.lines = [];
  s.tide = null;
  s.surge = null;
  s.shells = [];
  s.inbox = [];
  s.acts = [];
  const hp = Math.round(SD[d.start].hp * lvHp(s));
  s.crab = freshCrab(d.start, hp);
  if (!s.dex.includes(d.start)) s.dex.push(d.start);
  s.kinds = [d.start];
  s.grp = 0;
  s.grpT = 0;
  s.gateT = 0;
  s.clearT = 0;
  s.stageT = 0;
  s.summonT = 0;
  s.sumI = 0;
  s.surgeT = 150;
  s.best = 0;
  s.bestThrow = 0;
  s.lost = false;
  s.swaps = 0;
  s.bossDrop = false;
  s.bossRode = false;
  s.bossDown = false;
  s.star3T = -1;
  s.phase = 'play';
  s.pt = 0;
  s.starOk = [false, false, false];
  s.got = 0;
  s.newDex = [];
  s.big = null;
  s.restT = 0;
  // 처음 모래밭: 이 판의 새 껍데기는 소라게 옆 반짝이는 자리에, 나머지 둘은 한적한 곳에
  const kx = s.stage % 2 ? 0.27 : 0.73;
  let spot: Shell | null = null;
  if (!SD[d.key].boss) spot = newShell(s, d.key, kx, 0.92, false);
  const extra = d.supply.filter(([k]) => k !== d.key);
  for (let i = 0; i < (spot ? 2 : 3); i++) {
    const k = s.stage === 0 && i === 0 ? 'teapot' : extra.length ? extra[Math.floor(s.rng() * extra.length)][0] : d.key;
    const [x, y] = s.stage === 0 ? (i ? [0.2, 1.0] : [0.27, 0.66]) : freeSpot(s, 0.16, 0.14);
    newShell(s, s.stage === 0 && i === 1 ? 'conch' : k, x, y, false);
  }
  spawnGroup(s);
  const first = s.stage === 0 || STAGES[s.stage - 1].ch !== d.ch;
  s.banner = { head: `${first ? CHAPTERS[d.ch] + ' · ' : ''}${s.stage + 1}판`, sub: d.news, t: s.t };
  s.spot = spot ? { id: spot.id, t: s.t, label: 'NEW ' + SD[d.key].name } : null;
  see(s, 'stage' + s.stage);
  if (first) see(s, 'ch' + d.ch);
  ev(s, 'stage', 0.5, 0.8, s.stage);
}

// ───────────────────────────── 때리기 ─────────────────────────────
interface Hit { sx: number; sy: number; sk: SK | null; air?: boolean; pierce?: boolean; pry?: boolean; melee?: boolean; kx?: number; ky?: number }
function kill(s: ShellState, f: Foe, aid: number, mul: number) {
  if (f.dead) return;
  f.dead = true;
  s.kills++;
  const a = act(s, aid);
  a.n++;
  a.t = s.t;
  // 딱 맞는 껍데기로 쓰러뜨리면 한 번에 n번째는 ⌈n²/4⌉점의 두 배, 아니면 ⌈n/2⌉점
  const pts = mul >= 1.5 ? Math.ceil((a.n * a.n) / 4) * 2 : Math.ceil(a.n / 2);
  s.sp += pts;
  if (a.n > s.best) s.best = a.n;
  ev(s, 'kill', f.x, f.y - f.r, a.n, pts, mul, f.k);
  s.corpses.push({ k: f.k, x: f.x, y: f.y, t: s.t, how: ED[f.k].boss ? 2 : f.k === 'jelly' ? 1 : 0, vx: f.x - s.crab.x, vy: f.y - s.crab.y, seed: f.seed });
  if (s.corpses.length > 26) s.corpses.shift();
  if (ED[f.k].boss) bossDown(s, f, aid);
  checkStar3(s);
}
/** 0 막힘·빗나감 · 1 맞음 · 2 쓰러뜨림 */
function hurt(s: ShellState, f: Foe, amt: number, aid: number, o: Hit): number {
  if (!live(f) || (f.alt > 0.045 && !o.air)) return 0;
  let m = o.sk ? matchMul(s, o.sk, f) : 1;
  if (f.k === 'shield' && !o.pierce && f.stun <= 0) {
    const a = angTo(f.x, f.y, o.sx, o.sy), dd = Math.abs(((a - f.ang + Math.PI * 3) % TAU) - Math.PI);
    if (dd < 1.3) {
      m *= 0.2;
      if (s.t - f.hurtT > 8) ev(s, 'clang', f.x + Math.cos(f.ang) * f.r, f.y + Math.sin(f.ang) * f.r * YS - f.r);
    }
  }
  if (f.k === 'clam' && f.open <= 0 && !o.pry) {
    m *= 0.15;
    if (s.t - f.hurtT > 8) ev(s, 'clink', f.x, f.y - f.r);
  }
  if (f.k === 'jelly' && o.melee && s.crab.k && !s.crab.boss) {
    s.crab.hp -= 2;
    if (s.t - f.hurtT > 10) ev(s, 'sting', s.crab.x, s.crab.y - crabR(s.crab));
    if (s.crab.hp <= 0) breakShell(s);
  }
  f.hp -= amt * m;
  f.hurtT = s.t;
  if (m >= 1.5) ev(s, 'match', f.x, f.y - f.r * 1.6, Math.round(m * 10));
  if (!ED[f.k].boss && (o.kx || o.ky)) {
    const res = f.k === 'goblin' ? 0.35 : 1;
    f.x += (o.kx ?? 0) * res;
    f.y += (o.ky ?? 0) * res;
    if (f.k !== 'star') keepIn(f, f.r);
  }
  if (f.hp <= 0) return kill(s, f, aid, m), 2;
  return 1;
}
/** 둥근 범위 한 방: 맞은 수 · 쓰러뜨린 수 */
function area(s: ShellState, x: number, y: number, r: number, dmg: number, aid: number, o: Hit, knock = 0.025) {
  let hits = 0, kills = 0;
  for (const f of s.foes) {
    if (!live(f)) continue;
    const d = dist(x, y, f.x, f.y);
    if (d > r + f.r * 0.6) continue;
    const a = angTo(x, y, f.x, f.y), q = d < 0.001 ? 0 : knock;
    const res = hurt(s, f, dmg, aid, { ...o, kx: Math.cos(a) * q, ky: Math.sin(a) * q * YS });
    if (res) hits++;
    if (res === 2) kills++;
  }
  return { hits, kills };
}
/** 가장 붐비는 무리의 가운데 (반지름 R 안의 수) */
function cluster(s: ShellState, R: number, air: boolean, skip?: { x: number; y: number; r: number }): { x: number; y: number; n: number } | null {
  let best: { x: number; y: number; n: number } | null = null, bv = -1;
  const c = s.crab;
  for (const f of s.foes) {
    if (!(air ? live(f) : low(f)) || f.k === 'star') continue;
    if (skip && dist(f.x, f.y, skip.x, skip.y) < skip.r) continue;
    let n = 0, sx = 0, sy = 0;
    for (const o of s.foes) {
      if (!(air ? live(o) : low(o)) || (skip && dist(o.x, o.y, skip.x, skip.y) < skip.r)) continue;
      if (dist(f.x, f.y, o.x, o.y) <= R) (n += ED[o.k].boss ? 4 : 1), (sx += o.x), (sy += o.y);
    }
    const cnt = s.foes.filter((o) => (air ? live(o) : low(o)) && dist(f.x, f.y, o.x, o.y) <= R).length || 1;
    const v = n - dist(f.x, f.y, c.x, c.y) * 0.5;
    if (v > bv) (bv = v), (best = { x: sx / cnt, y: sy / cnt, n });
  }
  // 굴러가는 불가사리만 있으면 그 줄을 노린다
  if (!best) for (const f of s.foes) if (low(f) && (!skip || dist(f.x, f.y, skip.x, skip.y) >= skip.r)) return { x: f.x, y: f.y, n: 1 };
  return best;
}
function nearest(s: ShellState, x: number, y: number, air = false): Foe | null {
  let b: Foe | null = null, bd = 1e9;
  for (const f of s.foes) {
    if (!(air ? live(f) : low(f))) continue;
    const d = dist(x, y, f.x, f.y);
    if (d < bd) (bd = d), (b = f);
  }
  return b;
}
/** 반직선(겨눈 쪽) 위의 수 */
function rayCount(s: ShellState, x: number, y: number, a: number, wd: number, len: number) {
  const cs = Math.cos(a), sn = Math.sin(a);
  let n = 0;
  for (const f of s.foes) {
    if (!low(f)) continue;
    const ox = f.x - x, oy = (f.y - y) / YS, u = ox * cs + oy * sn;
    if (u >= 0 && u <= len && Math.abs(-ox * sn + oy * cs) <= wd + f.r * 0.7) n += ED[f.k].boss ? 3 : 1;
  }
  return n;
}
function bestRay(s: ShellState, x: number, y: number, wd: number, len: number): [number, number] {
  let ba = 0, bn = -1;
  for (let k = 0; k < 24; k++) {
    const a = (k * TAU) / 24 + 0.01, n = rayCount(s, x, y, a, wd, len);
    if (n > bn) (bn = n), (ba = a);
  }
  return [ba, bn];
}
/** 별 셋째 (판마다 다른 솜씨) — 판 중에 따면 큰 띠 */
function checkStar3(s: ShellState) {
  if (s.star3T >= 0 || s.phase !== 'play') return;
  const st = STAGES[s.stage].star;
  const ok = st.k === 'multi' ? s.best >= st.n : st.k === 'throw' ? s.bestThrow >= st.n : false;
  if (!ok) return;
  s.star3T = s.t;
  ev(s, 'star3', s.crab.x, s.crab.y - 0.1, st.n);
  wow(s, starWord(st, true), st.n, null, true);
}
const starWord = (st: { k: StarK; n: number }, done = false) =>
  st.k === 'multi' ? `한 번에 ${st.n}마리${done ? '!' : ''}` : st.k === 'throw' ? `던진 껍데기로 한 번에 ${st.n}마리${done ? '!' : ''}` : `${st.n}초 안에 쫓아내기`;

// ───────────────────────────── 내가 맞을 때 ─────────────────────────────
function breakShell(s: ShellState) {
  const c = s.crab;
  if (!c.k) return;
  ev(s, 'break', c.x, c.y - crabR(c) * 0.6, 0, 0, 0, c.k);
  s.shards.push({ k: c.k, x: c.x, y: c.y, t: s.t, seed: s.t, big: c.boss });
  if (s.shards.length > 6) s.shards.shift();
  c.k = null;
  c.boss = false;
  c.hp = 0;
  c.inv = NAKED_INV;
  c.nakedT = s.t;
  c.mode = 0;
  c.alt = 0;
  see(s, 'naked');
}
function hurtCrab(s: ShellState, amt: number, sx: number, sy: number, from: Foe | null) {
  const c = s.crab;
  if (c.leap || c.inv > 0 || s.phase !== 'play' || c.alt > 0.02) return;
  const ez = EZ[s.stage] * (s.firstTap < 0 && s.t < SAFE_T ? 0.3 : 1);
  if (c.k) {
    const q0 = c.hp / c.max;
    // 딱 맞는 껍데기는 그 놈의 공격을 잘 막는다
    const resist = from && SD[c.k].best === ED[from.k].tag ? 0.35 : 1;
    c.hp -= amt * SD[c.k].armor * ez * resist;
    c.hurtT = s.t;
    if (from && c.k === 'urchin' && live(from)) {
      const aid = ++s.aid;
      if (hurt(s, from, 8 * lvAtk(s), aid, { sx: c.x, sy: c.y, sk: 'urchin', melee: false })) ev(s, 'thorn', from.x, from.y - from.r);
    }
    const q1 = c.hp / c.max;
    if (c.hp <= 0) return breakShell(s);
    if ((q0 > 0.66 && q1 <= 0.66) || (q0 > 0.33 && q1 <= 0.33)) ev(s, 'crack', c.x, c.y - crabR(c), q1 > 0.4 ? 1 : 2);
    else ev(s, 'ouch', c.x, c.y - crabR(c) * 0.5, 0, sx, sy);
    return;
  }
  // 맨몸: 1판·처음 10초는 하트를 잃지 않는다 — 엉엉 울며 가장 가까운 껍데기로
  if (s.stage > 0 && s.t >= SAFE_T) {
    s.hearts--;
    s.lost = true;
    see(s, 'heart');
    ev(s, 'heart', c.x, c.y - 0.06);
    if (s.hearts <= 0) return void ((s.phase = 'end'), (s.pt = 0), ev(s, 'end', 0.5, 0.7, 0));
  } else ev(s, 'ouchN', c.x, c.y - 0.05);
  c.cry = 32;
  c.inv = NAKED_INV + 30;
  const a = angTo(sx, sy, c.x, c.y);
  c.x += Math.cos(a) * 0.04;
  c.y += Math.sin(a) * 0.04 * YS;
  keepIn(c, 0.05);
}

// ───────────────────────────── 이사 ─────────────────────────────
/** 톡한 곳에서 가장 가까운 껍데기 (둘레 18% 안 → 없으면 화면에서 가장 가까운 것). 소라게 자신(지금 껍데기)이 가장 가까우면 null */
export function pickShell(s: ShellState, x: number, y: number): Shell | 'self' | null {
  let best: Shell | null = null, bd = 1e9;
  for (const o of s.shells) {
    const d = hyp(o.x - x, o.y - SD[o.k].r * 0.6 - y);
    if (d < bd) (bd = d), (best = o);
  }
  const c = s.crab;
  if (c.k && !c.leap && hyp(c.x - x, c.y - crabR(c) * 0.6 - y) * 1.25 < Math.min(bd, PICK_R)) return 'self';
  return best;
}
function onTap(s: ShellState, x: number, y: number) {
  if (s.firstTap < 0) s.firstTap = s.t;
  ev(s, 'tap', x, y);
  const c = s.crab;
  if (c.leap || s.t < s.restT || c.cry > 0) return void ev(s, 'deny', c.x, c.y - crabR(c));
  const sh = pickShell(s, x, y);
  if (sh === 'self') return void ev(s, 'same', c.x, c.y - crabR(c));
  if (!sh) return;
  leapTo(s, sh);
}
function leapTo(s: ShellState, sh: Shell) {
  const c = s.crab, aid = ++s.aid;
  act(s, aid).swap = true;
  if (c.k) toss(s, c.k, c.hp, c.max, c.boss, c.x, c.y, aid);
  s.shells = s.shells.filter((o) => o !== sh);
  const d = dist(c.x, c.y, sh.x, sh.y), T = Math.round(clamp(9 + d * 24, 10, 21));
  ev(s, 'leap', c.x, c.y, T, sh.x, sh.y, c.k ?? '');
  c.leap = { x0: c.x, y0: c.y, x1: sh.x, y1: sh.y, t: 0, T, sh };
  c.k = null;
  c.boss = false;
  c.aid = aid;
  c.entry = true;
  c.cry = 0;
  c.mode = 0;
  c.alt = 0;
  s.restT = s.t + T + REST_T;
  s.swaps++;
  if (s.spot && s.spot.id === sh.id) s.spot = null;
  see(s, 'swap');
}
function arrive(s: ShellState) {
  const c = s.crab, L = c.leap!, sh = L.sh, k = sh.k, D = SD[k];
  c.leap = null;
  c.x = L.x1;
  c.y = L.y1;
  c.k = k;
  c.hp = sh.hp;
  c.max = sh.max;
  c.boss = sh.boss;
  c.mode = 0;
  c.mt = 0;
  c.atk = ENTRY_T;
  c.landT = s.t;
  c.inv = Math.max(c.inv, 14);
  c.hits = [];
  c.chain = 0;
  c.spin = 0;
  c.alt = 0;
  c.ang = -Math.PI / 2;
  ev(s, 'land', c.x, c.y, 0, 0, 0, k);
  if (!s.kinds.includes(k)) s.kinds.push(k);
  const fresh = !s.dex.includes(k);
  if (fresh) s.dex.push(k), s.newDex.push(k);
  if (sh.boss) {
    s.bossRode = true;
    for (const f of s.foes) if (low(f) && !ED[f.k].boss) f.scared = Math.max(f.scared, 100);
    ev(s, 'bossshell', c.x, c.y, 0, 0, 0, k);
    see(s, 'boss:' + k);
    wow(s, `${D.name} 소라게!`, 0, k);
  } else if (fresh) wow(s, `${D.name} 소라게!`, 0, k);
  // 장 끝 선물: 진주 폭죽 · 소용돌이
  if (s.perk[0] === 1) {
    area(s, c.x, c.y, 0.13, 12 * lvThrow(s), c.aid, { sx: c.x, sy: c.y, sk: null, pierce: true });
    ev(s, 'pearl', c.x, c.y);
  }
  if (s.perk[1] === 2) {
    for (const f of s.foes) {
      if (!low(f) || ED[f.k].boss || f.k === 'star') continue;
      const d = dist(c.x, c.y, f.x, f.y);
      if (d < 0.32 && d > D.r + f.r) (f.x += (c.x - f.x) * 0.45), (f.y += (c.y - f.y) * 0.45);
    }
    ev(s, 'whirl', c.x, c.y);
  }
}
/** 버린 껍데기: 가장 붐비는 무리로 휙 → 쾅 (놈이 없으면 모래밭에 톡 떨어져 다시 쓸 수 있다) */
function toss(s: ShellState, k: SK, hp: number, max: number, boss: boolean, x: number, y: number, aid: number) {
  const D = SD[k], R = THROW_R[D.heavy], tg = cluster(s, R, boss), q = 0.6 + 0.4 * clamp(hp / Math.max(1, max), 0, 1), spin = s.rng() < 0.5 ? -1 : 1;
  if (!tg) {
    const [lx, ly] = freeSpot(s, 0.12, 0.14);
    s.toss.push({ k, x0: x, y0: y - D.r * 0.5, x1: lx, y1: ly, t: 0, T: 22, aid, dmg: 0, r: 0, boss, bounce: 0, hp, max, land: true, spin });
  } else {
    const T = Math.round(13 + dist(x, y, tg.x, tg.y) * 20);
    s.toss.push({ k, x0: x, y0: y - D.r * 0.5, x1: tg.x, y1: tg.y, t: 0, T, aid, dmg: THROW_D[D.heavy] * lvThrow(s) * q, r: R, boss, bounce: s.perk[1] === 1 ? 1 : 0, hp, max, land: false, spin });
  }
  ev(s, 'throw', x, y, D.heavy, 0, 0, k);
}
function tossStep(s: ShellState) {
  for (const o of s.toss) {
    if (++o.t < o.T) continue;
    if (o.land) {
      if (s.shells.length < SH_MAX + 1) newShell(s, o.k, o.x1, o.y1, false, o.hp);
      ev(s, 'plunk', o.x1, o.y1, 0, 0, 0, o.k);
      continue;
    }
    const { kills } = area(s, o.x1, o.y1, o.r, o.dmg, o.aid, { sx: o.x1, sy: o.y1 - 0.3, sk: o.k, pierce: true, air: o.boss }, 0.035);
    const a = act(s, o.aid);
    a.thrown += kills;
    if (a.thrown > s.bestThrow) s.bestThrow = a.thrown;
    ev(s, 'bang', o.x1, o.y1, kills, SD[o.k].heavy, a.thrown, o.k);
    s.shards.push({ k: o.k, x: o.x1, y: o.y1, t: s.t, seed: o.aid, big: o.boss });
    if (s.shards.length > 6) s.shards.shift();
    if (o.bounce > 0) {
      const tg = cluster(s, o.r, false, { x: o.x1, y: o.y1, r: o.r * 1.2 });
      if (tg) s.toss.push({ ...o, x0: o.x1, y0: o.y1, x1: tg.x, y1: tg.y, t: 0, T: Math.round(10 + dist(o.x1, o.y1, tg.x, tg.y) * 16), dmg: o.dmg * 0.65, bounce: o.bounce - 1 });
    }
    checkStar3(s);
  }
  s.toss = s.toss.filter((o) => o.t < o.T);
}

// ───────────────────────────── 껍데기마다 저절로 싸우기 ─────────────────────────────
const TEA_LEN = 0.3, TEA_HALF = 0.58, BULB_R = 0.24, FEAR_R = 0.22, ANCHOR_R = 0.22, HORN_SPD = 0.019;
/** 이번 공격의 번호: 들어간 뒤 첫 공격은 이사와 한 묶음(한 번에 N마리에 함께 센다) */
function aidFor(s: ShellState, c: Crab) {
  if (c.entry) return (c.entry = false), c.aid;
  return ++s.aid;
}
function step2(c: Crab, s: ShellState, a: number, spd: number) {
  c.x += Math.cos(a) * spd;
  c.y += Math.sin(a) * spd * YS;
  if (Math.abs(Math.cos(a)) > 0.2) c.face = Math.cos(a) > 0 ? 1 : -1;
  c.walkT = s.t;
}
function moveTo(c: Crab, s: ShellState, x: number, y: number, spd: number, stop: number) {
  const d = dist(c.x, c.y, x, y);
  if (d > stop) step2(c, s, angTo(c.x, c.y, x, y), Math.min(spd, d - stop));
}
/** 부채꼴 안에 있나 */
function inCone(c: Crab, f: Foe, a: number, len: number, half: number) {
  const d = dist(c.x, c.y, f.x, f.y);
  if (d > len + f.r) return false;
  const da = Math.abs(((angTo(c.x, c.y, f.x, f.y) - a + Math.PI * 3) % TAU) - Math.PI);
  return da <= half + (d > 0.01 ? f.r / d : 1);
}
function turn(cur: number, to: number, k: number) {
  const d = ((to - cur + Math.PI * 3) % TAU) - Math.PI;
  return cur + clamp(d, -k, k);
}
function crabStep(s: ShellState) {
  const c = s.crab;
  if (c.inv > 0) c.inv--;
  if (c.leap) {
    const L = c.leap;
    if (++L.t >= L.T) return arrive(s);
    const u = L.t / L.T;
    c.x = L.x0 + (L.x1 - L.x0) * u;
    c.y = L.y0 + (L.y1 - L.y0) * u;
    c.alt = Math.sin(Math.PI * u) * (0.06 + dist(L.x0, L.y0, L.x1, L.y1) * 0.25);
    c.face = L.x1 >= L.x0 ? 1 : -1;
    return;
  }
  if (!c.k) return nakedStep(s);
  const D = SD[c.k], spd = D.spd * (1 + 0.03 * (s.lv - 1)), dmg = D.dmg * lvAtk(s);
  c.atk--;
  c.mt++;
  switch (c.k) {
    case 'conch': {
      const f = nearest(s, c.x, c.y);
      if (!f) break;
      const reach = D.r * 0.75 + f.r + 0.02;
      if (dist(c.x, c.y, f.x, f.y) > reach) moveTo(c, s, f.x, f.y, spd, reach * 0.85);
      else if (c.atk <= 0) {
        c.atk = D.per;
        c.atkT = s.t;
        c.face = f.x >= c.x ? 1 : -1;
        hurt(s, f, dmg, aidFor(s, c), { sx: c.x, sy: c.y, sk: 'conch', melee: true });
        ev(s, 'pinch', (c.x + f.x) / 2, (c.y + f.y) / 2 - f.r, c.mt % 2);
      }
      break;
    }
    case 'teapot': {
      const cl = cluster(s, 0.11, false);
      if (!cl) break;
      const d = dist(c.x, c.y, cl.x, cl.y);
      c.ang = turn(c.ang, angTo(c.x, c.y, cl.x, cl.y), 0.16);
      c.face = Math.cos(c.ang) >= 0 ? 1 : -1;
      if (d > 0.19) moveTo(c, s, cl.x, cl.y, spd, 0.16);
      else if (d < 0.08) step2(c, s, c.ang + Math.PI, spd * 0.6), (c.face = Math.cos(c.ang) >= 0 ? 1 : -1);
      if (c.atk <= 0 && s.foes.some((f) => low(f) && inCone(c, f, c.ang, TEA_LEN, TEA_HALF))) {
        c.atk = D.per;
        c.atkT = s.t;
        const aid = aidFor(s, c);
        let n = 0;
        for (const f of s.foes) if (low(f) && inCone(c, f, c.ang, TEA_LEN, TEA_HALF)) (n += hurt(s, f, dmg, aid, { sx: c.x, sy: c.y, sk: 'teapot', kx: Math.cos(c.ang) * 0.02, ky: Math.sin(c.ang) * 0.02 * YS }) ? 1 : 0);
        ev(s, 'steam', c.x, c.y - D.r * 0.9, n, c.ang);
      }
      break;
    }
    case 'can': {
      if (c.mode === 0) {
        if (c.mt === 1 || c.mt % 5 === 0) {
          const [a, n] = bestRay(s, c.x, c.y, 0.05, 0.8);
          c.ang = a;
          c.tx = n;
        }
        if (c.mt >= (c.entry ? 4 : 12) && c.tx > 0) {
          c.mode = 1;
          c.mt = 0;
          c.hits = [];
          c.chain = aidFor(s, c);
          c.atkT = s.t;
          ev(s, 'roll', c.x, c.y, 0, c.ang);
        }
      } else {
        step2(c, s, c.ang, 0.013 + 0.0004 * s.lv);
        c.spin += 0.35;
        for (const f of s.foes) {
          if (!low(f) || c.hits.includes(f.id) || dist(c.x, c.y, f.x, f.y) > D.r * 0.8 + f.r) continue;
          c.hits.push(f.id);
          const side = ((angTo(c.x, c.y, f.x, f.y) - c.ang + Math.PI * 3) % TAU) - Math.PI > 0 ? 1 : -1;
          hurt(s, f, dmg, c.chain, { sx: c.x, sy: c.y, sk: 'can', melee: true, kx: Math.cos(c.ang + side * 1.2) * 0.045, ky: Math.sin(c.ang + side * 1.2) * 0.045 * YS });
          ev(s, 'bowl', f.x, f.y - f.r, c.hits.length);
        }
        if (keepIn(c, D.r) || c.mt > 72) {
          ev(s, 'wall', c.x, c.y, c.hits.length);
          c.mode = 0;
          c.mt = 0;
        }
      }
      break;
    }
    case 'castle': {
      let tg: Foe | null = null, bv = -1;
      for (const f of s.foes) {
        if (!low(f)) continue;
        const d = dist(c.x, c.y, f.x, f.y);
        if (d > 0.8) continue;
        const v = f.hp + (ED[f.k].tag === 'big' ? 200 : 0) - d * 30;
        if (v > bv) (bv = v), (tg = f);
      }
      if (!tg) break;
      if (dist(c.x, c.y, tg.x, tg.y) > 0.5) moveTo(c, s, tg.x, tg.y, spd, 0.45);
      c.face = tg.x >= c.x ? 1 : -1;
      if (c.atk <= 0) {
        c.atk = D.per;
        c.atkT = s.t;
        const T = Math.round(20 + dist(c.x, c.y, tg.x, tg.y) * 18);
        s.proj.push({ k: 'cannon', x: c.x, y: c.y - D.r * 1.3, x0: c.x + c.face * D.r * 0.3, y0: c.y - D.r * 1.3, x1: tg.x, y1: tg.y, t: 0, T, dmg, r: 0.078, aid: aidFor(s, c), tgt: tg.id });
        ev(s, 'cannon', c.x + c.face * D.r * 0.3, c.y - D.r * 1.4);
      }
      break;
    }
    case 'rocket': {
      if (c.mode === 0) {
        const cl = cluster(s, 0.12, true);
        if (cl) moveTo(c, s, cl.x, cl.y, spd, 0.12);
        if (c.atk <= 0 && cl) {
          // 하늘에 나는 놈이 있으면 그쪽으로, 없으면 가장 붐비는 땅으로
          let air: Foe | null = null;
          for (const f of s.foes) if (live(f) && f.alt > 0.045 && (!air || dist(c.x, c.y, f.x, f.y) < dist(c.x, c.y, air.x, air.y))) air = f;
          const g = air ? { x: air.x, y: air.y } : cluster(s, 0.14, false) ?? cl;
          c.mode = 1;
          c.mt = 0;
          c.tx = clamp(g.x, BX0 + 0.05, BX1 - 0.05);
          c.ty = clamp(g.y, BY0, BY1);
          c.vx = c.x;
          c.vy = c.y;
          c.hits = [];
          c.chain = aidFor(s, c);
          c.atkT = s.t;
          ev(s, 'launch', c.x, c.y);
        }
      } else {
        const T = 46, u = c.mt / T;
        c.x = c.vx + (c.tx - c.vx) * u;
        c.y = c.vy + (c.ty - c.vy) * u;
        c.alt = Math.sin(Math.PI * Math.min(1, u)) * 0.3;
        c.face = c.tx >= c.vx ? 1 : -1;
        for (const f of s.foes) {
          if (!live(f) || f.alt < 0.045 || c.hits.includes(f.id) || dist(c.x, c.y, f.x, f.y) > 0.1 + f.r) continue;
          c.hits.push(f.id);
          hurt(s, f, dmg, c.chain, { sx: c.x, sy: c.y, sk: 'rocket', air: true });
          ev(s, 'airhit', f.x, f.y - f.alt * 0.9);
        }
        if (c.mt >= T) {
          c.alt = 0;
          c.mode = 0;
          c.atk = D.per;
          const r = area(s, c.x, c.y, 0.15, dmg * 0.7, c.chain, { sx: c.x, sy: c.y, sk: 'rocket', pierce: true }, 0.04);
          ev(s, 'slam', c.x, c.y, r.hits);
        }
      }
      break;
    }
    case 'urchin': {
      const cl = cluster(s, 0.1, false);
      if (cl) moveTo(c, s, cl.x, cl.y, spd, 0.01);
      if (c.atk <= 0) {
        let n = 0;
        for (const f of s.foes) if (low(f) && dist(c.x, c.y, f.x, f.y) <= D.r + f.r + 0.035) n++;
        if (n) {
          c.atk = D.per;
          c.atkT = s.t;
          const aid = aidFor(s, c), mul = Math.min(3, 1 + 0.35 * (n - 1));
          for (const f of s.foes) if (low(f) && dist(c.x, c.y, f.x, f.y) <= D.r + f.r + 0.035) hurt(s, f, dmg * mul, aid, { sx: c.x, sy: c.y, sk: 'urchin', pierce: n >= 3, melee: true });
          ev(s, 'spike', c.x, c.y - D.r * 0.6, n);
        }
      }
      break;
    }
    case 'bottle': {
      if (c.mode === 0) {
        const f = nearest(s, c.x, c.y);
        if (!f) break;
        const d = dist(c.x, c.y, f.x, f.y);
        if (d > 0.3) moveTo(c, s, f.x, f.y, spd, 0.26);
        else if (d < 0.14) step2(c, s, angTo(f.x, f.y, c.x, c.y), spd * 0.8);
        if (c.atk <= 0) {
          const [a] = bestRay(s, c.x, c.y, 0.035, 0.8);
          c.mode = 1;
          c.mt = 0;
          c.ang = a;
          c.face = Math.cos(a) >= 0 ? 1 : -1;
          ev(s, 'beamcharge', c.x, c.y - D.r);
        }
      } else if (c.mt >= (c.entry ? 8 : 14)) {
        c.mode = 0;
        c.atk = D.per;
        c.atkT = s.t;
        const aid = aidFor(s, c), cs = Math.cos(c.ang), sn = Math.sin(c.ang);
        let n = 0;
        for (const f of s.foes) {
          if (!low(f)) continue;
          const ox = f.x - c.x, oy = (f.y - c.y) / YS, u = ox * cs + oy * sn;
          if (u >= 0 && u <= 0.85 && Math.abs(-ox * sn + oy * cs) <= 0.035 + f.r * 0.7) n += hurt(s, f, dmg, aid, { sx: c.x, sy: c.y, sk: 'bottle', pierce: true }) ? 1 : 0;
        }
        const L = rayLen(c.x, c.y - D.r * 0.5, c.ang);
        s.lines.push({ k: 0, x0: c.x, y0: c.y - D.r * 0.5, x1: c.x + cs * L, y1: c.y - D.r * 0.5 + sn * L * YS, t: s.t });
        ev(s, 'beam', c.x, c.y - D.r * 0.5, n, c.ang);
      }
      break;
    }
    case 'skull': {
      for (const f of s.foes) if (low(f) && !ED[f.k].boss && dist(c.x, c.y, f.x, f.y) < FEAR_R + f.r) {
        if (f.scared <= 0) ev(s, 'scare', f.x, f.y - f.r * 2);
        f.scared = Math.max(f.scared, 24);
        if (f.st === WIND || f.st === DASH) f.st = IDLE;
      }
      if (c.mode === 0) {
        const f = nearest(s, c.x, c.y);
        if (!f) break;
        moveTo(c, s, f.x, f.y, spd, 0.06);
        if (c.atk <= 0 && dist(c.x, c.y, f.x, f.y) < 0.4) {
          c.mode = 1;
          c.mt = 0;
          c.ang = angTo(c.x, c.y, f.x, f.y);
          c.hits = [];
          c.chain = aidFor(s, c);
          c.atkT = s.t;
          ev(s, 'skullroll', c.x, c.y);
        }
      } else {
        step2(c, s, c.ang, 0.0145);
        c.spin += 0.4 * c.face;
        for (const f of s.foes) {
          if (!low(f) || c.hits.includes(f.id) || dist(c.x, c.y, f.x, f.y) > D.r * 0.8 + f.r) continue;
          c.hits.push(f.id);
          hurt(s, f, dmg, c.chain, { sx: c.x, sy: c.y, sk: 'skull', melee: true, pierce: true, kx: Math.cos(c.ang) * 0.06, ky: Math.sin(c.ang) * 0.06 * YS });
          ev(s, 'bonk', f.x, f.y - f.r, c.hits.length);
        }
        if (keepIn(c, D.r) || c.mt >= 22) (c.mode = 0), (c.atk = D.per), (c.spin = 0);
      }
      break;
    }
    case 'bulb': {
      const cl = cluster(s, 0.14, true);
      if (cl) moveTo(c, s, cl.x, cl.y, spd, 0.04);
      if (c.atk <= 0 && s.foes.some((f) => live(f) && dist(c.x, c.y, f.x, f.y) < BULB_R + f.r)) {
        c.atk = D.per;
        c.atkT = s.t;
        const aid = aidFor(s, c), pops: Foe[] = [];
        let n = 0;
        for (const f of s.foes) {
          if (!live(f) || dist(c.x, c.y, f.x, f.y) > BULB_R + f.r) continue;
          if (!ED[f.k].boss) f.stun = Math.max(f.stun, 70);
          if (f.alt > 0.045 && !ED[f.k].boss) f.alt = 0.03;
          const r = hurt(s, f, dmg, aid, { sx: c.x, sy: c.y, sk: 'bulb', air: true, pierce: true });
          if (r) n++;
          if (r === 2 && f.k === 'jelly') pops.push(f);
        }
        // 해파리는 줄줄이 펑 (옆 해파리로 찌릿)
        for (let i = 0; i < pops.length && i < 16; i++) {
          const p = pops[i];
          for (const f of s.foes) {
            if (!low(f) || f.k !== 'jelly' || dist(p.x, p.y, f.x, f.y) > 0.17) continue;
            s.lines.push({ k: 1, x0: p.x, y0: p.y - p.r, x1: f.x, y1: f.y - f.r, t: s.t });
            if (hurt(s, f, 24 * lvAtk(s), aid, { sx: p.x, sy: p.y, sk: 'bulb', air: true }) === 2) pops.push(f);
          }
        }
        ev(s, 'flash', c.x, c.y - D.r, n, pops.length);
      }
      break;
    }
    case 'ball': {
      let f = s.foes.find((o) => o.id === c.chain && low(o)) ?? null;
      if (!f) {
        // 다음 놈: 방금 친 두 놈 말고 가장 가까운 놈
        let bd = 1e9;
        for (const o of s.foes) {
          if (!low(o) || c.hits.slice(-2).includes(o.id)) continue;
          const d = dist(c.x, c.y, o.x, o.y);
          if (d < bd) (bd = d), (f = o);
        }
        if (!f) f = nearest(s, c.x, c.y);
        c.chain = f ? f.id : 0;
      }
      c.spin += 0.25 * c.face;
      if (!f) {
        c.alt = Math.abs(Math.sin(s.t * 0.12)) * 0.03;
        break;
      }
      if (c.atk > 0) {
        c.alt = Math.abs(Math.sin((c.atk / D.per) * Math.PI)) * 0.04;
        break;
      }
      const d = dist(c.x, c.y, f.x, f.y);
      c.alt = Math.abs(Math.sin(c.mt * 0.18)) * 0.05;
      if (d > D.r * 0.7 + f.r) step2(c, s, angTo(c.x, c.y, f.x, f.y), Math.min(D.spd + 0.0004 * s.lv, d));
      else {
        if (c.tx <= 0 || c.mode >= 5) (c.tx = aidFor(s, c)), (c.mode = 0);
        c.mode++;
        c.hits.push(f.id);
        if (c.hits.length > 8) c.hits.shift();
        hurt(s, f, dmg, c.tx, { sx: c.x, sy: c.y, sk: 'ball', pry: true, melee: true, kx: (f.x - c.x) * 0.3, ky: (f.y - c.y) * 0.3 });
        ev(s, 'bounce', f.x, f.y - f.r, c.mode);
        c.atk = D.per;
        c.chain = 0;
        c.atkT = s.t;
      }
      break;
    }
    case 'horn': {
      if (c.mode === 1) {
        if (c.mt >= 20) {
          c.mode = 0;
          s.tide = { y: SHORE, t: 0, aid: aidFor(s, c), hit: [] };
          ev(s, 'tide', 0.5, SHORE);
        }
        break;
      }
      moveTo(c, s, 0.5, 1.08, spd, 0.05);
      if (c.atk <= 0 && !s.tide && s.foes.some(live)) {
        c.mode = 1;
        c.mt = 0;
        c.atk = D.per;
        c.atkT = s.t;
        ev(s, 'horn', c.x, c.y - D.r);
      }
      break;
    }
    case 'helmet': {
      const boss = s.foes.find((f) => live(f) && ED[f.k].boss);
      if (c.mode === 0) {
        const cl = boss ? { x: boss.x, y: boss.y } : cluster(s, 0.12, true);
        if (cl) moveTo(c, s, cl.x, cl.y, spd, 0.14);
        if (c.atk <= 0 && cl) {
          const [a, n] = bestRay(s, c.x, c.y, 0.08, 0.6);
          c.ang = boss && dist(c.x, c.y, boss.x, boss.y) < 0.6 ? angTo(c.x, c.y, boss.x, boss.y) : n > 0 ? a : angTo(c.x, c.y, cl.x, cl.y);
          c.mode = 1;
          c.mt = 0;
          c.hits = [];
          c.chain = aidFor(s, c);
          c.atkT = s.t;
          c.face = Math.cos(c.ang) >= 0 ? 1 : -1;
          ev(s, 'ram', c.x, c.y);
        }
      } else {
        step2(c, s, c.ang, 0.02);
        c.alt = Math.sin((c.mt / 24) * Math.PI) * 0.06;
        for (const f of s.foes) {
          if (!live(f) || c.hits.includes(f.id) || dist(c.x, c.y, f.x, f.y) > D.r * 0.85 + f.r) continue;
          c.hits.push(f.id);
          hurt(s, f, dmg, c.chain, { sx: c.x, sy: c.y, sk: 'helmet', air: true, pierce: true, pry: true, kx: Math.cos(c.ang) * 0.08, ky: Math.sin(c.ang) * 0.08 * YS });
          ev(s, 'bonk', f.x, f.y - f.r, c.hits.length);
        }
        if (keepIn(c, D.r) || c.mt >= 24) (c.mode = 0), (c.atk = D.per), (c.alt = 0), ev(s, 'thud', c.x, c.y);
      }
      break;
    }
    case 'anchor': {
      const cl = cluster(s, 0.16, true);
      if (cl) moveTo(c, s, cl.x, cl.y, spd, 0.05);
      const prev = c.spin;
      c.spin += 0.13 + 0.002 * s.lv;
      if (Math.floor(c.spin / TAU) !== Math.floor(prev / TAU) || !c.chain) (c.chain = aidFor(s, c)), ev(s, 'swing', c.x, c.y);
      const hx = c.x + Math.cos(c.spin) * ANCHOR_R, hy = c.y + Math.sin(c.spin) * ANCHOR_R * YS;
      for (const f of s.foes) {
        if (!live(f) || f.cd > s.t || dist(hx, hy, f.x, f.y) > 0.065 + f.r) continue;
        f.cd = s.t + 14;
        const a = angTo(c.x, c.y, f.x, f.y);
        hurt(s, f, dmg, c.chain, { sx: hx, sy: hy, sk: 'anchor', air: true, pierce: true, pry: true, kx: Math.cos(a) * 0.05, ky: Math.sin(a) * 0.05 * YS });
        ev(s, 'clonk', f.x, f.y - f.r);
      }
      break;
    }
    case 'sub': {
      const cl = cluster(s, 0.14, false);
      if (cl) moveTo(c, s, cl.x, cl.y, spd, 0.18);
      if (c.atk <= 0 && s.foes.some(live)) {
        c.atk = D.per;
        c.atkT = s.t;
        const aid = aidFor(s, c), taken: number[] = [];
        for (let i = 0; i < 3; i++) {
          let tg: Foe | null = null, bv = -1e9;
          for (const f of s.foes) {
            if (!live(f) || taken.includes(f.id)) continue;
            const v = (ED[f.k].boss ? 5 : 0) + s.foes.filter((o) => low(o) && dist(o.x, o.y, f.x, f.y) < 0.08).length - dist(c.x, c.y, f.x, f.y);
            if (v > bv) (bv = v), (tg = f);
          }
          if (!tg) break;
          taken.push(tg.id);
          const a = -Math.PI / 2 + (i - 1) * 0.9;
          s.proj.push({ k: 'mytorp', x: c.x, y: c.y - 0.03, x0: Math.cos(a) * 0.012, y0: Math.sin(a) * 0.012, x1: tg.x, y1: tg.y, t: 0, T: 160, dmg, r: 0.08, aid, tgt: tg.id });
        }
        ev(s, 'torp', c.x, c.y - D.r);
      }
      break;
    }
  }
  if (c.k && c.mode === 0) keepIn(c, SD[c.k].r);
}
/** 반직선이 모래밭 끝까지 가는 길이 (레이저 그림) */
function rayLen(x: number, y: number, a: number) {
  let L = 0.9;
  const cs = Math.cos(a), sn = Math.sin(a) * YS;
  if (cs > 0.01) L = Math.min(L, (BX1 + 0.04 - x) / cs);
  if (cs < -0.01) L = Math.min(L, (BX0 - 0.04 - x) / cs);
  if (sn > 0.01) L = Math.min(L, (BY1 + 0.05 - y) / sn);
  if (sn < -0.01) L = Math.min(L, (SHORE - 0.02 - y) / sn);
  return Math.max(0.05, L);
}
/** 맨몸: 놈들에게서 도망 다닌다 (맞으면 엉엉 → 가장 가까운 껍데기로 쏙) */
function nakedStep(s: ShellState) {
  const c = s.crab;
  c.mt++;
  if (c.cry > 0) {
    if (--c.cry === 0) {
      let b: Shell | null = null, bd = 1e9;
      for (const o of s.shells) if (dist(c.x, c.y, o.x, o.y) < bd) (bd = dist(c.x, c.y, o.x, o.y)), (b = o);
      if (b) leapTo(s, b), ev(s, 'auto', c.x, c.y);
    }
    return;
  }
  let ax = 0, ay = 0;
  for (const f of s.foes) {
    if (!low(f)) continue;
    const d = dist(c.x, c.y, f.x, f.y);
    if (d > 0.32) continue;
    const a = angTo(f.x, f.y, c.x, c.y), w = (0.32 - d) / 0.32;
    ax += Math.cos(a) * w;
    ay += Math.sin(a) * w;
  }
  // 가장자리에서는 가운데로
  ax += (0.5 - c.x) * 0.6;
  ay += (0.86 - c.y) * 0.5;
  if (hyp(ax, ay) > 0.05) step2(c, s, Math.atan2(ay, ax), 0.0052);
  keepIn(c, 0.05);
}

// ───────────────────────────── 놈의 몸짓 ─────────────────────────────
function walkF(s: ShellState, f: Foe, a: number, spd: number) {
  f.x += Math.cos(a) * spd;
  f.y += Math.sin(a) * spd * YS;
  if (Math.abs(Math.cos(a)) > 0.25) f.face = Math.cos(a) > 0 ? 1 : -1;
  f.walkT = s.t;
}
function enterStep(s: ShellState, f: Foe) {
  if (f.k === 'star') {
    f.x += f.vx;
    f.y += f.vy;
    if (f.x > BX0 + 0.02 && f.x < BX1 - 0.02 && f.y > BY0 && f.y < BY1) f.st = IDLE;
    if (f.x < -0.6 || f.x > 1.6) f.dead = true;
    return;
  }
  if (--f.tm <= 0) return void ((f.st = IDLE), (f.x = f.ax), (f.y = f.ay), (f.et = 0), f.k === 'clam' && ev(s, 'clamup', f.x, f.y));
  const u = 1 - f.tm / f.et;
  f.x = f.fx0 + (f.ax - f.fx0) * u;
  f.y = f.fy0 + (f.ay - f.fy0) * u;
  f.face = f.ax >= f.fx0 ? 1 : -1;
  f.walkT = s.t;
}
function foeStep(s: ShellState, f: Foe) {
  if (f.st === ENTER) return enterStep(s, f);
  const D = ED[f.k];
  if (D.boss) return bossStep(s, f);
  if (f.stun > 0) {
    f.stun--;
    if (f.alt > 0) f.alt = Math.max(0, f.alt - 0.01);
    if (f.stun === 0 && D.fly) f.st = RISE, (f.tm = 0);
    return;
  }
  const c = s.crab, tx = c.leap ? c.leap.x1 : c.x, ty = c.leap ? c.leap.y1 : c.y, cr = c.k ? SD[c.k].r : 0.045;
  const calm = s.firstTap < 0 && s.t < SAFE_T, spd = D.spd * (calm ? 0.45 : 1);
  const d = dist(f.x, f.y, tx, ty);
  if (f.scared > 0 && f.alt < 0.045 && f.k !== 'star') {
    f.scared--;
    walkF(s, f, angTo(tx, ty, f.x, f.y), Math.max(0.0028, D.spd * 1.3));
    keepIn(f, f.r);
    return;
  }
  f.cool--;
  switch (f.k) {
    case 'flea': {
      const reach = cr * 0.8 + f.r + 0.016;
      if (f.tm > 0) {
        f.tm--;
        f.x += f.vx;
        f.y += f.vy;
        keepIn(f, f.r);
      } else if (d > reach) {
        if (--f.et <= 0) {
          const a = angTo(f.x, f.y, tx, ty) + (s.rng() - 0.5) * 1.1, L = 0.045 * (calm ? 0.5 : 1);
          f.tm = 9;
          f.vx = (Math.cos(a) * L) / 9;
          f.vy = (Math.sin(a) * L * YS) / 9;
          f.et = 8 + Math.floor(s.rng() * 16);
          f.face = Math.cos(a) >= 0 ? 1 : -1;
          f.walkT = s.t;
        }
      } else if (f.cool <= 0) (f.cool = D.rest), (f.atkT = s.t), hurtCrab(s, D.dmg, f.x, f.y, f), ev(s, 'bite', f.x, f.y - f.r);
      break;
    }
    case 'star': {
      f.x += f.vx;
      f.y += f.vy;
      f.ang += 0.2 * (f.vx >= 0 ? 1 : -1);
      if (f.x < BX0 || f.x > BX1 || f.y < BY0 || f.y > BY1) {
        keepIn(f, 0);
        // 벽에서 튕겨 다시 소라게 쪽으로(조금 엇나가게)
        const a = angTo(f.x, f.y, tx, ty) + (s.rng() - 0.5) * 0.9;
        f.vx = Math.cos(a) * D.spd;
        f.vy = Math.sin(a) * D.spd * YS;
        if (s.t - f.atkT > 20) ev(s, 'starwall', f.x, f.y);
      }
      if (d < cr * 0.8 + f.r && f.cool <= 0) (f.cool = D.rest), (f.atkT = s.t), hurtCrab(s, D.dmg, f.x, f.y, f), ev(s, 'bump', f.x, f.y - f.r);
      break;
    }
    case 'goblin': {
      if (f.st === WIND) {
        if (--f.tm <= 0) {
          f.st = REST;
          f.tm = 40;
          f.atkT = s.t;
          if (dist(f.ax, f.ay, tx, ty) < 0.095 + cr * 0.5) hurtCrab(s, D.dmg, f.x, f.y, f);
          ev(s, 'punch', f.ax, f.ay);
        }
      } else if (f.st === REST) {
        if (--f.tm <= 0) (f.st = IDLE), (f.cool = D.rest);
      } else if (d > 0.08 + cr) walkF(s, f, angTo(f.x, f.y, tx, ty), spd);
      else if (f.cool <= 0 && !calm) (f.st = WIND), (f.tm = 48), (f.ax = tx), (f.ay = ty), ev(s, 'windup', f.x, f.y - f.r * 2);
      break;
    }
    case 'gull': {
      if (f.st === SWOOP) {
        f.tm++;
        const u = f.tm / 30;
        f.x += (f.ax - f.x) * 0.12;
        f.y += (f.ay - f.y) * 0.12;
        f.alt = Math.max(0.012, 0.15 * (1 - u));
        if (f.tm >= 30) {
          f.st = RISE;
          f.tm = 0;
          f.atkT = s.t;
          if (dist(f.x, f.y, tx, ty) < 0.07 + cr * 0.5) hurtCrab(s, D.dmg, f.x, f.y, f);
          ev(s, 'peck', f.x, f.y);
        }
      } else if (f.st === RISE) {
        f.tm++;
        f.alt = Math.min(0.15, f.alt + 0.006);
        walkF(s, f, f.slot, D.spd);
        keepIn(f, f.r);
        if (f.alt >= 0.15) (f.st = IDLE), (f.cool = D.rest + Math.floor(s.rng() * 60));
      } else {
        f.alt += (0.15 - f.alt) * 0.05;
        f.slot += 0.012;
        const px = clamp(tx + Math.cos(f.slot) * 0.24, BX0, BX1), py = clamp(ty - 0.08 + Math.sin(f.slot) * 0.12, BY0, BY1);
        if (dist(f.x, f.y, px, py) > 0.01) walkF(s, f, angTo(f.x, f.y, px, py), D.spd);
        if (f.cool <= 0 && !calm) (f.st = SWOOP), (f.tm = 0), (f.ax = tx), (f.ay = ty), ev(s, 'swoop', f.x, f.y - f.alt);
      }
      break;
    }
    case 'gang': {
      f.slot += 0.004;
      const gx = tx + Math.cos(f.slot) * (cr + f.r + 0.012), gy = ty + Math.sin(f.slot) * (cr + f.r + 0.012) * YS, gd = dist(f.x, f.y, gx, gy);
      if (gd > 0.012) walkF(s, f, angTo(f.x, f.y, gx, gy), Math.min(spd * (d < 0.2 ? 1 : 1.2), gd));
      if (gd < 0.03 && f.cool <= 0) (f.cool = D.rest), (f.atkT = s.t), (f.face = tx >= f.x ? 1 : -1), hurtCrab(s, D.dmg, f.x, f.y, f), ev(s, 'snip', (f.x + tx) / 2, (f.y + ty) / 2 - f.r);
      break;
    }
    case 'shield': {
      f.ang = turn(f.ang, angTo(f.x, f.y, tx, ty), 0.05);
      const reach = cr * 0.8 + f.r + 0.02;
      if (d > reach) walkF(s, f, angTo(f.x, f.y, tx, ty), spd);
      else if (f.cool <= 0) (f.cool = D.rest), (f.atkT = s.t), hurtCrab(s, D.dmg, f.x, f.y, f), ev(s, 'snip', (f.x + tx) / 2, (f.y + ty) / 2 - f.r);
      break;
    }
    case 'lobster': {
      if (f.st === WIND) {
        f.ang = turn(f.ang, angTo(f.x, f.y, tx, ty), 0.03);
        if (--f.tm <= 0) (f.st = DASH), (f.tm = 26), (f.cd = 0), ev(s, 'dash', f.x, f.y);
      } else if (f.st === DASH) {
        walkF(s, f, f.ang, 0.017);
        if (keepIn(f, f.r)) f.tm = Math.min(f.tm, 2);
        if (!f.cd && dist(f.x, f.y, tx, ty) < f.r + cr * 0.8) (f.cd = 1), (f.atkT = s.t), hurtCrab(s, D.dmg, f.x, f.y, f);
        if (--f.tm <= 0) (f.st = REST), (f.tm = 50);
      } else if (f.st === REST) {
        if (--f.tm <= 0) (f.st = IDLE), (f.cool = D.rest);
      } else if (d > 0.3) walkF(s, f, angTo(f.x, f.y, tx, ty), spd);
      else if (f.cool <= 0 && !calm) (f.st = WIND), (f.tm = 42), (f.ang = angTo(f.x, f.y, tx, ty)), ev(s, 'windup', f.x, f.y - f.r * 2);
      else walkF(s, f, angTo(f.x, f.y, tx, ty) + 1.4, spd * 0.6);
      break;
    }
    case 'jelly': {
      const a = angTo(f.x, f.y, tx, ty) + Math.sin(s.t * 0.03 + f.seed) * 0.9;
      if (d > cr * 0.7 + f.r) walkF(s, f, a, spd);
      else if (f.cool <= 0) (f.cool = D.rest), (f.atkT = s.t), hurtCrab(s, D.dmg, f.x, f.y, f), ev(s, 'zapme', f.x, f.y - f.r);
      break;
    }
    case 'clam': {
      const was = f.open > 0;
      f.open--;
      if (f.open <= -130) f.open = 70;
      if (!was && f.open > 0) {
        ev(s, 'clamopen', f.x, f.y - f.r);
        if (d < 0.6 && !calm) {
          const T = Math.round(18 + d * 40);
          s.proj.push({ k: 'spit', x: f.x, y: f.y - f.r, x0: f.x, y0: f.y - f.r, x1: tx, y1: ty, t: 0, T, dmg: D.dmg, r: 0.05, aid: 0, tgt: 0 });
          f.atkT = s.t;
        }
      }
      break;
    }
  }
  if (f.k !== 'star') keepIn(f, f.r);
}
/** 대장: 졸개 부르기 · 위에서 폭탄 · 다리 쾅 · 어뢰 — 반쯤 다치면 무서운 껍데기를 떨어뜨린다 */
function bossStep(s: ShellState, f: Foe) {
  const c = s.crab, tx = c.leap ? c.leap.x1 : c.x, ty = c.leap ? c.leap.y1 : c.y, D = ED[f.k];
  if (f.stun > 0) f.stun--;
  f.cool--;
  if (!s.bossDrop && f.hp <= f.max * 0.55) dropBossShell(s, f);
  if (f.k === 'captain') {
    if (!s.bossDrop) {
      if (f.st === SWOOP) {
        // 내리꽂아 소라게를 쪼고 다시 하늘로 (이때는 누구나 때린다)
        f.tm++;
        f.x += (f.ax - f.x) * 0.08;
        f.y += (f.ay - f.y) * 0.08;
        f.alt = f.tm < 40 ? Math.max(0.01, 0.2 * (1 - f.tm / 30)) : Math.min(0.2, (f.tm - 40) * 0.008);
        if (f.tm === 34) {
          f.atkT = s.t;
          if (dist(f.x, f.y, tx, ty) < 0.1 + SD[c.k ?? 'conch'].r * 0.5) hurtCrab(s, D.dmg * 1.4, f.x, f.y, f);
          ev(s, 'peck', f.x, f.y);
        }
        if (f.tm >= 66) (f.st = IDLE), (f.cool = 140);
      } else {
        f.alt += (0.2 - f.alt) * 0.05;
        f.slot += 0.008;
        const px = 0.5 + Math.cos(f.slot) * 0.3, py = 0.62 + Math.sin(f.slot * 2) * 0.06;
        walkF(s, f, angTo(f.x, f.y, px, py), Math.min(D.spd, dist(f.x, f.y, px, py)));
        if (f.cool <= 0) {
          if (f.rid++ % 3 === 2) (f.st = SWOOP), (f.tm = 0), (f.ax = tx), (f.ay = ty - 0.02), ev(s, 'swoop', f.x, f.y - f.alt);
          else {
            for (let i = 0; i < 3; i++) {
              const a = s.rng() * TAU, q = i === 0 ? 0 : 0.07 + s.rng() * 0.05;
              s.marks.push({ k: 'bomb', x: clamp(tx + Math.cos(a) * q, BX0, BX1), y: clamp(ty + Math.sin(a) * q * YS, BY0, BY1), r: 0.07, t: -i * 10, T: 54, dmg: D.dmg });
            }
            ev(s, 'bombs', f.x, f.y - f.alt);
            f.cool = D.rest;
          }
        }
      }
    } else {
      // 투구를 잃은 선장은 지쳐서 내려앉는다: 땅에서 뒤뚱뒤뚱 쪼기
      f.alt = Math.max(0, f.alt - 0.006);
      if (f.alt <= 0 && f.st !== WIND) {
        const dd = dist(f.x, f.y, tx, ty);
        if (dd > 0.13) walkF(s, f, angTo(f.x, f.y, tx, ty), 0.0016);
        else if (f.cool <= 0) (f.st = WIND), (f.tm = 34), (f.ax = tx), (f.ay = ty), ev(s, 'windup', f.x, f.y - f.r * 2);
      } else if (f.st === WIND && --f.tm <= 0) {
        f.st = IDLE;
        f.cool = 90;
        f.atkT = s.t;
        if (dist(f.ax, f.ay, tx, ty) < 0.1) hurtCrab(s, D.dmg, f.x, f.y, f);
        ev(s, 'peck', f.ax, f.ay);
      }
    }
  } else if (f.k === 'octo') {
    if (f.cool <= 0) {
      const two = s.bossDrop;
      for (let i = 0; i < (two ? 2 : 1); i++) s.marks.push({ k: 'slam', x: clamp(tx + (i ? (s.rng() - 0.5) * 0.3 : 0), BX0 + 0.05, BX1 - 0.05), y: clamp(ty + (i ? (s.rng() - 0.5) * 0.2 : 0), BY0 + 0.1, BY1), r: 0.095, t: -i * 14, T: 50, dmg: D.dmg });
      f.cool = Math.round(D.rest * (two ? 0.75 : 1));
      f.atkT = s.t;
      ev(s, 'tentacle', f.x, f.y - f.r);
    }
  } else if (f.k === 'shark') {
    f.slot += 0.006;
    const px = 0.5 + Math.sin(f.slot) * 0.32;
    walkF(s, f, angTo(f.x, f.y, px, BY0 + 0.04), Math.min(D.spd, dist(f.x, f.y, px, BY0 + 0.04)));
    if (f.cool <= 0) {
      const d = dist(f.x, f.y, tx, ty), T = Math.round(30 + d * 50);
      s.proj.push({ k: 'torp', x: f.x, y: f.y, x0: f.x, y0: f.y, x1: tx, y1: ty, t: 0, T, dmg: D.dmg, r: 0.07, aid: 0, tgt: 0 });
      if (s.bossDrop) s.proj.push({ k: 'torp', x: f.x, y: f.y, x0: f.x, y0: f.y, x1: clamp(tx + (s.rng() - 0.5) * 0.3, BX0, BX1), y1: clamp(ty + (s.rng() - 0.5) * 0.2, BY0, BY1), t: 0, T, dmg: D.dmg, r: 0.07, aid: 0, tgt: 0 });
      f.cool = D.rest;
      f.atkT = s.t;
      ev(s, 'enemytorp', f.x, f.y);
    }
  }
  // 졸개 부르기
  const minions = s.foes.filter((o) => !o.dead && !ED[o.k].boss).length + s.inbox.length;
  if (++s.summonT >= 330 || (minions <= 3 && s.summonT >= 60)) {
    s.summonT = 0;
    if (minions <= 10) {
      const L = SUMMON[f.k]!;
      enqueue(s, L[s.sumI++ % L.length], f.k === 'octo' ? 5 : 1);
      ev(s, 'summon', f.x, f.y - f.r - f.alt);
    }
  }
}
function dropBossShell(s: ShellState, f: Foe) {
  const k = STAGES[s.stage].bossShell;
  if (!k) return;
  s.bossDrop = true;
  const [x, y] = freeSpot(s, 0.14, 0.16, 1.1);
  const sh = newShell(s, k, x, y, false);
  sh.sx = f.x;
  sh.sy = f.y - f.alt - f.r;
  sh.inT = 34;
  s.spot = { id: sh.id, t: s.t, label: '무서운 껍데기!' };
  ev(s, 'bossdrop', f.x, f.y - f.alt - f.r, 0, x, y, k);
  see(s, 'drop');
}
function bossDown(s: ShellState, f: Foe, aid: number) {
  s.bossDown = true;
  ev(s, 'bosskill', f.x, f.y - f.alt, 0, 0, 0, f.k);
  // 졸개들은 대장을 따라 바다로 도망 — 한 번에 쓰러뜨린 수에 든다
  for (const o of s.foes) if (!o.dead && o !== f) kill(s, o, aid, 1);
  s.inbox = [];
  wow(s, '대장을 물리쳤다!', act(s, aid).n);
}

// ───────────────────────────── 날아가는 것 · 바닥 위험 · 파도 ─────────────────────────────
function projStep(s: ShellState) {
  const c = s.crab;
  for (const p of s.proj) {
    p.t++;
    if (p.k === 'mytorp') {
      let tg = s.foes.find((f) => f.id === p.tgt && live(f));
      if (!tg) {
        tg = nearest(s, p.x, p.y, true) ?? undefined;
        p.tgt = tg ? tg.id : 0;
      }
      if (tg) {
        const a = Math.atan2(tg.y - tg.alt - p.y, tg.x - p.x), sp = 0.017;
        p.x0 += (Math.cos(a) * sp - p.x0) * 0.16;
        p.y0 += (Math.sin(a) * sp - p.y0) * 0.16;
      }
      p.x += p.x0;
      p.y += p.y0;
      if (tg && hyp(tg.x - p.x, tg.y - tg.alt - p.y) < 0.035 + tg.r * 0.6) {
        const r = area(s, tg.x, tg.y, p.r, p.dmg, p.aid, { sx: p.x, sy: p.y, sk: 'sub', air: true, pierce: true, pry: true }, 0.03);
        ev(s, 'torpboom', tg.x, tg.y - tg.alt, r.hits);
        p.t = 9999;
      } else if (!tg && p.t > 40) p.t = 9999;
      continue;
    }
    const u = Math.min(1, p.t / p.T);
    p.x = p.x0 + (p.x1 - p.x0) * u;
    p.y = p.y0 + (p.y1 - p.y0) * u;
    if (p.t < p.T) continue;
    if (p.k === 'cannon') {
      const r = area(s, p.x1, p.y1, p.r, p.dmg, p.aid, { sx: s.crab.x, sy: s.crab.y, sk: 'castle' }, 0.03);
      ev(s, 'boom', p.x1, p.y1, r.hits);
    } else {
      const R = p.k === 'spit' ? 0.05 : p.r;
      if (dist(p.x1, p.y1, c.x, c.y) < R + crabR(c) * 0.6) hurtCrab(s, p.dmg, p.x0, p.y0, null);
      ev(s, p.k === 'spit' ? 'splat' : 'boomE', p.x1, p.y1);
    }
  }
  s.proj = s.proj.filter((p) => p.t < p.T && p.t < 9999);
}
function markStep(s: ShellState) {
  const c = s.crab;
  for (const m of s.marks) {
    if (++m.t < m.T) continue;
    if (dist(m.x, m.y, c.x, c.y) < m.r + crabR(c) * 0.5) hurtCrab(s, m.dmg, m.x, m.y, null);
    ev(s, m.k, m.x, m.y);
  }
  s.marks = s.marks.filter((m) => m.t < m.T);
}
function tideStep(s: ShellState) {
  const w = s.tide;
  if (!w) return;
  const y0 = w.y;
  w.y += HORN_SPD;
  w.t++;
  const dmg = SD.horn.dmg * lvAtk(s);
  for (const f of s.foes) {
    if (!low(f) || w.hit.includes(f.id) || f.y < y0 - 0.02 || f.y > w.y + 0.01) continue;
    w.hit.push(f.id);
    if (hurt(s, f, dmg, w.aid, { sx: f.x, sy: SHORE, sk: 'horn', pierce: true, pry: true, ky: 0.05 }) === 1) ev(s, 'tidehit', f.x, f.y - f.r);
  }
  if (w.y > BY1 + 0.08) {
    ev(s, 'tideend', 0.5, BY1, act(s, w.aid).n);
    s.tide = null;
  }
}
/** 몸끼리 겹치지 않게 (굴러가는 불가사리·하늘의 놈은 빼고) */
function physics(s: ShellState) {
  const L = s.foes.filter((f) => low(f) && f.k !== 'star');
  for (let i = 0; i < L.length; i++)
    for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j], d = dist(a.x, a.y, b.x, b.y), m = (a.r + b.r) * 0.85;
      if (d >= m || d < 1e-6) continue;
      const ab = ED[a.k].boss, bb = ED[b.k].boss, push = (m - d) * 0.5, ang = angTo(a.x, a.y, b.x, b.y), px = Math.cos(ang) * push, py = Math.sin(ang) * push * YS;
      if (!ab) (a.x -= bb ? px * 2 : px), (a.y -= bb ? py * 2 : py);
      if (!bb) (b.x += ab ? px * 2 : px), (b.y += ab ? py * 2 : py);
    }
  const c = s.crab;
  if (!c.leap && c.alt < 0.02 && !(c.k === 'can' && c.mode === 1)) {
    const cr = crabR(c) * 0.75;
    for (const f of L) {
      const d = dist(c.x, c.y, f.x, f.y), m = cr + f.r * 0.8;
      if (d >= m || d < 1e-6) continue;
      const ang = angTo(c.x, c.y, f.x, f.y), push = m - d;
      if (ED[f.k].boss) (c.x -= Math.cos(ang) * push), (c.y -= Math.sin(ang) * push * YS);
      else (f.x += Math.cos(ang) * push * 0.7), (f.y += Math.sin(ang) * push * 0.7 * YS), (c.x -= Math.cos(ang) * push * 0.3), (c.y -= Math.sin(ang) * push * 0.3 * YS);
    }
    keepIn(c, crabR(c));
  }
  for (const f of L) keepIn(f, f.r);
}

// ───────────────────────────── 판 흐름 ─────────────────────────────
function clearStage(s: ShellState) {
  const d = STAGES[s.stage];
  s.phase = 'result';
  s.pt = 0;
  const star3 = d.star.k === 'fast' ? s.stageT <= d.star.n * 60 : s.star3T >= 0;
  s.starOk = [true, !s.lost, star3];
  s.got = s.starOk.filter(Boolean).length;
  s.stars += s.got;
  s.gain = (s.sp + CLEAR_PTS) * STAR_MUL[s.got];
  s.pts += s.gain;
  s.sp = 0;
  s.lv++;
  see(s, 'lv' + s.lv);
  s.spot = null;
  if (d.boss && s.hearts < 3) s.hearts++;
  if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * 30);
  ev(s, 'clear', 0.5, 0.8, s.got);
}
function advance(s: ShellState) {
  const d = STAGES[s.stage];
  if (s.won) return void ((s.phase = 'end'), (s.pt = 0), ev(s, 'end', 0.5, 0.8, 1));
  if (d.boss && d.ch < PERKS.length && !s.perk[d.ch]) return void ((s.phase = 'pick'), (s.pt = 0), (s.picked = -1), see(s, 'pick' + d.ch), ev(s, 'pickopen', 0.5, 0.8));
  s.stage++;
  newStage(s);
}
function playStep(s: ShellState) {
  const d = STAGES[s.stage];
  s.stageT++;
  crabStep(s);
  if (s.phase !== 'play') return;
  for (const f of s.foes) if (!f.dead) foeStep(s, f);
  if (s.phase !== 'play') return;
  physics(s);
  tossStep(s);
  projStep(s);
  markStep(s);
  tideStep(s);
  surgeStep(s);
  if (s.phase !== 'play') return;
  if (s.foes.some((f) => f.dead)) s.foes = s.foes.filter((f) => !f.dead);
  // 줄 선 떼가 한 마리씩 들어온다
  if (s.inbox.length && --s.gateT <= 0 && s.foes.length < CAP) (s.gateT = 6), admit(s);
  const n = s.foes.length + s.inbox.length;
  if (s.firstTap >= 0 || s.t > 300) s.grpT++;
  if (s.grp < d.groups.length && (n <= d.groups[s.grp].need || s.grpT >= d.groups[s.grp].wait)) spawnGroup(s);
  const busy = s.toss.some((o) => !o.land) || s.proj.some((p) => p.k === 'cannon' || p.k === 'mytorp') || !!s.tide || !!s.crab.leap;
  if (s.grp >= d.groups.length && n === 0 && !busy) {
    if (++s.clearT >= 40) clearStage(s);
  } else s.clearT = 0;
}

const game: GameDef<ShellState> & { wows(s: ShellState): number } = {
  id: 'shellswap',
  name: '🐚 소라게 껍데기',
  genes: ['shellswap', 'chain', 'collect'],
  twist: '껍데기가 곧 내 몸이자 무기 — 톡 한 껍데기로 이사하면 크기·걸음·공격이 통째로 바뀌고, 버린 껍데기는 가장 붐비는 무리로 날아가 쾅',
  rules: [
    '껍데기를 톡 하면 소라게가 쏙 이사해요. 싸움은 껍데기가 저절로 해요.',
    '껍데기마다 공격이 달라요. 버린 껍데기는 붐비는 쪽으로 날아가 쾅!',
    '껍데기가 깨지면 맨몸! 맞기 전에 새 껍데기를 톡.',
  ],
  controls: 'touch',
  hint: '껍데기를 톡 — 소라게가 그 껍데기로 이사해요 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '한낮 썰물 바닷가 — 반짝이는 그림책 해변',
    mood: '파란 바다가 들고 나는 밝은 모래밭에 물결이 껍데기를 실어 오고, 눈이 큰 소라게가 찻주전자·깡통·모래성으로 쏙쏙 이사하며 장난꾸러기들을 쫓아낸다.',
    palette: { bg: '#8fd8f6', ink: '#3b2a20', muted: '#8a7a66', accent: '#2fb6e8', hot: '#ff6b4e', soft: '#fbe9c4' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.hearts,
  cleared: (s) => (s.phase === 'result' ? { stage: s.stage, got: s.got, of: 3 } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, hearts: 3, pts: 0, sp: 0, stars: 0, got: 0, starOk: [false, false, false], dead: false, won: false,
      lv: 1, perk: [0, 0], picked: -1, dex: [], newDex: [], crab: freshCrab('conch', 40), shells: [], foes: [], nid: 0, aid: 0,
      toss: [], proj: [], marks: [], lines: [], tide: null, surge: null, surgeT: 150, grp: 0, grpT: 0, inbox: [], gateT: 0, clearT: 0, stageT: 0, summonT: 0, sumI: 0,
      best: 0, bestThrow: 0, kinds: [], lost: false, swaps: 0, kills: 0, gain: 0, bossDrop: false, bossRode: false, bossDown: false, star3T: -1,
      acts: [], events: [], corpses: [], shards: [], freeze: 0, down: false, restT: 0, wowN: 0, firstTap: -1, firstBig: -1, seen: new Set<string>(),
      banner: null, spot: null, big: null,
    } as ShellState;
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
    if (s.events.length > 110) s.events.splice(0, s.events.length - 110);
    while (s.events.length && s.t - s.events[0].t > 120) s.events.shift();
    if (s.lines.length) s.lines = s.lines.filter((l) => s.t - l.t < 18);
    if (s.corpses.length) s.corpses = s.corpses.filter((c) => s.t - c.t < 44);
    if (s.shards.length) s.shards = s.shards.filter((c) => s.t - c.t < 40);
    if (s.spot && s.t - s.spot.t > 260 && s.spot.label.startsWith('NEW')) s.spot = null;
  },
  over: (s) => s.dead,
  score: (s) => s.pts + s.sp,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const shellswap = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
const tapShell = (o: Shell) => at(o.x, o.y - SD[o.k].r * 0.6);
const canSwap = (s: ShellState) => s.phase === 'play' && !s.down && !s.crab.leap && s.t >= s.restT && s.crab.cry === 0;
/** 결과 화면·둘 중 하나는 버릇 봇도 그냥 넘긴다 */
function between(s: ShellState, left: boolean): Input | null {
  if (s.phase === 'play') return null;
  if (s.down) return NO;
  if (s.phase === 'result') return s.pt >= RES_MIN ? at(0.5, 0.9) : NO;
  if (s.phase === 'pick') return s.picked < 0 && s.pt >= PICK_MIN ? at(left ? 0.28 : 0.72, 0.9) : NO;
  return NO;
}
const PIERCE: SK[] = ['bottle', 'skull', 'rocket', 'horn', 'helmet', 'anchor', 'sub', 'bulb'];
const PRY: SK[] = ['ball', 'horn', 'helmet', 'anchor', 'sub'];
const AIR: SK[] = ['rocket', 'bulb', 'helmet', 'anchor', 'sub'];
const AREA: Record<SK, number> = { conch: 0.45, teapot: 1, can: 1, castle: 0.75, rocket: 0.9, urchin: 1, bottle: 0.95, skull: 0.7, bulb: 1, ball: 0.65, horn: 1, helmet: 1.3, anchor: 1.4, sub: 1.3 };
/** 이 껍데기가 지금 모래밭에서 얼마나 셀까 (어림셈) */
function worth(s: ShellState, k: SK): number {
  const D = SD[k], n = s.foes.length + s.inbox.length;
  let v = 0;
  const one = (e: EK, f: Foe | null) => {
    const E = ED[e];
    let m = D.best === E.tag ? 3 : D.best === 'many' && n >= 8 ? 1.6 : D.best === 'few' && n <= 5 ? 2 : 1;
    if ((E.fly && (!f || f.alt > 0.045) && !(e === 'captain' && s.bossDrop)) && !AIR.includes(k)) m *= 0.3;
    if (e === 'shield' && !PIERCE.includes(k) && !(k === 'urchin')) m *= 0.3;
    if (e === 'clam' && !PRY.includes(k)) m *= 0.3;
    if (e === 'jelly' && ['conch', 'urchin', 'skull', 'ball', 'can'].includes(k)) m *= 0.7;
    if (e === 'star' && !['can', 'horn', 'anchor', 'helmet', 'bulb', 'urchin'].includes(k)) m *= 0.55;
    v += m * AREA[k] * (1 + Math.min(3, E.hp / 50));
  };
  for (const f of s.foes) if (!f.dead) one(f.k, f);
  for (const q of s.inbox.slice(0, 8)) one(q.k, null), (v -= 0.3);
  return v * (D.boss ? 2 : 1);
}
/** 지금 버리면 몇 마리를 맞힐까 */
function throwHits(s: ShellState, k: SK) {
  const R = THROW_R[SD[k].heavy], cl = cluster(s, R, false);
  if (!cl) return 0;
  let n = 0;
  for (const f of s.foes) if (low(f) && dist(cl.x, cl.y, f.x, f.y) <= R + f.r * 0.6 && f.hp <= THROW_D[SD[k].heavy] * lvThrow(s) * (SD[k].best === ED[f.k].tag ? 3 : 1)) n++;
  return n;
}
const smartMem = new WeakMap<object, { key: string; since: number }>();
/** 봇: 지금 놈들 구성에 가장 맞는 껍데기로 — 버릴 껍데기가 많이 맞힐 때 갈아탄다 */
export const shellswapSmart: Bot<ShellState> = {
  name: '맞는 껍데기로 · 붐빌 때 던지기',
  act(s) {
    const mid = between(s, true);
    if (mid) return mid;
    if (!canSwap(s) || !s.shells.length) return NO;
    const c = s.crab, st = STAGES[s.stage].star;
    let best: Shell | null = null, bv = -1e9;
    for (const o of s.shells) {
      let v = worth(s, o.k) * Math.sqrt(Math.max(0.15, o.hp / o.max)) - dist(c.x, c.y, o.x, o.y) * 2;
      if (o.boss) v += 100;
      if (v > bv) (bv = v), (best = o);
    }
    if (!best) return NO;
    if (!c.k) return tapShell(best);
    const cur = worth(s, c.k) * Math.sqrt(Math.max(0.1, c.hp / c.max)), th = throwHits(s, c.k);
    const key = `${s.stage}:${s.swaps}`;
    let m = smartMem.get(s);
    if (!m || m.key !== key) smartMem.set(s, (m = { key, since: s.t }));
    const held = s.t - m.since;
    if (c.boss && c.hp / c.max > 0.2) return NO;
    if (c.hp / c.max < 0.28) return tapShell(best);
    if (st.k === 'throw' && s.star3T < 0 && th >= st.n) return tapShell(best);
    if (bv > cur * 1.3 + 2 && (th >= 2 || held > 50)) return tapShell(best);
    if (th >= 4 && bv > cur * 0.8) return tapShell(best);
    if (held > 400 && bv > cur) return tapShell(best);
    return NO;
  },
};

/** 봇: 아무 때나 아무 데나 톡 */
export const shellswapRandom: Bot<ShellState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    if (s.down) return NO;
    return rng() < 1 / 40 ? at(0.06 + rng() * 0.88, 0.42 + rng() * 0.84) : NO;
  },
};

/** 버릇 봇: 쉼이 끝나고 조금 뒤(맨몸이면 바로) 늘 가장 가까운 껍데기로 */
export const shellswapHabit: Bot<ShellState> = {
  name: '버릇: 늘 가장 가까운 껍데기',
  act(s) {
    const mid = between(s, true);
    if (mid) return mid;
    if (!canSwap(s) || (s.crab.k && s.t < s.restT + 30)) return NO;
    const c = s.crab;
    let best: Shell | null = null, bd = 1e9;
    for (const o of s.shells) if (dist(c.x, c.y, o.x, o.y) < bd) (bd = dist(c.x, c.y, o.x, o.y)), (best = o);
    return best ? tapShell(best) : NO;
  },
};

/** 독립 버릇 봇: 늘 가장 큰 껍데기로 */
export const shellswapHabit2: Bot<ShellState> = {
  name: '버릇: 늘 가장 큰 껍데기',
  act(s) {
    const mid = between(s, false);
    if (mid) return mid;
    if (!canSwap(s) || (s.crab.k && s.t < s.restT + 30)) return NO;
    const c = s.crab;
    let best: Shell | null = null, bv = -1e9;
    for (const o of s.shells) {
      const v = SD[o.k].r * 100 - dist(c.x, c.y, o.x, o.y);
      if (v > bv) (bv = v), (best = o);
    }
    return best ? tapShell(best) : NO;
  },
};
/** 측정·스크린샷용: k판으로 건너뛰기 */
export const __jump = (s: ShellState, k: number, lv = k + 1, perk: number[] = [k > 3 ? 1 : 0, k > 7 ? 1 : 0]) => ((s.stage = k), (s.lv = lv), (s.perk = perk), newStage(s));

// ───────────────────────────── 그리기(임시) ─────────────────────────────
function drawAll(ctx: CanvasRenderingContext2D, s: ShellState, w: number, h: number, _th: Theme) {
  const fx = juice(s);
  void fx;
  ctx.fillStyle = '#f5d894';
  ctx.fillRect(0, 0, w, h);
  for (const f of s.foes) (ctx.fillStyle = '#c33'), ctx.fillRect(f.x * w - 4, f.y * w - 4, 8, 8);
}
