/**
 * 링 드리프트 — 드리프트 × 탄막 서바이버 · 꾹 눌렀다 떼기 · 좁아지는 판. (0022)
 * 차는 멈추지 않고 앞으로 달린다. 꾹 누르고 있는 동안 오른쪽으로 꺾이며 미끄러진다(드리프트).
 * 총은 가까운 적을 저절로 쏜다. 경기장 고리는 점점 좁아지고, 고리 밖에 있으면 차가 상한다.
 * 비틀기: 서바이버인데 멈출 수도 왼쪽으로 꺾을 수도 없다 — 언제 얼마나 꺾을지만이 실력.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';

const SPEED = 0.55 / 60, TURN = 3.4 / 60, GRIP = 0.09, SLIP = 0.025, CAR = 0.035, FOE = 0.03, BULLET_V = 1.4 / 60;
const RANGE = 0.5, HP_MAX = 5, CONE = 0.6, GEM = 0.05;
export type Perk = '연사' | '쌍발' | '수리';
interface Foe { x: number; y: number; v: number; hp: number }
interface Shot { x: number; y: number; vx: number; vy: number; life: number }
export interface DriftState {
  rng: Rng;
  t: number;
  x: number;
  y: number;
  heading: number;
  vx: number;
  vy: number;
  holding: boolean;
  ring: number;
  foes: Foe[];
  gems: { x: number; y: number; life: number }[];
  gemCount: number;
  shots: Shot[];
  skids: { x: number; y: number }[];
  spawnIn: number;
  cool: number;
  fireEvery: number;
  guns: number;
  hp: number;
  burn: number;
  kills: number;
  hitAt: number;
  last: { name: Perk; t: number } | null;
  dead: boolean;
}

export const ringAt = (t: number) => Math.max(0.42, 0.95 - (t / 3600) * 0.28);

function spawn(s: DriftState) {
  const a = s.rng() * Math.PI * 2, lvl = s.t / 3600;
  s.foes.push({ x: Math.cos(a) * s.ring, y: Math.sin(a) * s.ring, v: (0.3 + 0.12 * lvl + s.rng() * 0.08) / 60, hp: 1 + (s.rng() < Math.min(0.5, lvl * 0.35) ? 1 : 0) });
  s.spawnIn = Math.max(8, Math.round(56 - 34 * lvl - s.rng() * 16));
}

function perk(s: DriftState) {
  const all: Perk[] = s.hp < HP_MAX ? ['연사', '쌍발', '수리'] : ['연사', '쌍발'];
  const p = all[Math.floor(s.rng() * all.length)];
  s.last = { name: p, t: s.t };
  if (p === '연사') s.fireEvery = Math.max(8, s.fireEvery - 4);
  else if (p === '쌍발') s.guns = Math.min(4, s.guns + 1);
  else s.hp++;
}

export const drift: GameDef<DriftState> = {
  id: 'drift',
  name: '링 드리프트',
  genes: ['drift', 'survivor', 'hold', 'shrink'],
  twist: '서바이버인데 차는 멈추지도 왼쪽으로 꺾지도 못한다 — 꾹 누르면 오른쪽으로 미끄러질 뿐, 경기장 벽은 점점 조여 온다',
  rules: ['차는 저절로 달려요. 꾹 누르고 있으면 오른쪽으로 미끄러지며 꺾여요.', '총은 차 앞쪽의 적을 저절로 쏴요. 적에 부딪히면 차가 상해요.', '쓰러진 적의 보석을 차로 주워요. 6개마다 무작위 강화! 경기장은 점점 좁아져요.'],
  controls: 'hold',
  art: {
    concept: '해 질 녘 사막 서킷',
    mood: '보랏빛 노을 아래 모래 경기장, 주황 고리가 조여 온다. 드리프트할 때마다 타이어 자국이 남는다.',
    palette: { bg: '#2b1a33', ink: '#ffd6a5', muted: '#7a5c7d', accent: '#ff9f1c', hot: '#e63946', soft: '#3d2645' },
  },
  create(seed) {
    return {
      rng: mulberry32(seed), t: 0, x: 0, y: 0.3, heading: 0, vx: SPEED, vy: 0, holding: false, ring: ringAt(0), foes: [], gems: [], gemCount: 0, shots: [], skids: [],
      spawnIn: 60, cool: 0, fireEvery: 26, guns: 1, hp: HP_MAX, burn: 0, kills: 0, hitAt: -99, last: null, dead: false,
    };
  },
  step(s, input: Input) {
    if (s.dead) return;
    s.t++;
    s.holding = !!input.hold;
    s.ring = ringAt(s.t);
    if (s.holding) s.heading += TURN;
    // 드리프트: 누르는 동안엔 속도가 머리 방향을 늦게 따라간다
    const k = s.holding ? SLIP : GRIP;
    s.vx += (Math.cos(s.heading) * SPEED - s.vx) * k;
    s.vy += (Math.sin(s.heading) * SPEED - s.vy) * k;
    const v = Math.hypot(s.vx, s.vy) || 1;
    s.vx = (s.vx / v) * SPEED;
    s.vy = (s.vy / v) * SPEED;
    s.x += s.vx;
    s.y += s.vy;
    if (s.holding && s.t % 2 === 0) s.skids.push({ x: s.x, y: s.y });
    if (s.skids.length > 140) s.skids.shift();
    // 고리는 벽: 부딪히면 안쪽으로 튕겨 나온다 (피해 없음 — 좁아질수록 피할 자리가 줄어드는 게 압박)
    const r = Math.hypot(s.x, s.y);
    if (r > s.ring - CAR) {
      const nx = s.x / r, ny = s.y / r, dot = s.vx * nx + s.vy * ny;
      if (dot > 0) (s.vx -= 2 * dot * nx), (s.vy -= 2 * dot * ny);
      s.x = nx * (s.ring - CAR);
      s.y = ny * (s.ring - CAR);
      s.heading = Math.atan2(s.vy, s.vx);
      s.burn++;
    }
    if (--s.spawnIn <= 0) spawn(s);
    if (--s.cool <= 0) {
      // 총은 차가 향한 앞쪽(±35°)만 쏜다 — 꺾는 것이 곧 조준
      const ahead = (f: Foe) => {
        const a = Math.atan2(f.y - s.y, f.x - s.x) - s.heading;
        return Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < CONE;
      };
      const near = s.foes.filter(ahead).map((f) => ({ f, d: Math.hypot(f.x - s.x, f.y - s.y) })).filter((q) => q.d < RANGE).sort((a, b) => a.d - b.d).slice(0, s.guns);
      for (const q of near) s.shots.push({ x: s.x, y: s.y, vx: ((q.f.x - s.x) / q.d) * BULLET_V, vy: ((q.f.y - s.y) / q.d) * BULLET_V, life: 40 });
      s.cool = near.length ? s.fireEvery : 1;
    }
    for (const b of s.shots) (b.x += b.vx), (b.y += b.vy), b.life--;
    for (let i = s.foes.length - 1; i >= 0; i--) {
      const f = s.foes[i], d = Math.hypot(s.x - f.x, s.y - f.y) || 1;
      f.x += ((s.x - f.x) / d) * f.v;
      f.y += ((s.y - f.y) / d) * f.v;
      if (d < CAR + FOE) {
        s.foes.splice(i, 1);
        s.hp--;
        s.hitAt = s.t;
        continue;
      }
      for (const b of s.shots) {
        if (b.life <= 0 || Math.hypot(b.x - f.x, b.y - f.y) > FOE + 0.012) continue;
        b.life = 0;
        if (--f.hp <= 0) {
          s.foes.splice(i, 1);
          s.kills++;
          s.gems.push({ x: f.x, y: f.y, life: 60 * 8 });
          break;
        }
      }
    }
    s.shots = s.shots.filter((b) => b.life > 0);
    // 보석: 차로 지나가야 줍는다, 8초 뒤 사라짐. 6개마다 무작위 강화
    for (const g of s.gems) {
      g.life--;
      if (Math.hypot(g.x - s.x, g.y - s.y) < CAR + GEM) {
        g.life = 0;
        if (++s.gemCount % 6 === 0) perk(s);
      }
    }
    s.gems = s.gems.filter((g) => g.life > 0 && Math.hypot(g.x, g.y) < s.ring);
    if (s.hp <= 0) s.dead = true;
  },
  over: (s) => s.dead,
  score: (s) => s.kills + s.gemCount * 2,
  draw(ctx, s, w, h, th: Theme) {
    const sc = (Math.min(w, h) / 2) * 0.98, cx = w / 2, cy = h / 2;
    const X = (x: number) => cx + x * sc, Y = (y: number) => cy + y * sc;
    // 노을 하늘 → 모래
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, sc * 1.4);
    g.addColorStop(0, '#5a3d4f');
    g.addColorStop(1, th.bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // 경기장 안쪽 모래
    ctx.fillStyle = '#c98a5a';
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.arc(cx, cy, s.ring * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(cx, cy, s.ring * sc, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // 타이어 자국
    ctx.fillStyle = 'rgba(30,15,30,.45)';
    for (const p of s.skids) ctx.fillRect(X(p.x) - 2, Y(p.y) - 2, 4, 4);
    for (const g of s.gems) {
      ctx.fillStyle = '#7cf2ff';
      ctx.globalAlpha = g.life < 90 ? 0.4 + 0.4 * Math.abs(Math.sin(g.life / 5)) : 1;
      ctx.beginPath();
      ctx.moveTo(X(g.x), Y(g.y) - GEM * sc * 0.6);
      ctx.lineTo(X(g.x) + GEM * sc * 0.45, Y(g.y));
      ctx.lineTo(X(g.x), Y(g.y) + GEM * sc * 0.6);
      ctx.lineTo(X(g.x) - GEM * sc * 0.45, Y(g.y));
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const f of s.foes) {
      ctx.fillStyle = th.hot;
      ctx.beginPath();
      ctx.arc(X(f.x), Y(f.y), FOE * sc * (f.hp > 1 ? 1.3 : 1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = th.ink;
    for (const b of s.shots) ctx.fillRect(X(b.x) - 2, Y(b.y) - 2, 4, 4);
    // 차 (머리 방향으로 돌린 사각형)
    ctx.save();
    ctx.translate(X(s.x), Y(s.y));
    ctx.rotate(s.heading);
    ctx.fillStyle = s.t - s.hitAt < 10 ? th.hot : th.accent;
    ctx.fillRect(-CAR * sc, -CAR * sc * 0.6, CAR * sc * 2, CAR * sc * 1.2);
    ctx.fillStyle = th.bg;
    ctx.fillRect(CAR * sc * 0.2, -CAR * sc * 0.4, CAR * sc * 0.5, CAR * sc * 0.8);
    ctx.restore();
    ctx.fillStyle = th.ink;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.font = `800 ${Math.round(sc * 0.12)}px system-ui, sans-serif`;
    ctx.fillText(String(drift.score(s)), 10, 8);
    ctx.textAlign = 'right';
    ctx.font = `700 ${Math.round(sc * 0.07)}px system-ui, sans-serif`;
    ctx.fillStyle = th.hot;
    ctx.fillText('♥'.repeat(Math.max(0, s.hp)), w - 10, 10);
    if (s.last && s.t - s.last.t < 90) {
      ctx.textAlign = 'center';
      ctx.fillStyle = th.accent;
      ctx.font = `800 ${Math.round(sc * 0.13)}px system-ui, sans-serif`;
      ctx.fillText(`🎲 ${s.last.name}!`, cx, cy - sc * 0.75);
    }
  },
};

/** 봇: 아무 때나 누르고 아무 때나 뗀다 */
export const driftRandom: Bot<DriftState> = { name: '막누르기', act: (s, rng) => ({ tap: false, hold: s.holding ? rng() > 1 / 25 : rng() < 1 / 30, dir: 0 }) };

/** 봇: 앞으로 0.6초 동안 "누르고 있기 / 떼고 있기 / 반만 누르기"를 각각 굴려 보고, 덜 다치고 더 잡는 쪽을 고른다 */
export const driftSmart: Bot<DriftState> = {
  name: '내다보기',
  act(s) {
    const plan = (pattern: (k: number) => boolean) => {
      const c: DriftState = { ...s, rng: () => 0.5, foes: s.foes.map((f) => ({ ...f })), gems: s.gems.map((g) => ({ ...g })), shots: s.shots.map((b) => ({ ...b })), skids: [], spawnIn: 999 };
      for (let k = 0; k < 36 && !c.dead; k++) drift.step(c, { tap: false, hold: pattern(k), dir: 0 });
      const crowd = c.foes.reduce((a, f) => a + 1 / (0.08 + Math.hypot(f.x - c.x, f.y - c.y)), 0);
      const gem = c.gems.reduce((a, g) => Math.min(a, Math.hypot(g.x - c.x, g.y - c.y)), 1);
      return (c.hp - s.hp) * 100 + (c.kills - s.kills) * 3 + (c.gemCount - s.gemCount) * 8 - gem * 3 - crowd * 0.4 - Math.hypot(c.x, c.y) * 2;
    };
    const hold = plan(() => true), free = plan(() => false), half = plan((k) => k < 12);
    return { tap: false, hold: Math.max(hold, half) > free + 0.01, dir: 0 };
  },
};
