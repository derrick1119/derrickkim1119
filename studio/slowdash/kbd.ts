/**
 * ✏️ M2 S10 키보드 E2E(📋 M2 완료 기준): 마우스·터치 없이 키보드만으로 판 고르기 → 1-1 끝까지 → 결과 화면.
 *   npx tsx studio/slowdash/build.ts && npx tsx studio/slowdash/kbd.ts → studio/slowdash/screens/24~26-kbd-*.png
 *   Tab으로 '판' 단추 → Enter(판 고르기) → Enter(1-1) → 화살표로 겨누고 스페이스를 누른 채 화살표로 꺾어 긋고 뗀다.
 *   1-1은 뒤집히지 않고(1판) 허수아비가 가만히 있어서 자리가 정해져 있다. 깼는지는 저장된 별(localStorage)로 본다.
 *   실패하면 종료 코드 1.
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: any };
const here = import.meta.dirname, out = join(here, 'screens');
mkdirSync(out, { recursive: true });
const url = pathToFileURL(join(here, '../../web/public/studio/slowdash/index.html')).href + '?seed=1';
const A = 1.52, STEP_X = 0.012, STEP_Y = (0.012 / A) * 1.4; // main.ts: 화살표 한 틱(1/60초)에 커서가 움직이는 양(캔버스 비율)
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errors: string[] = [];
page.on('pageerror', (e: unknown) => errors.push(String(e)));
page.on('console', (m: { type(): string; text(): string }) => m.type() === 'error' && errors.push(m.text()));
await page.goto(url);
await page.waitForTimeout(400);

// 1) Tab으로 '판' 단추까지 — 키보드만
let onPick = false;
for (let i = 0; i < 12 && !onPick; i++) {
  await page.keyboard.press('Tab');
  onPick = await page.evaluate(() => document.activeElement?.id === 'pick');
}
if (!onPick) throw new Error('Tab으로 판 단추에 못 감');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
const opened = await page.evaluate(() => document.activeElement?.closest('.g-pick, [hidden]') !== null && (document.activeElement as HTMLElement)?.dataset.k === '0');
await page.screenshot({ path: join(out, '24-kbd-picker.png') });
if (!opened) throw new Error('판 고르기가 열리고 1-1 칸에 초점이 가야 함');
await page.keyboard.press('Enter'); // 1-1
await page.waitForTimeout(900);
const canvasFocused = await page.evaluate(() => document.activeElement?.tagName === 'CANVAS');
if (!canvasFocused) throw new Error('판을 고르면 캔버스에 초점이 가야 함');

// 커서(캔버스 비율 x, y) — 시작은 (0.5, 0.55). 화살표를 누르고 있는 시간으로 옮긴다(틱 단위로 어림)
const cur = { x: 0.5, y: 0.55 };
const hold = async (key: string, ticks: number) => {
  if (ticks <= 0) return;
  await page.keyboard.down(key);
  await page.waitForTimeout(Math.round((ticks * 1000) / 60));
  await page.keyboard.up(key);
};
/** 게임 좌표(x, 판 y)로 커서를 옮긴다 — 가로·세로를 차례로 */
const moveTo = async (x: number, y: number) => {
  const tx = x, ty = y / A, nx = Math.round(Math.abs(tx - cur.x) / STEP_X), ny = Math.round(Math.abs(ty - cur.y) / STEP_Y);
  await hold(tx > cur.x ? 'ArrowRight' : 'ArrowLeft', nx);
  await hold(ty > cur.y ? 'ArrowDown' : 'ArrowUp', ny);
  (cur.x = tx), (cur.y = ty);
};
const slash = async (pts: [number, number][]) => {
  await moveTo(...pts[0]);
  await page.keyboard.down(' ');
  for (const p of pts.slice(1)) await moveTo(...p); // 누른 채 화살표 = 한붓 획
  await page.waitForTimeout(80);
  await page.keyboard.up(' ');
  await page.waitForTimeout(900);
};
// 1-1 무리(game.ts 1판): ① 세로 셋 (.5, .95 · .79 · .63) ② 가로 넷 y 1.0 ③ 가로 다섯 y .62 + 세로 x .7
await slash([[0.5, 0.5]]); // 곧게 위로 — 셋
await page.screenshot({ path: join(out, '25-kbd-sweep.png') });
await page.waitForTimeout(1200);
await slash([[0.12, 1.0], [0.9, 1.0]]); // 줄 왼쪽 끝에서 오른쪽으로 쭉 — 넷
await page.waitForTimeout(1200);
await slash([[0.7, 0.98], [0.7, 0.62], [0.14, 0.62]]); // ㄱ자: 세로 줄을 타고 올라가 가로 줄로 — 일곱
let cleared = false;
for (let i = 0; i < 30 && !cleared; i++) {
  cleared = await page.evaluate(() => Number(localStorage.getItem('slowdash:st:dummy') ?? 0) >= 1);
  if (!cleared) await page.waitForTimeout(200);
}
await page.screenshot({ path: join(out, '26-kbd-clear.png') });
await browser.close();
console.log(`키보드 E2E: 판 고르기 ${onPick && opened ? '✅' : '❌'} · 1-1 클리어 ${cleared ? '✅' : '❌'} · 콘솔 에러 ${errors.length}`);
if (!cleared || errors.length) process.exitCode = 1;
