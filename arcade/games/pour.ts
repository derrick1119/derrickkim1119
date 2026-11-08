/**
 * 중력 쏟기 (0034, 메뉴 7번 · 16라운드 다음 차례) — 합치기(2048류) × 중력 뒤집기 · 스와이프.
 * 기준 9(조작 최소): 손이 하는 일은 '한 번 밀기'뿐. 미는 쪽으로 상자 전체의 중력이 바뀐다.
 * 와우: 밀면 상자 속 구슬 수십 개가 와르르 쏟아지고, 같은 구슬끼리 부딪히는 족족 합쳐져 커진다 — 연쇄로 '펑펑펑'.
 * 첫 3초: 바닥에 깔린 작은 구슬 위로 한 번 밀면, 쏟아지며 서너 번 연달아 합쳐진다.
 * 목표·보상: 판마다 목표 구슬(예: 4)을 정해진 밀기 횟수 안에 만들면 통과 — 남은 횟수로 별, 남은 횟수 절반은 다음 판 보너스.
 * 하는 일이 바뀐다(2판 간격): 돌(2판, 안 합쳐짐·옆에서 합치면 깨짐) → 무지개(4판, 아무거나와 합쳐짐) → 폭탄(6판, 3번 밀면 터져 주변을 날림 — 큰 구슬을 멀리)
 *                  → 말뚝(8판, 흐름이 갈라짐) → 얼음(10판, 옆에서 합쳐야 풀림).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.35, G = 0.00045, VMAX = 0.02, SETTLE = 0.0012, LAT = 0.4;
type Dir = 'up' | 'down' | 'left' | 'right';
type Kind = 'ball' | 'stone' | 'rainbow' | 'bomb' | 'ice';
export interface Ball { kind: Kind; lv: number; c: number; x: number; y: number; vx: number; vy: number; born: number; fuse: number; dead?: boolean }
interface Peg { x: number; y: number; r: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; lv?: number; c?: number }
export interface PourState {
  rng: Rng; t: number; stage: number; target: number; swipes: number; left: number; bonus: number; grav: Dir; colors: number; next: { kind: Kind; lv: number; c: number }[];
  balls: Ball[]; pegs: Peg[]; since: number; still: number; pause: number; cleared: boolean; merges: number; chain: number;
  hearts: number; stars: number; best: number; seen: Set<string>; events: Ev[]; dead: boolean;
}

export const rad = (b: Ball) => (b.kind === 'stone' ? 0.05 : b.kind === 'rainbow' || b.kind === 'bomb' ? 0.048 : 0.046 + 0.003 * (b.lv - 1));
/** 구슬 색 (0034 → 0037: 같은 색·같은 숫자끼리만 합쳐진다 — 오너 17라운드 "한곳으로 모으면 합쳐지기 너무 쉬움") */
export const TEAM = ['#ff5c6c', '#4dabf7', '#69db7c'];
/** 상자가 이만큼(구슬 넓이 ÷ 상자 넓이) 차면 넘침 */
const FULL = 0.5;
const ev = (s: PourState, kind: string, x: number, y: number, text?: string, lv?: number) => s.events.push({ t: s.t, kind, x, y, text, lv });
function see(s: PourState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  ev(s, 'new', 0.5, A * 0.5, text);
}
const GV: Record<Dir, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
const canMerge = (a: Ball, b: Ball) =>
  (a.kind === 'ball' && b.kind === 'ball' && a.lv === b.lv && a.c === b.c) || (a.kind === 'rainbow' && b.kind === 'ball') || (b.kind === 'rainbow' && a.kind === 'ball');

/** 구슬 물리 한 틱 (봇이 내다볼 때도 같은 함수를 쓴다). 합쳐진 것은 onMerge로 알린다 */
export function physics(balls: Ball[], pegs: Peg[], grav: Dir, onMerge?: (nb: Ball, a: Ball, b: Ball) => void, noMerge = false) {
  const [gx, gy] = GV[grav];
  for (let sub = 0; sub < 2; sub++) {
    for (const b of balls) {
      if (b.kind === 'ice') continue;
      // 옆으로는 거의 안 구른다 — 구슬은 제 줄을 따라 곧장 떨어져 쌓인다 (0037: 한쪽으로 몰기만 해선 안 합쳐지게, 어느 줄에 무엇이 쌓이는지가 수가 된다)
      b.vx = (b.vx + gx * G) * (gx ? 0.996 : LAT);
      b.vy = (b.vy + gy * G) * (gy ? 0.996 : LAT);
      const v = Math.hypot(b.vx, b.vy);
      if (v > VMAX) (b.vx *= VMAX / v), (b.vy *= VMAX / v);
      b.x += b.vx;
      b.y += b.vy;
    }
    for (let it = 0; it < 2; it++) {
      for (let i = 0; i < balls.length; i++) {
        const a = balls[i];
        if (a.dead) continue;
        for (let j = i + 1; j < balls.length; j++) {
          const b = balls[j];
          if (b.dead) continue;
          const dx = b.x - a.x, dy = b.y - a.y, rs = rad(a) + rad(b);
          if (Math.abs(dx) > rs || Math.abs(dy) > rs) continue;
          const d = Math.hypot(dx, dy) || 1e-6;
          if (d >= rs) continue;
          if (!noMerge && canMerge(a, b)) {
            const lv = Math.max(a.lv, b.lv) + 1, wa = rad(a) ** 2, wb = rad(b) ** 2;
            const nb: Ball = { kind: 'ball', lv, c: a.kind === 'rainbow' ? b.c : a.c, x: (a.x * wa + b.x * wb) / (wa + wb), y: (a.y * wa + b.y * wb) / (wa + wb), vx: (a.vx + b.vx) / 2, vy: (a.vy + b.vy) / 2, born: 0, fuse: 0 };
            a.dead = b.dead = true;
            balls.push(nb);
            onMerge?.(nb, a, b);
            break;
          }
          const nx = dx / d, ny = dy / d, ov = rs - d, ma = a.kind === 'ice' ? 1e9 : rad(a) ** 2, mb = b.kind === 'ice' ? 1e9 : rad(b) ** 2;
          a.x -= nx * ov * (mb / (ma + mb));
          a.y -= ny * ov * (mb / (ma + mb));
          b.x += nx * ov * (ma / (ma + mb));
          b.y += ny * ov * (ma / (ma + mb));
          const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (vn < 0) {
            const imp = (-1.2 * vn) / (1 / ma + 1 / mb);
            if (a.kind !== 'ice') (a.vx -= (imp / ma) * nx), (a.vy -= (imp / ma) * ny);
            if (b.kind !== 'ice') (b.vx += (imp / mb) * nx), (b.vy += (imp / mb) * ny);
          }
        }
      }
      for (let k = balls.length - 1; k >= 0; k--) if (balls[k].dead) balls.splice(k, 1);
      for (const b of balls) {
        const r = rad(b);
        for (const p of pegs) {
          const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy) || 1e-6;
          if (d < r + p.r) {
            (b.x = p.x + (dx / d) * (r + p.r)), (b.y = p.y + (dy / d) * (r + p.r));
            const vn = (b.vx * dx + b.vy * dy) / d;
            if (vn < 0) (b.vx -= (1.3 * vn * dx) / d), (b.vy -= (1.3 * vn * dy) / d);
          }
        }
        if (b.x < r) (b.x = r), (b.vx = Math.abs(b.vx) * 0.3), (b.vy *= 0.97);
        if (b.x > 1 - r) (b.x = 1 - r), (b.vx = -Math.abs(b.vx) * 0.3), (b.vy *= 0.97);
        if (b.y < r) (b.y = r), (b.vy = Math.abs(b.vy) * 0.3), (b.vx *= 0.97);
        if (b.y > A - r) (b.y = A - r), (b.vy = -Math.abs(b.vy) * 0.3), (b.vx *= 0.97);
      }
    }
  }
}

function spawn(s: PourState, kind: Kind, lv: number, x: number, y: number, c = Math.floor(s.rng() * s.colors)) {
  s.balls.push({ kind, lv, c, x, y, vx: 0, vy: 0, born: s.t, fuse: kind === 'bomb' ? 3 : 0 });
}
const lowLv = (s: PourState) => (s.rng() < 0.55 ? 1 : s.rng() < 0.75 || s.stage < 2 ? 2 : 3);

function newStage(s: PourState) {
  const k = s.stage;
  s.target = Math.min(10, 4 + Math.floor((k + 1) / 2));
  s.swipes = s.left = (k === 0 ? 5 : 4) + Math.min(3, Math.floor(k / 3)) + s.bonus;
  s.bonus = 0;
  s.balls = [];
  s.pegs = [];
  s.cleared = false;
  s.grav = 'down';
  s.colors = k >= 5 ? 3 : 2;
  if (k >= 5) see(s, 'color3', '초록 구슬 등장 — 색이 셋!');
  if (k >= 7) {
    for (let i = 0; i < 3; i++) s.pegs.push({ x: 0.25 + 0.25 * i, y: A * (0.45 + 0.1 * (i % 2)), r: 0.035 });
    see(s, 'peg', '말뚝 — 쏟아지는 길이 갈라져요');
  }
  // 처음 더미: 목표 구슬 무게(2^(목표-1))의 85%어치를 목표-2 이하 구슬로. 합치지 않고 바닥에 가라앉혀 둔다(첫 밀기에 와르르)
  // 색마다 목표 무게의 60%어치 — 한 색으로 목표를 만들려면 밀 때 들어오는 구슬까지 잘 모아야 한다
  for (let c = 0; c < s.colors; c++) {
    let mass = 0;
    for (let i = 0; mass < 0.7 * 2 ** (s.target - 1) && i < 20; i++) {
      const lv = k === 0 ? 1 : 1 + Math.floor(s.rng() ** 2.2 * Math.max(1, s.target - 2));
      spawn(s, 'ball', lv, 0.08 + s.rng() * 0.84, 0.1 + s.rng() * (A - 0.2), c);
      mass += 2 ** (lv - 1);
    }
  }
  if (k >= 9) for (let i = 0; i < 2; i++) (spawn(s, 'ice', 2 + i, 0.3 + 0.4 * i, A * 0.35), see(s, 'ice', '얼음 구슬 — 옆에서 합쳐야 풀려요'));
  rollNext(s);
  for (let t = 0; t < 150; t++) physics(s.balls, s.pegs, 'down', undefined, true);
  for (const b of s.balls) (b.vx = 0), (b.vy = 0);
  ev(s, 'stage', 0.5, A * 0.4, `${k + 1}판 — ${s.target} 구슬 만들기 (밀기 ${s.left}번)`);
}

/** 다음에 밀 때 들어올 구슬 (화면 위 '다음' 칸에 미리 보인다 — 0037: 계획할 수 있게) */
function rollNext(s: PourState) {
  const k = s.stage, n = 3 + (k >= 3 ? 1 : 0);
  s.next = [];
  for (let i = 0; i < n; i++) {
    const r = s.rng(), c = Math.floor(s.rng() * s.colors);
    if (k >= 1 && i === 0 && r < 0.35) s.next.push({ kind: 'stone', lv: 0, c });
    else if (k >= 3 && i === 1 && r < 0.3) s.next.push({ kind: 'rainbow', lv: 0, c });
    else if (k >= 5 && i === 2 && r < 0.3) s.next.push({ kind: 'bomb', lv: 0, c });
    else s.next.push({ kind: 'ball', lv: lowLv(s), c });
  }
}
/** 밀면 '다음' 구슬들이 반대쪽 벽의 정해진 자리에서 들어온다 */
export function incoming(s: PourState, d: Dir): Ball[] {
  const [gx, gy] = GV[d], n = s.next.length;
  return s.next.map((q, i) => {
    const u = 0.15 + 0.7 * ((i + 0.5) / n), x = gx ? (gx > 0 ? 0.05 : 0.95) : u, y = gy ? (gy > 0 ? 0.05 : A - 0.05) : u * A;
    return { kind: q.kind, lv: q.lv, c: q.c, x, y, vx: 0, vy: 0, born: s.t, fuse: q.kind === 'bomb' ? 3 : 0 };
  });
}
function feed(s: PourState) {
  for (const b of incoming(s, s.grav)) {
    s.balls.push(b);
    if (b.kind === 'stone') see(s, 'stone', '돌 — 안 합쳐져요. 옆에서 합치면 깨져요');
    if (b.kind === 'rainbow') see(s, 'rainbow', '무지개 구슬 — 아무 구슬과 합쳐져요');
    if (b.kind === 'bomb') see(s, 'bomb', '폭탄 — 3번 밀면 터져요! 큰 구슬은 멀리');
  }
  rollNext(s);
}

function onMerge(s: PourState, nb: Ball) {
  nb.born = s.t;
  s.merges++;
  s.chain++;
  s.best = Math.max(s.best, nb.lv);
  ev(s, 'merge', nb.x, nb.y, s.chain >= 3 ? `${s.chain}연쇄!` : undefined, nb.lv);
  s.events[s.events.length - 1].c = nb.c;
  see(s, 'merge', '같은 색·같은 숫자끼리만 합쳐져요');
  if (s.chain >= 4) see(s, 'chain', '연쇄! 한 번 밀기에 여러 번 합쳐요');
  for (const o of s.balls)
    if ((o.kind === 'stone' || o.kind === 'ice') && Math.hypot(o.x - nb.x, o.y - nb.y) < rad(o) + rad(nb) + 0.03) {
      if (o.kind === 'stone') (o.dead = true), ev(s, 'crack', o.x, o.y);
      else (o.kind = 'ball'), ev(s, 'thaw', o.x, o.y);
    }
  // 깨진 돌은 dead 표시만 — physics가 같은 배열에서 치운다
}

export const pour: GameDef<PourState> = {
  id: 'pour',
  name: '중력 쏟기',
  genes: ['merge', 'gravityflip', 'swipe'],
  twist: '버튼 대신 한 번 밀기 — 미는 쪽으로 상자 전체의 중력이 바뀌어 모든 구슬이 와르르 쏟아진다. 같은 색·같은 숫자만 합쳐져서, 한쪽으로 몰면 색이 뒤엉켜 병이 넘친다',
  rules: ['밀면 그쪽으로 중력이 바뀌어 구슬이 쏟아져요 (화살표 키도 돼요).', '같은 색·같은 숫자끼리만 합쳐져요. 밀 때마다 새 구슬이 들어와요 — 병이 넘치면 하트 -1.', '판마다 목표 구슬을 정해진 횟수 안에 만들면 통과 — 적게 밀수록 별!'],
  controls: 'swipe',
  hint: '밀기(스와이프) = 중력 방향 / 화살표',
  aspect: A,
  art: {
    concept: '유리병 속 사탕 구슬',
    mood: '밤하늘색 유리병 안에서 알록달록 사탕 구슬이 쏟아진다. 합쳐질 때마다 빛이 번쩍이고, 큰 구슬일수록 무지개빛 광택이 돈다.',
    palette: { bg: '#141033', ink: '#fdfbff', muted: '#6d65a8', accent: '#ffd43b', hot: '#ff5c8a', soft: '#231c52' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = { rng: mulberry32(seed), t: 0, stage: 0, target: 4, swipes: 0, left: 0, bonus: 0, grav: 'down', colors: 2, next: [], balls: [], pegs: [], since: 0, still: 0, pause: 0, cleared: false, merges: 0, chain: 0, hearts: 3, stars: 0, best: 1, seen: new Set<string>(), events: [], dead: false } as unknown as PourState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.events = s.events.filter((e) => s.t - e.t < 90);
    if (s.pause > 0) {
      if (--s.pause === 0) s.cleared ? (s.stage++, newStage(s)) : newStage(s);
      return;
    }
    if (inp.move && s.left > 0 && !s.cleared) {
      s.grav = inp.move;
      s.left--;
      s.since = 0;
      s.still = 0;
      s.chain = 0;
      for (const b of s.balls) if (b.kind === 'bomb' && --b.fuse <= 0) b.dead = true;
      for (const b of s.balls.filter((x) => x.dead && x.kind === 'bomb')) {
        ev(s, 'boom', b.x, b.y, '펑!');
        for (const o of s.balls) if (o !== b && Math.hypot(o.x - b.x, o.y - b.y) < 0.2) o.dead = true;
      }
      s.balls = s.balls.filter((b) => !b.dead);
      feed(s);
      ev(s, 'swipe', 0.5, A / 2, s.grav);
    }
    s.since++;
    physics(s.balls, s.pegs, s.grav, (nb) => onMerge(s, nb));
    const moving = s.balls.some((b) => Math.hypot(b.vx, b.vy) > SETTLE);
    s.still = moving ? 0 : s.still + 1;
    // 목표 달성 → 별, 남은 횟수 절반은 다음 판 보너스
    if (!s.cleared && s.balls.some((b) => b.kind === 'ball' && b.lv >= s.target)) {
      s.cleared = true;
      const st = s.left * 2 >= s.swipes ? 3 : s.left > 0 ? 2 : 1;
      s.stars += st;
      s.bonus = Math.min(2, Math.floor(s.left / 2));
      const b = s.balls.find((x) => x.lv >= s.target)!;
      ev(s, 'clear', b.x, b.y, `${s.stage + 1}판 통과! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}${s.bonus ? ` · 다음 판 +${s.bonus}` : ''}`);
      s.pause = 80;
      return;
    }
    // 실패: 밀기를 다 쓰고 멈췄거나, 상자가 넘쳤다
    const area = s.balls.reduce((a, b) => a + Math.PI * rad(b) ** 2, 0);
    const out = s.left === 0 && (s.still > 20 || s.since > 150), full = area > FULL * A && (s.still > 20 || s.since > 150);
    if (out || full) {
      s.hearts--;
      ev(s, 'fail', 0.5, A * 0.45, full ? '넘쳤어요! 하트 -1' : '밀기를 다 썼어요! 하트 -1');
      if (s.hearts <= 0) s.dead = true;
      else s.pause = 80;
    }
  },
  over: (s) => s.dead,
  score: (s) => s.stage * 20 + s.stars * 15 + s.best * 5,
  draw(ctx, s, w, h, th: Theme) {
    const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
    ctx.save();
    fx.begin(ctx);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#1d1650');
    bg.addColorStop(1, th.bg);
    ctx.fillStyle = bg;
    ctx.fillRect(-10, -10, w + 20, h + 20);
    for (let k = 0; k < 40; k++) {
      ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.25 * Math.abs(Math.sin(s.t / 50 + k))})`;
      ctx.fillRect(((k * 7919) % 997) / 997 * w, ((k * 104729) % 991) / 991 * h, 1.5, 1.5);
    }
    // 중력 방향: 그 벽이 빛난다
    const [gx, gy] = GV[s.grav], glow = ctx.createLinearGradient(gx > 0 ? w : gx < 0 ? 0 : 0, gy > 0 ? h : gy < 0 ? 0 : 0, gx > 0 ? w - R(0.12) : gx < 0 ? R(0.12) : 0, gy > 0 ? h - R(0.12) : gy < 0 ? R(0.12) : 0);
    glow.addColorStop(0, 'rgba(255,212,59,.35)');
    glow.addColorStop(1, 'rgba(255,212,59,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    for (const p of s.pegs) {
      ctx.fillStyle = '#8f86c9';
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), R(p.r), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.beginPath();
      ctx.arc(X(p.x) - R(p.r) * 0.3, Y(p.y) - R(p.r) * 0.3, R(p.r) * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const b of s.balls) {
      const age = s.t - b.born, pop = age < 10 ? 1 + 0.35 * Math.sin((age / 10) * Math.PI) : 1, r = R(rad(b)) * pop, x = X(b.x), y = Y(b.y);
      const base = b.kind === 'stone' ? '#7a7f8c' : b.kind === 'bomb' ? '#2b2b33' : b.kind === 'ice' ? '#bfeaff' : b.kind === 'rainbow' ? `hsl(${(s.t * 4) % 360},90%,62%)` : TEAM[b.c];
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.25, base);
      g.addColorStop(1, b.kind === 'stone' ? '#454852' : 'rgba(0,0,0,.35)');
      if (b.kind === 'ball' && b.lv >= 5) (ctx.shadowColor = base), (ctx.shadowBlur = 8 + b.lv * 2);
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = g;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.max(10, r * 0.95)}px system-ui, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,.45)';
      const label = b.kind === 'ball' ? String(b.lv) : b.kind === 'bomb' ? String(b.fuse) : b.kind === 'rainbow' ? '★' : b.kind === 'ice' ? '❄' : '';
      if (label) (ctx.strokeText(label, x, y + 1), (ctx.fillStyle = b.kind === 'bomb' ? '#ff5c5c' : '#ffffff'), ctx.fillText(label, x, y + 1));
      if (b.kind === 'bomb') (ctx.strokeStyle = s.t % 20 < 10 ? '#ff5c5c' : '#ffd43b'), (ctx.lineWidth = 2), ctx.beginPath(), ctx.arc(x, y, r + 3, 0, Math.PI * 2), ctx.stroke();
      if (b.kind === 'ice') (ctx.strokeStyle = 'rgba(255,255,255,.8)'), (ctx.lineWidth = 2), ctx.beginPath(), ctx.arc(x, y, r, 0, Math.PI * 2), ctx.stroke();
    }
    const seenT = fx.memo.t ?? -1;
    for (const e of s.events) {
      if (e.t <= seenT) continue;
      const x = X(e.x), y = Y(e.y);
      if (e.kind === 'merge') {
        const c = TEAM[e.c ?? 0];
        fx.burst(x, y, c, 8 + (e.lv ?? 1) * 2, 2 + (e.lv ?? 1) * 0.4, 2.5);
        fx.ring(x, y, c, R(0.05 + (e.lv ?? 1) * 0.015), 3);
        fx.kick(Math.min(10, (e.lv ?? 1) * 0.8));
        fx.pop(x, y - R(0.05), e.text ?? `${e.lv}`, e.text ? th.accent : '#ffffff', e.text ? 18 : 13);
        if ((e.lv ?? 0) >= 6) fx.blink(c, 0.12);
      }
      if (e.kind === 'swipe') fx.kick(3);
      if (e.kind === 'crack') fx.burst(x, y, '#9aa0ad', 18, 3, 3), fx.pop(x, y - 10, '쩍!', '#d0d4dc', 14);
      if (e.kind === 'thaw') fx.burst(x, y, '#bfeaff', 18, 3, 2.5), fx.pop(x, y - 10, '사르르', '#bfeaff', 14);
      if (e.kind === 'boom') fx.ring(x, y, '#ff8a3d', R(0.2), 8), fx.burst(x, y, '#ff8a3d', 40, 6, 3.5), fx.kick(14), fx.blink('#ff8a3d', 0.25), fx.pop(x, y - 20, e.text!, '#ffd43b', 22);
      if (e.kind === 'clear') fx.ring(x, y, th.accent, R(0.5), 8), fx.burst(x, y, th.accent, 40, 5, 3), fx.blink('#fff6c8', 0.25), fx.pop(w / 2, h * 0.35, e.text!, '#ffffff', 22);
      if (e.kind === 'fail') fx.kick(10), fx.blink(th.hot, 0.3), fx.pop(w / 2, h * 0.45, e.text!, th.hot, 20);
      if (e.kind === 'stage') fx.pop(w / 2, h * 0.42, e.text!, '#ffffff', 18);
      if (e.kind === 'new') fx.pop(w / 2, h * 0.52, e.text!, th.accent, 15);
    }
    fx.memo.t = s.t;
    ctx.restore();
    // 병 채움 눈금: 빨간 선을 넘긴 채 멈추면 넘침
    {
      const fill = Math.min(1.2, s.balls.reduce((a, b) => a + Math.PI * rad(b) ** 2, 0) / (FULL * A)), gx0 = w - 12, gy0 = h * 0.2, gh = h * 0.6;
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(gx0, gy0, 6, gh);
      ctx.fillStyle = fill > 0.85 ? (s.t % 16 < 8 ? '#ff5c8a' : '#ffd43b') : '#7ad7ff';
      ctx.fillRect(gx0, gy0 + gh * (1 - fill / 1.2), 6, gh * (fill / 1.2));
      ctx.fillStyle = '#ff5c8a';
      ctx.fillRect(gx0 - 4, gy0 + gh * (1 - 1 / 1.2), 14, 2);
    }
    ctx.fillStyle = 'rgba(10,6,30,.55)';
    ctx.fillRect(0, 0, w, R(0.115));
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = th.ink;
    ctx.font = `900 ${R(0.045)}px system-ui, sans-serif`;
    ctx.fillText(`${s.stage + 1}판 · 목표 ${s.target} · 밀기 ${s.left}`, 10, 10);
    ctx.font = `700 ${R(0.032)}px system-ui, sans-serif`;
    ctx.fillStyle = th.accent;
    ctx.fillText(`★ ${s.stars} · 최고 ${s.best} · 다음`, 10, 14 + R(0.045));
    {
      const lx = 10 + ctx.measureText(`★ ${s.stars} · 최고 ${s.best} · 다음`).width + R(0.03), ly = 14 + R(0.045) + R(0.016);
      s.next.forEach((q, i) => {
        ctx.fillStyle = q.kind === 'stone' ? '#7a7f8c' : q.kind === 'bomb' ? '#2b2b33' : q.kind === 'rainbow' ? `hsl(${(s.t * 4) % 360},90%,62%)` : TEAM[q.c];
        ctx.beginPath();
        ctx.arc(lx + i * R(0.045), ly, R(0.017), 0, Math.PI * 2);
        ctx.fill();
        if (q.kind === 'ball') (ctx.fillStyle = '#fff'), (ctx.font = `900 ${R(0.022)}px system-ui, sans-serif`), (ctx.textAlign = 'center'), (ctx.textBaseline = 'middle'), ctx.fillText(String(q.lv), lx + i * R(0.045), ly + 1);
      });
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = th.hot;
    ctx.font = `700 ${R(0.045)}px system-ui, sans-serif`;
    ctx.fillText('♥'.repeat(Math.max(0, s.hearts)), w - 10, 10);
    if (s.stage === 0 && s.left === s.swipes && s.t > 30) (ctx.textAlign = 'center'), (ctx.fillStyle = th.ink), (ctx.font = `900 ${R(0.05)}px system-ui, sans-serif`), ctx.fillText('👆 위로 쓱 밀어 보세요', w / 2, h * 0.32);
  },
};

const DIRS: Dir[] = ['up', 'left', 'right', 'down'];
const tick = new WeakMap<object, number>();
/** 봇: 아무 방향으로, 아무 때나 민다 */
export const pourRandom: Bot<PourState> = {
  name: '아무렇게나',
  act(s, rng) {
    const next = tick.get(s) ?? 40 + Math.floor(rng() * 60);
    if (s.t < next) return { tap: false, dir: 0 };
    tick.set(s, s.t + 40 + Math.floor(rng() * 60));
    return { tap: false, dir: 0, move: DIRS[Math.floor(rng() * 4)] };
  },
};

/** 봇: 구슬이 멈추면 두 번 밀기까지 내다본다(네 방향 × 네 방향, 새 구슬은 빼고). 목표 구슬에 가까워지고 같은 구슬끼리 붙는 쪽으로. 폭탄 근처의 큰 구슬은 감점 */
function value(s: PourState, bs: Ball[], got: number[]) {
  const top = Math.max(0, ...bs.filter((b) => b.kind === 'ball').map((b) => b.lv));
  if (top >= s.target) return 1e6;
  const fill = bs.reduce((a, b) => a + Math.PI * rad(b) ** 2, 0) / (FULL * A);
  let v = got.reduce((a, l) => a + 2 ** l, 0) + 2 ** top * 3 - (fill > 0.8 ? (fill - 0.8) * 400 : 0);
  for (let i = 0; i < bs.length; i++)
    for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i], b = bs[j];
      if (a.kind === 'ball' && b.kind === 'ball' && a.lv === b.lv && a.c === b.c) v += (2 ** a.lv * 0.5) / (1 + 20 * Math.hypot(a.x - b.x, a.y - b.y));
    }
  for (const bomb of bs.filter((b) => b.kind === 'bomb' && b.fuse <= 2)) for (const b of bs) if (b.kind === 'ball' && Math.hypot(b.x - bomb.x, b.y - bomb.y) < 0.22) v -= 2 ** b.lv;
  return v;
}
export const pourSmart: Bot<PourState> = {
  name: '구슬 장인',
  act(s) {
    if (s.pause > 0 || s.cleared || (s.still < 6 && s.since < 120) || s.left === 0) return { tap: false, dir: 0 };
    let best: Dir = 'down', bv = -1e9;
    for (const d of DIRS) {
      const bs = [...s.balls.map((b) => ({ ...b })), ...incoming(s, d)], got: number[] = [];
      for (let t = 0; t < 70; t++) physics(bs, s.pegs, d, (nb) => got.push(nb.lv));
      let v = value(s, bs, got);
      if (v < 1e6 && s.left > 1)
        v = Math.max(v, ...DIRS.filter((d2) => d2 !== d).map((d2) => {
          const b2 = bs.map((b) => ({ ...b })), g2 = [...got];
          for (let t = 0; t < 60; t++) physics(b2, s.pegs, d2, (nb) => g2.push(nb.lv));
          return value(s, b2, g2) * 0.9;
        }));
      if (d === s.grav) v -= 3;
      if (v > bv) (bv = v), (best = d);
    }
    return { tap: false, dir: 0, move: best };
  },
};
