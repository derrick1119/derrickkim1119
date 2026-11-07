/**
 * 브라우저 진입점: 캔버스 · 입력(멀티터치/키보드) · 고정 60Hz 루프 · 화면 전환(타이틀/일시정지/결과).
 */
import { create, crew, score, smartBot, step, type Input, type State } from './sim.ts';
import { createJuice, react, tick, type Juice } from './juice.ts';
import { createSfx } from './audio.ts';
import { cardBox, cardTop, draw, markDead, setTouchOnly, view } from './render.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('game'), ctx = canvas.getContext('2d')!;
const screens = { title: $('title'), pause: $('pause'), result: $('result') };
const calm = matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const sfx = createSfx();

/** localStorage가 막힌 환경(사생활 모드·iframe)에서도 멈추지 않는다 */
const store = {
  get(k: string) {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set(k: string, v: string) {
    try { localStorage.setItem(k, v); } catch { /* 저장 못 해도 진행 */ }
  },
};

type Mode = 'title' | 'play' | 'pause' | 'over';
let mode: Mode = 'title';
let s: State = create(1), j: Juice = createJuice(calm);
let frame = 0, acc = 0, prev = 0, overAt = 0;
let W = 0, H = 0;
sfx.muted = store.get('pg.muted') === '1';

function resize() {
  const r = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  W = r.width;
  H = r.height;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize);

function show(m: Mode) {
  mode = m;
  screens.title.hidden = m !== 'title';
  screens.pause.hidden = m !== 'pause';
  screens.result.hidden = m !== 'over';
  $('hud').hidden = m !== 'play';
  const focus = { title: 'start', pause: 'resume', over: 'again', play: '' }[m];
  if (focus) $(focus).focus();
  else canvas.focus();
}

function start() {
  sfx.unlock();
  s = create((Date.now() & 0x7fffffff) || 1);
  j = createJuice(calm);
  pointers.clear();
  keys.clear();
  sfx.ui('start');
  show('play');
}

function pause(on: boolean) {
  if (on && mode === 'play') (sfx.ui('pause'), show('pause'));
  else if (!on && mode === 'pause') (sfx.ui('pause'), show('play'), (prev = performance.now()));
}

// ── 입력 ────────────────────────────────────────────────
/** 누르고 있는 손가락들. 카드 띠 위의 손가락은 조준, 카드 띠의 손가락은 그 순간 한 번 고르기 — 조준하면서 다른 손가락으로 카드를 고를 수 있다 */
const pointers = new Map<number, { x: number; y: number; t: number }>();
const keys = new Set<string>();
let pick: number | undefined;

canvas.addEventListener('pointerdown', (e) => {
  sfx.unlock();
  if (mode !== 'play') return;
  e.preventDefault();
  canvas.setPointerCapture?.(e.pointerId);
  const x = e.offsetX, y = e.offsetY;
  // 카드가 떠 있을 때만 아래 띠가 카드 영역 — 아니면 어디든 조종 (리뷰 R2: 죽은 영역)
  if (s.offer && y >= cardTop(H) - 8) {
    const k = [0, 1, 2].find((i) => x / W >= cardBox(i).x0 - 0.01 && x / W <= cardBox(i).x1 + 0.01);
    if (k !== undefined && s.offer?.[k]) (pick = k), sfx.ui('pick');
    return;
  }
  pointers.set(e.pointerId, { x, y, t: performance.now() });
});
canvas.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId);
  if (p) (p.x = e.offsetX), (p.y = e.offsetY);
});
const lift = (e: PointerEvent) => void pointers.delete(e.pointerId);
canvas.addEventListener('pointerup', lift);
canvas.addEventListener('pointercancel', lift);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

const AIM_KEYS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
};
addEventListener('keydown', (e) => {
  sfx.unlock();
  if (e.code === 'KeyM') return toggleMute();
  if (mode === 'play') {
    if (e.code in AIM_KEYS) (keys.add(e.code), e.preventDefault());
    else if (e.code === 'Escape' || e.code === 'KeyP') pause(true);
    else if (/^(Digit|Numpad)[123]$/.test(e.code) && s.offer) (pick = Number(e.code.slice(-1)) - 1), sfx.ui('pick');
  } else if (mode === 'pause' && (e.code === 'Escape' || e.code === 'KeyP')) pause(false);
});
addEventListener('keyup', (e) => void keys.delete(e.code));
addEventListener('blur', () => (keys.clear(), pointers.clear(), pause(true)));
document.addEventListener('visibilitychange', () => document.hidden && pause(true));

/** 지금 입력 → 시뮬 입력. 키는 화면 방향(←는 화면 왼쪽으로 간다), 손가락은 행성 중심에서 본 방향 */
function input(): Input {
  const out: Input = { dir: 0, pick };
  pick = undefined;
  let dx = 0, dy = 0;
  for (const k of keys) (dx += AIM_KEYS[k][0]), (dy += AIM_KEYS[k][1]);
  const v = view(W, H);
  const last = [...pointers.values()].sort((a, b) => b.t - a.t)[0];
  if (last) out.aim = Math.atan2(last.y - v.cy, last.x - v.cx);
  else if (dx || dy) out.aim = Math.atan2(dy, dx);
  return out;
}

function toggleMute() {
  sfx.muted = !sfx.muted;
  store.set('pg.muted', sfx.muted ? '1' : '0');
  $('mute').textContent = sfx.muted ? '🔇' : '🔊';
  $('mute').setAttribute('aria-label', sfx.muted ? '소리 켜기' : '소리 끄기');
}

$('start').addEventListener('click', start);
$('again').addEventListener('click', start);
$('resume').addEventListener('click', () => pause(false));
$('quit').addEventListener('click', () => show('title'));
$('pausebtn').addEventListener('click', () => pause(true));
$('mute').addEventListener('click', toggleMute);
$('mute').textContent = sfx.muted ? '🔇' : '🔊';

// ── 루프 ────────────────────────────────────────────────
function update() {
  frame++;
  tick(j);
  if (mode === 'title') {
    // 타이틀 뒤 데모: 봇이 대신 지킨다 (소리 없이)
    step(s, smartBot(s));
    for (const e of s.events) react(j, e);
    if (s.dead || s.t > 60 * 90) (s = create(frame + 1)), (j = createJuice(calm));
    return;
  }
  if (mode !== 'play') return;
  if (j.stop > 0) return void j.stop--; // 멈칫: 시뮬만 멈추고 파티클은 흐른다
  step(s, input());
  for (const e of s.events) (react(j, e), sfx.play(e));
  if (s.dead) {
    markDead(frame);
    overAt = frame;
    mode = 'over';
    $('hud').hidden = true;
  }
}

function result() {
  const best = Math.max(Number(store.get('pg.best') ?? 0) || 0, score(s));
  const isBest = best === score(s) && score(s) > 0;
  store.set('pg.best', String(best));
  const lv = (k: '광산' | '포탑') => s.sites.filter((x) => x.kind === k).map((x) => `Lv${x.level}`).join(' ') || '없음';
  $('r-score').textContent = String(score(s));
  $('r-best').textContent = isBest ? '새 최고 기록!' : `최고 ${best}`;
  $('r-stats').innerHTML = [
    ['버틴 웨이브', `${s.wave}`],
    ['부순 운석', `${s.kills} (몸으로 ${s.blocks})`],
    ['최고 연속', `${s.bestCombo}`],
    ['광산', lv('광산')],
    ['포탑', lv('포탑')],
    ['위성', `${crew(s).length - 1}기`],
  ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  show('over');
}

function loop(now: number) {
  acc += Math.min(100, now - (prev || now));
  prev = now;
  while (acc >= 1000 / 60) {
    update();
    acc -= 1000 / 60;
  }
  if (mode === 'over' && screens.result.hidden && frame - overAt > 100) result();
  if (W) draw(ctx, s, j, W, H, frame, mode !== 'title');
  requestAnimationFrame(loop);
}

/** 확인용(스크린샷 스크립트) — 상태 읽기만 */
(globalThis as unknown as { __pg: object }).__pg = { state: () => s, mode: () => mode };

setTouchOnly(matchMedia?.('(any-pointer: fine)').matches === false);
resize();
show('title');
$('best').textContent = store.get('pg.best') ? `최고 기록 ${store.get('pg.best')}` : '';
requestAnimationFrame(loop);
