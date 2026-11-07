/**
 * FUN QA 계기판 — 유저군(라이트·미들코어·하드코어)별 재미 지표를 봇으로 잰다.
 * 기준과 이유는 FUN.md. 결과는 reports/funqa.json (+ 표를 콘솔에).
 *   npx tsx studio/planet-guardian/funqa.ts
 * C002: 조작이 없어졌다(오너). 실력 = 카드 판단. 유저군 봇은 카드 버릇만 다르다.
 *   라이트 = 아무거나 · 미들코어 = 방어 우선 상식 · 하드코어 = 여러 빌드 중 가장 잘 되는 것을 아는 사람
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mulberry32 } from '../../engine/rng.ts';
import { BALANCED, BASE_ORE, CORE, create, mineRate, randomBot, scoreParts, smartBot, step, type Card, type CardId, type Input, type Policy, type State } from './sim.ts';
import type { Rng } from '../../engine/rng.ts';

type Bot = (s: State, rng: Rng) => Input;
const order = (ids: CardId[]): Policy => (c) => { const k = ids.indexOf(c.id); return k < 0 ? 99 : k; };
/** 하드코어 후보 빌드들 — 서로 카드 선택이 충분히 달라야 "다른 전략"으로 센다(FUN QA C001: M4 중복 버그) */
export const POLICIES: Record<string, Policy> = {
  방어우선: BALANCED,
  포탑집중: order(['up-turret', 'new-turret', 'spin', 'ally', 'shield', 'new-mine', 'up-mine']),
  광산먼저: order(['new-mine', 'up-mine', 'new-turret', 'up-turret', 'ally', 'spin', 'shield']),
  위성회전: order(['ally', 'spin', 'up-turret', 'new-turret', 'shield', 'new-mine', 'up-mine']),
  회전없이: order(['ally', 'up-turret', 'new-turret', 'new-mine', 'up-mine', 'shield']),
};
const botOf = (p: Policy): Bot => (s) => ({ pick: s.offer ? s.offer.map((c: Card, k) => [p(c, s), k]).sort((a, b) => a[0] - b[0])[0][1] : undefined });

/** 모바일 390×844에서 화면 안에 보이는 반지름(단위 좌표) — render.ts view()와 같은 식 */
const PLAY_H = 844 * 0.82, SC = Math.min(390 * 0.6, PLAY_H * 0.47), VISIBLE_R = Math.min(195, PLAY_H * 0.53) / SC;

interface Run { bonus: number; oreLeft: number; rerollCost: number; killOre: number; allOre: number; emptyTicks: number; rerolls: number; gaps: number[]; sec: number; score: number; builds: number; kills: number; bestCombo: number; wave: number; firstCard: number; firstHit: number; warn: number[]; picks: CardId[] }

function run(bot: Bot, seed: number, max = 60 * 900): Run {
  const s = create(seed), rng = mulberry32(seed ^ 0x9e3779b9);
  let firstCard = -1, firstHit = -1, guard = 0, lastOffer = 0, killOre = 0, allOre = 0, emptyTicks = 0;
  const gaps: number[] = [];
  const warn: number[] = [], picks: CardId[] = [];
  while (!s.dead && s.t < max && guard++ < max * 4) {
    const before = s.enemies.map((e) => ({ id: e.id, v: e.v })), offer = s.offer;
    const inp = bot(s, rng);
    const t0 = s.t;
    step(s, inp);
    if (s.t > t0) {
      allOre += (BASE_ORE + mineRate(s)) / 60;
      if (!s.enemies.length) emptyTicks++;
    }
    if (offer && inp.pick !== undefined) picks.push(offer[inp.pick].id);
    for (const e of s.events) {
      if (e.type === 'offer') {
        if (firstCard < 0) firstCard = s.t / 60;
        gaps.push((s.t - lastOffer) / 60); // 멈춘 시간은 s.t가 안 흐르니 저절로 빠진다
        lastOffer = s.t;
      }
      if (e.type === 'kill') (killOre += e.ore), (allOre += e.ore);
      if (e.type === 'impact') {
        if (firstHit < 0) firstHit = s.t / 60;
        const gone = before.find((b) => !s.enemies.some((x) => x.id === b.id));
        if (gone) warn.push((VISIBLE_R - CORE) / gone.v / 60);
      }
    }
  }
  return { bonus: scoreParts(s).bonus, oreLeft: s.ore, rerollCost: s.cost, killOre, allOre, emptyTicks, rerolls: s.rerolls, gaps, sec: s.t / 60, score: s.kills + s.builds * 5, builds: s.builds, kills: s.kills, bestCombo: s.bestCombo, wave: s.wave, firstCard, firstHit: firstHit < 0 ? s.t / 60 : firstHit, warn, picks };
}

const med = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0);
const pct = (xs: number[], q: number) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length * q)] : 0);
const r1 = (x: number) => Math.round(x * 10) / 10;
const SEEDS = [...Array(24).keys()].map((k) => k + 101);
const many = (bot: Bot) => SEEDS.map((x) => run(bot, x));
/** 다시 뽑기 정책 비교는 판 단위 잡음이 커서 96시드로 (FUN QA C006: 24시드 중앙값은 459~619로 흔들림). 평가 시드 101~124와 겹치지 않게 2001~2096 */
const SEEDS96 = [...Array(96).keys()].map((k) => k + 2001);
const many96 = (bot: Bot) => SEEDS96.map((x) => run(bot, x));
/** 두 빌드의 카드 선택이 얼마나 겹치나 (0~1) */
function overlap(a: Run[], b: Run[]) {
  let same = 0, all = 0;
  a.forEach((r, i) => r.picks.forEach((p, k) => (all++, p === b[i].picks[k] && same++)));
  return all ? same / all : 1;
}

export interface Check { ref?: boolean; id: string; group: '라이트' | '미들코어' | '하드코어'; what: string; value: number; target: string; ok: boolean }

export function measure() {
  // 미들코어 = 다시 뽑기도 쓰는 smartBot (FUN QA C004: 셈법과 봇을 일치)
  const light = many(randomBot), mid = many(smartBot);
  // R1 비교용: 광석이 되는 대로 무조건 다시 뽑는 봇
  const always: Bot = (s) => (s.offer && s.ore >= s.cost ? { reroll: true } : smartBot(s));
  // R0·R1 (C007 개정): 96시드 쌍 비교 — 무조건 / 안 누름 / 골라 누름
  const never96 = many96(botOf(BALANCED)), always96 = many96(always), pick96 = many96(smartBot);
  const pairMed = (a: Run[], b: Run[]) => med(a.map((r, i) => r.score / Math.max(1, b[i].score)));
  const R0 = pairMed(always96, never96);
  const byPolicy = Object.fromEntries(Object.entries(POLICIES).map(([k, p]) => [k, k === '방어우선' ? mid : many(botOf(p))])) as Record<string, Run[]>;
  const scoreOf = Object.fromEntries(Object.entries(byPolicy).map(([k, rs]) => [k, med(rs.map((r) => r.score))])) as Record<string, number>;
  const ranked = Object.keys(scoreOf).sort((a, b) => scoreOf[b] - scoreOf[a]);
  const bestName = ranked[0], hard = byPolicy[bestName], best = scoreOf[bestName], worst = scoreOf[ranked.at(-1)!];
  // 최고의 85% 안에 들면서 서로 카드 선택이 50% 이하로 겹치는 전략 묶음 수
  const distinct: string[] = [];
  for (const k of ranked) if (scoreOf[k] >= best * 0.85 && distinct.every((d) => overlap(byPolicy[k], byPolicy[d]) <= 0.5)) distinct.push(k);
  const hardScores = hard.map((r) => r.score), mean = hardScores.reduce((a, x) => a + x, 0) / hardScores.length;
  const cv = Math.sqrt(hardScores.reduce((a, x) => a + (x - mean) ** 2, 0) / hardScores.length) / mean;
  const lightWarn = light.flatMap((r) => r.warn), hardWarn = hard.flatMap((r) => r.warn);
  const hitToDeath = med(light.map((r) => r.sec - r.firstHit));
  // H3 (FUN QA C002 개정): 같은 빌드에서 궤도 가속만 뺀 것과 시드별로 비교한 점수비의 중앙값
  const noSpin: Policy = (c, st) => (c.id === 'spin' ? 99 : BALANCED(c, st));
  const noSpinRuns = many(botOf(noSpin));
  const spinGain = med(mid.map((r, i) => r.score / Math.max(1, noSpinRuns[i].score)));
  // L7: 최고 빌드로도 초반 운 사망이 없는가 — 하위 10% 생존 시간
  const L7 = pct(hard.map((r) => r.sec), 0.1);
  // F1: 판단(카드 1장 = 1회) 사이 간격 중앙값. 슬롯 선택은 슬롯별 점수 차가 측정된 뒤에만 센다(PM C002)
  const allGaps = light.concat(mid).flatMap((r) => r.gaps.slice(1));
  const F1 = med(allGaps), F1p90 = pct(allGaps, 0.9);
  const C = (id: string, group: Check['group'], what: string, value: number, target: string, ok: boolean, ref = false): Check => ({ id, group, what, value: r1(value), target, ok, ref });
  // R1 (FUN QA C004): 다시 뽑기가 판단인가 — 골라 누르는 쪽이 무조건 누르는 쪽보다 5% 이상 낫고, 판 끝에 광석이 남아돌지 않는다
  // R1 (C006 개정, FUN QA C005): 시드별 쌍 비교 — 골라 누르는 봇이 이기는 시드 수와 쌍별 점수비 중앙값
  const pairs = pick96.map((r, i) => r.score / Math.max(1, always96[i].score));
  const R1wins = pairs.filter((x) => x > 1).length, R1a = med(pairs);
  const R1b = med(mid.map((r) => r.oreLeft / Math.max(1, r.rerollCost * 2 + 2)));
  // L8 (C006 개정): 분위수 자리 덕에 통과하지 않게, 45초 미만 판 개수로
  const L8 = light.filter((r) => r.sec < 45).length;
  const H4 = (100 * med(hard.map((r) => r.bonus))) / Math.max(1, med(hard.map((r) => r.score)));
  const deaths = hard.map((r) => r.sec), H8 = pct(deaths, 0.75) - pct(deaths, 0.25);
  const L1 = med(light.map((r) => r.sec)), L2 = med(light.map((r) => r.firstCard)), L3 = med(light.map((r) => r.builds)), L4 = med(light.map((r) => r.firstHit)), L5 = pct(lightWarn, 0.1);
  const M1 = med(mid.map((r) => r.sec)), M2 = med(mid.map((r) => r.builds)), M3 = best / Math.max(1, worst);
  const H1 = med(hardScores) / Math.max(1, med(light.map((r) => r.score))), H2 = med(hard.map((r) => r.sec)), H6 = pct(hardWarn, 0.1);
  const checks: Check[] = [
    C('L1', '라이트', '첫 판 길이(초)', L1, '90~180', L1 >= 90 && L1 <= 180),
    C('L2', '라이트', '첫 카드까지(초)', L2, '≤ 15', L2 <= 15),
    C('L3', '라이트', '첫 판 건설 수', L3, '≥ 4', L3 >= 4),
    C('L4', '라이트', '첫 피격까지(초)', L4, '≥ 20', L4 >= 20),
    C('L5', '라이트', '피격 운석이 화면 안에 보인 시간 하위 10%(초)', L5, '≥ 1.5', L5 >= 1.5),
    C('L6', '라이트', '첫 피격 → 끝까지(초) — 연쇄 사망', hitToDeath, '≥ 25', hitToDeath >= 25),
    C('L7', '라이트', '최고 빌드 하위 10% 생존(초) — 초반 운 사망', L7, '≥ 90', L7 >= 90),
    C('L8', '라이트', '45초 미만에 끝난 판 수(24판 중) — 아무것도 못 짓고 끝남', L8, '≤ 1', L8 <= 1),
    C('F1', '라이트', '[참고] 판단 사이 간격 중앙값(초) — 박자 카드 뒤 설정값', F1, '≤ 12', F1 <= 12, true),
    C('F2', '라이트', '[참고] 판단 사이 간격 상위 10%(초) — 설정값', F1p90, '≤ 20', F1p90 <= 20, true),
    C('M1', '미들코어', '판 길이(초)', M1, '180~360', M1 >= 180 && M1 <= 360),
    C('M2', '미들코어', '판당 카드 선택 수 (C007: 카드만 셈, 다시 뽑기는 롤아웃에서 갈리는 것만 — rollout.json)', M2, '15~30', M2 >= 15 && M2 <= 30),
    C('R0', '미들코어', '다시 뽑기 버튼의 가치: 무조건/안 누름 96시드 쌍 비 중앙값', R0, '≥ 1.03', R0 >= 1.03),
    C('M3', '미들코어', '빌드 최고/최저 점수 비(선택이 중요한가)', M3, '≥ 1.3', M3 >= 1.3),
    C('M4', '미들코어', '최고의 85% 안 서로 다른 빌드 수(겹침 ≤ 50%)', distinct.length, '≥ 2', distinct.length >= 2),
    C('H1', '하드코어', '실력 격차: 최고 빌드/아무거나 점수 비', H1, '≥ 4', H1 >= 4),
    C('H2', '하드코어', '최고 빌드 판 길이(초) — 끝이 있어야 한다', H2, '300~600', H2 >= 300 && H2 <= 600),
    C('H3', '하드코어', '회전 속도의 의미: 같은 빌드 궤도 가속 있음/없음 시드별 점수비 중앙값', spinGain, '≥ 1.1', spinGain >= 1.1),
    C('H4', '하드코어', '점수 중 실력 보너스 비율(%) — scoreParts 실측', H4, '≥ 10', H4 >= 10),
    C('H5', '하드코어', '최고 빌드 점수 변동계수(%) — 결정적 벽이 아닌가', cv * 100, '≥ 15', cv >= 0.15),
    C('H6', '하드코어', '끝판 피격 운석 화면 안 시간 하위 10%(초)', H6, '≥ 0.6', H6 >= 0.6),
    C('H8', '하드코어', '최고 빌드 사망 시각 사분위 범위(초) — 벽이 아닌가 (M3 기준)', H8, '≥ 30', H8 >= 30),
    C('R1', '미들코어', `다시 뽑기 판단: 골라 누르기/무조건 96시드 쌍 비 중앙값 (이긴 시드 ${R1wins}/96, ≥ 64 필요)`, R1a, '≥ 1.05', R1a >= 1.05 && R1wins >= 64),
    C('R2', '미들코어', '판 끝 남은 광석 ÷ 다시 뽑기 2회분 (중앙값)', R1b, '≤ 1', R1b <= 1),
  ];
  const summary = (rs: Run[]) => ({ sec: r1(med(rs.map((r) => r.sec))), score: med(rs.map((r) => r.score)), wave: med(rs.map((r) => r.wave)), builds: med(rs.map((r) => r.builds)) });
  const ratio = (rs: Run[], f: (r: Run) => number, g: (r: Run) => number) => r1((100 * rs.reduce((a, r) => a + f(r), 0)) / Math.max(1, rs.reduce((a, r) => a + g(r), 0)));
  const observe = { 처치광석비율: ratio(mid, (r) => r.killOre, (r) => r.allOre), 빈화면비율: ratio(mid, (r) => r.emptyTicks, (r) => r.sec * 60), 무조건다시뽑기점수_96: med(always96.map((r) => r.score)), 안누름점수_96: med(never96.map((r) => r.score)), 골라누름점수_96: med(pick96.map((r) => r.score)) };
  return { observe, at: new Date().toISOString(), seeds: SEEDS.length, hardBuild: bestName, groups: { 라이트: summary(light), 미들코어: summary(mid), 하드코어: summary(hard) }, strategies: scoreOf, distinct, checks, passed: checks.filter((c) => c.ok && !c.ref).length, counted: checks.filter((c) => !c.ref).length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const m = measure();
  mkdirSync(join(import.meta.dirname, 'reports'), { recursive: true });
  writeFileSync(join(import.meta.dirname, 'reports', 'funqa.json'), JSON.stringify(m, null, 2) + '\n');
  console.log(`FUN QA 지표 ${m.passed}/${m.counted} 통과(참고 제외) · 하드코어 빌드 = ${m.hardBuild}`);
  for (const c of m.checks) console.log(`${c.ok ? '✅' : '❌'} ${c.id} [${c.group}] ${c.what}: ${c.value} (목표 ${c.target})`);
  console.log('유저군 요약', JSON.stringify(m.groups));
  console.log('관찰', JSON.stringify(m.observe));
  console.log('빌드별 점수', JSON.stringify(m.strategies), '서로 다른 상위 빌드', m.distinct.join(','));
}
