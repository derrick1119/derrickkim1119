/**
 * 올가미 (0026, 12라운드) — 땅따먹기 × 3매치 · 가리키기 · 연쇄 폭발.
 * 와우 포인트: 손가락으로 그린 선이 스스로 닫히는 순간 그 안이 터진다. 같은 색만 감싸면 개수의 제곱만큼 점수 —
 *            그래서 같은 색이 모이길 기다렸다가 크게 감싼다. 다른 색이 섞이면 아무것도 안 터지고 구슬이 늘어난다.
 * 피로: 한 번 긋고 끝나는 손짓. 계속 누르고 있을 필요가 없다.
 * 하는 일을 바꾸는 펼쳐짐: 가시(선을 끊음 → 돌아서 그려야) · 무지개(아무 색) · 폭탄(감싸면 둘레까지 연쇄) · 색 바뀜 폭풍 · 다섯째 색 · 피버.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.3, ORB = 0.028, MAX = 36, STEP = 0.012, MAX_LEN = 1.8;
const HUE = [350, 200, 50, 130, 285];
type Kind = 'orb' | 'spike' | 'rainbow' | 'bomb';
interface Orb { kind: Kind; c: number; x: number; y: number; vx: number; vy: number; born: number }
interface Pt { x: number; y: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; poly?: Pt[]; c?: number }
export interface LassoState {
  rng: Rng; t: number; orbs: Orb[]; path: Pt[]; colors: number; score: number; pops: number; spawnIn: number; fever: number; storm: number;
  seen: Set<string>; events: Ev[]; dead: boolean;
}

const ev = (s: LassoState, e: Omit<Ev, 't'>) => s.events.push({ t: s.t, ...e });
function see(s: LassoState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  ev(s, { kind: 'new', x: 0.5, y: A * 0.3, text });
}
const len = (p: Pt[]) => p.reduce((a, q, i) => (i ? a + Math.hypot(q.x - p[i - 1].x, q.y - p[i - 1].y) : 0), 0);
function cross(a: Pt, b: Pt, c: Pt, d: Pt): Pt | null {
  const r = { x: b.x - a.x, y: b.y - a.y }, q = { x: d.x - c.x, y: d.y - c.y }, den = r.x * q.y - r.y * q.x;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((c.x - a.x) * q.y - (c.y - a.y) * q.x) / den, u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { x: a.x + r.x * t, y: a.y + r.y * t } : null;
}
export function inside(poly: Pt[], p: Pt) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if (poly[i].y > p.y !== poly[j].y > p.y && p.x < ((poly[j].x - poly[i].x) * (p.y - poly[i].y)) / (poly[j].y - poly[i].y) + poly[i].x) c = !c;
  }
  return c;
}

function spawn(s: LassoState) {
  const sec = s.t / 60, r = s.rng();
  const kind: Kind = sec > 12 && r < 0.1 ? 'spike' : sec > 25 && r < 0.17 ? 'rainbow' : sec > 40 && r < 0.23 ? 'bomb' : 'orb';
  const a = s.rng() * Math.PI * 2, v = (0.05 + s.rng() * 0.05) / 60;
  s.orbs.push({ kind, c: Math.floor(s.rng() * s.colors), x: 0.1 + s.rng() * 0.8, y: 0.15 + s.rng() * (A - 0.3), vx: Math.cos(a) * v, vy: Math.sin(a) * v, born: s.t });
  if (kind !== 'orb') see(s, kind, kind === 'spike' ? '가시 구슬! 선이 닿으면 끊겨요 (12초 뒤 사라져요)' : kind === 'rainbow' ? '무지개 구슬 — 아무 색이나 돼요' : '폭탄 구슬 — 같이 감싸면 둘레까지 펑!');
  s.spawnIn = Math.max(14, Math.round(62 - sec * 0.42));
}

/** 닫힌 올가미 안을 판정한다 */
function close(s: LassoState, poly: Pt[]) {
  const got = s.orbs.filter((o) => o.kind !== 'spike' && inside(poly, o));
  if (!got.length) return;
  const cols = new Set(got.filter((o) => o.kind === 'orb' || o.kind === 'bomb').map((o) => o.c));
  const cx = got.reduce((a, o) => a + o.x, 0) / got.length, cy = got.reduce((a, o) => a + o.y, 0) / got.length;
  if (cols.size > 1) {
    ev(s, { kind: 'mixed', x: cx, y: cy, text: '섞였어요! 구슬 +2', poly });
    spawn(s), spawn(s);
    return;
  }
  // 폭탄: 둘레 0.15 안의 구슬도 색과 상관없이 함께 터진다 (연쇄)
  const boom = new Set(got);
  for (const b of got.filter((o) => o.kind === 'bomb')) for (const o of s.orbs) if (Math.hypot(o.x - b.x, o.y - b.y) < 0.15) boom.add(o); // 폭탄은 가시까지 날린다
  const n = boom.size, gain = n * n * (s.fever > 0 ? 2 : 1);
  s.orbs = s.orbs.filter((o) => !boom.has(o));
  s.score += gain;
  s.pops += n;
  ev(s, { kind: 'pop', x: cx, y: cy, text: n > 1 ? `${n}개! +${gain}` : `+${gain}`, poly, c: [...cols][0] ?? 0 });
  for (const o of boom) ev(s, { kind: 'orb', x: o.x, y: o.y, c: o.c });
  if (boom.size > got.length) ev(s, { kind: 'chain', x: cx, y: cy, text: '연쇄 폭발!' });
  if (n >= 3) see(s, 'big', `한 번에 ${n}개 — 제곱이라 ${n * n}점! 더 크게 모아 감싸 보세요`);
  if (n >= 5) (s.fever = 180), see(s, 'fever', '피버! 3초 동안 점수 두 배·구슬이 느려져요'), ev(s, { kind: 'fever', x: cx, y: cy, text: '피버!' });
}

export const lasso: GameDef<LassoState> = {
  id: 'lasso',
  name: '올가미',
  genes: ['territory', 'match3', 'pointer', 'chain'],
  twist: '손가락으로 그린 선이 스스로 닫히는 순간 그 안이 터진다 — 같은 색만 감싸면 개수의 제곱만큼',
  rules: ['손가락으로 선을 그려 구슬을 동그랗게 감싸면, 선이 닫히는 순간 안이 터져요 (키보드: 화살표 + 스페이스).', '같은 색만 감싸야 해요. 많이 감쌀수록 개수의 제곱만큼 점수! 다른 색이 섞이면 구슬이 늘어요.', '구슬이 36개로 꽉 차면 끝.'],
  controls: 'touch',
  hint: '그려서 감싸기 / 화살표 + 스페이스',
  aspect: A,
  art: {
    concept: '밤하늘 구슬 잡기',
    mood: '천천히 흐르는 성운 위로 눈 달린 유리구슬들이 떠다닌다. 손가락 끝에서 네온 실이 뻗고, 닫히는 순간 안쪽이 번쩍이며 터진다.',
    palette: { bg: '#0b0d24', ink: '#f6f4ff', muted: '#5b5f9a', accent: '#7af0ff', hot: '#ff4d6d', soft: '#1a1e44' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s: LassoState = { rng: mulberry32(seed), t: 0, orbs: [], path: [], colors: 4, score: 0, pops: 0, spawnIn: 60, fever: 0, storm: 0, seen: new Set(), events: [], dead: false };
    for (let k = 0; k < 14; k++) spawn(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.events = s.events.filter((e) => s.t - e.t < 90);
    const sec = s.t / 60;
    if (sec >= 70 && s.colors < 5) (s.colors = 5), see(s, 'color5', '다섯째 색이 나타났어요!');
    if (sec >= 55 && s.t % 360 === 0) {
      for (const o of s.orbs) if (o.kind === 'orb' || o.kind === 'bomb') o.c = (o.c + 1) % s.colors;
      s.storm = 30;
      see(s, 'storm', '색 바뀜 폭풍! 6초마다 모든 구슬 색이 한 칸씩 바뀌어요');
      ev(s, { kind: 'storm', x: 0.5, y: A / 2 });
    }
    if (s.storm > 0) s.storm--;
    if (s.fever > 0) s.fever--;
    if (--s.spawnIn <= 0) spawn(s);
    s.orbs = s.orbs.filter((o) => o.kind !== 'spike' || s.t - o.born < 60 * 12);
    // 구슬: 천천히 떠다니고 벽에서 튕긴다, 서로 살짝 밀어낸다
    const slow = s.fever > 0 ? 0.4 : 1;
    for (const o of s.orbs) {
      o.x += o.vx * slow;
      o.y += o.vy * slow;
      if (o.x < ORB || o.x > 1 - ORB) (o.vx = -o.vx), (o.x = Math.max(ORB, Math.min(1 - ORB, o.x)));
      if (o.y < 0.1 + ORB || o.y > A - ORB) (o.vy = -o.vy), (o.y = Math.max(0.1 + ORB, Math.min(A - ORB, o.y)));
    }
    for (let i = 0; i < s.orbs.length; i++) for (let j = i + 1; j < s.orbs.length; j++) {
      const a = s.orbs[i], b = s.orbs[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d > 0 && d < ORB * 2) {
        const push = (ORB * 2 - d) / 2;
        (a.x -= (dx / d) * push), (a.y -= (dy / d) * push), (b.x += (dx / d) * push), (b.y += (dy / d) * push);
      }
    }
    // 선 긋기: 누르는 동안 손가락 자취가 선이 된다. 스스로 교차하면 닫힌 올가미
    if (!inp.pointer) s.path = [];
    else {
      const p = { x: inp.pointer.x, y: inp.pointer.y * A }, last = s.path.at(-1);
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= STEP) {
        s.path.push(p);
        const n = s.path.length;
        if (n >= 2) {
          const a = s.path[n - 2], b = s.path[n - 1];
          // 가시에 닿으면 선이 끊긴다
          if (s.orbs.some((o) => o.kind === 'spike' && segDist(o, a, b) < ORB * 1.1)) (ev(s, { kind: 'cut', x: b.x, y: b.y, text: '툭! 선이 끊겼어요' }), (s.path = [b]));
          else for (let i = 0; i < n - 4; i++) {
            const hit = cross(s.path[i], s.path[i + 1], a, b);
            if (!hit) continue;
            close(s, [hit, ...s.path.slice(i + 1, n - 1)]);
            s.path = [b];
            break;
          }
        }
        while (len(s.path) > MAX_LEN) s.path.shift();
      }
    }
    if (s.orbs.length >= MAX) s.dead = true;
  },
  over: (s) => s.dead,
  score: (s) => s.score,
  draw(ctx, s, w, h, th: Theme) {
    const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
    ctx.save();
    fx.begin(ctx);
    ctx.fillStyle = th.bg;
    ctx.fillRect(-10, -10, w + 20, h + 20);
    // 흐르는 성운
    for (let k = 0; k < 4; k++) {
      const x = X(0.5 + 0.4 * Math.sin(s.t / (400 + k * 90) + k * 2)), y = Y(A * (0.5 + 0.35 * Math.cos(s.t / (500 + k * 70) + k))), r = R(0.45);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `hsla(${[260, 200, 320, 180][k]},80%,45%,.22)`);
      g.addColorStop(1, 'hsla(260,80%,40%,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let k = 0; k < 50; k++) ctx.fillRect((((k * 7919) % 997) / 997) * w, (((k * 104729) % 991) / 991) * h, 1.2, 1.2);
    if (s.storm > 0) (ctx.fillStyle = `rgba(255,255,255,${s.storm / 120})`), ctx.fillRect(0, 0, w, h);
    // 가득 참 경고: 가장자리가 붉게 맥박친다
    const full = s.orbs.length / MAX;
    if (full > 0.7) {
      const a = (full - 0.7) * 2 * (0.6 + 0.4 * Math.sin(s.t / 6));
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      vg.addColorStop(0, 'rgba(255,40,80,0)');
      vg.addColorStop(1, `rgba(255,40,80,${a})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    }
    // 방금 닫힌 올가미: 안쪽이 0.3초 동안 번쩍이며 사라진다
    for (const e of s.events) {
      const age = s.t - e.t;
      if (e.kind !== 'pop' || !e.poly || age > 20) continue;
      ctx.fillStyle = `hsla(${HUE[e.c ?? 0]},100%,75%,${0.55 * (1 - age / 20)})`;
      ctx.strokeStyle = `hsla(${HUE[e.c ?? 0]},100%,85%,${1 - age / 20})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      e.poly.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // 선 (네온 실)
    const head = s.path.at(-1);
    if (s.path.length > 1) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = th.accent;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = th.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      s.path.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))));
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      fx.burst(X(head!.x), Y(head!.y), th.accent, 1, 1, 2);
    }
    // 구슬: 유리 광택 + 손가락 끝을 쳐다보는 눈
    for (const o of s.orbs) {
      const x = X(o.x), y = Y(o.y), r = R(ORB) * Math.min(1, (s.t - o.born) / 12 + 0.2), hue = o.kind === 'rainbow' ? (s.t * 4) % 360 : HUE[o.c];
      if (o.kind === 'spike') {
        ctx.globalAlpha = Math.min(1, (60 * 12 - (s.t - o.born)) / 90); // 사라지기 전 1.5초 동안 흐려진다
        ctx.fillStyle = '#20122a';
        ctx.strokeStyle = th.hot;
        ctx.shadowColor = th.hot;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2 + s.t * 0.02, rr = k % 2 ? r * 0.7 : r * 1.25;
          ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        continue;
      }
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
      g.addColorStop(0, `hsl(${hue},100%,${o.kind === 'bomb' ? 45 : 85}%)`);
      g.addColorStop(0.6, `hsl(${hue},90%,${o.kind === 'bomb' ? 30 : 58}%)`);
      g.addColorStop(1, `hsl(${hue},90%,${o.kind === 'bomb' ? 15 : 35}%)`);
      ctx.shadowColor = `hsl(${hue},100%,60%)`;
      ctx.shadowBlur = 12;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (o.kind === 'bomb') (ctx.strokeStyle = '#111'), (ctx.lineWidth = 2), ctx.beginPath(), ctx.moveTo(x + r * 0.5, y - r * 0.8), ctx.lineTo(x + r * 0.9, y - r * 1.3), ctx.stroke(), s.t % 4 === 0 && fx.burst(x + r * 0.9, y - r * 1.3, '#ffcf6a', 1, 0.8, 1.5);
      const lx = head ? Math.max(-1, Math.min(1, (head.x - o.x) * 10)) : 0, ly = head ? Math.max(-1, Math.min(1, (head.y - o.y) * 10)) : 0;
      ctx.fillStyle = '#fff';
      for (const dx of [-0.35, 0.35]) (ctx.beginPath(), ctx.arc(x + dx * r, y - r * 0.05, r * 0.28, 0, Math.PI * 2), ctx.fill());
      ctx.fillStyle = '#141020';
      for (const dx of [-0.35, 0.35]) (ctx.beginPath(), ctx.arc(x + dx * r + lx * r * 0.1, y - r * 0.05 + ly * r * 0.1, r * 0.14, 0, Math.PI * 2), ctx.fill());
    }
    const seenT = fx.memo.t ?? -1;
    for (const e of s.events) {
      if (e.t <= seenT) continue;
      if (e.kind === 'pop' && e.poly) {
        fx.blink(`hsl(${HUE[e.c ?? 0]},100%,75%)`, 0.18);
        fx.pop(X(e.x), Y(e.y), e.text!, '#ffffff', e.text!.length > 4 ? 22 : 16);
        fx.kick(3 + Math.min(10, e.text!.length));
      }
      if (e.kind === 'orb') fx.burst(X(e.x), Y(e.y), `hsl(${HUE[e.c ?? 0]},100%,65%)`, 16, 3.5, 3), fx.ring(X(e.x), Y(e.y), `hsl(${HUE[e.c ?? 0]},100%,75%)`, 40, 3);
      if (e.kind === 'mixed') fx.kick(6), fx.blink(th.hot, 0.25), fx.pop(X(e.x), Y(e.y), e.text!, th.hot, 16);
      if (e.kind === 'cut') fx.burst(X(e.x), Y(e.y), th.hot, 14, 3), fx.pop(X(e.x), Y(e.y) - 16, e.text!, th.hot, 14);
      if (e.kind === 'chain') fx.ring(X(e.x), Y(e.y), '#ffcf6a', 160, 8), fx.kick(14), fx.pop(X(e.x), Y(e.y) - 30, e.text!, '#ffcf6a', 22);
      if (e.kind === 'fever') fx.ring(X(e.x), Y(e.y), '#ffffff', 220, 10), fx.blink('#ffffff', 0.3);
      if (e.kind === 'new') fx.pop(w / 2, h * 0.28, e.text!, '#ffd23f', 16);
    }
    fx.memo.t = s.t;
    ctx.restore();
    // 머리말: 점수 · 가득 참 막대 · 피버
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = th.ink;
    ctx.font = `800 ${R(0.07)}px system-ui, sans-serif`;
    ctx.fillText(String(s.score), 10, 8);
    const bw = R(0.36), bx = w - 10 - bw;
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fillRect(bx, 14, bw, 8);
    ctx.fillStyle = full > 0.75 ? th.hot : th.accent;
    ctx.fillRect(bx, 14, bw * Math.min(1, full), 8);
    ctx.textAlign = 'right';
    ctx.font = `700 ${R(0.032)}px system-ui, sans-serif`;
    ctx.fillStyle = th.ink;
    ctx.fillText(`가득 참 ${s.orbs.length}/${MAX}`, w - 10, 26);
    if (s.fever > 0) (ctx.textAlign = 'center'), (ctx.fillStyle = '#ffd23f'), (ctx.font = `800 ${R(0.05)}px system-ui, sans-serif`), ctx.fillText(`피버 ×2  ${Math.ceil(s.fever / 60)}`, w / 2, 10);
    if (s.t < 300 && !s.path.length) (ctx.textAlign = 'center'), (ctx.fillStyle = th.ink), (ctx.font = `700 ${R(0.04)}px system-ui, sans-serif`), ctx.fillText('👆 같은 색 구슬을 동그랗게 감싸 보세요', w / 2, h * 0.5);
  },
};

function segDist(p: Pt, a: Pt, b: Pt) {
  const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l)) : 0;
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
}

const scribble = new WeakMap<object, { x: number; y: number; a: number; on: boolean }>();
/** 봇: 손가락을 아무렇게나 끌고 다닌다 (가끔 우연히 감싼다) */
export const lassoRandom: Bot<LassoState> = {
  name: '낙서',
  act(s, rng) {
    let m = scribble.get(s);
    if (!m) scribble.set(s, (m = { x: 0.5, y: 0.5, a: 0, on: false }));
    if (s.t % 40 === 0) m.on = rng() < 0.7;
    m.a += (rng() - 0.5) * 0.8;
    m.x = Math.max(0.02, Math.min(0.98, m.x + Math.cos(m.a) * 0.012));
    m.y = Math.max(0.02, Math.min(0.98, m.y + Math.sin(m.a) * 0.012));
    if (m.x <= 0.02 || m.x >= 0.98 || m.y <= 0.02 || m.y >= 0.98) m.a += Math.PI / 2;
    return { tap: false, dir: 0, pointer: m.on ? { x: m.x, y: m.y } : null };
  },
};

const plans = new WeakMap<object, { pts: Pt[]; k: number } | null>();
/** 봇: 같은 색만 들어가는 가장 큰 원을 찾아(가시·다른 색을 피해) 사람 손 빠르기로 동그랗게 긋는다 */
export const lassoSmart: Bot<LassoState> = {
  name: '올가미 장인',
  act(s) {
    let plan = plans.get(s);
    if (!plan) {
      let best: { cx: number; cy: number; r: number; v: number } | null = null;
      for (const o of s.orbs) {
        if (o.kind === 'spike') continue;
        for (const rad of [0.07, 0.11, 0.15]) {
          const inR = s.orbs.filter((q) => Math.hypot(q.x - o.x, q.y - o.y) < rad + 0.035);
          if (inR.some((q) => q.kind === 'spike')) continue;
          const cols = new Set(inR.filter((q) => q.kind === 'orb' || q.kind === 'bomb').map((q) => q.c));
          if (cols.size > 1) continue;
          const v = inR.length ** 2 - rad * 10;
          if (!best || v > best.v) best = { cx: o.x, cy: o.y, r: rad + 0.015, v };
        }
      }
      if (!best) return { tap: false, dir: 0, pointer: null };
      const pts: Pt[] = [], steps = Math.ceil((best.r * 2 * Math.PI * 1.15) / 0.06);
      for (let k = 0; k <= steps; k++) {
        const a = (k / steps) * Math.PI * 2 * 1.15;
        pts.push({ x: Math.max(0, Math.min(1, best.cx + Math.cos(a) * best.r)), y: Math.max(0, Math.min(A, best.cy + Math.sin(a) * best.r)) });
      }
      plans.set(s, (plan = { pts, k: 0 }));
    }
    if (plan.k >= plan.pts.length) {
      plans.set(s, null);
      plans.delete(s);
      return { tap: false, dir: 0, pointer: null };
    }
    const p = plan.pts[plan.k++];
    return { tap: false, dir: 0, pointer: { x: p.x, y: p.y / A } };
  },
};
