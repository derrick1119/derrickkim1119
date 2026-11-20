/**
 * 🪶 무게 훔치기 (38라운드 — 오너가 직접 고른 아이디어).
 * "톡 한 물건의 무게를 빼앗아 다른 물건에 줌 — 무거워진 깃털이 쿵 떨어져 적을 납작, 가벼워진 바위는 둥실. 도둑 고양이의 성 털기."
 *
 * 규칙(결정적): 물건을 톡 → 그 무게를 빼앗아 고양이 주머니에(물건은 무게 0 → 풍선처럼 둥실 떠오른다).
 *   주머니가 차 있으면 톡 = 준다(그 물건이 무거워져 쿵 떨어지고·누르고·부순다). 주머니는 한 번에 하나(3장 둘째 판부터 둘).
 * 물리(고정 간격 1/60): 상자 몸체 · 받침/짐 계산(위에 얹힌 무게가 아래로 전해짐) · 부서지는 가지·판자 · 밧줄 · 시소 · 도개교 · 저울문 · 바람.
 *   - 무게 0 = 위에 얹힌 것까지 합쳐 0이면 떠오른다(투구가 누르는 경비견은 무게를 훔쳐도 못 뜬다).
 *   - 경비병(개·곰)은 위에서 누르는 무게가 그 몫을 넘으면 납작. 고양이는 2 넘게 눌리면 납작(실패).
 *   - 가지·판자·밧줄은 버티는 무게(숫자)를 넘으면 뚝. 시소는 무거운 쪽이 쾅 내려가며 반대쪽을 쏘아 올린다.
 * 고양이는 저절로 보물 쪽으로 살금살금 걷다가 막히면 기다린다(아무것도 안 해도 잃는 것 없음).
 * 판 목표 = 고양이가 보물까지. 별 = 보물 · 톡 N번 안에 · 그 판의 도전(주머니 비우기·모두 납작·보석·꽃병 지키기 …).
 * 실패(납작 · 풍덩 · 톡을 다 씀) = 하트 -1, 같은 판 다시. 판을 깨면 보물이 '고양이의 비밀 창고'에 쌓인다.
 * 3장 14판: 1장 정원(바위·깃털 → 경비견 둥실 → 투구 → 시소 → 흔들다리) · 2장 성벽(도개교 → 바람 → 저울문 → 함정문 → 대포알)
 *   · 3장 보물 탑(샹들리에 → 주머니 둘 → 둥실 고양이 → 왕관).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

// ───────────────────────────── 물리 상수 (세상 좌표: x 0~1, y 위쪽 +, 땅 = 0) ─────────────────────────────
const A = 1.5;
const G = 0.0009, BUOY = 0.0003, VUP = 0.0085, EPS = 0.0025, OVL = 0.008;
const STEP = 0.072, SPD = 0.0042, MAXDROP = 0.32, HOP = 0.15;
const SAW_K = 0.011, SAW_LAUNCH = 1.05, SAW_IMP = 5;
const FLAT_H = 0.026, PIT = -0.22;
const vFall = (L: number) => 0.022 + 0.0016 * Math.min(L, 12);
const RESULT_OK = 210, RESULT_FAIL = 150, BANNER_T = 170, CALM_FAIL = 50;
const CLEAR_PTS = 100, STAR_PTS = 100, WIN_PTS = 300, HEART_PTS = 100;

export type Kind =
  | 'cat' | 'rock' | 'feather' | 'apple' | 'crate' | 'pumpkin' | 'dog' | 'bear' | 'helmet' | 'anvil'
  | 'pot' | 'chand' | 'cwt' | 'bridge' | 'barrel' | 'ball' | 'pillow' | 'vase' | 'sack';
interface KDef { hw: number; h: number; w: number; sq?: number; frag?: number; name: string }
const KD: Record<Kind, KDef> = {
  cat: { hw: 0.034, h: 0.078, w: 3, name: '고양이' },
  rock: { hw: 0.07, h: 0.112, w: 8, name: '바위' },
  feather: { hw: 0.046, h: 0.026, w: 1, name: '깃털' },
  apple: { hw: 0.03, h: 0.05, w: 2, name: '사과' },
  crate: { hw: 0.05, h: 0.088, w: 4, name: '상자' },
  pumpkin: { hw: 0.056, h: 0.074, w: 5, name: '호박' },
  dog: { hw: 0.058, h: 0.084, w: 5, sq: 4, name: '경비견' },
  bear: { hw: 0.07, h: 0.124, w: 9, sq: 8, name: '곰 경비병' },
  helmet: { hw: 0.04, h: 0.034, w: 3, name: '투구' },
  anvil: { hw: 0.05, h: 0.052, w: 10, name: '모루' },
  pot: { hw: 0.034, h: 0.05, w: 2, name: '화분' },
  chand: { hw: 0.078, h: 0.05, w: 4, name: '샹들리에' },
  cwt: { hw: 0.045, h: 0.075, w: 6, name: '균형추' },
  bridge: { hw: 0.07, h: 0.04, w: 4, name: '도개교' },
  barrel: { hw: 0.045, h: 0.08, w: 6, name: '술통' },
  ball: { hw: 0.036, h: 0.064, w: 7, name: '대포알' },
  pillow: { hw: 0.056, h: 0.03, w: 1, name: '방석' },
  vase: { hw: 0.03, h: 0.066, w: 2, frag: 1, name: '꽃병' },
  sack: { hw: 0.048, h: 0.07, w: 4, name: '밀가루 자루' },
};
const GUARD = (k: Kind) => k === 'dog' || k === 'bear';

// 받침 번호: 0~999 단단한 것(solid) · BODY+j 몸체 j · PLANK 시소 · ROPE 밧줄 · KIN 장치
const NONE = -1, BODY = 1000, PLANK = 3000, ROPE = 4000, KIN = 5000;
const REST = 0, FALL = 1, RISE = 2, FIXED = 3;

export type SK = 'ground' | 'hedge' | 'stone' | 'wall' | 'twig' | 'plank' | 'plate' | 'gate' | 'ceil' | 'shelf' | 'ped' | 'deck' | 'trap' | 'water';
interface SolidDef { k: SK; x0: number; x1: number; y0: number; y1: number; cap?: number; need?: number; gate?: number }
interface BodyDef { k: Kind; x: number; y: number; w?: number; rope?: number; ay?: number; kin?: boolean; tap?: boolean }
type PrizeK = 'key' | 'crown' | 'gem' | 'cup' | 'egg' | 'map' | 'harp' | 'bigcrown';
type StarK = 'clear' | 'taps' | 'empty' | 'flat' | 'gem' | 'keep' | 'float';
interface StarDef { k: StarK; n: number; label: string }
const ST = (k: StarK, n: number, label: string): StarDef => ({ k, n, label });
interface SawDef { px: number; py: number; hl: number; lim: number; th: number }
interface BridgeDef { hx: number; len: number; dir: number; cwx: number; cwy: number; rise: number; a: number }
interface WindDef { x0: number; x1: number; y0: number; y1: number; vx: number }
export interface StageDef {
  ch: number; name: string; news: string; spot: [number, number, number] | null; hints: [Kind | 'cat', string][];
  solids: SolidDef[]; bodies: BodyDef[]; cat: [number, number]; prize: { x: number; y: number; k: PrizeK }; gems?: [number, number][];
  saw?: SawDef; bridge?: BridgeDef; wind?: WindDef[]; ceil?: number; slots?: number; catTap?: boolean;
  par: number; budget: number; stars: StarDef[]; next: string;
}

const gnd = (x0: number, x1: number, top = 0): SolidDef => ({ k: 'ground', x0, x1, y0: -0.3, y1: top });
const sol = (k: SK, x0: number, x1: number, y0: number, y1: number, o: Partial<SolidDef> = {}): SolidDef => ({ k, x0, x1, y0, y1, ...o });
const bd = (k: Kind, x: number, y = 0, o: Partial<BodyDef> = {}): BodyDef => ({ k, x, y, ...o });
const CH_NAME = ['정원', '성벽', '보물 탑'];

// ───────────────────────────── 판 (3장 14판) ─────────────────────────────
export const STAGES: StageDef[] = [
  // ── 1장 정원 ──
  {
    ch: 0, name: '바위가 둥실', news: '', spot: null,
    hints: [['rock', '바위를 톡 — 무게를 훔쳐요'], ['feather', '깃털을 톡 — 훔친 무게를 줘요']],
    solids: [gnd(0, 1), sol('twig', 0.55, 0.75, 0.335, 0.35, { cap: 2 }), sol('ped', 0.84, 0.97, 0, 0.04)],
    bodies: [bd('rock', 0.36), bd('dog', 0.64), bd('feather', 0.65, 0.35)],
    cat: [0.07, 0], prize: { x: 0.905, y: 0.04, k: 'key' },
    par: 2, budget: 12, stars: [ST('clear', 0, '열쇠 훔치기')], next: '경비견도 둥실',
  },
  {
    ch: 0, name: '경비견도 둥실', news: '경비견도 톡! 무게를 뺏기면 둥실 떠서 버둥버둥', spot: [0.4, 0.05, 0.09],
    hints: [['dog', '경비견을 톡 — 둥실 떠올라요'], ['apple', '사과에 무게를 주면?']],
    solids: [gnd(0, 1), sol('twig', 0.56, 0.74, 0.31, 0.325, { cap: 3 }), sol('ped', 0.84, 0.97, 0, 0.04)],
    bodies: [bd('dog', 0.4), bd('dog', 0.65), bd('apple', 0.65, 0.325)],
    cat: [0.07, 0], prize: { x: 0.905, y: 0.04, k: 'gem' },
    par: 2, budget: 10, stars: [ST('clear', 0, '보석 훔치기'), ST('taps', 2, '톡 2번 안에')], next: '쇠 투구',
  },
  {
    ch: 0, name: '쇠 투구', news: '투구가 누르면 못 떠요 — 투구가 무거워지면?', spot: [0.62, 0.1, 0.07],
    hints: [],
    solids: [gnd(0, 1), sol('twig', 0.74, 0.92, 0.5, 0.515, { cap: 3 }), sol('ped', 0.84, 0.97, 0, 0.04)],
    bodies: [bd('rock', 0.36), bd('dog', 0.62), bd('helmet', 0.62, 0.084), bd('apple', 0.82, 0.515)],
    cat: [0.07, 0], prize: { x: 0.905, y: 0.04, k: 'egg' },
    par: 2, budget: 8, stars: [ST('clear', 0, '황금알 훔치기'), ST('taps', 2, '톡 2번 안에'), ST('empty', 0, '주머니 비우고 끝내기')], next: '시소',
  },
  {
    ch: 0, name: '시소 날기', news: '시소 — 무거운 쪽이 쾅! 반대쪽을 하늘로', spot: [0.42, 0.08, 0.2],
    hints: [],
    solids: [sol('hedge', 0, 0.2, -0.3, 0.13), gnd(0.2, 0.62), sol('hedge', 0.62, 1, -0.3, 0.24), sol('ped', 0.86, 0.97, 0.24, 0.28)],
    bodies: [bd('apple', 0.245, 0.1), bd('pumpkin', 0.05, 0.13), bd('dog', 0.75, 0.24)],
    saw: { px: 0.415, py: 0.072, hl: 0.205, lim: 0.36, th: -0.36 },
    cat: [0.14, 0.13], prize: { x: 0.915, y: 0.28, k: 'map' }, gems: [[0.665, 0.47]],
    par: 4, budget: 9, stars: [ST('clear', 0, '보물 지도 훔치기'), ST('taps', 4, '톡 4번 안에'), ST('gem', 0, '하늘 보석 줍기')], next: '흔들다리',
  },
  {
    ch: 0, name: '곰 징검다리', news: '나무다리는 10까지 버텨요 — 넘으면 와르르 퐁당', spot: [0.5, 0.0, 0.16],
    hints: [],
    solids: [gnd(0, 0.31), gnd(0.69, 1), sol('water', 0.31, 0.69, -0.3, -0.12), sol('plank', 0.31, 0.69, -0.025, 0, { cap: 10 }), sol('ped', 0.86, 0.97, 0, 0.04)],
    bodies: [bd('bear', 0.5), bd('rock', 0.18)],
    cat: [0.06, 0], prize: { x: 0.915, y: 0.04, k: 'cup' }, gems: [[0.37, 0.15]],
    par: 2, budget: 8, stars: [ST('clear', 0, '황금잔 훔치기'), ST('taps', 2, '톡 2번 안에'), ST('gem', 0, '물 위 보석 줍기')], next: '2장 성벽 · 도개교',
  },
  // ── 2장 성벽 ──
  {
    ch: 1, name: '도개교', news: '도개교 — 균형추가 무거우면 다리가 올라가요', spot: [0.76, 0.06, 0.09],
    hints: [],
    solids: [gnd(0, 0.4), sol('water', 0.4, 0.7, -0.4, -0.24), gnd(0.7, 1), sol('shelf', 0.78, 0.94, 0.4, 0.415, { cap: 9 }), sol('ped', 0.9, 0.99, 0, 0.04)],
    bodies: [bd('dog', 0.84), bd('barrel', 0.86, 0.415)],
    bridge: { hx: 0.7, len: 0.3, dir: -1, cwx: 0.765, cwy: 0.012, rise: 0.3, a: 1 },
    cat: [0.06, 0], prize: { x: 0.945, y: 0.04, k: 'crown' },
    par: 2, budget: 8, stars: [ST('clear', 0, '왕관 훔치기'), ST('taps', 2, '톡 2번 안에'), ST('flat', 0, '경비견 납작하게')], next: '바람 부는 성벽',
  },
  {
    ch: 1, name: '바람 부는 성벽', news: '바람 — 떠오른 것은 바람에 밀려 가요', spot: [0.5, 0.6, 0.14],
    hints: [],
    solids: [gnd(0, 1), sol('wall', 0.8, 1, 0.21, 1.2), sol('ped', 0.86, 0.97, 0, 0.04)],
    bodies: [bd('rock', 0.3), bd('bear', 0.69)],
    wind: [{ x0: 0, x1: 1, y0: 0.42, y1: 1.2, vx: 0.0045 }],
    cat: [0.06, 0], prize: { x: 0.915, y: 0.04, k: 'cup' },
    par: 2, budget: 8, stars: [ST('clear', 0, '은잔 훔치기'), ST('taps', 2, '톡 2번 안에'), ST('flat', 0, '곰 납작하게')], next: '저울문',
  },
  {
    ch: 1, name: '저울문', news: '저울문 — 발판에 무게 12가 실리면 문이 열려요', spot: [0.25, 0.33, 0.1],
    hints: [],
    solids: [gnd(0, 1), sol('stone', 0.12, 0.36, 0.27, 0.3), sol('plate', 0.19, 0.31, 0.3, 0.312, { need: 12 }), sol('gate', 0.64, 0.68, 0, 0.3, { gate: 2 }), sol('wall', 0.62, 0.7, 0.3, 1.2), sol('ped', 0.86, 0.97, 0, 0.04)],
    bodies: [bd('pillow', 0.25, 0.312), bd('bear', 0.49), bd('helmet', 0.49, 0.124)],
    cat: [0.06, 0], prize: { x: 0.915, y: 0.04, k: 'harp' },
    par: 4, budget: 9, stars: [ST('clear', 0, '황금 하프 훔치기'), ST('taps', 4, '톡 4번 안에'), ST('flat', 0, '곰 납작하게')], next: '시소 투석기',
  },
  {
    ch: 1, name: '해자 건너기', news: '시소로 해자를 훌쩍 — 모자라면 풍덩!', spot: [0.3, 0.08, 0.2],
    hints: [],
    solids: [gnd(0, 0.5), sol('water', 0.5, 0.74, -0.4, -0.24), gnd(0.74, 1), sol('ped', 0.88, 0.98, 0, 0.04), sol('stone', 0.0, 0.14, 0.42, 0.44)],
    bodies: [bd('crate', 0.12), bd('ball', 0.06, 0.44), bd('dog', 0.82)],
    saw: { px: 0.31, py: 0.072, hl: 0.19, lim: 0.36, th: -0.36 },
    cat: [0.02, 0], prize: { x: 0.93, y: 0.04, k: 'egg' },
    par: 3, budget: 9, stars: [ST('clear', 0, '은빛 알 훔치기'), ST('taps', 3, '톡 3번 안에'), ST('empty', 0, '주머니 비우고 끝내기')], next: '3장 보물 탑',
  },
  // ── 3장 보물 탑 ──
  {
    ch: 2, name: '샹들리에', news: '샹들리에 사슬은 6까지 — 넘으면 와장창', spot: [0.62, 0.62, 0.1],
    hints: [],
    solids: [gnd(0, 1), sol('ped', 0.86, 0.97, 0, 0.04), sol('shelf', 0.18, 0.34, 0.3, 0.315)],
    bodies: [bd('anvil', 0.26, 0.315), bd('bear', 0.62), bd('chand', 0.62, 0.6, { rope: 6, ay: 0.82 }), bd('vase', 0.75)],
    ceil: 0.82,
    cat: [0.06, 0], prize: { x: 0.915, y: 0.04, k: 'gem' },
    par: 2, budget: 8, stars: [ST('clear', 0, '큰 보석 훔치기'), ST('taps', 2, '톡 2번 안에'), ST('keep', 0, '꽃병 안 깨기')], next: '주머니 둘',
  },
  {
    ch: 2, name: '주머니 둘', news: '주머니가 둘! 두 번 훔치고, 다음 톡에 합쳐서 줘요', spot: [0.5, 0.1, 0.1],
    hints: [],
    solids: [gnd(0, 1), sol('ceil', 0, 1, 0.2, 0.26), sol('ped', 0.86, 0.97, 0, 0.04)],
    bodies: [bd('crate', 0.27), bd('bear', 0.52, 0, { w: 12 }), bd('apple', 0.7)],
    ceil: 0.82, slots: 2,
    cat: [0.06, 0], prize: { x: 0.915, y: 0.04, k: 'cup' },
    par: 3, budget: 9, stars: [ST('clear', 0, '보물 잔 훔치기'), ST('taps', 3, '톡 3번 안에'), ST('flat', 0, '곰 납작하게')], next: '둥실 고양이',
  },
  {
    ch: 2, name: '둥실 고양이', news: '고양이도 톡! 무게를 빼면 둥실 — 위층으로', spot: [0.45, 0.05, 0.08],
    hints: [],
    solids: [gnd(0, 1), sol('stone', 0, 0.5, 0.4, 0.44), sol('stone', 0.66, 1, 0.4, 0.44), sol('wall', 0.5, 0.53, 0, 0.4), sol('ped', 0.86, 0.97, 0.44, 0.48)],
    bodies: [bd('pumpkin', 0.2), bd('dog', 0.76, 0.44), bd('chand', 0.77, 0.7, { rope: 6, ay: 0.82 })],
    ceil: 0.82, slots: 2, catTap: true,
    cat: [0.06, 0], prize: { x: 0.915, y: 0.48, k: 'map' },
    par: 4, budget: 10, stars: [ST('clear', 0, '비밀 지도 훔치기'), ST('taps', 4, '톡 4번 안에'), ST('flat', 0, '경비견 납작하게')], next: '왕관의 방',
  },
  {
    ch: 2, name: '왕관의 방', news: '마지막 방 — 지금까지 배운 것을 모두', spot: null,
    hints: [],
    solids: [gnd(0, 1), sol('stone', 0, 0.42, 0.42, 0.46), sol('stone', 0.58, 1, 0.42, 0.46), sol('plate', 0.66, 0.78, 0.46, 0.472, { need: 8 }), sol('gate', 0.86, 0.9, 0.46, 0.76, { gate: 3 }), sol('ped', 0.92, 0.99, 0.46, 0.5)],
    bodies: [bd('bear', 0.3), bd('crate', 0.72, 0.472), bd('chand', 0.3, 0.3, { rope: 6, ay: 0.42 }), bd('feather', 0.12, 0.46)],
    ceil: 0.82, slots: 2, catTap: true,
    cat: [0.04, 0], prize: { x: 0.955, y: 0.5, k: 'bigcrown' },
    par: 4, budget: 11, stars: [ST('clear', 0, '왕의 왕관 훔치기'), ST('taps', 4, '톡 4번 안에'), ST('empty', 0, '주머니 비우고 끝내기')], next: '',
  },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 세상 ─────────────────────────────
export interface Body {
  id: number; k: Kind; x: number; y: number; hw: number; h: number; w: number; w0: number;
  vx: number; vy: number; st: number; sup: number; load: number; mode: number; air: number;
  tap: boolean; sq: number; frag: number; rope: number; ax: number; ay: number; kin: boolean;
  tw: number; land: number; hitV: number; flatT: number; face: number;
}
export interface Solid { id: number; k: SK; x0: number; x1: number; y0: number; y1: number; gy0: number; cap: number; on: boolean; need: number; gate: number; open: number; load: number; brokeT: number }
interface Saw { px: number; py: number; hl: number; th: number; om: number; lim: number; slamT: number; thick: number }
interface Bridge { hx: number; len: number; dir: number; a: number; va: number; cw: number; bb: number; deck: number; cy0: number; rise: number; slamT: number }
interface Gem { x: number; y: number; got: number }
export interface WEv { t: number; k: string; i: number; x: number; y: number; v: number }
export interface World {
  t: number; b: Body[]; s: Solid[]; saw: Saw | null; br: Bridge | null; wind: WindDef[]; ceil: number;
  cat: number; cs: string; prize: { x: number; y: number; k: PrizeK }; gems: Gem[];
  pouch: number[]; slots: number; taps: number; budget: number; catTap: boolean;
  done: number; why: string; calm: number; flats: number; floats: number; breaks: number; frags: number; ev: WEv[] | null;
}

const addEv = (W: World, k: string, i: number, x: number, y: number, v = 0) => W.ev && W.ev.push({ t: W.t, k, i, x, y, v });

export function makeWorld(d: StageDef): World {
  const b: Body[] = [];
  const mk = (q: BodyDef): Body => {
    const K = KD[q.k];
    return {
      id: b.length, k: q.k, x: q.x, y: q.y, hw: K.hw, h: K.h, w: q.w ?? K.w, w0: q.w ?? K.w, vx: 0, vy: 0, st: 0, sup: NONE, load: 0, mode: REST, air: 0,
      tap: q.tap ?? q.k !== 'cat', sq: K.sq ?? 0, frag: K.frag ?? 0, rope: q.rope ?? -1, ax: q.x, ay: q.ay ?? 0, kin: !!q.kin,
      tw: -999, land: -999, hitV: 0, flatT: -999, face: 1,
    };
  };
  for (const q of d.bodies) b.push(mk(q));
  const cat = b.length;
  b.push(mk({ k: 'cat', x: d.cat[0], y: d.cat[1], tap: !!d.catTap }));
  const s: Solid[] = d.solids.map((q, id) => ({ id, k: q.k, x0: q.x0, x1: q.x1, y0: q.y0, y1: q.y1, gy0: q.y0, cap: q.cap ?? 0, on: true, need: q.need ?? 0, gate: q.gate ?? -1, open: 0, load: 0, brokeT: -999 }));
  const W: World = {
    t: 0, b, s, saw: null, br: null, wind: d.wind ?? [], ceil: d.ceil ?? 1.02, cat, cs: 'walk', prize: { ...d.prize }, gems: (d.gems ?? []).map(([x, y]) => ({ x, y, got: -1 })),
    pouch: [], slots: d.slots ?? 1, taps: 0, budget: d.budget, catTap: !!d.catTap, done: 0, why: '', calm: 0, flats: 0, floats: 0, breaks: 0, frags: 0, ev: null,
  };
  if (d.saw) W.saw = { px: d.saw.px, py: d.saw.py, hl: d.saw.hl, th: d.saw.th, om: 0, lim: d.saw.lim, slamT: -999, thick: 0.018 };
  if (d.bridge) {
    const q = d.bridge;
    const deck = s.length;
    s.push({ id: deck, k: 'deck', x0: q.dir < 0 ? q.hx - q.len : q.hx, x1: q.dir < 0 ? q.hx : q.hx + q.len, y0: -0.03, y1: 0, gy0: -0.03, cap: 0, on: q.a < 0.03, need: 0, gate: -1, open: 0, load: 0, brokeT: -999 });
    const cw = b.length;
    b.push(mk({ k: 'cwt', x: q.cwx, y: q.cwy, kin: true }));
    const bb = b.length;
    b.push(mk({ k: 'bridge', x: q.hx, y: 0, kin: true }));
    W.br = { hx: q.hx, len: q.len, dir: q.dir, a: q.a, va: 0, cw, bb, deck, cy0: q.cwy, rise: q.rise, slamT: -999 };
    placeBridge(W);
  }
  // 처음 자리: 떠 있게 놓인 것(밧줄·장치 말고)은 바로 아래 윗면에 내려놓는다
  for (const x of [...W.b].sort((p, q) => p.y - q.y)) {
    if (x.kin || x.rope >= 0 || x.w <= 0) continue;
    const f = floorHit(W, x, x.y + 0.03, -1);
    if (f !== null) x.y = f;
  }
  supports(W);
  loads(W);
  for (const x of W.b) x.mode = x.kin || x.rope >= 0 ? FIXED : x.load > 0 ? REST : RISE;
  return W;
}

export function cloneWorld(W: World): World {
  return {
    ...W, b: W.b.map((x) => ({ ...x })), s: W.s.map((x) => ({ ...x })), saw: W.saw ? { ...W.saw } : null, br: W.br ? { ...W.br } : null,
    prize: W.prize, gems: W.gems.map((g) => ({ ...g })), pouch: W.pouch.slice(), ev: null,
  };
}

// ───────────────────────────── 기하 ─────────────────────────────
const live = (o: Body) => o.st !== 2 && o.st !== 3;
const ovx = (a: Body, x0: number, x1: number) => Math.min(a.x + a.hw, x1) - Math.max(a.x - a.hw, x0) > OVL;
const ovb = (a: Body, o: Body) => Math.min(a.x + a.hw, o.x + o.hw) - Math.max(a.x - a.hw, o.x - o.hw) > OVL;
/** 시소 판 윗면 높이 (x에서), 판 밖이면 null */
function plankTop(S: Saw, x: number): number | null {
  const c = Math.cos(S.th), x0 = S.px - S.hl * c, x1 = S.px + S.hl * c;
  if (x < x0 - 0.01 || x > x1 + 0.01) return null;
  return S.py - (x - S.px) * Math.tan(S.th) + S.thick / 2;
}
function plankTopUnder(S: Saw, b: Body): number | null {
  // 몸 바닥 양 끝 중 높은 쪽 (판과 겹치지 않으면 없음)
  const c0 = Math.cos(S.th);
  if (Math.min(b.x + b.hw, S.px + S.hl * c0) - Math.max(b.x - b.hw, S.px - S.hl * c0) <= OVL) return null;
  const a = plankTop(S, Math.max(b.x - b.hw * 0.6, S.px - S.hl * Math.cos(S.th))), c = plankTop(S, Math.min(b.x + b.hw * 0.6, S.px + S.hl * Math.cos(S.th)));
  if (a === null && c === null) return null;
  return Math.max(a ?? -9, c ?? -9);
}

function placeBridge(W: World) {
  const B = W.br!, phi = B.a * (Math.PI / 2), c = Math.cos(phi), sn = Math.sin(phi);
  const bb = W.b[B.bb], cw = W.b[B.cw];
  bb.x = B.hx + B.dir * c * B.len * 0.5;
  bb.y = sn * B.len * 0.5 - bb.h / 2;
  const ny = B.cy0 + (1 - B.a) * B.rise, dy = ny - cw.y;
  cw.y = ny;
  if (dy) for (const o of W.b) if (live(o) && o.sup === BODY + cw.id) o.y += dy;
  W.s[B.deck].on = B.a < 0.03;
}

/** 각 몸의 받침 */
function supports(W: World) {
  const B = W.b;
  for (const b of B) {
    if (!live(b)) continue;
    if (b.kin) { b.sup = KIN; continue; }
    if (b.rope >= 0) { b.sup = ROPE; continue; }
    if (b.air > 0) { b.sup = NONE; continue; }
    let best = NONE, top = -9;
    for (const q of W.s) {
      if (!q.on || !ovx(b, q.x0, q.x1)) continue;
      if (Math.abs(q.y1 - b.y) < EPS && q.y1 > top) (top = q.y1), (best = q.id);
    }
    if (W.saw) {
      const pt = plankTopUnder(W.saw, b);
      if (pt !== null && Math.abs(pt - b.y) < EPS * 1.6 && pt > top - 0.001) (top = pt), (best = PLANK);
    }
    for (const o of B) {
      if (o === b || !live(o) || o.k === 'bridge') continue;
      if (!ovb(b, o)) continue;
      const ot = o.y + o.h;
      if (Math.abs(ot - b.y) < EPS && ot > top + 0.0005) (top = ot), (best = BODY + o.id);
    }
    b.sup = best;
  }
}

/** 짐: 자기 무게 + 위에 얹힌 것들의 짐 (위에서부터) */
function loads(W: World) {
  const B = W.b, ord = B.filter(live).sort((a, c) => c.y - a.y);
  for (const b of ord) b.load = b.w;
  for (const q of W.s) q.load = 0;
  for (const b of ord) {
    if (b.sup >= BODY && b.sup < PLANK) B[b.sup - BODY].load += b.load;
    else if (b.sup >= 0 && b.sup < BODY) W.s[b.sup].load += b.load;
  }
}

/** 바닥 찾기: 몸 b가 y0 → y1(아래로) 움직일 때 처음 닿는 윗면 */
function floorHit(W: World, b: Body, yFrom: number, yTo: number): number | null {
  let best: number | null = null;
  for (const q of W.s) {
    if (!q.on || !ovx(b, q.x0, q.x1)) continue;
    if (q.y1 <= yFrom + EPS && q.y1 >= yTo && (best === null || q.y1 > best)) best = q.y1;
  }
  if (W.saw) {
    const pt = plankTopUnder(W.saw, b);
    if (pt !== null && pt <= yFrom + EPS * 2 && pt >= yTo && (best === null || pt > best)) best = pt;
  }
  for (const o of W.b) {
    if (o === b || !live(o) || o.k === 'bridge' || !ovb(b, o)) continue;
    const ot = o.y + o.h;
    if (ot <= yFrom + EPS && ot >= yTo && (best === null || ot > best)) best = ot;
  }
  return best;
}
/** 물 바닥에 내려앉았나 */
function waterAt(W: World, b: Body): boolean {
  for (const q of W.s) if (q.on && q.k === 'water' && ovx(b, q.x0, q.x1) && Math.abs(q.y1 - b.y) < EPS) return true;
  return false;
}
/** 천장 찾기: 몸 b의 윗면이 top0 → top1(위로) 움직일 때 처음 닿는 아랫면 */
function ceilHit(W: World, b: Body, top0: number, top1: number): number | null {
  let best: number | null = top1 >= W.ceil ? W.ceil : null;
  for (const q of W.s) {
    if (!q.on || !ovx(b, q.x0, q.x1)) continue;
    if (q.y0 >= top0 - EPS && q.y0 <= top1 && (best === null || q.y0 < best)) best = q.y0;
  }
  for (const o of W.b) {
    if (o === b || !live(o) || o.k === 'bridge' || !ovb(b, o)) continue;
    if (o.y >= top0 - EPS && o.y <= top1 && (best === null || o.y < best)) best = o.y;
  }
  return best;
}
/** 상자 겹침 (옆으로 움직일 때) */
function boxFree(W: World, b: Body, x: number, y: number, h = b.h): boolean {
  for (const q of W.s) {
    if (!q.on) continue;
    if (x + b.hw > q.x0 + 0.001 && x - b.hw < q.x1 - 0.001 && y < q.y1 - 0.002 && y + h > q.y0 + 0.002) return false;
  }
  for (const o of W.b) {
    if (o === b || !live(o) || o.k === 'bridge') continue;
    if (Math.abs(x - o.x) < b.hw + o.hw - 0.002 && y < o.y + o.h - 0.002 && y + h > o.y + 0.002) return false;
  }
  return true;
}

// ───────────────────────────── 한 틱 ─────────────────────────────
function squash(W: World, g: Body) {
  g.st = 1;
  g.flatT = W.t;
  g.h = FLAT_H;
  W.flats++;
  addEv(W, 'squash', g.id, g.x, g.y, g.load - g.w);
}

function devices(W: World) {
  const S = W.saw;
  if (S) {
    let tq = 0;
    for (const b of W.b) if (live(b) && b.sup === PLANK) tq += b.load * (b.x - S.px);
    const before = S.th;
    if (Math.abs(tq) > 1e-6) S.om += SAW_K * tq;
    else S.om *= 0.8;
    S.om *= 0.985;
    S.th += S.om;
    let hit = 0;
    if (S.th > S.lim) (hit = S.om), (S.th = S.lim), (S.om = 0);
    else if (S.th < -S.lim) (hit = S.om), (S.th = -S.lim), (S.om = 0);
    // 판 위의 것들은 판을 따라간다
    for (const b of W.b) {
      if (!live(b) || b.sup !== PLANK || b.air > 0 || b.load <= 0) continue;
      const pt = plankTopUnder(S, b);
      if (pt === null) continue;
      const old = b.y;
      b.y = pt;
      b.vy = pt - old;
      b.vx = 0;
    }
    if (Math.abs(hit) > 0.035) {
      S.slamT = W.t;
      addEv(W, 'sawslam', -1, S.px + (hit > 0 ? 1 : -1) * S.hl, 0, Math.abs(hit));
      for (const b of W.b) {
        if (!live(b) || b.sup !== PLANK) continue;
        const rel = b.x - S.px;
        if ((hit > 0 && rel < 0) || (hit < 0 && rel > 0)) {
          const v = Math.abs(hit) * Math.abs(rel) * SAW_LAUNCH;
          b.vy = v;
          b.air = 4;
          b.sup = NONE;
          b.vx = b.k === 'cat' ? Math.sign(W.prize.x - b.x) * 0.0046 : -rel * Math.abs(hit) * 0.25;
          addEv(W, 'launch', b.id, b.x, b.y, v);
        }
      }
    }
    void before;
  }
  const Br = W.br;
  if (Br) {
    const bb = W.b[Br.bb], cw = W.b[Br.cw];
    const Lb = bb.w + (W.s[Br.deck].on ? W.s[Br.deck].load : 0), Lc = cw.load;
    const target = Lc > Lb ? 1 : Lb > Lc ? 0 : Br.a;
    if (target > Br.a + 1e-6) Br.va = Math.min(Br.va + 0.0012, 0.03);
    else if (target < Br.a - 1e-6) Br.va = Math.max(Br.va - 0.0026, -0.075);
    else Br.va = 0;
    Br.a += Br.va;
    if (Br.a >= 1) (Br.a = 1), (Br.va = 0);
    if (Br.a <= 0) {
      if (Br.va < -0.02) (Br.slamT = W.t), addEv(W, 'slam', Br.bb, Br.hx + Br.dir * Br.len * 0.5, 0, -Br.va);
      (Br.a = 0), (Br.va = 0);
    }
    placeBridge(W);
  }
  // 저울문
  for (const g of W.s) {
    if (g.gate < 0) continue;
    const p = W.s[g.gate], want = p.load >= p.need ? 1 : 0;
    const was = g.open;
    g.open += Math.max(-0.03, Math.min(0.03, want - g.open));
    g.y0 = g.gy0 + g.open * (g.y1 - g.gy0 + 0.02);
    if (was < 0.5 && g.open >= 0.5) addEv(W, 'gate', g.id, (g.x0 + g.x1) / 2, g.y1, 1);
    if (was >= 0.5 && g.open < 0.5) addEv(W, 'gate', g.id, (g.x0 + g.x1) / 2, g.y1, 0);
  }
}

function rules(W: World): boolean {
  let changed = false;
  for (const q of W.s) {
    if (q.on && q.cap > 0 && q.load > q.cap) {
      q.on = false;
      q.brokeT = W.t;
      W.breaks++;
      changed = true;
      addEv(W, q.k === 'twig' ? 'snap' : 'break', q.id, (q.x0 + q.x1) / 2, q.y1, q.load);
    }
  }
  for (const b of W.b) {
    if (!live(b)) continue;
    if (b.rope >= 0 && b.load > b.rope) {
      b.rope = -2;
      changed = true;
      addEv(W, 'rope', b.id, b.x, b.y + b.h, b.load);
    }
    const above = b.load - b.w;
    if (GUARD(b.k) && b.st === 0 && above >= b.sq) (squash(W, b), (changed = true));
    if (b.k === 'cat' && b.st === 0 && above >= 2 && !W.done) {
      b.st = 1;
      b.flatT = W.t;
      b.h = FLAT_H;
      W.done = -1;
      W.why = '고양이가 납작!';
      addEv(W, 'catsquash', b.id, b.x, b.y, above);
      changed = true;
    }
    if (b.frag > 0 && above >= b.frag) {
      b.st = 3;
      W.frags++;
      changed = true;
      addEv(W, 'frag', b.id, b.x, b.y, above);
    }
  }
  return changed;
}

function motion(W: World) {
  const B = W.b, up = B.filter(live).sort((a, c) => a.y - c.y);
  for (const b of up) {
    if (b.kin || b.rope >= 0) b.mode = FIXED;
    else if (b.sup === PLANK && b.air === 0 && b.load > 0) b.mode = FIXED;
    else if (b.load > 0) {
      if (b.air > 0 || b.sup === NONE) b.mode = FALL;
      else if (b.sup >= BODY && b.sup < PLANK) b.mode = B[b.sup - BODY].mode === REST || B[b.sup - BODY].mode === FIXED ? REST : FALL;
      else b.mode = REST;
    } else b.mode = RISE;
  }
  // 떨어지는 것: 아래부터
  for (const b of up) {
    if (b.mode === REST) {
      b.vy = 0;
      b.vx *= 0.6;
      if (Math.abs(b.vx) < 1e-4) b.vx = 0;
      continue;
    }
    if (b.mode !== FALL) continue;
    if (b.air > 0) b.air--;
    b.vy = Math.max(b.vy - G, -vFall(b.load));
    if (b.vy > 0) {
      const c = ceilHit(W, b, b.y + b.h, b.y + b.h + b.vy);
      if (c !== null) (b.y = c - b.h), (b.vy = 0);
      else b.y += b.vy;
    } else {
      const f = floorHit(W, b, b.y, b.y + b.vy);
      if (f !== null) {
        const v = -b.vy;
        b.y = f;
        b.vy = 0;
        b.air = 0;
        if (W.saw && b.sup !== PLANK && plankTopUnder(W.saw, b) === f) W.saw.om += SAW_IMP * b.load * v * (b.x - W.saw.px);
        const wet = waterAt(W, b);
        if (wet) {
          addEv(W, 'splash', b.id, b.x, 0, b.load);
          if (b.k === 'cat' && !W.done) (W.done = -1), (W.why = '풍덩! 빠졌어요');
        } else if (v > 0.006) {
          b.land = W.t;
          b.hitV = v;
          addEv(W, 'land', b.id, b.x, b.y, v * b.load);
        }
      } else b.y += b.vy;
    }
  }
  // 떠오르는 것: 위부터
  for (let k = up.length - 1; k >= 0; k--) {
    const b = up[k];
    if (b.mode !== RISE) continue;
    if (b.air > 0) b.air--;
    b.vy = Math.min(b.vy + BUOY, VUP);
    if (b.vy > 0) {
      const c = ceilHit(W, b, b.y + b.h, b.y + b.h + b.vy);
      if (c !== null) {
        if (b.vy > 0.004) addEv(W, 'bump', b.id, b.x, c, b.vy);
        b.y = c - b.h;
        b.vy = 0;
      } else b.y += b.vy;
    } else {
      const f = floorHit(W, b, b.y, b.y + b.vy);
      if (f !== null) (b.y = f), (b.vy = 0);
      else b.y += b.vy;
    }
  }
  // 옆으로: 바람 · 날아감 · 공기 저항
  for (const b of up) {
    if (b.kin || b.rope >= 0 || b.mode === FIXED) continue;
    if (b.mode === RISE || (b.load === 0 && b.vy === 0)) {
      for (const z of W.wind) if (b.x > z.x0 && b.x < z.x1 && b.y + b.h > z.y0 && b.y < z.y1) b.vx += (z.vx - b.vx) * 0.06;
    }
    if (Math.abs(b.vx) < 1e-5) continue;
    const nx = b.x + b.vx;
    if (boxFree(W, b, nx, b.y)) b.x = nx;
    else if (b.k !== 'cat' || b.mode !== FALL) b.vx = 0;
    if (b.mode !== FALL) b.vx *= 0.985;
    if (b.x < b.hw) (b.x = b.hw), (b.vx = 0);
    if (b.x > 1 - b.hw) (b.x = 1 - b.hw), (b.vx = 0);
  }
  // 구덩이·물
  for (const b of B) {
    if (!live(b) || b.y > PIT) continue;
    b.st = 2;
    addEv(W, 'fall', b.id, b.x, 0, b.load);
    if (b.k === 'cat' && !W.done) (W.done = -1), (W.why = '풍덩! 빠졌어요');
  }
}

// ───────────────────────────── 고양이 ─────────────────────────────
function catAI(W: World) {
  const c = W.b[W.cat];
  if (W.done || c.st !== 0) return;
  // 보물·보석
  for (const gm of W.gems) if (gm.got < 0 && Math.abs(gm.x - c.x) < c.hw + 0.03 && gm.y > c.y - 0.03 && gm.y < c.y + c.h + 0.03) (gm.got = W.t), addEv(W, 'gem', -1, gm.x, gm.y);
  if (Math.abs(W.prize.x - c.x) < 0.045 && Math.abs(W.prize.y - c.y) < 0.06 && c.mode !== RISE) {
    W.done = 1;
    W.cs = 'win';
    addEv(W, 'grab', -1, W.prize.x, W.prize.y);
    return;
  }
  const dir = W.prize.x > c.x ? 1 : -1;
  c.face = dir;
  if (c.w === 0 && c.load === 0) {
    W.cs = 'float';
    if (c.mode === RISE && c.vy === 0) c.vx = dir * 0.0022;
    return;
  }
  const grounded = c.mode === REST || (c.mode === FIXED && c.sup === PLANK);
  if (!grounded) {
    W.cs = 'air';
    return;
  }
  const nx = c.x + dir * SPD;
  // 앞을 막는 것 / 오를 수 있는 턱
  let lift = 0, blocked = false;
  // 앞쪽 띠(지금 앞면 → 한 걸음 뒤 앞면)만 본다: 뒤에 있는 것에 막히지 않게
  const x0 = dir > 0 ? c.x + c.hw - 0.004 : nx - c.hw, x1 = dir > 0 ? nx + c.hw : c.x - c.hw + 0.004, yb = c.y + 0.003, yt = c.y + c.h;
  for (const q of W.s) {
    if (!q.on || x1 <= q.x0 || x0 >= q.x1 || q.y1 <= yb || q.y0 >= yt) continue;
    if (q.y1 - c.y <= STEP) lift = Math.max(lift, q.y1 - c.y);
    else blocked = true;
  }
  for (const o of W.b) {
    if (o === c || !live(o) || o.k === 'bridge' || o.sup === BODY + c.id) continue;
    if (x1 <= o.x - o.hw || x0 >= o.x + o.hw || o.y + o.h <= yb || o.y >= yt) continue;
    if (o.y + o.h - c.y <= STEP && o.y <= c.y + STEP) lift = Math.max(lift, o.y + o.h - c.y);
    else blocked = true;
  }
  if (W.saw && c.sup !== PLANK) {
    const pt = plankTop(W.saw, nx + dir * c.hw * 0.5);
    if (pt !== null && pt > c.y + 0.003) {
      if (pt - c.y <= STEP) lift = Math.max(lift, pt - c.y);
      else blocked = true;
    }
  }
  if (!blocked && lift > 0 && !stripFree(W, c, x0, x1, c.y + lift + 0.001)) blocked = true;
  if (blocked) {
    W.cs = 'wait';
    return;
  }
  // 앞쪽 발밑: 구덩이면 폴짝 건너거나 멈춘다
  const lead = nx + dir * (c.hw - 0.01);
  const under = groundAt(W, c, lead, c.y + lift + EPS);
  if (under === null || under < c.y - MAXDROP) {
    let land: number | null = null;
    for (let d = 0.02; d <= HOP; d += 0.01) {
      const g = groundAt(W, c, lead + dir * d, c.y + STEP);
      if (g !== null && g >= c.y - 0.12) {
        land = g;
        break;
      }
    }
    if (land !== null) {
      c.vy = 0.016;
      c.vx = dir * 0.0048;
      c.air = 3;
      c.sup = NONE;
      W.cs = 'hop';
      addEv(W, 'hop', c.id, c.x, c.y);
    } else W.cs = 'wait';
    return;
  }
  // 삐걱: 올라서면 부서질 다리·판자 앞에서는 멈춘다
  if (lift < 0.01) {
    for (const q of W.s) {
      if (!q.on || q.cap <= 0 || c.sup === q.id || lead <= q.x0 || lead >= q.x1 || Math.abs(q.y1 - c.y) > 0.02) continue;
      if (q.load + c.load > q.cap) {
        W.cs = 'creak';
        return;
      }
    }
  }
  c.x = nx;
  c.y += lift;
  W.cs = 'walk';
}
function stripFree(W: World, c: Body, x0: number, x1: number, y: number): boolean {
  for (const q of W.s) if (q.on && x1 > q.x0 + 0.001 && x0 < q.x1 - 0.001 && y < q.y1 - 0.002 && y + c.h > q.y0 + 0.002) return false;
  for (const o of W.b) {
    if (o === c || !live(o) || o.k === 'bridge' || o.sup === BODY + c.id) continue;
    if (x1 > o.x - o.hw + 0.001 && x0 < o.x + o.hw - 0.001 && y < o.y + o.h - 0.002 && y + c.h > o.y + 0.002) return false;
  }
  return true;
}
/** x 아래(높이 maxY 이하)에서 가장 높은 윗면 */
function groundAt(W: World, c: Body, x: number, maxY: number): number | null {
  let best: number | null = null;
  for (const q of W.s) if (q.on && q.k !== 'water' && x > q.x0 && x < q.x1 && q.y1 <= maxY && (best === null || q.y1 > best)) best = q.y1;
  if (W.saw) {
    const pt = plankTop(W.saw, x);
    if (pt !== null && pt <= maxY && (best === null || pt > best)) best = pt;
  }
  for (const o of W.b) {
    if (o === c || !live(o) || o.k === 'bridge' || o.mode === RISE) continue;
    if (x > o.x - o.hw && x < o.x + o.hw && o.y + o.h <= maxY && (best === null || o.y + o.h > best)) best = o.y + o.h;
  }
  return best;
}

/** 세상 한 틱 */
export function tick(W: World) {
  W.t++;
  catAI(W);
  devices(W);
  supports(W);
  loads(W);
  if (rules(W)) (supports(W), loads(W));
  motion(W);
  // 고요함: 아무것도 안 움직이고 고양이가 기다리는 중
  const moving = W.b.some((b) => live(b) && !b.kin && (Math.abs(b.vy) > 1e-4 || Math.abs(b.vx) > 1e-4 || b.mode === FALL || (b.mode === RISE && b.vy !== 0)))
    || (W.saw ? Math.abs(W.saw.om) > 1e-4 : false) || (W.br ? W.br.va !== 0 : false) || W.cs === 'walk' || W.cs === 'hop' || W.s.some((g) => g.gate >= 0 && g.open > 0.001 && g.open < 0.999);
  W.calm = moving ? 0 : W.calm + 1;
  if (!W.done && W.taps >= W.budget && W.calm >= CALM_FAIL) (W.done = -1), (W.why = '톡을 다 썼어요 — 들켰다!');
}

/** 톡: 0 아무 일 없음 · 1 훔침 · 2 줌 */
export function tapBody(W: World, i: number): number {
  const b = W.b[i];
  if (!b || !live(b) || !b.tap || W.done || W.taps >= W.budget) return 0;
  const full = W.pouch.length >= W.slots;
  if (!full && b.w > 0) {
    W.pouch.push(b.w);
    addEv(W, 'steal', i, b.x, b.y + b.h / 2, b.w);
    b.w = 0;
    b.tw = W.t;
    if (GUARD(b.k) || b.k === 'cat') W.floats++;
    W.taps++;
    W.calm = 0;
    return 1;
  }
  if (W.pouch.length) {
    const sum = W.pouch.reduce((a, c) => a + c, 0);
    b.w += sum;
    b.tw = W.t;
    W.pouch = [];
    addEv(W, 'give', i, b.x, b.y + b.h / 2, sum);
    W.taps++;
    W.calm = 0;
    return 2;
  }
  addEv(W, 'empty', i, b.x, b.y + b.h / 2);
  return 0;
}

/** 별 판정 (판을 깬 순간) */
function starMet(W: World, q: StarDef): boolean {
  switch (q.k) {
    case 'clear': return W.done === 1;
    case 'taps': return W.taps <= q.n;
    case 'empty': return W.pouch.length === 0;
    case 'flat': return W.b.every((b) => !GUARD(b.k) || b.st === 1);
    case 'gem': return W.gems.every((g) => g.got >= 0);
    case 'keep': return W.frags === 0;
    case 'float': return W.b.every((b) => !GUARD(b.k) || (b.w === 0 && b.st === 0));
  }
}
export const tappable = (W: World) => W.b.filter((b) => live(b) && b.tap && (b.k !== 'cat' || W.catTap));
