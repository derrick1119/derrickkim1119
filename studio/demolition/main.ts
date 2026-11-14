/**
 * 플레이 빌드의 브라우저 쪽 (M0) — arcade/play.ts의 'touch' 부분만 옮겨 왔다.
 * 조작: 블록을 꾹 누르면 무너질 모양 미리 보기, 떼면 폭약 · 키보드 화살표로 커서, 스페이스를 누르는 동안 미리 보기 → 떼면 붙이기.
 */
import { TICK, type Input } from './core.ts';
import { CW, demolition as g, newStage, SX, SY, type DemoState } from './game.ts';
import { peek } from './juice.ts';

const KEY = 'studio:demolition:best';
const store = {
  get() { try { return Number(localStorage.getItem(KEY) ?? 0); } catch { return 0; } },
  set(v: number) { try { localStorage.setItem(KEY, String(v)); } catch { /* 저장 불가여도 동작 */ } },
};

const root = document.getElementById('game')!;
const aspect = g.aspect ?? 1;
const canvas = document.createElement('canvas');
canvas.className = 'g-canvas';
canvas.tabIndex = 0;
canvas.setAttribute('aria-label', `${g.name} 게임 화면. ${g.rules.join(' ')} 키보드는 화살표로 고르고 스페이스.`);
const overlay = document.createElement('button');
overlay.type = 'button';
overlay.className = 'g-overlay';
root.append(canvas, overlay);
const ctx = canvas.getContext('2d')!;
let s: DemoState = g.create(1), running = false, acc = 0, last = 0, keyboard = false, spaceDown = false;
let pointer: { x: number; y: number } | null = null, latch: { x: number; y: number } | null = null, cursor = { x: 0.5, y: 0.6 };
const keys = new Set<string>();

function size() {
  const w = Math.min(root.clientWidth, 440), dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${w * aspect}px`;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(w * aspect * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
function draw() {
  const dpr = window.devicePixelRatio || 1, w = canvas.width / dpr, h = canvas.height / dpr;
  g.draw(ctx, s, w, h, g.art!.palette);
  peek(s)?.render(ctx, w, h);
  if (keyboard && running) {
    ctx.strokeStyle = spaceDown ? '#ffffff' : 'rgba(255,255,255,.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cursor.x * w, cursor.y * h, spaceDown ? 7 : 10, 0, Math.PI * 2);
    ctx.stroke();
  }
}
function show(html: string) {
  overlay.innerHTML = html;
  overlay.hidden = false;
}
function start() {
  s = g.create((Date.now() % 1_000_000) + 1);
  running = true;
  overlay.hidden = true;
  last = performance.now();
  acc = 0;
  canvas.focus({ preventScroll: true });
  requestAnimationFrame(loop);
}
function loop(now: number) {
  if (!running) return;
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (acc >= TICK) {
    const kx = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0), ky = (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0);
    cursor = { x: Math.max(0, Math.min(1, cursor.x + kx * 0.012)), y: Math.max(0, Math.min(1, cursor.y + ky * 0.012)) };
    if (spaceDown) pointer = { ...cursor };
    // 아주 짧은 탭(한 프레임 안에 눌렀다 뗌)도 최소 한 틱은 '누름'으로 보이게
    const input: Input = { tap: false, dir: 0, pointer: pointer ?? latch };
    latch = null;
    g.step(s, input);
    acc -= TICK;
    if (g.over(s)) {
      running = false;
      const sc = g.score(s), best = Math.max(sc, store.get());
      store.set(best);
      draw();
      show(`<b>${s.won ? '마을 철거 끝! 🏗️' : '오늘 작업 끝'}</b><span>별 ${s.stars}개 · ${sc}점 · 최고 ${best}점</span><span>누르면 다시</span>`);
      return;
    }
  }
  draw();
  requestAnimationFrame(loop);
}
const toPoint = (e: PointerEvent) => {
  const r = canvas.getBoundingClientRect();
  return { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) };
};
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!running) return;
  keyboard = false;
  pointer = latch = toPoint(e);
});
canvas.addEventListener('pointermove', (e) => void (pointer && e.buttons && (pointer = toPoint(e))));
canvas.addEventListener('pointerleave', () => void (pointer = null));
window.addEventListener('pointerup', () => void (pointer = null));
canvas.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter' || e.key.startsWith('Arrow')) e.preventDefault();
  if (!running && (e.key === ' ' || e.key === 'Enter')) return start();
  if (e.key.startsWith('Arrow')) (keys.add(e.key), (keyboard = true));
  if (e.key === ' ' && running) (spaceDown = true), (pointer = { ...cursor });
});
canvas.addEventListener('keyup', (e) => {
  keys.delete(e.key);
  if (e.key === ' ') (spaceDown = false), (pointer = null);
});
overlay.addEventListener('click', start);
size();
show(`<b>💥 시작</b><span>${g.hint}</span>`);
new ResizeObserver(size).observe(root);

/** 판독 시험용(🧪 C005, 2D 기준선): 판 k를 뒤집지 않고 열어 블록 (x, y)를 꾹 누른 장면을 멈춰 그린다 */
(window as unknown as { __d2: object }).__d2 = {
  preview(k: number, x: number, y: number) {
    running = false;
    overlay.hidden = true;
    s = g.create(1);
    s.stage = k;
    s.flips[k] = false;
    newStage(s);
    s.wait = false;
    s.t = 400;
    s.newsQ = [];
    s.news = null;
    s.down = true;
    s.aim = { x: SX(x) + CW / 2, y: SY(y) + CW / 2 };
    draw();
  },
};
