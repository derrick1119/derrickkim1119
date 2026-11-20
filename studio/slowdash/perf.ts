/**
 * ✏️ M3 S5 렉 측정기(🧪 F13 · (80): 표본 수를 늘 같이 적는다) — 헤드리스 390×844 · CPU 4배 · DPR 2 고정 · 소리 켬
 *   npx tsx studio/slowdash/build.ts && npx tsx studio/slowdash/perf.ts [시드 수=10]
 *   판마다 시드 N개: 첫 떼기 최대 프레임(ms) · 둘째 떼기 최대 프레임 · 가만히/꾹/벨 때 p10 fps
 *   통과선(🧪 M3 S4·S5): 첫 떼기 최대 프레임 ≤ 34ms가 N/N · 50ms 이상 0 · 켠 뒤 3초 최대 프레임 ≤ 50ms N/N
 */
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: any };
const N = Number(process.argv[2]) || 10;
const file = pathToFileURL(join(import.meta.dirname, '../../web/public/studio/slowdash/index.html')).href;
const b = await chromium.launch();
const rows: string[] = [];
let bad = 0, over = 0, total = 0;
for (const [name, q] of [['1-1', 'stage=1'], ['2-10', 'trial=1&stage=20'], ['2-6 대나무', 'trial=1&stage=16']]) {
  const firsts: number[] = [], seconds: number[] = [], loads: number[] = [];
  for (let seed = 1; seed <= N; seed++) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    if (process.env.MUTE) await p.addInitScript("localStorage.setItem('slowdash:mute', '1')"); // 원인 가르기: 소리 끔
    if (process.env.FONTWARM) await p.addInitScript("addEventListener('load', () => { const c = document.createElement('canvas').getContext('2d'); for (const w of [700, 800, 900]) for (let z = 12; z <= 34; z++) { c.font = w + ' ' + z + 'px system-ui, sans-serif'; c.fillText('0123456789명베기싹쓸이탁팅챙펑휙아얏!×', 0, 20); } })"); // 원인 가르기: 글자 미리 그림
    const cdp = await p.context().newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await p.goto(`${file}?seed=${seed}&${q}&dpr=2${process.env.NOWARM ? '&warm=0' : ''}`);
    await p.evaluate('window.__f = []; { let l = performance.now(); const g = (t) => (window.__f.push(t - l), (l = t), requestAnimationFrame(g)); requestAnimationFrame(g); }'); // 글로 넘김(tsx의 __name이 페이지에 없음)
    await p.waitForTimeout(3000); // 🧪 S5: 켠 뒤 3초 최대 프레임(예열이 화면을 멈추지 않는지)
    loads.push(Math.round(Math.max(...((await p.evaluate('window.__f.slice(1)')) as number[]))));
    const box = await (await p.$('canvas')).boundingBox();
    const at = (x: number, y: number) => [box.x + x * box.width, box.y + y * box.height];
    for (let i = 0; i < 2; i++) {
      await p.mouse.move(...at(0.5, 0.75));
      await p.mouse.down();
      await p.mouse.move(...at(0.5 + (seed % 3 - 1) * 0.15, 0.3), { steps: 10 });
      await p.waitForTimeout(500);
      await p.evaluate('window.__f.length = 0');
      await p.mouse.up();
      await p.waitForTimeout(900);
      const f: number[] = await p.evaluate('window.__f.slice(1)');
      (i ? seconds : firsts).push(Math.round(Math.max(...f)));
    }
    await p.close();
  }
  const ok = firsts.filter((x) => x <= 34).length, b50 = firsts.filter((x) => x >= 50).length, lok = loads.filter((x) => x <= 50).length;
  (bad += N - ok + N - lok), (over += b50), (total += N);
  rows.push(`${name}: 켠 뒤 3초 최대 [${loads.join(' ')}]ms · ≤50ms ${lok}/${N} · 첫 떼기 최대 [${firsts.join(' ')}]ms · ≤34ms ${ok}/${N} · ≥50ms ${b50} · 둘째 [${seconds.join(' ')}]`);
}
await b.close();
console.log(rows.join('\n'));
console.log(`렉 측정(시드 ${N} · ${process.env.MUTE ? '소리 끔' : '소리 켬'} · CPU 4배 · DPR 2): 통과선 밖 ${bad}번(첫 떼기 > 34ms · 켠 뒤 > 50ms) · 첫 떼기 ≥50ms ${over} → ${bad === 0 && over === 0 ? '✅' : '❌'}`);
