/**
 * 풍선 팡 연쇄 — 플레이 페이지(M0). 시뮬레이션(game.ts)과 같은 코드를 60fps 고정 틱으로 돌린다.
 * 조작: 풍선을 톡. 키보드: 화살표로 커서, 스페이스/Enter로 톡. 저장(최고 점수·별)은 localStorage가 막혀도 동작.
 */
import { TICK, type Input } from './core.ts';
import { peek } from './juice.ts';
import { balloonpop as g, bxAt, byAt, emptyNear, fitCanvas, HELP_AFTER, IRON, STAGE_COUNT, startAt, view, type PopState } from './game.ts';

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

/** 캔버스 크기(CSS px)와 놀이 세계가 시작하는 높이(TOP) — game.ts playTop과 같은 식 */
let W = 1, H = A, TOP = 0;

function size() {
  const wrap = canvas.parentElement!, dpr = window.devicePixelRatio || 1;
  // 세로 화면 채우기 (C004, M1-3): 가로는 놀이 세계가 들어가는 만큼, 세로는 화면 끝까지(남는 높이는 하늘·광장으로)
  ({ W, H, TOP } = fitCanvas(wrap.clientWidth, wrap.clientHeight));
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // 일시정지 버튼: 옆 공간이 있으면 캔버스 오른쪽 바깥에, 없으면 HUD 띠 오른쪽 끝(그 자리는 HUD가 비워 둔다)
  const top = (wrap.clientHeight - H) / 2, side = (wrap.clientWidth - W) / 2;
  if (side >= 56) (hud.style.top = `${top + 4}px`), (hud.style.right = `${side - 52}px`), (view.hudRight = 0);
  else (hud.style.top = `${top + 6}px`), (hud.style.right = `${side + 6}px`), (view.hudRight = 50);
  draw();
}

let hover: { x: number; y: number } | null = null;
function draw() {
  // 미리 보기 초점: 키보드 커서 또는 마우스가 올라간 곳 (터치는 누르는 순간 터지므로 없음)
  view.focus = running && !paused ? (keyboard ? cursor : hover) : null;
  g.draw(ctx, s, W, H, g.art!.palette);
  // 공용 연출과 키보드 커서는 놀이 세계 좌표(TOP만큼 내려온 곳)에
  ctx.save();
  ctx.translate(0, TOP);
  peek(s)?.render(ctx, W, H, -TOP);
  if (keyboard && running) {
    ctx.strokeStyle = spaceDown ? '#ffffff' : 'rgba(255,255,255,.75)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cursor.x * W, cursor.y * W * A, spaceDown ? 8 : 12, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
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

/** 화면의 점 → 놀이 세계 좌표(가로 0~1, 세로 0~1 = 세계 높이 A) */
const toPoint = (e: PointerEvent) => {
  const r = canvas.getBoundingClientRect();
  return { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top - TOP) / (W * A))) };
};
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!running || paused) return;
  keyboard = false;
  pointer = latch = toPoint(e);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') (hover = toPoint(e)), (keyboard = false);
  if (pointer && e.buttons) pointer = toPoint(e);
});
window.addEventListener('pointerup', () => (pointer = null));
canvas.addEventListener('pointerleave', () => ((pointer = null), (hover = null)));

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
  hudRight: () => view.hudRight,
  /** 세계 좌표 → 캔버스 안 px (shots.ts가 마우스로 누를 자리) */
  toScreen(p: { x: number; y: number }) { return { x: p.x * W, y: TOP + p.y * W * A }; },
  /** 도움 반짝 확인용: 지금 판을 실패한 것으로 치고 → 1초 뒤 같은 하늘을 도움 반짝과 함께 다시 */
  failToHelp() { s.tries = HELP_AFTER - 1; s.phase = 'result'; s.ok = false; s.pt = 0; },
  /** 판 확인용(shots): 그 판 처음으로 바로 (소개 카드 없이) */
  stage(k: number) { s = startAt((Date.now() % 1_000_000) + 1, k); },
  /** 살펴보기 확인용(shots): 첫 풍선 곁 빈 하늘 한 점(캔버스 px) */
  emptySpot() { const i = s.L.bs.findIndex((b, k) => s.alive[k] === 1 && b.k !== IRON), p = i >= 0 ? emptyNear(s, i) : null; return p && { x: p.x * W, y: TOP + p.y * W }; },
  /** 결과 화면 확인용: 지금 판에서 바로 완주 화면으로 */
  finish() { if (running) finish(); },
};
