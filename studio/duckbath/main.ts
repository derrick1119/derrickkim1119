/**
 * 플레이 빌드의 브라우저 쪽 — arcade/play.ts의 'touch' 부분을 옮겨 왔다.
 * 조작: 물을 꾹 누르면 미리 보기, 떼면 찰박 · 키보드 화살표로 커서, 스페이스를 누르는 동안 미리 보기 → 떼면 찰박.
 */
import { TICK, type Input } from './core.ts';
import { duckbath as g, type DuckState } from './game.ts';
import { peek } from './juice.ts';

const store = {
  get(k: string) { try { return Number(localStorage.getItem('duckbath:' + k) ?? 0); } catch { return 0; } },
  set(k: string, v: number) { try { localStorage.setItem('duckbath:' + k, String(v)); } catch { /* 저장 불가여도 동작 */ } },
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
let s: DuckState = g.create(1), running = false, acc = 0, last = 0, keyboard = false, spaceDown = false;
let pointer: { x: number; y: number } | null = null, latch: { x: number; y: number } | null = null, cursor = { x: 0.5, y: 0.5 };
const keys = new Set<string>();
(globalThis as any).__duck = { state: () => s, running: () => running };

function size() {
  // D001 (ART 10장 ①): 머리 44px를 뺀 화면 높이에 맞춘다 — 390×844에서 390×593(화면 70%)
  const w = Math.min(root.clientWidth, 440, Math.floor((innerHeight - 44 - 8) / aspect)), dpr = window.devicePixelRatio || 1;
  canvas.style.borderRadius = w >= 440 ? '14px' : '0';
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
    // 아주 짧은 탭도 최소 한 틱은 '누름'으로 보이게
    const input: Input = { tap: false, dir: 0, pointer: pointer ?? latch };
    latch = null;
    g.step(s, input);
    acc -= TICK;
    if (g.over(s)) {
      running = false;
      const sc = g.score(s), best = Math.max(sc, store.get('best'));
      store.set('best', best);
      draw();
      show(`<b>${sc}점</b><span>최고 ${best}점 · 누르면 다시</span>`);
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
  if (running) pointer = latch = toPoint(e);
});
canvas.addEventListener('pointermove', (e) => void (pointer && e.buttons && (pointer = toPoint(e))));
window.addEventListener('pointerup', () => (pointer = null));
canvas.addEventListener('pointercancel', () => (pointer = null));
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
overlay.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') (e.preventDefault(), start());
});
size();
// 규칙 2줄(GDD §2)은 머리 대신 시작 카드에 (ART 10장 ①·⑤ 1차)
const touchFirst = !matchMedia('(hover:hover) and (pointer:fine)').matches;
show(`<b>🦆 목욕 시작</b><span>물을 톡! 찰박 물결이 오리를 둥지로</span><span>${touchFirst ? '👆 꾹 누르면 갈 길 · 떼면 찰박!' : '⌨️ 화살표 · 스페이스 꾹 → 떼면 찰박'}</span>`);
new ResizeObserver(size).observe(root);
