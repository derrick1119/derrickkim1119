/**
 * 줄줄이 오리 (0033, 오너 아이디어: "길 건너기 같은 아이디어") — 길 건너기 × 스네이크 · 원버튼.
 * 조작은 탭 하나뿐: 탭하면 엄마 오리가 한 칸 앞으로 폴짝 (15라운드 오너: "조작이 너무 필요해서 별로").
 * 와우: 길가의 새끼 오리를 만나면 엄마 뒤에 줄줄이 붙어 엄마가 뛴 자리를 그대로 따라 뛴다 —
 *       차도 위에 오리 행렬이 늘어서고, 차가 줄 사이를 아슬아슬 스친다. 줄이 길수록 틈이 길어야 한다.
 * 첫 3초: 바로 옆 새끼 오리가 "삐약" 하고 줄에 붙고, 탭 두 번에 첫 찻길을 건넌다.
 * 목표·보상: 단계마다 연못까지 — 데려온 새끼가 한 마리씩 연못에 퐁당(+1), 모두 데려오면 별 셋.
 * 하는 일이 바뀐다: 트럭(긴 틈) → 강(물살에 떠밀려 오래 못 머묾) → 기찻길(불빛 보고 기다림) → 매(오래 서 있으면 막내를 채 감)
 *                  → 황금 새끼(3마리 몫) → 밤(헤드라이트로 차를 읽음).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.35, COLS = 9, HOP = 9, GAP = 9, HIT = 0.3, HAWK_WARN = 100, HAWK = 160;
type Kind = 'grass' | 'road' | 'river' | 'rail' | 'home';
interface Car { x: number; len: number; col: number }
interface Lane { kind: Kind; stage: number; dir: 1 | -1; v: number; loop: number; cars: Car[]; current: number }
interface Chick { x: number; row: number; vx: number; gold: boolean }
interface Follower { gold: boolean; stage: number; joinT: number; fx: number; fy: number; done: boolean }
interface Ev { t: number; kind: string; x: number; y: number; text?: string }
export interface DuckState {
  rng: Rng; t: number; x: number; y: number; row: number; hopT: number; fromX: number; toX: number; queued: boolean;
  lanes: Map<number, Lane>; top: number; stage: number; homeRow: number; avail: number[];
  chicks: Chick[]; line: Follower[]; hist: { x: number; y: number }[]; cam: number;
  hearts: number; inv: number; safeRow: number; idle: number; delivered: number; stars: number; best: number;
  seen: Set<string>; events: Ev[]; dead: boolean;
}

const ev = (s: DuckState, kind: string, x: number, y: number, text?: string) => s.events.push({ t: s.t, kind, x, y, text });
function see(s: DuckState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  ev(s, 'new', 4.5, s.row + 3, text);
}
const CAR_COLS = ['#ff5d5d', '#ffb238', '#4fa3ff', '#9b6bff', '#2ec4a6', '#ff7ab6'];
const wrap = (x: number, loop: number, off: number) => ((((x + off) % loop) + loop) % loop) - off;
const carAt = (L: Lane, c: Car, dt: number) => wrap(c.x + L.dir * L.v * dt, L.loop, c.len / 2 + 0.5);
/** dt틱 뒤 이 줄의 x 자리에 차·배·기차가 있나 */
export function blocked(L: Lane | undefined, x: number, dt: number): boolean {
  if (!L || L.kind === 'grass' || L.kind === 'home') return false;
  return L.cars.some((c) => Math.abs(carAt(L, c, dt) - x) < c.len / 2 + HIT);
}

/** 단계 k의 줄들을 top 다음부터 만든다. 마지막 줄은 연못(home) */
function addStage(s: DuckState, k: number) {
  const r = s.rng, sp = 1 + 0.1 * k, n = 7 + Math.min(k, 5), win = Math.max(2, 14 - 1.5 * k), start = s.top, grass: number[] = [];
  let row = start + 1;
  while (row < start + n) {
    // 1단계는 찻길 한 줄씩만 (처음 3초는 쉽게), 단계마다 연달아 오는 줄이 늘어난다
    const block = k === 0 ? 1 : Math.max(1, Math.min(start + n - row, 1 + Math.floor(r() * Math.min(5, 1.6 + k * 0.5))));
    const riverOk = k >= 1 && r() < 0.35, railOk = k >= 2 && r() < 0.3;
    for (let b = 0; b < block; b++, row++) {
      const dir: 1 | -1 = r() < 0.5 ? 1 : -1;
      if (railOk && b === 0) {
        const v = 0.7, period = Math.round((280 + r() * 120) / (1 + 0.04 * k));
        s.lanes.set(row, { kind: 'rail', stage: k, dir, v, loop: v * period, cars: [{ x: -14 - r() * v * period * 0.6, len: 12, col: 0 }], current: 0 });
        continue;
      }
      if (riverOk) {
        const v = (0.022 + r() * 0.014) * sp, cars: Car[] = [];
        for (let x = r() * 3; x < 13; x += 1.6 + 3.2 + r() * 3) cars.push({ x, len: 1.6, col: 0 });
        s.lanes.set(row, { kind: 'river', stage: k, dir, v, loop: 14 + 1.6, cars, current: dir * (0.008 + r() * 0.007) * sp });
        continue;
      }
      const v = (k ? 0.03 + r() * 0.026 : 0.02 + r() * 0.015) * sp, cars: Car[] = [];
      for (let x = r() * 3; x < 14; ) {
        const len = k >= 1 && r() < 0.3 ? 2.2 : 1;
        cars.push({ x: x + len / 2, len, col: Math.floor(r() * CAR_COLS.length) });
        x += len + Math.max(2.3 - Math.min(1, k * 0.1), v * (HOP + win) + 1.1) + r() * Math.max(1.2, 2.6 - k * 0.15);
      }
      const loop = Math.max(14, cars.at(-1)!.x + cars.at(-1)!.len / 2 + 2.3);
      s.lanes.set(row, { kind: 'road', stage: k, dir, v, loop, cars, current: 0 });
    }
    if (row < start + n) (s.lanes.set(row, { kind: 'grass', stage: k, dir: 1, v: 0, loop: 1, cars: [], current: 0 }), grass.push(row), row++);
  }
  s.lanes.set(start + n, { kind: 'home', stage: k, dir: 1, v: 0, loop: 1, cars: [], current: 0 });
  // 새끼 오리: 단계 안의 풀밭 줄마다 한 마리(+ 시작 줄), 4단계부터 하나는 황금
  const spots = k === 0 ? [start, ...grass] : [start, ...grass];
  let avail = 0;
  spots.slice(0, 2 + Math.min(k, 3)).forEach((row, i) => {
    const gold = k >= 4 && i === 1;
    s.chicks.push({ x: k === 0 && i === 0 ? 5.5 : 1.5 + r() * 6, row, vx: (r() < 0.5 ? -1 : 1) * (0.012 + r() * 0.01), gold });
    avail += gold ? 3 : 1;
  });
  s.avail[k] = avail;
  s.top = start + n;
}

function lane(s: DuckState, row: number): Lane | undefined {
  while (row > s.top - 12) addStage(s, s.lanes.get(s.top)!.stage + 1);
  return s.lanes.get(row);
}

function hurt(s: DuckState, text: string) {
  s.hearts--;
  s.inv = 90;
  ev(s, 'hurt', s.x, s.y, text);
  s.row = s.safeRow;
  s.y = s.row;
  s.x = s.toX = s.fromX = 4.5;
  s.hopT = 0;
  s.hist = [{ x: s.x, y: s.y }];
  s.idle = 0;
  if (s.hearts <= 0) s.dead = true;
}

const followerPos = (s: DuckState, i: number) => s.hist[Math.max(0, s.hist.length - 1 - (i + 1) * GAP)];

export const ducks: GameDef<DuckState> = {
  id: 'ducks',
  name: '줄줄이 오리',
  genes: ['crossing', 'snake', 'onebutton'],
  twist: '길 건너기에 스네이크 꼬리를 붙였다 — 데려온 새끼 오리들이 엄마가 뛴 자리를 그대로 따라 뛰어서, 줄이 길수록 찻길의 틈이 길어야 한다',
  rules: ['탭하면 엄마 오리가 한 칸 앞으로 폴짝 (스페이스·↑도 돼요).', '새끼 오리를 만나면 줄줄이 따라와요. 차에 치이면 그 새끼는 놓쳐요.', '연못까지 데려가면 단계 통과 — 모두 데려오면 별 셋!'],
  controls: 'tap',
  hint: '탭 = 한 칸 앞으로 / 스페이스 · ↑',
  aspect: A,
  origin: '오너 아이디어 — "길건너친구들 같은 아이디어도 한번 생각해바" (2026-11-08, 15라운드 뒤)',
  art: {
    concept: '봄날 시골길 오리 가족 나들이',
    mood: '연둣빛 풀밭과 장난감 같은 찻길, 반짝이는 강. 하얀 엄마 오리 뒤로 노란 새끼들이 폴짝폴짝 줄을 서고, 연못에 퐁당 들어갈 때마다 물보라가 튄다.',
    palette: { bg: '#8fd16a', ink: '#1f2a1a', muted: '#6c8a5a', accent: '#ffd23f', hot: '#ff4f5e', soft: '#e9f7d8' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = { rng: mulberry32(seed), t: 0, x: 4.5, y: 0, row: 0, hopT: 0, fromX: 4.5, toX: 4.5, queued: false, lanes: new Map(), top: 0, stage: 0, homeRow: 0, avail: [], chicks: [], line: [], hist: [{ x: 4.5, y: 0 }], cam: -3, hearts: 3, inv: 0, safeRow: 0, idle: 0, delivered: 0, stars: 0, best: 0, seen: new Set<string>(), events: [], dead: false } as unknown as DuckState;
    s.lanes.set(0, { kind: 'grass', stage: 0, dir: 1, v: 0, loop: 1, cars: [], current: 0 });
    addStage(s, 0);
    s.homeRow = s.top;
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.events = s.events.filter((e) => s.t - e.t < 90);
    if (s.inv > 0) s.inv--;
    for (const L of s.lanes.values()) for (const c of L.cars) c.x = wrap(c.x + L.dir * L.v, L.loop, c.len / 2 + 0.5);
    if (s.t % 120 === 0) for (const r of [...s.lanes.keys()]) if (r < s.row - 25) s.lanes.delete(r);
    // 탭 = 한 칸 앞으로 (뛰는 중 끝무렵 탭은 기억해 둔다)
    if (inp.tap) s.queued = true;
    if (s.queued && s.hopT === 0) {
      s.queued = false;
      const next = lane(s, s.row + 1)!;
      s.fromX = s.x;
      s.toX = next.kind === 'river' ? s.x : Math.floor(s.x) + 0.5;
      s.hopT = HOP;
      s.idle = 0;
    } else if (s.queued && s.hopT > 4) s.queued = false;
    if (s.hopT > 0) {
      s.hopT--;
      const p = 1 - s.hopT / HOP;
      s.y = s.row + p;
      s.x = s.fromX + (s.toX - s.fromX) * p;
      if (s.hopT === 0) {
        s.row++;
        s.y = s.row;
        ev(s, 'land', s.x, s.y);
        s.best = Math.max(s.best, s.row);
        const L = lane(s, s.row)!;
        if (L.kind === 'grass' || L.kind === 'home') s.safeRow = s.row;
        if (L.kind === 'home' && L.stage === s.stage) {
          // 연못 도착: 줄에 선 이번 단계 새끼들이 한 마리씩 퐁당
          const got = s.line.filter((f) => f.stage === s.stage && !f.done).reduce((a, f) => a + (f.gold ? 3 : 1), 0), av = s.avail[s.stage] || 1;
          const st = 1 + (got * 2 >= av ? 1 : 0) + (got >= av ? 1 : 0);
          s.stars += st;
          s.delivered += got;
          for (const f of s.line) if (f.stage === s.stage) f.done = true;
          ev(s, 'clear', s.x, s.y, `${s.stage + 1}단계 통과! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`);
          s.stage++;
          s.homeRow = s.top;
        }
      }
    } else s.idle++;
    const here = lane(s, s.row)!;
    for (let r = s.row; r <= s.row + 6; r++) {
      const L = lane(s, r)!;
      if (L.kind === 'road' && L.cars.some((c) => c.len > 2)) see(s, 'truck', '트럭 — 길어서 틈이 더 커야 해요');
      if (L.kind === 'river') see(s, 'river', '강 — 물살에 떠밀려요, 오래 있지 마세요');
      if (L.kind === 'rail') see(s, 'rail', '기찻길 — 불이 깜빡이면 기차가 와요');
    }
    if (s.stage >= 5) see(s, 'night', '밤 — 헤드라이트를 보세요');
    // 강: 물살에 떠밀림, 끝까지 밀리면 떠내려감
    if (here.kind === 'river' && s.hopT === 0) {
      s.x += here.current;
      if (s.x < 0.25 || s.x > COLS - 0.25) hurt(s, '떠내려가요! 하트 -1');
    }
    s.hist.push({ x: s.x, y: s.y });
    if (s.hist.length > (s.line.length + 2) * GAP + 2) s.hist.shift();
    // 새끼 오리: 풀밭을 아장아장, 엄마와 같은 줄에서 가까워지면 줄에 붙는다
    for (const c of s.chicks) {
      c.x += c.vx;
      if (c.x < 1 || c.x > COLS - 1) c.vx *= -1;
      if (c.row === s.row && s.hopT === 0 && Math.abs(c.x - s.x) < 1.1) {
        c.row = -1e9;
        const st = lane(s, s.row)!.kind === 'home' ? s.stage : lane(s, s.row)!.stage;
        s.line.push({ gold: c.gold, stage: st, joinT: s.t, fx: c.x, fy: s.row, done: false });
        ev(s, 'join', c.x, s.row, c.gold ? '황금 새끼! ×3' : '삐약!');
        see(s, 'chick', '새끼 오리가 엄마를 따라와요');
        if (c.gold) see(s, 'gold', '황금 새끼 오리 — 3마리 몫');
      }
    }
    s.chicks = s.chicks.filter((c) => c.row > s.row - 15);
    // 줄: 엄마가 지나간 자리를 GAP틱 간격으로 따라온다. 차에 치이면 놓친다, 연못에 닿으면 퐁당
    for (let i = 0; i < s.line.length; i++) {
      const f = s.line[i], p = followerPos(s, i), r = Math.round(p.y), L = s.lanes.get(r);
      if (f.done) {
        if (L?.kind === 'home' && L.stage === f.stage) (s.line.splice(i--, 1), ev(s, 'splash', p.x, p.y, f.gold ? '+3' : '+1'));
        continue;
      }
      if (s.t - f.joinT > 12 && Math.abs(p.y - r) < 0.3 && blocked(L, p.x, 0)) {
        s.line.splice(i--, 1);
        ev(s, 'lost', p.x, p.y, '삐익!');
      }
    }
    // 엄마: 차·배·기차에 치이면 하트 -1, 마지막 풀밭으로
    const mr = Math.round(s.y);
    if (s.inv === 0 && Math.abs(s.y - mr) < 0.35 && blocked(s.lanes.get(mr), s.x, 0)) hurt(s, s.lanes.get(mr)!.kind === 'rail' ? '기차! 하트 -1' : '꽥! 하트 -1');
    // 매: 3단계부터, 한 줄에 오래 서 있으면 막내(없으면 엄마)를 채 간다
    if (s.stage >= 3 && s.hopT === 0 && s.idle > HAWK_WARN) {
      see(s, 'hawk', '매 — 한 줄에 오래 서 있으면 막내를 채 가요');
      if (s.idle > HAWK) {
        s.idle = 0;
        let last = s.line.length - 1;
        while (last >= 0 && s.line[last].done) last--;
        if (last >= 0) {
          const p = followerPos(s, last);
          s.line.splice(last, 1);
          ev(s, 'hawk', p.x, p.y, '매가 채 갔어요!');
        } else if (s.inv === 0) hurt(s, '매! 하트 -1');
      }
    }
    s.cam += (s.y - 3 - s.cam) * 0.12;
  },
  over: (s) => s.dead,
  score: (s) => s.delivered * 10 + s.stars * 5 + s.best,
  draw(ctx, s, w, h, th: Theme) {
    const fx = juice(s), cell = w / COLS, X = (x: number) => x * cell, Y = (row: number) => h - (row - s.cam + 0.5) * cell;
    const night = s.stage >= 5;
    ctx.save();
    fx.begin(ctx);
    ctx.fillStyle = th.bg;
    ctx.fillRect(-10, -10, w + 20, h + 20);
    const r0 = Math.floor(s.cam) - 1, r1 = Math.ceil(s.cam + h / cell) + 1;
    // 줄 바닥
    for (let r = r0; r <= r1; r++) {
      const L = s.lanes.get(r), y = Y(r) - cell / 2;
      if (!L) continue;
      if (L.kind === 'grass') {
        ctx.fillStyle = r % 2 ? '#8fd16a' : '#86c962';
        ctx.fillRect(0, y, w, cell);
        for (let k = 0; k < 5; k++) {
          const fxp = ((r * 37 + k * 53) % 89) / 89;
          ctx.fillStyle = k % 2 ? '#fff6a8' : '#ffffff';
          ctx.beginPath();
          ctx.arc(fxp * w, y + ((r * 13 + k * 29) % 10) / 10 * cell, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (L.kind === 'road') {
        ctx.fillStyle = '#4a4f5c';
        ctx.fillRect(0, y, w, cell);
        if (s.lanes.get(r + 1)?.kind === 'road') {
          ctx.fillStyle = 'rgba(255,255,255,.55)';
          for (let x = 0; x < w; x += cell) ctx.fillRect(x + cell * 0.2, y - 1.5, cell * 0.5, 3);
        }
      } else if (L.kind === 'river') {
        ctx.fillStyle = '#4fb3e8';
        ctx.fillRect(0, y, w, cell);
        ctx.strokeStyle = 'rgba(255,255,255,.45)';
        ctx.lineWidth = 2;
        for (let k = 0; k < 4; k++) {
          const xx = wrap(k * 3.1 + s.t * L.current * 1.5, 12, 1.5) * cell, yy = y + cell * (0.25 + 0.17 * k);
          ctx.beginPath();
          ctx.moveTo(xx, yy);
          ctx.quadraticCurveTo(xx + cell * 0.3, yy - 3, xx + cell * 0.6, yy);
          ctx.stroke();
        }
      } else if (L.kind === 'rail') {
        ctx.fillStyle = '#b3a58c';
        ctx.fillRect(0, y, w, cell);
        ctx.fillStyle = '#7b5a3a';
        for (let x = 0; x < w; x += cell * 0.5) ctx.fillRect(x, y + cell * 0.15, cell * 0.18, cell * 0.7);
        ctx.fillStyle = '#d7dde5';
        ctx.fillRect(0, y + cell * 0.28, w, 3);
        ctx.fillRect(0, y + cell * 0.68, w, 3);
        const warn = L.cars.some((c) => [...Array(16).keys()].some((k) => Math.abs(carAt(L, c, k * 5) - 4.5) < c.len / 2 + 4.5));
        ctx.fillStyle = warn && s.t % 16 < 8 ? '#ff3b3b' : '#5a2020';
        ctx.shadowColor = '#ff3b3b';
        ctx.shadowBlur = warn ? 14 : 0;
        ctx.beginPath();
        ctx.arc(w - cell * 0.3, y + cell * 0.2, cell * 0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#5cc8f0';
        ctx.fillRect(0, y, w, cell);
        ctx.fillStyle = '#7fd86a';
        ctx.fillRect(0, y + cell * 0.82, w, cell * 0.18);
        ctx.fillStyle = '#3f8f3a';
        for (let x = cell * 0.2; x < w; x += cell * 1.3) ctx.fillRect(x, y + cell * 0.5, 2, cell * 0.35);
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.font = `800 ${cell * 0.32}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`연못 · ${L.stage + 1}단계`, w / 2, y + cell * 0.4);
      }
    }
    // 차·배·기차
    for (let r = r0; r <= r1; r++) {
      const L = s.lanes.get(r);
      if (!L || !L.cars.length) continue;
      const cy = Y(r);
      for (const c of L.cars) {
        const x = X(c.x), len = c.len * cell, hgt = cell * (L.kind === 'rail' ? 0.78 : 0.66);
        if (x + len / 2 < -10 || x - len / 2 > w + 10) continue;
        ctx.fillStyle = 'rgba(0,0,0,.22)';
        ctx.fillRect(x - len / 2 + 3, cy - hgt / 2 + 5, len - 4, hgt);
        if (L.kind === 'river') {
          ctx.fillStyle = '#9a6a3c';
          ctx.beginPath();
          ctx.ellipse(x, cy, len / 2, hgt * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#c99a62';
          ctx.fillRect(x - len * 0.3, cy - hgt * 0.15, len * 0.6, hgt * 0.3);
          continue;
        }
        ctx.fillStyle = L.kind === 'rail' ? '#c0392b' : CAR_COLS[c.col];
        ctx.beginPath();
        ctx.roundRect(x - len / 2, cy - hgt / 2, len, hgt, cell * 0.14);
        ctx.fill();
        ctx.fillStyle = L.kind === 'rail' ? 'rgba(255,240,200,.8)' : 'rgba(210,240,255,.85)';
        if (L.kind === 'rail') for (let k = 0.5; k < c.len - 0.5; k += 1) ctx.fillRect(x - len / 2 + k * cell, cy - hgt * 0.22, cell * 0.5, hgt * 0.44);
        else if (c.len > 2) (ctx.fillRect(x + (L.dir > 0 ? len * 0.28 : -len * 0.44), cy - hgt * 0.32, len * 0.16, hgt * 0.64), (ctx.fillStyle = 'rgba(255,255,255,.25)'), ctx.fillRect(x - len * 0.4 + (L.dir > 0 ? 0 : len * 0.2), cy - hgt * 0.38, len * 0.6, hgt * 0.76));
        else ctx.fillRect(x + (L.dir > 0 ? len * 0.05 : -len * 0.3), cy - hgt * 0.32, len * 0.25, hgt * 0.64);
        ctx.fillStyle = '#fff6b0';
        const fx0 = x + (L.dir * len) / 2 - L.dir * 3;
        ctx.fillRect(fx0 - 2, cy - hgt * 0.38, 4, 5);
        ctx.fillRect(fx0 - 2, cy + hgt * 0.38 - 5, 4, 5);
      }
    }
    // 새끼 오리(아직 혼자) · 줄 · 엄마
    const duckling = (x: number, y: number, gold: boolean, lift: number, a = 1) => {
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      ctx.beginPath();
      ctx.ellipse(x, y + cell * 0.2, cell * 0.2, cell * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      y -= lift;
      ctx.fillStyle = gold ? (s.t % 20 < 10 ? '#ffcf1f' : '#ffe88a') : '#ffe066';
      if (gold) (ctx.shadowColor = '#ffd23f'), (ctx.shadowBlur = 12);
      ctx.beginPath();
      ctx.arc(x, y, cell * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y - cell * 0.17, cell * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ff9a1f';
      ctx.fillRect(x - cell * 0.04, y - cell * 0.31, cell * 0.08, cell * 0.06);
      ctx.fillStyle = '#222';
      ctx.fillRect(x - cell * 0.07, y - cell * 0.21, 2, 2);
      ctx.fillRect(x + cell * 0.05, y - cell * 0.21, 2, 2);
      ctx.globalAlpha = 1;
    };
    for (const c of s.chicks) if (c.row >= r0 && c.row <= r1) duckling(X(c.x), Y(c.row), c.gold, Math.abs(Math.sin(s.t / 6)) * 3);
    for (let i = s.line.length - 1; i >= 0; i--) {
      const f = s.line[i], q = followerPos(s, i), k = Math.min(1, (s.t - f.joinT) / 12);
      // 엄마가 서 있으면 새끼들이 엄마 뒤로 옹기종기 모인다 (그리기만)
      const near = Math.hypot(q.x - s.x, q.y - s.y) < 0.35, p = near ? { x: q.x + ((i % 3) - 1) * 0.32, y: q.y - 0.32 - Math.floor(i / 3) * 0.22 } : q;
      const px = f.fx + (p.x - f.fx) * k, py = f.fy + (p.y - f.fy) * k, frac = near ? 0 : p.y - Math.floor(p.y);
      duckling(X(px), Y(py), f.gold, Math.sin(Math.PI * frac) * cell * 0.3 + (k < 1 ? Math.sin(Math.PI * k) * cell * 0.4 : 0));
    }
    {
      const x = X(s.x), y = Y(s.y), lift = s.hopT > 0 ? Math.sin(Math.PI * (1 - s.hopT / HOP)) * cell * 0.38 : 0;
      ctx.globalAlpha = s.inv > 0 && s.t % 8 < 4 ? 0.45 : 1;
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      ctx.beginPath();
      ctx.ellipse(x, y + cell * 0.26, cell * 0.3, cell * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x, y - lift, cell * 0.3, cell * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y - lift - cell * 0.3, cell * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff9a1f';
      ctx.fillRect(x - cell * 0.07, y - lift - cell * 0.52, cell * 0.14, cell * 0.1);
      ctx.fillStyle = '#222';
      ctx.fillRect(x - cell * 0.1, y - lift - cell * 0.36, 3, 3);
      ctx.fillRect(x + cell * 0.07, y - lift - cell * 0.36, 3, 3);
      ctx.fillStyle = '#e6eef5';
      ctx.beginPath();
      ctx.ellipse(x - cell * 0.22, y - lift + cell * 0.05, cell * 0.08, cell * 0.18, 0.3, 0, Math.PI * 2);
      ctx.ellipse(x + cell * 0.22, y - lift + cell * 0.05, cell * 0.08, cell * 0.18, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // 매 그림자
    if (s.stage >= 3 && s.idle > HAWK_WARN && s.hopT === 0) {
      const k = (s.idle - HAWK_WARN) / (HAWK - HAWK_WARN), last = Math.max(0, s.line.length - 1), p = s.line.length ? followerPos(s, last) : { x: s.x, y: s.y };
      ctx.fillStyle = `rgba(20,20,40,${0.15 + 0.3 * k})`;
      ctx.beginPath();
      ctx.ellipse(X(p.x) + (1 - k) * w * 0.6, Y(p.y) - (1 - k) * cell * 3, cell * (0.9 - 0.3 * k), cell * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // 밤: 어둠 + 엄마 주변과 헤드라이트만 밝게
    if (night) {
      const g = ctx.createRadialGradient(X(s.x), Y(s.y), cell * 1.2, X(s.x), Y(s.y), cell * 4.5);
      g.addColorStop(0, 'rgba(8,12,40,0)');
      g.addColorStop(1, 'rgba(8,12,40,.72)');
      ctx.fillStyle = g;
      ctx.fillRect(-10, -10, w + 20, h + 20);
      ctx.globalCompositeOperation = 'lighter';
      for (let r = r0; r <= r1; r++) {
        const L = s.lanes.get(r);
        if (!L || L.kind !== 'road') continue;
        for (const c of L.cars) {
          const x = X(c.x) + (L.dir * c.len * cell) / 2, y = Y(r);
          const g2 = ctx.createLinearGradient(x, y, x + L.dir * cell * 2.2, y);
          g2.addColorStop(0, 'rgba(255,230,140,.32)');
          g2.addColorStop(1, 'rgba(255,230,140,0)');
          ctx.fillStyle = g2;
          ctx.beginPath();
          ctx.moveTo(x, y - cell * 0.2);
          ctx.lineTo(x + L.dir * cell * 2.2, y - cell * 0.42);
          ctx.lineTo(x + L.dir * cell * 2.2, y + cell * 0.42);
          ctx.lineTo(x, y + cell * 0.2);
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    const seenT = fx.memo.t ?? -1;
    for (const e of s.events) {
      if (e.t <= seenT) continue;
      const x = X(e.x), y = Y(e.y);
      if (e.kind === 'land') fx.burst(x, y + cell * 0.25, '#f3ead2', 5, 1.4, 2);
      if (e.kind === 'join') fx.burst(x, y, '#ffe066', 14, 2.5, 2.5), fx.pop(x, y - cell * 0.6, e.text!, '#ffffff', 16), fx.ring(x, y, '#ffe066', cell * 1.2, 4);
      if (e.kind === 'lost') fx.burst(x, y, '#ffe066', 22, 4, 3), fx.pop(x, y - cell * 0.5, e.text!, th.hot, 16), fx.kick(6);
      if (e.kind === 'hurt') fx.burst(x, y, '#ffffff', 30, 5, 3), fx.kick(12), fx.blink(th.hot, 0.3), fx.pop(w / 2, h * 0.4, e.text!, th.hot, 20);
      if (e.kind === 'splash') fx.burst(x, y, '#bfefff', 18, 3.5, 2.5), fx.ring(x, y, '#ffffff', cell * 0.9, 3), fx.pop(x, y - cell * 0.6, e.text!, '#ffe066', 18), fx.kick(2);
      if (e.kind === 'clear') fx.pop(w / 2, h * 0.3, e.text!, '#ffffff', 24), fx.blink('#fff6c8', 0.18), fx.ring(x, y, '#ffffff', cell * 3, 6);
      if (e.kind === 'hawk') fx.burst(x, y, '#5a4a3a', 18, 4, 3), fx.pop(x, y - cell * 0.6, e.text!, th.hot, 16), fx.kick(8);
      if (e.kind === 'new') fx.pop(w / 2, h * 0.5, e.text!, '#ffffff', 16);
    }
    fx.memo.t = s.t;
    ctx.restore();
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(0, 0, w, cell * 0.95);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${cell * 0.4}px system-ui, sans-serif`;
    ctx.fillText(`${s.stage + 1}단계 · 줄 ${s.line.filter((f) => !f.done).length}마리 · 데려옴 ${s.delivered} · ★ ${s.stars}`, 10, cell * 0.25);
    ctx.textAlign = 'right';
    ctx.fillStyle = th.hot;
    ctx.fillText('♥'.repeat(Math.max(0, s.hearts)), w - 10, cell * 0.25);
    if (s.t < 240 && s.row === 0) (ctx.textAlign = 'center'), (ctx.fillStyle = '#ffffff'), (ctx.font = `900 ${cell * 0.45}px system-ui, sans-serif`), ctx.fillText('👆 탭하면 한 칸 앞으로', w / 2, h * 0.42);
  },
};

/** 봇: 아무 때나 탭 */
export const ducksRandom: Bot<DuckState> = {
  name: '아무 때나',
  act: (_s, rng) => ({ tap: rng() < 0.035, dir: 0 }),
};

/**
 * 봇: 다음 풀밭까지 건너는 길을 미리 짠다 — 줄마다 몇 틱 기다렸다 뛸지 깊이 우선으로 찾고,
 * 줄 선 새끼들(엄마 자리를 (i+1)·GAP틱 늦게 지나감)까지 안 치이는 길이 있을 때만 출발한다. 풀밭에선 다가오는 새끼를 기다린다.
 */
export const ducksSmart: Bot<DuckState> = {
  name: '엄마 오리',
  act(s) {
    if (s.hopT > 0) return { tap: false, dir: 0 };
    const tail = Math.min(4, s.line.filter((f) => !f.done).length), x0 = s.x;
    const xOn = (L: Lane | undefined) => (L?.kind === 'river' ? x0 : Math.floor(x0) + 0.5);
    const safe = (r: number, a: number, b: number, n: number) => {
      const L = s.lanes.get(r);
      if (!L || L.kind === 'grass' || L.kind === 'home') return true;
      const x = r === s.row ? x0 : xOn(L);
      for (let i = -1; i < n; i++) for (let t = a + (i + 1) * GAP; t <= b + (i + 1) * GAP; t += 2) if (blocked(L, x, t)) return false;
      return true;
    };
    // r줄에서 t틱 뒤에 뛰면 다음 풀밭까지 갈 수 있나
    const go = (r: number, t: number, n: number, depth: number): boolean => {
      if (!safe(r, t, t + 2, n)) return false;
      const N = s.lanes.get(r + 1);
      if (!N || N.kind === 'grass' || N.kind === 'home') return true;
      if (depth >= 4) return safe(r + 1, t + 5, t + HOP + 8, n);
      for (let w = 0; w <= 45; w += 3) {
        if (!safe(r + 1, t + 5, t + HOP + w + 2, n)) break;
        if (go(r + 1, t + HOP + w, n, depth + 1)) return true;
      }
      return false;
    };
    const here = s.lanes.get(s.row), onGrass = here?.kind === 'grass' || here?.kind === 'home';
    const hawk = s.stage >= 3 && s.idle > HAWK_WARN - 20;
    if (onGrass) {
      const chick = s.chicks.some((c) => c.row === s.row && Math.abs(c.x - s.x) < 3.5);
      if (chick && !hawk) return { tap: false, dir: 0 };
      return { tap: go(s.row, 0, tail, 0) || (hawk && go(s.row, 0, 0, 0)), dir: 0 };
    }
    if (here?.kind === 'river' && (s.x < 1.4 || s.x > COLS - 1.4)) return { tap: true, dir: 0 };
    if (go(s.row, 0, tail, 0) || go(s.row, 0, 0, 0)) return { tap: true, dir: 0 };
    // 지금 줄에 곧 차가 오면 어떻게든 뛴다
    return { tap: !safe(s.row, 0, 6, 0), dir: 0 };
  },
};
