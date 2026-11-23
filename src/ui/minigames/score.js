// 미니게임 점수 계산. DOM 없이 돌아가는 순수 함수만 둔다(tests/minigames.test.js 가 검사한다).
// 모든 점수는 0..1. 0.5 = 예전 주사위와 같은 결과, 1 = 완벽.
import { seededRng } from '../../core/rng.js';

export { seededRng };

/** 0..1 로 자른다. 숫자가 아니면 0. */
export function clamp01(v) {
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const between = (rng, [a, b]) => a + (b - a) * rng();

// ───────── 등급과 결과 배율 ─────────

/** 도장에 찍히는 등급. 위에서부터 처음 맞는 것. */
export const GRADES = [
  { id: 'perfect', min: 0.9 },
  { id: 'good', min: 0.65 },
  { id: 'close', min: 0.4 },
  { id: 'bad', min: -Infinity },
];

/** @returns {'perfect'|'good'|'close'|'bad'} */
export function gradeFor(score) {
  const s = clamp01(score);
  return GRADES.find((g) => s >= g.min).id;
}

/**
 * 점수가 임무 결과에 주는 배율(game.resolveMission 과 같은 식). 0.5 = 모두 1배.
 * 결과 도장에 '들킬 확률 −35%' 처럼 보여 줄 때 쓴다.
 */
export function effectOf(score) {
  const s = clamp01(score);
  return { risk: 1.35 - 0.7 * s, gain: 0.7 + 0.6 * s, grant: 0.75 + 0.5 * s };
}

/** 배율 → 보통(0.5점)과 견준 증감 퍼센트(정수). */
export function effectPercents(score) {
  const e = effectOf(score);
  const base = effectOf(0.5);
  const pct = (k) => Math.round((e[k] / base[k] - 1) * 100);
  return { risk: pct('risk'), gain: pct('gain'), grant: pct('grant') };
}

/** 안에 머문 시간 비율 → 점수. lo 이하면 0, hi 이상이면 1. */
export function timeScore(frac, lo, hi) {
  return clamp01((clamp01(frac) - lo) / (hi - lo));
}

// ───────── 따라 그리기(draw) ─────────

/** 원 하나를 점 n 개짜리 닫힌 선으로. dir 1 = 시계 방향(화면 좌표). */
export function circlePath(cx, cy, r, n = 72, start = -Math.PI / 2, dir = 1) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = start + dir * (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let k = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  k = clamp(k, 0, 1);
  return Math.hypot(px - (ax + dx * k), py - (ay + dy * k));
}

/** 점에서 여러 선(각각 점 배열)까지 가장 가까운 거리. 선이 없으면 Infinity. */
export function distToStrokes(px, py, strokes) {
  let best = Infinity;
  for (const s of strokes) {
    if (!s.length) continue;
    if (s.length === 1) {
      best = Math.min(best, Math.hypot(px - s[0][0], py - s[0][1]));
      continue;
    }
    for (let i = 1; i < s.length; i++) {
      const d = segDist(px, py, s[i - 1][0], s[i - 1][1], s[i][0], s[i][1]);
      if (d < best) best = d;
    }
  }
  return best;
}

/** 선을 같은 간격(step)의 점들로 다시 찍는다. 빨리 그어 점이 듬성듬성해도 공평하게 센다. */
export function resample(stroke, step) {
  if (!stroke.length) return [];
  const out = [stroke[0].slice(0, 2)];
  let carry = 0;
  for (let i = 1; i < stroke.length; i++) {
    const [ax, ay] = stroke[i - 1];
    const [bx, by] = stroke[i];
    const len = Math.hypot(bx - ax, by - ay);
    let d = step - carry;
    while (d <= len) {
      const k = d / len;
      out.push([ax + (bx - ax) * k, ay + (by - ay) * k]);
      d += step;
    }
    carry = len - (d - step);
  }
  return out;
}

export function pathLength(stroke) {
  let len = 0;
  for (let i = 1; i < stroke.length; i++) len += Math.hypot(stroke[i][0] - stroke[i - 1][0], stroke[i][1] - stroke[i - 1][1]);
  return len;
}

export const TRACE_DEFAULTS = { slack: 0.03, tol: 0.2, reach: 0.12, budget: 1.8 };

/**
 * 따라 그리기 정확도.
 * coverage  = 목표 선 가운데 손가락이 지나간(reach 안) 비율
 * precision = 그린 선이 목표에서 얼마나 가까운지(slack 안은 만점, tol 밖은 0)의 평균
 * score     = coverage^1.2 × (0.25 + 0.75 × precision) × 낭비 벌점
 * 낭비 벌점: 그린 길이가 목표 길이의 budget 배를 넘으면 그만큼 깎는다(마구 문지르기 방지).
 * 거리는 모두 unit(원의 반지름 같은 기준 길이)에 대한 비율이다.
 * @param {number[][][]} strokes 그린 선들
 * @param {number[][][]} target 목표 선들
 * @param {{unit?: number, slack?: number, tol?: number, reach?: number, budget?: number}} [o]
 */
export function traceAccuracy(strokes, target, o = {}) {
  const { unit = 1, slack, tol, reach, budget } = { ...TRACE_DEFAULTS, ...o };
  const step = unit * 0.05;
  const inked = strokes.filter((s) => s.length > 0);
  if (!inked.length) return { score: 0, coverage: 0, precision: 0 };
  let covered = 0;
  let total = 0;
  for (const line of target) {
    for (const [x, y] of resample(line, step)) {
      total++;
      if (distToStrokes(x, y, inked) <= reach * unit) covered++;
    }
  }
  let sum = 0;
  let n = 0;
  for (const s of inked) {
    for (const [x, y] of resample(s, step)) {
      const d = distToStrokes(x, y, target) / unit;
      sum += clamp01(1 - (d - slack) / (tol - slack));
      n++;
    }
  }
  const coverage = total ? covered / total : 0;
  const precision = n ? sum / n : 0;
  const want = target.reduce((s, l) => s + pathLength(l), 0) * budget;
  const ink = inked.reduce((s, l) => s + pathLength(l), 0);
  const waste = ink > want && want > 0 ? want / ink : 1;
  const score = clamp01(Math.pow(coverage, 1.2) * (0.25 + 0.75 * precision) * waste);
  return { score, coverage, precision };
}

// ───────── 얼음 땡(redlight) ─────────
// 지구인(점원·망원경)이 '딴 데 봄 → 예고(돌아보려 함) → 봄' 을 되풀이한다.
// 꾹 누르면 앞으로 가고, 보는 동안 움직이면 들킨다.

/**
 * 감시 일정. 각 주기 { start, tell, look, end, feint } — start~tell 딴 데 봄, tell~look 예고, look~end 봄.
 * feint 면 예고만 하고 다시 돌아선다(look === end).
 * @param {() => number} rng
 * @param {{duration: number, firstAway: number[], away: number[], tell: number, look: number[], feint?: number}} o
 */
export function redlightSchedule(rng, o) {
  const out = [];
  let t = 0;
  let i = 0;
  while (t < o.duration + 2) {
    const away = between(rng, i === 0 ? o.firstAway : o.away);
    const feint = i > 0 && rng() < (o.feint || 0);
    const tell = t + away;
    const look = tell + o.tell;
    const end = feint ? look : look + between(rng, o.look);
    out.push({ start: t, tell, look, end, feint });
    t = end;
    i++;
  }
  return out;
}

/** t 초의 단계. since = 그 단계가 시작된 뒤 흐른 시간. */
export function redlightPhase(schedule, t) {
  for (let i = 0; i < schedule.length; i++) {
    const c = schedule[i];
    if (t < c.end || i === schedule.length - 1) {
      if (t < c.tell) return { phase: 'away', since: t - c.start, cycle: i, left: c.tell - t };
      if (t < c.look) return { phase: 'tell', since: t - c.tell, cycle: i, left: c.look - t, feint: c.feint };
      return { phase: 'look', since: t - c.look, cycle: i, left: c.end - t };
    }
  }
  return { phase: 'away', since: t, cycle: 0, left: Infinity };
}

/** 0~duration 사이에 '봄' 이 아닌(움직여도 되는) 시간의 합. */
export function redlightSafeTime(schedule, duration) {
  let look = 0;
  for (const c of schedule) look += Math.max(0, Math.min(c.end, duration) - Math.min(c.look, duration));
  return duration - look;
}

/** 안전한 시간의 margin 배만 움직여도 끝까지 갈 수 있는 속도(진행/초). */
export function redlightSpeed(schedule, duration, margin = 0.85) {
  return 1 / Math.max(0.5, redlightSafeTime(schedule, duration) * margin);
}

/** 얼음 땡 한 상태. */
export function redlightState() {
  return { t: 0, progress: 0, catches: 0, stun: 0, invuln: 0, moving: false };
}

/**
 * 한 걸음. 이벤트('caught' | 'goal' | null)를 돌려준다.
 * @param {{speed: number, grace: number, pushback: number, stun: number, invuln: number}} tune
 */
export function redlightStep(st, dt, holding, schedule, tune) {
  st.t += dt;
  if (st.progress >= 1) {
    st.moving = false;
    return null;
  }
  st.stun = Math.max(0, st.stun - dt);
  st.invuln = Math.max(0, st.invuln - dt);
  st.moving = holding && st.stun <= 0;
  if (st.moving) st.progress = Math.min(1, st.progress + tune.speed * dt);
  const ph = redlightPhase(schedule, st.t);
  if (st.moving && ph.phase === 'look' && ph.since > tune.grace && st.invuln <= 0) {
    st.catches++;
    st.progress = Math.max(0, st.progress - tune.pushback);
    st.stun = tune.stun;
    st.invuln = tune.invuln;
    st.moving = false;
    return 'caught';
  }
  if (st.progress >= 1) return 'goal';
  return null;
}

/** 얼마나 갔는지 × 들킨 횟수만큼 깎인다(한 번에 22%). */
export function redlightScore({ progress, catches }) {
  return clamp01(clamp01(progress) * Math.max(0, 1 - 0.22 * catches));
}

// ───────── 그림자 숨기(shadow) ─────────

/** 원까지의 부호 있는 거리(안쪽이 음수). */
export function sdCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r;
}

/** 다각형(점 배열, 볼록·오목 모두)까지의 부호 있는 거리(안쪽이 음수). */
export function sdPolygon(px, py, pts) {
  let d = Infinity;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, ay] = pts[j];
    const [bx, by] = pts[i];
    d = Math.min(d, segDist(px, py, ax, ay, bx, by));
    if (ay > py !== by > py && px < ((bx - ax) * (py - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside ? -d : d;
}

/** 안전 구역 안 정도: 안이면 1, 밖으로 soft 만큼 벗어나면 0. */
export function coverOf(sd, soft) {
  return clamp01(1 - Math.max(0, sd) / soft);
}

/**
 * 구역 중심이 움직이는 부드러운 길(정규 좌표 0..1). 두 사인파를 겹쳐 방향이 자주 바뀐다.
 * @returns {(t: number) => {x: number, y: number}}
 */
export function makeZonePath(rng, { cx = 0.5, cy = 0.5, ax = 0.26, ay = 0.18, speed = 0.4 }) {
  const p = Array.from({ length: 4 }, () => rng() * Math.PI * 2);
  const w1 = speed * (0.9 + rng() * 0.3);
  const w2 = speed * (1.7 + rng() * 0.5);
  return (t) => ({
    x: cx + ax * (0.65 * Math.sin(t * w1 * 2 + p[0]) + 0.35 * Math.sin(t * w2 * 2 + p[1])),
    y: cy + ay * (0.6 * Math.sin(t * w1 * 1.6 + p[2]) + 0.4 * Math.sin(t * w2 * 1.3 + p[3])),
  });
}

/** 그림자 안에 머문 비율 → 점수. 95% 이상이면 만점, 35% 이하면 0. */
export function shadowScore(frac) {
  return timeScore(frac, 0.35, 0.95);
}

// ───────── 꾹 버티기(hold) ─────────

/** 계기 상태: v 밝기 0..1, vel 속도. */
export function holdState(v = 0.3) {
  return { v, vel: 0 };
}

/**
 * 누르면 올라가고 떼면 내려간다. 흔들림(wobble)이 계속 끼어든다.
 * @param {{lift: number, gravity: number, damp: number, wobble: number, phase?: number}} tune
 * @param {number} t 지금까지 흐른 시간(흔들림 모양)
 */
export function holdStep(st, dt, pressing, tune, t, kick = 0) {
  const ph = tune.phase || 0;
  const wob = tune.wobble * (0.6 * Math.sin(t * 2.3 + ph) + 0.4 * Math.sin(t * 5.3 + ph * 1.7));
  const acc = (pressing ? tune.lift : -tune.gravity) + wob;
  st.vel += acc * dt + kick;
  st.vel *= Math.exp(-tune.damp * dt);
  st.v += st.vel * dt;
  if (st.v < 0) {
    st.v = 0;
    st.vel = Math.max(0, -st.vel * 0.25);
  } else if (st.v > 1) {
    st.v = 1;
    st.vel = Math.min(0, -st.vel * 0.25);
  }
  return st;
}

/** 초록 칸: 가운데가 천천히 움직인다. 반폭 half. */
export function holdBand(t, { center = 0.55, swing = 0.16, half = 0.12, rate = 0.5, phase = 0 }) {
  const c = center + swing * (0.7 * Math.sin(t * rate * 2 + phase) + 0.3 * Math.sin(t * rate * 4.7 + phase * 2.1));
  return { center: clamp(c, half + 0.04, 1 - half - 0.04), half };
}

/** 칸 안이면 1, 칸에서 soft 만큼 벗어나면 0. */
export function bandCover(v, band, soft = 0.07) {
  return clamp01(1 - Math.max(0, Math.abs(v - band.center) - band.half) / soft);
}

/** 칸 안에 머문 비율 → 점수. 92% 이상이면 만점, 30% 이하면 0. */
export function holdScore(frac) {
  return timeScore(frac, 0.3, 0.92);
}

// ───────── 이리저리 피하기(lanes) ─────────

/**
 * 장애물 물결. 각 물결 { t, lanes, kind } — t 초에 UFO 줄에 닿고, lanes 의 칸을 막는다.
 * 세 칸을 한꺼번에 막는 일은 없다.
 * @param {{duration: number, start?: number, interval: number[], double: number, sweep?: number}} o
 */
export function laneWaves(rng, o) {
  const out = [];
  let t = o.start ?? 1.1;
  let prevFree = 1;
  while (t < o.duration - 0.25) {
    const sweep = rng() < (o.sweep || 0);
    const two = sweep || rng() < o.double;
    let lanes;
    if (two) {
      // 빈 칸을 하나 고른다. 바로 전 빈 칸에서 너무 멀면(0↔2) 가끔은 봐준다.
      let free = Math.floor(rng() * 3);
      if (Math.abs(free - prevFree) === 2 && rng() < 0.5) free = 1;
      lanes = [0, 1, 2].filter((l) => l !== free);
      prevFree = free;
    } else {
      const l = Math.floor(rng() * 3);
      lanes = [l];
      prevFree = l === 1 ? (rng() < 0.5 ? 0 : 2) : 1;
    }
    out.push({ t, lanes, kind: sweep ? 'sweep' : 'car' });
    t += between(rng, o.interval) * (two ? 1.12 : 1);
  }
  return out;
}

/** 부딪힌 횟수 → 점수. 물결 수의 40%(최소 3번)를 부딪히면 0. */
export function lanesScore({ hits, total }) {
  if (!total) return 1;
  return clamp01(1 - hits / Math.max(3, total * 0.4));
}

// ───────── 박자 맞추기(rhythm) ─────────

/** 판정 창(초, ±). */
export const WINDOWS = { perfect: 0.06, good: 0.12, ok: 0.2 };
export const CREDIT = { perfect: 1, good: 0.65, ok: 0.3, miss: 0 };

/** 박자와 누른 시각의 차(초) → 판정. 창 밖이면 null. */
export function judgeOffset(dt) {
  const a = Math.abs(dt);
  if (!Number.isFinite(a)) return null;
  if (a <= WINDOWS.perfect) return 'perfect';
  if (a <= WINDOWS.good) return 'good';
  if (a <= WINDOWS.ok) return 'ok';
  return null;
}

/**
 * 박자표: 음표가 울리는 시각들(초, 오름차순).
 * @param {{bpm: number, duration: number, lead?: number, rest?: number, offbeat?: number}} o
 */
export function rhythmChart(rng, o) {
  const beat = 60 / o.bpm;
  const lead = o.lead ?? 1.2;
  const out = [];
  let i = 0;
  for (let t = lead; t < o.duration - 0.35; t += beat, i++) {
    // 첫 박 넷은 꼭 친다(박자를 몸에 익히게)
    if (i >= 4 && rng() < (o.rest || 0) && out.length && t - out[out.length - 1] < beat * 1.5) continue;
    out.push(t);
    if (i >= 4 && rng() < (o.offbeat || 0) && t + beat < o.duration - 0.35) out.push(t + beat / 2);
  }
  return out;
}

/** 박자 놀이 상태. */
export function rhythmState(notes) {
  return { notes, judged: notes.map(() => null), credit: 0, strays: 0, combo: 0, best: 0 };
}

/**
 * 누름 한 번. 아직 판정 안 된 가장 가까운 음표와 견준다.
 * @returns {{index: number, judge: string, offset: number} | {index: -1, judge: 'stray'}}
 */
export function rhythmTap(st, t) {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < st.notes.length; i++) {
    if (st.judged[i]) continue;
    const d = Math.abs(t - st.notes[i]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  const judge = best >= 0 ? judgeOffset(t - st.notes[best]) : null;
  if (!judge) {
    st.strays++;
    return { index: -1, judge: 'stray' };
  }
  st.judged[best] = judge;
  st.credit += CREDIT[judge];
  st.combo++;
  st.best = Math.max(st.best, st.combo);
  return { index: best, judge, offset: t - st.notes[best] };
}

/** 창을 지나친 음표를 놓침으로 처리한다. 새로 놓친 음표 번호들을 돌려준다. */
export function rhythmExpire(st, t) {
  const missed = [];
  for (let i = 0; i < st.notes.length; i++) {
    if (!st.judged[i] && t - st.notes[i] > WINDOWS.ok) {
      st.judged[i] = 'miss';
      st.combo = 0;
      missed.push(i);
    }
  }
  return missed;
}

/** 박자 점수: 판정 점수의 평균(헛손질은 0.25 씩 깎는다). 평균 95% 면 만점. */
export function rhythmScore({ credit, total, strays = 0 }) {
  if (!total) return 0.5;
  return clamp01((credit - 0.25 * strays) / (total * 0.95));
}

// ───────── 난이도 ─────────

/** level 0..1 에 따라 a → b 로. */
export const tuneLerp = (a, b, level) => lerp(a, b, clamp01(level));
