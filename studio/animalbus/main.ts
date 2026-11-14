/**
 * 플레이 빌드의 브라우저 쪽 — arcade/play.ts의 'touch' 부분을 이 게임만 쓰게 옮겨 왔다(M0).
 * 조작: 동물을 꾹 누르면 갈 길 미리 보기, 떼면 톡 · 키보드 화살표로 커서, 스페이스를 누르는 동안 미리 보기 → 떼면 톡.
 * 하트를 다 쓰면 끝 카드 → 누르면 그 판부터 이어서(처음으로 돌려보내지 않는다, 오너 기준 7).
 */
import { TICK, type Input } from './core.ts';
import { STAGES, animalbus as g, animalbusSmart, startStage, type BusState } from './game.ts';
import { peek } from './juice.ts';

const store = {
  get(k: string) { try { return Number(localStorage.getItem('studio-animalbus:' + k) ?? 0); } catch { return 0; } },
  set(k: string, v: number) { try { localStorage.setItem('studio-animalbus:' + k, String(v)); } catch { /* 저장 불가여도 동작 */ } },
};

const root = document.getElementById('game')!;
const aspect = g.aspect ?? 1;
const canvas = document.createElement('canvas');
canvas.className = 'g-canvas';
canvas.tabIndex = 0;
canvas.setAttribute('aria-label', `${g.name} 게임 화면. ${g.rules.join(' ')} 키보드는 화살표로 고르고 스페이스.`);
const overlay = document.createElement('button');
overlay.hidden = true;
overlay.type = 'button';
overlay.className = 'g-overlay';
root.append(canvas, overlay);
const ctx = canvas.getContext('2d')!;
let s: BusState = g.create(1), running = false, acc = 0, last = 0, keyboard = false, spaceDown = false, from = 0;
let pointer: { x: number; y: number } | null = null, latch: { x: number; y: number } | null = null, cursor = { x: 0.5, y: 0.6 };
const keys = new Set<string>();
// 확인용(shots.ts): 상태 보기 · i번째 판으로 건너뛰기
(globalThis as any).__bus = { state: () => s, running: () => running, jump: (i: number) => startStage(s, i), next: () => animalbusSmart.act(s, Math.random).pointer ?? null };

function size() {
  const w = Math.min(root.clientWidth, 440, Math.floor((innerHeight - 44 - 8) / aspect)), dpr = window.devicePixelRatio || 1;
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
  overlay.focus({ preventScroll: true });
}
function start() {
  s = g.create((Date.now() % 1_000_000) + 1);
  if (from > 0) startStage(s, from);
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
    cursor = { x: Math.max(0, Math.min(1, cursor.x + kx * 0.012)), y: Math.max(0, Math.min(1, cursor.y + ky * 0.008)) };
    if (spaceDown) pointer = { ...cursor };
    // 아주 짧은 탭(한 프레임 안에 눌렀다 뗌)도 최소 한 틱은 '누름'으로 보이게
    const input: Input = { tap: false, dir: 0, pointer: pointer ?? latch };
    latch = null;
    g.step(s, input);
    acc -= TICK;
    if (g.over(s)) {
      running = false;
      const sc = g.score(s), best = Math.max(sc, store.get('best'));
      store.set('best', best);
      draw();
      if (s.won) (from = 0), show(`<b>🚌 퇴근길까지 모두 태웠어요!</b><span>${sc}점 · ★${s.stars} · 최고 ${best}점</span><span>누르면 처음부터</span>`);
      else (from = s.stage), show(`<b>하트를 다 썼어요</b><span>${sc}점 · ★${s.stars}</span><span>누르면 ${s.stage + 1}판 「${STAGES[s.stage].name}」부터 다시</span>`);
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
  keyboard = false;
  if (running) pointer = latch = toPoint(e);
});
canvas.addEventListener('pointermove', (e) => void (pointer && e.buttons && (pointer = toPoint(e))));
canvas.addEventListener('pointerleave', () => (pointer = null));
window.addEventListener('pointerup', () => (pointer = null));
canvas.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key.startsWith('Arrow') || e.key === 'Enter') e.preventDefault();
  if (!running && (e.key === ' ' || e.key === 'Enter')) return start();
  if (e.key.startsWith('Arrow')) (keys.add(e.key), (keyboard = true));
  if (e.key === ' ' && running) (spaceDown = true), (pointer = { ...cursor });
});
canvas.addEventListener('keyup', (e) => {
  keys.delete(e.key);
  if (e.key === ' ') (spaceDown = false), (pointer = null);
});
window.addEventListener('blur', () => (keys.clear(), (spaceDown = false), (pointer = null)));
overlay.addEventListener('click', start);
size();
start(); // 처음 온 사람은 시작 카드 없이 바로 1판 (오너 기준 2: 첫 3초)
new ResizeObserver(size).observe(root);
