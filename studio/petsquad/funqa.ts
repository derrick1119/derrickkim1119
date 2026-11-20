/**
 * FUN QA 측정 — 봇이 처음부터 끝까지 한 번(회차) + 판마다 한 번 도전(판별).
 *   npx tsx studio/petsquad/funqa.ts [--seeds 24] → studio/petsquad/reports/funqa.json
 * ✏️ M1 S1(📋 측정 먼저 · 🧪 M0 보완점 8): 판별 칸(클리어 · ★3 · 별 · 큰 순간 · 톡 · 다시 뽑기 · 초),
 *   사람 흉내 봇(1.5초에 한 톡)의 첫 싸움 초 · 첫 30초 안 합체·승리, 버릇 봇 6종(GDD §6.3)의 판별 ★3과 '가장 잘 통한 버릇' 연속.
 * ✏️ M1 S2: 버릇 봇은 진영이 가득 차면 가장 약한 동물을 팔고 산다 · 회차도 24시드.
 * 판별 도전의 출발 군단 = 잘하는 봇이 그 시드에서 그 판에 처음 닿았을 때의 군단·금화(사람이 실제로 들고 올 법한 것).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runBot, type Bot } from './core.ts';
import { mulberry32 } from './rng.ts';
import { HABITS, STAGE_COUNT, jumpTo, petsquad as g, petsquadHabit2, petsquadHuman, petsquadRandom, petsquadSmart, type Kind, type PetState } from './game.ts';

export const BOTS: Bot<PetState>[] = [petsquadSmart, petsquadHuman, ...HABITS, petsquadHabit2, petsquadRandom];
const r2 = (x: number) => Math.round(x * 100) / 100;
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const taps = (s: PetState) => s.buys + s.rerolls + s.swaps + s.sells;

/** 회차: 처음부터 끝까지 한 번 */
export function measure(seeds: number[], bots: Bot<PetState>[] = BOTS) {
  const out: Record<string, unknown> = {};
  for (const b of bots) {
    const rs = seeds.map((seed) => runBot(g, b, seed));
    const big = rs.filter((r) => r.s.firstBig >= 0 && r.s.firstTap >= 0).map((r) => (r.s.firstBig - r.s.firstTap) / 60);
    out[b.name] = {
      끝까지: r2(avg(rs.map((r) => (r.s.won ? 1 : 0)))), 도달판: r2(avg(rs.map((r) => (r.s.won ? STAGE_COUNT : r.s.stage)))),
      별: r2(avg(rs.map((r) => Math.max(0, r.s.stars)))), 남은하트: r2(avg(rs.map((r) => r.s.hearts))), 한판초: Math.round(avg(rs.map((r) => r.ticks / 60))),
      큰순간: r2(avg(rs.map((r) => g.wows(r.s)))), 톡: r2(avg(rs.map((r) => taps(r.s)))), 첫톡에서첫와초: big.length ? r2(avg(big)) : null,
    };
  }
  return out;
}

type Snap = { board: ([Kind, number] | null)[]; coins: number };
/** 잘하는 봇이 각 판에 처음 닿았을 때의 군단·금화 */
export function snapshots(seed: number): (Snap | null)[] {
  const s = g.create(seed), snaps: (Snap | null)[] = Array(STAGE_COUNT).fill(null);
  let t = 0, seen = -1;
  while (!g.over(s) && t++ < 60 * 1200) {
    if (s.stage !== seen && s.phase === 'shop') (seen = s.stage), (snaps[s.stage] = { board: s.board.map((p) => (p ? [p.k, p.star] : null)), coins: s.coins });
    g.step(s, petsquadSmart.act(s, Math.random));
  }
  return snaps;
}

/** 한 판 한 번 도전: 결과가 나올 때까지 */
export function tryStage(b: Bot<PetState>, seed: number, k: number, snap: Snap | null) {
  const s = g.create(seed);
  if (k > 0 && snap) jumpTo(s, k, snap.board, snap.coins);
  const w0 = g.wows(s);
  let t = 0;
  const rng = mulberry32(seed * 977 + k);
  while (s.phase !== 'result' && t++ < 60 * 120) g.step(s, b.act(s, rng));
  return { ok: s.phase === 'result' && s.ok, got: s.ok ? s.got : 0, of: s.starOk.length, wows: g.wows(s) - w0, taps: taps(s), rerolls: s.rerolls, sec: t / 60 };
}

export function perStage(seeds: number[], bots: Bot<PetState>[]) {
  const snaps = seeds.map(snapshots);
  const out: Record<string, { 클리어: number; 별3: number; 별: number; 큰순간: number; 톡: number; 다시뽑기: number; 초: number }[]> = {};
  for (const b of bots) {
    out[b.name] = [];
    for (let k = 0; k < STAGE_COUNT; k++) {
      const rs = seeds.map((sd, j) => tryStage(b, sd, k, snaps[j][k])).filter((_, j) => k === 0 || snaps[j][k]);
      out[b.name].push({
        클리어: r2(avg(rs.map((r) => (r.ok ? 1 : 0)))), 별3: r2(avg(rs.map((r) => (r.got >= r.of ? 1 : 0)))), 별: r2(avg(rs.map((r) => r.got))),
        큰순간: r2(avg(rs.map((r) => r.wows))), 톡: r2(avg(rs.map((r) => r.taps))), 다시뽑기: r2(avg(rs.map((r) => r.rerolls))), 초: Math.round(avg(rs.map((r) => r.sec))),
      });
    }
  }
  return out;
}

/** 사람 흉내 봇의 첫 30초: 첫 싸움 시작 초 · 30초 안 합체 수 · 승리 수 */
export function first30(seeds: number[]) {
  const rs = seeds.map((seed) => {
    const s = g.create(seed);
    let fight = -1, wins = 0, merges = 0, was = s.phase, m0 = s.merges;
    for (let t = 0; t < 60 * 30; t++) {
      g.step(s, petsquadHuman.act(s, () => 0.5));
      if (s.merges > m0) merges += s.merges - m0;
      m0 = s.merges;
      if (s.phase === 'fight' && fight < 0) fight = s.t / 60;
      if (s.phase === 'result' && was !== 'result' && s.ok) wins++;
      was = s.phase;
    }
    return { fight, merges, wins };
  });
  return { 첫싸움초: r2(avg(rs.map((r) => r.fight))), 합체: r2(avg(rs.map((r) => r.merges))), 승리: r2(avg(rs.map((r) => r.wins))) };
}

/** 같은 버릇이 3판 연속 '가장 잘 통함'(★3 비율 최고, 0보다 큼)인 횟수 — 3판부터 */
export function habitStreak(st: ReturnType<typeof perStage>) {
  const names = HABITS.map((h) => h.name);
  let streak = 0, prev = '', run = 0;
  for (let k = 2; k < STAGE_COUNT; k++) {
    let top = '', v = 0;
    for (const n of names) if (st[n][k].별3 > v) (v = st[n][k].별3), (top = n);
    run = top && top === prev ? run + 1 : top ? 1 : 0;
    prev = top;
    if (run >= 3) streak++;
  }
  return streak;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = Number(process.argv[process.argv.indexOf('--seeds') + 1]) || 24;
  const seeds = Array.from({ length: n }, (_, i) => i + 1);
  const t0 = performance.now();
  const bots = BOTS;
  const st = perStage(seeds, bots);
  const sm = st[petsquadSmart.name], rnd = st[petsquadRandom.name];
  const habit3 = HABITS.map((h) => Math.max(...st[h.name].slice(2).map((x) => x.별3)));
  const res = {
    날짜: new Date().toISOString().slice(0, 10), 판수: STAGE_COUNT, 시드: n,
    요약: {
      첫30초_사람흉내: first30(seeds),
      버릇봇6_3판부터_별3_최고: r2(Math.max(...habit3)), 버릇별: Object.fromEntries(HABITS.map((h, i) => [h.name, habit3[i]])),
      같은버릇_3판연속_최고: habitStreak(st),
      큰순간_뒤판나누기1판: r2(avg(sm.slice(1).map((x) => x.큰순간)) / Math.max(0.01, sm[0].큰순간)),
      숙련격차_별: r2(avg(sm.map((x) => x.별)) / Math.max(0.01, avg(rnd.map((x) => x.별)))),
      가게톡_판당최대_잘하는봇: Math.max(...sm.map((x) => x.톡)), 가게톡_판당최대_사람흉내: Math.max(...st[petsquadHuman.name].map((x) => x.톡)),
    },
    판별: st,
    회차: measure(seeds), // ✏️ M1 S2: 24시드 · 사람 흉내·버릇 6종도 회차로(🧪 S1 측정기 보완)
  };
  const dir = join(import.meta.dirname, 'reports');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'funqa.json'), JSON.stringify(res, null, 2) + '\n');
  console.log(JSON.stringify(res.요약, null, 2));
  for (const b of bots) console.log(b.name.padEnd(16), st[b.name].map((x) => `${x.클리어}/${x.별3}`).join('  '));
  console.log(`${((performance.now() - t0) / 1000).toFixed(1)}초`);
}
