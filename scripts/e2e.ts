/**
 * 실제 브라우저 E2E: 빌드된 사이트를 띄워 퍼즐을 힌트로 일부, 정답으로 나머지를 풀고
 * 승리 화면이 뜨는지 확인한다. 스크린샷은 factory/reports/screens/ 에 남는다.
 *
 *   npm run build && npm run e2e
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { generate } from '../engine/generator.ts';
import { getRules } from '../engine/rules/index.ts';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = join(import.meta.dirname, '..');
const shots = join(root, 'factory', 'reports', 'screens');
mkdirSync(shots, { recursive: true });
const PORT = 4179;
const server = spawn(join(root, 'node_modules', '.bin', 'vite'), ['preview', '--port', String(PORT), '--strictPort'], {
  cwd: root,
  stdio: 'pipe',
});
process.on('exit', () => server.kill());
await new Promise<void>((res, rej) => {
  server.stdout.on('data', (d) => d.toString().includes(String(PORT)) && res());
  server.stderr.on('data', (d) => rej(new Error('preview server: ' + d)));
  setTimeout(() => rej(new Error('preview server timeout')), 15000);
});

const idx = JSON.parse(readFileSync(join(root, 'web/public/puzzles/index.json'), 'utf8'));
const date: string = process.env.E2E_DATE ?? idx.dates[0];
const p = JSON.parse(readFileSync(join(root, `web/public/puzzles/${date}.json`), 'utf8'));

let failed = false;
const browser = await chromium.launch();
try {
  for (const scheme of ['light', 'dark'] as const) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e: Error) => errors.push(e.message));
    page.on('console', (m: { type(): string; text(): string }) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(`http://localhost:${PORT}/?d=${date}&preview`);
    await page.waitForSelector('.cell');
    await page.screenshot({ path: join(shots, `start-${scheme}.png`) });

    // 힌트가 설명을 내놓는지
    await page.click('#btn-hint');
    const msg = await page.textContent('#hint-msg');
    if (!msg || msg.length < 10) throw new Error('hint produced no explanation');
    await page.locator('.clue').first().click();
    await page.screenshot({ path: join(shots, `hint-${scheme}.png`) });

    // 정답대로 칠하기
    const cells = page.locator('.cell');
    for (let i = 0; i < p.solution.length; i++) {
      if (p.solution[i] === '1') await cells.nth(i).click();
    }
    await page.waitForSelector('dialog#win[open]', { timeout: 5000 });
    await page.screenshot({ path: join(shots, `win-${scheme}.png`) });
    if (errors.length) throw new Error('console errors: ' + errors.join(' | '));
    console.log(`e2e ${scheme}: OK (${date}, ${p.width}x${p.height}, hint="${msg.slice(0, 40)}…")`);
    await ctx.close();
  }

  // 플레이테스트 모드: 브라우저 즉석 생성 퍼즐이 Node 생성 결과와 같아야(결정성) 이 정답으로 풀린다
  const PLAY = { rules: 'fam-d3-cheb-no2x2', seed: 7, tier: 'easy' as const, size: 6 };
  const pp = generate(getRules(PLAY.rules), { width: PLAY.size, height: PLAY.size, seed: PLAY.seed, target: PLAY.tier })!;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e: Error) => errors.push(e.message));
  page.on('console', (m: { type(): string; text(): string }) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`http://localhost:${PORT}/?play=${PLAY.rules}&seed=${PLAY.seed}&tier=${PLAY.tier}`);
  await page.waitForSelector('.cell');
  const genMs = await page.getAttribute('#meta', 'data-gen-ms');
  const clues = await page.locator('.cell').evaluateAll((els: Element[]) => els.map((e) => e.textContent || null));
  const expected = pp.clues.map((c) => (c === null ? null : String(c)));
  if (JSON.stringify(clues) !== JSON.stringify(expected)) throw new Error('playtest: browser puzzle differs from node');
  await page.screenshot({ path: join(shots, 'play-start.png') });
  const pc = page.locator('.cell');
  for (let i = 0; i < pp.solution.length; i++) if (pp.solution[i] === '1') await pc.nth(i).click();
  await page.waitForSelector('dialog#win[open]', { timeout: 5000 });
  await page.screenshot({ path: join(shots, 'play-win.png') });
  if (errors.length) throw new Error('playtest console errors: ' + errors.join(' | '));
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  if (scrollW > 390) throw new Error(`playtest horizontal scroll: ${scrollW}px`);
  console.log(`e2e playtest: OK (${PLAY.rules} seed ${PLAY.seed} ${PLAY.tier}, gen ${genMs}ms)`);
  await ctx.close();

  // 0012: 힌트만 따라가도 끝까지 풀리는가 + 문구가 규칙에 맞는가 (3라운드 후보)
  {
    const H = { rules: 'fam-d1-xline-notouch', seed: 1, tier: 'hard' as const, size: 7 };
    const hp = generate(getRules(H.rules), { width: H.size, height: H.size, seed: H.seed, target: H.tier })!;
    const hctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const hpage = await hctx.newPage();
    const herr: string[] = [];
    hpage.on('pageerror', (e: Error) => herr.push(e.message));
    hpage.on('console', (m: { type(): string; text(): string }) => m.type() === 'error' && herr.push(m.text()));
    await hpage.goto(`http://localhost:${PORT}/?play=${H.rules}&seed=${H.seed}&tier=${H.tier}`);
    await hpage.waitForSelector('.cell');
    const msgs = new Set<string>();
    let n = 0;
    const cellsH = hpage.locator('.cell');
    // 풀리면 힌트 버튼이 꺼지고 승리 창은 650ms 뒤에 뜬다
    while (!(await hpage.locator('#btn-hint').isDisabled())) {
      if (++n > hp.width * hp.height) throw new Error('hint-only solve did not finish');
      await hpage.click('#btn-hint');
      const m = (await hpage.textContent('#hint-msg')) ?? '';
      if (m.length < 10) throw new Error(`empty hint at step ${n}`);
      msgs.add(m.replace(/\d+/g, '#'));
      if (n === 3) await hpage.screenshot({ path: join(shots, 'play-hint-xline.png') });
      const targets: number[] = await hpage.locator('.cell.hint-target').evaluateAll((els: Element[]) =>
        els.map((e) => Number((e as HTMLElement).dataset.i)));
      if (!targets.length) throw new Error(`hint without target at step ${n}: ${m}`);
      for (const i of targets) {
        if (hp.solution[i] === '1') await cellsH.nth(i).click();
        else await cellsH.nth(i).click({ button: 'right' });
        if (await hpage.locator('#btn-hint').isDisabled()) break;
      }
    }
    await hpage.waitForSelector('dialog#win[open]', { timeout: 5000 });
    // 메아리 전용 단어 금지 + 받침 뒤 '를' 같은 조사 오류 금지
    const bad = [...msgs].filter((m) => /고리|테두리|칸를/.test(m));
    if (bad.length) throw new Error('echo-only wording in hints: ' + bad.join(' | '));
    if (herr.length) throw new Error('hint-solve console errors: ' + herr.join(' | '));
    await hpage.screenshot({ path: join(shots, 'play-hint-win.png') });
    console.log(`e2e hint-solve: OK (${H.rules} ${H.tier}, ${n} hints, ${msgs.size} distinct messages)`);
    for (const m of msgs) console.log('   · ' + m);
    await hctx.close();
  }
} catch (e) {
  failed = true;
  console.error(e);
} finally {
  await browser.close();
  server.kill();
}
process.exit(failed ? 1 : 0);
