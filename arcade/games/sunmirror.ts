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

const MIR = 1, PUD = 2, PRISM = 3, BUD = 4, BAT = 5, HEDGE = 6, GLASS = 7;
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
    map: ['......', '\\\\.G/.', 'S.....', '/.ST\\T', '......', 'F.....', 'H....H'],
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
  if (start.bl === all) return null;
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
          if (!best || score > best.score) best = { tap: first, pred: ch, depth, score };
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
const GY0 = 0.4, GY1 = 1.08, SB = 0.8, SF = 1, CW = 0.148;
const scl = (y: number) => SB + (SF - SB) * (y / R);
const PX = (x: number, y: number) => 0.5 + (x - C / 2) * CW * scl(y);
const PY = (y: number) => GY0 + (y / R) * (GY1 - GY0);
/** 높이 z(칸 단위) → 화면에서 위로 올라가는 양 */
const ZH = (y: number) => CW * scl(y) * 0.95;
const BAND = 1.13;
/** 거울을 누르는 자리(화면): 거울판 한가운데 */
const mirScreen = (m: { x: number; y: number }) => ({ x: PX(m.x + 0.5, m.y + 0.5), y: PY(m.y + 0.5) - ZH(m.y + 0.5) * 0.5 });
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
  return s.reach >= maxLit(s.tr);
}
/** 지금 빛길에서 가장 먼 곳까지의 빛 거리 */
function maxLit(T: Trace) {
  let d = 0;
  for (let c = 0; c < NC; c++) d = Math.max(d, T.lit[c]);
  return Math.max(d, T.batLit);
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
    if (s.phase !== 'play' || s.rots <= 0 || s.pt < 40 || s.buds.every((b) => b.st >= 1)) return NO;
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
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
const PREV = new WeakMap<object, { key: string; tr: Trace; newly: number; bat: boolean; fly: boolean }>();
/** 빛줄기 높이(칸) — 거울판 한가운데·꽃 머리 높이 */
const ZB = 0.5;
/** 세로 한 칸의 화면 길이 */
const DY1 = (GY1 - GY0) / R;

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** 얼굴. mood 0 쿨쿨 · 1 방긋 · 2 깜짝 · 3 기지개(꽉 감고 하품) · 4 흥 */
function face(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, mood: number, blush = true) {
  ctx.save();
  ctx.strokeStyle = '#3a2410';
  ctx.fillStyle = '#3a2410';
  ctx.lineWidth = Math.max(1, u * 0.1);
  ctx.lineCap = 'round';
  const ex = u * 0.32, ey = -u * 0.1;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    if (mood === 0) ctx.arc(x + sd * ex, y + ey - u * 0.04, u * 0.13, 0.15 * Math.PI, 0.85 * Math.PI);
    else if (mood === 1) ctx.arc(x + sd * ex, y + ey + u * 0.08, u * 0.14, 1.15 * Math.PI, 1.85 * Math.PI);
    else if (mood === 3) {
      ctx.moveTo(x + sd * ex - sd * u * 0.12, y + ey - u * 0.08);
      ctx.lineTo(x + sd * ex + sd * u * 0.06, y + ey);
      ctx.lineTo(x + sd * ex - sd * u * 0.12, y + ey + u * 0.08);
    } else {
      ctx.arc(x + sd * ex + (mood === 4 ? u * 0.08 : 0), y + ey, u * (mood === 2 ? 0.1 : 0.07), 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.stroke();
  }
  ctx.beginPath();
  if (mood === 1) ctx.arc(x, y + u * 0.12, u * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
  else if (mood === 3 || mood === 2) ctx.ellipse(x, y + u * 0.25, u * 0.1, u * (mood === 3 ? 0.14 : 0.09), 0, 0, Math.PI * 2);
  else if (mood === 4) (ctx.moveTo(x - u * 0.12, y + u * 0.26), ctx.lineTo(x + u * 0.16, y + u * 0.2));
  else ctx.arc(x, y + u * 0.18, u * 0.07, 0.2 * Math.PI, 0.8 * Math.PI);
  if (mood === 3 || mood === 2) ctx.fill();
  else ctx.stroke();
  if (blush) {
    ctx.fillStyle = 'rgba(255,110,110,.45)';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + sd * u * 0.48, y + u * 0.12, u * 0.13, u * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** 꽃·봉오리 (땅 위 bx,by에 선다). u = 그 깊이의 칸 너비(px) */
function drawFlower(ctx: CanvasRenderingContext2D, bx: number, by: number, u: number, b: Bud, t: number, lit: boolean, i: number) {
  const age = t - b.bloomT, sway = Math.sin(t * 0.05 + i * 1.7) * 0.06;
  const kidCol = b.k === SUNF ? ['#ffe14d', '#f6a400'] : b.k === ROSE ? ['#ff6f8a', '#c2183c'] : ['#ff7a5a', '#d62a1a'];
  // 땅 그림자
  ctx.fillStyle = 'rgba(30,60,20,.28)';
  ctx.beginPath();
  ctx.ellipse(bx + u * 0.06, by + u * 0.03, u * 0.26, u * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  let stemH = u * 0.4, headS = 1, arms = 0, mood = 0, shake = 0;
  if (b.st === 1) {
    const p = 1 - b.fuse / FUSE;
    stemH *= 1 + 0.22 * Math.sin(p * Math.PI * 0.5);
    headS = 1 + 0.35 * p;
    arms = p;
    mood = 3;
  } else if (b.st === 2) {
    const pp = Math.min(1, age / 14);
    stemH = u * (0.4 + 0.1 * pp);
    headS = age < 14 ? 0.5 + 0.75 * pp : 1 + 0.25 * Math.max(0, 1 - (age - 14) / 10) * Math.sin((age - 14) * 0.6);
    arms = age < 40 ? 1 - age / 40 : 0;
    mood = 1;
  } else if (b.k === ROSE && b.prog > 0) (mood = 3), (headS = 1 + 0.25 * (b.prog / ROSE_NEED)), (arms = (b.prog / ROSE_NEED) * 0.7);
  else if (b.k === TULIP && t - b.nopeT < 50) (mood = 4), (shake = Math.sin((t - b.nopeT) * 0.8) * 0.25 * (1 - (t - b.nopeT) / 50));
  else if (lit) mood = 2;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(sway + shake);
  // 줄기
  ctx.strokeStyle = '#3f8a2a';
  ctx.lineWidth = Math.max(1.5, u * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(u * 0.05, -stemH * 0.5, 0, -stemH);
  ctx.stroke();
  // 잎 (기지개 = 잎을 팔처럼 위로)
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(0, -stemH * 0.38);
    ctx.rotate(sd * (1.05 - arms * 0.85));
    const lg = ctx.createLinearGradient(0, 0, sd * u * 0.25, 0);
    lg.addColorStop(0, '#4fa83a');
    lg.addColorStop(1, '#8fd66a');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.ellipse(sd * u * 0.13, 0, u * 0.14, u * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.translate(0, -stemH);
  ctx.scale(headS, headS);
  const hu = u * 0.36;
  if (b.st === 2) {
    if (b.k === SUNF) {
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2 + t * 0.004;
        ctx.save();
        ctx.rotate(a);
        const pg = ctx.createLinearGradient(0, 0, hu * 0.95, 0);
        pg.addColorStop(0, '#f6a400');
        pg.addColorStop(1, '#ffe14d');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.ellipse(hu * 0.62, 0, hu * 0.4, hu * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      const cg = ctx.createRadialGradient(-hu * 0.1, -hu * 0.12, hu * 0.05, 0, 0, hu * 0.48);
      cg.addColorStop(0, '#a8662a');
      cg.addColorStop(1, '#5a3010');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, 0, hu * 0.46, 0, Math.PI * 2);
      ctx.fill();
      face(ctx, 0, 0, hu * 0.5, 1);
    } else if (b.k === ROSE) {
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        ctx.fillStyle = k % 2 ? '#e0304f' : '#c2183c';
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * hu * 0.38, Math.sin(a) * hu * 0.3, hu * 0.38, hu * 0.3, a, 0, Math.PI * 2);
        ctx.fill();
      }
      const rg = ctx.createRadialGradient(-hu * 0.1, -hu * 0.15, hu * 0.05, 0, 0, hu * 0.5);
      rg.addColorStop(0, '#ff9fb0');
      rg.addColorStop(1, '#e0304f');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(0, 0, hu * 0.48, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,0,30,.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k < 22; k++) {
        const a = k * 0.55, rr = hu * 0.04 + k * hu * 0.017;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.8 - hu * 0.05);
      }
      ctx.stroke();
      face(ctx, 0, hu * 0.08, hu * 0.42, 1);
    } else {
      const tg = ctx.createLinearGradient(0, -hu * 0.6, 0, hu * 0.5);
      tg.addColorStop(0, '#ff8a6a');
      tg.addColorStop(1, '#c81e10');
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.moveTo(-hu * 0.55, -hu * 0.55);
      ctx.lineTo(-hu * 0.28, -hu * 0.2);
      ctx.lineTo(0, -hu * 0.7);
      ctx.lineTo(hu * 0.28, -hu * 0.2);
      ctx.lineTo(hu * 0.55, -hu * 0.55);
      ctx.quadraticCurveTo(hu * 0.62, hu * 0.45, 0, hu * 0.48);
      ctx.quadraticCurveTo(-hu * 0.62, hu * 0.45, -hu * 0.55, -hu * 0.55);
      ctx.fill();
      face(ctx, 0, hu * 0.05, hu * 0.42, 1);
    }
  } else {
    // 봉오리: 초록 꼬투리에 꽃잎 끝이 삐죽
    ctx.fillStyle = kidCol[0];
    for (const sd of [-1, 0, 1]) {
      ctx.beginPath();
      ctx.ellipse(sd * hu * 0.22, -hu * 0.42, hu * 0.14, hu * 0.26, sd * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    const bg = ctx.createRadialGradient(-hu * 0.15, -hu * 0.2, hu * 0.05, 0, 0, hu * 0.6);
    bg.addColorStop(0, '#9be07a');
    bg.addColorStop(1, '#3f8a2a');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(0, -hu * 0.62);
    ctx.bezierCurveTo(hu * 0.55, -hu * 0.42, hu * 0.5, hu * 0.38, 0, hu * 0.4);
    ctx.bezierCurveTo(-hu * 0.5, hu * 0.38, -hu * 0.55, -hu * 0.42, 0, -hu * 0.62);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,70,20,.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (b.k === TULIP) {
      // 빨간 빛만 받는다는 표시: 빨간 리본
      ctx.fillStyle = '#e8321e';
      ctx.beginPath();
      ctx.arc(hu * 0.38, -hu * 0.42, hu * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
    face(ctx, 0, hu * 0.02, hu * 0.36, mood, mood !== 0);
    if (b.bit && b.st === 0) {
      // 박쥐가 깨문 자국 + 반창고
      ctx.fillStyle = '#ffe2b8';
      ctx.save();
      ctx.rotate(-0.5);
      ctx.fillRect(-hu * 0.3, -hu * 0.42, hu * 0.6, hu * 0.16);
      ctx.restore();
    }
  }
  ctx.restore();
  // 기다리는 고리: 해바라기 퓨즈 · 장미 빛 시간
  const ring = b.st === 1 ? 1 - b.fuse / FUSE : b.k === ROSE && b.st === 0 && b.prog > 0 ? b.prog / ROSE_NEED : 0;
  if (ring > 0) {
    const ry = by - stemH - u * 0.05;
    ctx.lineWidth = Math.max(2, u * 0.05);
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.arc(bx, ry, u * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = b.k === ROSE ? '#ff8fb0' : '#ffe14d';
    ctx.beginPath();
    ctx.arc(bx, ry, u * 0.3, -Math.PI / 2, -Math.PI / 2 + ring * Math.PI * 2);
    ctx.stroke();
  }
}

/** 박쥐. mode 0 쿨쿨(거꾸로 매달림) · 1 깸(선글라스) · 2 날기 · 3 냠냠 · 4 떠남 */
function drawBat(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, mode: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  if (mode === 0) ctx.rotate(Math.PI + Math.sin(t * 0.03) * 0.08);
  const flap = mode === 0 ? 0 : Math.sin(t * (mode === 3 ? 0.5 : 0.7));
  // 날개
  ctx.fillStyle = '#5a4a7a';
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.scale(sd, 1);
    ctx.rotate(mode === 0 ? 0.9 : -0.2 + flap * 0.5);
    ctx.beginPath();
    if (mode === 0) ctx.ellipse(u * 0.16, 0, u * 0.12, u * 0.26, 0.2, 0, Math.PI * 2);
    else {
      ctx.moveTo(u * 0.1, -u * 0.05);
      ctx.quadraticCurveTo(u * 0.4, -u * 0.35, u * 0.62, -u * 0.12);
      ctx.quadraticCurveTo(u * 0.52, -u * 0.02, u * 0.5, u * 0.08);
      ctx.quadraticCurveTo(u * 0.4, 0, u * 0.36, u * 0.12);
      ctx.quadraticCurveTo(u * 0.25, u * 0.04, u * 0.1, u * 0.12);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }
  // 몸 · 귀
  const g = ctx.createRadialGradient(-u * 0.05, -u * 0.08, u * 0.02, 0, 0, u * 0.24);
  g.addColorStop(0, '#9a86c0');
  g.addColorStop(1, '#4a3a6a');
  ctx.fillStyle = g;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * u * 0.06, -u * 0.14);
    ctx.lineTo(sd * u * 0.16, -u * 0.32);
    ctx.lineTo(sd * u * 0.18, -u * 0.1);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.2, u * 0.19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd9e6';
  ctx.beginPath();
  ctx.ellipse(0, u * 0.06, u * 0.1, u * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  if (mode === 0) face(ctx, 0, -u * 0.02, u * 0.24, 0, false);
  else {
    // 선글라스
    ctx.fillStyle = '#141018';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.roundRect(sd * u * 0.1 - u * 0.08, -u * 0.09, u * 0.16, u * 0.1, u * 0.04);
      ctx.fill();
    }
    ctx.fillRect(-u * 0.03, -u * 0.07, u * 0.06, u * 0.025);
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fillRect(-u * 0.15, -u * 0.075, u * 0.04, u * 0.02);
    ctx.fillRect(u * 0.05, -u * 0.075, u * 0.04, u * 0.02);
    // 입: 놀람 · 냠냠
    ctx.fillStyle = '#3a1a2a';
    ctx.beginPath();
    if (mode === 3) ctx.ellipse(0, u * 0.08, u * 0.06, u * 0.03 + Math.abs(Math.sin(t * 0.6)) * u * 0.04, 0, 0, Math.PI * 2);
    else if (mode === 1) ctx.ellipse(0, u * 0.08, u * 0.04, u * 0.05, 0, 0, Math.PI * 2);
    else ctx.arc(0, u * 0.05, u * 0.05, 0.2, Math.PI - 0.2);
    if (mode === 3 || mode === 1) ctx.fill();
    else ((ctx.strokeStyle = '#3a1a2a'), (ctx.lineWidth = 1.2), ctx.stroke());
    ctx.fillStyle = '#ffffff';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * u * 0.03, u * 0.06);
      ctx.lineTo(sd * u * 0.045, u * 0.1);
      ctx.lineTo(sd * u * 0.06, u * 0.06);
      ctx.fill();
    }
  }
  ctx.restore();
  if (mode === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.max(12, u * 0.22)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.85;
    ctx.fillText('z', x + u * 0.25, y - u * 0.25 - (t % 60) * u * 0.006);
    ctx.fillText('Z', x + u * 0.4, y - u * 0.45 - ((t + 30) % 60) * u * 0.006);
    ctx.globalAlpha = 1;
  }
}

/** 나비. warm = 데워져 날개를 편다 */
function drawFly(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, warm: boolean, t: number) {
  const flap = warm ? Math.abs(Math.sin(t * 0.35)) : 0.25 + Math.sin(t * 1.3) * 0.05;
  const cols = warm ? ['#ffb347', '#ff6a3d'] : ['#b9d4ec', '#7a9cc0'];
  ctx.save();
  ctx.translate(x + (warm ? 0 : Math.sin(t * 1.7) * u * 0.02), y);
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.scale(sd * (0.25 + 0.75 * flap), 1);
    const g = ctx.createLinearGradient(0, 0, u * 0.3, 0);
    g.addColorStop(0, cols[1]);
    g.addColorStop(1, cols[0]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(u * 0.15, -u * 0.08, u * 0.16, u * 0.12, -0.4, 0, Math.PI * 2);
    ctx.ellipse(u * 0.12, u * 0.08, u * 0.1, u * 0.08, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.beginPath();
    ctx.arc(u * 0.18, -u * 0.1, u * 0.035, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#3a2a2a';
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.035, u * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a2a2a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -u * 0.1);
  ctx.quadraticCurveTo(-u * 0.04, -u * 0.2, -u * 0.08, -u * 0.22);
  ctx.moveTo(0, -u * 0.1);
  ctx.quadraticCurveTo(u * 0.04, -u * 0.2, u * 0.08, -u * 0.22);
  ctx.stroke();
  ctx.restore();
  if (!warm) {
    // 추워서 덜덜: 작은 눈송이
    ctx.strokeStyle = '#e6f6ff';
    ctx.lineWidth = 1.3;
    const sx = x + u * 0.22, sy = y - u * 0.3 - Math.sin(t * 0.05) * u * 0.03, r = u * 0.07;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI) / 3;
      ctx.moveTo(sx - Math.cos(a) * r, sy - Math.sin(a) * r);
      ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
    }
    ctx.stroke();
  }
}

/** 꿀벌 */
function drawBee(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number, face1: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face1, 1);
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  const fl = Math.sin(t * 1.4) * 0.4;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(-u * 0.02 + sd * u * 0.05, -u * 0.12, u * 0.08, u * 0.05, sd * (0.6 + fl), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffcf2a';
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.13, u * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a2010';
  ctx.fillRect(-u * 0.04, -u * 0.085, u * 0.035, u * 0.17);
  ctx.fillRect(u * 0.03, -u * 0.08, u * 0.03, u * 0.16);
  ctx.beginPath();
  ctx.arc(u * 0.11, -u * 0.02, u * 0.018, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 정원사 두더지 (앞쪽 흙구멍). mood 0 구경 · 1 박수 · 2 만세 · 3 어질어질 */
function drawMole(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, mood: number, age: number, t: number) {
  // 흙 둔덕
  const dg = ctx.createRadialGradient(x, y - u * 0.05, u * 0.05, x, y, u * 0.75);
  dg.addColorStop(0, '#9a6a44');
  dg.addColorStop(1, '#5e3a22');
  ctx.fillStyle = dg;
  ctx.beginPath();
  ctx.ellipse(x, y, u * 0.72, u * 0.24, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  const hop = mood === 2 ? Math.abs(Math.sin(age * 0.2)) * u * 0.18 : mood === 1 && age < 50 ? Math.abs(Math.sin(age * 0.3)) * u * 0.05 : 0;
  ctx.save();
  ctx.translate(x, y - hop);
  if (mood === 3) ctx.rotate(Math.sin(age * 0.15) * 0.25);
  const bg = ctx.createRadialGradient(-u * 0.12, -u * 0.5, u * 0.05, 0, -u * 0.35, u * 0.5);
  bg.addColorStop(0, '#8a6a58');
  bg.addColorStop(1, '#4a342a');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.32, u * 0.36, u * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  // 앞발 (박수·만세)
  ctx.fillStyle = '#ffb3a8';
  const clap = mood === 1 && age < 60 ? Math.abs(Math.sin(age * 0.45)) : 0;
  for (const sd of [-1, 1]) {
    const px = mood === 2 ? sd * u * 0.4 : sd * u * (0.06 + clap * 0.14), py = mood === 2 ? -u * 0.82 : -u * 0.22;
    ctx.beginPath();
    ctx.ellipse(px, py, u * 0.1, u * 0.08, sd * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // 얼굴
  ctx.fillStyle = '#d9b8a0';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.36, u * 0.2, u * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff7f9a';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.4, u * 0.08, u * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a1a10';
  ctx.fillStyle = '#2a1a10';
  ctx.lineWidth = Math.max(1, u * 0.04);
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    if (mood === 3) {
      for (let k = 0; k < 10; k++) {
        const a = k * 0.7 + t * 0.3, rr = (k / 10) * u * 0.06;
        ctx.lineTo(sd * u * 0.14 + Math.cos(a) * rr, -u * 0.5 + Math.sin(a) * rr);
      }
      ctx.stroke();
    } else if (mood >= 1) {
      ctx.arc(sd * u * 0.14, -u * 0.48, u * 0.045, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    } else {
      ctx.arc(sd * u * 0.14, -u * 0.5, u * 0.03, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 밀짚모자 (어질어질이면 벗겨져 옆에)
  ctx.save();
  if (mood === 3) ctx.translate(u * 0.5, u * 0.05), ctx.rotate(0.6);
  else ctx.translate(0, -u * 0.62 - (mood === 2 ? Math.abs(Math.sin(age * 0.2)) * u * 0.1 : 0));
  ctx.fillStyle = '#f2cf6b';
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.42, u * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8bd4a';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.08, u * 0.22, u * 0.14, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e04a3a';
  ctx.fillRect(-u * 0.22, -u * 0.07, u * 0.44, u * 0.05);
  ctx.restore();
  ctx.restore();
  if (mood === 3)
    for (let k = 0; k < 3; k++) {
      const a = t * 0.12 + (k * Math.PI * 2) / 3;
      ctx.fillStyle = '#fff27a';
      star(ctx, x + Math.cos(a) * u * 0.32, y - u * 0.85 + Math.sin(a) * u * 0.1, u * 0.07);
      ctx.fill();
    }
}

function drawAll(ctx: CanvasRenderingContext2D, s: MirrorState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R0 = (r: number) => r * w, t = s.t;
  const L = s.L, d = STAGES[s.stage];
  const SX = (x: number, y: number) => X(PX(x, y));
  const SY = (y: number, z = 0) => Y(PY(y) - ZH(y) * z);
  /** 그 깊이의 칸 너비(px) */
  const U = (y: number) => R0(CW * scl(y));
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${R0(sz)}px system-ui, sans-serif`);
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 40 && Math.abs(q.x - x) < w * 0.25 && Math.abs(q.y - y) < size + 4); k++) y -= size + 4;
    rec.push({ x, y, t: s.t });
    if (rec.length > 14) rec.shift();
    fx.pop(Math.max(w * 0.15, Math.min(w * 0.85, x)), Math.max(Y(0.12), y), text, col, size);
  };
  const poly = (pts: number[][]) => {
    ctx.beginPath();
    pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  /** 땅 위 타원 (칸 단위 반지름) */
  const gEll = (cx: number, cy: number, rx: number, ry: number) => {
    ctx.beginPath();
    ctx.ellipse(SX(cx, cy), SY(cy), Math.max(0.5, R0(rx * CW * scl(cy))), Math.max(0.5, R0(ry * DY1)), 0, 0, Math.PI * 2);
  };
  const P = (x: number, y: number, z = 0) => [SX(x, y), SY(y, z)];

  ctx.save();
  fx.begin(ctx);
  // ═════════════ 하늘 · 해 · 담장 ═════════════
  const wallTop = GY0 - 0.13;
  const sky = ctx.createLinearGradient(0, 0, 0, Y(GY0));
  sky.addColorStop(0, '#7cc4ec');
  sky.addColorStop(0.55, '#bfe3f2');
  sky.addColorStop(1, '#ffe2b0');
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, w + 20, Y(GY0) + 10);
  // 먼 구름
  for (let k = 0; k < 4; k++) {
    const cx = ((hsh(k) * 1.4 + t * 0.00012 * (1 + k * 0.3)) % 1.4) - 0.2, cy = 0.12 + hsh(k + 9) * 0.1, r = 0.03 + hsh(k + 3) * 0.02;
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    for (let j = 0; j < 4; j++) {
      ctx.beginPath();
      ctx.arc(X(cx + (j - 1.5) * r * 0.9), Y(cy - (j % 2) * r * 0.4), R0(r * (j % 3 ? 0.8 : 1)), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 해 자리
  const sunXY = (k: number) => {
    const sp = L.sun[k];
    return sp.side === 'N' ? { x: SX(sp.i + 0.5, 0), y: Y(0.165) } : { x: X(sp.side === 'W' ? 0.09 : 0.91), y: Y(0.16) };
  };
  const entry = (k: number) => {
    const sp = L.sun[k];
    return sp.side === 'N' ? P(sp.i + 0.5, 0, ZB) : sp.side === 'W' ? P(0, sp.i + 0.5, ZB) : P(C, sp.i + 0.5, ZB);
  };
  let sun = sunXY(s.sunI);
  const mvA = t - s.sunT;
  if (s.sunI === 1 && mvA < 45) {
    const a0 = sunXY(0), e = 1 - (1 - mvA / 45) ** 3;
    sun = { x: a0.x + (sun.x - a0.x) * e, y: a0.y + (sun.y - a0.y) * e - Math.sin(e * Math.PI) * R0(0.04) };
  }
  // 옮겨 갈 해 자리 (흐린 해 + 화살표)
  if (L.sun.length > 1 && s.sunI === 0) {
    const g2 = sunXY(1);
    ctx.setLineDash([R0(0.008), R0(0.008)]);
    ctx.strokeStyle = 'rgba(255,250,220,.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(g2.x, g2.y, R0(0.04), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(sun.x + R0(0.06), sun.y - R0(0.01));
    ctx.quadraticCurveTo((sun.x + g2.x) / 2, sun.y - R0(0.06), g2.x - R0(0.05), g2.y - R0(0.01));
    ctx.stroke();
    ctx.fillStyle = '#fffbe8';
    font(0.03, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`꽃 ${L.moveAt}송이 피면`, g2.x, g2.y + R0(0.062));
  }
  {
    const r = R0(0.048);
    const glow = ctx.createRadialGradient(sun.x, sun.y, r * 0.5, sun.x, sun.y, r * 3.2);
    glow.addColorStop(0, 'rgba(255,240,170,.85)');
    glow.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, r * 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd23a';
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + t * 0.01;
      ctx.beginPath();
      ctx.moveTo(sun.x + Math.cos(a - 0.12) * r * 1.1, sun.y + Math.sin(a - 0.12) * r * 1.1);
      ctx.lineTo(sun.x + Math.cos(a) * r * (1.55 + 0.12 * Math.sin(t * 0.1 + k)), sun.y + Math.sin(a) * r * (1.55 + 0.12 * Math.sin(t * 0.1 + k)));
      ctx.lineTo(sun.x + Math.cos(a + 0.12) * r * 1.1, sun.y + Math.sin(a + 0.12) * r * 1.1);
      ctx.fill();
    }
    ctx.save();
    ctx.shadowColor = '#ffcf40';
    ctx.shadowBlur = R0(0.05);
    const sg = ctx.createRadialGradient(sun.x - r * 0.3, sun.y - r * 0.3, r * 0.1, sun.x, sun.y, r);
    sg.addColorStop(0, '#fff6b0');
    sg.addColorStop(1, '#ffc21a');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    face(ctx, sun.x, sun.y + r * 0.1, r * 0.55, s.phase === 'result' && !s.ok ? 2 : 1);
  }
  // 뒷담장 (벽돌 · 위 갓돌 · 담쟁이)
  {
    const x0 = SX(0, 0) - R0(0.05), x1 = SX(C, 0) + R0(0.05), yb = Y(GY0), yt = Y(wallTop);
    ctx.fillStyle = '#b8634a';
    ctx.fillRect(x0, yt, x1 - x0, yb - yt);
    const bh = R0(0.02), bw = R0(0.05);
    for (let r = 0; yt + r * bh < yb; r++)
      for (let c = -1; x0 + c * bw < x1; c++) {
        const bx = x0 + c * bw + (r % 2 ? bw / 2 : 0), by = yt + r * bh, v = hsh(r * 13 + c * 7);
        ctx.fillStyle = `hsl(${12 + v * 8}, ${45 + v * 10}%, ${44 + v * 8}%)`;
        ctx.fillRect(Math.max(x0, bx + 1), by + 1, Math.min(bw - 2, x1 - bx - 1), bh - 2);
      }
    const sh = ctx.createLinearGradient(0, yt, 0, yb);
    sh.addColorStop(0, 'rgba(0,0,0,0)');
    sh.addColorStop(1, 'rgba(60,20,0,.28)');
    ctx.fillStyle = sh;
    ctx.fillRect(x0, yt, x1 - x0, yb - yt);
    ctx.fillStyle = '#e9d2a8';
    ctx.fillRect(x0 - R0(0.01), yt - R0(0.016), x1 - x0 + R0(0.02), R0(0.02));
    ctx.fillStyle = '#c9ad80';
    ctx.fillRect(x0 - R0(0.01), yt + R0(0.002), x1 - x0 + R0(0.02), R0(0.006));
    // 담쟁이
    for (let k = 0; k < 26; k++) {
      const lx = x0 + (hsh(k * 3) * 0.3 + (k < 13 ? 0 : 0.68)) * (x1 - x0), ly = yt + hsh(k * 5 + 1) * (yb - yt) * 0.9;
      ctx.fillStyle = k % 3 ? '#4f9a3a' : '#6cbf4a';
      ctx.beginPath();
      ctx.ellipse(lx, ly, R0(0.012), R0(0.008), hsh(k) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 바깥 화단 (정원 양옆)
  {
    ctx.fillStyle = '#4f8a3a';
    poly([[0, Y(GY0)], [SX(0, 0), Y(GY0)], [SX(0, R), Y(GY1)], [0, Y(GY1)]]);
    ctx.fill();
    poly([[w, Y(GY0)], [SX(C, 0), Y(GY0)], [SX(C, R), Y(GY1)], [w, Y(GY1)]]);
    ctx.fill();
    for (let k = 0; k < 14; k++) {
      const side = k % 2, yy = (k >> 1) / 7 + 0.05, gx = side ? SX(C, yy * R) + R0(0.02) : SX(0, yy * R) - R0(0.02), gy = SY(yy * R);
      ctx.fillStyle = ['#ff9ec4', '#ffffff', '#ffd84a', '#c9a0ff'][k % 4];
      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.arc(gx + (j - 1) * R0(0.008), gy - j * R0(0.006), R0(0.006), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // ═════════════ 정원 바닥 ═════════════
  // 디오라마 받침 (흙 단면)
  {
    const yf = Y(GY1), th2 = R0(0.05);
    const sg = ctx.createLinearGradient(0, yf, 0, yf + th2);
    sg.addColorStop(0, '#8a5a3a');
    sg.addColorStop(1, '#4a2e1c');
    ctx.fillStyle = sg;
    ctx.fillRect(0, yf, w, th2 + 2);
    ctx.fillStyle = 'rgba(255,230,190,.18)';
    for (let k = 0; k < 18; k++) ctx.fillRect(hsh(k) * w, yf + th2 * (0.3 + hsh(k + 4) * 0.6), R0(0.012), R0(0.004));
    ctx.fillStyle = '#5fa040';
    ctx.fillRect(0, yf - 1, w, R0(0.008));
  }
  for (let y = 0; y < R; y++)
    for (let x = 0; x < C; x++) {
      const v = hsh(y * 17 + x * 5 + 1), even = (x + y) % 2 === 0;
      ctx.fillStyle = even ? `hsl(${98 + v * 6}, 46%, ${50 + v * 4}%)` : `hsl(${102 + v * 6}, 44%, ${45 + v * 4}%)`;
      poly([P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,70,20,.18)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // 풀잎
      ctx.strokeStyle = 'rgba(200,240,150,.35)';
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const gx = x + 0.2 + hsh(x * 31 + y * 7 + k) * 0.6, gy = y + 0.25 + hsh(x * 13 + y * 29 + k) * 0.6;
        ctx.moveTo(SX(gx, gy), SY(gy));
        ctx.lineTo(SX(gx + 0.04, gy), SY(gy) - R0(0.012));
      }
      ctx.stroke();
    }
  // 햇살이 비치는 쪽 따뜻하게
  {
    const wg = ctx.createRadialGradient(sun.x, Y(GY0), R0(0.05), sun.x, Y(GY0), R0(0.9));
    wg.addColorStop(0, 'rgba(255,220,140,.22)');
    wg.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = wg;
    poly([P(0, 0), P(C, 0), P(C, R), P(0, R)]);
    ctx.fill();
  }
  // 구름 길 (점선)
  if (L.cloud) {
    const [ry, c0, c1] = L.cloud;
    ctx.fillStyle = 'rgba(80,110,160,.14)';
    poly([P(c0, ry), P(c1 + 1, ry), P(c1 + 1, ry + 1), P(c0, ry + 1)]);
    ctx.fill();
    ctx.setLineDash([R0(0.01), R0(0.01)]);
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ═════════════ 빛줄기 ═════════════
  const tr = s.tr;
  const vis: { x0: number; y0: number; x1: number; y1: number; col: number }[] = [];
  for (const p of tr.pieces) {
    const len = Math.hypot(p.x1 - p.x0, p.y1 - p.y0), v = Math.min(len, s.reach - p.d0);
    if (v <= 0) continue;
    const u = v / len;
    vis.push({ x0: p.x0, y0: p.y0, x1: p.x0 + (p.x1 - p.x0) * u, y1: p.y0 + (p.y1 - p.y0) * u, col: p.col });
  }
  const BCOL = [['rgba(255,190,70,', '#ffe9a0', '#fffbe8', '#ffc94a'], ['rgba(255,70,50,', '#ff9a8a', '#fff0ec', '#ff4a3a']];
  // 땅에 비친 빛 (번짐)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const p of vis) {
    ctx.strokeStyle = BCOL[p.col][0] + '.16)';
    ctx.lineWidth = R0(0.05) * scl((p.y0 + p.y1) / 2);
    ctx.beginPath();
    ctx.moveTo(SX(p.x0, p.y0), SY(p.y0));
    ctx.lineTo(SX(p.x1, p.y1), SY(p.y1));
    ctx.stroke();
  }
  ctx.restore();
  // 해 → 정원 입구 광선
  {
    const e0 = entry(s.sunI);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createLinearGradient(sun.x, sun.y, e0[0], e0[1]);
    lg.addColorStop(0, 'rgba(255,235,150,.55)');
    lg.addColorStop(1, 'rgba(255,215,110,.3)');
    ctx.fillStyle = lg;
    const ang = Math.atan2(e0[1] - sun.y, e0[0] - sun.x), nx = -Math.sin(ang), ny = Math.cos(ang);
    poly([[sun.x + nx * R0(0.035), sun.y + ny * R0(0.035)], [e0[0] + nx * R0(0.012), e0[1] + ny * R0(0.012)], [e0[0] - nx * R0(0.012), e0[1] - ny * R0(0.012)], [sun.x - nx * R0(0.035), sun.y - ny * R0(0.035)]]);
    ctx.fill();
    ctx.restore();
  }
  /** 빛줄기 한 토막 (번짐 + 심) */
  const beam = (x0: number, y0: number, x1: number, y1: number, col: number, z0 = ZB, z1 = ZB) => {
    const a = P(x0, y0, z0), b = P(x1, y1, z1), sc = scl((y0 + y1) / 2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.shadowColor = BCOL[col][3];
    ctx.shadowBlur = R0(0.03);
    ctx.strokeStyle = BCOL[col][0] + '.35)';
    ctx.lineWidth = R0(0.026) * sc;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = BCOL[col][1];
    ctx.lineWidth = R0(0.011) * sc;
    ctx.stroke();
    ctx.strokeStyle = BCOL[col][2];
    ctx.lineWidth = R0(0.004) * sc + 0.5;
    ctx.stroke();
    ctx.restore();
  };
  // 빛 토막을 깊이별로 잘라 사물 사이사이에 그린다 (앞의 꽃이 빛을 가리고, 빛이 뒤의 꽃을 가린다)
  const items: { z: number; f: () => void }[] = [];
  for (const p of vis) {
    if (p.y0 === p.y1) items.push({ z: p.y0 - 0.002, f: () => beam(p.x0, p.y0, p.x1, p.y1, p.col) });
    else {
      const sg = p.y1 > p.y0 ? 1 : -1;
      let ya = p.y0;
      while ((p.y1 - ya) * sg > 1e-6) {
        const nb = sg > 0 ? Math.min(p.y1, Math.floor(ya * 2 + 1e-6) / 2 + 0.5) : Math.max(p.y1, Math.ceil(ya * 2 - 1e-6) / 2 - 0.5);
        const a0 = ya, b0 = nb;
        items.push({ z: Math.max(a0, b0) - 0.002, f: () => beam(p.x0, a0, p.x1, b0, p.col) });
        ya = nb;
      }
    }
  }
  // ═════════════ 정원의 것들 ═════════════
  const litOn = (c: number) => tr.lit[c] >= 0 && tr.lit[c] <= s.reach;
  // 덤불
  for (const c of L.hedges) {
    const x = c % C, y = Math.floor(c / C);
    items.push({
      z: y + 0.5,
      f: () => {
        const u = U(y + 0.5), bx = SX(x + 0.5, y + 0.5), by = SY(y + 0.5);
        ctx.fillStyle = 'rgba(20,50,15,.35)';
        gEll(x + 0.56, y + 0.6, 0.42, 0.32);
        ctx.fill();
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2, rr = u * (0.16 + 0.04 * hsh(c + k));
          const lx = bx + Math.cos(a) * u * 0.2, ly = by - u * 0.32 + Math.sin(a) * u * 0.14;
          const g = ctx.createRadialGradient(lx - rr * 0.3, ly - rr * 0.4, rr * 0.1, lx, ly, rr);
          g.addColorStop(0, '#7fcf5a');
          g.addColorStop(1, '#2f6a22');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(lx, ly, rr, 0, Math.PI * 2);
          ctx.fill();
        }
        const g = ctx.createRadialGradient(bx - u * 0.1, by - u * 0.45, u * 0.05, bx, by - u * 0.35, u * 0.3);
        g.addColorStop(0, '#8fdc68');
        g.addColorStop(1, '#3a7a2a');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx, by - u * 0.36, u * 0.26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ['#ff9ec4', '#ffffff'][c % 2];
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(bx + (hsh(c * 3 + k) - 0.5) * u * 0.5, by - u * (0.25 + hsh(c + k * 7) * 0.3), u * 0.035, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    });
  }
  // 물웅덩이 · 프리즘 · 빨간 유리 (칸 종류로)
  for (let c = 0; c < NC; c++) {
    const k = L.kind[c], x = c % C, y = Math.floor(c / C), on = litOn(c);
    if (k === PUD)
      items.push({
        z: y + 0.3,
        f: () => {
          const pg = ctx.createRadialGradient(SX(x + 0.45, y + 0.45), SY(y + 0.45), 1, SX(x + 0.5, y + 0.5), SY(y + 0.5), U(y) * 0.45);
          pg.addColorStop(0, '#d8f4ff');
          pg.addColorStop(0.6, '#6cc0e8');
          pg.addColorStop(1, '#2f7fb0');
          ctx.fillStyle = 'rgba(70,50,30,.5)';
          gEll(x + 0.5, y + 0.55, 0.46, 0.4);
          ctx.fill();
          ctx.fillStyle = pg;
          gEll(x + 0.5, y + 0.5, 0.42, 0.36);
          ctx.fill();
          // 튕기는 방향을 보여 주는 반짝 줄
          const o = L.idx[c], q0 = P(x + 0.5 - 0.3, y + 0.5 + (o ? -0.3 : 0.3)), q1 = P(x + 0.5 + 0.3, y + 0.5 + (o ? 0.3 : -0.3));
          ctx.strokeStyle = on ? '#ffffff' : 'rgba(255,255,255,.75)';
          ctx.lineWidth = R0(0.006);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(q0[0], q0[1]);
          ctx.lineTo(q1[0], q1[1]);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.5)';
          ctx.lineWidth = 1;
          const rr = ((t * 0.01) % 1) * 0.35;
          gEll(x + 0.5, y + 0.5, rr, rr * 0.85);
          ctx.stroke();
          for (let j = 0; j < 4; j++) {
            ctx.fillStyle = '#b8a890';
            gEll(x + 0.5 + Math.cos(j * 1.7) * 0.44, y + 0.5 + Math.sin(j * 1.7) * 0.38, 0.06, 0.05);
            ctx.fill();
          }
        },
      });
    if (k === PRISM)
      items.push({
        z: y + 0.5,
        f: () => {
          const cx = x + 0.5, cy = y + 0.5, u = U(cy);
          ctx.fillStyle = 'rgba(20,50,15,.3)';
          gEll(cx + 0.08, cy + 0.08, 0.36, 0.3);
          ctx.fill();
          // 받침돌
          ctx.fillStyle = '#b9b2a6';
          gEll(cx, cy, 0.3, 0.26);
          ctx.fill();
          ctx.fillStyle = '#d8d2c6';
          ctx.beginPath();
          ctx.ellipse(SX(cx, cy), SY(cy, 0.12), u * 0.3, u * 0.12, 0, 0, Math.PI * 2);
          ctx.fill();
          const tri = [0, 1, 2].map((j) => {
            const a = -Math.PI / 2 + (j * Math.PI * 2) / 3 + 0.3;
            return [cx + Math.cos(a) * 0.3, cy + Math.sin(a) * 0.3];
          });
          const z0 = 0.14, z1 = 0.78;
          for (let j = 0; j < 3; j++) {
            const a0 = tri[j], b0 = tri[(j + 1) % 3];
            const fg = ctx.createLinearGradient(SX(a0[0], a0[1]), 0, SX(b0[0], b0[1]), 0);
            fg.addColorStop(0, 'rgba(190,240,255,.75)');
            fg.addColorStop(0.5, 'rgba(255,255,255,.9)');
            fg.addColorStop(1, 'rgba(150,210,250,.75)');
            ctx.fillStyle = fg;
            poly([P(a0[0], a0[1], z0), P(b0[0], b0[1], z0), P(b0[0], b0[1], z1), P(a0[0], a0[1], z1)]);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,.9)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          ctx.fillStyle = 'rgba(230,250,255,.95)';
          poly(tri.map((q) => P(q[0], q[1], z1)));
          ctx.fill();
          ctx.stroke();
          if (on)
            for (let j = 0; j < 5; j++) {
              ctx.fillStyle = ['#ff6b6b', '#ffd23a', '#7ee06a', '#5ac8ff', '#c08aff'][j];
              const a = t * 0.08 + j * 1.25;
              ctx.beginPath();
              ctx.arc(SX(cx, cy) + Math.cos(a) * u * 0.32, SY(cy, 0.5) + Math.sin(a) * u * 0.15, u * 0.035, 0, Math.PI * 2);
              ctx.fill();
            }
        },
      });
    if (k === GLASS)
      items.push({
        z: y + 0.5,
        f: () => {
          const cx = x + 0.5, cy = y + 0.5, u = U(cy), bx = SX(cx, cy), by = SY(cy);
          ctx.fillStyle = 'rgba(20,50,15,.3)';
          gEll(cx + 0.08, cy + 0.08, 0.3, 0.26);
          ctx.fill();
          ctx.fillStyle = '#4a3a30';
          ctx.fillRect(bx - u * 0.03, by - u * 0.25, u * 0.06, u * 0.25);
          ctx.save();
          if (on) (ctx.shadowColor = '#ff3a2a'), (ctx.shadowBlur = R0(0.04));
          const gg = ctx.createLinearGradient(bx - u * 0.22, by - u * 0.85, bx + u * 0.22, by - u * 0.25);
          gg.addColorStop(0, on ? '#ffb0a0' : '#ff8a7a');
          gg.addColorStop(0.5, on ? '#ff3a2a' : '#d8281a');
          gg.addColorStop(1, '#9a1408');
          ctx.fillStyle = gg;
          ctx.beginPath();
          ctx.roundRect(bx - u * 0.22, by - u * 0.85, u * 0.44, u * 0.6, u * 0.06);
          ctx.fill();
          ctx.restore();
          ctx.strokeStyle = '#3a2a22';
          ctx.lineWidth = Math.max(1.5, u * 0.035);
          ctx.beginPath();
          ctx.roundRect(bx - u * 0.22, by - u * 0.85, u * 0.44, u * 0.6, u * 0.06);
          ctx.moveTo(bx, by - u * 0.85);
          ctx.lineTo(bx, by - u * 0.25);
          ctx.moveTo(bx - u * 0.22, by - u * 0.55);
          ctx.lineTo(bx + u * 0.22, by - u * 0.55);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.55)';
          ctx.fillRect(bx - u * 0.17, by - u * 0.8, u * 0.05, u * 0.2);
          ctx.fillStyle = '#3a2a22';
          ctx.beginPath();
          ctx.moveTo(bx - u * 0.28, by - u * 0.85);
          ctx.lineTo(bx, by - u * 1.0);
          ctx.lineTo(bx + u * 0.28, by - u * 0.85);
          ctx.fill();
        },
      });
  }
  // 거울
  const hoverOk = s.down && s.hover >= 0 && s.phase === 'play';
  s.mirs.forEach((m, i) => {
    items.push({
      z: m.y + 0.5,
      f: () => {
        const cx = m.x + 0.5, cy = m.y + 0.5, u = U(cy), on = litOn(m.y * C + m.x);
        const a = (m.ang * Math.PI) / 180, ux = Math.cos(a), uy = -Math.sin(a), hl = 0.42;
        const x1 = cx - ux * hl, y1 = cy - uy * hl, x2 = cx + ux * hl, y2 = cy + uy * hl;
        const z0 = 0.12, z1 = 0.98;
        // 그림자
        ctx.fillStyle = 'rgba(20,50,15,.32)';
        poly([P(x1 + 0.1, y1 + 0.12), P(x2 + 0.1, y2 + 0.12), P(x2 + 0.32, y2 + 0.34), P(x1 + 0.32, y1 + 0.34)]);
        ctx.fill();
        // 고르는 중: 받침 둘레 빛
        if (hoverOk && s.hover === i) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          gEll(cx, cy, 0.44, 0.4);
          ctx.stroke();
        }
        // 받침돌
        ctx.fillStyle = '#8f8678';
        gEll(cx, cy + 0.02, 0.24, 0.2);
        ctx.fill();
        ctx.fillStyle = '#c9c0b0';
        ctx.beginPath();
        ctx.ellipse(SX(cx, cy), SY(cy, 0.1), u * 0.24, u * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
        // 판 뒷면(두께)
        const nx = -uy * 0.05, ny = ux * 0.05;
        ctx.fillStyle = '#8a6a2a';
        poly([P(x1 + nx, y1 + ny, z0), P(x2 + nx, y2 + ny, z0), P(x2 + nx, y2 + ny, z1), P(x1 + nx, y1 + ny, z1)]);
        ctx.fill();
        // 거울판
        const q1 = P(x1, y1, z1), q2 = P(x2, y2, z0);
        const gg = ctx.createLinearGradient(q1[0], q1[1], q2[0], q2[1]);
        gg.addColorStop(0, on ? '#fff8dc' : '#eef8ff');
        gg.addColorStop(0.35, on ? '#ffe79a' : '#a9cbe6');
        gg.addColorStop(0.65, on ? '#fff3c4' : '#d9ecfa');
        gg.addColorStop(1, on ? '#e8c060' : '#7ea6c8');
        ctx.fillStyle = gg;
        poly([P(x1, y1, z0), P(x2, y2, z0), P(x2, y2, z1), P(x1, y1, z1)]);
        ctx.fill();
        // 반짝 줄 (찰칵 직후 쓱 지나간다)
        const ca = t - m.clickT, gp = ca < 24 ? ca / 24 : ((t * 0.006 + i * 0.37) % 1.6) - 0.3;
        if (gp > 0 && gp < 1) {
          ctx.save();
          poly([P(x1, y1, z0), P(x2, y2, z0), P(x2, y2, z1), P(x1, y1, z1)]);
          ctx.clip();
          ctx.strokeStyle = 'rgba(255,255,255,.85)';
          ctx.lineWidth = u * 0.08;
          const gx = x1 + (x2 - x1) * gp, gy = y1 + (y2 - y1) * gp;
          const a0 = P(gx - ux * 0.1, gy - uy * 0.1, z0), b0 = P(gx + ux * 0.1, gy + uy * 0.1, z1);
          ctx.beginPath();
          ctx.moveTo(a0[0], a0[1]);
          ctx.lineTo(b0[0], b0[1]);
          ctx.stroke();
          ctx.restore();
        }
        // 놋쇠 테
        ctx.strokeStyle = '#d9a441';
        ctx.lineWidth = Math.max(1.6, u * 0.04);
        ctx.lineJoin = 'round';
        poly([P(x1, y1, z0), P(x2, y2, z0), P(x2, y2, z1), P(x1, y1, z1)]);
        ctx.stroke();
        ctx.strokeStyle = '#fff0b0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const t1 = P(x1, y1, z1), t2 = P(x2, y2, z1);
        ctx.moveTo(t1[0], t1[1] - 1);
        ctx.lineTo(t2[0], t2[1] - 1);
        ctx.stroke();
        // 꼭대기 손잡이
        const kn = P(cx, cy, z1 + 0.08);
        const kg = ctx.createRadialGradient(kn[0] - u * 0.02, kn[1] - u * 0.02, 1, kn[0], kn[1], u * 0.06);
        kg.addColorStop(0, '#fff3c0');
        kg.addColorStop(1, '#b8862a');
        ctx.fillStyle = kg;
        ctx.beginPath();
        ctx.arc(kn[0], kn[1], u * 0.06, 0, Math.PI * 2);
        ctx.fill();
      },
    });
  });
  // 꽃
  s.buds.forEach((b, i) => {
    items.push({ z: b.y + 0.5, f: () => drawFlower(ctx, SX(b.x + 0.5, b.y + 0.55), SY(b.y + 0.55), U(b.y + 0.5) * 1.35, b, t, litOn(b.y * C + b.x), i) });
  });
  // 박쥐 (잠든 동안은 장대에 거꾸로)
  const bt = s.bat;
  if (bt && bt.st <= 1)
    items.push({
      z: bt.y + 0.5,
      f: () => {
        const cx = bt.x + 0.5, cy = bt.y + 0.5, u = U(cy), bx = SX(cx, cy), by = SY(cy);
        ctx.fillStyle = 'rgba(20,50,15,.3)';
        gEll(cx + 0.1, cy + 0.1, 0.3, 0.2);
        ctx.fill();
        ctx.strokeStyle = '#7a5434';
        ctx.lineWidth = Math.max(2, u * 0.06);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx, by - u * 0.95);
        ctx.moveTo(bx - u * 0.3, by - u * 0.95);
        ctx.lineTo(bx + u * 0.3, by - u * 0.95);
        ctx.stroke();
        if (bt.st === 0) drawBat(ctx, bx + u * 0.2, by - u * 0.66, u * 1.3, 0, t);
        else drawBat(ctx, bx, by - u * 1.05 - Math.min(1, bt.t / WAKE) * u * 0.2, u * 1.4, 1, t);
      },
    });
  // 나비 (보너스)
  const fl = s.fly;
  if (fl)
    items.push({
      z: fl.y + 0.5,
      f: () => {
        const cx = fl.x + 0.5, cy = fl.y + 0.5, u = U(cy);
        if (!fl.warm) {
          // 풀잎 위에서 덜덜
          ctx.strokeStyle = '#3f8a2a';
          ctx.lineWidth = Math.max(1.5, u * 0.05);
          ctx.beginPath();
          ctx.moveTo(SX(cx, cy), SY(cy));
          ctx.quadraticCurveTo(SX(cx, cy) + u * 0.1, SY(cy) - u * 0.2, SX(cx, cy) - u * 0.02, SY(cy, 0.38));
          ctx.stroke();
          ctx.fillStyle = '#6cbf4a';
          ctx.beginPath();
          ctx.ellipse(SX(cx, cy) + u * 0.06, SY(cy, 0.38), u * 0.2, u * 0.06, -0.3, 0, Math.PI * 2);
          ctx.fill();
          drawFly(ctx, SX(cx, cy), SY(cy, 0.5), u * 1.9, false, t);
        } else {
          const a = (t - fl.wt) * 0.04, up = Math.min(1, (t - fl.wt) / 40);
          drawFly(ctx, SX(cx, cy) + Math.cos(a) * u * 0.5 * up, SY(cy, 0.5 + up * 0.6) + Math.sin(a * 2) * u * 0.18, u * 1.7, true, t);
        }
      },
    });
  // 구름 (그늘이 땅에 진다)
  if (L.cloud) {
    const [ry] = L.cloud, ph = (t % BEAT) / BEAT, e = ph < 0.7 ? 0 : (ph - 0.7) / 0.3;
    const c0 = cloudCol(L, t), c1 = cloudCol(L, t + BEAT), cx = c0 + (c1 - c0) * e * e * (3 - 2 * e) + 0.5, cy = ry + 0.5;
    items.push({
      z: cy + 0.4,
      f: () => {
        const u = U(cy);
        ctx.fillStyle = 'rgba(30,40,70,.32)';
        gEll(cx, cy, 0.48, 0.42);
        ctx.fill();
        const bx = SX(cx, cy), by = SY(cy, 1.75) + Math.sin(t * 0.05) * u * 0.04;
        for (const [ox, oy, r] of [[-0.3, 0.05, 0.24], [0.28, 0.06, 0.22], [0, -0.1, 0.32], [-0.12, 0.1, 0.24], [0.14, 0.1, 0.24]]) {
          const g = ctx.createRadialGradient(bx + ox * u - r * u * 0.3, by + oy * u - r * u * 0.4, 1, bx + ox * u, by + oy * u, r * u);
          g.addColorStop(0, '#ffffff');
          g.addColorStop(1, '#c8d6ea');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(bx + ox * u, by + oy * u, r * u, 0, Math.PI * 2);
          ctx.fill();
        }
        face(ctx, bx, by + u * 0.06, u * 0.16, 0, true);
      },
    });
  }
  items.sort((a, b) => a.z - b.z);
  for (const it of items) it.f();

  // 빛이 꺾이는 곳: 반짝 (거울·물웅덩이·프리즘)
  for (let c = 0; c < NC; c++) {
    const k = L.kind[c];
    if ((k !== MIR && k !== PUD && k !== PRISM && k !== GLASS) || !litOn(c)) continue;
    const x = c % C, y = Math.floor(c / C), q = P(x + 0.5, y + 0.5, k === PUD ? 0.02 : ZB), r = U(y) * (0.16 + 0.03 * Math.sin(t * 0.3 + c));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const fg = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], r);
    fg.addColorStop(0, tr.red[c] && k !== GLASS ? 'rgba(255,200,190,.95)' : 'rgba(255,250,220,.95)');
    fg.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(q[0], q[1], r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // 빛 앞머리 반짝 (뻗어 나가는 중)
  for (const p of vis) {
    const full = tr.pieces.find((q) => q.x0 === p.x0 && q.y0 === p.y0);
    if (!full || (full.x1 === p.x1 && full.y1 === p.y1)) continue;
    const q = P(p.x1, p.y1, ZB);
    ctx.fillStyle = '#ffffff';
    star(ctx, q[0], q[1], R0(0.018));
    ctx.fill();
  }
  // 빛이 지나가는 반짝이 알갱이
  ctx.fillStyle = 'rgba(255,255,240,.9)';
  vis.forEach((p, k) => {
    const len = Math.hypot(p.x1 - p.x0, p.y1 - p.y0);
    for (let j = 0; j < len * 1.5; j++) {
      const u = ((t * 0.03 + j / (len * 1.5) + k * 0.13) % 1);
      const q = P(p.x0 + (p.x1 - p.x0) * u, p.y0 + (p.y1 - p.y0) * u, ZB + 0.03 * Math.sin(t * 0.2 + j));
      ctx.beginPath();
      ctx.arc(q[0], q[1], 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // 날아다니는 박쥐 (먹으러 · 떠나며)
  if (bt && bt.st >= 2 && bt.st <= 4) {
    const u = U(Math.min(R, Math.max(0, bt.wy)));
    drawBat(ctx, SX(bt.wx, Math.max(0, bt.wy)), SY(Math.max(0, bt.wy), 1.0) + Math.sin(t * 0.4) * u * 0.05, u * 1.4, bt.st === 3 ? 3 : 2, t);
  }
  // 꿀벌: 꽃이 피면 날아와 맴돈다
  s.buds.forEach((b, i) => {
    if (b.st !== 2 || i > 3) return;
    const age = t - b.bloomT, u = U(b.y + 0.5);
    const tx = SX(b.x + 0.5, b.y + 0.5), ty = SY(b.y + 0.5, 0.95);
    const sx0 = i % 2 ? w + 20 : -20, sy0 = Y(0.3);
    const e = Math.min(1, age / 70), ee = e * e * (3 - 2 * e);
    const hx = tx + Math.cos(t * 0.07 + i) * u * 0.25 * ee, hy = ty + Math.sin(t * 0.11 + i) * u * 0.12 * ee;
    drawBee(ctx, sx0 + (hx - sx0) * ee, sy0 + (hy - sy0) * ee, u * 0.75, t + i * 9, Math.cos(t * 0.07 + i) > 0 ? -1 : 1);
  });
  // 장식 나비 둘
  for (let k = 0; k < 2; k++) {
    const a = t * 0.012 + k * 3;
    drawFly(ctx, X(k ? 0.95 : 0.05) + Math.sin(a * 1.3) * R0(0.03), Y(GY0 + 0.2 + k * 0.35) + Math.sin(a * 2.1) * R0(0.04), R0(0.06), true, t + k * 20);
  }

  // ═════════════ 미리 보기 (누르고 있는 동안): 돌리면 빛길이 이렇게 ═════════════
  if (hoverOk && s.rots > 0) {
    const key = `${t}:${s.hover}:${s.sunI}`;
    let pv = PREV.get(s);
    if (!pv || pv.key !== key) {
      const tr2 = trace(L, maskOf(s) ^ (1 << s.hover), !!bt && bt.st <= 1, s.sunI, null, true);
      let newly = 0;
      s.buds.forEach((b, i) => {
        const c = b.y * C + b.x;
        if (b.st !== 0 || tr2.lit[c] < 0) return;
        if (b.k === SUNF || (b.k === TULIP && tr2.red[c]) || (b.k === ROSE && tr2.stab[c])) newly |= 1 << i;
      });
      PREV.set(s, (pv = { key, tr: tr2, newly, bat: !!bt && bt.st === 0 && tr2.batLit >= 0, fly: !!fl && !fl.warm && tr2.lit[fl.y * C + fl.x] >= 0 }));
    }
    ctx.save();
    ctx.setLineDash([R0(0.016), R0(0.012)]);
    ctx.lineDashOffset = -t * 0.6;
    ctx.lineCap = 'round';
    for (const p of pv.tr.pieces) {
      const a = P(p.x0, p.y0, ZB + 0.06), b = P(p.x1, p.y1, ZB + 0.06);
      ctx.strokeStyle = 'rgba(40,30,0,.45)';
      ctx.lineWidth = R0(0.012);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.strokeStyle = p.col ? '#ffb0a0' : '#fff6c0';
      ctx.lineWidth = R0(0.0065);
      ctx.stroke();
    }
    ctx.restore();
    // 돌린 뒤의 거울판 (흐린 윤곽)
    const m = s.mirs[s.hover], a = ((m.target + 90) * Math.PI) / 180, ux = Math.cos(a), uy = -Math.sin(a);
    const cx = m.x + 0.5, cy = m.y + 0.5;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    poly([P(cx - ux * 0.42, cy - uy * 0.42, 0.12), P(cx + ux * 0.42, cy + uy * 0.42, 0.12), P(cx + ux * 0.42, cy + uy * 0.42, 0.98), P(cx - ux * 0.42, cy - uy * 0.42, 0.98)]);
    ctx.stroke();
    ctx.setLineDash([]);
    const badge = (x: number, y: number, z: number, good: boolean, txt: string) => {
      const q = P(x, y, z);
      ctx.fillStyle = good ? '#3ccf7a' : '#ff5a5a';
      ctx.beginPath();
      ctx.arc(q[0], q[1], R0(0.026), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      font(0.032, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, q[0], q[1] + 1);
    };
    s.buds.forEach((b, i) => (pv!.newly >> i) & 1 && badge(b.x + 0.5, b.y + 0.5, 1.15, true, '✓'));
    if (pv.bat && bt) badge(bt.x + 0.5, bt.y + 0.5, 1.5, false, '✗');
    if (pv.fly && fl) badge(fl.x + 0.5, fl.y + 0.5, 1.0, true, '★');
  }
  // 1판 첫 톡 전: 여기를 톡!
  if (s.stage === 0 && !s.firstTap && s.phase === 'play' && s.mirs.length) {
    const q = mirScreen(s.mirs[0]), pulse = (t % 50) / 50;
    ctx.strokeStyle = `rgba(255,255,255,${1 - pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(X(q.x), Y(q.y), R0(0.03 + pulse * 0.06), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    font(0.07, 400);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👆', X(q.x) + R0(0.03), Y(q.y) + R0(0.09) + Math.sin(t * 0.15) * R0(0.01));
  }

  // 정원사 두더지 (앞쪽 가운데 아래)
  {
    const age = t - s.moleT, mood = s.phase === 'result' ? (s.ok ? 2 : 3) : age < 70 ? s.moleMood : 0;
    drawMole(ctx, X(0.5), Y(GY1 + 0.042), R0(0.12), mood, age, t);
  }

  // ═════════════ 사건 연출 ═════════════
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const q = P(e.x, Math.min(R, Math.max(0, e.y)), 0.6), x = q[0], y = q[1];
    if (e.kind === 'click') fx.burst(x, y, '#fff3b0', 12, 2.6, 2), fx.ring(x, y, '#ffffff', R0(0.07), 3), fx.kick(2), say(x, y - R0(0.06), e.text!, '#ffffff', 16);
    if (e.kind === 'touch') fx.ring(x, y, '#ffe14d', R0(0.05), 3), fx.burst(x, y, '#fff6c0', 6, 1.6, 1.6);
    if (e.kind === 'bloom') fx.burst(x, y, '#ffd23a', 24, 4, 2.8), fx.burst(x, y, '#ffffff', 10, 2.4, 2), fx.ring(x, y, '#ffe14d', R0(0.09), 4), fx.kick(3), say(x, y - R0(0.07), e.text!, '#fff3a0', 17);
    if (e.kind === 'fly') fx.burst(x, y, '#ffb347', 18, 3.4, 2.4), fx.ring(x, y, '#ffd84a', R0(0.08), 3), say(x, y - R0(0.07), e.text!, '#ffd9a0', 15);
    if (e.kind === 'batwake') fx.burst(x, y - R0(0.05), '#c9a8ff', 18, 3.6, 2.4), fx.kick(5), fx.blink('#fff6c8', 0.25), say(x, y - R0(0.12), e.text!, '#ffffff', 17);
    if (e.kind === 'bathuh') say(x, y - R0(0.12), e.text!, '#e6d8ff', 14);
    if (e.kind === 'eat') fx.burst(x, y, '#7fcf5a', 22, 4, 2.6), fx.burst(x, y, '#ffd23a', 12, 3, 2.4), fx.kick(7), fx.blink(th.hot, 0.18), say(x, y - R0(0.08), e.text!, '#ffb3b3', 18);
    if (e.kind === 'wilt') fx.burst(x, y, '#ff8fb0', 10, 2.4, 2), say(x, y - R0(0.08), e.text!, '#ffc4d4', 14);
    if (e.kind === 'huh') fx.kick(1.5), say(x, y - R0(0.08), e.text!, '#ffd0c8', 14);
    if (e.kind === 'sunmove') fx.ring(sun.x, sun.y, '#ffe066', R0(0.12), 5), fx.blink('#fff6c8', 0.2), say(sun.x, sun.y + R0(0.09), e.text!, '#fff3a0', 16);
    if (e.kind === 'nope') say(x, y - R0(0.06), e.text!, '#ffd6cc', 14), fx.kick(1.5);
    if (e.kind === 'clear')
      fx.burst(w * 0.25, Y(0.6), '#ffd23a', 40, 6, 3.2), fx.burst(w * 0.75, Y(0.6), '#ff9ec4', 40, 6, 3.2), fx.burst(w * 0.5, Y(0.75), '#ffffff', 36, 6, 3), fx.ring(w / 2, Y(0.7), '#ffe066', R0(0.45), 7), fx.blink('#fff6c8', 0.22);
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.18);
  }
  fx.memo.t = s.t;
  ctx.restore();

  // ═════════════ HUD ═════════════
  const hb = R0(0.085);
  ctx.fillStyle = 'rgba(34,62,30,.9)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.046, 900);
  const ttl = `🌻 ${s.stage + 1}번째 정원`, tw1 = ctx.measureText(ttl).width;
  ctx.fillText(ttl, R0(0.03), hb * 0.52);
  font(0.036, 800);
  ctx.fillStyle = th.muted;
  ctx.fillText(` / ${STAGE_COUNT}`, R0(0.03) + tw1, hb * 0.56);
  ctx.textAlign = 'right';
  font(0.042, 900);
  ctx.fillStyle = '#ffd23a';
  const stt = `★ ${s.stars}/${STAGE_COUNT * 3}`;
  ctx.fillText(stt, w - R0(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R0(0.05) - ctx.measureText(stt).width, hb * 0.52);
  // 판 카드: 시작 · 꽃밭 완성 · 실패
  {
    let head = '', sub = '', nw = '', col = '#ffffff', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      if (s.ok) (head = s.won ? '정원 완성! 🌻' : '꽃밭 완성!'), (sub = `다 피움 ✓ · 돌리기 ${s.used}번${s.used <= s.par ? ' ✓' : ` (≤${s.par} ✗)`} · ${d.bonus === 'bat' ? '박쥐' : '나비'} ${s.starOk[2] ? '✓' : '✗'}`), (col = '#ffd23a');
      else (head = `앗… ${s.why}`), (sub = s.hearts > 0 ? '하트 -1 · 같은 정원 다시' : '끝 — 꽃들이 고마워해요!'), (col = '#ffb3a8');
    } else if (s.pt < CARD_T) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20);
      head = s.again ? `다시! ${s.stage + 1}번째 정원` : `${s.stage + 1}번째 정원`;
      sub = `꽃 ${s.buds.length}송이 · 돌리기 ${s.par + d.extra}번 · ★ ${s.par}번 이하`;
      nw = d.news;
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = Y(nw ? 0.3 : 0.31), ch = nw ? 0.158 : 0.11;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(34,62,30,.93)';
      ctx.beginPath();
      ctx.roundRect(-R0(nw ? 0.46 : 0.4), -R0(0.055), R0(nw ? 0.92 : 0.8), R0(ch), R0(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.048, 900);
      if (s.phase === 'result' && s.ok) {
        const hw = ctx.measureText(head).width, sw = R0(0.056), x0 = -(hw + R0(0.02) + sw * 3) / 2;
        ctx.textAlign = 'left';
        ctx.fillText(head, x0, -R0(0.018));
        for (let k = 0; k < 3; k++) {
          const ag = s.pt - (10 + k * 13);
          if (ag < 0) continue;
          const got = s.starOk[k], popS = ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1, sx = x0 + hw + R0(0.02) + sw * (k + 0.5);
          ctx.save();
          ctx.translate(sx, -R0(0.018));
          ctx.scale(popS, popS);
          star(ctx, 0, 0, R0(0.024));
          ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.12)';
          ctx.fill();
          ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx, cyy - R0(0.018), '#ffe066', 16, 3, 2.4);
        }
        ctx.textAlign = 'center';
      } else ctx.fillText(head, 0, -R0(0.018), R0(0.76));
      ctx.fillStyle = '#fffaf0';
      font(0.036, 800);
      ctx.fillText(sub, 0, R0(0.03), R0(0.8));
      if (nw) {
        ctx.fillStyle = '#ffe9a8';
        font(0.036, 900);
        ctx.fillText(nw, 0, R0(0.077), R0(0.86));
      }
      ctx.restore();
    }
  }
  // ═════════════ 아래 띠 ═════════════
  {
    const ty = BAND, tb = h / w;
    const g = ctx.createLinearGradient(0, Y(ty), 0, Y(tb));
    g.addColorStop(0, 'rgba(40,70,34,.96)');
    g.addColorStop(1, 'rgba(24,46,20,.98)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, Y(ty), w, Y(tb - ty) + 4, [R0(0.03), R0(0.03), 0, 0]);
    ctx.fill();
    // 돌리기 남은 수: 작은 거울 (★ 선까지 쓰면 별)
    const r1 = Y(ty + 0.042), total = s.par + d.extra;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f0ffe0';
    font(0.038, 900);
    ctx.fillText('돌리기', X(0.03), r1);
    const dx0 = X(0.19), dstep = R0(0.052);
    for (let k = 0; k < total; k++) {
      const cx = dx0 + k * dstep + (k >= s.par ? R0(0.018) : 0), used = k < s.used, inPar = k < s.par;
      ctx.save();
      ctx.translate(cx, r1);
      ctx.rotate(-0.6);
      ctx.beginPath();
      ctx.roundRect(-R0(0.009), -R0(0.022), R0(0.018), R0(0.044), R0(0.006));
      if (used) {
        ctx.strokeStyle = 'rgba(255,255,255,.3)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        const mg = ctx.createLinearGradient(-R0(0.01), 0, R0(0.01), 0);
        mg.addColorStop(0, inPar ? '#ffffff' : '#cfe0ee');
        mg.addColorStop(1, inPar ? '#9fd0ff' : '#7a9cb8');
        ctx.fillStyle = mg;
        ctx.fill();
        ctx.strokeStyle = '#d9a441';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    }
    const lx = dx0 + s.par * dstep - dstep / 2 + R0(0.009);
    ctx.strokeStyle = '#ffd23a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, r1 - R0(0.026));
    ctx.lineTo(lx, r1 + R0(0.022));
    ctx.stroke();
    ctx.fillStyle = '#ffd23a';
    font(0.03, 900);
    ctx.textAlign = 'center';
    ctx.fillText('★', lx, r1 - R0(0.036));
    ctx.textAlign = 'right';
    font(0.036, 800);
    ctx.fillStyle = s.rots > 0 ? '#d8f0c0' : '#ffb3a8';
    ctx.fillText(`${s.rots}번 남음`, X(0.97), r1);
    // 별 목표 셋
    const nIn = s.buds.filter((b) => b.st === 2).length, nAll = s.buds.length;
    const bonusOk = d.bonus === 'bat' ? !s.batWoke : !!fl?.warm;
    const okk = s.phase === 'result' && s.ok ? s.starOk : [nIn === nAll, s.used <= s.par, d.bonus === 'fly' && bonusOk];
    const bad = [s.phase === 'result' && !s.ok, s.used > s.par, d.bonus === 'bat' && s.batWoke];
    const labels = [`꽃 ${nIn}/${nAll}`, `돌리기 ≤${s.par}`, d.bonus === 'bat' ? '박쥐 쿨쿨' : '나비 데우기'];
    const r2 = Y(ty + 0.115), cw2 = R0(0.3);
    for (let k = 0; k < 3; k++) {
      const cx1 = X(0.03) + k * (cw2 + R0(0.017));
      ctx.fillStyle = okk[k] ? 'rgba(255,210,58,.25)' : bad[k] ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.08)';
      ctx.beginPath();
      ctx.roundRect(cx1, r2 - R0(0.026), cw2, R0(0.052), R0(0.026));
      ctx.fill();
      ctx.strokeStyle = okk[k] ? '#ffd23a' : bad[k] ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = okk[k] ? '#ffd23a' : bad[k] ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.6)';
      font(0.04, 900);
      ctx.textAlign = 'center';
      ctx.fillText(bad[k] ? '✗' : '★', cx1 + R0(0.03), r2 + R0(0.002));
      ctx.fillStyle = okk[k] ? '#fff6dc' : bad[k] ? 'rgba(255,255,255,.4)' : '#f0ffe0';
      font(0.036, 800);
      ctx.textAlign = 'left';
      ctx.fillText(labels[k], cx1 + R0(0.058), r2 + R0(0.002), cw2 - R0(0.066));
    }
    // 안내 한 줄
    let hint = d.hint;
    const first = s.stage === 0 && !s.firstTap && s.phase === 'play';
    if (first) hint = '👆 거울을 톡! 햇빛이 꺾여요';
    else if (s.down && s.phase === 'play') hint = s.hover < 0 ? '거울을 눌러요' : s.rots > 0 ? '떼면 찰칵! 점선 = 돌린 뒤의 빛길' : '돌리기를 다 썼어요';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 정원에 꽃이 활짝!' : `★ ${s.got}개! 다음 정원엔 새것이 나와요`) : '꾹 누르면 돌린 뒤의 빛길이 보여요';
    else if (s.stage === 0) hint = '꾹 누르고 있으면 돌린 뒤의 빛길이 보여요';
    ctx.textAlign = 'center';
    const hy = Y(ty + 0.198);
    if (s.news && s.t - s.news.t < NEWS_T && !first) {
      // 새것 알림: 안내 줄 자리에 반짝이는 띠로
      const age = s.t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20), pop2 = 1 + Math.max(0, 1 - age / 10) * 0.15;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, hy);
      ctx.scale(pop2, pop2);
      font(0.037, 900);
      const tw2 = Math.min(w - R0(0.03), ctx.measureText(s.news.text).width + R0(0.06));
      ctx.fillStyle = 'rgba(255,210,58,.22)';
      ctx.beginPath();
      ctx.roundRect(-tw2 / 2, -R0(0.03), tw2, R0(0.06), R0(0.03));
      ctx.fill();
      ctx.strokeStyle = th.accent;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.news.text, 0, R0(0.002), w - R0(0.06));
      ctx.restore();
    } else {
      ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
      font(first ? 0.044 : 0.037, 900);
      ctx.fillText(hint, w / 2, hy, w - R0(0.05));
    }
  }
}
