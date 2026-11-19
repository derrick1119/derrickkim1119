/**
 * 아케이드 계기판 (실험 0011). 봇 두 종류(못하는 사람·잘하는 사람)로 같은 게임을 여러 판 돌려
 * 기계가 잴 수 있는 재미의 그림자를 잰다. 진짜 재미는 오너가 A|B로 정한다.
 *
 *  숙련 격차   잘하는 봇 점수 ÷ 못하는 봇 점수 — 실력이 결과를 바꾸는가 (작으면 운 게임)
 *  첫 판 여유  못하는 봇이 버틴 시간 — 처음 해도 바로 죽지 않는가 (5초 미만이면 좌절)
 *  한 판 길이  잘하는 봇이 버틴 시간 — 30초~3분이면 "한 판 더"에 좋다 (3분 넘게 버티면 긴장 부족)
 *  단순함      규칙 줄 수·버튼 수
 *
 *   npx tsx arcade/evaluate.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mulberry32 } from '../engine/rng.ts';
import { NO_INPUT, REACT, runBot, type Bot, type GameDef } from './core.ts';
import { GAMES } from './registry.ts';

export interface ArcadeReport {
  id: string;
  name: string;
  n: number;
  dumb: { score: number; sec: number };
  smart: { score: number; sec: number; capped: number };
  skillGap: number;
  parts: { skill: number; onboarding: number; session: number; simplicity: number; unfold?: number };
  /** 잘하는 봇 판에서 30·60·120초 시점의 '새로 등장한 것' 수 (reveals가 있는 게임만) */
  reveals?: [number, number, number];
  /** 못하는 봇(처음 하는 사람) 판: 30초 시점·판이 끝날 때의 '새로 등장한 것' 수 (0025) */
  dumbReveals?: [number, number];
  fun: number;
  /** 처음 하는 사람의 첫 몇 초 (0078): 손 안 대고 10초에 하트를 잃은 판 비율 · 3초 늦게 시작해 1.5초마다 판단하는 무작위 봇이 처음 13초에 하트를 잃은 판 비율 */
  firstLoss?: { idle: number; late: number };
  /** 연타 (0080): 잘하는 봇 판의 분당 누름 수 · 같은 자리 연속 누름 최대 (8판 중앙값) */
  presses?: { perMin: number; maxSame: number | null };
  /** 버릇 격차 (0081): 잘하는 봇의 초당 점수 ÷ 가장 잘한 버릇 봇의 초당 점수 (24판 중앙값). 1에 가까우면 버릇만으로 충분 = 전략이 얕다 */
  habitGap?: number;
  /** 버릇 봇 ★3 (0082, 기준 13): 3판부터 판별 '깬 판 중 별을 다 딴 비율'의 최댓값(버릇 봇 중 가장 높은 것)과 그 판 */
  habitStar3?: { rate: number; stage: number; bot: string };
  /** 사람 반응 속도 (0083): 잘하는 봇을 0.3초(18틱)마다 판단하게 해 10분 상한으로 — 한 판 길이(초)·상한 비율·점수(잘하는 봇 대비) */
  human?: { sec: number; capped: number; scoreRatio: number };
  /** 큰 순간 (0089, GameDef.wows): 처음 하는 사람(무작위 봇)의 첫 입력부터 첫 큰 순간까지 초(중앙값, 3분 안에 못 보면 null) · 분당 큰 순간(무작위 · 잘하는 봇) */
  wow?: { firstSec: number | null; seen: number; dumbPerMin: number; smartPerMin: number };
  /** 판별 변화 (0092, cleared 필요): 2판부터 판별 손 모양(분당 누름·누르는 길이)의 변동계수 최댓값 · 2판부터 분당 큰 순간 ÷ 1판(wows 있을 때) */
  stages?: { change: number; lateWow: number | null; n: number };
}

const median = (a: number[]) => {
  const b = [...a].sort((x, y) => x - y);
  return b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2;
};
const clamp = (x: number) => Math.max(0, Math.min(1, x));
/** 같은 시간당 점수 (0081: 느린 버릇 봇이 3분을 버티며 점수를 쌓는 것을 빼려고) */
const rate = (r: { score: number; ticks: number }) => r.score / Math.max(1, r.ticks / 60);

/** 하트(공통 칸 `hearts`, 팽이는 `lives`)를 읽는다. 없는 게임은 끝났는지(-1)만 본다 */
const life = <S>(g: GameDef<S>, s: S): number => {
  const o = s as { hearts?: unknown; lives?: unknown };
  const h = typeof o.hearts === 'number' ? o.hearts : o.lives;
  return g.over(s) ? -1 : typeof h === 'number' ? h : 0;
};
/** 손실: 하트가 줄었거나, 같은 판에서 '지킬 것'(guard, 0079)이 줄었다 */
const lost = <S>(g: GameDef<S>, s: S, h0: number, g0: number, st0: unknown): boolean =>
  life(g, s) < h0 || (!!g.guard && (s as { stage?: unknown }).stage === st0 && g.guard(s) < g0);

/**
 * 처음 하는 사람의 첫 몇 초 (0078). 무작위 봇은 첫 틱부터 누르니 '처음 10초 패배 0'이 나와도
 * 화면을 읽는 사람은 손대기 전에 질 수 있다(0077 공룡: 2초에 알 셋, 5초에 하트 -1).
 *  idle — 아무것도 안 누르고 10초 동안 하트나 지킬 것(guard)을 잃었나
 *  late — 3초 동안 안 누르다가 1.5초(90틱)마다 한 번 판단하는 무작위 봇이 처음 13초에 하트를 잃었나
 *         (지킬 것은 안 본다: 느린 사람이 불빛·체력 하나쯤 잃는 건 판을 지는 게 아니다)
 */
export function firstSeconds<S>(g: GameDef<S>, dumb: Bot<S>, seeds: number[]): { idle: number; late: number } {
  let idle = 0, late = 0;
  for (const sd of seeds) {
    const a = g.create(sd), h0 = life(g, a), g0 = g.guard ? g.guard(a) : 0, st0 = (a as { stage?: unknown }).stage;
    for (let t = 0; t < 600 && !g.over(a); t++) g.step(a, NO_INPUT);
    if (lost(g, a, h0, g0, st0)) idle++;
    const b = g.create(sd), rng = mulberry32(sd ^ 0x9e3779b9);
    let held = NO_INPUT;
    for (let t = 0; t < 780 && !g.over(b); t++) {
      const inp = t < 180 ? NO_INPUT : (t - 180) % 90 === 0 ? (held = dumb.act(b, rng)) : { ...held, tap: false, move: undefined, pick: undefined };
      g.step(b, inp);
    }
    if (life(g, b) < h0) late++;
  }
  return { idle: +(idle / seeds.length).toFixed(3), late: +(late / seeds.length).toFixed(3) };
}

/**
 * 연타 (0080). 오너가 싫어하는 '조금씩 누르는 번거로움'을 센다. 잘하는 봇 판에서
 *  perMin  — 손을 안 대다가 새로 누른 횟수(탭·꾹·포인터)를 분당으로
 *  maxSame — 같은 자리(포인터 0.1 격자·같은 방향·같은 키)를 잇달아 누른 최대 횟수.
 *            어디를 눌러도 같은 게임(GameDef.anywhere, 공룡 쿵)이나 자리 없는 입력만 쓰는 게임은 null
 */
export function pressStats<S>(g: GameDef<S>, smart: Bot<S>, seeds: number[]): { perMin: number; maxSame: number | null } {
  const per: number[] = [], same: number[] = [];
  let placed = false;
  for (const sd of seeds) {
    const st = g.create(sd), rng = mulberry32(sd ^ 0x9e3779b9);
    let held = NO_INPUT, was = false, n = 0, run = 0, best = 0, lastKey = '', t = 0;
    for (; t < 60 * 180 && !g.over(st); t++) {
      const inp = t % REACT === 0 ? (held = smart.act(st, rng)) : { ...held, tap: false, move: undefined, pick: undefined };
      const on = !!(inp.tap || inp.hold || inp.pointer || inp.move || inp.pick !== undefined);
      if (on && !was) {
        n++;
        const p = inp.pointer;
        const where = !!p || !!inp.move || inp.pick !== undefined || inp.aim !== undefined || inp.dir !== 0;
        placed ||= where;
        const key = p ? `${Math.round(p.x * 10)},${Math.round(p.y * 10)}` : `${inp.move ?? ''}${inp.pick ?? ''}${inp.dir}${inp.aim === undefined ? '' : Math.round(inp.aim * 10)}`;
        run = where && key === lastKey ? run + 1 : where ? 1 : 0;
        best = Math.max(best, run);
        lastKey = key;
      }
      was = on;
      g.step(st, inp);
    }
    per.push(n / Math.max(1, t / 3600));
    same.push(best);
  }
  return { perMin: Math.round(median(per)), maxSame: placed && !g.anywhere ? median(same) : null };
}

/**
 * 버릇 봇 판별 ★3 (0082, 기준 13: 3판부터 < 50%). 버릇 봇마다 판을 처음 깬 순간의 별을 모아
 * 3판(번호 2)부터 '깬 판 중 별을 다 딴 비율'을 판별로 낸다. 깬 판이 4판 미만인 판은 뺀다.
 */
export function habitStars<S>(g: GameDef<S>, habits: Bot<S>[], seeds: number[]): { rate: number; stage: number; bot: string } | undefined {
  if (!g.cleared || !habits.length) return undefined;
  let worst = { rate: 0, stage: 0, bot: habits[0].name };
  for (const h of habits) {
    const cl = new Map<number, number>(), full = new Map<number, number>();
    for (const sd of seeds) {
      const st = g.create(sd), rng = mulberry32(sd ^ 0x9e3779b9), seen = new Set<number>();
      let held = NO_INPUT;
      for (let t = 0; t < 60 * 180 && !g.over(st); t++) {
        const inp = t % REACT === 0 ? (held = h.act(st, rng)) : { ...held, tap: false, move: undefined, pick: undefined };
        g.step(st, inp);
        const c = g.cleared(st);
        if (c && !seen.has(c.stage)) {
          seen.add(c.stage);
          cl.set(c.stage, (cl.get(c.stage) ?? 0) + 1);
          if (c.got >= c.of && c.of >= 3) full.set(c.stage, (full.get(c.stage) ?? 0) + 1);
        }
      }
    }
    for (const [k, n] of cl) {
      const r = (full.get(k) ?? 0) / n;
      if (k >= 2 && n >= 4 && r > worst.rate) worst = { rate: +r.toFixed(2), stage: k + 1, bot: h.name };
    }
  }
  return worst;
}

/** 큰 순간 (0089). 게임이 내보내는 wows(s)가 늘어난 순간을 센다 */
export function wowStats<S>(g: GameDef<S>, dumb: Bot<S>, smart: Bot<S>, seeds: number[]): { firstSec: number | null; seen: number; dumbPerMin: number; smartPerMin: number } | undefined {
  const w = g.wows;
  if (!w) return undefined;
  const run = (bot: Bot<S>, sd: number, react: number) => {
    const st = g.create(sd), rng = mulberry32(sd ^ 0x9e3779b9);
    let held = NO_INPUT, t = 0, first = -1, firstIn = -1;
    const w0 = w(st);
    for (; t < 60 * 180 && !g.over(st); t++) {
      const inp = t % react === 0 ? (held = bot.act(st, rng)) : { ...held, tap: false, move: undefined, pick: undefined };
      if (firstIn < 0 && (inp.tap || inp.hold || inp.pointer || inp.move || inp.pick !== undefined)) firstIn = t;
      g.step(st, inp);
      if (first < 0 && w(st) > w0) first = t;
    }
    return { first: first < 0 ? -1 : (first - Math.max(0, firstIn)) / 60, perMin: (w(st) - w0) / Math.max(1 / 60, t / 3600) };
  };
  const d = seeds.map((sd) => run(dumb, sd, 1)), m = seeds.map((sd) => run(smart, sd, REACT));
  const firsts = d.filter((x) => x.first >= 0).map((x) => x.first);
  return {
    firstSec: firsts.length ? +median(firsts).toFixed(2) : null,
    seen: +(firsts.length / seeds.length).toFixed(2),
    dumbPerMin: +median(d.map((x) => x.perMin)).toFixed(1),
    smartPerMin: +median(m.map((x) => x.perMin)).toFixed(1),
  };
}

/**
 * 판마다 하는 일이 바뀌나 (0092, 한계 지표). 잘하는 봇 판을 판(cleared)별로 끊어
 * 분당 누름·한 번 누르는 길이·분당 큰 순간(wows)을 잰다. 나사 공방 "폐기 한계가 좀 보인더".
 */
export function stageProfile<S>(g: GameDef<S>, smart: Bot<S>, seeds: number[]): { change: number; lateWow: number | null; n: number } | undefined {
  if (!g.cleared) return undefined;
  const per = new Map<number, { t: number; presses: number; holdT: number; wows: number }>();
  for (const sd of seeds) {
    const st = g.create(sd), rng = mulberry32(sd ^ 0x9e3779b9), done = new Set<number>();
    let held = NO_INPUT, was = false, w0 = g.wows ? g.wows(st) : 0, cur = { t: 0, presses: 0, holdT: 0 };
    for (let t = 0; t < 60 * 180 && !g.over(st); t++) {
      const inp = t % REACT === 0 ? (held = smart.act(st, rng)) : { ...held, tap: false, move: undefined, pick: undefined };
      const on = !!(inp.tap || inp.hold || inp.pointer || inp.move);
      if (on && !was) cur.presses++;
      if (on) cur.holdT++;
      was = on;
      cur.t++;
      g.step(st, inp);
      const c = g.cleared(st);
      if (c && !done.has(c.stage)) {
        done.add(c.stage);
        const w = g.wows ? g.wows(st) : 0, p = per.get(c.stage) ?? { t: 0, presses: 0, holdT: 0, wows: 0 };
        per.set(c.stage, { t: p.t + cur.t, presses: p.presses + cur.presses, holdT: p.holdT + cur.holdT, wows: p.wows + w - w0 });
        w0 = w;
        cur = { t: 0, presses: 0, holdT: 0 };
      }
    }
  }
  const rows = [...per.entries()].sort((a, b) => a[0] - b[0]).map(([k, p]) => ({ k, perMin: p.presses / Math.max(1e-9, p.t / 3600), hold: p.holdT / Math.max(1, p.presses), wowMin: p.wows / Math.max(1e-9, p.t / 3600) }));
  const late = rows.filter((r) => r.k >= 1);
  if (late.length < 2) return undefined;
  const cv = (a: number[]) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return m > 0 ? Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) / m : 0; };
  const first = rows.find((r) => r.k === 0);
  return {
    change: +Math.max(cv(late.map((r) => r.perMin)), cv(late.map((r) => r.hold))).toFixed(2),
    lateWow: g.wows && first && first.wowMin > 0 ? +(median(late.map((r) => r.wowMin)) / first.wowMin).toFixed(2) : null,
    n: rows.length,
  };
}

/** 사람 반응 간격: 0.3초 (0083) */
export const HUMAN_REACT = 18;

export function humanPace<S>(g: GameDef<S>, smart: Bot<S>, seeds: number[], smartScore: number): { sec: number; capped: number; scoreRatio: number } {
  const cap = 60 * 600;
  const r = seeds.map((sd) => runBot(g, smart, sd, cap, HUMAN_REACT));
  return {
    sec: +(median(r.map((x) => x.ticks)) / 60).toFixed(1),
    capped: +(r.filter((x) => x.ticks >= cap).length / seeds.length).toFixed(2),
    scoreRatio: +((median(r.map((x) => x.score)) + 1) / (smartScore + 1)).toFixed(2),
  };
}

export function evaluateGame<S>(g: GameDef<S>, dumb: Bot<S>, smart: Bot<S>, n = 24, habits: Bot<S>[] = []): ArcadeReport {
  const seeds = [...Array(n).keys()].map((i) => 1000 + i * 7919);
  const d = seeds.map((sd) => runBot(g, dumb, sd));
  const m = seeds.map((sd) => runBot(g, smart, sd, 60 * 180, REACT));
  const cap = 60 * 180;
  const dumbScore = median(d.map((r) => r.score)), smartScore = median(m.map((r) => r.score));
  const dumbSec = median(d.map((r) => r.ticks)) / 60, smartSec = median(m.map((r) => r.ticks)) / 60;
  const capped = m.filter((r) => r.ticks >= cap).length / n;
  const skillGap = (smartScore + 1) / (dumbScore + 1);
  // 펼쳐짐: 잘하는 봇 판을 다시 돌려 30·60·120초(또는 끝난 시점)의 reveals를 잰다
  let reveals: [number, number, number] | undefined, dumbReveals: [number, number] | undefined;
  if (g.reveals) {
    const at = [0, 0, 0];
    for (const sd of seeds.slice(0, 8)) {
      const st = g.create(sd), rng = mulberry32(sd ^ 0x9e3779b9);
      let held = NO_INPUT, t = 0;
      for (; t < 60 * 120 && !g.over(st); t++) {
        const inp = t % REACT === 0 ? (held = smart.act(st, rng)) : { ...held, tap: false, move: undefined, pick: undefined };
        g.step(st, inp);
        if (t === 60 * 30 - 1) at[0] += g.reveals(st);
        if (t === 60 * 60 - 1) at[1] += g.reveals(st);
      }
      // 일찍 끝난 판은 끝난 시점 값으로 센다 (0023: 안 그러면 60초 값이 30초 값보다 작게 나왔다)
      if (t < 60 * 30) at[0] += g.reveals(st);
      if (t < 60 * 60) at[1] += g.reveals(st);
      at[2] += g.reveals(st);
    }
    reveals = at.map((x) => +(x / 8).toFixed(1)) as [number, number, number];
    // 처음 하는 사람 기준: 못하는 봇은 2분 안에 무엇을 보나 (0025, 등불 마을은 못하는 봇이 첫 밤에 끝남)
    const du = [0, 0];
    for (const sd of seeds.slice(0, 8)) {
      const st = g.create(sd), rng = mulberry32(sd ^ 0x9e3779b9);
      let t = 0;
      for (; t < 60 * 120 && !g.over(st); t++) {
        g.step(st, dumb.act(st, rng));
        if (t === 60 * 30 - 1) du[0] += g.reveals(st);
      }
      if (t < 60 * 30) du[0] += g.reveals(st);
      du[1] += g.reveals(st);
    }
    dumbReveals = du.map((x) => +(x / 8).toFixed(1)) as [number, number];
  }
  const parts: ArcadeReport['parts'] = {
    skill: clamp(Math.log(skillGap) / Math.log(8)), // 8배 이상이면 만점
    onboarding: clamp((dumbSec - 3) / 9), // 3초 0점 · 12초 만점
    session: clamp(smartSec / 45) * (1 - capped), // 45초 이상 만점, 3분 넘게 버티는 판 비율만큼 감점
    simplicity: clamp(1 - (g.rules.length - 2) * 0.15) * (g.controls === 'leftright' ? 0.92 : 1),
  };
  // 2분 안에 새로 등장한 것 4가지면 만점 (오너 피드백 0022). reveals 없는 옛 게임은 이 항목 없이 잰다
  if (reveals) parts.unfold = clamp(reveals[2] / 4);
  const terms = [[parts.skill, 2], [parts.onboarding, 1], [parts.session, 1], [parts.simplicity, 1], ...(parts.unfold === undefined ? [] : [[parts.unfold, 2]])] as [number, number][];
  const fun = Math.exp(terms.reduce((a, [v, w]) => a + w * Math.log(0.05 + v), 0) / terms.reduce((a, [, w]) => a + w, 0)) / 1.05;
  return {
    id: g.id, name: g.name, n,
    dumb: { score: dumbScore, sec: +dumbSec.toFixed(1) },
    smart: { score: smartScore, sec: +smartSec.toFixed(1), capped },
    skillGap: +skillGap.toFixed(2),
    reveals,
    dumbReveals,
    parts: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, +v.toFixed(3)])) as ArcadeReport['parts'],
    fun: +fun.toFixed(3),
    firstLoss: firstSeconds(g, dumb, seeds),
    presses: pressStats(g, smart, seeds.slice(0, 8)),
    habitStar3: habitStars(g, habits, seeds),
    human: humanPace(g, smart, seeds, smartScore),
    wow: wowStats(g, dumb, smart, seeds),
    stages: stageProfile(g, smart, seeds.slice(0, 8)),
    habitGap: habits.length ? +(median(m.map(rate)) / Math.max(1e-9, ...habits.map((h) => median(seeds.map((sd) => rate(runBot(g, h, sd, 60 * 180, REACT))))))).toFixed(2) : undefined,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out: Record<string, ArcadeReport> = {};
  for (const e of GAMES) {
    const t0 = performance.now();
    const r = evaluateGame(e.game as GameDef<unknown>, e.dumb as Bot<unknown>, e.smart as Bot<unknown>, 24, (e.habits ?? []) as Bot<unknown>[]);
    out[r.id] = r;
    console.log(`${r.name.padEnd(8)} 재미 ${r.fun.toFixed(3)}${r.reveals ? ` · 펼쳐짐 ${r.reveals.join('/')} (못함 ${r.dumbReveals?.join('/')})` : ''} · 숙련격차 ${r.skillGap}× · 못함 ${r.dumb.sec}s/${r.dumb.score}점 · 잘함 ${r.smart.sec}s/${r.smart.score}점 (3분 버팀 ${Math.round(r.smart.capped * 100)}%) ${r.habitGap ? `· 버릇 격차 ${r.habitGap}× ` : ''}${r.wow ? `· 첫 와 ${r.wow.firstSec ?? '—'}s(${Math.round(r.wow.seen * 100)}%)·분당 ${r.wow.dumbPerMin}/${r.wow.smartPerMin} ` : ''}${r.stages ? `· 판별 바뀜 ${r.stages.change} 큰 순간 이어짐 ${r.stages.lateWow ?? '—'} ` : ''}${r.human ? `· 사람 속도 ${r.human.sec}s·점수 ${Math.round(r.human.scoreRatio * 100)}% ` : ''}${r.habitStar3 ? `· 버릇 ★3 최고 ${Math.round(r.habitStar3.rate * 100)}%(${r.habitStar3.stage}판) ` : ''}· 연타 분당 ${r.presses?.perMin}번 · 같은 자리 최대 ${r.presses?.maxSame ?? '—'} · 첫 몇 초 하트·지킬 것 손실 손 안 댐 ${Math.round((r.firstLoss?.idle ?? 0) * 100)}%/늦은 사람 ${Math.round((r.firstLoss?.late ?? 0) * 100)}% · ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  }
  writeFileSync(join(import.meta.dirname, 'reports', 'eval.json'), JSON.stringify(out, null, 1) + '\n');
}
