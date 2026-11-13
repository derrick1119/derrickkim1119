/**
 * FUN QA 계기판 — 유저군 봇으로 판별 재미 지표를 잰다. 기준과 이유는 FUN.md. 결과는 reports/funqa.json (+ 표를 콘솔에).
 *   npx tsx studio/duckbath/funqa.ts [런 수=20] [--area]
 *   npx tsx studio/duckbath/funqa.ts --d1[=1-3,2-9] [--full]   → D1 정답 다양성만 (reports/funqa-d1.json, D008). --full = 거친 격자 없이 전수(운영 근사 검증용)
 * 유저군: 숙련 = 물결 박사(두 수 앞 탐색) · 캐주얼 = 상식으로 오리 뒤를 톡(내다보기 없음, D001) · 처음 = 아무 데나 찰박(무작위)
 *   · 배우는 처음 = 다시 할수록 캐주얼식으로 칠 확률 0.25→0.5→0.75 (FUN v1 N2·C5, D003).
 * D001: 하트가 없어져 실패하면 그 판만 다시 한다. 사람은 무한히 다시 하지 않으니, 봇은 한 판에서 RETRY번 다시 하고도 못 깨면 그만둔다
 *   (배우는 처음 봇만 RETRY_LEARN번 — 다시 횟수 분포(C5)를 보려고).
 * D003 추가: 판별 ★톡·★황금(E6, 황금 정책 0·50·75%) · 다시 횟수 중앙/p90(C5) · 실패 집중도(W1) · 여유 톡 곡선(W2) · --area 정답 면적(C4, par 1 판).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mulberry32 } from '../../engine/rng.ts';
import type { Bot, Input } from './core.ts';
import { STAGES, crisisShown, duckbath as g, duckbathCasual, duckbathRandom, duckbathSmart, failText, hintPoint, makeCasual, makePreviewer, startStage, type DuckState } from './game.ts';
/** D007: 판 번호(1부터) → 판 id. 판이 욕실 순서로 다시 놓여 표는 id로 읽는다 */
const ID = (n: number) => STAGES[n - 1]?.id ?? String(n);

/** CONTENT v0.3 §1 판별 설계 '사람 초' (사람초 합 비교용, D009) */
const DESIGN_SEC: Record<string, number> = {
  '1-1': 5, '1-2': 15, '1-3': 25, '1-4': 35, '1-5': 35, '1-6': 45, '1-7': 30, '1-8': 50, '1-9': 55, '1-10': 80,
  '2-1': 30, '2-2': 50, '2-3': 35, '2-4': 45, '2-5': 45, '2-6': 60, '2-7': 45, '2-8': 65, '2-9': 65, '2-10': 90,
  '3-1': 40, '3-2': 45, '3-3': 45, '3-4': 50, '3-5': 50, '3-6': 70, '3-7': 55, '3-8': 75, '3-9': 85, '3-10': 90,
};

/** 한 판에서 다시 하기 허용 횟수 (첫 시도 + 3번) */
export const RETRY = 3;
/** 배우는 처음 봇의 다시 한도 (C5 p90을 재려고 넉넉히) */
export const RETRY_LEARN = 30;

export interface StageLog { stage: number; ok: boolean; sec: number; taps: number; stars: number; why: string; tapStar: boolean; goldStar: boolean; sucks: number; chomps: number; failKind?: string; /** D010: 황금 위기가 화면에 보인 가장 긴 연속 틱 (0 = 안 보임) */ crisis: number }
export interface Run { stages: StageLog[]; score: number; sec: number; reached: number; won: boolean; gaveUp: number; firstTapNest: number }

/**
 * 배우는 처음 봇 (FUN N2): 판 시도마다 캐주얼식으로 칠 확률 0.25 → 0.5 → 0.75, 아니면 무작위.
 * follow > 0 (D006, FUN v1.4 H1): 👆 힌트가 뜬 시도의 첫 톡은 그 확률로 손가락 자리를 친다(사람이 힌트를 따르는 것처럼).
 */
export function makeLearner(follow = 0): Bot<DuckState> {
  const mem = new WeakMap<object, { key: string; cas: boolean }>(), fol = new WeakMap<object, { key: string; on: boolean }>();
  return {
    name: follow ? `배우는 처음(👆 따름 ${follow})` : '배우는 처음',
    act(s, rng): Input {
      if (follow && s.phase === 'play' && s.used === 0 && s.stageTries >= 2) {
        const fk = `${s.stage}:${s.tries}`;
        let f = fol.get(s);
        if (!f || f.key !== fk) fol.set(s, (f = { key: fk, on: rng() < follow }));
        const hp = f.on ? hintPoint(s) : null;
        if (hp) return s.down || s.t - s.lastTap < 40 ? { tap: false, dir: 0, pointer: null } : { tap: false, dir: 0, pointer: hp };
      }
      const key = `${s.stage}:${s.tries}:${s.used}`;
      let m = mem.get(s);
      if (!m || m.key !== key) mem.set(s, (m = { key, cas: rng() < [0.25, 0.5, 0.75][Math.min(2, s.stageTries)] }));
      return m.cas ? duckbathCasual.act(s, rng) : duckbathRandom.act(s, rng);
    },
  };
}
/** 판정 배우는 봇은 👆를 0.75로 따른다 (FUN v1.4: C5·W1은 힌트를 따르는 봇으로 판정, 힌트 없는 값은 보고만) */
export const FOLLOW = 0.75;

/** 봇 한 판(8판을 마치거나 한 판에서 retry번 넘게 실패할 때까지). 판이 끝날 때마다 기록 */
export function play(bot: Bot<DuckState>, seed: number, maxSec = 900, retry = RETRY): Run {
  const s = g.create(seed), logs: StageLog[] = [];
  // D010 (🧪 D009·D010 차단): 판을 처음 시작할 때마다 봇 난수를 (시드, 판 id)로 다시 — 앞 판을 고쳐도 뒤 판의 봇 손이 그대로(다시 하기는 같은 줄을 이어 쓴다)
  const stageRng = (i: number) => { let h = 0x811c9dc5; for (const c of STAGES[i].id) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193); return mulberry32((seed ^ h ^ 0x9e3779b9) >>> 0); };
  let rng = stageRng(0), rngStage = 0;
  let phase = s.phase, t0 = 0, gaveUp = 0, tap1 = -1, firstTapNest = -1, cr = 0, crMax = 0;
  while (!g.over(s) && s.t < maxSec * 60) {
    if (s.stage !== rngStage) (rng = stageRng(s.stage)), (rngStage = s.stage);
    g.step(s, bot.act(s, rng));
    cr = crisisShown(s) ? cr + 1 : 0;
    crMax = Math.max(crMax, cr);
    // 첫 판 첫 톡 3초 뒤 둥지에 든 오리 수 (FUN N3 · M1 허들 1)
    if (tap1 < 0 && s.used > 0) tap1 = s.t;
    if (tap1 >= 0 && firstTapNest < 0 && s.t - tap1 >= 180) firstTapNest = s.objs.filter((o) => o.k <= 1 && o.st >= 0).length;
    if (phase === 'play' && s.phase === 'result') {
      logs.push({ stage: s.stage + 1, ok: s.ok, sec: (s.t - t0) / 60, taps: s.used, stars: s.ok ? s.got : 0, why: s.why, tapStar: s.ok && s.starOk[1], goldStar: s.ok && s.starOk[2], sucks: s.sucks, chomps: s.chomps, failKind: s.ok ? undefined : failText(s).kind, crisis: crMax });
      crMax = cr = 0;
      if (!s.ok && s.stageTries > retry) {
        gaveUp = s.stage + 1;
        break;
      }
    }
    if (phase === 'result' && s.phase === 'play') t0 = s.t;
    phase = s.phase;
  }
  return { stages: logs, score: g.score(s), sec: s.t / 60, reached: Math.min(STAGES.length, Math.max(1, ...logs.filter((l) => l.ok).map((l) => l.stage + 1))), won: s.won, gaveUp, firstTapNest: Math.max(0, firstTapNest) };
}

const med = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : NaN);
const pct = (xs: number[], p: number) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))] : NaN);
const r2 = (x: number) => Math.round(x * 100) / 100;
const rate = (xs: boolean[]) => (xs.length ? r2(xs.filter(Boolean).length / xs.length) : null);

function group(bot: Bot<DuckState>, n: number, retry: number) {
  const runs = Array.from({ length: n }, (_, k) => play(bot, 1000 + k * 7, 900, retry));
  const per = STAGES.map((d, i) => {
    const byRun = runs.map((r) => r.stages.filter((l) => l.stage === i + 1)).filter((L) => L.length);
    const L = byRun.flat(), oks = L.filter((l) => l.ok), cleared = byRun.filter((B) => B.some((l) => l.ok));
    const retries = cleared.map((B) => B.findIndex((l) => l.ok));
    return {
      stage: i + 1, tried: byRun.length, cleared: cleared.length,
      clearRate: byRun.length ? r2(cleared.length / byRun.length) : null, // 다시 하기 retry번 안에
      firstTry: byRun.length ? r2(byRun.filter((B) => B[0].ok).length / byRun.length) : null,
      retryMed: med(retries), retryP90: pct(retries, 0.9), // C5
      medSec: r2(med(oks.map((l) => l.sec))), humanSec: r2(med(oks.map((l) => l.sec + 3 * l.taps))), medTaps: med(oks.map((l) => l.taps)),
      // FUN v1.9 d: 이산 중앙값 옆에 평균
      tapsUp: rate(oks.map((l) => l.taps > med(oks.map((x) => x.taps)))), // FUN v1.10 g: 중앙보다 많이 쓴 몫 (≥ .35면 T* = 중앙 + 1)
      humanMean: r2(oks.reduce((a, l) => a + l.sec + 3 * l.taps, 0) / Math.max(1, oks.length)), tapsMean: r2(oks.reduce((a, l) => a + l.taps, 0) / Math.max(1, oks.length)),
      // D010 (🧪 D009 4): 황금 위기 표시 — 시도 중 보인 비율 · 보인 것 중 30틱 미만 비율
      crisisRate: rate(L.map((l) => l.crisis > 0)), crisisShort: rate(L.filter((l) => l.crisis > 0).map((l) => l.crisis < 30)),
      stars: r2(oks.reduce((a, l) => a + l.stars, 0) / Math.max(1, oks.length)),
      tapStar: rate(oks.map((l) => l.tapStar)), goldStar: rate(oks.map((l) => l.goldStar)), // E6 (클리어한 시도 중)
      try3: rate(byRun.filter((B) => B.length > 2).map((B) => B[2].ok)), // H1: 세 번째 시도(👆가 뜨는 시도) 클리어율
      try3n: byRun.filter((B) => B.length > 2).length,
      fails: L.filter((l) => !l.ok).length, pen: r2(L.reduce((a, l) => a + l.sucks + l.chomps, 0) / Math.max(1, L.length)),
      slack: d.taps - d.par, slackRatio: r2(d.taps / d.par), // W2
    };
  });
  const fails = per.map((p) => p.fails), totalFails = fails.reduce((a, b) => a + b, 0);
  const worst = fails.indexOf(Math.max(...fails));
  // N4 (FUN v1.4): 실패 카드 제목이 맞는 비율 — 주범 제목이면 주범 몫 ≥ 25% 또는 ≥ 2톡, '톡 바닥'이면 그 밖
  const fl = runs.flatMap((r) => r.stages.filter((l) => !l.ok)), big = (l: StageLog) => l.sucks + l.chomps >= 2 || (l.taps > 0 && (l.sucks + l.chomps) / l.taps >= 0.25);
  const N4 = fl.length ? r2(fl.filter((l) => (l.failKind !== 'taps') === big(l)).length / fl.length) : null;
  // D009 (📋 D008 ③): 사람초 합 — 클리어한 시도만이 아니라 모든 시도의 (봇 초 + 3초 × 톡), 런마다 더해 중앙값. 욕실별·설계(CONTENT v0.3 §1) 대비
  const human = (l: StageLog) => l.sec + 3 * l.taps, world = (l: StageLog) => STAGES[l.stage - 1].id.split('-')[0];
  const allSec = med(runs.map((r) => r.stages.reduce((a, l) => a + human(l), 0)));
  const worldSec = ['1', '2', '3'].map((w) => r2(med(runs.map((r) => r.stages.filter((l) => world(l) === w).reduce((a, l) => a + human(l), 0)))));
  return {
    allSec: r2(allSec), worldSec,
    N4, runs: n, retry, medScore: med(runs.map((r) => r.score)), medSec: r2(med(runs.map((r) => r.sec))), winRate: r2(runs.filter((r) => r.won).length / n),
    medReached: med(runs.map((r) => r.reached)), firstTapNest: med(runs.map((r) => r.firstTapNest)),
    failWhy: Object.entries(runs.flatMap((r) => r.stages.filter((l) => !l.ok)).reduce<Record<string, number>>((a, l) => ((a[l.why] = (a[l.why] ?? 0) + 1), a), {})),
    W1: { stage: totalFails ? worst + 1 : 0, share: totalFails ? r2(fails[worst] / totalFails) : 0 }, // 실패 집중도
    stages: per,
  };
}

export function measure(n = 20) {
  const out: Record<string, unknown> = {
    숙련: group(duckbathSmart, n, RETRY), 캐주얼: group(duckbathCasual, n, RETRY), 처음: group(duckbathRandom, n, RETRY), 배우는처음: group(makeLearner(FOLLOW), n, RETRY_LEARN),
    // 옛 자(👆 안 따름) — 자 교체 규칙(FUN v1.4)으로 같이 낸다, H1의 비교군
    배우는처음_힌트없음: group(makeLearner(0), n, RETRY_LEARN),
  };
  // E6 황금 정책 범위: 캐주얼이 황금 오리를 맨 나중에 미는 확률 0 · 0.5 · 0.75 → 판별 ★황금
  // FUN v1.3: 판정은 황금 정책 50%(= 기본 캐주얼 봇). 0%·75%는 보고만
  out['E6황금'] = Object.fromEntries([0, 0.75].map((gl) => [String(gl), group(makeCasual(gl), n, RETRY).stages.map((p) => p.goldStar)]));
  (out['E6황금'] as Record<string, unknown>)['0.5(판정)'] = (out['캐주얼'] as ReturnType<typeof group>).stages.map((p) => p.goldStar);
  // P1 (D007, M2): 미리 보기 봇 k=3·10 — 판별 첫 시도·★톡 (숙련 봇과 가까울수록 '미리 보기로 다 풀린다')
  out['미리보기3'] = group(makePreviewer(3), n, RETRY);
  out['미리보기10'] = group(makePreviewer(10), n, RETRY);
  // H1 (FUN v1.4): 판별 세 번째 시도 클리어율 — 👆 따름 − 안 따름 ≤ 0.35, 따름 < 0.85
  {
    const a = (out['배우는처음'] as ReturnType<typeof group>).stages, b = (out['배우는처음_힌트없음'] as ReturnType<typeof group>).stages;
    out['H1'] = a.map((p, i) => ({ stage: i + 1, follow: p.try3, none: b[i].try3, n: [p.try3n, b[i].try3n], gain: p.try3 !== null && b[i].try3 !== null ? r2(p.try3 - b[i].try3) : null }));
  }
  // W2 (D003): par가 사람 기준이 됐으니 여유는 '톡 ÷ 숙련 봇 톡 수'로 잰다 (판 사이 꺾임이 벽)
  out['W2'] = STAGES.map((d, i) => r2(d.taps / Math.max(1, (out['숙련'] as ReturnType<typeof group>).stages[i].medTaps)));
  const sk = out['숙련'] as { medScore: number }, cs = out['캐주얼'] as { medScore: number }, nv = out['처음'] as { medScore: number };
  out['숙련격차'] = r2(sk.medScore / Math.max(1, cs.medScore));
  out['숙련격차_처음'] = r2(sk.medScore / Math.max(1, nv.medScore));
  return out;
}

/**
 * C4 정답 면적 (FUN v1.1, par 1 판): 물 위 20×25 격자 × 시드 3에서 한 톡으로 다 넣는 자리 비율 · 한 톡에 ★3까지.
 * par ≥ 2 판의 정의(첫 수 뒤 숙련 봇이 par 안에)는 미리 보기 봇과 함께 M2에서.
 */
export function area() {
  const H = 1.2, NO: Input = { tap: false, dir: 0, pointer: null };
  return STAGES.map((d, i) => {
    if (d.par !== 1) return { stage: i + 1, par: d.par, oneTap: null, oneTap3: null };
    let tot = 0, ok = 0, ok3 = 0;
    for (const seed of [1000, 1007, 1014])
      for (let gx = 0; gx < 20; gx++)
        for (let gy = 0; gy < 25; gy++) {
          const x = (gx + 0.5) / 20, y = ((gy + 0.5) / 25) * H, s = g.create(seed);
          startStage(s, i);
          if (s.L.islands.some((c) => Math.hypot(x - c.x, y - c.y) < c.r)) continue;
          g.step(s, { tap: false, dir: 0, pointer: toPointer(x, y) });
          for (let k = 0; k < 700 && s.phase === 'play'; k++) g.step(s, NO);
          // 한 톡만 쓰고 끝까지 본다: 다음 톡을 치지 않으니 '톡을 다 썼어요' 전까지 물결이 다 퍼진다
          tot++;
          if (s.phase === 'result' && s.ok && s.used === 1) (ok++, s.starOk[2] && ok3++);
        }
    return { stage: i + 1, par: d.par, oneTap: r2((ok / tot) * 100), oneTap3: r2((ok3 / tot) * 100) };
  });
}

/** 물 좌표(x 0~1, y 0~1.2) → 화면 포인터 (area·diversity 공통, 화면 사다리꼴 원근) */
function toPointer(x: number, y: number) {
  const A = g.aspect!, WY0 = 0.36, KY = 0.66, SB = 0.74, SF = 0.88, H = 1.2;
  return { x: 0.5 + (x - 0.5) * (SB + (SF - SB) * (y / H)), y: (WY0 + y * KY) / A };
}

/**
 * D1 정답 다양성 (FUN v1.6, D008): 판 시작 프레임에 첫 톡 → par 1 판은 그 톡만으로, par ≥ 2 판은 숙련 봇이 이어 친다.
 * 해 칸 = 3★ + 쓴 톡 ≤ T*(같은 시드 새 판에서 숙련 봇이 쓴 톡), 시드 3개 중 2개 이상.
 * 무리 = 해 칸끼리 거리 < 0.15 단일 연결, 3칸 이상만. 무리 하나가 물의 25% 이상이면 2로 센다. 옛 자 = 'T* 대신 톡 ≤ par'(= 3★만).
 * 운영(FUN v1.6): 거친 격자 10×12 × 시드 1에서 3★ 칸을 찾고 → 그 0.1 안쪽의 20×25 칸만 시드 3으로 정밀. 쏙·꿀꺽·황금 손실·톡 초과면 그 자리에서 자른다.
 * 판정 값(해 칸)은 게임의 결과(별·쓴 톡)로만 정하고, 게임 코드의 문턱·후보 함수는 쓰지 않는다(측정 원칙). 숙련 봇은 정의대로 '이어 치는 손'으로만 쓴다.
 * D008 🧪 고침: 칸은 **판 데이터 좌표**로 두고, 시드가 판을 좌우로 뒤집으면(jit.flip) 그 시드에서는 x → 1 − x 자리를 친다(전에는 화면 칸을 그대로 쳐서
 * 뒤집힌 시드끼리 다른 자리를 '같은 칸'으로 셌다) · 섬은 판 데이터로 거른다 · 연결은 '< 0.15'를 부동소수 오차 없이(가로 3칸 = 정확히 0.15는 끊김)
 * · 정밀 칸이 물의 절반 이상이면 근사 대신 전수.
 */
/** 판 데이터가 좌우 대칭인가(색·부두까지) — FUN v1.8 D1 ③: 대칭 판에서는 서로 거울인 무리를 하나로 센다 */
function symmetric(d: (typeof STAGES)[number]) {
  const same = (a: number[][], f: (v: number[]) => number[]) => a.every((v) => a.some((q) => q.length === v.length && f(v).every((x, k) => Math.abs(x - q[k]) < 1e-6)));
  const mx = (v: number[]) => [1 - v[0], ...v.slice(1)];
  return same(d.ducks, mx) && same([d.gold], mx) && same(d.boat ? [d.boat] : [], mx) && same(d.shark ? [d.shark] : [], mx) && same(d.nests, mx) && same(d.islands ?? [], mx) && same(d.drains ?? [], mx) && same(d.slicks ?? [], mx) && same(d.streams ?? [], (v) => [1 - v[2], v[1], 1 - v[0], v[3], -v[4], v[5]]);
}

export function diversity(only?: string[], full = false, tStar?: Record<string, number>) {
  const SEEDS = [1000, 1007, 1014], H = 1.2, NO: Input = { tap: false, dir: 0, pointer: null };
  // D011 (📋 D010 ①): 캐시 — 열쇠 = 판 데이터 + game.ts에서 판 목록(STAGES)을 뺀 코드 + T* + 계측 판. 안 바뀐 판은 다시 재지 않는다
  const VER = 'd1-v1.10', cacheFile = join(import.meta.dirname, 'reports/d1-cache.json');
  const cache: Record<string, { key: string; res: unknown }> = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : {};
  const src = readFileSync(join(import.meta.dirname, 'game.ts'), 'utf8'), a0 = src.indexOf('export const STAGES'), a1 = src.indexOf('export const STAGE_COUNT');
  const code = a0 >= 0 && a1 > a0 ? src.slice(0, a0) + src.slice(a1) : src;
  const out = STAGES.map((d, i) => {
    if (only && !only.includes(d.id)) return null;
    const key = createHash('sha1').update([VER, JSON.stringify(d), code, tStar?.[d.id] ?? '', full].join('|')).digest('hex');
    if (cache[d.id]?.key === key) return { ...(cache[d.id].res as ReturnType<typeof measureOne>), cached: true };
    const res = measureOne(d, i);
    cache[d.id] = { key, res };
    writeFileSync(cacheFile, JSON.stringify(cache, null, 1) + '\n');
    return { ...res, cached: false };
  });
  return out;

  function measureOne(d: (typeof STAGES)[number], i: number) {
    const t0 = performance.now();
    // 옛 자 T*: 같은 시드 새 판에서 숙련 봇이 쓴 톡 (깨지 못하면 그 판 톡 전부)
    const seedT = SEEDS.map((seed) => {
      const s = g.create(seed), rng = mulberry32(seed ^ 0x9e3779b9);
      startStage(s, i);
      for (let k = 0; k < 20000 && s.phase === 'play'; k++) g.step(s, duckbathSmart.act(s, rng));
      return s.ok ? s.used : d.taps;
    });
    // FUN v1.10 g: T*는 funqa n300 숙련 톡 분포에서 판마다 하나 (없으면 시드 셋의 중앙)
    const Tg = tStar?.[d.id] ?? [...seedT].sort((a, b) => a - b)[1], tSrc = tStar?.[d.id] !== undefined ? 'n300' : '시드3';
    const cap = Math.max(Tg + 1, d.par, ...seedT);
    const FLIP = SEEDS.map((seed) => g.create(seed).jit[i].flip), sym = symmetric(d);
    const water = (x: number, y: number) => !(d.islands ?? []).some(([cx, cy, r]) => Math.hypot(x - cx, y - cy) < r);
    /** 한 자리 한 시드: 3★인가 · 쓴 톡 (자르면 star3 false) */
    const one = (x: number, y: number, k: number) => {
      const seed = SEEDS[k], s = g.create(seed), rng = mulberry32(seed ^ 0x9e3779b9);
      startStage(s, i);
      g.step(s, { tap: false, dir: 0, pointer: toPointer(FLIP[k] ? 1 - x : x, y) });
      g.step(s, NO);
      for (let f = 0; f < 20000 && s.phase === 'play'; f++) {
        if (s.pen > 0 || s.used > cap) return { star3: false, used: s.used };
        g.step(s, d.par === 1 ? NO : duckbathSmart.act(s, rng));
        if (d.par === 1 && f > 700) break;
      }
      return { star3: s.phase === 'result' && s.ok && s.starOk.every(Boolean), used: s.used };
    };
    // 거친 격자
    const coarse: { x: number; y: number }[] = [];
    for (let gx = 0; gx < 10; gx++)
      for (let gy = 0; gy < 12; gy++) {
        const x = (gx + 0.5) / 10, y = ((gy + 0.5) / 12) * H;
        if (water(x, y) && one(x, y, 0).star3) coarse.push({ x, y });
      }
    // 정밀: 20×25 중 거친 3★ 칸 0.1 안쪽 (정밀 칸 ≥ 물 절반이면 전수) × 시드 3 — 자 넷을 같이 세려고 셋째 시드도 늘 친다
    type Cell = { x: number; y: number; gx: number; gy: number; main: boolean; plus: boolean; seedT: boolean; three: boolean };
    const fine: Cell[] = [];
    const cells: { x: number; y: number; gx: number; gy: number }[] = [];
    for (let gx = 0; gx < 20; gx++)
      for (let gy = 0; gy < 25; gy++) {
        const x = (gx + 0.5) / 20, y = ((gy + 0.5) / 25) * H;
        if (water(x, y)) cells.push({ x, y, gx, gy });
      }
    const waterN = cells.length, near = cells.filter((c) => coarse.some((q) => Math.hypot(q.x - c.x, q.y - c.y) <= 0.1 + 1e-9));
    const exact = full || near.length >= waterN / 2;
    let runs = 0;
    for (const c of exact ? cells : near) {
      const rs = [0, 1, 2].map((k) => (runs++, one(c.x, c.y, k)));
      const n = (f: (r: { star3: boolean; used: number }, k: number) => boolean) => rs.filter(f).length >= 2;
      fine.push({ ...c, main: n((r) => r.star3 && r.used <= Tg), plus: n((r) => r.star3 && r.used <= Tg + 1), seedT: n((r, k) => r.star3 && r.used <= seedT[k]), three: n((r) => r.star3 && r.used <= d.par) });
    }
    // 거리는 칸 번호 차로 다시 계산 (칸 간격 0.05 × 0.048)
    const dist = (a: { gx: number; gy: number }, b: { gx: number; gy: number }) => Math.hypot((a.gx - b.gx) * 0.05, (a.gy - b.gy) * (H / 25));
    const groups = (cs: { gx: number; gy: number }[], link = 0.15) => {
      const par = cs.map((_, k) => k), find = (k: number): number => (par[k] === k ? k : (par[k] = find(par[k])));
      for (let a = 0; a < cs.length; a++) for (let b = a + 1; b < cs.length; b++) if (dist(cs[a], cs[b]) < link - 1e-9) par[find(a)] = find(b);
      // FUN v1.8 ③: 대칭 판이면 칸의 거울(gx → 19 − gx)이 든 무리와 하나로
      if (sym) cs.forEach((c, a) => { const b = cs.findIndex((q) => q.gx === 19 - c.gx && q.gy === c.gy); if (b >= 0) par[find(a)] = find(b); });
      const size = new Map<number, number>();
      cs.forEach((_, k) => size.set(find(k), (size.get(find(k)) ?? 0) + 1));
      const sizes = [...size.values()].filter((n) => n >= 3).sort((a, b) => b - a);
      return { sizes, count: sizes.reduce((a, n) => a + (n >= 0.25 * waterN ? 2 : 1), 0), top: sizes.length ? r2(sizes[0] / waterN) : 0 };
    };
    const cur = groups(fine.filter((c) => c.main)), plus = groups(fine.filter((c) => c.plus)), link10 = groups(fine.filter((c) => c.main), 0.1);
    const seedTg = groups(fine.filter((c) => c.seedT)), old = groups(fine.filter((c) => c.three));
    const pass = cur.count >= 2 || plus.count >= 2 || link10.count >= 2; // FUN v1.10 g: 셋 다 < 2일 때만 ❌
    return {
      id: d.id, par: d.par, sym, T: Tg, tSrc, seedT, flip: FLIP.map((f) => (f ? 'F' : '-')).join(''), exact, coarse: coarse.length, refined: fine.length, runs, water: waterN,
      solCells: fine.filter((c) => c.main).length, D1: cur.count, sizes: cur.sizes, top: cur.top, D1plus: plus.count, plusSizes: plus.sizes, D1link10: link10.count, link10Sizes: link10.sizes,
      D1seedT: seedTg.count, oldD1: old.count, oldSizes: old.sizes, pass, sec: r2((performance.now() - t0) / 1000),
    };
  }
}

const d1Arg = process.argv.find((a) => a.startsWith('--d1'));
if (import.meta.url === `file://${process.argv[1]}` && d1Arg) {
  const only = d1Arg.includes('=') ? d1Arg.split('=')[1].split(',') : undefined, t0 = performance.now();
  // FUN v1.10 g: --tstar=<funqa n300 json> → 판마다 T* = 숙련 톡 중앙 (+1 if 중앙보다 많이 쓴 몫 ≥ .35)
  const tArg = process.argv.find((a) => a.startsWith('--tstar='));
  let tStar: Record<string, number> | undefined;
  if (tArg) {
    const j = JSON.parse(readFileSync(tArg.split('=')[1], 'utf8')) as { 숙련: { stages: { stage: number; medTaps: number; tapsUp: number | null }[] } };
    tStar = Object.fromEntries(j.숙련.stages.map((p) => [STAGES[p.stage - 1].id, p.medTaps + ((p.tapsUp ?? 0) >= 0.35 ? 1 : 0)]));
  }
  const res = diversity(only, process.argv.includes('--full'), tStar).filter(Boolean);
  mkdirSync(join(import.meta.dirname, 'reports'), { recursive: true });
  writeFileSync(join(import.meta.dirname, 'reports/funqa-d1' + (process.argv.includes('--full') ? '-full' : '') + '.json'), JSON.stringify({ at: new Date().toISOString(), D1: res }, null, 2) + '\n');
  console.log('D1 정답 다양성 (FUN v1.10 g) — 판 | par | T*(출처) · 시드별 T* · 뒤집힘 | 정밀 칸/물(전수면 =) | 해 칸 | D1 · T*+1 · 연결 .10 → 판정 | 무리 칸 수 | 가장 큰 몫 | 옛 자: 시드별 T* D1 · 3★만 D1 | 초(캐시면 0)');
  for (const r of res) if (r) console.log(`${r.id}${r.sym ? '(대칭)' : ''} | ${r.par} | ${r.T}(${r.tSrc}) · ${r.seedT.join('·')} · ${r.flip} | ${r.refined}/${r.water}${r.exact ? '=' : ''} | ${r.solCells} | ${r.D1} · ${r.D1plus} · ${r.D1link10} → ${r.pass ? '✓' : '✗'} | ${r.sizes.join('·') || '-'} | ${r.top} | ${r.D1seedT} · ${r.oldD1} | ${r.cached ? '캐시' : r.sec}`);
  console.log(`판 ${res.length}개 · ${r2((performance.now() - t0) / 1000)}초 (30판 목표 ≤ 15분)`);
} else if (import.meta.url === `file://${process.argv[1]}`) {
  const n = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 20), res = measure(n) as Record<string, unknown>;
  if (process.argv.includes('--area')) res['C4'] = area();
  mkdirSync(join(import.meta.dirname, 'reports'), { recursive: true });
  writeFileSync(join(import.meta.dirname, 'reports/funqa.json'), JSON.stringify({ at: new Date().toISOString(), ...res }, null, 2) + '\n');
  for (const k of ['숙련', '캐주얼', '처음', '배우는처음', '배우는처음_힌트없음', '미리보기3', '미리보기10'] as const) {
    const g2 = res[k] as ReturnType<typeof group>;
    console.log(`\n[${k}] 다시 한도 ${g2.retry} · 점수 중앙 ${g2.medScore} · 런 전체 ${g2.medSec}초 · 완주 ${g2.winRate} · 도달 판 중앙 ${g2.medReached} · 첫 톡 3초 뒤 둥지 ${g2.firstTapNest}마리 · W1 ${g2.W1.share}(${ID(g2.W1.stage)})${k === '배우는처음' ? ' ← C5·W1 판정(👆 0.75 따름, FUN v1.4)' : k === '배우는처음_힌트없음' ? ' (옛 자 — 보고만)' : ' (보고만)'} · N4(v1.4 문턱 일치 — 판정 아님, v1.5 환급 반사실은 미측정) ${g2.N4}`);
    console.log(`  실패 이유: ${g2.failWhy.map(([w, c]) => `${w} ${c}`).join(' · ') || '없음'}`);
    console.log('판(id) | 도전 | 클리어 | 첫 시도 | 다시 중앙/p90 | 사람초 중앙(평균) | 톡 중앙(평균) | 별 | ★톡 | ★황금 | 시도당 쏙꿀꺽 | 위기 보임 · 그중 30틱 미만');
    for (const st of g2.stages) console.log(`${ID(st.stage)} | ${st.tried} | ${st.clearRate} | ${st.firstTry} | ${st.retryMed}/${st.retryP90} | ${st.humanSec}(${st.humanMean}) | ${st.medTaps}(${st.tapsMean}) | ${st.stars} | ${st.tapStar} | ${st.goldStar} | ${st.pen} | ${st.crisisRate} · ${st.crisisShort}`);
  }
  const s0 = (res['숙련'] as ReturnType<typeof group>).stages;
  console.log(`\n판 순서(아래 줄들의 차례): ${STAGES.map((d) => d.id).join(' · ')}`);
  console.log(`W2 톡÷숙련 톡: ${(res['W2'] as number[]).join(' · ')}  |  (참고) 톡−par: ${s0.map((p) => p.slack).join(' · ')}`);
  const e6 = res['E6황금'] as Record<string, (number | null)[]>;
  console.log(`E6 캐주얼 ★황금 (황금을 맨 나중에 미는 확률별): ${Object.entries(e6).map(([k, v]) => `${k}: ${v.join(' ')}`).join('  |  ')}`);
  console.log(`H1 (세 번째 시도 클리어율 👆 따름/안 따름 → 차이): ${(res['H1'] as { stage: number; follow: number | null; none: number | null; n: number[]; gain: number | null }[]).filter((h) => h.follow !== null).map((h) => `${ID(h.stage)} ${h.follow}/${h.none} → ${h.gain} (n ${h.n.join('/')})`).join(' · ')}`);
  if (res['C4']) console.log(`C4 (par 1 판, %): ${(res['C4'] as ReturnType<typeof area>).filter((c) => c.oneTap !== null).map((c) => `${ID(c.stage)} 한 톡에 다 ${c.oneTap} · ★3 ${c.oneTap3}`).join('  |  ')}`);
  {
    // D009: 사람초 합 (모든 시도) — 설계는 CONTENT v0.3 §1 '사람 초'(만든 판만 더함)
    const ds = STAGES.reduce((a, d) => ((a[d.id.split('-')[0]] = (a[d.id.split('-')[0]] ?? 0) + (DESIGN_SEC[d.id] ?? 0)), a), {} as Record<string, number>);
    for (const k of ['캐주얼', '배우는처음'] as const) {
      const g2 = res[k] as ReturnType<typeof group>;
      console.log(`사람초 합(${k}, 모든 시도, 런 중앙): 전체 ${g2.allSec}초 = ${r2(g2.allSec / 60)}분 · 욕실 1·2·3 ${g2.worldSec.join(' · ')}초 | 설계(만든 판) ${['1', '2', '3'].map((w) => ds[w] ?? 0).join(' · ')}초 · 30판 설계 합 ${Object.values(DESIGN_SEC).reduce((a, b) => a + b, 0)}초(CONTENT 글의 1,515는 2욕실 합 530을 535로 적은 것)`);
    }
  }
  console.log(`숙련 격차(숙련÷캐주얼) ${res['숙련격차']}× (보고만) · 숙련÷처음 ${res['숙련격차_처음']}×`);
}
