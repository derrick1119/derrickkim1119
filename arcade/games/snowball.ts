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
      '..BBB..',
      '.p...f.',
      '.......',
    ],
    bases: [[4, 0]],
    rolls: 9, par: 2,
  },
  {
    key: 'grass', news: '🟫 맨땅은 −1 — 지나간 자리도 맨땅이 돼요', hint: '맨땅을 피해 눈 칸으로 돌아가요',
    map: [
      ',,.S.,,',
      '.,...,.',
      '.,.,.,.',
      'c,...,m',
      '.,.,.,.',
      '.,,.,,.',
      '..BBB..',
      ',,...,,',
    ],
    bases: [[5, 0]],
    rolls: 10, par: 3,
  },
  {
    key: 'ice', news: '🧊 얼음 위에선 멈추지 못하고 미끄러져 지나가요', hint: '얼음은 크기 그대로 — 건너편까지 쭈욱',
    map: [
      '...S...',
      '.......',
      '.,...,.',
      ',~~~~~,',
      ',~~m~~,',
      ',~~~~~,',
      'cB...B,',
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
      '...m...',
      '.,BBB,c',
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
      '.......',
      'vvvv,,,',
      'vvvv,f,',
      'vvvv,,,',
      '>>>>>>v',
      'm,,BB..',
      ',,.,..c',
    ],
    bases: [[10, 0]],
    rolls: 7, par: 3,
  },
  {
    key: 'head', news: '⛄ 머리는 딱 그 크기! 너무 크면 맨땅에서 깎아요', hint: '머리는 딱 맞게 — 크면 맨땅을 지나 깎아요',
    map: [
      '...S...',
      '.......',
      '..,.,..',
      'c.....m',
      '.,,.,,.',
      '.......',
      '...B...',
      '.,...,.',
    ],
    bases: [[6, 3]],
    rolls: 9, par: 5,
  },
  {
    key: 'snowfall', news: '🌨️ 굴리기 2번마다 맨땅에 눈이 다시 쌓여요', hint: '눈이 오면 지나간 길이 다시 하얘져요',
    map: [
      '...S...',
      ',.,.,.,',
      ',,,.,,,',
      'm,...,c',
      ',,,.,,,',
      ',.,.,.,',
      ',B,,,B,',
      ',,,,,,,',
    ],
    bases: [[5, 3], [5, 0]],
    rolls: 12, par: 8,
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
    rolls: 12, par: 8,
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
  roll: Roll | null; rk: number; rT: number; from: number; prevSize: number; lastRollEnd: number; spin: number; bump: number; bumpDir: number;
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
  if (s.phase !== 'play' || s.roll) return;
  const q = toCell(sx, sy);
  if (!q) return;
  const a = aimRoll(s, q.u, q.v);
  if (!a) return;
  if (s.left <= 0) return void ev(s, 'nope', s.ball, '굴리기를 다 썼어요');
  s.left--;
  s.used++;
  s.roll = { dir: a.dir, dest: a.dest, forced: false, done: false, n: 0 };
  s.rk = 0;
  s.rT = STEP_T;
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
      roll: null, rk: 0, rT: STEP_T, from: 0, prevSize: 1, lastRollEnd: 0, spin: 0, bump: 0, bumpDir: 0,
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
    // 굴러가는 중: STEP_T틱마다 한 칸
    if (s.roll && ++s.rk >= s.rT) {
      s.rk = 0;
      s.from = s.ball;
      s.prevSize = s.size;
      const R = s.roll, bst = s.bases.map((b) => b.st).join();
      adv(s, R, s);
      const moved = s.ball !== s.from && s.bases.map((b) => b.st).join() === bst;
      if (moved) s.spin += 1;
      else if (s.bases.map((b) => b.st).join() !== bst) (s.spawnT = s.t), (s.from = s.ball);
      else (s.bump = 14), (s.bumpDir = R.dir), s.events.some((e) => e.t === s.t && e.kind === 'bounce') && (s.dizzy = 90);
      s.rT = s.g[s.ball] === ICE || s.sl[s.ball] >= 0 ? SLIDE_T : STEP_T;
      if (R.done) {
        s.roll = null;
        s.lastRollEnd = s.t;
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
    if (done(s)) return endStage(s, true, '');
    if (s.left <= 0 && s.t - s.lastRollEnd > 20) endStage(s, false, '굴리기를 다 썼어요');
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
    if (s.phase !== 'play' || s.roll || s.left <= 0) return NO;
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
function drawAll(ctx: CanvasRenderingContext2D, s: SnowState, w: number, h: number, th: Theme) {
  const fx = juice(s);
  ctx.save();
  fx.begin(ctx);
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export const __dbg = { layout, cloneSim, simRoll, solve, aimRoll, done, movesOf, newStage };
