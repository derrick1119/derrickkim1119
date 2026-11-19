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
import { STAGES, measureKit as K, slowdash as g, slowdashHabit, slowdashHabit2, slowdashRandom, slowdashSmart, startStage, type DashState } from './game.ts';

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
/** 사람 반응 봇: pick이 고른 자리(게임 좌표 x, y)를 react초 늦게·err만큼 빗나가게. slow면 꾹 누른 채 반응한다 */
export function human(name: string, react: number, err: number, slow: boolean, pick?: Pick): Bot<DashState> {
  const mem = new WeakMap<object, { st: 'idle' | 'wait' | 'hold'; until: number; x: number; y: number; ox: number; oy: number }>();
  const choose: Pick = pick ?? ((s, rng) => { const p = smartAim(s, rng); return p && { x: p.x, y: p.y * K.A }; });
  const RT = Math.round(react * 60), REFLEX = 9, COOL = 15;
  return {
    name,
    act(s, rng) {
      let m = mem.get(s);
      if (!m) mem.set(s, (m = { st: 'idle', until: 0, x: 0, y: 0, ox: 0, oy: 0 }));
      if (s.phase !== 'play') return (m.st = 'idle'), NO;
      // ✏️ 한붓 획(오너 피드백) 뒤: 빗나감은 겨눌 때 한 번만 정한다 — 틱마다 흔들면 누르는 동안 손이 떨려 엉뚱한 획이 그려졌다
      const aimErr = () => ((m!.ox = (rng() * 2 - 1) * err), (m!.oy = (rng() * 2 - 1) * err));
      const noisy = () => ({ x: m!.x + m!.ox, y: m!.y + m!.oy });
      if (m.st === 'hold') {
        if (!s.down && s.t > m.until - RT + 2) return (m.st = 'idle'), (m.until = s.t + COOL), NO; // 게이지가 바닥나 저절로 벴다
        if (s.t >= m.until) return (m.st = 'idle'), (m.until = s.t + COOL), NO; // 뗀다
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
          const p = noisy();
          return press(p.x, p.y);
        }
        m.st = 'idle';
        m.until = s.t + 2 + COOL;
        const p = noisy();
        return press(p.x, p.y); // 1틱 톡 — 반응하는 동안 세상은 제 속도로 흘렀다
      }
      if (!ready(s) || s.t < m.until) return NO;
      const c = choose(s, rng);
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
  newbie: human('처음 하는 사람', 0.7, 0.05, true, newbiePick),
};

export interface Try {
  ok: boolean; stars: number; s2: boolean; s3: boolean; sec: number; best: number; hits: number; dashes: number; whiff: number;
  holdAvg: number; downPct: number; empty: number; cancels: number; s: DashState;
}

/** k판을 한 번 도전(첫 결과가 나올 때까지, 하트 무관) */
export function tryStage(bot: Bot<DashState>, seed: number, k: number, maxSec = 300, hand = seed): Try {
  const s = g.create(seed);
  if (k) startStage(s, k);
  const rng = mulberry32(hand ^ 0x9e3779b9), t0 = s.t, d0 = s.dashes, emptyG = K.GBASE + K.GPER * K.HOP;
  let whiff = 0, down = 0, holds = 0, holdT = 0, cur = 0, empty = 0, dn = s.dashes, cancels = 0;
  while (s.phase !== 'result' && s.t - t0 < maxSec * 60) {
    const was = s.down;
    g.step(s, bot.act(s, rng));
    if (s.down) (down++, cur++);
    else if (was) (holds++, (holdT += cur), (cur = 0));
    if (s.g < emptyG) empty++;
    if (s.dashes > dn) ((dn = s.dashes), s.combo.n === 0 && whiff++);
    for (let i = s.events.length - 1; i >= 0 && s.events[i].t === s.t; i--) if (s.events[i].kind === 'cancel') cancels++; // 🧪 S001: 조용한 취소(방패 바로 앞 길이 0 등)
  }
  const ok = s.phase === 'result' && s.ok, T = Math.max(1, s.t - t0), n = s.dashes - d0;
  return {
    ok, stars: ok ? s.got : 0, s2: ok && s.starOk[1], s3: ok && s.starOk[2], sec: (s.t - t0) / 60, best: s.best, hits: s.hits, dashes: n,
    whiff: n ? whiff / n : 0, holdAvg: holds ? holdT / holds / 60 : 0, downPct: down / T, empty: empty / T, cancels, s,
  };
}
/** 처음 하는 사람: 같은 판을 3번까지 */
export function try3(bot: Bot<DashState>, seed: number, k: number) {
  let last: Try | null = null;
  for (let a = 0; a < 3; a++) if ((last = tryStage(bot, seed, k, 300, seed + a * 977)).ok) return { ...last, tries: a + 1 };
  return { ...last!, tries: 3 };
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
type Row = { clear: number; star: number; star2p: number; star3: number; cancels: number; s2: number; s3: number; sec: number; best: number; hit: number; dashes: number; whiff: number; holdAvg: number; downPct: number; empty: number; tries?: number };
const sum = (t: (Try & { tries?: number })[]): Row => ({
  clear: r2(mean(t.map((x) => +x.ok))),
  star: r2(mean(t.map((x) => x.stars))),
  star2p: r2(mean(t.map((x) => +(x.stars >= 2)))),
  star3: r2(mean(t.map((x) => +(x.stars === 3)))),
  cancels: r2(mean(t.map((x) => x.cancels))),
  s2: r2(mean(t.map((x) => +x.s2))),
  s3: r2(mean(t.map((x) => +x.s3))),
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
      row[name] = sum(name === 'newbie' ? seedsOf.map((sd) => try3(bot, sd, k)) : seedsOf.map((sd) => tryStage(bot, sd, k)));
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
  return {
    at: new Date().toISOString().slice(0, 10),
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

if (process.argv[1]?.endsWith('funqa.ts')) {
  const n = Number(process.argv[2]) || 24, t0 = Date.now();
  const m = measure(n);
  const dir = join(import.meta.dirname, 'reports');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'funqa.json'), JSON.stringify(m, null, 1) + '\n');
  console.log(`격차 ${m.gap}× · 장인÷버릇② ${m.gapHabit2}× · 첫인상 ${JSON.stringify(m.firstImpression)} · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
  console.log(`F5 느린 시간 ${JSON.stringify(m.F5)} · F6 연타 ${JSON.stringify(m.F6)}`);
  console.log(`공짜 별 ${m.freeStars.length}: ${m.freeStars.join(" · ")}`);
  console.log(`버릇 ★3(3판~) 최대 ${JSON.stringify(m.habitStar3Max3plus)} · ★ 평균(3판~) ${JSON.stringify(m.habitStarMean3plus)}`);
  for (const name of Object.keys(BOTS)) {
    console.log(`${name.padEnd(9)} ` + m.stages.map((r) => { const x = r[name] as Row; return `${x.clear}/★${x.star}/${x.sec}s/d${x.dashes}/w${x.whiff}/h${x.holdAvg}`; }).join(' │ '));
  }
  console.log(JSON.stringify(m.runs));
}
