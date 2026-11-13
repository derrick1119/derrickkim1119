/**
 * 양치기 멍멍 — 플레이 빌드 진입점 (M0: 발견 공장 arcade/play.ts의 'touch' 조작부를 이 게임 전용으로 옮김).
 * 시뮬레이션과 같은 코드로 60fps 고정 틱. 조작: 목장을 누르고 있으면 미리 보기, 떼면 멍! · 화살표로 커서 + 스페이스.
 */
import { TICK, type Input } from './core.ts';
import { mountResultCard } from './ui.ts';
import { ICON, mountHud } from './hud.ts';
import { sfx } from './sfx.ts';
import { mulberry32 } from './rng.ts';
import { peek } from './juice.ts';
import { RESULT_MIN, at, comeHold, jumpTo, preview, setCue, sheepdog as g, sheepdogGreedy, sheepdogNaive, sheepdogSmart, starCount, type DogState } from './game.ts';

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
const soundBtn = document.getElementById('sound') as HTMLButtonElement;
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
  // 세로 화면(🎨 C009, §12-1을 뒤집음): 엄지 자리에 누를 곳(들판)이 오게 캔버스를 아래로 붙인다. 남는 위는 하늘 — 위 줄·말풍선이 거기 산다. 가로·데스크톱은 가운데
  const extra = Math.max(0, avH - H), portrait = avH / avW > 5 / 3;
  const safeTop = document.getElementById('safe')?.offsetHeight ?? 0, safeBot = document.getElementById('safeB')?.offsetHeight ?? 0; // 노치·홈 막대
  canvas.style.marginTop = `${portrait ? Math.min(extra, Math.max(60 + safeTop, extra - Math.max(16, safeBot))) : extra / 2}px`;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // 위 줄(🎨 §12-3, C009): 하늘이 124px 이상이면 캔버스 위 116px(말풍선은 그 아래 = 캔버스 위 64px), 아니면 캔버스 위 8px. ↺는 그 줄 오른쪽 끝
  const rowTop = canvas.offsetTop >= 124 ? canvas.offsetTop - 116 : canvas.offsetTop + 8;
  hud.place(canvas.offsetLeft, rowTop - 6, canvas.offsetTop, W, root.clientHeight - canvas.offsetTop);
  retryBtn.style.left = `${canvas.offsetLeft + W - 52}px`;
  retryBtn.style.top = `${rowTop - 2}px`;
  placeSound(rowTop);
  // 🎨 C007 ④-a: 캔버스 아래 빈 띠를 디오라마를 올린 탁자색으로 잇는다(세로 화면)
  // 가로·데스크톱은 탁자색 하나 (하늘 줄이 넓은 화면 전체 폭에 깔리면 어색하다, 🎨 C008)
  document.body.style.background = portrait ? `linear-gradient(#6ec3ee, #8ecff0 ${canvas.offsetTop + 1}px, #4a3322 ${canvas.offsetTop + 1}px)` : '#4a3322';
  draw();
}

// 소리 켬/끔 (🎨 C010): 플레이 중엔 위 줄 [별][소리][↺], 타이틀·끝 화면엔 오른쪽 위. M키도 같다. 꺼 두면 AudioContext를 만들지 않는다
let soundRow = 0;
function placeSound(rowTop = soundRow) {
  soundRow = rowTop;
  const safeTop = document.getElementById('safe')?.offsetHeight ?? 0;
  // 빈 하늘 (🎨 C010): 구름 띠 = 플레이는 위 줄 12px 위까지, 타이틀은 캔버스 꼭대기까지. 타이틀 로고 묶음은 그 띠 가운데로
  const band = running ? rowTop - 12 : canvas.offsetTop, sky = document.getElementById('sky')!;
  sky.hidden = band < (running ? 70 : 220); // 🎨 C010: 타이틀 띠가 좁으면(SE) 구름이 로고와 겹친다
  sky.classList.toggle('title', !running);
  sky.style.height = `${band}px`;
  overlay.style.paddingTop = `${Math.max(safeTop + 20, (canvas.offsetTop - 110) / 2)}px`;
  soundBtn.style.left = `${running ? canvas.offsetLeft + W - 104 : root.clientWidth - 56}px`;
  soundBtn.style.top = `${running ? rowTop - 2 : 12 + safeTop}px`;
}
function showSound() {
  soundBtn.innerHTML = sfx.muted ? ICON.soundOff : ICON.soundOn;
  soundBtn.setAttribute('aria-pressed', String(!sfx.muted));
}
function toggleSound() {
  sfx.setMuted(!sfx.muted);
  store.set('mute', sfx.muted ? 1 : 0);
  if (!sfx.muted) sfx.wake(), sfx.play('bark', 1.1); // 켜는 누름도 사용자 입력 — 바로 들려준다
  showSound();
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
  document.getElementById('rules')!.hidden = !!html; // 끝 화면은 규칙 대신 결과 (🎨 §12-9)
  const b = store.get('best');
  best.textContent = b ? `최고 ${b}점` : '';
  overlay.hidden = false;
  retryBtn.hidden = true;
  hud.show(false);
  placeSound();
  startBtn.focus({ preventScroll: true });
}

function start() {
  // 첫 소리는 '시작' 누름에서 (🎨 C010): 여기서 처음 AudioContext를 만든다 — 멍!(피치 +10%)
  sfx.wake();
  sfx.play('bark', 1.1);
  // 다시 하기: 판별 최고 별은 그대로 두고 1판부터 (C002 FUN QA — 별 기록을 지우지 않는다)
  const kept = s.best;
  s = g.create((Date.now() % 1_000_000) + 1);
  s.best = [...kept];
  s.stars = s.best.reduce((a, m) => a + starCount(m), 0);
  running = true;
  overlay.hidden = true;
  retryBtn.hidden = false;
  hud.show(true);
  placeSound();
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
      // 끝 화면 (🎨 §12-9): 제목 → ★ N / 24 → 판 8칸 미니 격자 → 점수 → [다시 하기]. 이모지 없이 SVG
      const grid = s.best.map((m, k) => `<li>1-${k + 1}<span>${[0, 1, 2].map((j) => ICON.star(((m >> j) & 1) === 1)).join('')}</span></li>`).join('');
      showTitle(`<h2>${s.won ? 'W1 아침 들판 완성!' : '오늘은 여기까지'}</h2><p class="big">${ICON.star(true)}<span>${s.best.reduce((n, m) => n + starCount(m), 0)} / ${s.best.length * 3}</span></p><ol class="grid" aria-label="판별 별">${grid}</ol><p class="score">${sc}점</p>`);
      startBtn.textContent = '다시 하기';
      return;
    }
  }
  card.sync(s);
  hud.sync(s);
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
  if ((e.key === 'm' || e.key === 'M') && !e.repeat) toggleSound();
  if (e.key === ' ' || e.key === 'Enter') (keyboard = true), (spaceDown = true), (pointer = { ...cursor });
});
canvas.addEventListener('keyup', (e) => {
  keys.delete(e.key);
  if (e.key === ' ' || e.key === 'Enter') (spaceDown = false), (pointer = null);
});
startBtn.addEventListener('click', start);
const hud = mountHud(root);
retryBtn.innerHTML = ICON.retry;
// 판 결과 카드 (C008): 버튼은 다음 틱 입력으로 — 시뮬과 같은 길(봇·테스트와 같음)
const card = mountResultCard(root, () => ((next = true), canvas.focus({ preventScroll: true })), () => ((retry = true), canvas.focus({ preventScroll: true })));
document.addEventListener('keydown', (e) => {
  if (card.open() && (e.key === 'r' || e.key === 'R') && !e.repeat) (retry = true), canvas.focus({ preventScroll: true });
  if (e.target !== canvas && (e.key === 'm' || e.key === 'M') && !e.repeat) toggleSound();
});
sfx.setMuted(store.get('mute') === 1);
setCue((c, v, last) => sfx.play(c, v, last));
showSound();
soundBtn.addEventListener('click', () => toggleSound());
// 키보드를 쓰면 캔버스 금테(포커스)를 보이고, 누르면 감춘다 (🎨 C011)
window.addEventListener('keydown', (e) => { if (e.key.startsWith('Arrow') || e.key === ' ' || e.key === 'Enter' || e.key === 'Tab') document.body.classList.add('kb'); });
window.addEventListener('pointerdown', () => document.body.classList.remove('kb'));
// 판 누름마다 소리를 다시 깨운다 — 첫 입력 전엔 만들지 않고, 꺼 두었으면 아무것도 안 한다 (PM C010: 폰에서 앱 전환·화면 잠금 뒤 무음)
for (const k of ['pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(k, () => running && sfx.wake(), { passive: true });
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
// 순진 봇은 씨앗 5로 — 1-4 첫 짖기에 흰 양을 다 넣고 까만 양이 거꾸로 온다(멈춤·폴짝 샷)
// bot: 그리디(기본)·박사·순진 봇이 지금 짖을 자리(캔버스 비율) — shots가 진짜 ★2 카드·1-8 진짜 클리어를 찍을 때 (PM C008·C010) · hold: 까만 양 '?!' 멈춤 중인가
(globalThis as unknown as { __sd: { state: () => DogState; jump: (k: number) => void; splash: () => unknown; bot: (who?: 'smart' | 'naive') => unknown; hold: () => boolean } }).__sd = { state: () => s, jump: (k) => jumpTo(s, k), splash: splashPoint, bot: (who) => (who === 'smart' ? sheepdogSmart : who === 'naive' ? sheepdogNaive : sheepdogGreedy).act(s, mulberry32(5)).pointer, hold: () => comeHold(s) };
