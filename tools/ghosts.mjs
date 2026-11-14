// 고스트: 각 스테이지를 실제 물리로 끝까지 깨 보는 자동 플레이 대본.
// "이 스테이지는 금 하나 없이, 빛꽃 세 송이를 모두 피우고 깰 수 있다"를 증명한다.
//   node tools/ghosts.mjs            전부 검사
//   node tools/ghosts.mjs 1-2 -v     한 스테이지만, 단계별 위치 출력
//
// 대본 명령 (문자열 배열)
//   R / L / N        오른쪽 · 왼쪽으로 굴리기 · 손 떼기 (다음 명령까지 유지)
//   J / j / J0.2     점프 (길게 / 톡 / 지정한 시간만큼 누르기)
//   on / off         빛 켜기 · 끄기
//   >12.5  <12.5     전구의 x 가 그 칸을 지날 때까지 기다림      y>7  y<7  세로
//   G                땅에 닿을 때까지        A  꼭대기(떨어지기 시작)까지
//   W0.5             0.5초 기다림            stop  멈출 때까지 제동
//   F2               빛꽃이 2송이가 될 때까지   K1  등불이 1개 켜질 때까지
//   ?식              자바스크립트 식이 참이 될 때까지 (w=세계, b=전구, T=칸 크기)
import { runGhost } from './ghost-run.mjs';
import { LEVELS } from '../js/levels.js';
import { GHOSTS } from './ghost-scripts.mjs';

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const verbose = args.includes('-v');
  const only = args.find((a) => !a.startsWith('-'));
  let bad = 0;
  // 안내 문구와 스테이지 이름이 두 언어 모두에 있는지
  const { has, setLang } = await import('../js/i18n.js');
  for (const lang of ['ko', 'en']) {
    setLang(lang);
    for (const lv of LEVELS) {
      if (!has('lv.' + lv.id)) { console.log(`FAIL  ${lv.id} 이름 없음 (${lang})`); bad++; }
      for (const h of lv.hints || []) {
        if (!has(h.key) && !(has(h.key + '.pc') && has(h.key + '.touch'))) { console.log(`FAIL  ${lv.id} 안내 문구 없음: ${h.key} (${lang})`); bad++; }
      }
      const flat = lv.rows.join('');
      const count = (c) => flat.split(c).length - 1;
      if (count('S') !== 1 || count('E') !== 1 || count('*') !== 3) { console.log(`FAIL  ${lv.id} 시작/출구/빛꽃 개수가 맞지 않음`); bad++; }
    }
  }
  for (const lv of LEVELS) {
    if (only && lv.id !== only) continue;
    const script = GHOSTS[lv.id];
    if (!script) { console.log(`${lv.id}  (대본 없음)`); bad++; continue; }
    const r = runGhost(lv, script, { verbose });
    const full = r.ok && r.got === r.flowers;
    if (!full) bad++;
    console.log(`${full ? '  ok ' : 'FAIL '} ${lv.id.padEnd(4)} ${r.ok ? `${r.time.toFixed(1)}초  빛꽃 ${r.got}/${r.flowers}  스위치 ${r.toggles}번` : r.fail}`);
  }
  console.log(bad ? `\n고스트 실패 ${bad}건` : '\n모든 스테이지를 금 하나 없이, 빛꽃을 모두 피우고 깰 수 있습니다');
  process.exit(bad ? 1 : 0);
}
