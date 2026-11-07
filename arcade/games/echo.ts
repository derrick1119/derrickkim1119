/**
 * 분신 받아치기 (0026, 12라운드) — 공 받아치기(퐁) × 받아내기 · 좌우 미끄러지기 · 유령 경주.
 * 와우 포인트: 8초마다 "방금 8초 동안의 나"를 그대로 반복하는 분신이 생긴다 — 내 과거가 내 팀이 된다.
 *            단, 분신은 생각 없이 따라 할 뿐이라 폭탄도 그대로 쳐서 사라진다 → 지금의 움직임을 미래의 분신까지 생각하고 고른다.
 * 피로: 분신이 늘수록 일을 나눠 맡는다(대신 공이 늘어난다). 한 번 잘 움직이면 그 움직임이 계속 일한다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.4, PY = A - 0.14, PW = 0.09, MOVE = 0.04, LOOP = 480, MAX_ECHO = 4, BALL = 0.02;
type Kind = 'ball' | 'bomb' | 'split' | 'gold' | 'heavy';
const KIND_NAME: Record<Kind, string> = { ball: '공', bomb: '폭탄', split: '쪼개지는 공', gold: '황금 공', heavy: '무거운 공' };
interface Ball { kind: Kind; x: number; y: number; vx: number; vy: number; hits: number; life: number }
interface Echo { tape: number[]; born: number; hue: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string }
export interface EchoState {
  rng: Rng; t: number; x: number; tape: number[]; echoes: Echo[]; balls: Ball[]; lives: number; score: number; combo: number; best: number;
  respawn: number; seen: Set<string>; events: Ev[]; dead: boolean;
}

export const echoX = (s: EchoState, e: Echo, t = s.t) => e.tape[(t - e.born) % LOOP];
const speed = (s: EchoState) => (0.42 + 0.006 * (s.t / 60)) / 60;
const ev = (s: EchoState, kind: string, x: number, y: number, text?: string) => s.events.push({ t: s.t, kind, x, y, text });
function see(s: EchoState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  ev(s, 'new', 0.5, A * 0.35, text);
}

function addBall(s: EchoState, kind: Kind) {
  const v = speed(s) * (kind === 'heavy' ? 0.75 : kind === 'bomb' ? 0.55 : 1), a = (s.rng() - 0.5) * 1.1;
  s.balls.push({ kind, x: 0.15 + s.rng() * 0.7, y: 0.05, vx: Math.sin(a) * v, vy: Math.cos(a) * v, hits: 0, life: kind === 'gold' ? 60 * 7 : 1e9 });
  if (kind !== 'ball' || s.balls.filter((b) => b.kind === 'ball').length === 2) see(s, kind === 'ball' ? 'ball2' : kind, kind === 'ball' ? '공이 하나 더!' : kind === 'bomb' ? '폭탄! 치면 안 돼요 — 분신이 치면 분신이 사라져요' : `새 공: ${KIND_NAME[kind]}!`);
}

/** 이 x에 있는 채(나 + 분신들)에 공이 닿았나 */
function paddleAt(s: EchoState, bx: number): { x: number; who: number } | null {
  if (Math.abs(bx - s.x) < PW + BALL) return { x: s.x, who: -1 };
  for (let k = 0; k < s.echoes.length; k++) {
    const ex = echoX(s, s.echoes[k]);
    if (Math.abs(bx - ex) < PW + BALL) return { x: ex, who: k };
  }
  return null;
}

export const echo: GameDef<EchoState> = {
  id: 'echo',
  name: '분신 받아치기',
  genes: ['pong', 'catch', 'slide', 'ghost'],
  twist: '8초마다 "방금 8초 동안의 나"를 그대로 반복하는 분신이 생긴다 — 내 과거가 내 팀이 된다. 단 분신은 폭탄도 그대로 쳐서 사라진다',
  rules: ['손가락을 따라 채가 좌우로 움직여요 (키보드 ← →). 공을 받아 올려요.', '8초마다 방금 8초 동안의 내 움직임을 그대로 따라 하는 분신이 생겨요.', '공을 놓치거나 내가 폭탄을 치면 하트 -1. 분신이 폭탄을 치면 그 분신이 사라져요.'],
  controls: 'leftright',
  hint: '드래그로 채 움직이기 / ← →',
  aspect: A,
  art: {
    concept: '네온 잔상 경기장',
    mood: '보랏빛 밤하늘 아래 흘러가는 네온 바닥. 내 채는 하늘색으로 빛나고, 분신들은 분홍·노랑·연두 잔상으로 같은 몸짓을 되풀이한다.',
    palette: { bg: '#0d0820', ink: '#f5f0ff', muted: '#5a4a8a', accent: '#5ef0ff', hot: '#ff4d6d', soft: '#1f1640' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s: EchoState = { rng: mulberry32(seed), t: 0, x: 0.5, tape: [], echoes: [], balls: [], lives: 3, score: 0, combo: 0, best: 0, respawn: 0, seen: new Set(), events: [], dead: false };
    addBall(s, 'ball');
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.events = s.events.filter((e) => s.t - e.t < 90);
    const target = inp.aim !== undefined ? inp.aim : s.x + inp.dir * MOVE;
    s.x = Math.max(PW * 0.5, Math.min(1 - PW * 0.5, s.x + Math.max(-MOVE, Math.min(MOVE, target - s.x))));
    s.tape.push(s.x);
    if (s.tape.length > LOOP) s.tape.shift();
    // 8초마다 분신: 방금 8초를 녹화한 테이프. 넷이 넘으면 가장 오래된 분신이 새 테이프로 바뀐다
    if (s.t % LOOP === 0) {
      const e: Echo = { tape: [...s.tape], born: s.t, hue: [320, 50, 120, 270][s.echoes.length % 4] };
      if (s.echoes.length < MAX_ECHO) s.echoes.push(e);
      else (s.echoes.shift(), s.echoes.push(e), see(s, 'swap', '분신 교대 — 가장 오래된 분신이 방금의 나로 바뀌어요'));
      ev(s, 'echo', s.x, PY, `분신 ${s.echoes.length}호!`);
      see(s, 'echo' + s.echoes.length, s.echoes.length === 1 ? '분신 등장! 방금 8초의 나를 따라 해요' : `분신 ${s.echoes.length}호!`);
    }
    // 공이 늘고 새 종류가 나온다
    const sec = s.t / 60, normal = s.balls.filter((b) => b.kind === 'ball' || b.kind === 'split' || b.kind === 'heavy').length;
    if (s.respawn > 0 && --s.respawn === 0) addBall(s, 'ball');
    if (sec > 9 && s.t % 600 === 300 && normal < 2 + Math.floor(sec / 25)) addBall(s, sec > 60 && s.rng() < 0.4 ? 'heavy' : sec > 40 && s.rng() < 0.5 ? 'split' : 'ball');
    if (sec > 22 && s.t % Math.max(150, 420 - Math.floor(sec) * 3) === 0) addBall(s, 'bomb');
    if (sec > 30 && s.t % 900 === 450) addBall(s, 'gold');
    for (const b of s.balls) {
      b.life--;
      const sp = Math.hypot(b.vx, b.vy), want = speed(s) * (b.kind === 'heavy' ? 0.75 : b.kind === 'bomb' ? 0.55 : 1);
      if (b.kind !== 'bomb' && sp > 0) (b.vx *= want / sp), (b.vy *= want / sp);
      b.x += b.vx;
      b.y += b.vy;
      if (b.x < BALL || b.x > 1 - BALL) (b.vx = -b.vx), (b.x = Math.max(BALL, Math.min(1 - BALL, b.x)));
      if (b.y < BALL) (b.vy = Math.abs(b.vy)), (b.y = BALL);
      if (b.vy > 0 && b.y >= PY - BALL && b.y - b.vy < PY - BALL + 0.002) {
        const p = paddleAt(s, b.x);
        if (!p) continue;
        if (b.kind === 'bomb') {
          // 내가 치면 하트 -1, 분신이 치면 그 분신이 사라진다 (내 과거가 나를 죽이지는 않지만, 팀을 잃는다)
          b.life = 0;
          s.combo = 0;
          if (p.who < 0) s.lives--;
          else s.echoes.splice(p.who, 1);
          ev(s, 'boom', b.x, PY, p.who < 0 ? '펑! 폭탄을 쳤어요 (하트 -1)' : `펑! 분신 ${p.who + 1}호가 사라졌어요`);
          continue;
        }
        if (b.kind === 'heavy' && ++b.hits % 2 === 1) (b.vy = -Math.abs(b.vy) * 0.4), ev(s, 'thud', b.x, PY, '묵직!');
        else {
          const off = Math.max(-1, Math.min(1, (b.x - p.x) / PW)), v = Math.hypot(b.vx, b.vy);
          b.vx = off * v * 0.75;
          b.vy = -Math.sqrt(Math.max(1e-9, v * v - b.vx * b.vx));
        }
        b.y = PY - BALL;
        const gain = b.kind === 'gold' ? 10 : 1;
        s.score += gain;
        s.combo++;
        s.best = Math.max(s.best, s.combo);
        ev(s, 'hit', b.x, PY, p.who < 0 ? `+${gain}` : `분신 +${gain}`);
        if (b.kind === 'gold') b.life = 0;
        if (b.kind === 'split' && b.hits++ === 0) {
          s.balls.push({ ...b, vx: -b.vx, kind: 'ball', hits: 0 });
          ev(s, 'split', b.x, PY, '둘로!');
        }
      }
      if (b.y > A + 0.03) {
        b.life = 0;
        if (b.kind === 'bomb' || b.kind === 'gold') continue;
        s.lives--;
        s.combo = 0;
        ev(s, 'miss', b.x, A - 0.02, '놓쳤다!');
        if (s.balls.filter((x) => x.life > 0 && x.kind !== 'bomb' && x.kind !== 'gold').length === 0) s.respawn = 90;
      }
    }
    s.balls = s.balls.filter((b) => b.life > 0);
    if (s.lives <= 0) s.dead = true;
  },
  over: (s) => s.dead,
  score: (s) => s.score,
  draw(ctx, s, w, h, th: Theme) {
    const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
    ctx.save();
    fx.begin(ctx);
    // 밤하늘 + 흘러가는 네온 바닥(원근 격자)
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1a0b3a');
    g.addColorStop(0.65, '#0d0820');
    g.addColorStop(1, '#2a0b3d');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -10, w + 20, h + 20);
    for (let k = 0; k < 40; k++) {
      ctx.fillStyle = `rgba(255,255,255,${0.2 + 0.5 * Math.abs(Math.sin(s.t / 40 + k))})`;
      ctx.fillRect(((k * 7919) % 997) / 997 * w, ((k * 104729) % 991) / 991 * h * 0.6, 1.5, 1.5);
    }
    const hz = Y(PY - 0.35);
    ctx.strokeStyle = 'rgba(255,80,200,.35)';
    ctx.lineWidth = 1;
    for (let k = -8; k <= 8; k++) (ctx.beginPath(), ctx.moveTo(w / 2 + k * w * 0.04, hz), ctx.lineTo(w / 2 + k * w * 0.35, h), ctx.stroke());
    for (let k = 0; k < 8; k++) {
      const u = ((k + (s.t % 30) / 30) / 8) ** 2, y = hz + (h - hz) * u;
      ctx.globalAlpha = u;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 다음 분신까지 남은 시간 (위쪽 띠)
    const until = LOOP - (s.t % LOOP);
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fillRect(0, Y(0.004), w, 4);
    ctx.fillStyle = th.accent;
    ctx.fillRect(0, Y(0.004), w * (1 - until / LOOP), 4);
    // 채: 분신(잔상 색) → 나(하늘색). 빛 번짐
    const paddle = (x: number, color: string, alpha: number, face: boolean) => {
      ctx.globalAlpha = alpha;
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.fillStyle = color;
      const px = X(x - PW), py = Y(PY), pw = R(PW * 2), ph = R(0.032);
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, ph / 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (face) {
        const near = s.balls.filter((b) => b.kind !== 'bomb').sort((a, b) => Math.hypot(a.x - x, a.y - PY) - Math.hypot(b.x - x, b.y - PY))[0];
        const look = near ? Math.max(-1, Math.min(1, (near.x - x) * 8)) : 0, bomb = s.balls.some((b) => b.kind === 'bomb' && b.y > PY - 0.25 && Math.abs(b.x - x) < 0.15);
        ctx.fillStyle = '#0d0820';
        for (const dx of [-0.025, 0.025]) {
          ctx.beginPath();
          ctx.arc(X(x + dx) + look * 2, Y(PY) + ph * 0.5, bomb ? 3.5 : 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };
    for (const e of s.echoes) {
      const col = `hsl(${e.hue},100%,65%)`;
      // 분신의 앞으로 1초 길 (예고): 점선
      ctx.fillStyle = col;
      for (let k = 6; k <= 60; k += 6) (ctx.globalAlpha = 0.35 * (1 - k / 66)), ctx.fillRect(X(echoX(s, e, s.t + k)) - 1.5, Y(PY) + R(0.04) + k * 0.4, 3, 3);
      paddle(echoX(s, e), col, 0.7, false);
    }
    paddle(s.x, th.accent, 1, true);
    // 공 (잔상 꼬리 + 빛)
    for (const b of s.balls) {
      const col = b.kind === 'bomb' ? th.hot : b.kind === 'gold' ? '#ffd23f' : b.kind === 'heavy' ? '#b8c0cc' : b.kind === 'split' ? '#9dff7a' : '#ffffff';
      const r = R(BALL) * (b.kind === 'heavy' ? 1.6 : b.kind === 'bomb' ? 1.3 : 1);
      for (let k = 5; k >= 1; k--) {
        ctx.globalAlpha = 0.12 * (6 - k);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(X(b.x - b.vx * k * 2.2), Y(b.y - b.vy * k * 2.2), r * (1 - k * 0.12), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowColor = col;
      ctx.shadowBlur = b.kind === 'bomb' ? (s.t % 20 < 10 ? 28 : 10) : 20;
      ctx.fillStyle = b.kind === 'bomb' ? '#2a0a14' : col;
      ctx.beginPath();
      ctx.arc(X(b.x), Y(b.y), r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (b.kind === 'bomb') (ctx.strokeStyle = th.hot), (ctx.lineWidth = 2), ctx.stroke(), fx.burst(X(b.x) + r * 0.7, Y(b.y) - r, '#ffcf6a', s.t % 3 === 0 ? 1 : 0, 0.8, 1.5);
      if (b.kind === 'gold' && s.t % 5 === 0) fx.burst(X(b.x), Y(b.y), '#fff3a0', 1, 1, 1.5);
    }
    const seenT = fx.memo.t ?? -1;
    for (const e of s.events) {
      if (e.t <= seenT) continue;
      if (e.kind === 'hit') fx.ring(X(e.x), Y(e.y), th.accent, 30, 3), fx.burst(X(e.x), Y(e.y), '#ffffff', 8, 2.5, 2), fx.pop(X(e.x), Y(e.y) - 18, e.text!, th.ink, 13);
      if (e.kind === 'split' || e.kind === 'thud') fx.pop(X(e.x), Y(e.y) - 34, e.text!, '#9dff7a', 15);
      if (e.kind === 'echo') fx.ring(X(e.x), Y(e.y), '#ff6ad5', 120, 6), fx.blink('#ff6ad5', 0.2), fx.pop(X(e.x), Y(e.y) - 40, e.text!, '#ff9be6', 18);
      if (e.kind === 'boom') fx.kick(14), fx.blink(th.hot, 0.45), fx.ring(X(e.x), Y(e.y), th.hot, 140, 8), fx.burst(X(e.x), Y(e.y), th.hot, 40, 5, 4), fx.pop(w / 2, h * 0.45, e.text!, th.hot, 17);
      if (e.kind === 'miss') fx.kick(8), fx.blink(th.hot, 0.25), fx.pop(X(e.x), Y(e.y) - 20, e.text!, th.hot, 15);
      if (e.kind === 'new') fx.pop(w / 2, h * 0.3, e.text!, '#ffd23f', 16);
    }
    if (s.combo > 0 && s.combo % 10 === 0 && fx.memo.combo !== s.combo) fx.pop(w / 2, h * 0.38, `콤보 ${s.combo}!`, '#ffd23f', 24), fx.ring(w / 2, h * 0.38, '#ffd23f', 90, 5);
    fx.memo.combo = s.combo;
    fx.memo.t = s.t;
    ctx.restore();
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = th.ink;
    ctx.font = `800 ${R(0.075)}px system-ui, sans-serif`;
    ctx.fillText(String(s.score), 10, 12);
    ctx.font = `700 ${R(0.036)}px system-ui, sans-serif`;
    ctx.fillStyle = '#ff9be6';
    ctx.fillText(`분신 ${s.echoes.length}/${MAX_ECHO} · 다음 ${Math.ceil(until / 60)}초`, 10, 16 + R(0.075));
    ctx.textAlign = 'right';
    ctx.fillStyle = th.hot;
    ctx.font = `700 ${R(0.05)}px system-ui, sans-serif`;
    ctx.fillText('♥'.repeat(Math.max(0, s.lives)), w - 10, 12);
    if (s.t < 420) (ctx.textAlign = 'center'), (ctx.fillStyle = th.ink), (ctx.font = `700 ${R(0.04)}px system-ui, sans-serif`), ctx.fillText(s.t < 200 ? '👆 좌우로 끌어 공을 받아요' : '지금 움직임을 잘 기억해 두세요… 곧 분신이 따라 해요', w / 2, h * 0.5);
  },
};

const memo = new WeakMap<object, number>();
/** 봇: 0.5초쯤마다 아무 데로나 채를 옮긴다 */
export const echoRandom: Bot<EchoState> = {
  name: '아무 데나',
  act(s, rng) {
    if (s.t % 30 === 0 || !memo.has(s)) memo.set(s, rng());
    return { tap: false, dir: 0, aim: memo.get(s)! };
  },
};

/** 공이 채 높이에 닿는 시각과 x (벽 튕김 포함) */
function landing(b: Ball): { x: number; t: number } | null {
  if (b.vy <= 0) {
    // 위로 가는 공: 천장에 닿았다 내려온다고 보고 대략 계산
    const up = (b.y - BALL) / -b.vy, down = (PY - BALL - BALL) / Math.abs(b.vy);
    return fold(b.x + b.vx * (up + down), up + down);
  }
  const t = (PY - BALL - b.y) / b.vy;
  return t < 0 ? null : fold(b.x + b.vx * t, t);
}
function fold(x: number, t: number) {
  const lo = BALL, span = 1 - 2 * BALL;
  let u = (x - lo) / span;
  u = ((u % 2) + 2) % 2;
  return { x: lo + (u > 1 ? 2 - u : u) * span, t };
}

/** 봇: 분신이 못 받는 공 중 가장 먼저 떨어질 공으로. 폭탄이 떨어질 자리는 피한다 */
export const echoSmart: Bot<EchoState> = {
  name: '받아치기 선수',
  act(s) {
    const balls = s.balls.filter((b) => b.kind !== 'bomb').map((b) => ({ b, l: landing(b) })).filter((x) => x.l) as { b: Ball; l: { x: number; t: number } }[];
    const covered = (x: number, t: number) => s.echoes.some((e) => Math.abs(echoX(s, e, s.t + Math.round(t)) - x) < PW * 0.8);
    const todo = balls.filter(({ l }) => !covered(l.x, l.t)).sort((p, q) => p.l.t - q.l.t);
    const bombs = s.balls.filter((b) => b.kind === 'bomb').map((b) => landing(b)).filter((l) => l && l.t < 50) as { x: number; t: number }[];
    let aim = todo.length ? todo[0].l.x + (todo[0].l.x > 0.5 ? 0.03 : -0.03) : 0.5;
    for (const bm of bombs) if (Math.abs(aim - bm.x) < PW + 0.03) aim = bm.x > aim ? bm.x - PW - 0.04 : bm.x + PW + 0.04;
    return { tap: false, dir: 0, aim: Math.max(0, Math.min(1, aim)) };
  },
};
