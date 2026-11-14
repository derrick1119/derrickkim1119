// 모든 스테이지를 풀이기로 다시 풀어 본다:  node tools/verify.mjs
//   · 빛꽃을 모두 피우고 깰 수 있는가, 적어 둔 최소 턴(par)과 풀이(sol)가 맞는가
//   · 스위치 없이는 깰 수 없는가 (첫 판 제외)
//   · 두 언어 문구가 모두 있는가
import { LEVELS, CHAPTERS } from '../js/levels.js';
import { parseLevel } from '../js/rules.js';
import { solve, replay } from '../js/solver.js';
import { has, setLang } from '../js/i18n.js';

let bad = 0;
const fail = (msg) => { console.log('FAIL  ' + msg); bad++; };
for (const lang of ['ko', 'en']) {
  setLang(lang);
  for (const ch of CHAPTERS) if (!has(ch.key)) fail(`장 이름 없음: ${ch.key} (${lang})`);
  for (const lv of LEVELS) if (lv.tip && !has(lv.tip) && !(has(lv.tip + '.pc') && has(lv.tip + '.touch'))) fail(`${lv.id} 안내 문구 없음: ${lv.tip} (${lang})`);
}
for (const lv of LEVELS) {
  const L = parseLevel(lv);
  const flat = lv.rows.join('');
  const count = (c) => flat.split(c).length - 1;
  if (count('S') !== 1 || count('E') !== 1 || count('*') !== 3) { fail(`${lv.id} 시작/출구/빛꽃 개수`); continue; }
  const r = solve(L, { max: 600000 });
  if (!r.full) { fail(`${lv.id} 풀 수 없음`); continue; }
  const st = replay(L, lv.sol);
  const okSol = st.win && st.turns === lv.par && st.state.fl === 7;
  const okPar = r.full.turns === lv.par && r.any.turns === lv.parAny;
  if (!okSol) fail(`${lv.id} 적어 둔 풀이가 맞지 않음`);
  if (!okPar) fail(`${lv.id} 최소 턴이 다름: 적힌 값 ${lv.par}/${lv.parAny}, 실제 ${r.full.turns}/${r.any.turns}`);
  const needsSwitch = !solve(L, { max: 200000, noToggle: true, wantFull: false }).any;
  if (!needsSwitch && lv.id !== '1-1' && lv.id !== '4-1') fail(`${lv.id} 스위치 없이도 깰 수 있음`);
  if (okSol && okPar) console.log(`  ok  ${lv.id.padEnd(4)} ${L.W}×${L.H}  최소 ${String(lv.par).padStart(2)}턴 (출구만 ${String(lv.parAny).padStart(2)})  스위치 ${st.toggles} 밀기 ${st.pushes} 등불 ${st.lanterns} 추락 ${st.falls} 금 ${st.cracks}  상태 ${r.states}개`);
}
console.log(bad ? `\n검증 실패 ${bad}건` : `\n${LEVELS.length}개 스테이지 모두: 빛꽃을 다 피우고 깰 수 있고, 적어 둔 최소 턴이 정확합니다`);
process.exit(bad ? 1 : 0);
