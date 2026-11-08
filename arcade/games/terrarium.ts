/**
 * 기울이는 유리병 정원 (19라운드 메뉴 2번) — 농사·수확 × 중력 뒤집기 · 한 번 밀기.
 * 기준 9(조작 최소): 손이 하는 일은 '한 번 밀기'뿐. ← → 는 둥근 유리병이 그쪽으로 데굴(90°), ↑ 는 뒤집기(180°), ↓ 는 병 속에 비.
 * 와우: 밀면 병이 굴러 흙·물·씨앗이 와르르 — 물이 닿은 씨앗은 그 자리에서 쑥 자라는데, 그 자리의 빛·그늘·물기대로 꽃·이끼·버섯이 된다.
 * 첫 3초: 왼쪽으로 한 번 밀면 웅덩이 물이 씨앗들 위로 쏟아져 새싹이 '뽁뽁뽁'.
 * 고민 거리(17라운드 '한쪽으로 몰면 너무 쉬움' 반영): 한쪽으로만 굴리면 한 종류만 자란다. 빛은 늘 위(창)에서 오고 바위는 병에 붙어 함께 돈다 —
 *   바위 그늘(이끼)·햇빛(꽃)·그늘 웅덩이(버섯)에 씨앗을 보내야 하고, 씨앗은 물을 한 칸씩 마신다.
 * 목표·보상: 판마다 목표 정원(예: 🌸2 🌿1)을 정해진 밀기 안에 — 적게 밀수록 별. 실패하면 하트 -1, 그 판만 다시. 병 열 개를 채우면 끝.
 * 하는 일이 바뀐다: 바위 그늘·이끼(2판) → 버섯(3판, 그늘+흠뻑) → 나비(4판, 꽃 둘이 붙으면 — 씨앗을 떨굼) → 달팽이(5판, 이끼 둘이 붙으면 — 기어다니며 씨앗을 틔움)
 *                  → 해질녘 옆 창 빛(6판, 그늘이 옆으로 생김) → 연꽃(7판, 햇빛+흠뻑).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const N = 12, CEN = 6, A = 1.32, STEP = 3, ROT = 14;
export const E = 0, SOIL = 1, WATER = 2, SEED = 3, ROCK = 4, PLANT = 5;
export const FLOWER = 1, MOSS = 2, MUSH = 3, LOTUS = 4;
const PAIRED = 8;
type Dir = 'up' | 'down' | 'left' | 'right';
type GoalKey = 'any' | 'flower' | 'moss' | 'mush' | 'lotus' | 'bfly' | 'snail';
type Goal = Partial<Record<GoalKey, number>>;
export const ICON: Record<GoalKey, string> = { any: '🌱', flower: '🌸', moss: '🌿', mush: '🍄', lotus: '🪷', bfly: '🦋', snail: '🐌' };
const PLANT_ICON = ['', '🌸', '🌿', '🍄', '🪷'];
const PLANT_COL = ['', '#ff8fb8', '#7bd88f', '#ff9a6b', '#ffb3e6'];

/** 둥근 병 = 12×12 격자 중 원 안의 칸 112개 */
const INSIDE = new Uint8Array(N * N);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) INSIDE[y * N + x] = (x + 0.5 - CEN) ** 2 + (y + 0.5 - CEN) ** 2 <= CEN * CEN ? 1 : 0;
const at = (x: number, y: number) => (x < 0 || y < 0 || x >= N || y >= N || !INSIDE[y * N + x] ? -1 : y * N + x);
/** 화면 벡터 → 병 기준 벡터 (병이 시계 방향으로 o × 90° 돌아 있을 때) */
const rotJ = (o: number, x: number, y: number): [number, number] => {
  for (let k = 0; k < o; k++) [x, y] = [y, -x];
  return [x + 0, y + 0];
};
/** 병 기준 중력: 화면 아래쪽 */
const G = [0, 1, 2, 3].map((o) => rotJ(o, 0, 1));
/** 중력 쪽 칸부터 처리하는 순서 (o, 홀짝) — 떨어지는 기둥이 한 덩어리로 움직이게 */
const ORDER = [0, 1, 2, 3].map((o) =>
  [0, 1].map((par) => {
    const [gx, gy] = G[o], px = gy ? 1 : 0, py = gx ? 1 : 0, idx: number[] = [];
    for (let i = 0; i < N * N; i++) if (INSIDE[i]) idx.push(i);
    return idx.sort((a, b) => {
      const da = (a % N) * gx + ((a / N) | 0) * gy, db = (b % N) * gx + ((b / N) | 0) * gy;
      if (da !== db) return db - da;
      const pa = (a % N) * px + ((a / N) | 0) * py, pb = (b % N) * px + ((b / N) | 0) * py;
      return par ? pb - pa : pa - pb;
    });
  }),
);

export interface Jar { k: Uint8Array; v: Uint8Array; o: Uint8Array; b: Int32Array; mx: Int8Array; my: Int8Array }
const newJar = (): Jar => ({ k: new Uint8Array(N * N), v: new Uint8Array(N * N), o: new Uint8Array(N * N), b: new Int32Array(N * N), mx: new Int8Array(N * N), my: new Int8Array(N * N) });
const cloneJar = (j: Jar): Jar => ({ k: j.k.slice(), v: j.v.slice(), o: j.o.slice(), b: j.b.slice(), mx: j.mx.slice(), my: j.my.slice() });

/** 판마다 켜지는 것: 빛(0 위 창 · 1 왼쪽 창), 버섯·연꽃·나비·달팽이 */
interface Feat { light: 0 | 1; mush: boolean; lotus: boolean; bfly: boolean; snail: boolean }
interface Born { bfly: number; snail: number }
interface Hook { t: number; f: Feat; born: Born; on?: (i: number, type: number, birth: '' | 'bfly' | 'snail') => void }

const DONE = new Uint8Array(N * N);
const passable = (K: number) => K === E || K === WATER;
function swap(j: Jar, a: number, b: number) {
  let q = j.k[a];
  (j.k[a] = j.k[b]), (j.k[b] = q);
  q = j.v[a];
  (j.v[a] = j.v[b]), (j.v[b] = q);
  const dx = (a % N) - (b % N), dy = ((a / N) | 0) - ((b / N) | 0);
  (j.mx[b] = dx), (j.my[b] = dy), (j.mx[a] = -dx), (j.my[a] = -dy);
  DONE[a] = DONE[b] = 1;
}

/** 빛이 닿는가: 빛이 오는 쪽(화면 위 또는 왼쪽)으로 흙·바위가 가로막지 않으면 햇빛 */
export function lit(j: Jar, i: number, o: number, light: number) {
  const [lx, ly] = rotJ(o, light ? -1 : 0, light ? 0 : -1), x = i % N, y = (i / N) | 0;
  for (let n = 1; ; n++) {
    const c = at(x + lx * n, y + ly * n);
    if (c < 0) return true;
    if (j.k[c] === SOIL || j.k[c] === ROCK) return false;
  }
}

/** 씨앗이 그 자리에서 싹튼다: 햇빛 → 꽃(흠뻑이면 연꽃), 그늘 → 이끼(흠뻑이면 버섯). 닿은 물 한 칸을 마신다 */
function sprout(j: Jar, i: number, o: number, h: Hook, slime = 0) {
  const x = i % N, y = (i / N) | 0, [gx, gy] = G[o];
  let wet = slime, drink = -1;
  for (const [dx, dy] of [[-gx, -gy], [gy, gx], [-gy, -gx], [gx, gy]]) {
    const c = at(x + dx, y + dy);
    if (c >= 0 && j.k[c] === WATER) (wet += dx === -gx && dy === -gy ? 2 : 1), drink < 0 && (drink = c);
  }
  // 흠뻑 = 물에 잠김(바로 위가 물) 또는 물 두 칸 이상에 닿음
  const f = h.f, sun = lit(j, i, o, f.light);
  const type = sun ? (f.lotus && wet >= 2 ? LOTUS : FLOWER) : f.mush && wet >= 2 ? MUSH : MOSS;
  if (drink >= 0) (j.k[drink] = E), (j.v[drink] = 0);
  (j.k[i] = PLANT), (j.v[i] = type), (j.o[i] = o), (j.b[i] = h.t);
  let birth: '' | 'bfly' | 'snail' = '';
  if ((type === FLOWER && f.bfly) || (type === MOSS && f.snail))
    for (let dy = -1; dy <= 1 && !birth; dy++)
      for (let dx = -1; dx <= 1 && !birth; dx++) {
        const c = at(x + dx, y + dy);
        if (c >= 0 && c !== i && j.k[c] === PLANT && (j.v[c] === type || (type === MOSS && j.v[c] === MUSH))) {
          j.v[c] |= PAIRED;
          j.v[i] |= PAIRED;
          birth = type === FLOWER ? 'bfly' : 'snail';
          h.born[birth]++;
        }
      }
  h.on?.(i, type, birth);
  return type;
}

/** 흙·씨앗(알갱이)과 물이 한 칸씩 떨어지는 한 걸음. 움직인 수(+싹튼 수)를 돌려준다. h가 null이면 싹트지 않는다(판 만들 때) */
export function simStep(j: Jar, o: number, par: number, h: Hook | null): number {
  DONE.fill(0);
  j.mx.fill(0);
  j.my.fill(0);
  const [gx, gy] = G[o], px = gy ? 1 : 0, py = gx ? 1 : 0, ord = ORDER[o][par];
  let moved = 0;
  for (const i of ord) {
    if (DONE[i]) continue;
    const K = j.k[i];
    if (K !== SOIL && K !== SEED && K !== WATER) continue;
    const x = i % N, y = (i / N) | 0, f = at(x + gx, y + gy), s1 = (x * 7 + y * 3 + par) & 1 ? 1 : -1;
    if (K === WATER) {
      if (f >= 0 && j.k[f] === E) {
        swap(j, i, f), moved++;
        continue;
      }
      let m = -1;
      for (const sd of [s1, -s1]) {
        const d = at(x + gx + sd * px, y + gy + sd * py), side = at(x + sd * px, y + sd * py);
        if (d >= 0 && j.k[d] === E && side >= 0 && passable(j.k[side])) {
          m = d;
          break;
        }
      }
      if (m < 0) {
        // 옆으로: 5칸 안에 떨어질 구멍이 있는 쪽으로 한 칸 (평평해지면 멈춘다)
        let best = 99;
        for (const sd of [s1, -s1])
          for (let n = 1; n <= 5; n++) {
            const c = at(x + sd * px * n, y + sd * py * n);
            if (c < 0 || j.k[c] !== E) break;
            const u = at(x + sd * px * n + gx, y + sd * py * n + gy);
            if (u >= 0 && j.k[u] === E) {
              if (n < best) (best = n), (m = at(x + sd * px, y + sd * py));
              break;
            }
          }
      }
      if (m >= 0) swap(j, i, m), moved++;
      continue;
    }
    // 알갱이: 물속으로는 가라앉는다
    if (f >= 0 && passable(j.k[f])) {
      swap(j, i, f), moved++;
      continue;
    }
    for (const sd of [s1, -s1]) {
      const d = at(x + gx + sd * px, y + gy + sd * py), side = at(x + sd * px, y + sd * py);
      if (d >= 0 && passable(j.k[d]) && side >= 0 && passable(j.k[side])) {
        swap(j, i, d), moved++;
        break;
      }
    }
  }
  if (h)
    for (const i of ord) {
      if (j.k[i] !== SEED || DONE[i]) continue;
      const x = i % N, y = (i / N) | 0;
      if ([at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)].some((c) => c >= 0 && j.k[c] === WATER)) sprout(j, i, o, h), moved++;
    }
  return moved;
}
export function settle(j: Jar, o: number, h: Hook | null, max = 90) {
  for (let n = 0; n < max; n++) if (simStep(j, o, n & 1, h) === 0) return n;
  return max;
}

/** ↓ 병 속 비: 화면 위쪽에 물방울 네 개 */
const RAIN: [number, number][] = [[4, 1], [5, 0], [6, 0], [7, 1]];
function rain(j: Jar, o: number) {
  const out: number[] = [];
  for (const [sx, sy] of RAIN) {
    const [x, y] = rotJ(o, sx + 0.5 - CEN, sy + 0.5 - CEN), c = at(Math.round(x + CEN - 0.5), Math.round(y + CEN - 0.5));
    if (c >= 0 && j.k[c] === E) (j.k[c] = WATER), (j.v[c] = 0), out.push(c);
  }
  return out;
}
const turn = (o: number, d: Dir) => (d === 'down' ? o : (o + (d === 'right' ? 1 : d === 'left' ? 3 : 2)) % 4);

interface Cfg { goal: Goal; tilts: number; rocks: number; seeds: number; water: number; soil: number; light: 0 | 1 }
export const STAGES: Cfg[] = [
  { goal: { any: 3 }, tilts: 6, rocks: 0, seeds: 5, water: 10, soil: 24, light: 0 },
  { goal: { flower: 1, moss: 2 }, tilts: 5, rocks: 2, seeds: 7, water: 7, soil: 24, light: 0 },
  { goal: { moss: 1, mush: 1, flower: 1 }, tilts: 5, rocks: 2, seeds: 8, water: 8, soil: 22, light: 0 },
  { goal: { bfly: 1, moss: 1 }, tilts: 5, rocks: 2, seeds: 8, water: 7, soil: 22, light: 0 },
  { goal: { snail: 1, flower: 2 }, tilts: 5, rocks: 3, seeds: 9, water: 7, soil: 22, light: 0 },
  { goal: { flower: 2, moss: 2 }, tilts: 5, rocks: 2, seeds: 9, water: 7, soil: 22, light: 1 },
  { goal: { lotus: 1, mush: 1, flower: 1 }, tilts: 5, rocks: 2, seeds: 9, water: 8, soil: 22, light: 0 },
  { goal: { bfly: 1, snail: 1 }, tilts: 5, rocks: 3, seeds: 9, water: 7, soil: 20, light: 0 },
  { goal: { flower: 2, moss: 2, mush: 1 }, tilts: 5, rocks: 3, seeds: 10, water: 8, soil: 20, light: 1 },
  { goal: { lotus: 1, bfly: 1, mush: 1 }, tilts: 6, rocks: 3, seeds: 10, water: 8, soil: 20, light: 0 },
];

interface Critter { kind: 'bfly' | 'snail'; x: number; y: number; tx: number; ty: number; cd: number; drops: number; face: number; born: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; c?: number }
export interface TerraState {
  rng: Rng; t: number; stage: number; jar: Jar; o: number; ang0: number; ang1: number; rotT: number; rotFrom: number; par: number; stepT: number; moving: boolean;
  feat: Feat; goal: Goal; tilts: number; left: number; still: number; lastMove: number; pause: number; cleared: boolean; won: boolean;
  critters: Critter[]; nb: number; ns: number; hearts: number; stars: number; score: number; grown: number; jars: { stars: number; plants: number[] }[];
  seen: Set<string>; events: Ev[]; dead: boolean; rainT: number;
}

const ev = (s: TerraState, kind: string, x: number, y: number, text?: string, c?: number) => s.events.push({ t: s.t, kind, x, y, text, c });
function see(s: TerraState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  ev(s, 'new', CEN, CEN, text);
}
const featOf = (k: number): Feat => ({ light: STAGES[k].light, mush: k >= 2, bfly: k >= 3, snail: k >= 4, lotus: k >= 6 });

/** 판 만들기: 바닥에 흙, 가운데 바위 둑 — 한쪽엔 물웅덩이, 다른 쪽 마른 흙엔 씨앗. 벽에서 튀어나온 바위 선반 */
function build(s: TerraState) {
  const k = s.stage, cfg = STAGES[k], r = s.rng, j = newJar(), wet = k === 0 ? 0 : r() < 0.5 ? 0 : 1;
  const wetSide = (x: number) => (wet === 0 ? x < DAM[wet] : x > DAM[wet]);
  // 흙: 아래 줄부터 꽉, 남는 건 마른 쪽 둔덕
  let soil = cfg.soil, top = N;
  for (let y = N - 1; y >= 0 && soil > 0; y--) {
    const row: number[] = [];
    for (let x = 0; x < N; x++) if (at(x, y) >= 0) row.push(at(x, y));
    if (row.length > soil) {
      for (const c of row.filter((c) => !wetSide(c % N)).sort((a, b) => (wet ? a - b : b - a)).slice(0, soil)) (j.k[c] = SOIL), (j.v[c] = Math.floor(r() * 4));
      break;
    }
    for (const c of row) (j.k[c] = SOIL), (j.v[c] = Math.floor(r() * 4));
    soil -= row.length;
    top = y;
  }
  // 바위 둑: 흙에 박힌 세로 바위 세 칸
  for (let y = top - 2; y <= top; y++) j.k[at(DAM[wet], y)] = ROCK;
  // 바위 선반: 서로 두 줄 이상 떨어진 줄에, 벽에서 2~3칸
  const rows = [2, 3, 4, 5, 6], used: number[] = [];
  for (let n = 0; n < cfg.rocks && rows.length; ) {
    const y = rows.splice(Math.floor(r() * rows.length), 1)[0];
    if (used.some((u) => Math.abs(u - y) < 2)) continue;
    used.push(y);
    const left = (n + wet + k) % 2 === 0, len = 2 + Math.floor(r() * 2);
    let x0 = 0;
    while (at(x0, y) < 0) x0++;
    for (let q = 0; q < len; q++) j.k[at(left ? x0 + q : N - 1 - x0 - q, y)] = ROCK;
    n++;
  }
  settle(j, 0, null);
  // 물: 젖은 쪽의 가장 낮은 빈칸부터 (둑 높이까지만)
  let water = cfg.water;
  for (let y = N - 1; y >= top - 2 && water > 0; y--)
    for (let x = 0; x < N && water > 0; x++) {
      const c = at(wet === 0 ? x : N - 1 - x, y);
      if (c >= 0 && j.k[c] === E && wetSide(c % N)) (j.k[c] = WATER), water--;
    }
  settle(j, 0, null);
  // 씨앗: 마른 쪽 겉흙·바위 위 (물과 안 닿게)
  const touches = (c: number) => [at((c % N) + 1, (c / N) | 0), at((c % N) - 1, (c / N) | 0), at(c % N, ((c / N) | 0) + 1), at(c % N, ((c / N) | 0) - 1)].some((q) => q >= 0 && j.k[q] === WATER);
  const spots: number[] = [];
  for (let i = 0; i < N * N; i++) {
    const below = at(i % N, ((i / N) | 0) + 1);
    if (INSIDE[i] && j.k[i] === E && below >= 0 && (j.k[below] === SOIL || j.k[below] === ROCK) && !touches(i) && !wetSide(i % N)) spots.push(i);
  }
  for (let n = 0; n < cfg.seeds; n++) {
    let c = spots.length ? spots.splice(Math.floor(r() * spots.length), 1)[0] : -1;
    // 자리가 모자라면 씨앗 위에 씨앗
    if (c < 0) for (let i = 0; i < N * N && c < 0; i++) if (INSIDE[i] && j.k[i] === E && !wetSide(i % N) && j.k[at(i % N, ((i / N) | 0) + 1)] === SEED) c = i;
    if (c >= 0) (j.k[c] = SEED), (j.v[c] = Math.floor(r() * 4));
  }
  settle(j, 0, null);
  // 혹시 물에 닿은 씨앗은 흙으로 (판 시작에 저절로 싹트지 않게)
  for (let i = 0; i < N * N; i++) if (j.k[i] === SEED && touches(i)) j.k[i] = SOIL;
  j.mx.fill(0);
  j.my.fill(0);
  return j;
}
const DAM = [5, 6];

function newStage(s: TerraState) {
  const k = s.stage, cfg = STAGES[k];
  s.feat = featOf(k);
  s.goal = cfg.goal;
  s.tilts = s.left = cfg.tilts;
  s.o = 0;
  s.ang0 = s.ang1 = 0;
  s.rotT = -99;
  s.cleared = false;
  s.critters = [];
  s.nb = s.ns = 0;
  s.still = 0;
  s.lastMove = s.t;
  s.jar = build(s);
  if (k >= 1) see(s, 'rock', '바위 밑은 그늘 — 🌿 이끼가 자라요');
  if (k >= 2) see(s, 'mush', '그늘에서 물에 잠기면 🍄 버섯');
  if (k >= 3) see(s, 'bfly', '🌸 둘이 붙어 피면 🦋 나비 — 씨앗을 떨궈요');
  if (k >= 4) see(s, 'snail', '🌿 옆에 🌿·🍄가 붙으면 🐌 달팽이 — 씨앗을 틔워요');
  if (cfg.light) see(s, 'sun', '해질녘 — 빛이 왼쪽 창에서 들어와요');
  if (k >= 6) see(s, 'lotus', '햇빛에서 물에 잠기면 🪷 연꽃');
  ev(s, 'stage', CEN, CEN, `${k + 1}판 — ${goalText(cfg.goal)}`);
}
const goalText = (g: Goal) => (Object.keys(g) as GoalKey[]).map((key) => `${ICON[key]}${g[key]}`).join(' ');

export function tally(j: Jar, bfly: number, snail: number) {
  const c = { any: 0, flower: 0, moss: 0, mush: 0, lotus: 0, bfly, snail, seeds: 0, water: 0 };
  for (let i = 0; i < N * N; i++) {
    const K = j.k[i];
    if (K === PLANT) {
      c.any++;
      const p = j.v[i] & 7;
      if (p === FLOWER) c.flower++;
      else if (p === MOSS) c.moss++;
      else if (p === MUSH) c.mush++;
      else c.lotus++;
    } else if (K === SEED) c.seeds++;
    else if (K === WATER) c.water++;
  }
  return c;
}
const met = (g: Goal, c: ReturnType<typeof tally>) => (Object.keys(g) as GoalKey[]).every((key) => c[key] >= g[key]!);

function hook(s: TerraState): Hook {
  return {
    t: s.t,
    f: s.feat,
    born: { bfly: 0, snail: 0 },
    on: (i, type, birth) => {
      const x = (i % N) + 0.5, y = ((i / N) | 0) + 0.5;
      s.grown++;
      s.score += 1;
      ev(s, 'sprout', x, y, undefined, type);
      see(s, 'sprout', '물에 닿은 씨앗이 그 자리에서 자라요!');
      if (birth) {
        s.score += 5;
        if (birth === 'bfly') s.nb++;
        else s.ns++;
        s.critters.push({ kind: birth, x, y, tx: x, ty: y - 1, cd: 120, drops: birth === 'bfly' ? 2 : 0, face: 1, born: s.t });
        ev(s, 'birth', x, y, birth === 'bfly' ? '🦋 나비 탄생!' : '🐌 달팽이 탄생!');
      }
    },
  };
}

function move(s: TerraState, d: Dir) {
  s.left--;
  s.lastMove = s.t;
  s.still = 0;
  if (d === 'down') {
    const drops = rain(s.jar, s.o);
    s.rainT = s.t;
    ev(s, 'rain', CEN, 1, drops.length ? '쏴아—' : '');
    return;
  }
  s.rotFrom = s.o;
  s.o = turn(s.o, d);
  s.ang0 = s.ang1;
  s.ang1 += d === 'right' ? 90 : d === 'left' ? -90 : 180;
  s.rotT = s.t;
  ev(s, 'roll', CEN, CEN, d === 'up' ? '뒤집기!' : '데굴');
}

function critters(s: TerraState) {
  const j = s.jar;
  for (const c of s.critters) {
    if (c.kind === 'bfly') {
      const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
      if (d < 0.15) {
        // 다음 갈 곳: 아무 빈칸 (꽃 근처를 좋아한다)
        for (let n = 0; n < 8; n++) {
          const i = Math.floor(s.rng() * N * N);
          if (INSIDE[i] && j.k[i] === E) {
            (c.tx = (i % N) + 0.5), (c.ty = ((i / N) | 0) + 0.5);
            break;
          }
        }
      } else (c.x += (dx / d) * 0.04), (c.y += (dy / d) * 0.04), (c.face = dx > 0 ? 1 : -1);
      if (--c.cd <= 0) {
        c.cd = 150 + Math.floor(s.rng() * 120);
        const i = at(Math.floor(c.x), Math.floor(c.y));
        if (c.drops > 0 && i >= 0 && j.k[i] === E) (j.k[i] = SEED), (j.v[i] = 1), c.drops--, ev(s, 'drop', c.x, c.y, '톡');
      }
      continue;
    }
    // 달팽이: 흙·바위·식물·유리에 붙어 한 칸씩 기어간다. 닿은 씨앗은 점액으로 싹튼다
    c.x += (c.tx - c.x) * 0.06;
    c.y += (c.ty - c.y) * 0.06;
    if (--c.cd > 0) continue;
    c.cd = 26;
    let here = at(Math.floor(c.tx), Math.floor(c.ty));
    if (here < 0 || !passable(j.k[here])) {
      let best = -1, bd = 1e9;
      for (let i = 0; i < N * N; i++) if (INSIDE[i] && passable(j.k[i])) {
        const dd = ((i % N) + 0.5 - c.tx) ** 2 + (((i / N) | 0) + 0.5 - c.ty) ** 2;
        if (dd < bd) (bd = dd), (best = i);
      }
      if (best < 0) continue;
      (here = best), (c.tx = (best % N) + 0.5), (c.ty = ((best / N) | 0) + 0.5);
    }
    const hx = here % N, hy = (here / N) | 0, opts: number[] = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const q = at(hx + dx, hy + dy);
      if (q < 0 || !passable(j.k[q])) continue;
      const qx = q % N, qy = (q / N) | 0, cling = [at(qx + 1, qy), at(qx - 1, qy), at(qx, qy + 1), at(qx, qy - 1)].some((z) => z < 0 || (j.k[z] !== E && j.k[z] !== WATER));
      if (cling) opts.push(q, ...(Math.sign(dx) === c.face ? [q, q] : []));
    }
    if (opts.length) {
      const q = opts[Math.floor(s.rng() * opts.length)];
      if ((q % N) !== hx) c.face = q % N > hx ? 1 : -1;
      (c.tx = (q % N) + 0.5), (c.ty = ((q / N) | 0) + 0.5);
      const qx = q % N, qy = (q / N) | 0;
      for (const z of [at(qx + 1, qy), at(qx - 1, qy), at(qx, qy + 1), at(qx, qy - 1)])
        if (z >= 0 && j.k[z] === SEED) {
          const h = hook(s);
          sprout(j, z, s.o, h, 1);
          ev(s, 'slime', (z % N) + 0.5, ((z / N) | 0) + 0.5, '반짝');
          break;
        }
    }
  }
}

export const terrarium: GameDef<TerraState> = {
  id: 'terrarium',
  name: '기울이는 유리병 정원',
  genes: ['farm', 'gravityflip', 'swipe'],
  twist: '버튼 대신 한 번 밀기 — 둥근 유리병이 그쪽으로 데굴 굴러 흙·물·씨앗이 와르르 쏟아지고, 물이 닿은 씨앗은 그 자리의 햇빛·그늘·물기대로 꽃·이끼·버섯이 된다. 빛은 늘 창에서 오고 바위는 병과 함께 돌아서, 한쪽으로만 굴리면 한 가지만 자란다',
  rules: ['밀면 유리병이 그쪽으로 굴러 흙·물·씨앗이 와르르 (↑ 뒤집기 · ↓ 병 속에 비).', '물에 닿은 씨앗이 그 자리에서 자라요 — 햇빛엔 🌸, 그늘엔 🌿, 그늘에서 물에 잠기면 🍄.', '판마다 목표 정원을 정해진 밀기 안에 키우면 통과 — 적게 밀수록 별!'],
  controls: 'swipe',
  hint: '밀기(스와이프) = 병 굴리기 · ↓ 비 / 화살표',
  aspect: A,
  art: {
    concept: '창가의 유리병 테라리움',
    mood: '햇살 드는 창가 탁자 위 둥근 유리병 속 작은 숲. 흙은 켜켜이 쌓이고, 빛줄기에 먼지가 반짝이고, 꽃과 이끼 사이로 나비와 달팽이가 산다.',
    palette: { bg: '#14221c', ink: '#f6fbf3', muted: '#7f9a8a', accent: '#ffd36b', hot: '#ff7a8a', soft: '#22392e' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), t: 0, stage: 0, jar: newJar(), o: 0, ang0: 0, ang1: 0, rotT: -99, rotFrom: 0, par: 0, stepT: 0, moving: false,
      feat: featOf(0), goal: {}, tilts: 0, left: 0, still: 0, lastMove: 0, pause: 0, cleared: false, won: false,
      critters: [], nb: 0, ns: 0, hearts: 3, stars: 0, score: 0, grown: 0, jars: [], seen: new Set<string>(), events: [], dead: false, rainT: -99,
    } as TerraState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.events = s.events.filter((e) => s.t - e.t < 90);
    if (s.pause > 0) {
      critters(s);
      if (--s.pause === 0) {
        if (!s.cleared) newStage(s);
        else if (s.stage + 1 >= STAGES.length) (s.won = true), ev(s, 'win', CEN, CEN, '정원 열 병 완성!');
        else s.stage++, newStage(s);
      }
      return;
    }
    const rolling = s.t - s.rotT < ROT;
    if (inp.move && !rolling && s.left > 0 && !s.cleared) move(s, inp.move);
    critters(s);
    if (s.t - s.rotT >= ROT && s.t % STEP === 0) {
      s.par ^= 1;
      const h = hook(s);
      s.moving = simStep(s.jar, s.o, s.par, h) > 0;
      s.stepT = s.t;
    }
    s.still = s.moving || s.t - s.rotT < ROT ? 0 : s.still + 1;
    const c = tally(s.jar, s.nb, s.ns);
    if (!s.cleared && met(s.goal, c)) {
      s.cleared = true;
      const st = (s.tilts - s.left) * 2 <= s.tilts ? 3 : s.left > 0 ? 2 : 1;
      s.stars += st;
      s.score += 30 + st * 10;
      const pl: number[] = [];
      for (let i = 0; i < N * N; i++) if (s.jar.k[i] === PLANT && pl.length < 5) pl.push(s.jar.v[i] & 7);
      s.jars.push({ stars: st, plants: pl });
      ev(s, 'clear', CEN, CEN, `${s.stage + 1}판 정원 완성! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`);
      s.pause = 100;
      return;
    }
    // 실패: 밀기를 다 썼거나 씨앗이 다 떨어졌는데 병이 잠잠해졌다 (생물이 마저 할 시간은 준다)
    const drops = s.critters.reduce((a, q) => a + q.drops, 0);
    if (s.still > 40 && s.t - s.lastMove > 120 && (s.left === 0 || (c.seeds === 0 && drops === 0)) && !(s.ns > 0 && c.seeds > 0 && s.t - s.lastMove < 600)) {
      s.hearts--;
      ev(s, 'fail', CEN, CEN, c.seeds === 0 ? '씨앗이 다 떨어졌어요! 하트 -1' : '밀기를 다 썼어요! 하트 -1');
      if (s.hearts <= 0) s.dead = true;
      else s.pause = 90;
    }
  },
  over: (s) => s.dead || s.won,
  score: (s) => s.score,
  draw(ctx, s, w, h, th: Theme) {
    drawTerrarium(ctx, s, w, h, th);
  },
};

// ───────────────────────── 그리기 ─────────────────────────
const SOIL_COL = ['#a8773f', '#875a2f', '#6c4625', '#55361c'];
function drawTerrarium(ctx: CanvasRenderingContext2D, s: TerraState, w: number, h: number, th: Theme) {
  const fx = juice(s), j = s.jar, C = w * 0.066, RR = C * CEN, hb = w * 0.15, cx = w / 2, cy = hb + C * 1.3 + RR;
  const p = Math.min(1, Math.max(0, (s.t - s.rotT) / ROT)), ease = (1 - Math.cos(p * Math.PI)) / 2;
  const angD = s.ang0 + (s.ang1 - s.ang0) * ease, ang = (angD * Math.PI) / 180, ca = Math.cos(ang), sa = Math.sin(ang);
  const toS = (x: number, y: number): [number, number] => {
    const dx = (x - CEN) * C, dy = (y - CEN) * C;
    return [cx + dx * ca - dy * sa, cy + dx * sa + dy * ca];
  };
  const eve = s.feat.light === 1, oo = p < 0.5 ? s.rotFrom : s.o;
  ctx.save();
  fx.begin(ctx);
  // 방 벽 + 창
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, eve ? '#3a2235' : '#1f3a31');
  bg.addColorStop(0.7, eve ? '#22152a' : '#142620');
  bg.addColorStop(1, '#0d1713');
  ctx.fillStyle = bg;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  {
    const wx = eve ? -w * 0.05 : w * 0.08, wy = eve ? cy - RR * 0.7 : hb + 6, ww = eve ? w * 0.16 : w * 0.34, wh = eve ? RR * 1.1 : w * 0.2;
    const glow = ctx.createRadialGradient(wx + ww / 2, wy + wh / 2, 4, wx + ww / 2, wy + wh / 2, w * 0.5);
    glow.addColorStop(0, eve ? 'rgba(255,170,90,.35)' : 'rgba(255,240,190,.28)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = eve ? '#ffb46b' : '#fff1c4';
    ctx.globalAlpha = 0.55;
    ctx.fillRect(wx, wy, ww, wh);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = eve ? '#5a3448' : '#2e5547';
    ctx.lineWidth = 4;
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.moveTo(wx, wy + wh / 2);
    ctx.lineTo(wx + ww, wy + wh / 2);
    ctx.stroke();
  }
  // 빛줄기 (위 창: 비스듬히 아래로 / 해질녘: 왼쪽에서 가로로)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 4; k++) {
    const a = 0.05 + 0.03 * Math.sin(s.t / 70 + k * 2);
    const g = eve ? ctx.createLinearGradient(0, 0, w, 0) : ctx.createLinearGradient(0, hb, 0, h);
    g.addColorStop(0, eve ? `rgba(255,160,80,${a * 2})` : `rgba(255,240,180,${a * 2})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    if (eve) {
      const y0 = cy - RR * 0.8 + k * RR * 0.45;
      ctx.moveTo(0, y0), ctx.lineTo(w, y0 - 10 + k * 6), ctx.lineTo(w, y0 + RR * 0.32), ctx.lineTo(0, y0 + RR * 0.18);
    } else {
      const x0 = w * 0.1 + k * w * 0.13;
      ctx.moveTo(x0, hb), ctx.lineTo(x0 + w * 0.08, hb), ctx.lineTo(x0 + w * 0.28, h), ctx.lineTo(x0 + w * 0.12, h);
    }
    ctx.fill();
  }
  ctx.restore();
  // 탁자 (3/4 시점: 윗면 + 앞면 두께)
  const ty = cy + RR * 0.86;
  {
    const top = ctx.createLinearGradient(0, ty, 0, ty + w * 0.12);
    top.addColorStop(0, '#8a5d3b');
    top.addColorStop(1, '#a8754b');
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(w * 0.06, ty), ctx.lineTo(w * 0.94, ty), ctx.lineTo(w * 1.02, ty + w * 0.12), ctx.lineTo(-w * 0.02, ty + w * 0.12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,30,15,.25)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 5; k++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.06 - k * 2, ty + k * w * 0.024);
      ctx.lineTo(w * 0.94 + k * 2, ty + k * w * 0.024);
      ctx.stroke();
    }
    ctx.fillStyle = '#5b3a22';
    ctx.fillRect(-w * 0.02, ty + w * 0.12, w * 1.04, w * 0.045);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(-w * 0.02, ty + w * 0.165, w * 1.04, w * 0.02);
  }
  // 병 그림자 + 받침
  {
    const sh = ctx.createRadialGradient(cx + (eve ? RR * 0.35 : RR * 0.12), ty + w * 0.05, 4, cx, ty + w * 0.05, RR * 1.05);
    sh.addColorStop(0, 'rgba(0,0,0,.55)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(cx + (eve ? RR * 0.35 : RR * 0.1), ty + w * 0.055, RR * 1.05, w * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a2f1c';
    ctx.beginPath();
    ctx.ellipse(cx, cy + RR * 0.93 + 7, RR * 0.52, RR * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5032';
    ctx.beginPath();
    ctx.ellipse(cx, cy + RR * 0.93, RR * 0.52, RR * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 병 뒷면 유리
  {
    const gb = ctx.createRadialGradient(cx - RR * 0.3, cy - RR * 0.35, RR * 0.1, cx, cy, RR);
    gb.addColorStop(0, 'rgba(200,245,255,.10)');
    gb.addColorStop(0.85, 'rgba(120,190,200,.10)');
    gb.addColorStop(1, 'rgba(30,70,70,.45)');
    ctx.fillStyle = gb;
    ctx.beginPath();
    ctx.arc(cx, cy, RR, 0, Math.PI * 2);
    ctx.fill();
  }
  // ── 병 속 (병 기준 좌표로 돌려 그린다) ──
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, RR - 1.5, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  const q = Math.min(1, (s.t - s.stepT) / STEP), cell = (i: number): [number, number] => [((i % N) - CEN + j.mx[i] * (1 - q)) * C, (((i / N) | 0) - CEN + j.my[i] * (1 - q)) * C];
  // 빛과 그늘 (그늘은 서늘하게 어둡게, 햇빛은 따뜻하게)
  const sunAlpha = p < 1 ? Math.abs(1 - 2 * ease) : 1;
  for (let i = 0; i < N * N; i++) {
    if (!INSIDE[i] || j.k[i] === SOIL || j.k[i] === ROCK) continue;
    const x = ((i % N) - CEN) * C, y = (((i / N) | 0) - CEN) * C, sun = lit(j, i, oo, s.feat.light);
    ctx.fillStyle = sun ? (eve ? `rgba(255,170,90,${0.1 * sunAlpha})` : `rgba(255,236,160,${0.09 * sunAlpha})`) : `rgba(0,10,28,${0.34 * sunAlpha})`;
    ctx.fillRect(x - 0.5, y - 0.5, C + 1, C + 1);
  }
  // 흙·바위·씨앗 — 겉흙일수록 밝게(켜켜이 쌓인 층), 위로 드러난 면엔 두께
  const [ux, uy] = rotJ(oo, 0, -1);
  for (let i = 0; i < N * N; i++) {
    const K = j.k[i];
    if (K !== SOIL && K !== ROCK && K !== SEED) continue;
    const [x, y] = cell(i), ix = i % N, iy = (i / N) | 0;
    if (K === SOIL) {
      let d = 0;
      for (let n = 1; n < 4; n++) {
        const c = at(ix + ux * n, iy + uy * n);
        if (c < 0 || j.k[c] !== SOIL) break;
        d++;
      }
      ctx.fillStyle = SOIL_COL[d];
      ctx.fillRect(x - 0.5, y - 0.5, C + 1, C + 1);
      ctx.fillStyle = j.v[i] & 1 ? 'rgba(255,220,170,.10)' : 'rgba(0,0,0,.08)';
      ctx.fillRect(x + C * 0.15, y + C * 0.2, C * 0.7, C * 0.6);
      if (j.v[i] === 3 && d >= 1) {
        ctx.fillStyle = '#8f8a80';
        ctx.beginPath();
        ctx.ellipse(x + C * 0.5, y + C * 0.55, C * 0.18, C * 0.12, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (d === 0) {
        // 위로 드러난 겉흙: 밝은 윗면 + 풀 몇 가닥
        const c2 = at(ix + ux, iy + uy);
        if (c2 >= 0 && j.k[c2] !== SOIL) {
          ctx.save();
          ctx.translate(x + C / 2, y + C / 2);
          ctx.rotate(Math.atan2(uy, ux) + Math.PI / 2);
          ctx.fillStyle = '#c99a5e';
          ctx.fillRect(-C / 2 - 0.5, -C / 2 - 0.5, C + 1, C * 0.26);
          ctx.fillStyle = '#7cc46a';
          for (let g = 0; g < 3; g++) ctx.fillRect(-C * 0.35 + g * C * 0.3 + (j.v[i] & 2), -C / 2 - C * 0.12, 1.6, C * 0.16);
          ctx.restore();
        }
      }
    } else if (K === ROCK) {
      const rg = ctx.createLinearGradient(x, y, x + C, y + C);
      rg.addColorStop(0, '#a3a9b3');
      rg.addColorStop(1, '#5d636e');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.roundRect(x - 0.5, y - 0.5, C + 1, C + 1, C * 0.22);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,44,52,.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + C * 0.3, y + C * 0.2);
      ctx.lineTo(x + C * 0.45, y + C * 0.55);
      ctx.lineTo(x + C * 0.7, y + C * 0.65);
      ctx.stroke();
      ctx.fillStyle = 'rgba(120,200,110,.35)';
      ctx.fillRect(x + C * 0.1, y + C * 0.08, C * 0.8, C * 0.12);
    } else {
      ctx.save();
      ctx.translate(x + C / 2, y + C / 2);
      ctx.rotate(j.v[i] * 0.8 + Math.sin(s.t / 9 + i) * 0.1);
      ctx.fillStyle = '#5a3418';
      ctx.beginPath();
      ctx.ellipse(0, 0, C * 0.26, C * 0.17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d39a55';
      ctx.beginPath();
      ctx.ellipse(0, 0, C * 0.22, C * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2d39a';
      ctx.fillRect(-C * 0.12, -C * 0.04, C * 0.2, C * 0.04);
      ctx.restore();
    }
  }
  // 물: 한 덩어리로 칠하고 수면에 반짝이는 선
  ctx.beginPath();
  for (let i = 0; i < N * N; i++) if (j.k[i] === WATER) {
    const [x, y] = cell(i);
    ctx.rect(x - 0.6, y - 0.6, C + 1.2, C + 1.2);
  }
  ctx.fillStyle = 'rgba(70,170,245,.58)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,250,255,.85)';
  ctx.lineWidth = 2;
  for (let i = 0; i < N * N; i++) {
    if (j.k[i] !== WATER) continue;
    const ix = i % N, iy = (i / N) | 0, c2 = at(ix + ux, iy + uy);
    if (c2 >= 0 && j.k[c2] === WATER) continue;
    const [x, y] = cell(i);
    ctx.save();
    ctx.translate(x + C / 2, y + C / 2);
    ctx.rotate(Math.atan2(uy, ux) + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(-C / 2, -C / 2 + 2);
    ctx.quadraticCurveTo(0, -C / 2 + 2 + Math.sin(s.t / 8 + ix + iy) * 2.5, C / 2, -C / 2 + 2);
    ctx.stroke();
    ctx.restore();
  }
  // 식물: 싹튼 때의 '위'로 자라 있다 (병이 돌면 같이 기운다)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < N * N; i++) {
    if (j.k[i] !== PLANT) continue;
    const type = j.v[i] & 7, age = s.t - j.b[i], gr = age < 26 ? Math.min(1.2, (age / 18) * 1.15) - Math.max(0, (age - 18) / 8) * 0.2 : 1;
    const x = ((i % N) - CEN + 0.5) * C, y = (((i / N) | 0) - CEN + 0.5) * C;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((-j.o[i] * Math.PI) / 2 + Math.sin(s.t / 34 + i) * 0.07);
    ctx.translate(0, C * 0.12);
    ctx.scale(Math.max(0.05, gr), Math.max(0.05, gr));
    if (type === FLOWER || type === LOTUS) (ctx.shadowColor = eve ? '#ffb46b' : '#fff0a0'), (ctx.shadowBlur = 10);
    ctx.fillStyle = '#ffffff';
    ctx.font = `${C * (type === MOSS ? 0.95 : 1.08)}px system-ui, sans-serif`;
    ctx.fillText(PLANT_ICON[type], 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  ctx.restore();
  // 생물: 화면에선 늘 똑바로
  for (const c of s.critters) {
    const [x, y] = toS(c.x, c.y);
    ctx.save();
    ctx.translate(x, y + (c.kind === 'bfly' ? Math.sin(s.t / 7 + c.born) * 3 : 0));
    ctx.scale(c.kind === 'bfly' ? 0.55 + 0.45 * Math.abs(Math.sin(s.t / 4 + c.born)) : -c.face, 1);
    ctx.fillStyle = '#ffffff';
    ctx.font = `${C * 0.9}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.kind === 'bfly' ? '🦋' : '🐌', 0, 0);
    ctx.restore();
  }
  // 빛줄기 속 먼지
  for (let k = 0; k < 18; k++) {
    const a = 0.25 + 0.5 * Math.abs(Math.sin(s.t / 50 + k * 1.3));
    const px = cx - RR * 0.8 + (((k * 7919) % 997) / 997) * RR * 1.6 + Math.sin(s.t / 90 + k) * 6, py = cy - RR * 0.8 + ((((k * 104729) % 991) / 991) * RR * 1.2 + s.t * 0.08 * (1 + (k % 3))) % (RR * 1.4);
    ctx.fillStyle = `rgba(255,245,200,${a * 0.5})`;
    ctx.fillRect(px, py, 1.6, 1.6);
  }
  // 병 앞면 유리: 테두리, 큰 반사, 코르크 마개
  {
    ctx.strokeStyle = 'rgba(20,50,50,.55)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, RR + 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(210,250,255,.55)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, RR - 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.30)';
    ctx.lineWidth = RR * 0.07;
    ctx.beginPath();
    ctx.arc(cx, cy, RR * 0.86, Math.PI * 1.08, Math.PI * 1.38);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.14)';
    ctx.lineWidth = RR * 0.04;
    ctx.beginPath();
    ctx.arc(cx, cy, RR * 0.86, Math.PI * 1.9, Math.PI * 2.15);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath();
    ctx.ellipse(cx - RR * 0.5, cy - RR * 0.58, RR * 0.07, RR * 0.04, -0.7, 0, Math.PI * 2);
    ctx.fill();
    // 코르크: 병의 '위'(입구)에 — 병과 함께 돈다
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.fillStyle = 'rgba(200,240,250,.35)';
    ctx.strokeStyle = 'rgba(220,250,255,.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-C * 0.95, -RR - C * 0.45, C * 1.9, C * 0.6, 3);
    ctx.fill();
    ctx.stroke();
    const cg = ctx.createLinearGradient(0, -RR - C * 1.2, 0, -RR - C * 0.3);
    cg.addColorStop(0, '#d9a066');
    cg.addColorStop(1, '#9c6a3c');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.roundRect(-C * 0.75, -RR - C * 1.15, C * 1.5, C * 0.8, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(80,40,20,.35)';
    for (let k = 0; k < 5; k++) ctx.fillRect(-C * 0.5 + k * C * 0.25, -RR - C * 1.0 + (k % 2) * C * 0.3, 2, 2);
    ctx.restore();
  }
  // 비구름 (↓)
  if (s.t - s.rainT < 50) {
    const a = 1 - (s.t - s.rainT) / 50;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffffff';
    ctx.font = `${C * 1.5}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🌧️', cx, cy - RR * 0.72);
    ctx.globalAlpha = 1;
  }
  // 사건 → 연출
  const seenT = fx.memo.t ?? -1;
  let pops = 0;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const [x, y] = toS(e.x, e.y);
    if (e.kind === 'sprout') {
      const col = PLANT_COL[e.c ?? 1];
      fx.burst(x, y, col, 10, 2.2, 2.4);
      fx.ring(x, y, col, C * 0.9, 2.5);
      if (pops++ < 4) fx.pop(x, y - C * 0.6, `뽁! ${PLANT_ICON[e.c ?? 1]}`, '#ffffff', 13);
      fx.kick(1.5);
    }
    if (e.kind === 'roll') fx.kick(5), fx.burst(cx, cy + RR * 0.8, '#c99a5e', 14, 2.5, 2.5);
    if (e.kind === 'rain') fx.burst(cx, cy - RR * 0.6, '#8fd3ff', 18, 2, 2), e.text && fx.pop(cx + RR * 0.45, cy - RR * 0.75, e.text, '#bfe9ff', 14);
    if (e.kind === 'birth') fx.ring(x, y, th.accent, C * 2.2, 4), fx.burst(x, y, th.accent, 24, 3.5, 2.6), fx.pop(x, y - C, e.text!, th.accent, 17), fx.blink('#fff6c8', 0.12);
    if (e.kind === 'drop') fx.burst(x, y, '#d39a55', 6, 1.5, 2), fx.pop(x, y - 8, e.text!, '#f2d39a', 12);
    if (e.kind === 'slime') fx.burst(x, y, '#b6f0a0', 12, 2, 2.2), fx.pop(x, y - 10, e.text!, '#d8ffc8', 12);
    if (e.kind === 'clear' || e.kind === 'win') fx.ring(cx, cy, th.accent, RR * 1.2, 8), fx.burst(cx, cy, th.accent, 50, 5, 3), fx.blink('#fff6c8', 0.28), fx.pop(cx, cy - RR * 0.35, e.text!, '#ffffff', 21);
    if (e.kind === 'fail') fx.kick(10), fx.blink(th.hot, 0.3), fx.pop(cx, cy - RR * 0.2, e.text!, th.hot, 18);
    if (e.kind === 'stage') fx.pop(cx, cy - RR * 0.5, e.text!, '#ffffff', 19);
    if (e.kind === 'new') fx.pop(cx, cy - RR * 0.05, e.text!, th.accent, 14);
  }
  fx.memo.t = s.t;
  // 첫 판 안내
  if (s.stage === 0 && s.left === s.tilts && s.t > 20 && s.pause === 0) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${w * 0.048}px system-ui, sans-serif`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    const bob = Math.sin(s.t / 8) * 4;
    ctx.strokeText('👈 왼쪽으로 쓱 밀어 보세요', cx + bob, cy - RR * 0.42);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('👈 왼쪽으로 쓱 밀어 보세요', cx + bob, cy - RR * 0.42);
  }
  ctx.restore();
  // ── HUD ──
  ctx.fillStyle = 'rgba(6,16,12,.62)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  ctx.font = `900 ${w * 0.045}px system-ui, sans-serif`;
  ctx.fillText(`${s.stage + 1}판 · 밀기 ${s.left}/${s.tilts}`, 10, 9);
  ctx.textAlign = 'right';
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - 10, 9);
  {
    const c = tally(j, s.nb, s.ns);
    let gx = 10;
    ctx.textAlign = 'left';
    ctx.font = `800 ${w * 0.04}px system-ui, sans-serif`;
    for (const key of Object.keys(s.goal) as GoalKey[]) {
      const need = s.goal[key]!, have = Math.min(need, c[key]), ok = have >= need, label = `${ICON[key]} ${have}/${need}`;
      const tw = ctx.measureText(label).width + 12;
      ctx.fillStyle = ok ? 'rgba(120,220,120,.35)' : 'rgba(255,255,255,.10)';
      ctx.beginPath();
      ctx.roundRect(gx, 15 + w * 0.045, tw, w * 0.055, 8);
      ctx.fill();
      ctx.fillStyle = ok ? '#c8ffc0' : '#ffffff';
      ctx.fillText(label, gx + 6, 18 + w * 0.045);
      gx += tw + 6;
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = th.accent;
    ctx.fillText(`★ ${s.stars}`, w - 10, 18 + w * 0.045);
  }
  // 아래 띠: 채운 병 모음
  {
    const by = h - w * 0.06, r = w * 0.024;
    ctx.fillStyle = 'rgba(6,16,12,.5)';
    ctx.fillRect(0, by - r - 6, w, r * 2 + 12);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = th.muted;
    ctx.font = `800 ${w * 0.032}px system-ui, sans-serif`;
    ctx.fillText(`정원 ${s.jars.length}/${STAGES.length}`, 10, by);
    for (let k = 0; k < STAGES.length; k++) {
      const x = w * 0.27 + k * (r * 2.7), jar = s.jars[k];
      ctx.strokeStyle = jar ? 'rgba(210,250,255,.8)' : 'rgba(210,250,255,.25)';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = jar ? 'rgba(120,200,160,.25)' : 'rgba(255,255,255,.04)';
      ctx.beginPath();
      ctx.arc(x, by, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (jar) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `${r * 1.2}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(PLANT_ICON[jar.plants[0] ?? 1], x, by + 1);
      }
    }
  }
}

// ───────────────────────── 봇 ─────────────────────────
const MOVES: Dir[] = ['left', 'right', 'up', 'down'];
const tick = new WeakMap<object, number>();
/** 봇: 아무 방향으로, 아무 때나 민다 */
export const terrariumRandom: Bot<TerraState> = {
  name: '아무렇게나',
  act(s, rng) {
    const next = tick.get(s) ?? 40 + Math.floor(rng() * 60);
    if (s.t < next) return { tap: false, dir: 0 };
    tick.set(s, s.t + 40 + Math.floor(rng() * 60));
    return { tap: false, dir: 0, move: MOVES[Math.floor(rng() * 4)] };
  },
};

/** 한 수를 시뮬레이션: 굴리거나 비를 내리고, 잠잠해질 때까지 */
function sim(s: TerraState, j: Jar, o: number, d: Dir, born: Born) {
  if (d === 'down') rain(j, o);
  const o2 = turn(o, d);
  settle(j, o2, { t: s.t, f: s.feat, born });
  return o2;
}
/** 정원 점수: 목표에 든 만큼 + 남은 씨앗(가능성) − 목표에 안 드는 식물(씨앗 낭비) */
function value(s: TerraState, j: Jar, born: Born, left: number) {
  const c = tally(j, s.nb + born.bfly, s.ns + born.snail), g = s.goal;
  if (met(g, c)) return 1e6 + left * 1000;
  let v = 0, need = 0;
  for (const key of Object.keys(g) as GoalKey[]) {
    v += 100 * Math.min(c[key], g[key]!);
    need += Math.max(0, g[key]! - c[key]) * (key === 'bfly' || key === 'snail' ? 2 : 1);
  }
  // 생물 목표: 짝 없는 꽃/이끼 하나는 반쯤 온 것
  const want = { flower: (g.flower ?? 0) + (g.bfly ? 2 : 0), moss: (g.moss ?? 0) + (g.snail ? 2 : 0), mush: g.mush ?? 0, lotus: g.lotus ?? 0 };
  if (g.bfly && c.bfly < g.bfly) v += 35 * Math.min(1, c.flower);
  if (g.snail && c.snail < g.snail) v += 35 * Math.min(1, c.moss);
  if (!g.any) v -= 30 * (Math.max(0, c.flower - want.flower) + Math.max(0, c.moss - want.moss) + Math.max(0, c.mush - want.mush) + Math.max(0, c.lotus - want.lotus));
  v += 12 * Math.min(c.seeds, need) + Math.min(c.water, 6);
  if (c.seeds < need) v -= 150;
  return v;
}
export const terrariumSmart: Bot<TerraState> = {
  name: '정원사',
  act(s) {
    if (s.pause > 0 || s.cleared || s.left === 0 || s.t - s.rotT < ROT || s.still < 4) return { tap: false, dir: 0 };
    let best: Dir = 'down', bv = -1e9;
    for (const d of MOVES) {
      const j = cloneJar(s.jar), born = { bfly: 0, snail: 0 }, o2 = sim(s, j, s.o, d, born);
      let v = value(s, j, born, s.left - 1);
      if (v < 1e6 && s.left > 1)
        for (const d2 of MOVES) {
          const j2 = cloneJar(j), b2 = { ...born }, o3 = sim(s, j2, o2, d2, b2);
          let v2 = value(s, j2, b2, s.left - 2);
          if (v2 < 1e6 && s.left > 2)
            for (const d3 of MOVES) {
              const j3 = cloneJar(j2), b3 = { ...b2 };
              sim(s, j3, o3, d3, b3);
              v2 = Math.max(v2, value(s, j3, b3, s.left - 3) * 0.97);
            }
          v = Math.max(v, v2 * 0.97);
        }
      if (v > bv) (bv = v), (best = d);
    }
    return { tap: false, dir: 0, move: best };
  },
};
