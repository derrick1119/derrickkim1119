/**
 * 손전등 유령 복도 (28라운드: 처음 보는 규칙) — 비추면 멈춤 × 가리키기(톡) × 턴제화.
 * 기준 9(손이 하는 일은 하나): 화면을 톡 = 아이가 그쪽으로 손전등을 비춘다(아이를 중심으로 8방향). 누르고 있는 동안 빛 원뿔과
 *   '이번에 얼 유령 ❄️ / 다가올 유령의 다음 칸 →'이 미리 보이고, 떼면 실행. 키보드는 화살표 커서 + 스페이스.
 * 규칙(결정적, 턴제): 톡 한 번 = 한 턴. ① 아이가 정해진 길(카펫)로 한 칸 걷는다 ② 그 자리에서 고른 쪽으로 빛을 비춘다
 *   ③ 빛 원뿔 안의 유령은 '얼음!' 웃긴 자세로 굳고, 빛 밖의 유령만 아이 쪽으로 한 칸(가장 가까운 길로) 다가온다.
 *   움직인 유령이 아이 칸에 닿으면 '왁!' 실패. 얼어 있는 유령에게 아이가 걸어 들어가면 유령이 화들짝 '펑!' 사라진다.
 *   손전등을 다른 쪽으로 돌릴 때마다 배터리 🔋 1칸(같은 쪽 그대로는 공짜). 가구·벽은 빛도 유령도 막는다.
 * 와우: 내가 아이를 움직이지 않는다 — 정하는 건 '어디를 볼지' 하나. 빛을 돌리는 순간 원뿔 속 유령들이 한 발 든 채 혀를 내밀고
 *   꽁꽁, 빛이 떠나면 슬금슬금. 한 번에 여럿 얼리면 '얼음 ×3!' 큰 연출.
 * 판(복도) 8개: 목표 = 아이를 문까지. 별 = ★ 문 도착 · ★ 손전등 돌리기 P번 이하(배터리 아끼기) · ★ 한 번에 K마리 얼음.
 *   실패('왁!') = 하트 -1, 그 복도를 처음부터. 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1판 현관(빛 = 얼음) → 2판 서재(책장이 빛을 막음 — 앞에서 오는 유령은 얼려서 '펑') →
 *   3판 식당(촛불: 한 번 비추면 켜져 둘레 유령을 계속 얼림 — 유령을 촛불로 꾀기) → 4판 부엌(빠른 유령: 두 칸씩 — 먼저 묶어 두기)
 *   → 5판 거울 복도(거울이 빛을 꺾음 — 모퉁이 너머 얼리기) → 6판 다락(나방 유령: 빛을 비추면 오히려 날아옴 — 빛을 피해 비추기)
 *   → 7판 지하실(어두움: 빛이 짧다 — 다가올 때까지 기다리기) → 8판 대연회장(전부).
 * 웃음: 아이는 잠옷에 고깔 잠모, 유령이 가까우면 식은땀, '펑'하면 우쭐. 실패하면 아이와 유령이 서로 '왁!' 놀라 함께 데굴.
 *   벽의 초상화 눈알이 아이를 따라 굴러가고, 장식장 위 검은 고양이는 큰 얼음에 털을 세우며 폴짝.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.56;
/** 복도 격자 (0행 = 문 쪽 뒤, 8행 = 아이가 출발하는 앞) */
export const COLS = 7, ROWS = 9, NC = COLS * ROWS;
/** 8방향: 0 위 · 1 오른쪽 위 · 2 오른쪽 · … · 7 왼쪽 위 */
const DX = [0, 1, 1, 1, 0, -1, -1, -1], DY = [-1, -1, 0, 1, 1, 1, 0, -1];
/** 빛 원뿔: 중심에서 ±HALF, 바로 옆 칸은 ±NEAR까지(손전등 번짐). 사거리 RANGE(어두운 방 DARK) · 거울에서 꺾인 빛줄기 BEAM칸 */
const HALF = (34 * Math.PI) / 180, NEAR = (46 * Math.PI) / 180, RANGE = 3.2, DARK = 2.3, BEAM = 5;
/** 한 턴 연출 길이(틱) · 판 카드 · 결과 */
const BUSY = 24, CARD_T = 120, RESULT_OK = 190, RESULT_FAIL = 170, NEWS_T = 190;
const STAR_PTS = 100, BAT_PTS = 10, POP_PTS = 15, WIN_PTS = 300;

const NORMAL = 0, FAST = 1, MOTH = 2;

export interface StageDef {
  key: string; name: string; emoji: string; news: string; tip: string;
  /** 판 모양 여럿(시드로 하나 + 좌우 뒤집기). 9줄 × 7칸: . 바닥 · # 가구 · K 출발 · D 문 · g 유령 · f 빠른 유령 · m 나방 유령 · c 촛불 · / \ 거울.
   *  par = ★ 손전등 돌리기 한도(내다보기 봇이 ★3을 딴 최소 횟수), 배터리 = par + 2 */
  maps: { m: string[]; par: number; bat?: number }[];
  /** K에서 문까지 걷는 길 (U D L R) */
  path: string;
  K: number; dark?: boolean;
}

export const STAGES: StageDef[] = [
  {
    key: 'hall', name: '현관', emoji: '🚪', news: '', tip: '빛이 닿은 유령은 얼음! 한 번에 셋 얼리면 ★',
    maps: [{ m: ['...D...', '.......', '.......', '.......', '.......', '.......', '.......', '......g', '...K.gg'], par: 1, bat: 6 }],
    path: 'UUUUUUUU', K: 3,
  },
  {
    key: 'library', name: '서재', emoji: '📚', news: '📚 책장은 빛을 막아요 — 뒤돌아 비추면 줄줄이 얼음!', tip: '앞길을 막을 유령부터, 마지막엔 뒤를 비춰요',
    maps: [
      { m: ['#..D..#', '.......', '.#...#.', '.g.....', '......g', '.#...#.', '......g', '.......', '...K...'], par: 1, bat: 5 },
      { m: ['#..D..#', '.......', '.#...#.', '.....g.', '.......', 'g#...#.', '......g', '.......', '...K...'], par: 1, bat: 5 },
    ],
    path: 'UUUUUUUU', K: 2,
  },
  {
    key: 'candle', name: '식당', emoji: '🕯️', news: '🕯️ 촛불을 비추면 켜져요 — 둘레의 유령은 계속 얼음', tip: '촛불 둘레로 유령을 꾀어요',
    maps: [
      { m: ['..D....', '.g.....', '.....g.', '.c...c.', '......g', '..g....', '.......', '.......', '....K..'], par: 3 },
      { m: ['..D....', '.g.....', '.....g.', '.c...c.', '.g.....', '.....g.', '.......', '.......', '....K..'], par: 3 },
    ],
    path: 'UUUUULLUUU', K: 3,
  },
  {
    key: 'fast', name: '부엌', emoji: '💨', news: '💨 빠른 유령 — 빛 밖에선 두 칸씩 와요!', tip: '빠른 유령부터 묶어 둬요',
    maps: [
      { m: ['....D..', '.....f.', '....g..', '..#..#.', '.......', '.......', '.#..g#.', '....g..', '..K....'], par: 3 },
      { m: ['g...D..', '.......', '..f.g..', '..#..#.', '.......', '.......', '.#...#.', '.....g.', '..K....'], par: 3 },
    ],
    path: 'UURRUUUUUU', K: 2,
  },
  {
    key: 'mirror', name: '거울 복도', emoji: '🪞', news: '🪞 거울에 닿은 빛은 꺾여 한 줄로 뻗어요', tip: '거울을 비추면 기둥 너머가 얼어요',
    maps: [
      { m: ['.g.D..g', '.#...#.', '.#...#.', '.#...#g', '\\....g/', '.......', '.......', '.......', '...K...'], par: 2 },
      { m: ['...D...', '.#g..#.', '.#...#.', '.#...#g', '\\...../', '.......', '.....gg', '.......', '...K...'], par: 2 },
    ],
    path: 'UUUUUUUU', K: 2,
  },
  {
    key: 'moth', name: '다락', emoji: '🦋', news: '🦋 나방 유령은 빛을 비추면 오히려 날아와요!', tip: '나방은 어둠 속에 두면 꾸벅 — 걸어가면 펑',
    maps: [
      { m: ['.D.....', '..g....', '.......', '.....g.', '...#...', '......m', '......g', '.......', '.....K.'], par: 3 },
      { m: ['.D..g..', 'g......', '.......', '.......', '...#...', '.......', '.g....m', '.......', '.....K.'], par: 3 },
    ],
    path: 'UUULLLLUUUU', K: 2,
  },
  {
    key: 'dark', name: '지하실', emoji: '🌑', news: '🌑 어두운 지하실 — 빛이 짧아요', tip: '가까이 올 때까지 기다렸다 비춰요',
    maps: [
      { m: ['...D...', '.......', '...gfg.', '...#...', '....g..', '.#...#.', '.......', '.......', '...K...'], par: 2 },
      { m: ['g..D...', '.....g.', '....g..', '...#...', '.......', '.#...#.', '....f..', '.......', '...K...'], par: 2 },
    ],
    path: 'UUULUUUURU', K: 2, dark: true,
  },
  {
    key: 'final', name: '대연회장', emoji: '🎭', news: '🎭 마지막 대연회장 — 모두 나와요!', tip: '촛불·거울·빠른 유령·나방 — 순서를 정해요',
    maps: [
      { m: ['..D....', 'g...g..', '...c...', '.......', 'f\\.#...', '.......', '.g.m...', '.......', '....K..'], par: 4 },
      { m: ['..D....', '.......', '..gc.g.', '..f....', '.\\.#...', '.......', '...m..g', '.......', '....K..'], par: 4 },
    ],
    path: 'UUULLUUUUU', K: 3,
  },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 판 만들기 ─────────────────────────────
export interface Level {
  /** 좌우 뒤집힌 판 (정확히 대칭인 갈림길에서 고르는 쪽도 뒤집는다) */
  flip: boolean;
  wall: Uint8Array;
  /** -1 없음 · 0 '/' · 1 '\' */
  mirror: Int8Array;
  /** 촛불 칸 번호(-1 없음) */
  candleAt: Int8Array;
  candles: number[];
  /** 칸마다: 이 칸을 둘레로 비추는 촛불들의 비트 */
  zone: Uint8Array;
  path: number[];
  range: number;
  bat: number; par: number; K: number;
  g0: { k: number; p: number }[];
  /** 길 위치 i·방향 d마다 손전등(+거울 빛줄기)이 닿는 칸 (i*8+d) */
  lit: Uint8Array[];
  /** 그리기용: 거울에서 꺾인 빛줄기 [거울 칸, 끝 칸] */
  beams: number[][][];
  /** 길 위치 i마다: 아이 칸까지의 걸음 수 (가구는 못 지나감) */
  dist: Int16Array[];
  /** 그리기용 가구 종류 */
  furn: Int8Array;
}

const cx = (p: number) => p % COLS, cy = (p: number) => (p / COLS) | 0;
const at = (x: number, y: number) => y * COLS + x;
const inside = (x: number, y: number) => x >= 0 && x < COLS && y >= 0 && y < ROWS;

function angDiff(a: number, b: number) {
  let d = Math.abs(a - b) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return d;
}

/** 아이 칸 k에서 칸 q까지 빛이 막힘 없이 닿나 (가구 칸을 지나면 막힘, 모서리를 정확히 스치면 양쪽 중 하나라도 막히면 막힘 — 좌우 대칭) */
function los(L: Level, k: number, q: number) {
  const kx = cx(k), ky = cy(k), dx = cx(q) - kx, dy = cy(q) - ky;
  for (let s = 1; s < 12; s++) {
    const X12 = 12 * kx + dx * s, Y12 = 12 * ky + dy * s;
    const xs = ((X12 % 12) + 12) % 12 === 6 ? [Math.floor(X12 / 12), Math.ceil(X12 / 12)] : [Math.round(X12 / 12)];
    const ys = ((Y12 % 12) + 12) % 12 === 6 ? [Math.floor(Y12 / 12), Math.ceil(Y12 / 12)] : [Math.round(Y12 / 12)];
    for (const x of xs)
      for (const y of ys) {
        if (!inside(x, y)) continue;
        const c = at(x, y);
        if (c !== q && c !== k && L.wall[c]) return false;
      }
  }
  return true;
}

function coneOf(L: Level, k: number, d: number) {
  const out: number[] = [];
  const kx = cx(k), ky = cy(k), a0 = Math.atan2(DY[d], DX[d]);
  for (let q = 0; q < NC; q++) {
    if (q === k) continue;
    const dx = cx(q) - kx, dy = cy(q) - ky, dist = Math.hypot(dx, dy);
    if (dist > L.range + 1e-9) continue;
    const df = angDiff(Math.atan2(dy, dx), a0);
    if (Math.max(Math.abs(dx), Math.abs(dy)) === 1 ? df > NEAR + 1e-9 : df > HALF + 1e-9) continue;
    if (!los(L, k, q)) continue;
    out.push(q);
  }
  return out;
}

export function buildLevel(d: StageDef, li: number, flip: boolean): Level {
  const lay = d.maps[li];
  const L: Level = {
    flip, wall: new Uint8Array(NC), mirror: new Int8Array(NC).fill(-1), candleAt: new Int8Array(NC).fill(-1), candles: [], zone: new Uint8Array(NC),
    path: [], range: d.dark ? DARK : RANGE, bat: lay.bat ?? lay.par + 2, par: lay.par, K: d.K, g0: [], lit: [], beams: [], dist: [], furn: new Int8Array(NC).fill(-1),
  };
  let start = -1;
  for (let y = 0; y < ROWS; y++)
    for (let x0 = 0; x0 < COLS; x0++) {
      const x = flip ? COLS - 1 - x0 : x0, ch = lay.m[y][x0], p = at(x, y);
      if (ch === '#') (L.wall[p] = 1), (L.furn[p] = (x0 * 7 + y * 13 + d.key.length * 3) % 5);
      else if (ch === '/' || ch === '\\') (L.wall[p] = 1), (L.mirror[p] = (ch === '/') !== flip ? 0 : 1);
      else if (ch === 'c') (L.wall[p] = 1), (L.candleAt[p] = L.candles.length), L.candles.push(p);
      else if (ch === 'K') start = p;
      else if (ch === 'g') L.g0.push({ k: NORMAL, p });
      else if (ch === 'f') L.g0.push({ k: FAST, p });
      else if (ch === 'm') L.g0.push({ k: MOTH, p });
    }
  // 길
  L.path.push(start);
  let x = cx(start), y = cy(start);
  for (const m of d.path) {
    let dx = m === 'L' ? -1 : m === 'R' ? 1 : 0;
    if (flip) dx = -dx;
    x += dx;
    y += m === 'U' ? -1 : m === 'D' ? 1 : 0;
    L.path.push(at(x, y));
  }
  for (const p of L.path) if (L.wall[p]) throw new Error(`${d.key}: 길이 가구를 지나요 ${cx(p)},${cy(p)}`);
  // 촛불 둘레
  L.candles.forEach((c, ci) => {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const xx = cx(c) + dx, yy = cy(c) + dy;
        if ((dx || dy) && inside(xx, yy) && !L.wall[at(xx, yy)]) L.zone[at(xx, yy)] |= 1 << ci;
      }
  });
  // 길 위치마다 빛·거리 미리 계산
  for (let i = 0; i < L.path.length; i++) {
    const k = L.path[i];
    for (let dd = 0; dd < 8; dd++) {
      const m = new Uint8Array(NC), bl: number[][] = [];
      for (const q of coneOf(L, k, dd)) {
        m[q] = 1;
        if (L.mirror[q] < 0) continue;
        // 거울: 들어온 축 방향을 90° 꺾어 한 줄로
        const vx = cx(q) - cx(k), vy = cy(q) - cy(k);
        if (Math.abs(vx) === Math.abs(vy)) continue;
        const sx = Math.abs(vx) > Math.abs(vy) ? Math.sign(vx) : 0, sy = Math.abs(vy) > Math.abs(vx) ? Math.sign(vy) : 0;
        const ox = L.mirror[q] === 0 ? -sy : sy, oy = L.mirror[q] === 0 ? -sx : sx;
        let bx = cx(q), by = cy(q), end = q;
        for (let n = 0; n < BEAM; n++) {
          bx += ox;
          by += oy;
          if (!inside(bx, by)) break;
          const c = at(bx, by);
          m[c] = 1;
          end = c;
          if (L.wall[c]) break;
        }
        if (end !== q) bl.push([q, end]);
      }
      L.lit[i * 8 + dd] = m;
      L.beams[i * 8 + dd] = bl;
    }
    const dist = new Int16Array(NC).fill(999), qu = [k];
    dist[k] = 0;
    for (let h = 0; h < qu.length; h++) {
      const p = qu[h];
      for (const [ddx, ddy] of NB4) {
        const xx = cx(p) + ddx, yy = cy(p) + ddy;
        if (!inside(xx, yy)) continue;
        const q = at(xx, yy);
        if (L.wall[q] || dist[q] <= dist[p] + 1) continue;
        dist[q] = dist[p] + 1;
        qu.push(q);
      }
    }
    L.dist.push(dist);
  }
  return L;
}
const NB4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// ───────────────────────────── 시뮬레이션 ─────────────────────────────
export interface Gh { k: number; p: number; aw: boolean; alive: boolean }
export interface Sim { i: number; dir: number; bat: number; used: number; g: Gh[]; cand: number; best: number; pops: number; fail: number; done: boolean; who: number }
/** 한 턴의 기록 (연출용) */
export interface Rec { froze: number[]; woke: number[]; moved: number[][]; pops: number[]; lit: number[]; n: number; caught: number; bump: number; ignite: number[] }

export const cloneSim = (S: Sim): Sim => ({ ...S, g: S.g.map((q) => ({ ...q })) });

export function newSim(L: Level, dir0: number): Sim {
  const S: Sim = { i: 0, dir: dir0, bat: L.bat, used: 0, g: L.g0.map((q) => ({ k: q.k, p: q.p, aw: true, alive: true })), cand: 0, best: 0, pops: 0, fail: 0, done: false, who: -1 };
  shine(L, S, null);
  return S;
}

/** 빛 비추기: 원뿔·거울 빛줄기·켜진 촛불 둘레 안의 유령은 얼고(나방은 깨어나고), 나머지는 깨어난다. 손전등에 언 수를 돌려준다 */
function shine(L: Level, S: Sim, R: Rec | null) {
  const m = L.lit[S.i * 8 + S.dir];
  for (let c = 0; c < L.candles.length; c++)
    if (!((S.cand >> c) & 1) && m[L.candles[c]]) {
      S.cand |= 1 << c;
      if (R) R.ignite.push(c);
    }
  let n = 0;
  for (let j = 0; j < S.g.length; j++) {
    const g = S.g[j];
    if (!g.alive) continue;
    const beam = m[g.p] === 1, lit = beam || (L.zone[g.p] & S.cand) !== 0;
    const was = g.aw;
    g.aw = g.k === MOTH ? lit : !lit;
    if (beam && g.k !== MOTH) n++;
    if (R) {
      if (beam && g.k !== MOTH) R.lit.push(j);
      if (was && !g.aw) R.froze.push(j);
      if (!was && g.aw) R.woke.push(j);
    }
  }
  return n;
}

function occupied(S: Sim, q: number, me: number) {
  for (let j = 0; j < S.g.length; j++) if (j !== me && S.g[j].alive && S.g[j].p === q) return true;
  return false;
}

/** 유령 한 칸: 아이까지 걸음 수가 줄어드는 칸 중 (아이 쪽 · 더 먼 축 · 세로 · 가운데 쪽) 순으로 — 좌우 대칭 */
function ghostStep(L: Level, S: Sim, j: number, dist: Int16Array, k: number) {
  const g = S.g[j], x = cx(g.p), y = cy(g.p), kx = cx(k), ky = cy(k), cur = dist[g.p];
  let best = -1, bs = -1e9;
  for (const [dx, dy] of NB4) {
    const xx = x + dx, yy = y + dy;
    if (!inside(xx, yy)) continue;
    const q = at(xx, yy);
    if (L.wall[q] || dist[q] >= cur || occupied(S, q, j)) continue;
    const toward = (dx && Math.sign(dx) === Math.sign(kx - x)) || (dy && Math.sign(dy) === Math.sign(ky - y)) ? 1 : 0;
    const gap = dy ? Math.abs(ky - y) : Math.abs(kx - x);
    const sc = toward * 100 + gap * 10 + (dy ? 1 : 0) + (dx && Math.sign(dx) === Math.sign(3 - x) ? 0.5 : 0) + (dx === (L.flip ? -1 : 1) ? 0.25 : 0);
    if (sc > bs) (bs = sc), (best = q);
  }
  return best;
}

/** 한 턴: 걷기 → 비추기 → 다가오기. d = 비출 방향 (지금과 다르면 배터리 1칸) */
export function turn(L: Level, S: Sim, d: number, R: Rec | null = null) {
  if (d !== S.dir) (S.bat--, S.used++, (S.dir = d));
  S.i++;
  const k = L.path[S.i];
  for (let j = 0; j < S.g.length; j++) {
    const g = S.g[j];
    if (!g.alive || g.p !== k) continue;
    if (g.aw) {
      S.fail = 1;
      S.who = j;
      if (R) R.bump = j;
      return;
    }
    g.alive = false;
    S.pops++;
    if (R) R.pops.push(j);
  }
  if (S.i === L.path.length - 1) return void (S.done = true);
  const n = shine(L, S, R);
  if (R) R.n = n;
  if (n > S.best) S.best = n;
  const dist = L.dist[S.i], ord: number[] = [];
  for (let j = 0; j < S.g.length; j++) if (S.g[j].alive && S.g[j].aw) ord.push(j);
  ord.sort((a, b) => dist[S.g[a].p] - dist[S.g[b].p] || a - b);
  for (const j of ord) {
    const g = S.g[j], steps = g.k === FAST ? 2 : 1;
    for (let st = 0; st < steps; st++) {
      const q = ghostStep(L, S, j, dist, k);
      if (q < 0) break;
      if (R) R.moved.push([j, g.p, q]);
      g.p = q;
      if (q === k) {
        S.fail = 2;
        S.who = j;
        if (R) R.caught = j;
        return;
      }
    }
  }
}

export const starsOf = (L: Level, S: Sim) => (S.done ? 1 + (S.used <= L.par ? 1 : 0) + (S.best >= L.K ? 1 : 0) : 0);

// ───────────────────────────── 내다보기 (잘하는 봇) ─────────────────────────────
interface Node { S: Sim; up: Node | null; d: number; h: number }
function heur(L: Level, S: Sim) {
  let v = (S.best >= L.K ? 5000 : S.best * 900) + (S.used <= L.par ? 2600 : 0) - S.used * 160 + S.pops * 120;
  const dist = L.dist[S.i];
  for (const g of S.g) {
    if (!g.alive) continue;
    const dd = dist[g.p];
    if (g.aw) v -= dd <= 1 ? 700 : dd <= 2 ? 260 : dd <= 3 ? 70 : 0;
  }
  return v;
}
const finalV = (L: Level, S: Sim) => starsOf(L, S) * 100000 + S.bat * 1000 + S.pops * 100;
function keyOf(L: Level, S: Sim) {
  let k = `${S.dir}${S.bat}${Math.min(S.best, L.K)}${S.cand}`;
  for (const g of S.g) k += g.alive ? String.fromCharCode(48 + g.p * 2 + (g.aw ? 1 : 0)) : '_';
  return k;
}
/** 끝(문)까지 빔 탐색: 남은 턴의 방향 목록. 문에 못 가면 가장 오래 버티는 길 */
export function solve(L: Level, S0: Sim, W = 260): { seq: number[]; v: number } {
  let beam: Node[] = [{ S: S0, up: null, d: -1, h: 0 }];
  const turns = L.path.length - 1 - S0.i;
  let best: Node | null = null, bv = -Infinity, last: Node = beam[0];
  for (let step = 0; step < turns && beam.length; step++) {
    const next = new Map<string, Node>();
    for (const n of beam) {
      for (let d = 0; d < 8; d++) {
        if (d !== n.S.dir && n.S.bat <= 0) continue;
        const S = cloneSim(n.S);
        turn(L, S, d);
        if (S.fail) continue;
        const node: Node = { S, up: n, d, h: 0 };
        if (S.done) {
          const v = finalV(L, S);
          if (v > bv) (bv = v), (best = node);
          continue;
        }
        node.h = heur(L, S);
        const key = keyOf(L, S), o = next.get(key);
        if (!o || o.h < node.h) next.set(key, node);
      }
    }
    beam = [...next.values()].sort((a, b) => b.h - a.h).slice(0, W);
    if (beam.length) last = beam[0];
  }
  const end = best ?? last, seq: number[] = [];
  for (let n: Node | null = end; n && n.up; n = n.up) seq.unshift(n.d);
  return { seq, v: best ? bv : -1 };
}

/** 버릇: 가장 가까운 유령 쪽으로 (배터리가 없으면 그대로) */
export function habitDir(L: Level, S: Sim) {
  const k = L.path[Math.min(S.i + 1, L.path.length - 1)];
  let bd = 1e9, bj = -1;
  S.g.forEach((g, j) => {
    if (!g.alive) return;
    const d = Math.hypot(cx(g.p) - cx(k), cy(g.p) - cy(k));
    if (d > 0 && d < bd) (bd = d), (bj = j);
  });
  if (bj < 0) return S.dir;
  const g = S.g[bj], a = Math.atan2(cy(g.p) - cy(k), cx(g.p) - cx(k));
  const d = (((Math.round(a / (Math.PI / 4)) + 2) % 8) + 8) % 8;
  return d !== S.dir && S.bat <= 0 ? S.dir : d;
}

// ───────────────────────────── 게임 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; n?: number }
export interface GhostState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result'; pt: number;
  flips: boolean[]; lays: number[]; L: Level; S: Sim; S0: Sim;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number; again: boolean;
  down: boolean; aim: { x: number; y: number } | null; busy: number; lastTurn: number; firstTap: boolean;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; events: Ev[];
  /** 연출: 지난 턴의 아이·유령 자리와 기록 */
  kidFrom: number; gFrom: number[]; dirFrom: number; rec: Rec | null; recT: number; bigT: number; catT: number;
}

const ev = (s: GhostState, kind: string, x: number, y: number, text?: string, n?: number) => s.events.push({ t: s.t, kind, x, y, text, n });
function see(s: GhostState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
}

export function firstDir(L: Level) {
  const a = L.path[0], b = L.path[1];
  const dx = cx(b) - cx(a), dy = cy(b) - cy(a);
  return dy < 0 ? 0 : dx > 0 ? 2 : dy > 0 ? 4 : 6;
}

function newStage(s: GhostState) {
  const d = STAGES[s.stage];
  s.L = buildLevel(d, s.lays[s.stage], s.flips[s.stage]);
  s.S = newSim(s.L, firstDir(s.L));
  s.S0 = cloneSim(s.S);
  s.phase = 'play';
  s.pt = 0;
  s.busy = 0;
  s.lastTurn = s.t;
  s.kidFrom = s.L.path[0];
  s.gFrom = s.S.g.map((g) => g.p);
  s.dirFrom = s.S.dir;
  s.rec = null;
  s.starOk = [false, false, false];
  if (d.key) s.seen.add(d.key);
}

// ───────────────────────────── 화면 배치 (가로 0~1, 세로 0~A) ─────────────────────────────
const BX0 = 0.04, BX1 = 0.96, BY0 = 0.2, CH = 0.112;
const CW = (BX1 - BX0) / COLS, BY1 = BY0 + CH * ROWS;
export const cellX = (c: number) => BX0 + (c + 0.5) * CW;
export const cellY = (r: number) => BY0 + (r + 0.5) * CH;
const BAND = 1.255;
/** 화면 점 → 아이(다음 칸) 기준 8방향. 아이 바로 위(가까이)면 -1 = 그대로 */
function dirFrom(s: GhostState, x: number, y: number) {
  const k = s.L.path[Math.min(s.S.i + 1, s.L.path.length - 1)];
  const gx = (x - cellX(cx(k))) / CW, gy = (y - cellY(cy(k))) / CH;
  if (Math.hypot(gx, gy) < 0.42) return -1;
  return (((Math.round(Math.atan2(gy, gx) / (Math.PI / 4)) + 2) % 8) + 8) % 8;
}

function act(s: GhostState, x: number, y: number) {
  if (s.phase !== 'play' || s.busy > 0 || s.pt < 30) return;
  if (y < 0.085) return;
  let d = dirFrom(s, x, y);
  if (d < 0) d = s.S.dir;
  const L = s.L, S = s.S;
  if (d !== S.dir && S.bat <= 0) {
    const k = L.path[S.i];
    return void ev(s, 'nope', cellX(cx(k)), cellY(cy(k)) - 0.09, '🔋 없음! 지금 방향을 톡');
  }
  s.kidFrom = L.path[S.i];
  s.gFrom = S.g.map((g) => g.p);
  s.dirFrom = S.dir;
  const R: Rec = { froze: [], woke: [], moved: [], pops: [], lit: [], n: 0, caught: -1, bump: -1, ignite: [] };
  const rot = d !== S.dir;
  turn(L, S, d, R);
  s.rec = R;
  s.recT = s.t;
  s.busy = BUSY;
  s.lastTurn = s.t;
  s.firstTap = true;
  const k = L.path[S.i], kx = cellX(cx(k)), ky = cellY(cy(k));
  if (rot) ev(s, 'rot', kx, ky, '🔋-1');
  if (R.froze.length || R.lit.length) see(s, 'light', '🔦 빛이 닿은 유령은 얼음! 빛 밖의 유령만 다가와요');
  if (R.n >= 2) {
    ev(s, 'multi', kx, ky - 0.1, `얼음 ×${R.n}!`, R.n);
    see(s, 'multi', '❄️ 한 번에 여럿 얼리면 ★ — 유령을 한쪽으로 모아요');
    if (R.n >= 3) s.bigT = s.t;
  }
  for (const j of R.pops) {
    ev(s, 'pop', kx, ky, ['펑!', '화들짝 펑!', '뿅!'][(s.t + j) % 3]);
    see(s, 'pop', '💥 얼어 있는 유령에게 걸어가면 펑! 사라져요');
  }
  for (const c of R.ignite) {
    const p = L.candles[c];
    ev(s, 'ignite', cellX(cx(p)), cellY(cy(p)), '촛불 켜짐!');
  }
  for (const j of R.froze) {
    const g = S.g[j];
    ev(s, 'freeze', cellX(cx(g.p)), cellY(cy(g.p)), g.k === MOTH ? '꾸벅…' : ['얼음!', '꽁꽁!', '얼음!!', '딱!'][(j + s.t) % 4]);
  }
  for (const j of R.woke) {
    const g = S.g[j];
    if (g.k === MOTH) ev(s, 'moth', cellX(cx(g.p)), cellY(cy(g.p)), '빛이다~!');
  }
  if (S.fail) return endStage(s, false, S.fail === 1 ? '유령에게 콩 부딪혔어요' : '유령이 왁!');
  if (S.done) return endStage(s, true, '');
}

function endStage(s: GhostState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  const L = s.L, S = s.S, k = L.path[S.i];
  if (ok) {
    s.starOk = [true, S.used <= L.par, S.best >= L.K];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + S.bat * BAT_PTS + S.pops * POP_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', cellX(cx(k)), cellY(cy(k)), s.won ? '저택 탈출! 🏠' : '문 도착!');
  } else {
    s.hearts--;
    s.tries++;
    s.catT = s.t;
    ev(s, 'fail', cellX(cx(k)), cellY(cy(k)), '왁!!');
  }
}

export const ghostlight: GameDef<GhostState> = {
  id: 'ghostlight',
  name: '손전등 유령 복도',
  genes: ['freezegaze', 'pointer', 'turnbased'],
  twist: '아이는 스스로 한 칸씩 걷고 나는 "어디를 비출지"만 정한다 — 빛 원뿔 안의 유령은 웃긴 자세로 얼고 빛 밖의 유령만 다가오며, 얼어 있는 유령에게 걸어가면 펑 사라진다. 손전등을 돌릴 때마다 배터리가 줄어, 어느 유령을 언제 얼려 둘지가 순서 싸움이 된다',
  rules: ['톡한 쪽으로 손전등을 비춰요 — 빛이 닿은 유령은 얼음! 얼어 있는 유령에게 걸어가면 펑!', '빛 밖의 유령은 한 칸씩 다가와요(닿으면 왁!). 아이를 문까지 데려가면 성공.'],
  controls: 'touch',
  hint: '비출 쪽을 톡! (꾹 누르면 미리 보기) / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '한밤의 저택 복도 디오라마 — 손전등을 든 잠옷 아이',
    mood: '달빛이 스미는 보랏빛 저택 복도, 삐걱이는 나무 마루에 붉은 카펫 길. 손전등의 따뜻한 노란 원뿔이 어둠을 가르면 하얀 이불 유령들이 한 발 든 채 혀를 내밀고 얼어붙는다. 벽의 초상화 눈알이 굴러가고 검은 고양이가 장식장 위에서 구경한다.',
    palette: { bg: '#171230', ink: '#fff6e8', muted: '#b9acd6', accent: '#ffd45a', hot: '#ff6b7a', soft: '#e8defc' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const flips = STAGES.map(() => rng() < 0.5), lays = STAGES.map((d) => Math.floor(rng() * d.maps.length));
    const s = {
      rng, seed, t: 0, stage: 0, phase: 'play', pt: 0, flips, lays,
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, ok: false, why: '', won: false, dead: false, tries: 0, again: false,
      down: false, aim: null, busy: 0, lastTurn: 0, firstTap: false,
      seen: new Set<string>(), newsQ: [], news: null, events: [], kidFrom: 0, gFrom: [], dirFrom: 0, rec: null, recT: -99, bigT: -999, catT: -999,
    } as unknown as GhostState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null;
    if (p) (s.down = true), (s.aim = { x: p.x, y: p.y * A });
    else if (s.down) {
      s.down = false;
      if (s.aim) act(s, s.aim.x, s.aim.y);
      s.aim = null;
    }
    s.t++;
    s.pt++;
    if (s.busy > 0) s.busy--;
    if (s.events.length > 40 || (s.events.length && s.t - s.events[0].t > 200)) s.events = s.events.filter((e) => s.t - e.t < 200);
    if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
    if (s.phase === 'result' && s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
      if (s.ok) {
        if (s.won) s.dead = true;
        else (s.again = false), s.stage++, newStage(s);
      } else if (s.hearts <= 0) s.dead = true;
      else (s.again = true), newStage(s);
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
/** 방향 d를 누르는 화면 점 (아이 다음 칸에서 1.6칸 떨어진 곳) */
function pointFor(s: GhostState, d: number): Input {
  const k = s.L.path[Math.min(s.S.i + 1, s.L.path.length - 1)];
  const x = cellX(cx(k)) + DX[d] * CW * 1.6, y = cellY(cy(k)) + DY[d] * CH * 1.6;
  return { tap: false, dir: 0, pointer: { x: Math.max(0.01, Math.min(0.99, x)), y: Math.max(0.1, Math.min(A - 0.01, y)) / A } };
}
const ready = (s: GhostState, think: number) => s.phase === 'play' && !s.down && s.busy <= 0 && s.pt >= 40 && s.t - s.lastTurn >= think;
const brain = new WeakMap<object, { key: string; seq: number[]; i0: number }>();
/** 봇: 판이 시작되면 문까지 모든 턴을 빔 탐색으로 내다보고(별 셋 · 배터리), 그 순서대로 비춘다 */
export const ghostlightSmart: Bot<GhostState> = {
  name: '유령 박사',
  act(s) {
    if (!ready(s, 30)) return NO;
    const key = `${s.stage}:${s.tries}`;
    let m = brain.get(s);
    if (!m || m.key !== key || s.S.i - m.i0 >= m.seq.length) brain.set(s, (m = { key, seq: solve(s.L, s.S).seq, i0: s.S.i }));
    const d = m.seq[s.S.i - m.i0] ?? s.S.dir;
    return pointFor(s, d);
  },
};
/** 버릇 봇(측정용): 늘 가장 가까운 유령 쪽으로 비춘다 */
export const ghostlightHabit: Bot<GhostState> = {
  name: '버릇: 가장 가까운 유령 쪽',
  act(s) {
    if (!ready(s, 30)) return NO;
    return pointFor(s, habitDir(s.L, s.S));
  },
};
const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number }>();
/** 봇: 아무 때나 화면 아무 데나 톡 */
export const ghostlightRandom: Bot<GhostState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 60), hold: 0, x: 0, y: 0 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 100);
    m.x = rng();
    m.y = 0.06 + rng() * 0.94;
    m.hold = 2 + Math.floor(rng() * 4);
    return { tap: false, dir: 0, pointer: { x: m.x, y: m.y } };
  },
};

