/**
 * 궤도 수비 — 탄막 서바이버 × 타워 디펜스 × 원버튼.
 * 적이 사방에서 가운데 핵으로 걸어온다. 플레이어는 핵 둘레를 돌며 자동으로 쏘고, 몸으로 부딪혀 막는다.
 * 조작은 탭 하나: 공전 방향을 뒤집는다. 어느 쪽부터 막을지가 게임의 전부.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';

const CORE = 0.12, ORBIT = 0.38, BODY = 0.07, ENEMY_R = 0.04, BULLET_V = 1.3 / 60, RANGE = 0.32;
export type Upgrade = '연사' | '쌍발' | '가속';
interface Enemy { a: number; r: number; v: number; hp: number }
interface Shot { x: number; y: number; vx: number; vy: number; life: number }
export interface GuardState {
  rng: Rng;
  t: number;
  angle: number;
  dir: 1 | -1;
  omega: number;
  fireEvery: number;
  shots: number;
  cool: number;
  enemies: Enemy[];
  bullets: Shot[];
  spawnIn: number;
  kills: number;
  last: { name: Upgrade; t: number } | null;
  dead: boolean;
}

const pos = (a: number, r: number) => ({ x: Math.cos(a) * r, y: Math.sin(a) * r });
const wrap = (a: number) => ((a % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;

function spawn(s: GuardState) {
  const lvl = s.t / 3600; // 분 단위
  s.enemies.push({ a: s.rng() * Math.PI * 2, r: 1.05, v: (0.13 + 0.06 * lvl + s.rng() * 0.04) / 60, hp: 1 + (s.rng() < Math.min(0.6, lvl * 0.3) ? 1 : 0) });
  s.spawnIn = Math.max(14, Math.round(88 - 34 * lvl - s.rng() * 20));
}

function kill(s: GuardState, i: number) {
  s.enemies.splice(i, 1);
  if (++s.kills % 10 === 0) {
    const ups: Upgrade[] = ['연사', '쌍발', '가속'];
    const u = ups[Math.floor(s.rng() * 3)];
    s.last = { name: u, t: s.t };
    if (u === '연사') s.fireEvery = Math.max(8, s.fireEvery - 4);
    else if (u === '쌍발') s.shots = Math.min(4, s.shots + 1);
    else s.omega *= 1.12;
  }
}

export const guard: GameDef<GuardState> = {
  id: 'guard',
  name: '궤도 수비',
  genes: ['survivor', 'defense', 'onebutton'],
  twist: '서바이버인데 움직임은 "공전 방향" 하나뿐 — 사방에서 오는 적 중 어느 쪽을 먼저 막을지만 고른다',
  rules: ['누르면 도는 방향이 바뀝니다. 총은 가까운 적을 저절로 쏴요.', '적이 가운데 핵에 닿으면 끝. 몸으로 부딪혀도 막을 수 있어요.', '10마리마다 무작위 강화: 연사·쌍발·가속.'],
  controls: 'tap',
  art: {
    concept: '작은 행성 방어',
    mood: '깊은 우주, 고리를 두른 작은 초록 행성. 주황 운석이 쏟아지고 위성 하나가 궤도를 돈다.',
    palette: { bg: '#0a0e1f', ink: '#ff8a3d', muted: '#3b4470', accent: '#7cf2c4', hot: '#ff4d4d', soft: '#1c2547' },
  },
  create(seed) {
    const s: GuardState = {
      rng: mulberry32(seed), t: 0, angle: -Math.PI / 2, dir: 1, omega: 1.7 / 60, fireEvery: 34, shots: 1, cool: 0,
      enemies: [], bullets: [], spawnIn: 90, kills: 0, last: null, dead: false,
    };
    return s;
  },
  step(s, input: Input) {
    if (s.dead) return;
    s.t++;
    if (input.tap) s.dir = s.dir === 1 ? -1 : 1;
    s.angle = wrap(s.angle + s.dir * s.omega);
    if (--s.spawnIn <= 0) spawn(s);
    const me = pos(s.angle, ORBIT);
    // 자동 사격: 가까운 적부터
    if (--s.cool <= 0) {
      s.cool = s.fireEvery;
      const targets = s.enemies.map((e) => ({ e, p: pos(e.a, e.r) })).filter((q) => Math.hypot(q.p.x - me.x, q.p.y - me.y) < RANGE).sort((p, q) => Math.hypot(p.p.x - me.x, p.p.y - me.y) - Math.hypot(q.p.x - me.x, q.p.y - me.y));
      for (let k = 0; k < Math.min(s.shots, targets.length); k++) {
        const p = targets[k].p, d = Math.hypot(p.x - me.x, p.y - me.y) || 1;
        s.bullets.push({ x: me.x, y: me.y, vx: ((p.x - me.x) / d) * BULLET_V, vy: ((p.y - me.y) / d) * BULLET_V, life: 24 });
      }
      if (!targets.length) s.cool = 1; // 사거리 안에 적이 들어오면 바로 쏜다
    }
    for (const b of s.bullets) (b.x += b.vx), (b.y += b.vy), b.life--;
    for (let i = s.enemies.length - 1; i >= 0; i--) {
      const e = s.enemies[i];
      e.r -= e.v;
      if (e.r < CORE) return void (s.dead = true);
      const p = pos(e.a, e.r);
      if (Math.hypot(p.x - me.x, p.y - me.y) < BODY + ENEMY_R) {
        kill(s, i);
        continue;
      }
      for (const b of s.bullets) {
        if (b.life > 0 && Math.hypot(p.x - b.x, p.y - b.y) < ENEMY_R + 0.015) {
          b.life = 0;
          if (--e.hp <= 0) {
            kill(s, i);
            break;
          }
        }
      }
    }
    s.bullets = s.bullets.filter((b) => b.life > 0);
  },
  over: (s) => s.dead,
  score: (s) => s.kills,
  draw(ctx, s, w, h, th: Theme) {
    const sc = (Math.min(w, h) / 2) * 0.94, cx = w / 2, cy = h / 2;
    const X = (x: number) => cx + x * sc, Y = (y: number) => cy + y * sc;
    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, w, h);
    // 별: 위치는 고정(결정적), 천천히 반짝임
    for (let k = 0; k < 60; k++) {
      const sx = ((k * 7919) % 997) / 997, sy = ((k * 104729) % 991) / 991;
      ctx.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(s.t / 40 + k));
      ctx.fillStyle = th.muted;
      ctx.fillRect(sx * w, sy * h, k % 5 ? 1.5 : 2.5, k % 5 ? 1.5 : 2.5);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = th.soft;
    ctx.lineWidth = sc * 0.05;
    ctx.beginPath();
    ctx.arc(cx, cy, ORBIT * sc, 0, Math.PI * 2);
    ctx.stroke();
    // 행성 + 고리
    ctx.fillStyle = s.dead ? th.hot : th.accent;
    ctx.beginPath();
    ctx.arc(cx, cy, CORE * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, CORE * sc * 1.7, CORE * sc * 0.45, -0.35, 0, Math.PI * 2);
    ctx.stroke();
    for (const e of s.enemies) {
      const p = pos(e.a, e.r);
      // 운석 꼬리 (바깥쪽으로)
      const tail = pos(e.a, e.r + 0.09);
      ctx.strokeStyle = th.ink;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = ENEMY_R * sc;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(X(p.x), Y(p.y));
      ctx.lineTo(X(tail.x), Y(tail.y));
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = e.hp > 1 ? th.hot : th.ink;
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), ENEMY_R * sc * (e.hp > 1 ? 1.25 : 1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = th.accent;
    for (const b of s.bullets) ctx.fillRect(X(b.x) - 2, Y(b.y) - 2, 4, 4);
    const me = pos(s.angle, ORBIT);
    ctx.fillStyle = th.accent;
    ctx.beginPath();
    ctx.arc(X(me.x), Y(me.y), BODY * sc, 0, Math.PI * 2);
    ctx.fill();
    // 진행 방향 화살촉
    const ahead = pos(s.angle + s.dir * 0.28, ORBIT);
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(X(me.x), Y(me.y));
    ctx.lineTo(X(ahead.x), Y(ahead.y));
    ctx.stroke();
    ctx.fillStyle = th.bg;
    ctx.font = `800 ${Math.round(CORE * sc)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(s.kills), cx, cy);
    if (s.last && s.t - s.last.t < 90) {
      ctx.fillStyle = th.hot;
      ctx.font = `800 ${Math.round(sc * 0.14)}px system-ui, sans-serif`;
      ctx.fillText(`🎲 ${s.last.name}!`, cx, cy - sc * 0.62);
    }
  },
};

export const guardRandom: Bot<GuardState> = { name: '막누르기', act: (_s, rng) => ({ tap: rng() < 1 / 80, dir: 0 }) };

/** 봇: 핵에 가장 먼저 닿을 적을 고르고, 그쪽으로 더 빨리 가는 방향이면 뒤집는다 */
export const guardSmart: Bot<GuardState> = {
  name: '급한 쪽부터',
  act(s) {
    if (!s.enemies.length) return { tap: false, dir: 0 };
    const urgent = s.enemies.reduce((a, e) => ((e.r - CORE) / e.v < (a.r - CORE) / a.v ? e : a));
    const d = wrap(urgent.a - s.angle); // 양수면 반시계(+) 방향이 가깝다
    const want = d >= 0 ? 1 : -1;
    // 거의 정면이면 방향을 굳이 바꾸지 않는다 (떨림 방지)
    return { tap: want !== s.dir && Math.abs(d) > 0.25, dir: 0 };
  },
};
