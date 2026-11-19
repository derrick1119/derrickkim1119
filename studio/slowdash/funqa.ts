/**
 * FUN QA 측정기 — 봇으로 판별 도전 + 처음부터 끝까지 한 판을 돌려 지표를 뽑는다 → studio/slowdash/reports/funqa.json
 *   npx tsx studio/slowdash/funqa.ts [시드 수=24]
 * M0 봇: 장인(줄 세워 베기) · 버릇①(늘 가장 가까운 적으로) · 버릇②(늘 가장 많이 꿰는 줄로 바로) · 무작위(아무 데나 번쩍)
 * M1 S001 봇(🧪 FUN F5·F6 · 📋 M1 측정 먼저):
 *   · 사람 반응 봇 3단계(처음 0.7초 ±0.05 · 캐주얼 0.5초 ±0.03 · 숙련 0.35초 ±0.015) — 장인의 판단을 쓰되 사람처럼 늦고 빗나간다.
 *     '꾹' 판(slow): 0.15초 만에 꾹 누르고(세상이 느려짐) 반응 시간만큼 누른 채 겨눈 뒤 뗀다 → 반응하는 동안 세상은 0.12배로만 흐른다.
 *     '탭' 판(tap, F5 대조군): 반응 시간만큼 실시간으로 늦게, 그때는 이미 지난 자리를 1틱 톡 한다.
 *   · 처음 하는 사람(보이는 적 70% · 아무 데나 30%, 반응 0.7초, 꾹, 같은 판 3번까지) · 연타(0.4초마다 살아 있는 적 아무나 1틱)
 *   · 버릇③ 끝까지 참기(모두 한 줄일 때만, 10초 넘게 못 하면 가장 많이 꿰는 줄로) · 버릇④ 늘 최대 거리(가장 가까운 적 쪽으로 끝까지)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runBot, type Bot, type Input } from './core.ts';
import { mulberry32, type Rng } from './rng.ts';
import { STAGES, TRIAL, useOwl, measureKit as K, slowdash as g, slowdashHabit, slowdashHabit2, slowdashRandom, slowdashSmart, startStage, type DashState } from './game.ts';

const NO: Input = { tap: false, dir: 0, pointer: null };
const press = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y / K.A)) } });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Foe = { id: number; x: number; y: number; st: number; k: string };
const live = (s: DashState) => (s.foes as unknown as Foe[]).filter((f) => f.st !== K.ENTER);
const ready = (s: DashState) => s.phase === 'play' && !s.down && !s.lock;
/** 장인이 지금 고를 자리(누르고 있는 중이면 안 누른 셈 치고 묻는다) */
function smartAim(s: DashState, rng: Rng) {
  const q = s.down ? ({ ...s, down: false } as DashState) : s;
  return slowdashSmart.act(q, rng).pointer ?? null;
}

type Pick = (s: DashState, rng: Rng) => { x: number; y: number } | null;
type Pt = { x: number; y: number };
/** ✏️ S006 한붓 계획(📋): 적 a를 지나 꺾어 적 b 너머까지 — 한 줄보다 많이 베고 내릴 자리가 안전한(40틱 넘게) 길 중 가장 많이 베는 것 */
export function strokePlan(s: DashState): { pts: Pt[]; n: number } | null {
  const F = live(s).slice(0, 10);
  let best: { pts: Pt[]; n: number } | null = null;
  for (const a of F)
    for (const b of F) {
      if (a === b) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      const pts = [{ x: a.x, y: a.y }, { x: b.x + (dx / d) * 0.1, y: b.y + (dy / d) * 0.1 }];
      if (Math.hypot(pts[1].x - a.x, pts[1].y - a.y) < K.STROKE_STEP) continue;
      const P = K.path(s, pts), n = P.hits.length;
      if (K.thorn(s, P)) continue; // S009 가시덤불에 걸리는 길은 안 긋는다
      if (LEAF_SOLO && P.hits.some((h) => isLeaf(s, h.id))) continue; // M2 S1 낙차 대조군: 잎은 따로만
      if (!best || n > best.n) {
        if (K.danger(s, P.ex, P.ey, new Set(P.hits.map((h) => h.id))) < 40) continue;
        best = { pts, n };
      }
    }
  return best;
}
const straightN = (s: DashState, p: Pt) => K.path(s, [p]).hits.length;
const isLeaf = (s: DashState, id: number) => (s.foes as unknown as Foe[]).some((f) => f.id === id && f.k === 'leaf');
/** M2 S1 낙차 대조군 스위치: 켜면 한붓 봇이 잎 너구리를 다른 적과 한 획에 엮지 않는다 */
let LEAF_SOLO = false;
/** ✏️ M2 S1 🍃 잎 너구리 길: 잎 옆(.13/.18)에 꺾는 점 → 잎 너머 .08 — 꺾인 토막으로 들어가야 베인다(strokePlan은 적 둘이 있어야 짠다) */
export function leafPlan(s: DashState): { pts: Pt[]; n: number } | null {
  let best: { pts: Pt[]; n: number } | null = null;
  for (const L of live(s).filter((f) => f.k === 'leaf')) {
    const dx = L.x - s.nx, dy = L.y - s.ny, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    for (const sg of [1, -1])
      for (const off of [0.13, 0.18]) {
        const p1 = { x: L.x + nx * sg * off, y: L.y + ny * sg * off };
        if (p1.x < K.X0 || p1.x > K.X1 || p1.y < K.Y0 || p1.y > K.Y1) continue;
        const ex = L.x - p1.x, ey = L.y - p1.y, e = Math.hypot(ex, ey) || 1, end = { x: L.x + (ex / e) * 0.08, y: L.y + (ey / e) * 0.08 };
        const P = K.path(s, [p1, end]);
        if (!P.hits.some((h) => h.id === L.id) || K.thorn(s, P) || (LEAF_SOLO && P.hits.length > 1)) continue;
        if (K.danger(s, P.ex, P.ey, new Set(P.hits.map((h) => h.id))) < 40) continue;
        if (!best || P.hits.length > best.n) best = { pts: [p1, end], n: P.hits.length };
      }
  }
  return best;
}
/** 한붓 계획 = 적 둘 꺾기(strokePlan)와 잎 들어가기(leafPlan) 중 더 많이 베는 것 — 잎이 없으면 strokePlan 그대로 */
function bestPlan(s: DashState) {
  const a = strokePlan(s), b = leafPlan(s);
  return !a ? b : !b ? a : b.n > a.n ? b : a;
}
/** ✏️ S009 가시덤불 돌아가기: 곧은 줄이 덤불에 걸리면, 덤불 양옆으로 꺾는 길 중 걸리지 않고 곧은 줄만큼 베는 것(없으면 null) */
export function detour(s: DashState, p: Pt): Pt[] | null {
  const P0 = K.path(s, [p]);
  if (!K.thorn(s, P0)) return null;
  let best: { pts: Pt[]; n: number } | null = null;
  for (const m of s.thorns)
    for (const sg of [1, -1])
      for (const e of [0.1, 0.16]) {
        const dx = p.x - s.nx, dy = p.y - s.ny, d = Math.hypot(dx, dy) || 1, nx = (-dy / d) * sg, ny = (dx / d) * sg;
        const w = { x: m.x + nx * (m.r + e), y: m.y + ny * (m.r + e) }, pts = [w, p];
        const P = K.path(s, pts);
        if (K.thorn(s, P) || P.hits.length < P0.hits.length) continue;
        if (K.danger(s, P.ex, P.ey, new Set(P.hits.map((h) => h.id))) < 40) continue;
        if (!best || P.hits.length > best.n) best = { pts, n: P.hits.length };
      }
  return best && best.pts;
}
/** 사람 반응 봇: pick이 고른 자리(게임 좌표 x, y)를 react초 늦게·err만큼 빗나가게. slow면 꾹 누른 채 반응한다 */
export function human(name: string, react: number, err: number, slow: boolean, pick?: Pick, stroke: boolean | 'naive' = false, fixP = 1, follow: { guide: number; demo: number; owl?: number } = { guide: 0.5, demo: 0.5 }): Bot<DashState> {
  const mem = new WeakMap<object, { st: 'idle' | 'wait' | 'hold'; until: number; x: number; y: number; ox: number; oy: number; bend: Pt | null; half: number; seq: Pt[]; fix: boolean; fg?: boolean; fd?: boolean; fo?: boolean }>();
  const choose: Pick = pick ?? ((s, rng) => { const p = smartAim(s, rng); return p && { x: p.x, y: p.y * K.A }; });
  const RT = Math.round(react * 60), REFLEX = 9, COOL = 15;
  return {
    name,
    act(s, rng) {
      let m = mem.get(s);
      if (!m) mem.set(s, (m = { st: 'idle', until: 0, x: 0, y: 0, ox: 0, oy: 0, bend: null, half: 0, seq: [], fix: false }));
      if (s.phase !== 'play') return (m.st = 'idle'), NO;
      // ✏️ 한붓 획(오너 피드백) 뒤: 빗나감은 겨눌 때 한 번만 정한다 — 틱마다 흔들면 누르는 동안 손이 떨려 엉뚱한 획이 그려졌다
      const aimErr = () => ((m!.ox = (rng() * 2 - 1) * err), (m!.oy = (rng() * 2 - 1) * err));
      const noisy = () => ({ x: m!.x + m!.ox, y: m!.y + m!.oy });
      if (m.st === 'hold') {
        if (!s.down && s.t > m.until - RT + 2) return (m.st = 'idle'), (m.until = s.t + COOL), NO; // 게이지가 바닥나 저절로 벴다
        if (m.seq.length) { const q = m.seq.shift()!; return press(q.x, q.y); } // S010 다시 그리는 중
        if (s.t >= m.until && stroke && !m.fix && s.down && s.aim) {
          // ✏️ S010 빨간 덤불(미리 보기)을 보면: 손가락을 닌자로 되돌려 지우고, 덤불 옆으로 꺾어 다시 그린다(처음 하는 사람은 아직 모름 — 해 보니 클리어 8판 .75→.50)
          m.fix = true;
          const end = { x: s.aim.x, y: s.aim.y };
          if (K.thorn(s, K.path(s, [...s.stroke, end])) && stroke === true && (fixP >= 1 || rng() < fixP)) { // S011 fixP: 빨강을 보고 되돌리는 비율(🧪 낙관 위험)
            let dt = detour(s, end);
            if (!dt) { // 돌아갈 길이 없으면 끝점을 덤불 반대쪽으로 살짝 옮겨 곧게 다시
              const dx = end.x - s.nx, dy = end.y - s.ny, d = Math.hypot(dx, dy) || 1, n0 = K.path(s, [end]).hits.length;
              for (const e of [0.05, -0.05, 0.1, -0.1, 0.16, -0.16]) {
                const q = { x: end.x - (dy / d) * e, y: end.y + (dx / d) * e }, P = K.path(s, [q]);
                if (!K.thorn(s, P) && P.hits.length >= n0 - 1) { dt = [{ x: (s.nx + q.x) / 2, y: (s.ny + q.y) / 2 }, q]; break; }
              }
            }
            if (dt) {
              const n0 = { x: s.nx, y: s.ny / K.A * K.A }, lerp = (a: Pt, b: Pt, k: number) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
              m.seq = [...Array.from({ length: 13 }, () => n0), ...[0.25, 0.5, 0.75, 1].map((k) => lerp(n0, dt[0], k)), ...[0.25, 0.5, 0.75, 1].map((k) => lerp(dt[0], dt[1], k)), dt[1]];
              return press(n0.x, n0.y);
            }
          } else if (stroke === true && K.path(s, [...s.stroke, end]).dodges.length) {
            // ✏️ M2 S2(🧪): 미리 보기에 '휙! 꺾어요'가 뜨면 빨간 덤불 때처럼 지우고 잎 옆에서 꺾어 다시 그린다
            const lp = leafPlan(s);
            if (lp) {
              const n0 = { x: s.nx, y: s.ny }, lerp = (a: Pt, b: Pt, k: number) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
              m.seq = [...Array.from({ length: 13 }, () => n0), ...[0.25, 0.5, 0.75, 1].map((k) => lerp(n0, lp.pts[0], k)), ...[0.25, 0.5, 0.75, 1].map((k) => lerp(lp.pts[0], lp.pts[1], k)), lp.pts[1]];
              return press(n0.x, n0.y);
            }
          }
        }
        if (s.t >= m.until) return (m.st = 'idle'), (m.until = s.t + COOL), NO; // 뗀다
        if (m.bend) { // 한붓: 앞 절반은 꺾는 점, 뒤 절반은 끝점으로 손가락을 옮긴다(그리는 동안 세상은 느리다)
          const q = s.t < m.half ? m.bend : { x: m.x, y: m.y };
          return press(q.x + m.ox, q.y + m.oy);
        }
        if (!pick && (m.until - s.t) % 6 === 0) { // 처음 하는 사람(pick)은 다시 겨누지 않는다 — 장인 계획을 빌려 '그리는' 것을 막음(한붓 획 뒤)
          const p = smartAim(s, rng); // 느린 세상을 보며 다시 겨눈다
          if (p && Math.hypot(p.x - m.x, p.y * K.A - m.y) > 0.02) (m.x = p.x), (m.y = p.y * K.A), aimErr();
        }
        const p = noisy();
        return press(p.x, p.y);
      }
      if (m.st === 'wait') {
        if (s.t < m.until) return NO;
        if (slow) {
          m.st = 'hold';
          m.until = s.t + RT;
          m.fix = false;
          m.seq = [];
          m.bend = null;
          if (stroke === 'naive') {
            // ✏️ S007(📋): 처음 하는 사람은 30%쯤 아무 적 둘을 이어 꺾어 본다(계획 없이)
            const f = live(s);
            // M2 S1~S2: 화면의 길잡이(점선)·손가락 시범 — 따라 하는 사람인지는 사람(판)마다 처음 볼 때 한 번 정하고(🧪: 획마다 굴리면 결국 다 따라 함), 따라 하는 사람은 누를 때 반쯤 따라 그린다
            const gd = K.guide(s), dm = gd ? K.demo(s) : false;
            const ow = gd ? K.owl(s) : false;
            if (gd && ow && m.fo === undefined) m.fo = (follow.owl ?? 0.5) > 0 && rng() < (follow.owl ?? 0.5); // M2 S4: 부엉이는 판이 멈추고 뜨는 카드라 한 번 더 정한다(📋 가정 ㊱)
            if (gd && !ow && dm && m.fd === undefined) m.fd = follow.demo > 0 && rng() < follow.demo;
            if (gd && !ow && !dm && m.fg === undefined) m.fg = follow.guide > 0 && rng() < follow.guide;
            if (gd && (ow ? m.fo || m.fd || m.fg : dm ? m.fd || m.fg : m.fg)) { // 🧪 S3: 따라 하는 사람은 볼 때마다 따라 그린다(전엔 반쯤)
              m.bend = gd[0];
              (m.x = gd[1].x), (m.y = gd[1].y);
              m.until = s.t + RT + 9;
              m.half = s.t + Math.round((RT + 9) / 2);
              return press(gd[0].x + m.ox, gd[0].y + m.oy);
            }
            // M2 S2(🧪): '휙 전에도 잎 옆을 꺾던' 30%는 뺐다 — 규칙을 미리 아는 셈이라 낙관적이었다
            if (f.length >= 2 && rng() < 0.3) {
              const a = f[Math.floor(rng() * f.length)], b = f.filter((x) => x !== a)[Math.floor(rng() * (f.length - 1))];
              const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
              m.bend = { x: a.x, y: a.y };
              (m.x = b.x + (dx / d) * 0.08), (m.y = b.y + (dy / d) * 0.08);
              m.until = s.t + RT + 9;
              m.half = s.t + Math.round((RT + 9) / 2);
              return press(a.x + m.ox, a.y + m.oy);
            }
          } else if (stroke) {
            // S006: 꾹 누른 느린 세상에서 한붓 길을 찾는다 — 한 줄보다 하나 넘게 더 베면 꺾는 점 하나를 그린다(+0.15초)
            const plan = bestPlan(s), dt = plan && plan.n >= straightN(s, { x: m.x, y: m.y }) + 1 ? plan.pts : detour(s, { x: m.x, y: m.y });
            if (dt) {
              m.bend = dt[0];
              (m.x = dt[1].x), (m.y = dt[1].y);
              m.until = s.t + RT + 9;
              m.half = s.t + Math.round((RT + 9) / 2);
              const q = m.bend;
              return press(q.x + m.ox, q.y + m.oy);
            }
          }
          const p = noisy();
          return press(p.x, p.y);
        }
        m.st = 'idle';
        m.until = s.t + 2 + COOL;
        const p = noisy();
        return press(p.x, p.y); // 1틱 톡 — 반응하는 동안 세상은 제 속도로 흘렀다
      }
      if (!ready(s) || s.t < m.until) return NO;
      let c = choose(s, rng);
      if (!c && stroke === true) { // 🍃 잎만 남으면 장인 겨눔이 없다 — 잎을 겨누고 꾹(그다음 bestPlan이 꺾는 길을 그린다)
        const L = live(s).find((f) => f.k === 'leaf');
        if (L) c = { x: L.x, y: L.y };
      }
      if (!c) return (m.until = s.t + 6), NO;
      m.x = c.x;
      m.y = c.y;
      aimErr();
      m.st = 'wait';
      m.until = s.t + (slow ? REFLEX : RT);
      return NO;
    },
  };
}

/** 처음 하는 사람이 고르는 자리: 보이는 적 하나(70%, 그 조금 너머) 아니면 아무 데나 */
const newbiePick: Pick = (s, rng) => {
  const f = live(s);
  if (f.length && rng() < 0.7) {
    const e = f[Math.floor(rng() * f.length)], dx = e.x - s.nx, dy = e.y - s.ny, d = Math.hypot(dx, dy) || 1;
    return { x: e.x + (dx / d) * 0.08, y: e.y + (dy / d) * 0.08 };
  }
  return { x: K.X0 + rng() * (K.X1 - K.X0), y: K.Y0 + rng() * (K.Y1 - K.Y0) };
};

/** 장인 + 한붓(S006): 장인이 그을 때, 꺾인 한 획이 하나 넘게 더 베면 그 길로(꾹 1틱 → 끝점 1틱 → 떼기) */
const seqMem = new WeakMap<object, Pt[]>();
export const slowdashSmartStroke: Bot<DashState> = {
  name: '장인 + 한붓',
  act(s, rng) {
    const q = seqMem.get(s);
    if (q && q.length) {
      const p = q.shift()!;
      return press(p.x, p.y);
    }
    if (q && s.down) return seqMem.delete(s), NO;
    const L = live(s);
    if (!s.down && !s.lock && s.g >= 25 && L.length && L.every((f) => f.k === 'leaf')) { // 🍃 잎만 남으면 장인 탭은 못 벤다 — 바로 들어가기
      const lp = leafPlan(s);
      if (lp) return seqMem.set(s, [lp.pts[1]]), press(lp.pts[0].x, lp.pts[0].y);
    }
    const a = slowdashSmart.act(s, rng);
    if (!a.pointer) return a;
    const aim = { x: a.pointer.x, y: a.pointer.y * K.A }, plan = bestPlan(s);
    if (plan && plan.n >= straightN(s, aim) + 1) {
      seqMem.set(s, [plan.pts[1]]);
      return press(plan.pts[0].x, plan.pts[0].y);
    }
    const dt = detour(s, aim);
    if (dt) {
      seqMem.set(s, [dt[1]]);
      return press(dt[0].x, dt[0].y);
    }
    return a;
  },
};
/** 버릇⑤ 휘젓기(📋 S006 새 막 누르기): 늘 아무렇게나 지그재그 넷 — 1틱씩 그리고 뗀다 */
export const slowdashScribble: Bot<DashState> = {
  name: '휘젓기',
  act(s, rng) {
    const q = seqMem.get(s);
    if (q && q.length) {
      const p = q.shift()!;
      return press(p.x, p.y);
    }
    if (q && s.down) return seqMem.delete(s), NO;
    if (!ready(s) || s.t % 24) return NO;
    const pts = Array.from({ length: 4 }, () => ({ x: K.X0 + rng() * (K.X1 - K.X0), y: K.Y0 + rng() * (K.Y1 - K.Y0) }));
    seqMem.set(s, pts.slice(1));
    return press(pts[0].x, pts[0].y);
  },
};

/** 연타: 0.4초마다 살아 있는 적 아무나를 1틱 톡 */
export const slowdashSpam: Bot<DashState> = {
  name: '연타',
  act(s, rng) {
    if (s.phase !== 'play' || s.t % 24) return NO;
    const f = live(s);
    if (!f.length) return press(K.X0 + rng() * (K.X1 - K.X0), K.Y0 + rng() * (K.Y1 - K.Y0));
    const e = f[Math.floor(rng() * f.length)];
    return press(e.x, e.y);
  },
};

/** 적 쪽으로 그은 선마다 몇 명을 꿰는가 */
function lines(s: DashState, far: boolean) {
  return live(s).map((f) => {
    const dx = f.x - s.nx, dy = f.y - s.ny, d = Math.hypot(dx, dy) || 1e-6, L = far ? K.DMAX : Math.min(K.DMAX, d + 0.12);
    const x = s.nx + (dx / d) * L, y = s.ny + (dy / d) * L;
    return { x, y, d, n: K.trace(s, x, y).hits.length };
  });
}
const waitSince = new WeakMap<object, number>();
/** 버릇③ 끝까지 참기: 살아 있는 적을 한 줄에 다 꿸 수 있을 때만 벤다(10초 넘게 못 하면 가장 많이 꿰는 줄로) */
export const slowdashHabit3: Bot<DashState> = {
  name: '끝까지 참기',
  act(s) {
    if (!ready(s)) return NO;
    const L = lines(s, false);
    if (!L.length) return NO;
    const best = L.reduce((a, b) => (b.n > a.n || (b.n === a.n && b.d < a.d) ? b : a));
    const since = waitSince.get(s) ?? s.t;
    if (!waitSince.has(s)) waitSince.set(s, s.t);
    if (best.n >= Math.min(L.length, 5) || s.t - since > 600) return waitSince.set(s, s.t), press(best.x, best.y);
    return NO;
  },
};
/** 버릇④ 늘 최대 거리: 가장 가까운 적 쪽으로, 갈 수 있는 끝까지 */
export const slowdashHabit4: Bot<DashState> = {
  name: '늘 최대 거리',
  act(s) {
    if (!ready(s)) return NO;
    const L = lines(s, true);
    if (!L.length) return NO;
    const best = L.reduce((a, b) => (b.d < a.d ? b : a));
    return press(best.x, best.y);
  },
};

/** 🧪 S004 대조군(📋 F5 고침): 장인 조준을 C틱마다 1틱 톡 — 리듬만으로 피해지는지 본다 */
export function tapEvery(C: number): Bot<DashState> {
  const lastT = new WeakMap<object, number>();
  return {
    name: `톡 ${C}틱마다`,
    act(s, rng) {
      if (!ready(s) || s.t - (lastT.get(s) ?? -999) < C) return NO;
      const q = slowdashSmart.act(s, rng);
      if (q.pointer) lastT.set(s, s.t);
      return q;
    },
  };
}

export const BOTS: Record<string, Bot<DashState>> = {
  smart: slowdashSmart,
  habit: slowdashHabit,
  habit2: slowdashHabit2,
  habit3: slowdashHabit3,
  habit4: slowdashHabit4,
  random: slowdashRandom,
  spam: slowdashSpam,
  humanNew: human('사람 처음(0.7초)', 0.7, 0.05, true),
  human: human('사람 캐주얼(0.5초)', 0.5, 0.03, true),
  humanPro: human('사람 숙련(0.35초)', 0.35, 0.015, true),
  humanTap: human('사람 캐주얼 · 꾹 없이 탭만', 0.5, 0.03, false),
  smartStroke: slowdashSmartStroke,
  humanStroke: human('사람 캐주얼 + 한붓', 0.5, 0.03, true, undefined, true),
  humanStroke30: human('사람 한붓 · 빨강 보고 되돌리기 30%', 0.5, 0.03, true, undefined, true, 0.3),
  scribble: slowdashScribble,
  newbie: human('처음 하는 사람(길잡이를 반쯤 따라 그림)', 0.7, 0.05, true, newbiePick, 'naive', 1, { guide: 1, demo: 1 }),
  // ✏️ M2 S2(🧪 낙관 위험 ㉛): 처음 하는 사람을 나눠 잰다 — 점선은 안 보고 손가락 시범만 가끔(25%) 따라 함 · 끝까지 안 따라 함(바닥값)
  newbieLow: human('처음 하는 사람(넷 중 하나만 시범을 따라 함)', 0.7, 0.05, true, newbiePick, 'naive', 1, { guide: 0, demo: 0.25 }),
  newbieNever: human('처음 하는 사람(안 따라 함)', 0.7, 0.05, true, newbiePick, 'naive', 1, { guide: 0, demo: 0, owl: 0 }), // 귀띔도 안 따름
};

export interface Try {
  ok: boolean; stall: boolean; leafCombo: boolean; bentDodge: number; stars: number; s2: boolean; s3: boolean; sec: number; best: number; hits: number; dashes: number; whiff: number;
  holdAvg: number; downPct: number; empty: number; cancels: number; bent: number; bentCut: number; lineCut: number; s: DashState;
}

/** 🧪 S006: 정말 꺾인 획인가(어느 꺾는 점에서든 방향이 25° 넘게 바뀜) — 획 점이 있다고 꺾인 것이 아니다(누르는 중 다시 겨누기) */
function turned(p: Pt[]) {
  for (let i = 1; i + 1 < p.length; i++) {
    const a = Math.atan2(p[i].y - p[i - 1].y, p[i].x - p[i - 1].x), b = Math.atan2(p[i + 1].y - p[i].y, p[i + 1].x - p[i].x);
    const d = Math.abs(((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y) > 0.02 && Math.hypot(p[i + 1].x - p[i].x, p[i + 1].y - p[i].y) > 0.02 && d > 0.44) return true;
  }
  return false;
}

/** k판을 한 번 도전(첫 결과가 나올 때까지, 하트 무관) */
const STALL = 60;
export function tryStage(bot: Bot<DashState>, seed: number, k: number, maxSec = 300, hand = seed, opt: { owlNow?: boolean; owlYes?: boolean } = {}): Try {
  const s = g.create(seed);
  if (k) startStage(s, k);
  if (opt.owlNow) useOwl(s, true); // M2 S4: 같은 판 세 번 진 뒤(다시 하기 흐름)
  const rng = mulberry32(hand ^ 0x9e3779b9), t0 = s.t, d0 = s.dashes, emptyG = K.GBASE + K.GPER * K.HOP;
  let whiff = 0, down = 0, holds = 0, holdT = 0, cur = 0, empty = 0, dn = s.dashes, cancels = 0, bent = 0, bentCut = 0, lineCut = 0;
  // ✏️ S010 300초 측정 고침: 60초 동안 아무것도 못 베고 웨이브도 그대로면 '막힘' — 사람이면 그만둔다(실패로 셈)
  let prog = s.t, mark = '', leafCombo = false, bentDodge = 0;
  while (s.phase !== 'result' && s.t - t0 < maxSec * 60) {
    if (s.owlAsk) useOwl(s, opt.owlYes ?? true); // M2 S4 부엉이가 물으면(2-1 휙 세 번) 받는다 — 따를지는 봇이 정함
    const now = `${s.wave}/${s.foes.length}/${s.hp}`; // S012: 덤불 맞음(목숨 그대로)은 진전이 아니다 — 휘젓기 6판 300초
    if (now !== mark) (mark = now), (prog = s.t);
    if (s.t - prog > STALL * 60) break;
    const was = s.down, px = s.nx, py = s.ny;
    g.step(s, bot.act(s, rng));
    if (s.down) (down++, cur++);
    else if (was) (holds++, (holdT += cur), (cur = 0));
    if (s.g < emptyG) empty++;
    if (s.dashes > dn && s.combo.n >= 2 && s.cuts.slice(-s.combo.n).some((c) => c.k === 'leaf')) leafCombo = true; // 🍃 잎을 다른 적과 한 획에
    if (s.dashes > dn && turned([{ x: px, y: py }, ...s.stroke, { x: s.nx, y: s.ny }]) && s.events.some((e) => e.t === s.t && e.kind === 'dodge')) bentDodge++; // 🍃 꺾었는데 휙(모든 토막 — 🧪 S2: 꺾은 뒤만 세면 규칙상 거의 0)
    if (s.dashes > dn) ((dn = s.dashes), s.combo.n === 0 && whiff++, turned([{ x: px, y: py }, ...s.stroke, { x: s.nx, y: s.ny }]) ? (bent++, (bentCut += s.combo.n)) : (lineCut += s.combo.n));
    for (let i = s.events.length - 1; i >= 0 && s.events[i].t === s.t; i--) if (s.events[i].kind === 'cancel') cancels++; // 🧪 S001: 조용한 취소(방패 바로 앞 길이 0 등)
  }
  const ok = s.phase === 'result' && s.ok, T = Math.max(1, s.t - t0), n = s.dashes - d0;
  return {
    stall: s.phase !== 'result' && s.t - prog > STALL * 60,
    leafCombo,
    bentDodge: bent ? bentDodge / bent : 0,
    ok, stars: ok ? s.got : 0, s2: ok && s.starOk[1], s3: ok && s.starOk[2], sec: (s.t - t0) / 60, best: s.best, hits: s.hits, dashes: n,
    whiff: n ? whiff / n : 0, holdAvg: holds ? holdT / holds / 60 : 0, downPct: down / T, empty: empty / T, cancels, bent: n ? bent / n : 0, bentCut: bent ? bentCut / bent : 0, lineCut: n - bent ? lineCut / (n - bent) : 0, s,
  };
}
/** 처음 하는 사람: 같은 판을 3번까지 */
export function try3(bot: Bot<DashState>, seed: number, k: number) {
  let last: Try | null = null, all = 0, first = false;
  for (let a = 0; a < 3; a++) {
    last = tryStage(bot, seed, k, 300, seed + a * 977);
    all += last.sec;
    if (a === 0) first = last.ok;
    if (last.ok) return { ...last, tries: a + 1, secAll: all, first };
  }
  return { ...last!, tries: 3, secAll: all, first }; // M2 S2(🧪): 3번 합친 시간 · 첫 도전 클리어
}

/** 처음 10초(첫인상 — 공장 기준 17 · FUN F1·F2) */
function first10(bot: Bot<DashState>, seed: number) {
  const s = g.create(seed), rng = mulberry32(seed ^ 0x9e3779b9);
  while (s.t < 600 && !g.over(s)) g.step(s, bot.act(s, rng));
  return { hurt: s.hits > 0 || (s.phase === 'result' && !s.ok), firstPress: s.firstPress, firstBig: s.firstBig };
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const median = (a: number[]) => {
  const b = [...a].sort((x, y) => x - y);
  return b.length ? (b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2) : 0;
};
type Row = { clear: number; star: number; star2p: number; star3: number; cancels: number; bent: number; bentCut: number; lineCut: number; s2: number; s3: number; stall: number; timeout: number; sec: number; secAll?: number; first?: number; best: number; hit: number; dashes: number; whiff: number; holdAvg: number; downPct: number; empty: number; tries?: number };
const sum = (t: (Try & { tries?: number; secAll?: number; first?: boolean })[]): Row => ({
  ...(t[0]?.secAll !== undefined ? { secAll: r2(median(t.map((x) => x.secAll!))), first: r2(mean(t.map((x) => +x.first!))) } : {}),
  clear: r2(mean(t.map((x) => +x.ok))),
  star: r2(mean(t.map((x) => x.stars))),
  star2p: r2(mean(t.map((x) => +(x.stars >= 2)))),
  star3: r2(mean(t.map((x) => +(x.stars === 3)))),
  cancels: r2(mean(t.map((x) => x.cancels))),
  bent: r2(mean(t.map((x) => x.bent))),
  bentCut: r2(mean(t.filter((x) => x.bent > 0).map((x) => x.bentCut))),
  lineCut: r2(mean(t.map((x) => x.lineCut))),
  s2: r2(mean(t.map((x) => +x.s2))),
  s3: r2(mean(t.map((x) => +x.s3))),
  stall: r2(mean(t.map((x) => +x.stall))),
  timeout: r2(mean(t.map((x) => +(!x.stall && x.sec >= 299)))),
  sec: r2(median(t.map((x) => x.sec))),
  best: r2(mean(t.map((x) => x.best))),
  hit: r2(mean(t.map((x) => x.hits))),
  dashes: r2(mean(t.map((x) => x.dashes))),
  whiff: r2(mean(t.map((x) => x.whiff))),
  holdAvg: r2(mean(t.filter((x) => x.holdAvg > 0).map((x) => x.holdAvg))),
  downPct: r2(mean(t.map((x) => x.downPct))),
  empty: r2(mean(t.map((x) => x.empty))),
  ...(t[0]?.tries !== undefined ? { tries: r2(mean(t.map((x) => x.tries ?? 1))) } : {}),
});

export function measure(seeds = 24, only?: string[]) {
  const names = only ?? Object.keys(BOTS);
  const stages = STAGES.map((d, k) => {
    const row: Record<string, unknown> = { k: k + 1, key: d.key, name: d.name, stars: d.stars.map((q) => q.label) };
    for (const name of names) {
      const bot = BOTS[name], seedsOf = Array.from({ length: seeds }, (_, i) => 101 + i * 7);
      row[name] = sum(name.startsWith('newbie') ? seedsOf.map((sd) => try3(bot, sd, k)) : seedsOf.map((sd) => tryStage(bot, sd, k)));
    }
    return row;
  });
  const R = (name: string, k: number) => stages[k][name] as Row | undefined;
  const runs: Record<string, unknown> = {};
  const score: Record<string, number> = {};
  for (const name of names.filter((n) => ['smart', 'habit', 'habit2', 'random', 'spam', 'human'].includes(n))) {
    // ✏️ S002: 하트가 없어 지면 그 판 다시 → 끝이 없다. 점수·격차는 '처음 5분'으로 잰다
    const r = Array.from({ length: Math.min(seeds, 12) }, (_, i) => runBot(g, BOTS[name], 501 + i * 13, 60 * 300));
    score[name] = mean(r.map((x) => x.score));
    runs[name] = {
      score: Math.round(score[name]),
      stagesCleared: r2(mean(r.map((x) => (x.s.won ? STAGES.length : x.s.stage)))),
      won: r2(mean(r.map((x) => +x.s.won))),
      stars: r2(mean(r.map((x) => x.s.stars))),
      min: r2(median(r.map((x) => x.ticks / 60)) / 60),
    };
  }
  const firstBot = names.includes('newbie') ? BOTS.newbie : slowdashRandom;
  const first = Array.from({ length: seeds * 2 }, (_, i) => first10(firstBot, 901 + i));
  const firstR = Array.from({ length: seeds * 2 }, (_, i) => first10(slowdashRandom, 901 + i));
  const habits = ['habit', 'habit2', 'habit3', 'habit4'].filter((n) => names.includes(n));
  const from3 = stages.slice(2);
  const habitStar3 = Object.fromEntries(habits.map((b) => [b, r2(Math.max(...from3.map((r) => (r[b] as Row).star3)))]));
  const habitStarMean3 = Object.fromEntries(habits.map((b) => [b, r2(mean(from3.map((r) => (r[b] as Row).star)))]));
  const has = (n: string) => names.includes(n);
  const F5 = has('human') && has('humanTap')
    ? {
        starDiff: r2(mean(stages.map((_, k) => R('human', k)!.star - R('humanTap', k)!.star))),
        clearDiff3: r2(mean(from3.map((_, j) => R('human', j + 2)!.clear - R('humanTap', j + 2)!.clear))),
        holdAvg: r2(mean(stages.map((_, k) => R('human', k)!.holdAvg))),
        downPct: r2(mean(stages.map((_, k) => R('human', k)!.downPct))),
      }
    : null;
  const F6 = has('spam')
    ? {
        star2plus2: r2(Math.max(...stages.slice(1).map((_, j) => R('spam', j + 1)!.star2p))), // 🧪 S001: ★2 이상인 시도의 비율(평균 아님)
        clearMax3: r2(Math.max(...from3.map((_, j) => R('spam', j + 2)!.clear))),
        clear: stages.map((_, k) => R('spam', k)!.clear),
      }
    : null;
  // 🧪 FUN v1.1 공짜 별: 1-3~ 별 조건(★★ s2 · ★★★ s3)마다, 버릇 하나라도 ≥ .5 달성이고 장인 − 그 버릇 < .4
  const freeStars: string[] = [];
  if (has('smart'))
    stages.forEach((r, k) => {
      if (k < 2) return;
      for (const c of ['s2', 's3'] as const)
        for (const b of habits) {
          const hb = (r[b] as Row)[c], sm = (r.smart as Row)[c];
          if (hb >= 0.5 && sm - hb < 0.4) {
            freeStars.push(`${k + 1}판 ${c === 's2' ? '★★' : '★★★'} (${b} ${hb} · 장인 ${sm})`);
            break;
          }
        }
    });
  // 🧪 F5 v1.2(S004 착시 뒤): 가장 잘하는 탭 주기(16~48틱)의 ★ 평균(3판~)이 사람 꾹 ★보다 .5 넘게 낮아야 '꾹이 꼭 필요'
  let tapSweep: { C: number; star: number; clear: number }[] | null = null, F5sweep: number | null = null, F5sweepStroke: number | null = null;
  if (has('human')) {
    const n = Math.max(2, Math.min(6, seeds));
    tapSweep = [16, 24, 32, 40, 48].map((C) => {
      const t = STAGES.slice(2).flatMap((_, j) => Array.from({ length: n }, (__, i) => tryStage(tapEvery(C), 101 + i * 7, j + 2)));
      return { C, star: r2(mean(t.map((x) => x.stars))), clear: r2(mean(t.map((x) => +x.ok))) };
    });
    F5sweep = r2(mean(from3.map((r) => (r.human as Row).star)) - Math.max(...tapSweep.map((x) => x.star)));
    // S011(🧪 잣대): ⓒ 확정 뒤 꾹 = 한붓 그리기라서, 같은 스윕을 사람 한붓 ★으로도 낸다
    if (has('humanStroke')) F5sweepStroke = r2(mean(from3.map((r) => (r.humanStroke as Row).star)) - Math.max(...tapSweep.map((x) => x.star)));
  }
  // S006 한붓 지표: 한붓 낙차(장인 + 한붓 ★ − 장인 ★) · 사람 한붓 꾹 ★ − 가장 잘하는 탭 ★(3판~) · 휘젓기 ★2 이상(2판~)
  // S008: 한붓 요약은 판 범위별(1~5 꺾기 판 · 6~10) — 섞으면 서로 반대로 읽힌다(🧪 S007). 탭 기준은 같은 범위의 humanTap ★(사람 반응 0.5초)
  const strokeOf = (from: number, to: number) => {
    if (!has('smartStroke') || !has('smart')) return null;
    const ks = stages.map((_, k) => k).filter((k) => k >= from && k < to), k3 = ks.filter((k) => k >= 2);
    return {
      drop: r2(mean(ks.map((k) => R('smartStroke', k)!.star - R('smart', k)!.star))),
      bent: r2(mean(ks.map((k) => R('smartStroke', k)!.bent))),
      humanStrokeVsTap: has('humanStroke') && has('humanTap') && k3.length ? r2(mean(k3.map((k) => R('humanStroke', k)!.star)) - mean(k3.map((k) => R('humanTap', k)!.star))) : null,
      newbieVsTap: has('newbie') && has('humanTap') && k3.length ? r2(mean(k3.map((k) => R('newbie', k)!.star)) - mean(k3.map((k) => R('humanTap', k)!.star))) : null,
      scribbleS2: has('scribble') ? r2(Math.max(...ks.map((k) => R('scribble', k)!.s2))) : null,
      spamClear: has('spam') ? r2(Math.max(...k3.map((k) => R('spam', k)!.clear))) : null,
      newbieClear: has('newbie') ? ks.map((k) => R('newbie', k)!.clear) : null,
      humanClear: has('human') ? ks.map((k) => R('human', k)!.clear) : null,
    };
  };
  const stroke = { s1to5: strokeOf(0, 5), s6to10: strokeOf(5, STAGES.length) };
  return {
    at: new Date().toISOString().slice(0, 10),
    stroke,
    F5sweep,
    F5sweepStroke,
    // S011 덤불 판(3·4·5·6·8·9) ★★★: 사람 한붓 − 사람 탭, 되돌리기 30% 봇도
    thornS3: (() => { const T = stages.filter((r) => STAGES[(r.k as number) - 1].thorns?.length); const a = (n: string) => T.every((r) => r[n]) ? r2(mean(T.map((r) => (r[n] as Row).s3))) : null; return { humanStroke: a('humanStroke'), humanStroke30: a('humanStroke30'), humanTap: a('humanTap'), newbie: a('newbie') }; })(),
    tapSweep,
    freeStars,
    seeds,
    gap: r2(score.smart / Math.max(1, score.random)),
    gapHabit2: score.habit2 ? r2(score.smart / score.habit2) : null,
    runs,
    firstImpression: {
      randomHurtIn10s: r2(mean(firstR.map((x) => +x.hurt))),
      bot: firstBot.name,
      hurtIn10s: r2(mean(first.map((x) => +x.hurt))),
      firstPressSec: r2(median(first.map((x) => x.firstPress / 60))),
      firstBigSec: r2(median(first.map((x) => (x.firstBig < 0 ? 10 : x.firstBig / 60)))),
    },
    habitStar3Max3plus: habitStar3,
    habitStarMean3plus: habitStarMean3,
    F5,
    F6,
    stages,
  };
}

/** ✏️ M2 S4 다시 하기 규칙(📋): 월드 1을 한 번씩 깬 뒤 별 합이 lock 미만이면 별이 가장 적은 판(같으면 앞 판)부터 한 판씩 다시 ·
 *  판마다 가장 좋은 별만 셈 · 같은 판을 세 번 지면 귀띔을 쓴다(★★★ 없음). 다시 한 판 수(18·12까지)와 처음 한 바퀴 별 합 */
export function campaign(bot: Bot<DashState>, seed: number, maxReplays = 10) {
  const best = Array(STAGE_W1).fill(0) as number[];
  let tries = 0;
  const clear = (k: number, round: number) => {
    for (let a = 0; a < 6; a++) {
      const r = tryStage(bot, seed + k * 31 + round * 1013, k, 300, seed + a * 977 + round * 131 + k, { owlNow: a >= 3 });
      tries++;
      if (r.ok) return r.stars;
    }
    return 0;
  };
  for (let k = 0; k < STAGE_W1; k++) best[k] = clear(k, 0);
  const first = best.reduce((x, y) => x + y, 0), sums = [first];
  for (let r = 1; r <= maxReplays && sums[sums.length - 1] < 18; r++) {
    const k = best.indexOf(Math.min(...best));
    best[k] = Math.max(best[k], clear(k, r));
    sums.push(best.reduce((x, y) => x + y, 0));
  }
  const to = (n: number) => { const i = sums.findIndex((v) => v >= n); return i < 0 ? Infinity : i; };
  return { first, to18: to(18), to12: to(12), tries };
}
const STAGE_W1 = 10;
export function measureCampaign(seeds = 24) {
  const out: Record<string, unknown> = {};
  for (const name of ['newbieNever', 'newbieLow', 'human', 'spam', 'scribble']) {
    const r = Array.from({ length: seeds }, (_, i) => campaign(BOTS[name], 301 + i * 11));
    const fin = (v: number) => (Number.isFinite(v) ? v : 99);
    out[name] = { first: r2(median(r.map((x) => x.first))), to18: median(r.map((x) => fin(x.to18))), open18: r2(mean(r.map((x) => +Number.isFinite(x.to18)))), to12: median(r.map((x) => fin(x.to12))), open12: r2(mean(r.map((x) => +Number.isFinite(x.to12)))) };
  }
  return out;
}

/** ✏️ M2 S1 시험 판(월드 2 초안) 재기: TRIAL 판을 STAGES 끝에 잠깐 붙여 재고 뗀다 — 1~10 지표는 그대로 */
export function measureTrial(seeds = 24) {
  const out: Record<string, unknown>[] = [];
  for (const d of TRIAL) {
    STAGES.push(d);
    const k = STAGES.length - 1, seedsOf = Array.from({ length: seeds }, (_, i) => 101 + i * 7);
    const row: Record<string, unknown> = { key: d.key, name: d.name };
    try {
      for (const name of ['smartStroke', 'humanStroke', 'humanStroke30', 'newbie', 'newbieLow', 'newbieNever', 'humanTap', 'smart', 'habit2', 'spam', 'scribble']) {
        const t = seedsOf.map((sd) => (name.startsWith('newbie') ? try3(BOTS[name], sd, k) : tryStage(BOTS[name], sd, k)));
        row[name] = { ...sum(t), leafCombo: r2(mean(t.map((x) => +x.leafCombo))), bentDodge: r2(mean(t.map((x) => x.bentDodge))) };
      }
      LEAF_SOLO = true; // 낙차 대조군: 잎은 따로만 베는 장인 한붓
      row.smartStrokeSolo = sum(seedsOf.map((sd) => tryStage(BOTS.smartStroke, sd, k)));
    } finally {
      LEAF_SOLO = false;
      STAGES.pop();
    }
    const R = (n: string) => row[n] as Row & { leafCombo?: number };
    row.summary = { use: R('smartStroke').leafCombo, drop: r2(R('smartStroke').star - R('smartStrokeSolo').star), newbieClear: R('newbie').clear, newbieLowClear: R('newbieLow').clear, newbieNeverClear: R('newbieNever').clear, newbieLowFirst: R('newbieLow').first, newbieLowSecAll: R('newbieLow').secAll, newbieNeverFirst: R('newbieNever').first, newbieNeverSecAll: R('newbieNever').secAll, humanStrokeClear: R('humanStroke').clear, bentDodge: (R('humanStroke') as Row & { bentDodge?: number }).bentDodge, spamClear: R('spam').clear, scribbleClear: R('scribble').clear, humanStrokeSec: R('humanStroke').sec, straightHumanClear: R('humanTap').clear };
    out.push(row);
  }
  return out;
}

if (process.argv[1]?.endsWith('funqa.ts')) {
  const n = Number(process.argv[2]) || 24, t0 = Date.now();
  const m = measure(n);
  const dir = join(import.meta.dirname, 'reports');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'funqa.json'), JSON.stringify(m, null, 1) + '\n');
  const w2 = measureTrial(n);
  writeFileSync(join(dir, 'funqa-w2.json'), JSON.stringify(w2, null, 1) + '\n');
  for (const r of w2) console.log(`시험 판 ${r.key}: ${JSON.stringify(r.summary)}`);
  const camp = measureCampaign(n);
  writeFileSync(join(dir, 'funqa-campaign.json'), JSON.stringify(camp, null, 1) + '\n');
  console.log(`다시 하기(월드 1 → 별 18/12): ${JSON.stringify(camp)}`);
  console.log(`격차 ${m.gap}× · 장인÷버릇② ${m.gapHabit2}× · 첫인상 ${JSON.stringify(m.firstImpression)} · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
  console.log(`한붓 1~5 ${JSON.stringify(m.stroke.s1to5)}`);
  console.log(`한붓 6~10 ${JSON.stringify(m.stroke.s6to10)}`);
  console.log(`F5 스윕(사람 꾹 ★ − 가장 잘하는 탭 ★, 3판~) ${m.F5sweep} · 한붓 기준 ${m.F5sweepStroke} · ${JSON.stringify(m.tapSweep)}`);
  console.log(`덤불 판 ★★★ ${JSON.stringify(m.thornS3)}`);
  console.log(`F5 느린 시간 ${JSON.stringify(m.F5)} · F6 연타 ${JSON.stringify(m.F6)}`);
  console.log(`공짜 별 ${m.freeStars.length}: ${m.freeStars.join(" · ")}`);
  console.log(`버릇 ★3(3판~) 최대 ${JSON.stringify(m.habitStar3Max3plus)} · ★ 평균(3판~) ${JSON.stringify(m.habitStarMean3plus)}`);
  for (const name of Object.keys(BOTS)) {
    console.log(`${name.padEnd(9)} ` + m.stages.map((r) => { const x = r[name] as Row; return `${x.clear}/★${x.star}/${x.sec}s/d${x.dashes}/w${x.whiff}/h${x.holdAvg}`; }).join(' │ '));
  }
  console.log(JSON.stringify(m.runs));
}
