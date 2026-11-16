/**
 * 달팽이 미끄럼 길 (28라운드: 처음 보는 규칙) — 내가 만든 미끄럼 길 × 가리키기(톡) × 턴제.
 * 기준 9(손이 하는 일은 하나): 달팽이 이웃 쪽을 톡 = 그쪽으로 한 수. 누르고 있으면 그 수를 두었을 때 갈 길·멈출 곳·먹을 상추가 점선으로
 *   보이고, 떼면 간다(달팽이 위에서 떼면 취소). 키보드는 화살표 커서 + 스페이스.
 * 규칙(결정적): 달팽이가 떠난 칸에는 점액이 남는다. 점액 칸에 들어서면 그 방향으로 점액이 끝날 때까지 쭉 미끄러져 첫 마른 칸에 멈춘다
 *   (돌·벽·개미에 막히면 마지막 점액 칸에서). 🌱새싹은 점액을 먹으면 🥬상추로 쑥 자라고, 상추는 미끄러지며 지나가면 냠.
 *   상추를 다 먹으면 🐚집 문이 열리고, 집에 들어가면 그 판 끝. 톡 수에 한도가 있다.
 * 와우: 지금 기어가는 길이 나중의 미끄럼틀이자 상추밭이다 — 새싹 줄을 따라 기어 두면(물 주기) 되돌아올 때 '슈우욱' 한 번에 냠냠냠.
 *   그래서 어느 쪽으로 기어 두느냐(돌아올 미끄럼이 집 쪽을 향하게)가 수다. 미끄러지면 중간에 못 서니 내 길이 나를 가두기도 한다.
 * 판(정원) 8개: 별 = ★ 집에 도착 · ★ 톡 P2번 이내 · ★ 톡 P3번 이내(가장 짧은 길, 해답기로 잰 값). 실패(톡을 다 씀 · 개미가 상추를 가져감
 *   · 꼼짝 못 함) = 하트 -1, 그 판을 처음부터. 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1판 어젯밤 길(이미 깔린 점액 — 첫 톡에 냠냠, 새싹 물 주기) → 2판 돌 정원(돌 = 브레이크, 물 주는 방향)
 *   → 3판 웅덩이(첨벙! 점액이 사방으로 튀어 한 번에 네 칸 물 주기) → 4판 개미(상추 도둑 — 점액을 밟으면 찰싹 붙는다: 길로 가두기)
 *   → 5판 소금(점액이 안 남는 칸 — 미끄럼이 거기서 멈춘다, 중간 정거장) → 6판 웅덩이+개미(첨벙으로 개미 붙이기)
 *   → 7판 소금+개미 → 8판 전부.
 * 웃음: 벽에 부딪히면 눈자루가 쏙 들어갔다 뿅, 소금에 서면 '짜!' 하고 쪼그라들고, 큰 미끄럼에선 눈이 뒤로 휘날린다.
 *   화분 위 개구리 구경꾼은 미끄럼에 눈이 휘둥그레, 냠냠냠에 박수, 꽈당에 '개굴ㅋ'.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.45;
/** 정원 칸: 가로 GW × 세로 GH (30칸 = 점액 비트 하나) */
const GW = 5, GH = 6, NC = GW * GH;
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
const NB: number[] = [];
for (let c = 0; c < NC; c++)
  for (let d = 0; d < 4; d++) {
    const x = (c % GW) + DX[d], y = Math.floor(c / GW) + DY[d];
    NB.push(x < 0 || x >= GW || y < 0 || y >= GH ? -1 : y * GW + x);
  }
const bit = (m: number, c: number) => (m >>> c) & 1;

// ───────────────────────────── 판(정원) ─────────────────────────────
/**
 * 지도 글자: . 흙 · # 돌 · S 달팽이 · H 집 · s 새싹 · L 상추(이미 점액 위) · ~ 이미 깔린 점액 · o 웅덩이 · x 소금 · a 개미
 */
interface StageDef { key: string; name: string; emoji: string; news: string; tip: string; maps: string[][]; slack: number; s2: number; s3: number }
export const STAGES: StageDef[] = [
  {
    key: 'night', name: '어젯밤 길', emoji: '🌙', news: '🌙 반짝이는 건 어젯밤 점액 — 들어서면 쭉 미끄러지며 냠!', tip: '🌱 새싹 위를 지나가면 점액을 먹고 상추로 쑥!', slack: 16, s2: 3, s3: 1,
    maps: [['#####', '####H', 'SLLL.', '####s', '####s', '####.']],
  },
  {
    key: 'sprout', name: '새싹 줄', emoji: '🌱', news: '🌱 새싹 줄을 따라 기어 두면 — 되돌아올 땐 한 번에 냠냠냠', tip: '↩️ 돌아올 미끄럼이 집 쪽을 향하게 물을 줘요', slack: 10, s2: 2, s3: 0,
    maps: [
      ['#####', 'HS###', 's.###', 's..##', 's.###', '.####'],
      ['.####', '..###', 's.###', 's.###', 'sS..#', '.H###'],
    ],
  },
  {
    key: 'puddle', name: '빗물 웅덩이', emoji: '💧', news: '💧 웅덩이에 들어가면 첨벙! 점액이 사방 네 칸으로 튀어요', tip: '💧 첨벙 한 번에 이웃 새싹이 다 자라요', slack: 8, s2: 2, s3: 0,
    maps: [
      ['###.#', '.sss#', '##so.', '#.Ss#', '##.H#', '###..'],
      ['...##', '#..##', 'soS.#', 'ss###', 's####', 'sH...'],
      ['#so.H', '.ssss', '.#..S', '.##.#', '###..', '#####'],
    ],
  },
  {
    key: 'ant', name: '개미 행렬', emoji: '🐜', news: '🐜 개미가 상추를 노려요 — 점액을 밟으면 찰싹 붙어요!', tip: '🐜 빨간 화살표 = 개미가 갈 길. 그 앞에 점액을!', slack: 8, s2: 2, s3: 0,
    maps: [
      ['#.S#.', '#s...', '#sH.#', '#s#a#', '#s.##', '..###'],
      ['sH###', 's..##', 'sS..#', 's.###', '...##', 'a..##'],
      ['###.#', '.sss#', '#.Hs.', '##.S#', '###..', '#a..#'],
    ],
  },
  {
    key: 'salt', name: '소금 길', emoji: '🧂', news: '🧂 소금 칸엔 점액이 안 남아요 — 미끄럼이 거기서 멈춰요', tip: '🧂 소금은 미끄럼 중간 정거장', slack: 8, s2: 2, s3: 0,
    maps: [
      ['#####', '###.x', 'Sssss', '.#..#', '#..H#', '...##'],
      ['.s##.', '.s#S.', '.s#.#', '.sx.#', '#H.##', '...##'],
      ['#...#', '.#H##', '...##', 'ssss#', 'S..x.', '#.#.#'],
    ],
  },
  {
    key: 'splashant', name: '첨벙 개미', emoji: '💦', news: '💦 첨벙 튄 점액은 개미 발도 붙여요', tip: '💦 개미가 웅덩이 옆에 오면 첨벙!', slack: 8, s2: 2, s3: 0,
    maps: [
      ['#s..H', '.sS.a', '.sos.', '####.', '#####', '#####'],
      ['####s', 'a..ss', '.#Sos', '##.#s', '###.s', '####H'],
      ['#.a#.', '##..S', '###so', '.ssss', '..#.#', '#H.##'],
    ],
  },
  {
    key: 'saltant', name: '소금 개미', emoji: '🧂', news: '🧂🐜 소금 칸에선 개미가 안 붙어요 — 피해서 막아요', tip: '🐜 개미 길에 소금이 있으면 그 다음 칸을 막아요', slack: 8, s2: 2, s3: 0,
    maps: [
      ['.s...', '#s.SH', '#s#.a', '#s.##', '.x###', '.####'],
      ['#####', '####.', '.###a', '.##..', 'ssssS', '.#.xH'],
      ['a.#..', 'x.#..', 'Sssss', 'H#.#.', '#####', '#####'],
    ],
  },
  {
    key: 'final', name: '달팽이 대정원', emoji: '🐚', news: '🐚 마지막 정원 — 웅덩이·소금·개미가 다 나와요!', tip: '🐚 길을 깔고 → 쭉 미끄러져 → 집으로', slack: 8, s2: 2, s3: 0,
    maps: [
      ['...sx', 'a.Sso', '##.ss', '###s#', '###..', '##Hs#'],
      ['..H.#', '#s###', '.s..#', '.soSa', '.#s..', '##x..'],
      ['#....', '.s.Hs', '#.x.o', '##sss', '##S.#', '#.a##'],
    ],
  },
];
export const STAGE_COUNT = STAGES.length;

export interface Level {
  stage: number; rock: number; salt: number; pud: number; slime0: number; food: number[]; fidx: number[]; start: number; home: number; ants0: number[];
  /** 가장 짧은 길(해답기) · 톡 한도 · 별 기준 */
  par: number; limit: number; p2: number; p3: number; plan: number[];
}

function parse(rows: string[], flip: boolean, vflip = false): Omit<Level, 'par' | 'limit' | 'p2' | 'p3' | 'plan' | 'stage'> {
  let rock = 0, salt = 0, pud = 0, slime0 = 0, start = 0, home = 0;
  const food: number[] = [], ants0: number[] = [];
  for (let y = 0; y < GH; y++)
    for (let x = 0; x < GW; x++) {
      const ch = rows[vflip ? GH - 1 - y : y][flip ? GW - 1 - x : x], c = y * GW + x;
      if (ch === '#') rock |= 1 << c;
      else if (ch === 'x') salt |= 1 << c;
      else if (ch === 'o') pud |= 1 << c;
      else if (ch === '~') slime0 |= 1 << c;
      else if (ch === 'L') (slime0 |= 1 << c), food.push(c);
      else if (ch === 's') food.push(c);
      else if (ch === 'S') start = c;
      else if (ch === 'H') home = c;
      else if (ch === 'a') ants0.push(c);
    }
  const fidx = Array(NC).fill(-1);
  food.forEach((c, i) => (fidx[c] = i));
  return { rock, salt, pud, slime0, food, fidx, start, home, ants0 };
}

// ───────────────────────────── 규칙(시뮬레이션) ─────────────────────────────
export interface Sim { pos: number; slime: number; eaten: number; ants: number[]; taps: number; fail: number; done: boolean; best: number; last: number }
export const newSim = (L: Level): Sim => ({ pos: L.start, slime: L.slime0, eaten: 0, ants: L.ants0.slice(), taps: 0, fail: 0, done: false, best: 0, last: 0 });
const cloneSim = (S: Sim): Sim => ({ ...S, ants: S.ants.slice() });
const allMask = (L: Level) => (1 << L.food.length) - 1;
export const allEaten = (L: Level, S: Sim) => S.eaten === allMask(L);
const canSlime = (L: Level, c: number) => !bit(L.salt | L.pud, c) && c !== L.home;
const antAt = (S: Sim, c: number) => S.ants.indexOf(c);
/** 달팽이가 들어갈 수 있는 칸인가 (집은 상추를 다 먹어야 열린다) */
const open = (L: Level, S: Sim, c: number) => c >= 0 && !bit(L.rock, c) && antAt(S, c) < 0 && (c !== L.home || allEaten(L, S));

/** 기록(연출용): 한 수에 일어난 일 */
export type RE =
  | { k: 'move'; path: number[]; slide: boolean; d: number }
  | { k: 'eat'; c: number; f: number; i: number; n: number }
  | { k: 'grow'; c: number; f: number; how: 'leave' | 'splash' }
  | { k: 'slime'; c: number; how: 'leave' | 'splash' }
  | { k: 'splash'; c: number }
  | { k: 'salt'; c: number }
  | { k: 'home'; c: number }
  | { k: 'open' }
  | { k: 'ant'; a: number; from: number; to: number; stuck: boolean }
  | { k: 'glue'; a: number; c: number }
  | { k: 'steal'; a: number; c: number; f: number };

/** 개미 한 걸음: 남은 상추·새싹 중 가장 가까운 것 쪽으로(돌·웅덩이·집·달팽이·다른 개미는 돌아서) */
function antStep(L: Level, S: Sim, a: number): number {
  const from = S.ants[a];
  let tgt = 0;
  for (let f = 0; f < L.food.length; f++) if (!bit(S.eaten, f)) tgt |= 1 << L.food[f];
  if (!tgt) return from;
  const prev = new Int8Array(NC).fill(-1), q = [from];
  prev[from] = 4;
  for (let h = 0; h < q.length; h++) {
    const c = q[h];
    for (let d = 0; d < 4; d++) {
      const n = NB[c * 4 + d];
      if (n < 0 || prev[n] >= 0 || bit(L.rock | L.pud, n) || n === L.home || n === S.pos || antAt(S, n) >= 0) continue;
      prev[n] = d;
      if (bit(tgt, n)) {
        let k = n;
        while (NB[k * 4 + ((prev[k] + 2) % 4)] !== from) k = NB[k * 4 + ((prev[k] + 2) % 4)];
        return k;
      }
      q.push(n);
    }
  }
  return from;
}

/** 한 수: 방향 d로. 움직였으면 true (막혀서 '콩'이면 false, 상태는 그대로) */
export function apply(L: Level, S: Sim, d: number, rec?: RE[]): boolean {
  const start = S.pos;
  let q = NB[start * 4 + d];
  if (!open(L, S, q)) return false;
  const path = [start], wasAll = allEaten(L, S);
  const eats: number[] = [];
  let p = start, slide = false;
  for (;;) {
    if (!bit(S.slime, q)) {
      p = q;
      path.push(q);
      break;
    }
    slide = true;
    p = q;
    path.push(q);
    const f = L.fidx[q];
    if (f >= 0 && !bit(S.eaten, f)) (S.eaten |= 1 << f), eats.push(q);
    const r = NB[q * 4 + d];
    if (!open(L, S, r)) break;
    q = r;
  }
  S.pos = p;
  rec?.push({ k: 'move', path, slide, d });
  eats.forEach((c, i) => rec?.push({ k: 'eat', c, f: L.fidx[c], i, n: eats.length }));
  // 떠난 칸에 점액 — 새싹이면 상추로 쑥
  if (canSlime(L, start) && !bit(S.slime, start)) {
    S.slime |= 1 << start;
    const f = L.fidx[start];
    if (f >= 0 && !bit(S.eaten, f)) rec?.push({ k: 'grow', c: start, f, how: 'leave' });
    else rec?.push({ k: 'slime', c: start, how: 'leave' });
  }
  if (bit(L.pud, p)) {
    rec?.push({ k: 'splash', c: p });
    for (let e = 0; e < 4; e++) {
      const n = NB[p * 4 + e];
      if (n < 0 || bit(L.rock, n) || !canSlime(L, n) || bit(S.slime, n)) continue;
      S.slime |= 1 << n;
      const f = L.fidx[n];
      if (f >= 0 && !bit(S.eaten, f)) rec?.push({ k: 'grow', c: n, f, how: 'splash' });
      else rec?.push({ k: 'slime', c: n, how: 'splash' });
    }
  }
  if (bit(L.salt, p)) rec?.push({ k: 'salt', c: p });
  S.taps++;
  S.last = eats.length;
  S.best = Math.max(S.best, eats.length);
  if (!wasAll && allEaten(L, S)) rec?.push({ k: 'open' });
  if (p === L.home) {
    S.done = true;
    rec?.push({ k: 'home', c: p });
    return true;
  }
  // 개미 차례
  for (let a = 0; a < S.ants.length; a++) {
    const c = S.ants[a];
    if (c < 0 || bit(S.slime, c)) continue;
    const n = antStep(L, S, a);
    if (n === c) continue;
    S.ants[a] = n;
    const f = L.fidx[n];
    if (f >= 0 && !bit(S.eaten, f)) {
      rec?.push({ k: 'ant', a, from: c, to: n, stuck: false });
      rec?.push({ k: 'steal', a, c: n, f });
      S.fail = 2;
      return true;
    }
    const st = !!bit(S.slime, n);
    rec?.push({ k: 'ant', a, from: c, to: n, stuck: st });
    if (st) rec?.push({ k: 'glue', a, c: n });
  }
  if (S.taps >= L.limit) S.fail = 1;
  else if (![0, 1, 2, 3].some((e) => open(L, S, NB[S.pos * 4 + e]))) S.fail = 3;
  return true;
}

/** 지금 상태에서 집까지 가장 짧은 톡 순서 (너비 우선 탐색). 못 가면 null */
const keyOf = (S: Sim) => S.slime * 8388608 + (S.pos | (S.eaten << 5) | (((S.ants[0] ?? -1) + 1) << 13) | (((S.ants[1] ?? -1) + 1) << 18));
export function solve(L: Level, S0: Sim, maxTaps: number, cap = 250000): number[] | null {
  if (S0.done) return [];
  const nodes: Sim[] = [S0], par: number[] = [-1], dir: number[] = [-1], depth: number[] = [0];
  const seen = new Set<number>([keyOf(S0)]);
  for (let h = 0; h < nodes.length; h++) {
    if (depth[h] >= maxTaps || nodes.length > cap) continue;
    for (let d = 0; d < 4; d++) {
      const S = cloneSim(nodes[h]);
      S.taps = 0; // 한도 검사는 depth로
      const moved = apply(L, S, d);
      if (!moved || S.fail === 2) continue;
      if (S.done) {
        const out = [d];
        for (let k = h; k > 0; k = par[k]) out.unshift(dir[k]);
        return out;
      }
      if (S.fail) continue;
      const kk = keyOf(S);
      if (seen.has(kk)) continue;
      seen.add(kk);
      nodes.push(S), par.push(h), dir.push(d), depth.push(depth[h] + 1);
    }
  }
  return null;
}

/** 지도 한 장 → 판 (해답기로 가장 짧은 길을 재서 별 기준·톡 한도를 정한다) */
export function levelFromRows(rows: string[], stage: number, flip = false, cap = 250000, vflip = false): Level {
  const d = STAGES[stage], base = parse(rows, flip, vflip);
  const L: Level = { ...base, stage, par: 0, limit: 99, p2: 0, p3: 0, plan: [] };
  const plan = solve(L, newSim(L), 30, cap);
  L.plan = plan ?? [];
  L.par = plan ? plan.length : 0;
  L.p3 = L.par + d.s3;
  L.p2 = L.par + d.s2;
  L.limit = L.par + d.slack;
  return L;
}
const levelCache = new Map<string, Level>();
export function buildLevel(seed: number, stage: number): Level {
  const ck = `${seed}:${stage}`, hit = levelCache.get(ck);
  if (hit) return hit;
  const d = STAGES[stage], r = mulberry32((seed * 7919 + stage * 104729) >>> 0);
  const rows = d.maps[Math.floor(r() * d.maps.length)];
  const L = levelFromRows(rows, stage, r() < 0.5, 250000, r() < 0.5);
  if (levelCache.size > 400) levelCache.clear();
  levelCache.set(ck, L);
  return L;
}
export const starsOf = (L: Level, S: Sim) => 1 + (S.taps <= L.p2 ? 1 : 0) + (S.taps <= L.p3 ? 1 : 0);

/** 버릇: 가장 가까운(맨해튼) 상추·새싹 쪽으로 — 다 먹었으면 집 쪽으로. 막힌 쪽은 빼고, 같으면 위·오른·아래·왼 순 */
export function habitDir(L: Level, S: Sim): number {
  const px = S.pos % GW, py = Math.floor(S.pos / GW);
  let tgt = L.home, bd = 1e9;
  for (let f = 0; f < L.food.length; f++) {
    if (bit(S.eaten, f)) continue;
    const c = L.food[f], dd = Math.abs((c % GW) - px) + Math.abs(Math.floor(c / GW) - py);
    if (dd < bd) (bd = dd), (tgt = c);
  }
  let best = -1, bv = 1e9;
  for (let d = 0; d < 4; d++) {
    const T = cloneSim(S);
    if (!apply(L, T, d)) continue;
    const c = T.pos, v = Math.abs((c % GW) - (tgt % GW)) + Math.abs(Math.floor(c / GW) - Math.floor(tgt / GW)) - (T.eaten !== S.eaten ? 0.5 : 0) + (T.done ? -99 : 0);
    if (v < bv) (bv = v), (best = d);
  }
  return best;
}

// ───────────────────────────── 상태 ─────────────────────────────
const CRAWL = 13, SLIDE = 5, SLOW = 9, ANT_T = 12, RESULT_OK = 210, RESULT_FAIL = 170, NEWS_T = 200;
const STAR_PTS = 100, LEFT_PTS = 5, COMBO_PTS = 10, WIN_PTS = 150;
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number }
interface Mv { path: number[]; times: number[]; slide: boolean; d: number; t0: number; end: number; eats: number }
export interface SnailState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'settle' | 'result'; pt: number;
  L: Level; S: Sim;
  down: boolean; ax: number; ay: number; press: number; queued: number; busy: number; lastTap: number; taps: number;
  hearts: number; stars: number; got: number; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number;
  seen: Set<string>; tips: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; clearT: number;
  mv: Mv | null; face: number; eatT: number[]; growT: number[]; slimeT: number[]; antV: { from: number; to: number; t0: number }[];
  bumpT: number; bumpD: number; saltT: number; openT: number; homeT: number; mood: string; moodT: number;
}

// 화면 배치 (가로 0~1, 세로 0~A)
const BX0 = 0.05, BY0 = 0.335, CW = 0.18, CH = 0.142;
const cX = (c: number) => BX0 + ((c % GW) + 0.5) * CW;
const cY = (c: number) => BY0 + (Math.floor(c / GW) + 0.5) * CH;

const ev = (s: SnailState, kind: string, x: number, y: number, text?: string, col?: string, v?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v });
function tip(s: SnailState, key: string, text: string) {
  if (s.tips.has(key) || s.newsQ.length) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
function see(s: SnailState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}
const setMood = (s: SnailState, m: string) => ((s.mood = m), (s.moodT = s.t));

function newStage(s: SnailState) {
  const d = STAGES[s.stage];
  s.L = buildLevel(s.seed, s.stage);
  s.S = newSim(s.L);
  const L = s.L;
  s.mv = null;
  s.eatT = L.food.map(() => Infinity);
  s.growT = L.food.map((c) => (bit(L.slime0, c) ? -1 : Infinity));
  s.slimeT = Array(NC).fill(Infinity);
  for (let c = 0; c < NC; c++) if (bit(L.slime0, c)) s.slimeT[c] = -1;
  s.antV = L.ants0.map((c) => ({ from: c, to: c, t0: -99 }));
  s.face = L.start % GW >= 2 ? -1 : 1;
  s.phase = 'play';
  s.pt = 0;
  s.press = -1;
  s.queued = -1;
  s.busy = s.t + 24;
  s.startT = s.t;
  s.got = 0;
  s.bumpT = -99;
  s.saltT = -99;
  s.openT = L.food.length ? -99 : s.t;
  s.homeT = -99;
  setMood(s, 'idle');
  see(s, d.key, d.news);
  ev(s, 'stage', 0.5, 0.7, `${s.stage + 1}판 · ${d.name}`, '#fff6d6');
}

function finish(s: SnailState) {
  s.phase = 'result';
  s.pt = 0;
  const L = s.L, S = s.S;
  if (s.ok) {
    const st = starsOf(L, S);
    s.got = st;
    s.stars += st;
    s.pts += st * STAR_PTS + Math.max(0, L.limit - S.taps) * LEFT_PTS + Math.min(S.best, 6) * COMBO_PTS;
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.75, `${STAGES[s.stage].emoji} 냠 완료! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, '#fff1a8', st);
    setMood(s, 'cheer');
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.75, s.why, '#ffd0c8');
    setMood(s, 'dizzy');
  }
}

/** 손가락 자리 → 방향 (달팽이 칸 안이면 -1) */
function dirFrom(s: SnailState, x: number, y: number): number {
  const c = s.S.pos, gx = (x - BX0) / CW - ((c % GW) + 0.5), gy = (y - BY0) / CH - (Math.floor(c / GW) + 0.5);
  if (Math.max(Math.abs(gx), Math.abs(gy)) < 0.5) return -1;
  if (y < BY0 - 0.1 || y > BY0 + GH * CH + 0.08) return -1;
  return Math.abs(gx) > Math.abs(gy) ? (gx > 0 ? 1 : 3) : gy > 0 ? 2 : 0;
}

/** 한 수의 기록을 화면 연출(기어감·미끄럼·냠·쑥·첨벙·개미)로 옮긴다 */
function playRec(s: SnailState, rec: RE[]) {
  const L = s.L, t0 = s.t;
  const mvE = rec.find((e) => e.k === 'move') as Extract<RE, { k: 'move' }>;
  const path = mvE.path, times = [t0];
  let eatsSoFar = 0;
  const eatCells = new Set(rec.filter((e) => e.k === 'eat').map((e) => (e as Extract<RE, { k: 'eat' }>).c));
  for (let i = 1; i < path.length; i++) {
    const dry = !mvE.slide || (i === path.length - 1 && !eatCells.has(path[i]) && !bit(s.S.slime, path[i]));
    const dt = !mvE.slide ? CRAWL : eatsSoFar >= 3 ? SLOW : dry ? SLIDE + 3 : SLIDE;
    times.push(times[i - 1] + dt);
    if (eatCells.has(path[i])) eatsSoFar++;
  }
  const end = times[times.length - 1];
  const eats = eatCells.size;
  s.mv = { path, times, slide: mvE.slide, d: mvE.d, t0, end, eats };
  if (mvE.d === 1) s.face = 1;
  if (mvE.d === 3) s.face = -1;
  let antEnd = end;
  for (const e of rec) {
    if (e.k === 'eat') {
      const i = path.indexOf(e.c), due = times[i];
      s.eatT[e.f] = due;
      ev(s, 'eat', cX(e.c), cY(e.c), e.i === 0 ? '냠!' : e.i === 1 ? '냠냠!' : '냠냠냠!', '#d8ffb0', due);
      (s.events[s.events.length - 1] as Ev & { n?: number; i?: number }).n = e.n;
      (s.events[s.events.length - 1] as Ev & { n?: number; i?: number }).i = e.i;
    }
    if (e.k === 'grow') {
      const due = e.how === 'leave' ? t0 + (mvE.slide ? 4 : 9) : end + 2;
      s.growT[e.f] = due;
      s.slimeT[e.c] = Math.min(s.slimeT[e.c], due);
      ev(s, 'grow', cX(e.c), cY(e.c), '쑥!', '#c8ffb0', due);
    }
    if (e.k === 'slime') s.slimeT[e.c] = Math.min(s.slimeT[e.c], e.how === 'leave' ? t0 + (mvE.slide ? 3 : 8) : end + 2);
    if (e.k === 'splash') ev(s, 'splash', cX(e.c), cY(e.c), '첨벙!', '#bfe6ff', end);
    if (e.k === 'salt') (s.saltT = end), ev(s, 'salt', cX(e.c), cY(e.c), '짜!', '#ffffff', end);
    if (e.k === 'open') {
      const last = rec.filter((q) => q.k === 'eat').pop() as Extract<RE, { k: 'eat' }> | undefined;
      const due = last ? times[path.indexOf(last.c)] + 2 : end;
      s.openT = due;
      ev(s, 'open', cX(L.home), cY(L.home), '🐚 집 문이 열렸다!', '#fff1a8', due);
    }
    if (e.k === 'home') (s.homeT = end), ev(s, 'home', cX(e.c), cY(e.c), '집이다~!', '#fff1a8', end);
    if (e.k === 'ant') {
      s.antV[e.a] = { from: e.from, to: e.to, t0: end };
      antEnd = Math.max(antEnd, end + ANT_T);
    }
    if (e.k === 'glue') ev(s, 'glue', cX(e.c), cY(e.c), '찰싹!', '#e9d8ff', end + ANT_T);
    if (e.k === 'steal') ev(s, 'steal', cX(e.c), cY(e.c), '앗! 개미가 상추를!', '#ffb4a8', end + ANT_T);
  }
  if (mvE.slide) ev(s, 'slide', cX(path[0]), cY(path[0]), path.length > 3 ? '슈우욱~' : '슉!', '#e8f4ff', t0);
  if (eats >= 2) ev(s, 'combo', cX(path[path.length - 1]), cY(path[path.length - 1]), eats >= 3 ? `냠냠냠 ×${eats}!!` : `냠냠 ×${eats}!`, eats >= 3 ? '#ffe066' : '#d8ffb0', end + 2);
  s.busy = antEnd + 4;
  // 처음 본 것
  if (mvE.slide) see(s, 'slide', '💨 점액 칸에 들어서면 끝까지 쭉 — 중간엔 못 서요!');
  if (rec.some((e) => e.k === 'grow')) see(s, 'grow', '🌱 지나간 새싹이 점액을 먹고 🥬 쑥! 되돌아와 미끄러지며 냠');
  if (rec.some((e) => e.k === 'glue')) see(s, 'glue', '🐜 개미가 점액에 찰싹 — 이제 돌처럼 길을 막아요');
  if (eats >= 3) see(s, 'combo3', '🤩 한 번에 셋! 길게 기어 둘수록 크게 냠냠냠');
  if (rec.some((e) => e.k === 'open')) tip(s, 'open', '🐚 다 먹으면 집 문이 열려요 — 집으로!');
  if (eats >= 2) setMood(s, 'wow');
  else if (eats) setMood(s, 'yum');
  else if (mvE.slide) setMood(s, 'whee');
  else setMood(s, 'idle');
}

function doMove(s: SnailState, d: number) {
  const L = s.L, S = s.S, rec: RE[] = [];
  if (!apply(L, S, d, rec)) {
    s.bumpT = s.t;
    s.bumpD = d;
    s.busy = s.t + 16;
    const n = NB[S.pos * 4 + d];
    const why = n >= 0 && n === L.home ? '🔒 상추를 다 먹어야 열려요' : n >= 0 && antAt(S, n) >= 0 ? '개미가 막고 있어요' : '';
    ev(s, 'bump', cX(S.pos) + DX[d] * CW * 0.45, cY(S.pos) + DY[d] * CH * 0.45, '콩!', '#ffe2c4');
    if (why) ev(s, 'why', cX(S.pos), cY(S.pos) - 0.06, why, '#ffd6c8');
    setMood(s, 'bump');
    tip(s, 'bump', '🪨 막힌 쪽은 콩! — 톡 수는 안 줄어요');
    return;
  }
  s.taps++;
  s.lastTap = s.t;
  playRec(s, rec);
  if (S.done) (s.phase = 'settle'), (s.pt = 0), (s.ok = true);
  else if (S.fail) {
    s.phase = 'settle';
    s.pt = 0;
    s.ok = false;
    s.why = S.fail === 2 ? '개미가 상추를 가져갔어요!' : S.fail === 3 ? '꼼짝도 못 해요!' : '톡을 다 썼어요!';
    if (S.fail !== 2) ev(s, 'out', cX(S.pos), cY(S.pos), S.fail === 3 ? '끼었다…' : '헥헥…', '#ffd0c8', s.busy);
  } else if (L.limit - S.taps <= 3) tip(s, 'low', '⚠ 톡이 얼마 안 남았어요 — 미리 보고 톡!');
}

export const snailslide: GameDef<SnailState> = {
  id: 'snailslide',
  name: '달팽이 미끄럼 길',
  genes: ['slimetrail', 'pointer', 'turnbased'],
  twist: '달팽이가 지나간 칸은 점액으로 미끄러워져, 다음에 밟으면 점액이 끝나는 곳까지 쭉 미끄러진다 — 새싹은 그 점액을 먹고 상추로 자라므로, 지금 기어가는 길이 나중에 한 번에 쓸어 먹을 미끄럼틀이 된다',
  rules: ['이웃 칸을 톡 → 달팽이가 기어가요, 지나간 칸엔 점액이 남고 🌱새싹은 🥬상추로 자라요.', '점액 칸에 들어서면 끝까지 쭉 미끄러지며 상추를 냠 — 다 먹고 🐚집으로!'],
  controls: 'touch',
  hint: '달팽이 옆 칸을 톡! 누르고 있으면 갈 길이 보여요 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '비 갠 아침 텃밭의 달팽이',
    mood: '빗방울 맺힌 나무 텃밭 상자 — 촉촉한 흙 칸 위로 은빛 점액이 반짝이고, 통통한 상추와 새싹, 이끼 낀 돌, 웅덩이에 하늘이 비친다. 화분 위 개구리가 구경한다.',
    palette: { bg: '#24361f', ink: '#f6fbe9', muted: '#bcd3a8', accent: '#ffd166', hot: '#ff6b5a', soft: '#e6f2d0' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0,
      down: false, ax: 0, ay: 0, press: -1, queued: -1, busy: 0, lastTap: -99, taps: 0,
      hearts: 3, stars: 0, got: 0, pts: 0, ok: false, why: '', won: false, dead: false, tries: 0,
      seen: new Set<string>(), tips: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, clearT: 0,
      mv: null, face: 1, eatT: [], growT: [], slimeT: [], antV: [], bumpT: -99, bumpD: 0, saltT: -99, openT: -99, homeT: -99, mood: 'idle', moodT: 0,
    } as unknown as SnailState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, release = !p && s.down;
    if (p) (s.ax = p.x), (s.ay = p.y * A);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 60 || (s.events.length && s.t - s.events[0].t > 240)) s.events = s.events.filter((e) => s.t - e.t < 240);
    if (s.mood !== 'idle' && s.t - s.moodT > (s.mood === 'dizzy' || s.mood === 'cheer' ? 400 : 80)) s.mood = 'idle';
    if (s.phase === 'result') {
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else newStage(s);
      }
      return;
    }
    if (s.phase === 'settle') {
      if (s.t >= s.busy + (s.ok ? 34 : 40)) finish(s);
      return;
    }
    if (p) s.press = dirFrom(s, s.ax, s.ay);
    if (release) {
      const d = s.press;
      s.press = -1;
      if (d >= 0) s.queued = d;
    }
    if (s.queued >= 0 && s.t >= s.busy) {
      const d = s.queued;
      s.queued = -1;
      doMove(s, d);
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const toward = (s: SnailState, d: number): Input => ({ tap: false, dir: 0, pointer: { x: cX(s.S.pos) + DX[d] * CW, y: (cY(s.S.pos) + DY[d] * CH) / A } });
const ready = (s: SnailState) => s.phase === 'play' && !s.down && s.t >= s.busy && s.queued < 0 && s.t - s.lastTap >= 22 && s.t - s.startT >= 40;
const brain = new WeakMap<object, { key: string; plan: number[] }>();
const stKey = (s: SnailState) => `${s.stage}:${s.tries}:${s.S.taps}:${s.S.pos}:${s.S.slime}:${s.S.eaten}:${s.S.ants.join(',')}`;
/** 잘하는 봇: 지금 상태에서 집까지 가장 짧은 톡 순서를 찾아(너비 우선 탐색) 그대로 둔다 */
export function planDir(s: SnailState): number {
  const key = stKey(s);
  let b = brain.get(s);
  if (!b || b.key !== key) {
    const plan = solve(s.L, s.S, s.L.limit - s.S.taps, 120000);
    b = { key, plan: plan ?? [] };
    brain.set(s, b);
  }
  if (!b.plan.length) return habitDir(s.L, s.S);
  const d = b.plan[0];
  // 다음 상태의 계획 = 나머지 (결정적이므로)
  const T = cloneSim(s.S);
  apply(s.L, T, d);
  const s2 = { ...s, S: T } as SnailState;
  brain.set(s, { key: stKey(s2), plan: b.plan.slice(1) });
  return d;
}
export const snailslideSmart: Bot<SnailState> = {
  name: '정원 달팽이 장인',
  act(s) {
    if (!ready(s)) return NO;
    const d = planDir(s);
    return d >= 0 ? toward(s, d) : NO;
  },
};
/** 버릇 봇(측정용): 늘 가장 가까운 상추·새싹 쪽으로 */
export const snailslideHabit: Bot<SnailState> = {
  name: '버릇: 가장 가까운 상추 쪽으로',
  act(s) {
    if (!ready(s)) return NO;
    const d = habitDir(s.L, s.S);
    return d >= 0 ? toward(s, d) : NO;
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 못하는 봇: 아무 때나 아무 쪽이나 톡 (가끔 화면 아무 데나) */
export const snailslideRandom: Bot<SnailState> = {
  name: '아무 쪽이나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 90);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    if (rng() < 0.15) m.p = { x: rng(), y: rng() };
    else {
      const d = Math.floor(rng() * 4);
      m.p = { x: cX(s.S.pos) + DX[d] * CW * (0.8 + rng() * 0.6), y: (cY(s.S.pos) + DY[d] * CH * (0.8 + rng() * 0.6)) / A };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const clamp01 = (q: number) => Math.max(0, Math.min(1, q));
const easeOut = (q: number) => 1 - Math.pow(1 - clamp01(q), 2.4);
type F = (v: number) => number;

/** 달팽이가 지금 화면 어디에 (기어가는 중·미끄러지는 중이면 그 사이) */
function snailAt(s: SnailState): { x: number; y: number; moving: number; slide: boolean } {
  const m = s.mv, t = s.t;
  if (!m || t >= m.end) return { x: cX(s.S.pos), y: cY(s.S.pos), moving: 0, slide: false };
  let i = 0;
  while (i < m.times.length - 2 && t >= m.times[i + 1]) i++;
  const a = m.path[i], b = m.path[i + 1], span = m.times[i + 1] - m.times[i];
  let q = clamp01((t - m.times[i]) / span);
  if (!m.slide) q = q - Math.sin(q * TAU) / TAU; // 꿈틀꿈틀(빨랐다 느렸다)
  else if (i === m.path.length - 2) q = easeOut(q);
  return { x: cX(a) + (cX(b) - cX(a)) * q, y: cY(a) + (cY(b) - cY(a)) * q, moving: 1, slide: m.slide };
}

interface Preview { rec: RE[]; S: Sim; moved: boolean; d: number }
const pvCache = new WeakMap<object, { key: string; p: Preview }>();
function preview(s: SnailState, d: number): Preview {
  const key = `${d}:${stKey(s)}`, c = pvCache.get(s);
  if (c && c.key === key) return c.p;
  const S = cloneSim(s.S), rec: RE[] = [];
  const moved = apply(s.L, S, d, rec);
  const p = { rec, S, moved, d };
  pvCache.set(s, { key, p });
  return p;
}

const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
function drawAll(ctx: CanvasRenderingContext2D, s: SnailState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, L = s.L, S = s.S;
  const X: F = (x) => x * w, Y: F = (y) => y * w, R: F = (r) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  ctx.save();
  fx.begin(ctx);
  drawBackdrop(ctx, s, w, h, X, Y, R, t);
  // ═════════ 텃밭 상자 ═════════
  const bx0 = BX0 - 0.03, bx1 = BX0 + GW * CW + 0.03, by0 = BY0 - 0.035, by1 = BY0 + GH * CH + 0.02;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(X(0.5), Y(by1 + 0.05), R(0.52), R(0.05), 0, 0, TAU);
  ctx.fill();
  // 앞면(두께)
  const fr = ctx.createLinearGradient(0, Y(by1), 0, Y(by1 + 0.05));
  fr.addColorStop(0, '#8a5a34');
  fr.addColorStop(1, '#5b3a20');
  ctx.fillStyle = fr;
  ctx.beginPath();
  ctx.roundRect(X(bx0), Y(by1 - 0.02), X(bx1 - bx0), R(0.07), R(0.018));
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,5,.35)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 6; k++) (ctx.beginPath(), ctx.moveTo(X(bx0 + (k * (bx1 - bx0)) / 6), Y(by1 + 0.002)), ctx.lineTo(X(bx0 + (k * (bx1 - bx0)) / 6), Y(by1 + 0.048)), ctx.stroke());
  // 윗면 테두리 나무
  const rim = ctx.createLinearGradient(0, Y(by0), 0, Y(by1));
  rim.addColorStop(0, '#c58a52');
  rim.addColorStop(1, '#a06a3c');
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.roundRect(X(bx0), Y(by0), X(bx1 - bx0), Y(by1 - by0), R(0.02));
  ctx.fill();
  ctx.fillStyle = '#3d2716';
  ctx.beginPath();
  ctx.roundRect(X(BX0 - 0.008), Y(BY0 - 0.01), X(GW * CW + 0.016), Y(GH * CH + 0.016), R(0.012));
  ctx.fill();
  // 빗방울 맺힌 테두리
  for (let k = 0; k < 14; k++) {
    const px = bx0 + 0.02 + hsh(k + 40) * (bx1 - bx0 - 0.04), py = k % 2 ? by0 + 0.012 : by1 - 0.006;
    ctx.fillStyle = `rgba(220,240,255,${0.35 + 0.3 * Math.sin(t / 40 + k)})`;
    ctx.beginPath();
    ctx.arc(X(px), Y(py), R(0.0045), 0, TAU);
    ctx.fill();
  }
  // ═════════ 칸(흙·돌) ═════════
  for (let c = 0; c < NC; c++) drawTile(ctx, L, c, X, Y, R, t);
  // ═════════ 점액 ═════════
  drawSlime(ctx, s, X, Y, R, t);
  // 웅덩이·소금 (바닥 높이)
  for (let c = 0; c < NC; c++) {
    if (bit(L.pud, c)) drawPuddle(ctx, X(cX(c)), Y(cY(c)), R, t, c);
    if (bit(L.salt, c)) drawSalt(ctx, X(cX(c)), Y(cY(c)), R, t, c, s.saltT);
  }
  // ═════════ 미리 보기(바닥 위 점선) ═════════
  const idle = s.phase === 'play' && t >= s.busy && s.queued < 0;
  const pressD = s.down && idle ? s.press : -1, pre = pressD >= 0 ? preview(s, pressD) : null;
  if (idle && !s.down) drawChevrons(ctx, s, X, Y, R, t);
  if (pre) drawPreviewPath(ctx, s, pre, X, Y, R, t);
  // ═════════ 서 있는 것들 (뒤 줄부터) ═════════
  const sn = snailAt(s);
  const items: { y: number; f: () => void }[] = [];
  for (let c = 0; c < NC; c++) {
    if (bit(L.rock, c)) items.push({ y: cY(c), f: () => drawRock(ctx, L, X(cX(c)), Y(cY(c)), R, c, t) });
  }
  L.food.forEach((c, f) => {
    if (t >= s.eatT[f]) return;
    const g = t >= s.growT[f];
    items.push({ y: cY(c) - 0.001, f: () => (g ? drawLettuce(ctx, X(cX(c)), Y(cY(c)), R(1), t, c, s.growT[f]) : drawSprout(ctx, X(cX(c)), Y(cY(c)), R(1), t, c)) });
  });
  items.push({ y: cY(L.home) - 0.002, f: () => drawHome(ctx, X(cX(L.home)), Y(cY(L.home)), R(1), t, s) });
  S.ants.forEach((_, a) => {
    const v = s.antV[a], q = clamp01((t - v.t0) / ANT_T);
    const x = cX(v.from) + (cX(v.to) - cX(v.from)) * q, y = cY(v.from) + (cY(v.to) - cY(v.from)) * q;
    const stuck = !!bit(S.slime, S.ants[a]) && q >= 1 && t >= s.slimeT[S.ants[a]];
    const steal = S.fail === 2 && q >= 1 && S.ants[a] === v.to && L.fidx[v.to] >= 0 && !bit(S.eaten, L.fidx[v.to]) && v.t0 > s.startT;
    items.push({ y: y + 0.002, f: () => drawAnt(ctx, X(x), Y(y), R(1), t, stuck, q < 1 ? Math.atan2(cY(v.to) - cY(v.from), cX(v.to) - cX(v.from)) : -Math.PI / 2 + Math.sin(t / 30 + a) * 0.4, steal) });
  });
  items.push({ y: sn.y + 0.003, f: () => drawSnail(ctx, s, X(sn.x), Y(sn.y), R(1), t, sn) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();
  // 개미가 노리는 것 (빨간 점선)
  if (idle && S.ants.length) drawAntIntent(ctx, s, X, Y, R, t);
  if (pre) drawPreviewMarks(ctx, s, pre, X, Y, R, t, font);
  // NEW 스포트라이트
  drawSpotlight(ctx, s, X, Y, R, t, font);
  // 가장자리 어둡게
  const vg = ctx.createRadialGradient(w / 2, h * 0.52, R(0.5), w / 2, h * 0.52, R(1.05));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(5,15,5,.32)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  // ═════════ 사건 연출 ═════════
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    y = Math.max(Y(BY0 + 0.03), Math.min(Y(BY0 + GH * CH), y));
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 40 && Math.abs(q.x - x) < w * 0.3 && Math.abs(q.y - y) < size + 4); k++) y -= size + 5;
    rec.push({ x, y, t });
    if (rec.length > 14) rec.shift();
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const hw = ctx.measureText(text).width / 2 + 6;
    fx.pop(Math.max(hw, Math.min(w - hw, x)), y, text, col, size);
  };
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    const due = e.v ?? e.t;
    if (due <= seenT || due > t) continue;
    const x = X(e.x), y = Y(e.y);
    const ex = e as Ev & { n?: number; i?: number };
    if (e.kind === 'eat') {
      const i = ex.i ?? 0;
      fx.burst(x, y, '#9be36b', 10 + i * 5, 2.6 + i * 0.6, 2.4);
      fx.burst(x, y, '#e8ffd0', 5 + i * 2, 2, 1.6);
      fx.ring(x, y, '#d8ffb0', R(0.05 + i * 0.015), 3);
      say(x, y - R(0.05), e.text!, e.col!, 15 + i * 4);
      fx.kick(1.5 + i * 1.2);
    }
    if (e.kind === 'grow') fx.burst(x, y, '#7fd35a', 12, 2.4, 2), fx.ring(x, y, '#c8ffb0', R(0.06), 3), say(x, y - R(0.045), e.text!, e.col!, 15);
    if (e.kind === 'slide') fx.burst(x, y, '#e8f4ff', 8, 2, 1.6), say(x, y - R(0.06), e.text!, e.col!, 15);
    if (e.kind === 'combo') {
      const n = Number(e.text!.replace(/[^0-9]/g, '')) || 2;
      fx.kick(3 + n * 2), fx.blink(n >= 3 ? '#fff6b0' : '#e8ffd0', 0.12 + n * 0.05);
      fx.ring(x, y, n >= 3 ? '#ffe066' : '#d8ffb0', R(0.12 + n * 0.04), 5);
      fx.burst(x, y, '#ffe066', 14 + n * 8, 3 + n, 2.6), fx.burst(x, y, '#9be36b', 10 + n * 6, 2.5 + n * 0.8, 2.2);
      say(w / 2, Y(BY0 + 0.1), e.text!, e.col!, 20 + n * 4);
    }
    if (e.kind === 'splash') fx.burst(x, y, '#9fd8ff', 26, 4, 2.4), fx.ring(x, y, '#bfe6ff', R(CW * 1.3), 5), fx.kick(4), say(x, y - R(0.06), e.text!, e.col!, 18);
    if (e.kind === 'salt') fx.burst(x, y, '#ffffff', 10, 1.8, 1.6), say(x, y - R(0.07), e.text!, e.col!, 17);
    if (e.kind === 'open') fx.ring(x, y, '#fff1a8', R(0.12), 5), fx.burst(x, y, '#fff1a8', 18, 3, 2.2), say(x, y - R(0.07), e.text!, e.col!, 15);
    if (e.kind === 'home') fx.ring(x, y, '#fff1a8', R(0.25), 6), fx.burst(x, y, '#ffe066', 30, 5, 3), fx.burst(x, y, '#ff9fc2', 20, 4, 2.6), fx.kick(5), say(x, y - R(0.07), e.text!, e.col!, 19);
    if (e.kind === 'glue') fx.burst(x, y, '#e9d8ff', 12, 2, 2), fx.ring(x, y, '#d9c4ff', R(0.06), 3), say(x, y - R(0.05), e.text!, e.col!, 16), fx.kick(2);
    if (e.kind === 'steal') fx.kick(8), fx.blink(th.hot, 0.25), say(x, y - R(0.06), e.text!, e.col!, 17);
    if (e.kind === 'bump') fx.kick(3), fx.burst(x, y, '#ffe2c4', 8, 2, 1.8), say(x, y - R(0.04), e.text!, e.col!, 16);
    if (e.kind === 'why') say(x, y, e.text!, e.col!, 14);
    if (e.kind === 'out') say(x, y - R(0.05), e.text!, e.col!, 16), fx.kick(4);
    if (e.kind === 'stage') fx.blink('#f4ffe0', 0.16);
    if (e.kind === 'clear') fx.burst(X(0.5), Y(0.75), '#ffe066', 46, 6, 3.2), fx.burst(X(0.5), Y(0.75), '#9be36b', 30, 5, 3), fx.ring(X(0.5), Y(0.75), '#ffe066', R(0.35), 6), fx.blink('#fff6c8', 0.22);
    if (e.kind === 'fail') fx.kick(9), fx.blink(th.hot, 0.2);
  }
  fx.memo.t = t;
  ctx.restore();
  drawHud(ctx, s, w, X, Y, R, font, th);
}

function drawBackdrop(ctx: CanvasRenderingContext2D, s: SnailState, w: number, h: number, X: F, Y: F, R: F, t: number) {
  // 비 갠 아침 하늘
  const sky = ctx.createLinearGradient(0, 0, 0, Y(0.32));
  sky.addColorStop(0, '#9fd3e6');
  sky.addColorStop(0.7, '#dff1df');
  sky.addColorStop(1, '#f4f1d0');
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, w + 20, Y(0.34) + 10);
  // 해 번짐
  const sun = ctx.createRadialGradient(X(0.82), Y(0.1), R(0.01), X(0.82), Y(0.1), R(0.32));
  sun.addColorStop(0, 'rgba(255,250,210,.95)');
  sun.addColorStop(0.25, 'rgba(255,240,180,.45)');
  sun.addColorStop(1, 'rgba(255,240,180,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, Y(0.36));
  // 무지개 살짝
  ctx.lineWidth = R(0.012);
  ['rgba(255,120,120,.18)', 'rgba(255,210,120,.18)', 'rgba(140,220,140,.18)', 'rgba(120,170,255,.18)'].forEach((c, k) => {
    ctx.strokeStyle = c;
    ctx.beginPath();
    ctx.arc(X(0.3), Y(0.36), R(0.42 - k * 0.012), Math.PI * 1.08, Math.PI * 1.62);
    ctx.stroke();
  });
  // 구름
  for (let k = 0; k < 3; k++) {
    const cx = ((0.15 + k * 0.38 + t * 0.00012 * (1 + k * 0.3)) % 1.3) - 0.15, cy = 0.11 + k * 0.035;
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let j = 0; j < 4; j++) (ctx.beginPath(), ctx.ellipse(X(cx + j * 0.035), Y(cy - (j % 2) * 0.012), R(0.035), R(0.022), 0, 0, TAU), ctx.fill());
  }
  // 먼 산울타리
  ctx.fillStyle = '#7fb36a';
  ctx.beginPath();
  ctx.moveTo(0, Y(0.3));
  for (let x = 0; x <= 1.01; x += 0.05) ctx.lineTo(X(x), Y(0.245 - 0.018 * Math.abs(Math.sin(x * 9.3)) - 0.01 * Math.sin(x * 23)));
  ctx.lineTo(w, Y(0.3));
  ctx.fill();
  // 나무 울타리
  for (let k = 0; k < 12; k++) {
    const x = 0.02 + k * 0.088;
    ctx.fillStyle = k % 2 ? '#e8d7b5' : '#f1e3c4';
    ctx.beginPath();
    ctx.moveTo(X(x), Y(0.305));
    ctx.lineTo(X(x), Y(0.22));
    ctx.lineTo(X(x + 0.03), Y(0.205));
    ctx.lineTo(X(x + 0.06), Y(0.22));
    ctx.lineTo(X(x + 0.06), Y(0.305));
    ctx.fill();
    ctx.fillStyle = 'rgba(120,90,50,.18)';
    ctx.fillRect(X(x + 0.045), Y(0.22), X(0.015), Y(0.085));
  }
  ctx.fillStyle = '#d9c49c';
  ctx.fillRect(0, Y(0.238), w, Y(0.012));
  ctx.fillRect(0, Y(0.278), w, Y(0.012));
  // 잔디
  const gr = ctx.createLinearGradient(0, Y(0.29), 0, h);
  gr.addColorStop(0, '#6fae4e');
  gr.addColorStop(0.5, '#4f8a39');
  gr.addColorStop(1, '#2d5a25');
  ctx.fillStyle = gr;
  ctx.fillRect(0, Y(0.295), w, h - Y(0.295));
  ctx.strokeStyle = 'rgba(30,70,20,.35)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 60; k++) {
    const x = hsh(k + 7) * w, y = Y(0.3) + hsh(k + 77) * (h - Y(0.3));
    const sw = Math.sin(t / 50 + k) * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + sw, y - R(0.012));
    ctx.stroke();
  }
  // 화분 위 개구리 구경꾼 (왼쪽 위)
  drawFrog(ctx, s, X(0.085), Y(0.285), R(1), t);
  // 물뿌리개 (오른쪽)
  {
    const x = X(0.9), y = Y(0.285);
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + R(0.005), R(0.05), R(0.012), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#5aa0d8';
    ctx.beginPath();
    ctx.roundRect(x - R(0.035), y - R(0.055), R(0.07), R(0.055), R(0.012));
    ctx.fill();
    ctx.strokeStyle = '#5aa0d8';
    ctx.lineWidth = R(0.009);
    ctx.beginPath();
    ctx.moveTo(x - R(0.03), y - R(0.035));
    ctx.lineTo(x - R(0.075), y - R(0.07));
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + R(0.012), y - R(0.06), R(0.022), Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(x - R(0.028), y - R(0.05), R(0.012), R(0.04));
  }
  // 나비
  {
    const bx = 0.6 + 0.2 * Math.sin(t / 170), by = 0.17 + 0.04 * Math.sin(t / 47), fl = Math.abs(Math.sin(t / 5));
    ctx.fillStyle = '#ffb3d1';
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(X(bx) + sx * R(0.012) * fl, Y(by), R(0.013) * fl + 1, R(0.016), sx * 0.4, 0, TAU), ctx.fill());
    ctx.fillStyle = '#5b3a29';
    ctx.fillRect(X(bx) - 1, Y(by) - R(0.01), 2, R(0.02));
  }
}

function drawFrog(ctx: CanvasRenderingContext2D, s: SnailState, x: number, y: number, u: number, t: number) {
  // 화분
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.004, u * 0.055, u * 0.012, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#c8673c';
  ctx.beginPath();
  ctx.moveTo(x - u * 0.045, y - u * 0.05);
  ctx.lineTo(x + u * 0.045, y - u * 0.05);
  ctx.lineTo(x + u * 0.035, y);
  ctx.lineTo(x - u * 0.035, y);
  ctx.fill();
  ctx.fillStyle = '#de8250';
  ctx.fillRect(x - u * 0.05, y - u * 0.06, u * 0.1, u * 0.016);
  // 개구리
  const m = s.mood, age = t - s.moodT;
  const hop = m === 'wow' || m === 'cheer' ? Math.abs(Math.sin(age * 0.18)) * u * 0.025 * Math.max(0, 1 - age / 90) : 0;
  const fy = y - u * 0.075 - hop;
  ctx.fillStyle = '#5fbf4a';
  ctx.beginPath();
  ctx.ellipse(x, fy, u * 0.04, u * 0.028, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#c9f0a8';
  ctx.beginPath();
  ctx.ellipse(x, fy + u * 0.008, u * 0.026, u * (0.014 + (m === 'idle' ? 0.003 * Math.sin(t / 12) : 0)), 0, 0, TAU);
  ctx.fill();
  const big = m === 'wow' || m === 'whee' ? 1.35 : 1;
  for (const sx of [-1, 1]) {
    ctx.fillStyle = '#5fbf4a';
    ctx.beginPath();
    ctx.arc(x + sx * u * 0.022, fy - u * 0.024, u * 0.014 * big, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + sx * u * 0.022, fy - u * 0.025, u * 0.01 * big, 0, TAU);
    ctx.fill();
    // 눈동자는 달팽이를 본다
    const sn = snailAt(s), dx = sn.x * u - x, dy = sn.y * u - fy, dl = Math.hypot(dx, dy) || 1;
    ctx.fillStyle = '#1d2a14';
    if (m === 'bump' && age < 60) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1d2a14';
      ctx.beginPath();
      ctx.arc(x + sx * u * 0.022, fy - u * 0.022, u * 0.006, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x + sx * u * 0.022 + (dx / dl) * u * 0.004, fy - u * 0.025 + (dy / dl) * u * 0.004, u * 0.005 * big, 0, TAU);
      ctx.fill();
    }
  }
  ctx.strokeStyle = '#2f6b23';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (m === 'wow' || m === 'cheer' || m === 'bump') ctx.ellipse(x, fy + u * 0.004, u * 0.01, u * 0.006, 0, 0, TAU);
  else ctx.arc(x, fy - u * 0.002, u * 0.014, 0.2, Math.PI - 0.2);
  ctx.stroke();
  // 박수 손
  if ((m === 'wow' || m === 'cheer') && age < 120) {
    const cl = Math.abs(Math.sin(age * 0.35));
    ctx.fillStyle = '#5fbf4a';
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(x + sx * u * (0.012 + 0.02 * cl), fy + u * 0.012, u * 0.009, 0, TAU), ctx.fill());
  }
  if (m === 'bump' && age < 50) {
    ctx.font = `800 ${Math.max(12, u * 0.034)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.lineWidth = 3;
    ctx.strokeText('개굴ㅋ', x + u * 0.045, fy - u * 0.03);
    ctx.fillText('개굴ㅋ', x + u * 0.045, fy - u * 0.03);
  } else if ((m === 'wow' || m === 'cheer') && age < 60) {
    ctx.font = `800 ${Math.max(12, u * 0.034)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff6b0';
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.lineWidth = 3;
    ctx.strokeText('개굴!', x + u * 0.045, fy - u * 0.03);
    ctx.fillText('개굴!', x + u * 0.045, fy - u * 0.03);
  }
}

function drawTile(ctx: CanvasRenderingContext2D, L: Level, c: number, X: F, Y: F, R: F, t: number) {
  const x0 = X(BX0 + (c % GW) * CW), y0 = Y(BY0 + Math.floor(c / GW) * CH), cw = R(CW), ch = R(CH), ins = R(0.005);
  if (bit(L.rock, c)) {
    // 이끼 낀 풀밭 칸 (못 가는 곳)
    ctx.fillStyle = '#3f6e31';
    ctx.beginPath();
    ctx.roundRect(x0 + ins, y0 + ins, cw - ins * 2, ch - ins * 2, R(0.012));
    ctx.fill();
    ctx.fillStyle = 'rgba(120,180,90,.35)';
    for (let k = 0; k < 5; k++) (ctx.beginPath(), ctx.arc(x0 + hsh(c * 7 + k) * cw, y0 + hsh(c * 11 + k) * ch, R(0.006), 0, TAU), ctx.fill());
    return;
  }
  // 촉촉한 흙 칸 (두께 있는 타일)
  ctx.fillStyle = '#2c1c10';
  ctx.beginPath();
  ctx.roundRect(x0 + ins, y0 + ins + R(0.008), cw - ins * 2, ch - ins * 2, R(0.014));
  ctx.fill();
  const g = ctx.createLinearGradient(0, y0, 0, y0 + ch);
  g.addColorStop(0, '#7a5638');
  g.addColorStop(1, '#5e4029');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x0 + ins, y0 + ins, cw - ins * 2, ch - ins * 2 - R(0.004), R(0.014));
  ctx.fill();
  ctx.fillStyle = 'rgba(255,230,190,.10)';
  ctx.fillRect(x0 + ins * 3, y0 + ins * 1.5, cw - ins * 6, R(0.004));
  for (let k = 0; k < 6; k++) {
    ctx.fillStyle = k % 2 ? 'rgba(30,15,5,.35)' : 'rgba(160,120,80,.3)';
    ctx.beginPath();
    ctx.arc(x0 + (0.15 + hsh(c * 13 + k) * 0.7) * cw, y0 + (0.2 + hsh(c * 17 + k) * 0.6) * ch, R(0.0035 + hsh(c + k) * 0.003), 0, TAU);
    ctx.fill();
  }
  void t;
}

function drawRock(ctx: CanvasRenderingContext2D, L: Level, x: number, y: number, R: F, c: number, t: number) {
  const edge = [0, 1, 2, 3].some((d) => NB[c * 4 + d] >= 0 && !bit(L.rock, NB[c * 4 + d]));
  if (!edge) {
    // 길에 안 닿는 칸은 낮은 꽃밭 (덜 시끄럽게)
    for (let k = 0; k < 4; k++) {
      const px = x + (hsh(c * 3 + k) - 0.5) * R(CW * 0.7), py = y + (hsh(c * 5 + k) - 0.5) * R(CH * 0.6);
      ctx.fillStyle = k % 2 ? '#4c9a3f' : '#5aa848';
      ctx.beginPath();
      ctx.arc(px, py, R(0.016), 0, TAU);
      ctx.fill();
      ctx.fillStyle = ['#ffd3e8', '#fff1a8', '#ffffff', '#c9b6ff'][Math.floor(hsh(c * 7 + k) * 4)];
      ctx.beginPath();
      ctx.arc(px, py - R(0.008), R(0.006), 0, TAU);
      ctx.fill();
    }
    return;
  }
  const kind = hsh(c * 3.7) < 0.55 ? 'stone' : hsh(c * 5.1) < 0.6 ? 'bush' : 'pot';
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + R(0.03), R(0.07), R(0.022), 0, 0, TAU);
  ctx.fill();
  if (kind === 'stone') {
    const g = ctx.createRadialGradient(x - R(0.02), y - R(0.02), R(0.01), x, y, R(0.08));
    g.addColorStop(0, '#c9c6bd');
    g.addColorStop(1, '#7d7a72');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y + R(0.005), R(0.066), R(0.05), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#6a9e46';
    ctx.beginPath();
    ctx.ellipse(x - R(0.015), y - R(0.032), R(0.035), R(0.014), -0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.beginPath();
    ctx.ellipse(x - R(0.025), y - R(0.008), R(0.012), R(0.007), -0.5, 0, TAU);
    ctx.fill();
    // 빗방울
    ctx.fillStyle = `rgba(230,245,255,${0.6 + 0.3 * Math.sin(t / 30 + c)})`;
    ctx.beginPath();
    ctx.arc(x + R(0.025), y - R(0.01), R(0.005), 0, TAU);
    ctx.fill();
  } else if (kind === 'bush') {
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = k % 2 ? '#3f8f3a' : '#4fa846';
      ctx.beginPath();
      ctx.arc(x + (k - 2) * R(0.024), y - R(0.012) - (k % 2) * R(0.018), R(0.034), 0, TAU);
      ctx.fill();
    }
    const flc = ['#ffd3e8', '#fff1a8', '#ffffff'][Math.floor(hsh(c) * 3)];
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = flc;
      ctx.beginPath();
      ctx.arc(x + (hsh(c + k * 3) - 0.5) * R(0.09), y - R(0.02) - hsh(c * 2 + k) * R(0.035), R(0.008), 0, TAU);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#c8673c';
    ctx.beginPath();
    ctx.moveTo(x - R(0.045), y - R(0.035));
    ctx.lineTo(x + R(0.045), y - R(0.035));
    ctx.lineTo(x + R(0.034), y + R(0.03));
    ctx.lineTo(x - R(0.034), y + R(0.03));
    ctx.fill();
    ctx.fillStyle = '#de8250';
    ctx.fillRect(x - R(0.05), y - R(0.045), R(0.1), R(0.016));
    ctx.fillStyle = '#ff8fa3';
    for (let k = 0; k < 5; k++) (ctx.beginPath(), ctx.arc(x + Math.cos((k / 5) * TAU) * R(0.016), y - R(0.07) + Math.sin((k / 5) * TAU) * R(0.016), R(0.012), 0, TAU), ctx.fill());
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(x, y - R(0.07), R(0.009), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#3f8f3a';
    ctx.lineWidth = R(0.006);
    ctx.beginPath();
    ctx.moveTo(x, y - R(0.06));
    ctx.lineTo(x, y - R(0.04));
    ctx.stroke();
  }
}

function drawSlime(ctx: CanvasRenderingContext2D, s: SnailState, X: F, Y: F, R: F, t: number) {
  const S = s.S, vis = (c: number) => c >= 0 && bit(S.slime, c) && t >= s.slimeT[c];
  ctx.save();
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass === 0 ? 'rgba(120,150,220,.35)' : 'rgba(205,222,255,.5)';
    for (let c = 0; c < NC; c++) {
      if (!vis(c)) continue;
      const x = X(cX(c)), y = Y(cY(c)), hw = R(CW * (pass ? 0.3 : 0.34)), hh = R(CH * (pass ? 0.28 : 0.33));
      const age = t - s.slimeT[c], pop = s.slimeT[c] < 0 ? 1 : Math.min(1, age / 8);
      ctx.beginPath();
      ctx.ellipse(x, y + (pass ? 0 : R(0.004)), hw * pop, hh * pop, 0, 0, TAU);
      ctx.fill();
      // 이웃 점액과 잇기
      for (const d of [1, 2]) {
        const n = NB[c * 4 + d];
        if (!vis(n)) continue;
        if (d === 1) ctx.fillRect(x, y - hh * 0.7, R(CW), hh * 1.4);
        else ctx.fillRect(x - hw * 0.75, y, hw * 1.5, R(CH));
      }
    }
  }
  // 반짝이
  for (let c = 0; c < NC; c++) {
    if (!vis(c)) continue;
    const x = X(cX(c)), y = Y(cY(c));
    for (let k = 0; k < 3; k++) {
      const ph = (t / 70 + hsh(c * 5 + k) * 6) % 1, a = Math.sin(ph * Math.PI);
      ctx.fillStyle = `rgba(255,255,255,${0.75 * a})`;
      const px = x + (hsh(c * 3 + k) - 0.5) * R(CW * 0.5), py = y + (hsh(c * 7 + k) - 0.5) * R(CH * 0.45);
      ctx.beginPath();
      ctx.ellipse(px, py, R(0.009) * a + 0.5, R(0.004) * a + 0.5, -0.3, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x - R(0.02), y - R(0.012), R(0.016), Math.PI * 1.1, Math.PI * 1.6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPuddle(ctx: CanvasRenderingContext2D, x: number, y: number, R: F, t: number, c: number) {
  const g = ctx.createLinearGradient(x, y - R(0.05), x, y + R(0.05));
  g.addColorStop(0, '#bfe9ff');
  g.addColorStop(1, '#4b9bd6');
  ctx.fillStyle = 'rgba(30,50,80,.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + R(0.006), R(0.07), R(0.05), 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, R(0.066), R(0.046), 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 1.4;
  for (let k = 0; k < 2; k++) {
    const ph = ((t / 60 + k * 0.5 + hsh(c)) % 1);
    ctx.globalAlpha = 1 - ph;
    ctx.beginPath();
    ctx.ellipse(x + R(0.01), y + R(0.005), R(0.012 + ph * 0.045), R(0.008 + ph * 0.03), 0, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.beginPath();
  ctx.ellipse(x - R(0.03), y - R(0.02), R(0.014), R(0.006), -0.3, 0, TAU);
  ctx.fill();
}

function drawSalt(ctx: CanvasRenderingContext2D, x: number, y: number, R: F, t: number, c: number, saltT: number) {
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.beginPath();
  ctx.ellipse(x, y + R(0.01), R(0.07), R(0.05), 0, 0, TAU);
  ctx.fill();
  const bounce = t - saltT < 20 ? Math.sin((t - saltT) * 0.5) * R(0.004) : 0;
  for (let k = 0; k < 14; k++) {
    const a = hsh(c * 9 + k) * TAU, rr = hsh(c * 4 + k) * 0.045;
    const px = x + Math.cos(a) * R(rr), py = y + R(0.012) + Math.sin(a) * R(rr * 0.6) - (0.045 - rr) * R(0.6) + bounce;
    ctx.fillStyle = k % 3 ? '#ffffff' : '#dfe6ee';
    ctx.fillRect(px - R(0.006), py - R(0.006), R(0.012), R(0.012));
  }
  ctx.fillStyle = '#f4f7fb';
  ctx.beginPath();
  ctx.moveTo(x - R(0.045), y + R(0.022));
  ctx.quadraticCurveTo(x, y - R(0.045) + bounce, x + R(0.045), y + R(0.022));
  ctx.fill();
  ctx.fillStyle = 'rgba(160,175,195,.5)';
  ctx.beginPath();
  ctx.moveTo(x + R(0.005), y + R(0.022));
  ctx.quadraticCurveTo(x + R(0.02), y - R(0.01) + bounce, x + R(0.045), y + R(0.022));
  ctx.fill();
  ctx.font = `${Math.max(12, R(0.034))}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🧂', x + R(0.05), y - R(0.035));
  const sp = (t / 45 + hsh(c)) % 1;
  ctx.fillStyle = `rgba(255,255,255,${Math.sin(sp * Math.PI)})`;
  ctx.beginPath();
  ctx.arc(x - R(0.02), y - R(0.02), R(0.006), 0, TAU);
  ctx.fill();
}

function drawSprout(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number, c: number) {
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.02, u * 0.03, u * 0.01, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#4a3020';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.015, u * 0.026, u * 0.012, 0, 0, TAU);
  ctx.fill();
  const sw = Math.sin(t / 35 + c) * 0.15;
  ctx.strokeStyle = '#5daa3c';
  ctx.lineWidth = u * 0.006;
  ctx.beginPath();
  ctx.moveTo(x, y + u * 0.012);
  ctx.quadraticCurveTo(x + sw * u * 0.02, y - u * 0.01, x + sw * u * 0.03, y - u * 0.025);
  ctx.stroke();
  for (const sx of [-1, 1]) {
    ctx.fillStyle = sx < 0 ? '#7fd35a' : '#93e06b';
    ctx.beginPath();
    ctx.ellipse(x + sw * u * 0.03 + sx * u * 0.016, y - u * 0.03, u * 0.018, u * 0.009, sx * 0.5 + sw, 0, TAU);
    ctx.fill();
  }
  // 목마른 땀방울
  ctx.fillStyle = `rgba(180,220,255,${0.5 + 0.4 * Math.sin(t / 20 + c)})`;
  ctx.beginPath();
  ctx.arc(x + u * 0.03, y - u * 0.045, u * 0.006, 0, TAU);
  ctx.fill();
}

function drawLettuce(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number, c: number, growT: number) {
  const age = t - growT, sc = growT < 0 ? 1 : age < 14 ? 0.3 + 0.7 * easeOut(age / 10) + Math.sin(age * 0.6) * 0.08 * (1 - age / 14) : 1;
  const r = u * 0.048 * sc, wob = Math.sin(t / 40 + c) * 0.04;
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.024, r * 1.1, r * 0.35, 0, 0, TAU);
  ctx.fill();
  const cy = y - r * 0.35;
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * TAU + wob;
    ctx.fillStyle = k % 2 ? '#4fae3f' : '#5fbf4a';
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.4, r * 0.55, r * 0.45, a, 0, TAU);
    ctx.fill();
  }
  const g = ctx.createRadialGradient(x - r * 0.2, cy - r * 0.3, r * 0.05, x, cy, r * 0.8);
  g.addColorStop(0, '#e6ffc4');
  g.addColorStop(1, '#8fd96a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, cy - r * 0.05, r * 0.6, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,130,40,.55)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.arc(x, cy + r * 0.3, r * (0.3 + k * 0.15), Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.25, cy - r * 0.3, r * 0.15, r * 0.08, -0.5, 0, TAU);
  ctx.fill();
}

function drawHome(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number, s: SnailState) {
  const open = t >= s.openT && allEaten(s.L, s.S), oa = open ? clamp01((t - s.openT) / 20) : 0;
  if (open) {
    const gl = ctx.createRadialGradient(x, y - u * 0.02, u * 0.01, x, y - u * 0.02, u * 0.11);
    gl.addColorStop(0, `rgba(255,240,170,${0.6 + 0.2 * Math.sin(t / 10)})`);
    gl.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(x, y - u * 0.02, u * 0.11, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.03, u * 0.07, u * 0.02, 0, 0, TAU);
  ctx.fill();
  // 소라 껍데기 집
  const g = ctx.createRadialGradient(x - u * 0.02, y - u * 0.04, u * 0.01, x, y - u * 0.01, u * 0.075);
  g.addColorStop(0, '#fff3e6');
  g.addColorStop(1, '#f0b7a6');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - u * 0.065, y + u * 0.025);
  ctx.quadraticCurveTo(x - u * 0.07, y - u * 0.06, x, y - u * 0.075);
  ctx.quadraticCurveTo(x + u * 0.07, y - u * 0.06, x + u * 0.065, y + u * 0.025);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(190,110,90,.6)';
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.arc(x, y - u * 0.075 + u * 0.03 * (k + 1), u * (0.03 + k * 0.012), Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  // 문
  ctx.fillStyle = open ? '#ffe9a0' : '#7a4a2a';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.008, u * 0.022, u * 0.026, 0, Math.PI, 0);
  ctx.lineTo(x + u * 0.022, y + u * 0.025);
  ctx.lineTo(x - u * 0.022, y + u * 0.025);
  ctx.fill();
  if (!open) {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(x, y + u * 0.012, u * 0.006, 0, TAU);
    ctx.fill();
    ctx.font = `${Math.max(12, u * 0.03)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🔒', x + u * 0.045, y - u * 0.05);
  } else {
    ctx.fillStyle = `rgba(255,255,255,${0.6 * oa})`;
    for (let k = 0; k < 3; k++) {
      const a = t / 20 + (k * TAU) / 3;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * u * 0.06, y - u * 0.04 + Math.sin(a) * u * 0.03, u * 0.005, 0, TAU);
      ctx.fill();
    }
  }
}

function drawAnt(ctx: CanvasRenderingContext2D, x: number, y: number, u0: number, t: number, stuck: boolean, ang: number, steal: boolean) {
  const u = u0 * 1.5;
  ctx.fillStyle = stuck ? 'rgba(200,180,255,.5)' : 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.012, u * (stuck ? 0.04 : 0.03), u * 0.012, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y - u * 0.008);
  ctx.rotate(ang + Math.PI / 2);
  const leg = stuck ? Math.sin(t * 0.9) * 0.6 : Math.sin(t * 0.4) * 0.35;
  ctx.strokeStyle = '#2a1410';
  ctx.lineWidth = Math.max(1.2, u * 0.0035);
  for (let k = -1; k <= 1; k++)
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, k * u * 0.008);
      ctx.lineTo(sx * u * 0.02, k * u * 0.012 + sx * leg * u * 0.008 * (k === 0 ? -1 : 1));
      ctx.stroke();
    }
  ctx.fillStyle = '#4a1d14';
  for (const [oy, rr] of [[-0.016, 0.009], [0, 0.007], [0.016, 0.011]] as const) {
    ctx.beginPath();
    ctx.ellipse(0, oy * u, rr * u, rr * u * 1.1, 0, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = '#4a1d14';
  ctx.beginPath();
  ctx.moveTo(-u * 0.004, -u * 0.024);
  ctx.lineTo(-u * 0.01, -u * 0.034);
  ctx.moveTo(u * 0.004, -u * 0.024);
  ctx.lineTo(u * 0.01, -u * 0.034);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(sx * u * 0.004, -u * 0.019, u * 0.0028, 0, TAU), ctx.fill());
  if (steal) {
    ctx.fillStyle = '#7fd35a';
    ctx.beginPath();
    ctx.arc(0, -u * 0.035, u * 0.016, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  if (stuck) {
    ctx.font = `800 ${Math.max(12, u * 0.03)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('💦', x + u * 0.03, y - u * 0.03 + Math.sin(t / 8) * 1.5);
  }
}

function drawSnail(ctx: CanvasRenderingContext2D, s: SnailState, x: number, y: number, u0: number, t: number, sn: { moving: number; slide: boolean }) {
  const u = u0 * 1.18;
  const m = s.mood, age = t - s.moodT, f = s.face;
  const bumpAge = t - s.bumpT, saltAge = t - s.saltT, homeAge = t - s.homeT;
  const shrink = saltAge < 36 ? 1 - 0.16 * Math.sin((saltAge / 36) * Math.PI) : 1;
  const inHome = s.S.done && homeAge >= 0;
  const hs = inHome ? Math.max(0, 1 - homeAge / 30) : 1;
  if (hs <= 0.02) return;
  const crawlPh = sn.moving && !sn.slide ? Math.sin(t * 0.5) : 0;
  const stretch = (sn.slide ? 1.18 : 1 + crawlPh * 0.06) * shrink * hs, squash = (sn.slide ? 0.88 : 1 - crawlPh * 0.04) * shrink * hs;
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.026, u * 0.07 * stretch, u * 0.016, 0, 0, TAU);
  ctx.fill();
  // 속도선
  if (sn.slide && sn.moving) {
    const d = s.mv!.d;
    ctx.strokeStyle = 'rgba(255,255,255,.65)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      const off = (k - 1.5) * u * 0.016, len = u * (0.06 + 0.03 * Math.sin(t + k));
      ctx.beginPath();
      if (d === 1 || d === 3) {
        const sx = d === 1 ? -1 : 1;
        ctx.moveTo(x + sx * u * 0.06, y + off - u * 0.01);
        ctx.lineTo(x + sx * (u * 0.06 + len), y + off - u * 0.01);
      } else {
        const sy = d === 2 ? -1 : 1;
        ctx.moveTo(x + off, y + sy * u * 0.035);
        ctx.lineTo(x + off, y + sy * (u * 0.035 + len));
      }
      ctx.stroke();
    }
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(f * stretch, squash);
  // 몸
  const body = ctx.createLinearGradient(0, -u * 0.02, 0, u * 0.025);
  body.addColorStop(0, '#ffe3a3');
  body.addColorStop(1, '#e8b768');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-u * 0.065, u * 0.022);
  ctx.quadraticCurveTo(-u * 0.07, u * 0.008, -u * 0.04, u * 0.006);
  ctx.lineTo(u * 0.03, u * 0.0);
  ctx.quadraticCurveTo(u * 0.06, -u * 0.012, u * 0.064, u * 0.01);
  ctx.quadraticCurveTo(u * 0.066, u * 0.026, u * 0.04, u * 0.026);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath();
  ctx.ellipse(u * 0.03, u * 0.005, u * 0.02, u * 0.005, -0.1, 0, TAU);
  ctx.fill();
  // 껍데기
  const sh = ctx.createRadialGradient(-u * 0.025, -u * 0.04, u * 0.005, -u * 0.012, -u * 0.022, u * 0.05);
  sh.addColorStop(0, '#ffcf7a');
  sh.addColorStop(0.6, '#e0873a');
  sh.addColorStop(1, '#a8541f');
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.arc(-u * 0.012, -u * 0.022, u * 0.042, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#7a3a12';
  ctx.lineWidth = Math.max(1.5, u * 0.005);
  ctx.beginPath();
  for (let k = 0; k <= 40; k++) {
    const a = k * 0.42 + (sn.slide ? t * 0.3 : 0), rr = u * 0.034 * (1 - k / 44);
    const px = -u * 0.012 + Math.cos(a) * rr, py = -u * 0.022 + Math.sin(a) * rr;
    k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.beginPath();
  ctx.ellipse(-u * 0.03, -u * 0.045, u * 0.012, u * 0.006, -0.6, 0, TAU);
  ctx.fill();
  // 눈자루: 부딪히면 쏙 들어갔다 뿅
  let el = 1;
  if (bumpAge < 26) el = bumpAge < 6 ? 1 - bumpAge / 6 : bumpAge < 12 ? 0 : 1 + Math.sin(((bumpAge - 12) / 14) * Math.PI) * 0.45 * (1 - (bumpAge - 12) / 14) + ((bumpAge - 12) / 14) * 0 - (1 - Math.min(1, (bumpAge - 12) / 5));
  el = Math.max(0, el);
  const lean = sn.slide && sn.moving ? -0.9 : m === 'wow' && age < 40 ? 0.25 : 0.1;
  const big = (m === 'wow' || m === 'whee') && age < 50 ? 1.3 : 1;
  for (const k of [0, 1]) {
    const bx = u * (0.048 + k * 0.012), by = -u * 0.002;
    const ln = u * (0.034 + k * 0.004) * el;
    const ex = bx + Math.sin(lean + (k ? 0.2 : -0.1)) * ln, ey = by - Math.cos(lean + (k ? 0.2 : -0.1)) * ln;
    ctx.strokeStyle = '#e8b768';
    ctx.lineWidth = Math.max(2, u * 0.007);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, ey, u * 0.011 * big * Math.max(0.5, el > 0.05 ? 1 : 0.6), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,30,.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#20140c';
    if (m === 'dizzy') {
      ctx.strokeStyle = '#20140c';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let q = 0; q < 12; q++) {
        const a = q * 0.7 + t * 0.2, rr = u * 0.0008 * q;
        q ? ctx.lineTo(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr) : ctx.moveTo(ex, ey);
      }
      ctx.stroke();
    } else if (m === 'cheer' || m === 'yum') {
      ctx.strokeStyle = '#20140c';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(ex, ey + u * 0.003, u * 0.006, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else {
      const blink = (t + 37) % 190 < 6 ? 0.25 : 1;
      ctx.beginPath();
      ctx.ellipse(ex + u * 0.003, ey + u * 0.001, u * 0.005 * big, u * 0.005 * big * blink, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + u * 0.005, ey - u * 0.002, u * 0.0018, 0, TAU);
      ctx.fill();
    }
  }
  ctx.lineCap = 'butt';
  // 입
  ctx.strokeStyle = '#8a4a1a';
  ctx.fillStyle = '#8a3a1a';
  ctx.lineWidth = 1.4;
  const chomp = (m === 'yum' || m === 'wow') && age < 40 ? Math.abs(Math.sin(age * 0.5)) : 0;
  ctx.beginPath();
  if (chomp > 0.05 || (sn.slide && sn.moving)) {
    ctx.ellipse(u * 0.058, u * 0.012, u * 0.006, u * (0.003 + 0.005 * Math.max(chomp, sn.slide ? 0.8 : 0)), 0, 0, TAU);
    ctx.fill();
  } else {
    ctx.arc(u * 0.054, u * 0.008, u * 0.007, 0.3, Math.PI - 0.6);
    ctx.stroke();
  }
  // 볼 터치
  ctx.fillStyle = 'rgba(255,130,120,.45)';
  ctx.beginPath();
  ctx.ellipse(u * 0.045, u * 0.014, u * 0.007, u * 0.004, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  // 콩! 별 / 짜! 땀
  if (bumpAge < 30) {
    ctx.fillStyle = '#ffe066';
    for (let k = 0; k < 3; k++) {
      const a = t * 0.2 + (k * TAU) / 3;
      ctx.beginPath();
      ctx.arc(x + f * u * 0.05 + Math.cos(a) * u * 0.025, y - u * 0.05 + Math.sin(a) * u * 0.01, u * 0.006, 0, TAU);
      ctx.fill();
    }
  }
  if (saltAge < 40 || m === 'dizzy') {
    ctx.font = `${Math.max(12, u * 0.03)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('💦', x - f * u * 0.05, y - u * 0.06);
  }
  if (m === 'cheer' && age < 200) {
    ctx.font = `${Math.max(12, u * 0.032)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('💕', x + f * u * 0.03, y - u * 0.09 - (age % 60) * 0.3);
  }
}

function drawChevrons(ctx: CanvasRenderingContext2D, s: SnailState, X: F, Y: F, R: F, t: number) {
  const S = s.S, L = s.L;
  for (let d = 0; d < 4; d++) {
    const n = NB[S.pos * 4 + d];
    if (!open(L, S, n)) continue;
    const slide = !!bit(S.slime, n);
    const x = X(cX(S.pos) + DX[d] * CW * 0.62), y = Y(cY(S.pos) + DY[d] * CH * 0.62), pul = 1 + 0.12 * Math.sin(t / 9);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate([-Math.PI / 2, 0, Math.PI / 2, Math.PI][d]);
    ctx.scale(pul, pul);
    ctx.strokeStyle = slide ? 'rgba(200,235,255,.95)' : 'rgba(255,255,255,.75)';
    ctx.lineWidth = Math.max(2, R(0.008));
    ctx.lineCap = 'round';
    for (let k = 0; k < (slide ? 2 : 1); k++) {
      ctx.beginPath();
      ctx.moveTo(-R(0.012) + k * R(0.014), -R(0.014));
      ctx.lineTo(R(0.002) + k * R(0.014), 0);
      ctx.lineTo(-R(0.012) + k * R(0.014), R(0.014));
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawPreviewPath(ctx: CanvasRenderingContext2D, _s: SnailState, pre: Preview, X: F, Y: F, R: F, t: number) {
  if (!pre.moved) return;
  const mv = pre.rec.find((e) => e.k === 'move') as Extract<RE, { k: 'move' }>;
  const p = mv.path;
  ctx.save();
  ctx.strokeStyle = mv.slide ? 'rgba(190,235,255,.95)' : 'rgba(255,255,255,.9)';
  ctx.lineWidth = Math.max(3, R(0.012));
  ctx.setLineDash([R(0.018), R(0.014)]);
  ctx.lineDashOffset = -t * 0.8;
  ctx.beginPath();
  ctx.moveTo(X(cX(p[0])), Y(cY(p[0])));
  for (const c of p.slice(1)) ctx.lineTo(X(cX(c)), Y(cY(c)));
  ctx.stroke();
  ctx.setLineDash([]);
  const e = p[p.length - 1];
  ctx.strokeStyle = pre.S.fail === 2 ? 'rgba(255,110,90,.95)' : '#fff1a8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(X(cX(e)), Y(cY(e)), R(CW * 0.38) * (1 + 0.06 * Math.sin(t / 6)), R(CH * 0.36) * (1 + 0.06 * Math.sin(t / 6)), 0, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawPreviewMarks(ctx: CanvasRenderingContext2D, s: SnailState, pre: Preview, X: F, Y: F, R: F, t: number, font: (sz: number, w?: number) => void) {
  const S = s.S;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (!pre.moved) {
    const n = NB[S.pos * 4 + pre.d], x = X(cX(S.pos) + DX[pre.d] * CW * 0.7), y = Y(cY(S.pos) + DY[pre.d] * CH * 0.7);
    ctx.strokeStyle = 'rgba(255,90,80,.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - R(0.02), y - R(0.02));
    ctx.lineTo(x + R(0.02), y + R(0.02));
    ctx.moveTo(x + R(0.02), y - R(0.02));
    ctx.lineTo(x - R(0.02), y + R(0.02));
    ctx.stroke();
    bubble(ctx, X(cX(S.pos)), Y(cY(S.pos)) - R(0.075), n >= 0 && n === s.L.home ? '🔒 상추를 다 먹어야 열려요' : '막혀요 — 콩!', '#ffd0c8', R, font);
    return;
  }
  let eats = 0;
  for (const e of pre.rec) {
    if (e.k === 'eat') {
      eats++;
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(X(cX(e.c)), Y(cY(e.c)) - R(0.015), R(0.045) + Math.sin(t / 5) * 1.5, 0, TAU);
      ctx.stroke();
    }
    if (e.k === 'grow') {
      // 떠나면 자랄 칸: 칸 모서리에 작은 🥬 표시 (달팽이 눈을 가리지 않게)
      const gx = X(cX(e.c) - CW * 0.3), gy = Y(cY(e.c) + CH * 0.28);
      ctx.fillStyle = 'rgba(20,45,15,.8)';
      ctx.beginPath();
      ctx.arc(gx, gy, R(0.022), 0, TAU);
      ctx.fill();
      font(0.026, 900);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('🥬', gx, gy + 1);
    }
    if (e.k === 'ant') {
      ctx.strokeStyle = e.stuck ? 'rgba(210,190,255,.95)' : 'rgba(255,120,100,.9)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(X(cX(e.from)), Y(cY(e.from)));
      ctx.lineTo(X(cX(e.to)), Y(cY(e.to)));
      ctx.stroke();
      ctx.setLineDash([]);
      if (e.stuck) (font(0.03, 900), (ctx.fillStyle = '#ffffff'), ctx.fillText('찰싹!', X(cX(e.to)), Y(cY(e.to)) - R(0.05)));
    }
    if (e.k === 'splash') {
      ctx.strokeStyle = 'rgba(160,215,255,.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(X(cX(e.c)), Y(cY(e.c)), R(CW * 1.4), R(CH * 1.4), 0, 0, TAU);
      ctx.stroke();
    }
  }
  const mv = pre.rec.find((e) => e.k === 'move') as Extract<RE, { k: 'move' }>;
  const end = mv.path[mv.path.length - 1];
  const txt = pre.S.fail === 2 ? '⚠ 개미가 상추를 가져가요!' : pre.S.done ? '🐚 집으로 쏙!' : eats >= 2 ? `슈우욱 냠×${eats}!` : eats ? '냠!' : mv.slide ? `쭉 ${mv.path.length - 1}칸` : pre.rec.some((e) => e.k === 'grow') ? '🌱 물 주기' : '꿈틀';
  bubble(ctx, X(cX(end)), Y(cY(end)) - R(0.085), txt, pre.S.fail === 2 ? '#ffd0c8' : eats >= 2 || pre.S.done ? '#fff1a8' : '#ffffff', R, font);
}

function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, col: string, R: F, font: (sz: number, w?: number) => void) {
  font(0.036, 900);
  const tw = ctx.measureText(text).width + R(0.03), cw = ctx.canvas.width / (ctx.getTransform().a || 1);
  const bx = Math.max(4, Math.min(cw - tw - 4, x - tw / 2));
  ctx.fillStyle = 'rgba(20,35,15,.85)';
  ctx.beginPath();
  ctx.roundRect(bx, y - R(0.024), tw, R(0.048), R(0.024));
  ctx.fill();
  ctx.fillStyle = col;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + tw / 2, y + 1);
}

function drawAntIntent(ctx: CanvasRenderingContext2D, s: SnailState, X: F, Y: F, R: F, t: number) {
  const L = s.L, S = s.S;
  S.ants.forEach((c, a) => {
    if (bit(S.slime, c)) return;
    const n = antStep(L, S, a);
    if (n === c) return;
    const x0 = X(cX(c)), y0 = Y(cY(c)), x1 = X(cX(n)), y1 = Y(cY(n));
    ctx.strokeStyle = `rgba(255,110,90,${0.6 + 0.3 * Math.sin(t / 8)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0 + (x1 - x0) * 0.35, y0 + (y1 - y0) * 0.35);
    ctx.lineTo(x0 + (x1 - x0) * 0.75, y0 + (y1 - y0) * 0.75);
    ctx.stroke();
    const ang = Math.atan2(y1 - y0, x1 - x0), hx = x0 + (x1 - x0) * 0.8, hy = y0 + (y1 - y0) * 0.8;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(ang) * R(0.014), hy + Math.sin(ang) * R(0.014));
    ctx.lineTo(hx + Math.cos(ang + 2.4) * R(0.014), hy + Math.sin(ang + 2.4) * R(0.014));
    ctx.lineTo(hx + Math.cos(ang - 2.4) * R(0.014), hy + Math.sin(ang - 2.4) * R(0.014));
    ctx.fill();
  });
}

const SPOT: Record<string, (L: Level) => number[]> = {
  night: (L) => [...Array(NC).keys()].filter((c) => bit(L.slime0, c)),
  puddle: (L) => [...Array(NC).keys()].filter((c) => bit(L.pud, c)),
  ant: (L) => L.ants0,
  salt: (L) => [...Array(NC).keys()].filter((c) => bit(L.salt, c)),
};
function drawSpotlight(ctx: CanvasRenderingContext2D, s: SnailState, X: F, Y: F, R: F, t: number, font: (sz: number, w?: number) => void) {
  const key = STAGES[s.stage].key, age = t - s.startT;
  if (!SPOT[key] || s.tries > 0 || age > 170 || s.phase !== 'play') return;
  const a = Math.min(1, age / 10, (170 - age) / 20);
  const cells = SPOT[key](s.L);
  ctx.globalAlpha = a;
  for (const c of cells) {
    const x = X(cX(c)), y = Y(cY(c));
    ctx.strokeStyle = '#fff6a8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, R(0.065) + Math.sin(t / 6) * 3, 0, TAU);
    ctx.stroke();
  }
  if (cells.length && key !== 'night') {
    const c = cells[0], x = X(cX(c)), y = Y(cY(c)) - R(0.085);
    font(0.03, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff5a8a';
    ctx.beginPath();
    ctx.roundRect(x - R(0.045), y - R(0.018), R(0.09), R(0.036), R(0.018));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('NEW', x, y + 1);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx: CanvasRenderingContext2D, s: SnailState, w: number, X: F, Y: F, R: F, font: (sz: number, w?: number) => void, th: Theme) {
  const t = s.t, S = s.S, L = s.L, d = STAGES[s.stage];
  const hb = R(0.068);
  ctx.fillStyle = 'rgba(18,34,14,.82)';
  ctx.fillRect(0, 0, w, hb);
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f4ffe0';
  ctx.fillText(`${s.stage + 1}/${STAGES.length}판 · ${d.emoji} ${d.name}`, R(0.03), hb * 0.52);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);
  // 새것 알림
  if (s.news && t - s.news.t < NEWS_T + 20) {
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T + 20 - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    const tx = `✨ ${s.news.text}`;
    let fs = 0.036;
    font(fs, 900);
    while (ctx.measureText(tx).width > w - R(0.06) && fs > 0.031) font((fs -= 0.001), 900);
    const tw2 = Math.min(w - 6, ctx.measureText(tx).width + 20), by2 = Y(0.105) - drop;
    ctx.fillStyle = 'rgba(25,45,18,.9)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.027), tw2, R(0.054), R(0.027));
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f4ffe0';
    ctx.fillText(tx, w / 2, by2 + 1);
    ctx.globalAlpha = 1;
  }
  // 판 시작 큰 글씨 (하늘 띠에 — 판을 가리지 않게)
  {
    const age = t - s.startT;
    if (age < 130 && s.phase === 'play') {
      const fade = s.S.taps > 0 ? Math.max(0, 1 - (t - s.lastTap) / 12) : 1;
      const a = Math.min(1, age / 8, (130 - age) / 20) * fade, sc = 1 + Math.max(0, 8 - age) * 0.04;
      if (a > 0.01) {
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(20,40,14,.62)';
        ctx.fillRect(0, Y(0.15), w, R(0.13));
        ctx.save();
        ctx.translate(w / 2, Y(0.205));
        ctx.scale(sc, sc);
        font(0.062, 900);
        ctx.textAlign = 'center';
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(20,35,10,.8)';
        const big = `${d.emoji} ${s.stage + 1}판 · ${d.name}`;
        ctx.strokeText(big, 0, 0);
        ctx.fillStyle = '#fff6d6';
        ctx.fillText(big, 0, 0);
        font(0.036, 800);
        const sub = `상추 ${L.food.length}개를 먹고 집으로 · 톡 ${L.limit}번`;
        ctx.strokeText(sub, 0, R(0.05));
        ctx.fillText(sub, 0, R(0.05));
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }
  }
  // 결과
  if (s.phase === 'result') {
    const age = s.pt, a = Math.min(1, age / 10);
    ctx.globalAlpha = a;
    ctx.fillStyle = s.ok ? 'rgba(30,55,20,.68)' : 'rgba(70,20,20,.66)';
    ctx.fillRect(0, Y(0.6), w, R(0.26));
    ctx.textAlign = 'center';
    font(s.ok ? 0.058 : 0.05, 900);
    ctx.fillStyle = s.ok ? '#fff1a8' : '#ffd0c8';
    ctx.fillText(s.ok ? (s.won ? '정원 완주! 🎉' : `${d.emoji} ${d.name} 냠 완료!`) : s.why, w / 2, Y(0.66));
    if (s.ok) {
      for (let k = 0; k < 3; k++) {
        const ag = age - 14 - k * 10, got = k < s.got;
        if (ag < 0) continue;
        const sc = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(0.08 * sc, 900);
        ctx.fillStyle = got ? '#ffd166' : 'rgba(255,255,255,.35)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (k - 1) * R(0.1), Y(0.75));
        if (got && (juice(s).memo['star' + k] ?? -1) < s.clearT) (juice(s).memo['star' + k] = s.clearT), juice(s).burst(w / 2 + (k - 1) * R(0.1), Y(0.75), '#ffe066', 14, 3, 2.4);
      }
      font(0.036, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`톡 ${S.taps}번 (가장 짧은 길 ${L.par}) · 한 번에 최대 냠 ${S.best}`, w / 2, Y(0.82));
    } else {
      font(0.04, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.hearts > 0 ? '♥ -1 · 이 정원을 처음부터 다시' : '하트를 다 썼어요 — 끝', w / 2, Y(0.75));
    }
    ctx.globalAlpha = 1;
  }
  // ═════════ 아래 띠: 톡 · 별 목표 · 안내 ═════════
  {
    const y2 = Y(1.285);
    const left = L.limit - S.taps;
    font(0.05, 900);
    ctx.textAlign = 'left';
    ctx.fillStyle = left <= 3 ? '#ffb0a0' : '#f4ffe0';
    ctx.fillText(`톡 ${S.taps}`, R(0.03), y2);
    const tw = ctx.measureText(`톡 ${S.taps}`).width;
    font(0.032, 800);
    ctx.fillStyle = 'rgba(244,255,224,.75)';
    ctx.fillText(`/${L.limit}`, R(0.035) + tw, y2 + R(0.006));
    const chips = [
      { txt: '집으로', st: s.phase === 'result' && s.ok ? true : null },
      { txt: `${L.p2}톡 안에`, st: S.taps > L.p2 ? false : s.phase === 'result' && s.ok ? true : null },
      { txt: `${L.p3}톡 안에`, st: S.taps > L.p3 ? false : s.phase === 'result' && s.ok ? true : null },
    ];
    const gx0 = R(0.25), gw = (w - gx0 - R(0.015)) / 3;
    chips.forEach(({ txt, st }, k) => {
      const gx = gx0 + k * gw;
      ctx.fillStyle = st === true ? 'rgba(255,209,102,.32)' : st === false ? 'rgba(0,0,0,.35)' : 'rgba(240,255,220,.14)';
      ctx.beginPath();
      ctx.roundRect(gx + 2, y2 - R(0.026), gw - 4, R(0.052), R(0.026));
      ctx.fill();
      ctx.textAlign = 'center';
      font(0.034, 800);
      ctx.fillStyle = st === false ? 'rgba(255,255,255,.45)' : '#fbffef';
      ctx.fillText(`${st === true ? '★' : st === false ? '✗' : '☆'} ${txt}`, gx + gw / 2, y2 + 1);
    });
    const y3 = Y(1.375);
    let tp = '👆 달팽이 옆 칸을 톡! 누르고 있으면 갈 길이 보여요';
    if (s.stage === 0 && s.taps === 0) tp = '👆 반짝이는 점액 쪽을 톡 — 슈우욱!';
    else if (s.down && s.press >= 0) tp = '떼면 출발! · 달팽이 위에서 떼면 취소';
    else if (s.phase === 'result') tp = s.ok ? '다음 정원으로!' : '같은 정원을 다시 — 이번엔 미리 보고 톡';
    else if (allEaten(L, S)) tp = '🐚 다 먹었다! 집으로 가요';
    else if (L.limit - S.taps <= 3) tp = '⚠ 톡이 얼마 안 남았어요!';
    else if (s.stage > 0) tp = d.tip;
    else if (s.taps > 0) tp = d.tip;
    ctx.textAlign = 'center';
    font(0.035, 800);
    let fs = 0.035;
    while (ctx.measureText(tp).width > w - R(0.04) && fs > 0.03) font((fs -= 0.001), 800);
    ctx.fillStyle = 'rgba(244,255,224,.92)';
    ctx.fillText(tp, w / 2, y3);
  }
  // 첫 판 첫 톡: 손가락
  if (s.stage === 0 && s.taps === 0 && s.phase === 'play' && t - s.startT > 30 && !s.down && L.plan.length) {
    const d0 = L.plan[0], bob = Math.sin(t * 0.15) * R(0.012);
    const x = X(cX(S.pos) + DX[d0] * CW), y = Y(cY(S.pos) + DY[d0] * CH);
    ctx.font = `${Math.max(18, R(0.075))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('👆', x + R(0.01), y + R(0.05) + bob);
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, R(0.05) + Math.sin(t * 0.15) * 2, 0, TAU);
    ctx.stroke();
  }
  ctx.textBaseline = 'alphabetic';
}
