/**
 * 손맛 층 (M1): 시뮬 사건 → 파티클 · 화면 흔들림 · 멈칫(hitstop) · 번쩍임 · 떠오르는 글자 · 광석 조각.
 * 시뮬 상태를 바꾸지 않는다(결정성 유지). 시간 단위는 프레임 틱(1/60초).
 */
import { CORE, type GameEvent } from './sim.ts';

export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; drag: number; kind: 'spark' | 'chunk' | 'ring' }
export interface Mote { x: number; y: number; vx: number; vy: number; age: number }
export interface Floater { x: number; y: number; text: string; color: string; age: number; size: number }

export interface Juice {
  parts: Particle[];
  motes: Mote[];
  floats: Floater[];
  /** 흔들림 세기(단위 좌표), 매 틱 감쇠 */
  trauma: number;
  /** 남은 멈칫 틱 */
  stop: number;
  /** 화면 가장자리 붉은 번쩍 0~1 */
  danger: number;
  /** 흰 번쩍 0~1 */
  flash: number;
  /** 행성 출렁임(광석 흡수) 0~1 */
  pulse: number;
  /** 흔들림·번쩍 끄기 (prefers-reduced-motion) */
  calm: boolean;
  seed: number;
  /** 지금까지 흐른 손맛 틱, 마지막 멈칫 시각 — 멈칫은 300ms에 한 번만 (리뷰) */
  now: number;
  stopAt: number;
  blocks: number;
}

const MAX_PARTS = 300;

export const COLORS = { rock: '#ff8a3d', big: '#ff4d4d', mint: '#7cf2c4', ore: '#ffe14d', white: '#e8f7ff' };

export function createJuice(calm = false): Juice {
  return { parts: [], motes: [], floats: [], trauma: 0, stop: 0, danger: 0, flash: 0, pulse: 0, calm, seed: 7, now: 0, stopAt: -99, blocks: 0 };
}

/** 손맛 전용 난수 (시뮬 rng를 건드리지 않는다) */
function rnd(j: Juice) {
  j.seed = (j.seed * 1664525 + 1013904223) >>> 0;
  return j.seed / 4294967296;
}

function burst(j: Juice, x: number, y: number, n: number, speed: number, color: string, kind: Particle['kind'], size: number, life: number) {
  n = Math.min(n, MAX_PARTS - j.parts.length);
  for (let k = 0; k < n; k++) {
    const a = rnd(j) * Math.PI * 2, v = speed * (0.4 + rnd(j) * 0.8), l = Math.round(life * (0.6 + rnd(j) * 0.6));
    j.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: l, max: l, size: size * (0.6 + rnd(j) * 0.8), color, drag: kind === 'chunk' ? 0.93 : 0.88, kind });
  }
}

function ring(j: Juice, p: Particle) {
  if (j.parts.length < MAX_PARTS) j.parts.push(p);
}

const shake = (j: Juice, amt: number) => void (j.trauma = Math.min(0.045, j.trauma + amt));
function freeze(j: Juice, ticks: number) {
  if (j.now - j.stopAt < 18) return;
  j.stopAt = j.now;
  j.stop = Math.max(j.stop, ticks);
}

/** 사건 하나에 세 가지 답(보이는 것·느끼는 것·들리는 것 중 앞의 둘)을 붙인다. 소리는 audio.ts */
export function react(j: Juice, e: GameEvent) {
  switch (e.type) {
    case 'hit':
      // 리뷰 R2: 맞았는데 안 죽은 순간이 약했다 → 불꽃 더, 작은 고리
      burst(j, e.x, e.y, 7, 0.008, COLORS.white, 'spark', 0.01, 12);
      ring(j, { x: e.x, y: e.y, vx: 0, vy: 0, life: 8, max: 8, size: 0.06, color: COLORS.white, drag: 1, kind: 'ring' });
      break;
    case 'kill': {
      const c = e.big ? COLORS.big : COLORS.rock;
      burst(j, e.x, e.y, e.big ? 18 : 10, e.big ? 0.012 : 0.009, c, 'chunk', e.big ? 0.016 : 0.012, 30);
      burst(j, e.x, e.y, 6, 0.014, COLORS.white, 'spark', 0.007, 12);
      ring(j, { x: e.x, y: e.y, vx: 0, vy: 0, life: 14, max: 14, size: e.big ? 0.12 : 0.08, color: e.by === 'body' ? COLORS.mint : c, drag: 1, kind: 'ring' });
      for (let k = 0; k < e.ore * 2; k++) {
        const a = rnd(j) * Math.PI * 2;
        j.motes.push({ x: e.x, y: e.y, vx: Math.cos(a) * 0.006, vy: Math.sin(a) * 0.006, age: 0 });
      }
      if (e.by === 'body') {
        // 몸으로 막기는 가장 잦은 사건 — 흔들림은 작게, 멈칫은 간격 제한
        freeze(j, 3);
        shake(j, 0.008);
        // 리뷰 R2: 매번 뜨면 겹침 과다 → 처음 두 번과 연속 3 이상일 때만
        if (++j.blocks <= 2 || e.combo >= 3) j.floats.push({ x: e.x, y: e.y - 0.05, text: '막았다!', color: COLORS.mint, age: 0, size: 0.06 });
      } else shake(j, e.big ? 0.016 : 0.006);
      if (e.big) freeze(j, 4);
      if (e.combo >= 3) j.floats.push({ x: e.x, y: e.y + 0.04, text: `${e.combo}연속`, color: COLORS.ore, age: 0, size: 0.045 + Math.min(0.03, e.combo * 0.003) });
      break;
    }
    case 'impact':
      burst(j, e.x, e.y, 16, 0.014, COLORS.big, 'chunk', 0.014, 34);
      burst(j, 0, 0, 22, 0.012, COLORS.mint, 'spark', 0.008, 26);
      ring(j, { x: 0, y: 0, vx: 0, vy: 0, life: 22, max: 22, size: CORE * 2.4, color: COLORS.big, drag: 1, kind: 'ring' });
      shake(j, 0.045);
      j.stopAt = -99;
      freeze(j, 6);
      j.danger = 1;
      break;
    case 'build':
      burst(j, e.x, e.y, 14, 0.008, COLORS.ore, 'spark', 0.009, 26);
      ring(j, { x: e.x, y: e.y, vx: 0, vy: 0, life: 20, max: 20, size: 0.1, color: COLORS.ore, drag: 1, kind: 'ring' });
      j.flash = Math.max(j.flash, 0.35);
      break;
    case 'clear':
      j.floats.push({ x: 0, y: -0.62, text: `${e.wave}웨이브 방어!`, color: COLORS.mint, age: -20, size: 0.08 });
      break;
    case 'dead':
      burst(j, 0, 0, 40, 0.02, COLORS.big, 'chunk', 0.018, 50);
      j.trauma = 0.07; // 죽는 순간은 피격보다 약하지 않게 (상한 예외)
      j.flash = 1;
      break;
    default:
  }
}

/** 한 틱 진행 (멈칫 중에도 파티클은 흐른다 — 멈칫은 시뮬만 멈춘다) */
export function tick(j: Juice) {
  j.now++;
  for (const p of j.parts) {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= p.drag;
    p.vy *= p.drag;
    p.life--;
  }
  j.parts = j.parts.filter((p) => p.life > 0);
  // 광석 조각: 잠깐 퍼졌다가 행성으로 빨려든다
  for (const m of j.motes) {
    m.age++;
    const d = Math.hypot(m.x, m.y) || 1, pull = Math.min(0.004 + m.age * 0.0009, 0.03);
    m.vx = m.vx * 0.86 - (m.x / d) * pull;
    m.vy = m.vy * 0.86 - (m.y / d) * pull;
    m.x += m.vx;
    m.y += m.vy;
  }
  const before = j.motes.length;
  j.motes = j.motes.filter((m) => Math.hypot(m.x, m.y) > CORE * 0.9 && m.age < 120);
  if (j.motes.length < before) j.pulse = Math.min(1, j.pulse + 0.25 * (before - j.motes.length));
  for (const f of j.floats) (f.age++), f.age > 0 && (f.y -= 0.0012);
  j.floats = j.floats.filter((f) => f.age < 50);
  j.trauma *= 0.86;
  if (j.trauma < 0.0005) j.trauma = 0;
  j.danger *= 0.93;
  j.flash *= 0.8;
  j.pulse *= 0.88;
}

/** 지금 흔들림 오프셋 (단위 좌표). 감속 사인 두 개 — 무작위보다 덜 어지럽다 */
export function shakeOffset(j: Juice, t: number) {
  if (j.calm || !j.trauma) return { x: 0, y: 0 };
  return { x: Math.sin(t * 2.9) * j.trauma, y: Math.cos(t * 3.7) * j.trauma };
}
