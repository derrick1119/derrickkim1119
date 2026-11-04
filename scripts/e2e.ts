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
} catch (e) {
  failed = true;
  console.error(e);
} finally {
  await browser.close();
  server.kill();
}
process.exit(failed ? 1 : 0);
