/**
 * 느린 시간 닌자 — 플레이 빌드 진입점 (M0: 발견 공장 arcade/play.ts의 'touch' 조작부를 이 게임 전용으로 옮김).
 * 시뮬레이션과 같은 코드로 60fps 고정 틱. 조작: 꾹 누르고(누른 채 손가락으로 겨눔) 떼면 돌진 · 키보드 화살표로 커서 + 스페이스.
 */
import { TICK } from './core.ts';
import { peek } from './juice.ts';
import { STAGES, slowdash as g, type DashState } from './game.ts';

const store = {
  get(k: string) { try { return Number(localStorage.getItem('slowdash:' + k) ?? 0); } catch { return 0; } },
  set(k: string, v: number) { try { localStorage.setItem('slowdash:' + k, String(v)); } catch { /* 저장 불가여도 동작 */ } },
};

const root = document.getElementById('game')!;
const canvas = document.createElement('canvas');
canvas.className = 'g-canvas';
canvas.tabIndex = 0;
canvas.setAttribute('aria-label', `${g.name} 게임 화면. 꾹 누르면 느려지고 손가락까지 선이 보여요, 떼면 그 선으로 돌진해 베요. 키보드: 화살표로 겨누고 스페이스를 눌렀다 떼기`);
const overlay = document.createElement('button');
overlay.type = 'button';
overlay.className = 'g-overlay';
root.append(canvas, overlay);
const ctx = canvas.getContext('2d', { alpha: false })!;
const aspect = g.aspect ?? 1.52;
const pal = g.art!.palette;

const q = new URLSearchParams(location.search);
let s: DashState = g.create(1), running = false, acc = 0, last = 0, keyboard = false, spaceDown = false;
let pointer: { x: number; y: number } | null = null, latch: { x: number; y: number } | null = null, cursor = { x: 0.5, y: 0.55 };
const keys = new Set<string>();
let W = 0, H = 0;

function size() {
  const w = Math.min(root.clientWidth || 390, 460), dpr = Math.min(2, window.devicePixelRatio || 1);
  W = w;
  H = w * aspect;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function draw() {
  g.draw(ctx, s, W, H, pal);
  peek(s)?.render(ctx, W, H);
  if (keyboard && running) {
    ctx.strokeStyle = spaceDown ? '#ffffff' : 'rgba(255,255,255,.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cursor.x * W, cursor.y * H, spaceDown ? 7 : 10, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function show(html: string) {
  overlay.innerHTML = html;
  overlay.hidden = false;
}

function title() {
  const best = store.get('best');
  show(
    `<em>🥷</em><b>느린 시간 닌자</b>` +
      `<ul><li><i>👆</i>꾹 = 느려짐</li><li><i>⚡</i>떼면 번쩍 베기</li><li><i>🎋</i>한 줄에 여럿!</li></ul>` +
      `<strong>시작</strong>` +
      (best ? `<span class="best">최고 ${best}점</span>` : '') +
      `<span class="kbd">키보드: 화살표로 겨누고 스페이스 눌렀다 떼기</span>`,
  );
}

function start() {
  const seed = Number(q.get('seed')) || (Date.now() % 1_000_000) + 1;
  s = g.create(seed);
  running = true;
  overlay.hidden = true;
  pointer = latch = null;
  last = performance.now();
  acc = 0;
  canvas.focus({ preventScroll: true });
  requestAnimationFrame(loop);
}

function end() {
  running = false;
  const sc = g.score(s), best = Math.max(sc, store.get('best'));
  store.set('best', best);
  const stars = Math.max(s.stars, 0), cleared = s.won ? STAGES.length : s.stage;
  draw();
  show(
    `<em>${s.won ? '🏯' : '🍃'}</em><b>${sc}점</b>` +
      `<span class="msg">${s.won ? '성 마당까지 다 지나갔어요!' : `${cleared}판까지 지나갔어요`} · ★ ${stars}</span>` +
      `<span class="best">최고 ${best}점</span><strong>다시</strong>`,
  );
}

function loop(now: number) {
  if (!running) return;
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (acc >= TICK) {
    const kx = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0), ky = (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0);
    cursor = { x: Math.max(0, Math.min(1, cursor.x + kx * 0.012)), y: Math.max(0, Math.min(1, cursor.y + ky * 0.012 / aspect * 1.4)) };
    if (spaceDown) pointer = { ...cursor };
    // 아주 짧은 탭도 최소 한 틱은 '누름'으로 보이게
    g.step(s, { tap: false, dir: 0, pointer: pointer ?? latch });
    latch = null;
    acc -= TICK;
    if (g.over(s)) return void end();
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
  try { canvas.setPointerCapture(e.pointerId); } catch { /* 없어도 동작 */ }
  pointer = latch = toPoint(e);
});
canvas.addEventListener('pointermove', (e) => void (pointer && (pointer = toPoint(e))));
const release = () => void (pointer = null);
window.addEventListener('pointerup', release);
window.addEventListener('pointercancel', release);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('keydown', (e) => {
  if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault();
  if (!running) return;
  if (e.key.startsWith('Arrow')) (keys.add(e.key), (keyboard = true));
  if (e.key === ' ' && !e.repeat) (spaceDown = true), (keyboard = true), (pointer = { ...cursor });
});
canvas.addEventListener('keyup', (e) => {
  keys.delete(e.key);
  if (e.key === ' ') (spaceDown = false), (pointer = null);
});
canvas.addEventListener('blur', () => (keys.clear(), (spaceDown = false)));
overlay.addEventListener('click', start);
window.addEventListener('resize', size);

size();
title();
// 타이틀 뒤에서도 달밤이 흐르게(시뮬은 멈춘 채 그림만)
(function idle() {
  if (!running) draw();
  requestAnimationFrame(idle);
})();
