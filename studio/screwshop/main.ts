/**
 * 나사 풀기 공방 — 플레이 빌드 진입점 (M0: 발견 공장 arcade/play.ts의 'touch' 조작부를 이 게임 전용으로 옮김).
 * 시뮬레이션과 같은 코드로 60fps 고정 틱. 조작: 나사를 누르고 있으면 미리 보기, 떼면 풀기 · 화살표로 커서 + 스페이스.
 */
import { TICK, type Input } from './core.ts';
import { peek } from './juice.ts';
import { STAGES, screwshop as g, type ShopState } from './game.ts';

const store = {
  get(k: string) { try { return Number(localStorage.getItem('screwshop:' + k) ?? 0); } catch { return 0; } },
  set(k: string, v: number) { try { localStorage.setItem('screwshop:' + k, String(v)); } catch { /* 저장 불가여도 동작 */ } },
};

const root = document.getElementById('game')!;
const canvas = document.createElement('canvas');
canvas.className = 'g-canvas';
canvas.tabIndex = 0;
canvas.setAttribute('aria-label', `${g.name} 게임 화면. 나사를 톡(누르고 있으면 미리 보기, 떼면 풀기). 키보드: 화살표로 고르고 스페이스`);
const overlay = document.createElement('button');
overlay.type = 'button';
overlay.className = 'g-overlay';
root.append(canvas, overlay);
const ctx = canvas.getContext('2d')!;
const aspect = g.aspect ?? 1.45;

let s: ShopState = g.create(1), running = false, acc = 0, last = 0, keyboard = false, spaceDown = false;
let pointer: { x: number; y: number } | null = null, latch: { x: number; y: number } | null = null, cursor = { x: 0.5, y: 0.6 };
const keys = new Set<string>();
let W = 0, H = 0;

function size() {
  const dpr = window.devicePixelRatio || 1;
  const head = document.querySelector('header')?.getBoundingClientRect().height ?? 44;
  W = Math.max(240, Math.min(root.clientWidth, 460, (window.innerHeight - head - 8) / aspect));
  H = W * aspect;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  root.style.height = `${H}px`;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function draw() {
  g.draw(ctx, s, W, H, g.art!.palette);
  peek(s)?.render(ctx, W, H); // 공용 연출은 여기서 한 번에
  if (keyboard && running) {
    ctx.strokeStyle = spaceDown ? '#ffffff' : 'rgba(255,255,255,.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cursor.x * W, cursor.y * H, spaceDown ? 7 : 11, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function show(html: string) {
  overlay.innerHTML = html;
  overlay.hidden = false;
  overlay.focus({ preventScroll: true });
}

function title() {
  const b = store.get('best'), st = store.get('stars');
  show(`<em>🐹🔩</em><b>나사 풀기 공방</b>
<ul><li>🔩 나사를 <i>톡</i> → 같은 색 상자로 쏙!</li><li>🎐 나사 하나 남은 판자는 매달려 빙글 — 다른 나사를 덮거나 드러내요</li><li>🧺 빈칸 5개가 다 차면 실패, 판자를 다 떨구면 완성</li></ul>
<strong>시작</strong><span>누르고 있으면 갈 곳이 보여요 · 키보드: 화살표 + 스페이스</span>${b ? `<span class="best">최고 ${b}점 · ★${st}</span>` : ''}`);
}

function start() {
  s = g.create((Date.now() % 1_000_000) + 1);
  running = true;
  overlay.hidden = true;
  acc = 0;
  last = performance.now();
  canvas.focus({ preventScroll: true });
  requestAnimationFrame(loop);
}

function end() {
  running = false;
  const sc = g.score(s), b = Math.max(sc, store.get('best'));
  store.set('best', b);
  store.set('stars', Math.max(s.stars, store.get('stars')));
  draw();
  const head = s.won ? `🎉 ${STAGES.length}판 모두 완성!` : `🐹 ${s.stage + 1}판 ${STAGES[s.stage].emoji} ${STAGES[s.stage].name}에서 멈췄어요`;
  show(`<b>${sc}점</b><span class="msg">${head}</span><span>★ ${s.stars} / ${STAGES.length * 3} · 최고 ${b}점</span><strong>다시 하기</strong>`);
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
    if (g.over(s)) return end();
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
window.addEventListener('pointercancel', () => void (pointer = null));
canvas.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key.startsWith('Arrow') || e.key === 'Enter') e.preventDefault();
  if (!running) return;
  if (e.key.startsWith('Arrow')) (keys.add(e.key), (keyboard = true));
  if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) (spaceDown = true), (keyboard = true), (pointer = { ...cursor });
});
canvas.addEventListener('keyup', (e) => {
  keys.delete(e.key);
  if (e.key === ' ' || e.key === 'Enter') (spaceDown = false), (pointer = null);
});
canvas.addEventListener('blur', () => (keys.clear(), (spaceDown = false), (pointer = null)));
overlay.addEventListener('click', start);
window.addEventListener('resize', size);
size();
title();
