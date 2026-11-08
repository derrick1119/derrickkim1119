/**
 * 스노볼 마을 (19라운드 메뉴 8) — 꾸미기·디오라마 × 연쇄 × 스와이프.
 * 기준 9(조작 최소): 손이 하는 일은 '한 번 흔들기(밀기)'뿐. 스노볼 안에 떠 있는 눈뭉치가 미는 쪽으로 날아가
 *   막히는 곳(유리 벽·집·나무 바로 앞)에 내려앉는다. 눈이 두 번 쌓인 자리엔 집이 솟고, 가운데 큰 트리와
 *   이어진 집엔 불이 켜진다 — 불빛이 트리에서부터 집집이 번져 나간다(연쇄).
 * 와우: 한 번 흔들면 눈보라가 휘날리다 내려앉고, 내려앉은 자리마다 집이 솟아 불빛이 줄줄이 이어진다.
 * 첫 3초: 첫 밤은 트리 옆 두 집 아래에 눈이 깔려 있다. 위로 한 번 밀면 집 세 채가 솟으며 불을 켜고 바로 축제.
 * 같은 쪽만 흔들면 안 되는 이유: 집 위에 뜬 눈뭉치가 그쪽으로 빠져나갈 길이 없으면 지붕에 쌓이고, 두 번 쌓이면
 *   집이 묻혀 눈사람이 된다(불빛 끊김). 한 자리에 눈이 너무 몰려도 지붕에 눈을 인 채 솟는다.
 * 목표·보상: 밤마다 흔들기 N번 안에 불 켠 집 목표 → 목표 ★, +2 ★★, +4 ★★★(바로 새벽). 5채마다 축제(흔들기 +1).
 *   못 채우면 하트 -1, 그 밤만 다시. 10번째 밤(크리스마스 이브)이 끝나면 끝.
 * 하는 일이 바뀐다: 전나무(2밤, 눈을 막는 벽이자 불빛 다리) → 얼음 연못(3밤, 눈이 미끄러져 지나가고 멈추면 녹음·불빛 끊김)
 *   → 함박눈(4밤, 한 번에 집이 솟지만 지붕에 앉으면 바로 묻힘) → 소원 별 자리(5밤, 거기 불 켠 집은 두 채)
 *   → 찬바람(7밤, 흔들고 나면 바람 쪽으로 한 칸 더 밀림).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const N = 7, C = 3, A = 1.35, FLY = 26, NIGHTS = 10;
type Dir = 'up' | 'down' | 'left' | 'right';
const DV: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const DIRS: Dir[] = ['up', 'down', 'left', 'right'];
const GOALS = [5, 5, 6, 7, 8, 8, 9, 9, 10, 11];
const SHAKES = [6, 6, 7, 7, 7, 7, 8, 8, 8, 8];
export const onBoard = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N && (x - C) ** 2 + (y - C) ** 2 <= 10;
const ix = (x: number, y: number) => y * N + x, cx = (i: number) => i % N, cy = (i: number) => (i / N) | 0;

type Thing = '' | 'house' | 'pine' | 'tree' | 'man';
export interface Cell { on: boolean; pond: boolean; wish: boolean; snow: number; thing: Thing; roof: number; lit: boolean; litAt: number; born: number; dist: number }
export interface Puff { i: number; big: boolean; born: number }
export interface Flight { from: number; to: number; big: boolean; kind: 'snow' | 'roof' | 'melt' | 'soak' }
interface Ev { t: number; kind: string; x: number; y: number; text?: string }
interface Note { text: string; t0: number }
export interface SnowState {
  rng: Rng; t: number; night: number; goal: number; left: number; given: number; bonus: number; hearts: number; stars: number; lights: number;
  fests: number; festAll: number; festT: number; cells: Cell[]; puffs: Puff[]; flights: Flight[]; busy: number; dir: Dir; shakeT: number; wind: Dir | null;
  lit: number; pause: number; result: number; seen: Set<string>; notes: Note[]; noteEnd: number; events: Ev[]; dead: boolean; done: boolean; shook: number;
}

const ev = (s: SnowState, kind: string, x: number, y: number, text?: string) => s.events.push({ t: s.t, kind, x, y, text });
function see(s: SnowState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  const t0 = Math.max(s.t, s.noteEnd);
  s.notes.push({ text, t0 });
  s.noteEnd = t0 + 150;
}
const conducts = (c: Cell) => c.thing === 'house' || c.thing === 'pine' || c.thing === 'tree';

/** 눈뭉치들이 d쪽으로 날아가 어디에 앉는지 (봇이 내다볼 때도 같은 함수). 다음 칸이 벽·집·나무면 그 자리에 앉는다 */
export function land(cells: Cell[], puffs: Puff[], d: Dir, wind: Dir | null = null): Flight[] {
  const go = (x0: number, y0: number, dd: Dir) => {
    const [dx, dy] = DV[dd];
    let x = x0, y = y0;
    while (onBoard(x + dx, y + dy) && !cells[ix(x + dx, y + dy)].thing) (x += dx), (y += dy);
    return [x, y];
  };
  return puffs.map((p) => {
    let [x, y] = go(cx(p.i), cy(p.i), d);
    // 찬바람(7밤~): 한 번 더, 바람 쪽으로 한 칸만 밀린다
    if (wind) {
      const [dx, dy] = DV[wind];
      if (!cells[ix(x, y)].thing && onBoard(x + dx, y + dy) && !cells[ix(x + dx, y + dy)].thing) (x += dx), (y += dy);
    }
    const to = ix(x, y), c = cells[to];
    return { from: p.i, to, big: p.big, kind: c.thing === 'house' ? 'roof' : c.thing ? 'soak' : c.pond ? 'melt' : 'snow' };
  });
}

/** 앉은 눈을 반영: 눈 2 이상이면 집이 솟고(넘친 만큼 지붕 눈), 지붕 눈 2 이상이면 묻혀 눈사람 */
export function settle(cells: Cell[], fl: Flight[], t: number) {
  const grown: number[] = [], buried: number[] = [], roofed: number[] = [];
  for (const f of fl) {
    const c = cells[f.to], amt = f.big ? 2 : 1;
    if (f.kind === 'snow') c.snow += amt;
    if (f.kind === 'roof') (c.roof += amt), roofed.push(f.to);
  }
  cells.forEach((c, i) => {
    if (c.on && !c.thing && !c.pond && c.snow >= 2) {
      c.thing = 'house';
      c.roof = c.snow - 2;
      c.snow = 0;
      c.born = t;
      c.lit = false;
      grown.push(i);
    }
    if (c.thing === 'house' && c.roof >= 2) {
      c.thing = 'man';
      c.lit = false;
      c.born = t;
      buried.push(i);
    }
  });
  return { grown, buried, roofed };
}

/** 큰 트리에서 이어진(상하좌우) 집·나무에 불을 켠다. 불 켠 집 수(소원 별 자리는 두 채) */
export function lights(cells: Cell[], t: number): number {
  const was = cells.map((c) => c.lit), q: number[] = [];
  cells.forEach((c, i) => {
    c.lit = c.thing === 'tree';
    c.dist = c.lit ? 0 : 99;
    if (c.lit) q.push(i);
  });
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    for (const [dx, dy] of Object.values(DV)) {
      const x = cx(i) + dx, y = cy(i) + dy;
      if (!onBoard(x, y)) continue;
      const c = cells[ix(x, y)];
      if (!c.lit && conducts(c)) (c.lit = true), (c.dist = cells[i].dist + 1), q.push(ix(x, y));
    }
  }
  let n = 0;
  cells.forEach((c, i) => {
    if (c.lit && !was[i]) c.litAt = t + c.dist * 6;
    if (c.lit && c.thing === 'house') n += c.wish ? 2 : 1;
  });
  return n;
}

const blank = (): Cell[] =>
  Array.from({ length: N * N }, (_, i) => ({ on: onBoard(cx(i), cy(i)), pond: false, wish: false, snow: 0, thing: '' as Thing, roof: 0, lit: false, litAt: 0, born: -99, dist: 99 }));

function spawnPuffs(s: SnowState) {
  const k = s.night, n = k === 0 ? 5 : k >= 6 ? 5 : 4;
  const cand = s.cells.map((_, i) => i).filter((i) => s.cells[i].on && s.cells[i].thing !== 'tree' && s.cells[i].thing !== 'pine');
  s.puffs = [];
  let big = false;
  for (let m = 0; m < n && cand.length; m++) {
    const i = cand.splice(Math.floor(s.rng() * cand.length), 1)[0], b: boolean = k >= 3 && !big && s.rng() < 0.35;
    big ||= b;
    s.puffs.push({ i, big: b, born: s.t });
  }
  if (big) see(s, 'big', '❄️ 함박눈 — 앉자마자 집이 솟지만, 지붕에 앉으면 바로 묻혀요');
}

function newNight(s: SnowState) {
  const k = s.night, r = s.rng, cells = blank();
  cells[ix(C, C)].thing = 'tree';
  const free = (f: (x: number, y: number) => boolean) => cells.map((_, i) => i).filter((i) => cells[i].on && !cells[i].thing && !cells[i].pond && !cells[i].wish && f(cx(i), cy(i)));
  const pick = (l: number[]) => l[Math.floor(r() * l.length)];
  if (k === 0) {
    for (const x of [2, 4]) cells[ix(x, C)].thing = 'house';
    for (const x of [2, 3, 4]) for (const y of [2, 4]) cells[ix(x, y)].snow = 1;
  } else {
    cells[pick([ix(2, 3), ix(4, 3), ix(3, 2), ix(3, 4)])].thing = 'house';
    for (let m = 0; m < 3 + (k >= 5 ? 1 : 0); m++) cells[pick(free((x, y) => Math.max(Math.abs(x - C), Math.abs(y - C)) >= 2))].thing = 'pine';
    if (k >= 2) {
      let p = pick(free((x, y) => Math.abs(x - C) + Math.abs(y - C) >= 3));
      for (let m = 0; m < 3; m++) {
        cells[p].pond = true;
        const nb = free((x, y) => Math.abs(x - cx(p)) + Math.abs(y - cy(p)) === 1 && Math.abs(x - C) + Math.abs(y - C) >= 2);
        if (!nb.length) break;
        p = pick(nb);
      }
    }
    if (k >= 4) cells[pick(free((x, y) => Math.abs(x - C) + Math.abs(y - C) >= 3))].wish = true;
    for (let m = 0; m < 5; m++) cells[pick(free(() => true))].snow = 1;
  }
  s.cells = cells;
  s.goal = GOALS[k];
  s.given = s.left = SHAKES[k] + s.bonus;
  s.bonus = 0;
  s.fests = 0;
  s.result = 0;
  s.flights = [];
  s.busy = 0;
  s.shook = 0;
  s.wind = k >= 6 ? DIRS[Math.floor(r() * 4)] : null;
  s.lit = lights(cells, s.t);
  for (const c of cells) c.litAt = s.t;
  if (k === 0) s.puffs = [ix(2, 6), ix(3, 6), ix(4, 6), ix(2, 0), ix(4, 0)].map((i) => ({ i, big: false, born: s.t }));
  else spawnPuffs(s);
  ev(s, 'night', 0, 0, `🌙 ${k + 1}번째 밤 — 불 켠 집 ${s.goal}채`);
  if (k >= 1) see(s, 'pine', '🌲 전나무 — 눈을 막아 주고, 불빛도 이어 줘요');
  if (k >= 2) see(s, 'pond', '🧊 얼음 연못 — 눈이 미끄러져요. 연못에 멈춘 눈은 녹아요');
  if (k >= 4) see(s, 'wish', '✨ 소원 별 자리 — 여기 불 켠 집은 두 채로 쳐요');
  if (s.wind) see(s, 'wind', '🌬️ 찬바람 — 앉은 눈이 바람 쪽으로 한 칸 더 밀려요');
}

function endNight(s: SnowState, ok: boolean) {
  if (ok) {
    const st = 1 + (s.lit >= s.goal + 2 ? 1 : 0) + (s.lit >= s.goal + 4 ? 1 : 0);
    s.stars += st;
    s.lights += s.lit;
    s.bonus = Math.min(2, Math.floor(s.left / 2));
    s.result = 1;
    ev(s, 'clear', 0, 0, `새벽! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}${s.bonus ? ` · 다음 밤 흔들기 +${s.bonus}` : ''}`);
    s.pause = 110;
  } else {
    s.hearts--;
    s.result = -1;
    ev(s, 'fail', 0, 0, `불빛이 ${s.goal - s.lit}채 모자라요… 하트 -1`);
    if (s.hearts <= 0) s.dead = true;
    else s.pause = 100;
  }
}

/** 날아간 눈뭉치가 내려앉는 순간 */
function resolve(s: SnowState) {
  const before = s.cells.map((c) => c.thing);
  const { grown, buried, roofed } = settle(s.cells, s.flights, s.t);
  for (const f of s.flights) {
    if (f.kind === 'melt') ev(s, 'melt', cx(f.to), cy(f.to), '스르르'), see(s, 'pond', '🧊 얼음 연못 — 눈이 미끄러져요. 연못에 멈춘 눈은 녹아요');
    if (f.kind === 'snow' && !grown.includes(f.to)) ev(s, 'drift', cx(f.to), cy(f.to));
  }
  for (const i of roofed) if (s.cells[i].thing === 'house') ev(s, 'roof', cx(i), cy(i), '지붕에 눈!'), see(s, 'roof', '⚠️ 지붕에 눈 — 한 번 더 쌓이면 집이 묻혀요');
  for (const i of grown) ev(s, 'grow', cx(i), cy(i), s.cells[i].roof ? '눈이 너무 많아!' : undefined);
  if (grown.length) see(s, 'grow', '🏠 눈이 두 번 쌓인 자리에 집이 솟아요');
  for (const i of buried) ev(s, 'bury', cx(i), cy(i), before[i] ? '묻혔어요!' : '눈사람이 됐어요'), see(s, 'bury', '⛄ 집이 묻혀 눈사람이 됐어요 — 불빛이 끊겨요. 같은 쪽만 흔들지 마세요');
  s.flights = [];
  const prev = s.lit;
  s.lit = lights(s.cells, s.t);
  if (s.lit > prev) see(s, 'light', '💡 큰 트리와 이어진 집에 불이 켜져요');
  if (s.lit < prev) ev(s, 'dark', C, C, `불빛 -${prev - s.lit}`);
  while (s.lit >= 5 * (s.fests + 1)) {
    s.fests++;
    s.festAll++;
    s.left++;
    s.festT = s.t;
    ev(s, 'fest', C, C, `🎉 축제! 불빛 ${5 * s.fests}채 · 흔들기 +1`);
    see(s, 'fest', '🎉 불 켠 집 5채마다 축제 — 흔들기 +1');
  }
  if (s.lit >= s.goal + 4) return endNight(s, true);
  if (s.left <= 0) return endNight(s, s.lit >= s.goal);
  spawnPuffs(s);
}

export const snowglobe: GameDef<SnowState> = {
  id: 'snowglobe',
  name: '스노볼 마을',
  genes: ['decorate', 'chain', 'swipe'],
  twist: '버튼 대신 스노볼을 한 번 흔든다 — 떠 있던 눈뭉치가 그쪽으로 날아가 막히는 곳에 쌓이고, 눈이 쌓인 자리에 집이 솟아 트리에서부터 불빛이 집집이 번진다. 같은 쪽만 흔들면 지붕에 눈이 쌓여 집이 묻힌다',
  rules: [
    '밀어서 흔들면 떠 있는 눈이 그쪽으로 날아가 막히는 곳에 쌓여요 (화살표 키도 돼요).',
    '눈이 두 번 쌓인 자리에 집이 솟고, 큰 트리와 이어진 집에 불이 켜져요.',
    '지붕에 눈이 두 번 쌓이면 집이 묻혀요. 밤마다 불 켠 집 목표를 채우면 별!',
  ],
  controls: 'swipe',
  hint: '밀기(스와이프) = 스노볼 흔들기 / 화살표',
  aspect: A,
  art: {
    concept: '책상 위 스노볼 속 눈 마을',
    mood: '나무 받침 위 유리 스노볼 안, 눈 덮인 작은 마을. 흔들면 눈보라가 휘날리다 내려앉고, 트리에서부터 따뜻한 창문 불빛이 줄줄이 번진다.',
    palette: { bg: '#141a33', ink: '#fdfaf3', muted: '#7c86b8', accent: '#ffd36b', hot: '#ff6b7f', soft: '#26305a' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), t: 0, night: 0, goal: 0, left: 0, given: 0, bonus: 0, hearts: 3, stars: 0, lights: 0, fests: 0, festAll: 0, festT: -999,
      cells: [], puffs: [], flights: [], busy: 0, dir: 'up', shakeT: -999, wind: null, lit: 0, pause: 0, result: 0, seen: new Set<string>(), notes: [],
      noteEnd: 0, events: [], dead: false, done: false, shook: 0,
    } as unknown as SnowState;
    newNight(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.events = s.events.filter((e) => s.t - e.t < 120);
    if (s.dead || s.done) return;
    if (s.pause > 0) {
      if (--s.pause === 0) {
        if (s.result === 1) {
          if (s.night >= NIGHTS - 1) return void (s.done = true);
          s.night++;
        }
        newNight(s);
      }
      return;
    }
    if (s.busy > 0) {
      if (--s.busy === 0) resolve(s);
      return;
    }
    if (inp.move && s.left > 0) {
      s.dir = inp.move;
      s.left--;
      s.shook++;
      s.shakeT = s.t;
      s.flights = land(s.cells, s.puffs, inp.move, s.wind);
      s.puffs = [];
      s.busy = FLY;
      ev(s, 'shake', 0, 0);
    }
  },
  over: (s) => s.dead || s.done,
  score: (s) => s.stars * 10 + s.lights + s.festAll * 3,
  draw(ctx, s, w, h, th: Theme) {
    const fx = juice(s), U = w, t = s.t;
    const GX = 0.5 * U, GY = 0.6 * U, GR = 0.465 * U, CW = 0.1 * U, CH = CW * 0.6, VY = 0.67 * U, LIFT = 0.12 * U;
    const PX = (x: number) => GX + (x - C) * CW, PY = (y: number) => VY + (y - C) * CH;
    const hash = (n: number) => (((n * 2654435761) >>> 0) % 1000) / 1000;
    const dawn = s.result === 1 && s.pause > 0 ? Math.min(1, (110 - s.pause) / 40) : 0;
    ctx.save();
    fx.begin(ctx);
    // ── 방: 어두운 벽, 흐릿한 꼬마전구, 나무 책상 ──
    const wall = ctx.createLinearGradient(0, 0, 0, h);
    wall.addColorStop(0, '#171b38');
    wall.addColorStop(0.7, '#2a2140');
    wall.addColorStop(1, '#3a2630');
    ctx.fillStyle = wall;
    ctx.fillRect(-10, -10, w + 20, h + 20);
    for (let k = 0; k < 14; k++) {
      const bx = hash(k + 3) * w, by = U * (0.12 + hash(k + 40) * 0.9), br = U * (0.02 + hash(k + 80) * 0.035);
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      const col = ['255,196,110', '255,140,120', '150,200,255', '255,230,160'][k % 4];
      g.addColorStop(0, `rgba(${col},${0.22 + 0.1 * Math.sin(t / 40 + k)})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
    const desk = ctx.createLinearGradient(0, U * 1.06, 0, h);
    desk.addColorStop(0, '#6b4329');
    desk.addColorStop(1, '#3b2416');
    ctx.fillStyle = desk;
    ctx.fillRect(-10, U * 1.06, w + 20, h);
    ctx.strokeStyle = 'rgba(0,0,0,.18)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 5; k++) (ctx.beginPath(), ctx.moveTo(0, U * 1.06 + k * U * 0.07), ctx.lineTo(w, U * 1.06 + k * U * 0.07 + 6), ctx.stroke());
    // 받침 그림자
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(GX + U * 0.03, U * 1.14, U * 0.43, U * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    // 축제·불빛이 유리 밖 책상에 비치는 빛
    const warm = Math.min(1, s.lit / 12);
    {
      const g = ctx.createRadialGradient(GX, U * 1.05, 0, GX, U * 1.05, U * 0.5);
      g.addColorStop(0, `rgba(255,190,100,${0.08 + 0.18 * warm})`);
      g.addColorStop(1, 'rgba(255,190,100,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, U * 0.6, w, U * 0.7);
    }

    // ── 유리구 안 ──
    ctx.save();
    ctx.beginPath();
    ctx.arc(GX, GY, GR, 0, Math.PI * 2);
    ctx.clip();
    const sky = ctx.createLinearGradient(0, GY - GR, 0, GY + GR);
    sky.addColorStop(0, mix('#0e1638', '#3b4a8c', dawn));
    sky.addColorStop(0.55, mix('#25407a', '#e6a6a0', dawn * 0.8));
    sky.addColorStop(1, '#5b7bb5');
    ctx.fillStyle = sky;
    ctx.fillRect(GX - GR, GY - GR, GR * 2, GR * 2);
    for (let k = 0; k < 26; k++) {
      ctx.fillStyle = `rgba(255,255,255,${(0.3 + 0.5 * Math.abs(Math.sin(t / 45 + k * 1.7))) * (1 - dawn)})`;
      ctx.fillRect(GX - GR + hash(k + 200) * GR * 2, GY - GR + hash(k + 300) * GR * 0.8, 1.6, 1.6);
    }
    // 달
    {
      const mx = GX + GR * 0.45, my = GY - GR * 0.55, g = ctx.createRadialGradient(mx, my, 0, mx, my, U * 0.09);
      g.addColorStop(0, 'rgba(255,248,215,.55)');
      g.addColorStop(1, 'rgba(255,248,215,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(mx, my, U * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff6d6';
      ctx.beginPath();
      ctx.arc(mx, my, U * 0.03, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = mix('#0e1638', '#25407a', 0.3);
      ctx.beginPath();
      ctx.arc(mx + U * 0.012, my - U * 0.008, U * 0.026, 0, Math.PI * 2);
      ctx.fill();
    }
    // 먼 눈 언덕
    ctx.fillStyle = '#8fa6d6';
    ctx.beginPath();
    ctx.moveTo(GX - GR, VY - CH * 3);
    for (let k = 0; k <= 12; k++) ctx.lineTo(GX - GR + (k / 12) * GR * 2, VY - CH * 3.2 - U * (0.03 + 0.03 * Math.sin(k * 1.3)));
    ctx.lineTo(GX + GR, VY);
    ctx.lineTo(GX - GR, VY);
    ctx.fill();
    // 눈 마을 받침(두께 있는 땅 덩어리)
    const RX = 4.3 * CW, RY = 4.3 * CH, T = U * 0.05;
    {
      const side = ctx.createLinearGradient(0, VY, 0, VY + RY + T);
      side.addColorStop(0, '#f4f8ff');
      side.addColorStop(0.62, '#e2ecfa');
      side.addColorStop(0.7, '#8a6142');
      side.addColorStop(0.86, '#6b4a33');
      side.addColorStop(1, '#3e2b1f');
      ctx.fillStyle = side;
      ctx.beginPath();
      ctx.ellipse(GX, VY + T, RX, RY, 0, 0, Math.PI);
      ctx.lineTo(GX - RX, VY);
      ctx.ellipse(GX, VY, RX, RY, 0, Math.PI, 0, true);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,24,14,.35)';
      for (let k = 1; k <= 2; k++) (ctx.beginPath(), ctx.ellipse(GX, VY + T * (0.62 + k * 0.14), RX, RY, 0, 0.15, Math.PI - 0.15), ctx.stroke());
      const top = ctx.createRadialGradient(GX - RX * 0.3, VY - RY * 0.4, U * 0.02, GX, VY, RX);
      top.addColorStop(0, '#ffffff');
      top.addColorStop(1, '#cfdcf2');
      ctx.fillStyle = top;
      ctx.beginPath();
      ctx.ellipse(GX, VY, RX, RY, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // 칸 (살짝 솟은 눈 블록)
    for (let i = 0; i < N * N; i++) {
      const c = s.cells[i];
      if (!c.on) continue;
      const x = PX(cx(i)), y = PY(cy(i)), tw = CW - 3, tc = CH - 3;
      ctx.fillStyle = c.pond ? '#6f93bf' : '#b9c8e4';
      rr(ctx, x - tw / 2, y - tc / 2 + 2.5, tw, tc, 4);
      ctx.fill();
      if (c.pond) {
        const g = ctx.createLinearGradient(x - tw / 2, y - tc / 2, x + tw / 2, y + tc / 2);
        g.addColorStop(0, '#d6f1ff');
        g.addColorStop(0.5, '#9fd0f2');
        g.addColorStop(1, '#7fb2df');
        ctx.fillStyle = g;
      } else ctx.fillStyle = hash(i + s.night * 50) < 0.5 ? '#f7faff' : '#eef4fd';
      rr(ctx, x - tw / 2, y - tc / 2, tw, tc, 4);
      ctx.fill();
      if (c.pond) (ctx.strokeStyle = 'rgba(255,255,255,.7)'), (ctx.lineWidth = 1.2), ctx.beginPath(), ctx.moveTo(x - tw * 0.3, y + tc * 0.1), ctx.lineTo(x - tw * 0.05, y - tc * 0.2), ctx.stroke();
      if (c.wish) {
        ctx.save();
        ctx.shadowColor = '#ffd36b';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = `rgba(255,211,107,${0.6 + 0.3 * Math.sin(t / 10)})`;
        ctx.lineWidth = 2;
        rr(ctx, x - tw / 2 + 1, y - tc / 2 + 1, tw - 2, tc - 2, 4);
        ctx.stroke();
        ctx.restore();
      }
      if (c.snow > 0 && !c.thing) {
        // 눈 더미 (한 번 쌓임 — 한 번 더면 집)
        ctx.fillStyle = 'rgba(120,150,200,.35)';
        ctx.beginPath();
        ctx.ellipse(x, y + 2, CW * 0.36, CH * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        const g = ctx.createRadialGradient(x - CW * 0.1, y - CH * 0.3, 1, x, y, CW * 0.34);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(1, '#d5e3f7');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y - CH * 0.08, CW * 0.32, CH * 0.42, 0, Math.PI, 0);
        ctx.ellipse(x, y - CH * 0.08, CW * 0.32, CH * 0.16, 0, 0, Math.PI);
        ctx.fill();
      }
    }
    // 눈뭉치 그림자 (어느 칸 위에 떠 있는지) + 그 칸으로 살랑 떨어지는 눈송이
    for (const p of s.puffs) {
      const x = PX(cx(p.i)), y = PY(cy(p.i)), a = Math.min(1, (t - p.born) / 15), rx = CW * (p.big ? 0.42 : 0.34), ry = CH * (p.big ? 0.4 : 0.32);
      ctx.fillStyle = `rgba(40,70,150,${0.3 * a})`;
      ctx.strokeStyle = `rgba(90,140,230,${0.75 * a})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${0.8 * a})`;
      for (let k = 0; k < 4; k++) {
        const u = (t / 50 + k / 4 + p.i * 0.17) % 1;
        ctx.fillRect(x + Math.sin(u * 9 + k) * CW * 0.12, y - LIFT * (1 - u) + 2, 1.6, 1.6);
      }
    }
    // 집·나무·눈사람·주민 — 뒤 줄부터
    const litHouses = s.cells.map((c, i) => (c.thing === 'house' && c.lit && t >= c.litAt ? i : -1)).filter((i) => i >= 0);
    const festing = t - s.festT < 160;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = ix(x, y), c = s.cells[i];
        if (!c.on || !c.thing) continue;
        const bx = PX(x), by = PY(y) + CH * 0.18, age = t - c.born, sc = age < 16 ? backOut(age / 16) : 1, on = c.lit && t >= c.litAt;
        ctx.save();
        ctx.translate(bx, by);
        ctx.scale(sc, sc);
        ctx.fillStyle = 'rgba(40,60,110,.3)';
        ctx.beginPath();
        ctx.ellipse(2, 1, CW * 0.42, CH * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        if (c.thing === 'house') drawHouse(ctx, CW, i, on, c.roof, t, c.wish);
        if (c.thing === 'pine') drawPine(ctx, CW, 1, on, t, i);
        if (c.thing === 'tree') drawPine(ctx, CW, 1.75, true, t, i);
        if (c.thing === 'man') drawMan(ctx, CW, t, i);
        ctx.restore();
      }
      // 주민: 불 켠 집 앞을 오간다 (축제 땐 깡충)
      litHouses.forEach((hi, j) => {
        if (j >= 8 || cy(hi) !== y) return;
        const ph = t / 70 + j * 1.9, px = PX(cx(hi)) + Math.sin(ph) * CW * 0.42, py = PY(cy(hi)) + CH * 0.42 + Math.cos(ph * 0.8) * CH * 0.08;
        const jump = festing ? Math.abs(Math.sin(t / 6 + j)) * CW * 0.12 : 0;
        drawVillager(ctx, px, py - jump, CW, j, Math.cos(ph) > 0);
      });
    }
    // 꼬마전구 줄: 불 켜진 이웃끼리
    for (let i = 0; i < N * N; i++) {
      const a = s.cells[i];
      if (!a.on || !a.lit || !conducts(a)) continue;
      for (const j of [i + 1, i + N]) {
        if ((j === i + 1 && cx(i) === N - 1) || j >= N * N) continue;
        const b = s.cells[j];
        if (!b.on || !b.lit || !conducts(b) || t < Math.max(a.litAt, b.litAt)) continue;
        const hgt = (c: Cell) => (c.thing === 'tree' ? CW * 0.95 : c.thing === 'pine' ? CW * 0.55 : CW * 0.5);
        const x1 = PX(cx(i)), y1 = PY(cy(i)) + CH * 0.18 - hgt(a), x2 = PX(cx(j)), y2 = PY(cy(j)) + CH * 0.18 - hgt(b);
        const mxp = (x1 + x2) / 2, myp = (y1 + y2) / 2 + CW * 0.18;
        ctx.strokeStyle = 'rgba(30,30,40,.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(mxp, myp, x2, y2);
        ctx.stroke();
        for (let k = 1; k < 6; k++) {
          const u = k / 6, bx = (1 - u) ** 2 * x1 + 2 * (1 - u) * u * mxp + u * u * x2, by = (1 - u) ** 2 * y1 + 2 * (1 - u) * u * myp + u * u * y2;
          const col = ['#ffd36b', '#ff6b7f', '#7fe0ff', '#9dff8a'][(k + i) % 4], blink = Math.sin(t / 9 + k * 2 + i) > -0.4;
          ctx.save();
          ctx.shadowColor = col;
          ctx.shadowBlur = blink ? 8 : 0;
          ctx.fillStyle = blink ? col : 'rgba(80,80,90,.8)';
          ctx.beginPath();
          ctx.arc(bx, by + 1.5, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
    // 떠 있는 눈뭉치 / 날아가는 눈뭉치
    const fly = s.busy > 0 ? 1 - s.busy / FLY : 0;
    for (const p of s.puffs) drawPuff(ctx, PX(cx(p.i)), PY(cy(p.i)) - LIFT + Math.sin(t / 18 + p.i) * U * 0.006, CW, p.big, t, p.i, Math.min(1, (t - p.born) / 15));
    for (const f of s.flights) {
      const e = easeIO(Math.min(1, fly / 0.72)), drop = Math.max(0, (fly - 0.55) / 0.45);
      const x = PX(cx(f.from)) + (PX(cx(f.to)) - PX(cx(f.from))) * e, y = PY(cy(f.from)) + (PY(cy(f.to)) - PY(cy(f.from))) * e - LIFT * (1 - drop * drop);
      const [dx, dy] = DV[s.dir];
      for (let k = 3; k >= 1; k--) {
        ctx.fillStyle = `rgba(255,255,255,${0.15 * (4 - k) * (1 - drop)})`;
        ctx.beginPath();
        ctx.arc(x - dx * k * CW * 0.3, y - dy * k * CH * 0.3, CW * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      drawPuff(ctx, x, y, CW * (1 - 0.35 * drop), f.big, t, f.from, 1);
    }
    // 휘날리는 눈 (흔든 직후엔 그쪽으로 눈보라)
    {
      const st = t - s.shakeT, storm = Math.max(0, 1 - st / 80), [dx, dy] = DV[s.dir];
      for (let k = 0; k < 70; k++) {
        const a = hash(k + 500) * Math.PI * 2, rr0 = Math.sqrt(hash(k + 600)) * GR;
        let x = GX + Math.cos(a) * rr0 + Math.sin(t / 50 + k) * U * 0.012, y = GY + Math.sin(a) * rr0 + ((t * (0.2 + hash(k) * 0.3)) % (GR * 2)) - GR * 0.3;
        if (y > GY + GR) y -= GR * 2;
        x += dx * storm * U * 0.25 * Math.sin((st / 80) * Math.PI + k);
        y += dy * storm * U * 0.25 * Math.sin((st / 80) * Math.PI + k);
        ctx.fillStyle = `rgba(255,255,255,${0.45 + 0.4 * hash(k + 700)})`;
        if (storm > 0.05) {
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - dx * storm * 10, y - dy * storm * 10);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(x, y, 1 + hash(k + 800) * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    // ── 유리: 가장자리 반사·하이라이트 ──
    {
      const g = ctx.createRadialGradient(GX - GR * 0.2, GY - GR * 0.25, GR * 0.5, GX, GY, GR);
      g.addColorStop(0, 'rgba(200,230,255,0)');
      g.addColorStop(1, 'rgba(200,230,255,.22)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(GX, GY, GR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(230,245,255,.45)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,.38)';
      ctx.lineWidth = U * 0.022;
      ctx.beginPath();
      ctx.arc(GX, GY, GR * 0.86, Math.PI * 1.1, Math.PI * 1.38);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.22)';
      ctx.lineWidth = U * 0.01;
      ctx.beginPath();
      ctx.arc(GX, GY, GR * 0.9, Math.PI * 0.08, Math.PI * 0.3);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath();
      ctx.ellipse(GX - GR * 0.5, GY - GR * 0.62, U * 0.018, U * 0.01, -0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // ── 나무 받침 ──
    {
      const top = U * 0.985, bot = U * 1.13, r1 = U * 0.31, r2 = U * 0.37, ry = U * 0.05;
      const body = ctx.createLinearGradient(GX - r2, 0, GX + r2, 0);
      body.addColorStop(0, '#3d2314');
      body.addColorStop(0.35, '#8a5531');
      body.addColorStop(0.55, '#a8693c');
      body.addColorStop(1, '#3d2314');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(GX, top, r1, ry, 0, 0, Math.PI);
      ctx.lineTo(GX - r2, bot);
      ctx.ellipse(GX, bot, r2, ry * 1.1, 0, Math.PI, 0, true);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d9a46a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(GX, top, r1, ry, 0, 0.05, Math.PI - 0.05);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath();
      ctx.ellipse(GX, top + U * 0.06, (r1 + r2) / 2, ry, 0, 0.1, Math.PI - 0.1);
      ctx.stroke();
      // 축제 때마다 받침에 등불이 하나씩 (이번 판에 연 축제 수)
      for (let k = 0; k < Math.min(9, s.festAll); k++) {
        const u = (k + 0.5) / 9, a = Math.PI * (0.12 + 0.76 * u), lx = GX + Math.cos(a) * r1 * 1.08, ly = top + U * 0.035 + Math.sin(a) * ry * 1.4;
        ctx.save();
        ctx.shadowColor = '#ffb347';
        ctx.shadowBlur = 10;
        ctx.fillStyle = ['#ffd36b', '#ff8a6b', '#9dff8a'][k % 3];
        ctx.beginPath();
        ctx.arc(lx, ly, U * 0.008, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // 놋쇠 이름판
      const pw = U * 0.24, ph = U * 0.048, px = GX - pw / 2, py = top + U * 0.068;
      const brass = ctx.createLinearGradient(0, py, 0, py + ph);
      brass.addColorStop(0, '#ffe7a3');
      brass.addColorStop(0.5, '#d2a24c');
      brass.addColorStop(1, '#8c6424');
      ctx.fillStyle = brass;
      rr(ctx, px, py, pw, ph, 5);
      ctx.fill();
      ctx.fillStyle = '#4a3110';
      ctx.font = `800 ${U * 0.03}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${s.night + 1}번째 밤`, GX, py + ph / 2 + 1);
    }
    // ── 사건 → 연출 ──
    const seenT = fx.memo.t ?? -1;
    for (let i = 0; i < N * N; i++) {
      const c = s.cells[i];
      if (c.lit && c.thing === 'house' && c.litAt > seenT && c.litAt <= t && s.t - c.born < 200) {
        const x = PX(cx(i)), y = PY(cy(i)) - CW * 0.2;
        fx.burst(x, y, '#ffd36b', 10, 2.2, 2.2);
        fx.ring(x, y, '#ffd36b', CW * 0.7, 3);
        fx.pop(x, y - CW * 0.35, c.wish ? '✨×2' : '💡', '#ffd36b', 15);
      }
    }
    for (const e of s.events) {
      if (e.t <= seenT) continue;
      const x = PX(e.x), y = PY(e.y) - CW * 0.15;
      if (e.kind === 'shake') fx.kick(6);
      if (e.kind === 'grow') fx.burst(x, y, '#ffffff', 16, 2.6, 2.6), fx.ring(x, y + CW * 0.1, '#e8f1ff', CW * 0.8, 3), e.text && fx.pop(x, y - CW * 0.5, e.text, '#bfe0ff', 13);
      if (e.kind === 'drift') fx.burst(x, y + CW * 0.1, '#eef5ff', 7, 1.4, 2);
      if (e.kind === 'roof') fx.burst(x, y - CW * 0.3, '#dbe7f7', 10, 1.8, 2.2), fx.pop(x, y - CW * 0.6, e.text!, '#cfe3ff', 13);
      if (e.kind === 'melt') fx.burst(x, y, '#8fd3ff', 10, 1.6, 2), fx.pop(x, y - CW * 0.3, e.text!, '#8fd3ff', 12);
      if (e.kind === 'bury') fx.burst(x, y, '#ffffff', 26, 3.2, 3), fx.kick(9), fx.pop(x, y - CW * 0.6, e.text!, th.hot, 16);
      if (e.kind === 'dark') fx.pop(GX, GY - GR * 0.35, e.text!, th.hot, 16);
      if (e.kind === 'fest') {
        for (let k = 0; k < 4; k++) {
          const fxp = GX + (hash(e.t + k) - 0.5) * GR * 1.1, fyp = GY - GR * (0.3 + hash(e.t + k + 9) * 0.4), col = ['#ffd36b', '#ff6b9d', '#7fe0ff', '#9dff8a'][k];
          fx.burst(fxp, fyp, col, 26, 3.6, 2.6);
          fx.ring(fxp, fyp, col, U * 0.08, 3);
        }
        fx.blink('#ffe2a8', 0.2);
        fx.kick(6);
        fx.pop(GX, GY - GR * 0.68, e.text!, th.accent, 18);
      }
      if (e.kind === 'night') fx.pop(GX, GY - GR * 0.25, e.text!, '#ffffff', 18);
      if (e.kind === 'clear') fx.ring(GX, GY, th.accent, GR, 8), fx.burst(GX, GY - GR * 0.3, th.accent, 40, 5, 3), fx.blink('#fff1c8', 0.3), fx.pop(GX, GY - GR * 0.22, e.text!, '#ffffff', 20);
      if (e.kind === 'fail') fx.kick(10), fx.blink(th.hot, 0.3), fx.pop(GX, GY - GR * 0.3, e.text!, th.hot, 18);
    }
    fx.memo.t = t;
    ctx.restore();

    // ── HUD: 위 띠 ──
    ctx.fillStyle = 'rgba(8,10,28,.62)';
    ctx.fillRect(0, 0, w, U * 0.115);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = th.ink;
    ctx.font = `900 ${U * 0.045}px system-ui, sans-serif`;
    ctx.fillText(`🌙 밤 ${s.night + 1}/${NIGHTS} · 흔들기 ${s.left}번`, 10, 9);
    ctx.font = `700 ${U * 0.033}px system-ui, sans-serif`;
    ctx.fillStyle = th.accent;
    ctx.fillText(`💡 불 켠 집 ${s.lit}/${s.goal} · ★ ${s.stars} · 🎉 ${s.festAll}`, 10, 14 + U * 0.045);
    ctx.textAlign = 'right';
    ctx.fillStyle = th.hot;
    ctx.font = `700 ${U * 0.045}px system-ui, sans-serif`;
    ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - 10, 9);
    if (s.wind) {
      ctx.font = `700 ${U * 0.032}px system-ui, sans-serif`;
      ctx.fillStyle = '#bfe0ff';
      ctx.fillText(`🌬️ ${{ up: '↑', down: '↓', left: '←', right: '→' }[s.wind]}`, w - 10, 14 + U * 0.045);
    }
    // ── 아래 띠: 새것 안내 + 별 진행 막대 ──
    {
      const top = U * 1.185, by = U * 1.262, bx = U * 0.12, bw = U * 0.8, bh = U * 0.026, max = s.goal + 4, f = Math.min(1, s.lit / max);
      ctx.fillStyle = 'rgba(8,10,28,.66)';
      ctx.fillRect(0, top, w, h - top);
      ctx.fillStyle = 'rgba(255,255,255,.15)';
      rr(ctx, bx, by, bw, bh, bh / 2);
      ctx.fill();
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      g.addColorStop(0, '#ffb347');
      g.addColorStop(1, '#ffe08a');
      ctx.fillStyle = g;
      if (f > 0) (rr(ctx, bx, by, Math.max(bh, bw * f), bh, bh / 2), ctx.fill());
      ctx.textAlign = 'center';
      [s.goal, s.goal + 2, s.goal + 4].forEach((v, k) => {
        const tx = bx + bw * (v / max), ok = s.lit >= v;
        ctx.fillStyle = ok ? th.accent : 'rgba(255,255,255,.6)';
        ctx.fillRect(tx - 1, by - 3, 2, bh + 6);
        ctx.textBaseline = 'top';
        ctx.font = `800 ${U * 0.026}px system-ui, sans-serif`;
        ctx.fillText(String(v), tx - (k === 2 ? U * 0.012 : 0), by + bh + 3);
        ctx.textBaseline = 'bottom';
        ctx.font = `900 ${U * 0.024}px system-ui, sans-serif`;
        ctx.fillText('★'.repeat(k + 1), tx - (k === 2 ? U * 0.02 : 0), by - 3);
      });
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${U * 0.028}px system-ui, sans-serif`;
      ctx.fillText('💡', U * 0.035, by + bh / 2);
      const note = s.notes.find((n) => t >= n.t0 && t < n.t0 + 150);
      if (note) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `800 ${U * 0.033}px system-ui, sans-serif`;
        ctx.globalAlpha = Math.max(0, Math.min(1, (t - note.t0) / 10, (note.t0 + 150 - t) / 15));
        ctx.fillStyle = '#ffffff';
        ctx.fillText(note.text, w / 2, top + U * 0.03, w - 14);
        ctx.globalAlpha = 1;
      }
    }
    if (s.night === 0 && s.shook === 0 && s.t > 20) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${U * 0.05}px system-ui, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(10,14,40,.7)';
      const yy = GY - GR * 0.62 + Math.sin(t / 10) * 3;
      ctx.strokeText('👆 위로 쓱 밀어 흔들어 보세요', GX, yy);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('👆 위로 쓱 밀어 흔들어 보세요', GX, yy);
    }
  },
};

// ── 그리기 도우미 ──
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
const backOut = (u: number) => 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2;
const easeIO = (u: number) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) ** 2);
function mix(a: string, b: string, u: number) {
  const p = (c: string, k: number) => parseInt(c.slice(1 + k * 2, 3 + k * 2), 16);
  return `rgb(${[0, 1, 2].map((k) => Math.round(p(a, k) + (p(b, k) - p(a, k)) * u)).join(',')})`;
}
const WALLS = ['#d9825b', '#e3b26b', '#8fb0cf', '#c98a9a', '#a3c08a'], ROOFS = ['#9b3b3b', '#5a4a7a', '#3f6a5a', '#7a4a2e'];

/** 집: 앞벽 + 오른쪽 옆벽 + 앞쪽 지붕 경사면(눈 덮임) + 굴뚝. 불 켜지면 창이 따뜻하게 번진다 */
function drawHouse(ctx: CanvasRenderingContext2D, CW: number, i: number, on: boolean, roof: number, t: number, wish: boolean) {
  const ww = CW * 0.6, wh = CW * 0.36, sd = CW * 0.14, rh = CW * 0.26, wall = WALLS[i % WALLS.length], rf = ROOFS[(i >> 1) % ROOFS.length];
  const L = -ww / 2, R = ww / 2, B = 0, Tp = -wh;
  // 옆벽
  ctx.fillStyle = mix(wall, '#20203a', 0.45);
  ctx.beginPath();
  ctx.moveTo(R, B);
  ctx.lineTo(R + sd, B - sd * 0.7);
  ctx.lineTo(R + sd, Tp - sd * 0.7);
  ctx.lineTo(R, Tp);
  ctx.fill();
  // 앞벽
  const g = ctx.createLinearGradient(0, Tp, 0, B);
  g.addColorStop(0, wall);
  g.addColorStop(1, mix(wall, '#1a1a33', 0.3));
  ctx.fillStyle = g;
  ctx.fillRect(L, Tp, ww, wh);
  // 창·문
  const win = (x: number) => {
    if (on) {
      ctx.save();
      ctx.shadowColor = '#ffb347';
      ctx.shadowBlur = 10;
      ctx.fillStyle = Math.sin(t / 23 + i + x) > -0.95 ? '#ffd36b' : '#ffbf4d';
      ctx.fillRect(x - CW * 0.055, Tp + wh * 0.25, CW * 0.11, CW * 0.1);
      ctx.restore();
    } else (ctx.fillStyle = '#2b3556'), ctx.fillRect(x - CW * 0.055, Tp + wh * 0.25, CW * 0.11, CW * 0.1);
    ctx.fillStyle = 'rgba(60,30,20,.6)';
    ctx.fillRect(x - 0.5, Tp + wh * 0.25, 1, CW * 0.1);
  };
  win(L + ww * 0.24);
  win(R - ww * 0.24);
  ctx.fillStyle = on ? '#7a4a2a' : '#4a3424';
  ctx.fillRect(-CW * 0.05, B - wh * 0.5, CW * 0.1, wh * 0.5);
  // 지붕: 옆 박공(삼각) + 앞 경사면
  ctx.fillStyle = mix(rf, '#101020', 0.4);
  ctx.beginPath();
  ctx.moveTo(R, Tp);
  ctx.lineTo(R + sd, Tp - sd * 0.7);
  ctx.lineTo(R + sd * 0.4, Tp - rh - sd * 0.5);
  ctx.closePath();
  ctx.fill();
  const rg = ctx.createLinearGradient(0, Tp - rh, 0, Tp);
  rg.addColorStop(0, mix(rf, '#ffffff', 0.15));
  rg.addColorStop(1, rf);
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.moveTo(L - CW * 0.05, Tp + 1);
  ctx.lineTo(R + CW * 0.05, Tp + 1);
  ctx.lineTo(R + sd * 0.4, Tp - rh - sd * 0.5);
  ctx.lineTo(L + sd * 0.4, Tp - rh - sd * 0.5);
  ctx.closePath();
  ctx.fill();
  // 굴뚝 + 연기
  ctx.fillStyle = '#6b4a3a';
  ctx.fillRect(R - CW * 0.12, Tp - rh - CW * 0.06, CW * 0.07, CW * 0.12);
  if (on)
    for (let k = 0; k < 3; k++) {
      const u = ((t / 40 + k / 3 + i * 0.13) % 1);
      ctx.fillStyle = `rgba(230,236,250,${0.5 * (1 - u)})`;
      ctx.beginPath();
      ctx.arc(R - CW * 0.085 + Math.sin(u * 6 + i) * 3, Tp - rh - CW * 0.08 - u * CW * 0.35, CW * (0.03 + u * 0.05), 0, Math.PI * 2);
      ctx.fill();
    }
  // 지붕 눈: 기본 얇게, 지붕 눈 1이면 두툼하게 + 고드름 (경고)
  const snowH = roof > 0 ? rh * 0.95 : rh * 0.45;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(L + sd * 0.4 - 2, Tp - rh - sd * 0.5 - 1 - (roof > 0 ? CW * 0.06 : 0));
  ctx.quadraticCurveTo(0, Tp - rh - sd * 0.5 - (roof > 0 ? CW * 0.14 : CW * 0.03), R + sd * 0.4 + 2, Tp - rh - sd * 0.5 - 1 - (roof > 0 ? CW * 0.06 : 0));
  ctx.lineTo(R + sd * 0.4 - (sd * 0.4 - CW * 0.05) * (snowH / rh) + 1, Tp - rh - sd * 0.5 + snowH);
  for (let k = 5; k >= 0; k--) {
    const xx = L - CW * 0.05 + ((ww + CW * 0.1) * k) / 5, yy = Tp - rh - sd * 0.5 + snowH + (k % 2 ? 2.5 : 0);
    ctx.lineTo(xx + (sd * 0.4) * (1 - snowH / rh), yy);
  }
  ctx.closePath();
  ctx.fill();
  if (roof > 0) {
    ctx.fillStyle = '#d8ecff';
    for (let k = 0; k < 4; k++) {
      const xx = L + (ww * (k + 0.5)) / 4;
      ctx.beginPath();
      ctx.moveTo(xx - 2, Tp + 1);
      ctx.lineTo(xx + 2, Tp + 1);
      ctx.lineTo(xx, Tp + 4 + (k % 2) * 3);
      ctx.fill();
    }
  }
  if (wish) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `${CW * 0.22}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨', 0, Tp - rh - CW * 0.2);
  }
}

/** 전나무(크기 1) · 큰 트리(크기 1.75, 별) */
function drawPine(ctx: CanvasRenderingContext2D, CW: number, size: number, on: boolean, t: number, i: number) {
  const H = CW * 0.62 * size, W = CW * 0.36 * size;
  ctx.fillStyle = '#5a3a24';
  ctx.fillRect(-CW * 0.04 * size, -CW * 0.1 * size, CW * 0.08 * size, CW * 0.1 * size);
  for (let k = 0; k < 3; k++) {
    const yb = -CW * 0.08 * size - (H * k) / 3.4, wd = W * (1 - k * 0.25), ht = H * 0.45;
    const g = ctx.createLinearGradient(-wd, 0, wd, 0);
    g.addColorStop(0, '#1f5a3e');
    g.addColorStop(0.5, '#2f7a52');
    g.addColorStop(1, '#173f2c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-wd, yb);
    ctx.lineTo(0, yb - ht);
    ctx.lineTo(wd, yb);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f4f8ff';
    ctx.beginPath();
    ctx.moveTo(-wd * 0.55, yb - ht * 0.45);
    ctx.lineTo(0, yb - ht);
    ctx.lineTo(wd * 0.55, yb - ht * 0.45);
    ctx.quadraticCurveTo(0, yb - ht * 0.35, -wd * 0.55, yb - ht * 0.45);
    ctx.fill();
    if (on)
      for (let b = 0; b < 3 + k; b++) {
        const u = (b + 0.5) / (3 + k), col = ['#ffd36b', '#ff6b7f', '#7fe0ff'][(b + k + i) % 3], blink = Math.sin(t / 8 + b * 2.1 + k + i) > -0.3;
        ctx.save();
        ctx.shadowColor = col;
        ctx.shadowBlur = blink ? 7 : 0;
        ctx.fillStyle = blink ? col : '#555';
        ctx.beginPath();
        ctx.arc(-wd * 0.8 + wd * 1.6 * u, yb - ht * 0.12 - Math.sin(u * Math.PI) * ht * 0.08, 1.4 * Math.min(1.4, size), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
  }
  if (size > 1.5) {
    const sy = -CW * 0.08 * size - (H * 2) / 3.4 - H * 0.45 - 2;
    ctx.save();
    ctx.shadowColor = '#ffd36b';
    ctx.shadowBlur = 16 + 4 * Math.sin(t / 12);
    ctx.fillStyle = '#ffe27a';
    star(ctx, 0, sy, CW * 0.11, CW * 0.05);
    ctx.fill();
    ctx.restore();
  }
}
function star(ctx: CanvasRenderingContext2D, x: number, y: number, r1: number, r2: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? r2 : r1;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}
/** 묻힌 집 = 눈더미 위 눈사람 */
function drawMan(ctx: CanvasRenderingContext2D, CW: number, t: number, i: number) {
  const g = ctx.createRadialGradient(-CW * 0.1, -CW * 0.2, 1, 0, -CW * 0.1, CW * 0.4);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#c7d6ee');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -CW * 0.06, CW * 0.36, CW * 0.16, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = ROOFS[(i >> 1) % ROOFS.length];
  ctx.fillRect(CW * 0.14, -CW * 0.2, CW * 0.12, CW * 0.04);
  const wob = Math.sin(t / 30 + i) * 0.05;
  ctx.save();
  ctx.rotate(wob);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(-CW * 0.04, -CW * 0.26, CW * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-CW * 0.04, -CW * 0.43, CW * 0.085, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillRect(-CW * 0.075, -CW * 0.46, 2, 2);
  ctx.fillRect(-CW * 0.025, -CW * 0.46, 2, 2);
  ctx.fillStyle = '#ff8a3d';
  ctx.beginPath();
  ctx.moveTo(-CW * 0.04, -CW * 0.43);
  ctx.lineTo(CW * 0.04, -CW * 0.42);
  ctx.lineTo(-CW * 0.04, -CW * 0.41);
  ctx.fill();
  ctx.fillStyle = '#d64545';
  ctx.fillRect(-CW * 0.12, -CW * 0.37, CW * 0.16, CW * 0.035);
  ctx.restore();
}
const COATS = ['#e2574c', '#3d7fd9', '#f2b33d', '#5bbf7a', '#b06ad9', '#ef7fb0'];
function drawVillager(ctx: CanvasRenderingContext2D, x: number, y: number, CW: number, j: number, right: boolean) {
  const s = CW * 0.07;
  ctx.fillStyle = 'rgba(40,60,110,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + 1, s * 1.2, s * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COATS[j % COATS.length];
  ctx.beginPath();
  ctx.moveTo(x - s, y);
  ctx.lineTo(x + s, y);
  ctx.lineTo(x + s * 0.55, y - s * 2.2);
  ctx.lineTo(x - s * 0.55, y - s * 2.2);
  ctx.fill();
  ctx.fillStyle = '#ffe0c2';
  ctx.beginPath();
  ctx.arc(x, y - s * 2.8, s * 0.75, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COATS[(j + 2) % COATS.length];
  ctx.beginPath();
  ctx.arc(x, y - s * 3.1, s * 0.75, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + (right ? -s * 0.6 : s * 0.6), y - s * 3.5, s * 0.3, 0, Math.PI * 2);
  ctx.fill();
}
/** 떠 있는 눈뭉치: 뭉게뭉게(아래는 푸른 그늘) + 반짝이는 눈송이. 함박눈은 크고 ❄️ */
function drawPuff(ctx: CanvasRenderingContext2D, x: number, y: number, CW: number, big: boolean, t: number, i: number, a: number) {
  const r = CW * (big ? 0.21 : 0.155);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.shadowColor = big ? '#8fd0ff' : '#b8d4ff';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#9fb6e6';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.35, r * 1.45, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.5, 1, x, y, r * 1.6);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.7, '#f1f6ff');
  g.addColorStop(1, big ? '#b9dcff' : '#cfdcf6');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const an = (k / 5) * Math.PI * 2 + t / 60 + i, px = x + Math.cos(an) * r * 0.75, py = y + Math.sin(an) * r * 0.4 - r * 0.1;
    ctx.moveTo(px + r * 0.72, py);
    ctx.arc(px, py, r * 0.72, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (let k = 0; k < 5; k++) {
    const an = t / 25 + k * 1.26 + i;
    ctx.fillRect(x + Math.cos(an) * r * 1.7, y + Math.sin(an) * r * 1.1, 1.8, 1.8);
  }
  if (big) {
    ctx.font = `${r * 1.15}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('❄️', x, y);
  }
  ctx.restore();
}

// ── 봇 ──
const tick = new WeakMap<object, number>();
/** 봇: 아무 방향으로, 아무 때나 흔든다 */
export const snowglobeRandom: Bot<SnowState> = {
  name: '아무렇게나',
  act(s, rng) {
    const next = tick.get(s) ?? 40 + Math.floor(rng() * 60);
    if (s.t < next) return { tap: false, dir: 0 };
    tick.set(s, s.t + 40 + Math.floor(rng() * 60));
    return { tap: false, dir: 0, move: DIRS[Math.floor(rng() * 4)] };
  },
};

/** 판 가치: 불 켠 집이 최우선, 지붕 눈은 위험, 불빛 옆 눈 더미는 다음 수의 씨앗 */
function value(cells: Cell[]) {
  let v = 0;
  cells.forEach((c, i) => {
    if (!c.on) return;
    if (c.thing === 'house') v += c.lit ? (c.wish ? 200 : 100) - c.roof * 30 : 22 - c.roof * 10;
    else if (c.thing === 'man') v -= 12;
    else if (!c.thing && !c.pond && c.snow === 1) {
      const near = Object.values(DV).some(([dx, dy]) => onBoard(cx(i) + dx, cy(i) + dy) && cells[ix(cx(i) + dx, cy(i) + dy)].lit);
      v += near ? (c.wish ? 70 : 34) : 7;
    }
  });
  return v;
}
/** 봇: 네 방향을 다 흔들어 보고(같은 land·settle·lights 함수) 가장 좋은 판을 고른다 */
export const snowglobeSmart: Bot<SnowState> = {
  name: '스노볼 장인',
  act(s) {
    if (s.pause > 0 || s.busy > 0 || s.left <= 0 || s.dead || s.done) return { tap: false, dir: 0 };
    let best: Dir = 'up', bv = -1e9;
    for (const d of DIRS) {
      const cl = s.cells.map((c) => ({ ...c }));
      settle(cl, land(cl, s.puffs, d, s.wind), s.t);
      const lit = lights(cl, s.t);
      let v = value(cl) + (lit >= s.goal + 4 ? 500 : 0);
      if (s.left === 1) v += lit >= s.goal ? 1000 : 0;
      if (v > bv) (bv = v), (best = d);
    }
    return { tap: false, dir: 0, move: best };
  },
};
