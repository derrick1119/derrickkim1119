/**
 * FUN QA 계기판 — 유저군별 재미 지표를 봇으로 잰다. 기준·정의는 FUN.md(v1). 결과는 reports/funqa.json.
 *   npx tsx studio/balloonpop/funqa.ts [판 수=40]
 * 유저군: 처음 = 아무 데나 톡(random) · 캐주얼 = 사람형(human, 풍선 위만 + 0.3~0.8초 반응) · 숙련 = 내다보는 봇(smart)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mulberry32, type Rng } from '../../engine/rng.ts';
import { A, balloonpop as g, balloonpopRandom, balloonpopSmart, bxAt, byAt, density, IRON, STAGE_COUNT, type PopState } from './game.ts';
import type { Bot, Input } from './core.ts';

const NO: Input = { tap: false, dir: 0, pointer: null };
const humanAt = new WeakMap<object, number>();
/** 사람형 캐주얼: 연쇄가 다 끝나고 0.3~0.8초 뒤, 화면 안에 보이는 보통 풍선 하나를 무작위로 톡. 도움 반짝이 뜨면 그것부터 */
export const humanCasual: Bot<PopState> = {
  name: '사람형 캐주얼',
  act(s, rng) {
    if (s.phase !== 'play' || s.down || s.taps <= 0) return humanAt.delete(s), NO;
    for (let i = 0; i < s.alive.length; i++) if (s.alive[i] === 1 && s.popT[i] >= 0) return humanAt.delete(s), NO;
    if (!humanAt.has(s)) humanAt.set(s, s.t + 18 + Math.floor(rng() * 31));
    if (s.t < humanAt.get(s)!) return NO;
    // 도움 반짝(두 번 실패한 판)이 있으면 사람처럼 그 풍선을 '지금!'일 때 누른다
    if (s.help >= 0 && s.alive[s.help] === 1) {
      if (s.st + 1 < s.helpAt) return NO;
      humanAt.delete(s);
      const hb = s.L.bs[s.help];
      return { tap: false, dir: 0, pointer: { x: bxAt(hb, s.st + 1), y: byAt(hb, s.st + 1) / A } };
    }
    humanAt.delete(s);
    const al: number[] = [];
    for (let i = 0; i < s.alive.length; i++) {
      const b = s.L.bs[i], x = bxAt(b, s.st + 1);
      if (s.alive[i] === 1 && b.k !== IRON && x > 0.03 && x < 0.97) al.push(i);
    }
    if (!al.length) return NO;
    const b = s.L.bs[al[Math.floor(rng() * al.length)]];
    return { tap: false, dir: 0, pointer: { x: bxAt(b, s.st + 1), y: byAt(b, s.st + 1) / A } };
  },
};

export interface GroupStat {
  /** 판별 도착 런 수 (10 미만이면 그 판 수치는 표본 부족) */
  n: number[];
  /** 판별: 도착한 런 중 첫 시도에 깬 비율 */
  firstTry: number[];
  /** 판별 평균 별(깼을 때) */
  stars: number[];
  /** 판별 별 3 비율(깬 시도 중) */
  star3: number[];
  /** 판별 첫 톡 연쇄(팡 수) 중앙값 */
  firstChain: number[];
  /** 판별 시도 한 번 평균 초 (봇 시계 — 사람 시간과 비교 불가, FUN v1.1) */
  sec: number[];
  /** 판별: 도착한 런 중 세 번째 시도까지 깬 비율 */
  within3: number[];
  /** 막힌 런(한 판 STUCK번 실패) 중 그 판 비율 */
  stuck: number[];
  /** 막힌 런 ÷ 전체 런 */
  stuckRate: number;
  /** 게임 시작 → 첫 팡(초), 런 평균 */
  firstPopSec: number;
  /** 시도당 별 = 모은 별 ÷ 판 시도 수 (실패한 시도는 0별) */
  starsPerTry: number;
  /** 판당 세 번째 시도까지만 센 시도당 별 — 숙련 격차의 바탕 (FUN v1.3) */
  starsPerTry3: number;
  /** 8판을 모두 세 번째 시도 안에 깬 런 비율 (FUN v1.3) */
  finish3: number;
  /** 판별: 첫 시도에 ★2 이상으로 깬 비율 (숙련 판 검증, FUN v1.3) */
  firstStar2: number[];
  /** 판별: 도움 없는 시도·도움 시도의 클리어율과 도움 시도 수 (FUN v1.3) */
  helpBefore: number[];
  helpAfter: number[];
  helpN: number[];
  finish: number;
  reach: number;
  score: number;
  /** 한 런 평균 플레이 시간(분) */
  minutes: number;
  /** 1판 첫 톡 연쇄 ≥ 3 비율 */
  chain3: number;
}

/** 한 판을 이만큼 실패하면 그 런은 '막힘'으로 끝낸다 (하트가 없어서, FUN v1.1) */
export const STUCK = 10;
const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0);

export function measure(bot: Bot<PopState>, runs: number): GroupStat {
  const K = STAGE_COUNT, z = () => new Array(K).fill(0);
  const tried = z(), first = z(), starSum = z(), star3 = z(), cleared = z(), tSum = z(), tN = z(), dead = z(), w3 = z(), f2 = z(), hbT = z(), hbC = z(), haT = z(), haC = z();
  let s3 = 0, t3 = 0, fin3 = 0;
  const chains: number[][] = Array.from({ length: K }, () => []);
  let fin = 0, reach = 0, score = 0, ticks = 0, c3 = 0, c3n = 0, stuckRuns = 0, fpSum = 0, fpN = 0;
  for (let r = 0; r < runs; r++) {
    const seed = 1000 + r * 7919, s = g.create(seed), rng: Rng = mulberry32(seed ^ 0x9e3779b9);
    let stage = -1, attempt = 0, t = 0, wasResult = false, t0 = 0, base = -1, stuck = false, firstPop = -1, all3 = true;
    const chainDone = () => {
      if (base < 0) return;
      const c = s.popped - base;
      chains[stage].push(c);
      if (stage === 0 && attempt === 0) (c3n++, c >= 3 && c3++);
      base = -1;
    };
    while (!g.over(s) && t < 60 * 60 * 10) {
      if (s.stage !== stage) (stage = s.stage), (attempt = 0), tried[stage]++;
      const used = s.used, popped = s.popped;
      g.step(s, bot.act(s, rng));
      t++;
      if (firstPop < 0 && s.popped > 0) firstPop = t;
      if (used === 0 && s.used === 1) base = popped;
      else if (used === 1 && s.used === 2) chainDone();
      const isResult = s.phase === 'result';
      if (isResult && !wasResult) {
        chainDone();
        if (s.ok) (cleared[stage]++, (starSum[stage] += s.got), s.got === 3 && star3[stage]++, attempt === 0 && first[stage]++, attempt < 3 && w3[stage]++, attempt === 0 && s.got >= 2 && f2[stage]++);
        if (attempt < 3) (t3++, s.ok && (s3 += s.got));
        else if (attempt === 3) all3 = false;
        if (s.helped) (haT[stage]++, s.ok && haC[stage]++);
        else (hbT[stage]++, s.ok && hbC[stage]++);
        tSum[stage] += t - t0;
        tN[stage]++;
        t0 = t;
        attempt++;
        if (!s.ok && attempt >= STUCK) stuck = true;
      }
      wasResult = isResult;
      if (stuck) break;
    }
    if (firstPop >= 0) (fpSum += firstPop), fpN++;
    if (s.won) (fin++, all3 && fin3++);
    else if (stuck) stuckRuns++, dead[s.stage]++;
    reach += s.stage + 1;
    score += s.pts;
    ticks += t;
  }
  const r2 = (x: number) => Math.round(x * 100) / 100, per = (a: number[], b: number[], k = 1) => a.map((x, i) => (b[i] ? r2((x * k) / b[i]) : 0));
  return {
    n: tried,
    firstTry: per(first, tried),
    stars: per(starSum, cleared),
    star3: per(star3, cleared),
    firstChain: chains.map(median),
    sec: per(tSum, tN, 1 / 60),
    within3: per(w3, tried),
    stuck: dead.map((x) => (stuckRuns ? r2(x / stuckRuns) : 0)),
    stuckRate: r2(stuckRuns / runs),
    firstPopSec: fpN ? r2(fpSum / fpN / 60) : 0,
    starsPerTry: r2(starSum.reduce((a, b) => a + b, 0) / Math.max(1, tN.reduce((a, b) => a + b, 0))),
    starsPerTry3: r2(s3 / Math.max(1, t3)),
    finish3: r2(fin3 / runs),
    firstStar2: per(f2, tried),
    helpBefore: per(hbC, hbT),
    helpAfter: per(haC, haT),
    helpN: haT,
    finish: r2(fin / runs),
    reach: r2(reach / runs),
    score: Math.round(score / runs),
    minutes: r2(ticks / runs / 3600),
    chain3: c3n ? r2(c3 / c3n) : 0,
  };
}

/** 판별 밀도: 풍선 수 평균·최대, 겹침 지수 평균 (시드 40개) */
export function densityTable(seeds = 40) {
  return Array.from({ length: STAGE_COUNT }, (_, k) => {
    const ds = Array.from({ length: seeds }, (_, r) => density(1000 + r * 7919, k));
    const avg = (f: (d: { n: number; overlap: number; overlapX: number }) => number) => Math.round((ds.reduce((a, d) => a + f(d), 0) / seeds) * 100) / 100;
    return { n: avg((d) => d.n), nMax: Math.max(...ds.map((d) => d.n)), overlap: avg((d) => d.overlap), overlapX: avg((d) => d.overlapX) };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const runs = Number(process.argv[2] ?? 40), t0 = Date.now();
  const novice = measure(balloonpopRandom, runs), casual = measure(humanCasual, runs), expert = measure(balloonpopSmart, runs);
  const out = {
    runs,
    novice,
    casual,
    expert,
    /** 숙련 격차: 판당 3회로 자른 시도당 별의 숙련 ÷ 사람형 캐주얼 (FUN v1.3 — 막힘 10연패가 격차를 부풀리지 않게) */
    skillGap: Math.round((expert.starsPerTry3 / Math.max(0.01, casual.starsPerTry3)) * 100) / 100,
    /** 참고: 예전 정의(점수비) */
    scoreGap: Math.round((expert.score / Math.max(1, casual.score)) * 100) / 100,
    density: densityTable(),
    sec: Math.round((Date.now() - t0) / 100) / 10,
  };
  mkdirSync(join(import.meta.dirname, 'reports'), { recursive: true });
  writeFileSync(join(import.meta.dirname, 'reports/funqa.json'), JSON.stringify(out, null, 2) + '\n');
  const row = (x: GroupStat) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, Array.isArray(v) ? v.join(' ') : v]));
  console.table({ 처음: row(novice), 캐주얼: row(casual), 숙련: row(expert) });
  console.table(out.density);
  console.log(`숙련 격차 ${out.skillGap}× · ${out.sec}s`);
}
