/**
 * 자석 우주선 (0032, 메뉴 4번 · 다음 차례) — 덩치 키우기 × 슈팅 · 가리키기.
 * 와우: 누르고 있으면 배가 손가락을 따라가며 자석이 켜져 주변 운석이 철컥철컥 붙어 갑옷이 되고,
 *       떼는 순간 붙은 운석이 사방으로 한꺼번에 발사된다 — 붙인 모양 그대로가 내 배이자 내 탄창.
 * 첫 3초: 운석 서너 개가 철컥 붙어 배가 커지고, 놓는 순간 사방으로 터져 나간다.
 * 목표·보상: 웨이브마다 적을 다 부수면 클리어(남은 몸으로 별), 가장 크게 키운 배 기록.
 * 하는 일이 바뀐다: 총 쏘는 적 → 얼음 운석(맞은 적이 얼어붙음) → 폭발 운석(맞으면 주변까지 펑) → 기뢰 → 쇠 운석(두 번 막는 갑옷) → 거대 모선.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.35, CORE = 0.036, ROCK = 0.024, PULL = 0.2, SPEED = 0.012, LAUNCH = 0.02;
type RockKind = 'rock' | 'ice' | 'bomb' | 'metal';
type FoeKind = 'drone' | 'gunner' | 'mine' | 'mother';
interface Rock { kind: RockKind; x: number; y: number; vx: number; vy: number; hp: number; stuck: { dx: number; dy: number } | null; flying: number }
interface Foe { kind: FoeKind; x: number; y: number; vx: number; vy: number; hp: number; cool: number; frozen: number; crash?: boolean }
interface Shot { x: number; y: number; vx: number; vy: number; life: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string }
export interface MagnetState {
  rng: Rng; t: number; x: number; y: number; vx: number; vy: number; on: boolean; hull: number; inv: number;
  rocks: Rock[]; foes: Foe[]; shots: Shot[]; wave: number; left: number; spawnIn: number; rest: number; kills: number; biggest: number; stars: number;
  seen: Set<string>; events: Ev[]; dead: boolean;
}

const ev = (s: MagnetState, kind: string, x: number, y: number, text?: string) => s.events.push({ t: s.t, kind, x, y, text });
function see(s: MagnetState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  ev(s, 'new', 0.5, A * 0.45, text);
}
const ROCK_COL: Record<RockKind, string> = { rock: '#b79a7a', ice: '#9ee8ff', bomb: '#ff7a4d', metal: '#c3cad6' };
const FOE_HP: Record<FoeKind, number> = { drone: 1, gunner: 2, mine: 1, mother: 14 };
const FOE_R: Record<FoeKind, number> = { drone: 0.03, gunner: 0.033, mine: 0.03, mother: 0.075 };
const stuckCount = (s: MagnetState) => s.rocks.filter((r) => r.stuck).length;

function addRock(s: MagnetState) {
  const w = s.wave, r = s.rng();
  const kind: RockKind = w >= 5 && r < 0.15 ? 'metal' : w >= 3 && r < 0.3 ? 'bomb' : w >= 2 && r < 0.45 ? 'ice' : 'rock';
  const edge = Math.floor(s.rng() * 4), u = s.rng();
  const x = edge === 0 ? -0.03 : edge === 1 ? 1.03 : u, y = edge === 2 ? -0.03 : edge === 3 ? A + 0.03 : u * A;
  const a = Math.atan2(A / 2 - y, 0.5 - x) + (s.rng() - 0.5) * 1.2, v = 0.0015 + s.rng() * 0.0015;
  s.rocks.push({ kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, hp: kind === 'metal' ? 2 : 1, stuck: null, flying: 0 });
  if (kind !== 'rock') see(s, kind, kind === 'ice' ? '얼음 운석 — 맞은 적이 얼어붙어요' : kind === 'bomb' ? '폭발 운석 — 맞으면 주변까지 펑!' : '쇠 운석 — 갑옷으로 두 번 막아요');
}

function addFoe(s: MagnetState) {
  const w = s.wave, r = s.rng();
  let kind: FoeKind = w >= 2 && r < 0.35 ? 'gunner' : w >= 4 && r < 0.55 ? 'mine' : 'drone';
  if (w >= 6 && w % 3 === 0 && s.left === 1) kind = 'mother';
  const a = s.rng() * Math.PI * 2, x = 0.5 + Math.cos(a) * 0.75, y = A / 2 + Math.sin(a) * 0.85;
  s.foes.push({ kind, x, y, vx: 0, vy: 0, hp: FOE_HP[kind], cool: 60 + Math.floor(s.rng() * 60), frozen: 0 });
  s.left--;
  see(s, kind, kind === 'drone' ? '드론 — 붙은 운석이 막아 주고, 떼서 쏘면 부서져요' : kind === 'gunner' ? '총 쏘는 적 — 붙인 운석이 총알을 막아 줘요' : kind === 'mine' ? '기뢰 — 가까이 가면 터져요' : '거대 모선!');
}

function nextWave(s: MagnetState) {
  s.wave++;
  s.left = 3 + 2 * s.wave;
  s.spawnIn = 40;
  ev(s, 'wave', 0.5, A * 0.4, `${s.wave}번째 웨이브`);
}

function launch(s: MagnetState) {
  const n = stuckCount(s);
  if (!n) return;
  for (const r of s.rocks) {
    if (!r.stuck) continue;
    const d = Math.hypot(r.stuck.dx, r.stuck.dy) || 1;
    r.vx = (r.stuck.dx / d) * LAUNCH + s.vx;
    r.vy = (r.stuck.dy / d) * LAUNCH + s.vy;
    r.stuck = null;
    r.flying = 70;
  }
  ev(s, 'launch', s.x, s.y, n >= 8 ? `${n}발 일제 사격!` : undefined);
  if (n >= 6) see(s, 'big', `운석 ${n}개 — 붙인 만큼 한꺼번에 나가요`);
}

function blast(s: MagnetState, x: number, y: number, r: number) {
  ev(s, 'boom', x, y);
  for (const f of s.foes) if (Math.hypot(f.x - x, f.y - y) < r) f.hp -= 2;
}

export const magnet: GameDef<MagnetState> = {
  id: 'magnet',
  name: '자석 우주선',
  genes: ['absorb', 'shmup', 'pointer'],
  twist: '누르면 주변 운석이 내 배에 철컥 붙어 갑옷이 되고, 떼는 순간 붙은 운석이 사방으로 한꺼번에 발사된다',
  rules: ['누르고 있으면 배가 손가락을 따라가고, 자석이 켜져 운석이 철컥 붙어요 (키보드: 화살표 + 스페이스).', '떼는 순간 붙은 운석이 사방으로 발사돼요. 많이 붙일수록 한 방이 커요.', '붙은 운석은 갑옷 — 몸통에 맞으면 하트 -1. 웨이브마다 적을 다 부수면 다음으로.'],
  controls: 'touch',
  hint: '누르면 자석·이동, 떼면 발사 / 화살표 + 스페이스',
  aspect: A,
  origin: '메뉴 4번 — 15라운드 다음 차례 (오너가 고른 아이디어 메뉴)',
  art: {
    concept: '운석 갑옷 우주선',
    mood: '보랏빛 성운 속 작은 우주선. 자석 고리가 맥박치며 운석을 끌어당겨 울퉁불퉁한 갑옷이 되고, 떼는 순간 별똥별처럼 사방으로 흩어진다.',
    palette: { bg: '#0b0920', ink: '#f3f0ff', muted: '#5a5490', accent: '#7af7ff', hot: '#ff4f7a', soft: '#1c1840' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = { rng: mulberry32(seed), t: 0, x: 0.5, y: A * 0.6, vx: 0, vy: 0, on: false, hull: 3, inv: 0, rocks: [], foes: [], shots: [], wave: 0, left: 0, spawnIn: 0, rest: 60, kills: 0, biggest: 0, stars: 0, seen: new Set<string>(), events: [], dead: false } as unknown as MagnetState;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      s.rocks.push({ kind: 'rock', x: 0.5 + Math.cos(a) * 0.17, y: A * 0.6 + Math.sin(a) * 0.17, vx: 0, vy: 0, hp: 1, stuck: null, flying: 0 });
    }
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.events = s.events.filter((e) => s.t - e.t < 90);
    if (s.inv > 0) s.inv--;
    // 배: 누르고 있으면 손가락 쪽으로, 자석 켜짐. 떼는 순간 발사
    const was = s.on;
    s.on = !!inp.pointer;
    if (inp.pointer) {
      const tx = inp.pointer.x, ty = inp.pointer.y * A, d = Math.hypot(tx - s.x, ty - s.y), heavy = 1 / (1 + stuckCount(s) * 0.04);
      s.vx = d > 0.005 ? ((tx - s.x) / d) * Math.min(d, SPEED * heavy) : 0;
      s.vy = d > 0.005 ? ((ty - s.y) / d) * Math.min(d, SPEED * heavy) : 0;
    } else (s.vx *= 0.9), (s.vy *= 0.9);
    if (was && !s.on) launch(s);
    s.x = Math.max(0.05, Math.min(0.95, s.x + s.vx));
    s.y = Math.max(0.05, Math.min(A - 0.05, s.y + s.vy));
    // 웨이브
    if (s.left > 0 && --s.spawnIn <= 0) (addFoe(s), (s.spawnIn = Math.max(30, 110 - 8 * s.wave)));
    if (s.left === 0 && s.foes.length === 0 && --s.rest <= 0) {
      if (s.wave > 0) (s.stars += s.hull === 3 ? 3 : s.hull === 2 ? 2 : 1), ev(s, 'clear', 0.5, A * 0.4, `${s.wave}번째 웨이브 통과!`);
      nextWave(s);
      s.rest = 120;
    }
    if (s.t % Math.max(25, 60 - s.wave * 4) === 0 && s.rocks.filter((r) => !r.stuck).length < 14) addRock(s);
    // 운석: 자석이 켜지면 끌려와 붙는다 (붙은 운석 바깥쪽에 차곡차곡)
    for (const r of s.rocks) {
      if (r.stuck) {
        r.x = s.x + r.stuck.dx;
        r.y = s.y + r.stuck.dy;
        continue;
      }
      if (r.flying > 0) {
        r.flying--;
        // 자석 미사일: 날아가는 운석은 가까운 적 쪽으로 살짝 휜다
        let tgt: Foe | null = null, best = 0.36;
        for (const f of s.foes) {
          const d = Math.hypot(f.x - r.x, f.y - r.y);
          if (d < best) (best = d), (tgt = f);
        }
        if (tgt) {
          const sp = Math.hypot(r.vx, r.vy), ax = (tgt.x - r.x) / best, ay = (tgt.y - r.y) / best;
          r.vx += ax * 0.003;
          r.vy += ay * 0.003;
          const ns = Math.hypot(r.vx, r.vy);
          (r.vx *= sp / ns), (r.vy *= sp / ns);
        }
      }
      if (s.on && !r.flying) {
        const near = [{ x: s.x, y: s.y, rad: CORE }, ...s.rocks.filter((o) => o.stuck).map((o) => ({ x: o.x, y: o.y, rad: ROCK }))];
        const d = Math.hypot(r.x - s.x, r.y - s.y);
        if (d < PULL + stuckCount(s) * 0.004) {
          (r.vx += ((s.x - r.x) / d) * 0.0009), (r.vy += ((s.y - r.y) / d) * 0.0009);
          const touch = near.find((o) => Math.hypot(r.x - o.x, r.y - o.y) < o.rad + ROCK);
          if (touch) {
            r.stuck = { dx: r.x - s.x, dy: r.y - s.y };
            r.flying = 0;
            ev(s, 'clank', r.x, r.y);
            s.biggest = Math.max(s.biggest, stuckCount(s));
            continue;
          }
        }
      }
      r.x += r.vx;
      r.y += r.vy;
      if (!r.flying) (r.vx *= 0.995), (r.vy *= 0.995);
    }
    // 발사된 운석이 적에 맞으면
    for (const r of s.rocks) {
      if (r.flying <= 0 || r.hp <= 0) continue;
      for (const f of s.foes) {
        if (f.hp <= 0 || Math.hypot(f.x - r.x, f.y - r.y) > ROCK + FOE_R[f.kind]) continue;
        f.hp -= r.kind === 'metal' ? 2 : 1;
        if (r.kind === 'ice') f.frozen = 180;
        if (r.kind === 'bomb') blast(s, r.x, r.y, 0.12);
        r.hp = 0;
        ev(s, 'hit', r.x, r.y);
        break;
      }
    }
    // 적
    for (const f of s.foes) {
      if (f.frozen > 0) { f.frozen--; continue; }
      const dx = s.x - f.x, dy = s.y - f.y, d = Math.hypot(dx, dy) || 1, sp = (f.kind === 'drone' ? 0.0028 : f.kind === 'mother' ? 0.0009 : 0.0016) * (1 + 0.04 * s.wave);
      if (f.kind === 'gunner' && d < 0.32) (f.vx = (-dy / d) * sp), (f.vy = (dx / d) * sp);
      else if (f.kind === 'mine') (f.vx = (dx / d) * sp * 0.4), (f.vy = (dy / d) * sp * 0.4);
      else (f.vx = (dx / d) * sp), (f.vy = (dy / d) * sp);
      f.x += f.vx;
      f.y += f.vy;
      if ((f.kind === 'gunner' || f.kind === 'mother') && --f.cool <= 0) {
        const v = 0.007;
        for (const k of f.kind === 'mother' ? [-0.3, 0, 0.3] : [0]) s.shots.push({ x: f.x, y: f.y, vx: Math.cos(Math.atan2(dy, dx) + k) * v, vy: Math.sin(Math.atan2(dy, dx) + k) * v, life: 200 });
        f.cool = f.kind === 'mother' ? 70 : 110 - Math.min(50, s.wave * 5);
      }
      // 부딪힘: 붙은 운석이 먼저 막는다
      const shield = s.rocks.find((r) => r.stuck && Math.hypot(r.x - f.x, r.y - f.y) < ROCK + FOE_R[f.kind]);
      if (shield) {
        if (--shield.hp <= 0) (shield.stuck = null), (shield.hp = 0);
        f.hp -= 1;
        ev(s, 'block', shield.x, shield.y);
        if (f.kind === 'mine') blast(s, f.x, f.y, 0.1), (f.hp = 0);
      } else if (Math.hypot(f.x - s.x, f.y - s.y) < CORE + FOE_R[f.kind] && s.inv === 0) {
        s.hull--;
        s.inv = 60;
        if (f.kind !== 'mother') (f.hp = 0), (f.crash = true);
        ev(s, 'hurt', s.x, s.y, '쾅! 하트 -1');
      }
    }
    for (const b of s.shots) {
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
      const shield = s.rocks.find((r) => r.stuck && Math.hypot(r.x - b.x, r.y - b.y) < ROCK + 0.008);
      if (shield) {
        b.life = 0;
        if (--shield.hp <= 0) (shield.stuck = null), (shield.hp = 0);
        ev(s, 'block', b.x, b.y);
      } else if (Math.hypot(b.x - s.x, b.y - s.y) < CORE + 0.008 && s.inv === 0) (b.life = 0), s.hull--, (s.inv = 60), ev(s, 'hurt', s.x, s.y, '피격! 하트 -1');
    }
    s.shots = s.shots.filter((b) => b.life > 0 && b.x > -0.1 && b.x < 1.1 && b.y > -0.1 && b.y < A + 0.1);
    for (const f of s.foes) if (f.hp <= 0) f.crash ? ev(s, 'boom', f.x, f.y) : (s.kills++, ev(s, 'kill', f.x, f.y, f.kind === 'mother' ? '모선 격추!' : '+1'));
    s.foes = s.foes.filter((f) => f.hp > 0);
    s.rocks = s.rocks.filter((r) => r.hp > 0 && (r.stuck || (r.x > -0.15 && r.x < 1.15 && r.y > -0.15 && r.y < A + 0.15)));
    if (s.hull <= 0) s.dead = true;
  },
  over: (s) => s.dead,
  score: (s) => s.kills * 10 + s.stars * 5 + s.biggest,
  draw(ctx, s, w, h, th: Theme) {
    const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
    ctx.save();
    fx.begin(ctx);
    ctx.fillStyle = th.bg;
    ctx.fillRect(-10, -10, w + 20, h + 20);
    for (let k = 0; k < 3; k++) {
      const x = X(0.5 + 0.4 * Math.sin(s.t / (500 + k * 120) + k * 2)), y = Y(A * (0.5 + 0.3 * Math.cos(s.t / 600 + k))), r = R(0.5), g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `hsla(${[270, 200, 320][k]},80%,45%,.2)`);
      g.addColorStop(1, 'hsla(0,0%,0%,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let k = 0; k < 70; k++) {
      const depth = 0.3 + (k % 3) * 0.35, x = ((((k * 7919) % 997) / 997) * w - s.x * w * 0.1 * depth + w) % w, y = ((((k * 104729) % 991) / 991) * h - s.y * w * 0.1 * depth + h) % h;
      ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.4 * depth})`;
      ctx.fillRect(x, y, depth * 2, depth * 2);
    }
    // 자석 고리 (누르고 있을 때 맥박)
    if (s.on) {
      const rr = R(PULL + stuckCount(s) * 0.004);
      ctx.strokeStyle = `rgba(122,247,255,${0.25 + 0.15 * Math.sin(s.t / 4)})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -s.t;
      ctx.beginPath();
      ctx.arc(X(s.x), Y(s.y), rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // 운석
    const rockShape = (r: Rock) => {
      const x = X(r.x), y = Y(r.y), rad = R(ROCK);
      ctx.fillStyle = ROCK_COL[r.kind];
      if (r.stuck) (ctx.shadowColor = th.accent), (ctx.shadowBlur = 10);
      if (r.flying) (ctx.shadowColor = '#fff6c8'), (ctx.shadowBlur = 14);
      ctx.beginPath();
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2, rr = rad * (0.8 + (((k * 37 + Math.floor(r.vx * 1e5)) % 5) / 5) * 0.35);
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      if (r.kind === 'bomb') (ctx.fillStyle = s.t % 20 < 10 ? '#fff2a0' : '#ff4d4d'), ctx.fillRect(x - 2, y - 2, 4, 4);
      if (r.kind === 'metal' && r.hp > 1) (ctx.strokeStyle = '#fff'), (ctx.lineWidth = 1.5), ctx.stroke();
      if (r.flying > 0) (ctx.strokeStyle = 'rgba(255,246,200,.5)'), (ctx.lineWidth = 2), ctx.beginPath(), ctx.moveTo(x, y), ctx.lineTo(x - r.vx * w * 4, y - r.vy * w * 4), ctx.stroke();
    };
    ctx.strokeStyle = 'rgba(122,247,255,.28)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const r of s.rocks) if (r.stuck) (ctx.moveTo(X(s.x), Y(s.y)), ctx.lineTo(X(r.x), Y(r.y)));
    ctx.stroke();
    for (const r of s.rocks) rockShape(r);
    // 배
    ctx.globalAlpha = s.inv > 0 && s.t % 8 < 4 ? 0.4 : 1;
    const core = ctx.createRadialGradient(X(s.x), Y(s.y), 0, X(s.x), Y(s.y), R(CORE * 1.6));
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.4, th.accent);
    core.addColorStop(1, 'rgba(122,247,255,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(X(s.x), Y(s.y), R(CORE * 1.6), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b2a5a';
    ctx.beginPath();
    ctx.arc(X(s.x), Y(s.y), R(CORE * 0.7), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // 적과 총알
    for (const f of s.foes) {
      const x = X(f.x), y = Y(f.y), rad = R(FOE_R[f.kind]), col = f.kind === 'gunner' ? '#ff9f43' : f.kind === 'mine' ? '#ff4f7a' : f.kind === 'mother' ? '#c56bff' : '#ff6b8b';
      const ang = f.kind === 'gunner' || f.kind === 'mother' ? Math.atan2(s.y - f.y, s.x - f.x) : Math.atan2(f.vy, f.vx);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(f.kind === 'mine' ? s.t * 0.04 : ang);
      ctx.fillStyle = f.frozen > 0 ? '#bff3ff' : col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      if (f.kind === 'mine') for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, rr = k % 2 ? rad : rad * 0.62; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      else if (f.kind === 'gunner') for (let k = 0; k < 6; k++) ctx.lineTo(Math.cos((k / 6) * Math.PI * 2) * rad * 0.85, Math.sin((k / 6) * Math.PI * 2) * rad * 0.85);
      else if (f.kind === 'mother') ctx.ellipse(0, 0, rad, rad * 0.62, 0, 0, Math.PI * 2);
      else (ctx.moveTo(rad, 0), ctx.lineTo(-rad * 0.8, -rad * 0.85), ctx.lineTo(-rad * 0.35, 0), ctx.lineTo(-rad * 0.8, rad * 0.85));
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      if (f.kind === 'gunner') ctx.fillRect(0, -rad * 0.16, rad * 1.25, rad * 0.32);
      if (f.kind === 'mother') (ctx.fillStyle = '#ffd6ff'), ctx.beginPath(), ctx.arc(rad * 0.15, 0, rad * 0.3, 0, Math.PI * 2), ctx.fill();
      if (f.kind === 'drone') (ctx.fillStyle = s.t % 6 < 3 ? '#fff2a0' : '#ffb35c'), ctx.beginPath(), ctx.arc(-rad * 0.55, 0, rad * 0.22, 0, Math.PI * 2), ctx.fill();
      if (f.kind === 'mine') (ctx.fillStyle = s.t % 30 < 15 ? '#fff' : '#ff4f7a'), ctx.beginPath(), ctx.arc(0, 0, rad * 0.25, 0, Math.PI * 2), ctx.fill();
      if (f.frozen > 0) (ctx.strokeStyle = '#ffffff'), (ctx.lineWidth = 2), ctx.stroke();
      ctx.restore();
      if (f.kind === 'mother') (ctx.fillStyle = 'rgba(0,0,0,.4)'), ctx.fillRect(x - rad, y - rad - 10, rad * 2, 5), (ctx.fillStyle = '#ff4f7a'), ctx.fillRect(x - rad, y - rad - 10, (rad * 2 * f.hp) / FOE_HP.mother, 5);
    }
    ctx.fillStyle = '#ffde59';
    ctx.shadowColor = '#ffde59';
    ctx.shadowBlur = 8;
    for (const b of s.shots) (ctx.beginPath(), ctx.arc(X(b.x), Y(b.y), R(0.008), 0, Math.PI * 2), ctx.fill());
    ctx.shadowBlur = 0;
    const seenT = fx.memo.t ?? -1;
    for (const e of s.events) {
      if (e.t <= seenT) continue;
      if (e.kind === 'clank') fx.burst(X(e.x), Y(e.y), th.accent, 5, 1.5, 2), fx.kick(1.5);
      if (e.kind === 'launch') fx.ring(X(e.x), Y(e.y), th.accent, 160, 6), fx.blink('#7af7ff', 0.12), fx.kick(6), e.text && fx.pop(X(e.x), Y(e.y) - 30, e.text, '#ffffff', 18);
      if (e.kind === 'hit' || e.kind === 'block') fx.burst(X(e.x), Y(e.y), '#ffe9a0', 8, 2.5, 2);
      if (e.kind === 'boom') fx.ring(X(e.x), Y(e.y), '#ff7a4d', 70, 6), fx.burst(X(e.x), Y(e.y), '#ff7a4d', 26, 4.5, 3), fx.kick(8);
      if (e.kind === 'kill') fx.burst(X(e.x), Y(e.y), '#ff6b8b', 18, 3.5, 2.5), fx.pop(X(e.x), Y(e.y) - 14, e.text!, '#ffffff', 14);
      if (e.kind === 'hurt') fx.kick(12), fx.blink(th.hot, 0.35), fx.pop(X(e.x), Y(e.y) - 30, e.text!, th.hot, 16);
      if (e.kind === 'wave') fx.pop(w / 2, h * 0.35, e.text!, '#ffffff', 22);
      if (e.kind === 'clear') fx.pop(w / 2, h * 0.42, e.text!, '#ffe066', 20), fx.blink('#fff6c8', 0.2);
      if (e.kind === 'new') fx.pop(w / 2, h * 0.5, e.text!, th.accent, 15);
    }
    fx.memo.t = s.t;
    ctx.restore();
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = th.ink;
    ctx.font = `900 ${R(0.045)}px system-ui, sans-serif`;
    ctx.fillText(`${s.wave}웨이브 · 격추 ${s.kills} · ★ ${s.stars}`, 10, 10);
    ctx.font = `700 ${R(0.032)}px system-ui, sans-serif`;
    ctx.fillStyle = th.accent;
    ctx.fillText(`붙은 운석 ${stuckCount(s)} (최대 ${s.biggest})`, 10, 14 + R(0.045));
    ctx.textAlign = 'right';
    ctx.fillStyle = th.hot;
    ctx.font = `700 ${R(0.045)}px system-ui, sans-serif`;
    ctx.fillText('♥'.repeat(Math.max(0, s.hull)), w - 10, 10);
    if (s.t < 300 && !s.on) (ctx.textAlign = 'center'), (ctx.fillStyle = th.ink), (ctx.font = `800 ${R(0.042)}px system-ui, sans-serif`), ctx.fillText('👆 누르고 있다가 떼 보세요', w / 2, h * 0.4);
  },
};

const memo = new WeakMap<object, { x: number; y: number; on: boolean }>();
/** 봇: 아무 데나 누르거나 뗀다 */
export const magnetRandom: Bot<MagnetState> = {
  name: '아무 데나',
  act(s, rng) {
    let m = memo.get(s);
    if (!m || s.t % 45 === 0) memo.set(s, (m = { x: rng(), y: rng(), on: rng() < 0.6 }));
    return { tap: false, dir: 0, pointer: m.on ? { x: m.x, y: m.y } : null };
  },
};

/** 봇: 운석이 많은 쪽·적과 총알이 적은 쪽으로 가며 붙이고, 붙은 게 넉넉하고 적이 사거리에 들어오면 뗀다 */
export const magnetSmart: Bot<MagnetState> = {
  name: '자석 장인',
  act(s) {
    const n = stuckCount(s), threat = s.foes.filter((f) => Math.hypot(f.x - s.x, f.y - s.y) < 0.22).length;
    if (s.on && n >= Math.max(3, Math.min(10, 2 + s.wave)) && threat > 0) return { tap: false, dir: 0, pointer: null };
    let best = { x: s.x, y: s.y, v: -1e9 };
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, x = Math.max(0.05, Math.min(0.95, s.x + Math.cos(a) * 0.12)), y = Math.max(0.05, Math.min(A - 0.05, s.y + Math.sin(a) * 0.12));
      let v = 0;
      for (const r of s.rocks) if (!r.stuck && !r.flying) v += 1 / (0.05 + Math.hypot(r.x - x, r.y - y));
      for (const f of s.foes) v -= (n > 4 ? 0.5 : 2.5) / (0.04 + Math.hypot(f.x - x, f.y - y));
      for (const b of s.shots) v -= 3 / (0.03 + Math.hypot(b.x - x, b.y - y));
      v -= Math.hypot(x - 0.5, y - A / 2) * 3;
      if (v > best.v) best = { x, y, v };
    }
    return { tap: false, dir: 0, pointer: { x: best.x, y: best.y / A } };
  },
};
