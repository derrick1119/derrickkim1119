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
const BY0 = 1.15, BY1 = 1.44;

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
  if (st.k === 'dragon') return d.fixed.filter((f) => f[1] === 'dragon').length - (s.queue.filter((q) => q.c.id === 'dragon').length + (s.phase === 'ask' || s.phase === 'walk' ? (s.cur.c.id === 'dragon' ? 1 : 0) : 0)) > s.love;
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
function drawAll(ctx: CanvasRenderingContext2D, s: KState, w: number, h: number, th: Theme) {
  const fx = juice(s);
  ctx.save();
  fx.begin(ctx);
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  void WHO_NAME;
  void starNow;
  void starBroken;
}
