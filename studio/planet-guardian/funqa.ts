/**
 * FUN QA 계기판 — 유저군(라이트·미들코어·하드코어)별 재미 지표를 봇으로 잰다.
 * 기준과 이유는 FUN.md. 결과는 reports/funqa.json (+ 표를 콘솔에).
 *   npx tsx studio/planet-guardian/funqa.ts
 * 수치는 "재미"가 아니라 재미의 *필요조건*이다. 최종 판단은 FUN QA 에이전트가 스크린샷·플레이와 함께 내린다.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Rng } from '../../engine/rng.ts';
import { CORE, create, noviceBot, smartBot, step, type Card, type Input, type State } from './sim.ts';
import { mulberry32 } from '../../engine/rng.ts';

type Bot = (s: State, rng: Rng) => Input;
type Policy = 'balanced' | 'turret' | 'mine' | 'ally' | 'random';

const RANK: Record<Exclude<Policy, 'random'>, (c: Card, s: State) => number> = {
  balanced: (c, s) => (s.hp <= 1 && c.id === 'shield' ? 0 : c.id === 'ally' ? 1 : c.id === 'up-turret' ? 2 : c.id === 'new-turret' ? 3 : c.id.endsWith('mine') ? 4 : 5),
  turret: (c) => (c.id === 'up-turret' ? 0 : c.id === 'new-turret' ? 1 : c.id === 'ally' ? 2 : 3),
  mine: (c) => (c.id === 'up-mine' ? 0 : c.id === 'new-mine' ? 1 : c.id === 'new-turret' ? 2 : 3),
  ally: (c) => (c.id === 'ally' ? 0 : c.id === 'shield' ? 1 : c.id === 'up-turret' ? 2 : 3),
};

function choose(s: State, rng: Rng, p: Policy): number | undefined {
  if (!s.offer) return undefined;
  if (p === 'random') return Math.floor(rng() * s.offer.length);
  return s.offer.map((c, k) => [RANK[p](c, s), k]).sort((a, b) => a[0] - b[0])[0][1];
}

/** 미들코어 대역: 0.2초 지연, 작은 조준 오차, 카드는 정책대로 */
export const midBot = (p: Policy): Bot => (s, rng) => {
  const pick = s.offer && s.t - s.offerAt > 40 ? choose(s, rng, p) : undefined;
  const seen = s.enemies.filter((e) => 1.05 - e.r > e.v * 12);
  if (!seen.length || rng() < 0.35) return { dir: 0, pick };
  const urgent = seen.reduce((a, e) => ((e.r - CORE) / e.v < (a.r - CORE) / a.v ? e : a));
  return { dir: 0, aim: urgent.a + (rng() - 0.5) * 0.25, pick };
};

/** 하드코어 대역: 잘하는 봇(즉시 반응) + 카드 정책 */
const hardBot = (p: Policy): Bot => (s, rng) => ({ ...smartBot(s), pick: choose(s, rng, p) });

interface Run { sec: number; score: number; builds: number; kills: number; blocks: number; bestCombo: number; wave: number; firstCard: number; firstHit: number; warn: number[] }

function run(bot: Bot, seed: number, max = 60 * 900): Run {
  const s = create(seed), rng = mulberry32(seed ^ 0x9e3779b9);
  let held: Input = { dir: 0 }, firstCard = -1, firstHit = -1;
  const warn: number[] = [];
  while (!s.dead && s.t < max) {
    const inp = s.t % 3 === 0 ? (held = bot(s, rng)) : { dir: held.dir };
    // 피격 경고 시간: 맞기 직전 운석이 모바일 화면 안(반지름 0.8)에 들어와 있던 시간
    const before = s.enemies.map((e) => ({ id: e.id, v: e.v }));
    step(s, inp);
    for (const e of s.events) {
      if (e.type === 'offer' && firstCard < 0) firstCard = s.t / 60;
      if (e.type === 'impact') {
        if (firstHit < 0) firstHit = s.t / 60;
        const gone = before.find((b) => !s.enemies.some((x) => x.id === b.id));
        if (gone) warn.push((0.8 - CORE) / gone.v / 60);
      }
    }
  }
  return { sec: s.t / 60, score: s.kills + s.builds * 5, builds: s.builds, kills: s.kills, blocks: s.blocks, bestCombo: s.bestCombo, wave: s.wave, firstCard, firstHit: firstHit < 0 ? s.t / 60 : firstHit, warn };
}

const med = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0);
const r1 = (x: number) => Math.round(x * 10) / 10;
const SEEDS = [...Array(24).keys()].map((k) => k + 101);
const many = (bot: Bot) => SEEDS.map((x) => run(bot, x));

export interface Check { id: string; group: '라이트' | '미들코어' | '하드코어'; what: string; value: number; target: string; ok: boolean }

export function measure() {
  const light = many(noviceBot), mid = many(midBot('balanced')), hard = many(hardBot('balanced'));
  const policies: Policy[] = ['balanced', 'turret', 'mine', 'ally', 'random'];
  const midBy = Object.fromEntries(policies.map((p) => [p, med((p === 'balanced' ? mid : many(midBot(p))).map((r) => r.score))])) as Record<Policy, number>;
  const ranked = [...policies].sort((a, b) => midBy[b] - midBy[a]);
  const best = midBy[ranked[0]], worst = midBy[ranked.at(-1)!];
  const near = policies.filter((p) => p !== 'random' && midBy[p] >= best * 0.85).length;
  const hardMed = med(hard.map((r) => r.score)), lightMed = med(light.map((r) => r.score));
  const C = (id: string, group: Check['group'], what: string, value: number, target: string, ok: boolean): Check => ({ id, group, what, value: r1(value), target, ok });
  const checks: Check[] = [
    C('L1', '라이트', '첫 판 길이(초)', med(light.map((r) => r.sec)), '90~150', med(light.map((r) => r.sec)) >= 90 && med(light.map((r) => r.sec)) <= 150),
    C('L2', '라이트', '첫 카드까지(초)', med(light.map((r) => r.firstCard)), '≤ 15', med(light.map((r) => r.firstCard)) <= 15),
    C('L3', '라이트', '첫 판 건설 수', med(light.map((r) => r.builds)), '≥ 4', med(light.map((r) => r.builds)) >= 4),
    C('L4', '라이트', '첫 피격까지(초)', med(light.map((r) => r.firstHit)), '≥ 20', med(light.map((r) => r.firstHit)) >= 20),
    C('L5', '라이트', '피격 운석 경고 시간 하위 10%(초)', [...light.flatMap((r) => r.warn)].sort((a, b) => a - b)[Math.floor(light.flatMap((r) => r.warn).length * 0.1)] ?? 0, '≥ 1.5', ([...light.flatMap((r) => r.warn)].sort((a, b) => a - b)[Math.floor(light.flatMap((r) => r.warn).length * 0.1)] ?? 0) >= 1.5),
    C('M1', '미들코어', '판 길이(초)', med(mid.map((r) => r.sec)), '180~360', med(mid.map((r) => r.sec)) >= 180 && med(mid.map((r) => r.sec)) <= 360),
    C('M2', '미들코어', '판당 카드 선택 수', med(mid.map((r) => r.builds)), '8~15', med(mid.map((r) => r.builds)) >= 8 && med(mid.map((r) => r.builds)) <= 15),
    C('M3', '미들코어', '카드 전략 최고/최저 점수 비(선택이 중요한가)', best / Math.max(1, worst), '≥ 1.3', best / Math.max(1, worst) >= 1.3),
    C('M4', '미들코어', '최고의 85% 안에 드는 전략 수(지배 전략 없음)', near, '≥ 2', near >= 2),
    C('H1', '하드코어', '실력 격차: 하드/라이트 점수 비', hardMed / Math.max(1, lightMed), '≥ 4', hardMed / Math.max(1, lightMed) >= 4),
    C('H2', '하드코어', '판 길이(초) — 끝이 있어야 한다', med(hard.map((r) => r.sec)), '300~600', med(hard.map((r) => r.sec)) >= 300 && med(hard.map((r) => r.sec)) <= 600),
    C('H3', '하드코어', '몸으로 막기 비율(%) — 위험한 플레이의 보상', (100 * med(hard.map((r) => r.blocks))) / Math.max(1, med(hard.map((r) => r.kills))), '10~40', ((100 * med(hard.map((r) => r.blocks))) / Math.max(1, med(hard.map((r) => r.kills)))) >= 10 && ((100 * med(hard.map((r) => r.blocks))) / Math.max(1, med(hard.map((r) => r.kills)))) <= 40),
    C('H4', '하드코어', '최고 연속 처치(중앙값)', med(hard.map((r) => r.bestCombo)), '≥ 8', med(hard.map((r) => r.bestCombo)) >= 8),
  ];
  const summary = (rs: Run[]) => ({ sec: r1(med(rs.map((r) => r.sec))), score: med(rs.map((r) => r.score)), wave: med(rs.map((r) => r.wave)), builds: med(rs.map((r) => r.builds)) });
  return { at: new Date().toISOString(), seeds: SEEDS.length, groups: { 라이트: summary(light), 미들코어: summary(mid), 하드코어: summary(hard) }, strategies: midBy, checks, passed: checks.filter((c) => c.ok).length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const m = measure();
  mkdirSync(join(import.meta.dirname, 'reports'), { recursive: true });
  writeFileSync(join(import.meta.dirname, 'reports', 'funqa.json'), JSON.stringify(m, null, 2) + '\n');
  console.log(`FUN QA 지표 ${m.passed}/${m.checks.length} 통과`);
  for (const c of m.checks) console.log(`${c.ok ? '✅' : '❌'} ${c.id} [${c.group}] ${c.what}: ${c.value} (목표 ${c.target})`);
  console.log('유저군 요약', JSON.stringify(m.groups));
  console.log('미들코어 카드 전략별 점수', JSON.stringify(m.strategies));
}
