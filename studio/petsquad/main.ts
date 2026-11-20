/**
 * 동물 군단 합체 전투 — 플레이 빌드 진입점 (M0: 발견 공장 arcade/play.ts의 'touch' 조작부를 이 게임 전용으로 옮김).
 * 시뮬레이션과 같은 코드로 60fps 고정 틱. 조작: 톡만(카드·칸·단추) · 키보드 화살표 커서 + 스페이스, 1·2·3 = 카드 사기.
 */
import { TICK, type Input } from './core.ts';
import { peek } from './juice.ts';
import { STAGES, jumpTo, petsquad as g, setRandomShop, type Kind, type PetState } from './game.ts';

const store = {
  get(k: string) { try { return Number(localStorage.getItem('petsquad:' + k) ?? 0); } catch { return 0; } },
  set(k: string, v: number) { try { localStorage.setItem('petsquad:' + k, String(v)); } catch { /* 저장 불가여도 동작 */ } },
};

const root = document.getElementById('game')!;
const canvas = document.createElement('canvas');
canvas.className = 'g-canvas';
canvas.tabIndex = 0;
canvas.setAttribute('aria-label', `${g.name} 게임 화면. 가게 카드를 톡 하면 동물을 사고, 싸움을 톡 하면 저절로 싸워요. 키보드: 숫자 1·2·3으로 카드 사기, 화살표로 고르고 스페이스`);
const overlay = document.createElement('button');
overlay.type = 'button';
overlay.className = 'g-overlay';
overlay.hidden = true;
root.append(canvas, overlay);
const ctx = canvas.getContext('2d', { alpha: false })!;
const aspect = g.aspect ?? 1.5;
const pal = g.art!.palette;
const q = new URLSearchParams(location.search);
// ✏️ M1 S3: ?shop=random 이면 예전 무작위 가게·다시 뽑기(📋 되돌리기 끈 · 비교용)
setRandomShop(q.get('shop') === 'random');

let s: PetState = g.create(1), running = false, acc = 0, last = 0, keyboard = false, spaceDown = false;
let pointer: { x: number; y: number } | null = null, latch: { x: number; y: number } | null = null, cursor = { x: 0.5, y: 0.8 }, pick: number | undefined;
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
    ctx.strokeStyle = spaceDown ? '#ffffff' : 'rgba(255,255,255,.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cursor.x * W, cursor.y * H, spaceDown ? 9 : 13, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function show(html: string) {
  overlay.innerHTML = html;
  overlay.hidden = false;
}

function start() {
  const seed = Number(q.get('seed')) || (Date.now() % 1_000_000) + 1;
  s = g.create(seed);
  // 시험·스크린샷용 ?stage=N (1부터) — 군단은 ?board=lion2,turtle1,-,… · 금화 ?coins=N (✏️ M1 S1: shots가 잘하는 봇이 실제로 들고 온 군단을 넘긴다)
  const st = Math.floor(Number(q.get('stage')));
  // M1 S4 판 독립: ?board가 없으면 그 판의 정해진 시작 진영·금화
  const board = q.get('board') ? q.get('board')!.split(',').map((x) => (x === '-' ? null : ([x.slice(0, -1) as Kind, Number(x.slice(-1)) || 1] as [Kind, number]))) : [];
  if (st > 1 && st <= STAGES.length) jumpTo(s, st - 1, board, Number(q.get('coins')) || 8);
  running = true;
  overlay.hidden = true;
  pointer = latch = null;
  last = performance.now();
  acc = 0;
  (window as unknown as { __petsquadStarted?: number }).__petsquadStarted = performance.now();
  canvas.focus({ preventScroll: true });
  requestAnimationFrame(loop);
}

function end() {
  running = false;
  const sc = g.score(s), best = Math.max(sc, store.get('best'));
  store.set('best', best);
  draw();
  show(
    `<b>${sc}점</b>` +
      `<span class="msg">${s.won ? '풀밭 대회 우승!' : `${s.stage + 1}판까지 싸웠어요`} · ★ ${Math.max(0, s.stars)}</span>` +
      `<span class="best">최고 ${best}점</span><strong>다시</strong>`,
  );
}

function loop(now: number) {
  if (!running) return;
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (acc >= TICK) {
    const kx = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0), ky = (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0);
    cursor = { x: Math.max(0, Math.min(1, cursor.x + kx * 0.012)), y: Math.max(0, Math.min(1, cursor.y + (ky * 0.012) / aspect)) };
    if (spaceDown) pointer = { ...cursor };
    // 아주 짧은 탭(한 프레임 안에 눌렀다 뗌)도 최소 한 틱은 '누름'으로 보이게
    const input: Input = { tap: false, dir: 0, pointer: pointer ?? latch, pick };
    latch = null;
    pick = undefined;
    g.step(s, input);
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
  pointer = latch = toPoint(e);
});
const release = () => void (pointer = null);
window.addEventListener('pointerup', release);
window.addEventListener('pointercancel', release);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('keydown', (e) => {
  if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault();
  if (!running) return;
  if (['1', '2', '3'].includes(e.key)) pick = Number(e.key) - 1;
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
// 켜자마자 1판(첫 '와'를 빨리 — 타이틀 없이)
start();
(function idle() {
  if (!running) draw();
  requestAnimationFrame(idle);
})();
