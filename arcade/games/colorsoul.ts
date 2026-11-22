/**
 * 🎨 색 먹는 정령 (42라운드: 톡마다 내가 바뀐다) — 색 먹기 × 섞기 × 도감.
 * 규칙 한 줄: 색 있는 적을 톡 하면 정령이 그 색을 쭉 빨아들여 **그 색의 짐승 모습**이 된다 — 내 색이 곧 내 모습이자 공격.
 *   같은 색을 또 먹으면 더 커지고(셋째엔 2단계 짐승), 다른 색을 먹으면 섞여 새 모습. 세 색이 다 섞이면 진흙 골렘이 쿵쿵쿵 하고 하얘진다.
 * 무대: 색 도둑들에게 색을 빼앗겨 회색이 된 그림책 마을. 카메라가 골목을 따라 천천히 위로 흐르고(붐비면 멈춘다),
 *   색 도둑이 저마다 훔친 색 하나를 몸에 지니고 내려온다. 내가 잡은 도둑의 색은 그 자리에 쏟아져 **마을이 다시 칠해진다**.
 * 조작은 톡 하나: 톡한 곳에서 가장 가까운 도둑(반지름 화면 폭 18% — 없으면 화면에서 가장 가까운 도둑)에게 정령이 휙 날아가
 *   0.3초 동안 색 띠를 소용돌이로 빨아들인다 → 도둑은 회색 껍데기가 돼 와장창, 나는 펑 변신 + 그 모습의 등장 한 방(톡 자체가 한 방).
 *   먹은 뒤 0.4초는 쉰다(연타 이득 없음). 모습은 약 7초 가고 옅어진다 → 다음 색을 먹고 싶어진다. 싸움·이동·조준은 모두 저절로.
 * 모습 11가지(장 셋에 걸쳐 풀림) — 모습마다 실루엣·공격 방식·소리가 다르고, 상황 하나에서 가장 세다:
 *   🔴 불 사자(떼에 뛰어들어 불꽃 펑 — 떼) · 🔵 물 고래(물줄기 쏘기 — 큰 놈을 밀어냄) · 🟡 번개 새(적에서 적으로 튕기는 번개 — 날아다니는 놈)
 *   · 🔥 불 용(빨강 셋 — 하늘에서 불 휩쓸기) · 🟣 독구름 문어(빨+파, 구름 뿌리기 — 방패를 뚫음) · 🟠 용암 거북(빨+노, 내려찍기 — 단단한 껍데기를 깸)
 *   · 🟢 덩굴 뱀(파+노, 휘감아 묶기 — 빠른 놈) · 🟤 진흙 골렘(세 색 — 온 땅 쿵쿵쿵) · 🌊 파도 일각고래(파랑 셋 — 줄 선 놈을 파도로)
 *   · ⚡ 천둥 독수리(노랑 셋 — 벼락 비, 흩어진 놈) · 🌈 무지개 고래(드문 무지개 도둑 — 온 화면 휩쓸기).
 * 판단은 0.5초짜리: 지금 내려오는 게 떼냐·큰 놈이냐·하늘이냐·방패냐 → 어떤 색(또는 섞기)을 먹을까. 도둑 머리 위 말풍선에
 *   '먹으면 될 모습'이 그 모습의 그림으로 보인다(지금 내 색과 섞인 결과까지). 색표 외우기 없음. 정답 없음: 아무 색이나 먹어도 싸운다.
 * 지는 것: 색 있는 모습은 맞으면 색이 튀어 나가 짧아질 뿐(큰 놈의 내려찍기는 색을 몽땅 빼앗는다), 하얀 맨몸으로 맞으면 하트 -1.
 *   1판·처음 10초는 하트를 잃지 않는다. 하트를 다 잃으면 그 판만 바로 다시(기회 3번).
 * 판 12개(장 3 × 4판, 장 끝 대장): 대장은 몸에 색을 여러 개 두르고 있고, 때려서 헐거워진 색을 톡으로 뜯어 먹을수록 대장은 작아지고 나는 커진다.
 * 성장: 판을 깨면 정령 레벨(모습 시간·공격 크기·칠하는 폭) · 장 끝에 광장의 큰 물건 둘 중 하나를 톡 · 도감 = 되어 본 모습 + 되살린 마을.
 * 별(쉬운 말 셋): 마을 되살리기 · 하트 안 잃기 · 솜씨(한 번에 N마리 / 그 판의 새 모습으로 N마리 / 대장을 N초 안에).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5, TAU = Math.PI * 2;
/** 판 띠(화면 y, 가로 폭 = 1): 위 HUD 아래 ~ 아래 HUD 위 · 정령이 머무는 높이 */
const TOP = 0.1, BOT = 1.31, HOME_SY = 1.03;
/** 카메라: 빠르기 · 이만큼 붐비면 멈춤 · 적이 모자라면 빨리 */
const CAM_V = 0.00125, CAM_STOP = 10;
/** 한 화면 상한: 적 · 총알 · 독구름 */
const CAP = 24, SHOT_CAP = 110, CLOUD_CAP = 10;
/** 톡: 날아가기(최소) · 빨기 · 쉼 (틱) */
const DASH_MIN = 6, SUCK_T = 18, REST_T = 24;
/** 결과 화면·둘 중 하나·끝·실패 */
const RES_MIN = 90, RES_AUTO = 420, PICK_MIN = 40, PICK_AUTO = 900, PICK_AFTER = 64, END_T = 210, FAIL_T = 110;
/** 점수: 한 번에 n번째로 잡은 도둑은 ⌈n²/4⌉점 · 판 점수는 별 수로 곱해진다 */
const WOW_N = 5, CLEAR_PTS = 20, STAR_MUL = [1, 1, 2, 4], WIN_PTS = 100;

// ───────────────────────────── 색 ─────────────────────────────
/** 색은 세 원색의 비트 모음: 빨 1 · 파 2 · 노 4 (보라 3 · 주황 5 · 초록 6 · 세 색 7) · 무지개 8 */
export const R = 1, B = 2, Y = 4, RAIN = 8;
const pc = (m: number) => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1);
export const CNAME: Record<number, string> = { 0: '하양', 1: '빨강', 2: '파랑', 4: '노랑', 3: '보라', 5: '주황', 6: '초록', 7: '세 색', 8: '무지개' };
/** [본색, 밝은색, 어두운색] */
export const CHEX: Record<number, [string, string, string]> = {
  0: ['#ffffff', '#ffffff', '#b9c6e6'],
  1: ['#ff5246', '#ffa093', '#c42a22'],
  2: ['#3b8dff', '#9fcaff', '#1d55c4'],
  4: ['#ffd334', '#fff09c', '#d49a0a'],
  3: ['#a65cff', '#d8b6ff', '#6b2fc4'],
  5: ['#ff8a2a', '#ffc890', '#c8560c'],
  6: ['#3fcf5e', '#a8f0b4', '#1f8f3a'],
  7: ['#b07a44', '#ddb47e', '#6e4520'],
  8: ['#ff7ad0', '#ffd4f2', '#b44ad8'],
};

// ───────────────────────────── 모습 ─────────────────────────────
export type FK = 'white' | 'lion' | 'whale' | 'bird' | 'dragon' | 'octo' | 'turtle' | 'snake' | 'golem' | 'narwhal' | 'eagle' | 'rainbow';
/** 공격 종류 — 무엇에 닿고 무엇을 뚫는지가 정해진다 */
type AK = 'spark' | 'pounce' | 'jet' | 'chain' | 'fire' | 'poison' | 'slam' | 'vine' | 'quake' | 'wave' | 'bolt' | 'rain' | 'pop';
interface FDef { name: string; mask: number; ak: AK; r: number; does: string; good: string; z: number }
export const FD: Record<FK, FDef> = {
  white: { name: '하얀 정령', mask: 0, ak: 'spark', r: 0.05, does: '반짝 별만 쏴요 — 맞으면 하트 -1', good: '', z: 0.02 },
  lion: { name: '불 사자', mask: R, ak: 'pounce', r: 0.068, does: '떼에 뛰어들어 불꽃 펑', good: '떼', z: 0 },
  whale: { name: '물 고래', mask: B, ak: 'jet', r: 0.084, does: '물줄기로 큰 놈을 밀어내요', good: '큰 놈', z: 0.015 },
  bird: { name: '번개 새', mask: Y, ak: 'chain', r: 0.058, does: '번개가 적에서 적으로 튕겨요', good: '날아다니는 놈', z: 0.012 },
  dragon: { name: '불 용', mask: R, ak: 'fire', r: 0.1, does: '하늘을 날며 불을 휩쓸어요', good: '떼 · 하늘', z: 0.07 },
  octo: { name: '독구름 문어', mask: 3, ak: 'poison', r: 0.074, does: '독구름은 방패도 뚫어요', good: '방패', z: 0.01 },
  turtle: { name: '용암 거북', mask: 5, ak: 'slam', r: 0.078, does: '쿵 내려찍어 단단한 껍데기를 깨요', good: '단단한 놈', z: 0 },
  snake: { name: '덩굴 뱀', mask: 6, ak: 'vine', r: 0.066, does: '덩굴로 빠른 놈을 꽁꽁 묶어요', good: '빠른 놈', z: 0 },
  golem: { name: '진흙 골렘', mask: 7, ak: 'quake', r: 0.105, does: '쿵쿵쿵! 온 땅이 흔들려요', good: '모두(땅)', z: 0 },
  narwhal: { name: '파도 일각고래', mask: B, ak: 'wave', r: 0.1, does: '큰 파도가 줄 선 놈을 쓸어요', good: '줄 선 놈', z: 0.02 },
  eagle: { name: '천둥 독수리', mask: Y, ak: 'bolt', r: 0.1, does: '하늘에서 벼락이 쏟아져요', good: '흩어진 놈', z: 0.075 },
  rainbow: { name: '무지개 고래', mask: RAIN, ak: 'rain', r: 0.11, does: '온 화면을 무지개로 휩쓸어요', good: '모두', z: 0.05 },
};
/** 도감 차례(되어 본 모습) */
export const DEX: FK[] = ['lion', 'whale', 'bird', 'dragon', 'octo', 'turtle', 'snake', 'golem', 'narwhal', 'eagle', 'rainbow'];
/** 이 판부터 될 수 있다 */
const UNLOCK_AT: Record<FK, number> = { white: 0, lion: 0, whale: 1, bird: 2, dragon: 3, octo: 4, turtle: 5, snake: 6, golem: 7, narwhal: 8, eagle: 9, rainbow: 10 };
/** 공격이 닿는 것: 하늘(날아다니는 놈) · 방패를 뚫음 · 껍데기를 깸 · 빠른 놈을 붙잡음(배수) · 큰 놈(배수) */
const AIR_OK = new Set<AK>(['spark', 'jet', 'chain', 'fire', 'poison', 'vine', 'bolt', 'rain', 'pop']);
const SHIELD_OK = new Set<AK>(['poison', 'quake', 'rain', 'wave']);
const ARMOR_OK = new Set<AK>(['slam', 'quake', 'rain']);
const FAST_MUL: Record<AK, number> = { spark: 0.5, pounce: 0.25, jet: 0.3, chain: 0.8, fire: 0.45, poison: 0.55, slam: 0.25, vine: 1.6, quake: 1, wave: 0.6, bolt: 0.9, rain: 1, pop: 0.6 };
const BIG_MUL: Record<AK, number> = { spark: 0.5, pounce: 0.55, jet: 2.1, chain: 0.5, fire: 0.65, poison: 0.9, slam: 1.35, vine: 0.55, quake: 1, wave: 1.8, bolt: 1.1, rain: 1, pop: 0.8 };

// ───────────────────────────── 색 도둑 ─────────────────────────────
export type EK = 'blob' | 'bucket' | 'kite' | 'crayon' | 'shell' | 'brush' | 'balloon' | 'tower' | 'rainbow' | 'inkboss' | 'giant' | 'king';
interface EDef { name: string; r: number; hp: number; spd: number; air?: boolean; shield?: boolean; armor?: number; fast?: boolean; big?: boolean; boss?: boolean; line: string }
export const ED: Record<EK, EDef> = {
  blob: { name: '먹물 꼬마', r: 0.034, hp: 10, spd: 0.0034, line: '작고 많아요 — 떼로 몰려와요' },
  bucket: { name: '물감 통 도깨비', r: 0.07, hp: 70, spd: 0.0017, big: true, line: '크고 세요 — 내려찍으면 색을 몽땅 빼앗겨요' },
  kite: { name: '연 도둑', r: 0.046, hp: 16, spd: 0.004, air: true, line: '하늘을 날아요 — 땅 공격이 안 닿아요' },
  crayon: { name: '크레용 병정', r: 0.046, hp: 30, spd: 0.0019, shield: true, line: '방패로 막아요 — 줄지어 행진해요' },
  shell: { name: '굳은 물감 달팽이', r: 0.056, hp: 22, spd: 0.0012, armor: 55, line: '굳은 껍데기는 내려찍어야 깨져요' },
  brush: { name: '붓 도깨비', r: 0.04, hp: 18, spd: 0.0032, fast: true, line: '휙휙 피해요 — 묶어야 잡혀요' },
  balloon: { name: '풍선 도둑', r: 0.042, hp: 12, spd: 0.0015, air: true, line: '풍선 타고 흩어져 물감 폭탄을 떨궈요' },
  tower: { name: '먹물 굴뚝', r: 0.08, hp: 70, spd: 0, armor: 70, big: true, line: '먹물 꼬마를 자꾸 뿜어요 — 단단해요' },
  rainbow: { name: '무지개 도둑', r: 0.042, hp: 20, spd: 0.0046, fast: true, line: '드문 무지개! 놓치면 달아나요' },
  inkboss: { name: '대장 먹물 문어', r: 0.17, hp: 1, spd: 0, big: true, boss: true, line: '큰 놈 — 물줄기에 약해요' },
  giant: { name: '대장 물감 통 거인', r: 0.18, hp: 1, spd: 0, big: true, armor: 1, boss: true, line: '단단해요 — 내려찍기·쿵쿵에 약해요' },
  king: { name: '대장 회색 왕', r: 0.18, hp: 1, spd: 0, big: true, shield: true, boss: true, line: '방패 망토 — 독구름·쿵쿵·파도에 약해요' },
};

// ───────────────────────────── 판 ─────────────────────────────
interface Grp { at: number; f: [EK, number][]; form?: 0 | 1 | 2 | 3; champ?: EK; cols?: number[] }
type Star = { k: 'multi'; n: number } | { k: 'form'; f: FK; n: number } | { k: 'time'; n: number };
interface StageDef {
  ch: number; name: string; news: string; unlock: FK | null; newFoe: EK | null; D: number; cols: number[]; groups: Grp[]; star: Star;
  boss?: EK; patches?: number[]; seg?: number; summon?: [EK, number][];
}
export const CHAPTERS = ['회색 골목 마을', '물감 운하 마을', '구름 위 성 마을'];
const G = (at: number, form: 0 | 1 | 2 | 3, ...f: [EK, number][]): Grp => ({ at, f, form });
/**
 * 판 12개. 골목은 길이 D(가로 폭 단위)만큼 위로 이어지고, 카메라가 지나는 자리마다 떼가 위에서 내려온다(at = 골목 진행 비율).
 * 사람 기준 한 판 30~45초. 판마다 새 모습 하나 + 그 모습이 빛날 도둑 하나.
 */
export const STAGES: StageDef[] = [
  { ch: 0, name: '불 사자', news: '빨강을 먹으면 불 사자! 떼에 뛰어들어 펑', unlock: 'lion', newFoe: 'blob', D: 1.5, cols: [R], star: { k: 'multi', n: 6 },
    groups: [G(0.22, 2, ['blob', 8]), G(0.42, 0, ['blob', 6], ['bucket', 1]), G(0.62, 2, ['blob', 9]), G(0.8, 3, ['blob', 8]), { at: 1, f: [['blob', 6]], form: 3, champ: 'bucket' }] },
  { ch: 0, name: '물 고래', news: '파랑을 먹으면 물 고래! 큰 놈을 물줄기로 밀어내요', unlock: 'whale', newFoe: 'bucket', D: 1.8, cols: [R, B, B], star: { k: 'form', f: 'whale', n: 10 },
    groups: [G(0, 0, ['bucket', 1], ['blob', 6]), G(0.2, 2, ['blob', 7], ['bucket', 1]), G(0.4, 0, ['bucket', 2], ['blob', 4]), G(0.6, 2, ['blob', 8], ['bucket', 1]), G(0.8, 0, ['bucket', 2], ['blob', 5]), { at: 1, f: [['blob', 6], ['bucket', 1]], form: 3, champ: 'bucket' }] },
  { ch: 0, name: '번개 새', news: '노랑을 먹으면 번개 새! 하늘의 도둑도 찌릿', unlock: 'bird', newFoe: 'kite', D: 1.9, cols: [R, B, Y, Y], star: { k: 'form', f: 'bird', n: 12 },
    groups: [G(0, 0, ['kite', 3], ['blob', 5]), G(0.2, 0, ['kite', 4], ['blob', 4]), G(0.4, 2, ['blob', 8], ['bucket', 1]), G(0.58, 0, ['kite', 5], ['blob', 3]), G(0.78, 0, ['kite', 4], ['bucket', 1], ['blob', 4]), { at: 1, f: [['kite', 4], ['blob', 5]], form: 3, champ: 'kite' }] },
  { ch: 0, name: '대장 먹물 문어', news: '빨강 셋을 이어 먹으면 불 용! 대장의 색을 뜯어 먹어요', unlock: 'dragon', newFoe: 'inkboss', D: 0, cols: [R, B, Y], star: { k: 'time', n: 45 },
    boss: 'inkboss', patches: [R, B, R, Y], seg: 230, summon: [['blob', 5], ['kite', 1], ['bucket', 1]],
    groups: [G(0, 2, ['blob', 6], ['kite', 2])] },
  { ch: 1, name: '독구름 문어', news: '빨강+파랑 = 보라 문어! 독구름은 방패도 뚫어요', unlock: 'octo', newFoe: 'crayon', D: 1.9, cols: [R, B, Y], star: { k: 'form', f: 'octo', n: 14 },
    groups: [G(0, 1, ['crayon', 4], ['blob', 4]), G(0.2, 1, ['crayon', 5], ['blob', 3]), G(0.4, 2, ['blob', 7], ['kite', 2]), G(0.6, 1, ['crayon', 5], ['bucket', 1]), G(0.8, 1, ['crayon', 6], ['blob', 3]), { at: 1, f: [['crayon', 4], ['blob', 4]], form: 3, champ: 'crayon' }] },
  { ch: 1, name: '용암 거북', news: '빨강+노랑 = 용암 거북! 쿵 내려찍어 굳은 껍데기를 깨요', unlock: 'turtle', newFoe: 'shell', D: 1.9, cols: [R, B, Y], star: { k: 'form', f: 'turtle', n: 12 },
    groups: [G(0, 0, ['shell', 3], ['blob', 5]), G(0.2, 0, ['shell', 3], ['crayon', 2], ['blob', 3]), G(0.4, 2, ['blob', 7], ['kite', 2]), G(0.6, 0, ['shell', 4], ['blob', 4]), G(0.8, 1, ['shell', 3], ['crayon', 3]), { at: 1, f: [['shell', 3], ['blob', 4]], form: 3, champ: 'shell' }] },
  { ch: 1, name: '덩굴 뱀', news: '파랑+노랑 = 덩굴 뱀! 휙휙 피하는 놈을 꽁꽁', unlock: 'snake', newFoe: 'brush', D: 1.9, cols: [R, B, Y], star: { k: 'form', f: 'snake', n: 12 },
    groups: [G(0, 0, ['brush', 4], ['blob', 4]), G(0.2, 0, ['brush', 4], ['shell', 1], ['blob', 3]), G(0.4, 1, ['crayon', 4], ['kite', 2]), G(0.6, 0, ['brush', 5], ['blob', 3]), G(0.8, 0, ['brush', 4], ['kite', 2], ['bucket', 1]), { at: 1, f: [['brush', 4], ['blob', 4]], form: 3, champ: 'brush' }] },
  { ch: 1, name: '대장 물감 통 거인', news: '세 색을 다 섞으면 진흙 골렘! 쿵쿵쿵', unlock: 'golem', newFoe: 'giant', D: 0, cols: [R, B, Y], star: { k: 'time', n: 50 },
    boss: 'giant', patches: [R, Y, B, R, Y], seg: 190, summon: [['shell', 1], ['crayon', 2], ['brush', 2], ['blob', 3]],
    groups: [G(0, 2, ['crayon', 3], ['shell', 2], ['blob', 3])] },
  { ch: 2, name: '파도 일각고래', news: '파랑 셋을 이어 먹으면 파도 일각고래! 줄 선 놈을 쓸어요', unlock: 'narwhal', newFoe: null, D: 2.0, cols: [R, B, B, Y], star: { k: 'form', f: 'narwhal', n: 18 },
    groups: [G(0, 1, ['crayon', 6], ['blob', 3]), G(0.2, 1, ['crayon', 5], ['bucket', 1]), G(0.4, 2, ['blob', 7], ['shell', 2]), G(0.6, 1, ['crayon', 6], ['bucket', 1]), G(0.8, 1, ['crayon', 5], ['brush', 2], ['bucket', 1]), { at: 1, f: [['crayon', 6], ['bucket', 1]], form: 3, champ: 'bucket' }] },
  { ch: 2, name: '천둥 독수리', news: '노랑 셋을 이어 먹으면 천둥 독수리! 벼락 비', unlock: 'eagle', newFoe: 'balloon', D: 2.0, cols: [R, B, Y, Y], star: { k: 'form', f: 'eagle', n: 18 },
    groups: [G(0, 0, ['balloon', 5], ['kite', 2], ['blob', 2]), G(0.2, 0, ['balloon', 5], ['brush', 2]), G(0.4, 0, ['kite', 4], ['balloon', 3], ['blob', 3]), G(0.6, 0, ['balloon', 6], ['shell', 1]), G(0.8, 0, ['balloon', 4], ['kite', 3], ['brush', 2]), { at: 1, f: [['balloon', 5], ['kite', 2]], form: 3, champ: 'kite' }] },
  { ch: 2, name: '무지개 고래', news: '무지개 도둑을 잡으면 무지개 고래! 놓치면 달아나요', unlock: 'rainbow', newFoe: 'rainbow', D: 2.0, cols: [R, B, Y], star: { k: 'form', f: 'rainbow', n: 14 },
    groups: [G(0, 0, ['tower', 1], ['blob', 5], ['rainbow', 1]), G(0.2, 0, ['crayon', 3], ['shell', 2], ['brush', 2]), G(0.4, 0, ['tower', 1], ['balloon', 3], ['rainbow', 1]), G(0.6, 2, ['blob', 6], ['bucket', 1], ['kite', 2]), G(0.8, 0, ['tower', 1], ['crayon', 3], ['rainbow', 1]), { at: 1, f: [['shell', 2], ['brush', 2], ['balloon', 2]], form: 3, champ: 'bucket' }] },
  { ch: 2, name: '대장 회색 왕', news: '마지막 대장! 왕의 색을 다 뜯으면 마을이 무지개로', unlock: null, newFoe: 'king', D: 0, cols: [R, B, Y], star: { k: 'time', n: 60 },
    boss: 'king', patches: [R, B, Y, B, R, RAIN], seg: 170, summon: [['crayon', 2], ['brush', 1], ['balloon', 2], ['shell', 1], ['blob', 2]],
    groups: [G(0, 2, ['crayon', 3], ['balloon', 2], ['brush', 2])] },
];
export const STAGE_COUNT = STAGES.length;
/** 장 끝 둘 중 하나(광장의 큰 물건) */
export const PERKS: { name: string; line: string }[][] = [
  [{ name: '큰 붓', line: '지나간 자리를 칠하면 적이 아야' }, { name: '물감 통', line: '모습이 두 배 오래가요' }],
  [{ name: '무지개 팔레트', line: '먹을 때마다 둘레에 물감 펑' }, { name: '반짝 크레용', line: '섞은 모습이 한 단계 크게' }],
];
/** 배우는 판은 너그럽게: 도둑이 덤비는 빠르기 배수 */
const EZ = [0.55, 0.7, 0.82, 0.9, 0.95, 1, 1.03, 1.06, 1.1, 1.13, 1.16, 1.2];

// ───────────────────────────── 상태 ─────────────────────────────
/** 도둑 상태: 위에서 걸어 들어옴 · 다가옴 · 뜸 들이기(빨간 표시) · 공격 · 쉼 */
const ENTER = 0, IDLE = 1, WIND = 2, ATK = 3, REST = 4;
export interface Foe {
  id: number; k: EK; col: number; x: number; y: number; r: number; hp: number; max: number; arm: number; armMax: number; sh: boolean;
  st: number; tm: number; cool: number; vx: number; vy: number; ax: number; ay: number; ang: number;
  bind: number; stun: number; champ: boolean; held: boolean; dead: boolean; life: number;
  // 연출
  seed: number; born: number; hurtT: number; face: number; blockT: number; dodgeT: number; missT: number; hx: number; hy: number; walkT: number;
}
interface Shot { x: number; y: number; vx: number; vy: number; r: number; u: number; t: number; k: number; mine: boolean; aid: number }
interface Cloud { x: number; y: number; r: number; t: number; T: number; aid: number; seed: number }
interface Wave { y: number; t: number; aid: number; hit: number[]; big: boolean }
/** 뒤에 일어날 일: 벼락 · 골렘 쿵 */
interface Q { t: number; k: 'bolt' | 'stomp' | 'pop'; x: number; y: number; r: number; dmg: number; aid: number; id: number }
interface Paint { x: number; y: number; r: number; c: number; seed: number }
interface Patch { col: number; dx: number; dy: number; hp: number; max: number; loose: boolean; gone: boolean; looseT: number }
interface Ev { t: number; k: string; x: number; y: number; n: number; x2: number; y2: number; text: string }
interface Line { k: number; x0: number; y0: number; x1: number; y1: number; t: number; id: number }
export interface Me {
  x: number; y: number; z: number; mask: number; tier: number; f: FK; T: number; Tmax: number; face: number; vx: number; vy: number;
  st: number; tm: number; cool: number; inv: number; hitT: number; tx: number; ty: number; aid: number; ang: number; legs: number; bornT: number;
  lx: number; ly: number; lt: number; tgt: number;
}
export interface SoulState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result' | 'pick' | 'fail' | 'end'; pt: number; stageT: number;
  hearts: number; tries: number; pts: number; sp: number; stars: number; got: number; starOk: boolean[]; dead: boolean; won: boolean;
  lv: number; perk: number[]; picked: number; dex: FK[]; newDex: FK[]; seenForm: FK[];
  me: Me; eat: { id: number; patch: number; ph: number; t: number; T: number; x0: number; y0: number } | null; rest: number;
  foes: Foe[]; nid: number; shots: Shot[]; clouds: Cloud[]; waves: Wave[]; q: Q[]; lines: Line[]; paints: Paint[]; events: Ev[];
  camY: number; gi: number; awake: boolean; tapped: boolean; taps: number; clearT: number; lostHeart: boolean;
  aid: number; multi: Record<number, number>; best: number; fkills: number; kills: number; gain: number;
  patches: Patch[]; bossK: number; bossT: number; summonT: number; bossDown: boolean; bossAtk: number;
  grid: Uint8Array; gridRows: number; painted: number; pct: number; villages: number[];
  freeze: number; down: boolean; wowN: number; firstTap: number; firstBig: number; denyT: number;
  seen: Set<string>;
  banner: { head: string; sub: string; t: number } | null; spot: { id: number; t: number; label: string } | null;
  big: { text: string; sub: string; t: number; n: number; star: boolean; col: number } | null;
}

const hyp = (a: number, b: number) => Math.sqrt(a * a + b * b);
const dist = (ax: number, ay: number, bx: number, by: number) => hyp(ax - bx, ay - by);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ev = (s: SoulState, k: string, x: number, y: number, n = 0, x2 = 0, y2 = 0, text = '') => s.events.push({ t: s.t, k, x, y, n, x2, y2, text });
const see = (s: SoulState, key: string) => void s.seen.add(key);
const unl = (s: SoulState, f: FK) => UNLOCK_AT[f] <= s.stage;
/** 화면 안(판 띠)에 들어와 있나 */
const onScreen = (s: SoulState, m: Foe) => m.y > s.camY + TOP - 0.02 && m.y < s.camY + BOT + 0.02;
const alive = (m: Foe) => !m.dead;
const hittable = (m: Foe) => !m.dead && !m.held;
/** 레벨·단계가 주는 힘: 공격 세기 · 크기 */
export const powOf = (s: SoulState, tier = s.me.tier) => (1 + 0.24 * (tier - 1)) * (1 + 0.05 * (s.lv - 1));
export const sizeOf = (s: SoulState, tier = s.me.tier) => (s.me.f === 'white' ? 1 : 1 + 0.12 * (Math.min(5, tier) - 1)) * (1 + 0.012 * (s.lv - 1));
const reachK = (s: SoulState) => (1 + 0.08 * (s.me.tier - 1)) * (1 + 0.02 * (s.lv - 1));
const meR = (s: SoulState) => FD[s.me.f].r * sizeOf(s);

function formOf(s: SoulState, mask: number, tier: number): FK {
  if (mask === RAIN) return 'rainbow';
  if (mask === 7) return 'golem';
  if (mask === 3) return 'octo';
  if (mask === 5) return 'turtle';
  if (mask === 6) return 'snake';
  if (mask === R) return tier >= 3 && unl(s, 'dragon') ? 'dragon' : 'lion';
  if (mask === B) return tier >= 3 && unl(s, 'narwhal') ? 'narwhal' : 'whale';
  if (mask === Y) return tier >= 3 && unl(s, 'eagle') ? 'eagle' : 'bird';
  return 'white';
}
/**
 * 섞기: 지금 색에 먹은 색을 더한다. 같은 색이면 한 단계 커지고(셋째엔 2단계 짐승), 다른 원색이면 섞인 색(풀린 것만),
 * 세 색이 다 모이면 진흙 골렘. 아직 못 섞는 색이면 먹은 색이 덮는다. 골렘·무지개(잠깐 모습) 뒤에는 먹은 색부터 새로.
 */
export function mixRes(s: SoulState, col: number, bonus = 0, cur = s.me.mask, curTier = s.me.tier): { mask: number; tier: number; f: FK } {
  let mask: number, tier: number;
  if (col === RAIN) (mask = unl(s, 'rainbow') ? RAIN : R), (tier = 1);
  else if (cur === 0 || cur === RAIN || cur === 7) (mask = col), (tier = 1);
  else {
    const u = cur | col;
    if (u === cur) (mask = cur), (tier = curTier + 1);
    else if (pc(u) === 2 && unl(s, formOf(s, u, 1))) (mask = u), (tier = 1);
    else if (pc(u) === 3 && unl(s, 'golem')) (mask = 7), (tier = 1);
    else (mask = col), (tier = 1);
  }
  if (s.perk[1] === 2 && pc(mask) >= 2 && mask !== RAIN && tier === 1) tier = 2;
  tier = Math.min(5, tier + bonus);
  return { mask, tier, f: formOf(s, mask, tier) };
}
/** 모습이 가는 시간(틱) */
function durOf(s: SoulState, f: FK, tier: number) {
  if (f === 'golem') return 150 + 20 * (tier - 1);
  if (f === 'rainbow') return 175;
  if (f === 'white') return 0;
  return Math.round((410 + 30 * (tier - 1)) * (1 + 0.035 * (s.lv - 1)) * (s.perk[0] === 2 ? 2 : 1));
}

function wow(s: SoulState, text: string, sub = '', n = 0, col = 0) {
  s.wowN++;
  if (s.firstBig < 0 && s.firstTap >= 0) s.firstBig = s.t;
  s.big = { text, sub, t: s.t, n, star: false, col };
  s.freeze = Math.max(s.freeze, 5);
  see(s, 'wow');
}

// ───────────────────────────── 칠하기 ─────────────────────────────
const GX = 12, CELL = 1 / GX;
function paint(s: SoulState, x: number, y: number, r: number, c: number) {
  r *= 1 + 0.04 * (s.lv - 1);
  s.paints.push({ x, y, r, c, seed: Math.floor(s.rng() * 1e6) });
  if (s.paints.length > 900) s.paints.shift();
  const D = STAGES[s.stage].D, r0 = Math.floor((y - r + D) / CELL), r1 = Math.floor((y + r + D) / CELL);
  for (let row = Math.max(0, r0); row <= Math.min(s.gridRows - 1, r1); row++)
    for (let col = Math.max(0, Math.floor((x - r) / CELL)); col <= Math.min(GX - 1, Math.floor((x + r) / CELL)); col++) {
      const cx = (col + 0.5) * CELL, cy = (row + 0.5) * CELL - D;
      if (dist(cx, cy, x, y) <= r + CELL * 0.3 && !s.grid[row * GX + col]) (s.grid[row * GX + col] = 1), s.painted++;
    }
  s.pct = s.painted / Math.max(1, s.grid.length);
}

// ───────────────────────────── 도둑 ─────────────────────────────
function pickCol(s: SoulState, cols: number[]) {
  return cols[Math.floor(s.rng() * cols.length) % cols.length];
}
function add(s: SoulState, k: EK, x: number, y: number, col: number, entering: boolean, champ = false): Foe {
  const d = ED[k], sk = (1 + 0.07 * s.stage) * (champ ? 3 : 1), hp = Math.round(d.hp * sk);
  const r = d.r * (champ ? 1.45 : 1), arm = Math.round((d.armor ?? 0) * (1 + 0.06 * s.stage) * (champ ? 2 : 1));
  const m: Foe = {
    id: ++s.nid, k, col, x, y, r, hp, max: hp, arm: d.boss ? 0 : arm, armMax: d.boss ? 0 : arm, sh: !!d.shield && !d.boss,
    st: entering ? ENTER : IDLE, tm: 0, cool: 30 + Math.floor(s.rng() * 80), vx: 0, vy: 0, ax: x, ay: y, ang: 0,
    bind: 0, stun: 0, champ, held: false, dead: false, life: 0,
    seed: Math.floor(s.rng() * 1e6), born: s.t, hurtT: -99, face: x < 0.5 ? 1 : -1, blockT: -99, dodgeT: -99, missT: -99, hx: x, hy: y, walkT: -99,
  };
  if (!s.seen.has('k:' + k)) see(s, 'k:' + k);
  s.foes.push(m);
  return m;
}
/** 떼 하나를 위에서 내려보낸다 (form: 0 흩어짐 · 1 줄 · 2 뭉침 · 3 광장 둘레) */
function spawnGroup(s: SoulState, g: Grp, pre: boolean) {
  const d = STAGES[s.stage], cols = g.cols ?? d.cols, list: EK[] = [];
  for (const [k, n] of g.f) for (let j = 0; j < n; j++) list.push(k);
  const room = CAP - s.foes.filter(alive).length;
  const n = Math.min(list.length, Math.max(0, room - (g.champ ? 1 : 0)));
  const baseY = pre ? s.camY + 0.36 : s.camY + TOP - 0.04, form = g.form ?? 0;
  const cx = 0.25 + s.rng() * 0.5;
  for (let i = 0; i < n; i++) {
    const k = list[i], r = ED[k].r;
    let x: number, y: number;
    if (form === 1) (x = 0.14 + ((i % 6) + 0.5) * (0.72 / 6)), (y = baseY - Math.floor(i / 6) * 0.1);
    else if (form === 2) {
      const a = i * 2.39996, q = 0.03 + 0.022 * Math.sqrt(i + 1) * 1.6;
      (x = cx + Math.cos(a) * q), (y = baseY - 0.05 + Math.sin(a) * q * 0.8);
    } else if (form === 3) {
      const a = (i / Math.max(1, n)) * TAU + 0.3;
      (x = 0.5 + Math.cos(a) * 0.3), (y = baseY + 0.06 + Math.sin(a) * 0.16);
    } else (x = 0.1 + s.rng() * 0.8), (y = baseY - s.rng() * 0.14);
    if (pre) y += 0.08 + s.rng() * 0.3;
    x = clamp(x, r + 0.02, 0.98 - r);
    const col = k === 'rainbow' ? RAIN : pickCol(s, cols);
    add(s, k, x, y, col, !pre);
  }
  if (g.champ) {
    // 판의 '무서운 것': 크고 진한 색 — 먹으면 단숨에 한 단계 더 (그 판의 새 모습 색)
    const ck = g.champ, sf = d.star.k === 'form' ? FD[d.star.f].mask : R, col = sf === RAIN ? R : sf;
    const m = add(s, ck, 0.5, pre ? s.camY + 0.5 : s.camY + TOP - 0.08, col, !pre, true);
    s.spot = { id: m.id, t: s.t, label: '진한 색!' };
    ev(s, 'champ', m.x, m.y, 0, 0, 0, ck);
    see(s, 'champ' + s.stage);
  }
  if (!pre) ev(s, 'spawn', 0.5, s.camY + TOP, n);
}

/** 대장 판: 대장과 두른 색 */
function spawnBoss(s: SoulState) {
  const d = STAGES[s.stage], k = d.boss!, m = add(s, k, 0.5, s.camY + 0.42, 0, false);
  m.r = ED[k].r;
  const n = d.patches!.length;
  s.patches = d.patches!.map((col, i) => {
    const a = Math.PI * (0.15 + (0.7 * i) / Math.max(1, n - 1));
    return { col, dx: -Math.cos(a) * 1.05, dy: 0.05 - Math.sin(a) * 0.55 + (i % 2) * 0.12, hp: d.seg! * (1 + 0.04 * s.stage), max: d.seg! * (1 + 0.04 * s.stage), loose: false, gone: false, looseT: -99 };
  });
  s.bossK = 1;
  s.bossT = 40;
  m.tm = 2;
  s.summonT = 200;
  s.bossDown = false;
  s.spot = { id: m.id, t: s.t, label: 'NEW ' + ED[k].name };
}
const bossOf = (s: SoulState) => s.foes.find((m) => ED[m.k].boss && !m.dead);
export const patchXY = (s: SoulState, b: Foe, p: Patch): [number, number] => [b.x + p.dx * b.r * s.bossK, b.y + p.dy * b.r * s.bossK - b.r * 0.5 * s.bossK];

function newStage(s: SoulState) {
  const d = STAGES[s.stage];
  s.foes = [];
  s.shots = [];
  s.clouds = [];
  s.waves = [];
  s.q = [];
  s.lines = [];
  s.paints = [];
  s.patches = [];
  s.camY = 0;
  s.gi = 0;
  s.eat = null;
  s.rest = 0;
  s.clearT = 0;
  s.best = 0;
  s.multi = {};
  s.fkills = 0;
  s.stageT = 0;
  s.lostHeart = false;
  s.bossDown = false;
  s.phase = 'play';
  s.pt = 0;
  s.starOk = [false, false, false];
  s.got = 0;
  s.newDex = [];
  s.big = null;
  s.awake = s.stage > 0;
  s.gridRows = Math.ceil((d.D + A) / CELL);
  s.grid = new Uint8Array(s.gridRows * GX);
  s.painted = 0;
  s.pct = 0;
  s.me = blankMe();
  if (s.stage === 0 && !s.tapped) {
    // 1판 첫 장면: 진한 빨강 물감 통 도깨비 둘레에 먹물 꼬마 일곱 — 첫 톡이 '불 사자! 8마리 한 방'
    const c = add(s, 'bucket', 0.5, 0.62, R, false, true);
    s.spot = { id: c.id, t: s.t, label: '진한 빨강!' };
    for (let i = 0; i < 7; i++) add(s, 'blob', 0.5 + Math.cos(0.4 + (i * TAU) / 7) * 0.13, 0.64 + Math.sin(0.4 + (i * TAU) / 7) * 0.1, R, false);
    for (const [x, y] of [[0.16, 0.36], [0.84, 0.4], [0.2, 0.84], [0.8, 0.8]]) add(s, 'blob', x, y, R, false);
  } else if (d.boss) {
    spawnBoss(s);
    spawnGroup(s, d.groups[0], true);
    s.gi = 1;
  } else {
    spawnGroup(s, { ...d.groups[0], at: 0, champ: undefined }, true);
    s.gi = 1;
  }
  const first = s.stage === 0 || STAGES[s.stage - 1].ch !== d.ch;
  s.banner = { head: `${first ? CHAPTERS[d.ch] + ' · ' : ''}${s.stage + 1}판`, sub: d.news, t: s.t };
  if (d.boss) s.spot = s.spot ?? null;
  see(s, 'stage' + s.stage);
  if (first) see(s, 'ch' + d.ch);
  ev(s, 'stage', 0.5, s.camY + 0.6, s.stage);
}
function blankMe(): Me {
  return { x: 0.5, y: HOME_SY, z: 0, mask: 0, tier: 1, f: 'white', T: 0, Tmax: 1, face: 1, vx: 0, vy: 0, st: 0, tm: 0, cool: 30, inv: 0, hitT: -99, tx: 0.5, ty: HOME_SY, aid: 0, ang: -Math.PI / 2, legs: 0, bornT: -99, lx: 0.5, ly: HOME_SY, lt: 0, tgt: 0 };
}

// ───────────────────────────── 때리기 ─────────────────────────────
function kill(s: SoulState, m: Foe, aid: number) {
  if (m.dead) return;
  m.dead = true;
  s.kills++;
  let n = 0;
  if (aid > 0) {
    n = s.multi[aid] = (s.multi[aid] ?? 0) + 1;
    s.sp += Math.ceil((n * n) / 4);
    if (n > s.best) {
      const d = STAGES[s.stage], star = d.star.k === 'multi' && s.best < d.star.n && n >= d.star.n;
      s.best = n;
      if (star) starWow(s, `${n}마리 한 방!`);
      else if (n >= WOW_N && n % 2 === 1) ev(s, 'record', m.x, m.y - m.r, n), (s.wowN++, s.firstBig < 0 && s.firstTap >= 0 && (s.firstBig = s.t));
    }
  } else s.sp += 1;
  if (s.me.f !== 'white') {
    s.fkills++;
    const d = STAGES[s.stage];
    if (d.star.k === 'form' && s.me.f === d.star.f) {
      const k = (s.multi[-1] = (s.multi[-1] ?? 0) + 1);
      if (k === d.star.n) starWow(s, `${FD[d.star.f].name}으로 ${k}마리!`);
    }
  }
  paint(s, m.x, m.y, 0.045 + m.r * 0.9, m.col === RAIN ? [R, B, Y][m.seed % 3] : m.col);
  ev(s, 'kill', m.x, m.y - m.r, n, m.r, 0, m.k);
}
function starWow(s: SoulState, text: string) {
  wow(s, text, '별 셋째!', 0, s.me.mask);
  s.big!.star = true;
  ev(s, 'star3', s.me.x, s.me.y - 0.1);
}
/** 대장을 때린다: 지금 색 조각의 기운이 줄고, 바닥나면 헐거워진다(톡 하면 뜯어 먹기) */
function hurtBoss(s: SoulState, m: Foe, amt: number) {
  const p = s.patches.find((q) => !q.gone);
  if (!p || p.loose) return;
  p.hp -= amt;
  m.hurtT = s.t;
  if (p.hp <= 0) {
    p.hp = 0;
    p.loose = true;
    p.looseT = s.t;
    m.stun = Math.max(m.stun, 70);
    const [x, y] = patchXY(s, m, p);
    ev(s, 'loose', x, y, 0, 0, 0, String(p.col));
    s.spot = { id: m.id, t: s.t, label: '헐거운 색을 톡!' };
    see(s, 'loose');
  }
}
/** 공격 배수: 하늘·방패·껍데기·빠름·큼 */
function bossMul(k: EK, ak: AK) {
  if (k === 'inkboss') return BIG_MUL[ak] * 0.9;
  if (k === 'giant') return ARMOR_OK.has(ak) ? 1.8 : ak === 'jet' || ak === 'wave' ? 0.5 : 0.28;
  return SHIELD_OK.has(ak) ? 1.6 : ak === 'bolt' || ak === 'fire' ? 0.5 : 0.3;
}
/** 도둑을 때린다 — 돌려주는 값: 0 못 닿음 · 1 막힘 · 2 맞음 */
function hurt(s: SoulState, m: Foe, base: number, ak: AK, aid: number, kx = 0, ky = 0): number {
  if (!hittable(m)) return 0;
  const d = ED[m.k];
  if (d.boss) return hurtBoss(s, m, base * bossMul(m.k, ak)), 2;
  if (d.air && !AIR_OK.has(ak)) {
    if (s.t - m.missT > 30) (m.missT = s.t), ev(s, 'miss', m.x, m.y - m.r * 2.2);
    return 0;
  }
  let amt = base;
  if (m.sh) {
    if (ak === 'quake' || ak === 'rain') (m.sh = false), ev(s, 'shieldbreak', m.x, m.y - m.r);
    else if (!SHIELD_OK.has(ak)) {
      amt *= 0.14;
      if (s.t - m.blockT > 14) (m.blockT = s.t), ev(s, 'block', m.x, m.y - m.r);
    }
  }
  if (d.fast && m.bind <= 0 && m.stun <= 0) {
    amt *= FAST_MUL[ak];
    if (FAST_MUL[ak] < 0.7 && s.t - m.dodgeT > 18) (m.dodgeT = s.t), ev(s, 'dodge', m.x, m.y - m.r * 1.8), (m.vx += (s.rng() - 0.5) * 0.02);
  }
  if (d.big) amt *= BIG_MUL[ak];
  if (m.arm > 0) {
    const hit = ARMOR_OK.has(ak) ? amt * 2.6 : amt * 0.14;
    m.arm -= hit;
    m.hurtT = s.t;
    if (m.arm <= 0) (m.arm = 0), ev(s, 'armorbreak', m.x, m.y - m.r), see(s, 'armorbreak');
    else if (s.t - m.blockT > 14) (m.blockT = s.t), ev(s, ARMOR_OK.has(ak) ? 'crackle' : 'clank', m.x, m.y - m.r);
    return 1;
  }
  m.hp -= amt;
  m.hurtT = s.t;
  const push = d.big ? (ak === 'jet' || ak === 'wave' ? 0.9 : 0.15) : 1;
  m.vx += kx * push;
  m.vy += ky * push;
  if (m.hp <= 0) kill(s, m, aid);
  return amt >= base * 0.5 ? 2 : 1;
}
/** 둥근 범위를 모두 때린다 (ground: 땅 공격 — 하늘 도둑은 못 맞힘은 hurt가 가린다) */
function blast(s: SoulState, x: number, y: number, r: number, dmg: number, ak: AK, aid: number, knock: number) {
  let n = 0;
  for (const m of s.foes) {
    if (!hittable(m)) continue;
    const dd = dist(x, y, m.x, m.y);
    if (dd > r + m.r * 0.6) continue;
    const a = dd > 1e-4 ? Math.atan2(m.y - y, m.x - x) : m.seed, kk = knock * (1.2 - 0.6 * Math.min(1, dd / r));
    if (hurt(s, m, dmg, ak, aid, Math.cos(a) * kk, Math.sin(a) * kk)) n++;
  }
  return n;
}

// ───────────────────────────── 맞기 ─────────────────────────────
/** 정령이 맞는다: 색 있는 모습은 색이 튀어 나가 짧아진다(u ≥ 3이면 몽땅), 하얀 맨몸이면 하트 -1 */
function hitMe(s: SoulState, u: number, x: number, y: number) {
  const me = s.me;
  if (me.inv > 0 || s.eat || s.phase !== 'play') return;
  const a = Math.atan2(me.y - y, me.x - x);
  me.vx += Math.cos(a) * 0.012;
  me.vy += Math.sin(a) * 0.012;
  me.hitT = s.t;
  if (me.f !== 'white') {
    if (u >= 3 && me.f !== 'golem' && me.f !== 'rainbow') me.T = 0, ev(s, 'knock', me.x, me.y - meR(s), 0, 0, 0, String(me.mask));
    else me.T -= 75 * u, ev(s, 'drip', me.x, me.y - meR(s), u, 0, 0, String(me.mask));
    me.inv = 34;
    if (me.T <= 0) fade(s, true);
    return;
  }
  me.inv = 100;
  // 1판·처음 10초는 하트를 잃지 않는다 (어질어질만)
  if (s.stage === 0 || s.t < 600) return void ev(s, 'ouch', me.x, me.y - meR(s));
  s.hearts--;
  s.lostHeart = true;
  ev(s, 'heart', me.x, me.y - meR(s));
  see(s, 'heart');
  if (s.hearts <= 0) {
    s.phase = 'fail';
    s.pt = 0;
    s.tries--;
    ev(s, s.tries > 0 ? 'fail' : 'end', 0.5, s.camY + 0.6, s.tries);
    if (s.tries <= 0) s.phase = 'end';
  }
}
/** 모습이 다 옅어졌다 → 하얀 정령 */
function fade(s: SoulState, knocked = false) {
  const me = s.me, was = me.f;
  me.mask = 0;
  me.tier = 1;
  me.f = 'white';
  me.T = 0;
  me.st = 0;
  me.tm = 0;
  me.z = 0;
  me.cool = 30;
  ev(s, 'fade', me.x, me.y - 0.05, knocked ? 1 : 0, 0, 0, was);
}

// ───────────────────────────── 톡 = 색 빨아들이기 ─────────────────────────────
/** 톡한 곳에서 가장 가까운 도둑(반지름 화면 폭 18%, 큰 놈일수록 넉넉히 — 없으면 화면에서 가장 가까운 것) · 헐거운 대장 색 */
export function pick(s: SoulState, x: number, y: number): { id: number; patch: number } | null {
  let best: { id: number; patch: number } | null = null, bv = 1e9;
  const b = bossOf(s);
  if (b)
    s.patches.forEach((p, i) => {
      if (!p.loose || p.gone) return;
      const [px, py] = patchXY(s, b, p), v = dist(px, py, x, y) - 0.12;
      if (v < bv) (bv = v), (best = { id: b.id, patch: i });
    });
  for (const m of s.foes) {
    if (!hittable(m) || ED[m.k].boss || !onScreen(s, m)) continue;
    const v = dist(m.x, m.y - m.r * 0.6, x, y) - m.r * 1.2;
    if (v < bv) (bv = v), (best = { id: m.id, patch: -1 });
  }
  return best;
}
function onTap(s: SoulState, x: number, y: number) {
  if (s.firstTap < 0) s.firstTap = s.t;
  s.taps++;
  if (s.eat || s.rest > 0) return void ((s.denyT = s.t), ev(s, 'deny', x, y));
  const tg = s.stage === 0 && !s.tapped ? (() => {
    const c = s.foes.find((m) => m.champ && hittable(m));
    return c ? { id: c.id, patch: -1 } : pick(s, x, y);
  })() : pick(s, x, y);
  if (!tg) return;
  s.tapped = true;
  if (!s.awake) s.awake = true;
  const m = s.foes.find((o) => o.id === tg.id)!;
  let tx = m.x, ty = m.y;
  if (tg.patch >= 0) [tx, ty] = patchXY(s, m, s.patches[tg.patch]);
  else m.held = true;
  const me = s.me;
  s.eat = { id: tg.id, patch: tg.patch, ph: 0, t: 0, T: DASH_MIN + Math.round(dist(me.x, me.y, tx, ty) * 16), x0: me.x, y0: me.y };
  me.z = 0;
  ev(s, 'tap', x, s.camY + y);
  ev(s, 'dash', me.x, me.y, 0, tx, ty);
}
function eatStep(s: SoulState) {
  const e = s.eat!, me = s.me, m = s.foes.find((o) => o.id === e.id && !o.dead);
  if (!m) return void (s.eat = null);
  let tx = m.x, ty = m.y - m.r * 0.3;
  if (e.patch >= 0) {
    const p = s.patches[e.patch];
    if (p.gone) return void (s.eat = null);
    [tx, ty] = patchXY(s, m, p);
  }
  e.t++;
  if (e.ph === 0) {
    // 휙 날아간다 (곁으로)
    const q = Math.min(1, e.t / e.T), k = 1 - (1 - q) * (1 - q), side = e.x0 < tx ? -1 : 1, ox = side * (m.r + 0.035) * (e.patch >= 0 ? 0.5 : 1), oy = e.patch >= 0 ? 0.09 : 0.05;
    me.x = e.x0 + (tx + ox - e.x0) * k;
    me.y = e.y0 + (ty + oy - e.y0) * k;
    me.face = tx > me.x ? 1 : -1;
    if (e.t >= e.T) (e.ph = 1), (e.t = 0), ev(s, 'suck', tx, ty, 0, me.x, me.y, String(e.patch >= 0 ? s.patches[e.patch].col : m.col));
    return;
  }
  // 쭉 빨아들인다 (색 띠가 소용돌이로)
  if (e.t < SUCK_T) return;
  s.eat = null;
  s.rest = REST_T;
  const aid = ++s.aid;
  let col: number, bonus = 0;
  if (e.patch >= 0) {
    const p = s.patches[e.patch];
    p.gone = true;
    col = p.col;
    bonus = 1;
    s.bossK *= 0.84;
    m.stun = Math.max(m.stun, 50);
    ev(s, 'bpatch', tx, ty, s.patches.filter((q) => !q.gone).length, 0, 0, String(col));
    see(s, 'bpatch');
    const left = s.patches.filter((q) => !q.gone).length;
    if (!left) {
      s.bossDown = true;
      m.dead = true;
      s.kills++;
      s.sp += 30;
      paint(s, m.x, m.y, 0.32, R);
      paint(s, m.x - 0.2, m.y + 0.1, 0.2, B);
      paint(s, m.x + 0.2, m.y + 0.1, 0.2, Y);
      ev(s, 'bossdown', m.x, m.y, 0, m.r, 0, m.k);
      wow(s, `${ED[m.k].name.replace('대장 ', '')}를 이겼다!`, '마을에 색이 돌아와요', 0, col);
      s.spot = null;
    } else wow(s, '대장 색을 뜯었다!', `${CNAME[col]} — 대장은 작아지고 나는 커져요`, 0, col);
  } else {
    col = m.col;
    if (m.champ) bonus = 1;
    m.held = false;
    ev(s, 'shatter', m.x, m.y, 0, m.r, 0, m.k);
    kill(s, m, aid);
  }
  transform(s, col, bonus, aid);
}
function transform(s: SoulState, col: number, bonus: number, aid: number) {
  const me = s.me, was = me.f, res = mixRes(s, col, bonus);
  me.mask = res.mask;
  me.tier = res.tier;
  me.f = res.f;
  me.T = me.Tmax = durOf(s, me.f, me.tier);
  me.bornT = s.t;
  me.aid = aid;
  me.st = 0;
  me.tm = 0;
  me.cool = me.f === 'golem' ? 50 : 22;
  me.legs = 0;
  me.inv = Math.max(me.inv, 24);
  me.z = 0;
  const fresh = !s.dex.includes(me.f);
  if (fresh) s.dex.push(me.f), s.newDex.push(me.f), see(s, 'dex:' + me.f);
  if (!s.seenForm.includes(me.f)) s.seenForm.push(me.f);
  ev(s, 'morph', me.x, me.y, me.tier, me.mask, was === me.f ? 1 : 0, me.f);
  burst(s, aid);
  if (s.perk[1] === 1) blast(s, me.x, me.y, 0.15 * reachK(s), 16 * powOf(s), 'pop', aid, 0.012), ev(s, 'palette', me.x, me.y, 0, 0.15 * reachK(s));
  if (fresh && me.f !== 'white') wow(s, `${FD[me.f].name}!`, FD[me.f].does, 0, me.mask);
}

// ───────────────────────────── 모습: 등장 한 방 ─────────────────────────────
const nearFoes = (s: SoulState, x: number, y: number, r: number) => s.foes.filter((m) => hittable(m) && !ED[m.k].boss && onScreen(s, m) && dist(x, y, m.x, m.y) < r);
/** 가장 붐비는 곳 (적 위치 중 r 안에 가장 많이 든 곳 — 공격이 닿는 놈만 센다) */
function densest(s: SoulState, r: number, ak: AK, fromX: number, fromY: number, reach: number): [number, number, number] {
  let bx = fromX, by = fromY - 0.2, bn = -1;
  const list = s.foes.filter((m) => hittable(m) && onScreen(s, m));
  for (const c of list) {
    if (dist(fromX, fromY, c.x, c.y) > reach) continue;
    let n = 0;
    for (const o of list) if (dist(c.x, c.y, o.x, o.y) < r + o.r * 0.5) n += worth(o, ak);
    if (n > bn) (bn = n), (bx = c.x), (by = c.y);
  }
  return [bx, by, bn];
}
/** 이 공격이 이 도둑에게 얼마나 먹히나 (봇·자동 조준이 함께 쓴다) */
export function worth(m: Foe, ak: AK): number {
  const d = ED[m.k];
  if (d.boss) return bossMul(m.k, ak) * 2;
  if (d.air && !AIR_OK.has(ak)) return 0;
  let v = 1;
  if (m.sh && !SHIELD_OK.has(ak) && ak !== 'quake') v *= 0.14;
  if (m.arm > 0) v *= ARMOR_OK.has(ak) ? 1.4 : 0.14;
  if (d.fast && m.bind <= 0) v *= FAST_MUL[ak];
  if (d.big) v *= BIG_MUL[ak];
  return v;
}
function burst(s: SoulState, aid: number) {
  const me = s.me, f = me.f, P = powOf(s), K = reachK(s);
  switch (f) {
    case 'lion': blast(s, me.x, me.y, 0.17 * K, 26 * P, 'pounce', aid, 0.02); paint(s, me.x, me.y, 0.13 * K, R); ev(s, 'roar', me.x, me.y, 0, 0.17 * K); break;
    case 'dragon': blast(s, me.x, me.y, 0.3 * K, 40 * P, 'fire', aid, 0.025); paint(s, me.x, me.y, 0.2 * K, R); ev(s, 'nova', me.x, me.y, 0, 0.3 * K); break;
    case 'whale': blast(s, me.x, me.y, 0.15 * K, 22 * P, 'jet', aid, 0.03); pushAll(s, me.x, me.y, 0.34 * K, 0.035); paint(s, me.x, me.y, 0.13 * K, B); ev(s, 'splashdown', me.x, me.y, 0, 0.15 * K); break;
    case 'narwhal': s.waves.push({ y: me.y, t: 0, aid, hit: [], big: true }); paint(s, me.x, me.y, 0.16 * K, B); ev(s, 'bigwave', me.x, me.y); break;
    case 'bird': chain(s, me.x, me.y - 0.03, 9, 16 * P, 0.36, aid); ev(s, 'clap', me.x, me.y); break;
    case 'eagle': for (let i = 0; i < 9; i++) s.q.push({ t: s.t + 4 + i * 4, k: 'bolt', x: 0, y: 0, r: 0.06, dmg: 30 * P, aid, id: 0 }); paint(s, me.x, me.y, 0.14 * K, Y); ev(s, 'storm', me.x, me.y); break;
    case 'octo': addCloud(s, me.x, me.y - 0.02, 0.2 * K, 200, aid); ev(s, 'cloud', me.x, me.y, 1, 0.2 * K); break;
    case 'turtle': blast(s, me.x, me.y, 0.2 * K, 40 * P, 'slam', aid, 0.022); paint(s, me.x, me.y, 0.15 * K, 5); ev(s, 'slam', me.x, me.y, 1, 0.2 * K); break;
    case 'snake': for (const m of nearFoes(s, me.x, me.y, 0.27 * K).slice(0, 8)) vineHit(s, m, 14 * P, aid); ev(s, 'net', me.x, me.y, 0, 0.27 * K); break;
    case 'golem': stomp(s, aid, 1); break;
    case 'rainbow': me.st = 1; me.tm = 0; ev(s, 'rainbow', me.x, me.y); break;
    default: break;
  }
}
function pushAll(s: SoulState, x: number, y: number, r: number, k: number) {
  for (const m of s.foes) {
    if (!hittable(m) || ED[m.k].boss) continue;
    const dd = dist(x, y, m.x, m.y);
    if (dd > r || dd < 1e-4) continue;
    const a = Math.atan2(m.y - y, m.x - x), q = (1 - dd / r) * k * (ED[m.k].big ? 1 : 1.3);
    m.vx += Math.cos(a) * q;
    m.vy += Math.sin(a) * q;
    if (m.st === WIND && ED[m.k].big) (m.st = REST), (m.tm = 50), ev(s, 'stagger', m.x, m.y - m.r * 1.8);
  }
}
/** 번개: 가장 가까운(하늘 먼저) 아직 안 맞은 도둑으로 줄줄이 */
function chain(s: SoulState, x: number, y: number, n: number, dmg: number, reach: number, aid: number) {
  const hit: number[] = [];
  let cx = x, cy = y;
  for (let k = 0; k < n; k++) {
    let o: Foe | null = null, ov = 1e9;
    for (const m of s.foes) {
      if (!hittable(m) || hit.includes(m.id) || !onScreen(s, m)) continue;
      const dd = dist(cx, cy, m.x, m.y);
      if (dd > (k ? reach * 0.85 : reach)) continue;
      const v = dd - (ED[m.k].air ? 0.12 : 0) - (ED[m.k].boss ? -0.05 : 0);
      if (v < ov) (ov = v), (o = m);
    }
    if (!o) break;
    hit.push(o.id);
    s.lines.push({ k: 1, x0: cx, y0: cy, x1: o.x, y1: o.y - o.r * 0.6, t: s.t, id: k });
    ev(s, 'zap', o.x, o.y - o.r, k);
    o.stun = Math.max(o.stun, 12);
    cx = o.x;
    cy = o.y - o.r * 0.6;
    hurt(s, o, dmg, 'chain', aid);
  }
  return hit.length;
}
function addCloud(s: SoulState, x: number, y: number, r: number, T: number, aid: number) {
  s.clouds.push({ x, y, r, t: 0, T, aid, seed: Math.floor(s.rng() * 1000) });
  if (s.clouds.length > CLOUD_CAP) s.clouds.shift();
  paint(s, x, y, r * 0.55, 3);
}
function vineHit(s: SoulState, m: Foe, dmg: number, aid: number) {
  if (!ED[m.k].boss) m.bind = Math.max(m.bind, 110);
  s.lines.push({ k: 2, x0: s.me.x, y0: s.me.y - 0.02, x1: m.x, y1: m.y - m.r * 0.5, t: s.t, id: m.id });
  hurt(s, m, dmg, 'vine', aid);
  ev(s, 'vine', m.x, m.y - m.r);
}
function stomp(s: SoulState, aid: number, n: number) {
  const P = powOf(s);
  let k = 0;
  for (const m of s.foes) {
    if (!hittable(m) || !onScreen(s, m)) continue;
    if (ED[m.k].air) continue;
    m.stun = Math.max(m.stun, 40);
    m.vy -= 0.006;
    if (hurt(s, m, 22 * P, 'quake', aid)) k++;
  }
  paint(s, s.me.x, s.me.y, 0.12 + 0.03 * n, 7);
  ev(s, 'stomp', s.me.x, s.me.y, n, k);
  see(s, 'stomp');
}

// ───────────────────────────── 모습: 저절로 싸우기 ─────────────────────────────
function moveTo(me: Me, x: number, y: number, spd: number) {
  const dx = x - me.x, dy = y - me.y, dd = hyp(dx, dy);
  if (dd < 1e-4) return;
  const v = Math.min(spd, dd);
  me.x += (dx / dd) * v;
  me.y += (dy / dd) * v;
  if (Math.abs(dx) > 0.004) me.face = dx > 0 ? 1 : -1;
}
function nearest(s: SoulState, x: number, y: number, ak: AK, pref?: (m: Foe) => number): Foe | null {
  let o: Foe | null = null, ov = 1e9;
  for (const m of s.foes) {
    if (!hittable(m) || !onScreen(s, m)) continue;
    const w = worth(m, ak);
    if (w <= 0) continue;
    const v = dist(x, y, m.x, m.y) - (pref ? pref(m) : 0) - w * 0.04;
    if (v < ov) (ov = v), (o = m);
  }
  return o;
}
function myStep(s: SoulState) {
  const me = s.me, P = powOf(s), K = reachK(s), f = me.f, home = s.camY + HOME_SY;
  if (me.inv > 0) me.inv--;
  if (me.cool > 0) me.cool--;
  if (me.f !== 'white' && me.f !== 'golem' && me.f !== 'rainbow' && --me.T <= 0) return void fade(s);
  me.x += me.vx;
  me.y += me.vy;
  me.vx *= 0.82;
  me.vy *= 0.82;
  const aid = me.aid;
  switch (f) {
    case 'white': {
      // 하얀 정령: 집 둘레에서 둥실, 가까운 도둑에 반짝 별 (약하다)
      const o = nearest(s, me.x, me.y, 'spark');
      const fx = 0.5 + Math.sin(s.t * 0.013) * 0.22, fy = home + Math.sin(s.t * 0.021) * 0.05;
      let ax = fx, ay = fy;
      if (o && dist(o.x, o.y, me.x, me.y) < 0.16) (ax = me.x - (o.x - me.x) * 0.8), (ay = me.y - (o.y - me.y) * 0.5 + 0.02);
      moveTo(me, ax, ay, 0.0045);
      me.z = 0.02 + Math.sin(s.t * 0.08) * 0.008;
      if (o && me.cool <= 0 && dist(o.x, o.y, me.x, me.y) < 0.55) {
        me.cool = 34;
        const a = Math.atan2(o.y - me.y, o.x - me.x);
        shoot(s, me.x, me.y - 0.03, Math.cos(a) * 0.014, Math.sin(a) * 0.014, 0.018, 5 * P, 9, true, 0);
        ev(s, 'spark', me.x, me.y);
      }
      break;
    }
    case 'lion': {
      // 떼 한가운데로 폴짝 뛰어들어 착지하며 불꽃 펑
      if (me.st === 1) {
        const q = ++me.tm / me.legs;
        me.x = me.lx + (me.tx - me.lx) * q;
        me.y = me.ly + (me.ty - me.ly) * q;
        me.z = Math.sin(q * Math.PI) * 0.09;
        if (me.tm >= me.legs) {
          me.st = 0;
          me.z = 0;
          me.cool = 30;
          const a2 = ++s.aid;
          blast(s, me.x, me.y, 0.12 * K, 17 * P, 'pounce', a2, 0.016);
          paint(s, me.x, me.y, 0.07 * K, R);
          ev(s, 'land', me.x, me.y, 0, 0.12 * K);
        }
        break;
      }
      const [cx, cy, n] = densest(s, 0.12 * K, 'pounce', me.x, me.y, 0.6);
      if (me.cool <= 0 && n > 0) {
        me.st = 1;
        me.tm = 0;
        me.lx = me.x;
        me.ly = me.y;
        me.tx = clamp(cx, 0.06, 0.94);
        me.ty = clamp(cy + 0.02, s.camY + 0.26, s.camY + 1.25);
        me.legs = 14 + Math.round(dist(me.x, me.y, me.tx, me.ty) * 18);
        me.face = me.tx > me.x ? 1 : -1;
        ev(s, 'pounce', me.x, me.y);
      } else moveTo(me, n > 0 ? cx : 0.5, n > 0 ? cy + 0.14 : home - 0.1, 0.004);
      break;
    }
    case 'dragon': {
      // 하늘을 날며 붐비는 곳을 향해 불을 휩쓴다 (하늘 도둑도 탄다)
      me.z = 0.07 + Math.sin(s.t * 0.06) * 0.01;
      const [cx, cy, n] = densest(s, 0.16 * K, 'fire', me.x, me.y, 1.2);
      moveTo(me, n > 0 ? clamp(cx + Math.sin(s.t * 0.02) * 0.12, 0.1, 0.9) : 0.5, n > 0 ? cy + 0.2 : home - 0.15, 0.005);
      const want = Math.atan2(cy - me.y, cx - me.x) + Math.sin(s.t * 0.09) * 0.5;
      me.ang += Math.atan2(Math.sin(want - me.ang), Math.cos(want - me.ang)) * 0.15;
      if (s.t % 6 === 0 && n > 0) {
        const L = 0.34 * K, half = 0.42;
        for (const m of s.foes) {
          if (!hittable(m) || !onScreen(s, m)) continue;
          const dd = dist(me.x, me.y, m.x, m.y), da = Math.atan2(m.y - me.y, m.x - me.x) - me.ang;
          if (dd < L + m.r && Math.abs(Math.atan2(Math.sin(da), Math.cos(da))) < half) hurt(s, m, 3.2 * P, 'fire', aid, Math.cos(me.ang) * 0.002, Math.sin(me.ang) * 0.002);
        }
        if (s.t % 30 === 0) paint(s, me.x + Math.cos(me.ang) * L * 0.6, me.y + Math.sin(me.ang) * L * 0.6, 0.06, R);
        if (s.t % 18 === 0) ev(s, 'breath', me.x, me.y);
      }
      break;
    }
    case 'whale': {
      // 큰 놈 아래로 둥실 다가가 굵은 물줄기를 뿜는다 — 줄기 위의 놈이 밀려난다
      me.z = 0.015 + Math.sin(s.t * 0.05) * 0.006;
      const o = me.st === 1 ? s.foes.find((m) => m.id === me.tgt && hittable(m)) ?? nearest(s, me.x, me.y, 'jet', (m) => (ED[m.k].big ? 0.4 : 0)) : nearest(s, me.x, me.y, 'jet', (m) => (ED[m.k].big ? 0.4 : 0) + (m.st === WIND ? 0.2 : 0));
      if (me.st === 1) {
        me.tm++;
        if (o) {
          const want = Math.atan2(o.y - me.y, o.x - me.x);
          me.ang += Math.atan2(Math.sin(want - me.ang), Math.cos(want - me.ang)) * 0.12;
        }
        if (me.tm % 4 === 0) {
          const L = 0.62 * K, wd = 0.045 * K, c = Math.cos(me.ang), sn = Math.sin(me.ang);
          for (const m of s.foes) {
            if (!hittable(m) || !onScreen(s, m)) continue;
            const ox = m.x - me.x, oy = m.y - m.r * 0.4 - me.y, u = ox * c + oy * sn;
            if (u < 0 || u > L) continue;
            if (Math.abs(-ox * sn + oy * c) <= wd + m.r * 0.7) hurt(s, m, 4.4 * P, 'jet', aid, c * 0.006, sn * 0.006);
          }
          if (me.tm % 16 === 0) paint(s, me.x + c * L * 0.5, me.y + sn * L * 0.5, 0.05, B);
        }
        if (me.tm >= 40) (me.st = 0), (me.cool = 34);
        break;
      }
      if (o) moveTo(me, clamp(o.x, 0.1, 0.9), clamp(o.y + 0.28, s.camY + 0.5, s.camY + 1.24), 0.0042);
      else moveTo(me, 0.5, home, 0.003);
      if (o && me.cool <= 0 && dist(o.x, o.y, me.x, me.y) < 0.6) (me.st = 1), (me.tm = 0), (me.tgt = o.id), (me.ang = Math.atan2(o.y - me.y, o.x - me.x)), ev(s, 'jet', me.x, me.y);
      break;
    }
    case 'narwhal': {
      // 아래쪽에서 파도를 타고, 큰 파도를 위로 굴려 보낸다 (파도는 줄 선 놈을 다 쓸어 간다)
      me.z = 0.02;
      moveTo(me, 0.5 + Math.sin(s.t * 0.018) * 0.28, home + 0.04, 0.005);
      if (me.cool <= 0) (me.cool = 78), s.waves.push({ y: me.y, t: 0, aid: ++s.aid, hit: [], big: false }), ev(s, 'wave', me.x, me.y);
      break;
    }
    case 'bird': {
      // 도둑들 둘레를 휙휙 돌며 찌릿 — 번개가 적에서 적으로 튕긴다
      const [cx, cy] = densest(s, 0.25, 'chain', me.x, me.y, 1.2);
      const a = s.t * 0.045, ox = clamp(cx + Math.cos(a) * 0.2, 0.08, 0.92), oy = clamp(cy + 0.18 + Math.sin(a) * 0.1, s.camY + 0.3, s.camY + 1.24);
      moveTo(me, ox, oy, 0.008);
      me.z = 0.012 + Math.abs(Math.sin(s.t * 0.2)) * 0.012;
      if (me.cool <= 0 && nearest(s, me.x, me.y, 'chain')) {
        me.cool = 26;
        if (chain(s, me.x, me.y - 0.03, 5, 11 * P, 0.34 * K, ++s.aid)) ev(s, 'chain', me.x, me.y);
      }
      break;
    }
    case 'eagle': {
      // 높이 떠서 날개를 펴면 하늘에서 벼락이 쏟아진다
      me.z = 0.075 + Math.sin(s.t * 0.05) * 0.01;
      moveTo(me, 0.5 + Math.sin(s.t * 0.015) * 0.3, home - 0.18 + Math.sin(s.t * 0.03) * 0.06, 0.004);
      if (me.cool <= 0 && nearest(s, me.x, me.y, 'bolt')) {
        me.cool = 32;
        const id = ++s.aid;
        for (let i = 0; i < 3; i++) s.q.push({ t: s.t + i * 5, k: 'bolt', x: 0, y: 0, r: 0.055 * K, dmg: 22 * P, aid: id, id: 0 });
        ev(s, 'flap', me.x, me.y);
      }
      break;
    }
    case 'octo': {
      // 붐비는 곳 가까이 떠다니며 독구름을 휙휙 던진다 (구름은 한동안 남고 방패도 뚫는다)
      me.z = 0.01 + Math.sin(s.t * 0.07) * 0.006;
      const [cx, cy, n] = densest(s, 0.1 * K, 'poison', me.x, me.y, 1.2);
      moveTo(me, n > 0 ? cx : 0.5, n > 0 ? cy + 0.2 : home, 0.0042);
      if (me.cool <= 0 && n > 0 && !s.clouds.some((c) => dist(c.x, c.y, cx, cy) < c.r * 0.7 && c.T - c.t > 60)) {
        me.cool = 44;
        s.shots.length < SHOT_CAP && s.shots.push({ x: me.x, y: me.y - 0.04, vx: (cx - me.x) / 14, vy: (cy - me.y + 0.04) / 14, r: 0.02, u: 0, t: 14, k: 20, mine: true, aid: ++s.aid });
        ev(s, 'throw', me.x, me.y);
      }
      break;
    }
    case 'turtle': {
      // 단단한 놈 쪽으로 엉금엉금, 높이 뛰어 쿵! 내려찍는다 (껍데기가 깨진다)
      if (me.st === 1) {
        const q = ++me.tm / me.legs;
        me.x = me.lx + (me.tx - me.lx) * q;
        me.y = me.ly + (me.ty - me.ly) * q;
        me.z = Math.sin(q * Math.PI) * 0.16 * (q < 0.5 ? 1 : 1 + (q - 0.5) * 0.4);
        if (me.tm >= me.legs) {
          me.st = 0;
          me.z = 0;
          me.cool = 46;
          blast(s, me.x, me.y, 0.14 * K, 30 * P, 'slam', ++s.aid, 0.02);
          paint(s, me.x, me.y, 0.09 * K, 5);
          ev(s, 'slam', me.x, me.y, 0, 0.14 * K);
        }
        break;
      }
      const [cx, cy, n] = densest(s, 0.13 * K, 'slam', me.x, me.y, 0.7);
      if (me.cool <= 0 && n > 0) (me.st = 1), (me.tm = 0), (me.lx = me.x), (me.ly = me.y), (me.tx = clamp(cx, 0.07, 0.93)), (me.ty = clamp(cy + 0.03, s.camY + 0.26, s.camY + 1.25)), (me.legs = 22), (me.face = me.tx > me.x ? 1 : -1), ev(s, 'hop', me.x, me.y);
      else moveTo(me, n > 0 ? cx : 0.5, n > 0 ? cy + 0.16 : home, 0.0025);
      break;
    }
    case 'snake': {
      // 구불구불 기어 다니며 덩굴을 휙 — 빠른 놈부터 꽁꽁 묶고 조인다
      const o = nearest(s, me.x, me.y, 'vine', (m) => (ED[m.k].fast ? 0.3 : 0) + (m.bind > 0 ? -0.3 : 0));
      const wig = Math.sin(s.t * 0.12) * 0.004;
      if (o) moveTo(me, o.x + wig * 20, o.y + 0.14, 0.0055);
      else moveTo(me, 0.5, home, 0.004);
      me.ang = Math.sin(s.t * 0.12);
      if (me.cool <= 0 && o) {
        me.cool = 40;
        const id = ++s.aid;
        const list = s.foes.filter((m) => hittable(m) && onScreen(s, m) && m.bind <= 30 && !ED[m.k].boss && dist(m.x, m.y, me.x, me.y) < 0.36 * K).sort((a, b) => (ED[b.k].fast ? 1 : 0) - (ED[a.k].fast ? 1 : 0) || dist(a.x, a.y, me.x, me.y) - dist(b.x, b.y, me.x, me.y));
        for (const m of list.slice(0, 3)) vineHit(s, m, 9 * P, id);
        const boss = bossOf(s);
        if (boss && dist(boss.x, boss.y, me.x, me.y) < 0.45) vineHit(s, boss, 9 * P, id);
        if (list.length) ev(s, 'lash', me.x, me.y, list.length);
      }
      // 묶인 놈은 조인다
      if (s.t % 10 === 0) for (const m of s.foes) if (m.bind > 0 && hittable(m)) hurt(s, m, 1.4 * P, 'vine', aid);
      break;
    }
    case 'golem': {
      // 쿵쿵쿵 세 번(첫 쿵은 변신할 때) 하고 와르르 — 하얀 정령으로
      me.tm++;
      moveTo(me, 0.5, home - 0.1, 0.003);
      if (me.tm === 50 || me.tm === 100) stomp(s, ++s.aid, me.tm / 50 + 1);
      if (me.tm >= 150 + 20 * (me.tier - 1)) fade(s);
      else if (me.tier > 1 && me.tm === 150) stomp(s, ++s.aid, 4);
      break;
    }
    case 'rainbow': {
      // 무지개 고래가 온 화면을 크게 두 번 휩쓴다
      me.tm++;
      const q = me.tm / 160, a = q * TAU * 1.5;
      const px = 0.5 + Math.sin(a) * 0.38, py = s.camY + 0.75 + Math.sin(a * 2) * 0.38;
      me.face = Math.cos(a) > 0 ? 1 : -1;
      me.x += (px - me.x) * 0.25;
      me.y += (py - me.y) * 0.25;
      me.z = 0.05;
      if (s.t % 4 === 0) {
        for (const m of s.foes) if (hittable(m) && dist(m.x, m.y, me.x, me.y) < 0.13 * K + m.r && s.t - m.hurtT > 16) hurt(s, m, 40 * P, 'rain', aid, 0, -0.01);
        if (s.t % 8 === 0) paint(s, me.x, me.y, 0.07, [R, B, Y, 3, 5, 6][(s.t >> 3) % 6]);
      }
      if (me.tm >= 165) fade(s);
      break;
    }
  }
  // 큰 붓(장 끝 선물): 지나간 자리를 칠하고, 그 자리의 도둑이 아야
  if (s.perk[0] === 1 && f !== 'white' && s.t % 8 === 0) {
    paint(s, me.x, me.y + 0.01, 0.04, me.mask === RAIN ? R : me.mask || R);
    for (const m of s.foes) if (hittable(m) && dist(m.x, m.y, me.x, me.y) < 0.09 + m.r) hurt(s, m, 4 * P, 'pop', aid);
  }
  me.x = clamp(me.x, 0.06, 0.94);
  me.y = clamp(me.y, s.camY + 0.24, s.camY + 1.27);
}
function shoot(s: SoulState, x: number, y: number, vx: number, vy: number, r: number, u: number, t: number, mine: boolean, k: number, aid = 0) {
  if (s.shots.length >= SHOT_CAP) return;
  s.shots.push({ x, y, vx, vy, r, u, t: t * 10, k, mine, aid });
}

// ───────────────────────────── 도둑의 몸짓 ─────────────────────────────
function foeStep(s: SoulState, m: Foe) {
  const d = ED[m.k], me = s.me, ez = EZ[s.stage];
  m.life++;
  if (m.held) return;
  if (d.boss) return bossStep(s, m);
  if (m.st === ENTER) {
    m.y += 0.0055;
    m.walkT = s.t;
    if (m.y >= s.camY + TOP + 0.06 + m.r) m.st = IDLE;
    return;
  }
  if (m.bind > 0) return void m.bind--;
  if (m.stun > 0) return void m.stun--;
  if (m.cool > 0) m.cool -= ez;
  const dd = dist(m.x, m.y, me.x, me.y), a = Math.atan2(me.y - m.y, me.x - m.x);
  const walk = (ang: number, v: number) => {
    m.x += Math.cos(ang) * v;
    m.y += Math.sin(ang) * v;
    if (Math.abs(Math.cos(ang)) > 0.2) m.face = Math.cos(ang) > 0 ? 1 : -1;
    m.walkT = s.t;
  };
  if (!s.awake) {
    // 첫 톡 전: 훔친 색을 들고 저희끼리 신나서 빙글빙글 (아무도 다치지 않는다)
    const wa = s.t * 0.03 + m.seed;
    m.x = m.hx + Math.cos(wa) * 0.02;
    m.y = m.hy + Math.sin(wa * 1.3) * 0.012;
    m.walkT = s.t;
    if (s.t > 330) s.awake = true;
    return;
  }
  const spd = d.spd * ez * (m.champ ? 0.7 : 1);
  const meZ = me.z > 0.05;
  switch (m.k) {
    case 'blob':
    case 'rainbow': {
      if (m.k === 'rainbow') {
        // 무지개 도둑: 정령에게서 달아나다 9초가 지나면 위로 쏙 사라진다
        walk(a + Math.PI + Math.sin(s.t * 0.05 + m.seed) * 0.8, spd * (dd < 0.35 ? 1.2 : 0.5));
        if (m.life > 540) (m.dead = true), ev(s, 'escape', m.x, m.y - m.r);
        break;
      }
      if (m.st === REST) {
        if (--m.tm <= 0) m.st = IDLE;
        walk(a + Math.PI, spd * 0.4);
        break;
      }
      walk(a + Math.sin(s.t * 0.06 + m.seed) * 0.6, spd);
      if (dd < m.r + meR(s) * 0.8 && !meZ && m.cool <= 0) {
        m.cool = 70;
        m.st = REST;
        m.tm = 30;
        hitMe(s, 1, m.x, m.y);
        ev(s, 'bump', m.x, m.y);
      }
      break;
    }
    case 'bucket': {
      if (m.st === WIND) {
        if (--m.tm <= 0) {
          m.st = REST;
          m.tm = 90;
          const r = 0.1 * (m.champ ? 1.3 : 1);
          ev(s, 'bslam', m.ax, m.ay, 0, r);
          if (dist(me.x, me.y, m.ax, m.ay) < r + meR(s) * 0.6 && me.z < 0.05) hitMe(s, 3, m.ax, m.ay);
          for (const o of s.foes) if (o !== m && hittable(o) && !ED[o.k].big && !ED[o.k].air && dist(o.x, o.y, m.ax, m.ay) < r) o.stun = Math.max(o.stun, 30);
        }
        break;
      }
      if (m.st === REST) {
        if (--m.tm <= 0) m.st = IDLE;
        break;
      }
      if (dd < 0.2 && m.cool <= 0) {
        m.st = WIND;
        m.tm = Math.round(56 / Math.max(0.6, ez));
        m.ax = me.x;
        m.ay = me.y;
        m.cool = 120;
        ev(s, 'wind', m.x, m.y, 0, 0, 0, m.k);
      } else walk(a, spd);
      break;
    }
    case 'kite':
    case 'balloon': {
      // 하늘: 화면 위쪽 반을 흔들흔들 날아다니며 먹물·물감 폭탄을 떨군다
      const hy = s.camY + (m.k === 'kite' ? 0.38 : 0.5) + Math.sin(m.seed) * 0.1;
      const tx = clamp(me.x + Math.sin(s.t * 0.012 + m.seed) * 0.35, 0.08, 0.92);
      m.x += clamp(tx - m.x, -spd, spd);
      m.y += clamp(hy + Math.sin(s.t * 0.04 + m.seed) * 0.04 - m.y, -spd, spd);
      m.face = tx > m.x ? 1 : -1;
      m.walkT = s.t;
      if (m.cool <= 0) {
        m.cool = m.k === 'kite' ? 150 : 170;
        const sp = 0.0065 * ez, an = Math.atan2(me.y - m.y, me.x - m.x);
        shoot(s, m.x, m.y + 0.02, Math.cos(an) * sp, Math.sin(an) * sp, 0.022, 1, 22, false, m.k === 'kite' ? 1 : 2);
        ev(s, 'drop', m.x, m.y);
      }
      break;
    }
    case 'crayon': {
      if (m.st === WIND) {
        if (--m.tm <= 0) {
          m.st = REST;
          m.tm = 60;
          ev(s, 'poke', m.x, m.y, 0, m.ax, m.ay);
          if (dist(me.x, me.y, m.ax, m.ay) < 0.06 + meR(s) * 0.6 && !meZ) hitMe(s, 1, m.x, m.y);
        }
        break;
      }
      if (m.st === REST) {
        if (--m.tm <= 0) m.st = IDLE;
        break;
      }
      if (dd < 0.15 && m.cool <= 0) (m.st = WIND), (m.tm = 32), (m.ax = me.x), (m.ay = me.y), (m.cool = 100), ev(s, 'wind', m.x, m.y, 0, 0, 0, m.k);
      else walk(dd < 0.5 ? a : Math.PI / 2 + Math.sin(s.t * 0.02 + m.seed) * 0.2, spd);
      break;
    }
    case 'shell': {
      walk(a, spd);
      if (m.cool <= 0 && dd < 0.6) {
        m.cool = 150;
        const sp = 0.006 * ez;
        shoot(s, m.x, m.y - 0.02, Math.cos(a) * sp, Math.sin(a) * sp, 0.02, 1, 24, false, 3);
        ev(s, 'spit', m.x, m.y);
      }
      if (dd < m.r + meR(s) * 0.7 && !meZ && m.cool < 100) (m.cool = 150), hitMe(s, 1, m.x, m.y);
      break;
    }
    case 'brush': {
      // 붓 도깨비: 잠깐 서 있다가 정령 곁으로 휙! (부딪히면 아야)
      if (m.st === ATK) {
        walk(m.ang, 0.013 * ez);
        if (dd < m.r + meR(s) * 0.7 && !meZ) (m.st = REST), (m.tm = 50), hitMe(s, 1, m.x, m.y);
        if (--m.tm <= 0) (m.st = REST), (m.tm = 46);
        break;
      }
      if (m.st === REST) {
        if (--m.tm <= 0) m.st = IDLE;
        walk(s.t * 0.1 + m.seed, spd * 0.3);
        break;
      }
      if (m.cool <= 0 && dd < 0.6) {
        const ox = me.x + Math.cos(m.seed + s.t) * 0.05, oy = me.y + Math.sin(m.seed) * 0.05;
        m.ang = Math.atan2(oy - m.y, ox - m.x);
        m.st = ATK;
        m.tm = Math.round(Math.min(40, dd / 0.013 + 6));
        m.cool = 90;
        ev(s, 'zip', m.x, m.y);
      } else walk(a + Math.sin(s.t * 0.1 + m.seed) * 1.2, spd);
      break;
    }
    case 'tower': {
      // 먹물 굴뚝: 제자리에서 먹물 꼬마를 뿜는다
      if (m.cool <= 0) {
        m.cool = 170;
        if (s.foes.filter(alive).length < CAP - 2) {
          const b = add(s, 'blob', m.x + (s.rng() - 0.5) * 0.08, m.y + m.r * 0.6, pickCol(s, STAGES[s.stage].cols), false);
          b.vy = 0.01;
          ev(s, 'puff', m.x, m.y - m.r * 1.6);
        }
      }
      break;
    }
  }
}
function bossStep(s: SoulState, m: Foe) {
  const me = s.me, d = STAGES[s.stage], ez = EZ[s.stage];
  m.walkT = s.t;
  m.x = 0.5 + Math.sin(s.t * 0.012) * 0.06;
  if (!s.awake) return;
  if (m.stun > 0) return void m.stun--;
  // 졸개 부르기
  const minions = s.foes.filter((o) => alive(o) && !ED[o.k].boss).length;
  if (--s.summonT <= 0 || minions < 3) {
    s.summonT = 260;
    if (minions < 9 && d.summon) {
      spawnGroup(s, { at: 0, f: d.summon, form: 0 }, false);
      ev(s, 'summon', m.x, m.y - m.r * s.bossK);
    }
  }
  // 큰 공격: 빨간 표시 뒤 쿵 · 먹물 공 다섯 · 먹물 물결
  if (s.bossAtk > 0) {
    if (--s.bossAtk === 0) {
      const k = m.tm;
      if (k === 0) {
        ev(s, 'bslam', m.ax, m.ay, 1, 0.13);
        if (dist(me.x, me.y, m.ax, m.ay) < 0.13 + meR(s) * 0.6 && me.z < 0.05) hitMe(s, 3, m.ax, m.ay);
      } else if (k === 1) {
        for (let i = -2; i <= 2; i++) {
          const an = Math.atan2(me.y - m.y, me.x - m.x) + i * 0.22;
          shoot(s, m.x, m.y - m.r * 0.3 * s.bossK, Math.cos(an) * 0.007 * ez, Math.sin(an) * 0.007 * ez, 0.026, 1, 30, false, 4);
        }
        ev(s, 'spit', m.x, m.y, 5);
      } else {
        ev(s, 'inkwave', 0.5, m.ay, 0, 0.05);
        if (Math.abs(me.y - m.ay) < 0.05 + meR(s) * 0.5 && me.z < 0.05) hitMe(s, 2, me.x, m.ay - 0.1);
      }
    }
    return;
  }
  if (++s.bossT >= 170) {
    s.bossT = 0;
    m.tm = (m.tm + 1) % 3;
    s.bossAtk = Math.round(60 / Math.max(0.7, ez));
    m.ax = me.x;
    m.ay = me.y;
    ev(s, 'wind', m.x, m.y, m.tm, 0, 0, m.k);
  }
}

// ───────────────────────────── 물리 · 총알 · 구름 · 파도 ─────────────────────────────
function physics(s: SoulState) {
  const L = s.foes;
  for (const m of L) {
    if (m.dead || m.held || ED[m.k].boss) continue;
    if (m.vx || m.vy) {
      m.x += m.vx;
      m.y += m.vy;
      m.vx *= 0.86;
      m.vy *= 0.86;
      if (Math.abs(m.vx) + Math.abs(m.vy) < 0.0004) m.vx = m.vy = 0;
    }
  }
  for (let i = 0; i < L.length; i++) {
    const a = L[i];
    if (a.dead || a.held || a.st === ENTER || ED[a.k].air) continue;
    for (let j = i + 1; j < L.length; j++) {
      const b = L[j];
      if (b.dead || b.held || b.st === ENTER || ED[b.k].air) continue;
      const dx = b.x - a.x, dy = b.y - a.y, dd = hyp(dx, dy), min = (a.r + b.r) * 0.85;
      if (dd >= min) continue;
      const ux = dd > 1e-5 ? dx / dd : Math.cos(a.seed), uy = dd > 1e-5 ? dy / dd : Math.sin(a.seed), push = (min - dd) * 0.5;
      const wa = ED[a.k].boss || a.k === 'tower' ? 0 : ED[a.k].big ? 0.3 : 1, wb = ED[b.k].boss || b.k === 'tower' ? 0 : ED[b.k].big ? 0.3 : 1;
      if (wa + wb <= 0) continue;
      a.x -= ux * push * (wa / (wa + wb));
      a.y -= uy * push * (wa / (wa + wb));
      b.x += ux * push * (wb / (wa + wb));
      b.y += uy * push * (wb / (wa + wb));
    }
  }
  for (const m of L) {
    if (m.dead || m.st === ENTER || ED[m.k].boss) continue;
    m.x = clamp(m.x, m.r * 0.7, 1 - m.r * 0.7);
    m.y = clamp(m.y, s.camY + TOP + 0.03 + m.r * 0.6, s.camY + BOT - 0.02);
  }
}
function shotStep(s: SoulState) {
  const me = s.me;
  for (const p of s.shots) {
    p.x += p.vx;
    p.y += p.vy;
    p.t--;
    if (p.k === 20) {
      // 문어가 던진 독 주머니: 떨어진 자리에서 구름이 된다
      if (p.t <= 0) addCloud(s, p.x, p.y, 0.11 * reachK(s), 150, p.aid), ev(s, 'cloud', p.x, p.y, 0, 0.11 * reachK(s));
      continue;
    }
    if (p.mine) {
      for (const m of s.foes) {
        if (!hittable(m) || dist(p.x, p.y, m.x, m.y - m.r * 0.5) > p.r + m.r) continue;
        hurt(s, m, p.u, 'spark', p.aid);
        p.t = 0;
        ev(s, 'twinkle', p.x, p.y);
        break;
      }
      continue;
    }
    if (dist(p.x, p.y, me.x, me.y - meR(s) * 0.4 - me.z) < p.r + meR(s) * 0.75) {
      p.t = 0;
      hitMe(s, p.u, p.x, p.y);
      ev(s, 'splat', p.x, p.y, p.k);
    }
  }
  s.shots = s.shots.filter((p) => p.t > 0 && p.y > s.camY - 0.1 && p.y < s.camY + A + 0.1 && p.x > -0.1 && p.x < 1.1);
}
function cloudStep(s: SoulState) {
  const P = powOf(s);
  for (const c of s.clouds) {
    c.t++;
    if (c.t % 10 !== 0) continue;
    for (const m of s.foes) if (hittable(m) && dist(c.x, c.y, m.x, m.y) < c.r + m.r * 0.5) hurt(s, m, 3.4 * P, 'poison', c.aid);
  }
  s.clouds = s.clouds.filter((c) => c.t < c.T);
}
function waveStep(s: SoulState) {
  const P = powOf(s);
  for (const w of s.waves) {
    w.t++;
    w.y -= 0.022;
    for (const m of s.foes) {
      if (!hittable(m) || w.hit.includes(m.id) || ED[m.k].air || Math.abs(m.y - w.y) > 0.04 + m.r) continue;
      w.hit.push(m.id);
      m.stun = Math.max(m.stun, 20);
      hurt(s, m, (w.big ? 32 : 19) * P, 'wave', w.aid, 0, -0.03);
      ev(s, 'surf', m.x, m.y - m.r);
    }
    if (w.t % 12 === 0) paint(s, 0.2 + ((w.t * 37) % 60) / 100, w.y, 0.06, B);
  }
  s.waves = s.waves.filter((w) => w.y > s.camY + TOP - 0.05);
}
function queueStep(s: SoulState) {
  if (!s.q.length) return;
  const due = s.q.filter((q) => q.t <= s.t);
  if (!due.length) return;
  s.q = s.q.filter((q) => q.t > s.t);
  for (const q of due) {
    if (q.k === 'bolt') {
      // 벼락: 하늘 도둑 먼저, 그다음 흩어진(외톨이) 도둑
      let o: Foe | null = null, ov = -1e9;
      for (const m of s.foes) {
        if (!hittable(m) || !onScreen(s, m)) continue;
        let lone = 0;
        for (const n of s.foes) if (n !== m && hittable(n) && dist(n.x, n.y, m.x, m.y) < 0.12) lone++;
        const v = (ED[m.k].air ? 2 : 0) - lone * 0.3 + ((m.seed + s.t) % 7) * 0.05 - (s.t - m.hurtT < 8 ? 3 : 0);
        if (v > ov) (ov = v), (o = m);
      }
      if (!o) continue;
      s.lines.push({ k: 3, x0: o.x, y0: o.y - 0.5, x1: o.x, y1: o.y - o.r * 0.4, t: s.t, id: 0 });
      ev(s, 'bolt', o.x, o.y);
      for (const m of s.foes) if (hittable(m) && dist(m.x, m.y, o.x, o.y) < q.r + m.r * 0.5) hurt(s, m, q.dmg, 'bolt', q.aid);
      paint(s, o.x, o.y, 0.045, Y);
    }
  }
}

// ───────────────────────────── 판 흐름 ─────────────────────────────
function clearStage(s: SoulState) {
  const d = STAGES[s.stage];
  s.phase = 'result';
  s.pt = 0;
  const third = d.star.k === 'multi' ? s.best >= d.star.n : d.star.k === 'form' ? (s.multi[-1] ?? 0) >= d.star.n : s.stageT <= d.star.n * 60;
  s.starOk = [true, !s.lostHeart, third];
  s.got = s.starOk.filter(Boolean).length;
  s.stars += s.got;
  s.gain = (s.sp + CLEAR_PTS + Math.round(s.pct * 40)) * STAR_MUL[s.got];
  s.pts += s.gain;
  s.sp = 0;
  s.villages[s.stage] = Math.max(s.villages[s.stage] ?? 0, s.pct);
  s.lv++;
  see(s, 'lv' + s.lv);
  s.spot = null;
  if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * 30);
  ev(s, 'clear', 0.5, s.camY + 0.6, s.got);
}
function advance(s: SoulState) {
  const d = STAGES[s.stage];
  if (s.won) return void ((s.phase = 'end'), (s.pt = 0), ev(s, 'end', 0.5, s.camY + 0.6, 1));
  if (d.boss && d.ch < PERKS.length && !s.perk[d.ch]) return void ((s.phase = 'pick'), (s.pt = 0), (s.picked = -1), see(s, 'pick' + d.ch), ev(s, 'pickopen', 0.5, s.camY + 0.6));
  s.stage++;
  newStage(s);
}
function playStep(s: SoulState) {
  const d = STAGES[s.stage], me = s.me;
  s.stageT++;
  if (s.rest > 0) s.rest--;
  if (s.eat) eatStep(s);
  else myStep(s);
  // 카메라: 골목을 따라 위로 (붐비면 멈추고, 적이 모자라면 빨리)
  const vis = s.foes.reduce((a, m) => a + (alive(m) && onScreen(s, m) && m.k !== 'tower' ? 1 : 0), 0);
  const prog = -s.camY;
  if (s.awake && prog < d.D) {
    const v = vis >= CAM_STOP ? 0 : vis < 3 && s.gi < d.groups.length ? CAM_V * 3 : CAM_V * (1 - vis / (CAM_STOP + 2));
    const dy = Math.min(v, d.D - prog);
    s.camY -= dy;
    if (!s.eat) me.y -= dy;
  }
  // 떼: 카메라가 그 자리를 지나면 위에서 내려온다
  while (s.gi < d.groups.length && -s.camY >= d.groups[s.gi].at * d.D - 1e-9 && !(d.groups[s.gi].at >= 1 && -s.camY < d.D - 1e-9)) spawnGroup(s, d.groups[s.gi++], false);
  for (const m of s.foes) if (!m.dead) foeStep(s, m);
  physics(s);
  shotStep(s);
  cloudStep(s);
  waveStep(s);
  queueStep(s);
  if (s.phase !== 'play') return;
  if (s.foes.some((m) => m.dead)) s.foes = s.foes.filter((m) => !m.dead);
  const left = s.foes.length + (d.groups.length - s.gi);
  if (-s.camY >= d.D - 1e-9 && left === 0 && !s.eat && (!d.boss || s.bossDown)) {
    if (++s.clearT >= 50) clearStage(s);
  } else s.clearT = 0;
  if (s.multi && s.aid % 64 === 0) for (const k of Object.keys(s.multi)) if (+k > 0 && +k < s.aid - 40) delete s.multi[+k];
}

const game: GameDef<SoulState> & { wows(s: SoulState): number } = {
  id: 'colorsoul',
  name: '🎨 색 먹는 정령',
  genes: ['colorsoul', 'chain', 'collect'],
  twist: '적은 쓰러뜨릴 것이 아니라 먹을 색 — 톡 한 도둑의 색을 빨아들이면 그 색의 짐승이 되고, 같은 색은 커지고 다른 색은 섞여 새 모습',
  rules: [
    '색 도둑을 톡 하면 정령이 그 색을 쭉 — 그 색의 짐승이 돼요. 싸움은 저절로.',
    '같은 색은 더 커지고(셋이면 2단계), 다른 색은 섞여 새 모습. 머리 위 그림이 될 모습.',
    '하얀 맨몸일 때 맞으면 하트 -1. 골목 끝까지 색을 되찾으면 다음 판!',
  ],
  controls: 'touch',
  hint: '색 도둑을 톡 — 그 색을 먹고 그 색의 짐승으로 변신 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '색을 도둑맞은 회색 그림책 마을 — 크레파스 그림책',
    mood: '회색 연필 선만 남은 그림책 골목에 먹물 도둑들이 훔친 물감을 들고 내려온다. 작은 하얀 정령이 색을 쭉 빨아들이면 불 사자·물 고래·번개 새로 펑 변신하고, 싸운 자리마다 물감이 쏟아져 마을이 다시 알록달록해진다.',
    palette: { bg: '#f3efe6', ink: '#3a3550', muted: '#8f88a6', accent: '#ff7a59', hot: '#ff4a6e', soft: '#fff6e0' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.hearts,
  cleared: (s) => (s.phase === 'result' ? { stage: s.stage, got: s.got, of: 3 } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, stageT: 0, hearts: 3, tries: 3, pts: 0, sp: 0, stars: 0, got: 0, starOk: [false, false, false], dead: false, won: false,
      lv: 1, perk: [0, 0], picked: -1, dex: [], newDex: [], seenForm: [], me: blankMe(), eat: null, rest: 0,
      foes: [], nid: 0, shots: [], clouds: [], waves: [], q: [], lines: [], paints: [], events: [],
      camY: 0, gi: 0, awake: false, tapped: false, taps: 0, clearT: 0, lostHeart: false, aid: 0, multi: {}, best: 0, fkills: 0, kills: 0, gain: 0,
      patches: [], bossK: 1, bossT: 0, summonT: 0, bossDown: false, bossAtk: 0, grid: new Uint8Array(1), gridRows: 1, painted: 0, pct: 0, villages: [],
      freeze: 0, down: false, wowN: 0, firstTap: -1, firstBig: -1, denyT: -99, seen: new Set<string>(), banner: null, spot: null, big: null,
    } as SoulState;
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
        if (s.picked >= 0) (s.perk[ch] = s.picked + 1), (s.pt = 0), see(s, `perk${ch}${s.picked}`), ev(s, 'perk', s.picked ? 0.72 : 0.28, s.camY + 0.86, s.picked);
      } else if (s.pt >= PICK_AFTER) (s.stage++), newStage(s);
    } else if (s.phase === 'fail') {
      if ((tap && s.pt >= 40) || s.pt >= FAIL_T) (s.hearts = 3), newStage(s), ev(s, 'retry', 0.5, s.camY + 0.6);
    } else if (s.pt >= END_T) s.dead = true;
    if (s.events.length > 100) s.events.splice(0, s.events.length - 100);
    while (s.events.length && s.t - s.events[0].t > 120) s.events.shift();
    if (s.lines.length) s.lines = s.lines.filter((l) => s.t - l.t < (l.k === 2 ? 40 : 14));
    if (s.spot && s.t - s.spot.t > 240 && !s.spot.label.startsWith('헐거')) s.spot = null;
  },
  over: (s) => s.dead,
  score: (s) => s.pts + s.sp,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const colorsoul = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, sy: number): Input => ({ tap: false, dir: 0, pointer: { x: clamp(x, 0, 1), y: clamp(sy / A, 0, 1) } });
const tapFoe = (s: SoulState, m: Foe) => at(m.x, m.y - m.r * 0.5 - s.camY);
const free = (s: SoulState) => s.phase === 'play' && !s.down && !s.eat && s.rest <= 0;
/** 결과 화면·둘 중 하나·실패는 버릇 봇도 그냥 넘긴다 */
function between(s: SoulState, left: boolean): Input | null {
  if (s.phase === 'play') return null;
  if (s.down) return NO;
  if (s.phase === 'result') return s.pt >= RES_MIN ? at(0.5, 1.2) : NO;
  if (s.phase === 'pick') return s.picked < 0 && s.pt >= PICK_MIN ? at(left ? 0.28 : 0.72, 0.86) : NO;
  if (s.phase === 'fail') return s.pt >= 40 ? at(0.5, 0.8) : NO;
  return NO;
}
interface Cand { m: Foe; patch: number; col: number; bonus: number; x: number; y: number }
function cands(s: SoulState): Cand[] {
  const out: Cand[] = [];
  const b = bossOf(s);
  if (b) s.patches.forEach((p, i) => p.loose && !p.gone && out.push({ m: b, patch: i, col: p.col, bonus: 1, x: patchXY(s, b, p)[0], y: patchXY(s, b, p)[1] }));
  for (const m of s.foes) if (hittable(m) && !ED[m.k].boss && onScreen(s, m)) out.push({ m, patch: -1, col: m.col, bonus: m.champ ? 1 : 0, x: m.x, y: m.y });
  return out;
}
const tapCand = (s: SoulState, c: Cand) => (c.patch >= 0 ? at(c.x, c.y - s.camY) : tapFoe(s, c.m));
/** 이 모습이 지금 화면의 도둑들에게 얼마나 먹히나 (큰 놈·단단한 놈일수록 무겁게) */
function fit(s: SoulState, f: FK): number {
  if (f === 'white') return 0;
  const ak = FD[f].ak;
  let v = 0, n = 0;
  for (const m of s.foes) {
    if (!hittable(m) || !onScreen(s, m)) continue;
    const wgt = ED[m.k].boss ? 4 : clamp((m.hp + m.arm) / 30, 0.4, 3);
    v += worth(m, ak) * wgt;
    n++;
  }
  if (ak === 'pounce' || ak === 'fire' || ak === 'slam' || ak === 'poison') v += 0.12 * densest(s, 0.13, ak, s.me.x, s.me.y, 1.2)[2];
  if (f === 'golem' || f === 'rainbow' || f === 'narwhal' || f === 'eagle' || f === 'dragon') v *= 1.15;
  return n ? v : 0;
}
const BURST_R: Record<FK, number> = { white: 0, lion: 0.17, dragon: 0.3, whale: 0.15, narwhal: 0.5, bird: 0.36, eagle: 0.6, octo: 0.2, turtle: 0.2, snake: 0.27, golem: 1, rainbow: 1 };
/** 먹는 순간 터질 수 (어림) */
function burstEst(s: SoulState, f: FK, x: number, y: number, tier: number): number {
  const ak = FD[f].ak, r = BURST_R[f] * (1 + 0.08 * (tier - 1));
  let n = 0;
  for (const m of s.foes) if (hittable(m) && onScreen(s, m) && dist(m.x, m.y, x, y) < r) n += Math.min(1, worth(m, ak) * (30 / Math.max(10, m.hp + m.arm)));
  return n;
}
/** 봇: 지금 화면에 맞는 모습 + 섞기·이어 먹기 이득을 셈해서 고른다 */
export const colorsoulSmart: Bot<SoulState> = {
  name: '지금 맞는 모습을 골라 먹기',
  act(s) {
    const mid = between(s, true);
    if (mid) return mid;
    if (!free(s)) return NO;
    const me = s.me, d = STAGES[s.stage], list = cands(s);
    if (!list.length) return NO;
    const need = d.star.k === 'form' && (s.multi[-1] ?? 0) < d.star.n ? d.star.f : null;
    const curFit = me.f === 'white' ? -9 : fit(s, me.f) * (1 + 0.12 * (me.tier - 1)) * (me.T > 110 ? 1 : 0.4) + (need && me.f === need ? 4 : 0);
    let best: Cand | null = null, bv = -1e9;
    const fits = new Map<string, number>();
    for (const c of list) {
      const res = mixRes(s, c.col, c.bonus), key = res.f + res.tier;
      let fv = fits.get(key);
      if (fv === undefined) fits.set(key, (fv = fit(s, res.f) * (1 + 0.12 * (res.tier - 1))));
      let v = fv + 0.7 * burstEst(s, res.f, c.x, c.y, res.tier);
      if (need) v += res.f === need ? 5 : me.f === need ? -5 : 0;
      if (!s.dex.includes(res.f)) v += 1.5;
      if (c.patch >= 0) v += 8;
      if (c.m.k === 'rainbow') v += 4;
      if (res.f === me.f) v += 0.6;
      v -= dist(me.x, me.y, c.x, c.y) * 2.2;
      if (v > bv) (bv = v), (best = c);
    }
    if (!best) return NO;
    if (me.f === 'white' || best.patch >= 0 || me.T < 110 || bv > curFit + 0.4) return tapCand(s, best);
    return NO;
  },
};
/** 봇: 아무 때나 아무 데나 톡 */
export const colorsoulRandom: Bot<SoulState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    if (s.down) return NO;
    return rng() < 1 / 40 ? at(0.06 + rng() * 0.88, 0.16 + rng() * 1.12) : NO;
  },
};
/** 버릇 봇: 쉴 때마다 늘 가장 가까운 도둑 */
export const colorsoulHabit: Bot<SoulState> = {
  name: '버릇: 늘 가장 가까운 도둑',
  act(s) {
    const mid = between(s, true);
    if (mid) return mid;
    if (!free(s)) return NO;
    let best: Cand | null = null, bd = 1e9;
    for (const c of cands(s)) if (dist(s.me.x, s.me.y, c.x, c.y) < bd) (bd = dist(s.me.x, s.me.y, c.x, c.y)), (best = c);
    return best ? tapCand(s, best) : NO;
  },
};
/** 독립 버릇 봇: 늘 빨강만 (빨강이 없으면 가장 가까운 것) — 한 색만 고르는 버릇 */
export const colorsoulHabit2: Bot<SoulState> = {
  name: '버릇: 늘 빨강만',
  act(s) {
    const mid = between(s, false);
    if (mid) return mid;
    if (!free(s)) return NO;
    let best: Cand | null = null, bv = 1e9;
    for (const c of cands(s)) {
      const v = dist(s.me.x, s.me.y, c.x, c.y) + (c.col === R ? 0 : 5);
      if (v < bv) (bv = v), (best = c);
    }
    return best ? tapCand(s, best) : NO;
  },
};
/** 측정·스크린샷용: k판으로 건너뛰기 */
export const __jump = (s: SoulState, k: number, lv = k + 1, perk: number[] = [k > 3 ? 2 : 0, k > 7 ? 2 : 0]) => ((s.stage = k), (s.lv = lv), (s.perk = perk), (s.tapped = true), newStage(s));

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
function drawAll(ctx: C2, s: SoulState, w: number, h: number, _th: Theme) {
  const fx = juice(s);
  ctx.fillStyle = '#ddd';
  ctx.fillRect(0, 0, w, h);
  for (const m of s.foes) {
    ctx.fillStyle = CHEX[m.col][0];
    ctx.beginPath();
    ctx.arc(m.x * w, (m.y - s.camY) * w, m.r * w, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = CHEX[s.me.mask][0];
  ctx.beginPath();
  ctx.arc(s.me.x * w, (s.me.y - s.camY) * w, meR(s) * w, 0, TAU);
  ctx.fill();
  fx.memo.t = s.t;
}
