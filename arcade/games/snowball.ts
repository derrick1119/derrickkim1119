/**
 * 눈덩이 비탈 — 무한 러너 × 덩치 키우기(.io) × 원버튼.
 * 눈덩이가 비탈을 굴러 내려가며 좌우로 비스듬히 움직인다. 누르면 방향이 바뀐다.
 * 눈더미를 먹으면 커지고, 숫자가 내 크기 이하인 장애물은 부수며 더 커진다. 나보다 큰 장애물에 부딪히면 그만큼 작아지고,
 * 크기가 1보다 작아지면 끝. 비틀기: 커질수록 강하지만 몸도 커져서 피하기 어려워진다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';

const VIEW = 1.5, PY = 0.4, SIDE = 0.0085;
interface Thing { x: number; y: number; k: number }
export interface SnowState {
  rng: Rng;
  t: number;
  dist: number;
  x: number;
  dir: 1 | -1;
  size: number;
  things: Thing[];
  nextAt: number;
  smashed: number;
  hit: number;
  dead: boolean;
}

export const radius = (size: number) => 0.033 + 0.014 * Math.sqrt(size);
const thingR = (k: number) => (k === 0 ? 0.028 : 0.029 + 0.01 * Math.sqrt(k));

/** 앞쪽을 미리 깔아 둔다 (k=0은 눈더미). 장애물 숫자는 깔 때의 내 크기 근처 */
function lay(s: SnowState) {
  while (s.nextAt < s.dist + VIEW + 0.6) {
    const n = 1 + (s.rng() < 0.3 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const snow = s.rng() < 0.42;
      const k = snow ? 0 : Math.max(1, Math.round(s.size * (0.4 + s.rng() * 1.0)));
      s.things.push({ x: 0.08 + s.rng() * 0.84, y: s.nextAt + i * 0.05, k });
    }
    s.nextAt += 0.16 + s.rng() * 0.18 - Math.min(0.08, s.dist * 0.0012);
  }
  s.things = s.things.filter((t) => t.y > s.dist - 0.1);
}

export const snowball: GameDef<SnowState> = {
  id: 'snowball',
  name: '눈덩이 비탈',
  genes: ['endless', 'absorb', 'onebutton'],
  twist: '덩치 키우기인데 몸이 커질수록 강해지는 대신 피하기 어려워진다 — 버튼 하나로 지그재그',
  rules: ['누르면 굴러가는 방향이 바뀝니다.', '눈더미와 내 크기 이하의 숫자는 먹고 커져요.', '더 큰 숫자에 부딪히면 그만큼 작아지고, 다 녹으면 끝.'],
  controls: 'tap',
  aspect: 1.5,
  art: {
    concept: '겨울 산',
    mood: '하얀 비탈에 초록 전나무와 회색 바위. 눈덩이가 지나간 자리에 썰매 자국이 남는다.',
    palette: { bg: '#eaf4fb', ink: '#1d3b53', muted: '#9fbfd6', accent: '#2e86de', hot: '#e8505b', soft: '#ffffff' },
  },
  create(seed) {
    const s: SnowState = { rng: mulberry32(seed), t: 0, dist: 0, x: 0.5, dir: 1, size: 4, things: [], nextAt: 0.9, smashed: 0, hit: -99, dead: false };
    lay(s);
    return s;
  },
  step(s, input: Input) {
    if (s.dead) return;
    s.t++;
    if (input.tap) s.dir = s.dir === 1 ? -1 : 1;
    const r = radius(s.size);
    s.x = Math.max(r, Math.min(1 - r, s.x + s.dir * SIDE));
    s.dist += 0.006 + Math.min(0.008, s.t * 0.0000022);
    lay(s);
    const py = s.dist + PY;
    for (const t of s.things) {
      if (t.k < 0 || Math.hypot(t.x - s.x, t.y - py) > r + thingR(t.k)) continue;
      if (t.k === 0) s.size += 1;
      else if (t.k <= s.size) (s.size += t.k * 0.2), s.smashed++;
      else (s.size -= t.k - s.size + 1), (s.hit = s.t);
      t.k = -1;
      if (s.size < 1) return void (s.dead = true);
    }
    s.things = s.things.filter((t) => t.k >= 0);
  },
  over: (s) => s.dead,
  score: (s) => Math.floor(s.dist * 5) + s.smashed * 10,
  draw(ctx, s, w, h, th: Theme) {
    const sc = Math.min(w, h / VIEW), ox = (w - sc) / 2, X = (x: number) => ox + x * sc, Y = (y: number) => (y - s.dist) * sc;
    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, w, h);
    // 비탈 결 (흐르는 사선)
    ctx.strokeStyle = th.soft;
    ctx.lineWidth = 2;
    for (let i = -2; i < 14; i++) {
      const y = ((i * 0.13 - s.dist) % 0.13 + 0.13) % 0.13 + i * 0.13 - 0.13;
      ctx.beginPath();
      ctx.moveTo(X(0), y * sc);
      ctx.lineTo(X(1), y * sc + sc * 0.08);
      ctx.stroke();
    }
    // 썰매 자국
    ctx.strokeStyle = th.muted;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = sc * radius(s.size) * 0.5;
    ctx.beginPath();
    ctx.moveTo(X(s.x), Y(s.dist + PY));
    ctx.lineTo(X(s.x - s.dir * SIDE * 30), Y(s.dist + PY - 0.24));
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of s.things) {
      const x = X(t.x), y = Y(t.y), r = thingR(t.k) * sc;
      if (t.k === 0) {
        ctx.fillStyle = th.soft;
        ctx.strokeStyle = th.muted;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, r, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        continue;
      }
      const tree = t.k % 2 === 1;
      const big = t.k > s.size;
      ctx.fillStyle = tree ? (big ? '#1f5c3a' : '#3f9a63') : big ? '#4a5560' : '#8a96a3';
      ctx.beginPath();
      if (tree) (ctx.moveTo(x, y - r * 1.5), ctx.lineTo(x + r, y + r * 0.8), ctx.lineTo(x - r, y + r * 0.8));
      else ctx.ellipse(x, y, r * 1.1, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = big ? th.hot : '#ffffff';
      ctx.font = `800 ${Math.round(Math.max(11, r * 0.9))}px system-ui, sans-serif`;
      ctx.fillText(String(t.k), x, y + (tree ? r * 0.15 : 0));
    }
    // 눈덩이
    const px = X(s.x), py = Y(s.dist + PY), pr = radius(s.size) * sc;
    ctx.fillStyle = s.t - s.hit < 12 ? th.hot : th.soft;
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = th.ink;
    ctx.font = `800 ${Math.round(Math.max(12, pr * 0.8))}px system-ui, sans-serif`;
    ctx.fillText(String(Math.floor(s.size)), px, py);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `800 ${Math.round(sc * 0.06)}px system-ui, sans-serif`;
    ctx.fillText(String(snowball.score(s)), X(0.03), 6);
  },
};

export const snowRandom: Bot<SnowState> = { name: '막누르기', act: (_s, rng) => ({ tap: rng() < 1 / 45, dir: 0 }) };

/** 봇: 지금 방향을 바꿀 때와 그대로 갈 때를 내다보고 크기가 더 큰 쪽을 고른다 */
export const snowSmart: Bot<SnowState> = {
  name: '내다보기',
  act(s) {
    /** flipAt 틱에 한 번 꺾는 계획(-1이면 안 꺾음)의 결과 */
    const sim = (flipAt: number) => {
      const c: SnowState = { ...s, rng: () => 0.5, things: s.things.map((t) => ({ ...t })), nextAt: Infinity };
      let k = 0;
      for (; k < 90 && !c.dead; k++) snowball.step(c, { tap: k === flipAt, dir: 0 });
      return c.dead ? -1000 + k : c.size + c.smashed * 0.6 - Math.abs(c.x - 0.5);
    };
    const now = sim(0);
    return { tap: now > Math.max(sim(-1), sim(15), sim(35)) + 0.01, dir: 0 };
  },
};
