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
import type { SfxName } from '../sfx.ts';

const A = 1.5, TAU = Math.PI * 2;
/** 판 띠(화면 y, 가로 폭 = 1): 위 HUD 아래 ~ 아래 HUD 위 · 정령이 머무는 높이 */
const TOP = 0.1, BOT = 1.31, HOME_SY = 0.88, ME_TOP = 0.68, ME_BOT = 1.03;
/** 카메라: 빠르기 · 이만큼 붐비면 멈춤 · 적이 모자라면 빨리 */
const CAM_V = 0.0011, CAM_STOP = 10;
/** 한 화면 상한: 적 · 총알 · 독구름 */
const CAP = 24, SHOT_CAP = 110, CLOUD_CAP = 10;
/** 톡: 날아가기(최소) · 빨기 · 쉼 (틱) */
const DASH_MIN = 7, SUCK_T = 18, REST_T = 30;
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
/** r = 그림 크기(몸 반지름) · hr = 맞고 때리는 몸 크기(판의 셈은 이것으로) */
interface FDef { name: string; mask: number; ak: AK; r: number; hr: number; does: string; good: string; z: number }
export const FD: Record<FK, FDef> = {
  white: { name: '하얀 정령', mask: 0, ak: 'spark', r: 0.078, hr: 0.062, does: '반짝 별만 쏴요 — 맞으면 하트 -1', good: '', z: 0.02 },
  lion: { name: '불 사자', mask: R, ak: 'pounce', r: 0.095, hr: 0.068, does: '떼에 뛰어들어 불꽃 펑', good: '떼', z: 0 },
  whale: { name: '물 고래', mask: B, ak: 'jet', r: 0.1, hr: 0.084, does: '물줄기로 큰 놈을 밀어내요', good: '큰 놈', z: 0.015 },
  bird: { name: '번개 새', mask: Y, ak: 'chain', r: 0.082, hr: 0.058, does: '번개가 적에서 적으로 튕겨요', good: '날아다니는 놈', z: 0.012 },
  dragon: { name: '불 용', mask: R, ak: 'fire', r: 0.125, hr: 0.1, does: '하늘을 날며 불을 휩쓸어요', good: '떼 · 하늘', z: 0.07 },
  octo: { name: '독구름 문어', mask: 3, ak: 'poison', r: 0.098, hr: 0.074, does: '독구름은 방패도 뚫어요', good: '방패', z: 0.01 },
  turtle: { name: '용암 거북', mask: 5, ak: 'slam', r: 0.104, hr: 0.078, does: '쿵 내려찍어 단단한 껍데기를 깨요', good: '단단한 놈', z: 0 },
  snake: { name: '덩굴 뱀', mask: 6, ak: 'vine', r: 0.095, hr: 0.066, does: '덩굴로 빠른 놈을 꽁꽁 묶어요', good: '빠른 놈', z: 0 },
  golem: { name: '진흙 골렘', mask: 7, ak: 'quake', r: 0.125, hr: 0.105, does: '쿵쿵쿵! 온 땅이 흔들려요', good: '모두(땅)', z: 0 },
  narwhal: { name: '파도 일각고래', mask: B, ak: 'wave', r: 0.12, hr: 0.1, does: '큰 파도가 줄 선 놈을 쓸어요', good: '줄 선 놈', z: 0.02 },
  eagle: { name: '천둥 독수리', mask: Y, ak: 'bolt', r: 0.12, hr: 0.1, does: '하늘에서 벼락이 쏟아져요', good: '흩어진 놈', z: 0.075 },
  rainbow: { name: '무지개 고래', mask: RAIN, ak: 'rain', r: 0.13, hr: 0.11, does: '온 화면을 무지개로 휩쓸어요', good: '모두', z: 0.05 },
};
/** 도감 차례(되어 본 모습) */
export const DEX: FK[] = ['lion', 'whale', 'bird', 'dragon', 'octo', 'turtle', 'snake', 'golem', 'narwhal', 'eagle', 'rainbow'];
/** 이 판부터 될 수 있다 */
const UNLOCK_AT: Record<FK, number> = { white: 0, lion: 0, whale: 1, bird: 2, dragon: 3, octo: 4, turtle: 5, snake: 6, golem: 7, narwhal: 8, eagle: 9, rainbow: 10 };
/** 공격이 닿는 것: 하늘(날아다니는 놈) · 방패를 뚫음 · 껍데기를 깸 · 빠른 놈을 붙잡음(배수) · 큰 놈(배수) */
const AIR_OK = new Set<AK>(['spark', 'chain', 'fire', 'poison', 'vine', 'bolt', 'rain', 'pop']);
const SHIELD_OK = new Set<AK>(['poison', 'quake', 'rain', 'wave']);
const ARMOR_OK = new Set<AK>(['slam', 'quake', 'rain']);
const FAST_MUL: Record<AK, number> = { spark: 0.4, pounce: 0.2, jet: 0.22, chain: 0.75, fire: 0.4, poison: 0.5, slam: 0.2, vine: 1.7, quake: 1, wave: 0.5, bolt: 0.9, rain: 1, pop: 0.5 };
const BIG_MUL: Record<AK, number> = { spark: 0.4, pounce: 0.45, jet: 2.2, chain: 0.45, fire: 0.6, poison: 0.8, slam: 1.35, vine: 0.5, quake: 1, wave: 1.8, bolt: 1.1, rain: 1, pop: 0.7 };

// ───────────────────────────── 색 도둑 ─────────────────────────────
export type EK = 'blob' | 'bucket' | 'kite' | 'crayon' | 'shell' | 'brush' | 'balloon' | 'tower' | 'rainbow' | 'inkboss' | 'giant' | 'king';
interface EDef { name: string; r: number; hp: number; spd: number; air?: boolean; shield?: boolean; armor?: number; fast?: boolean; big?: boolean; boss?: boolean; line: string }
export const ED: Record<EK, EDef> = {
  blob: { name: '먹물 꼬마', r: 0.034, hp: 10, spd: 0.0034, line: '작고 많아요 — 떼로 몰려와요' },
  bucket: { name: '물감 통 도깨비', r: 0.07, hp: 90, spd: 0.0017, big: true, line: '크고 세요 — 내려찍으면 색을 몽땅 빼앗겨요' },
  kite: { name: '연 도둑', r: 0.046, hp: 16, spd: 0.004, air: true, line: '하늘을 날아요 — 땅 공격이 안 닿아요' },
  crayon: { name: '크레용 병정', r: 0.046, hp: 40, spd: 0.0019, shield: true, line: '방패로 막아요 — 줄지어 행진해요' },
  shell: { name: '굳은 물감 달팽이', r: 0.056, hp: 28, spd: 0.0013, armor: 70, line: '굳은 껍데기는 내려찍어야 깨져요' },
  brush: { name: '붓 도깨비', r: 0.04, hp: 24, spd: 0.0032, fast: true, line: '휙휙 피해요 — 묶어야 잡혀요' },
  balloon: { name: '풍선 도둑', r: 0.042, hp: 14, spd: 0.0015, air: true, line: '풍선 타고 흩어져 물감 폭탄을 떨궈요' },
  tower: { name: '먹물 굴뚝', r: 0.08, hp: 80, spd: 0, armor: 90, big: true, line: '먹물 꼬마를 자꾸 뿜어요 — 단단해요' },
  rainbow: { name: '무지개 도둑', r: 0.042, hp: 20, spd: 0.0046, fast: true, line: '드문 무지개! 놓치면 달아나요' },
  inkboss: { name: '대장 먹물 문어', r: 0.17, hp: 1, spd: 0, big: true, boss: true, line: '큰 놈 — 물줄기에 약해요' },
  giant: { name: '대장 물감 통 거인', r: 0.18, hp: 1, spd: 0, big: true, armor: 1, boss: true, line: '단단해요 — 내려찍기·쿵쿵에 약해요' },
  king: { name: '대장 회색 왕', r: 0.18, hp: 1, spd: 0, big: true, shield: true, boss: true, line: '방패 망토 — 독구름·쿵쿵·파도에 약해요' },
};

// ───────────────────────────── 판 ─────────────────────────────
interface Grp { at: number; f: [EK, number][]; form?: 0 | 1 | 2 | 3; champ?: EK; cols?: number[] }
type Star = { k: 'multi'; n: number; f?: FK } | { k: 'form'; f: FK; n: number; foe?: EK; foeName?: string } | { k: 'time'; n: number };
interface StageDef {
  ch: number; name: string; news: string; unlock: FK | null; newFoe: EK | null; D: number; cols: number[]; groups: Grp[]; star: Star;
  boss?: EK; patches?: number[]; seg?: number; summon?: [EK, number][];
  /** 2단계 짐승 판: 처음부터 뒤쪽에 진한 색 하나 (앞에는 미끼 색) */
  early?: EK;
}
export const CHAPTERS = ['회색 골목 마을', '물감 운하 마을', '구름 위 성 마을'];
const G = (at: number, form: 0 | 1 | 2 | 3, ...f: [EK, number][]): Grp => ({ at, f, form });
/**
 * 판 12개. 골목은 길이 D(가로 폭 단위)만큼 위로 이어지고, 카메라가 지나는 자리마다 떼가 위에서 내려온다(at = 골목 진행 비율).
 * 사람 기준 한 판 30~45초. 판마다 새 모습 하나 + 그 모습이 빛날 도둑 하나.
 */
export const STAGES: StageDef[] = [
  { ch: 0, name: '불 사자', news: '빨강을 먹으면 불 사자! 떼에 뛰어들어 펑', unlock: 'lion', newFoe: 'blob', D: 1.0, cols: [R], star: { k: 'multi', n: 7 },
    groups: [G(0.25, 2, ['blob', 9]), G(0.6, 3, ['blob', 9], ['bucket', 1]), { at: 1, f: [['blob', 7]], form: 3, champ: 'bucket' }] },
  { ch: 0, name: '물 고래', news: '파랑을 먹으면 물 고래! 큰 놈을 물줄기로 밀어내요', unlock: 'whale', newFoe: 'bucket', D: 1.7, cols: [R, B], star: { k: 'form', f: 'whale', n: 10, foe: 'bucket', foeName: '큰 놈' },
    groups: [G(0, 0, ['bucket', 2], ['blob', 4]), G(0.2, 0, ['bucket', 2], ['blob', 4]), G(0.4, 0, ['bucket', 3], ['blob', 3]), G(0.6, 0, ['bucket', 2], ['blob', 5]), G(0.8, 0, ['bucket', 3], ['blob', 3]), { at: 1, f: [['bucket', 1], ['blob', 3]], form: 3, champ: 'bucket' }] },
  { ch: 0, name: '번개 새', news: '노랑을 먹으면 번개 새! 하늘의 도둑도 찌릿', unlock: 'bird', newFoe: 'kite', D: 1.8, cols: [R, B, Y], star: { k: 'form', f: 'bird', n: 21, foe: 'kite', foeName: '연 도둑' },
    groups: [G(0, 0, ['kite', 5], ['blob', 3]), G(0.2, 0, ['kite', 6], ['blob', 2], ['bucket', 1]), G(0.4, 0, ['kite', 4], ['blob', 5]), G(0.6, 0, ['kite', 6], ['blob', 3]), G(0.8, 0, ['kite', 6], ['bucket', 1], ['blob', 2]), { at: 1, f: [['kite', 4], ['blob', 2]], form: 3, champ: 'kite' }] },
  { ch: 0, name: '대장 먹물 문어', news: '빨강 셋을 이어 먹으면 불 용! 대장의 색을 뜯어 먹어요', unlock: 'dragon', newFoe: 'inkboss', D: 0, cols: [R, B, Y], star: { k: 'time', n: 44 },
    boss: 'inkboss', patches: [R, B, R, Y], seg: 260, summon: [['blob', 5], ['kite', 2], ['bucket', 1]],
    groups: [G(0, 2, ['blob', 6], ['kite', 2])] },
  { ch: 1, name: '독구름 문어', news: '빨강+파랑 = 보라 문어! 독구름은 방패도 뚫어요', unlock: 'octo', newFoe: 'crayon', D: 1.9, cols: [R, B, Y], star: { k: 'form', f: 'octo', n: 27, foe: 'crayon', foeName: '병정' },
    groups: [G(0, 1, ['crayon', 6], ['blob', 3]), G(0.17, 1, ['crayon', 6]), G(0.34, 2, ['blob', 8], ['kite', 2]), G(0.51, 1, ['crayon', 6], ['bucket', 1]), G(0.68, 1, ['crayon', 7], ['blob', 3]), G(0.85, 1, ['crayon', 6], ['kite', 2]), { at: 1, f: [['crayon', 5]], form: 3, champ: 'crayon' }] },
  { ch: 1, name: '용암 거북', news: '빨강+노랑 = 용암 거북! 쿵 내려찍어 굳은 껍데기를 깨요', unlock: 'turtle', newFoe: 'shell', D: 1.9, cols: [R, B, Y], star: { k: 'form', f: 'turtle', n: 12, foe: 'shell', foeName: '달팽이' },
    groups: [G(0, 0, ['shell', 3], ['blob', 5]), G(0.17, 0, ['shell', 3], ['crayon', 2], ['blob', 3]), G(0.34, 2, ['blob', 8], ['kite', 2]), G(0.51, 0, ['shell', 4], ['blob', 4]), G(0.68, 1, ['shell', 3], ['crayon', 3], ['blob', 2]), G(0.85, 0, ['shell', 4], ['blob', 4]), { at: 1, f: [['shell', 3], ['blob', 3]], form: 3, champ: 'shell' }] },
  { ch: 1, name: '덩굴 뱀', news: '파랑+노랑 = 덩굴 뱀! 휙휙 피하는 놈을 꽁꽁', unlock: 'snake', newFoe: 'brush', D: 1.9, cols: [R, B, Y], star: { k: 'form', f: 'snake', n: 8, foe: 'brush', foeName: '붓 도깨비' },
    groups: [G(0, 0, ['brush', 4], ['blob', 4]), G(0.17, 0, ['brush', 5], ['shell', 1], ['blob', 2]), G(0.34, 1, ['crayon', 4], ['kite', 2], ['blob', 2]), G(0.51, 0, ['brush', 5], ['blob', 3]), G(0.68, 0, ['brush', 4], ['kite', 2], ['bucket', 1]), G(0.85, 0, ['brush', 5], ['blob', 4]), { at: 1, f: [['brush', 4]], form: 3, champ: 'brush' }] },
  { ch: 1, name: '대장 물감 통 거인', news: '세 색을 다 섞으면 진흙 골렘! 쿵쿵쿵', unlock: 'golem', newFoe: 'giant', D: 0, cols: [R, B, Y], star: { k: 'time', n: 40 },
    boss: 'giant', patches: [R, Y, B, R, Y], seg: 220, summon: [['shell', 1], ['crayon', 2], ['brush', 2], ['blob', 3]],
    groups: [G(0, 2, ['crayon', 3], ['shell', 2], ['blob', 3])] },
  { ch: 2, name: '파도 일각고래', news: '파랑 셋을 이어 먹으면 파도 일각고래! 줄 선 놈을 쓸어요', unlock: 'narwhal', newFoe: null, early: 'bucket', D: 2.0, cols: [R, B, B, Y], star: { k: 'form', f: 'narwhal', n: 13, foe: 'crayon', foeName: '병정' },
    groups: [G(0, 1, ['crayon', 6], ['blob', 3]), G(0.17, 1, ['crayon', 6], ['bucket', 1]), G(0.34, 2, ['blob', 8], ['shell', 2]), G(0.51, 1, ['crayon', 6], ['bucket', 1]), G(0.68, 1, ['crayon', 6], ['brush', 2], ['bucket', 1]), G(0.85, 1, ['crayon', 6], ['bucket', 2]), { at: 1, f: [['crayon', 6]], form: 3, champ: 'bucket' }] },
  { ch: 2, name: '천둥 독수리', news: '노랑 셋을 이어 먹으면 천둥 독수리! 벼락 비', unlock: 'eagle', newFoe: 'balloon', early: 'kite', D: 2.0, cols: [R, B, Y, Y], star: { k: 'form', f: 'eagle', n: 12 },
    groups: [G(0, 0, ['balloon', 5], ['kite', 2], ['blob', 2]), G(0.17, 0, ['balloon', 6], ['brush', 2]), G(0.34, 0, ['kite', 4], ['balloon', 3], ['blob', 3]), G(0.51, 0, ['balloon', 6], ['shell', 1], ['blob', 2]), G(0.68, 0, ['balloon', 5], ['kite', 3], ['brush', 2]), G(0.85, 0, ['balloon', 6], ['kite', 2]), { at: 1, f: [['balloon', 5]], form: 3, champ: 'kite' }] },
  { ch: 2, name: '무지개 고래', news: '무지개 도둑을 잡으면 무지개 고래! 놓치면 달아나요', unlock: 'rainbow', newFoe: 'rainbow', D: 2.0, cols: [R, B, Y], star: { k: 'form', f: 'rainbow', n: 18 },
    groups: [G(0, 0, ['tower', 1], ['blob', 5], ['rainbow', 1]), G(0.17, 0, ['crayon', 3], ['shell', 2], ['brush', 2]), G(0.34, 0, ['tower', 1], ['balloon', 3], ['rainbow', 1], ['blob', 2]), G(0.51, 2, ['blob', 6], ['bucket', 1], ['kite', 2]), G(0.68, 0, ['tower', 1], ['crayon', 3], ['rainbow', 1], ['brush', 2]), G(0.85, 0, ['shell', 2], ['brush', 2], ['balloon', 2], ['rainbow', 1]), { at: 1, f: [['crayon', 3], ['brush', 2]], form: 3, champ: 'bucket' }] },
  { ch: 2, name: '대장 회색 왕', news: '마지막 대장! 왕의 색을 다 뜯으면 마을이 무지개로', unlock: null, newFoe: 'king', D: 0, cols: [R, B, Y], star: { k: 'time', n: 34 },
    boss: 'king', patches: [R, B, Y, B, R, RAIN], seg: 200, summon: [['crayon', 2], ['brush', 1], ['balloon', 2], ['shell', 1], ['blob', 2]],
    groups: [G(0, 2, ['crayon', 3], ['balloon', 2], ['brush', 2])] },
];
export const STAGE_COUNT = STAGES.length;
/** 장 끝 둘 중 하나(광장의 큰 물건) */
export const PERKS: { name: string; line: string }[][] = [
  [{ name: '큰 붓', line: '지나간 자리가 공격이 돼요' }, { name: '물감 통', line: '모습이 두 배 오래가요' }],
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
  /** 방금 맞기 전 크기 ÷ 지금 크기 (퓨슝 작아지는 연출) */
  ps: number;
}
export interface SoulState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result' | 'pick' | 'fail' | 'end'; pt: number; stageT: number;
  hearts: number; tries: number; pts: number; sp: number; stars: number; got: number; starOk: boolean[]; dead: boolean; won: boolean;
  lv: number; perk: number[]; picked: number; dex: FK[]; newDex: FK[]; seenForm: FK[];
  me: Me; eat: { id: number; patch: number; ph: number; t: number; T: number; x0: number; y0: number; sk: number } | null; rest: number;
  foes: Foe[]; nid: number; shots: Shot[]; clouds: Cloud[]; waves: Wave[]; q: Q[]; lines: Line[]; paints: Paint[]; events: Ev[];
  camY: number; gi: number; trickT: number; awake: boolean; tapped: boolean; tapped0: boolean; taps: number; clearT: number; lostHeart: boolean;
  aid: number; multi: Record<number, number>; best: number; star3: boolean; fkills: number; kills: number; gain: number;
  patches: Patch[]; bossK: number; bossT: number; summonT: number; bossDown: boolean; bossAtk: number;
  grid: Uint8Array; gridRows: number; stolenN: number; painted: number; pct: number; villages: number[]; paintN: number; runId: number;
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
const meR = (s: SoulState) => FD[s.me.f].hr * sizeOf(s);

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
/** 도둑이 끌고 간 회색 자국 두 줄 (판마다 모양이 다르다) — 회색은 여기에만 남고, 칠하기 비율도 여기서 센다 */
export const trailX = (stage: number, y: number, k: number) => {
  const p = stage * 1.7 + k * 2.4;
  return (k ? 0.67 : 0.33) + 0.1 * Math.sin(2.1 * y + p) + 0.035 * Math.sin(5.3 * y + p * 1.9);
};
export const trailHW = (y: number, k: number) => 0.088 + 0.02 * Math.sin(3.1 * y + k * 1.3);
export const stolenAt = (stage: number, x: number, y: number) => Math.abs(x - trailX(stage, y, 0)) < trailHW(y, 0) || Math.abs(x - trailX(stage, y, 1)) < trailHW(y, 1);
function paint(s: SoulState, x: number, y: number, r: number, c: number) {
  r *= 1 + 0.04 * (s.lv - 1);
  s.paints.push({ x, y, r, c, seed: Math.floor(s.rng() * 1e6) });
  s.paintN++;
  if (s.paints.length > 900) s.paints.shift();
  const D = STAGES[s.stage].D, r0 = Math.floor((y - r + D) / CELL), r1 = Math.floor((y + r + D) / CELL);
  for (let row = Math.max(0, r0); row <= Math.min(s.gridRows - 1, r1); row++)
    for (let col = Math.max(0, Math.floor((x - r) / CELL)); col <= Math.min(GX - 1, Math.floor((x + r) / CELL)); col++) {
      const cx = (col + 0.5) * CELL, cy = (row + 0.5) * CELL - D;
      if (dist(cx, cy, x, y) <= r + CELL * 0.3 && s.grid[row * GX + col] === 1) (s.grid[row * GX + col] = 2), s.painted++;
    }
  s.pct = s.painted / Math.max(1, s.stolenN);
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
  const baseY = pre ? s.camY + 0.36 : s.camY + TOP - 0.04, form = g.form ?? 0, spots: [EK, number, number][] = [];
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
    spots.push([k, x, y]);
  }
  // 이 판에 맞는 색은 뒤쪽에, 다른 색(미끼)이 앞쪽에 온다 — '가장 가까운 것'만 먹으면 맞는 모습이 잘 안 된다
  const key = d.star.k === 'form' && FD[d.star.f].mask !== RAIN ? FD[d.star.f].mask : 0;
  const keyCols = cols.filter((c) => key && (c & key) === c), bait = cols.filter((c) => key && (c & key) === 0);
  const order = spots.map((_, i) => i).sort((a, b) => spots[b][2] - spots[a][2]);
  const front = new Set(order.slice(0, Math.ceil(order.length * 0.5)));
  spots.forEach(([k, x, y], i) => {
    const col = k === 'rainbow' ? RAIN : keyCols.length && bait.length ? (front.has(i) ? pickCol(s, bait) : s.rng() < 0.8 ? pickCol(s, keyCols) : pickCol(s, bait)) : pickCol(s, cols);
    add(s, k, x, y, col, !pre);
  });
  if (g.champ) {
    // 판의 '무서운 것': 크고 진한 색 — 먹으면 단숨에 한 단계 더 (그 판의 새 모습 색)
    const ck = g.champ, sf = d.star.k !== 'time' && d.star.f ? FD[d.star.f].mask : R, col = sf === RAIN ? R : sf;
    const m = add(s, ck, 0.5, pre ? s.camY + 0.5 : s.camY + TOP - 0.08, col, !pre, true);
    s.spot = { id: m.id, t: s.t, label: '진한 색!' };
    ev(s, 'champ', m.x, m.y, 0, 0, 0, ck);
    see(s, 'champ' + s.stage);
  }
  if (!pre) ev(s, 'spawn', 0.5, s.camY + TOP, n);
}

/** 대장 판: 대장과 두른 색 */
function spawnBoss(s: SoulState) {
  const d = STAGES[s.stage], k = d.boss!, m = add(s, k, 0.5, s.camY + 0.53, 0, false);
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
  s.paintN = 0;
  s.runId++;
  s.patches = [];
  s.camY = 0;
  s.gi = 0;
  s.eat = null;
  s.rest = 0;
  s.clearT = 0;
  s.best = 0;
  s.star3 = false;
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
  s.stolenN = 0;
  for (let row = 0; row < s.gridRows; row++) for (let col = 0; col < GX; col++) if (stolenAt(s.stage, (col + 0.5) * CELL, (row + 0.5) * CELL - d.D)) (s.grid[row * GX + col] = 1), s.stolenN++;
  s.painted = 0;
  s.pct = 0;
  s.me = blankMe();
  if (s.stage === 0 && !s.tapped) {
    // 1판 첫 장면: 진한 빨강 물감 통 도깨비 둘레에 먹물 꼬마 일곱 — 첫 톡이 '불 사자! 8마리 한 방'
    const c = add(s, 'bucket', 0.44, 0.66, R, false, true);
    s.spot = { id: c.id, t: s.t, label: '진한 빨강!' };
    for (let i = 0; i < 7; i++) add(s, 'blob', 0.44 + Math.cos(0.4 + (i * TAU) / 7) * 0.13, 0.68 + Math.sin(0.4 + (i * TAU) / 7) * 0.1, R, false);
    for (const [x, y] of [[0.16, 0.38], [0.84, 0.42], [0.18, 0.98], [0.86, 0.96]]) add(s, 'blob', x, y, R, false);
    // 정령은 진한 빨강 바로 옆 (첫 톡이 곧바로 빨기)
    s.me.x = s.me.tx = 0.7;
    s.me.y = s.me.ty = 0.74;
  } else if (d.boss) {
    spawnBoss(s);
    spawnGroup(s, d.groups[0], true);
    s.gi = 1;
  } else {
    spawnGroup(s, { ...d.groups[0], at: 0, champ: undefined }, true);
    s.gi = 1;
    if (d.early && d.star.k === 'form') {
      const m = add(s, d.early, 0.5 + (s.rng() - 0.5) * 0.3, s.camY + 0.24, FD[d.star.f].mask, false, true);
      s.spot = { id: m.id, t: s.t, label: '진한 색!' };
    }
  }
  const first = s.stage === 0 || STAGES[s.stage - 1].ch !== d.ch;
  s.banner = { head: `${first ? CHAPTERS[d.ch] + ' · ' : ''}${s.stage + 1}판`, sub: d.news, t: s.t };
  if (d.boss) s.spot = s.spot ?? null;
  see(s, 'stage' + s.stage);
  if (first) see(s, 'ch' + d.ch);
  ev(s, 'stage', 0.5, s.camY + 0.6, s.stage);
}
function blankMe(): Me {
  return { x: 0.5, y: HOME_SY, z: 0, mask: 0, tier: 1, f: 'white', T: 0, Tmax: 1, face: 1, vx: 0, vy: 0, st: 0, tm: 0, cool: 30, inv: 0, hitT: -99, tx: 0.5, ty: HOME_SY, aid: 0, ang: -Math.PI / 2, legs: 0, bornT: -99, lx: 0.5, ly: HOME_SY, lt: 0, tgt: 0, ps: 1 };
}

// ───────────────────────────── 때리기 ─────────────────────────────
/** 빨면 그대로 펑 터지는 작은 도둑 (나머지는 회색 껍데기가 된다) */
const SMALL = new Set<EK>(['blob', 'kite', 'balloon', 'rainbow']);
function kill(s: SoulState, m: Foe, aid: number, byForm = true) {
  if (m.dead) return;
  m.dead = true;
  s.kills++;
  let n = 0;
  if (aid > 0) {
    n = s.multi[aid] = (s.multi[aid] ?? 0) + 1;
    s.sp += Math.ceil(((n * n) / 4) * streakMul(s) * (1 + 0.5 * s.stage));
    const d = STAGES[s.stage];
    if (d.star.k === 'multi' && !s.star3 && n >= d.star.n && (!d.star.f || s.me.f === d.star.f) && byForm) (s.star3 = true), starWow(s, `${d.star.f ? FD[d.star.f].name + '로 ' : ''}한 번에 ${n}마리!`);
    else if (n > s.best && n >= WOW_N && n % 2 === 1) ev(s, 'record', m.x, m.y - m.r, n), (s.wowN++, s.firstBig < 0 && s.firstTap >= 0 && (s.firstBig = s.t));
    if (n > s.best) s.best = n;
  } else s.sp += 1;
  if (s.me.f !== 'white' && byForm) {
    s.fkills++;
    const d = STAGES[s.stage];
    if (d.star.k === 'form' && s.me.f === d.star.f && (!d.star.foe || d.star.foe === m.k)) {
      const k = (s.multi[-1] = (s.multi[-1] ?? 0) + 1);
      if (k === d.star.n) starWow(s, `${FD[d.star.f].name}으로 ${d.star.foeName ? d.star.foeName + ' ' : ''}${k}마리!`);
    }
  }
  const pc0 = s.me.mask && s.me.mask !== RAIN ? s.me.mask : m.col && m.col !== RAIN ? m.col : [R, B, Y][m.seed % 3];
  if (m.col || s.me.mask) paint(s, m.x, m.y, 0.06 + m.r * 1.2, pc0);
  ev(s, 'kill', m.x, m.y - m.r, n, m.r, m.col, m.k);
}
/** 같은 색을 이어 먹을수록 점수 배수 (×1 · ×1.5 · ×2 · ×2.5 · ×3) — 섞으면 ×1부터 */
export const streakMul = (s: SoulState) => (s.me.f === 'white' ? 1 : 1 + 0.5 * (Math.min(5, s.me.tier) - 1));
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
      amt *= 0.1;
      if (s.t - m.blockT > 14) (m.blockT = s.t), ev(s, 'block', m.x, m.y - m.r);
    }
  }
  if (d.fast && m.bind <= 0 && m.stun <= 0) {
    amt *= FAST_MUL[ak];
    if (FAST_MUL[ak] < 0.7 && s.t - m.dodgeT > 18) (m.dodgeT = s.t), ev(s, 'dodge', m.x, m.y - m.r * 1.8), (m.vx += (s.rng() - 0.5) * 0.02);
  }
  if (d.big) amt *= BIG_MUL[ak];
  if (m.arm > 0) {
    const hit = ARMOR_OK.has(ak) ? amt * 2.6 : amt * 0.1;
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
    if (me.f === 'golem' || me.f === 'rainbow') return void (me.inv = 30);
    // 맞으면 색이 튀어 나가 한 단계 작아진다 (1단계에서 맞거나 내려찍기면 하얀 맨몸)
    me.inv = 40;
    const before = FD[me.f].r * sizeOf(s);
    if (u >= 3 || me.tier <= u) {
      ev(s, 'knock', me.x, me.y - meR(s), 0, 0, 0, String(me.mask));
      fade(s, true);
      me.ps = before / FD.white.r;
      return;
    }
    const was = me.f;
    me.tier -= u;
    me.T = Math.max(60, me.T - 40 * u);
    me.f = formOf(s, me.mask, me.tier);
    if (me.f !== was) (me.st = 0), (me.z = 0), (me.cool = 20);
    me.ps = before / (FD[me.f].r * sizeOf(s));
    ev(s, 'drip', me.x, me.y - meR(s), u, me.f !== was ? 1 : 0, 0, String(me.mask));
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
    if (!hittable(m) || ED[m.k].boss || !onScreen(s, m) || !m.col) continue;
    const v = dist(m.x, m.y - m.r * 0.6, x, y) - m.r * 1.2;
    if (v < bv) (bv = v), (best = { id: m.id, patch: -1 });
  }
  return best;
}
function onTap(s: SoulState, x: number, sy: number) {
  const y = s.camY + sy;
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
  const quick = s.stage === 0 && !s.tapped0;
  s.tapped0 = true;
  s.eat = { id: tg.id, patch: tg.patch, ph: 0, t: 0, T: quick ? 3 : DASH_MIN + Math.round(dist(me.x, me.y, tx, ty) * 26), x0: me.x, y0: me.y, sk: quick ? 9 : SUCK_T };
  me.z = 0;
  ev(s, 'tap', x, y);
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
  if (e.t < e.sk) return;
  s.eat = null;
  s.rest = REST_T;
  const aid = ++s.aid;
  let col: number, bonus = 0, src = 1;
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
    if (m.champ) (bonus = s.stage === 0 && s.taps <= 1 ? 2 : 1), (src = 1.4);
    else if (m.k === 'blob') src = 0.7;
    m.held = false;
    if (SMALL.has(m.k) || s.stage === 0) ev(s, 'shatter', m.x, m.y, 0, m.r, 0, m.k), kill(s, m, aid, false);
    else {
      // 큰 놈은 색만 빼앗긴 회색 껍데기가 돼 비틀 — 방패·껍데기는 그대로, 새 모습이 부순다
      m.col = 0;
      m.hp = Math.min(m.hp, Math.ceil(m.max * 0.5));
      m.stun = Math.max(m.stun, 70);
      m.st = IDLE;
      ev(s, 'drain', m.x, m.y, 0, m.r, 0, m.k);
      paint(s, m.x, m.y, 0.05 + m.r, col);
    }
  }
  transform(s, col, bonus, aid, src);
}
function transform(s: SoulState, col: number, bonus: number, aid: number, src = 1) {
  const me = s.me, was = me.f, res = mixRes(s, col, bonus);
  me.mask = res.mask;
  me.tier = res.tier;
  me.f = res.f;
  me.T = me.Tmax = me.f === 'golem' || me.f === 'rainbow' ? durOf(s, me.f, me.tier) : Math.round(durOf(s, me.f, me.tier) * src);
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
  if (m.sh && !SHIELD_OK.has(ak) && ak !== 'quake') v *= 0.1;
  if (m.arm > 0) v *= ARMOR_OK.has(ak) ? 1.4 : 0.1;
  if (d.fast && m.bind <= 0) v *= FAST_MUL[ak];
  if (d.big) v *= BIG_MUL[ak];
  return v;
}
function burst(s: SoulState, aid: number) {
  const me = s.me, f = me.f, P = powOf(s), K = reachK(s);
  switch (f) {
    case 'lion': blast(s, me.x, me.y, 0.15 * K, 20 * P, 'pounce', aid, 0.02); paint(s, me.x, me.y, 0.12 * K, R); ev(s, 'roar', me.x, me.y, 0, 0.15 * K); break;
    case 'dragon': blast(s, me.x, me.y, 0.27 * K, 34 * P, 'fire', aid, 0.025); paint(s, me.x, me.y, 0.2 * K, R); ev(s, 'nova', me.x, me.y, 0, 0.27 * K); break;
    case 'whale': blast(s, me.x, me.y, 0.13 * K, 18 * P, 'jet', aid, 0.03); pushAll(s, me.x, me.y, 0.34 * K, 0.035); paint(s, me.x, me.y, 0.13 * K, B); ev(s, 'splashdown', me.x, me.y, 0, 0.13 * K); break;
    case 'narwhal': s.waves.push({ y: me.y, t: 0, aid, hit: [], big: true }); paint(s, me.x, me.y, 0.16 * K, B); ev(s, 'bigwave', me.x, me.y); break;
    case 'bird': chain(s, me.x, me.y - 0.03, 7, 13 * P, 0.36, aid); ev(s, 'clap', me.x, me.y); break;
    case 'eagle': for (let i = 0; i < 7; i++) s.q.push({ t: s.t + 4 + i * 4, k: 'bolt', x: 0, y: 0, r: 0.06, dmg: 26 * P, aid, id: 0 }); paint(s, me.x, me.y, 0.14 * K, Y); ev(s, 'storm', me.x, me.y); break;
    case 'octo': addCloud(s, me.x, me.y - 0.02, 0.18 * K, 200, aid); ev(s, 'cloud', me.x, me.y, 1, 0.18 * K); break;
    case 'turtle': blast(s, me.x, me.y, 0.17 * K, 32 * P, 'slam', aid, 0.022); paint(s, me.x, me.y, 0.13 * K, 5); ev(s, 'slam', me.x, me.y, 1, 0.17 * K); break;
    case 'snake': for (const m of nearFoes(s, me.x, me.y, 0.24 * K).slice(0, 7)) vineHit(s, m, 10 * P, aid); ev(s, 'net', me.x, me.y, 0, 0.24 * K); break;
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
      const pre = s.stage === 0 && !s.tapped, fx = pre ? me.tx + Math.sin(s.t * 0.05) * 0.012 : 0.5 + Math.sin(s.t * 0.013) * 0.22, fy = pre ? s.camY + me.ty + Math.sin(s.t * 0.07) * 0.01 : home + Math.sin(s.t * 0.021) * 0.05;
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
        me.ty = clamp(cy + 0.02, s.camY + ME_TOP, s.camY + ME_BOT);
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
      if (s.t % 48 === 0) me.aid = ++s.aid;
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
      if (o) moveTo(me, clamp(o.x, 0.1, 0.9), clamp(o.y + 0.28, s.camY + ME_TOP, s.camY + ME_BOT), 0.0042);
      else moveTo(me, 0.5, home, 0.003);
      if (o && me.cool <= 0 && dist(o.x, o.y, me.x, me.y) < 0.6) (me.st = 1), (me.tm = 0), (me.tgt = o.id), (me.aid = ++s.aid), (me.ang = Math.atan2(o.y - me.y, o.x - me.x)), ev(s, 'jet', me.x, me.y);
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
      const a = s.t * 0.045, ox = clamp(cx + Math.cos(a) * 0.2, 0.08, 0.92), oy = clamp(cy + 0.18 + Math.sin(a) * 0.1, s.camY + ME_TOP, s.camY + ME_BOT);
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
      if (me.cool <= 0 && n > 0) (me.st = 1), (me.tm = 0), (me.lx = me.x), (me.ly = me.y), (me.tx = clamp(cx, 0.07, 0.93)), (me.ty = clamp(cy + 0.03, s.camY + ME_TOP, s.camY + ME_BOT)), (me.legs = 22), (me.face = me.tx > me.x ? 1 : -1), ev(s, 'hop', me.x, me.y);
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
        for (const m of list.slice(0, 4)) vineHit(s, m, 9 * P, id);
        const boss = bossOf(s);
        if (boss && dist(boss.x, boss.y, me.x, me.y) < 0.45) vineHit(s, boss, 9 * P, id);
        if (list.length) ev(s, 'lash', me.x, me.y, list.length);
      }
      // 묶인 놈은 조인다
      if (s.t % 10 === 0) for (const m of s.foes) if (m.bind > 0 && hittable(m)) hurt(s, m, 1.4 * P, 'vine', me.aid);
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
  me.y = clamp(me.y, s.camY + ME_TOP, s.camY + ME_BOT);
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
    m.y += 0.0075;
    m.walkT = s.t;
    if (m.y >= s.camY + TOP + 0.22 + m.r) m.st = IDLE;
    return;
  }
  if (m.bind > 0) return void m.bind--;
  if (m.stun > 0) return void m.stun--;
  if (m.cool > 0) m.cool -= ez * (m.col ? 1 : 0.6);
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
  const spd = d.spd * ez * (m.champ ? 0.7 : 1) * 1.2;
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
        m.cool = 56;
        m.st = REST;
        m.tm = 26;
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
      if (dd < 0.24 && m.cool <= 0) {
        m.st = WIND;
        m.tm = Math.round(50 / Math.max(0.6, ez));
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
      const hy = s.camY + (m.k === 'kite' ? 0.44 : 0.5) + Math.sin(m.seed) * 0.08;
      const tx = clamp(me.x + Math.sin(s.t * 0.012 + m.seed) * 0.35, 0.08, 0.92);
      m.x += clamp(tx - m.x, -spd, spd);
      m.y += clamp(hy + Math.sin(s.t * 0.04 + m.seed) * 0.04 - m.y, -spd, spd);
      m.face = tx > m.x ? 1 : -1;
      m.walkT = s.t;
      if (m.cool <= 0) {
        m.cool = m.k === 'kite' ? 118 : 135;
        const sp = 0.0075 * ez, an = Math.atan2(me.y - m.y, me.x - m.x);
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
      if (dd < 0.17 && m.cool <= 0) (m.st = WIND), (m.tm = 28), (m.ax = me.x), (m.ay = me.y), (m.cool = 80), ev(s, 'wind', m.x, m.y, 0, 0, 0, m.k);
      else walk(dd < 0.5 ? a : Math.PI / 2 + Math.sin(s.t * 0.02 + m.seed) * 0.2, spd);
      break;
    }
    case 'shell': {
      walk(a, spd);
      if (m.cool <= 0 && dd < 0.5) {
        m.cool = 160;
        const sp = 0.0055 * ez;
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
        m.cool = 72;
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
  const third = d.star.k === 'multi' ? s.star3 : d.star.k === 'form' ? (s.multi[-1] ?? 0) >= d.star.n : s.stageT <= d.star.n * 60;
  s.starOk = [true, !s.lostHeart, third];
  s.got = s.starOk.filter(Boolean).length;
  s.stars += s.got;
  s.gain = (s.sp + CLEAR_PTS * (1 + s.stage) + Math.round(s.pct * 40)) * STAR_MUL[s.got];
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
  const vis = s.foes.reduce((a, m) => a + (alive(m) && onScreen(s, m) && m.k !== 'tower' && m.col ? 1 : 0), 0);
  const prog = -s.camY;
  if (s.awake && prog < d.D) {
    const v = vis >= CAM_STOP ? 0 : vis < 3 && s.gi < d.groups.length ? CAM_V * 3 : CAM_V * (1 - vis / (CAM_STOP + 2));
    const dy = Math.min(v, d.D - prog);
    s.camY -= dy;
    if (!s.eat) me.y -= dy;
  }
  // 떼: 카메라가 그 자리를 지나면 위에서 내려온다
  while (s.gi < d.groups.length && -s.camY >= d.groups[s.gi].at * d.D - 1e-9 && !(d.groups[s.gi].at >= 1 && -s.camY < d.D - 1e-9)) spawnGroup(s, d.groups[s.gi++], false);
  // 쪼르르: 화면에 색 도둑이 모자라면 먹물 꼬마가 위에서 하나씩 (손은 늘 누를 것이 있다)
  if (s.awake && (s.gi < d.groups.length || s.foes.some((m) => alive(m) && !m.col)) && ++s.trickT >= 50) {
    s.trickT = 0;
    if (vis < (s.gi < d.groups.length ? 4 : 2) && s.foes.length < CAP) add(s, 'blob', 0.12 + s.rng() * 0.76, s.camY + TOP - 0.03, pickCol(s, d.cols), true);
  }
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
      camY: 0, gi: 0, trickT: 0, awake: false, tapped: false, tapped0: false, taps: 0, clearT: 0, lostHeart: false, aid: 0, multi: {}, best: 0, star3: false, fkills: 0, kills: 0, gain: 0,
      patches: [], bossK: 1, bossT: 0, summonT: 0, bossDown: false, bossAtk: 0, grid: new Uint8Array(1), gridRows: 1, stolenN: 1, painted: 0, pct: 0, villages: [], paintN: 0, runId: 0,
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
  for (const m of s.foes) if (hittable(m) && !ED[m.k].boss && onScreen(s, m) && m.col) out.push({ m, patch: -1, col: m.col, bonus: m.champ ? 1 : 0, x: m.x, y: m.y });
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
/** 지금 될 수 있는(풀린) 모습 중 이 화면에 가장 잘 맞는 것 */
function bestForm(s: SoulState): FK {
  let bf: FK = 'lion', bv = -1;
  for (const f of DEX) {
    if (!unl(s, f) || f === 'rainbow' || f === 'golem' || !s.foes.length) continue;
    const v = fit(s, f) * (f === 'dragon' || f === 'narwhal' || f === 'eagle' ? 0.8 : 1);
    if (v > bv) (bv = v), (bf = f);
  }
  return bf;
}
/** 이 색을 먹으면 목표 모습에 얼마나 다가가나 (0 = 상관없음, 음수 = 깨뜨림) */
function toward(s: SoulState, target: FK, res: { mask: number; tier: number; f: FK }): number {
  const me = s.me, tm = FD[target].mask, evo = target === 'dragon' || target === 'narwhal' || target === 'eagle';
  if (res.f === target) return 10 + res.tier * 1.5;
  if (evo && res.mask === tm) return 5 + res.tier * 2.5;
  if (!evo && pc(tm) >= 2 && res.mask && res.mask !== RAIN && (res.mask & tm) === res.mask) return 6;
  if (me.f === target || (evo && me.mask === tm && me.tier >= 2)) return -8;
  return 0;
}
/** 봇: 지금 화면에 맞는 모습을 정하고, 그 모습이 되는(지키는) 색만 골라 먹는다 — 깨뜨리는 색은 피한다 */
export const colorsoulSmart: Bot<SoulState> = {
  name: '지금 맞는 모습을 골라 먹기',
  act(s) {
    const mid = between(s, true);
    if (mid) return mid;
    if (!free(s)) return NO;
    const me = s.me, d = STAGES[s.stage], list = cands(s);
    if (!list.length) return NO;
    const need = d.star.k === 'form' && (s.multi[-1] ?? 0) < d.star.n ? d.star.f : null;
    const target: FK = need && need !== 'rainbow' ? need : bestForm(s);
    let best: Cand | null = null, bv = -1e9, keep = false;
    for (const c of list) {
      const res = mixRes(s, c.col, c.bonus);
      let v = toward(s, target, res) + 0.5 * burstEst(s, res.f, c.x, c.y, res.tier) - dist(me.x, me.y, c.x, c.y) * 3;
      if (c.patch >= 0) v += 8;
      if (c.m.k === 'rainbow') v += 14;
      if (!s.dex.includes(res.f)) v += 1;
      if (v > bv) (bv = v), (best = c), (keep = res.f === me.f && res.tier > me.tier);
    }
    if (!best) return NO;
    const on = me.f === target || (me.f === 'rainbow') || (me.f === 'golem');
    if (!on || best.patch >= 0 || best.m.k === 'rainbow' || me.T < 140 || (keep && bv > 9)) return tapCand(s, best);
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
/** 독립 버릇 봇: 늘 빨강만 (가장 가까운 빨강 — 빨강이 없으면 안 누른다) — 한 색·한 모습만 고르는 버릇(규칙 15 확인) */
export const colorsoulHabit2: Bot<SoulState> = {
  name: '버릇: 늘 빨강만',
  act(s) {
    const mid = between(s, false);
    if (mid) return mid;
    if (!free(s)) return NO;
    let best: Cand | null = null, bv = 1e9;
    for (const c of cands(s)) if (c.col === R && dist(s.me.x, s.me.y, c.x, c.y) < bv) (bv = dist(s.me.x, s.me.y, c.x, c.y)), (best = c);
    return best ? tapCand(s, best) : NO;
  },
};
/** 측정·스크린샷용: k판으로 건너뛰기 */
export const __jump = (s: SoulState, k: number, lv = k + 1, perk: number[] = [k > 3 ? 2 : 0, k > 7 ? 2 : 0]) => ((s.stage = k), (s.lv = lv), (s.perk = perk), (s.tapped = true), newStage(s));

// ───────────────────────────── 그리기: 도구 ─────────────────────────────
const R_ = R, B_ = B, Y_ = Y;
type C2 = CanvasRenderingContext2D;
/** 그림책 연필 선(먹색 보라) */
const OUT = '#3b3150';
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
function starPath(ctx: C2, x: number, y: number, r: number, k = 0.47, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + rot + (i * Math.PI) / 5, q = i % 2 ? r * k : r;
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
/** 뾰족뾰족 (불꽃 갈기·터짐) */
function burstPath(ctx: C2, x: number, y: number, r: number, n: number, k: number, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, q = i % 2 ? r * k : r;
    if (i) ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
    else ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
/** 물감 얼룩 (울퉁불퉁 원) */
function splatPath(ctx: C2, x: number, y: number, r: number, seed: number, n = 9) {
  ctx.beginPath();
  for (let i = 0; i <= n * 2; i++) {
    const a = (i / (n * 2)) * TAU, q = r * (i % 2 ? 0.78 + hsh(seed + i) * 0.18 : 0.95 + hsh(seed + i * 3) * 0.2);
    const px = x + Math.cos(a) * q, py = y + Math.sin(a) * q;
    if (i) ctx.quadraticCurveTo(x + Math.cos(a - Math.PI / (n * 2)) * r * 1.05, y + Math.sin(a - Math.PI / (n * 2)) * r * 1.05, px, py);
    else ctx.moveTo(px, py);
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
/** 채우고 테두리 */
function ink(g: C2, fill: string | CanvasGradient, lw = LW, stroke = OUT) {
  g.fillStyle = fill;
  g.fill();
  if (lw > 0) (g.strokeStyle = stroke), (g.lineWidth = lw), g.stroke();
}
function shine(g: C2, x: number, y: number, rx: number, ry: number, rot = -0.5, a = 0.55) {
  g.fillStyle = `rgba(255,255,255,${a})`;
  ell(g, x, y, rx, ry, rot);
  g.fill();
}
function blush(g: C2, cx: number, cy: number, e: number, r: number) {
  g.fillStyle = 'rgba(255,110,130,.45)';
  for (const sd of [-1, 1]) ell(g, cx + sd * e, cy, r, r * 0.6), g.fill();
}
/** 눈 한 쌍: (cx, cy) 가운데, e 간격 절반, k 크기, mood 0 보통 · 1 신남(^^) · 2 화남 · 3 어질 · 4 놀람 · 5 날카로움 */
function eyes(g: C2, cx: number, cy: number, e: number, k: number, mood = 0, look = 0.15) {
  for (const sd of [-1, 1]) {
    const x = cx + sd * e;
    if (mood === 1) {
      g.strokeStyle = OUT;
      g.lineWidth = k * 0.42;
      g.lineCap = 'round';
      g.beginPath();
      g.arc(x, cy + k * 0.35, k * 0.75, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
      continue;
    }
    if (mood === 3) {
      g.strokeStyle = OUT;
      g.lineWidth = k * 0.3;
      g.beginPath();
      for (let i = 0; i <= 12; i++) {
        const a = i * 0.8, q = k * (0.12 + i * 0.07);
        if (i) g.lineTo(x + Math.cos(a) * q, cy + Math.sin(a) * q);
        else g.moveTo(x + q, cy);
      }
      g.stroke();
      continue;
    }
    const sk = mood === 4 ? 1.15 : mood === 5 ? 0.85 : 1;
    ell(g, x, cy, k * 0.82 * sk, k * (mood === 5 ? 0.7 : 1) * sk);
    ink(g, '#ffffff', k * 0.22);
    ell(g, x + look * k, cy + k * 0.08, k * 0.5 * sk, k * (mood === 5 ? 0.45 : 0.6) * sk);
    g.fillStyle = '#251c35';
    g.fill();
    ell(g, x + look * k - k * 0.16, cy - k * 0.18, k * 0.2, k * 0.22);
    g.fillStyle = '#ffffff';
    g.fill();
    if (mood === 2 || mood === 5) {
      g.strokeStyle = OUT;
      g.lineWidth = k * 0.4;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x + sd * k * 1.0, cy - k * 1.45);
      g.lineTo(x - sd * k * 0.7, cy - k * 0.9);
      g.stroke();
    }
  }
}
/** 입: kind 0 미소 · 1 활짝(벌림) · 2 이빨 씩 · 3 꽥 · 4 o */
function mouth(g: C2, x: number, y: number, w: number, kind = 0) {
  g.strokeStyle = OUT;
  g.lineWidth = w * 0.22;
  g.lineCap = 'round';
  g.beginPath();
  if (kind === 0) {
    g.moveTo(x - w * 0.5, y);
    g.quadraticCurveTo(x, y + w * 0.55, x + w * 0.5, y);
    g.stroke();
  } else if (kind === 1) {
    g.moveTo(x - w * 0.6, y - w * 0.1);
    g.quadraticCurveTo(x, y + w * 1.1, x + w * 0.6, y - w * 0.1);
    g.closePath();
    ink(g, '#8c2f3a', w * 0.2);
    ell(g, x, y + w * 0.42, w * 0.3, w * 0.2);
    g.fillStyle = '#ff8a9a';
    g.fill();
  } else if (kind === 2) {
    g.moveTo(x - w * 0.6, y);
    g.quadraticCurveTo(x, y + w * 0.7, x + w * 0.6, y);
    g.closePath();
    ink(g, '#ffffff', w * 0.18);
    g.beginPath();
    for (let i = -1; i <= 1; i++) (g.moveTo(x + i * w * 0.25, y + w * 0.05), g.lineTo(x + i * w * 0.25, y + w * 0.3));
    g.lineWidth = w * 0.1;
    g.stroke();
  } else if (kind === 3) {
    ell(g, x, y + w * 0.2, w * 0.32, w * 0.42);
    ink(g, '#8c2f3a', w * 0.18);
  } else {
    ell(g, x, y + w * 0.15, w * 0.2, w * 0.24);
    ink(g, '#8c2f3a', w * 0.14);
  }
}
/** 불꽃 하나 (아래가 뿌리) */
function flame(g: C2, x: number, y: number, k: number, lean = 0, cols = ['#ff4a2e', '#ff9a2a', '#ffe36b']) {
  cols.forEach((c, i) => {
    const q = k * (1 - i * 0.3);
    g.beginPath();
    g.moveTo(x - q * 0.5, y);
    g.quadraticCurveTo(x - q * 0.62, y - q * 0.8, x + lean * q + q * 0.05, y - q * 1.6);
    g.quadraticCurveTo(x + q * 0.25, y - q * 0.9, x + q * 0.55, y - q * 0.45);
    g.quadraticCurveTo(x + q * 0.5, y, x - q * 0.5, y);
    g.closePath();
    g.fillStyle = c;
    g.fill();
  });
}
/** 번개 모양 */
function boltPath(g: C2, x: number, y: number, k: number) {
  g.beginPath();
  g.moveTo(x + k * 0.15, y - k);
  g.lineTo(x - k * 0.45, y + k * 0.1);
  g.lineTo(x - k * 0.02, y + k * 0.1);
  g.lineTo(x - k * 0.25, y + k);
  g.lineTo(x + k * 0.45, y - k * 0.2);
  g.lineTo(x + k * 0.02, y - k * 0.2);
  g.closePath();
}

// ───────────────────────────── 그리기: 정령과 모습들 (단위 좌표: 몸 반지름 1, 발 가운데 (0,0), 위가 -y, 오른쪽을 본다) ─────────────────────────────
/** pose: 0 평소 · 1 힘줌(공격) · 2 아야 */
const FPAINT: Record<FK, (g: C2, pose: number) => void> = {
  white(g, pose) {
    // 꼬마 하얀 정령: 말랑한 물방울 몸 + 위로 말린 불꽃 머리칼
    g.beginPath();
    g.moveTo(-0.95, -0.75);
    g.bezierCurveTo(-1.05, -1.75, -0.4, -2.15, 0.05, -2.05);
    g.bezierCurveTo(0.35, -2.5, 0.75, -2.55, 0.62, -2.2);
    g.bezierCurveTo(0.95, -1.95, 1.08, -1.4, 0.98, -0.8);
    g.bezierCurveTo(0.95, -0.15, 0.45, 0.02, 0, 0.02);
    g.bezierCurveTo(-0.55, 0.02, -0.92, -0.2, -0.95, -0.75);
    g.closePath();
    ink(g, radg(g, -0.3, -1.4, 0.1, 1.5, [0, '#ffffff'], [0.7, '#f2f5ff'], [1, '#c9d6ff']), LW, '#6a74a8');
    shine(g, -0.5, -1.45, 0.22, 0.38, 0.3, 0.9);
    // 팔
    for (const sd of [-1, 1]) {
      ell(g, sd * 0.98, -0.72 + (pose === 1 ? -0.25 : 0), 0.2, 0.15, sd * 0.6);
      ink(g, '#f6f8ff', LW * 0.8, '#6a74a8');
    }
    eyes(g, 0.1, -1.1, 0.36, 0.26, pose === 2 ? 3 : pose === 1 ? 4 : 0, 0.25);
    blush(g, 0.1, -0.78, 0.6, 0.14);
    mouth(g, 0.12, -0.72, 0.36, pose === 1 ? 1 : 0);
  },
  lion(g, pose) {
    // 불 사자: 몸통 + 불꽃 갈기 + 불꽃 꼬리
    g.beginPath();
    g.moveTo(-1.0, -0.95);
    g.bezierCurveTo(-1.55, -1.25, -1.7, -1.75, -1.4, -2.0);
    g.lineWidth = 0.16;
    g.strokeStyle = OUT;
    g.stroke();
    g.lineWidth = 0.08;
    g.strokeStyle = '#ffb347';
    g.stroke();
    flame(g, -1.4, -1.9, 0.42, 0.3);
    for (const [lx, b] of [[-0.65, 0], [-0.3, 0.06], [0.35, 0], [0.62, 0.06]] as [number, number][]) {
      rr(g, lx - 0.15, -0.6 - b, 0.3, 0.6 + b, 0.13);
      ink(g, lx > 0 ? '#ffb24a' : '#f09a35');
      ell(g, lx, -0.04, 0.17, 0.08);
      ink(g, '#ffe0a8', LW * 0.6);
    }
    ell(g, -0.15, -0.82, 1.05, 0.58);
    ink(g, lin(g, 0, -1.4, 0, -0.3, [0, '#ffc461'], [1, '#ff9a35']));
    shine(g, -0.4, -1.12, 0.35, 0.12, 0, 0.45);
    // 갈기 (세 겹 불꽃)
    const hx = 0.72, hy = -1.35;
    const rot = pose === 1 ? 0.25 : 0;
    burstPath(g, hx - 0.05, hy, 0.95, 11, 0.62, rot);
    ink(g, '#ff4a2e', LW * 0.9);
    burstPath(g, hx - 0.02, hy, 0.78, 11, 0.62, rot + 0.3);
    g.fillStyle = '#ff9a2a';
    g.fill();
    burstPath(g, hx, hy, 0.6, 11, 0.7, rot + 0.15);
    g.fillStyle = '#ffd34a';
    g.fill();
    // 얼굴
    ell(g, hx + 0.05, hy + 0.02, 0.5, 0.46);
    ink(g, lin(g, 0, hy - 0.5, 0, hy + 0.5, [0, '#ffe08a'], [1, '#ffb85a']));
    for (const sd of [-1, 1]) (ell(g, hx + sd * 0.34, hy - 0.4, 0.13, 0.13), ink(g, '#ffb85a', LW * 0.7));
    eyes(g, hx + 0.08, hy - 0.06, 0.2, 0.15, pose === 2 ? 3 : pose === 1 ? 5 : 0, 0.3);
    ell(g, hx + 0.2, hy + 0.22, 0.24, 0.16);
    ink(g, '#fff1cc', LW * 0.7);
    ell(g, hx + 0.24, hy + 0.13, 0.08, 0.06);
    g.fillStyle = '#7a3b2e';
    g.fill();
    mouth(g, hx + 0.22, hy + 0.3, 0.22, pose === 1 ? 1 : 0);
    blush(g, hx + 0.08, hy + 0.15, 0.32, 0.08);
  },
  whale(g, pose) {
    // 물 고래: 둥근 몸 · 밝은 배 줄무늬 · 위로 들린 꼬리 · 등의 숨구멍
    g.beginPath();
    g.moveTo(-0.95, -0.85);
    g.quadraticCurveTo(-1.5, -1.0, -1.6, -1.55);
    g.quadraticCurveTo(-1.9, -1.85, -1.95, -2.1);
    g.quadraticCurveTo(-1.6, -1.9, -1.45, -1.7);
    g.quadraticCurveTo(-1.35, -2.0, -1.05, -2.05);
    g.quadraticCurveTo(-1.15, -1.55, -0.8, -1.2);
    g.closePath();
    ink(g, '#2f7ae0');
    g.beginPath();
    g.moveTo(-1.05, -0.9);
    g.bezierCurveTo(-1.1, -1.75, -0.2, -1.95, 0.45, -1.8);
    g.bezierCurveTo(1.15, -1.62, 1.35, -1.05, 1.22, -0.62);
    g.bezierCurveTo(1.05, -0.1, 0.4, 0.02, -0.2, 0.0);
    g.bezierCurveTo(-0.75, -0.05, -1.02, -0.4, -1.05, -0.9);
    g.closePath();
    ink(g, lin(g, 0, -1.9, 0, 0, [0, '#6ab6ff'], [0.6, '#3b8dff'], [1, '#2a6fd6']));
    g.save();
    g.clip();
    ell(g, 0.2, -0.05, 1.25, 0.5);
    g.fillStyle = '#d6ecff';
    g.fill();
    g.strokeStyle = 'rgba(80,140,220,.55)';
    g.lineWidth = 0.05;
    for (let i = 0; i < 5; i++) (g.beginPath(), g.moveTo(-0.6 + i * 0.32, -0.42), g.lineTo(-0.5 + i * 0.32, 0.02), g.stroke());
    g.restore();
    g.beginPath();
    g.moveTo(-1.05, -0.9);
    g.bezierCurveTo(-1.1, -1.75, -0.2, -1.95, 0.45, -1.8);
    g.bezierCurveTo(1.15, -1.62, 1.35, -1.05, 1.22, -0.62);
    g.bezierCurveTo(1.05, -0.1, 0.4, 0.02, -0.2, 0.0);
    g.bezierCurveTo(-0.75, -0.05, -1.02, -0.4, -1.05, -0.9);
    g.closePath();
    g.strokeStyle = OUT;
    g.lineWidth = LW;
    g.stroke();
    shine(g, -0.2, -1.5, 0.45, 0.13, -0.15, 0.6);
    // 지느러미
    g.beginPath();
    g.moveTo(0.05, -0.55);
    g.quadraticCurveTo(-0.15, -0.1, -0.55, -0.15);
    g.quadraticCurveTo(-0.3, -0.45, 0.05, -0.55);
    ink(g, '#2f7ae0', LW * 0.8);
    // 숨구멍
    ell(g, 0.1, -1.83, 0.1, 0.05);
    g.fillStyle = '#1d4fa8';
    g.fill();
    eyes(g, 0.78, -1.05, 0.0, 0.17, pose === 2 ? 3 : pose === 1 ? 4 : 0, 0.3);
    blush(g, 0.86, -0.78, 0.0, 0.12);
    mouth(g, 0.92, -0.62, 0.38, pose === 1 ? 1 : 0);
  },
  bird(g, pose) {
    // 번개 새: 동그란 몸 · 번개 볏 · 지그재그 날개
    const up = pose === 1 ? -0.5 : 0;
    for (const sd of [-1, 1]) {
      g.save();
      g.translate(-0.05 + sd * 0.15, -1.05);
      g.scale(sd < 0 ? -1 : 1, 1);
      g.beginPath();
      g.moveTo(0.3, 0);
      g.lineTo(1.1, -0.55 + up);
      g.lineTo(0.95, -0.2 + up * 0.5);
      g.lineTo(1.3, -0.15 + up * 0.6);
      g.lineTo(1.0, 0.15 + up * 0.3);
      g.lineTo(1.25, 0.3 + up * 0.2);
      g.lineTo(0.55, 0.45);
      g.closePath();
      ink(g, sd < 0 ? '#f2b80c' : '#ffd334');
      g.restore();
    }
    // 꼬리
    g.beginPath();
    g.moveTo(-0.6, -0.7);
    g.lineTo(-1.25, -0.45);
    g.lineTo(-1.05, -0.75);
    g.lineTo(-1.4, -0.95);
    g.lineTo(-0.7, -1.05);
    g.closePath();
    ink(g, '#ffb81c');
    ell(g, 0.0, -1.0, 0.78, 0.74);
    ink(g, radg(g, -0.25, -1.35, 0.05, 0.95, [0, '#fff3a6'], [0.6, '#ffd334'], [1, '#f0a80c']));
    ell(g, 0.15, -0.72, 0.42, 0.32);
    g.fillStyle = '#fff7cf';
    g.fill();
    // 볏 (번개 셋)
    for (const [dx, k] of [[-0.15, 0.32], [0.12, 0.4], [0.38, 0.3]] as [number, number][]) (boltPath(g, dx, -1.85 - k * 0.3, k), ink(g, '#ffe95a', LW * 0.7));
    eyes(g, 0.32, -1.12, 0.2, 0.15, pose === 2 ? 3 : pose === 1 ? 5 : 0, 0.35);
    g.beginPath();
    g.moveTo(0.62, -0.95);
    g.lineTo(1.02, -0.86);
    g.lineTo(0.64, -0.74);
    g.closePath();
    ink(g, '#ff8a2a', LW * 0.7);
    blush(g, 0.32, -0.82, 0.36, 0.08);
    for (const sd of [-0.15, 0.2]) (g.beginPath(), g.moveTo(sd, -0.3), g.lineTo(sd, 0), g.lineTo(sd + 0.12, 0), (g.strokeStyle = '#ff8a2a'), (g.lineWidth = 0.08), g.stroke());
  },
  dragon(g, pose) {
    // 불 용: 큰 날개 · 뿔 · 긴 목 · 불꽃 꼬리
    const fl = pose === 1 ? -0.35 : 0;
    for (const sd of [1, -1]) {
      g.save();
      g.translate(-0.2, -1.1);
      if (sd < 0) g.scale(0.8, 0.9);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(-0.5, -1.35 + fl);
      g.quadraticCurveTo(-0.9, -1.45 + fl, -1.5, -1.2 + fl);
      g.quadraticCurveTo(-1.35, -0.85, -1.6, -0.55);
      g.quadraticCurveTo(-1.2, -0.45, -1.15, -0.15);
      g.quadraticCurveTo(-0.7, -0.25, -0.45, 0.15);
      g.closePath();
      ink(g, sd > 0 ? '#c42a3a' : '#9a1f2e');
      g.strokeStyle = 'rgba(255,190,150,.6)';
      g.lineWidth = 0.05;
      g.beginPath();
      g.moveTo(-0.5, -1.35 + fl);
      g.lineTo(-0.6, -0.2);
      g.moveTo(-0.5, -1.35 + fl);
      g.lineTo(-1.1, -0.4);
      g.stroke();
      g.restore();
    }
    // 꼬리
    g.beginPath();
    g.moveTo(-0.7, -0.7);
    g.quadraticCurveTo(-1.5, -0.6, -1.65, -1.1);
    g.lineWidth = 0.34;
    g.strokeStyle = OUT;
    g.stroke();
    g.lineWidth = 0.2;
    g.strokeStyle = '#e8463c';
    g.stroke();
    flame(g, -1.65, -1.05, 0.38, -0.2);
    for (const lx of [-0.35, 0.3]) (rr(g, lx - 0.14, -0.5, 0.28, 0.5, 0.12), ink(g, '#d63a3a'), ell(g, lx + 0.04, -0.03, 0.17, 0.07), ink(g, '#fff0d0', LW * 0.6));
    ell(g, -0.05, -0.85, 0.9, 0.55);
    ink(g, lin(g, 0, -1.4, 0, -0.3, [0, '#ff6a5a'], [1, '#d6303a']));
    ell(g, 0.1, -0.6, 0.62, 0.3);
    g.fillStyle = '#ffe2b0';
    g.fill();
    for (let i = 0; i < 4; i++) (g.beginPath(), g.moveTo(-0.4 + i * 0.26, -0.82), g.lineTo(-0.38 + i * 0.26, -0.36), (g.strokeStyle = 'rgba(200,120,80,.5)'), (g.lineWidth = 0.04), g.stroke());
    // 목·머리
    g.beginPath();
    g.moveTo(0.45, -1.1);
    g.quadraticCurveTo(0.75, -1.5, 0.85, -1.85);
    g.lineTo(1.2, -1.75);
    g.quadraticCurveTo(1.0, -1.3, 0.85, -0.85);
    g.closePath();
    ink(g, '#e8463c');
    const hx = 1.05, hy = -1.95;
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(hx - 0.15 + sd * 0.12, hy - 0.3);
      g.quadraticCurveTo(hx - 0.35 + sd * 0.18, hy - 0.75, hx - 0.55 + sd * 0.15, hy - 0.8);
      g.quadraticCurveTo(hx - 0.25 + sd * 0.12, hy - 0.55, hx + 0.05 + sd * 0.12, hy - 0.32);
      ink(g, '#ffe9b0', LW * 0.8);
    }
    ell(g, hx, hy, 0.42, 0.36);
    ink(g, lin(g, 0, hy - 0.4, 0, hy + 0.4, [0, '#ff7a64'], [1, '#e0363a']));
    g.beginPath();
    g.moveTo(hx + 0.15, hy - 0.12);
    g.quadraticCurveTo(hx + 0.75, hy - 0.05, hx + 0.72, hy + 0.18);
    g.quadraticCurveTo(hx + 0.4, hy + 0.35, hx + 0.1, hy + 0.28);
    g.closePath();
    ink(g, '#ff8a6e');
    ell(g, hx + 0.6, hy, 0.05, 0.04);
    g.fillStyle = OUT;
    g.fill();
    if (pose === 1) {
      g.beginPath();
      g.moveTo(hx + 0.2, hy + 0.2);
      g.lineTo(hx + 0.72, hy + 0.2);
      g.lineTo(hx + 0.6, hy + 0.42);
      g.closePath();
      ink(g, '#8c2f3a', LW * 0.6);
    }
    eyes(g, hx - 0.02, hy - 0.08, 0.0, 0.14, pose === 2 ? 3 : 5, 0.35);
    shine(g, -0.35, -1.18, 0.3, 0.1, 0, 0.45);
  },
  octo(g, pose) {
    // 독구름 문어: 둥근 머리 · 말린 다리 여섯 · 점박이
    const wv = pose === 1 ? 0.12 : 0;
    for (let i = 0; i < 6; i++) {
      const x0 = -0.62 + i * 0.25, sd = i < 3 ? -1 : 1, cx = x0 + sd * 0.35;
      g.beginPath();
      g.moveTo(x0 - 0.1, -0.75);
      g.quadraticCurveTo(x0 - 0.05 + sd * 0.1, -0.2, cx, -0.05 - wv * (i % 2));
      g.quadraticCurveTo(cx + sd * 0.25, -0.12, cx + sd * 0.16, -0.32);
      g.quadraticCurveTo(cx + sd * 0.02, -0.25, x0 + 0.12 + sd * 0.05, -0.75);
      g.closePath();
      ink(g, i % 2 ? '#8e48e8' : '#a35cff');
      for (let k = 0; k < 2; k++) (ell(g, x0 + sd * (0.08 + k * 0.1), -0.45 + k * 0.18, 0.05, 0.05), (g.fillStyle = '#e2c8ff'), g.fill());
    }
    g.beginPath();
    g.moveTo(-0.85, -0.75);
    g.bezierCurveTo(-1.0, -1.65, -0.45, -2.05, 0.05, -2.05);
    g.bezierCurveTo(0.6, -2.05, 1.05, -1.65, 0.88, -0.75);
    g.quadraticCurveTo(0.0, -0.55, -0.85, -0.75);
    g.closePath();
    ink(g, radg(g, -0.25, -1.6, 0.1, 1.2, [0, '#d8b6ff'], [0.55, '#a65cff'], [1, '#7a36d8']));
    for (const [sx, sy, r] of [[-0.45, -1.55, 0.1], [0.55, -1.7, 0.08], [0.6, -1.25, 0.06], [-0.6, -1.15, 0.07]] as [number, number, number][]) (ell(g, sx, sy, r, r), (g.fillStyle = 'rgba(70,20,140,.35)'), g.fill());
    shine(g, -0.35, -1.75, 0.25, 0.12, -0.4, 0.6);
    eyes(g, 0.08, -1.2, 0.3, 0.2, pose === 2 ? 3 : pose === 1 ? 1 : 0, 0.2);
    g.strokeStyle = OUT;
    g.lineWidth = 0.07;
    for (const sd of [-1, 1]) (g.beginPath(), g.moveTo(0.08 + sd * 0.12, -1.42), g.lineTo(0.08 + sd * 0.48, -1.47), g.stroke());
    blush(g, 0.08, -0.95, 0.45, 0.1);
    mouth(g, 0.1, -0.88, 0.26, pose === 1 ? 4 : 0);
  },
  turtle(g, pose) {
    // 용암 거북: 화산 등껍질(용암 금) · 내민 머리
    for (const lx of [-0.65, -0.2, 0.3, 0.7]) (rr(g, lx - 0.15, -0.38, 0.3, 0.38, 0.12), ink(g, '#ff8a4a'));
    g.beginPath();
    g.moveTo(0.7, -0.55);
    g.quadraticCurveTo(1.1, -0.95, 1.35, -0.85);
    g.quadraticCurveTo(1.55, -0.6, 1.3, -0.4);
    g.quadraticCurveTo(1.0, -0.3, 0.7, -0.35);
    g.closePath();
    ink(g, lin(g, 0, -1, 0, -0.3, [0, '#ffa060'], [1, '#ff7a3a']));
    eyes(g, 1.18, -0.72, 0.0, 0.13, pose === 2 ? 3 : pose === 1 ? 5 : 0, 0.3);
    mouth(g, 1.38, -0.5, 0.16, pose === 1 ? 2 : 0);
    g.beginPath();
    g.moveTo(-1.1, -0.35);
    g.bezierCurveTo(-1.15, -1.25, -0.6, -1.7, 0.0, -1.7);
    g.bezierCurveTo(0.6, -1.7, 1.15, -1.25, 1.05, -0.35);
    g.closePath();
    ink(g, lin(g, 0, -1.7, 0, -0.35, [0, '#8a4a34'], [1, '#5a2e22']));
    // 용암 금
    g.save();
    g.clip();
    g.strokeStyle = '#ffb02e';
    g.lineWidth = 0.1;
    g.shadowColor = '#ff7a1a';
    g.shadowBlur = 0;
    for (const pts of [[[-0.8, -0.5], [-0.45, -0.9], [-0.55, -1.25]], [[-0.1, -0.4], [0.05, -0.85], [-0.15, -1.3]], [[0.65, -0.5], [0.45, -0.95], [0.6, -1.25]], [[-0.45, -0.9], [0.05, -0.85], [0.45, -0.95]]]) {
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
    }
    g.strokeStyle = '#ffe36b';
    g.lineWidth = 0.04;
    g.stroke();
    g.restore();
    g.beginPath();
    g.moveTo(-1.1, -0.35);
    g.bezierCurveTo(-1.15, -1.25, -0.6, -1.7, 0.0, -1.7);
    g.bezierCurveTo(0.6, -1.7, 1.15, -1.25, 1.05, -0.35);
    g.closePath();
    g.strokeStyle = OUT;
    g.lineWidth = LW;
    g.stroke();
    // 화산 꼭대기
    g.beginPath();
    g.moveTo(-0.32, -1.62);
    g.lineTo(-0.18, -2.05);
    g.lineTo(0.18, -2.05);
    g.lineTo(0.32, -1.62);
    g.closePath();
    ink(g, '#6a3828', LW * 0.9);
    ell(g, 0, -2.05, 0.2, 0.07);
    ink(g, '#ffb02e', LW * 0.6);
    flame(g, 0.0, -2.05, pose === 1 ? 0.45 : 0.3, 0, ['#ff5a2a', '#ffb02e', '#fff2a0']);
    rr(g, -1.15, -0.45, 2.25, 0.18, 0.09);
    ink(g, '#ffcf6a', LW * 0.8);
    shine(g, -0.5, -1.35, 0.25, 0.1, -0.5, 0.35);
  },
  snake(g, pose) {
    // 덩굴 뱀: S자로 말린 몸 · 잎사귀 · 머리 꽃
    const path = () => {
      g.beginPath();
      g.moveTo(-1.25, -0.2);
      g.bezierCurveTo(-0.8, 0.15, -0.2, -0.05, -0.1, -0.45);
      g.bezierCurveTo(0.0, -0.85, -0.7, -0.95, -0.55, -1.3);
      g.bezierCurveTo(-0.4, -1.65, 0.3, -1.55, 0.55, -1.55);
    };
    path();
    g.lineCap = 'round';
    g.strokeStyle = OUT;
    g.lineWidth = 0.62;
    g.stroke();
    path();
    g.strokeStyle = '#3fcf5e';
    g.lineWidth = 0.46;
    g.stroke();
    path();
    g.strokeStyle = '#a8f0b4';
    g.lineWidth = 0.14;
    g.setLineDash([0.12, 0.18]);
    g.stroke();
    g.setLineDash([]);
    for (const [lx, ly, a] of [[-0.85, -0.05, 2.4], [-0.15, -0.72, 0.4], [-0.6, -1.15, 2.6], [0.05, -1.6, -0.6]] as [number, number, number][]) {
      g.save();
      g.translate(lx, ly);
      g.rotate(a);
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(0.2, -0.18, 0.42, 0);
      g.quadraticCurveTo(0.2, 0.18, 0, 0);
      ink(g, '#2fae4a', LW * 0.6);
      g.restore();
    }
    const hx = 0.78, hy = -1.58;
    ell(g, hx, hy, 0.42, 0.34);
    ink(g, lin(g, 0, hy - 0.35, 0, hy + 0.35, [0, '#7ee88e'], [1, '#2fb84c']));
    for (let i = 0; i < 5; i++) (ell(g, hx - 0.2 + Math.cos((i * TAU) / 5) * 0.13, hy - 0.4 + Math.sin((i * TAU) / 5) * 0.13, 0.09, 0.09), ink(g, '#ff9ecb', LW * 0.4));
    ell(g, hx - 0.2, hy - 0.4, 0.07, 0.07);
    g.fillStyle = '#ffe36b';
    g.fill();
    eyes(g, hx + 0.05, hy - 0.06, 0.17, 0.13, pose === 2 ? 3 : pose === 1 ? 5 : 0, 0.35);
    if (pose === 1) {
      g.beginPath();
      g.moveTo(hx + 0.38, hy + 0.12);
      g.lineTo(hx + 0.75, hy + 0.15);
      g.lineTo(hx + 0.85, hy + 0.05);
      g.moveTo(hx + 0.75, hy + 0.15);
      g.lineTo(hx + 0.84, hy + 0.27);
      g.strokeStyle = '#ff4a6e';
      g.lineWidth = 0.06;
      g.stroke();
    }
    mouth(g, hx + 0.22, hy + 0.14, 0.2, 0);
    blush(g, hx + 0.05, hy + 0.12, 0.25, 0.07);
  },
  golem(g, pose) {
    // 진흙 골렘: 울퉁불퉁 진흙 몸 · 세 색 물감 줄 · 커다란 주먹
    const up = pose === 1 ? -0.45 : 0;
    for (const sd of [-1, 1]) {
      ell(g, sd * 1.12, -1.0 + up, 0.42, 0.4);
      ink(g, lin(g, 0, -1.4, 0, -0.6, [0, '#c08a52'], [1, '#8a5a30']));
      for (let k = 0; k < 3; k++) (g.beginPath(), g.moveTo(sd * (0.95 + k * 0.1), -1.25 + up), g.lineTo(sd * (0.98 + k * 0.1), -1.1 + up), (g.strokeStyle = OUT), (g.lineWidth = 0.05), g.stroke());
    }
    for (const lx of [-0.45, 0.45]) (rr(g, lx - 0.25, -0.45, 0.5, 0.45, 0.12), ink(g, '#8a5a30'));
    g.beginPath();
    g.moveTo(-0.95, -0.4);
    g.quadraticCurveTo(-1.1, -1.4, -0.75, -1.85);
    g.quadraticCurveTo(0, -2.2, 0.75, -1.85);
    g.quadraticCurveTo(1.1, -1.4, 0.95, -0.4);
    g.quadraticCurveTo(0, -0.25, -0.95, -0.4);
    g.closePath();
    ink(g, lin(g, 0, -2.1, 0, -0.3, [0, '#d6a46a'], [1, '#9a6a3a']));
    g.save();
    g.clip();
    [['#ff5246', -1.05], ['#3b8dff', -0.8], ['#ffd334', -0.55]].forEach(([c, y], i) => {
      g.beginPath();
      g.moveTo(-1.2, (y as number) + 0.05 * i);
      g.quadraticCurveTo(0, (y as number) - 0.2, 1.2, (y as number) + 0.05);
      g.lineWidth = 0.16;
      g.strokeStyle = c as string;
      g.stroke();
    });
    for (const [px, py] of [[-0.5, -1.6], [0.55, -1.45], [0.2, -1.85]]) (ell(g, px, py, 0.1, 0.07), (g.fillStyle = 'rgba(90,50,20,.35)'), g.fill());
    g.restore();
    // 머리 (눈이 빛남)
    rr(g, -0.42, -2.35, 0.84, 0.55, 0.18);
    ink(g, '#b07a44');
    for (const sd of [-1, 1]) (ell(g, sd * 0.18, -2.08, 0.11, 0.13), ink(g, '#fff6a0', LW * 0.6));
    mouth(g, 0, -1.92, 0.3, pose === 1 ? 2 : 4);
    shine(g, -0.5, -1.7, 0.2, 0.3, 0.4, 0.3);
  },
  narwhal(g, pose) {
    // 파도 일각고래: 짙은 파랑 몸 · 꼬인 뿔 · 몸 아래 하얀 물마루
    g.beginPath();
    g.moveTo(-1.7, 0);
    g.quadraticCurveTo(-1.2, -0.5, -0.7, -0.25);
    g.quadraticCurveTo(-0.2, -0.55, 0.35, -0.25);
    g.quadraticCurveTo(0.9, -0.6, 1.5, -0.2);
    g.quadraticCurveTo(1.8, 0, 1.5, 0.08);
    g.lineTo(-1.7, 0.08);
    g.closePath();
    ink(g, lin(g, 0, -0.6, 0, 0.08, [0, '#ffffff'], [1, '#bfe6ff']));
    g.beginPath();
    g.moveTo(-1.0, -1.0);
    g.quadraticCurveTo(-1.6, -1.1, -1.75, -1.6);
    g.quadraticCurveTo(-1.45, -1.5, -1.3, -1.35);
    g.quadraticCurveTo(-1.25, -1.75, -1.0, -1.8);
    g.quadraticCurveTo(-1.05, -1.4, -0.8, -1.25);
    g.closePath();
    ink(g, '#1d4fa8');
    g.beginPath();
    g.moveTo(-1.05, -1.0);
    g.bezierCurveTo(-1.1, -1.8, -0.2, -2.0, 0.45, -1.85);
    g.bezierCurveTo(1.15, -1.65, 1.35, -1.1, 1.22, -0.72);
    g.bezierCurveTo(1.05, -0.25, 0.4, -0.15, -0.2, -0.2);
    g.bezierCurveTo(-0.75, -0.25, -1.02, -0.55, -1.05, -1.0);
    g.closePath();
    ink(g, lin(g, 0, -1.9, 0, -0.2, [0, '#3f7fe0'], [0.6, '#1f5ec4'], [1, '#174a9e']));
    for (const [fx, fy] of [[0.2, -1.5], [0.45, -1.35], [-0.2, -1.6], [0.7, -1.55], [-0.45, -1.35]]) (ell(g, fx, fy, 0.05, 0.05), (g.fillStyle = 'rgba(220,240,255,.7)'), g.fill());
    ell(g, 0.25, -0.35, 0.7, 0.18);
    g.fillStyle = '#cfe8ff';
    g.fill();
    shine(g, -0.25, -1.62, 0.4, 0.11, -0.15, 0.5);
    // 꼬인 뿔
    g.beginPath();
    g.moveTo(1.05, -1.35);
    g.lineTo(2.0, -2.0 + (pose === 1 ? -0.1 : 0));
    g.lineTo(1.12, -1.18);
    g.closePath();
    ink(g, lin(g, 1, -1.3, 2, -2, [0, '#fff6dc'], [1, '#e8d6a8']), LW * 0.8);
    g.strokeStyle = 'rgba(150,120,70,.7)';
    g.lineWidth = 0.04;
    for (let i = 1; i < 6; i++) (g.beginPath(), g.moveTo(1.08 + i * 0.15, -1.3 - i * 0.1), g.lineTo(1.14 + i * 0.15, -1.18 - i * 0.12), g.stroke());
    eyes(g, 0.82, -1.15, 0.0, 0.16, pose === 2 ? 3 : 5, 0.3);
    mouth(g, 0.95, -0.78, 0.32, pose === 1 ? 1 : 0);
    blush(g, 0.82, -0.92, 0.0, 0.1);
  },
  eagle(g, pose) {
    // 천둥 독수리: 넓게 편 날개 · 번개 깃 끝 · 볏 · 갈고리 부리 (앞에서 본 모습)
    const fl = pose === 1 ? -0.4 : 0;
    for (const sd of [-1, 1]) {
      g.save();
      g.scale(sd, 1);
      g.beginPath();
      g.moveTo(0.3, -1.3);
      g.quadraticCurveTo(1.2, -2.1 + fl, 2.05, -1.95 + fl);
      g.lineTo(1.8, -1.6 + fl * 0.6);
      g.lineTo(2.0, -1.45 + fl * 0.5);
      g.lineTo(1.65, -1.25 + fl * 0.4);
      g.lineTo(1.82, -1.05 + fl * 0.3);
      g.lineTo(1.4, -0.95 + fl * 0.2);
      g.lineTo(1.5, -0.75);
      g.quadraticCurveTo(0.9, -0.85, 0.35, -0.75);
      g.closePath();
      ink(g, lin(g, 0, -2, 0, -0.7, [0, '#ffe46b'], [1, '#e0a01c']));
      g.strokeStyle = 'rgba(160,100,10,.6)';
      g.lineWidth = 0.05;
      for (let i = 0; i < 3; i++) (g.beginPath(), g.moveTo(0.6 + i * 0.35, -1.15), g.lineTo(1.0 + i * 0.32, -1.6 + fl * 0.5 - i * 0.05), g.stroke());
      boltPath(g, 1.95, -2.15 + fl, 0.22);
      ink(g, '#fff6a0', LW * 0.6);
      g.restore();
    }
    g.beginPath();
    g.moveTo(-0.35, -0.35);
    g.lineTo(0, 0.05);
    g.lineTo(0.35, -0.35);
    g.closePath();
    ink(g, '#d49a0a');
    ell(g, 0, -1.0, 0.55, 0.72);
    ink(g, radg(g, -0.15, -1.3, 0.05, 0.9, [0, '#fff0a0'], [0.6, '#f5c02a'], [1, '#c8860a']));
    ell(g, 0, -0.75, 0.32, 0.38);
    g.fillStyle = '#fff7d6';
    g.fill();
    for (const [dx, k] of [[-0.18, 0.28], [0.05, 0.36], [0.26, 0.26]] as [number, number][]) (boltPath(g, dx, -2.0 - k * 0.3, k), ink(g, '#ffe95a', LW * 0.6));
    ell(g, 0, -1.55, 0.42, 0.38);
    ink(g, '#ffd84a');
    eyes(g, 0, -1.6, 0.2, 0.13, pose === 2 ? 3 : 5, 0.05);
    g.beginPath();
    g.moveTo(-0.13, -1.45);
    g.quadraticCurveTo(0, -1.52, 0.13, -1.45);
    g.quadraticCurveTo(0.1, -1.22, 0, -1.15);
    g.quadraticCurveTo(-0.1, -1.22, -0.13, -1.45);
    ink(g, '#ff8a2a', LW * 0.7);
    for (const sd of [-0.2, 0.2]) (g.beginPath(), g.moveTo(sd, -0.3), g.lineTo(sd, 0), (g.strokeStyle = '#ff8a2a'), (g.lineWidth = 0.08), g.stroke());
  },
  rainbow(g, pose) {
    // 무지개 고래: 고래 몸에 무지개 줄 · 반짝이
    g.beginPath();
    g.moveTo(-0.95, -0.85);
    g.quadraticCurveTo(-1.5, -1.0, -1.6, -1.55);
    g.quadraticCurveTo(-1.9, -1.85, -1.95, -2.1);
    g.quadraticCurveTo(-1.6, -1.9, -1.45, -1.7);
    g.quadraticCurveTo(-1.35, -2.0, -1.05, -2.05);
    g.quadraticCurveTo(-1.15, -1.55, -0.8, -1.2);
    g.closePath();
    ink(g, '#ff7ad0');
    const body = () => {
      g.beginPath();
      g.moveTo(-1.05, -0.9);
      g.bezierCurveTo(-1.1, -1.75, -0.2, -1.95, 0.45, -1.8);
      g.bezierCurveTo(1.15, -1.62, 1.35, -1.05, 1.22, -0.62);
      g.bezierCurveTo(1.05, -0.1, 0.4, 0.02, -0.2, 0.0);
      g.bezierCurveTo(-0.75, -0.05, -1.02, -0.4, -1.05, -0.9);
      g.closePath();
    };
    body();
    g.save();
    g.clip();
    ['#ff5246', '#ff9a2a', '#ffd334', '#3fcf5e', '#3b8dff', '#a65cff'].forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect(-1.3, -2.0 + i * 0.34, 2.8, 0.36);
    });
    ell(g, 0.2, -0.05, 1.25, 0.42);
    g.fillStyle = 'rgba(255,255,255,.75)';
    g.fill();
    g.restore();
    body();
    g.strokeStyle = OUT;
    g.lineWidth = LW;
    g.stroke();
    shine(g, -0.2, -1.5, 0.45, 0.13, -0.15, 0.7);
    for (const [sx, sy, k] of [[-0.4, -2.2, 0.16], [0.6, -2.15, 0.12], [1.3, -1.6, 0.1]] as [number, number, number][]) (starPath(g, sx, sy, k, 0.4), ink(g, '#fff6a0', LW * 0.5));
    eyes(g, 0.78, -1.05, 0.0, 0.17, pose === 2 ? 3 : 1, 0.3);
    blush(g, 0.86, -0.78, 0.0, 0.12);
    mouth(g, 0.92, -0.62, 0.38, 1);
  },
};

// ───────────────────────────── 그리기: 색 도둑 (같은 단위 좌표, col = 훔친 색 · 0이면 회색 껍데기) ─────────────────────────────
const INKB: [string, string, string] = ['#5d5880', '#8c87b0', '#3b3658'];
const GRAYC: [string, string, string] = ['#b9b6c6', '#e0dee8', '#8d8a9c'];
const ecol = (col: number): [string, string, string] => (col ? (col === RAIN ? CHEX[8] : CHEX[col]) : GRAYC);
const ebody = (col: number): [string, string, string] => (col ? INKB : ['#a4a1b4', '#cfcddb', '#7d7a90']);
/** 도둑 얼굴: 짓궂은 눈 · 이빨 씩 (회색 껍데기는 어질어질) */
function thiefFace(g: C2, x: number, y: number, k: number, col: number, pose: number) {
  if (!col) return void (eyes(g, x, y, k * 1.1, k * 0.8, 3), mouth(g, x, y + k * 1.1, k * 1.2, 4));
  eyes(g, x, y, k * 1.05, k * 0.82, pose === 1 ? 2 : 0, 0.3);
  mouth(g, x + k * 0.1, y + k * 1.05, k * 1.4, pose === 1 ? 2 : 0);
}
const EPAINT: Record<EK, (g: C2, col: number, pose: number) => void> = {
  blob(g, col, pose) {
    const b = ebody(col), c = ecol(col), sq = pose === 1 ? 0.08 : 0;
    g.beginPath();
    g.moveTo(0, -2.0 + sq);
    g.bezierCurveTo(0.35, -1.6, 1.05 + sq, -1.05, 1.0 + sq, -0.55);
    g.bezierCurveTo(0.95, -0.05, 0.5, 0.02, 0, 0.02);
    g.bezierCurveTo(-0.5, 0.02, -0.95 - sq, -0.05, -1.0 - sq, -0.55);
    g.bezierCurveTo(-1.05 - sq, -1.05, -0.35, -1.6, 0, -2.0 + sq);
    g.closePath();
    ink(g, radg(g, -0.3, -1.1, 0.1, 1.2, [0, b[1]], [0.6, b[0]], [1, b[2]]));
    shine(g, -0.45, -1.05, 0.14, 0.28, 0.4, 0.5);
    // 훔친 물감: 머리 위 물감 방울 + 흘러내림
    splatPath(g, 0.05, -1.7, 0.5, 3, 7);
    ink(g, lin(g, 0, -2.2, 0, -1.3, [0, c[1]], [1, c[0]]), LW * 0.8);
    for (const [dx, L] of [[-0.3, 0.35], [0.28, 0.25]] as [number, number][]) (rr(g, dx - 0.07, -1.5, 0.14, L, 0.07), (g.fillStyle = c[0]), g.fill());
    shine(g, -0.1, -1.85, 0.14, 0.07, -0.3, 0.8);
    thiefFace(g, 0.08, -0.85, 0.24, col, pose);
  },
  bucket(g, col, pose) {
    const b = ebody(col), c = ecol(col), arm = pose === 1 ? -0.55 : 0;
    for (const lx of [-0.45, 0.45]) (rr(g, lx - 0.2, -0.45, 0.4, 0.45, 0.15), ink(g, b[2]));
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.75, -1.15);
      g.quadraticCurveTo(sd * 1.35, -0.95 + arm, sd * 1.25, -0.45 + arm);
      g.lineWidth = 0.36;
      g.strokeStyle = OUT;
      g.stroke();
      g.lineWidth = 0.24;
      g.strokeStyle = b[0];
      g.stroke();
      ell(g, sd * 1.25, -0.42 + arm, 0.22, 0.2);
      ink(g, b[1]);
    }
    ell(g, 0, -0.95, 0.95, 0.82);
    ink(g, radg(g, -0.3, -1.3, 0.1, 1.2, [0, b[1]], [0.65, b[0]], [1, b[2]]));
    ell(g, 0.05, -0.72, 0.55, 0.42);
    g.fillStyle = 'rgba(255,255,255,.12)';
    g.fill();
    thiefFace(g, 0.12, -1.12, 0.22, col, pose);
    // 물감 통 투구 (훔친 색)
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.55, -1.85);
      g.quadraticCurveTo(sd * 0.95, -2.2, sd * 0.85, -2.55);
      g.quadraticCurveTo(sd * 0.7, -2.15, sd * 0.4, -1.95);
      ink(g, '#fff1d0', LW * 0.8);
    }
    g.beginPath();
    g.moveTo(-0.78, -1.45);
    g.lineTo(-0.62, -2.35);
    g.lineTo(0.62, -2.35);
    g.lineTo(0.78, -1.45);
    g.closePath();
    ink(g, lin(g, -0.8, 0, 0.8, 0, [0, c[2]], [0.35, c[0]], [0.7, c[1]], [1, c[0]]));
    ell(g, 0, -2.35, 0.62, 0.14);
    ink(g, c[2], LW * 0.8);
    rr(g, -0.82, -1.58, 1.64, 0.2, 0.08);
    ink(g, '#d8d4e6', LW * 0.7);
    g.beginPath();
    g.arc(0, -2.35, 0.55, Math.PI * 1.1, Math.PI * 1.9);
    g.strokeStyle = OUT;
    g.lineWidth = 0.06;
    g.stroke();
    for (const [dx, L] of [[-0.45, 0.4], [0.1, 0.55], [0.5, 0.3]] as [number, number][]) (rr(g, dx - 0.08, -1.45, 0.16, L, 0.08), (g.fillStyle = c[0]), g.fill());
    shine(g, -0.35, -2.0, 0.1, 0.28, 0.1, 0.5);
  },
  kite(g, col, pose) {
    const c = ecol(col), b = ebody(col), tilt = pose === 1 ? 0.12 : -0.05;
    g.save();
    g.translate(0, -1.2);
    g.rotate(tilt);
    // 꼬리 리본
    g.beginPath();
    g.moveTo(0, 1.0);
    g.quadraticCurveTo(-0.4, 1.4, 0.1, 1.7);
    g.quadraticCurveTo(0.5, 2.0, -0.1, 2.3);
    g.strokeStyle = OUT;
    g.lineWidth = 0.05;
    g.stroke();
    for (const [bx, by] of [[-0.15, 1.42], [0.25, 1.85]]) {
      g.beginPath();
      g.moveTo(bx - 0.18, by - 0.12);
      g.lineTo(bx + 0.18, by + 0.12);
      g.lineTo(bx + 0.18, by - 0.12);
      g.lineTo(bx - 0.18, by + 0.12);
      g.closePath();
      ink(g, c[1], LW * 0.5);
    }
    g.beginPath();
    g.moveTo(0, -1.15);
    g.lineTo(1.0, -0.1);
    g.lineTo(0, 1.05);
    g.lineTo(-1.0, -0.1);
    g.closePath();
    ink(g, lin(g, -1, -1, 1, 1, [0, c[1]], [0.5, c[0]], [1, c[2]]));
    g.beginPath();
    g.moveTo(0, -1.15);
    g.lineTo(0, 1.05);
    g.moveTo(-1.0, -0.1);
    g.lineTo(1.0, -0.1);
    g.strokeStyle = 'rgba(80,50,30,.6)';
    g.lineWidth = 0.06;
    g.stroke();
    g.restore();
    // 연 위에 탄 꼬마 도둑 (고글)
    ell(g, 0.05, -1.55, 0.42, 0.38);
    ink(g, radg(g, -0.1, -1.7, 0.05, 0.5, [0, b[1]], [1, b[0]]));
    rr(g, -0.38, -1.78, 0.86, 0.22, 0.1);
    ink(g, '#ffb02e', LW * 0.6);
    for (const sd of [-1, 1]) (ell(g, 0.05 + sd * 0.2, -1.67, 0.13, 0.12), ink(g, col ? '#cfeaff' : '#e0e0e0', LW * 0.5));
    if (!col) eyes(g, 0.05, -1.67, 0.2, 0.1, 3);
    mouth(g, 0.08, -1.38, 0.24, pose === 1 ? 2 : 0);
    for (const sd of [-1, 1]) (ell(g, sd * 0.42, -1.25, 0.12, 0.1), ink(g, b[1], LW * 0.6));
  },
  crayon(g, col, pose) {
    const c = ecol(col), step = pose === 1 ? 0.06 : 0;
    for (const lx of [-0.28, 0.28]) (rr(g, lx - 0.13, -0.38 - (lx > 0 ? step : 0), 0.26, 0.38, 0.1), ink(g, '#4a4566'));
    // 크레용 몸 (훔친 색)
    g.beginPath();
    g.moveTo(-0.55, -0.3);
    g.lineTo(-0.55, -1.75);
    g.lineTo(-0.3, -2.0);
    g.lineTo(0, -2.55);
    g.lineTo(0.3, -2.0);
    g.lineTo(0.55, -1.75);
    g.lineTo(0.55, -0.3);
    g.closePath();
    ink(g, lin(g, -0.55, 0, 0.55, 0, [0, c[2]], [0.35, c[0]], [0.65, c[1]], [1, c[0]]));
    rr(g, -0.58, -1.35, 1.16, 0.62, 0.05);
    ink(g, '#fff6e6', LW * 0.7);
    g.strokeStyle = c[0];
    g.lineWidth = 0.07;
    for (const y of [-1.25, -0.82]) (g.beginPath(), g.moveTo(-0.5, y), g.lineTo(0.5, y), g.stroke());
    thiefFace(g, 0.05, -1.08, 0.17, col, pose);
    // 회색 방패 + 창
    g.beginPath();
    g.moveTo(0.95, -2.2);
    g.lineTo(0.95, -0.2);
    g.strokeStyle = OUT;
    g.lineWidth = 0.12;
    g.stroke();
    g.beginPath();
    g.moveTo(0.95, -2.55);
    g.lineTo(1.12, -2.18);
    g.lineTo(0.78, -2.18);
    g.closePath();
    ink(g, '#d8d4e6', LW * 0.6);
    ell(g, 0.62, -0.95, 0.5, 0.62);
    ink(g, radg(g, 0.5, -1.1, 0.05, 0.65, [0, '#e8e6f0'], [0.7, '#a9a6bb'], [1, '#7d7a90']));
    ell(g, 0.62, -0.95, 0.32, 0.42);
    g.strokeStyle = 'rgba(60,50,90,.6)';
    g.lineWidth = 0.06;
    g.stroke();
    splatPath(g, 0.62, -0.95, 0.15, 7, 5);
    g.fillStyle = '#4e4a68';
    g.fill();
  },
  shell(g, col, pose) {
    const c = ecol(col), b = ebody(col), st = pose === 1 ? 0.06 : 0;
    // 몸 (달팽이)
    g.beginPath();
    g.moveTo(-1.15, 0);
    g.quadraticCurveTo(-1.2, -0.35, -0.6, -0.4);
    g.lineTo(0.85, -0.45);
    g.quadraticCurveTo(1.25, -0.6, 1.2, -1.0);
    g.quadraticCurveTo(1.5, -1.0, 1.4, -0.3);
    g.quadraticCurveTo(1.3, 0.02, 0.6, 0.02);
    g.closePath();
    ink(g, lin(g, 0, -1, 0, 0, [0, b[1]], [1, b[0]]));
    for (const sd of [0, 1]) {
      g.beginPath();
      g.moveTo(1.2 + sd * 0.12, -0.95);
      g.lineTo(1.25 + sd * 0.28, -1.5 - st);
      g.strokeStyle = OUT;
      g.lineWidth = 0.07;
      g.stroke();
      ell(g, 1.25 + sd * 0.28, -1.55 - st, 0.13, 0.13);
      ink(g, '#ffffff', LW * 0.5);
      ell(g, 1.28 + sd * 0.28, -1.53 - st, 0.06, 0.07);
      g.fillStyle = col ? '#251c35' : '#777';
      g.fill();
    }
    mouth(g, 1.32, -0.6, 0.2, col ? 2 : 4);
    // 굳은 물감 껍데기 (훔친 색, 반짝)
    ell(g, -0.1, -1.0, 0.95, 0.88);
    ink(g, radg(g, -0.4, -1.4, 0.05, 1.1, [0, c[1]], [0.55, c[0]], [1, c[2]]));
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = i * 0.36, q = 0.08 + i * 0.019;
      const px = -0.1 + Math.cos(a) * q * 0.95, py = -1.0 + Math.sin(a) * q * 0.88;
      if (i) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.strokeStyle = 'rgba(40,30,60,.45)';
    g.lineWidth = 0.08;
    g.stroke();
    shine(g, -0.5, -1.45, 0.3, 0.14, -0.6, 0.65);
  },
  brush(g, col, pose) {
    const c = ecol(col), b = ebody(col), lean = pose === 1 ? 0.15 : 0;
    g.save();
    g.translate(0, -0.55);
    g.rotate(-0.18 - lean);
    // 붓 (자루 · 쇠 띠 · 훔친 색 털)
    rr(g, -1.4, -0.11, 1.7, 0.22, 0.1);
    ink(g, lin(g, 0, -0.1, 0, 0.1, [0, '#e8b070'], [1, '#b0703a']));
    rr(g, 0.25, -0.17, 0.32, 0.34, 0.05);
    ink(g, '#d8d4e6', LW * 0.7);
    g.beginPath();
    g.moveTo(0.55, -0.2);
    g.quadraticCurveTo(1.05, -0.32, 1.45, 0);
    g.quadraticCurveTo(1.05, 0.32, 0.55, 0.2);
    g.closePath();
    ink(g, lin(g, 0.5, 0, 1.45, 0, [0, c[2]], [0.5, c[0]], [1, c[1]]));
    g.restore();
    // 붓에 탄 도깨비
    ell(g, -0.25, -1.15, 0.5, 0.5);
    ink(g, radg(g, -0.4, -1.3, 0.05, 0.6, [0, b[1]], [1, b[0]]));
    for (const sd of [-1, 1]) (g.beginPath(), g.moveTo(-0.25 + sd * 0.25, -1.55), g.lineTo(-0.25 + sd * 0.42, -1.95), g.lineTo(-0.25 + sd * 0.08, -1.62), ink(g, b[2], LW * 0.7));
    thiefFace(g, -0.15, -1.2, 0.16, col, pose);
    g.strokeStyle = 'rgba(255,255,255,.8)';
    g.lineWidth = 0.08;
    for (let i = 0; i < 3; i++) (g.beginPath(), g.moveTo(-1.2 - i * 0.15, -0.9 + i * 0.25), g.lineTo(-1.75 - i * 0.15, -0.9 + i * 0.25), g.stroke());
  },
  balloon(g, col, pose) {
    const c = ecol(col), b = ebody(col), sw = pose === 1 ? 0.1 : -0.05;
    g.beginPath();
    g.moveTo(0, -1.45);
    g.quadraticCurveTo(0.15 + sw, -1.15, 0, -0.95);
    g.strokeStyle = OUT;
    g.lineWidth = 0.05;
    g.stroke();
    ell(g, 0, -2.2, 0.72, 0.8);
    ink(g, radg(g, -0.25, -2.5, 0.05, 0.9, [0, c[1]], [0.6, c[0]], [1, c[2]]));
    g.beginPath();
    g.moveTo(-0.12, -1.38);
    g.lineTo(0.12, -1.38);
    g.lineTo(0, -1.5);
    g.closePath();
    ink(g, c[2], LW * 0.5);
    shine(g, -0.3, -2.5, 0.12, 0.25, 0.4, 0.8);
    ell(g, 0, -0.65, 0.45, 0.42);
    ink(g, radg(g, -0.15, -0.8, 0.05, 0.5, [0, b[1]], [1, b[0]]));
    thiefFace(g, 0.05, -0.68, 0.14, col, pose);
    for (const sd of [-1, 1]) (g.beginPath(), g.moveTo(sd * 0.3, -0.92), g.lineTo(sd * 0.08, -1.0), (g.strokeStyle = OUT), (g.lineWidth = 0.08), g.stroke());
    ell(g, 0.5, -0.32, 0.2, 0.2);
    ink(g, '#3b3658', LW * 0.6);
    g.beginPath();
    g.moveTo(0.55, -0.5);
    g.lineTo(0.62, -0.62);
    g.strokeStyle = '#ffb02e';
    g.lineWidth = 0.05;
    g.stroke();
  },
  tower(g, col) {
    const c = ecol(col);
    // 먹물 굴뚝 (먹물 병): 짙은 유리병 · 훔친 색 꼬리표 · 먹물 연기
    g.beginPath();
    g.moveTo(-0.85, 0);
    g.lineTo(-0.95, -1.3);
    g.quadraticCurveTo(-0.95, -1.75, -0.45, -1.85);
    g.lineTo(-0.35, -2.25);
    g.lineTo(0.35, -2.25);
    g.lineTo(0.45, -1.85);
    g.quadraticCurveTo(0.95, -1.75, 0.95, -1.3);
    g.lineTo(0.85, 0);
    g.closePath();
    ink(g, lin(g, -0.9, 0, 0.9, 0, [0, '#2e2a48'], [0.4, '#4e4a72'], [1, '#2a2640']));
    rr(g, -0.42, -2.5, 0.84, 0.3, 0.06);
    ink(g, '#8a7a66', LW * 0.8);
    rr(g, -0.6, -1.25, 1.2, 0.65, 0.08);
    ink(g, '#fff6e6', LW * 0.7);
    splatPath(g, 0, -0.93, 0.25, 11, 6);
    ink(g, c[0], LW * 0.5);
    shine(g, -0.6, -1.4, 0.1, 0.4, 0, 0.35);
    eyes(g, 0, -1.55, 0.25, 0.12, col ? 2 : 3);
  },
  rainbow(g, _col, pose) {
    const b = ['#ffffff', '#ffffff', '#d8dcf6'];
    g.beginPath();
    g.moveTo(0, -1.9);
    g.bezierCurveTo(0.4, -1.55, 0.95, -1.05, 0.92, -0.55);
    g.bezierCurveTo(0.88, -0.05, 0.45, 0.02, 0, 0.02);
    g.bezierCurveTo(-0.45, 0.02, -0.88, -0.05, -0.92, -0.55);
    g.bezierCurveTo(-0.95, -1.05, -0.4, -1.55, 0, -1.9);
    g.closePath();
    ink(g, radg(g, -0.3, -1.1, 0.1, 1.2, [0, b[0]], [0.7, b[1]], [1, b[2]]));
    // 무지개 목도리 (휘날림)
    const cols = ['#ff5246', '#ff9a2a', '#ffd334', '#3fcf5e', '#3b8dff', '#a65cff'];
    cols.forEach((cc, i) => {
      g.beginPath();
      g.moveTo(-0.85, -0.95 + i * 0.07);
      g.quadraticCurveTo(0, -0.75 + i * 0.07, 0.85, -0.95 + i * 0.07);
      g.lineWidth = 0.08;
      g.strokeStyle = cc;
      g.stroke();
      g.beginPath();
      g.moveTo(-0.8, -0.92 + i * 0.07);
      g.quadraticCurveTo(-1.3, -1.0 + i * 0.1 + (pose ? 0.15 : 0), -1.7, -1.2 + i * 0.12 + (pose ? 0.25 : 0));
      g.stroke();
    });
    eyes(g, 0.1, -1.25, 0.28, 0.2, 4, 0.4);
    mouth(g, 0.12, -1.0, 0.25, 4);
    for (const [sx, sy] of [[-0.6, -1.75], [0.75, -1.6]]) (starPath(g, sx, sy, 0.18, 0.4), ink(g, '#fff6a0', LW * 0.5));
  },
  inkboss(g, _col, pose) {
    // 대장 먹물 문어: 커다란 먹물 머리 · 성난 눈 · 다리 여섯 (두른 색은 따로 그린다)
    for (let i = 0; i < 6; i++) {
      const x0 = -0.7 + i * 0.28, sd = i < 3 ? -1 : 1, cx = x0 + sd * 0.6, wv = pose === 1 ? 0.15 * ((i % 2) * 2 - 1) : 0;
      g.beginPath();
      g.moveTo(x0 - 0.16, -0.8);
      g.quadraticCurveTo(x0 + sd * 0.1, -0.1 + wv, cx, -0.05);
      g.quadraticCurveTo(cx + sd * 0.35, -0.15, cx + sd * 0.22, -0.4);
      g.quadraticCurveTo(cx - sd * 0.05, -0.3, x0 + 0.16, -0.8);
      g.closePath();
      ink(g, i % 2 ? '#3b3658' : '#4e4a72');
      for (let k = 0; k < 3; k++) (ell(g, x0 + sd * (0.1 + k * 0.15), -0.55 + k * 0.17, 0.05, 0.05), (g.fillStyle = '#8c87b0'), g.fill());
    }
    g.beginPath();
    g.moveTo(-0.95, -0.75);
    g.bezierCurveTo(-1.15, -1.95, -0.5, -2.45, 0, -2.45);
    g.bezierCurveTo(0.5, -2.45, 1.15, -1.95, 0.95, -0.75);
    g.quadraticCurveTo(0, -0.5, -0.95, -0.75);
    g.closePath();
    ink(g, radg(g, -0.3, -1.9, 0.1, 1.5, [0, '#8c87b0'], [0.5, '#4e4a72'], [1, '#2e2a48']), LW * 1.2);
    shine(g, -0.4, -2.05, 0.28, 0.14, -0.4, 0.4);
    // 먹물 왕관 방울
    for (let i = -2; i <= 2; i++) (splatPath(g, i * 0.28, -2.45 - (2 - Math.abs(i)) * 0.06, 0.13, 20 + i, 5), ink(g, '#2e2a48', LW * 0.6));
    eyes(g, 0, -1.45, 0.38, 0.27, pose === 2 ? 3 : 5, 0.1);
    mouth(g, 0.05, -1.02, 0.5, pose === 1 ? 2 : 2);
  },
  giant(g, _col, pose) {
    // 대장 물감 통 거인: 회색 통을 쌓은 몸 · 큰 팔 (두른 색 통은 따로 그린다)
    const arm = pose === 1 ? -0.3 : 0;
    for (const lx of [-0.45, 0.45]) (rr(g, lx - 0.25, -0.5, 0.5, 0.5, 0.1), ink(g, '#6e6a86'));
    for (const sd of [-1, 1]) {
      rr(g, sd * 0.95 - 0.22, -1.65 + arm, 0.44, 1.0, 0.18);
      ink(g, '#8d8a9c');
      ell(g, sd * 0.95, -0.6 + arm, 0.3, 0.26);
      ink(g, '#a4a1b4');
    }
    const can = (y: number, w: number, hh: number) => {
      rr(g, -w / 2, y - hh, w, hh, 0.08);
      ink(g, lin(g, -w / 2, 0, w / 2, 0, [0, '#7d7a90'], [0.4, '#b9b6c6'], [1, '#7d7a90']));
      ell(g, 0, y - hh, w / 2, 0.1);
      ink(g, '#9a98aa', LW * 0.7);
    };
    can(-0.45, 1.5, 0.75);
    can(-1.25, 1.3, 0.7);
    can(-1.95, 1.0, 0.6);
    eyes(g, 0, -2.25, 0.25, 0.17, pose === 2 ? 3 : 5, 0.1);
    mouth(g, 0, -2.0, 0.35, 2);
    for (let i = 0; i < 3; i++) (rr(g, -0.5 + i * 0.4, -1.0, 0.14, 0.4 + (i % 2) * 0.2, 0.07), (g.fillStyle = '#6e6a86'), g.fill());
  },
  king(g, _col, pose) {
    // 대장 회색 왕: 긴 망토 · 왕관 · 홀 (두른 색 보석은 따로 그린다)
    g.beginPath();
    g.moveTo(-1.15, 0);
    g.quadraticCurveTo(-1.05, -1.4, -0.55, -1.75);
    g.lineTo(0.55, -1.75);
    g.quadraticCurveTo(1.05, -1.4, 1.15, 0);
    g.closePath();
    ink(g, lin(g, 0, -1.8, 0, 0, [0, '#8d8a9c'], [1, '#5d5a70']), LW * 1.1);
    g.strokeStyle = '#e8e6f0';
    g.lineWidth = 0.14;
    g.beginPath();
    g.moveTo(-1.12, -0.05);
    g.lineTo(1.12, -0.05);
    g.stroke();
    ell(g, 0, -1.1, 0.5, 0.7);
    ink(g, '#b9b6c6');
    ell(g, 0, -2.1, 0.5, 0.48);
    ink(g, radg(g, -0.15, -2.25, 0.05, 0.55, [0, '#d8d6e0'], [1, '#9a98aa']));
    // 회색 수염
    g.beginPath();
    g.moveTo(-0.35, -1.95);
    g.quadraticCurveTo(0, -1.25, 0.35, -1.95);
    g.quadraticCurveTo(0, -1.75, -0.35, -1.95);
    ink(g, '#e8e6f0', LW * 0.7);
    eyes(g, 0, -2.18, 0.2, 0.12, pose === 2 ? 3 : 5, 0.05);
    // 왕관
    g.beginPath();
    g.moveTo(-0.45, -2.45);
    g.lineTo(-0.52, -2.95);
    g.lineTo(-0.25, -2.7);
    g.lineTo(0, -3.05);
    g.lineTo(0.25, -2.7);
    g.lineTo(0.52, -2.95);
    g.lineTo(0.45, -2.45);
    g.closePath();
    ink(g, lin(g, 0, -3, 0, -2.45, [0, '#e8e6f0'], [1, '#9a98aa']));
    g.beginPath();
    g.moveTo(1.0, -2.5 + (pose === 1 ? -0.2 : 0));
    g.lineTo(1.05, -0.4);
    g.strokeStyle = OUT;
    g.lineWidth = 0.12;
    g.stroke();
    starPath(g, 1.0, -2.6 + (pose === 1 ? -0.2 : 0), 0.22, 0.45);
    ink(g, '#d8d6e0', LW * 0.6);
  },
};

// ───────────────────────────── 그리기: 스티커 굽기 ─────────────────────────────
/** 스티커 상자(단위): 가로 SW · 세로 SH · 발 가운데 위치 */
const SW = 4.6, SH = 4.3, SOX = 2.3, SOY = 3.5;
const SPR = new Map<string, HTMLCanvasElement>();
/** 스티커 캔버스 메모리: 오래 안 쓴 것부터 내보낸다 (폰의 캔버스 메모리 한도 안에서) */
let SPR_BYTES = 0;
const SPR_BUDGET = 120e6;
function sprPut(key: string, c: HTMLCanvasElement) {
  const old = SPR.get(key);
  if (old) (SPR_BYTES -= old.width * old.height * 4), SPR.delete(key);
  SPR.set(key, c);
  SPR_BYTES += c.width * c.height * 4;
  for (const [k, o] of SPR) {
    if (SPR_BYTES <= SPR_BUDGET || k === key) break;
    SPR.delete(k);
    SPR_BYTES -= o.width * o.height * 4;
  }
}
/** 다 그린 큰 스티커는 빈 가장자리를 뺀 작은 캔버스로 바꿔 둔다 (메모리 반쯤) */
const SHRUNK = new WeakMap<HTMLCanvasElement, [number, number, number, number]>();
function shrink(key: string) {
  const c = SPR.get(key), k = c && CROP.get(c);
  if (!c || !k || typeof document === 'undefined') return;
  const n = document.createElement('canvas');
  (n.width = k[2]), (n.height = k[3]);
  n.getContext('2d')!.drawImage(c, k[0], k[1], k[2], k[3], 0, 0, k[2], k[3]);
  SHRUNK.set(n, [k[0], k[1], c.width, c.height]);
  sprPut(key, n);
}
function bake(key: string, q: number, paint: (g: C2) => void): HTMLCanvasElement {
  let c = SPR.get(key);
  if (c) (SPR.delete(key), SPR.set(key, c));
  else {
    c = layer(SW * q, SH * q, 1, (g) => {
      g.translate(SOX * q, SOY * q);
      g.scale(q, q);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      paint(g);
    });
    cropUnit(c, key.slice(0, key.lastIndexOf(':')), q, paint);
    sprPut(key, c);
  }
  return c;
}
/** 모양(크기 빼고)마다 한 번, 작게 구워서 찾은 빈 가장자리(단위 좌표) — 큰 스티커는 이걸 크기만 키워 쓴다 */
const UBOX = new Map<string, [number, number, number, number] | null>();
function cropUnit(c: HTMLCanvasElement, shape: string, q: number, paint: (g: C2) => void) {
  let ub = UBOX.get(shape);
  if (ub === undefined) {
    const pq = 32, probe = layer(SW * pq, SH * pq, 1, (g) => {
      g.translate(SOX * pq, SOY * pq);
      g.scale(pq, pq);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      paint(g);
    });
    crop(probe);
    const k = CROP.get(probe);
    ub = k ? [k[0] / pq, k[1] / pq, (k[0] + k[2]) / pq, (k[1] + k[3]) / pq] : null;
    UBOX.set(shape, ub);
  }
  if (!ub) return;
  // (시작 칸은 짝수로 — 홀수 칸에서 자르면 섞는 자리가 반 칸 어긋나 가장자리가 아주 조금 달라진다)
  const m = Math.ceil(q / 32) * 2 + 2, x0 = Math.max(0, (Math.floor(ub[0] * q) - m) & ~1), y0 = Math.max(0, (Math.floor(ub[1] * q) - m) & ~1);
  const x1 = Math.min(c.width, Math.ceil(ub[2] * q) + m), y1 = Math.min(c.height, Math.ceil(ub[3] * q) + m);
  CROP.set(c, [x0, y0, x1 - x0, y1 - y0]);
}
/** 스티커의 빈 가장자리를 잘라 둔다 (찍을 때 투명한 칸까지 섞지 않게 — 느린 폰에서 그리기가 반으로) */
const CROP = new WeakMap<HTMLCanvasElement, [number, number, number, number]>();
function crop(c: HTMLCanvasElement) {
  const g = c.getContext('2d');
  if (!g || typeof g.getImageData !== 'function') return;
  const W = c.width, H = c.height, a = g.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    const row = y * W * 4;
    let l = -1;
    for (let x = 0; x < W; x++) if (a[row + x * 4 + 3]) { l = x; break; }
    if (l < 0) continue;
    let r = l;
    for (let x = W - 1; x > l; x--) if (a[row + x * 4 + 3]) { r = x; break; }
    if (l < x0) x0 = l;
    if (r > x1) x1 = r;
    if (y < y0) y0 = y;
    y1 = y;
  }
  if (x1 < 0) return CROP.set(c, [0, 0, 1, 1]);
  // 두 칸 여유 (가장자리 섞기가 그대로 나오게)
  (x0 = Math.max(0, x0 - 2)), (y0 = Math.max(0, y0 - 2)), (x1 = Math.min(W, x1 + 3)), (y1 = Math.min(H, y1 + 3));
  CROP.set(c, [x0, y0, x1 - x0, y1 - y0]);
}
/** 스티커 해상도는 약 15%씩 끊어서 (단계가 바뀔 때마다 새로 굽지 않게) */
const qOf = (px: number) => Math.max(6, Math.round(Math.pow(2, Math.round(Math.log2(Math.max(6, px)) * 5) / 5)));
const WARM = new Map<string, [string, () => HTMLCanvasElement | void][]>(), WARM_CORE = new Map<string, number>();
/** 띠·글자에 쓰는 굵기·크기의 한글 글꼴을 처음 한 번 데워 둔다 (첫 톡에 글꼴 찾기가 몰리지 않게) */
let FONTS_WARM = false;
function warmFonts(w: number) {
  if (FONTS_WARM || typeof document === 'undefined') return;
  FONTS_WARM = true;
  const c = document.createElement('canvas');
  (c.width = 48), (c.height = 24);
  const g = c.getContext('2d')!;
  // (판 중에 처음 쓰이는 글꼴: 이름표 · 큰 순간 띠)
  for (const [sz, wt] of [[0.034, 900], [0.06, 900]] as const) (g.font = `${wt} ${Math.max(12, Math.round(w * sz))}px system-ui, sans-serif`), g.fillText('불 사자!', 0, 12);
  return c;
}
function warmWords(w: number, sz: number, wt: number, words: string) {
  if (typeof document === 'undefined') return;
  const c = document.createElement('canvas');
  (c.width = 64), (c.height = 24);
  const g = c.getContext('2d')!;
  g.font = `${wt} ${Math.max(12, Math.round(w * sz))}px system-ui, sans-serif`;
  for (const q of words.split(' ')) g.measureText(q), g.fillText(q, 0, 12);
  return c;
}
/** 구웠지만 아직 다 그리지 않은 스티커 하나 (다음 여유 프레임에 그려 둔다) */
let WARM_PEND: HTMLCanvasElement | null = null, WARM_KEY = '';
/** 곧 될 모습의 스티커·글자가 다 구워진 (도둑 색 · 지금 모습) 조합 */
const SOON_OK = new Set<string>();
/** 이 판(stage, 정령 레벨)에 나올 글꼴·띠 글자 · 도둑(색·회색 · 몸짓) · 될 수 있는 모습(1~5단계 · 몸짓 셋)의 미리 굽기 목록 (앞쪽 WARM_CORE개는 판 중에도, 나머지는 결과·선물 화면에서만) */
function warmList(stage: number, lv: number, w: number, sc: number): [string, () => HTMLCanvasElement | void][] {
  const wkey = `${stage}:${lv}:${w}:${sc}`;
  let list = WARM.get(wkey);
  if (list) return list;
  if (WARM.size > 8) WARM.clear();
  const d = STAGES[stage], kinds = new Set<EK>();
  list = [];
  for (const gp of d.groups) for (const [k] of gp.f) kinds.add(k);
  if (d.summon) for (const [k] of d.summon) kinds.add(k);
  kinds.add('blob');
  const push = (key: string, make: () => HTMLCanvasElement | void) => list!.push([key, make]);
  const form = (f: FK, tier: number, pose: number, white = false) => {
    const px = w * FD[f].r * (white ? 1 : (f === 'white' ? 1 : 1 + 0.12 * (tier - 1)) * (1 + 0.012 * (lv - 1))) * sc * 1.05;
    push(`f:${f}:${pose}:${qOf(px)}`, () => formSprite(f, pose, px));
  };
  if (!FONTS_WARM) push('font', () => warmFonts(w));
  // 이 판 아래 띠에 나올 글자들 (처음 쓰는 한글 글자는 글꼴 찾기가 느리다 — 톡 순간에 몰리지 않게 한 줄씩 미리)
  {
    const foes = [...kinds, d.newFoe, d.boss].filter((k): k is EK => !!k).map((k) => `${ED[k].name}: ${ED[k].line}`);
    const tips = [`${d.name}: ${d.news}`, ...starWords({ stage } as SoulState), ...foes, '하얀 맨몸! 아무 색 도둑이나 톡 — 맞으면 하트 -1', '헐거워진 대장 색을 톡 — 대장은 작아지고 나는 커져요!', '같은 색을 또 먹으면 더 커지고 점수 ×1.5, ×2…'];
    const names = ['하얀 정령 (맨몸)', ...DEX.filter((f) => UNLOCK_AT[f] <= stage).map((f) => FD[f].name)];
    const tags = ['1단계 · 점수 ×1 ×1.5', '2단계 3단계 ×2 ×2.5', '4단계 5단계 ×3'];
    for (const [sz, wt, list] of [[0.033, 800, tips], [0.038, 900, names], [0.033, 900, tags]] as const)
      list.forEach((str, j) => push(`t:${stage}:${sz}:${wt}:${j}`, () => warmWords(w, sz, wt, str)));
  }
  for (const pose of [0, 1, 2]) form('white', 1, pose), form('white', 1, pose, true);
  const key = d.star.k !== 'time' && d.star.f ? d.star.f : null;
  if (key) for (let tier = 1; tier <= 5; tier++) for (const pose of [0, 1, 2]) form(key, tier, pose);
  for (const k of kinds)
    for (const col of [...new Set(d.cols), 0])
      for (const pose of col ? [0, 1] : [2]) {
        const px = w * ED[k].r * EDRAW * sc * 1.05, q = qOf(px);
        push(`e:${k}:${col}:${pose}:${q}`, () => foeSprite(k, col, pose, px));
      }
  if (d.boss)
    for (const pose of [0, 1, 2]) {
      const px = w * ED[d.boss].r * EDRAW * sc * 1.05;
      push(`e:${d.boss}:0:${pose}:${qOf(px)}`, () => foeSprite(d.boss!, 0, pose, px));
    }
  for (const gp of [...d.groups, { champ: d.early }])
    if (gp.champ) {
      const k = gp.champ, st = d.star, col = st.k !== 'time' && st.f ? (FD[st.f].mask === RAIN ? R : FD[st.f].mask) : R, px = w * ED[k].r * 1.45 * EDRAW * sc * 1.05;
      for (const [c, pose] of [[col, 0], [col, 1], [0, 2]]) push(`e:${k}:${c}:${pose}:${qOf(px)}`, () => foeSprite(k, c, pose, px));
    }
  const forms = DEX.filter((f) => UNLOCK_AT[f] <= stage);
  // 여기까지가 판 중에도 굽는 것 — 아래(모든 모습 × 다섯 단계)는 결과·선물 화면에서만 (판 중엔 곧 될 모습만 골라 굽는다)
  WARM_CORE.set(wkey, list.length);
  // 띠의 작은 그림 · 머리 위 말풍선 실루엣
  for (const f of ['white' as FK, ...forms])
    for (const u of [0.016, 0.018]) {
      const px = w * u * sc * 1.05;
      push(`f:${f}:0:${qOf(px)}`, () => formSprite(f, 0, px));
    }
  for (const f of forms) {
    const fill = CHEX[FD[f].mask === RAIN ? 8 : FD[f].mask][0], px = w * 0.036 * 0.46 * sc * 2;
    push(`s:${f}:${fill}:${qOf(px)}`, () => silhouette(f, fill, px));
    push(`w:${f}`, () => (bigWord(`${FD[f].name}!`, FD[f].mask, w, sc), subWord(FD[f].does, w, sc).c));
  }
  for (let tier = 1; tier <= 5; tier++) for (const f of forms) for (const pose of [0, 1, 2]) form(f, tier, pose);
  WARM.set(wkey, list);
  return list;
}
const formSprite = (f: FK, pose: number, px: number) => bake(`f:${f}:${pose}:${qOf(px)}`, qOf(px), (g) => FPAINT[f](g, pose));
const foeSprite = (k: EK, col: number, pose: number, px: number) => bake(`e:${k}:${col}:${pose}:${qOf(px)}`, qOf(px), (g) => EPAINT[k](g, col, pose));
/** 될 모습의 실루엣 (말풍선 속 · 도감의 빈칸) */
function silhouette(f: FK, fill: string, px: number): HTMLCanvasElement {
  const q = qOf(px), key = `s:${f}:${fill}:${q}`;
  let c = SPR.get(key);
  if (!c) {
    c = layer(SW * q, SH * q, 1, (g) => {
      g.save();
      g.translate(SOX * q, SOY * q);
      g.scale(q, q);
      g.lineJoin = 'round';
      FPAINT[f](g, 0);
      g.restore();
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = fill;
      g.fillRect(0, 0, SW * q, SH * q);
    });
    crop(c);
    sprPut(key, c);
  }
  return c;
}
/** 스티커 찍기: 지금 원점 = 발 가운데, u = 화면에서 몸 반지름 px */
function stamp(ctx: C2, c: HTMLCanvasElement, u: number) {
  const z = SHRUNK.get(c);
  if (z) {
    const fx = (SW * u) / z[2], fy = (SH * u) / z[3];
    return void ctx.drawImage(c, -SOX * u + z[0] * fx, -SOY * u + z[1] * fy, c.width * fx, c.height * fy);
  }
  const k = CROP.get(c);
  if (!k) return void ctx.drawImage(c, -SOX * u, -SOY * u, SW * u, SH * u);
  const fx = (SW * u) / c.width, fy = (SH * u) / c.height;
  ctx.drawImage(c, k[0], k[1], k[2], k[3], -SOX * u + k[0] * fx, -SOY * u + k[1] * fy, k[2] * fx, k[3] * fy);
}

// ───────────────────────────── 그리기: 회색 그림책 마을 (색 그림을 굽고 회색으로 보이다가, 물감이 닿은 자리만 색이 돌아온다) ─────────────────────────────
/** 타일 하나의 세로 길이(가로 폭 단위) */
const TH = 0.5;
interface Pal { ground: [string, string]; stone: string[]; walk: string; roof: string[]; wall: string[]; tree: string[]; flower: string[]; edge: string }
const PALS: Pal[] = [
  { ground: ['#f4e2bf', '#ecd3a4'], stone: ['#f6e6c6', '#efd8ae', '#f3dfb8', '#e8cc9a', '#f8ead0'], walk: '#9fd86a', roof: ['#ff6b5a', '#4f9dff', '#ffc93c', '#7ed46a', '#ff8fc4'], wall: ['#fff3dc', '#ffe8c4', '#f4f0ff', '#e6f7ff'], tree: ['#5cc14a', '#3e9e3a', '#8ad86a'], flower: ['#ff5a7a', '#ffd23f', '#ff9a3c', '#c77dff', '#4fc3f7'], edge: '#7cbf4e' },
  { ground: ['#f0dfba', '#e6cfa2'], stone: ['#f3e3c2', '#ead5ac', '#f6e9cc', '#e2c996'], walk: '#8fd65e', roof: ['#ff7a5c', '#a35cff', '#ffcc33', '#3fcf9e'], wall: ['#fff6e6', '#ffeacc', '#eaf6ff'], tree: ['#4fb84a', '#2f9a44', '#7fd65a'], flower: ['#ff6b9a', '#ffe36b', '#7ad1ff', '#ffa04a'], edge: '#6aa850' },
  { ground: ['#f6ecff', '#e9dcfb'], stone: ['#fbf4ff', '#efe3ff', '#f8eefe', '#e8daf8', '#fff6fb'], walk: '#bde4ff', roof: ['#ff8fc4', '#7ab8ff', '#ffd86b', '#b98cff'], wall: ['#ffffff', '#fff6fb', '#f2f6ff'], tree: ['#ffd0ea', '#d8c8ff', '#c8f0ff'], flower: ['#ff9ecb', '#ffe36b', '#9fd8ff', '#c6a4ff', '#9ff0c4'], edge: '#b8a4e8' },
];
/** 집 한 채 (3/4 시점: 앞벽 + 지붕), (x, y) = 앞벽 아래 가운데, k = 폭 */
function house(g: C2, x: number, y: number, k: number, P: Pal, seed: number, ch: number) {
  const wallC = P.wall[seed % P.wall.length], roofC = P.roof[(seed >> 2) % P.roof.length], hh = k * (0.75 + hsh(seed) * 0.2);
  g.fillStyle = 'rgba(60,40,70,.18)';
  g.fillRect(x - k * 0.5 + k * 0.08, y - k * 0.05, k, k * 0.14);
  rr(g, x - k * 0.5, y - hh, k, hh, k * 0.04);
  ink(g, wallC, 1.4);
  g.beginPath();
  if (ch === 2) {
    // 구름 성의 탑: 뾰족 지붕
    g.moveTo(x - k * 0.58, y - hh);
    g.lineTo(x, y - hh - k * 0.85);
    g.lineTo(x + k * 0.58, y - hh);
  } else {
    g.moveTo(x - k * 0.62, y - hh + k * 0.04);
    g.lineTo(x - k * 0.38, y - hh - k * 0.45);
    g.lineTo(x + k * 0.38, y - hh - k * 0.45);
    g.lineTo(x + k * 0.62, y - hh + k * 0.04);
  }
  g.closePath();
  ink(g, roofC, 1.4);
  g.strokeStyle = 'rgba(255,255,255,.45)';
  g.lineWidth = 1.2;
  for (let i = 1; i < 4; i++) (g.beginPath(), g.moveTo(x - k * (0.5 - i * 0.03), y - hh - k * 0.1 * i), g.lineTo(x + k * (0.5 - i * 0.03), y - hh - k * 0.1 * i), g.stroke());
  if (ch === 1 && seed % 2) {
    // 물감 공장 굴뚝
    rr(g, x + k * 0.18, y - hh - k * 0.75, k * 0.16, k * 0.45, 2);
    ink(g, '#c9b6a0', 1.2);
    for (let i = 0; i < 3; i++) (ell(g, x + k * (0.26 + i * 0.08), y - hh - k * (0.85 + i * 0.15), k * (0.08 + i * 0.03), k * (0.07 + i * 0.03)), (g.fillStyle = P.flower[i % P.flower.length]), g.fill());
  }
  // 창문 · 문 · 꽃 상자
  for (const sd of [-1, 1]) {
    rr(g, x + sd * k * 0.22 - k * 0.11, y - hh * 0.78, k * 0.22, k * 0.22, k * 0.03);
    ink(g, '#9fd8ff', 1.1);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x + sd * k * 0.22, y - hh * 0.78);
    g.lineTo(x + sd * k * 0.22, y - hh * 0.78 + k * 0.22);
    g.stroke();
    rr(g, x + sd * k * 0.22 - k * 0.13, y - hh * 0.78 + k * 0.21, k * 0.26, k * 0.06, 1);
    ink(g, '#b9784a', 0.8);
    for (let j = 0; j < 3; j++) (ell(g, x + sd * k * 0.22 + (j - 1) * k * 0.07, y - hh * 0.78 + k * 0.2, k * 0.035, k * 0.035), (g.fillStyle = P.flower[(seed + j) % P.flower.length]), g.fill());
  }
  rr(g, x - k * 0.1, y - k * 0.32, k * 0.2, k * 0.32, k * 0.08);
  ink(g, ['#b9784a', '#ff8a5c', '#7a5cff'][seed % 3], 1.1);
}
function tree(g: C2, x: number, y: number, k: number, P: Pal, seed: number) {
  g.fillStyle = 'rgba(60,40,70,.18)';
  ell(g, x + k * 0.1, y, k * 0.5, k * 0.16);
  g.fill();
  rr(g, x - k * 0.08, y - k * 0.5, k * 0.16, k * 0.5, k * 0.05);
  ink(g, '#a8703e', 1.2);
  for (const [dx, dy, r] of [[-0.25, -0.75, 0.33], [0.22, -0.8, 0.32], [0, -1.05, 0.38]] as [number, number, number][]) (ell(g, x + dx * k, y + dy * k, r * k, r * k * 0.92), ink(g, P.tree[(seed + Math.round(dx * 10)) % P.tree.length], 1.3));
  shine(g, x - k * 0.15, y - k * 1.15, k * 0.12, k * 0.07, -0.4, 0.5);
  for (let j = 0; j < 3; j++) (ell(g, x + (hsh(seed + j) - 0.5) * k * 0.6, y - k * (0.7 + hsh(seed * 3 + j) * 0.4), k * 0.06, k * 0.06), (g.fillStyle = P.flower[(seed + j) % P.flower.length]), g.fill());
}
/** 타일 한 장(가로 폭 w px, 세로 TH·w) 색 그림 */
/** 꽃 한 송이 (꽃잎 다섯) */
function flower(g: C2, x: number, y: number, k: number, c: number, rot = 0) {
  const col = CHEX[c === RAIN ? 8 : c];
  for (let j = 0; j < 5; j++) {
    const a = rot + (j * TAU) / 5;
    ell(g, x + Math.cos(a) * k * 0.62, y + Math.sin(a) * k * 0.62, k * 0.52, k * 0.38, a);
    g.fillStyle = j % 2 ? col[0] : col[1];
    g.fill();
  }
  ell(g, x, y, k * 0.34, k * 0.34);
  g.fillStyle = c === Y ? '#ff9a2a' : '#ffe36b';
  g.fill();
}
function paintTile(g: C2, ch: number, stage: number, i: number, w: number, plaza: number) {
  const P = PALS[ch], H = TH * w, R = (v: number) => v * w, sd = ((i + 64) * 7349 + ch * 131 + stage * 977) >>> 0;
  g.fillStyle = lin(g, 0, 0, 0, H, [0, P.ground[0]], [1, P.ground[1]]);
  g.fillRect(0, 0, w, H);
  // 돌길 (줄마다 어긋나게)
  const rows = 5;
  for (let r = 0; r < rows; r++) {
    const y = (r + 0.5) * (H / rows), off = r % 2 ? R(0.05) : 0;
    for (let c = -1; c < 11; c++) {
      const x = R(0.1) * c + off + R(0.05), k = hsh(sd + r * 31 + c);
      rr(g, x - R(0.043), y - H / rows / 2 + 1.5, R(0.086), H / rows - 3, R(0.02));
      g.fillStyle = P.stone[Math.floor(k * P.stone.length)];
      g.fill();
      g.strokeStyle = 'rgba(120,90,60,.16)';
      g.lineWidth = 1;
      g.stroke();
    }
  }
  if (ch === 1) {
    // 운하 (왼쪽 가장자리) — 물결과 작은 배
    g.fillStyle = lin(g, 0, 0, R(0.13), 0, [0, '#4fb2e8'], [1, '#7fd0f4']);
    g.fillRect(0, 0, R(0.12), H);
    g.strokeStyle = 'rgba(255,255,255,.6)';
    g.lineWidth = 1.5;
    for (let k = 0; k < 4; k++) (g.beginPath(), g.arc(R(0.04 + hsh(sd + k) * 0.05), H * (k + 0.5) / 4, R(0.02), Math.PI * 1.1, Math.PI * 1.9), g.stroke());
    g.fillStyle = P.edge;
    g.fillRect(R(0.12), 0, R(0.012), H);
  }
  if (ch === 2) {
    // 구름 언덕
    for (let k = 0; k < 6; k++) (ell(g, R(hsh(sd + k * 5)), H * hsh(sd + k * 9), R(0.06 + hsh(sd + k) * 0.05), R(0.03 + hsh(sd + k * 2) * 0.02)), (g.fillStyle = 'rgba(255,255,255,.8)'), g.fill());
  }
  // 길가 풀밭 (꽃이 핀 풀 띠)
  for (const [x0, x1] of ch === 1 ? [[0.124, 0.18], [0.82, 0.88]] : [[0.12, 0.18], [0.82, 0.88]]) {
    g.fillStyle = lin(g, R(x0), 0, R(x1), 0, [0, '#8fd65e'], [1, '#6cc44a']);
    g.fillRect(R(x0), 0, R(x1 - x0), H);
    for (let j = 0; j < 7; j++) {
      const fx = R(x0 + 0.008 + hsh(sd + j * 13 + x0 * 100) * (x1 - x0 - 0.016)), fy = H * ((j + hsh(sd + j)) / 7);
      g.strokeStyle = '#3f9a36';
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(fx - 3, fy + 3);
      g.lineTo(fx - 1, fy - 3);
      g.moveTo(fx + 2, fy + 3);
      g.lineTo(fx + 3, fy - 2);
      g.stroke();
      if (j % 2 === 0) flower(g, fx, fy - 2, R(0.01), [R_, B_, Y_, 3, 5][(sd + j) % 5]);
    }
  }
  // 도둑이 끌고 간 자국 위의 꽃밭 (지금은 회색 — 칠하면 되살아난다)
  for (let k = 0; k < 2; k++) {
    if (hsh(sd + k * 17) > 0.55) continue;
    const yy = 0.25 + hsh(sd + k * 3) * 0.5, wy = i * TH + yy * TH, cx = R(trailX(stage, wy, k)), cy = H * yy;
    ell(g, cx, cy, R(0.07), R(0.04));
    ink(g, '#7fd06a', 1.2);
    for (let j = 0; j < 6; j++) flower(g, cx + Math.cos(j * 1.05) * R(0.045), cy + Math.sin(j * 1.05) * R(0.022), R(0.013), [R_, Y_, B_, 3, 5, 6][(j + sd) % 6], j);
  }
  // 가운데 장식 (적이 걷는 곳이라 바닥에 붙은 것만)
  const deco = sd % 5;
  if (plaza) {
    // 광장: 분수 (색의 샘)
    const cx = R(0.5), cy = H * 0.55, k = R(0.2);
    ell(g, cx, cy, k * 1.5, k * 0.75);
    ink(g, '#e8dcc8', 2);
    ell(g, cx, cy, k * 1.25, k * 0.6);
    ink(g, lin(g, 0, cy - k, 0, cy + k, [0, '#9fe0ff'], [1, '#4fb2e8']), 1.5);
    ell(g, cx, cy - k * 0.2, k * 0.35, k * 0.2);
    ink(g, '#f3e6c8', 1.5);
    rr(g, cx - k * 0.1, cy - k * 0.9, k * 0.2, k * 0.7, k * 0.06);
    ink(g, '#f3e6c8', 1.5);
    for (let j = 0; j < 6; j++) (ell(g, cx + Math.cos(j) * k * 0.9, cy + Math.sin(j) * k * 0.4, k * 0.08, k * 0.06), (g.fillStyle = P.flower[j % P.flower.length]), g.fill());
  } else if (deco === 1) {
    // 사방치기
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2;
    const cx = R(0.5), cy = H * 0.5;
    for (let j = 0; j < 4; j++) g.strokeRect(cx - R(0.04) + (j === 2 ? R(0.04) : j === 1 ? -R(0.04) : 0), cy - R(0.08) + j * R(0.04), R(0.08), R(0.04));
  } else if (deco === 2) {
    // 물웅덩이
    ell(g, R(0.35 + hsh(sd) * 0.3), H * 0.6, R(0.07), R(0.03));
    g.fillStyle = 'rgba(120,190,240,.55)';
    g.fill();
  } else if (deco === 3 && ch === 0) {
    // 건널목 줄무늬
    g.fillStyle = 'rgba(255,255,255,.8)';
    for (let j = 0; j < 6; j++) g.fillRect(R(0.2 + j * 0.11), H * 0.42, R(0.06), H * 0.16);
  }
  // 양쪽 가장자리: 인도 · 집 · 나무 (판 가장자리는 도둑이 잘 안 가는 곳)
  g.fillStyle = P.walk;
  g.fillRect(R(0.88), 0, R(0.12), H);
  if (ch !== 1) g.fillRect(0, 0, R(0.12), H);
  for (let j = 0; j < 4; j++) {
    for (const bx of ch !== 1 ? [0.06, 0.94] : [0.94]) {
      ell(g, R(bx + (hsh(sd + j * 7 + bx * 10) - 0.5) * 0.08), H * ((j + 0.5) / 4), R(0.03), R(0.02));
      g.fillStyle = P.tree[(sd + j) % P.tree.length];
      g.fill();
    }
  }
  g.fillStyle = P.edge;
  g.fillRect(R(0.875), 0, R(0.01), H);
  if (ch !== 1) g.fillRect(R(0.115), 0, R(0.01), H);
  const lh = sd % 3, rh = (sd >> 3) % 3;
  if (ch !== 1) {
    if (lh === 2) tree(g, R(0.06), H * 0.85, R(0.11), P, sd);
    else house(g, R(0.04), H * (0.75 + lh * 0.1), R(0.17), P, sd, ch);
  } else if (sd % 2) {
    // 운하의 작은 배
    ell(g, R(0.06), H * 0.6, R(0.045), R(0.02));
    ink(g, P.roof[sd % P.roof.length], 1.2);
  }
  if (rh === 2) tree(g, R(0.94), H * 0.8, R(0.11), P, sd + 3);
  else house(g, R(0.96), H * (0.72 + rh * 0.12), R(0.17), P, sd + 5, ch);
  // 가로등
  if (sd % 4 === 1) {
    const lx = R(0.86), ly = H * 0.4;
    rr(g, lx - 1.5, ly - R(0.12), 3, R(0.12), 1.5);
    ink(g, '#6b5a7a', 1);
    ell(g, lx, ly - R(0.13), R(0.02), R(0.02));
    ink(g, '#fff6a0', 1);
  }
}
interface Tile { col: HTMLCanvasElement; rev: HTMLCanvasElement; i: number }
/** 판(상태 객체)마다 따로: 다른 판의 골목이 섞이지 않게 */
const TILESETS = new WeakMap<object, { run: number; map: Map<string, Tile>; pend: Map<string, HTMLCanvasElement> }>();
function tileSet(s: SoulState) {
  let ts = TILESETS.get(s);
  if (!ts || ts.run !== s.runId) TILESETS.set(s, (ts = { run: s.runId, map: new Map(), pend: new Map() }));
  return ts;
}
const tilesOf = (s: SoulState): Map<string, Tile> => tileSet(s).map;
/** 굽기만 하고 아직 쓰지 않은 그림을 지금 다 그려 둔다 (1×1에 한 번 찍으면 밀린 그리기가 다 끝난다) */
let FLUSH: C2 | null = null;
function flushNow(c: HTMLCanvasElement) {
  if (typeof document === 'undefined') return;
  FLUSH ??= (() => {
    const f = document.createElement('canvas');
    f.width = f.height = 1;
    return f.getContext('2d');
  })();
  FLUSH?.drawImage(c, 0, 0, 1, 1);
}
/** 위쪽 골목 미리 굽기를 두 프레임에 나눠서: 첫 프레임엔 색 그림, 다음 프레임엔 회색 자국 (느린 폰에서 한 프레임이 길어지지 않게) */
function prepTile(s: SoulState, i: number, w: number, sc: number) {
  const ts = tileSet(s), key = `${i}:${w}:${sc}`;
  if (ts.map.has(key)) return;
  if (!ts.pend.has(key)) {
    const col = tileCol(s, i, w, sc);
    flushNow(col);
    return void ts.pend.set(key, col);
  }
  flushNow(getTile(s, i, w, sc).rev);
}
function tileCol(s: SoulState, i: number, w: number, sc: number) {
  const d = STAGES[s.stage], plaza = i === Math.floor((-d.D + 0.3) / TH) ? 1 : 0;
  return layer(w, TH * w, sc, (g) => ((g.lineJoin = 'round'), paintTile(g, d.ch, s.stage, i, w, plaza)));
}
function splat(g: C2, x: number, y: number, r: number, seed: number) {
  splatPath(g, x, y, r, seed, 8);
  // 튄 방울
  for (let j = 0; j < 4; j++) {
    const a = hsh(seed + j * 7) * TAU, q = r * (1.1 + hsh(seed + j) * 0.35);
    g.moveTo(x + Math.cos(a) * q + r * 0.13, y + Math.sin(a) * q);
    g.arc(x + Math.cos(a) * q, y + Math.sin(a) * q, r * (0.08 + hsh(seed + j * 3) * 0.08), 0, TAU);
  }
}
/** 물감 한 방울이 타일에 닿는다: 색 그림이 그 모양대로 돌아오고, 훔쳤던 색이 살짝 얹힌다 */
function applyPaint(t: Tile, p: Paint, w: number, sc: number) {
  const g = t.rev.getContext('2d')!, x = p.x * w, y = (p.y - t.i * TH) * w, r = p.r * w;
  g.save();
  g.setTransform(sc, 0, 0, sc, 0, 0);
  g.beginPath();
  splat(g, x, y, r, p.seed);
  g.save();
  g.clip();
  g.setTransform(1, 0, 0, 1, 0, 0);
  // 물감이 닿은 네모 칸만 옮긴다 (타일 전체를 매번 옮기지 않게)
  const bx = Math.max(0, Math.floor((x - r * 1.6) * sc)), by = Math.max(0, Math.floor((y - r * 1.6) * sc));
  const bw = Math.min(t.col.width - bx, Math.ceil(r * 3.2 * sc) + 2), bh = Math.min(t.col.height - by, Math.ceil(r * 3.2 * sc) + 2);
  if (bw > 0 && bh > 0) g.drawImage(t.col, bx, by, bw, bh, bx, by, bw, bh);
  g.restore();
  // 내 모습의 색은 꽃 몇 송이 · 튄 물감 몇 방울로만
  const c = p.c === RAIN ? R_ : p.c;
  g.globalAlpha = 0.55;
  g.fillStyle = CHEX[c][0];
  for (let j = 0; j < 4; j++) {
    const a = hsh(p.seed + j * 5) * TAU, q = r * (0.3 + hsh(p.seed + j) * 0.75);
    ell(g, x + Math.cos(a) * q, y + Math.sin(a) * q, r * 0.06 + 1, r * 0.05 + 1);
    g.fill();
  }
  g.globalAlpha = 1;
  for (const [fx, fy, k] of bloomSpots(p, r)) flower(g, x + fx, y + fy, k, c, p.seed);
  g.restore();
}
/** 칠한 자리에 피는 꽃 자리 (구울 때와 피어나는 연출이 같은 자리) */
function bloomSpots(p: Paint, r: number): [number, number, number][] {
  const n = 2 + (p.seed % 3), out: [number, number, number][] = [];
  for (let j = 0; j < n; j++) {
    const a = hsh(p.seed * 3 + j * 11) * TAU, q = r * (0.15 + hsh(p.seed + j * 7) * 0.5);
    out.push([Math.cos(a) * q, Math.sin(a) * q, Math.max(2.2, r * 0.1)]);
  }
  return out;
}
function getTile(s: SoulState, i: number, w: number, sc: number): Tile {
  const ts = tileSet(s), TILES = ts.map, key = `${i}:${w}:${sc}`;
  let t = TILES.get(key);
  if (!t) {
    const col = ts.pend.get(key) ?? tileCol(s, i, w, sc);
    ts.pend.delete(key);
    const rev = document.createElement('canvas');
    rev.width = col.width;
    rev.height = col.height;
    const g = rev.getContext('2d')!;
    g.drawImage(col, 0, 0);
    // 색을 도둑맞은 곳은 도둑이 끌고 간 자국 두 줄뿐 — 거기만 회색(채도를 빼고 살짝 밝게), 먹물 발자국과 연필 테두리
    g.setTransform(sc, 0, 0, sc, 0, 0);
    const trails = () => {
      g.beginPath();
      for (let k = 0; k < 2; k++) {
        const pts: [number, number][] = [];
        for (let y = i * TH - 0.03; y <= (i + 1) * TH + 0.03; y += 0.025) pts.push([trailX(s.stage, y, k), y]);
        pts.forEach(([x, y], j) => (j ? g.lineTo : g.moveTo).call(g, (x - trailHW(y, k)) * w, (y - i * TH) * w));
        for (let j = pts.length - 1; j >= 0; j--) g.lineTo((pts[j][0] + trailHW(pts[j][1], k)) * w, (pts[j][1] - i * TH) * w);
        g.closePath();
      }
    };
    g.save();
    trails();
    g.clip();
    g.globalCompositeOperation = 'saturation';
    g.fillStyle = '#808080';
    g.fillRect(0, 0, w, TH * w);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(246,244,250,.38)';
    g.fillRect(0, 0, w, TH * w);
    g.fillStyle = 'rgba(70,64,96,.28)';
    for (let k = 0; k < 2; k++)
      for (let y = i * TH + 0.02; y < (i + 1) * TH; y += 0.07) {
        const sd2 = Math.round(y * 100) + k * 7, side = (Math.round(y / 0.07) % 2 ? 1 : -1) * 0.025, x = trailX(s.stage, y, k) + side;
        ell(g, x * w, (y - i * TH) * w, w * 0.012, w * 0.017, hsh(sd2) - 0.5);
        g.fill();
        for (let j = 0; j < 3; j++) (ell(g, (x + (j - 1) * 0.011) * w, (y - i * TH - 0.02) * w, w * 0.005, w * 0.005), g.fill());
      }
    g.restore();
    g.setTransform(sc, 0, 0, sc, 0, 0);
    trails();
    g.strokeStyle = 'rgba(90,80,120,.35)';
    g.lineWidth = 1.5;
    g.setLineDash([6, 4]);
    g.stroke();
    g.setLineDash([]);
    g.setTransform(1, 0, 0, 1, 0, 0);
    t = { col, rev, i };
    for (const p of s.paints) if (p.y + p.r > i * TH && p.y - p.r < (i + 1) * TH) applyPaint(t, p, w, sc);
    TILES.set(key, t);
  }
  return t;
}

// ───────────────────────────── 그리기: 손가락 · 장 끝 선물 ─────────────────────────────
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
/** 장 끝 선물 (광장의 큰 물건): 0장 큰 붓 · 물감 통 / 1장 무지개 팔레트 · 반짝 크레용. (x,y) = 바닥 가운데, k = 크기 px */
function drawPerk(ctx: C2, ch: number, i: number, x: number, y: number, k: number, t: number) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 0.08 + i * 2) * k * 0.03);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const lw = Math.max(1.6, k * 0.045);
  const id = ch * 2 + i;
  if (id === 0) {
    // 큰 붓
    ctx.rotate(-0.5);
    rr(ctx, -k * 0.12, -k * 1.5, k * 0.24, k * 1.1, k * 0.1);
    ink(ctx, lin(ctx, -k * 0.12, 0, k * 0.12, 0, [0, '#e8b070'], [1, '#a8683a']), lw);
    rr(ctx, -k * 0.16, -k * 0.45, k * 0.32, k * 0.22, k * 0.04);
    ink(ctx, '#d8d4e6', lw);
    ctx.beginPath();
    ctx.moveTo(-k * 0.17, -k * 0.24);
    ctx.quadraticCurveTo(-k * 0.3, k * 0.25, 0, k * 0.4);
    ctx.quadraticCurveTo(k * 0.3, k * 0.25, k * 0.17, -k * 0.24);
    ctx.closePath();
    ink(ctx, lin(ctx, 0, -k * 0.2, 0, k * 0.4, [0, '#ff5246'], [0.5, '#ffd334'], [1, '#3b8dff']), lw);
  } else if (id === 1) {
    // 물감 통
    ctx.beginPath();
    ctx.moveTo(-k * 0.5, 0);
    ctx.lineTo(-k * 0.6, -k * 0.9);
    ctx.lineTo(k * 0.6, -k * 0.9);
    ctx.lineTo(k * 0.5, 0);
    ctx.closePath();
    ink(ctx, lin(ctx, -k * 0.6, 0, k * 0.6, 0, [0, '#b9b6c6'], [0.4, '#f3f1f8'], [1, '#a4a1b4']), lw);
    ell(ctx, 0, -k * 0.9, k * 0.6, k * 0.16);
    ink(ctx, '#ff7ad0', lw);
    for (const [dx, c] of [[-0.35, '#ff5246'], [0, '#ffd334'], [0.35, '#3b8dff']] as [number, string][]) (rr(ctx, dx * k - k * 0.08, -k * 0.85, k * 0.16, k * 0.4, k * 0.08), (ctx.fillStyle = c), ctx.fill());
    ctx.beginPath();
    ctx.arc(0, -k * 0.9, k * 0.55, Math.PI * 1.05, Math.PI * 1.95);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw;
    ctx.stroke();
  } else if (id === 2) {
    // 무지개 팔레트
    ctx.beginPath();
    ctx.moveTo(-k * 0.7, -k * 0.2);
    ctx.bezierCurveTo(-k * 0.8, -k * 1.0, k * 0.6, -k * 1.1, k * 0.72, -k * 0.45);
    ctx.bezierCurveTo(k * 0.8, k * 0.05, k * 0.2, -k * 0.05, k * 0.05, k * 0.05);
    ctx.bezierCurveTo(-k * 0.2, k * 0.15, -k * 0.62, k * 0.2, -k * 0.7, -k * 0.2);
    ctx.closePath();
    ink(ctx, lin(ctx, 0, -k, 0, 0, [0, '#f7deb0'], [1, '#d9a866']), lw);
    ell(ctx, k * 0.3, -k * 0.2, k * 0.1, k * 0.08);
    ink(ctx, '#fff6dc', lw * 0.6);
    ['#ff5246', '#ff9a2a', '#ffd334', '#3fcf5e', '#3b8dff', '#a65cff'].forEach((c, j) => (ell(ctx, -k * 0.45 + j * k * 0.2, -k * (0.55 + Math.sin(j * 0.9) * 0.12), k * 0.1, k * 0.08), ink(ctx, c, lw * 0.6)));
  } else {
    // 반짝 크레용
    ctx.rotate(0.35);
    rr(ctx, -k * 0.18, -k * 1.2, k * 0.36, k * 1.1, k * 0.05);
    ink(ctx, lin(ctx, -k * 0.18, 0, k * 0.18, 0, [0, '#c8560c'], [0.4, '#ff8a2a'], [1, '#ffc890']), lw);
    ctx.beginPath();
    ctx.moveTo(-k * 0.18, -k * 1.2);
    ctx.lineTo(0, -k * 1.55);
    ctx.lineTo(k * 0.18, -k * 1.2);
    ctx.closePath();
    ink(ctx, '#ff8a2a', lw);
    rr(ctx, -k * 0.2, -k * 0.85, k * 0.4, k * 0.4, k * 0.03);
    ink(ctx, '#fff6e6', lw * 0.8);
    starPath(ctx, 0, -k * 0.65, k * 0.12, 0.45);
    ink(ctx, '#ffd334', lw * 0.6);
    for (let j = 0; j < 3; j++) (starPath(ctx, (hsh(j) - 0.5) * k, -k * (0.5 + j * 0.45), k * 0.08, 0.4), (ctx.fillStyle = '#fff6a0'), ctx.fill());
  }
  ctx.restore();
}

// ───────────────────────────── 그리기: 한 장면 ─────────────────────────────
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const LV_GIFT: Record<number, string> = { 3: '나뭇잎 모자를 썼어요', 5: '목도리가 생겼어요', 7: '별 머리핀을 꽂았어요', 9: '무지개 망토!', 11: '금빛으로 빛나요' };
export const starWords = (s: SoulState): string[] => {
  const d = STAGES[s.stage], st = d.star;
  const third = st.k === 'multi' ? `${st.f ? FD[st.f].name + '로 ' : ''}한 번에 ${st.n}마리` : st.k === 'form' ? `${FD[st.f].name}으로 ${st.foeName ? st.foeName + ' ' : ''}${st.n}마리` : `${st.n}초 안에 대장 이기기`;
  return ['마을 되살리기', '하트 안 잃기', third];
};
const recent = new WeakMap<object, { x: number; y: number; t: number; size: number }[]>();
/** 칠해진 자리에서 피어나는 중인 꽃·풀 */
const BLOOMS = new WeakMap<object, { x: number; y: number; r: number; c: number; seed: number; t: number }[]>();
/** 도둑 그림은 판의 셈보다 조금 크게 (카메라를 가깝게) */
const EDRAW = 1.12;
/** 회색 껍데기를 깨는 모습 */
const BREAKER: Partial<Record<EK, FK>> = { bucket: 'whale', crayon: 'octo', shell: 'turtle', tower: 'turtle', brush: 'snake' };
/** 정령 장신구 (레벨) */
function drawGear(ctx: C2, x: number, y: number, k: number, lv: number, t: number) {
  if (lv >= 3) {
    ctx.save();
    ctx.translate(x - k * 0.25, y - k * 2.05);
    ctx.rotate(-0.4 + Math.sin(t * 0.05) * 0.1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(k * 0.35, -k * 0.3, k * 0.7, 0);
    ctx.quadraticCurveTo(k * 0.35, k * 0.25, 0, 0);
    ink(ctx, '#5cc14a', Math.max(1, k * 0.06));
    ctx.restore();
  }
  if (lv >= 5) {
    ctx.beginPath();
    ctx.moveTo(x - k * 0.8, y - k * 0.6);
    ctx.quadraticCurveTo(x, y - k * 0.3, x + k * 0.8, y - k * 0.6);
    ctx.lineWidth = k * 0.2;
    ctx.strokeStyle = '#ff5a7a';
    ctx.stroke();
  }
  if (lv >= 7) (starPath(ctx, x + k * 0.55, y - k * 1.85, k * 0.22, 0.45), ink(ctx, '#ffd334', Math.max(1, k * 0.05)));
}
/** 이 프레임 그리기를 시작한 시각 (그리기 전용 — 시뮬레이션은 쓰지 않는다) */
let FRAME_T0 = 0;
const spare = (ms: number) => typeof performance === 'undefined' || performance.now() - FRAME_T0 < ms;
/** 한 프레임에 소리 하나는 바로, 나머지는 줄을 세웠다가 다음 프레임들에 (0.1초 넘게 밀리면 버린다) */
const SNDQ = new WeakMap<object, [SfxName, number | undefined, number | undefined, number][]>();
function playQueued(s: SoulState, fx: ReturnType<typeof juice>, t: number) {
  const q = SNDQ.get(s);
  while (q && q.length && spare(5)) {
    const [n, p, v, qt] = q.shift()!;
    if (t - qt <= 6) return fx.sound(n, p, v);
  }
}
function drawAll(ctx: C2, s: SoulState, w: number, h: number, _th: Theme) {
  FRAME_T0 = typeof performance === 'undefined' ? 0 : performance.now();
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => (y - s.camY) * w, R = (r: number) => r * w, t = s.t;
  const sc = typeof ctx.getTransform === 'function' ? Math.min(2, Math.max(1, Math.round(ctx.getTransform().a || 1))) : 1;
  const me = s.me, seenT = fx.memo.t ?? -1;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  if (fx.memo.run !== s.runId) (fx.memo.run = s.runId), (fx.memo.pa = 0);
  const text = (str: string, x: number, y: number, fill: string, stroke = 'rgba(59,49,80,.9)', lw = 3) => {
    ctx.lineJoin = 'round';
    if (lw > 0) (ctx.lineWidth = lw), (ctx.strokeStyle = stroke), ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  };
  const puff = (x: number, y: number, col: string, n: number, spd = 3, size = 3) => {
    if (fx.particles.length < 150) fx.burst(x, y, col, Math.min(n, 150 - fx.particles.length), spd, size);
  };
  const say = (x: number, y: number, str: string, col: string, size: number, gate = '') => {
    if (gate) {
      if (t - (fx.memo['g' + gate] ?? -99) < 26) return;
      fx.memo['g' + gate] = t;
    }
    let rec = recent.get(s);
    if (!rec) recent.set(s, (rec = []));
    x = clamp(x, w * 0.12, w * 0.88);
    y = Math.max(R(0.17), y);
    for (let k = 0; k < 5 && rec.some((q) => t - q.t < 30 && Math.abs(q.x - x) < w * 0.16 && Math.abs(q.y - y) < (size + q.size) * 0.55); k++) y += y < R(0.4) ? size * 0.9 : -size * 0.9;
    y = Math.max(R(0.17), y);
    rec.push({ x, y, t, size });
    if (rec.length > 14) rec.shift();
    fx.pop(x, y, str, col, size);
  };
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  fx.begin(ctx);

  // ── 마을: 보이는 타일 + 새로 떨어진 물감 ──
  const i0 = Math.floor(s.camY / TH), i1 = Math.floor((s.camY + A) / TH), ww = Math.round(w), tsc = Math.min(1.5, sc);
  for (let i = i0; i <= i1; i++) ctx.drawImage(getTile(s, i, ww, tsc).rev, 0, Y(i * TH), w, TH * w + 0.5);
  // 되살아나는 순간: 풀이 쑥, 꽃이 퐁 (0.3초)
  {
    const bl = BLOOMS.get(s);
    if (bl) {
      for (const b of bl) {
        const age = t - b.t;
        if (age < 0 || age > 16) continue;
        const bx = X(b.x), by = Y(b.y), r = R(b.r), q = age / 16;
        ell(ctx, bx, by, r * (0.6 + 0.6 * q), r * (0.6 + 0.6 * q) * 0.7);
        ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - q)})`;
        ctx.lineWidth = 3 * (1 - q) + 0.5;
        ctx.stroke();
        for (let j = 0; j < 4; j++) {
          const a = hsh(b.seed + j * 9) * TAU, gq = r * (0.25 + hsh(b.seed + j * 4) * 0.5), gx = bx + Math.cos(a) * gq, gy = by + Math.sin(a) * gq * 0.8, hh = R(0.03) * Math.min(1, age / 8);
          ctx.strokeStyle = '#3fae3a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(gx - 3, gy);
          ctx.quadraticCurveTo(gx - 4, gy - hh * 0.6, gx - 6, gy - hh);
          ctx.moveTo(gx, gy);
          ctx.lineTo(gx, gy - hh * 1.2);
          ctx.moveTo(gx + 3, gy);
          ctx.quadraticCurveTo(gx + 4, gy - hh * 0.6, gx + 6, gy - hh);
          ctx.stroke();
        }
        const pk = age < 8 ? (age / 8) * 1.5 : 1.5 - 0.5 * Math.min(1, (age - 8) / 8);
        for (const [fx2, fy2, k] of bloomSpots(b as Paint, r)) flower(ctx, bx + fx2, by + fy2, k * pk, b.c, b.seed);
      }
      if (bl.length && t - bl[bl.length - 1].t > 30) bl.length = 0;
    }
  }

  // ── 바닥: 빨간 예고 · 독구름 · 파도 · 착지 자국 ──
  for (const m of s.foes) {
    if (m.dead) continue;
    const boss = ED[m.k].boss;
    if (m.st === WIND && (m.k === 'bucket' || m.k === 'crayon')) {
      const q = clamp(1 - m.tm / 56, 0, 1);
      if (m.k === 'bucket') {
        const r = R(0.1 * (m.champ ? 1.3 : 1));
        ell(ctx, X(m.ax), Y(m.ay), r, r * 0.6);
        ctx.fillStyle = `rgba(255,70,60,${0.12 + 0.22 * q})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255,80,60,${0.6 + 0.4 * q})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ell(ctx, X(m.ax), Y(m.ay), r * q, r * 0.6 * q);
        ctx.fillStyle = 'rgba(255,60,50,.25)';
        ctx.fill();
      } else {
        ctx.strokeStyle = `rgba(255,80,60,${0.5 + 0.4 * q})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(X(m.x), Y(m.y));
        ctx.lineTo(X(m.ax), Y(m.ay));
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    if (boss && s.bossAtk > 0) {
      const q = clamp(1 - s.bossAtk / 60, 0, 1);
      ctx.fillStyle = `rgba(255,60,60,${0.12 + 0.2 * q})`;
      ctx.strokeStyle = `rgba(255,70,60,${0.6 + 0.4 * q})`;
      ctx.lineWidth = 2;
      if (m.tm === 0) (ell(ctx, X(m.ax), Y(m.ay), R(0.13), R(0.08)), ctx.fill(), ctx.stroke());
      else if (m.tm === 2) (ctx.fillRect(0, Y(m.ay) - R(0.05), w, R(0.1)), ctx.strokeRect(-2, Y(m.ay) - R(0.05), w + 4, R(0.1)));
      else
        for (let i = -2; i <= 2; i++) {
          const an = Math.atan2(me.y - m.y, me.x - m.x) + i * 0.22;
          ctx.beginPath();
          ctx.moveTo(X(m.x), Y(m.y));
          ctx.lineTo(X(m.x + Math.cos(an) * 0.3), Y(m.y + Math.sin(an) * 0.3));
          ctx.stroke();
        }
    }
  }
  for (const c of s.clouds) {
    const life = clamp(Math.min(c.t / 10, (c.T - c.t) / 30), 0, 1);
    for (let j = 0; j < 5; j++) {
      const a = j * 1.26 + c.seed + t * 0.01, q = c.r * (0.45 + 0.1 * Math.sin(t * 0.05 + j));
      ell(ctx, X(c.x + Math.cos(a) * q * 0.6), Y(c.y + Math.sin(a) * q * 0.45), R(q * 0.75), R(q * 0.55));
      ctx.fillStyle = `rgba(${j % 2 ? '166,92,255' : '200,150,255'},${0.32 * life})`;
      ctx.fill();
    }
    for (let j = 0; j < 3; j++) {
      const bx = X(c.x + Math.cos(j * 2.1 + c.seed) * c.r * 0.5), by = Y(c.y) - ((t * 0.6 + j * 9 + c.seed) % 22);
      ell(ctx, bx, by, R(0.008), R(0.008));
      ctx.fillStyle = `rgba(120,40,200,${0.6 * life})`;
      ctx.fill();
    }
  }
  for (const wv of s.waves) {
    const y = Y(wv.y), k = wv.big ? 1.6 : 1;
    ctx.fillStyle = lin(ctx, 0, y - R(0.05 * k), 0, y + R(0.06 * k), [0, 'rgba(255,255,255,.95)'], [0.4, 'rgba(120,200,255,.85)'], [1, 'rgba(59,141,255,0)']);
    ctx.fillRect(0, y - R(0.03 * k), w, R(0.09 * k));
    ctx.fillStyle = '#ffffff';
    for (let j = 0; j < 9; j++) {
      const x = ((j + 0.5) / 9) * w + Math.sin(t * 0.2 + j) * 4;
      ell(ctx, x, y - R(0.03 * k), R(0.035 * k), R(0.02 * k));
      ctx.fill();
    }
  }

  // ── 그림자 ──
  ctx.fillStyle = 'rgba(50,35,70,.2)';
  for (const m of s.foes) {
    if (m.dead) continue;
    const u = R(m.r) * EDRAW * (ED[m.k].boss ? s.bossK : 1);
    ell(ctx, X(m.x), Y(m.y), u * 0.95, u * 0.32);
    ctx.fill();
  }
  const fr = meR(s), mu = R(fr);
  if (s.phase !== 'pick') {
    ell(ctx, X(me.x), Y(me.y), mu * (0.95 - me.z * 3), mu * (0.3 - me.z));
    ctx.fill();
  }
  // 모습 시간 고리 (발밑) + 점수 배수
  if (s.phase === 'play' && me.f !== 'white' && !s.eat) {
    const q = clamp(me.T / Math.max(1, me.Tmax), 0, 1), low = me.T < 100, c = CHEX[me.mask === RAIN ? 8 : me.mask][0];
    ctx.beginPath();
    ctx.ellipse(X(me.x), Y(me.y), mu * 1.2, mu * 0.42, 0, 0, TAU);
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = R(0.012);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(X(me.x), Y(me.y), mu * 1.2, mu * 0.42, 0, -Math.PI / 2, -Math.PI / 2 + TAU * q);
    ctx.strokeStyle = low && (t >> 3) % 2 ? '#ffffff' : c;
    ctx.lineWidth = R(0.012);
    ctx.stroke();
  }

  // ── 세상 속 것들 (아래에 있을수록 앞) ──
  type Item = { y: number; f: () => void };
  const items: Item[] = [];
  const eatT = s.eat && s.eat.ph === 1 ? s.eat.id : -1;
  for (const m of s.foes) {
    if (m.dead) continue;
    items.push({
      y: m.y,
      f: () => {
        const dd = ED[m.k], boss = !!dd.boss, k = boss ? s.bossK : 1, u = R(m.r) * k * EDRAW;
        const air = dd.air ? R(0.05) + Math.sin(t * 0.07 + m.seed) * R(0.012) : 0;
        const walking = t - m.walkT < 4, step = walking ? Math.abs(Math.sin(t * 0.25 + m.seed)) : 0;
        const wind = m.st === WIND || (boss && s.bossAtk > 0);
        const pose = !m.col && !boss ? 2 : wind ? 1 : walking && (t >> 3) % 2 ? 1 : 0;
        const hurtA = t - m.hurtT, held = m.id === eatT && s.eat!.patch < 0;
        let sx = 1, sy = 1;
        if (hurtA < 8) (sx = 1 + 0.12 * (1 - hurtA / 8)), (sy = 1 - 0.1 * (1 - hurtA / 8));
        if (held) {
          const q = s.eat!.t / s.eat!.sk;
          (sx = 1 + Math.sin(t * 1.3) * 0.08 * q), (sy = 1 - 0.15 * q);
        }
        if (m.st === ENTER) sy *= 1 + step * 0.05;
        ctx.save();
        ctx.translate(X(m.x), Y(m.y) - air - step * R(0.006));
        if (m.champ && m.col) {
          const pul = 0.5 + 0.5 * Math.sin(t * 0.15);
          ell(ctx, 0, -u, u * (1.6 + pul * 0.2), u * (1.6 + pul * 0.2));
          ctx.fillStyle = radg(ctx, 0, -u, u * 0.5, u * 1.8, [0, `${CHEX[m.col][1]}aa`], [1, `${CHEX[m.col][1]}00`]);
          ctx.fill();
        }
        ctx.scale(sx * (m.face < 0 && !boss ? -1 : 1), sy);
        if (boss) stamp(ctx, foeSprite(m.k, 0, s.bossDown ? 2 : m.stun > 0 ? 2 : wind ? 1 : 0, R(m.r) * EDRAW * sc * 1.05), u);
        else stamp(ctx, foeSprite(m.k, m.col, pose, R(m.r) * EDRAW * sc * 1.05), u);
        if (!m.col && !boss) {
          // 금 간 회색 껍데기
          ctx.strokeStyle = 'rgba(255,255,255,.9)';
          ctx.lineWidth = Math.max(1.5, u * 0.06);
          ctx.beginPath();
          for (let j = 0; j < 3; j++) {
            const a = -1.2 + j * 1.1 + (m.seed % 7) * 0.1;
            ctx.moveTo(0, -u);
            ctx.lineTo(Math.cos(a) * u * 0.4, -u + Math.sin(a) * u * 0.4);
            ctx.lineTo(Math.cos(a + 0.5) * u * 0.75, -u + Math.sin(a + 0.5) * u * 0.7);
          }
          ctx.stroke();
        }
        ctx.restore();
        if (m.k === 'shell' && m.arm > 0 && m.arm < m.armMax && m.col) {
          // 껍데기 금
          const q = 1 - m.arm / m.armMax;
          ctx.strokeStyle = '#fff6e6';
          ctx.lineWidth = 2;
          ctx.beginPath();
          const cx = X(m.x) - u * 0.1 * m.face, cy = Y(m.y) - u;
          for (let j = 0; j < 1 + q * 4; j++) {
            const a = j * 1.7 + m.seed;
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * u * 0.5, cy + Math.sin(a) * u * 0.45);
            ctx.lineTo(cx + Math.cos(a + 0.4) * u * 0.8, cy + Math.sin(a + 0.4) * u * 0.7);
          }
          ctx.stroke();
        }
        if (m.k === 'crayon' && !m.sh) {
          // 방패가 깨졌다
          ctx.fillStyle = '#ffd334';
          starPath(ctx, X(m.x) + u * 0.6 * m.face, Y(m.y) - u, u * 0.25, 0.45);
          ctx.fill();
        }
        if (m.bind > 0) {
          // 덩굴에 꽁꽁
          ctx.strokeStyle = '#2fae4a';
          ctx.lineWidth = Math.max(2, u * 0.16);
          for (let j = 0; j < 2; j++) (ell(ctx, X(m.x), Y(m.y) - u * (0.6 + j * 0.6), u * 0.95, u * 0.3, 0.15 * (j ? 1 : -1)), ctx.stroke());
          ctx.fillStyle = '#7fd65a';
          for (let j = 0; j < 3; j++) (ell(ctx, X(m.x) + Math.cos(j * 2.1) * u * 0.9, Y(m.y) - u * 0.9 + Math.sin(j * 2.1) * u * 0.25, u * 0.14, u * 0.08, j), ctx.fill());
        }
        if ((m.stun > 0 && !boss && m.bind <= 0) || (boss && m.stun > 0)) {
          for (let j = 0; j < 3; j++) {
            const a = t * 0.12 + (j * TAU) / 3;
            starPath(ctx, X(m.x) + Math.cos(a) * u * 0.7, Y(m.y) - u * 2.1 - air + Math.sin(a) * u * 0.2, u * 0.16, 0.45);
            ctx.fillStyle = '#ffe36b';
            ctx.fill();
          }
        }
        if (boss) {
          // 대장이 두른 색 (헐거운 것은 흔들리며 빛난다)
          s.patches.forEach((p, j) => {
            if (p.gone) return;
            const [px, py] = patchXY(s, m, p), loose = p.loose, wob = loose ? Math.sin(t * 0.5 + j) * R(0.008) : 0, k2 = R(0.042) * (0.75 + 0.25 * s.bossK);
            const c = ecol(p.col);
            if (loose) {
              const pul = 0.5 + 0.5 * Math.sin(t * 0.25);
              ell(ctx, X(px), Y(py), k2 * (1.7 + pul * 0.4), k2 * (1.7 + pul * 0.4));
              ctx.fillStyle = `rgba(255,250,200,${0.35 + 0.3 * pul})`;
              ctx.fill();
            }
            ctx.save();
            ctx.translate(X(px) + wob, Y(py));
            if (m.k === 'king') {
              starPath(ctx, 0, 0, k2 * 1.05, 0.55, t * 0.01);
              ink(ctx, p.col === RAIN ? lin(ctx, -k2, 0, k2, 0, [0, '#ff5246'], [0.33, '#ffd334'], [0.66, '#3fcf5e'], [1, '#3b8dff']) : radg(ctx, -k2 * 0.3, -k2 * 0.3, 0, k2, [0, c[1]], [1, c[0]]), 2);
            } else {
              ctx.beginPath();
              ctx.moveTo(-k2 * 0.8, k2 * 0.7);
              ctx.lineTo(-k2 * 0.95, -k2 * 0.7);
              ctx.lineTo(k2 * 0.95, -k2 * 0.7);
              ctx.lineTo(k2 * 0.8, k2 * 0.7);
              ctx.closePath();
              ink(ctx, lin(ctx, -k2, 0, k2, 0, [0, c[2]], [0.4, c[0]], [1, c[1]]), 2);
              ell(ctx, 0, -k2 * 0.7, k2 * 0.95, k2 * 0.25);
              ink(ctx, c[1], 1.5);
            }
            ctx.restore();
            if (!loose) {
              // 이 색 조각의 기운 (가장 앞의 것만)
              if (s.patches.find((q) => !q.gone) === p) {
                const q = clamp(p.hp / p.max, 0, 1);
                rr(ctx, X(px) - k2, Y(py) + k2 * 1.1, k2 * 2, 5, 2.5);
                ctx.fillStyle = 'rgba(59,49,80,.6)';
                ctx.fill();
                rr(ctx, X(px) - k2, Y(py) + k2 * 1.1, k2 * 2 * q, 5, 2.5);
                ctx.fillStyle = '#fff6a0';
                ctx.fill();
              }
            }
          });
        }
      },
    });
  }
  // 정령 (먹는 중: 하얀 정령이 휙 → 쭉)
  if (s.phase !== 'pick') items.push({
    y: me.y + 0.001,
    f: () => {
      const e = s.eat, born = t - me.bornT, hit = t - me.hitT;
      let f: FK = me.f, pose = 0, k = 1;
      if (e) (f = me.f === 'white' || e.ph === 0 ? 'white' : me.f), (pose = e.ph === 1 ? 1 : 0);
      else {
        if (born < 10) k = 1 + 0.35 * (1 - born / 10) * Math.sin((born / 10) * Math.PI * 1.5 + 0.5);
        if (hit < 16 && me.ps > 1.01) k *= 1 + (me.ps - 1) * Math.pow(1 - hit / 16, 2) + 0.06 * Math.sin(hit * 1.6) * (1 - hit / 16);
        if (hit < 14) pose = 2;
        else if ((me.f === 'whale' || me.f === 'lion' || me.f === 'turtle') && me.st === 1) pose = 1;
        else if (me.f === 'dragon' || me.f === 'rainbow' || me.f === 'golem') pose = me.f === 'golem' ? (me.tm % 50 > 36 ? 1 : 0) : 1;
        else if (me.cool > 18 && (me.f === 'bird' || me.f === 'eagle' || me.f === 'octo' || me.f === 'snake')) pose = 1;
      }
      const fu0 = R(FD[f].r * (f === me.f ? sizeOf(s) : 1)), fu = fu0 * k, fl = me.inv > 0 && !e && (t >> 2) % 2 && hit < 60;
      ctx.save();
      ctx.translate(X(me.x), Y(me.y) - R(me.z));
      if (f === 'white') {
        ell(ctx, 0, -fu, fu * 2.2, fu * 2.2);
        ctx.fillStyle = radg(ctx, 0, -fu, fu * 0.4, fu * 2.2, [0, 'rgba(255,255,255,.7)'], [1, 'rgba(200,220,255,0)']);
        ctx.fill();
      } else if (born < 30) {
        ell(ctx, 0, -fu, fu * 2.4, fu * 2.4);
        ctx.fillStyle = radg(ctx, 0, -fu, fu * 0.3, fu * 2.4, [0, `${CHEX[me.mask === RAIN ? 8 : me.mask][1]}cc`], [1, `${CHEX[me.mask === RAIN ? 8 : me.mask][1]}00`]);
        ctx.fill();
      }
      if (fl) ctx.globalAlpha = 0.45;
      const bob = f === 'white' ? Math.sin(t * 0.1) * fu * 0.08 : 0;
      ctx.translate(0, bob);
      ctx.scale(me.face < 0 && f !== 'eagle' ? -1 : 1, 1);
      if (f === 'snake') ctx.rotate(me.ang * 0.06);
      stamp(ctx, formSprite(f, pose, fu0 * sc * 1.05), fu);
      ctx.restore();
      ctx.globalAlpha = 1;
      if (f === 'white' || f === me.f) drawGear(ctx, X(me.x), Y(me.y) - R(me.z) + bob, fu * (f === 'white' ? 1 : 0.6), s.lv, t);
    },
  });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();
  // 이름표: 두 번째부터는 가운데 띠 대신 머리 위 작은 이름표 0.6초
  if (s.phase === 'play' && !s.eat && t - (fx.memo.nmT ?? -99) < 36 && me.f !== 'white') {
    const age = t - fx.memo.nmT, a = Math.min(1, (36 - age) / 8), up = Math.min(1, age / 5);
    const nm = `${FD[me.f].name}${me.tier >= 2 && me.f !== 'golem' && me.f !== 'rainbow' ? ' ' + me.tier : ''}`, c = CHEX[me.mask === RAIN ? 8 : me.mask];
    font(0.034, 900);
    const tw = ctx.measureText(nm).width + R(0.04), bx = clamp(X(me.x), tw / 2 + 4, w - tw / 2 - 4), by = Y(me.y) - R(me.z) - mu * 2.5 - R(0.02) * up;
    ctx.globalAlpha = a;
    rr(ctx, bx - tw / 2, by - R(0.024), tw, R(0.048), R(0.024));
    ctx.fillStyle = c[0];
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(nm, bx, by + 1, '#ffffff', c[2], 3);
    ctx.globalAlpha = 1;
  }

  // ── 공격 그림 ──
  if (s.phase === 'play' && !s.eat) {
    const mx = X(me.x), my = Y(me.y) - R(me.z) - mu * 0.9;
    if (me.f === 'whale' && me.st === 1) {
      // 굵은 물줄기
      const L = R(0.62 * reachK(s)), wd = R(0.045 * reachK(s)), c = Math.cos(me.ang), sn = Math.sin(me.ang), q = Math.min(1, me.tm / 6);
      ctx.save();
      ctx.translate(mx + c * mu * 0.8, my + sn * mu * 0.4);
      ctx.rotate(me.ang);
      ctx.fillStyle = lin(ctx, 0, -wd, 0, wd, [0, 'rgba(160,220,255,.85)'], [0.5, 'rgba(255,255,255,.95)'], [1, 'rgba(59,141,255,.85)']);
      ctx.beginPath();
      ctx.moveTo(0, -wd * 0.5);
      ctx.quadraticCurveTo(L * q * 0.5, -wd * 1.1, L * q, -wd);
      ctx.lineTo(L * q, wd);
      ctx.quadraticCurveTo(L * q * 0.5, wd * 1.1, 0, wd * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (let j = 0; j < 7; j++) {
        const px = ((t * 9 + j * 37) % 100) / 100;
        ell(ctx, L * q * px, Math.sin(j * 2 + t * 0.4) * wd * 0.6, wd * 0.35, wd * 0.25);
        ctx.fill();
      }
      ell(ctx, L * q, 0, wd * 1.4, wd * 1.4);
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.fill();
      ctx.restore();
    }
    if (me.f === 'dragon') {
      // 불 숨결 부채
      const L = R(0.34 * reachK(s)), half = 0.42;
      ctx.save();
      ctx.translate(mx + me.face * mu * 0.9, my - mu * 0.4);
      ctx.rotate(me.ang);
      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, L * (1 - j * 0.25), -half * (1 - j * 0.2), half * (1 - j * 0.2));
        ctx.closePath();
        ctx.fillStyle = ['rgba(255,80,40,.42)', 'rgba(255,160,40,.5)', 'rgba(255,240,150,.6)'][j];
        ctx.fill();
      }
      for (let j = 0; j < 6; j++) {
        const q = ((t * 3 + j * 17) % 40) / 40, a = (hsh(j + Math.floor(t / 40) * 7) - 0.5) * half * 1.6;
        flame(ctx, Math.cos(a) * L * q, Math.sin(a) * L * q, R(0.02) * (1 + q), 0, ['#ff5a2a', '#ffb02e', '#fff2a0']);
      }
      ctx.restore();
    }
    if (me.f === 'eagle' || (me.f === 'bird' && me.cool > 20)) {
      // 머리 위 천둥구름
      if (me.f === 'eagle') {
        for (let j = 0; j < 4; j++) (ell(ctx, X(0.2 + j * 0.2) + Math.sin(t * 0.02 + j) * 6, Y(s.camY + 0.16) + Math.cos(j * 2) * 4, R(0.09), R(0.04)), (ctx.fillStyle = 'rgba(90,90,130,.35)'), ctx.fill());
      }
    }
    if (me.f === 'rainbow') {
      // 무지개 꼬리
      ['#ff5246', '#ff9a2a', '#ffd334', '#3fcf5e', '#3b8dff', '#a65cff'].forEach((c, j) => {
        ctx.beginPath();
        for (let q = 0; q <= 12; q++) {
          const tt = me.tm - q * 2, a = (tt / 160) * TAU * 1.5, px = 0.5 + Math.sin(a) * 0.38, py = s.camY + 0.75 + Math.sin(a * 2) * 0.38;
          if (q) ctx.lineTo(X(px), Y(py) - R(0.05) + (j - 2.5) * 4);
          else ctx.moveTo(X(px), Y(py) - R(0.05) + (j - 2.5) * 4);
        }
        ctx.strokeStyle = c;
        ctx.globalAlpha = 0.75;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
    }
  }
  // 번개 · 덩굴 · 벼락
  for (const l of s.lines) {
    const age = t - l.t;
    if (l.k === 1 || l.k === 3) {
      const a = 1 - age / 14;
      ctx.strokeStyle = `rgba(255,240,120,${a})`;
      ctx.lineWidth = l.k === 3 ? 5 : 3.5;
      ctx.beginPath();
      const n = 6, x0 = X(l.x0), y0 = Y(l.y0), x1 = X(l.x1), y1 = Y(l.y1);
      ctx.moveTo(x0, y0);
      for (let j = 1; j < n; j++) {
        const q = j / n, off = (hsh(l.t + j * 13 + l.id) - 0.5) * R(0.05);
        ctx.lineTo(x0 + (x1 - x0) * q + off, y0 + (y1 - y0) * q + off * 0.5);
      }
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (l.k === 2) {
      const m = s.foes.find((o) => o.id === l.id && !o.dead);
      if (!m) continue;
      const a = Math.min(1, (40 - age) / 10), x0 = X(me.x), y0 = Y(me.y) - mu * 0.8, x1 = X(m.x), y1 = Y(m.y) - R(m.r) * 0.6;
      ctx.strokeStyle = `rgba(47,174,74,${a})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.bezierCurveTo(x0 + (x1 - x0) * 0.3 + 14, y0 + (y1 - y0) * 0.3 - 10, x0 + (x1 - x0) * 0.7 - 14, y0 + (y1 - y0) * 0.7 + 10, x1, y1);
      ctx.stroke();
      ctx.strokeStyle = `rgba(168,240,180,${a})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  // 총알 (먹물 방울 · 물감 폭탄 · 독 주머니 · 반짝 별)
  for (const p of s.shots) {
    const x = X(p.x), y = Y(p.y), r = R(p.r);
    if (p.k === 20) (ell(ctx, x, y - Math.sin((1 - p.t / 14) * Math.PI) * R(0.06), r, r), ink(ctx, '#a65cff', 1.5));
    else if (p.mine) (starPath(ctx, x, y, r * 1.2, 0.45, t * 0.2), ink(ctx, '#ffffff', 1.2, '#8f9ad0'));
    else {
      ell(ctx, x, y, r, r * (p.k === 2 ? 1 : 1.15));
      ink(ctx, p.k === 2 ? '#ff7ad0' : p.k === 4 ? '#2e2a48' : '#4e4a72', 1.5);
      shine(ctx, x - r * 0.3, y - r * 0.3, r * 0.3, r * 0.2, -0.5, 0.6);
    }
  }
  // 먹는 중: 색 띠가 소용돌이로 빨려 든다
  if (s.eat && s.eat.ph === 1) {
    const e = s.eat, m = s.foes.find((o) => o.id === e.id);
    if (m) {
      const [tx, ty] = e.patch >= 0 ? patchXY(s, m, s.patches[e.patch]) : [m.x, m.y - m.r];
      const col = e.patch >= 0 ? s.patches[e.patch].col : m.col, c = ecol(col), q = e.t / e.sk;
      const x0 = X(tx), y0 = Y(ty), x1 = X(me.x), y1 = Y(me.y) - R(0.05);
      for (let j = 0; j < 4; j++) {
        const ph = t * 0.35 + j * 1.57, amp = R(0.04) * (1 - q * 0.6);
        ctx.beginPath();
        for (let k2 = 0; k2 <= 14; k2++) {
          const u = k2 / 14, sw = Math.sin(u * 7 + ph) * amp * Math.sin(u * Math.PI);
          const px = x0 + (x1 - x0) * u - (y1 - y0) * sw * 0.02, py = y0 + (y1 - y0) * u + sw;
          if (k2) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        }
        ctx.strokeStyle = col === RAIN ? ['#ff5246', '#ffd334', '#3fcf5e', '#3b8dff'][j] : c[j % 2];
        ctx.lineWidth = R(0.022) * (1.2 - u0(j));
        ctx.stroke();
      }
      ell(ctx, x1, y1, R(0.04) * (1 + q), R(0.04) * (1 + q));
      ctx.fillStyle = c[1];
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  if (s.eat && s.eat.ph === 0) {
    // 휙: 꼬리 빛
    const e = s.eat;
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = R(0.02);
    ctx.beginPath();
    ctx.moveTo(X(e.x0), Y(e.y0) - R(0.04));
    ctx.lineTo(X(me.x), Y(me.y) - R(0.04));
    ctx.stroke();
  }

  // ── 될 모습 말풍선 (도둑 머리 위: 이 색을 먹으면 무엇이 되나) ──
  if (s.phase === 'play') {
    const res = new Map<string, { mask: number; tier: number; f: FK }>();
    const nearBlob = new Map<number, { m: Foe; d: number }>();
    for (const m of s.foes) {
      if (m.dead || !m.col || m.k !== 'blob' || !onScreen(s, m)) continue;
      const dd = dist(m.x, m.y, me.x, me.y), cur = nearBlob.get(m.col);
      if (!cur || dd < cur.d) nearBlob.set(m.col, { m, d: dd });
    }
    const show = s.foes.filter((m) => !m.dead && m.col && onScreen(s, m) && !m.held && (m.k !== 'blob' || nearBlob.get(m.col)?.m === m));
    for (const m of show) {
      const key = `${m.col}:${m.champ ? 1 : 0}`;
      let r = res.get(key);
      if (!r) res.set(key, (r = mixRes(s, m.col, m.champ ? 1 : 0)));
      const air = ED[m.k].air ? R(0.05) : 0, bx = X(m.x), by = Y(m.y) - R(m.r) * (ED[m.k].air ? 2.6 : 2.3) - air - R(0.04), k = R(0.036);
      const up = r.f === me.f && r.tier > me.tier, isNew = !s.dex.includes(r.f);
      ctx.beginPath();
      ctx.arc(bx, by, k, 0, TAU);
      ctx.moveTo(bx - k * 0.35, by + k * 0.85);
      ctx.lineTo(bx, by + k * 1.4);
      ctx.lineTo(bx + k * 0.35, by + k * 0.85);
      ctx.fillStyle = isNew ? '#fff6c8' : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = up ? '#ffb800' : OUT;
      ctx.lineWidth = up ? 2.2 : 1.4;
      ctx.beginPath();
      ctx.arc(bx, by, k, 0, TAU);
      ctx.stroke();
      ctx.save();
      ctx.translate(bx, by + k * 0.55);
      stamp(ctx, silhouette(r.f, CHEX[r.mask === RAIN ? 8 : r.mask][0], k * 0.46 * sc * 2), k * 0.46);
      ctx.restore();
      if (up) {
        font(0.03, 900);
        text('▲', bx + k * 0.95, by - k * 0.8, '#ffb800', '#ffffff', 2.5);
      }
    }
  }

  // ── 회색 껍데기 위: '이 모습으로 깨요' (금 간 껍데기 + 깨는 모습 실루엣이 계속 떠 있다) ──
  if (s.phase === 'play')
    for (const m of s.foes) {
      const bf = BREAKER[m.k];
      if (m.dead || m.col || !bf || !unl(s, bf) || !onScreen(s, m)) continue;
      const mine = me.f === bf, bx = X(m.x), by = Y(m.y) - R(m.r) * EDRAW * 2.35 - R(0.04), k = R(0.034), pul = mine ? 1 + 0.08 * Math.sin(t * 0.3) : 1;
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(pul, pul);
      ctx.beginPath();
      ctx.arc(0, 0, k, 0, TAU);
      ctx.fillStyle = mine ? '#fff3c4' : 'rgba(255,255,255,.92)';
      ctx.fill();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = mine ? '#ff9a2a' : '#8a86a0';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.translate(0, k * 0.55);
      stamp(ctx, silhouette(bf, CHEX[FD[bf].mask][0], k * 0.46 * sc * 2), k * 0.46);
      ctx.restore();
      // 망치 대신 '쩍' 금 표시
      ctx.strokeStyle = mine ? '#ff7a2a' : '#6a6680';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx + k * 0.75, by - k * 0.95);
      ctx.lineTo(bx + k * 1.05, by - k * 0.6);
      ctx.lineTo(bx + k * 0.85, by - k * 0.45);
      ctx.lineTo(bx + k * 1.15, by - k * 0.1);
      ctx.stroke();
    }

  // ── 방금 일어난 일: 소리 · 물감 · 흔들림 · 글자 (한 번만) — 소리는 한 프레임에 넷까지 (느린 폰에서 여러 틱이 한 프레임에 몰려도) ──
  let nsnd = 0;
  const snd0 = fx.sound;
  fx.sound = (n, p, v) => {
    if (nsnd++ < 1) return snd0.call(fx, n, p, v);
    let q = SNDQ.get(s);
    if (!q) SNDQ.set(s, (q = []));
    if (q.length < 4) q.push([n, p, v, t]);
  };
  try {
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x), ey = Y(e.y), col = Number(e.text);
    switch (e.k) {
      case 'tap': fx.sound('tick', 1.6, 0.5); break;
      case 'deny': fx.sound('tick', 0.7, 0.35); break;
      case 'dash': fx.sound('whoosh', 1.4, 0.8); break;
      case 'suck': fx.sound('swell', 1.3, 0.8); puff(ex, ey, CHEX[col === RAIN ? 8 : col || 0][0], 6, 1.5, 2.4); break;
      case 'shatter': fx.sound('crack', 1.2, 0.9); puff(ex, ey - R(e.x2), '#b9b6c6', 10, 4, 3); fx.kick(3); break;
      case 'drain': fx.sound('shrink', 0.9, 0.8); puff(ex, ey - R(e.x2), '#cfcddb', 8, 2.5, 3);  break;
      case 'kill': {
        const n = e.n, k = e.text as EK, kc = CHEX[e.y2 === RAIN ? 8 : e.y2][0];
        fx.sound('pop', n ? Math.min(2.2, 0.85 + n * 0.07) : 1.25, n ? 0.75 : 0.5);
        if (e.y2) puff(ex, ey, kc, 10, 4, 3.2);
        const m = ED[k];
        puff(ex, ey, '#ffffff', m && m.big ? 8 : 4, 3, 2.4);
        if (n >= 4) say(ex, ey - R(0.04), String(n), n >= 8 ? '#ffd334' : '#ffffff', Math.min(30, 14 + n * 1.5));
        break;
      }
      case 'morph': {
        const f = e.text as FK, c = CHEX[e.x2 === RAIN ? 8 : e.x2][0], same = e.y2 === 1;
        const snd: Record<FK, () => void> = {
          white: () => fx.sound('shrink', 1, 0.6),
          lion: () => (fx.sound('thud', 0.8, 1.1), fx.sound('crack', 0.9, 0.7)),
          whale: () => fx.sound('splash', 0.8, 1.2),
          bird: () => fx.sound('zap', 1.2, 1),
          dragon: () => (fx.sound('swell', 0.6, 1.2), fx.sound('thud', 0.55, 1.3)),
          octo: () => (fx.sound('splash', 1.3, 0.9), fx.sound('swell', 0.8, 0.8)),
          turtle: () => fx.sound('thud', 0.55, 1.3),
          snake: () => (fx.sound('whoosh', 0.8, 0.9), fx.sound('crack', 1.6, 0.6)),
          golem: () => (fx.sound('thud', 0.42, 1.5), fx.sound('crack', 0.6, 0.9)),
          narwhal: () => fx.sound('splash', 0.6, 1.4),
          eagle: () => (fx.sound('zap', 0.7, 1.2), fx.sound('thud', 0.7, 0.9)),
          rainbow: () => (fx.sound('chime', 1, 1.2), fx.sound('swell', 1.2, 0.9)),
        };
        snd[f]();
        if (!same) fx.sound('pop', 0.6, 1);
        puff(ex, ey - R(0.05), c, same ? 10 : 22, same ? 3.5 : 6, 3.4);
        puff(ex, ey - R(0.05), '#ffffff', 8, 4, 2.6);
        fx.ring(ex, ey - R(0.04), c, R(0.2 + 0.03 * e.n), 6);
        fx.kick(same ? 3 : 6);
        if (!s.big || s.big.t !== e.t) fx.memo.nmT = t;
        break;
      }
      case 'roar': fx.sound('thud', 0.7, 1); fx.ring(ex, ey, '#ff7a3a', R(e.x2), 7); puff(ex, ey, '#ffb02e', 14, 5, 3); break;
      case 'nova': fx.sound('thud', 0.5, 1.4); fx.sound('crack', 0.8, 1); fx.ring(ex, ey, '#ff5a2a', R(e.x2), 9); fx.ring(ex, ey, '#ffe36b', R(e.x2 * 0.7), 6); puff(ex, ey, '#ff8a2a', 20, 7, 3.4); fx.kick(10); fx.blink('#fff0c0', 0.3); break;
      case 'splashdown': fx.sound('splash', 0.9, 1.2); fx.ring(ex, ey, '#9fcaff', R(e.x2 * 2), 7); puff(ex, ey, '#bfe6ff', 16, 5, 3); break;
      case 'bigwave': fx.sound('splash', 0.55, 1.4); fx.kick(8); break;
      case 'clap': fx.sound('zap', 1, 1); fx.blink('#fff6b0', 0.25); break;
      case 'storm': fx.sound('zap', 0.6, 1.2); fx.sound('thud', 0.6, 1); fx.blink('#e0e0ff', 0.25); break;
      case 'cloud': fx.sound('splash', e.n ? 1.1 : 1.4, e.n ? 1 : 0.6); puff(ex, ey, '#c8a0ff', e.n ? 16 : 8, 3, 3.2); break;
      case 'slam': fx.sound('thud', 0.6, 1.3); fx.sound('crack', 1, 0.8); fx.ring(ex, ey, '#ff8a2a', R(e.x2), 8); puff(ex, ey, '#ffb02e', 14, 5, 3); puff(ex, ey, '#8a6a5a', 8, 3, 3); fx.kick(e.n ? 9 : 6); break;
      case 'net': fx.sound('whoosh', 0.9, 0.9); fx.sound('crack', 1.6, 0.6); fx.ring(ex, ey, '#3fcf5e', R(e.x2), 6); break;
      case 'stomp': fx.sound('thud', 0.4, 1.5); fx.sound('crack', 0.6, 0.9); fx.ring(ex, ey, '#b07a44', R(0.5), 10); fx.ring(ex, ey, '#ffd334', R(0.32), 6); puff(ex, ey, '#a8743e', 14, 6, 3.6); fx.kick(14); break;
      case 'rainbow': fx.sound('chime', 1.2, 1.2); fx.blink('#ffffff', 0.35); fx.kick(8); break;
      case 'palette': fx.sound('splash', 1.2, 0.8); fx.ring(ex, ey, '#ff7ad0', R(e.x2), 5); break;
      case 'pounce': fx.sound('whoosh', 1.1, 0.6); break;
      case 'land': fx.sound('thud', 0.85, 0.9); fx.sound('crack', 1.3, 0.5); fx.ring(ex, ey, '#ff7a3a', R(e.x2), 5); puff(ex, ey, '#ffb02e', 8, 4, 2.8); fx.kick(3); break;
      case 'breath': fx.sound('whoosh', 0.7, 0.45); break;
      case 'jet': fx.sound('splash', 1.2, 0.8); break;
      case 'wave': fx.sound('splash', 0.8, 0.9); break;
      case 'chain': fx.sound('zap', 1.3, 0.7); break;
      case 'zap': fx.sound('zap', 1 + Math.min(8, e.n) * 0.08, 0.45); puff(ex, ey, '#fff07a', 3, 2.6, 2); break;
      case 'flap': fx.sound('whoosh', 0.6, 0.7); break;
      case 'bolt': fx.sound('zap', 0.75, 0.9); fx.sound('thud', 1.4, 0.4); puff(ex, ey, '#fff07a', 6, 3.5, 2.4); fx.ring(ex, ey, '#fff07a', R(0.06), 3); break;
      case 'throw': fx.sound('boing', 1.4, 0.5); break;
      case 'hop': fx.sound('boing', 0.8, 0.7); break;
      case 'lash': fx.sound('whoosh', 1.3, 0.6); break;
      case 'vine': fx.sound('crack', 1.7, 0.4); puff(ex, ey, '#7fd65a', 3, 2.4, 2.2); break;
      case 'spark': fx.sound('tick', 2, 0.3); break;
      case 'twinkle': fx.sound('ding', 1.8, 0.25); puff(ex, ey, '#ffffff', 3, 2, 2); break;
      case 'surf': fx.sound('splash', 1.6, 0.4); puff(ex, ey, '#ffffff', 3, 2.5, 2.4); break;
      case 'block': fx.sound('ding', 0.6, 0.5); puff(ex, ey, '#ffffff', 3, 2.6, 2);  break;
      case 'clank': fx.sound('tick', 0.9, 0.6); puff(ex, ey, '#e0dee8', 4, 3, 2);  break;
      case 'crackle': fx.sound('crack', 1.4, 0.6); puff(ex, ey, '#fff6e6', 4, 3, 2.2); break;
      case 'armorbreak': fx.sound('crack', 0.9, 1.2); puff(ex, ey, '#fff6e6', 12, 5, 3);  fx.kick(4); break;
      case 'shieldbreak': fx.sound('crack', 1, 1.1); puff(ex, ey, '#d8d4e6', 10, 4.5, 3);  break;
      case 'dodge': fx.sound('whoosh', 2, 0.4); puff(ex, ey, '#ffffff', 4, 4, 1.8);  break;
      case 'miss': fx.sound('whoosh', 1.8, 0.3); puff(ex, ey, '#d8f4ff', 3, 2, 1.8);  break;
      case 'stagger': fx.sound('boing', 0.7, 0.6);  break;
      case 'knock': fx.sound('fail', 1.3, 0.8); fx.sound('shrink', 0.7, 0.8); puff(ex, ey, CHEX[col || 0][0], 22, 6.5, 4.2); puff(ex, ey, CHEX[col || 0][1], 8, 5, 3);  fx.kick(8); break;
      case 'drip': fx.sound('splash', 1.8, 0.6); fx.sound('shrink', 1.2, 0.5); puff(ex, ey, CHEX[col || 0][0], 14, 5.5, 4); puff(ex, ey, CHEX[col || 0][1], 6, 4, 3); break;
      case 'ouch': fx.sound('boing', 1.8, 0.5);  break;
      case 'heart': fx.sound('fail', 0.8, 1); fx.blink('#ff3b30', 0.3); say(ex, ey - R(0.1), '-1', '#ff6a7a', 22); break;
      case 'fail': fx.sound('fail', 0.7, 1.1); break;
      case 'fade': fx.sound('shrink', 1.1, 0.7); puff(ex, ey, '#ffffff', 8, 2.5, 2.6); break;
      case 'bump': fx.sound('tick', 0.6, 0.3); break;
      case 'wind': fx.sound('swell', 1.6, 0.4); break;
      case 'bslam': fx.sound('thud', 0.7, 1); fx.sound('crack', 1.2, 0.6); fx.ring(ex, ey, '#ff8a7a', R(e.x2), 5); puff(ex, ey, '#b9b6c6', 8, 4, 3); fx.kick(5); break;
      case 'drop': fx.sound('whoosh', 1.9, 0.3); break;
      case 'poke': fx.sound('tick', 1.3, 0.5); break;
      case 'spit': fx.sound('boing', 1.6, 0.4); break;
      case 'zip': fx.sound('whoosh', 1.7, 0.5); break;
      case 'puff': fx.sound('splash', 1.5, 0.4); puff(ex, ey, '#4e4a72', 6, 2, 3); break;
      case 'splat': fx.sound('splash', 1.9, 0.5); puff(ex, ey, '#4e4a72', 6, 2.5, 2.6); break;
      case 'escape': fx.sound('shrink', 1.4, 0.6);  break;
      case 'spawn': fx.sound('whoosh', 0.6, 0.5); break;
      case 'champ': fx.sound('swell', 0.8, 0.9); break;
      case 'loose': fx.sound('ding', 1.2, 1); fx.sound('chime', 1.1, 0.8); puff(ex, ey, '#fff6a0', 12, 4, 3);  break;
      case 'bpatch': fx.sound('swell', 0.7, 1.2); fx.sound('thud', 0.5, 1.3); fx.kick(12); fx.blink(CHEX[col === RAIN ? 8 : col][1], 0.3); puff(ex, ey, CHEX[col === RAIN ? 8 : col][0], 20, 6, 3.4); break;
      case 'bossdown': fx.sound('crack', 0.6, 1.4); fx.sound('clear', 1, 1); fx.kick(16); fx.blink('#ffffff', 0.5); for (const c of ['#ff5246', '#ffd334', '#3b8dff', '#3fcf5e']) puff(ex, ey, c, 10, 7, 3.6); break;
      case 'summon': fx.sound('swell', 1, 0.8);  break;
      case 'inkwave': fx.sound('splash', 0.6, 1.2); fx.kick(5); break;
      case 'record': fx.sound('coin', 1.1, 0.9); if (!s.big || t - s.big.t > 70) say(ex, ey - R(0.06), String(e.n), '#ffd334', 24); break;
      case 'star3': fx.sound('coin', 1.2, 1); puff(ex, ey, '#ffd84a', 14, 5.5, 3.2); fx.ring(ex, ey, '#ffd84a', R(0.2), 5); break;
      case 'stage': fx.sound('ding', 1, 0.6); break;
      case 'clear': fx.sound('clear', 1, 1); for (const c of ['#ff5246', '#ffd334', '#3b8dff']) puff(w / 2, h * 0.5, c, 10, 6, 3.4); break;
      case 'pickopen': fx.sound('swell', 1.1, 0.9); break;
      case 'perk': fx.sound('coin', 1, 1); fx.sound('chime', 1.1, 0.9); puff(ex, ey - R(0.1), '#ffe36b', 16, 5, 3.2); fx.ring(ex, ey - R(0.08), '#ffe36b', R(0.2), 5); break;
      case 'end': fx.sound(e.n ? 'clear' : 'fail', 0.9, 1); break;
      case 'retry': fx.sound('boing', 1, 0.7); break;
    }
  }
  } finally {
    delete (fx as { sound?: unknown }).sound;
  }
  if (s.big && (fx.memo.bigT ?? -1) !== s.big.t && s.big.t > seenT) (fx.memo.bigT = s.big.t), fx.sound('chime', 1, 1), fx.blink('#fff6c8', 0.22), fx.kick(6);
  ctx.restore();
  drawHud(ctx, s, w, h);
  // ── 미룰 수 있는 일은 이 프레임에 여유가 있을 때만 (느린 폰에서 한 프레임에 몰리지 않게) ──
  playQueued(s, fx, t);
  // 새로 떨어진 물감을 골목 그림에 (다음 프레임부터 보인다)
  {
    const base = s.paintN - s.paints.length;
    let k = Math.max(fx.memo.pa ?? 0, base);
    // 한 프레임에 한두 방울 (둘째는 여유가 있을 때만 — 큰 한 방에 몰려도 끊기지 않게, 나머지는 다음 프레임)
    for (const end = Math.min(s.paintN, k + 2); k < end && (k === Math.max(fx.memo.pa ?? 0, base) || spare(5)); k++) {
      const p = s.paints[k - base];
      for (let i = Math.floor((p.y - p.r) / TH); i <= Math.floor((p.y + p.r) / TH); i++) {
        const tl = tilesOf(s).get(`${i}:${ww}:${tsc}`);
        if (tl) applyPaint(tl, p, ww, tsc);
      }
      let bl = BLOOMS.get(s);
      if (!bl) BLOOMS.set(s, (bl = []));
      bl.push({ x: p.x, y: p.y, r: p.r, c: p.c === RAIN ? R_ : p.c, seed: p.seed, t });
      if (bl.length > 7) bl.shift();
    }
    fx.memo.pa = k;
  }
  // 위쪽 한 장 미리 굽기 (카메라가 올라가기 전에 · 더 올라갈 골목이 있을 때만)
  if (s.phase === 'play' && t % 3 === 0 && i0 * TH > -STAGES[s.stage].D + 1e-9 && spare(4)) prepTile(s, i0 - 1, ww, tsc);
  // 미리 굽기: 이 판에 나올 스티커 — 한 항목을 굽고, 다음 여유 프레임에 다 그려 둔다(큰 것은 빈 가장자리를 뺀 작은 캔버스로).
  // 결과·선물 화면에선 여러 개씩(결과 화면은 다음 판 것), 판 중엔 두 프레임에 하나씩
  {
    const rest = s.phase === 'result' || s.phase === 'pick', ws = s.phase === 'result' && s.stage + 1 < STAGES.length ? s.stage + 1 : s.stage;
    const list = warmList(ws, s.lv, w, sc), mk = `wm${ws}:${s.lv}`;
    let i = fx.memo[mk] ?? 0, did = 0;
    // 판 중: 화면의 도둑 색을 먹으면 될 모습(그 단계)부터
    let soon: (() => HTMLCanvasElement) | null = null;
    if (s.phase === 'play' && !WARM_PEND)
      for (const m of s.foes) {
        if (m.dead || !m.col || !onScreen(s, m)) continue;
        const combo = `${m.col}|${m.champ ? 1 : 0}|${s.me.mask}|${s.me.tier}|${s.lv}|${s.stage}|${s.perk[1]}|${s.dex.length}|${w}|${sc}`;
        if (SOON_OK.has(combo)) continue;
        const r = mixRes(s, m.col, m.champ ? 1 : 0), px = w * FD[r.f].r * (1 + 0.12 * (Math.min(5, r.tier) - 1)) * (1 + 0.012 * (s.lv - 1)) * sc * 1.05, q = qOf(px);
        const pose = [0, 1, 2].find((ps) => !SPR.has(`f:${r.f}:${ps}:${q}`));
        const icon = w * 0.018 * sc * 1.05, fill = CHEX[r.mask === RAIN ? 8 : r.mask][0], sil = w * 0.036 * 0.46 * sc * 2;
        if (pose !== undefined) soon = () => ((WARM_KEY = `f:${r.f}:${pose}:${q}`), formSprite(r.f, pose, px));
        else if (!SPR.has(`f:${r.f}:0:${qOf(icon)}`)) soon = () => ((WARM_KEY = `f:${r.f}:0:${qOf(icon)}`), formSprite(r.f, 0, icon));
        else if (!SPR.has(`s:${r.f}:${fill}:${qOf(sil)}`)) soon = () => ((WARM_KEY = ''), silhouette(r.f, fill, sil));
        else if (!s.dex.includes(r.f) && !WORDS.has(bigKey(`${FD[r.f].name}!`, FD[r.f].mask, w, sc)))
          soon = () => ((WARM_KEY = ''), bigWord(`${FD[r.f].name}!`, FD[r.f].mask, w, sc), subWord(FD[r.f].does, w, sc).c);
        if (soon) break;
        if (SOON_OK.size > 400) SOON_OK.clear();
        SOON_OK.add(combo);
      }
    // (판 첫 1.5초는 도둑들이 걸어 들어오는 동안이라 조금 더 — 결과 화면 없이 바로 들어온 판도 금방 다 굽게)
    const intro = s.phase === 'play' && s.stageT < 90;
    // (결과 카드가 미끄러져 들어오는 첫 몇 프레임은 쉰다)
    if (!(rest && s.pt < 12))
      while (did < (rest ? 8 : intro ? 3 : 1) && spare(rest ? 12 : intro ? 9 : 5)) {
        if (WARM_PEND) (rest && SPR.get(WARM_KEY) === WARM_PEND ? shrink(WARM_KEY) : flushNow(WARM_PEND)), (WARM_PEND = null), did++;
        else if (soon) (WARM_PEND = soon()), (soon = null), did++;
        else if (!rest && !intro && t % 2) break;
        else if (i < (rest ? list.length : WARM_CORE.get(`${ws}:${s.lv}:${w}:${sc}`) ?? list.length)) {
          if (!SPR.has(list[i][0])) (WARM_KEY = list[i][0]), (WARM_PEND = list[i][1]() || null), did++;
          i++;
        } else break;
      }
    fx.memo[mk] = i;
  }
  fx.memo.t = t;
}
/** 소용돌이 띠 굵기 차례 */
const u0 = (j: number) => j * 0.18;

// ───────────────────────────── 그리기: 띠 · 결과 · 선물 · 끝 ─────────────────────────────
/** 테두리 굵은 글자를 한 번 구워 둔 것 (큰 순간 띠) — 미리 굽기 목록에도 들어간다 */
type Word = { c: HTMLCanvasElement; tw: number; th: number };
const WORDS = new Map<string, Word>();
function word(str: string, px: number, fill: string, stroke: string, lw: number, res: number): Word {
  const key = [str, px, fill, stroke, lw, res].join('|');
  let wd = WORDS.get(key);
  if (!wd) {
    if (WORDS.size > 60) WORDS.delete(WORDS.keys().next().value!);
    const f = `900 ${px}px system-ui, sans-serif`, m = document.createElement('canvas').getContext('2d')!;
    m.font = f;
    const tw = m.measureText(str).width + lw * 2 + 4, th = px * 1.5 + lw * 2;
    const c = layer(tw, th, res, (g) => {
      (g.font = f), (g.textAlign = 'center'), (g.textBaseline = 'middle'), (g.lineJoin = 'round');
      (g.lineWidth = lw), (g.strokeStyle = stroke), g.strokeText(str, tw / 2, th / 2);
      (g.fillStyle = fill), g.fillText(str, tw / 2, th / 2);
    });
    WORDS.set(key, (wd = { c, tw, th }));
  }
  return wd;
}
const bigArgs = (col: number, w: number, sc: number) => [Math.max(12, Math.round(w * 0.06)), '#ffffff', col ? CHEX[col === RAIN ? 8 : col][2] : '#ff5a2e', 6, sc * 1.5] as const;
const bigKey = (str: string, col: number, w: number, sc: number) => [str, ...bigArgs(col, w, sc)].join('|');
const bigWord = (str: string, col: number, w: number, sc: number) => word(str, ...bigArgs(col, w, sc));
const subWord = (str: string, w: number, sc: number) => word(str, Math.max(12, Math.round(w * 0.034)), '#3b3150', '#ffffff', 4, sc * 1.5);
const drawWord = (ctx: C2, wd: Word, x: number, y: number) => ctx.drawImage(wd.c, x - wd.tw / 2, y - wd.th / 2, wd.tw, wd.th);
/** 위·아래 띠 (글자가 많아 매 프레임 다시 그리지 않고, 내용이 바뀔 때만 굽는다) — 돌려주는 값: 모습 시간 막대 자리 */
function hudBands(ctx: C2, s: SoulState, w: number, h: number, sc: number, boss: Foe | undefined, part: 0 | 1): [number, number, number, number] | null {
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const d = STAGES[s.stage], me = s.me;
  let bar: [number, number, number, number] | null = null;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  const text = (str: string, x: number, y: number, fill: string, stroke = '', lw = 0) => {
    ctx.lineJoin = 'round';
    if (lw > 0) (ctx.lineWidth = lw), (ctx.strokeStyle = stroke), ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  };
  const INK = '#3b3150', MUTED = '#9a8fb0', CREAM = '#ffeed2', LINE = '#ebc98e';
  ctx.textBaseline = 'middle';
  if (part === 0) {
  // ── 위 띠: 판 · 이름 · 하트 · 별 · 정령 레벨 ──
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, w, Y(0.1));
  ctx.fillStyle = LINE;
  ctx.fillRect(0, Y(0.1) - 2, w, 2);
  ell(ctx, X(0.062), Y(0.05), R(0.036), R(0.036));
  ctx.fillStyle = lin(ctx, 0, Y(0.015), 0, Y(0.085), [0, '#ff9a6a'], [1, '#ff6a8a']);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  font(0.046, 900);
  text(String(s.stage + 1), X(0.062), Y(0.052), '#ffffff');
  ctx.textAlign = 'left';
  font(0.042, 900);
  text(d.name, X(0.115), Y(0.052), INK);
  const nw = ctx.measureText(d.name).width;
  font(0.034, 700);
  text(`/ ${STAGES.length}`, X(0.115) + nw + R(0.012), Y(0.054), MUTED);
  for (let i = 0; i < 3; i++) {
    heartPath(ctx, X(0.585 + i * 0.05), Y(0.05), R(0.017));
    ctx.fillStyle = i < s.hearts ? '#ff4d6e' : '#e6dccc';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  starPath(ctx, X(0.745), Y(0.049), R(0.022));
  ctx.fillStyle = '#ffc93c';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  font(0.04, 900);
  text(String(s.stars), X(0.772), Y(0.053), INK);
  ctx.save();
  ctx.translate(X(0.86), Y(0.078));
  stamp(ctx, formSprite('white', 0, R(0.016) * sc * 1.05), R(0.016));
  ctx.restore();
  font(0.035, 900);
  text(`Lv${s.lv}`, X(0.888), Y(0.053), '#6a74a8');
  return null;
  }

  // ── 아래 띠: 별 셋 · 지금 모습 · 한 줄 도움말 ──
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, Y(1.31), w, h - Y(1.31));
  ctx.fillStyle = LINE;
  ctx.fillRect(0, Y(1.31), w, 2);
  const words = starWords(s), res = s.phase === 'result', st = d.star;
  const prog = st.k === 'form' ? ` ${Math.min(st.n, s.multi[-1] ?? 0)}/${st.n}` : '';
  const got3 = res ? s.starOk[2] : st.k === 'multi' ? s.star3 : st.k === 'form' ? (s.multi[-1] ?? 0) >= st.n : false;
  const lost3 = !got3 && (res || (st.k === 'time' && s.stageT > st.n * 60));
  const state = [res ? 1 : 0, s.lostHeart ? -1 : res ? 1 : 0, got3 ? 1 : lost3 ? -1 : 0];
  font(0.033, 800);
  const labels = words.map((q, i) => q + (i === 2 && state[2] === 0 ? prog : ''));
  const gap = R(0.012), pad = Math.min(R(0.065), (w - R(0.03) - gap * 2 - labels.reduce((a, q) => a + ctx.measureText(q).width, 0)) / 3);
  const ws = labels.map((q) => ctx.measureText(q).width + pad), total = ws.reduce((a, c) => a + c, 0) + gap * 2;
  let cx = (w - total) / 2;
  labels.forEach((q, i) => {
    const cw = ws[i], cy = Y(1.345), on = state[i] > 0, off = state[i] < 0;
    rr(ctx, cx, cy - R(0.026), cw, R(0.052), R(0.026));
    ctx.fillStyle = on ? '#ffe9a0' : off ? '#efe6d6' : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = on ? '#e0a020' : off ? '#d6c8b0' : '#cdb894';
    ctx.lineWidth = on ? 2 : 1.4;
    ctx.stroke();
    starPath(ctx, cx + pad * 0.42, cy - 0.5, R(0.016));
    ctx.fillStyle = on ? '#ffb800' : off ? '#d6c8b0' : '#e9dcc0';
    ctx.fill();
    ctx.textAlign = 'left';
    font(0.033, 800);
    text(q, cx + pad * 0.76, cy + 0.5, off ? '#b8a890' : INK);
    if (off) (ctx.fillStyle = '#b8a890'), ctx.fillRect(cx + pad * 0.72, cy, cw - pad, 1.5);
    cx += cw + gap;
  });
  // 지금 모습: 작은 그림 · 이름 · 단계 · 점수 배수 · 남은 시간
  {
    const by = Y(1.405), c = CHEX[me.mask === RAIN ? 8 : me.mask];
    ctx.save();
    ctx.translate(X(0.075), by + R(0.022));
    stamp(ctx, formSprite(me.f, 0, R(0.018) * sc * 1.05), R(0.018));
    ctx.restore();
    ctx.textAlign = 'left';
    font(0.038, 900);
    const nm = me.f === 'white' ? '하얀 정령 (맨몸)' : FD[me.f].name;
    text(nm, X(0.13), by, me.f === 'white' ? '#9a8fb0' : c[2]);
    const nw2 = ctx.measureText(nm).width;
    if (me.f !== 'white' && me.f !== 'golem' && me.f !== 'rainbow') {
      font(0.033, 900);
      const tag = `${me.tier}단계 · 점수 ×${streakMul(s)}`;
      text(tag, X(0.13) + nw2 + R(0.02), by + 1, INK);
      const q = clamp(me.T / Math.max(1, me.Tmax), 0, 1), bx = X(0.13) + nw2 + R(0.04) + ctx.measureText(tag).width, bw = Math.max(R(0.05), X(0.95) - bx);
      rr(ctx, bx, by - R(0.008), bw, R(0.016), R(0.008));
      ctx.fillStyle = '#efe6d6';
      ctx.fill();
      bar = [bx, by - R(0.008), bw, R(0.016)];
      void q;
    }
  }
  ctx.textAlign = 'center';
  let tip = `${d.name}: ${d.news}`;
  if (s.phase === 'pick') tip = '광장의 큰 물건 둘 중 하나를 톡!';
  else if (s.phase === 'result') tip = s.newDex.length ? `새 모습 ${FD[s.newDex[s.newDex.length - 1]].name}: ${FD[s.newDex[s.newDex.length - 1]].does}` : s.got === 3 ? '별 셋! 판 점수가 네 배' : '별이 많을수록 판 점수가 곱해져요';
  else if (s.phase === 'end') tip = s.won ? '마을이 모두 알록달록해졌어요!' : '누르면 다시 해요';
  else if (s.phase === 'fail') tip = '맨몸으로 너무 맞았어요 — 이 판만 다시!';
  else if (!s.tapped && s.stage === 0) tip = '진한 빨강 도둑을 톡! 색을 쭉 빨아들여요';
  else if (s.patches.some((p) => p.loose && !p.gone)) tip = '헐거워진 대장 색을 톡 — 대장은 작아지고 나는 커져요!';
  else if (me.f === 'white') tip = '하얀 맨몸! 아무 색 도둑이나 톡 — 맞으면 하트 -1';
  else if (boss) tip = `${ED[boss.k].name}: ${ED[boss.k].line}`;
  else if (s.stage === 0 && s.taps < 4) tip = '같은 색을 또 먹으면 더 커지고 점수 ×1.5, ×2…';
  else if (d.newFoe && s.stageT < 900) tip = `${ED[d.newFoe].name}: ${ED[d.newFoe].line}`;
  font(0.033, 800);
  text(tip, w / 2, Y(1.452), INK);
  return bar;
}
type Bar = [number, number, number, number] | null;
type Cv2 = [HTMLCanvasElement | null, HTMLCanvasElement | null];
/** 띠 캔버스: c 앞(보이는 것) · b 뒤(새로 굽는 것) · ph 뒤 상태(0 없음 · 1 그림 · 2 다 그림) · p 바뀐 줄 안 시각 */
const BANDS = new WeakMap<object, { k: [string, string]; c: Cv2; b: Cv2; bk: [string, string]; ph: [number, number]; bb: Bar; p: [number, number]; bar: Bar; w: number; sc: number; t: number }>();
function drawHud(ctx: C2, s: SoulState, w: number, h: number) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const sc = typeof ctx.getTransform === 'function' ? Math.min(2, Math.max(1, Math.round(ctx.getTransform().a || 1))) : 1;
  const d = STAGES[s.stage], me = s.me;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Math.round(R(sz)))}px system-ui, sans-serif`);
  const text = (str: string, x: number, y: number, fill: string, stroke = '', lw = 0) => {
    ctx.lineJoin = 'round';
    if (lw > 0) (ctx.lineWidth = lw), (ctx.strokeStyle = stroke), ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  };
  const INK = '#3b3150', MUTED = '#9a8fb0';
  ctx.textBaseline = 'middle';
  const boss = s.foes.find((m) => ED[m.k].boss && !m.dead);
  {
    const st = d.star, kTop = [s.stage, s.hearts, s.stars, s.lv].join('|');
    const kBot = [s.stage, s.phase, me.f, me.tier, me.mask, s.multi[-1] ?? 0, s.star3, s.lostHeart, st.k === 'time' && s.stageT > st.n * 60, s.tapped, s.taps < 4, s.newDex.length, s.got, s.patches.some((p) => p.loose && !p.gone), !!boss, s.stageT < 900, s.won, s.starOk.join()].join('|');
    let hb = BANDS.get(s);
    if (!hb || hb.w !== w || hb.sc !== sc) BANDS.set(s, (hb = { k: ['', ''], c: [null, null], b: [null, null], bk: ['', ''], ph: [0, 0], bb: null, p: [-1, -1], bar: null, w, sc, t: -99 }));
    // 위·아래 띠는 따로 작은 캔버스에 — 바뀐 쪽만, 뒤 캔버스에 그리고(1) → 여유 있는 프레임에 다 그려 두고(2) → 바꿔 끼운다
    // (느린 폰에서 톡 하는 순간 글자 그리기가 한 프레임에 몰리지 않게 · 빠른 폰에선 2프레임 늦을 뿐)
    const yb = Y(1.31) - 2, keys = [kTop, kBot];
    for (const part of [1, 0] as const) {
      const front = !hb.c[part];
      if (hb.ph[part] === 2) {
        const c = hb.c[part];
        (hb.c[part] = hb.b[part]), (hb.b[part] = c), (hb.k[part] = hb.bk[part]), (hb.ph[part] = 0);
        if (part) hb.bar = hb.bb;
        continue;
      }
      if (hb.ph[part] === 1) {
        if (hb.t !== t && (spare(5) || t - hb.p[part] >= 6)) flushNow(hb.b[part]!), (hb.ph[part] = 2), (hb.t = t);
        continue;
      }
      if (hb.k[part] === keys[part]) {
        hb.p[part] = -1;
        continue;
      }
      if (hb.p[part] < 0) hb.p[part] = t;
      if (!front && (hb.t === t || (!spare(5) && t - hb.p[part] < 6))) continue;
      const ch = part ? h - yb : Y(0.1);
      let c = front ? hb.c[part] : hb.b[part];
      if (!c) ((c = document.createElement('canvas')), (c.width = Math.ceil(w * sc)), (c.height = Math.ceil(ch * sc)));
      const g = c.getContext('2d')!;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, c.width, c.height);
      g.setTransform(sc, 0, 0, sc, 0, part ? -yb * sc : 0);
      const bar = hudBands(g, s, w, h, sc, boss, part);
      hb.t = t;
      if (front) {
        (hb.c[part] = c), (hb.k[part] = keys[part]);
        if (part) hb.bar = bar;
      } else (hb.b[part] = c), (hb.bk[part] = keys[part]), (hb.ph[part] = 1), part && (hb.bb = bar);
    }
    for (const part of [0, 1] as const) {
      const c = hb.c[part];
      if (c) ctx.drawImage(c, 0, part ? yb : 0, c.width / sc, c.height / sc);
    }
    if (hb.bar) {
      const [bx, by, bw, bh] = hb.bar, q = clamp(me.T / Math.max(1, me.Tmax), 0, 1);
      rr(ctx, bx, by, Math.max(bh, bw * q), bh, bh / 2);
      ctx.fillStyle = me.T < 100 && (t >> 3) % 2 ? '#ffffff' : CHEX[me.mask === RAIN ? 8 : me.mask][0];
      ctx.fill();
    }
  }

  // ── 판 시작 띠 (NEW 한 줄) ──
  if (s.banner && s.phase === 'play' && !(s.big && s.big.t >= s.banner.t)) {
    const age = t - s.banner.t, T = 200;
    if (age < T) {
      const a = Math.min(1, age / 10, (T - age) / 14), slide = (1 - Math.min(1, age / 10)) * R(0.05), by = Y(0.125) - slide;
      ctx.globalAlpha = clamp(a, 0, 1);
      rr(ctx, X(0.05), by, R(0.9), R(0.112), R(0.03));
      ctx.fillStyle = 'rgba(255,250,240,.96)';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      font(0.038, 900);
      const nm = d.unlock ? FD[d.unlock].name : ED[d.newFoe ?? 'king'].name, hw = ctx.measureText(s.banner.head).width, nw3 = ctx.measureText(nm).width, pill = R(0.105), gap2 = R(0.014);
      const icon = d.unlock ? R(0.05) : 0, tot = hw + gap2 + pill + gap2 + icon + nw3;
      let bx0 = w / 2 - tot / 2;
      ctx.textAlign = 'left';
      text(s.banner.head, bx0, by + R(0.033), '#e0482f');
      bx0 += hw + gap2;
      rr(ctx, bx0, by + R(0.012), pill, R(0.042), R(0.021));
      ctx.fillStyle = '#ff3b5c';
      ctx.fill();
      font(0.034, 900);
      ctx.textAlign = 'center';
      text('NEW', bx0 + pill / 2, by + R(0.034), '#ffffff');
      bx0 += pill + gap2;
      if (d.unlock) {
        ctx.save();
        ctx.translate(bx0 + icon / 2, by + R(0.052));
        stamp(ctx, formSprite(d.unlock, 0, R(0.016) * sc * 1.05), R(0.016));
        ctx.restore();
        bx0 += icon;
      }
      ctx.textAlign = 'left';
      font(0.038, 900);
      text(nm, bx0, by + R(0.033), d.unlock ? CHEX[FD[d.unlock].mask === RAIN ? 8 : FD[d.unlock].mask][2] : INK);
      ctx.textAlign = 'center';
      font(0.034, 800);
      text(s.banner.sub, w / 2, by + R(0.081), INK);
      ctx.globalAlpha = 1;
    }
  }
  // ── 손가락 (첫 톡 · 헐거운 대장 색) ──
  if (s.phase === 'play' && !s.eat) {
    let hx = -1, hy = -1, hr = 0;
    const champ = !s.tapped && s.stage === 0 ? s.foes.find((m) => m.champ && !m.dead) : undefined;
    if (champ) (hx = champ.x), (hy = champ.y - champ.r - s.camY), (hr = champ.r);
    else if (boss) {
      const p = s.patches.find((q) => q.loose && !q.gone);
      if (p) {
        const [px, py] = patchXY(s, boss, p);
        (hx = px), (hy = py - s.camY), (hr = 0.05);
      }
    }
    if (hx >= 0) {
      const press = Math.max(0, Math.sin(t * 0.14)), px = X(hx) + R(0.05), py = Y(hy) + R(hr * 0.6);
      ell(ctx, X(hx), Y(hy), R(hr * (1.6 + 0.3 * press)), R(hr * (1.6 + 0.3 * press)));
      ctx.strokeStyle = `rgba(255,255,255,${0.9 - 0.5 * press})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      drawHand(ctx, px, py, R(0.085), press);
      font(0.046, 900);
      ctx.textAlign = 'center';
      text('톡!', px + R(0.09), py - R(0.02), '#ffffff', INK, 4);
    }
  }
  // ── 큰 순간 띠 (처음 되어 보는 모습 · 별 셋째 · 대장) ──
  if (s.big && t - s.big.t < 70 && s.phase !== 'end') {
    const age = t - s.big.t, pop = age < 7 ? 1.4 - 0.4 * (age / 7) : 1 + 0.03 * Math.sin(age * 0.5), a = Math.min(1, (70 - age) / 14);
    if (age === 0 || fx.memo.bandY === undefined) fx.memo.bandY = me.y - s.camY < 0.82 ? 1.1 : 0.3;
    const by = Y(fx.memo.bandY), c = CHEX[s.big.col === RAIN ? 8 : s.big.col || 0];
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, by);
    ctx.rotate(-0.04);
    ctx.save();
    ctx.scale(1, 0.52);
    burstPath(ctx, 0, 0, R(0.33) * Math.min(1.15, pop), 18, 0.8, age * 0.02);
    ctx.fillStyle = s.big.col ? c[1] : 'rgba(255,244,170,.95)';
    ctx.fill();
    ctx.strokeStyle = s.big.col ? c[2] : '#ff8a3d';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.scale(pop, pop);
    drawWord(ctx, bigWord(s.big.text, s.big.col, w, sc), 0, -R(0.018));
    ctx.restore();
    font(0.034, 900);
    if (s.big.star) {
      const sw = ctx.measureText('별 셋째!').width, k = R(0.022) * (1 + 0.15 * Math.sin(age * 0.5));
      text('별 셋째!', k * 0.9, R(0.04), '#b06a00', '#ffffff', 4);
      starPath(ctx, -sw / 2 - k * 0.4, R(0.038), k);
      ctx.fillStyle = '#ffc93c';
      ctx.fill();
      ctx.strokeStyle = '#a06a12';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (s.big.sub) drawWord(ctx, subWord(s.big.sub, w, sc), 0, R(0.04));
    ctx.restore();
  }

  // ── 결과: 별 · 점수 · 레벨 · 되살린 골목 · 도감 ──
  if (s.phase === 'result') {
    const pt = s.pt, a = Math.min(1, pt / 10), slide = (1 - a) * R(0.06);
    const cx0 = X(0.05), cy0 = Y(0.15) - slide, cw = R(0.9), chh = R(0.62);
    ctx.globalAlpha = a;
    rr(ctx, cx0, cy0 + 4, cw, chh, R(0.04));
    ctx.fillStyle = 'rgba(59,49,80,.25)';
    ctx.fill();
    rr(ctx, cx0, cy0, cw, chh, R(0.04));
    ctx.fillStyle = '#fffaf2';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    rr(ctx, X(0.22), cy0 - R(0.014), R(0.56), R(0.07), R(0.02));
    ctx.fillStyle = '#ff7a59';
    ctx.fill();
    ctx.stroke();
    font(0.044, 900);
    ctx.textAlign = 'center';
    text(s.won ? '모든 마을을 되살렸다!' : `${s.stage + 1}판 마을 되살림!`, w / 2, cy0 + R(0.022), '#ffffff');
    // 왼쪽: 되살린 골목 지도 (아래가 시작, 위가 광장)
    const mapX = cx0 + R(0.04), mapY = cy0 + R(0.07), mapW = R(0.17), mapH = chh - R(0.16);
    rr(ctx, mapX - 3, mapY - 3, mapW + 6, mapH + 6, 6);
    ctx.fillStyle = '#e6dccc';
    ctx.fill();
    ctx.save();
    rr(ctx, mapX, mapY, mapW, mapH, 4);
    ctx.clip();
    const L = d.D + A, k = Math.min(mapH / (L * w), mapW / w), top = -d.D;
    for (const [key, tl] of tilesOf(s)) {
      if (!key.endsWith(`:${Math.round(w)}:${Math.min(1.5, sc)}`)) continue;
      const yy = mapY + (tl.i * TH - top) * w * k;
      if (yy > mapY + mapH || yy + TH * w * k < mapY) continue;
      ctx.drawImage(tl.rev, mapX + (mapW - w * k) / 2, yy, w * k, TH * w * k + 0.5);
    }
    ctx.restore();
    rr(ctx, mapX, mapY, mapW, mapH, 4);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    font(0.034, 900);
    text(`${Math.round(s.pct * 100)}%`, mapX + mapW / 2, mapY + mapH + R(0.03), '#e0482f');
    // 오른쪽: 별 셋
    const rx0 = cx0 + R(0.26), rw = R(0.6);
    for (let i = 0; i < 3; i++) {
      const at = 12 + i * 12, sx0 = rx0 + rw * (0.17 + i * 0.33), sy0 = cy0 + R(0.13), on = s.starOk[i] && pt >= at, pop = on ? 1 + Math.max(0, 1 - (pt - at) / 8) * 0.6 : 1;
      starPath(ctx, sx0, sy0, R(0.048) * pop);
      ctx.fillStyle = on ? '#ffc93c' : '#ece2d0';
      ctx.fill();
      ctx.strokeStyle = on ? '#a06a12' : '#d2c4a8';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (on && (fx.memo['st' + i] ?? -1) !== s.stage) (fx.memo['st' + i] = s.stage), fx.sound('ding', 1 + i * 0.18, 0.9), fx.burst(sx0, sy0, '#ffd84a', 10, 3, 2.4);
      font(0.03, 800);
      const lab = starWords(s)[i], cut = ctx.measureText(lab).width > rw * 0.31 ? lab.lastIndexOf(' ', Math.ceil(lab.length / 2) + 1) : -1;
      const fc = s.starOk[i] ? INK : '#b8a890';
      if (cut > 0) text(lab.slice(0, cut), sx0, sy0 + R(0.064), fc), text(lab.slice(cut + 1), sx0, sy0 + R(0.096), fc);
      else text(lab, sx0, sy0 + R(0.075), fc);
    }
    rr(ctx, rx0, cy0 + R(0.235), rw, R(0.056), R(0.02));
    ctx.fillStyle = '#fff0d6';
    ctx.fill();
    font(0.042, 900);
    text(`+${fmt(s.gain)}점`, rx0 + rw * 0.3, cy0 + R(0.264), '#e0482f');
    font(0.03, 800);
    text(`별 ${s.got}개 = ×${STAR_MUL[s.got]}`, rx0 + rw * 0.74, cy0 + R(0.265), INK);
    // 정령 레벨
    ctx.save();
    ctx.translate(rx0 + R(0.03), cy0 + R(0.355));
    stamp(ctx, formSprite('white', 1, R(0.02) * sc * 1.05), R(0.02));
    ctx.restore();
    drawGear(ctx, rx0 + R(0.03), cy0 + R(0.355), R(0.02), s.lv, t);
    ctx.textAlign = 'left';
    font(0.035, 900);
    text(`정령 Lv${s.lv - 1} → Lv${s.lv}`, rx0 + R(0.065), cy0 + R(0.335), '#6a74a8');
    font(0.03, 700);
    text(LV_GIFT[s.lv] ?? '모습이 더 오래·크게·넓게 칠해요', rx0 + R(0.065), cy0 + R(0.372), LV_GIFT[s.lv] ? '#e0482f' : INK);
    // 도감 (되어 본 모습) — 다음 판에 풀릴 모습은 점선 동그라미
    const nx: StageDef | undefined = STAGES[s.stage + 1];
    font(0.03, 800);
    text(`도감 ${s.dex.length}/${DEX.length}`, rx0, cy0 + R(0.425), MUTED);
    if (s.newDex.length) {
      ctx.textAlign = 'right';
      text(`새 모습! ${s.newDex.map((f) => FD[f].name).slice(-2).join(' · ')}`, rx0 + rw, cy0 + R(0.425), '#e0482f');
    }
    ctx.textAlign = 'center';
    DEX.forEach((f, i) => {
      const has = s.dex.includes(f), isNew = s.newDex.includes(f), u = R(0.019), col = i % 6, row = Math.floor(i / 6);
      const px = rx0 + R(0.045) + col * (rw - R(0.09)) / 5, py = cy0 + R(0.5 + row * 0.075) - (isNew ? Math.abs(Math.sin(t * 0.18 + i)) * R(0.01) : 0);
      if (isNew) (ell(ctx, px, py - u, u * 1.8, u * 1.8), (ctx.fillStyle = '#ffe9a0'), ctx.fill());
      const next = !has && !!nx && nx.unlock === f;
      if (next) {
        ell(ctx, px, py - u, u * 1.8, u * 1.8);
        ctx.strokeStyle = '#ff8a3d';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 3]);
        ctx.lineDashOffset = -t * 0.3;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.save();
      ctx.translate(px, py);
      stamp(ctx, has ? formSprite(f, 0, u * sc * 1.05) : silhouette(f, '#cfc4b0', u * sc * 1.05), u);
      ctx.restore();
      if (next) (font(0.036, 900), text('?', px, py - u, '#ff8a3d', '#ffffff', 3));
    });
    font(0.036, 900);
    if (pt >= RES_MIN) text(s.won ? '톡!' : d.boss && d.ch < PERKS.length ? '톡 하면 장 끝 선물!' : '톡 하면 다음 판', w / 2, cy0 + chh - R(0.03), (t >> 3) % 2 ? '#e0482f' : '#ff8a3d');
    else if (nx) text(d.boss ? `다음: ${CHAPTERS[nx.ch]}` : nx.unlock ? `다음 판엔 ${FD[nx.unlock].name}!` : `다음: ${nx.name}`, w / 2, cy0 + chh - R(0.03), MUTED);
    ctx.globalAlpha = 1;
  }

  // ── 장 끝: 둘 중 하나 (광장의 큰 물건을 톡) ──
  if (s.phase === 'pick') {
    const pt = s.pt, picked = s.picked, opts = PERKS[d.ch];
    rr(ctx, X(0.08), Y(0.14), R(0.84), R(0.105), R(0.03));
    ctx.fillStyle = 'rgba(255,250,240,.96)';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    font(0.042, 900);
    ctx.textAlign = 'center';
    text(`${CHAPTERS[d.ch]} 끝! 선물 하나`, w / 2, Y(0.172), '#e0482f');
    font(0.034, 800);
    text(picked < 0 ? '광장의 큰 물건 둘 중 하나를 톡!' : `${opts[picked].name}: ${opts[picked].line}`, w / 2, Y(0.216), INK);
    opts.forEach((o, i) => {
      const px = X(i ? 0.72 : 0.28), drop = picked < 0 ? Math.max(0, 1 - pt / 16) : 0, py = Y(0.9) - drop * drop * R(0.5);
      const chosen = picked === i, other = picked >= 0 && !chosen, k = R(0.2) * (chosen ? 1 + 0.15 * Math.sin(Math.min(1, pt / 12) * Math.PI) : 1);
      ctx.globalAlpha = other ? Math.max(0, 1 - pt / 20) : 1;
      ctx.fillStyle = 'rgba(50,35,70,.22)';
      ell(ctx, px, Y(0.905), R(0.13), R(0.035));
      ctx.fill();
      if (picked < 0 && pt >= PICK_MIN) {
        ell(ctx, px, Y(0.905), R(0.17 + 0.012 * Math.sin(t * 0.2)), R(0.05));
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.setLineDash([7, 6]);
        ctx.lineDashOffset = -t * 0.5;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      drawPerk(ctx, d.ch, i, px, py, k, t);
      rr(ctx, px - R(0.205), Y(0.96), R(0.41), R(0.105), R(0.025));
      ctx.fillStyle = chosen ? '#ffe9a0' : 'rgba(255,250,240,.96)';
      ctx.fill();
      ctx.strokeStyle = chosen ? '#e0a020' : INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      font(0.04, 900);
      text(o.name, px, Y(0.993), '#e0482f');
      font(0.031, 800);
      text(o.line, px, Y(1.035), INK);
      ctx.globalAlpha = 1;
    });
  }
  // ── 실패: 그 판만 바로 다시 ──
  if (s.phase === 'fail') {
    const a = Math.min(1, s.pt / 10);
    ctx.globalAlpha = a;
    rr(ctx, X(0.12), Y(0.45), R(0.76), R(0.36), R(0.04));
    ctx.fillStyle = '#fffaf2';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.save();
    ctx.translate(w / 2, Y(0.62) + Math.sin(t * 0.15) * R(0.006));
    ctx.rotate(Math.sin(t * 0.1) * 0.15);
    stamp(ctx, formSprite('white', 2, R(0.05) * sc * 1.05), R(0.05));
    ctx.restore();
    font(0.048, 900);
    ctx.textAlign = 'center';
    text('하얗게 질렸다…', w / 2, Y(0.68), '#e0482f');
    font(0.036, 800);
    text(`이 판만 다시! (기회 ${s.tries}번 남음)`, w / 2, Y(0.735), INK);
    if (s.pt >= 40) (font(0.034, 900), text('톡 하면 바로 다시', w / 2, Y(0.78), (t >> 3) % 2 ? '#e0482f' : '#ff8a3d'));
    ctx.globalAlpha = 1;
  }
  // ── 끝 ──
  if (s.phase === 'end') {
    const a = Math.min(1, s.pt / 14);
    ctx.globalAlpha = a;
    rr(ctx, X(0.08), Y(0.36), R(0.84), R(0.56), R(0.04));
    ctx.fillStyle = '#fffaf2';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.save();
    ctx.translate(w / 2, Y(0.56) + Math.sin(t * 0.1) * R(0.01));
    stamp(ctx, formSprite(s.won ? 'rainbow' : 'white', s.won ? 1 : 2, R(s.won ? 0.06 : 0.07) * sc * 1.05), R(s.won ? 0.06 : 0.07));
    ctx.restore();
    font(0.05, 900);
    ctx.textAlign = 'center';
    text(s.won ? '마을이 다시 알록달록!' : '정령이 지쳤어요…', w / 2, Y(0.645), '#e0482f');
    font(0.038, 800);
    text(`${s.won ? STAGES.length : s.stage + 1}판 · 별 ${s.stars}/${STAGES.length * 3} · 도감 ${s.dex.length}/${DEX.length}`, w / 2, Y(0.715), INK);
    font(0.06, 900);
    text(`${fmt(s.pts + s.sp)}점`, w / 2, Y(0.8), INK);
    font(0.034, 700);
    text(s.won ? `정령 Lv${s.lv} — 마을의 색을 다 찾았어요` : '다시 하면 더 멀리 갈 수 있어요', w / 2, Y(0.87), MUTED);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'center';
}
/** 스크린샷·모음 그림용 (게임에서는 쓰지 않는다) */
export const __art = { formSprite, foeSprite, silhouette, stamp, drawPerk };
/** 측정용: 봇 속셈 들여다보기 */
export const __bot = { fit, burstEst, toward, cands, bestForm };
/** 측정·스크린샷용: 이 색을 먹은 것처럼 변신 */
export const __morph = (s: SoulState, col: number, bonus = 0) => transform(s, col, bonus, ++s.aid);
/** 스크린샷용: 정령이 맞은 것처럼 */
export const __hit = (s: SoulState, u: number) => hitMe(s, u, s.me.x + 0.05, s.me.y - 0.1);
