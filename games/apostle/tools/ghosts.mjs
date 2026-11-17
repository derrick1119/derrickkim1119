// node tools/ghosts.mjs [-v] [stage]
// 길마다: 꺼뜨리며 가는 길과, 하나도 꺼뜨리지 않는 길이 둘 다 끝까지 닿는지 확인한다.
import { LEVELS } from '../js/levels.js';
import { runGhost } from './ghost-run.mjs';
import { GHOSTS } from './ghost-scripts.mjs';
const verbose = process.argv.includes('-v'), only = process.argv.find((a, i) => i > 1 && !a.startsWith('-'));
let bad = 0;
for (const L of LEVELS) {
  if (only && L.id !== only) continue;
  const g = GHOSTS[L.id];
  if (!g) { console.log(`✗ ${L.id}: 대본 없음`); bad++; continue; }
  for (const kind of Object.keys(g)) {
    const r = runGhost(L, g[kind], { verbose });
    const want = kind === 'bright' ? r.alive < r.total : r.alive === r.total;
    const ok = r.ok && r.done && r.fades === 0 && want;
    if (verbose || !ok) console.log(r.log.join('\n'));
    console.log(`${ok ? '✓' : '✗'} ${L.id.padEnd(7)} ${kind.padEnd(6)} ${r.done ? '도착' : '못 감'} · ${r.t.toFixed(1)}초 · 다침 ${r.hurts} · 남은 아이 ${r.alive}/${r.total}${r.out.length ? '  (' + r.out.join(', ') + ')' : ''}`);
    if (!ok) bad++;
  }
}
if (bad) { console.log(`\n${bad}개 실패`); process.exit(1); }
console.log('\n자동 플레이 검증 통과');
