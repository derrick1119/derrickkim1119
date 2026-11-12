/**
 * 햇빛 거울 정원 (24라운드: 새 장르) — 빛 반사 × 가리키기(톡).
 * 기준 9(손이 하는 일은 하나): 거울을 톡 = '찰칵!' 90° 돈다(/ ↔ \). 누르고 있는 동안에는 돌린 뒤의 빛길이 흐린 점선으로 미리 보이고,
 *   손을 떼는 순간 돈다(거울 밖에서 떼면 취소). 키보드는 화살표로 커서 + 스페이스(누르는 동안 미리 보기, 떼면 찰칵).
 * 규칙(칸 기반·결정적, 2줄): 햇빛은 칸을 따라 곧게 가다가 거울(/ \)에서 꺾인다. 빛이 닿은 봉오리는 두 박자 뒤에 '퐁' 핀다
 *   (빛이 떠나도 핀다). 꽃을 모두 피우면 통과. 지금의 빛길은 늘 보인다.
 * 와우: 거울을 톡 하면 '찰칵' 돌고 햇빛 줄기가 꺾여 뻗어 나간다 — 빛이 지나간 봉오리들이 차례로 퐁 퐁 핀다.
 * 판(정원) 8개: 목표 = 꽃 N송이 피우기. 거울 돌리기 횟수는 정해져 있다.
 *   별 = ★ 다 피움 · ★ 돌리기 아낌(최소 횟수 이하) · ★ 보너스(추운 나비를 데움 / 박쥐를 안 깨움).
 *   실패 = 돌리기를 다 쓰고 더 필 꽃이 없음 → 하트 -1, 같은 정원 다시. 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1판 거울 하나·꽃 하나 → 2판 물웅덩이(못 돌리는 고정 반사 — 꺾임을 빌려 쓴다)
 *   → 3판 프리즘(빛이 둘로 갈라져 한 번에 두 갈래) → 4판 졸린 박쥐(빛이 닿으면 깨서 꽃을 먹는다 — 돌리는 순서로 피해 가기)
 *   → 5판 장미(일곱 박자 내내 비춰야 핀다 — 돌리지 말고 기다리기) → 6판 구름(박자마다 오가며 빛을 가린다 — 장미는 구름 길을 피해서)
 *   → 7판 빨간 유리(빛이 빨개진다 — 빨간 튤립은 빨간 빛만) → 8판 움직이는 해(꽃이 피면 해가 옮겨 가 빛 시작점이 바뀐다).
 * 웃음: 빛을 받은 봉오리는 기지개를 켜며 피고, 박쥐는 빛에 닿으면 '앗 눈부셔!' 하며 선글라스를 쓰고 꽃을 냠.
 *   튤립은 흰 빛엔 '흥!' 고개를 돌린다. 정원사 두더지는 꽃이 필 때마다 박수, 실패하면 모자가 벗겨져 어질어질.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.42;
/** 정원 칸: 가로 C × 세로 R (y 0 = 담장 쪽 뒤, R-1 = 앞) */
export const C = 6, R = 7;
const NC = C * R;
/** 한 박자(틱) · 해바라기는 빛이 닿고 FUSE틱 뒤에 핀다 · 장미는 ROSE_NEED틱 내내 빛을 받아야 */
export const BEAT = 20;
const FUSE = 2 * BEAT, ROSE_NEED = 7 * BEAT;
/** 박쥐: 깨는 데 · 날아가는 데 · 먹는 데 · 떠나는 데 */
const WAKE = 18, BAT_FLY = 40, BAT_EAT = 28, BAT_LEAVE = 56;
/** 빛 앞머리가 틱마다 나아가는 칸 수 */
const SPEED = 0.45;
const CLEAR_WAIT = 40, STALL = 220;
const RESULT_OK = 210, RESULT_FAIL = 170, CARD_T = 150, NEWS_T = 170;
const STAR_PTS = 100, LEFT_PTS = 10, WIN_PTS = 300;

const EMPTY = 0, MIR = 1, PUD = 2, PRISM = 3, BUD = 4, BAT = 5, HEDGE = 6, GLASS = 7;
const SUNF = 0, ROSE = 1, TULIP = 2;
/** 방향 0 동 · 1 남 · 2 서 · 3 북 */
const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
/** '/' 와 '\' 에서 꺾인 방향 */
const SLASH = [3, 2, 1, 0], BACK = [1, 0, 3, 2];

interface StageDef {
  key: string;
  news: string;
  hint: string;
  /** R줄 × C칸. '.' 빈칸 · '/' '\' 돌리는 거울 · p q 물웅덩이(/ \) · * 프리즘 · S 해바라기 · R 장미 · T 빨간 튤립 · B 박쥐 · H 덤불 · G 빨간 유리 · F 나비 */
  map: string[];
  /** 해 자리 ['N'|'W'|'E', 칸]. 둘이면 꽃이 moveAt송이 핀 뒤 둘째 자리로 옮긴다 */
  sun: [string, number][];
  moveAt?: number;
  /** 구름: [줄, 시작 칸, 끝 칸] — 박자마다 한 칸씩 오간다 */
  cloud?: number[];
  bonus: 'fly' | 'bat';
  /** 돌리기 = 최소 횟수 + extra */
  extra: number;
}

/** 판(정원) 8개. 시드로 좌우를 뒤집는다(같은 판은 다시 해도 같다) */
export const STAGES: StageDef[] = [
  {
    key: '', news: '', hint: '빛이 닿은 봉오리는 두 박자 뒤에 퐁!',
    map: ['H.....', '......', '......', './F.S.', '......', '......', 'H....H'],
    sun: [['N', 1]], bonus: 'fly', extra: 2,
  },
  {
    key: 'puddle', news: '💧 물웅덩이는 못 돌려요 — 늘 같은 쪽으로 튕겨요', hint: '물웅덩이 꺾임을 빌려 써요 — 나비도 데워 봐요',
    map: ['......', '......', 'F\\.S..', '......', '.qS.\\.', '......', 'H....H'],
    sun: [['N', 4]], bonus: 'fly', extra: 3,
  },
  {
    key: 'prism', news: '🔷 프리즘 — 빛이 양쪽으로 갈라져요', hint: '프리즘에 넣으면 한 번에 두 갈래!',
    map: ['......', '..S./F', './.S*.', '......', '......', '..S.\\.', 'H....H'],
    sun: [['N', 1]], bonus: 'fly', extra: 2,
  },
  {
    key: 'bat', news: '🦇 졸린 박쥐 — 빛이 닿으면 깨서 꽃을 먹어요!', hint: '돌리는 순서를 바꿔 박쥐를 피해 가요',
    map: ['......', '.S....', '......', './S\\./', '......', '.B...S', 'H....H'],
    sun: [['N', 3]], bonus: 'bat', extra: 2,
  },
  {
    key: 'rose', news: '🌹 장미는 일곱 박자 내내 빛을 받아야 피어요', hint: '장미가 차오르는 동안은 돌리지 말고 기다려요',
    map: ['F.....', '.../..', '......', '\\R.\\.S', '......', 'S.....', '.....H'],
    sun: [['W', 1]], bonus: 'fly', extra: 2,
  },
  {
    key: 'cloud', news: '☁️ 구름이 박자마다 오가며 빛을 가려요', hint: '장미는 구름 길을 피한 빛으로 피워요',
    map: ['F.....', '\\\\./..', '......', '......', '/..R.S', '......', '...S.H'],
    sun: [['N', 1]], cloud: [3, 2, 4], bonus: 'fly', extra: 2,
  },
  {
    key: 'glass', news: '🔴 빨간 유리를 지난 빛은 빨개져요 — 튤립은 빨간 빛만!', hint: '튤립은 빨간 유리를 지난 빛으로',
    map: ['F.....', '\\\\.G/.', 'S.....', '/.ST\\T', '......', '......', 'H....H'],
    sun: [['N', 1]], bonus: 'fly', extra: 2,
  },
  {
    key: 'sunmove', news: '☀️ 꽃이 피면 해가 옮겨 가요 — 빛 시작점이 바뀌어요', hint: '해가 옮겨 간 뒤의 빛길도 생각해요',
    map: ['......', './.S..', '......', './.S/S', '......', '.B....', 'H....H'],
    sun: [['N', 1], ['N', 4]], moveAt: 1, bonus: 'bat', extra: 2,
  },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 판 배치 ─────────────────────────────
interface Layout {
  kind: Uint8Array;
  /** 거울 번호 · 물웅덩이 방향(0 '/', 1 '\') · 봉오리 번호 */
  idx: Int8Array;
  /** 구름 길 칸 (여기를 지나는 빛은 박자마다 끊길 수 있다) */
  lane: Uint8Array;
  mirs: { x: number; y: number; o0: number }[];
  buds: { x: number; y: number; k: number }[];
  bat: { x: number; y: number } | null;
  fly: { x: number; y: number } | null;
  hedges: number[];
  sun: { side: string; i: number }[];
  moveAt: number;
  cloud: number[] | null;
}

function buildLayout(d: StageDef, flip: boolean): Layout {
  const L: Layout = {
    kind: new Uint8Array(NC), idx: new Int8Array(NC), lane: new Uint8Array(NC), mirs: [], buds: [], bat: null, fly: null, hedges: [],
    sun: d.sun.map(([side, i]) => (flip ? { side: side === 'W' ? 'E' : side === 'E' ? 'W' : side, i: side === 'N' ? C - 1 - i : i } : { side, i })),
    moveAt: d.moveAt ?? 0,
    cloud: d.cloud ? (flip ? [d.cloud[0], C - 1 - d.cloud[2], C - 1 - d.cloud[1]] : d.cloud.slice()) : null,
  };
  for (let y = 0; y < R; y++)
    for (let x0 = 0; x0 < C; x0++) {
      const x = flip ? C - 1 - x0 : x0, c = y * C + x;
      let ch = d.map[y][x0];
      if (flip) ch = ch === '/' ? '\\' : ch === '\\' ? '/' : ch === 'p' ? 'q' : ch === 'q' ? 'p' : ch;
      if (ch === '/' || ch === '\\') (L.kind[c] = MIR), (L.idx[c] = L.mirs.length), L.mirs.push({ x, y, o0: ch === '/' ? 0 : 1 });
      else if (ch === 'p' || ch === 'q') (L.kind[c] = PUD), (L.idx[c] = ch === 'p' ? 0 : 1);
      else if (ch === '*') L.kind[c] = PRISM;
      else if (ch === 'S' || ch === 'R' || ch === 'T') (L.kind[c] = BUD), (L.idx[c] = L.buds.length), L.buds.push({ x, y, k: ch === 'S' ? SUNF : ch === 'R' ? ROSE : TULIP });
      else if (ch === 'B') (L.kind[c] = BAT), (L.bat = { x, y });
      else if (ch === 'H') (L.kind[c] = HEDGE), L.hedges.push(c);
      else if (ch === 'G') L.kind[c] = GLASS;
      else if (ch === 'F') L.fly = { x, y };
    }
  if (L.cloud) for (let x = L.cloud[1]; x <= L.cloud[2]; x++) L.lane[L.cloud[0] * C + x] = 1;
  return L;
}

/** 빛 조각 (그리기용): (x0,y0)→(x1,y1), 시작점까지의 빛 거리 d0, 색 0 햇빛 · 1 빨강 */
interface Piece { x0: number; y0: number; x1: number; y1: number; d0: number; col: number }
interface Trace {
  /** 칸마다 빛이 닿은 거리(가장 가까운 것), 안 닿으면 -1 */
  lit: Float32Array;
  red: Uint8Array;
  /** 구름 길을 한 번도 안 지난 빛이 닿았나 (장미용) */
  stab: Uint8Array;
  batLit: number;
  pieces: Piece[];
  /** 빛이 막히거나 정원 밖으로 나간 끝 */
  ends: { x: number; y: number; d: number; col: number; why: number }[];
}

/** 해에서 빛을 따라간다. mask = 거울 방향 비트(1 = '\'), cloud = 지금 구름 그늘 칸 */
function trace(L: Layout, mask: number, batBlock: boolean, sunI: number, cloud: Uint8Array | null, want: boolean): Trace {
  const lit = new Float32Array(NC).fill(-1), red = new Uint8Array(NC), stab = new Uint8Array(NC);
  const T: Trace = { lit, red, stab, batLit: -1, pieces: [], ends: [] };
  const sp = L.sun[sunI];
  const seen = new Uint8Array(NC * 8);
  let sx: number, sy: number, sd: number;
  if (sp.side === 'N') (sx = sp.i), (sy = 0), (sd = 1);
  else if (sp.side === 'W') (sx = 0), (sy = sp.i), (sd = 0);
  else (sx = C - 1), (sy = sp.i), (sd = 2);
  // [칸x, 칸y, 방향, 칸 입구까지 거리, 색, 안정, 조각 시작 x, y, 거리]
  const stack: number[][] = [[sx, sy, sd, 0, 0, 1, sx + 0.5 - DX[sd] * 0.5, sy + 0.5 - DY[sd] * 0.5, 0]];
  const piece = (x0: number, y0: number, d0: number, x1: number, y1: number, col: number) => {
    if (want && (x0 !== x1 || y0 !== y1)) T.pieces.push({ x0, y0, x1, y1, d0, col });
  };
  while (stack.length) {
    let [cx, cy, dir, d, col, st, px, py, pd] = stack.pop()!;
    for (;;) {
      if (cx < 0 || cy < 0 || cx >= C || cy >= R) {
        const ex = cx + 0.5 - DX[dir] * 0.5, ey = cy + 0.5 - DY[dir] * 0.5;
        piece(px, py, pd, ex, ey, col);
        if (want) T.ends.push({ x: ex, y: ey, d, col, why: 0 });
        break;
      }
      const c = cy * C + cx, key = (c * 4 + dir) * 2 + col;
      const ccx = cx + 0.5, ccy = cy + 0.5, dc = d + 0.5;
      if (seen[key]) {
        piece(px, py, pd, ccx, ccy, col);
        break;
      }
      seen[key] = 1;
      const k = L.kind[c];
      if ((cloud && cloud[c]) || k === HEDGE || (k === BAT && batBlock)) {
        const ex = ccx - DX[dir] * (k === HEDGE ? 0.3 : 0.15), ey = ccy - DY[dir] * (k === HEDGE ? 0.3 : 0.15);
        piece(px, py, pd, ex, ey, col);
        if (want) T.ends.push({ x: ex, y: ey, d: dc, col, why: cloud && cloud[c] ? 2 : 1 });
        if (k === BAT && batBlock && !(cloud && cloud[c])) T.batLit = T.batLit < 0 ? dc : Math.min(T.batLit, dc);
        break;
      }
      if (lit[c] < 0 || dc < lit[c]) lit[c] = dc;
      if (col) red[c] = 1;
      const ln = L.lane[c];
      if (st && !ln) stab[c] = 1;
      if (ln) st = 0;
      if (k === MIR || k === PUD) {
        const o = k === MIR ? (mask >> L.idx[c]) & 1 : L.idx[c];
        piece(px, py, pd, ccx, ccy, col);
        dir = o ? BACK[dir] : SLASH[dir];
        (px = ccx), (py = ccy), (pd = dc);
      } else if (k === PRISM) {
        piece(px, py, pd, ccx, ccy, col);
        for (const nd of [(dir + 1) % 4, (dir + 3) % 4]) stack.push([cx + DX[nd], cy + DY[nd], nd, dc + 0.5, col, st, ccx, ccy, dc]);
        break;
      } else if (k === GLASS && !col) {
        piece(px, py, pd, ccx, ccy, col);
        col = 1;
        (px = ccx), (py = ccy), (pd = dc);
      }
      cx += DX[dir];
      cy += DY[dir];
      d = dc + 0.5;
    }
  }
  return T;
}

// ───────────────────────────── 내다보기 (판 짜기·잘하는 봇) ─────────────────────────────
/** 칸 기반 요약 상태: 거울 방향 · 핀(또는 곧 필) 꽃 · 박쥐가 있나 · 나비를 데웠나 · 지금까지 핀 횟수 */
interface AState { ori: number; bl: number; bat: number; fly: number; ev: number }
const pop = (m: number) => {
  let n = 0;
  for (; m; m &= m - 1) n++;
  return n;
};
const sunOf = (L: Layout, ev: number) => (L.moveAt && ev >= L.moveAt && L.sun.length > 1 ? 1 : 0);

/** 박쥐가 노리는 꽃: 지금 빛을 안 받는 꽃 중 가장 가까운 것(없으면 아무 꽃이나 가장 가까운 것) */
function batTarget(L: Layout, bloomed: number, litMask: number) {
  if (!L.bat) return -1;
  let best = -1, bd = 1e9, pass = 0;
  for (; pass < 2 && best < 0; pass++)
    for (let i = 0; i < L.buds.length; i++) {
      if (!((bloomed >> i) & 1) || (pass === 0 && (litMask >> i) & 1)) continue;
      const b = L.buds[i], dd = (b.x - L.bat.x) ** 2 + (b.y - L.bat.y) ** 2;
      if (dd < bd) (bd = dd), (best = i);
    }
  return best;
}

/** 거울을 돌린 뒤 일이 다 벌어질 때까지(꽃 핌 → 해 옮김 → 박쥐…) 요약해서 따라간다 */
function resolve(L: Layout, s0: AState): AState {
  const st = { ...s0 };
  for (let it = 0; it < 16; it++) {
    const T = trace(L, st.ori, st.bat === 1, sunOf(L, st.ev), null, false);
    let touch = 0, rose = 0, litM = 0;
    L.buds.forEach((b, i) => {
      const c = b.y * C + b.x;
      if (T.lit[c] < 0) return;
      litM |= 1 << i;
      if (b.k === SUNF || (b.k === TULIP && T.red[c])) touch |= 1 << i;
      else if (b.k === ROSE && T.stab[c]) rose |= 1 << i;
    });
    let changed = false;
    if (!st.fly && L.fly && T.lit[L.fly.y * C + L.fly.x] >= 0) (st.fly = 1), (changed = true);
    const nb = touch & ~st.bl;
    if (nb) (st.bl |= nb), (st.ev += pop(nb)), (changed = true);
    if (st.bat === 1 && T.batLit >= 0) {
      st.bat = 0;
      const tg = batTarget(L, st.bl, litM);
      if (tg >= 0) st.bl &= ~(1 << tg);
      changed = true;
    }
    if (!changed) {
      const nr = rose & ~st.bl;
      if (nr) (st.bl |= nr), (st.ev += pop(nr)), (changed = true);
    }
    if (!changed) break;
  }
  return st;
}

interface Plan { tap: number; pred: AState; depth: number; score: number }
/**
 * 너비 우선으로 돌리기 순서를 찾는다. 별(돌리기 아낌·보너스)이 많은 길, 같으면 짧은 길.
 * par < 0이면 별은 안 따지고 가장 짧은 길(= 이 판의 최소 횟수)을 찾는다.
 */
function solve(L: Layout, start: AState, budget: number, used: number, par: number, bonus: string): Plan | null {
  const all = (1 << L.buds.length) - 1, nm = L.mirs.length;
  const key = (q: AState) => q.ori | (q.bl << 8) | (q.bat << 16) | (q.fly << 17) | (sunOf(L, q.ev) << 18);
  const seen = new Set<number>([key(start)]);
  let layer: { st: AState; first: number }[] = [{ st: start, first: -1 }];
  let best: Plan | null = null;
  for (let depth = 1; depth <= Math.min(budget, 9) && layer.length; depth++) {
    const next: { st: AState; first: number }[] = [];
    for (const nd of layer)
      for (let m = 0; m < nm; m++) {
        const ch = resolve(L, { ...nd.st, ori: nd.st.ori ^ (1 << m) });
        const first = nd.first < 0 ? m : nd.first;
        if (ch.bl === all) {
          if (par < 0) return { tap: first, pred: ch, depth, score: 0 };
          const score = (used + depth <= par ? 1 : 0) + ((bonus === 'bat' ? !L.bat || ch.bat === 1 : ch.fly === 1) ? 1 : 0);
          if (!best || score > best.score) best = { tap: first, pred: depth === 1 ? ch : resolve(L, { ...nd.st, ori: nd.st.ori ^ (1 << m) }), depth, score };
          if (best.score === 2) return best;
          continue;
        }
        const k = key(ch);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push({ st: ch, first });
      }
    layer = next;
  }
  return best;
}

// ───────────────────────────── 상태 ─────────────────────────────
interface Bud { x: number; y: number; k: number; st: number; fuse: number; prog: number; bloomT: number; touchT: number; bit: number; nopeT: number }
interface Mir { x: number; y: number; o: number; ang: number; target: number; clickT: number }
interface BatS { x: number; y: number; st: number; t: number; tgt: number; wx: number; wy: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string }

export interface MirrorState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result'; pt: number;
  flips: boolean[]; pars: number[];
  L: Layout; mirs: Mir[]; buds: Bud[]; bat: BatS | null; fly: { x: number; y: number; warm: boolean; wt: number } | null;
  sunI: number; sunT: number; blooms: number; tr: Trace; reach: number; cloud: Uint8Array; cloudX: number;
  rots: number; used: number; par: number; hearts: number; stars: number; got: number; starOk: boolean[]; pts: number;
  ok: boolean; why: string; down: boolean; aim: { x: number; y: number } | null; hover: number;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null;
  events: Ev[]; dead: boolean; won: boolean; tries: number; again: boolean; firstTap: boolean; lastEvt: number; clearT: number; batWoke: boolean;
  moleT: number; moleMood: number;
}

const ev = (s: MirrorState, kind: string, x: number, y: number, text?: string, col?: string) => s.events.push({ t: s.t, kind, x, y, text, col });
function see(s: MirrorState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}

const maskOf = (s: MirrorState) => s.mirs.reduce((m, q, i) => m | (q.o << i), 0);
function aState(s: MirrorState): AState {
  let bl = 0, pend = 0;
  s.buds.forEach((b, i) => {
    if (b.st >= 1) bl |= 1 << i;
    if (b.st === 1) pend++;
  });
  return { ori: maskOf(s), bl, bat: s.bat && s.bat.st === 0 ? 1 : 0, fly: s.fly?.warm ? 1 : 0, ev: s.blooms + pend };
}

/** 구름 그늘 칸 (박자마다 한 칸씩 오간다) */
function cloudCol(L: Layout, t: number) {
  if (!L.cloud) return -1;
  const span = L.cloud[2] - L.cloud[1], P = 2 * span, m = Math.floor(t / BEAT) % P;
  return L.cloud[1] + (m <= span ? m : P - m);
}

// ───────── 화면 배치 (가로 0~1, 세로 0~A) — 담장 정원을 앞에서 비스듬히 내려다본다: 뒤(담장)가 좁고 앞이 넓다 ─────────
const GY0 = 0.375, GY1 = 1.075, SB = 0.8, SF = 1, CW = 0.148;
const scl = (y: number) => SB + (SF - SB) * (y / R);
const PX = (x: number, y: number) => 0.5 + (x - C / 2) * CW * scl(y);
const PY = (y: number) => GY0 + (y / R) * (GY1 - GY0);
/** 높이 z(칸 단위) → 화면에서 위로 올라가는 양 */
const ZH = (y: number) => CW * scl(y) * 0.95;
const BAND = 1.13;
/** 거울을 누르는 자리(화면): 거울판 한가운데 */
const mirScreen = (m: { x: number; y: number }) => ({ x: PX(m.x + 0.5, m.y + 0.5), y: PY(m.y + 0.5) - ZH(m.y + 0.5) * 0.36 });
const HIT = 0.085;

function pick(s: MirrorState, p: { x: number; y: number }) {
  let best = -1, bd = HIT * HIT;
  s.mirs.forEach((m, i) => {
    const q = mirScreen(m), g = { x: PX(m.x + 0.5, m.y + 0.5), y: PY(m.y + 0.5) };
    const dd = Math.min((q.x - p.x) ** 2 + (q.y - p.y) ** 2, (g.x - p.x) ** 2 + (g.y - p.y) ** 2 * 1.4);
    if (dd < bd) (bd = dd), (best = i);
  });
  return best;
}

function newStage(s: MirrorState) {
  const d = STAGES[s.stage];
  const L = (s.L = buildLayout(d, s.flips[s.stage]));
  s.mirs = L.mirs.map((m) => ({ x: m.x, y: m.y, o: m.o0, ang: m.o0 ? 135 : 45, target: m.o0 ? 135 : 45, clickT: -99 }));
  s.buds = L.buds.map((b) => ({ x: b.x, y: b.y, k: b.k, st: 0, fuse: 0, prog: 0, bloomT: -99, touchT: -99, bit: 0, nopeT: -99 }));
  s.bat = L.bat ? { x: L.bat.x, y: L.bat.y, st: 0, t: 0, tgt: -1, wx: L.bat.x + 0.5, wy: L.bat.y + 0.5 } : null;
  s.fly = L.fly ? { x: L.fly.x, y: L.fly.y, warm: false, wt: -99 } : null;
  s.sunI = 0;
  s.sunT = -99;
  s.blooms = 0;
  s.reach = 0;
  s.par = s.pars[s.stage];
  s.rots = s.par + d.extra;
  s.used = 0;
  s.phase = 'play';
  s.pt = 0;
  s.clearT = 0;
  s.lastEvt = s.t;
  s.batWoke = false;
  s.starOk = [false, false, false];
  s.tr = trace(L, maskOf(s), !!s.bat, 0, null, true);
  // 판의 새것은 판 카드 셋째 줄에 바로 보인다 (알림 띠 대기열에는 넣지 않는다)
  if (d.key) s.seen.add(d.key);
}

function rotate(s: MirrorState, i: number) {
  if (s.phase !== 'play') return;
  const m = s.mirs[i];
  if (s.rots <= 0) return void ev(s, 'nope', m.x + 0.5, m.y + 0.5, '돌리기를 다 썼어요');
  m.o ^= 1;
  m.target += 90;
  m.clickT = s.t;
  s.rots--;
  s.used++;
  s.firstTap = true;
  s.lastEvt = s.t;
  ev(s, 'click', m.x + 0.5, m.y + 0.5, '찰칵!');
  see(s, 'tap', '🪞 거울을 톡 하면 찰칵 90° 돌아요');
}

function bloom(s: MirrorState, i: number) {
  const b = s.buds[i];
  b.st = 2;
  b.bloomT = s.t;
  s.blooms++;
  s.lastEvt = s.t;
  s.moleT = s.t;
  s.moleMood = 1;
  ev(s, 'bloom', b.x + 0.5, b.y + 0.5, b.k === ROSE ? '활짝! 🌹' : b.k === TULIP ? '퐁! 🌷' : ['퐁!', '퐁퐁!', '활짝!'][(s.blooms + i) % 3]);
  see(s, 'bloom', '🌻 빛이 닿은 봉오리는 두 박자 뒤에 퐁!');
  if (s.L.moveAt && s.blooms === s.L.moveAt && s.L.sun.length > 1 && s.sunI === 0) {
    s.sunI = 1;
    s.sunT = s.t;
    const sp = s.L.sun[1];
    ev(s, 'sunmove', sp.side === 'N' ? sp.i + 0.5 : sp.side === 'W' ? 0 : C, sp.side === 'N' ? 0 : sp.i + 0.5, '해가 옮겨 가요! ☀️');
  }
}

function endStage(s: MirrorState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = [true, s.used <= s.par, d.bonus === 'bat' ? !s.batWoke : !!s.fly?.warm];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + s.rots * LEFT_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', C / 2, R / 2, s.won ? '정원 완성! 🌻' : '꽃밭 완성!');
    s.moleMood = 2;
    s.moleT = s.t;
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', C / 2, R / 2, why);
    s.moleMood = 3;
    s.moleT = s.t;
  }
}

/** 한 틱: 구름 → 빛길 → 빛 앞머리 → 봉오리·박쥐·나비 → 판 끝 */
function simTick(s: MirrorState) {
  const L = s.L;
  // 구름 그늘
  s.cloud.fill(0);
  s.cloudX = cloudCol(L, s.t);
  if (L.cloud && s.cloudX >= 0) s.cloud[L.cloud[0] * C + s.cloudX] = 1;
  const old = s.tr;
  const tr = (s.tr = trace(L, maskOf(s), !!s.bat && s.bat.st <= 1, s.sunI, L.cloud ? s.cloud : null, true));
  // 빛길이 바뀐 곳부터 빛이 다시 뻗어 나간다
  let dmin = 1e9;
  for (let c = 0; c < NC; c++) if (tr.lit[c] >= 0 && (old.lit[c] !== tr.lit[c] || old.red[c] !== tr.red[c])) dmin = Math.min(dmin, tr.lit[c]);
  if (tr.batLit >= 0 && old.batLit !== tr.batLit) dmin = Math.min(dmin, tr.batLit);
  if (dmin < 1e9) s.reach = Math.min(s.reach, dmin - 0.5);
  s.reach = Math.min(s.reach + SPEED, 99);
  const on = (c: number) => tr.lit[c] >= 0 && tr.lit[c] <= s.reach;
  if (s.phase !== 'play') return;
  // 봉오리
  s.buds.forEach((b, i) => {
    const c = b.y * C + b.x, lit = on(c);
    if (b.st === 2) return;
    if (b.k === ROSE) {
      if (lit) {
        if (b.prog === 0) b.touchT = s.t;
        if (++b.prog >= ROSE_NEED) bloom(s, i);
      } else {
        if (b.prog > BEAT) ev(s, 'wilt', b.x + 0.5, b.y + 0.5, '앗, 처음부터…'), see(s, 'wilt', '🌹 빛이 끊기면 장미는 처음부터 다시 차올라요');
        b.prog = 0;
      }
      return;
    }
    if (b.st === 0) {
      if (lit && (b.k === SUNF || tr.red[c])) {
        b.st = 1;
        b.fuse = FUSE;
        b.touchT = s.t;
        s.lastEvt = s.t;
        ev(s, 'touch', b.x + 0.5, b.y + 0.5);
      } else if (lit && b.k === TULIP && s.t - b.nopeT > 90) {
        b.nopeT = s.t;
        ev(s, 'huh', b.x + 0.5, b.y + 0.5, '흥! 빨간 빛만!');
      }
    } else if (b.st === 1 && --b.fuse <= 0) bloom(s, i);
  });
  // 나비
  if (s.fly && !s.fly.warm && on(s.fly.y * C + s.fly.x)) {
    s.fly.warm = true;
    s.fly.wt = s.t;
    s.lastEvt = s.t;
    ev(s, 'fly', s.fly.x + 0.5, s.fly.y + 0.5, '따뜻해~ ★');
    see(s, 'fly', '🦋 추운 나비에 빛을 비추면 보너스 ★');
  }
  // 박쥐
  const bt = s.bat;
  if (bt) {
    if (bt.st === 0 && tr.batLit >= 0 && tr.batLit <= s.reach) {
      bt.st = 1;
      bt.t = 0;
      s.batWoke = true;
      s.lastEvt = s.t;
      ev(s, 'batwake', bt.x + 0.5, bt.y + 0.5, '앗 눈부셔!');
    } else if (bt.st === 1 && ++bt.t >= WAKE) {
      let litM = 0, blm = 0;
      s.buds.forEach((b, i) => {
        if (b.st >= 1) blm |= 1 << i;
        if (on(b.y * C + b.x)) litM |= 1 << i;
      });
      bt.tgt = batTarget(L, blm, litM);
      bt.st = bt.tgt >= 0 ? 2 : 4;
      bt.t = 0;
      if (bt.tgt < 0) ev(s, 'bathuh', bt.x + 0.5, bt.y + 0.5, '흥, 딴 데서 잘래');
    } else if (bt.st === 2) {
      const b = s.buds[bt.tgt], u = Math.min(1, ++bt.t / BAT_FLY);
      bt.wx = bt.x + 0.5 + (b.x - bt.x) * u;
      bt.wy = bt.y + 0.5 + (b.y - bt.y) * u;
      if (bt.t >= BAT_FLY) {
        bt.st = 3;
        bt.t = 0;
        b.st = 0;
        b.prog = 0;
        b.fuse = 0;
        b.bit = s.t;
        s.lastEvt = s.t;
        ev(s, 'eat', b.x + 0.5, b.y + 0.5, '냠냠!');
        see(s, 'eat', '🦇 깬 박쥐가 꽃을 먹었어요 — 다시 빛을 비춰요');
      }
    } else if (bt.st === 3 && ++bt.t >= BAT_EAT) (bt.st = 4), (bt.t = 0);
    else if (bt.st === 4) {
      bt.t++;
      bt.wy -= 0.06;
      bt.wx += 0.04 * (bt.wx < C / 2 ? -1 : 1);
      if (bt.t >= BAT_LEAVE) bt.st = 5;
    }
  }
  // 판 끝
  const all = s.buds.every((b) => b.st === 2);
  const busy = !!bt && bt.st >= 1 && bt.st <= 3;
  if (all && !busy) {
    if (++s.clearT >= CLEAR_WAIT) endStage(s, true, '');
  } else s.clearT = 0;
  if (!all && s.rots <= 0 && !busy && !s.buds.some((b) => b.st === 1) && s.t - s.lastEvt > STALL) endStage(s, false, '돌리기를 다 썼어요');
}

export const sunmirror: GameDef<MirrorState> = {
  id: 'sunmirror',
  name: '햇빛 거울 정원',
  genes: ['reflect', 'pointer', 'turnbased'],
  twist: '빛길이 늘 보이는 칸 기반 반사 퍼즐인데, 봉오리는 빛이 "지나가기만" 해도 두 박자 뒤에 핀다 — 거울 하나를 톡 돌리면 햇빛이 꺾여 뻗으며 지나간 꽃들이 차례로 퐁퐁 핀다',
  rules: [
    '거울을 톡 = 찰칵 90° 돌아요. 햇빛은 곧게 가다 거울에서 꺾이고, 빛이 닿은 봉오리는 두 박자 뒤에 퐁 피어요.',
    '꽃을 모두 피우면 통과 — 꾹 누르고 있으면 돌린 뒤의 빛길이 미리 보여요.',
  ],
  controls: 'touch',
  hint: '거울을 톡 = 찰칵 돌기 (꾹 누르면 미리 보기) / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '담장 정원 디오라마 — 햇빛 거울로 꽃 피우기',
    mood: '오후 햇살이 비스듬히 드는 벽돌 담장 정원. 잔디 칸 위에 놋쇠 테 거울이 반짝이고, 따뜻한 금빛 광선이 꺾이며 지나간 봉오리들이 퐁퐁 핀다. 벌과 나비가 날고, 앞쪽 흙구멍에서 밀짚모자 두더지 정원사가 박수를 친다.',
    palette: { bg: '#2a4a2e', ink: '#fffaf0', muted: '#cfe3b8', accent: '#ffd23a', hot: '#ff6b5a', soft: '#e8f5d0' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const flips = STAGES.map(() => rng() < 0.5);
    const pars = STAGES.map((d, k) => {
      const L = buildLayout(d, flips[k]);
      const st0 = resolve(L, { ori: L.mirs.reduce((m, q, i) => m | (q.o0 << i), 0), bl: 0, bat: L.bat ? 1 : 0, fly: 0, ev: 0 });
      return solve(L, st0, 9, 0, -1, d.bonus)?.depth ?? 4;
    });
    const s = {
      rng, seed, t: 0, stage: 0, phase: 'play', pt: 0, flips, pars,
      mirs: [], buds: [], bat: null, fly: null, sunI: 0, sunT: -99, blooms: 0, reach: 0, cloud: new Uint8Array(NC), cloudX: -1,
      rots: 0, used: 0, par: 0, hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0,
      ok: false, why: '', down: false, aim: null, hover: -1, seen: new Set<string>(), newsQ: [], news: null, events: [],
      dead: false, won: false, tries: 0, again: false, firstTap: false, lastEvt: 0, clearT: 0, batWoke: false, moleT: -99, moleMood: 0,
    } as unknown as MirrorState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    // 손을 대고 있는 동안은 미리 보기, 떼는 순간 찰칵
    const p = inp.pointer ?? null;
    if (p) {
      s.down = true;
      s.aim = { x: p.x, y: p.y * A };
      s.hover = pick(s, s.aim);
    } else if (s.down) {
      s.down = false;
      const i = s.aim ? pick(s, s.aim) : -1;
      if (i >= 0) rotate(s, i);
      else if (s.aim && s.phase === 'play') ev(s, 'miss', 0, 0);
      s.aim = null;
      s.hover = -1;
    }
    s.t++;
    s.pt++;
    s.events = s.events.filter((e) => s.t - e.t < 110);
    for (const m of s.mirs) m.ang += (m.target - m.ang) * 0.3;
    simTick(s);
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
const atMir = (m: { x: number; y: number }, jx = 0, jy = 0): Input => {
  const q = mirScreen(m);
  return { tap: false, dir: 0, pointer: { x: q.x + jx, y: (q.y + jy) / A } };
};
const brain = new WeakMap<object, { key: string; plan: Plan | null; hold: number; mi: number; pred: AState | null; tapT: number }>();

/** 일이 다 벌어졌나 (곧 필 꽃·박쥐·차오르는 장미·뻗는 빛이 없나) */
function settled(s: MirrorState) {
  if (s.buds.some((b) => b.st === 1 || (b.k === ROSE && b.st === 0 && b.prog > 0))) return false;
  if (s.bat && s.bat.st >= 1 && s.bat.st <= 3) return false;
  return s.reach > 30;
}

/** 봇: 일이 다 벌어지면, 돌리기 순서를 너비 우선으로 끝까지 내다보고(별이 많은 길) 첫 거울을 톡 */
export const sunmirrorSmart: Bot<MirrorState> = {
  name: '빛길 박사',
  act(s) {
    let m = brain.get(s);
    if (!m) brain.set(s, (m = { key: '', plan: null, hold: 0, mi: -1, pred: null, tapT: -999 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? atMir(s.mirs[m.mi]) : NO;
    }
    if (s.phase !== 'play' || s.rots <= 0 || s.pt < 40) return NO;
    if (!settled(s)) return NO;
    if (m.pred && s.t - m.tapT < 260) {
      const bl = aState(s).bl;
      if ((bl & m.pred.bl) !== m.pred.bl) return NO;
    }
    const key = `${s.stage}:${s.tries}:${s.used}`;
    if (m.key !== key) {
      m.key = key;
      const st = aState(s);
      m.plan = solve(s.L, st, s.rots, s.used, s.par, STAGES[s.stage].bonus);
      if (!m.plan) {
        // 끝까지 못 가면: 한 번 돌려 가장 많이 피는 거울
        let bi = 0, bv = -1;
        for (let i = 0; i < s.mirs.length; i++) {
          const ch = resolve(s.L, { ...st, ori: st.ori ^ (1 << i) }), v = pop(ch.bl) * 4 + ch.fly + ch.bat;
          if (v > bv) (bv = v), (bi = i);
        }
        m.plan = { tap: bi, pred: resolve(s.L, { ...st, ori: st.ori ^ (1 << bi) }), depth: 1, score: 0 };
      }
    }
    if (!m.plan) return NO;
    m.mi = m.plan.tap;
    m.pred = resolve(s.L, { ...aState(s), ori: aState(s).ori ^ (1 << m.mi) });
    m.tapT = s.t;
    m.hold = 3;
    return atMir(s.mirs[m.mi]);
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number }>();
/** 봇: 아무 거울이나(가끔은 아무 데나), 아무 때나 톡 */
export const sunmirrorRandom: Bot<MirrorState> = {
  name: '아무 거울이나 톡',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 30 + Math.floor(rng() * 60), hold: 0, x: 0, y: 0 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y / A } } : NO;
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 40 + Math.floor(rng() * 120);
    if (rng() < 0.85 && s.mirs.length) {
      const q = mirScreen(s.mirs[Math.floor(rng() * s.mirs.length)]);
      (m.x = q.x + (rng() - 0.5) * 0.03), (m.y = q.y + (rng() - 0.5) * 0.03);
    } else (m.x = rng()), (m.y = rng() * A);
    m.hold = 3 + Math.floor(rng() * 6);
    return { tap: false, dir: 0, pointer: { x: m.x, y: m.y / A } };
  },
};

/** 판 분석용 (개발 스크립트) */
export const SM_DEV = { buildLayout, trace, resolve, solve, cloudCol };

// ───────────────────────────── 그리기 ─────────────────────────────
function drawAll(ctx: CanvasRenderingContext2D, s: MirrorState, w: number, h: number, th: Theme) {
  const fx = juice(s);
  ctx.save();
  fx.begin(ctx);
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
