/**
 * 🧊 톡 깨는 빙판 구조대 (36라운드: 직접 만지는 물리 장난감 — 톡) — 톡 깨기 × 가리키기.
 * 손이 하는 일은 하나: 빙판을 직접 톡. 톡 한 자리는 산산조각(별 모양 파편)이 나고, 금이 그 자리에서 사방으로 달린다.
 * 규칙(결정적): 빙판은 판마다 시드로 만든 보로노이 '결'(조각 경계)로 이루어져 있다. 금은 톡 한 자리에서 결을 따라 퍼지는데,
 *   보통 결은 조금(한두 마디), 살짝 보이는 약한 결(반짝이는 선)은 끝까지 쭉, 두꺼운 얼음 결은 거의 안 퍼진다(다익스트라 예산).
 *   해안에 이어진 얼음은 그대로, 떨어져 나간 조각은 다각형 강체(뜨기·물살 끌림·부딪힘·돌기)로 물살을 따라 흐른다.
 *   펭귄이 탄 조각이 구조선에 닿으면 '쿵' 하고 펭귄들이 배에 폴짝. 조각 칸 수가 탄 무게보다 하나 많아야 버틴다(펭귄 1·물개 2·곰 2) —
 *   모자라면 기우뚱 미끄러져 퐁! 빠진 펭귄은 헤엄쳐 해안 얼음으로 돌아온다(하트 대신 별 하나가 깎임).
 * 와우: 첫 톡에 '쩍!' — 톡 한 칸이 별처럼 산산조각, 반짝이던 약한 결을 따라 금이 쩌저적 달려 펭귄을 태운 큰 조각이 풍덩 떨어져
 *   출렁이며 물살을 타고 구조선에 쿵, 펭귄들이 하나씩 폴짝.
 * 판 7개: 목표 = 펭귄을 모두 배로. 별(판마다 하나씩 늘림) = 펭귄을 모두 배로 · 아무도 물에 안 빠지기 · (판마다) 몇 번 안에 / 물개도 물에 첨벙.
 *   실패 = 톡을 다 쓰고 조각이 멈췄는데 펭귄이 남음 → 하트 -1, 같은 판 다시. 하트 셋을 다 잃거나 7판을 마치면 끝. 시간 제한 없음.
 * 펼쳐짐(하는 일이 바뀐다): 1 물살(목을 끊어 보내기) → 2 기우뚱(작은 조각은 퐁 — 넉넉하게 끊기) → 3 두꺼운 얼음(금이 막힘 — 구멍을 뚫어 잇기)
 *   → 4 물개(물개를 직접 톡 해 물에 퐁, 펭귄과 반대) → 5 빙산(큰 조각은 틈에 걸림 — 알맞게 작게) → 6 북극곰(곰과 펭귄을 다른 조각으로)
 *   → 7 소용돌이(작은 조각은 빙글빙글 꿀꺽 — 크게 끊기).
 * 웃음: 펭귄은 뒤뚱뒤뚱, 조각이 떨어지면 "오오?" 하고 날개를 퍼덕, 기우뚱하면 미끄러지며 "으아아" 퐁 — 헤엄쳐 와서 "영차".
 *   물개는 물에 빠지면 "신난다~♪" 하고 뱅글뱅글 헤엄. 해안의 아기 펭귄들이 구경하며 폴짝폴짝.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
/** 바다 평면: 가로 0~W, 세로 0~H (0 = 해안, H = 앞) */
const W = 1, H = 1.2;
/** 금: 별 모양 예산 · 두꺼운 얼음 비용 배수 · 금이 달리는 시간(멈칫) */
const CRACK_B = 0.15, THICK_K = 6, CRACK_T = 14;
/** 조각 물리: 떨어질 때 튕김 · 물 끌림 · 튕김 계수 · 잠드는 속도 */
const KICK = 0.0026, KD = 0.045, REST = 0.2, SLEEP_V = 0.00013;
const SWIM_V = 0.0042, TIP_T = 34, PANIC_T = 18, HOP_T = 20, HOP_GAP = 11, SINK_T = 60;
const RESULT_OK = 210, RESULT_FAIL = 170, BANNER_T = 160, SPOT_T = 230, SETTLE_T = 420;
const STAR_PTS = 100, CLEAR_PTS = 50, LEFT_PTS = 15, WIN_PTS = 300;

const PEN = 0, SEAL = 1, BEAR = 2;
const WEIGHT = [1, 9, 2];
/** 탄 것의 상태: 얼음 위 · 헤엄쳐 돌아옴 · 배로 폴짝 · 배 위 · 바다에서 신남(물개) */
const ON = 0, SWIM = 1, HOP = 2, BOAT = 3, SEA = 4;
const FIXED = -1, GONE = -2, LAND = -2;

interface Flow { p: number[][]; w: number; v: number }
interface StageDef {
  key: string;
  name: string;
  /** 판 카드 NEW 줄 */
  news: string;
  /** 스포트라이트 이름 */
  spot: string;
  hint: string;
  nc: number;
  nr: number;
  ice: number[][][];
  thick?: number[][][];
  faults: number[][][];
  pens: number[][];
  seal?: number[];
  bear?: number[];
  flows: Flow[];
  boat: number[];
  bergs?: number[][];
  whirl?: number[];
  taps: number;
  par: number;
  star3: '' | 'par' | 'seal';
}

const FULL = (y: number) => [[-1, -1], [2, -1], [2, y], [-1, y]];
const MAIN = (y: number): Flow => ({ p: [[-0.1, y], [0.55, y + 0.02], [0.84, y + 0.06]], w: 0.2, v: 0.0036 });
const TONGUE: Flow = { p: [[-0.1, 1.02], [0.55, 1.04], [0.84, 1.06]], w: 0.22, v: 0.0036 };

/** 판 7개. 좌표는 바다 평면(가로 0~1, 세로 0 해안 ~ 1.2 앞). 결(보로노이)은 게임 시드마다 다르게 흔들린다 */
export const STAGES: StageDef[] = [
  {
    key: 'flow', name: '첫 구조', news: '물살 — 떨어진 조각은 화살표를 따라 흘러가요', spot: '물살', hint: '반짝이는 결을 톡 하면 금이 쭉 달려요',
    nc: 7, nr: 8,
    ice: [[[-1, -1], [2, -1], [2, 0.66], [0.66, 0.66], [0.64, 1.0], [0.14, 1.0], [0.13, 0.66], [-1, 0.66]]],
    faults: [[[0.02, 0.62], [0.38, 0.63], [0.78, 0.62]], [[0.08, 0.8], [0.4, 0.79], [0.72, 0.81]]],
    pens: [[0.32, 0.87], [0.47, 0.85]],
    flows: [TONGUE],
    boat: [0.88, 1.04],
    taps: 8, par: 1, star3: '',
  },
  {
    key: 'tip', name: '기우뚱 조각', news: '기우뚱 — 펭귄보다 한 칸 넉넉해야 버텨요', spot: '작은 조각', hint: '펭귄 바로 옆을 깨면 조각이 작아요 — 넉넉하게',
    nc: 7, nr: 8,
    ice: [FULL(0.8)],
    faults: [[[0.2, 0.85], [0.22, 0.6], [0.45, 0.57], [0.66, 0.6], [0.69, 0.85]], [[0.08, 0.85], [0.1, 0.4], [0.45, 0.36], [0.8, 0.4], [0.82, 0.85]]],
    pens: [[0.32, 0.7], [0.45, 0.72], [0.58, 0.69]],
    flows: [MAIN(0.8)],
    boat: [0.88, 0.92],
    taps: 6, par: 1, star3: '',
  },
  {
    key: 'thick', name: '두꺼운 얼음', news: '두꺼운 얼음 — 금이 멈춰요 (톡 한 칸은 깨져요)', spot: '두꺼운 얼음', hint: '금이 막힌 두꺼운 칸을 직접 톡!',
    nc: 7, nr: 8,
    ice: [FULL(0.82)],
    thick: [[[0.12, 0.6], [0.38, 0.6], [0.38, 0.78], [0.12, 0.78]], [[0.62, 0.6], [0.88, 0.6], [0.88, 0.78], [0.62, 0.78]], [[-1, 0.15], [2, 0.15], [2, 0.32], [-1, 0.32]]],
    faults: [[[0.27, 0.9], [0.29, 0.48], [0.5, 0.44], [0.71, 0.48], [0.73, 0.9]]],
    pens: [[0.44, 0.7], [0.56, 0.72]],
    flows: [MAIN(0.8)],
    boat: [0.88, 0.92],
    taps: 5, par: 2, star3: 'par',
  },
  {
    key: 'seal', name: '물개 친구', news: '물개 — 함께 뜨면 조각이 뒤집혀요! 물은 좋아해요', spot: '물개', hint: '물개를 직접 톡! 물에 퐁 하면 신나요',
    nc: 7, nr: 8,
    ice: [[[-1, -1], [2, -1], [2, 0.58], [0.68, 0.6], [0.66, 0.98], [0.18, 0.98], [0.16, 0.6], [-1, 0.58]]],
    faults: [[[0.04, 0.58], [0.42, 0.6], [0.8, 0.58]]],
    pens: [[0.5, 0.87], [0.56, 0.74]],
    seal: [0.28, 0.84],
    flows: [TONGUE],
    boat: [0.88, 1.04],
    taps: 4, par: 2, star3: 'seal',
  },
  {
    key: 'berg', name: '빙산 사이', news: '빙산 — 큰 조각은 틈에 걸려요', spot: '빙산', hint: '빙산 사이 틈보다 작게, 펭귄보다 넉넉하게',
    nc: 8, nr: 10,
    ice: [FULL(0.58)],
    faults: [[[0.12, 0.62], [0.14, 0.22], [0.5, 0.2], [0.84, 0.22], [0.86, 0.62]], [[0.3, 0.62], [0.32, 0.34], [0.6, 0.33], [0.62, 0.62]]],
    pens: [[0.4, 0.44], [0.52, 0.5]],
    bergs: [[0.64, 0.66, 0.08], [0.64, 1.12, 0.1]],
    flows: [{ p: [[-0.1, 0.7], [0.45, 0.74], [0.64, 0.87], [0.84, 1.02]], w: 0.24, v: 0.0036 }],
    boat: [0.88, 1.05],
    taps: 5, par: 1, star3: 'par',
  },
  {
    key: 'bear', name: '북극곰 이웃', news: '북극곰 — 같은 조각에 뜨면 펭귄이 놀라 첨벙!', spot: '북극곰', hint: '곰과 펭귄을 먼저 갈라 놓고 떼어 내요',
    nc: 7, nr: 8,
    ice: [[[-1, -1], [2, -1], [2, 0.58], [0.74, 0.6], [0.72, 0.98], [0.12, 0.98], [0.1, 0.6], [-1, 0.58]]],
    faults: [[[0.02, 0.58], [0.42, 0.6], [0.84, 0.58]], [[0.43, 0.82], [0.44, 1.02]]],
    pens: [[0.56, 0.86], [0.62, 0.72]],
    bear: [0.27, 0.8],
    flows: [TONGUE],
    boat: [0.88, 1.04],
    taps: 5, par: 2, star3: 'par',
  },
  {
    key: 'whirl', name: '소용돌이', news: '소용돌이 — 작은 조각은 빙글빙글 꿀꺽!', spot: '소용돌이', hint: '소용돌이는 큰 조각을 못 삼켜요 — 크게 떼어 내요',
    nc: 7, nr: 8,
    ice: [FULL(0.66)],
    faults: [[[0.03, 0.72], [0.05, 0.3], [0.3, 0.27], [0.58, 0.3], [0.6, 0.72]], [[0.14, 0.72], [0.16, 0.47], [0.31, 0.45], [0.46, 0.48], [0.48, 0.72]], [[0.74, 0.72], [0.76, 0.46], [1.05, 0.42]]],
    pens: [[0.25, 0.58], [0.37, 0.6]],
    whirl: [0.5, 0.95, 0.2],
    flows: [{ p: [[-0.1, 0.7], [0.3, 0.74], [0.55, 0.8], [0.84, 0.98]], w: 0.22, v: 0.0036 }],
    boat: [0.88, 1.02],
    taps: 5, par: 1, star3: 'par',
  },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 기하: 판마다 보로노이 결 ─────────────────────────────
interface Cell {
  /** 처음 자리(바다 평면)의 다각형 [x0,y0,x1,y1,...] */
  poly: number[];
  /** 꼭짓점 번호 (공유 꼭짓점) */
  vi: number[];
  /** 변 k의 이웃 칸(-1 물·-2 해안) · 변 k의 결 번호(없으면 -1) */
  nb: number[];
  eb: number[];
  cx: number;
  cy: number;
  area: number;
  r: number;
  thick: boolean;
  anchor: boolean;
  bonds: number[];
}
interface Bond { a: number; b: number; u: number; v: number; len: number; weak: boolean; cost: number }
interface Circle { x: number; y: number; r: number }
interface Geo {
  cells: Cell[];
  vx: number[];
  vy: number[];
  bonds: Bond[];
  vb: number[][];
  flows: Flow[];
  bergs: Circle[];
  whirl: Circle | null;
  boat: Circle;
  /** 기우뚱 규칙이 켜졌나 (1판은 꺼짐) */
  tip: boolean;
  /** 펭귄 자리 [칸, dx, dy] */
  pens: number[][];
  seal: number[] | null;
  bear: number[] | null;
}

function inPoly(pts: number[][], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inFlat(p: number[], x: number, y: number) {
  let inside = false;
  const n = p.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = p[i * 2], yi = p[i * 2 + 1], xj = p[j * 2], yj = p[j * 2 + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const u = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - ax - dx * u, py - ay - dy * u);
}
function lineDist(pl: number[][], x: number, y: number) {
  let d = 9;
  for (let k = 0; k + 1 < pl.length; k++) d = Math.min(d, segDist(x, y, pl[k][0], pl[k][1], pl[k + 1][0], pl[k + 1][1]));
  return d;
}

interface V3 { x: number; y: number; l: number }
function clip(P: V3[], a: number, b: number, c: number, lab: number): V3[] {
  const out: V3[] = [];
  for (let k = 0; k < P.length; k++) {
    const p = P[k], q = P[(k + 1) % P.length];
    const dp = a * p.x + b * p.y - c, dq = a * q.x + b * q.y - c;
    if (dp <= 0) out.push(p);
    if (dp <= 0 !== dq <= 0) {
      const u = dp / (dp - dq);
      out.push({ x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u, l: dp <= 0 ? lab : p.l });
    }
  }
  return out;
}

function buildGeo(d: StageDef, rng: Rng): Geo {
  const sites: number[][] = [];
  for (let r = 0; r < d.nr; r++)
    for (let c = 0; c < d.nc; c++) {
      const x = (c + 0.5 + (r % 2 ? 0.22 : -0.22) + (rng() - 0.5) * 0.3) / d.nc;
      const y = ((r + 0.5 + (rng() - 0.5) * 0.3) * H) / d.nr;
      sites.push([Math.max(0.012, Math.min(0.988, x)), y]);
    }
  const polys: V3[][] = sites.map(([sx, sy], i) => {
    let P: V3[] = [{ x: 0, y: 0, l: LAND }, { x: W, y: 0, l: -1 }, { x: W, y: H, l: -1 }, { x: 0, y: H, l: -1 }];
    for (let j = 0; j < sites.length; j++) {
      if (j === i) continue;
      const [tx, ty] = sites[j];
      if (Math.abs(tx - sx) > 0.42 || Math.abs(ty - sy) > 0.42) continue;
      const a = tx - sx, b = ty - sy;
      P = clip(P, a, b, (a * (sx + tx)) / 2 + (b * (sy + ty)) / 2, j);
    }
    return P;
  });
  // 공유 꼭짓점
  const vx: number[] = [], vy: number[] = [];
  const vid = (x: number, y: number) => {
    for (let k = 0; k < vx.length; k++) if (Math.abs(vx[k] - x) < 1e-6 && Math.abs(vy[k] - y) < 1e-6) return k;
    vx.push(x);
    vy.push(y);
    return vx.length - 1;
  };
  const pvi = polys.map((P) => P.map((p) => vid(p.x, p.y)));
  // 결 잇기: 바랐던 선(폴리라인)을 따라가는 보로노이 변 사슬 → 약한 결
  const adj: number[][] = vx.map(() => []);
  polys.forEach((P, i) =>
    P.forEach((_, k) => {
      const u = pvi[i][k], v = pvi[i][(k + 1) % P.length];
      if (u !== v && !adj[u].includes(v)) adj[u].push(v), adj[v].push(u);
    }),
  );
  const weakSet = new Set<number>();
  const key = (u: number, v: number) => (u < v ? u * 4096 + v : v * 4096 + u);
  for (const f of d.faults) {
    const near = (x: number, y: number) => {
      let bi = 0, bd = 9;
      for (let k = 0; k < vx.length; k++) {
        const dd = Math.hypot(vx[k] - x, vy[k] - y);
        if (dd < bd) (bd = dd), (bi = k);
      }
      return bi;
    };
    const s0 = near(f[0][0], f[0][1]), s1 = near(f[f.length - 1][0], f[f.length - 1][1]);
    const dist = vx.map(() => Infinity), prev = vx.map(() => -1), done = vx.map(() => false);
    dist[s0] = 0;
    for (;;) {
      let u = -1, bd = Infinity;
      for (let k = 0; k < vx.length; k++) if (!done[k] && dist[k] < bd) (bd = dist[k]), (u = k);
      if (u < 0 || u === s1) break;
      done[u] = true;
      for (const v of adj[u]) {
        const mx = (vx[u] + vx[v]) / 2, my = (vy[u] + vy[v]) / 2, dev = lineDist(f, mx, my) / 0.03;
        const c = Math.hypot(vx[v] - vx[u], vy[v] - vy[u]) * (1 + dev * dev);
        if (dist[u] + c < dist[v]) (dist[v] = dist[u] + c), (prev[v] = u);
      }
    }
    for (let v = s1; prev[v] >= 0; v = prev[v]) weakSet.add(key(v, prev[v]));
  }
  // 얼음 칸만 남긴다
  const isIce = sites.map(([x, y]) => d.ice.some((pg) => inPoly(pg, x, y)));
  const idx: number[] = [];
  const cells: Cell[] = [];
  sites.forEach((st, i) => {
    if (!isIce[i]) return idx.push(-1);
    idx.push(cells.length);
    const P = polys[i];
    const poly: number[] = [];
    for (const p of P) poly.push(p.x, p.y);
    let ar = 0, cx = 0, cy = 0;
    for (let k = 0; k < P.length; k++) {
      const p = P[k], q = P[(k + 1) % P.length], cr = p.x * q.y - q.x * p.y;
      ar += cr;
      cx += (p.x + q.x) * cr;
      cy += (p.y + q.y) * cr;
    }
    ar /= 2;
    cells.push({
      poly, vi: pvi[i], nb: [], eb: [], cx: cx / (6 * ar), cy: cy / (6 * ar), area: Math.abs(ar), r: 0.72 * Math.sqrt(Math.abs(ar) / Math.PI),
      thick: !!d.thick?.some((pg) => inPoly(pg, st[0], st[1])), anchor: P.some((p) => p.l === LAND), bonds: [],
    });
  });
  const bonds: Bond[] = [];
  const bmap = new Map<number, number>();
  sites.forEach((_, i) => {
    const ci = idx[i];
    if (ci < 0) return;
    const P = polys[i], c = cells[ci];
    P.forEach((p, k) => {
      const j = p.l, cj = j >= 0 ? idx[j] : -1;
      c.nb.push(j >= 0 ? (cj >= 0 ? cj : -1) : j === LAND ? LAND : -1);
      if (cj < 0) return void c.eb.push(-1);
      const kk = Math.min(i, j) * 4096 + Math.max(i, j);
      let b = bmap.get(kk);
      if (b === undefined) {
        const u = pvi[i][k], v = pvi[i][(k + 1) % P.length], len = Math.hypot(vx[v] - vx[u], vy[v] - vy[u]);
        b = bonds.length;
        bmap.set(kk, b);
        const weak = weakSet.has(key(u, v)), thick = c.thick || cells[cj]?.thick || false;
        bonds.push({ a: ci, b: cj, u, v, len, weak, cost: len * (thick ? THICK_K : 1) });
      }
      c.eb.push(b);
    });
  });
  // 상대 칸의 두께는 뒤에 알게 되니 비용을 다시 잰다
  for (const b of bonds) b.cost = b.len * (cells[b.a].thick || cells[b.b].thick ? THICK_K : 1);
  bonds.forEach((b, k) => (cells[b.a].bonds.push(k), cells[b.b].bonds.push(k)));
  const vb: number[][] = vx.map(() => []);
  bonds.forEach((b, k) => (vb[b.u].push(k), vb[b.v].push(k)));
  // 해안에 닿지 않은 덩어리는 바닥에 걸린 것으로 (처음부터 떠내려가지 않게)
  const comp = components(cells.map((_, i) => i), cells, bonds, new Uint8Array(bonds.length), null);
  for (const cs of comp) if (!cs.some((i) => cells[i].anchor)) for (const i of cs) cells[i].anchor = true;
  const place = (x: number, y: number) => {
    let ci = cells.findIndex((c) => inFlat(c.poly, x, y));
    if (ci < 0) {
      let bd = 9;
      cells.forEach((c, k) => {
        const dd = Math.hypot(c.cx - x, c.cy - y);
        if (dd < bd) (bd = dd), (ci = k);
      });
    }
    const c = cells[ci], lim = c.r * 0.45;
    return [ci, Math.max(-lim, Math.min(lim, x - c.cx)), Math.max(-lim, Math.min(lim, y - c.cy))];
  };
  return {
    cells, vx, vy, bonds, vb,
    flows: d.flows,
    bergs: (d.bergs ?? []).map(([x, y, r]) => ({ x, y, r })),
    whirl: d.whirl ? { x: d.whirl[0], y: d.whirl[1], r: d.whirl[2] } : null,
    boat: { x: d.boat[0], y: d.boat[1], r: 0.085 },
    tip: d.key !== 'flow',
    pens: d.pens.map(([x, y]) => place(x, y)),
    seal: d.seal ? place(d.seal[0], d.seal[1]) : null,
    bear: d.bear ? place(d.bear[0], d.bear[1]) : null,
  };
}

/** 이어진 결(안 깨진 결)로 묶인 덩어리들. keep = 이 칸들만 본다 */
function components(list: number[], cells: Cell[], bonds: Bond[], broken: Uint8Array, owner: Int16Array | null): number[][] {
  const inSet = new Set(list);
  const seen = new Set<number>();
  const out: number[][] = [];
  for (const s0 of list) {
    if (seen.has(s0)) continue;
    const cs: number[] = [s0];
    seen.add(s0);
    for (let k = 0; k < cs.length; k++) {
      for (const b of cells[cs[k]].bonds) {
        if (broken[b]) continue;
        const bd = bonds[b], o = bd.a === cs[k] ? bd.b : bd.a;
        if (!inSet.has(o) || seen.has(o) || (owner && owner[o] === GONE)) continue;
        seen.add(o);
        cs.push(o);
      }
    }
    out.push(cs.sort((a, b) => a - b));
  }
  return out;
}

// ───────────────────────────── 시뮬레이션 상태 ─────────────────────────────
interface Piece {
  id: number;
  cells: number[];
  /** 처음 자리의 무게중심 · 지금 자리 · 각도 · 속도 · 각속도 */
  ox: number; oy: number; x: number; y: number; a: number; vx: number; vy: number; w: number;
  m: number; I: number; br: number;
  /** 회전된 칸 중심 오프셋 (틱마다) */
  rx: number[]; ry: number[];
  still: number; sleep: boolean;
  /** 배에 닿은 틱(-1 아직) · 기우뚱 시작(-1) · 곰 놀람 시작(-1) · 소용돌이에 빨림(-1) */
  dock: number; tip: number; panic: number; sink: number;
  born: number;
}
interface Rider {
  id: number; k: number; st: number; cell: number; lx: number; ly: number;
  /** 헤엄·바다·폴짝 중의 자리 */
  x: number; y: number; tc: number; hopAt: number; hx: number; hy: number; seat: number;
  // 연출
  face: number; mood: number; moodT: number;
}
interface Pending { c0: number; body: number; bx: number; by: number; bonds: number[]; times: number[]; t: number; wx: number; wy: number; weakRun: number }
interface Sim {
  t: number; geo: Geo; owner: Int16Array; broken: Uint8Array; pieces: Piece[]; riders: Rider[]; nid: number;
  falls: number; fixedVer: number; grid: number[][] | null; gridVer: number; seats: number;
}
interface Ev { t: number; kind: string; x: number; y: number; text?: string; n?: number }
interface Shard { x: number; y: number; vx: number; vy: number; a: number; w: number; pts: number[]; life: number; z: number; vz: number }

export interface IceState extends Sim {
  rng: Rng; seed: number; stage: number; phase: 'play' | 'result'; pt: number; seeds: number[];
  taps: number; used: number; lastTap: number; hearts: number; stars: number; got: number; starOk: boolean[]; pts: number;
  ok: boolean; why: string; down: boolean; pending: Pending | null; winT: number;
  seen: Set<string>; banner: { head: string; sub: string; t: number } | null; spot: { x: number; y: number; t: number; label: string; r: number } | null;
  events: Ev[]; dead: boolean; won: boolean; tries: number; again: boolean; firstTap: number; wowN: number;
  cracks: { t: number; c0: number; bx: number; by: number; body: number; bonds: number[]; times: number[] }[];
  shards: Shard[]; sealIn: boolean; slow: number;
}

const ev = (s: IceState | null, kind: string, x: number, y: number, text?: string, n?: number) => s && s.events.push({ t: s.t, kind, x, y, text, n });
function see(s: IceState | null, key: string) {
  if (!s || !key || s.seen.has(key)) return;
  s.seen.add(key);
}
function wow(s: IceState | null) {
  if (s) s.wowN++;
}

// ───────────────────────────── 조각 ─────────────────────────────
const pieceOf = (S: Sim, id: number) => {
  for (const p of S.pieces) if (p.id === id) return p;
  return null;
};
function orient(S: Sim, p: Piece) {
  const ca = Math.cos(p.a), sa = Math.sin(p.a), C = S.geo.cells;
  for (let k = 0; k < p.cells.length; k++) {
    const c = C[p.cells[k]], dx = c.cx - p.ox, dy = c.cy - p.oy;
    p.rx[k] = ca * dx - sa * dy;
    p.ry[k] = sa * dx + ca * dy;
  }
}
/** 처음 자리 좌표 → 지금 세상 좌표 */
function toWorld(S: Sim, body: number, bx: number, by: number): [number, number] {
  if (body < 0) return [bx, by];
  const p = pieceOf(S, body);
  if (!p) return [bx, by];
  const ca = Math.cos(p.a), sa = Math.sin(p.a), dx = bx - p.ox, dy = by - p.oy;
  return [p.x + ca * dx - sa * dy, p.y + sa * dx + ca * dy];
}
function toBase(p: Piece, wx: number, wy: number): [number, number] {
  const ca = Math.cos(-p.a), sa = Math.sin(-p.a), dx = wx - p.x, dy = wy - p.y;
  return [p.ox + ca * dx - sa * dy, p.oy + sa * dx + ca * dy];
}

function makePiece(S: Sim, cells: number[], parent: Piece | null, kx: number, ky: number): Piece {
  const C = S.geo.cells;
  let m = 0, ox = 0, oy = 0;
  for (const i of cells) (m += C[i].area), (ox += C[i].cx * C[i].area), (oy += C[i].cy * C[i].area);
  ox /= m;
  oy /= m;
  let I = 0, br = 0;
  for (const i of cells) {
    const c = C[i], d = Math.hypot(c.cx - ox, c.cy - oy);
    I += c.area * (d * d + (c.r * c.r) / 2);
    br = Math.max(br, d + c.r);
  }
  const p: Piece = {
    id: S.nid++, cells, ox, oy, x: ox, y: oy, a: 0, vx: 0, vy: 0, w: 0, m, I, br, rx: cells.map(() => 0), ry: cells.map(() => 0),
    still: 0, sleep: false, dock: -1, tip: -1, panic: -1, sink: -1, born: S.t,
  };
  if (parent) {
    const [wx, wy] = toWorld(S, parent.id, ox, oy);
    p.a = parent.a;
    p.x = wx;
    p.y = wy;
    p.vx = parent.vx - parent.w * (wy - parent.y);
    p.vy = parent.vy + parent.w * (wx - parent.x);
    p.w = parent.w;
  }
  // 금 자리에서 멀어지는 쪽으로 툭
  const dx = p.x - kx, dy = p.y - ky, dd = Math.hypot(dx, dy) || 1;
  const kick = KICK * Math.min(1.4, 0.5 + 0.08 / Math.max(0.05, Math.sqrt(m)));
  p.vx += (dx / dd) * kick;
  p.vy += (dy / dd) * kick;
  p.w += ((p.id % 2 ? 1 : -1) * 0.004) / (1 + cells.length);
  orient(S, p);
  for (const c of cells) S.owner[c] = p.id;
  S.pieces.push(p);
  return p;
}

function ridersOn(S: Sim, id: number) {
  return S.riders.filter((r) => r.st === ON && r.cell >= 0 && S.owner[r.cell] === id);
}
/** 새 조각: 무게 > 칸 수 − 1 이면 기우뚱, 곰과 펭귄이 같이 뜨면 놀람 */
function checkLoad(S: Sim, p: Piece, E: IceState | null) {
  const rs = ridersOn(S, p.id);
  if (!rs.length) return;
  const wgt = rs.reduce((a, r) => a + WEIGHT[r.k], 0);
  if (S.geo.tip && wgt > p.cells.length - 1) {
    p.tip = 0;
    const [x, y] = [p.x, p.y];
    ev(E, 'tip', x, y, '기우뚱…');
    for (const r of rs) (r.mood = 3), (r.moodT = TIP_T + 30);
    see(E, 'tip');
  } else if (rs.some((r) => r.k === BEAR) && rs.some((r) => r.k === PEN)) {
    p.panic = 0;
    ev(E, 'panic', p.x, p.y, '곰이다!');
    for (const r of rs) if (r.k === PEN) (r.mood = 1), (r.moodT = 60);
  }
}

function riderPos(S: Sim, r: Rider): [number, number] {
  if (r.st === ON) {
    const c = S.geo.cells[r.cell];
    return toWorld(S, S.owner[r.cell] >= 0 ? S.owner[r.cell] : FIXED, c.cx + r.lx, c.cy + r.ly);
  }
  if (r.st === BOAT) return seatPos(S, r.seat);
  if (r.st === HOP) {
    const u = Math.min(1, Math.max(0, (S.t - r.hopAt) / HOP_T)), [sx, sy] = seatPos(S, r.seat);
    return [r.hx + (sx - r.hx) * u, r.hy + (sy - r.hy) * u];
  }
  return [r.x, r.y];
}
function seatPos(S: Sim, k: number): [number, number] {
  const b = S.geo.boat;
  return [b.x - 0.07 + (k % 4) * 0.045, b.y - 0.035 - Math.floor(k / 4) * 0.03];
}

/** 해안에 이어진 얼음 중 가장 가까운 칸 */
function nearestFixed(S: Sim, x: number, y: number) {
  let bi = -1, bd = 9;
  const C = S.geo.cells;
  for (let i = 0; i < C.length; i++) {
    if (S.owner[i] !== FIXED) continue;
    const d = Math.hypot(C[i].cx - x, C[i].cy - y) - C[i].r;
    if (d < bd) (bd = d), (bi = i);
  }
  return bi;
}

function fall(S: Sim, r: Rider, E: IceState | null, why: string) {
  const [x, y] = riderPos(S, r);
  r.x = x;
  r.y = y;
  r.st = r.k === SEAL ? SEA : SWIM;
  r.tc = r.k === SEAL ? -1 : nearestFixed(S, x, y);
  r.mood = r.k === SEAL ? 2 : 3;
  r.moodT = 90;
  if (r.k === PEN) S.falls++;
  if (E) {
    if (r.k === SEAL) (E.sealIn = true), ev(E, 'seal', x, y, '첨벙~ 신난다♪'), see(E, 'sealsea');
    else ev(E, 'plop', x, y, why);
  }
}

// ───────────────────────────── 금 ─────────────────────────────
/** 세상 좌표에 있는 칸 (조금 비껴도 가장 가까운 칸) */
function hitCell(S: Sim, wx: number, wy: number): { c: number; body: number; bx: number; by: number } | null {
  const C = S.geo.cells;
  for (let pi = S.pieces.length - 1; pi >= 0; pi--) {
    const p = S.pieces[pi];
    if (p.dock >= 0 || p.sink >= 0 || Math.hypot(wx - p.x, wy - p.y) > p.br + 0.01) continue;
    const [bx, by] = toBase(p, wx, wy);
    for (const c of p.cells) if (inFlat(C[c].poly, bx, by)) return { c, body: p.id, bx, by };
  }
  for (let i = 0; i < C.length; i++) if (S.owner[i] === FIXED && inFlat(C[i].poly, wx, wy)) return { c: i, body: FIXED, bx: wx, by: wy };
  // 물을 톡 했으면 가까운 얼음(손가락 너비만큼)
  let best: { c: number; body: number; bx: number; by: number } | null = null, bd = 0.045;
  for (let i = 0; i < C.length; i++) {
    const o = S.owner[i];
    if (o === GONE) continue;
    const p = o >= 0 ? pieceOf(S, o) : null;
    if (p && (p.dock >= 0 || p.sink >= 0)) continue;
    const [cx, cy] = toWorld(S, o >= 0 ? o : FIXED, C[i].cx, C[i].cy);
    const d = Math.hypot(cx - wx, cy - wy) - C[i].r * 1.15;
    if (d < bd) {
      bd = d;
      const u = 0.55;
      const [bx, by] = p ? toBase(p, cx + (wx - cx) * u, cy + (wy - cy) * u) : [cx + (wx - cx) * u, cy + (wy - cy) * u];
      best = { c: i, body: o >= 0 ? o : FIXED, bx, by };
    }
  }
  return best;
}

/**
 * 금이 어디까지 달리나 — 세 단계:
 *  1) 톡 한 칸은 산산조각(모든 결이 끊김)
 *  2) 별 모양: 그 칸의 꼭짓점에서 보통 결을 따라 짧게(예산 CRACK_B, 두꺼운 얼음은 THICK_K배 비쌈)
 *  3) 쭉: 1·2에서 닿은 꼭짓점에 반짝이는 약한 결이 붙어 있으면 그 결을 따라 끝까지 (두꺼운 얼음에서 멈춤, 곁가지 없음)
 */
function planCrack(S: Sim, wx: number, wy: number): Pending | null {
  const h = hitCell(S, wx, wy);
  if (!h) return null;
  const G = S.geo, C = G.cells, c0 = C[h.c];
  const inBody = (i: number) => (h.body === FIXED ? S.owner[i] === FIXED : S.owner[i] === h.body);
  const live = (b: number) => !S.broken[b] && inBody(G.bonds[b].a) && inBody(G.bonds[b].b);
  const out: number[] = [], times: number[] = [], has = new Set<number>();
  const add = (b: number, tm: number) => {
    if (has.has(b)) return;
    has.add(b);
    out.push(b);
    times.push(Math.min(1, tm));
  };
  for (const b of c0.bonds) if (live(b)) add(b, 0);
  // 2) 별
  const dist = new Map<number, number>();
  const open: number[] = [];
  for (const v of c0.vi) {
    const d = Math.hypot(G.vx[v] - h.bx, G.vy[v] - h.by);
    if (d < (dist.get(v) ?? Infinity)) dist.set(v, d), open.push(v);
  }
  const done = new Set<number>();
  while (open.length) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (dist.get(open[k])! < dist.get(open[bi])!) bi = k;
    const u = open[bi];
    open.splice(bi, 1);
    if (done.has(u)) continue;
    done.add(u);
    const du = dist.get(u)!;
    for (const b of G.vb[u]) {
      if (!live(b)) continue;
      const bd = G.bonds[b], v = bd.u === u ? bd.v : bd.u, nd = du + bd.cost;
      if (nd > CRACK_B) continue;
      add(b, (du / CRACK_B) * 0.45);
      if (nd < (dist.get(v) ?? Infinity)) dist.set(v, nd), open.push(v);
    }
  }
  // 3) 반짝이는 결을 따라 쭉
  let weakRun = 0;
  const q: number[] = [], run = new Map<number, number>();
  for (const [v, d] of dist) if (d <= CRACK_B) q.push(v), run.set(v, 0);
  for (let k = 0; k < q.length; k++) {
    const u = q[k], ru = run.get(u)!;
    for (const b of G.vb[u]) {
      const bd = G.bonds[b];
      if (!bd.weak || !live(b) || C[bd.a].thick || C[bd.b].thick) continue;
      const v = bd.u === u ? bd.v : bd.u;
      if (!has.has(b)) add(b, 0.4 + (ru + bd.len) * 0.9), weakRun++;
      if (!run.has(v)) run.set(v, ru + bd.len), q.push(v);
    }
  }
  return { c0: h.c, body: h.body, bx: h.bx, by: h.by, bonds: out, times, t: S.t, wx, wy, weakRun };
}

/** 금을 실제로 낸다: 톡 한 칸은 산산조각, 결이 끊긴 덩어리는 떨어져 나간다 */
function applyCrack(S: Sim, pl: Pending, E: IceState | null) {
  const G = S.geo, C = G.cells;
  const par = pl.body >= 0 ? pieceOf(S, pl.body) : null;
  if (pl.body >= 0 && (!par || par.dock >= 0 || par.sink >= 0)) return { freed: 0, big: 0 };
  if (S.owner[pl.c0] === GONE) return { freed: 0, big: 0 };
  const [kx, ky] = toWorld(S, pl.body, pl.bx, pl.by);
  for (const b of pl.bonds) S.broken[b] = 1;
  const list = par ? par.cells.slice() : C.map((_, i) => i).filter((i) => S.owner[i] === FIXED);
  for (const r of S.riders) if (r.st === ON && r.cell === pl.c0) fall(S, r, E, r.k === BEAR ? '첨벙!' : '퐁!');
  S.owner[pl.c0] = GONE;
  const rest = list.filter((i) => i !== pl.c0);
  const comps = components(rest, C, G.bonds, S.broken, S.owner);
  let freed = 0, big = 0;
  const made: Piece[] = [];
  if (par) {
    S.pieces.splice(S.pieces.indexOf(par), 1);
    if (comps.length === 1 && comps[0].length === rest.length) {
      // 한 칸만 깨지고 그대로: 같은 조각을 이어 간다 (모양만 바뀜)
      made.push(makePiece(S, comps[0], par, kx, ky));
    } else for (const cs of comps) made.push(makePiece(S, cs, par, kx, ky)), freed++, (big = Math.max(big, cs.length));
  } else {
    for (const cs of comps) {
      if (cs.some((i) => C[i].anchor)) continue;
      made.push(makePiece(S, cs, null, kx, ky));
      freed++;
      big = Math.max(big, cs.length);
    }
    S.fixedVer++;
  }
  for (const p of S.pieces) (p.sleep = false), (p.still = 0);
  for (const p of made) {
    checkLoad(S, p, E);
    if (E && p.cells.length >= 2) ev(E, 'drop', p.x, p.y, p.cells.length >= 4 ? '풍덩!' : '', p.cells.length);
    if (E && p.tip < 0 && p.panic < 0) for (const r of ridersOn(S, p.id)) if (r.k === PEN) (r.mood = 1), (r.moodT = 50), ev(E, 'ride', p.x, p.y - 0.05, '둥실~?');
  }
  // 헤엄치던 펭귄은 다시 가까운 해안 얼음을 찾는다
  for (const r of S.riders) if (r.st === SWIM && (r.tc < 0 || S.owner[r.tc] !== FIXED)) r.tc = nearestFixed(S, r.x, r.y);
  return { freed, big };
}

// ───────────────────────────── 물리 ─────────────────────────────
function flowAt(G: Geo, x: number, y: number, out: number[]) {
  let ux = 0, uy = 0;
  for (const f of G.flows) {
    let bd = 9, tx = 0, ty = 0, nx = 0, ny = 0;
    for (let k = 0; k + 1 < f.p.length; k++) {
      const ax = f.p[k][0], ay = f.p[k][1], bx = f.p[k + 1][0], by = f.p[k + 1][1], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)), qx = ax + dx * u - x, qy = ay + dy * u - y, d = Math.hypot(qx, qy);
      if (d < bd) {
        const l = Math.sqrt(l2);
        (bd = d), (tx = dx / l), (ty = dy / l), (nx = d > 1e-9 ? qx / d : 0), (ny = d > 1e-9 ? qy / d : 0);
      }
    }
    if (bd >= f.w) continue;
    const q = bd / f.w, s = 1 - q * q;
    ux += f.v * (tx * s + nx * q * 0.55);
    uy += f.v * (ty * s + ny * q * 0.55);
  }
  out[0] = ux;
  out[1] = uy;
}
const WHIRL_A = 0.075, WHIRL_V = 0.0042;
function whirlAt(G: Geo, x: number, y: number, out: number[]) {
  const wl = G.whirl;
  out[0] = out[1] = 0;
  if (!wl) return;
  const dx = x - wl.x, dy = y - wl.y, d = Math.hypot(dx, dy);
  if (d >= wl.r || d < 1e-6) return;
  const s = 1 - d / wl.r;
  out[0] = WHIRL_V * s * (-dy / d * 0.9 - (dx / d) * 0.75);
  out[1] = WHIRL_V * s * ((dx / d) * 0.9 - (dy / d) * 0.75);
}

function buildGrid(S: Sim) {
  const G = S.geo, C = G.cells, grid: number[][] = Array.from({ length: 7 * 8 }, () => []);
  for (let i = 0; i < C.length; i++) {
    if (S.owner[i] !== FIXED) continue;
    const c = C[i], m = c.r + 0.075;
    for (let gx = Math.max(0, Math.floor((c.cx - m) * 7)); gx <= Math.min(6, Math.floor((c.cx + m) * 7)); gx++)
      for (let gy = Math.max(0, Math.floor(((c.cy - m) / H) * 8)); gy <= Math.min(7, Math.floor(((c.cy + m) / H) * 8)); gy++) grid[gy * 7 + gx].push(i);
  }
  S.grid = grid;
  S.gridVer = S.fixedVer;
}

function push(p: Piece, nx: number, ny: number, depth: number, rx: number, ry: number) {
  p.x += nx * depth * 0.85;
  p.y += ny * depth * 0.85;
  const vcx = p.vx - p.w * ry, vcy = p.vy + p.w * rx, vn = vcx * nx + vcy * ny;
  if (vn < 0) {
    const rn = rx * ny - ry * nx, j = (-(1 + REST) * vn) / (1 / p.m + (rn * rn) / p.I);
    p.vx += (j * nx) / p.m;
    p.vy += (j * ny) / p.m;
    p.w += (rn * j) / p.I;
  }
  return -vn;
}

const FLOW = [0, 0], WH = [0, 0];
function hasPen(S: Sim, p: Piece) {
  for (const r of S.riders) if (r.st === ON && r.k === PEN && S.owner[r.cell] === p.id) return true;
  return false;
}
function hasBear(S: Sim, p: Piece) {
  for (const r of S.riders) if (r.st === ON && r.k === BEAR && S.owner[r.cell] === p.id) return true;
  return false;
}

/** 한 틱. E가 있으면(진짜 판) 연출 사건을 남긴다 — 봇의 내다보기는 E 없이 같은 규칙으로 돈다 */
function phys(S: Sim, E: IceState | null) {
  S.t++;
  const G = S.geo, C = G.cells;
  if (!S.grid || S.gridVer !== S.fixedVer) buildGrid(S);
  const grid = S.grid!;
  // 1) 물살·소용돌이에 끌림
  for (const p of S.pieces) {
    if (p.dock >= 0 || p.sleep) continue;
    if (p.sink >= 0) {
      p.sink++;
      p.w += (0.02 - p.w) * 0.05;
      p.a += p.w;
      const wl = G.whirl!;
      p.x += (wl.x - p.x) * 0.06;
      p.y += (wl.y - p.y) * 0.06;
      orient(S, p);
      continue;
    }
    let fx = 0, fy = 0, tq = 0;
    const wk = Math.min(1, WHIRL_A / p.m);
    for (let k = 0; k < p.cells.length; k++) {
      const c = C[p.cells[k]], rx = p.rx[k], ry = p.ry[k], wx = p.x + rx, wy = p.y + ry;
      flowAt(G, wx, wy, FLOW);
      let ux = FLOW[0], uy = FLOW[1];
      if (G.whirl) whirlAt(G, wx, wy, WH), (ux += WH[0] * wk), (uy += WH[1] * wk);
      const vcx = p.vx - p.w * ry, vcy = p.vy + p.w * rx;
      const Fx = KD * c.area * (ux - vcx), Fy = KD * c.area * (uy - vcy);
      fx += Fx;
      fy += Fy;
      tq += rx * Fy - ry * Fx;
    }
    p.vx += fx / p.m;
    p.vy += fy / p.m;
    p.w += tq / p.I;
    p.w *= 0.993;
    p.x += p.vx;
    p.y += p.vy;
    p.a += p.w;
    orient(S, p);
    if (G.whirl && p.m < WHIRL_A * 1.6 && Math.hypot(p.x - G.whirl.x, p.y - G.whirl.y) < 0.045) {
      p.sink = 0;
      ev(E, 'whirl', p.x, p.y, '빙글빙글~');
      see(E, 'whirlsink');
    }
  }
  // 2) 부딪힘: 해안·벽·붙은 얼음·빙산·배
  for (let pi = 0; pi < S.pieces.length; pi++) {
    const p = S.pieces[pi];
    if (p.dock >= 0 || p.sleep || p.sink >= 0) continue;
    let bump = 0, boat = false;
    for (let k = 0; k < p.cells.length; k++) {
      const c = C[p.cells[k]], r = c.r;
      let cx = p.x + p.rx[k], cy = p.y + p.ry[k];
      if (cx - r < 0) bump = Math.max(bump, push(p, 1, 0, r - cx, p.rx[k], p.ry[k]));
      else if (cx + r > W) bump = Math.max(bump, push(p, -1, 0, cx + r - W, p.rx[k], p.ry[k]));
      cx = p.x + p.rx[k];
      cy = p.y + p.ry[k];
      if (cy - r < 0) bump = Math.max(bump, push(p, 0, 1, r - cy, p.rx[k], p.ry[k]));
      else if (cy + r > H) bump = Math.max(bump, push(p, 0, -1, cy + r - H, p.rx[k], p.ry[k]));
      cx = p.x + p.rx[k];
      cy = p.y + p.ry[k];
      const gx = Math.max(0, Math.min(6, Math.floor(cx * 7))), gy = Math.max(0, Math.min(7, Math.floor((cy / H) * 8)));
      for (const j of grid[gy * 7 + gx]) {
        const q = C[j], dx = p.x + p.rx[k] - q.cx, dy = p.y + p.ry[k] - q.cy, m = r + q.r, d2 = dx * dx + dy * dy;
        if (d2 >= m * m) continue;
        const d = Math.sqrt(d2) || 1e-6;
        bump = Math.max(bump, push(p, dx / d, dy / d, m - d, p.rx[k], p.ry[k]));
      }
      for (const b of G.bergs) {
        const dx = p.x + p.rx[k] - b.x, dy = p.y + p.ry[k] - b.y, m = r + b.r, d2 = dx * dx + dy * dy;
        if (d2 >= m * m) continue;
        const d = Math.sqrt(d2) || 1e-6;
        bump = Math.max(bump, push(p, dx / d, dy / d, m - d, p.rx[k], p.ry[k]));
        see(E, 'bergbump');
      }
      const bt = G.boat, dx = p.x + p.rx[k] - bt.x, dy = p.y + p.ry[k] - bt.y, m = r + bt.r;
      if (dx * dx + dy * dy < m * m) {
        if (hasBear(S, p)) {
          const d = Math.hypot(dx, dy) || 1e-6;
          push(p, dx / d, dy / d, m - d, p.rx[k], p.ry[k]);
        } else boat = true;
      }
    }
    if (bump > 0.0012 && E) ev(E, 'bump', p.x, p.y, bump > 0.003 ? '쿵!' : '콩', p.cells.length);
    if (boat) {
      if (hasPen(S, p) && p.tip < 0 && p.panic < 0) {
        p.dock = S.t;
        p.vx = p.vy = p.w = 0;
        let n = 0;
        for (const r of S.riders) if (r.st === ON && S.owner[r.cell] === p.id && r.k === PEN) r.hopAt = S.t + 10 + n++ * HOP_GAP;
        if (E) ev(E, 'dock', p.x, p.y, '쿵!', n), see(E, 'dock');
      } else if (!hasPen(S, p)) crunch(S, p, E);
    }
  }
  // 3) 조각끼리
  for (let i = 0; i < S.pieces.length; i++) {
    const a = S.pieces[i];
    if (a.dock >= 0 || a.sink >= 0) continue;
    for (let j = i + 1; j < S.pieces.length; j++) {
      const b = S.pieces[j];
      if (b.dock >= 0 || b.sink >= 0 || (a.sleep && b.sleep)) continue;
      const ddx = a.x - b.x, ddy = a.y - b.y, mm = a.br + b.br;
      if (ddx * ddx + ddy * ddy >= mm * mm) continue;
      for (let ka = 0; ka < a.cells.length; ka++) {
        const ra = C[a.cells[ka]].r;
        for (let kb = 0; kb < b.cells.length; kb++) {
          const rb = C[b.cells[kb]].r, ax = a.x + a.rx[ka], ay = a.y + a.ry[ka], bx = b.x + b.rx[kb], by = b.y + b.ry[kb];
          const dx = ax - bx, dy = ay - by, m = ra + rb, d2 = dx * dx + dy * dy;
          if (d2 >= m * m) continue;
          const d = Math.sqrt(d2) || 1e-6, nx = dx / d, ny = dy / d, depth = m - d, sh = a.m / (a.m + b.m);
          a.x += nx * depth * 0.8 * (1 - sh);
          a.y += ny * depth * 0.8 * (1 - sh);
          b.x -= nx * depth * 0.8 * sh;
          b.y -= ny * depth * 0.8 * sh;
          const rax = a.rx[ka], ray = a.ry[ka], rbx = b.rx[kb], rby = b.ry[kb];
          const vn = (a.vx - a.w * ray - (b.vx - b.w * rby)) * nx + (a.vy + a.w * rax - (b.vy + b.w * rbx)) * ny;
          if (vn < 0) {
            const rna = rax * ny - ray * nx, rnb = rbx * ny - rby * nx;
            const jj = (-(1 + REST) * vn) / (1 / a.m + 1 / b.m + (rna * rna) / a.I + (rnb * rnb) / b.I);
            a.vx += (jj * nx) / a.m;
            a.vy += (jj * ny) / a.m;
            a.w += (rna * jj) / a.I;
            b.vx -= (jj * nx) / b.m;
            b.vy -= (jj * ny) / b.m;
            b.w -= (rnb * jj) / b.I;
            if (-vn > 0.0004) (a.sleep = false), (b.sleep = false), (a.still = b.still = 0);
          }
        }
      }
    }
  }
  // 4) 잠들기 · 기우뚱 · 놀람 · 배에서 내리기 · 소용돌이
  for (let pi = S.pieces.length - 1; pi >= 0; pi--) {
    const p = S.pieces[pi];
    if (p.dock < 0 && p.sink < 0 && !p.sleep) {
      if (Math.hypot(p.vx, p.vy) < SLEEP_V && Math.abs(p.w) < 0.0004) p.still++;
      else p.still = 0;
      if (p.still > 45) (p.sleep = true), (p.vx = p.vy = p.w = 0);
    }
    if (p.tip >= 0 && ++p.tip >= TIP_T) {
      p.tip = -1;
      for (const r of ridersOn(S, p.id)) fall(S, r, E, r.k === SEAL ? '' : '으아아 퐁!');
    }
    if (p.panic >= 0 && ++p.panic >= PANIC_T) {
      p.panic = -1;
      for (const r of ridersOn(S, p.id)) if (r.k === PEN) fall(S, r, E, '히익 첨벙!');
    }
    if (p.dock >= 0) {
      const left = ridersOn(S, p.id).filter((r) => r.k === PEN).length;
      const hopping = S.riders.some((r) => r.st === HOP);
      if (!left && !hopping && S.t - p.dock > 24) crunch(S, p, E);
    }
    if (p.sink >= SINK_T) {
      for (const r of ridersOn(S, p.id)) fall(S, r, E, '꼬르륵… 퐁!');
      for (const c of p.cells) S.owner[c] = GONE;
      S.pieces.splice(S.pieces.indexOf(p), 1);
      ev(E, 'sunk', p.x, p.y, '꿀꺽!');
    }
  }
  // 5) 탄 것들
  for (const r of S.riders) {
    if (r.st === ON && r.cell >= 0 && S.owner[r.cell] >= 0) {
      const p = pieceOf(S, S.owner[r.cell]);
      if (p && p.dock >= 0 && r.k === PEN && r.hopAt >= 0 && S.t >= r.hopAt) {
        const [x, y] = riderPos(S, r);
        r.hx = x;
        r.hy = y;
        r.st = HOP;
        r.seat = S.seats++;
        r.hopAt = S.t;
        r.mood = 2;
        r.moodT = 90;
        ev(E, 'hop', x, y, '폴짝!');
      }
    } else if (r.st === HOP) {
      if (S.t - r.hopAt >= HOP_T) {
        r.st = BOAT;
        const [x, y] = seatPos(S, r.seat);
        ev(E, 'board', x, y, '');
      }
    } else if (r.st === SWIM) {
      if (r.tc < 0 || S.owner[r.tc] !== FIXED) r.tc = nearestFixed(S, r.x, r.y);
      const tx = r.tc >= 0 ? C[r.tc].cx : r.x, ty = r.tc >= 0 ? C[r.tc].cy : 0.02;
      const dx = tx - r.x, dy = ty - r.y, d = Math.hypot(dx, dy);
      const reach = r.tc >= 0 ? C[r.tc].r * 0.8 : 0.01;
      if (d < reach && r.tc >= 0) {
        r.st = ON;
        r.cell = r.tc;
        const c = C[r.tc], lim = c.r * 0.4;
        r.lx = Math.max(-lim, Math.min(lim, r.x - c.cx));
        r.ly = Math.max(-lim, Math.min(lim, r.y - c.cy));
        r.hopAt = -1;
        r.mood = 0;
        r.moodT = 0;
        ev(E, 'climb', r.x, r.y, '영차!');
      } else if (d > 1e-6) {
        r.x += (dx / d) * Math.min(d, SWIM_V);
        r.y += (dy / d) * Math.min(d, SWIM_V);
        if (Math.abs(dx) > 0.002) r.face = dx > 0 ? 1 : -1;
      }
    } else if (r.st === SEA) {
      // 물개는 신나서 제자리 뱅글뱅글 (연출이지만 결정적)
      r.x += Math.cos(S.t * 0.03 + r.id) * 0.0012;
      r.y += Math.sin(S.t * 0.03 + r.id) * 0.0008;
      r.x = Math.max(0.03, Math.min(0.97, r.x));
      r.y = Math.max(0.05, Math.min(H - 0.03, r.y));
    }
  }
}

function crunch(S: Sim, p: Piece, E: IceState | null) {
  for (const r of ridersOn(S, p.id)) fall(S, r, E, r.k === SEAL ? '' : '퐁!');
  for (const c of p.cells) S.owner[c] = GONE;
  const i = S.pieces.indexOf(p);
  if (i >= 0) S.pieces.splice(i, 1);
  ev(E, 'crunch', p.x, p.y, '와작!', p.cells.length);
}

function cloneSim(S: Sim): Sim {
  return {
    t: S.t, geo: S.geo, owner: S.owner.slice(), broken: S.broken.slice(), nid: S.nid, falls: S.falls, fixedVer: S.fixedVer, grid: S.grid, gridVer: S.gridVer, seats: S.seats,
    pieces: S.pieces.map((p) => ({ ...p, rx: p.rx.slice(), ry: p.ry.slice() })),
    riders: S.riders.map((r) => ({ ...r })),
  };
}

/** 움직이는 중인가 (펭귄이 탄 조각이 떠 가거나, 배에 내리는 중, 헤엄치는 중) */
function busy(S: Sim, swim = true) {
  for (const p of S.pieces) {
    if (p.dock >= 0 || p.tip >= 0 || p.panic >= 0 || p.sink >= 0) return true;
    if (!p.sleep && ridersOn(S, p.id).length && p.born > -1) return true;
  }
  for (const r of S.riders) if (r.st === HOP || (swim && r.st === SWIM)) return true;
  return false;
}

// ───────────────────────────── 판 ─────────────────────────────
function newStage(s: IceState) {
  const d = STAGES[s.stage];
  s.geo = buildGeo(d, mulberry32(s.seeds[s.stage]));
  const G = s.geo;
  s.owner = new Int16Array(G.cells.length).fill(FIXED);
  s.broken = new Uint8Array(G.bonds.length);
  s.pieces = [];
  s.riders = [];
  s.nid = 0;
  s.falls = 0;
  s.fixedVer = 0;
  s.grid = null;
  s.gridVer = -1;
  s.seats = 0;
  let rid = 0;
  const add = (k: number, pl: number[]) => s.riders.push({ id: rid++, k, st: ON, cell: pl[0], lx: pl[1], ly: pl[2], x: 0, y: 0, tc: -1, hopAt: -1, hx: 0, hy: 0, seat: 0, face: rid % 2 ? 1 : -1, mood: 0, moodT: 0 });
  for (const p of G.pens) add(PEN, p);
  if (G.seal) add(SEAL, G.seal);
  if (G.bear) add(BEAR, G.bear);
  s.taps = d.taps;
  s.used = 0;
  s.lastTap = s.t;
  s.phase = 'play';
  s.pt = 0;
  s.pending = null;
  s.winT = -1;
  s.sealIn = false;
  s.cracks = [];
  s.shards = [];
  s.starOk = starList(s.stage).map(() => false);
  s.banner = { head: `${s.stage + 1}판 · ${d.name}`, sub: s.again ? '다시 한 번! 결을 잘 보고 톡' : s.stage ? `NEW ${d.news}` : '펭귄을 모두 구조선으로!', t: s.t };
  see(s, d.key);
  const spotAt = (): [number, number, number] | null => {
    if (d.key === 'flow') return [d.flows[0].p[1][0], d.flows[0].p[1][1], 0.12];
    if (d.key === 'tip') return [d.pens[1][0], d.pens[1][1] - 0.01, 0.16];
    if (d.key === 'thick') return [0.17, 0.6, 0.16];
    if (d.key === 'seal' && G.seal) return [G.cells[G.seal[0]].cx, G.cells[G.seal[0]].cy, 0.09];
    if (d.key === 'berg') return [G.bergs[0].x, G.bergs[0].y, 0.14];
    if (d.key === 'bear' && G.bear) return [G.cells[G.bear[0]].cx, G.cells[G.bear[0]].cy, 0.1];
    if (d.key === 'whirl' && G.whirl) return [G.whirl.x, G.whirl.y, 0.13];
    return null;
  };
  const sp = spotAt();
  s.spot = sp && !s.again ? { x: sp[0], y: sp[1], r: sp[2], t: s.t, label: d.spot } : null;
}

function starList(stage: number): string[] {
  const d = STAGES[stage], out = ['펭귄을 모두 배로'];
  if (stage >= 1) out.push('아무도 물에 안 빠지기');
  if (stage >= 2) out.push(d.star3 === 'seal' ? '물개도 물에 첨벙' : `${d.par}번 안에 구조`);
  return out;
}

function endStage(s: IceState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  s.pending = null;
  const d = STAGES[s.stage];
  if (ok) {
    const L = starList(s.stage);
    s.starOk = L.map((_, k) => (k === 0 ? true : k === 1 ? s.falls === 0 : d.star3 === 'seal' ? s.sealIn : s.used <= d.par));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + CLEAR_PTS + s.taps * LEFT_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    wow(s);
    ev(s, 'clear', 0.5, 0.5, s.won ? '모두 구조 완료!' : '구조 성공!');
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.5, why);
  }
}

function tap(s: IceState, sx: number, sy: number) {
  if (s.phase !== 'play') return;
  if (s.pending) return;
  const q = toPlane(sx, sy);
  if (q.y < -0.04 || q.y > H + 0.05) return;
  if (s.taps <= 0) return void ev(s, 'nope', Math.max(0.15, Math.min(0.85, q.x)), Math.max(0.1, Math.min(1.1, q.y)), '톡을 다 썼어요');
  const pl = planCrack(s, q.x, q.y);
  if (!pl) return void ev(s, 'water', q.x, q.y, '찰박');
  s.taps--;
  s.used++;
  s.lastTap = s.t;
  if (s.firstTap < 0) s.firstTap = s.t;
  s.pending = pl;
  s.banner = null;
  const [wx, wy] = toWorld(s, pl.body, pl.bx, pl.by);
  s.cracks.push({ t: s.t, c0: pl.c0, bx: pl.bx, by: pl.by, body: pl.body, bonds: pl.bonds, times: pl.times });
  if (s.cracks.length > 6) s.cracks.shift();
  ev(s, 'crack', wx, wy, pl.weakRun >= 3 ? '쩌저적!' : '쩍!', pl.bonds.length);
  see(s, 'crack');
  if (pl.weakRun >= 3) see(s, 'weak');
  if (pl.bonds.length >= 4 || pl.weakRun >= 2) wow(s);
  // 톡 한 칸의 별 모양 파편 (연출)
  const C = s.geo.cells, c = C[pl.c0], n = c.poly.length / 2;
  for (let k = 0; k < n; k++) {
    const ax = c.poly[k * 2], ay = c.poly[k * 2 + 1], bx2 = c.poly[((k + 1) % n) * 2], by2 = c.poly[((k + 1) % n) * 2 + 1];
    const mx = (ax + bx2 + pl.bx) / 3, my = (ay + by2 + pl.by) / 3;
    const [wmx, wmy] = toWorld(s, pl.body, mx, my);
    const pts = [ax - mx, ay - my, bx2 - mx, by2 - my, pl.bx - mx, pl.by - my];
    const dx = mx - pl.bx, dy = my - pl.by, dd = Math.hypot(dx, dy) || 1;
    s.shards.push({ x: wmx, y: wmy, vx: (dx / dd) * 0.0035, vy: (dy / dd) * 0.0035, a: 0, w: (k % 2 ? 1 : -1) * 0.05, pts, life: 150, z: 0, vz: 0.012 + (k % 3) * 0.004 });
  }
}

// ───────────────────────────── 화면 좌표 (3/4 시점: 뒤가 조금 좁다) ─────────────────────────────
const Y0 = 0.205, KY = 0.8, SB = 0.88, SF = 1;
const scl = (y: number) => SB + (SF - SB) * (y / H);
const PX = (x: number, y: number) => 0.5 + (x - 0.5) * scl(y);
const PY = (y: number) => Y0 + y * KY;
function toPlane(sx: number, sy: number) {
  const y = (sy - Y0) / KY;
  return { x: 0.5 + (sx - 0.5) / scl(y), y };
}
const BAND = 1.19;

const game: GameDef<IceState> = {
  id: 'icecrack',
  name: '🧊 톡 깨는 빙판 구조대',
  genes: ['crack', 'pointer'],
  twist: '톡 한 자리는 별처럼 산산조각 나고, 금은 미리 숨은 결을 따라 달린다 — 반짝이는 약한 결은 끝까지 쭉, 두꺼운 얼음은 뚝 멈춰서, 어디를 톡 하느냐가 떨어져 나갈 조각의 모양·크기를 정하고, 그 조각이 물살을 타고 구조선까지 둥둥 간다',
  rules: [
    '얼음을 톡 = 쩍! 금이 결을 따라 퍼져요. 반짝이는 결은 끝까지 쭉 달려요.',
    '펭귄이 탄 조각을 물살에 태워 구조선까지! 펭귄보다 한 칸 넉넉해야 안 빠져요.',
  ],
  controls: 'touch',
  hint: '얼음을 톡 = 쩍! / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '햇살 비치는 남극 바다의 빙판 디오라마 — 두꺼운 얼음판·반사·그림자, 뒤뚱 펭귄과 빨간 구조선',
    mood: '맑은 하늘 아래 민트빛 바다에 두꺼운 빙판이 반짝이고, 결이 살짝 보인다. 톡 하면 별 모양으로 쩍 금이 가 얼음 조각이 풍덩 떨어져 출렁이며 물살을 타고, 빨간 구조선에 쿵 닿으면 펭귄들이 폴짝. 해안의 이글루 앞에서 아기 펭귄들이 구경하며 폴짝폴짝.',
    palette: { bg: '#bfe8f7', ink: '#123049', muted: '#6a8aa8', accent: '#ff5a4a', hot: '#ff8a2a', soft: '#eafaff' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.riders.filter((r) => r.k === PEN && r.st !== SWIM).length,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const rng = mulberry32(seed);
    const s = {
      rng, seed, t: 0, stage: 0, phase: 'play', pt: 0, seeds: STAGES.map(() => Math.floor(rng() * 1e9)),
      geo: null as unknown as Geo, owner: new Int16Array(0), broken: new Uint8Array(0), pieces: [], riders: [], nid: 0, falls: 0, fixedVer: 0, grid: null, gridVer: -1, seats: 0,
      taps: 0, used: 0, lastTap: 0, hearts: 3, stars: 0, got: 0, starOk: [], pts: 0, ok: false, why: '', down: false, pending: null, winT: -1,
      seen: new Set<string>(), banner: null, spot: null, events: [], dead: false, won: false, tries: 0, again: false, firstTap: -1, wowN: 0,
      cracks: [], shards: [], sealIn: false, slow: 0,
    } as IceState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null;
    const fresh = !!p && !s.down;
    s.down = !!p;
    s.pt++;
    if (s.events.length > 50) s.events = s.events.filter((e) => s.t - e.t < 120);
    if (s.phase === 'result') {
      s.t++;
      const T = s.ok ? RESULT_OK : RESULT_FAIL;
      if (s.pt >= T || (fresh && s.pt > 70)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    if (fresh) tap(s, p!.x, p!.y * A);
    if (s.pending && s.t - s.pending.t >= CRACK_T) {
      const pl = s.pending;
      s.pending = null;
      const r = applyCrack(s, pl, s);
      if (r.freed) {
        const [wx, wy] = toWorld(s, pl.body, pl.bx, pl.by);
        ev(s, 'split', wx, wy, r.big >= 4 ? '풍덩!' : '퐁', r.big);
        if (r.big >= 3 || r.freed >= 3) wow(s);
      }
    }
    phys(s, s);
    if (s.spot && s.t - s.spot.t > SPOT_T) s.spot = null;
    // 연출: 파편
    for (const sh of s.shards) {
      sh.x += sh.vx;
      sh.y += sh.vy;
      sh.vx *= 0.96;
      sh.vy *= 0.96;
      sh.a += sh.w;
      sh.w *= 0.95;
      sh.z += sh.vz;
      sh.vz -= 0.0016;
      if (sh.z < 0) (sh.z = 0), (sh.vz = Math.abs(sh.vz) > 0.003 ? -sh.vz * 0.3 : 0);
      sh.life--;
    }
    s.shards = s.shards.filter((q) => q.life > 0);
    for (const r of s.riders) {
      if (r.moodT > 0 && --r.moodT === 0) r.mood = 0;
      // 떠 가는 조각 위의 펭귄은 신나서 날개를 퍼덕
      if (r.k === PEN && r.st === ON && r.moodT <= 0 && s.owner[r.cell] >= 0) r.mood = 2;
    }
    // 끝났나
    const pens = s.riders.filter((r) => r.k === PEN);
    if (pens.every((r) => r.st === BOAT)) {
      if (s.winT < 0) (s.winT = s.t), wow(s), ev(s, 'saved', S_BOATX(s), S_BOATY(s), '모두 구조!');
      if (s.t - s.winT > 50) endStage(s, true, '');
      return;
    }
    if (s.taps <= 0 && !s.pending && !busy(s) && s.t - s.lastTap > 40) {
      const moving = s.pieces.some((q) => !q.sleep && ridersOn(s, q.id).some((r) => r.k === PEN));
      if (!moving || s.t - s.lastTap > SETTLE_T) endStage(s, false, '톡을 다 썼어요');
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const icecrack = game;
const S_BOATX = (s: IceState) => s.geo.boat.x;
const S_BOATY = (s: IceState) => s.geo.boat.y - 0.06;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x: PX(x, y), y: PY(y) / A } });

/** 손을 댈 때인가: 판 중, 금이 달리는 중 아님, 펭귄 조각이 떠 가는 중 아님 */
function ready(s: IceState, gap = 30) {
  if (s.phase !== 'play' || s.down || s.pending || s.taps <= 0 || s.winT >= 0) return false;
  if (s.t - s.lastTap < gap) return false;
  if (busy(s) && s.t - s.lastTap < 600) return false;
  return true;
}

function simulate(S0: Sim, x: number, y: number, maxT: number): { S: Sim; pl: Pending } | null {
  const S = cloneSim(S0);
  const pl = planCrack(S, x, y);
  if (!pl) return null;
  applyCrack(S, pl, null);
  for (let k = 0; k < maxT; k++) {
    phys(S, null);
    if (k > 6 && (!busy(S, false) || settled(S))) break;
  }
  return { S, pl };
}

/** 펭귄마다 결말이 났나 (배에 닿음 · 물에 빠짐 · 해안 얼음 위에서 가만히) */
function settled(S: Sim) {
  for (const r of S.riders) {
    if (r.k !== PEN || r.st !== ON) continue;
    const o = S.owner[r.cell];
    if (o < 0) continue;
    const p = pieceOf(S, o);
    if (p && p.dock < 0) return false;
  }
  return true;
}

/** 해안에 붙은 펭귄을 떼어 내려면 칸을 몇 개 더 깨야 하나 — 반짝이는 결은 공짜로 끊긴다고 보고 최소 꼭짓점 자르기(최대 흐름) */
function cutNeed(S: Sim): number {
  const G = S.geo, C = G.cells, n = C.length, src = 2 * n, snk = 2 * n + 1, N = 2 * n + 2, INF = 99;
  const pen = new Uint8Array(n);
  let any = false;
  for (const r of S.riders) if (r.st === ON && r.k === PEN && S.owner[r.cell] === FIXED) (pen[r.cell] = 1), (any = true);
  if (!any) return 0;
  const head = new Int32Array(N).fill(-1), to: number[] = [], cap: number[] = [], nxt: number[] = [];
  const addE = (a: number, b: number, c: number) => {
    to.push(b), cap.push(c), nxt.push(head[a]), (head[a] = to.length - 1);
    to.push(a), cap.push(0), nxt.push(head[b]), (head[b] = to.length - 1);
  };
  for (let i = 0; i < n; i++) {
    if (S.owner[i] !== FIXED) continue;
    addE(2 * i, 2 * i + 1, pen[i] || C[i].anchor ? INF : 1);
    if (pen[i]) addE(src, 2 * i, INF);
    if (C[i].anchor) addE(2 * i + 1, snk, INF);
  }
  for (let b = 0; b < G.bonds.length; b++) {
    const bd = G.bonds[b];
    if (S.broken[b] || S.owner[bd.a] !== FIXED || S.owner[bd.b] !== FIXED) continue;
    if (bd.weak && !C[bd.a].thick && !C[bd.b].thick) continue;
    addE(2 * bd.a + 1, 2 * bd.b, INF);
    addE(2 * bd.b + 1, 2 * bd.a, INF);
  }
  let flow = 0;
  const prev = new Int32Array(N);
  while (flow < 4) {
    prev.fill(-1);
    prev[src] = -2;
    const q = [src];
    for (let k = 0; k < q.length && prev[snk] === -1; k++)
      for (let e = head[q[k]]; e >= 0; e = nxt[e]) if (cap[e] > 0 && prev[to[e]] === -1) (prev[to[e]] = e), q.push(to[e]);
    if (prev[snk] === -1) break;
    let bott = INF;
    for (let v = snk; v !== src; v = to[prev[v] ^ 1]) bott = Math.min(bott, cap[prev[v]]);
    if (bott >= INF) return 4;
    for (let v = snk; v !== src; v = to[prev[v] ^ 1]) (cap[prev[v]] -= bott), (cap[prev[v] ^ 1] += bott);
    flow += bott;
  }
  return Math.min(4, flow);
}

function value(s: IceState, S: Sim, plies: number) {
  const d = STAGES[s.stage], bt = S.geo.boat;
  let v = 0, saved = 0, total = 0, sealSea = false;
  for (const r of S.riders) {
    if (r.k === SEAL && r.st === SEA) sealSea = true;
    if (r.k !== PEN) continue;
    total++;
    if (r.st === BOAT || r.st === HOP || (r.st === ON && S.owner[r.cell] >= 0 && pieceOf(S, S.owner[r.cell])?.dock !== -1)) {
      saved++;
      v += 1000;
      continue;
    }
    const [x, y] = riderPos(S, r), dist = Math.hypot(x - bt.x, y - bt.y);
    if (r.st === SWIM) v -= 600 + 400 * dist;
    else if (S.owner[r.cell] >= 0) {
      const p = pieceOf(S, S.owner[r.cell]);
      v += 150 - 700 * dist - (p?.sleep ? 250 : 0);
    } else v -= 450 * dist;
  }
  const newFalls = S.falls - s.falls;
  v -= newFalls * (s.stage >= 1 ? 1400 : 500);
  if (d.star3 === 'seal' && sealSea) v += 900;
  if (saved === total) {
    v += 20000;
    if (s.stage >= 1 && S.falls === 0) v += 9000;
    if (s.stage >= 2 && (d.star3 === 'par' ? s.used + plies <= d.par : sealSea)) v += 9000;
    v += (s.taps - plies) * 120;
  } else v -= 350 * cutNeed(S);
  return v - plies * 160;
}

function candidates(S: Sim): number[][] {
  const C = S.geo.cells, out: number[][] = [];
  for (let i = 0; i < C.length; i++) {
    const o = S.owner[i];
    if (o === GONE) continue;
    const p = o >= 0 ? pieceOf(S, o) : null;
    if (p && (p.dock >= 0 || p.sink >= 0)) continue;
    const c = C[i], body = o >= 0 ? o : FIXED;
    out.push(toWorld(S, body, c.cx, c.cy));
    const n = c.vi.length;
    for (let k = 0; k < n; k++) {
      const v = c.vi[k];
      if (!S.geo.vb[v].some((b) => S.geo.bonds[b].weak && !S.broken[b])) continue;
      out.push(toWorld(S, body, c.cx + (S.geo.vx[v] - c.cx) * 0.7, c.cy + (S.geo.vy[v] - c.cy) * 0.7));
    }
  }
  return out;
}

function searchBest(s: IceState, S: Sim, plies: number, maxT: number) {
  const res: { x: number; y: number; v: number; S: Sim }[] = [];
  const keys = new Set<string>();
  for (const [x, y] of candidates(S)) {
    const pl = planCrack(S, x, y);
    if (!pl) continue;
    const k = pl.c0 + ':' + pl.bonds.slice().sort((a, b) => a - b).join(',');
    if (keys.has(k)) continue;
    keys.add(k);
    const r = simulate(S, x, y, maxT);
    if (!r) continue;
    res.push({ x, y, v: value(s, r.S, plies) + 12 * Math.min(8, r.pl.weakRun) - (r.S.geo.cells[r.pl.c0].thick ? 0 : 4), S: r.S });
  }
  res.sort((a, b) => b.v - a.v);
  return res;
}

const brain = new WeakMap<object, { key: string; x: number; y: number }>();
/** 두 번 앞을 내다본 계획의 둘째 톡 (첫 톡 뒤에 그대로 통하면 다시 찾지 않는다) */
const nextMove = new WeakMap<object, { stage: number; used: number; x: number; y: number }>();
function plan(s: IceState): { x: number; y: number } | null {
  const nm = nextMove.get(s);
  if (nm && nm.stage === s.stage && nm.used === s.used) {
    const r = simulate(s, nm.x, nm.y, 320);
    if (r && value(s, r.S, 1) >= 20000) return { x: nm.x, y: nm.y };
  }
  const res = searchBest(s, s, 1, 320);
  if (!res.length) return null;
  let best = res[0], bv = best.v;
  if (bv < 20000 && s.taps >= 2) {
    for (const r of res.slice(0, 5)) {
      const r2 = searchBest(s, r.S, 2, 320);
      if (r2.length && r2[0].v > bv) {
        (bv = r2[0].v), (best = r);
        nextMove.set(s, { stage: s.stage, used: s.used + 1, x: r2[0].x, y: r2[0].y });
      }
      if (bv >= 20000) break;
    }
  }
  return { x: best.x, y: best.y };
}

/** 봇: 후보 톡 자리마다 같은 깨짐·흐름을 내다보고(두 번 앞까지) 가장 좋은 자리를 톡 */
export const icecrackSmart: Bot<IceState> = {
  name: '얼음 박사',
  act(s) {
    if (!ready(s, 40)) return NO;
    const key = `${s.stage}:${s.hearts}:${s.used}:${s.t - (s.t % 1)}`;
    let m = brain.get(s);
    if (!m || m.key.split(':').slice(0, 3).join(':') !== key.split(':').slice(0, 3).join(':')) {
      const p = plan(s);
      if (!p) return NO;
      brain.set(s, (m = { key, ...p }));
    }
    return at(m.x, m.y);
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number }>();
/** 봇: 아무 데나, 아무 때나 톡 */
export const icecrackRandom: Bot<IceState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 60), hold: 0, x: 0, y: 0 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 110);
    const px = rng() * W, py = rng() * H;
    m.x = PX(px, py);
    m.y = PY(py) / A;
    m.hold = 2 + Math.floor(rng() * 4);
    return { tap: false, dir: 0, pointer: { x: m.x, y: m.y } };
  },
};

const habitMem = new WeakMap<object, number>();
function habitTap(s: IceState, f: () => number[] | null): Input {
  if (!ready(s, 40)) return NO;
  const last = habitMem.get(s) ?? -99;
  if (s.t - last < 6) return NO;
  habitMem.set(s, s.t);
  const p = f();
  return p ? at(p[0], p[1]) : NO;
}
/** 버릇 봇: 늘 (아직 못 구한) 펭귄 바로 옆, 배 쪽을 톡 */
export const icecrackHabit: Bot<IceState> = {
  name: '늘 펭귄 바로 옆 톡',
  act(s) {
    return habitTap(s, () => {
      for (const r of s.riders) {
        if (r.k !== PEN || r.st !== ON) continue;
        const [x, y] = riderPos(s, r), bt = s.geo.boat, a0 = Math.atan2(bt.y - y, bt.x - x);
        // 배 쪽 바로 옆 칸, 거기가 물이면 조금씩 돌려 가며 가장 가까운 얼음
        for (const da of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.4, -2.4, Math.PI]) {
          const px = x + Math.cos(a0 + da) * 0.1, py = y + Math.sin(a0 + da) * 0.1, h = hitCell(s, px, py);
          if (h && !s.riders.some((q) => q.st === ON && q.cell === h.c)) return [px, py];
        }
      }
      return null;
    });
  },
};
/** 독립 버릇 봇: 늘 배와 가장 가까운 빙판 끝을 톡 */
export const icecrackHabit2: Bot<IceState> = {
  name: '늘 배와 가장 가까운 얼음 끝 톡',
  act(s) {
    return habitTap(s, () => {
      const C = s.geo.cells, bt = s.geo.boat;
      let best: number[] | null = null, bd = 9;
      for (let i = 0; i < C.length; i++) {
        const o = s.owner[i];
        if (o === GONE) continue;
        const p = o >= 0 ? pieceOf(s, o) : null;
        if (p && (p.dock >= 0 || p.sink >= 0)) continue;
        const [cx, cy] = toWorld(s, o >= 0 ? o : FIXED, C[i].cx, C[i].cy), d = Math.hypot(cx - bt.x, cy - bt.y);
        if (d < bd) (bd = d), (best = [cx + ((bt.x - cx) / d) * C[i].r * 0.5, cy + ((bt.y - cy) / d) * C[i].r * 0.5]);
      }
      return best;
    });
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
function starPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r * 0.46 : r;
    ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
function heartPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.8, y - r * 1.2, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.8, y - r * 1.2, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
  ctx.closePath();
}
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}
function sparkle(ctx: C2, x: number, y: number, r: number, a: number) {
  if (a <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, a);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.restore();
}

// ── 동물 ──
/** 펭귄. (x,y) = 발 자리. mood 0 평온 · 1 놀람 · 2 신남 · 3 겁먹음(미끄러짐) */
function drawPenguin(ctx: C2, x: number, y: number, u: number, face: number, mood: number, t: number, ph: number, swim = false) {
  ctx.save();
  ctx.translate(x, y);
  if (swim) {
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ell(ctx, 0, 0, u * 0.95, u * 0.26);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(-u * 2, -u * 4, u * 4, u * 4);
    ctx.clip();
    ctx.translate(0, u * 1.05 + Math.sin(t * 0.2 + ph) * u * 0.06);
  } else {
    ctx.fillStyle = 'rgba(20,70,110,.25)';
    ell(ctx, u * 0.08, u * 0.02, u * 0.62, u * 0.17);
    ctx.fill();
  }
  const wob = mood === 3 ? Math.sin(t * 0.55 + ph) * 0.2 : mood === 1 ? Math.sin(t * 0.4 + ph) * 0.06 : Math.sin(t * 0.11 + ph) * 0.08;
  const hop = mood === 2 && !swim ? -Math.abs(Math.sin(t * 0.18 + ph)) * u * 0.32 : 0;
  ctx.translate(0, hop);
  ctx.rotate(wob);
  ctx.scale(face, 1);
  const lw = Math.max(1, u * 0.07);
  ctx.lineWidth = lw;
  ctx.strokeStyle = '#0d1426';
  // 발
  ctx.fillStyle = '#ff9a2a';
  for (const sx of [-0.24, 0.26]) {
    ell(ctx, u * sx, -u * 0.03, u * 0.22, u * 0.1);
    ctx.fill();
  }
  // 날개 (뒤)
  const flap = mood === 2 ? Math.sin(t * 0.5 + ph) * 0.5 + 0.9 : mood === 3 ? Math.sin(t * 0.8 + ph) * 0.6 + 1.3 : mood === 1 ? 1.1 : 0.15 + Math.sin(t * 0.08 + ph) * 0.05;
  ctx.fillStyle = '#1b2440';
  ctx.save();
  ctx.translate(-u * 0.52, -u * 1.45);
  ctx.rotate(0.25 + flap);
  ell(ctx, 0, u * 0.42, u * 0.15, u * 0.48);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // 몸
  const g = ctx.createLinearGradient(-u * 0.6, -u * 2.3, u * 0.6, 0);
  g.addColorStop(0, '#45537a');
  g.addColorStop(0.55, '#26304f');
  g.addColorStop(1, '#151b30');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -u * 2.32);
  ctx.bezierCurveTo(u * 0.66, -u * 2.32, u * 0.74, -u * 1.2, u * 0.64, -u * 0.5);
  ctx.bezierCurveTo(u * 0.57, -u * 0.06, u * 0.26, 0, 0, 0);
  ctx.bezierCurveTo(-u * 0.26, 0, -u * 0.57, -u * 0.06, -u * 0.64, -u * 0.5);
  ctx.bezierCurveTo(-u * 0.74, -u * 1.2, -u * 0.66, -u * 2.32, 0, -u * 2.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 배
  const bg = ctx.createLinearGradient(0, -u * 1.5, 0, 0);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(1, '#dcebf5');
  ctx.fillStyle = bg;
  ell(ctx, u * 0.1, -u * 0.86, u * 0.43, u * 0.7);
  ctx.fill();
  // 얼굴 흰 무늬
  ctx.fillStyle = '#ffffff';
  ell(ctx, u * 0.02, -u * 1.66, u * 0.22, u * 0.24);
  ctx.fill();
  ell(ctx, u * 0.32, -u * 1.66, u * 0.22, u * 0.24);
  ctx.fill();
  ell(ctx, u * 0.17, -u * 1.48, u * 0.3, u * 0.2);
  ctx.fill();
  // 눈
  const blink = mood === 0 && (t + Math.floor(ph * 97)) % 200 < 7;
  for (const ex of [0.03, 0.32]) {
    const cx = u * ex, cy = -u * 1.7;
    ctx.fillStyle = '#121a2c';
    ctx.strokeStyle = '#121a2c';
    if (blink) {
      ctx.lineWidth = Math.max(1, u * 0.06);
      ctx.beginPath();
      ctx.moveTo(cx - u * 0.08, cy);
      ctx.lineTo(cx + u * 0.08, cy);
      ctx.stroke();
    } else if (mood === 2) {
      ctx.lineWidth = Math.max(1.2, u * 0.07);
      ctx.beginPath();
      ctx.arc(cx, cy + u * 0.04, u * 0.08, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (mood === 1 || mood === 3) {
      ctx.fillStyle = '#ffffff';
      ell(ctx, cx, cy, u * 0.13, u * 0.15);
      ctx.fill();
      ctx.lineWidth = Math.max(1, u * 0.04);
      ctx.stroke();
      ctx.fillStyle = '#121a2c';
      ell(ctx, cx + u * 0.03, cy + u * 0.02, u * 0.05, u * 0.05);
      ctx.fill();
    } else {
      ell(ctx, cx, cy, u * 0.075, u * 0.1);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, cx + u * 0.025, cy - u * 0.04, u * 0.03, u * 0.03);
      ctx.fill();
    }
  }
  // 볼
  ctx.fillStyle = 'rgba(255,120,150,.5)';
  ell(ctx, u * 0.42, -u * 1.5, u * 0.09, u * 0.055);
  ctx.fill();
  ell(ctx, -u * 0.08, -u * 1.5, u * 0.08, u * 0.05);
  ctx.fill();
  // 부리
  const open = mood === 1 || mood === 3 ? 1 : mood === 2 ? 0.5 : 0;
  ctx.fillStyle = '#ffa42e';
  ctx.strokeStyle = '#b8600a';
  ctx.lineWidth = Math.max(0.8, u * 0.035);
  ctx.beginPath();
  ctx.moveTo(u * 0.36, -u * 1.62);
  ctx.lineTo(u * 0.72, -u * 1.56 + open * u * 0.02);
  ctx.lineTo(u * 0.36, -u * 1.48);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (open) {
    ctx.fillStyle = '#ff8a1a';
    ctx.beginPath();
    ctx.moveTo(u * 0.38, -u * 1.47);
    ctx.lineTo(u * 0.66, -u * 1.47 + open * u * 0.12);
    ctx.lineTo(u * 0.38, -u * 1.38);
    ctx.closePath();
    ctx.fill();
  }
  // 날개 (앞)
  ctx.fillStyle = '#26304f';
  ctx.strokeStyle = '#0d1426';
  ctx.lineWidth = lw;
  ctx.save();
  ctx.translate(u * 0.55, -u * 1.42);
  ctx.rotate(-0.2 - flap);
  ell(ctx, 0, u * 0.42, u * 0.15, u * 0.48);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  if (mood === 3) {
    ctx.fillStyle = '#9fe3ff';
    ell(ctx, -u * 0.5, -u * 2.0 + ((t * 0.6) % 8) * u * 0.03, u * 0.08, u * 0.13);
    ctx.fill();
  }
  ctx.restore();
}

/** 물개 (엎드린 옆모습). mood 2 = 신남 */
function drawSeal(ctx: C2, x: number, y: number, u: number, face: number, mood: number, t: number, swim = false) {
  ctx.save();
  ctx.translate(x, y);
  if (swim) {
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ell(ctx, 0, 0, u * 1.3, u * 0.32);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(-u * 3, -u * 3, u * 6, u * 3);
    ctx.clip();
    ctx.translate(0, u * 0.45 + Math.sin(t * 0.15) * u * 0.08);
    ctx.rotate(Math.sin(t * 0.1) * 0.15);
  } else {
    ctx.fillStyle = 'rgba(20,70,110,.25)';
    ell(ctx, 0, u * 0.03, u * 1.25, u * 0.22);
    ctx.fill();
  }
  ctx.scale(face, 1);
  ctx.lineWidth = Math.max(1, u * 0.06);
  ctx.strokeStyle = '#3d4658';
  // 꼬리 지느러미
  ctx.fillStyle = '#7a879c';
  ctx.beginPath();
  ctx.moveTo(-u * 0.95, -u * 0.3);
  ctx.lineTo(-u * 1.45, -u * 0.55 + Math.sin(t * 0.2) * u * 0.08);
  ctx.lineTo(-u * 1.35, -u * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const g = ctx.createLinearGradient(0, -u * 1.1, 0, 0);
  g.addColorStop(0, '#bcc7d6');
  g.addColorStop(1, '#7f8ca2');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-u * 1.05, -u * 0.25);
  ctx.quadraticCurveTo(-u * 0.6, -u * 0.95, u * 0.35, -u * 0.95);
  ctx.quadraticCurveTo(u * 1.25, -u * 1.25, u * 1.15, -u * 0.5);
  ctx.quadraticCurveTo(u * 1.05, 0, u * 0.3, 0);
  ctx.lineTo(-u * 0.7, 0);
  ctx.quadraticCurveTo(-u * 1.05, -u * 0.02, -u * 1.05, -u * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 점박이
  ctx.fillStyle = 'rgba(90,100,125,.45)';
  for (const [sx, sy] of [[-0.4, -0.55], [-0.1, -0.7], [0.15, -0.45], [-0.65, -0.35]]) {
    ell(ctx, u * sx, u * sy, u * 0.07, u * 0.05);
    ctx.fill();
  }
  // 앞 지느러미
  ctx.fillStyle = '#8d99ad';
  ell(ctx, u * 0.35, -u * 0.08, u * 0.3, u * 0.12, 0.3);
  ctx.fill();
  ctx.stroke();
  // 얼굴
  ctx.fillStyle = '#d6dee8';
  ell(ctx, u * 0.98, -u * 0.62, u * 0.26, u * 0.2);
  ctx.fill();
  ctx.fillStyle = '#1a1f2c';
  for (const ex of [0.66, 0.9]) {
    ell(ctx, u * ex, -u * 0.9, u * 0.1, u * 0.12);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  for (const ex of [0.69, 0.93]) {
    ell(ctx, u * ex, -u * 0.94, u * 0.035, u * 0.035);
    ctx.fill();
  }
  ctx.fillStyle = '#2a2f3a';
  ell(ctx, u * 1.12, -u * 0.72, u * 0.08, u * 0.06);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,45,60,.7)';
  ctx.lineWidth = Math.max(0.8, u * 0.03);
  for (const k of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(u * 1.05, -u * 0.6);
    ctx.lineTo(u * 1.42, -u * (0.62 + k * 0.1));
    ctx.stroke();
  }
  if (mood === 2) {
    ctx.strokeStyle = '#2a2f3a';
    ctx.lineWidth = Math.max(1, u * 0.05);
    ctx.beginPath();
    ctx.arc(u * 1.0, -u * 0.55, u * 0.1, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  ctx.restore();
}

/** 북극곰 (앉은 모습). mood 1 = 으르렁 */
function drawBear(ctx: C2, x: number, y: number, u: number, face: number, mood: number, t: number, swim = false) {
  ctx.save();
  ctx.translate(x, y);
  if (swim) {
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ell(ctx, 0, 0, u * 1.1, u * 0.3);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(-u * 3, -u * 4, u * 6, u * 4);
    ctx.clip();
    ctx.translate(0, u * 1.4);
  } else {
    ctx.fillStyle = 'rgba(20,70,110,.25)';
    ell(ctx, 0, u * 0.03, u * 1.0, u * 0.22);
    ctx.fill();
  }
  ctx.rotate(Math.sin(t * 0.05) * 0.04);
  ctx.scale(face, 1);
  ctx.strokeStyle = '#8a8070';
  ctx.lineWidth = Math.max(1, u * 0.06);
  const g = ctx.createLinearGradient(-u, -u * 2.4, u, 0);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#e4ddc8');
  ctx.fillStyle = g;
  // 몸
  ell(ctx, 0, -u * 0.8, u * 0.85, u * 0.82);
  ctx.fill();
  ctx.stroke();
  // 발
  ell(ctx, -u * 0.45, -u * 0.12, u * 0.3, u * 0.17);
  ctx.fill();
  ctx.stroke();
  ell(ctx, u * 0.45, -u * 0.12, u * 0.3, u * 0.17);
  ctx.fill();
  ctx.stroke();
  // 머리
  ell(ctx, u * 0.2, -u * 1.85, u * 0.6, u * 0.52);
  ctx.fill();
  ctx.stroke();
  for (const ex of [-0.22, 0.58]) {
    ell(ctx, u * ex, -u * 2.28, u * 0.16, u * 0.16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#d8c8b8';
    ell(ctx, u * ex, -u * 2.28, u * 0.08, u * 0.08);
    ctx.fill();
    ctx.fillStyle = g;
  }
  ctx.fillStyle = '#f2ecdc';
  ell(ctx, u * 0.45, -u * 1.68, u * 0.28, u * 0.2);
  ctx.fill();
  ctx.fillStyle = '#1d1a18';
  ell(ctx, u * 0.62, -u * 1.76, u * 0.1, u * 0.07);
  ctx.fill();
  for (const ex of [0.05, 0.38]) {
    ell(ctx, u * ex, -u * 1.95, u * 0.06, u * 0.075);
    ctx.fill();
  }
  if (mood === 1) {
    ctx.fillStyle = '#7a2a2a';
    ell(ctx, u * 0.5, -u * 1.55, u * 0.12, u * 0.08);
    ctx.fill();
  }
  ctx.restore();
}

/** 빨간 구조선 (뱃머리가 왼쪽) */
function drawBoat(ctx: C2, x: number, y: number, u: number, rock: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(10,60,100,.28)';
  ell(ctx, u * 0.1, u * 0.3, u * 1.7, u * 0.35);
  ctx.fill();
  ctx.rotate(rock);
  // 물 아래 비친 선체
  ctx.fillStyle = 'rgba(150,40,40,.25)';
  ctx.beginPath();
  ctx.moveTo(-u * 1.3, u * 0.25);
  ctx.lineTo(u * 1.25, u * 0.25);
  ctx.lineTo(u * 1.0, u * 0.55);
  ctx.lineTo(-u * 1.0, u * 0.55);
  ctx.closePath();
  ctx.fill();
  // 선체
  const hg = ctx.createLinearGradient(0, -u * 0.5, 0, u * 0.3);
  hg.addColorStop(0, '#ff6a55');
  hg.addColorStop(1, '#c92a22');
  ctx.fillStyle = hg;
  ctx.strokeStyle = '#7a1410';
  ctx.lineWidth = Math.max(1.2, u * 0.04);
  ctx.beginPath();
  ctx.moveTo(-u * 1.62, -u * 0.5);
  ctx.lineTo(u * 1.55, -u * 0.42);
  ctx.quadraticCurveTo(u * 1.5, u * 0.1, u * 1.22, u * 0.27);
  ctx.lineTo(-u * 1.15, u * 0.27);
  ctx.quadraticCurveTo(-u * 1.45, u * 0.05, -u * 1.62, -u * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-u * 1.5, -u * 0.22);
  ctx.lineTo(u * 1.5, -u * 0.16);
  ctx.lineTo(u * 1.47, -u * 0.06);
  ctx.lineTo(-u * 1.42, -u * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1f3f6a';
  ctx.fillRect(-u * 1.1, u * 0.12, u * 2.3, u * 0.14);
  // 둥근 창
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = '#ffe9a8';
    ell(ctx, -u * 0.6 + k * u * 0.55, u * 0.0, u * 0.07, u * 0.07);
    ctx.fill();
  }
  // 갑판 난간
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, u * 0.04);
  ctx.beginPath();
  ctx.moveTo(-u * 1.55, -u * 0.62);
  ctx.lineTo(u * 0.2, -u * 0.58);
  ctx.stroke();
  for (let k = 0; k < 6; k++) {
    ctx.beginPath();
    ctx.moveTo(-u * 1.5 + k * u * 0.33, -u * 0.62);
    ctx.lineTo(-u * 1.5 + k * u * 0.33, -u * 0.48);
    ctx.stroke();
  }
  // 조타실
  const cg = ctx.createLinearGradient(0, -u * 1.4, 0, -u * 0.45);
  cg.addColorStop(0, '#ffffff');
  cg.addColorStop(1, '#dbe6f0');
  ctx.fillStyle = cg;
  ctx.strokeStyle = '#7a8aa0';
  rr(ctx, u * 0.3, -u * 1.35, u * 1.05, u * 0.92, u * 0.1);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff5a4a';
  rr(ctx, u * 0.22, -u * 1.5, u * 1.22, u * 0.2, u * 0.08);
  ctx.fill();
  ctx.fillStyle = '#7fd4f5';
  for (let k = 0; k < 2; k++) {
    rr(ctx, u * 0.42 + k * u * 0.45, -u * 1.18, u * 0.34, u * 0.3, u * 0.06);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.fillRect(u * 0.46, -u * 1.15, u * 0.06, u * 0.24);
  // 구명 튜브
  ctx.lineWidth = u * 0.1;
  for (let k = 0; k < 4; k++) {
    ctx.strokeStyle = k % 2 ? '#ffffff' : '#ff4a3a';
    ctx.beginPath();
    ctx.arc(u * 0.82, -u * 0.62, u * 0.13, (k * Math.PI) / 2, ((k + 1) * Math.PI) / 2);
    ctx.stroke();
  }
  // 돛대·깃발
  ctx.strokeStyle = '#5a6a80';
  ctx.lineWidth = Math.max(1, u * 0.05);
  ctx.beginPath();
  ctx.moveTo(u * 0.85, -u * 1.5);
  ctx.lineTo(u * 0.85, -u * 2.1);
  ctx.stroke();
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.moveTo(u * 0.85, -u * 2.1);
  ctx.quadraticCurveTo(u * 1.1, -u * (2.05 + Math.sin(t * 0.15) * 0.05), u * 1.3, -u * 1.98);
  ctx.lineTo(u * 0.85, -u * 1.85);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** 빙산 */
function drawBerg(ctx: C2, x: number, y: number, r: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(10,60,100,.25)';
  ell(ctx, r * 0.15, r * 0.25, r * 1.2, r * 0.42);
  ctx.fill();
  ctx.fillStyle = 'rgba(140,220,245,.55)';
  ell(ctx, 0, r * 0.12, r * 1.1, r * 0.4);
  ctx.fill();
  const pk = [[-1, 0.05], [-0.85, -0.7], [-0.45, -1.35], [-0.1, -1.0], [0.25, -1.75], [0.6, -1.05], [0.95, -0.4], [1.02, 0.05]];
  ctx.beginPath();
  pk.forEach(([px, py], k) => (k ? ctx.lineTo(px * r, py * r) : ctx.moveTo(px * r, py * r)));
  ctx.quadraticCurveTo(0, r * 0.32, -r, r * 0.05);
  ctx.closePath();
  const g = ctx.createLinearGradient(-r, -r * 1.7, r, r * 0.2);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, '#d9f3fd');
  g.addColorStop(1, '#8fcdea');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#5aa8d0';
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.stroke();
  // 그늘 면
  ctx.fillStyle = 'rgba(90,170,215,.45)';
  ctx.beginPath();
  ctx.moveTo(r * 0.25, -r * 1.75);
  ctx.lineTo(r * 0.6, -r * 1.05);
  ctx.lineTo(r * 0.95, -r * 0.4);
  ctx.lineTo(r * 1.02, r * 0.05);
  ctx.quadraticCurveTo(r * 0.5, r * 0.22, r * 0.15, r * 0.2);
  ctx.lineTo(r * 0.2, -r * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(90,170,215,.3)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, -r * 1.35);
  ctx.lineTo(-r * 0.1, -r * 1.0);
  ctx.lineTo(-r * 0.25, -r * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = Math.max(1.2, r * 0.05);
  ctx.beginPath();
  ctx.ellipse(0, r * 0.08, r * 1.05, r * 0.3, 0, 0.15, Math.PI - 0.15);
  ctx.stroke();
  sparkle(ctx, -r * 0.5, -r * 0.9, r * 0.14, 0.5 + 0.5 * Math.sin(t * 0.08 + x));
  ctx.restore();
}

/** 손가락 (안내) */
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x + k * 0.05, y + press * k * 0.14);
  ctx.rotate(-0.35);
  ctx.fillStyle = 'rgba(20,60,90,.22)';
  ell(ctx, k * 0.25, k * 1.3, k * 0.42, k * 0.12);
  ctx.fill();
  ctx.fillStyle = '#fff4ea';
  ctx.strokeStyle = '#3a2a20';
  ctx.lineWidth = Math.max(2, k * 0.08);
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
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

const evMark = new WeakMap<object, number>();
const bigWord = new WeakMap<object, { text: string; t: number; x: number; y: number; n: number }>();
const demoAt = new WeakMap<object, { x: number; y: number }>();

function drawAll(ctx: C2, s: IceState, w: number, h: number, th: Theme) {
  void th;
  const fx = juice(s), t = s.t, G = s.geo, C = G.cells, d = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const SX = (x: number, y: number) => X(PX(x, y)), SY = (y: number) => Y(PY(y));
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${R(sz)}px system-ui, sans-serif`);
  // ── 사건 → 연출 ──
  {
    const last = evMark.get(s) ?? -1;
    for (const e of s.events) {
      if (e.t <= last) continue;
      const ex = SX(e.x, e.y), ey = SY(e.y);
      const say = (txt: string, col: string, sz: number) => txt && fx.pop(Math.max(R(0.12), Math.min(w - R(0.12), ex)), ey - R(0.06), txt, col, sz);
      switch (e.kind) {
        case 'crack': {
          const n = e.n ?? 4, big = (e.text ?? '').length > 2;
          fx.kick(big ? 11 : 7);
          fx.blink('#ffffff', big ? 0.45 : 0.3);
          fx.ring(ex, ey, '#ffffff', R(big ? 0.3 : 0.18), 5);
          fx.ring(ex, ey, '#bff0ff', R(big ? 0.45 : 0.26), 3);
          fx.burst(ex, ey, '#ffffff', 22 + n, 5.5, 3.2);
          fx.burst(ex, ey, '#9fe6ff', 16, 4, 2.4);
          bigWord.set(s, { text: e.text ?? '쩍!', t: e.t, x: ex, y: ey, n });
          break;
        }
        case 'split':
          fx.kick(4 + Math.min(6, e.n ?? 1));
          break;
        case 'drop': {
          const n = e.n ?? 2, rad = R(0.03 + Math.min(0.12, n * 0.012));
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * TAU + n;
            fx.burst(ex + Math.cos(a) * rad, ey + Math.sin(a) * rad * 0.6 + R(0.02), k % 2 ? '#ffffff' : '#bff0ff', 6 + Math.min(10, n), 3.6, 2.6);
          }
          fx.ring(ex, ey + R(0.02), 'rgba(255,255,255,.9)', rad * 1.8, 4);
          if (e.text) say(e.text, '#ffffff', R(0.07)), fx.kick(5 + Math.min(6, n * 0.6));
          break;
        }
        case 'ride':
          say(e.text ?? '', '#fff6c0', R(0.045));
          break;
        case 'plop':
          fx.burst(ex, ey, '#dff7ff', 22, 4, 2.6);
          fx.ring(ex, ey, '#ffffff', R(0.09), 3);
          say(e.text ?? '퐁!', '#ffffff', R(0.06));
          break;
        case 'seal':
          fx.burst(ex, ey, '#dff7ff', 22, 4, 2.6);
          fx.ring(ex, ey, '#ffffff', R(0.09), 3);
          say(e.text ?? '', '#fff6a0', R(0.055));
          break;
        case 'tip':
          say(e.text ?? '', '#ffe8a0', R(0.055));
          break;
        case 'panic':
          say(e.text ?? '', '#ffb0a0', R(0.06));
          fx.kick(4);
          break;
        case 'dock':
          fx.kick(8);
          fx.ring(ex, ey, '#ffffff', R(0.16), 5);
          fx.burst(ex, ey, '#e9fbff', 26, 5, 3);
          say('쿵!', '#ffffff', R(0.08));
          break;
        case 'hop':
          fx.burst(ex, ey - R(0.04), '#ffe066', 10, 3, 2.2);
          say(e.text ?? '', '#fff3b0', R(0.045));
          break;
        case 'saved':
          fx.kick(6);
          fx.blink('#fff6c0', 0.3);
          for (let k = 0; k < 5; k++) fx.burst(ex + (k - 2) * R(0.06), ey - R(0.05), ['#ffd23a', '#ff6a8a', '#7fe0ff', '#9fff7a', '#ffffff'][k], 14, 5, 2.6);
          fx.pop(w * 0.5, ey - R(0.12), e.text ?? '', '#ffe14d', R(0.08));
          break;
        case 'crunch':
          fx.burst(ex, ey, '#ffffff', 14 + (e.n ?? 1) * 3, 4, 2.6);
          say(e.text ?? '', '#e8fbff', R(0.05));
          break;
        case 'bump':
          if ((e.n ?? 0) >= 2) say(e.text ?? '', '#ffffff', R(0.045)), fx.kick(2);
          break;
        case 'climb':
          say(e.text ?? '', '#e8fbff', R(0.042));
          break;
        case 'whirl':
        case 'sunk':
          fx.ring(ex, ey, '#ffffff', R(0.1), 3);
          say(e.text ?? '', '#e8fbff', R(0.055));
          break;
        case 'water':
          fx.ring(ex, ey, 'rgba(255,255,255,.8)', R(0.05), 2);
          fx.burst(ex, ey, '#dff7ff', 6, 2, 1.8);
          break;
        case 'nope':
          say(e.text ?? '', '#ffd0c0', R(0.045));
          break;
      }
    }
    evMark.set(s, t);
  }

  ctx.save();
  fx.begin(ctx);
  // ═════ 하늘·먼 산·해안 ═════
  {
    const sg = ctx.createLinearGradient(0, 0, 0, Y(Y0));
    sg.addColorStop(0, '#6cc6ff');
    sg.addColorStop(0.6, '#bfe9ff');
    sg.addColorStop(1, '#fff0d2');
    ctx.fillStyle = sg;
    ctx.fillRect(-10, -10, w + 20, Y(Y0) + 12);
    // 해
    ctx.save();
    const sunG = ctx.createRadialGradient(X(0.87), Y(0.125), 0, X(0.87), Y(0.125), R(0.16));
    sunG.addColorStop(0, 'rgba(255,240,180,.85)');
    sunG.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = sunG;
    ctx.fillRect(X(0.6), 0, R(0.42), Y(0.3));
    ctx.fillStyle = '#fff6c4';
    ctx.shadowColor = '#ffd76a';
    ctx.shadowBlur = R(0.05);
    ell(ctx, X(0.87), Y(0.125), R(0.032), R(0.032));
    ctx.fill();
    ctx.restore();
    // 구름
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let k = 0; k < 3; k++) {
      const cx = ((k * 0.37 + t * 0.00012 * (k + 1)) % 1.3) - 0.15, cy = 0.11 + k * 0.012;
      for (const [ox, oy, rr2] of [[0, 0, 0.025], [0.025, -0.006, 0.02], [-0.022, 0.002, 0.017]]) {
        ell(ctx, X(cx + ox), Y(cy + oy), R(rr2), R(rr2 * 0.7));
        ctx.fill();
      }
    }
    // 먼 얼음산
    ctx.fillStyle = '#c6e8f7';
    ctx.beginPath();
    ctx.moveTo(-5, Y(0.19));
    const peaks = [0, 0.14, 0.08, 0.16, 0.22, 0.13, 0.33, 0.17, 0.45, 0.12, 0.58, 0.165, 0.7, 0.135, 0.82, 0.17, 0.95, 0.14, 1.05, 0.19];
    for (let k = 0; k < peaks.length; k += 2) ctx.lineTo(X(peaks[k]), Y(peaks[k + 1]));
    ctx.lineTo(w + 5, Y(0.2));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f4fcff';
    for (let k = 2; k < peaks.length - 2; k += 4) {
      ctx.beginPath();
      ctx.moveTo(X(peaks[k]), Y(peaks[k + 1]));
      ctx.lineTo(X(peaks[k] - 0.035), Y(peaks[k + 1] + 0.022));
      ctx.lineTo(X(peaks[k] + 0.03), Y(peaks[k + 1] + 0.02));
      ctx.closePath();
      ctx.fill();
    }
    // 갈매기
    ctx.strokeStyle = '#4a6a88';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 2; k++) {
      const gx = X(((t * 0.0009 + k * 0.5) % 1.2) - 0.1), gy = Y(0.125 + k * 0.02 + Math.sin(t * 0.03 + k) * 0.006), fl = Math.sin(t * 0.25 + k) * R(0.008);
      ctx.beginPath();
      ctx.moveTo(gx - R(0.016), gy - fl);
      ctx.quadraticCurveTo(gx - R(0.006), gy - R(0.008), gx, gy);
      ctx.quadraticCurveTo(gx + R(0.006), gy - R(0.008), gx + R(0.016), gy - fl);
      ctx.stroke();
    }
  }
  // ═════ 바다 ═════
  const seaTop = SY(0) - R(0.01), seaBot = Y(BAND) + R(0.03);
  {
    const g = ctx.createLinearGradient(0, seaTop, 0, seaBot);
    g.addColorStop(0, '#7fe6ee');
    g.addColorStop(0.4, '#3ec3df');
    g.addColorStop(1, '#1f86c6');
    ctx.fillStyle = g;
    ctx.fillRect(-10, seaTop, w + 20, seaBot - seaTop + 10);
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    for (let k = 0; k < 46; k++) {
      const px = (hsh(k * 3.1) + t * 0.00015 * (1 + (k % 3))) % 1, py = hsh(k * 7.7) * H, sc = scl(py);
      const x0 = SX(px, py), y0 = SY(py), ww = R(0.03) * sc;
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 0.04 + k);
      ctx.beginPath();
      ctx.moveTo(x0 - ww, y0);
      ctx.quadraticCurveTo(x0, y0 + R(0.008), x0 + ww, y0);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let k = 0; k < 14; k++) {
      const px = hsh(k * 5.3 + 1), py = hsh(k * 9.1 + 2) * H;
      sparkle(ctx, SX(px, py), SY(py), R(0.009), Math.sin(t * 0.06 + k * 1.7) * 0.9);
    }
  }
  // 물살 (화살표)
  for (const f of G.flows) {
    const pts = f.p;
    let L = 0;
    const segs: number[] = [];
    for (let k = 0; k + 1 < pts.length; k++) segs.push(Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1])), (L += segs[k]);
    // 흐르는 띠
    ctx.strokeStyle = 'rgba(255,255,255,.1)';
    ctx.lineWidth = R(f.w * 0.75 * KY);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach(([x, y], k) => (k ? ctx.lineTo(SX(x, y), SY(y)) : ctx.moveTo(SX(x, y), SY(y))));
    ctx.stroke();
    const gap = 0.085, off = (t * f.v * 0.9) % gap;
    for (let dd = off; dd < L; dd += gap) {
      let k = 0, rem = dd;
      while (k < segs.length - 1 && rem > segs[k]) (rem -= segs[k]), k++;
      const u = Math.min(1, rem / segs[k]), x = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * u, y = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * u;
      const tx = (pts[k + 1][0] - pts[k][0]) / segs[k], ty = (pts[k + 1][1] - pts[k][1]) / segs[k];
      const a = Math.min(1, dd / 0.08, (L - dd) / 0.08);
      const cx = SX(x, y), cy = SY(y), sz = R(0.022);
      const ax = tx, ay = ty * KY, al = Math.hypot(ax, ay) || 1, ux = ax / al, uy = ay / al;
      ctx.globalAlpha = 0.75 * a;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = R(0.009);
      ctx.beginPath();
      ctx.moveTo(cx - ux * sz - uy * sz * 0.8, cy - uy * sz + ux * sz * 0.8);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx - ux * sz + uy * sz * 0.8, cy - uy * sz - ux * sz * 0.8);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // 소용돌이
  if (G.whirl) {
    const wl = G.whirl, cx = SX(wl.x, wl.y), cy = SY(wl.y), rx = R(wl.r), ry = R(wl.r * KY);
    const wg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    wg.addColorStop(0, 'rgba(10,50,110,.55)');
    wg.addColorStop(0.5, 'rgba(20,90,150,.25)');
    wg.addColorStop(1, 'rgba(40,140,200,0)');
    ctx.fillStyle = wg;
    ell(ctx, cx, cy, rx, ry);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = R(0.007);
    for (let arm = 0; arm < 3; arm++) {
      ctx.beginPath();
      for (let k = 0; k <= 24; k++) {
        const u = k / 24, a = (arm * TAU) / 3 + t * 0.05 + u * 5, q = 1 - u * 0.9;
        const x = cx + Math.cos(a) * rx * q, y = cy + Math.sin(a) * ry * q;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }

  // ═════ 얼음 ═════
  const topG = ctx.createLinearGradient(0, SY(0), w, SY(H));
  topG.addColorStop(0, '#ffffff');
  topG.addColorStop(0.5, '#eaf9ff');
  topG.addColorStop(1, '#cdeefa');
  const thickG = ctx.createLinearGradient(0, SY(0), w, SY(H));
  thickG.addColorStop(0, '#d8f1fc');
  thickG.addColorStop(1, '#a5d9f1');
  const T0 = R(0.032), TT = R(0.048);
  /** 한 덩어리(붙은 얼음 또는 조각) 그리기 */
  const drawBody = (cells: number[], body: number, p: Piece | null) => {
    const ca = p ? Math.cos(p.a) : 1, sa = p ? Math.sin(p.a) : 0;
    let bob = 0, skew = 0, sink = 0;
    if (p) {
      const age = t - p.born;
      bob = Math.sin(t * 0.07 + p.id * 1.7) * R(0.003) + R(0.024) * Math.exp(-age / 34) * Math.sin(age * 0.3 + 0.6);
      if (p.tip >= 0) skew = Math.sin((p.tip / TIP_T) * Math.PI * 0.5) * 0.42 * (p.id % 2 ? 1 : -1);
      if (p.sink >= 0) sink = p.sink / SINK_T;
      if (p.panic >= 0) bob += Math.sin(t * 1.3) * R(0.003);
    }
    const csx = p ? SX(p.x, p.y) : 0;
    const pts = new Map<number, number[]>();
    for (const ci of cells) {
      const c = C[ci], n = c.poly.length / 2, out: number[] = [];
      for (let k = 0; k < n; k++) {
        let wx = c.poly[k * 2], wy = c.poly[k * 2 + 1];
        if (p) {
          const dx = wx - p.ox, dy = wy - p.oy;
          wx = p.x + ca * dx - sa * dy;
          wy = p.y + sa * dx + ca * dy;
          if (sink) (wx = p.x + (wx - p.x) * (1 - sink * 0.5)), (wy = p.y + (wy - p.y) * (1 - sink * 0.5));
        }
        let sx = SX(wx, wy), sy = SY(wy) + bob + sink * R(0.03);
        if (skew) sy += (sx - csx) * skew;
        out.push(sx, sy);
      }
      pts.set(ci, out);
    }
    if (sink) ctx.globalAlpha = 1 - sink * 0.8;
    // 물에 비친 그림자
    ctx.fillStyle = 'rgba(15,70,120,.2)';
    for (const ci of cells) {
      const q = pts.get(ci)!;
      ctx.beginPath();
      for (let k = 0; k < q.length; k += 2) ctx.lineTo(q[k] + R(0.012), q[k + 1] + R(0.034));
      ctx.closePath();
      ctx.fill();
    }
    // 옆면 (두께) + 물에 잠긴 부분
    const isIn = (j: number) => j >= 0 && (body === FIXED ? s.owner[j] === FIXED : s.owner[j] === body);
    for (const ci of cells) {
      const c = C[ci], q = pts.get(ci)!, n = q.length / 2, T = c.thick ? TT : T0;
      for (let k = 0; k < n; k++) {
        if (c.nb[k] === LAND || isIn(c.nb[k])) continue;
        const ax = q[k * 2], ay = q[k * 2 + 1], bx = q[((k + 1) % n) * 2], by = q[((k + 1) % n) * 2 + 1];
        if (bx > ax + 0.5) continue;
        ctx.fillStyle = 'rgba(120,215,240,.35)';
        ctx.beginPath();
        ctx.moveTo(ax, ay + T);
        ctx.lineTo(bx, by + T);
        ctx.lineTo(bx, by + T + R(0.02));
        ctx.lineTo(ax, ay + T + R(0.02));
        ctx.closePath();
        ctx.fill();
        const sg = ctx.createLinearGradient(0, Math.min(ay, by), 0, Math.max(ay, by) + T);
        sg.addColorStop(0, c.thick ? '#8fd2ee' : '#b4ecfa');
        sg.addColorStop(1, c.thick ? '#3a95c4' : '#58bde0');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx, by + T);
        ctx.lineTo(ax, ay + T);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.75)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(ax, ay + T + 0.5);
        ctx.lineTo(bx, by + T + 0.5);
        ctx.stroke();
      }
    }
    // 윗면
    for (const ci of cells) {
      const c = C[ci], q = pts.get(ci)!;
      ctx.fillStyle = c.thick ? thickG : topG;
      ctx.strokeStyle = c.thick ? thickG : topG;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let k = 0; k < q.length; k += 2) ctx.lineTo(q[k], q[k + 1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // 결 무늬 · 두꺼운 얼음 층
      if (c.thick) {
        ctx.strokeStyle = 'rgba(70,150,200,.28)';
        ctx.lineWidth = 1;
        const cx = q.reduce((a, v, k) => (k % 2 ? a : a + v), 0) / (q.length / 2), cy = q.reduce((a, v, k) => (k % 2 ? a + v : a), 0) / (q.length / 2);
        for (let j = -1; j <= 1; j++) {
          ctx.beginPath();
          ctx.moveTo(cx - R(0.035), cy + j * R(0.016));
          ctx.quadraticCurveTo(cx, cy + j * R(0.016) - R(0.006), cx + R(0.035), cy + j * R(0.016));
          ctx.stroke();
        }
      }
    }
    // 바깥 테두리 (윗면): 안쪽 물빛 테 + 진한 선
    ctx.lineCap = 'round';
    for (const pass of [0, 1]) {
      ctx.strokeStyle = pass ? 'rgba(40,125,185,.8)' : 'rgba(130,210,240,.45)';
      ctx.lineWidth = pass ? R(0.0045) : R(0.018);
      for (const ci of cells) {
        const c = C[ci], q = pts.get(ci)!, n = q.length / 2;
        for (let k = 0; k < n; k++) {
          if (c.nb[k] === LAND || isIn(c.nb[k])) continue;
          ctx.beginPath();
          ctx.moveTo(q[k * 2], q[k * 2 + 1]);
          ctx.lineTo(q[((k + 1) % n) * 2], q[((k + 1) % n) * 2 + 1]);
          ctx.stroke();
        }
      }
    }
    // 안쪽 결: 보통 결(아주 흐리게) · 약한 결(반짝) · 금(깨졌지만 아직 붙음)
    for (const ci of cells) {
      const c = C[ci], q = pts.get(ci)!, n = q.length / 2;
      for (let k = 0; k < n; k++) {
        const j = c.nb[k], b = c.eb[k];
        if (b < 0 || j < ci || !isIn(j)) continue;
        const ax = q[k * 2], ay = q[k * 2 + 1], bx = q[((k + 1) % n) * 2], by = q[((k + 1) % n) * 2 + 1];
        const bd = G.bonds[b];
        if (s.broken[b]) {
          ctx.strokeStyle = '#2a6f9e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo((ax + bx) / 2 + (ay - by) * 0.08, (ay + by) / 2 + (bx - ax) * 0.08);
          ctx.lineTo(bx, by);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.8)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(ax + 1, ay + 1);
          ctx.lineTo((ax + bx) / 2 + (ay - by) * 0.08 + 1, (ay + by) / 2 + (bx - ax) * 0.08 + 1);
          ctx.lineTo(bx + 1, by + 1);
          ctx.stroke();
        } else if (bd.weak) {
          const gl = 0.7 + 0.25 * Math.sin(t * 0.08 + b * 0.7);
          ctx.lineCap = 'round';
          ctx.strokeStyle = `rgba(90,200,255,${gl * 0.5})`;
          ctx.lineWidth = R(0.026);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
          ctx.strokeStyle = `rgba(20,115,190,${gl})`;
          ctx.lineWidth = R(0.01);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.95)';
          ctx.lineWidth = R(0.0025);
          ctx.beginPath();
          ctx.moveTo(ax, ay + R(0.004));
          ctx.lineTo(bx, by + R(0.004));
          ctx.stroke();
          // 결을 따라 흐르는 반짝
          const u = ((t * 0.012 + hsh(b)) % 1);
          sparkle(ctx, ax + (bx - ax) * u, ay + (by - ay) * u, R(0.011), 0.9 * Math.sin(u * Math.PI));
        } else {
          ctx.strokeStyle = 'rgba(120,190,225,.16)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
      }
    }
    // 눈 더미 · 반짝
    for (const ci of cells) {
      const q = pts.get(ci)!, n = q.length / 2;
      let cx = 0, cy = 0;
      for (let k = 0; k < n; k++) (cx += q[k * 2]), (cy += q[k * 2 + 1]);
      cx /= n;
      cy /= n;
      const hv = hsh(ci * 13 + s.stage);
      if (hv < 0.35 && !C[ci].thick) {
        ctx.fillStyle = 'rgba(255,255,255,.95)';
        ell(ctx, cx + (hv - 0.17) * R(0.12), cy + R(0.012), R(0.026), R(0.01));
        ctx.fill();
        ctx.fillStyle = 'rgba(150,200,230,.35)';
        ell(ctx, cx + (hv - 0.17) * R(0.12) + R(0.004), cy + R(0.018), R(0.022), R(0.005));
        ctx.fill();
      }
      sparkle(ctx, cx + (hsh(ci * 7) - 0.5) * R(0.06), cy + (hsh(ci * 11) - 0.5) * R(0.04), R(0.012), Math.sin(t * 0.05 + ci * 2.3) * 1.1 - 0.1);
    }
    ctx.globalAlpha = 1;
    return { bob, skew, csx };
  };

  /** 탄 것 그리기 */
  const U = R(0.054);
  const drawRider = (r: Rider, extraX = 0, extraY = 0, skew = 0, csx = 0) => {
    const [x, y] = riderPos(s, r);
    let sx = SX(x, y) + extraX, sy = SY(y) + extraY;
    if (skew) sy += (sx - csx) * skew;
    const sc = scl(y), ph = r.id * 1.7;
    if (r.st === HOP) {
      const u = Math.min(1, (t - r.hopAt) / HOP_T);
      sy -= Math.sin(u * Math.PI) * R(0.1);
    }
    const swim = r.st === SWIM || r.st === SEA;
    if (r.k === PEN) drawPenguin(ctx, sx, sy, U * sc * (r.st === BOAT ? 0.78 : 1), r.face, r.st === BOAT ? 2 : swim ? (r.moodT > 0 ? 3 : 0) : r.mood, t, ph, swim);
    else if (r.k === SEAL) drawSeal(ctx, sx, sy, U * sc * 1.05, r.face, r.st === SEA ? 2 : r.mood, t, swim);
    else drawBear(ctx, sx, sy, U * sc * 1.25, r.face, r.mood, t, swim);
    if (r.k === SEAL && r.st === SEA && (t + r.id * 30) % 90 < 40) {
      ctx.fillStyle = '#ffffff';
      font(0.04, 900);
      ctx.textAlign = 'center';
      ctx.fillText('♪', sx + R(0.05), sy - R(0.06) - ((t % 90) / 90) * R(0.03));
    }
  };

  // 붙은 얼음 (해안)
  const fixedCells = C.map((_, i) => i).filter((i) => s.owner[i] === FIXED);
  drawBody(fixedCells, FIXED, null);
  // 해안 눈둑 (얼음 뒤쪽 끝을 덮는다)
  {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-5, Y(0.17));
    for (let k = 0; k <= 20; k++) {
      const x = k / 20;
      ctx.lineTo(X(x), Y(0.198 + Math.sin(k * 1.7) * 0.006 + hsh(k) * 0.006));
    }
    ctx.lineTo(w + 5, Y(0.17));
    ctx.lineTo(w + 5, Y(0.155));
    ctx.lineTo(-5, Y(0.155));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(150,200,230,.5)';
    ctx.beginPath();
    for (let k = 0; k <= 20; k++) {
      const x = k / 20;
      ctx.lineTo(X(x), Y(0.198 + Math.sin(k * 1.7) * 0.006 + hsh(k) * 0.006));
    }
    for (let k = 20; k >= 0; k--) {
      const x = k / 20;
      ctx.lineTo(X(x), Y(0.203 + Math.sin(k * 1.7) * 0.006 + hsh(k) * 0.006));
    }
    ctx.closePath();
    ctx.fill();
    // 이글루
    const ix = X(0.1), iy = Y(0.19), ir = R(0.05);
    const ig = ctx.createLinearGradient(ix - ir, iy - ir, ix + ir, iy);
    ig.addColorStop(0, '#ffffff');
    ig.addColorStop(1, '#bfe2f2');
    ctx.fillStyle = ig;
    ctx.strokeStyle = '#8cc4dc';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(ix, iy, ir, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    for (const yy of [0.35, 0.7]) {
      ctx.beginPath();
      const hh = ir * yy, half = Math.sqrt(ir * ir - hh * hh);
      ctx.moveTo(ix - half, iy - hh);
      ctx.lineTo(ix + half, iy - hh);
      ctx.stroke();
    }
    ctx.fillStyle = '#4a7a9a';
    ctx.beginPath();
    ctx.arc(ix + ir * 0.45, iy, ir * 0.3, Math.PI, 0);
    ctx.fill();
    // 깃발
    ctx.strokeStyle = '#7a5a3a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X(0.2), Y(0.195));
    ctx.lineTo(X(0.2), Y(0.135));
    ctx.stroke();
    ctx.fillStyle = '#ff5a4a';
    ctx.beginPath();
    ctx.moveTo(X(0.2), Y(0.135));
    ctx.quadraticCurveTo(X(0.23), Y(0.14 + Math.sin(t * 0.12) * 0.004), X(0.25), Y(0.145));
    ctx.lineTo(X(0.2), Y(0.158));
    ctx.closePath();
    ctx.fill();
    // 구경하는 아기 펭귄 (구조될 때 폴짝)
    const cheer = s.riders.some((r) => r.st === HOP) || s.winT >= 0 ? 2 : s.pending ? 1 : 0;
    for (let k = 0; k < 3; k++) drawPenguin(ctx, X(0.66 + k * 0.07), Y(0.2), R(0.017), k % 2 ? -1 : 1, cheer, t, k * 2.3);
  }
  for (const r of s.riders) if (r.st === ON && s.owner[r.cell] === FIXED) drawRider(r);

  // 움직이는 것들: 조각·빙산·배·헤엄치는 동물 (앞뒤 순서로)
  const items: { y: number; f: () => void }[] = [];
  for (const p of s.pieces) {
    items.push({
      y: p.y,
      f: () => {
        const info = drawBody(p.cells, p.id, p);
        const rs = ridersOn(s, p.id).sort((a, b) => riderPos(s, a)[1] - riderPos(s, b)[1]);
        const slide = p.tip >= 0 ? (p.tip / TIP_T) ** 2 * R(0.05) * (p.id % 2 ? 1 : -1) : 0;
        for (const r of rs) drawRider(r, slide, info.bob, info.skew, info.csx);
      },
    });
  }
  for (const b of G.bergs) items.push({ y: b.y, f: () => drawBerg(ctx, SX(b.x, b.y), SY(b.y), R(b.r) * 1.05, t) });
  const docking = s.pieces.some((p) => p.dock >= 0 && t - p.dock < 30);
  items.push({
    y: G.boat.y,
    f: () => {
      const bt = G.boat, rock = Math.sin(t * 0.05) * 0.025 + (docking ? Math.sin(t * 0.6) * 0.05 : 0);
      drawBoat(ctx, SX(bt.x, bt.y), SY(bt.y) + Math.sin(t * 0.06) * R(0.003), R(0.1), rock, t);
      for (const r of s.riders) if (r.st === BOAT) drawRider(r);
    },
  });
  for (const r of s.riders) if (r.st === SWIM || r.st === SEA || r.st === HOP) items.push({ y: riderPos(s, r)[1] + (r.st === HOP ? 1 : 0), f: () => drawRider(r) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();

  // 물보라: 떨어진 조각·빠진 동물·배에 닿은 조각 둘레로 물방울이 솟았다 떨어진다
  for (const e of s.events) {
    const age = t - e.t, big = e.kind === 'drop' ? Math.min(1.6, 0.6 + (e.n ?? 2) * 0.1) : e.kind === 'dock' ? 1.2 : e.kind === 'plop' || e.kind === 'seal' ? 0.7 : 0;
    if (!big || age < 0 || age > 36) continue;
    const cx = SX(e.x, e.y), cy = SY(e.y) + R(0.02), u = age / 36;
    ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - u)})`;
    ctx.lineWidth = R(0.008) * (1 - u) + 1;
    ell(ctx, cx, cy, R(0.06 * big) * (0.6 + u), R(0.022 * big) * (0.6 + u));
    ctx.stroke();
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * TAU + e.t * 0.37, sp = (0.6 + hsh(k + e.t) * 0.6) * big;
      const dx = Math.cos(a) * R(0.09) * sp * u, dy = Math.sin(a) * R(0.035) * sp * u - Math.sin(u * Math.PI) * R(0.09) * sp;
      ctx.globalAlpha = 1 - u * 0.6;
      ctx.fillStyle = k % 3 ? '#ffffff' : '#9fe6ff';
      ell(ctx, cx + dx, cy + dy, R(0.009) * (1 - u * 0.5), R(0.011) * (1 - u * 0.5));
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // 산산조각 파편
  for (const sh of s.shards) {
    const sx = SX(sh.x, sh.y), sy = SY(sh.y) - sh.z * w;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(sh.a);
    ctx.globalAlpha = Math.min(1, sh.life / 40);
    ctx.fillStyle = '#f2fcff';
    ctx.strokeStyle = '#6ac0e4';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let k = 0; k < sh.pts.length; k += 2) ctx.lineTo(sh.pts[k] * w * 0.8, sh.pts[k + 1] * w * KY * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // 금이 달리는 중 (멈칫)
  if (s.pending) {
    const pl = s.pending, age = t - pl.t, k = Math.min(1, age / (CRACK_T - 3));
    const tf = (bx: number, by: number) => {
      const [wx, wy] = toWorld(s, pl.body, bx, by);
      return [SX(wx, wy), SY(wy)];
    };
    const [px, py] = tf(pl.bx, pl.by);
    const c0 = C[pl.c0], n = c0.poly.length / 2;
    ctx.lineCap = 'round';
    for (let j = 0; j < n; j++) {
      const [vx, vy] = tf(c0.poly[j * 2], c0.poly[j * 2 + 1]);
      ctx.strokeStyle = '#1f6a9c';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + (vx - px) * Math.min(1, k * 2), py + (vy - py) * Math.min(1, k * 2));
      ctx.stroke();
    }
    pl.bonds.forEach((b, j) => {
      const bd = G.bonds[b], u0 = pl.times[j] * 0.75, uu = Math.max(0, Math.min(1, (k - u0) / 0.25));
      if (uu <= 0) return;
      const [ax, ay] = tf(G.vx[bd.u], G.vy[bd.u]), [bx, by] = tf(G.vx[bd.v], G.vy[bd.v]);
      ctx.strokeStyle = bd.weak ? '#145a8a' : '#2a78aa';
      ctx.lineWidth = bd.weak ? 3 : 2.2;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + (bx - ax) * uu, ay + (by - ay) * uu);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.95)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ax + 1, ay + 1);
      ctx.lineTo(ax + (bx - ax) * uu + 1, ay + (by - ay) * uu + 1);
      ctx.stroke();
    });
    // 톡 자리 별빛
    ctx.save();
    ctx.globalAlpha = 1 - k * 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#bff0ff';
    ctx.shadowBlur = R(0.04);
    starPath(ctx, px, py, R(0.035) * (1.3 - k * 0.5));
    ctx.fill();
    ctx.restore();
  }
  // 큰 의성어
  {
    const bw = bigWord.get(s);
    if (bw && t - bw.t < 46) {
      const age = t - bw.t, pop = age < 6 ? 0.5 + age / 6 : 1 + Math.max(0, 0.15 - (age - 6) * 0.02), a = Math.min(1, (46 - age) / 14);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(Math.max(R(0.2), Math.min(w - R(0.2), bw.x)), bw.y - R(0.1) - age * 0.4);
      ctx.rotate(-0.12);
      ctx.scale(pop, pop);
      font(bw.text.length > 2 ? 0.12 : 0.11, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = R(0.02);
      ctx.strokeStyle = '#13507e';
      ctx.strokeText(bw.text, 0, 0);
      const tg = ctx.createLinearGradient(0, -R(0.05), 0, R(0.05));
      tg.addColorStop(0, '#ffffff');
      tg.addColorStop(1, '#a8ecff');
      ctx.fillStyle = tg;
      ctx.fillText(bw.text, 0, 0);
      ctx.restore();
    }
  }
  // NEW 스포트라이트
  if (s.spot && s.phase === 'play' && t - s.spot.t < SPOT_T) {
    const sp = s.spot, a = Math.min(1, (SPOT_T - (t - sp.t)) / 30), pul = 1 + 0.05 * Math.sin(t * 0.2);
    const cx = SX(sp.x, sp.y), cy = SY(sp.y), rx = R(sp.r) * pul, ry = R(sp.r * 0.8) * pul;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#ffd23a';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 7]);
    ctx.lineDashOffset = -t * 0.8;
    ell(ctx, cx, cy, rx, ry);
    ctx.stroke();
    ctx.setLineDash([]);
    font(0.036, 900);
    const lab = `NEW  ${sp.label}`, tw = ctx.measureText(lab).width + R(0.05);
    const lx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, cx)), ly = cy - ry - R(0.03);
    ctx.fillStyle = '#ff5a3a';
    rr(ctx, lx - tw / 2, ly - R(0.024), tw, R(0.048), R(0.024));
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lab, lx, ly + 1);
    ctx.restore();
  }
  // 첫 판 안내: 손가락이 빙판 한 곳을 톡
  if (s.stage === 0 && s.firstTap < 0 && s.phase === 'play') {
    let dm = demoAt.get(s.geo);
    if (!dm) {
      const p = plan(s);
      dm = p ?? { x: 0.4, y: 0.6 };
      demoAt.set(s.geo, dm);
    }
    const cyc = t % 80, press = cyc < 10 ? cyc / 10 : cyc < 22 ? 1 - (cyc - 10) / 12 : 0;
    const hx = SX(dm.x, dm.y), hy = SY(dm.y);
    if (cyc >= 10 && cyc < 40) {
      const u = (cyc - 10) / 30;
      ctx.strokeStyle = `rgba(255,255,255,${1 - u})`;
      ctx.lineWidth = 3;
      ell(ctx, hx, hy, R(0.03 + u * 0.08), R((0.03 + u * 0.08) * 0.8));
      ctx.stroke();
    }
    drawHand(ctx, hx, hy, R(0.085), press);
    font(0.042, 900);
    const txt = '👆 얼음을 톡! 깨서 보내요', tw = ctx.measureText(txt).width + R(0.06), bx = Math.max(tw / 2 + 6, Math.min(w - tw / 2 - 6, hx)), by = hy - R(0.11);
    ctx.fillStyle = 'rgba(255,255,255,.96)';
    rr(ctx, bx - tw / 2, by - R(0.032), tw, R(0.064), R(0.032));
    ctx.fill();
    ctx.strokeStyle = '#2a8ac0';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#16507e';
    ctx.fillText(txt, bx, by + 1);
  }
  ctx.restore();

  // ═════ 위 띠: 판 · 하트 · 별 ═════
  {
    const hb = R(0.088);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    rr(ctx, R(0.015), R(0.01), w - R(0.03), hb - R(0.012), R(0.035));
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,130,190,.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const cy = R(0.01) + (hb - R(0.012)) / 2;
    ctx.fillStyle = '#2a92d0';
    ell(ctx, R(0.06), cy, R(0.028), R(0.028));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(s.stage + 1), R(0.06), cy + 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#123049';
    font(0.04, 900);
    ctx.fillText(d.name, R(0.1), cy + 1, R(0.36));
    const nw = Math.min(R(0.36), ctx.measureText(d.name).width);
    font(0.032, 700);
    ctx.fillStyle = '#6a8aa8';
    ctx.fillText(` / ${STAGE_COUNT}`, R(0.1) + nw, cy + 2);
    ctx.textAlign = 'right';
    font(0.04, 900);
    const st = String(s.stars), sw = ctx.measureText(st).width;
    ctx.fillStyle = '#d88a08';
    ctx.fillText(st, w - R(0.04), cy + 1);
    starPath(ctx, w - R(0.04) - sw - R(0.026), cy, R(0.021));
    ctx.fillStyle = '#ffd23a';
    ctx.fill();
    ctx.strokeStyle = '#9a5a08';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    for (let j = 0; j < 3; j++) {
      const hx = w - R(0.04) - sw - R(0.09) - j * R(0.052);
      heartPath(ctx, hx, cy, R(0.018));
      ctx.fillStyle = 2 - j < s.hearts ? '#ff4a5e' : 'rgba(60,90,120,.18)';
      ctx.fill();
      ctx.strokeStyle = 2 - j < s.hearts ? '#9a1a2a' : 'rgba(60,90,120,.3)';
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
  }
  // ═════ 판 카드 · 결과 ═════
  {
    let head = '', sub = '', a = 0, age = 0;
    const cy = Y(0.42);
    if (s.phase === 'result') {
      age = s.pt;
      a = Math.min(1, age / 8);
    } else if (s.banner && t - s.banner.t < BANNER_T) {
      age = t - s.banner.t;
      a = Math.min(1, age / 8, (BANNER_T - age) / 25);
      (head = s.banner.head), (sub = s.banner.sub);
    }
    if (s.phase === 'result' && a > 0) {
      const ok = s.ok, L = starList(s.stage);
      const cw = R(0.82), ch = ok ? R(0.2) + L.length * R(0.05) : R(0.24);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cy);
      const pop = Math.min(1, 0.6 + age / 12);
      ctx.scale(pop, pop);
      ctx.fillStyle = 'rgba(10,40,70,.3)';
      rr(ctx, -cw / 2 + 3, -ch / 2 + 6, cw, ch, R(0.04));
      ctx.fill();
      const cg = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2);
      cg.addColorStop(0, '#ffffff');
      cg.addColorStop(1, ok ? '#e2f6ff' : '#eef0f6');
      ctx.fillStyle = cg;
      rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.04));
      ctx.fill();
      ctx.strokeStyle = ok ? '#2a92d0' : '#8a9ab0';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      font(0.06, 900);
      ctx.fillStyle = ok ? '#e8412f' : '#4a5a78';
      ctx.fillText(ok ? (s.won ? '모두 구조 완료!' : '구조 성공!') : '앗, 구조 실패…', 0, -ch / 2 + R(0.055), cw - R(0.06));
      if (ok) {
        const nS = s.starOk.length;
        for (let j = 0; j < nS; j++) {
          const ag = s.pt - (14 + j * 14), sx = (j - (nS - 1) / 2) * R(0.1), sy = -ch / 2 + R(0.125);
          const ps = ag < 0 ? 0.8 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
          starPath(ctx, sx, sy, R(0.036) * ps);
          ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(60,80,110,.15)';
          ctx.fill();
          ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#9a5a08' : 'rgba(60,80,110,.3)';
          ctx.lineWidth = 1.6;
          ctx.stroke();
          if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(w / 2 + sx, cy + sy, '#ffd23a', 16, 3, 2.4);
        }
        font(0.036, 800);
        L.forEach((txt, j) => {
          const yy = -ch / 2 + R(0.2) + j * R(0.05);
          ctx.fillStyle = s.starOk[j] ? '#1d5a8a' : '#9aa8b8';
          ctx.fillText(`${s.starOk[j] ? '★' : '☆'} ${txt}`, 0, yy, cw - R(0.06));
        });
      } else {
        font(0.038, 800);
        ctx.fillStyle = '#4a5a78';
        ctx.fillText(s.why, 0, -R(0.005), cw - R(0.06));
        font(0.035, 800);
        ctx.fillStyle = '#d0402a';
        ctx.fillText(s.hearts > 0 ? '하트 -1 · 같은 판 다시' : '하트가 없어요 — 끝', 0, R(0.06), cw - R(0.06));
      }
      ctx.restore();
    } else if (head && a > 0) {
      ctx.save();
      ctx.globalAlpha = a;
      font(0.05, 900);
      const w1 = ctx.measureText(head).width;
      font(0.034, 800);
      const w2 = ctx.measureText(sub).width;
      const cw = Math.min(w - R(0.04), Math.max(w1, w2) + R(0.08)), ch = R(0.13);
      const by = Y(0.29);
      ctx.translate(w / 2, by);
      ctx.fillStyle = 'rgba(10,40,70,.25)';
      rr(ctx, -cw / 2 + 2, -ch / 2 + 4, cw, ch, R(0.035));
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.96)';
      rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.035));
      ctx.fill();
      ctx.strokeStyle = '#2a92d0';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      font(0.05, 900);
      ctx.fillStyle = '#16507e';
      ctx.fillText(head, 0, -R(0.026), cw - R(0.04));
      font(0.034, 800);
      ctx.fillStyle = sub.startsWith('NEW') ? '#d0402a' : '#3a6a90';
      ctx.fillText(sub, 0, R(0.032), cw - R(0.04));
      ctx.restore();
    }
  }
  // ═════ 아래 띠: 톡 · 별 조건 · 안내 ═════
  {
    const ty = BAND, tb = h / w;
    const g = ctx.createLinearGradient(0, Y(ty), 0, Y(tb));
    g.addColorStop(0, 'rgba(16,62,98,.95)');
    g.addColorStop(1, 'rgba(10,40,70,.98)');
    ctx.fillStyle = g;
    rr(ctx, 0, Y(ty), w, Y(tb - ty) + 4, R(0.03));
    ctx.fill();
    const r1 = Y(ty + 0.038);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e6f8ff';
    font(0.038, 900);
    ctx.fillText('톡', X(0.03), r1);
    const dx0 = X(0.1), dstep = R(0.052);
    for (let k = 0; k < d.taps; k++) {
      const cx = dx0 + k * dstep, used = k < s.used;
      // 얼음 송곳 아이콘
      ctx.save();
      ctx.translate(cx, r1);
      ctx.rotate(0.6);
      ctx.fillStyle = used ? 'rgba(255,255,255,.18)' : '#cfefff';
      ctx.beginPath();
      ctx.moveTo(0, -R(0.022));
      ctx.lineTo(R(0.009), R(0.004));
      ctx.lineTo(-R(0.009), R(0.004));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = used ? 'rgba(255,255,255,.18)' : '#ffb23a';
      rr(ctx, -R(0.007), R(0.004), R(0.014), R(0.02), R(0.004));
      ctx.fill();
      ctx.restore();
    }
    ctx.textAlign = 'right';
    font(0.036, 800);
    ctx.fillStyle = s.taps > 0 ? '#bfeaf2' : '#ffb3a8';
    ctx.fillText(`${s.taps}번 남음`, X(0.97), r1);
    // 별 조건
    const L = starList(s.stage), pens = s.riders.filter((r) => r.k === PEN), inBoat = pens.filter((r) => r.st === BOAT).length;
    const okk = L.map((_, k) => (s.phase === 'result' && s.ok ? s.starOk[k] : k === 0 ? inBoat === pens.length : k === 1 ? false : d.star3 === 'seal' ? s.sealIn : false));
    const bad = L.map((_, k) => (k === 0 ? s.phase === 'result' && !s.ok : k === 1 ? s.falls > 0 : d.star3 === 'par' ? s.used > d.par : false));
    L.forEach((txt, k) => {
      const yy = Y(ty + 0.092 + k * 0.047);
      ctx.textAlign = 'left';
      starPath(ctx, X(0.05), yy, R(0.017));
      ctx.fillStyle = okk[k] ? '#ffd23a' : bad[k] ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.55)';
      ctx.fill();
      font(0.036, 800);
      ctx.fillStyle = okk[k] ? '#ffe9a0' : bad[k] ? 'rgba(255,255,255,.4)' : '#eaf8ff';
      const extra = k === 0 ? `  (${inBoat}/${pens.length})` : bad[k] ? '  — 놓쳤어요' : '';
      ctx.fillText(txt + extra, X(0.085), yy, X(0.88));
    });
    // 안내 한 줄
    let hint = d.hint;
    const first = s.stage === 0 && s.firstTap < 0 && s.phase === 'play';
    if (first) hint = '👆 반짝이는 결 근처를 톡! 금이 쭉 달려요';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '빙판 구조대 최고!' : '다음 판엔 새것이 나와요') : '결을 잘 보고 다시 톡!';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
    font(0.036, 900);
    ctx.fillText(hint, w / 2, Y(tb - 0.034), w - R(0.05));
  }
}

/** 시험·스크린샷용: k판(0부터)으로 바로 */
export function jumpTo(s: IceState, k: number) {
  s.stage = k;
  s.again = false;
  newStage(s);
}
