/**
 * 풍선 팡 연쇄 — 플레이 페이지(M0). 시뮬레이션(game.ts)과 같은 코드를 60fps 고정 틱으로 돌린다.
 * 조작: 풍선을 톡. 키보드: 화살표로 커서, 스페이스/Enter로 톡. 저장(최고 점수·별)은 localStorage가 막혀도 동작.
 */
import { TICK, type Input } from './core.ts';
import { peek } from './juice.ts';
import { balloonpop as g, bxAt, byAt, IRON, STAGE_COUNT, type PopState } from './game.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('game'), ctx = canvas.getContext('2d')!;
const title = $('title'), result = $('result'), hud = $('hud');
const A = g.aspect ?? 1.45;

const store = {
  get(k: string) { try { return Number(localStorage.getItem('balloonpop:' + k) ?? 0) || 0; } catch { return 0; } },
  set(k: string, v: number) { try { localStorage.setItem('balloonpop:' + k, String(v)); } catch { /* 저장 불가여도 동작 */ } },
};

let s: PopState = g.create(1), running = false, paused = false, acc = 0, last = 0;
let pointer: { x: number; y: number } | null = null, latch: { x: number; y: number } | null = null;
let cursor = { x: 0.5, y: 0.5 }, keyboard = false, spaceDown = false;
const keys = new Set<string>();

function size() {
  const wrap = canvas.parentElement!, dpr = window.devicePixelRatio || 1;
  const w = Math.min(wrap.clientWidth, 620, wrap.clientHeight / A);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${w * A}px`;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(w * A * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // 일시정지 버튼: 캔버스 위에 빈 띠가 있으면 그 띠에, 옆 공간이 있으면 캔버스 오른쪽 바깥에 — 캔버스 HUD(판·별)를 가리지 않게
  const top = (wrap.clientHeight - w * A) / 2, side = (wrap.clientWidth - w) / 2;
  if (top < 52 && side >= 56) (hud.style.top = `${top + 4}px`), (hud.style.right = `${side - 52}px`);
  else (hud.style.top = ''), (hud.style.right = '');
  draw();
}

function draw() {
  const dpr = window.devicePixelRatio || 1, w = canvas.width / dpr, h = canvas.height / dpr;
  g.draw(ctx, s, w, h, g.art!.palette);
  peek(s)?.render(ctx, w, h);
  if (keyboard && running) {
    ctx.strokeStyle = spaceDown ? '#ffffff' : 'rgba(255,255,255,.75)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cursor.x * w, cursor.y * h, spaceDown ? 8 : 12, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function start() {
  s = g.create((Date.now() % 1_000_000) + 1);
  running = true;
  paused = false;
  title.hidden = result.hidden = true;
  hud.hidden = false;
  last = performance.now();
  acc = 0;
  canvas.focus({ preventScroll: true });
  requestAnimationFrame(loop);
}

function finish() {
  running = false;
  hud.hidden = true;
  const sc = g.score(s), best = Math.max(sc, store.get('best')), stars = Math.max(s.stars, store.get('stars'));
  store.set('best', best);
  store.set('stars', stars);
  $('r-title').textContent = '축제 하늘 완주!';
  $('r-score').textContent = `${sc}점`;
  $('r-stars').textContent = `★ ${s.stars}개 / ${STAGE_COUNT * 3} · 다시 하기 ${s.fails}번`;
  $('r-best').textContent = `최고 ${best}점`;
  result.hidden = false;
  $('again').focus();
  draw();
}

function loop(now: number) {
  if (!running) return;
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (!paused && acc >= TICK) {
    const kx = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0), ky = (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0);
    cursor = { x: Math.max(0, Math.min(1, cursor.x + kx * 0.012)), y: Math.max(0, Math.min(1, cursor.y + ky * 0.012)) };
    if (spaceDown) pointer = { ...cursor };
    const input: Input = { tap: false, dir: 0, pointer: pointer ?? latch };
    latch = null;
    g.step(s, input);
    acc -= TICK;
    if (g.over(s)) return finish();
  }
  if (paused) acc = 0;
  draw();
  requestAnimationFrame(loop);
}

const toPoint = (e: PointerEvent) => {
  const r = canvas.getBoundingClientRect();
  return { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) };
};
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!running || paused) return;
  keyboard = false;
  pointer = latch = toPoint(e);
});
canvas.addEventListener('pointermove', (e) => void (pointer && e.buttons && (pointer = toPoint(e))));
window.addEventListener('pointerup', () => (pointer = null));
canvas.addEventListener('pointerleave', () => (pointer = null));

function togglePause() {
  if (!running) return;
  paused = !paused;
  $('pausebtn').textContent = paused ? '▶' : '⏸';
  $('pausebtn').setAttribute('aria-label', paused ? '계속하기' : '일시정지');
}

window.addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
  if (!running) {
    if ((e.key === 'Enter' || e.key === ' ') && !(document.activeElement instanceof HTMLButtonElement)) start();
    return;
  }
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') return togglePause();
  if (e.key.startsWith('Arrow')) (keyboard = true), keys.add(e.key);
  if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) (keyboard = true), (spaceDown = true), (pointer = latch = { ...cursor });
});
window.addEventListener('keyup', (e) => {
  keys.delete(e.key);
  if (e.key === ' ' || e.key === 'Enter') (spaceDown = false), (pointer = null);
});

$('start').addEventListener('click', start);
$('again').addEventListener('click', start);
$('pausebtn').addEventListener('click', togglePause);
const best = store.get('best');
if (best) $('best').textContent = `최고 ${best}점 · 모은 별 ${store.get('stars')}개`;
new ResizeObserver(size).observe(canvas.parentElement!);
size();
$('start').focus();

// 확인용(shots.ts): 상태 읽기
(globalThis as unknown as { __bp: unknown }).__bp = {
  state: () => s,
  running: () => running,
  /** 살아 있는 보통 풍선 하나의 다음 틱 위치(캔버스 0~1) */
  target() {
    const i = s.L.bs.findIndex((b, k) => s.alive[k] === 1 && b.k !== IRON);
    if (i < 0) return null;
    const b = s.L.bs[i];
    return { x: bxAt(b, s.st + 1), y: byAt(b, s.st + 1) / A };
  },
  aim(p: { x: number; y: number }) { keyboard = true; cursor = { ...p }; },
  /** 결과 화면 확인용: 지금 판에서 바로 완주 화면으로 */
  finish() { if (running) finish(); },
};
