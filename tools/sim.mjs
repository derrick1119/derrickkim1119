// 밸런스 시뮬레이터. 실제 Game 규칙 위에서 가상의 플레이어를 돌려
// "첫 관측 완료까지 얼마나 걸리는가" 를 본다.
//   node tools/sim.mjs [반복 횟수] [--careful] [--verbose]
import { Game } from '../src/core/game.js';
import { defaultState } from '../src/core/state.js';
import { seededRng } from '../src/core/rng.js';
import { FORMS, SPECIMENS, MISSIONS, GADGETS, WATCHERS, CAUSES, SPECIMEN_BY_ID } from '../src/data/content.js';
import { formatSize } from '../src/core/format.js';

const args = process.argv.slice(2);
const RUNS = Number(args.find((a) => /^\d+$/.test(a))) || 200;
const CAREFUL = args.includes('--careful');
const VERBOSE = args.includes('--verbose');

const TAP_SECONDS = 1.35; // 표본 하나를 모으는 데 드는 평균 시간(시선 대기 포함)
const MISSION_SECONDS = 6;
const REPORT_SECONDS = 9;
const MAX_HOURS = 20;

function spend(game) {
  let bought = true;
  while (bought) {
    bought = false;
    const sp = game.nextSpecimen();
    if (sp && game.state.grant >= sp.cost) bought = game.buySpecimen(sp.id) || bought;
    const ms = game.nextMission();
    if (ms && game.state.grant >= ms.cost) bought = game.buyMission(ms.id) || bought;
    // 다음 해금 비용의 절반보다 싼 장비만 산다(해금을 우선한다).
    const reserve = Math.min(sp ? sp.cost : Infinity, ms ? ms.cost : Infinity);
    const options = GADGETS.map((g) => ({ id: g.id, cost: game.gadgetCost(g.id) }))
      .filter((o) => o.cost !== null && o.cost <= game.state.grant && (o.cost <= reserve * 0.5 || reserve === Infinity))
      .sort((a, b) => a.cost - b.cost);
    if (options.length) bought = game.upgrade(options[0].id) || bought;
  }
}

function pickSpecimen(game, rng) {
  const table = game.spawnTable();
  let total = 0;
  for (const e of table) total += e.weight;
  let r = rng() * total;
  for (const e of table) {
    r -= e.weight;
    if (r <= 0) return e.spec;
  }
  return table[table.length - 1].spec;
}

function pickMission(game, rng) {
  const pool = MISSIONS.filter((m) => game.isMissionUnlocked(m.id));
  const curious = pool.filter((m) => m.causes.some((c) => !game.state.seen[c]));
  if (curious.length && rng() < 0.7) return curious[curious.length - 1];
  const ok = pool.filter((m) => game.missionRisk(m.id) <= (CAREFUL ? 0.3 : 0.5));
  if (ok.length) return ok[ok.length - 1];
  if (CAREFUL) return null;
  return pool.reduce((a, b) => (game.missionRisk(a.id) <= game.missionRisk(b.id) ? a : b));
}

function simulate(seed) {
  const rng = seededRng(seed);
  const game = new Game(defaultState(), { rng, now: () => 0 });
  let t = 0;
  const marks = {};
  let cleared = null;
  game.on('ending', (e) => {
    cleared = { ...e, t, unique: game.uniqueCauses };
  });
  while (!cleared && t < MAX_HOURS * 3600) {
    spend(game);
    const s = game.state;
    if (s.phase === 'discovered') {
      t += REPORT_SECONDS;
      game.nextGeneration();
      for (const g of [5, 10, 20, 40, 80]) {
        if (s.gen === g) marks[g] = { t, unique: game.uniqueCauses, best: s.stats.bestForm, grant: s.grant };
      }
      continue;
    }
    if (s.phase !== 'play') break;
    if (game.cloakReady) game.activateCloak();
    if (s.phase !== 'play') continue;
    if (s.run.fuel >= 100) {
      const m = pickMission(game, rng);
      if (m) {
        t += MISSION_SECONDS;
        game.tick(MISSION_SECONDS);
        game.resolveMission(m.id);
        continue;
      }
    }
    const spec = pickSpecimen(game, rng);
    // 숙련도: 세대가 쌓일수록 시선 중에 실수로 누르는 일이 줄어든다.
    const mistake = Math.max(0.012, 0.06 - s.gen * 0.0015);
    const watchers = [];
    if (!game.cloaked && rng() < mistake) {
      const types = FORMS[game.formIndex].watchers;
      watchers.push(types[Math.floor(rng() * types.length)]);
    }
    if (CAREFUL && !game.cloaked && SPECIMEN_BY_ID[spec.id].cause && game.chance(SPECIMEN_BY_ID[spec.id].cause) > 0.02) {
      t += 0.5; // 위험한 표본은 그냥 보낸다
      game.tick(0.5);
      continue;
    }
    game.collect(spec.id, { watchers });
    t += TAP_SECONDS;
    game.tick(TAP_SECONDS);
  }
  return { cleared, marks, game, t };
}

const q = (arr, p) => arr.slice().sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor(arr.length * p))];
const mins = (sec) => `${(sec / 60).toFixed(0)}분`;

const results = [];
for (let i = 0; i < RUNS; i++) results.push(simulate(1000 + i));

const done = results.filter((r) => r.cleared);
console.log(`플레이어 유형: ${CAREFUL ? '신중형' : '일반형'}, 반복 ${RUNS}회`);
console.log(`관측 완료 도달: ${done.length}/${RUNS}`);
if (done.length) {
  const times = done.map((r) => r.cleared.t);
  const gens = done.map((r) => r.cleared.gen);
  const uniq = done.map((r) => r.cleared.unique);
  console.log(`첫 완료 시간  10% ${mins(q(times, 0.1))} · 중앙 ${mins(q(times, 0.5))} · 90% ${mins(q(times, 0.9))}`);
  console.log(`완료 시 세대  10% ${q(gens, 0.1)} · 중앙 ${q(gens, 0.5)} · 90% ${q(gens, 0.9)}`);
  console.log(`완료 시 도감  중앙 ${q(uniq, 0.5)}/${CAUSES.length}`);
}
for (const g of [5, 10, 20, 40, 80]) {
  const rows = results.map((r) => r.marks[g]).filter(Boolean);
  if (!rows.length) continue;
  console.log(
    `${String(g).padStart(3)}세대 시점: 경과 ${mins(q(rows.map((m) => m.t), 0.5))}, 도감 ${q(rows.map((m) => m.unique), 0.5)}, ` +
      `최고 형태 ${q(rows.map((m) => m.best), 0.5)}, 보유 연구비 ${q(rows.map((m) => m.grant), 0.5)}`,
  );
}
if (VERBOSE && done.length) {
  const g = done[0].game;
  const s = g.state;
  console.log('\n표본 사례(첫 번째 완료 판):');
  console.log(' 시작 지름', formatSize(g.nextStartSize), '· 해금 표본', Object.keys(s.unlocked.specimens).length, '/', SPECIMENS.length);
  console.log(' 해금 임무', Object.keys(s.unlocked.missions).length, '/', MISSIONS.length, '· 장비', JSON.stringify(s.gadgets));
  console.log(' 지구인 종류', Object.keys(WATCHERS).length, '· 통계', JSON.stringify({ ...s.stats, bySpecimen: undefined }));
}
