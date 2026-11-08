/**
 * 계절 숲 (0038, 19라운드 메뉴 7번) — 방치형 × 낮과 밤 × 원버튼.
 * 기준 9(조작 최소): 손이 하는 일은 '탭 = 다음 계절로' 하나뿐. 가만히 두면 해가 져서 저절로 넘어간다(방치형).
 * 와우: 탭할 때마다 하늘에 뜬 작은 숲 섬이 옷을 갈아입는다 — 봄에 튼 싹이 여름에 나무로 쑥 자라 꽃이 열매가 되고,
 *       가을에 익고, 겨울엔 눈이 쌓인다. 익은 열매는 거두는 순간 옆 칸에 씨앗으로 떨어져 숲이 한 해씩 번진다.
 * 첫 3초: 봄 섬에 새싹이 톡톡 튼다 → 탭 한 번에 여름, 어린 나무 둘이 쑥 자라고 새가 날아와 둥지를 튼다.
 * 고민 거리(언제): 계절마다 좋은 일과 나쁜 일이 실시간으로 다가온다 — 가을엔 익음 ↔ 다람쥐, 여름엔 열매 맺힘 ↔ 폭풍,
 *       봄엔 싹 ↔ 늦서리, 겨울엔 눈(다음 봄 싹) ↔ 사슴. 아래 띠에 해가 지나가는 길과 다가오는 일이 미리 보인다.
 * 목표·보상: 판마다 정해진 해 동안 열매 목표 → 별 1~3. 못 채우면 하트 -1, 그 판 처음 숲으로 다시. 숲은 판을 넘어 이어진다.
 * 펼쳐짐(판마다 다른 계절의 타이밍이 생긴다): 1판 둥지·다람쥐(가을) → 2판 폭풍(여름) → 3판 참나무(늦게 익는 두 배 도토리)
 *       → 4판 늦서리(봄) → 5판 사슴(겨울) → 6판 소나무(겨울에 익는 솔방울).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.35, N = 7, MIN_SEASON = 10;
/** 계절: 이름 · 그림 · 해가 지는(저절로 넘어가는) 틱 */
export const SEASONS = [
  { name: '봄', e: '🌸', max: 180 },
  { name: '여름', e: '☀️', max: 200 },
  { name: '가을', e: '🍁', max: 220 },
  { name: '겨울', e: '❄️', max: 150 },
];
/** 나무 종류: 열매 값 · 익는 계절(2 가을, 3 겨울) · 익는 틱 범위 · 열매 수(어린/보통/큰 나무) */
export const SPECIES = [
  { name: '사과나무', e: '🍎', val: 1, ripe: 2, rip: [15, 110], n: [2, 3, 4], col: '#ff3b30', green: '#a6d64f' },
  { name: '참나무', e: '🌰', val: 2, ripe: 2, rip: [60, 180], n: [2, 3, 3], col: '#a0622a', green: '#9cb84a' },
  { name: '소나무', e: '🌲', val: 2, ripe: 3, rip: [25, 125], n: [2, 2, 3], col: '#8a5a2b', green: '#7d9a45' },
];
/** 판: 해 수 · 섬 크기(n×n, 판마다 땅이 넓어진다) · 열매 목표(별 1·2·3) */
export const STAGES = [
  { years: 2, n: 3, goal: [4, 8, 12] },
  { years: 2, n: 4, goal: [14, 24, 34] },
  { years: 3, n: 4, goal: [40, 65, 90] },
  { years: 3, n: 5, goal: [60, 95, 130] },
  { years: 3, n: 6, goal: [80, 130, 175] },
  { years: 3, n: 7, goal: [120, 200, 270] },
];
const DEX: Record<string, string> = { nest: '🐦', squirrel: '🐿️', oak: '🌰', deer: '🦌', pine: '🌲' };

/** g: -1 하늘(아직 땅 아님) · 0 빈 땅 · 1 씨앗 · 2 새싹 · 3 어린 나무 · 4 나무 · 5 그루터기 */
interface Tile { g: number; sp: number; age: number; u: number; v: number; nest: number; at: number; hurt: number }
/** st: 0 꽃 · 1 풋열매 · 2 익음 · 4 사라짐(먹힘·떨어짐) */
interface Fruit { tile: number; k: number; set: number; rip: number; st: number; sp: number }
interface Critter { kind: 'sq' | 'deer'; at: number; x: number; y: number; fx: number; fy: number; tx: number; ty: number; t0: number; t1: number; target: number; next: number; ate: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; n?: number }
export interface SeasonsState {
  rng: Rng; t: number; stage: number; year: number; season: number; st: number; sid: number; sAt: number; n: number; n0: number; grewAt: number;
  tiles: Tile[]; fruits: Fruit[]; critters: Critter[];
  snow: number; storm: number; frost: number; strikeAt: number;
  harvest: number; total: number; stars: number; hearts: number; pause: number; result: number; done: boolean; dead: boolean;
  snap: { tiles: Tile[]; snow: number } | null; lastStars: number;
  /** 계절을 넘기는 순간 섬에 있던 동물들 — 깜짝 놀라 데굴데굴 굴러 떨어진다(연출용) */
  fled: { kind: string; x: number; y: number; ate: number }[]; fledAt: number;
  seen: Set<string>; events: Ev[]; taps: number;
}

const ev = (s: SeasonsState, kind: string, x: number, y: number, text?: string, n?: number) => s.events.push({ t: s.t, kind, x, y, text, n });
function see(s: SeasonsState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  ev(s, 'new', 2, 2, text);
}
const gi = (k: number) => Math.floor(k / N), gj = (k: number) => k % N;
const near = (k: number) => {
  const out: number[] = [];
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
    const i = gi(k) + di, j = gj(k) + dj;
    if ((di || dj) && i >= 0 && j >= 0 && i < N && j < N) out.push(i * N + j);
  }
  return out;
};
const count = (s: SeasonsState, g: number) => s.tiles.reduce((a, t) => a + (t.g === g ? 1 : 0), 0);
/** 지난 겨울 눈이 많을수록 봄에 싹 트는 씨앗이 많다 */
const thr = (s: SeasonsState) => 0.35 + 0.65 * s.snow;
const fruitN = (t: Tile) => SPECIES[t.sp].n[t.age <= 0 ? 0 : t.age >= 3 ? 2 : 1];

function plantSeed(s: SeasonsState, k: number, sp: number) {
  const t = s.tiles[k];
  t.g = 1;
  t.sp = sp;
  t.age = 0;
  t.u = s.rng();
  t.nest = 0;
  t.at = s.t;
}

function startStage(s: SeasonsState, retry: boolean) {
  const k = s.stage;
  s.year = 0;
  s.harvest = 0;
  if (!retry) {
    // 땅이 넓어진다: 앞쪽에 새 줄이 붙는다
    if (STAGES[k].n > s.n) {
      s.n0 = s.n;
      s.n = STAGES[k].n;
      s.grewAt = s.t;
      s.tiles.forEach((t, i) => {
        if (t.g === -1 && gi(i) < s.n && gj(i) < s.n) (t.g = 0), (t.at = s.t);
      });
      if (k > 0) see(s, 'land', '🏝️ 땅이 넓어졌어요 — 새 땅에 씨앗을 퍼뜨려요');
    }
    // 새 나무 종류 선물: 어린 나무 둘 (다음 여름에 나무가 된다)
    const gift = k === 2 ? 1 : k === 5 ? 2 : -1;
    if (gift > 0) {
      const free = s.tiles.map((t, i) => (t.g === 0 || t.g === 1 || t.g === 5 ? i : -1)).filter((i) => i >= 0);
      const trees = s.tiles.map((t, i) => (t.g >= 3 && t.g <= 4 && t.sp === 0 ? i : -1)).filter((i) => i >= 0);
      for (let n = 0; n < 2; n++) {
        const pool = free.length ? free : trees;
        if (!pool.length) break;
        const i = pool.splice(Math.floor(s.rng() * pool.length), 1)[0], t = s.tiles[i];
        if (t.g === 4) t.sp = gift;
        else Object.assign(t, { g: 3, sp: gift, age: 1, nest: 0, at: s.t });
        ev(s, 'gift', gi(i), gj(i), SPECIES[gift].e);
      }
      see(s, gift === 1 ? 'oak' : 'pine', gift === 1 ? '🌰 참나무 — 도토리는 늦게 익지만 두 배! 다람쥐가 좋아해요' : '🌲 소나무 — 솔방울은 겨울에 익어요 (두 배)');
    }
    s.snap = { tiles: s.tiles.map((t) => ({ ...t })), snow: s.snow };
  }
  const g = STAGES[k];
  ev(s, 'stage', 2, 2, `${k + 1}판 — ${g.years}년 동안 열매 ${g.goal[0]}개`);
  s.season = 0;
  begin(s);
}

/** 계절이 시작될 때: 이 계절 안에 일어날 일(싹·맺힘·익음·손님 도착)을 미리 정해 둔다 — 계절 중엔 난수를 쓰지 않는다 */
function begin(s: SeasonsState) {
  s.st = 0;
  s.sid++;
  s.sAt = s.t;
  s.critters = [];
  s.storm = s.frost = s.strikeAt = 0;
  const se = s.season, k = s.stage, first = k === 0 && s.year === 0;
  ev(s, 'season', 2, 2, `${SEASONS[se].e} ${SEASONS[se].name}`);
  if (se === 0) {
    for (const t of s.tiles) if (t.g === 1) t.v = first ? 8 + Math.floor(s.rng() * 40) : 10 + Math.floor(s.rng() * 110);
    if (k >= 3) {
      s.frost = 70 + Math.floor(s.rng() * 80);
      see(s, 'frost', '🥶 늦서리 — 서리가 내리면 그 전에 튼 싹이 얼어요');
    }
  } else if (se === 1) {
    // 쑥! 어린 나무는 나무로, 새싹은 어린 나무로
    s.tiles.forEach((t, i) => {
      if (t.g === 3 && t.age >= 1) (t.g = 4), (t.age = 0), (t.at = s.t), ev(s, 'grow', gi(i), gj(i));
      else if (t.g === 2) (t.g = 3), (t.age = 0), (t.at = s.t), ev(s, 'sapling', gi(i), gj(i));
    });
    s.fruits = [];
    s.tiles.forEach((t, i) => {
      if (t.g !== 4) return;
      for (let q = 0; q < fruitN(t); q++) s.fruits.push({ tile: i, k: q, set: 15 + Math.floor(s.rng() * 115), rip: 0, st: 0, sp: t.sp });
    });
    // 새가 둥지를 튼다 (나무 다섯 그루마다 하나 더)
    const trees = s.tiles.map((t, i) => (t.g === 4 ? i : -1)).filter((i) => i >= 0);
    const want = Math.min(4, Math.ceil(trees.length / 5)), have = trees.filter((i) => s.tiles[i].nest).length;
    const open = trees.filter((i) => !s.tiles[i].nest).sort((a, b) => s.tiles[b].age - s.tiles[a].age || a - b);
    for (let n = have; n < want && open.length; n++) {
      const i = open.shift()!;
      s.tiles[i].nest = s.t;
      ev(s, 'nest', gi(i), gj(i));
      see(s, 'nest', '🐦 새가 둥지를 틀었어요 — 가을마다 씨앗을 멀리 날라요');
    }
    if (k >= 1 && trees.length) {
      s.storm = 60 + Math.floor(s.rng() * 90);
      see(s, 'storm', '⛈️ 여름 폭풍 — 오기 전에 넘기면 피해요 (번개·바람)');
    }
  } else if (se === 2 || se === 3) {
    for (const f of s.fruits) if (f.st === 1 && SPECIES[f.sp].ripe === se) f.rip = SPECIES[f.sp].rip[0] + Math.floor(s.rng() * (SPECIES[f.sp].rip[1] - SPECIES[f.sp].rip[0]));
    if (se === 2) {
      s.snow = 0;
      const trees = count(s, 4), n = k === 0 ? 1 : Math.min(5, 1 + Math.floor(trees / 4)), at = k === 0 ? 110 : 50 + Math.floor(s.rng() * 30);
      for (let q = 0; q < n; q++) s.critters.push(critter(s, 'sq', at + q * 35, q));
    } else if (k >= 4) {
      const n = Math.min(3, 1 + Math.floor(count(s, 3) / 3)), at = 40 + Math.floor(s.rng() * 40);
      for (let q = 0; q < n; q++) s.critters.push(critter(s, 'deer', at + q * 35, q));
    }
  }
}

function critter(s: SeasonsState, kind: 'sq' | 'deer', at: number, q: number): Critter {
  // 섬 앞쪽 가장자리 밖에서 들어온다
  const side = (q + s.sid) % 2, along = (q * 1.7 + 0.4) % s.n, x = side ? s.n - 0.1 : along, y = side ? along : s.n - 0.1;
  return { kind, at, x, y, fx: x, fy: y, tx: x, ty: y, t0: at, t1: at, target: -1, next: at, ate: 0 };
}

/** 계절 안의 한 틱 (난수 없음 — 잘하는 봇이 이 함수로 앞날을 그대로 내다본다) */
function tick(s: SeasonsState) {
  const st = s.st, se = s.season;
  if (se === 0) {
    const th = thr(s);
    s.tiles.forEach((t, i) => {
      if (t.g === 1 && t.u < th && t.v === st) (t.g = 2), (t.at = s.t), ev(s, 'sprout', gi(i), gj(i));
    });
    if (s.frost && st === s.frost) {
      let n = 0;
      s.tiles.forEach((t, i) => {
        if (t.g === 2) (t.g = 0), (t.at = s.t), n++, ev(s, 'frozen', gi(i), gj(i));
      });
      ev(s, 'frost', 2, 2, n ? `🥶 서리! 싹 ${n}개가 얼었어요` : '🥶 서리 — 피했다!', n);
    }
  } else if (se === 1) {
    for (const f of s.fruits) if (f.st === 0 && f.set === st) f.st = 1;
    if (s.storm && st === s.storm) strike(s);
  } else {
    for (const f of s.fruits) if (f.st === 1 && SPECIES[f.sp].ripe === se && f.rip === st) (f.st = 2), ev(s, 'ripe', gi(f.tile), gj(f.tile), undefined, f.sp);
    if (se === 3) s.snow = Math.min(1, st / 110);
    for (const c of s.critters) moveCritter(s, c);
  }
}

function moveCritter(s: SeasonsState, c: Critter) {
  const st = s.st;
  if (st < c.at) return;
  if (st === c.at) {
    ev(s, c.kind, c.x, c.y);
    if (c.kind === 'sq') see(s, 'squirrel', '🐿️ 다람쥐 — 익은 열매를 먹어요. 다 익기 전 vs 먹히기 전!');
    else see(s, 'deer', '🦌 사슴 — 겨울에 어린 나무를 뜯어요');
  }
  if (c.target >= 0) {
    if (st < c.t1) return;
    c.x = c.tx;
    c.y = c.ty;
    if (c.kind === 'sq') {
      const f = s.fruits[c.target];
      if (f && f.st === 2) (f.st = 4), c.ate++, (s.tiles[f.tile].hurt = s.t), ev(s, 'eat', c.x, c.y, undefined, f.sp);
    } else {
      const t = s.tiles[c.target];
      if (t.g === 3) (t.g = 0), (t.at = s.t), ev(s, 'browse', c.x, c.y);
    }
    c.target = -1;
    c.next = st + (c.kind === 'sq' ? 12 : 30);
    return;
  }
  if (st < c.next) return;
  let best = -1, bd = 1e9;
  const taken = (k: number) => s.critters.some((o) => o !== c && o.kind === c.kind && o.target === k);
  if (c.kind === 'sq') {
    s.fruits.forEach((f, k) => {
      if (f.st !== 2 || taken(k)) return;
      const d = Math.hypot(gi(f.tile) - c.x, gj(f.tile) - c.y) - 2.5 * SPECIES[f.sp].val;
      if (d < bd) (bd = d), (best = k);
    });
  } else {
    s.tiles.forEach((t, k) => {
      if (t.g !== 3 || taken(k)) return;
      const d = Math.hypot(gi(k) - c.x, gj(k) - c.y);
      if (d < bd) (bd = d), (best = k);
    });
  }
  if (best < 0) return void (c.next = st + 4);
  const tile = c.kind === 'sq' ? s.fruits[best].tile : best;
  c.target = best;
  c.fx = c.x;
  c.fy = c.y;
  c.tx = gi(tile) + 0.18;
  c.ty = gj(tile) + 0.18;
  c.t0 = st;
  c.t1 = st + Math.max(6, Math.round(Math.hypot(c.tx - c.x, c.ty - c.y) * (c.kind === 'sq' ? 7 : 12)));
}

/** 여름 폭풍: 가장 큰 나무에 번개, 바람이 풋열매 절반을 떨군다 */
function strike(s: SeasonsState) {
  let best = -1, score = -1;
  s.tiles.forEach((t, i) => {
    if (t.g !== 4) return;
    const v = t.age * 10 + s.fruits.filter((f) => f.tile === i && f.st < 4).length;
    if (v > score) (score = v), (best = i);
  });
  let knocked = 0;
  for (const f of s.fruits) {
    if (f.st >= 4) continue;
    if (f.tile === best) f.st = 4;
    else if (f.st === 1 && (f.tile + f.k) % 2 === 0) (f.st = 4), knocked++;
  }
  s.strikeAt = s.t;
  if (best >= 0) {
    const t = s.tiles[best];
    if (t.nest) ev(s, 'squawk', gi(best), gj(best));
    Object.assign(t, { g: 5, age: 0, nest: 0, at: s.t });
    ev(s, 'storm', gi(best), gj(best), `⚡ 쾅! 나무 1그루${knocked ? ` · 열매 ${knocked}개 떨어짐` : ''}`);
  }
}

/** 지금 계절을 끝낸다 (탭 또는 해 질 녘) */
function advance(s: SeasonsState) {
  const se = s.season;
  // 섬에 있던 동물은 계절이 휙 바뀌자 화들짝 — 데굴데굴 굴러 섬 밖으로
  const here = s.critters.filter((c) => s.st >= c.at);
  if (here.length) {
    s.fledAt = s.t;
    s.fled = here.map((c) => {
      const q = c.target >= 0 ? Math.min(1, (s.st - c.t0) / Math.max(1, c.t1 - c.t0)) : 1;
      const x = c.target >= 0 ? c.fx + (c.tx - c.fx) * q : c.x, y = c.target >= 0 ? c.fy + (c.ty - c.fy) * q : c.y;
      ev(s, 'flee', x, y, c.kind === 'sq' ? (c.ate ? '헉! 볼 빵빵' : '헉!') : '미끄덩~');
      return { kind: c.kind, x, y, ate: c.ate };
    });
  }
  if (se === 0) {
    let n = 0;
    for (const t of s.tiles) if (t.g === 1) (t.g = 0), n++;
    if (n) ev(s, 'dry', 2, 2, `싹 못 튼 씨앗 ${n}개는 흙으로`);
  } else if (se === 1) {
    s.fruits = s.fruits.filter((f) => f.st === 1);
  } else harvest(s, se);
  if (se === 3) {
    // 한 해가 간다
    for (const t of s.tiles) {
      if (t.g === 3 || t.g === 4) t.age++;
      else if (t.g === 5 && ++t.age >= 2) (t.g = 0), (t.age = 0);
    }
    s.year++;
    if (s.year >= STAGES[s.stage].years) return endStage(s);
  }
  s.season = (se + 1) % 4;
  begin(s);
}

/** 거두기: 익은 열매는 열매 수에 더하고 옆 빈 땅에 씨앗으로 떨어진다. 덜 익은 열매는 썩는다 */
function harvest(s: SeasonsState, se: number) {
  let got = 0, rot = 0;
  const from = new Set<number>();
  for (const f of s.fruits) {
    if (SPECIES[f.sp].ripe !== se) continue;
    if (f.st === 2) {
      got += SPECIES[f.sp].val;
      from.add(f.tile);
      const free = near(f.tile).filter((k) => s.tiles[k].g === 0);
      if (free.length) {
        const k = free[Math.floor(s.rng() * free.length)];
        plantSeed(s, k, f.sp);
        ev(s, 'seed', gi(k), gj(k), undefined, f.sp);
      }
      ev(s, 'pick', gi(f.tile), gj(f.tile), undefined, f.sp);
    } else if (f.st === 1) rot++;
  }
  // 둥지의 새가 씨앗을 멀리 나른다
  if (got) for (const [i, t] of s.tiles.entries()) {
    if (t.g !== 4 || !t.nest) continue;
    const free = s.tiles.map((x, k) => (x.g === 0 ? k : -1)).filter((k) => k >= 0);
    if (!free.length) break;
    const k = free[Math.floor(s.rng() * free.length)];
    plantSeed(s, k, t.sp);
    ev(s, 'fly', gi(k), gj(k), `${gi(i)},${gj(i)}`);
  }
  s.fruits = s.fruits.filter((f) => SPECIES[f.sp].ripe !== se);
  s.harvest += got;
  s.total += got;
  if (got) ev(s, 'harvest', 2, 2, `+${got} ${se === 3 ? '🌰' : '🍎'}`, got);
  if (rot) ev(s, 'rot', 2, 2.6, `🤢 덜 익은 ${rot}개 썩음`, rot);
}

function endStage(s: SeasonsState) {
  const g = STAGES[s.stage].goal, h = s.harvest, st = h >= g[2] ? 3 : h >= g[1] ? 2 : h >= g[0] ? 1 : 0;
  s.season = 3;
  s.pause = 120;
  s.lastStars = st;
  if (st) {
    s.stars += st;
    s.result = 1;
    ev(s, 'clear', 2, 2, `${s.stage + 1}판 통과! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`);
  } else {
    s.result = -1;
    s.hearts--;
    ev(s, 'fail', 2, 2, `열매 ${h}/${g[0]} — 하트 -1 · 이 판 다시`);
    if (s.hearts <= 0) s.dead = true;
  }
}

function afterPause(s: SeasonsState) {
  if (s.result === 1) {
    if (s.stage >= STAGES.length - 1) return void (s.done = true);
    s.stage++;
    startStage(s, false);
  } else {
    s.tiles = s.snap!.tiles.map((t) => ({ ...t, at: s.t }));
    s.snow = s.snap!.snow;
    s.fruits = [];
    startStage(s, true);
  }
}

/** 지금 넘기면 얻는 것 (봇이 앞날과 비교하는 값, 화면 아래 '지금 넘기면'에도 쓴다) */
export function value(s: SeasonsState): number {
  const se = s.season;
  if (se === 0) return count(s, 2);
  if (se === 1) return s.fruits.reduce((a, f) => a + (f.st === 1 ? SPECIES[f.sp].val : 0), 0) + 4 * count(s, 4) + count(s, 3);
  const ripe = s.fruits.reduce((a, f) => a + (f.st === 2 && SPECIES[f.sp].ripe === se ? SPECIES[f.sp].val : 0), 0);
  if (se === 2) return ripe;
  const th = 0.35 + 0.65 * s.snow;
  return ripe + s.tiles.reduce((a, t) => a + (t.g === 1 && t.u < th ? 1 : 0), 0) + 3 * count(s, 3);
}

export const seasons: GameDef<SeasonsState> = {
  id: 'seasons',
  name: '계절 숲',
  genes: ['idle', 'daynight', 'onebutton'],
  twist: '버튼 하나가 시간을 민다 — 탭할 때마다 하늘에 뜬 숲 섬의 계절이 넘어가 싹이 나무로 쑥 자라고 열매가 익는데, 계절마다 좋은 일(싹·맺힘·익음·눈)과 나쁜 일(서리·폭풍·다람쥐·사슴)이 실시간으로 다가와서 "언제 넘기나"가 곧 숲의 운명이 된다',
  rules: [
    '탭하면 다음 계절로 — 봄 싹, 여름 열매, 가을 익음, 겨울 눈. 가만히 두면 해 질 녘에 저절로 넘어가요.',
    '가을엔 익은 열매만 거둬요. 일찍 넘기면 썩고, 늦으면 다람쥐가 먹어요. 거둔 열매는 씨앗이 돼요.',
    '판마다 정해진 해 동안 열매 목표를 채우면 별, 못 채우면 하트 -1 하고 그 판만 다시.',
  ],
  controls: 'tap',
  hint: '탭 = 다음 계절로 / 스페이스',
  aspect: A,
  art: {
    concept: '하늘에 뜬 사계절 숲 섬',
    mood: '흙층이 드러난 작은 땅 덩어리가 구름 위에 떠 있다. 탭할 때마다 벚꽃·짙은 초록·단풍·눈으로 옷을 갈아입고, 해가 뜨고 지며 그림자가 돈다. 다람쥐가 뛰고 새가 둥지를 튼다.',
    palette: { bg: '#cfe9f5', ink: '#20301f', muted: '#6f8f6a', accent: '#5fb83e', hot: '#ff5a4e', soft: '#eef7e6' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s: SeasonsState = {
      rng: mulberry32(seed), t: 0, stage: 0, year: 0, season: 0, st: 0, sid: 0, sAt: 0, n: 3, n0: 3, grewAt: -99,
      tiles: [...Array(N * N)].map((_, k) => ({ g: gi(k) < 3 && gj(k) < 3 ? 0 : -1, sp: 0, age: 0, u: 0, v: 0, nest: 0, at: -99, hurt: -99 })), fruits: [], critters: [],
      snow: 1, storm: 0, frost: 0, strikeAt: 0, harvest: 0, total: 0, stars: 0, hearts: 3, pause: 0, result: 0, done: false, dead: false,
      snap: null, lastStars: 0, fled: [], fledAt: -99, seen: new Set<string>(), events: [], taps: 0,
    };
    // 지난해 심긴 어린 나무 둘 + 갓 뿌린 씨앗 셋 — 첫 여름에 나무 둘이 쑥 자란다
    for (const [i, j] of [[0, 2], [2, 0]]) Object.assign(s.tiles[i * N + j], { g: 3, age: 1 });
    for (const [i, j] of [[1, 1], [0, 0], [2, 2]]) Object.assign(s.tiles[i * N + j], { g: 1, u: 0 });
    startStage(s, false);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.events = s.events.filter((e) => s.t - e.t < 120);
    if (s.pause > 0) {
      if (--s.pause === 0 && !s.dead) afterPause(s);
      return;
    }
    s.st++;
    tick(s);
    const tap = inp.tap && s.st >= MIN_SEASON;
    if (tap) s.taps++;
    if (tap || s.st >= SEASONS[s.season].max) advance(s);
  },
  over: (s) => s.dead || s.done,
  score: (s) => s.total + 10 * s.stars,
  draw(ctx, s, w, h, th: Theme) {
    drawScene(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
function mix(a: string, b: string, k: number) {
  const x = hex(a), y = hex(b), q = Math.max(0, Math.min(1, k));
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * q)).join(',')})`;
}
const toHex = (rgb: string) => '#' + rgb.slice(4, -1).split(',').map((v) => (+v).toString(16).padStart(2, '0')).join('');
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** 계절별 색: 하늘 위·아래, 풀, 풀 그늘, 잎 */
const PAL = [
  { sky: '#a9dcff', sky2: '#ffe1ee', grass: '#9edb67', grass2: '#88cc55', leaf: '#86d35c' },
  { sky: '#5cbcff', sky2: '#d6f4ff', grass: '#5fb83e', grass2: '#4fa633', leaf: '#3b9a34' },
  { sky: '#ffb877', sky2: '#ffe9c4', grass: '#cfae4b', grass2: '#bd983b', leaf: '#ee8a26' },
  { sky: '#9db3cf', sky2: '#eaf0f7', grass: '#b7a983', grass2: '#a8997a', leaf: '#7f6a55' },
];
const SNOW = '#f4f8fc';

function drawScene(ctx: CanvasRenderingContext2D, s: SeasonsState, w: number, h: number, th: Theme) {
  const fx = juice(s), R = (r: number) => r * w;
  const se = s.season, prev = (se + 3) % 4, k = s.sid <= 1 ? 1 : Math.min(1, (s.t - s.sAt) / 40), p = s.pause ? 1 : Math.min(1, s.st / SEASONS[se].max);
  const snowNow = se === 3 ? s.snow : se === 0 ? s.snow * (1 - smooth(0, 1, k)) : 0;
  const pal = (key: 'sky' | 'sky2' | 'grass' | 'grass2' | 'leaf', i: number) => PAL[i][key];
  const col = (key: 'sky' | 'sky2' | 'grass' | 'grass2' | 'leaf') => mix(pal(key, prev), pal(key, se), k);
  const dusk = smooth(0.62, 1, p) * 0.75;
  // 땅이 넓어지면 카메라가 먼저 물러나고(0.7초), 그다음 앞쪽에 새 땅이 쿵 붙는다
  const ga = s.t - s.grewAt, landed = ga >= 40, nv = s.n0 + (s.n - s.n0) * smooth(0, 1, ga / 40), n = landed ? s.n : s.n0;
  const tw = Math.min(R(0.26), R(0.88) / nv), tH = tw / 2, cx = w / 2, top = R(0.74) - (nv * tH) / 2, D = R(0.11);
  const P = (i: number, j: number) => ({ x: cx + ((i - j) * tw) / 2, y: top + ((i + j + 1) * tH) / 2 });
  ctx.save();
  fx.begin(ctx);
  // 하늘 (계절 + 해 질 녘)
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, mix(toHex(col('sky')), '#4b3f7a', dusk));
  sky.addColorStop(0.65, mix(toHex(col('sky2')), '#ff9a6b', dusk));
  sky.addColorStop(1, mix(toHex(col('sky2')), '#ffc89a', dusk * 0.7));
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  // 해: 계절의 시간 = 하늘을 가로지르는 해
  const sa = Math.PI * p, sx = cx - Math.cos(sa) * R(0.44), sy = R(0.47) - Math.sin(sa) * R(0.27);
  const sunCol = mix(se === 3 ? '#fff6dc' : '#fff1a8', '#ff7a3d', dusk);
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, R(0.22));
  glow.addColorStop(0, sunCol.replace('rgb', 'rgba').replace(')', ',.55)'));
  glow.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sx - R(0.22), sy - R(0.22), R(0.44), R(0.44));
  ctx.fillStyle = sunCol;
  ctx.shadowColor = sunCol;
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(sx, sy, R(0.042), 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // 멀리 흐르는 구름
  for (let q = 0; q < 5; q++) {
    const y = R(0.25) + hash(q) * R(0.9), x = ((hash(q + 9) * w * 1.6 + s.t * (0.08 + 0.05 * hash(q + 3))) % (w * 1.6)) - w * 0.3;
    cloud(ctx, x, y, R(0.05 + 0.04 * hash(q + 5)), `rgba(255,255,255,${0.35 + 0.25 * hash(q + 7)})`);
  }
  // 섬 그림자 + 섬 아래 구름
  const bot = top + n * tH, half = (n * tw) / 2;
  ctx.fillStyle = 'rgba(40,50,80,.13)';
  ctx.beginPath();
  ctx.ellipse(cx, bot + D + R(0.17), half * 0.75, R(0.035), 0, 0, Math.PI * 2);
  ctx.fill();
  // 땅 덩어리: 옆면 흙층 (왼쪽 어둡고 오른쪽 밝게) + 아래로 늘어진 바위
  const L = { x: cx - half, y: top + (n * tH) / 2 }, B = { x: cx, y: bot }, Rt = { x: cx + half, y: top + (n * tH) / 2 };
  ctx.fillStyle = '#5b5550';
  ctx.beginPath();
  ctx.moveTo(L.x, L.y + D);
  ctx.lineTo(B.x, B.y + D);
  ctx.lineTo(Rt.x, Rt.y + D);
  ctx.lineTo(cx + half * 0.55, B.y + D * 0.4);
  ctx.lineTo(cx + half * 0.3, B.y + D + R(0.06));
  ctx.lineTo(cx + R(0.04), B.y + D + R(0.13));
  ctx.lineTo(cx - half * 0.25, B.y + D + R(0.07));
  ctx.lineTo(cx - half * 0.6, B.y + D * 0.35);
  ctx.closePath();
  ctx.fill();
  const layers: [number, number, string, string][] = [
    [0, 0.08, toHex(col('grass2')), toHex(col('grass'))],
    [0.08, 0.42, '#6e4a2c', '#8a5f3a'],
    [0.42, 0.72, '#553825', '#6d4a31'],
    [0.72, 1, '#6a645d', '#847d74'],
  ];
  for (const [a, b, cl, cr] of layers) {
    for (const [P1, P2, c] of [[L, B, cl], [B, Rt, cr]] as const) {
      ctx.fillStyle = c === cl && a === 0 ? mix(c, SNOW, snowNow * 0.9) : c;
      ctx.beginPath();
      ctx.moveTo(P1.x, P1.y + D * a);
      ctx.lineTo(P2.x, P2.y + D * a);
      ctx.lineTo(P2.x, P2.y + D * b + 0.5);
      ctx.lineTo(P1.x, P1.y + D * b + 0.5);
      ctx.closePath();
      ctx.fill();
    }
  }
  // 흙 속 돌멩이·뿌리
  for (let q = 0; q < 10; q++) {
    const left = q % 2 === 0, f = 0.1 + 0.8 * hash(q + 20), dy = D * (0.25 + 0.6 * hash(q + 40));
    const P1 = left ? L : B, P2 = left ? B : Rt, x = P1.x + (P2.x - P1.x) * f, y = P1.y + (P2.y - P1.y) * f + dy;
    ctx.fillStyle = q % 3 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.18)';
    ctx.beginPath();
    ctx.ellipse(x, y, R(0.012 + 0.008 * hash(q)), R(0.007), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(70,45,25,.55)';
  ctx.lineWidth = 1.5;
  for (let q = 0; q < 5; q++) {
    const x = cx - half * 0.7 + q * half * 0.35, y0 = B.y + D - Math.abs(x - cx) * 0.5 - 2;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.quadraticCurveTo(x + 6 * Math.sin(s.t / 40 + q), y0 + R(0.03), x - 3, y0 + R(0.05 + 0.02 * hash(q)));
    ctx.stroke();
  }
  // 땅 위 칸
  const grass = toHex(col('grass')), grass2 = toHex(col('grass2'));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const c = P(i, j), t = s.tiles[i * N + j];
    if (t.g < 0) continue;
    let fill = mix((i + j) % 2 ? grass : grass2, SNOW, snowNow);
    if (t.g === 1 || t.g === 5) fill = mix(toHex(fill), '#8a6a45', 0.35 * (1 - snowNow));
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y - tH / 2);
    ctx.lineTo(c.x + tw / 2, c.y);
    ctx.lineTo(c.x, c.y + tH / 2);
    ctx.lineTo(c.x - tw / 2, c.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.05)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 풀꽃 · 낙엽 · 눈 반짝이
    for (let q = 0; q < 3; q++) {
      const hx = c.x + (hash(i * 31 + j * 7 + q) - 0.5) * tw * 0.6, hy = c.y + (hash(i * 13 + j * 17 + q * 5) - 0.5) * tH * 0.5;
      if (snowNow > 0.5) (ctx.fillStyle = 'rgba(255,255,255,.9)'), ctx.fillRect(hx, hy, 1.5, 1.5);
      else if (se === 0) (ctx.fillStyle = q === 0 ? '#ffd6e6' : q === 1 ? '#fff6a8' : '#ffffff'), ctx.beginPath(), ctx.arc(hx, hy, 1.6, 0, Math.PI * 2), ctx.fill();
      else if (se === 2) (ctx.fillStyle = q % 2 ? '#e2652a' : '#f2b33d'), ctx.beginPath(), ctx.ellipse(hx, hy, 2.4, 1.2, q, 0, Math.PI * 2), ctx.fill();
      else if (se === 1 && q < 2) (ctx.strokeStyle = 'rgba(30,90,30,.5)'), ctx.beginPath(), ctx.moveTo(hx, hy), ctx.lineTo(hx + 1, hy - 4), ctx.stroke();
    }
  }
  // 서리가 다가온다 (봄): 섬 가장자리부터 푸르게
  if (se === 0 && s.frost && !s.pause) {
    const left = s.frost - s.st;
    if (left > 0 && left < 90) {
      ctx.fillStyle = `rgba(170,215,255,${0.35 * (1 - left / 90)})`;
      ctx.beginPath();
      ctx.moveTo(cx, top);
      ctx.lineTo(Rt.x, Rt.y);
      ctx.lineTo(B.x, B.y);
      ctx.lineTo(L.x, L.y);
      ctx.closePath();
      ctx.fill();
    }
  }
  // 물건들: 뒤에서 앞으로
  const sunDir = -Math.cos(sa);
  const crit = s.critters.filter((c) => s.st >= c.at).map((c) => {
    const q = c.target >= 0 ? Math.min(1, (s.st - c.t0) / Math.max(1, c.t1 - c.t0)) : 1;
    return { c, x: c.target >= 0 ? c.fx + (c.tx - c.fx) * q : c.x, y: c.target >= 0 ? c.fy + (c.ty - c.fy) * q : c.y, moving: c.target >= 0 && q < 1 };
  });
  for (let d = 0; d <= 2 * n - 2; d++) {
    for (let i = 0; i < n; i++) {
      const j = d - i;
      if (j < 0 || j >= n) continue;
      const tl = s.tiles[i * N + j], c = P(i, j);
      drawThing(ctx, s, tl, i * N + j, c.x, c.y, tw, sunDir, snowNow);
    }
    for (const q of crit) {
      if (Math.min(2 * n - 2, Math.max(0, Math.round(q.x + q.y))) !== d) continue;
      // 다람쥐는 깡충깡충(먹을수록 볼이 빵빵), 사슴은 얼음 위를 스케이트 타듯 미끄러진다
      const sq = q.c.kind === 'sq', c = P(q.x, q.y), hop = q.moving && sq ? Math.abs(Math.sin(s.t / 3)) * R(0.012) : 0;
      if (!sq && q.moving) {
        ctx.strokeStyle = 'rgba(255,255,255,.7)';
        ctx.lineWidth = 1.5;
        const b = P(q.c.fx, q.c.fy);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y + 2);
        ctx.quadraticCurveTo((b.x + c.x) / 2 + Math.sin(s.t / 9) * 10, (b.y + c.y) / 2 + 6, c.x, c.y + 2);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y + 2, R(0.022), R(0.008), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(c.x, c.y - hop);
      if (q.c.tx - q.c.fx - (q.c.ty - q.c.fy) > 0) ctx.scale(-1, 1);
      if (!sq && q.moving) ctx.rotate(Math.sin(s.t / 7) * 0.3);
      const puff = sq ? 1 + 0.18 * Math.min(4, q.c.ate) : 1;
      if (sq && q.c.ate) ctx.scale(1 + 0.05 * Math.sin(s.t / 4), 1 - 0.05 * Math.sin(s.t / 4));
      ctx.fillStyle = '#ffffff';
      ctx.font = `${R((sq ? 0.062 : 0.08) * puff)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(q.c.kind === 'sq' ? '🐿️' : '🦌', 0, 2);
      ctx.restore();
    }
  }
  // 화들짝 놀란 동물: 펄쩍 뛰어 데굴데굴 구르다 섬 밖으로 떨어진다
  const fa = s.t - s.fledAt;
  if (fa < 80) for (const f of s.fled) {
    const mx = (n - 1) / 2, dx = f.x - mx, dy = f.y - mx, dl = Math.hypot(dx, dy) || 1, go = Math.min(fa, 45) * 0.05;
    const c = P(f.x + (dx / dl) * go, f.y + (dy / dl) * go), sq = f.kind === 'sq';
    const jump = fa < 24 ? Math.sin((fa / 24) * Math.PI) * R(0.07) : 0, fall = fa > 45 ? (fa - 45) ** 2 * 0.25 : 0;
    ctx.save();
    ctx.translate(c.x, c.y - jump + fall);
    ctx.rotate(sq ? (fa < 10 ? 0 : (fa - 10) * 0.35 * Math.sign(dx - dy || 1)) : Math.sin(fa / 4) * 0.6);
    ctx.globalAlpha = Math.max(0, 1 - fall / R(0.3));
    ctx.fillStyle = '#ffffff';
    ctx.font = `${R((sq ? 0.062 : 0.08) * (1 + 0.18 * Math.min(4, f.ate)))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sq ? '🐿️' : '🦌', 0, 0);
    if (fa < 14) (ctx.font = `900 ${R(0.04)}px system-ui, sans-serif`), ctx.fillText('❗', R(0.02), -R(0.05));
    ctx.restore();
  }
  // 날씨: 봄 꽃잎 · 가을 낙엽 · 겨울 눈
  for (let q = 0; q < 40; q++) {
    const x = (hash(q * 3.1) * w + Math.sin(s.t / 50 + q) * 20 + s.t * (se === 3 ? 0.1 : 0.35)) % w, y = (hash(q * 7.7) * h + s.t * (se === 3 ? 0.6 + hash(q) * 0.5 : 0.45)) % h;
    if (se === 3) (ctx.fillStyle = 'rgba(255,255,255,.9)'), ctx.beginPath(), ctx.arc(x, y, 1.2 + hash(q) * 1.8, 0, Math.PI * 2), ctx.fill();
    else if (se === 0 && q < 22) (ctx.fillStyle = 'rgba(255,190,215,.85)'), ctx.beginPath(), ctx.ellipse(x, y, 2.6, 1.5, s.t / 20 + q, 0, Math.PI * 2), ctx.fill();
    else if (se === 2 && q < 26) (ctx.fillStyle = q % 3 === 0 ? '#e2482c' : q % 3 === 1 ? '#f5a524' : '#c8661f'), ctx.beginPath(), ctx.ellipse(x, y, 3, 1.6, s.t / 15 + q, 0, Math.PI * 2), ctx.fill();
  }
  // 여름 해 질 녘 반딧불
  if (se === 1 && p > 0.55) for (let q = 0; q < 14; q++) {
    const a = hash(q + 50), x = cx + (a - 0.5) * half * 1.7 + Math.sin(s.t / 30 + q) * 12, y = top + hash(q + 60) * n * tH * 0.9 - R(0.03) + Math.cos(s.t / 25 + q) * 8;
    ctx.fillStyle = `rgba(230,255,140,${(0.5 + 0.5 * Math.sin(s.t / 9 + q)) * smooth(0.55, 0.8, p)})`;
    ctx.shadowColor = '#e8ff8a';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  // 폭풍 구름 (여름): 왼쪽에서 다가온다
  if (se === 1 && s.storm && !s.pause) {
    const left = s.storm - s.st, after = s.strikeAt ? s.t - s.strikeAt : -1;
    const q = after >= 0 ? 1 + after / 90 : Math.max(0, 1 - left / s.storm), x = -R(0.25) + (cx + R(0.25)) * q, y = R(0.3);
    if (x < w + R(0.3)) {
      ctx.strokeStyle = 'rgba(120,150,200,.55)';
      ctx.lineWidth = 1;
      for (let r = 0; r < 14; r++) {
        const rx = x - R(0.12) + hash(r) * R(0.24), ry = y + R(0.04) + ((s.t * 6 + r * 23) % R(0.22));
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 2, ry + 7);
        ctx.stroke();
      }
      cloud(ctx, x, y, R(0.085), '#59607a');
      cloud(ctx, x + R(0.06), y + R(0.02), R(0.06), '#6d7590');
      if (left > 0 && left < 40 && s.t % 12 < 2) (ctx.fillStyle = 'rgba(255,255,220,.8)'), cloud(ctx, x, y, R(0.05), 'rgba(255,255,220,.5)');
    }
  }
  // 번개
  if (s.strikeAt && s.t - s.strikeAt < 14) {
    const e = s.events.find((x) => x.kind === 'storm'), c = e ? P(e.x, e.y) : { x: cx, y: top };
    ctx.strokeStyle = '#fffbd0';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#fff6a0';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(c.x - R(0.05), R(0.3));
    for (let q = 1; q <= 5; q++) ctx.lineTo(c.x - R(0.05) + (q % 2 ? R(0.03) : -R(0.01)) + (q * R(0.05)) / 5, R(0.3) + ((c.y - R(0.08) - R(0.3)) * q) / 5);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  // 해 질 녘 빛
  if (dusk > 0.02) {
    ctx.fillStyle = `rgba(255,120,70,${dusk * 0.16})`;
    ctx.fillRect(-10, -10, w + 20, h + 20);
  }
  // 사건 연출
  if (landed && ga < 90 && fx.memo.land !== s.grewAt) {
    fx.memo.land = s.grewAt;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i >= s.n0 || j >= s.n0) (fx.burst(P(i, j).x, P(i, j).y, '#c9a26a', 6, 2.5, 2.5));
    fx.kick(9);
    fx.ring(cx, bot, '#ffe7b0', half, 6);
    fx.pop(cx, bot + R(0.06), '쿵! 새 땅', '#ffffff', 20);
  }
  const seenT = fx.memo.t ?? -1;
  let sprouts = 0;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const c = P(e.x, e.y), mid = { x: cx, y: R(0.435) };
    if (e.kind === 'season') fx.ring(cx, top + n * tH * 0.5, '#ffffff', half * 1.1, 5), fx.pop(mid.x, mid.y, e.text!, '#ffffff', 26), fx.blink(['#ffd0e4', '#fff3a0', '#ffb070', '#ffffff'][se], 0.15);
    if (e.kind === 'grow') fx.burst(c.x, c.y - R(0.09), '#7dd35a', 22, 4, 3), fx.ring(c.x, c.y - R(0.05), '#c8ff9a', R(0.12), 4), fx.kick(4), fx.pop(c.x, c.y - R(0.17), '쑥!', '#ffffff', 18);
    if (e.kind === 'sapling') fx.burst(c.x, c.y - R(0.03), '#a6e07a', 10, 2.5, 2);
    if (e.kind === 'sprout' && sprouts++ < 6) fx.burst(c.x, c.y, '#b6f08a', 8, 2, 2), sprouts === 1 && fx.pop(c.x, c.y - R(0.04), '🌱', '#ffffff', 14);
    if (e.kind === 'nest') fx.pop(c.x, c.y - R(0.2), '🐦 둥지!', '#ffffff', 16), fx.burst(c.x, c.y - R(0.14), '#a0703c', 14, 3, 2.5);
    if (e.kind === 'gift') fx.pop(c.x, c.y - R(0.14), `${e.text} 선물!`, '#ffffff', 16), fx.ring(c.x, c.y, '#ffe27a', R(0.1), 4);
    if (e.kind === 'ripe') fx.burst(c.x, c.y - R(0.1), SPECIES[e.n!].col, 4, 1.5, 1.8);
    if (e.kind === 'sq') fx.pop(c.x, c.y - R(0.04), '🐿️ 다람쥐!', '#ffe0b0', 14);
    if (e.kind === 'deer') fx.pop(c.x, c.y - R(0.06), '🦌 사슴!', '#ffffff', 14);
    if (e.kind === 'eat') fx.pop(c.x, c.y - R(0.06), '냠', '#ffd08a', 15), fx.burst(c.x, c.y - R(0.03), SPECIES[e.n!].col, 8, 2, 2), fx.kick(1.5);
    if (e.kind === 'browse') fx.pop(c.x, c.y - R(0.06), '우적!', '#ffffff', 15), fx.burst(c.x, c.y, '#7dbb5a', 12, 2.5, 2.5), fx.kick(3);
    if (e.kind === 'pick') fx.burst(c.x, c.y - R(0.1), SPECIES[e.n!].col, 6, 3, 2.4);
    if (e.kind === 'seed') fx.burst(c.x, c.y, '#8a5a2b', 5, 1.5, 2);
    if (e.kind === 'fly') fx.pop(c.x, c.y - R(0.05), '🐦→🌱', '#ffffff', 12);
    if (e.kind === 'harvest') fx.pop(cx, R(0.56), e.text!, '#ffffff', 22 + Math.min(14, e.n!)), fx.ring(cx, top + n * tH * 0.5, '#ffd23f', half, 6), fx.kick(Math.min(8, 2 + e.n! / 4));
    if (e.kind === 'rot') fx.pop(cx, R(0.64), e.text!, '#e9d38a', 15);
    if (e.kind === 'dry') fx.pop(cx, R(0.64), e.text!, '#eadcc4', 14);
    if (e.kind === 'storm') fx.blink('#ffffff', 0.7), fx.kick(12), fx.burst(c.x, c.y - R(0.08), '#ff9a3c', 34, 5, 3.5), fx.burst(c.x, c.y - R(0.08), '#555555', 16, 2, 4), fx.pop(cx, R(0.4), e.text!, '#fff3a0', 17);
    if (e.kind === 'squawk') fx.pop(c.x + R(0.05), c.y - R(0.2), '🐦 꽥!! (머리 뽀글)', '#ffffff', 15), fx.burst(c.x, c.y - R(0.15), '#f2e6c8', 14, 4, 2.5);
    if (e.kind === 'frozen') fx.burst(c.x, c.y, '#cfeaff', 8, 2, 2);
    if (e.kind === 'frost') fx.blink('#bfe4ff', 0.45), fx.kick(e.n ? 6 : 1), fx.pop(cx, R(0.4), e.text!, '#e4f4ff', 18);
    if (e.kind === 'clear') fx.pop(cx, h * 0.36, e.text!, '#ffffff', 26), fx.burst(cx, h * 0.36, '#ffd23f', 60, 6, 3.5), fx.ring(cx, h * 0.36, '#ffd23f', R(0.5), 8), fx.blink('#fff6c8', 0.3);
    if (e.kind === 'fail') fx.pop(cx, h * 0.38, e.text!, '#ffc2bd', 20), fx.kick(10), fx.blink(th.hot, 0.2);
    if (e.kind === 'stage') fx.pop(cx, R(0.33), e.text!, '#ffffff', 19);
    if (e.kind === 'new') {
      // 새것 안내는 섬 아래에, 잇달아 나오면 위로 쌓는다
      const stack = e.t - (fx.memo.newT ?? -999) < 60 ? (fx.memo.newK ?? 0) + 1 : 0;
      fx.memo.newT = e.t;
      fx.memo.newK = stack;
      fx.pop(cx, h - R(0.2) - stack * R(0.055), e.text!, '#fff7c2', 14);
    }
    if (e.kind === 'flee') fx.pop(c.x, c.y - R(0.09), e.text!, '#ffffff', 15);
  }
  fx.memo.t = s.t;
  ctx.restore();
  drawHud(ctx, s, w, h, th, p);
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: string) {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x - r * 0.9, y + r * 0.3, r * 0.7, 0, Math.PI * 2);
  ctx.arc(x + r * 0.95, y + r * 0.25, r * 0.75, 0, Math.PI * 2);
  ctx.arc(x + r * 0.3, y - r * 0.45, r * 0.65, 0, Math.PI * 2);
  ctx.fill();
}

/** 칸 위의 것: 씨앗 · 새싹 · 어린 나무 · 나무(열매·둥지) · 그루터기 */
function drawThing(ctx: CanvasRenderingContext2D, s: SeasonsState, t: Tile, idx: number, x: number, y: number, tw: number, sunDir: number, snow: number) {
  const se = s.season;
  if (t.g === 1) {
    ctx.fillStyle = '#6b4526';
    ctx.beginPath();
    ctx.ellipse(x, y, tw * 0.09, tw * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = SPECIES[t.sp].col;
    ctx.beginPath();
    ctx.arc(x, y - tw * 0.02, tw * 0.03, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (t.g === 2) {
    const g = Math.min(1, (s.t - t.at) / 12);
    ctx.strokeStyle = '#3f8a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - tw * 0.12 * g);
    ctx.stroke();
    ctx.fillStyle = '#7ed957';
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(x + sx * tw * 0.05 * g, y - tw * 0.12 * g, tw * 0.05 * g, tw * 0.025 * g, sx * 0.5, 0, Math.PI * 2), ctx.fill());
    return;
  }
  if (t.g === 5) {
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.beginPath();
    ctx.ellipse(x, y, tw * 0.14, tw * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a3324';
    ctx.fillRect(x - tw * 0.07, y - tw * 0.1, tw * 0.14, tw * 0.1);
    ctx.fillStyle = '#8a6a4a';
    ctx.beginPath();
    ctx.ellipse(x, y - tw * 0.1, tw * 0.07, tw * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    if (s.t - t.at < 300) for (let q = 0; q < 3; q++) {
      const a = ((s.t + q * 30) % 90) / 90;
      ctx.fillStyle = `rgba(90,90,90,${0.4 * (1 - a)})`;
      ctx.beginPath();
      ctx.arc(x + Math.sin(a * 6 + q) * 5, y - tw * 0.12 - a * tw * 0.5, 3 + a * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    else {
      ctx.fillStyle = '#ffffff';
      ctx.font = `${tw * 0.16}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('🍄', x + tw * 0.1, y + 2);
    }
    return;
  }
  if (t.g !== 3 && t.g !== 4) return;
  // 크기: 어린 나무 0.5 · 나무 0.85 → 큰 나무 1.15, 자라는 순간 쑥 (튕기듯)
  const base = t.g === 3 ? 0.5 : t.age >= 3 ? 1.15 : t.age >= 1 ? 1 : 0.85;
  const since = s.t - t.at, gq = Math.min(1, since / 22), pop = since < 22 ? 1 + 0.25 * Math.sin(gq * Math.PI) : 1;
  const from = t.g === 4 ? 0.5 : 0.15, sc = (from + (base - from) * (1 - (1 - gq) ** 3)) * pop;
  const u = tw * 0.62 * sc, sp = t.sp;
  // 그림자 (해 반대쪽)
  ctx.fillStyle = 'rgba(20,40,20,.2)';
  ctx.beginPath();
  ctx.ellipse(x - sunDir * u * 0.35, y + 1, u * 0.42, u * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  // 판을 통과하면 숲 전체가 엉덩이춤, 실패하면 시무룩하게 축 늘어진다
  const dance = s.pause && s.result === 1 ? Math.sin(s.t / 5 + idx * 1.7) : 0, droop = s.pause && s.result === -1 ? Math.min(1, (120 - s.pause) / 40) : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1 + 0.06 * dance, 0, dance * 0.22 + droop * 0.2 * (idx % 2 ? 1 : -1), 1 - 0.07 * Math.abs(dance) - 0.12 * droop, 0, 0);
  ctx.translate(-x, -y);
  const bare = se === 3 && sp !== 2, leaf = treeLeaf(se, sp, idx, s);
  const trunkH = sp === 2 ? u * 0.3 : u * 0.55;
  ctx.fillStyle = '#6d4528';
  ctx.fillRect(x - u * 0.06, y - trunkH, u * 0.12, trunkH);
  ctx.fillStyle = '#8b5c36';
  ctx.fillRect(x - u * 0.06, y - trunkH, u * 0.05, trunkH);
  const cy = y - trunkH - u * 0.32;
  if (sp === 2) {
    // 소나무: 세 겹 삼각
    for (let q = 0; q < 3; q++) {
      const ty = y - trunkH - q * u * 0.28, wd = u * (0.5 - q * 0.12);
      ctx.fillStyle = q % 2 ? '#2f6b3a' : '#2a5f34';
      ctx.beginPath();
      ctx.moveTo(x - wd, ty);
      ctx.lineTo(x + wd, ty);
      ctx.lineTo(x, ty - u * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      ctx.beginPath();
      ctx.moveTo(x - wd * 0.2, ty);
      ctx.lineTo(x + wd, ty);
      ctx.lineTo(x, ty - u * 0.45);
      ctx.closePath();
      ctx.fill();
      if (snow > 0.2) {
        ctx.fillStyle = `rgba(250,252,255,${snow})`;
        ctx.beginPath();
        ctx.moveTo(x - wd * 0.45, ty - u * 0.2);
        ctx.lineTo(x + wd * 0.45, ty - u * 0.2);
        ctx.lineTo(x, ty - u * 0.45);
        ctx.closePath();
        ctx.fill();
      }
    }
  } else if (bare) {
    // 겨울 맨가지 + 눈
    ctx.strokeStyle = '#5e3d24';
    ctx.lineWidth = Math.max(1.5, u * 0.05);
    for (let q = 0; q < 4; q++) {
      const a = -Math.PI / 2 + (q - 1.5) * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y - trunkH + 2);
      ctx.lineTo(x + Math.cos(a) * u * 0.42, y - trunkH + Math.sin(a) * u * 0.5);
      ctx.stroke();
    }
    // 눈이 쌓일수록 맨가지가 솜사탕 같은 눈 왕관을 쓴다
    if (snow > 0.05) for (const [bx, by, br] of [[-0.55, 0.25, 0.6], [0.55, 0.2, 0.6], [0, 0, 0.85], [0.05, -0.45, 0.55]]) {
      const r = u * 0.3 * br * (0.4 + 0.6 * snow), gx = x + bx * u * 0.34, gy = cy + by * u * 0.34;
      const gr = ctx.createRadialGradient(gx - r * 0.3, gy - r * 0.4, r * 0.1, gx, gy, r);
      gr.addColorStop(0, `rgba(255,255,255,${0.95 * snow})`);
      gr.addColorStop(1, `rgba(200,220,240,${0.9 * snow})`);
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(gx, gy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const wide = sp === 1 ? 1.2 : 1, r = u * 0.34 * wide;
    const blobs: [number, number, number][] = [[-0.62, 0.25, 0.75], [0.62, 0.2, 0.75], [0, 0, 1], [0.05, -0.5, 0.7]];
    for (const [bx, by, br] of blobs) {
      const gx = x + bx * r, gy = cy + by * r * (sp === 1 ? 0.8 : 1), rr = r * br;
      const gr = ctx.createRadialGradient(gx - rr * 0.35, gy - rr * 0.4, rr * 0.1, gx, gy, rr);
      gr.addColorStop(0, mix(leaf, '#ffffff', 0.28));
      gr.addColorStop(1, mix(leaf, '#000000', 0.18));
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(gx, gy, rr, 0, Math.PI * 2);
      ctx.fill();
    }
    if (se === 0 && sp === 0) for (let q = 0; q < 9; q++) {
      const a = hash(idx * 9 + q) * Math.PI * 2, d = hash(idx * 5 + q) * r * 0.9;
      ctx.fillStyle = q % 3 ? '#ffc2da' : '#ffffff';
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d * 1.2, cy + Math.sin(a) * d * 0.8 - r * 0.1, Math.max(1.5, u * 0.035), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (t.g === 4) face(ctx, s, t, idx, x, sp === 2 ? y - trunkH - u * 0.12 : bare ? y - trunkH * 0.5 : cy + u * 0.06, bare ? u * 0.6 : u, droop > 0);
  // 둥지 + 새
  if (t.nest && t.g === 4) {
    const nx = x + u * 0.28, ny = cy + u * 0.05;
    ctx.fillStyle = '#7a5230';
    ctx.beginPath();
    ctx.ellipse(nx, ny, u * 0.11, u * 0.05, 0, 0, Math.PI);
    ctx.fill();
    if (se !== 3) {
      const fly = Math.max(0, 1 - (s.t - t.nest) / 40);
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.max(10, u * 0.2)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('🐦', nx + fly * 120, ny - fly * 80 + Math.sin(s.t / 10 + idx) * (fly ? 6 : 0.6));
    }
  }
  // 열매
  if (t.g === 4) {
    const spots: [number, number][] = [[-0.45, 0.1], [0.4, -0.15], [-0.05, 0.35], [0.1, -0.45]];
    for (const f of s.fruits) {
      if (f.tile !== idx || f.st >= 4) continue;
      const [ox, oy] = spots[f.k % 4], fx = x + ox * u * 0.42, fy = (sp === 2 ? y - trunkH - u * 0.3 : cy) + oy * u * 0.4, fr = Math.max(2.6, u * 0.085);
      if (f.st === 0) {
        if (se !== 1) continue;
        ctx.fillStyle = '#fff0f6';
        ctx.beginPath();
        ctx.arc(fx, fy, fr * 0.8, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      const c = f.st === 2 ? SPECIES[f.sp].col : SPECIES[f.sp].green;
      if (f.st === 2) (ctx.shadowColor = c), (ctx.shadowBlur = 8);
      ctx.fillStyle = c;
      ctx.beginPath();
      if (f.sp === 0) ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      else ctx.ellipse(fx, fy, fr * 0.8, fr * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (f.sp === 1) (ctx.fillStyle = '#6b4a2a'), ctx.fillRect(fx - fr * 0.85, fy - fr * 1.05, fr * 1.7, fr * 0.55);
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath();
      ctx.arc(fx - fr * 0.3, fy - fr * 0.3, fr * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** 나무 얼굴: 평소엔 깜빡, 쑥 자라면 눈 동그랗게, 다람쥐가 열매를 따 먹으면 >_<, 겨울엔 쿨쿨, 통과하면 ^_^ */
function face(ctx: CanvasRenderingContext2D, s: SeasonsState, t: Tile, idx: number, x: number, y: number, u: number, sad: boolean) {
  const e = Math.max(1.1, u * 0.032), gap = u * 0.11, ink = '#2a1d12';
  const happy = s.pause > 0 && s.result === 1, hurt = s.t - t.hurt < 45, wow = s.t - t.at < 45 || (s.strikeAt > 0 && s.t - s.strikeAt < 50);
  const sleepy = s.season === 3 && !happy && !wow, blink = (s.t + idx * 37) % 210 < 7;
  ctx.fillStyle = 'rgba(255,120,150,.45)';
  for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(x + sx * gap * 1.7, y + e * 2.2, e * 1.6, e * 0.9, 0, 0, Math.PI * 2), ctx.fill());
  ctx.strokeStyle = ctx.fillStyle = ink;
  ctx.lineWidth = Math.max(1, e * 0.75);
  ctx.lineCap = 'round';
  for (const sx of [-1, 1]) {
    const ex = x + sx * gap;
    ctx.beginPath();
    if (hurt) ctx.moveTo(ex - sx * e * 1.2, y - e * 1.1), ctx.lineTo(ex + sx * e * 0.4, y), ctx.lineTo(ex - sx * e * 1.2, y + e * 1.1), ctx.stroke();
    else if (happy) ctx.arc(ex, y + e * 0.6, e * 1.3, Math.PI * 1.15, Math.PI * 1.85), ctx.stroke();
    else if (sad) ctx.moveTo(ex - e * 1.2, y - sx * e * 0.6), ctx.lineTo(ex + e * 1.2, y + sx * e * 0.6), ctx.stroke();
    else if (sleepy || blink) ctx.moveTo(ex - e * 1.1, y), ctx.lineTo(ex + e * 1.1, y), ctx.stroke();
    else if (wow) (ctx.fillStyle = '#ffffff'), ctx.arc(ex, y, e * 1.7, 0, Math.PI * 2), ctx.fill(), (ctx.fillStyle = ink), ctx.beginPath(), ctx.arc(ex, y, e * 0.8, 0, Math.PI * 2), ctx.fill();
    else ctx.arc(ex, y, e, 0, Math.PI * 2), ctx.fill();
  }
  ctx.beginPath();
  if (wow && !hurt) ctx.ellipse(x, y + e * 2.6, e * 0.8, e * 1.1, 0, 0, Math.PI * 2), ctx.fill();
  else if (happy) ctx.arc(x, y + e * 1.6, e * 1.3, 0.1, Math.PI - 0.1), ctx.fill();
  else if (hurt) ctx.moveTo(x - e * 1.2, y + e * 2.4), ctx.lineTo(x - e * 0.4, y + e * 1.8), ctx.lineTo(x + e * 0.4, y + e * 2.4), ctx.lineTo(x + e * 1.2, y + e * 1.8), ctx.stroke();
  else if (sad) ctx.arc(x, y + e * 3.2, e * 1.1, Math.PI * 1.15, Math.PI * 1.85), ctx.stroke();
  ctx.lineCap = 'butt';
  if (sleepy && (idx * 7 + Math.floor(s.t / 60)) % 3 === 0) {
    const a = (s.t % 60) / 60;
    ctx.globalAlpha = 1 - a;
    ctx.font = `800 ${Math.max(8, u * 0.16)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('z', x + gap * 2 + a * 6, y - u * 0.25 - a * u * 0.3);
    ctx.globalAlpha = 1;
  }
}

function treeLeaf(se: number, sp: number, idx: number, s: SeasonsState) {
  if (se === 2) {
    const a = ['#ee8a26', '#e2482c', '#f5c13b', '#d9662a'][(idx + sp) % 4];
    return toHex(mix(PAL[1].leaf, a, Math.min(1, (s.t - s.sAt) / 50)));
  }
  if (se === 0 && s.t - s.sAt < 40 && sp !== 2) return toHex(mix('#a08a6a', PAL[0].leaf, (s.t - s.sAt) / 40));
  const c = PAL[se].leaf;
  return sp === 1 ? toHex(mix(c, '#2c5a2a', 0.25)) : c;
}

function drawHud(ctx: CanvasRenderingContext2D, s: SeasonsState, w: number, h: number, th: Theme, p: number) {
  const R = (r: number) => r * w, g = STAGES[s.stage], se = s.season;
  // 위 띠: 판 · 해 · 계절 · 목표 · 하트
  ctx.fillStyle = 'rgba(24,40,28,.62)';
  ctx.fillRect(0, 0, w, R(0.14));
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${R(0.042)}px system-ui, sans-serif`;
  ctx.fillText(`${s.stage + 1}판 · ${Math.min(s.year + 1, g.years)}/${g.years}년`, 10, R(0.04));
  const wheel = SEASONS.map((x, i) => (i === se ? `[${x.e}${x.name}]` : x.e)).join(' ');
  ctx.font = `800 ${R(0.036)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(wheel, w * 0.56, R(0.04));
  ctx.textAlign = 'right';
  ctx.fillStyle = th.hot;
  ctx.font = `900 ${R(0.042)}px system-ui, sans-serif`;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - 10, R(0.04));
  ctx.textAlign = 'left';
  const met = s.harvest >= g.goal[0];
  ctx.fillStyle = met ? '#b8ff8a' : '#ffffff';
  ctx.font = `900 ${R(0.04)}px system-ui, sans-serif`;
  ctx.fillText(`열매 ${s.harvest}/${g.goal[0]}`, 10, R(0.1));
  ctx.fillStyle = '#ffe58a';
  ctx.font = `800 ${R(0.033)}px system-ui, sans-serif`;
  ctx.fillText(`★★ ${g.goal[1]} · ★★★ ${g.goal[2]}`, R(0.3), R(0.1));
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`★ ${s.stars}`, w - 10, R(0.1));
  // 도감: 만난 동물·나무 (위 띠 바로 아래 작은 스티커 줄)
  const dex = [...s.seen].filter((x) => DEX[x]).map((x) => DEX[x]);
  ctx.font = `${R(0.032)}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.fillText(`📖 ${['🍎', ...dex].join('')} ${dex.length + 1}/6`, w - 8, R(0.168));
  // 아래 띠: 해가 지나가는 길(계절 시간) + 다가오는 일 + 지금 넘기면
  const by = h - R(0.15);
  ctx.fillStyle = 'rgba(24,40,28,.62)';
  ctx.fillRect(0, by, w, R(0.15));
  const x0 = R(0.08), x1 = R(0.8), ly = by + R(0.045), X = (st: number) => x0 + (x1 - x0) * Math.min(1, st / SEASONS[se].max);
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.fillRect(x0, ly - 3, x1 - x0, 6);
  const bar = ctx.createLinearGradient(x0, 0, x1, 0);
  bar.addColorStop(0, '#fff3a8');
  bar.addColorStop(1, '#ff8a4d');
  ctx.fillStyle = bar;
  ctx.fillRect(x0, ly - 3, (x1 - x0) * p, 6);
  ctx.font = `${R(0.04)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const marks: [number, string][] = [];
  if (se === 0 && s.frost) marks.push([s.frost, '🥶']);
  if (se === 1 && s.storm) marks.push([s.storm, '⛈️']);
  for (const c of s.critters.slice(0, 1)) marks.push([c.at, c.kind === 'sq' ? '🐿️' : '🦌']);
  ctx.fillStyle = '#ffffff';
  for (const [st, e] of marks) if (st > s.st || s.pause) ctx.fillText(e, X(st), ly - R(0.002));
  ctx.font = `${R(0.05)}px system-ui, sans-serif`;
  ctx.fillText(se === 3 ? '🌙' : '🌞', x0 + (x1 - x0) * p, ly);
  ctx.font = `800 ${R(0.032)}px system-ui, sans-serif`;
  ctx.fillText(`→${SEASONS[(se + 1) % 4].e}`, R(0.9), ly);
  ctx.font = `900 ${R(0.038)}px system-ui, sans-serif`;
  ctx.fillStyle = '#fff7d6';
  ctx.fillText(nowText(s), w / 2, by + R(0.105));
  // 첫 판 안내
  const first = s.stage === 0 && s.year === 0 && !s.pause;
  const tip = first && se === 0 && s.taps === 0 ? '👆 탭하면 다음 계절로!' : first && se === 2 ? '👆 열매가 빨갛게 익으면 탭 — 다람쥐 조심!' : first && se === 1 && s.st > 30 ? '꽃이 열매가 되는 중… 다 맺히면 탭' : '';
  if (tip && s.st > 6) {
    ctx.font = `900 ${R(0.044)}px system-ui, sans-serif`;
    const tw = ctx.measureText(tip).width + R(0.06), bob = Math.sin(s.t / 8) * 2;
    ctx.fillStyle = 'rgba(30,45,30,.6)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, R(0.195) + bob, tw, R(0.064), R(0.032));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tip, w / 2, R(0.228) + bob);
  }
}

function nowText(s: SeasonsState) {
  if (s.pause) return s.result === 1 ? `통과! 다음 판 준비 중…` : s.dead ? '숲이 쉬어 가요…' : '처음 숲으로 다시…';
  const se = s.season;
  if (se === 0) {
    const sprout = s.tiles.filter((t) => t.g === 2).length, seed = s.tiles.filter((t) => t.g === 1).length;
    return `지금 넘기면 → 🌱 ${sprout} 자람${seed ? ` · 씨앗 ${seed} 흙으로` : ''}`;
  }
  if (se === 1) {
    const set = s.fruits.filter((f) => f.st === 1).length, fl = s.fruits.filter((f) => f.st === 0).length;
    return `지금 넘기면 → 열매 ${set} 맺힘${fl ? ` · 꽃 ${fl} 짐` : ''}`;
  }
  const ripe = s.fruits.filter((f) => f.st === 2 && SPECIES[f.sp].ripe === se), green = s.fruits.filter((f) => f.st === 1 && SPECIES[f.sp].ripe === se).length;
  const val = ripe.reduce((a, f) => a + SPECIES[f.sp].val, 0);
  if (se === 2) return `지금 넘기면 → 거둠 +${val}${green ? ` · 🤢 ${green} 썩음` : ''}`;
  const th = thr(s), sprout = s.tiles.filter((t) => t.g === 1 && t.u < th).length;
  return `❄️ 눈 ${Math.round(s.snow * 100)}% → 봄에 싹 ${sprout}${val || green ? ` · 솔방울 +${val}` : ''}`;
}

/** 봇: 아무 때나 탭 */
export const seasonsRandom: Bot<SeasonsState> = { name: '아무 때나', act: (_s, rng) => ({ tap: rng() < 0.02, dir: 0 }) };

/** 이 계절을 탭 없이 끝까지 돌려 보는 복사본 (난수는 막아 둔다 — 계절 중엔 쓰지 않지만 혹시라도 진짜 판을 건드리지 않게) */
function ghost(s: SeasonsState): SeasonsState {
  return { ...s, rng: () => 0.5, tiles: s.tiles.map((t) => ({ ...t })), fruits: s.fruits.map((f) => ({ ...f })), critters: s.critters.map((c) => ({ ...c })), events: [], seen: new Set(s.seen) };
}
const plans = new WeakMap<SeasonsState, { sid: number; at: number }>();

/** 봇: 계절이 시작되면 이번 계절을 끝까지 내다보고(익음·다람쥐·폭풍·서리·사슴), '지금 넘기면 얻는 것'이 가장 큰 순간에 탭 */
export const seasonsSmart: Bot<SeasonsState> = {
  name: '앞을 내다보는 숲지기',
  act(s) {
    if (s.pause) return { tap: false, dir: 0 };
    let plan = plans.get(s);
    if (!plan || plan.sid !== s.sid) {
      const g = ghost(s), max = SEASONS[s.season].max;
      let best = value(g), at = g.st;
      while (g.st < max - 1) {
        g.st++;
        tick(g);
        const v = value(g);
        if (v > best) (best = v), (at = g.st);
      }
      plan = { sid: s.sid, at: Math.max(at, MIN_SEASON) };
      plans.set(s, plan);
    }
    return { tap: s.st >= plan.at, dir: 0 };
  },
};
