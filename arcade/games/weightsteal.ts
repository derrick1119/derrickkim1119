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
 * 3장 18판: 1장 정원(바위·깃털 → 경비견 둥실 → 투구 → 양팔 저울 → 시소 → 곰 징검다리) · 2장 성벽(도개교 → 바람 타기 → 바람 다리 → 바람 둘 → 저울문 → 와르르 선반(숨 돌리기) → 해자)
 *   · 3장 보물 탑(샹들리에 → 쿵 고양이 → 주머니 둘 → 둥실 고양이 → 왕관). 39라운드: 막힘 힌트(전구) · 막힌 것 표시 · 버팀 무게 표.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

// ───────────────────────────── 물리 상수 (세상 좌표: x 0~1, y 위쪽 +, 땅 = 0) ─────────────────────────────
const A = 1.5;
const G = 0.0009, BUOY = 0.0003, VUP = 0.0085, EPS = 0.0025, OVL = 0.008;
const STEP = 0.072, SPD = 0.0042, MAXDROP = 0.32, HOP = 0.15, GAP = 0.018;
/** 카메라 배율: 세상 폭 1/ZOOM 이 화면 폭 (2차: 1.4배 가까이) */
const ZOOM = 1.4;
const SAW_K = 0.015, SAW_LAUNCH = 2.2, SAW_IMP = 6;
const FLAT_H = 0.026, PIT = -0.22;
const vFall = (L: number) => 0.022 + 0.0016 * Math.min(L, 12);
const RESULT_OK = 210, RESULT_FAIL = 150, BANNER_T = 130, CALM_FAIL = 50, VAULT_T = 330;
const CLEAR_PTS = 100, STAR_PTS = 100, WIN_PTS = 300, HEART_PTS = 100;

export type Kind =
  | 'cat' | 'rock' | 'feather' | 'apple' | 'crate' | 'pumpkin' | 'dog' | 'bear' | 'helmet' | 'anvil'
  | 'pot' | 'chand' | 'cwt' | 'bridge' | 'barrel' | 'ball' | 'pillow' | 'vase' | 'sack';
interface KDef { hw: number; h: number; w: number; sq?: number; frag?: number; shat?: boolean; name: string }
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
  pot: { hw: 0.034, h: 0.05, w: 2, shat: true, name: '화분' },
  chand: { hw: 0.078, h: 0.05, w: 4, shat: true, name: '샹들리에' },
  cwt: { hw: 0.045, h: 0.075, w: 6, name: '균형추' },
  bridge: { hw: 0.07, h: 0.04, w: 4, name: '도개교' },
  barrel: { hw: 0.045, h: 0.08, w: 6, shat: true, name: '술통' },
  ball: { hw: 0.036, h: 0.064, w: 7, name: '대포알' },
  pillow: { hw: 0.056, h: 0.03, w: 1, name: '방석' },
  vase: { hw: 0.03, h: 0.066, w: 2, frag: 1, shat: true, name: '꽃병' },
  sack: { hw: 0.048, h: 0.07, w: 4, name: '밀가루 자루' },
};
const GUARD = (k: Kind) => k === 'dog' || k === 'bear';

// 받침 번호: 0~999 단단한 것(solid) · BODY+j 몸체 j · PLANK 시소 · ROPE 밧줄 · KIN 장치
const NONE = -1, BODY = 1000, PLANK = 3000, ROPE = 4000, KIN = 5000;
const REST = 0, FALL = 1, RISE = 2, FIXED = 3;

export type SK = 'ground' | 'hedge' | 'stone' | 'wall' | 'twig' | 'plank' | 'plate' | 'gate' | 'ceil' | 'shelf' | 'ped' | 'deck' | 'trap' | 'water';
interface SolidDef { k: SK; x0: number; x1: number; y0: number; y1: number; cap?: number; need?: number; gate?: number; pair?: number }
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
  saw?: SawDef; bridge?: BridgeDef; wind?: WindDef[]; ceil?: number; slots?: number; catTap?: boolean; z?: number;
  par: number; budget: number; stars: StarDef[]; next: string;
}

const gnd = (x0: number, x1: number, top = 0): SolidDef => ({ k: 'ground', x0, x1, y0: -0.3, y1: top });
const sol = (k: SK, x0: number, x1: number, y0: number, y1: number, o: Partial<SolidDef> = {}): SolidDef => ({ k, x0, x1, y0, y1, ...o });
const bd = (k: Kind, x: number, y = 0, o: Partial<BodyDef> = {}): BodyDef => ({ k, x, y, ...o });
const CH_NAME = ['정원', '성벽', '보물 탑'];
const XW = 0.714;

// ───────────────────────────── 판 (3장 18판) ─────────────────────────────
export const STAGES: StageDef[] = [
  // ── 1장 정원 ── (세상 폭 XW = 1/ZOOM)
  {
    ch: 0, name: '바위가 둥실', news: '', spot: null,
    hints: [['rock', '바위를 톡 — 무게를 훔쳐요'], ['feather', '깃털을 톡 — 훔친 무게를 줘요']],
    solids: [gnd(0, XW), sol('twig', 0.39, 0.53, 0.29, 0.305, { cap: 2 }), sol('ped', 0.6, 0.7, 0, 0.04)],
    bodies: [bd('rock', 0.24), bd('dog', 0.46), bd('feather', 0.47, 0.305)],
    cat: [0.04, 0], prize: { x: 0.65, y: 0.04, k: 'key' },
    par: 2, budget: 12, stars: [ST('clear', 0, '황금 열쇠 훔치기')], next: '',
  },
  {
    ch: 0, name: '경비견도 둥실', news: '경비견도 톡! 무게를 뺏기면 둥실 떠서 버둥버둥', spot: [0.27, 0.05, 0.08],
    hints: [['dog', '경비견을 톡 — 둥실 떠올라요'], ['apple', '사과에 무게를 주면?']],
    solids: [gnd(0, XW), sol('twig', 0.39, 0.53, 0.27, 0.285, { cap: 3 }), sol('ped', 0.6, 0.7, 0, 0.04)],
    bodies: [bd('dog', 0.27), bd('dog', 0.46), bd('apple', 0.46, 0.285)],
    cat: [0.04, 0], prize: { x: 0.65, y: 0.04, k: 'gem' },
    par: 2, budget: 7, stars: [ST('clear', 0, '보석 훔치기'), ST('taps', 2, '톡 2번 안에')], next: '',
  },
  {
    ch: 0, name: '쇠 투구', news: '투구가 누르고 있으면 훔쳐도 못 떠요 · 경비견은 위에서 4가 누르면 납작', spot: [0.42, 0.1, 0.07],
    hints: [],
    solids: [gnd(0, XW), sol('twig', 0.5, 0.66, 0.42, 0.435, { cap: 3 }), sol('ped', 0.6, 0.7, 0, 0.04)],
    bodies: [bd('rock', 0.22), bd('dog', 0.42), bd('helmet', 0.42, 0.084), bd('apple', 0.6, 0.435)],
    cat: [0.04, 0], prize: { x: 0.65, y: 0.04, k: 'egg' },
    par: 2, budget: 5, stars: [ST('clear', 0, '황금알 훔치기'), ST('taps', 2, '톡 2번 안에'), ST('empty', 0, '주머니 비우고 끝내기')], next: '',
  },
  {
    ch: 0, name: '양팔 저울', news: '양팔 저울 — 두 접시 무게가 똑같으면 문이 열려요', spot: [0.25, 0.3, 0.17],
    hints: [],
    solids: [gnd(0, XW), sol('plate', 0.08, 0.2, 0.28, 0.292, { pair: 2 }), sol('plate', 0.3, 0.42, 0.28, 0.292, { pair: 1 }), sol('gate', 0.48, 0.52, 0, 0.27, { gate: 1 }), sol('hedge', 0.46, 0.54, 0.27, 0.36), sol('ped', 0.6, 0.7, 0, 0.04)],
    bodies: [bd('rock', 0.36, 0.292), bd('apple', 0.11, 0.292), bd('pot', 0.17, 0.292), bd('crate', 0.24)],
    cat: [0.04, 0], prize: { x: 0.65, y: 0.04, k: 'cup' },
    par: 2, budget: 6, stars: [ST('clear', 0, '황금잔 훔치기'), ST('taps', 2, '톡 2번 안에'), ST('empty', 0, '주머니 비우고 끝내기')], next: '',
  },
  {
    ch: 0, name: '시소 날기', news: '시소 — 한쪽이 무거워지면 쾅! 반대쪽을 하늘로', spot: [0.25, 0.06, 0.15],
    hints: [],
    solids: [sol('hedge', 0, 0.115, -0.3, 0.12), gnd(0.115, 0.39), sol('hedge', 0.39, XW, -0.3, 0.2), sol('ped', 0.61, 0.7, 0.2, 0.24), sol('twig', 0.0, 0.12, 0.42, 0.435, { cap: 6 })],
    bodies: [bd('apple', 0.14, 0.05), bd('pumpkin', 0.06, 0.435), bd('dog', 0.5, 0.2)],
    saw: { px: 0.25, py: 0.05, hl: 0.14, lim: 0.36, th: -0.36 },
    cat: [0.06, 0.12], prize: { x: 0.655, y: 0.24, k: 'map' }, gems: [[0.42, 0.42]],
    par: 4, budget: 7, stars: [ST('clear', 0, '보물 지도 훔치기'), ST('taps', 4, '톡 4번 안에'), ST('gem', 0, '하늘 보석 줍기')], next: '',
  },
  {
    ch: 0, name: '곰 징검다리', news: '나무다리는 10까지 버텨요 — 넘으면 와르르 퐁당', spot: [0.335, 0.0, 0.14],
    hints: [],
    solids: [gnd(0, 0.2), gnd(0.47, XW), sol('water', 0.2, 0.47, -0.3, -0.12), sol('plank', 0.2, 0.47, -0.025, 0, { cap: 10 }), sol('ped', 0.6, 0.7, 0, 0.04), sol('twig', 0.02, 0.16, 0.32, 0.335, { cap: 3 })],
    bodies: [bd('bear', 0.335), bd('apple', 0.09, 0.335)],
    cat: [0.03, 0], prize: { x: 0.65, y: 0.04, k: 'cup' }, gems: [[0.235, 0.15]],
    par: 2, budget: 5, stars: [ST('clear', 0, '황금잔 훔치기'), ST('taps', 2, '톡 2번 안에'), ST('gem', 0, '물 위 보석 줍기')], next: '',
  },
  // ── 2장 성벽 ──
  {
    ch: 1, name: '도개교', news: '도개교 — 균형추가 다리보다 무거우면 다리가 올라가요', spot: [0.51, 0.06, 0.08],
    hints: [],
    solids: [gnd(0, 0.26), sol('water', 0.26, 0.47, -0.4, -0.24), gnd(0.47, XW), sol('shelf', 0.55, 0.66, 0.36, 0.375, { cap: 9 }), sol('ped', 0.655, XW, 0, 0.04), sol('twig', 0.04, 0.18, 0.42, 0.435, { cap: 3 })],
    bodies: [bd('dog', 0.6), bd('barrel', 0.605, 0.375), bd('apple', 0.11, 0.435)],
    bridge: { hx: 0.47, len: 0.21, dir: -1, cwx: 0.495, cwy: 0.012, rise: 0.24, a: 1 },
    cat: [0.04, 0], prize: { x: 0.685, y: 0.04, k: 'crown' },
    par: 2, budget: 5, stars: [ST('clear', 0, '왕관 훔치기'), ST('taps', 2, '톡 2번 안에'), ST('flat', 0, '경비견 납작하게')], next: '',
  },
  {
    ch: 1, name: '바람 타기', news: '바람 — 둥실 뜬 것은 바람에 밀려 가요', spot: [0.3, 0.44, 0.13],
    hints: [],
    solids: [gnd(0, XW), sol('stone', 0, 0.12, 0.3, 0.33), sol('wall', 0.5, XW, 0.24, 1.2), sol('ped', 0.59, 0.69, 0, 0.04)],
    bodies: [bd('pumpkin', 0.06, 0.33), bd('barrel', 0.2), bd('dog', 0.44)],
    wind: [{ x0: 0, x1: XW, y0: 0.3, y1: 1.2, vx: 0.0045 }],
    cat: [0.04, 0], prize: { x: 0.64, y: 0.04, k: 'map' },
    par: 2, budget: 6, stars: [ST('clear', 0, '보물 지도 훔치기'), ST('taps', 2, '톡 2번 안에'), ST('flat', 0, '경비견 납작하게')], next: '',
  },
  {
    ch: 1, name: '바람 다리', news: '해자 — 무거운 것이 빠지면 디딤돌이 돼요', spot: [0.36, 0.0, 0.11],
    hints: [],
    solids: [gnd(0, 0.26), sol('water', 0.26, 0.46, -0.3, -0.1), gnd(0.46, XW), sol('wall', 0.46, XW, 0.2, 1.2), sol('ped', 0.62, 0.7, 0, 0.04)],
    bodies: [bd('crate', 0.15), bd('dog', 0.56)],
    wind: [{ x0: 0, x1: XW, y0: 0.3, y1: 1.2, vx: 0.0045 }],
    cat: [0.04, 0], prize: { x: 0.66, y: 0.04, k: 'harp' },
    par: 3, budget: 7, stars: [ST('clear', 0, '황금 하프 훔치기'), ST('taps', 3, '톡 3번 안에'), ST('float', 0, '경비견 띄워 보내기')], next: '',
  },
  {
    ch: 1, name: '바람 부는 성벽', news: '이번엔 경비병이 둘 · 곰은 위에서 8이 누르면 납작', spot: [0.35, 0.45, 0.12],
    hints: [],
    solids: [gnd(0, XW), sol('wall', 0.58, XW, 0.2, 1.2), sol('ped', 0.61, XW, 0, 0.04)],
    bodies: [bd('barrel', 0.2), bd('dog', 0.35), bd('bear', 0.5)],
    wind: [{ x0: 0, x1: XW, y0: 0.32, y1: 1.2, vx: 0.0045 }],
    cat: [0.04, 0], prize: { x: 0.66, y: 0.04, k: 'cup' },
    par: 4, budget: 7, stars: [ST('clear', 0, '황금잔 훔치기'), ST('taps', 4, '톡 4번 안에'), ST('flat', 0, '둘 다 납작하게')], next: '',
  },
  {
    ch: 1, name: '저울문', news: '저울문 — 발판에 무게 12가 실리면 문이 열려요', spot: [0.155, 0.32, 0.08],
    hints: [],
    solids: [gnd(0, XW), sol('stone', 0.06, 0.25, 0.27, 0.3), sol('plate', 0.1, 0.21, 0.3, 0.312, { need: 12 }), sol('gate', 0.48, 0.52, 0, 0.3, { gate: 2 }), sol('wall', 0.46, 0.54, 0.3, 1.2), sol('ped', 0.6, 0.7, 0, 0.04)],
    bodies: [bd('pillow', 0.155, 0.312), bd('bear', 0.35), bd('helmet', 0.35, 0.124)],
    cat: [0.03, 0], prize: { x: 0.65, y: 0.04, k: 'harp' },
    par: 4, budget: 7, stars: [ST('clear', 0, '황금 하프 훔치기'), ST('taps', 4, '톡 4번 안에'), ST('flat', 0, '곰 납작하게')], next: '',
  },
  {
    ch: 1, name: '와르르 선반', news: '선반도 버티는 무게가 있어요 — 넘으면 줄줄이 와르르', spot: [0.32, 0.4, 0.13],
    hints: [],
    solids: [gnd(0, XW), sol('shelf', 0.25, 0.39, 0.5, 0.515, { cap: 5 }), sol('shelf', 0.25, 0.39, 0.3, 0.315, { cap: 10 }), sol('wall', 0.2, 0.25, 0.28, 1.2), sol('ped', 0.6, 0.7, 0, 0.04)],
    bodies: [bd('crate', 0.12), bd('bear', 0.32), bd('barrel', 0.32, 0.315), bd('sack', 0.32, 0.515)],
    cat: [0.03, 0], prize: { x: 0.65, y: 0.04, k: 'egg' },
    par: 2, budget: 6, stars: [ST('clear', 0, '황금알 훔치기'), ST('taps', 2, '톡 2번 안에'), ST('flat', 0, '곰 납작하게')], next: '',
  },
  {
    ch: 1, name: '해자 건너기', news: '시소로 해자를 훌쩍 — 무거울수록 높이, 모자라면 풍덩!', spot: [0.22, 0.06, 0.15],
    hints: [],
    solids: [gnd(0, 0.36), sol('water', 0.36, 0.53, -0.4, -0.24), gnd(0.53, XW), sol('ped', 0.62, XW, 0, 0.04), sol('stone', 0.0, 0.1, 0.36, 0.38)],
    bodies: [bd('crate', 0.09), bd('ball', 0.04, 0.38), bd('dog', 0.58)],
    saw: { px: 0.22, py: 0.05, hl: 0.14, lim: 0.36, th: -0.36 },
    cat: [0.015, 0], prize: { x: 0.67, y: 0.04, k: 'egg' },
    par: 4, budget: 7, stars: [ST('clear', 0, '황금알 훔치기'), ST('taps', 4, '톡 4번 안에'), ST('empty', 0, '주머니 비우고 끝내기')], next: '',
  },
  // ── 3장 보물 탑 ──
  {
    ch: 2, name: '샹들리에', news: '샹들리에 사슬은 6까지 — 넘으면 와장창', spot: [0.42, 0.46, 0.09],
    hints: [],
    solids: [gnd(0, XW), sol('ped', 0.6, 0.7, 0, 0.04), sol('shelf', 0.1, 0.24, 0.28, 0.295), sol('stone', 0.51, 0.59, 0.14, 0.16), sol('stone', 0.0, 0.1, 0.5, 0.52)],
    bodies: [bd('anvil', 0.17, 0.295), bd('bear', 0.41), bd('chand', 0.41, 0.46, { rope: 6, ay: 0.58 }), bd('vase', 0.55, 0.16), bd('feather', 0.05, 0.52)],
    cat: [0.03, 0], prize: { x: 0.65, y: 0.04, k: 'gem' },
    par: 2, budget: 5, stars: [ST('clear', 0, '보석 훔치기'), ST('taps', 2, '톡 2번 안에'), ST('flat', 0, '곰 납작하게')], next: '',
  },
  {
    ch: 2, name: '쿵 고양이', news: '이제 고양이도 톡! 마루 바닥은 8까지 버텨요', spot: [0.44, 0.33, 0.07],
    hints: [],
    solids: [gnd(0, XW), sol('stone', 0, 0.25, 0.3, 0.33), sol('trap', 0.25, 0.5, 0.315, 0.33, { cap: 8 }), sol('wall', 0.5, 0.54, 0.33, 1.2), sol('shelf', 0.04, 0.16, 0.47, 0.485), sol('ped', 0.6, 0.7, 0, 0.04)],
    bodies: [bd('anvil', 0.1, 0.485), bd('bear', 0.43), bd('apple', 0.2, 0.33)],
    catTap: true,
    cat: [0.03, 0.33], prize: { x: 0.65, y: 0.04, k: 'gem' },
    par: 2, budget: 6, stars: [ST('clear', 0, '보석 훔치기'), ST('taps', 2, '톡 2번 안에'), ST('flat', 0, '곰 납작하게')], next: '',
  },
  {
    ch: 2, name: '주머니 둘', news: '주머니가 둘! 두 번 훔치고, 다음 톡에 합쳐서 줘요', spot: [0.37, 0.1, 0.09],
    hints: [],
    solids: [gnd(0, XW), sol('ceil', 0, XW, 0.2, 0.26), sol('ped', 0.6, 0.7, 0, 0.04)],
    bodies: [bd('crate', 0.19), bd('bear', 0.37), bd('helmet', 0.37, 0.124), bd('apple', 0.51)],
    slots: 2,
    cat: [0.03, 0], prize: { x: 0.65, y: 0.04, k: 'cup' },
    par: 3, budget: 6, stars: [ST('clear', 0, '황금잔 훔치기'), ST('taps', 3, '톡 3번 안에'), ST('flat', 0, '곰 납작하게')], next: '',
  },
  {
    ch: 2, name: '둥실 고양이', news: '둥실 뜬 고양이는 보물 쪽으로 헤엄쳐 가요', spot: [0.39, 0.05, 0.07],
    hints: [],
    solids: [gnd(0, XW), sol('stone', 0, 0.36, 0.3, 0.33), sol('stone', 0.47, XW, 0.3, 0.33), sol('wall', 0.44, 0.47, 0, 0.3), sol('ped', 0.63, 0.7, 0.33, 0.37)],
    bodies: [bd('pumpkin', 0.16), bd('dog', 0.555, 0.33), bd('chand', 0.665, 0.47, { rope: 6, ay: 0.58 })],
    slots: 2, catTap: true,
    cat: [0.03, 0], prize: { x: 0.665, y: 0.37, k: 'map' },
    par: 3, budget: 6, stars: [ST('clear', 0, '보물 지도 훔치기'), ST('taps', 3, '톡 3번 안에'), ST('flat', 0, '경비견 납작하게')], next: '',
  },
  {
    ch: 2, name: '왕관의 방', news: '마지막 방 — 저울문은 9 · 사슬은 6까지 · 주머니 둘', spot: null,
    hints: [],
    solids: [gnd(0, XW), sol('stone', 0, 0.27, 0.3, 0.33), sol('stone', 0.4, XW, 0.3, 0.33), sol('wall', 0.4, 0.43, 0, 0.3), sol('plate', 0.45, 0.55, 0.33, 0.342, { need: 9 }),
      sol('gate', 0.6, 0.63, 0.33, 0.52, { gate: 4 }), sol('wall', 0.6, 0.63, 0.52, 1.2), sol('ped', 0.65, XW, 0.33, 0.37)],
    bodies: [bd('bear', 0.18), bd('pillow', 0.5, 0.342), bd('crate', 0.5, 0.45, { rope: 6, ay: 0.58 }), bd('feather', 0.08, 0.33)],
    slots: 2, catTap: true,
    cat: [0.03, 0], prize: { x: 0.68, y: 0.37, k: 'bigcrown' },
    par: 3, budget: 6, stars: [ST('clear', 0, '왕의 왕관 훔치기'), ST('taps', 3, '톡 3번 안에'), ST('empty', 0, '주머니 비우고 끝내기')], next: '',
  },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 세상 ─────────────────────────────
export interface Body {
  id: number; k: Kind; x: number; y: number; hw: number; h: number; w: number; w0: number;
  vx: number; vy: number; st: number; sup: number; load: number; mode: number; air: number;
  tap: boolean; sq: number; frag: number; shat: boolean; rope: number; ax: number; ay: number; kin: boolean;
  tw: number; land: number; hitV: number; flatT: number; face: number;
}
export interface Solid { id: number; k: SK; x0: number; x1: number; y0: number; y1: number; gy0: number; cap: number; on: boolean; need: number; gate: number; pair: number; open: number; load: number; brokeT: number }
interface Saw { px: number; py: number; hl: number; th: number; om: number; lim: number; slamT: number; thick: number }
interface Bridge { hx: number; len: number; dir: number; a: number; va: number; cw: number; bb: number; deck: number; cy0: number; rise: number; slamT: number }
interface Gem { x: number; y: number; got: number }
export interface WEv { t: number; k: string; i: number; x: number; y: number; v: number }
export interface World {
  t: number; b: Body[]; s: Solid[]; saw: Saw | null; br: Bridge | null; wind: WindDef[]; ceil: number; xw: number; z: number;
  cat: number; cs: string; prize: { x: number; y: number; k: PrizeK }; gems: Gem[];
  pouch: number[]; slots: number; taps: number; budget: number; catTap: boolean;
  done: number; why: string; calm: number; flats: number; floats: number; breaks: number; frags: number; ev: WEv[] | null;
  /** 고양이를 막은 것 (그림·힌트용 기록일 뿐 — 시뮬레이션에 쓰지 않는다): -1 없음 · 0~999 단단한 것 · BODY+j 몸 · PLANK 시소 · -2 구덩이(blkX) · -3 머리 위 */
  blk: number; blkX: number;
}

const addEv = (W: World, k: string, i: number, x: number, y: number, v = 0) => W.ev && W.ev.push({ t: W.t, k, i, x, y, v });

export function makeWorld(d: StageDef): World {
  const b: Body[] = [];
  const mk = (q: BodyDef): Body => {
    const K = KD[q.k];
    return {
      id: b.length, k: q.k, x: q.x, y: q.y, hw: K.hw, h: K.h, w: q.w ?? K.w, w0: q.w ?? K.w, vx: 0, vy: 0, st: 0, sup: NONE, load: 0, mode: REST, air: 0,
      tap: q.tap ?? q.k !== 'cat', sq: K.sq ?? 0, frag: K.frag ?? 0, shat: !!K.shat, rope: q.rope ?? -1, ax: q.x, ay: q.ay ?? 0, kin: !!q.kin,
      tw: -999, land: -999, hitV: 0, flatT: -999, face: 1,
    };
  };
  for (const q of d.bodies) b.push(mk(q));
  const cat = b.length;
  b.push(mk({ k: 'cat', x: d.cat[0], y: d.cat[1], tap: !!d.catTap }));
  const s: Solid[] = d.solids.map((q, id) => ({ id, k: q.k, x0: q.x0, x1: q.x1, y0: q.y0, y1: q.y1, gy0: q.y0, cap: q.cap ?? 0, on: true, need: q.need ?? 0, gate: q.gate ?? -1, pair: q.pair ?? -1, open: 0, load: 0, brokeT: -999 }));
  const W: World = {
    t: 0, b, s, saw: null, br: null, wind: d.wind ?? [], ceil: d.ceil ?? 0.58, xw: 1 / (d.z ?? ZOOM), z: d.z ?? ZOOM, cat, cs: 'walk', prize: { ...d.prize }, gems: (d.gems ?? []).map(([x, y]) => ({ x, y, got: -1 })),
    pouch: [], slots: d.slots ?? 1, taps: 0, budget: d.budget, catTap: !!d.catTap, done: 0, why: '', calm: 0, flats: 0, floats: 0, breaks: 0, frags: 0, ev: null,
    blk: -1, blkX: 0,
  };
  if (d.saw) W.saw = { px: d.saw.px, py: d.saw.py, hl: d.saw.hl, th: d.saw.th, om: 0, lim: d.saw.lim, slamT: -999, thick: 0.018 };
  if (d.bridge) {
    const q = d.bridge;
    const deck = s.length;
    s.push({ id: deck, k: 'deck', x0: q.dir < 0 ? q.hx - q.len : q.hx, x1: q.dir < 0 ? q.hx : q.hx + q.len, y0: -0.03, y1: 0, gy0: -0.03, cap: 0, on: q.a < 0.03, need: 0, gate: -1, pair: -1, open: 0, load: 0, brokeT: -999 });
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
    const want = pressed(W, W.s[g.gate]) ? 1 : 0;
    const was = g.open;
    g.open += Math.max(-0.008, Math.min(0.04, want - g.open));
    g.y0 = g.gy0 + g.open * (g.y1 - g.gy0 + 0.02);
    if (was < 0.5 && g.open >= 0.5) addEv(W, 'gate', g.id, (g.x0 + g.x1) / 2, g.y1, 1);
    if (was >= 0.5 && g.open < 0.5) addEv(W, 'gate', g.id, (g.x0 + g.x1) / 2, g.y1, 0);
  }
}

/** 발판이 눌렸나: 무게 몇 이상(need) · 또는 짝 발판과 무게가 같음(양팔 저울) */
export function pressed(W: World, p: Solid): boolean {
  if (p.need > 0) return p.load >= p.need;
  if (p.pair >= 0) return p.load > 0 && p.load === W.s[p.pair].load;
  return false;
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
  // 와장창: 술통·화분·샹들리에·꽃병은 세게 떨어지면 부서진다 (밑의 경비병을 납작하게 한 다음)
  for (const b of W.b) {
    if (!live(b) || !b.shat || ((W.t - b.land > 2 || b.hitV < 0.014) && b.load - b.w < Math.max(3, b.w))) continue; // 세게 떨어지거나, 제 무게보다 무거운 것에 눌리면
    b.st = 3;
    if (b.k === 'vase') W.frags++;
    changed = true;
    addEv(W, 'shatter', b.id, b.x, b.y, b.load);
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
    if (b.x > W.xw - b.hw) (b.x = W.xw - b.hw), (b.vx = 0);
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
  W.blk = -1;
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
  // 막는 것은 한 뼘(GAP) 앞에서 멈춘다 (그림이 겹치지 않게). 턱은 발이 제대로 걸칠 때(OVL) 오른다.
  // 몸 하나는 '그것이 놓인 자리에서' STEP 이하이고 발이 닿으면 계단처럼 오를 수 있다 (납작한 개 위 사과).
  const g0 = dir > 0 ? x0 : x0 - GAP, g1 = dir > 0 ? x1 + GAP : x1, f0 = nx - c.hw, f1 = nx + c.hw;
  for (const q of W.s) {
    if (!q.on || g1 <= q.x0 || g0 >= q.x1 || q.y1 <= yb || q.y0 >= yt) continue;
    if (q.y1 - c.y <= STEP) {
      if (Math.min(f1, q.x1) - Math.max(f0, q.x0) > OVL) lift = Math.max(lift, q.y1 - c.y);
    } else (blocked = true), W.blk < 0 && (W.blk = q.id);
  }
  for (const o of W.b) {
    if (o === c || !live(o) || o.k === 'bridge' || o.sup === BODY + c.id) continue;
    if (g1 <= o.x - o.hw || g0 >= o.x + o.hw || o.y + o.h <= yb || o.y >= yt) continue;
    const climb = o.y + o.h - Math.max(c.y, o.y) <= STEP && o.y <= c.y + STEP;
    if (!climb) (blocked = true), W.blk < 0 && (W.blk = BODY + o.id);
    else if (Math.min(f1, o.x + o.hw) - Math.max(f0, o.x - o.hw) > OVL && o.y + o.h - c.y <= STEP) lift = Math.max(lift, o.y + o.h - c.y);
  }
  if (W.saw && c.sup !== PLANK) {
    const pt = plankTop(W.saw, nx + dir * c.hw * 0.5);
    if (pt !== null && pt > c.y + 0.003) {
      if (pt - c.y <= STEP) lift = Math.max(lift, pt - c.y);
      else (blocked = true), W.blk < 0 && (W.blk = PLANK);
    }
  }
  if (!blocked && lift > 0 && !stripFree(W, c, x0, x1, c.y + lift + 0.001)) (blocked = true), (W.blk = -3);
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
    } else (W.cs = 'wait'), (W.blk = -2), (W.blkX = lead);
    return;
  }
  // 삐걱: 올라서면 부서질 다리·판자 앞에서는 멈춘다
  if (lift < 0.01) {
    for (const q of W.s) {
      if (!q.on || q.cap <= 0 || c.sup === q.id || lead <= q.x0 || lead >= q.x1 || Math.abs(q.y1 - c.y) > 0.02) continue;
      if (q.load + c.load > q.cap) {
        W.cs = 'creak';
        W.blk = q.id;
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
    const above = b.load - b.w;
    b.w = 0;
    b.tw = W.t;
    if (!b.kin && b.rope < 0 && above === 0) b.vy = Math.max(b.vy, 0.0045); // 뽁! 하고 땅에서 떨어진다
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

// ───────────────────────────── 게임 상태 ─────────────────────────────
interface Ev { t: number; k: string; i: number; x: number; y: number; v: number; text?: string }
export interface WSState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result' | 'fail' | 'vault'; pt: number; restarts: number; vaultFrom: number;
  W: World; d: StageDef;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; won: boolean; dead: boolean; tries: number; why: string;
  down: boolean; ax: number; ay: number; firstTap: number; firstBig: number; wowN: number; lastWow: number; lastTap: number; stageT: number;
  seen: Set<string>; banner: { head: string; sub: string; t: number } | null; events: Ev[];
  stash: PrizeK[]; gemN: number; best: number[];
  /** 막힘 힌트(39라운드): hintAt = 전구를 켠 틱(-1 꺼짐) · hintTaps = 그때까지 톡 수 · 힌트 횟수(모두·이 판) · 이번 시도의 톡 기록(몸 번호) */
  hintAt: number; hintTaps: number; hintAuto: boolean; hintN: number; hintSt: number; hintFor: number; tapLog: number[];
  /** 마지막으로 '진전'이 있었던 틱 (고양이가 보물에 가까워짐 · 납작·뚝·문 열림 같은 큰 일) — 15초 넘게 없으면 전구가 반짝 */
  prog: number; bestD: number;
  /** 다시 털기(결과 화면 ↺ — 별 더 받기): 이번 시도는 전구가 별 길 · 별·창고는 늘어난 만큼만 */
  replay: boolean; starHint: boolean; gemBest: number[]; chGiven: number[];
  /** 키보드를 한 번이라도 썼나 (전구 옆 '(1)' 표시) */
  kbd: boolean;
}
const GY = 1.03;
/** 화면(너비 단위) ↔ 세상 (카메라 배율 W.z) */
const toWorld = (W: World, sx: number, sy: number) => ({ x: sx / W.z, y: (GY - sy) / W.z });
const HIT = 0.06;

function see(s: WSState, key: string) {
  if (s.seen.has(key)) return false;
  s.seen.add(key);
  return true;
}
const BIG = new Set(['squash', 'slam', 'snap', 'break', 'rope', 'shatter', 'grab', 'catfloat']);
function pull(s: WSState) {
  const W = s.W;
  if (!W.ev || !W.ev.length) return;
  for (const e of W.ev) {
    s.events.push({ t: s.t, k: e.k, i: e.i, x: e.x, y: e.y, v: e.v });
    const big = BIG.has(e.k) || (e.k === 'launch' && e.v > 0.012 && W.b[e.i]?.k === 'cat') || (e.k === 'steal' && e.v >= 5) || (e.k === 'gate' && e.v === 1) || (e.k === 'sawslam' && e.v > 0.07);
    if (big && e.k !== 'steal') s.prog = s.t;
    if (big && s.t - s.lastWow > 20) {
      s.wowN++;
      s.lastWow = s.t;
      if (s.firstBig < 0) s.firstBig = s.t;
    }
    // 처음 보는 일 (펼쳐짐)
    const b = e.i >= 0 ? W.b[e.i] : null;
    if (e.k === 'steal') see(s, b && GUARD(b.k) ? 'float-guard' : b && b.k === 'cat' ? 'float-cat' : 'steal');
    else if (['give', 'squash', 'snap', 'launch', 'slam', 'gate', 'shatter', 'splash', 'rope', 'break', 'gem'].includes(e.k)) see(s, e.k);
  }
  W.ev.length = 0;
  if (s.events.length > 80) s.events = s.events.filter((e) => s.t - e.t < 150);
}

function newStage(s: WSState, again = false) {
  s.d = STAGES[s.stage];
  s.W = makeWorld(s.d);
  s.W.ev = [];
  s.phase = 'play';
  s.pt = 0;
  s.got = 0;
  s.starOk = s.d.stars.map(() => false);
  s.stageT = s.t;
  s.tapLog = [];
  s.hintAt = -1;
  s.prog = s.t;
  s.bestD = 9;
  if (s.hintFor !== s.stage) (s.hintFor = s.stage), (s.hintSt = 0), (s.replay = false), (s.starHint = false);
  // 두 번 실패하면 판 시작 때 힌트를 한 번 저절로 (시작 카드가 지나간 뒤)
  if (!again && s.tries === 2) (s.hintAt = s.t + 100), (s.hintTaps = 0), (s.hintAuto = true), s.hintN++, s.hintSt++;
  const fresh = see(s, 'stage' + s.stage);
  if ((s.d.slots ?? 1) > 1) see(s, 'pouch2');
  if (s.d.wind) see(s, 'wind');
  s.banner = { head: `${s.stage + 1}판 · ${s.d.name}`, sub: again ? '처음부터 다시! (하트는 그대로)' : fresh || s.tries === 0 ? s.d.news : '다시 한 번!', t: s.t };
}

function finish(s: WSState, ok: boolean) {
  const W = s.W, d = s.d;
  s.phase = ok ? 'result' : 'fail';
  s.pt = 0;
  if (ok) {
    s.starOk = d.stars.map((q) => starMet(W, q));
    s.got = s.starOk.filter(Boolean).length;
    const prev = s.best[s.stage] ?? 0, gems = W.gems.filter((g) => g.got >= 0).length;
    if (s.replay) {
      // 다시 털기: 늘어난 별·보석만 (보물은 이미 창고에)
      const up = Math.max(0, s.got - prev);
      s.stars += up;
      s.pts += up * STAR_PTS;
      s.gemN += Math.max(0, gems - (s.gemBest[s.stage] ?? 0));
    } else {
      s.stars += s.got;
      s.pts += CLEAR_PTS + s.got * STAR_PTS;
      s.stash.push(d.prize.k);
      s.gemN += gems;
    }
    s.gemBest[s.stage] = Math.max(s.gemBest[s.stage] ?? 0, gems);
    s.best[s.stage] = Math.max(prev, s.got);
    if (s.stage === STAGES.length - 1 && !s.won) (s.won = true), (s.pts += WIN_PTS + s.hearts * HEART_PTS);
    s.events.push({ t: s.t, k: 'clear', i: -1, x: 0.5, y: 0.5, v: s.got });
  } else {
    s.hearts--;
    s.tries++;
    s.why = W.why;
    s.events.push({ t: s.t, k: 'fail', i: -1, x: 0.5, y: 0.5, v: 0 });
  }
}

/** 왼쪽 위 ↺ 다시 단추 (화면 너비 단위) */
export const RESTART = { x: 0.055, y: 0.0425, r: 0.05 };
const isRestart = (sx: number, sy: number) => Math.hypot(sx - RESTART.x, sy - RESTART.y) < RESTART.r + 0.012;
/** 오른쪽 위 전구 = 막힘 힌트 (톡 영역 지름 ≈ 화면 폭 12%) */
export const BULB = { x: 0.943, y: 0.0425, r: 0.05 };
const isBulb = (sx: number, sy: number) => Math.hypot(sx - BULB.x, sy - BULB.y) < BULB.r + 0.012;
/** 힌트 켜기: 상태만 적는다 — 계산(지금 상태에서 다음 수)은 그리기 쪽에서 한 번만 (봇·시뮬레이션 무관) */
function askHint(s: WSState) {
  s.hintAt = s.t;
  s.hintTaps = s.tapLog.length;
  s.hintAuto = false;
  s.hintN++;
  s.hintSt++;
  s.events.push({ t: s.t, k: 'hint', i: -1, x: 0.5, y: 0.5, v: 0 });
}
/** 손가락 자리에서 가장 가까운 만질 수 있는 물건 (없으면 -1) */
export function pickBody(W: World, sx: number, sy: number): number {
  const p = toWorld(W, sx, sy);
  let best = -1, bd = HIT, bc = 9;
  for (const b of tappable(W)) {
    let d: number, c: number;
    if (b.k === 'bridge' && W.br) {
      const B = W.br, phi = B.a * (Math.PI / 2), tx = B.hx + B.dir * Math.cos(phi) * B.len, ty = Math.sin(phi) * B.len;
      const vx = tx - B.hx, vy = ty, u = Math.max(0, Math.min(1, ((p.x - B.hx) * vx + p.y * vy) / (vx * vx + vy * vy)));
      d = Math.max(0, Math.hypot(p.x - (B.hx + vx * u), p.y - vy * u) - 0.02);
      c = d;
    } else {
      const pad = 0.012, dx = Math.max(0, Math.abs(p.x - b.x) - b.hw - pad), cy = b.y + b.h / 2, dy = Math.max(0, Math.abs(p.y - cy) - b.h / 2 - pad);
      d = Math.hypot(dx, dy);
      c = Math.hypot(p.x - b.x, p.y - cy);
    }
    if (d < bd - 1e-9 || (Math.abs(d - bd) < 1e-9 && c < bc)) (bd = d), (bc = c), (best = b.id);
  }
  return best;
}
/** 물건의 화면 자리 (봇·손가락 그림) */
export function bodyScreen(W: World, i: number): { x: number; y: number } {
  const b = W.b[i];
  if (b.k === 'bridge' && W.br) {
    const B = W.br, phi = B.a * (Math.PI / 2);
    return { x: (B.hx + B.dir * Math.cos(phi) * B.len * 0.55) * W.z, y: GY - Math.sin(phi) * B.len * 0.55 * W.z };
  }
  return { x: b.x * W.z, y: GY - (b.y + b.h / 2) * W.z };
}

const game: GameDef<WSState> & { wows(s: WSState): number } = {
  id: 'weightsteal',
  name: '🪶 무게 훔치기',
  genes: ['weightsteal', 'pulley', 'depth'],
  twist: '물건을 톡 하면 무게를 빼앗아 주머니에 — 가벼워진 바위는 풍선처럼 둥실 떠오르고, 그 무게를 받은 깃털은 쿵! 떨어져 경비견을 납작하게 만든다. 무게는 사라지지 않고 옮겨 갈 뿐이라, 무엇의 무게를 어디에 줄지가 수다',
  rules: [
    '물건을 톡 → 그 무게를 훔쳐요(물건은 둥실). 다음 톡 → 훔친 무게를 그 물건에 줘요(쿵!).',
    '도둑 고양이가 보물까지 가는 길을 만들어요. 톡이 적을수록 별!',
  ],
  controls: 'touch',
  hint: '물건을 톡 = 무게 훔치기 · 다시 톡 = 무게 주기 · 막히면 전구 / 화살표로 고르고 스페이스 · 숫자 1 = 힌트',
  aspect: A,
  art: {
    concept: '도둑 고양이의 동화 성 털기 — 햇살 정원 · 깃발 날리는 성벽 · 촛불 보물 탑을 3/4 시점 디오라마로',
    mood: '밝은 동화책 같은 성. 망토 두른 도둑 고양이가 살금살금 걷고, 무게를 뺏긴 바위는 비눗방울처럼 반짝이며 둥실 떠오른다. 무게를 받은 깃털은 쇳빛으로 변해 쿵! 경비견은 납작한 부침개가 되고, 둥실 뜬 곰은 허공에서 버둥버둥.',
    palette: { bg: '#bfe6ff', ink: '#3a2a18', muted: '#8a7a5a', accent: '#ffc83a', hot: '#ff5a3a', soft: '#fff6e0' },
  },
  guard: (s) => (s.W.b[s.W.cat].st === 0 ? 1 : 0),
  cleared: (s) => (s.phase === 'result' ? { stage: s.stage, got: s.got, of: s.d.stars.length } : null),
  reveals: (s) => s.seen.size,
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, W: null, d: STAGES[0],
      hearts: 3, stars: 0, got: 0, starOk: [], pts: 0, won: false, dead: false, tries: 0, why: '',
      down: false, ax: 0.5, ay: 0.5, firstTap: -1, firstBig: -1, wowN: 0, lastWow: -99, lastTap: -99, stageT: 0, restarts: 0, vaultFrom: 0,
      seen: new Set<string>(), banner: null, events: [], stash: [], gemN: 0, best: STAGES.map(() => 0),
      hintAt: -1, hintTaps: 0, hintAuto: false, hintN: 0, hintSt: 0, hintFor: -1, tapLog: [], prog: 0, bestD: 9,
      replay: false, starHint: false, gemBest: STAGES.map(() => 0), chGiven: [], kbd: false,
    } as unknown as WSState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null, fresh = !!p && !s.down;
    s.down = !!p;
    if (p) (s.ax = p.x), (s.ay = p.y);
    if (s.phase === 'play' && fresh && isRestart(p!.x, p!.y * A)) {
      // ↺ 다시: 하트는 그대로, 그 판 처음부터
      s.restarts++;
      s.events.push({ t: s.t, k: 'restart', i: -1, x: 0.5, y: 0.5, v: 0 });
      newStage(s, true);
      return;
    }
    if (inp.dir !== 0 || inp.pick !== undefined) s.kbd = true;
    if (s.phase === 'result' && fresh && isRestart(p!.x, p!.y * A) && s.got < s.d.stars.length) {
      // 결과 화면 ↺ = 다시 털기 (별 더 받기) — 이번엔 전구가 별 길을 알려 준다
      s.tries = 0;
      newStage(s);
      (s.replay = true), (s.starHint = true);
      s.events.push({ t: s.t, k: 'restart', i: -1, x: 0.5, y: 0.5, v: 0 });
      if (s.banner) s.banner.sub = '★ 더 받기 — 이번엔 전구가 별 길을 알려 줘요';
      return;
    }
    if (s.phase === 'play') {
      if (inp.pick !== undefined && !s.W.done) askHint(s); // 키보드 1·2·3 = 힌트 (H 키는 판이 받지 못한다)
      if (fresh && isBulb(p!.x, p!.y * A)) {
        if (!s.W.done) askHint(s);
      } else if (fresh) {
        const i = pickBody(s.W, p!.x, p!.y * A);
        if (i >= 0) {
          const r = tapBody(s.W, i);
          if (r) {
            if (s.firstTap < 0) s.firstTap = s.t;
            s.lastTap = s.t;
            s.tapLog.push(i);
          }
        } else s.events.push({ t: s.t, k: 'miss', i: -1, x: p!.x / s.W.z, y: (GY - p!.y * A) / s.W.z, v: 0 });
      }
      tick(s.W);
      pull(s);
      const c = s.W.b[s.W.cat], dd = Math.hypot(c.x - s.W.prize.x, c.y - s.W.prize.y);
      if (dd < s.bestD - 0.02) (s.bestD = dd), (s.prog = s.t);
      if (s.W.done === 1) finish(s, true);
      else if (s.W.done === -1) finish(s, false);
    } else {
      tick(s.W);
      pull(s);
      s.pt++;
      const T = s.phase === 'result' ? RESULT_OK + (s.got < s.d.stars.length ? 90 : 0) : s.phase === 'vault' ? VAULT_T : RESULT_FAIL;
      if (s.pt >= T || (fresh && s.pt > (s.phase === 'vault' ? 70 : 50))) {
        const endCh = s.won || (s.stage + 1 < STAGES.length && STAGES[s.stage + 1].ch !== s.d.ch);
        if (s.phase === 'result' && endCh) {
          // 장 끝: 비밀 창고 장면
          s.phase = 'vault';
          s.pt = 0;
          s.events.push({ t: s.t, k: 'vault', i: -1, x: 0.5, y: 0.5, v: s.d.ch });
        } else if (s.phase === 'result' || s.phase === 'vault') {
          if (s.won) s.dead = true;
          else {
            if (endCh && !s.chGiven.includes(s.d.ch)) s.hearts = Math.min(3, s.hearts + 1), s.chGiven.push(s.d.ch);
            s.stage++;
            s.tries = 0;
            newStage(s);
          }
        } else if (s.hearts <= 0) s.dead = true;
        else newStage(s);
      }
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const weightsteal = game;
/** 시험·스크린샷용: k판(0부터)으로 바로 */
export function jumpTo(s: WSState, k: number) {
  s.stage = k;
  s.tries = 0;
  newStage(s);
}

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const atBody = (W: World, i: number): Input => {
  const q = bodyScreen(W, i);
  return { tap: false, dir: 0, pointer: { x: q.x, y: q.y / A } };
};
const CALM_BOT = 6;
function settle(V: World, max = 900) {
  let n = 0;
  while (!V.done && n < max && !(V.calm >= CALM_BOT && n > 4)) (tick(V), n++);
}
function sig(W: World, stage: number): string {
  let k = `${stage}|${W.taps}|${W.pouch.join(',')}|${W.done}|`;
  for (const b of W.b) k += `${b.w},${b.st},${Math.round(b.x * 300)},${Math.round(b.y * 300)};`;
  if (W.saw) k += Math.round(W.saw.th * 100);
  if (W.br) k += '|' + Math.round(W.br.a * 50);
  return k;
}
function value(W: World, d: StageDef): number {
  if (W.done === 1) return 1e6 + d.stars.filter((q) => starMet(W, q)).length * 1e5 - W.taps * 1000 + (W.pouch.length ? 0 : 50);
  if (W.done === -1) return -1e6;
  const c = W.b[W.cat];
  return -Math.hypot(c.x - W.prize.x, c.y - W.prize.y) * 3000 - W.taps * 400 + W.flats * 150 - (W.taps >= W.budget ? 5e5 : 0);
}
/** 물리를 그대로 돌려 톡 순서(훔치기·주기 조합)를 고른다 — 깊이를 1씩 늘리며, 별을 다 따는 길을 찾으면 멈춘다 */
function search(W0: World, d: StageDef): number[] {
  let best: number[] = [], bv = -Infinity;
  const full = 1e6 + d.stars.length * 1e5;
  const maxD = Math.min(5, W0.budget - W0.taps);
  for (let D = 1; D <= maxD; D++) {
    const rec = (W: World, seq: number[], dep: number) => {
      const v = value(W, d);
      if (seq.length && v > bv) (bv = v), (best = seq.slice());
      if (W.done !== 0 || dep === 0) return;
      for (const b of tappable(W)) {
        const V = cloneWorld(W);
        if (!tapBody(V, b.id)) continue;
        settle(V);
        seq.push(b.id);
        rec(V, seq, dep - 1);
        seq.pop();
      }
    };
    rec(W0, [], D);
    if (bv >= full - (W0.taps + D) * 1000) break;
  }
  return best;
}
const PLAN = new Map<string, number[]>();
export function planTaps(W: World, stage: number): number[] {
  const key = sig(W, stage);
  let p = PLAN.get(key);
  if (p) return p;
  p = search(W, STAGES[stage]);
  PLAN.set(key, p);
  // 계획대로 갔을 때의 중간 자리도 기억 (다시 찾지 않게)
  const V = cloneWorld(W);
  for (let k = 0; k < p.length - 1; k++) {
    if (!tapBody(V, p[k])) break;
    settle(V);
    const kk = sig(V, stage);
    if (!PLAN.has(kk)) PLAN.set(kk, p.slice(k + 1));
  }
  if (PLAN.size > 4000) PLAN.clear();
  return p;
}
const ready = (s: WSState) => s.phase === 'play' && !s.down && s.W.calm >= CALM_BOT && s.t - s.lastTap > 10 && !s.W.done;

/** 잘하는 봇: 물리를 그대로 시뮬레이션해 톡 조합을 고른다. 결과 화면은 1.5초 보고 넘긴다 */
export const weightstealSmart: Bot<WSState> = {
  name: '무게 도둑 달인',
  act(s) {
    if (s.phase !== 'play') return !s.down && s.pt > 90 ? { tap: false, dir: 0, pointer: { x: 0.5, y: 0.5 } } : NO;
    if (!ready(s)) return NO;
    const p = planTaps(s.W, s.stage);
    return p.length ? atBody(s.W, p[0]) : NO;
  },
};

const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 못하는 봇: 아무 때나 아무 물건이나 톡 (가끔 화면 아무 데나) */
export const weightstealRandom: Bot<WSState> = {
  name: '아무거나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 110);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    const list = s.phase === 'play' ? tappable(s.W) : [];
    if (rng() < 0.2 || !list.length) m.p = { x: rng(), y: 0.1 + rng() * 0.75 };
    else {
      const b = list[Math.floor(rng() * list.length)], q = bodyScreen(s.W, b.id);
      m.p = { x: q.x + (rng() - 0.5) * 0.03, y: (q.y + (rng() - 0.5) * 0.03) / A };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};

const lastStolen = new WeakMap<object, number>();
function habitPick(s: WSState, steal: (W: World, c: Body) => Body | null, give: (W: World, c: Body, from: number) => Body | null): Input {
  if (!ready(s)) return NO;
  const W = s.W, c = W.b[W.cat];
  if (!W.pouch.length) {
    const b = steal(W, c);
    if (!b) return NO;
    lastStolen.set(s, b.id);
    return atBody(W, b.id);
  }
  const b = give(W, c, lastStolen.get(s) ?? -1);
  return b ? atBody(W, b.id) : NO;
}
const others = (W: World) => tappable(W).filter((b) => b.k !== 'cat');
const dist = (a: Body, b: Body) => Math.hypot(a.x - b.x, a.y + a.h / 2 - b.y - b.h / 2);
/** 버릇 봇 1: 늘 고양이에게 가장 가까운 물건의 무게 → 가장 가까운 경비병에게 */
export const weightstealHabit: Bot<WSState> = {
  name: '버릇: 가까운 것 → 가까운 적',
  act: (s) => habitPick(
    s,
    (W, c) => others(W).filter((b) => b.w > 0).sort((a, b) => dist(a, c) - dist(b, c))[0] ?? null,
    (W, c, from) => {
      const g = others(W).filter((b) => GUARD(b.k) && b.st === 0).sort((a, b) => dist(a, c) - dist(b, c))[0];
      return g ?? others(W).filter((b) => b.id !== from).sort((a, b) => dist(a, c) - dist(b, c))[0] ?? null;
    },
  ),
};
/** 버릇 봇 2: 늘 가장 무거운 것의 무게 → 가장 높은 것에게 */
export const weightstealHabit2: Bot<WSState> = {
  name: '버릇: 무거운 것 → 높은 곳',
  act: (s) => habitPick(
    s,
    (W) => others(W).filter((b) => b.w > 0).sort((a, b) => b.w - a.w || a.x - b.x)[0] ?? null,
    (W, _c, from) => others(W).filter((b) => b.id !== from).sort((a, b) => b.y + b.h - (a.y + a.h))[0] ?? null,
  ),
};


// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const OUT = '#3a2618';
/** 윗면 깊이(너비 단위): 3/4 시점 — 물건은 윗면 가운데에 선다 */
const DEP = 0.044;
const PANEL = 1.262;
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (q: number) => 1 - Math.pow(1 - clamp(q, 0, 1), 2.4);
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}
function lin(ctx: C2, x0: number, y0: number, x1: number, y1: number, ...st: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function radg(ctx: C2, x: number, y: number, r0: number, r1: number, ...st: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.1, r1));
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)));
}
function starPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r * 0.45 : r;
    if (k) ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
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
function stroke(ctx: C2, col: string, lw: number) {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}
function txt(ctx: C2, s: string, x: number, y: number, size: number, col: string, wgt = 900, align: CanvasTextAlign = 'center', outline = 'rgba(58,38,24,.55)', maxW?: number) {
  ctx.font = `${wgt} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (outline) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.22);
    ctx.strokeStyle = outline;
    ctx.strokeText(s, x, y, maxW);
  }
  ctx.fillStyle = col;
  ctx.fillText(s, x, y, maxW);
}

// ── 배경 (장마다 · 정적인 부분은 한 번 그려 둔다) ──
const BG = new Map<string, HTMLCanvasElement>();
function layer(w: number, h: number, sc: number, paint: (c: C2) => void) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * sc));
  c.height = Math.max(1, Math.ceil(h * sc));
  const g = c.getContext('2d')!;
  g.scale(sc, sc);
  paint(g);
  return c;
}
function hills(g: C2, w: number, y0: number, amp: number, col: string, seed: number) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(-5, y0 + amp * 3);
  for (let x = 0; x <= w + 10; x += 6) g.lineTo(x, y0 - amp * (0.6 * Math.sin(x / (w * 0.21) + seed) + 0.4 * Math.sin(x / (w * 0.09) + seed * 2.3)));
  g.lineTo(w + 10, y0 + amp * 6);
  g.lineTo(-5, y0 + amp * 6);
  g.closePath();
  g.fill();
}
function farCastle(g: C2, cx: number, by: number, u: number, wall: string, roof: string) {
  // 언덕 위 작은 성 (분홍빛 벽 · 파란 고깔 지붕)
  const tower = (x: number, wd: number, ht: number) => {
    g.fillStyle = wall;
    g.fillRect(x - wd / 2, by - ht, wd, ht);
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.fillRect(x - wd / 2, by - ht, wd * 0.25, ht);
    g.fillStyle = roof;
    g.beginPath();
    g.moveTo(x - wd * 0.62, by - ht);
    g.lineTo(x, by - ht - wd * 1.3);
    g.lineTo(x + wd * 0.62, by - ht);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(80,60,120,.45)';
    rr(g, x - wd * 0.12, by - ht * 0.7, wd * 0.24, ht * 0.18, wd * 0.12);
    g.fill();
  };
  g.fillStyle = wall;
  g.fillRect(cx - u * 1.1, by - u * 0.7, u * 2.2, u * 0.7);
  for (let k = -5; k <= 5; k++) g.fillRect(cx + k * u * 0.2 - u * 0.06, by - u * 0.82, u * 0.12, u * 0.14);
  tower(cx - u * 1.1, u * 0.42, u * 1.3);
  tower(cx + u * 1.1, u * 0.42, u * 1.3);
  tower(cx, u * 0.55, u * 1.9);
  g.fillStyle = 'rgba(90,60,40,.4)';
  rr(g, cx - u * 0.16, by - u * 0.42, u * 0.32, u * 0.42, u * 0.16);
  g.fill();
}
function getBg(ch: number, w: number, h: number): HTMLCanvasElement {
  const key = `${ch}:${Math.round(w)}:${Math.round(h)}`;
  let c = BG.get(key);
  if (c) return c;
  c = layer(w, h, 2, (g) => {
    const R = (r: number) => r * w;
    if (ch === 0) {
      g.fillStyle = lin(g, 0, 0, 0, R(1.2), [0, '#7fcaff'], [0.55, '#c8ecff'], [1, '#fff3d0']);
      g.fillRect(0, 0, w, h);
      // 해
      g.fillStyle = radg(g, R(0.84), R(0.2), 0, R(0.22), [0, 'rgba(255,250,210,.95)'], [0.25, 'rgba(255,240,170,.55)'], [1, 'rgba(255,240,170,0)']);
      g.fillRect(0, 0, w, R(0.6));
      g.fillStyle = '#fff6c8';
      ell(g, R(0.84), R(0.2), R(0.05), R(0.05));
      g.fill();
      hills(g, w, R(0.82), R(0.05), '#b9e3a8', 1.3);
      farCastle(g, R(0.3), R(0.66), R(0.1), '#f6dde0', '#6f8fe8');
      hills(g, w, R(0.92), R(0.045), '#9fd88a', 4.1);
      // 먼 나무 줄
      for (let k = 0; k < 14; k++) {
        const x = R(-0.04 + k * 0.08 + hsh(k) * 0.03), y = R(0.98 + hsh(k + 3) * 0.03), r = R(0.035 + hsh(k + 7) * 0.02);
        g.fillStyle = '#7ec46a';
        ell(g, x, y - r, r, r * 1.1);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,.18)';
        ell(g, x - r * 0.3, y - r * 1.4, r * 0.45, r * 0.35);
        g.fill();
      }
      hills(g, w, R(1.06), R(0.025), '#8bcc72', 2.2);
    } else if (ch === 1) {
      g.fillStyle = lin(g, 0, 0, 0, R(1.2), [0, '#86c9ff'], [0.6, '#d2eeff'], [1, '#fdf1dc']);
      g.fillRect(0, 0, w, h);
      hills(g, w, R(0.86), R(0.04), '#c4e3b0', 0.7);
      // 뒤 성벽 · 탑
      const wy = R(0.62);
      g.fillStyle = lin(g, 0, wy, 0, R(1.15), [0, '#ecd9b8'], [1, '#d7bf98']);
      g.fillRect(0, wy, w, h);
      for (let k = 0; k < 13; k++) {
        g.fillRect(R(k * 0.08), wy - R(0.035), R(0.05), R(0.04));
      }
      g.strokeStyle = 'rgba(150,115,75,.35)';
      g.lineWidth = 1;
      for (let r = 0; r < 14; r++) {
        const y = wy + R(r * 0.04);
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(w, y);
        g.stroke();
        for (let k = 0; k < 9; k++) {
          const x = R(k * 0.12 + (r % 2) * 0.06);
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x, y + R(0.04));
          g.stroke();
        }
      }
      for (const [tx, tw2, ht, rc] of [[0.12, 0.13, 0.3, '#d9564a'], [0.88, 0.15, 0.36, '#4f7fd9']] as [number, number, number, string][]) {
        g.fillStyle = lin(g, R(tx - tw2 / 2), 0, R(tx + tw2 / 2), 0, [0, '#f3e3c6'], [1, '#d4bb93']);
        g.fillRect(R(tx - tw2 / 2), wy - R(ht), R(tw2), R(ht + 0.6));
        g.fillStyle = rc;
        g.beginPath();
        g.moveTo(R(tx - tw2 * 0.62), wy - R(ht));
        g.lineTo(R(tx), wy - R(ht + tw2 * 1.25));
        g.lineTo(R(tx + tw2 * 0.62), wy - R(ht));
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(255,255,255,.25)';
        g.beginPath();
        g.moveTo(R(tx - tw2 * 0.62), wy - R(ht));
        g.lineTo(R(tx), wy - R(ht + tw2 * 1.25));
        g.lineTo(R(tx - tw2 * 0.2), wy - R(ht));
        g.closePath();
        g.fill();
        g.fillStyle = '#5a4030';
        rr(g, R(tx - 0.015), wy - R(ht * 0.6), R(0.03), R(0.06), R(0.015));
        g.fill();
      }
      // 아치 창
      for (const x of [0.32, 0.5, 0.68]) {
        g.fillStyle = '#6a5040';
        rr(g, R(x - 0.025), R(0.75), R(0.05), R(0.09), R(0.025));
        g.fill();
        g.fillStyle = 'rgba(255,220,140,.5)';
        rr(g, R(x - 0.017), R(0.765), R(0.034), R(0.07), R(0.017));
        g.fill();
      }
    } else {
      g.fillStyle = lin(g, 0, 0, 0, h, [0, '#c99a6a'], [0.5, '#e2bd8c'], [1, '#d3a676']);
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(120,80,40,.28)';
      g.lineWidth = 1.2;
      for (let r = 0; r < 34; r++) {
        const y = R(r * 0.045);
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(w, y);
        g.stroke();
        for (let k = 0; k < 8; k++) {
          const x = R(k * 0.14 + (r % 2) * 0.07 + hsh(r * 9 + k) * 0.01);
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x, y + R(0.045));
          g.stroke();
        }
      }
      // 아치 창과 햇살
      for (const x of [0.22, 0.78]) {
        g.fillStyle = '#7a5434';
        rr(g, R(x - 0.07), R(0.42), R(0.14), R(0.24), R(0.07));
        g.fill();
        g.fillStyle = lin(g, 0, R(0.42), 0, R(0.66), [0, '#9fdcff'], [1, '#e8f6ff']);
        rr(g, R(x - 0.055), R(0.435), R(0.11), R(0.215), R(0.055));
        g.fill();
        g.strokeStyle = '#7a5434';
        g.lineWidth = R(0.008);
        g.beginPath();
        g.moveTo(R(x), R(0.435));
        g.lineTo(R(x), R(0.65));
        g.moveTo(R(x - 0.055), R(0.54));
        g.lineTo(R(x + 0.055), R(0.54));
        g.stroke();
        g.fillStyle = lin(g, R(x), R(0.5), R(x + 0.1), R(1.1), [0, 'rgba(255,245,200,.35)'], [1, 'rgba(255,245,200,0)']);
        g.beginPath();
        g.moveTo(R(x - 0.05), R(0.5));
        g.lineTo(R(x + 0.05), R(0.5));
        g.lineTo(R(x + 0.2), R(1.18));
        g.lineTo(R(x - 0.02), R(1.18));
        g.closePath();
        g.fill();
      }
      // 걸개 천
      for (const x of [0.5]) {
        g.fillStyle = '#c0392b';
        g.beginPath();
        g.moveTo(R(x - 0.07), R(0.4));
        g.lineTo(R(x + 0.07), R(0.4));
        g.lineTo(R(x + 0.07), R(0.66));
        g.lineTo(R(x), R(0.7));
        g.lineTo(R(x - 0.07), R(0.66));
        g.closePath();
        g.fill();
        g.strokeStyle = '#f4c542';
        g.lineWidth = R(0.006);
        g.stroke();
        g.fillStyle = '#f4c542';
        starPath(g, R(x), R(0.53), R(0.035));
        g.fill();
      }
    }
  });
  BG.set(key, c);
  return c;
}

interface V { w: number; h: number; X: (x: number) => number; Y: (y: number) => number; R: (r: number) => number; t: number; ch: number; pb: number; z: number }
/** 몸이 서는 화면 높이: 윗면 가운데 */
const baseY = (v: V, y: number) => v.Y(y) - v.R(DEP * 0.5);

const GRASS = ['#9be06f', '#74c452'], DIRT = ['#c99a62', '#9a6a3c'];
function solidFace(ctx: C2, v: V, x0: number, x1: number, y0: number, y1: number, top: [string, string], front: [string, string], edge = 'rgba(255,255,255,.35)') {
  const X0 = v.X(x0), X1 = v.X(x1), T = v.Y(y1), B = Math.min(v.Y(y0), v.pb + 2), D = v.R(DEP);
  ctx.fillStyle = lin(ctx, 0, T, 0, B, [0, front[0]], [1, front[1]]);
  ctx.fillRect(X0, T, X1 - X0, B - T);
  ctx.fillStyle = lin(ctx, 0, T - D, 0, T, [0, top[0]], [1, top[1]]);
  ctx.fillRect(X0, T - D, X1 - X0, D);
  ctx.fillStyle = edge;
  ctx.fillRect(X0, T - 1, X1 - X0, 2);
  ctx.fillStyle = 'rgba(0,0,0,.12)';
  ctx.fillRect(X0, T + 1, X1 - X0, v.R(0.008));
}
function bricks(ctx: C2, v: V, x0: number, x1: number, T: number, B: number, col: string, bw = 0.07, bh = 0.035) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(v.X(x0), T, v.X(x1) - v.X(x0), B - T);
  ctx.clip();
  ctx.strokeStyle = col;
  ctx.lineWidth = 1;
  for (let r = 0; T + v.R(r * bh) < B; r++) {
    const y = T + v.R(r * bh);
    ctx.beginPath();
    ctx.moveTo(v.X(x0), y);
    ctx.lineTo(v.X(x1), y);
    ctx.stroke();
    for (let x = x0 - (r % 2) * bw * 0.5; x < x1; x += bw) {
      ctx.beginPath();
      ctx.moveTo(v.X(x), y);
      ctx.lineTo(v.X(x), y + v.R(bh));
      ctx.stroke();
    }
  }
  ctx.restore();
}
function treeTrunk(ctx: C2, v: V, q: Solid) {
  // 가지 아래 나무 몸통 (가지 왼쪽 끝 쪽에서 땅까지)
  const tx = v.X(q.x0 + 0.03), top = v.Y(q.y1) - v.R(0.01), bot = v.Y(0) - v.R(DEP * 0.5), wd = v.R(0.032);
  ctx.fillStyle = lin(ctx, tx - wd, 0, tx + wd, 0, [0, '#8a5a34'], [0.5, '#b07a48'], [1, '#7a4c2a']);
  ctx.beginPath();
  ctx.moveTo(tx - wd * 0.7, top);
  ctx.quadraticCurveTo(tx - wd * 0.9, (top + bot) / 2, tx - wd * 1.3, bot);
  ctx.lineTo(tx + wd * 1.3, bot);
  ctx.quadraticCurveTo(tx + wd * 0.9, (top + bot) / 2, tx + wd * 0.7, top);
  ctx.closePath();
  ctx.fill();
  stroke(ctx, OUT, 1.6);
  ctx.strokeStyle = 'rgba(70,40,20,.35)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 4; k++) {
    const y = top + (bot - top) * (0.2 + k * 0.2);
    ctx.beginPath();
    ctx.moveTo(tx - wd * 0.4, y);
    ctx.quadraticCurveTo(tx, y + 4, tx + wd * 0.3, y - 2);
    ctx.stroke();
  }
}
function leafBlob(ctx: C2, x: number, y: number, r: number, t: number, k: number, dark = '#5aae48', light = '#8ad66a') {
  const sw = Math.sin(t * 0.03 + k) * r * 0.04;
  ctx.fillStyle = dark;
  ell(ctx, x + sw, y, r, r * 0.85);
  ctx.fill();
  ctx.fillStyle = light;
  ell(ctx, x + sw - r * 0.25, y - r * 0.25, r * 0.6, r * 0.45);
  ctx.fill();
}

/** 땅속 단면 (디오라마의 아래층): 흙 띠 · 뿌리 · 조약돌 · 지렁이 · 묻힌 뼈 */
function underground(ctx: C2, v: V, q: Solid, t: number) {
  const R = v.R, T = v.Y(q.y1), B = v.pb, X0 = v.X(q.x0), X1 = v.X(q.x1);
  ctx.save();
  ctx.beginPath();
  ctx.rect(X0, T + 2, X1 - X0, B - T);
  ctx.clip();
  ctx.fillStyle = 'rgba(120,70,30,.35)';
  ctx.fillRect(X0, T + R(0.07), X1 - X0, R(0.012));
  ctx.fillStyle = 'rgba(70,40,15,.25)';
  ctx.fillRect(X0, T + R(0.13), X1 - X0, B);
  for (let k = 0; k < (q.x1 - q.x0) * 26; k++) {
    const x = v.X(q.x0 + hsh(k + 11 + q.id) * (q.x1 - q.x0)), y = T + R(0.025 + hsh(k + 5) * 0.17), r = R(0.006 + hsh(k + 2) * 0.01);
    ctx.fillStyle = k % 3 ? 'rgba(90,55,25,.4)' : 'rgba(230,210,180,.55)';
    ell(ctx, x, y, r, r * 0.7);
    ctx.fill();
  }
  // 뿌리
  ctx.strokeStyle = 'rgba(110,70,35,.55)';
  ctx.lineWidth = 2;
  for (let k = 0; k < (q.x1 - q.x0) * 4; k++) {
    const x = v.X(q.x0 + hsh(k * 7 + q.id) * (q.x1 - q.x0));
    ctx.beginPath();
    ctx.moveTo(x, T + 2);
    ctx.quadraticCurveTo(x + R(0.02), T + R(0.05), x - R(0.01), T + R(0.09));
    ctx.stroke();
  }
  // 꼼지락 지렁이
  if (q.x1 - q.x0 > 0.25) {
    const wx = v.X(q.x0 + (q.x1 - q.x0) * 0.62) + Math.sin(t * 0.01) * R(0.02), wy = T + R(0.11);
    ctx.strokeStyle = '#ff9aa8';
    ctx.lineWidth = R(0.009);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const x = wx + k * R(0.007), y = wy + Math.sin(t * 0.12 + k * 0.9) * R(0.005);
      if (k) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawSolidsBack(ctx: C2, s: WSState, v: V) {
  const W = s.W, t = v.t, ch = v.ch;
  // 나무(가지가 있는 판): 몸통과 잎 덩어리를 먼저
  for (const q of W.s) {
    if (q.k !== 'twig' || ch !== 0 && ch !== 1) continue;
    if (q.y1 > 0.1) treeTrunk(ctx, v, q);
    const cx = v.X((q.x0 + q.x1) / 2), cy = v.Y(q.y1) - v.R(0.13), r = v.R((q.x1 - q.x0) * 0.42);
    for (let k = 0; k < 5; k++) leafBlob(ctx, cx + (k - 2) * r * 0.45, cy - Math.abs(k - 2) * -r * 0.12 - r * 0.25, r * (0.55 + 0.1 * (k % 2)), t, k + q.id * 3);
  }
}
function drawSolids(ctx: C2, s: WSState, v: V) {
  const W = s.W, t = v.t, ch = v.ch, R = v.R;
  for (const q of W.s) {
    const X0 = v.X(q.x0), X1 = v.X(q.x1), T = v.Y(q.y1), D = R(DEP);
    if (q.k === 'water') continue;
    if (q.k === 'ground') {
      if (ch === 0) {
        solidFace(ctx, v, q.x0, q.x1, q.y0, q.y1, [GRASS[0], GRASS[1]], [DIRT[0], DIRT[1]]);
        ctx.fillStyle = 'rgba(255,255,255,.22)';
        for (let k = 0; k < (q.x1 - q.x0) * 30; k++) {
          const x = q.x0 + (k + 0.5) / 30, hx = hsh(k * 3 + q.id);
          ctx.fillRect(v.X(x), T - D * (0.2 + hx * 0.7), R(0.012), 1.5);
        }
        // 앞 가장자리 풀술
        ctx.fillStyle = '#6cbf4a';
        for (let x = q.x0; x < q.x1; x += 0.018) {
          const sw = Math.sin(t * 0.05 + x * 40) * R(0.003);
          ctx.beginPath();
          ctx.moveTo(v.X(x), T + 1);
          ctx.lineTo(v.X(x + 0.008) + sw, T + R(0.012 + hsh(x * 99) * 0.01));
          ctx.lineTo(v.X(x + 0.016), T + 1);
          ctx.fill();
        }
        underground(ctx, v, q, t);
      } else if (ch === 1) {
        solidFace(ctx, v, q.x0, q.x1, q.y0, q.y1, ['#e8dcc4', '#d4c4a4'], ['#c8b08a', '#9e8460']);
        bricks(ctx, v, q.x0, q.x1, T + 2, Math.min(v.Y(q.y0), v.pb), 'rgba(110,80,50,.35)', 0.09, 0.03);
        ctx.strokeStyle = 'rgba(140,110,80,.3)';
        ctx.lineWidth = 1;
        for (let x = Math.ceil(q.x0 / 0.06) * 0.06; x < q.x1; x += 0.06) {
          ctx.beginPath();
          ctx.moveTo(v.X(x), T - D);
          ctx.lineTo(v.X(x - 0.01), T);
          ctx.stroke();
        }
      } else {
        solidFace(ctx, v, q.x0, q.x1, q.y0, q.y1, ['#e9d7b4', '#d8c39c'], ['#9a7454', '#6e4e34']);
        // 붉은 융단
        ctx.fillStyle = lin(ctx, 0, T - D * 0.8, 0, T - D * 0.2, [0, '#d0453a'], [1, '#a8302a']);
        ctx.fillRect(X0, T - D * 0.78, X1 - X0, D * 0.56);
        ctx.fillStyle = '#f2c44c';
        ctx.fillRect(X0, T - D * 0.8, X1 - X0, 1.5);
        ctx.fillRect(X0, T - D * 0.24, X1 - X0, 1.5);
        bricks(ctx, v, q.x0, q.x1, T + 2, Math.min(v.Y(q.y0), v.pb), 'rgba(50,30,15,.35)', 0.1, 0.03);
      }
    } else if (q.k === 'hedge') {
      solidFace(ctx, v, q.x0, q.x1, q.y0, q.y1, ['#8fd66a', '#6dbd4e'], ['#5fae46', '#3f8a34'], 'rgba(220,255,200,.45)');
      const B2 = Math.min(v.Y(q.y0), v.pb);
      ctx.save();
      ctx.beginPath();
      ctx.rect(X0, T - D * 1.6, X1 - X0, B2 - T + D * 1.6);
      ctx.clip();
      for (let k = 0; k < (q.x1 - q.x0) * 40; k++) {
        const x = q.x0 + hsh(k * 3 + q.id) * (q.x1 - q.x0), y = q.y1 - 0.015 - hsh(k + q.id * 7) * (q.y1 - Math.max(q.y0, -0.18) - 0.02);
        leafBlob(ctx, v.X(x), v.Y(y), R(0.016 + hsh(k + 1) * 0.01), t, k, k % 2 ? '#4a9a3a' : '#57a845', '#79c95c');
      }
      for (let k = 0; k < (q.x1 - q.x0) * 10; k++) {
        const x = v.X(q.x0 + hsh(k + 77) * (q.x1 - q.x0)), y = T + R(0.02 + hsh(k + 33) * 0.18);
        ctx.fillStyle = ['#ffffff', '#ff9ac0', '#ffe14a'][k % 3];
        ell(ctx, x, y, R(0.005), R(0.005));
        ctx.fill();
      }
      ctx.restore();
      for (let x = q.x0 + 0.015; x < q.x1; x += 0.035) leafBlob(ctx, v.X(x), T - D * 0.45, R(0.026), t, x * 50, '#6dbd4e', '#a6e67a');
      ctx.strokeStyle = 'rgba(40,80,30,.6)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(X0 + 0.5, T - D, X1 - X0 - 1, B2 - T + D);
    } else if (q.k === 'stone' || q.k === 'wall' || q.k === 'ceil') {
      const top: [string, string] = ch === 2 ? ['#e6cfa8', '#d2b68a'] : ['#e9dcc2', '#d4c3a1'], fr: [string, string] = ch === 2 ? ['#b48a62', '#8c6644'] : ['#cdb48c', '#a88d66'];
      if (q.k === 'ceil') {
        ctx.fillStyle = lin(ctx, 0, v.Y(q.y1), 0, v.Y(q.y0), [0, '#6e4a2c'], [1, '#8a5e38']);
        ctx.fillRect(X0, v.Y(q.y1), X1 - X0, v.Y(q.y0) - v.Y(q.y1));
        for (let x = q.x0 + 0.05; x < q.x1; x += 0.16) {
          ctx.fillStyle = '#5a3a20';
          ctx.fillRect(v.X(x), v.Y(q.y1), R(0.03), v.Y(q.y0) - v.Y(q.y1) + R(0.012));
        }
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        ctx.fillRect(X0, v.Y(q.y0), X1 - X0, R(0.01));
        continue;
      }
      solidFace(ctx, v, q.x0, q.x1, q.y0, q.y1, top, fr);
      bricks(ctx, v, q.x0, q.x1, T + 2, Math.min(v.Y(q.y0), v.pb), 'rgba(90,60,35,.3)', 0.08, 0.035);
      if (q.k === 'wall' && q.y0 > 0.1) {
        ctx.fillStyle = 'rgba(0,0,0,.18)';
        ctx.fillRect(X0, v.Y(q.y0), X1 - X0, R(0.012));
      }
    } else if (q.k === 'twig') {
      if (!q.on) {
        const a = clamp((s.W.t - q.brokeT) / 30, 0, 1);
        ctx.fillStyle = '#9a6a3c';
        ctx.save();
        ctx.translate(X0, T);
        ctx.rotate(0.5 * a);
        rr(ctx, 0, -R(0.008), R(0.05), R(0.016), R(0.006));
        ctx.fill();
        stroke(ctx, OUT, 1.4);
        ctx.restore();
        continue;
      }
      const bend = clamp(q.load / Math.max(1, q.cap), 0, 1) * R(0.01);
      ctx.fillStyle = lin(ctx, 0, T - R(0.012), 0, T + R(0.01), [0, '#b98450'], [1, '#7a4c2a']);
      ctx.beginPath();
      ctx.moveTo(X0, T - R(0.012));
      ctx.quadraticCurveTo((X0 + X1) / 2, T - R(0.012) + bend, X1, T - R(0.004) + bend * 0.5);
      ctx.lineTo(X1, T + R(0.004) + bend * 0.5);
      ctx.quadraticCurveTo((X0 + X1) / 2, T + R(0.008) + bend, X0, T + R(0.01));
      ctx.closePath();
      ctx.fill();
      stroke(ctx, OUT, 1.4);
      for (let k = 0; k < 3; k++) leafBlob(ctx, X1 - R(0.01) - k * R(0.03), T - R(0.02) + k * 2, R(0.014), t, k + q.id, '#5aae48', '#8ad66a');
    } else if (q.k === 'shelf' || q.k === 'trap') {
      if (!q.on) {
        const a = clamp((s.W.t - q.brokeT) / 24, 0, 1);
        ctx.fillStyle = '#a8763e';
        for (const sd of [0, 1]) {
          ctx.save();
          ctx.translate(sd ? X1 : X0, T);
          ctx.rotate((sd ? -1 : 1) * 1.1 * a);
          rr(ctx, sd ? -R(0.03) : 0, -R(0.007), R(0.03), R(0.014), 2);
          ctx.fill();
          stroke(ctx, OUT, 1.2);
          ctx.restore();
        }
        continue;
      }
      const sag = clamp(q.load / Math.max(1, q.cap), 0, 1) * R(0.006);
      ctx.fillStyle = '#7a4c2a';
      for (const x of [X0 + R(0.02), X1 - R(0.02)]) {
        ctx.beginPath();
        ctx.moveTo(x - R(0.01), T);
        ctx.lineTo(x + R(0.01), T);
        ctx.lineTo(x, T + R(0.04));
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = lin(ctx, 0, T - D * 0.6, 0, T + R(0.012), [0, '#e0ad6a'], [1, '#a8763e']);
      ctx.beginPath();
      ctx.moveTo(X0, T - D * 0.6);
      ctx.lineTo(X1, T - D * 0.6);
      ctx.lineTo(X1, T + R(0.012));
      ctx.quadraticCurveTo((X0 + X1) / 2, T + R(0.012) + sag, X0, T + R(0.012));
      ctx.closePath();
      ctx.fill();
      stroke(ctx, OUT, 1.4);
    } else if (q.k === 'plank') {
      if (!q.on) {
        const a = clamp((s.W.t - q.brokeT) / 26, 0, 1);
        for (const sd of [0, 1]) {
          ctx.save();
          ctx.translate(sd ? X1 : X0, T);
          ctx.rotate((sd ? -1 : 1) * 1.25 * a);
          ctx.fillStyle = '#b8864e';
          rr(ctx, sd ? -R(0.07) : 0, -R(0.008), R(0.07), R(0.018), 2);
          ctx.fill();
          stroke(ctx, OUT, 1.2);
          ctx.restore();
        }
        continue;
      }
      const sag = clamp(q.load / Math.max(1, q.cap), 0, 1.2) * R(0.012);
      ctx.fillStyle = '#d6a466';
      ctx.beginPath();
      ctx.moveTo(X0, T - D);
      ctx.quadraticCurveTo((X0 + X1) / 2, T - D + sag, X1, T - D);
      ctx.lineTo(X1, T + R(0.016));
      ctx.quadraticCurveTo((X0 + X1) / 2, T + R(0.016) + sag, X0, T + R(0.016));
      ctx.closePath();
      ctx.fill();
      stroke(ctx, OUT, 1.5);
      ctx.strokeStyle = 'rgba(110,70,30,.5)';
      ctx.lineWidth = 1;
      for (let x = q.x0 + 0.03; x < q.x1; x += 0.03) {
        const k = (x - q.x0) / (q.x1 - q.x0), dy = 4 * k * (1 - k) * sag;
        ctx.beginPath();
        ctx.moveTo(v.X(x), T - D + dy);
        ctx.lineTo(v.X(x), T + R(0.016) + dy);
        ctx.stroke();
      }
      // 밧줄 난간
      ctx.strokeStyle = '#8a6a3a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(X0, T - D - R(0.05));
      ctx.quadraticCurveTo((X0 + X1) / 2, T - D - R(0.05) + sag * 2 + R(0.02), X1, T - D - R(0.05));
      ctx.stroke();
      for (const x of [X0, X1]) {
        ctx.fillStyle = '#7a4c2a';
        rr(ctx, x - R(0.008), T - D - R(0.06), R(0.016), R(0.08), 2);
        ctx.fill();
      }
      if (W.cs === 'creak' && Math.sin(t * 0.4) > 0) txt(ctx, '삐걱', (X0 + X1) / 2, T - D - R(0.09), R(0.032), '#fff3d0', 900);
    } else if (q.k === 'ped') {
      const cx = (X0 + X1) / 2, pw = X1 - X0;
      ctx.fillStyle = lin(ctx, X0, 0, X1, 0, [0, '#f4efe6'], [0.5, '#ffffff'], [1, '#d8cfc2']);
      rr(ctx, X0 + pw * 0.12, T - D * 0.6, pw * 0.76, v.Y(q.y0) - T + D * 0.6, 3);
      ctx.fill();
      stroke(ctx, OUT, 1.4);
      ctx.fillStyle = '#f2c44c';
      rr(ctx, X0, T - D * 0.85, pw, R(0.014), 3);
      ctx.fill();
      stroke(ctx, OUT, 1.2);
      ctx.fillStyle = '#c0392b';
      ell(ctx, cx, T - D * 0.85, pw * 0.36, R(0.008));
      ctx.fill();
    } else if (q.k === 'plate' && q.pair >= 0) {
      // 양팔 저울 접시 (짝 발판과 같은 무게면 문이 열린다)
      const o = W.s[q.pair], cx = (X0 + X1) / 2, eq = pressed(W, q), bt = v.Y(0.45);
      if (q.id < o.id) {
        const mx = (cx + (v.X(o.x0) + v.X(o.x1)) / 2) / 2, tilt = clamp((o.load - q.load) * 0.02, -0.18, 0.18);
        ctx.fillStyle = lin(ctx, mx - R(0.012), 0, mx + R(0.012), 0, [0, '#a8763e'], [1, '#6a4422']);
        ctx.fillRect(mx - R(0.01), bt, R(0.02), v.Y(0) - bt);
        ctx.save();
        ctx.translate(mx, bt);
        ctx.rotate(tilt);
        ctx.fillStyle = '#c8962c';
        rr(ctx, -(mx - cx) - R(0.01), -R(0.008), (mx - cx) * 2 + R(0.02), R(0.016), R(0.008));
        ctx.fill();
        stroke(ctx, OUT, 1.4);
        ctx.restore();
        ctx.fillStyle = eq ? '#5fd46a' : '#ffffff';
        ell(ctx, mx, bt - R(0.035), R(0.03), R(0.03));
        ctx.fill();
        stroke(ctx, OUT, 1.6);
        txt(ctx, eq ? '=' : q.load > o.load ? '>' : '<', mx, bt - R(0.033), R(0.045), eq ? '#ffffff' : '#c0392b', 900, 'center', '');
        txt(ctx, eq ? '열림!' : '같으면 열림', mx, bt - R(0.082), R(0.025), eq ? '#2a7a1a' : '#5a3a1a', 900, 'center', 'rgba(255,250,230,.95)');
      }
      const oc = (v.X(o.x0) + v.X(o.x1)) / 2, my = v.Y(0.45) + (q.id < o.id ? -1 : 1) * 0;
      ctx.strokeStyle = '#8a7040';
      ctx.lineWidth = 1.5;
      for (const sx of [X0 + R(0.01), X1 - R(0.01)]) {
        ctx.beginPath();
        ctx.moveTo(sx, T - D * 0.5);
        ctx.lineTo((cx + (cx + oc) / 2) / 2 + (cx < oc ? -1 : 1) * R(0.0), my);
        ctx.stroke();
      }
      ctx.fillStyle = lin(ctx, X0, 0, X1, 0, [0, '#f6d77a'], [0.5, '#fff1b0'], [1, '#c8962c']);
      ctx.beginPath();
      ctx.moveTo(X0 - R(0.01), T - D * 0.6);
      ctx.lineTo(X1 + R(0.01), T - D * 0.6);
      ctx.quadraticCurveTo(cx, T + R(0.03), X0 - R(0.01), T - D * 0.6);
      ctx.fill();
      stroke(ctx, OUT, 1.5);
      txt(ctx, String(q.load), cx, T + R(0.045), R(0.04), eq ? '#c8ffb0' : '#fff2c4', 900);
    } else if (q.k === 'plate') {
      const p = q.load >= q.need, cx = (X0 + X1) / 2, sink = p ? R(0.006) : 0;
      ctx.fillStyle = p ? lin(ctx, X0, 0, X1, 0, [0, '#9be06f'], [1, '#4fae3e']) : lin(ctx, X0, 0, X1, 0, [0, '#f6d77a'], [1, '#c8962c']);
      rr(ctx, X0, T - D * 0.7 + sink, X1 - X0, D * 0.7, 4);
      ctx.fill();
      stroke(ctx, OUT, 1.4);
      // 말로: 'N 실으면 열림 · 지금 M' (숫자만 있는 'M/N'은 쓰지 않는다)
      const l1 = p ? '열림!' : `${q.need} 실으면 열림`, l2 = `지금 ${Math.min(q.load, 99)}`;
      ctx.font = `900 ${R(0.025)}px system-ui, sans-serif`;
      const sw = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width) + R(0.03), sy = T + R(0.022);
      ctx.fillStyle = p ? '#dff8cf' : '#fff2d2';
      rr(ctx, cx - sw / 2, sy, sw, R(0.062), R(0.012));
      ctx.fill();
      stroke(ctx, p ? '#3a8a2a' : '#7a4c2a', 1.3);
      txt(ctx, l1, cx, sy + R(0.017), R(0.025), p ? '#2a7a1a' : '#5a3a1a', 900, 'center', '');
      txt(ctx, l2, cx, sy + R(0.045), R(0.025), p ? '#2a7a1a' : '#c0392b', 900, 'center', '');
    } else if (q.k === 'gate' && ch === 0) {
      const top = v.Y(q.y1), bot = v.Y(q.y0);
      if (bot - top > 2) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(X0 - R(0.02), top, X1 - X0 + R(0.04), bot - top);
        ctx.clip();
        for (let k = 0; k < 3; k++) {
          const x = X0 + (X1 - X0) * (k / 3), pw = (X1 - X0) / 3 - 1;
          ctx.fillStyle = lin(ctx, x, 0, x + pw, 0, [0, '#f0d6a8'], [1, '#c8a070']);
          ctx.beginPath();
          ctx.moveTo(x, bot);
          ctx.lineTo(x, top + R(0.015));
          ctx.lineTo(x + pw / 2, top);
          ctx.lineTo(x + pw, top + R(0.015));
          ctx.lineTo(x + pw, bot);
          ctx.closePath();
          ctx.fill();
          stroke(ctx, OUT, 1.2);
        }
        ctx.fillStyle = '#a8763e';
        ctx.fillRect(X0 - R(0.008), bot - (bot - top) * 0.75, X1 - X0 + R(0.016), R(0.012));
        ctx.fillRect(X0 - R(0.008), bot - (bot - top) * 0.3, X1 - X0 + R(0.016), R(0.012));
        ctx.restore();
      }
    } else if (q.k === 'gate') {
      const top = v.Y(q.y1), bot = v.Y(q.y0);
      if (bot - top > 2) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(X0 - R(0.02), top, X1 - X0 + R(0.04), bot - top);
        ctx.clip();
        ctx.strokeStyle = '#4a4a55';
        ctx.lineWidth = R(0.008);
        for (let k = 0; k < 3; k++) {
          const x = X0 + (X1 - X0) * (k + 0.5) / 3;
          ctx.beginPath();
          ctx.moveTo(x, top);
          ctx.lineTo(x, bot);
          ctx.stroke();
        }
        ctx.lineWidth = R(0.006);
        for (let y = bot - R(0.03); y > top; y -= R(0.05)) {
          ctx.beginPath();
          ctx.moveTo(X0 - R(0.01), y);
          ctx.lineTo(X1 + R(0.01), y);
          ctx.stroke();
        }
        ctx.fillStyle = '#4a4a55';
        for (let k = 0; k < 3; k++) {
          const x = X0 + (X1 - X0) * (k + 0.5) / 3;
          ctx.beginPath();
          ctx.moveTo(x - R(0.006), bot - R(0.01));
          ctx.lineTo(x, bot + R(0.008));
          ctx.lineTo(x + R(0.006), bot - R(0.01));
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }
}
/** 물 (구덩이 · 해자): 뒤(깊은 색)와 앞(반투명 물낯)을 따로 */
function drawWater(ctx: C2, s: WSState, v: V, front: boolean) {
  const t = v.t, R = v.R;
  for (const q of s.W.s) {
    if (q.k !== 'water') continue;
    const X0 = v.X(q.x0), X1 = v.X(q.x1), top = v.Y(-0.035), bot = v.pb + 2;
    if (!front) {
      ctx.fillStyle = lin(ctx, 0, top, 0, bot, [0, '#5cc0f0'], [1, '#1f6fa8']);
      ctx.fillRect(X0, top, X1 - X0, bot - top);
      ctx.fillStyle = 'rgba(40,60,40,.35)';
      ctx.fillRect(X0, v.Y(0) - R(DEP), X1 - X0, top - v.Y(0) + R(DEP));
    } else {
      ctx.fillStyle = 'rgba(80,180,240,.42)';
      ctx.fillRect(X0, top, X1 - X0, bot - top);
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let x = X0; x <= X1; x += 3) {
        const y = top + Math.sin(x * 0.12 + t * 0.08) * 1.6;
        if (x === X0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      for (let k = 0; k < 5; k++) {
        const x = X0 + (X1 - X0) * hsh(k + q.id), y = top + R(0.03 + hsh(k + 4) * 0.12), l = R(0.025);
        ctx.beginPath();
        ctx.moveTo(x - l + Math.sin(t * 0.03 + k) * 3, y);
        ctx.lineTo(x + l + Math.sin(t * 0.03 + k) * 3, y);
        ctx.stroke();
      }
      if (v.ch === 0) {
        for (let k = 0; k < 2; k++) {
          const x = X0 + (X1 - X0) * (0.2 + k * 0.6), y = top + R(0.006);
          ctx.fillStyle = '#5fb44a';
          ell(ctx, x + Math.sin(t * 0.02 + k) * 2, y, R(0.024), R(0.008));
          ctx.fill();
          ctx.fillStyle = '#ff8fb0';
          ell(ctx, x + Math.sin(t * 0.02 + k) * 2, y - R(0.006), R(0.008), R(0.006));
          ctx.fill();
        }
      }
    }
  }
}

/** 몸 아래 땅 높이 (그림자) */
function floorUnder(W: World, b: Body): number {
  let best = -0.04;
  for (const q of W.s) if (q.on && q.k !== 'gate' && b.x > q.x0 && b.x < q.x1 && q.y1 <= b.y + 0.002 && q.y1 > best) best = q.y1;
  for (const o of W.b) if (o !== b && live(o) && o.k !== 'bridge' && Math.abs(o.x - b.x) < o.hw && o.y + o.h <= b.y + 0.002 && o.y + o.h > best) best = o.y + o.h;
  if (W.saw) {
    const pt = plankTop(W.saw, b.x);
    if (pt !== null && pt <= b.y + 0.002 && pt > best) best = pt;
  }
  return best;
}
function drawShadows(ctx: C2, s: WSState, v: V) {
  const W = s.W, R = v.R;
  for (const b of W.b) {
    if (!live(b) || b.k === 'bridge') continue;
    const f = floorUnder(W, b), hgt = b.y - f, k = clamp(1 - hgt * 1.4, 0.25, 1);
    ctx.fillStyle = `rgba(40,30,20,${0.26 * k})`;
    ell(ctx, v.X(b.x), baseY(v, f) + 1, R(b.hw * (0.95 * k + 0.1)), R(0.012 * k + 0.003));
    ctx.fill();
    // 주머니가 차 있으면: 떠 있는 것이 떨어질 자리를 점선으로
    if (W.pouch.length && hgt > 0.08 && b.tap && b.w === 0 && b.k !== 'cat') {
      ctx.save();
      ctx.setLineDash([R(0.01), R(0.012)]);
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(v.X(b.x), baseY(v, b.y));
      ctx.lineTo(v.X(b.x), baseY(v, f) - R(0.01));
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ── 색 섞기: 가벼움(파스텔) · 무거움(쇳빛) ──
const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
function mix(a: string, b: string, t: number) {
  if (t <= 0) return a;
  const A = hex(a), B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * clamp(t, 0, 1))).join(',')})`;
}
let TONE = { light: 0, heavy: 0 };
const tc = (c: string) => (TONE.light > 0 ? mix(c, '#fdf6ff', TONE.light) : TONE.heavy > 0 ? mix(c, '#4c5666', TONE.heavy) : c);

function rockPath(ctx: C2, bw: number, bh: number, seed: number) {
  ctx.beginPath();
  const n = 9;
  for (let k = 0; k <= n; k++) {
    const a = Math.PI + (k / n) * Math.PI, j = 0.86 + hsh(seed + k) * 0.16;
    const x = Math.cos(a) * bw * 0.5 * j, y = Math.sin(a) * bh * j;
    if (k) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.lineTo(bw * 0.5, 0);
  ctx.lineTo(-bw * 0.5, 0);
  ctx.closePath();
}
function drawThing(ctx: C2, k: Kind, bw: number, bh: number, t: number, id: number, st: number) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const lw = Math.max(1.4, bw * 0.03);
  switch (k) {
    case 'rock': {
      rockPath(ctx, bw, bh, id * 13);
      ctx.fillStyle = lin(ctx, 0, -bh, 0, 0, [0, tc('#c9c4ba')], [1, tc('#8f877c')]);
      ctx.fill();
      stroke(ctx, OUT, lw * 1.2);
      ctx.fillStyle = tc('#7fbf5a');
      ell(ctx, -bw * 0.12, -bh * 0.9, bw * 0.2, bh * 0.1, -0.2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(70,60,50,.45)';
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      ctx.moveTo(bw * 0.1, -bh * 0.7);
      ctx.lineTo(bw * 0.02, -bh * 0.45);
      ctx.lineTo(bw * 0.14, -bh * 0.3);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ell(ctx, -bw * 0.22, -bh * 0.6, bw * 0.07, bh * 0.12, -0.5);
      ctx.fill();
      break;
    }
    case 'feather': {
      const L = bw * 1.35, H = bh * 2.1;
      ctx.save();
      ctx.translate(0, -bh * 0.5);
      ctx.rotate(-0.12);
      ctx.fillStyle = lin(ctx, -L / 2, 0, L / 2, 0, [0, tc('#ffd6ea')], [0.6, tc('#ffffff')], [1, tc('#bfe6ff')]);
      ctx.beginPath();
      ctx.moveTo(-L * 0.5, 0);
      ctx.quadraticCurveTo(-L * 0.1, -H * 0.75, L * 0.5, -H * 0.1);
      ctx.quadraticCurveTo(L * 0.05, H * 0.55, -L * 0.5, 0);
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.strokeStyle = tc('#c09060');
      ctx.lineWidth = lw * 1.1;
      ctx.beginPath();
      ctx.moveTo(-L * 0.58, H * 0.06);
      ctx.quadraticCurveTo(0, -H * 0.12, L * 0.5, -H * 0.1);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(200,170,210,.6)';
      ctx.lineWidth = 1;
      for (let j = 1; j < 6; j++) {
        const x = -L * 0.4 + j * L * 0.14;
        ctx.beginPath();
        ctx.moveTo(x, -H * 0.03);
        ctx.lineTo(x + L * 0.05, -H * 0.3);
        ctx.moveTo(x, -H * 0.03);
        ctx.lineTo(x + L * 0.06, H * 0.22);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'apple': {
      const r = bw * 0.5;
      ctx.fillStyle = radg(ctx, -r * 0.3, -bh * 0.6, r * 0.1, r * 1.2, [0, tc('#ff8a7a')], [1, tc('#d8282a')]);
      ell(ctx, 0, -bh * 0.48, r, bh * 0.48);
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.strokeStyle = '#6a3a1a';
      ctx.lineWidth = lw * 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -bh * 0.92);
      ctx.lineTo(r * 0.12, -bh * 1.12);
      ctx.stroke();
      ctx.fillStyle = tc('#5fb44a');
      ell(ctx, r * 0.35, -bh * 1.05, r * 0.3, r * 0.14, -0.4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ell(ctx, -r * 0.4, -bh * 0.66, r * 0.16, r * 0.24, 0.3);
      ctx.fill();
      break;
    }
    case 'crate':
    case 'sack': {
      if (k === 'sack') {
        ctx.fillStyle = lin(ctx, 0, -bh, 0, 0, [0, tc('#f4e4c4')], [1, tc('#d4bc8c')]);
        ctx.beginPath();
        ctx.moveTo(-bw * 0.42, 0);
        ctx.quadraticCurveTo(-bw * 0.55, -bh * 0.6, -bw * 0.2, -bh * 0.92);
        ctx.lineTo(bw * 0.2, -bh * 0.92);
        ctx.quadraticCurveTo(bw * 0.55, -bh * 0.6, bw * 0.42, 0);
        ctx.closePath();
        ctx.fill();
        stroke(ctx, OUT, lw);
        break;
      }
      ctx.fillStyle = lin(ctx, 0, -bh, 0, 0, [0, tc('#e8b673')], [1, tc('#b8813f')]);
      rr(ctx, -bw / 2, -bh, bw, bh, bw * 0.06);
      ctx.fill();
      stroke(ctx, OUT, lw * 1.1);
      ctx.strokeStyle = tc('#8a5a28');
      ctx.lineWidth = lw * 1.4;
      ctx.beginPath();
      ctx.moveTo(-bw * 0.4, -bh * 0.1);
      ctx.lineTo(bw * 0.4, -bh * 0.9);
      ctx.stroke();
      rr(ctx, -bw * 0.42, -bh * 0.92, bw * 0.84, bh * 0.84, 2);
      ctx.lineWidth = lw;
      ctx.stroke();
      ctx.fillStyle = '#5a4a3a';
      for (const [px, py] of [[-0.4, -0.1], [0.4, -0.1], [-0.4, -0.9], [0.4, -0.9]]) (ell(ctx, bw * px, bh * py, 1.6, 1.6), ctx.fill());
      break;
    }
    case 'pumpkin': {
      for (let j = -2; j <= 2; j++) {
        ctx.fillStyle = lin(ctx, 0, -bh, 0, 0, [0, tc(j % 2 ? '#ffb347' : '#ffa531')], [1, tc('#e0741a')]);
        ell(ctx, j * bw * 0.16, -bh * 0.47, bw * 0.24, bh * 0.47);
        ctx.fill();
        stroke(ctx, OUT, lw * 0.9);
      }
      ctx.fillStyle = '#5a7a2a';
      rr(ctx, -bw * 0.05, -bh * 1.12, bw * 0.1, bh * 0.24, 2);
      ctx.fill();
      stroke(ctx, OUT, lw * 0.8);
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ell(ctx, -bw * 0.2, -bh * 0.7, bw * 0.06, bh * 0.14);
      ctx.fill();
      break;
    }
    case 'helmet': {
      ctx.fillStyle = lin(ctx, -bw / 2, 0, bw / 2, 0, [0, tc('#9aa4b2')], [0.4, tc('#e8eef6')], [1, tc('#6a7482')]);
      ctx.beginPath();
      ctx.moveTo(-bw * 0.5, 0);
      ctx.quadraticCurveTo(-bw * 0.5, -bh * 1.3, 0, -bh * 1.3);
      ctx.quadraticCurveTo(bw * 0.5, -bh * 1.3, bw * 0.5, 0);
      ctx.closePath();
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.fillStyle = tc('#e8453a');
      ctx.beginPath();
      ctx.moveTo(-bw * 0.05, -bh * 1.25);
      ctx.quadraticCurveTo(-bw * 0.35, -bh * 2.2 + Math.sin(t * 0.08 + id) * bh * 0.15, bw * 0.3, -bh * 1.9);
      ctx.quadraticCurveTo(bw * 0.1, -bh * 1.5, bw * 0.08, -bh * 1.25);
      ctx.fill();
      stroke(ctx, OUT, lw * 0.8);
      ctx.fillStyle = tc('#c8a040');
      rr(ctx, -bw * 0.52, -bh * 0.22, bw * 1.04, bh * 0.25, 2);
      ctx.fill();
      stroke(ctx, OUT, lw * 0.8);
      break;
    }
    case 'anvil':
    case 'cwt': {
      if (k === 'anvil') {
        ctx.fillStyle = lin(ctx, 0, -bh, 0, 0, [0, tc('#6a7280')], [1, tc('#2c3038')]);
        ctx.beginPath();
        ctx.moveTo(-bw * 0.55, -bh);
        ctx.lineTo(bw * 0.5, -bh);
        ctx.quadraticCurveTo(bw * 0.62, -bh * 0.8, bw * 0.25, -bh * 0.62);
        ctx.lineTo(bw * 0.2, -bh * 0.22);
        ctx.lineTo(bw * 0.38, 0);
        ctx.lineTo(-bw * 0.38, 0);
        ctx.lineTo(-bw * 0.2, -bh * 0.22);
        ctx.lineTo(-bw * 0.25, -bh * 0.62);
        ctx.quadraticCurveTo(-bw * 0.7, -bh * 0.8, -bw * 0.55, -bh);
        ctx.closePath();
        ctx.fill();
        stroke(ctx, OUT, lw);
        ctx.fillStyle = 'rgba(255,255,255,.4)';
        ctx.fillRect(-bw * 0.45, -bh * 0.96, bw * 0.8, bh * 0.08);
      } else {
        ctx.fillStyle = lin(ctx, -bw / 2, 0, bw / 2, 0, [0, tc('#5a606c')], [0.4, tc('#98a0ae')], [1, tc('#3a3e48')]);
        ctx.beginPath();
        ctx.moveTo(-bw * 0.5, 0);
        ctx.lineTo(-bw * 0.38, -bh * 0.88);
        ctx.lineTo(bw * 0.38, -bh * 0.88);
        ctx.lineTo(bw * 0.5, 0);
        ctx.closePath();
        ctx.fill();
        stroke(ctx, OUT, lw);
        ctx.strokeStyle = tc('#3a3e48');
        ctx.lineWidth = lw * 1.6;
        ell(ctx, 0, -bh * 1.0, bw * 0.16, bh * 0.12);
        ctx.stroke();
      }
      break;
    }
    case 'pot': {
      ctx.fillStyle = lin(ctx, -bw / 2, 0, bw / 2, 0, [0, tc('#e07a4a')], [1, tc('#a84a24')]);
      ctx.beginPath();
      ctx.moveTo(-bw * 0.36, 0);
      ctx.lineTo(-bw * 0.5, -bh * 0.7);
      ctx.lineTo(bw * 0.5, -bh * 0.7);
      ctx.lineTo(bw * 0.36, 0);
      ctx.closePath();
      ctx.fill();
      stroke(ctx, OUT, lw);
      rr(ctx, -bw * 0.56, -bh * 0.82, bw * 1.12, bh * 0.16, 2);
      ctx.fill();
      stroke(ctx, OUT, lw);
      for (let j = -1; j <= 1; j++) {
        ctx.fillStyle = tc('#5fb44a');
        ell(ctx, j * bw * 0.22, -bh * 0.98, bw * 0.14, bh * 0.22, j * 0.4);
        ctx.fill();
        ctx.fillStyle = tc(['#ff6fa0', '#ffd23a', '#9d7bff'][j + 1]);
        ell(ctx, j * bw * 0.26, -bh * 1.22, bw * 0.12, bw * 0.12);
        ctx.fill();
      }
      break;
    }
    case 'chand': {
      ctx.strokeStyle = tc('#c8962c');
      ctx.lineWidth = lw * 1.6;
      ctx.beginPath();
      ctx.moveTo(-bw * 0.5, -bh * 0.55);
      ctx.quadraticCurveTo(0, bh * 0.15, bw * 0.5, -bh * 0.55);
      ctx.stroke();
      ctx.fillStyle = lin(ctx, 0, -bh, 0, 0, [0, tc('#ffe28a')], [1, tc('#c8962c')]);
      ell(ctx, 0, -bh * 0.35, bw * 0.16, bh * 0.35);
      ctx.fill();
      stroke(ctx, OUT, lw);
      for (const j of [-0.5, -0.17, 0.17, 0.5]) {
        const cx = j * bw * 0.95, cy = -bh * (0.55 + (Math.abs(j) < 0.3 ? -0.22 : 0));
        ctx.fillStyle = '#fff6e0';
        rr(ctx, cx - bw * 0.035, cy - bh * 0.5, bw * 0.07, bh * 0.5, 2);
        ctx.fill();
        stroke(ctx, OUT, 1);
        const fl = 1 + Math.sin(t * 0.3 + j * 9) * 0.15;
        ctx.fillStyle = radg(ctx, cx, cy - bh * 0.62, 0, bh * 0.5 * fl, [0, 'rgba(255,240,170,.9)'], [1, 'rgba(255,200,80,0)']);
        ell(ctx, cx, cy - bh * 0.62, bh * 0.5 * fl, bh * 0.5 * fl);
        ctx.fill();
        ctx.fillStyle = '#ffb030';
        ell(ctx, cx, cy - bh * 0.62, bw * 0.03, bh * 0.16 * fl);
        ctx.fill();
      }
      break;
    }
    case 'barrel': {
      ctx.fillStyle = lin(ctx, -bw / 2, 0, bw / 2, 0, [0, tc('#9a6234')], [0.45, tc('#d89a5a')], [1, tc('#7a4a24')]);
      ctx.beginPath();
      ctx.moveTo(-bw * 0.42, 0);
      ctx.quadraticCurveTo(-bw * 0.56, -bh * 0.5, -bw * 0.42, -bh);
      ctx.lineTo(bw * 0.42, -bh);
      ctx.quadraticCurveTo(bw * 0.56, -bh * 0.5, bw * 0.42, 0);
      ctx.closePath();
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.strokeStyle = tc('#4a4e58');
      ctx.lineWidth = lw * 1.6;
      for (const f of [0.2, 0.8]) {
        ctx.beginPath();
        ctx.moveTo(-bw * 0.47, -bh * f);
        ctx.lineTo(bw * 0.47, -bh * f);
        ctx.stroke();
      }
      break;
    }
    case 'ball': {
      ctx.fillStyle = radg(ctx, -bw * 0.15, -bh * 0.65, 1, bw * 0.6, [0, tc('#7a808a')], [1, tc('#1c2028')]);
      ell(ctx, 0, -bh * 0.5, bw * 0.5, bh * 0.5);
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ell(ctx, -bw * 0.18, -bh * 0.7, bw * 0.1, bh * 0.07, -0.5);
      ctx.fill();
      break;
    }
    case 'pillow': {
      ctx.fillStyle = lin(ctx, 0, -bh, 0, 0, [0, tc('#e8566a')], [1, tc('#a82a40')]);
      ctx.beginPath();
      ctx.moveTo(-bw * 0.5, -bh * 0.1);
      ctx.quadraticCurveTo(0, -bh * 1.5, bw * 0.5, -bh * 0.1);
      ctx.quadraticCurveTo(0, bh * 0.3, -bw * 0.5, -bh * 0.1);
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.fillStyle = '#f2c44c';
      for (const sd of [-1, 1]) (ell(ctx, sd * bw * 0.52, -bh * 0.1, bw * 0.06, bw * 0.06), ctx.fill());
      break;
    }
    case 'vase': {
      ctx.fillStyle = lin(ctx, -bw / 2, 0, bw / 2, 0, [0, tc('#5a8ae8')], [0.45, tc('#e8f0ff')], [1, tc('#3a5ab8')]);
      ctx.beginPath();
      ctx.moveTo(-bw * 0.3, 0);
      ctx.quadraticCurveTo(-bw * 0.75, -bh * 0.45, -bw * 0.2, -bh * 0.82);
      ctx.lineTo(-bw * 0.28, -bh);
      ctx.lineTo(bw * 0.28, -bh);
      ctx.lineTo(bw * 0.2, -bh * 0.82);
      ctx.quadraticCurveTo(bw * 0.75, -bh * 0.45, bw * 0.3, 0);
      ctx.closePath();
      ctx.fill();
      stroke(ctx, OUT, lw);
      ctx.strokeStyle = '#2a4aa8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, -bh * 0.45, bw * 0.18, 0, TAU);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
  void st;
}

/** 경비병 (개·곰) — 왼쪽(고양이 쪽)을 본다. mode 0 잠 · 1 버둥(떠오름) · 2 깜짝 */
function drawGuard(ctx: C2, k: Kind, bw: number, bh: number, t: number, id: number, mode: number, flat: number) {
  const bear = k === 'bear', lw = Math.max(1.5, bw * 0.03);
  const fur = bear ? ['#b07a4a', '#7a4e2a'] : ['#f0c88a', '#c8904e'], belly = bear ? '#e0b88a' : '#fff0d6';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (flat > 0) {
    // 납작! 부침개
    const fw = bw * 1.35, fh = bh * 0.32;
    ctx.fillStyle = lin(ctx, 0, -fh, 0, 0, [0, tc(fur[0])], [1, tc(fur[1])]);
    ell(ctx, 0, -fh * 0.45, fw * 0.55, fh * 0.55);
    ctx.fill();
    stroke(ctx, OUT, lw);
    ctx.fillStyle = belly;
    ell(ctx, fw * 0.02, -fh * 0.5, fw * 0.3, fh * 0.3);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.4;
    for (const ex of [-0.28, -0.12]) {
      const cx = fw * ex, cy = -fh * 0.6, r = fh * 0.16;
      ctx.beginPath();
      ctx.moveTo(cx - r, cy - r);
      ctx.lineTo(cx + r, cy + r);
      ctx.moveTo(cx + r, cy - r);
      ctx.lineTo(cx - r, cy + r);
      ctx.stroke();
    }
    ctx.fillStyle = '#3a2618';
    ell(ctx, -fw * 0.4, -fh * 0.5, fh * 0.12, fh * 0.1);
    ctx.fill();
    // 어질어질 별
    for (let j = 0; j < 3; j++) {
      const a = t * 0.12 + (j * TAU) / 3;
      ctx.fillStyle = '#ffe14a';
      starPath(ctx, -fw * 0.2 + Math.cos(a) * fw * 0.22, -fh * 1.6 + Math.sin(a) * fh * 0.4, fh * 0.32);
      ctx.fill();
      stroke(ctx, OUT, 1);
    }
    return;
  }
  const flail = mode === 1 ? Math.sin(t * 0.5 + id) : 0, breath = mode === 0 ? Math.sin(t * 0.06 + id) * 0.03 : 0;
  // 다리
  ctx.fillStyle = tc(fur[1]);
  for (const [lx, ph] of [[-0.28, 0], [0.22, 1.6]]) {
    ctx.save();
    ctx.translate(bw * lx, -bh * 0.22);
    ctx.rotate(mode === 1 ? Math.sin(t * 0.55 + ph + id) * 0.8 : 0);
    rr(ctx, -bw * 0.08, 0, bw * 0.16, bh * 0.24, bw * 0.06);
    ctx.fill();
    stroke(ctx, OUT, lw * 0.8);
    ctx.restore();
  }
  // 몸
  ctx.fillStyle = lin(ctx, 0, -bh, 0, 0, [0, tc(fur[0])], [1, tc(fur[1])]);
  ell(ctx, bw * 0.06, -bh * 0.45, bw * 0.46 * (1 + breath), bh * 0.36 * (1 + breath));
  ctx.fill();
  stroke(ctx, OUT, lw);
  if (bear) {
    // 파란 경비 조끼
    ctx.fillStyle = tc('#3a6ad8');
    ctx.beginPath();
    ctx.ellipse(bw * 0.06, -bh * 0.45, bw * 0.4, bh * 0.3, 0, -0.9, Math.PI + 0.9);
    ctx.fill();
    ctx.fillStyle = tc('#f2c44c');
    ell(ctx, bw * 0.06, -bh * 0.48, bw * 0.08, bh * 0.08);
    ctx.fill();
  } else {
    ctx.fillStyle = tc(belly);
    ell(ctx, -bw * 0.06, -bh * 0.38, bw * 0.24, bh * 0.2);
    ctx.fill();
    ctx.fillStyle = tc('#d8303a');
    rr(ctx, -bw * 0.32, -bh * 0.66, bw * 0.24, bh * 0.08, 3);
    ctx.fill();
  }
  // 꼬리
  ctx.strokeStyle = tc(fur[1]);
  ctx.lineWidth = bw * 0.08;
  ctx.beginPath();
  ctx.moveTo(bw * 0.48, -bh * 0.5);
  ctx.quadraticCurveTo(bw * 0.68, -bh * 0.7 + Math.sin(t * 0.1 + id) * bh * 0.06, bw * 0.6, -bh * 0.88);
  ctx.stroke();
  // 팔 (버둥)
  if (mode === 1) {
    ctx.fillStyle = tc(fur[0]);
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.translate(-bw * 0.12 + sd * bw * 0.16, -bh * 0.62);
      ctx.rotate(-1.2 * sd + flail * 0.9 * sd);
      rr(ctx, -bw * 0.06, -bh * 0.3, bw * 0.12, bh * 0.3, bw * 0.06);
      ctx.fill();
      stroke(ctx, OUT, lw * 0.8);
      ctx.restore();
    }
  }
  // 머리 (왼쪽)
  const hx = -bw * 0.34, hy = -bh * 0.78, hr = bw * (bear ? 0.3 : 0.27);
  ctx.fillStyle = tc(fur[0]);
  if (bear) {
    for (const sd of [-1, 1]) (ell(ctx, hx + sd * hr * 0.7, hy - hr * 0.75, hr * 0.32, hr * 0.32), ctx.fill(), stroke(ctx, OUT, lw * 0.8));
  }
  ell(ctx, hx, hy, hr, hr * 0.92);
  ctx.fill();
  stroke(ctx, OUT, lw);
  if (!bear) {
    // 늘어진 귀
    ctx.fillStyle = tc('#a86a34');
    ctx.beginPath();
    ctx.ellipse(hx + hr * 0.45, hy - hr * 0.1, hr * 0.28, hr * 0.62, 0.35 + (mode === 1 ? flail * 0.5 : 0), 0, TAU);
    ctx.fill();
    stroke(ctx, OUT, lw * 0.8);
  }
  // 주둥이
  ctx.fillStyle = tc(belly);
  ell(ctx, hx - hr * 0.55, hy + hr * 0.2, hr * 0.48, hr * 0.36);
  ctx.fill();
  stroke(ctx, OUT, lw * 0.8);
  ctx.fillStyle = '#3a2618';
  ell(ctx, hx - hr * 0.95, hy + hr * 0.08, hr * 0.14, hr * 0.11);
  ctx.fill();
  // 눈
  if (mode === 0) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(hx - hr * 0.2, hy - hr * 0.15, hr * 0.14, 0.2, Math.PI - 0.2);
    ctx.stroke();
    // 콧방울 · Zzz
    const zb = (Math.sin(t * 0.06 + id) + 1) * 0.5;
    ctx.fillStyle = 'rgba(200,235,255,.85)';
    ell(ctx, hx - hr * 1.1, hy + hr * 0.18, hr * (0.08 + zb * 0.22), hr * (0.08 + zb * 0.22));
    ctx.fill();
    stroke(ctx, 'rgba(90,140,180,.8)', 1);
  } else {
    for (const ex of [-0.32, 0.02]) {
      ctx.fillStyle = '#ffffff';
      ell(ctx, hx + hr * ex, hy - hr * 0.15, hr * 0.17, hr * 0.2);
      ctx.fill();
      stroke(ctx, OUT, 1.2);
      ctx.fillStyle = '#1a1210';
      ell(ctx, hx + hr * ex - hr * 0.03, hy - hr * 0.12, hr * 0.07, hr * 0.08);
      ctx.fill();
    }
    ctx.fillStyle = '#7a2a2a';
    ell(ctx, hx - hr * 0.5, hy + hr * 0.5, hr * 0.14, hr * 0.12);
    ctx.fill();
  }
  if (!bear) {
    // 경비 모자
    ctx.fillStyle = tc('#d8303a');
    rr(ctx, hx - hr * 0.55, hy - hr * 1.18, hr * 1.1, hr * 0.42, 3);
    ctx.fill();
    stroke(ctx, OUT, lw * 0.8);
    ctx.fillStyle = tc('#f2c44c');
    ell(ctx, hx, hy - hr * 0.98, hr * 0.12, hr * 0.12);
    ctx.fill();
  } else {
    // 창
    ctx.strokeStyle = '#7a5a3a';
    ctx.lineWidth = bw * 0.05;
    ctx.beginPath();
    ctx.moveTo(bw * 0.3, 0);
    ctx.lineTo(bw * 0.3, -bh * 1.25);
    ctx.stroke();
    ctx.fillStyle = '#c8d0dc';
    ctx.beginPath();
    ctx.moveTo(bw * 0.3, -bh * 1.42);
    ctx.lineTo(bw * 0.36, -bh * 1.24);
    ctx.lineTo(bw * 0.24, -bh * 1.24);
    ctx.closePath();
    ctx.fill();
    stroke(ctx, OUT, 1.2);
  }
}

// ── 보물 그림 (장면 · 창고 · 결과 화면 공용) ──
function drawLoot(ctx: C2, k: PrizeK, x: number, y: number, r: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  const gold = lin(ctx, 0, -r, 0, r, [0, '#fff3a0'], [0.5, '#ffc83a'], [1, '#d08a10']);
  const lw = Math.max(1.2, r * 0.1);
  if (k === 'key') {
    ctx.rotate(-0.5);
    ctx.fillStyle = gold;
    ell(ctx, -r * 0.45, 0, r * 0.42, r * 0.42);
    ctx.fill();
    stroke(ctx, OUT, lw);
    ctx.fillStyle = '#ffffff';
    ell(ctx, -r * 0.45, 0, r * 0.16, r * 0.16);
    ctx.fill();
    ctx.fillStyle = gold;
    rr(ctx, -r * 0.1, -r * 0.12, r * 1.1, r * 0.24, r * 0.08);
    ctx.fill();
    stroke(ctx, OUT, lw);
    ctx.fillRect(r * 0.7, 0, r * 0.14, r * 0.36);
    ctx.fillRect(r * 0.45, 0, r * 0.12, r * 0.28);
  } else if (k === 'crown' || k === 'bigcrown') {
    const s2 = k === 'bigcrown' ? 1.15 : 1;
    ctx.scale(s2, s2);
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, r * 0.5);
    ctx.lineTo(-r * 0.9, -r * 0.45);
    ctx.lineTo(-r * 0.45, -r * 0.05);
    ctx.lineTo(0, -r * 0.7);
    ctx.lineTo(r * 0.45, -r * 0.05);
    ctx.lineTo(r * 0.9, -r * 0.45);
    ctx.lineTo(r * 0.8, r * 0.5);
    ctx.closePath();
    ctx.fill();
    stroke(ctx, OUT, lw);
    for (const [jx, col] of [[-0.45, '#ff4a6a'], [0, '#4ac0ff'], [0.45, '#5fd46a']] as [number, string][]) {
      ctx.fillStyle = col;
      ell(ctx, r * jx, r * 0.18, r * 0.12, r * 0.12);
      ctx.fill();
    }
  } else if (k === 'gem') {
    ctx.fillStyle = lin(ctx, -r, -r, r, r, [0, '#c8f4ff'], [0.5, '#4ac0ff'], [1, '#2a6ad8']);
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, -r * 0.25);
    ctx.lineTo(-r * 0.4, -r * 0.65);
    ctx.lineTo(r * 0.4, -r * 0.65);
    ctx.lineTo(r * 0.75, -r * 0.25);
    ctx.lineTo(0, r * 0.75);
    ctx.closePath();
    ctx.fill();
    stroke(ctx, OUT, lw);
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, -r * 0.25);
    ctx.lineTo(r * 0.75, -r * 0.25);
    ctx.moveTo(-r * 0.2, -r * 0.65);
    ctx.lineTo(0, r * 0.75);
    ctx.stroke();
  } else if (k === 'cup') {
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.6);
    ctx.quadraticCurveTo(-r * 0.6, r * 0.1, 0, r * 0.15);
    ctx.quadraticCurveTo(r * 0.6, r * 0.1, r * 0.6, -r * 0.6);
    ctx.closePath();
    ctx.fill();
    stroke(ctx, OUT, lw);
    rr(ctx, -r * 0.1, r * 0.1, r * 0.2, r * 0.4, 1);
    ctx.fill();
    rr(ctx, -r * 0.4, r * 0.48, r * 0.8, r * 0.16, 2);
    ctx.fill();
    stroke(ctx, OUT, lw);
  } else if (k === 'egg') {
    ctx.fillStyle = gold;
    ell(ctx, 0, 0, r * 0.55, r * 0.72);
    ctx.fill();
    stroke(ctx, OUT, lw);
    ctx.strokeStyle = '#ff6a8a';
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, 0);
    for (let j = 0; j <= 6; j++) ctx.lineTo(-r * 0.5 + j * r * 0.17, j % 2 ? -r * 0.12 : r * 0.08);
    ctx.stroke();
  } else if (k === 'map') {
    ctx.fillStyle = '#f6e6b8';
    rr(ctx, -r * 0.75, -r * 0.55, r * 1.5, r * 1.1, r * 0.15);
    ctx.fill();
    stroke(ctx, OUT, lw);
    ctx.strokeStyle = '#d8303a';
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.2);
    ctx.lineTo(-r * 0.2, r * 0.2);
    ctx.moveTo(-r * 0.2, -r * 0.2);
    ctx.lineTo(-r * 0.4, r * 0.2);
    ctx.stroke();
    ctx.setLineDash([r * 0.12, r * 0.1]);
    ctx.lineWidth = r * 0.06;
    ctx.strokeStyle = '#8a6a3a';
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, 0);
    ctx.quadraticCurveTo(r * 0.2, -r * 0.4, r * 0.5, r * 0.2);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (k === 'harp') {
    ctx.strokeStyle = gold;
    ctx.lineWidth = r * 0.22;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, r * 0.6);
    ctx.lineTo(-r * 0.5, -r * 0.6);
    ctx.quadraticCurveTo(r * 0.2, -r * 0.7, r * 0.55, r * 0.6);
    ctx.lineTo(-r * 0.5, r * 0.6);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let j = 1; j < 5; j++) {
      const x = -r * 0.5 + j * r * 0.2;
      ctx.beginPath();
      ctx.moveTo(x, -r * 0.5 + j * r * 0.18);
      ctx.lineTo(x, r * 0.55);
      ctx.stroke();
    }
  }
  if (t >= 0) {
    const tw = (Math.sin(t * 0.1) + 1) * 0.5;
    ctx.fillStyle = `rgba(255,255,255,${0.5 + tw * 0.5})`;
    starPath(ctx, r * 0.55, -r * 0.55, r * 0.22 * (0.6 + tw * 0.6));
    ctx.fill();
  }
  ctx.restore();
}

/** 도둑 고양이 — 망토 · 눈가리개 · 등에 무게 주머니. mode: walk wait creak air float win flat worry */
function drawCat(ctx: C2, x: number, y: number, u: number, dir: number, mode: string, t: number, sack: number[], slots: number, wow: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const lw = Math.max(1.5, u * 0.045);
  const fur0 = '#ffb45c', fur1 = '#e8822a', cape0 = '#5a3fa0', cape1 = '#3a2670';
  if (mode === 'flat') {
    ctx.fillStyle = lin(ctx, 0, -u * 0.2, 0, 0, [0, fur0], [1, fur1]);
    ell(ctx, 0, -u * 0.08, u * 0.75, u * 0.1);
    ctx.fill();
    stroke(ctx, OUT, lw);
    ctx.fillStyle = cape0;
    ell(ctx, -u * 0.3, -u * 0.1, u * 0.4, u * 0.07);
    ctx.fill();
    ctx.fillStyle = '#2a1a10';
    rr(ctx, u * 0.12, -u * 0.16, u * 0.4, u * 0.07, 2);
    ctx.fill();
    for (let j = 0; j < 3; j++) {
      const a = t * 0.15 + (j * TAU) / 3;
      ctx.fillStyle = '#ffe14a';
      starPath(ctx, u * 0.2 + Math.cos(a) * u * 0.3, -u * 0.45 + Math.sin(a) * u * 0.1, u * 0.09);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  const walk = mode === 'walk', air = mode === 'air' || mode === 'hop', float = mode === 'float', win = mode === 'win';
  const ph = t * 0.32, bob = walk ? Math.abs(Math.sin(ph)) * u * 0.05 : win ? Math.abs(Math.sin(t * 0.2)) * u * 0.25 : 0;
  ctx.translate(0, -bob);
  const sackW = sack.reduce((a, c) => a + c, 0);
  const strain = sackW >= 8 ? 1 : 0;
  // 꼬리 (줄무늬)
  const sw = Math.sin(t * 0.09) * u * 0.12;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = u * 0.16;
  ctx.beginPath();
  ctx.moveTo(-u * 0.38, -u * 0.38);
  ctx.quadraticCurveTo(-u * 0.85, -u * 0.5 + sw, -u * 0.72 + sw * 0.5, -u * 1.0);
  ctx.stroke();
  ctx.strokeStyle = fur0;
  ctx.lineWidth = u * 0.11;
  ctx.stroke();
  ctx.strokeStyle = fur1;
  ctx.lineWidth = u * 0.11;
  ctx.setLineDash([u * 0.07, u * 0.08]);
  ctx.stroke();
  ctx.setLineDash([]);
  // 망토 (뒤로 펄럭)
  const fl = Math.sin(t * 0.14) * u * 0.06 + (air || float ? u * 0.12 : 0);
  ctx.fillStyle = lin(ctx, 0, -u, 0, 0, [0, cape0], [1, cape1]);
  ctx.beginPath();
  ctx.moveTo(u * 0.12, -u * 0.88);
  ctx.quadraticCurveTo(-u * 0.3, -u * 0.95, -u * 0.62, -u * 0.32 + fl);
  ctx.lineTo(-u * 0.48, -u * 0.22 + fl * 0.6);
  ctx.lineTo(-u * 0.36, -u * 0.3 + fl * 0.3);
  ctx.lineTo(-u * 0.18, -u * 0.2);
  ctx.quadraticCurveTo(u * 0.05, -u * 0.5, u * 0.12, -u * 0.88);
  ctx.closePath();
  ctx.fill();
  stroke(ctx, OUT, lw);
  // 다리
  ctx.fillStyle = fur1;
  const legs: [number, number][] = [[-0.26, 0], [-0.1, Math.PI], [0.14, Math.PI * 0.5], [0.28, Math.PI * 1.5]];
  for (const [lx, p0] of legs) {
    const sx = walk ? Math.sin(ph + p0) * u * 0.06 : air ? (lx < 0 ? -u * 0.08 : u * 0.08) : float ? Math.sin(t * 0.5 + p0) * u * 0.1 : 0;
    const lift = walk ? Math.max(0, Math.cos(ph + p0)) * u * 0.05 : air ? u * 0.05 : 0;
    rr(ctx, u * lx - u * 0.055 + sx, -u * 0.26 - lift, u * 0.11, u * 0.26, u * 0.05);
    ctx.fill();
    stroke(ctx, OUT, lw * 0.8);
    ctx.fillStyle = '#fff4e6';
    ell(ctx, u * lx + sx, -u * 0.02 - lift, u * 0.065, u * 0.04);
    ctx.fill();
    ctx.fillStyle = fur1;
  }
  // 몸
  ctx.fillStyle = lin(ctx, 0, -u * 0.75, 0, -u * 0.15, [0, fur0], [1, fur1]);
  ell(ctx, 0, -u * 0.44, u * 0.42, u * 0.27);
  ctx.fill();
  stroke(ctx, OUT, lw);
  ctx.fillStyle = '#fff1dc';
  ell(ctx, u * 0.12, -u * 0.36, u * 0.22, u * 0.15);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,90,20,.55)';
  ctx.lineWidth = u * 0.045;
  for (const sx of [-0.22, -0.08]) {
    ctx.beginPath();
    ctx.moveTo(u * sx, -u * 0.68);
    ctx.quadraticCurveTo(u * (sx - 0.04), -u * 0.55, u * sx, -u * 0.46);
    ctx.stroke();
  }
  // 무게 주머니 (등)
  const nS = Math.max(1, Math.min(2, slots));
  for (let j = 0; j < nS; j++) {
    const val = sack[j] ?? 0, r = val > 0 ? u * (0.15 + Math.min(0.2, Math.sqrt(val) * 0.05)) : u * 0.12;
    const cx = -u * (0.22 + j * 0.22), cy = -u * (0.72 + j * 0.06) - r * 0.4 + (strain ? Math.sin(t * 0.4) * u * 0.01 : 0);
    ctx.fillStyle = lin(ctx, cx - r, cy - r, cx + r, cy + r, [0, val > 0 ? '#e8c890' : '#d8c4a0'], [1, val > 0 ? '#b88a4a' : '#a89070']);
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.25, cy - r * 0.95);
    ctx.quadraticCurveTo(cx - r * 1.15, cy - r * 0.6, cx - r * 0.95, cy + r * 0.4);
    ctx.quadraticCurveTo(cx, cy + r * 1.15, cx + r * 0.95, cy + r * 0.4);
    ctx.quadraticCurveTo(cx + r * 1.15, cy - r * 0.6, cx + r * 0.25, cy - r * 0.95);
    ctx.closePath();
    ctx.fill();
    stroke(ctx, OUT, lw);
    ctx.strokeStyle = '#8a5a2a';
    ctx.lineWidth = lw * 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.35, cy - r * 0.8);
    ctx.lineTo(cx + r * 0.35, cy - r * 0.8);
    ctx.stroke();
    if (val > 0) {
      ctx.save();
      ctx.scale(dir, 1);
      txt(ctx, String(val), cx * dir, cy + r * 0.2, Math.max(9, r * 0.95), '#4a2a10', 900, 'center', 'rgba(255,240,200,.8)');
      ctx.restore();
    }
  }
  // 머리
  const hx = u * 0.34, hy = -u * 0.86 + (float ? Math.sin(t * 0.3) * u * 0.02 : 0), hr = u * 0.3;
  ctx.fillStyle = fur0;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + sd * hr * 0.78, hy - hr * 0.35);
    ctx.lineTo(hx + sd * hr * 0.62, hy - hr * 1.18);
    ctx.lineTo(hx + sd * hr * 0.12, hy - hr * 0.8);
    ctx.closePath();
    ctx.fill();
    stroke(ctx, OUT, lw * 0.9);
  }
  ctx.fillStyle = '#ffc6cf';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + sd * hr * 0.66, hy - hr * 0.48);
    ctx.lineTo(hx + sd * hr * 0.6, hy - hr * 0.98);
    ctx.lineTo(hx + sd * hr * 0.3, hy - hr * 0.72);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = lin(ctx, 0, hy - hr, 0, hy + hr, [0, fur0], [1, '#f39a40']);
  ell(ctx, hx, hy, hr * 1.08, hr);
  ctx.fill();
  stroke(ctx, OUT, lw);
  ctx.fillStyle = '#fff1dc';
  ell(ctx, hx + hr * 0.3, hy + hr * 0.42, hr * 0.5, hr * 0.38);
  ctx.fill();
  // 도둑 눈가리개
  ctx.fillStyle = '#2a1e30';
  ctx.beginPath();
  ctx.moveTo(hx - hr * 1.05, hy - hr * 0.32);
  ctx.quadraticCurveTo(hx, hy - hr * 0.5, hx + hr * 1.05, hy - hr * 0.3);
  ctx.lineTo(hx + hr * 1.02, hy + hr * 0.08);
  ctx.quadraticCurveTo(hx, hy - hr * 0.02, hx - hr * 1.02, hy + hr * 0.06);
  ctx.closePath();
  ctx.fill();
  // 눈가리개 끈 (뒤로 나풀)
  ctx.strokeStyle = '#2a1e30';
  ctx.lineWidth = u * 0.05;
  ctx.beginPath();
  ctx.moveTo(hx - hr * 1.0, hy - hr * 0.15);
  ctx.quadraticCurveTo(hx - hr * 1.5, hy - hr * 0.3 + Math.sin(t * 0.2) * u * 0.05, hx - hr * 1.8, hy - hr * 0.05 + Math.sin(t * 0.2 + 1) * u * 0.06);
  ctx.stroke();
  // 눈
  const wide = air || float || wow > 0 || mode === 'worry' || mode === 'creak';
  for (const [ex, sz] of [[0.12, 1], [0.6, 0.9]] as [number, number][]) {
    const cx = hx + hr * ex, cy = hy - hr * 0.14;
    if (win) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = u * 0.045;
      ctx.beginPath();
      ctx.arc(cx, cy + hr * 0.06, hr * 0.13 * sz, Math.PI + 0.3, -0.3);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#ffffff';
    ell(ctx, cx, cy, hr * 0.17 * sz, hr * (wide ? 0.2 : 0.12) * sz);
    ctx.fill();
    ctx.fillStyle = '#5ad46a';
    ell(ctx, cx + hr * 0.04, cy, hr * 0.1 * sz, hr * (wide ? 0.15 : 0.1) * sz);
    ctx.fill();
    ctx.fillStyle = '#10140a';
    ell(ctx, cx + hr * 0.05, cy, hr * (wide ? 0.07 : 0.035) * sz, hr * (wide ? 0.12 : 0.09) * sz);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ell(ctx, cx + hr * 0.01, cy - hr * 0.05, hr * 0.03, hr * 0.03);
    ctx.fill();
    if (!wide) {
      // 반쯤 감은 눈꺼풀 (살금살금 우쭐)
      ctx.fillStyle = '#2a1e30';
      ctx.fillRect(cx - hr * 0.19 * sz, cy - hr * 0.14 * sz, hr * 0.38 * sz, hr * 0.07 * sz);
    }
  }
  // 코 · 입 · 수염
  ctx.fillStyle = '#ff7a90';
  ctx.beginPath();
  ctx.moveTo(hx + hr * 0.88, hy + hr * 0.18);
  ctx.lineTo(hx + hr * 1.04, hy + hr * 0.18);
  ctx.lineTo(hx + hr * 0.96, hy + hr * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  if (wide && !win) ell(ctx, hx + hr * 0.82, hy + hr * 0.5, hr * 0.1, hr * 0.12);
  else {
    ctx.moveTo(hx + hr * 0.62, hy + hr * 0.42);
    ctx.quadraticCurveTo(hx + hr * 0.8, hy + hr * (win ? 0.62 : 0.52), hx + hr * 0.96, hy + hr * 0.36);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 1;
  for (const dy of [0.25, 0.38]) {
    ctx.beginPath();
    ctx.moveTo(hx + hr * 0.95, hy + hr * dy);
    ctx.lineTo(hx + hr * 1.5, hy + hr * (dy - 0.06 + (dy > 0.3 ? 0.1 : 0)));
    ctx.stroke();
  }
  // 힘줌(주머니가 무거움) · 걱정: 땀방울
  if (strain || mode === 'creak' || mode === 'worry') {
    const dy = ((t * 0.04) % 1) * u * 0.15;
    ctx.fillStyle = '#9adcff';
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.9, hy - hr * 0.6 + dy);
    ctx.quadraticCurveTo(hx - hr * 1.1, hy - hr * 0.3 + dy, hx - hr * 0.9, hy - hr * 0.25 + dy);
    ctx.quadraticCurveTo(hx - hr * 0.7, hy - hr * 0.3 + dy, hx - hr * 0.9, hy - hr * 0.6 + dy);
    ctx.fill();
  }
  if (mode === 'worry') {
    ctx.fillStyle = fur0;
    ctx.save();
    ctx.translate(u * 0.22, -u * 0.62);
    ctx.rotate(-2.6 + Math.sin(t * 0.5) * 0.25);
    rr(ctx, -u * 0.05, 0, u * 0.1, u * 0.34, u * 0.05);
    ctx.fill();
    stroke(ctx, OUT, lw * 0.8);
    ctx.restore();
  }
  // 앞발: 둥실이면 허우적, 이기면 만세
  if (float || win || air) {
    ctx.fillStyle = fur0;
    for (const sd of [0, 1]) {
      ctx.save();
      ctx.translate(u * (0.18 + sd * 0.1), -u * 0.62);
      ctx.rotate(win ? -2.4 + sd * 0.4 : float ? -1.6 + Math.sin(t * 0.5 + sd * 2) * 0.7 : -1.2);
      rr(ctx, -u * 0.05, 0, u * 0.1, u * 0.3, u * 0.05);
      ctx.fill();
      stroke(ctx, OUT, lw * 0.8);
      ctx.restore();
    }
  }
  ctx.restore();
}

/** 무게 표: 쇠 추 모양에 숫자 (무게 0 = 비눗방울 표) */
function drawTag(ctx: C2, x: number, y: number, r: number, wgt: number, w0: number, hot: boolean) {
  ctx.save();
  ctx.translate(x, y);
  if (wgt === 0) {
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ell(ctx, 0, 0, r * 0.95, r * 0.95);
    ctx.fill();
    stroke(ctx, 'rgba(120,160,255,.9)', 1.4);
    txt(ctx, '0', 0, r * 0.05, r * 1.15, '#6a8ae8', 900, 'center', '');
  } else {
    const heavy = wgt > w0;
    ctx.strokeStyle = heavy ? '#3a2a2a' : '#4a4e58';
    ctx.lineWidth = r * 0.28;
    ell(ctx, 0, -r * 0.92, r * 0.34, r * 0.26);
    ctx.stroke();
    ctx.fillStyle = heavy ? lin(ctx, 0, -r, 0, r, [0, '#ff8a6a'], [1, '#c8302a']) : lin(ctx, 0, -r, 0, r, [0, '#7a8494'], [1, '#3a404c']);
    ctx.beginPath();
    ctx.moveTo(-r * 0.62, -r * 0.7);
    ctx.lineTo(r * 0.62, -r * 0.7);
    ctx.lineTo(r * 0.95, r * 0.75);
    ctx.lineTo(-r * 0.95, r * 0.75);
    ctx.closePath();
    ctx.fill();
    stroke(ctx, hot ? '#fff3a0' : OUT, hot ? 2.2 : 1.3);
    txt(ctx, String(wgt), 0, r * 0.08, r * (wgt >= 10 ? 0.95 : 1.15), '#ffffff', 900, 'center', '');
  }
  ctx.restore();
}

interface Orb { x0: number; y0: number; x1: number; y1: number; t0: number; dur: number; val: number; give: boolean }
const ORBS = new WeakMap<object, Orb[]>();
const SAY = new WeakMap<object, { x: number; y: number; t: number; text: string; col: string; size: number }[]>();
/** 만화 효과 글자: 굵은 갈색 테두리 · 색 글자 · 톡 튀어나와 떠오름 */
function drawSays(ctx: C2, s: WSState) {
  const rec = SAY.get(s);
  if (!rec) return;
  for (const q of rec) {
    const age = s.t - q.t;
    if (age < 0 || age > 56) continue;
    const pop = age < 7 ? 0.5 + 1.1 * Math.sin((age / 7) * Math.PI * 0.6) : 1, a = Math.min(1, (56 - age) / 14);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(q.x, q.y - age * 0.45);
    ctx.rotate(-0.06 + (q.t % 3) * 0.04);
    ctx.scale(pop, pop);
    ctx.font = `900 ${q.size}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = q.size * 0.26;
    ctx.strokeStyle = '#3a2618';
    ctx.strokeText(q.text, 0, 0);
    ctx.fillStyle = q.col;
    ctx.fillText(q.text, 0, 0);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillText(q.text, 0, -q.size * 0.06);
    ctx.fillStyle = q.col;
    ctx.globalAlpha = a * 0.6;
    ctx.fillText(q.text, 0, q.size * 0.02);
    ctx.restore();
  }
}

function catMode(s: WSState): string {
  const W = s.W, c = W.b[W.cat];
  if (c.st === 1) return 'flat';
  if (s.phase === 'result') return 'win';
  if (isStuck(s)) return 'worry';
  if (W.cs === 'float' || (c.w === 0 && c.load === 0)) return 'float';
  if (W.cs === 'air' || W.cs === 'hop') return 'air';
  if (W.cs === 'creak') return 'creak';
  if (W.cs === 'walk') return 'walk';
  return 'wait';
}
/** 막힘 알아채기 (브라우저 그리기 쪽에서만 — 시뮬레이션·봇 측정에는 영향 없음): 남은 톡으로 이길 길이 없나.
 *  계산은 힌트 계산(여러 프레임에 나눠 미리)과 같은 것을 쓴다 — 아직 계산 중이면 '안 막힘'. */
function isStuck(s: WSState): boolean {
  const W = s.W;
  if (s.phase !== 'play' || W.done || W.taps === 0 || W.calm < 45) return false;
  const j = JOB.get(s);
  return !!j && !!j.res && j.res.kind === 'stuck' && j.key === curKey(s);
}
const sackPos = (W: World) => {
  const c = W.b[W.cat];
  return { x: c.x - c.face * 0.03, y: c.y + c.h + 0.02 };
};

// ───────────────────────────── 막힘 힌트 (39라운드) ─────────────────────────────
// 전구를 누르면 '지금 상태에서' 가장 쉽게 깨는 길(최소 톡 — 톡 수가 같으면 별이 많은 길)을 한 수씩 보여 준다.
// 다시 털기(결과 화면 ↺)에서는 별 길. 계산은 그리기 쪽에서만, 고요할 때 여러 프레임에 나눠 미리 —
// 시뮬레이션·봇 측정·s.rng 와 무관 (봇은 전구를 쓰지 않는다).
interface HStep { id: number; give: boolean; val: number; k: Kind; fx: number; fy: number; fh: number; tx: number; ty: number; hw: number; h: number; flats: number[]; broke: [number, number][]; eff: string[] }
interface HMove { steps: HStep[]; from: number }
interface HInfo { kind: 'plan' | 'stuck' | 'done'; steps: HStep[]; moves: HMove[] }
interface Job { key: string; gen: Generator<void, HInfo> | null; res: HInfo | null }
interface HRec { at: number; info: HInfo | null; base: number; k: number; kT: number; ended: boolean }
const JOB = new WeakMap<object, Job>();
const HINT = new WeakMap<object, HRec>();
const KEYM = new WeakMap<object, { t: number; key: string }>();
/** 이번 프레임에 쓸 수 있는 시뮬레이션 틱 수 (나눠 계산) */
let BUDGET = 0;
const curKey = (s: WSState) => {
  let m = KEYM.get(s);
  if (!m || m.t !== s.t) KEYM.set(s, (m = { t: s.t, key: (s.starHint ? 'S' : 'C') + sig(s.W, s.stage) }));
  return m.key;
};
function* settleG(V: World, max = 900): Generator<void, void> {
  let n = 0;
  while (!V.done && n < max && !(V.calm >= CALM_BOT && n > 4)) {
    tick(V);
    n++;
    if (--BUDGET <= 0) yield;
  }
}
/** 최소 톡으로 이기는 순서 (톡 수가 같으면 별 많은 쪽) · 별 길(star)이면 별 먼저. 같은 자리는 다시 안 본다 */
function* searchG(W0: World, d: StageDef, star: boolean): Generator<void, number[]> {
  const maxD = Math.min(5, W0.budget - W0.taps), full = d.stars.length;
  let best: number[] = [], bv = -Infinity, bs = -1;
  const val = (W: World, ns: number) => (star ? ns * 1000 - W.taps * 10 : -W.taps * 1000 + ns * 10) + (W.pouch.length ? 0 : 1);
  for (let D = 1; D <= maxD; D++) {
    const seen = new Map<string, number>();
    const rec = function* (W: World, seq: number[], dep: number): Generator<void, void> {
      if (W.done === 1) {
        const ns = d.stars.filter((q) => starMet(W, q)).length, v = val(W, ns);
        if (v > bv) (bv = v), (bs = ns), (best = seq.slice());
        return;
      }
      if (W.done !== 0 || dep === 0) return;
      const k = sig(W, 0), was = seen.get(k);
      if (was !== undefined && was >= dep) return;
      seen.set(k, dep);
      for (const b of tappable(W)) {
        const V = cloneWorld(W);
        if (!tapBody(V, b.id)) continue;
        yield* settleG(V);
        seq.push(b.id);
        yield* rec(V, seq, dep - 1);
        seq.pop();
      }
    };
    yield* rec(W0, [], D);
    if (best.length && (!star || bs >= full)) break;
  }
  return best;
}
const nm = (k: Kind) => (k === 'bear' ? '곰' : k === 'sack' ? '자루' : KD[k].name);
const ege = (k: Kind) => nm(k) + (GUARD(k) || k === 'cat' ? '에게' : '에');
/** 한 손길 뒤에 일어난 큰 일 — 짧게 (중요한 것 먼저) */
function effects(C: World, ev: WEv[], b: Body, fy: number): string[] {
  const out: [number, string][] = [];
  const add = (r: number, x: string) => out.some((o) => o[1] === x) || out.push([r, x]);
  for (const e of ev) {
    const o = ['squash', 'rope', 'shatter', 'launch', 'splash'].includes(e.k) ? C.b[e.i] : null;
    if (e.k === 'squash' && o) add(0, `${nm(o.k)} 납작`);
    else if (e.k === 'gate' && e.v === 1) add(1, '문 열림');
    else if (e.k === 'launch' && o?.k === 'cat' && e.v > 0.012) add(1, '고양이 슝');
    else if (e.k === 'slam') add(1, '다리 쾅');
    else if (e.k === 'splash' && o && o.k !== 'cat') add(1, '디딤돌 쿵');
    else if (e.k === 'grab') add(2, '길 열림');
    else if (e.k === 'rope') add(3, '사슬 뚝');
    else if (e.k === 'snap') add(3, '가지 뚝');
    else if (e.k === 'break') add(3, '와르르');
    else if (e.k === 'shatter' && o && o.k !== 'pot') add(3, '와장창');
  }
  if (!b.kin && b.y - fy > 0.04 && GUARD(b.k)) add(2, `${nm(b.k)} 둥실`);
  if (!b.kin && fy - b.y > 0.03 && live(b) && b.sup >= BODY && b.sup < PLANK) add(4, `${nm(C.b[b.sup - BODY].k)} 위로 쿵`);
  return out.sort((x, y) => x[0] - y[0]).map((o) => o[1]);
}
/** 지금 상태에서 끝까지 (손길마다 결과를 시뮬레이션해 둔다) */
function* hintG(W: World, stage: number, star: boolean): Generator<void, HInfo> {
  const none = (kind: 'stuck' | 'done'): HInfo => ({ kind, steps: [], moves: [] });
  const V0 = cloneWorld(W);
  V0.ev = null;
  yield* settleG(V0);
  if (V0.done === 1) return none('done');
  const p = V0.done ? [] : yield* searchG(V0, STAGES[stage], star);
  if (!p.length) return none('stuck');
  const steps: HStep[] = [], C = cloneWorld(V0);
  for (const id of p) {
    const b = C.b[id], fx = b.x, fy = b.y, fh = b.st === 1 ? FLAT_H : b.h, st0 = C.b.map((o) => o.st), on0 = C.s.map((q) => q.on);
    C.ev = [];
    const r = tapBody(C, id), val = C.ev.find((e) => e.k === 'steal' || e.k === 'give')?.v ?? 0;
    yield* settleG(C);
    const ev = C.ev;
    C.ev = null;
    steps.push({
      id, give: r === 2, val, k: b.k, fx, fy, fh, tx: b.x, ty: b.y, hw: b.hw, h: KD[b.k].h,
      flats: C.b.filter((o) => st0[o.id] === 0 && o.st === 1 && GUARD(o.k)).map((o) => o.id),
      broke: ev.filter((e) => (e.k === 'snap' || e.k === 'break') && on0[e.i]).map((e) => [e.i, e.v] as [number, number]),
      eff: effects(C, ev, b, fy),
    });
  }
  if (C.done !== 1) return none('stuck');
  // 한 수 = '주기'까지 (훔치기 → 주기, 주머니 둘이면 훔치기 → 훔치기 → 주기)
  const moves: HMove[] = [];
  let cur: HMove | null = null;
  steps.forEach((q, i) => {
    if (!cur) moves.push((cur = { steps: [], from: i }));
    cur.steps.push(q);
    if (q.give) cur = null;
  });
  return { kind: 'plan', steps, moves };
}
/** 고요할 때 조금씩 미리 계산 (전구를 눌렀는데 아직이면 조금 더 빨리) — 누르는 순간 튀지 않게.
 *  한 프레임에 쓰는 시간을 벽시계로 묶는다(보통 1ms · 눌렀는데 아직이면 4ms) — 느린 폰에서도 프레임마다 그만큼만. */
function pumpHint(s: WSState) {
  const W = s.W, r = HINT.get(s), pending = s.hintAt >= 0 && s.t >= s.hintAt && (!r || r.at !== s.hintAt || !r.info);
  if (s.phase !== 'play' || W.done || W.calm < (pending ? 10 : 30)) return;
  const key = curKey(s);
  let j = JOB.get(s);
  if (!j || j.key !== key) JOB.set(s, (j = { key, gen: hintG(W, s.stage, s.starHint), res: null }));
  if (!j.gen) return;
  const cap = pending ? 4 : 1, t0 = performance.now();
  do {
    BUDGET = 24;
    for (;;) {
      const x = j.gen.next();
      if (x.done) {
        (j.res = x.value), (j.gen = null);
        return;
      }
      if (BUDGET <= 0) break;
    }
  } while (performance.now() - t0 < cap);
}
/** 지금 보여 줄 힌트 (없으면 null). 계산이 끝나기 전엔 info 없음(전구가 생각 중). 가리킨 대로 톡하면 다음 손길로, 다른 걸 톡하면 꺼진다 */
function hintRec(s: WSState): HRec | null {
  if (s.hintAt < 0 || s.t < s.hintAt || s.phase !== 'play' || s.W.done) return null;
  let r = HINT.get(s);
  if (!r || r.at !== s.hintAt) HINT.set(s, (r = { at: s.hintAt, info: null, base: 0, k: 0, kT: s.t, ended: false }));
  if (r.ended) return null;
  if (!r.info) {
    const j = JOB.get(s);
    if (j && j.res && s.W.calm >= 10 && j.key === curKey(s)) (r.info = j.res), (r.base = s.tapLog.length), (r.k = 0), (r.kT = s.t);
    return r;
  }
  const k = s.tapLog.length - r.base;
  if (k !== r.k) {
    for (let i = r.k; i < k; i++) if (s.tapLog[r.base + i] !== r.info.steps[i]?.id) return (r.ended = true), null;
    (r.k = k), (r.kT = s.t);
  }
  if (r.info.kind === 'plan' && r.k >= r.info.steps.length) return (r.ended = true), null;
  return r;
}
const CIRC = '①②③④⑤⑥⑦⑧';
/** 한 수를 한 줄로 (≈22자) — 가능하면 '왜'(무엇이 납작·열림)까지 */
function moveText(m: HMove): string {
  const st = m.steps, give = st.find((q) => q.give), steals = st.filter((q) => !q.give);
  // '왜': 주기에서 일어난 일 먼저 (훔쳤다가 돌려주는 수에서 '둥실'은 말하지 않는다)
  const ge = give ? give.eff : [], se = steals.flatMap((q) => q.eff).filter((e) => !give || !e.endsWith('둥실'));
  const eff = (ge.length ? ge : se).slice().sort((a, b) => effRank(a) - effRank(b))[0] ?? '';
  const A = steals.map((q) => nm(q.k)).join('·'), c: string[] = [];
  if (give && !steals.length) c.push(`${ege(give.k)} 주면 ${eff}`, `훔친 무게를 ${ege(give.k)} 주기`);
  else if (give && steals.length === 1 && steals[0].id === give.id) c.push(`${A} 훔쳤다가 다시 주면 ${eff}`, `${A} 훔쳤다가 다시 주기`);
  else if (give) c.push(`${A} 훔쳐 → ${ege(give.k)} 주면 ${eff}`, `${A} 무게 훔치기 → ${ege(give.k)} 주기`, `${A} 훔쳐 → ${ege(give.k)} 주기`);
  else c.push(`${A} 훔치면 ${eff}`, `${A} 무게 훔치기`);
  return c.find((x) => !x.endsWith(' ') && x.length <= 24) ?? c[c.length - 1];
}
const effRank = (e: string) => (e.endsWith('납작') ? 0 : ['문 열림', '고양이 슝', '다리 쾅', '디딤돌 쿵'].includes(e) ? 1 : e === '길 열림' || e.endsWith('둥실') ? 2 : e.endsWith('위로 쿵') ? 4 : 3);
export function hintPlanText(s: WSState): string[] {
  // 시험용: 지금 상태에서 힌트 계산을 끝까지 돌려 수마다 한 줄 (그리기와 같은 계산)
  const g = hintG(s.W, s.stage, s.starHint);
  BUDGET = 1e9;
  let x = g.next();
  while (!x.done) x = g.next();
  const h = x.value;
  return h.kind !== 'plan' ? [h.kind] : h.moves.map((m, i) => `${CIRC[i]} ${moveText(m)}`);
}
function wrapText(ctx: C2, text: string, size: number, maxW: number): string[] {
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  const words = text.split(' '), lines: string[] = [];
  let cur = '';
  for (const wd of words) {
    const nx = cur ? cur + ' ' + wd : wd;
    if (cur && ctx.measureText(nx).width > maxW) (lines.push(cur), (cur = wd));
    else cur = nx;
  }
  if (cur) lines.push(cur);
  return lines;
}
function arrowV(ctx: C2, x: number, y: number, len: number, up: boolean, col: string, wd: number) {
  // 굵은 위/아래 화살표 (끝이 y)
  const d = up ? -1 : 1, hy = y, by = y - d * len;
  ctx.beginPath();
  ctx.moveTo(x - wd * 0.32, by);
  ctx.lineTo(x - wd * 0.32, hy - d * wd * 0.75);
  ctx.lineTo(x - wd * 0.75, hy - d * wd * 0.75);
  ctx.lineTo(x, hy);
  ctx.lineTo(x + wd * 0.75, hy - d * wd * 0.75);
  ctx.lineTo(x + wd * 0.32, hy - d * wd * 0.75);
  ctx.lineTo(x + wd * 0.32, by);
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();
  stroke(ctx, OUT, 1.6);
}
function numTag(ctx: C2, x: number, y: number, text: string, size: number, bg: string, fg: string) {
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  const tw = ctx.measureText(text).width + size * 0.7;
  ctx.fillStyle = bg;
  rr(ctx, x - tw / 2, y - size * 0.62, tw, size * 1.24, size * 0.5);
  ctx.fill();
  stroke(ctx, OUT, 1.6);
  txt(ctx, text, x, y + 1, size, fg, 900, 'center', '');
}
/** 한 손길 미리 보기: 위/아래 화살표와 ±무게 · 갈 자리(점선) · 납작될 것 · 부서질 것 */
function drawStep(ctx: C2, s: WSState, vw: V, q: HStep, main: boolean) {
  const W = s.W, lb = W.b[q.id], R = vw.R, t = vw.t;
  if (!lb || !live(lb)) return;
  // 지금 할 손길은 실제 물건 자리, 그다음 손길은 앞 손길 뒤에 있을 자리(시뮬레이션)에
  const bx = main ? lb.x : q.fx, by = main ? lb.y : q.fy, bh = main ? (lb.st === 1 ? FLAT_H : lb.h) : q.fh;
  const col = q.give ? '#ff8a3a' : '#8fdcff', x = vw.X(bx), top = baseY(vw, by + bh);
  ctx.save();
  ctx.globalAlpha *= main ? 1 : 0.62;
  // 갈 자리: 점선 그림자 + 점선 길
  if (Math.hypot(q.tx - bx, q.ty - by) > 0.03) {
    const gx = vw.X(q.tx), gb = baseY(vw, q.ty), gh = R(q.h), gw = R(q.hw * 2);
    ctx.setLineDash([R(0.012), R(0.009)]);
    ctx.lineDashOffset = -t * 0.6;
    ctx.fillStyle = q.give ? 'rgba(255,140,60,.16)' : 'rgba(150,220,255,.2)';
    rr(ctx, gx - gw / 2, gb - gh, gw, gh, R(0.012));
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    const y0 = baseY(vw, by + bh / 2), y1 = gb - gh / 2;
    ctx.strokeStyle = q.give ? 'rgba(200,80,20,.8)' : 'rgba(60,140,210,.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.quadraticCurveTo((x + gx) / 2, Math.min(y0, y1) - R(0.04), gx, y1);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // 위(훔치기) · 아래(주기) 화살표와 숫자
  const ax = clamp(x + R(q.hw) + R(0.035), R(0.03), vw.w - R(0.06)), ay = Math.max(top - R(0.02), vw.w * 0.085 + R(0.11));
  const bob = Math.sin(t * 0.2) * R(0.006) * (q.give ? 1 : -1);
  if (q.give) arrowV(ctx, ax, ay + bob, R(0.06), false, col, R(0.032));
  else arrowV(ctx, ax, ay - R(0.06) + bob, R(0.06), true, col, R(0.032));
  numTag(ctx, ax, ay - R(0.085) + bob, `${q.give ? '+' : '−'}${q.val}`, R(0.03), q.give ? '#ffe0c8' : '#e4f6ff', q.give ? '#c84a10' : '#2a6ab8');
  // 납작될 경비병 · 부서질 판
  for (const fi of q.flats) {
    const g = W.b[fi];
    if (!g || g.st !== 0) continue;
    const gx = vw.X(g.x), gy = baseY(vw, g.y) - R(g.h / 2);
    ctx.setLineDash([R(0.01), R(0.008)]);
    ctx.strokeStyle = '#e8453a';
    ctx.lineWidth = 2.6;
    ell(ctx, gx, gy, R(g.hw + 0.025), R(g.h / 2 + 0.022));
    ctx.stroke();
    ctx.setLineDash([]);
    txt(ctx, '납작!', gx, gy + R(g.h / 2 + 0.032), R(0.034), '#ffe14a', 900, 'center', 'rgba(140,30,20,.9)');
  }
  for (const [si, ld] of q.broke) {
    const p = W.s[si];
    if (!p || !p.on) continue;
    const y = vw.Y(p.y1), mx = (vw.X(p.x0) + vw.X(p.x1)) / 2;
    ctx.strokeStyle = '#e8453a';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(mx - R(0.012), y - R(0.026));
    ctx.lineTo(mx + R(0.004), y - R(0.006));
    ctx.lineTo(mx - R(0.006), y + R(0.004));
    ctx.lineTo(mx + R(0.012), y + R(0.024));
    ctx.stroke();
    capSign(ctx, clamp(mx, R(0.05), vw.w - R(0.05)), y + R(p.k === 'plank' ? 0.05 : p.k === 'twig' ? 0.03 : 0.04), R, p.cap, true, ld);
  }
  ctx.restore();
}
/** 남은 수: 물건 위 작은 ②③ 동그라미(흐리게) */
function moveDot(ctx: C2, vw: V, q: HStep, n: number, nth: number) {
  const R = vw.R, x = vw.X(q.fx - q.hw) + R(0.01) + nth * R(0.04), y = Math.max(baseY(vw, q.fy + q.fh) - R(0.012), vw.w * 0.085 + R(0.03));
  ctx.save();
  ctx.globalAlpha = 0.62;
  ctx.fillStyle = '#fffbe6';
  ell(ctx, x, y, R(0.019), R(0.019));
  ctx.fill();
  stroke(ctx, '#c89a20', 1.6);
  txt(ctx, CIRC[n] ?? String(n + 1), x, y + 1, R(0.03), '#8a5a08', 900, 'center', '');
  ctx.restore();
}
function drawHint(ctx: C2, s: WSState, v: V, vw: V) {
  const r = hintRec(s);
  if (!r || !r.info) return;
  const R = v.R, w = v.w, t = v.t, info = r.info, W = s.W, age = s.t - r.kT, press = Math.max(0, Math.sin(t * 0.16));
  ctx.save();
  ctx.globalAlpha = Math.min(1, age / 8);
  let fx = -1, fy = -1, line = '';
  if (info.kind === 'stuck') ((fx = R(RESTART.x)), (fy = R(RESTART.y))), (line = '이대로는 못 깨요 — ↺ 처음부터 다시!');
  else if (info.kind === 'done') line = '길이 열렸어요 — 고양이를 지켜봐요!';
  else {
    const mi = info.moves.findIndex((m) => r.k >= m.from && r.k < m.from + m.steps.length), m = info.moves[mi];
    // 남은 수는 ②③ 동그라미만
    const cnt = new Map<number, number>();
    for (let j = mi + 1; j < Math.min(info.moves.length, mi + 4); j++) {
      const q = info.moves[j].steps[0], c = cnt.get(q.id) ?? 0;
      cnt.set(q.id, c + 1);
      moveDot(ctx, vw, q, j, c);
    }
    // 이번 수: 아직 안 한 손길들 (뒤에서부터 그려 지금 손길이 위로)
    const rest = m.steps.slice(r.k - m.from);
    for (let j = rest.length - 1; j >= 0; j--) drawStep(ctx, s, vw, rest[j], j === 0);
    // 손가락: 세상이 가라앉은 뒤에 (바람에 실려 가는 중엔 기다림)
    const b = W.b[rest[0].id];
    if (b && live(b) && (W.calm >= 12 || r.k === 0)) {
      const q = bodyScreen(W, b.id);
      (fx = q.x * w), (fy = q.y * w);
    }
    line = `${CIRC[mi] ?? ''} ${moveText(m)}`;
  }
  if (fx >= 0) {
    ctx.strokeStyle = `rgba(255,230,90,${0.5 + press * 0.5})`;
    ctx.lineWidth = 3;
    ell(ctx, fx, fy, R(0.055 + press * 0.016), R(0.055 + press * 0.016));
    ctx.stroke();
    drawHand(ctx, fx + R(0.018), fy + R(0.018), R(0.09), press);
  }
  // 말 한 줄 (넘치면 글씨를 줄인다)
  const maxW = w - R(0.16);
  let size = R(0.038);
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  const tw = ctx.measureText(line).width;
  if (tw > maxW) size *= maxW / tw;
  const ch = R(0.058), cy = R(PANEL) - R(0.014) - ch;
  ctx.fillStyle = 'rgba(60,30,10,.3)';
  rr(ctx, R(0.02) + 2, cy + 3, w - R(0.04), ch, R(0.025));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, cy, 0, cy + ch, [0, '#fffbe6'], [1, '#ffeeb8']);
  rr(ctx, R(0.02), cy, w - R(0.04), ch, R(0.025));
  ctx.fill();
  stroke(ctx, '#c89a20', 2);
  bulbIcon(ctx, R(0.062), cy + ch / 2, R(0.019), true, t);
  txt(ctx, line, R(0.1), cy + ch / 2 + 1, size, '#4a2a10', 900, 'left', '');
  ctx.restore();
}
/** 직접 그린 전구 (유리 · 필라멘트 · 나사 받침) */
function bulbIcon(ctx: C2, x: number, y: number, r: number, lit: boolean, t: number) {
  if (lit) {
    ctx.fillStyle = radg(ctx, x, y - r * 0.2, 0, r * 2.4, [0, 'rgba(255,240,140,.85)'], [1, 'rgba(255,220,80,0)']);
    ell(ctx, x, y - r * 0.2, r * 2.4, r * 2.4);
    ctx.fill();
  }
  // 나사 받침
  ctx.fillStyle = lin(ctx, x - r * 0.5, 0, x + r * 0.5, 0, [0, '#8a8f9a'], [0.5, '#e4e6ea'], [1, '#7a7f8a']);
  rr(ctx, x - r * 0.48, y + r * 0.62, r * 0.96, r * 0.62, r * 0.14);
  ctx.fill();
  stroke(ctx, OUT, 1.2);
  ctx.strokeStyle = 'rgba(60,60,70,.6)';
  ctx.lineWidth = 1;
  for (const k of [0.82, 1.02]) {
    ctx.beginPath();
    ctx.moveTo(x - r * 0.46, y + r * k);
    ctx.lineTo(x + r * 0.46, y + r * k - r * 0.06);
    ctx.stroke();
  }
  ctx.fillStyle = '#4a4e58';
  ell(ctx, x, y + r * 1.3, r * 0.2, r * 0.12);
  ctx.fill();
  // 유리
  ctx.fillStyle = lit ? radg(ctx, x - r * 0.25, y - r * 0.35, r * 0.1, r * 1.2, [0, '#fffef0'], [0.55, '#ffe86a'], [1, '#ffc21a']) : radg(ctx, x - r * 0.25, y - r * 0.35, r * 0.1, r * 1.2, [0, '#ffffff'], [1, '#e6e0cc']);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.44, y + r * 0.64);
  ctx.quadraticCurveTo(x - r * 0.5, y + r * 0.25, x - r * 0.82, y - r * 0.1);
  ctx.arc(x, y - r * 0.3, r * 0.86, Math.PI * 0.86, Math.PI * 0.14);
  ctx.quadraticCurveTo(x + r * 0.5, y + r * 0.25, x + r * 0.44, y + r * 0.64);
  ctx.closePath();
  ctx.fill();
  stroke(ctx, OUT, 1.5);
  // 필라멘트
  ctx.strokeStyle = lit ? '#ff7a1a' : '#9a8a6a';
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.22, y + r * 0.6);
  ctx.lineTo(x - r * 0.22, y - r * 0.12);
  for (let k = 0; k <= 4; k++) ctx.lineTo(x - r * 0.22 + (k * r * 0.44) / 4, y - r * 0.12 - (k % 2 ? r * 0.16 : 0));
  ctx.lineTo(x + r * 0.22, y + r * 0.6);
  ctx.stroke();
  // 반짝
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ell(ctx, x - r * 0.42, y - r * 0.55, r * 0.14, r * 0.24, -0.5);
  ctx.fill();
  void t;
}
/** 고양이가 왜 멈췄나: 막은 것에 빨간 점선과 ! (그림만 — 시뮬레이션은 W.blk 를 적을 뿐) */
function drawBlock(ctx: C2, s: WSState, v: V) {
  const W = s.W, c = W.b[W.cat];
  if (s.phase !== 'play' || W.done || c.st !== 0 || (W.cs !== 'wait' && W.cs !== 'creak') || W.calm < 40 || W.blk === -1 || W.blk === -3 || W.blk === PLANK || isStuck(s)) return;
  const R = v.R, t = v.t, a = 0.55 + 0.45 * Math.sin(t * 0.15);
  let x0: number, x1: number, y0: number, y1: number;
  ctx.save();
  ctx.setLineDash([R(0.012), R(0.008)]);
  ctx.lineDashOffset = -t * 0.5;
  ctx.strokeStyle = `rgba(232,60,40,${a})`;
  ctx.lineWidth = 2.6;
  if (W.blk === -2) {
    // 구덩이: 고양이가 뛸 수 있는 데까지 점선 호 + ✕
    const d = c.face, sx = v.X(c.x + d * c.hw), ex = v.X(W.blkX + d * HOP), gy = baseY(v, c.y);
    ctx.beginPath();
    ctx.moveTo(sx, gy - R(0.01));
    ctx.quadraticCurveTo((sx + ex) / 2, gy - R(0.12), ex, gy + R(0.02));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 3;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(ex - R(0.014), gy + R(0.02) - sd * R(0.014));
      ctx.lineTo(ex + R(0.014), gy + R(0.02) + sd * R(0.014));
      ctx.stroke();
    }
    (x1 = (sx + ex) / 2 + R(0.02)), (y0 = gy - R(0.1));
  } else {
    if (W.blk >= BODY) {
      const o = W.b[W.blk - BODY];
      if (!o || !live(o)) return ctx.restore();
      (x0 = v.X(o.x - o.hw) - R(0.012)), (x1 = v.X(o.x + o.hw) + R(0.012)), (y1 = baseY(v, o.y) + R(0.01)), (y0 = baseY(v, o.y + (o.st === 1 ? FLAT_H : o.h)) - R(0.012));
    } else {
      const q = W.s[W.blk];
      const qx0 = Math.max(q.x0, c.x - 0.22), qx1 = Math.min(q.x1, c.x + 0.22), qy0 = Math.max(q.y0, c.y - 0.03), qy1 = Math.min(q.y1, c.y + c.h + 0.12);
      (x0 = v.X(qx0) - R(0.006)), (x1 = v.X(qx1) + R(0.006)), (y0 = baseY(v, qy1) - R(q.k === 'plank' || q.k === 'twig' ? 0.03 : 0.006)), (y1 = baseY(v, qy0) + R(0.01));
    }
    rr(ctx, x0, y0, x1 - x0, y1 - y0, R(0.016));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // ! 표
  const bx = clamp(x1, R(0.03), v.w - R(0.03)), by = Math.max(R(0.13), y0);
  ctx.fillStyle = '#e8453a';
  ell(ctx, bx, by, R(0.019), R(0.019));
  ctx.fill();
  stroke(ctx, '#ffffff', 1.6);
  txt(ctx, '!', bx, by + 1, R(0.028), '#ffffff', 900, 'center', '');
  ctx.restore();
}
/** 버티는 무게 표: 가지·판자·선반·마루·사슬 — 'N까지' (넘으면 뚝). 힌트 미리 보기에서는 실릴 무게를 빨갛게 */
function capSign(ctx: C2, x: number, y: number, R: (r: number) => number, cap: number, hot: boolean, over = -1) {
  const str = over >= 0 ? `${over} > ${cap}` : `${cap}까지`;
  ctx.font = `900 ${R(0.025)}px system-ui, sans-serif`;
  const tw = ctx.measureText(str).width + R(0.036), hh = R(0.03);
  ctx.fillStyle = hot ? '#ffd9cf' : '#fff2d2';
  rr(ctx, x - tw / 2, y - hh / 2, tw, hh, R(0.01));
  ctx.fill();
  stroke(ctx, hot ? '#c0392b' : '#7a4c2a', 1.3);
  // 금 간 판 그림
  ctx.strokeStyle = hot ? '#c0392b' : '#a8763e';
  ctx.lineWidth = 1.3;
  const ix = x - tw / 2 + R(0.012);
  ctx.beginPath();
  ctx.moveTo(ix - R(0.006), y - R(0.007));
  ctx.lineTo(ix + R(0.002), y - R(0.001));
  ctx.lineTo(ix - R(0.003), y + R(0.003));
  ctx.lineTo(ix + R(0.006), y + R(0.008));
  ctx.stroke();
  txt(ctx, str, x + R(0.006), y + 1, R(0.025), hot ? '#c0392b' : '#5a3a1a', 900, 'center', '');
}
function drawCaps(ctx: C2, s: WSState, v: V) {
  const W = s.W, R = v.R, c = W.b[W.cat];
  for (const q of W.s) {
    if (!q.on || q.cap <= 0) continue;
    const creak = W.blk === q.id && W.cs === 'creak', ld = q.load + (creak ? c.load : 0);
    const x = clamp(v.X((q.x0 + q.x1) / 2), R(0.05), v.w - R(0.05)), y = v.Y(q.y1) + R(q.k === 'plank' ? 0.05 : q.k === 'twig' ? 0.03 : 0.04);
    capSign(ctx, x, y, R, q.cap, creak, creak ? ld : -1);
  }
  for (const b of W.b) {
    if (!live(b) || b.rope < 0) continue;
    // 사슬 왼쪽에 (물건 무게 표와 겹치지 않게)
    const x = (v.X(b.ax) + v.X(b.x)) / 2 - R(0.055), y = (baseY(v, b.ay) + baseY(v, b.y + b.h)) / 2 + R(0.01);
    capSign(ctx, x, y, R, b.rope, false);
  }
}

function drawSaw(ctx: C2, s: WSState, v: V) {
  const S = s.W.saw;
  if (!S) return;
  const R = v.R, px = v.X(S.px), py = baseY(v, S.py - S.thick / 2), gy = baseY(v, 0);
  // 받침 (돌 삼각대)
  ctx.fillStyle = lin(ctx, 0, py, 0, gy, [0, '#d8cbb0'], [1, '#a8987a']);
  ctx.beginPath();
  ctx.moveTo(px, py - R(0.008));
  ctx.lineTo(px + R(0.06), gy + R(0.01));
  ctx.lineTo(px - R(0.06), gy + R(0.01));
  ctx.closePath();
  ctx.fill();
  stroke(ctx, OUT, 1.6);
  const c = Math.cos(S.th), sn = Math.sin(S.th);
  const L = S.hl * c, ax = v.X(S.px - L), bx = v.X(S.px + L), ay = baseY(v, S.py + S.hl * Math.tan(S.th) * c / c * 1) , by = 0;
  void ay;
  void by;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(S.th);
  const len = R(S.hl * 2), th = R(0.024);
  ctx.fillStyle = lin(ctx, 0, -th, 0, th, [0, '#f0c27a'], [1, '#b8803e']);
  rr(ctx, -len / 2, -th * 0.9, len, th * 1.4, th * 0.4);
  ctx.fill();
  stroke(ctx, OUT, 1.8);
  ctx.strokeStyle = 'rgba(110,70,30,.4)';
  ctx.lineWidth = 1;
  for (let k = -3; k <= 3; k++) {
    ctx.beginPath();
    ctx.moveTo(k * len * 0.14, -th * 0.8);
    ctx.lineTo(k * len * 0.14, th * 0.4);
    ctx.stroke();
  }
  ctx.fillStyle = '#6a6e78';
  ell(ctx, 0, 0, th * 0.45, th * 0.45);
  ctx.fill();
  ctx.restore();
  void sn;
  void ax;
  void bx;
  if (s.W.t - S.slamT < 14) {
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(px, py, R(0.1 + k * 0.04), -Math.PI * 0.85, -Math.PI * 0.15);
      ctx.stroke();
    }
  }
}
function drawBridge(ctx: C2, s: WSState, v: V, back: boolean) {
  const B = s.W.br;
  if (!B) return;
  const R = v.R, hx = v.X(B.hx), hy = baseY(v, 0), phi = B.a * (Math.PI / 2);
  const top = baseY(v, 0.6);
  if (back) {
    // 성문 (아치) — 길은 지나간다
    const gx0 = v.X(B.hx + 0.005), gx1 = v.X(B.hx + 0.13);
    ctx.fillStyle = lin(ctx, gx0, 0, gx1, 0, [0, '#e2cfaa'], [1, '#c4a97e']);
    ctx.fillRect(gx0, top, R(0.03), hy - top);
    ctx.fillRect(gx1 - R(0.03), top, R(0.03), hy - top);
    ctx.beginPath();
    ctx.moveTo(gx0, top + R(0.06));
    ctx.lineTo(gx0, top - R(0.02));
    ctx.lineTo(gx1, top - R(0.02));
    ctx.lineTo(gx1, top + R(0.06));
    ctx.quadraticCurveTo((gx0 + gx1) / 2, top - R(0.02), gx0, top + R(0.06));
    ctx.fill();
    stroke(ctx, OUT, 1.4);
    for (let k = 0; k < 4; k++) ctx.fillRect(gx0 + k * R(0.036), top - R(0.05), R(0.022), R(0.03));
    // 도르래
    ctx.fillStyle = '#5a606c';
    ell(ctx, v.X(B.hx + 0.03), top, R(0.016), R(0.016));
    ctx.fill();
    // 균형추 사슬
    const cw = s.W.b[B.cw];
    ctx.strokeStyle = '#5a5e68';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(v.X(cw.x), top);
    ctx.lineTo(v.X(cw.x), baseY(v, cw.y + cw.h));
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }
  const len = R(B.len), tx = hx + B.dir * Math.cos(phi) * len, ty = hy - Math.sin(phi) * len;
  // 다리 판
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(B.dir < 0 ? Math.PI + phi : -phi);
  const wgt = s.W.b[B.bb].w, heavy = wgt > s.W.b[B.bb].w0, light = wgt === 0;
  ctx.fillStyle = light ? lin(ctx, 0, -R(0.02), 0, R(0.02), [0, '#fff6ea'], [1, '#e8d6c0']) : heavy ? lin(ctx, 0, -R(0.02), 0, R(0.02), [0, '#9aa0aa'], [1, '#5a606a']) : lin(ctx, 0, -R(0.02), 0, R(0.02), [0, '#e0a868'], [1, '#9a6834']);
  rr(ctx, 0, -R(DEP * 0.8), len, R(DEP * 0.8) + R(0.016), 3);
  ctx.fill();
  stroke(ctx, OUT, 1.8);
  ctx.strokeStyle = 'rgba(80,50,20,.45)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 8; k++) {
    ctx.beginPath();
    ctx.moveTo((len * k) / 8, -R(DEP * 0.8));
    ctx.lineTo((len * k) / 8, R(0.016));
    ctx.stroke();
  }
  ctx.fillStyle = '#5a5e68';
  for (const f of [0.15, 0.85]) ctx.fillRect(len * f - 2, -R(DEP * 0.8), 4, R(DEP * 0.8) + R(0.016));
  ctx.restore();
  // 사슬: 다리 끝 → 성문 도르래
  ctx.strokeStyle = '#5a5e68';
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.moveTo(tx, ty - R(0.01));
  ctx.lineTo(v.X(B.hx + 0.03), top);
  ctx.stroke();
  ctx.setLineDash([]);
  if (s.W.t - B.slamT < 16) {
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    for (let k = 0; k < 6; k++) (ell(ctx, (hx + tx) / 2 + (k - 2.5) * R(0.05), hy - R(0.01), R(0.02), R(0.01)), ctx.fill());
  }
}
function drawRopes(ctx: C2, s: WSState, v: V) {
  for (const b of s.W.b) {
    if (!live(b) || b.rope < 0) continue;
    const x = v.X(b.ax), y0 = baseY(v, b.ay), y1 = baseY(v, b.y + b.h) - v.R(0.01);
    ctx.strokeStyle = '#8a7040';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(v.X(b.x), y1);
    ctx.stroke();
    ctx.setLineDash([]);
    // 버팀 표시: 사슬은 몇까지
    const k = b.load / Math.max(1, b.rope);
    if (k > 0.75) {
      ctx.fillStyle = 'rgba(255,90,60,.8)';
      ell(ctx, x, (y0 + y1) / 2, 3, 3);
      ctx.fill();
    }
  }
}

function drawBodies(ctx: C2, s: WSState, v: V) {
  const W = s.W, R = v.R, t = v.t;
  const list = W.b.filter((b) => live(b) && b.k !== 'bridge').sort((a, b) => a.y - b.y || (a.k === 'cat' ? 1 : -1));
  for (const b of list) {
    const x = v.X(b.x), y = baseY(v, b.y), bw = R(b.hw * 2), bh = R(b.h);
    if (b.k === 'cat') {
      const wow = s.t - s.lastWow < 40 ? 1 : 0, ca = s.t - (juice(s).memo.catch ?? -99), sq = ca >= 0 && ca < 16 ? 0.16 * Math.exp(-ca / 5) * Math.cos(ca * 0.5) : 0;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1 + sq, 1 - sq);
      drawCat(ctx, 0, 0, R(0.108), b.face, catMode(s), t, W.pouch, W.slots, wow);
      ctx.restore();
      const stuck = isStuck(s);
      if (stuck) {
        // 다시? 말풍선 (머리 긁적)
        const bx = clamp(x + R(0.06) * b.face, v.w * 0.14, v.w * 0.86), by = y - R(0.17);
        ctx.fillStyle = '#ffffff';
        rr(ctx, bx - R(0.05), by - R(0.026), R(0.1), R(0.052), R(0.026));
        ctx.fill();
        stroke(ctx, OUT, 1.6);
        txt(ctx, '다시?', bx, by + 1, R(0.034), '#e8453a', 900, 'center', '');
      } else if ((W.cs === 'wait' || W.cs === 'creak') && s.phase === 'play' && W.calm > 90 && Math.sin(t * 0.05) > -0.3) {
        // ? 말풍선
        const bx = x + R(0.05) * b.face, by = y - R(0.16);
        ctx.fillStyle = '#ffffff';
        ell(ctx, bx, by, R(0.022), R(0.022));
        ctx.fill();
        stroke(ctx, OUT, 1.2);
        txt(ctx, '?', bx, by + 1, R(0.03), '#e8453a', 900, 'center', '');
      }
      if (c0(W, b)) {
        // 둥실 고양이 비눗방울
        bubble(ctx, x, y - R(0.05), R(0.085), R(0.075), t);
      }
      continue;
    }
    const age = W.t - b.tw, pop = age >= 0 && age < 30 ? 1 + 0.28 * Math.exp(-age / 7) * Math.cos(age * 0.55) : 1;
    const light = b.w === 0, floatFree = light && b.load === 0 && b.rope < 0 && !b.kin;
    TONE = { light: light ? 0.42 : 0, heavy: b.w > b.w0 ? Math.min(0.62, 0.18 + 0.05 * (b.w - b.w0)) : 0 };
    ctx.save();
    ctx.translate(x, y);
    if (floatFree) {
      ctx.translate(Math.sin(t * 0.05 + b.id) * R(0.004), Math.sin(t * 0.07 + b.id * 2) * R(0.005));
      ctx.translate(0, -bh / 2);
      ctx.rotate(Math.sin(t * 0.045 + b.id * 3) * 0.1);
      ctx.translate(0, bh / 2);
    }
    if (TONE.heavy > 0 && b.mode === REST) ctx.translate(Math.sin(t * 1.3 + b.id) * 0.6, 0);
    ctx.scale(pop, 2 - pop);
    let zz = false;
    if (GUARD(b.k)) {
      const mode = b.st === 0 && (b.w === 0 || b.mode === FALL || b.mode === RISE) ? 1 : age >= 0 && age < 50 ? 2 : 0;
      drawGuard(ctx, b.k, bw, R(KD[b.k].h), t, b.id, mode, b.st === 1 ? 1 : 0);
      zz = mode === 0 && b.st === 0;
    } else drawThing(ctx, b.k, bw, bh, t, b.id, b.st);
    ctx.restore();
    if (zz) {
      for (let k = 0; k < 3; k++) {
        const ph = ((t * 0.012 + k / 3 + b.id * 0.17) % 1), zx = x - bw * 0.3 - ph * R(0.04) + Math.sin(ph * 6 + k) * R(0.01), zy = y - R(KD[b.k].h) * 1.05 - ph * R(0.09);
        ctx.globalAlpha = Math.sin(ph * Math.PI);
        txt(ctx, 'Z', zx, zy, R(0.026 + ph * 0.018), '#ffffff', 900, 'center', 'rgba(70,90,140,.7)');
        ctx.globalAlpha = 1;
      }
    }
    TONE = { light: 0, heavy: 0 };
    if (floatFree) {
      bubble(ctx, x, y - bh / 2, bw * 0.62 + R(0.012), Math.max(bh * 0.62, bw * 0.35) + R(0.012), t + b.id * 9);
      if (b.mode === RISE && b.vy > 0.002 && t % 5 === 0) juice(s).burst(x + (hsh(t + b.id) - 0.5) * bw * 0.6, y + R(0.01), '#e8f6ff', 2, 0.8, 1.8);
    }
    if (b.w > b.w0 && b.mode === REST && b.st === 0) {
      // 무거워서 땅이 눌린다
      ctx.strokeStyle = 'rgba(70,40,20,.45)';
      ctx.lineWidth = 1.3;
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + sd * bw * 0.5, y + 1);
        ctx.lineTo(x + sd * (bw * 0.5 + R(0.02)), y + R(0.006));
        ctx.stroke();
      }
    }
  }
}
const c0 = (_W: World, b: Body) => b.w === 0 && b.load === 0 && b.st === 0;
function bubble(ctx: C2, x: number, y: number, rx: number, ry: number, t: number) {
  ctx.save();
  ctx.fillStyle = radg(ctx, x - rx * 0.3, y - ry * 0.3, 1, Math.max(rx, ry) * 1.1, [0, 'rgba(255,255,255,.08)'], [0.8, 'rgba(200,230,255,.16)'], [1, 'rgba(255,200,255,.3)']);
  ell(ctx, x, y, rx, ry);
  ctx.fill();
  ctx.strokeStyle = `hsla(${(t * 3) % 360}, 90%, 75%, .9)`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 0.8, ry * 0.8, 0, -2.6, -1.9);
  ctx.stroke();
  const sp = (Math.sin(t * 0.12) + 1) * 0.5;
  ctx.fillStyle = `rgba(255,255,255,${0.4 + sp * 0.6})`;
  starPath(ctx, x + rx * 0.7, y - ry * 0.6, Math.max(2, rx * 0.12));
  ctx.fill();
  ctx.restore();
}

function drawPrize(ctx: C2, s: WSState, v: V) {
  const W = s.W, R = v.R, t = v.t;
  const p = W.prize;
  let x = v.X(p.x), y = baseY(v, p.y) - R(0.05) + Math.sin(t * 0.07) * R(0.006);
  if (W.done === 1) {
    const c = W.b[W.cat], a = ease(s.pt / 30);
    x = x + (v.X(c.x) - x) * a;
    y = y + (baseY(v, c.y) - R(0.2) - y) * a;
  }
  ctx.fillStyle = radg(ctx, x, y, 0, R(0.07), [0, 'rgba(255,240,150,.8)'], [1, 'rgba(255,240,150,0)']);
  ell(ctx, x, y, R(0.07), R(0.07));
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.03) * 0.25);
  ctx.translate(-x, -y);
  for (let k = 0; k < 6; k++) {
    const a = t * 0.02 + (k * TAU) / 6;
    ctx.strokeStyle = 'rgba(255,240,170,.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * R(0.045), y + Math.sin(a) * R(0.045));
    ctx.lineTo(x + Math.cos(a) * R(0.075), y + Math.sin(a) * R(0.075));
    ctx.stroke();
  }
  ctx.restore();
  drawLoot(ctx, p.k, x, y, R(0.034), t);
  for (const g of W.gems) {
    if (g.got >= 0) continue;
    const gx = v.X(g.x), gy = baseY(v, g.y) + Math.sin(t * 0.08 + g.x * 9) * R(0.006);
    ctx.fillStyle = radg(ctx, gx, gy, 0, R(0.04), [0, 'rgba(160,230,255,.7)'], [1, 'rgba(160,230,255,0)']);
    ell(ctx, gx, gy, R(0.04), R(0.04));
    ctx.fill();
    drawLoot(ctx, 'gem', gx, gy, R(0.02), t + g.x * 50);
  }
}

/** 살아 있는 세계 (아무것도 안 해도 움직이는 것) */
function drawAmbient(ctx: C2, s: WSState, v: V, front: boolean) {
  const R = (r: number) => r * v.w, t = v.t, w = v.w; // 배경에 붙은 것은 화면 단위
  if (!front) {
    if (v.ch < 2) {
      for (let k = 0; k < 3; k++) {
        const cx = (((hsh(k) * w + t * (0.12 + k * 0.05)) % (w + R(0.4))) + w + R(0.4)) % (w + R(0.4)) - R(0.2), cy = R(0.2 + k * 0.1);
        ctx.fillStyle = 'rgba(255,255,255,.88)';
        for (const [dx, dy, r] of [[0, 0, 0.05], [0.05, -0.02, 0.04], [-0.05, 0.005, 0.035], [0.09, 0.01, 0.03]]) (ell(ctx, cx + R(dx), cy + R(dy), R(r), R(r * 0.8)), ctx.fill());
      }
    }
    if (v.ch === 1) {
      // 깃발 (뒤 성탑)
      for (const [fx0, fy0, col] of [[0.12, 0.27, '#d9564a'], [0.88, 0.2, '#4f7fd9']] as [number, number, string][]) {
        const x0 = R(fx0), y0 = R(fy0);
        ctx.strokeStyle = '#6a5040';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0, y0 - R(0.07));
        ctx.stroke();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(x0, y0 - R(0.07));
        for (let k = 0; k <= 6; k++) ctx.lineTo(x0 + R(0.012 * k), y0 - R(0.07) + Math.sin(t * 0.15 + k * 0.8) * R(0.006));
        for (let k = 6; k >= 0; k--) ctx.lineTo(x0 + R(0.012 * k), y0 - R(0.04) + Math.sin(t * 0.15 + k * 0.8) * R(0.006));
        ctx.closePath();
        ctx.fill();
      }
    }
    if (v.ch === 2) {
      // 벽 촛대 (깜빡) · 햇살 먼지
      for (const x of [0.06, 0.94]) {
        const cx = R(x), cy = R(0.62);
        ctx.fillStyle = '#7a5434';
        rr(ctx, cx - R(0.012), cy, R(0.024), R(0.04), 2);
        ctx.fill();
        const fl = 1 + Math.sin(t * 0.33 + x * 9) * 0.18;
        ctx.fillStyle = radg(ctx, cx, cy - R(0.01), 0, R(0.07) * fl, [0, 'rgba(255,230,150,.6)'], [1, 'rgba(255,200,100,0)']);
        ell(ctx, cx, cy - R(0.01), R(0.07) * fl, R(0.07) * fl);
        ctx.fill();
        ctx.fillStyle = '#ffb030';
        ell(ctx, cx, cy - R(0.012), R(0.007), R(0.016) * fl);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,250,220,.55)';
      for (let k = 0; k < 14; k++) {
        const x = R(0.18 + hsh(k) * 0.7), y = R(0.5 + ((hsh(k + 3) + t * 0.0006 * (1 + (k % 3))) % 1) * 0.65);
        ell(ctx, x + Math.sin(t * 0.02 + k) * 3, y, 1.2, 1.2);
        ctx.fill();
      }
    }
    // 바람 줄기
    for (const z of s.W.wind) {
      ctx.lineCap = 'round';
      for (let k = 0; k < 10; k++) {
        const len = R(0.14 + hsh(k) * 0.1), y = baseY(v, z.y0 + 0.05 + hsh(k + 5) * Math.min(0.42, z.y1 - z.y0 - 0.1));
        const x = ((hsh(k + 9) * w + t * (2.6 + hsh(k) * 1.8)) % (w + len * 1.5)) - len;
        const path = () => {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.bezierCurveTo(x + len * 0.4, y - R(0.012), x + len * 0.7, y + R(0.01), x + len, y);
          if (k % 3 === 0) ctx.arc(x + len, y - R(0.012), R(0.012), Math.PI / 2, -Math.PI * 0.9, true);
        };
        path();
        ctx.strokeStyle = 'rgba(80,140,210,.55)';
        ctx.lineWidth = 4.5;
        ctx.stroke();
        path();
        ctx.strokeStyle = 'rgba(255,255,255,.95)';
        ctx.lineWidth = 2.4;
        ctx.stroke();
        if (k % 4 === 1) {
          ctx.save();
          ctx.translate(x + len * 1.15, y + Math.sin(t * 0.2 + k) * R(0.01));
          ctx.rotate(t * 0.15 + k);
          ctx.fillStyle = '#8ad66a';
          ell(ctx, 0, 0, R(0.01), R(0.005));
          ctx.fill();
          ctx.restore();
        }
      }
    }
    return;
  }
  if (v.ch === 0) {
    // 떨어지는 잎
    for (let k = 0; k < 4; k++) {
      const ph = (t * 0.0035 + hsh(k + 40)) % 1, lx = R(0.1 + hsh(k + 20) * 0.8) + Math.sin(ph * 12 + k) * R(0.03), ly = R(0.25) + ph * R(0.8);
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(Math.sin(ph * 10 + k) * 1.2);
      ctx.globalAlpha = Math.min(1, (1 - ph) * 4);
      ctx.fillStyle = k % 2 ? '#8ad66a' : '#c8e070';
      ell(ctx, 0, 0, R(0.009), R(0.004));
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // 나비 둘
    for (let k = 0; k < 2; k++) {
      const bx = R(0.25 + k * 0.45 + Math.sin(t * 0.011 + k * 3) * 0.12), by = baseY(v, 0.22 + k * 0.1 + Math.sin(t * 0.023 + k) * 0.05);
      const f = Math.abs(Math.sin(t * 0.35 + k));
      ctx.fillStyle = k ? '#ff9ad2' : '#ffd23a';
      for (const sd of [-1, 1]) (ell(ctx, bx + sd * R(0.008) * f, by, R(0.009) * f + 1, R(0.007)), ctx.fill());
      ctx.fillStyle = OUT;
      ctx.fillRect(bx - 0.6, by - R(0.006), 1.2, R(0.012));
    }
    // 꽃 (땅 앞쪽)
    for (const q of s.W.s) {
      if (q.k !== 'ground' || !q.on) continue;
      for (let k = 0; k < (q.x1 - q.x0) * 9; k++) {
        const x = q.x0 + 0.03 + hsh(k * 5 + q.id) * (q.x1 - q.x0 - 0.06), y = baseY(v, q.y1) + R(DEP * 0.42), sw = Math.sin(t * 0.06 + k) * R(0.004);
        ctx.strokeStyle = '#4f9e3e';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(v.X(x), y);
        ctx.lineTo(v.X(x) + sw, y - R(0.018));
        ctx.stroke();
        ctx.fillStyle = ['#ff6fa0', '#ffffff', '#ffd23a', '#9d7bff'][k % 4];
        ell(ctx, v.X(x) + sw, y - R(0.02), R(0.006), R(0.006));
        ctx.fill();
      }
    }
  }
}

/** 사건 → 연출 · 소리 (시뮬레이션은 소리를 모른다) */
function playEvents(s: WSState, v: V) {
  const fx = juice(s), R = v.R, W = s.W;
  const last = fx.memo.ev ?? s.t - 1;
  let orbs = ORBS.get(s);
  if (!orbs) ORBS.set(s, (orbs = []));
  const say = (wx: number, wy: number, text: string, col: string, size: number) => {
    let rec = SAY.get(s);
    if (!rec) SAY.set(s, (rec = []));
    const x = clamp(v.X(wx), v.w * 0.16, v.w * 0.84);
    let y = clamp(baseY(v, wy) - R(0.06), v.w * 0.24, v.pb - v.w * 0.08);
    for (let k = 0; k < 5 && rec.some((q) => s.t - q.t < 40 && Math.abs(q.x - x) < R(0.22) && Math.abs(q.y - y) < size + 4); k++) y -= size + 4;
    rec.push({ x, y, t: s.t, text, col, size });
    if (rec.length > 14) rec.shift();
  };
  for (const e of s.events) {
    if (e.t <= last) continue;
    const b = e.i >= 0 && e.i < W.b.length ? W.b[e.i] : null, X = v.X(e.x), Y = baseY(v, e.y);
    switch (e.k) {
      case 'steal': {
        const sp = sackPos(W);
        orbs.push({ x0: e.x, y0: e.y, x1: sp.x, y1: sp.y, t0: s.t, dur: 24, val: e.v, give: false });
        fx.burst(X, Y, '#ffffff', 16 + Math.min(24, e.v * 3), 3.5 + e.v * 0.25, 3);
        fx.burst(X, Y, '#bfe6ff', 14, 2.6, 2.4);
        fx.ring(X, Y, '#ffffff', R(0.1 + e.v * 0.01), 4);
        fx.ring(X, Y, '#ffd6f0', R(0.06 + e.v * 0.006), 3);
        if (b && b.k !== 'cat') {
          const gy = baseY(v, b.y);
          fx.burst(X, gy, v.ch === 0 ? '#8ad66a' : '#e0d0b0', 10 + e.v, 3, 2.4);
          fx.burst(X, gy, v.ch === 0 ? '#c9a46a' : '#c8b490', 8, 2.2, 2);
          fx.pop(X - R(0.04), gy - R(0.02), '뽁!', '#fff6dc', R(0.034));
        }
        say(e.x, e.y + 0.06, e.v >= 5 ? '슈우욱!' : '슈욱!', '#7fd8ff', R(0.046 + Math.min(0.025, e.v * 0.003)));
        fx.sound('whoosh', clamp(1.35 - e.v * 0.05, 0.6, 1.4), 1.1);
        fx.sound('swell', clamp(1.3 - e.v * 0.04, 0.7, 1.4), 0.9);
        if (e.v >= 5) fx.kick(3);
        break;
      }
      case 'give': {
        const sp = sackPos(W);
        orbs.push({ x0: sp.x, y0: sp.y, x1: e.x, y1: e.y, t0: s.t, dur: 9, val: e.v, give: true });
        fx.sound('zap', clamp(0.9 - e.v * 0.03, 0.45, 0.9), 0.9);
        break;
      }
      case 'empty':
        say(e.x, e.y, '텅~ 무게 0', '#cfe0ff', R(0.034));
        fx.sound('tick', 0.8, 0.8);
        break;
      case 'miss':
        fx.ring(X, Y, 'rgba(255,255,255,.8)', R(0.04), 2);
        fx.sound('tick', 1.3, 0.5);
        break;
      case 'land': {
        if (e.v < 0.03) break;
        const ld = b ? b.load : 1, big = clamp(e.v * 5, 0, 1);
        fx.burst(X, Y, v.ch === 0 ? '#c9a46a' : '#d8c8a8', 8 + Math.round(big * 22), 2 + big * 4, 2.6 + big * 2);
        fx.kick(Math.min(11, 1.5 + e.v * 30));
        if (big > 0.25) fx.ring(X, Y, 'rgba(255,255,255,.85)', R(0.06 + big * 0.12), 3 + big * 3);
        if (big > 0.3) say(e.x, e.y + 0.04, big > 0.75 ? '쿠웅!!' : '쿵!', '#ffcf3a', R(0.04 + big * 0.03));
        fx.sound('thud', clamp(1.35 - ld * 0.06, 0.4, 1.4), clamp(0.35 + e.v * 4, 0.3, 1.4));
        break;
      }
      case 'squash': {
        const n = s.t - (fx.memo.sqT ?? -99) < 40 ? (fx.memo.sqN ?? 0) + 1 : 0;
        fx.memo.sqT = s.t;
        fx.memo.sqN = n;
        fx.burst(X, Y, '#ffe14a', 22, 5, 3.2);
        fx.burst(X, Y, '#ffffff', 16, 4, 2.4);
        fx.ring(X, Y, '#ffe14a', R(0.18), 5);
        fx.kick(11);
        fx.blink('#fff6c0', 0.3);
        say(e.x, e.y + 0.12, n ? `납작 ×${n + 1}!` : '납작!', '#ffe14a', R(0.07 + n * 0.01));
        fx.sound('boing', 0.65 * (1 + n * 0.25), 1.2);
        fx.sound('thud', 0.5, 1.3);
        break;
      }
      case 'catsquash':
        fx.burst(X, Y, '#ffb45c', 18, 4, 3);
        fx.kick(9);
        say(e.x, e.y + 0.1, '납작…', '#ffd0c8', R(0.06));
        fx.sound('boing', 0.5, 1.1);
        break;
      case 'snap':
      case 'rope':
        fx.burst(X, Y, '#a8763e', 12, 3.5, 2.4);
        say(e.x, e.y, e.k === 'rope' ? '철컥!' : '뚝!', '#ffe9a0', R(0.048));
        fx.sound('crack', 1.25, 1);
        break;
      case 'break':
        fx.burst(X, Y, '#c8965a', 26, 5, 3.4);
        fx.kick(8);
        say(e.x, e.y + 0.05, '와르르!', '#ffb15a', R(0.06));
        fx.sound('crack', 0.8, 1.3);
        fx.sound('thud', 0.7, 1);
        break;
      case 'shatter': {
        const col = b?.k === 'chand' ? '#ffe28a' : b?.k === 'vase' ? '#8ab0ff' : b?.k === 'pot' ? '#e07a4a' : '#c8864a';
        fx.burst(X, Y, col, 26, 5.5, 3);
        fx.burst(X, Y, '#ffffff', 10, 4, 2);
        say(e.x, e.y + 0.08, '와장창!', '#ff9a5a', R(0.058));
        fx.sound('crack', 1.0, 1.3);
        break;
      }
      case 'frag':
        fx.burst(X, Y, '#8ab0ff', 18, 4, 2.4);
        say(e.x, e.y + 0.06, '쨍그랑!', '#dfe8ff', R(0.045));
        fx.sound('crack', 1.6, 1.1);
        break;
      case 'launch':
        if (b?.k === 'cat') {
          say(e.x, e.y + 0.08, '슝!', '#ff8ad8', R(0.065));
          fx.sound('whoosh', 1.5, 1.2);
          fx.sound('boing', 1.4, 0.9);
        }
        break;
      case 'sawslam':
        fx.burst(X, Y, '#d8c8a8', 14, 3, 2.4);
        fx.kick(Math.min(8, e.v * 50));
        fx.sound('thud', 0.8, clamp(e.v * 6, 0.4, 1.2));
        break;
      case 'slam':
        fx.burst(X, Y, '#e0c8a0', 30, 5, 3.4);
        fx.kick(12);
        fx.ring(X, Y, '#ffffff', R(0.2), 5);
        say(e.x, e.y + 0.06, '쾅!', '#ffcf3a', R(0.075));
        fx.sound('thud', 0.42, 1.4);
        fx.sound('crack', 0.6, 0.6);
        break;
      case 'gate':
        if (e.v === 1) {
          say(e.x, e.y + 0.05, '철컹! 열렸다', '#c8ffb0', R(0.045));
          fx.sound('chime', 0.8, 1);
        }
        fx.sound('tick', 0.6, 0.8);
        break;
      case 'bump':
        fx.sound('pop', 1.6, 0.35);
        break;
      case 'splash':
      case 'fall':
        fx.burst(X, baseY(v, -0.03), '#9adcff', 22, 4.5, 3);
        fx.burst(X, baseY(v, -0.03), '#ffffff', 10, 3.5, 2);
        say(e.x, 0.06, '풍덩!', '#6ac8ff', R(0.058));
        fx.sound('splash', clamp(1.3 - (b?.load ?? 3) * 0.05, 0.5, 1.3), 1.2);
        break;
      case 'gem':
        fx.burst(X, Y, '#9adcff', 18, 3.5, 2.6);
        say(e.x, e.y + 0.04, '보석!', '#7fe0ff', R(0.048));
        fx.sound('coin', 1.3, 1);
        break;
      case 'grab':
        fx.burst(X, Y, '#ffe14a', 30, 5, 3);
        fx.ring(X, Y, '#ffe14a', R(0.16), 5);
        say(e.x, e.y + 0.1, '훔쳤다!', '#ffe14a', R(0.065));
        fx.sound('coin', 1, 1.2);
        fx.sound('chime', 1, 1);
        break;
      case 'hop':
        fx.sound('boing', 1.7, 0.4);
        break;
      case 'clear':
        fx.sound('clear', 1, 1.1);
        fx.blink('#fff6c0', 0.25);
        break;
      case 'fail':
        fx.sound('fail', 1, 1);
        break;
      case 'restart':
        fx.sound('rewind', 1, 1);
        fx.blink('#fff6dc', 0.3);
        break;
      case 'hint':
        fx.sound('chime', 1.35, 0.8);
        fx.sound('ding', 1.8, 0.5);
        break;
      case 'vault':
        fx.sound('chime', 0.8, 1.1);
        break;
    }
  }
  fx.memo.ev = s.t;
}
function drawOrbs(ctx: C2, s: WSState, v: V) {
  const orbs = ORBS.get(s), fx = juice(s);
  if (!orbs) return;
  const R = v.R;
  for (const o of orbs) {
    const q = (s.t - o.t0) / o.dur;
    if (!o.give && s.t - o.t0 >= o.dur && (fx.memo['orb' + o.t0] ?? 0) === 0) {
      // 주머니에 쿵 — 고양이가 무게에 휘청
      fx.memo['orb' + o.t0] = 1;
      fx.memo.catch = s.t;
      fx.burst(v.X(o.x1), baseY(v, o.y1), '#ffe9a0', 12, 2.6, 2.2);
      fx.pop(v.X(o.x1), baseY(v, o.y1) - R(0.05), o.val >= 6 ? '끄응!' : '끙!', '#ffe9a0', R(0.034));
      fx.sound('thud', clamp(1.5 - o.val * 0.06, 0.6, 1.5), 0.55);
    }
    if (q < 0 || q > 1) continue;
    const e = ease(q), x = v.X(o.x0 + (o.x1 - o.x0) * e), y = baseY(v, o.y0 + (o.y1 - o.y0) * e) - Math.sin(Math.PI * e) * R(0.12);
    for (let k = 1; k <= 4; k++) {
      const e2 = ease(Math.max(0, q - k * 0.06)), x2 = v.X(o.x0 + (o.x1 - o.x0) * e2), y2 = baseY(v, o.y0 + (o.y1 - o.y0) * e2) - Math.sin(Math.PI * e2) * R(0.12);
      ctx.fillStyle = o.give ? `rgba(255,120,80,${0.5 - k * 0.1})` : `rgba(255,255,255,${0.6 - k * 0.12})`;
      ell(ctx, x2, y2, R(0.022 - k * 0.003), R(0.022 - k * 0.003));
      ctx.fill();
    }
    ctx.fillStyle = radg(ctx, x, y, 0, R(0.06), [0, o.give ? 'rgba(255,140,90,.55)' : 'rgba(255,255,255,.75)'], [1, 'rgba(255,255,255,0)']);
    ell(ctx, x, y, R(0.06), R(0.06));
    ctx.fill();
    drawTag(ctx, x, y, R(0.034 + Math.min(0.014, o.val * 0.0014)), o.val, o.give ? -1 : o.val, false);
  }
  if (orbs.length > 8) ORBS.set(s, orbs.filter((o) => s.t - o.t0 < o.dur + 2));
}

function drawTags(ctx: C2, s: WSState, v: V) {
  const W = s.W, R = v.R, t = v.t, give = W.pouch.length >= W.slots || W.pouch.length > 0;
  for (const b of tappable(W)) {
    let x: number, y: number;
    if (b.k === 'bridge' && W.br) {
      const q = bodyScreen(W, b.id);
      (x = q.x * v.w + R(0.03)), (y = q.y * v.w - R(0.05));
    } else if (b.k === 'cat') (x = v.X(b.x) + R(0.04) * b.face), (y = baseY(v, b.y) - R(0.15));
    else (x = v.X(b.x) + R(b.hw * 0.75)), (y = baseY(v, b.y + (b.st === 1 ? FLAT_H : b.h)) - R(GUARD(b.k) && b.st === 0 ? 0.05 : 0.025));
    const hot = give && s.phase === 'play' && Math.sin(t * 0.18) > 0;
    drawTag(ctx, clamp(x, R(0.04), v.w - R(0.04)), Math.max(R(0.12), y), R(0.033), b.w, b.w0, hot);
  }
}
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.12);
  ctx.rotate(-0.3);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.6, k * 0.07);
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
const LOOT_NAME: Record<PrizeK, string> = { key: '황금 열쇠', crown: '왕관', gem: '보석', cup: '황금잔', egg: '황금알', map: '보물 지도', harp: '황금 하프', bigcrown: '왕의 왕관' };

function drawHud(ctx: C2, s: WSState, v: V) {
  const R = v.R, w = v.w, d = s.d, hb = R(0.085);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, 'rgba(255,251,238,.96)'], [1, 'rgba(255,238,205,.94)']);
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(120,70,20,.35)';
  ctx.fillRect(0, hb - 1.5, w, 1.5);
  const cy = hb / 2;
  // ↺ 다시 단추 (하트는 그대로) — 막혔을 때는 반짝
  const more = s.phase === 'result' && s.got < s.d.stars.length && s.pt > 30; // 별을 놓쳤으면 결과 화면에서 ↺ = 다시 털기
  const stuck = isStuck(s) || more, pul = stuck ? 1 + 0.12 * Math.sin(s.t * 0.25) : 1, bxr = R(RESTART.x), byr = R(RESTART.y);
  if (stuck) {
    ctx.fillStyle = 'rgba(255,210,60,.55)';
    ell(ctx, bxr, byr, R(0.045) * pul * 1.25, R(0.045) * pul * 1.25);
    ctx.fill();
  }
  ctx.fillStyle = s.phase === 'play' || more ? ['#5fb44a', '#d9564a', '#8a5ad8'][d.ch] : 'rgba(120,90,60,.4)';
  ell(ctx, bxr, byr, R(0.034) * pul, R(0.034) * pul);
  ctx.fill();
  stroke(ctx, OUT, 1.6);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = R(0.008);
  ctx.beginPath();
  ctx.arc(bxr, byr, R(0.017), -Math.PI * 0.9, Math.PI * 0.6);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(bxr - R(0.026), byr - R(0.012));
  ctx.lineTo(bxr - R(0.008), byr - R(0.014));
  ctx.lineTo(bxr - R(0.018), byr + R(0.004));
  ctx.closePath();
  ctx.fill();
  const inCh = STAGES.slice(0, s.stage).filter((q) => q.ch === d.ch).length + 1;
  txt(ctx, `${d.ch + 1}-${inCh} ${d.name}`, R(0.105), cy + 1, R(0.042), '#4a2a10', 900, 'left', '', R(0.44));
  // 별 · 하트 (오른쪽 끝은 전구 자리)
  const st = String(s.stars), rx = w - R(0.105);
  ctx.font = `900 ${R(0.04)}px system-ui, sans-serif`;
  const sw = ctx.measureText(st).width;
  txt(ctx, st, rx, cy + 1, R(0.04), '#c87a08', 900, 'right', '');
  starPath(ctx, rx - sw - R(0.026), cy, R(0.021));
  ctx.fillStyle = '#ffd23a';
  ctx.fill();
  stroke(ctx, OUT, 1.2);
  drawBulb(ctx, s, v);
  for (let j = 0; j < 3; j++) {
    const hx = rx - sw - R(0.085) - j * R(0.05);
    heartPath(ctx, hx, cy, R(0.017));
    ctx.fillStyle = 2 - j < s.hearts ? lin(ctx, hx, cy - R(0.02), hx, cy + R(0.02), [0, '#ff8a95'], [1, '#e2334a']) : 'rgba(110,60,20,.15)';
    ctx.fill();
    stroke(ctx, 2 - j < s.hearts ? '#8a1a2a' : 'rgba(110,60,20,.3)', 1.3);
  }
}

/** 오른쪽 위 전구 단추: 한 번 실패하면 살랑살랑 · 15초 넘게 진전이 없거나 막히면 반짝반짝 · 힌트를 보여 주는 동안 켜짐 */
function drawBulb(ctx: C2, s: WSState, v: V) {
  const R = v.R, t = s.t, W = s.W, fx = juice(s), bx = R(BULB.x), by = R(BULB.y);
  const play = s.phase === 'play' && !W.done, hr = play ? hintRec(s) : null, on = hr !== null, think = !!hr && !hr.info;
  const idle = play && !on && s.t - Math.max(s.prog, s.stageT) > 900 && W.calm > 60, stuck = play && !on && isStuck(s), spark = idle || stuck;
  if (spark && !fx.memo.bulbSpark) fx.sound('ding', 1.7, 0.45);
  if (!fx.memo.glyph) {
    // 힌트 글자(①②③ − → ·)를 미리 한 번 그려 둔다 — 처음 누를 때 글꼴 찾느라 튀지 않게
    fx.memo.glyph = 1;
    ctx.save();
    ctx.globalAlpha = 0.01;
    txt(ctx, '①②③④⑤ −+→· 훔쳐 주면 납작 열림', -500, -500, R(0.038), '#000000', 900, 'left', '');
    ctx.restore();
  }
  fx.memo.bulbSpark = spark ? 1 : 0;
  const wob = spark ? Math.sin(t * 0.16) * 0.22 : play && !on && s.tries >= 1 ? Math.sin(t * 0.09) * 0.13 : 0;
  // 누를 수 있는 동그란 자리
  ctx.fillStyle = on ? 'rgba(255,214,60,.55)' : spark ? `rgba(255,214,60,${0.3 + 0.25 * Math.sin(t * 0.2)})` : 'rgba(255,236,180,.85)';
  ell(ctx, bx, by, R(0.036), R(0.036));
  ctx.fill();
  stroke(ctx, play ? '#c89a20' : 'rgba(150,110,40,.4)', 1.4);
  if (spark) {
    for (let k = 0; k < 8; k++) {
      const a = (k * TAU) / 8 + t * 0.03, r0 = R(0.04), r1 = R(0.052 + 0.006 * Math.sin(t * 0.25 + k));
      ctx.strokeStyle = 'rgba(255,190,30,.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(a) * r0, by + Math.sin(a) * r0);
      ctx.lineTo(bx + Math.cos(a) * r1, by + Math.sin(a) * r1);
      ctx.stroke();
    }
  }
  ctx.save();
  ctx.translate(bx, by + R(0.02));
  ctx.rotate(wob);
  ctx.globalAlpha = play ? 1 : 0.5;
  bulbIcon(ctx, 0, -R(0.022), R(0.02), on || spark, t);
  ctx.restore();
  if (think) {
    // 생각 중: 도는 점 셋 (계산을 여러 프레임에 나눠 하는 동안)
    for (let k = 0; k < 3; k++) {
      const a = t * 0.2 + (k * TAU) / 3;
      ctx.fillStyle = '#c87a08';
      ell(ctx, bx + Math.cos(a) * R(0.043), by + Math.sin(a) * R(0.043), R(0.006), R(0.006));
      ctx.fill();
    }
  }
  if (spark || (s.kbd && play)) {
    // '힌트' 말풍선 (답은 말하지 않는다) — 키보드를 쓴 적이 있으면 '(1)'
    const lab = s.kbd ? '힌트 (1)' : '힌트', ly = R(0.112), lw = s.kbd ? R(0.13) : R(0.1), lx = Math.min(bx - R(0.02), v.w - lw / 2 - R(0.01));
    ctx.globalAlpha = spark ? 1 : 0.8;
    ctx.fillStyle = '#fffbe6';
    rr(ctx, lx - lw / 2, ly - R(0.018), lw, R(0.036), R(0.018));
    ctx.fill();
    stroke(ctx, '#c89a20', 1.4);
    ctx.fillStyle = '#fffbe6';
    ctx.beginPath();
    ctx.moveTo(bx - R(0.004), ly - R(0.018));
    ctx.lineTo(bx + R(0.006), ly - R(0.036));
    ctx.lineTo(bx + R(0.014), ly - R(0.018));
    ctx.fill();
    txt(ctx, lab, lx, ly + 1, R(0.028), '#8a5a08', 900, 'center', '');
    ctx.globalAlpha = 1;
  }
}

function drawPanel(ctx: C2, s: WSState, v: V) {
  const R = v.R, w = v.w, W = s.W, d = s.d, py = R(PANEL), ph = v.h - py, t = v.t;
  ctx.fillStyle = lin(ctx, 0, py, 0, v.h, [0, '#8a5a32'], [1, '#6a4022']);
  ctx.fillRect(0, py, w, ph);
  ctx.fillStyle = 'rgba(255,220,160,.25)';
  ctx.fillRect(0, py, w, 2);
  ctx.strokeStyle = 'rgba(40,20,5,.25)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(0, py + (ph * k) / 4);
    ctx.lineTo(w, py + (ph * k) / 4);
    ctx.stroke();
  }
  // ── 주머니 ──
  const bx = R(0.02), bw = R(0.26), by = py + R(0.018), bh = ph - R(0.036);
  ctx.fillStyle = 'rgba(255,240,210,.92)';
  rr(ctx, bx, by, bw, bh, R(0.025));
  ctx.fill();
  stroke(ctx, OUT, 1.5);
  txt(ctx, W.slots > 1 ? '주머니 ×2' : '주머니', bx + bw / 2, by + R(0.026), R(0.036), '#7a4a20', 900, 'center', '');
  const sum = W.pouch.reduce((a, c) => a + c, 0);
  for (let j = 0; j < W.slots; j++) {
    const val = W.pouch[j] ?? 0, cx = bx + bw * (W.slots > 1 ? 0.28 + j * 0.44 : 0.5), cy = by + bh * 0.62, r = R(W.slots > 1 ? 0.045 : 0.058) * (val ? 1 + Math.min(0.2, val * 0.015) : 0.85);
    ctx.fillStyle = val ? lin(ctx, cx, cy - r, cx, cy + r, [0, '#e8c890'], [1, '#b0803e']) : 'rgba(180,150,110,.25)';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.3, cy - r);
    ctx.quadraticCurveTo(cx - r * 1.15, cy - r * 0.5, cx - r * 0.95, cy + r * 0.45);
    ctx.quadraticCurveTo(cx, cy + r * 1.1, cx + r * 0.95, cy + r * 0.45);
    ctx.quadraticCurveTo(cx + r * 1.15, cy - r * 0.5, cx + r * 0.3, cy - r);
    ctx.closePath();
    ctx.fill();
    if (val) stroke(ctx, OUT, 1.5);
    else {
      ctx.setLineDash([3, 3]);
      stroke(ctx, 'rgba(120,80,40,.5)', 1.3);
      ctx.setLineDash([]);
    }
    if (val) txt(ctx, String(val), cx, cy + r * 0.15, Math.max(R(0.036), r * 0.75), '#4a2a10', 900, 'center', 'rgba(255,240,200,.9)');
    else txt(ctx, '빈칸', cx, cy + r * 0.1, R(0.036), 'rgba(120,80,40,.6)', 800, 'center', '');
  }
  if (sum && s.phase === 'play' && Math.sin(t * 0.18) > 0) {
    ctx.strokeStyle = '#ffe14a';
    ctx.lineWidth = 2.5;
    rr(ctx, bx - 1, by - 1, bw + 2, bh + 2, R(0.026));
    ctx.stroke();
  }
  // ── 별 조건 ──
  const mx = R(0.31), mw = R(0.42);
  ctx.fillStyle = 'rgba(255,248,230,.94)';
  rr(ctx, mx, by, mw, bh, R(0.025));
  ctx.fill();
  stroke(ctx, OUT, 1.5);
  const lh = Math.min(R(0.046), (bh - R(0.05)) / Math.max(3, d.stars.length));
  d.stars.forEach((q, j) => {
    const ly = by + R(0.026) + j * lh, ok = s.phase === 'result' ? s.starOk[j] : q.k === 'taps' ? W.taps <= q.n : q.k === 'empty' ? W.pouch.length === 0 : q.k === 'gem' ? W.gems.every((g) => g.got >= 0) : q.k === 'flat' ? W.b.every((b) => !GUARD(b.k) || b.st === 1) : false;
    starPath(ctx, mx + R(0.03), ly, R(0.016));
    ctx.fillStyle = s.phase === 'result' && ok ? '#ffd23a' : q.k === 'clear' ? '#ffe9a0' : ok ? '#fff1b8' : 'rgba(120,80,40,.18)';
    ctx.fill();
    stroke(ctx, OUT, 1);
    let label = q.label;
    if (q.k === 'taps') label += ` (${Math.min(W.taps, 99)})`;
    txt(ctx, label, mx + R(0.052), ly + 1, R(0.036), '#4a2a10', 800, 'left', '', mw - R(0.06));
  });
  // 남은 톡 (발바닥)
  const left = Math.max(0, W.budget - W.taps), py2 = by + bh - R(0.02);
  txt(ctx, `톡 ${left}`, mx + R(0.012), py2, R(0.036), left <= 2 ? '#d0402a' : '#8a5a2a', 900, 'left', '');
  for (let j = 0; j < W.budget; j++) {
    const px = mx + R(0.105) + j * R(0.024);
    if (px > mx + mw - R(0.012)) break;
    ctx.fillStyle = j < left ? (left <= 2 ? '#e8453a' : '#c8803e') : 'rgba(120,80,40,.2)';
    ell(ctx, px, py2 + R(0.004), R(0.008), R(0.007));
    ctx.fill();
    for (const [dx, dy] of [[-0.008, -0.009], [0, -0.012], [0.008, -0.009]]) (ell(ctx, px + R(dx), py2 + R(dy), R(0.0035), R(0.0035)), ctx.fill());
  }
  // ── 비밀 창고 ──
  const sx = R(0.745), sw2 = w - sx - R(0.02);
  ctx.fillStyle = lin(ctx, 0, by, 0, by + bh, [0, '#4a3a5a'], [1, '#2e2238']);
  rr(ctx, sx, by, sw2, bh, R(0.025));
  ctx.fill();
  stroke(ctx, OUT, 1.5);
  txt(ctx, '비밀 창고', sx + sw2 / 2, by + R(0.024), R(0.034), '#ffe9a0', 900, 'center', '');
  const n = s.stash.length + s.gemN;
  for (let j = 0; j < Math.min(12, s.stash.length); j++) {
    const col = j % 4, row = Math.floor(j / 4);
    drawLoot(ctx, s.stash[j], sx + R(0.03) + col * R(0.05), by + R(0.058) + row * R(0.04), R(0.018), -1);
  }
  if (s.gemN) {
    drawLoot(ctx, 'gem', sx + sw2 - R(0.04), by + bh - R(0.022), R(0.013), -1);
    txt(ctx, `×${s.gemN}`, sx + sw2 - R(0.02), by + bh - R(0.02), R(0.034), '#c8f4ff', 900, 'center', '');
  }
  if (!n) txt(ctx, '아직 텅', sx + sw2 / 2, by + bh * 0.6, R(0.036), 'rgba(255,233,160,.55)', 800, 'center', '');
}

function drawOverlays(ctx: C2, s: WSState, v: V, vw: V) {
  const R = v.R, w = v.w, W = s.W, d = s.d, t = v.t, fx = juice(s);
  // 시작 카드 + 새것 스포트라이트 (새 장치 한 줄은 숫자까지 — 두 줄까지, 조금 더 오래)
  const bn = s.banner, age = bn ? t - bn.t : 999, isNew = !!bn && d.spot !== null && s.tries === 0 && s.stage > 0 && bn.sub === d.news;
  const BT = isNew ? BANNER_T + 80 : BANNER_T;
  if (bn && s.phase === 'play' && age < BT) {
    const a = Math.min(1, age / 8, (BT - age) / 25);
    if (d.spot && s.tries === 0) {
      const [sx, sy, sr] = d.spot, pul = 1 + 0.05 * Math.sin(t * 0.2);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#ffd23a';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([9, 6]);
      ctx.lineDashOffset = -t * 0.8;
      ell(ctx, vw.X(sx), baseY(vw, sy), vw.R(sr) * pul, vw.R(sr) * pul * 0.8);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = a;
    const pop = Math.min(1, 0.6 + age / 10), fs = R(0.036), nw = 0;
    const lines = bn.sub ? wrapText(ctx, bn.sub, fs, w - R(0.18) - nw).slice(0, 2) : [];
    ctx.font = `900 ${R(0.05)}px system-ui, sans-serif`;
    const w1 = ctx.measureText(bn.head).width;
    ctx.font = `900 ${fs}px system-ui, sans-serif`;
    const w2 = lines.length ? Math.max(...lines.map((l) => ctx.measureText(l).width)) + R(0.06) + nw : 0;
    const cw = Math.min(w - R(0.06), Math.max(w1, w2) + R(0.08)), ch = R(0.08) + lines.length * fs * 1.3, cy = R(0.1) + ch / 2;
    ctx.translate(w / 2, cy);
    ctx.scale(pop, pop);
    ctx.fillStyle = 'rgba(60,30,10,.3)';
    rr(ctx, -cw / 2 + 3, -ch / 2 + 4, cw, ch, R(0.03));
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [0, '#fffaf0'], [1, '#ffe8c0']);
    rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.03));
    ctx.fill();
    stroke(ctx, '#8a5a20', 2.2);
    txt(ctx, bn.head, 0, -ch / 2 + R(0.042), R(0.05), '#2a5a9a', 900, 'center', '', cw - R(0.04));
    if (isNew) {
      // 왼쪽 위 모서리 딱지
      ctx.save();
      ctx.translate(-cw / 2 + R(0.035), -ch / 2 + R(0.004));
      ctx.rotate(-0.18);
      ctx.fillStyle = '#ff5a3a';
      rr(ctx, -R(0.04), -R(0.019), R(0.08), R(0.038), R(0.019));
      ctx.fill();
      stroke(ctx, '#ffffff', 1.6);
      txt(ctx, 'NEW', 0, 1, R(0.03), '#ffffff', 900, 'center', '');
      ctx.restore();
    }
    if (lines.length) {
      const ly0 = -ch / 2 + R(0.08) + fs * 0.62;
      lines.forEach((ln, j) => txt(ctx, ln, nw / 2, ly0 + j * fs * 1.3, fs, '#7a3a10', 900, 'center', '', cw - R(0.06) - nw));
    }
    ctx.restore();
  }
  // 손가락 안내 (첫 두 판의 안내) — 막힘 힌트(전구)를 보여 주는 동안은 그것만
  if (hintRec(s)) drawHint(ctx, s, v, vw);
  else if (s.phase === 'play' && !W.done) {
    let tip = '', target = -1;
    const hint = d.hints[W.taps];
    if (isStuck(s)) tip = '막혔어요 — 왼쪽 위 ↺ 다시 · 전구 = 힌트';
    else if (hint && s.tries < 2) {
      tip = hint[1];
      target = W.b.findIndex((b) => b.k === hint[0] && live(b));
    } else if (W.pouch.length) tip = W.pouch.length < W.slots ? `하나 더 훔치거나 · 무게 0인 것을 톡 = 주기` : `훔친 무게 ${W.pouch.reduce((a, c) => a + c, 0)} — 줄 물건을 톡!`;
    if (tip) {
      const ty = R(PANEL - 0.04);
      ctx.font = `900 ${R(0.037)}px system-ui, sans-serif`;
      const tw = Math.min(w - R(0.04), ctx.measureText(tip).width + R(0.06));
      ctx.fillStyle = 'rgba(58,38,24,.72)';
      rr(ctx, w / 2 - tw / 2, ty - R(0.024), tw, R(0.048), R(0.024));
      ctx.fill();
      txt(ctx, tip, w / 2, ty + 1, R(0.037), hint ? '#fff27a' : '#fff6dc', 900, 'center', '', tw - R(0.03));
    }
    if (target >= 0) {
      const q = bodyScreen(W, target), press = Math.max(0, Math.sin(t * 0.16));
      ctx.strokeStyle = `rgba(255,255,255,${0.4 + press * 0.5})`;
      ctx.lineWidth = 2.5;
      ell(ctx, v.X(q.x), q.y * w, R(0.06 + press * 0.015), R(0.06 + press * 0.015));
      ctx.stroke();
      drawHand(ctx, v.X(q.x) + R(0.02), q.y * w + R(0.02), R(0.085), press);
    }
  }
  // 결과 · 실패 카드
  if (s.phase === 'result' || s.phase === 'fail') {
    const a = Math.min(1, s.pt / 10), ok = s.phase === 'result';
    ctx.save();
    ctx.globalAlpha = a * 0.35;
    ctx.fillStyle = '#2a1a10';
    ctx.fillRect(0, R(0.085), w, R(PANEL - 0.085));
    ctx.globalAlpha = a;
    const miss = ok && s.got < d.stars.length, cw = R(0.82), ch = ok ? R(miss ? 0.61 : 0.56) : R(0.3), cx = w / 2, cy = R(ok ? 0.6 : 0.62), pop = Math.min(1, 0.7 + s.pt / 14);
    ctx.translate(cx, cy);
    ctx.scale(pop, pop);
    ctx.fillStyle = 'rgba(60,30,10,.35)';
    rr(ctx, -cw / 2 + 4, -ch / 2 + 6, cw, ch, R(0.04));
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [0, '#fffaf0'], [1, '#ffe6b8']);
    rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.04));
    ctx.fill();
    stroke(ctx, '#8a5a20', 2.6);
    if (ok) {
      txt(ctx, `${LOOT_NAME[d.prize.k]} 훔쳤다!`, 0, -ch / 2 + R(0.05), R(0.054), '#d0500a', 900, 'center', '', cw - R(0.06));
      if (s.hintSt > 0) {
        // 힌트를 써도 별은 그대로 — 몇 번 썼는지만 작게
        ctx.font = `800 ${R(0.028)}px system-ui, sans-serif`;
        const hw2 = ctx.measureText(`힌트 ${s.hintSt}번`).width;
        bulbIcon(ctx, cw / 2 - R(0.045) - hw2, -ch / 2 + R(0.103), R(0.011), false, s.t);
        txt(ctx, `힌트 ${s.hintSt}번`, cw / 2 - R(0.03), -ch / 2 + R(0.107), R(0.028), '#a08060', 800, 'right', '');
      }
      // 별
      const nS = d.stars.length;
      for (let j = 0; j < 3; j++) {
        if (j >= nS) continue;
        const ag = s.pt - (14 + j * 14), sx = (j - (nS - 1) / 2) * R(0.13), sy = -ch / 2 + R(0.135);
        const popS = ag < 0 ? 0.7 : ag < 8 ? 2 - (ag / 8) : 1, on = ag >= 0 && s.starOk[j];
        starPath(ctx, sx, sy, R(0.045) * popS);
        ctx.fillStyle = on ? lin(ctx, sx, sy - R(0.05), sx, sy + R(0.05), [0, '#fff1a0'], [1, '#ffb21a']) : 'rgba(90,50,20,.15)';
        ctx.fill();
        stroke(ctx, on ? '#9a5a08' : 'rgba(90,50,20,.35)', 2);
        const key = 'st' + j;
        if (ag >= 0 && (fx.memo[key] ?? -1) !== s.t - ag) {
          if ((fx.memo[key] ?? -999) < s.t - ag - 1 && on) {
            fx.burst(cx + sx, cy + sy, '#ffd23a', 18, 3.5, 2.6);
            fx.sound('ding', 1 + j * 0.25, 1);
          }
          fx.memo[key] = s.t - ag;
        }
      }
      d.stars.forEach((q, j) => {
        const ly = -ch / 2 + R(0.21) + j * R(0.042), on = s.starOk[j] && s.pt > 14 + j * 14;
        txt(ctx, `${on ? '✓' : '·'} ${q.label}`, -cw / 2 + R(0.06), ly, R(0.037), on ? '#3a8a2a' : '#9a7a5a', 800, 'left', '', cw - R(0.1));
      });
      // 창고에 쌓임
      const gy = -ch / 2 + R(0.36);
      ctx.fillStyle = 'rgba(74,58,90,.9)';
      rr(ctx, -cw / 2 + R(0.04), gy - R(0.035), cw - R(0.08), R(0.07), R(0.03));
      ctx.fill();
      drawLoot(ctx, d.prize.k, -cw / 2 + R(0.1), gy, R(0.026), s.t);
      txt(ctx, s.replay ? `다시 털기 · 이 판 별 ${s.best[s.stage]}/${d.stars.length}` : `비밀 창고 +1 · 보물 ${s.stash.length}${s.gemN ? ` · 보석 ${s.gemN}` : ''}`, -cw / 2 + R(0.15), gy + 1, R(0.036), '#ffe9a0', 900, 'left', '', cw - R(0.2));
      if (miss) {
        // 별을 놓쳤으면: 다시 털기에서 전구가 별 길을 알려 준다
        const my = gy + R(0.065);
        txt(ctx, '★ 더 받는 법도 전구로 볼 수 있어요 — 왼쪽 위 ↺', 0, my, R(0.032), '#c06a08', 900, 'center', '', cw - R(0.06));
      }
      // 다음에 풀릴 것
      const nx = s.stage + 1 < STAGES.length ? STAGES[s.stage + 1] : null, ny = ch / 2 - R(0.075);
      if (nx) {
        const newCh = nx.ch !== d.ch;
        txt(ctx, newCh ? `🔓 ${nx.ch + 1}장 ${CH_NAME[nx.ch]} 열림!  ♥+1` : `다음 판 🔓 ${nx.name}`, 0, ny - R(0.012), R(0.036), newCh ? '#d0402a' : '#2a5a9a', 900, 'center', '', cw - R(0.06));
        if (nx.news) txt(ctx, nx.news, 0, ny + R(0.035), R(0.035), '#7a5a3a', 700, 'center', '', cw - R(0.06));
      } else txt(ctx, `성 털기 끝! 별 ${s.stars}개 · 보물 ${s.stash.length}개`, 0, ny, R(0.04), '#d0402a', 900, 'center', '', cw - R(0.06));
    } else {
      txt(ctx, s.why || '으앗!', 0, -R(0.06), R(0.05), '#c0392b', 900, 'center', '', cw - R(0.06));
      txt(ctx, s.hearts > 0 ? '하트 -1 · 같은 판 다시!' : '하트가 없어요 — 끝', 0, R(0.02), R(0.036), '#6a4a2a', 800, 'center', '');
      txt(ctx, '같은 판은 늘 똑같아요 — 순서를 바꿔 봐요', 0, R(0.08), R(0.036), '#9a7a5a', 700, 'center', '', cw - R(0.06));
    }
    ctx.restore();
  }
}

/** 장 끝 보상: 고양이의 비밀 창고 — 이번 장 보물이 하나씩 떨어져 쌓이고, 고양이가 보물 위에서 뒹군다 */
function vaultPos(i: number, cx: number, fy: number, R: (r: number) => number): [number, number] {
  let r = 0, base = 0;
  for (let cap = 7; cap >= 1; cap--, r++) {
    if (i < base + cap) {
      const c = i - base;
      return [cx + (c - (cap - 1) / 2) * R(0.088) + (r % 2) * R(0.01), fy - R(0.03) - r * R(0.07)];
    }
    base += cap;
  }
  return [cx, fy - R(0.4)];
}
function silhouette(ctx: C2, ch: number, x: number, y: number, u: number) {
  ctx.fillStyle = '#2a1c38';
  if (ch === 1) {
    ctx.fillRect(x - u, y - u * 0.55, u * 2, u * 0.55);
    for (let k = 0; k < 6; k++) ctx.fillRect(x - u + k * u * 0.36, y - u * 0.68, u * 0.2, u * 0.14);
    ctx.fillRect(x - u * 1.05, y - u * 1.05, u * 0.42, u * 1.05);
    ctx.fillRect(x + u * 0.63, y - u * 1.05, u * 0.42, u * 1.05);
    for (const tx of [-0.84, 0.84]) {
      ctx.beginPath();
      ctx.moveTo(x + tx * u - u * 0.28, y - u * 1.05);
      ctx.lineTo(x + tx * u, y - u * 1.5);
      ctx.lineTo(x + tx * u + u * 0.28, y - u * 1.05);
      ctx.fill();
    }
    ctx.fillStyle = '#4a3a5a';
    ctx.fillRect(x - u * 0.3, y - u * 0.4, u * 0.6, u * 0.06);
  } else {
    ctx.fillRect(x - u * 0.45, y - u * 1.4, u * 0.9, u * 1.4);
    ctx.beginPath();
    ctx.moveTo(x - u * 0.6, y - u * 1.4);
    ctx.lineTo(x, y - u * 2.05);
    ctx.lineTo(x + u * 0.6, y - u * 1.4);
    ctx.fill();
    ctx.strokeStyle = '#4a3a5a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - u * 0.75, u * 0.22, 0, Math.PI);
    ctx.stroke();
  }
  txt(ctx, '?', x, y - u * 0.75, u * 0.6, '#ffe9a0', 900, 'center', 'rgba(20,10,30,.8)');
}
function drawVault(ctx: C2, s: WSState, v: V) {
  const R = v.R, w = v.w, t = s.t, pt = s.pt, fx = juice(s), top = R(0.085), bot = v.pb, fy = bot - R(0.1);
  // 따뜻한 굴 방
  ctx.fillStyle = lin(ctx, 0, top, 0, bot, [0, '#7a4a3a'], [0.55, '#a8683e'], [1, '#6a3e22']);
  ctx.fillRect(0, top, w, bot - top);
  ctx.fillStyle = radg(ctx, w / 2, fy - R(0.25), 0, R(0.75), [0, 'rgba(255,220,140,.55)'], [1, 'rgba(255,200,120,0)']);
  ctx.fillRect(0, top, w, bot - top);
  for (let k = 0; k < 30; k++) {
    const x = hsh(k) * w, y = top + hsh(k + 9) * (fy - top), r = R(0.03 + hsh(k + 3) * 0.04);
    ctx.fillStyle = `rgba(80,40,20,${0.12 + hsh(k + 5) * 0.1})`;
    ell(ctx, x, y, r, r * 0.7);
    ctx.fill();
  }
  // 벽 장식: 보물 지도 · 별 깃발
  ctx.save();
  ctx.translate(R(0.16), top + R(0.36));
  ctx.rotate(-0.08);
  ctx.fillStyle = '#f6e6b8';
  rr(ctx, -R(0.09), -R(0.065), R(0.18), R(0.13), R(0.01));
  ctx.fill();
  stroke(ctx, OUT, 1.6);
  ctx.strokeStyle = '#d8303a';
  ctx.lineWidth = R(0.008);
  ctx.setLineDash([R(0.012), R(0.01)]);
  ctx.beginPath();
  ctx.moveTo(-R(0.06), R(0.03));
  ctx.quadraticCurveTo(0, -R(0.06), R(0.05), R(0.01));
  ctx.stroke();
  ctx.setLineDash([]);
  txt(ctx, 'X', R(0.055), R(0.012), R(0.04), '#d8303a', 900, 'center', '');
  ctx.restore();
  // 등불 둘
  for (const lx of [0.08, 0.92]) {
    const x = R(lx), y = top + R(0.14), fl = 1 + Math.sin(t * 0.3 + lx * 9) * 0.1;
    ctx.fillStyle = radg(ctx, x, y, 0, R(0.3) * fl, [0, 'rgba(255,230,150,.7)'], [1, 'rgba(255,200,100,0)']);
    ell(ctx, x, y, R(0.3) * fl, R(0.3) * fl);
    ctx.fill();
    ctx.strokeStyle = '#3a2010';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, y - R(0.03));
    ctx.stroke();
    ctx.fillStyle = '#ffd36a';
    rr(ctx, x - R(0.022), y - R(0.03), R(0.044), R(0.06), R(0.012));
    ctx.fill();
    stroke(ctx, OUT, 1.6);
  }
  // 바닥 · 융단
  ctx.fillStyle = lin(ctx, 0, fy, 0, bot, [0, '#9a6a3e'], [1, '#6a4424']);
  ctx.fillRect(0, fy, w, bot - fy);
  ctx.fillStyle = '#c0392b';
  ell(ctx, w / 2, fy + R(0.045), R(0.4), R(0.04));
  ctx.fill();
  ctx.strokeStyle = '#f2c44c';
  ctx.lineWidth = 2;
  ell(ctx, w / 2, fy + R(0.045), R(0.36), R(0.03));
  ctx.stroke();
  // 금화 무더기 (훔친 보물이 많을수록 높게)
  const cx = w / 2, nThis = STAGES.filter((q) => q.ch === s.d.ch).length, n = s.stash.length, before = Math.max(0, n - nThis);
  const heap = R(0.06 + Math.min(0.12, n * 0.007));
  ctx.fillStyle = lin(ctx, 0, fy - heap, 0, fy, [0, '#fff1a0'], [0.5, '#ffc83a'], [1, '#c88a10']);
  ctx.beginPath();
  ctx.moveTo(cx - R(0.36), fy + R(0.01));
  ctx.quadraticCurveTo(cx, fy - heap * 2.2, cx + R(0.36), fy + R(0.01));
  ctx.closePath();
  ctx.fill();
  stroke(ctx, '#8a5a08', 1.6);
  for (let k = 0; k < 26; k++) {
    const u2 = hsh(k + 30) * 2 - 1, x = cx + u2 * R(0.32), y = fy - (1 - u2 * u2) * heap * 1.05 + hsh(k + 7) * R(0.02);
    ctx.fillStyle = '#ffe680';
    ell(ctx, x, y, R(0.016), R(0.008));
    ctx.fill();
    stroke(ctx, '#b07a10', 1);
  }
  // 보물: 이번 장 것은 하나씩 떨어져 쌓인다
  let landed = 0;
  const gy0 = fy - heap * 0.9;
  for (let i = 0; i < n; i++) {
    const [px, py0] = vaultPos(i, cx, gy0, R), py = py0;
    let y = py, sc = 1;
    if (i >= before) {
      const j = i - before, t0 = 24 + j * 18, q = (pt - t0) / 18;
      if (q < 0) continue;
      if (q < 1) y = top - R(0.05) + (py - top + R(0.05)) * q * q;
      else {
        landed++;
        const b2 = q - 1;
        if (b2 < 0.6) (y = py - Math.sin((b2 / 0.6) * Math.PI) * R(0.035)), (sc = 1 + 0.18 * (1 - b2 / 0.6));
        const key = 'vl' + i;
        if (!fx.memo[key]) {
          fx.memo[key] = 1;
          fx.burst(px, py, '#ffe14a', 18, 3.8, 2.8);
          fx.sound('coin', 1 + j * 0.12, 1.1);
          fx.kick(2.5);
        }
      }
    } else landed++;
    ctx.fillStyle = 'rgba(255,240,170,.35)';
    ell(ctx, px, y, R(0.045) * sc, R(0.045) * sc);
    ctx.fill();
    drawLoot(ctx, s.stash[i], px, y, R(0.042) * sc, t + i * 7);
  }
  for (let k = 0; k < Math.min(24, s.gemN * 3); k++) drawLoot(ctx, 'gem', cx + (hsh(k + 61) - 0.5) * R(0.62), fy + R(0.015), R(0.018), t + k * 13);
  // 고양이 방석 · 고양이: 다 쌓이면 보물 위에서 데굴데굴
  ctx.fillStyle = '#7a4ab8';
  ell(ctx, R(0.84), fy + R(0.01), R(0.09), R(0.03));
  ctx.fill();
  const allIn = pt > 24 + nThis * 18 + 24;
  const [tx, ty] = vaultPos(Math.max(0, n - 1), cx, gy0, R);
  ctx.save();
  if (allIn) {
    ctx.translate(tx, ty - R(0.06));
    ctx.rotate(Math.sin(t * 0.12) * 0.9);
    drawCat(ctx, 0, R(0.04), R(0.13), 1, 'win', t, [], 1, 1);
    if (Math.floor(t / 30) !== Math.floor((t - 1) / 30)) fx.sound('boing', 1.3, 0.5);
  } else drawCat(ctx, R(0.84), fy, R(0.14), -1, 'win', t, [], 1, 1);
  ctx.restore();
  // 글
  const won = s.won;
  txt(ctx, won ? '성 털기 끝! 모든 보물을 훔쳤다!' : `${s.d.ch + 1}장 ${CH_NAME[s.d.ch]} 털기 끝!`, w / 2, top + R(0.065), R(0.062), '#ffe14a', 900, 'center', '#2a1a10', w - R(0.06));
  txt(ctx, `고양이의 비밀 창고 · 보물 ${landed}개${s.gemN ? ` · 보석 ${s.gemN}` : ''} · 별 ${s.stars}`, w / 2, top + R(0.13), R(0.038), '#fff6dc', 800, 'center', '#2a1a10', w - R(0.06));
  if (!won) {
    const nc = s.d.ch + 1, bx = w - R(0.2), by = top + R(0.47);
    ctx.fillStyle = 'rgba(40,20,40,.35)';
    rr(ctx, bx - R(0.16), by - R(0.3), R(0.32), R(0.37), R(0.03));
    ctx.fill();
    stroke(ctx, 'rgba(255,230,160,.6)', 1.6);
    silhouette(ctx, nc, bx, by, R(0.1));
    txt(ctx, `다음: ${nc + 1}장 ${CH_NAME[nc]}`, bx, by + R(0.035), R(0.036), '#ffe9a0', 900, 'center', '#2a1a10');
    txt(ctx, '♥ +1', bx, by - R(0.25), R(0.038), '#ff8a95', 900, 'center', '#2a1a10');
  } else if (t % 24 === 0) {
    fx.burst(R(0.15 + hsh(t) * 0.7), top + R(0.15 + hsh(t + 3) * 0.3), ['#ffe14a', '#ff8ad8', '#7fd8ff'][(t / 24) % 3 | 0], 26, 4.5, 2.6);
    fx.sound('pop', 0.8 + hsh(t) * 0.6, 0.8);
  }
  if (pt > 70) txt(ctx, '톡 하면 계속', w / 2, bot - R(0.035), R(0.036), '#fff6dc', 800, 'center', '#2a1a10');
}

function drawAll(ctx: CanvasRenderingContext2D, s: WSState, w: number, h: number, th: Theme) {
  void th;
  pumpHint(s); // 힌트·막힘 계산을 조금씩 (그리기 쪽에서만)
  const d = s.d, t = s.t, z = s.W.z, pb = PANEL * w;
  const v: V = { w, h, X: (x) => x * z * w, Y: (y) => (GY - y * z) * w, R: (r) => r * z * w, t, ch: d.ch, pb, z };
  const vu: V = { w, h, X: (x) => x * w, Y: (y) => y * w, R: (r) => r * w, t, ch: d.ch, pb, z: 1 };
  const fx = juice(s);
  if (s.phase === 'vault') {
    ctx.save();
    fx.begin(ctx);
    drawVault(ctx, s, vu);
    ctx.restore();
    drawHud(ctx, s, vu);
    drawPanel(ctx, s, vu);
    playEvents(s, v);
    return;
  }
  ctx.save();
  fx.begin(ctx);
  ctx.drawImage(getBg(d.ch, w, h), -6, -6, w + 12, h + 12);
  drawAmbient(ctx, s, v, false);
  if (d.ch === 2) {
    // 탑 천장 (나무 들보)
    const cyy = baseY(v, s.W.ceil) - v.R(DEP * 0.5);
    ctx.fillStyle = lin(ctx, 0, 0, 0, cyy, [0, '#4a2e18'], [1, '#7a5030']);
    ctx.fillRect(0, 0, w, cyy);
    for (let x = 0.04; x < 1; x += 0.19) {
      ctx.fillStyle = '#5a3a20';
      ctx.fillRect(v.X(x), 0, v.R(0.035), cyy + v.R(0.014));
      ctx.fillStyle = 'rgba(255,220,160,.18)';
      ctx.fillRect(v.X(x), 0, v.R(0.008), cyy);
    }
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(0, cyy, w, v.R(0.01));
  }
  drawSolidsBack(ctx, s, v);
  drawBridge(ctx, s, v, true);
  drawWater(ctx, s, v, false);
  drawRopes(ctx, s, v);
  drawSolids(ctx, s, v);
  drawBridge(ctx, s, v, false);
  drawSaw(ctx, s, v);
  drawShadows(ctx, s, v);
  drawPrize(ctx, s, v);
  drawBodies(ctx, s, v);
  drawWater(ctx, s, v, true);
  drawAmbient(ctx, s, v, true);
  drawCaps(ctx, s, v);
  drawBlock(ctx, s, v);
  drawTags(ctx, s, v);
  drawOrbs(ctx, s, v);
  playEvents(s, v);
  // 디오라마 가장자리 그늘 (작은 상자 속 세상처럼)
  {
    const top = w * 0.085, bot = pb;
    const g = ctx.createRadialGradient(w / 2, (top + bot) / 2, v.R(0.35), w / 2, (top + bot) / 2, v.R(0.85));
    g.addColorStop(0, 'rgba(60,30,10,0)');
    g.addColorStop(1, 'rgba(60,30,10,.22)');
    ctx.fillStyle = g;
    ctx.fillRect(-8, top, w + 16, bot - top);
  }
  drawSays(ctx, s);
  ctx.restore();
  drawHud(ctx, s, vu);
  drawPanel(ctx, s, vu);
  drawOverlays(ctx, s, vu, v);
}
