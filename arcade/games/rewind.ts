/**
 * 되감기 골프 (0035, 메뉴 1번) — 미니 골프 × 되감기 · 꾹 눌렀다 떼기.
 * 기준 9(조작 최소): 조준 화살표는 저절로 좌우로 흔들린다. 원하는 방향일 때 꾹 누르면 방향이 멈추고, 누른 만큼 힘이 차고, 떼면 친다.
 * 와우: 공이 멈추면 지나온 길을 거꾸로 되감아 티로 돌아온다 — 그런데 세상은 되감기지 않는다.
 *       그 사이 움직인 핀이 돌아오는 길에 걸리면 한 번 더 '탁!'(×2). 한 샷이 왕복 두 번.
 * 첫 3초: 1홀은 곧장 치면 핀 하나가 쓰러지고, 되감기는 동안 미끄러져 온 핀까지 쓰러진다.
 * 목표·보상: 홀마다 핀을 다 쓰러뜨리기 — 파 이하면 별 셋. 되감기로 맞힌 핀은 점수 두 배.
 * 하는 일이 바뀐다: 움직이는 핀(2홀, 돌아올 때를 노림) → 범퍼(3홀, 튕겨 꺾기) → 유령 핀(4홀, 되감기 때만 맞음)
 *                  → 모래(5홀, 느려짐) → 물(6홀, 빠지면 바로 되감기) → 스위치(7홀, 갈 때 누르면 숨은 핀이 솟아 올 때 맞힘).
 * 16라운드 오너 이유(와우 약함 · 너무 어려움 · 밋밋함) → 실패해도 다시 치면 되는 넉넉한 샷 수, 되감기 연출(VHS 줄무늬·잔상).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.35, BALL = 0.018, PIN = 0.03, TEE = { x: 0.5, y: A - 0.11 }, STOP = 0.0007, MAXROLL = 700;
interface Pin { x: number; y: number; ax: number; ay: number; w: number; ph: number; ghost: boolean; hidden: boolean; down: boolean }
interface Box { x: number; y: number; w: number; h: number }
interface Bump { x: number; y: number; r: number; hit: number }
export interface Course { blocks: Box[]; bumps: Bump[]; sand: Box[]; water: Box[]; sw: { x: number; y: number; on: boolean } | null }
interface Ev { t: number; kind: string; x: number; y: number; text?: string }
type Phase = 'aim' | 'power' | 'roll' | 'rewind' | 'pause';
export interface GolfState {
  rng: Rng; t: number; hole: number; phase: Phase; angle: number; hold: number; was: boolean; aimT: number;
  course: Course; pins: Pin[]; ball: { x: number; y: number; vx: number; vy: number }; path: { x: number; y: number }[]; ri: number;
  shots: number; par: number; max: number; hearts: number; stars: number; hits: number; back: number; pause: number; clearedHole: boolean;
  seen: Set<string>; events: Ev[]; dead: boolean;
}

const ev = (s: GolfState, kind: string, x: number, y: number, text?: string) => s.events.push({ t: s.t, kind, x, y, text });
function see(s: GolfState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  ev(s, 'new', 0.5, A * 0.5, text);
}
export const pinAt = (p: Pin, t: number) => ({ x: p.x + p.ax * Math.sin(p.w * t + p.ph), y: p.y + p.ay * Math.sin(p.w * t + p.ph) });
const inBox = (b: Box, x: number, y: number, pad = 0) => x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad;
/** 조준 화살표: 위쪽을 중심으로 ±75° 흔들림 (주기 약 5초) */
export const aimAt = (t: number) => -Math.PI / 2 + 1.3 * Math.sin(t * 0.021);
/** 누른 시간 → 힘 (1초에 가득, 그 뒤엔 다시 줄었다 늘었다) */
export const powerOf = (hold: number) => (1 - Math.cos(hold * 0.06)) / 2;

/** 공 한 틱 (봇이 내다볼 때도 같은 함수). 물에 빠지면 true */
export function roll(c: Course, b: { x: number; y: number; vx: number; vy: number }): boolean {
  for (let sub = 0; sub < 2; sub++) {
    b.x += b.vx / 2;
    b.y += b.vy / 2;
    if (b.x < BALL) (b.x = BALL), (b.vx = Math.abs(b.vx) * 0.85);
    if (b.x > 1 - BALL) (b.x = 1 - BALL), (b.vx = -Math.abs(b.vx) * 0.85);
    if (b.y < BALL) (b.y = BALL), (b.vy = Math.abs(b.vy) * 0.85);
    if (b.y > A - BALL) (b.y = A - BALL), (b.vy = -Math.abs(b.vy) * 0.85);
    for (const k of c.blocks) {
      const cx = Math.max(k.x, Math.min(k.x + k.w, b.x)), cy = Math.max(k.y, Math.min(k.y + k.h, b.y)), dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy);
      if (d < BALL && d > 1e-9) {
        const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny;
        (b.x = cx + nx * BALL), (b.y = cy + ny * BALL);
        if (vn < 0) (b.vx -= 1.8 * vn * nx), (b.vy -= 1.8 * vn * ny);
      }
    }
    for (const u of c.bumps) {
      const dx = b.x - u.x, dy = b.y - u.y, d = Math.hypot(dx, dy) || 1e-9;
      if (d < u.r + BALL) {
        const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny;
        (b.x = u.x + nx * (u.r + BALL)), (b.y = u.y + ny * (u.r + BALL));
        if (vn < 0) (b.vx -= 2.15 * vn * nx), (b.vy -= 2.15 * vn * ny), (u.hit = 12);
        const v = Math.hypot(b.vx, b.vy);
        if (v > 0.04) (b.vx *= 0.04 / v), (b.vy *= 0.04 / v);
      }
    }
  }
  const f = c.sand.some((k) => inBox(k, b.x, b.y)) ? 0.9 : 0.972;
  b.vx *= f;
  b.vy *= f;
  return c.water.some((k) => inBox(k, b.x, b.y));
}

/** (x,y) 자리에서 t틱에 맞는 핀을 쓰러뜨린다. back = 되감기 중 */
export function knock(pins: Pin[], c: Course, x: number, y: number, t: number, back: boolean, onHit?: (p: Pin, at: { x: number; y: number }) => void) {
  let n = 0;
  for (const p of pins) {
    if (p.down || p.hidden || (p.ghost && !back)) continue;
    const q = pinAt(p, t);
    if (Math.hypot(q.x - x, q.y - y) < PIN + BALL) (p.down = true), n++, onHit?.(p, q);
  }
  if (c.sw && !c.sw.on && !back && Math.hypot(c.sw.x - x, c.sw.y - y) < 0.035) {
    c.sw.on = true;
    for (const p of pins) p.hidden = false;
  }
  return n;
}

function newHole(s: GolfState) {
  const k = s.hole, r = s.rng, c: Course = { blocks: [], bumps: [], sand: [], water: [], sw: null };
  s.pins = [];
  const free = (x: number, y: number) =>
    !c.blocks.some((b) => inBox(b, x, y, 0.05)) && !c.bumps.some((u) => Math.hypot(u.x - x, u.y - y) < u.r + 0.06) && !c.water.some((b) => inBox(b, x, y, 0.04)) && !s.pins.some((p) => Math.hypot(p.x - x, p.y - y) < 0.09) && Math.hypot(x - TEE.x, y - TEE.y) > 0.25;
  const place = (ghost = false, hidden = false, moving = false) => {
    for (let i = 0; i < 60; i++) {
      const x = 0.1 + r() * 0.8, y = 0.12 + r() * (A * 0.62);
      if (!free(x, y)) continue;
      const ax = moving ? 0.12 + r() * 0.12 : 0;
      s.pins.push({ x: moving ? Math.max(0.1 + ax, Math.min(0.9 - ax, x)) : x, y, ax, ay: 0, w: 0.012 + r() * 0.01, ph: r() * 6.28, ghost, hidden, down: false });
      return;
    }
  };
  if (k === 0) {
    // 1홀: 곧장 치면 하나, 되감기는 동안 미끄러져 온 핀까지 (첫 3초 와우)
    s.pins.push({ x: 0.5, y: A * 0.35, ax: 0, ay: 0, w: 0, ph: 0, ghost: false, hidden: false, down: false });
    s.pins.push({ x: 0.5, y: A * 0.55, ax: 0.3, ay: 0, w: 0.014, ph: 0, ghost: false, hidden: false, down: false });
    place();
  } else {
    if (k >= 1) for (let i = 0; i < 1 + Math.min(2, Math.floor(k / 3)); i++) c.blocks.push({ x: 0.15 + r() * 0.55, y: A * (0.25 + r() * 0.35), w: 0.12 + r() * 0.15, h: 0.03 });
    if (k >= 2) for (let i = 0; i < 2; i++) c.bumps.push({ x: 0.2 + r() * 0.6, y: A * (0.15 + r() * 0.45), r: 0.04, hit: 0 });
    if (k >= 4) c.sand.push({ x: 0.1 + r() * 0.5, y: A * (0.2 + r() * 0.4), w: 0.25, h: 0.12 });
    if (k >= 5) c.water.push({ x: 0.05 + r() * 0.6, y: A * (0.12 + r() * 0.3), w: 0.28, h: 0.08 });
    const n = 2 + Math.min(5, Math.floor(k / 1.3));
    for (let i = 0; i < n; i++) place(false, false, i < Math.min(2, Math.ceil(k / 2)));
    if (k >= 3) place(true);
    if (k >= 6) {
      for (let i = 0; i < 60; i++) {
        const x = 0.15 + r() * 0.7, y = A * (0.2 + r() * 0.4);
        if (free(x, y)) { c.sw = { x, y, on: false }; break; }
      }
      if (c.sw) (place(false, true), place(false, true));
    }
  }
  s.course = c;
  s.par = Math.max(1, Math.ceil(s.pins.length / 2));
  s.max = s.par + (k < 2 ? 3 : k < 4 ? 2 : 1);
  s.shots = 0;
  s.clearedHole = false;
  s.phase = 'aim';
  s.aimT = s.t;
  s.ball = { x: TEE.x, y: TEE.y, vx: 0, vy: 0 };
  ev(s, 'hole', 0.5, A * 0.42, `${k + 1}홀 — 핀 ${s.pins.length}개 · 파 ${s.par}`);
  if (s.pins.some((p) => p.ax)) see(s, 'mover', '움직이는 핀 — 돌아오는 길에 걸리게!');
  if (c.bumps.length) see(s, 'bump', '범퍼 — 세게 튕겨 꺾여요');
  if (s.pins.some((p) => p.ghost)) see(s, 'ghost', '유령 핀 — 되감기 때만 맞아요');
  if (c.sand.length) see(s, 'sand', '모래 — 공이 느려져요');
  if (c.water.length) see(s, 'water', '물 — 빠지면 바로 되감겨요');
  if (c.sw) see(s, 'switch', '스위치 — 갈 때 누르면 숨은 핀이 솟아요');
}

export const rewind: GameDef<GolfState> = {
  id: 'rewind',
  name: '되감기 골프',
  genes: ['golf', 'rewind', 'hold'],
  twist: '공이 멈추면 지나온 길을 거꾸로 되감아 돌아온다 — 세상은 그대로 흘러서, 그 사이 움직인 핀이 돌아오는 길에 걸리면 한 번 더 맞는다',
  rules: ['화살표가 원하는 쪽을 볼 때 꾹 누르고, 누른 만큼 힘이 차면 떼서 쳐요 (스페이스도 돼요).', '공은 멈추면 지나온 길을 되감아 돌아와요. 돌아오며 맞힌 핀은 점수 두 배!', '홀마다 핀을 다 쓰러뜨리면 통과 — 파 이하면 별 셋.'],
  controls: 'hold',
  hint: '꾹 누르면 방향 고정·힘 모으기, 떼면 샷 / 스페이스',
  aspect: A,
  art: {
    concept: '한밤의 네온 미니 골프장',
    mood: '네온 테두리가 빛나는 밤의 미니 골프장. 잔디 결이 반짝이고, 되감기 때는 비디오테이프처럼 화면에 줄무늬가 흐르며 공이 시안빛 꼬리를 끌고 돌아온다.',
    palette: { bg: '#0e1a2b', ink: '#f2fbff', muted: '#4d6b86', accent: '#3cf2ff', hot: '#ff4fa3', soft: '#12324a' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = { rng: mulberry32(seed), t: 0, hole: 0, phase: 'aim', angle: -Math.PI / 2, hold: 0, was: false, aimT: 0, pins: [], path: [], ri: 0, shots: 0, par: 1, max: 4, hearts: 3, stars: 0, hits: 0, back: 0, pause: 0, clearedHole: false, seen: new Set<string>(), events: [], dead: false } as unknown as GolfState;
    newHole(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.events = s.events.filter((e) => s.t - e.t < 90);
    for (const u of s.course.bumps) if (u.hit > 0) u.hit--;
    const down = !!inp.hold, press = down && !s.was;
    s.was = down;
    if (s.phase === 'pause') {
      if (--s.pause <= 0) s.clearedHole ? (s.hole++, newHole(s)) : newHole(s);
      return;
    }
    if (s.phase === 'aim') {
      s.angle = aimAt(s.t - s.aimT);
      if (press) (s.phase = 'power'), (s.hold = 0);
      return;
    }
    if (s.phase === 'power') {
      s.hold++;
      if (!down) {
        const p = powerOf(s.hold), v = 0.006 + 0.034 * p;
        s.ball = { x: TEE.x, y: TEE.y, vx: Math.cos(s.angle) * v, vy: Math.sin(s.angle) * v };
        s.path = [{ x: TEE.x, y: TEE.y }];
        s.shots++;
        s.phase = 'roll';
        ev(s, 'shot', TEE.x, TEE.y);
      }
      return;
    }
    const onHit = (back: boolean) => (p: Pin, q: { x: number; y: number }) => {
      s.hits++;
      if (back) s.back++;
      ev(s, back ? 'hitback' : 'hit', q.x, q.y, back ? '되감기 ×2!' : '탁!');
      if (back) see(s, 'back', '되감기로 맞혔어요 — 두 배!');
      if (p.ghost) see(s, 'ghost', '유령 핀 — 되감기 때만 맞아요');
    };
    if (s.phase === 'roll') {
      const swWas = s.course.sw?.on;
      const wet = roll(s.course, s.ball);
      s.path.push({ x: s.ball.x, y: s.ball.y });
      knock(s.pins, s.course, s.ball.x, s.ball.y, s.t, false, onHit(false));
      if (s.course.sw?.on && !swWas) ev(s, 'switch', s.course.sw.x, s.course.sw.y, '숨은 핀이 솟아요!');
      if (wet) ev(s, 'splash', s.ball.x, s.ball.y, '풍덩!');
      if (wet || Math.hypot(s.ball.vx, s.ball.vy) < STOP || s.path.length > MAXROLL) (s.phase = 'rewind'), (s.ri = s.path.length - 1), ev(s, 'rw', s.ball.x, s.ball.y);
      return;
    }
    // 되감기: 길을 세 칸씩 거꾸로 — 세상(움직이는 핀)은 그대로 흐른다
    for (let k = 0; k < 3 && s.ri > 0; k++) {
      s.ri--;
      knock(s.pins, s.course, s.path[s.ri].x, s.path[s.ri].y, s.t, true, onHit(true));
    }
    s.ball.x = s.path[s.ri].x;
    s.ball.y = s.path[s.ri].y;
    if (s.ri > 0) return;
    if (s.pins.every((p) => p.down)) {
      const st = s.shots <= s.par ? 3 : s.shots <= s.par + 1 ? 2 : 1;
      s.stars += st;
      s.clearedHole = true;
      ev(s, 'clear', 0.5, A * 0.35, `${s.hole + 1}홀 통과! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`);
      (s.phase = 'pause'), (s.pause = 90);
    } else if (s.shots >= s.max) {
      s.hearts--;
      ev(s, 'fail', 0.5, A * 0.45, '샷을 다 썼어요! 하트 -1 · 다시');
      if (s.hearts <= 0) s.dead = true;
      else (s.phase = 'pause'), (s.pause = 90);
    } else (s.phase = 'aim'), (s.aimT = s.t);
  },
  over: (s) => s.dead,
  score: (s) => s.hits + s.back + s.stars * 5 + s.hole * 10,
  draw(ctx, s, w, h, th: Theme) {
    const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, c = s.course;
    const rw = s.phase === 'rewind';
    ctx.save();
    fx.begin(ctx);
    ctx.fillStyle = '#0a1422';
    ctx.fillRect(-10, -10, w + 20, h + 20);
    // 잔디: 깎은 결 줄무늬 + 네온 테두리
    for (let k = -2; k < 14; k++) {
      ctx.fillStyle = k % 2 ? '#1f7a4a' : '#23864f';
      ctx.beginPath();
      ctx.moveTo(k * w * 0.16, 0);
      ctx.lineTo(k * w * 0.16 + w * 0.16, 0);
      ctx.lineTo(k * w * 0.16 + w * 0.16 - h * 0.35, h);
      ctx.lineTo(k * w * 0.16 - h * 0.35, h);
      ctx.fill();
    }
    const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, h * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,10,25,.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    // 네 모서리 가로등 불빛 + 반짝이는 이슬
    for (const [lx, ly, col] of [[0, 0, '255,210,120'], [w, 0, '120,220,255'], [0, h, '255,120,200'], [w, h, '255,210,120']] as [number, number, string][]) {
      const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, w * 0.55);
      lg.addColorStop(0, `rgba(${col},.22)`);
      lg.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, w, h);
    }
    for (let k = 0; k < 26; k++) {
      const a = 0.25 + 0.55 * Math.abs(Math.sin(s.t / 40 + k * 1.7));
      ctx.fillStyle = `rgba(220,255,240,${a * 0.5})`;
      ctx.fillRect(((k * 7919) % 997) / 997 * w, ((k * 104729) % 991) / 991 * h, 2, 2);
    }
    ctx.strokeStyle = th.accent;
    ctx.shadowColor = th.accent;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.shadowBlur = 0;
    for (const k of c.sand) {
      ctx.fillStyle = '#e9d39b';
      ctx.beginPath();
      ctx.roundRect(X(k.x), Y(k.y), R(k.w), R(k.h), R(0.04));
      ctx.fill();
      ctx.fillStyle = 'rgba(160,120,60,.35)';
      for (let i = 0; i < 14; i++) ctx.fillRect(X(k.x) + ((i * 37) % 97) / 97 * R(k.w), Y(k.y) + ((i * 53) % 89) / 89 * R(k.h), 2, 2);
    }
    for (const k of c.water) {
      ctx.fillStyle = '#1d6fd6';
      ctx.beginPath();
      ctx.roundRect(X(k.x), Y(k.y), R(k.w), R(k.h), R(0.03));
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.4)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const yy = Y(k.y) + R(k.h) * (0.3 + 0.2 * i), xx = X(k.x) + ((s.t * 0.6 + i * 30) % R(k.w));
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.quadraticCurveTo(xx + 6, yy - 3, xx + 12, yy);
        ctx.stroke();
      }
    }
    for (const k of c.blocks) {
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(X(k.x) + 3, Y(k.y) + 4, R(k.w), R(k.h));
      ctx.fillStyle = '#8a5a34';
      ctx.fillRect(X(k.x), Y(k.y), R(k.w), R(k.h));
      ctx.fillStyle = '#c08a55';
      ctx.fillRect(X(k.x), Y(k.y), R(k.w), 3);
      ctx.strokeStyle = 'rgba(255,180,90,.6)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(X(k.x), Y(k.y), R(k.w), R(k.h));
    }
    for (const u of c.bumps) {
      ctx.shadowColor = th.hot;
      ctx.shadowBlur = 10 + u.hit * 2;
      ctx.fillStyle = th.hot;
      ctx.beginPath();
      ctx.arc(X(u.x), Y(u.y), R(u.r) * (1 + u.hit * 0.02), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(X(u.x), Y(u.y), R(u.r) * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = th.hot;
      ctx.beginPath();
      ctx.arc(X(u.x), Y(u.y), R(u.r) * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (c.sw) {
      ctx.fillStyle = c.sw.on ? '#ffd23f' : '#5a4a1a';
      ctx.shadowColor = '#ffd23f';
      ctx.shadowBlur = c.sw.on ? 16 : 0;
      ctx.fillRect(X(c.sw.x) - R(0.025), Y(c.sw.y) - R(0.025), R(0.05), R(0.05));
      ctx.shadowBlur = 0;
    }
    // 티
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath();
    ctx.ellipse(X(TEE.x), Y(TEE.y), R(0.06), R(0.035), 0, 0, Math.PI * 2);
    ctx.fill();
    // 핀
    for (const p of s.pins) {
      const q = pinAt(p, s.t), x = X(q.x), y = Y(q.y), r = R(PIN);
      if (p.hidden) {
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.beginPath();
        ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      if (p.down) {
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.2, r * 0.5, 0.6, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      if (p.ax) {
        ctx.strokeStyle = 'rgba(255,210,63,.35)';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.moveTo(X(p.x - p.ax), y);
        ctx.lineTo(X(p.x + p.ax), y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.globalAlpha = p.ghost ? 0.55 + 0.25 * Math.sin(s.t / 8) : 1;
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath();
      ctx.ellipse(x + 3, y + r * 0.9, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      const neon = p.ghost ? th.accent : ['#ffd23f', '#ff4fa3', '#7dff8a', '#b48cff'][s.pins.indexOf(p) % 4];
      ctx.strokeStyle = neon;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y + r * 0.25, r * 1.05, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = p.ghost ? th.accent : '#ffffff';
      ctx.shadowColor = neon;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(x, y + r * 0.25, r * 0.75, 0, Math.PI * 2);
      ctx.arc(x, y - r * 0.55, r * 0.48, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = p.ghost ? '#ffffff' : neon;
      ctx.fillRect(x - r * 0.5, y - r * 0.24, r * 1.0, r * 0.2);
      ctx.globalAlpha = 1;
    }
    // 조준·힘
    if (s.phase === 'aim' || s.phase === 'power') {
      const len = s.phase === 'power' ? 0.1 + 0.25 * powerOf(s.hold) : 0.16;
      ctx.strokeStyle = s.phase === 'power' ? '#ffd23f' : 'rgba(255,255,255,.85)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -s.t;
      ctx.beginPath();
      ctx.moveTo(X(TEE.x), Y(TEE.y));
      ctx.lineTo(X(TEE.x + Math.cos(s.angle) * len), Y(TEE.y + Math.sin(s.angle) * len));
      ctx.stroke();
      ctx.setLineDash([]);
      if (s.phase === 'power') {
        const p = powerOf(s.hold);
        ctx.fillStyle = 'rgba(0,0,0,.4)';
        ctx.fillRect(w - 26, h * 0.55, 12, h * 0.3);
        ctx.fillStyle = `hsl(${120 - p * 120},90%,55%)`;
        ctx.fillRect(w - 26, h * 0.85 - h * 0.3 * p, 12, h * 0.3 * p);
      }
    }
    // 공의 길: 굴러갈 땐 짧은 잔상, 되감기 땐 지나온 길 전체가 시안빛으로
    if (s.path.length > 1 && (s.phase === 'roll' || rw)) {
      const end = rw ? s.ri : s.path.length - 1, from = rw ? 0 : Math.max(0, end - 40);
      ctx.strokeStyle = rw ? 'rgba(60,242,255,.6)' : 'rgba(255,255,255,.5)';
      ctx.lineWidth = rw ? 4 : 3;
      ctx.shadowColor = th.accent;
      ctx.shadowBlur = rw ? 12 : 0;
      ctx.beginPath();
      ctx.moveTo(X(s.path[from].x), Y(s.path[from].y));
      for (let i = from + 1; i <= end; i += 2) ctx.lineTo(X(s.path[i].x), Y(s.path[i].y));
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(X(s.ball.x) + 2, Y(s.ball.y) + 3, R(BALL), R(BALL) * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rw ? '#c8fbff' : '#ffffff';
    ctx.shadowColor = rw ? th.accent : '#ffffff';
    ctx.shadowBlur = rw ? 18 : 8;
    ctx.beginPath();
    ctx.arc(X(s.ball.x), Y(s.ball.y), R(BALL), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // 되감기 연출: 비디오테이프 줄무늬 + 색 번짐
    if (rw) {
      ctx.fillStyle = 'rgba(60,242,255,.06)';
      ctx.fillRect(0, 0, w, h);
      for (let y = (s.t * 6) % 9; y < h; y += 9) (ctx.fillStyle = 'rgba(255,255,255,.05)'), ctx.fillRect(0, y, w, 2);
      const band = ((s.t * 7) % (h + 60)) - 30;
      ctx.fillStyle = 'rgba(255,79,163,.12)';
      ctx.fillRect(0, band, w, 14);
      ctx.fillStyle = th.accent;
      ctx.font = `900 ${R(0.055)}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('◀◀ 되감기', 12, R(0.12));
    }
    const seenT = fx.memo.t ?? -1;
    for (const e of s.events) {
      if (e.t <= seenT) continue;
      const x = X(e.x), y = Y(e.y);
      if (e.kind === 'shot') fx.ring(x, y, '#ffffff', R(0.08), 3), fx.burst(x, y, '#d9ffe8', 10, 2.5, 2), fx.kick(3);
      if (e.kind === 'hit') fx.burst(x, y, '#ffffff', 22, 4, 3), fx.ring(x, y, '#ffffff', R(0.1), 4), fx.pop(x, y - 16, e.text!, '#ffffff', 16), fx.kick(5);
      if (e.kind === 'hitback') fx.burst(x, y, th.accent, 34, 5, 3.5), fx.ring(x, y, th.accent, R(0.16), 6), fx.pop(x, y - 18, e.text!, th.accent, 20), fx.kick(9), fx.blink(th.accent, 0.15);
      if (e.kind === 'rw') fx.blink(th.accent, 0.2), fx.kick(4);
      if (e.kind === 'splash') fx.burst(x, y, '#9fd0ff', 26, 4, 3), fx.pop(x, y - 16, e.text!, '#9fd0ff', 16);
      if (e.kind === 'switch') fx.ring(x, y, '#ffd23f', R(0.3), 6), fx.pop(x, y - 16, e.text!, '#ffd23f', 16), fx.blink('#ffd23f', 0.15);
      if (e.kind === 'clear') fx.pop(w / 2, h * 0.35, e.text!, '#ffffff', 24), fx.burst(w / 2, h * 0.35, '#ffd23f', 50, 6, 3), fx.blink('#fff6c8', 0.25);
      if (e.kind === 'fail') fx.pop(w / 2, h * 0.45, e.text!, th.hot, 18), fx.kick(10), fx.blink(th.hot, 0.25);
      if (e.kind === 'hole') fx.pop(w / 2, h * 0.42, e.text!, '#ffffff', 20);
      if (e.kind === 'new') fx.pop(w / 2, h * 0.52, e.text!, th.accent, 15);
    }
    fx.memo.t = s.t;
    ctx.restore();
    ctx.fillStyle = 'rgba(5,12,24,.6)';
    ctx.fillRect(0, 0, w, R(0.1));
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = th.ink;
    ctx.font = `900 ${R(0.042)}px system-ui, sans-serif`;
    ctx.fillText(`${s.hole + 1}홀 · 핀 ${s.pins.filter((p) => p.down).length}/${s.pins.length} · 샷 ${s.shots}/${s.max} (파 ${s.par}) · ★ ${s.stars}`, 10, R(0.028));
    ctx.textAlign = 'right';
    ctx.fillStyle = th.hot;
    ctx.fillText('♥'.repeat(Math.max(0, s.hearts)), w - 10, R(0.028));
    if (s.hole === 0 && s.shots === 0 && s.phase === 'aim' && s.t > 40) (ctx.textAlign = 'center'), (ctx.fillStyle = '#ffffff'), (ctx.font = `900 ${R(0.048)}px system-ui, sans-serif`), ctx.fillText('👆 위를 볼 때 꾹 누르고, 떼면 샷!', w / 2, h * 0.7);
  },
};

const plan = new WeakMap<object, { at: number; hold: number }>();
/** 봇: 아무 때나 누르고 아무만큼 누른다 */
export const rewindRandom: Bot<GolfState> = {
  name: '아무렇게나',
  act(s, rng) {
    let m = plan.get(s);
    if (s.phase === 'aim' && (!m || m.at < s.t - 400)) plan.set(s, (m = { at: s.t + 20 + Math.floor(rng() * 150), hold: 8 + Math.floor(rng() * 70) }));
    if (!m) return { tap: false, dir: 0 };
    if (s.phase === 'aim') return { tap: false, dir: 0, hold: s.t >= m.at };
    if (s.phase === 'power') return { tap: false, dir: 0, hold: s.hold < m.hold };
    return { tap: false, dir: 0 };
  },
};

/** 한 샷을 흉내 낸다: t0에 angle·power로 쳐서 멈출 때까지 굴리고 되감는다. 쓰러뜨린 핀 수(되감기는 두 배) */
function simulate(s: GolfState, angle: number, power: number, t0: number) {
  const pins = s.pins.map((p) => ({ ...p })), c: Course = { ...s.course, sw: s.course.sw ? { ...s.course.sw } : null, bumps: s.course.bumps.map((u) => ({ ...u })) };
  const v = 0.006 + 0.034 * power, b = { x: TEE.x, y: TEE.y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v }, path = [{ x: b.x, y: b.y }];
  let t = t0, score = 0;
  for (;;) {
    t++;
    const wet = roll(c, b);
    path.push({ x: b.x, y: b.y });
    score += knock(pins, c, b.x, b.y, t, false);
    if (wet || Math.hypot(b.vx, b.vy) < STOP || path.length > MAXROLL) break;
  }
  for (let i = path.length - 1; i > 0; ) {
    t++;
    for (let k = 0; k < 3 && i > 0; k++) (i--, (score += 2 * knock(pins, c, path[i].x, path[i].y, t, true)));
  }
  return score + (c.sw?.on && !s.course.sw?.on ? 1.5 : 0);
}

/** 봇: 앞으로 5초 동안 화살표가 가리킬 방향 × 누르는 시간 7가지를 흉내 내서, 가장 많이 쓰러뜨리는 샷을 골라 그대로 누르고 뗀다 */
export const rewindSmart: Bot<GolfState> = {
  name: '골프 장인',
  act(s) {
    if (s.phase === 'aim') {
      let m = plan.get(s);
      if (!m || m.at < s.t) {
        let best = { at: s.t + 1, hold: 30, v: -1 };
        for (let d = 1; d < 300; d += 6)
          for (const hold of [10, 16, 22, 28, 36, 44, 52]) {
            const v = simulate(s, aimAt(s.t + d - s.aimT), powerOf(hold), s.t + d + hold) - d * 0.0005;
            if (v > best.v) best = { at: s.t + d, hold, v };
          }
        plan.set(s, (m = { at: best.at, hold: best.hold }));
      }
      return { tap: false, dir: 0, hold: s.t + 1 >= m.at };
    }
    if (s.phase === 'power') {
      const m = plan.get(s);
      return { tap: false, dir: 0, hold: s.hold < (m?.hold ?? 30) - 1 };
    }
    return { tap: false, dir: 0 };
  },
};
