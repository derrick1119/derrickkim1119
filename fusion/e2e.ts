/**
 * 교차점 E2E: 빌드된 사이트에서 데일리(라이트/다크) · 박물관 · 플레이테스트를 실제로 풀어본다.
 *   npm run build && npm run fusion:e2e
 * 스크린샷: fusion/reports/screens/
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = join(import.meta.dirname, '..');
const shots = join(import.meta.dirname, 'reports', 'screens');
mkdirSync(shots, { recursive: true });
const PORT = 4181;
const server = spawn(join(root, 'node_modules', '.bin', 'vite'), ['preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'pipe' });
process.on('exit', () => server.kill());
await new Promise<void>((res, rej) => {
  server.stdout.on('data', (d) => d.toString().includes(String(PORT)) && res());
  server.stderr.on('data', (d) => rej(new Error('preview: ' + d)));
  setTimeout(() => rej(new Error('preview timeout')), 15000);
});

const idx = JSON.parse(readFileSync(join(root, 'web/public/fusion/daily/index.json'), 'utf8'));
const date: string = idx.dates[0];
const daily = JSON.parse(readFileSync(join(root, `web/public/fusion/daily/${date}.json`), 'utf8'));
const base = `http://localhost:${PORT}/fusion.html`;

let failed = false;
const browser = await chromium.launch();
try {
  for (const scheme of ['light', 'dark'] as const) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e: Error) => errors.push(e.message));
    page.on('console', (m: any) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(`${base}?d=${date}&preview`);
    await page.waitForSelector('.cell');
    await page.screenshot({ path: join(shots, `start-${scheme}.png`), fullPage: true });
    await page.click('#btn-hint');
    const msg: string = (await page.textContent('#hint-msg')) ?? '';
    if (msg.length < 8) throw new Error('hint produced no explanation');
    await page.screenshot({ path: join(shots, `hint-${scheme}.png`) });
    const cells = page.locator('.cell');
    for (let i = 0; i < daily.solution.length; i++) {
      if (daily.solution[i] === '1' && daily.clues[i] === null) await cells.nth(i).click();
    }
    await page.waitForSelector('dialog#win[open]', { timeout: 5000 });
    await page.screenshot({ path: join(shots, `win-${scheme}.png`) });
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    if (scrollW > 390) throw new Error(`horizontal scroll: ${scrollW}px`);
    if (errors.length) throw new Error('console errors: ' + errors.join(' | '));
    console.log(`fusion e2e daily ${scheme}: OK (${daily.rules}, hint="${msg.slice(0, 36)}…")`);
    await ctx.close();
  }

  // 박물관 카드 → 갤러리 퍼즐 로드
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${base}?d=${date}&preview`);
    await page.waitForSelector('.card');
    const n = await page.locator('.card').count();
    if (n < 1) throw new Error('museum is empty');
    await page.locator('.card').first().locator('button[data-i="2"]').click();
    await page.waitForFunction(() => document.getElementById('disc-label')?.textContent === '발견 박물관');
    await page.screenshot({ path: join(shots, `museum.png`), fullPage: true });
    console.log(`fusion e2e museum: OK (${n} cards)`);
    await page.close();
  }

  // 플레이테스트: 아무 조합이나 즉석 생성
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors: string[] = [];
    page.on('pageerror', (e: Error) => errors.push(e.message));
    await page.goto(`${base}?play=fx-knight-x-balanced&seed=3&tier=easy`);
    await page.waitForSelector('.cell');
    const meta = await page.textContent('#meta');
    if (!meta?.includes('플레이테스트')) throw new Error('playtest did not load');
    if (errors.length) throw new Error(errors.join(' | '));
    console.log('fusion e2e playtest: OK');
    await page.close();
  }
} catch (e) {
  failed = true;
  console.error(e);
} finally {
  await browser.close();
  server.kill();
}
process.exit(failed ? 1 : 0);
