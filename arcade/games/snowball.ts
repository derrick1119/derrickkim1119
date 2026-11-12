/**
 * 눈덩이 굴리기 (24라운드: 새 장르) — 덩치 키우기 × 가리키기 × 상자 밀기 퍼즐.
 * 기준 9(손이 하는 일은 하나): 눈밭의 칸을 톡 = 눈덩이가 그 칸까지 한 줄로 데굴데굴. 누르고 있으면 굴러갈 길(점선)·도착 크기·
 *   말아 들일 것 ✓ / 튕길 것 ✗ 가 미리 보이고, 손을 떼는 순간 굴러간다(눈밭 밖에서 떼면 취소). 키보드는 화살표 커서 + 스페이스.
 * 규칙(결정적, 정수): 눈 칸에 들어가면 크기 +1, 그 칸은 풀이 드러난 맨땅이 된다. 맨땅은 −1(1보다 작아지진 않음).
 *   크기보다 작은 물건은 말아 들이고(+1, 목도리·당근은 0), 크거나 같은 물건에는 '퉁!' 튕겨 멈추고 반쪽이 깨진다(크기 절반, 올림).
 *   눈사람 받침에 몸통 크기 이상으로 들어가면 몸통 완성, 머리는 딱 그 크기여야 올라간다. 완성되면 꼭대기에서 새 눈덩이(크기 1).
 * 와우: 톡 한 번에 눈덩이가 눈밭을 데굴데굴 굴러 두 배로 커지고 지나간 자리엔 풀이 드러난다. 커진 눈덩이는 울타리도, 강아지도 말아 버린다.
 * 판(언덕) 8개: 목표 = 받침마다 눈사람 완성. 별 = ★ 완성 · ★ 굴리기 N번 이하 · ★ 보너스(목도리·당근·썰매 아이 모두 말아 오기).
 *   실패 = 굴리기를 다 쓰도록 못 만듦 → 하트 −1, 같은 판 다시. 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1판 눈밭(굴리면 커짐·말아 들이기) → 2판 맨땅(돌아가기 — 지나간 길도 맨땅) → 3판 얼음(멈추지 못하고 미끄러져
 *   지나감 — 크기를 지키며 멀리) → 4판 나무(숫자보다 커져야 뚫음 — 먼저 키우기) → 5판 비탈(올라서면 저절로 굴러 내려감)
 *   → 6판 머리(딱 맞는 크기 — 너무 크면 맨땅으로 깎기) → 7판 눈 오는 날(굴리기 2번마다 맨땅에 눈이 다시 쌓임) → 8판 썰매 아이들(굴릴 때마다 움직임 — 길목 잡기).
 * 웃음: 말린 강아지·아이가 눈덩이에서 머리만 내밀고 빙글빙글 돈다(완성되면 폴짝 튀어나와 '멍멍!'). 튕기면 '퉁!' 반쪽이 깨져 날아가고
 *   눈덩이 얼굴이 어질어질. 완성된 눈사람은 윙크. 꼭대기의 꼬마는 굴릴 때마다 '영차!', 오두막 창가의 고양이가 구경한다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
const COLS = 7, ROWS = 8, NC = COLS * ROWS;
/** 땅: 맨땅 · 눈 · 얼음 · 돌판(받침·출발 자리 — 크기 그대로) */
const GRASS = 0, SNOW = 1, ICE = 2, PLAZA = 3;
/** 물건 */
const NONE = 0, FENCE = 1, PUPPY = 2, MINI = 3, TREE = 4, SCARF = 5, CARROT = 6, SLED = 7;
const OSIZE = [0, 2, 3, 4, 0, 0, 0, 2];
const OPTS = [0, 10, 30, 30, 50, 0, 0, 40];
const isItem = (o: number) => o === SCARF || o === CARROT || o === SLED;
/** 방향: 0 뒤(위) · 1 오른쪽 · 2 앞(아래) · 3 왼쪽 */
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
/** 한 칸 굴러가는 틱 (얼음·비탈은 더 빠르게) */
const STEP_T = 7, SLIDE_T = 4;
const RESULT_OK = 200, RESULT_FAIL = 160, NEWS_T = 170, CARD_T = 150;
const STAR_PTS = 100, LEFT_PTS = 10, WIN_PTS = 300;

interface StageDef {
  key: string;
  news: string;
  hint: string;
  /** 8줄 × 7칸. '.' 눈 ',' 맨땅 '~' 얼음 '^>v<' 비탈(눈) 'S' 출발 'B' 받침 'f' 울타리 'p' 강아지 'k' 꼬마 눈사람 'T' 나무 'm' 목도리 'c' 당근 (얼음 위면 'M' 'C') 'r'/'l' 썰매 아이(→/←) */
  map: string[];
  /** 받침마다 [몸통 최소 크기, 머리 크기(0 = 머리 없음)] (지도에서 B가 나오는 차례) */
  bases: number[][];
  trees?: number[];
  rolls: number;
  par: number;
  /** 굴리기 N번마다 맨땅에 눈이 다시 쌓인다 */
  snow?: number;
}

/** 판(언덕) 8개. 판마다 시드로 좌우를 뒤집는다 */
export const STAGES: StageDef[] = [
  {
    key: '', news: '', hint: '목도리를 말아 오면 ★ — 눈사람이 두르고 나와요',
    map: [
      '...S...',
      '.......',
      '.f..m..',
      '.......',
      '.......',
      'BBBBBBB',
      '.p...f.',
      '.......',
    ],
    bases: [[4, 0]],
    rolls: 10, par: 2,
  },
  {
    key: 'grass', news: '🟫 맨땅은 −1 — 지나간 자리도 맨땅이 돼요', hint: '맨땅을 피해 눈 칸으로 돌아가요',
    map: [
      ',..S..,',
      '..,.,..',
      'c......',
      '.,,.,,.',
      '......m',
      'BBBBBBB',
      '.......',
      ',,...,,',
    ],
    bases: [[5, 0]],
    rolls: 10, par: 4,
  },
  {
    key: 'ice', news: '🧊 얼음 위에선 멈추지 못하고 미끄러져 지나가요', hint: '얼음은 크기 그대로 — 건너편까지 쭈욱',
    map: [
      '...S...',
      '.......',
      '.......',
      ',~~~~~,',
      ',~~M~~,',
      ',C~~~~,',
      '.B...B.',
      '.......',
    ],
    bases: [[5, 0], [5, 0]],
    rolls: 9, par: 4,
  },
  {
    key: 'tree', news: '🌲 나무보다 커지면 나무째로 말아 버려요!', hint: '나무 숫자보다 커져야 뚫고 지나가요',
    map: [
      'S......',
      '.......',
      '..,.,..',
      '.......',
      'TTTTTTT',
      '...m.c.',
      '.,BBB,.',
      '.......',
    ],
    bases: [[9, 0]],
    trees: [9, 7, 9, 5, 9, 7, 9],
    rolls: 8, par: 4,
  },
  {
    key: 'slope', news: '⛷️ 비탈에 올라서면 저절로 굴러 내려가요', hint: '비탈 꼭대기로 가면 저절로 데굴데굴',
    map: [
      '..S....',
      'm......',
      'vvvv,,,',
      'vvvv,f,',
      'vvvv,,,',
      '>>>>>>v',
      ',,,BB.c',
      ',,.,...',
    ],
    bases: [[10, 0]],
    rolls: 7, par: 3,
  },
  {
    key: 'head', news: '⛄ 머리는 딱 그 크기! 너무 크면 맨땅에서 깎아요', hint: '머리는 딱 맞게 — 크면 맨땅을 지나 깎아요',
    map: [
      '...S...',
      'c.....m',
      '.......',
      ',,,.,,,',
      '.......',
      '.,,,,,.',
      '...B...',
      '.......',
    ],
    bases: [[5, 3]],
    rolls: 9, par: 6,
  },
  {
    key: 'snowfall', news: '🌨️ 굴리기 2번마다 맨땅에 눈이 다시 쌓여요', hint: '눈이 오면 지나간 길이 다시 하얘져요',
    map: [
      ',,,S,,,',
      ',.,.,.,',
      ',,,,,,,',
      'm,,.,,c',
      ',,,,,,,',
      ',.,.,.,',
      ',B,,,B,',
      ',,,,,,,',
    ],
    bases: [[7, 0], [7, 0]],
    rolls: 11, par: 7,
    snow: 2,
  },
  {
    key: 'sled', news: '🛷 썰매 아이들이 굴릴 때마다 움직여요 — 태워 와요!', hint: '썰매 아이는 굴릴 때마다 한 칸씩 — 길목에서 기다려요',
    map: [
      '...S...',
      'r......',
      '.......',
      '......l',
      '.,...,.',
      '..r....',
      'B.....B',
      '.,...,.',
    ],
    bases: [[5, 3], [6, 0]],
    rolls: 12, par: 9,
  },
];
export const STAGE_COUNT = STAGES.length;

/** 받침: 돌판 칸들(cs) 중 아무 데나 몸통이 들어가면 그 칸(c)에 눈사람이 선다 */
interface Base { cs: number[]; c: number; body: number; head: number; st: number; bs: number; hs: number; wear: number[]; t: number }
/** 시뮬레이션 상태 (봇·미리 보기는 이것만 복제해 돌린다) */
interface Sim {
  g: Int8Array;
  /** 비탈 방향 (-1 없음) */
  sl: Int8Array;
  o: Int8Array;
  /** 나무 크기 */
  os: Int8Array;
  /** 썰매 방향 (1 →, 3 ←) */
  sd: Int8Array;
  ball: number;
  size: number;
  carry: number[];
  bases: Base[];
  spawn: number;
  left: number;
  used: number;
  got: number;
  gotAll: number;
  pts: number;
  snow: number;
  rolls: number;
}
interface Roll { dir: number; dest: number; forced: boolean; done: boolean; n: number }
interface Ev { t: number; kind: string; c: number; text?: string; a?: number; b?: number }

export interface SnowState extends Sim {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result'; pt: number;
  flip: boolean[];
  hearts: number; stars: number; starOk: boolean[]; gotStars: number; score: number;
  ok: boolean; why: string;
  roll: Roll | null; rk: number; rT: number; rdir: number; from: number; prevSize: number; lastRollEnd: number; spin: number; bump: number; bumpDir: number;
  down: boolean; aim: { x: number; y: number } | null;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null;
  events: Ev[]; dead: boolean; won: boolean; firstRoll: boolean; again: boolean; tries: number;
  sledFrom: Int16Array; sledT: number; snowT: number; spawnT: number; dizzy: number;
}

const ev = (s: SnowState, kind: string, c: number, text?: string, a?: number, b?: number) => s.events.push({ t: s.t, kind, c, text, a, b });
function see(s: SnowState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}

// ───────────────────────────── 시뮬레이션 ─────────────────────────────
const cx = (c: number) => c % COLS, cy = (c: number) => (c / COLS) | 0;
const baseAt = (S: Sim, c: number) => {
  for (const b of S.bases) if (b.st ? b.c === c : b.cs.includes(c)) return b;
  return null;
};
const needOf = (b: Base) => (b.st === 0 ? b.body : b.head);

/** 한 칸 굴린다. E가 있으면(진짜 판) 연출 사건을 남긴다 — 미리 보기·봇은 E 없이 같은 규칙으로 돈다.
 *  돌려주는 값: 0 굴러 들어감 · 1 말아 들이며 들어감 · 2 퉁(튕김) · 3 받침 완성 · 4 받침 앞에 멈춤 · 5 가장자리 */
function adv(S: Sim, R: Roll, E: SnowState | null): number {
  const c = S.ball, nx = cx(c) + DX[R.dir], ny = cy(c) + DY[R.dir];
  if (++R.n > 60 || nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
    R.done = true;
    if (E && R.n > 1) ev(E, 'edge', c, '콩!', R.dir);
    return 5;
  }
  const n = ny * COLS + nx;
  const b = baseAt(S, n);
  if (b) {
    if ((b.st === 0 && S.size >= b.body) || (b.st === 1 && S.size === b.head)) return complete(S, R, E, b, n), 3;
    if (b.st >= 1) {
      R.done = true;
      if (E) ev(E, 'nohead', n, b.st === 1 ? (S.size > b.head ? `머리는 딱 ${b.head}! 너무 커요` : `머리는 딱 ${b.head}! 작아요`) : '다 만들었어요', R.dir);
      return 4;
    }
  }
  const o = S.o[n];
  let code = 0;
  if (o) {
    const osz = o === TREE ? S.os[n] : OSIZE[o];
    if (osz < S.size) {
      S.o[n] = NONE;
      if (isItem(o)) S.got++;
      if (o !== SCARF && o !== CARROT) S.size++;
      S.carry.push(o === TREE ? 100 + osz : o);
      S.pts += OPTS[o];
      code = 1;
      if (E) {
        ev(E, 'absorb', n, o === TREE ? '우지끈! 🌲' : o === PUPPY ? '멍?!' : o === SLED ? '와아~!' : o === SCARF ? '목도리!' : o === CARROT ? '당근!' : o === MINI ? '꼬마 눈사람도!' : '와지끈!', o);
        if (isItem(o)) see(E, 'item', '🧣 목도리·당근은 언제나 말려 와요 — 눈사람이 두르고 나와요');
        else see(E, 'absorb', '🐶 크기보다 작은 건 말아 들여요 (+1)');
      }
    } else {
      S.size = (S.size + 1) >> 1;
      R.done = true;
      if (E) {
        ev(E, 'bounce', n, o === PUPPY ? '퉁! 멍멍!' : o === TREE ? '퉁! 아야…' : '퉁!', R.dir, osz);
        see(E, 'bounce', '💥 크거나 같은 건 퉁! 튕기고 반쪽이 깨져요');
      }
      return 2;
    }
  }
  S.ball = n;
  const gr = S.g[n];
  if (gr === SNOW) {
    S.size++;
    S.g[n] = GRASS;
    if (E) ev(E, 'grow', n, '+1');
  } else if (gr === GRASS && S.size > 1) {
    S.size--;
    if (E) ev(E, 'shrink', n, '−1'), see(E, 'shrink', '🟫 맨땅을 지나면 −1 (지나간 자리도 맨땅)');
  }
  if (S.sl[n] >= 0) {
    R.dir = S.sl[n];
    R.forced = true;
    if (E) see(E, 'slopego', '⛷️ 비탈 위에선 멈추지 않고 아래로 데굴데굴');
    return code;
  }
  if (gr === ICE) {
    if (n === R.dest) R.forced = true;
    if (E) see(E, 'iceslide', '🧊 얼음 위에선 크기 그대로, 멈추지 못해요');
    return code;
  }
  if (R.forced || n === R.dest) R.done = true;
  if (E && b && R.done && b.st === 0) ev(E, 'small', n, `몸통은 ${b.body} 이상!`);
  return code;
}

function complete(S: Sim, R: Roll, E: SnowState | null, b: Base, n: number) {
  const head = b.st === 1;
  if (head) (b.st = 2), (b.hs = S.size);
  else (b.st = b.head ? 1 : 2), (b.bs = S.size), (b.c = n);
  b.wear = [...b.wear, ...S.carry];
  S.pts += head ? 60 : 40;
  if (E) {
    b.t = E.t;
    ev(E, head ? 'head' : 'body', n, head ? '머리 완성! 😉' : b.st === 2 ? '눈사람 완성! 😉' : '몸통 완성!', S.size);
    if (head) see(E, 'headdone', '⛄ 머리까지 올리면 눈사람이 윙크해요');
  }
  S.ball = S.spawn;
  S.size = 1;
  S.carry = [];
  R.done = true;
}

/** 굴리기 한 번이 끝난 뒤: 썰매가 움직이고, 눈 오는 판이면 눈이 쌓인다 */
function afterRoll(S: Sim, E: SnowState | null) {
  S.rolls++;
  const moved: number[] = [];
  for (let c = 0; c < NC; c++) {
    if (S.o[c] !== SLED || moved.includes(c)) continue;
    let d = S.sd[c], to = -1;
    for (let k = 0; k < 2 && to < 0; k++) {
      const nx = cx(c) + DX[d], ny = cy(c) + DY[d], n = ny * COLS + nx;
      if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !S.o[n] && n !== S.ball && n !== S.spawn && !baseAt(S, n)) to = n;
      else d = (d + 2) % 4;
    }
    if (to < 0) continue;
    S.o[to] = SLED;
    S.sd[to] = d;
    S.o[c] = NONE;
    moved.push(to);
    if (E) E.sledFrom[to] = c;
  }
  if (E && moved.length) E.sledT = E.t;
  if (S.snow && S.rolls % S.snow === 0) {
    let k = 0;
    for (let c = 0; c < NC; c++) if (S.g[c] === GRASS && c !== S.ball) (S.g[c] = SNOW), k++;
    if (E && k) (E.snowT = E.t), ev(E, 'snowfall', S.ball, '펑펑! 눈이 쌓였어요 ❄️');
  }
}

const done = (S: Sim) => S.bases.every((b) => b.st === 2);

function cloneSim(S: Sim): Sim {
  return {
    g: S.g.slice(), sl: S.sl, o: S.o.slice(), os: S.os, sd: S.sd.slice(), ball: S.ball, size: S.size, carry: S.carry.slice(),
    bases: S.bases.map((b) => ({ ...b, wear: b.wear })), spawn: S.spawn, left: S.left, used: S.used, got: S.got, gotAll: S.gotAll, pts: S.pts, snow: S.snow, rolls: S.rolls,
  };
}

/** 톡한 칸 → 굴러갈 방향과 목표 칸 (눈덩이와 같은 줄로 맞춘다: 가로·세로 중 더 먼 쪽) */
function aimRoll(S: Sim, u: number, v: number): { dir: number; dest: number } | null {
  if (u < 0 || u >= COLS || v < 0 || v >= ROWS) return null;
  const bx = cx(S.ball), by = cy(S.ball), du = u - (bx + 0.5), dv = v - (by + 0.5);
  if (Math.abs(du) < 0.5 && Math.abs(dv) < 0.5) return null;
  if (Math.abs(du) >= Math.abs(dv)) {
    const tx = Math.floor(u);
    if (tx === bx) return null;
    return { dir: tx > bx ? 1 : 3, dest: by * COLS + tx };
  }
  const ty = Math.floor(v);
  if (ty === by) return null;
  return { dir: ty > by ? 2 : 0, dest: ty * COLS + bx };
}

/** 굴리기 하나를 끝까지 (미리 보기·봇) — trace면 칸마다 [칸, 크기, 사건 코드]를 돌려준다 */
function simRoll(S: Sim, dir: number, dest: number, trace = false) {
  const R: Roll = { dir, dest, forced: false, done: false, n: 0 };
  const path: { c: number; size: number; kind: number }[] = [];
  S.left--;
  S.used++;
  while (!R.done) {
    const n = S.ball + DX[R.dir] + DY[R.dir] * COLS, before = S.size;
    const k = adv(S, R, null);
    if (trace && k !== 5) path.push({ c: n, size: k === 3 ? before : S.size, kind: k });
  }
  afterRoll(S, null);
  return path;
}

function layout(s: SnowState) {
  const d = STAGES[s.stage], fl = s.flip[s.stage];
  s.g = new Int8Array(NC);
  s.sl = new Int8Array(NC).fill(-1);
  s.o = new Int8Array(NC);
  s.os = new Int8Array(NC);
  s.sd = new Int8Array(NC);
  s.bases = [];
  s.gotAll = 0;
  let bi = 0, ti = 0;
  const trees = d.trees ?? [];
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      let ch = d.map[y][x];
      const tx = fl ? COLS - 1 - x : x, c = y * COLS + tx;
      if (fl) ch = ch === '>' ? '<' : ch === '<' ? '>' : ch === 'r' ? 'l' : ch === 'l' ? 'r' : ch;
      s.g[c] = ch === ',' ? GRASS : ch === '~' || ch === 'M' || ch === 'C' ? ICE : ch === 'S' || ch === 'B' ? PLAZA : SNOW;
      if ('^>v<'.includes(ch)) s.sl[c] = '^>v<'.indexOf(ch);
      if (ch === 'S') s.spawn = c;
      if (ch === 'B') {
        // 가로로 붙은 B들은 받침 하나 (넓은 돌판)
        if (x > 0 && d.map[y][x - 1] === 'B') s.bases[s.bases.length - 1].cs.push(c);
        else {
          const [body, head] = d.bases[bi++];
          s.bases.push({ cs: [c], c, body, head, st: 0, bs: 0, hs: 0, wear: [], t: -999 });
        }
      }
      const o = 'xfpkTmc'.indexOf(ch.replace('M', 'm').replace('C', 'c'));
      if (o > 0) s.o[c] = o;
      if (ch === 'T') s.os[c] = trees[fl ? trees.length - 1 - ti++ : ti++] ?? 6;
      if (ch === 'r' || ch === 'l') (s.o[c] = SLED), (s.sd[c] = ch === 'r' ? 1 : 3);
      if (isItem(s.o[c])) s.gotAll++;
    }
  // 나무 크기는 지도에서 왼쪽→오른쪽 차례 (뒤집으면 거꾸로 읽어 같은 나무가 같은 크기)
  if (fl && trees.length) {
    ti = 0;
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        const c = y * COLS + x;
        if (s.o[c] === TREE) s.os[c] = trees[trees.length - 1 - ti++] ?? 6;
      }
  }
  s.ball = s.spawn;
  s.size = 1;
  s.carry = [];
  s.left = d.rolls;
  s.used = 0;
  s.got = 0;
  s.pts = 0;
  s.snow = d.snow ?? 0;
  s.rolls = 0;
}

function newStage(s: SnowState) {
  layout(s);
  s.phase = 'play';
  s.pt = 0;
  s.roll = null;
  s.from = s.ball;
  s.prevSize = 1;
  s.lastRollEnd = s.t;
  s.starOk = [false, false, false];
  s.sledFrom = new Int16Array(NC).fill(-1);
  s.spawnT = s.t;
  const d = STAGES[s.stage];
  if (d.key) s.seen.add(d.key);
}

function release(s: SnowState, sx: number, sy: number) {
  if (s.phase !== 'play' || s.roll || done(s)) return;
  const q = toCell(sx, sy);
  if (!q) return;
  const a = aimRoll(s, q.u, q.v);
  if (!a) return;
  if (s.left <= 0) return void ev(s, 'nope', s.ball, '굴리기를 다 썼어요');
  s.left--;
  s.used++;
  s.roll = { dir: a.dir, dest: a.dest, forced: false, done: false, n: 0 };
  s.rk = STEP_T - 1;
  s.rT = STEP_T;
  s.rdir = a.dir;
  s.from = s.ball;
  s.prevSize = s.size;
  s.firstRoll = true;
  ev(s, 'push', s.ball, ['영차!', '데굴데굴~', '간다!'][s.used % 3]);
  see(s, 'roll', '⛄ 눈 칸을 지나면 +1 — 지나간 자리는 풀이 드러나요');
}

function endStage(s: SnowState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = [true, s.used <= d.par, s.got >= s.gotAll];
    s.gotStars = s.starOk.filter(Boolean).length;
    s.stars += s.gotStars;
    s.score += s.gotStars * STAR_PTS + s.left * LEFT_PTS + s.pts;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.score += WIN_PTS);
    ev(s, 'clear', s.bases[0].c, s.won ? '마을이 눈사람으로 가득! ⛄' : '언덕 완성!');
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', s.ball, why);
  }
}

export const snowball: GameDef<SnowState> = {
  id: 'snowball',
  name: '눈덩이 굴리기',
  genes: ['absorb', 'pointer', 'pushbox'],
  twist: '톡 한 곳까지 눈덩이가 한 줄로 굴러가며 눈 칸마다 +1, 맨땅 −1로 정확히 커진다 — 지나간 자리는 맨땅이 되고, 크기보다 작은 울타리·강아지·나무까지 말아 버린다',
  rules: [
    '같은 줄의 칸을 톡 = 거기까지 데굴데굴! 눈 칸 +1, 맨땅 −1 (지나간 자리는 맨땅).',
    '크기보다 작은 건 말아 들이고(+1), 크거나 같으면 퉁! 반쪽이 깨져요.',
    '받침에 적힌 크기로 도착하면 눈사람 완성 (몸통은 그 이상, 머리는 딱).',
  ],
  controls: 'touch',
  hint: '눈밭을 톡 = 데굴데굴! (꾹 누르면 미리 보기) / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '겨울 마을 언덕 디오라마 — 눈덩이 굴리기',
    mood: '해 질 녘 보랏빛 하늘 아래 눈 덮인 언덕, 눈 결정이 반짝이고 오두막 창문의 주황 불빛이 눈밭에 번진다. 굴러간 자리엔 초록 풀이 드러나고, 강아지와 썰매 아이들이 뛰논다.',
    palette: { bg: '#1d2547', ink: '#fffaf0', muted: '#b8c4e8', accent: '#ffcf5a', hot: '#ff6b6b', soft: '#e8f1ff' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const flip = STAGES.map(() => rng() < 0.5);
    const s = {
      rng, seed, t: 0, stage: 0, phase: 'play', pt: 0, flip,
      g: new Int8Array(NC), sl: new Int8Array(NC), o: new Int8Array(NC), os: new Int8Array(NC), sd: new Int8Array(NC),
      ball: 0, size: 1, carry: [], bases: [], spawn: 0, left: 0, used: 0, got: 0, gotAll: 0, pts: 0, snow: 0, rolls: 0,
      hearts: 3, stars: 0, starOk: [false, false, false], gotStars: 0, score: 0, ok: false, why: '',
      roll: null, rk: STEP_T, rT: STEP_T, rdir: 2, from: 0, prevSize: 1, lastRollEnd: 0, spin: 0, bump: 0, bumpDir: 0,
      down: false, aim: null, seen: new Set<string>(), newsQ: [], news: null, events: [], dead: false, won: false, firstRoll: false, again: false, tries: 0,
      sledFrom: new Int16Array(NC).fill(-1), sledT: -999, snowT: -999, spawnT: 0, dizzy: 0,
    } as SnowState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.pt++;
    const p = inp.pointer ?? null;
    if (p) (s.down = true), (s.aim = { x: p.x, y: p.y * A });
    else if (s.down) {
      s.down = false;
      if (s.aim) release(s, s.aim.x, s.aim.y);
      s.aim = null;
    }
    s.events = s.events.filter((e) => s.t - e.t < 120);
    if (s.bump > 0) s.bump--;
    if (s.dizzy > 0) s.dizzy--;
    // 굴러가는 중: STEP_T틱마다 한 칸 (멈춘 뒤에도 마지막 칸까지 그림이 따라오게 rk를 채운다)
    if (!s.roll && s.rk < s.rT) s.rk++;
    else if (s.roll && ++s.rk >= s.rT) {
      s.rk = 0;
      s.from = s.ball;
      s.prevSize = s.size;
      const R = s.roll, bst = s.bases.map((b) => b.st).join();
      adv(s, R, s);
      const moved = s.ball !== s.from && s.bases.map((b) => b.st).join() === bst;
      if (moved) (s.spin += 1), (s.rdir = R.dir);
      else if (s.bases.map((b) => b.st).join() !== bst) (s.spawnT = s.t), (s.from = s.ball);
      else (s.bump = 14), (s.bumpDir = R.dir), s.events.some((e) => e.t === s.t && e.kind === 'bounce') && (s.dizzy = 90);
      s.rT = s.g[s.ball] === ICE || s.sl[s.ball] >= 0 ? SLIDE_T : STEP_T;
      if (R.done) {
        s.roll = null;
        s.lastRollEnd = s.t;
        if (s.bases.map((b) => b.st).join() === bst) ev(s, 'stop', s.ball, `크기 ${s.size}!`);
        afterRoll(s, s);
        if (s.sledT === s.t) see(s, 'sledmove', '🛷 썰매 아이는 굴릴 때마다 한 칸씩 움직여요');
      }
    }
    if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
    if (s.phase === 'result') {
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    if (s.roll) return;
    if (done(s)) return void (s.t - s.lastRollEnd > 40 && endStage(s, true, ''));
    if (s.left <= 0 && s.t - s.lastRollEnd > 30) endStage(s, false, '굴리기를 다 썼어요');
  },
  over: (s) => s.dead,
  score: (s) => s.score,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────── 화면 배치 (가로 0~1, 세로 0~A) — 비스듬히 내려다본 언덕: 뒤(꼭대기)가 좁고 앞이 넓다 ─────────
const FY0 = 0.4, FY1 = 1.2, SB = 0.74, SF = 0.97;
const scl = (v: number) => SB + (SF - SB) * (v / ROWS);
const PX = (u: number, v: number) => 0.5 + (u / COLS - 0.5) * scl(v);
const PY = (v: number) => FY0 + (FY1 - FY0) * (v / ROWS);
function toCell(sx: number, sy: number) {
  const v = ((sy - FY0) / (FY1 - FY0)) * ROWS;
  const u = ((sx - 0.5) / scl(v) + 0.5) * COLS;
  if (u < -0.2 || u > COLS + 0.2 || v < -0.3 || v > ROWS + 0.2) return null;
  return { u: Math.max(0, Math.min(COLS - 0.001, u)), v: Math.max(0, Math.min(ROWS - 0.001, v)) };
}

// ───────────────────────────── 봇 ─────────────────────────────
/** 봇이 보는 판의 값: 완성한 받침·보너스·다음 받침까지 — 받침과 같은 줄이면 그 받침까지 굴려 보고 도착 크기를 본다 */
function value(S: Sim) {
  let v = S.got * 1500 + S.pts * 2 - S.used * 300;
  let best = -1e9;
  for (const b of S.bases) {
    if (b.st === 2) {
      v += 9000;
      continue;
    }
    if (b.st === 1) v += 4500;
    const need = needOf(b), x = cx(S.ball), y = cy(S.ball);
    let q = -1e9;
    for (const c of b.st ? [b.c] : b.cs) {
      const bx = cx(c), by = cy(c), dist = Math.abs(bx - x) + Math.abs(by - y);
      if (bx === x || by === y) {
        // 한 번 굴려 보면 끝나는가
        const T = cloneSim(S);
        T.left = 1;
        simRoll(T, bx > x ? 1 : bx < x ? 3 : by > y ? 2 : 0, c);
        if (T.bases.some((q2, i) => q2.st !== S.bases[i].st)) q = Math.max(q, 2500);
        else q = Math.max(q, b.st === 0 ? (S.size >= need ? 600 - dist * 40 : -350 * (need - S.size) - dist * 30) : -500 * Math.abs(S.size - need) - dist * 30);
      } else q = Math.max(q, b.st === 0 ? (S.size >= need ? 500 - dist * 60 : -350 * (need - S.size) - dist * 30) : -500 * Math.abs(S.size - need) - dist * 40);
    }
    best = Math.max(best, q);
  }
  if (best > -1e9) v += best;
  // 남은 눈이 많을수록 앞으로 키우기 쉽다
  let snow = 0;
  for (let c = 0; c < NC; c++) if (S.g[c] === SNOW) snow++;
  return v + snow * 8;
}
const simKey = (S: Sim) => `${S.ball}:${S.size}:${S.g.join('')}:${S.o.join('')}:${S.bases.map((b) => b.st).join('')}`;

function movesOf(S: Sim) {
  const out: { dir: number; dest: number }[] = [];
  const x = cx(S.ball), y = cy(S.ball);
  for (let d = 0; d < 4; d++)
    for (let k = 1; ; k++) {
      const nx = x + DX[d] * k, ny = y + DY[d] * k;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) break;
      out.push({ dir: d, dest: ny * COLS + nx });
    }
  return out;
}

/** 판 하나를 빔 탐색으로 푼다: 굴리기 순서(목표 칸들). 별(완성·굴리기 아낌·보너스)이 가장 많은 길을 찾는다 */
export function solve(S0: Sim, beam: number, par: number): number[] {
  type Node = { S: Sim; path: number[]; v: number };
  let layer: Node[] = [{ S: S0, path: [], v: 0 }];
  let best = null as { path: number[]; key: number; stars: number; depth: number } | null;
  const seen = new Set<string>();
  let top: Node | null = null;
  for (let depth = 0; depth < S0.left && layer.length; depth++) {
    if (best && (best.stars >= 3 || (depth >= par && (best.stars >= 2 || depth >= best.depth + 2)))) break;
    const next: Node[] = [];
    for (const nd of layer) {
      for (const m of movesOf(nd.S)) {
        const S = cloneSim(nd.S);
        simRoll(S, m.dir, m.dest);
        const path = [...nd.path, m.dest];
        if (done(S)) {
          const stars = 1 + (S.used <= par ? 1 : 0) + (S.got >= S.gotAll ? 1 : 0);
          const key = stars * 100000 + S.left * 1000 + S.pts;
          if (!best || key > best.key) best = { path, key, stars, depth: depth + 1 };
          continue;
        }
        if (S.left <= 0) continue;
        const k = simKey(S);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push({ S, path, v: value(S) });
      }
    }
    next.sort((a, b) => b.v - a.v);
    layer = next.slice(0, beam);
    if (layer.length && (!top || layer[0].v > top.v)) top = layer[0];
  }
  if (best) return best.path;
  // 못 끝내면 가장 나아 보이는 길이라도 (굴리기를 남기고 멈추지 않게)
  return top ? top.path : movesOf(S0).slice(0, 1).map((m) => m.dest);
}

const NO: Input = { tap: false, dir: 0, pointer: null };
/** 잘하는 봇: 굴리기 사이에 생각하는 틱 · 빔 너비 */
const THINK = 30, BEAM = 120;
/** 칸 가운데를 가리키는 포인터 입력 */
const atCell = (c: number): Input => {
  const u = cx(c) + 0.5, v = cy(c) + 0.5;
  return { tap: false, dir: 0, pointer: { x: PX(u, v), y: PY(v) / A } };
};
const brain = new WeakMap<object, { key: string; plan: number[]; base: number; hold: number }>();

/** 봇: 판이 시작되면 빔 탐색으로 별이 가장 많은 굴리기 순서를 찾고, 하나씩 (사람처럼 잠깐 생각하고 꾹 눌러 본 뒤) 굴린다 */
export const snowballSmart: Bot<SnowState> = {
  name: '눈사람 장인',
  act(s) {
    if (s.phase !== 'play' || s.roll || s.left <= 0 || done(s)) return NO;
    if (s.t - s.lastRollEnd < THINK || s.pt < 40) return NO;
    const key = `${s.stage}:${s.tries}`;
    let m = brain.get(s);
    if (!m || m.key !== key) brain.set(s, (m = { key, plan: solve(cloneSim(s), BEAM, STAGES[s.stage].par), base: s.used, hold: 0 }));
    // 계획이 어긋났으면 지금 자리에서 다시 푼다
    if (s.used - m.base >= m.plan.length && m.hold === 0) (m.plan = solve(cloneSim(s), BEAM, STAGES[s.stage].par)), (m.base = s.used);
    const dest = m.plan[s.used - m.base];
    if (dest === undefined) return NO;
    if (m.hold < 9) {
      m.hold += 3;
      return atCell(dest);
    }
    m.hold = 0;
    return NO;
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number }>();
/** 봇: 아무 때나 눈밭 아무 데나 톡 (가끔 화면 아무 데나) */
export const snowballRandom: Bot<SnowState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 30 + Math.floor(rng() * 60), hold: 0, x: 0, y: 0 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y / A } } : NO;
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 40 + Math.floor(rng() * 100);
    if (rng() < 0.1) (m.x = rng()), (m.y = rng() * A);
    else {
      const u = rng() * COLS, v = rng() * ROWS;
      (m.x = PX(u, v)), (m.y = PY(v));
    }
    m.hold = 2 + Math.floor(rng() * 5);
    return { tap: false, dir: 0, pointer: { x: m.x, y: m.y / A } };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
type Trace = { c: number; size: number; kind: number }[];
const PREV = new WeakMap<object, { key: string; path: Trace; start: number }>();
const CHUNKS = new WeakMap<object, { t: number; x: number; y: number; vx: number; r: number }[]>();
/** 크기 → 눈덩이 반지름 (칸 너비 비율) */
const ballK = (size: number) => Math.min(1.0, 0.27 + 0.062 * size);

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
/** 동그란 숫자 딱지 */
function badge(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, text: string, fill: string, ink = '#ffffff') {
  ctx.fillStyle = 'rgba(20,24,60,.35)';
  ctx.beginPath();
  ctx.arc(x + 1, y + 1.5, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.font = `900 ${Math.max(12, r * 1.25)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5);
}
function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, col: string, rot = 0) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  ctx.fill();
}
/** 눈 공 (그림자 + 둥근 빛) */
function sphere(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const g = ctx.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.08, x, y, r * 1.05);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, '#f1f5ff');
  g.addColorStop(0.82, '#c3cff0');
  g.addColorStop(1, '#93a5d4');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(70,88,150,.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** 강아지 머리 (말려 들어가 눈덩이에서 머리만 내밀 때도 쓴다) */
function puppyHead(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, face: number, t: number, scared = false) {
  ell(ctx, x - r * 0.75, y + r * 0.1, r * 0.35, r * 0.62, '#7a4a2a', 0.35);
  ell(ctx, x + r * 0.75, y + r * 0.1, r * 0.35, r * 0.62, '#7a4a2a', -0.35);
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, '#f2c58f');
  g.addColorStop(1, '#c4844a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ell(ctx, x + face * r * 0.1, y + r * 0.35, r * 0.45, r * 0.32, '#fbe6c8');
  ell(ctx, x + face * r * 0.1, y + r * 0.2, r * 0.16, r * 0.11, '#2a1a12');
  for (const sd of [-1, 1]) {
    const ex = x + sd * r * 0.36 + face * r * 0.08, ey = y - r * 0.12;
    if (scared) {
      ell(ctx, ex, ey, r * 0.2, r * 0.22, '#ffffff');
      ell(ctx, ex, ey, r * 0.08, r * 0.08, '#1a1a1a');
    } else {
      ell(ctx, ex, ey, r * 0.11, r * 0.14, '#1a1a1a');
      ell(ctx, ex + r * 0.04, ey - r * 0.05, r * 0.04, r * 0.04, '#ffffff');
    }
  }
  if (scared) ell(ctx, x + face * r * 0.1, y + r * 0.52, r * 0.13, r * 0.1 + Math.abs(Math.sin(t * 0.3)) * r * 0.05, '#c2405a');
  else {
    ctx.strokeStyle = '#2a1a12';
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath();
    ctx.arc(x + face * r * 0.1, y + r * 0.34, r * 0.16, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
}
/** 꼬마 머리 (털모자) */
function kidHead(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hat: string, mood: number, t: number) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffe2cc');
  g.addColorStop(1, '#efb08e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ell(ctx, x - r * 0.45, y + r * 0.3, r * 0.2, r * 0.13, 'rgba(255,110,110,.55)');
  ell(ctx, x + r * 0.45, y + r * 0.3, r * 0.2, r * 0.13, 'rgba(255,110,110,.55)');
  ctx.fillStyle = hat;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.15, r * 1.02, Math.PI * 1.05, Math.PI * 1.95);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - r * 1.0, y - r * 0.32, r * 2.0, r * 0.26);
  ell(ctx, x + Math.sin(t * 0.1) * r * 0.15, y - r * 1.25, r * 0.28, r * 0.28, '#ffffff');
  ctx.fillStyle = '#2a1a22';
  ctx.strokeStyle = '#2a1a22';
  ctx.lineWidth = Math.max(1, r * 0.12);
  for (const sd of [-1, 1]) {
    if (mood === 1) {
      ctx.beginPath();
      ctx.arc(x + sd * r * 0.35, y + r * 0.08, r * 0.14, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else ell(ctx, x + sd * r * 0.35, y + r * 0.05, r * 0.1, r * (mood === 2 ? 0.17 : 0.13), '#2a1a22');
  }
  if (mood === 2) ell(ctx, x, y + r * 0.5, r * 0.14, r * 0.17, '#9a3040');
  else {
    ctx.beginPath();
    ctx.arc(x, y + r * 0.35, r * 0.25, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }
}

/** 말려 들어간 물건이 눈덩이 가장자리에서 삐죽 (빙글빙글 돈다) */
function stuck(ctx: CanvasRenderingContext2D, o: number, x: number, y: number, r: number, a: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a + Math.PI / 2);
  const u = r;
  if (o === PUPPY) puppyHead(ctx, 0, -u * 0.15, u * 0.42, 1, t, true);
  else if (o === SLED) kidHead(ctx, 0, -u * 0.15, u * 0.38, '#3d7bd9', 1, t);
  else if (o === FENCE) {
    ctx.fillStyle = '#a0683a';
    ctx.fillRect(-u * 0.09, -u * 0.6, u * 0.18, u * 0.75);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-u * 0.1, -u * 0.66, u * 0.2, u * 0.1);
  } else if (o === SCARF) {
    ctx.fillStyle = '#e8414f';
    ctx.fillRect(-u * 0.12, -u * 0.6, u * 0.24, u * 0.7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-u * 0.12, -u * 0.42, u * 0.24, u * 0.08);
    ctx.fillRect(-u * 0.12, -u * 0.22, u * 0.24, u * 0.08);
  } else if (o === CARROT) {
    ctx.fillStyle = '#ff8a24';
    ctx.beginPath();
    ctx.moveTo(-u * 0.12, 0);
    ctx.lineTo(0, -u * 0.62);
    ctx.lineTo(u * 0.12, 0);
    ctx.fill();
  } else if (o === MINI) {
    sphere(ctx, 0, -u * 0.2, u * 0.26);
    sphere(ctx, 0, -u * 0.52, u * 0.18);
  } else if (o >= 100) {
    ctx.fillStyle = '#2f6b4a';
    ctx.beginPath();
    ctx.moveTo(-u * 0.32, 0);
    ctx.lineTo(0, -u * 0.8);
    ctx.lineTo(u * 0.32, 0);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-u * 0.12, -u * 0.5);
    ctx.lineTo(0, -u * 0.8);
    ctx.lineTo(u * 0.12, -u * 0.5);
    ctx.fill();
  }
  ctx.restore();
}

/** 주인공 눈덩이. mood: 0 방긋 · 1 데굴(신남) · 2 어질어질 · 3 우쭐(커짐) · 4 걱정(미리 보기에 ✗) */
function drawBall(ctx: CanvasRenderingContext2D, x: number, gy: number, r: number, spin: number, horiz: boolean, carry: number[], mood: number, t: number, sq = 0) {
  ell(ctx, x + r * 0.15, gy + r * 0.04, r * 1.08, r * 0.36, 'rgba(36,40,100,.3)');
  const y = gy - r * 0.9;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 + sq * 0.12, 1 - sq * 0.12);
  sphere(ctx, 0, 0, r);
  // 굴러가는 눈 뭉치 무늬
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.97, 0, Math.PI * 2);
  ctx.clip();
  for (let k = 0; k < 9; k++) {
    const ph = spin + k * 0.7, off = (hsh(k + 3) - 0.5) * r * 1.5, z = Math.sin(ph);
    if (z < 0) continue;
    const along = Math.cos(ph) * r * 0.9;
    const lx = horiz ? along : off, ly = horiz ? off : along;
    ell(ctx, lx, ly, r * 0.13 * (0.5 + z * 0.5), r * 0.08 * (0.5 + z * 0.5), `rgba(150,170,215,${0.25 + z * 0.25})`, horiz ? 0 : Math.PI / 2);
  }
  ctx.restore();
  ctx.restore();
  // 말려 들어간 것들 (머리만 내밀고 빙글빙글)
  const show = carry.slice(-5);
  show.forEach((o, i) => {
    const a = (horiz ? spin : spin * 0.8) + i * 2.39 - Math.PI / 2;
    stuck(ctx, o, x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, Math.max(9, r * 0.55), a, t);
  });
  // 얼굴 (고정)
  const ex = r * 0.3, ey = y - r * 0.02, er = Math.max(1.6, r * 0.085);
  ctx.fillStyle = '#26284a';
  ctx.strokeStyle = '#26284a';
  ctx.lineWidth = Math.max(1.3, r * 0.06);
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const exx = x + sd * ex;
    if (mood === 2) {
      ctx.beginPath();
      for (let k = 0; k < 12; k++) {
        const aa = k * 0.75 + t * 0.35 * sd, rr = (k / 12) * er * 1.8;
        ctx.lineTo(exx + Math.cos(aa) * rr, ey + Math.sin(aa) * rr);
      }
      ctx.stroke();
    } else if (mood === 3) {
      ctx.beginPath();
      ctx.arc(exx, ey + er * 0.5, er * 1.1, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (mood === 1 || mood === 4) {
      ell(ctx, exx, ey, er * 1.5, er * 1.7, '#ffffff');
      ctx.stroke();
      ell(ctx, exx + (horiz ? 0 : 0), ey + er * 0.2, er * 0.75, er * 0.85, '#26284a');
    } else {
      ell(ctx, exx, ey, er, er * 1.25, '#26284a');
      ell(ctx, exx + er * 0.35, ey - er * 0.4, er * 0.35, er * 0.35, '#ffffff');
    }
  }
  ell(ctx, x - r * 0.5, y + r * 0.2, r * 0.13, r * 0.08, 'rgba(255,120,150,.45)');
  ell(ctx, x + r * 0.5, y + r * 0.2, r * 0.13, r * 0.08, 'rgba(255,120,150,.45)');
  if (mood === 1) ell(ctx, x, y + r * 0.3, r * 0.12, r * 0.14, '#7a2a3a');
  else if (mood === 2) {
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) ctx.lineTo(x - r * 0.2 + k * r * 0.067, y + r * 0.32 + (k % 2 ? -1 : 1) * r * 0.04);
    ctx.stroke();
  } else if (mood === 4) {
    ctx.beginPath();
    ctx.arc(x, y + r * 0.42, r * 0.14, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ell(ctx, x + r * 0.62, y - r * 0.35 + (t % 30) * 0.15, r * 0.07, r * 0.11, '#9fdcff');
  } else {
    ctx.beginPath();
    ctx.arc(x, y + r * 0.18, r * (mood === 3 ? 0.2 : 0.15), 0.25, Math.PI - 0.25);
    ctx.stroke();
  }
  if (mood === 2)
    for (let k = 0; k < 3; k++) {
      const a = t * 0.13 + (k * Math.PI * 2) / 3;
      ctx.fillStyle = '#fff27a';
      star(ctx, x + Math.cos(a) * r * 0.75, y - r * 1.05 + Math.sin(a) * r * 0.2, Math.max(3, r * 0.17));
      ctx.fill();
    }
}

/** 받침 위 눈사람. 머리를 기다리면 점선 머리 + 목표 숫자 */
function drawSnowman(ctx: CanvasRenderingContext2D, x: number, gy: number, u: number, b: Base, t: number) {
  const age = t - b.t, pop = age < 18 ? 0.4 + 0.6 * Math.sin((age / 18) * Math.PI * 0.5) * (1 + 0.25 * Math.sin((age / 18) * Math.PI)) : 1;
  const rb = u * Math.min(0.62, 0.26 + 0.04 * b.bs) * pop;
  ell(ctx, x + rb * 0.15, gy + rb * 0.04, rb * 1.15, rb * 0.38, 'rgba(36,40,100,.3)');
  const by = gy - rb * 0.9;
  sphere(ctx, x, by, rb);
  // 단추
  for (let k = 0; k < 2; k++) ell(ctx, x, by - rb * 0.25 + k * rb * 0.35, Math.max(1.5, rb * 0.08), Math.max(1.5, rb * 0.08), '#2a2c48');
  // 나뭇가지 팔 (흔들흔들)
  ctx.strokeStyle = '#6b4325';
  ctx.lineWidth = Math.max(1.5, u * 0.035);
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const wv = Math.sin(t * 0.08 + sd) * 0.25 + (b.st === 2 && age < 90 ? Math.sin(age * 0.4) * 0.4 : 0);
    const ax = x + sd * rb * 0.85, ay = by - rb * 0.3, tx = ax + sd * u * 0.32, ty = ay - u * (0.18 + wv * 0.3);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(tx, ty);
    ctx.moveTo(ax + sd * u * 0.2, ay - u * 0.1 - wv * u * 0.18);
    ctx.lineTo(ax + sd * u * 0.24, ay - u * 0.2 - wv * u * 0.18);
    ctx.stroke();
  }
  const rh = b.st === 2 ? (b.head ? u * Math.min(0.42, 0.18 + 0.035 * b.hs) : rb * 0.62) * (b.head ? pop : 1) : rb * 0.6;
  const hy = by - rb * 0.88 - rh * 0.82;
  if (b.st === 1) {
    // 머리 자리: 점선 고리 + "딱 3"
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, hy, Math.max(10, rh), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.max(12, rh * 0.95)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${b.head}`, x, hy + 1);
  } else {
    sphere(ctx, x, hy, rh);
    // 얼굴: 윙크
    const wink = age < 70 ? age > 20 && age < 60 : (t + b.c * 41) % 220 < 16;
    ctx.fillStyle = '#26284a';
    ctx.strokeStyle = '#26284a';
    ctx.lineWidth = Math.max(1.3, rh * 0.09);
    ell(ctx, x - rh * 0.33, hy - rh * 0.12, Math.max(1.4, rh * 0.1), Math.max(1.6, rh * 0.13), '#26284a');
    if (wink) {
      ctx.beginPath();
      ctx.arc(x + rh * 0.33, hy - rh * 0.05, rh * 0.14, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else ell(ctx, x + rh * 0.33, hy - rh * 0.12, Math.max(1.4, rh * 0.1), Math.max(1.6, rh * 0.13), '#26284a');
    for (let k = 0; k < 5; k++) ell(ctx, x - rh * 0.3 + k * rh * 0.15, hy + rh * 0.38 + Math.sin((k / 4) * Math.PI) * rh * 0.12, Math.max(1, rh * 0.05), Math.max(1, rh * 0.05), '#26284a');
    // 코: 당근을 말아 왔으면 당근 코
    if (b.wear.includes(CARROT)) {
      ctx.fillStyle = '#ff8a24';
      ctx.beginPath();
      ctx.moveTo(x + rh * 0.02, hy + rh * 0.04);
      ctx.lineTo(x + rh * 0.75, hy + rh * 0.16);
      ctx.lineTo(x + rh * 0.02, hy + rh * 0.24);
      ctx.fill();
    } else ell(ctx, x + rh * 0.06, hy + rh * 0.14, Math.max(1.5, rh * 0.09), Math.max(1.5, rh * 0.08), '#3a3550');
    if (wink && age < 70) {
      ctx.fillStyle = '#fff27a';
      star(ctx, x + rh * 0.9, hy - rh * 0.6, Math.max(4, rh * 0.25));
      ctx.fill();
    }
  }
  // 목도리
  if (b.wear.includes(SCARF)) {
    const ny = by - rb * 0.86;
    ctx.fillStyle = '#e8414f';
    ctx.beginPath();
    ctx.ellipse(x, ny, rb * 0.7, Math.max(2.5, rb * 0.16), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + rb * 0.3, ny);
    ctx.lineTo(x + rb * 0.55 + Math.sin(t * 0.1) * 2, ny + rb * 0.55);
    ctx.lineTo(x + rb * 0.3, ny + rb * 0.6);
    ctx.lineTo(x + rb * 0.15, ny);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - rb * 0.35, ny - 1, rb * 0.12, 2.5);
    ctx.fillRect(x + rb * 0.05, ny - 1, rb * 0.12, 2.5);
  }
  // 말렸던 강아지·썰매 아이가 튀어나와 옆에서 폴짝폴짝
  let side = 1;
  for (const o of b.wear) {
    if (o !== PUPPY && o !== SLED) continue;
    const hop = Math.abs(Math.sin(t * 0.12 + side)) * u * 0.12, px = x + side * (rb + u * 0.32), py = gy - hop;
    ell(ctx, px, gy + 1, u * 0.18, u * 0.06, 'rgba(36,40,100,.25)');
    if (o === PUPPY) {
      ell(ctx, px, py - u * 0.12, u * 0.17, u * 0.12, '#c4844a');
      puppyHead(ctx, px + side * -u * 0.04, py - u * 0.3, u * 0.14, -side, t);
    } else {
      ell(ctx, px, py - u * 0.14, u * 0.12, u * 0.16, '#3d7bd9');
      kidHead(ctx, px, py - u * 0.38, u * 0.12, '#ff5a6e', 1, t);
    }
    side = -side;
  }
}

function drawPuppy(ctx: CanvasRenderingContext2D, x: number, gy: number, u: number, t: number, scared: boolean, c: number) {
  ell(ctx, x, gy + 1, u * 0.3, u * 0.09, 'rgba(36,40,100,.28)');
  const wag = Math.sin(t * 0.35 + c) * 0.6;
  ctx.strokeStyle = '#a8673a';
  ctx.lineWidth = Math.max(2, u * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - u * 0.18, gy - u * 0.16);
  ctx.quadraticCurveTo(x - u * 0.32, gy - u * 0.3, x - u * 0.3 + wag * u * 0.1, gy - u * 0.42);
  ctx.stroke();
  const g = ctx.createLinearGradient(0, gy - u * 0.35, 0, gy);
  g.addColorStop(0, '#d99a5c');
  g.addColorStop(1, '#a86a38');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, gy - u * 0.15, u * 0.22, u * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ell(ctx, x - u * 0.1, gy - u * 0.02, u * 0.06, u * 0.05, '#fbe6c8');
  ell(ctx, x + u * 0.1, gy - u * 0.02, u * 0.06, u * 0.05, '#fbe6c8');
  const hop = scared ? Math.abs(Math.sin(t * 0.4)) * u * 0.06 : 0;
  puppyHead(ctx, x + u * 0.12, gy - u * 0.4 - hop, u * 0.17, 1, t, scared);
  // 빨간 목걸이
  ell(ctx, x + u * 0.1, gy - u * 0.26, u * 0.1, u * 0.035, '#e8414f');
}
function drawFence(ctx: CanvasRenderingContext2D, x: number, gy: number, u: number) {
  ell(ctx, x, gy + 1, u * 0.38, u * 0.08, 'rgba(36,40,100,.28)');
  const wd = u * 0.36;
  ctx.fillStyle = '#8a5530';
  ctx.fillRect(x - wd, gy - u * 0.3, wd * 2, u * 0.07);
  ctx.fillRect(x - wd, gy - u * 0.16, wd * 2, u * 0.07);
  for (const px of [-0.3, 0, 0.3]) {
    const g = ctx.createLinearGradient(x + px * u - u * 0.05, 0, x + px * u + u * 0.05, 0);
    g.addColorStop(0, '#c08550');
    g.addColorStop(1, '#8a5530');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x + px * u - u * 0.05, gy);
    ctx.lineTo(x + px * u - u * 0.05, gy - u * 0.4);
    ctx.lineTo(x + px * u, gy - u * 0.46);
    ctx.lineTo(x + px * u + u * 0.05, gy - u * 0.4);
    ctx.lineTo(x + px * u + u * 0.05, gy);
    ctx.fill();
    ell(ctx, x + px * u, gy - u * 0.45, u * 0.065, u * 0.035, '#ffffff');
  }
  ell(ctx, x, gy - u * 0.31, wd, u * 0.025, 'rgba(255,255,255,.9)');
}
function drawMini(ctx: CanvasRenderingContext2D, x: number, gy: number, u: number, t: number) {
  ell(ctx, x, gy + 1, u * 0.26, u * 0.08, 'rgba(36,40,100,.28)');
  sphere(ctx, x, gy - u * 0.17, u * 0.19);
  sphere(ctx, x, gy - u * 0.42, u * 0.13);
  ell(ctx, x - u * 0.045, gy - u * 0.44, 1.6, 1.8, '#26284a');
  ell(ctx, x + u * 0.045, gy - u * 0.44, 1.6, 1.8, '#26284a');
  ell(ctx, x + u * 0.06, gy - u * 0.4, u * 0.05, u * 0.02, '#ff8a24');
  ctx.fillStyle = '#4b6bd6';
  ctx.fillRect(x - u * 0.1, gy - u * 0.6 + Math.sin(t * 0.05) * 0.5, u * 0.2, u * 0.08);
}
function drawTree(ctx: CanvasRenderingContext2D, x: number, gy: number, u: number, t: number, c: number) {
  ell(ctx, x + u * 0.08, gy + 1, u * 0.42, u * 0.12, 'rgba(36,40,100,.32)');
  ctx.fillStyle = '#6b4325';
  ctx.fillRect(x - u * 0.06, gy - u * 0.2, u * 0.12, u * 0.2);
  const sway = Math.sin(t * 0.03 + c) * u * 0.015;
  for (let k = 0; k < 3; k++) {
    const by = gy - u * (0.14 + k * 0.3), wd = u * (0.44 - k * 0.11), ht = u * 0.48;
    const g = ctx.createLinearGradient(x - wd, 0, x + wd, 0);
    g.addColorStop(0, '#2c6a4a');
    g.addColorStop(1, '#174632');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - wd, by);
    ctx.lineTo(x + sway * (k + 1), by - ht);
    ctx.lineTo(x + wd, by);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f4f8ff';
    ctx.beginPath();
    ctx.moveTo(x - wd * 0.55, by - ht * 0.45);
    ctx.lineTo(x + sway * (k + 1), by - ht);
    ctx.lineTo(x + wd * 0.55, by - ht * 0.45);
    ctx.quadraticCurveTo(x, by - ht * 0.32, x - wd * 0.55, by - ht * 0.45);
    ctx.fill();
    ctx.fillStyle = '#f4f8ff';
    ctx.beginPath();
    ctx.ellipse(x, by - 1, wd * 0.9, u * 0.04, 0, 0, Math.PI);
    ctx.fill();
  }
}
function drawItem(ctx: CanvasRenderingContext2D, o: number, x: number, gy: number, u: number, t: number) {
  const bob = Math.sin(t * 0.08 + x) * u * 0.04, y = gy - u * 0.18 + bob;
  ell(ctx, x, gy + 1, u * 0.22, u * 0.07, 'rgba(36,40,100,.25)');
  // 반짝이는 보너스 빛
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(x, y, 1, x, y, u * 0.42);
  gl.addColorStop(0, 'rgba(255,220,120,.55)');
  gl.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.arc(x, y, u * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (o === SCARF) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.2);
    ctx.fillStyle = '#e8414f';
    ctx.beginPath();
    ctx.roundRect(-u * 0.3, -u * 0.07, u * 0.6, u * 0.14, u * 0.05);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(u * 0.16, -u * 0.05, u * 0.13, u * 0.3, u * 0.04);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (const k of [-0.18, 0, 0.18]) ctx.fillRect(k * u - u * 0.025, -u * 0.07, u * 0.05, u * 0.14);
    ctx.fillRect(u * 0.16, u * 0.15, u * 0.13, u * 0.04);
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.5);
    ctx.fillStyle = '#ff8a24';
    ctx.beginPath();
    ctx.moveTo(-u * 0.08, -u * 0.12);
    ctx.quadraticCurveTo(0, -u * 0.16, u * 0.08, -u * 0.12);
    ctx.lineTo(0, u * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c85a10';
    ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(-u * 0.05 + k * 0.01 * u, -u * 0.02 + k * u * 0.08);
      ctx.lineTo(u * 0.03, -u * 0.02 + k * u * 0.08);
      ctx.stroke();
    }
    ctx.fillStyle = '#4caf50';
    for (const a of [-0.5, 0, 0.5]) {
      ctx.beginPath();
      ctx.ellipse(Math.sin(a) * u * 0.06, -u * 0.2, u * 0.035, u * 0.1, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  if ((t + Math.floor(x)) % 50 < 25) {
    ctx.fillStyle = '#fffbe0';
    star(ctx, x + u * 0.22, y - u * 0.18, u * 0.06 * (1 + Math.sin(t * 0.3)));
    ctx.fill();
  }
}
function drawSledKid(ctx: CanvasRenderingContext2D, x: number, gy: number, u: number, dir: number, t: number, c: number) {
  const f = dir === 3 ? -1 : 1;
  ell(ctx, x, gy + 1, u * 0.36, u * 0.08, 'rgba(36,40,100,.28)');
  ctx.save();
  ctx.translate(x, gy);
  ctx.scale(f, 1);
  // 썰매
  ctx.strokeStyle = '#7a2a1a';
  ctx.lineWidth = Math.max(1.5, u * 0.04);
  ctx.beginPath();
  ctx.moveTo(-u * 0.32, -u * 0.02);
  ctx.lineTo(u * 0.26, -u * 0.02);
  ctx.quadraticCurveTo(u * 0.38, -u * 0.04, u * 0.36, -u * 0.16);
  ctx.stroke();
  ctx.fillStyle = '#e23b3b';
  ctx.beginPath();
  ctx.roundRect(-u * 0.3, -u * 0.14, u * 0.56, u * 0.09, u * 0.03);
  ctx.fill();
  // 아이
  ell(ctx, -u * 0.04, -u * 0.25, u * 0.13, u * 0.13, '#3d7bd9');
  ctx.strokeStyle = '#3d7bd9';
  ctx.lineWidth = Math.max(2, u * 0.06);
  ctx.lineCap = 'round';
  const wave = Math.sin(t * 0.2 + c) * 0.3;
  ctx.beginPath();
  ctx.moveTo(u * 0.02, -u * 0.32);
  ctx.lineTo(u * 0.16, -u * (0.5 + wave * 0.2));
  ctx.stroke();
  ctx.restore();
  kidHead(ctx, x - f * u * 0.04, gy - u * 0.47, u * 0.13, c % 2 ? '#ffb020' : '#ff5a6e', 1, t);
  // 다음에 갈 쪽 화살표
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  const ax = x + f * u * 0.44, ay = gy - u * 0.08;
  ctx.beginPath();
  ctx.moveTo(ax + f * u * 0.1, ay);
  ctx.lineTo(ax, ay - u * 0.07);
  ctx.lineTo(ax, ay + u * 0.07);
  ctx.closePath();
  ctx.fill();
}
/** 꼭대기의 꼬마 (새 눈덩이를 만들어 밀어 준다). mood 0 기다림 · 1 영차/환호 · 2 아이고 */
function drawKid(ctx: CanvasRenderingContext2D, x: number, gy: number, u: number, mood: number, t: number) {
  ell(ctx, x, gy + 1, u * 0.2, u * 0.06, 'rgba(36,40,100,.3)');
  const bounce = mood === 1 ? Math.abs(Math.sin(t * 0.25)) * u * 0.06 : Math.sin(t * 0.06) * u * 0.01;
  const y = gy - bounce;
  ctx.fillStyle = '#2a2c48';
  ctx.fillRect(x - u * 0.08, y - u * 0.14, u * 0.06, u * 0.14);
  ctx.fillRect(x + u * 0.02, y - u * 0.14, u * 0.06, u * 0.14);
  const g = ctx.createLinearGradient(0, y - u * 0.45, 0, y - u * 0.1);
  g.addColorStop(0, '#ff6b6b');
  g.addColorStop(1, '#c93a4a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x - u * 0.13, y - u * 0.44, u * 0.26, u * 0.32, u * 0.08);
  ctx.fill();
  ctx.strokeStyle = '#c93a4a';
  ctx.lineWidth = Math.max(2, u * 0.06);
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + sd * u * 0.11, y - u * 0.38);
    if (mood === 1) ctx.lineTo(x + sd * u * 0.24, y - u * 0.62);
    else if (mood === 2) ctx.lineTo(x + sd * u * 0.1, y - u * 0.6);
    else ctx.lineTo(x + sd * u * 0.2, y - u * 0.22);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffd04a';
  ctx.fillRect(x - u * 0.14, y - u * 0.46, u * 0.28, u * 0.06);
  kidHead(ctx, x, y - u * 0.58, u * 0.14, '#3d7bd9', mood === 1 ? 1 : mood === 2 ? 2 : 0, t);
}

function drawAll(ctx: CanvasRenderingContext2D, s: SnowState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const d = STAGES[s.stage];
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const SX = (u: number, v: number) => X(PX(u, v)), SY = (v: number) => Y(PY(v));
  const cw = (v: number) => R(scl(v) / COLS);
  const ccx = (c: number) => SX(cx(c) + 0.5, cy(c) + 0.5), ccy = (c: number) => SY(cy(c) + 0.5);
  const quad = (u0: number, v0: number, u1: number, v1: number) => {
    ctx.beginPath();
    ctx.moveTo(SX(u0, v0), SY(v0));
    ctx.lineTo(SX(u1, v0), SY(v0));
    ctx.lineTo(SX(u1, v1), SY(v1));
    ctx.lineTo(SX(u0, v1), SY(v1));
    ctx.closePath();
  };
  ctx.save();
  fx.begin(ctx);
  // ── 하늘 (해 질 녘) ──
  const sky = ctx.createLinearGradient(0, 0, 0, Y(FY0));
  sky.addColorStop(0, '#1b2250');
  sky.addColorStop(0.45, '#3d3378');
  sky.addColorStop(0.78, '#9a5f9c');
  sky.addColorStop(1, '#f2a27e');
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, w + 20, Y(FY0) + 20);
  for (let k = 0; k < 34; k++) {
    const sx = hsh(k) * w, sy = Y(0.09) + hsh(k + 50) * Y(0.16), tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.03 + k * 1.7));
    ctx.globalAlpha = tw * (1 - (sy - Y(0.09)) / Y(0.2));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx, sy, k % 5 ? 1.4 : 2.2, k % 5 ? 1.4 : 2.2);
  }
  ctx.globalAlpha = 1;
  // 초승달
  ctx.fillStyle = '#fff5d6';
  ctx.beginPath();
  ctx.arc(X(0.84), Y(0.15), R(0.035), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2f2c6c';
  ctx.beginPath();
  ctx.arc(X(0.855), Y(0.142), R(0.031), 0, Math.PI * 2);
  ctx.fill();
  // 먼 산
  ctx.fillStyle = '#5a4f92';
  ctx.beginPath();
  ctx.moveTo(0, Y(0.34));
  const peaks = [[0, 0.3], [0.12, 0.22], [0.25, 0.29], [0.4, 0.2], [0.55, 0.28], [0.7, 0.21], [0.86, 0.27], [1, 0.23]];
  for (const [px, py] of peaks) ctx.lineTo(X(px), Y(py));
  ctx.lineTo(w, Y(0.36));
  ctx.lineTo(0, Y(0.36));
  ctx.fill();
  ctx.fillStyle = '#d6cdf2';
  for (const [px, py] of peaks.slice(1, -1)) {
    ctx.beginPath();
    ctx.moveTo(X(px - 0.035), Y(py + 0.025));
    ctx.lineTo(X(px), Y(py));
    ctx.lineTo(X(px + 0.035), Y(py + 0.025));
    ctx.lineTo(X(px), Y(py + 0.018));
    ctx.fill();
  }
  // 가까운 언덕 (눈)
  const hill = ctx.createLinearGradient(0, Y(0.3), 0, h);
  hill.addColorStop(0, '#d8d4f2');
  hill.addColorStop(0.3, '#b9bde6');
  hill.addColorStop(1, '#8e97cc');
  ctx.fillStyle = hill;
  ctx.beginPath();
  ctx.moveTo(0, Y(0.35));
  ctx.quadraticCurveTo(X(0.25), Y(0.3), X(0.5), Y(0.34));
  ctx.quadraticCurveTo(X(0.75), Y(0.37), w, Y(0.31));
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
  // 옆 소나무 숲 (어두운 실루엣)
  for (let k = 0; k < 9; k++) {
    const side = k % 2 ? 1 : -1, px = side < 0 ? X(0.02 + hsh(k) * 0.1) : X(0.88 + hsh(k) * 0.1), py = Y(0.42 + (k / 9) * 0.55);
    const sz = R(0.05 + (k / 9) * 0.05);
    ctx.fillStyle = '#3d4f7a';
    ctx.beginPath();
    ctx.moveTo(px - sz * 0.6, py);
    ctx.lineTo(px, py - sz * 1.8);
    ctx.lineTo(px + sz * 0.6, py);
    ctx.fill();
    ctx.fillStyle = '#e8ecff';
    ctx.beginPath();
    ctx.moveTo(px - sz * 0.25, py - sz * 1.1);
    ctx.lineTo(px, py - sz * 1.8);
    ctx.lineTo(px + sz * 0.25, py - sz * 1.1);
    ctx.fill();
  }
  // ── 오두막 (창문 불빛) ──
  const cabins = [[0.16, 1, 0], [0.44, 0.78, 1], [0.82, 0.95, 2]];
  for (const [px, sc, k] of cabins) {
    const bx = X(px), by = Y(0.405), cwd = R(0.13 * sc), chh = R(0.065 * sc);
    // 굴뚝 연기
    for (let q = 0; q < 4; q++) {
      const age = (t * 0.6 + q * 25 + k * 13) % 100;
      ctx.globalAlpha = 0.35 * (1 - age / 100);
      ell(ctx, bx + cwd * 0.25 + Math.sin(age * 0.06 + k) * R(0.01) + age * 0.08, by - chh * 2.1 - age * R(0.0012), R(0.008) + age * 0.08, R(0.007) + age * 0.07, '#e9e6f8');
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#5a3a2e';
    ctx.fillRect(bx + cwd * 0.18, by - chh * 1.95, cwd * 0.12, chh * 0.6);
    const wall = ctx.createLinearGradient(bx - cwd / 2, 0, bx + cwd / 2, 0);
    wall.addColorStop(0, '#8a5a3c');
    wall.addColorStop(1, '#5e3a28');
    ctx.fillStyle = wall;
    ctx.fillRect(bx - cwd / 2, by - chh, cwd, chh);
    // 통나무 줄
    ctx.strokeStyle = 'rgba(40,20,10,.35)';
    ctx.lineWidth = 1;
    for (let q = 1; q < 4; q++) {
      ctx.beginPath();
      ctx.moveTo(bx - cwd / 2, by - chh + (chh * q) / 4);
      ctx.lineTo(bx + cwd / 2, by - chh + (chh * q) / 4);
      ctx.stroke();
    }
    // 지붕 + 눈
    ctx.fillStyle = '#6b3a3a';
    ctx.beginPath();
    ctx.moveTo(bx - cwd * 0.62, by - chh);
    ctx.lineTo(bx, by - chh * 1.85);
    ctx.lineTo(bx + cwd * 0.62, by - chh);
    ctx.fill();
    ctx.fillStyle = '#f6f8ff';
    ctx.beginPath();
    ctx.moveTo(bx - cwd * 0.66, by - chh * 0.98);
    ctx.lineTo(bx, by - chh * 1.92);
    ctx.lineTo(bx + cwd * 0.66, by - chh * 0.98);
    ctx.lineTo(bx + cwd * 0.5, by - chh * 1.15);
    ctx.lineTo(bx, by - chh * 1.6);
    ctx.lineTo(bx - cwd * 0.5, by - chh * 1.15);
    ctx.fill();
    // 창문 (깜빡이는 따뜻한 불빛) + 빛 번짐
    const flick = 0.85 + 0.15 * Math.sin(t * 0.13 + k * 2);
    const wx = bx - cwd * 0.22, wy = by - chh * 0.68, ws = chh * 0.42;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(wx, wy + ws, 1, wx, wy + ws, R(0.12 * sc));
    glow.addColorStop(0, `rgba(255,190,90,${0.5 * flick})`);
    glow.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(wx, wy + ws, R(0.12 * sc), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = `rgba(255,${200 + 30 * flick},110,1)`;
    ctx.fillRect(wx - ws / 2, wy - ws / 2, ws, ws);
    ctx.fillStyle = '#5e3a28';
    ctx.fillRect(wx - 0.6, wy - ws / 2, 1.2, ws);
    ctx.fillRect(wx - ws / 2, wy - 0.6, ws, 1.2);
    // 창가의 고양이 (가운데 오두막)
    if (k === 1) {
      const peek = (fx.memo.catT ?? -99) > t - 60;
      ctx.fillStyle = '#26203a';
      ell(ctx, wx, wy + ws * 0.32, ws * 0.32, ws * 0.22, '#26203a');
      ctx.beginPath();
      ctx.moveTo(wx - ws * 0.28, wy + ws * 0.15);
      ctx.lineTo(wx - ws * 0.2, wy - ws * 0.12);
      ctx.lineTo(wx - ws * 0.05, wy + ws * 0.1);
      ctx.moveTo(wx + ws * 0.28, wy + ws * 0.15);
      ctx.lineTo(wx + ws * 0.2, wy - ws * 0.12);
      ctx.lineTo(wx + ws * 0.05, wy + ws * 0.1);
      ctx.fill();
      ell(ctx, wx - ws * 0.12, wy + ws * 0.28, peek ? 1.6 : 1.1, peek ? 1.8 : 0.8, '#ffe066');
      ell(ctx, wx + ws * 0.12, wy + ws * 0.28, peek ? 1.6 : 1.1, peek ? 1.8 : 0.8, '#ffe066');
    }
    // 문
    ctx.fillStyle = '#3a2418';
    ctx.fillRect(bx + cwd * 0.12, by - chh * 0.62, cwd * 0.18, chh * 0.62);
  }

  // ── 눈밭 (두께 있는 판) ──
  const fl = [[SX(0, 0), SY(0)], [SX(COLS, 0), SY(0)], [SX(COLS, ROWS), SY(ROWS)], [SX(0, ROWS), SY(ROWS)]];
  const depth = R(0.05);
  // 앞면 (눈 층 + 흙)
  const face = ctx.createLinearGradient(0, fl[3][1], 0, fl[3][1] + depth);
  face.addColorStop(0, '#dfe6fa');
  face.addColorStop(0.28, '#c3cdea');
  face.addColorStop(0.3, '#5b4a6e');
  face.addColorStop(1, '#3a2c4a');
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.moveTo(fl[3][0], fl[3][1]);
  ctx.lineTo(fl[2][0], fl[2][1]);
  ctx.lineTo(fl[2][0] - R(0.01), fl[2][1] + depth);
  ctx.lineTo(fl[3][0] + R(0.01), fl[3][1] + depth);
  ctx.fill();
  ctx.fillStyle = '#e8f0ff';
  for (let k = 0; k < 16; k++) {
    const ix = fl[3][0] + ((k + 0.5) / 16) * (fl[2][0] - fl[3][0]), il = R(0.01 + hsh(k + 9) * 0.018);
    ctx.beginPath();
    ctx.moveTo(ix - 2.5, fl[3][1] + depth * 0.28);
    ctx.lineTo(ix, fl[3][1] + depth * 0.28 + il);
    ctx.lineTo(ix + 2.5, fl[3][1] + depth * 0.28);
    ctx.fill();
  }
  // 윗면 기본 눈
  const top = ctx.createLinearGradient(0, fl[0][1], 0, fl[3][1]);
  top.addColorStop(0, '#f6e9f4');
  top.addColorStop(0.25, '#eef2ff');
  top.addColorStop(1, '#ffffff');
  ctx.fillStyle = top;
  ctx.beginPath();
  for (const [px, py] of fl) ctx.lineTo(px, py);
  ctx.closePath();
  ctx.fill();
  // 칸마다 땅
  const lanes = s.phase === 'play' && !s.roll && !s.down;
  for (let c = 0; c < NC; c++) {
    const x = cx(c), y = cy(c), g = s.g[c], u = cw(y + 0.5), mx = ccx(c), my = ccy(c);
    if (g === SNOW) {
      // 눈 결 + 반짝임
      ell(ctx, mx - u * 0.12, my - u * 0.05, u * 0.3, u * 0.1, 'rgba(200,212,245,.35)');
      ell(ctx, mx + u * 0.15, my + u * 0.1, u * 0.22, u * 0.07, 'rgba(255,255,255,.8)');
      const sp = Math.sin(t * 0.07 + c * 2.3);
      if (sp > 0.85) {
        ctx.fillStyle = '#ffffff';
        star(ctx, mx + (hsh(c) - 0.5) * u * 0.6, my + (hsh(c + 7) - 0.5) * u * 0.4, 1.5 + (sp - 0.85) * 18);
        ctx.fill();
      }
    } else if (g === GRASS) {
      quad(x + 0.04, y + 0.06, x + 0.96, y + 0.94);
      const gg = ctx.createLinearGradient(0, SY(y), 0, SY(y + 1));
      gg.addColorStop(0, '#7aa858');
      gg.addColorStop(1, '#5a8a42');
      ctx.fillStyle = gg;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = '#9fd070';
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 4; k++) {
        const gx = mx + (hsh(c * 3 + k) - 0.5) * u * 0.6, gy2 = my + (hsh(c * 5 + k) - 0.5) * u * 0.35;
        ctx.beginPath();
        ctx.moveTo(gx - 2, gy2 - 3);
        ctx.lineTo(gx, gy2 + 1);
        ctx.lineTo(gx + 2, gy2 - 4);
        ctx.stroke();
      }
    } else if (g === ICE) {
      quad(x, y, x + 1, y + 1);
      const ig = ctx.createLinearGradient(SX(x, y), SY(y), SX(x + 1, y + 1), SY(y + 1));
      ig.addColorStop(0, '#d6f5ff');
      ig.addColorStop(0.5, '#9fdcf2');
      ig.addColorStop(1, '#7cc8e8');
      ctx.fillStyle = ig;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.lineWidth = 1.5;
      const sh = ((t * 0.5 + c * 9) % 80) / 80;
      ctx.beginPath();
      ctx.moveTo(SX(x + 0.1 + sh * 0.5, y + 0.8), SY(y + 0.8));
      ctx.lineTo(SX(x + 0.35 + sh * 0.5, y + 0.2), SY(y + 0.2));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(80,150,190,.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mx - u * 0.2, my + u * 0.05);
      ctx.lineTo(mx, my - u * 0.04);
      ctx.lineTo(mx + u * 0.1, my + u * 0.08);
      ctx.stroke();
    } else if (g === PLAZA) {
      quad(x, y, x + 1, y + 1);
      ctx.fillStyle = '#8d90b2';
      ctx.fill();
      for (let k = 0; k < 6; k++) {
        const sx2 = x + 0.08 + (k % 3) * 0.3 + (Math.floor(k / 3) % 2) * 0.12, sy2 = y + 0.1 + Math.floor(k / 3) * 0.44;
        quad(sx2, sy2, sx2 + 0.26, sy2 + 0.36);
        ctx.fillStyle = k % 2 ? '#a9acc9' : '#b7badb';
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,255,255,.6)';
      ctx.lineWidth = 1.5;
      quad(x, y, x + 1, y + 1);
      ctx.stroke();
    }
    if (s.sl[c] >= 0) {
      // 비탈: 그늘 + 흐르는 화살
      quad(x, y, x + 1, y + 1);
      ctx.fillStyle = 'rgba(90,110,190,.16)';
      ctx.fill();
      const dd = s.sl[c], ph = (t * 0.03) % 1;
      ctx.strokeStyle = g === SNOW ? 'rgba(90,120,210,.75)' : 'rgba(255,255,255,.8)';
      ctx.lineWidth = 2;
      for (let k = 0; k < 2; k++) {
        const f = ((k * 0.5 + ph) % 1) - 0.5, ax = x + 0.5 + DX[dd] * f * 0.8, ay = y + 0.5 + DY[dd] * f * 0.8;
        const px = (q: number, r: number) => SX(ax + DX[dd] * q + DY[dd] * r, ay + DY[dd] * q + DX[dd] * r);
        const py = (q: number, r: number) => SY(ay + DY[dd] * q + DX[dd] * r);
        ctx.beginPath();
        ctx.moveTo(px(-0.12, -0.2), py(-0.12, -0.2));
        ctx.lineTo(px(0.06, 0), py(0.06, 0));
        ctx.lineTo(px(-0.12, 0.2), py(-0.12, 0.2));
        ctx.stroke();
      }
    }
    // 눈덩이와 같은 줄 = 톡할 수 있는 칸 (은은한 금빛)
    if (lanes && c !== s.ball && (x === cx(s.ball) || y === cy(s.ball))) {
      quad(x + 0.06, y + 0.08, x + 0.94, y + 0.92);
      ctx.fillStyle = `rgba(255,214,90,${0.14 + 0.06 * Math.sin(t * 0.1)})`;
      ctx.fill();
    }
  }
  // 칸 금
  ctx.strokeStyle = 'rgba(110,130,200,.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k <= COLS; k++) {
    ctx.moveTo(SX(k, 0), SY(0));
    ctx.lineTo(SX(k, ROWS), SY(ROWS));
  }
  for (let k = 0; k <= ROWS; k++) {
    ctx.moveTo(SX(0, k), SY(k));
    ctx.lineTo(SX(COLS, k), SY(k));
  }
  ctx.stroke();
  // 오두막 불빛이 눈밭 위로 번진다
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [px, sc] of cabins) {
    const gx = X(px - 0.03), gy2 = Y(0.44), rr = R(0.16 * sc);
    const gl = ctx.createRadialGradient(gx, gy2, 1, gx, gy2, rr);
    gl.addColorStop(0, `rgba(255,170,80,${0.16 + 0.03 * Math.sin(t * 0.13)})`);
    gl.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.ellipse(gx, gy2, rr, rr * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── 미리 보기 (누르고 있는 동안): 이 칸을 톡하면 어디까지 가고 몇이 되나 ──
  let pv: Trace | null = null, pvStart = s.size;
  if (s.down && s.aim && s.phase === 'play' && !s.roll && s.left > 0) {
    const q = toCell(s.aim.x, s.aim.y), a = q && aimRoll(s, q.u, q.v);
    if (a) {
      const key = `${s.used}:${s.ball}:${a.dest}:${s.stage}:${s.tries}`;
      const cc = PREV.get(s);
      if (cc && cc.key === key) (pv = cc.path), (pvStart = cc.start);
      else {
        const S = cloneSim(s);
        pv = simRoll(S, a.dir, a.dest, true);
        PREV.set(s, { key, path: pv, start: s.size });
      }
    }
  }
  if (pv && pv.length) {
    // 점선 길
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const pts = [[ccx(s.ball), ccy(s.ball)], ...pv.map((p) => [ccx(p.c), ccy(p.c)])];
    for (const [col, lw] of [['rgba(30,40,110,.45)', 7], ['#ffffff', 3.5]] as [string, number][]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.setLineDash([7, 6]);
      ctx.lineDashOffset = -t * 0.6;
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
    // 칸마다 +1 / −1 (구슬처럼 꿴 작은 딱지)
    let prev = pvStart;
    for (const p of pv) {
      const px = ccx(p.c), py = ccy(p.c), dv = p.size - prev;
      if (p.kind === 0 && dv !== 0) {
        const tx = dv > 0 ? `+${dv}` : `−${-dv}`;
        font(0.033, 900);
        const tw = ctx.measureText(tx).width + 8, th2 = Math.max(15, R(0.042));
        ctx.fillStyle = dv > 0 ? 'rgba(40,96,210,.92)' : 'rgba(150,86,40,.92)';
        ctx.beginPath();
        ctx.roundRect(px - tw / 2, py - th2 / 2, tw, th2, th2 / 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.85)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tx, px, py + 0.5);
      }
      prev = p.size;
    }
  }

  // ── 땅 위의 것들 (뒤에서 앞으로) ──
  const items: { v: number; f: () => void }[] = [];
  const bp = Math.min(1, s.rk / s.rT);
  let bu = cx(s.ball) + 0.5, bv = cy(s.ball) + 0.5;
  if (s.from !== s.ball) (bu = cx(s.from) + 0.5 + (cx(s.ball) - cx(s.from)) * bp), (bv = cy(s.from) + 0.5 + (cy(s.ball) - cy(s.from)) * bp);
  if (s.bump > 0) {
    const k = Math.sin((s.bump / 14) * Math.PI) * 0.28;
    (bu += DX[s.bumpDir] * k), (bv += DY[s.bumpDir] * k);
  }
  const shownSize = s.from !== s.ball && bp < 0.5 ? s.prevSize : s.size;
  const pvBad = !!pv && pv.some((p) => p.kind === 2);
  for (let c = 0; c < NC; c++) {
    const o = s.o[c];
    if (!o) continue;
    let u0 = cx(c) + 0.5, v0 = cy(c) + 0.5;
    if (o === SLED && s.sledFrom[c] >= 0 && t - s.sledT < 22) {
      const k = (t - s.sledT) / 22, f0 = s.sledFrom[c];
      (u0 = cx(f0) + 0.5 + (cx(c) - cx(f0)) * k), (v0 = cy(f0) + 0.5 + (cy(c) - cy(f0)) * k);
    }
    const uu = cw(v0), x = SX(u0, v0), gy = SY(v0) + uu * 0.12;
    const osz = o === TREE ? s.os[c] : OSIZE[o];
    const pvMark = pv?.find((p) => p.c === c && (p.kind === 1 || p.kind === 2));
    items.push({
      v: v0,
      f: () => {
        const near = Math.abs(u0 - bu) + Math.abs(v0 - bv) < 2.2;
        if (o === FENCE) drawFence(ctx, x, gy, uu);
        else if (o === PUPPY) drawPuppy(ctx, x, gy, uu, t, near && s.size > 3, c);
        else if (o === MINI) drawMini(ctx, x, gy, uu, t);
        else if (o === TREE) drawTree(ctx, x, gy, uu, t, c);
        else if (o === SLED) drawSledKid(ctx, x, gy, uu, s.sd[c], t, c);
        else drawItem(ctx, o, x, gy, uu, t);
        // 크기 딱지: 말아 들일 수 있으면 초록, 아니면 빨강
        if (!isItem(o) || o === SLED) {
          const can = osz < s.size, by2 = o === TREE ? gy - uu * 1.05 : gy - uu * 0.62;
          badge(ctx, x + uu * 0.28, by2, Math.max(8.5, uu * (o === TREE ? 0.17 : 0.13)), `${osz}`, can ? '#2fa968' : '#e0485a');
        }
        if (pvMark) {
          const mx = x, my = gy - uu * (o === TREE ? 1.25 : 0.82);
          badge(ctx, mx, my, Math.max(10, uu * 0.18), pvMark.kind === 1 ? '✓' : '✗', pvMark.kind === 1 ? '#2fa968' : '#e0485a');
          if (pvMark.kind === 2) {
            font(0.034, 900);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffd6d6';
            ctx.strokeStyle = 'rgba(60,0,20,.6)';
            ctx.lineWidth = 3;
            ctx.strokeText('퉁! 반쪽', mx, my - uu * 0.3);
            ctx.fillText('퉁! 반쪽', mx, my - uu * 0.3);
          }
        }
      },
    });
  }
  // 받침: 표지판 + 완성된 눈사람
  for (const b of s.bases) {
    const signC = b.st ? b.c : b.cs[Math.floor((b.cs.length - 1) / 2)];
    const v0 = cy(signC) + 0.5, uu = cw(v0);
    if (b.st >= 1) {
      const x = ccx(b.c), gy = ccy(b.c) + uu * 0.12;
      items.push({ v: v0 + 0.01, f: () => drawSnowman(ctx, x, gy, uu, b, t) });
    } else {
      // 깃발 표지판: 몸통 N+
      const x = SX(cx(signC) + (b.cs.length > 1 ? 0.5 : 0.82), v0 - 0.25), gy = SY(v0 - 0.25);
      const can = s.size >= b.body;
      items.push({
        v: v0 - 0.3,
        f: () => {
          ctx.fillStyle = '#6b4325';
          ctx.fillRect(x - 1.5, gy - uu * 0.62, 3, uu * 0.62);
          const bw = Math.max(46, uu * 1.02), bh = Math.max(20, uu * 0.36), bx = x - bw / 2, by = gy - uu * 0.62 - bh;
          ctx.fillStyle = can ? '#fff2c2' : '#fffaf0';
          ctx.strokeStyle = can ? '#ffcf5a' : '#8a6a4a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(bx, by, bw, bh, 5);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(x, by, bw * 0.45, 3, 0, Math.PI, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#3a2a4a';
          ctx.font = `900 ${Math.max(12, bh * 0.62)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`⛄ ${b.body}+`, x, by + bh / 2 + 1);
        },
      });
    }
  }
  // 받침이 완성될 수 있으면 반짝 고리
  for (const b of s.bases) {
    if (b.st === 2) continue;
    const ok = b.st === 0 ? s.size >= b.body : s.size === b.head;
    if (!ok || s.phase !== 'play') continue;
    for (const c of b.st ? [b.c] : b.cs) {
      const x = ccx(c), y = ccy(c), uu = cw(cy(c) + 0.5);
      ctx.strokeStyle = `rgba(255,214,90,${0.5 + 0.3 * Math.sin(t * 0.15)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, uu * 0.42, uu * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // 꼬마 (출발 자리 옆)
  {
    const v0 = cy(s.spawn) + 0.45, uu = cw(v0), x = SX(cx(s.spawn) + (cx(s.spawn) >= COLS - 1 ? 0.15 : 0.95), v0), gy = SY(v0) + uu * 0.1;
    const recent = (k: string, n: number) => s.events.some((e) => e.kind === k && t - e.t < n);
    const mood = recent('bounce', 60) || recent('fail', 100) ? 2 : recent('push', 30) || recent('body', 90) || recent('head', 90) || s.phase === 'result' ? 1 : 0;
    items.push({ v: v0 + 0.02, f: () => drawKid(ctx, x, gy, uu * 1.15, mood, t) });
  }
  // 주인공 눈덩이
  if (s.phase === 'play' || !s.ok) {
    const uu = cw(bv), age = t - s.spawnT, grow = age < 16 ? Math.max(0.05, Math.sin((age / 16) * Math.PI * 0.5)) : 1;
    const r = uu * ballK(shownSize) * grow;
    const x = SX(bu, bv), gy = SY(bv) + uu * 0.1;
    const rolling = !!s.roll || bp < 1;
    const mood = s.dizzy > 0 ? 2 : pvBad ? 4 : rolling ? 1 : s.size >= 8 ? 3 : 0;
    const sq = s.bump > 0 ? Math.sin((s.bump / 14) * Math.PI) : 0;
    const spinA = (s.spin + (rolling ? bp : 0)) * 1.4 * (s.rdir === 1 || s.rdir === 2 ? 1 : -1);
    items.push({
      v: bv + 0.02,
      f: () => {
        drawBall(ctx, x, gy, r, spinA, s.rdir === 1 || s.rdir === 3, s.carry, mood, t, sq);
        // 크기 딱지 (바뀌면 톡 커진다)
        const ch = fx.delta('sz', shownSize);
        if (ch !== 0) fx.memo.szT = t;
        const pulse = t - (fx.memo.szT ?? -99) < 10 ? 1 + 0.35 * Math.sin(((t - (fx.memo.szT ?? 0)) / 10) * Math.PI) : 1;
        const br = Math.max(11, uu * 0.19) * pulse;
        const by2 = gy - r * 1.9 - br - 2;
        badge(ctx, x, by2, br, `${shownSize}`, '#3a63d8');
      },
    });
  }
  items.sort((a, b) => a.v - b.v);
  for (const it of items) it.f();
  // 미리 보기 끝: 유령 눈덩이 + 도착 크기 / 받침 ✓✗
  if (pv && pv.length) {
    const last = pv[pv.length - 1];
    let endC = last.c, endSize = last.size;
    if (last.kind === 2 || last.kind === 4) {
      endC = pv.length > 1 ? pv[pv.length - 2].c : s.ball;
      endSize = last.size;
    }
    const uu = cw(cy(endC) + 0.5), x = ccx(endC), gy = ccy(endC) + uu * 0.1;
    if (last.kind === 3) {
      badge(ctx, x, gy - uu * 1.0, Math.max(13, uu * 0.24), '✓', '#2fa968');
      font(0.04, 900);
      const tx = `크기 ${last.size} → 완성!`, tw = ctx.measureText(tx).width + 16, th2 = R(0.056);
      const lx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, x)), ly = gy - uu * 1.0 - R(0.06);
      ctx.fillStyle = 'rgba(18,80,50,.92)';
      ctx.beginPath();
      ctx.roundRect(lx - tw / 2, ly - th2 / 2, tw, th2, th2 / 2);
      ctx.fill();
      ctx.strokeStyle = '#8ff0b0';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tx, lx, ly + 0.5);
    } else {
      const r = uu * ballK(endSize);
      ctx.globalAlpha = 0.5;
      sphere(ctx, x, gy - r * 0.9, r);
      ctx.globalAlpha = 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, gy - r * 0.9, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      badge(ctx, x, gy - r * 1.9 - Math.max(12, uu * 0.22), Math.max(12, uu * 0.22), `${endSize}`, last.kind === 2 ? '#e0485a' : '#3a63d8');
      if (last.kind === 4) {
        const bc = last.c, bx = ccx(bc), byy = ccy(bc) - cw(cy(bc) + 0.5) * 1.6;
        badge(ctx, bx + uu * 0.5, byy, Math.max(11, uu * 0.18), '✗', '#e0485a');
      }
    }
  }
  // 손가락 자리
  if (s.down && s.aim && s.phase === 'play') {
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(X(s.aim.x), Y(s.aim.y), R(0.035), 0, Math.PI * 2);
    ctx.stroke();
  }
  // 깨진 반쪽 (튕길 때)
  let chunks = CHUNKS.get(s);
  if (!chunks) CHUNKS.set(s, (chunks = []));
  for (const ck of chunks) {
    const age = t - ck.t, k = age / 40;
    if (k > 1) continue;
    const x = ck.x + ck.vx * age, y = ck.y - age * 2.2 + age * age * 0.12;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.translate(x, y);
    ctx.rotate(age * 0.2 * Math.sign(ck.vx || 1));
    ctx.beginPath();
    ctx.arc(0, 0, ck.r, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = '#eef3ff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,88,150,.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
  // 눈 내리는 판: 펑펑 (평소에도 조금씩)
  const heavy = s.snow ? 1 : 0, sf = t - s.snowT < 60 ? 1 : 0;
  for (let k = 0; k < 26 + heavy * 20 + sf * 40; k++) {
    const fx0 = hsh(k * 3.1) * w, sp = 0.25 + hsh(k) * 0.4, yy = ((hsh(k + 11) * h + t * sp * (1 + sf)) % (h * 0.86)) + Y(0.08);
    ctx.globalAlpha = 0.5 + 0.4 * hsh(k + 5);
    ell(ctx, fx0 + Math.sin(t * 0.03 + k) * 6, yy, 1.4 + hsh(k + 2) * 1.6, 1.4 + hsh(k + 2) * 1.6, '#ffffff');
  }
  ctx.globalAlpha = 1;

  // ── 사건 연출 ──
  const seenT = fx.memo.t ?? -1;
  const say = (x: number, y: number, text: string, col: string, size: number) => fx.pop(Math.max(w * 0.12, Math.min(w * 0.88, x)), y, text, col, size);
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const uu = cw(cy(e.c) + 0.5), x = ccx(e.c), y = ccy(e.c);
    const br = uu * ballK(s.size);
    if (e.kind === 'push') say(SX(cx(s.spawn) + 1.1, cy(s.spawn)), SY(cy(s.spawn)) - uu * 0.4, e.text!, '#fff1c2', 14), fx.burst(x, y, '#ffffff', 8, 2, 2);
    if (e.kind === 'grow') fx.burst(x, y, '#ffffff', 5, 1.6, 2.2), say(x, y - uu * 0.3, '+1', '#cfeeff', 12);
    if (e.kind === 'shrink') fx.burst(x, y, '#8fbf62', 6, 1.6, 2), say(x, y - uu * 0.3, '−1', '#ffd2a0', 12);
    if (e.kind === 'stop') say(x, y - br * 2.1 - uu * 0.5, e.text!, '#ffffff', 17), fx.ring(x, y, '#ffffff', uu * 0.7, 3);
    if (e.kind === 'absorb') {
      const col = e.a === TREE ? '#2c6a4a' : e.a === SCARF ? '#e8414f' : e.a === CARROT ? '#ff8a24' : e.a === PUPPY ? '#c4844a' : e.a === SLED ? '#3d7bd9' : '#a0683a';
      fx.burst(x, y - uu * 0.2, col, 16, 3.2, 2.6), fx.burst(x, y - uu * 0.2, '#ffffff', 12, 2.6, 2.4), fx.ring(x, y, '#ffffff', uu * 0.8, 3), fx.kick(e.a === TREE ? 6 : 3);
      say(x, y - uu * 0.9, e.text!, isItem(e.a ?? 0) ? '#ffe9a8' : '#ffffff', 16);
      if (e.a === PUPPY || e.a === SLED) fx.memo.catT = t;
    }
    if (e.kind === 'bounce') {
      fx.burst(x, y - uu * 0.3, '#ffffff', 26, 4.2, 3), fx.ring(x, y, '#ffb3b3', uu, 4), fx.kick(9), fx.blink('#ffffff', 0.15);
      say(x, y - uu * 1.1, e.text!, '#ffd0d0', 20);
      chunks.push({ t, x: ccx(s.ball), y: ccy(s.ball) - br, vx: -DX[e.a ?? 0] * 1.4 + (DX[e.a ?? 0] === 0 ? 1.2 : 0), r: br * 0.8 });
      if (chunks.length > 6) chunks.shift();
      fx.memo.catT = t;
    }
    if (e.kind === 'edge') say(x, y - uu * 0.8, e.text!, '#e8ecff', 14), fx.kick(2), fx.burst(x, y, '#ffffff', 6, 1.8, 2);
    if (e.kind === 'body' || e.kind === 'head') {
      fx.burst(x, y - uu * 0.4, '#ffffff', 36, 5, 3), fx.burst(x, y - uu * 0.4, '#ffe066', 22, 4.2, 2.6), fx.ring(x, y - uu * 0.3, '#ffe066', uu * 1.4, 5), fx.blink('#fff6d8', 0.22), fx.kick(5);
      say(x, y - uu * 1.6, e.text!, '#fff1a8', 20);
      fx.memo.catT = t;
    }
    if (e.kind === 'nohead' || e.kind === 'small') say(x, y - uu * 1.3, e.text!, '#ffd6cc', 14), fx.kick(1.5);
    if (e.kind === 'snowfall') {
      fx.blink('#ffffff', 0.35);
      for (let k = 0; k < 6; k++) fx.burst(X(0.15 + k * 0.14), Y(0.5 + (k % 3) * 0.22), '#ffffff', 14, 3, 2.6);
      say(w / 2, Y(0.62), e.text!, '#ffffff', 18);
    }
    if (e.kind === 'nope') say(x, y - uu, e.text!, '#ffd6cc', 14);
    if (e.kind === 'clear') {
      for (let k = 0; k < 4; k++) fx.burst(X(0.2 + k * 0.2), Y(0.75), ['#ffe066', '#ff8fb0', '#8fe0ff', '#ffffff'][k], 34, 6, 3.2);
      fx.ring(w / 2, Y(0.8), '#ffe066', R(0.45), 7), fx.blink('#fff6c8', 0.25);
    }
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.2);
  }
  fx.memo.t = t;
  ctx.restore();

  // ═════════════ HUD ═════════════
  const hb = R(0.08);
  ctx.fillStyle = 'rgba(22,26,64,.88)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.045, 900);
  const ttl = `⛄ ${s.stage + 1}번째 언덕`, tw1 = ctx.measureText(ttl).width;
  ctx.fillText(ttl, R(0.03), hb * 0.52);
  font(0.036, 800);
  ctx.fillStyle = th.muted;
  ctx.fillText(` / ${STAGE_COUNT}`, R(0.03) + tw1, hb * 0.56);
  ctx.textAlign = 'right';
  font(0.042, 900);
  ctx.fillStyle = '#ffd84a';
  const stt = `★ ${s.stars}/${STAGE_COUNT * 3}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.05) - ctx.measureText(stt).width, hb * 0.52);
  // 새것 알림 (HUD 아래 띠)
  if (s.news && s.t - s.news.t < NEWS_T) {
    const age = s.t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tx = s.news.text, tw2 = Math.min(w - 10, ctx.measureText(tx).width + 24), by2 = hb + R(0.04) - drop;
    ctx.fillStyle = 'rgba(22,26,64,.92)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.026), tw2, R(0.052), R(0.026));
    ctx.fill();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, by2, w - 24);
    ctx.globalAlpha = 1;
  }
  // 판 카드: 시작 · 완성 · 실패
  {
    let head = '', sub = '', nw = '', col = '#ffffff', age = 0, a = 1;
    const nSnow = s.bases.length, nHead = s.bases.filter((b) => b.head).length;
    if (s.phase === 'result') {
      age = s.pt;
      if (s.ok) (head = s.won ? '마을 완성! ⛄⛄' : '언덕 완성!'), (sub = `눈사람 ✓ · 굴리기 ${s.used}번${s.used <= d.par ? ' ✓' : ` (≤${d.par} ✗)`} · 보너스 ${s.starOk[2] ? '✓' : '✗'}`), (col = '#ffd84a');
      else (head = `앗… ${s.why}`), (sub = s.hearts > 0 ? '하트 −1 · 같은 언덕 다시' : '끝 — 눈사람들이 손을 흔들어요!'), (col = '#ffb3a8');
    } else if (s.pt < CARD_T && s.used === 0) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20);
      head = s.again ? `다시! ${s.stage + 1}번째 언덕` : `${s.stage + 1}번째 언덕`;
      sub = `눈사람 ${nSnow}개${nHead ? ` (머리 ${nHead})` : ''} · 굴리기 ${d.rolls}번 · ★ ${d.par}번 이하`;
      nw = d.news;
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = Y(nw ? 0.235 : 0.25), ch = nw ? 0.158 : 0.11;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(22,26,64,.93)';
      ctx.beginPath();
      ctx.roundRect(-R(nw ? 0.46 : 0.4), -R(0.055), R(nw ? 0.92 : 0.8), R(ch), R(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.048, 900);
      if (s.phase === 'result' && s.ok) {
        const hw = ctx.measureText(head).width, sw = R(0.056), x0 = -(hw + R(0.02) + sw * 3) / 2;
        ctx.textAlign = 'left';
        ctx.fillText(head, x0, -R(0.018));
        for (let k = 0; k < 3; k++) {
          const ag = s.pt - (10 + k * 13);
          if (ag < 0) continue;
          const got = s.starOk[k], pop = ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1, sx = x0 + hw + R(0.02) + sw * (k + 0.5);
          ctx.save();
          ctx.translate(sx, -R(0.018));
          ctx.scale(pop, pop);
          star(ctx, 0, 0, R(0.024));
          ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.12)';
          ctx.fill();
          ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx, cyy - R(0.018), '#ffe066', 16, 3, 2.4);
        }
        ctx.textAlign = 'center';
      } else ctx.fillText(head, 0, -R(0.018), R(0.76));
      ctx.fillStyle = '#fffaf0';
      font(0.036, 800);
      ctx.fillText(sub, 0, R(0.03), R(0.76));
      if (nw) {
        ctx.fillStyle = '#ffe9a8';
        font(0.037, 900);
        ctx.fillText(nw, 0, R(0.077), R(0.86));
      }
      ctx.restore();
    }
  }
  // ═════════════ 아래 띠 ═════════════
  {
    const ty = 1.265, tb = h / w;
    const g = ctx.createLinearGradient(0, Y(ty), 0, Y(tb));
    g.addColorStop(0, 'rgba(30,34,82,.95)');
    g.addColorStop(1, 'rgba(18,20,52,.98)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, Y(ty), w, Y(tb - ty) + 4, [R(0.03), R(0.03), 0, 0]);
    ctx.fill();
    // 굴리기 남은 수: 작은 눈덩이 (★ 선 안쪽은 밝게)
    const r1 = Y(ty + 0.04);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e6eeff';
    font(0.036, 900);
    ctx.fillText('굴리기', X(0.03), r1);
    const dx0 = X(0.2), dstep = Math.min(R(0.05), (X(0.78) - dx0) / Math.max(1, d.rolls));
    for (let k = 0; k < d.rolls; k++) {
      const px = dx0 + k * dstep + (k >= d.par ? R(0.016) : 0), used = k < s.used, inPar = k < d.par;
      if (used) {
        ctx.strokeStyle = 'rgba(255,255,255,.3)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(px, r1, R(0.016), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        sphere(ctx, px, r1, R(0.017));
        if (!inPar) {
          ctx.fillStyle = 'rgba(30,34,82,.35)';
          ctx.beginPath();
          ctx.arc(px, r1, R(0.017), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    const lx = dx0 + d.par * dstep - dstep / 2 + R(0.008);
    ctx.strokeStyle = '#ffd84a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, r1 - R(0.024));
    ctx.lineTo(lx, r1 + R(0.022));
    ctx.stroke();
    ctx.fillStyle = '#ffd84a';
    font(0.03, 900);
    ctx.textAlign = 'center';
    ctx.fillText('★', lx, r1 - R(0.034));
    ctx.textAlign = 'right';
    font(0.036, 800);
    ctx.fillStyle = s.left > 0 ? '#c9d6ff' : '#ffb3a8';
    ctx.fillText(`${s.left}번 남음`, X(0.97), r1);
    // 별 목표 셋
    const doneN = s.bases.filter((b) => b.st === 2).length;
    const okk = s.phase === 'result' && s.ok ? s.starOk : [doneN === s.bases.length, s.used <= d.par && s.used > 0, s.got >= s.gotAll];
    const bad = [s.phase === 'result' && !s.ok, s.used > d.par, false];
    const labels = [`눈사람 ${doneN}/${s.bases.length}`, `굴리기 ≤${d.par}`, d.key === 'sled' ? `썰매 ${s.got}/${s.gotAll}` : `보너스 ${s.got}/${s.gotAll}`];
    const r2 = Y(ty + 0.112), cw2 = R(0.3);
    for (let k = 0; k < 3; k++) {
      const cx1 = X(0.03) + k * (cw2 + R(0.017));
      ctx.fillStyle = okk[k] ? 'rgba(255,216,74,.25)' : bad[k] ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.08)';
      ctx.beginPath();
      ctx.roundRect(cx1, r2 - R(0.026), cw2, R(0.052), R(0.026));
      ctx.fill();
      ctx.strokeStyle = okk[k] ? '#ffd84a' : bad[k] ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = okk[k] ? '#ffd84a' : bad[k] ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.6)';
      font(0.04, 900);
      ctx.textAlign = 'center';
      ctx.fillText(bad[k] ? '✗' : '★', cx1 + R(0.03), r2 + R(0.002));
      ctx.fillStyle = okk[k] ? '#fff6dc' : bad[k] ? 'rgba(255,255,255,.4)' : '#e6eeff';
      font(0.036, 800);
      ctx.textAlign = 'left';
      ctx.fillText(labels[k], cx1 + R(0.058), r2 + R(0.002), cw2 - R(0.066));
    }
    // 안내 한 줄
    let hint = d.hint;
    const first = s.stage === 0 && !s.firstRoll && s.phase === 'play';
    if (first) hint = '👆 눈밭을 톡! 눈덩이가 데굴데굴 커져요';
    else if (s.down && s.phase === 'play') hint = s.left > 0 ? (pv ? '떼면 데굴데굴! 숫자 = 도착 크기' : '눈덩이와 같은 줄을 눌러요') : '굴리기를 다 썼어요';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '마을이 눈사람으로 가득!' : `★ ${s.gotStars}개! 다음 언덕엔 새것이 나와요`) : '꾹 누르면 굴러갈 길이 보여요';
    else if (s.stage === 0 && s.used < 2) hint = '꾹 누르고 있으면 길과 도착 크기가 보여요';
    ctx.textAlign = 'center';
    ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
    font(first ? 0.042 : 0.037, 900);
    ctx.fillText(hint, w / 2, Y(ty + 0.19), w - R(0.05));
  }
}

export const __dbg = { layout, cloneSim, simRoll, solve, aimRoll, done, movesOf, newStage };
