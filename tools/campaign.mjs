// 원정 전체 시뮬레이션: 보상을 무작위로 고르며 12스테이지를 돈다
// node tools/campaign.mjs [runs] [mode: casual|bot|auto]
import { Battle } from '../src/sim/battle.js';
import { STAGES } from '../src/data/stages.js';
import { UNITS } from '../src/data/units.js';
import { G, newRun, battleSetup, rollRewards, applyReward, autoPlace, goldFor, cap, used } from '../src/state.js';

const runs = Number(process.argv[2] || 20), mode = process.argv[3] || 'casual';
function command(b) {
  if (mode === 'auto') return;
  const foes = b.units.filter(u => !u.dead && u.team === 1 && u.hidden <= 0), mine = b.units.filter(u => !u.dead && u.team === 0);
  if (!foes.length || !mine.length) return;
  if (mode === 'casual') {
    if (b.rand() < 0.45) return;
    if (b.morale >= 5) { const hurt = mine.filter(u => u.hp < u.maxHp * 0.5); if (hurt.length >= 3 && b.rand() < 0.5) { const u = hurt[(b.rand() * hurt.length) | 0]; b.cast('grail', u.x, u.y); } else { const u = foes[(b.rand() * foes.length) | 0]; if (b.clusterScore(u, 80) >= 2) b.cast('rain', u.x, u.y); } }
    if (b.heroCd <= -2 && b.hero()) { const u = foes[(b.rand() * foes.length) | 0]; b.cast(b.heroSkill, u.x, u.y); }
  } else {
    if (b.morale >= 4) { let best = null, bs = 2.5; for (const u of foes) { const s = b.clusterScore(u, 80); if (s > bs) { bs = s; best = u; } } let hurt = null, hs = 2.5; for (const u of mine) { let n = 0; b.near(u.x, u.y, 100, o => { if (o.team === 0 && !o.dead && o.hp < o.maxHp * 0.6) n++; }); if (n > hs) { hs = n; hurt = u; } } if (hurt) b.cast('grail', hurt.x, hurt.y); else if (best) b.cast('rain', best.x, best.y); }
    if (b.heroCd <= 0 && b.hero()) { let best = null, bs = 2; for (const u of foes) { const s = b.clusterScore(u, 80) + (u.def.boss ? 3 : 0); if (s > bs) { bs = s; best = u; } } if (best) b.cast(b.heroSkill, best.x, best.y); }
  }
}
const reach = new Array(STAGES.length + 1).fill(0), failAt = new Array(STAGES.length).fill(0), tries = new Array(STAGES.length).fill(0);
let clears = 0, totalT = 0, nB = 0;
for (let k = 0; k < runs; k++) {
  const r = newRun(['commander', 'bishop', 'archmage'][k % 3]);
  while (r.crowns > 0 && r.stage < STAGES.length) {
    for (const s of r.squads) if (!s.placed) autoPlace(s, 0);
    if (used() > cap()) throw new Error('군량 초과');
    const st = STAGES[r.stage], b = new Battle(battleSetup(1000 + k * 97 + r.stage * 13 + r.crowns));
    let steps = 0; while (!b.over && steps++ < 30 * 200) { b.step(1 / 30); b.events.length = 0; if (steps % (mode === 'casual' ? 60 : 12) === 0) command(b); }
    tries[r.stage]++; totalT += b.time; nB++;
    if (b.winner === 0) {
      const stars = 1 + (b.lost <= st.starDeaths ? 1 : 0) + (b.time <= st.starTime ? 1 : 0); r.gold += goldFor(stars, st.boss); r.merit += stars;
      if (r.stage >= STAGES.length - 1) { r.stage++; break; }
      const opts = rollRewards(!!st.boss); applyReward(opts[(Math.random() * 3) | 0]);
      if (r.gold >= 40) { r.gold -= 40; applyReward(opts.filter((o, i) => i !== 0)[0]); }
      r.stage++;
    } else { r.crowns--; failAt[r.stage]++; }
  }
  reach[Math.min(r.stage, STAGES.length)]++; if (r.stage >= STAGES.length) clears++;
}
console.log(`mode=${mode} runs=${runs} 정복률 ${(clears / runs * 100).toFixed(0)}%  평균 전투 ${(totalT / nB).toFixed(0)}초`);
console.log('스테이지별 패배율:', STAGES.map((s, i) => `${s.id}:${tries[i] ? Math.round(failAt[i] / tries[i] * 100) : '-'}%`).join('  '));
console.log('도달 분포:', reach.map((n, i) => n ? `${i < STAGES.length ? STAGES[i].id : '정복'}×${n}` : '').filter(Boolean).join('  '));
