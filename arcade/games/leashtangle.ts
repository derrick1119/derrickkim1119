/**
 * 꼬인 산책줄 (26라운드: 검증된 요즘 캐주얼 뼈대 × 공장의 와우, 2탄) — 꼬인 줄 풀기 × 가리키기(톡 두 번).
 * 뼈대: 요즘 잘 팔리는 '꼬인 줄 풀기' 퍼즐(줄 끝을 다른 자리로 옮겨 엇갈림을 모두 없앤다). 우리 것: 공원 디오라마.
 *   가운데 산책 기둥의 색 고리에서 강아지마다 산책줄이 이어져 있고, 강아지는 잔디 위 말뚝(자리)에 앉아 있다.
 * 조작(손짓 하나): 강아지를 톡 → 번쩍 들어 올려지고, 옮길 수 있는 빈 말뚝마다 '그리 가면 남는 꼬임 수'가 뜬다 → 빈 말뚝을 톡 → 폴짝.
 *   톡 두 번(고르기·놓기)뿐, 끌기 없음. 키보드는 화살표 커서 + 스페이스.
 * 규칙(결정적): 꼬임 = 서로 엇갈린 두 줄의 수 + 기둥(나무)을 감은 줄의 수 (말뚝 좌표의 선분 교차로 계산).
 *   꼬임이 0이 되는 순간 산책 출발. 옮기는 횟수에는 한도가 있고, 한도를 다 쓰고도 꼬여 있으면 실패(하트 −1, 그 판 다시).
 * 와우: 한 마리가 폴짝 자리를 바꾸면 그 줄이 지나가는 길이 통째로 바뀌어 여러 꼬임이 한꺼번에 '툭툭' 풀리고(꼬리 붕붕),
 *   다 풀리는 순간 고리가 '찰칵' 풀리며 강아지들이 곰 도우미를 질질 끌고 신나게 산책을 떠난다.
 * 판 구조: 8판. 별 = ★ 다 풀기 · ★ 최소 횟수(N번 안에) · ★ 간식 🦴 모두(다 풀기 전에 간식 말뚝에 앉아 냠).
 * 펼쳐짐(하는 일이 바뀐다): 1판 톡·톡(한 번에 풀기) → 2판 🦴 간식 둘(다 풀기 전에 들렀다 가기 — 순서)
 *   → 3판 🐕‍🦺 큰 개(옮기면 2번 — 큰 개를 옮길까, 작은 개 둘을 옮길까) → 4판 🐈 고양이(강아지가 떠난 자리를 냉큼 차지 — 되돌아갈 길이 막힌다)
 *   → 5판 💞 짝꿍(하나를 옮기면 멀어진 짝이 가장 가까운 빈 자리로 졸졸 — 한 번에 둘) → 6판 🪵 기둥 둘(두 무리를 갈라 앉히기)
 *   → 7판 💧 웅덩이(그 말뚝에 가면 진흙투성이, 털어 내느라 +1번 — 좋아 보이는 자리의 함정) → 8판 🌳 숲길(나무에 감기는 줄 + 큰 개·고양이).
 * 웃음: 들어 올린 강아지는 발을 동동, 꼬임이 늘면 눈이 뱅글, 풀리면 꼬리 붕붕·혀 날름. 실패하면 곰 도우미가 줄에 감겨 벌러덩(어질어질 별).
 *   잔디의 비둘기는 강아지가 옆에 떨어지면 푸드덕 날아오른다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.45;
/** 땅(ground) 좌표 → 화면 세로: 3/4 시점으로 세로를 눌러 그린다 (선분 교차는 아핀 변환에 안 변하므로 계산은 땅 좌표로) */
const GY0 = 0.23, GK = 0.75;
const sy = (gy: number) => GY0 + gy * GK;
/** 기둥 고리 반지름 · 기둥에 감기는 반지름 · 나무에 감기는 반지름 · 짝꿍이 따라오는 거리 */
const RH = 0.09, PR = 0.036, TRR = 0.042, PAIR_D = 0.45;
/** 손가락 닿는 반지름 (340px 폭에서 25px) */
const HIT = 0.075;
const HOP = 24, WALK = 130, FAILT = 90, RESULT_OK = 170, RESULT_FAIL = 150, NEWS_T = 210, COOL = 5;
const STAR_PTS = 100, LEFT_PTS = 10, WIN_PTS = 200;

// ───────────────────────────── 판 ─────────────────────────────
interface DogDef { post: number; ang: number; breed: number; big?: boolean; pair?: boolean }
interface StageDef {
  key: string; name: string; emoji: string; news: string; tip: string;
  posts: number[][]; dogs: DogDef[]; pegs: number[][]; trees: number[][];
  treats: number; puddles: number; cat: boolean;
  /** 한도 = 최소 횟수 + slack */
  slack: number;
  /** 최소 횟수(간식 포함) 범위 · 처음 꼬임 최소 */
  par: [number, number]; minX: number;
}
const D2R = Math.PI / 180;
/** 기둥(cx,cy)을 둘러싼 타원 위 말뚝들 (각도는 도, 0 = 오른쪽, 90 = 아래) */
const ring = (cx: number, cy: number, angs: number[], s = 1, rx = 0.37, ry = 0.55) => angs.map((a) => [cx + rx * s * Math.cos(a * D2R), cy + ry * s * Math.sin(a * D2R)]);
const C0 = [0.5, 0.7];
const dogs = (angs: number[], o: Partial<DogDef>[] = []): DogDef[] => angs.map((ang, k) => ({ post: 0, ang, breed: k, ...(o[k] ?? {}) }));

export const STAGES: StageDef[] = [
  {
    key: 'walk', name: '첫 산책', emoji: '🐕', news: '🐕 강아지를 톡 → 빈 말뚝을 톡! 폴짝 옮겨 앉아요', tip: '👆 엇갈린 줄의 강아지를 다른 말뚝으로',
    posts: [C0], dogs: dogs([-90, 30, 150]), pegs: ring(0.5, 0.7, [-90, -18, 54, 126, 198]), trees: [],
    treats: 1, puddles: 0, cat: false, slack: 18, par: [1, 2], minX: 1,
  },
  {
    key: 'treat', name: '간식 산책', emoji: '🦴', news: '🦴 간식 말뚝에 앉으면 냠! 다 풀기 전에 먹어요', tip: '🦴 마지막 한 번 전에 간식을 먹어요',
    posts: [C0], dogs: dogs([-45, 45, 135, 225]), pegs: ring(0.5, 0.7, [-90, -30, 30, 90, 150, 210]), trees: [],
    treats: 2, puddles: 0, cat: false, slack: 6, par: [2, 4], minX: 2,
  },
  {
    key: 'big', name: '큰 개', emoji: '🐕‍🦺', news: '🐕‍🦺 큰 개는 무거워서 한 번 옮기면 2번으로 쳐요', tip: '🐕‍🦺 큰 개를 옮길까, 작은 개 둘을 옮길까',
    posts: [C0], dogs: dogs([-90, -18, 54, 126, 198], [{ big: true }]), pegs: [...ring(0.5, 0.7, [-90, -30, 30, 90, 150, 210]), ...ring(0.5, 0.7, [0, 180], 0.62)], trees: [],
    treats: 1, puddles: 0, cat: false, slack: 3, par: [3, 6], minX: 3,
  },
  {
    key: 'cat', name: '고양이', emoji: '🐈', news: '🐈 고양이는 강아지가 떠난 자리를 냉큼 차지해요', tip: '🐈 떠난 자리엔 못 돌아가요 — 고양이 자리가 다음 빈자리',
    posts: [C0], dogs: dogs([-90, -18, 54, 126, 198]), pegs: [...ring(0.5, 0.7, [-90, -45, 0, 45, 90, 135, 180, 225])], trees: [],
    treats: 1, puddles: 0, cat: true, slack: 3, par: [3, 6], minX: 3,
  },
  {
    key: 'pair', name: '짝꿍', emoji: '💞', news: '💞 짝꿍 — 하나를 옮기면 짝이 옆 빈자리로 졸졸', tip: '💞 짝이 어디로 따라올지 숫자로 미리 봐요',
    posts: [C0], dogs: dogs([-90, -18, 54, 126, 198], [{}, { pair: true }, { pair: true }]), pegs: [...ring(0.5, 0.7, [-90, -45, 0, 45, 90, 135, 180, 225])], trees: [],
    treats: 2, puddles: 0, cat: false, slack: 3, par: [3, 6], minX: 3,
  },
  {
    key: 'post2', name: '기둥 둘', emoji: '🪵', news: '🪵 기둥이 둘 — 목걸이 색 고리 쪽으로 갈라 앉혀요', tip: '🪵 줄은 제 기둥 쪽으로 — 두 무리가 엇갈리지 않게',
    posts: [[0.3, 0.42], [0.7, 0.98]],
    dogs: [
      { post: 0, ang: -120, breed: 0 }, { post: 0, ang: 0, breed: 1 }, { post: 0, ang: 120, breed: 2 },
      { post: 1, ang: -60, breed: 3 }, { post: 1, ang: 60, breed: 4 }, { post: 1, ang: 180, breed: 5 },
    ],
    pegs: [[0.14, 0.14], [0.52, 0.12], [0.86, 0.3], [0.12, 0.66], [0.5, 0.7], [0.88, 0.62], [0.3, 1.06], [0.5, 1.3], [0.88, 1.26]], trees: [],
    treats: 1, puddles: 0, cat: false, slack: 3, par: [3, 6], minX: 3,
  },
  {
    key: 'mud', name: '웅덩이', emoji: '💧', news: '💧 웅덩이 말뚝 — 진흙투성이! 털어 내느라 +1번', tip: '💧 숫자가 좋아 보여도 웅덩이는 +1번',
    posts: [C0], dogs: dogs([-90, -18, 54, 126, 198]), pegs: [...ring(0.5, 0.7, [-90, -45, 0, 45, 90, 135, 180, 225])], trees: [],
    treats: 1, puddles: 2, cat: false, slack: 3, par: [3, 6], minX: 3,
  },
  {
    key: 'tree', name: '숲길', emoji: '🌳', news: '🌳 나무를 감은 줄도 꼬임 — 큰 개·고양이도 함께', tip: '🌳 나무 뒤 자리는 잠깐 쉬어 가는 곳',
    posts: [C0], dogs: dogs([-90, -18, 54, 126, 198], [{ big: true }]), pegs: [...ring(0.5, 0.7, [-90, -45, 0, 45, 90, 135, 180, 225])], trees: [[0.33, 0.46], [0.68, 0.99]],
    treats: 1, puddles: 0, cat: true, slack: 3, par: [3, 6], minX: 3,
  },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 기하 ─────────────────────────────
interface Geo { n: number; m: number; px: number[]; py: number[]; hx: number[]; hy: number[]; posts: number[][]; trees: number[][]; big: boolean[]; pair: number[]; postOf: number[]; pc: Uint8Array; wr: Uint8Array }
const orient = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
/** 두 선분이 서로 엇갈리는가 (끝점이 닿는 건 안 침) */
function segX(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  const d1 = orient(ax, ay, bx, by, cx, cy), d2 = orient(ax, ay, bx, by, dx, dy), d3 = orient(cx, cy, dx, dy, ax, ay), d4 = orient(cx, cy, dx, dy, bx, by);
  return d1 * d2 < -1e-12 && d3 * d4 < -1e-12;
}
/** 선분 위에서 점(px,py)에 가장 가까운 매개변수 */
function segT(ax: number, ay: number, bx: number, by: number, px: number, py: number) {
  const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
  return l2 < 1e-12 ? 0 : Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
}
function segD(ax: number, ay: number, bx: number, by: number, px: number, py: number) {
  const u = segT(ax, ay, bx, by, px, py);
  return Math.hypot(ax + (bx - ax) * u - px, ay + (by - ay) * u - py);
}
const geoCache = new Map<string, Geo>();
function geometry(stage: number, mirror: boolean): Geo {
  const ck = `${stage}:${mirror}`, hit = geoCache.get(ck);
  if (hit) return hit;
  const d = STAGES[stage], mx = (x: number) => (mirror ? 1 - x : x);
  const n = d.dogs.length, m = d.pegs.length;
  const px = d.pegs.map((p) => mx(p[0])), py = d.pegs.map((p) => p[1]);
  const posts = d.posts.map((p) => [mx(p[0]), p[1]]), trees = d.trees.map((p) => [mx(p[0]), p[1]]);
  const hx: number[] = [], hy: number[] = [];
  for (const g of d.dogs) {
    const a = (mirror ? 180 - g.ang : g.ang) * D2R;
    hx.push(posts[g.post][0] + RH * Math.cos(a)), hy.push(posts[g.post][1] + RH * Math.sin(a));
  }
  const big = d.dogs.map((g) => !!g.big), pr = d.dogs.map((g, k) => (g.pair ? k : -1)).filter((k) => k >= 0);
  const pair = d.dogs.map((_, k) => (pr.length === 2 && pr.includes(k) ? pr[0] + pr[1] - k : -1));
  const pc = new Uint8Array(n * m * n * m), wr = new Uint8Array(n * m);
  for (let a = 0; a < n; a++)
    for (let j = 0; j < m; j++) {
      let w = 0;
      for (const p of posts) if (segD(hx[a], hy[a], px[j], py[j], p[0], p[1]) < PR) w++;
      for (const p of trees) if (segD(hx[a], hy[a], px[j], py[j], p[0], p[1]) < TRR) w++;
      wr[a * m + j] = w;
      for (let b = a + 1; b < n; b++)
        for (let q = 0; q < m; q++)
          if (q !== j && segX(hx[a], hy[a], px[j], py[j], hx[b], hy[b], px[q], py[q])) pc[((a * m + j) * n + b) * m + q] = pc[((b * m + q) * n + a) * m + j] = 1;
    }
  const G: Geo = { n, m, px, py, hx, hy, posts, trees, big, pair, postOf: d.dogs.map((g) => g.post), pc, wr };
  geoCache.set(ck, G);
  return G;
}

// ───────────────────────────── 규칙(시뮬레이션) ─────────────────────────────
export interface Level extends Geo {
  stage: number; mirror: boolean; breed: number[]; col: number[];
  start: number[]; cat0: number; treat: number[]; nT: number; mud: boolean[];
  limit: number; par: number; opt: number; plan: number[][]; x0: number;
}
export interface Sim { pos: number[]; cat: number; eaten: number; cost: number; moves: number; x: number; mudM: number }
type RE =
  | { k: 'hop'; a: number; from: number; to: number }
  | { k: 'follow'; a: number; from: number; to: number }
  | { k: 'eat'; a: number; p: number }
  | { k: 'mud'; a: number; p: number }
  | { k: 'cat'; from: number; to: number };

export function tangles(G: Geo, pos: number[]) {
  const n = G.n, m = G.m;
  let x = 0;
  for (let a = 0; a < n; a++) {
    x += G.wr[a * m + pos[a]];
    const base = (a * m + pos[a]) * n;
    for (let b = a + 1; b < n; b++) x += G.pc[(base + b) * m + pos[b]];
  }
  return x;
}
/** 강아지 a가 얽힌 수 */
function tanglesOf(G: Geo, pos: number[], a: number) {
  const n = G.n, m = G.m;
  let x = G.wr[a * m + pos[a]];
  for (let b = 0; b < n; b++) if (b !== a) x += G.pc[((a * m + pos[a]) * n + b) * m + pos[b]];
  return x;
}
export const newSim = (L: Level): Sim => ({ pos: L.start.slice(), cat: L.cat0, eaten: 0, cost: 0, moves: 0, x: tangles(L, L.start), mudM: 0 });
const cloneSim = (S: Sim): Sim => ({ ...S, pos: S.pos.slice() });
const busy = (S: Sim, q: number) => q === S.cat || S.pos.includes(q);
const costOf = (L: Level, a: number) => (L.big[a] ? 2 : 1);
/** 지금 옮길 수 있는가 */
export const canMove = (L: Level, S: Sim, a: number, q: number) => S.x > 0 && !busy(S, q) && S.cost + costOf(L, a) <= L.limit;
function land(L: Level, S: Sim, a: number, q: number, rec?: RE[]) {
  const b = L.treat[q];
  if (b >= 0 && !((S.eaten >> b) & 1)) (S.eaten |= 1 << b), rec?.push({ k: 'eat', a, p: q });
  if (L.mud[q]) {
    S.mudM |= 1 << a;
    rec?.push({ k: 'mud', a, p: q });
    return 1;
  }
  return 0;
}
export function apply(L: Level, S: Sim, a: number, q: number, rec?: RE[]) {
  const j = S.pos[a];
  let c = costOf(L, a), k2 = -1;
  S.pos[a] = q;
  rec?.push({ k: 'hop', a, from: j, to: q });
  c += land(L, S, a, q, rec);
  const b = L.pair[a];
  if (b >= 0) {
    const pb = S.pos[b];
    if (Math.hypot(L.px[pb] - L.px[q], L.py[pb] - L.py[q]) > PAIR_D) {
      let best = -1, bd = 1e9;
      for (let r = 0; r < L.m; r++) {
        if (busy(S, r)) continue;
        const dd = Math.hypot(L.px[r] - L.px[q], L.py[r] - L.py[q]);
        if (dd < bd - 1e-9) (bd = dd), (best = r);
      }
      if (best >= 0 && bd < Math.hypot(L.px[pb] - L.px[q], L.py[pb] - L.py[q])) {
        S.pos[b] = best;
        k2 = pb;
        rec?.push({ k: 'follow', a: b, from: pb, to: best });
        c += land(L, S, b, best, rec);
      }
    }
  }
  if (S.cat >= 0) {
    const to = !busy(S, j) ? j : k2 >= 0 && !busy(S, k2) ? k2 : S.cat;
    if (to !== S.cat) rec?.push({ k: 'cat', from: S.cat, to }), (S.cat = to);
  }
  S.cost += c;
  S.moves++;
  S.x = tangles(L, S.pos);
}
const allT = (L: Level) => (1 << L.nT) - 1;
export const starsOf = (L: Level, S: Sim) => 1 + (S.cost <= L.par ? 1 : 0) + (S.eaten === allT(L) ? 1 : 0);
/** 지금 둘 수 있는 수 전부 [강아지, 말뚝] */
function movesOf(L: Level, S: Sim) {
  const out: number[][] = [];
  if (S.x === 0) return out;
  for (let a = 0; a < L.n; a++) {
    if (S.cost + costOf(L, a) > L.limit) continue;
    for (let q = 0; q < L.m; q++) if (!busy(S, q)) out.push([a, q]);
  }
  return out;
}

// ───────────────────────────── 풀이(내다보기) ─────────────────────────────
const keyOf = (L: Level, S: Sim) => {
  let c = 0;
  for (let a = L.n - 1; a >= 0; a--) c = c * L.m + S.pos[a];
  return (c * (L.m + 1) + S.cat + 1) * 16 + S.eaten;
};
/** 다익스트라(비용 1~4): 꼬임 0에 닿는 최소 비용(opt)과 간식을 다 먹고 닿는 최소 비용(par), 그 풀이 */
export function solve(L: Level, S0: Sim, cap: number): { opt: number; par: number; plan: number[][]; planOpt: number[][] } {
  const full = allT(L);
  const best = new Map<number, number>(), from = new Map<number, [number, number, number]>();
  const buckets: Sim[][] = [];
  const k0 = keyOf(L, S0);
  best.set(k0, S0.cost);
  buckets[S0.cost] = [cloneSim(S0)];
  let opt = -1, par = -1, optK = -1, parK = -1;
  const lim = L.limit;
  for (let c = S0.cost; c <= cap && par < 0; c++) {
    const bk = buckets[c];
    if (!bk) continue;
    for (let i = 0; i < bk.length && par < 0; i++) {
      const S = bk[i], k = keyOf(L, S);
      if (best.get(k)! < S.cost) continue;
      if (S.x === 0) {
        if (opt < 0) (opt = S.cost), (optK = k);
        if (S.eaten === full) (par = S.cost), (parK = k);
        continue;
      }
      for (let a = 0; a < L.n; a++) {
        if (S.cost + costOf(L, a) > lim) continue;
        for (let q = 0; q < L.m; q++) {
          if (busy(S, q)) continue;
          const T = cloneSim(S);
          apply(L, T, a, q);
          if (T.cost > cap) continue;
          const kk = keyOf(L, T), bb = best.get(kk);
          if (bb !== undefined && bb <= T.cost) continue;
          best.set(kk, T.cost);
          from.set(kk, [k, a, q]);
          (buckets[T.cost] ??= []).push(T);
        }
      }
    }
  }
  const trace = (k: number) => {
    const out: number[][] = [];
    while (k !== k0 && from.has(k)) {
      const [pk, a, q] = from.get(k)!;
      out.push([a, q]);
      k = pk;
    }
    return out.reverse();
  };
  return { opt, par, plan: parK >= 0 ? trace(parK) : [], planOpt: optK >= 0 ? trace(optK) : [] };
}

// ───────────────────────────── 버릇(측정용) ─────────────────────────────
/** 버릇 1: 미리 보기 숫자가 가장 작은 자리로 (같으면 가까운 곳) */
export function habitGreedy(L: Level, S: Sim): number[] | null {
  let best: number[] | null = null, bv = 1e9;
  for (const [a, q] of movesOf(L, S)) {
    const T = cloneSim(S);
    apply(L, T, a, q);
    const v = T.x * 10 + Math.hypot(L.px[q] - L.px[S.pos[a]], L.py[q] - L.py[S.pos[a]]);
    if (v < bv) (bv = v), (best = [a, q]);
  }
  return best;
}
/** 버릇 2: 가장 많이 엇갈린 강아지를 가장 가까운 빈 말뚝으로 */
export function habitTangled(L: Level, S: Sim): number[] | null {
  let a = -1, av = -1;
  for (let k = 0; k < L.n; k++) {
    if (S.cost + costOf(L, k) > L.limit) continue;
    const v = tanglesOf(L, S.pos, k);
    if (v > av) (av = v), (a = k);
  }
  if (a < 0 || S.x === 0) return null;
  let q = -1, qd = 1e9;
  for (let r = 0; r < L.m; r++) {
    if (busy(S, r)) continue;
    const dd = Math.hypot(L.px[r] - L.px[S.pos[a]], L.py[r] - L.py[S.pos[a]]);
    if (dd < qd) (qd = dd), (q = r);
  }
  return q < 0 ? null : [a, q];
}
/** 버릇 3: 간식을 먹을 수 있으면 먼저(그중 숫자 작은 곳), 아니면 버릇 1 */
export function habitTreat(L: Level, S: Sim): number[] | null {
  let best: number[] | null = null, bv = 1e9;
  for (const [a, q] of movesOf(L, S)) {
    if (L.treat[q] < 0 || (S.eaten >> L.treat[q]) & 1) continue;
    const T = cloneSim(S);
    apply(L, T, a, q);
    if (T.x * 10 < bv) (bv = T.x * 10), (best = [a, q]);
  }
  return best ?? habitGreedy(L, S);
}
export const HABITS = { greedy: habitGreedy, tangled: habitTangled, treat: habitTreat };
/** 버릇대로 끝까지 두면 몇 별? (0 = 실패) */
export function playOut(L: Level, pick: (L: Level, S: Sim) => number[] | null) {
  const S = newSim(L);
  while (S.x > 0 && S.cost < L.limit) {
    const mv = pick(L, S);
    if (!mv) break;
    apply(L, S, mv[0], mv[1]);
  }
  return S.x === 0 ? starsOf(L, S) : 0;
}
/** 아무렇게나 옮기는 사람이 이 판을 풀 확률 */
export function randomPass(L: Level, r: Rng, n: number) {
  let ok = 0;
  for (let k = 0; k < n; k++) {
    const S = newSim(L);
    while (S.x > 0 && S.cost < L.limit) {
      const mv = movesOf(L, S);
      if (!mv.length) break;
      const [a, q] = mv[Math.floor(r() * mv.length)];
      apply(L, S, a, q);
    }
    if (S.x === 0) ok++;
  }
  return ok / n;
}

// ───────────────────────────── 판 만들기 ─────────────────────────────
function shuffle<T>(a: T[], r: Rng): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function candidate(stage: number, r: Rng, relax = false): Level | null {
  const d = STAGES[stage], mirror = r() < 0.5, G = geometry(stage, mirror);
  const pegs = shuffle([...Array(G.m).keys()], r);
  // 짝꿍은 처음엔 붙어 앉아 있다: 짝의 말뚝을 첫째 옆 말뚝과 맞바꾼다
  const pa = G.pair.findIndex((b) => b >= 0);
  if (pa >= 0) {
    const near = pegs.map((q, i) => [q, i]).filter(([q]) => q !== pegs[pa] && Math.hypot(G.px[q] - G.px[pegs[pa]], G.py[q] - G.py[pegs[pa]]) <= PAIR_D);
    const pb = G.pair[pa];
    if (near.length && !near.some(([q]) => q === pegs[pb])) {
      const [, i] = near[Math.floor(r() * near.length)];
      [pegs[pb], pegs[i]] = [pegs[i], pegs[pb]];
    }
  }
  const start = pegs.slice(0, G.n), empty = pegs.slice(G.n);
  const treat = new Array(G.m).fill(-1), mud = new Array(G.m).fill(false);
  let e = 0;
  for (let k = 0; k < d.treats; k++) treat[empty[e++]] = k;
  for (let k = 0; k < d.puddles; k++) mud[empty[e++]] = true;
  const cat0 = d.cat ? empty[e++] : -1;
  const breed = shuffle([0, 1, 2, 3, 4, 5], r).slice(0, G.n), col = shuffle([0, 1, 2, 3, 4, 5], r).slice(0, G.n);
  const L: Level = { ...G, stage, mirror, breed, col, start, cat0, treat, nT: d.treats, mud, limit: 99, par: 0, opt: 0, plan: [], x0: tangles(G, start) };
  if (L.x0 < (relax ? 1 : d.minX)) return null;
  const cap = d.par[1] + (stage === 0 ? 1 : 0) + (relax ? 2 : 0);
  L.limit = cap;
  const sol = solve(L, newSim(L), cap);
  if (sol.par < 0 || (!relax && sol.par < d.par[0]) || sol.opt < 0) return null;
  L.par = sol.par;
  L.opt = sol.opt;
  L.plan = sol.plan;
  L.limit = sol.par + d.slack;
  return L;
}
const levelCache = new Map<string, Level>();
export function buildLevel(seed: number, stage: number): Level {
  const ck = `${seed}:${stage}`, hit = levelCache.get(ck);
  if (hit) return hit;
  const r = mulberry32((seed * 31 + stage * 7919 + 17) >>> 0);
  let pick: Level | null = null, bv = -1e9;
  for (let c = 0; c < 60; c++) {
    const L = candidate(stage, r);
    if (!L) continue;
    let v: number;
    if (stage === 0) v = Math.min(0.97, randomPass(L, r, 60)) * 3 + (L.opt === 1 ? 0.2 : 0) + (L.par === 1 ? 0.3 : 0);
    else if (stage === 1) v = -Math.abs(randomPass(L, r, 40) - 0.72) + (L.par > L.opt ? 0.2 : 0);
    else {
      // 어떤 버릇으로 두어도 별 셋이 안 나오고, 내다보면 별 셋이 나오는 판을 고른다
      const fails = Object.values(HABITS).filter((h) => playOut(L, h) < 3).length;
      v = fails + (L.par > L.opt ? 0.4 : 0) + (L.x0 >= 4 ? 0.2 : 0) - randomPass(L, r, 12) * 0.3;
      if (fails === 3 && L.par > L.opt) v += 1;
    }
    if (v > bv) (bv = v), (pick = L);
    if (stage >= 2 && bv >= 4.3) break;
    if (stage === 0 && bv >= 3.4) break;
  }
  // 드물게 조건에 맞는 판이 없으면 조건을 풀어서라도 풀리는 판 하나
  for (let c = 0; !pick && c < 2000; c++) pick = candidate(stage, r, true);
  if (!pick) throw new Error('leashtangle: no level');
  if (levelCache.size > 400) levelCache.clear();
  levelCache.set(ck, pick);
  return pick;
}

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number }
interface Hop { x0: number; y0: number; x1: number; y1: number; t0: number; dur: number; h: number }
interface DV { x: number; y: number; hop: Hop | null; wag: number; dizzy: number; chew: number; shake: number; face: number }
export interface LeashState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'hop' | 'walk' | 'fail' | 'result'; pt: number;
  L: Level; S: Sim; sel: number; selT: number;
  down: boolean; ax: number; ay: number; cool: number; lastAct: number; hopEnd: number; taps: number;
  hearts: number; stars: number; got: number; pts: number; ok: boolean; won: boolean; dead: boolean; tries: number; why: string;
  seen: Set<string>; tips: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; clearT: number;
  dv: DV[]; cv: { x: number; y: number; hop: Hop | null }; mood: string; moodT: number; bx: number;
  /** 한 수에 풀린 꼬임 연출(풀린 수가 많을수록 크게, 잠깐 멈칫) · 새 장치 소개(그 판 처음 볼 때) */
  boom: { t: number; n: number; x: number; y: number; solved: boolean; dur: number } | null; intro: { key: string; t: number } | null;
}
const ev = (s: LeashState, kind: string, x: number, y: number, text?: string, col?: string, v?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v });
function tip(s: LeashState, key: string, text: string) {
  if (s.tips.has(key) || s.newsQ.length) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
function see(s: LeashState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}
const setMood = (s: LeashState, m: string) => ((s.mood = m), (s.moodT = s.t));

function newStage(s: LeashState) {
  const d = STAGES[s.stage];
  s.L = buildLevel(s.seed, s.stage);
  s.S = newSim(s.L);
  const L = s.L;
  s.dv = L.start.map((p) => ({ x: L.px[p], y: L.py[p], hop: null, wag: 0, dizzy: 0, chew: 0, shake: 0, face: L.px[p] < 0.5 ? 1 : -1 }));
  s.cv = L.cat0 >= 0 ? { x: L.px[L.cat0], y: L.py[L.cat0], hop: null } : { x: -1, y: -1, hop: null };
  // 곰 도우미는 말뚝이 먼 쪽 아래 구석에 선다
  const room = (bx: number) => Math.min(...L.px.map((x, q) => Math.hypot(x - bx, (sy(L.py[q]) - 1.2) / GK)));
  s.bx = room(0.1) >= room(0.9) ? 0.1 : 0.9;
  s.phase = 'play';
  s.pt = 0;
  s.sel = -1;
  s.cool = s.t + 20;
  s.startT = s.t;
  s.got = 0;
  setMood(s, 'idle');
  s.boom = null;
  // 새 장치는 그 판을 처음 볼 때 스포트라이트로 소개한다 (다시 하는 판에선 안 함)
  s.intro = s.stage > 0 && !s.seen.has(d.key) ? { key: d.key, t: s.t } : null;
  see(s, d.key, d.news);
  ev(s, 'stage', 0.5, 0.7, `${s.stage + 1}판 · ${d.name}`, '#fff6d6');
  if (s.intro) for (const [x, y] of introTargets(s)) ev(s, 'intro', x, y, d.key, undefined, s.t + 10);
}

function finish(s: LeashState) {
  s.phase = 'result';
  s.pt = 0;
  const S = s.S, L = s.L;
  if (s.ok) {
    const st = starsOf(L, S);
    s.got = st;
    s.stars += st;
    s.pts += st * STAR_PTS + Math.max(0, L.limit - S.cost) * LEFT_PTS;
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    setMood(s, 'cheer');
  } else {
    s.hearts--;
    s.tries++;
    setMood(s, 'dizzy');
  }
}

/** 화면 좌표(가로 0~1, 세로 0~A)에서 가장 가까운 강아지 / 빈 말뚝 / 고양이 */
const dogXY = (s: LeashState, a: number) => [s.L.px[s.S.pos[a]], sy(s.L.py[s.S.pos[a]]) - (s.L.big[a] ? 0.072 : 0.052)];
function pickAt(s: LeashState, x: number, y: number) {
  const L = s.L, S = s.S;
  let dog = -1, dd = HIT * (1.15), peg = -1, pd = HIT, cat = false;
  for (let a = 0; a < L.n; a++) {
    const [dx, dy] = dogXY(s, a), r = Math.hypot(dx - x, dy - y) / (L.big[a] ? 1.25 : 1);
    if (r < dd) (dd = r), (dog = a);
  }
  for (let q = 0; q < L.m; q++) {
    if (busy(S, q)) continue;
    const r = Math.hypot(L.px[q] - x, sy(L.py[q]) - 0.012 - y);
    if (r < pd) (pd = r), (peg = q);
  }
  if (S.cat >= 0 && Math.hypot(L.px[S.cat] - x, sy(L.py[S.cat]) - 0.03 - y) < HIT) cat = true;
  // 고른 강아지가 있으면 빈 말뚝을 먼저 (말뚝이 더 가까울 때)
  if (s.sel >= 0 && peg >= 0 && (dog < 0 || pd < dd)) dog = -1;
  else if (dog >= 0) peg = -1;
  return { dog, peg, cat };
}

function tapAt(s: LeashState, x: number, y: number) {
  const L = s.L, S = s.S, h = pickAt(s, x, y);
  s.taps++;
  if (h.dog >= 0) {
    if (h.dog === s.sel) {
      s.sel = -1;
      ev(s, 'drop', L.px[S.pos[h.dog]], sy(L.py[S.pos[h.dog]]));
    } else {
      s.sel = h.dog;
      s.selT = s.t;
      ev(s, 'lift', L.px[S.pos[h.dog]], sy(L.py[S.pos[h.dog]]) - 0.05, L.big[h.dog] ? '끙차!' : undefined, '#fff3c4');
      if (L.big[h.dog]) tip(s, 'big2', '🐕‍🦺 큰 개는 옮기면 2번으로 쳐요');
      if (S.cost + costOf(L, h.dog) > L.limit) ev(s, 'nope', L.px[S.pos[h.dog]], sy(L.py[S.pos[h.dog]]) - 0.1, '횟수가 모자라요!', '#ffd0c8');
    }
    s.lastAct = s.t;
    s.cool = s.t + COOL;
    return;
  }
  if (h.peg >= 0 && s.sel >= 0) {
    if (!canMove(L, S, s.sel, h.peg)) {
      ev(s, 'nope', L.px[h.peg], sy(L.py[h.peg]) - 0.06, '횟수가 모자라요!', '#ffd0c8');
      return;
    }
    doMove(s, s.sel, h.peg);
    return;
  }
  if (h.cat) {
    ev(s, 'meow', L.px[S.cat], sy(L.py[S.cat]) - 0.09, '냐옹~ 안 비켜!', '#ffe0b0');
    return;
  }
  if (h.peg >= 0) {
    ev(s, 'miss', L.px[h.peg], sy(L.py[h.peg]) - 0.06, '강아지부터 톡!', '#fff3df');
    return;
  }
  if (s.sel >= 0) {
    ev(s, 'drop', L.px[S.pos[s.sel]], sy(L.py[S.pos[s.sel]]));
    s.sel = -1;
    return;
  }
  if (y > GY0 && y < 1.28) ev(s, 'miss', x, y, '강아지를 톡!', '#fff3df');
}

/** 꼬임 자리들 (땅 좌표): 엇갈린 두 줄의 만나는 점, 기둥·나무를 감은 곳 */
export function knots(L: Level, pos: number[]) {
  const out: { id: string; x: number; y: number; wrap: boolean }[] = [];
  for (let a = 0; a < L.n; a++) {
    const ax = L.hx[a], ay = L.hy[a], bx = L.px[pos[a]], by = L.py[pos[a]];
    for (const [k, p] of [...L.posts, ...L.trees].entries()) {
      const r = k < L.posts.length ? PR : TRR;
      if (segD(ax, ay, bx, by, p[0], p[1]) < r) {
        const u = Math.min(1, segT(ax, ay, bx, by, p[0], p[1]) + 0.05 / Math.max(0.05, Math.hypot(bx - ax, by - ay)));
        out.push({ id: `w${a}:${k}`, x: ax + (bx - ax) * u, y: ay + (by - ay) * u, wrap: true });
      }
    }
    for (let b = a + 1; b < L.n; b++) {
      if (!L.pc[((a * L.m + pos[a]) * L.n + b) * L.m + pos[b]]) continue;
      const cx = L.hx[b], cy = L.hy[b], dx = L.px[pos[b]], dy = L.py[pos[b]];
      const d1 = orient(cx, cy, dx, dy, ax, ay), d2 = orient(cx, cy, dx, dy, bx, by), u = d1 / (d1 - d2);
      out.push({ id: `${a}:${b}`, x: ax + (bx - ax) * u, y: ay + (by - ay) * u, wrap: false });
    }
  }
  return out;
}

function doMove(s: LeashState, a: number, q: number) {
  const L = s.L, S = s.S, k0 = knots(L, S.pos), x0 = S.x, rec: RE[] = [];
  apply(L, S, a, q, rec);
  s.sel = -1;
  s.lastAct = s.t;
  const k1 = knots(L, S.pos), ids1 = new Set(k1.map((k) => k.id)), ids0 = new Set(k0.map((k) => k.id));
  let end = s.t + HOP;
  for (const e of rec) {
    if (e.k === 'hop' || e.k === 'follow') {
      const t0 = e.k === 'hop' ? s.t : s.t + 12, dur = HOP + (e.k === 'follow' ? 2 : 0);
      const dv = s.dv[e.a];
      dv.hop = { x0: L.px[e.from], y0: L.py[e.from], x1: L.px[e.to], y1: L.py[e.to], t0, dur, h: L.big[e.a] ? 0.06 : 0.09 };
      dv.face = L.px[e.to] >= L.px[e.from] ? 1 : -1;
      end = Math.max(end, t0 + dur);
      ev(s, e.k === 'hop' ? 'jump' : 'follow', L.px[e.from], sy(L.py[e.from]), e.k === 'follow' ? '졸졸!' : undefined, '#ffd6e8', t0);
      ev(s, 'land', L.px[e.to], sy(L.py[e.to]), undefined, undefined, t0 + dur);
    }
    if (e.k === 'eat') ev(s, 'eat', L.px[e.p], sy(L.py[e.p]) - 0.07, '냠! 🦴', '#fff1a8', s.t + HOP + (e.a === a ? 0 : 14)), (s.dv[e.a].chew = s.t + HOP + 60);
    if (e.k === 'mud') ev(s, 'mud', L.px[e.p], sy(L.py[e.p]) - 0.07, '철퍽! 진흙 털기 +1', '#e8c9a0', s.t + HOP + (e.a === a ? 0 : 14)), (s.dv[e.a].shake = s.t + HOP + 50);
    if (e.k === 'cat') {
      const t0 = s.t + 14;
      s.cv.hop = { x0: L.px[e.from], y0: L.py[e.from], x1: L.px[e.to], y1: L.py[e.to], t0, dur: HOP, h: 0.07 };
      end = Math.max(end, t0 + HOP);
      ev(s, 'cat', L.px[e.to], sy(L.py[e.to]) - 0.08, '냐옹! 내 자리', '#ffe0b0', t0 + HOP);
    }
  }
  if (L.big[a]) ev(s, 'heavy', L.px[q], sy(L.py[q]) - 0.1, '쿵! (2번)', '#ffe6c0', s.t + HOP);
  const due = end;
  // 풀린 꼬임은 하나씩 '툭·툭·툭' 차례로 터지고, 많이 풀릴수록 마지막 한 방이 커진다
  const untied = k0.filter((k) => !ids1.has(k.id)), n = untied.length;
  untied.forEach((k, i) => ev(s, 'untie', k.x, sy(k.y), String(i + 1), '#bff7c4', due + i * 5));
  for (const k of k1) if (!ids0.has(k.id)) ev(s, 'tie', k.x, sy(k.y), undefined, '#ff8a7a', due);
  // 큰 숫자·멈칫은 실제로 줄어든 꼬임 수(순감)로: 많이 줄수록 크게
  const dx = S.x - x0, last = due + Math.max(0, n - 1) * 5, net = Math.max(0, -dx);
  const slow = S.x === 0 ? 20 : net >= 2 ? Math.min(26, 4 + 5 * net) : 0;
  s.boom = net > 0 || S.x === 0 ? { t: last, n: net, x: L.px[q], y: sy(L.py[q]), solved: S.x === 0, dur: 34 + slow } : null;
  if (net > 0 || S.x === 0) ev(s, 'boom', L.px[q], sy(L.py[q]), undefined, undefined, last);
  if (S.x === 0) ev(s, 'solved', 0.5, 0.62, undefined, '#fff1a8', last);
  else if (dx < 0 && net < 2) ev(s, 'better', L.px[q], sy(L.py[q]) - 0.13, `풀렸다! −${-dx}`, '#c8f7c5', due);
  else if (dx > 0) ev(s, 'worse', L.px[q], sy(L.py[q]) - 0.13, `꼬였다! +${dx}`, '#ffb4a8', due);
  else if (!rec.some((e) => e.k === 'eat' || e.k === 'mud')) ev(s, 'same', L.px[q], sy(L.py[q]) - 0.13, '그대로…', '#fff3df', due);
  // 꼬리·눈 반응: 풀린 줄의 강아지는 꼬리 붕붕, 새로 꼬인 줄의 강아지는 눈이 뱅글
  const touched = (ids: Set<string>, list: typeof k0) => {
    const set = new Set<number>();
    for (const k of list) if (!ids.has(k.id)) for (const t of k.id.replace('w', '').split(':').slice(0, k.wrap ? 1 : 2)) set.add(+t);
    return set;
  };
  for (const b of touched(ids1, k0)) s.dv[b].wag = due + 70;
  for (const b of touched(ids0, k1)) s.dv[b].dizzy = due + 60;
  s.phase = 'hop';
  s.hopEnd = last + 4 + slow;
  if (S.x === 0) setMood(s, 'wow');
  else if (dx < 0) setMood(s, 'smug');
  else if (dx > 0) setMood(s, 'wow');
  if (S.x > 0 && L.limit - S.cost <= 1) tip(s, 'last', '⚠ 한 번 남았어요 — 숫자 0 자리를 찾아요!');
  if (s.stage === 0 && s.S.moves === 1 && S.x > 0) tip(s, 'num', '🔢 강아지를 들면 빈 말뚝마다 남는 꼬임 수가 떠요');
}

function animate(s: LeashState) {
  const step = (o: { x: number; y: number; hop: Hop | null }) => {
    const h = o.hop;
    if (!h) return;
    if (s.t >= h.t0 + h.dur) (o.x = h.x1), (o.y = h.y1), (o.hop = null);
    else if (s.t >= h.t0) {
      const q = (s.t - h.t0) / h.dur;
      o.x = h.x0 + (h.x1 - h.x0) * q;
      o.y = h.y0 + (h.y1 - h.y0) * q;
    }
  };
  s.dv.forEach(step);
  step(s.cv);
}

export const leashtangle: GameDef<LeashState> = {
  id: 'leashtangle',
  name: '꼬인 산책줄',
  genes: ['untangle', 'pointer'],
  twist: '줄의 끝이 살아 있는 강아지다 — 폴짝 옮겨 앉으면 그 줄이 지나가는 길이 통째로 바뀌어 꼬임이 한꺼번에 툭툭 풀리고(꼬리 붕붕), 다 풀리는 순간 고리가 찰칵 풀리며 강아지들이 곰 도우미를 질질 끌고 산책을 떠난다. 판마다 고양이·짝꿍·큰 개·웅덩이가 옮기는 규칙을 비튼다',
  rules: ['강아지를 톡, 빈 말뚝을 톡 → 폴짝 옮겨 앉아요.', '엇갈린 줄이 0이 되면 산책 출발! 옮기는 횟수엔 한도가 있어요.'],
  controls: 'touch',
  hint: '강아지를 톡 → 빈 말뚝을 톡 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '곰 도우미의 강아지 산책 공원',
    mood: '햇살 드는 동네 공원 잔디 섬 — 가운데 나무 산책 기둥의 색 고리에서 알록달록 산책줄이 뻗어 나가고, 말뚝 방석에 앉은 강아지들이 꼬리를 흔든다. 모자 쓴 곰 도우미와 비둘기가 구경한다.',
    palette: { bg: '#2f5d3a', ink: '#fffbea', muted: '#cfe3c0', accent: '#ffd166', hot: '#ff6b5e', soft: '#e9f5d8' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, sel: -1, selT: 0,
      down: false, ax: 0, ay: 0, cool: 0, lastAct: -99, hopEnd: 0, taps: 0,
      hearts: 3, stars: 0, got: 0, pts: 0, ok: false, won: false, dead: false, tries: 0, why: '',
      seen: new Set<string>(), tips: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, clearT: 0,
      dv: [], cv: { x: -1, y: -1, hop: null }, mood: 'idle', moodT: 0, bx: 0.1, boom: null, intro: null,
    } as unknown as LeashState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, press = !!p && !s.down;
    if (p) (s.ax = p.x), (s.ay = p.y);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 60 || (s.events.length && s.t - s.events[0].t > 240)) s.events = s.events.filter((e) => s.t - e.t < 240);
    animate(s);
    if (s.mood !== 'idle' && s.t - s.moodT > (s.mood === 'dizzy' || s.mood === 'cheer' ? 400 : 80)) s.mood = s.S.x > 0 && s.L.limit - s.S.cost <= 1 ? 'worry' : 'idle';
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
    if (s.phase === 'walk') {
      if (s.pt >= WALK) finish(s);
      return;
    }
    if (s.phase === 'fail') {
      if (s.pt >= FAILT) finish(s);
      return;
    }
    if (s.phase === 'hop') {
      if (s.t < s.hopEnd) return;
      const S = s.S, L = s.L;
      s.pt = 0;
      if (S.x === 0) {
        s.phase = 'walk';
        s.ok = true;
        ev(s, 'walk', 0.5, 0.7);
        for (let a = 0; a < L.n; a++) ev(s, 'clip', L.hx[a], sy(L.hy[a]), a === 0 ? '찰칵!' : undefined, COLS[L.col[a]], s.t + 2 + a * 3);
        for (let k = 1; k <= 3; k++) ev(s, 'confetti', 0.5, 0.5, undefined, undefined, s.t + 14 * k);
        setMood(s, 'cheer');
      } else if (S.cost >= L.limit || !movesOf(L, S).length) {
        s.phase = 'fail';
        s.ok = false;
        s.why = '뱅글뱅글 꼬였다!';
        ev(s, 'fail', 0.5, 0.7, s.why, '#ffd0c8');
        setMood(s, 'dizzy');
      } else s.phase = 'play';
      return;
    }
    if (press && s.t >= s.cool) tapAt(s, p!.x, p!.y * A);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const atDog = (s: LeashState, a: number): Input => {
  const [x, y] = dogXY(s, a);
  return { tap: false, dir: 0, pointer: { x, y: y / A } };
};
const atPeg = (s: LeashState, q: number): Input => ({ tap: false, dir: 0, pointer: { x: s.L.px[q], y: (sy(s.L.py[q]) - 0.012) / A } });
const brain = new WeakMap<object, { key: string; plan: number[][] }>();
/** 다음 수: 판을 만들 때 찾아 둔 풀이를 따라가고, 어긋나면 지금 자리에서 다시 내다본다 */
export function planMove(s: LeashState): number[] | null {
  const L = s.L, S = s.S, key = `${s.stage}:${s.tries}:${keyOf(L, S)}:${S.cost}`;
  let b = brain.get(s);
  if (!b || b.key !== key) {
    let plan: number[][];
    if (S.moves === 0) plan = L.plan.slice();
    else {
      const sol = solve(L, S, L.limit);
      plan = sol.plan.length ? sol.plan : sol.planOpt;
    }
    brain.set(s, (b = { key, plan }));
  }
  return b.plan[0] ?? habitGreedy(L, S);
}
function follow(s: LeashState, mv: number[] | null): Input {
  if (!mv) return NO;
  if (s.sel !== mv[0]) return atDog(s, mv[0]);
  // 한 수를 두면 계획의 다음 수로
  const b = brain.get(s);
  if (b && b.plan[0] && b.plan[0][0] === mv[0] && b.plan[0][1] === mv[1]) {
    const T = cloneSim(s.S);
    apply(s.L, T, mv[0], mv[1]);
    b.plan = b.plan.slice(1);
    b.key = `${s.stage}:${s.tries}:${keyOf(s.L, T)}:${T.cost}`;
  }
  return atPeg(s, mv[1]);
}
const ready = (s: LeashState, gap: number) => s.phase === 'play' && !s.down && s.t >= s.cool && s.t - s.lastAct >= gap && s.t - s.startT >= 30;
/** 봇: 판 전체를 내다봐(최소 횟수 + 간식 모두) 둔다. 사람처럼 하나 들고 잠깐 보고 놓는다 */
export const leashtangleSmart: Bot<LeashState> = {
  name: '산책 달인',
  act(s) {
    if (!ready(s, 16)) return NO;
    return follow(s, planMove(s));
  },
};
/** 버릇 봇(측정용): 늘 미리 보기 숫자가 가장 작은 자리로 */
export const leashtangleHabit: Bot<LeashState> = {
  name: '버릇: 숫자 작은 곳',
  act(s) {
    if (!ready(s, 16)) return NO;
    const mv = habitGreedy(s.L, s.S);
    if (!mv) return NO;
    return s.sel !== mv[0] ? atDog(s, mv[0]) : atPeg(s, mv[1]);
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 봇: 아무 때나 아무 강아지·아무 말뚝 톡 (가끔 잔디 아무 데나) */
export const leashtangleRandom: Bot<LeashState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 50), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 25 + Math.floor(rng() * 90);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    const L = s.L, S = s.S, j = () => (rng() - 0.5) * 0.03;
    const free: number[] = [];
    for (let q = 0; q < L.m; q++) if (!busy(S, q)) free.push(q);
    if (rng() < 0.1) m.p = { x: rng(), y: rng() };
    else if (s.sel < 0 || rng() < 0.15 || !free.length) {
      const [x, y] = dogXY(s, Math.floor(rng() * L.n));
      m.p = { x: x + j(), y: (y + j()) / A };
    } else {
      const q = free[Math.floor(rng() * free.length)];
      m.p = { x: L.px[q] + j(), y: (sy(L.py[q]) + j()) / A };
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
const easeIn = (q: number) => clamp01(q) * clamp01(q);
const ease = (q: number) => 1 - (1 - clamp01(q)) * (1 - clamp01(q));
/** 산책 출발 연출: 제자리 폴짝 → 곰 앞으로 모이기 → 내달리기 */
const WALK_A = 20, WALK_B = 62;
/** 목걸이·고리·줄 색 */
export const COLS = ['#ff5a5f', '#3b82f6', '#ffc22e', '#27b864', '#a45ee0', '#ff7ccf'];
interface Breed { body: string; ear: string; light: string; pointy: boolean; spots: boolean; tan?: string }
const BREEDS: Breed[] = [
  { body: '#e9b766', ear: '#c4843a', light: '#fbe6bf', pointy: false, spots: false },
  { body: '#f7f3ec', ear: '#3a3230', light: '#ffffff', pointy: false, spots: true },
  { body: '#a46a42', ear: '#6e4128', light: '#dcae84', pointy: false, spots: false },
  { body: '#433b3b', ear: '#2a2323', light: '#9a8a7e', pointy: false, spots: false },
  { body: '#6f7f95', ear: '#4a566a', light: '#f4f6fa', pointy: true, spots: false },
  { body: '#e3cfa8', ear: '#4a3b30', light: '#f7ecd6', pointy: false, spots: false },
];
/** 큰 개: 검정·흰·갈색 세 빛깔 산악견 */
const BIG: Breed = { body: '#2f2727', ear: '#1d1717', light: '#f6f1ea', pointy: false, spots: false, tan: '#c9793a' };
type P2 = (x: number) => number;
type Font = (sz: number, w?: number) => void;

/** 강아지 하나의 화면 자리(px)·들림·달리기 */
interface DogPose { x: number; y: number; lift: number; run: number; tilt: number }
function dogPose(s: LeashState, a: number, X: P2, Y: P2, R: P2): DogPose {
  const dv = s.dv[a], t = s.t;
  let lift = 0, run = 0, tilt = 0, x = X(dv.x), y = Y(sy(dv.y));
  if (dv.hop && t >= dv.hop.t0) lift = Math.sin(Math.PI * Math.min(1, (t - dv.hop.t0) / dv.hop.dur)) * R(dv.hop.h);
  if (a === s.sel && s.phase === 'play') lift = R(0.032) + R(0.008) * Math.sin((t - s.selT) * 0.25);
  if (s.phase === 'walk' || (s.phase === 'result' && s.ok)) {
    // 찰칵 풀리면 제자리에서 폴짝폴짝 → 곰 앞으로 우르르 모여 → 한꺼번에 내달린다
    const p = s.phase === 'walk' ? s.pt : WALK, dir = s.bx < 0.5 ? 1 : -1;
    const sx = X(s.bx + dir * (0.17 + 0.085 * (a % 3))), sy2 = Y(1.21 - 0.065 * Math.floor(a / 3) + 0.012 * (a % 2));
    const qB = ease((p - WALK_A - a * 2) / (WALK_B - WALK_A)), qC = easeIn((p - WALK_B) / (WALK - WALK_B));
    run = p < WALK_A ? 0 : p < WALK_B && qB < 1 ? (sx >= x ? 1 : -1) : dir;
    x += (sx - x) * qB + dir * qC * X(1.4);
    y += (sy2 - y) * qB;
    lift = Math.abs(Math.sin(p * 0.5 + a * 1.3)) * R(p < WALK_A ? 0.04 : 0.022);
  }
  if (s.phase === 'fail') tilt = Math.sin(t * 0.3 + a) * 0.18;
  if (dv.shake > t) tilt = Math.sin(t * 1.6) * 0.22;
  // 새 장치 소개: 주인공 강아지가 폴짝폴짝
  const ia = s.intro ? t - s.intro.t : 999;
  if (ia < 60 && ((s.intro!.key === 'big' && s.L.big[a]) || (s.intro!.key === 'pair' && s.L.pair[a] >= 0))) lift += Math.abs(Math.sin(ia * 0.28)) * R(0.05) * (1 - ia / 60);
  return { x, y, lift, run, tilt };
}
/** 곰 도우미 자리(px)와 손 */
function bearPose(s: LeashState, X: P2, Y: P2, R: P2) {
  let x = X(s.bx), y = Y(1.255), lean = 0;
  if (s.phase === 'walk' || (s.phase === 'result' && s.ok)) {
    const p = s.phase === 'walk' ? s.pt : WALK, go = easeIn((p - WALK_B - 6) / (WALK - WALK_B - 6));
    x += (s.bx < 0.5 ? 1 : -1) * go * X(1.45);
    lean = p > WALK_B - 10 ? (s.bx < 0.5 ? 1 : -1) * Math.min(1, (p - WALK_B + 10) / 12) : 0;
    y -= p > WALK_B + 6 ? Math.abs(Math.sin(p * 0.5)) * R(0.03) : 0;
  }
  const dir = s.bx < 0.5 ? 1 : -1;
  return { x, y, lean, hx: x + dir * R(0.07) + lean * R(0.03), hy: y - R(0.09) };
}

const recentSay = new WeakMap<object, { x: number; y: number; t: number; hw: number }[]>();
function drawAll(ctx: CanvasRenderingContext2D, s: LeashState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, L = s.L, S = s.S, d = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const font: Font = (sz, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const GX = (gx: number) => X(gx), GY = (gy: number) => Y(sy(gy));
  ctx.save();
  fx.begin(ctx);
  // 한 번에 여러 꼬임이 풀리면 화면이 그곳으로 '훅' 다가갔다 돌아온다 (많이 풀릴수록 크게)
  const bm = s.boom, bage = bm ? t - bm.t : -1, bOn = !!bm && bage >= 0 && bage < bm.dur;
  const bPow = bm ? (bm.solved ? 1 : Math.min(1, (bm.n - 1) / 3)) : 0;
  if (bm && bOn && bPow > 0) {
    const z = 1 + (bm.solved ? 0.07 : 0.02 + 0.035 * bPow) * Math.sin(Math.PI * Math.min(1, bage / (bm.dur * 0.85)));
    const cx = bm.solved ? w / 2 : X(bm.x), cy = bm.solved ? Y(0.72) : Y(bm.y);
    ctx.translate(cx, cy);
    ctx.scale(z, z);
    ctx.translate(-cx, -cy);
  }
  drawPark(ctx, s, X, Y, R, w, h);
  // ═════════ 땅에 붙은 것: 웅덩이 · 말뚝 · 간식 · 기둥 받침 · 나무 그림자 ═════════
  const playing = s.phase === 'play' || s.phase === 'hop';
  const selFree = s.sel >= 0 && s.phase === 'play';
  for (let q = 0; q < L.m; q++) {
    const x = GX(L.px[q]), y = GY(L.py[q]);
    if (L.mud[q]) drawPuddle(ctx, x, y, R, t, q);
    drawPeg(ctx, x, y, R, L.mud[q]);
    const b = L.treat[q];
    if (b >= 0 && !((S.eaten >> b) & 1) && !S.pos.includes(q)) drawBone(ctx, x, y - R(0.012) - R(0.006) * Math.sin(t * 0.08 + q), R(0.03), t);
    if (selFree && !busy(S, q)) {
      const pul = 0.5 + 0.5 * Math.sin(t * 0.22 + q);
      ctx.strokeStyle = `rgba(255,246,160,${0.55 + 0.4 * pul})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(x, y, R(0.058) + pul * 2, R(0.034) + pul * 1.2, 0, 0, TAU);
      ctx.stroke();
    }
  }
  L.posts.forEach((p, k) => drawPostBase(ctx, s, k, GX(p[0]), GY(p[1]), X, Y, R));
  for (const tr of L.trees) {
    ctx.fillStyle = 'rgba(20,50,15,.28)';
    ctx.beginPath();
    ctx.ellipse(GX(tr[0]) + R(0.02), GY(tr[1]) + R(0.004), R(0.07), R(0.03), 0, 0, TAU);
    ctx.fill();
  }
  // ═════════ 산책줄 ═════════
  const poses = s.dv.map((_, a) => dogPose(s, a, X, Y, R));
  const bear = bearPose(s, X, Y, R);
  const walkP = s.phase === 'walk' ? s.pt : s.phase === 'result' && s.ok ? WALK : -1;
  for (let a = 0; a < L.n; a++) {
    const P = poses[a], u = R(L.big[a] ? 0.18 : 0.13);
    let hx = GX(L.hx[a]), hy = GY(L.hy[a]);
    if (walkP >= 0) {
      const q = easeIn(walkP / WALK_A);
      hx += (bear.hx - hx) * q;
      hy += (bear.hy - hy) * q;
    }
    const col = COLS[L.col[a]], lw = R(L.big[a] ? 0.021 : 0.013);
    const cx = P.x + s.dv[a].face * u * 0.06, cy = P.y - P.lift - u * 0.52;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      if (walkP >= 0) ctx.quadraticCurveTo((hx + cx) / 2, (hy + cy) / 2 + R(0.02), cx, cy);
      else {
        ctx.lineTo(P.x, P.y - R(0.004));
        ctx.lineTo(cx, cy);
      }
    };
    if (a === s.sel && s.phase === 'play') {
      path();
      ctx.strokeStyle = `rgba(255,252,190,${0.65 + 0.25 * Math.sin(t * 0.25)})`;
      ctx.lineWidth = lw + 9;
      ctx.stroke();
    }
    path();
    ctx.strokeStyle = 'rgba(25,35,15,.42)';
    ctx.lineWidth = lw + 3;
    ctx.stroke();
    path();
    ctx.strokeStyle = s.phase === 'fail' && t % 16 < 8 ? '#ff3b30' : col;
    ctx.lineWidth = lw;
    ctx.stroke();
    path();
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = Math.max(1, lw * 0.32);
    ctx.setLineDash([lw * 0.9, lw * 1.4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // ═════════ 서 있는 것들 (위에서 아래로) ═════════
  const sprites: { y: number; f: () => void }[] = [];
  for (let a = 0; a < L.n; a++) {
    const P = poses[a], dv = s.dv[a];
    sprites.push({
      y: P.y,
      f: () =>
        drawDog(ctx, P.x, P.y, R(L.big[a] ? 0.18 : 0.13), L.big[a] ? BIG : BREEDS[L.breed[a]], COLS[L.col[a]], {
          lift: P.lift, face: P.run || dv.face, t: t + a * 17, run: P.run ? 1 : 0, tilt: P.tilt,
          wag: dv.wag > t || s.phase === 'walk' || (s.phase === 'result' && s.ok), dizzy: dv.dizzy > t || s.phase === 'fail',
          happy: dv.wag > t || dv.chew > t || s.phase === 'walk', sel: a === s.sel && s.phase === 'play', mud: !!((S.mudM >> a) & 1), chew: dv.chew > t, big: L.big[a],
        }),
    });
  }
  if (S.cat >= 0 || s.cv.hop) {
    const c = s.cv, hop = c.hop;
    const ia = s.intro?.key === 'cat' ? t - s.intro.t : 999;
    const lift = (hop && t >= hop.t0 ? Math.sin(Math.PI * Math.min(1, (t - hop.t0) / hop.dur)) * R(hop.h) : 0) + (ia < 60 ? Math.abs(Math.sin(ia * 0.28)) * R(0.05) * (1 - ia / 60) : 0);
    const x = GX(c.x), y = GY(c.y);
    sprites.push({ y, f: () => drawCat(ctx, x, y, R(0.11), t, lift, hop ? (hop.x1 > hop.x0 ? 1 : -1) : x < w / 2 ? 1 : -1) });
  }
  L.posts.forEach((p, k) => sprites.push({ y: GY(p[1]) + 1, f: () => drawPole(ctx, s, k, GX(p[0]), GY(p[1]), R, t) }));
  L.trees.forEach((p, k) => sprites.push({ y: GY(p[1]), f: () => drawTree(ctx, GX(p[0]), GY(p[1]), R, t, k) }));
  for (const pr of propsOf(s)) sprites.push({ y: Y(pr.y), f: () => drawProp(ctx, pr.kind, X(pr.x), Y(pr.y), R, t) });
  sprites.push({ y: bear.y, f: () => drawBear(ctx, s, bear.x, bear.y, R(0.17), t, bear.lean) });
  for (let k = 0; k < 2; k++) {
    const bx = 0.32 + 0.36 * k + 0.07 * Math.sin(t / 160 + k * 2), by = k ? 1.245 : 1.262, fly = t - (fx.memo['bird' + k] ?? -999);
    if (fly < 90) sprites.push({ y: Y(by) + 50, f: () => drawPigeon(ctx, X(bx) + fly * R(0.006) * (k ? 1 : -1), Y(by) - fly * R(0.007), R(0.04), t, true) });
    else sprites.push({ y: Y(by), f: () => drawPigeon(ctx, X(bx), Y(by), R(0.04), t + k * 40, false, Math.cos(t / 160 + k * 2) > 0 ? 1 : -1) });
  }
  sprites.sort((p, q) => p.y - q.y);
  for (const sp of sprites) sp.f();
  // ═════════ 꼬임 표시 (맨 위에: 기둥·강아지에 가려지지 않게) ═════════
  if ((playing && s.phase !== 'hop') || s.phase === 'fail') for (const k of knots(L, S.pos)) drawKnot(ctx, GX(k.x), GY(k.y), R(0.026), t, k.wrap, s.phase === 'fail');
  // 나비
  for (let k = 0; k < 2; k++) {
    const bx = X(0.2 + 0.6 * hsh(k + 7) + 0.12 * Math.sin(t / 90 + k * 3)), by = Y(0.3 + 0.5 * k + 0.05 * Math.sin(t / 37 + k)), fl = Math.abs(Math.sin(t * 0.4 + k));
    ctx.fillStyle = k ? '#ffd1e8' : '#fff4a8';
    ctx.beginPath();
    ctx.ellipse(bx - R(0.009), by, R(0.012) * fl + 1, R(0.009), -0.4, 0, TAU);
    ctx.ellipse(bx + R(0.009), by, R(0.012) * fl + 1, R(0.009), 0.4, 0, TAU);
    ctx.fill();
  }
  // ═════════ 새 장치 스포트라이트 ═════════
  const ia = introAlpha(s);
  if (ia > 0) {
    const tg = introTargets(s), pul = Math.sin(t * 0.2);
    ctx.save();
    ctx.globalAlpha = ia;
    ctx.fillStyle = 'rgba(8,22,8,.55)';
    ctx.beginPath();
    ctx.rect(-20, -20, w + 40, h + 40);
    for (const [x, y, r] of tg) (ctx.moveTo(X(x) + R(r), Y(y)), ctx.ellipse(X(x), Y(y), R(r), R(r) * 0.9, 0, 0, TAU));
    ctx.fill('evenodd');
    for (const [x, y, r] of tg) {
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 5]);
      ctx.lineDashOffset = -t * 0.6;
      ctx.beginPath();
      ctx.ellipse(X(x), Y(y), R(r) + 3 + pul * 2, R(r) * 0.9 + 3 + pul * 2, 0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `${Math.max(18, R(0.07))}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('👇', X(x), Y(y) - R(r) - R(0.04) + Math.abs(Math.sin(t * 0.15)) * -R(0.02));
    }
    ctx.restore();
  }
  // 여러 꼬임이 한꺼번에 풀리는 순간: 속도선 + 가장자리 어둡게 (잠깐 멈칫)
  if (bm && bOn && bPow > 0) {
    const q = Math.sin(Math.PI * Math.min(1, bage / bm.dur)), cx = bm.solved ? w / 2 : X(bm.x), cy = bm.solved ? Y(0.72) : Y(bm.y);
    ctx.save();
    ctx.globalAlpha = 0.5 * q * bPow;
    ctx.strokeStyle = bm.solved ? '#fff3b0' : '#e6ffe6';
    ctx.lineWidth = 2;
    for (let k = 0; k < 18; k++) {
      const an = (k / 18) * TAU + hsh(k + (bm.t % 7)) * 0.3, r0 = R(0.22 + 0.05 * hsh(k + 3)), r1 = R(0.75);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0);
      ctx.lineTo(cx + Math.cos(an) * r1, cy + Math.sin(an) * r1);
      ctx.stroke();
    }
    ctx.restore();
  }
  // ═════════ 미리 보기: 들어 올린 강아지를 이 말뚝에 놓으면? ═════════
  if (selFree) {
    const pre = previewAll(s), hx = GX(L.hx[s.sel]), hy = GY(L.hy[s.sel]);
    // 그리 가면 줄이 지나갈 길 (흐린 점선)
    ctx.lineWidth = R(0.008);
    ctx.setLineDash([R(0.016), R(0.014)]);
    ctx.lineDashOffset = -t * 0.4;
    for (const pv of pre) {
      if (!pv.ok) continue;
      ctx.strokeStyle = pv.x === 0 ? 'rgba(255,240,140,.85)' : 'rgba(255,255,255,.5)';
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(GX(L.px[pv.q]), GY(L.py[pv.q]));
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
    for (const pv of pre) drawBubble(ctx, s, pv, GX(L.px[pv.q]), GY(L.py[pv.q]), R, font, t);
  }
  // 첫 판 안내 손가락
  if (s.stage === 0 && s.tries === 0 && S.moves === 0 && s.phase === 'play' && t - s.startT > 36 && L.plan.length) {
    const [a, q] = L.plan[0], bob = Math.sin(t * 0.15) * R(0.012);
    const tx = s.sel === a ? GX(L.px[q]) : poses[a].x, ty = s.sel === a ? GY(L.py[q]) + R(0.01) : poses[a].y - R(0.02);
    ctx.font = `${Math.max(18, R(0.075))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('👆', tx + R(0.025), ty + R(0.06) + bob);
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx, ty - R(0.02), R(0.06) + Math.sin(t * 0.15) * 2, 0, TAU);
    ctx.stroke();
  }
  // 가장자리 어둡게
  const vg = ctx.createRadialGradient(w / 2, h * 0.5, R(0.5), w / 2, h * 0.5, R(1.05));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(5,20,5,.3)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  // ═════════ 사건 연출 ═════════
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    const due = e.v !== undefined ? e.v : e.t;
    if (due <= seenT || due > t) continue;
    const x = X(e.x), y = Y(e.y);
    /** 떠오르는 글자: 같은 곳에 겹치면 위로 비켜 쌓는다 */
    const say = (txt: string, sz: number, yy = y) => {
      let rec = recentSay.get(s);
      if (!rec) recentSay.set(s, (rec = []));
      ctx.font = `800 ${sz}px system-ui, sans-serif`;
      const hw = ctx.measureText(txt).width / 2 + 6, px = Math.max(hw, Math.min(w - hw, x));
      let py = Math.max(Y(0.24), yy);
      for (let k = 0; k < 6 && rec.some((q) => t - q.t < 40 && Math.abs(q.x - px) < q.hw + hw && Math.abs(q.y - py) < sz + 4); k++) py -= sz + 5;
      rec.push({ x: px, y: py, t, hw });
      if (rec.length > 12) rec.shift();
      fx.pop(px, py, txt, e.col ?? '#ffffff', sz);
    };
    if (e.kind === 'lift') fx.ring(x, y, '#fff6a8', R(0.07), 3), fx.burst(x, y, '#fffbe0', 8, 2, 1.6), e.text && say(e.text, 15);
    if (e.kind === 'drop') fx.burst(x, y, '#e9f5d8', 5, 1.2, 1.4);
    if (e.kind === 'jump') fx.burst(x, y, '#d9f0c0', 8, 1.8, 1.8), e.text && say(e.text, 15, y - R(0.08));
    if (e.kind === 'follow') fx.ring(x, y - R(0.04), '#ffb3d9', R(0.06), 3);
    if (e.kind === 'land') {
      fx.burst(x, y, '#cfe8b0', 10, 2.2, 2), fx.kick(1.5);
      for (let k = 0; k < 2; k++) if (Math.hypot(e.x - (0.32 + 0.36 * k), e.y - 1.25) < 0.22 && t - (fx.memo['bird' + k] ?? -999) > 200) fx.memo['bird' + k] = t;
    }
    if (e.kind === 'eat') fx.burst(x, y + R(0.04), '#f5deb3', 18, 3, 2.2), fx.ring(x, y + R(0.04), '#ffe066', R(0.07), 3), fx.blink('#fff6c8', 0.08), say(e.text!, 18);
    if (e.kind === 'mud') fx.burst(x, y + R(0.06), '#7a5233', 30, 4, 2.8), fx.burst(x, y + R(0.06), '#a7c4d6', 10, 3, 2), fx.kick(5), fx.blink('#6b4a2a', 0.14), say(e.text!, 16);
    if (e.kind === 'cat') fx.ring(x, y + R(0.06), '#ffb36b', R(0.09), 4), fx.burst(x, y + R(0.06), '#ffcf8a', 14, 3, 2.2), fx.kick(2.5), say(e.text!, 16);
    if (e.kind === 'meow') say(e.text!, 14);
    if (e.kind === 'follow') fx.burst(x, y - R(0.04), '#ff9fd0', 14, 2.6, 2.2);
    if (e.kind === 'heavy') fx.kick(8), fx.burst(x, y + R(0.1), '#d9c39a', 28, 3.8, 2.8), fx.ring(x, y + R(0.1), '#e8d6b0', R(0.16), 5), say(e.text!, 17);
    if (e.kind === 'untie') {
      const i = +(e.text ?? 1);
      fx.burst(x, y, '#bff7c4', 12 + 4 * i, 2.6 + 0.35 * i, 2.2), fx.burst(x, y, '#ffffff', 6, 2, 1.6), fx.ring(x, y, '#d8ffd8', R(0.05 + 0.014 * i), 3 + i * 0.5), fx.kick(1 + 0.7 * i);
      fx.pop(x, y - R(0.035), i > 1 ? `${i}!` : '툭!', '#9dffb5', 14 + 2 * Math.min(i, 5));
    }
    if (e.kind === 'boom') {
      const n = s.boom && s.boom.t === due ? s.boom.n : 1, k = Math.min(n, 5);
      fx.burst(x, y - R(0.04), '#bff7c4', 16 + 8 * k, 3 + 0.7 * k, 2.6), fx.burst(x, y - R(0.04), '#ffe066', 6 + 5 * k, 2.5 + 0.5 * k, 2.2);
      fx.ring(x, y - R(0.04), '#d8ffd8', R(0.08 + 0.045 * k), 4 + k), fx.kick(2 + 2.2 * k);
      if (n >= 2) fx.ring(x, y - R(0.04), '#ffffff', R(0.05 + 0.03 * k), 3), fx.blink('#eaffea', 0.06 + 0.04 * k);
    }
    if (e.kind === 'clip') fx.burst(x, y, e.col ?? '#ffffff', 10, 2.4, 2), fx.ring(x, y, '#ffffff', R(0.04), 2), e.text && say(e.text, 16);
    if (e.kind === 'confetti') for (let k = 0; k < 5; k++) fx.burst(X(0.1 + 0.2 * k), Y(0.3 + 0.12 * ((k + Math.round(e.v ?? 0)) % 3)), ['#ffd166', '#ff8fb1', '#8fd3ff', '#b5f28f', '#ffffff'][(k + Math.round(e.v ?? 0)) % 5], 16, 4.5, 2.6);
    if (e.kind === 'intro') {
      fx.ring(x, y, '#ffe066', R(0.16), 5), fx.ring(x, y, '#ffffff', R(0.1), 3), fx.burst(x, y, e.text === 'tree' ? '#7fd36b' : e.text === 'mud' ? '#8a5a34' : '#ffe066', 20, 3.4, 2.4);
      fx.kick(e.text === 'big' ? 7 : 3);
    }
    if (e.kind === 'tie') fx.burst(x, y, '#ff8a7a', 10, 2.4, 2), fx.ring(x, y, '#ff6a5a', R(0.05), 3);
    if (e.kind === 'better') say(e.text!, 18), fx.kick(2);
    if (e.kind === 'worse') say(e.text!, 17), fx.kick(3);
    if (e.kind === 'same') say(e.text!, 14);
    if (e.kind === 'solved') {
      fx.blink('#fff6c8', 0.5), fx.kick(10), fx.ring(X(0.5), Y(0.72), '#ffe066', R(0.6), 8), fx.ring(X(0.5), Y(0.72), '#ffffff', R(0.35), 5);
      for (let k = 0; k < 6; k++) fx.burst(X(0.5) + Math.cos(k) * R(0.25), Y(0.72) + Math.sin(k) * R(0.2), ['#ffd166', '#ff8fb1', '#8fd3ff', '#b5f28f', '#ffffff', '#ffb36b'][k], 18, 5, 2.8);
    }
    if (e.kind === 'walk') for (let k = 0; k < 5; k++) fx.burst(X(0.15 + 0.17 * k), Y(0.35 + 0.1 * (k % 2)), ['#ffd166', '#ff8fb1', '#8fd3ff', '#b5f28f', '#ffffff'][k], 18, 4.5, 2.6);
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.22), say(e.text!, 20, Y(0.5));
    if (e.kind === 'nope' || e.kind === 'miss') say(e.text!, 14), e.kind === 'nope' && fx.kick(2);
    if (e.kind === 'stage') fx.blink('#fffbe6', 0.18);
  }
  fx.memo.t = t;
  ctx.restore();
  drawHud(ctx, s, d, w, X, Y, R, font, th);
}

/** 공원: 하늘 · 먼 숲 · 잔디 섬(두께) · 자갈 고리 · 꽃 */
function drawPark(ctx: CanvasRenderingContext2D, s: LeashState, X: P2, Y: P2, R: P2, w: number, h: number) {
  const t = s.t, L = s.L;
  const sky = ctx.createLinearGradient(0, 0, 0, Y(0.3));
  sky.addColorStop(0, '#8fd0f5');
  sky.addColorStop(1, '#dff4ff');
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  // 해
  const sun = ctx.createRadialGradient(X(0.86), Y(0.1), R(0.02), X(0.86), Y(0.1), R(0.2));
  sun.addColorStop(0, 'rgba(255,250,215,.95)');
  sun.addColorStop(0.3, 'rgba(255,240,180,.45)');
  sun.addColorStop(1, 'rgba(255,240,180,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, Y(0.35));
  // 구름
  for (let k = 0; k < 3; k++) {
    const cx = ((hsh(k + 3) * 1.4 + t * 0.00012 * (1 + k * 0.4)) % 1.4) - 0.2, cy = 0.085 + 0.03 * k;
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath();
    ctx.arc(X(cx), Y(cy), R(0.03), 0, TAU);
    ctx.arc(X(cx + 0.035), Y(cy - 0.012), R(0.038), 0, TAU);
    ctx.arc(X(cx + 0.075), Y(cy), R(0.028), 0, TAU);
    ctx.fill();
  }
  // 먼 숲
  for (let layer = 0; layer < 2; layer++) {
    ctx.fillStyle = layer ? '#5e9e5c' : '#86bd7c';
    ctx.beginPath();
    ctx.moveTo(0, Y(0.25));
    for (let k = 0; k <= 14; k++) {
      const x = k / 14, yy = 0.16 + layer * 0.02 - 0.025 * hsh(k * 3 + layer * 11);
      ctx.arc(X(x), Y(yy + 0.02), R(0.045 + 0.02 * hsh(k + layer * 5)), Math.PI, 0);
    }
    ctx.lineTo(w, Y(0.25));
    ctx.closePath();
    ctx.fill();
  }
  // 잔디 섬: 앞면 흙 두께 → 윗면 잔디
  const x0 = X(0.025), x1 = X(0.975), y0 = Y(0.19), y1 = Y(1.285), rr = R(0.07);
  ctx.fillStyle = 'rgba(20,40,10,.35)';
  ctx.beginPath();
  ctx.roundRect(x0 + R(0.01), y0 + R(0.05), x1 - x0, y1 - y0, rr);
  ctx.fill();
  const soil = ctx.createLinearGradient(0, y1 - R(0.02), 0, y1 + R(0.04));
  soil.addColorStop(0, '#8a5a34');
  soil.addColorStop(1, '#5b3a22');
  ctx.fillStyle = soil;
  ctx.beginPath();
  ctx.roundRect(x0, y0 + R(0.036), x1 - x0, y1 - y0, rr);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,220,170,.18)';
  for (let k = 0; k < 9; k++) (ctx.beginPath(), ctx.arc(X(0.08 + k * 0.105), y1 + R(0.018), R(0.006), 0, TAU), ctx.fill());
  const grass = ctx.createLinearGradient(x0, y0, x1, y1);
  grass.addColorStop(0, '#9edb6e');
  grass.addColorStop(0.5, '#7fc65a');
  grass.addColorStop(1, '#5fa944');
  ctx.fillStyle = grass;
  ctx.beginPath();
  ctx.roundRect(x0, y0, x1 - x0, y1 - y0, rr);
  ctx.fill();
  ctx.save();
  ctx.clip();
  // 잔디 깎은 줄무늬
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  for (let k = -4; k < 12; k += 2) {
    ctx.beginPath();
    ctx.moveTo(X(k * 0.12), y0);
    ctx.lineTo(X(k * 0.12 + 0.12), y0);
    ctx.lineTo(X(k * 0.12 + 0.12 + 0.45), y1);
    ctx.lineTo(X(k * 0.12 + 0.45), y1);
    ctx.closePath();
    ctx.fill();
  }
  // 햇살 번짐
  const glow = ctx.createRadialGradient(X(0.8), Y(0.25), R(0.05), X(0.6), Y(0.55), R(0.9));
  glow.addColorStop(0, 'rgba(255,250,200,.35)');
  glow.addColorStop(1, 'rgba(255,250,200,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // 자갈 고리 (기둥 둘레)
  for (const p of L.posts) {
    const cx = X(p[0]), cy = Y(sy(p[1]));
    ctx.fillStyle = 'rgba(232,214,170,.75)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, R(0.2), R(0.2 * GK), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(120,170,80,.9)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, R(0.15), R(0.15 * GK), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,140,110,.5)';
    for (let k = 0; k < 26; k++) {
      const a = (k / 26) * TAU + hsh(k) * 0.2, rr2 = 0.165 + 0.025 * hsh(k + 9);
      ctx.beginPath();
      ctx.arc(cx + R(rr2) * Math.cos(a), cy + R(rr2 * GK) * Math.sin(a), R(0.004 + 0.003 * hsh(k + 2)), 0, TAU);
      ctx.fill();
    }
  }
  // 꽃·풀
  for (let k = 0; k < 46; k++) {
    const fx0 = 0.04 + 0.92 * hsh(k + 100), fy0 = 0.22 + 1.04 * hsh(k + 200);
    if (L.posts.some((p) => Math.hypot(fx0 - p[0], (fy0 - sy(p[1])) / GK) < 0.22)) continue;
    if (k % 3) {
      ctx.strokeStyle = 'rgba(60,120,40,.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(X(fx0) - 2, Y(fy0));
      ctx.lineTo(X(fx0) - 3, Y(fy0) - 4);
      ctx.moveTo(X(fx0), Y(fy0));
      ctx.lineTo(X(fx0) + 1, Y(fy0) - 5);
      ctx.moveTo(X(fx0) + 2, Y(fy0));
      ctx.lineTo(X(fx0) + 4, Y(fy0) - 3);
      ctx.stroke();
    } else {
      ctx.fillStyle = ['#ffffff', '#ffe36e', '#ffb3d1'][k % 9 === 0 ? 1 : k % 2 ? 2 : 0];
      for (let j = 0; j < 4; j++) (ctx.beginPath(), ctx.arc(X(fx0) + Math.cos(j * 1.57) * 2.2, Y(fy0) + Math.sin(j * 1.57) * 1.6, 1.7, 0, TAU), ctx.fill());
      ctx.fillStyle = '#ffcf3a';
      ctx.beginPath();
      ctx.arc(X(fx0), Y(fy0), 1.3, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(40,90,30,.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x0, y0, x1 - x0, y1 - y0, rr);
  ctx.stroke();
  // 위쪽 생울타리
  for (let k = 0; k < 12; k++) {
    const bx = X(0.05 + k * 0.082), by = Y(0.195), r = R(0.034 + 0.008 * hsh(k + 50));
    ctx.fillStyle = '#4f9a48';
    ctx.beginPath();
    ctx.arc(bx, by, r, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(190,240,150,.35)';
    ctx.beginPath();
    ctx.arc(bx - r * 0.3, by - r * 0.45, r * 0.35, 0, TAU);
    ctx.fill();
  }
}

function drawPeg(ctx: CanvasRenderingContext2D, x: number, y: number, R: P2, mud: boolean) {
  // 방석
  ctx.fillStyle = 'rgba(30,60,20,.25)';
  ctx.beginPath();
  ctx.ellipse(x + 1, y + 2, R(0.047), R(0.026), 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = mud ? 'rgba(120,85,50,.55)' : '#f3e2b8';
  ctx.beginPath();
  ctx.ellipse(x, y, R(0.044), R(0.024), 0, 0, TAU);
  ctx.fill();
  if (!mud) {
    ctx.strokeStyle = '#d9a35b';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.ellipse(x, y, R(0.033), R(0.017), 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // 작은 나무 말뚝 (방석 뒤)
  const px = x + R(0.036), py = y - R(0.008);
  ctx.fillStyle = '#7a4f2c';
  ctx.fillRect(px - R(0.008), py - R(0.04), R(0.016), R(0.04));
  ctx.fillStyle = '#a8743f';
  ctx.fillRect(px - R(0.008), py - R(0.04), R(0.007), R(0.04));
  ctx.fillStyle = '#c99a62';
  ctx.beginPath();
  ctx.ellipse(px, py - R(0.04), R(0.008), R(0.004), 0, 0, TAU);
  ctx.fill();
}
function drawPuddle(ctx: CanvasRenderingContext2D, x: number, y: number, R: P2, t: number, q: number) {
  const g = ctx.createRadialGradient(x - R(0.02), y - R(0.008), R(0.005), x, y, R(0.075));
  g.addColorStop(0, '#9fb7c9');
  g.addColorStop(0.5, '#6f6a5c');
  g.addColorStop(1, '#5a4030');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y + R(0.004), R(0.075), R(0.04), 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = `rgba(230,245,255,${0.35 + 0.25 * Math.sin(t * 0.05 + q)})`;
  ctx.lineWidth = 1.2;
  const rp = ((t * 0.4 + q * 13) % 30) / 30;
  ctx.beginPath();
  ctx.ellipse(x - R(0.02), y, R(0.01 + 0.03 * rp), R(0.005 + 0.015 * rp), 0, 0, TAU);
  ctx.stroke();
  ctx.font = `${Math.max(12, R(0.034))}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('💧', x - R(0.058), y - R(0.02));
}
function drawBone(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.25);
  const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 1.6);
  glow.addColorStop(0, `rgba(255,240,170,${0.55 + 0.25 * Math.sin(t * 0.12)})`);
  glow.addColorStop(1, 'rgba(255,240,170,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff8ea';
  ctx.strokeStyle = '#c9a46c';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-r * 0.6, -r * 0.18, r * 1.2, r * 0.36, r * 0.1);
  for (const sx of [-1, 1]) for (const sy2 of [-1, 1]) ctx.arc(sx * r * 0.62, sy2 * r * 0.2, r * 0.22, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff8ea';
  ctx.fillRect(-r * 0.6, -r * 0.16, r * 1.2, r * 0.32);
  ctx.restore();
}
function drawKnot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, wrap: boolean, fail: boolean) {
  const sc = 1 + 0.14 * Math.sin(t * 0.2 + x * 0.05);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  ctx.fillStyle = 'rgba(255,60,40,.25)';
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.7, 0, TAU);
  ctx.fill();
  ctx.fillStyle = fail ? '#ff2d20' : '#ff5a3c';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (wrap) ctx.arc(0, 0, r * 0.45, 0.4, TAU - 0.6);
  else ctx.moveTo(-r * 0.45, -r * 0.45), ctx.lineTo(r * 0.45, r * 0.45), ctx.moveTo(r * 0.45, -r * 0.45), ctx.lineTo(-r * 0.45, r * 0.45);
  ctx.stroke();
  ctx.restore();
}

/** 기둥 받침(땅): 돌 원판 + 색 고리 */
function drawPostBase(ctx: CanvasRenderingContext2D, s: LeashState, k: number, x: number, y: number, X: P2, Y: P2, R: P2) {
  const L = s.L, rx = R(RH + 0.03), ry = R((RH + 0.03) * GK);
  ctx.fillStyle = 'rgba(20,40,10,.3)';
  ctx.beginPath();
  ctx.ellipse(x + R(0.01), y + R(0.03), rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#8f8a80';
  ctx.beginPath();
  ctx.ellipse(x, y + R(0.016), rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.fillRect(x - rx, y, rx * 2, R(0.016));
  const g = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.4, 2, x, y, rx);
  g.addColorStop(0, '#e8e3d8');
  g.addColorStop(1, '#b7b0a2');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,110,95,.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 0.62, ry * 0.62, 0, 0, TAU);
  ctx.stroke();
  // 고리
  const off = s.phase === 'walk' && s.pt > 6;
  for (let a = 0; a < L.n; a++) {
    if (L.postOf[a] !== k) continue;
    const hx = X(L.hx[a]), hy = Y(sy(L.hy[a]));
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.ellipse(hx, hy - 1, R(0.013), R(0.011), 0, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = off ? '#9a958c' : COLS[L.col[a]];
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}
function drawPole(ctx: CanvasRenderingContext2D, s: LeashState, k: number, x: number, y: number, R: P2, t: number) {
  const hgt = R(s.L.posts.length > 1 ? 0.17 : 0.22), pw = R(0.024);
  const g = ctx.createLinearGradient(x - pw, 0, x + pw, 0);
  g.addColorStop(0, '#7a4a26');
  g.addColorStop(0.4, '#c58a50');
  g.addColorStop(1, '#6d4020');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x - pw, y - hgt, pw * 2, hgt, [pw, pw, 2, 2]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(80,40,10,.35)';
  ctx.lineWidth = 1;
  for (let j = 1; j < 6; j++) (ctx.beginPath(), ctx.moveTo(x - pw * 0.5, y - (hgt * j) / 6), ctx.lineTo(x + pw * 0.2, y - (hgt * j) / 6 - 3), ctx.stroke());
  // 꼭대기 공 + 깃발
  ctx.fillStyle = '#ff6b5e';
  ctx.beginPath();
  ctx.arc(x, y - hgt, pw * 1.25, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.arc(x - pw * 0.4, y - hgt - pw * 0.4, pw * 0.4, 0, TAU);
  ctx.fill();
  const wv = Math.sin(t * (s.phase === 'walk' ? 0.5 : 0.12)) * R(0.008);
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - hgt - pw);
  ctx.lineTo(x, y - hgt - R(0.07));
  ctx.stroke();
  ctx.fillStyle = k ? '#3b82f6' : '#ffd166';
  ctx.beginPath();
  ctx.moveTo(x, y - hgt - R(0.07));
  ctx.quadraticCurveTo(x + R(0.03), y - hgt - R(0.065) + wv, x + R(0.055), y - hgt - R(0.055) + wv);
  ctx.quadraticCurveTo(x + R(0.03), y - hgt - R(0.045) - wv, x, y - hgt - R(0.04));
  ctx.fill();
  // 팻말
  const sy0 = y - hgt * 0.62;
  ctx.fillStyle = '#f1d9a8';
  ctx.strokeStyle = '#8a5a30';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x - R(0.045), sy0 - R(0.018), R(0.09), R(0.036), 4);
  ctx.fill();
  ctx.stroke();
  ctx.font = `900 ${Math.max(12, R(0.03))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#6b3f1c';
  ctx.fillText('산책', x, sy0 + 1);
}
function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, R: P2, t: number, k: number) {
  ctx.fillStyle = '#6b4325';
  ctx.beginPath();
  ctx.roundRect(x - R(0.014), y - R(0.085), R(0.028), R(0.088), 3);
  ctx.fill();
  ctx.fillStyle = '#8a5a34';
  ctx.fillRect(x - R(0.014), y - R(0.085), R(0.009), R(0.085));
  const sway = Math.sin(t * 0.03 + k) * R(0.004);
  const blobs = [[0, -0.13, 0.05], [-0.035, -0.1, 0.038], [0.036, -0.1, 0.038], [0, -0.085, 0.036]];
  for (const [bx, by, r] of blobs) {
    ctx.fillStyle = '#3f8f3c';
    ctx.beginPath();
    ctx.arc(x + R(bx) + sway, y + R(by), R(r), 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(180,240,140,.45)';
  ctx.beginPath();
  ctx.arc(x - R(0.015) + sway, y - R(0.145), R(0.022), 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ff6b6b';
  for (let j = 0; j < 3; j++) (ctx.beginPath(), ctx.arc(x + R(-0.025 + j * 0.025) + sway, y - R(0.1 + 0.02 * (j % 2)), R(0.006), 0, TAU), ctx.fill());
}

/** 새 장치 소개: 비출 곳들 [x, y(화면), 반지름] */
const INTRO_NAME: Record<string, string> = { treat: '간식 등장!', big: '큰 개 등장!', cat: '고양이 등장!', pair: '짝꿍 등장!', post2: '기둥이 둘!', mud: '웅덩이 등장!', tree: '나무 등장!' };
function introTargets(s: LeashState): number[][] {
  const L = s.L, S = s.S, key = s.intro?.key ?? '', out: number[][] = [];
  const dog = (a: number) => [L.px[S.pos[a]], sy(L.py[S.pos[a]]) - (L.big[a] ? 0.075 : 0.055), L.big[a] ? 0.12 : 0.09];
  if (key === 'treat') L.treat.forEach((b, q) => b >= 0 && out.push([L.px[q], sy(L.py[q]) - 0.01, 0.075]));
  if (key === 'big') L.big.forEach((b, a) => b && out.push(dog(a)));
  if (key === 'pair') L.pair.forEach((b, a) => b >= 0 && out.push(dog(a)));
  if (key === 'cat' && S.cat >= 0) out.push([L.px[S.cat], sy(L.py[S.cat]) - 0.04, 0.085]);
  if (key === 'post2') L.posts.forEach((p) => out.push([p[0], sy(p[1]) - 0.06, 0.13]));
  if (key === 'mud') L.mud.forEach((m, q) => m && out.push([L.px[q], sy(L.py[q]), 0.085]));
  if (key === 'tree') L.trees.forEach((p) => out.push([p[0], sy(p[1]) - 0.07, 0.1]));
  return out;
}
/** 소개 카드·스포트라이트의 진하기 (강아지를 들거나 한 번 옮기면 바로 사라진다) */
function introAlpha(s: LeashState) {
  if (!s.intro || s.phase !== 'play' || s.sel >= 0 || s.S.moves > 0) return 0;
  const age = s.t - s.intro.t, LIFE = 170;
  return age < LIFE ? Math.max(0, Math.min(1, age / 10, (LIFE - age) / 20)) : 0;
}
/** 소품: 말뚝·곰이 없는 구석에만 (소화전 · 벤치 · 꽃덤불) */
const propCache = new WeakMap<object, { kind: string; x: number; y: number }[]>();
function propsOf(s: LeashState) {
  const hit = propCache.get(s.L);
  if (hit) return hit;
  const L = s.L, out: { kind: string; x: number; y: number }[] = [];
  const free = (x: number, y: number, r: number) =>
    L.px.every((px, q) => Math.hypot(px - x, sy(L.py[q]) - y) > r) && Math.hypot(s.bx - x, 1.255 - y) > r + 0.05 && L.trees.every((p) => Math.hypot(p[0] - x, sy(p[1]) - y) > r);
  const spots: [string, number, number][] = [['hydrant', 0.9, 1.22], ['hydrant', 0.1, 1.22], ['bench', 0.15, 0.31], ['bench', 0.85, 0.31], ['bush', 0.06, 0.95], ['bush', 0.94, 0.95], ['bush', 0.06, 0.5], ['bush', 0.94, 0.5]];
  const used = new Set<string>();
  for (const [kind, x, y] of spots) {
    if ((kind !== 'bush' && used.has(kind)) || !free(x, y, kind === 'bench' ? 0.16 : 0.12)) continue;
    used.add(kind);
    out.push({ kind, x, y });
  }
  propCache.set(L, out);
  return out;
}
function drawProp(ctx: CanvasRenderingContext2D, kind: string, x: number, y: number, R: P2, t: number) {
  ctx.fillStyle = 'rgba(20,45,10,.28)';
  ctx.beginPath();
  ctx.ellipse(x, y, R(kind === 'bench' ? 0.08 : 0.04), R(0.016), 0, 0, TAU);
  ctx.fill();
  if (kind === 'hydrant') {
    const g = ctx.createLinearGradient(x - R(0.02), 0, x + R(0.02), 0);
    g.addColorStop(0, '#b8241c');
    g.addColorStop(0.4, '#ff5a4a');
    g.addColorStop(1, '#a01e18');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x - R(0.018), y - R(0.06), R(0.036), R(0.06), 3);
    ctx.fill();
    ctx.fillRect(x - R(0.03), y - R(0.042), R(0.06), R(0.014));
    ctx.beginPath();
    ctx.arc(x, y - R(0.06), R(0.02), Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(x - R(0.022), y - R(0.008), R(0.044), R(0.008));
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.fillRect(x - R(0.01), y - R(0.055), R(0.005), R(0.045));
  } else if (kind === 'bench') {
    ctx.fillStyle = '#5b4030';
    for (const lx of [-0.06, 0.06]) ctx.fillRect(x + R(lx) - 2, y - R(0.03), 4, R(0.03));
    for (let k = 0; k < 2; k++) {
      ctx.fillStyle = k ? '#b07a45' : '#c98f55';
      ctx.beginPath();
      ctx.roundRect(x - R(0.075), y - R(0.035) - k * R(0.012), R(0.15), R(0.011), 2);
      ctx.fill();
    }
    for (let k = 0; k < 2; k++) {
      ctx.fillStyle = k ? '#b07a45' : '#c98f55';
      ctx.beginPath();
      ctx.roundRect(x - R(0.075), y - R(0.075) + k * R(0.016), R(0.15), R(0.012), 2);
      ctx.fill();
    }
    ctx.fillStyle = '#5b4030';
    for (const lx of [-0.06, 0.06]) ctx.fillRect(x + R(lx) - 2, y - R(0.078), 4, R(0.045));
  } else {
    for (const [bx, by, r, c] of [[-0.02, -0.03, 0.032, '#4f9a48'], [0.022, -0.028, 0.03, '#58a84f'], [0, -0.05, 0.03, '#62b457']] as [number, number, number, string][]) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x + R(bx), y + R(by), R(r), 0, TAU);
      ctx.fill();
    }
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = k % 2 ? '#ffb3d1' : '#fff3a0';
      ctx.beginPath();
      ctx.arc(x + R(-0.035 + k * 0.018), y - R(0.035 + 0.02 * ((k * 7) % 3) / 2) + Math.sin(t * 0.04 + k) * 0.6, R(0.007), 0, TAU);
      ctx.fill();
    }
  }
}

interface DogLook { lift: number; face: number; t: number; run: number; tilt: number; wag: boolean; dizzy: boolean; happy: boolean; sel: boolean; mud: boolean; chew: boolean; big: boolean }
/** 앉아 있는 강아지 (x,y = 땅에 닿은 점, u = 몸 크기 px) */
function drawDog(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, B: Breed, collar: string, o: DogLook) {
  const t = o.t;
  // 그림자
  ctx.fillStyle = `rgba(20,45,10,${0.3 * Math.max(0.35, 1 - o.lift / (u * 1.5))})`;
  ctx.beginPath();
  ctx.ellipse(x, y, u * 0.44 * (1 - Math.min(0.35, o.lift / (u * 2.5))), u * 0.14, 0, 0, TAU);
  ctx.fill();
  if (o.sel) {
    ctx.strokeStyle = `rgba(255,246,160,${0.7 + 0.3 * Math.sin(t * 0.3)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(x, y, u * 0.55, u * 0.2, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(x, y - o.lift);
  ctx.rotate(o.tilt + (o.run ? 0.12 * o.face : 0));
  ctx.scale(o.face < 0 ? -1 : 1, 1);
  const dark = B.ear;
  // 꼬리
  const wagA = o.wag ? Math.sin(t * 0.9) * 0.8 : Math.sin(t * 0.05) * 0.2;
  ctx.strokeStyle = dark;
  ctx.lineWidth = u * 0.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-u * 0.26, -u * 0.3);
  ctx.quadraticCurveTo(-u * 0.48, -u * 0.42, -u * 0.44 + Math.sin(wagA) * u * 0.16, -u * 0.68);
  ctx.stroke();
  // 뒷다리·몸
  const bodyG = ctx.createLinearGradient(-u * 0.3, -u * 0.6, u * 0.3, 0);
  bodyG.addColorStop(0, B.light);
  bodyG.addColorStop(0.45, B.body);
  bodyG.addColorStop(1, dark);
  ctx.fillStyle = bodyG;
  ctx.beginPath();
  ctx.ellipse(-u * 0.12, -u * 0.18, u * 0.24, u * 0.18, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0.02 * u, -u * 0.32, u * 0.27, u * 0.3, 0.1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = B.light;
  ctx.beginPath();
  ctx.ellipse(u * 0.1, -u * 0.3, u * 0.12, u * 0.19, 0.1, 0, TAU);
  ctx.fill();
  if (B.spots) {
    ctx.fillStyle = dark;
    for (const [sx, sy2, r] of [[-0.12, -0.34, 0.05], [-0.02, -0.18, 0.04], [-0.2, -0.16, 0.035]]) (ctx.beginPath(), ctx.arc(u * sx, u * sy2, u * r, 0, TAU), ctx.fill());
  }
  // 앞발
  const legK = o.run ? Math.sin(t * 0.6) * u * 0.06 : 0;
  ctx.fillStyle = B.light;
  ctx.beginPath();
  ctx.ellipse(u * 0.03 + legK, -u * 0.04, u * 0.085, u * 0.055, 0, 0, TAU);
  ctx.ellipse(u * 0.2 - legK, -u * 0.04, u * 0.085, u * 0.055, 0, 0, TAU);
  ctx.fill();
  if (o.sel) {
    // 들어 올리면 발을 동동
    const k = Math.sin(t * 0.7) * u * 0.04;
    ctx.fillStyle = B.body;
    ctx.beginPath();
    ctx.ellipse(-u * 0.05, u * 0.02 + k, u * 0.07, u * 0.05, 0, 0, TAU);
    ctx.ellipse(u * 0.14, u * 0.02 - k, u * 0.07, u * 0.05, 0, 0, TAU);
    ctx.fill();
  }
  // 목걸이
  ctx.strokeStyle = collar;
  ctx.lineWidth = u * 0.075;
  ctx.beginPath();
  ctx.ellipse(u * 0.07, -u * 0.53, u * 0.16, u * 0.055, 0.1, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(u * 0.1, -u * 0.47, u * 0.04, 0, TAU);
  ctx.fill();
  // 머리
  const hx = u * 0.09, hy = -u * 0.78 + (o.chew ? Math.sin(t * 0.8) * u * 0.015 : 0);
  if (!B.pointy) {
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(hx - u * 0.2, hy + u * 0.02, u * 0.08, u * 0.17, 0.35 + (o.wag ? Math.sin(t * 0.45) * 0.15 : 0), 0, TAU);
    ctx.fill();
  }
  const headG = ctx.createRadialGradient(hx - u * 0.08, hy - u * 0.1, 1, hx, hy, u * 0.3);
  headG.addColorStop(0, B.light);
  headG.addColorStop(0.55, B.body);
  headG.addColorStop(1, dark);
  ctx.fillStyle = headG;
  ctx.beginPath();
  ctx.arc(hx, hy, u * 0.25, 0, TAU);
  ctx.fill();
  if (B.pointy) {
    ctx.fillStyle = B.body;
    for (const ex of [-0.13, 0.12]) {
      ctx.beginPath();
      ctx.moveTo(hx + u * (ex - 0.07), hy - u * 0.15);
      ctx.lineTo(hx + u * (ex + 0.01), hy - u * 0.36);
      ctx.lineTo(hx + u * (ex + 0.08), hy - u * 0.14);
      ctx.fill();
    }
    ctx.fillStyle = '#f7b8a8';
    for (const ex of [-0.13, 0.12]) (ctx.beginPath(), ctx.moveTo(hx + u * (ex - 0.03), hy - u * 0.17), ctx.lineTo(hx + u * (ex + 0.01), hy - u * 0.28), ctx.lineTo(hx + u * (ex + 0.04), hy - u * 0.16), ctx.fill());
  } else {
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(hx + u * 0.2, hy + u * 0.0, u * 0.07, u * 0.15, -0.35 - (o.wag ? Math.sin(t * 0.45) * 0.15 : 0), 0, TAU);
    ctx.fill();
  }
  if (B.spots) (ctx.fillStyle = dark), ctx.beginPath(), ctx.arc(hx - u * 0.06, hy - u * 0.12, u * 0.05, 0, TAU), ctx.fill();
  if (B.tan) {
    ctx.fillStyle = B.tan;
    for (const ex of [hx - u * 0.05, hx + u * 0.11]) (ctx.beginPath(), ctx.arc(ex, hy - u * 0.12, u * 0.03, 0, TAU), ctx.fill());
    ctx.beginPath();
    ctx.ellipse(hx + u * 0.1, hy + u * 0.13, u * 0.15, u * 0.07, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = B.light;
    ctx.fillRect(hx - u * 0.015, hy - u * 0.22, u * 0.05, u * 0.2);
  }
  // 주둥이·코
  ctx.fillStyle = B.light;
  ctx.beginPath();
  ctx.ellipse(hx + u * 0.1, hy + u * 0.09, u * 0.13, u * 0.09, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a1c18';
  ctx.beginPath();
  ctx.ellipse(hx + u * 0.17, hy + u * 0.04, u * 0.045, u * 0.033, 0, 0, TAU);
  ctx.fill();
  // 입·혀
  if (o.happy || o.chew) {
    ctx.fillStyle = '#ff7a8a';
    ctx.beginPath();
    ctx.ellipse(hx + u * 0.12, hy + u * 0.17 + (o.chew ? 0 : Math.sin(t * 0.5) * u * 0.01), u * 0.045, u * 0.06, 0, 0, TAU);
    ctx.fill();
  }
  if (o.chew) (ctx.fillStyle = '#fff8ea'), ctx.fillRect(hx + u * 0.02, hy + u * 0.13, u * 0.22, u * 0.05);
  ctx.strokeStyle = '#2a1c18';
  ctx.lineWidth = Math.max(1, u * 0.025);
  ctx.beginPath();
  ctx.moveTo(hx + u * 0.06, hy + u * 0.12);
  ctx.quadraticCurveTo(hx + u * 0.12, hy + u * 0.16, hx + u * 0.18, hy + u * 0.11);
  ctx.stroke();
  // 눈
  const ey = hy - u * 0.04;
  for (const ex of [hx - u * 0.04, hx + u * 0.1]) {
    if (o.dizzy) {
      ctx.strokeStyle = '#2a1c18';
      ctx.lineWidth = Math.max(1, u * 0.025);
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = k * 0.9 + t * 0.3, r = u * 0.005 * k;
        k ? ctx.lineTo(ex + Math.cos(a) * r, ey + Math.sin(a) * r) : ctx.moveTo(ex, ey);
      }
      ctx.stroke();
    } else if (o.happy) {
      ctx.strokeStyle = '#2a1c18';
      ctx.lineWidth = Math.max(1.2, u * 0.03);
      ctx.beginPath();
      ctx.arc(ex, ey + u * 0.02, u * 0.035, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (o.sel) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, u * 0.05, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2a1c18';
      ctx.beginPath();
      ctx.arc(ex + u * 0.01, ey + u * 0.005, u * 0.028, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = '#2a1c18';
      ctx.beginPath();
      ctx.arc(ex, ey, u * 0.032, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + u * 0.01, ey - u * 0.012, u * 0.011, 0, TAU);
      ctx.fill();
    }
  }
  // 진흙
  if (o.mud) {
    ctx.fillStyle = 'rgba(110,72,40,.85)';
    for (const [mx, my, r] of [[-0.15, -0.25, 0.08], [0.12, -0.1, 0.06], [-0.02, -0.42, 0.05], [0.16, -0.86, 0.05], [0.02, -0.12, 0.045], [-0.25, -0.12, 0.05]]) (ctx.beginPath(), ctx.arc(u * mx, u * my, u * r, 0, TAU), ctx.fill());
  }
  ctx.restore();
  if (o.dizzy) {
    ctx.font = `${Math.max(12, u * 0.3)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('💫', x + Math.cos(t * 0.15) * u * 0.25, y - o.lift - u * 1.12);
  }
}
function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number, lift: number, face: number) {
  ctx.fillStyle = 'rgba(20,45,10,.28)';
  ctx.beginPath();
  ctx.ellipse(x, y, u * 0.36, u * 0.12, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y - lift);
  ctx.scale(face, 1);
  ctx.strokeStyle = '#e08a3a';
  ctx.lineWidth = u * 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-u * 0.2, -u * 0.08);
  ctx.quadraticCurveTo(-u * 0.5, -u * 0.1, -u * 0.42, -u * 0.45 + Math.sin(t * 0.08) * u * 0.06);
  ctx.stroke();
  const g = ctx.createLinearGradient(-u * 0.3, -u * 0.6, u * 0.3, 0);
  g.addColorStop(0, '#ffd09a');
  g.addColorStop(0.5, '#f4a24c');
  g.addColorStop(1, '#c9762e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.27, u * 0.24, u * 0.28, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,80,20,.6)';
  ctx.lineWidth = u * 0.04;
  for (let k = 0; k < 3; k++) (ctx.beginPath(), ctx.arc(0, -u * 0.27, u * (0.12 + k * 0.05), 3.6, 4.4), ctx.stroke());
  ctx.fillStyle = '#fff1de';
  ctx.beginPath();
  ctx.ellipse(u * 0.06, -u * 0.25, u * 0.1, u * 0.17, 0, 0, TAU);
  ctx.fill();
  const hx = u * 0.04, hy = -u * 0.66;
  ctx.fillStyle = '#f4a24c';
  for (const ex of [-0.13, 0.13]) (ctx.beginPath(), ctx.moveTo(hx + u * (ex - 0.08), hy - u * 0.08), ctx.lineTo(hx + u * ex, hy - u * 0.3), ctx.lineTo(hx + u * (ex + 0.08), hy - u * 0.08), ctx.fill());
  ctx.beginPath();
  ctx.ellipse(hx, hy, u * 0.22, u * 0.19, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff1de';
  ctx.beginPath();
  ctx.ellipse(hx + u * 0.03, hy + u * 0.07, u * 0.1, u * 0.07, 0, 0, TAU);
  ctx.fill();
  // 우쭐한 반쯤 감은 눈
  ctx.strokeStyle = '#3a2410';
  ctx.lineWidth = Math.max(1.2, u * 0.035);
  for (const ex of [-0.07, 0.11]) (ctx.beginPath(), ctx.moveTo(hx + u * (ex - 0.045), hy - u * 0.03), ctx.lineTo(hx + u * (ex + 0.045), hy - u * 0.03), ctx.stroke());
  ctx.fillStyle = '#3a2410';
  for (const ex of [-0.07, 0.11]) (ctx.beginPath(), ctx.arc(hx + u * ex, hy - u * 0.015, u * 0.025, 0, Math.PI), ctx.fill());
  ctx.fillStyle = '#ff8fa3';
  ctx.beginPath();
  ctx.arc(hx + u * 0.03, hy + u * 0.04, u * 0.025, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = 1;
  for (const sgn of [-1, 1]) (ctx.beginPath(), ctx.moveTo(hx + u * 0.03 + sgn * u * 0.08, hy + u * 0.06), ctx.lineTo(hx + u * 0.03 + sgn * u * 0.24, hy + u * 0.03), ctx.stroke());
  ctx.restore();
}
function drawPigeon(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number, flying: boolean, face = 1) {
  if (!flying) {
    ctx.fillStyle = 'rgba(20,45,10,.25)';
    ctx.beginPath();
    ctx.ellipse(x, y, u * 0.4, u * 0.12, 0, 0, TAU);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  const peck = !flying && Math.sin(t * 0.07) > 0.6 ? u * 0.2 : 0;
  ctx.fillStyle = '#9aa3b5';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.35, u * 0.36, u * 0.24, -0.15, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#7f8aa0';
  if (flying) {
    const fl = Math.sin(t * 1.2) * u * 0.4;
    ctx.beginPath();
    ctx.ellipse(-u * 0.05, -u * 0.5 - fl * 0.5, u * 0.3, u * 0.1, -0.6, 0, TAU);
    ctx.fill();
  } else (ctx.beginPath(), ctx.ellipse(-u * 0.08, -u * 0.36, u * 0.22, u * 0.13, -0.2, 0, TAU), ctx.fill());
  ctx.fillStyle = '#6fb59a';
  ctx.beginPath();
  ctx.ellipse(u * 0.22, -u * 0.5 + peck * 0.5, u * 0.12, u * 0.14, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#8e97ab';
  ctx.beginPath();
  ctx.arc(u * 0.3, -u * 0.66 + peck, u * 0.13, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#e8a050';
  ctx.beginPath();
  ctx.moveTo(u * 0.4, -u * 0.68 + peck);
  ctx.lineTo(u * 0.52, -u * 0.62 + peck);
  ctx.lineTo(u * 0.4, -u * 0.6 + peck);
  ctx.fill();
  ctx.fillStyle = '#ff7a3a';
  ctx.beginPath();
  ctx.arc(u * 0.33, -u * 0.69 + peck, u * 0.03, 0, TAU);
  ctx.fill();
  if (!flying) {
    ctx.strokeStyle = '#e88a8a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-u * 0.05, -u * 0.13);
    ctx.lineTo(-u * 0.05, 0);
    ctx.moveTo(u * 0.07, -u * 0.13);
    ctx.lineTo(u * 0.07, 0);
    ctx.stroke();
  }
  ctx.restore();
}
/** 곰 도우미: 표정이 판의 흐름을 따라간다 */
function drawBear(ctx: CanvasRenderingContext2D, s: LeashState, x: number, y: number, u: number, t: number, lean: number) {
  const mood = s.mood, dir = s.bx < 0.5 ? 1 : -1, fallen = s.phase === 'fail' || (s.phase === 'result' && !s.ok);
  ctx.fillStyle = 'rgba(20,45,10,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y, u * 0.38, u * 0.11, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  if (fallen) ctx.translate(0, -u * 0.12), ctx.rotate(dir * Math.min(1.3, (s.phase === 'fail' ? s.pt : 99) / 20));
  else ctx.rotate(lean * 0.6);
  ctx.scale(dir, 1);
  const kick = s.phase === 'walk' && s.pt > WALK_B ? Math.sin(t * 0.8) * u * 0.08 : 0;
  // 다리
  ctx.fillStyle = '#6e4428';
  ctx.beginPath();
  ctx.ellipse(-u * 0.12, -u * 0.06 + kick, u * 0.1, u * 0.07, 0, 0, TAU);
  ctx.ellipse(u * 0.12, -u * 0.06 - kick, u * 0.1, u * 0.07, 0, 0, TAU);
  ctx.fill();
  // 몸 + 조끼
  const g = ctx.createLinearGradient(-u * 0.3, -u * 0.7, u * 0.3, 0);
  g.addColorStop(0, '#b07a4f');
  g.addColorStop(1, '#7a4c2c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.33, u * 0.27, u * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#9be15d';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.32, u * 0.24, u * 0.24, 0, 0.4, Math.PI - 0.4);
  ctx.lineTo(-u * 0.16, -u * 0.48);
  ctx.lineTo(u * 0.16, -u * 0.48);
  ctx.fill();
  ctx.fillStyle = '#fff36a';
  ctx.fillRect(-u * 0.2, -u * 0.3, u * 0.4, u * 0.04);
  ctx.fillStyle = '#e6c49a';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.26, u * 0.1, u * 0.12, 0, 0, TAU);
  ctx.fill();
  // 팔
  const up = mood === 'cheer' && !fallen;
  ctx.fillStyle = '#8b5a36';
  ctx.beginPath();
  if (s.phase === 'walk') ctx.ellipse(u * 0.26, -u * 0.55, u * 0.08, u * 0.17, -1.2, 0, TAU);
  else ctx.ellipse(u * 0.25, up ? -u * 0.68 : -u * 0.38, u * 0.075, u * 0.15, up ? -0.4 : 0.35, 0, TAU);
  ctx.ellipse(-u * 0.25, up ? -u * 0.68 : -u * 0.38, u * 0.075, u * 0.15, up ? 0.4 : -0.35, 0, TAU);
  ctx.fill();
  if (s.phase !== 'walk' && !up) {
    // 기록판
    ctx.fillStyle = '#c99a62';
    ctx.fillRect(u * 0.18, -u * 0.42, u * 0.16, u * 0.2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(u * 0.2, -u * 0.39, u * 0.12, u * 0.15);
    ctx.fillStyle = '#9aa';
    for (let k = 0; k < 3; k++) ctx.fillRect(u * 0.215, -u * 0.36 + k * u * 0.04, u * 0.09, u * 0.012);
  }
  // 머리
  const hx = u * 0.02, hy = -u * 0.78;
  ctx.fillStyle = '#8b5a36';
  for (const ex of [-0.17, 0.19]) (ctx.beginPath(), ctx.arc(hx + u * ex, hy - u * 0.15, u * 0.08, 0, TAU), ctx.fill());
  const hg = ctx.createRadialGradient(hx - u * 0.06, hy - u * 0.06, 1, hx, hy, u * 0.24);
  hg.addColorStop(0, '#c08a5c');
  hg.addColorStop(1, '#85522f');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(hx, hy, u * 0.22, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#e6c49a';
  ctx.beginPath();
  ctx.ellipse(hx + u * 0.05, hy + u * 0.08, u * 0.1, u * 0.075, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a1c18';
  ctx.beginPath();
  ctx.ellipse(hx + u * 0.07, hy + u * 0.05, u * 0.035, u * 0.026, 0, 0, TAU);
  ctx.fill();
  // 모자 (끌려가면 날아간다)
  const hatOff = s.phase === 'walk' && s.pt > WALK_B + 10 ? Math.min(1, (s.pt - WALK_B - 10) / 30) : 0;
  ctx.save();
  ctx.translate(-hatOff * u * 0.6, -hatOff * u * 0.5);
  ctx.rotate(-hatOff * 1.5);
  ctx.fillStyle = '#ff5a4f';
  ctx.beginPath();
  ctx.arc(hx, hy - u * 0.1, u * 0.19, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(hx, hy - u * 0.12, u * 0.26, u * 0.045);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(hx, hy - u * 0.29, u * 0.035, 0, TAU);
  ctx.fill();
  ctx.restore();
  // 표정
  const ey = hy - u * 0.02;
  ctx.strokeStyle = '#2a1c18';
  ctx.fillStyle = '#2a1c18';
  ctx.lineWidth = Math.max(1.2, u * 0.025);
  for (const ex of [hx - u * 0.07, hx + u * 0.1]) {
    if (fallen || mood === 'dizzy') {
      ctx.beginPath();
      ctx.moveTo(ex - u * 0.03, ey - u * 0.03);
      ctx.lineTo(ex + u * 0.03, ey + u * 0.03);
      ctx.moveTo(ex + u * 0.03, ey - u * 0.03);
      ctx.lineTo(ex - u * 0.03, ey + u * 0.03);
      ctx.stroke();
    } else if (mood === 'smug' || mood === 'cheer' || s.phase === 'walk') {
      ctx.beginPath();
      ctx.arc(ex, ey + u * 0.015, u * 0.03, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (mood === 'wow') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, u * 0.04, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2a1c18';
      ctx.beginPath();
      ctx.arc(ex, ey, u * 0.02, 0, TAU);
      ctx.fill();
    } else (ctx.beginPath(), ctx.arc(ex, ey, u * 0.022, 0, TAU), ctx.fill());
  }
  ctx.beginPath();
  if (mood === 'wow' || s.phase === 'walk') (ctx.fillStyle = '#5a2a20'), ctx.ellipse(hx + u * 0.06, hy + u * 0.14, u * 0.035, u * 0.045, 0, 0, TAU), ctx.fill();
  else if (mood === 'worry') ctx.arc(hx + u * 0.06, hy + u * 0.17, u * 0.04, Math.PI * 1.15, Math.PI * 1.85), ctx.stroke();
  else ctx.arc(hx + u * 0.06, hy + u * 0.1, u * 0.045, 0.2, Math.PI - 0.2), ctx.stroke();
  if (mood === 'worry') {
    ctx.fillStyle = '#8fd3ff';
    ctx.beginPath();
    ctx.ellipse(hx - u * 0.18, hy - u * 0.02 + ((t * 0.4) % 8), u * 0.025, u * 0.04, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  if (fallen || mood === 'dizzy') {
    ctx.font = `${Math.max(12, u * 0.18)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 3; k++) ctx.fillText('⭐', x + Math.cos(t * 0.12 + k * 2.1) * u * 0.3, y - u * 0.55 + Math.sin(t * 0.12 + k * 2.1) * u * 0.08);
  }
}

/** 들어 올린 강아지를 빈 말뚝 q에 놓으면? (꼬임 수, 간식, 진흙, 짝꿍, 고양이) */
interface PV { q: number; x: number; ok: boolean; eat: boolean; mud: boolean; follow: number; cost: number }
const pvCache = new WeakMap<object, { key: string; list: PV[] }>();
function previewAll(s: LeashState): PV[] {
  const L = s.L, S = s.S, key = `${s.sel}:${keyOf(L, S)}:${S.cost}:${s.stage}`, c = pvCache.get(s);
  if (c && c.key === key) return c.list;
  const list: PV[] = [];
  for (let q = 0; q < L.m; q++) {
    if (busy(S, q)) continue;
    const T = cloneSim(S), rec: RE[] = [];
    const ok = canMove(L, S, s.sel, q);
    if (ok) apply(L, T, s.sel, q, rec);
    list.push({ q, x: ok ? T.x : -1, ok, eat: rec.some((e) => e.k === 'eat'), mud: rec.some((e) => e.k === 'mud'), follow: (rec.find((e) => e.k === 'follow') as { to: number } | undefined)?.to ?? -1, cost: T.cost - S.cost });
  }
  pvCache.set(s, { key, list });
  return list;
}
function drawBubble(ctx: CanvasRenderingContext2D, s: LeashState, pv: PV, x: number, y: number, R: P2, font: Font, t: number) {
  const S = s.S, L = s.L, by = y - R(0.075) + Math.sin(t * 0.15 + pv.q) * 1.5, r = R(0.034);
  if (!pv.ok) {
    font(0.034, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(40,20,10,.75)';
    ctx.beginPath();
    ctx.arc(x, by, r * 0.8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffd0c8';
    ctx.fillText('✗', x, by + 1);
    return;
  }
  const col = pv.x === 0 ? '#ffcf3a' : pv.x < S.x ? '#2fbf62' : pv.x === S.x ? '#f29a38' : '#ef5350';
  // 짝꿍이 따라갈 자리: 점선
  if (pv.follow >= 0) {
    ctx.strokeStyle = 'rgba(255,150,210,.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(R(L.px[pv.follow]), R(sy(L.py[pv.follow])));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.arc(x + 1.5, by + 2, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(x, by, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.35, by + r * 0.85);
  ctx.lineTo(x, by + r * 1.35);
  ctx.lineTo(x + r * 0.35, by + r * 0.85);
  ctx.fillStyle = col;
  ctx.fill();
  font(0.046, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = pv.x === 0 ? '#5a3a00' : '#ffffff';
  ctx.fillText(String(pv.x), x, by + 1);
  // 곁들이: 간식 · 진흙 +1 · 짝꿍
  const tags: string[] = [];
  if (pv.eat) tags.push('🦴');
  if (pv.mud) tags.push('+1');
  if (pv.follow >= 0) tags.push('💞');
  if (tags.length) {
    font(0.032, 900);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    const tx = tags.join('');
    ctx.strokeText(tx, x + r * 0.95, by - r * 0.55);
    ctx.fillText(tx, x + r * 0.95, by - r * 0.55);
  }
  if (pv.x === 0) {
    ctx.fillStyle = '#fff6a8';
    for (let k = 0; k < 3; k++) {
      const a = t * 0.1 + (k * TAU) / 3;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 1.45, by + Math.sin(a) * r * 1.45, 2, 0, TAU);
      ctx.fill();
    }
  }
}

function drawHud(ctx: CanvasRenderingContext2D, s: LeashState, d: StageDef, w: number, X: P2, Y: P2, R: P2, font: Font, th: Theme) {
  const t = s.t, S = s.S, L = s.L;
  const hb = R(0.068);
  ctx.fillStyle = 'rgba(20,45,22,.86)';
  ctx.fillRect(0, 0, w, hb);
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fffbea';
  ctx.fillText(`${s.stage + 1}/${STAGES.length}판 · ${d.emoji} ${d.name}`, R(0.03), hb * 0.52);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);
  // 나무 팻말 셋: 남은 횟수 · 꼬임 · 간식
  const left = L.limit - S.cost, warn = left <= 1 && S.x > 0 && (s.phase === 'play' || s.phase === 'hop');
  const signs = [
    { x: 0.02, w: 0.3, txt: `👣 ${Math.max(0, left)}번 남음`, col: warn ? (t % 30 < 15 ? '#ff8a7a' : '#ffffff') : '#fffbea' },
    { x: 0.345, w: 0.31, txt: `🪢 꼬임 ${S.x}`, col: S.x === 0 ? '#c8f7c5' : '#ffe0d6' },
    { x: 0.68, w: 0.3, txt: `🦴 ${popcount(S.eaten)}/${L.nT}`, col: S.eaten === (1 << L.nT) - 1 ? '#fff1a8' : '#fffbea' },
  ];
  for (const sg of signs) {
    const sx = X(sg.x), sw = R(sg.w), sy0 = Y(0.08), sh = R(0.066);
    ctx.fillStyle = 'rgba(40,25,10,.35)';
    ctx.beginPath();
    ctx.roundRect(sx + 2, sy0 + 3, sw, sh, 8);
    ctx.fill();
    const g = ctx.createLinearGradient(0, sy0, 0, sy0 + sh);
    g.addColorStop(0, '#c58b53');
    g.addColorStop(1, '#94602f');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(sx, sy0, sw, sh, 8);
    ctx.fill();
    ctx.strokeStyle = '#6b3f1c';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#6b3f1c';
    for (const nx of [sx + 6, sx + sw - 6]) (ctx.beginPath(), ctx.arc(nx, sy0 + sh / 2, 1.8, 0, TAU), ctx.fill());
    font(sg.x > 0.3 && sg.x < 0.6 ? 0.046 : 0.04, 900);
    ctx.textAlign = 'center';
    ctx.fillStyle = sg.col;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(60,30,10,.6)';
    ctx.strokeText(sg.txt, sx + sw / 2, sy0 + sh / 2 + 1);
    ctx.fillText(sg.txt, sx + sw / 2, sy0 + sh / 2 + 1);
  }
  // 새것 알림
  if (s.news && t - s.news.t < NEWS_T + 20 && introAlpha(s) === 0) {
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T + 20 - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    const tx = `✨ ${s.news.text}`;
    let fs = 0.036;
    font(fs, 900);
    while (ctx.measureText(tx).width > w - R(0.05) && fs > 0.03) font((fs -= 0.001), 900);
    const tw2 = Math.min(w - 8, ctx.measureText(tx).width + 22), by2 = Y(0.188) - drop;
    ctx.fillStyle = 'rgba(25,55,25,.9)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.027), tw2, R(0.054), R(0.027));
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fffbea';
    ctx.fillText(tx, w / 2, by2 + 1);
    ctx.globalAlpha = 1;
  }
  // 판 시작 큰 글씨
  {
    const age = t - s.startT;
    if (age < 90 && s.phase === 'play' && S.moves === 0 && s.sel < 0 && !s.intro) {
      const a = Math.min(1, age / 8, (90 - age) / 20), sc = 1 + Math.max(0, 8 - age) * 0.04;
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(w / 2, Y(0.6));
      ctx.scale(sc, sc);
      font(0.072, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(20,40,10,.75)';
      const big = `${d.emoji} ${s.stage + 1}판 · ${d.name}`;
      ctx.strokeText(big, 0, 0);
      ctx.fillStyle = '#fffbea';
      ctx.fillText(big, 0, 0);
      font(0.04, 800);
      const sub = `꼬임 ${S.x}개 · ${L.limit}번 안에 풀어요`;
      ctx.strokeText(sub, 0, R(0.065));
      ctx.fillText(sub, 0, R(0.065));
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  // ═════════ 한 수에 여러 꼬임이 풀린 순간: 떠오르는 큰 숫자 ═════════
  const bm = s.boom;
  if (bm && !bm.solved && bm.n >= 2) {
    const age = t - bm.t, life = bm.dur + 24;
    if (age >= 0 && age < life) {
      const k = Math.min(bm.n, 6), sc = age < 6 ? 0.3 + (age / 6) * 1.05 : 1.35 - Math.min(0.35, (age - 6) * 0.035);
      const above = bm.y - 0.17 >= 0.4, a = Math.min(1, (life - age) / 14), x = Math.max(R(0.2), Math.min(w - R(0.2), X(bm.x))), y = Y(above ? bm.y - 0.17 : bm.y + 0.15) - age * 0.45;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(x, y);
      ctx.scale(sc, sc);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      font(0.042 + 0.004 * k, 900);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(10,50,20,.85)';
      const lab = bm.n >= 4 ? '왕창 풀림!' : bm.n === 3 ? '트리플 풀림!' : '더블 풀림!';
      ctx.strokeText(lab, 0, -R(0.075));
      ctx.fillStyle = bm.n >= 4 ? '#ffe066' : '#ffffff';
      ctx.fillText(lab, 0, -R(0.075));
      font(0.1 + 0.014 * k, 900);
      ctx.lineWidth = 6;
      ctx.strokeText(`−${bm.n}`, 0, R(0.005));
      const g = ctx.createLinearGradient(0, -R(0.06), 0, R(0.06));
      g.addColorStop(0, '#eafff0');
      g.addColorStop(1, bm.n >= 4 ? '#ffd23a' : '#5ff08a');
      ctx.fillStyle = g;
      ctx.fillText(`−${bm.n}`, 0, R(0.005));
      ctx.restore();
    }
  }
  // ═════════ 다 풀린 순간: 햇살 띠 + 큰 글씨 ═════════
  if (bm && bm.solved) {
    const age = t - bm.t, life = bm.dur + 46;
    if (age >= 0 && age < life) {
      const a = Math.min(1, age / 4, (life - age) / 16), sc = age < 8 ? 0.4 + (age / 8) * 0.9 : 1.3 - Math.min(0.3, (age - 8) * 0.025), cy = Y(0.46);
      ctx.save();
      ctx.globalAlpha = a * 0.35;
      ctx.translate(w / 2, cy);
      ctx.rotate(t * 0.01);
      ctx.fillStyle = '#fff3b0';
      for (let k = 0; k < 12; k++) {
        ctx.rotate(TAU / 12);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(R(0.8), -R(0.07));
        ctx.lineTo(R(0.8), R(0.07));
        ctx.fill();
      }
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cy);
      ctx.scale(sc, sc);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      font(0.095, 900);
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(90,50,0,.85)';
      ctx.strokeText('🐾 산책 출발!', 0, 0);
      const g = ctx.createLinearGradient(0, -R(0.05), 0, R(0.05));
      g.addColorStop(0, '#fffbe0');
      g.addColorStop(1, '#ffc93c');
      ctx.fillStyle = g;
      ctx.fillText('🐾 산책 출발!', 0, 0);
      font(0.042, 900);
      ctx.lineWidth = 4;
      const sub = bm.n >= 2 ? `마지막 한 번에 꼬임 ${bm.n}개!` : '꼬임 0 — 다 풀렸다!';
      ctx.strokeText(sub, 0, R(0.075));
      ctx.fillStyle = '#ffffff';
      ctx.fillText(sub, 0, R(0.075));
      ctx.restore();
    }
  }
  // ═════════ 새 장치 소개 카드 ═════════
  const ia = introAlpha(s);
  if (ia > 0) {
    const age = t - s.intro!.t, tg = introTargets(s);
    const far = (cy: number) => Math.min(...tg.map(([, y]) => Math.abs(y - cy)));
    const cyU = [0.66, 0.98, 0.42].reduce((b, c) => (far(c) > far(b) + 0.02 ? c : b)), cy = Y(cyU), cw = w * 0.88, ch = R(0.2), sc = age < 8 ? 0.6 + (age / 8) * 0.45 : 1.05 - Math.min(0.05, (age - 8) * 0.01);
    ctx.save();
    ctx.globalAlpha = ia;
    ctx.translate(w / 2, cy);
    ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.roundRect(-cw / 2 + 3, -ch / 2 + 5, cw, ch, 14);
    ctx.fill();
    ctx.fillStyle = '#fffbea';
    ctx.strokeStyle = '#3f8f3c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 14);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.translate(-cw / 2 + R(0.05), -ch / 2 + R(0.012));
    ctx.rotate(-0.25);
    ctx.fillStyle = '#ff5a4f';
    ctx.beginPath();
    ctx.roundRect(-R(0.06), -R(0.022), R(0.12), R(0.044), 6);
    ctx.fill();
    font(0.032, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('NEW!', 0, 1);
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    font(0.062, 900);
    ctx.fillStyle = '#2f6b2c';
    ctx.fillText(`${d.emoji} ${INTRO_NAME[s.intro!.key] ?? d.name}`, 0, -R(0.052));
    let fs = 0.036;
    font(fs, 800);
    while (ctx.measureText(d.news).width > cw - R(0.05) && fs > 0.03) font((fs -= 0.001), 800);
    ctx.fillStyle = '#4a3a20';
    ctx.fillText(d.news, 0, R(0.012));
    font(0.034, 800);
    ctx.fillStyle = '#8a7a5a';
    ctx.fillText(`${s.stage + 1}판 · 꼬임 ${S.x}개 · ${L.limit}번 안에 풀어요`, 0, R(0.064));
    ctx.restore();
  }
  // 결과
  if (s.phase === 'result') {
    const age = s.pt, a = Math.min(1, age / 10);
    ctx.globalAlpha = a;
    ctx.fillStyle = s.ok ? 'rgba(30,60,20,.66)' : 'rgba(70,20,20,.62)';
    ctx.fillRect(0, Y(0.56), w, R(0.27));
    ctx.textAlign = 'center';
    font(s.ok ? 0.06 : 0.052, 900);
    ctx.fillStyle = s.ok ? '#fff1a8' : '#ffd0c8';
    ctx.fillText(s.ok ? (s.won ? '공원 산책 완주! 🎉' : '🐾 산책 출발 성공!') : s.why, w / 2, Y(0.62));
    if (s.ok) {
      for (let k = 0; k < 3; k++) {
        const ag = age - 14 - k * 10, got = k < s.got;
        if (ag < 0) continue;
        const sc = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(0.08 * sc, 900);
        ctx.fillStyle = got ? '#ffd166' : 'rgba(255,255,255,.35)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (k - 1) * R(0.1), Y(0.71));
        if (got && (juice(s).memo['star' + k] ?? -1) < s.clearT) (juice(s).memo['star' + k] = s.clearT), juice(s).burst(w / 2 + (k - 1) * R(0.1), Y(0.71), '#ffe066', 14, 3, 2.4);
      }
      font(0.036, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`옮긴 횟수 ${S.cost} (최소 ${L.par}) · 🦴 ${popcount(S.eaten)}/${L.nT}`, w / 2, Y(0.79));
    } else {
      font(0.042, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.hearts > 0 ? '♥ -1 · 이 산책로를 처음부터 다시' : '하트를 다 썼어요 — 오늘 산책 끝', w / 2, Y(0.71));
    }
    ctx.globalAlpha = 1;
  }
  // ═════════ 아래 띠: 별 목표 · 안내 ═════════
  {
    const y0 = Y(1.3);
    ctx.fillStyle = 'rgba(20,45,22,.86)';
    ctx.fillRect(0, y0, w, Y(A) - y0);
    const done = s.phase === 'result' && s.ok, solvedNow = S.x === 0;
    const chips = [
      { txt: '꼬임 0', st: solvedNow || done ? true : null },
      { txt: `${L.par}번 안에`, st: S.cost > L.par ? false : done || solvedNow ? true : null },
      { txt: `🦴 ${L.nT}개 모두`, st: S.eaten === (1 << L.nT) - 1 ? true : solvedNow ? false : null },
    ];
    const gw = (w - R(0.04)) / 3, y2 = Y(1.338);
    chips.forEach(({ txt, st }, k) => {
      const gx = R(0.02) + k * gw;
      ctx.fillStyle = st === true ? 'rgba(255,209,102,.32)' : st === false ? 'rgba(0,0,0,.3)' : 'rgba(255,255,230,.12)';
      ctx.beginPath();
      ctx.roundRect(gx + 2, y2 - R(0.026), gw - 4, R(0.052), R(0.026));
      ctx.fill();
      ctx.textAlign = 'center';
      font(0.036, 800);
      ctx.fillStyle = st === false ? 'rgba(255,255,255,.45)' : '#fffbe6';
      ctx.fillText(`${st === true ? '★' : st === false ? '✗' : '☆'} ${txt}`, gx + gw / 2, y2 + 1);
    });
    let tp = d.tip;
    if (s.phase === 'walk') tp = '🐾 다 풀렸다 — 산책 출발!';
    else if (s.phase === 'fail') tp = '줄이 뱅글뱅글… 곰 도우미가 벌러덩!';
    else if (s.phase === 'result') tp = s.ok ? '다음 산책로로 가요!' : '같은 판을 다시 — 숫자를 보고 순서를 짜요';
    else if (s.sel >= 0) tp = '👆 빈 말뚝을 톡 — 숫자 = 그리 가면 남는 꼬임';
    else if (s.stage === 0 && S.moves === 0) tp = '👆 강아지를 톡 → 빈 말뚝을 톡!';
    else if (left <= 1 && S.x > 0) tp = '⚠ 마지막 한 번! 숫자 0 자리를 찾아요';
    font(0.037, 800);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,251,230,.95)';
    let fs = 0.037;
    while (ctx.measureText(tp).width > w - R(0.04) && fs > 0.03) font((fs -= 0.001), 800);
    ctx.fillText(tp, w / 2, Y(1.405));
  }
  ctx.textBaseline = 'alphabetic';
}
const popcount = (m: number) => {
  let c = 0;
  for (; m; m &= m - 1) c++;
  return c;
};
