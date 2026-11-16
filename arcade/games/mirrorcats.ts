/**
 * 거울 쌍둥이 고양이 (28라운드: 처음 보는 규칙) — 거울 쌍둥이 × 스와이프 × 턴제화.
 * 기준 9(손이 하는 일은 하나): 화면을 민다(화살표 키도). 한 번 밀면 두 방의 고양이가 함께 쭈욱 미끄러진다.
 * 규칙(결정적, 2줄): 판 가운데 큰 거울. 왼쪽 방 고양이는 민 쪽으로, 거울 속(오른쪽 방) 고양이는 좌우만 반대로(위·아래는 같게)
 *   벽·가구에 닿을 때까지 미끄러진다. 두 방의 가구 배치가 달라서 한쪽만 '쿵' 막히면 그 고양이만 멈추고 다른 쪽은 계속 가
 *   둘의 자리가 어긋난다. 두 고양이가 **같은 수에** 각자 방의 같은 색 생선 위에 멈추면 '냐옹 듀엣' 냠! 생선 쌍을 다 먹으면 통과.
 * 와우: 거울 속 고양이가 거울답지 않게 '다른 방'에서 움직인다 — 일부러 한쪽을 벽에 박아 어긋남을 만들고, 그 어긋남으로
 *   두 생선 자리를 동시에 맞춘다. 모든 판은 너비 우선 탐색으로 풀이가 있음을 확인하고 최소 수를 잰다.
 * 미리 보기: 밀기 전에 늘, 방향마다(색 화살표) 두 고양이가 어디서 멈출지 방 안에 작은 색 점으로, 아래 띠에 '◀ 🐱3칸 · 🪞쿵'으로.
 * 판 8개: 목표 = 생선 쌍을 모두 듀엣으로 먹기(수 한도 안에). 별 = ★ 통과 · ★ 최소+3수 이내 · ★ 최소 수.
 *   실패(수 한도를 다 씀 · 길이 막힘 · 남은 수로는 못 닿음) = 하트 -1, 같은 판 다시. 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1판 거울 앞(밀기·좌우 반대) → 2판 다른 방(쿵 어긋남으로 맞추기) → 3판 생선 두 쌍(어느 쌍부터)
 *   → 4판 📦 상자(한쪽 방만: 들이받으면 쭈욱 밀려 가 방 모양이 바뀜) → 5판 ⚡ 금 간 거울(그 줄의 거울 고양이는 같은 쪽으로)
 *   → 6판 🔘 발판과 문(한쪽이 발판 위에 있는 동안 건너편 방 문이 열림) → 7판 상자+두 쌍 → 8판 거울 궁전(전부).
 * 웃음: 거울 속 고양이는 늘 반대 표정 — 왼쪽이 하품하면 오른쪽은 말똥, 한쪽이 '쿵' 하면 다른 쪽은 '킥킥'.
 *   둘이 생선을 동시에 물면 거울이 반짝 '냐옹~♪ 듀엣'. 둘이 거울에 코를 맞대면 '콩♥'. 쥐구멍의 생쥐(와 거울 속 생쥐)가 구경하며 깔깔.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.14;
/** 방 하나: 가로 W칸 · 세로 H칸 */
const W = 5, H = 6, NC = W * H, NB = NC + 1;
/** 0 위 · 1 아래 · 2 왼쪽 · 3 오른쪽 */
const DX = [0, 0, -1, 1], DY = [-1, 1, 0, 0];
const DN = ['up', 'down', 'left', 'right'] as const;
const DI: Record<string, number> = { up: 0, down: 1, left: 2, right: 3 };
/** 한 칸 미끄러지는 틱 · 상자가 한 칸 밀리는 틱 */
const SPD = 4, BSPD = 3;
const RESULT_OK = 175, RESULT_FAIL = 140, SETTLE_OK = 46, SETTLE_FAIL = 34, NEWS_T = 190, CARD_T = 120, SPOT0 = 96;
const STAR_PTS = 100, LEFT_PTS = 10, WIN_PTS = 300;

// ───────────────────────────── 판 ─────────────────────────────
export interface StageDef {
  key: string; name: string; emoji: string; news: string; tip: string;
  pairs: number; blocks: [number, number]; box: boolean; crack: boolean; plate: boolean;
  /** 최소 수 범위 · 거울 대칭 생선(1판) · 무작위 봇 통과 확률 하한(0 = 안 잼) · 버릇 봇 거르기 */
  min: [number, number]; sym: boolean; rnd: number; habit: boolean;
  /** 수 한도: 고정값(>0) 또는 최소 + extra */
  limit: number; extra: number;
}
export const STAGES: StageDef[] = [
  { key: 'mirror', name: '거울 앞', emoji: '🪞', news: '🪞 밀면 둘이 함께 — 거울 속 고양이는 좌우 반대로!', tip: '둘이 동시에 생선 위에 멈추면 냠!', pairs: 1, blocks: [1, 2], box: false, crack: false, plate: false, min: [2, 2], sym: true, rnd: 0.95, habit: false, limit: 30, extra: 0 },
  { key: 'bonk', name: '다른 방', emoji: '🧱', news: '🧱 벽에 막힌 쪽만 쿵 멈춰요 — 그 틈에 다른 쪽만 가요', tip: '일부러 한쪽을 벽에 쿵 — 자리를 어긋나게!', pairs: 1, blocks: [2, 3], box: false, crack: false, plate: false, min: [2, 4], sym: false, rnd: 0.62, habit: false, limit: 20, extra: 0 },
  { key: 'pairs', name: '생선 두 쌍', emoji: '🐟', news: '🐟 같은 색 생선끼리 한 쌍 — 두 쌍 다 먹어요', tip: '어느 쌍부터 먹을지가 수예요', pairs: 2, blocks: [2, 4], box: false, crack: false, plate: false, min: [4, 5], sym: false, rnd: 0, habit: true, limit: 0, extra: 7 },
  { key: 'box', name: '상자', emoji: '📦', news: '📦 상자를 들이받으면 쭈욱 밀려 가요 (한쪽 방에만)', tip: '상자를 밀어 새 벽을 만들어요 — 밀면 못 되돌려요', pairs: 1, blocks: [2, 3], box: true, crack: false, plate: false, min: [4, 6], sym: false, rnd: 0, habit: true, limit: 0, extra: 7 },
  { key: 'crack', name: '금 간 거울', emoji: '⚡', news: '⚡ 금 간 줄에선 거울 고양이도 같은 쪽으로 가요', tip: '금 간 줄에 서면 거울이 안 비쳐요 — 둘이 나란히!', pairs: 1, blocks: [2, 3], box: false, crack: true, plate: false, min: [4, 6], sym: false, rnd: 0, habit: true, limit: 0, extra: 7 },
  { key: 'plate', name: '발판과 문', emoji: '🔘', news: '🔘 발판을 밟고 있으면 건너편 방 문이 열려요', tip: '한쪽이 발판 위에 있을 때 다른 쪽이 문으로 쏙!', pairs: 1, blocks: [1, 2], box: false, crack: false, plate: true, min: [4, 7], sym: false, rnd: 0, habit: true, limit: 0, extra: 7 },
  { key: 'mix', name: '상자 두 쌍', emoji: '🎁', news: '', tip: '상자를 언제 밀지 · 어느 쌍부터 먹을지', pairs: 2, blocks: [2, 3], box: true, crack: false, plate: false, min: [5, 7], sym: false, rnd: 0, habit: true, limit: 0, extra: 7 },
  { key: 'palace', name: '거울 궁전', emoji: '👑', news: '', tip: '금 간 줄 · 발판 · 생선 두 쌍 — 전부!', pairs: 2, blocks: [1, 2], box: false, crack: true, plate: true, min: [5, 8], sym: false, rnd: 0, habit: true, limit: 0, extra: 7 },
];
export const STAGE_COUNT = STAGES.length;

export interface Level {
  /** 방마다 가구(벽) 칸 */
  wall: Uint8Array[];
  /** fish[쌍] = [왼쪽 방 칸, 거울 방 칸] */
  fish: number[][];
  a0: number; b0: number;
  box: number; boxRoom: number;
  /** 금 간 줄(거울 방의 그 줄에 선 고양이는 좌우도 같은 쪽으로) · -1 없음 */
  crack: number;
  /** 발판(plateRoom 방) · 문(다른 방) · -1 없음 */
  plate: number; plateRoom: number; door: number;
  /** 문 줄(문이 있는 세로 가구 줄의 x) — 그리기용 */
  doorCol: number;
  min: number; limit: number; par: number;
  /** 검사용 변형: 상자를 못 밂 · 금 없음 · 문 늘 닫힘 */
  noPush?: boolean; noCrack?: boolean; shut?: boolean;
}

const ix = (x: number, y: number) => y * W + x;
const colOf = (c: number) => c % W, rowOf = (c: number) => (c / W) | 0;
const mirC = (c: number) => ix(W - 1 - (c % W), (c / W) | 0);

// ───────────────────────────── 규칙 (미끄러지기) ─────────────────────────────
/** slide 결과 (할당 없이 빠르게 — 탐색에서 수십만 번 부른다) */
let S_TO = 0, S_D = 0, S_BOX = -1, S_BD = 0, S_STOP = 0;
/** 멈춘 까닭: 0 벽·가장자리 · 1 상자를 쳐서 밀어 보냄 · 2 상자가 꿈쩍 안 함 · 3 발판 딸깍 · 4 닫힌 문 */
function slide(lv: Level, room: number, from: number, d: number, box: number, open: boolean, push: boolean) {
  let x = from % W, y = (from / W) | 0, dist = 0;
  const dx = DX[d], dy = DY[d], wall = lv.wall[room];
  const hasBox = box >= 0 && lv.boxRoom === room;
  const doorHere = lv.door >= 0 && lv.plateRoom !== room ? lv.door : -1;
  S_BOX = box;
  S_BD = 0;
  S_STOP = 0;
  for (;;) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) break;
    const c = ny * W + nx;
    if (wall[c]) break;
    if (c === doorHere && !open) {
      S_STOP = 4;
      break;
    }
    if (hasBox && c === box) {
      if (!push) {
        S_STOP = 2;
        break;
      }
      let bx = nx, by = ny, bd = 0;
      for (;;) {
        const tx = bx + dx, ty = by + dy;
        if (tx < 0 || ty < 0 || tx >= W || ty >= H) break;
        const tc = ty * W + tx;
        if (wall[tc] || (tc === doorHere && !open)) break;
        bx = tx;
        by = ty;
        bd++;
      }
      if (bd > 0) (S_BOX = by * W + bx), (S_BD = bd), (S_STOP = 1);
      else S_STOP = 2;
      break;
    }
    x = nx;
    y = ny;
    dist++;
    if (room === lv.plateRoom && c === lv.plate) {
      S_STOP = 3;
      break;
    }
  }
  S_TO = y * W + x;
  S_D = dist;
}

/** 문이 열려 있나: 발판 위에 고양이가 있거나, 문 칸에 고양이가 서 있으면(끼어 있으면) 열림. 민 순간의 자리로 정한다 */
function doorOpen(lv: Level, a: number, b: number) {
  if (lv.door < 0 || lv.shut) return false;
  const pc = lv.plateRoom === 0 ? a : b, dc = lv.plateRoom === 0 ? b : a;
  return pc === lv.plate || dc === lv.door;
}
/** 거울 고양이가 실제로 가는 쪽: 좌우는 반대, 금 간 줄에서는 같은 쪽 */
const rdir = (lv: Level, b: number, d: number) => (d < 2 || (lv.crack >= 0 && !lv.noCrack && rowOf(b) === lv.crack) ? d : d ^ 1);

let M_A = 0, M_B = 0, M_BOX = -1, M_E = 0, M_EAT = -1;
/** 한 번 밀기 (두 고양이가 동시에) */
function move(lv: Level, a: number, b: number, box: number, e: number, d: number) {
  const open = doorOpen(lv, a, b), push = !lv.noPush;
  slide(lv, 0, a, d, lv.boxRoom === 0 ? box : -1, open, push);
  const na = S_TO;
  let nbox = lv.boxRoom === 0 ? S_BOX : box;
  slide(lv, 1, b, rdir(lv, b, d), lv.boxRoom === 1 ? box : -1, open, push);
  const nb = S_TO;
  if (lv.boxRoom === 1) nbox = S_BOX;
  let ne = e, eat = -1;
  for (let p = 0; p < lv.fish.length; p++) if (!((e >> p) & 1) && lv.fish[p][0] === na && lv.fish[p][1] === nb) (ne |= 1 << p), (eat = p);
  M_A = na;
  M_B = nb;
  M_BOX = nbox;
  M_E = ne;
  M_EAT = eat;
}

// ───────────────────────────── 너비 우선 탐색 (증명·잘하는 봇) ─────────────────────────────
const KEYN = NC * NC * NB * 8;
/** 탐색 버퍼(약 3MB)는 처음 풀 때 만든다 — 다른 게임만 하는 페이지에서는 안 만든다 */
let VIS = new Int32Array(0), PAR = VIS, DEP = new Int16Array(0), PMV = new Int8Array(0), Q = VIS;
function bufs() {
  if (VIS.length) return;
  (VIS = new Int32Array(KEYN)), (PAR = new Int32Array(KEYN)), (DEP = new Int16Array(KEYN)), (PMV = new Int8Array(KEYN)), (Q = new Int32Array(KEYN));
}
let STAMP = 0;
const enc = (a: number, b: number, box: number, e: number) => ((a * NC + b) * NB + (box < 0 ? NC : box)) * 8 + e;
let D_A = 0, D_B = 0, D_BOX = -1, D_E = 0;
function dec(k: number) {
  D_E = k & 7;
  k >>= 3;
  const bx = k % NB;
  D_BOX = bx === NC ? -1 : bx;
  k = (k - bx) / NB;
  D_B = k % NC;
  D_A = (k - D_B) / NC;
}
/** 지금 자리에서 생선을 다 먹기까지의 최소 수 (-1 = 길 없음). path에 그 길(방향들) */
function solve(lv: Level, a: number, b: number, box: number, e: number, path?: number[], maxD = 40): number {
  const full = (1 << lv.fish.length) - 1;
  if (e === full) return 0;
  bufs();
  STAMP++;
  let qh = 0, qt = 0;
  const k0 = enc(a, b, box, e);
  VIS[k0] = STAMP;
  DEP[k0] = 0;
  Q[qt++] = k0;
  while (qh < qt) {
    const k = Q[qh++];
    if (DEP[k] >= maxD) break;
    dec(k);
    const ca = D_A, cb = D_B, cbox = D_BOX, ce = D_E;
    for (let d = 0; d < 4; d++) {
      move(lv, ca, cb, cbox, ce, d);
      const nk = enc(M_A, M_B, M_BOX, M_E);
      if (VIS[nk] === STAMP) continue;
      VIS[nk] = STAMP;
      PAR[nk] = k;
      PMV[nk] = d;
      DEP[nk] = DEP[k] + 1;
      if (M_E === full) {
        if (path) {
          path.length = 0;
          for (let q = nk; q !== k0; q = PAR[q]) path.unshift(PMV[q]);
        }
        return DEP[nk];
      }
      Q[qt++] = nk;
    }
  }
  return -1;
}

/** 고양이 하나만 본 미끄럼 거리(상자는 벽으로, 문은 지금 상태로): 목표 칸들 중 가장 가까운 곳까지의 수와 첫 방향(그 고양이 기준) */
const CD = new Int16Array(NC), CF = new Int8Array(NC), CQ = new Int32Array(NC);
function catPlan(lv: Level, room: number, from: number, box: number, open: boolean, tg: number[]): { dist: number; first: number } {
  if (tg.includes(from)) return { dist: 0, first: -1 };
  CD.fill(-1);
  let qh = 0, qt = 0;
  CD[from] = 0;
  CQ[qt++] = from;
  while (qh < qt) {
    const c = CQ[qh++];
    for (let d = 0; d < 4; d++) {
      slide(lv, room, c, d, lv.boxRoom === room ? box : -1, open, false);
      const n = S_TO;
      if (CD[n] >= 0) continue;
      CD[n] = CD[c] + 1;
      CF[n] = c === from ? d : CF[c];
      if (tg.includes(n)) return { dist: CD[n], first: CF[n] };
      CQ[qt++] = n;
    }
  }
  return { dist: 99, first: -1 };
}
const targets = (lv: Level, e: number, room: number) => lv.fish.filter((_, p) => !((e >> p) & 1)).map((f) => f[room]);
/** 고양이 기준 방향 → 민 방향 (거울 고양이는 좌우 반대, 금 간 줄은 같게) */
const swipeFor = (lv: Level, room: number, b: number, cd: number) => (room === 0 || cd < 2 ? cd : rdir(lv, b, cd));

/** 버릇: 한 고양이(who)만 보고 가장 가까운 생선 쪽으로. 이미 생선 위면 그 고양이가 안 움직이는 쪽으로 민다 */
export function habitDir(lv: Level, a: number, b: number, box: number, e: number, who: number): number {
  const open = doorOpen(lv, a, b), me = who ? b : a, tg = targets(lv, e, who);
  if (tg.includes(me)) {
    for (let d = 0; d < 4; d++) {
      slide(lv, who, me, who ? rdir(lv, b, d) : d, lv.boxRoom === who ? box : -1, open, !lv.noPush);
      if (S_D === 0 && S_STOP !== 1) return d;
    }
  }
  const p = catPlan(lv, who, me, box, open, tg.filter((c) => c !== me));
  return p.first < 0 ? 0 : swipeFor(lv, who, b, p.first);
}
/** 버릇: 한 수만 보고 '두 고양이가 각자 생선까지 남은 거리의 합'이 가장 줄어드는 쪽 */
function greedyDir(lv: Level, a: number, b: number, box: number, e: number): number {
  let best = 1e9, bd = 0;
  for (let d = 0; d < 4; d++) {
    move(lv, a, b, box, e, d);
    const na = M_A, nb = M_B, nbox = M_BOX, ne = M_E, eat = M_EAT;
    let v: number;
    if (eat >= 0) v = -100;
    else {
      const open = doorOpen(lv, na, nb);
      v = catPlan(lv, 0, na, nbox, open, targets(lv, ne, 0)).dist + catPlan(lv, 1, nb, nbox, open, targets(lv, ne, 1)).dist;
      if (na === a && nb === b) v += 50;
    }
    if (v < best) (best = v), (bd = d);
  }
  return bd;
}
/** 정해진 버릇으로 끝까지 둬 본다 → 쓴 수 (못 풀면 99) */
function habitRun(lv: Level, pol: (a: number, b: number, box: number, e: number) => number): number {
  let a = lv.a0, b = lv.b0, box = lv.box, e = 0;
  const full = (1 << lv.fish.length) - 1;
  for (let used = 1; used <= lv.limit; used++) {
    move(lv, a, b, box, e, pol(a, b, box, e));
    (a = M_A), (b = M_B), (box = M_BOX), (e = M_E);
    if (e === full) return used;
  }
  return 99;
}
/** 무작위로 밀면 수 한도 안에 풀 확률 (정확한 분포 계산) */
export function randPass(lv: Level): number {
  const full = (1 << lv.fish.length) - 1;
  let cur = new Map<number, number>([[enc(lv.a0, lv.b0, lv.box, 0), 1]]), win = 0;
  for (let step = 0; step < lv.limit; step++) {
    const nxt = new Map<number, number>();
    for (const [k, p] of cur) {
      dec(k);
      const ca = D_A, cb = D_B, cbox = D_BOX, ce = D_E;
      for (let d = 0; d < 4; d++) {
        move(lv, ca, cb, cbox, ce, d);
        if (M_E === full) win += p / 4;
        else {
          const nk = enc(M_A, M_B, M_BOX, M_E);
          nxt.set(nk, (nxt.get(nk) ?? 0) + p / 4);
        }
      }
    }
    cur = nxt;
  }
  return win;
}

// ───────────────────────────── 판 만들기 (시드마다 다르고, 늘 풀이가 있다) ─────────────────────────────
function rawLevel(rng: Rng, d: StageDef): Level | null {
  const ri = (n: number) => Math.floor(rng() * n);
  const wall = [new Uint8Array(NC), new Uint8Array(NC)];
  // 가장자리에서 시작하면 어느 한쪽으로는 둘 다 꼼짝 못 한다 → 안쪽에서 시작
  const x0 = 1 + ri(W - 2), y0 = 1 + ri(H - 2), a0 = ix(x0, y0), b0 = ix(W - 1 - x0, y0);
  const used = [new Set<number>([a0]), new Set<number>([b0])];
  const free = (room: number) => {
    for (let k = 0; k < 40; k++) {
      const c = ri(NC);
      if (!wall[room][c] && !used[room].has(c)) return c;
    }
    return -1;
  };
  let plate = -1, plateRoom = -1, door = -1, doorCol = -1;
  if (d.plate) {
    plateRoom = ri(2);
    const dr = 1 - plateRoom, dstart = dr === 0 ? a0 : b0;
    doorCol = 1 + ri(W - 2);
    if (colOf(dstart) === doorCol) return null;
    const dy = ri(H);
    for (let y = 0; y < H; y++) if (y !== dy) wall[dr][ix(doorCol, y)] = 1;
    door = ix(doorCol, dy);
    used[dr].add(door);
    plate = free(plateRoom);
    if (plate < 0) return null;
    used[plateRoom].add(plate);
  }
  const nb = [d.blocks[0] + ri(d.blocks[1] - d.blocks[0] + 1), d.blocks[0] + ri(d.blocks[1] - d.blocks[0] + 1)];
  for (let k = 0; k < nb[0]; k++) {
    const c = free(0);
    if (c < 0) continue;
    wall[0][c] = 1;
    // 1판: 거울 방은 왼쪽 방의 거울상
    if (d.sym && !used[1].has(mirC(c))) wall[1][mirC(c)] = 1;
  }
  // 1판은 거울 방 가구가 하나만 다르다
  for (let k = 0; k < (d.sym ? 1 : nb[1]); k++) {
    const c = free(1);
    if (c >= 0) wall[1][c] = 1;
  }
  let box = -1, boxRoom = -1;
  if (d.box) {
    boxRoom = ri(2);
    box = free(boxRoom);
    if (box < 0) return null;
    used[boxRoom].add(box);
  }
  const crack = d.crack ? ri(H) : -1;
  return { wall, fish: [], a0, b0, box, boxRoom, crack, plate, plateRoom, door, doorCol, min: 0, limit: 0, par: 0 };
}

/** 생선 없이 출발점에서 닿는 (왼쪽 칸, 거울 칸) 자리들과 최소 수 */
function explore(lv: Level, maxD = 14): Map<number, number> {
  const out = new Map<number, number>(), L0 = { ...lv, fish: [] };
  bufs();
  STAMP++;
  let qh = 0, qt = 0;
  const k0 = enc(lv.a0, lv.b0, lv.box, 0);
  VIS[k0] = STAMP;
  DEP[k0] = 0;
  Q[qt++] = k0;
  while (qh < qt) {
    const k = Q[qh++];
    dec(k);
    const ca = D_A, cb = D_B, cbox = D_BOX, dk = DEP[k];
    const ab = ca * NC + cb;
    if (!out.has(ab)) out.set(ab, dk);
    if (dk >= maxD) continue;
    for (let d = 0; d < 4; d++) {
      move(L0, ca, cb, cbox, 0, d);
      const nk = enc(M_A, M_B, M_BOX, 0);
      if (VIS[nk] === STAMP) continue;
      VIS[nk] = STAMP;
      DEP[nk] = dk + 1;
      Q[qt++] = nk;
    }
  }
  return out;
}

function genLevel(seed: number, st: number): Level {
  const d = STAGES[st], rng = mulberry32(seed);
  const ri = (n: number) => Math.floor(rng() * n);
  let fallback: Level | null = null;
  for (let tr = 0; tr < 700; tr++) {
    const relax = tr > 550 ? 2 : tr > 350 ? 1 : 0;
    const lv = rawLevel(rng, d);
    if (!lv) continue;
    // 처음 미는 순간 큰 일: 어느 쪽으로 밀어도 누군가는 미끄러진다
    let dead = false;
    for (let k = 0; k < 4; k++) {
      move(lv, lv.a0, lv.b0, lv.box, 0, k);
      if (M_A === lv.a0 && M_B === lv.b0) dead = true;
    }
    if (dead && relax < 2) continue;
    const R = explore(lv);
    // 새 장치를 빼면 못 닿거나 더 멀어지는 자리만 (장치가 결과를 바꾸게)
    const R2 = d.box ? explore({ ...lv, noPush: true }) : d.crack ? explore({ ...lv, noCrack: true }) : d.plate ? explore({ ...lv, shut: true }) : null;
    const dr = d.plate ? 1 - lv.plateRoom : -1;
    const legal = (r: number, c: number) => !lv.wall[r][c] && c !== (r ? lv.b0 : lv.a0) && !(r === lv.boxRoom && c === lv.box) && !(r === lv.plateRoom && c === lv.plate) && !(r === dr && c === lv.door);
    const cands: number[][] = [];
    for (const [ab, dep] of R) {
      const a = (ab / NC) | 0, b = ab % NC;
      if (!legal(0, a) || !legal(1, b)) continue;
      if (d.sym ? b !== mirC(a) : b === mirC(a)) continue;
      const need = R2 ? !R2.has(ab) || R2.get(ab)! > dep : true;
      cands.push([a, b, dep, need ? 1 : 0]);
    }
    if (!cands.length) continue;
    const pick = (f: (c: number[]) => boolean) => {
      const l = cands.filter(f);
      return l.length ? l[ri(l.length)] : null;
    };
    const hi = d.min[1] + relax, lo = d.min[0] - (relax > 1 ? 1 : 0);
    if (d.pairs === 1) {
      const c = pick((c) => c[2] >= lo && c[2] <= hi && (c[3] === 1 || relax > 1));
      if (!c) continue;
      lv.fish = [[c[0], c[1]]];
    } else {
      const c1 = pick((c) => c[2] >= 1 && c[2] <= hi - 1 && (c[3] === 1 || relax > 1 || !R2));
      if (!c1) continue;
      const c2 = pick((c) => c[0] !== c1[0] && c[1] !== c1[1] && c[2] >= 1);
      if (!c2) continue;
      lv.fish = [[c1[0], c1[1]], [c2[0], c2[1]]];
    }
    const m = solve(lv, lv.a0, lv.b0, lv.box, 0);
    if (m < 0) continue;
    lv.min = m;
    lv.limit = d.limit > 0 ? d.limit : m + d.extra;
    lv.par = m + 3;
    if (!fallback || Math.abs(m - d.min[0]) < Math.abs(fallback.min - d.min[0])) fallback = lv;
    if (m < lo || m > hi) continue;
    // 새 장치가 결과를 바꿔야 한다 (빼면 못 풀거나 더 길어짐)
    const vr: Partial<Level> | null = d.box ? { noPush: true } : d.crack ? { noCrack: true } : d.plate ? { shut: true } : null;
    if (vr && relax < 2) {
      const m2 = solve({ ...lv, ...vr }, lv.a0, lv.b0, lv.box, 0);
      if (m2 >= 0 && m2 <= m) continue;
    }
    // 버릇 하나로는 ★3(최소 수)이 안 나오게
    if (d.habit && relax < 2) {
      const hs = [
        habitRun(lv, (a, b, box, e) => habitDir(lv, a, b, box, e, 0)),
        habitRun(lv, (a, b, box, e) => habitDir(lv, a, b, box, e, 1)),
        habitRun(lv, (a, b, box, e) => greedyDir(lv, a, b, box, e)),
      ];
      if (hs.some((u) => u <= m)) continue;
    }
    if (d.rnd > 0 && randPass(lv) < d.rnd * (relax > 1 ? 0.85 : 1)) continue;
    return lv;
  }
  // (거의 없는 일) 쓸 만한 판을 못 찾으면: 빈 방 두 개 · 위로 한 번, 바깥으로 한 번이면 냠
  return fallback ?? { wall: [new Uint8Array(NC), new Uint8Array(NC)], fish: [[ix(0, 0), ix(W - 1, 0)]], a0: ix(1, 2), b0: ix(W - 2, 2), box: -1, boxRoom: -1, crack: -1, plate: -1, plateRoom: -1, door: -1, doorCol: -1, min: 2, limit: 12, par: 5 };
}

const LV_CACHE = new Map<string, Level>();
export function levelFor(seed: number, st: number): Level {
  const k = `${seed}:${st}`;
  let lv = LV_CACHE.get(k);
  if (!lv) {
    if (LV_CACHE.size > 600) LV_CACHE.clear();
    LV_CACHE.set(k, (lv = genLevel(seed, st)));
  }
  return lv;
}

// ───────────────────────────── 상태 ─────────────────────────────
interface Pos { a: number; b: number; box: number; e: number }
interface Anim {
  t0: number; T: number; from: Pos; to: Pos; dA: number; dB: number; distA: number; distB: number;
  stopA: number; stopB: number; boxFrom: number; boxTo: number; boxDist: number; tKnock: number; eat: number; open: boolean;
}
interface Ev { t: number; kind: string; room: number; c: number; text?: string; col?: string }
type Mood = 'idle' | 'happy' | 'dizzy' | 'giggle' | 'pout' | 'eat' | 'wow' | 'sad' | 'love';

export interface CatState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'settle' | 'result'; pt: number;
  stageSeeds: number[]; lv: Level; P: Pos; used: number; anim: Anim | null; queued: number; lastEnd: number;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string;
  won: boolean; dead: boolean; tries: number; again: boolean; firstMove: boolean; moved: boolean;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; events: Ev[];
  eatT: number[]; mood: Mood[]; moodT: number[]; face: number[]; boop: number;
}

const ev = (s: CatState, kind: string, room: number, c: number, text?: string, col?: string, at = s.t) => s.events.push({ t: at, kind, room, c, text, col });
function see(s: CatState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}
function setMood(s: CatState, k: number, m: Mood, dur = 70) {
  s.mood[k] = m;
  s.moodT[k] = dur;
}

function newStage(s: CatState) {
  s.lv = levelFor(s.stageSeeds[s.stage], s.stage);
  s.P = { a: s.lv.a0, b: s.lv.b0, box: s.lv.box, e: 0 };
  s.used = 0;
  s.anim = null;
  s.queued = -1;
  s.phase = 'play';
  s.pt = 0;
  s.moved = false;
  s.eatT = s.lv.fish.map(() => -1);
  s.starOk = [false, false, false];
  s.mood = ['idle', 'idle'];
  s.moodT = [0, 0];
  s.face = [1, -1];
  s.lastEnd = s.t;
  // 판의 새것은 판 카드에 바로 보인다
  const key = STAGES[s.stage].key;
  if (STAGES[s.stage].news) s.seen.add(key);
}

/** 한 번 밀기: 결과를 바로 정하고(시뮬레이션), 미끄러지는 모습은 anim으로 보여 준다 */
function tryMove(s: CatState, d: number) {
  if (s.phase !== 'play') return;
  const lv = s.lv, P = s.P, open = doorOpen(lv, P.a, P.b), push = !lv.noPush;
  const dB = rdir(lv, P.b, d);
  slide(lv, 0, P.a, d, lv.boxRoom === 0 ? P.box : -1, open, push);
  const distA = S_D, stopA = S_STOP, kA = S_BD, bA = S_BOX;
  slide(lv, 1, P.b, dB, lv.boxRoom === 1 ? P.box : -1, open, push);
  const distB = S_D, stopB = S_STOP, kB = S_BD, bB = S_BOX;
  move(lv, P.a, P.b, P.box, P.e, d);
  const to: Pos = { a: M_A, b: M_B, box: M_BOX, e: M_E }, eat = M_EAT;
  const boxDist = lv.boxRoom === 0 ? kA : lv.boxRoom === 1 ? kB : 0;
  const tKnock = (lv.boxRoom === 0 ? distA : distB) * SPD;
  let T = Math.max(distA, distB) * SPD + 10;
  if (boxDist > 0) T = Math.max(T, tKnock + boxDist * BSPD + 8);
  if (distA === 0 && distB === 0) T = 16;
  s.anim = { t0: s.t, T, from: { ...P }, to, dA: d, dB, distA, distB, stopA, stopB, boxFrom: P.box, boxTo: lv.boxRoom === 0 ? bA : lv.boxRoom === 1 ? bB : -1, boxDist, tKnock, eat, open };
  s.P = to;
  s.used++;
  s.moved = true;
  s.firstMove = true;
  s.face[0] = d === 2 ? -1 : d === 3 ? 1 : s.face[0];
  s.face[1] = dB === 2 ? -1 : dB === 3 ? 1 : s.face[1];
  see(s, 'swipe', '🪞 거울 속 고양이는 좌우만 반대로 움직여요');
  // 사건(도착 시각에 맞춰)
  const arrA = s.t + Math.max(1, distA * SPD), arrB = s.t + Math.max(1, distB * SPD);
  ev(s, 'zoom', 0, P.a, undefined, undefined, s.t);
  ev(s, 'zoom', 1, P.b, undefined, undefined, s.t);
  const bonkA = distA === 0 && stopA !== 1, bonkB = distB === 0 && stopB !== 1;
  if (bonkA && bonkB) ev(s, 'bonk2', 0, P.a, '쿵!', '#ffe0b0', arrA + 2), ev(s, 'bonk2', 1, P.b, '쿵!', '#ffe0b0', arrB + 2);
  else if (bonkA !== bonkB) {
    const k = bonkA ? 0 : 1, c = bonkA ? P.a : P.b, oc = bonkA ? to.b : to.a, at = s.t + 3;
    ev(s, 'bonk', k, c, '쿵!', '#ffe0b0', at);
    ev(s, 'giggle', 1 - k, oc, '킥킥', '#ffd6f0', s.t + Math.max(distA, distB) * SPD + 4);
    see(s, 'bonk', '💥 한쪽만 쿵 — 둘의 자리가 어긋났어요!');
  } else if (distA !== distB && distA > 0 && distB > 0) {
    // 둘 다 갔지만 한쪽이 먼저 멈춤 → 어긋남
    const k = distA < distB ? 0 : 1;
    ev(s, 'thud', k, k ? to.b : to.a, '콩', '#ffe9c8', k ? arrB : arrA);
  }
  if (distA > 0 && stopA === 0) ev(s, 'stop', 0, to.a, undefined, undefined, arrA);
  if (distB > 0 && stopB === 0) ev(s, 'stop', 1, to.b, undefined, undefined, arrB);
  if (stopA === 3 || stopB === 3) {
    const k = stopA === 3 ? 0 : 1;
    ev(s, 'click', k, lv.plate, '딸깍!', '#c8ffe8', k ? arrB : arrA);
  }
  if (boxDist > 0) {
    const k = lv.boxRoom;
    ev(s, 'knock', k, P.box, '쾅!', '#ffd9a8', s.t + tKnock);
    ev(s, 'boxstop', k, to.box, '덜컹', '#ffe9c8', s.t + tKnock + boxDist * BSPD);
    see(s, 'knock', '📦 상자가 밀려 간 자리는 새 벽이 돼요');
  } else if ((stopA === 2 && lv.boxRoom === 0) || (stopB === 2 && lv.boxRoom === 1)) ev(s, 'thud', lv.boxRoom, lv.boxRoom ? to.b : to.a, '꿈쩍!', '#ffe9c8', lv.boxRoom ? arrB : arrA);
  // 문: 열림·닫힘 변화
  const open2 = doorOpen(lv, to.a, to.b);
  if (lv.door >= 0 && open2 !== open) ev(s, open2 ? 'dooropen' : 'doorshut', 1 - lv.plateRoom, lv.door, open2 ? '문 열림!' : '철컥', open2 ? '#b8ffd8' : '#ffd0c0', s.t + Math.max(distA, distB) * SPD);
  if (lv.door >= 0 && open && (lv.plateRoom === 0 ? P.b !== to.b : P.a !== to.a)) {
    // 열린 문을 지나갔나
    const dc = lv.plateRoom === 0 ? 1 : 0, from = dc ? P.b : P.a, dd = dc ? dB : d;
    let c = from, passed = false;
    for (let k = 0; k < W && c !== (dc ? to.b : to.a); k++) {
      c = ix(colOf(c) + DX[dd], rowOf(c) + DY[dd]);
      if (c === lv.door) passed = true;
    }
    if (passed) ev(s, 'through', dc, lv.door, '쏙!', '#b8ffd8', s.t + Math.max(distA, distB) * SPD - 2), see(s, 'through', '🚪 발판을 누른 틈에 문으로 쏙!');
  }
  if (eat >= 0) {
    const at = s.t + Math.max(distA, distB) * SPD + 2;
    ev(s, 'duet', 0, to.a, '냠!', '#fff1a8', at);
    ev(s, 'duet', 1, to.b, '냠!', '#fff1a8', at);
    const fin = to.e === (1 << lv.fish.length) - 1;
    ev(s, fin ? 'duetfin' : 'duetbig', 0, to.a, fin ? '냐옹~♪ 듀엣! 🎉' : '냐옹~♪ 듀엣!', '#ffe066', at + 6);
    // 마지막 순간에 한쪽만 쿵 막혀서 맞춘 듀엣 = 어긋남 성공
    if (bonkA !== bonkB) ev(s, 'combo', 0, to.a, '어긋남 성공!', '#9ff3dc', at + 16);
    s.eatT[eat] = at;
    see(s, 'duet', '🎵 둘이 동시에 생선 위 = 냐옹 듀엣!');
  }
  // 거울 앞에서 코 맞대기
  if (colOf(to.a) === W - 1 && colOf(to.b) === 0 && rowOf(to.a) === rowOf(to.b) && d === 3 && distA + distB > 0) {
    ev(s, 'boop', 0, to.a, '콩♥', '#ffb3d0', s.t + Math.max(distA, distB) * SPD + 2);
    s.boop = s.t + Math.max(distA, distB) * SPD + 2;
  }
}

/** 미끄러짐이 끝난 뒤: 표정 · 판정 */
function settle(s: CatState) {
  const a = s.anim!, lv = s.lv, full = (1 << lv.fish.length) - 1;
  s.anim = null;
  s.lastEnd = s.t;
  // 표정 (거울 속 고양이는 늘 반대)
  const bonkA = a.distA === 0 && a.stopA !== 1, bonkB = a.distB === 0 && a.stopB !== 1;
  if (a.eat >= 0) setMood(s, 0, 'eat', 60), setMood(s, 1, 'eat', 60);
  else if (bonkA && bonkB) setMood(s, 0, 'dizzy', 70), setMood(s, 1, 'dizzy', 70);
  else if (bonkA !== bonkB) setMood(s, bonkA ? 0 : 1, 'dizzy', 80), setMood(s, bonkA ? 1 : 0, 'giggle', 80);
  else {
    const tA = targets(lv, s.P.e, 0).includes(s.P.a), tB = targets(lv, s.P.e, 1).includes(s.P.b);
    if (tA !== tB) setMood(s, tA ? 0 : 1, 'happy', 90), setMood(s, tA ? 1 : 0, 'pout', 90);
    else if (s.boop === s.t || (colOf(s.P.a) === W - 1 && colOf(s.P.b) === 0 && rowOf(s.P.a) === rowOf(s.P.b))) setMood(s, 0, 'love', 70), setMood(s, 1, 'love', 70);
  }
  if (s.P.e === full) {
    s.phase = 'settle';
    s.pt = 0;
    s.ok = true;
    return;
  }
  const left = lv.limit - s.used, need = solve(lv, s.P.a, s.P.b, s.P.box, s.P.e, undefined, left + 1);
  if (need < 0 || need > left) {
    s.phase = 'settle';
    s.pt = 0;
    s.ok = false;
    s.why = left <= 0 ? '수를 다 썼어요' : solve(lv, s.P.a, s.P.b, s.P.box, s.P.e) < 0 ? '길이 막혔어요!' : '남은 수로는 못 닿아요';
    // 실패는 벌이 아니라 웃음: 둘 다 어질어질 (생쥐가 깔깔)
    setMood(s, 0, 'dizzy', 220);
    setMood(s, 1, 'dizzy', 220);
  }
}

function endStage(s: CatState) {
  const lv = s.lv;
  s.phase = 'result';
  s.pt = 0;
  if (s.ok) {
    s.starOk = [true, s.used <= lv.par, s.used <= lv.min];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    // 아낀 수 보너스는 ★★ 기준보다 적게 쓴 만큼만 (한도가 넉넉한 판에서 헤매도 점수가 불지 않게)
    s.pts += s.got * STAR_PTS + Math.max(0, lv.par - s.used) * LEFT_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0, s.P.a, s.won ? '거울 궁전 정복!' : '냠냠 완료!');
    setMood(s, 0, 'happy', 300);
    setMood(s, 1, 'happy', 300);
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0, s.P.a, s.why);
  }
}

/** 연출용: 표정 시간 줄이기 */
function cosmetic(s: CatState) {
  for (let k = 0; k < 2; k++) if (s.moodT[k] > 0 && --s.moodT[k] === 0) s.mood[k] = 'idle';
}

export const mirrorcats: GameDef<CatState> = {
  id: 'mirrorcats',
  name: '거울 쌍둥이 고양이',
  genes: ['mirror', 'swipe', 'turnbased'],
  twist: '한 번 밀면 두 방의 고양이가 거울처럼(좌우만 반대로) 함께 쭈욱 미끄러지는데, 두 방의 가구가 달라 한쪽만 "쿵" 막히면 그 고양이만 멈추고 다른 쪽은 계속 가 둘의 자리가 어긋난다 — 일부러 어긋남을 만들어 두 고양이를 같은 수에 각자 방의 생선 위에 세운다',
  rules: [
    '밀면 두 고양이가 함께 쭈욱 — 거울 속 고양이는 좌우만 반대로 미끄러져요.',
    '벽에 막힌 쪽만 멈춰요. 둘이 같은 수에 같은 색 생선 위에 서면 냠!',
  ],
  controls: 'swipe',
  hint: '밀기(스와이프) / 화살표 — 거울 속 고양이는 좌우 반대로',
  aspect: A,
  art: {
    concept: '마법 거울이 있는 고양이 방 디오라마',
    mood: '밤의 아늑한 원목 방, 벽에는 달 뜬 창과 쥐구멍. 가운데 금테 마법 거울 속에는 가구가 다르게 놓인 라일락빛 거울 방이 비치고, 주황 고양이와 거울 속 은빛 쌍둥이가 반대 표정으로 함께 미끄러진다.',
    palette: { bg: '#2a1d33', ink: '#fff6ea', muted: '#cdb8d8', accent: '#ffd166', hot: '#ff6b8a', soft: '#f3e3ff' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const s = {
      rng, seed, t: 0, stage: 0, phase: 'play', pt: 0, stageSeeds: STAGES.map(() => 1 + Math.floor(rng() * 2147483646)),
      lv: null as unknown as Level, P: { a: 0, b: 0, box: -1, e: 0 }, used: 0, anim: null, queued: -1, lastEnd: 0,
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, ok: false, why: '', won: false, dead: false, tries: 0, again: false,
      firstMove: false, moved: false, seen: new Set<string>(), newsQ: [], news: null, events: [], eatT: [], mood: ['idle', 'idle'], moodT: [0, 0], face: [1, -1],
      boop: -99,
    } as CatState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 40 || (s.events.length && s.t - s.events[0].t > 160)) s.events = s.events.filter((e) => s.t - e.t < 160);
    cosmetic(s);
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
    if (s.phase === 'settle') {
      if (s.pt >= (s.ok ? SETTLE_OK : SETTLE_FAIL)) endStage(s);
      return;
    }
    const m = inp.move;
    if (m) {
      const d = DI[m];
      if (s.anim) s.queued = d;
      else tryMove(s, d);
    }
    if (s.anim && s.t >= s.anim.t0 + s.anim.T) {
      settle(s);
      if (s.phase === 'play' && s.queued >= 0) {
        const d = s.queued;
        s.queued = -1;
        tryMove(s, d);
      }
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0 };
const ready = (s: CatState) => s.phase === 'play' && !s.anim && s.queued < 0 && s.pt >= 45 && s.t - s.lastEnd >= 12;
const plans = new WeakMap<object, { key: string; path: number[] }>();
/** 봇: 지금 자리에서 너비 우선 탐색으로 최소 수 길을 찾아 그대로 민다 (사람처럼 한 번 밀고 잠깐 본다) */
export const mirrorcatsSmart: Bot<CatState> = {
  name: '거울 박사',
  act(s) {
    if (!ready(s)) return NO;
    const key = `${s.stage}:${s.tries}:${s.used}`;
    let m = plans.get(s);
    if (!m || m.key !== key) {
      const path: number[] = [];
      solve(s.lv, s.P.a, s.P.b, s.P.box, s.P.e, path);
      plans.set(s, (m = { key, path }));
    }
    return { tap: false, dir: 0, move: DN[m.path[0] ?? 0] };
  },
};
/** 버릇 봇(측정용): 왼쪽 고양이만 보고 가장 가까운 생선 쪽으로 (이미 생선 위면 안 움직이는 쪽으로) */
export const mirrorcatsHabit: Bot<CatState> = {
  name: '버릇: 왼쪽 고양이만 생선 쪽으로',
  act(s) {
    if (!ready(s)) return NO;
    return { tap: false, dir: 0, move: DN[habitDir(s.lv, s.P.a, s.P.b, s.P.box, s.P.e, 0)] };
  },
};
/** 버릇 봇 2(측정용): 한 수만 보고 두 고양이의 남은 거리 합이 가장 줄어드는 쪽 */
export const mirrorcatsGreedy: Bot<CatState> = {
  name: '버릇: 한 수 앞 거리 합',
  act(s) {
    if (!ready(s)) return NO;
    return { tap: false, dir: 0, move: DN[greedyDir(s.lv, s.P.a, s.P.b, s.P.box, s.P.e)] };
  },
};
const dumbAt = new WeakMap<object, number>();
/** 봇: 아무 때나 아무 쪽으로 민다 */
export const mirrorcatsRandom: Bot<CatState> = {
  name: '아무렇게나 밀기',
  act(s, rng) {
    const next = dumbAt.get(s) ?? 20 + Math.floor(rng() * 60);
    if (s.t < next) return NO;
    dumbAt.set(s, s.t + 20 + Math.floor(rng() * 110));
    return { tap: false, dir: 0, move: DN[Math.floor(rng() * 4)] };
  },
};


// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
/** 화면 배치 (가로 0~1 · 세로 0~A, 가로 폭 단위) */
const RX = [0.04, 0.53], CW = 0.086, CH = 0.08, FY = 0.265, FY1 = FY + H * CH, WALL0 = 0.075;
const cX = (room: number, x: number) => RX[room] + (x + 0.5) * CW;
const fY = (y: number) => FY + (y + 0.74) * CH;
const DCOL = ['#7cc8ff', '#86e39a', '#ff92c2', '#ffd45e'];
const ARW = ['▲', '▼', '◀', '▶'];
const FISH_COL = [['#bfe9ff', '#4fb3f0', '#2477b8'], ['#ffd0e2', '#ff7eb0', '#c9457a'], ['#fff1b0', '#ffcc3a', '#b98a00']];
const TEAL = '#3fe0c0';
const CAT_PAL = [
  { fur: '#f6a443', dark: '#c46a1c', belly: '#ffe9cc', stripe: '#d77826', nose: '#ff8fa3', eye: '#3a2618', rim: 'rgba(255,220,160,.0)' },
  { fur: '#ecebff', dark: '#a39be0', belly: '#ffffff', stripe: '#a79ee8', nose: '#ff9fc9', eye: '#2a2458', rim: 'rgba(160,150,230,.9)' },
];
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const clamp01 = (q: number) => Math.max(0, Math.min(1, q));
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();

interface PV { distA: number; distB: number; toA: number; toB: number; stopA: number; stopB: number; eat: boolean; onA: boolean; onB: boolean; dB: number }
const pvCache = new WeakMap<object, { key: string; pv: PV[] }>();
/** 미리 보기: 지금 네 방향으로 밀면 두 고양이가 어디서 멈추나 */
function previews(s: CatState): PV[] {
  const key = `${s.stage}:${s.tries}:${s.P.a}:${s.P.b}:${s.P.box}:${s.P.e}`, c = pvCache.get(s);
  if (c && c.key === key) return c.pv;
  const lv = s.lv, P = s.P, open = doorOpen(lv, P.a, P.b), push = !lv.noPush, out: PV[] = [];
  const tA = targets(lv, P.e, 0), tB = targets(lv, P.e, 1);
  for (let d = 0; d < 4; d++) {
    const dB = rdir(lv, P.b, d);
    slide(lv, 0, P.a, d, lv.boxRoom === 0 ? P.box : -1, open, push);
    const distA = S_D, toA = S_TO, stopA = S_STOP;
    slide(lv, 1, P.b, dB, lv.boxRoom === 1 ? P.box : -1, open, push);
    const distB = S_D, toB = S_TO, stopB = S_STOP;
    move(lv, P.a, P.b, P.box, P.e, d);
    out.push({ distA, distB, toA, toB, stopA, stopB, eat: M_EAT >= 0, onA: tA.includes(toA), onB: tB.includes(toB), dB });
  }
  pvCache.set(s, { key, pv: out });
  return out;
}

/** 애니메이션 중 고양이 자리(칸 단위 실수) */
function catAt(s: CatState, k: number) {
  const P = s.P, cur = k ? P.b : P.a;
  if (!s.anim) return { x: colOf(cur), y: rowOf(cur), moving: false, after: 99, dir: -1, lunge: 0 };
  const a = s.anim, u = s.t - a.t0, dist = k ? a.distB : a.distA, d = k ? a.dB : a.dA, from = k ? a.from.b : a.from.a;
  if (dist === 0) {
    const stop = k ? a.stopB : a.stopA;
    const l = stop === 1 ? 0 : u < 12 ? Math.sin((Math.PI * u) / 12) * 0.24 : 0;
    return { x: colOf(from) + DX[d] * l, y: rowOf(from) + DY[d] * l, moving: false, after: u, dir: d, lunge: l };
  }
  const q = clamp01(u / (dist * SPD)), p = dist * (q < 1 ? q * (1.15 - 0.15 * q) : 1);
  return { x: colOf(from) + DX[d] * p, y: rowOf(from) + DY[d] * p, moving: q < 1, after: u - dist * SPD, dir: d, lunge: 0 };
}
function boxAt(s: CatState) {
  const lv = s.lv;
  if (lv.box < 0) return null;
  const a = s.anim;
  if (!a || a.boxDist === 0) return { x: colOf(s.P.box), y: rowOf(s.P.box), wob: 0 };
  const u = s.t - a.t0 - a.tKnock, d = lv.boxRoom ? a.dB : a.dA, q = clamp01(u / (a.boxDist * BSPD)), p = a.boxDist * q;
  return { x: colOf(a.boxFrom) + DX[d] * p, y: rowOf(a.boxFrom) + DY[d] * p, wob: q > 0 && q < 1 ? Math.sin(u * 1.3) * 0.08 : 0 };
}

function star5(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** 고양이: (x, y) = 발밑 화면 px, u = 몸 크기 px */
function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, k: number, face: number, mood: string, t: number, sx: number, sy: number, lean: number) {
  const p = CAT_PAL[k];
  // 그림자
  ctx.fillStyle = 'rgba(25,8,25,.32)';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.02, u * 0.46 * sx, u * 0.13, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face * sx, sy);
  ctx.rotate(lean);
  const bob = mood === 'giggle' ? Math.abs(Math.sin(t * 0.5)) * u * 0.04 : mood === 'eat' ? Math.abs(Math.sin(t * 0.35)) * u * 0.05 : 0;
  ctx.translate(0, -bob);
  // 꼬리 (뒤쪽)
  const wag = Math.sin(t * (mood === 'happy' || mood === 'eat' ? 0.25 : 0.08) + k * 2) * 0.25;
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = u * 0.14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-u * 0.3, -u * 0.22);
  ctx.quadraticCurveTo(-u * 0.62, -u * 0.3, -u * (0.55 + wag * 0.3), -u * (0.7 + wag * 0.2));
  ctx.stroke();
  ctx.strokeStyle = p.fur;
  ctx.lineWidth = u * 0.09;
  ctx.stroke();
  // 몸
  const bg = ctx.createLinearGradient(0, -u * 0.55, 0, 0);
  bg.addColorStop(0, p.fur);
  bg.addColorStop(1, p.dark);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(-u * 0.04, -u * 0.26, u * 0.36, u * 0.25, 0, 0, TAU);
  ctx.fill();
  // 줄무늬 (등)
  ctx.strokeStyle = p.stripe;
  ctx.lineWidth = u * 0.045;
  for (let j = 0; j < 3; j++) {
    ctx.beginPath();
    ctx.arc(-u * 0.16 + j * u * 0.11, -u * 0.5, u * 0.08, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
  // 배
  ctx.fillStyle = p.belly;
  ctx.beginPath();
  ctx.ellipse(u * 0.1, -u * 0.18, u * 0.16, u * 0.13, 0, 0, TAU);
  ctx.fill();
  // 발
  ctx.fillStyle = p.belly;
  for (const fx2 of [-0.22, 0.16]) {
    ctx.beginPath();
    ctx.ellipse(u * fx2, -u * 0.03, u * 0.085, u * 0.055, 0, 0, TAU);
    ctx.fill();
  }
  // 머리
  const hx = u * 0.2, hy = -u * 0.62, hr = u * 0.31;
  for (const e of [-1, 1]) {
    ctx.fillStyle = p.dark;
    ctx.beginPath();
    ctx.moveTo(hx + e * hr * 0.85, hy - hr * 0.2);
    ctx.lineTo(hx + e * hr * 0.62, hy - hr * 1.25);
    ctx.lineTo(hx + e * hr * 0.12, hy - hr * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.nose;
    ctx.beginPath();
    ctx.moveTo(hx + e * hr * 0.7, hy - hr * 0.42);
    ctx.lineTo(hx + e * hr * 0.6, hy - hr * 1.0);
    ctx.lineTo(hx + e * hr * 0.3, hy - hr * 0.7);
    ctx.closePath();
    ctx.fill();
  }
  const hg = ctx.createRadialGradient(hx - hr * 0.3, hy - hr * 0.4, hr * 0.2, hx, hy, hr * 1.1);
  hg.addColorStop(0, k ? '#ffffff' : '#ffc27a');
  hg.addColorStop(1, p.fur);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(hx, hy, hr, hr * 0.9, 0, 0, TAU);
  ctx.fill();
  if (k) {
    ctx.strokeStyle = p.rim;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  // 이마 줄무늬
  ctx.strokeStyle = p.stripe;
  ctx.lineWidth = u * 0.04;
  for (const e of [-0.25, 0, 0.25]) {
    ctx.beginPath();
    ctx.moveTo(hx + e * hr, hy - hr * 0.85);
    ctx.lineTo(hx + e * hr * 0.8, hy - hr * 0.5);
    ctx.stroke();
  }
  // 볼 · 얼굴
  const ex = hx + hr * 0.12, ey = hy - hr * 0.05, eg = hr * 0.42;
  ctx.fillStyle = 'rgba(255,120,150,.35)';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(ex + e * eg * 1.05, ey + hr * 0.38, hr * 0.17, hr * 0.1, 0, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = p.eye;
  ctx.fillStyle = p.eye;
  ctx.lineWidth = Math.max(1.4, u * 0.045);
  const blink = mood === 'idle' && (t + k * 97) % 190 < 7;
  const arcEye = (cx: number, up: boolean) => {
    ctx.beginPath();
    if (up) ctx.arc(cx, ey + hr * 0.08, hr * 0.15, Math.PI * 1.1, Math.PI * 1.9);
    else ctx.arc(cx, ey - hr * 0.08, hr * 0.15, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
  };
  const dot = (cx: number, r: number) => {
    ctx.fillStyle = p.eye;
    ctx.beginPath();
    ctx.ellipse(cx, ey, r * 0.85, r, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + r * 0.3, ey - r * 0.35, r * 0.35, 0, TAU);
    ctx.fill();
  };
  for (const e of [-1, 1]) {
    const cx = ex + e * eg;
    if (mood === 'happy' || mood === 'giggle' || mood === 'eat' || mood === 'love') arcEye(cx, true);
    else if (mood === 'dizzy') {
      ctx.beginPath();
      ctx.moveTo(cx - hr * 0.12, ey - hr * 0.12);
      ctx.lineTo(cx + hr * 0.12, ey + hr * 0.12);
      ctx.moveTo(cx + hr * 0.12, ey - hr * 0.12);
      ctx.lineTo(cx - hr * 0.12, ey + hr * 0.12);
      ctx.stroke();
    } else if (mood === 'pout') {
      ctx.beginPath();
      ctx.moveTo(cx - hr * 0.14, ey + (e > 0 ? -hr * 0.05 : hr * 0.02));
      ctx.lineTo(cx + hr * 0.14, ey + (e > 0 ? hr * 0.02 : -hr * 0.05));
      ctx.stroke();
      dot(cx, hr * 0.08);
    } else if (mood === 'yawn' || blink) arcEye(cx, false);
    else if (mood === 'smug') {
      ctx.beginPath();
      ctx.moveTo(cx - hr * 0.15, ey);
      ctx.lineTo(cx + hr * 0.15, ey);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, ey, hr * 0.1, 0, Math.PI);
      ctx.fill();
    } else if (mood === 'wow') dot(cx, hr * 0.19);
    else if (mood === 'sad') {
      dot(cx, hr * 0.13);
      ctx.fillStyle = '#9fe0ff';
      ctx.beginPath();
      ctx.ellipse(cx - hr * 0.05, ey + hr * 0.25 + ((t * 0.6) % 6), hr * 0.06, hr * 0.1, 0, 0, TAU);
      ctx.fill();
    } else dot(cx, hr * 0.14);
  }
  if (mood === 'love') {
    ctx.fillStyle = '#ff5f8f';
    for (const e of [-1, 1]) {
      const cx = ex + e * eg, cy = ey - hr * 0.3;
      ctx.beginPath();
      ctx.arc(cx - hr * 0.05, cy, hr * 0.06, Math.PI, 0);
      ctx.arc(cx + hr * 0.05, cy, hr * 0.06, Math.PI, 0);
      ctx.lineTo(cx, cy + hr * 0.1);
      ctx.closePath();
      ctx.fill();
    }
  }
  // 코 · 입
  const mx = ex, my = ey + hr * 0.28;
  ctx.fillStyle = p.nose;
  ctx.beginPath();
  ctx.moveTo(mx - hr * 0.07, my - hr * 0.06);
  ctx.lineTo(mx + hr * 0.07, my - hr * 0.06);
  ctx.lineTo(mx, my + hr * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = p.eye;
  ctx.lineWidth = Math.max(1.1, u * 0.032);
  if (mood === 'yawn' || mood === 'wow' || mood === 'eat') {
    const big = mood === 'yawn' ? 0.17 : mood === 'eat' ? 0.1 + Math.abs(Math.sin(t * 0.35)) * 0.06 : 0.08;
    ctx.fillStyle = '#7a2a3a';
    ctx.beginPath();
    ctx.ellipse(mx, my + hr * (0.08 + big * 0.6), hr * big * 0.8, hr * big, 0, 0, TAU);
    ctx.fill();
    if (mood === 'eat') {
      // 입에 문 생선 꼬리
      ctx.fillStyle = '#9fd8ff';
      ctx.beginPath();
      ctx.moveTo(mx + hr * 0.1, my + hr * 0.15);
      ctx.lineTo(mx + hr * 0.42, my + hr * 0.02);
      ctx.lineTo(mx + hr * 0.42, my + hr * 0.32);
      ctx.closePath();
      ctx.fill();
    }
  } else if (mood === 'happy' || mood === 'giggle' || mood === 'love') {
    ctx.fillStyle = '#7a2a3a';
    ctx.beginPath();
    ctx.arc(mx, my + hr * 0.05, hr * 0.13, 0, Math.PI);
    ctx.fill();
  } else if (mood === 'pout' || mood === 'sad') {
    ctx.beginPath();
    ctx.arc(mx, my + hr * 0.18, hr * 0.09, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else if (mood === 'dizzy') {
    ctx.beginPath();
    for (let j = 0; j <= 6; j++) ctx.lineTo(mx - hr * 0.15 + j * hr * 0.05, my + hr * 0.1 + (j % 2 ? hr * 0.04 : -hr * 0.02));
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(mx - hr * 0.06, my + hr * 0.02, hr * 0.06, 0, Math.PI);
    ctx.arc(mx + hr * 0.06, my + hr * 0.02, hr * 0.06, 0, Math.PI);
    ctx.stroke();
  }
  // 수염
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = 0.9;
  for (const e of [-1, 1])
    for (const j of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(mx + e * hr * 0.2, my + j * hr * 0.03);
      ctx.lineTo(mx + e * hr * 0.62, my + j * hr * 0.1 - hr * 0.02);
      ctx.stroke();
    }
  // 킥킥: 앞발로 입 가리기
  if (mood === 'giggle') {
    ctx.fillStyle = p.belly;
    ctx.beginPath();
    ctx.ellipse(mx + hr * 0.12, my + hr * 0.12, hr * 0.2, hr * 0.15, 0.4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // 어질어질 별 (뒤집지 않고)
  if (mood === 'dizzy') {
    ctx.fillStyle = '#ffe066';
    for (let j = 0; j < 3; j++) {
      const a = t * 0.18 + (j * TAU) / 3, rx = x + face * u * 0.2 * sx + Math.cos(a) * u * 0.36, ry = y - u * 0.98 + Math.sin(a) * u * 0.1;
      star5(ctx, rx, ry, u * 0.08);
      ctx.fill();
    }
  }
}

function drawFish(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, p: number, t: number, eaten: boolean, glow: boolean) {
  // 접시
  ctx.fillStyle = 'rgba(25,8,25,.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.04, u * 0.44, u * 0.15, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fbf6ff';
  ctx.beginPath();
  ctx.ellipse(x, y, u * 0.42, u * 0.15, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = FISH_COL[p][1];
  ctx.lineWidth = 2;
  ctx.stroke();
  if (glow) {
    ctx.save();
    ctx.globalAlpha = 0.45 + 0.25 * Math.sin(t * 0.2);
    ctx.strokeStyle = '#fff6a8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y, u * 0.5, u * 0.19, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  if (eaten) {
    // 생선 뼈
    ctx.strokeStyle = '#e8e2d8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - u * 0.22, y - u * 0.04);
    ctx.lineTo(x + u * 0.18, y - u * 0.04);
    for (let j = -1; j <= 1; j++) (ctx.moveTo(x + j * u * 0.08, y - u * 0.12), ctx.lineTo(x + j * u * 0.08, y + u * 0.04));
    ctx.stroke();
    return;
  }
  const c = FISH_COL[p], bob = Math.sin(t * 0.09 + p * 2 + x * 0.1) * u * 0.03, fy = y - u * 0.12 + bob;
  const g = ctx.createLinearGradient(0, fy - u * 0.14, 0, fy + u * 0.12);
  g.addColorStop(0, c[0]);
  g.addColorStop(1, c[1]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x - u * 0.03, fy, u * 0.26, u * 0.13, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + u * 0.18, fy);
  ctx.lineTo(x + u * 0.38, fy - u * 0.13);
  ctx.lineTo(x + u * 0.38, fy + u * 0.13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = c[2];
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x + u * 0.02, fy, u * 0.09, -1, 1);
  ctx.stroke();
  ctx.fillStyle = '#1d1630';
  ctx.beginPath();
  ctx.arc(x - u * 0.17, fy - u * 0.03, u * 0.035, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.beginPath();
  ctx.ellipse(x - u * 0.06, fy - u * 0.07, u * 0.1, u * 0.025, 0, 0, TAU);
  ctx.fill();
}

/** 가구 블록 (3/4 시점 상자: 윗면 + 앞면 + 그림자) */
function drawBlock(ctx: CanvasRenderingContext2D, x0: number, y0: number, cw: number, ch: number, kind: number, mirror: boolean, seed: number) {
  const hb = ch * 0.46, pad = cw * 0.06;
  const L = x0 + pad, R = x0 + cw - pad, T = y0 + pad * 0.6 - hb, B = y0 + ch - pad * 0.6;
  ctx.fillStyle = 'rgba(20,6,20,.3)';
  ctx.beginPath();
  ctx.roundRect(L + cw * 0.08, y0 + ch * 0.35, R - L, ch * 0.7, 4);
  ctx.fill();
  const tones = mirror
    ? [['#9c86c9', '#7a64a8', '#c3b2ec'], ['#8aa7d6', '#6683b5', '#b6cdf2'], ['#b28cc4', '#8d68a1', '#d6b7e6'], ['#8fb3b8', '#6a9096', '#bcd9dc']]
    : [['#a2643a', '#7d4724', '#c98a57'], ['#5f8f5a', '#456d41', '#86b77e'], ['#c4645e', '#9a4541', '#e48c84'], ['#6d7fb0', '#4f5f8c', '#95a6d6']];
  const tn = tones[kind % 4];
  // 앞면
  ctx.fillStyle = tn[1];
  ctx.beginPath();
  ctx.roundRect(L, B - hb - 1, R - L, hb + 1, [0, 0, 4, 4]);
  ctx.fill();
  // 윗면
  const tg = ctx.createLinearGradient(0, T, 0, B - hb);
  tg.addColorStop(0, tn[2]);
  tg.addColorStop(1, tn[0]);
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.roundRect(L, T, R - L, B - hb - T, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.fillRect(L + 3, T + 2, (R - L) * 0.5, 1.5);
  const mx = (L + R) / 2, ty = (T + B - hb) / 2;
  if (kind % 4 === 0) {
    // 서랍장: 앞면 서랍 + 손잡이
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(L + 3, B - hb + 2, R - L - 6, hb - 5);
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath();
    ctx.arc(mx, B - hb / 2, 2, 0, TAU);
    ctx.fill();
  } else if (kind % 4 === 1) {
    // 화분: 윗면에 잎
    ctx.fillStyle = mirror ? '#a7e0c8' : '#4fbf6a';
    for (let j = 0; j < 5; j++) {
      const a = -Math.PI / 2 + (j - 2) * 0.5;
      ctx.beginPath();
      ctx.ellipse(mx + Math.cos(a) * cw * 0.14, ty - ch * 0.1 + Math.sin(a) * ch * 0.22, cw * 0.08, ch * 0.2, a + Math.PI / 2, 0, TAU);
      ctx.fill();
    }
  } else if (kind % 4 === 2) {
    // 쿠션: 단추
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath();
    ctx.arc(mx, ty, 2.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.15)';
    ctx.beginPath();
    ctx.moveTo(L + 4, ty);
    ctx.lineTo(R - 4, ty);
    ctx.stroke();
  } else {
    // 책 더미
    const cols = ['#ffd166', '#ef476f', '#06d6a0', '#ffffff'];
    for (let j = 0; j < 3; j++) {
      ctx.fillStyle = cols[(j + Math.floor(seed * 4)) % 4];
      ctx.fillRect(L + 4 + j * 2, ty - 4 - j * 3.2, R - L - 8 - j * 4, 3);
    }
  }
}

function drawAll(ctx: CanvasRenderingContext2D, s: CatState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, Rr = (r: number) => r * w, t = s.t, lv = s.lv, d = STAGES[s.stage];
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, Rr(sz))}px system-ui, sans-serif`);
  const fontPx = (px: number, wgt = 800) => (ctx.font = `${wgt} ${px}px system-ui, sans-serif`);
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    y = Math.max(y, Y(0.075) + size);
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 36 && Math.abs(q.x - x) < w * 0.22 && Math.abs(q.y - y) < size + 4); k++) y += y - (size + 4) < Y(0.075) + size ? size + 4 : -(size + 4);
    rec.push({ x, y, t: s.t });
    if (rec.length > 14) rec.shift();
    fx.pop(Math.max(w * 0.12, Math.min(w * 0.88, x)), y, text, col, size);
  };
  const cw = Rr(CW), ch = Rr(CH), u = cw * 1.04;
  const tileX = (room: number, x: number) => X(RX[room] + x * CW), tileY = (y: number) => Y(FY + y * CH);
  const spark = t - (fx.memo.spark ?? -999);

  ctx.save();
  fx.begin(ctx);
  // ── 바깥 (밤하늘 같은 보라 방) ──
  const bgG = ctx.createLinearGradient(0, 0, 0, h);
  bgG.addColorStop(0, '#2e1f3d');
  bgG.addColorStop(1, '#1b1226');
  ctx.fillStyle = bgG;
  ctx.fillRect(-10, -10, w + 20, h + 20);

  // ── 두 방의 뒷벽 ──
  for (let room = 0; room < 2; room++) {
    const x0 = X(RX[room]), x1 = X(RX[room] + W * CW), y0 = Y(WALL0), y1 = Y(FY);
    const mir = room === 1;
    ctx.fillStyle = mir ? '#9d8bc4' : '#e8a77f';
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // 벽지 줄무늬
    for (let k = 0; k < 9; k++) {
      ctx.fillStyle = mir ? 'rgba(255,255,255,.08)' : 'rgba(255,240,220,.18)';
      ctx.fillRect(x0 + (k + 0.3) * ((x1 - x0) / 9), y0, (x1 - x0) / 18, y1 - y0);
    }
    // 창문 (거울 방은 좌우 뒤집힌 자리)
    const wx = mir ? x1 - Rr(0.21) : x0 + Rr(0.06), wy = y0 + Rr(0.03), ww = Rr(0.15), wh = Rr(0.1);
    ctx.fillStyle = mir ? '#5d4a8c' : '#6d4a3a';
    ctx.beginPath();
    ctx.roundRect(wx - 3, wy - 3, ww + 6, wh + 6, 5);
    ctx.fill();
    const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
    sky.addColorStop(0, mir ? '#30285e' : '#1c2a5c');
    sky.addColorStop(1, mir ? '#6a5aa8' : '#4a5fa8');
    ctx.fillStyle = sky;
    ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = '#fff6c8';
    ctx.beginPath();
    ctx.arc(mir ? wx + ww * 0.28 : wx + ww * 0.72, wy + wh * 0.35, wh * 0.18, 0, TAU);
    ctx.fill();
    ctx.fillStyle = mir ? '#30285e' : '#1c2a5c';
    ctx.beginPath();
    ctx.arc(mir ? wx + ww * 0.22 : wx + ww * 0.78, wy + wh * 0.3, wh * 0.15, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 5; k++) {
      const sxx = wx + ww * hsh(k * 3 + room * 7), syy = wy + wh * hsh(k * 5 + 1) * 0.9;
      ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(t * 0.03 + k));
      ctx.fillRect(sxx, syy, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = mir ? '#5d4a8c' : '#6d4a3a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.moveTo(wx, wy + wh / 2);
    ctx.lineTo(wx + ww, wy + wh / 2);
    ctx.stroke();
    // 커튼
    ctx.fillStyle = mir ? '#c9a8e8' : '#d8565f';
    for (const e of [0, 1]) {
      const cx2 = e ? wx + ww + 2 : wx - 2;
      ctx.beginPath();
      ctx.moveTo(cx2 - Rr(0.018), wy - 6);
      ctx.lineTo(cx2 + Rr(0.018), wy - 6);
      ctx.quadraticCurveTo(cx2 + (e ? -1 : 1) * Rr(0.01), wy + wh * 0.6, cx2 + (e ? 1 : -1) * Rr(0.01), wy + wh + 6);
      ctx.lineTo(cx2 - (e ? -1 : 1) * Rr(0.02), wy + wh + 6);
      ctx.closePath();
      ctx.fill();
    }
    // 액자 (생선 그림)
    const fxp = mir ? x0 + Rr(0.05) : x1 - Rr(0.13), fyp = y0 + Rr(0.04);
    ctx.fillStyle = '#d9a441';
    ctx.fillRect(fxp - 2, fyp - 2, Rr(0.08) + 4, Rr(0.06) + 4);
    ctx.fillStyle = mir ? '#e7defa' : '#fff3e0';
    ctx.fillRect(fxp, fyp, Rr(0.08), Rr(0.06));
    ctx.save();
    ctx.translate(fxp + Rr(0.04), fyp + Rr(0.03));
    if (mir) ctx.scale(-1, 1);
    ctx.fillStyle = '#4fb3f0';
    ctx.beginPath();
    ctx.ellipse(-Rr(0.005), 0, Rr(0.02), Rr(0.011), 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(Rr(0.013), 0);
    ctx.lineTo(Rr(0.028), -Rr(0.01));
    ctx.lineTo(Rr(0.028), Rr(0.01));
    ctx.fill();
    ctx.restore();
    // 벽 윗단(두께)
    ctx.fillStyle = mir ? '#c9b8ef' : '#ffd2b0';
    ctx.fillRect(x0, y0, x1 - x0, Rr(0.008));
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fillRect(x0, y0 + Rr(0.008), x1 - x0, 2);
    // 걸레받이
    ctx.fillStyle = mir ? '#6e5c9a' : '#8a4f2f';
    ctx.fillRect(x0, y1 - Rr(0.022), x1 - x0, Rr(0.022));
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    ctx.fillRect(x0, y1 - Rr(0.022), x1 - x0, 1.5);
    // 쥐구멍 + 생쥐 (거울 방은 거울 자리)
    const mhx = mir ? x0 + Rr(0.075) : x1 - Rr(0.075), mhy = y1;
    ctx.fillStyle = '#1a0f18';
    ctx.beginPath();
    ctx.ellipse(mhx, mhy, Rr(0.026), Rr(0.03), 0, Math.PI, 0);
    ctx.fill();
    const mk = fx.memo.mouseK ?? 0, mAge = t - (fx.memo.mouseT ?? -999), peek = mAge < 80 ? 1 : 0.55 + 0.45 * Math.max(0, Math.sin(t * 0.012 + room * Math.PI));
    if (peek > 0.6) {
      ctx.save();
      ctx.translate(mhx, mhy - Rr(0.008));
      if (mir) ctx.scale(-1, 1);
      const mu = Rr(0.022) * peek, hop = mAge < 80 && mk === 1 ? -Math.abs(Math.sin(mAge * 0.3)) * Rr(0.008) : 0;
      ctx.translate(0, hop);
      ctx.fillStyle = mir ? '#c8c0e8' : '#b9a9a0';
      ctx.beginPath();
      ctx.arc(0, -mu * 0.4, mu * 0.75, 0, TAU);
      ctx.fill();
      for (const e of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(e * mu * 0.6, -mu * 1.05, mu * 0.38, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#ffb3c4';
      for (const e of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(e * mu * 0.6, -mu * 1.05, mu * 0.2, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#1a0f18';
      if (mAge < 80 && mk === 1) {
        // 깔깔
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = '#1a0f18';
        for (const e of [-1, 1]) (ctx.beginPath(), ctx.arc(e * mu * 0.3, -mu * 0.45, mu * 0.13, Math.PI, 0), ctx.stroke());
        ctx.beginPath();
        ctx.arc(0, -mu * 0.15, mu * 0.18, 0, Math.PI);
        ctx.fill();
      } else {
        for (const e of [-1, 1]) (ctx.beginPath(), ctx.arc(e * mu * 0.3, -mu * 0.45, mu * (mAge < 80 && mk === 2 ? 0.16 : 0.1), 0, TAU), ctx.fill());
      }
      ctx.fillStyle = '#ff8fa3';
      ctx.beginPath();
      ctx.arc(0, -mu * 0.22, mu * 0.1, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
  // 왼쪽 방 램프 불빛
  {
    const lg = ctx.createRadialGradient(X(0.25), Y(0.1), Rr(0.02), X(0.25), Y(0.35), Rr(0.45));
    lg.addColorStop(0, 'rgba(255,220,150,.28)');
    lg.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(X(RX[0]), Y(WALL0), Rr(W * CW), Y(FY1 - WALL0));
  }

  // ── 바닥 ──
  for (let room = 0; room < 2; room++) {
    const mir = room === 1;
    // 바닥판 두께 (앞면)
    ctx.fillStyle = mir ? '#5b4a85' : '#6e3f22';
    ctx.beginPath();
    ctx.roundRect(tileX(room, 0) - 2, tileY(H) - 2, cw * W + 4, Rr(0.026), [0, 0, 5, 5]);
    ctx.fill();
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const hv = hsh(room * 97 + y * 13 + x * 7), cr = mir && lv.crack === y;
        ctx.fillStyle = cr ? `hsl(220, 20%, ${44 + hv * 5}%)` : mir ? `hsl(258, 26%, ${(x + y) % 2 ? 41 : 45}%)` : `hsl(24, 34%, ${(x + y) % 2 ? 37 + hv * 3 : 41 + hv * 3}%)`;
        ctx.fillRect(tileX(room, x), tileY(y), cw + 0.5, ch + 0.5);
        ctx.fillStyle = 'rgba(0,0,0,.1)';
        ctx.fillRect(tileX(room, x), tileY(y) + ch - 1, cw, 1);
        ctx.fillRect(tileX(room, x) + cw - 1, tileY(y), 1, ch);
        ctx.fillStyle = 'rgba(255,255,255,.07)';
        ctx.fillRect(tileX(room, x) + 2, tileY(y) + ch * 0.45, cw - 4, 1);
      }
    // 뒷벽 그림자
    const sg = ctx.createLinearGradient(0, tileY(0), 0, tileY(0) + ch * 0.6);
    sg.addColorStop(0, 'rgba(20,5,15,.35)');
    sg.addColorStop(1, 'rgba(20,5,15,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(tileX(room, 0), tileY(0), cw * W, ch * 0.6);
  }
  // 발판 · 문 바닥 표시
  const open = doorOpen(lv, s.anim ? s.anim.to.a : s.P.a, s.anim ? s.anim.to.b : s.P.b);
  if (lv.plate >= 0) {
    const px = X(cX(lv.plateRoom, colOf(lv.plate))), py = tileY(rowOf(lv.plate)) + ch * 0.55, on = (lv.plateRoom ? s.P.b : s.P.a) === lv.plate && !s.anim;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(px, py + 2, cw * 0.36, ch * 0.24, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = on ? '#2bbf9f' : '#62f0d0';
    ctx.beginPath();
    ctx.ellipse(px, py - (on ? 0 : 2), cw * 0.34, ch * 0.22, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    fontPx(Math.round(cw * 0.3), 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐾', px, py - 2);
    if (open) {
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(t * 0.25);
      ctx.strokeStyle = TEAL;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(px, py, cw * 0.46, ch * 0.32, 0, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // ── 물건들 (뒤에서 앞으로) ──
  const items: { y: number; f: () => void }[] = [];
  for (let room = 0; room < 2; room++)
    for (let c = 0; c < NC; c++) {
      if (!lv.wall[room][c]) continue;
      const x = colOf(c), y = rowOf(c), isLine = lv.door >= 0 && room !== lv.plateRoom && x === lv.doorCol;
      items.push({
        y: y + 0.99,
        f: () => {
          if (isLine) {
            // 칸막이 담장
            const L = tileX(room, x) + cw * 0.18, Rx = tileX(room, x) + cw * 0.82, top = tileY(y) - ch * 0.12, bot = tileY(y) + ch * 0.92;
            ctx.fillStyle = 'rgba(20,6,20,.3)';
            ctx.fillRect(L + 4, tileY(y) + ch * 0.3, Rx - L, ch * 0.7);
            ctx.fillStyle = room ? '#7f6db0' : '#8d5a3a';
            ctx.fillRect(L, top + ch * 0.4, Rx - L, bot - top - ch * 0.4);
            ctx.fillStyle = room ? '#b9a8e6' : '#c7875a';
            ctx.fillRect(L, top, Rx - L, ch * 0.42);
            ctx.strokeStyle = 'rgba(0,0,0,.18)';
            ctx.lineWidth = 1;
            ctx.strokeRect(L + 0.5, top + ch * 0.42, Rx - L - 1, bot - top - ch * 0.42);
          } else drawBlock(ctx, tileX(room, x), tileY(y), cw, ch, Math.floor(hsh(room * 131 + c * 17) * 4), room === 1, hsh(c));
        },
      });
    }
  // 문
  if (lv.door >= 0) {
    const room = 1 - lv.plateRoom, x = colOf(lv.door), y = rowOf(lv.door);
    items.push({
      y: y + 0.98,
      f: () => {
        const L = tileX(room, x) + cw * 0.12, Rx = tileX(room, x) + cw * 0.88, top = tileY(y) - ch * 0.12, bot = tileY(y) + ch * 0.92;
        const lift = s.anim ? (open ? 1 : 0) : open ? 1 : 0;
        ctx.globalAlpha = lift ? 0.35 : 1;
        ctx.fillStyle = '#3a6f66';
        ctx.fillRect(L, top - lift * ch * 0.6, Rx - L, bot - top);
        ctx.strokeStyle = '#a7fff0';
        ctx.lineWidth = 2;
        for (let j = 1; j < 4; j++) {
          const bx = L + ((Rx - L) * j) / 4;
          ctx.beginPath();
          ctx.moveTo(bx, top + 3 - lift * ch * 0.6);
          ctx.lineTo(bx, bot - 3 - lift * ch * 0.6);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = open ? '#7dffd8' : '#ff6b6b';
        ctx.beginPath();
        ctx.arc((L + Rx) / 2, top - 4, 3.5, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        fontPx(Math.round(cw * 0.28), 900);
        ctx.textAlign = 'center';
        ctx.fillText('🐾', (L + Rx) / 2, (top + bot) / 2 - lift * ch * 0.6);
      },
    });
  }
  // 생선
  lv.fish.forEach((f, p) => {
    const eaten = ((s.P.e >> p) & 1) === 1 && t >= s.eatT[p];
    for (let room = 0; room < 2; room++) {
      const c = f[room];
      const on = !eaten && !s.anim && (room ? s.P.b : s.P.a) === c;
      items.push({ y: rowOf(c) + 0.55, f: () => drawFish(ctx, X(cX(room, colOf(c))), tileY(rowOf(c)) + ch * 0.5, u * 0.95, p, t, eaten, on) });
    }
  });
  // 상자
  const bx = boxAt(s);
  if (bx) {
    items.push({
      y: bx.y + 0.97,
      f: () => {
        const x0 = tileX(lv.boxRoom, 0) + bx.x * cw, y0 = tileY(0) + bx.y * ch, hb = ch * 0.5, pad = cw * 0.1;
        ctx.save();
        ctx.translate(x0 + cw / 2, y0 + ch);
        ctx.rotate(bx.wob);
        ctx.translate(-(x0 + cw / 2), -(y0 + ch));
        ctx.fillStyle = 'rgba(20,6,20,.3)';
        ctx.fillRect(x0 + pad + 4, y0 + ch * 0.3, cw - pad * 2, ch * 0.7);
        ctx.fillStyle = '#b98345';
        ctx.fillRect(x0 + pad, y0 + ch - hb - pad * 0.5, cw - pad * 2, hb);
        ctx.fillStyle = '#e2b571';
        ctx.fillRect(x0 + pad, y0 + pad * 0.5 - hb + ch * 0.25, cw - pad * 2, ch - pad - ch * 0.25);
        ctx.fillStyle = '#c8e2ff';
        ctx.fillRect(x0 + cw / 2 - 2.5, y0 + pad * 0.5 - hb + ch * 0.25, 5, ch - pad - ch * 0.25);
        ctx.fillStyle = 'rgba(80,40,10,.5)';
        fontPx(Math.round(cw * 0.26), 900);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐾', x0 + cw / 2, y0 + ch - hb / 2 - pad * 0.5);
        ctx.restore();
      },
    });
  }
  // 고양이
  const cats = [catAt(s, 0), catAt(s, 1)];
  const yawnL = (t % 420) < 54, yawnR = ((t + 210) % 420) < 54;
  for (let k = 0; k < 2; k++) {
    const c = cats[k];
    items.push({
      y: c.y + 0.75,
      f: () => {
        let mood: string = s.mood[k];
        if (mood === 'idle') {
          // 거울 속 고양이는 늘 반대 표정: 왼쪽이 하품하면 거울 쪽은 말똥, 거울 쪽이 하품하면 왼쪽이 말똥
          const myYawn = k ? yawnR : yawnL, other = k ? yawnL : yawnR;
          mood = s.phase === 'play' && !s.anim && t - s.lastEnd > 90 ? (myYawn ? 'yawn' : other ? 'wow' : k ? 'smug' : 'idle') : k ? 'smug' : 'idle';
        }
        const px = X(cX(k, 0)) + c.x * cw, py = Y(fY(0)) + c.y * ch;
        let sx = 1, sy = 1, lean = 0;
        if (c.moving) {
          if (c.dir >= 2) (sx = 1.14), (sy = 0.9), (lean = 0.12);
          else (sx = 0.92), (sy = 1.08);
          // 속도선
          ctx.strokeStyle = 'rgba(255,255,255,.55)';
          ctx.lineWidth = 2;
          for (let j = 0; j < 3; j++) {
            const ox = -DX[c.dir] * cw * (0.4 + j * 0.18), oy = -DY[c.dir] * ch * (0.4 + j * 0.18) - u * (0.2 + j * 0.14);
            ctx.beginPath();
            ctx.moveTo(px + ox, py + oy);
            ctx.lineTo(px + ox - DX[c.dir] * cw * 0.35, py + oy - DY[c.dir] * ch * 0.35);
            ctx.stroke();
          }
        } else if (c.after >= 0 && c.after < 10) {
          const q = 1 - c.after / 10;
          (sx = 1 + 0.18 * q), (sy = 1 - 0.16 * q);
        }
        const face = s.face[k] * (c.moving && c.dir >= 2 ? 1 : 1);
        drawCat(ctx, px, py, u, k, face, mood, t, sx, sy, lean * (c.dir === 2 ? 1 : 1));
      },
    });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();

  // ── 미리 보기: 방향마다 두 고양이가 멈출 자리 ──
  const canMove = s.phase === 'play' && !s.anim;
  const pvs = canMove ? previews(s) : null;
  if (pvs) {
    const pulse = 0.75 + 0.25 * Math.sin(t * 0.15);
    for (let dd = 0; dd < 4; dd++) {
      const pv = pvs[dd];
      for (let k = 0; k < 2; k++) {
        const from = k ? s.P.b : s.P.a, to = k ? pv.toB : pv.toA, dist = k ? pv.distB : pv.distA, cd = k ? pv.dB : dd;
        const fx0 = X(cX(k, colOf(from))), fy0 = tileY(rowOf(from)) + ch * 0.5;
        if (dist === 0) {
          // 막힘: 그쪽 옆에 작은 쿵 표시
          const bx2 = fx0 + DX[cd] * cw * 0.42, by2 = fy0 + DY[cd] * ch * 0.5 - (cd === 0 ? u * 0.55 : 0);
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = 'rgba(40,10,30,.75)';
          ctx.beginPath();
          ctx.arc(bx2, by2, 6.5, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = DCOL[dd];
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bx2 - 3, by2 - 3);
          ctx.lineTo(bx2 + 3, by2 + 3);
          ctx.moveTo(bx2 + 3, by2 - 3);
          ctx.lineTo(bx2 - 3, by2 + 3);
          ctx.stroke();
          ctx.globalAlpha = 1;
          continue;
        }
        const tx = X(cX(k, colOf(to))) + DX[cd] * cw * 0.0, ty = tileY(rowOf(to)) + ch * 0.5;
        const off = (dd - 1.5) * 0; // 같은 칸에 겹치면 아래에서 비켜 놓는다
        void off;
        ctx.strokeStyle = DCOL[dd];
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(fx0 + DX[cd] * cw * 0.3, fy0 + DY[cd] * ch * 0.3);
        ctx.lineTo(tx - DX[cd] * cw * 0.22, ty - DY[cd] * ch * 0.22);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        const good = pv.eat;
        const r0 = (good ? 9.5 : 7.5) * (good ? pulse + 0.1 : 1);
        ctx.fillStyle = good ? '#ffe066' : DCOL[dd];
        ctx.beginPath();
        ctx.arc(tx, ty, r0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(40,10,30,.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#2a1430';
        fontPx(good ? 10 : 9, 900);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ARW[dd], tx, ty + 0.5);
      }
    }
  }

  // ── 마법 거울 (금테 + 유리 반사) ──
  {
    const fx0 = X(0.5) - Rr(0.012), fx1 = X(0.982), fy0 = Y(WALL0 - 0.004), fy1 = Y(FY1 + 0.03), bw = Rr(0.018);
    // 유리빛
    ctx.save();
    ctx.beginPath();
    ctx.rect(X(RX[1]), Y(WALL0), Rr(W * CW), Y(FY1 + 0.026 - WALL0));
    ctx.clip();
    ctx.fillStyle = 'rgba(190,170,255,.1)';
    ctx.fillRect(0, 0, w, h);
    const sh = ((t * 0.6) % (w * 1.4)) - w * 0.2;
    for (const [o, wd, al] of [[0, 0.07, 0.13], [0.11, 0.025, 0.1]] as const) {
      ctx.fillStyle = `rgba(255,255,255,${al})`;
      ctx.beginPath();
      ctx.moveTo(X(RX[1]) + sh * 0.3 + Rr(o), Y(WALL0));
      ctx.lineTo(X(RX[1]) + sh * 0.3 + Rr(o + wd), Y(WALL0));
      ctx.lineTo(X(RX[1]) + sh * 0.3 + Rr(o + wd) - Rr(0.3), Y(FY1 + 0.03));
      ctx.lineTo(X(RX[1]) + sh * 0.3 + Rr(o) - Rr(0.3), Y(FY1 + 0.03));
      ctx.closePath();
      ctx.fill();
    }
    // 금 간 줄
    if (lv.crack >= 0) {
      const cy = tileY(lv.crack) + ch * 0.5;
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let j = 0; j <= 12; j++) ctx.lineTo(X(RX[1]) + (j / 12) * Rr(W * CW), cy + (j % 2 ? -1 : 1) * ch * 0.18 * hsh(j + 3));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.4)';
      ctx.beginPath();
      for (let j = 0; j <= 5; j++) {
        const xx = X(RX[1]) + hsh(j * 7) * Rr(W * CW);
        ctx.moveTo(xx, cy);
        ctx.lineTo(xx + (hsh(j) - 0.5) * cw * 0.6, cy + (j % 2 ? -1 : 1) * ch * 0.45);
      }
      ctx.stroke();
    }
    if (spark < 50) {
      ctx.globalAlpha = (1 - spark / 50) * 0.22;
      ctx.fillStyle = '#fff6c8';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // 금테
    const gg = ctx.createLinearGradient(fx0, fy0, fx1, fy1);
    gg.addColorStop(0, '#fff0a8');
    gg.addColorStop(0.4, '#e0a93a');
    gg.addColorStop(0.7, '#ffe48a');
    gg.addColorStop(1, '#b77d1f');
    ctx.strokeStyle = gg;
    ctx.lineWidth = bw;
    if (spark < 60) {
      ctx.shadowColor = '#fff2a0';
      ctx.shadowBlur = 24 * (1 - spark / 60);
    }
    ctx.beginPath();
    ctx.roundRect(fx0 + bw / 2, fy0 + bw / 2, fx1 - fx0 - bw, fy1 - fy0 - bw, Rr(0.02));
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(120,70,10,.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(fx0 + bw - 1, fy0 + bw - 1, fx1 - fx0 - bw * 2 + 2, fy1 - fy0 - bw * 2 + 2, Rr(0.012));
    ctx.stroke();
    // 장식 구슬 + 꼭대기 고양이 문장
    ctx.fillStyle = '#ffe48a';
    for (const [qx, qy] of [[fx0 + bw / 2, fy0 + bw / 2], [fx1 - bw / 2, fy0 + bw / 2], [fx0 + bw / 2, fy1 - bw / 2], [fx1 - bw / 2, fy1 - bw / 2]]) {
      ctx.beginPath();
      ctx.arc(qx, qy, bw * 0.7, 0, TAU);
      ctx.fill();
    }
    // 금 간 줄 표시 (거울 왼쪽 테에)
    if (lv.crack >= 0) {
      const cy = tileY(lv.crack) + ch * 0.5;
      ctx.fillStyle = '#ffffff';
      fontPx(13, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', fx0 + bw / 2, cy);
    }
    if (spark < 60) {
      ctx.fillStyle = '#fffbe0';
      for (let j = 0; j < 8; j++) {
        const a = j * 0.8 + spark * 0.05, rr2 = 4 + (j % 3) * 2;
        const qx = fx0 + (fx1 - fx0) * hsh(j * 3), qy = fy0 + (fy1 - fy0) * hsh(j * 5 + 2);
        ctx.globalAlpha = 1 - spark / 60;
        star5(ctx, qx, qy, rr2 * (1 + Math.sin(a)));
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
  // 왼쪽 방 벽 테두리
  ctx.fillStyle = '#4a2a1a';
  ctx.fillRect(X(RX[0]) - 4, Y(WALL0), 4, Y(FY1 + 0.026 - WALL0));
  ctx.fillRect(X(RX[0] + W * CW), Y(WALL0), 3, Y(FY1 + 0.026 - WALL0));

  // ── 사건 연출 ──
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT || e.t > t) continue;
    const ex = X(cX(e.room, colOf(e.c))), ey = Y(fY(rowOf(e.c))) - u * 0.5;
    if (e.kind === 'zoom') fx.burst(ex, ey + u * 0.45, 'rgba(255,255,255,.8)', 6, 1.6, 2);
    else if (e.kind === 'stop') fx.burst(ex, ey + u * 0.45, '#f3e3ff', 5, 1.4, 1.8);
    else if (e.kind === 'bonk' || e.kind === 'bonk2') {
      fx.burst(ex, ey - u * 0.2, '#ffffff', 10, 2.6, 2.2), fx.burst(ex, ey - u * 0.2, '#ffe066', 6, 2.2, 2), fx.ring(ex, ey, '#ffe0b0', Rr(0.06), 3), fx.kick(e.kind === 'bonk2' ? 5 : 4);
      say(ex, ey - u * 0.6, e.text!, e.col!, 17);
      (fx.memo.mouseT = t), (fx.memo.mouseK = 1);
    } else if (e.kind === 'giggle') fx.burst(ex, ey - u * 0.3, '#ffb3d9', 6, 1.6, 2), say(ex, ey - u * 0.62, e.text!, e.col!, 15);
    else if (e.kind === 'thud') fx.burst(ex, ey + u * 0.3, '#ffffff', 6, 1.8, 1.8), say(ex, ey - u * 0.55, e.text!, e.col!, 13);
    else if (e.kind === 'click') fx.ring(ex, ey + u * 0.3, TEAL, Rr(0.05), 3), say(ex, ey - u * 0.55, e.text!, e.col!, 14);
    else if (e.kind === 'knock') fx.burst(ex, ey, '#e2b571', 14, 3, 2.4), fx.kick(5), say(ex, ey - u * 0.6, e.text!, e.col!, 17);
    else if (e.kind === 'boxstop') fx.burst(ex, ey + u * 0.3, '#ffffff', 8, 2, 2), fx.kick(2), say(ex, ey - u * 0.5, e.text!, e.col!, 13);
    else if (e.kind === 'dooropen' || e.kind === 'doorshut') fx.ring(ex, ey, e.kind === 'dooropen' ? TEAL : '#ff8a8a', Rr(0.05), 3), say(ex, ey - u * 0.6, e.text!, e.col!, 14);
    else if (e.kind === 'through') fx.burst(ex, ey, TEAL, 14, 2.6, 2.2), say(ex, ey - u * 0.6, e.text!, e.col!, 16);
    else if (e.kind === 'duet') fx.burst(ex, ey, '#ffe066', 18, 3.4, 2.6), fx.burst(ex, ey, '#ffffff', 10, 2.6, 2), fx.ring(ex, ey, '#ffe066', Rr(0.08), 4);
    else if (e.kind === 'duetbig' || e.kind === 'duetfin') {
      const big = e.kind === 'duetfin' ? 1.5 : 1;
      fx.blink('#fff6c8', 0.25 * big), fx.kick(7 * big), (fx.memo.spark = t), (fx.memo.mouseT = t), (fx.memo.mouseK = 2);
      fx.burst(X(0.5), Y(FY + 0.1), '#ffe066', Math.round(28 * big), 5 * big, 3), fx.burst(X(0.5), Y(FY + 0.1), '#ff9ec4', Math.round(18 * big), 4 * big, 2.6), fx.ring(X(0.5), Y(FY + 0.2), '#fff2a0', Rr(0.4 * big), 6);
      if (big > 1) fx.burst(X(0.25), Y(FY + 0.3), '#ffffff', 20, 4, 2.4), fx.burst(X(0.75), Y(FY + 0.3), '#d9c8ff', 20, 4, 2.4);
      fx.pop(X(0.5), Y(FY + 0.11), e.text!, e.col!, Math.round(24 * big));
    } else if (e.kind === 'combo') fx.ring(X(0.5), Y(FY + 0.2), '#9ff3dc', Rr(0.25), 4), fx.pop(X(0.5), Y(FY + 0.2), e.text!, e.col!, 18);
    else if (e.kind === 'boop') {
      for (let j = 0; j < 3; j++) fx.pop(X(0.5) + (j - 1) * 10, ey - u * 0.3 - j * 6, '♥', '#ff8fb8', 14 + j * 2);
      fx.burst(X(0.5), ey, '#ffb3d0', 10, 2, 2);
      say(X(0.5), ey - u * 0.9, e.text!, e.col!, 15);
    } else if (e.kind === 'clear') {
      fx.burst(X(0.25), Y(0.5), '#ffe066', 40, 6, 3.2), fx.burst(X(0.75), Y(0.5), '#c9b8ff', 40, 6, 3.2), fx.burst(X(0.5), Y(0.6), '#ffffff', 30, 5, 3);
      fx.ring(X(0.5), Y(0.5), '#ffe066', Rr(0.5), 7), fx.blink('#fff6c8', 0.2);
    } else if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.18), (fx.memo.mouseT = t), (fx.memo.mouseK = 1);
  }
  fx.memo.t = t;

  // 첫 안내: 밀기 손
  if (s.stage === 0 && !s.firstMove && s.phase === 'play' && s.pt > 30) {
    const q = ((s.pt - 30) % 80) / 80, hx = X(0.17 + q * 0.18), hy = Y(FY + 0.25);
    ctx.globalAlpha = Math.min(1, (s.pt - 30) / 15) * (q < 0.85 ? 1 : (1 - q) / 0.15);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath();
    ctx.roundRect(X(0.15), hy - 3, hx - X(0.15), 6, 3);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    fontPx(30, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👆', hx, hy + 14);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // ═════════════ 위 띠 ═════════════
  const hb = Rr(0.075);
  ctx.fillStyle = 'rgba(28,14,38,.92)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.042, 900);
  const ttl = `${d.emoji} ${s.stage + 1}/${STAGE_COUNT} ${d.name}`;
  ctx.fillText(ttl, Rr(0.03), hb * 0.52, w * 0.55);
  ctx.textAlign = 'right';
  font(0.04, 900);
  ctx.fillStyle = '#ffd166';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - Rr(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - Rr(0.06) - ctx.measureText(stt).width, hb * 0.52);

  // 새것 알림 띠
  if (s.news && t - s.news.t < NEWS_T && (s.moved || s.pt >= CARD_T)) {
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20);
    ctx.globalAlpha = a;
    font(0.035, 900);
    ctx.textAlign = 'center';
    const tx = s.news.text, tw2 = Math.min(w - 10, ctx.measureText(tx).width + 24), by2 = hb + Rr(0.035);
    ctx.fillStyle = 'rgba(32,16,44,.92)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - Rr(0.025), tw2, Rr(0.05), Rr(0.025));
    ctx.fill();
    ctx.strokeStyle = '#c9a8ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, by2 + 1, w - 26);
    ctx.globalAlpha = 1;
  }
  // 새 장치 스포트라이트 (그 판을 처음 할 때만)
  if (!s.again && !s.moved && s.phase === 'play' && s.pt > SPOT0 && s.pt < SPOT0 + 160) {
    let sx2 = -1, sy2 = -1, label = '', rr = Rr(0.075);
    if (d.key === 'pairs' && lv.fish[1]) (sx2 = X(cX(0, colOf(lv.fish[1][0])))), (sy2 = tileY(rowOf(lv.fish[1][0])) + ch * 0.5), (label = '🐟 같은 색 생선끼리 한 쌍 — 두 쌍 다!');
    else if (d.key === 'box' && lv.box >= 0) (sx2 = X(cX(lv.boxRoom, colOf(lv.box)))), (sy2 = tileY(rowOf(lv.box)) + ch * 0.3), (label = '📦 들이받으면 쭈욱 밀려 가요');
    else if (d.key === 'crack' && lv.crack >= 0) (sx2 = X(0.745)), (sy2 = tileY(lv.crack) + ch * 0.5), (rr = Rr(0.24)), (label = '⚡ 이 줄의 거울 고양이는 같은 쪽으로!');
    else if (d.key === 'plate' && lv.plate >= 0) (sx2 = X(cX(lv.plateRoom, colOf(lv.plate)))), (sy2 = tileY(rowOf(lv.plate)) + ch * 0.5), (label = '🔘 발판을 밟은 동안 건너편 문이 열려요');
    if (label) {
      const age = s.pt - SPOT0, a = Math.min(1, age / 10, (160 - age) / 18);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(14,6,22,.6)';
      ctx.beginPath();
      ctx.rect(0, hb, w, Y(FY1 + 0.03) - hb);
      ctx.ellipse(sx2, sy2, rr, Math.min(rr, Rr(0.08)), 0, 0, TAU, true);
      ctx.fill('evenodd');
      ctx.strokeStyle = '#fff1a8';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -age;
      ctx.beginPath();
      ctx.ellipse(sx2, sy2, rr, Math.min(rr, Rr(0.08)), 0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      font(0.036, 900);
      const tw = Math.min(w - 12, ctx.measureText(label).width + Rr(0.05)), ly = sy2 > Y(0.55) ? sy2 - Rr(0.13) : sy2 + Rr(0.13), lx = Math.max(tw / 2 + 6, Math.min(w - tw / 2 - 6, sx2));
      ctx.fillStyle = 'rgba(60,24,90,.96)';
      ctx.beginPath();
      ctx.roundRect(lx - tw / 2, ly - Rr(0.03), tw, Rr(0.06), Rr(0.03));
      ctx.fill();
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff6e0';
      ctx.fillText(label, lx, ly + 1, tw - 10);
      font(0.03, 900);
      const nw2 = ctx.measureText('NEW!').width + 10;
      ctx.fillStyle = '#ff5a8a';
      ctx.beginPath();
      ctx.roundRect(lx - tw / 2 - 4, ly - Rr(0.058), nw2, Rr(0.04), Rr(0.02));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText('NEW!', lx - tw / 2 - 4 + nw2 / 2, ly - Rr(0.038));
      ctx.restore();
    }
  }
  // 판 카드 (뒷벽 위)
  if (s.phase !== 'result' && s.pt < CARD_T && !s.moved) {
    const a = Math.min(1, s.pt / 8, (CARD_T - s.pt) / 18), sc = Math.min(1, 0.7 + s.pt / 20);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, Y(0.2));
    ctx.scale(sc, sc);
    const cwid = Rr(0.86), chh = Rr(d.news && !s.again ? 0.16 : 0.115);
    ctx.fillStyle = 'rgba(32,16,44,.93)';
    ctx.beginPath();
    ctx.roundRect(-cwid / 2, -Rr(0.06), cwid, chh, Rr(0.03));
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a8';
    font(0.05, 900);
    ctx.fillText(`${s.again ? '다시! ' : ''}${s.stage + 1}판 · ${d.name}`, 0, -Rr(0.025), cwid - 16);
    ctx.fillStyle = '#fff6ea';
    font(0.036, 800);
    ctx.fillText(`🐟 ${lv.fish.length}쌍 · ★★★ 최소 ${lv.min}수 · 한도 ${lv.limit}수`, 0, Rr(0.022), cwid - 16);
    if (d.news && !s.again) {
      ctx.fillStyle = '#9ff3dc';
      font(0.035, 900);
      ctx.fillText(`NEW ${d.news}`, 0, Rr(0.068), cwid - 16);
    }
    ctx.restore();
  }
  // 결과 카드
  if (s.phase === 'result') {
    const age = s.pt, a = Math.min(1, age / 10), sc = Math.min(1, 0.6 + age / 14);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, Y(0.47));
    ctx.scale(sc, sc);
    ctx.fillStyle = s.ok ? 'rgba(36,18,52,.94)' : 'rgba(60,18,36,.94)';
    ctx.beginPath();
    ctx.roundRect(-Rr(0.4), -Rr(0.09), Rr(0.8), Rr(0.19), Rr(0.035));
    ctx.fill();
    ctx.strokeStyle = s.ok ? '#ffd166' : '#ff9aa8';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    font(0.055, 900);
    ctx.fillStyle = s.ok ? '#ffe9a8' : '#ffc0c8';
    ctx.fillText(s.ok ? (s.won ? '거울 궁전 정복! 👑' : '냠냠 완료!') : `앗… ${s.why}`, 0, -Rr(0.045), Rr(0.74));
    if (s.ok) {
      for (let k = 0; k < 3; k++) {
        const ag = age - (10 + k * 12);
        if (ag < 0) continue;
        const got = s.starOk[k], pop = ag < 8 ? 1.8 - 0.8 * (ag / 8) : 1, sx3 = (k - 1) * Rr(0.1);
        ctx.save();
        ctx.translate(sx3, Rr(0.012));
        ctx.scale(pop, pop);
        star5(ctx, 0, 0, Rr(0.032));
        ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.12)';
        ctx.fill();
        ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx3, Y(0.47) + Rr(0.012), '#ffe066', 16, 3, 2.4);
      }
      font(0.034, 800);
      ctx.fillStyle = '#fff6ea';
      ctx.fillText(`${s.used}수 · ★★ ${lv.par}수 이내 ${s.starOk[1] ? '✓' : '✗'} · ★★★ 최소 ${lv.min}수 ${s.starOk[2] ? '✓' : '✗'}`, 0, Rr(0.068), Rr(0.76));
    } else {
      font(0.036, 800);
      ctx.fillStyle = '#fff6ea';
      ctx.fillText(s.hearts > 0 ? '둘 다 어질어질~ 하트 -1 · 같은 판 다시' : '끝 — 고양이들이 낮잠을 자러 가요 💤', 0, Rr(0.025), Rr(0.74));
    }
    ctx.restore();
  }

  // ═════════════ 아래 띠: 방향 미리 보기 · 수 · 별 · 안내 ═════════════
  {
    const ty = FY1 + 0.045, tb = h / w;
    const g = ctx.createLinearGradient(0, Y(ty), 0, Y(tb));
    g.addColorStop(0, 'rgba(40,20,54,.96)');
    g.addColorStop(1, 'rgba(24,12,34,.98)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, Y(ty), w, Y(tb - ty) + 4, [Rr(0.03), Rr(0.03), 0, 0]);
    ctx.fill();
    // 방향 칩: ◀ (왼쪽 끝) · ▲ ▼ (가운데) · ▶ (오른쪽 끝)
    const order = [2, 0, 1, 3], chw = Rr(0.228), chh2 = Rr(0.1), cy0 = Y(ty + 0.018);
    order.forEach((dd, j) => {
      const x0 = Rr(0.02) + j * (chw + Rr(0.016)), pv = pvs ? pvs[dd] : null;
      ctx.globalAlpha = pv ? 1 : 0.45;
      ctx.fillStyle = pv && pv.eat ? 'rgba(255,214,90,.3)' : 'rgba(255,255,255,.07)';
      ctx.beginPath();
      ctx.roundRect(x0, cy0, chw, chh2, Rr(0.02));
      ctx.fill();
      ctx.strokeStyle = pv && pv.eat ? '#ffe066' : DCOL[dd];
      ctx.lineWidth = pv && pv.eat ? 2.5 : 1.5;
      ctx.stroke();
      ctx.fillStyle = DCOL[dd];
      font(0.045, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ARW[dd], x0 + Rr(0.03), cy0 + chh2 / 2);
      // 두 고양이 결과
      for (let k = 0; k < 2; k++) {
        const ry = cy0 + chh2 * (k ? 0.72 : 0.3), hx = x0 + Rr(0.075);
        ctx.fillStyle = CAT_PAL[k].fur;
        ctx.beginPath();
        ctx.arc(hx, ry, Rr(0.014), 0, TAU);
        ctx.fill();
        for (const e of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(hx + e * Rr(0.013), ry - Rr(0.002));
          ctx.lineTo(hx + e * Rr(0.011), ry - Rr(0.024));
          ctx.lineTo(hx + e * Rr(0.002), ry - Rr(0.012));
          ctx.fill();
        }
        if (!pv) continue;
        const dist = k ? pv.distB : pv.distA, stop = k ? pv.stopB : pv.stopA, on = k ? pv.onB : pv.onA;
        const txt = pv.eat ? '냠!' : dist === 0 ? (stop === 1 ? '쾅' : '쿵') : on ? `${dist}칸🐟` : stop === 3 ? `${dist}딸깍` : stop === 1 ? `${dist}쾅` : `${dist}칸`;
        ctx.fillStyle = pv.eat ? '#ffe066' : dist === 0 ? '#ffb3a8' : '#fff6ea';
        fontPx(12.5, 900);
        ctx.textAlign = 'left';
        ctx.fillText(txt, hx + Rr(0.022), ry + 1, chw - Rr(0.1));
      }
      ctx.globalAlpha = 1;
    });
    // 수 막대
    const r1 = Y(ty + 0.16);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f3e3ff';
    font(0.038, 900);
    ctx.fillText(`수 ${s.used}/${lv.limit}`, Rr(0.03), r1);
    const x0 = Rr(0.25), x1 = w - Rr(0.04), bh = Rr(0.02), q = Math.min(1, s.used / lv.limit);
    ctx.fillStyle = 'rgba(255,255,255,.1)';
    ctx.beginPath();
    ctx.roundRect(x0, r1 - bh / 2, x1 - x0, bh, bh / 2);
    ctx.fill();
    const bg2 = ctx.createLinearGradient(x0, 0, x1, 0);
    bg2.addColorStop(0, '#b48cff');
    bg2.addColorStop(1, '#ff6b8a');
    ctx.fillStyle = bg2;
    if (q > 0) (ctx.beginPath(), ctx.roundRect(x0, r1 - bh / 2, Math.max(bh, (x1 - x0) * q), bh, bh / 2), ctx.fill());
    // ★★★ 표는 선의 왼쪽, ★★ 표는 선의 오른쪽에 (기준이 가까워도 안 겹치게)
    for (const [n, lab, al] of [[lv.min, '★★★', 'right'], [lv.par, '★★', 'left']] as const) {
      const lx = x0 + (x1 - x0) * (n / lv.limit);
      ctx.fillStyle = s.used <= n ? '#ffd166' : 'rgba(255,255,255,.3)';
      ctx.fillRect(lx - 1, r1 - bh, 2, bh * 2);
      fontPx(12, 900);
      ctx.textAlign = al;
      ctx.fillText(lab, lx + (al === 'right' ? 5 : -5), r1 - bh * 1.6);
    }
    // 별 목표
    const r2 = Y(ty + 0.225), cw2 = Rr(0.3);
    const full = (1 << lv.fish.length) - 1, eatN = [0, 1, 2].filter((p) => (s.P.e >> p) & 1).length;
    const okk = [s.P.e === full, s.used <= lv.par && s.P.e === full, s.used <= lv.min && s.P.e === full];
    const bad = [s.phase === 'result' && !s.ok, s.used > lv.par, s.used > lv.min];
    const labels = [`생선 ${eatN}/${lv.fish.length}쌍`, `${lv.par}수 이내`, `최소 ${lv.min}수`];
    for (let k = 0; k < 3; k++) {
      const cx1 = Rr(0.03) + k * (cw2 + Rr(0.017));
      ctx.fillStyle = okk[k] ? 'rgba(255,209,102,.25)' : bad[k] ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.08)';
      ctx.beginPath();
      ctx.roundRect(cx1, r2 - Rr(0.024), cw2, Rr(0.048), Rr(0.024));
      ctx.fill();
      ctx.strokeStyle = okk[k] ? '#ffd166' : bad[k] ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = okk[k] ? '#ffd166' : bad[k] ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.6)';
      font(0.038, 900);
      ctx.textAlign = 'center';
      ctx.fillText(bad[k] ? '✗' : '★', cx1 + Rr(0.028), r2 + 1);
      ctx.fillStyle = okk[k] ? '#fff6dc' : bad[k] ? 'rgba(255,255,255,.4)' : '#f3e3ff';
      font(0.035, 800);
      ctx.textAlign = 'left';
      ctx.fillText(labels[k], cx1 + Rr(0.055), r2 + 1, cw2 - Rr(0.062));
    }
    // 안내 한 줄
    let hint = d.tip;
    const first = s.stage === 0 && !s.firstMove;
    if (first) hint = '👆 화면을 밀어요 — 거울 속 고양이는 좌우 반대로!';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 판 끝! 냐옹~♪' : `★ ${s.got}개! 다음 판엔 새것이 나와요`) : '색 점 = 그쪽으로 밀면 멈출 자리';
    else if (s.stage === 0) hint = '색 점 = 그쪽으로 밀면 멈출 자리 · 둘 다 생선 위면 냠!';
    ctx.textAlign = 'center';
    ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
    font(first ? 0.04 : 0.036, 900);
    ctx.fillText(hint, w / 2, Y(ty + 0.29), w - Rr(0.05));
  }
}
