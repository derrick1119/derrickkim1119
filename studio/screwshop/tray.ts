/**
 * ✏️ S064(M3′ W1 · 🧪 S063 F29 → 📋 F32 · 📐 ① 글 끈 시험): 빈칸 쟁반이 '보이나'를 잰다 — `npx tsx studio/screwshop/tray.ts`
 * - F32: 같은 화면(1-2 · seed 7 · 띠가 지난 뒤)에서 빈칸만 3 → 4칸으로 바꿔 그렸을 때 바뀐 픽셀 몫(같은 3칸 두 장의 흔들림을 뺌) · 쟁반 밖 몫
 * - 글 끈 캡처: fillText · strokeText를 끈 390 화면(빌드 그대로) — 1-3(처음 봇 손 0) · 1-7(손 3)의 4칸 · 지는 톡 0.5 · 1초 → screens/n-*.png
 * 상태를 바꾸려고 main.ts에 창 훅만 붙인 사본을 임시 폴더에 굽는다(저장소 빌드는 안 바뀜).
 */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { STAGES } from './game.ts';
import { screwshopNewbie, tryStage } from './funqa.ts';

const R = import.meta.dirname, req = createRequire(join(R, '../../package.json'));
const { build } = req('esbuild'), { chromium } = req('playwright');
const hook = '\n;(window as any).__s = () => s;\n';
const js = (await build({ entryPoints: [join(R, 'main.ts')], bundle: true, minify: true, format: 'iife', write: false, target: 'es2022',
  plugins: [{ name: 'hook', setup(b: { onLoad: (o: object, f: () => object) => void }) { b.onLoad({ filter: /screwshop[\\/]main\.ts$/ }, () => ({ contents: readFileSync(join(R, 'main.ts'), 'utf8') + hook, loader: 'ts' })); } }] })).outputFiles[0].text;
const html = join(mkdtempSync(join(tmpdir(), 'tray-')), 'hook.html');
writeFileSync(html, readFileSync(join(R, 'index.html'), 'utf8').replace('/*BUNDLE*/', () => js.replace(/<\/script/g, '<\\/script')));
const NOTEXT = 'CanvasRenderingContext2D.prototype.fillText=function(){};CanvasRenderingContext2D.prototype.strokeText=function(){};';
const b = await chromium.launch(), errs: string[] = [];
const open = async (q: string, notext = false) => {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await c.addInitScript({ content: 'window.__name = (f) => f;' + (notext ? NOTEXT : '') }); // tsx가 evaluate 함수에 넣는 __name
  const p = await c.newPage();
  p.on('pageerror', (e: Error) => errs.push(String(e)));
  p.on('console', (m: { type: () => string; text: () => string }) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(`file://${html}?${q}`), await p.waitForTimeout(400), await p.click('.g-overlay');
  return [c, p] as const;
};

// F32: 빈칸 수만 바꿔 그리고 캔버스 픽셀을 바로 읽는다
const [c1, p1] = await open('seed=7&stage=2');
await p1.waitForTimeout(8000);
const grab = (n: number) => p1.evaluate(async (n: number) => {
  const w = window as unknown as { __s: () => any }, s = w.__s(), cols = [1, 1, 1, 5, 5];
  s.S.slots = cols.slice(0, n), (s.vs = s.S.slots.map((c: number, i: number) => ({ x: 0.5 + (i - 2) * 0.13, col: c, at: 0 }))), (s.lastTap = s.t), (s.taps = s.S.taps = 5);
  await new Promise((r) => setTimeout(r, 400));
  const cv = document.querySelector('canvas')!, x = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
  (window as unknown as { __px: Uint8ClampedArray[] }).__px ??= [];
  (window as unknown as { __px: Uint8ClampedArray[] }).__px.push(x);
  return [cv.width, cv.height];
}, n);
const [W, H] = await grab(3);
await grab(3), await grab(4);
const [noise, d34, out34] = await p1.evaluate(({ W, H }: { W: number; H: number }) => {
  const [a, b2, c] = (window as unknown as { __px: Uint8ClampedArray[] }).__px, ty0 = W * 0.26, ty1 = W * 0.37; // 쟁반 띠(판 좌표 y × 캔버스 폭 · TRAY_Y .312 ± .05)
  const diff = (p: Uint8ClampedArray, q: Uint8ClampedArray) => { let n = 0, o = 0; for (let i = 0; i < p.length; i += 4) if (Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]) > 48) { n++; const y = (i >> 2) / W; if (y < ty0 || y > ty1) o++; } return [n, o]; };
  const [nz] = diff(a, b2), [n, o] = diff(b2, c);
  return [nz / (W * H), n / (W * H), o / (W * H)];
}, { W, H });
await c1.close();

// 글 끈 캡처: 처음 봇 손을 그대로 톡한다(1.2초 간격)
const shots: string[] = [];
for (const [k, hand] of [[2, 0], [6, 3]] as const) {
  const t = tryStage(screwshopNewbie, 7, k, 600, hand), L = t.s.L, order: number[] = t.s.hist.map((h: { s: number }) => h.s);
  const before = t.s.hist.map((h: { S0: { slots: number[] } }) => h.S0.slots.length), slot = STAGES[k].slot;
  const [c, p] = await open(`seed=7&stage=${k + 1}`, true);
  await p.waitForTimeout(1500);
  const g = await p.evaluate(() => { const c = document.querySelector('canvas')!, r = c.getBoundingClientRect(); return [r.left, r.top, r.width, r.height, c.clientHeight / c.clientWidth]; });
  for (const [j, i] of order.entries()) {
    if (j === order.length - 1 && before[j] >= 4) shots.push(`n-${slot}-4`), await p.screenshot({ path: join(R, 'screens', `n-${slot}-4.png`) });
    await p.mouse.click(g[0] + L.px[i] * g[2], g[1] + (L.py[i] / g[4]) * g[3]);
    await p.waitForTimeout(j === order.length - 1 ? 500 : 1200);
  }
  await p.screenshot({ path: join(R, 'screens', `n-${slot}-05.png`) }), await p.waitForTimeout(500), await p.screenshot({ path: join(R, 'screens', `n-${slot}-10.png`) });
  shots.push(`n-${slot}-05`, `n-${slot}-10`, `${slot} 손 ${hand} 톡 ${order.length} · 마지막 톡 앞 빈칸 ${before[before.length - 1]} · 실패 ${t.s.S.fail}`);
  await c.close();
}
await b.close();
const rep = { f32: +(d34 - noise).toFixed(4), f32raw: +d34.toFixed(4), noise: +noise.toFixed(4), outside: +out34.toFixed(4), shots, errors: errs.length };
console.log(JSON.stringify(rep));
writeFileSync(join(R, 'reports', 'tray.json'), JSON.stringify(rep, null, 1) + '\n');
