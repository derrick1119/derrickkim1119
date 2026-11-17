// node tools/ghosts.mjs [-v]
// 1) 자동 플레이가 처음부터 끝까지, 한 번도 금 가지 않고, 빛꽃을 모두 피우며 지나가는지
// 2) 반대로, 조심하지 않으면 정말로 깨지는지 (위험이 장식이 아닌지)
import { LEVEL } from '../js/levels.js';
import { runGhost } from './ghost-run.mjs';
import { GHOST } from './ghost-script.mjs';
const verbose = process.argv.includes('-v');
let bad = 0;

const r = runGhost(LEVEL, GHOST, { verbose });
if (verbose || !r.ok) console.log(r.log.join('\n'));
const good = r.ok && r.ended && r.deaths === 0 && r.cracks === 0 && r.flowers === LEVEL.flowers.length;
console.log(`${good ? '✓' : '✗'} 바른 길: 끝까지 ${r.ended ? '도착' : '못 감'} · ${r.t.toFixed(1)}초 · 깨짐 ${r.deaths} · 금 ${r.cracks} · 빛꽃 ${r.flowers}/${LEVEL.flowers.length}`);
if (!good) bad++;

// upto 번째 명령까지는 바른 길로 가고, 거기서부터 조심성 없는 행동을 이어 붙인다
function careless(name, upto, script, want) {
  const a = runGhost(LEVEL, GHOST, { upto });
  const seen = [];
  const b = runGhost(null, script, { world: a.world, strict: false, onEvent: (e) => { if (e.type === 'crack' || e.type === 'shatter') seen.push(`${e.type}:${e.cause}`); } });
  const ok = a.ok && seen.includes(want);
  console.log(`${ok ? '✓' : '✗'} ${name} → ${seen.join(', ') || '아무 일 없음'}${ok ? '' : `  (기대: ${want})`}`);
  if (verbose && !ok) console.log(b.log.join('\n'));
  if (!ok) bad++;
}
const at = (cmd) => { const i = GHOST.indexOf(cmd); if (i < 0) throw new Error('대본에 없는 명령: ' + cmd); return i; };
careless('구덩이로 그냥 걸어 들어가면', at('>28.5') , ['R', 'W3'], 'shatter:fall');
careless('굴을 불 켠 채 달리면 나방이 문다', at('off'), ['R', '>70.8', 'J', 'A', '>74.3', 'J', 'A', '>80.4', 'J', 'A', '>83.9', 'J', 'A', 'W4'], 'crack:moth');
careless('굴을 불 끈 채 그냥 걸으면 유리 조각', at('off') + 1, ['R', 'W4'], 'shatter:shard');
careless('골짜기에서 불을 끄고 서 있으면 그림자', at('>112.9') + 2, ['N', 'W8'], 'crack:stalker');
careless('나방 나무 밑에서 불을 켜 두면', at('>112.9') + 1, ['N', 'W6'], 'crack:moth');
careless('감시자의 시선 안에서 불을 켜고 서 있으면', at('>147.6'), ['R', '>153', 'N', 'W12'], 'shatter:watcher');
careless('턱에서 멀리 뛰어내리면 금이 간다', at('>95.6') + 2, ['R', '>97.6', 'J', 'A'], 'crack:fall');
careless('승강대 꼭대기에서 뛰어내리면', at('?w.lifts[0].y<=7.001') + 1, ['L', 'J', 'W2.5'], 'shatter:fall');
careless('다리 위에서 멈추면 밀물', at('>208.5') + 1, ['N', 'W9'], 'shatter:tide');
careless('다리의 나방 둥지 밑을 불 켠 채 지나면', at('>215.5') + 1, ['R', 'J', 'A', '>221.2', 'J', 'A', 'W1.5'], 'crack:moth');

if (bad) { console.log(`\n${bad}개 실패`); process.exit(1); }
console.log('\n자동 플레이 검증 통과');
