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


// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const ease = (q: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, q)), 2.2);
const lerp = (a: number, b: number, q: number) => a + (b - a) * q;
const DIR_A = DX.map((x, d) => Math.atan2(DY[d], x));

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** 미리 보기: 지금 이 방향으로 톡하면? */
interface Preview { d: number; S: Sim; R: Rec; rot: boolean }
const pvCache = new WeakMap<object, { key: string; p: Preview }>();
function preview(s: GhostState, d: number): Preview {
  const key = `${s.stage}:${s.tries}:${s.S.i}:${d}`, c = pvCache.get(s);
  if (c && c.key === key) return c.p;
  const S = cloneSim(s.S), R: Rec = { froze: [], woke: [], moved: [], pops: [], lit: [], n: 0, caught: -1, bump: -1, ignite: [] };
  const rot = d !== S.dir;
  turn(s.L, S, d, R);
  const p = { d, S, R, rot };
  pvCache.set(s, { key, p });
  return p;
}

/** 이불 유령. pose: 얼었을 때 웃긴 자세 0 한 발 들기 · 1 혀 내밀고 사팔눈 · 2 만세 · 3 볼 감싸고 으악 */
function drawGhost(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, kind: number, frozen: boolean, pose: number, t: number, lx: number, ly: number, ph: number, scared: number) {
  const moth = kind === MOTH, fast = kind === FAST;
  const bob = frozen ? 0 : Math.sin(t * 0.09 + ph) * u * 0.14;
  const lift = frozen && pose === 0 ? u * 0.12 : 0;
  // 바닥 그림자
  ctx.fillStyle = 'rgba(10,5,30,.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.15, u * (0.85 - bob / u * 0.3), u * 0.26, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y - u * 0.25 - bob - lift + scared * u * 0.2);
  if (frozen && pose === 0) ctx.rotate(-0.16);
  if (frozen && pose === 2) ctx.rotate(0.1);
  // 나방 날개 (몸 뒤)
  if (moth) {
    const fl = frozen ? 0.2 : 0.6 + 0.4 * Math.sin(t * 0.5 + ph);
    for (const sd of [-1, 1]) {
      const wg = ctx.createRadialGradient(sd * u * 0.9, -u * 1.2, u * 0.1, sd * u * 0.9, -u * 1.2, u * 0.75);
      wg.addColorStop(0, '#ffe3a8');
      wg.addColorStop(0.6, '#d9a6ff');
      wg.addColorStop(1, 'rgba(160,110,230,.6)');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.ellipse(sd * u * 0.85, -u * 1.25, u * 0.62 * fl + u * 0.15, u * 0.48, sd * 0.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(120,60,170,.55)';
      ctx.beginPath();
      ctx.arc(sd * u * 0.9, -u * 1.25, u * 0.12, 0, TAU);
      ctx.fill();
    }
  }
  // 빠른 유령 꼬리 줄
  if (fast && !frozen) {
    ctx.strokeStyle = 'rgba(255,170,120,.6)';
    ctx.lineWidth = Math.max(1.2, u * 0.08);
    for (let k = 0; k < 3; k++) {
      const yy = -u * (0.5 + k * 0.4), len = u * (0.5 + 0.25 * Math.sin(t * 0.4 + k));
      ctx.beginPath();
      ctx.moveTo(-u * 0.95, yy);
      ctx.lineTo(-u * 0.95 - len, yy);
      ctx.stroke();
    }
  }
  // 몸통 (이불): 둥근 머리 + 물결 밑단
  const top = -u * 1.85, hem = -u * 0.05;
  const body = ctx.createLinearGradient(-u, top, u, hem);
  if (frozen && !moth) {
    body.addColorStop(0, '#f2fdff');
    body.addColorStop(0.55, '#c9f0ff');
    body.addColorStop(1, '#86cdf3');
  } else if (moth) {
    body.addColorStop(0, '#fbf2ff');
    body.addColorStop(0.6, '#e2ccff');
    body.addColorStop(1, '#b391e6');
  } else if (fast) {
    body.addColorStop(0, '#fff6f0');
    body.addColorStop(0.6, '#ffd9c7');
    body.addColorStop(1, '#f0a58a');
  } else {
    body.addColorStop(0, '#ffffff');
    body.addColorStop(0.6, '#ece8ff');
    body.addColorStop(1, '#b9b2e8');
  }
  ctx.fillStyle = body;
  ctx.globalAlpha = frozen || moth ? 1 : 0.94;
  ctx.beginPath();
  ctx.moveTo(-u * 0.82, hem);
  ctx.lineTo(-u * 0.86, -u * 1.05);
  ctx.bezierCurveTo(-u * 0.9, top - u * 0.05, u * 0.9, top - u * 0.05, u * 0.86, -u * 1.05);
  ctx.lineTo(u * 0.82, hem);
  const wv = frozen ? 0 : t * 0.25 + ph;
  for (let k = 4; k >= 0; k--) {
    const xx = -u * 0.82 + (k / 4) * u * 1.64, yy = hem + (k % 2 ? -u * 0.16 : u * 0.06) + Math.sin(wv + k) * u * 0.05;
    ctx.lineTo(xx, yy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = frozen && !moth ? 'rgba(255,255,255,.95)' : 'rgba(90,70,160,.35)';
  ctx.lineWidth = frozen && !moth ? Math.max(1.5, u * 0.09) : Math.max(1, u * 0.05);
  ctx.stroke();
  // 한 발 들기: 밑단 아래 작은 발
  if (frozen && pose === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(u * 0.62, hem + u * 0.12, u * 0.2, u * 0.12, -0.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,70,160,.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // 팔
  ctx.fillStyle = frozen && !moth ? '#dff6ff' : moth ? '#eadbff' : fast ? '#ffe5d8' : '#f3f0ff';
  const arm = (ax: number, ay: number, rot: number) => {
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, u * 0.34, u * 0.15, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  };
  if (frozen && pose === 2) (arm(-u * 0.95, -u * 1.55, 1.2), arm(u * 0.95, -u * 1.55, -1.2));
  else if (frozen && pose === 3) (arm(-u * 0.5, -u * 0.95, 0.9), arm(u * 0.5, -u * 0.95, -0.9));
  else if (frozen) (arm(-u * 1.0, -u * 0.95, 0.5), arm(u * 1.05, -u * 1.2, -0.9));
  else {
    const wav = Math.sin(t * 0.2 + ph) * 0.3;
    arm(-u * 1.0, -u * 1.05, -0.4 + wav);
    arm(u * 1.0, -u * 1.05, 0.4 - wav);
  }
  // 얼굴
  const ex = lx * u * 0.12, ey = ly * u * 0.08;
  const eyeY = -u * 1.28;
  ctx.fillStyle = '#231a3a';
  if (moth && frozen) {
    // 꾸벅 졸기
    ctx.strokeStyle = '#3a2a5a';
    ctx.lineWidth = Math.max(1.2, u * 0.08);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sd * u * 0.3, eyeY, u * 0.13, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  } else if (moth) {
    // 빛에 홀린 하트 눈
    ctx.fillStyle = '#ff5c9a';
    for (const sd of [-1, 1]) {
      const hx = sd * u * 0.3, hy = eyeY;
      ctx.beginPath();
      ctx.moveTo(hx, hy + u * 0.14);
      ctx.bezierCurveTo(hx - u * 0.24, hy - u * 0.02, hx - u * 0.1, hy - u * 0.2, hx, hy - u * 0.06);
      ctx.bezierCurveTo(hx + u * 0.1, hy - u * 0.2, hx + u * 0.24, hy - u * 0.02, hx, hy + u * 0.14);
      ctx.fill();
    }
  } else if (frozen && pose === 1) {
    // 사팔눈 + 혀
    for (const [sd, dx2] of [[-1, 0.06], [1, -0.06]]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sd * u * 0.3, eyeY, u * 0.17, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#231a3a';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#231a3a';
      ctx.beginPath();
      ctx.arc(sd * u * 0.3 + dx2 * u, eyeY + u * 0.02, u * 0.08, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#2a1a3a';
    ctx.beginPath();
    ctx.ellipse(0, -u * 0.92, u * 0.2, u * 0.1, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ff7a9a';
    ctx.beginPath();
    ctx.ellipse(u * 0.06, -u * 0.8, u * 0.12, u * 0.17, 0.2, 0, TAU);
    ctx.fill();
  } else if (frozen && pose === 0) {
    // 윙크
    ctx.beginPath();
    ctx.ellipse(-u * 0.3, eyeY, u * 0.09, u * 0.13, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#231a3a';
    ctx.lineWidth = Math.max(1.2, u * 0.08);
    ctx.beginPath();
    ctx.moveTo(u * 0.18, eyeY);
    ctx.lineTo(u * 0.42, eyeY - u * 0.04);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -u * 0.95, u * 0.14, 0.1, Math.PI - 0.1);
    ctx.stroke();
  } else if (frozen) {
    // 동그란 눈 + 으악 입 (pose 2, 3)
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sd * u * 0.3, eyeY, u * 0.16, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#231a3a';
      ctx.beginPath();
      ctx.arc(sd * u * 0.3, eyeY, u * 0.07, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#2a1a3a';
    ctx.beginPath();
    ctx.ellipse(0, -u * 0.88, u * 0.13, u * (pose === 3 ? 0.22 : 0.15), 0, 0, TAU);
    ctx.fill();
  } else {
    // 깨어 있음: 아이를 노려보는 눈 + '우~' 입
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sd * u * 0.3 + ex, eyeY + ey, u * 0.11, u * 0.16, 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sd * u * 0.3 + ex + u * 0.04, eyeY + ey - u * 0.06, u * 0.04, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#2a1a3a';
    ctx.beginPath();
    ctx.ellipse(ex * 0.6, -u * 0.88, u * 0.1, u * 0.13 + Math.sin(t * 0.15 + ph) * u * 0.03, 0, 0, TAU);
    ctx.fill();
    if (fast) {
      // 빨간 두건
      ctx.fillStyle = '#ff4d4d';
      ctx.beginPath();
      ctx.moveTo(-u * 0.8, -u * 1.55);
      ctx.quadraticCurveTo(0, -u * 1.85, u * 0.8, -u * 1.55);
      ctx.lineTo(u * 0.78, -u * 1.42);
      ctx.quadraticCurveTo(0, -u * 1.68, -u * 0.78, -u * 1.42);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-u * 0.75, -u * 1.5);
      ctx.lineTo(-u * 1.25, -u * 1.65 + Math.sin(t * 0.5) * u * 0.1);
      ctx.lineTo(-u * 1.15, -u * 1.38);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (fast && frozen) {
    ctx.fillStyle = '#ff4d4d';
    ctx.fillRect(-u * 0.8, -u * 1.58, u * 1.6, u * 0.14);
  }
  // 볼 터치
  if (!moth || !frozen) {
    ctx.fillStyle = 'rgba(255,140,170,.35)';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sd * u * 0.52, -u * 1.02, u * 0.12, u * 0.07, 0, 0, TAU);
      ctx.fill();
    }
  }
  // 나방 더듬이
  if (moth) {
    ctx.strokeStyle = '#7a4fb0';
    ctx.lineWidth = Math.max(1, u * 0.06);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * u * 0.2, -u * 1.78);
      ctx.quadraticCurveTo(sd * u * 0.35, -u * 2.25, sd * u * 0.55, -u * 2.2);
      ctx.stroke();
      ctx.fillStyle = '#ffd36b';
      ctx.beginPath();
      ctx.arc(sd * u * 0.55, -u * 2.2, u * 0.1, 0, TAU);
      ctx.fill();
    }
  }
  // 얼음 결정
  if (frozen && !moth) {
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 4; k++) {
      const a = k * 1.7 + ph, rr = u * (0.95 + 0.15 * Math.sin(t * 0.1 + k));
      star(ctx, Math.cos(a) * rr, -u * 1.0 + Math.sin(a) * rr * 0.9, u * (0.1 + 0.05 * Math.sin(t * 0.2 + k * 2)));
      ctx.fill();
    }
    // 고드름
    ctx.fillStyle = 'rgba(220,248,255,.95)';
    for (const ix of [-0.5, 0.05, 0.45]) {
      ctx.beginPath();
      ctx.moveTo(u * ix - u * 0.07, hem - u * 0.04);
      ctx.lineTo(u * ix + u * 0.07, hem - u * 0.04);
      ctx.lineTo(u * ix, hem + u * 0.2);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
  if (moth && frozen) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.max(12, u * 0.6)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.8;
    ctx.fillText('z', x + u * 0.8, y - u * 2.0 - (t % 50) * u * 0.012);
    ctx.globalAlpha = 1;
  }
}

/** 잠옷 아이. mood 0 조마조마 · 1 겁먹음 · 2 우쭐 · 3 왁(실패) · 4 만세 */
function drawKid(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, la: number, mood: number, t: number, roll: number) {
  ctx.fillStyle = 'rgba(10,5,30,.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.1, u * 0.7, u * 0.22, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y - (mood === 4 ? Math.abs(Math.sin(t * 0.25)) * u * 0.35 : 0) - (mood === 3 ? u * 0.3 * Math.max(0, 1 - roll) : 0));
  if (roll > 0) ctx.rotate(roll * 1.6);
  const shake = mood === 1 ? Math.sin(t * 1.4) * u * 0.04 : 0;
  ctx.translate(shake, 0);
  // 발
  ctx.fillStyle = '#7fa6e8';
  for (const sd of [-1, 1]) {
    const step = mood === 0 ? Math.sin(t * 0.3 + (sd > 0 ? 0 : Math.PI)) * u * 0.04 : 0;
    ctx.beginPath();
    ctx.roundRect(sd * u * 0.28 - u * 0.17, -u * 0.5 + step, u * 0.34, u * 0.5, u * 0.12);
    ctx.fill();
  }
  ctx.fillStyle = '#f5e6d3';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sd * u * 0.3, -u * 0.02, u * 0.2, u * 0.1, 0, 0, TAU);
    ctx.fill();
  }
  // 잠옷 윗도리
  const pj = ctx.createLinearGradient(0, -u * 1.4, 0, -u * 0.4);
  pj.addColorStop(0, '#b5d4ff');
  pj.addColorStop(1, '#7aa3e6');
  ctx.fillStyle = pj;
  ctx.beginPath();
  ctx.roundRect(-u * 0.55, -u * 1.45, u * 1.1, u * 1.05, u * 0.35);
  ctx.fill();
  ctx.fillStyle = '#ffe27a';
  for (const [sx, sy] of [[-0.25, -1.1], [0.22, -0.75], [-0.05, -0.6]]) {
    star(ctx, sx * u, sy * u, u * 0.09);
    ctx.fill();
  }
  // 손전등 든 팔 (빛 쪽으로)
  const ax = Math.cos(la), ay = Math.sin(la) * 0.75;
  ctx.strokeStyle = '#8fb3ef';
  ctx.lineWidth = u * 0.24;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax * u * 0.25, -u * 1.05);
  ctx.lineTo(ax * u * 0.62, -u * 1.0 + ay * u * 0.5);
  ctx.stroke();
  ctx.save();
  ctx.translate(ax * u * 0.68, -u * 1.0 + ay * u * 0.55);
  ctx.rotate(Math.atan2(ay, ax));
  ctx.fillStyle = '#5b6170';
  ctx.beginPath();
  ctx.roundRect(-u * 0.12, -u * 0.1, u * 0.42, u * 0.2, u * 0.05);
  ctx.fill();
  ctx.fillStyle = '#d0d6e2';
  ctx.fillRect(u * 0.22, -u * 0.13, u * 0.12, u * 0.26);
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.ellipse(u * 0.35, 0, u * 0.05, u * 0.12, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  // 머리
  const hy = -u * 1.85;
  const sk = ctx.createRadialGradient(-u * 0.15, hy - u * 0.2, u * 0.1, 0, hy, u * 0.62);
  sk.addColorStop(0, '#ffe8d2');
  sk.addColorStop(1, '#f2c09a');
  ctx.fillStyle = sk;
  ctx.beginPath();
  ctx.arc(0, hy, u * 0.58, 0, TAU);
  ctx.fill();
  // 볼
  ctx.fillStyle = 'rgba(255,120,120,.4)';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sd * u * 0.34, hy + u * 0.16, u * 0.12, u * 0.07, 0, 0, TAU);
    ctx.fill();
  }
  // 눈
  const lx = ax * u * 0.08;
  ctx.fillStyle = '#2a1a1a';
  if (mood === 3) {
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sd * u * 0.22, hy - u * 0.04, u * 0.15, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2a1a1a';
      ctx.beginPath();
      ctx.arc(sd * u * 0.22, hy - u * 0.04, u * 0.05, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#5a1a2a';
    ctx.beginPath();
    ctx.ellipse(0, hy + u * 0.28, u * 0.16, u * 0.18, 0, 0, TAU);
    ctx.fill();
  } else if (mood === 2 || mood === 4) {
    ctx.strokeStyle = '#2a1a1a';
    ctx.lineWidth = Math.max(1.2, u * 0.08);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sd * u * 0.22 + lx, hy, u * 0.1, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(lx * 0.5, hy + u * 0.18, u * 0.17, 0.15, Math.PI - 0.15);
    ctx.stroke();
  } else {
    const big = mood === 1 ? 1.35 : 1;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sd * u * 0.22 + lx, hy - u * 0.02, u * 0.075 * big, u * 0.1 * big, 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sd * u * 0.22 + lx + u * 0.03, hy - u * 0.06, u * 0.03, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = '#2a1a1a';
    ctx.lineWidth = Math.max(1, u * 0.06);
    ctx.beginPath();
    if (mood === 1) ctx.ellipse(lx * 0.5, hy + u * 0.25, u * 0.08, u * 0.1, 0, 0, TAU);
    else {
      ctx.moveTo(lx * 0.5 - u * 0.1, hy + u * 0.24);
      ctx.quadraticCurveTo(lx * 0.5, hy + u * 0.2 + Math.sin(t * 0.2) * u * 0.03, lx * 0.5 + u * 0.1, hy + u * 0.24);
    }
    ctx.stroke();
    if (mood === 1) {
      ctx.fillStyle = '#9fe3ff';
      ctx.beginPath();
      ctx.ellipse(u * 0.55, hy - u * 0.25 + (t % 40) * u * 0.008, u * 0.07, u * 0.11, 0, 0, TAU);
      ctx.fill();
    }
  }
  // 고깔 잠모 (줄무늬 + 방울)
  ctx.save();
  ctx.translate(0, hy - u * 0.3);
  const flop = Math.sin(t * 0.08) * 0.15 + (mood === 3 ? 0.6 : 0);
  ctx.fillStyle = '#3d6fd6';
  ctx.beginPath();
  ctx.moveTo(-u * 0.6, u * 0.05);
  ctx.quadraticCurveTo(-u * 0.1, -u * 0.95, u * (0.75 + flop), -u * (0.55 - flop * 0.5));
  ctx.quadraticCurveTo(u * 0.3, -u * 0.35, u * 0.6, u * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = u * 0.1;
  for (const k of [0.3, 0.6]) {
    ctx.beginPath();
    ctx.moveTo(-u * 0.6 + k * u * 0.7, -k * u * 0.75 + u * 0.05);
    ctx.lineTo(u * 0.6 - k * u * 0.1, -k * u * 0.3 + u * 0.05);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(-u * 0.66, -u * 0.05, u * 1.32, u * 0.2, u * 0.1);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(u * (0.78 + flop), -u * (0.55 - flop * 0.5), u * 0.16, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

/** 가구 (3/4 시점 상자): 0 책장 · 1 안락의자 · 2 괘종시계 · 3 화분 · 4 서랍장 */
function drawFurn(ctx: CanvasRenderingContext2D, kind: number, x: number, y: number, cw: number, ch: number, t: number, seed: number) {
  const fw = cw * 0.86, x0 = x - fw / 2, fy = y + ch * 0.38;
  const box = (hgt: number, top: string, front: string, dep = ch * 0.62) => {
    ctx.fillStyle = 'rgba(5,2,20,.45)';
    ctx.beginPath();
    ctx.ellipse(x, fy + ch * 0.05, fw * 0.6, ch * 0.18, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = front;
    ctx.fillRect(x0, fy - hgt, fw, hgt);
    ctx.fillStyle = top;
    ctx.fillRect(x0, fy - hgt - dep * 0.5, fw, dep * 0.5);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fillRect(x0, fy - hgt - dep * 0.5, fw, 2);
  };
  if (kind === 0) {
    const hgt = ch * 1.25;
    box(hgt, '#7a4b2c', '#5a3420');
    const cols = ['#d9534f', '#f0ad4e', '#5bc0de', '#5cb85c', '#9b59b6', '#e8e1c8'];
    for (let r = 0; r < 3; r++) {
      const sy = fy - hgt + ch * 0.08 + r * (hgt - ch * 0.1) / 3, sh = (hgt - ch * 0.1) / 3 - ch * 0.06;
      ctx.fillStyle = '#3e2416';
      ctx.fillRect(x0 + fw * 0.06, sy, fw * 0.88, sh);
      let bx = x0 + fw * 0.09;
      for (let k = 0; bx < x0 + fw * 0.88; k++) {
        const bw = fw * (0.08 + 0.05 * hsh(seed * 9 + r * 5 + k)), bh = sh * (0.7 + 0.28 * hsh(seed + k * 3 + r));
        ctx.fillStyle = cols[Math.floor(hsh(seed * 3 + k + r * 7) * cols.length)];
        ctx.fillRect(bx, sy + sh - bh, Math.min(bw, x0 + fw * 0.9 - bx), bh);
        bx += bw + 1;
      }
    }
  } else if (kind === 1) {
    const hgt = ch * 0.5;
    ctx.fillStyle = 'rgba(5,2,20,.45)';
    ctx.beginPath();
    ctx.ellipse(x, fy + ch * 0.05, fw * 0.6, ch * 0.18, 0, 0, TAU);
    ctx.fill();
    // 등받이
    ctx.fillStyle = '#8e2340';
    ctx.beginPath();
    ctx.roundRect(x0 + fw * 0.08, fy - hgt - ch * 0.55, fw * 0.84, ch * 0.75, [cw * 0.25, cw * 0.25, 4, 4]);
    ctx.fill();
    ctx.fillStyle = '#b8355a';
    ctx.beginPath();
    ctx.roundRect(x0, fy - hgt, fw, hgt, 6);
    ctx.fill();
    ctx.fillStyle = '#d4527a';
    ctx.beginPath();
    ctx.roundRect(x0 + fw * 0.12, fy - hgt - ch * 0.06, fw * 0.76, ch * 0.22, 6);
    ctx.fill();
    ctx.fillStyle = '#e8c36a';
    for (const k of [0.2, 0.5, 0.8]) (ctx.beginPath(), ctx.arc(x0 + fw * k, fy - hgt - ch * 0.35, 1.6, 0, TAU), ctx.fill());
  } else if (kind === 2) {
    const hgt = ch * 1.45, nw = fw * 0.62, nx = x - nw / 2;
    ctx.fillStyle = 'rgba(5,2,20,.45)';
    ctx.beginPath();
    ctx.ellipse(x, fy + ch * 0.05, fw * 0.45, ch * 0.16, 0, 0, TAU);
    ctx.fill();
    const wg = ctx.createLinearGradient(nx, 0, nx + nw, 0);
    wg.addColorStop(0, '#4a2a18');
    wg.addColorStop(0.5, '#7b4a2a');
    wg.addColorStop(1, '#3e2214');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.roundRect(nx, fy - hgt, nw, hgt, [nw * 0.5, nw * 0.5, 3, 3]);
    ctx.fill();
    ctx.fillStyle = '#fdf3d6';
    ctx.beginPath();
    ctx.arc(x, fy - hgt + nw * 0.55, nw * 0.36, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, fy - hgt + nw * 0.55);
    ctx.lineTo(x + nw * 0.2 * Math.cos(t * 0.01), fy - hgt + nw * 0.55 + nw * 0.2 * Math.sin(t * 0.01));
    ctx.moveTo(x, fy - hgt + nw * 0.55);
    ctx.lineTo(x, fy - hgt + nw * 0.3);
    ctx.stroke();
    ctx.fillStyle = '#2a160c';
    ctx.fillRect(nx + nw * 0.2, fy - hgt * 0.55, nw * 0.6, hgt * 0.42);
    const sw = Math.sin(t * 0.06) * nw * 0.18;
    ctx.strokeStyle = '#e8c36a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, fy - hgt * 0.55);
    ctx.lineTo(x + sw, fy - hgt * 0.2);
    ctx.stroke();
    ctx.fillStyle = '#e8c36a';
    ctx.beginPath();
    ctx.arc(x + sw, fy - hgt * 0.2, nw * 0.1, 0, TAU);
    ctx.fill();
  } else if (kind === 3) {
    ctx.fillStyle = 'rgba(5,2,20,.45)';
    ctx.beginPath();
    ctx.ellipse(x, fy + ch * 0.05, fw * 0.42, ch * 0.15, 0, 0, TAU);
    ctx.fill();
    const pg = ctx.createLinearGradient(x - fw * 0.3, 0, x + fw * 0.3, 0);
    pg.addColorStop(0, '#9c4a2a');
    pg.addColorStop(1, '#c96a3a');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(x - fw * 0.32, fy - ch * 0.5);
    ctx.lineTo(x + fw * 0.32, fy - ch * 0.5);
    ctx.lineTo(x + fw * 0.24, fy);
    ctx.lineTo(x - fw * 0.24, fy);
    ctx.closePath();
    ctx.fill();
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * 0.42 + Math.sin(t * 0.03 + k) * 0.05, len = ch * (0.7 + 0.35 * hsh(seed + k));
      ctx.fillStyle = k % 2 ? '#3f8f4a' : '#56b062';
      ctx.save();
      ctx.translate(x, fy - ch * 0.52);
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath();
      ctx.ellipse(0, -len / 2, cw * 0.09, len / 2, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  } else {
    const hgt = ch * 0.75;
    box(hgt, '#6b4a8a', '#4e3368');
    ctx.fillStyle = '#3a2550';
    for (const r of [0.2, 0.58]) ctx.fillRect(x0 + fw * 0.08, fy - hgt + hgt * r, fw * 0.84, hgt * 0.32);
    ctx.fillStyle = '#e8c36a';
    for (const r of [0.36, 0.74]) (ctx.beginPath(), ctx.arc(x, fy - hgt + hgt * r, 2, 0, TAU), ctx.fill());
    // 꽃병
    ctx.fillStyle = '#9fd8ff';
    ctx.beginPath();
    ctx.ellipse(x + fw * 0.2, fy - hgt - ch * 0.2, cw * 0.09, ch * 0.16, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ff8fb1';
    ctx.beginPath();
    ctx.arc(x + fw * 0.2, fy - hgt - ch * 0.42, cw * 0.07, 0, TAU);
    ctx.fill();
  }
}

const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();

function drawAll(ctx: CanvasRenderingContext2D, s: GhostState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, L = s.L, S = s.S, d = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const cw = R(CW), chh = R(CH);
  /** 칸(소수 가능) → 화면 */
  const gx = (c: number) => X(BX0 + (c + 0.5) * CW), gy = (r: number) => Y(BY0 + (r + 0.5) * CH);
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 40 && Math.abs(q.x - x) < w * 0.22 && Math.abs(q.y - y) < size + 4); k++) y -= size + 4;
    rec.push({ x, y, t: s.t });
    if (rec.length > 14) rec.shift();
    fx.pop(Math.max(w * 0.12, Math.min(w * 0.88, x)), y, text, col, size);
  };
  // 연출 진행도
  const q = s.rec ? Math.min(1, (s.t - s.recT) / BUSY) : 1;
  const kq = ease(q / 0.55), gq = ease((q - 0.3) / 0.7);
  const kidC = L.path[S.i];
  const kidX = lerp(cx(s.kidFrom), cx(kidC), kq), kidY = lerp(cy(s.kidFrom), cy(kidC), kq);
  let da = DIR_A[S.dir] - DIR_A[s.dirFrom];
  while (da > Math.PI) da -= TAU;
  while (da < -Math.PI) da += TAU;
  const lightA = DIR_A[s.dirFrom] + da * ease(q / 0.3);
  const lit = L.lit[S.i * 8 + S.dir];
  const playing = s.phase === 'play';
  // 미리 보기
  let pv: Preview | null = null;
  if (s.down && s.aim && playing && s.busy <= 0) {
    let dd = dirFrom(s, s.aim.x, s.aim.y);
    if (dd < 0) dd = S.dir;
    if (!(dd !== S.dir && S.bat <= 0)) pv = preview(s, dd);
  }

  ctx.save();
  fx.begin(ctx);
  // ═════════ 바탕 · 뒷벽 ═════════
  ctx.fillStyle = '#120d26';
  ctx.fillRect(-10, -10, w + 20, h + 20);
  const wy0 = Y(0.085), wy1 = Y(BY0);
  const wp = ctx.createLinearGradient(0, wy0, 0, wy1);
  wp.addColorStop(0, '#2b1f4e');
  wp.addColorStop(1, '#3d2c63');
  ctx.fillStyle = wp;
  ctx.fillRect(0, wy0, w, wy1 - wy0);
  // 벽지 무늬
  ctx.fillStyle = 'rgba(255,220,255,.06)';
  for (let k = 0; k < 14; k++)
    for (let r = 0; r < 2; r++) {
      const px = X(0.036 + k * 0.072 + (r % 2) * 0.036), py = wy0 + R(0.025 + r * 0.04);
      ctx.beginPath();
      ctx.moveTo(px, py - R(0.012));
      ctx.lineTo(px + R(0.01), py);
      ctx.lineTo(px, py + R(0.012));
      ctx.lineTo(px - R(0.01), py);
      ctx.closePath();
      ctx.fill();
    }
  // 징두리 판
  ctx.fillStyle = '#2a1a30';
  ctx.fillRect(0, wy1 - R(0.03), w, R(0.03));
  ctx.fillStyle = 'rgba(255,200,150,.12)';
  ctx.fillRect(0, wy1 - R(0.03), w, 1.5);
  const doorC = cx(L.path[L.path.length - 1]);
  // 창문 + 달 (문 반대쪽)
  const winX = doorC <= 3 ? 0.8 : 0.2;
  {
    const wx = X(winX), wyy = wy0 + R(0.012), ww = R(0.12), wh = R(0.075);
    ctx.fillStyle = '#0b1838';
    ctx.fillRect(wx - ww / 2, wyy, ww, wh);
    const mg = ctx.createRadialGradient(wx + ww * 0.18, wyy + wh * 0.35, 1, wx + ww * 0.18, wyy + wh * 0.35, ww * 0.5);
    mg.addColorStop(0, 'rgba(255,250,210,.9)');
    mg.addColorStop(0.25, 'rgba(255,250,210,.55)');
    mg.addColorStop(1, 'rgba(120,140,220,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(wx - ww / 2, wyy, ww, wh);
    ctx.fillStyle = '#fff6c8';
    ctx.beginPath();
    ctx.arc(wx + ww * 0.18, wyy + wh * 0.35, R(0.014), 0, TAU);
    ctx.fill();
    // 박쥐
    const bt = (t % 600) / 600;
    if (bt < 0.3) {
      const bx = wx - ww / 2 + bt / 0.3 * ww, by = wyy + wh * (0.6 - 0.2 * Math.sin(bt * 20));
      ctx.fillStyle = '#05030f';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - R(0.012), by - R(0.006) * (1 + Math.sin(t * 0.8)));
      ctx.lineTo(bx - R(0.004), by + R(0.002));
      ctx.lineTo(bx + R(0.004), by + R(0.002));
      ctx.lineTo(bx + R(0.012), by - R(0.006) * (1 + Math.sin(t * 0.8)));
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = '#6b4a2a';
    ctx.lineWidth = R(0.008);
    ctx.strokeRect(wx - ww / 2, wyy, ww, wh);
    ctx.beginPath();
    ctx.moveTo(wx, wyy);
    ctx.lineTo(wx, wyy + wh);
    ctx.moveTo(wx - ww / 2, wyy + wh / 2);
    ctx.lineTo(wx + ww / 2, wyy + wh / 2);
    ctx.stroke();
    // 창틀 위 검은 고양이 (큰 얼음·실패에 폴짝)
    const jump = Math.max(0, 1 - (t - Math.max(s.bigT, s.catT)) / 40);
    const catx = wx + ww * 0.32, caty = wyy + wh + R(0.004) - Math.sin(jump * Math.PI) * R(0.035);
    ctx.fillStyle = '#0a0612';
    ctx.beginPath();
    ctx.ellipse(catx, caty - R(0.016), R(0.016), R(0.016), 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(catx, caty - R(0.036), R(0.012), 0, TAU);
    ctx.fill();
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(catx + sd * R(0.011), caty - R(0.042));
      ctx.lineTo(catx + sd * R(0.008), caty - R(0.056) - (jump > 0 ? R(0.006) : 0));
      ctx.lineTo(catx + sd * R(0.002), caty - R(0.046));
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = '#0a0612';
    ctx.lineWidth = R(0.005);
    ctx.beginPath();
    ctx.moveTo(catx - R(0.014), caty - R(0.006));
    ctx.quadraticCurveTo(catx - R(0.04), caty - R(0.01), catx - R(0.034), caty - R(0.04) + (jump > 0 ? -R(0.01) : Math.sin(t * 0.05) * R(0.006)));
    ctx.stroke();
    ctx.fillStyle = jump > 0 ? '#ffffff' : '#ffe14d';
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(catx + sd * R(0.005), caty - R(0.037), R(0.003) * (jump > 0 ? 1.6 : 1), R(0.004) * (jump > 0 ? 1.6 : 1), 0, 0, TAU), ctx.fill());
  }
  // 초상화 셋: 눈알이 아이를 따라 굴러간다
  {
    const spots = [0.12, 0.36, 0.64, 0.88].filter((px) => Math.abs(px - (BX0 + (doorC + 0.5) * CW)) > 0.13 && Math.abs(px - winX) > 0.13).slice(0, 2);
    const kx = X(BX0 + (kidX + 0.5) * CW), ky = Y(BY0 + (kidY + 0.5) * CH);
    const wow = t - s.bigT < 60;
    spots.forEach((px, k) => {
      const fxp = X(px), fyp = wy0 + R(0.045), fw = R(0.08), fh = R(0.07);
      ctx.fillStyle = '#c9963a';
      ctx.beginPath();
      ctx.roundRect(fxp - fw / 2 - R(0.008), fyp - fh / 2 - R(0.008), fw + R(0.016), fh + R(0.016), R(0.01));
      ctx.fill();
      ctx.fillStyle = k ? '#3a5a4a' : '#5a3a4a';
      ctx.fillRect(fxp - fw / 2, fyp - fh / 2, fw, fh);
      // 얼굴
      ctx.fillStyle = '#e8c4a0';
      ctx.beginPath();
      ctx.ellipse(fxp, fyp + R(0.006), R(0.022), R(0.026), 0, 0, TAU);
      ctx.fill();
      if (k === 0) {
        ctx.fillStyle = '#3a2a2a';
        ctx.beginPath();
        ctx.ellipse(fxp, fyp + R(0.016), R(0.018), R(0.005), 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#2a1a1a';
        ctx.fillRect(fxp - R(0.022), fyp - R(0.03), R(0.044), R(0.01));
      } else {
        ctx.fillStyle = '#c86a3a';
        ctx.beginPath();
        ctx.ellipse(fxp, fyp - R(0.022), R(0.03), R(0.016), 0, 0, TAU);
        ctx.fill();
      }
      for (const sd of [-1, 1]) {
        const ex = fxp + sd * R(0.009), ey = fyp - R(0.002);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex, ey, R(wow ? 0.007 : 0.0055), 0, TAU);
        ctx.fill();
        const a = Math.atan2(ky - ey, kx - ex);
        ctx.fillStyle = '#1a1010';
        ctx.beginPath();
        ctx.arc(ex + Math.cos(a) * R(0.003), ey + Math.sin(a) * R(0.003), R(0.0028), 0, TAU);
        ctx.fill();
      }
      if (wow) {
        ctx.fillStyle = '#3a1a1a';
        ctx.beginPath();
        ctx.ellipse(fxp, fyp + R(0.017), R(0.005), R(0.007), 0, 0, TAU);
        ctx.fill();
      }
    });
  }
  // 문 (길 끝 위 뒷벽)
  {
    const dxp = gx(doorC), dw = cw * 0.78, dh = wy1 - wy0 - R(0.008), dtop = wy1 - dh;
    const open = s.phase === 'result' && s.ok ? Math.min(1, s.pt / 30) : 0.15 + 0.05 * Math.sin(t * 0.03);
    const glow = ctx.createRadialGradient(dxp, wy1, R(0.01), dxp, wy1, R(0.22));
    glow.addColorStop(0, 'rgba(255,214,120,.55)');
    glow.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(dxp - R(0.22), wy0, R(0.44), R(0.3));
    ctx.fillStyle = '#ffd97a';
    ctx.beginPath();
    ctx.roundRect(dxp - dw / 2, dtop, dw, dh, [dw / 2, dw / 2, 0, 0]);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(dxp - dw / 2, dtop, dw, dh, [dw / 2, dw / 2, 0, 0]);
    ctx.clip();
    const dg = ctx.createLinearGradient(dxp - dw / 2, 0, dxp + dw / 2, 0);
    dg.addColorStop(0, '#6b3a1e');
    dg.addColorStop(1, '#8a4e28');
    ctx.fillStyle = dg;
    ctx.fillRect(dxp - dw / 2, dtop, dw * (1 - open * 0.85), dh);
    ctx.fillStyle = '#e8c36a';
    ctx.beginPath();
    ctx.arc(dxp - dw / 2 + dw * (1 - open * 0.85) - R(0.012), dtop + dh * 0.6, R(0.006), 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#2a160c';
    ctx.lineWidth = R(0.007);
    ctx.beginPath();
    ctx.roundRect(dxp - dw / 2, dtop, dw, dh, [dw / 2, dw / 2, 0, 0]);
    ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    font(0.03, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('출구', dxp, dtop - R(0.012) < wy0 + R(0.012) ? dtop + R(0.022) : dtop - R(0.012));
  }

  // ═════════ 바닥 (나무 마루 + 카펫 길) ═════════
  const fx0 = X(BX0), fy0 = Y(BY0), fw0 = X(BX1) - fx0, fh0 = Y(BY1) - fy0;
  // 바닥판 두께
  ctx.fillStyle = '#2a160e';
  ctx.fillRect(fx0 - R(0.01), fy0 + fh0, fw0 + R(0.02), R(0.035));
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.fillRect(fx0 - R(0.01), fy0 + fh0 + R(0.035), fw0 + R(0.02), R(0.012));
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const px = fx0 + c * cw, py = fy0 + r * chh, hv = hsh(r * 17 + c * 5);
      ctx.fillStyle = `hsl(${24 + hv * 6}, ${38 + hv * 8}%, ${28 + hv * 6 - r * 0.4}%)`;
      ctx.fillRect(px, py, cw + 0.5, chh + 0.5);
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.fillRect(px, py + chh - 1, cw, 1);
      ctx.fillRect(px + (r % 2 ? cw * 0.5 : 0), py, 1, chh);
      ctx.fillStyle = 'rgba(255,220,180,.06)';
      ctx.fillRect(px, py, cw, 1.5);
    }
  // 카펫 길
  {
    ctx.strokeStyle = '#7a1630';
    ctx.lineWidth = cw * 0.62;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    L.path.forEach((p, k) => (k ? ctx.lineTo(gx(cx(p)), gy(cy(p))) : ctx.moveTo(gx(cx(p)), gy(cy(p)))));
    ctx.stroke();
    ctx.strokeStyle = '#a82a48';
    ctx.lineWidth = cw * 0.5;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,210,120,.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([R(0.012), R(0.01)]);
    ctx.stroke();
    ctx.setLineDash([]);
    // 지나온 길은 발자국
    ctx.fillStyle = 'rgba(255,240,220,.22)';
    for (let k = 0; k < S.i; k++) {
      const p = L.path[k];
      for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(gx(cx(p)) + sd * cw * 0.09, gy(cy(p)) + sd * chh * 0.12, cw * 0.05, chh * 0.08, 0, 0, TAU), ctx.fill());
    }
  }
  // 켜진 촛불 둘레 (따뜻한 빛)
  L.candles.forEach((c, ci) => {
    if (!((S.cand >> ci) & 1)) return;
    const g = ctx.createRadialGradient(gx(cx(c)), gy(cy(c)), R(0.02), gx(cx(c)), gy(cy(c)), cw * 1.7);
    g.addColorStop(0, 'rgba(255,190,90,.5)');
    g.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(gx(cx(c)) - cw * 1.6, gy(cy(c)) - chh * 1.6, cw * 3.2, chh * 3.2);
  });
  // 어둠: 빛이 안 닿은 칸은 어둡게
  const darkA = d.dark ? 0.66 : 0.52;
  for (let p = 0; p < NC; p++) {
    if (lit[p] && !L.wall[p]) continue;
    const cz = (L.zone[p] & S.cand) !== 0;
    ctx.fillStyle = `rgba(8,4,28,${cz ? 0.12 : darkA})`;
    ctx.fillRect(fx0 + cx(p) * cw, fy0 + cy(p) * chh, cw + 0.5, chh + 0.5);
  }
  // 손전등 원뿔 (부드러운 빛)
  {
    const ox = X(BX0 + (kidX + 0.5) * CW), oy = Y(BY0 + (kidY + 0.5) * CH) - chh * 0.45;
    ctx.save();
    ctx.beginPath();
    ctx.rect(fx0, fy0, fw0, fh0);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const rr = L.range + 0.3;
    const bg = ctx.createRadialGradient(ox, oy, R(0.01), ox, oy, cw * rr);
    bg.addColorStop(0, 'rgba(255,236,150,.5)');
    bg.addColorStop(0.6, 'rgba(255,220,120,.2)');
    bg.addColorStop(1, 'rgba(255,210,100,0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    for (let k = 0; k <= 12; k++) {
      const a = lightA - HALF + (k / 12) * HALF * 2;
      ctx.lineTo(ox + Math.cos(a) * cw * rr, oy + Math.sin(a) * chh * rr);
    }
    ctx.closePath();
    ctx.fill();
    // 거울에서 꺾인 빛줄기
    for (const [m, e] of L.beams[S.i * 8 + S.dir] ?? []) {
      ctx.strokeStyle = 'rgba(255,236,160,.45)';
      ctx.lineWidth = cw * 0.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(gx(cx(m)), gy(cy(m)) - chh * 0.3);
      ctx.lineTo(gx(cx(e)), gy(cy(e)));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,250,210,.5)';
      ctx.lineWidth = cw * 0.15;
      ctx.stroke();
    }
    ctx.restore();
  }
  // 미리 보기: 비출 칸 테두리 · 다가올 칸 화살표
  if (pv) {
    const plit = L.lit[Math.min(pv.S.i, L.path.length - 1) * 8 + pv.d];
    ctx.strokeStyle = 'rgba(255,240,170,.9)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    for (let p = 0; p < NC; p++) if (plit[p] && !L.wall[p]) ctx.strokeRect(fx0 + cx(p) * cw + 2, fy0 + cy(p) * chh + 2, cw - 4, chh - 4);
    ctx.setLineDash([]);
  }

  // ═════════ 물건들 (뒤에서 앞으로) ═════════
  const items: { y: number; f: () => void }[] = [];
  for (let p = 0; p < NC; p++) {
    if (!L.wall[p]) continue;
    const x = gx(cx(p)), y = gy(cy(p));
    if (L.mirror[p] >= 0) {
      const o = L.mirror[p];
      items.push({
        y: cy(p),
        f: () => {
          ctx.fillStyle = 'rgba(5,2,20,.45)';
          ctx.beginPath();
          ctx.ellipse(x, y + chh * 0.4, cw * 0.4, chh * 0.15, 0, 0, TAU);
          ctx.fill();
          ctx.save();
          ctx.translate(x, y - chh * 0.15);
          ctx.rotate(o === 0 ? 0.65 : -0.65);
          ctx.fillStyle = '#c9963a';
          ctx.beginPath();
          ctx.ellipse(0, 0, cw * 0.2, chh * 0.62, 0, 0, TAU);
          ctx.fill();
          const mg = ctx.createLinearGradient(-cw * 0.15, -chh * 0.5, cw * 0.15, chh * 0.5);
          mg.addColorStop(0, '#e9f6ff');
          mg.addColorStop(0.5, '#9fc4e8');
          mg.addColorStop(1, '#dff0ff');
          ctx.fillStyle = mg;
          ctx.beginPath();
          ctx.ellipse(0, 0, cw * 0.15, chh * 0.54, 0, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.85)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-cw * 0.05, -chh * 0.3);
          ctx.lineTo(cw * 0.02, -chh * 0.05);
          ctx.stroke();
          ctx.restore();
          ctx.fillStyle = '#7a5a2a';
          ctx.fillRect(x - 1.5, y + chh * 0.25, 3, chh * 0.15);
        },
      });
    } else if (L.candleAt[p] >= 0) {
      const ci = L.candleAt[p], on = ((S.cand >> ci) & 1) === 1;
      items.push({
        y: cy(p),
        f: () => {
          ctx.fillStyle = 'rgba(5,2,20,.45)';
          ctx.beginPath();
          ctx.ellipse(x, y + chh * 0.4, cw * 0.42, chh * 0.15, 0, 0, TAU);
          ctx.fill();
          // 작은 탁자 + 촛대
          ctx.fillStyle = '#5a3420';
          ctx.fillRect(x - cw * 0.36, y + chh * 0.02, cw * 0.72, chh * 0.32);
          ctx.fillStyle = '#7a4b2c';
          ctx.fillRect(x - cw * 0.4, y - chh * 0.08, cw * 0.8, chh * 0.14);
          ctx.fillStyle = '#e8c36a';
          ctx.fillRect(x - cw * 0.04, y - chh * 0.42, cw * 0.08, chh * 0.36);
          ctx.fillRect(x - cw * 0.16, y - chh * 0.12, cw * 0.32, chh * 0.06);
          ctx.fillStyle = '#fff4e0';
          ctx.fillRect(x - cw * 0.06, y - chh * 0.72, cw * 0.12, chh * 0.32);
          if (on) {
            const fl = 1 + 0.12 * Math.sin(t * 0.4 + ci);
            const fg = ctx.createRadialGradient(x, y - chh * 0.85, 1, x, y - chh * 0.85, cw * 0.4);
            fg.addColorStop(0, 'rgba(255,230,140,.9)');
            fg.addColorStop(1, 'rgba(255,160,60,0)');
            ctx.fillStyle = fg;
            ctx.beginPath();
            ctx.arc(x, y - chh * 0.85, cw * 0.4, 0, TAU);
            ctx.fill();
            ctx.fillStyle = '#ffb02e';
            ctx.beginPath();
            ctx.ellipse(x, y - chh * 0.86, cw * 0.06 * fl, chh * 0.14 * fl, 0, 0, TAU);
            ctx.fill();
            ctx.fillStyle = '#fff6c0';
            ctx.beginPath();
            ctx.ellipse(x, y - chh * 0.82, cw * 0.03, chh * 0.07, 0, 0, TAU);
            ctx.fill();
          } else {
            ctx.strokeStyle = 'rgba(220,220,240,.35)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x, y - chh * 0.74);
            ctx.quadraticCurveTo(x + Math.sin(t * 0.05) * cw * 0.1, y - chh * 0.95, x, y - chh * 1.15);
            ctx.stroke();
          }
        },
      });
    } else {
      const k = L.furn[p] < 0 ? 0 : L.furn[p];
      items.push({ y: cy(p), f: () => drawFurn(ctx, k, x, y, cw, chh, t, p) });
    }
  }
  // 유령
  const kidSX = X(BX0 + (kidX + 0.5) * CW), kidSY = Y(BY0 + (kidY + 0.5) * CH);
  const u = R(0.034);
  S.g.forEach((g, j) => {
    if (!g.alive) return;
    const from = s.gFrom[j] ?? g.p;
    const ggx = lerp(cx(from), cx(g.p), gq), ggy = lerp(cy(from), cy(g.p), gq);
    const sx = X(BX0 + (ggx + 0.5) * CW), sy = Y(BY0 + (ggy + 0.5) * CH) + chh * 0.28;
    const frozen = !g.aw;
    const ddx = kidSX - sx, ddy = kidSY - sy, dl = Math.hypot(ddx, ddy) || 1;
    const failHit = s.phase === 'result' && !s.ok && S.who === j;
    items.push({
      y: ggy + 0.01,
      f: () => {
        drawGhost(ctx, sx + (failHit ? Math.sin(t * 0.6) * u * 0.3 : 0), sy, u, g.k, frozen, (j + s.stage) % 4, t, ddx / dl, ddy / dl, j * 1.7, failHit ? 1 : 0);
        if (failHit) {
          ctx.save();
          ctx.fillStyle = '#ffffff';
          font(0.05, 900);
          ctx.textAlign = 'center';
          ctx.fillText('왁!', sx, sy - u * 2.6);
          ctx.restore();
        }
      },
    });
  });
  // 아이
  {
    let mood = 0, roll = 0;
    const near = S.g.some((g) => g.alive && g.aw && Math.abs(cx(g.p) - cx(kidC)) + Math.abs(cy(g.p) - cy(kidC)) <= 2);
    if (s.phase === 'result') {
      if (s.ok) mood = 4;
      else (mood = 3), (roll = Math.min(1, Math.max(0, (s.pt - 20) / 50)));
    } else if (s.rec && s.rec.pops.length && t - s.recT < 60) mood = 2;
    else if (near) mood = 1;
    const ky = kidSY + chh * 0.28 - (kq < 1 ? Math.sin(kq * Math.PI) * chh * 0.12 : 0);
    items.push({ y: kidY + 0.02, f: () => drawKid(ctx, kidSX + roll * cw * 0.5, ky, R(0.042), lightA, mood, t, roll) });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();
  // 미리 보기 표시: 얼 유령 ❄️ · 다가올 칸 · 위험
  if (pv) {
    const P = pv;
    const kn = L.path[P.S.i];
    // 아이가 갈 칸
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.ellipse(gx(cx(kn)), gy(cy(kn)) + chh * 0.25, cw * 0.32, chh * 0.2, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    const froze = new Set<number>();
    S.g.forEach((g, j) => {
      if (!g.alive) return;
      const g2 = P.S.g[j];
      if (g2.alive && !g2.aw && g.k !== MOTH) froze.add(j);
    });
    for (const j of froze) {
      const g = S.g[j];
      ctx.fillStyle = 'rgba(160,230,255,.95)';
      ctx.beginPath();
      ctx.arc(gx(cx(g.p)), gy(cy(g.p)) - chh * 0.95, R(0.022), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      font(0.028, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('❄️', gx(cx(g.p)), gy(cy(g.p)) - chh * 0.95);
    }
    // 움직일 유령: 화살표
    const tails = new Map<number, number[]>();
    for (const [j, a, b] of P.R.moved) {
      if (!tails.has(j)) tails.set(j, [a]);
      tails.get(j)!.push(b);
    }
    for (const [j, pts] of tails) {
      const danger = P.R.caught === j;
      ctx.strokeStyle = danger ? '#ff5a6a' : 'rgba(255,255,255,.85)';
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = danger ? 3 : 2;
      ctx.beginPath();
      pts.forEach((p, k) => (k ? ctx.lineTo(gx(cx(p)), gy(cy(p))) : ctx.moveTo(gx(cx(p)), gy(cy(p)))));
      ctx.stroke();
      const e = pts[pts.length - 1], f2 = pts[pts.length - 2];
      const a = Math.atan2(gy(cy(e)) - gy(cy(f2)), gx(cx(e)) - gx(cx(f2)));
      ctx.beginPath();
      ctx.moveTo(gx(cx(e)) + Math.cos(a) * 6, gy(cy(e)) + Math.sin(a) * 6);
      ctx.lineTo(gx(cx(e)) + Math.cos(a + 2.5) * 7, gy(cy(e)) + Math.sin(a + 2.5) * 7);
      ctx.lineTo(gx(cx(e)) + Math.cos(a - 2.5) * 7, gy(cy(e)) + Math.sin(a - 2.5) * 7);
      ctx.closePath();
      ctx.fill();
    }
    // 말풍선: 결과
    const R2 = P.R;
    let msg = '', col = '#ffffff';
    if (P.S.fail) (msg = '왁! 잡혀요'), (col = '#ff8a95');
    else if (P.S.done) (msg = '문 도착!'), (col = '#ffe066');
    else if (R2.pops.length) (msg = '펑! 지나가요'), (col = '#ffe066');
    else if (R2.n >= 2) (msg = `얼음 ×${R2.n}`), (col = '#bff0ff');
    else if (R2.ignite.length) (msg = '촛불 켜짐'), (col = '#ffc070');
    else msg = froze.size ? `얼음 ${froze.size}` : '아무도 안 얼어요';
    if (P.rot) msg += '  🔋-1';
    font(0.036, 900);
    const tw = ctx.measureText(msg).width + R(0.04), bx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, gx(cx(kn)))), by = gy(cy(kn)) - chh * 1.45;
    ctx.fillStyle = 'rgba(20,12,40,.9)';
    ctx.beginPath();
    ctx.roundRect(bx - tw / 2, by - R(0.024), tw, R(0.048), R(0.024));
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg, bx, by + 1);
  }
  // NEW 스포트라이트: 판의 새 장치
  if (playing && s.pt < 200 && d.key !== 'hall' && !s.again) {
    const a = Math.min(1, s.pt / 15, (200 - s.pt) / 30);
    const spots: number[] = [];
    if (d.key === 'candle' || d.key === 'final') spots.push(...L.candles);
    if (d.key === 'mirror' || d.key === 'final') for (let p = 0; p < NC; p++) if (L.mirror[p] >= 0) spots.push(p);
    if (d.key === 'fast' || d.key === 'final') S.g.forEach((g) => g.k === FAST && spots.push(g.p));
    if (d.key === 'moth' || d.key === 'final') S.g.forEach((g) => g.k === MOTH && spots.push(g.p));
    if (d.key === 'library') for (let p = 0; p < NC; p++) if (L.furn[p] >= 0 && spots.length < 2) spots.push(p);
    ctx.globalAlpha = a;
    for (const p of spots.slice(0, 4)) {
      const pr = (t % 40) / 40;
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(gx(cx(p)), gy(cy(p)) - chh * 0.3, cw * (0.5 + pr * 0.25), 0, TAU);
      ctx.stroke();
      ctx.fillStyle = '#ff5a8a';
      ctx.beginPath();
      ctx.roundRect(gx(cx(p)) - R(0.04), gy(cy(p)) - chh * 1.25 - R(0.018), R(0.08), R(0.036), R(0.018));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      font(0.028, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NEW', gx(cx(p)), gy(cy(p)) - chh * 1.25);
    }
    ctx.globalAlpha = 1;
  }
  // 1판 첫 톡 전: 유령 쪽 손가락
  if (s.stage === 0 && !s.firstTap && playing && s.pt > 30) {
    const g = S.g.find((q2) => q2.alive);
    if (g) {
      const bob = Math.sin(t * 0.15) * R(0.012);
      ctx.fillStyle = '#ffffff';
      font(0.06, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👆', gx(cx(g.p)) - cw * 0.8, gy(cy(g.p)) + chh * 0.55 + bob);
      const pr = (t % 50) / 50;
      ctx.strokeStyle = `rgba(255,240,170,${1 - pr})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(gx(cx(g.p)) - cw * 0.5, gy(cy(g.p)), cw * (0.3 + pr * 0.6), 0, TAU);
      ctx.stroke();
    }
  }
  // 반딧불 같은 먼지
  for (let k = 0; k < 14; k++) {
    const px = hsh(k + 300), py = BY0 + ((hsh(k + 310) * (BY1 - BY0) - t * 0.0003 * (1 + (k % 3))) % (BY1 - BY0) + (BY1 - BY0)) % (BY1 - BY0);
    ctx.fillStyle = `rgba(210,200,255,${0.1 + 0.2 * Math.abs(Math.sin(t / 70 + k))})`;
    ctx.beginPath();
    ctx.arc(X(px + 0.01 * Math.sin(t / 90 + k)), Y(py), R(0.003), 0, TAU);
    ctx.fill();
  }

  // ═════════ 사건 연출 ═════════
  const last = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= last) continue;
    const x = X(e.x), y = Y(e.y);
    if (e.kind === 'freeze') (fx.burst(x, y - chh * 0.5, '#bff0ff', 10, 2.5, 2.4), say(x, y - chh * 1.2, e.text!, '#dff8ff', 14));
    if (e.kind === 'multi') {
      const n = e.n ?? 2;
      say(x, y - chh * 0.6, e.text!, '#9fe8ff', 18 + n * 4);
      fx.ring(x, y, '#bff0ff', R(0.2 + n * 0.08), 5 + n);
      fx.burst(x, y, '#ffffff', 14 + n * 8, 4 + n, 2.6);
      fx.kick(2 + n * 2);
      fx.blink('#dff8ff', 0.1 + n * 0.06);
    }
    if (e.kind === 'pop') (fx.burst(x, y - chh * 0.4, '#ffffff', 26, 4.5, 3), fx.burst(x, y - chh * 0.4, '#ffe066', 12, 3, 2.4), fx.ring(x, y - chh * 0.4, '#ffffff', R(0.12), 4), fx.kick(4), say(x, y - chh * 1.3, e.text!, '#ffe066', 20));
    if (e.kind === 'ignite') (fx.burst(x, y - chh * 0.8, '#ffb02e', 18, 3, 2.6), fx.ring(x, y, '#ffc070', cw * 1.6, 4), say(x, y - chh * 1.4, e.text!, '#ffd08a', 15));
    if (e.kind === 'moth') say(x, y - chh * 1.2, e.text!, '#ffb3e6', 14);
    if (e.kind === 'rot') say(x + cw * 0.6, y - chh * 0.2, e.text!, '#ffe9a8', 13);
    if (e.kind === 'nope') (say(x, y, e.text!, '#ffd6cc', 14), fx.kick(1.5));
    if (e.kind === 'clear') (fx.burst(x, y, '#ffe066', 40, 6, 3.2), fx.burst(w * 0.3, Y(0.5), '#ff9ec4', 30, 6, 3), fx.burst(w * 0.7, Y(0.5), '#9fe8ff', 30, 6, 3), fx.ring(x, y, '#ffe066', R(0.4), 7), fx.blink('#fff6c8', 0.22), say(x, y - chh * 1.4, e.text!, '#ffe066', 22));
    if (e.kind === 'fail') (fx.kick(10), fx.blink(th.hot, 0.25), fx.burst(x, y - chh * 0.5, '#ffffff', 30, 6, 3), say(x, y - chh * 1.8, e.text!, '#ffffff', 30));
  }
  fx.memo.t = s.t;
  ctx.restore();

  // ═════════ HUD (위 띠) ═════════
  const hb = R(0.085);
  ctx.fillStyle = 'rgba(14,9,32,.94)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.044, 900);
  const ttl = `${d.emoji} ${s.stage + 1}. ${d.name}`;
  ctx.fillText(ttl, R(0.03), hb * 0.52);
  const tw1 = ctx.measureText(ttl).width;
  font(0.034, 800);
  ctx.fillStyle = th.muted;
  ctx.fillText(` /${STAGE_COUNT}`, R(0.03) + tw1, hb * 0.56);
  ctx.textAlign = 'right';
  font(0.042, 900);
  ctx.fillStyle = '#ffd45a';
  const stt = `★ ${s.stars}/${STAGE_COUNT * 3}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.05) - ctx.measureText(stt).width, hb * 0.52);
  // 새것 알림 (뒷벽 위)
  if (s.news && s.t - s.news.t < NEWS_T && !(playing && s.pt < CARD_T)) {
    const age = s.t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.034, 900);
    ctx.textAlign = 'center';
    const tx = s.news.text, tw2 = Math.min(w - 10, ctx.measureText(tx).width + 24), by2 = Y(BY0 + 0.035) + drop;
    ctx.fillStyle = 'rgba(20,12,40,.94)';
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
  // 판 카드: 시작 · 도착 · 실패
  {
    let head = '', sub = '', nw = '', col = '#ffffff', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      if (s.ok) (head = s.won ? '저택 탈출! 🏠' : '문 도착!'), (sub = `문 ✓ · 돌리기 ${S.used}번${S.used <= L.par ? ' ✓' : ` (≤${L.par} ✗)`} · 한 번에 ${S.best}마리${S.best >= L.K ? ' ✓' : ` (${L.K} ✗)`}`), (col = '#ffd45a');
      else (head = `왁!! ${s.why}`), (sub = s.hearts > 0 ? '하트 -1 · 같은 복도 처음부터' : '끝 — 오늘 밤은 여기까지!'), (col = '#ffb3bd');
    } else if (s.pt < CARD_T) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20);
      head = s.again ? `다시! ${s.stage + 1}번째 복도 — ${d.name}` : `${s.stage + 1}번째 복도 — ${d.name}`;
      sub = `${L.path.length - 1}걸음 · 🔋${L.bat} · ★ 돌리기 ${L.par}번 이하 · 한 번에 ${L.K}마리`;
      nw = s.again ? '' : d.news;
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = Y(BY0 + (nw ? 0.12 : 0.1)), chd = nw ? 0.158 : 0.11;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(20,12,40,.94)';
      ctx.beginPath();
      ctx.roundRect(-R(0.45), -R(0.055), R(0.9), R(chd), R(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.046, 900);
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
      } else ctx.fillText(head, 0, -R(0.018), R(0.84));
      ctx.fillStyle = '#fff6e8';
      font(0.034, 800);
      ctx.fillText(sub, 0, R(0.028), R(0.86));
      if (nw) {
        ctx.fillStyle = '#ffe9a8';
        font(0.034, 900);
        ctx.fillText(nw, 0, R(0.074), R(0.86));
      }
      ctx.restore();
    }
  }
  // ═════════ 아래 띠: 배터리 · 별 목표 · 안내 ═════════
  {
    const ty = BAND, tb = h / w;
    const g = ctx.createLinearGradient(0, Y(ty), 0, Y(tb));
    g.addColorStop(0, 'rgba(26,16,52,.96)');
    g.addColorStop(1, 'rgba(12,8,28,.98)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, Y(ty), w, Y(tb - ty) + 4, [R(0.03), R(0.03), 0, 0]);
    ctx.fill();
    // 배터리: 칸 = 돌리기 한 번
    const r1 = Y(ty + 0.045);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff6e8';
    font(0.036, 900);
    ctx.fillText('🔦 돌리기', X(0.03), r1);
    const bx0 = X(0.27), bw = R(0.05), bh = R(0.042);
    ctx.strokeStyle = '#d8d0f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx0 - R(0.008), r1 - bh / 2 - R(0.006), L.bat * (bw + R(0.006)) + R(0.012), bh + R(0.012), R(0.01));
    ctx.stroke();
    ctx.fillStyle = '#d8d0f0';
    ctx.fillRect(bx0 + L.bat * (bw + R(0.006)) + R(0.006), r1 - bh * 0.25, R(0.01), bh * 0.5);
    for (let k = 0; k < L.bat; k++) {
      const x = bx0 + k * (bw + R(0.006)), used = k >= S.bat, inPar = k < L.bat - L.par ? false : true;
      ctx.fillStyle = used ? 'rgba(255,255,255,.08)' : S.bat <= 1 ? '#ff7a7a' : inPar ? '#8ef09a' : '#5fbf7a';
      ctx.beginPath();
      ctx.roundRect(x, r1 - bh / 2, bw, bh, R(0.006));
      ctx.fill();
    }
    // ★ 선: 여기까지 쓰면 별
    const lx = bx0 + (L.bat - L.par) * (bw + R(0.006)) - R(0.003);
    ctx.strokeStyle = '#ffd45a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, r1 - bh / 2 - R(0.012));
    ctx.lineTo(lx, r1 + bh / 2 + R(0.008));
    ctx.stroke();
    ctx.fillStyle = '#ffd45a';
    font(0.03, 900);
    ctx.textAlign = 'center';
    ctx.fillText('★', lx, r1 - bh / 2 - R(0.022));
    ctx.textAlign = 'right';
    font(0.034, 800);
    ctx.fillStyle = S.bat > 0 ? '#cfc4f0' : '#ffb3a8';
    ctx.fillText(`${L.path.length - 1 - S.i}걸음 남음`, X(0.97), r1);
    // 별 목표 셋
    const okk = s.phase === 'result' && s.ok ? s.starOk : [S.done, S.used <= L.par, S.best >= L.K];
    const bad = [s.phase === 'result' && !s.ok, S.used > L.par, false];
    const labels = ['문까지', `돌리기 ≤${L.par}`, `한 번에 ${L.K}마리 (${Math.min(S.best, L.K)})`];
    const r2 = Y(ty + 0.12), cws = [0.22, 0.3, 0.4];
    let cxs = X(0.03);
    for (let k = 0; k < 3; k++) {
      const cw2 = R(cws[k]);
      ctx.fillStyle = okk[k] ? 'rgba(255,212,90,.25)' : bad[k] ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.08)';
      ctx.beginPath();
      ctx.roundRect(cxs, r2 - R(0.026), cw2, R(0.052), R(0.026));
      ctx.fill();
      ctx.strokeStyle = okk[k] ? '#ffd45a' : bad[k] ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = okk[k] ? '#ffd45a' : bad[k] ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.6)';
      font(0.038, 900);
      ctx.textAlign = 'center';
      ctx.fillText(bad[k] ? '✗' : '★', cxs + R(0.03), r2 + R(0.002));
      ctx.fillStyle = okk[k] ? '#fff6dc' : bad[k] ? 'rgba(255,255,255,.4)' : '#efe8ff';
      font(0.034, 800);
      ctx.textAlign = 'left';
      ctx.fillText(labels[k], cxs + R(0.056), r2 + R(0.002), cw2 - R(0.064));
      cxs += cw2 + R(0.012);
    }
    // 안내 한 줄
    let hint = d.tip;
    const first = s.stage === 0 && !s.firstTap && playing;
    if (first) hint = '👆 유령 쪽을 톡! 빛이 닿으면 얼음';
    else if (pv) hint = pv.S.fail ? '그쪽은 위험해요 — 다른 쪽을 비춰요' : '떼면 한 걸음! 점선 칸이 빛, 화살표 = 다가올 유령';
    else if (s.down && playing && S.bat <= 0) hint = '🔋이 없어요 — 지금 방향 그대로만 돼요';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 복도를 지났어요! 유령들이 손을 흔들어요' : `★ ${s.got}개! 다음 복도엔 새것이 나와요`) : '꾹 누르면 누가 얼고 누가 올지 보여요';
    else if (s.stage === 0) hint = '꾹 누르고 있으면 누가 얼지 보여요 — 떼면 한 걸음';
    ctx.textAlign = 'center';
    ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
    font(first ? 0.042 : 0.036, 900);
    ctx.fillText(hint, w / 2, Y(ty + 0.2), w - R(0.05));
  }
}
