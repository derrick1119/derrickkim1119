/**
 * 양치기 멍멍 — 플레이 빌드 진입점 (M0: 발견 공장 arcade/play.ts의 'touch' 조작부를 이 게임 전용으로 옮김).
 * 시뮬레이션과 같은 코드로 60fps 고정 틱. 조작: 목장을 누르고 있으면 미리 보기, 떼면 멍! · 화살표로 커서 + 스페이스.
 */
import { TICK, type Input } from './core.ts';
import { mountResultCard } from './ui.ts';
import { peek } from './juice.ts';
import { RESULT_MIN, at, jumpTo, preview, sheepdog as g, starCount, type DogState } from './game.ts';

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

let s: DogState = g.create(1), running = false, acc = 0, last = 0, keyboard = false, spaceDown = false, retry = false, next = false;
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
  // 세로 화면(C008, 🎨 §12-1): 캔버스를 위로 붙이고 위 띠는 하늘(60px까지), 남는 높이는 모두 아래 탁자(엄지 영역)로. 가로·데스크톱은 가운데
  const extra = Math.max(0, avH - H), portrait = avH / avW > 5 / 3;
  const safeTop = document.getElementById('safe')?.offsetHeight ?? 0; // 노치 폰 상태바 (🎨 C008: 명세는 inset + 60)
  canvas.style.marginTop = `${portrait ? Math.min(extra, 60 + safeTop) : extra / 2}px`;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // ↺ 다시 버튼: 캔버스 오른쪽 위 모서리
  retryBtn.style.left = `${canvas.offsetLeft + W - 46}px`;
  retryBtn.style.top = `${canvas.offsetTop + 2}px`;
  // 🎨 C007 ④-a: 캔버스 아래 빈 띠를 디오라마를 올린 탁자색으로 잇는다(세로 화면)
  // 가로·데스크톱은 탁자색 하나 (하늘 줄이 넓은 화면 전체 폭에 깔리면 어색하다, 🎨 C008)
  document.body.style.background = portrait ? `linear-gradient(#8ecff0 ${canvas.offsetTop + 1}px, #4a3322 ${canvas.offsetTop + 1}px)` : '#4a3322';
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
  // 다시 하기: 판별 최고 별은 그대로 두고 1판부터 (C002 FUN QA — 별 기록을 지우지 않는다)
  const kept = s.best;
  s = g.create((Date.now() % 1_000_000) + 1);
  s.best = [...kept];
  s.stars = s.best.reduce((a, m) => a + starCount(m), 0);
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
    const input: Input = { tap: false, dir: 0, pointer: card.open() ? null : pointer ?? latch, retry, next };
    latch = null;
    retry = false;
    g.step(s, input);
    // 카드가 막 올라오는 동안(RESULT_MIN 전) 누른 '다음'은 버리지 않고 들고 있다가 넘긴다 (FUN QA C008)
    next = next && s.phase === 'result' && s.ok && s.pt <= RESULT_MIN;
    acc -= TICK;
    if (g.over(s)) {
      running = false;
      const sc = g.score(s), b = Math.max(sc, store.get('best'));
      store.set('best', b);
      card.sync(s);
      draw();
      showTitle(`<p class="big">★ ${s.stars} / ${s.best.length * 3}</p><p>${s.won ? '모든 목장의 양을 집에 데려다줬어요! 🐑' : '오늘은 여기까지 — 다시 해 볼까요?'} · ${sc}점</p>`);
      startBtn.textContent = '다시 하기';
      return;
    }
  }
  card.sync(s);
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
// 판 결과 카드 (C008): 버튼은 다음 틱 입력으로 — 시뮬과 같은 길(봇·테스트와 같음)
const card = mountResultCard(root, () => ((next = true), canvas.focus({ preventScroll: true })), () => ((retry = true), canvas.focus({ preventScroll: true })));
document.addEventListener('keydown', (e) => {
  if (card.open() && (e.key === 'r' || e.key === 'R') && !e.repeat) (retry = true), canvas.focus({ preventScroll: true });
});
retryBtn.addEventListener('click', () => {
  retry = true;
  canvas.focus({ preventScroll: true });
});
new ResizeObserver(size).observe(root);
size();
showTitle();
// 확인용(shots.ts): 지금 상태 읽기
/** 확인용: 지금 판에서 짖으면 양이 개울에 빠지는 자리(캔버스 비율 좌표) — shots가 '진짜 풍덩'을 찍을 때 */
function splashPoint() {
  for (let fy = 0.95; fy > 0.3; fy -= 0.03)
    for (let fx = 0.1; fx < 0.9; fx += 0.03) {
      const pv = preview(s, fx, fy);
      if (pv.rec.scare.some((v) => v > 0) && pv.S.fell.some((v) => v)) return at(fx, fy).pointer;
    }
  return null;
}
(globalThis as unknown as { __sd: { state: () => DogState; jump: (k: number) => void; splash: () => unknown } }).__sd = { state: () => s, jump: (k) => jumpTo(s, k), splash: splashPoint };
