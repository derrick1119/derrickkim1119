/**
 * 탄막 훔치기 (40라운드: 생각 부담 없는 실시간 전투) — 탄막 훔치기 × 연쇄 × 도감.
 * 규칙 한 줄: 톡한 곳으로 슝 날아가 둘레의 적 총알을 전부 빼앗고, 빼앗은 총알이 저절로 되날아간다.
 * 뒤집힘: 탄막이 많을수록 좋다(전부 내 무기). 꼬마 마녀는 쏠 줄 모른다 — 적이 쏴 줘야 공격할 수 있다.
 *
 * 손짓은 톡 하나(아무 데나): 톡 → 6틱 만에 그곳으로 슝(이동 중 무적) → 도착하는 순간 먹보 모자가 둘레(화면 폭 27%~)의
 *   적 총알을 전부 꿀꺽 → 0.3초 뒤 저절로 전부 유도 별이 되어 가까운 적부터 되날아간다(불꽃놀이).
 *   한입에 5·10·20·30발이면 ×2·×3·×4·×5(탄이 커지고 세진다) — 그래서 '모일 때까지 기다렸다 한입에'가 가장 세다.
 *   쉼 0.5초(쉼 동안 누른 톡은 쉼이 끝나면 나간다). 연타하면 한입이 작아져 약하다.
 * 정답 없음: 어디를 톡 해도 근처 총알은 훔쳐지고 적은 맞는다. 잘하면 한입이 커져 더 빨리·더 크게 터진다. 타이밍 창 없음(언제 눌러도 훔쳐진다).
 * 하트 3(판마다 새로): 맞으면 -1(잠깐 무적), 다 잃으면 그 판만 바로 다시. 판 시작 10초는 방울이 지켜 준다. 끝 = 15판을 다 지나면.
 * 판 15(장 3 × (새 적 4 + 대장)): 판마다 새 적 = 새 탄막.
 *   1장 아침 구름길: 꽃 구름(둥근 꽃) → 대포 문어(나를 겨눈 부채 — 모여들 때 한입) → 회오리 새(나선) → 비눗방울 게(방울을 훔치면 옆 탄까지 줄줄이 펑) → 천둥 구름 대왕
 *   2장 노을 풍선길: 민들레(떠서 쌓이는 홀씨 밭) → 거울 박쥐(되쏜 탄을 튕겨 두 배로 돌려준다 — 또 훔친다) → 커튼 해파리(구슬 줄) → 팝콘 옥수수(알이 터지면 여섯 배) → 풍선 고래 선장
 *   3장 별밤 오로라길: 가시 성게(빨간 가시탄은 못 훔친다 — 톡으로 비키기) → 고리 달팽이(도는 방패 고리를 훔쳐야 맞는다) → 별똥 물고기 떼 → 금화 까치(금화 한 닢 = 세 발) → 별 먹는 부엉이 대왕
 * 별: 하늘 지나가기 · 하트 안 잃기 · 한입에 N발(1판 별 1 → 2판 별 2 → 3판부터 별 3).
 * 성장: 판을 깨면 모자 레벨이 저절로 +1(둘레·되쏘는 세기·모자 모습). 장 끝(대장 뒤)에만 하늘에 뜬 큰 선물 둘 중 하나를 톡.
 *   도감 = 훔쳐 본 탄 무늬 16가지. 결과 화면에 다음 판 새 적의 그림자가 미리 보인다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5, TAU = Math.PI * 2;
/** 위 띠 아래 끝 · 아래 띠 위 끝 (세로 좌표, 가로 폭 = 1) */
const HUD_T = 0.1, HUD_B = 1.33;
/** 마녀가 갈 수 있는 곳 */
const FX0 = 0.07, FX1 = 0.93, FY0 = 0.19, FY1 = 1.25;
const HOME_X = 0.5, HOME_Y = 1.12;
/** 마녀가 맞는 반지름(작게 — 피하는 게임이 아니다) */
const HIT = 0.026;
/** 톡 → 슝(ZIP틱, 무적) → 꿀꺽 → SWIRL틱 뒤 저절로 되쏘기. 톡 사이 쉼 CD틱 */
const ZIP = 6, SWIRL = 18, CD = 30;
const BUL_MAX = 96, SHOT_MAX = 24, FOE_MAX = 24;
/** 판 시작 보호 방울 · 맞은 뒤 무적 */
const GRACE = 600, INV = 90;
const R0 = 0.24, R_LVL = 0.004, CHAIN_R = 0.17, ORB_R = 0.105;
const ENTER = 40, WIND = 22;
const RESULT_MIN = 90, RESULT_AUTO = 360, FAIL_T = 85, CHOICE_MIN = 45, PICK_T = 80, END_T = 420;
const STAR_PTS = 150, CLEAR_PTS = 200, WIN_PTS = 1000;

/** 한입 크기 → 배수 */
export const multOf = (n: number) => (n >= 30 ? 5 : n >= 20 ? 4 : n >= 12 ? 3 : n >= 6 ? 2 : 1);
/** 이만큼 한입이면 '큰 순간' 띠 */
const WOW_N = 12;
/** 판마다 적 체력 배수(대장은 그대로) — 모자도 판마다 세진다 */
const HP_MUL = [0.6, 0.8, 1, 1.1, 1, 1.2, 1.3, 1.4, 1.5, 1, 1.6, 1.7, 1.8, 1.9, 1];

type FK = 'cloud' | 'octo' | 'bird' | 'crab' | 'king' | 'puff' | 'bat' | 'jelly' | 'corn' | 'whale' | 'urchin' | 'snail' | 'fish' | 'pie' | 'owl';
const FKS: FK[] = ['cloud', 'octo', 'bird', 'crab', 'king', 'puff', 'bat', 'jelly', 'corn', 'whale', 'urchin', 'snail', 'fish', 'pie', 'owl'];
interface FoeDef { name: string; r: number; hp: number; pts: number; every: number; boss?: 1 }
const FOE: Record<FK, FoeDef> = {
  cloud: { name: '꽃 구름', r: 0.055, hp: 24, pts: 10, every: 110 },
  octo: { name: '대포 문어', r: 0.055, hp: 36, pts: 15, every: 150 },
  bird: { name: '회오리 새', r: 0.05, hp: 40, pts: 15, every: 110 },
  crab: { name: '비눗방울 게', r: 0.055, hp: 30, pts: 15, every: 150 },
  king: { name: '천둥 구름 대왕', r: 0.17, hp: 900, pts: 300, every: 92, boss: 1 },
  puff: { name: '민들레', r: 0.055, hp: 36, pts: 20, every: 160 },
  bat: { name: '거울 박쥐', r: 0.05, hp: 24, pts: 20, every: 140 },
  jelly: { name: '커튼 해파리', r: 0.055, hp: 44, pts: 20, every: 112 },
  corn: { name: '팝콘 옥수수', r: 0.055, hp: 40, pts: 20, every: 170 },
  whale: { name: '풍선 고래 선장', r: 0.19, hp: 1500, pts: 500, every: 104, boss: 1 },
  urchin: { name: '가시 성게', r: 0.055, hp: 48, pts: 30, every: 170 },
  snail: { name: '고리 달팽이', r: 0.055, hp: 44, pts: 30, every: 420 },
  fish: { name: '별똥 물고기', r: 0.036, hp: 10, pts: 8, every: 130 },
  pie: { name: '금화 까치', r: 0.05, hp: 50, pts: 40, every: 150 },
  owl: { name: '부엉이 대왕', r: 0.19, hp: 2200, pts: 800, every: 100, boss: 1 },
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

interface StageDef { key: FK; news: string; hint: string; starN: number; waves: [FK, number, number][][] }
const CHAPTERS = ['아침 구름길', '노을 풍선길', '별밤 오로라길'];
const school = (n: number, y: number): [FK, number, number][] => [...Array(n).keys()].map((i) => ['fish', 0.5 + (i - (n - 1) / 2) * 0.085, y + (i % 2) * 0.03] as [FK, number, number]);
/** 판 15개 — 정해진 풀이는 없다: 적이 들어오는 자리만 정해져 있고(시드로 좌우 뒤집기·살짝 흔들기), 어디서 언제 한입 할지는 마음대로 */
export const STAGES: StageDef[] = [
  {
    key: 'cloud', news: '', hint: '탄이 빽빽한 곳을 톡! 모자가 다 훔쳐요', starN: 0,
    waves: [
      [['cloud', 0.5, 0.56], ['cloud', 0.2, 0.34], ['cloud', 0.8, 0.34]],
      [['cloud', 0.3, 0.3], ['cloud', 0.7, 0.3], ['cloud', 0.3, 0.58], ['cloud', 0.7, 0.58]],
      [['cloud', 0.5, 0.26], ['cloud', 0.2, 0.42], ['cloud', 0.8, 0.42], ['cloud', 0.36, 0.6], ['cloud', 0.64, 0.6]],
      [['cloud', 0.2, 0.27], ['cloud', 0.5, 0.31], ['cloud', 0.8, 0.27], ['cloud', 0.2, 0.56], ['cloud', 0.5, 0.6], ['cloud', 0.8, 0.56]],
    ],
  },
  {
    key: 'octo', news: '대포 문어 — 부채 탄이 내게 모일 때 한입에', hint: '탄이 모일 때까지 기다렸다 한입에!', starN: 12,
    waves: [
      [['octo', 0.22, 0.3], ['octo', 0.78, 0.3], ['cloud', 0.5, 0.5]],
      [['octo', 0.18, 0.27], ['octo', 0.5, 0.35], ['octo', 0.82, 0.27], ['cloud', 0.5, 0.56]],
      [['octo', 0.15, 0.3], ['octo', 0.85, 0.3], ['octo', 0.5, 0.24], ['cloud', 0.33, 0.52], ['cloud', 0.67, 0.52]],
    ],
  },
  {
    key: 'bird', news: '회오리 새 — 빙글빙글 나선 탄', hint: '나선이 굵어지면 한가운데로!', starN: 14,
    waves: [
      [['bird', 0.5, 0.38], ['cloud', 0.2, 0.5], ['cloud', 0.8, 0.5]],
      [['bird', 0.3, 0.32], ['bird', 0.7, 0.46], ['octo', 0.14, 0.24], ['octo', 0.86, 0.24]],
      [['bird', 0.5, 0.3], ['bird', 0.24, 0.5], ['bird', 0.76, 0.5], ['octo', 0.5, 0.58], ['cloud', 0.18, 0.28], ['cloud', 0.82, 0.28]],
    ],
  },
  {
    key: 'crab', news: '비눗방울 게 — 방울을 훔치면 옆 탄까지 펑', hint: '방울이 탄 옆에 있을 때 훔치면 줄줄이!', starN: 16,
    waves: [
      [['crab', 0.3, 0.3], ['crab', 0.7, 0.3], ['cloud', 0.5, 0.5]],
      [['crab', 0.2, 0.28], ['crab', 0.5, 0.36], ['crab', 0.8, 0.28], ['octo', 0.34, 0.54], ['octo', 0.66, 0.54]],
      [['crab', 0.25, 0.5], ['crab', 0.75, 0.5], ['bird', 0.5, 0.32], ['cloud', 0.2, 0.28], ['cloud', 0.8, 0.28]],
    ],
  },
  { key: 'king', news: '천둥 구름 대왕 — 크게 한입 하면 갑옷이 와장창', hint: '대왕의 탄을 잔뜩 모았다가 한입에!', starN: 30, waves: [[['king', 0.5, 0.36]]] },
  {
    key: 'puff', news: '민들레 — 홀씨가 떠서 밭이 돼요', hint: '홀씨 밭이 넓어지면 한가운데로!', starN: 16,
    waves: [
      [['puff', 0.25, 0.28], ['puff', 0.75, 0.28], ['puff', 0.5, 0.4]],
      [['puff', 0.3, 0.3], ['puff', 0.7, 0.3], ['octo', 0.12, 0.42], ['octo', 0.88, 0.42]],
      [['puff', 0.2, 0.3], ['puff', 0.5, 0.26], ['puff', 0.8, 0.3], ['bird', 0.35, 0.5], ['bird', 0.65, 0.5]],
    ],
  },
  {
    key: 'bat', news: '거울 박쥐 — 튕겨 온 탄을 또 훔쳐요', hint: '거울이 튕긴 탄은 두 발 몫 — 또 한입!', starN: 18,
    waves: [
      [['bat', 0.3, 0.44], ['bat', 0.7, 0.44], ['cloud', 0.3, 0.26], ['cloud', 0.7, 0.26]],
      [['bat', 0.5, 0.5], ['bat', 0.2, 0.4], ['bat', 0.8, 0.4], ['puff', 0.35, 0.26], ['puff', 0.65, 0.26]],
      [['bat', 0.35, 0.52], ['bat', 0.65, 0.52], ['crab', 0.2, 0.3], ['crab', 0.8, 0.3], ['bird', 0.5, 0.3]],
    ],
  },
  {
    key: 'jelly', news: '커튼 해파리 — 구슬 줄이 겹겹이', hint: '구슬 줄이 두세 겹 쌓이면 한입에!', starN: 20,
    waves: [
      [['jelly', 0.3, 0.26], ['jelly', 0.7, 0.34]],
      [['jelly', 0.5, 0.26], ['jelly', 0.25, 0.36], ['bat', 0.75, 0.48], ['bat', 0.4, 0.54]],
      [['jelly', 0.2, 0.26], ['jelly', 0.5, 0.32], ['jelly', 0.8, 0.26], ['puff', 0.35, 0.48], ['puff', 0.65, 0.48]],
    ],
  },
  {
    key: 'corn', news: '팝콘 옥수수 — 알이 터지면 여섯 배', hint: '알이 펑 터진 다음에 훔쳐요!', starN: 22,
    waves: [
      [['corn', 0.3, 0.3], ['corn', 0.7, 0.3], ['jelly', 0.5, 0.24]],
      [['corn', 0.2, 0.3], ['corn', 0.5, 0.36], ['corn', 0.8, 0.3], ['crab', 0.35, 0.54], ['crab', 0.65, 0.54]],
      [['corn', 0.3, 0.42], ['corn', 0.7, 0.42], ['bat', 0.5, 0.54], ['jelly', 0.25, 0.25], ['puff', 0.75, 0.25]],
    ],
  },
  { key: 'whale', news: '풍선 고래 선장 — 노래가 하늘을 덮어요', hint: '하늘이 가득 찼을 때 한입에!', starN: 36, waves: [[['whale', 0.5, 0.36]]] },
  {
    key: 'urchin', news: '가시 성게 — 빨간 가시는 못 훔쳐요, 비켜요', hint: '빨간 가시가 오면 다른 데를 톡!', starN: 18,
    waves: [
      [['urchin', 0.3, 0.3], ['urchin', 0.7, 0.3], ['cloud', 0.5, 0.48]],
      [['urchin', 0.2, 0.28], ['urchin', 0.5, 0.36], ['urchin', 0.8, 0.28], ['octo', 0.35, 0.52], ['octo', 0.65, 0.52]],
      [['urchin', 0.3, 0.44], ['urchin', 0.7, 0.44], ['jelly', 0.3, 0.25], ['jelly', 0.7, 0.25], ['corn', 0.5, 0.34]],
    ],
  },
  {
    key: 'snail', news: '고리 달팽이 — 도는 방패 고리부터 훔쳐요', hint: '고리를 훔치면 그 탄으로 달팽이를!', starN: 20,
    waves: [
      [['snail', 0.3, 0.36], ['snail', 0.7, 0.36]],
      [['snail', 0.25, 0.44], ['snail', 0.75, 0.44], ['urchin', 0.5, 0.28], ['bird', 0.5, 0.5]],
      [['snail', 0.2, 0.34], ['snail', 0.5, 0.46], ['snail', 0.8, 0.34], ['bird', 0.33, 0.26], ['bird', 0.67, 0.26]],
    ],
  },
  {
    key: 'fish', news: '별똥 물고기 떼 — 줄지어 나를 쏘아요', hint: '별똥이 줄줄이 모여들 때 한입에!', starN: 20,
    waves: [
      [...school(6, 0.3)],
      [...school(6, 0.26), ['urchin', 0.25, 0.48], ['urchin', 0.75, 0.48]],
      [...school(5, 0.24), ...school(5, 0.42), ['snail', 0.5, 0.58]],
    ],
  },
  {
    key: 'pie', news: '금화 까치 — 금화 한 닢은 세 발 몫', hint: '금화가 쏟아질 때 한입에 — 한 닢이 세 발!', starN: 30,
    waves: [
      [['pie', 0.3, 0.3], ['pie', 0.7, 0.3], ['urchin', 0.5, 0.46]],
      [['pie', 0.25, 0.36], ['pie', 0.75, 0.36], ...school(5, 0.24)],
      [['pie', 0.2, 0.3], ['pie', 0.5, 0.38], ['pie', 0.8, 0.3], ['urchin', 0.35, 0.54], ['urchin', 0.65, 0.54], ['snail', 0.5, 0.24]],
    ],
  },
  { key: 'owl', news: '부엉이 대왕 — 별밤이 온통 탄막', hint: '빨간 가시만 비키고, 나머지는 한입에!', starN: 45, waves: [[['owl', 0.5, 0.36]]] },
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
  hurtT: number; wind: number; seed: number;
}
/** m: 0 곧게 · 1 느려지다 둥실(홀씨·금화) · 2 알(느려지다 펑) · 3 고리(주인 둘레를 돈다) · 4 흔들흔들(방울) */
interface Bul { k: number; x: number; y: number; vx: number; vy: number; r: number; life: number; age: number; val: number; m: number; own: number; a: number; tk: number }
interface Shot { x: number; y: number; vx: number; vy: number; f: Foe | null; dmg: number; mult: number; age: number; child: boolean; rel: number; sz: number; hue: number }
interface Gulp { x: number; y: number; t: number; n: number; cnt: number; mult: number; vis: number[]; links: number[]; reds: number }
interface Ev { t: number; kind: string; x: number; y: number; n: number; m: number; text: string }

export interface StealState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result' | 'fail' | 'choice' | 'end'; pt: number; flip: boolean;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; spts: number; dead: boolean; won: boolean; again: boolean; tries: number;
  lvl: number; perk: number[];
  wx: number; wy: number; zx: number; zy: number; tx: number; ty: number; zt: number; sw: number; cd: number; inv: number; face: number;
  buf: { x: number; y: number } | null; down: boolean;
  foes: Foe[]; buls: Bul[]; shots: Shot[]; nid: number; wave: number; waveT: number; clearT: number; freeze: number;
  gulp: Gulp | null; echo: { t: number; n: number; mult: number } | null; relId: number; relKills: number; relT: number; relN: number;
  best: number; hits: number; gulps: number; taps: number; kills: number; chainBest: number;
  dex: Set<number>; dexNew: number[]; seen: Set<string>; wowN: number; firstTap: number; firstWow: number;
  events: Ev[]; banner: { text: string; t: number } | null; spot: { id: number; t: number; label: string } | null;
  pick: number; pickT: number; sweep: number[]; sweepT: number; bubT: number;
}

const ev = (s: StealState, kind: string, x: number, y: number, n = 0, m = 0, text = '') => {
  s.events.push({ t: s.t, kind, x, y, n, m, text });
};
const see = (s: StealState, key: string) => void s.seen.add(key);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** 모자가 훔치는 둘레 · 되쏘는 세기 */
export const hatR = (s: StealState) => (R0 + R_LVL * s.lvl) * (s.perk[1] === 0 ? 1.2 : 1);
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
    shoot(s, k, x, y, Math.cos(a) * v, Math.sin(a) * v, 900, 1, val);
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
    case 'octo': fan(s, INK, f.x, f.y + 0.03, aim, 5, 0.13, 0.0021, 800); break;
    case 'bird': f.burst = 14; break;
    case 'crab': shoot(s, BUBBLE, f.x, f.y + 0.03, Math.cos(aim) * 0.001, Math.sin(aim) * 0.001, 1000, 4, 1, 0, s.rng() * TAU); break;
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
    case 'fish': shoot(s, STAR, f.x, f.y, Math.cos(aim) * 0.0022, Math.sin(aim) * 0.0022, 800); break;
    case 'pie':
      toss(s, COIN, f.x, f.y, 4, 3);
      f.sx = 0.15 + s.rng() * 0.7;
      f.sy = 0.24 + s.rng() * 0.3;
      break;
    case 'king':
      ring(s, DROP, f.x, f.y, 14, (f.n % 2) * (Math.PI / 14), 0.0013, 800);
      if (f.phase >= 1 && f.n % 2 === 0) for (const sd of [-1, 1]) fan(s, INK, f.x + sd * 0.14, f.y + 0.04, Math.atan2(ay - f.y, ax - (f.x + sd * 0.14)), 5, 0.14, 0.002, 800);
      break;
    case 'whale':
      for (let j = 0; j < 9; j++) shoot(s, BEAD, 0.1 + j * 0.1 + (f.n % 2) * 0.05 - 0.025, f.y + 0.1, 0, 0.0016, 900);
      fan(s, NOTE, f.x, f.y + 0.08, aim, 3, 0.2, 0.002, 800);
      if (f.phase >= 1 && f.n % 2 === 0) toss(s, SEED, f.x, f.y + 0.05, 6, 1);
      if (f.phase >= 2 && f.n % 2 === 1) kernels(s, f.x, f.y + 0.05, 3);
      break;
    case 'owl':
      fan(s, SPIKE, f.x, f.y + 0.05, aim, 1 + f.phase, 0.5, 0.0016, 1000);
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
    const hp = Math.round(FOE[k].hp * (boss ? 1 : HP_MUL[s.stage]));
    const f: Foe = {
      id: ++s.nid, k, x: first ? x : ex, y: first ? y : ey, sx: x, sy: y, ex, ey, hp, max: hp, st: first ? 1 : 0, tm: 0,
      cool: first ? 34 + s.foes.length * 26 : (boss ? 50 : 24) + Math.floor(s.rng() * 50), ph: s.rng() * TAU, n: 0, a: s.rng() * TAU, burst: 0,
      mir: k === 'bat' ? 5 : 0, phase: 0, plan: 0, dead: false, grp: s.wave * 2.1 + y0 * 7 + (x0 - 0.5) * 1.5, hurtT: 0, wind: 0, seed: Math.floor(s.rng() * 1e6),
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
  s.hearts = 3;
  s.wx = HOME_X;
  s.wy = HOME_Y;
  s.zt = -1;
  s.sw = -1;
  s.cd = 0;
  s.inv = 0;
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
    if (b.k === BUBBLE) q.push(b);
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
      if (o.k === BUBBLE) q.push(o);
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
  const mult = multOf(n);
  s.gulp = { x, y, t: s.t, n, cnt, mult, vis, links, reds };
  s.gulps++;
  if (n > s.best) s.best = n;
  if (chain > s.chainBest) s.chainBest = chain;
  s.spts += n * mult * 3;
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
  const K = Math.max(1, Math.min(n, SHOT_MAX, 40 - s.shots.length)), dmg = (n * mult * hatPow(s)) / K;
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
      if (s.shots.length >= 44) break;
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
      if ((t + f.id * 7) % 34 === 0 && !full) {
        let c = 0;
        for (const b of s.buls) if (b.m === 3 && b.own === f.id) c++;
        if (c < 8) shoot(s, PEBBLE, f.x, f.y, 0, 0, 1e9, 3, 1, f.id, f.a + (f.burst++ % 8) * (TAU / 8));
      }
    } else if (f.k === 'king' && f.phase >= 2 && t % 10 === 0) shoot(s, DROP, 0.06 + s.rng() * 0.88, HUD_T, 0, 0.0023, 700);
    else if (f.k === 'owl' && t % 8 === 0) {
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
  if (s.zt >= 0) return;
  const safe = s.inv > 0 || s.pt < GRACE, x = s.wx, y = s.wy;
  for (const b of s.buls) {
    if (b.age < 14) continue;
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
    ev(s, 'fail', s.wx, s.wy);
    return;
  }
  const d = STAGES[s.stage];
  s.sweep = [];
  for (const b of s.buls) s.sweep.push(b.x, b.y, b.k);
  s.sweepT = s.t;
  s.spts += s.buls.length * 2;
  s.buls = [];
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
  if (s.buf && s.cd === 0 && s.zt < 0 && s.sw < 0) {
    s.zx = s.wx;
    s.zy = s.wy;
    s.tx = s.buf.x;
    s.ty = s.buf.y;
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
  twist: '쏠 줄 모르는 꼬마 마녀 — 톡한 곳으로 슝 날아가면 먹보 모자가 둘레의 적 총알을 전부 꿀꺽하고 저절로 되쏜다. 탄막이 많을수록 좋아서, 피하는 대신 가장 빽빽한 곳으로 뛰어든다',
  rules: [
    '아무 데나 톡! 마녀가 슝 날아가 둘레의 적 탄을 모자로 전부 훔쳐요. 훔친 탄은 저절로 되날아가요.',
    '한입에 많이 훔칠수록 ×2 ×3… 세져요. 탄이 모일 때까지 기다렸다 한입에!',
    '맞으면 하트 -1, 셋을 다 잃으면 그 판만 다시. 빨간 가시탄만 못 훔쳐요.',
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
      hearts: 3, stars: 0, got: 0, starOk: [], pts: 0, spts: 0, dead: false, won: false, again: false, tries: 0, lvl: 0, perk: [-1, -1],
      wx: HOME_X, wy: HOME_Y, zx: HOME_X, zy: HOME_Y, tx: HOME_X, ty: HOME_Y, zt: -1, sw: -1, cd: 0, inv: 0, face: 1, buf: null, down: false,
      foes: [], buls: [], shots: [], nid: 0, wave: 0, waveT: 0, clearT: 0, freeze: 0, gulp: null, echo: null, relId: 0, relKills: 0, relT: -999, relN: 0,
      best: 0, hits: 0, gulps: 0, taps: 0, kills: 0, chainBest: 0,
      dex: new Set<number>(), dexNew: [], seen: new Set<string>(), wowN: 0, firstTap: -1, firstWow: -1,
      events: [], banner: null, spot: null, pick: -1, pickT: -999, sweep: [], sweepT: -999, bubT: -999,
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
    if (b.k === BUBBLE) for (let j = 0; j < B.length; j++) {
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
    if (b.m === 3) continue;
    const px = b.x - x, py = b.y - y, rr = HIT + b.r * 0.6 + pad;
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
  for (const f of s.foes) consider(f.x, f.y + 0.03);
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
  for (let gy = 0; gy < 5; gy++) for (let gx = 0; gx < 5; gx++) {
    const x = 0.12 + gx * 0.19, y = 1.22 - gy * 0.17;
    if (threat(s, x, y, 110, false, 0.03) < 1e9) continue;
    let near = 1e9;
    for (const b of s.buls) near = Math.min(near, (b.x - x) ** 2 + (b.y - y) ** 2);
    const v = Math.min(near, 0.09) + (4 - gy) * 0.002 - Math.abs(x - s.wx) * 0.001;
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
    const exposed = s.pt > GRACE - 40 && s.inv < 20;
    const hitIn = exposed ? threat(s, s.wx, s.wy, 40, false) : 1e9;
    // 급하지 않으면 9틱에 한 번만 살핀다(가볍게)
    if (hitIn >= 1e9 && s.t % 9 >= 3) return NO;
    const c = densest(s, 3);
    const need = s.stage >= 1 && s.best < d.starN ? d.starN : 0;
    const goal = Math.max(need, boss ? 20 : s.stage < 5 ? 10 : 14);
    const hp = s.foes.reduce((a, f) => a + Math.max(0, f.hp) + f.mir * 2, 0);
    const kills = !need && c.n >= 3 && c.n * multOf(c.n) * hatPow(s) >= hp && s.foes.length > 0;
    const waited = s.t - Math.max(s.gulp ? s.gulp.t : 0, s.t - s.pt);
    const full = s.buls.length >= BUL_MAX - 8;
    if (c.n >= goal || kills || (c.n >= 1 && s.foes.length > 0 && (waited > (need ? 540 : 300) || full))) return at(c.x, c.y);
    if (hitIn < 1e9) {
      // 맞기 전에: 모은 게 아까우면 빈자리로 비키고, 아니면 그냥 한입
      if (c.n < goal * 0.65 || c.n < 1) {
        const q = safeSpot(s);
        if (q && countAt(s, q.x, q.y, hatR(s) ** 2) <= Math.max(2, c.n * 0.3)) return at(q.x, q.y);
      }
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

/** 버릇 봇 1: 늘 화면 한가운데만 톡 (쉼이 끝날 때마다) */
export const bulletstealHabit: Bot<StealState> = {
  name: '버릇: 늘 화면 가운데',
  act(s) {
    if (s.down) return NO;
    const sk = skip(s);
    if (sk) return sk;
    if (s.phase === 'choice') return s.pick < 0 && s.pt > CHOICE_MIN + 2 ? at(0.27, 0.62) : NO;
    return ready(s) ? at(0.5, 0.62) : NO;
  },
};

/** 버릇 봇 2: 늘 가장 가까운 적 바로 옆을 톡 (쉼이 끝날 때마다) */
export const bulletstealHabit2: Bot<StealState> = {
  name: '버릇: 늘 가장 가까운 적 옆',
  act(s) {
    if (s.down) return NO;
    const sk = skip(s);
    if (sk) return sk;
    if (s.phase === 'choice') return s.pick < 0 && s.pt > CHOICE_MIN + 2 ? at(0.27, 0.62) : NO;
    if (!ready(s)) return NO;
    const f = nearestFoe(s, s.wx, s.wy);
    return f ? at(f.x, f.y + 0.06) : NO;
  },
};

/** 측정 스크립트용 */
export const _bot = { densest, threat, safeSpot, ready, skip, at, NO };

function drawAll(_ctx: CanvasRenderingContext2D, _s: StealState, _w: number, _h: number, _th: Theme) {
  void juice;
}
