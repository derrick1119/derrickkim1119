/**
 * 양치기 멍멍 — 플레이 빌드 진입점 (M0: 발견 공장 arcade/play.ts의 'touch' 조작부를 이 게임 전용으로 옮김).
 * 시뮬레이션과 같은 코드로 60fps 고정 틱. 조작: 목장을 누르고 있으면 미리 보기, 떼면 멍! · 화살표로 커서 + 스페이스.
 */
import { TICK, type Input } from './core.ts';
import { peek } from './juice.ts';
import { sheepdog as g, type DogState } from './game.ts';

const store = {
  get(k: string) { try { return Number(localStorage.getItem('sheepdog:' + k) ?? 0); } catch { return 0; } },
  set(k: string, v: number) { try { localStorage.setItem('sheepdog:' + k, String(v)); } catch { /* 저장 불가여도 동작 */ } },
};

const root = document.getElementById('stage')!;
const canvas = document.getElementById('game') as HTMLCanvasElement;
const overlay = document.getElementById('overlay') as HTMLElement;
const startBtn = document.getElementById('start') as HTMLButtonElement;
const best = document.getElementById('best')!;
const retryBtn = document.getElementById('retry') as HTMLButtonElement;
const ctx = canvas.getContext('2d')!;
const aspect = g.aspect ?? 1;

let s: DogState = g.create(1), running = false, acc = 0, last = 0, keyboard = false, spaceDown = false, retry = false;
let pointer: { x: number; y: number } | null = null, latch: { x: number; y: number } | null = null, cursor = { x: 0.5, y: 0.55 };
const keys = new Set<string>();
let W = 0, H = 0;

function size() {
  const dpr = window.devicePixelRatio || 1;
  const avW = root.clientWidth, avH = root.clientHeight;
  W = Math.min(avW, avH / aspect);
  H = W * aspect;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // ↺ 다시 버튼: 캔버스 오른쪽 위 모서리
  retryBtn.style.left = `${canvas.offsetLeft + W - 46}px`;
  retryBtn.style.top = `${canvas.offsetTop + 2}px`;
  draw();
}

function draw() {
  g.draw(ctx, s, W, H, g.art!.palette);
  peek(s)?.render(ctx, W, H);
  if (keyboard && running) {
    ctx.strokeStyle = spaceDown ? '#ffffff' : 'rgba(255,255,255,.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cursor.x * W, cursor.y * H, spaceDown ? 7 : 11, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function showTitle(html?: string) {
  if (html) document.getElementById('msg')!.innerHTML = html;
  const b = store.get('best');
  best.textContent = b ? `최고 ${b}점` : '';
  overlay.hidden = false;
  retryBtn.hidden = true;
  startBtn.focus({ preventScroll: true });
}

function start() {
  s = g.create((Date.now() % 1_000_000) + 1);
  running = true;
  overlay.hidden = true;
  retryBtn.hidden = false;
  acc = 0;
  last = performance.now();
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
    const input: Input = { tap: false, dir: 0, pointer: pointer ?? latch, retry };
    latch = null;
    retry = false;
    g.step(s, input);
    acc -= TICK;
    if (g.over(s)) {
      running = false;
      const sc = g.score(s), b = Math.max(sc, store.get('best'));
      store.set('best', b);
      draw();
      showTitle(`<p class="big">★ ${s.stars} / ${s.best.length * 3}</p><p>${s.won ? '모든 목장의 양을 집에 데려다줬어요! 🐑' : '오늘은 여기까지 — 다시 해 볼까요?'} · ${sc}점</p>`);
      startBtn.textContent = '다시 하기';
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
canvas.addEventListener('pointermove', (e) => { if (pointer && e.buttons) pointer = toPoint(e); });
window.addEventListener('pointerup', () => { pointer = null; });
canvas.addEventListener('pointercancel', () => { pointer = null; });
canvas.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key.startsWith('Arrow') || e.key === 'Enter') e.preventDefault();
  if (!running) return;
  if (e.key.startsWith('Arrow')) (keys.add(e.key), (keyboard = true));
  if ((e.key === 'r' || e.key === 'R') && !e.repeat) retry = true;
  if (e.key === ' ' || e.key === 'Enter') (keyboard = true), (spaceDown = true), (pointer = { ...cursor });
});
canvas.addEventListener('keyup', (e) => {
  keys.delete(e.key);
  if (e.key === ' ' || e.key === 'Enter') (spaceDown = false), (pointer = null);
});
startBtn.addEventListener('click', start);
retryBtn.addEventListener('click', () => {
  retry = true;
  canvas.focus({ preventScroll: true });
});
new ResizeObserver(size).observe(root);
size();
showTitle();
// 확인용(shots.ts): 지금 상태 읽기
(globalThis as unknown as { __sd: { state: () => DogState } }).__sd = { state: () => s };
