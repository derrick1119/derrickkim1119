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
const YS = 0.84, BX0 = 0.06, BX1 = 0.94, BY0 = 0.585, BY1 = 1.255, SHORE = 0.53;
/** 화면의 놈 상한 · 모래밭 껍데기 최대/최소 · 이사 뒤 쉼 · 들어가서 첫 공격까지 · 처음 10초 · 맨몸 무적 */
const CAP = 24, SH_MAX = 6, REST_T = 30, ENTRY_T = 6, SAFE_T = 600, NAKED_INV = 45;
/** 물결(껍데기 배달): 평소 간격 · 껍데기가 모자랄 때 · 한 번 들고 나는 틱 */
const SURGE_T = 150, SURGE_FAST = 50, SURGE_LEN = 84;
/** 결과 화면: 톡 받기 시작 · 저절로 넘어감 / 둘 중 하나: 톡 받기 시작 · 저절로 고름 · 고른 뒤 */
/** (손을 안 대면 결과·선물 화면에서 기다린다 — 1분을 둬도 잃는 것이 없게) */
const RES_MIN = 90, RES_AUTO = 60 * 60 * 30, PICK_MIN = 40, PICK_AUTO = 60 * 60 * 30, PICK_AFTER = 64, END_T = 210;
const CLEAR_PTS = 30, STAR_MUL = [1, 1, 2, 4], WIN_PTS = 100;
/** 판이 갈수록 점수가 커진다 (k판 점수 × (1 + k)) */
const stageW = (stage: number) => 1 + stage;
/** 톡 판정 반지름(화면 폭 18%) */
const PICK_R = 0.18;
/** 던진 껍데기: 무게(0 작음 · 1 보통 · 2 큼 · 3 대장)마다 쾅 반지름과 힘 */
const THROW_R = [0.095, 0.12, 0.15, 0.21], THROW_D = [18, 26, 40, 90];
/** 연쇄 펑: 반지름(놈 크기에 더함) · 힘 · 늦음(틱) */
const CHAIN_R = 0.075, CHAIN_D = 18, CHAIN_T = 6;

export type SK = 'conch' | 'teapot' | 'can' | 'castle' | 'rocket' | 'urchin' | 'bottle' | 'skull' | 'bulb' | 'ball' | 'horn' | 'helmet' | 'anchor' | 'sub';
type Tag = 'swarm' | 'roll' | 'big' | 'fly' | 'gang' | 'shield' | 'charge' | 'jelly' | 'hide';
interface SDef {
  name: string; verb: string; line: string; r: number; hp: number; spd: number; per: number; dmg: number;
  /** 가장 센 상황: 놈의 꼬리표 · 'few' 몇 놈 안 남았을 때 · 'many' 놈이 많을 때 */
  best: Tag | 'few' | 'many'; heavy: number; armor: number; boss?: boolean; col: string; up: string;
}
export const SD: Record<SK, SDef> = {
  conch: { name: '꼬마 소라', verb: '콕콕!', line: '작고 빨라요. 흩어진 몇 놈을 콕콕 쫓아가요', r: 0.076, hp: 42, spd: 0.0064, per: 14, dmg: 8, best: 'few', heavy: 0, armor: 1, col: '#f7b9a0', up: '흩어진 몇 놈' },
  teapot: { name: '찻주전자', verb: '치이익!', line: '앞으로 김을 칙 — 벼룩 떼를 한꺼번에', r: 0.093, hp: 56, spd: 0.0034, per: 40, dmg: 9, best: 'swarm', heavy: 1, armor: 1, col: '#7fc8f8', up: '벼룩 떼' },
  can: { name: '깡통', verb: '데굴데굴!', line: '데굴데굴 굴러 줄 선 놈들을 볼링처럼', r: 0.085, hp: 62, spd: 0.003, per: 14, dmg: 16, best: 'roll', heavy: 1, armor: 0.9, col: '#e8eef2', up: '줄 지어 구르는 놈' },
  castle: { name: '모래성', verb: '펑!', line: '느리지만 대포 — 큰 놈에게 쾅', r: 0.122, hp: 130, spd: 0.0009, per: 54, dmg: 26, best: 'big', heavy: 2, armor: 0.6, col: '#f2cf8a', up: '큰 놈' },
  rocket: { name: '장난감 로켓', verb: '슈우웅!', line: '하늘로 슝 — 나는 놈을 잡고 쾅 착지', r: 0.088, hp: 46, spd: 0.003, per: 70, dmg: 24, best: 'fly', heavy: 1, armor: 1, col: '#ff6b5b', up: '하늘의 놈' },
  urchin: { name: '성게', verb: '따끔!', line: '가시! 둘러싸일수록 세져요', r: 0.09, hp: 72, spd: 0.0034, per: 22, dmg: 5, best: 'gang', heavy: 1, armor: 0.8, col: '#8a5cc8', up: '둘러싸는 놈' },
  bottle: { name: '유리병', verb: '지이잉!', line: '햇빛을 모아 레이저 — 방패를 뚫어요', r: 0.09, hp: 56, spd: 0.0028, per: 48, dmg: 27, best: 'shield', heavy: 1, armor: 1.2, col: '#7fe0b0', up: '방패 든 놈' },
  skull: { name: '해골', verb: '으스스!', line: '무서워서 둘레가 도망 — 데굴 박치기', r: 0.082, hp: 58, spd: 0.0042, per: 34, dmg: 26, best: 'charge', heavy: 1, armor: 0.9, col: '#f4f0e6', up: '돌진하는 놈' },
  bulb: { name: '전구', verb: '번쩍!', line: '번쩍! 둘레가 기절, 해파리는 줄줄이 펑', r: 0.088, hp: 56, spd: 0.003, per: 66, dmg: 10, best: 'jelly', heavy: 1, armor: 1.15, col: '#fff27a', up: '해파리' },
  ball: { name: '비치볼', verb: '통통!', line: '통통 튕겨 이 놈 저 놈 — 숨은 조개도', r: 0.083, hp: 52, spd: 0.012, per: 10, dmg: 10, best: 'hide', heavy: 0, armor: 1, col: '#ff8fb0', up: '숨은 놈' },
  horn: { name: '대왕 고둥', verb: '뿌우우!', line: '뿌우 — 파도를 불러 모래밭을 싹', r: 0.115, hp: 96, spd: 0.0012, per: 140, dmg: 20, best: 'many', heavy: 2, armor: 0.75, col: '#f6a96b', up: '바글바글할 때' },
  helmet: { name: '선장 투구', verb: '쿵쾅!', line: '대장의 무쇠 투구 — 뿔로 들이받아요', r: 0.129, hp: 260, spd: 0.004, per: 38, dmg: 46, best: 'fly', heavy: 3, armor: 0.45, boss: true, col: '#8d99a8', up: '대장' },
  anchor: { name: '왕 닻', verb: '휘이잉!', line: '대장의 닻 — 빙빙 돌려 싹쓸이', r: 0.129, hp: 280, spd: 0.0024, per: 0, dmg: 15, best: 'big', heavy: 3, armor: 0.45, boss: true, col: '#5b6b7c', up: '대장' },
  sub: { name: '잠망경 잠수함', verb: '어뢰 발사!', line: '대장의 잠수함 — 어뢰가 줄줄이', r: 0.136, hp: 280, spd: 0.0035, per: 34, dmg: 26, best: 'big', heavy: 3, armor: 0.45, boss: true, col: '#ffcf3f', up: '대장' },
};
/** 도감 차례(살아 본 껍데기) */
export const DEX: SK[] = ['conch', 'teapot', 'can', 'castle', 'rocket', 'helmet', 'urchin', 'bottle', 'skull', 'anchor', 'bulb', 'ball', 'horn', 'sub'];

export type EK = 'flea' | 'star' | 'goblin' | 'gull' | 'gang' | 'shield' | 'lobster' | 'jelly' | 'clam' | 'captain' | 'octo' | 'shark';
interface EDef { name: string; tag: Tag; r: number; hp: number; spd: number; dmg: number; rest: number; boss?: boolean; fly?: boolean }
export const ED: Record<EK, EDef> = {
  flea: { name: '모래 벼룩', tag: 'swarm', r: 0.039, hp: 14, spd: 0.0042, dmg: 6, rest: 40 },
  star: { name: '불가사리 굴렁쇠', tag: 'roll', r: 0.049, hp: 24, spd: 0.0082, dmg: 14, rest: 40 },
  goblin: { name: '모래 도깨비', tag: 'big', r: 0.104, hp: 170, spd: 0.0015, dmg: 32, rest: 80 },
  gull: { name: '갈매기', tag: 'fly', r: 0.059, hp: 28, spd: 0.0045, dmg: 14, rest: 120, fly: true },
  gang: { name: '집게 갱', tag: 'gang', r: 0.052, hp: 40, spd: 0.0034, dmg: 10, rest: 54 },
  shield: { name: '방패 게', tag: 'shield', r: 0.063, hp: 60, spd: 0.0022, dmg: 16, rest: 70 },
  lobster: { name: '바닷가재', tag: 'charge', r: 0.076, hp: 80, spd: 0.0018, dmg: 40, rest: 70 },
  jelly: { name: '해파리', tag: 'jelly', r: 0.057, hp: 30, spd: 0.0014, dmg: 8, rest: 44 },
  clam: { name: '숨은 조개', tag: 'hide', r: 0.051, hp: 36, spd: 0, dmg: 14, rest: 200 },
  captain: { name: '해적 갈매기 선장', tag: 'fly', r: 0.112, hp: 800, spd: 0.0022, dmg: 18, rest: 150, boss: true, fly: true },
  octo: { name: '모래성 문어 왕', tag: 'big', r: 0.134, hp: 1400, spd: 0, dmg: 26, rest: 125, boss: true },
  shark: { name: '장난감 상어 잠수함', tag: 'big', r: 0.134, hp: 1700, spd: 0.0022, dmg: 20, rest: 105, boss: true },
};

/** 놈들이 들어오는 곳: 1 바다 · 2 왼쪽 덤불 · 3 오른쪽 덤불 · 4 아래 덤불 · 5 섞어서 */
type From = 1 | 2 | 3 | 4 | 5;
interface Grp { need: number; wait: number; from: From; mons: [EK, number][] }
type StarK = 'pair' | 'multi' | 'throw' | 'kinds' | 'boss';
interface StageDef {
  key: SK; ch: number; name: string; news: string; foe: EK | null; start: SK;
  supply: SK[]; star: { k: StarK; n: number; say?: string }; groups: Grp[]; boss?: EK; bossShell?: SK;
}
export const CHAPTERS = ['썰물 모래밭', '바위 웅덩이', '산호 보물섬'];
const G = (need: number, wait: number, from: From, ...mons: [EK, number][]): Grp => ({ need, wait, from, mons });
/**
 * 판 12개. 첫 떼는 이미 물에서 올라와 있고, 다음 떼는 모래밭이 비는 대로(또는 시간이 되면) 쉴 틈 없이 바다·덤불에서 몰려온다.
 * 사람 기준 한 판 30~45초. 판마다 새 껍데기 하나 + 그 껍데기가 빛날 놈 하나.
 */
export const STAGES: StageDef[] = [
  { key: 'teapot', ch: 0, name: '찻주전자', news: '앞으로 김을 칙 — 벼룩 떼가 한꺼번에', foe: 'flea', start: 'conch', supply: [], star: { k: 'pair', n: 30, say: '찻주전자로 벼룩' },
    groups: [G(0, 0, 1, ['flea', 12]), G(4, 420, 2, ['flea', 10]), G(4, 420, 3, ['flea', 10]), G(4, 420, 1, ['flea', 10])] },
  { key: 'can', ch: 0, name: '깡통', news: '데굴데굴 굴러 줄 선 놈들을 볼링처럼', foe: 'star', start: 'teapot', supply: [], star: { k: 'pair', n: 14, say: '깡통으로 굴렁쇠' },
    groups: [G(0, 0, 1, ['flea', 9]), G(5, 420, 2, ['star', 5]), G(5, 420, 1, ['flea', 10]), G(5, 420, 3, ['star', 6]), G(4, 420, 5, ['star', 5], ['flea', 6])] },
  { key: 'castle', ch: 0, name: '모래성', news: '느리지만 대포 — 큰 도깨비에게 쾅', foe: 'goblin', start: 'can', supply: [], star: { k: 'pair', n: 6, say: '모래성으로 도깨비' },
    groups: [G(0, 0, 1, ['goblin', 1], ['flea', 6]), G(4, 420, 2, ['star', 5]), G(4, 420, 4, ['goblin', 2]), G(4, 420, 1, ['flea', 10], ['goblin', 1]), G(4, 420, 3, ['goblin', 2], ['star', 4])] },
  { key: 'rocket', ch: 0, name: '해적 갈매기 선장', news: '대장! 로켓으로 하늘을 — 투구가 떨어지면 차지해요', foe: 'gull', start: 'castle', supply: [], star: { k: 'boss', n: 1 },
    boss: 'captain', bossShell: 'helmet', groups: [G(0, 0, 1, ['captain', 1], ['gull', 3], ['flea', 6])] },
  { key: 'urchin', ch: 1, name: '성게', news: '가시! 둘러싸일수록 세져요', foe: 'gang', start: 'conch', supply: [], star: { k: 'pair', n: 16, say: '성게로 집게 갱' },
    groups: [G(0, 0, 5, ['gang', 6]), G(4, 420, 1, ['flea', 10]), G(4, 420, 2, ['gang', 6], ['gull', 2]), G(4, 420, 4, ['goblin', 2]), G(4, 420, 3, ['gang', 7]), G(4, 420, 5, ['star', 5], ['gang', 4])] },
  { key: 'bottle', ch: 1, name: '유리병', news: '햇빛 레이저가 방패를 뚫어요', foe: 'shield', start: 'urchin', supply: [], star: { k: 'pair', n: 8, say: '유리병으로 방패 게' },
    groups: [G(0, 0, 1, ['shield', 3], ['flea', 6]), G(4, 420, 2, ['gang', 6]), G(4, 420, 1, ['shield', 4]), G(4, 420, 5, ['flea', 10], ['gull', 2]), G(4, 420, 3, ['shield', 4], ['goblin', 1]), G(4, 420, 4, ['gang', 6], ['shield', 2])] },
  { key: 'skull', ch: 1, name: '해골', news: '으스스 — 돌진하던 바닷가재가 도망쳐요', foe: 'lobster', start: 'bottle', supply: [], star: { k: 'pair', n: 7, say: '해골로 가재' },
    groups: [G(0, 0, 1, ['lobster', 2], ['flea', 6]), G(4, 420, 2, ['shield', 3]), G(4, 420, 3, ['lobster', 3]), G(4, 420, 5, ['gang', 6]), G(4, 420, 1, ['lobster', 2], ['star', 5]), G(4, 420, 4, ['goblin', 1], ['lobster', 2])] },
  { key: 'anchor', ch: 1, name: '모래성 문어 왕', news: '대장! 반쯤 다치면 왕 닻을 떨어뜨려요', foe: null, start: 'skull', supply: [], star: { k: 'boss', n: 1 },
    boss: 'octo', bossShell: 'anchor', groups: [G(0, 0, 1, ['octo', 1], ['gang', 4], ['shield', 2])] },
  { key: 'bulb', ch: 2, name: '전구', news: '번쩍! 기절 — 해파리는 줄줄이 펑', foe: 'jelly', start: 'conch', supply: [], star: { k: 'pair', n: 14, say: '전구로 해파리' },
    groups: [G(0, 0, 1, ['jelly', 7]), G(4, 420, 2, ['lobster', 2], ['gang', 4]), G(4, 420, 1, ['jelly', 7]), G(4, 420, 5, ['gull', 3], ['shield', 3]), G(4, 420, 1, ['jelly', 8]), G(4, 420, 3, ['goblin', 2], ['jelly', 4])] },
  { key: 'ball', ch: 2, name: '비치볼', news: '통통 튕겨 숨은 조개까지', foe: 'clam', start: 'bulb', supply: [], star: { k: 'pair', n: 12, say: '비치볼로 조개' },
    groups: [G(0, 0, 5, ['clam', 6], ['flea', 6]), G(4, 420, 1, ['jelly', 6]), G(4, 420, 5, ['clam', 5], ['star', 5]), G(4, 420, 2, ['goblin', 2], ['gang', 4]), G(4, 420, 5, ['clam', 6]), G(4, 420, 3, ['lobster', 2], ['clam', 3])] },
  { key: 'horn', ch: 2, name: '대왕 고둥', news: '뿌우 — 큰 밀물이 모래밭을 싹', foe: null, start: 'ball', supply: [], star: { k: 'pair', n: 30, say: '대왕 고둥으로' },
    groups: [G(0, 0, 5, ['flea', 8], ['gang', 5], ['jelly', 4]), G(6, 420, 5, ['flea', 8], ['star', 5], ['shield', 2]), G(6, 420, 5, ['gang', 6], ['jelly', 5], ['gull', 3]), G(6, 420, 5, ['flea', 10], ['lobster', 2], ['clam', 4]), G(5, 420, 5, ['goblin', 2], ['flea', 8], ['gang', 5])] },
  { key: 'sub', ch: 2, name: '장난감 상어 잠수함', news: '마지막 대장! 잠망경을 떨어뜨리면 차지해요', foe: null, start: 'horn', supply: [], star: { k: 'boss', n: 1 },
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
const EZ = [0.35, 0.6, 0.8, 0.9, 1, 1.1, 1.2, 1.25, 1.3, 1.35, 1.4, 1.45];

// ───────────────────────────── 상태 ─────────────────────────────
/** 놈 상태: 들어오는 중 · 어슬렁/쫓기 · 뜸 들이기 · 돌진 · 쉼 · 내리꽂기 · 날아오르기 */
const ENTER = 0, IDLE = 1, WIND = 2, DASH = 3, REST = 4, SWOOP = 5, RISE = 6;
interface Foe {
  id: number; k: EK; x: number; y: number; r: number; hp: number; max: number;
  st: number; tm: number; cool: number; ang: number; ax: number; ay: number; et: number; fx0: number; fy0: number;
  vx: number; vy: number; alt: number; stun: number; scared: number; brave: number; open: number; slot: number; cd: number; rid: number;
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
/** 연쇄 펑: 딱 맞게 쓰러진 놈은 몇 틱 뒤 터져 둘레의 같은 무리를 친다 */
interface Pop { t: number; x: number; y: number; r: number; sk: SK; aid: number; dmg: number; tag: Tag }
interface Surge { t: number; depth: number; drop: number; x: number }
/** 한 번(이사 한 번·공격 한 번): 쓰러뜨린 수 · 그중 딱 맞게 쓰러뜨린 수 · 던진 껍데기로 딱 맞게 */
interface Act { id: number; n: number; mn: number; t: number; swap: boolean; thrown: number }
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
  /** 무서운 껍데기로 대장을 쓰러뜨렸나 · 이사하며 고른 껍데기에 처음 들어간 틱(이름표) */
  bossByShell: boolean; tagT: number;
  /** 이 판의 새 껍데기로 이 판의 새 놈을 쓰러뜨린 수 (별 셋째) */
  pairKills: number;
  bossDrop: boolean; bossRode: boolean; bossDown: boolean; star3T: number;
  acts: Act[]; pops: Pop[]; events: Ev[]; corpses: Corpse[]; shards: Shard[];
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
/** 안 맞는 껍데기도 제 몫은 한다 (맞는 껍데기는 두 배 + 연쇄 펑 + 큰 연출) */
const UNM = 0.85;
/** 어울리는 껍데기인가: 꼬리표가 같으면 두 배 · 대장 껍데기는 무엇에든 두 배 · 고둥은 놈이 많을 때 두 배 · 꼬마 소라는 몇 놈 안 남았을 때 두 배 */
function matchMul(s: ShellState, k: SK, f: Foe) {
  const b = SD[k].best;
  if (SD[k].boss) return 2;
  if (b === ED[f.k].tag) return 2;
  if (b === 'many') return alive(s) + s.inbox.length >= 10 ? 2 : UNM;
  if (b === 'few') return alive(s) <= 5 && !s.inbox.length ? 2 : UNM;
  return UNM;
}

/** 큰 순간: 처음 들어간 껍데기는 가운데 큰 띠, 나머지(한 번에 여럿 · 대장)는 그 자리의 큰 숫자 */
function wow(s: ShellState, text: string, n = 0, k: SK | null = null, band = false) {
  s.wowN++;
  if (s.firstBig < 0 && s.firstTap >= 0) s.firstBig = s.t;
  if (band) s.big = { text, t: s.t, n, star: false, k };
  s.freeze = Math.max(s.freeze, band ? 5 : 3);
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
  const a = { id, n: 0, mn: 0, t: s.t, swap: false, thrown: 0 };
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
    else if (from === 2) (x = BX0 + 0.04 + r() * 0.22), (y = BY0 + 0.06 + r() * 0.48), (ox = -0.07), (oy = y + (r() - 0.5) * 0.1);
    else if (from === 3) (x = BX1 - 0.04 - r() * 0.22), (y = BY0 + 0.06 + r() * 0.48), (ox = 1.07), (oy = y + (r() - 0.5) * 0.1);
    else (x = 0.14 + r() * 0.72), (y = BY1 - 0.2 + r() * 0.15), (ox = x + (r() - 0.5) * 0.12), (oy = 1.33);
    if (dist(x, y, c.x, c.y) > 0.2 || k > 6) return [x, y, ox, oy];
  }
}
function addFoe(s: ShellState, k: EK, x: number, y: number, from: number, ox = x, oy = y): Foe {
  const d = ED[k], hp = Math.round(d.hp * (d.boss ? 1 : 1 + 0.05 * s.stage));
  const f: Foe = {
    id: ++s.nid, k, x, y, r: d.r, hp, max: hp, st: from ? ENTER : IDLE, tm: 0, cool: 40 + Math.floor(s.rng() * 70), ang: 0, ax: x, ay: y, et: 1, fx0: x, fy0: y,
    vx: 0, vy: 0, alt: d.fly ? 0.15 + s.rng() * 0.04 : 0, stun: 0, scared: 0, brave: 0, open: -Math.floor(s.rng() * 120), slot: s.nid * 2.4, cd: 0, rid: 0,
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
        const bx = 0.5, by = k === 'octo' ? BY0 + 0.02 : k === 'shark' ? BY0 + 0.04 : BY0 + 0.14;
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
        const x = clamp(cx0 + Math.cos(a) * q, 0.1, 0.9), y = clamp(cy0 + Math.sin(a) * q * YS, BY0 + 0.01, BY0 + 0.32);
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
/** 지금까지 풀린 껍데기 (대장 껍데기 빼고) + 다음 판의 새 껍데기 하나(미리 보기) */
export function unlocked(stage: number): SK[] {
  const L: SK[] = ['conch'];
  for (let i = 0; i <= Math.min(STAGES.length - 1, stage + 1); i++) for (const k of [STAGES[i].key, STAGES[i].start]) if (!SD[k].boss && !L.includes(k)) L.push(k);
  return L;
}
/** 물결이 가져올 껍데기: 모래밭에 없는 것만 (늘 서로 다른 것) — 이 판의 새 껍데기 2 · 나머지 1 · 지금 입은 것은 되도록 빼고 */
function pickKind(s: ShellState): SK | null {
  const d = STAGES[s.stage], ok: [SK, number][] = [];
  let tot = 0;
  for (const k of unlocked(s.stage)) {
    if (s.shells.some((o) => o.k === k) || s.toss.some((o) => o.land && o.k === k)) continue;
    const w = (k === d.key ? 2 : 1) * (k === s.crab.k ? 0.15 : 1);
    ok.push([k, w]);
    tot += w;
  }
  let r = s.rng() * tot;
  for (const [k, w] of ok) if ((r -= w) <= 0) return k;
  return ok.length ? ok[0][0] : null;
}
function newShell(s: ShellState, k: SK, x: number, y: number, wash: boolean, hp = -1): Shell {
  const max = Math.round(SD[k].hp * lvHp(s));
  const sh: Shell = { id: ++s.nid, k, x, y, hp: hp < 0 ? max : Math.min(max, hp), max, born: s.t, tilt: (s.rng() < 0.5 ? -1 : 1) * (0.28 + s.rng() * 0.2), sx: x, sy: wash ? SHORE + 0.005 : y, inT: wash ? 24 + Math.round((y - SHORE) * 30) : 0, boss: !!SD[k].boss };
  s.shells.push(sh);
  if (!s.seen.has('sh:' + k)) see(s, 'sh:' + k);
  return sh;
}
function surgeStep(s: ShellState) {
  if (s.surge && ++s.surge.t >= SURGE_LEN) s.surge = null;
  const n = s.shells.filter((o) => !o.boss).length, want = Math.min(3, unlocked(s.stage).length - 1);
  if (n < want && s.surgeT > SURGE_FAST) s.surgeT = SURGE_FAST;
  if (s.surge || --s.surgeT > 0) return;
  s.surgeT = SURGE_T;
  const depth = BY0 + 0.14 + s.rng() * 0.3, drop = n < want ? 2 : 1;
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
    const k = pickKind(s);
    if (!k) break;
    const [x, y] = freeSpot(s, 0.14, 0.11, depth);
    newShell(s, k, x, y, true);
  }
  ev(s, 'surge', 0.5, SHORE, drop);
}

// ───────────────────────────── 판 시작 ─────────────────────────────
function freshCrab(k: SK | null, hp: number): Crab {
  return {
    x: 0.5, y: 1.07, k, hp, max: hp, boss: false, face: 1, mode: 0, mt: 0, atk: 30, ang: -Math.PI / 2, tx: 0.5, ty: 0.8, alt: 0, vx: 0, vy: 0,
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
  s.pops = [];
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
  s.bossByShell = false;
  s.tagT = -99;
  s.pairKills = 0;
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
  if (!SD[d.key].boss) spot = newShell(s, d.key, kx, 1.0, false);
  for (let i = 0; i < (spot ? 2 : 3); i++) {
    const k = s.stage === 0 ? (i ? 'conch' : 'can') : pickKind(s);
    if (!k) break;
    const [x, y] = s.stage === 0 ? (i ? [0.2, 1.12] : [0.25, 0.8]) : freeSpot(s, 0.17, 0.15);
    newShell(s, k, x, y, false);
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
/** own: 지금 입은 껍데기의 공격(안 맞는 놈을 쓰러뜨리면 딱 연속이 끊긴다) */
interface Hit { sx: number; sy: number; sk: SK | null; own?: boolean; air?: boolean; pierce?: boolean; pry?: boolean; melee?: boolean; kx?: number; ky?: number }
function kill(s: ShellState, f: Foe, aid: number, mul: number, sk: SK | null = null, own = false) {
  if (f.dead) return;
  f.dead = true;
  s.kills++;
  const a = act(s, aid);
  a.n++;
  a.t = s.t;
  // 딱 맞는 껍데기로 쓰러뜨리면 한 번에 딱 n번째는 ⌈n²/4⌉점의 두 배, 아니면 1점
  // 한 번(이사 한 번·공격 한 번)에 n번째로 쓰러진 놈은 ⌈n²/4⌉점, 어울리는 껍데기면 세 배
  const hit = mul >= 1.5;
  if (hit) a.mn++;
  const pts = Math.round((hit ? Math.ceil((a.n * a.n) / 4) * 3 : 1) * stageW(s.stage));
  s.sp += pts;
  if (a.n > s.best) s.best = a.n;
  if (a.n === 6) wow(s, '', a.n);
  ev(s, 'kill', f.x, f.y - f.r, a.n, pts, mul, f.k);
  s.corpses.push({ k: f.k, x: f.x, y: f.y, t: s.t, how: ED[f.k].boss ? 2 : f.k === 'jelly' ? 1 : 0, vx: f.x - s.crab.x, vy: f.y - s.crab.y, seed: f.seed });
  if (s.corpses.length > 26) s.corpses.shift();
  const sd = STAGES[s.stage];
  if (hit && sk === sd.key && (!sd.foe || f.k === sd.foe)) s.pairKills++;
  if (ED[f.k].boss) {
    // 무서운 껍데기를 입은 채로 쓰러뜨려야 별 (던진 투구가 우연히 맞은 것은 빼고)
    if (sk && SD[sk].boss && own) s.bossByShell = true;
    bossDown(s, f, aid);
  } else if (hit && sk) s.pops.push({ t: s.t + CHAIN_T, x: f.x, y: f.y, r: CHAIN_R + f.r, sk, aid, dmg: Math.max(CHAIN_D * lvAtk(s), f.max * 0.8), tag: ED[f.k].tag });
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
  if (m >= 1.5 && s.t - f.hurtT > 10) ev(s, 'match', f.x, f.y - f.r, Math.round(m * 10));
  if (!ED[f.k].boss && (o.kx || o.ky)) {
    const res = f.k === 'goblin' ? 0.35 : 1;
    f.x += (o.kx ?? 0) * res;
    f.y += (o.ky ?? 0) * res;
    if (f.k !== 'star') keepIn(f, f.r);
  }
  if (f.hp <= 0) return kill(s, f, aid, m, o.sk, !!o.own), 2;
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
  const ok = st.k === 'pair' ? s.pairKills >= st.n : st.k === 'multi' ? s.best >= st.n : st.k === 'throw' ? s.bestThrow >= st.n : st.k === 'kinds' ? s.kinds.length >= st.n : s.bossByShell;
  if (!ok) return;
  s.star3T = s.t;
  ev(s, 'star3', s.crab.x, s.crab.y - 0.1, st.n);
  s.wowN++;
}
const starWord = (st: { k: StarK; n: number; say?: string }) =>
  st.k === 'pair' ? `${st.say} ${st.n}마리` : st.k === 'multi' ? `한 번에 ${st.n}마리` : st.k === 'throw' ? `던진 껍데기로 한 번에 ${st.n}마리` : st.k === 'kinds' ? `껍데기 ${st.n}가지로 이사` : '무서운 껍데기로 대장 쾅';

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
    const resist = !from || c.boss ? 1 : SD[c.k].best === ED[from.k].tag ? 0.6 : 1;
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
  const d = dist(c.x, c.y, sh.x, sh.y), T = Math.round(clamp(7 + d * 18, 8, 15));
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
  if (!s.kinds.includes(k)) s.kinds.push(k), checkStar3(s);
  s.tagT = s.t;
  const fresh = !s.dex.includes(k);
  if (fresh) s.dex.push(k), s.newDex.push(k);
  if (sh.boss) {
    s.bossRode = true;
    for (const f of s.foes) if (low(f) && !ED[f.k].boss) f.scared = Math.max(f.scared, 100);
    ev(s, 'bossshell', c.x, c.y, 0, 0, 0, k);
    see(s, 'boss:' + k);
  }
  if (fresh) wow(s, `${D.name} 소라게!`, 0, k, true);
  // 장 끝 선물: 진주 폭죽 · 소용돌이
  if (s.perk[0] === 1) {
    area(s, c.x, c.y, 0.13, 14 * lvThrow(s), c.aid, { sx: c.x, sy: c.y, sk: k, pierce: true });
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
    // 버린 껍데기는 언제나 쾅(맞은 놈은 어질어질) — 어울리는 무리에 떨어지면 더 넓게 두 배 + 연쇄
    const n0 = act(s, o.aid).n, fit = s.foes.some((f) => low(f) && dist(o.x1, o.y1, f.x, f.y) <= o.r + f.r * 0.6 && matchMul(s, o.k, f) >= 1.5), R = o.r * (fit ? 1.3 : 1);
    let kills = 0;
    for (const f of s.foes) {
      if (!live(f) || (f.alt > 0.045 && !o.boss) || dist(o.x1, o.y1, f.x, f.y) > R + f.r * 0.6) continue;
      const m = matchMul(s, o.k, f), a = angTo(o.x1, o.y1, f.x, f.y);
      if (!ED[f.k].boss) f.stun = Math.max(f.stun, 36);
      if (hurt(s, f, o.dmg * (m < 1.5 ? 0.7 / UNM : 1), o.aid, { sx: o.x1, sy: o.y1 - 0.3, sk: o.k, pierce: true, air: o.boss, kx: Math.cos(a) * 0.035, ky: Math.sin(a) * 0.035 * YS }) === 2) kills++;
    }
    const a = act(s, o.aid);
    a.thrown += a.n - n0;
    if (a.thrown > s.bestThrow) s.bestThrow = a.thrown;
    ev(s, 'bang', o.x1, o.y1, kills, SD[o.k].heavy, fit ? 1 : 0, o.k);
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
        hurt(s, f, dmg, aidFor(s, c), { sx: c.x, sy: c.y, sk: 'conch', own: true, melee: true });
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
        for (const f of s.foes) if (low(f) && inCone(c, f, c.ang, TEA_LEN, TEA_HALF)) (n += hurt(s, f, dmg, aid, { sx: c.x, sy: c.y, sk: 'teapot', own: true, kx: Math.cos(c.ang) * 0.02, ky: Math.sin(c.ang) * 0.02 * YS }) ? 1 : 0);
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
          hurt(s, f, dmg, c.chain, { sx: c.x, sy: c.y, sk: 'can', own: true, melee: true, kx: Math.cos(c.ang + side * 1.2) * 0.045, ky: Math.sin(c.ang + side * 1.2) * 0.045 * YS });
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
          hurt(s, f, dmg, c.chain, { sx: c.x, sy: c.y, sk: 'rocket', own: true, air: true });
          ev(s, 'airhit', f.x, f.y - f.alt * 0.9);
        }
        if (c.mt >= T) {
          c.alt = 0;
          c.mode = 0;
          c.atk = D.per;
          const r = area(s, c.x, c.y, 0.15, dmg * 0.7, c.chain, { sx: c.x, sy: c.y, sk: 'rocket', own: true, pierce: true }, 0.04);
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
          for (const f of s.foes) if (low(f) && dist(c.x, c.y, f.x, f.y) <= D.r + f.r + 0.035) hurt(s, f, dmg * mul, aid, { sx: c.x, sy: c.y, sk: 'urchin', own: true, pierce: n >= 3, melee: true });
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
          if (u >= 0 && u <= 0.85 && Math.abs(-ox * sn + oy * cs) <= 0.035 + f.r * 0.7) n += hurt(s, f, dmg, aid, { sx: c.x, sy: c.y, sk: 'bottle', own: true, pierce: true }) ? 1 : 0;
        }
        const L = rayLen(c.x, c.y - D.r * 0.5, c.ang);
        s.lines.push({ k: 0, x0: c.x, y0: c.y - D.r * 0.5, x1: c.x + cs * L, y1: c.y - D.r * 0.5 + sn * L * YS, t: s.t });
        ev(s, 'beam', c.x, c.y - D.r * 0.5, n, c.ang);
      }
      break;
    }
    case 'skull': {
      for (const f of s.foes) if (low(f) && !ED[f.k].boss && dist(c.x, c.y, f.x, f.y) < FEAR_R + f.r) {
        // 한 번 질겁하면 한동안 도망치고, 그 뒤 잠깐은 다시 덤빈다 (돌진하는 놈은 더 오래 겁먹는다)
        if (f.scared > 0 || f.brave > s.t) continue;
        const T = ED[f.k].tag === 'charge' ? 90 : 40;
        f.scared = T;
        f.brave = s.t + T + 140;
        ev(s, 'scare', f.x, f.y - f.r * 2);
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
        step2(c, s, c.ang, 0.018);
        c.spin += 0.4 * c.face;
        for (const f of s.foes) {
          if (!low(f) || c.hits.includes(f.id) || dist(c.x, c.y, f.x, f.y) > D.r * 0.8 + f.r) continue;
          c.hits.push(f.id);
          hurt(s, f, dmg, c.chain, { sx: c.x, sy: c.y, sk: 'skull', own: true, melee: true, pierce: true, kx: Math.cos(c.ang) * 0.06, ky: Math.sin(c.ang) * 0.06 * YS });
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
          if (!ED[f.k].boss) f.stun = Math.max(f.stun, f.k === 'jelly' ? 70 : 34);
          if (f.alt > 0.045 && !ED[f.k].boss) f.alt = 0.03;
          const r = hurt(s, f, dmg, aid, { sx: c.x, sy: c.y, sk: 'bulb', own: true, air: true, pierce: true });
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
        hurt(s, f, dmg, c.tx, { sx: c.x, sy: c.y, sk: 'ball', own: true, pry: true, melee: true, kx: (f.x - c.x) * 0.3, ky: (f.y - c.y) * 0.3 });
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
      moveTo(c, s, 0.5, 1.12, spd, 0.05);
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
          hurt(s, f, dmg, c.chain, { sx: c.x, sy: c.y, sk: 'helmet', own: true, air: true, pierce: true, pry: true, kx: Math.cos(c.ang) * 0.08, ky: Math.sin(c.ang) * 0.08 * YS });
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
        hurt(s, f, dmg, c.chain, { sx: hx, sy: hy, sk: 'anchor', own: true, air: true, pierce: true, pry: true, kx: Math.cos(a) * 0.05, ky: Math.sin(a) * 0.05 * YS });
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
  ay += (0.95 - c.y) * 0.5;
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
        // 내리꽂아(24틱) 낮게 머물며 쪼고(30틱) 다시 오른다 — 낮을 때는 누구나 때린다
        f.tm++;
        f.x += (f.ax - f.x) * 0.1;
        f.y += (f.ay - f.y) * 0.1;
        f.alt = Math.max(0.012, 0.15 * (1 - f.tm / 24));
        if (f.tm === 30) {
          f.atkT = s.t;
          if (dist(f.x, f.y, tx, ty) < 0.07 + cr * 0.5) hurtCrab(s, D.dmg, f.x, f.y, f);
          ev(s, 'peck', f.x, f.y);
        }
        if (f.tm >= 54) (f.st = RISE), (f.tm = 0);
      } else if (f.st === RISE) {
        f.tm++;
        f.alt = Math.min(0.15, f.alt + 0.006);
        walkF(s, f, f.slot, D.spd);
        keepIn(f, f.r);
        if (f.alt >= 0.15) (f.st = IDLE), (f.cool = (alive(s) <= 4 ? 40 : D.rest) + Math.floor(s.rng() * 50));
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
        const px = 0.5 + Math.cos(f.slot) * 0.3, py = BY0 + 0.12 + Math.sin(f.slot * 2) * 0.06;
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
  const [x, y] = freeSpot(s, 0.14, 0.16, 1.15);
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
  wow(s, '', act(s, aid).n);
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
        const r = area(s, tg.x, tg.y, p.r, p.dmg, p.aid, { sx: p.x, sy: p.y, sk: 'sub', own: true, air: true, pierce: true, pry: true }, 0.03);
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
      const r = area(s, p.x1, p.y1, p.r, p.dmg, p.aid, { sx: s.crab.x, sy: s.crab.y, sk: 'castle', own: true }, 0.03);
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
    if (hurt(s, f, dmg, w.aid, { sx: f.x, sy: SHORE, sk: 'horn', own: true, pierce: true, pry: true, ky: 0.05 }) === 1) ev(s, 'tidehit', f.x, f.y - f.r);
  }
  if (w.y > BY1 + 0.08) {
    ev(s, 'tideend', 0.5, BY1, act(s, w.aid).n);
    s.tide = null;
  }
}
function popStep(s: ShellState) {
  if (!s.pops.length) return;
  for (const q of s.pops) {
    if (q.t > s.t) continue;
    let n = 0;
    for (const f of s.foes) if (low(f) && !ED[f.k].boss && ED[f.k].tag === q.tag && dist(q.x, q.y, f.x, f.y) <= q.r + f.r * 0.6) n += hurt(s, f, q.dmg, q.aid, { sx: q.x, sy: q.y, sk: q.sk, pierce: true, pry: true }) === 2 ? 1 : 0;
    ev(s, 'chain', q.x, q.y, act(s, q.aid).mn, n, 0, q.sk);
  }
  s.pops = s.pops.filter((q) => q.t > s.t);
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
  const star3 = d.star.k === 'boss' ? s.bossByShell : s.star3T >= 0;
  s.starOk = [true, !s.lost, star3];
  s.got = s.starOk.filter(Boolean).length;
  s.stars += s.got;
  s.gain = (s.sp + Math.round(CLEAR_PTS * stageW(s.stage))) * STAR_MUL[s.got];
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
  popStep(s);
  surgeStep(s);
  if (s.phase !== 'play') return;
  if (s.foes.some((f) => f.dead)) s.foes = s.foes.filter((f) => !f.dead);
  // 줄 선 떼가 한 마리씩 들어온다
  if (s.inbox.length && --s.gateT <= 0 && s.foes.length < CAP) (s.gateT = 6), admit(s);
  const n = s.foes.length + s.inbox.length;
  if (s.firstTap >= 0 || s.t > 300) s.grpT++;
  if (s.grp < d.groups.length && (n <= d.groups[s.grp].need || s.grpT >= d.groups[s.grp].wait)) spawnGroup(s);
  const busy = s.toss.some((o) => !o.land) || s.pops.length > 0 || s.proj.some((p) => p.k === 'cannon' || p.k === 'mytorp') || !!s.tide || !!s.crab.leap;
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
      best: 0, bestThrow: 0, bossByShell: false, tagT: -99, pairKills: 0, kinds: [], lost: false, swaps: 0, kills: 0, gain: 0, bossDrop: false, bossRode: false, bossDown: false, star3T: -1,
      acts: [], pops: [], events: [], corpses: [], shards: [], freeze: 0, down: false, restT: 0, wowN: 0, firstTap: -1, firstBig: -1, seen: new Set<string>(),
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
/** 이 껍데기가 지금 모래밭에서 얼마나 셀까 (어림셈): 놈마다 (딱 맞는 힘 × 범위 × 단단함) × 위험(초당 피해) */
function worth(s: ShellState, k: SK): number {
  const D = SD[k], n = s.foes.length + s.inbox.length;
  let v = 0;
  const one = (e: EK, f: Foe | null, w: number) => {
    const E = ED[e];
    let m = D.boss ? 2 : D.best === E.tag ? 2 : D.best === 'many' ? (n >= 10 ? 2 : UNM) : D.best === 'few' ? (n <= 5 ? 2 : UNM) : UNM;
    if (E.fly && (!f || f.alt > 0.045) && !(e === 'captain' && s.bossDrop) && !AIR.includes(k)) m *= 0.3;
    if (e === 'shield' && !PIERCE.includes(k)) m *= 0.3;
    if (e === 'clam' && !PRY.includes(k)) m *= 0.3;
    if (e === 'jelly' && ['conch', 'urchin', 'skull', 'ball', 'can'].includes(k)) m *= 0.7;
    const danger = 1 + ((E.dmg / E.rest) * 60) / 8;
    v += w * m * AREA[k] * (1 + Math.min(3, E.hp / 50)) * danger * (D.best === E.tag ? 1.3 : 1);
  };
  for (const f of s.foes) if (!f.dead) one(f.k, f, 1);
  for (const q of s.inbox.slice(0, 8)) one(q.k, null, 0.5);
  return v * (D.boss ? 2 : 1);
}
/** 지금 버리면 몇 마리를 쓰러뜨릴까 (어울리는 무리면 더 넓게 두 배) */
function throwHits(s: ShellState, k: SK) {
  const R0 = THROW_R[SD[k].heavy], cl = cluster(s, R0, false);
  if (!cl) return 0;
  const fit = s.foes.some((f) => low(f) && dist(cl.x, cl.y, f.x, f.y) <= R0 + f.r * 0.6 && SD[k].best === ED[f.k].tag), R = R0 * (fit ? 1.3 : 1);
  let n = 0;
  for (const f of s.foes) if (low(f) && dist(cl.x, cl.y, f.x, f.y) <= R + f.r * 0.6 && f.hp <= THROW_D[SD[k].heavy] * lvThrow(s) * (SD[k].best === ED[f.k].tag ? 2 : 1)) n++;
  return n;
}
/** 지금 가장 위험한 무리(꼬리표마다: 수 × 단단함 × 초당 피해 × 가까움) */
function threats(s: ShellState): [string, number][] {
  const c = s.crab, th: Record<string, number> = {};
  for (const f of s.foes) {
    if (f.dead) continue;
    const E = ED[f.k], d = dist(c.x, c.y, f.x, f.y);
    const w = (1 + Math.min(3, f.hp / 50)) * (1 + ((E.dmg / E.rest) * 60) / 8) / (1 + d * 2.5) * (E.boss ? 3 : 1) * (f.st === ENTER ? 0.6 : 1);
    th[E.tag] = (th[E.tag] ?? 0) + w;
  }
  for (const q of s.inbox.slice(0, 6)) th[ED[q.k].tag] = (th[ED[q.k].tag] ?? 0) + 0.25;
  const n = s.foes.length + s.inbox.length;
  if (n >= 10) th.many = Object.values(th).reduce((a, b) => a + b, 0) * 0.55;
  if (n && n <= 5 && !s.inbox.length) th.few = Object.values(th).reduce((a, b) => a + b, 0) * 0.5;
  return Object.entries(th).sort((a, b) => b[1] - a[1]);
}
/** 꼬리표에 맞는 껍데기 중 가장 튼튼하고 가까운 것 */
function counter(s: ShellState, tag: string): Shell | null {
  let b: Shell | null = null, bv = -1e9;
  for (const o of s.shells) {
    if (SD[o.k].best !== tag) continue;
    const v = o.hp / o.max - dist(s.crab.x, s.crab.y, o.x, o.y) * 0.3;
    if (v > bv) (bv = v), (b = o);
  }
  return b;
}
const smartMem = new WeakMap<object, { key: string; since: number }>();
/** 봇: 지금 가장 위험한 무리에 딱 맞는 껍데기로 — 맞는 게 없으면 어림셈이 가장 센 것 */
export const shellswapSmart: Bot<ShellState> = {
  name: '가장 위험한 무리에 딱 맞는 껍데기로',
  act(s) {
    const mid = between(s, true);
    if (mid) return mid;
    if (!canSwap(s) || !s.shells.length) return NO;
    const c = s.crab, st = STAGES[s.stage].star, boss = s.shells.find((o) => o.boss);
    if (boss && !(c.boss && c.hp / c.max > 0.25)) return tapShell(boss);
    if (c.boss && c.hp / c.max > 0.2) return NO;
    const T = threats(s);
    if (!T.length) return NO;
    // 별 셋째(이 판의 새 껍데기로 이 판의 새 놈)를 노린다: 그 놈이 있는 동안 새 껍데기를 차지하고 붙든다
    const sd = STAGES[s.stage];
    if (st.k === 'pair' && s.pairKills < st.n && s.foes.some((f) => live(f) && (!sd.foe || f.k === sd.foe))) {
      if (c.k === sd.key && c.hp / c.max > 0.3) return NO;
      const o = s.shells.find((q) => q.k === sd.key);
      if (o) return tapShell(o);
    }
    // 지금 껍데기가 가장 위험한 무리(또는 그와 비슷한 무리)에 맞으면 그대로
    const curTag = c.k ? SD[c.k].best : '';
    const topV = T[0][1];
    const curV = T.find(([t]) => t === curTag)?.[1] ?? 0;
    const key = `${s.stage}:${s.swaps}`;
    let m = smartMem.get(s);
    if (!m || m.key !== key) smartMem.set(s, (m = { key, since: s.t }));
    const low = !!c.k && c.hp / c.max < 0.3;
    // 지금 껍데기를 던지면 크게 쾅(어울리는 무리 한가운데)이고 다른 위험에 맞는 껍데기가 있으면 갈아탄다
    const th = c.k ? throwHits(s, c.k) : 0;
    if (c.k && th >= (st.k === 'throw' && s.star3T < 0 ? st.n : 5)) {
      for (const [tag] of T) {
        if (tag === curTag) continue;
        const o = counter(s, tag);
        if (o) return tapShell(o);
      }
      if (st.k === 'throw' && s.star3T < 0) {
        const alt = s.shells.find((o) => o.k !== c.k);
        if (alt) return tapShell(alt);
      }
    }
    if (c.k && !low && curV >= topV * 0.6 && curV > 0) return NO;
    for (const [tag, v] of T) {
      if (v < topV * 0.35) break;
      if (tag === curTag && !low) return NO;
      const o = counter(s, tag);
      if (o) return tapShell(o);
    }
    if (!c.k || low) {
      let best: Shell | null = null, bv = -1e9;
      for (const o of s.shells) {
        const v = worth(s, o.k) * Math.sqrt(Math.max(0.15, o.hp / o.max));
        if (v > bv) (bv = v), (best = o);
      }
      return best ? tapShell(best) : NO;
    }
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
/** 채우고 테두리 */
function ink(g: C2, fill: string | CanvasGradient, lw = LW, stroke = OUT) {
  g.fillStyle = fill;
  g.fill();
  if (lw > 0) (g.strokeStyle = stroke), (g.lineWidth = lw), g.stroke();
}
function shine(g: C2, x: number, y: number, rx: number, ry: number, rot = -0.5, a = 0.5) {
  g.fillStyle = `rgba(255,255,255,${a})`;
  ell(g, x, y, rx, ry, rot);
  g.fill();
}

// ───────────────────────────── 그리기: 얼굴 ─────────────────────────────
/** 표정: 평소 · 화남(뜸) · 아야 · 질겁 · 어질 · 신남 */
const F_IDLE = 0, F_ANGRY = 1, F_HURT = 2, F_SCARED = 3, F_DIZZY = 4, F_HAPPY = 5;
/** 두 눈과 입: (cx,cy) 두 눈 사이 · e 눈 간격 절반 · s 눈 크기 · my 입까지(0이면 입 없음) */
function face(g: C2, cx: number, cy: number, e: number, s: number, mood: number, my: number, mw = 1) {
  g.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const x = cx + sd * e, y = cy;
    if (mood === F_HURT) {
      g.strokeStyle = OUT;
      g.lineWidth = s * 0.36;
      g.beginPath();
      g.moveTo(x - sd * s * 0.7, y - s * 0.6);
      g.lineTo(x + sd * s * 0.5, y);
      g.lineTo(x - sd * s * 0.7, y + s * 0.6);
      g.stroke();
    } else if (mood === F_DIZZY) {
      g.strokeStyle = OUT;
      g.lineWidth = s * 0.26;
      g.beginPath();
      for (let i = 0; i <= 14; i++) {
        const a = i * 0.75, q = s * (0.12 + i * 0.058);
        if (i) g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
        else g.moveTo(x + q, y);
      }
      g.stroke();
    } else if (mood === F_HAPPY) {
      g.strokeStyle = OUT;
      g.lineWidth = s * 0.36;
      g.beginPath();
      g.arc(x, y + s * 0.3, s * 0.7, Math.PI * 1.12, Math.PI * 1.88);
      g.stroke();
    } else {
      const big = mood === F_SCARED ? 1.25 : 1;
      ell(g, x, y, s * 0.86 * big, s * big);
      ink(g, '#ffffff', s * 0.2);
      const pr = mood === F_SCARED ? 0.26 : 0.46;
      ell(g, x + s * 0.12, y + s * 0.08, s * pr, s * pr * 1.2);
      g.fillStyle = '#2a1a12';
      g.fill();
      ell(g, x - s * 0.06, y - s * 0.18, s * 0.17, s * 0.2);
      g.fillStyle = '#ffffff';
      g.fill();
      if (mood === F_ANGRY) {
        g.strokeStyle = OUT;
        g.lineWidth = s * 0.42;
        g.beginPath();
        g.moveTo(x + sd * s * 1.05, y - s * 1.55);
        g.lineTo(x - sd * s * 0.75, y - s * 0.95);
        g.stroke();
      }
    }
  }
  if (my <= 0) return;
  const y = cy + my, w = s * 1.2 * mw;
  g.strokeStyle = OUT;
  g.lineWidth = s * 0.3;
  if (mood === F_ANGRY) {
    ell(g, cx, y + s * 0.2, w * 0.7, s * 0.55);
    ink(g, '#8c2f2f', s * 0.24);
    g.fillStyle = '#ffffff';
    g.fillRect(cx - w * 0.5, y - s * 0.3, w, s * 0.28);
  } else if (mood === F_HURT || mood === F_SCARED) {
    ell(g, cx, y + s * 0.15, s * 0.42, s * 0.55);
    ink(g, '#8c2f2f', s * 0.24);
  } else if (mood === F_DIZZY) {
    g.beginPath();
    g.moveTo(cx - w, y);
    g.quadraticCurveTo(cx - w * 0.5, y - s * 0.5, cx, y);
    g.quadraticCurveTo(cx + w * 0.5, y + s * 0.5, cx + w, y);
    g.stroke();
  } else if (mood === F_HAPPY) {
    g.beginPath();
    g.moveTo(cx - w, y - s * 0.15);
    g.quadraticCurveTo(cx, y + s * 1.3, cx + w, y - s * 0.15);
    g.closePath();
    ink(g, '#8c2f2f', s * 0.26);
  } else {
    g.beginPath();
    g.moveTo(cx - w * 0.6, y);
    g.quadraticCurveTo(cx, y + s * 0.65, cx + w * 0.6, y);
    g.stroke();
  }
}
function blush(g: C2, cx: number, cy: number, e: number, r: number) {
  g.fillStyle = 'rgba(255,120,130,.42)';
  for (const sd of [-1, 1]) ell(g, cx + sd * e, cy, r, r * 0.62), g.fill();
}

// ───────────────────────────── 그리기: 껍데기 (단위: 반지름 = 1, 바닥 가운데 = (0,0), 위 = -y, 오른쪽을 본다) ─────────────────────────────
/** 소라게 얼굴·집게가 나오는 곳: 눈(ex,ey) · 집게(cx,cy) · 크기 */
interface Peek { ex: number; ey: number; cx: number; cy: number; k: number }
const PEEK: Record<SK, Peek> = {
  conch: { ex: 0.55, ey: -0.62, cx: 0.78, cy: -0.22, k: 0.62 },
  teapot: { ex: 0.05, ey: -1.62, cx: 0.75, cy: -0.25, k: 0.5 },
  can: { ex: 0.95, ey: -0.95, cx: 1.05, cy: -0.35, k: 0.5 },
  castle: { ex: 0.0, ey: -0.62, cx: 0.48, cy: -0.2, k: 0.42 },
  rocket: { ex: 0.0, ey: -1.42, cx: 0.55, cy: -0.25, k: 0.42 },
  urchin: { ex: 0.25, ey: -1.0, cx: 0.85, cy: -0.3, k: 0.5 },
  bottle: { ex: 1.22, ey: -0.78, cx: 1.25, cy: -0.3, k: 0.48 },
  skull: { ex: 0.0, ey: -1.05, cx: 0.55, cy: -0.18, k: 0.5 },
  bulb: { ex: 0.0, ey: -1.25, cx: 0.55, cy: -0.15, k: 0.45 },
  ball: { ex: 0.35, ey: -1.2, cx: 0.9, cy: -0.4, k: 0.48 },
  horn: { ex: 1.0, ey: -0.95, cx: 1.12, cy: -0.35, k: 0.5 },
  helmet: { ex: 0.0, ey: -0.6, cx: 0.75, cy: -0.15, k: 0.42 },
  anchor: { ex: 0.0, ey: -0.7, cx: 0.7, cy: -0.15, k: 0.42 },
  sub: { ex: 0.25, ey: -2.15, cx: 1.0, cy: -0.45, k: 0.42 },
};
/** 잔모래 질감 점 */
function speckle(g: C2, n: number, x0: number, y0: number, w: number, h: number, col: string, seed: number, inside?: (x: number, y: number) => boolean) {
  g.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const x = x0 + hsh(seed + i * 3.1) * w, y = y0 + hsh(seed + i * 7.7) * h;
    if (inside && !inside(x, y)) continue;
    ell(g, x, y, 0.035 + hsh(seed + i) * 0.03, 0.03);
    g.fill();
  }
}
const SHELL: Record<SK, (g: C2) => void> = {
  conch(g) {
    // 분홍 소라: 오른쪽 아래가 입구, 왼쪽 위로 뾰족한 탑
    g.beginPath();
    g.moveTo(0.92, -0.18);
    g.bezierCurveTo(1.05, -0.9, 0.55, -1.42, -0.15, -1.38);
    g.bezierCurveTo(-0.45, -1.62, -0.62, -1.9, -0.7, -2.08);
    g.bezierCurveTo(-0.95, -1.75, -1.12, -1.2, -1.02, -0.62);
    g.bezierCurveTo(-0.95, -0.15, -0.55, 0.05, 0.05, 0.04);
    g.bezierCurveTo(0.5, 0.04, 0.8, 0.0, 0.92, -0.18);
    g.closePath();
    ink(g, lin(g, -1, -2, 1, 0, [0, '#ffe2cf'], [0.45, '#ffb48f'], [1, '#f07a5a']));
    g.save();
    g.clip();
    g.strokeStyle = 'rgba(190,80,60,.55)';
    g.lineWidth = 0.11;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.ellipse(-0.15 - i * 0.16, -0.75 - i * 0.32, 0.95 - i * 0.2, 0.42 - i * 0.07, -0.55, Math.PI * 0.95, Math.PI * 2.05);
      g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,.35)';
    for (let i = 0; i < 9; i++) ell(g, -0.6 + hsh(i) * 1.2, -1.5 + hsh(i + 9) * 1.3, 0.06, 0.05), g.fill();
    g.restore();
    shine(g, -0.45, -1.15, 0.12, 0.3, -0.5);
    // 입구
    ell(g, 0.6, -0.4, 0.38, 0.36, -0.3);
    ink(g, radg(g, 0.6, -0.4, 0, 0.4, [0, '#5a2a22'], [1, '#c45a4a']), 0.07);
  },
  teapot(g) {
    // 손잡이 · 주둥이 · 몸통 · 뚜껑
    g.lineWidth = 0.2;
    g.strokeStyle = OUT;
    g.beginPath();
    g.arc(-1.0, -0.85, 0.36, Math.PI * 0.4, Math.PI * 1.6);
    g.stroke();
    g.lineWidth = 0.11;
    g.strokeStyle = '#5bb0e8';
    g.stroke();
    g.beginPath();
    g.moveTo(0.7, -0.5);
    g.quadraticCurveTo(1.25, -0.55, 1.42, -1.25);
    g.lineTo(1.6, -1.32);
    g.lineTo(1.5, -1.08);
    g.quadraticCurveTo(1.32, -0.25, 0.75, -0.22);
    g.closePath();
    ink(g, lin(g, 0.7, -1.3, 1.6, -0.2, [0, '#bfe6ff'], [1, '#4fa6e0']));
    ell(g, 0, -0.78, 1.0, 0.8);
    ink(g, radg(g, -0.35, -1.1, 0.1, 1.2, [0, '#e8f7ff'], [0.55, '#8fd0fa'], [1, '#3f97d6']));
    // 꽃무늬
    for (const [x, y, k] of [[-0.5, -0.7, 0.2], [0.3, -0.45, 0.16], [0.05, -1.05, 0.13], [-0.25, -0.3, 0.12], [0.55, -0.95, 0.12]] as [number, number, number][]) {
      g.fillStyle = '#ffffff';
      for (let i = 0; i < 5; i++) ell(g, x + Math.cos(i * 1.257) * k * 0.7, y + Math.sin(i * 1.257) * k * 0.7, k * 0.45, k * 0.45), g.fill();
      ell(g, x, y, k * 0.35, k * 0.35);
      g.fillStyle = '#ffd23f';
      g.fill();
    }
    g.fillStyle = '#2f7fbf';
    rr(g, -0.62, -0.1, 1.24, 0.14, 0.06);
    g.fill();
    shine(g, -0.55, -1.05, 0.16, 0.3, -0.6);
    // 뚜껑(살짝 들림 — 소라게 눈이 그 아래로)
    g.beginPath();
    g.moveTo(-0.62, -1.62);
    g.quadraticCurveTo(0, -2.12, 0.62, -1.62);
    g.closePath();
    ink(g, lin(g, 0, -2.1, 0, -1.6, [0, '#d8f2ff'], [1, '#5bb0e8']));
    ell(g, 0, -2.08, 0.15, 0.13);
    ink(g, '#ffd23f', 0.07);
    ell(g, 0, -1.52, 0.42, 0.1);
    g.fillStyle = 'rgba(40,20,10,.65)';
    g.fill();
  },
  can(g) {
    // 옆으로 누운 깡통: 은빛 몸통 · 빨간 상표 · 오른쪽이 열린 입구
    rr(g, -1.15, -1.55, 2.1, 1.5, 0.2);
    ink(g, lin(g, 0, -1.55, 0, -0.05, [0, '#fbfdff'], [0.3, '#cfd8e0'], [0.7, '#9aa8b6'], [1, '#c6d0da']));
    g.fillStyle = '#ff5a4e';
    g.fillRect(-0.85, -1.52, 1.35, 1.44);
    g.fillStyle = '#ffd23f';
    starPath(g, -0.15, -0.8, 0.36, 0.48);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 0.05;
    g.stroke();
    // 물고기 그림
    g.fillStyle = '#ffffff';
    ell(g, -0.25, -1.28, 0.2, 0.09);
    g.fill();
    g.beginPath();
    g.moveTo(-0.05, -1.28);
    g.lineTo(0.08, -1.36);
    g.lineTo(0.08, -1.2);
    g.fill();
    g.strokeStyle = 'rgba(80,90,100,.5)';
    g.lineWidth = 0.05;
    for (const x of [-1.0, -0.92, 0.6, 0.68]) (g.beginPath(), g.moveTo(x, -1.5), g.lineTo(x, -0.1), g.stroke());
    ell(g, 0.95, -0.8, 0.32, 0.75);
    ink(g, lin(g, 0.6, -1.5, 1.3, -0.1, [0, '#e9eef3'], [1, '#8d9aa8']));
    ell(g, 0.97, -0.8, 0.22, 0.6);
    g.fillStyle = '#3a2a22';
    g.fill();
    shine(g, -0.4, -1.35, 0.5, 0.07, 0, 0.6);
  },
  castle(g) {
    const sand = lin(g, 0, -2.4, 0, 0, [0, '#fff0c8'], [1, '#e8bd6c']);
    // 탑 둘
    for (const sd of [-1, 1]) {
      rr(g, sd * 0.72 - 0.3, -2.05, 0.6, 2.05, 0.1);
      ink(g, sand);
      for (let i = 0; i < 3; i++) rr(g, sd * 0.72 - 0.3 + i * 0.22, -2.28, 0.16, 0.26, 0.04), ink(g, sand, 0.06);
      // 깃발
      g.strokeStyle = OUT;
      g.lineWidth = 0.06;
      g.beginPath();
      g.moveTo(sd * 0.72, -2.25);
      g.lineTo(sd * 0.72, -2.75);
      g.stroke();
      g.beginPath();
      g.moveTo(sd * 0.72, -2.75);
      g.lineTo(sd * 0.72 + 0.4, -2.62);
      g.lineTo(sd * 0.72, -2.48);
      g.closePath();
      ink(g, sd < 0 ? '#ff5a6e' : '#4fc3f7', 0.05);
    }
    // 가운데 벽 + 문
    rr(g, -0.62, -1.45, 1.24, 1.45, 0.08);
    ink(g, sand);
    for (let i = 0; i < 4; i++) rr(g, -0.6 + i * 0.32, -1.66, 0.24, 0.24, 0.04), ink(g, sand, 0.06);
    g.beginPath();
    g.moveTo(-0.34, 0);
    g.lineTo(-0.34, -0.55);
    g.arc(0, -0.55, 0.34, Math.PI, 0);
    g.lineTo(0.34, 0);
    g.closePath();
    ink(g, '#6b3f22', 0.07);
    // 대포 창
    ell(g, 0.72, -1.45, 0.17, 0.17);
    ink(g, '#3a2a22', 0.06);
    rr(g, 0.7, -1.56, 0.55, 0.2, 0.08);
    ink(g, lin(g, 0, -1.56, 0, -1.36, [0, '#8c99a8'], [1, '#4a5662']), 0.06);
    // 조개 장식 · 모래 알갱이
    for (const [x, y, c] of [[-0.72, -1.0, '#ff9ecb'], [0.72, -0.65, '#ffffff'], [-0.2, -1.15, '#ffd23f']] as [number, number, string][]) {
      g.beginPath();
      g.arc(x, y, 0.13, Math.PI, 0);
      g.closePath();
      ink(g, c, 0.05);
    }
    speckle(g, 26, -1.0, -2.1, 2.0, 2.0, 'rgba(180,130,60,.35)', 11);
    shine(g, -0.85, -1.6, 0.06, 0.35, 0, 0.45);
  },
  rocket(g) {
    // 지느러미
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.4, -0.75);
      g.quadraticCurveTo(sd * 1.0, -0.55, sd * 0.95, 0.0);
      g.lineTo(sd * 0.42, -0.2);
      g.closePath();
      ink(g, '#3f8fe8');
    }
    // 몸통
    g.beginPath();
    g.moveTo(-0.48, -0.15);
    g.lineTo(-0.52, -1.55);
    g.quadraticCurveTo(-0.45, -2.35, 0, -2.75);
    g.quadraticCurveTo(0.45, -2.35, 0.52, -1.55);
    g.lineTo(0.48, -0.15);
    g.closePath();
    ink(g, lin(g, -0.5, 0, 0.5, 0, [0, '#c9d4de'], [0.35, '#ffffff'], [1, '#aab6c2']));
    g.save();
    g.clip();
    g.fillStyle = '#ff5a4e';
    g.fillRect(-0.6, -2.9, 1.2, 0.75);
    g.fillRect(-0.6, -0.55, 1.2, 0.18);
    g.restore();
    g.beginPath();
    g.moveTo(-0.48, -0.15);
    g.lineTo(-0.52, -1.55);
    g.quadraticCurveTo(-0.45, -2.35, 0, -2.75);
    g.quadraticCurveTo(0.45, -2.35, 0.52, -1.55);
    g.lineTo(0.48, -0.15);
    g.closePath();
    g.strokeStyle = OUT;
    g.lineWidth = LW;
    g.stroke();
    // 둥근 창(소라게 눈)
    ell(g, 0, -1.42, 0.36, 0.36);
    ink(g, '#ffd23f', 0.08);
    ell(g, 0, -1.42, 0.26, 0.26);
    g.fillStyle = '#7fd4ff';
    g.fill();
    rr(g, -0.32, -0.18, 0.64, 0.2, 0.06);
    ink(g, '#6b7480', 0.06);
    shine(g, -0.28, -1.95, 0.06, 0.3, 0.1, 0.6);
  },
  urchin(g) {
    // 가시(뒤) · 몸통 · 가시(앞)
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * TAU, L = 1.25 + (i % 2) * 0.22;
      g.strokeStyle = OUT;
      g.lineWidth = 0.13;
      g.beginPath();
      g.moveTo(Math.cos(a) * 0.6, -0.82 + Math.sin(a) * 0.55);
      g.lineTo(Math.cos(a) * L, -0.82 + Math.sin(a) * L * 0.85);
      g.stroke();
      g.strokeStyle = i % 3 ? '#b58ae6' : '#e9d6ff';
      g.lineWidth = 0.06;
      g.stroke();
    }
    ell(g, 0, -0.82, 0.86, 0.8);
    ink(g, radg(g, -0.3, -1.15, 0.05, 1.0, [0, '#e6d1ff'], [0.5, '#9d6ad8'], [1, '#5e3a9c']));
    g.fillStyle = 'rgba(255,255,255,.6)';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      ell(g, Math.cos(a) * 0.5, -0.82 + Math.sin(a) * 0.45, 0.07, 0.07);
      g.fill();
    }
    shine(g, -0.35, -1.2, 0.16, 0.22, -0.6);
  },
  bottle(g) {
    // 누운 초록 유리병: 왼쪽이 바닥, 오른쪽이 목(소라게)
    g.beginPath();
    g.moveTo(-1.25, -0.25);
    g.quadraticCurveTo(-1.32, -1.3, -0.6, -1.32);
    g.lineTo(0.35, -1.3);
    g.quadraticCurveTo(0.75, -1.28, 0.95, -1.05);
    g.lineTo(1.3, -1.0);
    g.lineTo(1.3, -0.5);
    g.lineTo(0.95, -0.45);
    g.quadraticCurveTo(0.75, -0.08, 0.35, -0.05);
    g.lineTo(-0.6, -0.02);
    g.quadraticCurveTo(-1.2, 0.0, -1.25, -0.25);
    g.closePath();
    ink(g, lin(g, 0, -1.35, 0, 0, [0, 'rgba(200,255,225,.92)'], [0.5, 'rgba(90,205,150,.85)'], [1, 'rgba(40,140,100,.9)']));
    // 쪽지(안에 돌돌 말린 종이)
    rr(g, -0.85, -0.85, 0.9, 0.32, 0.12);
    ink(g, '#fff4d6', 0.05);
    g.strokeStyle = 'rgba(150,110,60,.6)';
    g.lineWidth = 0.04;
    for (let i = 0; i < 3; i++) (g.beginPath(), g.moveTo(-0.75 + i * 0.25, -0.8), g.lineTo(-0.7 + i * 0.25, -0.58), g.stroke());
    shine(g, -0.4, -1.12, 0.7, 0.08, 0, 0.75);
    shine(g, 0.6, -1.05, 0.15, 0.05, 0, 0.6);
    ell(g, 1.3, -0.75, 0.1, 0.27);
    ink(g, 'rgba(60,160,110,.95)', 0.06);
  },
  skull(g) {
    // 동글동글 해골(무섭지만 귀엽게)
    g.beginPath();
    g.moveTo(-0.55, -0.05);
    g.lineTo(-0.62, -0.42);
    g.bezierCurveTo(-1.18, -0.6, -1.15, -1.95, 0, -1.98);
    g.bezierCurveTo(1.15, -1.95, 1.18, -0.6, 0.62, -0.42);
    g.lineTo(0.55, -0.05);
    g.closePath();
    ink(g, radg(g, -0.3, -1.4, 0.1, 1.5, [0, '#ffffff'], [0.7, '#f1ead8'], [1, '#cfc3a6']));
    // 눈구멍 · 코
    for (const sd of [-1, 1]) {
      ell(g, sd * 0.42, -1.08, 0.3, 0.34, sd * 0.2);
      ink(g, '#2a1a22', 0.06);
    }
    g.beginPath();
    g.moveTo(0, -0.78);
    g.lineTo(-0.1, -0.58);
    g.lineTo(0.1, -0.58);
    g.closePath();
    ink(g, '#2a1a22', 0.04);
    // 이빨
    for (let i = -2; i <= 2; i++) rr(g, i * 0.2 - 0.08, -0.4, 0.16, 0.26, 0.05), ink(g, '#ffffff', 0.04);
    // 금
    g.strokeStyle = 'rgba(120,100,80,.7)';
    g.lineWidth = 0.05;
    g.beginPath();
    g.moveTo(0.35, -1.95);
    g.lineTo(0.45, -1.7);
    g.lineTo(0.35, -1.55);
    g.lineTo(0.5, -1.45);
    g.stroke();
    shine(g, -0.45, -1.6, 0.18, 0.12, -0.4, 0.8);
  },
  bulb(g) {
    // 전구: 유리알 · 필라멘트 · 은빛 나사
    ell(g, 0, -1.35, 0.92, 0.95);
    ink(g, radg(g, -0.25, -1.6, 0.05, 1.0, [0, 'rgba(255,255,255,.98)'], [0.5, 'rgba(255,246,170,.92)'], [1, 'rgba(255,214,80,.92)']));
    g.strokeStyle = '#d98a1a';
    g.lineWidth = 0.07;
    g.beginPath();
    g.moveTo(-0.2, -0.6);
    g.lineTo(-0.2, -1.2);
    for (let i = 0; i <= 6; i++) g.lineTo(-0.2 + i * (0.4 / 6), -1.2 - (i % 2 ? 0.16 : 0));
    g.lineTo(0.2, -0.6);
    g.stroke();
    rr(g, -0.46, -0.62, 0.92, 0.55, 0.08);
    ink(g, lin(g, -0.46, 0, 0.46, 0, [0, '#9aa6b2'], [0.4, '#f3f6f9'], [1, '#7c8894']));
    g.strokeStyle = 'rgba(70,80,90,.7)';
    g.lineWidth = 0.05;
    for (let i = 0; i < 3; i++) (g.beginPath(), g.moveTo(-0.46, -0.52 + i * 0.15), g.lineTo(0.46, -0.47 + i * 0.15), g.stroke());
    rr(g, -0.2, -0.1, 0.4, 0.14, 0.05);
    ink(g, '#4a3a2a', 0.04);
    shine(g, -0.45, -1.7, 0.16, 0.3, -0.5, 0.85);
  },
  ball(g) {
    // 비치볼: 빨강·노랑·파랑·흰 조각
    ell(g, 0, -1.0, 1.0, 1.0);
    ink(g, '#ffffff');
    g.save();
    ell(g, 0, -1.0, 1.0, 1.0);
    g.clip();
    const cols = ['#ff5a6e', '#ffd23f', '#3fa9f5', '#ffffff', '#58d68d', '#ff9a3c'];
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.moveTo(0, -1.0);
      g.ellipse(0, -1.0, 1.05, 1.05, 0, (i / 6) * TAU - 0.02, ((i + 1) / 6) * TAU + 0.02);
      g.closePath();
      g.fillStyle = cols[i];
      g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,.12)';
    ell(g, 0.25, -0.75, 1.0, 1.0);
    g.globalCompositeOperation = 'source-atop';
    g.fill();
    g.globalCompositeOperation = 'source-over';
    g.restore();
    ell(g, 0, -1.0, 1.0, 1.0);
    g.strokeStyle = OUT;
    g.lineWidth = LW;
    g.stroke();
    ell(g, 0, -1.0, 0.2, 0.2);
    ink(g, '#ffffff', 0.05);
    shine(g, -0.4, -1.45, 0.25, 0.14, -0.6, 0.75);
  },
  horn(g) {
    // 대왕 고둥: 누운 나팔 소라 (오른쪽이 넓은 입)
    g.beginPath();
    g.moveTo(-1.45, -1.1);
    g.bezierCurveTo(-1.0, -1.55, 0.4, -1.9, 1.15, -1.85);
    g.bezierCurveTo(1.45, -1.3, 1.45, -0.3, 1.15, 0.02);
    g.bezierCurveTo(0.4, 0.05, -0.9, -0.5, -1.45, -1.1);
    g.closePath();
    ink(g, lin(g, -1.4, -1.6, 1.3, 0, [0, '#fff1d6'], [0.5, '#f6b779'], [1, '#e07f45']));
    g.save();
    g.clip();
    g.strokeStyle = 'rgba(160,80,40,.5)';
    g.lineWidth = 0.1;
    for (let i = 0; i < 6; i++) {
      const x = -1.1 + i * 0.38;
      g.beginPath();
      g.moveTo(x, -1.9);
      g.quadraticCurveTo(x + 0.25, -0.9, x - 0.05, 0.1);
      g.stroke();
    }
    g.restore();
    // 뿔 혹
    for (let i = 0; i < 4; i++) {
      const x = -0.7 + i * 0.45;
      g.beginPath();
      g.moveTo(x - 0.12, -1.55 - i * 0.07);
      g.lineTo(x, -1.92 - i * 0.07);
      g.lineTo(x + 0.12, -1.6 - i * 0.07);
      g.closePath();
      ink(g, '#fff1d6', 0.06);
    }
    ell(g, 1.12, -0.92, 0.38, 0.88);
    ink(g, radg(g, 1.1, -0.9, 0.05, 0.9, [0, '#ffe0ec'], [0.6, '#ff9ec0'], [1, '#e0607f']));
    shine(g, -0.4, -1.45, 0.5, 0.08, -0.25, 0.6);
  },
  helmet(g) {
    // 무쇠 투구: 둥근 머리 · 금 테 · 큰 뿔 둘 · 징
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.78, -1.15);
      g.bezierCurveTo(sd * 1.45, -1.25, sd * 1.55, -1.95, sd * 1.25, -2.45);
      g.bezierCurveTo(sd * 1.2, -1.95, sd * 1.05, -1.62, sd * 0.7, -1.55);
      g.closePath();
      ink(g, lin(g, 0, -2.4, 0, -1.2, [0, '#fffbe8'], [1, '#e8d6a6']));
    }
    g.beginPath();
    g.moveTo(-1.02, -0.35);
    g.bezierCurveTo(-1.08, -1.65, -0.5, -2.05, 0, -2.05);
    g.bezierCurveTo(0.5, -2.05, 1.08, -1.65, 1.02, -0.35);
    g.closePath();
    ink(g, radg(g, -0.35, -1.55, 0.1, 1.5, [0, '#e9eef3'], [0.5, '#9aa6b4'], [1, '#56616e']));
    rr(g, -1.1, -0.55, 2.2, 0.32, 0.12);
    ink(g, lin(g, 0, -0.55, 0, -0.23, [0, '#ffe58a'], [1, '#e0a020']));
    rr(g, -0.12, -1.98, 0.24, 1.5, 0.08);
    ink(g, lin(g, 0, -2, 0, -0.5, [0, '#ffe58a'], [1, '#e0a020']), 0.06);
    for (const [x, y] of [[-0.75, -0.4], [-0.4, -0.4], [0.4, -0.4], [0.75, -0.4], [-0.6, -1.3], [0.6, -1.3]] as [number, number][]) ell(g, x, y, 0.07, 0.07), ink(g, '#fff4c2', 0.04);
    shine(g, -0.55, -1.45, 0.14, 0.32, -0.4, 0.55);
  },
  anchor(g) {
    // 왕 닻 투구: 무쇠 잠수종 + 닻 무늬 (닻은 사슬에 매달려 따로 돈다)
    g.beginPath();
    g.moveTo(-1.05, -0.1);
    g.bezierCurveTo(-1.1, -1.4, -0.6, -1.95, 0, -1.95);
    g.bezierCurveTo(0.6, -1.95, 1.1, -1.4, 1.05, -0.1);
    g.closePath();
    ink(g, radg(g, -0.35, -1.45, 0.1, 1.5, [0, '#a9bccb'], [0.6, '#5d7286'], [1, '#34465a']));
    rr(g, -1.15, -0.4, 2.3, 0.3, 0.12);
    ink(g, '#c98b3a');
    // 둥근 창
    ell(g, 0, -1.1, 0.42, 0.4);
    ink(g, '#c98b3a', 0.08);
    ell(g, 0, -1.1, 0.3, 0.28);
    g.fillStyle = '#9fe0ff';
    g.fill();
    // 닻 무늬
    g.strokeStyle = '#ffe58a';
    g.lineWidth = 0.08;
    g.beginPath();
    g.moveTo(-0.72, -0.75);
    g.lineTo(-0.72, -1.35);
    g.moveTo(-0.9, -1.2);
    g.lineTo(-0.54, -1.2);
    g.moveTo(-0.92, -0.92);
    g.quadraticCurveTo(-0.72, -0.62, -0.52, -0.92);
    g.stroke();
    for (const [x, y] of [[-0.8, -0.25], [0, -0.25], [0.8, -0.25], [0.75, -1.2]] as [number, number][]) ell(g, x, y, 0.07, 0.07), ink(g, '#ffe9b0', 0.04);
    shine(g, -0.55, -1.45, 0.12, 0.28, -0.4, 0.5);
  },
  sub(g) {
    // 노란 장난감 잠수함 + 잠망경
    rr(g, 0.1, -2.35, 0.22, 0.75, 0.06);
    ink(g, '#8c99a8', 0.07);
    rr(g, 0.1, -2.42, 0.48, 0.24, 0.08);
    ink(g, '#8c99a8', 0.07);
    rr(g, -0.5, -1.7, 1.0, 0.5, 0.18);
    ink(g, lin(g, 0, -1.7, 0, -1.2, [0, '#fff2a0'], [1, '#f2b81e']));
    g.beginPath();
    g.ellipse(0, -0.75, 1.45, 0.72, 0, 0, TAU);
    ink(g, lin(g, 0, -1.5, 0, 0, [0, '#fff4b0'], [0.5, '#ffd23f'], [1, '#e0a010']));
    for (const x of [-0.65, -0.05, 0.55]) {
      ell(g, x, -0.85, 0.2, 0.2);
      ink(g, '#c98b3a', 0.06);
      ell(g, x, -0.85, 0.13, 0.13);
      g.fillStyle = '#9fe0ff';
      g.fill();
    }
    // 프로펠러
    g.beginPath();
    g.moveTo(-1.42, -0.75);
    g.lineTo(-1.72, -1.05);
    g.lineTo(-1.72, -0.45);
    g.closePath();
    ink(g, '#ff5a4e', 0.06);
    shine(g, -0.4, -1.2, 0.6, 0.08, 0, 0.6);
  },
};

/** 소라게(껍데기 밖으로 나온 몸·눈·집게) — (x,y) 화면 px, u = 단위 px, fc = 보는 쪽, pinch = 집게 벌리기 0~1 */
function crabBits(ctx: C2, k: SK, x: number, y: number, u: number, fc: number, t: number, pinch: number, mood: number, lv: number, hurt: boolean) {
  const P = PEEK[k], s = u * P.k * 1.2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(fc, 1);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const body = hurt ? '#ffb39a' : '#ff7a45', light = '#ffc7a0', lw = Math.max(1.2, s * 0.09);
  const claw = (cx: number, cy: number, k2: number, open: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.35 - open * 0.2);
    // 팔
    ctx.beginPath();
    ctx.moveTo(-k2 * 0.55, k2 * 0.25);
    ctx.quadraticCurveTo(-k2 * 0.25, k2 * 0.25, -k2 * 0.05, k2 * 0.05);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = k2 * 0.3;
    ctx.stroke();
    ctx.strokeStyle = body;
    ctx.lineWidth = k2 * 0.16;
    ctx.stroke();
    // 손바닥
    ell(ctx, k2 * 0.12, 0, k2 * 0.36, k2 * 0.28, -0.2);
    ink(ctx, body, lw);
    // 위턱 (두툼) · 아래턱
    ctx.beginPath();
    ctx.moveTo(k2 * 0.2, -k2 * 0.18);
    ctx.quadraticCurveTo(k2 * 0.65, -k2 * (0.55 + open * 0.35), k2 * 1.0, -k2 * (0.12 + open * 0.45));
    ctx.quadraticCurveTo(k2 * 0.62, -k2 * (0.08 + open * 0.1), k2 * 0.32, k2 * 0.02);
    ctx.closePath();
    ink(ctx, body, lw);
    ctx.beginPath();
    ctx.moveTo(k2 * 0.3, k2 * 0.12);
    ctx.quadraticCurveTo(k2 * 0.62, k2 * (0.3 + open * 0.25), k2 * 0.9, k2 * (0.08 + open * 0.3));
    ctx.quadraticCurveTo(k2 * 0.6, k2 * (0.1 + open * 0.05), k2 * 0.3, k2 * 0.12);
    ctx.closePath();
    ink(ctx, body, lw);
    ell(ctx, k2 * 0.42, -k2 * 0.28, k2 * 0.14, k2 * 0.07, -0.5);
    ctx.fillStyle = light;
    ctx.fill();
    ctx.restore();
  };
  const big = 1 + Math.min(0.45, (lv - 1) * 0.045);
  claw(P.cx * u - s * 0.45, P.cy * u + s * 0.05, s * 0.62, pinch * 0.6);
  // 몸통 조각(입구에서 빼꼼)
  ell(ctx, P.ex * u, P.ey * u + s * 0.12, s * 0.42, s * 0.3);
  ink(ctx, body, lw);
  // 눈자루 + 큰 눈
  const blink = (t + Math.round(x)) % 170 < 6;
  for (const sd of [-1, 1]) {
    const bx = P.ex * u + sd * s * 0.2, by = P.ey * u, tx = bx + sd * s * 0.14, ty = by - s * 0.55;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = s * 0.2;
    ctx.stroke();
    ctx.strokeStyle = body;
    ctx.lineWidth = s * 0.1;
    ctx.stroke();
    const er = s * 0.34 * (mood === F_SCARED ? 1.15 : 1);
    ell(ctx, tx, ty - er * 0.6, er * 0.88, blink ? er * 0.15 : er);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw;
    ctx.stroke();
    if (!blink) {
      if (mood === F_HURT) {
        ctx.beginPath();
        ctx.moveTo(tx - er * 0.5, ty - er * 1.0);
        ctx.lineTo(tx + er * 0.35, ty - er * 0.6);
        ctx.lineTo(tx - er * 0.5, ty - er * 0.2);
        ctx.stroke();
      } else if (mood === F_HAPPY) {
        ctx.beginPath();
        ctx.arc(tx, ty - er * 0.35, er * 0.5, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      } else {
        const pr = mood === F_SCARED ? 0.32 : 0.52;
        ell(ctx, tx + er * 0.22, ty - er * 0.5, er * pr, er * pr * 1.15);
        ctx.fillStyle = '#2a1a12';
        ctx.fill();
        ell(ctx, tx + er * 0.08, ty - er * 0.78, er * 0.2, er * 0.2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    }
    if (mood === F_ANGRY) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = s * 0.12;
      ctx.beginPath();
      ctx.moveTo(tx - sd * er * 0.95, ty - er * 1.85);
      ctx.lineTo(tx + sd * er * 0.55, ty - er * 1.45);
      ctx.stroke();
    }
  }
  claw(P.cx * u, P.cy * u, s * 0.85 * big, pinch);
  ctx.restore();
}
/** 맨몸 소라게: 작은 몸 · 분홍 말린 엉덩이 · 겁먹은 눈 (웃김) */
function nakedCrab(ctx: C2, x: number, y: number, u: number, fc: number, t: number, cry: boolean, air: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(fc, 1);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const wig = Math.sin(t * 0.7) * 0.12;
  // 다리 (허둥지둥)
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, u * 0.09);
  for (let i = 0; i < 3; i++) {
    const a = Math.sin(t * 0.9 + i * 2) * 0.35 * (air ? 0.3 : 1);
    ctx.beginPath();
    ctx.moveTo(u * (0.1 + i * 0.22), -u * 0.35);
    ctx.lineTo(u * (0.25 + i * 0.22 + a * 0.3), -u * 0.02);
    ctx.stroke();
  }
  // 분홍 엉덩이(돌돌 말린 배)
  ctx.save();
  ctx.translate(-u * 0.45, -u * 0.55);
  ctx.rotate(wig);
  ell(ctx, 0, 0, u * 0.62, u * 0.48, -0.3);
  ctx.fillStyle = radg(ctx, -u * 0.15, -u * 0.15, 0, u * 0.65, [0, '#ffe3ea'], [0.6, '#ffb3c1'], [1, '#ff8fa8']);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, u * 0.08);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(220,90,120,.75)';
  ctx.lineWidth = Math.max(0.8, u * 0.06);
  ctx.beginPath();
  for (let i = 0; i <= 16; i++) {
    const a = i * 0.65, q = u * (0.05 + i * 0.022);
    if (i) ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q * 0.8);
    else ctx.moveTo(q, 0);
  }
  ctx.stroke();
  ctx.restore();
  // 몸 + 눈 + 집게
  ell(ctx, u * 0.3, -u * 0.5, u * 0.42, u * 0.32);
  ctx.fillStyle = '#ff7a45';
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, u * 0.08);
  ctx.stroke();
  ctx.restore();
  crabBits(ctx, 'conch', x + fc * u * 0.05, y + u * 0.1, u * 0.85, fc, t, 0.5 + 0.5 * Math.abs(Math.sin(t * 0.5)), cry ? F_HURT : F_SCARED, 1, false);
  if (cry) {
    // 눈물
    ctx.fillStyle = '#7fd4ff';
    for (const sd of [-1, 1]) {
      const q = ((t * 0.08 + (sd > 0 ? 0.5 : 0)) % 1) * u * 0.6;
      ell(ctx, x + fc * u * (0.45 + sd * 0.2), y - u * 1.0 + q, u * 0.08, u * 0.12);
      ctx.fill();
    }
  }
}

// ───────────────────────────── 그리기: 놈들 (단위: 반지름 = 1, 발 = (0,0), 오른쪽을 본다) ─────────────────────────────
const FOE: Record<EK, (g: C2, mood: number) => void> = {
  flea(g, mood) {
    // 모래 벼룩: 동글 등 · 튼튼한 뒷다리 · 더듬이
    g.strokeStyle = OUT;
    g.lineWidth = 0.14;
    g.beginPath();
    g.moveTo(-0.5, -0.6);
    g.lineTo(-1.0, -1.0);
    g.lineTo(-1.15, -0.05);
    g.moveTo(0.3, -0.4);
    g.lineTo(0.55, -0.02);
    g.moveTo(-0.1, -0.4);
    g.lineTo(-0.1, -0.02);
    g.stroke();
    g.beginPath();
    g.moveTo(-1.0, -0.6);
    g.bezierCurveTo(-1.0, -1.7, 0.6, -1.8, 0.95, -0.95);
    g.bezierCurveTo(1.05, -0.5, 0.6, -0.3, 0, -0.3);
    g.bezierCurveTo(-0.6, -0.3, -1.0, -0.35, -1.0, -0.6);
    g.closePath();
    ink(g, radg(g, -0.2, -1.2, 0.1, 1.3, [0, '#fff0cf'], [0.6, '#e8c483'], [1, '#c8954a']), 0.12);
    g.strokeStyle = 'rgba(150,100,40,.5)';
    g.lineWidth = 0.07;
    for (let i = 0; i < 3; i++) (g.beginPath(), g.arc(-0.1 - i * 0.28, -0.95, 0.6, -1.4, -0.4), g.stroke());
    g.strokeStyle = OUT;
    g.lineWidth = 0.08;
    g.beginPath();
    g.moveTo(0.75, -1.2);
    g.quadraticCurveTo(1.0, -1.8, 1.4, -1.85);
    g.moveTo(0.55, -1.3);
    g.quadraticCurveTo(0.6, -1.95, 0.95, -2.1);
    g.stroke();
    face(g, 0.45, -0.95, 0.24, 0.24, mood, 0.32, 0.8);
  },
  star() {
    // (굴러가며 돌기 때문에 바로 그린다)
  },
  goblin(g, mood) {
    // 모래 도깨비: 울퉁불퉁 모래 덩이 · 큰 주먹 · 조개 박힘
    for (const sd of [-1, 1]) {
      ell(g, sd * 0.95, -0.55, 0.38, 0.34);
      ink(g, radg(g, sd * 0.9, -0.65, 0.05, 0.4, [0, '#fff0c8'], [1, '#d9a85a']));
    }
    g.beginPath();
    g.moveTo(-0.95, -0.05);
    g.bezierCurveTo(-1.1, -0.9, -0.95, -1.7, -0.35, -1.85);
    g.bezierCurveTo(-0.15, -2.15, 0.35, -2.1, 0.45, -1.85);
    g.bezierCurveTo(1.05, -1.7, 1.12, -0.8, 0.95, -0.05);
    g.closePath();
    ink(g, radg(g, -0.3, -1.4, 0.1, 1.7, [0, '#fff1cc'], [0.55, '#efc979'], [1, '#c9914a']));
    speckle(g, 30, -0.9, -1.9, 1.8, 1.8, 'rgba(160,110,50,.4)', 5);
    for (const [x, y, c] of [[-0.55, -0.55, '#ff9ecb'], [0.6, -1.3, '#ffffff'], [-0.3, -1.7, '#7fd4ff']] as [number, number, string][]) {
      g.beginPath();
      g.arc(x, y, 0.12, Math.PI, 0);
      g.closePath();
      ink(g, c, 0.05);
    }
    face(g, 0.05, -1.2, 0.32, 0.26, mood === F_IDLE ? F_ANGRY : mood, 0.42, 1.3);
    shine(g, -0.5, -1.55, 0.12, 0.22, -0.5);
  },
  gull(g, mood) {
    // 갈매기(날개는 바로 그린다): 몸 · 머리 · 부리
    ell(g, -0.15, -0.95, 0.85, 0.55, -0.15);
    ink(g, radg(g, -0.3, -1.15, 0.1, 1.0, [0, '#ffffff'], [1, '#dfe7ee']));
    g.beginPath();
    g.moveTo(-0.95, -1.0);
    g.lineTo(-1.35, -1.25);
    g.lineTo(-1.3, -0.85);
    g.closePath();
    ink(g, '#9aa8b6', 0.07);
    ell(g, 0.55, -1.35, 0.45, 0.42);
    ink(g, '#ffffff');
    g.beginPath();
    g.moveTo(0.9, -1.4);
    g.lineTo(1.4, -1.28);
    g.lineTo(0.92, -1.18);
    g.closePath();
    ink(g, '#ffc23a', 0.06);
    ell(g, 1.12, -1.25, 0.06, 0.05);
    g.fillStyle = '#ff5a4e';
    g.fill();
    face(g, 0.6, -1.42, 0.13, 0.14, mood, 0, 1);
  },
  gang(g, mood) {
    // 집게 갱: 빨간 게 · 검은 두건 · 작은 집게 둘
    g.strokeStyle = OUT;
    g.lineWidth = 0.12;
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) (g.beginPath(), g.moveTo(sd * 0.5, -0.45 - i * 0.12), g.lineTo(sd * (0.95 + i * 0.05), -0.02), g.stroke());
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.75, -0.8);
      g.quadraticCurveTo(sd * 1.35, -1.4, sd * 1.15, -1.7);
      g.lineTo(sd * 0.95, -1.4);
      g.lineTo(sd * 1.0, -1.75);
      g.quadraticCurveTo(sd * 0.7, -1.4, sd * 0.6, -0.9);
      g.closePath();
      ink(g, '#ff5a4e', 0.08);
    }
    ell(g, 0, -0.75, 0.92, 0.6);
    ink(g, radg(g, -0.25, -0.95, 0.05, 1.0, [0, '#ffb09a'], [0.6, '#ff5a4e'], [1, '#c43a2e']));
    // 두건
    g.beginPath();
    g.moveTo(-0.85, -0.95);
    g.quadraticCurveTo(0, -1.45, 0.85, -0.95);
    g.lineTo(0.8, -0.78);
    g.quadraticCurveTo(0, -1.1, -0.8, -0.78);
    g.closePath();
    ink(g, '#2a2a3a', 0.06);
    g.beginPath();
    g.moveTo(-0.85, -0.9);
    g.lineTo(-1.25, -1.05);
    g.lineTo(-1.15, -0.8);
    g.closePath();
    ink(g, '#2a2a3a', 0.06);
    face(g, 0.0, -0.86, 0.3, 0.2, mood === F_IDLE ? F_ANGRY : mood, 0.32, 0.9);
  },
  shield(g, mood) {
    // 방패 게: 파란 게 (방패는 바로 그린다)
    g.strokeStyle = OUT;
    g.lineWidth = 0.12;
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) (g.beginPath(), g.moveTo(sd * 0.5, -0.45 - i * 0.12), g.lineTo(sd * (0.95 + i * 0.05), -0.02), g.stroke());
    ell(g, 0, -0.8, 0.95, 0.65);
    ink(g, radg(g, -0.25, -1.0, 0.05, 1.0, [0, '#c9d6ff'], [0.6, '#6f86e8'], [1, '#3f52b0']));
    g.strokeStyle = 'rgba(255,255,255,.5)';
    g.lineWidth = 0.06;
    g.beginPath();
    g.arc(0, -0.75, 0.55, -2.6, -0.5);
    g.stroke();
    face(g, -0.05, -1.0, 0.3, 0.22, mood, 0.32, 0.9);
  },
  lobster(g, mood) {
    // 바닷가재: 긴 꼬리 · 큰 집게 · 더듬이
    g.beginPath();
    g.moveTo(-0.3, -0.55);
    g.quadraticCurveTo(-1.2, -0.5, -1.55, -0.3);
    g.lineTo(-1.8, -0.65);
    g.lineTo(-1.85, -0.1);
    g.lineTo(-1.5, -0.12);
    g.quadraticCurveTo(-1.0, -0.15, -0.3, -0.2);
    g.closePath();
    ink(g, '#e8473a');
    g.strokeStyle = 'rgba(120,20,20,.5)';
    g.lineWidth = 0.06;
    for (let i = 0; i < 3; i++) (g.beginPath(), g.moveTo(-0.6 - i * 0.3, -0.52), g.lineTo(-0.6 - i * 0.3, -0.2), g.stroke());
    ell(g, 0.15, -0.65, 0.75, 0.48);
    ink(g, radg(g, 0, -0.85, 0.05, 0.9, [0, '#ffb09a'], [0.6, '#ff5a4e'], [1, '#b8302a']));
    // 큰 집게
    g.beginPath();
    g.moveTo(0.6, -0.8);
    g.quadraticCurveTo(1.2, -1.3, 1.55, -1.1);
    g.quadraticCurveTo(1.85, -0.85, 1.55, -0.65);
    g.lineTo(1.75, -0.5);
    g.quadraticCurveTo(1.4, -0.25, 1.05, -0.5);
    g.quadraticCurveTo(0.85, -0.6, 0.6, -0.5);
    g.closePath();
    ink(g, '#ff5a4e');
    g.strokeStyle = OUT;
    g.lineWidth = 0.05;
    g.beginPath();
    g.moveTo(0.55, -1.0);
    g.quadraticCurveTo(0.9, -1.8, 1.6, -1.9);
    g.moveTo(0.45, -1.0);
    g.quadraticCurveTo(0.6, -1.9, 1.2, -2.15);
    g.stroke();
    face(g, 0.38, -0.92, 0.2, 0.18, mood === F_IDLE ? F_ANGRY : mood, 0.26, 0.8);
  },
  jelly(g, mood) {
    // 해파리: 반투명 우산 + 리본 다리
    g.strokeStyle = 'rgba(214,120,200,.85)';
    g.lineWidth = 0.1;
    for (let i = 0; i < 5; i++) {
      const x = -0.6 + i * 0.3;
      g.beginPath();
      g.moveTo(x, -0.75);
      g.bezierCurveTo(x + 0.2, -0.5, x - 0.2, -0.3, x + 0.08, 0.0);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(-0.95, -0.75);
    g.bezierCurveTo(-1.0, -1.9, 1.0, -1.9, 0.95, -0.75);
    for (let i = 0; i < 6; i++) g.quadraticCurveTo(0.95 - (i + 0.5) * 0.317, -0.55, 0.95 - (i + 1) * 0.317, -0.75);
    g.closePath();
    ink(g, radg(g, -0.25, -1.35, 0.05, 1.2, [0, 'rgba(255,235,250,.95)'], [0.55, 'rgba(244,150,220,.85)'], [1, 'rgba(190,90,200,.9)']));
    g.fillStyle = 'rgba(255,255,255,.55)';
    for (const [x, y] of [[-0.45, -1.35], [0.4, -1.15], [0.05, -1.55]] as [number, number][]) ell(g, x, y, 0.1, 0.07), g.fill();
    face(g, 0, -1.05, 0.28, 0.2, mood, 0.28, 0.8);
    blush(g, 0, -0.95, 0.5, 0.12);
  },
  clam(g, mood) {
    // 숨은 조개: 닫힘(0·1·…) / 열림(5)
    const open = mood === F_HAPPY;
    g.beginPath();
    g.moveTo(-1.0, -0.1);
    g.bezierCurveTo(-1.05, -0.65, -0.55, -0.9, 0, -0.9);
    g.bezierCurveTo(0.55, -0.9, 1.05, -0.65, 1.0, -0.1);
    g.closePath();
    ink(g, lin(g, 0, -0.9, 0, 0, [0, '#ffe9f2'], [1, '#e7a5c3']));
    if (open) {
      ell(g, 0, -0.5, 0.75, 0.35);
      ink(g, '#8c3f5a', 0.06);
      ell(g, 0.0, -0.48, 0.22, 0.2);
      ink(g, radg(g, -0.07, -0.55, 0, 0.25, [0, '#ffffff'], [1, '#d9dce8']), 0.05);
      face(g, 0, -0.62, 0.36, 0.13, F_ANGRY, 0, 1);
    }
    g.save();
    g.translate(0, open ? -0.55 : 0);
    g.beginPath();
    g.moveTo(-1.0, -0.45);
    g.bezierCurveTo(-1.05, -1.3, -0.55, -1.55, 0, -1.55);
    g.bezierCurveTo(0.55, -1.55, 1.05, -1.3, 1.0, -0.45);
    g.quadraticCurveTo(0, -0.3, -1.0, -0.45);
    g.closePath();
    ink(g, lin(g, 0, -1.55, 0, -0.4, [0, '#fff4f9'], [1, '#f0a9c9']));
    g.strokeStyle = 'rgba(180,80,120,.5)';
    g.lineWidth = 0.06;
    for (let i = -3; i <= 3; i++) (g.beginPath(), g.moveTo(i * 0.08, -0.45), g.lineTo(i * 0.27, -1.45), g.stroke());
    if (!open) face(g, 0, -0.85, 0.32, 0.16, mood === F_IDLE ? F_DIZZY : mood, 0, 1);
    g.restore();
  },
  captain(g, mood) {
    // 해적 갈매기 선장: 큰 갈매기 · 빨간 두건 · 안대 (투구는 바로 그린다)
    ell(g, -0.15, -0.95, 0.95, 0.62, -0.1);
    ink(g, radg(g, -0.3, -1.15, 0.1, 1.1, [0, '#ffffff'], [1, '#d6dee6']));
    ell(g, 0.5, -1.45, 0.55, 0.5);
    ink(g, '#ffffff');
    g.beginPath();
    g.moveTo(0.95, -1.5);
    g.lineTo(1.55, -1.32);
    g.lineTo(0.98, -1.22);
    g.closePath();
    ink(g, '#ffc23a', 0.06);
    // 두건
    g.beginPath();
    g.moveTo(0.0, -1.62);
    g.quadraticCurveTo(0.5, -2.05, 1.0, -1.65);
    g.lineTo(0.95, -1.55);
    g.quadraticCurveTo(0.5, -1.8, 0.05, -1.52);
    g.closePath();
    ink(g, '#e8333a', 0.06);
    g.fillStyle = '#ffffff';
    for (const x of [0.3, 0.55, 0.8]) ell(g, x, -1.72, 0.04, 0.04), g.fill();
    face(g, 0.55, -1.45, 0.16, 0.16, mood === F_IDLE ? F_ANGRY : mood, 0, 1);
    // 안대
    ell(g, 0.71, -1.45, 0.13, 0.13);
    ink(g, '#1a1a22', 0.04);
    g.strokeStyle = '#1a1a22';
    g.lineWidth = 0.05;
    g.beginPath();
    g.moveTo(0.3, -1.75);
    g.lineTo(0.95, -1.3);
    g.stroke();
  },
  octo(g, mood) {
    // 모래성 문어 왕: 주황 문어 · 모래성 왕관 · 굵은 다리
    for (let i = 0; i < 6; i++) {
      const x = -0.9 + i * 0.36, sd = i < 3 ? -1 : 1;
      g.beginPath();
      g.moveTo(x - 0.15, -0.7);
      g.quadraticCurveTo(x + sd * 0.3, -0.2, x + sd * 0.45, -0.05);
      g.quadraticCurveTo(x + sd * 0.55, 0.1, x + sd * 0.25, 0.0);
      g.quadraticCurveTo(x, -0.25, x + 0.15, -0.7);
      g.closePath();
      ink(g, '#ff8a4a', 0.07);
      g.fillStyle = '#ffd0b0';
      ell(g, x + sd * 0.25, -0.2, 0.05, 0.05);
      g.fill();
    }
    ell(g, 0, -1.2, 1.0, 0.85);
    ink(g, radg(g, -0.3, -1.5, 0.1, 1.2, [0, '#ffd0b0'], [0.55, '#ff8a4a'], [1, '#d9562a']));
    g.fillStyle = 'rgba(200,70,30,.35)';
    for (const [x, y] of [[-0.6, -1.5], [0.55, -1.6], [-0.2, -1.85]] as [number, number][]) ell(g, x, y, 0.1, 0.08), g.fill();
    // 모래성 왕관
    rr(g, -0.55, -2.35, 1.1, 0.45, 0.06);
    ink(g, '#f3d08a', 0.07);
    for (let i = 0; i < 4; i++) rr(g, -0.55 + i * 0.32, -2.55, 0.18, 0.24, 0.04), ink(g, '#f3d08a', 0.05);
    g.beginPath();
    g.moveTo(-0.12, -1.9);
    g.lineTo(-0.12, -2.12);
    g.arc(0, -2.12, 0.12, Math.PI, 0);
    g.lineTo(0.12, -1.9);
    g.closePath();
    ink(g, '#6b3f22', 0.04);
    face(g, 0, -1.15, 0.38, 0.26, mood === F_IDLE ? F_ANGRY : mood, 0.42, 1.2);
  },
  shark(g, mood) {
    // 장난감 상어 잠수함: 회색 상어 몸 · 노란 배 · 둥근 창 · 이빨 (잠망경은 바로 그린다)
    g.beginPath();
    g.moveTo(-1.7, -0.75);
    g.lineTo(-2.05, -1.25);
    g.lineTo(-2.0, -0.3);
    g.closePath();
    ink(g, '#7f97ad');
    g.beginPath();
    g.moveTo(-0.2, -1.4);
    g.lineTo(0.15, -2.0);
    g.lineTo(0.5, -1.4);
    g.closePath();
    ink(g, '#7f97ad');
    g.beginPath();
    g.ellipse(0, -0.75, 1.75, 0.72, 0, 0, TAU);
    ink(g, lin(g, 0, -1.5, 0, 0, [0, '#c7d6e3'], [0.55, '#8da6bb'], [1, '#5f7890']));
    g.beginPath();
    g.ellipse(0.1, -0.45, 1.5, 0.35, 0, 0, Math.PI);
    g.fillStyle = '#ffe58a';
    g.fill();
    // 이빨 입
    g.beginPath();
    g.moveTo(0.9, -0.55);
    g.quadraticCurveTo(1.35, -0.3, 1.7, -0.62);
    g.lineTo(1.6, -0.75);
    g.closePath();
    ink(g, '#8c2f2f', 0.06);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(1.0 + i * 0.16, -0.6);
      g.lineTo(1.07 + i * 0.16, -0.45);
      g.lineTo(1.14 + i * 0.16, -0.62);
      g.fill();
    }
    for (const x of [-0.9, -0.3]) {
      ell(g, x, -0.85, 0.2, 0.2);
      ink(g, '#ffd23f', 0.06);
      ell(g, x, -0.85, 0.13, 0.13);
      g.fillStyle = '#9fe0ff';
      g.fill();
    }
    face(g, 0.95, -1.0, 0.2, 0.17, mood === F_IDLE ? F_ANGRY : mood, 0, 1);
    shine(g, -0.4, -1.2, 0.8, 0.08, 0, 0.5);
  },
};

// ───────────────────────────── 스티커 굽기 ─────────────────────────────
/** 스티커 틀: 가로 SW · 세로 SH (반지름 단위), 발 가운데 = (SOX, SOY) */
const SW = 4.4, SH = 3.6, SOX = 2.2, SOY = 3.0;
const SPR = new Map<string, HTMLCanvasElement>();
function spr(key: string, px: number, paint: (g: C2) => void): HTMLCanvasElement {
  const q = Math.max(6, Math.round(px)), k = key + ':' + q;
  let c = SPR.get(k);
  if (!c) {
    if (SPR.size > 260) SPR.clear();
    c = layer(SW * q, SH * q, (g) => {
      g.translate(SOX * q, SOY * q);
      g.scale(q, q);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      paint(g);
    });
    SPR.set(k, c);
  }
  return c;
}
const shellSpr = (k: SK, px: number) => spr('s' + k, px, (g) => SHELL[k](g));
const foeSpr = (k: EK, mood: number, px: number) => spr('f' + k + mood, px, (g) => FOE[k](g, mood));
/** 아직 못 살아 본 껍데기: 그림자 스티커 */
function silSpr(k: SK, px: number) {
  return spr('sil' + k, px, (g) => {
    SHELL[k](g);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#c7b089';
    g.fillRect(-SOX, -SOY, SW, SH);
  });
}
/** 스티커 찍기: (0,0) = 발 가운데, u = 반지름 px */
function stamp(ctx: C2, c: HTMLCanvasElement, u: number) {
  ctx.drawImage(c, -SOX * u, -SOY * u, SW * u, SH * u);
}
/** 아직 안 구운 스티커를 남는 프레임에 조금씩 */
function warm(key: string, px: number, make: () => void) {
  if (SPR.has(key + ':' + Math.max(6, Math.round(px)))) return false;
  make();
  return true;
}

/** 손가락 (톡 할 곳 안내) */
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
/** 장 끝 선물 (바닷가의 큰 물건): 0장 진주 조개 · 따개비 바위 / 1장 큰 불가사리 · 소용돌이 소라. (x,y) = 바닥 가운데, k = 크기 px */
function drawPerk(ctx: C2, ch: number, i: number, x: number, y: number, k: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.5, k * 0.04);
  ctx.strokeStyle = OUT;
  ctx.fillStyle = 'rgba(60,40,20,.22)';
  ell(ctx, 0, 0, k * 0.9, k * 0.22);
  ctx.fill();
  const bob = Math.sin(t * 0.08 + i) * k * 0.03;
  if (ch === 0 && i === 0) {
    // 진주 조개
    ctx.beginPath();
    ctx.moveTo(-k * 0.8, -k * 0.1);
    ctx.bezierCurveTo(-k * 0.85, -k * 0.55, k * 0.85, -k * 0.55, k * 0.8, -k * 0.1);
    ctx.quadraticCurveTo(0, k * 0.08, -k * 0.8, -k * 0.1);
    ink(ctx, lin(ctx, 0, -k * 0.5, 0, 0, [0, '#ffe9f2'], [1, '#e7a5c3']), Math.max(1.5, k * 0.04));
    ell(ctx, 0, -k * 0.38 + bob, k * 0.26, k * 0.26);
    ink(ctx, radg(ctx, -k * 0.08, -k * 0.46, 0, k * 0.3, [0, '#ffffff'], [0.7, '#f3f0ff'], [1, '#c9c2ea']), Math.max(1.5, k * 0.04));
    ctx.save();
    ctx.translate(0, -k * 0.38);
    ctx.rotate(-0.9);
    ctx.beginPath();
    ctx.moveTo(-k * 0.8, 0);
    ctx.bezierCurveTo(-k * 0.85, -k * 0.6, k * 0.85, -k * 0.6, k * 0.8, 0);
    ctx.quadraticCurveTo(0, k * 0.1, -k * 0.8, 0);
    ink(ctx, lin(ctx, 0, -k * 0.6, 0, 0, [0, '#fff4f9'], [1, '#f0a9c9']), Math.max(1.5, k * 0.04));
    ctx.restore();
  } else if (ch === 0) {
    // 따개비 바위
    ctx.beginPath();
    ctx.moveTo(-k * 0.85, 0);
    ctx.bezierCurveTo(-k * 0.95, -k * 0.7, -k * 0.2, -k * 1.0, k * 0.2, -k * 0.85);
    ctx.bezierCurveTo(k * 0.85, -k * 0.75, k * 0.95, -k * 0.3, k * 0.85, 0);
    ctx.closePath();
    ink(ctx, radg(ctx, -k * 0.2, -k * 0.6, 0, k, [0, '#c9cfd6'], [1, '#7c8794']), Math.max(1.5, k * 0.04));
    for (const [bx, by, br] of [[-0.45, -0.45, 0.16], [0.05, -0.65, 0.2], [0.45, -0.35, 0.15], [-0.1, -0.25, 0.12]] as [number, number, number][]) {
      starPath(ctx, k * bx, k * by, k * br, 0.75, 0, 6);
      ink(ctx, '#f6efe0', Math.max(1, k * 0.025));
      ell(ctx, k * bx, k * by, k * br * 0.35, k * br * 0.35);
      ctx.fillStyle = '#5b4a3a';
      ctx.fill();
    }
  } else if (i === 0) {
    // 큰 불가사리
    ctx.save();
    ctx.translate(0, -k * 0.5 + bob);
    ctx.rotate(Math.sin(t * 0.05) * 0.2);
    starPath(ctx, 0, 0, k * 0.62, 0.45);
    ink(ctx, radg(ctx, -k * 0.1, -k * 0.1, 0, k * 0.6, [0, '#ffd0a0'], [1, '#ff7a45']), Math.max(1.5, k * 0.04));
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    for (let j = 0; j < 5; j++) ell(ctx, Math.cos(-Math.PI / 2 + j * 1.257) * k * 0.3, Math.sin(-Math.PI / 2 + j * 1.257) * k * 0.3, k * 0.04, k * 0.04), ctx.fill();
    ctx.restore();
  } else {
    // 소용돌이 소라
    ctx.save();
    ctx.translate(0, bob);
    ctx.scale(k / 1.8, k / 1.8);
    SHELL.conch(ctx);
    ctx.restore();
    ctx.strokeStyle = 'rgba(80,200,255,.8)';
    ctx.lineWidth = Math.max(1.5, k * 0.04);
    ctx.beginPath();
    for (let j = 0; j <= 30; j++) {
      const a = j * 0.45 + t * 0.12, q = k * (0.1 + j * 0.022);
      const px = Math.cos(a) * q, py = -k * 0.6 + Math.sin(a) * q * 0.45;
      if (j) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ───────────────────────────── 그리기: 무대 ─────────────────────────────
interface Pal { sky: [string, string]; sea: [string, string, string]; wet: string; sand: [string, string]; ripple: string; deco: string[]; grass: string; far: string }
const PALS: Pal[] = [
  { sky: ['#5cc4f2', '#d4f3ff'], sea: ['#1aa3d6', '#38c6e6', '#7fe3ee'], wet: '#e7c98f', sand: ['#ffe9b8', '#f6d38c'], ripple: 'rgba(200,150,80,.35)', deco: ['#ff9ecb', '#ffffff', '#ffd23f'], grass: '#7cc95a', far: '#9fe0a0' },
  { sky: ['#47b8ef', '#cfeeff'], sea: ['#1590c8', '#2cb6dc', '#79dcec'], wet: '#d9be8a', sand: ['#fbe3b0', '#eccb88'], ripple: 'rgba(180,130,70,.35)', deco: ['#ffffff', '#ff9a3c', '#9fd8ff'], grass: '#6fbf63', far: '#c9d6e3' },
  { sky: ['#ffb9a6', '#ffeec9'], sea: ['#1fa9c9', '#4fd1d9', '#a6f0e6'], wet: '#efc2a2', sand: ['#ffe6cc', '#f8c9a2'], ripple: 'rgba(210,140,110,.35)', deco: ['#ff7f9c', '#ffd23f', '#ffffff'], grass: '#8fd36a', far: '#ffd9b0' },
];
const BGS = new Map<string, HTMLCanvasElement>();
function cloud(g: C2, x: number, y: number, k: number, col: string) {
  g.fillStyle = col;
  for (const [dx, dy, r] of [[-0.9, 0.1, 0.5], [-0.3, -0.25, 0.7], [0.45, -0.1, 0.6], [1.0, 0.15, 0.42], [0.1, 0.2, 0.75]]) ell(g, x + dx * k, y + dy * k, r * k, r * k * 0.8), g.fill();
}
function palm(g: C2, x: number, y: number, k: number, flip: number) {
  g.save();
  g.translate(x, y);
  g.scale(flip, 1);
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(-k * 0.12, 0);
  g.quadraticCurveTo(k * 0.15, -k * 1.2, k * 0.65, -k * 2.1);
  g.lineTo(k * 0.78, -k * 2.02);
  g.quadraticCurveTo(k * 0.35, -k * 1.2, k * 0.14, 0);
  g.closePath();
  g.fillStyle = lin(g, 0, 0, k, 0, [0, '#b07a45'], [1, '#d9a46a']);
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = Math.max(1.5, k * 0.04);
  g.stroke();
  g.strokeStyle = 'rgba(90,50,20,.45)';
  for (let i = 1; i < 8; i++) {
    const q = i / 8, px = k * (0.0 + q * q * 0.7), py = -k * 2.05 * q;
    g.beginPath();
    g.moveTo(px - k * 0.1, py);
    g.lineTo(px + k * 0.14, py - k * 0.04);
    g.stroke();
  }
  const tx = k * 0.72, ty = -k * 2.08;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI + i * 0.55 + 0.1, L = k * (0.9 + (i % 2) * 0.25);
    g.beginPath();
    g.moveTo(tx, ty);
    g.quadraticCurveTo(tx + Math.cos(a) * L * 0.6, ty + Math.sin(a) * L * 0.6 - k * 0.25, tx + Math.cos(a) * L, ty + Math.sin(a) * L + k * 0.25);
    g.quadraticCurveTo(tx + Math.cos(a) * L * 0.55, ty + Math.sin(a) * L * 0.55 + k * 0.05, tx, ty);
    g.fillStyle = i % 2 ? '#4fae4a' : '#6cc95a';
    g.fill();
    g.strokeStyle = OUT;
    g.stroke();
  }
  for (const [dx, dy] of [[-0.05, 0.12], [0.12, 0.15]]) ell(g, tx + dx * k, ty + dy * k, k * 0.1, k * 0.1), ink(g, '#8a5a2a', Math.max(1, k * 0.03));
  g.restore();
}
/** 배경 한 장(장마다): 하늘 · 먼 풍경 · 바다 · 젖은 모래 · 마른 모래 · 소품 · 아래 덤불 */
function bakeBg(ch: number, w: number, h: number, sc: number): HTMLCanvasElement {
  const key = `${ch}:${w}:${h}:${sc}`;
  let c = BGS.get(key);
  if (c) return c;
  if (BGS.size > 4) BGS.clear();
  c = layer(w * sc, h * sc, (g) => {
    g.scale(sc, sc);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const P = PALS[ch], R = (v: number) => v * w, HZ = R(0.3);
    g.fillStyle = lin(g, 0, 0, 0, HZ, [0, P.sky[0]], [1, P.sky[1]]);
    g.fillRect(0, 0, w, HZ + 1);
    g.fillStyle = radg(g, R(0.82), R(0.15), 0, R(0.2), [0, 'rgba(255,250,210,1)'], [0.3, 'rgba(255,246,200,.6)'], [1, 'rgba(255,255,255,0)']);
    g.fillRect(R(0.55), 0, R(0.45), R(0.35));
    ell(g, R(0.82), R(0.15), R(0.045), R(0.045));
    g.fillStyle = '#fffbe6';
    g.fill();
    cloud(g, R(0.2), R(0.17), R(0.045), 'rgba(255,255,255,.95)');
    cloud(g, R(0.55), R(0.22), R(0.03), 'rgba(255,255,255,.85)');
    // 먼 풍경: 섬 · 등대 · 산호섬
    g.fillStyle = P.far;
    g.beginPath();
    g.moveTo(R(0.02), HZ);
    g.quadraticCurveTo(R(0.12), HZ - R(0.05), R(0.26), HZ);
    g.fill();
    g.beginPath();
    g.moveTo(R(0.6), HZ);
    g.quadraticCurveTo(R(0.72), HZ - R(0.035), R(0.86), HZ);
    g.fill();
    if (ch === 1) {
      rr(g, R(0.14), HZ - R(0.11), R(0.025), R(0.08), R(0.004));
      g.fillStyle = '#ffffff';
      g.fill();
      g.fillStyle = '#ff5a4e';
      g.fillRect(R(0.14), HZ - R(0.09), R(0.025), R(0.015));
      g.fillRect(R(0.14), HZ - R(0.06), R(0.025), R(0.015));
      g.beginPath();
      g.moveTo(R(0.135), HZ - R(0.11));
      g.lineTo(R(0.1525), HZ - R(0.135));
      g.lineTo(R(0.17), HZ - R(0.11));
      g.fill();
    }
    if (ch === 2) palm(g, R(0.72), HZ + R(0.005), R(0.03), 1);
    // 돛단배
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(R(0.42), HZ + R(0.03));
    g.lineTo(R(0.42), HZ - R(0.03));
    g.lineTo(R(0.45), HZ + R(0.025));
    g.fill();
    g.fillStyle = '#ff7a45';
    rr(g, R(0.405), HZ + R(0.025), R(0.055), R(0.012), R(0.006));
    g.fill();
    // 바다
    g.fillStyle = lin(g, 0, HZ, 0, R(SHORE + 0.02), [0, P.sea[0]], [0.6, P.sea[1]], [1, P.sea[2]]);
    g.fillRect(0, HZ, w, R(SHORE + 0.02) - HZ);
    g.strokeStyle = 'rgba(255,255,255,.35)';
    g.lineWidth = 1.2;
    for (let i = 0; i < 14; i++) {
      const y = HZ + R(0.01) + hsh(i) * (R(SHORE) - HZ - R(0.02)), x = hsh(i + 5) * w;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + R(0.04 + hsh(i + 2) * 0.05), y);
      g.stroke();
    }
    // 모래 (젖은 → 마른)
    g.fillStyle = lin(g, 0, R(SHORE), 0, h, [0, P.wet], [0.12, P.sand[0]], [1, P.sand[1]]);
    g.fillRect(0, R(SHORE), w, h - R(SHORE));
    g.strokeStyle = P.ripple;
    g.lineWidth = 1.3;
    for (let i = 0; i < 26; i++) {
      const y = R(SHORE + 0.06 + hsh(i * 3) * 0.66), x = hsh(i * 7) * w, L = R(0.05 + hsh(i) * 0.08);
      g.beginPath();
      g.moveTo(x - L, y);
      g.quadraticCurveTo(x, y - R(0.012), x + L, y);
      g.stroke();
    }
    // 작은 장식(조가비 · 불가사리 · 조약돌)
    for (let i = 0; i < 16; i++) {
      const x = R(0.05 + hsh(i + 40) * 0.9), y = R(SHORE + 0.06 + hsh(i + 60) * 0.66), k = R(0.009 + hsh(i) * 0.006), col = P.deco[i % 3];
      if (i % 3 === 0) starPath(g, x, y, k * 1.4, 0.45), ink(g, '#ffb38a', 1);
      else if (i % 3 === 1) (g.beginPath(), g.arc(x, y, k, Math.PI, 0), g.closePath(), ink(g, col, 1));
      else ell(g, x, y, k, k * 0.7), ink(g, '#c9b8a0', 0.8);
    }
    if (ch === 1) {
      // 바위 웅덩이
      for (const [x, y, k] of [[0.06, 0.7, 0.055], [0.95, 0.86, 0.05], [0.92, 0.62, 0.035]] as [number, number, number][]) {
        ell(g, R(x), R(y), R(k * 1.4), R(k * 0.5));
        g.fillStyle = 'rgba(70,170,210,.55)';
        g.fill();
        g.beginPath();
        g.moveTo(R(x - k), R(y));
        g.quadraticCurveTo(R(x - k * 0.8), R(y - k * 1.2), R(x), R(y - k * 1.1));
        g.quadraticCurveTo(R(x + k * 0.9), R(y - k * 1.0), R(x + k), R(y));
        g.closePath();
        ink(g, radg(g, R(x - k * 0.3), R(y - k * 0.7), 0, R(k * 1.2), [0, '#c9cfd6'], [1, '#7c8794']), 1.5);
      }
    }
    if (ch === 2) {
      // 산호 · 보물 상자
      for (const [x, y, col] of [[0.05, 0.74, '#ff7f9c'], [0.96, 0.68, '#ffb03a']] as [number, number, string][]) {
        g.strokeStyle = OUT;
        g.lineWidth = R(0.014);
        g.beginPath();
        g.moveTo(R(x), R(y));
        g.lineTo(R(x), R(y - 0.06));
        g.moveTo(R(x), R(y - 0.03));
        g.lineTo(R(x - 0.025), R(y - 0.07));
        g.moveTo(R(x), R(y - 0.04));
        g.lineTo(R(x + 0.025), R(y - 0.08));
        g.stroke();
        g.strokeStyle = col;
        g.lineWidth = R(0.008);
        g.stroke();
      }
      rr(g, R(0.9), R(1.16), R(0.07), R(0.045), R(0.008));
      ink(g, '#b0702a', 1.5);
      rr(g, R(0.9), R(1.14), R(0.07), R(0.02), R(0.008));
      ink(g, '#ffd23f', 1.5);
    }
    // 왼쪽 야자수 · 오른쪽 파라솔
    palm(g, R(-0.015), R(1.23), R(0.07), 1);
    g.fillStyle = 'rgba(80,50,20,.2)';
    ell(g, R(0.9), R(1.255), R(0.09), R(0.02));
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = R(0.008);
    g.beginPath();
    g.moveTo(R(0.9), R(1.255));
    g.lineTo(R(0.93), R(1.1));
    g.stroke();
    g.beginPath();
    g.moveTo(R(0.83), R(1.13));
    g.quadraticCurveTo(R(0.93), R(1.02), R(1.03), R(1.1));
    g.closePath();
    ink(g, ch === 2 ? '#ff7f9c' : '#ff5a4e', 1.5);
    g.save();
    g.clip();
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(R(0.93), R(1.06));
      g.lineTo(R(0.85 + i * 0.07), R(1.14));
      g.lineTo(R(0.885 + i * 0.07), R(1.14));
      g.fill();
    }
    g.restore();
    // 아래 덤불(덤불 쪽에서 놈들이 뛰어나온다)
    for (let i = 0; i < 13; i++) {
      const x = R(-0.02 + i * 0.087), y = R(1.31), k = R(0.026 + hsh(i + 90) * 0.012);
      ell(g, x, y, k * 1.3, k);
      ink(g, i % 2 ? P.grass : '#5aa84a', 1.4);
      g.strokeStyle = '#3f8a35';
      g.lineWidth = 1.2;
      for (let j = 0; j < 3; j++) {
        g.beginPath();
        g.moveTo(x + (j - 1) * k * 0.6, y - k * 0.3);
        g.lineTo(x + (j - 1) * k * 0.9, y - k * 1.3);
        g.stroke();
      }
    }
  });
  BGS.set(key, c);
  return c;
}
/** 구경꾼: 덤불 위 아기 거북 셋 (큰 순간에 폴짝) */
function babyTurtle(ctx: C2, x: number, y: number, k: number, hop: number, cheer: boolean, t: number) {
  ctx.save();
  ctx.translate(x, y - hop);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1, k * 0.09);
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * k * 0.75, -k * 0.35);
    ctx.rotate(sd * (cheer ? -0.9 + Math.sin(t * 0.5) * 0.4 : -0.2));
    ell(ctx, sd * k * 0.2, 0, k * 0.32, k * 0.14);
    ink(ctx, '#7fd46a', Math.max(1, k * 0.08));
    ctx.restore();
  }
  ell(ctx, 0, -k * 0.45, k * 0.75, k * 0.55);
  ink(ctx, radg(ctx, -k * 0.2, -k * 0.7, 0, k * 0.8, [0, '#c9f08a'], [1, '#4fa83a']), Math.max(1, k * 0.09));
  ctx.strokeStyle = 'rgba(40,90,30,.6)';
  ctx.beginPath();
  ctx.moveTo(-k * 0.35, -k * 0.65);
  ctx.lineTo(k * 0.35, -k * 0.65);
  ctx.moveTo(0, -k * 0.95);
  ctx.lineTo(0, -k * 0.2);
  ctx.stroke();
  ell(ctx, 0, -k * 1.05, k * 0.38, k * 0.33);
  ink(ctx, '#9be37f', Math.max(1, k * 0.08));
  ctx.save();
  ctx.scale(k, k);
  face(ctx, 0, -1.1, 0.16, 0.12, cheer ? F_HAPPY : F_IDLE, cheer ? 0.15 : 0, 0.8);
  ctx.restore();
  ctx.restore();
}

// ───────────────────────────── 그리기: 장면 ─────────────────────────────
const depth = (y: number) => 0.9 + 0.2 * clamp((y - BY0) / (BY1 - BY0), 0, 1);
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const FOECOL: Record<EK, string> = { flea: '#f0cf8a', star: '#ff9a5a', goblin: '#efc979', gull: '#ffffff', gang: '#ff5a4e', shield: '#6f86e8', lobster: '#ff5a4e', jelly: '#f49adc', clam: '#f0a9c9', captain: '#ffffff', octo: '#ff8a4a', shark: '#8da6bb' };
const LV_GIFT: Record<number, string> = { 3: '머리띠를 둘렀어요', 5: '선글라스를 썼어요', 7: '스카프가 생겼어요', 9: '왕관을 썼어요', 11: '금빛 집게!' };
const recent = new WeakMap<object, { x: number; y: number; t: number; size: number }[]>();
/** 이 껍데기가 지금 모래밭의 놈에게 딱 맞나 */
function fitNow(s: ShellState, k: SK) {
  const b = SD[k].best, n = s.foes.length + s.inbox.length;
  if (SD[k].boss) return true;
  if (b === 'many') return n >= 10;
  if (b === 'few') return n > 0 && n <= 5 && !s.inbox.length;
  return s.foes.some((f) => live(f) && ED[f.k].tag === b);
}
/** 굴러가는 불가사리 (돌면서) */
function drawStar(ctx: C2, x: number, y: number, u: number, rot: number, mood: number) {
  ctx.save();
  ctx.translate(x, y - u);
  ctx.save();
  ctx.rotate(rot);
  ctx.lineJoin = 'round';
  starPath(ctx, 0, 0, u * 1.05, 0.48);
  ctx.fillStyle = radg(ctx, -u * 0.2, -u * 0.2, 0, u * 1.1, [0, '#ffd9b0'], [0.6, '#ff9a5a'], [1, '#e8663a']);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.2, u * 0.09);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  for (let i = 0; i < 5; i++) ell(ctx, Math.cos(-Math.PI / 2 + i * 1.257) * u * 0.55, Math.sin(-Math.PI / 2 + i * 1.257) * u * 0.55, u * 0.07, u * 0.07), ctx.fill();
  ctx.restore();
  ctx.scale(u, u);
  face(ctx, 0, -0.05, 0.22, 0.18, mood === F_IDLE ? F_HAPPY : mood, 0.22, 0.8);
  ctx.restore();
}
/** 갈매기 날개 (파닥파닥) — 몸 위에 앞날개 하나 */
function wings(ctx: C2, x: number, y: number, u: number, fc: number, t: number, big: boolean) {
  const flap = Math.sin(t * (big ? 0.18 : 0.35));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(fc, 1);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(u * 0.25, -u * 1.0);
  ctx.quadraticCurveTo(-u * 0.2, -u * (1.5 + flap * 0.9), -u * 1.3, -u * (1.45 + flap * 1.0));
  ctx.quadraticCurveTo(-u * 0.9, -u * (1.05 + flap * 0.3), -u * 1.05, -u * (0.8 + flap * 0.1));
  ctx.quadraticCurveTo(-u * 0.4, -u * 0.75, u * 0.25, -u * 1.0);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -u * 1.6, 0, -u * 0.8, [0, '#ffffff'], [1, '#c7d2dc']);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, u * 0.08);
  ctx.stroke();
  ctx.fillStyle = '#5b6b7c';
  ctx.beginPath();
  ctx.moveTo(-u * 1.3, -u * (1.45 + flap * 1.0));
  ctx.quadraticCurveTo(-u * 1.05, -u * (1.2 + flap * 0.6), -u * 1.0, -u * (1.05 + flap * 0.35));
  ctx.lineTo(-u * 1.12, -u * (1.15 + flap * 0.5));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawAll(ctx: C2, s: ShellState, w: number, h: number, _th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const sc = typeof ctx.getTransform === 'function' ? Math.min(3, Math.max(1, Math.round(ctx.getTransform().a || 1))) : 1, sc2 = Math.min(2, sc);
  const d = STAGES[s.stage], ch = d.ch, c = s.crab, seenT = fx.memo.t ?? -1;
  // 미리 굽기: 결과·선물 화면에서는 다음 장의 배경을, 판 중에는 이 판에 나올 껍데기·놈 스티커를 한 프레임에 하나씩
  if ((s.phase === 'result' || s.phase === 'pick') && s.pt > 20 && s.stage + 1 < STAGES.length) bakeBg(STAGES[s.stage + 1].ch, Math.round(w), Math.round(h), sc2);
  {
    const list: (() => boolean)[] = [];
    for (const k of unlocked(s.stage)) list.push(() => warm('s' + k, R(SD[k].r) * sc2, () => shellSpr(k, R(SD[k].r) * sc2)));
    for (const [k] of d.groups.flatMap((g) => g.mons)) for (const m of [F_IDLE, F_HURT, F_DIZZY]) list.push(() => warm('f' + k + m, R(ED[k].r) * sc2, () => foeSpr(k, m, R(ED[k].r) * sc2)));
    let i = fx.memo['wm' + s.stage] ?? 0;
    for (; i < list.length; i++) if (list[i]()) break;
    fx.memo['wm' + s.stage] = i;
  }
  const puff = (x: number, y: number, col: string, n: number, spd = 3, size = 3) => {
    if (fx.particles.length < 150) fx.burst(x, y, col, Math.min(n, 150 - fx.particles.length), spd, size);
  };
  const say = (x: number, y: number, str: string, col: string, size: number) => {
    let rec = recent.get(s);
    if (!rec) recent.set(s, (rec = []));
    x = clamp(x, w * 0.12, w * 0.88);
    y = Math.max(Y(0.16), y);
    for (let k = 0; k < 5 && rec.some((q) => t - q.t < 30 && Math.abs(q.x - x) < w * 0.16 && Math.abs(q.y - y) < (size + q.size) * 0.55); k++) y -= size * 0.9;
    rec.push({ x, y, t, size });
    if (rec.length > 14) rec.shift();
    fx.pop(x, y, str, col, size);
  };
  const cheer = (s.big && t - s.big.t < 80) || s.phase === 'result' || (s.phase === 'end' && s.won);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.save();
  fx.begin(ctx);
  ctx.drawImage(bakeBg(ch, Math.round(w), Math.round(h), sc2), 0, 0, w, h);
  // ── 반짝이는 바다 · 물가 거품 · 물결이 들고 남(껍데기 배달) ──
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (let i = 0; i < 9; i++) {
    const ph = (t * 0.02 + i * 0.37) % 1, x = X(0.05 + hsh(i + 3) * 0.9), y = Y(0.32 + hsh(i + 8) * (SHORE - 0.36));
    ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.8;
    starPath(ctx, x, y, R(0.008), 0.3, 0, 4);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const lap = Math.sin(t * 0.03) * 0.008;
  const surgeY = s.surge ? SHORE + (s.surge.depth - SHORE) * Math.sin(Math.min(1, s.surge.t / SURGE_LEN) * Math.PI) : SHORE;
  const shoreY = Math.max(SHORE + lap, surgeY);
  {
    ctx.beginPath();
    ctx.moveTo(0, Y(SHORE - 0.02));
    for (let i = 0; i <= 20; i++) {
      const x = i / 20, y = shoreY + Math.sin(i * 1.3 + t * 0.05) * 0.006 + (s.surge ? Math.sin(i * 0.7 + 1) * 0.02 * Math.min(1, s.surge.t / 20) : 0);
      ctx.lineTo(X(x), Y(y));
    }
    ctx.lineTo(w, Y(SHORE - 0.02));
    ctx.closePath();
    ctx.fillStyle = 'rgba(120,220,240,.55)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.lineWidth = R(0.012);
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const x = i / 20, y = shoreY + Math.sin(i * 1.3 + t * 0.05) * 0.006 + (s.surge ? Math.sin(i * 0.7 + 1) * 0.02 * Math.min(1, s.surge.t / 20) : 0);
      if (i) ctx.lineTo(X(x), Y(y));
      else ctx.moveTo(X(x), Y(y));
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    for (let i = 0; i < 12; i++) {
      const x = (i + 0.5) / 12;
      ell(ctx, X(x + Math.sin(t * 0.04 + i) * 0.01), Y(shoreY + Math.sin(i * 1.3 + t * 0.05) * 0.006 + 0.004), R(0.012), R(0.006));
      ctx.fill();
    }
  }
  // ── 바닥 위험 표시: 폭탄 · 문어 다리 · 도깨비 주먹 · 가재 돌진 ──
  for (const m of s.marks) {
    if (m.t < 0) continue;
    const q = m.t / m.T, pul = 0.5 + 0.5 * Math.sin(t * (0.3 + q * 0.6));
    ell(ctx, X(m.x), Y(m.y), R(m.r), R(m.r) * YS);
    ctx.fillStyle = `rgba(255,60,50,${0.12 + 0.25 * q + 0.1 * pul})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,70,50,${0.6 + 0.4 * q})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ell(ctx, X(m.x), Y(m.y), R(m.r) * q, R(m.r) * q * YS);
    ctx.fillStyle = 'rgba(255,80,60,.25)';
    ctx.fill();
  }
  for (const f of s.foes) {
    if (f.dead || f.st !== WIND) continue;
    ctx.strokeStyle = 'rgba(255,70,50,.85)';
    ctx.fillStyle = 'rgba(255,70,50,.18)';
    ctx.lineWidth = 2.2;
    if (f.k === 'lobster') {
      const L = R(0.42), a = f.ang;
      ctx.beginPath();
      ctx.moveTo(X(f.x) + Math.cos(a + 1.57) * R(0.035), Y(f.y) + Math.sin(a + 1.57) * R(0.035) * YS);
      ctx.lineTo(X(f.x) + Math.cos(a) * L + Math.cos(a + 1.57) * R(0.035), Y(f.y) + Math.sin(a) * L * YS + Math.sin(a + 1.57) * R(0.035) * YS);
      ctx.lineTo(X(f.x) + Math.cos(a) * (L + R(0.05)), Y(f.y) + Math.sin(a) * (L + R(0.05)) * YS);
      ctx.lineTo(X(f.x) + Math.cos(a) * L - Math.cos(a + 1.57) * R(0.035), Y(f.y) + Math.sin(a) * L * YS - Math.sin(a + 1.57) * R(0.035) * YS);
      ctx.lineTo(X(f.x) - Math.cos(a + 1.57) * R(0.035), Y(f.y) - Math.sin(a + 1.57) * R(0.035) * YS);
      ctx.closePath();
    } else ell(ctx, X(f.ax), Y(f.ay), R(0.095), R(0.095) * YS);
    ctx.fill();
    ctx.stroke();
  }
  // ── NEW 스포트라이트 · 무서운 껍데기 ──
  const spotSh = s.spot && s.phase === 'play' ? s.shells.find((o) => o.id === s.spot!.id) : undefined;
  if (spotSh) {
    const u = R(SD[spotSh.k].r), pul = 0.5 + 0.5 * Math.sin(t * 0.2), boss = spotSh.boss;
    ctx.fillStyle = boss ? `rgba(255,90,60,${0.3 + 0.2 * pul})` : `rgba(255,236,120,${0.35 + 0.2 * pul})`;
    ell(ctx, X(spotSh.x), Y(spotSh.y), u * (1.6 + pul * 0.25), u * (1.6 + pul * 0.25) * YS * 0.7);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -t * 0.5;
    ctx.stroke();
    ctx.setLineDash([]);
    if (boss) {
      // 하늘로 빛기둥
      ctx.fillStyle = lin(ctx, 0, Y(spotSh.y) - R(0.5), 0, Y(spotSh.y), [0, 'rgba(255,230,120,0)'], [1, `rgba(255,230,120,${0.35 + 0.2 * pul})`]);
      ctx.fillRect(X(spotSh.x) - u * 0.9, Y(spotSh.y) - R(0.5), u * 1.8, R(0.5));
    }
  }
  // ── 그림자 (하늘의 놈 · 날아가는 껍데기 · 뛰는 소라게) ──
  ctx.fillStyle = 'rgba(70,45,20,.22)';
  for (const f of s.foes) if (!f.dead && f.alt > 0.02) ell(ctx, X(f.x), Y(f.y), R(f.r) * (1.1 - f.alt * 2), R(f.r) * 0.35), ctx.fill();
  for (const o of s.toss) {
    const u = o.t / o.T;
    ell(ctx, X(o.x0 + (o.x1 - o.x0) * u), Y(o.y0 + SD[o.k].r * 0.5 + (o.y1 - o.y0 - SD[o.k].r * 0.5) * u), R(SD[o.k].r) * 0.7, R(SD[o.k].r) * 0.22);
    ctx.fill();
  }

  // ── 모래밭의 것들 (아래쪽일수록 앞) ──
  type Item = { y: number; f: () => void };
  const items: Item[] = [];
  for (const o of s.shells) {
    items.push({ y: o.y, f: () => {
      const u = R(SD[o.k].r) * depth(o.y) * (o.boss ? 1.05 : 0.95), age = t - o.born, k = clamp(age / Math.max(1, o.inT), 0, 1);
      const x = X(o.sx + (o.x - o.sx) * k), yy = Y(o.sy + (o.y - o.sy) * k) - (o.inT && k < 1 && o.boss ? Math.sin(k * Math.PI) * R(0.25) : 0);
      const bob = k >= 1 ? Math.max(0, Math.sin(t * 0.08 + o.id) - 0.7) * u * 0.25 : 0;
      ctx.fillStyle = 'rgba(70,45,20,.25)';
      ell(ctx, x, Y(o.y), u * 1.05, u * 0.3);
      ctx.fill();
      // 지금 모래밭의 놈과 어울리는 껍데기: 바닥이 살짝 반짝 (글자 없이)
      if (k >= 1 && fitNow(s, o.k)) {
        const pul = 0.5 + 0.5 * Math.sin(t * 0.12 + o.id);
        ctx.fillStyle = `rgba(255,246,170,${0.22 + 0.18 * pul})`;
        ell(ctx, x, Y(o.y), u * 1.35, u * 0.42);
        ctx.fill();
        for (let i = 0; i < 3; i++) {
          const ph = (t * 0.025 + i / 3 + o.id * 0.1) % 1;
          ctx.fillStyle = `rgba(255,255,255,${Math.sin(ph * Math.PI) * 0.9})`;
          starPath(ctx, x + Math.cos(i * 2.1 + o.id) * u * 0.9, Y(o.y) - u * 0.2 - ph * u * 1.4, u * 0.13, 0.3, 0, 4);
          ctx.fill();
        }
      }
      ctx.save();
      ctx.translate(x, yy - bob + u * 0.12);
      // 빈 껍데기는 기울어 누워 있다
      ctx.rotate(o.tilt + (k < 1 ? (1 - k) * 2.5 : 0));
      // 반짝(톡 할 수 있다)
      if (k >= 1 && (t + o.id * 13) % 90 < 10) {
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        starPath(ctx, u * 0.6, -u * 1.4, u * 0.25 * (1 - Math.abs(((t + o.id * 13) % 90) - 5) / 5), 0.3, 0, 4);
        ctx.fill();
      }
      stamp(ctx, shellSpr(o.k, u * sc2), u);
      if (o.hp < o.max * 0.66) {
        ctx.strokeStyle = 'rgba(60,30,20,.8)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(-u * 0.3, -u * 1.2);
        ctx.lineTo(-u * 0.1, -u * 0.9);
        ctx.lineTo(-u * 0.25, -u * 0.6);
        ctx.stroke();
      }
      ctx.restore();
      // 젖은 모래에 반쯤 묻힘
      if (k >= 1) {
        ctx.fillStyle = 'rgba(240,210,150,.55)';
        ell(ctx, x, Y(o.y) - u * 0.02, u * 0.75, u * 0.15);
        ctx.fill();
      }
    } });
  }
  for (const f of s.foes) {
    if (f.dead) continue;
    items.push({ y: f.y, f: () => {
      const D = ED[f.k], u = R(f.r) * depth(f.y) * (D.boss ? 1 : 1.05), fc = f.face;
      const hurtA = t - f.hurtT;
      let mood = f.stun > 0 ? F_DIZZY : f.scared > 0 ? F_SCARED : hurtA < 8 ? F_HURT : f.st === WIND ? F_ANGRY : F_IDLE;
      if (f.k === 'clam') mood = f.open > 0 ? F_HAPPY : hurtA < 8 ? F_HURT : f.stun > 0 ? F_DIZZY : F_IDLE;
      const hop = f.k === 'flea' && f.tm > 0 ? Math.sin((f.tm / 9) * Math.PI) * u * 1.2 : t - f.walkT < 3 ? Math.abs(Math.sin(t * 0.35 + f.seed)) * u * 0.12 : 0;
      const shake = hurtA < 6 ? (hsh(t + f.id) - 0.5) * u * 0.3 : 0;
      let x = X(f.x) + shake, y = Y(f.y) - R(f.alt) - hop;
      if (f.st === ENTER && f.k !== 'star') {
        // 물에서 첨벙 / 덤불에서 폴짝 / 모래 속에서 쏙
        const q = 1 - f.tm / Math.max(1, f.et);
        if (f.k === 'clam') y += u * 1.5 * (1 - q);
        else if (f.fy0 < SHORE) y -= Math.abs(Math.sin(q * Math.PI * 3)) * u * 0.6;
        else y -= Math.abs(Math.sin(q * Math.PI * 4)) * u * 0.8;
      }
      if (f.alt < 0.02) {
        ctx.fillStyle = 'rgba(70,45,20,.25)';
        ell(ctx, X(f.x), Y(f.y), u * 0.95, u * 0.28);
        ctx.fill();
      }
      ctx.save();
      ctx.translate(x, y);
      if (f.k === 'star') {
        ctx.restore();
        drawStar(ctx, x, y, u, f.ang, mood);
        return;
      }
      if (f.k === 'jelly') ctx.translate(0, Math.sin(t * 0.08 + f.seed) * u * 0.15);
      ctx.scale(fc, 1);
      if (f.k === 'goblin' && f.st === WIND) ctx.scale(1 + 0.08 * Math.sin(t * 0.6), 1 - 0.06 * Math.sin(t * 0.6));
      if (f.k === 'lobster' && f.st === DASH) ctx.rotate(0.25);
      stamp(ctx, foeSpr(f.k, mood, u * sc2), u);
      if (f.k === 'gull' || f.k === 'captain') wings(ctx, 0, 0, u, 1, t + f.seed, f.k === 'captain');
      if (f.k === 'shield') {
        // 방패: 병뚜껑 (보는 쪽)
        const fa = Math.cos(f.ang) * fc;
        ctx.save();
        ctx.translate(u * 0.85 * Math.max(0.4, fa), -u * 0.8);
        ell(ctx, 0, 0, u * 0.32 + u * 0.18 * (1 - Math.abs(fa)), u * 0.78);
        ctx.fillStyle = lin(ctx, 0, -u * 0.8, 0, u * 0.8, [0, '#fff3a8'], [1, '#e0a020']);
        ctx.fill();
        ctx.strokeStyle = OUT;
        ctx.lineWidth = Math.max(1.2, u * 0.08);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(150,100,20,.7)';
        ctx.lineWidth = 1;
        for (let i = -3; i <= 3; i++) (ctx.beginPath(), ctx.moveTo(-u * 0.2, i * u * 0.2), ctx.lineTo(u * 0.2, i * u * 0.2), ctx.stroke());
        ctx.restore();
      }
      if (f.k === 'captain' && !s.bossDrop) {
        ctx.save();
        ctx.translate(u * 0.5, -u * 1.75);
        ctx.scale(u * 0.45 / 1.1, u * 0.45 / 1.1);
        ctx.lineJoin = 'round';
        SHELL.helmet(ctx);
        ctx.restore();
      }
      if (f.k === 'octo' && !s.bossDrop) {
        ctx.save();
        ctx.translate(u * 1.05, -u * 0.4);
        ctx.rotate(-0.3);
        ctx.scale(u * 0.35, u * 0.35);
        drawAnchorHead(ctx, 0, 0, 1);
        ctx.restore();
      }
      if (f.k === 'shark' && !s.bossDrop) {
        rr(ctx, -u * 0.05, -u * 2.0, u * 0.14, u * 0.7, u * 0.05);
        ink(ctx, '#8c99a8', Math.max(1, u * 0.05));
        rr(ctx, -u * 0.05, -u * 2.05, u * 0.38, u * 0.16, u * 0.06);
        ink(ctx, '#8c99a8', Math.max(1, u * 0.05));
      }
      ctx.restore();
      if (D.boss) {
        // 대장 체력 띠
        const bw = R(0.16), by = y - u * 2.7, q = clamp(f.hp / f.max, 0, 1);
        rr(ctx, x - bw / 2 - 1.5, by - 1.5, bw + 3, R(0.016) + 3, R(0.01));
        ctx.fillStyle = OUT;
        ctx.fill();
        rr(ctx, x - bw / 2, by, bw * q, R(0.016), R(0.008));
        ctx.fillStyle = q > 0.55 ? '#ff5a4e' : '#ffb84a';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - bw / 2 + bw * 0.55, by - 1, 1.5, R(0.016) + 2);
      } else if (f.hp < f.max && f.max >= 40) {
        const bw = u * 1.4, by = y - u * 2.3, q = clamp(f.hp / f.max, 0, 1);
        ctx.fillStyle = 'rgba(74,44,29,.75)';
        ctx.fillRect(x - bw / 2 - 1, by - 1, bw + 2, 5);
        ctx.fillStyle = '#7ee05a';
        ctx.fillRect(x - bw / 2, by, bw * q, 3);
      }
      if (f.stun > 0) {
        for (let i = 0; i < 3; i++) {
          const a = t * 0.15 + (i * TAU) / 3;
          ctx.fillStyle = '#ffe36b';
          starPath(ctx, x + Math.cos(a) * u * 0.7, y - u * 2.1 + Math.sin(a) * u * 0.2, u * 0.18, 0.45);
          ctx.fill();
        }
      }
    } });
  }
  // 소라게
  items.push({ y: c.leap ? c.leap.y1 - 0.001 : c.y, f: () => drawCrab(ctx, s, X, Y, R, sc2) });
  // 쓰러진 놈 (데굴 · 펑)
  for (const q of s.corpses) {
    items.push({ y: q.y, f: () => {
      const a = t - q.t, u = R(ED[q.k].r) * depth(q.y), sd = q.vx >= 0 ? 1 : -1;
      if (q.how === 1) {
        // 해파리 펑: 고리
        ctx.strokeStyle = `rgba(244,154,220,${1 - a / 20})`;
        ctx.lineWidth = 3;
        ell(ctx, X(q.x), Y(q.y) - u, u * (1 + a * 0.12), u * (1 + a * 0.12));
        if (a < 20) ctx.stroke();
        return;
      }
      const T = q.how === 2 ? 44 : 26;
      if (a > T) return;
      const k = a / T;
      ctx.save();
      ctx.globalAlpha = 1 - k * k;
      ctx.translate(X(q.x) + sd * R(0.08) * k, Y(q.y) - Math.sin(k * Math.PI) * R(0.07) * (q.how === 2 ? 2 : 1));
      ctx.rotate(sd * k * 4);
      if (q.k === 'star') starPath(ctx, 0, -u, u, 0.48), ink(ctx, '#ff9a5a', 1.5);
      else stamp(ctx, foeSpr(q.k, F_DIZZY, u * sc2), u);
      ctx.restore();
    } });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();
  // 깨진 껍데기 조각
  for (const q of s.shards) {
    const a = t - q.t, u = R(SD[q.k].r) * (q.big ? 1.2 : 0.8);
    if (a > 34) continue;
    ctx.globalAlpha = 1 - a / 34;
    ctx.fillStyle = SD[q.k].col;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const an = hsh(q.seed + i) * TAU, v = R(0.004) * (1 + hsh(q.seed + i * 2) * 1.5);
      const px = X(q.x) + Math.cos(an) * v * a, py = Y(q.y) - u + Math.sin(an) * v * a * 0.6 + 0.02 * a * a;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a * 0.3 + i);
      ctx.beginPath();
      ctx.moveTo(-u * 0.18, -u * 0.1);
      ctx.lineTo(u * 0.2, -u * 0.15);
      ctx.lineTo(u * 0.05, u * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  // ── 고둥이 부른 큰 파도 ──
  if (s.tide) {
    const ty = Y(s.tide.y);
    ctx.fillStyle = lin(ctx, 0, ty - R(0.2), 0, ty, [0, 'rgba(40,170,230,0)'], [0.6, 'rgba(60,190,240,.55)'], [1, 'rgba(120,225,250,.85)']);
    ctx.fillRect(0, ty - R(0.2), w, R(0.2));
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(30,120,190,.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, ty);
    for (let i = 0; i <= 24; i++) {
      const x = i / 24;
      ctx.quadraticCurveTo(X(x - 0.02), ty - R(0.035) - Math.sin(i * 1.7 + t * 0.3) * R(0.01), X(x), ty + Math.sin(i * 2.1) * R(0.006));
    }
    ctx.lineTo(w, ty + R(0.02));
    ctx.lineTo(0, ty + R(0.02));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // ── 날아가는 껍데기 (버린 껍데기 휙 → 쾅) ──
  for (const o of s.toss) {
    const u0 = o.t / o.T, u = R(SD[o.k].r) * 0.9, hgt = Math.sin(u0 * Math.PI) * R(0.12 + dist(o.x0, o.y0, o.x1, o.y1) * 0.25);
    const x = X(o.x0 + (o.x1 - o.x0) * u0), y = Y(o.y0 + (o.y1 - o.y0) * u0) - hgt;
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const q = Math.max(0, u0 - i * 0.04), px = X(o.x0 + (o.x1 - o.x0) * q), py = Y(o.y0 + (o.y1 - o.y0) * q) - Math.sin(q * Math.PI) * R(0.12 + dist(o.x0, o.y0, o.x1, o.y1) * 0.25);
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.stroke();
    ctx.save();
    ctx.translate(x, y + u);
    ctx.rotate(o.spin * u0 * 9);
    stamp(ctx, shellSpr(o.k, u * sc2), u);
    ctx.restore();
  }
  // ── 날아가는 것: 대포알 · 어뢰 · 진주 침 · 폭탄 상자 ──
  for (const p of s.proj) {
    const u0 = Math.min(1, p.t / p.T);
    if (p.k === 'cannon') {
      const hgt = Math.sin(u0 * Math.PI) * R(0.2);
      ell(ctx, X(p.x), Y(p.y) - hgt, R(0.016), R(0.016));
      ink(ctx, radg(ctx, X(p.x) - R(0.005), Y(p.y) - hgt - R(0.005), 0, R(0.016), [0, '#8c99a8'], [1, '#2a3038']), 1.5);
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ell(ctx, X(p.x - (p.x1 - p.x0) * 0.04), Y(p.y - (p.y1 - p.y0) * 0.04) - hgt * 0.9, R(0.012), R(0.009));
      ctx.fill();
    } else if (p.k === 'spit') {
      ell(ctx, X(p.x), Y(p.y) - Math.sin(u0 * Math.PI) * R(0.08), R(0.011), R(0.011));
      ink(ctx, '#ffffff', 1.2);
    } else {
      const a = p.k === 'mytorp' ? Math.atan2(p.y0, p.x0) : Math.atan2(p.y1 - p.y0, p.x1 - p.x0);
      ctx.save();
      ctx.translate(X(p.x), Y(p.y));
      ctx.rotate(a);
      rr(ctx, -R(0.025), -R(0.009), R(0.05), R(0.018), R(0.009));
      ink(ctx, p.k === 'mytorp' ? '#ffd23f' : '#8da6bb', 1.3);
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      for (let i = 1; i < 4; i++) ell(ctx, -R(0.025 + i * 0.012), 0, R(0.005 * (1 - i * 0.2)), R(0.005 * (1 - i * 0.2))), ctx.fill();
      ctx.restore();
    }
  }
  // 폭탄 상자 떨어짐
  for (const m of s.marks) {
    if (m.k !== 'bomb' || m.t < 0) continue;
    const q = m.t / m.T, hy = Y(m.y) - R(0.5) * (1 - q);
    ctx.save();
    ctx.translate(X(m.x), hy);
    ctx.rotate(q * 3);
    rr(ctx, -R(0.018), -R(0.018), R(0.036), R(0.036), R(0.005));
    ink(ctx, '#2a2a3a', 1.5);
    ctx.fillStyle = '#ff5a4e';
    ctx.fillRect(-R(0.004), -R(0.03), R(0.008), R(0.014));
    ctx.restore();
  }
  // ── 레이저 · 찌릿 · 줄 ──
  for (const L of s.lines) {
    const a = 1 - (t - L.t) / 18;
    if (a <= 0) continue;
    if (L.k === 0) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(255,200,60,${a * 0.45})`;
      ctx.lineWidth = R(0.08) * a + 2;
      ctx.beginPath();
      ctx.moveTo(X(L.x0), Y(L.y0));
      ctx.lineTo(X(L.x1), Y(L.y1));
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,245,150,${a * 0.9})`;
      ctx.lineWidth = R(0.04) * a + 1.5;
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = R(0.016) * a + 1;
      ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      burstPath(ctx, X(L.x0), Y(L.y0), R(0.045) * a + 3, 8, 0.4, t * 0.2);
      ctx.fill();
    } else {
      ctx.strokeStyle = `rgba(255,240,120,${a})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(X(L.x0), Y(L.y0));
      for (let i = 1; i < 5; i++) {
        const q = i / 5;
        ctx.lineTo(X(L.x0 + (L.x1 - L.x0) * q) + (hsh(L.t + i) - 0.5) * R(0.03), Y(L.y0 + (L.y1 - L.y0) * q) + (hsh(L.t + i * 3) - 0.5) * R(0.03));
      }
      ctx.lineTo(X(L.x1), Y(L.y1));
      ctx.stroke();
    }
  }
  // ── 껍데기마다의 큰 몸짓 (김 · 번쩍 · 가시 · 착지 · 뿌우) ──
  for (const e of s.events) {
    const a = t - e.t;
    if (e.k === 'steam' && a < 30) {
      const ang = e.x2, q = a / 30;
      for (let i = 0; i < 14; i++) {
        const sp = ((i % 7) / 6 - 0.5) * TEA_HALF * 1.8, L = R(TEA_LEN) * (0.25 + q * 0.85) * (0.55 + (i >= 7 ? 0.45 : 0) + hsh(e.t + i) * 0.15);
        const px = X(e.x) + Math.cos(ang + sp) * L, py = Y(e.y) + Math.sin(ang + sp) * L * YS - q * R(0.03);
        ctx.fillStyle = `rgba(255,255,255,${0.9 * (1 - q * q)})`;
        ell(ctx, px, py, R(0.028 + q * 0.04), R(0.024 + q * 0.032));
        ctx.fill();
        ctx.strokeStyle = `rgba(150,200,230,${0.5 * (1 - q)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    } else if (e.k === 'flash' && a < 18) {
      const q = a / 18;
      ctx.fillStyle = `rgba(255,250,170,${0.45 * (1 - q)})`;
      ell(ctx, X(e.x), Y(e.y), R(BULB_R) * (0.4 + q), R(BULB_R) * (0.4 + q) * YS);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,220,60,${1 - q})`;
      ctx.lineWidth = 4 * (1 - q) + 1;
      ctx.stroke();
      for (let i = 0; i < 10; i++) {
        const an = (i / 10) * TAU;
        ctx.strokeStyle = `rgba(255,255,200,${1 - q})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(X(e.x) + Math.cos(an) * R(0.05), Y(e.y) + Math.sin(an) * R(0.05));
        ctx.lineTo(X(e.x) + Math.cos(an) * R(0.06 + q * 0.18), Y(e.y) + Math.sin(an) * R(0.06 + q * 0.18));
        ctx.stroke();
      }
    } else if (e.k === 'spike' && a < 12) {
      const q = a / 12;
      ctx.strokeStyle = `rgba(190,140,255,${1 - q})`;
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 16; i++) {
        const an = (i / 16) * TAU;
        ctx.beginPath();
        ctx.moveTo(X(e.x) + Math.cos(an) * R(0.06), Y(e.y) + R(0.03) + Math.sin(an) * R(0.05));
        ctx.lineTo(X(e.x) + Math.cos(an) * R(0.08 + q * 0.06), Y(e.y) + R(0.03) + Math.sin(an) * R(0.07 + q * 0.05));
        ctx.stroke();
      }
    } else if ((e.k === 'slam' || e.k === 'thud' || e.k === 'tentacle' || e.k === 'punch') && a < 16) {
      const q = a / 16, r = e.k === 'slam' ? 0.15 : 0.1;
      ctx.strokeStyle = `rgba(255,240,200,${1 - q})`;
      ctx.lineWidth = 5 * (1 - q) + 1;
      ell(ctx, X(e.x), Y(e.y), R(r) * (0.3 + q), R(r) * (0.3 + q) * YS);
      ctx.stroke();
    } else if (e.k === 'horn' && a < 30) {
      for (let i = 0; i < 3; i++) {
        const q = ((a / 30) + i * 0.33) % 1;
        ctx.strokeStyle = `rgba(255,200,150,${1 - q})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(X(e.x), Y(e.y), R(0.05 + q * 0.2), -Math.PI * 0.9, -Math.PI * 0.1);
        ctx.stroke();
      }
    } else if (e.k === 'beamcharge' && c.k === 'bottle' && c.mode === 1) {
      // 햇빛 모으기: 해에서 병으로 빛줄기
      ctx.strokeStyle = `rgba(255,250,190,${0.3 + 0.4 * Math.sin(t * 0.8)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X(0.82), Y(0.15));
      ctx.lineTo(X(c.x), Y(c.y) - R(0.06));
      ctx.stroke();
      const cs = Math.cos(c.ang), sn = Math.sin(c.ang) * YS;
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = 'rgba(255,80,60,.7)';
      ctx.beginPath();
      ctx.moveTo(X(c.x), Y(c.y) - R(0.035));
      ctx.lineTo(X(c.x) + cs * R(0.8), Y(c.y) - R(0.035) + sn * R(0.8));
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // 껍데기마다 늘 보이는 몸짓: 해골 으스스 안개 · 깡통 겨눔/먼지 · 로켓 연기 · 공 자취 · 주전자 김
  if (c.k && !c.leap) {
    const cx = X(c.x), cy = Y(c.y), u = R(SD[c.k].r);
    if (c.k === 'skull') {
      ctx.fillStyle = radg(ctx, cx, cy, R(0.04), R(FEAR_R), [0, 'rgba(150,100,220,0)'], [0.75, `rgba(150,100,220,${0.16 + 0.06 * Math.sin(t * 0.15)})`], [1, 'rgba(150,100,220,0)']);
      ell(ctx, cx, cy, R(FEAR_R), R(FEAR_R) * YS);
      ctx.fill();
      for (let i = 0; i < 4; i++) {
        const an = t * 0.03 + (i * TAU) / 4, px = cx + Math.cos(an) * R(FEAR_R) * 0.8, py = cy + Math.sin(an) * R(FEAR_R) * 0.8 * YS - R(0.03);
        ctx.fillStyle = 'rgba(240,235,255,.8)';
        ell(ctx, px, py, R(0.014), R(0.02));
        ctx.fill();
        ctx.fillStyle = '#4a2c6a';
        ell(ctx, px - R(0.004), py - R(0.004), R(0.002), R(0.003));
        ctx.fill();
        ell(ctx, px + R(0.004), py - R(0.004), R(0.002), R(0.003));
        ctx.fill();
      }
    } else if (c.k === 'can') {
      const cs = Math.cos(c.ang), sn = Math.sin(c.ang) * YS;
      if (c.mode === 0 && c.tx > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,.85)';
        ctx.lineWidth = 3;
        ctx.setLineDash([7, 6]);
        ctx.lineDashOffset = -t;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + cs * R(0.3), cy + sn * R(0.3));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        ctx.beginPath();
        ctx.moveTo(cx + cs * R(0.34), cy + sn * R(0.34));
        ctx.lineTo(cx + cs * R(0.29) - sn * R(0.03), cy + sn * R(0.29) + cs * R(0.03));
        ctx.lineTo(cx + cs * R(0.29) + sn * R(0.03), cy + sn * R(0.29) - cs * R(0.03));
        ctx.fill();
      } else if (c.mode === 1) {
        for (let i = 1; i < 6; i++) {
          ctx.fillStyle = `rgba(255,240,210,${0.6 - i * 0.1})`;
          ell(ctx, cx - cs * R(0.03 * i), cy - sn * R(0.03 * i), u * (0.5 - i * 0.05), u * (0.25 - i * 0.03));
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(255,255,255,.8)';
        ctx.lineWidth = 2;
        for (const o of [-0.6, 0, 0.6]) {
          ctx.beginPath();
          ctx.moveTo(cx - cs * u * 1.2 - sn * u * o, cy - u * 0.7 - sn * u * 1.2 + cs * u * o * 0.5);
          ctx.lineTo(cx - cs * u * 2.4 - sn * u * o, cy - u * 0.7 - sn * u * 2.4 + cs * u * o * 0.5);
          ctx.stroke();
        }
      }
    } else if (c.k === 'rocket' && c.mode === 1) {
      for (let i = 1; i < 8; i++) {
        const q = Math.max(0, c.mt / 46 - i * 0.04), px = X(c.vx + (c.tx - c.vx) * q), py = Y(c.vy + (c.ty - c.vy) * q) - R(Math.sin(Math.PI * q) * 0.3);
        ctx.fillStyle = `rgba(255,255,255,${0.75 - i * 0.08})`;
        ell(ctx, px, py, R(0.018 + i * 0.004), R(0.018 + i * 0.004));
        ctx.fill();
      }
    } else if (c.k === 'ball') {
      ctx.fillStyle = 'rgba(255,143,176,.25)';
      for (let i = 1; i < 4; i++) ell(ctx, cx - c.face * u * 0.35 * i, cy - u - R(c.alt) + u * 0.15 * i, u * (0.9 - i * 0.15), u * (0.9 - i * 0.15)), ctx.fill();
    } else if (c.k === 'teapot') {
      const sx = cx + c.face * u * 1.5, sy = cy - u * 1.3;
      for (let i = 0; i < 3; i++) {
        const q = ((t * 0.03 + i / 3) % 1);
        ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - q)})`;
        ell(ctx, sx + c.face * q * u * 0.4 + Math.sin(t * 0.1 + i) * u * 0.1, sy - q * u * 1.1, u * (0.12 + q * 0.2), u * (0.1 + q * 0.16));
        ctx.fill();
      }
    } else if (c.k === 'castle' && t - c.atkT < 16) {
      const q = (t - c.atkT) / 16, mx = cx + c.face * u * 1.1, my = cy - u * 1.45;
      ctx.fillStyle = `rgba(255,220,120,${1 - q})`;
      burstPath(ctx, mx, my, u * (0.35 + q * 0.2), 7, 0.5, q);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - q)})`;
      ell(ctx, mx + c.face * u * q * 0.6, my - u * q * 0.5, u * (0.25 + q * 0.3), u * (0.2 + q * 0.25));
      ctx.fill();
    } else if (c.k === 'urchin') {
      const pul = Math.max(0, 1 - (t - c.atkT) / 10);
      if (pul > 0) {
        ctx.fillStyle = `rgba(180,120,255,${0.3 * pul})`;
        ell(ctx, cx, cy - u * 0.6, u * (1.6 + (1 - pul) * 0.6), u * (1.3 + (1 - pul) * 0.5));
        ctx.fill();
      }
    }
  }
  // 구경꾼: 아기 거북 셋
  [[0.13, 1.3], [0.5, 1.305], [0.79, 1.3]].forEach(([bx, by], i) => {
    const k = R(0.024), hop = cheer ? Math.abs(Math.sin(t * 0.3 + i * 1.7)) * R(0.03) : Math.max(0, Math.sin(t * 0.05 + i * 2.1) - 0.93) * R(0.12);
    babyTurtle(ctx, X(bx), Y(by), k, hop, !!cheer, t + i * 20);
  });

  // ── 무서운 껍데기를 차지하면 화면이 금빛으로 확 (입고 있는 동안 내내) ──
  if (c.boss && !c.leap && s.phase === 'play') {
    const since = t - c.landT, pul = 0.5 + 0.5 * Math.sin(t * 0.12), k = Math.min(1, since / 10);
    ctx.fillStyle = radg(ctx, w / 2, Y(0.75), R(0.35), R(0.95), [0, 'rgba(255,220,90,0)'], [1, `rgba(255,190,40,${(0.3 + 0.1 * pul) * k})`]);
    ctx.fillRect(0, Y(0.1), w, Y(1.205));
    if (since < 40) {
      // 차지한 순간: 빛살
      ctx.save();
      ctx.translate(X(c.x), Y(c.y) - R(0.08));
      ctx.rotate(t * 0.02);
      ctx.fillStyle = `rgba(255,240,170,${0.45 * (1 - since / 40)})`;
      for (let i = 0; i < 12; i++) {
        ctx.rotate(TAU / 12);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(R(0.9), -R(0.06));
        ctx.lineTo(R(0.9), R(0.06));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(255,250,200,.9)';
    for (let i = 0; i < 10; i++) {
      const ph = (t * 0.015 + i * 0.1) % 1, px = X(0.05 + hsh(i + 70) * 0.9), py = Y(1.2 - ph * 0.7);
      ctx.globalAlpha = Math.sin(ph * Math.PI);
      starPath(ctx, px, py, R(0.01), 0.35, 0, 4);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // ── 방금 일어난 일: 소리 · 색종이 · 흔들림 · 글자 (한 번만) ──
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x), ey = Y(e.y), k = e.text as SK;
    switch (e.k) {
      case 'tap': fx.sound('tick', 1.5, 0.45); fx.ring(ex, ey, 'rgba(255,255,255,.9)', R(0.06), 2); break;
      case 'deny': fx.sound('tick', 0.7, 0.4); break;
      case 'same': fx.sound('boing', 1.6, 0.4); fx.ring(ex, ey, '#ffffff', R(0.08), 2); break;
      case 'leap': fx.sound('whoosh', 1.4, 0.9); fx.sound('boing', 1.8, 0.5); puff(ex, ey - R(0.03), '#ffd0dc', 6, 2.6, 2.4); break;
      case 'throw': fx.sound('whoosh', 1.1 - SD[k].heavy * 0.15, 0.9); break;
      case 'bang': {
        const hv = e.x2, fit = e.y2 > 0;
        fx.sound('thud', 1.3 - hv * 0.2, 0.8 + hv * 0.2 + (fit ? 0.3 : 0));
        fx.sound('crack', fit ? 0.8 : 1.1, fit ? 1.1 : 0.7);
        fx.kick(4 + hv * 3 + Math.min(8, e.n * 1.5) + (fit ? 4 : 0));
        puff(ex, ey - R(0.02), SD[k].col, (fit ? 16 : 9) + hv * 4, (fit ? 5.5 : 4) + hv, 3.2);
        puff(ex, ey, '#fff3c4', fit ? 10 : 5, 3, 2.6);
        fx.ring(ex, ey, '#ffffff', R(THROW_R[hv] * (fit ? 1.3 : 1)), fit ? 6 : 4);
        if (fit) fx.ring(ex, ey, '#ffe36b', R(THROW_R[hv] * 1.6), 4), fx.blink('#fff6c8', 0.15);
        break;
      }
      case 'land': {
        const D = SD[k], hv = D.heavy;
        fx.sound('pop', 1.4 - hv * 0.25, 1);
        fx.sound('thud', 1.6 - hv * 0.3, 0.6 + hv * 0.2);
        puff(ex, ey - R(D.r), D.col, 12, 3.6, 3);
        fx.ring(ex, ey - R(D.r * 0.6), D.col, R(D.r * 2.2), 4);
        break;
      }
      case 'kill': {
        const kk = e.text as EK, col = FOECOL[kk];
        if (e.y2 >= 1.5) fx.sound('pop', 1 + Math.min(20, e.n) * 0.04, 0.8), puff(ex, ey, col, 8, 3.8, 2.8), puff(ex, ey, '#ffffff', 4, 3, 2);
        else fx.sound('pop', 0.8 + Math.min(10, e.n) * 0.03, 0.5), puff(ex, ey, col, 4, 2.6, 2.2);
        // 한 번에 여럿: 그 자리의 숫자 하나가 커진다 (글자 없이)
        if (e.n >= 2) {
          if (t - (fx.memo.ct ?? -99) > 40 || e.n < (fx.memo.cn ?? 0)) (fx.memo.cx = ex), (fx.memo.cy = ey - R(0.06));
          if (e.n >= (fx.memo.cn ?? 0) || t - (fx.memo.ct ?? -99) > 40) (fx.memo.cn = e.n), (fx.memo.ct = t);
        }
        if (ED[kk].boss) fx.sound('clear', 0.8, 1), fx.kick(16), fx.blink('#ffffff', 0.5), puff(ex, ey, '#ffd23f', 24, 6, 4);
        break;
      }
      case 'match': puff(ex, ey, '#fff6a8', 3, 2.4, 2); break;
      case 'chain': fx.sound('pop', 1.3 + Math.min(20, e.n) * 0.03, 0.55); fx.ring(ex, ey, '#ffe36b', R(0.08), 3); puff(ex, ey, '#ffe36b', 4, 3, 2.2); break;

      case 'pinch': fx.sound('tick', 2 + e.n * 0.3, 0.6); puff(ex, ey, '#ffffff', 3, 2.4, 2); break;
      case 'steam': fx.sound('whoosh', 1.7, 0.75); fx.sound('splash', 1.6, 0.4); break;
      case 'roll': fx.sound('whoosh', 0.8, 0.8); break;
      case 'bowl': fx.sound('crack', 1.2 + Math.min(8, e.n) * 0.08, 0.7); puff(ex, ey, '#ffffff', 4, 3, 2.4); if (e.n >= 3) fx.kick(2 + e.n); break;
      case 'wall': fx.sound('thud', 1.4, 0.6); fx.sound('tick', 0.9, 0.5); if (e.n >= 3) fx.kick(4), puff(ex, ey, '#ffffff', 8, 4, 2.6); break;
      case 'cannon': fx.sound('thud', 0.7, 0.9); fx.kick(3); puff(ex, ey, '#ffffff', 6, 2.6, 3); break;
      case 'boom': fx.sound('thud', 0.6, 1.2); fx.sound('crack', 0.8, 0.7); fx.kick(6); puff(ex, ey, '#f2cf8a', 12, 4, 3.4); fx.ring(ex, ey, '#fff3c4', R(0.09), 4); break;
      case 'launch': fx.sound('swell', 1.3, 0.8); fx.sound('whoosh', 0.9, 0.9); puff(ex, ey, '#ffb84a', 10, 3.5, 3.2); break;
      case 'airhit': fx.sound('crack', 1.5, 0.7); puff(ex, ey, '#ffffff', 8, 3.8, 2.6); fx.ring(ex, ey, '#bff3ff', R(0.06), 3); break;
      case 'slam': fx.sound('thud', 0.5, 1.3); fx.kick(8 + Math.min(6, e.n)); puff(ex, ey, '#ffe9b8', 14, 4.5, 3.4); break;
      case 'spike': fx.sound('crack', 1.8 - Math.min(4, e.n) * 0.12, 0.45 + Math.min(4, e.n) * 0.1); if (e.n >= 4) fx.kick(3); break;
      case 'thorn': fx.sound('tick', 2.4, 0.5); puff(ex, ey, '#c9a8ff', 3, 2.4, 2); break;
      case 'beamcharge': fx.sound('swell', 1.8, 0.5); break;
      case 'beam': fx.sound('zap', 1.2, 0.9); fx.kick(3 + Math.min(6, e.n)); break;
      case 'scare': if (t - (fx.memo.sc ?? -99) > 10) (fx.memo.sc = t), fx.sound('boing', 0.6, 0.5); puff(ex, ey, '#e9d6ff', 3, 2.2, 2); break;
      case 'skullroll': fx.sound('whoosh', 0.75, 0.8); fx.sound('fail', 1.6, 0.25); break;
      case 'bonk': fx.sound('thud', 1.3, 0.7); puff(ex, ey, '#ffffff', 4, 3, 2.4); break;
      case 'flash': fx.sound('zap', 1.6, 0.8); fx.sound('ding', 1.3, 0.6); fx.blink('#fff7b0', 0.25 + Math.min(0.2, e.n * 0.03)); break;
      case 'bounce': fx.sound('boing', 1.1 + Math.min(6, e.n) * 0.1, 0.7); puff(ex, ey, '#ff8fb0', 3, 2.6, 2.2); break;
      case 'horn': fx.sound('swell', 0.55, 1.2); fx.sound('fail', 0.5, 0.35); fx.kick(4); break;
      case 'tide': fx.sound('splash', 0.7, 1.2); fx.sound('whoosh', 0.5, 1); fx.kick(6); break;
      case 'tidehit': fx.sound('splash', 1.4, 0.4); puff(ex, ey, '#bff3ff', 3, 2.4, 2.4); break;
      case 'tideend': break;
      case 'ram': fx.sound('whoosh', 0.6, 1); fx.sound('swell', 0.7, 0.7); break;
      case 'swing': fx.sound('whoosh', 0.55, 0.7); break;
      case 'clonk': fx.sound('thud', 1.1, 0.6); fx.sound('crack', 0.9, 0.4); fx.kick(2); break;
      case 'torp': fx.sound('whoosh', 1.3, 0.7); fx.sound('tick', 0.8, 0.5); break;
      case 'torpboom': fx.sound('thud', 0.8, 1); fx.kick(5); puff(ex, ey, '#ffd23f', 10, 4, 3); fx.ring(ex, ey, '#ffe9a0', R(0.08), 3); break;
      case 'bite': fx.sound('tick', 1.2, 0.35); break;
      case 'snip': fx.sound('tick', 1.0, 0.45); break;
      case 'bump': fx.sound('boing', 1.4, 0.4); break;
      case 'peck': fx.sound('tick', 1.6, 0.5); puff(ex, ey, '#ffffff', 3, 2, 2); break;
      case 'punch': fx.sound('thud', 0.75, 1.1); fx.kick(6); puff(ex, ey, '#f2cf8a', 10, 3.6, 3); break;
      case 'windup': fx.sound('swell', 1.4, 0.4); break;
      case 'dash': fx.sound('whoosh', 1.0, 0.6); break;
      case 'swoop': fx.sound('whoosh', 1.6, 0.5); break;
      case 'zapme': fx.sound('zap', 2.0, 0.35); break;
      case 'clamopen': fx.sound('pop', 0.9, 0.35); break;
      case 'clamup': fx.sound('pop', 1.1, 0.4); puff(ex, ey, '#f3dfb0', 5, 2.6, 2.6); break;
      case 'splat': fx.sound('splash', 1.8, 0.4); puff(ex, ey, '#ffffff', 4, 2.4, 2); break;
      case 'clang': if (t - (fx.memo.cl ?? -99) > 8) (fx.memo.cl = t), fx.sound('ding', 0.8, 0.6), puff(ex, ey, '#fff3a8', 5, 3.2, 1.8); break;
      case 'clink': if (t - (fx.memo.ck ?? -99) > 8) (fx.memo.ck = t), fx.sound('ding', 1.5, 0.4), puff(ex, ey, '#ffe9f2', 3, 2.4, 1.8); break;
      case 'sting': fx.sound('zap', 2.2, 0.4); break;
      case 'ouch': fx.sound('thud', 1.9, 0.35); puff(ex, ey, '#ffffff', 2, 2, 2); break;
      case 'crack': fx.sound('crack', 1.4, 0.8); puff(ex, ey, '#ffffff', 4, 2.6, 2); break;
      case 'break': fx.sound('crack', 0.8, 1.2); fx.sound('fail', 1.3, 0.6); fx.kick(7); puff(ex, ey, SD[k].col, 16, 4.5, 3.2); break;
      case 'ouchN': fx.sound('boing', 2, 0.6); puff(ex, ey, '#ffd0dc', 5, 2.6, 2.2); break;
      case 'heart': fx.sound('fail', 0.8, 1); fx.blink('#ff3b30', 0.3); say(ex, ey - R(0.1), '-1', '#ff5a6e', 22); break;
      case 'auto': fx.sound('whoosh', 1.6, 0.5); break;
      case 'pearl': fx.sound('chime', 1.4, 0.5); puff(ex, ey - R(0.05), '#ffffff', 10, 4.5, 2.6); break;
      case 'whirl': fx.sound('whoosh', 1.8, 0.5); fx.ring(ex, ey, '#7fe3ff', R(0.3), 3); break;
      case 'surge': fx.sound('splash', 0.9, 0.55); break;
      case 'washout': puff(ex, ey, '#ffffff', 4, 2, 2.4); break;
      case 'plunk': fx.sound('thud', 2, 0.4); puff(ex, ey, '#f3dfb0', 4, 2, 2.4); break;
      case 'convoy': fx.sound('whoosh', 1.2, 0.5); break;
      case 'group': fx.sound('splash', 0.75, 0.6); break;
      case 'gullin': fx.sound('tick', 2.4, 0.4); break;
      case 'bombs': fx.sound('whoosh', 1.4, 0.6); break;
      case 'bomb': fx.sound('thud', 0.7, 1); fx.sound('crack', 1, 0.6); fx.kick(6); puff(ex, ey, '#ffb84a', 10, 4, 3); break;
      case 'tentacle': fx.sound('swell', 0.6, 0.7); break;
      case 'enemytorp': fx.sound('whoosh', 1.1, 0.6); break;
      case 'boomE': fx.sound('thud', 0.9, 0.9); fx.kick(4); puff(ex, ey, '#bff3ff', 8, 3.4, 3); break;
      case 'summon': fx.sound('swell', 1, 0.8); break;
      case 'bossdrop': fx.sound('crack', 0.6, 1.2); fx.sound('swell', 0.8, 1); fx.kick(10); fx.blink('#fff3c4', 0.3); puff(ex, ey, '#ffe36b', 16, 5, 3); break;
      case 'bossshell': fx.sound('clear', 0.7, 1.2); fx.sound('thud', 0.45, 1.5); fx.kick(16); fx.blink('#ffffff', 0.55); puff(ex, ey - R(0.1), '#ffe36b', 30, 7, 4); fx.ring(ex, ey - R(0.05), '#ffe36b', R(0.4), 7); break;
      case 'bosskill': puff(ex, ey, '#ffffff', 20, 6, 4); break;
      case 'star3': fx.sound('coin', 1.2, 1); puff(ex, ey, '#ffd84a', 14, 5.5, 3.2); fx.ring(ex, ey, '#ffd84a', R(0.2), 5); break;
      case 'stage': fx.sound('ding', 1, 0.6); break;
      case 'clear': fx.sound('clear', 1, 1); puff(X(0.5), Y(0.7), '#ffd84a', 24, 6, 3.5); break;
      case 'pickopen': fx.sound('swell', 1.1, 0.9); break;
      case 'perk': fx.sound('coin', 1, 1); fx.sound('chime', 1.1, 0.9); puff(ex, ey - R(0.1), '#ffe36b', 16, 5, 3.2); fx.ring(ex, ey - R(0.08), '#ffe36b', R(0.2), 5); break;
      case 'end': fx.sound(e.n ? 'clear' : 'fail', 0.9, 1); break;
    }
  }
  // 한 번에 쓰러뜨린 수: 숫자 하나
  {
    const a = t - (fx.memo.ct ?? -99), n = fx.memo.cn ?? 0;
    if (n >= 2 && a < 48 && s.phase === 'play') {
      const k = a < 6 ? 1.35 - a * 0.06 : 1, sz = Math.min(40, 18 + n * 2.2), x = clamp(fx.memo.cx, w * 0.1, w * 0.9), y = Math.max(Y(0.2), fx.memo.cy - a * 0.4);
      ctx.save();
      ctx.globalAlpha = Math.min(1, (48 - a) / 12);
      ctx.translate(x, y);
      ctx.scale(k, k);
      ctx.font = `900 ${Math.round(sz)}px system-ui, sans-serif`;
      ctx.lineJoin = 'round';
      ctx.lineWidth = 5;
      ctx.strokeStyle = OUT;
      ctx.strokeText(String(n), 0, 0);
      ctx.fillStyle = n >= 8 ? '#ff8a2e' : n >= 5 ? '#ffc23a' : '#ffe9a0';
      ctx.fillText(String(n), 0, 0);
      ctx.restore();
    }
  }
  if (s.big && (fx.memo.bigT ?? -1) !== s.big.t && s.big.t > seenT) (fx.memo.bigT = s.big.t), fx.sound('chime', 1.05, 1), fx.blink('#fff6c8', 0.2), fx.kick(7);
  // 손가락: 첫 톡 · 무서운 껍데기
  {
    const first = s.phase === 'play' && s.stage === 0 && s.firstTap < 0 ? s.shells.find((o) => o.k === 'teapot') : undefined;
    const boss = s.phase === 'play' && spotSh && spotSh.boss && !s.crab.boss ? spotSh : undefined;
    const hm = first ?? boss;
    if (hm) {
      const press = Math.max(0, Math.sin(t * 0.14)), u = R(SD[hm.k].r);
      ell(ctx, X(hm.x), Y(hm.y) - u * 0.8, u * (1.4 + 0.3 * press), u * (1.4 + 0.3 * press));
      ctx.strokeStyle = `rgba(255,255,255,${0.9 - 0.5 * press})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      drawHand(ctx, X(hm.x) + R(0.03), Y(hm.y) - u * 0.5, R(0.085), press);
    }
  }
  ctx.restore();
  drawHud(ctx, s, w, h, sc2);
  fx.memo.t = t;
}
/** 닻 머리 (단위: 크기 1) */
function drawAnchorHead(ctx: C2, x: number, y: number, k: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.42;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(0, -1.2);
    ctx.lineTo(0, 0.85);
    ctx.moveTo(-0.55, -0.7);
    ctx.lineTo(0.55, -0.7);
    ctx.moveTo(-1.0, 0.1);
    ctx.quadraticCurveTo(-0.85, 1.0, 0, 0.95);
    ctx.quadraticCurveTo(0.85, 1.0, 1.0, 0.1);
  };
  path();
  ctx.stroke();
  ctx.strokeStyle = '#6f8396';
  ctx.lineWidth = 0.24;
  path();
  ctx.stroke();
  ell(ctx, 0, -1.35, 0.25, 0.25);
  ctx.lineWidth = 0.14;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * 1.0, 0.1);
    ctx.lineTo(sd * 1.25, -0.15);
    ctx.lineTo(sd * 0.85, -0.05);
    ctx.closePath();
    ink(ctx, '#6f8396', 0.1);
  }
  ctx.restore();
}
/** 소라게 그리기: 들어간 껍데기 · 맨몸 · 폴짝 뛰는 중 */
function drawCrab(ctx: C2, s: ShellState, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, sc2: number) {
  const c = s.crab, t = s.t;
  if (c.leap) {
    const L = c.leap, u = R(0.05);
    ctx.fillStyle = 'rgba(70,45,20,.2)';
    ell(ctx, X(c.x), Y(c.y), u * 0.8, u * 0.25);
    ctx.fill();
    // 쏙 빠져나온 맨몸이 빙글 날아간다 (분홍 엉덩이)
    ctx.save();
    ctx.translate(X(c.x), Y(c.y) - R(c.alt));
    ctx.rotate((L.t / L.T) * (L.x1 >= L.x0 ? 1 : -1) * 1.2 - 0.3 * c.face);
    nakedCrab(ctx, 0, u * 0.5, u, c.face, t, false, 1);
    ctx.restore();
    // 목적지 표시
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 2;
    ell(ctx, X(L.x1), Y(L.y1), R(SD[L.sh.k].r) * 1.1, R(SD[L.sh.k].r) * 0.4);
    ctx.stroke();
    return;
  }
  if (!c.k) {
    const u = R(0.05);
    ctx.fillStyle = 'rgba(70,45,20,.22)';
    ell(ctx, X(c.x), Y(c.y), u * 0.9, u * 0.26);
    ctx.fill();
    nakedCrab(ctx, X(c.x), Y(c.y) - Math.abs(Math.sin(t * 0.5)) * u * 0.15, u, c.face, t, c.cry > 0, 0);
    if (c.cry === 0 && s.shells.length) {
      // 맨몸: 가장 가까운 껍데기 위에 통통 튀는 화살표 (글자 없이)
      let b = s.shells[0];
      for (const o of s.shells) if (dist(c.x, c.y, o.x, o.y) < dist(c.x, c.y, b.x, b.y)) b = o;
      const ax = X(b.x), ay = Y(b.y) - R(SD[b.k].r) * 2.2 - Math.abs(Math.sin(t * 0.2)) * R(0.03), k = R(0.03);
      ctx.beginPath();
      ctx.moveTo(ax, ay + k);
      ctx.lineTo(ax - k, ay - k * 0.2);
      ctx.lineTo(ax - k * 0.4, ay - k * 0.2);
      ctx.lineTo(ax - k * 0.4, ay - k * 1.2);
      ctx.lineTo(ax + k * 0.4, ay - k * 1.2);
      ctx.lineTo(ax + k * 0.4, ay - k * 0.2);
      ctx.lineTo(ax + k, ay - k * 0.2);
      ctx.closePath();
      ink(ctx, '#ff8fb0', 2);
    }
    return;
  }
  // 내 껍데기는 모래밭의 빈 껍데기보다 1.3배 크게
  const k = c.k, D = SD[k], u = R(D.r) * depth(c.y) * 1.25, fc = c.face;
  const since = t - c.landT, pop = since < 12 ? 1 + 0.25 * Math.sin((since / 12) * Math.PI) : 1;
  const atk = t - c.atkT < 10, hurt = t - c.hurtT < 8, q = c.hp / c.max;
  const mood = hurt ? F_HURT : c.boss ? F_ANGRY : atk ? F_ANGRY : q < 0.33 ? F_SCARED : F_IDLE;
  // 걸을 때 통통
  const walking = t - c.walkT < 3, hopY = walking ? Math.abs(Math.sin(t * 0.38)) * u * 0.14 : 0, wob = walking ? Math.sin(t * 0.38) * 0.07 : 0;
  const x = X(c.x), y = Y(c.y) - R(c.alt) - hopY;
  // 그림자 · 발밑의 밝은 '나' 고리 · 다리
  ctx.fillStyle = 'rgba(70,45,20,.28)';
  ell(ctx, x, Y(c.y), u * 1.05, u * 0.3);
  ctx.fill();
  const pr = 0.5 + 0.5 * Math.sin(t * 0.15);
  ctx.fillStyle = `rgba(150,240,255,${0.25 + 0.15 * pr})`;
  ell(ctx, x, Y(c.y), u * 1.35, u * 0.45);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.strokeStyle = `rgba(40,200,255,${0.8 + 0.2 * pr})`;
  ctx.lineWidth = 2;
  ell(ctx, x, Y(c.y), u * (1.35 + 0.08 * pr), u * (0.45 + 0.03 * pr));
  ctx.stroke();
  if (c.boss) {
    ctx.fillStyle = `rgba(255,220,90,${0.25 + 0.15 * Math.sin(t * 0.2)})`;
    ell(ctx, x, Y(c.y), u * 1.7, u * 0.55);
    ctx.fill();
  }
  if (k === 'anchor') {
    // 사슬 + 빙빙 도는 닻
    const hx = X(c.x + Math.cos(c.spin) * ANCHOR_R), hy = Y(c.y + Math.sin(c.spin) * ANCHOR_R * YS) - u * 0.5;
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = R(0.03);
    ctx.beginPath();
    ctx.arc(x, Y(c.y), R(ANCHOR_R), c.spin - 0.9, c.spin);
    ctx.stroke();
    ctx.strokeStyle = '#6f8396';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(x, y - u * 0.9);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.setLineDash([]);
    drawAnchorHead(ctx, hx, hy, R(0.022));
  }
  ctx.save();
  ctx.translate(x, y);
  if (k === 'can' && c.mode === 1) ctx.translate(0, -u * 0.8), ctx.rotate(c.spin * fc), ctx.translate(0, u * 0.8);
  if (k === 'skull' && c.mode === 1) ctx.translate(0, -u), ctx.rotate(c.spin), ctx.translate(0, u);
  if (k === 'ball') ctx.translate(0, -u), ctx.rotate(c.spin), ctx.translate(0, u);
  if (k === 'helmet' && c.mode === 1) ctx.rotate(0.2 * fc);
  if (k === 'urchin' && atk) ctx.scale(1.12, 1.12);
  ctx.rotate(wob);
  ctx.scale(fc * pop, pop * (since < 8 ? 1 - 0.15 * Math.sin((since / 8) * Math.PI) : 1));
  // 다리(종종걸음)
  if (!(k === 'can' && c.mode === 1) && k !== 'ball' && !(k === 'skull' && c.mode === 1) && k !== 'sub') {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(1.2, u * 0.08);
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = walking ? Math.sin(t * 0.8 + i * 2.1) * 0.3 : 0;
      ctx.beginPath();
      ctx.moveTo(u * (0.15 + i * 0.22), -u * 0.15);
      ctx.lineTo(u * (0.3 + i * 0.22 + a * 0.3), u * 0.02);
      ctx.stroke();
      ctx.strokeStyle = '#ff7a45';
      ctx.lineWidth = Math.max(0.6, u * 0.04);
      ctx.stroke();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = Math.max(1.2, u * 0.08);
    }
  }
  // 로켓 불꽃
  if (k === 'rocket' && c.mode === 1) {
    const fl = 0.7 + 0.3 * Math.sin(t * 1.3);
    ctx.fillStyle = '#ffb84a';
    ctx.beginPath();
    ctx.moveTo(-u * 0.3, 0);
    ctx.quadraticCurveTo(0, u * 1.4 * fl, u * 0.3, 0);
    ctx.fill();
    ctx.fillStyle = '#fff3a8';
    ctx.beginPath();
    ctx.moveTo(-u * 0.15, 0);
    ctx.quadraticCurveTo(0, u * 0.8 * fl, u * 0.15, 0);
    ctx.fill();
  }
  // 전구 빛
  if (k === 'bulb') {
    ctx.fillStyle = radg(ctx, 0, -u * 1.35, 0, u * 2.2, [0, `rgba(255,245,150,${0.35 + 0.15 * Math.sin(t * 0.2)})`], [1, 'rgba(255,245,150,0)']);
    ell(ctx, 0, -u * 1.35, u * 2.2, u * 2.2);
    ctx.fill();
  }
  stamp(ctx, shellSpr(k, u * sc2), u);
  // 금 (껍데기가 다치면)
  if (q < 0.66) {
    ctx.strokeStyle = 'rgba(60,30,20,.9)';
    ctx.lineWidth = Math.max(1.2, u * 0.06);
    ctx.beginPath();
    ctx.moveTo(-u * 0.35, -u * 1.5);
    ctx.lineTo(-u * 0.15, -u * 1.15);
    ctx.lineTo(-u * 0.35, -u * 0.85);
    ctx.lineTo(-u * 0.1, -u * 0.55);
    if (q < 0.33) {
      ctx.moveTo(u * 0.3, -u * 1.4);
      ctx.lineTo(u * 0.1, -u * 1.05);
      ctx.lineTo(u * 0.3, -u * 0.8);
      ctx.moveTo(-u * 0.15, -u * 1.15);
      ctx.lineTo(u * 0.1, -u * 1.05);
    }
    ctx.stroke();
  }
  // 해골 눈구멍 속 빛나는 소라게 눈
  if (k === 'skull') {
    for (const sd of [-1, 1]) {
      ell(ctx, sd * u * 0.42, -u * 1.05, u * 0.12, u * 0.14);
      ctx.fillStyle = `rgba(255,${120 + Math.round(80 * Math.sin(t * 0.2))},60,1)`;
      ctx.fill();
    }
  }
  ctx.restore();
  // 눈·집게는 늘 밖으로 (굴러갈 때도 위로 빼꼼)
  const tucked = (k === 'can' && c.mode === 1) || k === 'ball' || (k === 'skull' && c.mode === 1);
  const pinch = atk ? Math.abs(Math.sin((t - c.atkT) * 0.6)) : 0.25 + 0.15 * Math.sin(t * 0.1);
  if (tucked) crabBits(ctx, 'conch', x - fc * u * 0.35, y - u * 1.2, u * 0.95, fc, t, pinch, mood, s.lv, hurt);
  else if (k === 'skull') crabBits(ctx, 'skull', x, y + u * 0.6, u * 0.8, fc, t, atk ? 0.9 : 0.3, mood, s.lv, hurt);
  else crabBits(ctx, k, x, y, u * pop, fc, t, pinch, mood, s.lv, hurt);
  // 이사한 뒤 0.6초: 머리 위 작은 이름표
  if (t - s.tagT < 36 && !(s.big && t - s.big.t < 62)) {
    const a = Math.min(1, (36 - (t - s.tagT)) / 8), nm = D.name;
    ctx.globalAlpha = a;
    ctx.font = `900 ${Math.max(12, Math.round(R(0.032)))}px system-ui, sans-serif`;
    const tw = ctx.measureText(nm).width + R(0.03), ty = y - u * 2.6 - (36 - (t - s.tagT)) * 0.15;
    rr(ctx, x - tw / 2, ty - R(0.022), tw, R(0.044), R(0.022));
    ctx.fillStyle = 'rgba(255,250,235,.95)';
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = OUT;
    ctx.fillText(nm, x, ty + 0.5);
    ctx.globalAlpha = 1;
  }
  // 레벨 선물: 머리띠 · 선글라스 · 스카프 · 왕관
  if (!tucked && k !== 'skull' && s.lv >= 3) {
    const P = PEEK[k], hx = x + fc * P.ex * u, hy = y + P.ey * u - u * P.k * 1.05;
    if (s.lv >= 9) {
      ctx.save();
      ctx.translate(hx, hy - u * 0.15);
      ctx.scale(u * 0.25, u * 0.25);
      ctx.beginPath();
      ctx.moveTo(-1, 0);
      ctx.lineTo(-1.1, -0.95);
      ctx.lineTo(-0.5, -0.5);
      ctx.lineTo(0, -1.2);
      ctx.lineTo(0.5, -0.5);
      ctx.lineTo(1.1, -0.95);
      ctx.lineTo(1, 0);
      ctx.closePath();
      ink(ctx, lin(ctx, 0, -1.2, 0, 0, [0, '#fff3a8'], [1, '#f5b921']), 0.15);
      ctx.restore();
    } else {
      ctx.strokeStyle = s.lv >= 5 ? '#1a1a22' : '#ff5a6e';
      ctx.lineWidth = Math.max(2, u * 0.12);
      ctx.beginPath();
      ctx.moveTo(hx - u * 0.3, hy + u * 0.15);
      ctx.lineTo(hx + u * 0.3, hy + u * 0.15);
      ctx.stroke();
    }
  }
  // 껍데기 버티기 (줄었을 때만)
  if (q < 0.999 && !c.boss) {
    const bw = u * 1.5, by = Y(c.y) + u * 0.45;
    ctx.fillStyle = 'rgba(74,44,29,.75)';
    rr(ctx, x - bw / 2 - 1.5, by - 1.5, bw + 3, 7, 3);
    ctx.fill();
    ctx.fillStyle = q > 0.5 ? '#7ee05a' : q > 0.25 ? '#ffc23a' : (t >> 3) % 2 ? '#ff5a4e' : '#ffffff';
    rr(ctx, x - bw / 2, by, bw * q, 4, 2);
    ctx.fill();
  }
}

// ───────────────────────────── 그리기: 띠 · 결과 · 선물 ─────────────────────────────
const STAR_WORDS = (s: ShellState) => ['모두 쫓아내기', '하트 지키기', starWord(STAGES[s.stage].star)];
function drawHud(ctx: C2, s: ShellState, w: number, h: number, sc2: number) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const d = STAGES[s.stage], c = s.crab;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  const text = (str: string, x: number, y: number, fill: string, stroke = '', lw = 0) => {
    ctx.lineJoin = 'round';
    if (lw > 0) (ctx.lineWidth = lw), (ctx.strokeStyle = stroke), ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  };
  const INK = '#4a2c1d', MUTED = '#a08a70', CREAM = '#fff6dc';
  ctx.textBaseline = 'middle';
  // ── 위 띠: 판 · 판 이름 · 하트 · 별 · 소라게 레벨 ──
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, w, Y(0.1));
  ctx.fillStyle = '#e3c48c';
  ctx.fillRect(0, Y(0.1) - 2, w, 2);
  ell(ctx, X(0.062), Y(0.05), R(0.036), R(0.036));
  ctx.fillStyle = '#2fb6e8';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  font(0.046, 900);
  text(String(s.stage + 1), X(0.062), Y(0.052), '#ffffff');
  ctx.textAlign = 'left';
  font(0.042, 900);
  const nm = d.name.length > 7 ? d.name.slice(0, 7) + '…' : d.name;
  text(nm, X(0.115), Y(0.052), INK);
  for (let i = 0; i < 3; i++) {
    heartPath(ctx, X(0.565 + i * 0.05), Y(0.05), R(0.017));
    ctx.fillStyle = i < s.hearts ? '#ff4d5e' : '#e6d6bc';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  starPath(ctx, X(0.725), Y(0.049), R(0.022));
  ctx.fillStyle = '#ffc93c';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  font(0.04, 900);
  text(String(s.stars), X(0.754), Y(0.053), INK);
  // 레벨: 작은 소라게 얼굴
  crabBits(ctx, 'conch', X(0.84), Y(0.085), R(0.04), 1, t, 0.3, F_HAPPY, s.lv, false);
  font(0.036, 900);
  text(`Lv${s.lv}`, X(0.882), Y(0.053), '#e8663a');

  // ── 아래 띠: 별 셋 · 한 줄 도움말 · 도감 ──
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, Y(1.305), w, h - Y(1.305));
  ctx.fillStyle = '#e3c48c';
  ctx.fillRect(0, Y(1.305), w, 2);
  const words = STAR_WORDS(s), res = s.phase === 'result', st = d.star;
  const got3 = st.k === 'boss' ? s.bossByShell : s.star3T >= 0;
  const third = res ? (s.starOk[2] ? 1 : -1) : got3 ? 1 : 0;
  const state = [res ? 1 : 0, s.lost ? -1 : res ? 1 : 0, third];
  font(0.032, 800);
  const now = st.k === 'pair' ? s.pairKills : st.k === 'multi' ? s.best : st.k === 'throw' ? s.bestThrow : st.k === 'kinds' ? s.kinds.length : 0;
  const prog = res || got3 || st.k === 'boss' ? '' : ` ${Math.min(now, st.n)}/${st.n}`;
  const labels = words.map((q, i) => q + (i === 2 ? prog : ''));
  const gap = R(0.012), pad = Math.min(R(0.07), (w - R(0.03) - gap * 2 - labels.reduce((a, q) => a + ctx.measureText(q).width, 0)) / 3);
  const ws = labels.map((q) => ctx.measureText(q).width + pad), total = ws.reduce((a, b) => a + b, 0) + gap * 2;
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
    font(0.032, 800);
    text(q, cx + pad * 0.76, cy + 0.5, off ? '#b8a688' : INK);
    if (off) (ctx.fillStyle = '#b8a688'), ctx.fillRect(cx + pad * 0.72, cy, cw - pad, 1.5);
    if (on && (fx.memo['st' + i] ?? -1) !== s.stage * 10 + (res ? 1 : 0)) (fx.memo['st' + i] = s.stage * 10 + (res ? 1 : 0)), fx.burst(cx + pad * 0.42, cy, '#ffd84a', 8, 3, 2.4);
    cx += cw + gap;
  });
  ctx.textAlign = 'center';
  const boss = s.foes.find((f) => !f.dead && ED[f.k].boss);
  let tip = `${SD[d.key].name}: ${SD[d.key].line}`;
  if (s.phase === 'pick') tip = '바닷가의 큰 물건 둘 중 하나를 톡!';
  else if (s.phase === 'result') tip = s.newDex.length ? `새 껍데기 ${SD[s.newDex[s.newDex.length - 1]].name}: ${SD[s.newDex[s.newDex.length - 1]].line}` : s.got === 3 ? '별 셋! 판 점수가 네 배' : '별이 많을수록 판 점수가 곱해져요';
  else if (s.phase === 'end') tip = s.won ? '바닷가를 모두 지켰어요!' : '누르면 다시 해요';
  else if (s.stage === 0 && s.firstTap < 0) tip = '반짝이는 찻주전자를 톡! 소라게가 쏙 이사해요';
  else if (!c.k && !c.leap) tip = '맨몸이에요! 아무 껍데기나 톡';
  else if (c.k && c.hp / c.max < 0.3) tip = '껍데기가 곧 깨져요 — 다른 껍데기로 톡!';
  else if (spotBoss(s)) tip = '무서운 껍데기다! 톡 해서 차지해요';
  else if (boss && !s.bossDrop) tip = `${ED[boss.k].name} — 반쯤 다치면 무서운 껍데기를 떨궈요`;
  else if (s.stage < 2 && s.swaps < 3) tip = '버린 껍데기는 붐비는 쪽으로 날아가 쾅!';
  else if (s.stage < 3) tip = '어울리는 껍데기는 모래가 반짝 — 더 크게 쾅!';
  font(0.034, 800);
  text(tip, w / 2, Y(1.402), INK);
  font(0.032, 700);
  const perks = PERKS.map((p, i) => (s.perk[i] ? p[s.perk[i] - 1].name : '')).filter(Boolean);
  text(`소라게 Lv${s.lv} · 도감 ${s.dex.length}/${DEX.length}${perks.length ? ' · ' + perks.join(' · ') : ''}`, w / 2, Y(1.452), MUTED);

  // ── 판 시작 띠 (NEW 한 줄) ──
  if (s.banner && s.phase === 'play' && !(s.big && s.big.t >= s.banner.t)) {
    const age = t - s.banner.t, T = 190;
    if (age < T) {
      const a = Math.min(1, age / 10, (T - age) / 14), slide = (1 - Math.min(1, age / 10)) * R(0.05), by = Y(0.205) - slide;
      ctx.globalAlpha = clamp(a, 0, 1);
      rr(ctx, X(0.05), by, R(0.9), R(0.112), R(0.03));
      ctx.fillStyle = 'rgba(255,250,235,.96)';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      font(0.038, 900);
      const nn = SD[d.key].name, hw = ctx.measureText(s.banner.head).width, nw2 = ctx.measureText(nn).width, pill = R(0.105), gap2 = R(0.014), tot = hw + gap2 + pill + gap2 + nw2;
      let bx0 = w / 2 - tot / 2;
      ctx.textAlign = 'left';
      text(s.banner.head, bx0, by + R(0.033), '#d9480f');
      bx0 += hw + gap2;
      rr(ctx, bx0, by + R(0.012), pill, R(0.042), R(0.021));
      ctx.fillStyle = '#ff3b30';
      ctx.fill();
      font(0.034, 900);
      ctx.textAlign = 'center';
      text('NEW', bx0 + pill / 2, by + R(0.034), '#ffffff');
      ctx.textAlign = 'left';
      font(0.038, 900);
      text(nn, bx0 + pill + gap2, by + R(0.033), INK);
      ctx.textAlign = 'center';
      font(0.034, 800);
      text(s.banner.sub, w / 2, by + R(0.081), INK);
      ctx.globalAlpha = 1;
    }
  }
  // ── 큰 띠: 처음 되어 본 껍데기 · 별 셋째 · 대장 (한 번에 하나) ──
  if (s.big && t - s.big.t < 62 && s.phase === 'play') {
    const age = t - s.big.t, k = age < 8 ? 0.6 + 0.5 * (age / 8) : age > 50 ? 1 - (age - 50) / 12 : 1.1 - 0.1 * Math.min(1, (age - 8) / 10);
    const cy = Y(0.265);
    ctx.save();
    ctx.translate(w / 2, cy);
    ctx.scale(k, k);
    ctx.globalAlpha = clamp(age > 50 ? 1 - (age - 50) / 12 : 1, 0, 1);
    ctx.scale(0.6, 0.6);
    burstPath(ctx, 0, 0, R(0.34), 18, 0.82, t * 0.01);
    ctx.fillStyle = s.big.star ? '#fff3a8' : '#fff6dc';
    ctx.fill();
    ctx.strokeStyle = s.big.star ? '#e0a020' : INK;
    ctx.lineWidth = 3;
    ctx.stroke();
    if (s.big.k) {
      const u = R(0.075);
      ctx.save();
      ctx.translate(-R(0.2), R(0.06));
      stamp(ctx, shellSpr(s.big.k, u * sc2), u);
      crabBits(ctx, s.big.k, 0, 0, u, 1, t, 0.8, F_HAPPY, s.lv, false);
      ctx.restore();
    } else if (s.big.star) {
      starPath(ctx, -R(0.2), 0, R(0.06));
      ctx.fillStyle = '#ffc93c';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.textAlign = 'center';
    font(0.05, 900);
    const lines = s.big.text.length > 9 && s.big.k ? [s.big.text.replace(' 소라게!', ''), '소라게!'] : [s.big.text];
    lines.forEach((ln, i) => text(ln, R(0.06), (i - (lines.length - 1) / 2) * R(0.06), '#d9480f', '#ffffff', 5));
    ctx.restore();
  }
  // ── 결과 · 선물 · 끝 ──
  if (s.phase === 'result') drawResult(ctx, s, w, sc2);
  else if (s.phase === 'pick') drawPick(ctx, s, w, h);
  else if (s.phase === 'end') {
    const a = Math.min(1, s.pt / 20);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(255,246,220,.94)';
    rr(ctx, X(0.08), Y(0.5), R(0.84), R(0.42), R(0.04));
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    font(0.06, 900);
    text(s.won ? '바닷가를 모두 지켰다!' : '엉엉… 하트가 없어요', w / 2, Y(0.58), s.won ? '#d9480f' : '#e8663a');
    font(0.042, 800);
    text(`점수 ${fmt(s.pts + s.sp)} · 별 ${s.stars}개`, w / 2, Y(0.66), INK);
    text(`살아 본 껍데기 ${s.dex.length}/${DEX.length}`, w / 2, Y(0.72), MUTED);
    DEX.forEach((k, i) => {
      const u = R(0.024), px = X(0.14 + (i % 7) * 0.12), py = Y(0.79 + Math.floor(i / 7) * 0.075);
      ctx.save();
      ctx.translate(px, py);
      stamp(ctx, s.dex.includes(k) ? shellSpr(k, u * sc2) : silSpr(k, u * sc2), u);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }
}
const spotBoss = (s: ShellState) => !!s.spot && s.shells.some((o) => o.id === s.spot!.id && o.boss) && !s.crab.boss;
/** 판 결과: 별 · 점수 · 새 껍데기 · 다음에 풀릴 것 */
function drawResult(ctx: C2, s: ShellState, w: number, sc2: number) {
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t, a = Math.min(1, s.pt / 14);
  const INK = '#4a2c1d', MUTED = '#a08a70';
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  const text = (str: string, x: number, y: number, fill: string, stroke = '', lw = 0) => {
    if (lw > 0) (ctx.lineWidth = lw), (ctx.strokeStyle = stroke), ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  };
  const top = Y(0.24) + (1 - a) * R(0.2);
  ctx.globalAlpha = a;
  rr(ctx, X(0.07), top, R(0.86), R(0.86), R(0.05));
  ctx.fillStyle = 'rgba(255,248,228,.97)';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.textAlign = 'center';
  font(0.058, 900);
  text(`${s.stage + 1}판 바닷가 지킴!`, w / 2, top + R(0.07), '#d9480f');
  // 별 셋 (하나씩 쿵)
  for (let i = 0; i < 3; i++) {
    const ok = s.starOk[i], show = s.pt > 16 + i * 12, k = show ? Math.min(1, (s.pt - 16 - i * 12) / 8) : 0;
    const sx = X(0.27 + i * 0.23), sy = top + R(0.18);
    starPath(ctx, sx, sy, R(0.055) * (ok ? 0.7 + 0.3 * k + (k < 1 ? 0.3 * Math.sin(k * Math.PI) : 0) : 1));
    ctx.fillStyle = ok && show ? '#ffc93c' : '#eadcc0';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    font(0.026, 700);
    const wd = STAR_WORDS(s)[i], sp = wd.lastIndexOf(' ', 7);
    if (wd.length > 7 && sp > 0) (text(wd.slice(0, sp), sx, sy + R(0.077), ok ? INK : MUTED), text(wd.slice(sp + 1), sx, sy + R(0.108), ok ? INK : MUTED));
    else text(wd, sx, sy + R(0.08), ok ? INK : MUTED);
    if (ok && show && (juice(s).memo['rs' + i] ?? -1) !== s.stage) (juice(s).memo['rs' + i] = s.stage), juice(s).sound('ding', 1 + i * 0.2, 0.9), juice(s).burst(sx, sy, '#ffd84a', 12, 4, 2.6);
  }
  font(0.046, 900);
  text(`+${fmt(s.gain)}점`, w / 2, top + R(0.34), INK);
  font(0.03, 700);
  text(`별 ${s.got}개 → 점수 ×${STAR_MUL[s.got]} · 소라게 Lv${s.lv}${LV_GIFT[s.lv] ? ' — ' + LV_GIFT[s.lv] : ''}`, w / 2, top + R(0.4), MUTED);
  // 도감 줄 (살아 본 껍데기 · 아직은 그림자)
  font(0.03, 800);
  text('껍데기 도감', w / 2, top + R(0.47), INK);
  DEX.forEach((k, i) => {
    const u = R(0.022), px = X(0.14 + (i % 7) * 0.12), py = top + R(0.56 + Math.floor(i / 7) * 0.085);
    const nw = s.newDex.includes(k);
    if (nw) {
      ctx.fillStyle = `rgba(255,230,120,${0.5 + 0.3 * Math.sin(t * 0.2)})`;
      ell(ctx, px, py - u * 0.8, u * 1.9, u * 1.6);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(px, py);
    stamp(ctx, s.dex.includes(k) ? shellSpr(k, u * sc2) : silSpr(k, u * sc2), u);
    ctx.restore();
    if (nw) (font(0.024, 900), text('NEW', px, py - u * 2.2, '#ff3b30', '#ffffff', 2.5));
  });
  // 다음에 풀릴 것
  const nx = STAGES[s.stage + 1];
  if (nx) {
    const k = nx.key, u = R(0.03);
    font(0.032, 800);
    ctx.textAlign = 'left';
    text(`다음 판: ${SD[k].name} — ${SD[k].up}에 딱!`, X(0.2), top + R(0.77), INK);
    ctx.save();
    ctx.translate(X(0.14), top + R(0.79));
    stamp(ctx, silSpr(k, u * sc2), u);
    ctx.restore();
    ctx.textAlign = 'center';
  }
  if (s.pt >= RES_MIN) {
    font(0.032, 800);
    text('톡 하면 다음 판', w / 2, top + R(0.83), (t >> 4) % 2 ? '#e8663a' : '#ff9a3c');
  }
  ctx.globalAlpha = 1;
}
/** 장 끝 선물: 바닷가의 큰 물건 둘 중 하나를 톡 */
function drawPick(ctx: C2, s: ShellState, w: number, h: number) {
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const INK = '#4a2c1d';
  const ch = STAGES[s.stage].ch, a = Math.min(1, s.pt / 16);
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  ctx.globalAlpha = a * 0.55;
  ctx.fillStyle = '#1a3a5a';
  ctx.fillRect(0, Y(0.1), w, Y(1.205));
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  font(0.055, 900);
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.strokeText('바닷가 선물! 하나를 톡', w / 2, Y(0.3));
  ctx.fillStyle = '#ffe36b';
  ctx.fillText('바닷가 선물! 하나를 톡', w / 2, Y(0.3));
  for (let i = 0; i < 2; i++) {
    const px = X(i ? 0.72 : 0.28), py = Y(0.9), chosen = s.picked === i, other = s.picked >= 0 && !chosen;
    ctx.globalAlpha = a * (other ? 0.35 : 1);
    ctx.fillStyle = `rgba(255,236,120,${0.25 + 0.15 * Math.sin(t * 0.15 + i)})`;
    ell(ctx, px, py, R(0.18), R(0.05));
    ctx.fill();
    drawPerk(ctx, ch, i, px, py, R(chosen ? 0.24 : 0.2), t);
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
  if (s.picked < 0 && s.pt > PICK_MIN) drawHand(ctx, X(0.28) + R(0.05), Y(0.78), R(0.08), Math.max(0, Math.sin(t * 0.14)));
  void h;
}
/** 측정·도감 모음용 그림 도구 */
export const __art = { shellSpr, foeSpr, silSpr, stamp, crabBits, nakedCrab, drawStar, wings, drawPerk, drawAnchorHead };
