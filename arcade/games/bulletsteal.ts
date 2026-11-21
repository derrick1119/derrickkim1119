/**
 * 탄막 훔치기 (40라운드: 생각 부담 없는 실시간 전투) — 탄막 훔치기 × 연쇄 × 도감.
 * 규칙 한 줄: 톡한 곳으로 슝 날아가 둘레의 적 총알을 전부 빼앗고, 빼앗은 총알이 저절로 되날아간다.
 * 뒤집힘: 탄막이 많을수록 좋다(전부 내 무기). 꼬마 마녀는 쏠 줄 모른다 — 적이 쏴 줘야 공격할 수 있다.
 *
 * 손짓은 톡 하나(아무 데나): 톡 → 6틱 만에 그곳으로 슝(이동 중 무적) → 도착하는 순간 먹보 모자가 둘레(화면 폭 26%~)의
 *   적 총알을 전부 꿀꺽 → 0.3초 뒤 저절로 전부 유도 별이 되어 가까운 적부터 되날아간다(불꽃놀이).
 *   한입에 열 발마다 ×1 더(10발 ×2 · 20발 ×3 · 30발 ×4 … ×6까지) — 탄이 커지고 세진다.
 *   배고픈 모자(뼈대에서 바꾼 것 — 이유: 쉼 0.5초만으로는 '아무 데나 연타'가 '모았다 한입'과 거의 같은 세기였다. 봇으로 재 보니 격차 1.2배):
 *     한입 뒤엔 모자 입(훔치는 둘레)이 55%로 작아졌다가 2.2초에 걸쳐 다시 다 커진다(고리가 금빛이 되면 다 큰 것).
 *     그래서 '모일 때까지 기다렸다 한입에'가 가장 세고, 연타는 한입이 작다. 언제 눌러도 훔쳐지긴 한다(좁은 타이밍 창 없음 — 늦어서 손해 보는 때가 없다).
 *     빈 입(0발)은 배가 안 차서, 빈자리로 비키는 톡은 공짜다.
 * 정답 없음: 어디를 톡 해도 근처 총알은 훔쳐지고 적은 맞는다. 잘하면 한입이 커져 더 빨리·더 크게 터진다.
 * 넉넉함: 적 몸 위를 톡 하면 통 튕겨 몸 밖에 선다(다치지 않는다). 꿀꺽 하면 둘레의 적이 깜짝 놀라 2초 못 쏜다(뛰어든 곳이 가장 안전하다 — 모자 입이 다시 커질 시간).
 * 하트 3(판마다 새로): 맞으면 -1(잠깐 무적), 다 잃으면 그 판만 바로 다시(같은 판에서 거듭 지면 하트 +1씩, 6까지 · 대장의 깨진 갑옷은 그대로).
 *   판 시작 10초는 방울이 지켜 준다(1판은 끝까지 — 1판에서는 잃을 것이 없다). 끝 = 15판을 다 지나면.
 * 판 15(장 3 × (새 적 4 + 대장)): 판마다 새 적 = 새 탄막.
 *   1장 아침 구름길: 꽃 구름(둥근 꽃) → 대포 문어(나를 겨눈 부채 — 모여들 때 한입) → 회오리 새(나선) → 비눗방울 게(큰 방울을 훔치면 옆 탄까지 줄줄이 펑) → 천둥 구름 대왕
 *   2장 노을 풍선길: 민들레(떠서 쌓이는 홀씨 밭) → 거울 박쥐(되쏜 탄을 튕겨 두 배로 돌려준다 — 또 훔친다) → 커튼 해파리(구슬 줄) → 팝콘 옥수수(알이 터지면 여섯 배) → 풍선 고래 선장
 *   3장 별밤 오로라길: 가시 성게(빨간 가시탄은 못 훔친다 — 톡으로 비키기) → 고리 달팽이(도는 방패 고리를 훔쳐야 맞는다) → 별똥 물고기 떼 → 금화 까치(금화 한 닢 = 세 발) → 부엉이 대왕
 * 별: 하늘 지나가기 · 하트 안 잃기 · 한입에 N발(1판 별 1 → 2판 별 2 → 3판부터 별 3).
 * 성장: 판을 깨면 모자 레벨이 저절로 +1(입 크기·되쏘는 세기·모자 모습). 장 끝(대장 뒤)에만 하늘에 뜬 큰 선물 둘 중 하나를 톡.
 *   도감 = 훔쳐 본 탄 무늬 16가지. 결과 화면에 다음 판 새 적의 그림자가 미리 보인다.
 * 점수: 큰 한입일수록 훨씬 크게(한입 n발 × (배수² - 1)) + 잡은 적 × 배수 + 판 200 + 별 150.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5, TAU = Math.PI * 2;
/** 위 띠 아래 끝 · 아래 띠 위 끝 (세로 좌표, 가로 폭 = 1) */
const HUD_T = 0.1, HUD_B = 1.33;
/** 마녀가 갈 수 있는 곳 */
const FX0 = 0.07, FX1 = 0.93, FY0 = 0.19, FY1 = 1.26;
const HOME_X = 0.5, HOME_Y = 1.18;
/** 마녀가 맞는 반지름(작게 — 피하는 게임이 아니다) */
const HIT = 0.026;
/** 톡 → 슝(ZIP틱, 무적) → 꿀꺽 → SWIRL틱 뒤 저절로 되쏘기. 톡 사이 쉼 CD틱 */
const ZIP = 6, SWIRL = 18, CD = 36;
const BUL_MAX = 96, SHOT_MAX = 24, FOE_MAX = 24;
/** 판 시작 보호 방울 · 맞은 뒤 무적 */
const GRACE = 600, INV = 90;
const R0 = 0.26, R_LVL = 0.004, CHAIN_R = 0.13, ORB_R = 0.105;
/** 배고픈 모자: 한입 뒤엔 입이 R_MIN배로 작아졌다가 쉼(CD) 뒤 RECH틱에 걸쳐 다시 다 커진다 — 연타는 한입이 작다 */
const R_MIN = 0.55, RECH = 96;
const ENTER = 40, WIND = 22, STUN = 120;
const RESULT_MIN = 90, RESULT_AUTO = 360, FAIL_T = 85, CHOICE_MIN = 45, PICK_T = 80, END_T = 420;
const STAR_PTS = 150, CLEAR_PTS = 200, WIN_PTS = 1000;

/** 한입 크기 → 배수: 열 발마다 ×1 더 (×6까지) */
export const multOf = (n: number) => Math.min(6, 1 + Math.floor(n / 10));
/** 이만큼 한입이면 '큰 순간' 띠 */
const WOW_N = 10;
/** 판마다 적 체력 배수(대장은 그대로) — 모자도 판마다 세진다 */
const HP_MUL = [0.6, 0.65, 0.8, 1, 1, 1.15, 1.3, 1.4, 1.5, 1, 1.6, 1.7, 1.8, 1.9, 1];

type FK = 'cloud' | 'octo' | 'bird' | 'crab' | 'king' | 'puff' | 'bat' | 'jelly' | 'corn' | 'whale' | 'urchin' | 'snail' | 'fish' | 'pie' | 'owl';
const FKS: FK[] = ['cloud', 'octo', 'bird', 'crab', 'king', 'puff', 'bat', 'jelly', 'corn', 'whale', 'urchin', 'snail', 'fish', 'pie', 'owl'];
interface FoeDef { name: string; r: number; hp: number; pts: number; every: number; boss?: 1 }
const FOE: Record<FK, FoeDef> = {
  cloud: { name: '꽃 구름', r: 0.048, hp: 40, pts: 10, every: 110 },
  octo: { name: '대포 문어', r: 0.048, hp: 44, pts: 15, every: 90 },
  bird: { name: '회오리 새', r: 0.046, hp: 50, pts: 15, every: 90 },
  crab: { name: '비눗방울 게', r: 0.048, hp: 44, pts: 15, every: 100 },
  king: { name: '천둥 구름 대왕', r: 0.17, hp: 2400, pts: 300, every: 64, boss: 1 },
  puff: { name: '민들레', r: 0.048, hp: 48, pts: 20, every: 110 },
  bat: { name: '거울 박쥐', r: 0.046, hp: 30, pts: 20, every: 90 },
  jelly: { name: '커튼 해파리', r: 0.048, hp: 52, pts: 20, every: 104 },
  corn: { name: '팝콘 옥수수', r: 0.048, hp: 50, pts: 20, every: 150 },
  whale: { name: '풍선 고래 선장', r: 0.19, hp: 2600, pts: 500, every: 70, boss: 1 },
  urchin: { name: '가시 성게', r: 0.048, hp: 56, pts: 30, every: 116 },
  snail: { name: '고리 달팽이', r: 0.048, hp: 50, pts: 30, every: 420 },
  fish: { name: '별똥 물고기', r: 0.034, hp: 12, pts: 8, every: 140 },
  pie: { name: '금화 까치', r: 0.046, hp: 56, pts: 40, every: 130 },
  owl: { name: '부엉이 대왕', r: 0.19, hp: 3000, pts: 800, every: 76, boss: 1 },
};

/** 탄 무늬 */
const PETAL = 0, INK = 1, FEATHER = 2, BUBBLE = 3, DROP = 4, SEED = 5, MOON = 6, SHARD = 7, BEAD = 8, KERNEL = 9, POP = 10, NOTE = 11, SPIKE = 12, THORN = 13, PEBBLE = 14, STAR = 15, COIN = 16, COMET = 17;
const BR = [0.019, 0.02, 0.018, 0.045, 0.017, 0.02, 0.019, 0.018, 0.019, 0.03, 0.019, 0.02, 0.036, 0.016, 0.019, 0.019, 0.021, 0.019];
/** 도감: 훔쳐 본 탄 무늬 16가지 (알은 팝콘으로 센다 · 빨간 가시는 못 훔친다) */
export const DEX: { k: number; name: string }[] = [
  { k: PETAL, name: '꽃잎' }, { k: INK, name: '먹물' }, { k: FEATHER, name: '깃털' }, { k: BUBBLE, name: '비눗방울' }, { k: DROP, name: '빗방울' },
  { k: SEED, name: '홀씨' }, { k: MOON, name: '초승달' }, { k: SHARD, name: '거울 조각' }, { k: BEAD, name: '구슬' }, { k: POP, name: '팝콘' }, { k: NOTE, name: '고래 노래' },
  { k: THORN, name: '잔가시' }, { k: PEBBLE, name: '조약돌' }, { k: STAR, name: '별똥' }, { k: COIN, name: '금화' }, { k: COMET, name: '혜성' },
];

type Spawn = [FK, number, number];
interface StageDef { key: FK; news: string; hint: string; starN: number; waves: Spawn[][] }
const CHAPTERS = ['아침 구름길', '노을 풍선길', '별밤 오로라길'];
/** 편대: 가로 한 줄(bow > 0이면 가운데가 아래로 처진다) */
const row = (k: FK, n: number, y: number, a = 0.14, b = 0.86, bow = 0): Spawn[] =>
  [...Array(n).keys()].map((i) => {
    const u = n > 1 ? i / (n - 1) : 0.5;
    return [k, a + (b - a) * u, y + bow * Math.sin(u * Math.PI)] as Spawn;
  });
/** 편대: 세로 한 줄 · 둥글게 */
const col = (k: FK, n: number, x: number, y0: number, y1: number): Spawn[] => [...Array(n).keys()].map((i) => [k, x, n > 1 ? y0 + ((y1 - y0) * i) / (n - 1) : (y0 + y1) / 2] as Spawn);
const loop = (k: FK, n: number, cx: number, cy: number, r: number, a0 = -Math.PI / 2): Spawn[] =>
  [...Array(n).keys()].map((i) => [k, cx + Math.cos(a0 + (i * TAU) / n) * r, cy + Math.sin(a0 + (i * TAU) / n) * r * 0.9] as Spawn);
const school = (n: number, y: number): Spawn[] => [...Array(n).keys()].map((i) => ['fish', 0.5 + (i - (n - 1) / 2) * 0.075, y + (i % 2) * 0.03] as Spawn);
/** 판 15개 — 정해진 풀이는 없다: 적이 들어오는 자리만 정해져 있고(시드로 좌우 뒤집기·살짝 흔들기), 어디서 언제 한입 할지는 마음대로 */
export const STAGES: StageDef[] = [
  {
    key: 'cloud', news: '', hint: '탄이 빽빽한 곳을 톡! 모자가 다 훔쳐요', starN: 0,
    waves: [
      [['cloud', 0.5, 0.6], ['cloud', 0.2, 0.36], ['cloud', 0.8, 0.36]],
      [...loop('cloud', 5, 0.5, 0.48, 0.25)],
      [...row('cloud', 4, 0.28), ...row('cloud', 4, 0.64, 0.2, 0.8)],
      [...loop('cloud', 6, 0.5, 0.46, 0.3), ...row('cloud', 3, 0.46, 0.34, 0.66)],
    ],
  },
  {
    key: 'octo', news: '대포 문어 — 부채 탄이 내게 모일 때 한입에', hint: '탄이 모일 때까지 기다렸다 한입에!', starN: 24,
    waves: [
      [...row('octo', 4, 0.26, 0.16, 0.84, 0.05), ...row('cloud', 3, 0.58, 0.25, 0.75)],
      [...col('octo', 2, 0.1, 0.32, 0.62), ...col('octo', 2, 0.9, 0.32, 0.62), ...row('octo', 2, 0.24, 0.36, 0.64), ...loop('cloud', 3, 0.5, 0.52, 0.13)],
      [...row('octo', 6, 0.25, 0.1, 0.9, 0.12), ...row('cloud', 4, 0.66, 0.2, 0.8)],
    ],
  },
  {
    key: 'bird', news: '회오리 새 — 빙글빙글 나선 탄', hint: '나선이 겹치는 한가운데로!', starN: 44,
    waves: [
      [...row('bird', 3, 0.4, 0.25, 0.75), ...row('cloud', 4, 0.68, 0.16, 0.84, -0.06)],
      [...loop('bird', 4, 0.5, 0.52, 0.22, 0), ...row('octo', 4, 0.24, 0.14, 0.86)],
      [...row('bird', 2, 0.3, 0.3, 0.7), ...row('bird', 2, 0.72, 0.25, 0.75), ...col('octo', 2, 0.1, 0.36, 0.6), ...col('octo', 2, 0.9, 0.36, 0.6), ...loop('cloud', 3, 0.5, 0.5, 0.1)],
    ],
  },
  {
    key: 'crab', news: '비눗방울 게 — 큰 방울을 훔치면 옆 탄도 펑', hint: '큰 방울이 탄 옆에 있을 때 훔치면 줄줄이!', starN: 58,
    waves: [
      [...row('crab', 4, 0.3, 0.16, 0.84), ...row('cloud', 4, 0.6, 0.2, 0.8)],
      [...loop('crab', 5, 0.5, 0.46, 0.25), ...row('octo', 4, 0.72, 0.16, 0.84, -0.06)],
      [...row('crab', 4, 0.5, 0.18, 0.82), ...row('bird', 3, 0.28, 0.25, 0.75), ...row('cloud', 4, 0.72, 0.14, 0.86)],
    ],
  },
  { key: 'king', news: '천둥 구름 대왕 — 큰 한입에 갑옷이 와장창', hint: '대왕의 탄을 잔뜩 모았다가 한입에!', starN: 40, waves: [[['king', 0.5, 0.42]]] },
  {
    key: 'puff', news: '민들레 — 홀씨가 떠서 밭이 돼요', hint: '홀씨 밭이 넓어지면 한가운데로!', starN: 46,
    waves: [
      [...row('puff', 5, 0.27, 0.14, 0.86, 0.06), ...row('cloud', 3, 0.66, 0.25, 0.75)],
      [...row('puff', 4, 0.26, 0.18, 0.82), ...col('octo', 2, 0.1, 0.46, 0.7), ...col('octo', 2, 0.9, 0.46, 0.7), ['octo', 0.5, 0.54]],
      [...row('puff', 5, 0.25, 0.12, 0.88), ...loop('bird', 4, 0.5, 0.62, 0.2, 0)],
    ],
  },
  {
    key: 'bat', news: '거울 박쥐 — 튕겨 온 탄을 또 훔쳐요', hint: '거울이 튕긴 조각은 두 발 몫 — 또 한입!', starN: 64,
    waves: [
      [...row('bat', 4, 0.52, 0.2, 0.8), ...row('cloud', 5, 0.27, 0.12, 0.88)],
      [...loop('bat', 5, 0.5, 0.54, 0.24), ...row('puff', 4, 0.25, 0.18, 0.82)],
      [...row('bat', 4, 0.66, 0.2, 0.8), ...row('crab', 4, 0.3, 0.14, 0.86), ...col('bird', 1, 0.14, 0.48, 0.48), ...col('bird', 1, 0.86, 0.48, 0.48)],
    ],
  },
  {
    key: 'jelly', news: '커튼 해파리 — 구슬 줄이 겹겹이', hint: '구슬 줄이 두세 겹 쌓이면 한입에!', starN: 60,
    waves: [
      [...row('jelly', 4, 0.26, 0.16, 0.84, 0.06), ...row('octo', 3, 0.6, 0.25, 0.75)],
      [...row('jelly', 4, 0.25, 0.16, 0.84), ...loop('bat', 4, 0.5, 0.6, 0.2, 0)],
      [...row('jelly', 5, 0.25, 0.12, 0.88, 0.05), ...row('puff', 4, 0.52, 0.18, 0.82)],
    ],
  },
  {
    key: 'corn', news: '팝콘 옥수수 — 알이 터지면 여섯 배', hint: '알이 펑 터진 다음에 훔쳐요!', starN: 52,
    waves: [
      [...row('corn', 4, 0.36, 0.16, 0.84), ...row('jelly', 3, 0.22, 0.2, 0.8)],
      [...loop('corn', 5, 0.5, 0.46, 0.25), ...row('crab', 4, 0.72, 0.18, 0.82)],
      [...row('corn', 4, 0.44, 0.16, 0.84), ...row('bat', 3, 0.68, 0.28, 0.72), ...row('jelly', 2, 0.23, 0.3, 0.7), ...col('puff', 1, 0.1, 0.28, 0.28), ...col('puff', 1, 0.9, 0.28, 0.28)],
    ],
  },
  { key: 'whale', news: '풍선 고래 선장 — 노래가 하늘을 덮어요', hint: '하늘이 가득 찼을 때 한입에!', starN: 46, waves: [[['whale', 0.5, 0.42]]] },
  {
    key: 'urchin', news: '가시 성게 — 빨간 가시는 못 훔쳐요, 비켜요', hint: '빨간 가시가 오면 다른 데를 톡!', starN: 50,
    waves: [
      [...row('urchin', 3, 0.3, 0.2, 0.8), ...row('cloud', 5, 0.6, 0.14, 0.86)],
      [...loop('urchin', 4, 0.5, 0.48, 0.26, Math.PI / 4), ...row('octo', 5, 0.24, 0.12, 0.88)],
      [...row('urchin', 4, 0.52, 0.14, 0.86, 0.06), ...row('jelly', 4, 0.25, 0.16, 0.84)],
    ],
  },
  {
    key: 'snail', news: '고리 달팽이 — 도는 방패 고리부터 훔쳐요', hint: '고리를 훔치면 그 탄으로 달팽이를!', starN: 46,
    waves: [
      [...row('snail', 4, 0.42, 0.16, 0.84, 0.1), ...row('cloud', 3, 0.24, 0.25, 0.75)],
      [...loop('snail', 4, 0.5, 0.54, 0.24, Math.PI / 4), ...row('urchin', 2, 0.27, 0.3, 0.7), ...col('bird', 1, 0.5, 0.54, 0.54)],
      [...row('snail', 5, 0.46, 0.12, 0.88, 0.14), ...row('bird', 4, 0.25, 0.18, 0.82)],
    ],
  },
  {
    key: 'fish', news: '별똥 물고기 떼 — 줄지어 나를 쏘아요', hint: '별똥이 줄줄이 모여들 때 한입에!', starN: 34,
    waves: [
      [...school(8, 0.28), ...school(7, 0.54)],
      [...school(8, 0.26), ...row('urchin', 3, 0.58, 0.22, 0.78), ...row('jelly', 2, 0.38, 0.14, 0.86)],
      [...school(7, 0.26), ...school(7, 0.48), ...row('snail', 3, 0.7, 0.22, 0.78)],
    ],
  },
  {
    key: 'pie', news: '금화 까치 — 금화 한 닢은 세 발 몫', hint: '금화가 쏟아질 때 한입에 — 한 닢이 세 발!', starN: 54,
    waves: [
      [...row('pie', 3, 0.32, 0.22, 0.78), ...row('urchin', 3, 0.58, 0.2, 0.8), ...row('cloud', 2, 0.26, 0.1, 0.9)],
      [...row('pie', 4, 0.42, 0.16, 0.84), ...school(7, 0.24)],
      [...row('pie', 4, 0.3, 0.14, 0.86, 0.06), ...loop('urchin', 3, 0.5, 0.62, 0.16), ...row('snail', 2, 0.24, 0.3, 0.7)],
    ],
  },
  { key: 'owl', news: '부엉이 대왕 — 별밤이 온통 탄막', hint: '빨간 가시만 비키고, 나머지는 한입에!', starN: 50, waves: [[['owl', 0.5, 0.42]]] },
];
export const STAGE_COUNT = STAGES.length;
/** 장 끝 선물: [왼쪽, 오른쪽] */
export const PERKS: { name: string; line: string }[][] = [
  [{ name: '갈래 별', line: '되쏜 탄이 둘로 갈라져요' }, { name: '펑 별', line: '되쏜 탄이 펑 터져요' }],
  [{ name: '큰 입 모자', line: '훔치는 둘레가 커져요' }, { name: '메아리 모자', line: '절반을 한 번 더 쏴요' }],
];

interface Foe {
  id: number; k: FK; x: number; y: number; sx: number; sy: number; ex: number; ey: number; hp: number; max: number;
  st: number; tm: number; cool: number; ph: number; n: number; a: number; burst: number; mir: number; phase: number; plan: number; dead: boolean; grp: number;
  // 연출
  hurtT: number; wind: number; seed: number; shy: number;
}
/** m: 0 곧게 · 1 느려지다 둥실(홀씨·금화) · 2 알(느려지다 펑) · 3 고리(주인 둘레를 돈다) · 4 흔들흔들(방울) */
interface Bul { k: number; x: number; y: number; vx: number; vy: number; r: number; life: number; age: number; val: number; m: number; own: number; a: number; tk: number }
interface Shot { x: number; y: number; vx: number; vy: number; f: Foe | null; dmg: number; mult: number; age: number; child: boolean; rel: number; sz: number; hue: number }
interface Gulp { x: number; y: number; t: number; n: number; cnt: number; mult: number; r: number; vis: number[]; links: number[]; reds: number }
interface Ev { t: number; kind: string; x: number; y: number; n: number; m: number; text: string }

export interface StealState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result' | 'fail' | 'choice' | 'end'; pt: number; flip: boolean;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; spts: number; dead: boolean; won: boolean; again: boolean; tries: number; fails: number;
  lvl: number; perk: number[];
  wx: number; wy: number; zx: number; zy: number; tx: number; ty: number; zt: number; sw: number; cd: number; inv: number; face: number; hung: number;
  buf: { x: number; y: number } | null; down: boolean;
  foes: Foe[]; buls: Bul[]; shots: Shot[]; nid: number; wave: number; waveT: number; clearT: number; freeze: number;
  gulp: Gulp | null; echo: { t: number; n: number; mult: number } | null; relId: number; relKills: number; relT: number; relN: number;
  best: number; hits: number; gulps: number; taps: number; kills: number; chainBest: number;
  dex: Set<number>; dexNew: number[]; seen: Set<string>; wowN: number; firstTap: number; firstWow: number;
  events: Ev[]; banner: { text: string; t: number } | null; spot: { id: number; t: number; label: string } | null;
  pick: number; pickT: number; sweep: number[]; sweepT: number; bubT: number; keepPh: number;
}

const ev = (s: StealState, kind: string, x: number, y: number, n = 0, m = 0, text = '') => {
  s.events.push({ t: s.t, kind, x, y, n, m, text });
};
const see = (s: StealState, key: string) => void s.seen.add(key);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** 모자가 훔치는 둘레 · 되쏘는 세기 */
export const hatMax = (s: StealState) => (R0 + R_LVL * s.lvl) * (s.perk[1] === 0 ? 1.2 : 1);
/** 지금 입 크기(0~1): 0 = 방금 먹음 · 1 = 다 커짐 */
export const hunger = (s: StealState) => clamp((s.hung - CD) / RECH, 0, 1);
export const hatR = (s: StealState) => hatMax(s) * (R_MIN + (1 - R_MIN) * hunger(s));
export const hatPow = (s: StealState) => 1 + 0.07 * s.lvl;
const starDefs = (i: number): string[] => (i === 0 ? ['하늘 지나가기'] : i === 1 ? ['하늘 지나가기', `한입에 ${STAGES[1].starN}발`] : ['하늘 지나가기', '하트 안 잃기', `한입에 ${STAGES[i].starN}발`]);

// ───────────────────────────── 시뮬레이션 ─────────────────────────────
function shoot(s: StealState, k: number, x: number, y: number, vx: number, vy: number, life: number, m = 0, val = 1, own = 0, a = 0): Bul | null {
  if (s.buls.length >= BUL_MAX) return null;
  const b: Bul = { k, x, y, vx, vy, r: BR[k], life, age: 0, val, m, own, a, tk: 0 };
  s.buls.push(b);
  return b;
}
function fan(s: StealState, k: number, x: number, y: number, aim: number, n: number, step: number, sp: number, life: number) {
  for (let j = 0; j < n; j++) {
    const a = aim + (j - (n - 1) / 2) * step;
    shoot(s, k, x, y, Math.cos(a) * sp, Math.sin(a) * sp, life);
  }
}
function ring(s: StealState, k: number, x: number, y: number, n: number, a0: number, sp: number, life: number, m = 0, val = 1) {
  for (let j = 0; j < n; j++) {
    const a = a0 + (j * TAU) / n;
    shoot(s, k, x + Math.cos(a) * 0.02, y + Math.sin(a) * 0.02, Math.cos(a) * sp, Math.sin(a) * sp, life, m, val);
  }
}
/** 느려지다 둥실 뜨는 탄(홀씨·금화)을 아래쪽 부채꼴로 뿌린다 */
function toss(s: StealState, k: number, x: number, y: number, n: number, val: number) {
  for (let j = 0; j < n; j++) {
    const a = Math.PI / 2 + (j - (n - 1) / 2) * (2.0 / n) + (s.rng() - 0.5) * 0.2, v = 0.0052 + s.rng() * 0.0022;
    shoot(s, k, x, y, Math.cos(a) * v, Math.sin(a) * v, 620, 1, val);
  }
}
function kernels(s: StealState, x: number, y: number, n: number) {
  for (let j = 0; j < n; j++) {
    const sd = j % 2 ? 1 : -1, a = Math.PI / 2 + sd * (0.4 + s.rng() * 0.6), v = 0.0046 + s.rng() * 0.0014;
    shoot(s, KERNEL, x, y, Math.cos(a) * v, Math.sin(a) * v, 400, 2, 1, 0, 100 + Math.floor(s.rng() * 30));
  }
}

/** 적 하나의 한 번 쏘기 — 종류마다 다른 탄막 */
function fire(s: StealState, f: Foe) {
  const ax = s.zt >= 0 ? s.tx : s.wx, ay = s.zt >= 0 ? s.ty : s.wy;
  const aim = Math.atan2(ay - f.y, ax - f.x);
  f.n++;
  switch (f.k) {
    case 'cloud': ring(s, PETAL, f.x, f.y, 8, (f.n % 2) * (Math.PI / 8) + f.ph, 0.0013, 320); break;
    case 'octo': fan(s, INK, f.x, f.y + 0.03, aim, 5, 0.13, s.stage < 5 ? 0.0017 : 0.0021, 800); break;
    case 'bird': f.burst = 12; break;
    case 'crab': {
      // 큰 방울 하나(두 발 몫 · 훔치면 터지며 옆 탄까지) + 잔거품 셋
      const o = (f.n % 2 ? 1 : -1) * 0.3;
      shoot(s, BUBBLE, f.x, f.y + 0.03, Math.cos(aim + o) * 0.0011, Math.sin(aim + o) * 0.0011, 900, 4, 2, 0, s.rng() * TAU);
      for (let j = 0; j < 3; j++) {
        const a = aim + o + (j - 1) * 0.5, b = shoot(s, BUBBLE, f.x, f.y + 0.03, Math.cos(a) * 0.0015, Math.sin(a) * 0.0015, 700, 4, 1, 0, s.rng() * TAU);
        if (b) b.r = 0.018;
      }
      break;
    }
    case 'puff': toss(s, SEED, f.x, f.y, 6, 1); break;
    case 'bat': fan(s, MOON, f.x, f.y + 0.02, aim, 3, 0.17, 0.002, 800); break;
    case 'jelly': for (let j = 0; j < 7; j++) shoot(s, BEAD, f.x + (j - 3) * 0.062, f.y + 0.05, 0, 0.0016, 900); break;
    case 'corn': kernels(s, f.x, f.y, 2); break;
    case 'urchin':
      shoot(s, SPIKE, f.x, f.y, Math.cos(aim) * 0.0016, Math.sin(aim) * 0.0016, 1000);
      ring(s, THORN, f.x, f.y, 6, f.n * 0.5 + f.ph, 0.0013, 600);
      break;
    case 'snail':
      // 고리를 바깥으로 흩뿌린다(다시 자란다)
      for (const b of s.buls) if (b.m === 3 && b.own === f.id) (b.m = 0), (b.own = 0), (b.vx = Math.cos(b.a) * 0.0016), (b.vy = Math.sin(b.a) * 0.0016), (b.life = b.age + 600);
      break;
    case 'fish': shoot(s, STAR, f.x, f.y, Math.cos(aim) * 0.0017, Math.sin(aim) * 0.0017, 900); break;
    case 'pie':
      toss(s, COIN, f.x, f.y, 4, 3);
      f.sx = 0.15 + s.rng() * 0.7;
      f.sy = 0.24 + s.rng() * 0.46;
      break;
    case 'king':
      ring(s, DROP, f.x, f.y, 14, (f.n % 2) * (Math.PI / 14), 0.0013, 800);
      if (f.n % 2 === 0) for (const sd of [-1, 1]) fan(s, INK, f.x + sd * 0.14, f.y + 0.04, Math.atan2(ay - f.y, ax - (f.x + sd * 0.14)), f.phase >= 2 ? 4 : 3, 0.14, 0.0015, 900);
      break;
    case 'whale':
      for (let j = 0; j < 9; j++) shoot(s, BEAD, 0.1 + j * 0.1 + (f.n % 2) * 0.05 - 0.025, f.y + 0.1, 0, 0.0016, 900);
      fan(s, NOTE, f.x, f.y + 0.08, aim, 3, 0.2, 0.0017, 900);
      if (f.n % 2 === 0) toss(s, SEED, f.x, f.y + 0.05, 5 + f.phase, 1);
      if (f.phase >= 1 && f.n % 2 === 1) kernels(s, f.x, f.y + 0.05, 1 + f.phase);
      break;
    case 'owl':
      if (f.n % 3 === 1) fan(s, SPIKE, f.x, f.y + 0.05, aim, f.phase >= 2 ? 2 : 1, 0.6, 0.0015, 900);
      if (f.phase >= 1 && f.n % 2 === 0) ring(s, COIN, f.x, f.y, 6, f.n * 0.3, 0.0048, 900, 1, 3);
      if (f.phase >= 2 && f.n % 2 === 1) ring(s, THORN, f.x, f.y, 12, f.n * 0.2, 0.0014, 700);
      break;
  }
  ev(s, 'fire', f.x, f.y, FKS.indexOf(f.k));
}

function spawnWave(s: StealState) {
  const d = STAGES[s.stage], w = d.waves[s.wave], first = s.stage === 0 && s.wave === 0 && !s.again;
  for (const [k, x0, y0] of w) {
    if (s.foes.length >= FOE_MAX) break;
    const boss = !!FOE[k].boss, fixed = first || boss || s.stage === 0;
    const x = clamp((s.flip ? 1 - x0 : x0) + (fixed ? 0 : (s.rng() - 0.5) * 0.04), 0.1, 0.9), y = y0 + (fixed ? 0 : (s.rng() - 0.5) * 0.03);
    const side = x < 0.17 || x > 0.83;
    const ex = side ? (x < 0.5 ? -0.14 : 1.14) : x + (x - 0.5) * 0.3, ey = side ? y - 0.06 : -0.14 - (boss ? 0.16 : 0) - (y0 > 0.45 ? 0.1 : 0);
    // 다시 할 때 대장의 깨진 갑옷은 그대로
    const max = Math.round(FOE[k].hp * (boss ? 1 : HP_MUL[s.stage])), hp = boss ? Math.round((max * (3 - s.keepPh)) / 3) : max;
    const f: Foe = {
      id: ++s.nid, k, x: first ? x : ex, y: first ? y : ey, sx: x, sy: y, ex, ey, hp, max, st: first ? 1 : 0, tm: 0,
      cool: first ? 34 + s.foes.length * 26 : (boss ? 50 : 24) + Math.floor(s.rng() * 50), ph: s.rng() * TAU, n: 0, a: s.rng() * TAU, burst: 0,
      mir: k === 'bat' ? 5 : 0, phase: boss ? s.keepPh : 0, plan: 0, dead: false, grp: s.wave * 2.1 + y0 * 7 + (x0 - 0.5) * 1.5, hurtT: 0, wind: 0, seed: Math.floor(s.rng() * 1e6), shy: -999,
    };
    s.foes.push(f);
    // 첫 화면: 꽃이 이미 세 겹으로 피어 있다(세상이 먼저 움직이고 있다)
    if (first) for (const age of [50, 105, 160]) {
      for (let j = 0; j < 8; j++) {
        const a = (age === 105 ? Math.PI / 8 : 0) + f.ph + (j * TAU) / 8;
        const b = shoot(s, PETAL, f.x + Math.cos(a) * (0.02 + age * 0.0013), f.y + Math.sin(a) * (0.02 + age * 0.0013), Math.cos(a) * 0.0013, Math.sin(a) * 0.0013, 320);
        if (b) b.age = age;
      }
    }
    if (!s.seen.has(k)) {
      s.seen.add(k);
      if (k === d.key && s.stage > 0) s.spot = { id: f.id, t: s.t, label: FOE[k].name };
    }
  }
  s.wave++;
  s.waveT = 0;
  ev(s, 'wave', 0.5, 0.3, s.wave);
}

function newStage(s: StealState) {
  const d = STAGES[s.stage];
  s.flip = s.stage > 0 && s.rng() < 0.5;
  if (!s.again) (s.fails = 0), (s.keepPh = 0);
  s.hearts = Math.min(6, 3 + s.fails);
  s.wx = HOME_X;
  s.wy = HOME_Y;
  s.zt = -1;
  s.sw = -1;
  s.cd = 0;
  s.inv = 0;
  s.hung = 999;
  s.buf = null;
  s.face = 1;
  s.foes = [];
  s.buls = [];
  s.shots = [];
  s.wave = 0;
  s.waveT = 0;
  s.clearT = 0;
  s.freeze = 0;
  s.gulp = null;
  s.echo = null;
  s.best = 0;
  s.hits = 0;
  s.spts = 0;
  s.relKills = 0;
  s.chainBest = 0;
  s.phase = 'play';
  s.pt = 0;
  s.starOk = [];
  s.sweep = [];
  s.spot = null;
  if (!s.again) s.dexNew = [];
  s.banner = s.stage > 0 || s.again ? { text: d.news, t: s.t } : null;
  spawnWave(s);
}

/** 도착한 순간: 둘레의 훔칠 수 있는 탄을 전부 꿀꺽 (방울은 터지며 옆 탄까지 줄줄이) */
function steal(s: StealState) {
  const R = hatR(s), R2 = R * R, B = s.buls, x = s.wx, y = s.wy;
  let n = 0, cnt = 0, reds = 0, chain = 0;
  const q: Bul[] = [], links: number[] = [], vis: number[] = [];
  for (const b of B) {
    const dx = b.x - x, dy = b.y - y;
    if (dx * dx + dy * dy >= R2) continue;
    if (b.k === SPIKE) {
      reds++;
      continue;
    }
    b.tk = 1;
    if (b.k === BUBBLE && b.r > 0.03) q.push(b);
  }
  while (q.length) {
    const bb = q.pop()!;
    chain++;
    for (const o of B) {
      if (o.tk || o.k === SPIKE) continue;
      const dx = o.x - bb.x, dy = o.y - bb.y;
      if (dx * dx + dy * dy >= CHAIN_R * CHAIN_R) continue;
      o.tk = 1;
      if (links.length < 96) links.push(bb.x, bb.y, o.x, o.y);
      if (o.k === BUBBLE && o.r > 0.03) q.push(o);
    }
    ev(s, 'bubble', bb.x, bb.y, chain);
  }
  let w = 0;
  for (let i = 0; i < B.length; i++) {
    const b = B[i];
    if (!b.tk) {
      B[w++] = b;
      continue;
    }
    n += b.val;
    cnt++;
    const dk = b.k === KERNEL ? POP : b.k;
    if (!s.dex.has(dk)) (s.dex.add(dk), s.dexNew.push(dk), see(s, 'dex' + dk), ev(s, 'dex', b.x, b.y, dk));
    if (vis.length < 144) vis.push(b.x - x, b.y - y, b.k);
  }
  B.length = w;
  // 꿀꺽! 둘레의 적들이 깜짝 놀라 2초쯤 못 쏜다(뛰어든 곳에서 코앞의 탄에 맞는 억울함 없이 — 모자 입이 다시 커질 시간). 대장은 안 놀란다
  for (const f of s.foes) {
    if (FOE[f.k].boss || f.st !== 1) continue;
    const dx = f.x - x, dy = f.y - y;
    if (dx * dx + dy * dy < R2 && f.cool < STUN) (f.cool = STUN + (f.id % 5) * 4), (f.shy = s.t), (f.burst = f.k === 'bird' ? 0 : f.burst);
  }
  const mult = multOf(n);
  if (cnt > 0) s.hung = 0; // 빈 입은 배가 안 찬다(빈자리로 비키기는 공짜)
  s.gulp = { x, y, t: s.t, n, cnt, mult, r: R, vis, links, reds };
  s.gulps++;
  if (n > s.best) s.best = n;
  if (chain > s.chainBest) s.chainBest = chain;
  s.spts += n * (mult * mult - 1); // 점수: 큰 한입일수록 훨씬 크게(작은 한입 여러 번은 거의 0)
  let wow = n >= WOW_N;
  if (chain >= 3) (wow = true), see(s, 'chain');
  if (n >= WOW_N) see(s, 'gulp12');
  if (n >= 20) see(s, 'gulp20');
  if (n >= 30) see(s, 'gulp30');
  if (wow) {
    s.wowN++;
    if (s.firstWow < 0) s.firstWow = s.t;
  }
  // 멈칫: 큰 한입일수록 세상이 잠깐 멈춘다(느린 시간이 아니라 그 자리에서 딱 멈춤)
  s.freeze = Math.max(s.freeze, n >= 30 ? 9 : n >= 20 ? 6 : n >= WOW_N ? 4 : 0);
  ev(s, 'gulp', x, y, n, mult, reds && !n ? 'red' : '');
}

const nearestFoe = (s: StealState, x: number, y: number, not: Foe | null = null): Foe | null => {
  let best: Foe | null = null, bd = 1e9;
  for (const f of s.foes) {
    if (f.dead || f === not || f.y < 0.02) continue;
    const d = (f.x - x) * (f.x - x) + (f.y - y) * (f.y - y);
    if (d < bd) (bd = d), (best = f);
  }
  return best;
};

/** 0.3초 뒤 저절로: 훔친 탄이 전부 유도 별이 되어 가까운 적부터 되날아간다 */
function release(s: StealState, n: number, mult: number, echo: boolean) {
  if (n <= 0) return;
  // 화면의 별은 SHOT_MAX개까지(느린 폰) — 많이 훔치면 별 하나하나가 크고 세진다
  const K = Math.max(1, Math.min(n, SHOT_MAX - s.shots.length)), dmg = (n * mult * hatPow(s)) / K;
  if (!echo) (s.relId++, (s.relKills = 0), (s.relT = s.t), (s.relN = n));
  const hx = s.wx, hy = s.wy - 0.07;
  const list = s.foes.filter((f) => !f.dead && f.y > 0.02).sort((a, b) => (a.x - hx) ** 2 + (a.y - hy) ** 2 - ((b.x - hx) ** 2 + (b.y - hy) ** 2));
  const rem = list.map((f) => f.hp + f.mir * dmg);
  let j = 0;
  for (let i = 0; i < K; i++) {
    while (j < list.length && rem[j] <= 0) j++;
    const f = j < list.length ? list[j] : list.length ? list[i % list.length] : null;
    if (j < list.length) rem[j] -= dmg;
    const a = -Math.PI / 2 + ((i + 0.5) / K - 0.5) * TAU * 0.9 + (echo ? 0.25 : 0), v = 0.013 + 0.007 * (((i * 7) % 5) / 4);
    s.shots.push({ x: hx, y: hy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, f, dmg, mult, age: 0, child: false, rel: s.relId, sz: Math.min(2.2, 0.8 + mult * 0.22 + (n / K - 1) * 0.25), hue: i });
  }
  ev(s, 'spit', hx, hy, n, mult, echo ? 'echo' : '');
}

function dealDmg(s: StealState, f: Foe, dmg: number, sh: Shot) {
  if (f.dead) return;
  f.hp -= dmg;
  f.hurtT = 10;
  const d = FOE[f.k];
  if (d.boss && f.hp > 0) {
    const ph = f.hp > (f.max * 2) / 3 ? 0 : f.hp > f.max / 3 ? 1 : 2;
    if (ph > f.phase) {
      f.phase = ph;
      f.cool += 50;
      s.wowN++;
      s.spts += 100 * sh.mult;
      s.freeze = Math.max(s.freeze, 8);
      see(s, 'armor');
      ev(s, 'armor', f.x, f.y, ph);
    }
  }
  if (f.hp > 0) return;
  f.dead = true;
  s.kills++;
  s.spts += d.pts * sh.mult;
  let multi = 0;
  if (sh.rel === s.relId) {
    multi = ++s.relKills;
    if (multi === 4) (s.wowN++, see(s, 'multi'));
  }
  if (f.k === 'snail') for (const b of s.buls) if (b.m === 3 && b.own === f.id) (b.m = 0), (b.own = 0), (b.vx = Math.cos(b.a) * 0.0012), (b.vy = Math.sin(b.a) * 0.0012), (b.life = b.age + 500);
  if (d.boss) s.freeze = Math.max(s.freeze, 14);
  ev(s, 'kill', f.x, f.y, FKS.indexOf(f.k), sh.mult, multi >= 3 ? String(multi) : '');
}

function hitFoe(s: StealState, f: Foe, sh: Shot) {
  if (f.mir > 0 && !sh.child) {
    // 거울: 맞은 탄이 두 조각(한 조각 = 두 발 몫)으로 되돌아온다 — 또 훔치면 된다
    f.mir--;
    f.hurtT = 8;
    const a = Math.atan2(s.wy - f.y, s.wx - f.x);
    for (const o of [-0.24, 0.24]) shoot(s, SHARD, f.x, f.y, Math.cos(a + o) * 0.0019, Math.sin(a + o) * 0.0019, 800, 0, 2);
    see(s, 'mirror');
    ev(s, f.mir ? 'mirror' : 'mirbreak', f.x, f.y);
    return;
  }
  ev(s, 'hit', sh.x, sh.y, sh.mult, sh.hue);
  dealDmg(s, f, sh.dmg, sh);
  if (sh.child) return;
  if (s.perk[0] === 1) {
    // 펑 별: 둘레의 적까지 절반
    for (const o of s.foes) if (o !== f && !o.dead && (o.x - f.x) ** 2 + (o.y - f.y) ** 2 < 0.16 * 0.16) dealDmg(s, o, sh.dmg * 0.5, sh);
    ev(s, 'boom', f.x, f.y, sh.mult);
  } else if (s.perk[0] === 0) {
    // 갈래 별: 둘로 갈라져 다른 적에게
    for (const sd of [-1, 1]) {
      if (s.shots.length >= SHOT_MAX) break;
      const o = nearestFoe(s, f.x + sd * 0.2, f.y, f) ?? (f.dead ? null : f);
      if (!o) break;
      s.shots.push({ x: f.x, y: f.y, vx: sd * 0.012, vy: -0.008, f: o, dmg: sh.dmg * 0.4, mult: sh.mult, age: 4, child: true, rel: sh.rel, sz: sh.sz * 0.7, hue: sh.hue + 3 });
    }
  }
}

function shotsStep(s: StealState) {
  const S = s.shots;
  let w = 0, died = false;
  for (let i = 0; i < S.length; i++) {
    const sh = S[i];
    sh.age++;
    let f = sh.f;
    if (!f || f.dead) f = sh.f = nearestFoe(s, sh.x, sh.y);
    if (!f) {
      // 맞힐 적이 없다 — 하늘로 솟아 불꽃이 된다
      sh.vy -= 0.0012;
      sh.vx *= 0.95;
      sh.x += sh.vx;
      sh.y += sh.vy;
      if (sh.age > 46 || sh.y < HUD_T + 0.05) {
        ev(s, 'fizz', sh.x, sh.y, sh.mult, sh.hue);
        continue;
      }
      S[w++] = sh;
      continue;
    }
    const dx = f.x - sh.x, dy = f.y - sh.y, d = Math.hypot(dx, dy) || 1e-6;
    const sp = Math.min(0.036, 0.01 + sh.age * 0.0016), k = sh.age < 5 ? 0.05 : 0.25;
    sh.vx += ((dx / d) * sp - sh.vx) * k;
    sh.vy += ((dy / d) * sp - sh.vy) * k;
    sh.x += sh.vx;
    sh.y += sh.vy;
    if (f.k === 'snail' && d < ORB_R + 0.06) {
      // 도는 조약돌 고리가 되쏜 탄을 막는다(고리를 훔치면 뚫린다)
      let blocked = false;
      for (const b of s.buls) {
        if (b.m !== 3 || b.own !== f.id || b.age > b.life) continue;
        if ((b.x - sh.x) ** 2 + (b.y - sh.y) ** 2 < 0.036 * 0.036) {
          b.life = 0;
          blocked = true;
          ev(s, 'tink', b.x, b.y);
          break;
        }
      }
      if (blocked) continue;
    }
    if (d < FOE[f.k].r + 0.024) {
      hitFoe(s, f, sh);
      died ||= f.dead;
      continue;
    }
    if (sh.age > 160) continue;
    S[w++] = sh;
  }
  S.length = w;
  if (died || s.foes.some((f) => f.dead)) s.foes = s.foes.filter((f) => !f.dead);
}

function foesStep(s: StealState) {
  const t = s.t;
  for (const f of s.foes) {
    f.tm++;
    if (f.hurtT > 0) f.hurtT--;
    if (f.st === 0) {
      const u = Math.min(1, f.tm / ENTER), e = 1 - (1 - u) * (1 - u);
      f.x = f.ex + (f.sx - f.ex) * e;
      f.y = f.ey + (f.sy - f.ey) * e;
      if (u >= 1) (f.st = 1), (f.tm = 0);
      continue;
    }
    let tx = f.sx, ty = f.sy;
    switch (f.k) {
      case 'bird': (tx += Math.sin(t * 0.012 + f.ph) * 0.1), (ty += Math.cos(t * 0.017 + f.ph) * 0.02); break;
      case 'jelly': (tx += Math.sin(t * 0.008 + f.ph) * 0.14), (ty += Math.sin(t * 0.03 + f.ph) * 0.012); break;
      case 'fish': (tx += Math.sin(t * 0.011 + f.grp) * 0.2), (ty += Math.sin(t * 0.04 + f.ph) * 0.015); break;
      case 'king': case 'whale': case 'owl': (tx += Math.sin(t * 0.008) * 0.17), (ty += Math.sin(t * 0.013) * 0.03); break;
      default: (tx += Math.sin(t * 0.02 + f.ph) * 0.014), (ty += Math.cos(t * 0.027 + f.ph) * 0.01);
    }
    f.x += (tx - f.x) * 0.08;
    f.y += (ty - f.y) * 0.08;
    const full = s.buls.length >= BUL_MAX;
    if (f.k === 'bird' && f.burst > 0 && t % 6 === 0) {
      f.a += 0.52;
      shoot(s, FEATHER, f.x, f.y, Math.cos(f.a) * 0.0017, Math.sin(f.a) * 0.0017, 700);
      f.burst--;
    } else if (f.k === 'snail') {
      f.a += 0.03;
      if ((t + f.id * 7) % 34 === 0 && !full && t - f.shy > STUN) {
        let c = 0;
        for (const b of s.buls) if (b.m === 3 && b.own === f.id) c++;
        if (c < 8) shoot(s, PEBBLE, f.x, f.y, 0, 0, 1e9, 3, 1, f.id, f.a + (f.burst++ % 8) * (TAU / 8));
      }
    } else if (f.k === 'king' && f.phase >= 1 && t % (f.phase >= 2 ? 11 : 17) === 0) shoot(s, DROP, 0.06 + s.rng() * 0.88, HUD_T, 0, 0.0018, 760);
    else if (f.k === 'owl' && t % 6 === 0) {
      f.a += 0.41;
      shoot(s, COMET, f.x, f.y, Math.cos(f.a) * 0.0018, Math.sin(f.a) * 0.0018, 700);
    }
    if (--f.cool <= 0) {
      if (s.buls.length > BUL_MAX - 3 && f.k !== 'snail') f.cool = 20;
      else (fire(s, f), (f.cool = FOE[f.k].every + Math.floor(s.rng() * 16)));
    }
    f.wind = f.cool < WIND ? 1 - f.cool / WIND : 0;
  }
}

function bulsStep(s: StealState) {
  const B = s.buls;
  let w = 0, pops: Bul[] | null = null;
  for (let i = 0; i < B.length; i++) {
    const b = B[i];
    b.age++;
    if (b.m === 3) {
      const f = s.foes.find((o) => o.id === b.own);
      if (f) {
        b.a += 0.03;
        b.x = f.x + Math.cos(b.a) * ORB_R;
        b.y = f.y + Math.sin(b.a) * ORB_R;
      } else (b.m = 0), (b.own = 0), (b.vx = Math.cos(b.a) * 0.0012), (b.vy = Math.sin(b.a) * 0.0012), (b.life = b.age + 500);
    } else {
      if (b.m === 1) (b.vx *= 0.985), (b.vy = b.vy * 0.985 + 0.000011);
      else if (b.m === 2) {
        b.vx *= 0.985;
        b.vy *= 0.985;
        if (b.age >= b.a) {
          (pops ??= []).push(b);
          continue;
        }
      } else if (b.m === 4) b.x += Math.sin(b.age * 0.05 + b.a) * 0.0005;
      b.x += b.vx;
      b.y += b.vy;
    }
    if (b.age > b.life || b.x < -0.07 || b.x > 1.07 || b.y < -0.05 || b.y > HUD_B + 0.05) continue;
    B[w++] = b;
  }
  B.length = w;
  if (pops) for (const b of pops) {
    // 알이 펑: 팝콘 여섯
    ring(s, POP, b.x, b.y, 6, b.a, 0.0011, 380);
    ev(s, 'popcorn', b.x, b.y);
  }
}

function hurt(s: StealState, b: Bul) {
  s.hearts--;
  s.hits++;
  s.inv = INV;
  s.buls = s.buls.filter((o) => o === b || (o.x - s.wx) ** 2 + (o.y - s.wy) ** 2 > 0.1 * 0.1);
  s.buls.splice(s.buls.indexOf(b), 1);
  ev(s, 'hurt', s.wx, s.wy, s.hearts, b.k);
  if (s.hearts <= 0) endStage(s, false);
}

function hitCheck(s: StealState) {
  // 이동 중 · 마지막 적까지 잡은 뒤엔 안 맞는다
  if (s.zt >= 0 || (s.foes.length === 0 && s.wave >= STAGES[s.stage].waves.length)) return;
  const safe = s.inv > 0 || s.pt < GRACE || s.stage === 0, x = s.wx, y = s.wy;
  for (const b of s.buls) {
    // 막 나온 탄 · 아직 던져지는 중인 탄(홀씨·금화·알)은 안 아프다
    if (b.age < 14 || ((b.m === 1 || b.m === 2) && b.vx * b.vx + b.vy * b.vy > 0.0000035)) continue;
    const dx = b.x - x, dy = b.y - y, rr = HIT + b.r * 0.6;
    if (dx * dx + dy * dy >= rr * rr) continue;
    if (safe) {
      if (s.inv <= 0 && s.t - s.bubT > 24) (s.bubT = s.t), ev(s, 'guard', b.x, b.y);
      continue;
    }
    hurt(s, b);
    return;
  }
}

function endStage(s: StealState, ok: boolean) {
  if (s.phase !== 'play') return;
  s.phase = ok ? 'result' : 'fail';
  s.pt = 0;
  s.buf = null;
  s.zt = -1;
  s.sw = -1;
  s.echo = null;
  if (!ok) {
    s.tries++;
    s.fails++;
    for (const f of s.foes) if (FOE[f.k].boss) s.keepPh = Math.max(s.keepPh, f.phase);
    ev(s, 'fail', s.wx, s.wy);
    return;
  }
  const d = STAGES[s.stage];
  s.sweep = [];
  for (const b of s.buls) s.sweep.push(b.x, b.y, b.k);
  s.sweepT = s.t;
  s.spts += s.buls.length * 2;
  s.buls = [];
  s.shots = [];
  s.starOk = s.stage === 0 ? [true] : s.stage === 1 ? [true, s.best >= d.starN] : [true, s.hits === 0, s.best >= d.starN];
  s.got = s.starOk.filter(Boolean).length;
  s.stars += s.got;
  s.pts += s.spts + CLEAR_PTS + s.got * STAR_PTS;
  s.lvl++;
  see(s, 'lvl' + Math.min(3, Math.floor(s.lvl / 5)));
  if (s.stage === STAGE_COUNT - 1) (s.won = true), (s.pts += WIN_PTS);
  ev(s, 'clear', s.wx, s.wy, s.got);
}

function play(s: StealState, tap: { x: number; y: number } | null) {
  s.pt++;
  if (tap) {
    s.taps++;
    if (s.firstTap < 0) s.firstTap = s.t;
    s.buf = { x: clamp(tap.x, FX0, FX1), y: clamp(tap.y * A, FY0, FY1) };
  }
  if (s.cd > 0) s.cd--;
  if (s.inv > 0) s.inv--;
  s.hung++;
  if (s.buf && s.cd === 0 && s.zt < 0 && s.sw < 0) {
    s.zx = s.wx;
    s.zy = s.wy;
    // 적 몸 위에는 못 선다 — 통 튕겨 몸 밖으로(다치지 않는다)
    let tx = s.buf.x, ty = s.buf.y;
    for (let pass = 0; pass < 2; pass++) for (const f of s.foes) {
      const rr = FOE[f.k].r + (FOE[f.k].boss ? 0.1 : f.k === 'snail' ? 0.11 : 0.05);
      let dx = tx - f.x, dy = ty - f.y;
      const d = Math.hypot(dx, dy);
      if (d >= rr) continue;
      if (d < 1e-4) (dx = 0), (dy = 1);
      else (dx /= d), (dy /= d);
      tx = clamp(f.x + dx * rr, FX0, FX1);
      ty = clamp(f.y + dy * rr, FY0, FY1);
    }
    s.tx = tx;
    s.ty = ty;
    s.buf = null;
    s.zt = ZIP;
    s.cd = CD;
    if (Math.abs(s.tx - s.wx) > 0.02) s.face = s.tx > s.wx ? 1 : -1;
    ev(s, 'zip', s.zx, s.zy);
  }
  if (s.zt >= 0) {
    s.zt--;
    const u = 1 - Math.max(0, s.zt) / ZIP, e = u * u * (3 - 2 * u);
    s.wx = s.zx + (s.tx - s.zx) * e;
    s.wy = s.zy + (s.ty - s.zy) * e;
    if (s.zt <= 0) {
      s.zt = -1;
      s.wx = s.tx;
      s.wy = s.ty;
      steal(s);
      s.sw = SWIRL;
    }
  } else if (s.sw >= 0 && --s.sw < 0 && s.gulp) {
    release(s, s.gulp.n, s.gulp.mult, false);
    if (s.perk[1] === 1 && s.gulp.n >= 2) s.echo = { t: s.t + 22, n: Math.ceil(s.gulp.n / 2), mult: s.gulp.mult };
  }
  if (s.echo && s.t >= s.echo.t) (release(s, s.echo.n, s.echo.mult, true), (s.echo = null));
  if (s.freeze > 0) {
    s.freeze--;
    return;
  }
  const W = STAGES[s.stage].waves, alive = s.foes.length;
  s.waveT++;
  if (s.wave < W.length) {
    if ((alive === 0 && s.waveT > 24) || (s.waveT > 900 && alive <= 5)) spawnWave(s);
  } else if (alive === 0 && ++s.clearT > 40) return endStage(s, true);
  foesStep(s);
  bulsStep(s);
  shotsStep(s);
  hitCheck(s);
}

function advance(s: StealState) {
  if (s.won) {
    s.phase = 'end';
    s.pt = 0;
    return;
  }
  const ch = Math.floor(s.stage / 5);
  if (s.stage % 5 === 4 && ch < PERKS.length && s.perk[ch] < 0) {
    s.phase = 'choice';
    s.pt = 0;
    s.pick = -1;
    s.wx = HOME_X;
    s.wy = HOME_Y - 0.06;
    return;
  }
  s.stage++;
  s.again = false;
  newStage(s);
}

const game: GameDef<StealState> = {
  id: 'bulletsteal',
  name: '🌂 탄막 훔치기',
  genes: ['bulletsteal', 'chain', 'collect'],
  twist: '쏠 줄 모르는 꼬마 마녀 — 톡한 곳으로 슝 날아가면 먹보 모자가 둘레의 적 총알을 전부 꿀꺽하고 저절로 되쏜다. 탄막이 많을수록 좋아서, 피하는 대신 가장 빽빽한 곳으로 뛰어든다(한입 뒤엔 모자 입이 작아졌다 다시 커져, 모았다 한입이 연타보다 훨씬 세다)',
  rules: [
    '아무 데나 톡! 마녀가 슝 날아가 둘레의 적 탄을 모자로 전부 훔쳐요. 훔친 탄은 저절로 되날아가요.',
    '한입에 열 발마다 ×1 더 세져요. 한입 뒤엔 모자 입이 작아졌다 다시 커지니, 탄이 모일 때까지 기다렸다 한입에!',
    '맞으면 하트 -1, 셋을 다 잃으면 그 판만 다시. 빨간 가시탄만 못 훔쳐요(비켜요).',
  ],
  controls: 'touch',
  hint: '탄이 빽빽한 곳을 톡 — 모자가 다 훔쳐 되쏴요 / 화살표로 옮기고 스페이스',
  aspect: A,
  art: {
    concept: '아침 구름 바다 위를 나는 꼬마 마녀와 먹보 모자 — 파스텔 탄막 불꽃놀이 그림책',
    mood: '밝은 하늘에 뭉게구름이 아래로 흐르고, 꽃 구름·대포 문어·회오리 새가 느리고 큼직한 파스텔 탄을 꽃·부채·나선 무늬로 뿌린다. 톡 하면 꼬마 마녀가 슝 날아가 입 달린 큰 모자가 탄을 소용돌이로 꿀꺽, 볼이 빵빵해졌다가 퉤! 금빛 별 불꽃이 적에게 되날아가 팡팡 터진다.',
    palette: { bg: '#8fd3ff', ink: '#3a2459', muted: '#7d8fb8', accent: '#ffd23f', hot: '#ff5a5f', soft: '#fff6e6' },
  },
  guard: (s) => s.hearts,
  cleared: (s) => (s.phase === 'result' ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  reveals: (s) => s.seen.size,
  wows: (s) => s.wowN,
  create(seed) {
    const s: StealState = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, flip: false,
      hearts: 3, stars: 0, got: 0, starOk: [], pts: 0, spts: 0, dead: false, won: false, again: false, tries: 0, fails: 0, lvl: 0, perk: [-1, -1],
      wx: HOME_X, wy: HOME_Y, zx: HOME_X, zy: HOME_Y, tx: HOME_X, ty: HOME_Y, zt: -1, sw: -1, cd: 0, inv: 0, face: 1, hung: 999, buf: null, down: false,
      foes: [], buls: [], shots: [], nid: 0, wave: 0, waveT: 0, clearT: 0, freeze: 0, gulp: null, echo: null, relId: 0, relKills: 0, relT: -999, relN: 0,
      best: 0, hits: 0, gulps: 0, taps: 0, kills: 0, chainBest: 0,
      dex: new Set<number>(), dexNew: [], seen: new Set<string>(), wowN: 0, firstTap: -1, firstWow: -1,
      events: [], banner: null, spot: null, pick: -1, pickT: -999, sweep: [], sweepT: -999, bubT: -999, keepPh: 0,
    };
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null, fresh = !!p && !s.down;
    s.down = !!p;
    if (s.phase === 'play') play(s, fresh ? p : null);
    else {
      s.pt++;
      if (s.phase === 'result') {
        if (s.pt >= RESULT_AUTO || (fresh && s.pt > RESULT_MIN)) advance(s);
      } else if (s.phase === 'fail') {
        if (s.pt >= FAIL_T || (fresh && s.pt > 40)) (s.again = true), newStage(s);
      } else if (s.phase === 'choice') {
        const ch = Math.floor(s.stage / 5);
        if (s.pick < 0) {
          if (fresh && s.pt > CHOICE_MIN) {
            s.pick = p!.x < 0.5 ? 0 : 1;
            s.pickT = s.t;
            s.perk[ch] = s.pick;
            see(s, 'perk' + ch);
            ev(s, 'pick', s.pick ? 0.73 : 0.27, 0.62, s.pick, ch);
          }
        } else if (s.t - s.pickT > PICK_T) (s.stage++, (s.again = false), newStage(s));
      } else if (s.pt >= END_T || (fresh && s.pt > 150)) s.dead = true;
    }
    if (s.events.length > 48) {
      const t0 = s.t - 70;
      s.events = s.events.filter((e) => e.t > t0);
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const bulletsteal = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x: clamp(x, 0, 1), y: clamp(y / A, 0, 1) } });
/** 결과·실패·끝 화면은 누구나 톡으로 넘긴다 */
const skip = (s: StealState): Input | null =>
  s.phase === 'result' ? (s.pt > RESULT_MIN + 2 ? at(0.5, 0.9) : NO) : s.phase === 'fail' ? (s.pt > 42 ? at(0.5, 0.9) : NO) : s.phase === 'end' ? (s.pt > 152 ? at(0.5, 0.9) : NO) : null;
const ready = (s: StealState) => s.cd === 0 && s.zt < 0 && s.sw < 0 && !s.buf;

/** (x,y)에서 한입 하면 몇 발인가 (방울 연쇄는 한 겹만 어림) */
export function countAt(s: StealState, x: number, y: number, R2: number): number {
  let n = 0;
  const B = s.buls;
  for (let i = 0; i < B.length; i++) {
    const b = B[i];
    if (b.k === SPIKE) continue;
    const dx = b.x - x, dy = b.y - y;
    if (dx * dx + dy * dy >= R2) continue;
    n += b.val;
    if (b.k === BUBBLE && b.r > 0.03) for (let j = 0; j < B.length; j++) {
      const o = B[j];
      if (o.k === SPIKE || o === b) continue;
      const ex = o.x - b.x, ey = o.y - b.y;
      if (ex * ex + ey * ey < CHAIN_R * CHAIN_R && (o.x - x) * (o.x - x) + (o.y - y) * (o.y - y) >= R2) n += o.val * 0.7;
    }
  }
  return n;
}
/** (x,y)에 가만히 있으면 몇 틱 뒤에 맞는가 (H틱 안에 없으면 1e9). onlyRed면 빨간 가시만 본다 */
function threat(s: StealState, x: number, y: number, H: number, onlyRed: boolean, pad = 0.012): number {
  let best = 1e9;
  for (const b of s.buls) {
    if (onlyRed && b.k !== SPIKE) continue;
    const px = b.x - x, py = b.y - y, rr = HIT + b.r * 0.6 + pad;
    if ((b.m === 1 || b.m === 2) && b.vx * b.vx + b.vy * b.vy > 0.0000035) continue;
    if (b.m === 3) {
      // 도는 조약돌: 고리 근처에 서 있으면 곧 맞는다
      if (px * px + py * py < (rr + 0.05) * (rr + 0.05)) best = 0;
      continue;
    }
    const vv = b.vx * b.vx + b.vy * b.vy;
    let tt = vv > 1e-12 ? -(px * b.vx + py * b.vy) / vv : 0;
    tt = tt < 0 ? 0 : tt > H ? H : tt;
    const cx = px + b.vx * tt, cy = py + b.vy * tt;
    if (cx * cx + cy * cy < rr * rr && tt < best) best = tt;
  }
  return best;
}
/** 가장 빽빽한 자리 찾기: 적 곁 · 탄 위 · 성긴 격자 가운데 한입이 가장 큰 곳 */
function densest(s: StealState, step: number): { x: number; y: number; n: number } {
  const R = hatR(s), R2 = R * R, B = s.buls;
  let bn = -1, bx = s.wx, by = s.wy;
  const hasRed = B.some((b) => b.k === SPIKE);
  const consider = (x: number, y: number) => {
    x = clamp(x, FX0, FX1);
    y = clamp(y, FY0, FY1);
    if (hasRed && threat(s, x, y, 70, true, 0.03) < 1e9) return;
    const c = countAt(s, x, y, R2);
    if (c > bn) (bn = c), (bx = x), (by = y);
  };
  for (const f of s.foes) consider(f.x, f.y + FOE[f.k].r + (FOE[f.k].boss ? 0.11 : f.k === 'snail' ? 0.12 : 0.06));
  for (let i = 0; i < B.length; i += step) if (B[i].k !== SPIKE) consider(B[i].x, B[i].y);
  for (let gy = 0; gy < 5; gy++) for (let gx = 0; gx < 4; gx++) consider(0.14 + gx * 0.24, 0.26 + gy * 0.22);
  // 그 둘레 탄들의 한가운데로 한 번 더 다듬는다
  if (bn > 0) {
    let mx = 0, my = 0, c = 0;
    for (const b of B) if (b.k !== SPIKE && (b.x - bx) ** 2 + (b.y - by) ** 2 < R2) (mx += b.x), (my += b.y), c++;
    if (c) consider(mx / c, my / c);
  }
  return { x: bx, y: by, n: Math.max(0, bn) };
}
/** 탄이 한동안 오지 않을 빈자리 (아래쪽부터) */
function safeSpot(s: StealState): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null, bv = -1;
  const R2 = hatR(s) ** 2;
  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 5; gx++) {
    const x = 0.12 + gx * 0.19, y = 1.22 - gy * 0.17;
    if (threat(s, x, y, 120, false, 0.03) < 1e9) continue;
    let near = 1e9, c = 0;
    for (const b of s.buls) {
      const d2 = (b.x - x) ** 2 + (b.y - y) ** 2;
      if (d2 < near) near = d2;
      if (d2 < R2 && b.k !== SPIKE) c++;
    }
    const v = Math.min(near, 0.09) + (5 - gy) * 0.002 - Math.abs(x - s.wx) * 0.001 - c * 0.03;
    if (v > bv) (bv = v), (best = { x, y });
  }
  return best;
}

/** 잘하는 봇: 한입이 가장 큰 자리를 찾아 두고, 별 목표(한입에 N발)만큼 모일 때까지 기다렸다 뛰어든다. 맞을 것 같으면 빈자리로 비킨다 */
export const bulletstealSmart: Bot<StealState> = {
  name: '빽빽한 곳 한입',
  act(s) {
    if (s.down) return NO;
    const sk = skip(s);
    if (sk) return sk;
    if (s.phase === 'choice') return s.pick < 0 && s.pt > CHOICE_MIN + 2 ? at(Math.floor(s.stage / 5) === 0 ? 0.73 : 0.27, 0.62) : NO;
    if (!ready(s)) return NO;
    const d = STAGES[s.stage], boss = !!FOE[d.key].boss;
    const exposed = s.pt > GRACE - 40 && s.inv < 20 && s.stage > 0;
    const hitIn = exposed ? threat(s, s.wx, s.wy, 40, false) : 1e9;
    const big = hunger(s) >= 1;
    // 급하지 않으면 9틱에 한 번만 살핀다(가볍게). 입이 덜 커졌으면 기다린다
    if (hitIn >= 1e9 && (s.t % 9 >= 3 || (!big && s.foes.length > 3))) return NO;
    const c = densest(s, 3);
    const need = s.stage >= 1 && s.best < d.starN ? d.starN : 0;
    const goal = Math.max(need, boss ? 30 : 22);
    const hp = s.foes.reduce((a, f) => a + Math.max(0, f.hp) + f.mir * 2, 0);
    const kills = c.n >= 2 && c.n * multOf(c.n) * hatPow(s) * (s.perk[1] === 1 ? 1.4 : 1) >= hp * 1.05 && s.foes.length > 0;
    const over = s.hung - CD - RECH;
    const full = s.buls.length >= BUL_MAX - 10;
    if (s.foes.length > 0 && ((big && (c.n >= goal || (c.n >= 1 && (over > (need ? 200 : 70) || full)))) || kills)) return at(c.x, c.y);
    if (hitIn < 1e9) {
      // 맞기 전에: 입이 덜 커졌으면 빈자리로 비키고(빈 입은 배가 안 찬다), 없으면 그냥 한입
      const q = safeSpot(s);
      if (q) return at(q.x, q.y);
      return c.n >= 1 ? at(c.x, c.y) : NO;
    }
    return NO;
  },
};

/** 못하는 봇: 아무 때나 아무 데나 톡 */
export const bulletstealRandom: Bot<StealState> = {
  name: '아무 데나 톡',
  act: (s, rng) => (!s.down && rng() < 0.035 ? at(FX0 + rng() * (FX1 - FX0), FY0 + rng() * (FY1 - FY0)) : NO),
};

/** 버릇 봇 1: 늘 화면 한가운데만 톡 (모자 입이 다 커질 때마다) */
export const bulletstealHabit: Bot<StealState> = {
  name: '버릇: 늘 화면 가운데',
  act(s) {
    if (s.down) return NO;
    const sk = skip(s);
    if (sk) return sk;
    if (s.phase === 'choice') return s.pick < 0 && s.pt > CHOICE_MIN + 2 ? at(0.27, 0.62) : NO;
    return ready(s) && hunger(s) >= 1 ? at(0.5, 0.62) : NO;
  },
};

/** 버릇 봇 2: 늘 가장 가까운 적 바로 옆을 톡 (모자 입이 다 커질 때마다) */
export const bulletstealHabit2: Bot<StealState> = {
  name: '버릇: 늘 가장 가까운 적 옆',
  act(s) {
    if (s.down) return NO;
    const sk = skip(s);
    if (sk) return sk;
    if (s.phase === 'choice') return s.pick < 0 && s.pt > CHOICE_MIN + 2 ? at(0.27, 0.62) : NO;
    if (!ready(s) || hunger(s) < 1) return NO;
    const f = nearestFoe(s, s.wx, s.wy);
    return f ? at(f.x, f.y + FOE[f.k].r + (FOE[f.k].boss ? 0.11 : f.k === 'snail' ? 0.12 : 0.06)) : NO;
  },
};

/** 측정 스크립트용 */
export const _bot = { densest, threat, safeSpot, ready, skip, at, NO };

// ───────────────────────────── 그림 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const OUT = '#3a2459';
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}
function circ(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.1, r), 0, TAU);
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
function starPath(ctx: C2, x: number, y: number, r: number, inner = 0.46, n = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let k = 0; k < n * 2; k++) {
    const a = rot + (k * Math.PI) / n, q = k % 2 ? r * inner : r;
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
/** 채우고 테두리 */
function ink(ctx: C2, fill: string | CanvasGradient, lw = 2, stroke = OUT) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}
/** 둥근 덩어리 여럿을 한 몸으로(테두리 한 번) — 구름·솜털 */
function puffs(g: C2, list: number[][], k: number, fill: string | CanvasGradient, lw = 2.2) {
  g.fillStyle = OUT;
  for (const [x, y, r] of list) (circ(g, x * k, y * k, r * k + lw), g.fill());
  g.fillStyle = fill;
  for (const [x, y, r] of list) (circ(g, x * k, y * k, r * k), g.fill());
}
/** 눈 한 쌍. mood: 0 동그란 눈 · 1 웃는 눈(^^) · 2 화난 눈썹 · 3 졸린 눈 · 4 놀란 눈(><) */
function eyes(g: C2, x: number, y: number, gap: number, r: number, mood = 0, look = 0) {
  for (const sd of [-1, 1]) {
    const ex = x + sd * gap;
    if (mood === 1 || mood === 4) {
      g.strokeStyle = OUT;
      g.lineWidth = Math.max(1.6, r * 0.5);
      g.lineCap = 'round';
      g.beginPath();
      if (mood === 1) g.arc(ex, y + r * 0.3, r * 0.8, Math.PI * 1.15, Math.PI * 1.85);
      else (g.moveTo(ex - sd * r * 0.7, y - r * 0.6), g.lineTo(ex + sd * r * 0.5, y), g.lineTo(ex - sd * r * 0.7, y + r * 0.6));
      g.stroke();
      continue;
    }
    g.fillStyle = '#ffffff';
    ell(g, ex, y, r, r * 1.12);
    g.fill();
    g.fillStyle = '#2a1a44';
    ell(g, ex + look * r * 0.3, y + r * 0.12, r * 0.62, r * 0.74);
    g.fill();
    g.fillStyle = '#ffffff';
    circ(g, ex + look * r * 0.3 - r * 0.2, y - r * 0.2, r * 0.24);
    g.fill();
    if (mood === 3) {
      g.fillStyle = OUT;
      g.beginPath();
      g.ellipse(ex, y, r * 1.05, r * 1.17, 0, Math.PI, TAU);
      g.fill();
    }
    if (mood === 2) {
      g.strokeStyle = OUT;
      g.lineWidth = Math.max(1.8, r * 0.5);
      g.beginPath();
      g.moveTo(ex - sd * r * 1.2, y - r * 1.7);
      g.lineTo(ex + sd * r * 0.9, y - r * 1.0);
      g.stroke();
    }
  }
}
function blush(g: C2, x: number, y: number, gap: number, r: number, col = 'rgba(255,120,150,.55)') {
  g.fillStyle = col;
  for (const sd of [-1, 1]) (ell(g, x + sd * gap, y, r, r * 0.6), g.fill());
}
function smile(g: C2, x: number, y: number, r: number, open = false) {
  g.strokeStyle = OUT;
  g.lineWidth = Math.max(1.5, r * 0.3);
  g.lineCap = 'round';
  g.beginPath();
  g.arc(x, y - r * 0.4, r, Math.PI * 0.15, Math.PI * 0.85);
  if (open) {
    g.closePath();
    g.fillStyle = '#c2385a';
    g.fill();
  }
  g.stroke();
}
function flower(g: C2, x: number, y: number, r: number, petal: string, core: string) {
  g.fillStyle = OUT;
  circ(g, x, y, r + 1.4);
  g.fill();
  g.fillStyle = petal;
  for (let j = 0; j < 5; j++) {
    const a = (j * TAU) / 5 - Math.PI / 2;
    circ(g, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5);
    g.fill();
  }
  g.fillStyle = core;
  circ(g, x, y, r * 0.38);
  g.fill();
}

// ── 한 번 그려 두고 찍어 쓰는 그림(적 몸·탄) ──
const SPR = new Map<string, HTMLCanvasElement>();
function sprite(key: string, size: number, sc: number, paint: (g: C2, size: number) => void): HTMLCanvasElement {
  const id = `${key}@${Math.round(size * 4)}x${sc}`;
  let c = SPR.get(id);
  if (!c) {
    if (SPR.size > 260) SPR.clear();
    c = document.createElement('canvas');
    c.width = c.height = Math.max(2, Math.ceil(size * sc));
    const g = c.getContext('2d')!;
    g.scale(sc, sc);
    g.translate(size / 2, size / 2);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    paint(g, size);
    SPR.set(id, c);
  }
  return c;
}
function blit(ctx: C2, c: HTMLCanvasElement, x: number, y: number, size: number, rot = 0, sx = 1, sy = 1) {
  if (!rot && sx === 1 && sy === 1) return void ctx.drawImage(c, x - size / 2, y - size / 2, size, size);
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.scale(sx, sy);
  ctx.drawImage(c, -size / 2, -size / 2, size, size);
  ctx.restore();
}

/** 탄 무늬 그림: [돌려 그리나(날아가는 쪽으로), 그리기(g, r)] — r = 탄 반지름(px), 오른쪽(+x)이 날아가는 쪽 */
const BUL_ART: [boolean, (g: C2, r: number) => void][] = [
  // 0 꽃잎
  [true, (g, r) => {
    g.beginPath();
    g.moveTo(r * 1.25, 0);
    g.bezierCurveTo(r * 0.5, -r * 1.05, -r * 1.2, -r * 0.95, -r * 1.15, 0);
    g.bezierCurveTo(-r * 1.2, r * 0.95, r * 0.5, r * 1.05, r * 1.25, 0);
    ink(g, lin(g, -r, 0, r, 0, [0, '#ff5d9e'], [1, '#ffc1dc']), 1.8);
    g.strokeStyle = 'rgba(255,255,255,.85)';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(-r * 0.6, 0);
    g.lineTo(r * 0.5, 0);
    g.stroke();
  }],
  // 1 먹물
  [false, (g, r) => {
    circ(g, 0, 0, r);
    ink(g, radg(g, -r * 0.3, -r * 0.3, r * 0.1, r * 1.1, [0, '#9d8cff'], [0.7, '#5b4bd6'], [1, '#3b2aa8']), 1.8);
    g.fillStyle = 'rgba(255,255,255,.85)';
    ell(g, -r * 0.35, -r * 0.4, r * 0.3, r * 0.2, -0.6);
    g.fill();
  }],
  // 2 깃털
  [true, (g, r) => {
    g.beginPath();
    g.moveTo(r * 1.4, 0);
    g.quadraticCurveTo(r * 0.2, -r * 1.0, -r * 1.3, -r * 0.35);
    g.lineTo(-r * 0.9, 0);
    g.lineTo(-r * 1.3, r * 0.35);
    g.quadraticCurveTo(r * 0.2, r * 1.0, r * 1.4, 0);
    ink(g, lin(g, -r, 0, r, 0, [0, '#18b7c9'], [1, '#b8fff4']), 1.8);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(-r * 0.8, 0);
    g.lineTo(r * 0.9, 0);
    g.stroke();
  }],
  // 3 비눗방울
  [false, (g, r) => {
    circ(g, 0, 0, r);
    g.fillStyle = radg(g, -r * 0.3, -r * 0.3, r * 0.1, r, [0, 'rgba(255,255,255,.75)'], [0.55, 'rgba(190,240,255,.35)'], [1, 'rgba(150,200,255,.55)']);
    g.fill();
    g.lineWidth = 2.4;
    g.strokeStyle = lin(g, -r, -r, r, r, [0, '#ff9ad5'], [0.35, '#fff3a0'], [0.7, '#8be9ff'], [1, '#b79bff']);
    g.stroke();
    g.strokeStyle = 'rgba(58,36,89,.55)';
    g.lineWidth = 1;
    circ(g, 0, 0, r + 1.4);
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.95)';
    ell(g, -r * 0.42, -r * 0.45, r * 0.26, r * 0.14, -0.7);
    g.fill();
    circ(g, r * 0.4, r * 0.45, r * 0.09);
    g.fill();
  }],
  // 4 빗방울
  [true, (g, r) => {
    g.beginPath();
    g.moveTo(-r * 1.45, 0);
    g.quadraticCurveTo(-r * 0.2, -r * 1.05, r * 0.7, -r * 0.7);
    g.arc(r * 0.35, 0, r * 0.82, -1.05, 1.05);
    g.quadraticCurveTo(-r * 0.2, r * 1.05, -r * 1.45, 0);
    ink(g, lin(g, -r, 0, r, 0, [0, '#bfe6ff'], [1, '#3d8bff']), 1.8);
    g.fillStyle = 'rgba(255,255,255,.9)';
    ell(g, r * 0.35, -r * 0.3, r * 0.26, r * 0.16, 0.5);
    g.fill();
  }],
  // 5 홀씨
  [false, (g, r) => {
    g.strokeStyle = OUT;
    g.lineWidth = 1.4;
    for (let j = 0; j < 7; j++) {
      const a = -Math.PI / 2 + (j - 3) * 0.42;
      g.beginPath();
      g.moveTo(0, r * 0.3);
      g.lineTo(Math.cos(a) * r * 1.1, r * 0.3 + Math.sin(a) * r * 1.1);
      g.stroke();
    }
    for (let j = 0; j < 7; j++) {
      const a = -Math.PI / 2 + (j - 3) * 0.42;
      circ(g, Math.cos(a) * r * 1.1, r * 0.3 + Math.sin(a) * r * 1.1, r * 0.3);
      ink(g, '#ffffff', 1.2);
    }
    ell(g, 0, r * 0.62, r * 0.3, r * 0.48);
    ink(g, '#c98a4b', 1.4);
  }],
  // 6 초승달
  [false, (g, r) => {
    g.beginPath();
    g.arc(0, 0, r * 1.1, 0.6, TAU - 0.6);
    g.quadraticCurveTo(-r * 0.2, 0, Math.cos(0.6) * r * 1.1, Math.sin(0.6) * r * 1.1);
    g.closePath();
    ink(g, lin(g, -r, -r, r, r, [0, '#e2b6ff'], [1, '#9a4dff']), 1.8);
  }],
  // 7 거울 조각
  [false, (g, r) => {
    g.beginPath();
    g.moveTo(0, -r * 1.3);
    g.lineTo(r * 0.95, 0);
    g.lineTo(0, r * 1.3);
    g.lineTo(-r * 0.95, 0);
    g.closePath();
    ink(g, lin(g, -r, -r, r, r, [0, '#ffffff'], [0.5, '#bfe9ff'], [1, '#7aa8e8']), 1.8);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(-r * 0.35, -r * 0.3);
    g.lineTo(r * 0.15, -r * 0.75);
    g.stroke();
  }],
  // 8 구슬
  [false, (g, r) => {
    circ(g, 0, 0, r);
    ink(g, radg(g, -r * 0.35, -r * 0.35, r * 0.05, r * 1.15, [0, '#ffffff'], [0.45, '#e3c8ff'], [1, '#a47be8']), 1.8);
    g.fillStyle = 'rgba(255,255,255,.9)';
    circ(g, -r * 0.35, -r * 0.35, r * 0.22);
    g.fill();
  }],
  // 9 알(터지기 전)
  [false, (g, r) => {
    g.beginPath();
    g.moveTo(0, -r);
    g.bezierCurveTo(r * 1.1, -r * 0.9, r * 0.95, r * 0.95, 0, r);
    g.bezierCurveTo(-r * 0.95, r * 0.95, -r * 1.1, -r * 0.9, 0, -r);
    ink(g, lin(g, 0, -r, 0, r, [0, '#fff3a0'], [1, '#ffb42e']), 2);
    g.fillStyle = 'rgba(255,255,255,.85)';
    ell(g, -r * 0.3, -r * 0.4, r * 0.22, r * 0.3, 0.4);
    g.fill();
  }],
  // 10 팝콘
  [false, (g, r) => {
    puffs(g, [[-0.45, 0.1, 0.5], [0.45, 0.1, 0.5], [0, -0.4, 0.55], [0, 0.3, 0.45]], r, '#fffdf2', 1.6);
    g.fillStyle = '#ffd98a';
    circ(g, 0, 0.05 * r, r * 0.3);
    g.fill();
  }],
  // 11 고래 노래(음표)
  [false, (g, r) => {
    g.strokeStyle = OUT;
    g.lineWidth = 4.6;
    g.beginPath();
    g.moveTo(r * 0.4, r * 0.5);
    g.lineTo(r * 0.4, -r * 1.1);
    g.lineTo(r * 1.0, -r * 0.6);
    g.stroke();
    g.strokeStyle = '#19b8a6';
    g.lineWidth = 2.4;
    g.stroke();
    ell(g, -r * 0.15, r * 0.5, r * 0.68, r * 0.52, -0.4);
    ink(g, lin(g, 0, 0, 0, r, [0, '#7ff0dc'], [1, '#19b8a6']), 1.8);
  }],
  // 12 빨간 가시(못 훔친다)
  [false, (g, r) => {
    g.fillStyle = radg(g, 0, 0, r * 0.5, r * 1.75, [0, 'rgba(255,40,60,.5)'], [1, 'rgba(255,40,60,0)']);
    circ(g, 0, 0, r * 1.75);
    g.fill();
    starPath(g, 0, 0, r * 1.22, 0.6, 9, 0);
    ink(g, lin(g, 0, -r, 0, r, [0, '#ff6b6b'], [1, '#d4002a']), 2.2, '#5a0018');
    g.strokeStyle = '#ffffff';
    g.lineWidth = Math.max(2, r * 0.2);
    g.beginPath();
    g.moveTo(-r * 0.32, -r * 0.32);
    g.lineTo(r * 0.32, r * 0.32);
    g.moveTo(r * 0.32, -r * 0.32);
    g.lineTo(-r * 0.32, r * 0.32);
    g.stroke();
  }],
  // 13 잔가시
  [true, (g, r) => {
    g.beginPath();
    g.moveTo(r * 1.5, 0);
    g.lineTo(-r * 0.9, -r * 0.7);
    g.lineTo(-r * 0.5, 0);
    g.lineTo(-r * 0.9, r * 0.7);
    g.closePath();
    ink(g, lin(g, -r, 0, r, 0, [0, '#6f6ad6'], [1, '#c9c6ff']), 1.7);
  }],
  // 14 조약돌
  [false, (g, r) => {
    ell(g, 0, 0, r * 1.05, r * 0.92, 0.3);
    ink(g, radg(g, -r * 0.3, -r * 0.3, r * 0.1, r * 1.1, [0, '#d8f5c0'], [0.6, '#8fcf7a'], [1, '#4f9a5c']), 1.8);
    g.fillStyle = 'rgba(255,255,255,.75)';
    ell(g, -r * 0.3, -r * 0.35, r * 0.28, r * 0.16, -0.5);
    g.fill();
  }],
  // 15 별똥
  [false, (g, r) => {
    starPath(g, 0, 0, r * 1.3, 0.42, 4, 0);
    ink(g, radg(g, 0, 0, 0, r * 1.2, [0, '#ffffff'], [1, '#6fc3ff']), 1.7);
  }],
  // 16 금화
  [false, (g, r) => {
    circ(g, 0, 0, r * 1.05);
    ink(g, lin(g, -r, -r, r, r, [0, '#fff6b0'], [0.5, '#ffd23f'], [1, '#f09a1a']), 2, '#7a4a08');
    g.strokeStyle = 'rgba(122,74,8,.6)';
    g.lineWidth = 1.1;
    circ(g, 0, 0, r * 0.72);
    g.stroke();
    starPath(g, 0, 0, r * 0.5);
    g.fillStyle = '#fffbe0';
    g.fill();
  }],
  // 17 혜성
  [true, (g, r) => {
    g.fillStyle = lin(g, -r * 2.2, 0, r * 0.4, 0, [0, 'rgba(140,200,255,0)'], [1, 'rgba(160,215,255,.8)']);
    g.beginPath();
    g.moveTo(r * 0.3, -r * 0.85);
    g.lineTo(-r * 2.2, 0);
    g.lineTo(r * 0.3, r * 0.85);
    g.closePath();
    g.fill();
    circ(g, r * 0.3, 0, r * 0.88);
    ink(g, radg(g, 0, -r * 0.3, 0, r, [0, '#ffffff'], [1, '#8fb8ff']), 1.7);
  }],
];
/** 탄 그림 상자 크기(반지름 배수) */
const BUL_BOX = [3.2, 2.8, 3.4, 2.8, 3.4, 3.4, 3, 3.2, 2.8, 2.8, 3.2, 3.4, 4, 3.6, 2.8, 3.2, 2.9, 5.2];
function bulSprite(k: number, r: number, sc: number) {
  return sprite('b' + k, r * BUL_BOX[k], sc, (g) => BUL_ART[k][1](g, r));
}

/** 적 몸 그림 (k = 몸 지름 px, 가운데가 0,0). 눈 깜박임·쏘기 직전 부풀기·맞을 때 흔들림은 찍을 때 입힌다 */
const FOE_ART: Record<FK, (g: C2, k: number) => void> = {
  cloud(g, k) {
    puffs(g, [[-0.36, 0.1, 0.25], [0.36, 0.1, 0.25], [-0.15, -0.12, 0.3], [0.17, -0.14, 0.28], [0, 0.14, 0.32]], k, lin(g, 0, -0.45 * k, 0, 0.45 * k, [0, '#ffffff'], [0.55, '#fff0f6'], [1, '#ffc4dc']));
    flower(g, -0.25 * k, -0.37 * k, 0.12 * k, '#ff7eb6', '#ffe14d');
    flower(g, 0.1 * k, -0.46 * k, 0.13 * k, '#ffd23f', '#ff8a5c');
    flower(g, 0.38 * k, -0.28 * k, 0.1 * k, '#8ad4ff', '#ffffff');
    eyes(g, 0, 0.02 * k, 0.15 * k, 0.07 * k, 1);
    smile(g, 0, 0.17 * k, 0.07 * k);
    blush(g, 0, 0.13 * k, 0.27 * k, 0.07 * k);
  },
  octo(g, k) {
    for (const [x0, x1, cy] of [[-0.24, -0.46, 0.5], [-0.09, -0.16, 0.58], [0.09, 0.16, 0.58], [0.24, 0.46, 0.5]]) {
      for (const [col, lw] of [[OUT, 0.16 * k + 4.4], ['#ff8068', 0.16 * k]] as [string, number][]) {
        g.strokeStyle = col;
        g.lineWidth = lw;
        g.beginPath();
        g.moveTo(x0 * k, 0.12 * k);
        g.quadraticCurveTo(x0 * k, cy * k, x1 * k, (cy - 0.1) * k);
        g.stroke();
      }
    }
    circ(g, 0, -0.08 * k, 0.38 * k);
    ink(g, radg(g, -0.12 * k, -0.26 * k, 0.05 * k, 0.5 * k, [0, '#ffc9b0'], [0.6, '#ff8a70'], [1, '#f2604f']), 2.2);
    g.fillStyle = 'rgba(255,255,255,.4)';
    circ(g, -0.22 * k, -0.3 * k, 0.05 * k);
    g.fill();
    circ(g, 0.25 * k, -0.24 * k, 0.035 * k);
    g.fill();
    circ(g, 0, 0.12 * k, 0.12 * k);
    ink(g, '#a8384a', 2.2);
    g.fillStyle = '#2a1030';
    circ(g, 0, 0.12 * k, 0.065 * k);
    g.fill();
    eyes(g, 0, -0.14 * k, 0.17 * k, 0.085 * k, 2);
  },
  bird(g, k) {
    g.beginPath();
    g.moveTo(-0.28 * k, 0.08 * k);
    g.lineTo(-0.58 * k, -0.04 * k);
    g.lineTo(-0.5 * k, 0.12 * k);
    g.lineTo(-0.6 * k, 0.26 * k);
    g.closePath();
    ink(g, '#1a9aa8', 2);
    for (const sd of [-1, 1]) {
      ell(g, sd * 0.38 * k, 0.03 * k, 0.15 * k, 0.26 * k, sd * 0.55);
      ink(g, '#22b3bd', 2);
    }
    circ(g, 0, 0, 0.36 * k);
    ink(g, radg(g, -0.1 * k, -0.16 * k, 0.04 * k, 0.46 * k, [0, '#a8fff0'], [0.6, '#3ec9c1'], [1, '#1fa3b0']), 2.2);
    ell(g, 0, 0.16 * k, 0.21 * k, 0.16 * k);
    g.fillStyle = '#fff6d8';
    g.fill();
    g.beginPath();
    g.moveTo(-0.07 * k, 0.0);
    g.lineTo(0.07 * k, 0);
    g.lineTo(0, 0.12 * k);
    g.closePath();
    ink(g, '#ffa62b', 1.8);
    eyes(g, 0, -0.1 * k, 0.15 * k, 0.085 * k, 0);
    for (const [col, lw] of [[OUT, 4.6], ['#ffffff', 2.2]] as [string, number][]) {
      g.strokeStyle = col;
      g.lineWidth = lw;
      g.beginPath();
      for (let a = 0; a < 5; a += 0.3) {
        const r = (0.015 + a * 0.024) * k, px = 0.02 * k + Math.cos(a) * r, py = -0.44 * k + Math.sin(a) * r;
        if (a) g.lineTo(px, py);
        else g.moveTo(px, py);
      }
      g.stroke();
    }
  },
  crab(g, k) {
    g.strokeStyle = OUT;
    g.lineWidth = 3.4;
    for (const sd of [-1, 1]) for (let j = 0; j < 3; j++) {
      g.beginPath();
      g.moveTo(sd * (0.18 + j * 0.09) * k, 0.24 * k);
      g.lineTo(sd * (0.3 + j * 0.11) * k, 0.42 * k);
      g.stroke();
    }
    for (const sd of [-1, 1]) {
      for (const [col, lw] of [[OUT, 0.1 * k + 4.4], ['#ff7a59', 0.1 * k]] as [string, number][]) {
        g.strokeStyle = col;
        g.lineWidth = lw;
        g.beginPath();
        g.moveTo(sd * 0.32 * k, -0.02 * k);
        g.quadraticCurveTo(sd * 0.52 * k, -0.08 * k, sd * 0.47 * k, -0.24 * k);
        g.stroke();
      }
      circ(g, sd * 0.47 * k, -0.32 * k, 0.15 * k);
      ink(g, '#ff8f6b', 2);
      g.fillStyle = OUT;
      g.beginPath();
      g.moveTo(sd * 0.47 * k, -0.3 * k);
      g.lineTo(sd * 0.41 * k, -0.5 * k);
      g.lineTo(sd * 0.53 * k, -0.5 * k);
      g.closePath();
      g.fill();
    }
    ell(g, 0, 0.08 * k, 0.4 * k, 0.27 * k);
    ink(g, lin(g, 0, -0.2 * k, 0, 0.35 * k, [0, '#ffa283'], [1, '#f2604f']), 2.2);
    g.strokeStyle = OUT;
    g.lineWidth = 3;
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.13 * k, -0.14 * k);
      g.lineTo(sd * 0.15 * k, -0.3 * k);
      g.stroke();
    }
    eyes(g, 0, -0.33 * k, 0.15 * k, 0.085 * k, 0);
    smile(g, 0, 0.14 * k, 0.09 * k, true);
    blush(g, 0, 0.08 * k, 0.27 * k, 0.06 * k, 'rgba(255,255,255,.4)');
  },
  king(g, k) {
    puffs(g, [[-0.36, 0.06, 0.2], [0.36, 0.06, 0.2], [-0.2, -0.1, 0.24], [0.2, -0.1, 0.24], [0, -0.16, 0.26], [-0.1, 0.12, 0.24], [0.12, 0.12, 0.24], [-0.46, -0.03, 0.12], [0.46, -0.03, 0.12]], k, lin(g, 0, -0.4 * k, 0, 0.36 * k, [0, '#c9bbff'], [0.5, '#9482e8'], [1, '#6450bd']), 3);
    g.fillStyle = 'rgba(255,255,255,.28)';
    ell(g, -0.16 * k, -0.28 * k, 0.12 * k, 0.05 * k, -0.4);
    g.fill();
    g.beginPath();
    g.moveTo(-0.17 * k, -0.36 * k);
    g.lineTo(-0.21 * k, -0.55 * k);
    g.lineTo(-0.09 * k, -0.45 * k);
    g.lineTo(0, -0.6 * k);
    g.lineTo(0.09 * k, -0.45 * k);
    g.lineTo(0.21 * k, -0.55 * k);
    g.lineTo(0.17 * k, -0.36 * k);
    g.closePath();
    ink(g, lin(g, 0, -0.6 * k, 0, -0.36 * k, [0, '#fff6b0'], [1, '#ffb42e']), 2.6, '#7a4a08');
    circ(g, 0, -0.43 * k, 0.03 * k);
    ink(g, '#ff5a7a', 1.6, '#7a4a08');
    for (const sd of [-1, 1]) {
      ell(g, sd * 0.14 * k, -0.1 * k, 0.075 * k, 0.085 * k);
      ink(g, '#fff7b0', 2.2);
      g.fillStyle = '#2a1a44';
      circ(g, sd * 0.13 * k, -0.08 * k, 0.04 * k);
      g.fill();
      g.strokeStyle = OUT;
      g.lineWidth = 0.035 * k;
      g.beginPath();
      g.moveTo(sd * 0.24 * k, -0.24 * k);
      g.lineTo(sd * 0.06 * k, -0.16 * k);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(-0.14 * k, 0.07 * k);
    g.quadraticCurveTo(0, -0.02 * k, 0.14 * k, 0.07 * k);
    g.quadraticCurveTo(0, 0.13 * k, -0.14 * k, 0.07 * k);
    ink(g, '#3a1f5c', 2.2);
    g.fillStyle = '#ffffff';
    for (const tx of [-0.06, 0, 0.06]) {
      g.beginPath();
      g.moveTo((tx - 0.025) * k, 0.035 * k);
      g.lineTo((tx + 0.025) * k, 0.035 * k);
      g.lineTo(tx * k, 0.075 * k);
      g.closePath();
      g.fill();
    }
  },
  puff(g, k) {
    for (const [col, lw] of [[OUT, 5.4], ['#6fbf4a', 2.8]] as [string, number][]) {
      g.strokeStyle = col;
      g.lineWidth = lw;
      g.beginPath();
      g.moveTo(0, 0.2 * k);
      g.quadraticCurveTo(0.1 * k, 0.4 * k, -0.04 * k, 0.54 * k);
      g.stroke();
    }
    const fl: number[][] = [];
    for (let j = 0; j < 12; j++) fl.push([Math.cos((j * TAU) / 12) * 0.35, -0.04 + Math.sin((j * TAU) / 12) * 0.35, 0.12]);
    puffs(g, fl, k, '#ffffff', 2);
    circ(g, 0, -0.04 * k, 0.3 * k);
    ink(g, radg(g, -0.08 * k, -0.14 * k, 0.02 * k, 0.34 * k, [0, '#fffbc8'], [1, '#f5d04a']), 2);
    eyes(g, 0, -0.07 * k, 0.12 * k, 0.07 * k, 3);
    smile(g, 0, 0.09 * k, 0.06 * k);
    blush(g, 0, 0.05 * k, 0.2 * k, 0.05 * k);
  },
  bat(g, k) {
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.12 * k, -0.05 * k);
      g.quadraticCurveTo(sd * 0.4 * k, -0.5 * k, sd * 0.62 * k, -0.2 * k);
      g.quadraticCurveTo(sd * 0.52 * k, -0.02 * k, sd * 0.56 * k, 0.14 * k);
      g.quadraticCurveTo(sd * 0.42 * k, 0.02 * k, sd * 0.36 * k, 0.2 * k);
      g.quadraticCurveTo(sd * 0.26 * k, 0.06 * k, sd * 0.12 * k, 0.18 * k);
      g.closePath();
      ink(g, '#7a4bc0', 2.2);
      g.beginPath();
      g.moveTo(sd * 0.08 * k, -0.26 * k);
      g.lineTo(sd * 0.2 * k, -0.5 * k);
      g.lineTo(sd * 0.26 * k, -0.2 * k);
      g.closePath();
      ink(g, '#9a6be0', 2);
    }
    ell(g, 0, 0, 0.27 * k, 0.3 * k);
    ink(g, radg(g, -0.08 * k, -0.12 * k, 0.03 * k, 0.36 * k, [0, '#d9bdff'], [1, '#9a6be0']), 2.2);
    eyes(g, 0, -0.06 * k, 0.11 * k, 0.075 * k, 0);
    g.fillStyle = '#ffffff';
    g.strokeStyle = OUT;
    g.lineWidth = 1.2;
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.03 * k, 0.1 * k);
      g.lineTo(sd * 0.1 * k, 0.1 * k);
      g.lineTo(sd * 0.065 * k, 0.2 * k);
      g.closePath();
      g.fill();
      g.stroke();
    }
  },
  jelly(g, k) {
    for (const j of [-1.5, -0.5, 0.5, 1.5]) for (const [col, lw] of [[OUT, 4.8], ['#b9a4ff', 2.4]] as [string, number][]) {
      g.strokeStyle = col;
      g.lineWidth = lw;
      g.beginPath();
      g.moveTo(j * 0.15 * k, 0.08 * k);
      g.bezierCurveTo(j * 0.15 * k + 0.09 * k, 0.24 * k, j * 0.15 * k - 0.09 * k, 0.38 * k, j * 0.17 * k, 0.54 * k);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(-0.42 * k, 0.1 * k);
    g.bezierCurveTo(-0.46 * k, -0.56 * k, 0.46 * k, -0.56 * k, 0.42 * k, 0.1 * k);
    for (let i = 0; i < 4; i++) g.quadraticCurveTo((0.42 - (i + 0.5) * 0.21) * k, 0.2 * k, (0.42 - (i + 1) * 0.21) * k, 0.1 * k);
    g.closePath();
    ink(g, lin(g, 0, -0.42 * k, 0, 0.16 * k, [0, '#e3fff8'], [0.5, '#a8ecf0'], [1, '#b9a4ff']), 2.2);
    g.fillStyle = 'rgba(255,255,255,.75)';
    ell(g, -0.2 * k, -0.25 * k, 0.1 * k, 0.045 * k, -0.6);
    g.fill();
    eyes(g, 0, -0.1 * k, 0.14 * k, 0.075 * k, 0);
    smile(g, 0, 0.03 * k, 0.06 * k);
    blush(g, 0, -0.01 * k, 0.25 * k, 0.055 * k);
  },
  corn(g, k) {
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.04 * k, 0.46 * k);
      g.quadraticCurveTo(sd * 0.56 * k, 0.32 * k, sd * 0.46 * k, -0.22 * k);
      g.quadraticCurveTo(sd * 0.2 * k, 0.1 * k, sd * 0.04 * k, 0.46 * k);
      ink(g, lin(g, 0, -0.2 * k, 0, 0.46 * k, [0, '#9be06a'], [1, '#4fa83a']), 2.2);
    }
    ell(g, 0, -0.06 * k, 0.25 * k, 0.42 * k);
    ink(g, lin(g, 0, -0.48 * k, 0, 0.36 * k, [0, '#fff6ae'], [1, '#ffc22e']), 2.2);
    g.fillStyle = 'rgba(214,140,10,.5)';
    for (let r = 0; r < 3; r++) for (let c = -1; c <= 1; c++) {
      circ(g, c * 0.11 * k + (r % 2) * 0.055 * k - 0.02 * k, (-0.4 + r * 0.075) * k, 0.03 * k);
      g.fill();
    }
    eyes(g, 0, -0.1 * k, 0.1 * k, 0.07 * k, 0);
    smile(g, 0, 0.06 * k, 0.07 * k, true);
    blush(g, 0, 0.0, 0.18 * k, 0.045 * k);
  },
  whale(g, k) {
    // 꼬리
    g.beginPath();
    g.moveTo(0.36 * k, -0.02 * k);
    g.quadraticCurveTo(0.5 * k, -0.08 * k, 0.5 * k, -0.24 * k);
    g.quadraticCurveTo(0.4 * k, -0.34 * k, 0.36 * k, -0.42 * k);
    g.quadraticCurveTo(0.52 * k, -0.4 * k, 0.56 * k, -0.3 * k);
    g.quadraticCurveTo(0.62 * k, -0.4 * k, 0.74 * k, -0.4 * k);
    g.quadraticCurveTo(0.68 * k, -0.24 * k, 0.6 * k, -0.2 * k);
    g.quadraticCurveTo(0.6 * k, 0.04 * k, 0.4 * k, 0.14 * k);
    g.closePath();
    ink(g, '#3f8fe0', 3);
    ell(g, -0.04 * k, 0, 0.47 * k, 0.28 * k);
    ink(g, lin(g, 0, -0.28 * k, 0, 0.28 * k, [0, '#8fd0ff'], [0.55, '#5aa9f0'], [1, '#3f86d8']), 3);
    g.save();
    ell(g, -0.04 * k, 0, 0.47 * k, 0.28 * k);
    g.clip();
    ell(g, -0.1 * k, 0.24 * k, 0.44 * k, 0.16 * k);
    g.fillStyle = '#eaf7ff';
    g.fill();
    g.strokeStyle = 'rgba(90,150,210,.55)';
    g.lineWidth = 1.6;
    for (let j = 0; j < 6; j++) {
      g.beginPath();
      g.moveTo((-0.42 + j * 0.13) * k, 0.12 * k);
      g.lineTo((-0.46 + j * 0.13) * k, 0.3 * k);
      g.stroke();
    }
    g.restore();
    g.fillStyle = 'rgba(255,255,255,.4)';
    ell(g, -0.2 * k, -0.18 * k, 0.16 * k, 0.045 * k, -0.2);
    g.fill();
    // 눈·볼·입
    circ(g, -0.3 * k, -0.02 * k, 0.045 * k);
    ink(g, '#ffffff', 1.8);
    g.fillStyle = '#2a1a44';
    circ(g, -0.31 * k, -0.01 * k, 0.026 * k);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 0.022 * k;
    g.beginPath();
    g.moveTo(-0.4 * k, -0.12 * k);
    g.lineTo(-0.24 * k, -0.08 * k);
    g.stroke();
    g.beginPath();
    g.moveTo(-0.5 * k, 0.07 * k);
    g.quadraticCurveTo(-0.36 * k, 0.16 * k, -0.2 * k, 0.09 * k);
    g.stroke();
    blush(g, -0.22 * k, 0.04 * k, 0.001, 0.04 * k);
    // 선장 모자
    ell(g, -0.12 * k, -0.27 * k, 0.17 * k, 0.04 * k, -0.08);
    ink(g, '#27335f', 2.2);
    g.beginPath();
    g.moveTo(-0.25 * k, -0.28 * k);
    g.quadraticCurveTo(-0.26 * k, -0.44 * k, -0.11 * k, -0.44 * k);
    g.quadraticCurveTo(0.03 * k, -0.44 * k, 0.02 * k, -0.3 * k);
    g.closePath();
    ink(g, '#ffffff', 2.2);
    circ(g, -0.12 * k, -0.35 * k, 0.032 * k);
    ink(g, '#ffd23f', 1.4, '#7a4a08');
    // 가슴지느러미
    g.beginPath();
    g.moveTo(-0.08 * k, 0.16 * k);
    g.quadraticCurveTo(0.02 * k, 0.4 * k, 0.16 * k, 0.34 * k);
    g.quadraticCurveTo(0.1 * k, 0.24 * k, 0.08 * k, 0.16 * k);
    g.closePath();
    ink(g, '#3f8fe0', 2.4);
  },
  urchin(g, k) {
    for (let j = 0; j < 14; j++) {
      const a = (j * TAU) / 14;
      g.beginPath();
      g.moveTo(Math.cos(a - 0.22) * 0.28 * k, Math.sin(a - 0.22) * 0.28 * k);
      g.lineTo(Math.cos(a) * 0.53 * k, Math.sin(a) * 0.53 * k);
      g.lineTo(Math.cos(a + 0.22) * 0.28 * k, Math.sin(a + 0.22) * 0.28 * k);
      g.closePath();
      ink(g, j % 2 ? '#ff5a6e' : '#5d5ac4', 2);
    }
    circ(g, 0, 0, 0.31 * k);
    ink(g, radg(g, -0.1 * k, -0.12 * k, 0.03 * k, 0.38 * k, [0, '#9d9af0'], [1, '#4744a8']), 2.2);
    eyes(g, 0, -0.03 * k, 0.12 * k, 0.08 * k, 2);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 1.7;
    g.beginPath();
    g.moveTo(-0.09 * k, 0.15 * k);
    g.lineTo(-0.045 * k, 0.11 * k);
    g.lineTo(0, 0.15 * k);
    g.lineTo(0.045 * k, 0.11 * k);
    g.lineTo(0.09 * k, 0.15 * k);
    g.stroke();
  },
  snail(g, k) {
    ell(g, 0.02 * k, 0.3 * k, 0.44 * k, 0.13 * k);
    ink(g, '#ffe7b8', 2.2);
    g.strokeStyle = OUT;
    g.lineWidth = 3;
    for (const [ex, ey] of [[0.3, -0.12], [0.47, -0.1]]) {
      g.beginPath();
      g.moveTo((ex + 0.03) * k, 0.14 * k);
      g.lineTo(ex * k, ey * k);
      g.stroke();
    }
    circ(g, 0.37 * k, 0.16 * k, 0.14 * k);
    ink(g, '#ffe7b8', 2.2);
    for (const [ex, ey] of [[0.3, -0.14], [0.47, -0.12]]) {
      circ(g, ex * k, ey * k, 0.06 * k);
      ink(g, '#ffffff', 1.8);
      g.fillStyle = '#2a1a44';
      circ(g, (ex + 0.01) * k, (ey + 0.01) * k, 0.032 * k);
      g.fill();
    }
    smile(g, 0.39 * k, 0.2 * k, 0.045 * k);
    circ(g, -0.06 * k, -0.02 * k, 0.3 * k);
    ink(g, radg(g, -0.16 * k, -0.14 * k, 0.03 * k, 0.38 * k, [0, '#c9ffec'], [0.6, '#35c7a4'], [1, '#1f8f86']), 2.2);
    g.strokeStyle = 'rgba(20,90,90,.75)';
    g.lineWidth = 2.2;
    g.beginPath();
    for (let a = 0; a < 9.5; a += 0.3) {
      const r = (0.01 + a * 0.026) * k, px = -0.06 * k + Math.cos(a) * r, py = -0.02 * k + Math.sin(a) * r;
      if (a) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.6)';
    ell(g, -0.18 * k, -0.18 * k, 0.07 * k, 0.035 * k, -0.6);
    g.fill();
  },
  fish(g, k) {
    starPath(g, -0.4 * k, 0, 0.2 * k, 0.5, 5, 0);
    ink(g, '#ffe14d', 1.8);
    g.beginPath();
    g.moveTo(-0.06 * k, -0.18 * k);
    g.lineTo(0.08 * k, -0.36 * k);
    g.lineTo(0.16 * k, -0.16 * k);
    g.closePath();
    ink(g, '#4f9be0', 1.7);
    ell(g, 0.04 * k, 0, 0.36 * k, 0.23 * k);
    ink(g, lin(g, 0, -0.22 * k, 0, 0.22 * k, [0, '#e3f5ff'], [1, '#6fb6f2']), 2);
    circ(g, 0.2 * k, -0.04 * k, 0.085 * k);
    ink(g, '#ffffff', 1.4);
    g.fillStyle = '#2a1a44';
    circ(g, 0.22 * k, -0.03 * k, 0.045 * k);
    g.fill();
  },
  pie(g, k) {
    g.beginPath();
    g.moveTo(-0.2 * k, 0.1 * k);
    g.lineTo(-0.64 * k, 0.3 * k);
    g.lineTo(-0.56 * k, 0.1 * k);
    g.lineTo(-0.3 * k, -0.06 * k);
    g.closePath();
    ink(g, lin(g, -0.6 * k, 0, -0.2 * k, 0, [0, '#22d3ee'], [1, '#2b2540']), 2);
    circ(g, 0.02 * k, 0.42 * k, 0.14 * k);
    ink(g, '#c98a4b', 2);
    circ(g, 0.02 * k, 0.42 * k, 0.07 * k);
    ink(g, '#ffd23f', 1.4, '#7a4a08');
    circ(g, 0, 0, 0.34 * k);
    ink(g, '#352c52', 2.2);
    ell(g, 0.02 * k, 0.15 * k, 0.21 * k, 0.16 * k);
    g.fillStyle = '#ffffff';
    g.fill();
    for (const sd of [-1, 1]) {
      ell(g, sd * 0.33 * k, 0.04 * k, 0.11 * k, 0.2 * k, sd * 0.5);
      ink(g, lin(g, 0, -0.1 * k, 0, 0.2 * k, [0, '#4f7bff'], [1, '#22d3ee']), 1.8);
    }
    g.beginPath();
    g.moveTo(-0.07 * k, 0.0);
    g.lineTo(0.07 * k, 0);
    g.lineTo(0, 0.13 * k);
    g.closePath();
    ink(g, '#ffc02e', 1.8);
    eyes(g, 0, -0.1 * k, 0.13 * k, 0.08 * k, 0);
  },
  owl(g, k) {
    for (const sd of [-1, 1]) {
      ell(g, sd * 0.4 * k, 0.05 * k, 0.14 * k, 0.32 * k, sd * 0.25);
      ink(g, '#6b4a8a', 3);
    }
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.12 * k, -0.34 * k);
      g.lineTo(sd * 0.35 * k, -0.58 * k);
      g.lineTo(sd * 0.36 * k, -0.24 * k);
      g.closePath();
      ink(g, '#7a55a8', 3);
    }
    ell(g, 0, 0.02 * k, 0.38 * k, 0.42 * k);
    ink(g, lin(g, 0, -0.4 * k, 0, 0.44 * k, [0, '#c4a0e0'], [1, '#7a55a8']), 3);
    ell(g, 0, 0.18 * k, 0.25 * k, 0.23 * k);
    g.fillStyle = '#f6e9ff';
    g.fill();
    g.strokeStyle = 'rgba(122,85,168,.5)';
    g.lineWidth = 2;
    for (let r = 0; r < 3; r++) for (let c = -1; c <= 1; c++) {
      g.beginPath();
      g.arc(c * 0.12 * k + (r % 2) * 0.06 * k - 0.03 * k, (0.08 + r * 0.09) * k, 0.04 * k, 0.2, Math.PI - 0.2);
      g.stroke();
    }
    for (const sd of [-1, 1]) {
      circ(g, sd * 0.15 * k, -0.12 * k, 0.15 * k);
      ink(g, '#fff6e0', 2.6);
      circ(g, sd * 0.15 * k, -0.12 * k, 0.095 * k);
      ink(g, '#ffd23f', 1.8);
      g.fillStyle = '#2a1a44';
      circ(g, sd * 0.14 * k, -0.11 * k, 0.05 * k);
      g.fill();
      g.fillStyle = '#ffffff';
      circ(g, sd * 0.14 * k - 0.02 * k, -0.135 * k, 0.02 * k);
      g.fill();
      g.strokeStyle = OUT;
      g.lineWidth = 0.04 * k;
      g.beginPath();
      g.moveTo(sd * 0.3 * k, -0.32 * k);
      g.lineTo(sd * 0.05 * k, -0.22 * k);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(-0.05 * k, -0.04 * k);
    g.lineTo(0.05 * k, -0.04 * k);
    g.lineTo(0, 0.07 * k);
    g.closePath();
    ink(g, '#ffa62b', 2);
    for (const [sx, sy, sr] of [[0, -0.5, 0.085], [-0.15, -0.44, 0.06], [0.15, -0.44, 0.06]]) {
      starPath(g, sx * k, sy * k, sr * k);
      ink(g, '#ffe14d', 1.8, '#7a4a08');
    }
  },
};
/** 그림 크기: 몸 지름(가로 폭 = 1) · 그림 상자 배수 */
const FOE_K: Record<FK, number> = { cloud: 0.125, octo: 0.12, bird: 0.115, crab: 0.115, king: 0.42, puff: 0.12, bat: 0.115, jelly: 0.12, corn: 0.12, whale: 0.46, urchin: 0.11, snail: 0.115, fish: 0.085, pie: 0.115, owl: 0.42 };
const FOE_COL: Record<FK, string> = { cloud: '#ff9ac4', octo: '#ff8a70', bird: '#3ec9c1', crab: '#ff7a59', king: '#9482e8', puff: '#f5d04a', bat: '#9a6be0', jelly: '#a8ecf0', corn: '#ffc22e', whale: '#5aa9f0', urchin: '#5d5ac4', snail: '#35c7a4', fish: '#6fb6f2', pie: '#4f7bff', owl: '#a57ad0' };

/** 대장 갑옷 판 하나 (쇠 방패) */
function plate(ctx: C2, x: number, y: number, pw: number, ph: number, wob: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wob);
  ctx.beginPath();
  ctx.moveTo(-pw / 2, -ph / 2);
  ctx.lineTo(pw / 2, -ph / 2);
  ctx.lineTo(pw / 2, ph * 0.1);
  ctx.quadraticCurveTo(pw / 2, ph * 0.5, 0, ph * 0.62);
  ctx.quadraticCurveTo(-pw / 2, ph * 0.5, -pw / 2, ph * 0.1);
  ctx.closePath();
  ink(ctx, lin(ctx, -pw / 2, -ph / 2, pw / 2, ph / 2, [0, '#f4f8ff'], [0.45, '#a9b8d6'], [1, '#6c7ba3']), 2.4);
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.beginPath();
  ctx.moveTo(-pw * 0.32, -ph * 0.36);
  ctx.lineTo(-pw * 0.1, -ph * 0.36);
  ctx.lineTo(-pw * 0.32, ph * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4b587c';
  for (const [rx, ry] of [[-0.32, -0.32], [0.32, -0.32], [0, 0.34]]) (circ(ctx, rx * pw, ry * ph, Math.max(1.2, pw * 0.06)), ctx.fill());
  ctx.restore();
}
/** 대장마다 갑옷 판 자리(몸 지름 배수) */
const ARMOR: Partial<Record<FK, number[][]>> = {
  king: [[-0.22, 0.25], [0, 0.29], [0.22, 0.25]],
  whale: [[-0.14, 0.1], [0.06, 0.12], [0.26, 0.08]],
  owl: [[-0.19, 0.2], [0, 0.26], [0.19, 0.2]],
};

// ── 먹보 모자 (원점 = 챙 가운데, 위로 솟는다). open 0~1 입 벌림 · bulge 0~1 볼록 · hungry 0~1 배고픔 ──
const BAND = ['#ffd23f', '#ff8fb1', '#7fe3ff', '#b2f57a', '#ffb86b'];
function drawHat(ctx: C2, k: number, o: { open: number; bulge: number; lvl: number; hungry: number; t: number }) {
  const b = 1 + 0.32 * o.bulge, tier = Math.min(4, Math.floor(o.lvl / 3)), open = o.open;
  const sway = Math.sin(o.t * 0.11) * 0.03 * k;
  // 챙(뒤)
  ell(ctx, 0, 0, 0.46 * k, 0.12 * k);
  ink(ctx, '#5a35b0', 2.4);
  // 고깔
  ctx.beginPath();
  ctx.moveTo(-0.3 * k * b, -0.02 * k);
  ctx.bezierCurveTo(-0.27 * k * b, -0.36 * k, -0.1 * k, -0.56 * k, -0.3 * k + sway, -0.78 * k);
  ctx.bezierCurveTo(-0.02 * k + sway * 0.5, -0.8 * k, 0.27 * k * b, -0.42 * k, 0.3 * k * b, -0.02 * k);
  ctx.quadraticCurveTo(0, 0.07 * k, -0.3 * k * b, -0.02 * k);
  ctx.closePath();
  ink(ctx, lin(ctx, -0.3 * k, -0.5 * k, 0.3 * k, 0, [0, '#b48cff'], [0.5, '#8a5cf0'], [1, '#6a3fd0']), 2.4);
  // 헝겊 조각(레벨 5부터)
  if (o.lvl >= 5) {
    ctx.save();
    ctx.translate(0.14 * k * b, -0.36 * k);
    ctx.rotate(0.3);
    rr(ctx, -0.05 * k, -0.045 * k, 0.1 * k, 0.09 * k, 2);
    ink(ctx, '#ffb86b', 1.4);
    ctx.restore();
  }
  // 끝의 별
  starPath(ctx, -0.32 * k + sway, -0.8 * k, (0.085 + 0.004 * o.lvl) * k, 0.46, 5, o.t * 0.03);
  ink(ctx, '#ffe14d', 1.8, '#7a4a08');
  // 띠
  ctx.beginPath();
  ctx.moveTo(-0.3 * k * b, -0.02 * k);
  ctx.quadraticCurveTo(0, 0.07 * k, 0.3 * k * b, -0.02 * k);
  ctx.lineTo(0.29 * k * b, -0.13 * k);
  ctx.quadraticCurveTo(0, -0.045 * k, -0.29 * k * b, -0.13 * k);
  ctx.closePath();
  ink(ctx, o.lvl >= 14 ? lin(ctx, -0.3 * k, 0, 0.3 * k, 0, [0, '#ff8fb1'], [0.35, '#ffd23f'], [0.7, '#7fe3ff'], [1, '#b48cff']) : BAND[tier], 2);
  const ns = Math.min(5, 1 + tier);
  for (let j = 0; j < ns; j++) {
    const u = ns === 1 ? 0 : (j / (ns - 1) - 0.5) * 2;
    starPath(ctx, u * 0.2 * k * b, (-0.045 - 0.035 * (1 - u * u) + 0.03) * k - 0.05 * k, 0.04 * k);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  // 날개(레벨 10부터)
  if (o.lvl >= 10) for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * 0.36 * k, -0.02 * k);
    ctx.quadraticCurveTo(sd * 0.62 * k, -0.3 * k + Math.sin(o.t * 0.3) * 0.05 * k, sd * 0.7 * k, -0.06 * k);
    ctx.quadraticCurveTo(sd * 0.56 * k, -0.02 * k, sd * 0.36 * k, 0.03 * k);
    ctx.closePath();
    ink(ctx, '#ffffff', 1.8);
  }
  // 얼굴: 눈
  const ey = -0.42 * k, look = open > 0.3 ? 4 : o.hungry >= 1 ? 0 : 3;
  eyes(ctx, 0, ey, 0.1 * k * b, 0.05 * k, look);
  // 입: 닫힘(지그재그) ↔ 아~앙(이빨·혀)
  const my = -0.24 * k, mw = (0.17 + 0.07 * open) * k * b, mh = (0.012 + 0.13 * open + 0.02 * o.hungry) * k;
  if (open < 0.12) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let j = 0; j <= 6; j++) {
      const px = -mw + (j / 6) * mw * 2, py = my + (j % 2 ? -1 : 1) * (0.025 + 0.02 * o.hungry) * k;
      if (j) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.stroke();
    if (o.hungry >= 1) {
      // 배고파 침 한 방울
      const dy = ((o.t * 0.04) % 1) * 0.1 * k;
      ctx.fillStyle = 'rgba(160,220,255,.9)';
      ell(ctx, mw * 0.7, my + 0.05 * k + dy, 0.02 * k, 0.03 * k);
      ctx.fill();
    }
  } else {
    ell(ctx, 0, my, mw, mh);
    ink(ctx, '#5a1238', 2.2);
    ctx.save();
    ell(ctx, 0, my, mw, mh);
    ctx.clip();
    ctx.fillStyle = '#ff7a9c';
    ell(ctx, 0, my + mh * 0.75, mw * 0.6, mh * 0.6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (let j = 0; j < 5; j++) {
      const px = -mw * 0.8 + j * mw * 0.4;
      ctx.beginPath();
      ctx.moveTo(px - mw * 0.2, my - mh);
      ctx.lineTo(px + mw * 0.2, my - mh);
      ctx.lineTo(px, my - mh * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px - mw * 0.2 + mw * 0.2, my + mh);
      ctx.lineTo(px + mw * 0.2 + mw * 0.2, my + mh);
      ctx.lineTo(px + mw * 0.2, my + mh * 0.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  // 챙(앞)
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.46 * k, 0.12 * k, 0, 0.08, Math.PI - 0.08);
  ctx.quadraticCurveTo(0, 0.1 * k, 0.46 * k * Math.cos(0.08), 0.12 * k * Math.sin(0.08));
  ink(ctx, lin(ctx, 0, 0, 0, 0.13 * k, [0, '#7a4fd6'], [1, '#5a35b0']), 2.2);
  if (o.lvl >= 14) {
    // 작은 왕관
    ctx.beginPath();
    ctx.moveTo(0.02 * k, -0.56 * k);
    ctx.lineTo(0.0, -0.68 * k);
    ctx.lineTo(0.06 * k, -0.62 * k);
    ctx.lineTo(0.1 * k, -0.7 * k);
    ctx.lineTo(0.14 * k, -0.6 * k);
    ctx.lineTo(0.2 * k, -0.62 * k);
    ctx.lineTo(0.17 * k, -0.52 * k);
    ctx.closePath();
    ink(ctx, '#ffd23f', 1.6, '#7a4a08');
  }
}

/** 꼬마 마녀. pose: 0 둥실 · 1 슝 · 2 꿀꺽 · 3 퉤! · 4 아얏 · 5 만세 · 6 데굴데굴(실패) */
function drawWitch(ctx: C2, x: number, y: number, k: number, o: { face: number; pose: number; t: number; open: number; bulge: number; lvl: number; hungry: number }) {
  const t = o.t, p = o.pose;
  ctx.save();
  ctx.translate(x, y + (p === 0 || p === 5 ? Math.sin(t * 0.09) * 0.03 * k : 0));
  ctx.scale(o.face, 1);
  ctx.rotate(p === 1 ? -0.3 : p === 3 ? 0.14 : p === 4 ? Math.sin(t * 0.6) * 0.25 : p === 6 ? t * 0.22 : Math.sin(t * 0.05) * 0.04);
  if (p === 1) ctx.scale(1.18, 0.86);
  if (p === 3) ctx.scale(0.94, 1.06);
  // 빗자루
  const bw = Math.sin(t * 0.25) * 0.03 * k;
  ctx.beginPath();
  ctx.moveTo(-0.46 * k, 0.21 * k);
  ctx.lineTo(-0.9 * k, 0.1 * k + bw);
  ctx.lineTo(-0.96 * k, 0.26 * k - bw);
  ctx.lineTo(-0.88 * k, 0.4 * k + bw);
  ctx.closePath();
  ink(ctx, lin(ctx, -0.96 * k, 0, -0.46 * k, 0, [0, '#ffe9a8'], [1, '#f0b84a']), 2.2);
  ctx.strokeStyle = 'rgba(160,100,20,.6)';
  ctx.lineWidth = 1.3;
  for (const yy of [0.17, 0.25, 0.32]) {
    ctx.beginPath();
    ctx.moveTo(-0.5 * k, 0.21 * k);
    ctx.lineTo(-0.9 * k, yy * k);
    ctx.stroke();
  }
  for (const [col, lw] of [[OUT, 0.06 * k + 4.4], ['#c98a4b', 0.06 * k]] as [string, number][]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(-0.5 * k, 0.22 * k);
    ctx.lineTo(0.6 * k, 0.1 * k);
    ctx.stroke();
  }
  rr(ctx, -0.54 * k, 0.17 * k, 0.09 * k, 0.1 * k, 2);
  ink(ctx, '#ff6b6b', 1.8);
  // 목도리(뒤로 펄럭)
  for (const [col, lw] of [[OUT, 0.085 * k + 4], ['#ff6b6b', 0.085 * k]] as [string, number][]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(-0.04 * k, -0.1 * k);
    for (let j = 1; j <= 5; j++) ctx.lineTo(-0.04 * k - j * 0.085 * k, -0.1 * k + Math.sin(t * 0.3 + j * 1.1) * 0.035 * k * j * 0.5 - j * 0.012 * k);
    ctx.stroke();
  }
  // 다리·구두
  for (const [lx, bx] of [[-0.04, 0.0], [0.08, 0.14]]) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 0.07 * k + 3.6;
    ctx.beginPath();
    ctx.moveTo(lx * k, 0.16 * k);
    ctx.lineTo(bx * k, 0.33 * k + Math.sin(t * 0.2 + lx * 9) * 0.015 * k);
    ctx.stroke();
    ctx.strokeStyle = '#fff3e0';
    ctx.lineWidth = 0.07 * k;
    ctx.stroke();
    ell(ctx, (bx + 0.035) * k, 0.36 * k + Math.sin(t * 0.2 + lx * 9) * 0.015 * k, 0.085 * k, 0.05 * k);
    ink(ctx, '#7a3fd0', 2);
  }
  // 옷
  ctx.beginPath();
  ctx.moveTo(-0.13 * k, -0.12 * k);
  ctx.quadraticCurveTo(-0.3 * k, 0.06 * k, -0.3 * k, 0.24 * k);
  ctx.quadraticCurveTo(0, 0.3 * k, 0.24 * k, 0.2 * k);
  ctx.quadraticCurveTo(0.24 * k, 0.02 * k, 0.16 * k, -0.12 * k);
  ctx.closePath();
  ink(ctx, lin(ctx, 0, -0.12 * k, 0, 0.26 * k, [0, '#6f8bff'], [1, '#4a5fe0']), 2.2);
  ctx.fillStyle = '#ffe14d';
  starPath(ctx, 0.0, 0.1 * k, 0.05 * k);
  ctx.fill();
  // 머리칼(양 갈래)
  for (const [hx, hr] of [[-0.21, 0.11], [0.27, 0.1]]) {
    circ(ctx, hx * k, (-0.2 + Math.sin(t * 0.13 + hx * 5) * 0.012) * k, hr * k);
    ink(ctx, '#ff9a3d', 2.2);
  }
  // 얼굴
  circ(ctx, 0.03 * k, -0.3 * k, 0.215 * k);
  ink(ctx, lin(ctx, 0, -0.5 * k, 0, -0.1 * k, [0, '#fff0de'], [1, '#ffd9bb']), 2.2);
  ctx.fillStyle = '#ff9a3d';
  ctx.beginPath();
  ctx.ellipse(0.03 * k, -0.34 * k, 0.21 * k, 0.17 * k, 0, Math.PI * 1.02, Math.PI * 1.98);
  ctx.quadraticCurveTo(0.1 * k, -0.36 * k, 0.03 * k, -0.42 * k);
  ctx.quadraticCurveTo(-0.06 * k, -0.34 * k, -0.18 * k, -0.37 * k);
  ctx.closePath();
  ctx.fill();
  const blink = p === 0 && t % 150 < 6;
  eyes(ctx, 0.05 * k, -0.27 * k, 0.085 * k, 0.047 * k, p === 1 || p === 4 || p === 6 ? 4 : p === 2 || p === 5 || blink ? 1 : 0, 0.5);
  blush(ctx, 0.05 * k, -0.2 * k, 0.14 * k, 0.04 * k);
  if (p === 3 || p === 5) {
    ell(ctx, 0.06 * k, -0.17 * k, 0.045 * k, 0.04 * k);
    ink(ctx, '#c2385a', 1.6);
  } else if (p === 4 || p === 6) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0.0, -0.16 * k);
    ctx.quadraticCurveTo(0.03 * k, -0.2 * k, 0.06 * k, -0.16 * k);
    ctx.quadraticCurveTo(0.09 * k, -0.12 * k, 0.12 * k, -0.16 * k);
    ctx.stroke();
  } else smile(ctx, 0.06 * k, -0.17 * k, 0.04 * k);
  // 팔
  const up = p === 2 || p === 5;
  for (const [col, lw] of [[OUT, 0.065 * k + 3.6], ['#6f8bff', 0.065 * k]] as [string, number][]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(0.1 * k, -0.04 * k);
    if (up) ctx.lineTo(0.3 * k, -0.4 * k);
    else ctx.lineTo(0.32 * k, 0.1 * k);
    ctx.stroke();
  }
  circ(ctx, up ? 0.31 * k : 0.33 * k, up ? -0.42 * k : 0.11 * k, 0.045 * k);
  ink(ctx, '#ffe3cc', 1.8);
  // 모자
  ctx.save();
  ctx.translate(0.03 * k, -0.47 * k - (p === 5 ? Math.abs(Math.sin(t * 0.2)) * 0.12 * k : 0));
  ctx.rotate(-0.1 + (p === 3 ? -0.18 : 0) + (p === 6 ? 0.5 : 0));
  const hs = 1 + 0.014 * o.lvl;
  ctx.scale(hs, hs * (p === 3 ? 0.9 : 1));
  drawHat(ctx, k, { open: o.open, bulge: o.bulge, lvl: o.lvl, hungry: o.hungry, t });
  ctx.restore();
  if (p === 4 || p === 6) {
    // 어질어질 별
    for (let j = 0; j < 3; j++) {
      const a = t * 0.25 + (j * TAU) / 3;
      starPath(ctx, 0.03 * k + Math.cos(a) * 0.36 * k, -0.62 * k + Math.sin(a) * 0.1 * k, 0.06 * k);
      ink(ctx, '#ffe14d', 1.4, '#7a4a08');
    }
  }
  ctx.restore();
}

/** 손가락(끝이 x,y) */
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + (1 - press) * k * 0.22);
  ctx.rotate(-0.3);
  ctx.fillStyle = 'rgba(58,36,89,.25)';
  rr(ctx, -0.24 * k + 3, 0.46 * k + 4, 0.56 * k, 0.5 * k, 0.16 * k);
  ctx.fill();
  rr(ctx, -0.26 * k, 0.44 * k, 0.56 * k, 0.5 * k, 0.16 * k);
  ink(ctx, '#ffffff', 2.4);
  rr(ctx, -0.42 * k, 0.52 * k, 0.26 * k, 0.2 * k, 0.1 * k);
  ink(ctx, '#ffffff', 2.4);
  rr(ctx, -0.11 * k, 0, 0.22 * k, 0.66 * k, 0.11 * k);
  ink(ctx, '#ffffff', 2.4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-0.085 * k, 0.4 * k, 0.17 * k, 0.24 * k);
  ctx.fillRect(-0.2 * k, 0.56 * k, 0.1 * k, 0.12 * k);
  ctx.strokeStyle = 'rgba(58,36,89,.35)';
  ctx.lineWidth = 1.4;
  for (const hx of [0.13, 0.22]) {
    ctx.beginPath();
    ctx.moveTo(hx * k, 0.5 * k);
    ctx.lineTo(hx * k, 0.62 * k);
    ctx.stroke();
  }
  ctx.restore();
}

/** 구경꾼: 열기구 탄 고양이 (큰 순간에 만세) */
function drawBalloon(ctx: C2, x: number, y: number, k: number, t: number, cheer: number, c1: string, c2: string) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 0.04) * 0.08 * k);
  ctx.rotate(Math.sin(t * 0.03) * 0.05);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * 0.36 * k, -0.42 * k);
    ctx.lineTo(sd * 0.2 * k, 0.02 * k);
    ctx.stroke();
  }
  circ(ctx, 0, -0.72 * k, 0.5 * k);
  ink(ctx, c1, 2.2);
  ctx.save();
  circ(ctx, 0, -0.72 * k, 0.5 * k);
  ctx.clip();
  ctx.fillStyle = c2;
  for (const sx of [-0.34, 0.1]) {
    ell(ctx, sx * k + 0.1 * k, -0.72 * k, 0.11 * k, 0.52 * k);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ell(ctx, -0.2 * k, -0.95 * k, 0.12 * k, 0.07 * k, -0.6);
  ctx.fill();
  ctx.restore();
  // 고양이
  const cy = -0.1 * k - cheer * 0.12 * k;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * 0.06 * k, cy - 0.12 * k);
    ctx.lineTo(sd * 0.16 * k, cy - 0.3 * k);
    ctx.lineTo(sd * 0.19 * k, cy - 0.08 * k);
    ctx.closePath();
    ink(ctx, '#ffd9a0', 1.8);
    if (cheer > 0.2) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 0.05 * k + 2.4;
      ctx.beginPath();
      ctx.moveTo(sd * 0.14 * k, cy + 0.06 * k);
      ctx.lineTo(sd * 0.3 * k, cy - 0.2 * k);
      ctx.stroke();
      ctx.strokeStyle = '#ffd9a0';
      ctx.lineWidth = 0.05 * k;
      ctx.stroke();
    }
  }
  circ(ctx, 0, cy, 0.18 * k);
  ink(ctx, '#ffd9a0', 2);
  eyes(ctx, 0, cy - 0.01 * k, 0.07 * k, 0.035 * k, cheer > 0.2 ? 1 : 0);
  if (cheer > 0.2) {
    ell(ctx, 0, cy + 0.08 * k, 0.04 * k, 0.035 * k);
    ink(ctx, '#c2385a', 1.2);
  }
  rr(ctx, -0.24 * k, 0, 0.48 * k, 0.3 * k, 0.06 * k);
  ink(ctx, lin(ctx, 0, 0, 0, 0.3 * k, [0, '#e0a868'], [1, '#b5773a']), 2.2);
  ctx.strokeStyle = 'rgba(90,50,10,.4)';
  ctx.lineWidth = 1.2;
  for (const hx of [-0.08, 0.08]) {
    ctx.beginPath();
    ctx.moveTo(hx * k, 0.03 * k);
    ctx.lineTo(hx * k, 0.27 * k);
    ctx.stroke();
  }
  ctx.restore();
}

/** 장 끝 선물: 풍선 둘에 매달린 큰 상자. icon = 장×2 + 왼쪽/오른쪽 */
function drawGift(ctx: C2, x: number, y: number, k: number, t: number, icon: number, glow: number) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 0.05 + icon) * 0.04 * k);
  ctx.rotate(Math.sin(t * 0.04 + icon * 2) * 0.04);
  const cols = [['#ff8fb1', '#ffd23f'], ['#7fe3ff', '#ff8a5c'], ['#b48cff', '#7fe3ff'], ['#b2f57a', '#ff8fb1']][icon];
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.5;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * 0.22 * k, -0.72 * k);
    ctx.lineTo(sd * 0.1 * k, -0.34 * k);
    ctx.stroke();
    ell(ctx, sd * 0.24 * k, -0.92 * k, 0.19 * k, 0.23 * k, sd * 0.2);
    ink(ctx, cols[sd < 0 ? 0 : 1], 2.2);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ell(ctx, sd * 0.24 * k - 0.06 * k, -1.0 * k, 0.045 * k, 0.07 * k, -0.4);
    ctx.fill();
  }
  if (glow > 0) {
    ctx.fillStyle = radg(ctx, 0, 0, 0.2 * k, 0.75 * k, [0, `rgba(255,240,150,${0.7 * glow})`], [1, 'rgba(255,240,150,0)']);
    circ(ctx, 0, 0, 0.75 * k);
    ctx.fill();
  }
  rr(ctx, -0.36 * k, -0.34 * k, 0.72 * k, 0.68 * k, 0.1 * k);
  ink(ctx, lin(ctx, 0, -0.34 * k, 0, 0.34 * k, [0, '#fffdf2'], [1, '#ffe9c2']), 2.6);
  ctx.fillStyle = cols[0];
  ctx.fillRect(-0.36 * k + 2, -0.34 * k + 0.06 * k, 0.72 * k - 4, 0.07 * k);
  ctx.fillRect(-0.36 * k + 2, 0.34 * k - 0.13 * k, 0.72 * k - 4, 0.07 * k);
  // 그림: 0 갈래 별 · 1 펑 별 · 2 큰 입 · 3 메아리
  const S = (sx: number, sy: number, sr: number, col = '#ffd23f') => {
    starPath(ctx, sx * k, sy * k, sr * k);
    ink(ctx, col, 1.8, '#7a4a08');
  };
  ctx.lineCap = 'round';
  if (icon === 0) {
    ctx.strokeStyle = '#ff8fb1';
    ctx.lineWidth = 3;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, 0.12 * k);
      ctx.quadraticCurveTo(sd * 0.04 * k, -0.02 * k, sd * 0.17 * k, -0.08 * k);
      ctx.stroke();
    }
    S(0, 0.13, 0.085);
    S(-0.18, -0.09, 0.07, '#ff8fb1');
    S(0.18, -0.09, 0.07, '#7fe3ff');
  } else if (icon === 1) {
    ctx.strokeStyle = '#ff8a5c';
    ctx.lineWidth = 3;
    for (let j = 0; j < 8; j++) {
      const a = (j * TAU) / 8 + 0.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 0.13 * k, 0.01 * k + Math.sin(a) * 0.13 * k);
      ctx.lineTo(Math.cos(a) * 0.22 * k, 0.01 * k + Math.sin(a) * 0.22 * k);
      ctx.stroke();
    }
    S(0, 0.01, 0.1);
  } else if (icon === 2) {
    ctx.strokeStyle = '#8a5cf0';
    ctx.lineWidth = 2.6;
    ctx.setLineDash([5, 4]);
    circ(ctx, 0, 0.01 * k, 0.2 * k);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.save();
    ctx.translate(0, 0.11 * k);
    drawHat(ctx, 0.3 * k, { open: 1, bulge: 0.3, lvl: 0, hungry: 1, t: 0 });
    ctx.restore();
  } else {
    S(-0.1, 0.02, 0.085);
    S(0.12, 0.02, 0.06, '#ffe9a0');
    ctx.strokeStyle = '#19b8a6';
    ctx.lineWidth = 2.6;
    for (const r of [0.2, 0.26]) {
      ctx.beginPath();
      ctx.arc(-0.1 * k, 0.02 * k, r * k, -0.7, 0.7);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ── 배경: 장마다 하늘 한 장 + 아래로 흐르는 구름 두 겹 ──
const SKY = [
  { g: ['#58b8ff', '#9edcff', '#d8f3ff', '#fff4d2'], cl: ['#ffffff', '#eaf6ff', '#c4e2ff'], sea: ['#ffffff', '#dff0ff', '#b9d9ff'] },
  { g: ['#ff9372', '#ffb489', '#ffd3a0', '#fff0c4'], cl: ['#fff7ec', '#ffe0cc', '#ffab9e'], sea: ['#fff3e2', '#ffd2bd', '#f79a9a'] },
  { g: ['#4046b0', '#6a5ad0', '#b276d6', '#ffa8cc'], cl: ['#f1ecff', '#c9bcf7', '#9684dc'], sea: ['#e7dcff', '#b8a2ee', '#8a72d0'] },
];
const BGS = new Map<string, HTMLCanvasElement>();
function layer(w: number, h: number, sc: number, paint: (g: C2) => void) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * sc));
  c.height = Math.max(1, Math.ceil(h * sc));
  const g = c.getContext('2d')!;
  g.scale(sc, sc);
  paint(g);
  return c;
}
function cloudShape(g: C2, x: number, y: number, wd: number, cl: string[], seed: number, alpha = 1) {
  const n = 4 + Math.floor(hsh(seed) * 3), list: number[][] = [];
  for (let j = 0; j < n; j++) {
    const u = n > 1 ? j / (n - 1) : 0.5, r = wd * (0.16 + 0.12 * Math.sin(u * Math.PI) + hsh(seed + j * 3.3) * 0.05);
    list.push([x + (u - 0.5) * wd * 0.8, y - r * 0.55 - hsh(seed + j) * wd * 0.04, r]);
  }
  g.globalAlpha = alpha;
  g.fillStyle = cl[2];
  for (const [cx, cy, r] of list) (circ(g, cx, cy + r * 0.22, r), g.fill());
  rr(g, x - wd * 0.5, y - wd * 0.1, wd, wd * 0.16, wd * 0.08);
  g.fill();
  g.fillStyle = cl[1];
  for (const [cx, cy, r] of list) (circ(g, cx, cy + r * 0.08, r * 0.97), g.fill());
  g.fillStyle = cl[0];
  for (const [cx, cy, r] of list) (circ(g, cx - r * 0.08, cy - r * 0.1, r * 0.86), g.fill());
  g.globalAlpha = 1;
}
/** 하늘 한 장(해·달·오로라·저 아래 구름 바다) — 장마다 한 번만 그린다 */
function getSky(w: number, h: number, ch: number, sc: number): HTMLCanvasElement {
  const key = `${w}x${h}:${ch}:${sc}`, hit = BGS.get(key);
  if (hit) return hit;
  if (BGS.size > 3) BGS.clear();
  const P = SKY[ch];
  const sky = layer(w, h, sc, (g) => {
    g.fillStyle = lin(g, 0, 0, 0, h, [0, P.g[0]], [0.4, P.g[1]], [0.72, P.g[2]], [1, P.g[3]]);
    g.fillRect(0, 0, w, h);
    if (ch === 0) {
      const sx = w * 0.2, sy = w * 0.3;
      g.fillStyle = radg(g, sx, sy, w * 0.05, w * 0.55, [0, 'rgba(255,250,210,.9)'], [0.3, 'rgba(255,246,200,.35)'], [1, 'rgba(255,246,200,0)']);
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.16)';
      for (let j = 0; j < 9; j++) {
        const a = 0.2 + j * 0.33;
        g.beginPath();
        g.moveTo(sx, sy);
        g.lineTo(sx + Math.cos(a) * w * 1.6, sy + Math.sin(a) * w * 1.6);
        g.lineTo(sx + Math.cos(a + 0.1) * w * 1.6, sy + Math.sin(a + 0.1) * w * 1.6);
        g.closePath();
        g.fill();
      }
      circ(g, sx, sy, w * 0.085);
      g.fillStyle = radg(g, sx, sy, 0, w * 0.085, [0, '#ffffff'], [1, '#fff3b0']);
      g.fill();
    } else if (ch === 1) {
      const sx = w * 0.5, sy = h * 0.83;
      g.fillStyle = radg(g, sx, sy, w * 0.1, w * 0.9, [0, 'rgba(255,246,190,.95)'], [0.35, 'rgba(255,220,150,.45)'], [1, 'rgba(255,200,140,0)']);
      g.fillRect(0, 0, w, h);
      circ(g, sx, sy, w * 0.26);
      g.fillStyle = radg(g, sx, sy - w * 0.05, 0, w * 0.28, [0, '#fffbe0'], [1, '#ffe08a']);
      g.fill();
    } else {
      for (let j = 0; j < 90; j++) {
        g.globalAlpha = 0.35 + hsh(j * 3.1) * 0.6;
        g.fillStyle = j % 7 ? '#ffffff' : '#fff3b0';
        const r = j % 9 ? 0.9 : 1.8;
        circ(g, hsh(j) * w, hsh(j + 77) * h * 0.85, r);
        g.fill();
      }
      g.globalAlpha = 1;
      // 오로라
      for (let b = 0; b < 3; b++) {
        const y0 = h * (0.12 + b * 0.13);
        g.fillStyle = lin(g, 0, y0 - w * 0.12, 0, y0 + w * 0.22, [0, 'rgba(120,255,214,0)'], [0.4, `rgba(${b === 1 ? '150,240,255' : '120,255,214'},.28)`], [1, 'rgba(160,160,255,0)']);
        g.beginPath();
        g.moveTo(0, y0);
        for (let xx = 0; xx <= w; xx += w / 12) g.lineTo(xx, y0 + Math.sin(xx / w * 6 + b * 2) * w * 0.05 - w * 0.1);
        for (let xx = w; xx >= 0; xx -= w / 12) g.lineTo(xx, y0 + Math.sin(xx / w * 5 + b) * w * 0.06 + w * 0.2);
        g.closePath();
        g.fill();
      }
      const mx = w * 0.8, my = w * 0.3;
      g.fillStyle = radg(g, mx, my, w * 0.04, w * 0.4, [0, 'rgba(255,250,220,.5)'], [1, 'rgba(255,250,220,0)']);
      g.fillRect(0, 0, w, h);
      circ(g, mx, my, w * 0.075);
      g.fillStyle = '#fffbe0';
      g.fill();
      circ(g, mx + w * 0.03, my - w * 0.015, w * 0.065);
      g.fillStyle = P.g[0];
      g.fill();
    }
    // 저 아래 구름 바다(멀리 있어 흐르지 않는다)
    for (let b = 0; b < 3; b++) {
      const y0 = h * (0.86 + b * 0.055);
      for (let j = 0; j < 6; j++) cloudShape(g, (j / 5) * w * 1.1 - w * 0.05 + (b % 2) * w * 0.1, y0 + hsh(j + b * 9) * w * 0.03, w * (0.34 + hsh(j * 2 + b) * 0.14), P.sea, j * 7 + b * 31, 0.5 + b * 0.22);
    }
    g.fillStyle = lin(g, 0, h * 0.93, 0, h, [0, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,.75)']);
    g.fillRect(0, h * 0.93, w, h * 0.07);
  });
  BGS.set(key, sky);
  return sky;
}
/** 아래로 흐르는 구름(조각 그림 하나씩 — 화면 가득 투명 그림을 겹치지 않아 느린 폰에서도 가볍다): [x, y0, 폭, 속도, 진하기] */
const CLOUDS: number[][] = [];
for (let j = 0; j < 7; j++) CLOUDS.push([hsh(11 + j * 5.1), (j + hsh(11 + j)) / 7, 0.18 + hsh(11 + j * 2.7) * 0.12, 0.22, 0.6]);
for (let j = 0; j < 4; j++) CLOUDS.push([hsh(53 + j * 5.1), (j + hsh(53 + j)) / 4, 0.34 + hsh(53 + j * 2.7) * 0.16, 0.62, 0.92]);
function drawClouds(ctx: C2, w: number, h: number, ch: number, sc: number, t: number) {
  const P = SKY[ch], u1 = w / 340, span = h + w * 0.5;
  CLOUDS.forEach(([cx, cy, wd, sp, al], j) => {
    const size = wd * w * 1.15;
    const c = sprite(`c${ch}_${j}`, size, sc, (g) => cloudShape(g, 0, size * 0.22, wd * w, P.cl, 300 + j * 13 + ch * 100, al));
    const y = ((cy * span + t * sp * u1) % span) - w * 0.25;
    ctx.drawImage(c, cx * w - size / 2, y - size / 2, size, size);
    if (cx * w - size / 2 < 0) ctx.drawImage(c, cx * w - size / 2 + w, y - size / 2, size, size);
    if (j === 8) {
      // 떠 있는 작은 섬 하나(나무·집) — 가운데 겹 구름과 같이 흐른다
      const iw = w * 0.2, isl = sprite(`i${ch}`, iw * 1.5, sc, (g) => {
        g.translate(0, -iw * 0.1);
        g.beginPath();
        g.moveTo(-iw / 2, 0);
        g.quadraticCurveTo(-iw * 0.3, iw * 0.5, 0, iw * 0.62);
        g.quadraticCurveTo(iw * 0.34, iw * 0.4, iw / 2, 0);
        g.closePath();
        ink(g, lin(g, 0, 0, 0, iw * 0.6, [0, '#c99a6b'], [1, '#8a6040']), 2);
        rr(g, -iw / 2 - 2, -iw * 0.09, iw + 4, iw * 0.16, iw * 0.08);
        ink(g, ch === 2 ? '#7ad6b0' : '#8fdc6a', 2);
        rr(g, -iw * 0.02, -iw * 0.3, iw * 0.2, iw * 0.22, 2);
        ink(g, '#fff6e0', 1.8);
        g.beginPath();
        g.moveTo(-iw * 0.06, -iw * 0.3);
        g.lineTo(iw * 0.08, -iw * 0.46);
        g.lineTo(iw * 0.22, -iw * 0.3);
        g.closePath();
        ink(g, '#ff7a6b', 1.8);
        g.fillStyle = '#8a6040';
        g.fillRect(-iw * 0.27, -iw * 0.24, iw * 0.04, iw * 0.16);
        circ(g, -iw * 0.25, -iw * 0.3, iw * 0.11);
        ink(g, ch === 1 ? '#ffb347' : '#5fc96a', 1.8);
      });
      const iy = ((0.45 * span + t * sp * u1) % span) - w * 0.25;
      ctx.drawImage(isl, w * (ch === 1 ? 0.2 : 0.8) - iw * 0.75, iy - iw * 0.75, iw * 1.5, iw * 1.5);
    }
  });
}

const SHOT_COL = ['#ffd23f', '#ff8fb1', '#7fe3ff', '#b2f57a'];
/** 되쏜 별 그림(색 넷 × 크기 하나 — 크기는 찍을 때 늘린다) */
function shotSprite(hue: number, r: number, sc: number) {
  const col = SHOT_COL[((hue % 4) + 4) % 4];
  return sprite('s' + (((hue % 4) + 4) % 4), r * 4.4, sc, (g) => {
    g.fillStyle = radg(g, 0, 0, r * 0.4, r * 2.1, [0, 'rgba(255,255,255,.75)'], [0.4, col + 'aa'], [1, col + '00']);
    circ(g, 0, 0, r * 2.1);
    g.fill();
    starPath(g, 0, 0, r * 1.25);
    ink(g, lin(g, 0, -r, 0, r, [0, '#ffffff'], [1, col]), 1.6, '#7a4a08');
  });
}
function foeSprite(k: FK, kk: number, sc: number, sil = false) {
  return sprite((sil ? 'x' : 'f') + k, kk * 2.7, sc, (g) => {
    FOE_ART[k](g, kk);
    if (sil) {
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = '#5a4a86';
      g.fillRect(-kk * 2, -kk * 2, kk * 4, kk * 4);
      g.globalCompositeOperation = 'source-over';
    }
  });
}
interface Pop { x: number; y: number; t: number; size: number; str: string; col: string }
const POPS = new WeakMap<object, Pop[]>();
/** 날아가는 것들(연출만): 맞아 떨어진 적 · 깨진 갑옷 판 */
interface Gone { k: FK | 'plate'; x: number; y: number; t: number; vx: number; vy: number; spin: number }
const GONE = new WeakMap<object, Gone[]>();

function drawAll(ctx: C2, s: StealState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, R = X;
  const t = s.t, d = STAGES[s.stage], ch = Math.min(2, Math.floor(s.stage / 5)), u1 = w / 340;
  const tr = typeof ctx.getTransform === 'function' ? ctx.getTransform().a : 1;
  const sc = clamp(Math.round(tr || 1), 1, 3);
  const font = (px: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, px * u1)}px system-ui, sans-serif`);
  const text = (str: string, x: number, y: number, fill: string, stroke = '', lw = 3, maxW?: number) => {
    if (stroke) {
      ctx.lineWidth = lw;
      ctx.strokeStyle = stroke;
      ctx.strokeText(str, x, y, maxW);
    }
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y, maxW);
  };
  /** 입자 예산(느린 폰): 화면에 160개까지만 */
  const B = (x: number, y: number, col: string, n: number, sp = 3, sz = 3) => {
    const room = 160 - fx.particles.length;
    if (room > 0) fx.burst(x, y, col, Math.min(n, room), sp * u1, sz * u1);
  };
  let pops = POPS.get(s);
  if (!pops) POPS.set(s, (pops = []));
  /** 떠오르는 글자(겹치면 위로 민다) */
  const say = (x: number, y: number, str: string, col: string, size: number) => {
    size = Math.max(12, size * u1);
    x = clamp(x, w * 0.14, w * 0.86);
    y = clamp(y, R(HUD_T) + size, R(HUD_B) - size);
    for (let k = 0; k < 6 && pops!.some((q) => t - q.t < 30 && Math.abs(q.x - x) < w * 0.24 && Math.abs(q.y - (t - q.t) * 0.6 * u1 - y) < (size + q.size) * 0.55); k++) y -= size + 3;
    pops!.push({ x, y, t, size, str, col });
    if (pops!.length > 14) pops!.shift();
  };
  let gone = GONE.get(s);
  if (!gone) GONE.set(s, (gone = []));
  const playing = s.phase === 'play';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  ctx.save();
  fx.begin(ctx);
  // ── 하늘 · 흐르는 구름 두 겹 · 바람 줄 ──
  ctx.drawImage(getSky(Math.round(w), Math.round(h), ch, Math.min(2, sc)), 0, 0, w, h);
  drawClouds(ctx, w, h, ch, sc, t);
  ctx.strokeStyle = 'rgba(255,255,255,.4)';
  ctx.lineWidth = 1.6 * u1;
  for (let j = 0; j < 7; j++) {
    const sx = hsh(j * 3.7) * w, sy = ((t * (3.2 + (j % 3)) * u1 + hsh(j + 9) * h * 2) % (h * 1.3)) - h * 0.15;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx, sy + R(0.05 + (j % 3) * 0.02));
    ctx.stroke();
  }
  // 구경꾼 열기구
  {
    const cheer = Math.max(0, 1 - (t - (fx.memo.wowT ?? -999)) / 50);
    const bc = [['#ff8fb1', '#fff3a0'], ['#7fe3ff', '#ffffff'], ['#ffd23f', '#ff8a5c']][ch];
    drawBalloon(ctx, X(0.1), R(0.98) + Math.sin(t * 0.01) * R(0.03), R(0.1), t, cheer, bc[0], bc[1]);
    if (cheer > 0.5) {
      font(13, 900);
      text('와!', X(0.1), R(0.84), '#ffffff', OUT, 3);
    }
  }

  const hr = hatR(s), hg = hunger(s), wxp = X(s.wx), wyp = R(s.wy);
  // ── 모자 둘레 고리(지금 훔칠 수 있는 크기) ──
  if (playing && s.zt < 0) {
    const fullR = hg >= 1, pulse = fullR ? 1 + Math.sin(t * 0.2) * 0.012 : 1;
    if (fullR) {
      ctx.fillStyle = 'rgba(255,236,150,.10)';
      circ(ctx, wxp, wyp, R(hr));
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.28)';
      ctx.lineWidth = 1.2 * u1;
      circ(ctx, wxp, wyp, R(hatMax(s)));
      ctx.stroke();
    }
    ctx.setLineDash([R(0.022), R(0.016)]);
    ctx.lineDashOffset = -t * 0.35 * u1;
    ctx.strokeStyle = fullR ? 'rgba(58,36,89,.5)' : 'rgba(58,36,89,.3)';
    ctx.lineWidth = (fullR ? 4.4 : 3.2) * u1;
    circ(ctx, wxp, wyp, R(hr) * pulse);
    ctx.stroke();
    ctx.strokeStyle = fullR ? '#ffe14d' : 'rgba(255,255,255,.9)';
    ctx.lineWidth = (fullR ? 2.6 : 1.8) * u1;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // 빨간 가시가 갈 길(위험은 빨갛게)
  for (const b of s.buls) {
    if (b.k !== SPIKE) continue;
    const v = Math.hypot(b.vx, b.vy) || 1e-6, ux = b.vx / v, uy = b.vy / v;
    ctx.strokeStyle = 'rgba(255,50,70,.55)';
    ctx.lineWidth = 2.2 * u1;
    ctx.setLineDash([R(0.018), R(0.014)]);
    ctx.lineDashOffset = -t * 0.5 * u1;
    ctx.beginPath();
    ctx.moveTo(X(b.x + ux * 0.05), R(b.y + uy * 0.05));
    ctx.lineTo(X(b.x + ux * 0.3), R(b.y + uy * 0.3));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── 적 ──
  for (const f of s.foes) {
    const D = FOE[f.k], kk = R(FOE_K[f.k]), px = X(f.x), py = R(f.y);
    const spr = foeSprite(f.k, kk, sc);
    let sx = 1, sy = 1, rot = 0, ox = 0;
    if (f.st === 0) sx = sy = 0.6 + 0.4 * Math.min(1, f.tm / ENTER);
    if (t - f.shy < 30) (ox = Math.sin(t * 1.7) * 1.6 * u1), (sy *= 0.94);
    else if (f.wind > 0) (sx *= 1 + 0.16 * f.wind), (sy *= 1 + 0.16 * f.wind), (ox = Math.sin(t * 1.3) * f.wind * 1.5 * u1);
    else (sy *= 1 + Math.sin(t * 0.1 + f.ph) * 0.03), (sx *= 1 - Math.sin(t * 0.1 + f.ph) * 0.03);
    if (f.hurtT > 0) (ox += Math.sin(t * 2.4) * 2.5 * u1), (sy *= 0.9), (sx *= 1.08);
    if (f.k === 'fish') sx *= Math.cos(t * 0.011 + f.grp) >= 0 ? 1 : -1;
    if (f.k === 'bird' && f.burst > 0) rot = t * 0.35;
    if (f.k === 'pie') sx *= f.sx >= f.x ? 1 : -1;
    // 그림자(구름 위에 떠 있는 느낌)
    ctx.fillStyle = 'rgba(58,36,89,.13)';
    ell(ctx, px + kk * 0.14, py + kk * 0.62, kk * 0.42, kk * 0.12);
    ctx.fill();
    blit(ctx, spr, px + ox, py, kk * 2.7, rot, sx, sy);
    if (f.cool > WIND && t - f.shy < STUN && !D.boss) {
      // 깜짝! (코앞의 마녀 때문에 못 쏜다)
      ctx.fillStyle = 'rgba(140,215,255,.95)';
      ell(ctx, px + kk * 0.42, py - kk * 0.3 + ((t - f.shy) % 20) * 0.25 * u1, kk * 0.06, kk * 0.1);
      ctx.fill();
      if (t - f.shy < 40) {
        font(13, 900);
        text('!', px - kk * 0.42, py - kk * 0.42, '#ffffff', OUT, 3);
      }
    }
    if (f.wind > 0.2 && !D.boss) {
      ctx.strokeStyle = `rgba(255,255,255,${0.7 * f.wind})`;
      ctx.lineWidth = 2 * u1;
      circ(ctx, px, py, kk * (0.75 - 0.2 * f.wind));
      ctx.stroke();
    }
    if (f.k === 'bat' && f.mir > 0) {
      // 손거울(튕길 수 있는 횟수만큼 반짝)
      const mx = px + ox, my = py + kk * 0.34, mr = kk * 0.24;
      circ(ctx, mx, my, mr);
      ink(ctx, lin(ctx, mx - mr, my - mr, mx + mr, my + mr, [0, '#ffffff'], [0.5, '#c8ecff'], [1, '#7fb0ee']), 2.2);
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 1.6 * u1;
      circ(ctx, mx, my, mr + 2 * u1);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(58,36,89,.6)';
      ctx.lineWidth = 1.2;
      for (let j = f.mir; j < 5; j++) {
        const a = j * 1.9;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(a) * mr * 0.9, my + Math.sin(a) * mr * 0.9);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ell(ctx, mx - mr * 0.3, my - mr * 0.35, mr * 0.28, mr * 0.12, -0.6);
      ctx.fill();
    }
    if (D.boss) {
      // 갑옷 판: 남은 것만 (체력 1/3마다 하나씩 와장창)
      const ar = ARMOR[f.k]!;
      for (let j = 0; j < 3 - f.phase; j++) {
        const q = ar[f.phase === 1 ? j + (j ? 1 : 0) : f.phase === 2 ? 1 : j];
        plate(ctx, px + ox + q[0] * kk, py + q[1] * kk, kk * 0.2, kk * 0.2, Math.sin(t * 0.07 + j) * 0.04 + (f.hurtT > 0 ? Math.sin(t * 2 + j) * 0.12 : 0));
      }
      // 체력 줄(세 칸)
      const bw = kk * 0.9, bx = px - bw / 2, by = py - kk * 0.7;
      rr(ctx, bx - 2, by - 2, bw + 4, R(0.02) + 4, R(0.012));
      ink(ctx, 'rgba(58,36,89,.85)', 0);
      const fr = clamp(f.hp / f.max, 0, 1);
      rr(ctx, bx, by, bw * fr, R(0.02), R(0.01));
      ink(ctx, lin(ctx, bx, 0, bx + bw, 0, [0, '#ff8fb1'], [1, '#ffd23f']), 0);
      ctx.fillStyle = 'rgba(58,36,89,.85)';
      for (const q of [1 / 3, 2 / 3]) ctx.fillRect(bx + bw * q - 1, by, 2, R(0.02));
    } else if (f.hp < f.max && f.st === 1) {
      const bw = kk * 0.7, bx = px - bw / 2, by = py - kk * 0.66;
      rr(ctx, bx - 1.5, by - 1.5, bw + 3, R(0.012) + 3, R(0.008));
      ink(ctx, 'rgba(58,36,89,.8)', 0);
      rr(ctx, bx, by, bw * clamp(f.hp / f.max, 0, 1), R(0.012), R(0.006));
      ink(ctx, '#ff8fb1', 0);
    }
  }
  // 맞아 떨어진 적: 빙글빙글 날아가며 작아진다(어질어질) · 깨진 갑옷 판은 아래로 떨어진다
  for (const q of gone) {
    const age = t - q.t;
    if (age > 44 || age < 0) continue;
    const px = X(q.x) + q.vx * age * u1, py = R(q.y) + (q.vy * age + 0.11 * age * age) * u1;
    ctx.globalAlpha = Math.min(1, (44 - age) / 12);
    if (q.k === 'plate') plate(ctx, px, py, R(0.085), R(0.085), age * q.spin);
    else {
      const kk = R(FOE_K[q.k]), sq = Math.max(0.35, 1 - age / 60);
      blit(ctx, foeSprite(q.k, kk, sc), px, py, kk * 2.7, age * q.spin, sq, sq);
      for (let j = 0; j < 2; j++) {
        const a = age * 0.4 + j * Math.PI;
        starPath(ctx, px + Math.cos(a) * kk * 0.5, py - kk * 0.5 * sq + Math.sin(a) * kk * 0.14, kk * 0.11);
        ink(ctx, '#ffe14d', 1.2, '#7a4a08');
      }
    }
    ctx.globalAlpha = 1;
  }
  // 새 적 스포트라이트
  if (s.spot && t - s.spot.t < 170 && playing) {
    const f = s.foes.find((o) => o.id === s.spot!.id);
    if (f) {
      const a = Math.min(1, (170 - (t - s.spot.t)) / 30), kk = R(FOE_K[f.k]), px = X(f.x), py = R(f.y);
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3 * u1;
      ctx.setLineDash([R(0.03), R(0.02)]);
      ctx.lineDashOffset = t * 0.6;
      circ(ctx, px, py, kk * (0.85 + Math.sin(t * 0.15) * 0.05));
      ctx.stroke();
      ctx.setLineDash([]);
      font(13, 900);
      const tw = ctx.measureText(s.spot.label).width + R(0.11);
      rr(ctx, px - tw / 2, py + kk * 0.86, tw, R(0.06), R(0.03));
      ink(ctx, '#ff5a5f', 2);
      font(11, 900);
      text('NEW', px - tw / 2 + R(0.045), py + kk * 0.86 + R(0.031), '#fff3a0');
      font(13, 900);
      text(s.spot.label, px + R(0.035), py + kk * 0.86 + R(0.031), '#ffffff');
      ctx.globalAlpha = 1;
    }
  }

  // ── 적 탄 ──
  for (const b of s.buls) {
    const r = R(b.r), spr = bulSprite(b.k, r, sc), box = r * BUL_BOX[b.k];
    let scl = b.age < 14 ? 0.35 + (0.65 * b.age) / 14 : 1, rot = 0;
    if (BUL_ART[b.k][0]) rot = Math.atan2(b.vy, b.vx);
    else if (b.k === MOON) rot = t * 0.06 + b.x * 9;
    else if (b.k === SPIKE) rot = t * 0.05;
    else if (b.k === SEED) rot = Math.sin(t * 0.05 + b.x * 20) * 0.3;
    if (b.k === KERNEL) scl *= 1 + Math.sin(b.age * 0.4) * 0.06 * (1 + (b.age / b.a) * 2);
    if (b.k === BUBBLE) scl *= 1 + Math.sin(t * 0.12 + b.a) * 0.05;
    if (b.k === COIN) scl *= 1 + Math.sin(t * 0.2 + b.x * 30) * 0.08;
    const left = b.life - b.age;
    if (left < 30) ctx.globalAlpha = Math.max(0, left / 30);
    blit(ctx, spr, X(b.x), R(b.y), box, rot, scl, scl);
    if (left < 30) ctx.globalAlpha = 1;
  }

  // 퉤! 순간의 빛살(큰 한입일수록 길고 굵게)
  if (fx.memo.spitT !== undefined && t - fx.memo.spitT < 10) {
    const age = t - fx.memo.spitT, m = fx.memo.spitM, n = 8 + m * 2, len = R(0.1 + m * 0.045) * (0.5 + age / 10);
    ctx.strokeStyle = `rgba(255,250,200,${0.85 * (1 - age / 10)})`;
    ctx.lineWidth = (2 + m * 0.8) * u1;
    ctx.beginPath();
    for (let j = 0; j < n; j++) {
      const a = (j * TAU) / n + 0.3;
      ctx.moveTo(fx.memo.spitX + Math.cos(a) * len * 0.45, fx.memo.spitY + Math.sin(a) * len * 0.45);
      ctx.lineTo(fx.memo.spitX + Math.cos(a) * len, fx.memo.spitY + Math.sin(a) * len);
    }
    ctx.stroke();
  }
  // ── 되쏜 별 ──
  for (const sh of s.shots) {
    const r0 = R(0.022), r = R(0.017) * sh.sz, px = X(sh.x), py = R(sh.y);
    ctx.strokeStyle = SHOT_COL[((sh.hue % 4) + 4) % 4];
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = r * 1.1;
    ctx.beginPath();
    ctx.moveTo(px - X(sh.vx) * 4.5, py - R(sh.vy) * 4.5);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.globalAlpha = 1;
    blit(ctx, shotSprite(sh.hue, r0, sc), px, py, r0 * 4.4, sh.age * 0.3, r / r0, r / r0);
  }

  // ── 꿀꺽 소용돌이 ──
  const g = s.gulp, gAge = g ? t - g.t : 999;
  if (g && gAge <= SWIRL + 1 && s.phase === 'play') {
    const u = clamp(gAge / SWIRL, 0, 1), e = u * u, hx = X(g.x), hy = R(g.y - 0.085);
    ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - u)})`;
    ctx.lineWidth = (5 - 3 * u) * u1;
    circ(ctx, X(g.x), R(g.y), R(g.r) * (1 - e * 0.85));
    ctx.stroke();
    ctx.lineWidth = 2 * u1;
    for (let j = 0; j < 4; j++) {
      const a0 = (j * TAU) / 4 + e * 5;
      ctx.beginPath();
      for (let q = 0; q <= 6; q++) {
        const rr2 = R(g.r) * (1 - e) * (1 - q / 7), a = a0 + q * 0.3;
        const px = hx + Math.cos(a) * rr2, py = hy + Math.sin(a) * rr2;
        if (q) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
    for (let i = 0; i + 4 <= g.links.length && gAge < 12; i += 4) {
      ctx.strokeStyle = `rgba(160,235,255,${1 - gAge / 12})`;
      ctx.lineWidth = 2.4 * u1;
      ctx.beginPath();
      ctx.moveTo(X(g.links[i]), R(g.links[i + 1]));
      ctx.lineTo(X(g.links[i + 2]), R(g.links[i + 3]));
      ctx.stroke();
    }
    for (let i = 0; i + 3 <= g.vis.length; i += 3) {
      const dx = g.vis[i], dy = g.vis[i + 1] + 0.085, k = g.vis[i + 2], lag = clamp(u * 1.25 - (i / g.vis.length) * 0.25, 0, 1), e2 = lag * lag;
      const a = e2 * 2.6, c = Math.cos(a), sn = Math.sin(a), m = 1 - e2;
      const r = R(BR[k]);
      if (m < 0.03) continue;
      blit(ctx, bulSprite(k, r, sc), hx + X(dx * c - dy * sn) * m, hy + R(dx * sn + dy * c) * m, r * BUL_BOX[k], a, 0.4 + 0.6 * m, 0.4 + 0.6 * m);
    }
  }

  // ── 꼬마 마녀 ──
  {
    const kW = R(0.17), hurtAge = t - (fx.memo.hurtT ?? -999), relAge = t - s.relT;
    let pose = 0, open = 0, bulge = 0, wx = wxp, wy = wyp;
    if (s.phase === 'result' || s.phase === 'end') {
      pose = 5;
      const e = Math.min(1, s.pt / 30);
      wx = wxp + (X(s.phase === 'end' ? 0.5 : 0.2) - wxp) * e;
      wy = wyp + (R(s.phase === 'end' ? 1.05 : 1.2) - wyp) * e;
    } else if (s.phase === 'fail') {
      pose = 6;
      wy = wyp + s.pt * s.pt * 0.05 * u1;
    } else if (s.phase === 'choice') {
      pose = s.pick >= 0 ? 5 : 0;
      open = s.pick >= 0 ? clamp(1 - Math.abs((t - s.pickT) - 36) / 20, 0, 1) : 0;
    } else if (s.zt >= 0) (pose = 1), (open = 0.6);
    else if (s.sw >= 0) (pose = 2), (open = 1), (bulge = clamp((g ? g.n : 0) / 30, 0.15, 1) * clamp(gAge / SWIRL, 0, 1));
    else if (relAge < 16) (pose = 3), (open = 1 - relAge / 16), (bulge = Math.max(0, 1 - relAge / 6) * 0.6);
    else if (hurtAge < 44) pose = 4;
    if (s.zt >= 0) {
      // 슝: 잔상 둘
      for (const q of [0.45, 0.75]) {
        ctx.globalAlpha = 0.28 * q;
        drawWitch(ctx, wx + (X(s.zx) - wx) * q, wy + (R(s.zy) - wy) * q, kW, { face: s.face, pose: 1, t, open: 0.3, bulge: 0, lvl: s.lvl, hungry: 0 });
      }
      ctx.globalAlpha = 1;
      // 빗자루가 흘린 별가루(선이 아니라 반짝이 — 지나간 길은 아무것도 건드리지 않는다)
      for (let j = 0; j < 6; j++) {
        const q = (j + 0.5) / 6, sx = wx + (X(s.zx) - wx) * q, sy = wy + (R(s.zy) - wy) * q + Math.sin(j * 2.4 + t) * 4 * u1;
        starPath(ctx, sx, sy, R(0.016) * (1.2 - q * 0.6), 0.46, 4, j + t * 0.2);
        ctx.fillStyle = j % 2 ? '#fff3a0' : '#ffffff';
        ctx.fill();
      }
    }
    // 판 시작 보호 방울
    if (playing && (s.pt < GRACE || s.stage === 0)) {
      const left = s.stage === 0 ? GRACE : GRACE - s.pt, a = left < 120 ? (Math.floor(t / 8) % 2 ? 0.25 : 0.7) : 0.7;
      ctx.fillStyle = `rgba(190,240,255,${0.16 * a})`;
      circ(ctx, wx, wy - kW * 0.3, kW * 0.95);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = 2.2 * u1;
      ctx.stroke();
      ctx.strokeStyle = `rgba(140,220,255,${a})`;
      ctx.lineWidth = 3 * u1;
      ctx.beginPath();
      ctx.arc(wx, wy - kW * 0.3, kW * 0.95, -Math.PI / 2, -Math.PI / 2 + (left / GRACE) * TAU);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${0.8 * a})`;
      ell(ctx, wx - kW * 0.55, wy - kW * 0.85, kW * 0.16, kW * 0.07, -0.7);
      ctx.fill();
    }
    if (!(playing && s.inv > 0 && Math.floor(t / 4) % 2 === 0)) drawWitch(ctx, wx, wy, kW, { face: s.face, pose, t, open, bulge, lvl: s.lvl, hungry: playing ? hg : 1 });
    // 한입 수 세기(모자 위)
    if (g && g.n > 0 && gAge <= SWIRL + (g.n < WOW_N ? 10 : 0) && playing) {
      const shown = Math.min(g.n, Math.ceil(g.n * clamp((gAge / SWIRL) * 1.5, 0, 1))), done = shown >= g.n;
      const sz = (18 + Math.min(20, g.n * 0.5)) * (done ? 1 + Math.max(0, 1 - (gAge - SWIRL * 0.67) / 6) * 0.35 : 1);
      font(sz, 900);
      const ty = Math.max(R(HUD_T) + sz * u1, wy - kW * 1.75);
      text(String(shown), wx, ty, done && g.mult > 1 ? '#fff3a0' : '#ffffff', OUT, 4.5 * u1);
    }
  }

  // ── 사건 연출(파티클·글자·소리) ──
  const seenT = fx.memo.t ?? -1;
  let hitN = fx.memo.hitN ?? 0;
  if (t - (fx.memo.hitT ?? -99) > 24) hitN = 0;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x), ey = R(e.y);
    switch (e.kind) {
      case 'zip':
        fx.sound('whoosh', 1.3, 0.7);
        B(ex, ey, '#ffffff', 6, 2.4, 2.4);
        break;
      case 'gulp': {
        const n = e.n;
        if (!n) {
          fx.sound('tick', 0.7, 0.8);
          if (e.text === 'red') say(ex, ey - R(0.22), '빨간 가시는 못 먹어!', '#ffb3b8', 13);
          break;
        }
        fx.sound('swell', clamp(1.5 - n * 0.02, 0.6, 1.5), 0.6 + n * 0.02);
        fx.sound('pop', clamp(1.6 - n * 0.02, 0.7, 1.6), 0.5);
        fx.ring(ex, ey, '#ffffff', R(0.1), 3);
        fx.kick(1.5 + Math.min(8, n * 0.16));
        if (n >= WOW_N) fx.memo.wowT = t;
        break;
      }
      case 'bubble':
        fx.sound('splash', 1 + Math.min(1.2, e.n * 0.12), 0.6);
        fx.ring(ex, ey, '#bff3ff', R(CHAIN_R), 3);
        B(ex, ey, '#e8fbff', 6, 2.6, 2.2);
        if (e.n <= 3) say(ex, ey, '뽁!', '#e8fbff', 13);
        break;
      case 'spit': {
        const m = e.m;
        fx.sound('zap', clamp(1.5 - m * 0.13, 0.6, 1.5), 0.6 + m * 0.08);
        if (m >= 2) fx.sound('thud', clamp(1.35 - m * 0.12, 0.6, 1.3), 0.5 + m * 0.12);
        fx.kick(2 + m * 2.2);
        fx.ring(ex, ey, '#ffe14d', R(0.06 + m * 0.025), 3 + m);
        B(ex, ey, '#fff3a0', 6 + m * 3, 3 + m * 0.5, 2.6);
        if (m >= 3) for (let j = 0; j < 4; j++) B(ex, ey, SHOT_COL[j], 5 + m, 4 + m * 0.6, 3);
        (fx.memo.spitT = t), (fx.memo.spitX = ex), (fx.memo.spitY = ey), (fx.memo.spitM = m);
        if (e.text === 'echo') say(ex, ey - R(0.2), '한 번 더!', '#b8fff0', 13);
        else if (e.n < WOW_N) say(ex, ey - R(0.2), '퉤!', '#fff3a0', 13);
        else {
          (fx.memo.bigT = t), (fx.memo.bigN = e.n), (fx.memo.bigM = m), (fx.memo.bigX = ex), (fx.memo.bigY = ey), (fx.memo.bigK = 0);
          if (e.n >= 20) fx.blink('#ffffff', e.n >= 30 ? 0.3 : 0.18);
        }
        break;
      }
      case 'hit':
        hitN++;
        (fx.memo.hitT = t);
        fx.sound('pop', Math.min(2.4, 0.85 + hitN * 0.07), 0.45);
        B(ex, ey, SHOT_COL[((e.m % 4) + 4) % 4], 3, 2.6, 2.4);
        break;
      case 'kill': {
        const k = FKS[e.n], boss = !!FOE[k].boss, col = FOE_COL[k];
        fx.sound('crack', boss ? 0.6 : 1.25, boss ? 1.4 : 0.7);
        fx.sound('pop', boss ? 0.5 : 0.75, 0.8);
        fx.ring(ex, ey, col, R(boss ? 0.4 : 0.11), boss ? 8 : 4);
        B(ex, ey, col, boss ? 40 : 9, boss ? 6 : 3.4, 3.2);
        B(ex, ey, '#ffffff', boss ? 20 : 4, boss ? 5 : 2.6, 2.4);
        fx.kick(boss ? 18 : 3);
        gone.push({ k, x: e.x, y: e.y, t, vx: (hsh(e.x * 91 + t) - 0.5) * (boss ? 1.5 : 7), vy: boss ? -1 : -3.4 - hsh(e.y * 57 + t) * 2, spin: (hsh(t + e.x * 13) - 0.5) * (boss ? 0.2 : 0.7) });
        if (gone.length > 26) gone.shift();
        if (boss) (fx.blink('#ffffff', 0.5), fx.sound('thud', 0.55, 1.4), (fx.memo.bigT = t), (fx.memo.bigK = 3), (fx.memo.bigX = ex), (fx.memo.bigY = ey), (fx.memo.wowT = t));
        else say(ex, ey - R(0.05), `+${FOE[k].pts * e.m}`, '#ffffff', 12);
        if (e.text) ((fx.memo.multT = t), (fx.memo.multN = Number(e.text)), (fx.memo.wowT = t));
        break;
      }
      case 'armor':
        fx.sound('crack', 0.6, 1.3);
        fx.sound('thud', 0.7, 1.3);
        fx.kick(14);
        fx.blink('#ffffff', 0.4);
        B(ex, ey + R(0.1), '#c9d4ee', 26, 6, 4);
        B(ex, ey + R(0.1), '#ffffff', 12, 5, 3);
        fx.ring(ex, ey, '#ffffff', R(0.36), 7);
        (fx.memo.bigT = t), (fx.memo.bigK = 2), (fx.memo.bigX = ex), (fx.memo.bigY = ey + R(0.3)), (fx.memo.wowT = t);
        gone.push({ k: 'plate', x: e.x + (e.n === 1 ? -0.09 : 0.09), y: e.y + 0.1, t, vx: e.n === 1 ? -2.4 : 2.4, vy: -4, spin: 0.3 });
        break;
      case 'mirror':
        fx.sound('ding', 1.25, 0.6);
        B(ex, ey + R(0.03), '#ffffff', 5, 2.6, 2);
        say(ex, ey + R(0.09), '팅!', '#e8f6ff', 13);
        break;
      case 'mirbreak':
        fx.sound('crack', 1.5, 0.9);
        fx.sound('ding', 0.8, 0.5);
        B(ex, ey + R(0.03), '#c8ecff', 14, 3.6, 2.6);
        say(ex, ey + R(0.09), '쨍그랑!', '#e8f6ff', 14);
        break;
      case 'popcorn':
        fx.sound('pop', 0.7, 0.8);
        fx.ring(ex, ey, '#fff6ae', R(0.05), 3);
        B(ex, ey, '#fffdf2', 6, 2.6, 2.4);
        break;
      case 'tink':
        fx.sound('tick', 1.2, 0.8);
        B(ex, ey, '#d8f5c0', 4, 2.4, 2);
        break;
      case 'boom':
        fx.ring(ex, ey, '#ff8a5c', R(0.16), 4);
        fx.sound('thud', 1.5, 0.45);
        break;
      case 'fizz':
        fx.sound('pop', 1.7, 0.25);
        B(ex, ey, SHOT_COL[((e.m % 4) + 4) % 4], 6, 2.8, 2.2);
        break;
      case 'hurt':
        fx.sound('thud', 1.3, 1);
        fx.sound('zap', 0.6, 0.8);
        fx.blink('#ff5a5f', 0.3);
        fx.kick(10);
        B(ex, ey, '#ff8a95', 14, 3.4, 2.8);
        say(ex, ey - R(0.24), '아얏!', '#ffd0d4', 16);
        fx.memo.hurtT = t;
        break;
      case 'guard':
        fx.sound('ding', 1.7, 0.3);
        fx.ring(ex, ey, '#bff3ff', R(0.05), 2);
        if ((fx.memo.guardSay ?? -999) < t - 400) ((fx.memo.guardSay = t), say(wxp, wyp - R(0.3), '방울이 막아 줬어요', '#e8fbff', 12));
        break;
      case 'fire':
        if (FOE[FKS[e.n]].boss) fx.sound('whoosh', 0.55, 0.3);
        break;
      case 'wave':
        if (e.n > 1 || s.stage > 0) fx.sound('whoosh', 0.75, 0.5);
        break;
      case 'dex':
        fx.sound('coin', 1.1, 0.55);
        say(wxp, wyp + R(0.12), `도감 +1 ${DEX.find((q) => q.k === e.n)?.name ?? ''}`, '#fff3a0', 12);
        break;
      case 'clear':
        fx.sound('clear', 1, 1);
        fx.blink('#fff6c8', 0.22);
        B(w * 0.25, R(0.6), '#ffd23f', 26, 6, 3.2);
        B(w * 0.75, R(0.6), '#ff8fb1', 26, 6, 3.2);
        B(w * 0.5, R(0.4), '#7fe3ff', 26, 6, 3.2);
        fx.memo.wowT = t;
        break;
      case 'fail':
        fx.sound('fail', 1, 1);
        fx.kick(8);
        break;
      case 'pick':
        fx.sound('chime', 1, 1);
        fx.sound('swell', 1.2, 0.8);
        B(ex, ey, '#fff3a0', 30, 5, 3.2);
        fx.ring(ex, ey, '#ffe14d', R(0.3), 6);
        break;
    }
  }
  fx.memo.hitN = hitN;
  fx.memo.t = t;
  // 모자 입이 다 커진 순간 · 방울이 꺼지는 순간
  if (playing) {
    if (hg >= 1 && (fx.memo.hgFull ?? 1) === 0 && s.pt > 5) (fx.sound('tick', 2.1, 0.5), fx.ring(wxp, wyp, '#ffe14d', R(hr), 2.5));
    fx.memo.hgFull = hg >= 1 ? 1 : 0;
    if (s.pt === GRACE && s.stage > 0) (fx.sound('pop', 0.8, 0.5), fx.ring(wxp, wyp - R(0.05), '#bff3ff', R(0.2), 3));
  }
  // 떠오르는 글자
  for (const q of pops) {
    const age = t - q.t;
    if (age > 46) continue;
    ctx.globalAlpha = Math.min(1, (46 - age) / 14);
    ctx.font = `900 ${q.size * (age < 5 ? 1.5 - 0.1 * age : 1)}px system-ui, sans-serif`;
    text(q.str, q.x, q.y - age * 0.6 * u1, q.col, OUT, 3.2 * u1);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  drawHud(ctx, s, w, h, fx, font, text, B, sc);
  void th;
  void d;
}

type FontFn = (px: number, wgt?: number) => string;
type TextFn = (str: string, x: number, y: number, fill: string, stroke?: string, lw?: number, maxW?: number) => void;
type BurstFn = (x: number, y: number, col: string, n: number, sp?: number, sz?: number) => void;
const CREAM = 'rgba(255,252,242,.95)';

function drawHud(ctx: C2, s: StealState, w: number, h: number, fx: ReturnType<typeof juice>, font: FontFn, text: TextFn, B: BurstFn, sc: number) {
  const R = (x: number) => x * w, t = s.t, u1 = w / 340, d = STAGES[s.stage], ch = Math.min(2, Math.floor(s.stage / 5));
  const playing = s.phase === 'play', defs = starDefs(s.stage);
  const pill = (cx: number, cy: number, pw: number, ph: number, fill: string | CanvasGradient, lw = 2, stroke = OUT) => {
    ctx.fillStyle = 'rgba(58,36,89,.18)';
    rr(ctx, cx - pw / 2 + 2, cy - ph / 2 + 3, pw, ph, ph / 2);
    ctx.fill();
    rr(ctx, cx - pw / 2, cy - ph / 2, pw, ph, ph / 2);
    ink(ctx, fill, lw, stroke);
  };
  const dexIcon = (k: number, x: number, y: number, r: number, on: boolean, pop = 1) => {
    if (!on) {
      circ(ctx, x, y, r * 1.15);
      ink(ctx, '#e9e0f6', 1.4, 'rgba(58,36,89,.35)');
      font(12, 900);
      text('?', x, y + 1, 'rgba(58,36,89,.4)');
      return;
    }
    const rr2 = r * (k === BUBBLE ? 0.62 : k === SEED || k === NOTE ? 0.8 : 1) * pop;
    blit(ctx, bulSprite(k, rr2, sc), x, y, rr2 * BUL_BOX[k]);
  };

  // ── 큰 순간 띠 ──
  if (fx.memo.bigT !== undefined && t - fx.memo.bigT < 58) {
    const age = t - fx.memo.bigT, n = fx.memo.bigN ?? 0, m = fx.memo.bigM ?? 1, kind = fx.memo.bigK ?? 0;
    const pop = age < 7 ? 1.7 - 0.7 * (age / 7) : 1, a = Math.min(1, (58 - age) / 14);
    const str = kind === 2 ? '갑옷 와장창!' : kind === 3 ? '대장 격파!' : n >= 50 ? `꿀~꺽! ${n}발!` : n >= 30 ? `화면 가득 ${n}발!` : `한입에 ${n}발!`;
    const size = (kind ? 26 : Math.min(32, 19 + n * 0.28)) * u1;
    ctx.font = `900 ${Math.max(12, size)}px system-ui, sans-serif`;
    const tw = ctx.measureText(str).width, pw = tw + size * 1.5, ph = size * 1.55, fit = Math.min(1, (w - 12 * u1) / (pw + size * (kind ? 1.2 : 2.3))), half = (pw / 2 + size * 0.9) * fit;
    const bx = clamp(fx.memo.bigX, Math.min(w / 2, half + 4), Math.max(w / 2, w - half - (kind ? 4 : size * 0.6))), by = clamp(fx.memo.bigY - R(0.4), R(0.27), R(1.0));
    fx.memo.bigH = by + ph * 0.5 * fit;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(bx, by);
    ctx.rotate(-0.04);
    ctx.scale(pop * fit, pop * fit);
    // 톱니 리본
    ctx.beginPath();
    ctx.moveTo(-pw / 2 - size * 0.5, -ph / 2);
    ctx.lineTo(pw / 2 + size * 0.5, -ph / 2);
    ctx.lineTo(pw / 2 + size * 0.2, 0);
    ctx.lineTo(pw / 2 + size * 0.5, ph / 2);
    ctx.lineTo(-pw / 2 - size * 0.5, ph / 2);
    ctx.lineTo(-pw / 2 - size * 0.2, 0);
    ctx.closePath();
    ink(ctx, lin(ctx, 0, -ph / 2, 0, ph / 2, [0, kind ? '#8a5cf0' : '#ff7eb6'], [1, kind ? '#5a35b0' : '#ff5a8a']), 3 * u1);
    ctx.lineWidth = 5 * u1;
    ctx.strokeStyle = OUT;
    ctx.strokeText(str, 0, 1);
    ctx.fillStyle = lin(ctx, 0, -size / 2, 0, size / 2, [0, '#ffffff'], [0.6, '#fff3a0'], [1, '#ffd23f']);
    ctx.fillText(str, 0, 1);
    if (!kind && m > 1) {
      // ×배수 딱지
      const cx = pw / 2 + size * 0.2, cy = -ph * 0.55, cr = size * (0.62 + 0.05 * m);
      starPath(ctx, cx, cy, cr * 1.3, 0.72, 10, t * 0.05);
      ink(ctx, '#ffd23f', 2.4 * u1, '#7a4a08');
      ctx.font = `900 ${Math.max(12, size * 0.72)}px system-ui, sans-serif`;
      ctx.lineWidth = 3.5 * u1;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeText(`×${m}`, cx, cy + 1);
      ctx.fillStyle = '#d4002a';
      ctx.fillText(`×${m}`, cx, cy + 1);
    }
    ctx.restore();
  }
  if (fx.memo.multT !== undefined && t - fx.memo.multT < 50 && playing) {
    const age = t - fx.memo.multT, pop = age < 6 ? 1.5 - 0.5 * (age / 6) : 1;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (50 - age) / 12);
    ctx.translate(w / 2, (fx.memo.bigT !== undefined && t - fx.memo.bigT < 58 ? fx.memo.bigH ?? R(0.3) : R(0.22)) + R(0.085));
    ctx.scale(pop, pop);
    font(17, 900);
    const str = `${fx.memo.multN}마리 한꺼번에!`;
    pill(0, 0, ctx.measureText(str).width + R(0.08), R(0.085), '#ffd23f', 2.4 * u1, '#7a4a08');
    text(str, 0, 1, '#7a2a08');
    ctx.restore();
  }

  // ── 위 띠: 판 · 장 이름 · 하트 · 별 ──
  const hb = R(HUD_T) * 0.86;
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = OUT;
  ctx.fillRect(0, hb - 2 * u1, w, 2 * u1);
  {
    const cy = hb / 2 - 1;
    circ(ctx, R(0.062), cy, R(0.036));
    ink(ctx, ['#58b8ff', '#ff9372', '#6a5ad0'][ch], 2 * u1);
    font(14, 900);
    text(String(s.stage + 1), R(0.062), cy + 1, '#ffffff');
    ctx.textAlign = 'left';
    font(14, 900);
    const nm = CHAPTERS[ch];
    text(nm, R(0.115), cy + 1, OUT);
    const nw = ctx.measureText(nm).width;
    font(12, 700);
    text(` ${s.stage + 1}/${STAGE_COUNT}`, R(0.115) + nw, cy + 1.5, '#8a7aa8');
    ctx.textAlign = 'right';
    font(14, 900);
    const st = String(s.stars), sw = ctx.measureText(st).width;
    text(st, w - R(0.03), cy + 1, '#b8860b');
    starPath(ctx, w - R(0.03) - sw - R(0.03), cy, R(0.024));
    ink(ctx, '#ffd23f', 1.6 * u1, '#7a4a08');
    const nh = Math.max(3, s.hearts), hx0 = w - R(0.03) - sw - R(0.085);
    for (let j = 0; j < nh; j++) {
      const hx = hx0 - j * R(0.052), on = nh - 1 - j < s.hearts;
      const beat = on && s.hearts === 1 && playing ? 1 + Math.abs(Math.sin(t * 0.2)) * 0.2 : 1;
      heartPath(ctx, hx, cy, R(0.02) * beat);
      ink(ctx, on ? lin(ctx, hx, cy - R(0.02), hx, cy + R(0.02), [0, '#ff8a95'], [1, '#e2334a']) : 'rgba(58,36,89,.12)', 1.6 * u1, on ? OUT : 'rgba(58,36,89,.3)');
    }
    ctx.textAlign = 'center';
  }

  // ── 아래 띠: 별 셋(쉬운 말) · 모자 · 안내 한 줄 ──
  {
    const ty = R(HUD_B);
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, ty, w, h - ty);
    ctx.fillStyle = OUT;
    ctx.fillRect(0, ty, w, 2 * u1);
    const r1 = ty + R(0.048), r2 = ty + R(0.122);
    const ok = s.phase === 'result' ? s.starOk : defs.map((_, j) => (defs.length === 3 && j === 1 ? false : j === defs.length - 1 && defs.length > 1 ? s.best >= d.starN : false));
    const bad = defs.map((_, j) => defs.length === 3 && j === 1 && s.hits > 0 && s.phase !== 'result');
    const labels = defs.map((l, j) => (j === defs.length - 1 && defs.length > 1 && playing && s.best > 0 && s.best < d.starN ? `${l} (${s.best})` : l));
    font(12, 800);
    const ws = labels.map((l) => ctx.measureText(l).width + R(0.075));
    const gap = R(0.014), tot = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1), scl = Math.min(1, (w - R(0.03)) / tot);
    let xx = (w - tot * scl) / 2;
    for (let j = 0; j < labels.length; j++) {
      const pw = ws[j] * scl;
      rr(ctx, xx, r1 - R(0.03), pw, R(0.06), R(0.03));
      ink(ctx, ok[j] ? '#fff3a0' : bad[j] ? 'rgba(58,36,89,.08)' : '#ffffff', 1.6 * u1, ok[j] ? '#b8860b' : bad[j] ? 'rgba(58,36,89,.25)' : 'rgba(58,36,89,.6)');
      starPath(ctx, xx + R(0.03) * scl + 1, r1, R(0.017));
      ink(ctx, ok[j] ? '#ffd23f' : bad[j] ? 'rgba(58,36,89,.15)' : '#ffffff', 1.3 * u1, ok[j] ? '#7a4a08' : 'rgba(58,36,89,.55)');
      ctx.textAlign = 'left';
      font(12, 800);
      text(labels[j], xx + R(0.055) * scl, r1 + 1, bad[j] ? 'rgba(58,36,89,.4)' : OUT, '', 0, pw - R(0.062) * scl);
      if (bad[j]) {
        ctx.strokeStyle = 'rgba(58,36,89,.4)';
        ctx.lineWidth = 1.4 * u1;
        ctx.beginPath();
        ctx.moveTo(xx + R(0.05) * scl, r1);
        ctx.lineTo(xx + pw - R(0.02), r1);
        ctx.stroke();
      }
      xx += pw + gap * scl;
    }
    ctx.textAlign = 'center';
    // 모자 레벨 딱지
    ctx.save();
    ctx.translate(R(0.06), r2 + R(0.022));
    drawHat(ctx, R(0.075), { open: 0, bulge: 0, lvl: Math.min(9, s.lvl), hungry: 0, t: 0 });
    ctx.restore();
    ctx.textAlign = 'left';
    font(12, 900);
    text(`Lv.${s.lvl + 1}`, R(0.105), r2 + 1, '#6a3fd0');
    ctx.textAlign = 'center';
    let hint = d.hint;
    if (s.stage === 0 && playing && s.firstTap >= 0 && s.gulps <= 3 && hunger(s) < 1) hint = '모자 입이 다시 커지면(금빛 고리) 또 한입!';
    else if (s.phase === 'result') hint = s.won ? '하늘 끝까지 왔어요!' : s.stage % 5 === 4 ? '대장을 물리쳤다! 선물을 골라요' : `다음 판엔 새 적 — ${FOE[STAGES[s.stage + 1].key].name}`;
    else if (s.phase === 'end') hint = '하늘 끝까지 왔어요! 훔쳐 본 탄 무늬를 다 모았나요?';
    else if (s.phase === 'choice') hint = '둘 중 하나만 가질 수 있어요';
    else if (s.phase === 'fail') hint = '탄이 닿기 전에 한입 하거나 빈 데로 비켜요';
    else if (playing && s.pt < GRACE && s.stage === 1 && s.pt > 200) hint = '처음 10초는 방울이 지켜 줘요';
    const first = s.stage === 0 && s.firstTap < 0 && playing;
    font(first ? 14 : 12.5, 900);
    text(first ? `👆 ${hint}` : hint, w / 2 + R(0.08), r2 + 1, first ? '#d4002a' : '#5a4a86', '', 0, w - R(0.22));
  }

  // ── 판 카드(NEW 한 줄) ──
  if (playing && s.pt < 200 && s.banner && (s.stage > 0 || s.again)) {
    const a = Math.min(1, (200 - s.pt) / 24, s.pt / 6), cy = R(HUD_T + 0.055), slide = Math.max(0, 1 - s.pt / 8) * R(0.06);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(0, -slide);
    const head = s.again ? '다시!' : `${s.stage + 1}판`, body = s.again ? (s.hearts > 3 ? '하트를 하나 더 드려요' : '이번엔 할 수 있어요') : s.banner.text;
    font(13, 900);
    const w1 = ctx.measureText(head).width;
    font(12.5, 800);
    const w2 = ctx.measureText(body).width, isNew = !s.again;
    const pw = Math.min(w - R(0.04), w1 + w2 + R(isNew ? 0.24 : 0.12));
    pill(w / 2, cy, pw, R(0.078), '#ffffff', 2 * u1);
    let x = w / 2 - pw / 2 + R(0.035);
    ctx.textAlign = 'left';
    font(13, 900);
    text(head, x, cy + 1, '#6a3fd0');
    x += w1 + R(0.02);
    if (isNew) {
      rr(ctx, x, cy - R(0.022), R(0.095), R(0.044), R(0.022));
      ink(ctx, '#ff5a5f', 0);
      font(11, 900);
      ctx.textAlign = 'center';
      text('NEW', x + R(0.0475), cy + 1, '#ffffff');
      ctx.textAlign = 'left';
      x += R(0.11);
    }
    font(12.5, 800);
    text(body, x, cy + 1, OUT, '', 0, w / 2 + pw / 2 - x - R(0.02));
    ctx.textAlign = 'center';
    ctx.restore();
  }

  // ── 첫 화면: 손가락이 가장 빽빽한 꽃 한가운데를 톡 ──
  if (s.stage === 0 && s.firstTap < 0 && playing && !s.again) {
    const hx = R(0.5), hy = R(0.56), ph = (t % 60) / 60, press = ph < 0.25 ? ph / 0.25 : ph < 0.5 ? 1 : Math.max(0, 1 - (ph - 0.5) / 0.2);
    ctx.strokeStyle = `rgba(255,225,77,${0.9 - 0.5 * ph})`;
    ctx.lineWidth = 3 * u1;
    ctx.setLineDash([R(0.022), R(0.016)]);
    circ(ctx, hx, hy, R(hatMax(s)));
    ctx.stroke();
    ctx.setLineDash([]);
    if (ph > 0.25 && ph < 0.75) {
      ctx.strokeStyle = `rgba(255,255,255,${1 - (ph - 0.25) / 0.5})`;
      ctx.lineWidth = 3 * u1;
      circ(ctx, hx, hy, R(0.03 + (ph - 0.25) * 0.18));
      ctx.stroke();
    }
    drawHand(ctx, hx + R(0.01), hy + R(0.01), R(0.15), press);
  }

  // ── 판을 깼다: 별 · 모자 레벨 · 도감 · 다음 판 미리 보기 ──
  if (s.phase === 'result' || s.phase === 'end') {
    const end = s.phase === 'end', pt = s.pt, e = Math.min(1, pt / 9), pop = 0.7 + 0.3 * (1 - (1 - e) * (1 - e));
    // 남은 탄이 별사탕이 되어 마녀에게
    if (!end && pt < 34) {
      for (let i = 0; i + 3 <= s.sweep.length; i += 3) {
        const u = clamp((pt - (i / 3) * 0.12) / 22, 0, 1), q = u * u;
        if (u >= 1) continue;
        const px = R(s.sweep[i]) + (R(0.5) - R(s.sweep[i])) * q, py = R(s.sweep[i + 1]) + (R(1.1) - R(s.sweep[i + 1])) * q;
        starPath(ctx, px, py, R(0.014) * (1.4 - q * 0.6), 0.46, 5, pt * 0.3 + i);
        ink(ctx, SHOT_COL[(i / 3) % 4], 1.2, '#7a4a08');
      }
      if (pt === 2 && s.sweep.length) fx.sound('chime', 1.4, 0.6);
    }
    ctx.fillStyle = `rgba(255,255,255,${0.3 * e})`;
    ctx.fillRect(0, R(HUD_T) * 0.86, w, R(HUD_B) - R(HUD_T) * 0.86);
    const py0 = R(end ? 0.2 : 0.15), ph = R(end ? 0.5 : 0.84);
    ctx.save();
    ctx.translate(w / 2, py0 + ph / 2);
    ctx.scale(pop, pop);
    ctx.translate(-w / 2, -(py0 + ph / 2));
    ctx.fillStyle = 'rgba(58,36,89,.2)';
    rr(ctx, R(0.06) + 3, py0 + 5, R(0.88), ph, R(0.05));
    ctx.fill();
    rr(ctx, R(0.06), py0, R(0.88), ph, R(0.05));
    ink(ctx, lin(ctx, 0, py0, 0, py0 + ph, [0, '#fffdf4'], [1, '#fff1d6']), 3 * u1);
    const boss = !!FOE[d.key].boss;
    font(20, 900);
    text(end ? '하늘 끝까지 왔다!' : boss ? `${FOE[d.key].name} 격파!` : `${s.stage + 1}판 깼다!`, w / 2, py0 + R(0.075), '#6a3fd0', '', 0, R(0.8));
    if (end) {
      font(15, 900);
      starPath(ctx, R(0.3), py0 + R(0.19), R(0.035));
      ink(ctx, '#ffd23f', 1.8 * u1, '#7a4a08');
      ctx.textAlign = 'left';
      text(`별 ${s.stars}개`, R(0.36), py0 + R(0.192), OUT);
      text(`모자 Lv.${s.lvl + 1}`, R(0.6), py0 + R(0.192), '#6a3fd0');
      ctx.textAlign = 'center';
      font(13, 800);
      text(`탄 도감 ${s.dex.size}/${DEX.length}`, w / 2, py0 + R(0.275), '#5a4a86');
      DEX.forEach((q, i) => dexIcon(q.k, R(0.17 + (i % 8) * 0.094), py0 + R(0.345 + Math.floor(i / 8) * 0.07), R(0.022), s.dex.has(q.k)));
    } else {
      // 별 (쉬운 말 한 줄씩)
      const n = s.starOk.length, xs = n === 1 ? [0.5] : n === 2 ? [0.34, 0.66] : [0.215, 0.5, 0.785];
      for (let j = 0; j < n; j++) {
        const ag = pt - (14 + j * 13), sx = R(xs[j]), sy = py0 + R(0.19);
        const pp = ag < 0 ? 0.8 : ag < 8 ? 1.8 - 0.8 * (ag / 8) : 1, on = ag >= 0 && s.starOk[j];
        starPath(ctx, sx, sy, R(0.058) * pp);
        ink(ctx, on ? lin(ctx, 0, sy - R(0.06), 0, sy + R(0.06), [0, '#fff3a0'], [1, '#ffc22e']) : 'rgba(58,36,89,.1)', 2.2 * u1, on ? '#7a4a08' : 'rgba(58,36,89,.3)');
        const key = `st${s.stage}_${j}`;
        if (ag >= 0 && fx.memo[key] === undefined) {
          fx.memo[key] = 1;
          if (s.starOk[j]) (fx.sound('ding', 1 + j * 0.18, 0.9), B(sx, sy, '#ffd23f', 14, 3.4, 2.6));
          else fx.sound('tick', 0.6, 0.6);
        }
        font(12, 800);
        text(defs[j], sx, sy + R(0.092), on ? OUT : 'rgba(58,36,89,.45)', '', 0, R(0.27));
      }
      // 모자가 자랐다
      const la = pt - 54, ly = py0 + R(0.385);
      ctx.strokeStyle = 'rgba(58,36,89,.15)';
      ctx.lineWidth = 1.5 * u1;
      ctx.beginPath();
      ctx.moveTo(R(0.12), py0 + R(0.315));
      ctx.lineTo(R(0.88), py0 + R(0.315));
      ctx.stroke();
      const grow = la < 0 ? 0 : la < 10 ? 1.5 - 0.5 * (la / 10) : 1;
      ctx.save();
      ctx.translate(R(0.24), ly + R(0.075));
      ctx.scale(la < 0 ? 0.92 : grow, la < 0 ? 0.92 : grow);
      drawHat(ctx, R(0.17), { open: la >= 0 && la < 30 ? 1 : 0, bulge: 0, lvl: la < 0 ? s.lvl - 1 : s.lvl, hungry: 1, t });
      ctx.restore();
      if (la >= 0 && fx.memo[`lv${s.stage}`] === undefined) ((fx.memo[`lv${s.stage}`] = 1), fx.sound('swell', 1.3, 0.8), fx.sound('coin', 1.2, 0.6), B(R(0.24), ly, '#b48cff', 16, 3.6, 2.8));
      ctx.textAlign = 'left';
      font(17, 900);
      text(la < 0 ? `모자 Lv.${s.lvl}` : `모자 Lv.${s.lvl} → Lv.${s.lvl + 1}`, R(0.44), ly - R(0.012), '#6a3fd0');
      font(12, 800);
      if (la >= 0) text(`입 크기 ${Math.round((100 * (R0 + R_LVL * s.lvl)) / R0)}% · 탄 세기 ${Math.round(100 * hatPow(s))}%`, R(0.44), ly + R(0.045), '#5a4a86', '', 0, R(0.46));
      ctx.textAlign = 'center';
      // 도감
      const da = pt - 68, dy = py0 + R(0.535);
      ctx.beginPath();
      ctx.moveTo(R(0.12), py0 + R(0.475));
      ctx.lineTo(R(0.88), py0 + R(0.475));
      ctx.stroke();
      ctx.textAlign = 'left';
      font(12, 900);
      text(`탄 도감 ${s.dex.size}/${DEX.length}`, R(0.4), dy - R(0.022), '#5a4a86');
      ctx.textAlign = 'center';
      DEX.forEach((q, i) => {
        const isNew = s.dexNew.includes(q.k), x = R(0.17 + (i % 8) * 0.094), y = dy + R(0.035 + Math.floor(i / 8) * 0.066);
        const bounce = isNew && da >= 0 ? 1 + Math.abs(Math.sin((da + i * 3) * 0.16)) * 0.3 : 1;
        dexIcon(q.k, x, y, R(0.021), s.dex.has(q.k) && (!isNew || da >= 0), bounce);
        if (isNew && da >= 0) {
          ctx.strokeStyle = '#ff5a5f';
          ctx.lineWidth = 2 * u1;
          circ(ctx, x, y, R(0.034));
          ctx.stroke();
        }
      });
      if (da >= 0 && s.dexNew.length && fx.memo[`dx${s.stage}`] === undefined) ((fx.memo[`dx${s.stage}`] = 1), fx.sound('coin', 1.4, 0.7));
      // 다음에 풀릴 것 미리 보기
      const na = pt - 82, ny = py0 + R(0.755);
      if (na >= 0) {
        ctx.globalAlpha = Math.min(1, na / 8);
        rr(ctx, R(0.1), ny - R(0.055), R(0.8), R(0.11), R(0.03));
        ink(ctx, 'rgba(106,63,208,.1)', 1.5 * u1, 'rgba(106,63,208,.4)');
        ctx.textAlign = 'left';
        font(13, 900);
        if (s.won) text('마지막 판까지 다 깼어요!', R(0.2), ny + 1, '#6a3fd0');
        else if (s.stage % 5 === 4) {
          text('다음: 하늘에 뜬 선물 둘 중 하나!', R(0.15), ny + 1, '#6a3fd0', '', 0, R(0.7));
        } else {
          const nk = STAGES[s.stage + 1].key, kk = R(FOE[nk].boss ? 0.085 : 0.075);
          blit(ctx, foeSprite(nk, kk, sc, true), R(0.19), ny, kk * 2.7);
          font(15, 900);
          text('?', R(0.19), ny + 1, '#ffffff');
          font(13, 900);
          text(FOE[nk].boss ? '다음 판: 대장이 온다!' : '다음 판: 새 적이 온다!', R(0.3), ny + 1, '#6a3fd0', '', 0, R(0.56));
        }
        ctx.textAlign = 'center';
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    if (pt > (end ? 150 : RESULT_MIN)) {
      const cy = py0 + ph + R(0.058), a = 0.65 + 0.35 * Math.sin(t * 0.18);
      ctx.globalAlpha = a;
      font(14, 900);
      const str = end ? '톡 하면 끝' : s.stage % 5 === 4 && !s.won ? '톡 하면 선물 고르기' : '톡 하면 다음 판';
      const cx = end ? w / 2 : R(0.64);
      pill(cx, cy, ctx.measureText(str).width + R(0.1), R(0.08), '#6a3fd0', 2 * u1);
      text(str, cx, cy + 1, '#ffffff');
      ctx.globalAlpha = 1;
    }
  }

  // ── 실패: 데굴데굴, 바로 다시 ──
  if (s.phase === 'fail') {
    const a = Math.min(1, s.pt / 8);
    ctx.globalAlpha = a;
    font(20, 900);
    pill(w / 2, R(0.56), R(0.6), R(0.13), '#ffffff', 2.4 * u1);
    text('앗! 다시 해 봐요', w / 2, R(0.56) + 1, '#d4002a');
    ctx.globalAlpha = 1;
  }

  // ── 장 끝: 하늘에 뜬 선물 둘 중 하나를 톡 ──
  if (s.phase === 'choice') {
    const pk = PERKS[ch], since = t - s.pickT, picked = s.pick >= 0;
    font(17, 900);
    const title = picked ? `${pk[s.pick].name} 얻었다!` : '선물 하나를 골라 톡!';
    pill(w / 2, R(0.22), ctx.measureText(title).width + R(0.12), R(0.1), picked ? '#ffd23f' : '#ffffff', 2.4 * u1);
    text(title, w / 2, R(0.22) + 1, picked ? '#7a2a08' : '#6a3fd0');
    for (let pass = 0; pass < 2; pass++) {
      for (let side = 0; side < 2; side++) {
        const gx0 = R(side ? 0.73 : 0.27), gy0 = R(0.62), kk = R(0.3);
        if (pass === 1) {
          if (picked) continue;
          const cy = gy0 + kk * 0.62;
          pill(gx0, cy, R(0.42), R(0.15), '#ffffff', 2 * u1);
          font(15, 900);
          text(pk[side].name, gx0, cy - R(0.03), '#6a3fd0');
          font(12, 800);
          text(pk[side].line, gx0, cy + R(0.035), OUT, '', 0, R(0.39));
          continue;
        }
        let gx = gx0, gy = gy0, scl = Math.min(1, 0.4 + s.pt / 20), al = 1;
        if (picked && side === s.pick) {
          const u = clamp((since - 14) / 30, 0, 1), q = u * u;
          gx = gx0 + (R(s.wx) - gx0) * q;
          gy = gy0 + (R(s.wy - 0.2) - gy0) * q;
          scl = 1 - q * 0.85;
          al = u >= 1 ? 0 : 1;
        } else if (picked) (gy = gy0 - since * 1.6 * u1), (al = Math.max(0, 1 - since / 40));
        if (al <= 0) continue;
        ctx.save();
        ctx.globalAlpha = al;
        ctx.translate(gx, gy);
        ctx.scale(scl, scl);
        drawGift(ctx, 0, 0, kk, t, ch * 2 + side, picked ? 1 : 0.35 + 0.25 * Math.sin(t * 0.12 + side * 2));
        ctx.restore();
      }
      if (pass === 0 && !picked && s.pt > CHOICE_MIN) {
        const side = Math.floor(t / 70) % 2;
        drawHand(ctx, R(side ? 0.76 : 0.3), R(0.64), R(0.13), (t % 70) < 20 ? (t % 70) / 20 : Math.max(0, 1 - ((t % 70) - 20) / 14));
      }
    }
  }
}
