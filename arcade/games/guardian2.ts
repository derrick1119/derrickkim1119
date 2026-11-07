/**
 * 행성 수호대 2 — 챔피언 행성 수호대의 확장판 (0021). 오너: "굳이 원버튼을 고집할 필요 없어."
 *
 * 1편과 달라진 점
 *  - 조작: 화면 왼쪽/오른쪽을 누르고 있는 동안 편대가 그쪽으로 돈다(떼면 멈춤). 방향 뒤집기보다 세밀하게 막는다.
 *  - 건설을 직접 고른다: 광석이 차면 카드 셋(새 건물·강화)이 뜨고, 탭(또는 1·2·3)으로 하나를 고른다. 고를 때까지 광석은 계속 쌓인다.
 *  - 건물 레벨: 같은 건물을 강화하면 2·3단계 — 광산은 더 빨리 캐고, 포탑은 더 빨리 멀리 쏜다. 위성은 최대 3기.
 *  - 판이 끝나면 카메라가 행성으로 다가가 내가 지은 기지 전경을 보여 준다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';

const CORE = 0.17, ORBIT = 0.43, BODY = 0.062, ENEMY_R = 0.04, BULLET_V = 1.3 / 60, RANGE = 0.32;
const SLOTS = 8, HP_MAX = 5, CARD_Y = 0.84, MOVE = 1.7 / 60, FIRE_EVERY = 30;
type Kind = '광산' | '포탑';
export interface Card { label: string; detail: string; apply: (s: Guardian2State) => void }
interface Enemy { a: number; r: number; v: number; hp: number; big: boolean }
interface Shot { x: number; y: number; vx: number; vy: number; life: number }
interface Site { kind: Kind; slot: number; level: number; cool: number; aim: number }
export interface Guardian2State {
  rng: Rng;
  t: number;
  angle: number;
  dir: -1 | 0 | 1;
  lastDir: 1 | -1;
  allies: number;
  cool: number[];
  enemies: Enemy[];
  bullets: Shot[];
  sites: Site[];
  ore: number;
  cost: number;
  offer: Card[] | null;
  wasDown: boolean;
  builds: number;
  hp: number;
  spawnIn: number;
  kills: number;
  last: { name: string; t: number } | null;
  hitAt: number;
  deadAt: number;
  dead: boolean;
}

const pos = (a: number, r: number) => ({ x: Math.cos(a) * r, y: Math.sin(a) * r });
const wrap = (a: number) => ((a % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
const spin = (s: Guardian2State) => s.t * 0.003;
export const crew2 = (s: Guardian2State) => [...Array(1 + s.allies).keys()].map((k) => s.angle + (k * 2 * Math.PI) / (1 + s.allies));
const siteAngle = (s: Guardian2State, slot: number) => (slot * 2 * Math.PI) / SLOTS + spin(s);
const mineRate = (s: Guardian2State) => s.sites.filter((x) => x.kind === '광산').reduce((a, x) => a + 0.4 * x.level, 0);
const turretEvery = (lv: number) => [0, 42, 28, 19][lv];
const turretRange = (lv: number) => 0.34 + 0.05 * (lv - 1);

function spawn(s: Guardian2State) {
  const lvl = s.t / 3600;
  const big = s.rng() < Math.min(0.5, lvl * 0.4);
  s.enemies.push({ a: s.rng() * Math.PI * 2, r: 1.05, v: (0.13 + 0.14 * lvl + s.rng() * 0.04) / 60, hp: big ? 3 : 1 + (s.rng() < Math.min(0.55, lvl * 0.3) ? 1 : 0), big });
  s.spawnIn = Math.max(5, Math.round(80 - 50 * lvl - s.rng() * 20));
}

/** 지금 지을 수 있는 카드 전부 */
function cards(s: Guardian2State): Card[] {
  const out: Card[] = [];
  const free = [...Array(SLOTS).keys()].filter((k) => !s.sites.some((x) => x.slot === k));
  for (const kind of ['광산', '포탑'] as Kind[]) {
    if (free.length) out.push({ label: `새 ${kind}`, detail: kind === '광산' ? '광석 +0.4/초' : '행성에서 자동 사격', apply: (t) => t.sites.push({ kind, slot: free[Math.floor(t.rng() * free.length)], level: 1, cool: 0, aim: 0 }) });
    const low = s.sites.filter((x) => x.kind === kind && x.level < 3).sort((a, b) => a.level - b.level)[0];
    if (low) out.push({ label: `${kind} Lv${low.level + 1}`, detail: kind === '광산' ? '캐는 속도 ↑' : '연사·사거리 ↑', apply: () => void low.level++ });
  }
  if (s.allies < 3) out.push({ label: '위성', detail: '수호선 +1', apply: (t) => (t.allies++, t.cool.push(0)) });
  if (s.hp < HP_MAX) out.push({ label: '방어막', detail: '내구도 +1', apply: (t) => void t.hp++ });
  return out;
}

function offer(s: Guardian2State) {
  const all = cards(s);
  const pick: Card[] = [];
  while (pick.length < 3 && all.length) pick.push(all.splice(Math.floor(s.rng() * all.length), 1)[0]);
  s.offer = pick.length ? pick : null;
}

function choose(s: Guardian2State, k: number) {
  if (!s.offer || !s.offer[k]) return;
  const c = s.offer[k];
  c.apply(s);
  s.ore -= s.cost;
  s.cost = Math.round(s.cost * 1.25 + 3);
  s.builds++;
  s.last = { name: c.label, t: s.t };
  s.offer = null;
}

function shoot(s: Guardian2State, from: { x: number; y: number }, range: number): number | null {
  let best: { p: { x: number; y: number }; d: number } | null = null;
  for (const e of s.enemies) {
    const p = pos(e.a, e.r), d = Math.hypot(p.x - from.x, p.y - from.y);
    if (d < range && (!best || d < best.d)) best = { p, d };
  }
  if (!best) return null;
  s.bullets.push({ x: from.x, y: from.y, vx: ((best.p.x - from.x) / best.d) * BULLET_V, vy: ((best.p.y - from.y) / best.d) * BULLET_V, life: 32 });
  return Math.atan2(best.p.y - from.y, best.p.x - from.x);
}

/** 카드 영역의 k번째 카드 가로 범위 (0~1) */
const cardBox = (k: number) => ({ x0: 0.03 + k * 0.32, x1: 0.03 + k * 0.32 + 0.3 });

export const guardian2: GameDef<Guardian2State> = {
  id: 'guardian2',
  name: '행성 수호대 2',
  genes: ['survivor', 'defense', 'idle', 'pick3', 'twobutton'],
  twist: '1편의 저절로 되던 건설을 내가 고른다 — 광석이 차면 카드 셋 중 하나, 같은 건물을 강화하면 2·3단계',
  rules: ['화면 왼쪽·오른쪽을 누르고 있으면 편대가 그쪽으로 돌아요. 총은 저절로 쏴요.', '광석이 차면 아래 카드 셋 중 하나를 눌러 짓거나 강화해요 (키보드 ← → · 1 2 3).', '운석이 행성에 3번 부딪히면 끝. 끝나면 내가 지은 기지가 보여요.'],
  controls: 'touch',
  art: {
    concept: '작은 행성 기지 · 지휘실',
    mood: '1편의 초록 행성에 노란 건설 카드와 레벨 표시가 더해진 지휘실 화면. 판이 끝나면 카메라가 기지로 내려앉는다.',
    palette: { bg: '#0a0e1f', ink: '#ff8a3d', muted: '#3b4470', accent: '#7cf2c4', hot: '#ff4d4d', soft: '#1c2547' },
  },
  create(seed) {
    return {
      rng: mulberry32(seed), t: 0, angle: -Math.PI / 2, dir: 0, lastDir: 1, allies: 0, cool: [0], enemies: [], bullets: [], sites: [],
      ore: 0, cost: 8, offer: null, wasDown: false, builds: 0, hp: 3, spawnIn: 90, kills: 0, last: null, hitAt: -99, deadAt: -1, dead: false,
    };
  },
  step(s, input: Input) {
    if (s.dead) return;
    s.t++;
    // 조작: 카드 영역 탭 = 고르기, 그 위 왼쪽/오른쪽 누르고 있기 = 돌기. 키보드 ← → / 1 2 3
    const p = input.pointer ?? null;
    let dir: -1 | 0 | 1 = input.dir;
    if (p && p.y < CARD_Y - 0.03) dir = p.x < 0.5 ? -1 : 1;
    if (p && p.y >= CARD_Y - 0.03 && !s.wasDown) {
      const k = [0, 1, 2].find((i) => p.x >= cardBox(i).x0 && p.x <= cardBox(i).x1);
      if (k !== undefined) choose(s, k);
    }
    s.wasDown = !!p;
    if (input.pick !== undefined) choose(s, input.pick);
    s.dir = dir;
    if (dir) (s.lastDir = dir), (s.angle = wrap(s.angle + dir * MOVE));
    if (--s.spawnIn <= 0) spawn(s);
    s.ore += (0.5 + mineRate(s)) / 60;
    if (!s.offer && s.ore >= s.cost) offer(s);
    const ships = crew2(s).map((a) => pos(a, ORBIT));
    ships.forEach((m, k) => {
      if (--s.cool[k] > 0) return;
      s.cool[k] = shoot(s, m, RANGE) === null ? 1 : FIRE_EVERY;
    });
    for (const site of s.sites) {
      if (site.kind !== '포탑' || --site.cool > 0) continue;
      const a = shoot(s, pos(siteAngle(s, site.slot), CORE), turretRange(site.level));
      site.cool = a === null ? 1 : turretEvery(site.level);
      if (a !== null) site.aim = a;
    }
    for (const b of s.bullets) (b.x += b.vx), (b.y += b.vy), b.life--;
    for (let i = s.enemies.length - 1; i >= 0; i--) {
      const e = s.enemies[i];
      e.r -= e.v;
      if (e.r < CORE + ENEMY_R * 0.5) {
        s.enemies.splice(i, 1);
        s.hitAt = s.t;
        if (--s.hp <= 0) return void ((s.dead = true), (s.deadAt = s.t));
        continue;
      }
      const ep = pos(e.a, e.r);
      let gone = ships.some((m) => Math.hypot(ep.x - m.x, ep.y - m.y) < BODY + ENEMY_R);
      for (const b of s.bullets) {
        if (gone || b.life <= 0 || Math.hypot(ep.x - b.x, ep.y - b.y) > ENEMY_R + 0.015) continue;
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
    const u = Math.min(w, h);
    const since = s.last ? s.t - s.last.t : 999;
    // 판이 끝나면 기지 전경으로 확대, 건설 순간엔 살짝 다가감
    const zoom = s.dead ? 2.1 : since < 40 ? 1 + 0.25 * Math.sin((since / 40) * Math.PI) : 1;
    const shake = !s.dead && s.t - s.hitAt < 14 ? (14 - (s.t - s.hitAt)) * 0.6 : 0;
    const sc = (u / 2) * 0.8 * zoom;
    const cx = w / 2 + (shake ? Math.sin(s.t * 3.1) * shake : 0), cy = h * 0.42 + (shake ? Math.cos(s.t * 2.7) * shake : 0);
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
    if (!s.dead) {
      ctx.strokeStyle = th.soft;
      ctx.lineWidth = sc * 0.045;
      ctx.beginPath();
      ctx.arc(cx, cy, ORBIT * sc, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let k = 0; k < s.hp; k++) {
      ctx.strokeStyle = th.accent;
      ctx.globalAlpha = 0.18 + (s.t - s.hitAt < 14 ? 0.3 : 0);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, (CORE + 0.03 + k * 0.018) * sc, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = s.dead ? '#4fae8c' : th.accent;
    ctx.beginPath();
    ctx.arc(cx, cy, CORE * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(10,14,31,.18)';
    for (let k = 0; k < 5; k++) {
      const c = pos(spin(s) + k * 1.3, CORE * (0.25 + 0.12 * (k % 3)));
      ctx.beginPath();
      ctx.arc(X(c.x), Y(c.y), CORE * sc * (0.12 + 0.05 * (k % 2)), 0, Math.PI * 2);
      ctx.fill();
    }
    // 건물 (레벨만큼 크고, 레벨 점 표시)
    for (const site of s.sites) {
      const a = siteAngle(s, site.slot), bp = pos(a, CORE), k = 0.8 + 0.25 * site.level;
      ctx.save();
      ctx.translate(X(bp.x), Y(bp.y));
      ctx.rotate(a + Math.PI / 2);
      if (site.kind === '광산') {
        ctx.fillStyle = '#e8f7ff';
        ctx.beginPath();
        ctx.moveTo(-sc * 0.03 * k, 0);
        ctx.lineTo(sc * 0.03 * k, 0);
        ctx.lineTo(0, -sc * 0.06 * k);
        ctx.fill();
      } else {
        ctx.fillStyle = th.ink;
        ctx.fillRect(-sc * 0.028 * k, -sc * 0.036 * k, sc * 0.056 * k, sc * 0.036 * k);
        ctx.strokeStyle = th.ink;
        ctx.lineWidth = 3 + site.level;
        ctx.beginPath();
        ctx.moveTo(0, -sc * 0.036 * k);
        ctx.lineTo(0, -sc * 0.07 * k);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffe14d';
      for (let l = 0; l < site.level; l++) ctx.fillRect(-sc * 0.02 + l * sc * 0.016, sc * 0.012, sc * 0.011, sc * 0.011);
      ctx.restore();
    }
    if (!s.dead) {
      for (const e of s.enemies) {
        const ep = pos(e.a, e.r), tail = pos(e.a, e.r + 0.09), r = ENEMY_R * (e.big ? 1.6 : e.hp > 1 ? 1.25 : 1);
        ctx.strokeStyle = th.ink;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = r * sc;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(X(ep.x), Y(ep.y));
        ctx.lineTo(X(tail.x), Y(tail.y));
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = e.big ? th.hot : th.ink;
        ctx.beginPath();
        ctx.arc(X(ep.x), Y(ep.y), r * sc, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = th.accent;
      for (const b of s.bullets) ctx.fillRect(X(b.x) - 2, Y(b.y) - 2, 4, 4);
      crew2(s).forEach((a, k) => {
        const m = pos(a, ORBIT);
        ctx.fillStyle = k === 0 ? th.accent : '#e8f7ff';
        ctx.beginPath();
        ctx.arc(X(m.x), Y(m.y), BODY * sc * (k === 0 ? 1 : 0.85), 0, Math.PI * 2);
        ctx.fill();
        if (s.dir) {
          const ahead = pos(a + s.dir * 0.25, ORBIT);
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(X(m.x), Y(m.y));
          ctx.lineTo(X(ahead.x), Y(ahead.y));
          ctx.stroke();
        }
      });
    }
    // HUD
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e8f7ff';
    ctx.font = `800 ${Math.round(u * 0.07)}px system-ui, sans-serif`;
    ctx.fillText(String(guardian2.score(s)), 10, 8);
    ctx.textAlign = 'right';
    ctx.font = `700 ${Math.round(u * 0.04)}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffe14d';
    ctx.fillText(`광석 ${Math.floor(s.ore)} / ${s.cost}`, w - 10, 10);
    ctx.fillStyle = th.accent;
    ctx.fillText('♥'.repeat(s.hp), w - 10, 14 + u * 0.05);
    if (s.dead) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e8f7ff';
      ctx.font = `800 ${Math.round(u * 0.06)}px system-ui, sans-serif`;
      ctx.fillText('기지 전경', w / 2, h * 0.76);
      ctx.font = `600 ${Math.round(u * 0.04)}px system-ui, sans-serif`;
      const lv = (k: Kind) => s.sites.filter((x) => x.kind === k).map((x) => `Lv${x.level}`).join(' ') || '없음';
      ctx.fillText(`광산 ${lv('광산')} · 포탑 ${lv('포탑')} · 위성 ${s.allies}`, w / 2, h * 0.83);
      return;
    }
    // 건설 카드 (아래 줄)
    const top = h * CARD_Y, ch = h * 0.13;
    if (s.offer) {
      s.offer.forEach((c, k) => {
        const bx = cardBox(k), x = bx.x0 * w, cw = (bx.x1 - bx.x0) * w;
        ctx.fillStyle = '#ffe14d';
        ctx.beginPath();
        ctx.roundRect(x, top, cw, ch, 8);
        ctx.fill();
        ctx.fillStyle = '#1b1b2f';
        ctx.textAlign = 'center';
        ctx.font = `800 ${Math.round(u * 0.042)}px system-ui, sans-serif`;
        ctx.fillText(`${k + 1}. ${c.label}`, x + cw / 2, top + ch * 0.18);
        ctx.font = `600 ${Math.round(u * 0.031)}px system-ui, sans-serif`;
        ctx.fillText(c.detail, x + cw / 2, top + ch * 0.58);
      });
    } else {
      ctx.fillStyle = th.soft;
      ctx.fillRect(w * 0.03, top + ch * 0.4, w * 0.94, 6);
      ctx.fillStyle = '#ffe14d';
      ctx.fillRect(w * 0.03, top + ch * 0.4, w * 0.94 * Math.min(1, s.ore / s.cost), 6);
      ctx.fillStyle = th.muted;
      ctx.textAlign = 'center';
      ctx.font = `600 ${Math.round(u * 0.034)}px system-ui, sans-serif`;
      ctx.fillText('광석이 차면 건설 카드가 나와요', w / 2, top + ch * 0.62);
    }
    if (s.last && since < 70) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe14d';
      ctx.font = `800 ${Math.round(u * 0.065)}px system-ui, sans-serif`;
      ctx.fillText(`🏗 ${s.last.name}!`, w / 2, h * 0.08);
    }
  },
};

/** 봇: 아무 방향이나 누르고, 카드는 아무거나 */
export const guardian2Random: Bot<Guardian2State> = {
  name: '막누르기',
  act: (s, rng) => ({ tap: false, dir: (rng() < 0.5 ? (rng() < 0.5 ? -1 : 1) : 0) as -1 | 0 | 1, pick: s.offer && rng() < 0.02 ? Math.floor(rng() * s.offer.length) : undefined }),
};

/** 봇: 가장 급한 운석을 가장 가까운 배로 막으러 가고, 카드는 위성 > 포탑 강화 > 새 포탑 > 광산 > 방어막(내구도 1이면 방어막 먼저) */
export const guardian2Smart: Bot<Guardian2State> = {
  name: '급한 쪽부터',
  act(s) {
    let pick: number | undefined;
    if (s.offer) {
      const rank = (c: Card) => (s.hp <= 1 && c.label === '방어막' ? 0 : c.label === '위성' ? 1 : c.label.startsWith('포탑') ? 2 : c.label === '새 포탑' ? 3 : c.label.includes('광산') ? 4 : 5);
      pick = s.offer.map((c, k) => [rank(c), k]).sort((a, b) => a[0] - b[0])[0][1];
    }
    if (!s.enemies.length) return { tap: false, dir: 0, pick };
    const urgent = s.enemies.reduce((a, e) => ((e.r - CORE) / e.v < (a.r - CORE) / a.v ? e : a));
    const d = crew2(s).map((a) => wrap(urgent.a - a)).reduce((a, x) => (Math.abs(x) < Math.abs(a) ? x : a));
    return { tap: false, dir: Math.abs(d) < 0.05 ? 0 : d > 0 ? 1 : -1, pick };
  },
};
