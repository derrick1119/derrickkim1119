/**
 * 궤도 꼬리 — 스네이크 × 원버튼 × 원 궤도.
 * 비틀기 ①: 뱀이 두 원 궤도만 돈다 — 한 궤도에 오래 있으면 한 바퀴 돌아 자기 꼬리를 문다.
 * 비틀기 ②: 스네이크를 뒤집었다 — 꼬리는 저절로 자라고, 점을 먹으면 줄어든다. 가만히 버틸 수 없다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';

const R = [0.48, 0.82];
const HIT = 0.065, EAT = 0.09, SAFE_TAIL = 24, HOP = 8;

interface P { x: number; y: number }
export interface OrbitState {
  rng: Rng;
  t: number;
  angle: number;
  ring: 0 | 1;
  /** 궤도 갈아타는 중이면 남은 틱 */
  hop: number;
  omega: number;
  tailLen: number;
  trail: P[];
  food: { angle: number; ring: 0 | 1 };
  score: number;
  dead: boolean;
}

const radius = (s: OrbitState) => (s.hop > 0 ? R[s.ring] + (R[1 - s.ring] - R[s.ring]) * (s.hop / HOP) : R[s.ring]);
export const headPos = (s: OrbitState): P => ({ x: Math.cos(s.angle) * radius(s), y: Math.sin(s.angle) * radius(s) });
const foodPos = (s: OrbitState): P => ({ x: Math.cos(s.food.angle) * R[s.food.ring], y: Math.sin(s.food.angle) * R[s.food.ring] });
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);

function placeFood(s: OrbitState) {
  // 머리 반대편 근처, 무작위 궤도. 꼬리 위에는 놓지 않는다
  for (let k = 0; k < 30; k++) {
    const f = { angle: s.angle + Math.PI * (0.6 + s.rng() * 0.8), ring: (s.rng() < 0.5 ? 0 : 1) as 0 | 1 };
    const p = { x: Math.cos(f.angle) * R[f.ring], y: Math.sin(f.angle) * R[f.ring] };
    if (s.trail.every((q) => dist(p, q) > EAT)) return void (s.food = f);
  }
  s.food = { angle: s.angle + Math.PI, ring: (1 - s.ring) as 0 | 1 };
}

export const orbit: GameDef<OrbitState> = {
  id: 'orbit',
  name: '궤도 꼬리',
  genes: ['snake', 'onebutton', 'orbit'],
  twist: '두 원 궤도만 도는 뱀 + 거꾸로 스네이크(꼬리는 저절로 자라고, 먹으면 줄어든다)',
  rules: ['누르면 안쪽 ↔ 바깥 궤도를 갈아탑니다.', '꼬리는 저절로 자라요. 점을 먹으면 줄어듭니다.', '꼬리에 닿으면 끝.'],
  controls: 'tap',
  art: {
    concept: '네온 뱀',
    mood: '한밤 오락실 간판처럼 번지는 형광 선. 꼬리가 빛의 궤적으로 남는다.',
    palette: { bg: '#0b0f24', ink: '#3ef0ff', muted: '#2a3566', accent: '#c6ff3a', hot: '#ff3fa4', soft: '#161d40' },
  },
  create(seed) {
    const s: OrbitState = {
      rng: mulberry32(seed), t: 0, angle: 0, ring: 1, hop: 0, omega: (2 * Math.PI) / 240, tailLen: 90, trail: [],
      food: { angle: Math.PI, ring: 0 }, score: 0, dead: false,
    };
    placeFood(s);
    return s;
  },
  step(s, input: Input) {
    if (s.dead) return;
    s.t++;
    if (input.tap && s.hop === 0) (s.ring = (1 - s.ring) as 0 | 1), (s.hop = HOP);
    if (s.hop > 0) s.hop--;
    s.angle += s.omega;
    if (s.t % 6 === 0) s.tailLen++;
    const h = headPos(s);
    s.trail.push(h);
    if (s.trail.length > s.tailLen) s.trail.splice(0, s.trail.length - s.tailLen);
    if (s.hop === 0) {
      for (let i = 0; i < s.trail.length - SAFE_TAIL; i++) if (dist(h, s.trail[i]) < HIT) return void (s.dead = true);
    }
    if (dist(h, foodPos(s)) < EAT) {
      s.score++;
      s.tailLen = Math.max(50, s.tailLen - 70);
      s.omega *= 1.012;
      placeFood(s);
    }
  },
  over: (s) => s.dead,
  score: (s) => s.score,
  draw(ctx, s, w, h, th: Theme) {
    const sc = Math.min(w, h) / 2 / 1.0, cx = w / 2, cy = h / 2;
    const X = (p: P) => cx + p.x * sc * 0.92, Y = (p: P) => cy + p.y * sc * 0.92;
    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = th.soft;
    ctx.lineWidth = sc * 0.1;
    for (const r of R) (ctx.beginPath(), ctx.arc(cx, cy, r * sc * 0.92, 0, Math.PI * 2), ctx.stroke());
    // 꼬리
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = th.ink;
    ctx.lineWidth = sc * 0.07;
    ctx.shadowColor = th.ink;
    ctx.shadowBlur = sc * 0.12;
    ctx.beginPath();
    s.trail.forEach((p, i) => (i ? ctx.lineTo(X(p), Y(p)) : ctx.moveTo(X(p), Y(p))));
    ctx.stroke();
    ctx.shadowColor = th.hot;
    // 점
    const f = foodPos(s);
    ctx.fillStyle = th.hot;
    ctx.beginPath();
    ctx.arc(X(f), Y(f), sc * 0.05, 0, Math.PI * 2);
    ctx.fill();
    // 머리
    const hd = headPos(s);
    ctx.fillStyle = s.dead ? th.hot : th.accent;
    ctx.beginPath();
    ctx.arc(X(hd), Y(hd), sc * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = th.ink;
    ctx.font = `700 ${Math.round(sc * 0.28)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(s.score), cx, cy);
  },
};

/** 봇: 무작위로 누른다 (조작을 이해 못 한 사람) */
export const orbitRandom: Bot<OrbitState> = { name: '막누르기', act: (_s, rng) => ({ tap: rng() < 1 / 70, dir: 0 }) };

/** 봇: 앞을 내다보고, 가만히 있으면 죽거나 점이 다른 궤도에 있으면 갈아탄다 (잘하는 사람) */
export const orbitSmart: Bot<OrbitState> = {
  name: '내다보기',
  act(s) {
    if (s.hop > 0) return { tap: false, dir: 0 };
    const survive = (tapNow: boolean) => {
      const c: OrbitState = { ...s, rng: () => 0.5, trail: s.trail.slice(), food: { ...s.food } };
      for (let k = 0; k < 110; k++) {
        orbit.step(c, { tap: tapNow && k === 0, dir: 0 });
        if (c.dead) return k;
      }
      return 999;
    };
    const stay = survive(false);
    const wantFood = s.food.ring !== s.ring && Math.abs(((s.food.angle - s.angle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)) < 0.6;
    if (stay < 999 || wantFood) {
      const hop = survive(true);
      if (hop > stay || (wantFood && hop >= 999)) return { tap: true, dir: 0 };
    }
    return { tap: false, dir: 0 };
  },
};
