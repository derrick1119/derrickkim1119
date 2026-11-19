/**
 * 꼬마 왕국 두 갈래 (34라운드: 완전히 다른 장르 — 두 갈래 결정 × 꾸미기 × 톡) — dilemma · decorate · pointer.
 * 조작(기준 9·11·19): 톡 하나. 아래 큰 단추 둘(왼쪽·오른쪽) 중 하나를 톡 → 눈앞의 꼬마 왕국이 그 결과로 바로 바뀐다.
 *   시간 압박 없음: 손님은 단추를 누를 때까지 얼마든지 기다린다. 키보드는 ← → 로 고르고 스페이스(또는 숫자 1·2·3).
 * 규칙(결정적, 3줄): 손님 부탁에 두 갈래 중 하나를 고르면 식량·행복·금화·병사 막대가 오르내린다(단추에 미리 보임).
 *   막대 하나라도 바닥나거나 꽉 차면(좋은 것도 넘치면 탈) 그 계절은 실패 — 하트 -1, 같은 계절 다시. 날 수만큼 버티면 다음 계절.
 * 와우: 좋은 것도 넘치면 탈 — 행복이 꽉 차면 아무도 일을 안 하고, 금화가 넘치면 도둑 떼가 온다. 고르는 순간 눈앞의 왕국이 잔치·성벽·금빛 밀로 바뀐다.
 * 판(계절) 7개 — 판마다 하는 일이 바뀌는 새것 하나:
 *   1 봄(고르면 왕국이 바뀐다) → 2 여름(내일 손님이 미리 보임: 앞일 대비) → 3 가을(이어지는 이야기: 오늘 고른 게 며칠 뒤 손님을 바꿈)
 *   → 4 겨울(눈보라 예보: 날을 세며 식량을 모음) → 5 축제(왕관 카드: 한 번은 두 쪽 다) → 6 전쟁(적군이 온다: 그날까지 병사를 맞춤)
 *   → 7 용의 해(용이 세 번 찾아옴: 세 번 다 밥을 주면 친구).
 * 별(쉬운 말): 1판 하나, 판마다 하나씩 — 버티기 · 막대 넷 다 반 이상 · 고마운 손님 다시 만나기 · 눈보라 뒤에도 식량 반 이상 ·
 *   빨간 칸 한 번도 안 가기 · 잔치 세 번 열기 · 적군 물리치기 · 용과 친구 되기.
 * 웃음: 실패는 막대마다 다른 개그 — 쥐 떼 잔치(식량 넘침) · 너무 신나 아무도 일 안 함(행복 넘침) · 도둑이 왕관까지(금화 넘침) · 장군이 왕관을 씀(병사 넘침).
 * 솔직히: 좌우로 고르며 왕국 살림 막대 넷을 맞추는 결정 카드 장르와 뼈대가 닮았다. 다른 점: 결과가 단추에 다 보이고(숨김 없음),
 *   고르는 순간 눈앞의 디오라마가 바뀌고, 내일 손님 미리 보기·이어지는 이야기·날짜 정해진 큰 사건·왕관 카드로 '앞일을 맞추는' 퍼즐이 된다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.6;
const MAXV = 10;
/** 막대: 0 식량 · 1 행복 · 2 금화 · 3 병사 */
export const BAR = ['식량', '행복', '금화', '병사'];
const WALK_T = 34, INTRO_T = 100, ACT_T = 84, EV_T = 124, RESULT_T = 190, FAIL_T = 186;
/** 별 하나 = 150 + 계절마다 50 (뒤 계절일수록 앞일을 더 맞춰야 한다) */
const DAY_PTS = 5, CLEAR_PTS = 40, STAR_PTS = 150, STAR_UP = 50, WIN_PTS = 300;
/** 단추 자리 (세로는 가로 폭 단위) */
const BY0 = 1.17, BY1 = 1.465;

type Phase = 'walk' | 'ask' | 'act' | 'event' | 'result' | 'fail';
export type Who = 'farmer' | 'knight' | 'merchant' | 'wizard' | 'jester' | 'baker' | 'dragon';
export type Anim = 'feast' | 'store' | 'harvest' | 'wall' | 'train' | 'coinsIn' | 'coinsOut' | 'rain' | 'fireworks' | 'music' | 'build' | 'rest' | 'dragonFeed' | 'dragonShoo' | 'magic' | 'bread' | 'refuse';
type Tag = 'feast' | 'dragon' | 'kind' | 'pay';
export interface Opt { t: string; e: number[]; an: Anim; tag?: Tag; next?: string }
export interface Card { id: string; who: Who; say: string; a: Opt; b: Opt }
const WHO_NAME: Record<Who, string> = { farmer: '농부', knight: '기사', merchant: '상인', wizard: '마법사', jester: '광대', baker: '빵집 할머니', dragon: '용' };
/** 큰 연출(띠)이 뜨는 결과 */
const BIG = new Set<Anim>(['feast', 'harvest', 'wall', 'fireworks', 'dragonFeed', 'magic', 'build', 'rain', 'train']);

const o = (t: string, e: number[], an: Anim, tag?: Tag, next?: string): Opt => ({ t, e, an, tag, next });
const C = (id: string, who: Who, say: string, a: Opt, b: Opt): Card => ({ id, who, say, a, b });

/** 손님 카드. e = [식량, 행복, 금화, 병사] */
export const CARDS: Record<string, Card> = Object.fromEntries(
  [
    // ── 봄: 순한 카드 (어떻게 골라도 바닥·꽉 참에 못 닿게 다섯 장이 짜여 있다) ──
    C('feast0', 'farmer', '잔치를 열까요?', o('잔치 열기', [-1, 2, 0, 0], 'feast', 'feast'), o('곳간에 두기', [1, -1, 0, 0], 'store')),
    C('wall0', 'knight', '성벽을 높일까요?', o('높이기', [0, 0, -1, 2], 'wall'), o('다음에', [0, 0, 1, -1], 'refuse')),
    C('silk0', 'merchant', '고운 비단 사세요!', o('사기', [0, 1, -1, 0], 'coinsOut'), o('안 사기', [0, -1, 1, 0], 'refuse')),
    C('field0', 'farmer', '밭을 넓힐까요?', o('넓히기', [2, 0, -1, 0], 'harvest'), o('쉬기', [-1, 1, 0, 0], 'rest')),
    C('recruit0', 'knight', '병사를 뽑을까요?', o('뽑기', [-1, 0, 0, 1], 'train'), o('밭으로 보내기', [1, 0, 0, -1], 'harvest')),
    // ── 여름부터: 기본 카드 ──
    C('feast', 'farmer', '잔치를 열까요?', o('잔치 열기', [-1, 2, 0, 0], 'feast', 'feast'), o('곳간에 두기', [1, -1, 0, 0], 'store')),
    C('wall', 'knight', '성벽을 높일까요?', o('높이기', [0, 0, -1, 2], 'wall'), o('다음에', [0, 0, 1, -1], 'refuse')),
    C('silk', 'merchant', '고운 비단 사세요!', o('사기', [0, 2, -1, 0], 'coinsOut'), o('안 사기', [0, -1, 1, 0], 'refuse')),
    C('field', 'farmer', '밭을 넓힐까요?', o('넓히기', [2, 0, -1, 0], 'harvest'), o('쉬기', [-1, 1, 0, 0], 'rest')),
    C('song', 'jester', '노래 한 곡 할까요?', o('듣기', [0, 2, 0, -1], 'music'), o('훈련하기', [0, -1, 0, 2], 'train')),
    C('recruit', 'knight', '병사를 뽑을까요?', o('뽑기', [-1, 0, 0, 2], 'train'), o('밭으로 보내기', [2, 0, 0, -1], 'harvest')),
    C('taxcut', 'merchant', '세금 좀 깎아 주세요!', o('깎아 주기', [0, 2, -2, 0], 'coinsOut'), o('그대로', [0, -1, 2, 0], 'coinsIn')),
    C('bread', 'baker', '빵을 나눠 줄까요?', o('나눠 주기', [-2, 2, 0, 0], 'bread'), o('팔기', [-1, 0, 2, 0], 'coinsIn')),
    C('rain', 'wizard', '비를 내려 줄까요?', o('부탁해요', [2, 0, -1, 0], 'rain'), o('소풍 가요', [-1, 1, 0, 0], 'rest')),
    C('fire', 'wizard', '불꽃놀이 어때요?', o('펑펑!', [0, 3, -2, 0], 'fireworks', 'feast'), o('다음에', [0, -1, 1, 0], 'refuse')),
    C('hunt', 'knight', '사냥을 갈까요?', o('가요', [2, 0, 0, -1], 'harvest'), o('성 지키기', [-1, 0, 0, 1], 'train')),
    C('sell', 'merchant', '밀을 사 갈게요!', o('팔기', [-2, 0, 2, 0], 'coinsIn'), o('안 팔기', [1, -1, 0, 0], 'store')),
    // ── 가을: 이어지는 이야기 (고른 쪽에 따라 며칠 뒤 손님이 바뀐다) ──
    C('wizLost', 'wizard', '길을 잃었어요… 재워 줄래요?', o('재워 주기', [-1, 1, -1, 0], 'magic', 'kind', 'wizThanks'), o('돌려보내기', [0, -1, 1, 0], 'refuse', undefined, 'wizPrank')),
    C('wizThanks', 'wizard', '그때 고마웠어요! 선물이에요', o('풍년 마법', [3, 0, 0, 0], 'harvest', 'pay'), o('웃음 마법', [0, 3, 0, 0], 'magic', 'pay')),
    C('wizPrank', 'wizard', '흥! 장난 마법이다~', o('개구리 비', [0, -2, 0, 0], 'rain'), o('금화가 낙엽으로', [0, 0, -2, 0], 'refuse')),
    C('thief', 'knight', '빵 도둑을 잡았어요!', o('용서하기', [0, 1, -1, 0], 'coinsOut', 'kind', 'thiefBack'), o('감옥에', [0, -1, 0, 1], 'train')),
    C('thiefBack', 'knight', '그 도둑이 착해졌대요!', o('병사로 받기', [0, 0, 0, 3], 'train', 'pay'), o('일꾼으로 받기', [3, 0, 0, 0], 'harvest', 'pay')),
    // ── 겨울 ──
    C('sled', 'jester', '썰매 대회 열까요?', o('열기', [-1, 2, 0, 0], 'feast', 'feast'), o('눈 치우기', [0, -1, 0, 1], 'train')),
    C('soup', 'baker', '따뜻한 수프 끓일까요?', o('끓이기', [-2, 2, 0, 0], 'bread'), o('아끼기', [1, -1, 0, 0], 'store')),
    C('icefish', 'farmer', '얼음낚시 갈까요?', o('가요', [2, 0, 0, -1], 'harvest'), o('난롯가에서 쉬기', [-1, 1, 0, 0], 'rest')),
    // ── 축제 ──
    C('lantern', 'jester', '등불 축제 할까요?', o('등불 켜기', [0, 2, -1, 0], 'feast', 'feast'), o('일찍 자기', [0, -1, 0, 1], 'rest')),
    C('pie', 'baker', '큰 파이 구울까요?', o('굽기', [-1, 2, 0, 0], 'feast', 'feast'), o('팔기', [-1, 0, 2, 0], 'coinsIn')),
    // ── 전쟁 ──
    C('spy', 'knight', '적군 첩자를 봤어요!', o('쫓아가기', [0, 0, -1, 2], 'train'), o('모른 척', [0, -1, 1, 0], 'refuse')),
    C('armor', 'merchant', '튼튼한 갑옷 사세요!', o('사기', [0, 0, -2, 2], 'wall'), o('안 사기', [0, 0, 1, -1], 'refuse')),
    // ── 용의 해 ──
    C('dragon', 'dragon', '배고파… 꼬르륵', o('파이 주기', [-1, 1, 0, 0], 'dragonFeed', 'dragon'), o('쫓아내기', [0, -1, 0, 1], 'dragonShoo')),
    C('dragonGift', 'dragon', '친구야! 선물이야', o('밭 갈아 주기', [3, 0, 0, 0], 'harvest', 'pay'), o('용 비늘 금화', [0, 0, 3, 0], 'coinsIn', 'pay')),
  ].map((c) => [c.id, c]),
);
const BASE = ['feast', 'wall', 'silk', 'field', 'song', 'recruit', 'taxcut', 'bread', 'rain', 'fire', 'hunt', 'sell'];

type StarK = 'live' | 'half' | 'story' | 'storm' | 'safe' | 'feast' | 'win' | 'dragon';
interface Star { k: StarK; n: number; label: string }
const S = (k: StarK, n: number, label: string): Star => ({ k, n, label });
export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'fest' | 'war' | 'dragon';
interface StageDef {
  key: Season; name: string; days: number; start: number[];
  /** 반드시 넣을 카드 [이 자리부터, 이 자리까지 중 아무 데, id] · 나머지를 채울 카드 */
  fixed: [number, number, string][]; pool: string[];
  /** 계절이 깊어지면 막대가 크게 움직인다 (0이 아닌 칸마다 이만큼 더) */
  amp: number;
  preview: boolean; crown?: number;
  storm?: { after: number; e: number[] };
  battle?: { after: number; enemy: number };
  news: string; spot: string; stars: Star[];
}
const LIVE = (n: string) => S('live', 0, `${n} 버티기`);
export const STAGES: StageDef[] = [
  {
    key: 'spring', name: '봄', days: 5, start: [5, 5, 5, 5], fixed: [[0, 0, 'feast0']], pool: ['wall0', 'silk0', 'field0', 'recruit0'], preview: false, amp: 0,
    news: '', spot: '', stars: [LIVE('봄')],
  },
  {
    key: 'summer', name: '여름', days: 6, start: [5, 5, 5, 5], fixed: [], pool: BASE, preview: true, amp: 0,
    news: '내일 올 손님이 미리 보여요', spot: 'preview', stars: [LIVE('여름'), S('half', 5, '막대 넷 다 반 이상')],
  },
  {
    key: 'autumn', name: '가을', days: 7, start: [5, 5, 5, 5], fixed: [[0, 2, 'wizLost'], [1, 3, 'thief']], pool: BASE, preview: true, amp: 0,
    news: '이야기가 이어져요 — 고른 쪽이 며칠 뒤 손님을 바꿔요', spot: 'story',
    stars: [LIVE('가을'), S('half', 5, '막대 넷 다 반 이상'), S('story', 1, '고마운 손님 또 만나기')],
  },
  {
    key: 'winter', name: '겨울', days: 7, start: [5, 5, 5, 5], fixed: [[0, 3, 'sled'], [0, 3, 'icefish'], [4, 6, 'soup']], pool: [...BASE, 'wizLost'], preview: true, amp: 0,
    storm: { after: 4, e: [-2, -1, 0, 0] },
    news: '눈보라 예보 — 그날까지 식량을 모아요', spot: 'storm',
    stars: [LIVE('겨울'), S('storm', 5, '눈보라 뒤 식량 반 이상'), S('safe', 0, '빨간 칸 안 가기')],
  },
  {
    key: 'fest', name: '축제', days: 7, start: [6, 4, 6, 5], fixed: [[0, 1, 'lantern'], [2, 3, 'pie'], [3, 5, 'fire'], [5, 6, 'feast']], pool: [...BASE, 'thief'], preview: true, crown: 1, amp: 0,
    news: '왕관 카드 — 한 번은 두 쪽 다 골라요', spot: 'crown',
    stars: [LIVE('축제'), S('feast', 3, '잔치 세 번 열기'), S('half', 5, '막대 넷 다 반 이상')],
  },
  {
    key: 'war', name: '전쟁', days: 7, start: [5, 5, 5, 4], fixed: [[0, 2, 'spy'], [2, 4, 'armor']], pool: [...BASE, 'wizLost'], preview: true, amp: 0,
    battle: { after: 5, enemy: 7 },
    news: '적군이 와요 — 그날까지 병사를 모아요', spot: 'battle',
    stars: [LIVE('전쟁'), S('win', 7, '적군 물리치기'), S('safe', 0, '빨간 칸 안 가기')],
  },
  {
    key: 'dragon', name: '용의 해', days: 8, start: [6, 4, 5, 5], fixed: [[1, 1, 'dragon'], [3, 3, 'dragon'], [5, 5, 'dragon']], pool: [...BASE, 'thief'], preview: true, amp: 0,
    news: '용이 세 번 와요 — 세 번 다 밥을 주면 친구!', spot: 'dragon',
    stars: [LIVE('용의 해'), S('dragon', 3, '용과 친구 되기'), S('half', 5, '막대 넷 다 반 이상')],
  },
];
export const STAGE_COUNT = STAGES.length;
const WIN_E = [0, 2, 1, -1], LOSE_E = [-1, -2, -1, -2];

interface Deal { c: Card; L: Opt; R: Opt }
interface Ev { t: number; kind: string; x: number; y: number; n?: number; text?: string }
type EvKind = 'blizzard' | 'battle' | 'friend';

export interface KState {
  rng: Rng; seed: number; t: number; stage: number; phase: Phase; pt: number; walkT: number;
  hearts: number; stars: number; pts: number; dead: boolean; won: boolean; again: boolean; tries: number;
  v: number[]; prev: number[]; day: number;
  cur: Deal; queue: Deal[];
  last: { k: number; d: Deal; e: number[]; an: Anim[]; t: number } | null;
  crown: number; sel: number; kbd: boolean; pdown: boolean; dirWas: number; wiggleT: number;
  feasts: number; love: number; friend: boolean; kind: number; pay: number; red: boolean; stormOk: boolean; stormDone: boolean; battleDone: boolean; battleWon: boolean;
  ev: { k: EvKind; e: number[]; win: boolean; t: number } | null;
  broke: { bar: number; hi: boolean } | null;
  starOk: boolean[]; got: number; ok: boolean;
  /** 꾸미기: 지은 집 수 · 계절마다 남는 기념물 · 용 친구 */
  houses: number; deco: Season[]; dragonPal: boolean;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; spot: { key: string; t: number } | null;
  wowN: number; firstTap: number; firstWow: number; events: Ev[];
}

const ev = (s: KState, kind: string, x: number, y: number, n?: number, text?: string) => s.events.push({ t: s.t, kind, x, y, n, text });
function see(s: KState, key: string, text = '') {
  if (!key || s.seen.has(key)) return false;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
  return true;
}
const wow = (s: KState) => {
  s.wowN++;
  if (s.firstWow < 0 && s.firstTap >= 0) s.firstWow = s.t;
};
/** 계절의 세기(amp)만큼 0이 아닌 칸을 키운다 */
const ampOpt = (q: Opt, amp: number): Opt => (amp ? { ...q, e: q.e.map((x) => (x ? x + Math.sign(x) * amp : 0)) } : q);
/** 이야기·용 카드는 계절과 상관없이 같은 세기 */
const FIRM = new Set(['wizThanks', 'wizPrank', 'thiefBack', 'dragon', 'dragonGift']);
const dealOf = (c: Card, swap: boolean, amp = 0): Deal => {
  if (FIRM.has(c.id)) amp = 0;
  const a = ampOpt(c.a, amp), b = ampOpt(c.b, amp);
  return { c, L: swap ? b : a, R: swap ? a : b };
};

function buildDeck(s: KState): Deal[] {
  const d = STAGES[s.stage], slots: (string | null)[] = Array(d.days).fill(null);
  for (const [lo, hi, id] of d.fixed) {
    const free: number[] = [];
    for (let i = lo; i <= Math.min(hi, d.days - 1); i++) if (!slots[i]) free.push(i);
    slots[free.length ? free[Math.floor(s.rng() * free.length)] : slots.indexOf(null)] = id;
  }
  const pool = d.pool.filter((id) => !slots.includes(id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(s.rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  let pi = 0;
  for (let i = 0; i < d.days; i++) if (!slots[i]) slots[i] = pool[pi++ % pool.length];
  // 첫 판 첫 손님(잔치)은 늘 왼쪽이 잔치 — 손가락이 가리키는 곳
  return slots.map((id, i) => dealOf(CARDS[id!], s.stage === 0 && i === 0 ? false : s.rng() < 0.5, d.amp));
}

function newStage(s: KState) {
  const d = STAGES[s.stage];
  s.v = [...d.start];
  s.prev = [...s.v];
  s.day = 0;
  s.queue = buildDeck(s);
  s.cur = s.queue.shift()!;
  s.last = null;
  s.crown = d.crown ?? 0;
  s.sel = 0;
  s.feasts = 0;
  s.love = 0;
  s.friend = false;
  s.kind = 0;
  s.pay = 0;
  s.red = false;
  s.stormOk = false;
  s.stormDone = false;
  s.battleDone = false;
  s.battleWon = false;
  s.ev = null;
  s.broke = null;
  s.starOk = d.stars.map(() => false);
  s.got = 0;
  s.ok = false;
  const first = s.stage === 0 && !s.again && s.firstTap < 0;
  s.phase = first ? 'ask' : 'walk';
  s.walkT = first ? 0 : INTRO_T;
  s.pt = 0;
  see(s, 'who:' + s.cur.c.who);
  if (d.spot && see(s, d.spot)) s.spot = { key: d.spot, t: s.t + 20 };
}

function apply(s: KState, e: number[]) {
  for (let i = 0; i < 4; i++) {
    s.v[i] += e[i];
    if (s.v[i] <= 1 || s.v[i] >= MAXV - 1) {
      s.red = true;
      if (see(s, 'red')) s.newsQ.push('빨간 칸 — 바닥나도, 꽉 차도 실패예요!');
    }
    if (!s.broke && (s.v[i] <= 0 || s.v[i] >= MAXV)) s.broke = { bar: i, hi: s.v[i] >= MAXV };
  }
}

/** k: 0 왼쪽 · 1 오른쪽 · 2 왕관(둘 다) */
export function optsOf(d: Deal, k: number): Opt[] {
  return k === 2 ? [d.L, d.R] : [k === 0 ? d.L : d.R];
}
export function effOf(d: Deal, k: number): number[] {
  const e = [0, 0, 0, 0];
  for (const q of optsOf(d, k)) for (let i = 0; i < 4; i++) e[i] += q.e[i];
  return e;
}

function choose(s: KState, k: number) {
  const d = s.cur, opts = optsOf(d, k), e = effOf(d, k);
  if (k === 2) {
    s.crown--;
    see(s, 'crownUsed');
  }
  s.prev = [...s.v];
  apply(s, e);
  for (const q of opts) {
    if (q.tag === 'feast') s.feasts++;
    if (q.tag === 'dragon') s.love++;
    if (q.tag === 'kind') s.kind++;
    if (q.tag === 'pay') {
      s.pay++;
      see(s, 'pay');
    }
    if (q.next) {
      // 이어지는 이야기: 이틀 뒤(남은 날 안에서) 그 손님이 다시 온다 — 맨 뒤 카드 하나를 밀어낸다
      const at = Math.min(1, s.queue.length - 1);
      if (at >= 0) {
        s.queue.splice(at, 0, dealOf(CARDS[q.next], s.rng() < 0.5, STAGES[s.stage].amp));
        s.queue.pop();
      }
    }
  }
  s.last = { k, d, e, an: opts.map((q) => q.an), t: s.t };
  s.phase = 'act';
  s.pt = 0;
  if (s.firstTap < 0) s.firstTap = s.t;
  if (k === 2 || opts.some((q) => BIG.has(q.an) || q.tag === 'pay')) wow(s);
  ev(s, 'choose', 0.5, 0.5, k);
}

function clearStage(s: KState) {
  const d = STAGES[s.stage];
  s.phase = 'result';
  s.pt = 0;
  s.ok = true;
  s.starOk = d.stars.map((q) => starMet(s, q));
  s.got = s.starOk.filter(Boolean).length;
  s.stars += s.got;
  s.pts += CLEAR_PTS + s.got * (STAR_PTS + STAR_UP * s.stage);
  if (!s.deco.includes(d.key)) s.deco.push(d.key);
  if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
  wow(s);
  ev(s, 'clear', 0.5, 0.5, s.got);
}

function failStage(s: KState) {
  s.phase = 'fail';
  s.pt = 0;
  s.ok = false;
  s.hearts--;
  s.tries++;
  ev(s, 'fail', 0.5, 0.5, s.broke?.bar ?? 0, s.broke?.hi ? 'hi' : 'lo');
}

function nextDay(s: KState) {
  if (s.day >= STAGES[s.stage].days || !s.queue.length) return clearStage(s);
  s.cur = s.queue.shift()!;
  s.phase = 'walk';
  s.walkT = WALK_T;
  s.pt = 0;
  if (see(s, 'who:' + s.cur.c.who) && s.cur.c.who === 'dragon') s.newsQ.push('용이다! 밥을 주면 친해져요');
}

function startEvent(s: KState, k: EvKind, e: number[], win = false) {
  s.prev = [...s.v];
  apply(s, e);
  s.ev = { k, e, win, t: s.t };
  s.phase = 'event';
  s.pt = 0;
  wow(s);
  ev(s, k, 0.5, 0.5, win ? 1 : 0);
}

function afterAct(s: KState) {
  if (s.broke) return failStage(s);
  const d = STAGES[s.stage];
  s.day++;
  s.pts += DAY_PTS;
  if (s.love >= 3 && !s.friend) {
    s.friend = true;
    s.dragonPal = true;
    if (s.queue.length) {
      s.queue.unshift(dealOf(CARDS.dragonGift, s.rng() < 0.5));
      s.queue.pop();
    }
    return startEvent(s, 'friend', [0, 0, 0, 0]);
  }
  if (d.storm && !s.stormDone && s.day >= d.storm.after) {
    s.stormDone = true;
    startEvent(s, 'blizzard', d.storm.e);
    s.stormOk = s.v[0] >= 5;
    return;
  }
  if (d.battle && !s.battleDone && s.day >= d.battle.after) {
    s.battleDone = true;
    s.battleWon = s.v[3] >= d.battle.enemy;
    return startEvent(s, 'battle', s.battleWon ? WIN_E : LOSE_E, s.battleWon);
  }
  nextDay(s);
}

function starMet(s: KState, st: Star) {
  switch (st.k) {
    case 'live': return true;
    case 'half': return s.v.every((x) => x >= st.n);
    case 'story': return s.pay >= st.n;
    case 'storm': return s.stormOk;
    case 'safe': return !s.red;
    case 'feast': return s.feasts >= st.n;
    case 'win': return s.battleWon;
    case 'dragon': return s.friend;
  }
}
/** 별 칸 옆 진행 (예: 2/3) */
function starNow(s: KState, st: Star): string {
  const v = st.k === 'feast' ? s.feasts : st.k === 'dragon' ? Math.min(3, s.love) : -1;
  return v >= 0 && v < st.n ? `${v}/${st.n}` : '';
}
/** 이미 놓친 별 */
function starBroken(s: KState, st: Star) {
  const d = STAGES[s.stage];
  if (st.k === 'safe') return s.red;
  if (st.k === 'storm') return s.stormDone && !s.stormOk;
  if (st.k === 'win') return s.battleDone && !s.battleWon;
  if (st.k === 'dragon') return d.fixed.filter((f) => f[2] === 'dragon').length - (s.queue.filter((q) => q.c.id === 'dragon').length + (s.phase === 'ask' || s.phase === 'walk' ? (s.cur.c.id === 'dragon' ? 1 : 0) : 0)) > s.love;
  return false;
}

/** 지금 보이는 단추들 (가로 0~1 · 세로는 폭 단위) */
export function buttons(s: KState): { k: number; x0: number; x1: number }[] {
  return s.crown > 0
    ? [{ k: 0, x0: 0.03, x1: 0.385 }, { k: 2, x0: 0.4, x1: 0.6 }, { k: 1, x0: 0.615, x1: 0.97 }]
    : [{ k: 0, x0: 0.03, x1: 0.485 }, { k: 1, x0: 0.515, x1: 0.97 }];
}
function hitButton(s: KState, x: number, y: number) {
  if (y < BY0 - 0.015 || y > BY1 + 0.02) return -1;
  for (const b of buttons(s)) if (x >= b.x0 - 0.01 && x <= b.x1 + 0.01) return b.k;
  return -1;
}

function cosmetic(s: KState) {
  s.events = s.events.filter((e) => s.t - e.t < 120);
  if (s.spot && s.t - s.spot.t > 150) s.spot = null;
  if (!s.news || s.t - s.news.t > 150) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news && s.t - s.news.t > 150 ? null : s.news;
}

const game: GameDef<KState> & { wows(s: KState): number } = {
  id: 'tinykingdom',
  name: '꼬마 왕국 두 갈래',
  genes: ['dilemma', 'decorate', 'pointer'],
  twist: '좋은 것도 넘치면 탈 — 행복이 꽉 차면 아무도 일을 안 하고 금화가 넘치면 도둑 떼가 온다. 결과는 단추에 다 보이고, 내일 손님·며칠 뒤 사건까지 맞춰 막대 넷을 가운데로 모는 퍼즐',
  rules: [
    '손님 부탁에 왼쪽·오른쪽 단추 하나를 톡 — 왕국이 바로 바뀌어요.',
    '식량·행복·금화·병사 막대가 바닥나거나 꽉 차면 그 계절은 실패(하트 -1).',
    '계절의 날들을 버티면 다음 계절! 막대를 가운데로 모아요.',
  ],
  controls: 'touch',
  hint: '단추 하나를 톡 / ← → 로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '맑은 하늘 아래 동화풍 꼬마 왕국 디오라마 — 파스텔 지붕·깃발·풍차·금빛 밭, 손님이 찾아와 부탁하는 그림책 왕국',
    mood: '떠 있는 작은 섬 위의 꼬마 왕국. 고르는 순간 광장에 등불이 켜지고 주민이 춤추고, 성벽이 쿵쿵 솟고, 밭에 금빛 밀이 물결친다. 계절마다 벚꽃·해바라기·단풍·눈·등불·깃발·보랏빛 용의 하늘로 색이 바뀐다.',
    palette: { bg: '#9fdcff', ink: '#3b2a1a', muted: '#8a7a68', accent: '#ffcf3a', hot: '#ff5f6d', soft: '#fff6e0' },
  },
  guard: (s) => s.v.filter((x) => x > 1 && x < MAXV - 1).length,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  reveals: (s) => s.seen.size,
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'ask', pt: 0, walkT: 0,
      hearts: 3, stars: 0, pts: 0, dead: false, won: false, again: false, tries: 0,
      v: [5, 5, 5, 5], prev: [5, 5, 5, 5], day: 0, queue: [], last: null,
      crown: 0, sel: 0, kbd: false, pdown: false, dirWas: 0, wiggleT: -999,
      feasts: 0, love: 0, friend: false, kind: 0, pay: 0, red: false, stormOk: false, stormDone: false, battleDone: false, battleWon: false,
      ev: null, broke: null, starOk: [false], got: 0, ok: false,
      houses: 0, deco: [], dragonPal: false,
      seen: new Set<string>(), newsQ: [], news: null, spot: null,
      wowN: 0, firstTap: -1, firstWow: -1, events: [],
    } as unknown as KState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null, tap = !!p && !s.pdown;
    s.pdown = !!p;
    // 키보드: ← → 로 단추 고르기 (눈에 보이는 테두리) · 숫자 1·2·3
    const order = buttons(s).map((b) => b.k);
    if (inp.dir !== 0 && s.dirWas === 0) {
      s.kbd = true;
      const i = Math.max(0, order.indexOf(s.sel));
      s.sel = order[Math.max(0, Math.min(order.length - 1, i + inp.dir))];
    }
    s.dirWas = inp.dir;
    if (!order.includes(s.sel)) s.sel = 0;
    if (s.phase === 'ask') {
      let k = -1;
      if (inp.pick !== undefined) k = inp.pick === 2 && s.crown > 0 ? 2 : inp.pick === 1 ? 1 : inp.pick === 0 ? 0 : -1;
      else if (tap) {
        k = hitButton(s, p.x, p.y * A);
        if (k < 0) {
          if (s.kbd) k = s.sel;
          else s.wiggleT = s.t;
        }
      }
      if (k >= 0) choose(s, k);
    }
    s.pt++;
    if (s.phase === 'walk' && s.pt >= s.walkT) (s.phase = 'ask'), (s.pt = 0);
    else if (s.phase === 'act' && s.pt >= ACT_T + (s.last?.an.length === 2 ? 30 : 0)) afterAct(s);
    else if (s.phase === 'event' && s.pt >= EV_T) {
      if (s.broke) failStage(s);
      else nextDay(s);
    } else if (s.phase === 'result' && s.pt >= RESULT_T) {
      if (s.won) s.dead = true;
      else (s.again = false), s.stage++, newStage(s);
    } else if (s.phase === 'fail' && s.pt >= FAIL_T) {
      if (s.hearts <= 0) s.dead = true;
      else (s.again = true), newStage(s);
    }
    cosmetic(s);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const tinykingdom = game;

/** 시험·스크린샷용: k판(0부터)으로 바로 */
export function jumpTo(s: KState, k: number) {
  s.stage = k;
  s.firstTap = Math.max(0, s.firstTap);
  newStage(s);
}

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
function press(s: KState, k: number): Input {
  const b = buttons(s).find((q) => q.k === k) ?? buttons(s)[0];
  return { tap: false, dir: 0, pointer: { x: (b.x0 + b.x1) / 2, y: (BY0 + BY1) / 2 / A } };
}

interface Sim { v: number[]; day: number; red: boolean; feasts: number; love: number; kind: number; pay: number; storm: number; won: number; crown: number; dead: number; friend: boolean }
function simOf(s: KState): Sim {
  return { v: [...s.v], day: s.day, red: s.red, feasts: s.feasts, love: s.love, kind: s.kind, pay: s.pay, storm: s.stormDone ? (s.stormOk ? 1 : 0) : -1, won: s.battleDone ? (s.battleWon ? 1 : 0) : -1, crown: s.crown, dead: -1, friend: s.friend };
}
function simStep(st: Sim, d: StageDef, deal: Deal, k: number): Sim {
  const n: Sim = { ...st, v: [...st.v] };
  const hit = (e: number[]) => {
    for (let i = 0; i < 4; i++) {
      n.v[i] += e[i];
      if (n.v[i] <= 1 || n.v[i] >= MAXV - 1) n.red = true;
      if (n.dead < 0 && (n.v[i] <= 0 || n.v[i] >= MAXV)) n.dead = n.day;
    }
  };
  if (k === 2) n.crown--;
  hit(effOf(deal, k));
  for (const q of optsOf(deal, k)) {
    if (q.tag === 'feast') n.feasts++;
    if (q.tag === 'dragon') n.love++;
    if (q.tag === 'kind') n.kind++;
    if (q.tag === 'pay') n.pay++;
  }
  n.day++;
  if (n.love >= 3) n.friend = true;
  if (d.storm && n.storm < 0 && n.day >= d.storm.after) (hit(d.storm.e), (n.storm = n.v[0] >= 5 ? 1 : 0));
  if (d.battle && n.won < 0 && n.day >= d.battle.after) {
    n.won = n.v[3] >= d.battle.enemy ? 1 : 0;
    hit(n.won ? WIN_E : LOSE_E);
  }
  return n;
}
function leaf(st: Sim, d: StageDef): number {
  if (st.dead >= 0) return -100000 + st.dead * 1000;
  const rem = d.days - st.day;
  // 막대마다 노리는 자리: 보통은 가운데, 별이 걸린 막대는 그 별에 맞게
  const T = [5, 5, 5, 5];
  for (const q of d.stars) {
    if (q.k === 'half' && rem > 0) for (let i = 0; i < 4; i++) T[i] = 6;
    if (q.k === 'storm' && st.storm < 0) T[0] = 7.5;
    if (q.k === 'win' && st.won < 0) T[3] = 7.5;
    if (q.k === 'dragon' && st.love < 3) T[0] = Math.max(T[0], 6);
    if (q.k === 'feast' && st.feasts < q.n) (T[0] = Math.max(T[0], 6)), (T[1] = 4);
  }
  let val = 0;
  for (let i = 0; i < 4; i++) {
    const x = st.v[i];
    val -= (x - T[i]) ** 2 * 1.2;
    if (x <= 1 || x >= MAXV - 1) val -= 12;
  }
  for (const q of d.stars) {
    switch (q.k) {
      case 'half':
        if (rem <= 0) val += st.v.every((x) => x >= 5) ? 60 : 0;
        else for (const x of st.v) val -= Math.max(0, 5 - x) * (rem <= 2 ? 9 : 4);
        break;
      case 'story': val += st.pay ? 70 : st.kind ? 35 : 0; break;
      case 'storm': val += st.storm === 1 ? 60 : st.storm === 0 ? 0 : -Math.max(0, 7 - st.v[0]) * 7; break;
      case 'safe': val += st.red ? 0 : 60; break;
      case 'feast': val += Math.min(st.feasts, q.n) * 22; break;
      case 'win': val += st.won === 1 ? 60 : st.won === 0 ? 0 : -Math.max(0, (d.battle?.enemy ?? 0) - st.v[3]) * 8; break;
      case 'dragon': val += Math.min(3, st.love) * 25 + (st.friend ? 20 : 0); break;
      default: break;
    }
  }
  val += st.crown * 9;
  return val;
}
/** 이 계절에 올 수 있는 손님들 (사람도 몇 판 하면 안다) */
const poolMemo = new Map<number, Deal[]>();
function poolOf(stage: number): Deal[] {
  let p = poolMemo.get(stage);
  if (!p) {
    const d = STAGES[stage];
    p = [...new Set([...d.pool, ...d.fixed.map((f) => f[2])])].map((id) => dealOf(CARDS[id], false, d.amp));
    poolMemo.set(stage, p);
  }
  return p;
}
/** 보이지 않는 다음 날: 올 수 있는 손님마다 가장 좋은 쪽을 골랐을 때의 평균 */
function expectNext(st: Sim, d: StageDef, stage: number): number {
  if (st.dead >= 0 || st.day >= d.days) return leaf(st, d);
  const p = poolOf(stage);
  let sum = 0;
  for (const c of p) sum += Math.max(leaf(simStep(st, d, c, 0), d), leaf(simStep(st, d, c, 1), d));
  return 0.5 * leaf(st, d) + 0.5 * (sum / p.length);
}
function search(st: Sim, d: StageDef, cards: Deal[], i: number, stage = -1): number {
  if (st.dead >= 0 || st.day >= d.days) return leaf(st, d);
  if (i >= cards.length) return stage >= 0 ? expectNext(st, d, stage) : leaf(st, d);
  let best = -Infinity;
  for (const k of st.crown > 0 ? [0, 1, 2] : [0, 1]) best = Math.max(best, search(simStep(st, d, cards[i], k), d, cards, i + 1, stage));
  return best;
}
/** 잘하는 봇의 고르기: 지금 손님 + (보이면) 내일 손님 + 날짜 정해진 사건까지 내다보고 별을 노린다 */
export function smartPick(s: KState): number {
  const d = STAGES[s.stage];
  const cards = [s.cur, ...(d.preview && s.queue.length ? [s.queue[0]] : [])];
  const st = simOf(s);
  let best = -Infinity, bk = 0;
  for (const k of s.crown > 0 ? [0, 1, 2] : [0, 1]) {
    const v = search(simStep(st, d, cards[0], k), d, cards, 1, s.stage);
    if (v > best) (best = v), (bk = k);
  }
  return bk;
}

export const tinykingdomSmart: Bot<KState> = {
  name: '내일 손님·사건까지 내다보고 막대를 가운데로',
  act(s) {
    if (s.phase !== 'ask' || s.pdown) return NO;
    return press(s, smartPick(s));
  },
};

const dumbMem = new WeakMap<object, { key: string; at: number; down: boolean }>();
/** 못하는 봇: 아무 때나 아무 단추 */
export const tinykingdomRandom: Bot<KState> = {
  name: '아무 단추나',
  act(s, rng) {
    if (s.phase !== 'ask') return NO;
    const key = `${s.stage}:${s.tries}:${s.day}`;
    let m = dumbMem.get(s);
    if (!m || m.key !== key) dumbMem.set(s, (m = { key, at: s.t + 12 + Math.floor(rng() * 60), down: false }));
    if (m.down) return (m.down = false), NO;
    if (s.t < m.at) return NO;
    m.down = true;
    m.at = s.t + 20;
    const ks = buttons(s).map((b) => b.k);
    return press(s, ks[Math.floor(rng() * ks.length)]);
  },
};

/** 버릇 봇: 늘 행복이 더 오르는 쪽 */
export const tinykingdomHabit: Bot<KState> = {
  name: '늘 행복이 오르는 쪽',
  act(s) {
    if (s.phase !== 'ask' || s.pdown) return NO;
    return press(s, s.cur.R.e[1] > s.cur.L.e[1] ? 1 : 0);
  },
};

/** 독립 버릇 봇: 늘 왼쪽 */
export const tinykingdomHabit2: Bot<KState> = {
  name: '늘 왼쪽',
  act(s) {
    if (s.phase !== 'ask' || s.pdown) return NO;
    return press(s, 0);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
type C2 = CanvasRenderingContext2D;
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const c01 = (x: number) => Math.max(0, Math.min(1, x));
const eo = (u: number) => 1 - (1 - c01(u)) ** 3;
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, Math.abs(rx)), Math.max(0.1, Math.abs(ry)), rot, 0, TAU);
}
function lin(ctx: C2, x0: number, y0: number, x1: number, y1: number, ...st: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o2, c] of st) g.addColorStop(o2, c);
  return g;
}
function radg(ctx: C2, x: number, y: number, r0: number, r1: number, ...st: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.1, r1));
  for (const [o2, c] of st) g.addColorStop(o2, c);
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
function tri(ctx: C2, x: number, y: number, r: number, up: boolean) {
  ctx.beginPath();
  if (up) (ctx.moveTo(x, y - r), ctx.lineTo(x + r, y + r * 0.75), ctx.lineTo(x - r, y + r * 0.75));
  else (ctx.moveTo(x, y + r), ctx.lineTo(x + r, y - r * 0.75), ctx.lineTo(x - r, y - r * 0.75));
  ctx.closePath();
}
const OUT = '#5b3a21', INK = '#3b2a1a';
const BAR_COL = ['#f39a3d', '#ff6f9f', '#f2c21b', '#4f8ef7'];
const BAR_LIGHT = ['#ffd6a0', '#ffc6da', '#fff09a', '#bcd6ff'];
const BAR_DARK = ['#a85a14', '#b8335f', '#94700a', '#2a59b0'];
const SEASON_ICON: Record<Season, string> = { spring: '#ff9ec0', summer: '#ffcf3a', autumn: '#ff9a3c', winter: '#9fd4ff', fest: '#ff7a5a', war: '#e2454a', dragon: '#9f72f0' };

interface Pal { sky: [string, string, string]; hill: [string, string]; grass: [string, string]; rim: string; tree: [string, string]; part: string; floor: [string, string] }
const PAL: Record<Season, Pal> = {
  spring: { sky: ['#4fb3f6', '#9ad8ff', '#eaf8ff'], hill: ['#c3e8cc', '#9fd3b0'], grass: ['#a2e676', '#72c653'], rim: '#55a23c', tree: ['#ffc9dd', '#f598bf'], part: '#ffd3e4', floor: ['#fbe9cf', '#ecd1ab'] },
  summer: { sky: ['#2fa2f2', '#7fcbff', '#e2f6ff'], hill: ['#ade0b2', '#80c68e'], grass: ['#8edc56', '#5fbb38'], rim: '#4a9a2e', tree: ['#73d65c', '#41a63a'], part: '#fff3a0', floor: ['#fbe9cf', '#ecd1ab'] },
  autumn: { sky: ['#4aa8ee', '#a0d6ff', '#fff0d6'], hill: ['#ecd7a4', '#d6b67c'], grass: ['#cfdc62', '#a9bb46'], rim: '#8a9a36', tree: ['#ffb14a', '#ef7b2c'], part: '#ff9a3c', floor: ['#fbe6c8', '#ebcca2'] },
  winter: { sky: ['#6db6f0', '#b5dfff', '#f5fbff'], hill: ['#e6f0fa', '#cadcef'], grass: ['#fbfdff', '#dde9f6'], rim: '#a9c0dc', tree: ['#7cc39a', '#4f9c74'], part: '#ffffff', floor: ['#f2f4f8', '#dce2ec'] },
  fest: { sky: ['#5aaef0', '#ffc9b2', '#ffeacb'], hill: ['#ffd8c4', '#f3b9a4'], grass: ['#9ae06c', '#6cc24f'], rim: '#55a63c', tree: ['#7ad65e', '#4bb041'], part: '#ffd23a', floor: ['#fde5cf', '#efc9a8'] },
  war: { sky: ['#5ea3dc', '#a8cdec', '#f0f5f9'], hill: ['#bfd0bd', '#9fb59e'], grass: ['#a6d266', '#82b34a'], rim: '#6a9a3a', tree: ['#62b551', '#3f8e3a'], part: '#e8eef4', floor: ['#f3e6d2', '#e2ccae'] },
  dragon: { sky: ['#8a8cf2', '#c3a6ff', '#ffe2f2'], hill: ['#dac6f4', '#bba6e6'], grass: ['#98e292', '#64c27e'], rim: '#4aa060', tree: ['#c9a2ff', '#a074f0'], part: '#ead0ff', floor: ['#f6e6f6', '#e6cde6'] },
};

/** 섬(디오라마) 위 자리 — 가로 0~1, 세로는 폭 단위 */
const ISL = { x: 0.5, y: 0.63, rx: 0.49, ry: 0.17 };
const CASTLE = { x: 0.5, y: 0.53 };
const WALL = { x0: 0.31, x1: 0.69, y: 0.575 };
const PLAZA = { x: 0.5, y: 0.69, rx: 0.12, ry: 0.04 };
const TREASURY = { x: 0.8, y: 0.53 };
const BARN = { x: 0.24, y: 0.735 };
const MILL = { x: 0.12, y: 0.535 };
const FIELDS = [[0.05, 0.575], [0.19, 0.575], [0.06, 0.64], [0.2, 0.64]];
const HOUSES = [[0.645, 0.62], [0.765, 0.6], [0.885, 0.635], [0.705, 0.695], [0.835, 0.71]];
const TERR = 0.845;
const GUEST = { x: 0.19, y: 1.08 };
const KING = { x: 0.855, y: 1.08 };

// ── 배경 캐시 ──
const BGC = new Map<string, HTMLCanvasElement>();
function layer(w: number, h: number, sc: number, paint: (c: C2) => void) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * sc));
  c.height = Math.max(1, Math.ceil(h * sc));
  const g = c.getContext('2d')!;
  g.scale(sc, sc);
  paint(g);
  return c;
}
function puff(g: C2, x: number, y: number, wd: number, ht: number, fill: string, shade: string, seed: number) {
  const n = 5 + Math.floor(hsh(seed) * 3), pts: number[][] = [];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, px = x - wd / 2 + u * wd, r = ht * (0.42 + 0.5 * Math.sin(u * Math.PI) * (0.75 + 0.5 * hsh(seed + i)));
    pts.push([px, y - r * 0.55, r]);
  }
  g.fillStyle = lin(g, 0, y - ht * 1.2, 0, y, [0, fill], [0.7, fill], [1, shade]);
  g.beginPath();
  for (const [px, py, r] of pts) (g.moveTo(px + r, py), g.arc(px, py, r, 0, TAU));
  g.rect(x - wd / 2, y - ht * 0.35, wd, ht * 0.35);
  g.fill();
}
function bgLayer(w: number, h: number, sea: Season, sc: number) {
  const key = `${w}x${h}@${sc}:${sea}`;
  let b = BGC.get(key);
  if (b) return b;
  const P = PAL[sea], R = (r: number) => r * w;
  b = layer(w, h, sc, (g) => {
    g.fillStyle = lin(g, 0, 0, 0, R(0.9), [0, P.sky[0]], [0.55, P.sky[1]], [1, P.sky[2]]);
    g.fillRect(0, 0, w, h);
    g.fillStyle = radg(g, R(0.86), R(0.25), 0, R(0.7), [0, 'rgba(255,250,215,.9)'], [0.3, 'rgba(255,245,200,.35)'], [1, 'rgba(255,245,200,0)']);
    g.fillRect(0, 0, w, h);
    // 먼 산 두 겹
    for (const [k, y0, amp, col] of [[0, 0.47, 0.06, P.hill[0]], [1, 0.52, 0.045, P.hill[1]]] as [number, number, number, string][]) {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, R(0.95));
      for (let x = 0; x <= 1.001; x += 0.02) g.lineTo(R(x), R(y0 - amp * (0.6 + 0.4 * Math.sin(x * 7 + k * 2)) * (0.6 + 0.6 * Math.sin(x * 2.3 + k))));
      g.lineTo(w, R(0.95));
      g.fill();
    }
    // 섬 아래 구름 바다
    for (let i = 0; i < 7; i++) puff(g, R(-0.05 + i * 0.18), R(0.86 + hsh(i) * 0.03), R(0.24), R(0.07), '#ffffff', '#dbe9f7', i + 30);
    // ── 떠 있는 섬: 흙 단면 ──
    const cx = R(ISL.x), cy = R(ISL.y), rx = R(ISL.rx), ry = R(ISL.ry), th = R(0.075);
    g.fillStyle = lin(g, 0, cy, 0, cy + ry + th * 2.2, [0, '#b07a48'], [0.4, '#8a5a32'], [1, '#5e3a1e']);
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
    g.lineTo(cx - rx, cy);
    g.fill();
    g.beginPath();
    g.moveTo(cx - rx, cy);
    g.ellipse(cx, cy + th, rx * 0.98, ry, 0, Math.PI, 0, true);
    g.lineTo(cx + rx, cy);
    g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI, false);
    g.fill();
    // 흙 결 · 돌
    g.strokeStyle = 'rgba(70,40,20,.35)';
    g.lineWidth = 1.5;
    for (let k = 1; k < 4; k++) {
      g.beginPath();
      g.ellipse(cx, cy + th * (k / 4), rx * (0.99 - k * 0.004), ry, 0, 0.12, Math.PI - 0.12);
      g.stroke();
    }
    for (let i = 0; i < 16; i++) {
      const a = 0.15 + hsh(i + 50) * (Math.PI - 0.3), px = cx + Math.cos(a) * rx * 0.97, py = cy + Math.sin(a) * ry + th * (0.25 + hsh(i + 51) * 0.6);
      g.fillStyle = i % 3 ? '#a98a6a' : '#c9b08e';
      ell(g, px, py, R(0.012 + hsh(i) * 0.008), R(0.007));
      g.fill();
    }
    // 매달린 뿌리·풀
    g.strokeStyle = '#6a8a3a';
    g.lineWidth = 1.6;
    for (let i = 0; i < 12; i++) {
      const a = 0.25 + hsh(i + 70) * (Math.PI - 0.5), px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry + th * 0.9;
      g.beginPath();
      g.moveTo(px, py);
      g.quadraticCurveTo(px + R(0.006), py + R(0.02), px - R(0.004), py + R(0.03 + hsh(i) * 0.03));
      g.stroke();
    }
    // ── 풀밭 윗면 ──
    g.fillStyle = P.rim;
    ell(g, cx, cy + R(0.008), rx, ry);
    g.fill();
    g.fillStyle = lin(g, 0, cy - ry, 0, cy + ry, [0, P.grass[0]], [1, P.grass[1]]);
    ell(g, cx, cy, rx, ry);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.18)';
    ell(g, cx - rx * 0.2, cy - ry * 0.45, rx * 0.6, ry * 0.35);
    g.fill();
    // 길: 광장 → 성문 · 광장 → 앞쪽
    g.strokeStyle = sea === 'winter' ? '#d9c8b4' : '#e8cf9a';
    g.lineCap = 'round';
    g.lineWidth = R(0.035);
    g.beginPath();
    g.moveTo(R(0.5), R(0.585));
    g.lineTo(R(PLAZA.x), R(PLAZA.y));
    g.quadraticCurveTo(R(0.48), R(0.76), R(0.52), R(0.8));
    g.stroke();
    g.lineWidth = R(0.022);
    g.beginPath();
    g.moveTo(R(PLAZA.x - 0.1), R(PLAZA.y));
    g.quadraticCurveTo(R(0.3), R(0.7), R(BARN.x + 0.03), R(BARN.y - 0.01));
    g.moveTo(R(PLAZA.x + 0.1), R(PLAZA.y));
    g.quadraticCurveTo(R(0.66), R(0.67), R(0.74), R(0.655));
    g.stroke();
    // 광장 돌바닥
    g.fillStyle = sea === 'winter' ? '#e6e9f0' : '#f1dfc0';
    ell(g, R(PLAZA.x), R(PLAZA.y), R(PLAZA.rx), R(PLAZA.ry));
    g.fill();
    g.strokeStyle = 'rgba(150,110,70,.35)';
    g.lineWidth = 1;
    for (let k = 1; k <= 3; k++) {
      ell(g, R(PLAZA.x), R(PLAZA.y), R(PLAZA.rx * k / 3.4), R(PLAZA.ry * k / 3.4));
      g.stroke();
    }
    // 밭 흙
    for (const [fx2, fy] of FIELDS) {
      g.fillStyle = sea === 'winter' ? '#cfc2b4' : '#a8784a';
      g.beginPath();
      g.moveTo(R(fx2 + 0.02), R(fy));
      g.lineTo(R(fx2 + 0.13), R(fy));
      g.lineTo(R(fx2 + 0.115), R(fy + 0.05));
      g.lineTo(R(fx2 + 0.005), R(fy + 0.05));
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(90,55,25,.35)';
      g.stroke();
    }
    // 풀포기 · 꽃 (가장자리)
    for (let i = 0; i < 40; i++) {
      const a = hsh(i + 90) * TAU, rad = 0.55 + hsh(i + 91) * 0.42, px = cx + Math.cos(a) * rx * rad, py = cy + Math.sin(a) * ry * rad;
      if (Math.abs(px - R(PLAZA.x)) < R(0.15) && Math.abs(py - R(PLAZA.y)) < R(0.06)) continue;
      g.fillStyle = sea === 'winter' ? '#c6d6ea' : P.rim;
      ell(g, px, py, R(0.008), R(0.004));
      g.fill();
      if (i % 3 === 0 && sea !== 'winter') {
        g.fillStyle = ['#ffffff', '#ffe066', '#ff9ec0', '#b9a0ff'][i % 4];
        ell(g, px + R(0.004), py - R(0.004), R(0.004), R(0.004));
        g.fill();
      }
    }
  });
  BGC.set(key, b);
  return b;
}

// ── 막대 아이콘 (직접 그림) ──
function drawIcon(ctx: C2, i: number, x: number, y: number, r: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#ffffff';
  ell(ctx, 0, 0, r, r);
  ctx.fill();
  ctx.strokeStyle = BAR_COL[i];
  ctx.lineWidth = Math.max(1.5, r * 0.16);
  ctx.stroke();
  const q = r * 0.7;
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.strokeStyle = BAR_DARK[i];
  if (i === 0) {
    // 빵 덩이
    ctx.fillStyle = lin(ctx, 0, -q * 0.6, 0, q * 0.6, [0, '#ffc874'], [1, '#d9822f']);
    ell(ctx, 0, q * 0.08, q * 0.95, q * 0.62);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#fff1c8';
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.lineCap = 'round';
    for (const dx of [-0.4, 0, 0.4]) {
      ctx.beginPath();
      ctx.moveTo(q * (dx - 0.15), -q * 0.05);
      ctx.lineTo(q * (dx + 0.15), -q * 0.35);
      ctx.stroke();
    }
  } else if (i === 1) {
    // 웃는 얼굴
    ctx.fillStyle = lin(ctx, 0, -q, 0, q, [0, '#ffd2e2'], [1, '#ff8fb6']);
    ell(ctx, 0, 0, q * 0.9, q * 0.9);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = BAR_DARK[1];
    ctx.lineWidth = Math.max(1.2, r * 0.11);
    ctx.lineCap = 'round';
    for (const dx of [-0.35, 0.35]) {
      ctx.beginPath();
      ctx.arc(q * dx, -q * 0.12, q * 0.16, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, q * 0.08, q * 0.42, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (i === 2) {
    // 금화
    ctx.fillStyle = lin(ctx, -q, -q, q, q, [0, '#fff3a0'], [0.5, '#ffd23a'], [1, '#d99a00']);
    ell(ctx, 0, 0, q * 0.9, q * 0.9);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(150,100,0,.7)';
    ell(ctx, 0, 0, q * 0.6, q * 0.6);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ell(ctx, -q * 0.32, -q * 0.32, q * 0.16, q * 0.1, -0.7);
    ctx.fill();
  } else {
    // 방패
    ctx.fillStyle = lin(ctx, 0, -q, 0, q, [0, '#8fb8ff'], [1, '#2f6fe0']);
    ctx.beginPath();
    ctx.moveTo(0, -q * 0.95);
    ctx.quadraticCurveTo(q * 0.5, -q * 0.7, q * 0.85, -q * 0.75);
    ctx.quadraticCurveTo(q * 0.9, q * 0.35, 0, q);
    ctx.quadraticCurveTo(-q * 0.9, q * 0.35, -q * 0.85, -q * 0.75);
    ctx.quadraticCurveTo(-q * 0.5, -q * 0.7, 0, -q * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    rr(ctx, -q * 0.12, -q * 0.6, q * 0.24, q * 1.25, q * 0.08);
    ctx.fill();
    rr(ctx, -q * 0.5, -q * 0.22, q * 1.0, q * 0.24, q * 0.08);
    ctx.fill();
  }
  ctx.restore();
}

/** 결과 예고 칩: 아이콘 + 오르면 초록 ▲, 내리면 빨간 ▼ (칸 수만큼) */
function chip(ctx: C2, i: number, n: number, x: number, y: number, r: number, danger: boolean, t: number) {
  drawIcon(ctx, i, x, y, r);
  const up = n > 0, m = Math.min(4, Math.abs(n));
  for (let j = 0; j < m; j++) {
    const ax = x + r * 1.05 + r * 0.42 + j * r * 0.62, ay = y + (up ? -1 : 1) * (j % 2 ? r * 0.12 : -r * 0.12) * 0;
    tri(ctx, ax, ay, r * 0.42, up);
    ctx.fillStyle = danger ? (Math.floor(t / 8) % 2 ? '#ff2a3a' : '#ffffff') : up ? '#2fbf4a' : '#ff4a5a';
    ctx.fill();
    ctx.strokeStyle = up ? '#14702a' : '#8a1a24';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  return r * 1.05 + r * 0.42 + m * r * 0.62 + r * 0.25;
}

// ── 사람들 ──
type Mood = 'idle' | 'happy' | 'sad' | 'wow' | 'dizzy';
function faceAt(ctx: C2, u: number, hy: number, hr: number, mood: Mood, t: number, skin = '#ffdcbc') {
  ctx.fillStyle = lin(ctx, 0, hy - hr, 0, hy + hr, [0, skin], [1, '#f6bf98']);
  ell(ctx, 0, hy, hr, hr * 0.96);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.2, u * 1.6);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,140,.45)';
  for (const sd of [-1, 1]) {
    ell(ctx, sd * hr * 0.55, hy + hr * 0.25, hr * 0.2, hr * 0.12);
    ctx.fill();
  }
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.2, u * 1.8);
  const blink = Math.floor(t / 7) % 31 === 0;
  for (const sd of [-1, 1]) {
    const ex = sd * hr * 0.36, ey = hy - hr * 0.05;
    if (mood === 'happy') {
      ctx.beginPath();
      ctx.arc(ex, ey + hr * 0.06, hr * 0.14, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (mood === 'dizzy') {
      ctx.beginPath();
      ctx.moveTo(ex - hr * 0.11, ey - hr * 0.11);
      ctx.lineTo(ex + hr * 0.11, ey + hr * 0.11);
      ctx.moveTo(ex + hr * 0.11, ey - hr * 0.11);
      ctx.lineTo(ex - hr * 0.11, ey + hr * 0.11);
      ctx.stroke();
    } else if (mood === 'sad') {
      ctx.beginPath();
      ctx.moveTo(ex - hr * 0.13, ey - hr * 0.02 - sd * hr * 0.06);
      ctx.lineTo(ex + hr * 0.13, ey - hr * 0.02 + sd * hr * 0.06);
      ctx.stroke();
      ell(ctx, ex, ey + hr * 0.1, hr * 0.06, hr * 0.08);
      ctx.fill();
    } else if (blink && mood === 'idle') {
      ctx.beginPath();
      ctx.moveTo(ex - hr * 0.1, ey);
      ctx.lineTo(ex + hr * 0.1, ey);
      ctx.stroke();
    } else {
      const big = mood === 'wow' ? 1.5 : 1;
      ctx.fillStyle = INK;
      ell(ctx, ex, ey, hr * 0.09 * big, hr * 0.12 * big);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, ex + hr * 0.03, ey - hr * 0.04, hr * 0.035 * big, hr * 0.04 * big);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#b5303f';
  ctx.strokeStyle = INK;
  const my = hy + hr * 0.38;
  if (mood === 'happy') {
    ctx.beginPath();
    ctx.moveTo(-hr * 0.26, my - hr * 0.04);
    ctx.quadraticCurveTo(0, my + hr * 0.36, hr * 0.26, my - hr * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (mood === 'wow' || mood === 'dizzy') {
    ell(ctx, 0, my + hr * 0.04, hr * 0.1, hr * 0.13);
    ctx.fill();
    ctx.stroke();
  } else if (mood === 'sad') {
    ctx.beginPath();
    ctx.arc(0, my + hr * 0.14, hr * 0.16, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, my - hr * 0.06, hr * 0.14, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
  }
}
function robe(ctx: C2, u: number, top: string, bot: string, wide = 1) {
  ctx.fillStyle = lin(ctx, 0, -44 * u, 0, 0, [0, top], [1, bot]);
  ctx.beginPath();
  ctx.moveTo(-19 * u * wide, 0);
  ctx.lineTo(-13 * u, -36 * u);
  ctx.quadraticCurveTo(0, -46 * u, 13 * u, -36 * u);
  ctx.lineTo(19 * u * wide, 0);
  ctx.quadraticCurveTo(0, 5 * u, -19 * u * wide, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.2, u * 1.6);
  ctx.stroke();
}
function feet(ctx: C2, u: number, col: string, step: number) {
  ctx.fillStyle = col;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, u * 1.2);
  for (const sd of [-1, 1]) {
    ell(ctx, sd * 8 * u + (sd > 0 ? step : -step) * u, 1 * u, 7 * u, 4 * u);
    ctx.fill();
    ctx.stroke();
  }
}
function hand(ctx: C2, u: number, x: number, y: number, col = '#ffdcbc') {
  ctx.fillStyle = col;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, u * 1.2);
  ell(ctx, x, y, 5 * u, 5 * u);
  ctx.fill();
  ctx.stroke();
}

/** 손님 (발끝 x,y · 키 H px) */
function drawGuest(ctx: C2, who: Who, x: number, y: number, H: number, mood: Mood, t: number, flip = 1) {
  const u = H / 100, step = Math.sin(t * 0.3) * 0;
  ctx.save();
  ctx.translate(x, y);
  // 바닥 그림자
  ctx.fillStyle = 'rgba(80,50,20,.25)';
  ell(ctx, 0, 2 * u, 24 * u, 6 * u);
  ctx.fill();
  ctx.scale(flip, 1);
  if (who === 'dragon') {
    drawDragon(ctx, u * 1.1, mood, t);
    ctx.restore();
    return;
  }
  const hy = -64 * u, hr = 24 * u;
  if (who === 'farmer') {
    feet(ctx, u, '#7a4a22', step);
    robe(ctx, u, '#ffffff', '#f2e6d0');
    // 멜빵 바지
    ctx.fillStyle = lin(ctx, 0, -26 * u, 0, 0, [0, '#5b95e6'], [1, '#3a6cc0']);
    ctx.beginPath();
    ctx.moveTo(-17 * u, 0);
    ctx.lineTo(-12 * u, -26 * u);
    ctx.lineTo(12 * u, -26 * u);
    ctx.lineTo(17 * u, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ctx.strokeStyle = '#3a6cc0';
    ctx.lineWidth = 3 * u;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * 9 * u, -26 * u);
      ctx.lineTo(sd * 8 * u, -40 * u);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffd23a';
    for (const sd of [-1, 1]) (ell(ctx, sd * 9 * u, -26 * u, 2.2 * u, 2.2 * u), ctx.fill());
    // 밀 다발
    ctx.save();
    ctx.translate(-20 * u, -26 * u);
    ctx.rotate(-0.3);
    ctx.strokeStyle = '#c9952e';
    ctx.lineWidth = 2 * u;
    for (const a of [-0.25, 0, 0.25]) {
      ctx.beginPath();
      ctx.moveTo(0, 10 * u);
      ctx.lineTo(Math.sin(a) * 26 * u, -24 * u);
      ctx.stroke();
      ctx.fillStyle = '#f2c14e';
      ell(ctx, Math.sin(a) * 27 * u, -26 * u, 3.4 * u, 7 * u, a);
      ctx.fill();
    }
    ctx.restore();
    hand(ctx, u, -18 * u, -22 * u);
    hand(ctx, u, 17 * u, -20 * u);
    faceAt(ctx, u, hy, hr, mood, t);
    // 콧수염
    ctx.fillStyle = '#8a5a2a';
    for (const sd of [-1, 1]) (ell(ctx, sd * 6 * u, hy + 7 * u, 7 * u, 3.2 * u, sd * 0.25), ctx.fill());
    // 밀짚모자
    ctx.fillStyle = lin(ctx, 0, hy - hr, 0, hy - hr * 0.3, [0, '#ffe58a'], [1, '#e8b84a']);
    ell(ctx, 0, hy - hr * 0.45, hr * 1.55, hr * 0.38);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(1.2, u * 1.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, hy - hr * 0.6, hr * 0.78, hr * 0.62, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e2453a';
    rr(ctx, -hr * 0.78, hy - hr * 0.78, hr * 1.56, hr * 0.2, 2);
    ctx.fill();
  } else if (who === 'knight') {
    feet(ctx, u, '#6b7280', step);
    robe(ctx, u, '#5d8fe8', '#2f5fc0');
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath();
    ctx.moveTo(0, -30 * u);
    ctx.lineTo(7 * u, -24 * u);
    ctx.lineTo(0, -12 * u);
    ctx.lineTo(-7 * u, -24 * u);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.stroke();
    // 칼
    ctx.save();
    ctx.translate(20 * u, -18 * u);
    ctx.rotate(0.25);
    ctx.fillStyle = '#e8eef6';
    rr(ctx, -2 * u, -30 * u, 4 * u, 30 * u, u);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b8862a';
    rr(ctx, -6 * u, -2 * u, 12 * u, 3 * u, u);
    ctx.fill();
    ctx.restore();
    hand(ctx, u, -17 * u, -20 * u, '#cfd6e0');
    hand(ctx, u, 18 * u, -19 * u, '#cfd6e0');
    faceAt(ctx, u, hy + 2 * u, hr * 0.9, mood, t);
    // 투구
    ctx.fillStyle = lin(ctx, -hr, 0, hr, 0, [0, '#f4f7fb'], [0.6, '#c8d0dc'], [1, '#9aa6b8']);
    ctx.beginPath();
    ctx.arc(0, hy, hr * 1.05, Math.PI * 1.02, Math.PI * 1.98);
    ctx.lineTo(hr * 1.05, hy + hr * 0.15);
    ctx.lineTo(hr * 0.75, hy + hr * 0.15);
    ctx.lineTo(hr * 0.75, hy - hr * 0.25);
    ctx.lineTo(-hr * 0.75, hy - hr * 0.25);
    ctx.lineTo(-hr * 0.75, hy + hr * 0.15);
    ctx.lineTo(-hr * 1.05, hy + hr * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.stroke();
    // 깃털
    ctx.fillStyle = '#ff4a5a';
    ctx.beginPath();
    ctx.moveTo(0, hy - hr * 1.0);
    ctx.quadraticCurveTo(hr * 0.9, hy - hr * 1.9, hr * 1.25, hy - hr * 1.0 + Math.sin(t * 0.15) * 2);
    ctx.quadraticCurveTo(hr * 0.5, hy - hr * 1.2, 0, hy - hr * 1.0);
    ctx.fill();
    ctx.stroke();
  } else if (who === 'merchant') {
    // 등짐
    ctx.fillStyle = lin(ctx, 0, -60 * u, 0, -10 * u, [0, '#c98a4a'], [1, '#8a5528']);
    rr(ctx, -27 * u, -52 * u, 22 * u, 40 * u, 5 * u);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(1.2, u * 1.6);
    ctx.stroke();
    for (const [c, dy] of [['#ff7aa8', -58], ['#6fd3c4', -50]] as [string, number][]) {
      ctx.fillStyle = c;
      rr(ctx, -30 * u, dy * u, 28 * u, 8 * u, 4 * u);
      ctx.fill();
      ctx.stroke();
    }
    feet(ctx, u, '#6a3a1a', step);
    robe(ctx, u, '#4fc08d', '#2a8a62', 1.1);
    ctx.fillStyle = '#ffd23a';
    rr(ctx, -15 * u, -22 * u, 30 * u, 4 * u, 2 * u);
    ctx.fill();
    // 동전 주머니
    ctx.fillStyle = '#b07a3a';
    ell(ctx, 14 * u, -12 * u, 6 * u, 7 * u);
    ctx.fill();
    ctx.stroke();
    hand(ctx, u, -16 * u, -22 * u);
    hand(ctx, u, 18 * u, -24 * u);
    faceAt(ctx, u, hy, hr, mood, t);
    // 꼬부랑 콧수염
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4 * u;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, hy + 6 * u);
      ctx.quadraticCurveTo(sd * 10 * u, hy + 10 * u, sd * 13 * u, hy + 4 * u);
      ctx.stroke();
    }
    // 터번 + 깃털
    ctx.fillStyle = lin(ctx, 0, hy - hr * 1.3, 0, hy - hr * 0.3, [0, '#b48cff'], [1, '#7a52d8']);
    ell(ctx, 0, hy - hr * 0.62, hr * 1.02, hr * 0.62);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.lineWidth = 2 * u;
    for (const k of [0.3, 0.6]) {
      ctx.beginPath();
      ctx.ellipse(0, hy - hr * 0.62, hr * 0.98, hr * 0.6 * k, 0, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    }
    ctx.fillStyle = '#ff4a7a';
    ell(ctx, 0, hy - hr * 0.95, 4 * u, 4 * u);
    ctx.fill();
    ctx.fillStyle = '#ffe14a';
    ctx.beginPath();
    ctx.moveTo(0, hy - hr * 1.05);
    ctx.quadraticCurveTo(hr * 0.5, hy - hr * 1.9, hr * 0.9, hy - hr * 1.7 + Math.sin(t * 0.12) * 2);
    ctx.quadraticCurveTo(hr * 0.4, hy - hr * 1.4, 0, hy - hr * 1.05);
    ctx.fill();
  } else if (who === 'wizard') {
    feet(ctx, u, '#3a3a6a', step);
    robe(ctx, u, '#6a7cf0', '#3a46b8', 1.15);
    ctx.fillStyle = '#ffe14a';
    for (const [sx, sy] of [[-8, -12], [6, -28], [10, -8]]) (starPath(ctx, sx * u, sy * u, 3.4 * u), ctx.fill());
    // 지팡이
    ctx.strokeStyle = '#8a5a2a';
    ctx.lineWidth = 3.4 * u;
    ctx.beginPath();
    ctx.moveTo(24 * u, 2 * u);
    ctx.lineTo(22 * u, -78 * u);
    ctx.stroke();
    const glow = 0.6 + 0.4 * Math.sin(t * 0.15);
    ctx.fillStyle = radg(ctx, 22 * u, -82 * u, 0, 12 * u, [0, `rgba(255,255,255,${glow})`], [0.4, 'rgba(140,220,255,.8)'], [1, 'rgba(140,220,255,0)']);
    ell(ctx, 22 * u, -82 * u, 12 * u, 12 * u);
    ctx.fill();
    ctx.fillStyle = '#8fe0ff';
    ell(ctx, 22 * u, -82 * u, 5 * u, 5 * u);
    ctx.fill();
    hand(ctx, u, 21 * u, -40 * u);
    hand(ctx, u, -17 * u, -20 * u);
    faceAt(ctx, u, hy, hr * 0.95, mood, t);
    // 긴 수염
    ctx.fillStyle = lin(ctx, 0, hy, 0, hy + hr * 2, [0, '#ffffff'], [1, '#dfe6f0']);
    ctx.beginPath();
    ctx.moveTo(-hr * 0.7, hy + hr * 0.25);
    ctx.quadraticCurveTo(-hr * 0.6, hy + hr * 1.6, 0, hy + hr * 2.0);
    ctx.quadraticCurveTo(hr * 0.6, hy + hr * 1.6, hr * 0.7, hy + hr * 0.25);
    ctx.quadraticCurveTo(0, hy + hr * 0.75, -hr * 0.7, hy + hr * 0.25);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(1.2, u * 1.4);
    ctx.stroke();
    // 뾰족 모자
    ctx.fillStyle = lin(ctx, 0, hy - hr * 3, 0, hy - hr * 0.4, [0, '#8a9cff'], [1, '#3a46b8']);
    ctx.beginPath();
    ctx.moveTo(-hr * 1.2, hy - hr * 0.42);
    ctx.quadraticCurveTo(-hr * 0.2, hy - hr * 1.4, hr * 0.5, hy - hr * 2.6);
    ctx.quadraticCurveTo(hr * 0.2, hy - hr * 1.5, hr * 1.2, hy - hr * 0.42);
    ctx.quadraticCurveTo(0, hy - hr * 0.1, -hr * 1.2, hy - hr * 0.42);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffe14a';
    for (const [sx, sy, sr] of [[-0.3, -1.0, 0.16], [0.25, -1.6, 0.12], [0.5, -0.7, 0.1]]) (starPath(ctx, sx * hr, hy + sy * hr, sr * hr), ctx.fill());
  } else if (who === 'jester') {
    feet(ctx, u, '#c43a4a', step);
    robe(ctx, u, '#ff6a6a', '#e0404e');
    // 마름모 무늬
    ctx.fillStyle = '#ffd23a';
    for (const [dx, dy] of [[-7, -26], [7, -14], [-6, -6], [8, -32]]) {
      ctx.beginPath();
      ctx.moveTo(dx * u, (dy - 5) * u);
      ctx.lineTo((dx + 4) * u, dy * u);
      ctx.lineTo(dx * u, (dy + 5) * u);
      ctx.lineTo((dx - 4) * u, dy * u);
      ctx.closePath();
      ctx.fill();
    }
    // 류트
    ctx.save();
    ctx.translate(-14 * u, -18 * u);
    ctx.rotate(-0.5);
    ctx.fillStyle = lin(ctx, -10 * u, 0, 10 * u, 0, [0, '#e8a050'], [1, '#a8642a']);
    ell(ctx, 0, 0, 10 * u, 12 * u);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ctx.fillStyle = '#5a3a1a';
    ell(ctx, 0, -2 * u, 3 * u, 3 * u);
    ctx.fill();
    ctx.fillStyle = '#8a5a2a';
    rr(ctx, -2 * u, -30 * u, 4 * u, 20 * u, u);
    ctx.fill();
    ctx.restore();
    hand(ctx, u, -10 * u, -18 * u);
    hand(ctx, u, 18 * u, -22 * u);
    faceAt(ctx, u, hy, hr, mood, t);
    // 두 갈래 모자 + 방울
    for (const [sd, col] of [[-1, '#ff5a6a'], [1, '#ffd23a']] as [number, string][]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, hy - hr * 0.55);
      ctx.quadraticCurveTo(sd * hr * 1.2, hy - hr * 2.0, sd * hr * 1.6, hy - hr * 0.9 + Math.sin(t * 0.2 + sd) * 2);
      ctx.quadraticCurveTo(sd * hr * 0.9, hy - hr * 0.9, sd * hr * 0.95, hy - hr * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.stroke();
      ctx.fillStyle = '#ffe14a';
      ell(ctx, sd * hr * 1.6, hy - hr * 0.85 + Math.sin(t * 0.2 + sd) * 2, 4 * u, 4 * u);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#5ab8ff';
    rr(ctx, -hr, hy - hr * 0.62, hr * 2, hr * 0.28, 3);
    ctx.fill();
    ctx.stroke();
  } else if (who === 'baker') {
    feet(ctx, u, '#7a4a3a', step);
    robe(ctx, u, '#ff9ec0', '#e86a98', 1.1);
    ctx.fillStyle = '#ffffff';
    rr(ctx, -12 * u, -32 * u, 24 * u, 30 * u, 5 * u);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.stroke();
    // 파이
    ctx.fillStyle = lin(ctx, 0, -30 * u, 0, -18 * u, [0, '#ffc874'], [1, '#c87a30']);
    ell(ctx, 0, -22 * u, 16 * u, 6 * u);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#fff1c8';
    ctx.lineWidth = 1.4 * u;
    for (const dx of [-8, 0, 8]) {
      ctx.beginPath();
      ctx.moveTo((dx - 3) * u, -22 * u);
      ctx.lineTo((dx + 3) * u, -25 * u);
      ctx.stroke();
    }
    hand(ctx, u, -15 * u, -20 * u);
    hand(ctx, u, 15 * u, -20 * u);
    faceAt(ctx, u, hy, hr, mood, t);
    // 둥근 안경 + 흰머리
    ctx.fillStyle = '#e8e8f0';
    for (const sd of [-1, 1]) (ell(ctx, sd * hr * 0.92, hy - hr * 0.1, hr * 0.28, hr * 0.42), ctx.fill());
    ctx.strokeStyle = '#8a5a2a';
    ctx.lineWidth = 1.4 * u;
    for (const sd of [-1, 1]) (ell(ctx, sd * hr * 0.36, hy - hr * 0.05, hr * 0.22, hr * 0.2), ctx.stroke());
    // 요리사 모자
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(1.2, u * 1.6);
    rr(ctx, -hr * 0.75, hy - hr * 1.05, hr * 1.5, hr * 0.42, 3);
    ctx.fill();
    ctx.stroke();
    for (const [dx, r0] of [[-0.45, 0.42], [0.45, 0.42], [0, 0.55]]) (ell(ctx, dx * hr, hy - hr * 1.35, r0 * hr, r0 * hr * 0.85), ctx.fill(), ctx.stroke());
    rr(ctx, -hr * 0.74, hy - hr * 1.12, hr * 1.48, hr * 0.32, 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawDragon(ctx: C2, u: number, mood: Mood, t: number) {
  const fl = Math.sin(t * 0.25);
  // 꼬리
  ctx.strokeStyle = OUT;
  ctx.fillStyle = '#5fcf7a';
  ctx.lineWidth = Math.max(1.2, u * 1.6);
  ctx.beginPath();
  ctx.moveTo(-14 * u, -12 * u);
  ctx.quadraticCurveTo(-40 * u, -6 * u, -38 * u, -30 * u + Math.sin(t * 0.1) * 3);
  ctx.quadraticCurveTo(-32 * u, -14 * u, -12 * u, -22 * u);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.moveTo(-38 * u, -30 * u);
  ctx.lineTo(-44 * u, -38 * u);
  ctx.lineTo(-34 * u, -36 * u);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 날개
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * 14 * u, -44 * u);
    ctx.rotate(sd * (0.3 + fl * 0.35));
    ctx.fillStyle = lin(ctx, 0, -20 * u, 0, 10 * u, [0, '#b28cff'], [1, '#7a52d8']);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(sd * 18 * u, -26 * u, sd * 34 * u, -18 * u);
    ctx.quadraticCurveTo(sd * 26 * u, -10 * u, sd * 28 * u, 0);
    ctx.quadraticCurveTo(sd * 18 * u, -4 * u, sd * 16 * u, 6 * u);
    ctx.quadraticCurveTo(sd * 8 * u, 0, 0, 6 * u);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // 몸
  ctx.fillStyle = lin(ctx, 0, -60 * u, 0, 0, [0, '#8af0a0'], [1, '#3fb062']);
  ell(ctx, 0, -24 * u, 22 * u, 24 * u);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff1c0';
  ell(ctx, 0, -18 * u, 13 * u, 16 * u);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,150,60,.5)';
  for (const k of [-24, -16, -8]) {
    ctx.beginPath();
    ctx.moveTo(-10 * u, k * u);
    ctx.quadraticCurveTo(0, (k + 3) * u, 10 * u, k * u);
    ctx.stroke();
  }
  ctx.strokeStyle = OUT;
  ctx.fillStyle = '#4fbf6a';
  for (const sd of [-1, 1]) (ell(ctx, sd * 12 * u, 0, 8 * u, 5 * u), ctx.fill(), ctx.stroke());
  // 머리
  const hy = -62 * u, hr = 22 * u;
  ctx.fillStyle = lin(ctx, 0, hy - hr, 0, hy + hr, [0, '#9af5ae'], [1, '#4fc06e']);
  ell(ctx, 0, hy, hr * 1.1, hr);
  ctx.fill();
  ctx.stroke();
  // 뿔
  ctx.fillStyle = '#fff1c0';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * hr * 0.4, hy - hr * 0.85);
    ctx.lineTo(sd * hr * 0.7, hy - hr * 1.45);
    ctx.lineTo(sd * hr * 0.85, hy - hr * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // 주둥이
  ctx.fillStyle = '#b9f7c6';
  ell(ctx, 0, hy + hr * 0.45, hr * 0.62, hr * 0.38);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  for (const sd of [-1, 1]) (ell(ctx, sd * hr * 0.2, hy + hr * 0.38, hr * 0.06, hr * 0.05), ctx.fill());
  // 눈
  for (const sd of [-1, 1]) {
    const ex = sd * hr * 0.45, ey = hy - hr * 0.15;
    if (mood === 'happy') {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2 * u;
      ctx.beginPath();
      ctx.arc(ex, ey + hr * 0.05, hr * 0.17, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ell(ctx, ex, ey, hr * 0.22, hr * 0.26);
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.2 * u;
      ctx.stroke();
      ctx.fillStyle = INK;
      ell(ctx, ex + sd * hr * 0.03, ey + hr * 0.04, hr * 0.12, hr * 0.15);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, ex + hr * 0.06, ey - hr * 0.04, hr * 0.05, hr * 0.05);
      ctx.fill();
    }
  }
  if (mood === 'sad') {
    ctx.fillStyle = '#7fd0ff';
    ell(ctx, hr * 0.62, hy + hr * 0.2 + ((t * 0.6) % 10) * u, hr * 0.09, hr * 0.13);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,120,140,.5)';
  for (const sd of [-1, 1]) (ell(ctx, sd * hr * 0.78, hy + hr * 0.25, hr * 0.15, hr * 0.09), ctx.fill());
  // 송곳니 웃음
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1 * u;
  ctx.beginPath();
  ctx.moveTo(-hr * 0.3, hy + hr * 0.62);
  ctx.lineTo(-hr * 0.22, hy + hr * 0.8);
  ctx.lineTo(-hr * 0.14, hy + hr * 0.64);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** 꼬마 왕 (옥좌 포함, 발끝 x,y · 키 H) */
function drawKing(ctx: C2, x: number, y: number, H: number, mood: Mood, t: number, crownOff: number, hop: number) {
  const u = H / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(80,50,20,.28)';
  ell(ctx, 0, 2 * u, 34 * u, 8 * u);
  ctx.fill();
  // 옥좌
  ctx.fillStyle = lin(ctx, 0, -95 * u, 0, 0, [0, '#ffd86a'], [1, '#c89020']);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.2, u * 1.6);
  ctx.beginPath();
  ctx.moveTo(-28 * u, 0);
  ctx.lineTo(-28 * u, -70 * u);
  ctx.quadraticCurveTo(-28 * u, -96 * u, 0, -100 * u);
  ctx.quadraticCurveTo(28 * u, -96 * u, 28 * u, -70 * u);
  ctx.lineTo(28 * u, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = lin(ctx, 0, -90 * u, 0, -20 * u, [0, '#e2454a'], [1, '#a8202a']);
  rr(ctx, -21 * u, -88 * u, 42 * u, 70 * u, 14 * u);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ell(ctx, 0, -101 * u, 6 * u, 6 * u);
  ctx.fill();
  ctx.stroke();
  ctx.translate(0, -12 * u - hop * u);
  // 망토 + 몸
  ctx.fillStyle = lin(ctx, 0, -50 * u, 0, 10 * u, [0, '#ff5a6a'], [1, '#c4283a']);
  ctx.beginPath();
  ctx.moveTo(-24 * u, 8 * u);
  ctx.lineTo(-16 * u, -38 * u);
  ctx.quadraticCurveTo(0, -48 * u, 16 * u, -38 * u);
  ctx.lineTo(24 * u, 8 * u);
  ctx.quadraticCurveTo(0, 14 * u, -24 * u, 8 * u);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 흰 털 깃 (점박이)
  ctx.fillStyle = '#ffffff';
  rr(ctx, -18 * u, -42 * u, 36 * u, 10 * u, 5 * u);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  for (const dx of [-10, 0, 10]) (ell(ctx, dx * u, -37 * u, 1.4 * u, 2 * u), ctx.fill());
  ctx.fillStyle = '#ffffff';
  rr(ctx, -4 * u, -32 * u, 8 * u, 40 * u, 3 * u);
  ctx.fill();
  // 홀
  ctx.save();
  ctx.translate(20 * u, -18 * u);
  ctx.rotate(0.3 + (mood === 'happy' ? Math.sin(t * 0.3) * 0.3 : 0));
  ctx.fillStyle = '#c89020';
  rr(ctx, -2 * u, -30 * u, 4 * u, 34 * u, 2 * u);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff5aa0';
  ell(ctx, 0, -33 * u, 5 * u, 5 * u);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  hand(ctx, u, 19 * u, -16 * u);
  hand(ctx, u, -19 * u, -14 * u);
  // 얼굴 (통통)
  const hy = -64 * u, hr = 25 * u;
  faceAt(ctx, u, hy, hr, mood, t);
  // 흰 콧수염
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, u * 1.2);
  for (const sd of [-1, 1]) (ell(ctx, sd * 7 * u, hy + 7 * u, 8 * u, 3.6 * u, sd * 0.3), ctx.fill(), ctx.stroke());
  // 왕관 (떨어지면 위로 날아감)
  ctx.save();
  const cy = hy - hr * 0.78 - crownOff * 60 * u;
  ctx.translate(crownOff * 30 * u, cy);
  ctx.rotate(crownOff * 4);
  ctx.fillStyle = lin(ctx, 0, -18 * u, 0, 4 * u, [0, '#fff3a0'], [1, '#e8a810']);
  ctx.beginPath();
  ctx.moveTo(-18 * u, 4 * u);
  ctx.lineTo(-20 * u, -12 * u);
  ctx.lineTo(-10 * u, -4 * u);
  ctx.lineTo(0, -18 * u);
  ctx.lineTo(10 * u, -4 * u);
  ctx.lineTo(20 * u, -12 * u);
  ctx.lineTo(18 * u, 4 * u);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff4a6a';
  ell(ctx, 0, -2 * u, 3 * u, 3 * u);
  ctx.fill();
  ctx.fillStyle = '#4ab8ff';
  for (const sd of [-1, 1]) (ell(ctx, sd * 11 * u, 0, 2.2 * u, 2.2 * u), ctx.fill());
  ctx.restore();
  if (mood === 'dizzy') {
    ctx.fillStyle = '#ffe14a';
    for (let k = 0; k < 3; k++) {
      const a = t * 0.15 + (k * TAU) / 3;
      starPath(ctx, Math.cos(a) * 20 * u, hy - hr * 1.0 + Math.sin(a) * 6 * u, 4.5 * u);
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** 작은 주민 (발끝) */
function villager(ctx: C2, x: number, y: number, s2: number, col: string, mood: number, jump: number, arms: number, seed: number, hat = -1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(60,40,20,.25)';
  ell(ctx, 0, 0, s2 * 0.55, s2 * 0.18);
  ctx.fill();
  ctx.translate(0, -jump);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(0.8, s2 * 0.08);
  // 팔
  if (arms > 0) {
    ctx.strokeStyle = col;
    ctx.lineWidth = s2 * 0.18;
    ctx.lineCap = 'round';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * s2 * 0.25, -s2 * 0.75);
      ctx.lineTo(sd * s2 * (0.45 + 0.1 * arms), -s2 * (0.95 + 0.4 * arms));
      ctx.stroke();
    }
    ctx.strokeStyle = OUT;
    ctx.lineWidth = Math.max(0.8, s2 * 0.08);
  }
  ctx.fillStyle = col;
  rr(ctx, -s2 * 0.3, -s2 * 0.95, s2 * 0.6, s2 * 0.95, s2 * 0.25);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffdcbc';
  ell(ctx, 0, -s2 * 1.25, s2 * 0.34, s2 * 0.34);
  ctx.fill();
  ctx.stroke();
  const hc = hat >= 0 ? hat : Math.floor(hsh(seed) * 4);
  ctx.fillStyle = ['#8a5a2a', '#ffd23a', '#3a2a1a', '#ff8a5a'][hc];
  ctx.beginPath();
  ctx.arc(0, -s2 * 1.3, s2 * 0.35, Math.PI, 0);
  ctx.fill();
  if (s2 > 7) {
    ctx.fillStyle = INK;
    for (const sd of [-1, 1]) (ell(ctx, sd * s2 * 0.12, -s2 * 1.22, s2 * 0.05, s2 * 0.06), ctx.fill());
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(0.8, s2 * 0.06);
    ctx.beginPath();
    if (mood > 0) ctx.arc(0, -s2 * 1.14, s2 * 0.1, 0.15 * Math.PI, 0.85 * Math.PI);
    else if (mood < 0) ctx.arc(0, -s2 * 1.04, s2 * 0.1, 1.15 * Math.PI, 1.85 * Math.PI);
    else (ctx.moveTo(-s2 * 0.08, -s2 * 1.1), ctx.lineTo(s2 * 0.08, -s2 * 1.1));
    ctx.stroke();
  }
  ctx.restore();
}
function soldier(ctx: C2, x: number, y: number, s2: number, t: number, k: number, enemy = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(0.8, s2 * 0.08);
  ctx.strokeStyle = '#8a5a2a';
  ctx.lineWidth = Math.max(1, s2 * 0.1);
  ctx.beginPath();
  ctx.moveTo(s2 * 0.4, -s2 * 0.2);
  ctx.lineTo(s2 * 0.4, -s2 * 1.9);
  ctx.stroke();
  ctx.fillStyle = '#e8eef6';
  ctx.beginPath();
  ctx.moveTo(s2 * 0.4, -s2 * 2.15);
  ctx.lineTo(s2 * 0.52, -s2 * 1.85);
  ctx.lineTo(s2 * 0.28, -s2 * 1.85);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(0.8, s2 * 0.08);
  ctx.fillStyle = enemy ? '#d8404a' : '#4f8ef7';
  rr(ctx, -s2 * 0.3, -s2 * 0.95, s2 * 0.6, s2 * 0.95, s2 * 0.2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffdcbc';
  ell(ctx, 0, -s2 * 1.25, s2 * 0.32, s2 * 0.32);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = enemy ? '#5a5a66' : '#d6dde8';
  ctx.beginPath();
  ctx.arc(0, -s2 * 1.32, s2 * 0.36, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (!enemy) {
    ctx.fillStyle = '#ff4a5a';
    ell(ctx, 0, -s2 * 1.72 + Math.sin(t * 0.2 + k) * 0.5, s2 * 0.1, s2 * 0.16);
    ctx.fill();
  }
  ctx.restore();
}
function tree(ctx: C2, x: number, y: number, r: number, P: Pal, sea: Season, seed: number, t: number) {
  ctx.fillStyle = 'rgba(40,60,20,.22)';
  ell(ctx, x + r * 0.2, y, r * 0.9, r * 0.28);
  ctx.fill();
  ctx.fillStyle = '#8a5a32';
  rr(ctx, x - r * 0.14, y - r * 0.9, r * 0.28, r * 0.9, r * 0.08);
  ctx.fill();
  const sway = Math.sin(t * 0.03 + seed) * r * 0.04;
  ctx.fillStyle = lin(ctx, x - r, y - r * 2.2, x + r, y - r * 0.6, [0, P.tree[0]], [1, P.tree[1]]);
  ctx.strokeStyle = 'rgba(60,40,20,.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const [dx, dy, q] of [[-0.45, -1.15, 0.6], [0.45, -1.2, 0.6], [0, -1.65, 0.7], [0, -1.1, 0.65]]) {
    ctx.moveTo(x + dx * r + q * r + sway, y + dy * r);
    ctx.arc(x + dx * r + sway, y + dy * r, q * r, 0, TAU);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ell(ctx, x - r * 0.25 + sway, y - r * 1.85, r * 0.3, r * 0.18, -0.4);
  ctx.fill();
  if (sea === 'winter') {
    ctx.fillStyle = '#ffffff';
    ell(ctx, x + sway, y - r * 2.15, r * 0.5, r * 0.2);
    ctx.fill();
  }
  if (sea === 'autumn' || sea === 'summer') {
    ctx.fillStyle = sea === 'autumn' ? '#ff5a3a' : '#ff4a5a';
    for (let k = 0; k < 3; k++) (ell(ctx, x + (hsh(seed + k) - 0.5) * r * 1.2 + sway, y - r * (1.0 + hsh(seed + k + 9) * 0.8), r * 0.09, r * 0.09), ctx.fill());
  }
}
function house(ctx: C2, x: number, y: number, s2: number, roof: string, lit: number, seed: number, bunt: number, t: number) {
  const w2 = s2, hh = s2 * 0.62, rh = s2 * 0.5, d = s2 * 0.35;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(50,40,20,.22)';
  ell(ctx, d * 0.3, 0, w2 * 0.8, s2 * 0.16);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  // 옆면
  ctx.fillStyle = '#e8d2b0';
  ctx.beginPath();
  ctx.moveTo(w2 / 2, 0);
  ctx.lineTo(w2 / 2 + d, -d * 0.45);
  ctx.lineTo(w2 / 2 + d, -hh - d * 0.45);
  ctx.lineTo(w2 / 2, -hh);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 앞면
  ctx.fillStyle = '#fff6e4';
  rr(ctx, -w2 / 2, -hh, w2, hh, 1);
  ctx.fill();
  ctx.stroke();
  // 지붕
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-w2 / 2 - s2 * 0.08, -hh);
  ctx.lineTo(0, -hh - rh);
  ctx.lineTo(d, -hh - rh - d * 0.45);
  ctx.lineTo(w2 / 2 + d + s2 * 0.06, -hh - d * 0.45);
  ctx.lineTo(w2 / 2 + s2 * 0.08, -hh);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.beginPath();
  ctx.moveTo(-w2 / 2 - s2 * 0.08, -hh);
  ctx.lineTo(0, -hh - rh);
  ctx.lineTo(w2 / 2 + s2 * 0.08, -hh);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 굴뚝 + 연기
  ctx.fillStyle = '#c47a5a';
  rr(ctx, d * 0.6, -hh - rh * 0.95, s2 * 0.12, s2 * 0.25, 1);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.65)';
  for (let k = 0; k < 3; k++) {
    const u2 = ((t * 0.01 + k / 3 + hsh(seed)) % 1);
    ell(ctx, d * 0.66 + u2 * s2 * 0.3, -hh - rh * 1.05 - u2 * s2 * 0.6, s2 * (0.06 + u2 * 0.08), s2 * (0.05 + u2 * 0.06));
    ctx.fill();
  }
  // 문 · 창
  ctx.fillStyle = '#a8643a';
  rr(ctx, -s2 * 0.1, -hh * 0.55, s2 * 0.2, hh * 0.55, s2 * 0.08);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = lit > 0 ? `rgba(255,${200 + 30 * lit},90,1)` : '#7ab8e8';
  for (const sd of [-1, 1]) {
    rr(ctx, sd * s2 * 0.3 - s2 * 0.08, -hh * 0.78, s2 * 0.16, s2 * 0.15, 2);
    ctx.fill();
    ctx.stroke();
  }
  if (lit > 0) {
    ctx.fillStyle = radg(ctx, 0, -hh * 0.7, 0, s2 * 0.8, [0, `rgba(255,220,120,${0.35 * lit})`], [1, 'rgba(255,220,120,0)']);
    ell(ctx, 0, -hh * 0.7, s2 * 0.8, s2 * 0.6);
    ctx.fill();
  }
  // 리본 장식 (비단)
  if (bunt > 0) {
    const cols = ['#ff7aa8', '#ffd23a', '#7ad0ff', '#9be36f'];
    for (let k = 0; k < 5; k++) {
      const px = -w2 / 2 + (k + 0.5) * (w2 / 5), py = -hh + 2 + Math.sin((k + 0.5) / 5 * Math.PI) * 3;
      ctx.fillStyle = cols[k % 4];
      ctx.globalAlpha = c01(bunt);
      tri(ctx, px, py + 2, s2 * 0.07, false);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

const wrapCache = new Map<string, string[]>();
function wrapText(ctx: C2, text: string, maxW: number): string[] {
  const key = `${ctx.font}|${maxW}|${text}`;
  const c = wrapCache.get(key);
  if (c) return c;
  const words = text.split(' '), lines: string[] = [];
  let cur = '';
  for (const wd of words) {
    const tryL = cur ? cur + ' ' + wd : wd;
    if (ctx.measureText(tryL).width > maxW && cur) (lines.push(cur), (cur = wd));
    else cur = tryL;
  }
  if (cur) lines.push(cur);
  if (wrapCache.size > 300) wrapCache.clear();
  wrapCache.set(key, lines);
  return lines;
}

/** 큰 순간 글자 (그림자·외곽선) */
function bigWord(ctx: C2, text: string, x: number, y: number, size: number, col: string, a: number, scale: number) {
  ctx.save();
  ctx.globalAlpha = c01(a);
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.28;
  ctx.strokeStyle = 'rgba(90,50,20,.85)';
  ctx.strokeText(text, 0, size * 0.06);
  ctx.lineWidth = size * 0.16;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = col;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

const BIG_WORD: Partial<Record<Anim, [string, string]>> = {
  feast: ['잔치다!', '#ff5a7a'], harvest: ['풍년!', '#f0a020'], wall: ['쿵! 쿵!', '#4f7ef0'], train: ['하나 둘!', '#3f7ae0'],
  fireworks: ['펑! 펑!', '#ff5aa0'], rain: ['단비!', '#3aa0f0'], magic: ['반짝!', '#9a6cff'], dragonFeed: ['냠냠!', '#2fbf6a'],
  coinsIn: ['짤랑!', '#e0a000'], coinsOut: ['선물!', '#ff7a5a'], bread: ['냠!', '#e08a30'], music: ['랄라~', '#ff6aa0'], store: ['차곡차곡', '#b07a3a'],
};
const REPLY: Record<Anim, string> = {
  feast: '야호, 잔치다!', store: '알겠어요!', harvest: '금빛 밀이에요!', wall: '튼튼해요!', train: '충성!', coinsIn: '짤랑짤랑~', coinsOut: '고마워요!',
  rain: '비다 비!', fireworks: '와아아!', music: '랄라라~', build: '새 집!', rest: '쿨쿨…', dragonFeed: '냠냠, 맛있다!', dragonShoo: '엥… 미워!',
  magic: '수리수리~', bread: '고소해요!', refuse: '흥… 알겠어요',
};
const FAIL_TXT: [string, string][] = [
  ['식량이 바닥났어요!', '곳간이 넘쳐 쥐 떼 잔치!'],
  ['주민들이 짐 싸서 떠나요…', '너무 신나서 아무도 일을 안 해요!'],
  ['금고가 텅 비었어요…', '금화가 넘쳐 도둑 떼가 왔어요!'],
  ['성을 지킬 병사가 없어요!', '장군이 왕관을 탐내요!'],
];

function drawAll(ctx: C2, s: KState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const d = STAGES[s.stage], P = PAL[d.key], t = s.t, sea = d.key;
  const sc = typeof ctx.getTransform === 'function' ? ctx.getTransform().a || 1 : 1;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const la = s.last ? s.t - s.last.t : 999;
  const acting = s.phase === 'act' && !!s.last;
  const anims = acting ? s.last!.an : [];
  /** 이 결과 연출이 지금 몇 틱째인지 (왕관이면 둘째는 30틱 늦게) */
  const animAge = (an: Anim) => {
    const i = anims.indexOf(an);
    return i < 0 ? -1 : la - i * 30;
  };
  const evA = s.phase === 'event' && s.ev ? s.t - s.ev.t : -1;
  // 막대 보이는 값 (움직이는 중이면 보간)
  const since = s.phase === 'event' && s.ev ? evA : la;
  const shown = s.v.map((v, i) => {
    const u2 = eo((since - 6) / 24);
    return Math.max(0, Math.min(MAXV, s.prev[i] + (v - s.prev[i]) * u2));
  });

  ctx.save();
  fx.begin(ctx);
  ctx.drawImage(bgLayer(Math.round(w), Math.round(h), sea, Math.min(3, Math.max(1, Math.round(sc)))), 0, 0, w, h);
  // 해
  {
    const sx = X(0.86), sy = Y(0.25), r = R(0.055), big = acting || s.phase === 'result' ? 1 : 0;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(t * 0.004);
    ctx.fillStyle = 'rgba(255,236,150,.55)';
    for (let k = 0; k < 12; k++) {
      ctx.rotate(TAU / 12);
      ctx.beginPath();
      ctx.moveTo(r * 1.15, -r * 0.12);
      ctx.lineTo(r * (1.65 + 0.15 * Math.sin(t * 0.08 + k)), 0);
      ctx.lineTo(r * 1.15, r * 0.12);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = radg(ctx, sx - r * 0.3, sy - r * 0.3, 0, r * 1.1, [0, '#fffbe0'], [0.6, '#ffe36a'], [1, '#ffc93a']);
    ell(ctx, sx, sy, r, r);
    ctx.fill();
    ctx.strokeStyle = '#e8a010';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = INK;
    for (const sd of [-1, 1]) {
      if (big) {
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx + sd * r * 0.35, sy - r * 0.05, r * 0.14, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else (ell(ctx, sx + sd * r * 0.35, sy - r * 0.08, r * 0.08, r * 0.12), ctx.fill());
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy + r * 0.12, r * (big ? 0.35 : 0.25), 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,120,120,.45)';
    for (const sd of [-1, 1]) (ell(ctx, sx + sd * r * 0.6, sy + r * 0.2, r * 0.14, r * 0.08), ctx.fill());
  }
  // 흘러가는 구름 · 새
  for (let i = 0; i < 4; i++) {
    const cw = R(0.16 + hsh(i + 3) * 0.08), cx = ((hsh(i + 1) * w * 1.4 + t * (0.08 + i * 0.03)) % (w * 1.4)) - w * 0.2, cy = Y(0.2 + hsh(i + 7) * 0.13);
    puff(ctx, cx, cy, cw, R(0.05), '#ffffff', '#dfeefb', i + 11);
  }
  ctx.strokeStyle = 'rgba(60,70,110,.5)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const bx = ((hsh(i + 90) * w + t * (0.25 + i * 0.05)) % (w + 40)) - 20, by = Y(0.3 + hsh(i + 91) * 0.08), fl = Math.sin(t * 0.25 + i * 2) * 3;
    ctx.beginPath();
    ctx.moveTo(bx - 5, by - fl);
    ctx.quadraticCurveTo(bx - 2, by - 2, bx, by);
    ctx.quadraticCurveTo(bx + 2, by - 2, bx + 5, by - fl);
    ctx.stroke();
  }

  // ═════════ 섬 위 ═════════
  const fd = shown[0], jy = shown[1], gd = shown[2], ar = shown[3];
  // 계절 사건 하늘: 눈보라 구름 · 적군 언덕
  if (d.storm && !s.stormDone) {
    const left = d.storm.after - s.day, k = c01(1 - (left - 1) / d.storm.after);
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.4 * k;
    puff(ctx, X(0.08 + 0.12 * k), Y(0.24 + 0.04 * k), R(0.18 + 0.14 * k), R(0.07 + 0.04 * k), '#e6ecf6', '#9aa8c0', 77);
    ctx.restore();
  }
  // 풍차
  {
    const mx = X(MILL.x), my = Y(MILL.y), k = R(0.05);
    ctx.fillStyle = 'rgba(40,60,20,.2)';
    ell(ctx, mx + k * 0.2, my, k * 0.7, k * 0.2);
    ctx.fill();
    ctx.fillStyle = lin(ctx, mx - k * 0.5, 0, mx + k * 0.5, 0, [0, '#ffffff'], [1, '#e2d6c4']);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(mx - k * 0.45, my);
    ctx.lineTo(mx - k * 0.28, my - k * 1.6);
    ctx.lineTo(mx + k * 0.28, my - k * 1.6);
    ctx.lineTo(mx + k * 0.45, my);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e2654a';
    ctx.beginPath();
    ctx.moveTo(mx - k * 0.38, my - k * 1.6);
    ctx.quadraticCurveTo(mx, my - k * 2.2, mx + k * 0.38, my - k * 1.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#a8643a';
    rr(ctx, mx - k * 0.1, my - k * 0.4, k * 0.2, k * 0.4, 2);
    ctx.fill();
    const ha = animAge('harvest');
    const spin = t * 0.03 + (ha >= 0 ? eo(ha / 60) * 6 : 0) + (fx.memo.millSpin ?? 0);
    ctx.save();
    ctx.translate(mx, my - k * 1.6);
    ctx.rotate(spin);
    for (let q = 0; q < 4; q++) {
      ctx.rotate(TAU / 4);
      ctx.fillStyle = '#fff6e4';
      ctx.strokeStyle = OUT;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(k * 0.12, -k * 0.2);
      ctx.lineTo(k * 0.25, -k * 1.15);
      ctx.lineTo(-k * 0.02, -k * 1.15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#8a5a2a';
    ell(ctx, 0, 0, k * 0.1, k * 0.1);
    ctx.fill();
    ctx.restore();
  }
  // 뒤쪽 나무
  tree(ctx, X(0.31), Y(0.5), R(0.032), P, sea, 3, t);
  tree(ctx, X(0.665), Y(0.495), R(0.03), P, sea, 4, t);
  // ── 성 ──
  {
    const cx = X(CASTLE.x), by = Y(CASTLE.y), k = R(1);
    const stone = (x0: number, wd: number, top: number) => {
      ctx.fillStyle = lin(ctx, x0, 0, x0 + wd, 0, [0, '#fffaf0'], [0.55, '#f2e2c8'], [1, '#d8c2a0']);
      ctx.fillRect(x0, top, wd, by - top);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.4;
      ctx.strokeRect(x0, top, wd, by - top);
      ctx.strokeStyle = 'rgba(150,110,70,.28)';
      ctx.lineWidth = 1;
      for (let yy = top + k * 0.018; yy < by; yy += k * 0.018) {
        ctx.beginPath();
        ctx.moveTo(x0 + 1, yy);
        ctx.lineTo(x0 + wd - 1, yy);
        ctx.stroke();
      }
    };
    const cone = (x0: number, wd: number, top: number, hgt: number, col: string, colD: string) => {
      ctx.fillStyle = lin(ctx, x0, 0, x0 + wd, 0, [0, col], [1, colD]);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x0 - wd * 0.12, top);
      ctx.lineTo(x0 + wd / 2, top - hgt);
      ctx.lineTo(x0 + wd * 1.12, top);
      ctx.quadraticCurveTo(x0 + wd / 2, top + wd * 0.2, x0 - wd * 0.12, top);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath();
      ctx.moveTo(x0 + wd * 0.05, top - wd * 0.02);
      ctx.lineTo(x0 + wd / 2, top - hgt);
      ctx.lineTo(x0 + wd * 0.3, top);
      ctx.closePath();
      ctx.fill();
    };
    const flag = (fx2: number, fy: number, col: string) => {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(fx2, fy);
      ctx.lineTo(fx2, fy - k * 0.04);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(fx2, fy - k * 0.04);
      for (let q = 0; q <= 6; q++) ctx.lineTo(fx2 + (q / 6) * k * 0.035, fy - k * 0.04 + Math.sin(t * 0.18 + q * 0.9) * k * 0.003 + (q / 6) * k * 0.006);
      for (let q = 6; q >= 0; q--) ctx.lineTo(fx2 + (q / 6) * k * 0.035, fy - k * 0.02 + Math.sin(t * 0.18 + q * 0.9) * k * 0.003 - (q / 6) * k * 0.004);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };
    const roofA = sea === 'war' ? ['#e2454a', '#a82a30'] : ['#ff9ec0', '#e8709a'], roofB = ['#7ab8ff', '#4a86d8'], flagC = sea === 'war' ? '#e2454a' : '#ffd23a';
    // 가운데 높은 탑
    stone(cx - k * 0.035, k * 0.07, by - k * 0.2);
    cone(cx - k * 0.035, k * 0.07, by - k * 0.2, k * 0.09, roofB[0], roofB[1]);
    flag(cx, by - k * 0.29, flagC);
    // 양쪽 탑
    for (const sd of [-1, 1]) {
      const x0 = cx + sd * k * 0.1 - k * 0.03;
      stone(x0, k * 0.06, by - k * 0.15);
      cone(x0, k * 0.06, by - k * 0.15, k * 0.075, roofA[0], roofA[1]);
      flag(x0 + k * 0.03, by - k * 0.225, flagC);
      ctx.fillStyle = s.phase === 'act' && anims.includes('feast') ? '#ffd86a' : '#5a6aa0';
      rr(ctx, x0 + k * 0.022, by - k * 0.12, k * 0.016, k * 0.024, k * 0.008);
      ctx.fill();
    }
    // 본채
    stone(cx - k * 0.075, k * 0.15, by - k * 0.11);
    ctx.fillStyle = '#f2e2c8';
    for (let q = 0; q < 6; q++) {
      const bx = cx - k * 0.075 + q * k * 0.027;
      ctx.fillRect(bx, by - k * 0.125, k * 0.016, k * 0.016);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(bx, by - k * 0.125, k * 0.016, k * 0.016);
    }
    // 창 · 성문
    const lit = acting && anims.includes('feast') ? 1 : 0;
    ctx.fillStyle = lit ? '#ffd86a' : '#5a6aa0';
    for (const sd of [-1, 1]) {
      rr(ctx, cx + sd * k * 0.045 - k * 0.009, by - k * 0.085, k * 0.018, k * 0.026, k * 0.009);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#8a5530';
    ctx.beginPath();
    ctx.moveTo(cx - k * 0.024, by);
    ctx.lineTo(cx - k * 0.024, by - k * 0.035);
    ctx.arc(cx, by - k * 0.035, k * 0.024, Math.PI, 0);
    ctx.lineTo(cx + k * 0.024, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(40,20,10,.5)';
    for (let q = -1; q <= 1; q++) {
      ctx.beginPath();
      ctx.moveTo(cx + q * k * 0.01, by - k * 0.05);
      ctx.lineTo(cx + q * k * 0.01, by);
      ctx.stroke();
    }
    // 용 친구: 탑에 감겨 졸고 있다
    if (s.dragonPal && !(s.phase === 'event' && s.ev?.k === 'friend' && evA < 70)) {
      ctx.save();
      ctx.translate(cx + k * 0.11, by - k * 0.14);
      ctx.scale(0.42, 0.42);
      drawDragon(ctx, R(0.003) * 2.2, 'happy', t);
      ctx.restore();
    }
  }
  // ── 보물창고 + 금화 더미 ──
  {
    const tx = X(TREASURY.x), ty = Y(TREASURY.y), k = R(0.045);
    ctx.fillStyle = 'rgba(50,40,20,.22)';
    ell(ctx, tx + k * 0.2, ty, k * 0.9, k * 0.25);
    ctx.fill();
    ctx.fillStyle = lin(ctx, tx - k * 0.6, 0, tx + k * 0.6, 0, [0, '#fff6e4'], [1, '#d8c2a0']);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.3;
    rr(ctx, tx - k * 0.6, ty - k * 0.9, k * 1.2, k * 0.9, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = lin(ctx, tx - k * 0.6, ty - k * 1.6, tx + k * 0.6, ty - k * 0.9, [0, '#fff3a0'], [1, '#e8a810']);
    ctx.beginPath();
    ctx.moveTo(tx - k * 0.68, ty - k * 0.9);
    ctx.quadraticCurveTo(tx - k * 0.6, ty - k * 1.65, tx, ty - k * 1.7);
    ctx.quadraticCurveTo(tx + k * 0.6, ty - k * 1.65, tx + k * 0.68, ty - k * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#8a5530';
    rr(ctx, tx - k * 0.15, ty - k * 0.5, k * 0.3, k * 0.5, k * 0.15);
    ctx.fill();
    ctx.stroke();
    // 더미: 금화 수만큼
    const n = Math.round(gd * 2.2);
    for (let q = 0; q < n; q++) {
      const row = Math.floor(Math.sqrt(q * 2)), px = tx - k * 1.15 + (hsh(q + 200) - 0.5) * k * (1.3 - row * 0.12), py = ty + k * 0.05 - row * k * 0.13 - hsh(q + 201) * k * 0.08;
      ctx.fillStyle = q % 3 ? '#ffd23a' : '#ffe680';
      ell(ctx, px, py, k * 0.13, k * 0.07);
      ctx.fill();
      ctx.strokeStyle = '#a07400';
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
    if (gd >= 7) {
      const tw = (t * 0.05) % 1;
      ctx.fillStyle = `rgba(255,255,255,${1 - tw})`;
      starPath(ctx, tx - k * 1.1, ty - k * (0.4 + tw * 0.5), k * 0.12 * (1 + tw));
      ctx.fill();
    }
    // 금화 넘침 위험: 덤불 뒤 도둑 눈
    if (s.v[2] >= MAXV - 1 && s.phase !== 'fail') {
      ctx.fillStyle = '#4a6a3a';
      ell(ctx, tx + k * 1.0, ty - k * 0.1, k * 0.45, k * 0.35);
      ctx.fill();
      ctx.fillStyle = '#2a2a3a';
      rr(ctx, tx + k * 0.75, ty - k * 0.42, k * 0.5, k * 0.14, 3);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (const sd of [-1, 1]) (ell(ctx, tx + k * 1.0 + sd * k * 0.1, ty - k * 0.35, k * 0.05, k * 0.05), ctx.fill());
    }
  }
  // ── 성벽 (병사 수만큼 높고, 병사가 서 있다) ──
  {
    const wa = animAge('wall');
    let arW = ar;
    if (wa >= 0) {
      // 쿵·쿵·쿵 세 번에 나눠 솟는다
      const steps = Math.min(1, Math.floor(c01((wa - 8) / 30) * 3 + (wa >= 8 ? 1 : 0)) / 3);
      arW = s.prev[3] + (s.v[3] - s.prev[3]) * steps;
    }
    const hgt = R(0.012 + c01(arW / 10) * 0.05), x0 = X(WALL.x0), x1 = X(WALL.x1), by = Y(WALL.y);
    const seg = 10;
    for (let q = 0; q < seg; q++) {
      if (q === 4 || q === 5) continue;
      const u0 = q / seg, u1 = (q + 1) / seg;
      const xa = x0 + (x1 - x0) * u0, xb = x0 + (x1 - x0) * u1, ya = by + Math.sin(u0 * Math.PI) * R(0.02), yb = by + Math.sin(u1 * Math.PI) * R(0.02);
      ctx.fillStyle = lin(ctx, 0, ya - hgt, 0, ya, [0, '#f2e2c8'], [1, '#cdb48e']);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(xa, ya);
      ctx.lineTo(xa, ya - hgt);
      const cr = R(0.008);
      ctx.lineTo(xa + (xb - xa) * 0.25, ya - hgt + (yb - ya) * 0.25);
      ctx.lineTo(xa + (xb - xa) * 0.25, ya - hgt - cr + (yb - ya) * 0.25);
      ctx.lineTo(xa + (xb - xa) * 0.75, ya - hgt - cr + (yb - ya) * 0.75);
      ctx.lineTo(xa + (xb - xa) * 0.75, ya - hgt + (yb - ya) * 0.75);
      ctx.lineTo(xb, yb - hgt);
      ctx.lineTo(xb, yb);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // 성문 탑
    for (const sd of [-1, 1]) {
      const gx = X(0.5 + sd * 0.045), gy = by + R(0.02);
      ctx.fillStyle = lin(ctx, gx - R(0.015), 0, gx + R(0.015), 0, [0, '#fffaf0'], [1, '#cdb48e']);
      rr(ctx, gx - R(0.015), gy - hgt - R(0.02), R(0.03), hgt + R(0.02), 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = sea === 'war' ? '#e2454a' : '#7ab8ff';
      ctx.beginPath();
      ctx.moveTo(gx - R(0.02), gy - hgt - R(0.02));
      ctx.lineTo(gx, gy - hgt - R(0.045));
      ctx.lineTo(gx + R(0.02), gy - hgt - R(0.02));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // 병사들
    const n = Math.min(9, Math.round(arW));
    for (let q = 0; q < n; q++) {
      const u = (q + 0.5) / 9, gate = u > 0.4 && u < 0.6;
      const uu = gate ? (u < 0.5 ? 0.38 : 0.62) : u;
      const sx2 = x0 + (x1 - x0) * uu, sy2 = by + Math.sin(uu * Math.PI) * R(0.02) - hgt;
      const dance = animAge('music') >= 0 ? Math.abs(Math.sin(t * 0.3 + q)) * R(0.008) : 0;
      soldier(ctx, sx2, sy2 - dance, R(0.016), t, q);
    }
    // 병사 바닥: 무너진 성벽 틈으로 도적이 엿본다
    if (s.v[3] <= 1 && s.phase !== 'fail') {
      ctx.fillStyle = '#5a4a3a';
      ell(ctx, X(0.62), by - R(0.01), R(0.012), R(0.012));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, X(0.62), by - R(0.012), R(0.004), R(0.004));
      ctx.fill();
    }
  }
  // ── 밭 (식량만큼 자라고, 많으면 금빛) ──
  {
    const ha = animAge('harvest'), ra = animAge('rain');
    for (let i = 0; i < FIELDS.length; i++) {
      const [fx0, fy0] = FIELDS[i];
      const grow = c01((fd - i * 2.2) / 3), wave = ha >= 0 ? c01((ha - i * 6) / 20) : 0;
      if (grow <= 0.02 && wave <= 0) continue;
      const gold = c01((fd - 5) / 4) * 0.8 + wave * 0.6;
      for (let r2 = 0; r2 < 4; r2++) {
        for (let c = 0; c < 7; c++) {
          const px = X(fx0 + 0.022 + c * 0.015 - r2 * 0.004), py = Y(fy0 + 0.01 + r2 * 0.012);
          const hh = R(0.006 + 0.016 * Math.max(grow, wave)) * (1 + (ra >= 30 ? 0.3 * c01((ra - 30) / 20) : 0));
          const sway = Math.sin(t * 0.08 + c * 0.6 + r2 + (ha >= 0 ? ha * 0.3 : 0)) * R(0.003) * (1 + wave * 2);
          ctx.strokeStyle = gold > 0.4 ? '#d49a22' : sea === 'winter' ? '#9ab07a' : '#5aa83a';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + sway, py - hh);
          ctx.stroke();
          ctx.fillStyle = gold > 0.4 ? (wave > 0.5 && (c + r2) % 3 === 0 ? '#fff3a0' : '#f2c14e') : sea === 'winter' ? '#ffffff' : '#8edc56';
          ell(ctx, px + sway, py - hh, R(0.0035), R(0.006));
          ctx.fill();
        }
      }
    }
    // 식량 바닥: 갈라진 땅
    if (s.v[0] <= 1 && s.phase !== 'fail') {
      ctx.strokeStyle = 'rgba(90,50,20,.7)';
      ctx.lineWidth = 1.2;
      for (const [fx0, fy0] of FIELDS) {
        ctx.beginPath();
        ctx.moveTo(X(fx0 + 0.03), Y(fy0 + 0.02));
        ctx.lineTo(X(fx0 + 0.06), Y(fy0 + 0.03));
        ctx.lineTo(X(fx0 + 0.09), Y(fy0 + 0.015));
        ctx.stroke();
      }
    }
  }
  // ── 집들 ──
  {
    const roofs = sea === 'winter' ? ['#ffffff', '#f0f6ff', '#ffffff', '#eef4ff', '#ffffff'] : ['#ff8a7a', '#7ac8ff', '#ffc94a', '#b48cff', '#7ad69a'];
    const feastA = animAge('feast'), outA = animAge('coinsOut');
    for (let i = 0; i < HOUSES.length; i++) {
      const [hx, hy] = HOUSES[i];
      const lit = feastA >= 0 ? c01((feastA - i * 3) / 8) : 0;
      const bunt = s.stage >= 0 && (fx.memo.bunt ?? 0) > 0 ? 1 : outA >= 0 ? c01((outA - 25) / 10) : 0;
      house(ctx, X(hx), Y(hy), R(0.07), roofs[i], lit, i, bunt, t);
      if (sea === 'winter') {
        ctx.fillStyle = '#ffffff';
        ell(ctx, X(hx), Y(hy) - R(0.07) * 1.05, R(0.03), R(0.008));
        ctx.fill();
      }
    }
  }
  // ── 헛간 + 자루 (식량) ──
  {
    const bx = X(BARN.x), by = Y(BARN.y), k = R(0.05);
    ctx.fillStyle = 'rgba(50,40,20,.22)';
    ell(ctx, bx + k * 0.2, by, k * 1.0, k * 0.25);
    ctx.fill();
    ctx.fillStyle = lin(ctx, bx - k * 0.6, 0, bx + k * 0.6, 0, [0, '#ff7a6a'], [1, '#c8443a']);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(bx - k * 0.6, by);
    ctx.lineTo(bx - k * 0.6, by - k * 0.65);
    ctx.lineTo(bx, by - k * 1.1);
    ctx.lineTo(bx + k * 0.6, by - k * 0.65);
    ctx.lineTo(bx + k * 0.6, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = sea === 'winter' ? '#ffffff' : '#8a5530';
    ctx.beginPath();
    ctx.moveTo(bx - k * 0.7, by - k * 0.62);
    ctx.lineTo(bx, by - k * 1.18);
    ctx.lineTo(bx + k * 0.7, by - k * 0.62);
    ctx.lineTo(bx + k * 0.6, by - k * 0.56);
    ctx.lineTo(bx, by - k * 1.04);
    ctx.lineTo(bx - k * 0.6, by - k * 0.56);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const sa = animAge('store'), bounce = sa >= 30 && sa < 50 ? Math.sin((sa - 30) * 0.5) * k * 0.05 : 0;
    ctx.fillStyle = '#fff6e4';
    rr(ctx, bx - k * 0.25, by - k * 0.55 - bounce, k * 0.5, k * 0.55 + bounce, 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#c8443a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx - k * 0.22, by - k * 0.52 - bounce);
    ctx.lineTo(bx + k * 0.22, by - k * 0.03);
    ctx.moveTo(bx + k * 0.22, by - k * 0.52 - bounce);
    ctx.lineTo(bx - k * 0.22, by - k * 0.03);
    ctx.stroke();
    const n = Math.min(8, Math.round(fd));
    for (let q = 0; q < n; q++) {
      const px = bx + k * (0.75 + (q % 4) * 0.28), py = by - Math.floor(q / 4) * k * 0.24;
      ctx.fillStyle = lin(ctx, px, py - k * 0.3, px, py, [0, '#f6e2b8'], [1, '#d8b47a']);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1;
      ell(ctx, px, py - k * 0.12, k * 0.13, k * 0.15);
      ctx.fill();
      ctx.stroke();
    }
    // 식량 넘침 위험: 쥐가 기웃
    if (s.v[0] >= MAXV - 1 && s.phase !== 'fail') {
      for (let q = 0; q < 2; q++) {
        const rx2 = bx - k * (0.9 + q * 0.4) + Math.sin(t * 0.2 + q) * k * 0.1, ry2 = by - k * 0.02;
        ctx.fillStyle = '#9a9aa8';
        ell(ctx, rx2, ry2 - k * 0.08, k * 0.14, k * 0.08);
        ctx.fill();
        ell(ctx, rx2 - k * 0.12, ry2 - k * 0.14, k * 0.05, k * 0.05);
        ctx.fill();
        ctx.strokeStyle = '#ff9ab8';
        ctx.beginPath();
        ctx.moveTo(rx2 + k * 0.13, ry2 - k * 0.08);
        ctx.quadraticCurveTo(rx2 + k * 0.3, ry2 - k * 0.2, rx2 + k * 0.32, ry2 - k * 0.05);
        ctx.stroke();
      }
    }
  }
  // ── 기념물 (깬 계절마다 하나씩 남는다) ──
  for (const dk of s.deco) {
    if (dk === 'spring') {
      // 꽃 아치
      const ax = X(0.5), ay = Y(0.655);
      ctx.strokeStyle = '#7ac85a';
      ctx.lineWidth = R(0.006);
      ctx.beginPath();
      ctx.arc(ax, ay, R(0.035), Math.PI, 0);
      ctx.stroke();
      for (let q = 0; q < 7; q++) {
        const a = Math.PI + (q / 6) * Math.PI;
        ctx.fillStyle = ['#ff9ec0', '#ffe066', '#ffffff'][q % 3];
        ell(ctx, ax + Math.cos(a) * R(0.035), ay + Math.sin(a) * R(0.035), R(0.006), R(0.006));
        ctx.fill();
      }
    } else if (dk === 'summer') {
      for (let q = 0; q < 3; q++) {
        const sx2 = X(0.34 + q * 0.02), sy2 = Y(0.665 + (q % 2) * 0.008);
        ctx.strokeStyle = '#4a9a2e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx2, sy2);
        ctx.lineTo(sx2, sy2 - R(0.035));
        ctx.stroke();
        ctx.fillStyle = '#ffd23a';
        ell(ctx, sx2, sy2 - R(0.035), R(0.011), R(0.011));
        ctx.fill();
        ctx.fillStyle = '#8a5530';
        ell(ctx, sx2, sy2 - R(0.035), R(0.005), R(0.005));
        ctx.fill();
      }
    } else if (dk === 'autumn') {
      for (let q = 0; q < 3; q++) {
        ctx.fillStyle = lin(ctx, 0, Y(0.77) - R(0.02), 0, Y(0.77), [0, '#ffb45a'], [1, '#e8742a']);
        ell(ctx, X(0.33 + q * 0.022), Y(0.77 - (q === 1 ? 0.004 : 0)), R(0.012), R(0.009));
        ctx.fill();
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    } else if (dk === 'winter') {
      const nx = X(0.62), ny = Y(0.775);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#9ab0cc';
      ctx.lineWidth = 1.2;
      for (const [dy, r0] of [[0, 0.016], [-0.024, 0.012]]) (ell(ctx, nx, ny + R(dy), R(r0), R(r0)), ctx.fill(), ctx.stroke());
      ctx.fillStyle = '#ff8a3a';
      ell(ctx, nx + R(0.007), ny - R(0.024), R(0.005), R(0.0025));
      ctx.fill();
    } else if (dk === 'fest') {
      for (let q = 0; q < 3; q++) {
        const bx2 = X(0.92 + q * 0.018), by2 = Y(0.5 - q * 0.01) + Math.sin(t * 0.05 + q) * 2;
        ctx.strokeStyle = '#8a7a6a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx2, by2);
        ctx.lineTo(X(0.93), Y(0.6));
        ctx.stroke();
        ctx.fillStyle = ['#ff6a8a', '#ffd23a', '#7ac8ff'][q];
        ell(ctx, bx2, by2, R(0.012), R(0.015));
        ctx.fill();
      }
    } else if (dk === 'war') {
      const gx = X(0.4), gy = Y(0.615);
      ctx.fillStyle = '#c8ccd6';
      rr(ctx, gx - R(0.012), gy - R(0.012), R(0.024), R(0.012), 2);
      ctx.fill();
      soldier(ctx, gx, gy - R(0.012), R(0.018), 0, 0);
    }
  }
  // ── 광장 분수 ──
  {
    const px = X(PLAZA.x), py = Y(PLAZA.y) - R(0.005);
    ctx.fillStyle = '#e8eef6';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ell(ctx, px, py, R(0.03), R(0.011));
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#7ad0ff';
    ell(ctx, px, py - R(0.002), R(0.024), R(0.008));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 1.5;
    for (let q = -1; q <= 1; q++) {
      ctx.beginPath();
      ctx.moveTo(px, py - R(0.03));
      ctx.quadraticCurveTo(px + q * R(0.012), py - R(0.04), px + q * R(0.02), py - R(0.004));
      ctx.stroke();
    }
    ctx.fillStyle = '#e8eef6';
    rr(ctx, px - R(0.004), py - R(0.032), R(0.008), R(0.03), 2);
    ctx.fill();
  }
  // ── 잔치 등불 줄 ──
  {
    const fa = animAge('feast');
    const on = fa >= 0 || (s.phase === 'result' && s.stage === 4);
    if (on) {
      for (const [y0, sag] of [[0.645, 0.018], [0.655, 0.026]]) {
        const xa = X(0.37), xb = X(0.63), ya = Y(y0);
        ctx.strokeStyle = '#6a4a2a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xa, ya);
        ctx.quadraticCurveTo((xa + xb) / 2, ya + R(sag) * 2, xb, ya);
        ctx.stroke();
        for (let q = 0; q < 8; q++) {
          const u = (q + 0.5) / 8, bx2 = xa + (xb - xa) * u, by2 = ya + R(sag) * 4 * u * (1 - u);
          const litQ = fa < 0 || fa >= q * 2.5;
          ctx.fillStyle = litQ ? ['#ffd23a', '#ff7a8a', '#7ad0ff', '#9be36f'][q % 4] : '#bba';
          if (litQ) {
            ctx.fillStyle = radg(ctx, bx2, by2 + 3, 0, R(0.016), [0, 'rgba(255,240,170,.8)'], [1, 'rgba(255,240,170,0)']);
            ell(ctx, bx2, by2 + 3, R(0.016), R(0.016));
            ctx.fill();
            ctx.fillStyle = ['#ffd23a', '#ff7a8a', '#7ad0ff', '#9be36f'][q % 4];
          }
          rr(ctx, bx2 - R(0.004), by2, R(0.008), R(0.011), 2);
          ctx.fill();
        }
      }
    }
  }
  // ── 주민 (행복만큼 많고, 행복할수록 들썩) ──
  {
    const fa = animAge('feast'), ma = animAge('music'), ba = animAge('bread'), wa2 = animAge('fireworks'), ca = animAge('coinsOut'), resA = s.phase === 'result' ? s.pt : -1;
    const n = Math.max(1, Math.min(10, Math.round(2 + jy)));
    const mood = jy >= 4 ? 1 : jy >= 2 ? 0 : -1;
    const cols = ['#ff7a8a', '#7ac8ff', '#ffd23a', '#9be36f', '#b48cff', '#ffab5a', '#5ad0c0', '#ff9ec0', '#8ab4ff', '#f2c14e'];
    for (let q = 0; q < n; q++) {
      const a0 = (q / n) * TAU + 0.4;
      let vx = PLAZA.x + Math.cos(a0) * PLAZA.rx * (0.75 + 0.2 * hsh(q)), vy = PLAZA.y + Math.sin(a0) * PLAZA.ry * 0.9 + 0.012;
      // 평소엔 마을 길을 어슬렁
      const roam = Math.sin(t * 0.01 + q * 2.1);
      if (fa < 0 && resA < 0) (vx += roam * 0.03), (vy += Math.cos(t * 0.013 + q) * 0.004);
      const party = fa >= 0 ? c01(fa / 10) : resA >= 0 ? 1 : 0;
      const ang = party ? a0 + t * 0.06 : a0;
      if (party) (vx = PLAZA.x + Math.cos(ang) * PLAZA.rx * 0.8), (vy = PLAZA.y + Math.sin(ang) * PLAZA.ry * 0.85 + 0.01);
      const jump = party ? Math.abs(Math.sin(t * 0.32 + q)) * R(0.016) : ma >= 0 ? Math.abs(Math.sin(t * 0.2 + q)) * R(0.006) : jy >= 7 ? Math.abs(Math.sin(t * 0.15 + q)) * R(0.005) : 0;
      const arms = party || wa2 >= 0 || (ca >= 25) ? 1 : ba >= 30 ? 0.5 : 0;
      villager(ctx, X(vx), Y(vy), R(0.022), cols[q], party || ba >= 30 ? 1 : mood, jump, arms, q);
    }
    // 행복 바닥: 주민 머리 위 먹구름
    if (s.v[1] <= 1 && s.phase !== 'fail') {
      ctx.save();
      ctx.globalAlpha = 0.8;
      puff(ctx, X(PLAZA.x), Y(PLAZA.y - 0.06), R(0.14), R(0.04), '#b8c0d0', '#8a94a8', 5);
      ctx.restore();
      ctx.strokeStyle = 'rgba(90,140,220,.7)';
      for (let q = 0; q < 6; q++) {
        const rx2 = X(PLAZA.x - 0.06 + q * 0.024), ry2 = Y(PLAZA.y - 0.05) + ((t * 2 + q * 7) % 20);
        ctx.beginPath();
        ctx.moveTo(rx2, ry2);
        ctx.lineTo(rx2 - 2, ry2 + 5);
        ctx.stroke();
      }
    }
  }
  // 앞쪽 나무
  tree(ctx, X(0.06), Y(0.7), R(0.036), P, sea, 1, t);
  tree(ctx, X(0.95), Y(0.73), R(0.034), P, sea, 2, t);
  tree(ctx, X(0.39), Y(0.775), R(0.026), P, sea, 6, t);
  // 구경꾼 닭 (큰 일에 펄쩍)
  {
    const big = (fx.memo.bigT ?? -999) > t - 30, cx2 = X(0.15) + Math.sin(t * 0.012) * R(0.03), cy2 = Y(0.765);
    const hop = big ? Math.abs(Math.sin(t * 0.4)) * R(0.02) : 0;
    ctx.fillStyle = 'rgba(50,40,20,.25)';
    ell(ctx, cx2, cy2, R(0.012), R(0.004));
    ctx.fill();
    ctx.save();
    ctx.translate(cx2, cy2 - hop);
    ctx.scale(Math.cos(t * 0.012) > 0 ? 1 : -1, 1);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1;
    ell(ctx, 0, -R(0.01), R(0.012), R(0.009));
    ctx.fill();
    ctx.stroke();
    ell(ctx, R(0.009), -R(0.02), R(0.006), R(0.006));
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff4a4a';
    ell(ctx, R(0.009), -R(0.027), R(0.003), R(0.003));
    ctx.fill();
    ctx.fillStyle = '#ffb000';
    tri(ctx, R(0.016), -R(0.02), R(0.003), true);
    ctx.fill();
    ctx.restore();
    if (big && Math.floor(t / 20) % 2 === 0) {
      font(0.032, 900);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(90,50,20,.7)';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.strokeText('꼬꼬!', cx2, cy2 - R(0.05));
      ctx.fillText('꼬꼬!', cx2, cy2 - R(0.05));
    }
  }
  // 날짜 정해진 사건: 팻말
  if ((d.storm && !s.stormDone) || (d.battle && !s.battleDone)) {
    const left = (d.storm ? d.storm.after : d.battle!.after) - s.day;
    const px = X(0.115), py = Y(0.81), lab = d.storm ? `눈보라 ${left}일 뒤` : `적군 ${left}일 뒤`;
    ctx.strokeStyle = OUT;
    ctx.fillStyle = '#a8743a';
    rr(ctx, px - R(0.006), py - R(0.08), R(0.012), R(0.08), 2);
    ctx.fill();
    ctx.stroke();
    font(0.036, 900);
    const tw = ctx.measureText(lab).width + R(0.04);
    ctx.fillStyle = lin(ctx, 0, py - R(0.12), 0, py - R(0.07), [0, '#ffe6b8'], [1, '#e8c088']);
    rr(ctx, px - tw / 2 + R(0.06), py - R(0.125), tw, R(0.05), R(0.01));
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = left <= 1 ? '#d0303a' : INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lab, px + R(0.06), py - R(0.1));
    if (d.battle) {
      // 언덕 위 적군 깃발 (힘)
      const ex = X(0.9), ey = Y(0.43);
      const k2 = c01(1 - (left - 1) / d.battle.after);
      for (let q = 0; q < 5; q++) soldier(ctx, ex - R(0.03) * q * (0.6 + k2 * 0.4) - R(0.05) * k2, ey + R(0.004) * q, R(0.013), t, q, true);
      ctx.fillStyle = '#d8404a';
      ctx.strokeStyle = OUT;
      rr(ctx, ex - R(0.005), ey - R(0.08), R(0.004), R(0.06), 1);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(ex - R(0.001), ey - R(0.08));
      ctx.lineTo(ex + R(0.05), ey - R(0.07));
      ctx.lineTo(ex - R(0.001), ey - R(0.055));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      font(0.032, 900);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(d.battle.enemy), ex + R(0.018), ey - R(0.068));
    }
  }

  // ═════════ 결과 연출 (고른 순간 왕국이 바뀐다) ═════════
  if (acting) {
    const L = s.last!;
    if (fx.memo.lastT !== L.t) {
      fx.memo.lastT = L.t;
      fx.memo.lastAge = -1;
    }
    const pa = fx.memo.lastAge ?? -1, at = (n: number) => pa < n && la >= n;
    for (const an of anims) {
      const a = animAge(an);
      if (a < 0) continue;
      const fire = (n: number) => pa - (la - a) < n && a >= n;
      if (an === 'feast') {
        if (fire(2)) {
          fx.blink('#fff2c0', 0.35);
          fx.kick(5);
          for (const c of ['#ff7a8a', '#ffd23a', '#7ad0ff', '#9be36f']) fx.burst(X(PLAZA.x), Y(PLAZA.y) - R(0.05), c, 10, 4, 2.4);
          fx.ring(X(PLAZA.x), Y(PLAZA.y), '#fff2a0', R(0.2), 5);
        }
        if (fire(20)) for (const c of ['#ff7a8a', '#ffd23a']) fx.burst(X(PLAZA.x), Y(PLAZA.y) - R(0.08), c, 8, 3, 2);
      } else if (an === 'harvest') {
        for (const n of [4, 12, 20, 28]) if (fire(n)) fx.burst(X(0.08 + (n / 28) * 0.24), Y(0.6), '#ffe680', 8, 2.5, 2);
        if (fire(4)) (fx.blink('#fff6c0', 0.3), fx.kick(3));
      } else if (an === 'wall') {
        for (const n of [8, 18, 28]) if (fire(n)) (fx.kick(7), fx.burst(X(0.5 + (n - 18) * 0.012), Y(WALL.y + 0.02), '#d8c2a0', 14, 3, 3), fx.ring(X(0.5), Y(WALL.y + 0.02), '#ffffff', R(0.15), 3));
      } else if (an === 'train') {
        for (let q = 0; q < 5; q++) {
          const u = c01((a - q * 5) / 60), sx2 = X(0.3 + u * 0.42), sy2 = Y(PLAZA.y + 0.045);
          if (u > 0 && u < 1) soldier(ctx, sx2, sy2 - Math.abs(Math.sin(a * 0.4 + q)) * R(0.005), R(0.022), t, q);
        }
        if (fire(6)) fx.kick(2);
      } else if (an === 'coinsIn' || an === 'coinsOut') {
        const into = an === 'coinsIn';
        for (let q = 0; q < 8; q++) {
          const u = c01((a - q * 4) / 26);
          if (u <= 0 || u >= 1) continue;
          const [hx, hy] = HOUSES[q % HOUSES.length];
          const fx0 = into ? X(hx) : X(TREASURY.x), fy0 = into ? Y(hy) - R(0.06) : Y(TREASURY.y) - R(0.04);
          const tx0 = into ? X(TREASURY.x - 0.05) : X(hx), ty0 = into ? Y(TREASURY.y) : Y(hy) - R(0.06);
          const cx2 = fx0 + (tx0 - fx0) * u, cy2 = fy0 + (ty0 - fy0) * u - Math.sin(u * Math.PI) * R(0.12);
          ctx.fillStyle = '#ffd23a';
          ctx.strokeStyle = '#a07400';
          ctx.lineWidth = 1.2;
          ell(ctx, cx2, cy2, R(0.011) * Math.abs(Math.cos(t * 0.3 + q)) + 1, R(0.011));
          ctx.fill();
          ctx.stroke();
          if (u > 0.92) fx.burst(tx0, ty0, '#ffe680', 2, 1.6, 1.6);
        }
        if (!into && fire(30)) for (const c of ['#ff7aa8', '#7ad0ff', '#ffd23a']) fx.burst(X(0.77), Y(0.6), c, 6, 2.5, 2);
      } else if (an === 'rain') {
        const u = eo(a / 18), cx2 = X(-0.1 + u * 0.32), cy2 = Y(0.48);
        ctx.save();
        ctx.globalAlpha = a > 70 ? c01((84 - a) / 14) : 1;
        puff(ctx, cx2, cy2, R(0.26), R(0.07), '#ffffff', '#b9cbe0', 8);
        ctx.strokeStyle = 'rgba(80,150,240,.8)';
        ctx.lineWidth = 1.6;
        if (a > 12 && a < 70)
          for (let q = 0; q < 16; q++) {
            const rx2 = cx2 - R(0.11) + q * R(0.015), ry2 = cy2 + ((a * 5 + q * 13) % R(0.16));
            ctx.beginPath();
            ctx.moveTo(rx2, ry2);
            ctx.lineTo(rx2 - 2, ry2 + R(0.02));
            ctx.stroke();
          }
        ctx.restore();
        if (a > 46) {
          ctx.save();
          ctx.globalAlpha = c01((a - 46) / 12) * 0.75;
          ctx.lineWidth = R(0.01);
          ['#ff6a6a', '#ffb44a', '#ffe14a', '#6ad46a', '#5ab0ff', '#9a7aff'].forEach((c, i) => {
            ctx.strokeStyle = c;
            ctx.beginPath();
            ctx.arc(X(0.22), Y(0.66), R(0.2 - i * 0.01), Math.PI * 1.05, Math.PI * 1.95);
            ctx.stroke();
          });
          ctx.restore();
        }
      } else if (an === 'fireworks') {
        for (let q = 0; q < 4; q++) {
          const a2 = a - q * 9, ox = X(0.3 + q * 0.13), top = Y(0.2 + (q % 2) * 0.05);
          if (a2 < 0) continue;
          if (a2 < 16) {
            const yy = Y(PLAZA.y) + (top - Y(PLAZA.y)) * eo(a2 / 16);
            ctx.fillStyle = '#fff6c0';
            ell(ctx, ox, yy, R(0.006), R(0.012));
            ctx.fill();
          }
          if (pa - (la - a2) < 16 && a2 >= 16) {
            const c = ['#ff5aa0', '#ffd23a', '#5ab0ff', '#9be36f'][q];
            fx.burst(ox, top, c, 26, 4.5, 2.6);
            fx.burst(ox, top, '#ffffff', 8, 2, 1.8);
            fx.ring(ox, top, c, R(0.12), 3);
            fx.kick(4);
          }
        }
      } else if (an === 'music') {
        for (let q = 0; q < 6; q++) {
          const u = ((a + q * 12) % 50) / 50, nx = X(GUEST.x + 0.08 + q * 0.06) + Math.sin(u * 6 + q) * R(0.02), ny = Y(0.95) - u * R(0.35);
          ctx.globalAlpha = 1 - u;
          ctx.fillStyle = ['#ff6aa0', '#5ab0ff', '#ffb000'][q % 3];
          ell(ctx, nx, ny, R(0.011), R(0.008), -0.3);
          ctx.fill();
          ctx.fillRect(nx + R(0.008), ny - R(0.03), 2, R(0.03));
          ctx.globalAlpha = 1;
        }
      } else if (an === 'rest') {
        font(0.04, 900);
        ctx.textAlign = 'center';
        for (const [hx, hy] of [...HOUSES.slice(0, 3), [CASTLE.x, CASTLE.y - 0.15]]) {
          const u = ((a * 0.02 + hx * 3) % 1);
          ctx.globalAlpha = c01(1 - u) * c01(a / 10);
          ctx.fillStyle = '#5a6aa0';
          ctx.fillText('Z', X(hx) + u * R(0.03), Y(hy) - R(0.1) - u * R(0.06));
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(40,50,110,${0.12 * Math.sin(c01(a / 84) * Math.PI)})`;
        ctx.fillRect(0, Y(0.165), w, Y(0.68));
      } else if (an === 'magic') {
        for (let q = 0; q < 14; q++) {
          const ang = q * 0.45 + a * 0.12, rad = R(0.05 + (a / 84) * 0.18), sx2 = X(CASTLE.x) + Math.cos(ang) * rad, sy2 = Y(CASTLE.y - 0.08) + Math.sin(ang) * rad * 0.5;
          ctx.fillStyle = ['#ffe14a', '#ff9ef0', '#9ad8ff'][q % 3];
          ctx.globalAlpha = c01((84 - a) / 20);
          starPath(ctx, sx2, sy2, R(0.012));
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (fire(3)) (fx.blink('#f4e8ff', 0.4), fx.ring(X(CASTLE.x), Y(CASTLE.y - 0.08), '#e0c8ff', R(0.3), 5));
      } else if (an === 'dragonFeed' || an === 'dragonShoo') {
        // 용은 아래 손님 자리에서 따로 그린다
        if (an === 'dragonFeed' && a > 28 && a < 76) {
          const px = X(CASTLE.x + 0.12), py = Y(0.36);
          ctx.fillStyle = lin(ctx, 0, py - R(0.02), 0, py + R(0.02), [0, '#ffc874'], [1, '#c87a30']);
          ell(ctx, px, py, R(0.04) * (1 - c01((a - 40) / 36)) + 2, R(0.016));
          ctx.fill();
          ctx.strokeStyle = OUT;
          ctx.stroke();
          if (Math.floor(a / 6) % 2) (ctx.fillStyle = '#ff7aa8'), heartPath(ctx, px + R(0.04), py - R(0.05) - (a % 12), R(0.012)), ctx.fill();
        }
        if (an === 'dragonShoo') {
          for (let q = 0; q < 4; q++) {
            const u = c01((a - q * 4) / 40), sx2 = X(0.5 - 0.1 + q * 0.06) - u * R(0.1), sy2 = Y(WALL.y + 0.04) + u * R(0.08);
            if (u > 0) soldier(ctx, sx2, sy2, R(0.02), t, q);
          }
        }
      } else if (an === 'bread') {
        for (let q = 0; q < 6; q++) {
          const u = c01((a - q * 4) / 26);
          if (u <= 0 || u >= 1) continue;
          const fx0 = X(GUEST.x + 0.05), fy0 = Y(0.92), tx0 = X(PLAZA.x - 0.1 + q * 0.04), ty0 = Y(PLAZA.y);
          const bx2 = fx0 + (tx0 - fx0) * u, by2 = fy0 + (ty0 - fy0) * u - Math.sin(u * Math.PI) * R(0.15);
          ctx.fillStyle = lin(ctx, 0, by2 - R(0.01), 0, by2 + R(0.01), [0, '#ffc874'], [1, '#c87a30']);
          ell(ctx, bx2, by2, R(0.014), R(0.009), t * 0.2 + q);
          ctx.fill();
          ctx.strokeStyle = OUT;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      } else if (an === 'store') {
        for (let q = 0; q < 3; q++) {
          const u = c01((a - q * 6) / 30), sx2 = X(0.14 + 0.06 * q) + (X(BARN.x) - X(0.14 + 0.06 * q)) * u, sy2 = Y(0.62) + (Y(BARN.y) - Y(0.62)) * u;
          if (u <= 0 || u >= 1) continue;
          ctx.save();
          ctx.translate(sx2, sy2);
          ctx.rotate(u * 8);
          ctx.fillStyle = '#e8cf9a';
          ctx.strokeStyle = OUT;
          ctx.lineWidth = 1;
          ell(ctx, 0, 0, R(0.012), R(0.014));
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    // 고르자마자: 바뀐 막대 숫자가 떠오른다 + 큰 글자
    if (at(6)) {
      for (let i = 0; i < 4; i++) {
        const dv = L.e[i];
        if (!dv) continue;
        fx.pop(X(0.02 + i * 0.245 + 0.12), Y(0.2), `${BAR[i]} ${dv > 0 ? '+' : ''}${dv}`, dv > 0 ? '#3fe060' : '#ff5a6a', Math.max(14, R(0.05)));
      }
    }
    fx.memo.lastAge = la;
  }
  // 큰 글자 (결과마다 한 번)
  if (acting) {
    const L = s.last!, word = L.k === 2 ? (['둘 다!', '#e8a010'] as [string, string]) : BIG_WORD[L.an[0]];
    if (word && la < 60) {
      if (fx.memo.bigT !== L.t) (fx.memo.bigT = L.t), fx.kick(3);
      const pop = la < 8 ? 0.6 + 0.5 * eo(la / 8) : 1.1 - 0.1 * c01((la - 8) / 10);
      bigWord(ctx, word[0], X(0.5), Y(0.36), Math.max(26, R(0.1)), word[1], la < 45 ? 1 : (60 - la) / 15, pop);
    }
  }

  // ═════════ 사건 (눈보라 · 전투 · 용 친구) ═════════
  if (s.phase === 'event' && s.ev) {
    const E = s.ev, a = evA;
    const pe = fx.memo.evT === E.t ? fx.memo.evAge ?? -1 : -1;
    fx.memo.evT = E.t;
    const fire = (n: number) => pe < n && a >= n;
    if (E.k === 'blizzard') {
      const u = eo(a / 30);
      ctx.save();
      ctx.globalAlpha = a > 100 ? c01((EV_T - a) / 24) : 1;
      puff(ctx, X(-0.2 + u * 0.7), Y(0.3), R(0.9), R(0.14), '#eef2f8', '#a8b4c8', 66);
      ctx.fillStyle = `rgba(235,242,252,${0.45 * Math.sin(c01(a / EV_T) * Math.PI)})`;
      ctx.fillRect(0, Y(0.165), w, Y(0.68));
      ctx.fillStyle = '#ffffff';
      for (let q = 0; q < 60; q++) {
        const sx2 = ((hsh(q) * w * 1.5 + a * (6 + hsh(q + 3) * 4)) % (w * 1.3)) - w * 0.15, sy2 = Y(0.2) + ((hsh(q + 9) * Y(0.65) + a * 2.5) % Y(0.65));
        ell(ctx, sx2, sy2, R(0.004 + hsh(q + 2) * 0.004), R(0.004 + hsh(q + 2) * 0.004));
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 2;
      for (let q = 0; q < 8; q++) {
        const yy = Y(0.3 + hsh(q + 30) * 0.45), xx = ((hsh(q + 31) * w + a * 9) % (w * 1.4)) - w * 0.2;
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.quadraticCurveTo(xx + R(0.06), yy - R(0.01), xx + R(0.12), yy);
        ctx.stroke();
      }
      ctx.restore();
      if (fire(14)) (fx.kick(8), fx.blink('#ffffff', 0.5));
      if (a < 90) bigWord(ctx, '눈보라!', X(0.5), Y(0.34), Math.max(28, R(0.11)), '#4a86d8', a < 80 ? 1 : (90 - a) / 10, a < 8 ? 0.6 + 0.5 * eo(a / 8) : 1.05);
      else bigWord(ctx, s.stormOk ? '든든하게 버텼다!' : '휴, 지나갔다…', X(0.5), Y(0.34), Math.max(20, R(0.075)), s.stormOk ? '#2fbf4a' : '#8a7a6a', 1, 1);
    } else if (E.k === 'battle') {
      const march = eo(a / 40), clash = a >= 40 && a < 72, after = a >= 72;
      for (let q = 0; q < 7; q++) {
        let ex = X(0.95 - march * 0.22) + q * R(0.035), ey = Y(0.6 + (q % 3) * 0.025);
        if (after) ex += (E.win ? 1 : -0.4) * (a - 72) * R(0.008);
        if (clash) ex += Math.sin(a * 0.8 + q) * R(0.006);
        soldier(ctx, ex, ey, R(0.02), t, q, true);
      }
      if (clash && a % 6 === 0) (fx.burst(X(0.72), Y(0.6), '#ffe680', 6, 3, 2), fx.burst(X(0.72), Y(0.62), '#d8c2a0', 4, 2, 2.5));
      if (fire(40)) (fx.kick(10), fx.blink('#ffffff', 0.35));
      if (after && fire(72)) {
        if (E.win) for (const c of ['#ffd23a', '#4f8ef7', '#ffffff']) fx.burst(X(0.5), Y(0.5), c, 14, 4, 2.6);
        else (fx.kick(12), fx.burst(X(0.55), Y(WALL.y), '#c8b49a', 20, 4, 3));
      }
      if (a < 70) bigWord(ctx, '적군이다!', X(0.5), Y(0.34), Math.max(26, R(0.1)), '#d0303a', 1, a < 8 ? 0.6 + 0.5 * eo(a / 8) : 1.05);
      else bigWord(ctx, E.win ? '이겼다!' : '으앗, 졌다…', X(0.5), Y(0.34), Math.max(28, R(0.11)), E.win ? '#2f7ae0' : '#8a7a6a', 1, a < 80 ? 0.6 + 0.5 * eo((a - 72) / 8) : 1.05);
    } else if (E.k === 'friend') {
      const ang = a * 0.08, rad = R(0.22) * (1 - c01((a - 50) / 30));
      const dx = X(CASTLE.x) + Math.cos(ang) * rad + (a > 50 ? R(0.11) * c01((a - 50) / 30) : 0), dy = Y(0.36) + Math.sin(ang) * rad * 0.4 + (a > 50 ? R(0.03) * c01((a - 50) / 30) : 0);
      if (a < 80) {
        ctx.save();
        ctx.translate(dx, dy);
        ctx.scale(0.55, 0.55);
        drawDragon(ctx, R(0.003) * 2.2, 'happy', t);
        ctx.restore();
      }
      if (a % 8 === 0) {
        ctx.fillStyle = '#ff7aa8';
        fx.burst(dx, dy - R(0.03), '#ff9ec0', 4, 2, 2.2);
      }
      if (fire(80)) (fx.blink('#ffe8f4', 0.5), fx.kick(6), fx.burst(X(CASTLE.x + 0.11), Y(0.37), '#ff7aa8', 24, 4, 2.6));
      bigWord(ctx, '용과 친구가 됐어요!', X(0.5), Y(0.3), Math.max(18, R(0.07)), '#2fbf6a', 1, a < 8 ? 0.6 + 0.5 * eo(a / 8) : 1);
    }
    fx.memo.evAge = a;
  }

  // ═════════ 실패: 막대마다 다른 개그 ═════════
  if (s.phase === 'fail' && s.broke) {
    const a = s.pt, b = s.broke;
    if (fx.memo.failT !== s.t - a) (fx.memo.failT = s.t - a), fx.kick(10), fx.blink('#ffd0d0', 0.4);
    const crowd = (col: string, kind: number) => {
      for (let q = 0; q < 7; q++) {
        const u = ((a * 0.012 + q / 7) % 1), px = X(0.1 + u * 0.8), py = Y(0.66 + (q % 3) * 0.03) - Math.abs(Math.sin(a * 0.3 + q)) * R(0.012);
        if (kind === 0) {
          // 쥐
          ctx.fillStyle = '#9a9aa8';
          ell(ctx, px, py, R(0.014), R(0.008));
          ctx.fill();
          ell(ctx, px + R(0.012), py - R(0.005), R(0.006), R(0.006));
          ctx.fill();
          ctx.fillStyle = '#f2c14e';
          ell(ctx, px - R(0.002), py - R(0.012), R(0.006), R(0.004));
          ctx.fill();
        } else if (kind === 1) villager(ctx, px, py, R(0.022), col, 1, Math.abs(Math.sin(a * 0.4 + q)) * R(0.02), 1, q);
        else if (kind === 2) {
          // 복면 도둑 + 자루
          villager(ctx, px, py, R(0.022), '#3a3a4a', 1, 0, 0, q, 2);
          ctx.fillStyle = '#2a2a3a';
          rr(ctx, px - R(0.009), py - R(0.032), R(0.018), R(0.005), 1);
          ctx.fill();
          ctx.fillStyle = '#e8cf9a';
          ell(ctx, px - R(0.016), py - R(0.02), R(0.01), R(0.011));
          ctx.fill();
        } else if (kind === 3) soldier(ctx, px, py, R(0.02), t, q, true);
        else villager(ctx, X(0.9 - u * 0.8), py, R(0.022), col, -1, 0, 0, q);
      }
    };
    const kind = b.bar === 0 ? (b.hi ? 0 : 4) : b.bar === 1 ? (b.hi ? 1 : 4) : b.bar === 2 ? (b.hi ? 2 : 4) : b.hi ? 4 : 3;
    crowd(['#9be36f', '#ff7a8a', '#ffd23a', '#7ac8ff'][b.bar], kind);
    if (b.bar === 3 && b.hi) {
      // 장군이 왕관을 쓴다
      ctx.save();
      ctx.translate(X(0.5), Y(0.5));
      soldier(ctx, 0, 0, R(0.04), t, 0);
      ctx.fillStyle = '#ffd23a';
      ctx.strokeStyle = OUT;
      ctx.beginPath();
      ctx.moveTo(-R(0.015), -R(0.068));
      ctx.lineTo(-R(0.017), -R(0.085));
      ctx.lineTo(-R(0.006), -R(0.076));
      ctx.lineTo(0, -R(0.09));
      ctx.lineTo(R(0.006), -R(0.076));
      ctx.lineTo(R(0.017), -R(0.085));
      ctx.lineTo(R(0.015), -R(0.068));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // ═════════ 테라스: 손님 · 왕 · 말풍선 ═════════
  {
    const fy = Y(TERR);
    // 난간
    ctx.fillStyle = lin(ctx, 0, fy, 0, Y(1.15), [0, P.floor[0]], [1, P.floor[1]]);
    ctx.fillRect(0, fy + R(0.03), w, h - fy);
    ctx.strokeStyle = 'rgba(140,100,60,.25)';
    ctx.lineWidth = 1;
    for (let q = 1; q < 6; q++) {
      const yy = fy + R(0.03) + q * R(0.05);
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(w, yy);
      ctx.stroke();
    }
    for (let q = -6; q <= 6; q++) {
      ctx.beginPath();
      ctx.moveTo(X(0.5 + q * 0.09), fy + R(0.03));
      ctx.lineTo(X(0.5 + q * 0.16), Y(1.15));
      ctx.stroke();
    }
    // 빨간 융단
    ctx.fillStyle = lin(ctx, 0, fy, 0, Y(1.15), [0, '#e85a6a'], [1, '#c43a4a']);
    ctx.beginPath();
    ctx.moveTo(X(0.42), fy + R(0.03));
    ctx.lineTo(X(0.58), fy + R(0.03));
    ctx.lineTo(X(0.66), Y(1.15));
    ctx.lineTo(X(0.34), Y(1.15));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffd23a';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 난간 기둥
    ctx.fillStyle = lin(ctx, 0, fy - R(0.03), 0, fy + R(0.04), [0, '#fffaf0'], [1, '#e2cfb0']);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    rr(ctx, -2, fy - R(0.02), w + 4, R(0.018), 3);
    ctx.fill();
    ctx.stroke();
    for (let q = 0; q < 14; q++) {
      const bx2 = X(0.035 + q * 0.0715);
      if (bx2 > X(0.4) && bx2 < X(0.6)) continue;
      ctx.beginPath();
      ctx.moveTo(bx2 - R(0.012), fy);
      ctx.quadraticCurveTo(bx2 - R(0.02), fy + R(0.02), bx2 - R(0.008), fy + R(0.035));
      ctx.lineTo(bx2 + R(0.008), fy + R(0.035));
      ctx.quadraticCurveTo(bx2 + R(0.02), fy + R(0.02), bx2 + R(0.012), fy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    rr(ctx, -2, fy + R(0.033), w + 4, R(0.012), 2);
    ctx.fill();
    ctx.stroke();
    // 꽃 화분
    for (const px of [0.405, 0.595]) {
      ctx.fillStyle = '#d8784a';
      rr(ctx, X(px) - R(0.02), fy - R(0.03), R(0.04), R(0.03), 3);
      ctx.fill();
      ctx.stroke();
      for (let q = 0; q < 4; q++) {
        ctx.fillStyle = ['#ff7aa8', '#ffd23a', '#ffffff', '#ff9a5a'][q];
        ell(ctx, X(px) + (q - 1.5) * R(0.011), fy - R(0.038) - (q % 2) * R(0.008), R(0.008), R(0.008));
        ctx.fill();
      }
    }
  }
  // 손님
  {
    const c = s.cur, who = c.c.who;
    let gx = GUEST.x, gy = GUEST.y, mood: Mood = 'idle', alpha = 1, flip = 1;
    if (s.phase === 'walk') {
      const u = eo(s.pt / Math.max(1, Math.min(s.walkT, 34)));
      gx = -0.2 + (GUEST.x + 0.2) * u;
    } else if (s.phase === 'act' && s.last) {
      const L = s.last, bad = L.an.includes('refuse') || L.an.includes('dragonShoo');
      mood = bad ? 'sad' : 'happy';
      if (la > 50) (gx = GUEST.x - (la - 50) * 0.012), (flip = -1);
      if (L.an.includes('dragonFeed')) {
        const u = eo(la / 28);
        gx = GUEST.x + (CASTLE.x + 0.12 - GUEST.x) * u;
        gy = GUEST.y + (0.4 - GUEST.y) * u;
        if (la > 70) alpha = c01((90 - la) / 20);
      }
      if (L.an.includes('dragonShoo')) (gy = GUEST.y - la * 0.004), (gx = GUEST.x - la * 0.006), (flip = -1);
    } else if (s.phase !== 'ask') alpha = 0;
    if (s.phase === 'event' || s.phase === 'result' || s.phase === 'fail') alpha = 0;
    if (alpha > 0) {
      ctx.save();
      ctx.globalAlpha = alpha;
      const hop = mood === 'happy' && s.phase === 'act' ? Math.abs(Math.sin(la * 0.35)) * R(0.03) * c01((50 - la) / 10) : 0;
      const idleB = s.phase === 'ask' ? Math.sin(t * 0.12) * R(0.003) : 0;
      const H = who === 'dragon' ? R(0.27) : R(0.25);
      drawGuest(ctx, who, X(gx), Y(gy) - hop + idleB, H, mood, t, flip);
      ctx.restore();
      // 시무룩: 머리 위 작은 비구름
      if (mood === 'sad' && s.phase === 'act') {
        const cx2 = X(gx), cy2 = Y(gy) - R(0.27);
        puff(ctx, cx2, cy2, R(0.08), R(0.03), '#c8d0dc', '#9aa4b4', 3);
        ctx.strokeStyle = 'rgba(80,140,230,.8)';
        ctx.lineWidth = 1.4;
        for (let q = 0; q < 4; q++) {
          const ry2 = cy2 + ((la * 1.5 + q * 5) % 14);
          ctx.beginPath();
          ctx.moveTo(cx2 - R(0.025) + q * R(0.016), ry2);
          ctx.lineTo(cx2 - R(0.027) + q * R(0.016), ry2 + 4);
          ctx.stroke();
        }
      }
    }
  }
  // 왕
  {
    let mood: Mood = 'idle', crownOff = 0, hop = 0;
    if (s.phase === 'act' && s.last) {
      mood = s.broke ? 'wow' : s.last.an.includes('refuse') ? 'idle' : 'happy';
      if (!s.broke && la < 40) hop = Math.abs(Math.sin(la * 0.3)) * 6 * c01((40 - la) / 10);
    } else if (s.phase === 'event') mood = s.ev?.k === 'blizzard' && evA < 90 ? 'wow' : s.ev?.win || s.ev?.k === 'friend' ? 'happy' : 'wow';
    else if (s.phase === 'result') (mood = 'happy'), (hop = Math.abs(Math.sin(s.pt * 0.25)) * 8);
    else if (s.phase === 'fail') {
      mood = 'dizzy';
      crownOff = eo(s.pt / 30) * (s.pt < 120 ? 1 : 1 - c01((s.pt - 120) / 40));
      if (s.broke?.bar === 1 && s.broke.hi) hop = Math.abs(Math.sin(s.pt * 0.2)) * 30;
    } else if (s.v.some((x) => x <= 1 || x >= MAXV - 1)) mood = 'wow';
    drawKing(ctx, X(KING.x), Y(KING.y), R(0.24), mood, t, crownOff, hop);
  }
  // 말풍선 (부탁 한 줄 · 고른 뒤엔 대답)
  if (s.phase === 'ask' || (s.phase === 'act' && la < 60) || (s.phase === 'walk' && s.pt > s.walkT - 14)) {
    const c = s.cur;
    const text = s.phase === 'act' && s.last ? (s.last.k === 2 ? '둘 다요? 최고!' : REPLY[s.last.an[0]]) : c.c.say;
    const bx = X(0.345), by = Y(0.87), bw = X(0.37);
    font(0.046, 900);
    const lines = wrapText(ctx, text, bw - R(0.04));
    const bh = R(0.05) + lines.length * R(0.052) + R(0.02);
    const pop = s.phase === 'walk' ? eo((s.pt - (s.walkT - 14)) / 10) : 1;
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(pop, pop);
    ctx.fillStyle = 'rgba(90,60,30,.25)';
    rr(ctx, 3, 4, bw, bh, R(0.03));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    rr(ctx, 0, 0, bw, bh, R(0.03));
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(R(0.01), bh * 0.45);
    ctx.lineTo(-R(0.045), bh * 0.62);
    ctx.lineTo(R(0.01), bh * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(R(0.01), bh * 0.45);
    ctx.lineTo(-R(0.045), bh * 0.62);
    ctx.lineTo(R(0.01), bh * 0.72);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(R(0.008), bh * 0.46, R(0.006), bh * 0.25);
    font(0.034, 800);
    ctx.fillStyle = '#a07040';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(WHO_NAME[c.c.who], R(0.022), R(0.027));
    font(0.046, 900);
    ctx.fillStyle = INK;
    lines.forEach((ln, i) => ctx.fillText(ln, R(0.022), R(0.073) + i * R(0.052)));
    ctx.restore();
  }

  // ═════════ 판 안내 카드 (계절 시작 · 깸 · 실패) ═════════
  {
    let head = '', sub = '', news = '', a = 1, age = 0;
    if (s.phase === 'walk' && s.walkT === INTRO_T) {
      age = s.pt;
      a = Math.min(1, age / 8, (INTRO_T - age) / 12);
      head = `${s.again ? '다시! ' : ''}${s.stage + 1}. ${d.name}`;
      sub = `${d.days}일 버티기`;
      news = d.news && !s.again ? d.news : '';
    } else if (s.phase === 'result') {
      age = s.pt;
      a = Math.min(1, age / 8);
      head = s.won ? '꼬마 왕국 일곱 계절 끝!' : `${d.name} 버티기 성공!`;
    } else if (s.phase === 'fail' && s.broke) {
      age = s.pt;
      a = Math.min(1, age / 8);
      head = FAIL_TXT[s.broke.bar][s.broke.hi ? 1 : 0];
      sub = s.hearts > 0 ? '하트 -1 · 같은 계절 다시' : '왕국 끝 — 다시 해 봐요';
    }
    if (head) {
      const cy = Y(0.44), pop = Math.min(1, 0.5 + age / 10);
      ctx.save();
      ctx.globalAlpha = c01(a);
      font(0.062, 900);
      const w1 = ctx.measureText(head).width;
      font(0.04, 800);
      const w2 = Math.max(sub ? ctx.measureText(sub).width : 0, news ? ctx.measureText('NEW ' + news).width + R(0.06) : 0);
      const cw = Math.min(w - R(0.04), Math.max(w1, w2) + R(0.1)), ch = (R(0.1) + (sub ? R(0.05) : 0) + (news ? R(0.055) : 0) + (s.phase === 'result' ? R(0.07) : 0)) * pop;
      ctx.translate(w / 2, cy);
      ctx.fillStyle = 'rgba(90,50,20,.3)';
      rr(ctx, -cw / 2 + 3, -ch / 2 + 5, cw, ch, R(0.04));
      ctx.fill();
      ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [0, '#fffaf0'], [1, '#ffe8c4']);
      rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.04));
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = SEASON_ICON[sea];
      ctx.lineWidth = 2;
      rr(ctx, -cw / 2 + 4, -ch / 2 + 4, cw - 8, ch - 8, R(0.032));
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let yy = -ch / 2 + R(0.055);
      font(0.062, 900);
      ctx.fillStyle = s.phase === 'fail' ? '#c0303a' : s.phase === 'result' ? '#c46a00' : INK;
      ctx.fillText(head, 0, yy, w - R(0.08));
      yy += R(0.055);
      if (s.phase === 'result') {
        const nS = s.starOk.length;
        for (let j = 0; j < nS; j++) {
          const ag = s.pt - (16 + j * 14), sx2 = (j - (nS - 1) / 2) * R(0.1), sy2 = yy + R(0.015);
          const pS = ag < 0 ? 0 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
          starPath(ctx, sx2, sy2, R(0.035) * (ag < 0 ? 1 : pS));
          ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(90,50,20,.15)';
          ctx.fill();
          ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#9a5a08' : 'rgba(90,50,20,.35)';
          ctx.lineWidth = 1.6;
          ctx.stroke();
          if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(w / 2 + sx2, cy + sy2, '#ffd23a', 16, 3, 2.4), fx.kick(3);
        }
        yy += R(0.07);
      }
      if (sub) {
        font(0.04, 800);
        ctx.fillStyle = s.phase === 'fail' ? '#7a4a3a' : '#7a5a3a';
        ctx.fillText(sub, 0, yy - R(0.005), w - R(0.08));
        yy += R(0.05);
      }
      if (news) {
        font(0.038, 900);
        const nw = ctx.measureText(news).width;
        const tagW = R(0.08);
        ctx.fillStyle = '#ff4a6a';
        rr(ctx, -(nw + tagW) / 2 - R(0.01), yy - R(0.022), tagW, R(0.042), R(0.02));
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        font(0.03, 900);
        ctx.fillText('NEW', -(nw + tagW) / 2 - R(0.01) + tagW / 2, yy);
        font(0.038, 900);
        ctx.fillStyle = '#d0405a';
        ctx.textAlign = 'left';
        ctx.fillText(news, -(nw + tagW) / 2 + tagW + R(0.005), yy, w - R(0.2));
      }
      ctx.restore();
    }
  }
  ctx.restore();

  // ═════════ HUD (흔들림 밖) ═════════
  ctx.textBaseline = 'middle';
  const hb = R(0.075);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, 'rgba(255,250,240,.96)'], [1, 'rgba(255,238,210,.95)']);
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(90,50,20,.25)';
  ctx.fillRect(0, hb - 1.5, w, 1.5);
  {
    const cx = R(0.05), cy = hb / 2;
    ctx.fillStyle = SEASON_ICON[sea];
    ell(ctx, cx, cy, R(0.03), R(0.03));
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.fillText(String(s.stage + 1), cx, cy + 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    font(0.05, 900);
    ctx.fillText(d.name, R(0.095), cy + 1);
    const nw = ctx.measureText(d.name).width;
    font(0.038, 800);
    ctx.fillStyle = '#8a6a4a';
    const dayN = Math.min(d.days, s.day + (s.phase === 'result' ? 0 : 1));
    ctx.fillText(`  ${dayN} / ${d.days}일`, R(0.095) + nw, cy + 2);
  }
  {
    const cy = hb / 2;
    ctx.textAlign = 'right';
    font(0.046, 900);
    const st = String(s.stars), sw = ctx.measureText(st).width;
    ctx.fillStyle = '#d08a00';
    ctx.fillText(st, w - R(0.03), cy + 1);
    starPath(ctx, w - R(0.03) - sw - R(0.028), cy, R(0.024));
    ctx.fillStyle = '#ffd23a';
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    for (let j = 0; j < 3; j++) {
      const hx2 = w - R(0.03) - sw - R(0.095) - j * R(0.056);
      heartPath(ctx, hx2, cy, R(0.02));
      ctx.fillStyle = 2 - j < s.hearts ? lin(ctx, hx2, cy - R(0.02), hx2, cy + R(0.02), [0, '#ff8a95'], [1, '#e2334a']) : 'rgba(90,50,20,.12)';
      ctx.fill();
      ctx.strokeStyle = 2 - j < s.hearts ? '#8a1a2a' : 'rgba(90,50,20,.3)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }
  // 살림 막대 넷
  {
    const y0 = R(0.08), bh2 = R(0.085);
    ctx.fillStyle = 'rgba(255,248,236,.92)';
    ctx.fillRect(0, y0, w, bh2);
    ctx.fillStyle = 'rgba(90,50,20,.2)';
    ctx.fillRect(0, y0 + bh2 - 1, w, 1);
    for (let i = 0; i < 4; i++) {
      const x0 = R(0.015 + i * 0.247), v = shown[i], real = s.v[i];
      const danger = real <= 1 || real >= MAXV - 1;
      const pulse = danger ? 0.5 + 0.5 * Math.sin(t * 0.3) : 0;
      if (danger) {
        ctx.fillStyle = `rgba(255,70,80,${0.15 + 0.2 * pulse})`;
        rr(ctx, x0 - R(0.005), y0 + R(0.006), R(0.24), bh2 - R(0.012), R(0.02));
        ctx.fill();
      }
      const ix = x0 + R(0.033), iy = y0 + bh2 / 2, moved = s.phase === 'act' && s.last && s.last.e[i] !== 0 && la < 40 ? 1 + 0.25 * Math.sin(la * 0.5) * c01((40 - la) / 20) : 1;
      drawIcon(ctx, i, ix, iy, R(0.03) * moved);
      // 이름 + 숫자
      font(0.034, 900);
      ctx.textAlign = 'left';
      ctx.fillStyle = BAR_DARK[i];
      ctx.fillText(BAR[i], x0 + R(0.07), y0 + R(0.026));
      ctx.textAlign = 'right';
      ctx.fillStyle = danger ? '#e0202e' : INK;
      ctx.fillText(danger ? (real <= 1 ? '바닥!' : '넘침!') : String(Math.round(real)), x0 + R(0.235), y0 + R(0.026));
      // 칸 막대
      const tx = x0 + R(0.07), tw = R(0.165), ty = y0 + R(0.047), th2 = R(0.024);
      ctx.fillStyle = 'rgba(90,50,20,.12)';
      rr(ctx, tx, ty, tw, th2, th2 / 2);
      ctx.fill();
      // 양 끝 빨간 칸
      ctx.fillStyle = 'rgba(255,80,90,.28)';
      rr(ctx, tx, ty, tw * 0.1, th2, th2 / 2);
      ctx.fill();
      rr(ctx, tx + tw * 0.9, ty, tw * 0.1, th2, th2 / 2);
      ctx.fill();
      if (v > 0.02) {
        ctx.fillStyle = lin(ctx, 0, ty, 0, ty + th2, [0, BAR_LIGHT[i]], [0.5, BAR_COL[i]], [1, BAR_DARK[i]]);
        rr(ctx, tx + 1, ty + 1, (tw - 2) * (v / MAXV), th2 - 2, (th2 - 2) / 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 1;
      for (let q = 1; q < 10; q++) {
        ctx.beginPath();
        ctx.moveTo(tx + (tw * q) / 10, ty + 2);
        ctx.lineTo(tx + (tw * q) / 10, ty + th2 - 2);
        ctx.stroke();
      }
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.2;
      rr(ctx, tx, ty, tw, th2, th2 / 2);
      ctx.stroke();
      // 가운데 표시 (반)
      ctx.fillStyle = OUT;
      tri(ctx, tx + tw / 2, ty - R(0.004), R(0.006), false);
      ctx.fill();
      // 목표 깃발: 눈보라 대비 식량 · 적군만큼 병사
      const goal = i === 0 && d.storm && !s.stormDone ? 7 : i === 3 && d.battle && !s.battleDone ? d.battle.enemy : -1;
      if (goal > 0) {
        const gx2 = tx + (tw * goal) / 10;
        ctx.strokeStyle = '#d0303a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gx2, ty - R(0.008));
        ctx.lineTo(gx2, ty + th2 + R(0.004));
        ctx.stroke();
        ctx.fillStyle = '#ff4a5a';
        ctx.beginPath();
        ctx.moveTo(gx2, ty - R(0.008));
        ctx.lineTo(gx2 + R(0.016), ty - R(0.003));
        ctx.lineTo(gx2, ty + R(0.002));
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // ═════════ 내일 손님 미리 보기 띠 · 첫 안내 ═════════
  const stripY = Y(1.12), stripH = R(0.058);
  {
    const first = s.stage === 0 && s.firstTap < 0;
    const nx = s.queue[0];
    if (first || s.phase === 'ask' || s.phase === 'walk' || s.phase === 'act') {
      if (first) {
        font(0.042, 900);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,250,240,.92)';
        rr(ctx, X(0.1), stripY - stripH / 2, X(0.8), stripH, stripH / 2);
        ctx.fill();
        ctx.strokeStyle = '#ff6a8a';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#d0405a';
        ctx.fillText(s.t - s.wiggleT < 60 ? '아래 큰 단추를 톡!' : '단추 하나를 톡 — 왕국이 바뀌어요!', X(0.5), stripY + 1);
      } else if (d.preview && nx && s.day + 1 < d.days) {
        ctx.fillStyle = 'rgba(255,250,240,.94)';
        rr(ctx, X(0.02), stripY - stripH / 2, X(0.96), stripH, stripH / 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(90,50,20,.35)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = '#7a5aa8';
        rr(ctx, X(0.025), stripY - stripH / 2 + 2, R(0.1), stripH - 4, (stripH - 4) / 2);
        ctx.fill();
        font(0.034, 900);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('내일', X(0.075), stripY + 1);
        // 작은 얼굴
        ctx.save();
        ctx.beginPath();
        ctx.arc(X(0.155), stripY, stripH * 0.46, 0, TAU);
        ctx.fillStyle = '#fff1dc';
        ctx.fill();
        ctx.clip();
        drawGuest(ctx, nx.c.who, X(0.155), stripY + stripH * 1.55, stripH * 2.4, 'idle', t);
        ctx.restore();
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 1.2;
        ell(ctx, X(0.155), stripY, stripH * 0.46, stripH * 0.46);
        ctx.stroke();
        // 두 갈래 미니 칩
        let xx = X(0.205);
        const ir = R(0.021);
        for (const [k, q] of [[0, nx.L], [1, nx.R]] as [number, Opt][]) {
          ctx.fillStyle = k ? 'rgba(122,90,168,.1)' : 'rgba(255,140,90,.1)';
          for (let i = 0; i < 4; i++) {
            if (!q.e[i]) continue;
            drawIcon(ctx, i, xx + ir, stripY, ir);
            tri(ctx, xx + ir * 2.5, stripY, ir * 0.6, q.e[i] > 0);
            ctx.fillStyle = q.e[i] > 0 ? '#2fbf4a' : '#ff4a5a';
            ctx.fill();
            font(0.03, 900);
            ctx.textAlign = 'left';
            ctx.fillStyle = q.e[i] > 0 ? '#1a8a34' : '#d0303a';
            ctx.fillText(String(Math.abs(q.e[i])), xx + ir * 3.2, stripY + 1);
            xx += ir * 4.3;
          }
          if (!k) {
            ctx.strokeStyle = 'rgba(90,50,20,.4)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(xx + R(0.004), stripY - stripH * 0.32);
            ctx.lineTo(xx + R(0.004), stripY + stripH * 0.32);
            ctx.stroke();
            xx += R(0.016);
          }
        }
      } else if (s.news && s.t - s.news.t < 150) {
        font(0.038, 900);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,250,240,.92)';
        rr(ctx, X(0.04), stripY - stripH / 2, X(0.92), stripH, stripH / 2);
        ctx.fill();
        ctx.fillStyle = '#d0405a';
        ctx.fillText(s.news.text, X(0.5), stripY + 1, X(0.88));
      }
    }
  }

  // ═════════ 큰 단추 ═════════
  {
    const live = s.phase === 'ask', bs = buttons(s);
    for (const b of bs) {
      const isCrown = b.k === 2, q = isCrown ? null : b.k === 0 ? s.cur.L : s.cur.R;
      const e = effOf(s.cur, b.k);
      const after = s.v.map((x, i) => x + e[i]);
      const willBreak = after.some((x) => x <= 0 || x >= MAXV);
      const chosen = s.phase === 'act' && s.last?.k === b.k && s.last.d === s.cur;
      const bob = live ? Math.sin(t * 0.12 + b.k * 1.3) * R(0.004) : 0;
      const wig = s.t - s.wiggleT < 30 ? Math.sin((s.t - s.wiggleT) * 0.8) * R(0.008) * (1 - (s.t - s.wiggleT) / 30) : 0;
      const x0 = X(b.x0) + wig, x1 = X(b.x1) + wig, y0 = Y(BY0) + bob, y1 = Y(BY1) + bob, bw = x1 - x0, bh = y1 - y0;
      const dim = !live && !chosen ? 0.5 : 1;
      ctx.save();
      ctx.globalAlpha = dim;
      // 그림자 · 몸통
      ctx.fillStyle = 'rgba(90,50,20,.35)';
      rr(ctx, x0 + 2, y0 + 5, bw, bh, R(0.035));
      ctx.fill();
      const top = isCrown ? ['#fff3a0', '#ffc93a'] : b.k === 0 ? ['#ffe6c8', '#ffc89a'] : ['#e6ddff', '#c8b4ff'];
      ctx.fillStyle = lin(ctx, 0, y0, 0, y1, [0, '#fffdf7'], [0.55, '#fff4e2'], [1, top[1]]);
      rr(ctx, x0, y0, bw, bh, R(0.035));
      ctx.fill();
      ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + R(0.06), [0, top[0]], [1, top[1]]);
      rr(ctx, x0, y0, bw, R(0.062), R(0.035));
      ctx.fill();
      ctx.fillRect(x0, y0 + R(0.035), bw, R(0.027));
      ctx.strokeStyle = chosen ? '#ff8a00' : OUT;
      ctx.lineWidth = chosen ? 4 : 2.2;
      rr(ctx, x0, y0, bw, bh, R(0.035));
      ctx.stroke();
      if (live) {
        ctx.strokeStyle = `rgba(255,255,255,${0.55 + 0.35 * Math.sin(t * 0.15 + b.k)})`;
        ctx.lineWidth = 2;
        rr(ctx, x0 + 3, y0 + 3, bw - 6, bh - 6, R(0.03));
        ctx.stroke();
      }
      // 키보드 고르기 테두리
      if (s.kbd && s.sel === b.k && live) {
        ctx.strokeStyle = '#ff3a8a';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 5]);
        ctx.lineDashOffset = -t * 0.6;
        rr(ctx, x0 - 4, y0 - 4, bw + 8, bh + 8, R(0.04));
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (isCrown) {
        // 왕관 그림 + "둘 다!"
        const cx = (x0 + x1) / 2, cy = y0 + R(0.09), k = R(0.03);
        ctx.fillStyle = lin(ctx, 0, cy - k, 0, cy + k * 0.4, [0, '#fff3a0'], [1, '#e8a810']);
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - k, cy + k * 0.4);
        ctx.lineTo(cx - k * 1.1, cy - k * 0.6);
        ctx.lineTo(cx - k * 0.5, cy - k * 0.1);
        ctx.lineTo(cx, cy - k * 0.9);
        ctx.lineTo(cx + k * 0.5, cy - k * 0.1);
        ctx.lineTo(cx + k * 1.1, cy - k * 0.6);
        ctx.lineTo(cx + k, cy + k * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        font(0.044, 900);
        ctx.fillStyle = '#9a5a08';
        ctx.fillText('둘 다!', cx, y0 + R(0.155));
        // 합친 결과 (작게, 두 줄)
        let i2 = 0;
        for (let i = 0; i < 4; i++) {
          if (!e[i]) continue;
          const col = i2 % 2, row = Math.floor(i2 / 2), r0 = R(0.016);
          const px = x0 + bw * (col ? 0.62 : 0.2), py = y0 + R(0.205) + row * R(0.04);
          drawIcon(ctx, i, px, py, r0);
          tri(ctx, px + r0 * 1.9, py, r0 * 0.6, e[i] > 0);
          ctx.fillStyle = e[i] > 0 ? '#2fbf4a' : '#ff4a5a';
          ctx.fill();
          font(0.03, 900);
          ctx.textAlign = 'left';
          ctx.fillStyle = e[i] > 0 ? '#1a8a34' : '#d0303a';
          ctx.fillText(String(Math.abs(e[i])), px + r0 * 2.6, py + 1);
          ctx.textAlign = 'center';
          i2++;
        }
      } else if (q) {
        // 라벨
        font(bw < R(0.4) ? 0.046 : 0.052, 900);
        ctx.fillStyle = INK;
        ctx.fillText(q.t, (x0 + x1) / 2, y0 + R(0.034), bw - R(0.03));
        // 결과 칩 (두 줄까지)
        const items = [0, 1, 2, 3].filter((i) => q.e[i]);
        const r0 = bw < R(0.4) ? R(0.03) : R(0.036);
        const rows = items.length > 2 && bw < R(0.4) ? 2 : 1;
        const perRow = Math.ceil(items.length / rows);
        for (let rIdx = 0; rIdx < rows; rIdx++) {
          const its = items.slice(rIdx * perRow, rIdx * perRow + perRow);
          const ws = its.map((i) => r0 * 1.05 + r0 * 0.42 + Math.min(4, Math.abs(q.e[i])) * r0 * 0.62 + r0 * 0.25);
          const tot = ws.reduce((a2, b2) => a2 + b2, 0) + (its.length - 1) * R(0.012);
          let xx = (x0 + x1) / 2 - tot / 2 + r0;
          const yy = y0 + (rows === 1 ? R(0.15) : R(0.115) + rIdx * R(0.075));
          its.forEach((i, j) => {
            const brk = after[i] <= 0 || after[i] >= MAXV;
            chip(ctx, i, q.e[i], xx, yy, r0, brk && live, t);
            xx += ws[j] + R(0.012);
          });
        }
        // 꼬리표: 이어짐 · 잔치 · 용 · 위험
        const tags: [string, string][] = [];
        if (willBreak) tags.push(['위험!', '#e0202e']);
        if (q.next) tags.push(['이야기 이어짐', '#7a5aa8']);
        if (q.tag === 'pay') tags.push(['고마운 손님', '#2f9a5a']);
        if (q.tag === 'feast' && d.stars.some((x) => x.k === 'feast')) tags.push(['잔치', '#ff5a7a']);
        if (q.tag === 'dragon') tags.push(['용이 좋아해요', '#2fbf6a']);
        font(0.032, 900);
        let tx = (x0 + x1) / 2;
        const ty = y1 - R(0.035);
        const tws = tags.map(([tt]) => ctx.measureText(tt).width + R(0.03));
        const ttot = tws.reduce((a2, b2) => a2 + b2, 0) + (tags.length - 1) * R(0.008);
        tx -= ttot / 2;
        tags.forEach(([tt, col], j) => {
          const pul = tt === '위험!' && live ? 0.75 + 0.25 * Math.sin(t * 0.4) : 1;
          ctx.globalAlpha = dim * pul;
          ctx.fillStyle = col;
          rr(ctx, tx, ty - R(0.02), tws[j], R(0.04), R(0.02));
          ctx.fill();
          ctx.globalAlpha = dim;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(tt, tx + tws[j] / 2, ty + 1, tws[j] - 4);
          tx += tws[j] + R(0.008);
        });
      }
      ctx.restore();
    }
    // 첫 안내 손가락 (왼쪽 단추를 가리킨다)
    if (s.stage === 0 && s.firstTap < 0 && live) {
      const b = bs[0], fx2 = X((b.x0 + b.x1) / 2) + R(0.06), fy2 = Y(BY0) + R(0.23) + Math.sin(t * 0.15) * R(0.015);
      drawFinger(ctx, fx2, fy2, R(0.075));
    }
  }

  // ═════════ 별 줄 (쉬운 말) ═════════
  {
    const live = s.phase === 'ask' || s.phase === 'walk' || s.phase === 'act' || s.phase === 'event';
    const labels = d.stars.map((q) => q.label + (live && !starMet(s, q) && starNow(s, q) ? ` ${starNow(s, q)}` : ''));
    const ok = s.phase === 'result' ? s.starOk : d.stars.map((q) => (q.k === 'story' || q.k === 'feast' || q.k === 'dragon' || q.k === 'win' || q.k === 'storm') && starMet(s, q));
    const bad = d.stars.map((q) => starBroken(s, q));
    font(0.034, 800);
    const ws = labels.map((l) => ctx.measureText(l).width + R(0.075));
    const rowsW: number[][] = [[]];
    let acc = 0;
    ws.forEach((wd, j) => {
      if (acc + wd > w - R(0.04) && rowsW[rowsW.length - 1].length) (rowsW.push([]), (acc = 0));
      rowsW[rowsW.length - 1].push(j);
      acc += wd + R(0.012);
    });
    rowsW.forEach((row, ri) => {
      const tot = row.reduce((a2, j) => a2 + ws[j], 0) + (row.length - 1) * R(0.012);
      let xx = (w - tot) / 2;
      const yy = Y(1.51) + ri * R(0.056);
      for (const j of row) {
        const pw = ws[j];
        ctx.fillStyle = ok[j] ? 'rgba(255,210,58,.4)' : 'rgba(255,250,240,.9)';
        rr(ctx, xx, yy - R(0.024), pw, R(0.048), R(0.024));
        ctx.fill();
        ctx.strokeStyle = ok[j] ? '#e8a010' : bad[j] ? 'rgba(90,50,20,.2)' : 'rgba(90,50,20,.4)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        starPath(ctx, xx + R(0.026), yy, R(0.015));
        ctx.fillStyle = ok[j] ? '#ffd23a' : bad[j] ? 'rgba(90,50,20,.18)' : 'rgba(90,50,20,.4)';
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.fillStyle = ok[j] ? '#9a5a08' : bad[j] ? 'rgba(90,50,20,.4)' : INK;
        font(0.034, 800);
        ctx.fillText(labels[j], xx + R(0.048), yy + 1, pw - R(0.055));
        if (bad[j]) {
          ctx.strokeStyle = 'rgba(200,60,80,.65)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(xx + R(0.045), yy + 1);
          ctx.lineTo(xx + pw - R(0.015), yy + 1);
          ctx.stroke();
        }
        xx += pw + R(0.012);
      }
    });
  }

  // ═════════ NEW 스포트라이트 ═════════
  if (s.spot && s.t >= s.spot.t && s.phase === 'ask') {
    const age = s.t - s.spot.t;
    let sx = 0, sy = 0, r = 0, lab = '';
    if (s.spot.key === 'preview') (sx = X(0.3)), (sy = stripY), (r = R(0.16)), (lab = '내일 손님');
    else if (s.spot.key === 'story') {
      const b = buttons(s).find((q) => (q.k === 0 ? s.cur.L : s.cur.R).next);
      if (b) (sx = X((b.x0 + b.x1) / 2)), (sy = Y(BY1 - 0.04)), (r = R(0.12)), (lab = '이어지는 이야기');
    } else if (s.spot.key === 'storm' || s.spot.key === 'battle') (sx = X(0.17)), (sy = Y(0.7)), (r = R(0.12)), (lab = s.spot.key === 'storm' ? '눈보라 예보' : '적군이 와요');
    else if (s.spot.key === 'crown') (sx = X(0.5)), (sy = Y((BY0 + BY1) / 2)), (r = R(0.13)), (lab = '왕관 카드');
    else if (s.spot.key === 'dragon') (sx = X(0.5)), (sy = Y(1.51)), (r = R(0.14)), (lab = '용과 친구');
    if (r > 0) {
      const pulse = 1 + 0.08 * Math.sin(age * 0.25);
      ctx.strokeStyle = `rgba(255,70,120,${0.9 - 0.4 * c01(age / 150)})`;
      ctx.lineWidth = 3.5;
      ctx.setLineDash([7, 5]);
      ctx.lineDashOffset = -age * 0.5;
      ell(ctx, sx, sy, r * pulse, r * 0.55 * pulse);
      ctx.stroke();
      ctx.setLineDash([]);
      font(0.034, 900);
      const lw2 = ctx.measureText('NEW ' + lab).width + R(0.04);
      const ly = Math.max(R(0.2), sy - r * 0.55 - R(0.035));
      ctx.fillStyle = '#ff4a7a';
      rr(ctx, sx - lw2 / 2, ly - R(0.022), lw2, R(0.044), R(0.022));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('NEW ' + lab, sx, ly + 1);
    }
  }
  void th;
}

function drawFinger(ctx: C2, x: number, y: number, k: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.5);
  ctx.fillStyle = 'rgba(60,30,10,.25)';
  ell(ctx, k * 0.08, k * 0.1, k * 0.35, k * 0.45);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  // 손바닥 + 접힌 손가락
  rr(ctx, -k * 0.3, -k * 0.05, k * 0.6, k * 0.55, k * 0.2);
  ctx.fill();
  ctx.stroke();
  // 검지
  rr(ctx, -k * 0.27, -k * 0.62, k * 0.2, k * 0.65, k * 0.1);
  ctx.fill();
  ctx.stroke();
  for (let q = 0; q < 3; q++) {
    rr(ctx, -k * 0.06 + q * k * 0.12, -k * 0.12, k * 0.13, k * 0.22, k * 0.06);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#ffd6dc';
  rr(ctx, -k * 0.2, -k * 0.6, k * 0.07, k * 0.1, 2);
  ctx.fill();
  ctx.restore();
}
