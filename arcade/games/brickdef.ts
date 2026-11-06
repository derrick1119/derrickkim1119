/**
 * 벽돌 수비대 — 벽돌깨기 × 타워 디펜스 × 랜덤 뽑기.
 * 비틀기: 벽돌이 가만히 있지 않고 적처럼 줄지어 내려온다(디펜스). 공을 놓쳐도 바로 지지 않지만 벽돌이 한 줄 내려오고,
 * 벽돌이 바닥 선을 넘으면 진다. 벽돌을 깰 때마다 주사위 게이지가 차고, 차면 무작위 강화가 터진다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';

const W = 1, H = 1.5, COLS = 7, BW = W / COLS, BH = 0.06;
const PADDLE_Y = 1.38, PADDLE_W = 0.24, PADDLE_SPEED = 0.022, LINE_Y = 1.22;
const BALL_R = 0.018, BALL_V = 0.0125, GAUGE = 8;

export type Power = '분열' | '관통' | '폭발';
interface Ball { x: number; y: number; vx: number; vy: number; pierce: number }
interface Brick { col: number; y: number; hp: number; max: number }
export interface BrickState {
  rng: Rng;
  t: number;
  px: number;
  balls: Ball[];
  bricks: Brick[];
  respawn: number;
  nextRow: number;
  rowEvery: number;
  gauge: number;
  bomb: number;
  lastPower: { name: Power; t: number } | null;
  score: number;
  dead: boolean;
}

function addRow(s: BrickState) {
  for (const b of s.bricks) b.y += BH + 0.012;
  const level = 1 + Math.floor(s.t / (60 * 25));
  for (let c = 0; c < COLS; c++) {
    if (s.rng() < 0.35) continue;
    const hp = 1 + Math.floor(s.rng() * Math.min(level, 4));
    s.bricks.push({ col: c, y: 0.06, hp, max: hp });
  }
}

const serve = (s: BrickState): Ball => ({ x: s.px, y: PADDLE_Y - 0.03, vx: BALL_V * (s.rng() < 0.5 ? -0.6 : 0.6), vy: -BALL_V * 0.8, pierce: 0 });

function roll(s: BrickState) {
  const powers: Power[] = ['분열', '관통', '폭발'];
  const p = powers[Math.floor(s.rng() * 3)];
  s.lastPower = { name: p, t: s.t };
  if (p === '분열' && s.balls.length) {
    const b = s.balls[Math.floor(s.rng() * s.balls.length)];
    s.balls.push({ ...b, vx: -b.vx, pierce: 0 });
  } else if (p === '관통') for (const b of s.balls) b.pierce = 60 * 5;
  else s.bomb++;
}

function hitBrick(s: BrickState, k: number) {
  const br = s.bricks[k];
  const dmg = (i: number) => {
    const b = s.bricks[i];
    if (!b || b.hp <= 0) return;
    if (--b.hp <= 0) {
      s.score++;
      if (++s.gauge >= GAUGE) (s.gauge = 0), roll(s);
    }
  };
  if (s.bomb > 0) {
    s.bomb--;
    s.bricks.forEach((b, i) => Math.abs(b.col - br.col) <= 1 && Math.abs(b.y - br.y) < BH * 1.8 && dmg(i));
  } else dmg(k);
  s.bricks = s.bricks.filter((b) => b.hp > 0);
}

export const brickdef: GameDef<BrickState> = {
  id: 'brickdef',
  name: '벽돌 수비대',
  genes: ['brick', 'defense', 'gacha'],
  twist: '벽돌이 적처럼 줄지어 내려오고, 깰 때마다 주사위 게이지가 차서 무작위 강화가 터진다',
  rules: ['좌우로 받침대를 움직여 공을 튕기세요.', '벽돌이 빨간 선을 넘으면 끝. 공을 놓치면 벽돌이 두 줄 내려와요.', '벽돌 8개마다 주사위: 분열·관통·폭발 중 하나!'],
  controls: 'leftright',
  create(seed) {
    const s: BrickState = {
      rng: mulberry32(seed), t: 0, px: W / 2, balls: [], bricks: [], respawn: 0, nextRow: 0, rowEvery: 60 * 7,
      gauge: 0, bomb: 0, lastPower: null, score: 0, dead: false,
    };
    addRow(s), addRow(s), addRow(s);
    s.balls.push(serve(s));
    return s;
  },
  step(s, input: Input) {
    if (s.dead) return;
    s.t++;
    // 받침대
    if (input.aim !== undefined) {
      const target = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, input.aim * W));
      s.px += Math.max(-PADDLE_SPEED, Math.min(PADDLE_SPEED, target - s.px));
    } else s.px = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, s.px + input.dir * PADDLE_SPEED));
    // 벽돌 행군
    if (++s.nextRow >= s.rowEvery) {
      s.nextRow = 0;
      s.rowEvery = Math.max(60 * 3, s.rowEvery - 8);
      addRow(s);
    }
    if (s.bricks.some((b) => b.y + BH > LINE_Y)) return void (s.dead = true);
    // 공
    for (const b of s.balls) {
      b.x += b.vx;
      b.y += b.vy;
      if (b.pierce > 0) b.pierce--;
      if (b.x < BALL_R || b.x > W - BALL_R) (b.vx = -b.vx), (b.x = Math.max(BALL_R, Math.min(W - BALL_R, b.x)));
      if (b.y < BALL_R) (b.vy = Math.abs(b.vy)), (b.y = BALL_R);
      if (b.vy > 0 && b.y > PADDLE_Y - BALL_R && b.y < PADDLE_Y + 0.02 && Math.abs(b.x - s.px) < PADDLE_W / 2 + BALL_R) {
        const off = (b.x - s.px) / (PADDLE_W / 2);
        // 정중앙으로 받아도 완전히 수직으로는 안 튄다 (같은 칸만 오가는 지루한 왕복 방지)
        let ang = off * 1.05;
        if (Math.abs(ang) < 0.18) ang = ang < 0 || (ang === 0 && s.rng() < 0.5) ? -0.18 : 0.18;
        b.vx = BALL_V * Math.sin(ang);
        b.vy = -BALL_V * Math.cos(ang);
      }
      for (let k = 0; k < s.bricks.length; k++) {
        const br = s.bricks[k], x0 = br.col * BW, y0 = br.y;
        if (b.x + BALL_R > x0 && b.x - BALL_R < x0 + BW && b.y + BALL_R > y0 && b.y - BALL_R < y0 + BH) {
          if (b.pierce === 0) {
            const fromSide = Math.min(Math.abs(b.x - x0), Math.abs(b.x - x0 - BW)) < Math.min(Math.abs(b.y - y0), Math.abs(b.y - y0 - BH));
            if (fromSide) b.vx = -b.vx;
            else b.vy = -b.vy;
          }
          hitBrick(s, k);
          break;
        }
      }
    }
    s.balls = s.balls.filter((b) => b.y < H + 0.05);
    if (s.balls.length === 0) {
      // 공을 놓치면 벌칙: 벽돌이 한 줄 더 내려온다
      if (s.respawn === 0) (s.respawn = 90), addRow(s), addRow(s), (s.nextRow = 0);
      else if (--s.respawn === 0) s.balls.push(serve(s));
    }
  },
  over: (s) => s.dead,
  score: (s) => s.score,
  draw(ctx, s, w, h, th: Theme) {
    const sc = Math.min(w / W, h / H), ox = (w - W * sc) / 2;
    const X = (x: number) => ox + x * sc, Y = (y: number) => y * sc;
    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = th.hot;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(X(0), Y(LINE_Y));
    ctx.lineTo(X(W), Y(LINE_Y));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(BH * sc * 0.6)}px system-ui, sans-serif`;
    for (const b of s.bricks) {
      ctx.fillStyle = b.hp >= 3 ? th.ink : b.hp === 2 ? th.accent : th.muted;
      ctx.fillRect(X(b.col * BW) + 2, Y(b.y), BW * sc - 4, BH * sc);
      ctx.fillStyle = th.bg;
      ctx.fillText(String(b.hp), X(b.col * BW + BW / 2), Y(b.y + BH / 2));
    }
    for (const b of s.balls) {
      ctx.fillStyle = b.pierce > 0 ? th.hot : s.bomb > 0 ? th.accent : th.ink;
      ctx.beginPath();
      ctx.arc(X(b.x), Y(b.y), BALL_R * sc * (b.pierce > 0 ? 1.4 : 1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = th.ink;
    ctx.fillRect(X(s.px - PADDLE_W / 2), Y(PADDLE_Y), PADDLE_W * sc, 0.02 * sc);
    // 주사위 게이지
    ctx.fillStyle = th.soft;
    ctx.fillRect(X(0.04), Y(1.46), (W - 0.08) * sc, 0.018 * sc);
    ctx.fillStyle = th.accent;
    ctx.fillRect(X(0.04), Y(1.46), (W - 0.08) * sc * (s.gauge / GAUGE), 0.018 * sc);
    ctx.fillStyle = th.ink;
    ctx.textAlign = 'left';
    ctx.font = `700 ${Math.round(0.05 * sc)}px system-ui, sans-serif`;
    ctx.fillText(String(s.score), X(0.03), Y(LINE_Y + 0.07));
    if (s.lastPower && s.t - s.lastPower.t < 90) {
      ctx.textAlign = 'center';
      ctx.fillStyle = th.hot;
      ctx.font = `800 ${Math.round(0.08 * sc)}px system-ui, sans-serif`;
      ctx.fillText(`🎲 ${s.lastPower.name}!`, X(W / 2), Y(0.75));
    }
  },
};

export const brickIdle: Bot<BrickState> = { name: '가만히', act: () => ({ tap: false, dir: 0 }) };

/** 봇: 가장 먼저 내려올 공 아래로 간다 (잘하는 사람) */
export const brickChase: Bot<BrickState> = {
  name: '공 따라가기',
  act(s) {
    const down = s.balls.filter((b) => b.vy > 0);
    if (!down.length) return { tap: false, dir: 0, aim: 0.5 };
    const b = down.reduce((a, c) => ((PADDLE_Y - c.y) / c.vy < (PADDLE_Y - a.y) / a.vy ? c : a));
    // 바닥 도착 지점을 벽 반사까지 예측
    let x = b.x + b.vx * ((PADDLE_Y - b.y) / b.vy);
    const span = W - 2 * BALL_R;
    x = ((x - BALL_R) % (2 * span) + 2 * span) % (2 * span);
    x = BALL_R + (x > span ? 2 * span - x : x);
    // 벽돌이 많은 쪽으로 튕기도록 받침대 중심을 살짝 반대편에 둔다
    const left = s.bricks.filter((k) => k.col < COLS / 2).length, right = s.bricks.length - left;
    x += right > left ? -0.07 : 0.07;
    return { tap: false, dir: 0, aim: Math.max(0, Math.min(1, x / W)) };
  },
};
