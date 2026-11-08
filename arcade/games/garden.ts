/**
 * 물길 정원 (0030, 14라운드 · 오너가 고른 메뉴 6번) — 농사 × 땅따먹기 · 가리키기 · 물 흐름.
 * 와우: 손가락으로 판 길로 물이 실제로 흐르고(칸 단위 물 시뮬레이션), 물이 닿는 곳마다 씨앗이 꽃핀다.
 * 목표·보상: 판마다 씨앗을 전부 꽃피우면 클리어, 판 땅이 적을수록 별. 핀 꽃은 위쪽 '내 정원'에 계속 쌓인다.
 * 안 질리게(하는 일이 바뀜): 바위 → 연꽃(물웅덩이가 있어야 핌) → 가뭄(샘이 쉬었다 나옴) → 두더지(물길을 메움, 톡 치면 도망)
 *   → 선인장(물이 닿으면 시든다 — 피해서 파야 함).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const COLS = 48, ROWS = 70, SKY = 9, A = ROWS / COLS, CELL = 1 / COLS, TIME = 60 * 32;
const AIR = 0, DIRT = 1, ROCK = 2, WATER = 3;
type SeedKind = 'flower' | 'lotus' | 'cactus';
interface Seed { x: number; y: number; kind: SeedKind; done: boolean; dead: boolean; at: number; hue: number; soak: number; gold: boolean }
interface Ev { t: number; kind: string; x: number; y: number; text?: string }
export interface GardenState {
  rng: Rng; t: number; k: number; seed: number; grid: Uint8Array; dirs: Int8Array; seeds: Seed[]; src: number; budget: number; used: number;
  phase: 'play' | 'clear' | 'fail'; phaseT: number; start: number; last: { x: number; y: number } | null; mole: { x: number; y: number; dir: 1 | -1; gone: number } | null;
  drought: boolean; hearts: number; flowers: number; stars: number; lastStars: number; garden: number[]; seen: Set<string>; events: Ev[]; dead: boolean;
}

const at = (x: number, y: number) => y * COLS + x;
const ev = (s: GardenState, kind: string, x: number, y: number, text?: string) => s.events.push({ t: s.t, kind, x, y, text });
function see(s: GardenState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  ev(s, 'new', 0.5, A * 0.45, text);
}

/** k번째 판 (같은 seed·k → 같은 판) */
function build(s: GardenState) {
  const r = mulberry32(s.seed * 7919 + s.k * 104729), k = s.k, g = new Uint8Array(COLS * ROWS);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) g[at(x, y)] = y < SKY ? AIR : x === 0 || x === COLS - 1 ? ROCK : DIRT;
  // 바위 무더기 (2판부터)
  for (let i = 0; i < (k >= 1 ? 3 + k : 0); i++) {
    const cx = 3 + Math.floor(r() * (COLS - 6)), cy = SKY + 6 + Math.floor(r() * (ROWS - SKY - 12)), rw = 2 + Math.floor(r() * 4), rh = 1 + Math.floor(r() * 3);
    for (let y = cy; y < cy + rh; y++) for (let x = cx - rw; x <= cx + rw; x++) if (x > 0 && x < COLS - 1 && y < ROWS - 1) g[at(x, y)] = ROCK;
  }
  s.src = 6 + Math.floor(r() * (COLS - 12));
  for (let y = SKY; y < SKY + 3; y++) g[at(s.src, y)] = DIRT;
  const seeds: Seed[] = [], n = Math.min(6, 2 + Math.floor(k / 3));
  const kinds: SeedKind[] = [];
  for (let i = 0; i < n; i++) kinds.push(k >= 2 && i === 1 ? 'lotus' : 'flower');
  if (k >= 8) kinds.push('cactus');
  if (k >= 11) kinds.push('cactus');
  for (const kind of kinds) {
    for (let tries = 0; tries < 50; tries++) {
      const x = 3 + Math.floor(r() * (COLS - 6)), y = SKY + 10 + Math.floor(r() * Math.min(ROWS - SKY - 14, 14 + k * 5));
      if (g[at(x, y)] !== DIRT || seeds.some((q) => Math.abs(q.x - x) + Math.abs(q.y - y) < 7)) continue;
      seeds.push({ x, y, kind, done: false, dead: false, at: 0, hue: Math.floor(r() * 360), soak: 0, gold: kind === 'flower' && k >= 10 && seeds.length === 0 });
      break;
    }
  }
  s.grid = g;
  s.dirs = new Int8Array(COLS * ROWS);
  s.seeds = seeds;
  s.budget = k === 0 ? 400 : 50 + 68 * seeds.filter((q) => q.kind !== 'cactus').length - 3 * k; // 첫 판은 넉넉하게(바로 재미), 그 뒤엔 씨앗 수만큼
  s.used = 0;
  s.start = s.t;
  s.phase = 'play';
  s.phaseT = 0;
  s.last = null;
  s.drought = k >= 4;
  s.mole = k >= 6 ? { x: 2 + Math.floor(r() * (COLS - 4)), y: SKY + 14 + Math.floor(r() * 20), dir: r() < 0.5 ? 1 : -1, gone: 0 } : null;
  if (k >= 1) see(s, 'rock', '회색 바위는 팔 수 없어요 — 돌아서 파세요');
  if (seeds.some((q) => q.kind === 'lotus')) see(s, 'lotus', '연꽃은 물에 1.5초 잠겨 있어야 펴요 — 물이 고이게 파 주세요');
  if (s.drought) see(s, 'drought', '가뭄! 샘이 가끔 쉬었다 나와요');
  if (s.mole) see(s, 'mole', '두더지가 물길을 메워요 — 톡 치면 도망가요');
  if (seeds.some((q) => q.kind === 'cactus')) see(s, 'cactus', '선인장은 물이 닿으면 시들어요! 피해서 파세요');
  if (seeds.some((q) => q.gold)) see(s, 'gold', '황금 씨앗! 피우면 꽃 5송이 몫');
}

/** 손가락 자리의 흙을 판다 (십자 모양 붓) */
function dig(s: GardenState, x: number, y: number) {
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const cx = x + dx, cy = y + dy;
    if (cx <= 0 || cx >= COLS - 1 || cy < SKY || cy >= ROWS - 1 || s.used >= s.budget) continue;
    if (s.seeds.some((q) => q.x === cx && q.y === cy)) continue;
    if (s.grid[at(cx, cy)] === DIRT) (s.grid[at(cx, cy)] = AIR), s.used++, s.t % 3 === 0 && ev(s, 'dig', (cx + 0.5) * CELL, (cy + 0.5) * CELL);
  }
}

/** 물 한 틱: 아래 → 아래 대각 → 옆(흐르던 방향을 기억해 계속 퍼진다). 맨 아래 줄은 빠져나간다 */
function flow(s: GardenState) {
  const g = s.grid, dirs = s.dirs, moved = new Uint8Array(COLS * ROWS), flip = s.t % 2;
  for (let y = ROWS - 1; y >= 0; y--) for (let i = 0; i < COLS; i++) {
    const x = flip ? i : COLS - 1 - i, c = at(x, y);
    if (g[c] !== WATER || moved[c]) continue;
    if (y === ROWS - 1) { g[c] = AIR; continue; }
    const d = dirs[c] || ((x + y) % 2 ? 1 : -1);
    const tryMove = (nx: number, ny: number, nd: number) => {
      const n = at(nx, ny);
      if (nx < 0 || nx >= COLS || ny >= ROWS || g[n] !== AIR) return false;
      (g[n] = WATER), (g[c] = AIR), (moved[n] = 1), (dirs[n] = nd), (dirs[c] = 0);
      return true;
    };
    if (tryMove(x, y + 1, d) || tryMove(x + d, y + 1, d) || tryMove(x - d, y + 1, -d) || tryMove(x + d, y, d) || tryMove(x - d, y, -d)) continue;
    dirs[c] = -d; // 양쪽 다 막히면 다음엔 반대쪽부터
  }
  // 샘: 바로 아래가 비어 있으면 물을 낸다 (가뭄 판엔 4초 나오고 2초 쉼)
  const on = !s.drought || (s.t % 360) < 240;
  if (on && g[at(s.src, SKY)] === AIR) (g[at(s.src, SKY)] = WATER), (dirs[at(s.src, SKY)] = s.t % 2 ? 1 : -1);
}

export const near = (s: GardenState, q: Seed, r: number) => {
  let n = 0;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = q.x + dx, y = q.y + dy;
    if (x >= 0 && x < COLS && y >= 0 && y < ROWS && s.grid[at(x, y)] === WATER) n++;
  }
  return n;
};

export const garden: GameDef<GardenState> = {
  id: 'garden',
  name: '물길 정원',
  genes: ['farm', 'territory', 'pointer'],
  twist: '손가락으로 판 길로 물이 실제로 흐르고, 닿는 곳마다 씨앗이 꽃핀다 — 핀 꽃은 위쪽 내 정원에 계속 쌓인다',
  rules: ['손가락으로 그으면 흙이 파이고, 샘물이 판 길을 따라 흘러가요 (키보드: 화살표 + 스페이스).', '물이 씨앗에 닿으면 꽃이 펴요. 씨앗을 다 피우면 다음 판! 적게 팔수록 별이 많아요.', '시간 안에 다 못 피우면 하트 -1. 핀 꽃은 위쪽 내 정원에 계속 쌓여요.'],
  controls: 'touch',
  hint: '그어서 땅 파기 / 화살표 + 스페이스',
  aspect: A,
  art: {
    concept: '땅속 물길과 위쪽 꽃밭',
    mood: '단면으로 자른 언덕. 위에는 하늘과 내가 키운 꽃밭, 아래는 층층이 다른 흙빛. 판 길로 반짝이는 물이 졸졸 흐르고, 닿는 순간 꽃이 터지듯 핀다.',
    palette: { bg: '#5b3a24', ink: '#fffaf0', muted: '#a07a5a', accent: '#5fd4ff', hot: '#ff6b6b', soft: '#7a5236' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = { rng: mulberry32(seed), t: 0, k: 0, seed, hearts: 3, flowers: 0, stars: 0, lastStars: 0, garden: [], seen: new Set<string>(), events: [], dead: false } as unknown as GardenState;
    build(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.phaseT++;
    s.events = s.events.filter((e) => s.t - e.t < 90);
    if (s.phase !== 'play') {
      if (s.phaseT >= 120) {
        if (s.phase === 'clear') s.k++;
        else if (s.hearts <= 0) return void (s.dead = true);
        build(s);
      }
      return;
    }
    // 파기: 누르고 있는 동안 지난 자리와 지금 자리 사이를 촘촘히. 두더지를 누르면 도망
    if (inp.pointer) {
      const x = Math.floor(inp.pointer.x * COLS), y = Math.floor(inp.pointer.y * A * COLS);
      if (s.mole && !s.mole.gone && Math.abs(s.mole.x - x) <= 2 && Math.abs(s.mole.y - y) <= 2 && !s.last) {
        s.mole.gone = 240;
        ev(s, 'mole', (s.mole.x + 0.5) * CELL, (s.mole.y + 0.5) * CELL, '두더지 도망!');
      } else {
        const from = s.last ?? { x, y }, steps = Math.max(1, Math.abs(x - from.x), Math.abs(y - from.y));
        for (let i = 1; i <= steps; i++) dig(s, Math.round(from.x + ((x - from.x) * i) / steps), Math.round(from.y + ((y - from.y) * i) / steps));
        if (steps === 1) dig(s, x, y);
      }
      s.last = { x, y };
    } else s.last = null;
    flow(s);
    // 두더지: 2판마다 한 칸씩 굴을 지나가며 물길을 흙으로 메운다
    const m = s.mole;
    if (m) {
      if (m.gone > 0) m.gone--;
      else if (s.t % 12 === 0) {
        const nx = m.x + m.dir;
        if (nx <= 1 || nx >= COLS - 2 || s.grid[at(nx, m.y)] === ROCK) m.dir = m.dir > 0 ? -1 : 1;
        else {
          if (s.grid[at(m.x, m.y)] !== ROCK) (s.grid[at(m.x, m.y)] = DIRT), (s.dirs[at(m.x, m.y)] = 0);
          m.x = nx;
        }
      }
    }
    // 씨앗: 물이 닿으면 핀다(연꽃은 주변 물 10칸 이상), 선인장은 시든다
    for (const q of s.seeds) {
      if (q.done || q.dead) continue;
      const wet = near(s, q, 1) > 0;
      if (q.kind === 'cactus') {
        if (wet) (q.dead = true), ev(s, 'wilt', (q.x + 0.5) * CELL, (q.y + 0.5) * CELL, '선인장이 시들었어요!');
        continue;
      }
      q.soak = wet ? q.soak + 1 : 0;
      if (q.kind === 'lotus' ? q.soak >= 90 : wet) {
        q.done = true;
        q.at = s.t;
        s.flowers += q.gold ? 5 : 1;
        s.garden.push(q.gold ? 2000 : q.hue + (q.kind === 'lotus' ? 1000 : 0));
        ev(s, 'bloom', (q.x + 0.5) * CELL, (q.y + 0.5) * CELL, q.gold ? '황금 꽃! +5' : q.kind === 'lotus' ? '연꽃 활짝!' : '꽃이 폈어요!');
      }
    }
    const goal = s.seeds.filter((q) => q.kind !== 'cactus');
    if (goal.every((q) => q.done)) {
      const ratio = s.used / s.budget, stars = ratio <= 0.5 ? 3 : ratio <= 0.75 ? 2 : 1;
      s.phase = 'clear';
      s.phaseT = 0;
      s.stars += stars;
      s.lastStars = stars;
      ev(s, 'clear', 0.5, A * 0.4, `${s.k + 1}판 클리어!`);
    } else {
      // 실패: 시간 끝 · 선인장 시듦 · 흙을 다 썼는데 8초 넘게 새로 핀 꽃이 없음
      const wilted = s.seeds.some((q) => q.dead), out = s.used >= s.budget && s.t - Math.max(s.start, ...s.seeds.map((q) => q.at)) > 480;
      if (s.t - s.start >= TIME || wilted || out) {
        s.phase = 'fail';
        s.phaseT = 0;
        s.hearts--;
        ev(s, 'fail', 0.5, A * 0.4, wilted ? '선인장이 시들었어요 — 하트 -1' : s.t - s.start >= TIME ? '시간이 다 됐어요 — 하트 -1' : '흙을 다 썼어요 — 하트 -1');
      }
    }
  },
  over: (s) => s.dead,
  score: (s) => s.flowers * 10 + s.stars * 5,
  draw(ctx, s, w, h, th: Theme) {
    const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, C = CELL * w, g = s.grid;
    ctx.save();
    fx.begin(ctx);
    // 하늘 + 흐르는 구름 + 해
    const sky = ctx.createLinearGradient(0, 0, 0, SKY * C);
    sky.addColorStop(0, '#7cc8ff');
    sky.addColorStop(1, '#cdefff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, SKY * C);
    ctx.fillStyle = '#fff3a0';
    ctx.beginPath();
    ctx.arc(w * 0.72, C * 2.4, C * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let k = 0; k < 3; k++) {
      const cx = ((s.t * 0.15 + k * 140) % (w + 80)) - 40, cy = C * (1.5 + k);
      for (const [dx, r] of [[0, 1.2], [1.2, 1.5], [2.4, 1.1]] as const) (ctx.beginPath(), ctx.arc(cx + dx * C, cy, r * C, 0, Math.PI * 2), ctx.fill());
    }
    // 흙: 층마다 색이 다른 띠 + 점무늬
    const soil = ctx.createLinearGradient(0, SKY * C, 0, h);
    soil.addColorStop(0, '#8a5a34');
    soil.addColorStop(0.4, '#6e4428');
    soil.addColorStop(1, '#45281a');
    ctx.fillStyle = soil;
    ctx.fillRect(0, SKY * C, w, h - SKY * C);
    for (let k = 0; k < 7; k++) (ctx.fillStyle = k % 2 ? 'rgba(0,0,0,.07)' : 'rgba(255,220,180,.05)'), ctx.fillRect(0, SKY * C + (k + 0.5) * ((h - SKY * C) / 7) + Math.sin(k * 3) * C, w, C * 1.6);
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    for (let k = 0; k < 220; k++) ctx.fillRect((((k * 7919) % 997) / 997) * w, SKY * C + (((k * 104729) % 991) / 991) * (h - SKY * C), 2, 2);
    // 판 굴·바위·물
    for (let y = SKY; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const c = g[at(x, y)];
      if (c === DIRT) continue;
      if (c === ROCK) {
        ctx.fillStyle = (x * 7 + y * 13) % 5 ? '#8c8f97' : '#a7abb3';
        ctx.fillRect(x * C, y * C, C + 0.5, C + 0.5);
      } else if (c === AIR) {
        ctx.fillStyle = '#2e1b10';
        ctx.fillRect(x * C, y * C, C + 0.5, C + 0.5);
      } else {
        const sh = 0.75 + 0.25 * Math.sin(s.t / 6 + x * 0.9 + y * 0.6);
        ctx.fillStyle = `rgb(${Math.round(60 * sh)},${Math.round(170 * sh + 40)},255)`;
        ctx.fillRect(x * C, y * C, C + 0.5, C + 0.5);
      }
    }
    // 잔디 선 + 샘
    ctx.fillStyle = '#5bbf4a';
    ctx.fillRect(0, SKY * C - C * 0.5, w, C * 0.7);
    ctx.fillStyle = '#9a9ea8';
    ctx.fillRect((s.src - 1) * C, (SKY - 1.6) * C, C * 3, C * 1.2);
    ctx.fillStyle = (!s.drought || s.t % 360 < 240) ? th.accent : '#8aa';
    ctx.fillRect(s.src * C, (SKY - 0.6) * C, C, C * 0.8);
    // 씨앗·꽃
    for (const q of s.seeds) {
      const x = (q.x + 0.5) * C, y = (q.y + 0.5) * C;
      if (q.kind === 'cactus') {
        ctx.fillStyle = q.dead ? '#7a6a4a' : '#3fae4a';
        ctx.fillRect(x - C * 0.4, y - C * 1.2, C * 0.8, C * 1.8);
        ctx.fillRect(x - C * 1.1, y - C * 0.6, C * 0.7, C * 0.4);
        ctx.fillRect(x + C * 0.4, y - C * 0.9, C * 0.7, C * 0.4);
        continue;
      }
      if (!q.done) {
        ctx.shadowColor = '#ffe9a0';
        ctx.shadowBlur = 8 + 4 * Math.sin(s.t / 10 + q.x);
        ctx.fillStyle = q.gold ? '#ffd700' : q.kind === 'lotus' ? '#ffb3d1' : '#e8c27a';
        ctx.beginPath();
        ctx.ellipse(x, y, C * 1.0, C * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(255,240,170,${0.35 + 0.3 * Math.sin(s.t / 8 + q.x)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, C * (1.8 + 0.3 * Math.sin(s.t / 8 + q.x)), 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#7bd35a';
        ctx.fillRect(x - 1, y - C * 1.1, 2, C * 0.6);
      } else {
        const grow = Math.min(1, (s.t - q.at) / 20), petals = q.kind === 'lotus' ? 8 : 6, col = q.gold ? '#ffd700' : q.kind === 'lotus' ? '#ff8fc8' : `hsl(${q.hue},90%,65%)`;
        ctx.fillStyle = col;
        for (let p = 0; p < petals; p++) {
          const a = (p / petals) * Math.PI * 2 + s.t * 0.01;
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(a) * C * 0.8 * grow, y + Math.sin(a) * C * 0.8 * grow, C * 0.55 * grow, C * 0.35 * grow, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.arc(x, y, C * 0.45 * grow, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (s.mole && !s.mole.gone) {
      const x = (s.mole.x + 0.5) * C, y = (s.mole.y + 0.5) * C;
      ctx.fillStyle = '#4a3a33';
      ctx.beginPath();
      ctx.ellipse(x, y, C * 1.2, C * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff9aa8';
      ctx.beginPath();
      ctx.arc(x + s.mole.dir * C * 1.1, y, C * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    // 내 정원: 지금까지 핀 꽃이 잔디 위에 줄지어 자란다
    const n = s.garden.length, gap = Math.min(C * 1.6, (w - 20) / Math.max(1, n));
    s.garden.forEach((hue, i) => {
      const x = 10 + i * gap + gap / 2, y = SKY * C - C * 0.5, sway = Math.sin(s.t / 25 + i) * 2, lotus = hue >= 1000;
      ctx.strokeStyle = '#3f9a3a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + sway, y - C * (1.4 + (i % 3) * 0.4));
      ctx.stroke();
      ctx.fillStyle = hue >= 2000 ? '#ffd700' : lotus ? '#ff8fc8' : `hsl(${hue % 360},90%,65%)`;
      ctx.beginPath();
      ctx.arc(x + sway, y - C * (1.4 + (i % 3) * 0.4), C * 0.55, 0, Math.PI * 2);
      ctx.fill();
    });
    const seenT = fx.memo.t ?? -1;
    for (const e of s.events) {
      if (e.t <= seenT) continue;
      if (e.kind === 'dig') fx.burst(X(e.x), Y(e.y), '#a8774c', 3, 1.5, 2);
      if (e.kind === 'bloom') fx.burst(X(e.x), Y(e.y), '#ff9ad5', 24, 4, 3), fx.burst(X(e.x), Y(e.y), th.accent, 12, 3, 2), fx.ring(X(e.x), Y(e.y), '#ffe066', 60, 4), fx.pop(X(e.x), Y(e.y) - 16, e.text!, '#fff6c8', 16);
      if (e.kind === 'mole') fx.pop(X(e.x), Y(e.y) - 14, e.text!, '#ffe066', 14), fx.burst(X(e.x), Y(e.y), '#a8774c', 14, 3);
      if (e.kind === 'wilt') fx.kick(10), fx.blink(th.hot, 0.3), fx.pop(X(e.x), Y(e.y) - 16, e.text!, th.hot, 15);
      if (e.kind === 'clear') {
        fx.blink('#fff6c8', 0.3);
        for (let k = 0; k < 7; k++) fx.burst(X(0.1 + k * 0.13), Y(0.15), `hsl(${k * 50},95%,65%)`, 14, 5, 3.5);
        fx.pop(w / 2, h * 0.38, e.text!, '#ffe066', 28);
      }
      if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.25), fx.pop(w / 2, h * 0.38, e.text!, th.hot, 18);
      if (e.kind === 'new') fx.pop(w / 2, h * 0.47, e.text!, '#fff6c8', 14);
    }
    fx.memo.t = s.t;
    ctx.restore();
    // 머리말: 판 · 남은 흙 · 시간 · 하트 · 꽃 수
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1d3b5a';
    ctx.font = `900 ${Math.round(w * 0.045)}px system-ui, sans-serif`;
    ctx.fillText(`${s.k + 1}판 · 🌸 ${s.flowers} · ★ ${s.stars}`, 8, 6);
    ctx.textAlign = 'right';
    ctx.fillStyle = th.hot;
    ctx.fillText('♥'.repeat(Math.max(0, s.hearts)), w - 8, 6);
    const left = Math.max(0, 1 - (s.t - s.start) / TIME), dirt = Math.max(0, 1 - s.used / s.budget);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(8, h - 16, w - 16, 10);
    ctx.fillStyle = '#c99a6a';
    ctx.fillRect(8, h - 16, (w - 16) * dirt, 5);
    ctx.fillStyle = left < 0.25 ? th.hot : th.accent;
    ctx.fillRect(8, h - 11, (w - 16) * left, 5);
    if (s.phase === 'clear') {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe066';
      ctx.font = `900 ${Math.round(w * 0.09)}px system-ui, sans-serif`;
      ctx.fillText('★'.repeat(s.lastStars) + '☆'.repeat(3 - s.lastStars), w / 2, h * 0.47);
    }
    if (s.k === 0 && s.used === 0) (ctx.textAlign = 'center'), (ctx.fillStyle = '#fffaf0'), (ctx.font = `800 ${Math.round(w * 0.042)}px system-ui, sans-serif`), ctx.fillText('👇 샘 아래를 손가락으로 긁어 내려가 보세요', w / 2, (SKY + 2) * C);
  },
};

const memo = new WeakMap<object, { x: number; y: number; a: number; on: boolean }>();
/** 봇: 아무 데나 긁는다 */
export const gardenRandom: Bot<GardenState> = {
  name: '아무 데나',
  act(s, rng) {
    let m = memo.get(s);
    if (!m) memo.set(s, (m = { x: 0.5, y: 0.3, a: Math.PI / 2, on: false }));
    if (s.t % 40 === 0) m.on = rng() < 0.6;
    m.a += (rng() - 0.5) * 0.6;
    m.x = Math.max(0.02, Math.min(0.98, m.x + Math.cos(m.a) * 0.008));
    m.y = Math.max(0.15, Math.min(0.98, m.y + Math.sin(m.a) * 0.008));
    if (m.x <= 0.02 || m.x >= 0.98 || m.y <= 0.15 || m.y >= 0.98) m.a += Math.PI / 2;
    return { tap: false, dir: 0, pointer: m.on && s.phase === 'play' ? { x: m.x, y: m.y } : null };
  },
};

/**
 * 봇: 물이 내려가거나 옆으로만 흐르니, 샘(또는 이미 판 굴)에서 '아래·옆'으로만 가는 길 중 흙을 가장 적게 파는 길을 찾아
 * (0-1 너비 우선 탐색) 손가락 빠르기로 따라 긋는다. 선인장 옆은 피하고, 두더지가 굴 가까이 오면 톡.
 */
const paths = new WeakMap<object, { k: number; pts: [number, number][]; i: number; rest: boolean }>();
export const gardenSmart: Bot<GardenState> = {
  name: '정원사',
  act(s) {
    if (s.phase !== 'play') return { tap: false, dir: 0, pointer: null };
    const m = s.mole;
    if (m && !m.gone && s.grid.some((c, i) => c !== DIRT && c !== ROCK && Math.abs((i % COLS) - m.x) + Math.abs(Math.floor(i / COLS) - m.y) < 4) && s.t % 6 === 0)
      return { tap: false, dir: 0, pointer: { x: (m.x + 0.5) / COLS, y: (m.y + 0.5) / COLS / A } };
    let p = paths.get(s);
    if (p && p.i >= p.pts.length && !p.rest) return (p.rest = true), { tap: false, dir: 0, pointer: null }; // 길 하나 다 그으면 손을 한 번 뗀다
    if (!p || p.k !== s.k * 1000 + s.seeds.filter((q) => q.done).length || p.i >= p.pts.length) {
      if (p && p.k !== s.k * 1000 + s.seeds.filter((q) => q.done).length && p.i > 0 && !p.rest) return (p.rest = true), { tap: false, dir: 0, pointer: null };
      // 아직 물이 안 닿을 씨앗 하나로 가는 최소 흙 길
      const cost = new Float64Array(COLS * ROWS).fill(Infinity), prev = new Int32Array(COLS * ROWS).fill(-1), dq: number[] = [];
      const bad = new Uint8Array(COLS * ROWS);
      for (const q of s.seeds) if (q.kind === 'cactus') for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = q.x + dx, y = q.y + dy; if (x >= 0 && x < COLS && y >= 0 && y < ROWS) bad[at(x, y)] = 1; }
      const s0 = at(s.src, SKY);
      cost[s0] = 0;
      dq.push(s0);
      const goal = new Set<number>();
      for (const q of s.seeds) if (!q.done && q.kind !== 'cactus') for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) goal.add(at(q.x + dx, q.y + dy));
      let hit = -1;
      while (dq.length) {
        const c = dq.shift()!, x = c % COLS, y = Math.floor(c / COLS);
        if (goal.has(c)) { hit = c; break; }
        for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0]]) {
          const nx = x + dx, ny = y + dy;
          if (nx <= 0 || nx >= COLS - 1 || ny >= ROWS - 1) continue;
          const n = at(nx, ny), t = s.grid[n];
          if (t === ROCK || bad[n] || s.seeds.some((q) => q.x === nx && q.y === ny)) continue;
          const w = t === DIRT ? 1 : 0;
          if (cost[c] + w < cost[n]) {
            cost[n] = cost[c] + w;
            prev[n] = c;
            if (w) dq.push(n);
            else dq.unshift(n);
          }
        }
      }
      const pts: [number, number][] = [];
      for (let c = hit; c >= 0; c = prev[c]) if (s.grid[c] === DIRT) pts.unshift([c % COLS, Math.floor(c / COLS)]);
      paths.set(s, (p = { k: s.k * 1000 + s.seeds.filter((q) => q.done).length, pts, i: 0, rest: false }));
      if (!pts.length) return { tap: false, dir: 0, pointer: null };
    }
    const [x, y] = p.pts[Math.min(p.i, p.pts.length - 1)];
    p.i += 1;
    return { tap: false, dir: 0, pointer: { x: (x + 0.5) / COLS, y: (y + 0.5) / COLS / A } };
  },
};
