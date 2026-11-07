/**
 * 핀볼 블록 — 핀볼 × 벽돌깨기 × 원버튼 × 연쇄 폭발. (0020)
 * 누르면 양쪽 날개가 함께 튀어 올라 공을 쳐 올린다. 위에는 색 블록 벽이 있고, 한 칸을 깨면
 * 맞닿은 같은 색 블록이 연쇄로 함께 터진다. 블록 벽은 천천히 내려온다.
 * 비틀기: 벽돌깨기의 받침대를 핀볼 날개로 바꿨다 — 공은 중력으로 떨어지고, 언제 치느냐가 조준이다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';

const W = 1, H = 1.5, R = 0.022, G = 0.00022, COLS = 7, BW = W / COLS, BH = 0.055;
const PIVOT_Y = 1.3, FL = 0.29, REST = 0.42, UP = -0.42, FLIP_TICKS = 12, RECHARGE = 40, DANGER = 1.0;
const LEFT = { x: 0.2, y: PIVOT_Y }, RIGHT = { x: 0.8, y: PIVOT_Y };
const COLORS = ['#ff9f1c', '#2ec4b6', '#e71d36'];
interface Brick { c: number; y: number; color: number }
export interface PinState {
  rng: Rng;
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  flip: number;
  /** 날개를 다시 칠 수 있을 때까지 남은 틱 (마구 누르기 방지) */
  recharge: number;
  angle: number;
  prevAngle: number;
  bricks: Brick[];
  dropIn: number;
  balls: number;
  wait: number;
  score: number;
  chainShow: { n: number; t: number } | null;
  dead: boolean;
}

function row(s: PinState, y: number) {
  for (let c = 0; c < COLS; c++) if (s.rng() < 0.85) s.bricks.push({ c, y, color: Math.floor(s.rng() * COLORS.length) });
}

function serve(s: PinState) {
  s.x = s.rng() < 0.5 ? 0.12 : 0.88;
  s.y = 0.62;
  s.vx = (s.x < 0.5 ? 1 : -1) * 0.002;
  s.vy = 0.002;
}

/** 날개 끝점 (왼쪽은 오른쪽 아래로, 오른쪽은 왼쪽 아래로 뻗는다) */
function tip(side: -1 | 1, angle: number) {
  const p = side < 0 ? LEFT : RIGHT;
  return { x: p.x - side * Math.cos(angle) * FL, y: p.y + Math.sin(angle) * FL };
}

/** 선분과 공의 충돌. 날개가 올라가는 중이면 그만큼 공을 쳐 올린다 */
function hitSegment(s: PinState, a: { x: number; y: number }, b: { x: number; y: number }, kick: number) {
  const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((s.x - a.x) * dx + (s.y - a.y) * dy) / L2));
  const px = a.x + t * dx, py = a.y + t * dy, d = Math.hypot(s.x - px, s.y - py);
  if (d >= R || d === 0) return;
  const nx = (s.x - px) / d, ny = (s.y - py) / d;
  s.x = px + nx * R;
  s.y = py + ny * R;
  const vn = s.vx * nx + s.vy * ny;
  if (vn < 0) (s.vx -= 1.55 * vn * nx), (s.vy -= 1.55 * vn * ny);
  if (kick > 0) (s.vx += nx * kick * (0.4 + t)), (s.vy += ny * kick * (0.4 + t));
}

function breakAt(s: PinState, k: number) {
  // 맞닿은 같은 색 블록 연쇄
  const color = s.bricks[k].color, out = new Set<number>([k]), q = [k];
  while (q.length) {
    const a = s.bricks[q.pop()!];
    s.bricks.forEach((b, i) => {
      if (out.has(i) || b.color !== color) return;
      const near = (Math.abs(b.c - a.c) === 1 && Math.abs(b.y - a.y) < 0.01) || (b.c === a.c && Math.abs(Math.abs(b.y - a.y) - BH) < 0.01);
      if (near) (out.add(i), q.push(i));
    });
  }
  s.score += out.size * out.size;
  if (out.size >= 3) s.chainShow = { n: out.size, t: s.t };
  s.bricks = s.bricks.filter((_, i) => !out.has(i));
}

export const pinbrick: GameDef<PinState> = {
  id: 'pinbrick',
  name: '핀볼 블록',
  genes: ['pinball', 'brick', 'onebutton', 'chain'],
  twist: '벽돌깨기의 받침대를 핀볼 날개로 바꿨다 — 공은 중력으로 떨어지고, 언제 치느냐가 곧 조준이다',
  rules: ['누르면 양쪽 날개가 함께 튀어 올라요. 한 번 치면 잠깐 쉬어야 해요.', '블록을 깨면 맞닿은 같은 색 블록이 연쇄로 터져요.', '공을 3번 놓치거나 블록 벽이 빨간 선까지 내려오면 끝.'],
  controls: 'tap',
  aspect: 1.5,
  art: {
    concept: '1980 핀볼 기계',
    mood: '검보랏빛 캐비닛, 크롬 날개, 주황·청록·빨강 램프 블록. 연쇄가 터지면 점수판이 번쩍인다.',
    palette: { bg: '#1a1033', ink: '#fdf6e3', muted: '#5b4a8a', accent: '#ff9f1c', hot: '#e71d36', soft: '#2b1d4f' },
  },
  create(seed) {
    const s: PinState = {
      rng: mulberry32(seed), t: 0, x: 0, y: 0, vx: 0, vy: 0, flip: 0, recharge: 0, angle: REST, prevAngle: REST, bricks: [], dropIn: 60 * 9,
      balls: 3, wait: 0, score: 0, chainShow: null, dead: false,
    };
    for (let k = 0; k < 4; k++) row(s, 0.08 + k * BH);
    serve(s);
    return s;
  },
  step(s, input: Input) {
    if (s.dead) return;
    s.t++;
    if (s.recharge > 0) s.recharge--;
    if (input.tap && s.recharge === 0) (s.flip = FLIP_TICKS), (s.recharge = RECHARGE);
    s.prevAngle = s.angle;
    const target = s.flip > 0 ? Math.max(UP, s.angle - 0.22) : Math.min(REST, s.angle + 0.08);
    if (s.flip > 0) s.flip--;
    // 블록 벽이 내려온다
    if (--s.dropIn <= 0) {
      for (const b of s.bricks) b.y += BH;
      row(s, 0.08);
      s.dropIn = Math.max(60 * 3, 60 * 8 - s.t / 7);
    }
    if (s.bricks.some((b) => b.y + BH > DANGER)) return void (s.dead = true);
    if (s.wait > 0) {
      s.angle = target;
      if (--s.wait === 0) serve(s);
      return;
    }
    // 공과 날개를 네 번에 나눠 함께 움직인다 (빠른 날개가 공을 뚫고 지나가지 않게)
    const N = 4, from = s.angle;
    for (let sub = 0; sub < N; sub++) {
      s.angle = from + ((target - from) * (sub + 1)) / N;
      s.vy += G / N;
      s.x += s.vx / N;
      s.y += s.vy / N;
      if (s.x < R) (s.x = R), (s.vx = Math.abs(s.vx));
      if (s.x > W - R) (s.x = W - R), (s.vx = -Math.abs(s.vx));
      if (s.y < R) (s.y = R), (s.vy = Math.abs(s.vy));
      const kick = target < from ? 0.012 : 0;
      // 바깥 경사로 → 날개
      hitSegment(s, { x: 0, y: 1.12 }, LEFT, 0);
      hitSegment(s, { x: W, y: 1.12 }, RIGHT, 0);
      hitSegment(s, LEFT, tip(-1, s.angle), kick);
      hitSegment(s, RIGHT, tip(1, s.angle), kick);
      for (let k = 0; k < s.bricks.length; k++) {
        const b = s.bricks[k], x0 = b.c * BW, y0 = b.y;
        if (s.x + R > x0 && s.x - R < x0 + BW && s.y + R > y0 && s.y - R < y0 + BH) {
          const side = Math.min(Math.abs(s.x - x0), Math.abs(s.x - x0 - BW)) < Math.min(Math.abs(s.y - y0), Math.abs(s.y - y0 - BH));
          if (side) s.vx = -s.vx;
          else s.vy = -s.vy;
          breakAt(s, k);
          break;
        }
      }
    }
    const v = Math.hypot(s.vx, s.vy);
    if (v > 0.03) (s.vx *= 0.03 / v), (s.vy *= 0.03 / v);
    if (s.y > H + 0.05) {
      if (--s.balls <= 0) return void (s.dead = true);
      s.wait = 60;
    }
  },
  over: (s) => s.dead,
  score: (s) => s.score,
  draw(ctx, s, w, h, th: Theme) {
    const sc = Math.min(w / W, h / H), ox = (w - W * sc) / 2;
    const X = (x: number) => ox + x * sc, Y = (y: number) => y * sc;
    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, w, h);
    // 캐비닛 장식: 사선 램프 줄무늬
    ctx.strokeStyle = th.soft;
    ctx.lineWidth = 8;
    for (let k = -4; k < 12; k++) {
      ctx.beginPath();
      ctx.moveTo(X(k * 0.15), Y(0.6));
      ctx.lineTo(X(k * 0.15 + 0.5), Y(1.1));
      ctx.stroke();
    }
    ctx.strokeStyle = th.hot;
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(DANGER));
    ctx.lineTo(X(W), Y(DANGER));
    ctx.stroke();
    ctx.setLineDash([]);
    for (const b of s.bricks) {
      ctx.fillStyle = COLORS[b.color];
      ctx.fillRect(X(b.c * BW) + 2, Y(b.y) + 2, BW * sc - 4, BH * sc - 4);
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.fillRect(X(b.c * BW) + 4, Y(b.y) + 4, BW * sc - 8, 3);
    }
    // 경사로와 날개 (크롬)
    ctx.lineCap = 'round';
    ctx.strokeStyle = th.muted;
    ctx.lineWidth = 6;
    for (const [a, b] of [[{ x: 0, y: 1.12 }, LEFT], [{ x: W, y: 1.12 }, RIGHT]] as const) {
      ctx.beginPath();
      ctx.moveTo(X(a.x), Y(a.y));
      ctx.lineTo(X(b.x), Y(b.y));
      ctx.stroke();
    }
    ctx.strokeStyle = s.recharge > 0 && s.flip === 0 ? '#77779a' : '#d9d9e8';
    ctx.lineWidth = 10;
    for (const side of [-1, 1] as const) {
      const p = side < 0 ? LEFT : RIGHT, q = tip(side, s.angle);
      ctx.beginPath();
      ctx.moveTo(X(p.x), Y(p.y));
      ctx.lineTo(X(q.x), Y(q.y));
      ctx.stroke();
    }
    if (s.wait === 0) {
      ctx.fillStyle = th.ink;
      ctx.beginPath();
      ctx.arc(X(s.x), Y(s.y), R * sc, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = th.accent;
    ctx.font = `800 ${Math.round(sc * 0.07)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(s.score), X(0.03), Y(1.36));
    ctx.textAlign = 'right';
    ctx.fillStyle = th.ink;
    ctx.fillText('●'.repeat(s.balls), X(0.97), Y(1.36));
    if (s.chainShow && s.t - s.chainShow.t < 70) {
      ctx.textAlign = 'center';
      ctx.fillStyle = th.accent;
      ctx.font = `800 ${Math.round(sc * 0.1)}px system-ui, sans-serif`;
      ctx.fillText(`연쇄 ${s.chainShow.n}!`, X(W / 2), Y(0.75));
    }
  },
};

export const pinRandom: Bot<PinState> = { name: '막누르기', act: (_s, rng) => ({ tap: rng() < 1 / 35, dir: 0 }) };

/** 봇: 공이 날개(쉬는 자리)에 닿기 직전이거나 얹혀 있으면 친다. 날개 끝 쪽일수록 더 높이 쳐 올린다 */
export const pinSmart: Bot<PinState> = {
  name: '때맞춰 치기',
  act(s) {
    if (s.wait > 0 || s.recharge > 0 || s.y < 1.0) return { tap: false, dir: 0 };
    const side = s.x < W / 2 ? -1 : 1, p = side < 0 ? LEFT : RIGHT, q = tip(side, REST);
    const dx = q.x - p.x, dy = q.y - p.y, L2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((s.x - p.x) * dx + (s.y - p.y) * dy) / L2));
    const d = Math.hypot(s.x - (p.x + t * dx), s.y - (p.y + t * dy));
    return { tap: t > 0.25 && d < R + 0.02 + Math.max(0, s.vy) * 5, dir: 0 };
  },
};
