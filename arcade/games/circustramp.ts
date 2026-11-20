/**
 * 🎪 트램펄린 서커스 (37라운드: 살아 움직이는 세계 — 톡) — 트램펄린 받기 × 받아내기.
 * 세상은 저절로: 서커스 천막 안, 높은 발판에서 동물 곡예사들이 차례로 저절로 뛰어내린다(느긋한 포물선).
 *   떨어질 자리는 점선·그림자로 미리 보이고, 관중석이 들썩, 조명이 흔들린다.
 * 손짓 하나(톡): 톡 한 자리 아래로 트램펄린이 '통' 떨어진다(바닥 또는 받침대 위, 가장 가까운 자리에 붙음).
 *   트램펄린은 기울기가 없다 — 튀는 방향은 들어온 각도·속도 그대로(가로 속도 유지, 세로만 되튐 + 튈 때마다 조금 더 높이).
 *   그래서 '어디서(바닥? 받침대 위?) 받느냐'가 다음에 어디로 날아갈지를 정한다. 트램펄린은 판마다 개수가 정해져 있고 세 번 쓰면 펑 찢어진다.
 * 와우: 받은 곡예사가 '뿅!' 공중제비를 돌며 깃발 발판에 착지 — 착지한 곡예사들은 어깨 위로 인간 탑을 쌓고 관중이 기립.
 *   놓친 곡예사는 톱밥 더미에 푹 처박혀 다리만 버둥.
 * 판(8): 목표 = 곡예사 N명을 깃발 발판에. 별(판마다 하나씩 늘어남): 깃발로 N명 / 아무도 안 떨어뜨리기 / 트램펄린 N개로(또는 불꽃 고리).
 *   너무 많이 놓치면 하트 -1, 그 판 다시. 1판은 안전망이 있어 놓쳐도 다시 올라간다(처음 10초·손 안 대도 잃는 것 없음).
 * 펼쳐짐(하는 일이 바뀐다): 1 한 번 튀기(떨어질 자리에) → 2 이어 튀기(튄 곡예사가 떨어질 자리에 또) → 3 받침대(높이서 일찍 받아 짧게)
 *   → 4 무거운 곰(낮게 튀고 두 배로 닳음 — 곰은 받침대, 원숭이는 바닥) → 5 불꽃 고리(돌아가는 길로 고리 통과) → 6 선풍기(바람에 밀려 휘는 길)
 *   → 7 양쪽 무대(오른쪽 토끼는 왼쪽으로 — 한 트램펄린으로 둘 다 받기) → 8 대공연(전부).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

// ───────────────────────────── 화면·물리 상수 ─────────────────────────────
/** 화면 세로 ÷ 가로 */
const A = 1.5;
/** 화면(폭 단위)에서 링 바닥(세계 y=0)의 높이 — 세계 y는 위로 늘어난다 */
const FLOOR = 1.235;
/** 중력(틱당) · 트램펄린 매트 높이 · 바닥 트램펄린이 받는 반폭(넉넉히, 기준 22) · 받침대 위 트램펄린이 받는 반폭 */
const G = 0.0006, MAT = 0.04, CATCH = 0.095, SCATCH = 0.062;
/** 깃발 발판 폭 · 천막 벽 · 천장 */
const FW = 0.16, WALL = 0.012, CEIL = 1.13;
/** 바닥 자리(톡 하면 가장 가까운 자리에 붙는다) */
const SLOT_X0 = 0.06, SLOT_DX = 0.04, SLOT_N = 23;
/** 바닥 트램펄린끼리 이만큼은 떨어져야 (겹치지 않게) */
const BUSY = 0.1;
const slotX = (i: number) => SLOT_X0 + i * SLOT_DX;
/** 곡예사가 발판 끝에서 준비하는 시간(틱) — 이동안 점선이 보인다 (끼어들 여유 1초 이상) */
const PREP = 84;
/** 1판 안전망에 떨어진 곡예사가 다시 사다리로 올라가는 시간 */
const NET_BACK = 120;

/** 곡예사 종류: 0 원숭이 · 1 곰(무겁다: 낮게 튀고 트램펄린이 두 배로 닳는다) · 2 토끼(빠르다) */
export type Kind = 0 | 1 | 2;
const K_VX = [0.0033, 0.0012, 0.004];
const K_HOP = [0.0042, 0.003, 0.005];
/** 튈 때: 세로 속도² × E2 + 2G × BOOST (원숭이·토끼는 튈 때마다 BOOST만큼 더 높이, 곰은 낙차의 절반만) */
const K_E2 = [1, 1, 1];
const K_BOOST = [0.13, 0.26, 0.13];
const K_WEAR = [1, 3, 1];
const K_NAME = ['원숭이', '곰', '토끼'];

// ───────────────────────────── 판 ─────────────────────────────
export interface Plat { x: number; h: number; dir: 1 | -1 }
export interface Stand { x: number; h: number }
export interface Hoop { x: number; y: number; r: number }
export interface Fan { x0: number; x1: number; y0: number; y1: number; ax: number }
export interface Flag { x: number; h: number }
type StarK = 'goal' | 'clean' | 'par' | 'hoop';
type Spot = 'one' | 'chain' | 'stand' | 'bear' | 'hoop' | 'fan' | 'both' | 'grand';
export interface Level {
  key: Spot; plats: Plat[]; stands: Stand[]; hoops: Hoop[]; fans: Fan[]; flags: Flag[];
  seq: { k: Kind; p: number }[]; goal: number; stock: number; uses: number; par: number; hoopGoal: number;
  gap: number; first: number; net: boolean; stars: StarK[];
}
interface StageDef { key: Spot; name: string; news: string; hint: string; spot: string; stars: StarK[] }
export const STAGES: StageDef[] = [
  { key: 'one', name: '첫 공연', news: '', hint: '떨어질 곳을 톡! 트램펄린', spot: '', stars: ['goal'] },
  { key: 'chain', name: '이어 튀기', news: '튄 곡예사가 떨어질 곳에 또 놓으면 더 높이!', hint: '점선 끝에 또 톡 — 두 번 튀어 높은 깃발로', spot: '높은 깃발', stars: ['goal', 'clean'] },
  { key: 'stand', name: '받침대', news: '받침대 위에서 받으면 일찍 튀어 짧게 날아가요', hint: '바닥에서 받으면 너무 멀리 — 받침대를 톡', spot: '받침대', stars: ['goal', 'clean', 'par'] },
  { key: 'bear', name: '무거운 곰', news: '곰은 낮게 튀고 트램펄린을 두 배로 닳게 해요', hint: '곰은 높은 데서 받아야 깃발까지 — 원숭이와 따로', spot: '곰', stars: ['goal', 'clean', 'par'] },
  { key: 'hoop', name: '불꽃 고리', news: '불꽃 고리를 지나면 박수가 두 배!', hint: '고리를 지나는 길로 돌아가요', spot: '불꽃 고리', stars: ['goal', 'hoop', 'clean'] },
  { key: 'fan', name: '선풍기 바람', news: '선풍기 바람에 밀리면 길이 휘어요', hint: '바람 속에선 더 멀리 — 휘는 점선을 봐요', spot: '선풍기', stars: ['goal', 'clean', 'par'] },
  { key: 'both', name: '양쪽 무대', news: '오른쪽 토끼는 왼쪽으로 뛰어요', hint: '한 트램펄린으로 양쪽을 다 받아요', spot: '토끼 무대', stars: ['goal', 'clean', 'par'] },
  { key: 'grand', name: '대공연', news: '마지막 무대 — 전부 다 나와요', hint: '누가 어디로 갈지 점선을 끝까지 봐요', spot: '', stars: ['goal', 'clean', 'par'] },
];
export const STAGE_COUNT = STAGES.length;
const PTS_LAND = 100, PTS_BOUNCE = 25, PTS_HOOP = 60, PTS_CLEAR = 120, PTS_STAR = [0, 150, 330, 560], PTS_WIN = 400;

// ───────────────────────────── 물리 (결정적, 고정 간격) ─────────────────────────────
interface Mover { x: number; y: number; vx: number; vy: number }
/** 한 틱: 바람 → 중력 → 이동. 경로 분석·세계·미리 보기·봇이 모두 이 함수를 쓴다 */
function move(L: Level, a: Mover) {
  for (const f of L.fans) if (a.x >= f.x0 && a.x <= f.x1 && a.y >= f.y0 && a.y <= f.y1) a.vx += f.ax;
  a.vy -= G;
  a.x += a.vx;
  a.y += a.vy;
}
/** 트램펄린에 닿은 뒤 세로 속도 (위로) */
const bounceVy = (k: Kind, vy: number) => Math.sqrt(Math.max(vy * vy * K_E2[k] + 2 * G * K_BOOST[k], 0.0055 * 0.0055));
const launch = (L: Level, k: Kind, p: number): Mover => ({ x: L.plats[p].x, y: L.plats[p].h, vx: L.plats[p].dir * K_VX[k], vy: K_HOP[k] });
/** 깃발 착지: 내려오며 발판 높이를 지나고 폭 안 */
function flagHit(L: Level, py: number, a: Mover): number {
  if (a.vy >= 0) return -1;
  for (let i = 0; i < L.flags.length; i++) {
    const f = L.flags[i];
    if (py >= f.h && a.y < f.h && Math.abs(a.x - f.x) <= FW / 2) return i;
  }
  return -1;
}
function hoopMask(L: Level, a: Mover, m: number): number {
  for (let i = 0; i < L.hoops.length; i++) {
    const h = L.hoops[i];
    if (!((m >> i) & 1) && Math.hypot(a.x - h.x, a.y - h.y) < h.r) m |= 1 << i;
  }
  return m;
}
const popc = (m: number) => {
  let n = 0;
  for (; m; m &= m - 1) n++;
  return n;
};

// ───────────────────────────── 세계 (판 안 시뮬레이션) ─────────────────────────────
/** 트램펄린: lv = -1 바닥, 0 이상 = 받침대 번호 · y = 매트 높이 */
export interface Tr { id: number; x: number; lv: number; y: number; uses: number; t0: number; hit: number }
const WAIT = 0, AIR = 1, FLAG = 2, MISS = 3, NET = 4;
export interface Ac {
  id: number; k: Kind; p: number; st: number; x: number; y: number; vx: number; vy: number; jumpAt: number;
  b: number; hoops: number; t: number; fl: number; wall: boolean; order: number; bt: number;
}
export interface World {
  t: number; L: Level; trs: Tr[]; acs: Ac[]; landed: number; missed: number; hoopN: number; placed: number; stock: number; nid: number; ver: number; bounces: number;
}
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number; k?: number }
type Sink = ((kind: string, x: number, y: number, text?: string, col?: string, v?: number, k?: number) => void) | null;

const catchW = (tr: Tr) => (tr.lv < 0 ? CATCH : SCATCH);
/** 세계 한 틱. E가 있으면 사건을 알린다(미리 보기·봇은 null) */
function stepWorld(W: World, E: Sink) {
  W.t++;
  const L = W.L;
  let broke = false;
  for (const a of W.acs) {
    if (a.st === WAIT) {
      if (W.t >= a.jumpAt) {
        const m = launch(L, a.k, a.p);
        a.st = AIR;
        a.x = m.x;
        a.y = m.y;
        a.vx = m.vx;
        a.vy = m.vy;
        a.t = W.t;
        E?.('jump', a.x, a.y, '', '', a.id, a.k);
      }
      continue;
    }
    if (a.st === NET) {
      if (W.t - a.t >= NET_BACK) {
        // 다시 줄 끝으로
        let last = W.t + PREP;
        for (const b of W.acs) if (b.st === WAIT && b.p === a.p) last = Math.max(last, b.jumpAt + L.gap);
        a.st = WAIT;
        a.jumpAt = last;
        a.b = 0;
        a.hoops = 0;
        a.t = W.t;
      }
      continue;
    }
    if (a.st !== AIR) continue;
    const py = a.y;
    move(L, a);
    const hm = hoopMask(L, a, a.hoops);
    if (hm !== a.hoops) {
      const nw = hm & ~a.hoops;
      a.hoops = hm;
      W.hoopN += popc(nw);
      for (let i = 0; i < L.hoops.length; i++) if ((nw >> i) & 1) E?.('hoop', L.hoops[i].x, L.hoops[i].y, '불꽃 통과!', '#ffd23a', a.id, a.k);
    }
    if (a.vy < 0) {
      let best: Tr | null = null;
      for (const tr of W.trs) if (tr.uses > 0 && py >= tr.y && a.y < tr.y && Math.abs(a.x - tr.x) <= catchW(tr) && (!best || tr.y > best.y)) best = tr;
      const fl = flagHit(L, py, a);
      if (fl >= 0 && (!best || L.flags[fl].h >= best.y)) {
        a.st = FLAG;
        a.fl = fl;
        a.y = L.flags[fl].h;
        a.t = W.t;
        a.order = W.landed;
        W.landed++;
        E?.('land', a.x, a.y, '', '', a.id, a.k);
        continue;
      }
      if (best) {
        a.y = best.y;
        a.vy = bounceVy(a.k, a.vy);
        a.b++;
        a.bt = W.t;
        W.bounces++;
        best.uses -= K_WEAR[a.k];
        best.hit = W.t;
        if (best.uses <= 0) broke = true;
        E?.('boing', a.x, best.y, '', '', a.id, a.k);
        if (best.uses <= 0) E?.('break', best.x, best.y, '', '', best.id, a.k);
        continue;
      }
    }
    if (a.y <= 0) {
      a.y = 0;
      a.t = W.t;
      if (L.net) {
        a.st = NET;
        E?.('net', a.x, 0, '', '', a.id, a.k);
      } else {
        a.st = MISS;
        W.missed++;
        E?.('miss', a.x, 0, '', '', a.id, a.k);
      }
    } else if (a.x < WALL || a.x > 1 - WALL) {
      a.x = Math.max(WALL, Math.min(1 - WALL, a.x));
      a.st = MISS;
      a.wall = true;
      a.t = W.t;
      W.missed++;
      E?.('wall', a.x, a.y, '', '', a.id, a.k);
    } else if (a.y > CEIL) {
      a.y = CEIL;
      a.vy = -Math.abs(a.vy) * 0.3;
    }
  }
  if (broke) (W.trs = W.trs.filter((tr) => tr.uses > 0)), W.ver++;
}
function cloneWorld(W: World): World {
  return { ...W, trs: W.trs.map((t) => ({ ...t })), acs: W.acs.map((a) => ({ ...a })) };
}
const resolved = (a: Ac) => a.st === FLAG || a.st === MISS;
const allDone = (W: World) => W.acs.every(resolved);

// ───────────────────────────── 미리 보기 (같은 물리로 앞을 셈) ─────────────────────────────
export interface Fore {
  t0: number; ver: number;
  /** 곡예사별 앞으로의 길: [x,y]를 2틱마다, 끝 = 어떻게 끝나나 */
  paths: Map<number, { pts: number[]; s0: number; end: number; ex: number; ey: number; t1: number; bounces: number[] }>;
  landed: number; missed: number; hoops: number;
  /** 처음 놓치는 곡예사 (없으면 -1) */
  firstMiss: number;
}
const HORIZON = 330;
function forecast(W0: World, extra?: Tr, horizon = HORIZON): Fore {
  const W = cloneWorld(W0);
  if (extra) W.trs.push(extra);
  const t0 = W.t, watch = new Set<number>();
  for (const a of W.acs) if (a.st === AIR || (a.st === WAIT && a.jumpAt <= t0 + horizon)) watch.add(a.id);
  const paths: Fore['paths'] = new Map();
  for (const id of watch) paths.set(id, { pts: [], s0: 0, end: -1, ex: 0, ey: 0, t1: 0, bounces: [] });
  const l0 = W.landed, m0 = W.missed, h0 = W.hoopN;
  let firstMiss = -1;
  const byId = new Map(W.acs.map((a) => [a.id, a]));
  const sink: Sink = (kind, x, y, _t, _c, id) => {
    const p = id !== undefined ? paths.get(id) : undefined;
    if (!p) return;
    if (kind === 'boing') p.bounces.push(x, y);
    if (kind === 'miss' || kind === 'wall' || kind === 'net' || kind === 'land') {
      p.end = kind === 'land' ? FLAG : kind === 'net' ? NET : MISS;
      p.ex = x;
      p.ey = y;
      p.t1 = W.t;
      if (kind !== 'land' && firstMiss < 0) firstMiss = id!;
    }
  };
  for (let n = 0; n < horizon + 260; n++) {
    stepWorld(W, sink);
    let open = false;
    for (const id of watch) {
      const a = byId.get(id)!, p = paths.get(id)!;
      if (a.st === AIR) {
        open = true;
        if ((W.t & 1) === 0) {
          if (!p.pts.length) p.s0 = W.t;
          p.pts.push(a.x, a.y);
        }
      } else if (a.st === WAIT) open = true;
    }
    if (!open) break;
  }
  return { t0, ver: W0.ver, paths, landed: W.landed - l0, missed: W.missed - m0, hoops: W.hoopN - h0, firstMiss };
}

// ───────────────────────────── 길 찾기 (곡예사 하나: 어디에 놓아야 깃발로 가나) ─────────────────────────────
interface Place { x: number; lv: number }
interface Route { place: Place[]; hoops: number; bounces: number; floorX: number[] }
/**
 * 곡예사 하나(지금 상태 m)를 앞으로 날려 보며, 바닥·받침대에서 '받기'를 넣을 수 있는 모든 길을 찾는다(새 트램펄린 maxNew개까지).
 * 이미 놓인 트램펄린은 지나가면 반드시 튄다. 깃발에 닿는 길만 돌려준다.
 */
function routes(L: Level, trs: Tr[], k: Kind, m0: Mover, maxNew = 2, hoops0 = 0): Route[] {
  const out: Route[] = [];
  const go = (m: Mover, place: Place[], hm: number, b: number, fx: number[], depth: number) => {
    if (depth > 4) return;
    for (let n = 0; n < 900; n++) {
      const py = m.y;
      move(L, m);
      hm = hoopMask(L, m, hm);
      if (m.vy < 0) {
        let best: { y: number } | null = null;
        for (const tr of trs) if (tr.uses > 0 && py >= tr.y && m.y < tr.y && Math.abs(m.x - tr.x) <= catchW(tr) && (!best || tr.y > best.y)) best = tr;
        for (const q of place) {
          const y = q.lv < 0 ? MAT : L.stands[q.lv].h + MAT, w = q.lv < 0 ? CATCH : SCATCH;
          if (py >= y && m.y < y && Math.abs(m.x - q.x) <= w && (!best || y > best.y)) best = { y };
        }
        const fl = flagHit(L, py, m);
        if (fl >= 0 && (!best || L.flags[fl].h >= best.y)) {
          out.push({ place, hoops: popc(hm), bounces: b, floorX: fx });
          return;
        }
        if (best) {
          m.y = best.y;
          m.vy = bounceVy(k, m.vy);
          b++;
          continue;
        }
        if (place.length < maxNew) {
          for (let i = 0; i < L.stands.length; i++) {
            const s = L.stands[i], y = s.h + MAT;
            if (py >= y && m.y < y && Math.abs(m.x - s.x) <= SCATCH - 0.006 && !trs.some((t) => t.lv === i) && !place.some((q) => q.lv === i))
              go({ x: m.x, y, vx: m.vx, vy: bounceVy(k, m.vy) }, [...place, { x: s.x, lv: i }], hm, b + 1, fx, depth + 1);
          }
          if (py >= MAT && m.y < MAT) go({ x: m.x, y: MAT, vx: m.vx, vy: bounceVy(k, m.vy) }, [...place, { x: m.x, lv: -1 }], hm, b + 1, [...fx, m.x], depth + 1);
        }
      }
      if (m.y <= 0 || m.x < WALL || m.x > 1 - WALL) return;
      if (m.y > CEIL) (m.y = CEIL), (m.vy = -Math.abs(m.vy) * 0.3);
    }
  };
  go({ ...m0 }, [], hoops0, 0, [], 0);
  return out;
}
/** 바닥만, 떨어질 자리 바로 밑에 (버릇 봇의 길) */
function habitRoute(L: Level, k: Kind, m0: Mover): { lands: boolean; place: number; hoops: number; xs: number[] } {
  const m = { ...m0 };
  let place = 0, hm = 0;
  const xs: number[] = [];
  for (let n = 0; n < 1400; n++) {
    const py = m.y;
    move(L, m);
    hm = hoopMask(L, m, hm);
    if (m.vy < 0) {
      if (flagHit(L, py, m) >= 0) return { lands: true, place, hoops: popc(hm), xs };
      if (py >= MAT && m.y < MAT) {
        if (place >= 4) break;
        place++;
        xs.push(m.x);
        m.y = MAT;
        m.vy = bounceVy(k, m.vy);
        continue;
      }
    }
    if (m.y <= 0 || m.x < WALL || m.x > 1 - WALL) break;
    if (m.y > CEIL) (m.y = CEIL), (m.vy = -Math.abs(m.vy) * 0.3);
  }
  return { lands: false, place, hoops: popc(hm), xs };
}
/** 처음 떨어질 바닥 자리 (트램펄린 없을 때) */
function firstFloorX(L: Level, m0: Mover): number {
  const m = { ...m0 };
  for (let n = 0; n < 900; n++) {
    move(L, m);
    if (m.y <= MAT && m.vy < 0) return m.x;
  }
  return m.x;
}
/** 지나가는 받침대 꼭대기(받을 수 있는 곳) 높이에서의 x (없으면 NaN) */
function crossAt(L: Level, m0: Mover, y: number): number {
  const m = { ...m0 };
  for (let n = 0; n < 900; n++) {
    const py = m.y;
    move(L, m);
    if (m.vy < 0 && py >= y && m.y < y) return m.x;
    if (m.y <= 0) break;
  }
  return NaN;
}
void K_NAME;

// ───────────────────────────── 판 만들기 ─────────────────────────────
const rnd = (r: Rng, a: number, b: number) => a + (b - a) * r();
interface Groups { k: Kind; p: number; n: number }
const groupsOf = (L: Level): Groups[] => {
  const m = new Map<string, Groups>();
  for (const q of L.seq) {
    const key = `${q.k}:${q.p}`;
    const g = m.get(key) ?? { k: q.k, p: q.p, n: 0 };
    g.n++;
    m.set(key, g);
  }
  return [...m.values()];
};

/** 판의 모양만 (깃발 x는 뒤에서 정한다) */
function rawLevel(key: Spot, r: Rng): Level {
  const L: Level = { key, plats: [], stands: [], hoops: [], fans: [], flags: [], seq: [], goal: 0, stock: 0, uses: 3, par: 0, hoopGoal: 0, gap: 150, first: 160, net: false, stars: [] };
  const left = (): Plat => ({ x: rnd(r, 0.12, 0.15), h: rnd(r, 0.64, 0.71), dir: 1 });
  const right = (): Plat => ({ x: rnd(r, 0.85, 0.88), h: rnd(r, 0.62, 0.7), dir: -1 });
  const mk = (ks: Kind[], p = 0) => ks.map((k) => ({ k, p }));
  if (key === 'one') {
    L.plats.push(left());
    L.seq = mk([0, 0, 0]);
    L.flags.push({ x: 0, h: rnd(r, 0.42, 0.52) });
    L.net = true;
    L.goal = 3;
    L.stock = 6;
    L.gap = 160;
    L.first = 150;
  } else if (key === 'chain') {
    L.plats.push({ ...left(), x: rnd(r, 0.08, 0.11) });
    L.seq = mk([0, 0, 0, 0, 0, 0]);
    L.flags.push({ x: 0, h: rnd(r, 0.74, 0.82) });
    L.goal = 3;
    L.stock = 6;
    L.gap = 140;
  } else if (key === 'stand') {
    L.plats.push(left());
    L.seq = mk([0, 0, 0, 0, 0]);
    const P = L.plats[0], hs = rnd(r, 0.34, 0.46), cx = crossAt(L, launch(L, 0, 0), hs + MAT);
    L.stands.push({ x: cx + rnd(r, -0.02, 0.02), h: hs });
    L.flags.push({ x: 0, h: rnd(r, 0.4, 0.62) });
    L.goal = 4;
    L.stock = 4;
    void P;
  } else if (key === 'bear') {
    L.plats.push(left());
    const order: Kind[][] = [[0, 1, 0, 1, 0, 0], [0, 0, 1, 0, 1, 0], [1, 0, 0, 1, 0, 0], [0, 1, 0, 0, 1, 0]];
    L.seq = mk(order[Math.floor(r() * order.length)]);
    // 받침대는 원숭이가 지나는 자리에 (곰은 거의 똑바로 떨어져 받침대를 비켜 간다)
    const hs = rnd(r, 0.36, 0.5), cx = crossAt(L, launch(L, 0, 0), hs + MAT);
    L.stands.push({ x: cx + rnd(r, -0.005, 0.02), h: hs });
    L.flags.push({ x: 0, h: rnd(r, 0.36, 0.52) }, { x: 0, h: rnd(r, 0.58, 0.82) });
    L.goal = 5;
    L.stock = 5;
  } else if (key === 'hoop') {
    L.plats.push(left());
    L.seq = mk([0, 0, 0, 0, 0]);
    const hs = rnd(r, 0.2, 0.45), cx = crossAt(L, launch(L, 0, 0), hs + MAT);
    L.stands.push({ x: cx + rnd(r, -0.02, 0.02), h: hs });
    L.flags.push({ x: 0, h: rnd(r, 0.35, 0.7) });
    L.goal = 4;
    L.stock = 6;
    L.hoopGoal = 3;
  } else if (key === 'fan') {
    L.plats.push(left());
    L.seq = mk([0, 0, 0, 0, 0]);
    const y1 = rnd(r, 0.28, 0.45), x1 = rnd(r, 0.4, 0.6);
    L.fans.push({ x0: 0, x1, y0: 0, y1, ax: rnd(r, 0.00003, 0.00006) });
    if (r() < 0.5) {
      const hs = rnd(r, 0.3, 0.45), cx = crossAt(L, launch(L, 0, 0), hs + MAT);
      if (Number.isFinite(cx)) L.stands.push({ x: cx + rnd(r, -0.02, 0.02), h: hs });
    }
    L.flags.push({ x: 0, h: rnd(r, 0.4, 0.75) });
    L.goal = 4;
    L.stock = 5;
  } else if (key === 'both') {
    const sh = r() < 0.5 ? -1 : 1;
    L.plats.push({ x: rnd(r, 0.18, 0.25) + sh * 0.085, h: rnd(r, 0.64, 0.8), dir: 1 }, { x: rnd(r, 0.76, 0.83) + sh * 0.085, h: rnd(r, 0.6, 0.78), dir: -1 });
    const order: number[][] = [[0, 1, 0, 0, 1, 0], [1, 0, 0, 1, 0, 0], [0, 0, 1, 0, 1, 0], [0, 1, 0, 1, 0, 0]];
    L.seq = order[Math.floor(r() * order.length)].map((p) => ({ k: (p ? 2 : 0) as Kind, p }));
    L.flags.push({ x: 0, h: rnd(r, 0.32, 0.52) }, { x: 0, h: rnd(r, 0.32, 0.52) });
    L.goal = 5;
    L.stock = 4;
    L.gap = 140;
  } else {
    L.plats.push(left(), right());
    const order: [Kind, number][][] = [
      [[0, 0], [2, 1], [1, 0], [0, 0], [2, 1], [1, 0], [0, 0]],
      [[2, 1], [0, 0], [0, 0], [1, 0], [2, 1], [0, 0], [1, 0]],
    ];
    L.seq = order[Math.floor(r() * order.length)].map(([k, p]) => ({ k, p }));
    const hs = rnd(r, 0.3, 0.46), cx = crossAt(L, launch(L, 0, 0), hs + MAT);
    L.stands.push({ x: cx + rnd(r, -0.02, 0.02), h: hs });
    L.flags.push({ x: 0, h: rnd(r, 0.34, 0.56) }, { x: 0, h: rnd(r, 0.5, 0.8) });
    L.goal = 6;
    L.stock = 6;
    L.uses = 3;
    L.gap = 140;
  }
  return L;
}

/** 그룹이 높이 h를 내려오며 지나는 자리들 — 받기(바닥 F·받침대 S) 순서마다 (한 번 이상 튄 뒤) */
interface Cross { x: number; plan: string; hm: number; ax: number; ay: number }
function crossings(L: Level, k: Kind, p: number, h: number, maxC = 3): Cross[] {
  const out: Cross[] = [];
  const go = (m: Mover, plan: string, hm: number, depth: number) => {
    let ax = m.x, ay = m.y;
    for (let n = 0; n < 1400; n++) {
      const py = m.y;
      move(L, m);
      hm = hoopMask(L, m, hm);
      if (m.y > ay) (ay = m.y), (ax = m.x);
      if (m.vy < 0) {
        if (py >= h && m.y < h) out.push({ x: m.x, plan, hm, ax, ay });
        if (depth < maxC) {
          for (let i = 0; i < L.stands.length; i++) {
            const st = L.stands[i], y = st.h + MAT;
            if (py >= y && m.y < y && Math.abs(m.x - st.x) <= SCATCH - 0.006) go({ x: m.x, y, vx: m.vx, vy: bounceVy(k, m.vy) }, plan + 'S' + i, hm, depth + 1);
          }
          if (py >= MAT && m.y < MAT) go({ x: m.x, y: MAT, vx: m.vx, vy: bounceVy(k, m.vy) }, plan + 'F', hm, depth + 1);
        }
      }
      if (m.y <= 0 || m.x < WALL || m.x > 1 - WALL) return;
      if (m.y > CEIL) (m.y = CEIL), (m.vy = -Math.abs(m.vy) * 0.3);
    }
  };
  go(launch(L, k, p), '', 0, 0);
  return out;
}
const HABIT_PLANS = ['F', 'FF', 'FFF'];
const TOL = 0.014;
/** 깃발 f에 확실히 앉나(1) · 확실히 비켜 가나(-1) · 아슬아슬(0) */
const onFlag = (f: Flag, x: number) => (Math.abs(x - f.x) <= FW / 2 - TOL ? 1 : Math.abs(x - f.x) >= FW / 2 + TOL ? -1 : 0);
/** 버릇 길(바닥만)의 결말: 몇 번째 깃발에 앉나 (-1 못 앉음, -2 아슬아슬) */
function habitEnd(L: Level, cs: Cross[][]): number {
  for (const plan of HABIT_PLANS) {
    for (let fi = 0; fi < L.flags.length; fi++) {
      const c = cs[fi].find((q) => q.plan === plan);
      if (!c) continue;
      const o = onFlag(L.flags[fi], c.x);
      if (o === 0) return -2;
      if (o === 1) return fi;
    }
  }
  return -1;
}

/** 깃발 x를 고른다: 그룹마다 '깃발로 가는 길'이 있도록. 단계마다 필요한 성질을 검사 */
function placeFlags(L: Level, r: Rng): boolean {
  const key = L.key, gs = groupsOf(L);
  const fit = (x: number) => Number.isFinite(x) && x - FW / 2 > 0.03 && x + FW / 2 < 1 - WALL - 0.005;
  const jit = (a = 0.025) => rnd(r, -a, a);
  const cross = (g: Groups, fi: number) => crossings(L, g.k, g.p, L.flags[fi].h);
  const pickOf = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const g0 = gs[0];
  if (key === 'one' || key === 'chain') {
    const c = cross(g0, 0).find((q) => q.plan === (key === 'one' ? 'F' : 'FF'));
    if (!c) return false;
    L.flags[0].x = c.x + jit();
  } else if (key === 'stand' || key === 'fan') {
    const cs = cross(g0, 0).filter((q) => fit(q.x) && (key === 'fan' ? q.plan !== '' && q.plan.length <= 2 : q.plan === 'S0'));
    if (!cs.length) return false;
    L.flags[0].x = pickOf(cs).x + jit(0.02);
  } else if (key === 'bear') {
    // 낮은 깃발(0)은 원숭이가 받침대에서 튀어 닿는 곳 · 높은 깃발(1)은 곰이 바닥을 꾹 눌러 높이 튀어 닿는 곳
    const gm = gs.find((g) => g.k === 0)!, gb = gs.find((g) => g.k === 1)!;
    const cm = cross(gm, 0).find((q) => q.plan === 'S0'), cb = cross(gb, 1).find((q) => q.plan === 'F');
    if (!cb || !cm) return false;
    const st = L.stands[0], bx = crossAt(L, launch(L, 1, gb.p), st.h + MAT);
    if (Math.abs(bx - st.x) < SCATCH + 0.02) return false;
    L.flags[0].x = cm.x + jit(0.02);
    L.flags[1].x = cb.x + jit(0.015);
  } else if (key === 'hoop') {
    const cs = cross(g0, 0).filter((q) => q.plan !== '' && q.plan.length <= 2);
    const pairs: [Cross, Cross][] = [];
    for (const a of cs) for (const b of cs) if (a !== b && a.plan.length <= b.plan.length && Math.abs(a.x - b.x) < FW - 2 * TOL - 0.01 && Math.hypot(a.ax - b.ax, a.ay - b.ay) > 0.08) pairs.push([a, b]);
    if (!pairs.length) return false;
    const [a, b] = pickOf(pairs);
    L.flags[0].x = (a.x + b.x) / 2;
    // 고리는 '돌아가는 길'(b)의 꼭대기에
    L.hoops.push({ x: b.ax, y: Math.min(CEIL - 0.08, b.ay), r: 0.065 });
  } else if (key === 'both') {
    const gl = gs.find((g) => g.p === 0)!, gr = gs.find((g) => g.p === 1)!;
    const a = cross(gl, 1).find((q) => q.plan === 'F'), b = cross(gr, 0).find((q) => q.plan === 'F');
    if (!a || !b) return false;
    // 두 무대의 첫 떨어질 자리가 가까워야 한 트램펄린으로 둘 다 받는다 (버릇처럼 바로 밑에 따로 놓으면 둘)
    const d = Math.abs(firstFloorX(L, launch(L, gl.k, gl.p)) - firstFloorX(L, launch(L, gr.k, gr.p)));
    if (d < CATCH + 0.008 || d > CATCH + 0.04) return false;
    // 함께 받는 자리가 화면 한가운데면 '늘 가운데' 버릇이 우연히 맞힌다 — 비켜 놓는다
    const mid = (firstFloorX(L, launch(L, gl.k, gl.p)) + firstFloorX(L, launch(L, gr.k, gr.p))) / 2;
    if (Math.abs(mid - 0.5) < 0.062) return false;
    L.flags[1].x = a.x + jit();
    L.flags[0].x = b.x + jit();
  } else {
    // 대공연: 깃발 둘을 그룹들의 길 끝에서 골라, 모든 그룹이 어느 깃발엔가 닿게
    const cs0 = gs.map((g) => cross(g, 0).filter((q) => q.plan !== '' && q.plan.length <= 2));
    const cs1 = gs.map((g) => cross(g, 1).filter((q) => q.plan !== '' && q.plan.length <= 2));
    const xs0 = cs0.flat().map((q) => q.x).filter(fit), xs1 = cs1.flat().map((q) => q.x).filter(fit);
    const ok: [number, number][] = [];
    for (const a of xs0)
      for (const b of xs1) {
        if (Math.abs(a - b) < FW + 0.06) continue;
        if (gs.every((_, gi) => cs0[gi].some((q) => Math.abs(q.x - a) <= FW / 2 - TOL - 0.005) || cs1[gi].some((q) => Math.abs(q.x - b) <= FW / 2 - TOL - 0.005))) ok.push([a, b]);
      }
    if (!ok.length) return false;
    [L.flags[0].x, L.flags[1].x] = pickOf(ok);
  }
  if (!L.flags.every((f) => fit(f.x))) return false;
  // 깃발 둘: 높이가 많이 다르면 옆에 붙어도 되고, 비슷하면 넉넉히 떨어져야
  if (L.flags.length === 2 && Math.abs(L.flags[0].x - L.flags[1].x) < (Math.abs(L.flags[0].h - L.flags[1].h) > 0.18 ? FW + 0.01 : FW + 0.06)) return false;
  // 깃발 발판이 출발 발판과 겹치지 않게
  for (const f of L.flags)
    for (const P of L.plats) {
      const p0 = P.dir > 0 ? P.x - 0.13 : P.x, p1 = P.dir > 0 ? P.x : P.x + 0.13;
      if (f.x + FW / 2 > p0 - 0.03 && f.x - FW / 2 < p1 + 0.03 && Math.abs(f.h - P.h) < 0.16) return false;
    }
  return true;
}

/** 판에 맞는 성질인가: 그룹마다 길이 있고(아슬아슬한 길 없이), 버릇(떨어질 자리 바로 밑)으로는 다 못 하는가 */
function judgeLevel(L: Level, si: number): boolean {
  const gs = groupsOf(L), key = L.key;
  let habitFails = 0;
  for (const g of gs) {
    const cs = L.flags.map((f) => crossings(L, g.k, g.p, f.h));
    // 뛰어내리기만 해서는 어느 깃발에도 앉지 않는다 (받아야 간다)
    if (cs.some((list, fi) => list.some((c) => c.plan === '' && onFlag(L.flags[fi], c.x) >= 0))) return false;
    const he = habitEnd(L, cs);
    if (he === -2) return false;
    // 깃발로 가는 길(받기 셋까지)이 적어도 하나, 확실하게
    let any = false;
    cs.forEach((list, fi) => list.forEach((c) => c.plan.length <= 3 && onFlag(L.flags[fi], c.x) === 1 && (any = true)));
    if (!any) return false;
    if (he < 0) habitFails++;
    if (key === 'one' && he !== 0) return false;
    if (key === 'chain' && !(he === 0 && cs[0].some((c) => c.plan === 'FF' && onFlag(L.flags[0], c.x) === 1))) return false;
    if (key === 'hoop') {
      const withHoop = cs[0].some((c) => c.hm && onFlag(L.flags[0], c.x) === 1), without = cs[0].some((c) => !c.hm && onFlag(L.flags[0], c.x) === 1);
      if (!withHoop || !without) return false;
      // 버릇 길이 고리를 지나 앉으면 안 된다
      const hc = HABIT_PLANS.map((pl) => cs[0].find((c) => c.plan === pl)).find((c) => c && onFlag(L.flags[0], c.x) === 1);
      if (hc && hc.hm) return false;
    }
  }
  if ((key === 'stand' || key === 'bear' || key === 'fan') && habitFails === 0) return false;
  void si;
  return true;
}

/** 똑똑한 봇과 같은 수로 판을 끝까지 돌려 본다: 다 깃발로 가나 · 트램펄린 몇 개 썼나 */
function trial(L: Level, pick: (W: World) => Place | null, maxT = 60 * 40): { W: World; ok: boolean } {
  const W = newWorld(L);
  W.stock = 99;
  let lastVer = -1, next = 0;
  for (let t = 0; t < maxT && !allDone(W); t++) {
    if (W.ver !== lastVer || t >= next) {
      const p = pick(W);
      next = t + 30;
      if (p) (putTramp(W, p.x, p.lv), (next = t + 6));
      lastVer = W.ver;
    }
    stepWorld(W, null);
  }
  return { W, ok: allDone(W) };
}

const levelCache = new Map<string, Level>();
export function buildLevel(seed: number, si: number): Level {
  const ck = `${seed}:${si}`;
  const c = levelCache.get(ck);
  if (c) return c;
  const d = STAGES[si], r = mulberry32((seed * 2654435761 + si * 40503 + 101) >>> 0);
  let pickL: Level | null = null, fallback: Level | null = null;
  for (let tries = 0; tries < 160 && !pickL; tries++) {
    const L = rawLevel(d.key, r);
    L.stars = d.stars;
    if (!placeFlags(L, r)) continue;
    if (!judgeLevel(L, si)) continue;
    // 똑똑한 봇이 다 깃발로 보내는지, 몇 개 쓰는지
    const sm = trial(L, (W) => smartPick(W, true));
    if (!sm.ok || sm.W.missed > 0 || sm.W.landed < L.seq.length) continue;
    L.par = Math.max(1, sm.W.placed);
    if (L.hoops.length) L.hoopGoal = Math.max(1, Math.min(L.hoopGoal, sm.W.hoopN));
    fallback ??= L;
    if (si >= 2) {
      // 버릇 봇(떨어질 자리 바로 밑)이 별 셋을 따면 버린다 (기준 13)
      const hb = trial(L, (W) => habitPick(W));
      const hs = starsOf(L, hb.W);
      if (hs.every(Boolean)) continue;
    }
    L.stock = Math.max(L.stock, L.par + (si >= 2 ? 1 : 2));
    pickL = L;
  }
  const L = pickL ?? fallback ?? safeLevel(si);
  levelCache.set(ck, L);
  return L;
}
/** 만들기에 실패하면: 1판 모양 (언제나 풀린다) */
function safeLevel(si: number): Level {
  const L = rawLevel('one', mulberry32(7 + si));
  L.flags[0].x = 0.6;
  L.stars = STAGES[si].stars.filter((k) => k !== 'hoop');
  L.net = si === 0;
  L.par = 2;
  L.stock = 4;
  return L;
}

// ───────────────────────────── 세계 만들기·트램펄린 놓기 ─────────────────────────────
function newWorld(L: Level): World {
  const W: World = { t: 0, L, trs: [], acs: [], landed: 0, missed: 0, hoopN: 0, placed: 0, stock: L.stock, nid: 1, ver: 0, bounces: 0 };
  L.seq.forEach((q, i) => {
    W.acs.push({ id: W.nid++, k: q.k, p: q.p, st: WAIT, x: L.plats[q.p].x, y: L.plats[q.p].h, vx: 0, vy: 0, jumpAt: L.first + i * L.gap, b: 0, hoops: 0, t: 0, fl: -1, wall: false, order: -1, bt: -99 });
  });
  return W;
}
function putTramp(W: World, x: number, lv: number): Tr {
  const y = lv < 0 ? MAT : W.L.stands[lv].h + MAT;
  const tr: Tr = { id: W.nid++, x, lv, y, uses: W.L.uses, t0: W.t, hit: -99 };
  W.trs.push(tr);
  W.placed++;
  W.stock--;
  W.ver++;
  return tr;
}
/** 톡 한 자리 → 놓일 자리 (받침대 위 / 바닥 자리). 이미 있으면 null */
function snap(W: World, px: number, wy: number): Place | 'busy' {
  const L = W.L;
  for (let i = 0; i < L.stands.length; i++) {
    const s = L.stands[i];
    if (Math.abs(px - s.x) <= 0.08 && wy >= s.h * 0.55) return W.trs.some((t) => t.lv === i) ? 'busy' : { x: s.x, lv: i };
  }
  // 바로 위를 톡 하면 그대로, 아니면 비어 있는 가장 가까운 바닥 자리
  if (W.trs.some((t) => t.lv < 0 && Math.abs(t.x - px) < 0.045)) return 'busy';
  let bj = -1, bd = 9;
  for (let j = 0; j < SLOT_N; j++) {
    const x = slotX(j), d = Math.abs(x - px);
    if (d < bd && !W.trs.some((t) => t.lv < 0 && Math.abs(t.x - x) < BUSY)) (bd = d), (bj = j);
  }
  return bj < 0 || bd > 0.14 ? 'busy' : { x: slotX(bj), lv: -1 };
}
function starsOf(L: Level, W: World): boolean[] {
  return L.stars.map((k) => (k === 'goal' ? W.landed >= L.goal : k === 'clean' ? W.missed === 0 : k === 'par' ? W.placed <= L.par : W.hoopN >= L.hoopGoal));
}

// ───────────────────────────── 봇의 머리 (판 만들기에도 쓴다) ─────────────────────────────
/** 곡예사의 지금 상태(날고 있거나 발판에서 뛸 참) */
const moverOf = (W: World, a: Ac): Mover => (a.st === AIR ? { x: a.x, y: a.y, vx: a.vx, vy: a.vy } : launch(W.L, a.k, a.p));
/** 앞으로 놓칠 곡예사 (미리 보기 기준, 가장 먼저 끝나는 쪽) */
function troubled(W: World, f: Fore): Ac[] {
  const out: { a: Ac; t: number }[] = [];
  for (const a of W.acs) {
    const p = f.paths.get(a.id);
    if (!p || p.end === FLAG || p.end === -1) continue;
    out.push({ a, t: p.t1 });
  }
  return out.sort((p, q) => p.t - q.t).map((z) => z.a);
}
/**
 * 똑똑한 봇: 놓칠 곡예사를 하나 골라 같은 물리로 길을 모두 셈해(바닥·받침대 받기) 새 트램펄린이 가장 적게 드는 길을 고르고,
 * 그 길의 첫 트램펄린을 다음 곡예사들의 길도 함께 받는 자리로 조금 옮겨 놓는다. 놓은 뒤 미리 보기로 다른 곡예사를 망치지 않는지 확인.
 */
function smartPick(W: World, wantHoop: boolean): Place | null {
  if (W.stock <= 0) return null;
  const f = forecast(W);
  for (const a of troubled(W, f).slice(0, 3)) {
    const p = fixOne(W, f, a, wantHoop);
    if (p) return p;
  }
  return null;
}
function fixOne(W: World, f: Fore, a: Ac, wantHoop: boolean): Place | null {
  const L = W.L, hoopStar = wantHoop && L.stars.includes('hoop');
  const rs = routes(L, W.trs, a.k, moverOf(W, a), 2, a.hoops);
  if (!rs.length) return null;
  // 다른 곡예사(다음 둘)의 바닥 받기 자리 — 같이 받을 수 있으면 그쪽으로
  const others: number[] = [];
  for (const b of W.acs) {
    if (b === a || b.st !== WAIT || others.length >= 6) continue;
    const rb = routes(L, W.trs, b.k, moverOf(W, b), 1);
    rb.sort((p, q) => p.place.length - q.place.length);
    if (rb[0]) for (const q of rb[0].place) if (q.lv < 0) others.push(q.x);
  }
  const cost = (q: Route) => q.place.length * 10 - (hoopStar ? q.hoops * 14 : 0) + q.bounces * 0.5;
  rs.sort((p, q) => cost(p) - cost(q));
  const base = f.landed * 10 - f.missed * 12;
  for (const q of rs.slice(0, 5)) {
    const first = q.place[0];
    if (!first) continue;
    let cands: Place[];
    if (first.lv >= 0) cands = [first];
    else {
      // 받을 수 있는 바닥 자리들 중 다른 곡예사를 가장 많이 같이 받는 자리 (가운데 우선)
      const js: { p: Place; v: number }[] = [];
      for (let j = 0; j < SLOT_N; j++) {
        const x = slotX(j);
        if (Math.abs(x - first.x) > CATCH - 0.02) continue;
        if (W.trs.some((t) => t.lv < 0 && Math.abs(t.x - x) < BUSY)) continue;
        let v = -Math.abs(x - first.x) * 3;
        for (const o of others) if (Math.abs(o - x) <= CATCH - 0.02) v += 1;
        js.push({ p: { x, lv: -1 }, v });
      }
      js.sort((p, q2) => q2.v - p.v);
      cands = js.slice(0, 3).map((z) => z.p);
    }
    for (const p of cands) {
      const tr: Tr = { id: -1, x: p.x, lv: p.lv, y: p.lv < 0 ? MAT : L.stands[p.lv].h + MAT, uses: L.uses, t0: W.t, hit: -99 };
      const g = forecast(W, tr);
      const pa = g.paths.get(a.id);
      // 이 곡예사가 나아졌고(깃발 또는 한 번 더 튐), 다른 곡예사를 망치지 않았나
      const better = pa && (pa.end === FLAG || pa.bounces.length > (f.paths.get(a.id)?.bounces.length ?? 0));
      if (better && g.landed * 10 - g.missed * 12 >= base) return p;
    }
  }
  return null;
}
/** 버릇 봇: 놓칠 곡예사가 떨어질 바닥 자리 바로 밑에 (받침대는 안 씀) */
function habitPick(W: World): Place | null {
  if (W.stock <= 0) return null;
  const f = forecast(W);
  for (const a of troubled(W, f).slice(0, 3)) {
    const p = f.paths.get(a.id)!;
    if ((p.end !== MISS && p.end !== NET) || p.ey > 0.02) continue;
    const s = snap(W, p.ex, 0);
    if (s !== 'busy') return { x: s.x, lv: -1 };
  }
  return null;
}

// ───────────────────────────── 상태 ─────────────────────────────
export interface CircusState {
  seed: number; t: number; stage: number; phase: 'play' | 'result'; pt: number; endT: number;
  L: Level; W: World; hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; again: boolean; tries: number;
  seen: Set<string>; events: Ev[]; banner: { head: string; sub: string; t: number } | null; spot: { x: number; y: number; r: number; label: string; t: number } | null;
  wowN: number; firstTap: number; firstBoing: number; down: boolean; ax: number; ay: number; slow: number; magnet: boolean;
  fc: Fore | null; cheer: number; cheerT: number; ohT: number; lastPlace: number; hintX: number;
  drops: { id: number; x: number; y: number; t: number }[];
}
const ev = (s: CircusState, kind: string, x: number, y: number, text?: string, col?: string, v?: number, k?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v, k });
const see = (s: CircusState, key: string) => s.seen.add(key);

function newStage(s: CircusState) {
  const d = STAGES[s.stage];
  s.L = buildLevel(s.seed, s.stage);
  s.W = newWorld(s.L);
  s.phase = 'play';
  s.pt = 0;
  s.endT = -1;
  s.got = 0;
  s.starOk = s.L.stars.map(() => false);
  s.fc = null;
  s.drops = [];
  s.magnet = s.stage === 0 && !s.again && s.firstTap < 0;
  s.hintX = firstFloorX(s.L, launch(s.L, s.L.seq[0].k, s.L.seq[0].p));
  see(s, d.key);
  if (s.L.seq.some((q) => q.k === 1)) see(s, 'bearK');
  if (s.again) s.banner = { head: `다시! ${s.stage + 1}판 · ${d.name}`, sub: d.hint, t: s.t };
  else s.banner = s.stage === 0 ? null : { head: `${s.stage + 1}판 · ${d.name}`, sub: d.news ? `NEW  ${d.news}` : d.hint, t: s.t };
  s.spot = null;
  if (!s.again && s.stage > 0) {
    const L = s.L;
    if (d.key === 'chain') s.spot = { x: L.flags[0].x, y: L.flags[0].h + 0.06, r: 0.13, label: d.spot, t: s.t };
    if (d.key === 'stand' || d.key === 'bear') {
      const st = L.stands[0];
      if (d.key === 'stand') s.spot = { x: st.x, y: st.h, r: 0.11, label: d.spot, t: s.t };
      else {
        const P = L.plats[0];
        s.spot = { x: P.x - 0.05, y: P.h + 0.08, r: 0.12, label: d.spot, t: s.t };
      }
    }
    if (d.key === 'hoop' && L.hoops[0]) s.spot = { x: L.hoops[0].x, y: L.hoops[0].y, r: 0.11, label: d.spot, t: s.t };
    if (d.key === 'fan' && L.fans[0]) s.spot = { x: 0.08, y: L.fans[0].y1 * 0.5, r: 0.12, label: d.spot, t: s.t };
    if (d.key === 'both' && L.plats[1]) s.spot = { x: L.plats[1].x + 0.05, y: L.plats[1].h + 0.08, r: 0.12, label: d.spot, t: s.t };
  }
  s.again = false;
}

/** 1·2판 자석 반경 */
const MAG = 0.18;
/** 지금 미리 보기 (같은 물리로 앞을 셈 — 트램펄린을 놓거나 깨질 때만 다시) */
function foreOf(s: CircusState): Fore {
  if (!s.fc || s.fc.ver !== s.W.ver || s.W.t - s.fc.t0 > 60) s.fc = forecast(s.W);
  return s.fc;
}
/** 손가락이 닿은 자리 → 트램펄린 놓기 */
function tapAt(s: CircusState, px: number, py: number) {
  const W = s.W, wy = FLOOR - py * A;
  if (s.banner && s.t - s.banner.t < 150) s.banner.t = s.t - 150;
  if (W.stock <= 0) {
    ev(s, 'empty', px, Math.max(0.12, Math.min(0.9, wy)), '트램펄린이 없어요!', '#ffe0d0');
    return;
  }
  let pl = snap(W, px, wy);
  if (s.stage <= 1 && pl !== 'busy' && pl.lv < 0) {
    // 배우는 판(1·2판): 떨어질 그림자 가까이(MAG)를 톡 하면 그 자리에 자석처럼 붙는다
    const f = foreOf(s);
    let bx = -1, bd = MAG;
    for (const q of f.paths.values()) if ((q.end === MISS || q.end === NET) && q.ey < 0.02 && Math.abs(q.ex - px) < bd) (bd = Math.abs(q.ex - px)), (bx = q.ex);
    if (bx >= 0) {
      const m = snap(W, bx, 0);
      if (m !== 'busy') pl = m;
    }
  }
  if (s.magnet) {
    // 첫 판 첫 톡: 손가락 그림이 가리키는 자리에 붙는다 (처음 하는 사람의 첫 손길은 반드시 '뿅!')
    const j = Math.max(0, Math.min(SLOT_N - 1, Math.round((s.hintX - SLOT_X0) / SLOT_DX)));
    pl = { x: slotX(j), lv: -1 };
    s.magnet = false;
  }
  if (pl === 'busy') {
    ev(s, 'busy', px, Math.max(0.1, Math.min(0.9, wy)), '여기엔 이미 있어요', '#fff2c8');
    return;
  }
  const tr = putTramp(W, pl.x, pl.lv);
  s.drops.push({ id: tr.id, x: tr.x, y: Math.max(tr.y + 0.12, Math.min(1.05, wy)), t: s.t });
  s.lastPlace = s.t;
  s.fc = null;
  if (s.firstTap < 0) s.firstTap = s.t;
  if (pl.lv >= 0) see(s, 'onStand');
  ev(s, 'place', tr.x, tr.y, '통!', '#ffffff', tr.lv);
  // 첫 판: 첫 트램펄린이 놓이면 기다리던 원숭이가 바로 뛴다
  if (s.stage === 0) {
    const first = W.acs.find((a) => a.st === WAIT);
    if (first && first.jumpAt > W.t + 4 && !W.acs.some((a) => a.st !== WAIT)) {
      const d = first.jumpAt - (W.t + 4);
      for (const a of W.acs) if (a.st === WAIT) a.jumpAt -= d;
    }
  }
}

function finish(s: CircusState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  const L = s.L, W = s.W;
  if (ok) {
    s.starOk = starsOf(L, W);
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += Math.round((PTS_CLEAR + PTS_STAR[s.got] + W.stock * 15) * (1 + 0.15 * s.stage));
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += PTS_WIN + s.hearts * 80);
    ev(s, 'clear', 0.5, 0.8, '', '', s.got);
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.8, why);
  }
}

/** 사건 받기: 세계가 알리는 일을 화면 사건으로 · 점수 */
function sinkOf(s: CircusState): Sink {
  return (kind, x, y, _t, _c, id, k) => {
    const W = s.W, a = W.acs.find((q) => q.id === id);
    if (kind === 'boing') {
      if (s.firstBoing < 0) {
        s.firstBoing = s.t;
        s.wowN++;
        s.slow = 16;
        ev(s, 'wow', x, y + 0.25, '뿅!', '#fff27a', 1, k);
      }
      ev(s, 'boing', x, y, a && a.b >= 2 ? `뿅뿅! ×${a.b}` : '뿅!', '#ffffff', a?.b ?? 1, k);
      if (a && a.b >= 2) see(s, 'combo');
      s.cheer = Math.max(s.cheer, 0.5);
    } else if (kind === 'land') {
      const n = W.landed;
      s.wowN++;
      s.cheer = 1;
      s.cheerT = s.t;
      s.slow = Math.max(s.slow, n >= 3 ? 14 : 8);
      if (a) s.pts += PTS_LAND + PTS_BOUNCE * a.b + PTS_HOOP * popc(a.hoops);
      ev(s, 'land', x, y, n >= 2 ? `인간 탑 ${n}층!` : '착지!', '#fff27a', n, k);
      if (n >= 3) see(s, 'tower3');
    } else if (kind === 'miss' || kind === 'wall') {
      s.ohT = s.t;
      ev(s, kind, x, y, kind === 'wall' ? '쿵!' : '푹!', '#ffd0c0', 0, k);
    } else if (kind === 'net') ev(s, 'net', x, 0.06, '출렁~ 안전망', '#e8f4ff', 0, k);
    else if (kind === 'break') ev(s, 'break', x, y, '펑! 찢어졌다', '#ffe2b0', 0, k);
    else if (kind === 'hoop') (ev(s, 'hoop', x, y, '불꽃 통과!', '#ffd23a', 0, k), see(s, 'hoopPass'));
    else if (kind === 'jump') ev(s, 'jump', x, y, '', '', 0, k);
  };
}

export const circustramp: GameDef<CircusState> & { wows(s: CircusState): number } = {
  id: 'circustramp',
  name: '🎪 트램펄린 서커스',
  genes: ['trampoline', 'catch'],
  twist: '트램펄린은 기울일 수 없고 놓을 자리만 고르는데, 튀는 방향은 들어온 각도·속도 그대로라서 — 바닥에서 받느냐 받침대 위에서 일찍 받느냐로 곡예사가 날아갈 곳이 바뀐다',
  rules: ['곡예사가 떨어질 곳을 톡 — 트램펄린이 놓여 뿅! 튀어 올라요.', '받는 높이에 따라 날아가는 곳이 달라져요. 깃발 발판에 착지시켜요.'],
  controls: 'touch',
  hint: '떨어질 곳을 톡! / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '빨강·하양 줄무늬 서커스 천막 안 — 동물 곡예사 트램펄린 공연',
    mood: '따뜻한 조명이 흔들리는 큰 천막. 높은 발판의 원숭이가 폴짝폴짝 준비하고, 톱밥 링 위로 느긋한 포물선을 그리며 뛰어내린다. 트램펄린에 뿅! 공중제비를 돌아 깃발 발판에 척 — 어깨 위로 인간 탑이 쌓이면 관중석의 동물들이 벌떡 일어나 손을 흔든다. 놓치면 톱밥에 푹 처박혀 다리만 버둥.',
    palette: { bg: '#3a1a3a', ink: '#fff6e8', muted: '#c9a8c0', accent: '#ffcf3a', hot: '#ff4a4a', soft: '#ffe8c8' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.L.seq.length - s.W.missed,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      seed, t: 0, stage: 0, phase: 'play', pt: 0, endT: -1, hearts: 3, stars: 0, got: 0, starOk: [], pts: 0, ok: false, why: '', won: false, dead: false, again: false, tries: 0,
      seen: new Set<string>(), events: [], banner: null, spot: null, wowN: 0, firstTap: -1, firstBoing: -1, down: false, ax: 0.5, ay: 0.5, slow: 0, magnet: true,
      fc: null, cheer: 0, cheerT: -99, ohT: -99, lastPlace: -99, hintX: 0.4, drops: [],
    } as unknown as CircusState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, press = !!p && !s.down;
    if (p) (s.ax = p.x), (s.ay = p.y);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.slow > 0) s.slow--;
    s.cheer = Math.max(0, s.cheer - 0.006);
    if (s.events.length > 80 || (s.events.length && s.t - s.events[0].t > 240)) s.events = s.events.filter((e) => s.t - e.t < 240);
    if (s.spot && s.t - s.spot.t > 200) s.spot = null;
    if (s.phase === 'result') {
      if (s.pt >= (s.ok ? 190 : 160) || (press && s.pt > 50)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    if (press) tapAt(s, p!.x, p!.y);
    // 큰 순간엔 잠깐 느려진다 (세계를 두 틱에 한 번만)
    if (!(s.slow > 0 && s.t % 2 === 0)) stepWorld(s.W, sinkOf(s));
    const W = s.W, L = s.L;
    if (s.endT < 0) {
      if (W.missed > L.seq.length - L.goal) s.endT = s.t + 70;
      else if (allDone(W)) s.endT = s.t + 50;
    }
    if (s.endT >= 0 && s.t >= s.endT) {
      if (W.landed >= L.goal) finish(s, true, '');
      else finish(s, false, W.stock <= 0 && W.trs.length === 0 ? '트램펄린이 모자라요!' : '너무 많이 떨어졌어요!');
    }
  },
  over: (s) => s.dead,
  score: (s) => Math.round(s.pts),
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
/** 놓을 자리를 누르는 입력 (바닥은 바닥 바로 위, 받침대는 꼭대기) */
const tapOf = (L: Level, p: Place): Input => {
  const wy = p.lv < 0 ? 0.03 : L.stands[p.lv].h + 0.04;
  return { tap: false, dir: 0, pointer: { x: p.x, y: (FLOOR - wy) / A } };
};
const brain = new WeakMap<object, { next: number; ver: number; stage: number }>();
function think(s: CircusState, pick: (W: World) => Place | null): Input {
  if (s.phase !== 'play' || s.down || s.endT >= 0) return NO;
  let m = brain.get(s);
  if (!m) brain.set(s, (m = { next: 0, ver: -1, stage: -1 }));
  if (m.stage !== s.stage || m.ver !== s.W.ver) (m.stage = s.stage), (m.ver = s.W.ver), (m.next = Math.min(m.next, s.t + 4));
  if (s.t < m.next) return NO;
  m.next = s.t + 30;
  const p = pick(s.W);
  if (!p) return NO;
  m.next = s.t + 8;
  return tapOf(s.L, p);
}
/** 잘하는 봇: 같은 물리로 길을 셈해 자리를 고른다 */
export const circustrampSmart: Bot<CircusState> = { name: '서커스 단장', act: (s) => think(s, (W) => smartPick(W, true)) };
/** 버릇 봇 1: 늘 떨어질 자리 바로 밑 바닥에 */
export const circustrampHabit: Bot<CircusState> = { name: '버릇: 떨어질 자리 바로 밑', act: (s) => think(s, habitPick) };
/** 버릇 봇 2: 늘 화면 가운데 바닥에 */
export const circustrampHabit2: Bot<CircusState> = {
  name: '버릇: 가운데 바닥',
  act: (s) =>
    think(s, (W) => {
      if (W.stock <= 0 || W.trs.some((t) => t.lv < 0 && Math.abs(t.x - 0.5) < BUSY)) return null;
      const f = forecast(W);
      return troubled(W, f).length ? { x: 0.5, lv: -1 } : null;
    }),
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 못하는 봇: 아무 때나 아무 데나 톡 */
export const circustrampRandom: Bot<CircusState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 40 + Math.floor(rng() * 120);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    m.p = rng() < 0.75 ? { x: 0.05 + rng() * 0.9, y: (FLOOR - rng() * 0.25) / A } : { x: rng(), y: 0.1 + rng() * 0.85 };
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const clamp01 = (q: number) => Math.max(0, Math.min(1, q));
const ease = (q: number) => 1 - Math.pow(1 - clamp01(q), 2.4);
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
}
function lin(ctx: C2, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
function starPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
function heart(ctx: C2, x: number, y: number, r: number, on: boolean) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.8, y - r * 1.2, x, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.8, y - r * 1.2, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
  ctx.fillStyle = on ? '#ff4a5a' : 'rgba(255,255,255,.18)';
  ctx.fill();
  if (on) {
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ell(ctx, x - r * 0.45, y - r * 0.35, r * 0.22, r * 0.15, -0.6);
    ctx.fill();
  }
}

/** 곡예사 옷·털 색 */
const FUR = ['#a8622e', '#8a5530', '#fbf6ee'], FUR_D = ['#7a4018', '#5e3418', '#e2d6c8'], FACE = ['#f6cf9e', '#e8c08a', '#ffeef0'];
const SUIT = [['#ff4a5a', '#ffcf3a'], ['#3a8aff', '#ffffff'], ['#ffcf3a', '#3ac08a']];
type Pose = 'stand' | 'prep' | 'fall' | 'tuck' | 'land' | 'plant' | 'climb' | 'splat' | 'net';
/**
 * 곡예사 (발 위치 x,y 기준, u = 몸 단위 px). ang = 몸 돌기(공중제비), dir = 보는 쪽.
 * 원숭이: 꼬리·둥근 귀 · 곰: 크고 둥근 귀·주둥이 · 토끼: 긴 귀
 */
function drawAcro(ctx: C2, k: Kind, x: number, y: number, u: number, pose: Pose, ang: number, dir: number, t: number, mood: number) {
  const sc = k === 1 ? 1.28 : 1;
  u *= sc;
  ctx.save();
  ctx.translate(x, y);
  const cy = -4.6 * u;
  ctx.translate(0, cy);
  ctx.rotate(ang);
  ctx.scale(dir, 1);
  if (pose === 'splat') ctx.scale(0.55, 1.15);
  const fur = FUR[k], furD = FUR_D[k], face = FACE[k], [s1, s2] = SUIT[k];
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const tuck = pose === 'tuck', up = pose === 'land' || pose === 'fall' || pose === 'net', wig = pose === 'plant' ? Math.sin(t * 0.6) : 0;
  // 꼬리 (원숭이)
  if (k === 0) {
    ctx.strokeStyle = furD;
    ctx.lineWidth = 1.1 * u;
    ctx.beginPath();
    ctx.moveTo(-1.6 * u, 2.2 * u);
    const tw = Math.sin(t * 0.12) * 0.8;
    ctx.bezierCurveTo(-4.5 * u, 3 * u, -5 * u, (-1 + tw) * u, -3.6 * u, -2.2 * u);
    ctx.stroke();
  }
  if (k === 2) {
    ctx.fillStyle = '#ffffff';
    ell(ctx, -2.1 * u, 2.4 * u, 1.2 * u, 1.2 * u);
    ctx.fill();
  }
  // 다리
  ctx.strokeStyle = fur;
  ctx.lineWidth = 1.5 * u;
  const legL = tuck ? [[-1, 2.6], [-2.4, 1.2], [-0.4, 0.6]] : pose === 'plant' ? [[-1, 2.6], [-1.6 + wig * 1.2, 5.4], [-2.6 + wig * 2, 6.6]] : [[-1, 2.6], [-1.2, 4.2], [-1.4, 4.7]];
  const legR = tuck ? [[1, 2.6], [2.4, 1.2], [3.2, 2.2]] : pose === 'plant' ? [[1, 2.6], [1.6 - wig * 1.2, 5.4], [2.6 - wig * 2, 6.6]] : pose === 'prep' ? [[1, 2.6], [1.4, 4.0], [1.6, 4.7]] : [[1, 2.6], [1.2, 4.2], [1.4, 4.7]];
  for (const lg of [legL, legR]) {
    ctx.beginPath();
    ctx.moveTo(lg[0][0] * u, lg[0][1] * u);
    ctx.lineTo(lg[1][0] * u, lg[1][1] * u);
    ctx.lineTo(lg[2][0] * u, lg[2][1] * u);
    ctx.stroke();
    ctx.fillStyle = furD;
    ell(ctx, (lg[2][0] + 0.4) * u, lg[2][1] * u, 1.0 * u, 0.6 * u);
    ctx.fill();
  }
  // 몸통 (곡예복)
  const bw = k === 1 ? 5.2 : 4.2, bh = k === 1 ? 6 : 5.4;
  ctx.fillStyle = lin(ctx, -bw * u * 0.5, 0, bw * u * 0.5, 0, [[0, s1], [1, shade(s1)]]);
  rr(ctx, -bw * 0.5 * u, -2.6 * u, bw * u, bh * u, 2 * u);
  ctx.fill();
  ctx.fillStyle = face;
  ell(ctx, 0.3 * u, 0.3 * u, bw * 0.26 * u, bh * 0.26 * u);
  ctx.fill();
  // 허리띠·별
  ctx.fillStyle = s2;
  ctx.fillRect(-bw * 0.5 * u, 1.5 * u, bw * u, 0.8 * u);
  starPath(ctx, -0.9 * u, -1.1 * u, 0.9 * u);
  ctx.fill();
  // 팔
  ctx.strokeStyle = fur;
  ctx.lineWidth = 1.4 * u;
  const armA = up ? [[-1.8, -1.8], [-2.8, -4.4], [-2.6, -6]] : tuck ? [[-1.8, -1.6], [-0.6, 0.6], [0.6, 1.2]] : pose === 'prep' ? [[-1.8, -1.8], [-3.2, -3.2 - Math.abs(Math.sin(t * 0.25)) * 1.5], [-3.4, -5]] : pose === 'climb' ? [[-1.8, -1.8], [-2.4, -4], [-1.6, -5.4]] : pose === 'plant' ? [[-1.8, -1.8], [-3.6, -2.6], [-4.4, -3.6 + wig]] : [[-1.8, -1.6], [-2.9, 0.2], [-2.9, 1.6]];
  const armB = up ? [[1.8, -1.8], [2.8, -4.4], [2.6, -6]] : tuck ? [[1.8, -1.6], [2.8, 0.4], [3.2, 1.8]] : pose === 'prep' ? [[1.8, -1.8], [3.2, -3.2 - Math.abs(Math.sin(t * 0.25 + 1)) * 1.5], [3.4, -5]] : pose === 'climb' ? [[1.8, -1.8], [2.4, -1], [2.2, 0.6]] : pose === 'plant' ? [[1.8, -1.8], [3.6, -2.6], [4.4, -3.6 - wig]] : [[1.8, -1.6], [2.9, 0.2], [2.9, 1.6]];
  for (const am of [armA, armB]) {
    ctx.beginPath();
    ctx.moveTo(am[0][0] * u, am[0][1] * u);
    ctx.lineTo(am[1][0] * u, am[1][1] * u);
    ctx.lineTo(am[2][0] * u, am[2][1] * u);
    ctx.stroke();
    ctx.fillStyle = face;
    ell(ctx, am[2][0] * u, am[2][1] * u, 0.85 * u, 0.85 * u);
    ctx.fill();
  }
  // 머리
  const hy = -5.2 * u, hr = (k === 1 ? 2.9 : 2.6) * u;
  // 귀
  if (k === 2) {
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.translate(sd * 1.1 * u, hy - 1.8 * u);
      ctx.rotate(sd * 0.18 + Math.sin(t * 0.1 + sd) * 0.08 + (pose === 'fall' ? sd * 0.3 : 0));
      ctx.fillStyle = fur;
      ell(ctx, 0, -2.4 * u, 0.95 * u, 2.6 * u);
      ctx.fill();
      ctx.fillStyle = '#ffb6c8';
      ell(ctx, 0, -2.2 * u, 0.45 * u, 1.9 * u);
      ctx.fill();
      ctx.restore();
    }
  } else {
    for (const sd of [-1, 1]) {
      const ex = k === 1 ? sd * 2.1 * u : sd * 2.6 * u, ey = k === 1 ? hy - 2.1 * u : hy - 0.2 * u;
      ctx.fillStyle = fur;
      ell(ctx, ex, ey, 1.25 * u, 1.25 * u);
      ctx.fill();
      ctx.fillStyle = k === 1 ? '#d8a878' : face;
      ell(ctx, ex, ey, 0.65 * u, 0.65 * u);
      ctx.fill();
    }
  }
  ctx.fillStyle = lin(ctx, 0, hy - hr, 0, hy + hr, [[0, fur], [1, furD]]);
  ell(ctx, 0, hy, hr, hr * 0.95);
  ctx.fill();
  // 얼굴판
  ctx.fillStyle = face;
  if (k === 0) {
    ell(ctx, 0.5 * u, hy + 0.5 * u, 1.9 * u, 1.6 * u);
    ctx.fill();
    ell(ctx, -0.4 * u, hy - 0.6 * u, 1.0 * u, 1.0 * u);
    ctx.fill();
    ell(ctx, 1.3 * u, hy - 0.6 * u, 1.0 * u, 1.0 * u);
    ctx.fill();
  } else if (k === 1) {
    ell(ctx, 0.6 * u, hy + 0.9 * u, 1.5 * u, 1.1 * u);
    ctx.fill();
    ctx.fillStyle = '#3a2010';
    ell(ctx, 0.9 * u, hy + 0.4 * u, 0.55 * u, 0.4 * u);
    ctx.fill();
  } else {
    ctx.fillStyle = '#ffb6c8';
    ell(ctx, 1.1 * u, hy + 0.5 * u, 0.4 * u, 0.3 * u);
    ctx.fill();
  }
  // 눈·입 (mood: 0 보통 · 1 신남 · 2 놀람 · 3 어질 · 4 우쭐)
  const eyeY = hy - 0.5 * u;
  ctx.fillStyle = '#2a140a';
  ctx.strokeStyle = '#2a140a';
  ctx.lineWidth = Math.max(1, 0.45 * u);
  for (const ex of [-0.3, 1.5]) {
    if (mood === 1 || mood === 4) {
      ctx.beginPath();
      ctx.arc(ex * u, eyeY + 0.3 * u, 0.55 * u, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    } else if (mood === 3) {
      ctx.beginPath();
      ctx.moveTo((ex - 0.5) * u, eyeY - 0.5 * u);
      ctx.lineTo((ex + 0.5) * u, eyeY + 0.5 * u);
      ctx.moveTo((ex + 0.5) * u, eyeY - 0.5 * u);
      ctx.lineTo((ex - 0.5) * u, eyeY + 0.5 * u);
      ctx.stroke();
    } else {
      const big = mood === 2 ? 0.75 : 0.55;
      ctx.fillStyle = '#ffffff';
      ell(ctx, ex * u, eyeY, big * u, big * 1.1 * u);
      ctx.fill();
      ctx.fillStyle = '#2a140a';
      ell(ctx, (ex + 0.15) * u, eyeY + 0.1 * u, big * 0.6 * u, big * 0.65 * u);
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,110,110,.45)';
  ell(ctx, -1.2 * u, hy + 0.5 * u, 0.55 * u, 0.35 * u);
  ctx.fill();
  ell(ctx, 2.3 * u, hy + 0.5 * u, 0.55 * u, 0.35 * u);
  ctx.fill();
  const my = hy + (k === 1 ? 1.5 : 1.2) * u;
  if (mood === 2) {
    ctx.fillStyle = '#7a1a10';
    ell(ctx, 0.7 * u, my, 0.5 * u, 0.7 * u);
    ctx.fill();
  } else if (mood === 1 || mood === 4) {
    ctx.fillStyle = '#7a1a10';
    ctx.beginPath();
    ctx.arc(0.7 * u, my - 0.2 * u, 0.9 * u, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0.7 * u, my - 0.4 * u, 0.6 * u, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }
  // 곰: 작은 모자
  if (k === 1) {
    ctx.fillStyle = '#3a8aff';
    ctx.beginPath();
    ctx.moveTo(-1.2 * u, hy - 2.4 * u);
    ctx.lineTo(0.4 * u, hy - 5 * u);
    ctx.lineTo(1.8 * u, hy - 2.4 * u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffcf3a';
    ell(ctx, 0.4 * u, hy - 5 * u, 0.6 * u, 0.6 * u);
    ctx.fill();
  }
  ctx.restore();
}
const shade = (hex: string) => {
  const n = parseInt(hex.slice(1), 16), f = 0.72;
  return `rgb(${Math.round(((n >> 16) & 255) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`;
};

/** 트램펄린 (매트 가운데 x, 매트 높이 y — 화면 px) */
function drawTramp(ctx: C2, x: number, y: number, rx: number, legH: number, uses: number, max: number, dip: number, t: number, glow: number) {
  const ry = rx * 0.26;
  // 그림자
  ctx.fillStyle = 'rgba(40,10,20,.28)';
  ell(ctx, x, y + legH + ry * 0.4, rx * 1.05, ry * 0.7);
  ctx.fill();
  // 다리
  ctx.strokeStyle = '#c8ccd8';
  ctx.lineWidth = Math.max(2, rx * 0.07);
  for (const sd of [-0.78, -0.3, 0.3, 0.78]) {
    ctx.beginPath();
    ctx.moveTo(x + rx * sd, y + ry * 0.5);
    ctx.lineTo(x + rx * sd * 1.06, y + legH + ry * 0.3);
    ctx.stroke();
  }
  // 테 (두꺼운 빨강 쿠션)
  ctx.fillStyle = '#b8283a';
  ell(ctx, x, y + ry * 0.35, rx, ry);
  ctx.fill();
  ctx.fillStyle = lin(ctx, x - rx, y, x + rx, y, [[0, '#ff6a6a'], [0.5, '#ff4a5a'], [1, '#d83040']]);
  ell(ctx, x, y, rx, ry);
  ctx.fill();
  // 노랑 줄무늬
  ctx.strokeStyle = '#ffd84a';
  ctx.lineWidth = Math.max(1.5, rx * 0.06);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU + 0.2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * rx * 0.86, y + Math.sin(a) * ry * 0.86);
    ctx.lineTo(x + Math.cos(a) * rx * 0.99, y + Math.sin(a) * ry * 0.99);
    ctx.stroke();
  }
  // 매트 (눌리면 가운데가 쑥)
  const mrx = rx * 0.78, mry = ry * 0.7;
  ctx.fillStyle = '#1e2a5a';
  ctx.beginPath();
  ctx.ellipse(x, y, mrx, mry, 0, Math.PI, TAU);
  ctx.quadraticCurveTo(x, y + mry + dip * 2, x - mrx, y);
  ctx.fill();
  ctx.fillStyle = lin(ctx, x, y - mry, x, y + mry + dip, [[0, '#3a5ac8'], [1, '#22357a']]);
  ctx.beginPath();
  ctx.ellipse(x, y + dip * 0.3, mrx * 0.96, mry * 0.9, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ell(ctx, x - mrx * 0.3, y - mry * 0.25 + dip * 0.3, mrx * 0.35, mry * 0.22);
  ctx.fill();
  if (glow > 0) {
    ctx.strokeStyle = `rgba(255,240,150,${glow})`;
    ctx.lineWidth = 3;
    ell(ctx, x, y, rx * 1.15, ry * 1.3);
    ctx.stroke();
  }
  // 남은 횟수 (앞쪽 테의 동그라미)
  for (let k = 0; k < max; k++) {
    const px = x + (k - (max - 1) / 2) * rx * 0.3, py = y + ry * 0.95;
    ctx.fillStyle = k < uses ? '#ffe066' : 'rgba(60,10,20,.55)';
    ell(ctx, px, py, rx * 0.085, rx * 0.085);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,20,10,.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  void t;
}

function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.scale(1 - press * 0.1, 1 - press * 0.1);
  ctx.fillStyle = 'rgba(40,10,20,.3)';
  ell(ctx, k * 0.1, k * 1.25, k * 0.5, k * 0.16);
  ctx.fill();
  ctx.fillStyle = '#fff3e6';
  ctx.strokeStyle = '#7a3a2a';
  ctx.lineWidth = Math.max(1.5, k * 0.07);
  rr(ctx, -k * 0.16, -k * 0.95, k * 0.32, k * 0.95, k * 0.16);
  ctx.fill();
  ctx.stroke();
  rr(ctx, -k * 0.45, -k * 0.15, k * 0.95, k * 0.95, k * 0.3);
  ctx.fill();
  ctx.stroke();
  for (let q = 0; q < 2; q++) {
    rr(ctx, k * (0.12 + q * 0.2) - k * 0.1, -k * 0.35, k * 0.22, k * 0.4, k * 0.1);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** 단장 펭귄: 평소엔 지휘봉 빙글, 착지하면 폴짝 모자 들기, 놓치면 머리 감싸기 */
function drawMaster(ctx: C2, x: number, y: number, u: number, mode: number, t: number) {
  const hop = mode === 1 ? Math.abs(Math.sin(t * 0.25)) * 2.2 * u : 0;
  ctx.save();
  ctx.translate(x, y - hop);
  ctx.fillStyle = 'rgba(40,10,20,.3)';
  ell(ctx, 0, hop, 4 * u, 1 * u);
  ctx.fill();
  // 발
  ctx.fillStyle = '#ff9a2a';
  ell(ctx, -1.4 * u, -0.3 * u, 1.3 * u, 0.6 * u);
  ctx.fill();
  ell(ctx, 1.4 * u, -0.3 * u, 1.3 * u, 0.6 * u);
  ctx.fill();
  // 연미복 꼬리
  ctx.fillStyle = '#c8283a';
  ctx.beginPath();
  ctx.moveTo(-2.6 * u, -5 * u);
  ctx.lineTo(-3.6 * u, -0.6 * u);
  ctx.lineTo(-1.2 * u, -2.5 * u);
  ctx.closePath();
  ctx.fill();
  // 몸
  ctx.fillStyle = '#22222e';
  ell(ctx, 0, -4.6 * u, 3 * u, 4.4 * u);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ell(ctx, 0.3 * u, -3.8 * u, 2 * u, 3.2 * u);
  ctx.fill();
  ctx.fillStyle = '#c8283a';
  rr(ctx, -3 * u, -6.6 * u, 1.6 * u, 4.5 * u, 0.6 * u);
  ctx.fill();
  rr(ctx, 1.6 * u, -6.6 * u, 1.4 * u, 4.5 * u, 0.6 * u);
  ctx.fill();
  ctx.fillStyle = '#ffcf3a';
  for (let k = 0; k < 2; k++) (ell(ctx, 0.3 * u, (-5.2 + k * 1.4) * u, 0.3 * u, 0.3 * u), ctx.fill());
  // 나비넥타이
  ctx.fillStyle = '#ffcf3a';
  ctx.beginPath();
  ctx.moveTo(0.3 * u, -7.2 * u);
  ctx.lineTo(-0.9 * u, -7.8 * u);
  ctx.lineTo(-0.9 * u, -6.6 * u);
  ctx.closePath();
  ctx.moveTo(0.3 * u, -7.2 * u);
  ctx.lineTo(1.5 * u, -7.8 * u);
  ctx.lineTo(1.5 * u, -6.6 * u);
  ctx.closePath();
  ctx.fill();
  // 머리
  ctx.fillStyle = '#22222e';
  ell(ctx, 0, -9.4 * u, 2.4 * u, 2.3 * u);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ell(ctx, -0.8 * u, -9.6 * u, 0.7 * u, 0.8 * u);
  ctx.fill();
  ell(ctx, 0.9 * u, -9.6 * u, 0.7 * u, 0.8 * u);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  if (mode === 1) {
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = Math.max(1, 0.35 * u);
    for (const ex of [-0.8, 0.9]) (ctx.beginPath(), ctx.arc(ex * u, -9.4 * u, 0.45 * u, 1.1 * Math.PI, 1.9 * Math.PI), ctx.stroke());
  } else {
    ell(ctx, -0.7 * u, -9.5 * u, 0.35 * u, 0.4 * u);
    ctx.fill();
    ell(ctx, 1.0 * u, -9.5 * u, 0.35 * u, 0.4 * u);
    ctx.fill();
  }
  ctx.fillStyle = '#ff9a2a';
  ctx.beginPath();
  ctx.moveTo(-0.6 * u, -8.6 * u);
  ctx.lineTo(0.6 * u, -8.6 * u);
  ctx.lineTo(0, mode === 2 ? -7.4 * u : -7.9 * u);
  ctx.closePath();
  ctx.fill();
  // 모자 (착지하면 들어 올림)
  const lift = mode === 1 ? 1.6 * u : 0;
  ctx.fillStyle = '#1a1a24';
  rr(ctx, -2.6 * u, -11.6 * u - lift, 5.2 * u, 0.7 * u, 0.3 * u);
  ctx.fill();
  rr(ctx, -1.7 * u, -15 * u - lift, 3.4 * u, 3.6 * u, 0.4 * u);
  ctx.fill();
  ctx.fillStyle = '#c8283a';
  ctx.fillRect(-1.7 * u, -12.4 * u - lift, 3.4 * u, 0.8 * u);
  // 날개 + 지휘봉
  ctx.strokeStyle = '#22222e';
  ctx.lineWidth = 1.3 * u;
  ctx.lineCap = 'round';
  if (mode === 2) {
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.moveTo(sd * 2.6 * u, -6 * u), ctx.lineTo(sd * 2.4 * u, -10.4 * u), ctx.stroke());
  } else {
    ctx.beginPath();
    ctx.moveTo(-2.6 * u, -6 * u);
    ctx.lineTo(-3.6 * u, mode === 1 ? -10 * u : -3.4 * u);
    ctx.stroke();
    const ba = mode === 1 ? -1.2 : -0.5 + Math.sin(t * 0.12) * 0.6;
    ctx.beginPath();
    ctx.moveTo(2.6 * u, -6 * u);
    const hx = 4 * u, hy = -6.5 * u;
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.6 * u;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + Math.cos(ba) * 4 * u, hy + Math.sin(ba) * 4 * u);
    ctx.stroke();
    ctx.fillStyle = '#ffcf3a';
    ell(ctx, hx + Math.cos(ba) * 4 * u, hy + Math.sin(ba) * 4 * u, 0.6 * u, 0.6 * u);
    ctx.fill();
  }
  ctx.restore();
}

/** 관중 하나 (동물 머리 + 어깨) */
function drawFan(ctx: C2, x: number, y: number, r: number, kind: number, col: string, cheer: number, oh: number, t: number, ph: number) {
  const jump = cheer > 0 ? Math.abs(Math.sin(t * 0.22 + ph)) * r * 0.9 * cheer : Math.sin(t * 0.05 + ph) * r * 0.08;
  y -= jump;
  // 어깨
  ctx.fillStyle = col;
  rr(ctx, x - r * 1.05, y + r * 0.55, r * 2.1, r * 1.6, r * 0.7);
  ctx.fill();
  // 손 (환호·놀람)
  const furC = ['#f0c890', '#9a6a3a', '#ffffff', '#ffb0b8', '#d0d0d8', '#ffd060'][kind];
  ctx.fillStyle = furC;
  if (cheer > 0.25) {
    for (const sd of [-1, 1]) {
      ell(ctx, x + sd * r * 1.15, y - r * 0.4 - Math.sin(t * 0.4 + ph + sd) * r * 0.3, r * 0.32, r * 0.32);
      ctx.fill();
    }
  } else if (oh > 0) {
    for (const sd of [-1, 1]) (ell(ctx, x + sd * r * 0.75, y + r * 0.35, r * 0.3, r * 0.3), ctx.fill());
  }
  // 귀
  if (kind === 2) for (const sd of [-1, 1]) (ell(ctx, x + sd * r * 0.4, y - r * 1.2, r * 0.25, r * 0.65, sd * 0.2), ctx.fill());
  else if (kind === 0 || kind === 5) {
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sd * r * 0.85, y - r * 0.2);
      ctx.lineTo(x + sd * r * 0.65, y - r * 1.1);
      ctx.lineTo(x + sd * r * 0.2, y - r * 0.7);
      ctx.fill();
    }
  } else for (const sd of [-1, 1]) (ell(ctx, x + sd * r * 0.72, y - r * 0.7, r * 0.33, r * 0.33), ctx.fill());
  ell(ctx, x, y, r, r * 0.92);
  ctx.fill();
  // 얼굴
  ctx.fillStyle = '#2a1a10';
  for (const sd of [-1, 1]) (ell(ctx, x + sd * r * 0.35, y - r * 0.1, r * 0.12, r * (cheer > 0.25 ? 0.06 : 0.14)), ctx.fill());
  if (kind === 3) {
    ctx.fillStyle = '#ff8a9a';
    ell(ctx, x, y + r * 0.3, r * 0.32, r * 0.22);
    ctx.fill();
  }
  ctx.fillStyle = '#7a1a10';
  if (oh > 0 || cheer > 0.25) (ell(ctx, x, y + r * 0.42, r * 0.18, r * (oh > 0 ? 0.24 : 0.16)), ctx.fill());
}

function drawAll(ctx: C2, s: CircusState, w: number, h: number, _th: Theme) {
  const fx = juice(s), t = s.t, L = s.L, W = s.W;
  const X = (x: number) => x * w, Y = (y: number) => (FLOOR - y) * w, R = (r: number) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const f = s.phase === 'play' ? foreOf(s) : null;
  ctx.save();
  fx.begin(ctx);
  // ═════════ 천막 (줄무늬가 꼭대기로 모인다) ═════════
  ctx.fillStyle = '#3a1028';
  ctx.fillRect(-12, -12, w + 24, h + 24);
  {
    const px = X(0.5), py = -R(0.16), by = Y(0.5);
    const n = 16;
    for (let k = 0; k < n; k++) {
      const x0 = X(-0.55 + (k * 2.1) / n), x1 = X(-0.55 + ((k + 1) * 2.1) / n);
      ctx.fillStyle = k % 2 ? '#f4e2c4' : '#d8323e';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(x0, by);
      ctx.lineTo(x1, by);
      ctx.closePath();
      ctx.fill();
    }
    // 천의 주름 그늘
    const g = ctx.createRadialGradient(px, R(0.25), R(0.1), px, R(0.45), R(0.95));
    g.addColorStop(0, 'rgba(255,220,160,.12)');
    g.addColorStop(0.6, 'rgba(60,10,30,.18)');
    g.addColorStop(1, 'rgba(40,5,20,.62)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, by);
    // 밧줄
    ctx.strokeStyle = 'rgba(90,40,20,.45)';
    ctx.lineWidth = 1.5;
    for (const q of [0.12, 0.88]) {
      ctx.beginPath();
      ctx.moveTo(px, py + R(0.06));
      ctx.lineTo(X(q), Y(0.55));
      ctx.stroke();
    }
    // 꼬마전구 줄
    for (let row = 0; row < 2; row++) {
      const yy = R(0.2 + row * 0.13), sag = R(0.05);
      ctx.strokeStyle = 'rgba(60,30,20,.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let q = 0; q <= 20; q++) {
        const xx = (q / 20) * w, yq = yy + Math.sin((q / 20) * Math.PI) * sag + Math.sin(t * 0.03 + row) * 1.5;
        if (q) ctx.lineTo(xx, yq);
        else ctx.moveTo(xx, yq);
      }
      ctx.stroke();
      for (let q = 1; q < 20; q += 2) {
        const xx = (q / 20) * w, yq = yy + Math.sin((q / 20) * Math.PI) * sag + Math.sin(t * 0.03 + row) * 1.5 + R(0.008);
        const on = (Math.floor(t / 20) + q + row) % 3 !== 0;
        const c = ['#ffe066', '#ff8a6a', '#8ad8ff'][(q + row) % 3];
        ctx.fillStyle = on ? c : 'rgba(255,255,255,.25)';
        ell(ctx, xx, yq, R(0.007), R(0.009));
        ctx.fill();
        if (on) {
          ctx.fillStyle = 'rgba(255,240,180,.18)';
          ell(ctx, xx, yq, R(0.02), R(0.02));
          ctx.fill();
        }
      }
    }
    // 깃발 장식 줄 (위쪽)
    ctx.strokeStyle = 'rgba(80,30,20,.55)';
    ctx.beginPath();
    ctx.moveTo(0, R(0.105));
    ctx.quadraticCurveTo(w / 2, R(0.16), w, R(0.105));
    ctx.stroke();
    for (let q = 0; q < 12; q++) {
      const a = (q + 0.5) / 12, xx = a * w, yy = R(0.105) + (1 - Math.pow(2 * a - 1, 2)) * R(0.027) + 1;
      ctx.fillStyle = ['#ffcf3a', '#3a8aff', '#3ac08a', '#ff6a8a'][q % 4];
      ctx.beginPath();
      ctx.moveTo(xx - R(0.022), yy);
      ctx.lineTo(xx + R(0.022), yy);
      ctx.lineTo(xx + Math.sin(t * 0.05 + q) * R(0.004), yy + R(0.04));
      ctx.closePath();
      ctx.fill();
    }
  }
  // ═════════ 관중석 (계단 셋, 동물 관중) ═════════
  {
    const rows = [
      { y: 0.47, r: 0.026, n: 13 },
      { y: 0.36, r: 0.03, n: 11 },
      { y: 0.25, r: 0.034, n: 10 },
    ];
    ctx.fillStyle = '#2a0c1e';
    ctx.fillRect(0, Y(0.56), w, Y(0.12) - Y(0.56));
    const cheer = t - s.cheerT < 110 ? s.cheer : s.cheer * 0.4, oh = t - s.ohT < 70 ? 1 : 0;
    rows.forEach((row, ri) => {
      ctx.fillStyle = ri % 2 ? '#5a1a2e' : '#4a1428';
      ctx.fillRect(0, Y(row.y + 0.045), w, Y(row.y - 0.07) - Y(row.y + 0.045));
      for (let j = 0; j < row.n; j++) {
        const xx = ((j + 0.5 + (ri % 2) * 0.4) / row.n) * w, seed = ri * 31 + j;
        const kind = Math.floor(hsh(seed) * 6), col = ['#ff6a6a', '#5a9aff', '#ffcf3a', '#6ad08a', '#c08aff', '#ff9a4a'][Math.floor(hsh(seed + 7) * 6)];
        const near = 1 - Math.min(1, Math.abs(xx / w - (s.events.length ? s.events[s.events.length - 1].x : 0.5)) * 1.2);
        drawFan(ctx, xx, Y(row.y), R(row.r), kind, col, cheer * (0.6 + 0.4 * near), oh, t, seed);
      }
      // 의자 앞판
      ctx.fillStyle = lin(ctx, 0, Y(row.y - 0.035), 0, Y(row.y - 0.075), [[0, '#c8283a'], [1, '#8a1a2a']]);
      ctx.fillRect(0, Y(row.y - 0.035), w, Y(row.y - 0.075) - Y(row.y - 0.035));
      ctx.fillStyle = '#ffcf3a';
      ctx.fillRect(0, Y(row.y - 0.035), w, 2);
    });
    ctx.fillStyle = lin(ctx, 0, Y(0.56), 0, Y(0.12), [[0, 'rgba(30,0,20,.42)'], [1, 'rgba(30,0,20,.12)']]);
    ctx.fillRect(0, Y(0.56), w, Y(0.12) - Y(0.56));
    // 조명 (천막 꼭대기에서 흔들리는 두 줄기)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const sd of [-1, 1]) {
      const sx = X(0.5 + sd * 0.36), sy = R(0.02), tx = X(0.5 + sd * 0.12 + Math.sin(t * 0.008 + sd * 2) * 0.3), ty = Y(0.02);
      const g = ctx.createLinearGradient(sx, sy, tx, ty);
      g.addColorStop(0, 'rgba(255,240,190,.22)');
      g.addColorStop(1, 'rgba(255,230,160,.06)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(sx - R(0.015), sy);
      ctx.lineTo(sx + R(0.015), sy);
      ctx.lineTo(tx + R(0.16), ty);
      ctx.lineTo(tx - R(0.16), ty);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,240,190,.12)';
      ell(ctx, tx, ty, R(0.17), R(0.04));
      ctx.fill();
    }
    ctx.restore();
  }
  // ═════════ 링 바닥 (톱밥) ═════════
  {
    const top = Y(0.12), bot = Y(-0.085);
    ctx.fillStyle = '#b8282e';
    rr(ctx, -4, top - R(0.035), w + 8, R(0.05), R(0.01));
    ctx.fill();
    ctx.fillStyle = '#ffcf3a';
    for (let q = 0; q < 9; q++) {
      starPath(ctx, X(0.06 + q * 0.11), top - R(0.012), R(0.011));
      ctx.fill();
    }
    ctx.fillStyle = lin(ctx, 0, top, 0, bot, [[0, '#d89a58'], [0.4, '#eab878'], [1, '#f2c88a']]);
    ctx.fillRect(0, top + R(0.01), w, bot - top);
    ctx.fillStyle = 'rgba(120,60,20,.22)';
    for (let k = 0; k < 70; k++) {
      const xx = hsh(k + 300) * w, yy = top + R(0.02) + hsh(k + 301) * (bot - top - R(0.03));
      ell(ctx, xx, yy, R(0.004 + hsh(k) * 0.004), R(0.002));
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,240,200,.35)';
    for (let k = 0; k < 40; k++) {
      const xx = hsh(k + 500) * w, yy = top + R(0.02) + hsh(k + 501) * (bot - top - R(0.03));
      ell(ctx, xx, yy, R(0.003), R(0.0018));
      ctx.fill();
    }
    // 링 무늬 (원)
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = 2;
    ell(ctx, X(0.5), Y(0.02), R(0.42), R(0.06));
    ctx.stroke();
  }
  // ═════════ 받침대 ═════════
  L.stands.forEach((st, i) => {
    const x = X(st.x), top = Y(st.h), rx = R(0.058), ry = R(0.016);
    ctx.fillStyle = 'rgba(40,10,20,.3)';
    ell(ctx, x, Y(0) + R(0.006), rx * 1.2, ry * 1.1);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - rx, top, rx * 2, Y(0) - top);
    ctx.clip();
    ctx.fillStyle = lin(ctx, x - rx, 0, x + rx, 0, [[0, '#2a7ac8'], [0.5, '#4aa0f0'], [1, '#1a5a9a']]);
    ctx.fillRect(x - rx, top, rx * 2, Y(0) - top);
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = R(0.012);
    for (let q = -6; q < 16; q++) {
      ctx.beginPath();
      ctx.moveTo(x - rx, top + q * R(0.035));
      ctx.lineTo(x + rx, top + q * R(0.035) - R(0.05));
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#ffcf3a';
    ctx.fillRect(x - rx, Y(0) - R(0.014), rx * 2, R(0.014));
    ctx.fillStyle = lin(ctx, x - rx, top, x + rx, top, [[0, '#ffe066'], [1, '#e8a81a']]);
    ell(ctx, x, top + ry * 0.5, rx * 1.05, ry * 1.1);
    ctx.fill();
    ctx.fillStyle = '#ff5a6a';
    ell(ctx, x, top, rx, ry);
    ctx.fill();
    ctx.fillStyle = '#ffcf3a';
    starPath(ctx, x, top, R(0.012));
    ctx.fill();
    // 받을 수 있는 받침대는 반짝 (다음 곡예사가 위를 지나갈 때)
    if (f && !W.trs.some((tr) => tr.lv === i) && s.phase === 'play') {
      let over = false;
      for (const a of W.acs) {
        const p = f.paths.get(a.id);
        if (!p || p.end === FLAG || !p.pts.length) continue;
        for (let j = 2; j < p.pts.length; j += 2) if (p.pts[j + 1] < p.pts[j - 1] && p.pts[j - 1] >= st.h + MAT && p.pts[j + 1] < st.h + MAT && Math.abs(p.pts[j] - st.x) <= SCATCH) over = true;
      }
      if (over) {
        const pu = 0.5 + 0.5 * Math.sin(t * 0.18);
        ctx.strokeStyle = `rgba(255,245,160,${0.45 + 0.4 * pu})`;
        ctx.lineWidth = 3;
        ell(ctx, x, top, rx * (1.25 + pu * 0.15), ry * (1.6 + pu * 0.2));
        ctx.stroke();
      }
    }
  });
  // ═════════ 출발 발판 (기둥·사다리) ═════════
  L.plats.forEach((P) => {
    const x0 = X(P.dir > 0 ? P.x - 0.135 : P.x), x1 = X(P.dir > 0 ? P.x : P.x + 0.135), top = Y(P.h), cx = (x0 + x1) / 2;
    ctx.fillStyle = lin(ctx, cx - R(0.012), 0, cx + R(0.012), 0, [[0, '#e8ecf4'], [1, '#8a92a8']]);
    ctx.fillRect(cx - R(0.012), top, R(0.024), Y(0) - top);
    // 사다리
    const lx = P.dir > 0 ? x0 + R(0.012) : x1 - R(0.012);
    ctx.strokeStyle = '#c8945a';
    ctx.lineWidth = 2;
    for (const o of [-R(0.014), R(0.014)]) {
      ctx.beginPath();
      ctx.moveTo(lx + o, top);
      ctx.lineTo(lx + o, Y(0));
      ctx.stroke();
    }
    for (let yy = top + R(0.03); yy < Y(0); yy += R(0.035)) {
      ctx.beginPath();
      ctx.moveTo(lx - R(0.014), yy);
      ctx.lineTo(lx + R(0.014), yy);
      ctx.stroke();
    }
    // 발판 (빨강 북 모양)
    ctx.fillStyle = lin(ctx, 0, top, 0, top + R(0.05), [[0, '#ff4a5a'], [1, '#a81a2a']]);
    rr(ctx, x0, top, x1 - x0, R(0.045), R(0.008));
    ctx.fill();
    ctx.fillStyle = '#ffcf3a';
    ctx.fillRect(x0, top + R(0.036), x1 - x0, R(0.007));
    for (let q = 0; q < 3; q++) (starPath(ctx, x0 + (x1 - x0) * (0.2 + q * 0.3), top + R(0.02), R(0.009)), ctx.fill());
    ctx.fillStyle = '#ffe8c8';
    ell(ctx, cx, top, (x1 - x0) / 2, R(0.012));
    ctx.fill();
  });
  // ═════════ 선풍기 ═════════
  for (const fn of L.fans) {
    const cy = Y(Math.min(fn.y1 - 0.06, 0.2)), r = R(0.08);
    ctx.fillStyle = lin(ctx, X(fn.x0), 0, X(fn.x1), 0, [[0, 'rgba(170,230,255,.22)'], [1, 'rgba(170,230,255,0)']]);
    ctx.fillRect(X(fn.x0), Y(fn.y1), X(fn.x1) - X(fn.x0), Y(fn.y0) - Y(fn.y1));
    ctx.strokeStyle = 'rgba(240,252,255,.85)';
    ctx.lineWidth = 2.5;
    for (let k = 0; k < 12; k++) {
      const q = (t * 0.012 + hsh(k + 40)) % 1, yy = Y(fn.y0 + 0.03 + hsh(k + 41) * (fn.y1 - fn.y0 - 0.05)), xx = X(fn.x0 + 0.06 + q * (fn.x1 - fn.x0 - 0.06));
      ctx.globalAlpha = Math.sin(q * Math.PI) * 0.8;
      ctx.beginPath();
      ctx.moveTo(xx - R(0.05), yy);
      ctx.quadraticCurveTo(xx, yy - R(0.008), xx + R(0.04), yy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#7a8aa0';
    ctx.fillRect(X(0.015), cy, R(0.02), Y(0) - cy);
    ctx.fillStyle = lin(ctx, 0, cy - r, 0, cy + r, [[0, '#9ad8ff'], [1, '#3a7ac8']]);
    ell(ctx, X(0.04), cy, r * 0.55, r);
    ctx.fill();
    ctx.save();
    ctx.translate(X(0.045), cy);
    ctx.scale(0.5, 1);
    ctx.rotate(t * 0.45);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let k = 0; k < 3; k++) {
      ctx.rotate(TAU / 3);
      ell(ctx, r * 0.45, 0, r * 0.45, r * 0.18);
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = '#2a4a7a';
    ctx.lineWidth = 2;
    ell(ctx, X(0.04), cy, r * 0.55, r);
    ctx.stroke();
  }
  // ═════════ 깃발 발판 ═════════
  L.flags.forEach((fl, i) => {
    const x = X(fl.x), top = Y(fl.h), rx = R(FW / 2), ry = R(0.02);
    ctx.fillStyle = lin(ctx, x - R(0.01), 0, x + R(0.01), 0, [[0, '#ffe8a0'], [1, '#c89a3a']]);
    ctx.fillRect(x - R(0.01), top, R(0.02), Y(0) - top);
    ctx.fillStyle = 'rgba(40,10,20,.3)';
    ell(ctx, x, Y(0) + R(0.006), R(0.04), R(0.01));
    ctx.fill();
    ctx.fillStyle = '#1a6a7a';
    ell(ctx, x, top + ry * 0.7, rx, ry);
    ctx.fill();
    ctx.fillStyle = lin(ctx, x - rx, 0, x + rx, 0, [[0, '#4ad8c8'], [1, '#2a9aa8']]);
    ell(ctx, x, top, rx, ry);
    ctx.fill();
    ctx.strokeStyle = '#ffcf3a';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 깃대 + 펄럭이는 깃발
    const mx = x + rx * 0.82, my = top - R(0.085);
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mx, top);
    ctx.lineTo(mx, my);
    ctx.stroke();
    ctx.fillStyle = i === 0 ? '#ffcf3a' : '#ff6a8a';
    ctx.beginPath();
    ctx.moveTo(mx, my);
    for (let q = 0; q <= 6; q++) ctx.lineTo(mx - R(0.006) * q * (P_FLAG_DIR(L, i)), my + Math.sin(t * 0.15 + q * 0.7) * R(0.004));
    ctx.lineTo(mx - R(0.06) * P_FLAG_DIR(L, i), my + R(0.014));
    for (let q = 6; q >= 0; q--) ctx.lineTo(mx - R(0.006) * q * P_FLAG_DIR(L, i), my + R(0.028) + Math.sin(t * 0.15 + q * 0.7) * R(0.004));
    ctx.closePath();
    ctx.fill();
  });
  // ═════════ 불꽃 고리 (뒤쪽 반) ═════════
  const hoopDraw = (front: boolean) => {
    for (const hp of L.hoops) {
      const x = X(hp.x), y = Y(hp.y), ry = R(hp.r), rx = ry * 0.5;
      if (!front) {
        const g = ctx.createRadialGradient(x, y, ry * 0.4, x, y, ry * 1.9);
        g.addColorStop(0, 'rgba(255,170,60,.0)');
        g.addColorStop(0.5, `rgba(255,150,40,${0.22 + 0.06 * Math.sin(t * 0.3)})`);
        g.addColorStop(1, 'rgba(255,120,30,0)');
        ctx.fillStyle = g;
        ell(ctx, x, y, ry * 1.9, ry * 1.9);
        ctx.fill();
      }
      if (!front) {
        ctx.strokeStyle = 'rgba(120,90,60,.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y - ry);
        ctx.lineTo(x, R(0.09));
        ctx.stroke();
      }
      ctx.strokeStyle = '#ffb84a';
      ctx.lineWidth = R(0.014);
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, front ? -Math.PI / 2 : Math.PI / 2, front ? Math.PI / 2 : (Math.PI * 3) / 2);
      ctx.stroke();
      // 불꽃
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * TAU, side = Math.cos(a) > 0;
        if (side !== front) continue;
        const fx2 = x + Math.cos(a) * rx, fy2 = y + Math.sin(a) * ry, fl = 0.7 + 0.3 * Math.sin(t * 0.5 + k * 1.7);
        for (const [c, sz] of [['#ff6a1a', 1], ['#ffd23a', 0.55]] as [string, number][]) {
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.moveTo(fx2 - R(0.012) * sz, fy2);
          ctx.quadraticCurveTo(fx2 + Math.cos(a) * R(0.02), fy2 - R(0.05) * fl * sz, fx2 + R(0.012) * sz, fy2);
          ctx.fill();
        }
      }
    }
  };
  hoopDraw(false);
  // ═════════ 안전망 (1판) ═════════
  if (L.net) {
    const y0 = Y(0.035);
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1;
    const sag = (x: number) => {
      let d = 0;
      for (const a of W.acs) if (a.st === NET && W.t - a.t < 30) d += Math.max(0, 1 - Math.abs(x - a.x) / 0.15) * Math.sin(((W.t - a.t) / 30) * Math.PI) * 0.03;
      return Y(0.035 - d);
    };
    ctx.beginPath();
    for (let q = 0; q <= 40; q++) {
      const xx = 0.02 + (q / 40) * 0.96;
      if (q) ctx.lineTo(X(xx), sag(xx));
      else ctx.moveTo(X(xx), sag(xx));
    }
    ctx.stroke();
    for (let q = 0; q <= 40; q += 2) {
      const xx = 0.02 + (q / 40) * 0.96;
      ctx.beginPath();
      ctx.moveTo(X(xx), sag(xx));
      ctx.lineTo(X(xx + 0.024), Y(0) + R(0.004));
      ctx.moveTo(X(xx + 0.048), sag(xx + 0.048));
      ctx.lineTo(X(xx + 0.024), Y(0) + R(0.004));
      ctx.stroke();
    }
    void y0;
  }
  // ═════════ 미리 보기 (점선 길) ═════════
  let target: { x: number; y: number } | null = null;
  if (f) {
    let firstMissT = 1e9;
    for (const a of W.acs) {
      const p = f.paths.get(a.id);
      if (!p || !p.pts.length) continue;
      const shown = a.st === AIR || (a.st === WAIT && a.jumpAt - W.t < PREP + 30) || (s.stage === 0 && a.st === WAIT && isFirstWait(W, a));
      if (!shown) continue;
      const i0 = Math.max(0, Math.floor((W.t - p.s0) / 2)) * 2;
      const good = p.end === FLAG;
      // 흐린 길 + 흘러가는 굵은 점
      ctx.strokeStyle = good ? 'rgba(255,236,140,.35)' : 'rgba(255,255,255,.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let j = i0; j < p.pts.length; j += 2) (j === i0 ? ctx.moveTo(X(p.pts[j]), Y(p.pts[j + 1])) : ctx.lineTo(X(p.pts[j]), Y(p.pts[j + 1])));
      ctx.stroke();
      for (let j = i0; j < p.pts.length; j += 2) {
        if (((j >> 1) + Math.floor(t / 3)) % 4 !== 0) continue;
        ctx.fillStyle = 'rgba(60,10,30,.55)';
        ell(ctx, X(p.pts[j]), Y(p.pts[j + 1]) + 1, 3.6, 3.6);
        ctx.fill();
        ctx.fillStyle = good ? '#ffe680' : '#ffffff';
        ell(ctx, X(p.pts[j]), Y(p.pts[j + 1]), 2.9, 2.9);
        ctx.fill();
      }
      // 끝: 깃발이면 반짝 별, 바닥이면 그림자 + ✕
      if (good) {
        ctx.fillStyle = 'rgba(255,230,90,.95)';
        starPath(ctx, X(p.ex), Y(p.ey) - R(0.03), R(0.016) * (1 + 0.15 * Math.sin(t * 0.2)));
        ctx.fill();
      } else if (p.end === MISS || p.end === NET) {
        const ex = X(p.ex), ey = p.ey < 0.02 ? Y(0) : Y(p.ey);
        ctx.fillStyle = 'rgba(60,10,30,.35)';
        ell(ctx, ex, ey, R(0.04), R(0.011));
        ctx.fill();
        ctx.strokeStyle = p.end === NET ? 'rgba(160,220,255,.9)' : 'rgba(255,90,90,.95)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ex - R(0.013), ey - R(0.013));
        ctx.lineTo(ex + R(0.013), ey + R(0.013));
        ctx.moveTo(ex + R(0.013), ey - R(0.013));
        ctx.lineTo(ex - R(0.013), ey + R(0.013));
        ctx.stroke();
        if (p.ey < 0.02 && p.t1 < firstMissT) (firstMissT = p.t1), (target = { x: p.ex, y: 0 });
      }
    }
  }
  // 톡 할 자리 (가장 먼저 떨어질 곳) — 둥근 빛
  if (target && s.phase === 'play') {
    const pu = 0.5 + 0.5 * Math.sin(t * 0.16);
    ctx.strokeStyle = `rgba(255,240,150,${0.5 + 0.4 * pu})`;
    ctx.lineWidth = 3;
    ell(ctx, X(target.x), Y(0) + R(0.004), R(0.07 + 0.01 * pu), R(0.02 + 0.003 * pu));
    ctx.stroke();
  }
  // ═════════ 트램펄린 ═════════
  for (const tr of W.trs) {
    const base = tr.lv < 0 ? 0 : L.stands[tr.lv].h, age = W.t - tr.hit;
    const dip = age < 14 ? Math.sin((age / 14) * Math.PI) * R(0.014) * (1 - age / 14) * 2 : 0;
    const drop = s.drops.find((d) => d.id === tr.id), da = drop ? s.t - drop.t : 99;
    let my = Y(tr.y), sq = 1;
    if (drop && da < 10) my = Y(drop.y) + (Y(tr.y) - Y(drop.y)) * ease(da / 10);
    else if (da < 22) sq = 1 + Math.sin(((da - 10) / 12) * Math.PI) * 0.25;
    ctx.save();
    ctx.translate(X(tr.x), my);
    ctx.scale(sq, 1 / sq);
    drawTramp(ctx, 0, 0, R(tr.lv < 0 ? 0.075 : 0.056), Y(base) - Y(tr.y), tr.uses, L.uses, dip, t, age < 10 ? 0.8 : 0);
    ctx.restore();
  }
  // ═════════ 곡예사 ═════════
  const U = R(0.0135);
  const queues = new Map<number, Ac[]>();
  for (const a of W.acs) if (a.st === WAIT) queues.set(a.p, [...(queues.get(a.p) ?? []), a]);
  for (const [p, list] of queues) {
    const P = L.plats[p];
    list.sort((q1, q2) => q1.jumpAt - q2.jumpAt);
    list.forEach((a, i) => {
      if (i > 3) return;
      if (i === 2) return;
      const prep = i === 0 && (a.jumpAt - W.t < PREP + 30 || s.stage === 0);
      let x = P.x - P.dir * (0.03 + i * 0.05), y = P.h;
      let pose: Pose = prep ? 'prep' : 'stand';
      if (i === 3) (x = P.x - P.dir * 0.125), (y = P.h - 0.1), (pose = 'climb');
      if (prep) {
        const left = a.jumpAt - W.t;
        y += left < 12 ? -0.006 : Math.abs(Math.sin(t * 0.22)) * 0.018;
      }
      drawAcro(ctx, a.k, X(x), Y(y), U, pose, 0, P.dir, t + a.id * 7, prep ? 1 : 0);
    });
  }
  for (const a of W.acs) {
    if (a.st === WAIT) continue;
    const age = W.t - a.t, P = L.plats[a.p];
    if (a.st === AIR) {
      const fl = a.bt >= 0 ? clamp01((W.t - a.bt) / 52) : 0;
      const ang = a.b > 0 && fl < 1 ? ease(fl) * TAU * Math.sign(a.vx || 1) : Math.max(-0.4, Math.min(0.4, a.vx * 60));
      const mood = a.b > 0 ? 1 : a.vy < -0.006 ? 2 : 0;
      // 그림자
      ctx.fillStyle = `rgba(40,10,20,${0.12 + 0.2 * (1 - clamp01(a.y / 0.8))})`;
      ell(ctx, X(a.x), Y(0) + R(0.004), R(0.03 * (1 - clamp01(a.y) * 0.4)), R(0.008));
      ctx.fill();
      drawAcro(ctx, a.k, X(a.x), Y(a.y), U, a.b > 0 && fl < 1 ? 'tuck' : 'fall', ang, Math.sign(a.vx || 1), t + a.id * 7, mood);
    } else if (a.st === FLAG) {
      const fl = L.flags[a.fl], [sx, sy] = towerSlot(W, a), hop = clamp01(age / 26);
      const x = a.x + (sx - a.x) * ease(hop), y = fl.h + sy + Math.sin(hop * Math.PI) * 0.05;
      drawAcro(ctx, a.k, X(x), Y(y), U, age < 40 || (t + a.id * 13) % 160 < 30 ? 'land' : 'stand', 0, x < fl.x ? 1 : -1, t + a.id * 7, 4);
    } else if (a.st === MISS) {
      if (a.wall && age < 40) {
        const y = Math.max(0, a.y - age * 0.012);
        drawAcro(ctx, a.k, X(a.x), Y(y), U, 'splat', a.x < 0.5 ? -Math.PI / 2 : Math.PI / 2, 1, t, 3);
      } else {
        // 톱밥에 푹 — 다리만 버둥
        const mx = X(a.x), my = Y(0), us = U * (a.k === 1 ? 1.28 : 1), big = a.k === 1 ? 1.3 : 1;
        drawAcro(ctx, a.k, mx, my - 0.6 * us, U, 'plant', Math.PI, 1, t + a.id * 5, 3);
        // 톱밥 더미가 머리를 덮는다
        ctx.fillStyle = 'rgba(120,60,20,.25)';
        ell(ctx, mx, my + R(0.03) * big, R(0.075) * big, R(0.016) * big);
        ctx.fill();
        ctx.fillStyle = lin(ctx, 0, my - R(0.04) * big, 0, my + R(0.04) * big, [[0, '#f6d09a'], [1, '#d8a060']]);
        ell(ctx, mx, my + R(0.006), R(0.066) * big, R(0.042) * big);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,245,215,.6)';
        ell(ctx, mx - R(0.02) * big, my - R(0.016) * big, R(0.022) * big, R(0.009) * big);
        ctx.fill();
        ctx.fillStyle = 'rgba(150,90,40,.4)';
        for (let q = 0; q < 6; q++) (ell(ctx, mx + (hsh(q + a.id) - 0.5) * R(0.1) * big, my + (hsh(q * 3 + a.id) - 0.3) * R(0.05) * big, 1.6, 1.1), ctx.fill());
        ctx.fillStyle = 'rgba(255,240,210,.5)';
        ell(ctx, mx - R(0.015), my - R(0.015), R(0.02), R(0.008));
        ctx.fill();
      }
    } else if (a.st === NET) {
      const lx = P.x - P.dir * 0.12;
      let x = a.x, y = 0.04, pose: Pose = 'net';
      if (age < 26) y = 0.04 + Math.abs(Math.sin((age / 26) * Math.PI * 2)) * 0.05 * (1 - age / 26);
      else if (age < 80) (x = a.x + (lx - a.x) * ((age - 26) / 54)), (y = 0.01 + Math.abs(Math.sin(age * 0.4)) * 0.01), (pose = 'stand');
      else (x = lx), (y = ((age - 80) / 40) * P.h), (pose = 'climb');
      drawAcro(ctx, a.k, X(x), Y(y), U, pose, 0, x < lx ? 1 : -1, t, age < 26 ? 2 : 0);
    }
  }
  hoopDraw(true);
  // 단장 펭귄 (링 앞 오른쪽)
  drawMaster(ctx, X(0.925), Y(-0.05), R(0.0085), t - s.cheerT < 80 ? 1 : t - s.ohT < 80 ? 2 : 0, t);
  // ═════════ 첫 판 안내 (손가락 + 한 줄) ═════════
  if (s.stage === 0 && s.firstTap < 0 && s.phase === 'play') {
    const hx = X(s.hintX), hy = Y(0) - R(0.02), press = (t % 70) / 70;
    drawHand(ctx, hx + R(0.03), hy - R(0.06) - Math.abs(Math.sin(press * Math.PI)) * R(0.03), R(0.075), press > 0.8 ? 1 : 0);
    font(0.046, 900);
    const msg = '👆 떨어질 곳을 톡! 트램펄린';
    const tw = ctx.measureText(msg).width + R(0.08), by = Y(0.98);
    ctx.fillStyle = 'rgba(255,250,236,.95)';
    rr(ctx, w / 2 - tw / 2, by - R(0.035), tw, R(0.07), R(0.035));
    ctx.fill();
    ctx.strokeStyle = '#ff4a5a';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#7a1a2a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg, w / 2, by + 1);
  }
  // NEW 스포트라이트
  if (s.spot && s.phase === 'play') {
    const age = t - s.spot.t, pu = 0.5 + 0.5 * Math.sin(age * 0.2), a = Math.min(1, age / 10, (200 - age) / 30);
    if (a > 0) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 3 + pu * 2;
      ctx.setLineDash([7, 5]);
      ell(ctx, X(s.spot.x), Y(s.spot.y), R(s.spot.r) * (1 + pu * 0.08), R(s.spot.r) * (1 + pu * 0.08));
      ctx.stroke();
      ctx.setLineDash([]);
      font(0.04, 900);
      const lbl = `NEW ${s.spot.label}`, tw = ctx.measureText(lbl).width + R(0.05);
      const ly = Math.max(R(0.13), Y(s.spot.y) - R(s.spot.r) - R(0.035)), lx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, X(s.spot.x)));
      ctx.fillStyle = '#ff4a5a';
      rr(ctx, lx - tw / 2, ly - R(0.026), tw, R(0.052), R(0.026));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lbl, lx, ly + 1);
      ctx.restore();
    }
  }
  // ═════════ 사건 → 연출 ═════════
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT || e.t > t) continue;
    const x = X(e.x), y = Y(e.y), cx2 = Math.max(R(0.16), Math.min(w - R(0.16), x));
    if (e.kind === 'place') {
      fx.burst(x, y + R(0.02), '#f2c88a', 14, 3, 2.4);
      fx.ring(x, y, 'rgba(255,240,200,.9)', R(0.1), 4);
      fx.pop(cx2, y - R(0.05), e.text!, '#ffffff', 22);
      fx.kick(3);
    } else if (e.kind === 'boing') {
      const n = e.v ?? 1;
      fx.burst(x, y, '#ffe066', 16 + n * 4, 4 + n, 2.6);
      fx.burst(x, y, '#ffffff', 10, 3.4, 2);
      fx.ring(x, y, '#ffe066', R(0.12 + n * 0.02), 5);
      fx.pop(cx2, y - R(0.08), e.text!, n >= 2 ? '#fff27a' : '#ffffff', n >= 2 ? 36 : 30);
      fx.kick(3 + n);
    } else if (e.kind === 'wow') {
      fx.pop(cx2, Y(0.62), '뿅!', '#fff27a', 54);
      fx.burst(x, Y(0.05), '#ff6a8a', 26, 5.5, 3);
      fx.burst(x, Y(0.05), '#6ad8ff', 26, 5.5, 3);
      fx.blink('#fff6c8', 0.28);
      fx.kick(8);
    } else if (e.kind === 'land') {
      const n = e.v ?? 1;
      for (const c of ['#ffe066', '#ff6a8a', '#6ad8ff', '#7ad65e']) fx.burst(x, y - R(0.05), c, 10 + n * 2, 4.5 + n * 0.4, 2.6);
      fx.ring(x, y, '#fff27a', R(0.16 + n * 0.03), 6);
      fx.pop(cx2, y - R(0.2), e.text!, '#fff27a', n >= 3 ? 38 : 32);
      fx.blink('#fff6c8', 0.1 + n * 0.03);
      fx.kick(4 + n);
    } else if (e.kind === 'miss' || e.kind === 'wall') {
      fx.burst(x, y, '#eab878', 22, 4, 2.6);
      fx.pop(cx2, y - R(0.1), e.text!, e.col!, 30);
      fx.kick(6);
    } else if (e.kind === 'net') {
      fx.burst(x, Y(0.04), '#e8f4ff', 10, 2.6, 2);
      fx.pop(cx2, Y(0.14), e.text!, e.col!, 18);
    } else if (e.kind === 'break') {
      fx.burst(x, y, '#3a5ac8', 18, 4, 2.6);
      fx.burst(x, y, '#ff4a5a', 10, 3.4, 2.2);
      fx.pop(cx2, y - R(0.05), e.text!, e.col!, 18);
      fx.kick(3);
    } else if (e.kind === 'hoop') {
      fx.burst(x, y, '#ff8a2a', 22, 4.5, 2.8);
      fx.burst(x, y, '#ffd23a', 14, 3.5, 2.2);
      fx.ring(x, y, '#ffb84a', R(0.12), 5);
      fx.pop(cx2, y - R(0.09), e.text!, '#ffd23a', 24);
      fx.kick(4);
    } else if (e.kind === 'empty' || e.kind === 'busy') fx.pop(cx2, y - R(0.04), e.text!, e.col!, 16);
    else if (e.kind === 'clear') {
      for (const c of ['#ffe066', '#ff6a8a', '#6ad8ff', '#7ad65e', '#ffffff']) fx.burst(X(0.5), Y(0.75), c, 22, 6, 3);
      fx.blink('#fff6c8', 0.22);
    } else if (e.kind === 'fail') (fx.kick(9), fx.blink('#ff8a7a', 0.22));
  }
  fx.memo.t = t;
  ctx.restore();
  drawHud(ctx, s, w, h, R, font);
}
/** 깃발 쪽 깃발이 펄럭이는 방향 */
const P_FLAG_DIR = (L: Level, i: number) => (L.flags[i].x < 0.5 ? -1 : 1);
const isFirstWait = (W: World, a: Ac) => {
  let best: Ac | null = null;
  for (const b of W.acs) if (b.st === WAIT && b.p === a.p && (!best || b.jumpAt < best.jumpAt)) best = b;
  return best === a;
};
/** 깃발 위 인간 탑 자리: 아래 줄 셋 · 둘 · 하나 (발판 위 상대 높이) */
function towerSlot(W: World, a: Ac): [number, number] {
  const fl = W.L.flags[a.fl];
  let i = 0;
  for (const b of W.acs) if (b.st === FLAG && b.fl === a.fl && b.order < a.order) i++;
  const rows = [3, 2, 1, 1, 1];
  let row = 0;
  while (i >= rows[row]) (i -= rows[row]), row++;
  const n = rows[row];
  return [fl.x + (i - (n - 1) / 2) * 0.05, row * 0.088];
}

function starText(s: CircusState, k: StarK): string {
  const L = s.L;
  return k === 'goal' ? `곡예사 ${L.goal}명 깃발로` : k === 'clean' ? '아무도 안 떨어뜨리기' : k === 'par' ? `트램펄린 ${L.par}개로` : `불꽃 고리 ${L.hoopGoal}번 지나기`;
}

function drawHud(ctx: C2, s: CircusState, w: number, h: number, R: (r: number) => number, font: (sz: number, w?: number) => void) {
  const L = s.L, W = s.W, d = STAGES[s.stage], t = s.t;
  // ── 위 띠: 판 · 깃발 · 별 · 하트
  ctx.fillStyle = 'rgba(40,8,24,.82)';
  ctx.fillRect(0, 0, w, R(0.085));
  ctx.fillStyle = '#ffcf3a';
  ctx.fillRect(0, R(0.085), w, 2);
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff2d8';
  ctx.fillText(`${s.stage + 1}판 · ${d.name}`, R(0.03), R(0.044));
  for (let k = 0; k < 3; k++) heart(ctx, w - R(0.045) - k * R(0.05), R(0.042), R(0.017), k < s.hearts);
  ctx.fillStyle = '#ffcf3a';
  starPath(ctx, w - R(0.235), R(0.043), R(0.02));
  ctx.fill();
  ctx.fillStyle = '#fff2d8';
  font(0.038, 900);
  ctx.fillText(`${s.stars}`, w - R(0.21), R(0.045));
  // 깃발 수 (가운데)
  font(0.038, 900);
  const gtxt = `깃발 ${Math.min(W.landed, L.goal)}/${L.goal}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = W.landed >= L.goal ? '#ffe066' : '#bff6ee';
  ctx.fillText(gtxt, w * 0.6, R(0.045));
  // ── 아래 띠: 트램펄린 남은 수 · 별 조건
  const by = (FLOOR + 0.085) * w;
  ctx.fillStyle = lin(ctx, 0, by, 0, h, [[0, '#5a1430'], [1, '#3a0c20']]);
  ctx.fillRect(0, by, w, h - by);
  ctx.fillStyle = '#ffcf3a';
  ctx.fillRect(0, by, w, 2);
  font(0.036, 900);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff2d8';
  const ry = by + R(0.034);
  ctx.fillText('트램펄린', R(0.03), ry);
  const tw0 = ctx.measureText('트램펄린').width;
  const total = W.stock + W.placed;
  for (let k = 0; k < total; k++) {
    const cx = R(0.075) + tw0 + k * R(0.058), on = k >= W.placed;
    ctx.globalAlpha = on ? 1 : 0.3;
    ctx.fillStyle = '#ff4a5a';
    ell(ctx, cx, ry + R(0.004), R(0.024), R(0.009));
    ctx.fill();
    ctx.fillStyle = '#3a5ac8';
    ell(ctx, cx, ry, R(0.017), R(0.006));
    ctx.fill();
    ctx.strokeStyle = '#c8ccd8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - R(0.016), ry + R(0.01));
    ctx.lineTo(cx - R(0.018), ry + R(0.02));
    ctx.moveTo(cx + R(0.016), ry + R(0.01));
    ctx.lineTo(cx + R(0.018), ry + R(0.02));
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (L.stars.includes('par') && k === L.par - 1) {
      ctx.strokeStyle = '#ffcf3a';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx + R(0.029), ry - R(0.022));
      ctx.lineTo(cx + R(0.029), ry + R(0.026));
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // 별 조건 (한 줄 말) — 지켜지고 있으면 노랗게
  const live = starsOf(L, W), res = s.phase === 'result' && s.ok ? s.starOk : live;
  font(0.034, 800);
  let cx = R(0.03), cy = by + R(0.088);
  L.stars.forEach((k, j) => {
    const txt = starText(s, k), tw = ctx.measureText(txt).width + R(0.07);
    if (cx + tw > w - R(0.02)) (cx = R(0.03)), (cy += R(0.05));
    const on = res[j], broken = !on && (k === 'clean' || k === 'par') && (k === 'clean' ? W.missed > 0 : W.placed > L.par);
    ctx.fillStyle = on ? 'rgba(255,220,90,.22)' : 'rgba(0,0,0,.25)';
    rr(ctx, cx, cy - R(0.022), tw, R(0.044), R(0.022));
    ctx.fill();
    ctx.fillStyle = on ? '#ffcf3a' : broken ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.5)';
    starPath(ctx, cx + R(0.027), cy, R(0.017));
    ctx.fill();
    ctx.fillStyle = on ? '#fff6d0' : broken ? 'rgba(255,230,220,.5)' : '#fff0dc';
    ctx.textAlign = 'left';
    ctx.fillText(txt, cx + R(0.052), cy + 1);
    if (broken) {
      ctx.strokeStyle = 'rgba(255,150,140,.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + R(0.05), cy + 1);
      ctx.lineTo(cx + tw - R(0.014), cy + 1);
      ctx.stroke();
    }
    cx += tw + R(0.016);
  });
  // ── 판 띠 (시작 · 결과)
  let head = '', sub = '', a = 0, age = 0;
  const mid = R(0.42);
  if (s.phase === 'result') {
    age = s.pt;
    a = Math.min(1, age / 8);
    if (s.ok) head = s.won ? '대공연 끝! 기립 박수!' : '공연 성공!';
    else (head = '어이쿠!'), (sub = s.hearts > 0 ? `${s.why} · 하트 -1 · 같은 무대 다시` : `${s.why} · 하트가 없어요`);
  } else if (s.banner && t - s.banner.t < 170) {
    age = t - s.banner.t;
    a = Math.min(1, age / 8, (170 - age) / 25);
    (head = s.banner.head), (sub = s.banner.sub);
  }
  if (head && a > 0) {
    const pop = Math.min(1, 0.55 + age / 10);
    ctx.save();
    ctx.globalAlpha = a;
    font(0.056, 900);
    const w1 = ctx.measureText(head).width;
    font(0.036, 800);
    const w2 = sub ? ctx.measureText(sub).width : 0;
    const okRes = s.phase === 'result' && s.ok;
    const cw = Math.min(w - R(0.04), Math.max(w1, w2, okRes ? R(0.5) : 0) + R(0.1)), ch = (okRes ? R(0.22) : sub ? R(0.15) : R(0.09)) * pop;
    ctx.translate(w / 2, mid);
    ctx.fillStyle = 'rgba(30,5,15,.4)';
    rr(ctx, -cw / 2 + 3, -ch / 2 + 5, cw, ch, R(0.035));
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [[0, '#fffaf0'], [1, '#ffe8c8']]);
    rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.035));
    ctx.fill();
    ctx.strokeStyle = '#c8283a';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#ff4a5a' : '#7a8aa8') : '#ff4a5a';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo((sd * cw) / 2, -ch * 0.25);
      ctx.lineTo(sd * (cw / 2 + R(0.035)), -ch * 0.3);
      ctx.lineTo(sd * (cw / 2 + R(0.02)), 0);
      ctx.lineTo(sd * (cw / 2 + R(0.035)), ch * 0.3);
      ctx.lineTo((sd * cw) / 2, ch * 0.25);
      ctx.closePath();
      ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    font(0.056, 900);
    ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#c8283a' : '#5a6a88') : '#8a1a2a';
    if (okRes) {
      ctx.fillText(head, 0, -R(0.06), w - R(0.1));
      const nS = s.starOk.length;
      for (let j = 0; j < nS; j++) {
        const ag = s.pt - (16 + j * 14), sx = (j - (nS - 1) / 2) * R(0.1), popS = ag < 0 ? 0.8 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
        starPath(ctx, sx, R(0.03), R(0.04) * popS);
        ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(90,50,20,.15)';
        ctx.fill();
        ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#9a5a08' : 'rgba(90,50,20,.35)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        const fx = juice(s);
        if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(w / 2 + sx, mid + R(0.03), '#ffd23a', 16, 3, 2.4);
      }
    } else {
      ctx.fillText(head, 0, sub ? -R(0.028) : R(0.002), w - R(0.1));
      if (sub) {
        font(0.036, 800);
        ctx.fillStyle = sub.startsWith('NEW') ? '#d0402a' : '#6a3a2a';
        ctx.fillText(sub, 0, R(0.038), w - R(0.08));
      }
    }
    ctx.restore();
  }
}

/** 점검용 (저장소 밖 스크립트가 쓴다) */
export const __dbg = { newStage, crossings, habitEnd, rawLevel, placeFlags, judgeLevel, trial, smartPick, habitPick, routes, habitRoute, launch, groupsOf, starsOf, newWorld, stepWorld, putTramp, forecast };
