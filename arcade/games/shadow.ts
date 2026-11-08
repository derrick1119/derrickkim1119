/**
 * 그림자 도둑 (0031, 15라운드 · 오너가 고른 메뉴 2번) — 잠입 × 낮과 밤 · 가리키기.
 * 와우: 도둑을 움직이는 게 아니라 **해를 움직인다** — 손가락이 해, 끌면 도시의 모든 그림자가 실시간으로 돌고, 도둑은 그림자 속으로만 걷는다.
 * 첫 3초: 해를 쓱 끌자 건물 그림자가 빙 돌며 길을 덮고, 도둑이 그 그림자를 타고 뛰어간다.
 * 목표·보상: 판마다 금고까지(빨리 갈수록 별), 길 위 보석은 덤. 3번 들키면 끝.
 * 하는 일이 바뀐다: 경비(햇빛 속 도둑을 봄) → 보석 → 지나가는 차(움직이는 그림자) → 흘러가는 구름 → 개(그림자 속이어도 가까우면 냄새로 앎) → 한낮(그림자가 짧아짐).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.35, SPEED = 0.0022, CX = 0.5, CY = A / 2, TIME = 60 * 40;
interface Box { x0: number; y0: number; x1: number; y1: number; h: number; hue: number }
interface Guard { x0: number; y0: number; x1: number; y1: number; u: number; v: number; dog: boolean }
interface Car { y: number; x: number; v: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string }
export interface ShadowState {
  rng: Rng; t: number; k: number; seed: number; phase: 'play' | 'clear' | 'caught' | 'late'; phaseT: number; start: number;
  sun: number; len: number; boxes: Box[]; route: { x: number; y: number }[]; dist: number; total: number; guards: Guard[]; cars: Car[]; clouds: number;
  gems: { d: number; got: boolean }[]; alert: number; lives: number; stars: number; lastStars: number; loot: number; exposed: number; seen: Set<string>; events: Ev[]; dead: boolean;
}

const ev = (s: ShadowState, kind: string, x: number, y: number, text?: string) => s.events.push({ t: s.t, kind, x, y, text });
function see(s: ShadowState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  ev(s, 'new', 0.5, A * 0.5, text);
}
/** 길 위 거리 d의 자리 */
export function along(route: { x: number; y: number }[], d: number) {
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i], l = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= l) return { x: a.x + ((b.x - a.x) * d) / l, y: a.y + ((b.y - a.y) * d) / l, dir: Math.atan2(b.y - a.y, b.x - a.x) };
    d -= l;
  }
  const z = route.at(-1)!;
  return { x: z.x, y: z.y, dir: 0 };
}
/** 선분 p→q가 상자와 겹치나 (슬랩 방식) */
function segBox(px: number, py: number, qx: number, qy: number, b: { x0: number; y0: number; x1: number; y1: number }) {
  let t0 = 0, t1 = 1;
  const dx = qx - px, dy = qy - py;
  for (const [p, d, lo, hi] of [[px, dx, b.x0, b.x1], [py, dy, b.y0, b.y1]]) {
    if (Math.abs(d) < 1e-12) { if (p < lo || p > hi) return false; continue; }
    let a = (lo - p) / d, c = (hi - p) / d;
    if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, c);
    if (t0 > t1) return false;
  }
  return true;
}
const shadowVec = (s: Pick<ShadowState, 'sun' | 'len'>, h: number) => ({ x: -Math.cos(s.sun) * h * s.len, y: -Math.sin(s.sun) * h * s.len });
const carBox = (c: Car, t: number) => { const x = (((c.x + c.v * t) % 1.4) + 1.4) % 1.4 - 0.2; return { x0: x - 0.05, y0: c.y - 0.022, x1: x + 0.05, y1: c.y + 0.022, h: 0.05, hue: 0 }; };
const cloudAt = (s: ShadowState, t: number) => ({ x: ((t * 0.0006 + s.clouds) % 1.6) - 0.3, y: 0.3 + 0.5 * ((s.clouds * 7) % 1) * A });
/** 이 자리가 그림자 속인가 (건물·차·구름) */
export function shaded(s: ShadowState, x: number, y: number, t = s.t) {
  for (const b of s.boxes) { const v = shadowVec(s, b.h); if (segBox(x, y, x - v.x, y - v.y, b)) return true; }
  for (const c of s.cars) { const b = carBox(c, t), v = shadowVec(s, b.h); if (segBox(x, y, x - v.x, y - v.y, b)) return true; }
  if (s.clouds) { const c = cloudAt(s, t); if (Math.hypot(x - c.x, y - c.y) < 0.12) return true; }
  return false;
}
export const guardPos = (g: Guard, t: number) => { const u = (Math.sin(t * g.v + g.u) + 1) / 2, c = Math.cos(t * g.v + g.u); return { x: g.x0 + (g.x1 - g.x0) * u, y: g.y0 + (g.y1 - g.y0) * u, dir: Math.atan2((g.y1 - g.y0) * c, (g.x1 - g.x0) * c) }; };
/** 경비가 이 자리를 보나: 바라보는 쪽 ±35°, 0.24 안 (건물이 가리면 못 봄). 개는 0.07 안이면 그림자여도 냄새로 */
export function spotted(s: ShadowState, x: number, y: number, inShade: boolean, t = s.t) {
  for (const g of s.guards) {
    const p = guardPos(g, t), d = Math.hypot(x - p.x, y - p.y);
    if (g.dog && d < 0.07) return true;
    if (inShade || d > 0.21) continue;
    const da = Math.abs(((Math.atan2(y - p.y, x - p.x) - p.dir + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    if (da < 0.6 && !s.boxes.some((b) => segBox(p.x, p.y, x, y, b))) return true;
  }
  return false;
}

function build(s: ShadowState) {
  const r = mulberry32(s.seed * 7919 + s.k * 104729), k = s.k;
  // 길: 왼쪽 아래 → 오른쪽 위로 꺾이며 가는 골목 (ㄱ·ㄴ자 조각)
  const route = [{ x: 0.08, y: A - 0.1 }];
  let x = 0.08, y = A - 0.1;
  const turns = 3 + Math.min(3, Math.floor(k / 2));
  for (let i = 0; i < turns; i++) {
    if (i % 2 === 0) x = i === turns - 1 ? 0.9 : Math.min(0.9, x + 0.2 + r() * 0.3);
    else y = Math.max(0.16, y - (A - 0.26) / Math.ceil(turns / 2) * (0.8 + r() * 0.3));
    route.push({ x, y });
  }
  route.push({ x: 0.9, y: 0.14 });
  const total = route.reduce((a, p, i) => (i ? a + Math.hypot(p.x - route[i - 1].x, p.y - route[i - 1].y) : 0), 0);
  // 건물: 길을 따라 양옆에 번갈아 (해를 돌리면 차례로 길을 덮도록) + 빈 땅에 몇 채
  const boxes: Box[] = [];
  const tryAdd = (b: Box) => {
    const pad = { x0: b.x0 - 0.03, y0: b.y0 - 0.03, x1: b.x1 + 0.03, y1: b.y1 + 0.03 };
    if (b.x0 < 0.02 || b.x1 > 0.98 || b.y0 < 0.11 || b.y1 > A - 0.02) return;
    if (route.some((p, i) => i > 0 && segBox(route[i - 1].x, route[i - 1].y, p.x, p.y, pad)) || boxes.some((o) => !(b.x1 + 0.015 < o.x0 || b.x0 - 0.015 > o.x1 || b.y1 + 0.015 < o.y0 || b.y0 - 0.015 > o.y1))) return;
    boxes.push(b);
  };
  const gapK = Math.max(0.1, 0.13 + 0.006 * k); // 판이 갈수록 건물 사이가 벌어진다
  for (let d = 0.04, side = 1; d < total - 0.05; d += gapK + r() * 0.05, side = -side) {
    const p = along(route, d), nx = -Math.sin(p.dir) * side, ny = Math.cos(p.dir) * side, bw = 0.06 + r() * 0.05, bh = 0.06 + r() * 0.05;
    const cx = p.x + nx * (0.045 + bw / 2), cy = p.y + ny * (0.045 + bh / 2);
    tryAdd({ x0: cx - bw / 2, y0: cy - bh / 2, x1: cx + bw / 2, y1: cy + bh / 2, h: 0.06 + r() * 0.05, hue: Math.floor(r() * 360) });
  }
  for (let tries = 0; tries < 40; tries++) {
    const bw = 0.06 + r() * 0.1, bh = 0.06 + r() * 0.1, x0 = 0.03 + r() * (0.94 - bw), y0 = 0.12 + r() * (A - 0.2 - bh);
    tryAdd({ x0, y0, x1: x0 + bw, y1: y0 + bh, h: 0.05 + r() * 0.06, hue: Math.floor(r() * 360) });
  }
  s.boxes = boxes;
  s.route = route;
  s.total = total;
  s.dist = 0;
  s.len = k >= 5 ? 1.7 : 2.6; // 한낮엔 그림자가 짧다
  s.guards = [];
  if (k >= 1) for (let i = 0; i < Math.min(3, 1 + Math.floor(k / 3)); i++) {
    const p = along(route, total * (0.35 + 0.25 * i + r() * 0.1)), a = r() * Math.PI;
    s.guards.push({ x0: p.x + Math.cos(a) * 0.12, y0: p.y + Math.sin(a) * 0.12 + 0.02, x1: p.x - Math.cos(a) * 0.12, y1: p.y - Math.sin(a) * 0.12 + 0.02, u: r() * 6, v: 0.012 + r() * 0.01, dog: k >= 4 && i === 0 });
  }
  s.gems = k >= 1 ? [0.3, 0.55, 0.8].map((f) => ({ d: total * (f + (r() - 0.5) * 0.08), got: false })) : [];
  s.cars = k >= 2 ? [{ y: along(route, total * 0.5).y + 0.06, x: r(), v: (0.0012 + r() * 0.001) * (r() < 0.5 ? 1 : -1) }] : [];
  s.clouds = k >= 3 ? 0.1 + r() : 0;
  s.sun = -Math.PI * 0.75;
  s.phase = 'play';
  s.phaseT = 0;
  s.start = s.t;
  s.exposed = 0;
  s.alert = 0;
  if (s.guards.length) see(s, 'guard', '경비가 햇빛 속 도둑을 봐요 — 그림자로 숨기세요');
  if (s.gems.length) see(s, 'gem', '길 위 보석은 덤! 지나가면 주워요');
  if (s.cars.length) see(s, 'car', '지나가는 차도 그림자를 드리워요');
  if (s.clouds) see(s, 'cloud', '구름 그림자가 흘러가요');
  if (s.guards.some((g) => g.dog)) see(s, 'dog', '개는 그림자 속이어도 가까우면 냄새로 알아요!');
  if (k >= 5) see(s, 'noon', '한낮 — 그림자가 짧아졌어요');
}

export const shadow: GameDef<ShadowState> = {
  id: 'shadow',
  name: '그림자 도둑',
  genes: ['dodge', 'daynight', 'pointer'],
  twist: '도둑이 아니라 해를 움직인다 — 끌면 도시의 모든 그림자가 돌고, 도둑은 그림자를 타고 달린다',
  rules: ['손가락이 해예요. 끌면 모든 그림자가 돌아요 (키보드: 화살표 + 스페이스).', '도둑은 그림자 속에선 빨리, 햇빛 속에선 느릿느릿 걸어요. 그림자로 길을 덮어 금고까지!', '햇빛 속에서 경비 눈에 0.5초 띄면 들켜서 하트 -1. 빨리 갈수록 별이 많아요.'],
  controls: 'touch',
  hint: '끌어서 해 옮기기 / 화살표 + 스페이스',
  aspect: A,
  art: {
    concept: '오후 햇살의 장난감 도시',
    mood: '위에서 본 따뜻한 오후의 골목. 손끝의 해를 돌리면 길쭉한 남색 그림자들이 시계바늘처럼 휙 돌고, 검은 복면 도둑이 그 그림자를 타고 살금살금 달린다.',
    palette: { bg: '#f1d9a8', ink: '#2a2035', muted: '#9c8566', accent: '#ffb23d', hot: '#ff4d5e', soft: '#e7c98f' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = { rng: mulberry32(seed), t: 0, k: 0, seed, lives: 3, stars: 0, lastStars: 0, loot: 0, seen: new Set<string>(), events: [], dead: false } as unknown as ShadowState;
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
        else if (s.lives <= 0) return void (s.dead = true);
        build(s);
      }
      return;
    }
    // 해: 손가락 쪽으로 (놓으면 하루가 흐르듯 천천히 돈다)
    if (inp.pointer) {
      const want = Math.atan2(inp.pointer.y * A - CY, inp.pointer.x - CX), da = ((want - s.sun + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
      s.sun += Math.max(-0.12, Math.min(0.12, da));
    } else s.sun += 0.0025;
    // 도둑: 그림자 속에선 빨리, 햇빛 속에선 느릿느릿 (멈추지는 않는다 — 대신 경비 눈에 띈다)
    const here = along(s.route, s.dist), next = along(s.route, s.dist + SPEED * 6);
    const inShade = shaded(s, here.x, here.y);
    s.dist = Math.min(s.total, s.dist + (shaded(s, next.x, next.y) ? SPEED : SPEED * 0.2));
    s.exposed = inShade ? 0 : s.exposed + 1;
    for (const g of s.gems) if (!g.got && s.dist >= g.d) (g.got = true), s.loot++, ev(s, 'gem', here.x, here.y, '보석 +1');
    s.alert = s.dist > 0.03 && spotted(s, here.x, here.y, inShade) ? s.alert + 1 : Math.max(0, s.alert - 2);
    if (s.alert === 1) ev(s, 'alert', here.x, here.y, '!');
    if (s.alert >= 30) {
      s.phase = 'caught';
      s.phaseT = 0;
      s.lives--;
      ev(s, 'caught', here.x, here.y, '들켰다! 하트 -1');
      return;
    }
    if (s.dist >= s.total - 1e-6) {
      const left = 1 - (s.t - s.start) / TIME, stars = left > 0.55 ? 3 : left > 0.3 ? 2 : 1;
      s.phase = 'clear';
      s.phaseT = 0;
      s.stars += stars;
      s.lastStars = stars;
      s.loot += 3;
      ev(s, 'clear', 0.9, 0.14, `${s.k + 1}판 금고 털기 성공!`);
    } else if (s.t - s.start >= TIME) {
      s.phase = 'late';
      s.phaseT = 0;
      s.lives--;
      ev(s, 'late', here.x, here.y, '날이 저물었어요 — 하트 -1');
    }
  },
  over: (s) => s.dead,
  score: (s) => s.loot * 10 + s.stars * 5,
  draw(ctx, s, w, h, th: Theme) {
    const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
    ctx.save();
    fx.begin(ctx);
    // 오후의 땅: 따뜻한 모래색 + 잔디 조각
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#f6e2b5');
    g.addColorStop(1, '#e9c88c');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -10, w + 20, h + 20);
    ctx.fillStyle = 'rgba(120,170,90,.35)';
    for (let k = 0; k < 18; k++) (ctx.beginPath(), ctx.ellipse(X(((k * 0.37) % 1)), Y(((k * 0.61) % 1) * A), R(0.04), R(0.025), k, 0, Math.PI * 2), ctx.fill());
    // 골목 (도둑의 길)
    ctx.strokeStyle = '#d4b27a';
    ctx.lineWidth = R(0.07);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    s.route.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
    // 그림자 (건물·차·구름) — 해 반대쪽으로 길게
    ctx.fillStyle = 'rgba(40,40,110,.38)';
    const shade = (b: { x0: number; y0: number; x1: number; y1: number; h: number }) => {
      const v = shadowVec(s, b.h), pts = [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]], all = [...pts, ...pts.map(([x, y]) => [x + v.x, y + v.y])];
      // 볼록 껍질
      const hull = all.sort((p, q) => p[0] - q[0] || p[1] - q[1]), cr = (o: number[], a: number[], b2: number[]) => (a[0] - o[0]) * (b2[1] - o[1]) - (a[1] - o[1]) * (b2[0] - o[0]);
      const lo: number[][] = [], up: number[][] = [];
      for (const p of hull) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
      for (const p of [...hull].reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
      const poly = [...lo.slice(0, -1), ...up.slice(0, -1)];
      ctx.beginPath();
      poly.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
      ctx.closePath();
      ctx.fill();
    };
    for (const b of s.boxes) shade(b);
    for (const c of s.cars) shade(carBox(c, s.t));
    if (s.clouds) {
      const c = cloudAt(s, s.t);
      ctx.beginPath();
      ctx.arc(X(c.x), Y(c.y), R(0.12), 0, Math.PI * 2);
      ctx.fill();
    }
    // 건물: 지붕 + 옆면
    for (const b of s.boxes) {
      const v = shadowVec(s, 0.012);
      ctx.fillStyle = `hsl(${b.hue},35%,55%)`;
      ctx.fillRect(X(b.x0 - v.x), Y(b.y0 - v.y), R(b.x1 - b.x0), R(b.y1 - b.y0));
      ctx.fillStyle = `hsl(${b.hue},55%,72%)`;
      ctx.fillRect(X(b.x0), Y(b.y0), R(b.x1 - b.x0), R(b.y1 - b.y0));
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.fillRect(X(b.x0) + 3, Y(b.y0) + 3, R(b.x1 - b.x0) - 6, 3);
    }
    for (const c of s.cars) {
      const b = carBox(c, s.t);
      ctx.fillStyle = '#e8574d';
      ctx.beginPath();
      ctx.roundRect(X(b.x0), Y(b.y0), R(b.x1 - b.x0), R(b.y1 - b.y0), 6);
      ctx.fill();
      ctx.fillStyle = '#bfe6ff';
      ctx.fillRect(X(b.x0 + 0.03), Y(b.y0) + 3, R(0.04), R(0.044) - 6);
    }
    // 금고와 보석
    const goal = s.route.at(-1)!;
    ctx.fillStyle = '#ffd23f';
    ctx.shadowColor = '#ffd23f';
    ctx.shadowBlur = 14;
    ctx.fillRect(X(goal.x) - R(0.03), Y(goal.y) - R(0.03), R(0.06), R(0.06));
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#7a5a10';
    ctx.font = `900 ${R(0.04)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', X(goal.x), Y(goal.y));
    for (const gm of s.gems) {
      if (gm.got) continue;
      const p = along(s.route, gm.d);
      ctx.fillStyle = '#5ff2ff';
      ctx.beginPath();
      ctx.moveTo(X(p.x), Y(p.y) - R(0.016));
      ctx.lineTo(X(p.x) + R(0.012), Y(p.y));
      ctx.lineTo(X(p.x), Y(p.y) + R(0.016));
      ctx.lineTo(X(p.x) - R(0.012), Y(p.y));
      ctx.fill();
      if (s.t % 20 === 0) fx.burst(X(p.x), Y(p.y), '#ffffff', 2, 1, 1.5);
    }
    // 경비 (손전등 부채꼴)와 개
    for (const gd of s.guards) {
      const p = guardPos(gd, s.t);
      if (!gd.dog) {
        ctx.fillStyle = 'rgba(255,240,140,.28)';
        ctx.beginPath();
        ctx.moveTo(X(p.x), Y(p.y));
        ctx.arc(X(p.x), Y(p.y), R(0.21), p.dir - 0.6, p.dir + 0.6);
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255,120,120,.4)';
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.arc(X(p.x), Y(p.y), R(0.07), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = gd.dog ? '#8a5a3a' : '#3b4a8a';
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), R(gd.dog ? 0.014 : 0.018), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(X(p.x) + Math.cos(p.dir) * R(0.01) - 1.5, Y(p.y) + Math.sin(p.dir) * R(0.01) - 1.5, 3, 3);
    }
    // 도둑: 그림자 속이면 남색, 햇빛 속이면 빨갛게 번쩍
    const me = along(s.route, s.dist), lit = !shaded(s, me.x, me.y), bounce = Math.abs(Math.sin(s.t / 4)) * (lit ? 0 : 2);
    if (lit) {
      ctx.fillStyle = `rgba(255,77,94,${0.25 + 0.2 * Math.sin(s.t / 3)})`;
      ctx.beginPath();
      ctx.arc(X(me.x), Y(me.y), R(0.035), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#1b1530';
    ctx.beginPath();
    ctx.arc(X(me.x), Y(me.y) - bounce, R(0.024), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(X(me.x) - R(0.012), Y(me.y) - R(0.006) - bounce, R(0.024), R(0.006));
    ctx.fillStyle = '#1b1530';
    ctx.fillRect(X(me.x) - R(0.006), Y(me.y) - R(0.006) - bounce, 2, R(0.006));
    ctx.fillRect(X(me.x) + R(0.004), Y(me.y) - R(0.006) - bounce, 2, R(0.006));
    if (s.alert > 0) {
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(X(me.x) - R(0.03), Y(me.y) - R(0.05), R(0.06), 5);
      ctx.fillStyle = th.hot;
      ctx.fillRect(X(me.x) - R(0.03), Y(me.y) - R(0.05), R(0.06) * Math.min(1, s.alert / 30), 5);
      ctx.font = `900 ${R(0.045)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('!', X(me.x), Y(me.y) - R(0.08));
    }
        // 해: 화면 가장자리, 손가락이 있는 쪽
    const sx = CX + Math.cos(s.sun) * 0.58, sy = CY + Math.sin(s.sun) * 0.58, px = Math.max(0.06, Math.min(0.94, sx)), py = Math.max(0.06, Math.min(A - 0.06, sy));
    const sun = ctx.createRadialGradient(X(px), Y(py), 0, X(px), Y(py), R(0.12));
    sun.addColorStop(0, 'rgba(255,240,150,.95)');
    sun.addColorStop(0.35, 'rgba(255,200,80,.6)');
    sun.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(X(px) - R(0.12), Y(py) - R(0.12), R(0.24), R(0.24));
    ctx.strokeStyle = 'rgba(255,190,60,.8)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + s.t * 0.01;
      ctx.beginPath();
      ctx.moveTo(X(px) + Math.cos(a) * R(0.045), Y(py) + Math.sin(a) * R(0.045));
      ctx.lineTo(X(px) + Math.cos(a) * R(0.065), Y(py) + Math.sin(a) * R(0.065));
      ctx.stroke();
    }
    const seenT = fx.memo.t ?? -1;
    for (const e of s.events) {
      if (e.t <= seenT) continue;
      if (e.kind === 'alert') fx.kick(3);
      if (e.kind === 'gem') fx.burst(X(e.x), Y(e.y), '#5ff2ff', 16, 3), fx.pop(X(e.x), Y(e.y) - 16, e.text!, '#2a6a90', 15);
      if (e.kind === 'caught' || e.kind === 'late') fx.kick(12), fx.blink(th.hot, 0.35), fx.ring(X(e.x), Y(e.y), th.hot, 90, 6), fx.pop(w / 2, h * 0.45, e.text!, th.hot, 18);
      if (e.kind === 'clear') {
        fx.blink('#fff6c8', 0.3);
        for (let k = 0; k < 6; k++) fx.burst(X(e.x), Y(e.y), `hsl(${40 + k * 10},95%,60%)`, 14, 5, 3.5);
        fx.ring(X(e.x), Y(e.y), '#ffd23f', 140, 6);
        fx.pop(w / 2, h * 0.42, e.text!, '#b8860b', 22);
      }
      if (e.kind === 'new') fx.pop(w / 2, h * 0.5, e.text!, '#5a3a8a', 15);
    }
    fx.memo.t = s.t;
    ctx.restore();
    // 머리말
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = th.ink;
    ctx.font = `900 ${R(0.045)}px system-ui, sans-serif`;
    ctx.fillText(`${s.k + 1}판 · 💰 ${s.loot} · ★ ${s.stars}`, 10, 10);
    ctx.textAlign = 'right';
    ctx.fillStyle = th.hot;
    ctx.fillText('♥'.repeat(Math.max(0, s.lives)), w - 10, 10);
    const left = Math.max(0, 1 - (s.t - s.start) / TIME);
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    ctx.fillRect(10, 14 + R(0.05), w - 20, 6);
    ctx.fillStyle = left < 0.3 ? th.hot : th.accent;
    ctx.fillRect(10, 14 + R(0.05), (w - 20) * left, 6);
    if (s.phase === 'clear') (ctx.textAlign = 'center'), (ctx.fillStyle = '#d99a00'), (ctx.font = `900 ${R(0.09)}px system-ui, sans-serif`), ctx.fillText('★'.repeat(s.lastStars) + '☆'.repeat(3 - s.lastStars), w / 2, h * 0.5);
    if (s.k === 0 && s.t - s.start < 300) (ctx.textAlign = 'center'), (ctx.fillStyle = th.ink), (ctx.font = `800 ${R(0.042)}px system-ui, sans-serif`), ctx.fillText('👆 화면을 끌어 해를 옮겨 보세요', w / 2, h * 0.58);
  },
};

const memo = new WeakMap<object, { x: number; y: number; on: boolean }>();
/** 봇: 아무 데나 끌거나 가만히 둔다 */
export const shadowRandom: Bot<ShadowState> = {
  name: '아무 데나',
  act(s, rng) {
    let m = memo.get(s);
    if (!m || s.t % 50 === 0) memo.set(s, (m = { x: rng(), y: rng(), on: rng() < 0.6 }));
    return { tap: false, dir: 0, pointer: m.on ? { x: m.x, y: m.y } : null };
  },
};

/** 봇: 해의 각도 24가지를 재 보고, 도둑의 다음 걸음들이 그림자에 들고 지금 자리가 들키지 않는 각도로 끈다 */
export const shadowSmart: Bot<ShadowState> = {
  name: '그림자 장인',
  act(s) {
    if (s.phase !== 'play') return { tap: false, dir: 0, pointer: null };
    let best = { a: s.sun, v: -1e9 };
    for (let i = 0; i < 24; i++) {
      const a = s.sun + ((i - 12) / 12) * Math.PI, test = { ...s, sun: a };
      let v = 0;
      for (let k = 0; k <= 8; k++) {
        const p = along(s.route, s.dist + k * SPEED * 10);
        if (shaded(test, p.x, p.y, s.t + k * 10)) v += 9 - k;
        else break;
      }
      const here = along(s.route, s.dist);
      if (spotted(test, here.x, here.y, shaded(test, here.x, here.y, s.t + 6), s.t + 6)) v -= 100;
      v -= Math.abs(((a - s.sun + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) * 0.5; // 너무 크게 돌리지 않기
      if (v > best.v) best = { a, v };
    }
    return { tap: false, dir: 0, pointer: { x: Math.max(0, Math.min(1, CX + Math.cos(best.a) * 0.45)), y: Math.max(0, Math.min(1, (CY + Math.sin(best.a) * 0.45) / A)) } };
  },
};
