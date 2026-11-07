/**
 * 먹보 당구 — 당구 × 덩치 키우기 × 꾹 눌렀다 떼기 × 콤보 피버. (0020, 추천기 1번)
 * 내 공 둘레의 화살표가 저절로 돈다. 꾹 누르면 힘이 차고, 떼는 순간 화살표 방향으로 날아간다.
 * 나보다 작은 공은 먹고 커지고, 큰 공에 부딪히면 작아진다. 한 번 쏴서 셋 이상 먹으면 피버.
 * 비틀기: 당구에서 공은 맞혀 넣는 대상이었는데, 여기선 내 공이 먹는다 — 테이블이 계속 차오른다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';

const W = 1, H = 1.5, FRICTION = 0.984, FULL = 16, SPIN = 2.4 / 60, CHARGE = 1 / 55;
export const rad = (m: number) => 0.028 + 0.013 * Math.sqrt(m);
interface Ball { x: number; y: number; vx: number; vy: number; m: number }
export interface PoolState {
  rng: Rng;
  t: number;
  me: Ball;
  aim: number;
  charge: number;
  balls: Ball[];
  spawnIn: number;
  combo: number;
  fever: number;
  score: number;
  hitAt: number;
  dead: boolean;
}

const speed = (b: Ball) => Math.hypot(b.vx, b.vy);
export const resting = (s: PoolState) => speed(s.me) < 0.0015;

function spawn(s: PoolState) {
  const r = s.rng();
  const m = Math.max(1, Math.round(s.me.m * (0.3 + s.rng() * 1.2)));
  // 테이블 가장자리 한 곳에서 굴러 들어온다
  const side = Math.floor(r * 4), u = 0.1 + s.rng() * 0.8;
  const p = side === 0 ? { x: u * W, y: 0.05 } : side === 1 ? { x: u * W, y: H - 0.05 } : side === 2 ? { x: 0.05, y: u * H } : { x: W - 0.05, y: u * H };
  const toward = Math.atan2(H / 2 - p.y, W / 2 - p.x) + (s.rng() - 0.5);
  s.balls.push({ ...p, vx: Math.cos(toward) * 0.0025, vy: Math.sin(toward) * 0.0025, m });
  s.spawnIn = Math.max(45, Math.round(175 - s.t / 40 - s.rng() * 30));
}

function move(b: Ball) {
  b.x += b.vx;
  b.y += b.vy;
  b.vx *= FRICTION;
  b.vy *= FRICTION;
  const r = rad(b.m);
  if (b.x < r) (b.x = r), (b.vx = Math.abs(b.vx));
  if (b.x > W - r) (b.x = W - r), (b.vx = -Math.abs(b.vx));
  if (b.y < r) (b.y = r), (b.vy = Math.abs(b.vy));
  if (b.y > H - r) (b.y = H - r), (b.vy = -Math.abs(b.vy));
}

/** 두 공을 떼어 놓고 속도를 주고받는다 (질량 반영 탄성 충돌) */
function bounce(a: Ball, b: Ball) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6, nx = dx / d, ny = dy / d;
  const overlap = rad(a.m) + rad(b.m) - d;
  a.x -= (nx * overlap) / 2, a.y -= (ny * overlap) / 2, b.x += (nx * overlap) / 2, b.y += (ny * overlap) / 2;
  const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  if (rel <= 0) return;
  const k = (2 * rel) / (a.m + b.m);
  a.vx -= k * b.m * nx, a.vy -= k * b.m * ny, b.vx += k * a.m * nx, b.vy += k * a.m * ny;
}

export const pool: GameDef<PoolState> = {
  id: 'pool',
  name: '먹보 당구',
  genes: ['billiards', 'absorb', 'hold', 'combo'],
  twist: '당구에서 공은 맞혀 넣는 대상이었는데, 여기선 내 공이 작은 공을 먹고 커진다 — 테이블은 계속 차오른다',
  rules: ['화살표가 저절로 돌아요. 꾹 눌러 힘을 모으고, 떼면 공이 날아갑니다.', '작은 공은 먹고 커지고, 큰 공을 들이받으면 작아져요. 한 번에 셋 먹으면 피버!', '내 공이 다 작아지거나 테이블이 공으로 꽉 차면 끝.'],
  controls: 'hold',
  aspect: 1.5,
  art: {
    concept: '밤의 당구장',
    mood: '초록 펠트 위 노란 조명 한 줄기, 나무 테두리. 공마다 크기 숫자가 박혀 있고, 피버엔 펠트가 금빛으로 달아오른다.',
    palette: { bg: '#0d3b2e', ink: '#f4ecd8', muted: '#5e8c78', accent: '#ffd166', hot: '#ef476f', soft: '#6b4226' },
  },
  create(seed) {
    const s: PoolState = {
      rng: mulberry32(seed), t: 0, me: { x: W / 2, y: H * 0.6, vx: 0, vy: 0, m: 4 }, aim: -Math.PI / 2, charge: 0, balls: [],
      spawnIn: 30, combo: 0, fever: 0, score: 0, hitAt: -99, dead: false,
    };
    for (let k = 0; k < 4; k++) spawn(s);
    return s;
  },
  step(s, input: Input) {
    if (s.dead) return;
    s.t++;
    s.aim += SPIN;
    if (s.fever > 0) s.fever--;
    // 멈춰 있을 때만 힘을 모으고 쏠 수 있다
    if (resting(s)) {
      if (input.hold) s.charge = Math.min(1, s.charge + CHARGE);
      else if (s.charge > 0) {
        const v = 0.004 + 0.03 * s.charge;
        s.me.vx = Math.cos(s.aim) * v;
        s.me.vy = Math.sin(s.aim) * v;
        s.charge = 0;
        s.combo = 0;
      }
    } else s.charge = 0;
    if (--s.spawnIn <= 0) spawn(s);
    move(s.me);
    for (const b of s.balls) move(b);
    for (let i = 0; i < s.balls.length; i++) for (let j = i + 1; j < s.balls.length; j++) {
      const a = s.balls[i], b = s.balls[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) < rad(a.m) + rad(b.m)) bounce(a, b);
    }
    for (let i = s.balls.length - 1; i >= 0; i--) {
      const b = s.balls[i];
      if (Math.hypot(b.x - s.me.x, b.y - s.me.y) >= rad(b.m) + rad(s.me.m)) continue;
      if (b.m < s.me.m || s.fever > 0) {
        s.balls.splice(i, 1);
        s.combo++;
        s.me.m += Math.sqrt(b.m) * (s.fever > 0 ? 0.5 : 0.35);
        s.score += s.combo;
        if (s.combo === 3) s.fever = 60 * 3;
      } else {
        // 내가 들이받았을 때만 작아진다 (가만히 있는데 굴러온 공은 튕겨 낼 뿐)
        const mine = speed(s.me) > speed(b);
        bounce(s.me, b);
        if (mine) {
          s.me.m *= 0.75;
          s.hitAt = s.t;
          if (s.me.m < 1) return void (s.dead = true);
        }
      }
    }
    if (s.balls.length >= FULL) s.dead = true;
  },
  over: (s) => s.dead,
  score: (s) => Math.floor(s.score),
  draw(ctx, s, w, h, th: Theme) {
    const sc = Math.min(w / W, h / H), ox = (w - W * sc) / 2, oy = (h - H * sc) / 2;
    const X = (x: number) => ox + x * sc, Y = (y: number) => oy + y * sc;
    ctx.fillStyle = th.soft;
    ctx.fillRect(0, 0, w, h);
    const rail = 6;
    ctx.fillStyle = s.fever > 0 ? '#3b5a1e' : th.bg;
    ctx.fillRect(X(0) + rail, Y(0) + rail, W * sc - rail * 2, H * sc - rail * 2);
    // 위에서 떨어지는 조명
    const glow = ctx.createRadialGradient(X(W / 2), Y(H / 2), 10, X(W / 2), Y(H / 2), H * sc * 0.6);
    glow.addColorStop(0, s.fever > 0 ? 'rgba(255,209,102,.28)' : 'rgba(255,240,200,.12)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(X(0), Y(0), W * sc, H * sc);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const COLORS = ['#f4ecd8', '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#8338ec', '#ff7b00'];
    for (const b of s.balls) {
      const r = rad(b.m) * sc, big = b.m >= s.me.m && s.fever === 0;
      ctx.fillStyle = COLORS[Math.min(COLORS.length - 1, Math.floor(Math.log2(b.m + 1)))];
      ctx.beginPath();
      ctx.arc(X(b.x), Y(b.y), r, 0, Math.PI * 2);
      ctx.fill();
      if (big) {
        ctx.strokeStyle = th.hot;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(X(b.x), Y(b.y), r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.font = `800 ${Math.round(Math.max(10, r * 0.7))}px system-ui, sans-serif`;
      ctx.fillText(String(b.m), X(b.x), Y(b.y) + 1);
    }
    // 내 공 + 겨냥 화살표 + 힘 게이지
    const mr = rad(s.me.m) * sc, mx = X(s.me.x), my = Y(s.me.y);
    if (resting(s)) {
      const len = mr + sc * (0.08 + 0.18 * s.charge);
      ctx.strokeStyle = th.accent;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + Math.cos(s.aim) * len, my + Math.sin(s.aim) * len);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = s.t - s.hitAt < 12 ? th.hot : th.ink;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = th.bg;
    ctx.font = `800 ${Math.round(Math.max(11, mr * 0.75))}px system-ui, sans-serif`;
    ctx.fillText(String(Math.floor(s.me.m)), mx, my + 1);
    if (s.charge > 0) {
      ctx.fillStyle = th.accent;
      ctx.fillRect(mx - mr, my + mr + 6, mr * 2 * s.charge, 4);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = th.ink;
    ctx.font = `800 ${Math.round(sc * 0.065)}px system-ui, sans-serif`;
    ctx.fillText(String(pool.score(s)), X(0) + 12, Y(0) + 10);
    ctx.textAlign = 'right';
    ctx.font = `700 ${Math.round(sc * 0.04)}px system-ui, sans-serif`;
    ctx.fillStyle = s.balls.length >= FULL - 3 ? th.hot : th.muted;
    ctx.fillText(`공 ${s.balls.length} / ${FULL}`, X(W) - 12, Y(0) + 12);
    if (s.fever > 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = th.accent;
      ctx.font = `800 ${Math.round(sc * 0.09)}px system-ui, sans-serif`;
      ctx.fillText('🔥 피버! 다 먹을 수 있어요', X(W / 2), Y(0.12));
    }
  },
};

/** 봇: 아무 때나 꾹 눌렀다가 아무 때나 뗀다 */
export const poolRandom: Bot<PoolState> = {
  name: '막누르기',
  act: (s, rng) => ({ tap: false, hold: s.charge > 0 ? rng() > 1 / 30 : rng() < 1 / 25, dir: 0 }),
};

/** 봇: 길을 막는 큰 공이 없는 가장 탐나는 작은 공을 고르고, 필요한 만큼 힘을 모아 화살표가 그쪽을 볼 때 뗀다 */
export const poolSmart: Bot<PoolState> = {
  name: '겨냥하기',
  act(s) {
    if (!resting(s)) return { tap: false, hold: false, dir: 0 };
    const blocked = (tx: number, ty: number) =>
      s.balls.some((b) => {
        if (b.m < s.me.m) return false;
        const dx = tx - s.me.x, dy = ty - s.me.y, L = Math.hypot(dx, dy) || 1;
        const t = ((b.x - s.me.x) * dx + (b.y - s.me.y) * dy) / (L * L);
        if (t < 0 || t > 1.2) return false;
        return Math.hypot(s.me.x + t * dx - b.x, s.me.y + t * dy - b.y) < rad(b.m) + rad(s.me.m);
      });
    const prey = s.balls.filter((b) => b.m < s.me.m && !blocked(b.x, b.y));
    if (!prey.length) return { tap: false, hold: s.charge < 0.25, dir: 0 };
    const tgt = prey.reduce((a, b) => (b.m / Math.hypot(b.x - s.me.x, b.y - s.me.y) > a.m / Math.hypot(a.x - s.me.x, a.y - s.me.y) ? b : a));
    const d = Math.hypot(tgt.x - s.me.x, tgt.y - s.me.y);
    const need = Math.max(0.05, Math.min(1, (d + 0.12 - 0.25) / 1.9));
    const want = Math.atan2(tgt.y - s.me.y, tgt.x - s.me.x);
    const diff = Math.abs(((want - s.aim) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
    if (s.charge >= need && diff < 0.09) return { tap: false, hold: false, dir: 0 };
    return { tap: false, hold: true, dir: 0 };
  },
};
