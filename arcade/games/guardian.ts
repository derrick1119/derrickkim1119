/**
 * 행성 수호대 — 궤도 수비(챔피언)의 확장판. 오너 요청(2026-11-07):
 * "아군이 하나 더 늘어난다든지, 행성을 지키는 수호 느낌. 행성 자체에서도 생산을 하거나 자원을 캔다든지,
 *  행성을 확대해서 보면 기지도 건설된다든지."
 *
 * 조작은 그대로 탭 하나(공전 방향 뒤집기, 편대 전체가 함께). 나머지는 저절로:
 *  - 행성은 광석을 캔다(광산이 많을수록 빨리). 운석을 부숴도 광석이 나온다.
 *  - 광석이 차면 기지가 무작위로 지어진다: 광산 · 포탑(행성 위 자동 포대) · 위성(아군 수호선) · 방어막(내구도 회복).
 *  - 행성 내구도 3. 운석이 행성에 닿으면 1 깎이고, 0이면 끝.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';

const CORE = 0.17, ORBIT = 0.43, BODY = 0.062, ENEMY_R = 0.04, BULLET_V = 1.3 / 60, RANGE = 0.32;
const SLOTS = 8, TURRET_RANGE = 0.36, TURRET_EVERY = 42, FIRE_EVERY = 30, HP_MAX = 5;
export type Building = '광산' | '포탑' | '위성' | '방어막';
interface Enemy { a: number; r: number; v: number; hp: number; big: boolean }
interface Shot { x: number; y: number; vx: number; vy: number; life: number }
interface Site { kind: '광산' | '포탑'; slot: number; cool: number; aim: number }
export interface GuardianState {
  rng: Rng;
  t: number;
  angle: number;
  dir: 1 | -1;
  omega: number;
  allies: number;
  cool: number[];
  enemies: Enemy[];
  bullets: Shot[];
  sites: Site[];
  ore: number;
  cost: number;
  builds: number;
  hp: number;
  spawnIn: number;
  kills: number;
  last: { name: Building; t: number } | null;
  hitAt: number;
  dead: boolean;
}

const pos = (a: number, r: number) => ({ x: Math.cos(a) * r, y: Math.sin(a) * r });
const wrap = (a: number) => ((a % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
const spin = (s: GuardianState) => s.t * 0.003;
/** 편대: 나 + 아군 위성들이 궤도에 고르게 선다 */
export const crew = (s: GuardianState) => [...Array(1 + s.allies).keys()].map((k) => s.angle + (k * 2 * Math.PI) / (1 + s.allies));
const siteAngle = (s: GuardianState, slot: number) => (slot * 2 * Math.PI) / SLOTS + spin(s);
const mines = (s: GuardianState) => s.sites.filter((x) => x.kind === '광산').length;

function spawn(s: GuardianState) {
  const lvl = s.t / 3600;
  const big = s.rng() < Math.min(0.35, lvl * 0.25);
  s.enemies.push({ a: s.rng() * Math.PI * 2, r: 1.05, v: (0.13 + 0.08 * lvl + s.rng() * 0.04) / 60, hp: big ? 3 : 1 + (s.rng() < Math.min(0.5, lvl * 0.3) ? 1 : 0), big });
  s.spawnIn = Math.max(9, Math.round(84 - 40 * lvl - s.rng() * 20));
}

function build(s: GuardianState) {
  const options: Building[] = [];
  if (mines(s) < 4) options.push('광산');
  if (s.sites.filter((x) => x.kind === '포탑').length < 4) options.push('포탑');
  if (s.allies < 2) options.push('위성');
  if (s.hp < HP_MAX) options.push('방어막');
  if (!options.length) return;
  const b = options[Math.floor(s.rng() * options.length)];
  s.ore -= s.cost;
  s.cost = Math.round(s.cost * 1.25 + 3);
  s.builds++;
  s.last = { name: b, t: s.t };
  if (b === '광산' || b === '포탑') {
    const free = [...Array(SLOTS).keys()].filter((k) => !s.sites.some((x) => x.slot === k));
    s.sites.push({ kind: b, slot: free[Math.floor(s.rng() * free.length)], cool: 0, aim: 0 });
  } else if (b === '위성') {
    s.allies++;
    s.cool.push(0);
  } else s.hp++;
}

function shoot(s: GuardianState, from: { x: number; y: number }, range: number, n = 1): number | null {
  const near = s.enemies
    .map((e) => ({ p: pos(e.a, e.r) }))
    .map((q) => ({ ...q, d: Math.hypot(q.p.x - from.x, q.p.y - from.y) }))
    .filter((q) => q.d < range)
    .sort((a, b) => a.d - b.d)
    .slice(0, n);
  for (const q of near) s.bullets.push({ x: from.x, y: from.y, vx: ((q.p.x - from.x) / q.d) * BULLET_V, vy: ((q.p.y - from.y) / q.d) * BULLET_V, life: 30 });
  return near.length ? Math.atan2(near[0].p.y - from.y, near[0].p.x - from.x) : null;
}

export const guardian: GameDef<GuardianState> = {
  id: 'guardian',
  name: '행성 수호대',
  genes: ['survivor', 'defense', 'idle', 'onebutton'],
  twist: '궤도 수비에 행성 기지를 더했다 — 행성은 스스로 광석을 캐고, 광석이 차면 광산·포탑·위성·방어막이 무작위로 지어진다',
  rules: ['누르면 수호선 편대가 도는 방향이 바뀝니다. 총은 저절로 쏴요.', '행성은 광석을 캐고, 광석이 차면 광산·포탑·위성·방어막이 저절로 지어져요.', '운석이 행성에 3번 부딪히면 끝.'],
  controls: 'tap',
  art: {
    concept: '작은 행성 기지',
    mood: '고리 두른 초록 행성 표면에 드릴과 포대가 하나씩 들어서고, 수호선 편대가 궤도를 지킨다. 건설될 때마다 카메라가 행성으로 다가간다.',
    palette: { bg: '#0a0e1f', ink: '#ff8a3d', muted: '#3b4470', accent: '#7cf2c4', hot: '#ff4d4d', soft: '#1c2547' },
  },
  create(seed) {
    return {
      rng: mulberry32(seed), t: 0, angle: -Math.PI / 2, dir: 1, omega: 1.6 / 60, allies: 0, cool: [0], enemies: [], bullets: [], sites: [],
      ore: 0, cost: 8, builds: 0, hp: 3, spawnIn: 90, kills: 0, last: null, hitAt: -99, dead: false,
    };
  },
  step(s, input: Input) {
    if (s.dead) return;
    s.t++;
    if (input.tap) s.dir = s.dir === 1 ? -1 : 1;
    s.angle = wrap(s.angle + s.dir * s.omega);
    if (--s.spawnIn <= 0) spawn(s);
    // 채굴: 기본 + 광산마다 추가 (초당 광석)
    s.ore += (0.5 + 0.45 * mines(s)) / 60;
    if (s.ore >= s.cost) build(s);
    // 편대 자동 사격
    const ships = crew(s).map((a) => pos(a, ORBIT));
    ships.forEach((p, k) => {
      if (--s.cool[k] > 0) return;
      s.cool[k] = shoot(s, p, RANGE) === null ? 1 : FIRE_EVERY;
    });
    // 행성 포탑
    for (const site of s.sites) {
      if (site.kind !== '포탑' || --site.cool > 0) continue;
      const a = shoot(s, pos(siteAngle(s, site.slot), CORE), TURRET_RANGE);
      site.cool = a === null ? 1 : TURRET_EVERY;
      if (a !== null) site.aim = a;
    }
    for (const b of s.bullets) (b.x += b.vx), (b.y += b.vy), b.life--;
    for (let i = s.enemies.length - 1; i >= 0; i--) {
      const e = s.enemies[i];
      e.r -= e.v;
      if (e.r < CORE + ENEMY_R * 0.5) {
        s.enemies.splice(i, 1);
        s.hitAt = s.t;
        if (--s.hp <= 0) return void (s.dead = true);
        continue;
      }
      const p = pos(e.a, e.r);
      let gone = ships.some((m) => Math.hypot(p.x - m.x, p.y - m.y) < BODY + ENEMY_R);
      for (const b of s.bullets) {
        if (gone || b.life <= 0 || Math.hypot(p.x - b.x, p.y - b.y) > ENEMY_R + 0.015) continue;
        b.life = 0;
        if (--e.hp <= 0) gone = true;
      }
      if (gone) {
        s.enemies.splice(i, 1);
        s.kills++;
        s.ore += e.big ? 3 : 1;
      }
    }
    s.bullets = s.bullets.filter((b) => b.life > 0);
  },
  over: (s) => s.dead,
  score: (s) => s.kills + s.builds * 5,
  draw(ctx, s, w, h, th: Theme) {
    // 건설 직후 0.8초 동안 카메라가 행성으로 다가간다
    const since = s.last ? s.t - s.last.t : 999;
    const zoom = since < 50 ? 1 + 0.45 * Math.sin((since / 50) * Math.PI) : 1;
    const shake = s.t - s.hitAt < 14 ? (14 - (s.t - s.hitAt)) * 0.6 : 0;
    const sc = (Math.min(w, h) / 2) * 0.92 * zoom;
    const cx = w / 2 + (shake ? Math.sin(s.t * 3.1) * shake : 0), cy = h / 2 + (shake ? Math.cos(s.t * 2.7) * shake : 0);
    const X = (x: number) => cx + x * sc, Y = (y: number) => cy + y * sc;
    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 70; k++) {
      const sx = ((k * 7919) % 997) / 997, sy = ((k * 104729) % 991) / 991;
      ctx.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(s.t / 40 + k));
      ctx.fillStyle = th.muted;
      ctx.fillRect(sx * w, sy * h, k % 5 ? 1.5 : 2.5, k % 5 ? 1.5 : 2.5);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = th.soft;
    ctx.lineWidth = sc * 0.045;
    ctx.beginPath();
    ctx.arc(cx, cy, ORBIT * sc, 0, Math.PI * 2);
    ctx.stroke();
    // 방어막: 내구도만큼 겹 고리
    for (let k = 0; k < s.hp; k++) {
      ctx.strokeStyle = th.accent;
      ctx.globalAlpha = 0.18 + (s.t - s.hitAt < 14 ? 0.3 : 0);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, (CORE + 0.03 + k * 0.018) * sc, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 행성 + 표면 무늬(자전)
    ctx.fillStyle = s.dead ? th.hot : th.accent;
    ctx.beginPath();
    ctx.arc(cx, cy, CORE * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(10,14,31,.18)';
    for (let k = 0; k < 5; k++) {
      const c = pos(spin(s) * 1.0 + k * 1.3, CORE * (0.25 + 0.12 * (k % 3)));
      ctx.beginPath();
      ctx.arc(X(c.x), Y(c.y), CORE * sc * (0.12 + 0.05 * (k % 2)), 0, Math.PI * 2);
      ctx.fill();
    }
    // 기지 건물 (행성 가장자리, 행성과 함께 돈다)
    for (const site of s.sites) {
      const a = siteAngle(s, site.slot), p = pos(a, CORE), q = pos(a, CORE + 0.045);
      ctx.save();
      ctx.translate(X(p.x), Y(p.y));
      ctx.rotate(a + Math.PI / 2);
      if (site.kind === '광산') {
        ctx.fillStyle = '#e8f7ff';
        ctx.beginPath();
        ctx.moveTo(-sc * 0.032, 0);
        ctx.lineTo(sc * 0.032, 0);
        ctx.lineTo(0, -sc * 0.065);
        ctx.fill();
      } else {
        ctx.fillStyle = th.ink;
        ctx.fillRect(-sc * 0.03, -sc * 0.04, sc * 0.06, sc * 0.04);
      }
      ctx.restore();
      if (site.kind === '포탑') {
        const b = pos(site.aim, 0.05);
        ctx.strokeStyle = th.ink;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(X(q.x), Y(q.y));
        ctx.lineTo(X(q.x + b.x), Y(q.y + b.y));
        ctx.stroke();
      } else if ((s.t + site.slot * 13) % 40 < 20) {
        // 캐낸 광석이 반짝이며 솟는다
        const up = pos(a, CORE + 0.05 + ((s.t + site.slot * 13) % 40) * 0.002);
        ctx.fillStyle = '#ffe14d';
        ctx.fillRect(X(up.x) - 2, Y(up.y) - 2, 4, 4);
      }
    }
    for (const e of s.enemies) {
      const p = pos(e.a, e.r), tail = pos(e.a, e.r + 0.09), r = ENEMY_R * (e.big ? 1.6 : e.hp > 1 ? 1.25 : 1);
      ctx.strokeStyle = th.ink;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = r * sc;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(X(p.x), Y(p.y));
      ctx.lineTo(X(tail.x), Y(tail.y));
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = e.big ? th.hot : th.ink;
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), r * sc, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = th.accent;
    for (const b of s.bullets) ctx.fillRect(X(b.x) - 2, Y(b.y) - 2, 4, 4);
    // 수호선 편대 (나는 진행 방향 표시)
    crew(s).forEach((a, k) => {
      const m = pos(a, ORBIT);
      ctx.fillStyle = k === 0 ? th.accent : '#e8f7ff';
      ctx.beginPath();
      ctx.arc(X(m.x), Y(m.y), BODY * sc * (k === 0 ? 1 : 0.85), 0, Math.PI * 2);
      ctx.fill();
      const ahead = pos(a + s.dir * 0.25, ORBIT);
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(X(m.x), Y(m.y));
      ctx.lineTo(X(ahead.x), Y(ahead.y));
      ctx.stroke();
    });
    // HUD (카메라와 무관하게 고정)
    const u = Math.min(w, h);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e8f7ff';
    ctx.font = `800 ${Math.round(u * 0.07)}px system-ui, sans-serif`;
    ctx.fillText(String(guardian.score(s)), 10, 8);
    ctx.textAlign = 'right';
    ctx.font = `700 ${Math.round(u * 0.04)}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffe14d';
    ctx.fillText(`광석 ${Math.floor(s.ore)} / ${s.cost}`, w - 10, 10);
    ctx.fillStyle = th.soft;
    ctx.fillRect(w - 10 - u * 0.3, 14 + u * 0.045, u * 0.3, 5);
    ctx.fillStyle = '#ffe14d';
    ctx.fillRect(w - 10 - u * 0.3, 14 + u * 0.045, u * 0.3 * Math.min(1, s.ore / s.cost), 5);
    ctx.fillStyle = th.accent;
    ctx.fillText(`${'♥'.repeat(s.hp)}`, w - 10, 26 + u * 0.06);
    ctx.textAlign = 'left';
    ctx.fillStyle = th.muted;
    ctx.fillText(`광산 ${mines(s)} · 포탑 ${s.sites.length - mines(s)} · 위성 ${s.allies}`, 10, h - u * 0.06);
    if (s.last && since < 90) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe14d';
      ctx.font = `800 ${Math.round(u * 0.075)}px system-ui, sans-serif`;
      ctx.fillText(`🏗 ${s.last.name} 건설!`, w / 2, h * 0.14);
    }
  },
};

export const guardianRandom: Bot<GuardianState> = { name: '막누르기', act: (_s, rng) => ({ tap: rng() < 1 / 80, dir: 0 }) };

/** 봇: 행성에 가장 먼저 닿을 운석을, 편대 중 가장 가까운 배가 더 빨리 막는 방향으로 돈다 */
export const guardianSmart: Bot<GuardianState> = {
  name: '급한 쪽부터',
  act(s) {
    if (!s.enemies.length) return { tap: false, dir: 0 };
    const urgent = s.enemies.reduce((a, e) => ((e.r - CORE) / e.v < (a.r - CORE) / a.v ? e : a));
    const ds = crew(s).map((a) => wrap(urgent.a - a));
    const best = ds.reduce((a, d) => (Math.abs(d) < Math.abs(a) ? d : a));
    const want = best >= 0 ? 1 : -1;
    return { tap: want !== s.dir && Math.abs(best) > 0.25, dir: 0 };
  },
};
