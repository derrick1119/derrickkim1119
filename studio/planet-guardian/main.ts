/**
 * 브라우저 진입점: 캔버스 · 입력(멀티터치/키보드) · 고정 60Hz 루프 · 화면 전환(타이틀/일시정지/결과).
 */
import { create, crew, score, smartBot, step, type Input, type State } from './sim.ts';
import { createJuice, react, tick, type Juice } from './juice.ts';
import { createSfx } from './audio.ts';
import { cardBox, cardTop, draw, markDead, rerollBox, setSelected, setTouchOnly } from './render.ts';

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
  sfx.ui('start');
  show('play');
}

function pause(on: boolean) {
  if (on && mode === 'play') (sfx.ui('pause'), show('pause'));
  else if (!on && mode === 'pause') (sfx.ui('pause'), show('play'), (prev = performance.now()));
}

// ── 입력 ────────────────────────────────────────────────
// 조작은 카드 고르기뿐 (오너: "조작 따로 없이 그냥 계속 회전"). 카드가 뜨면 게임이 멈추고 기다린다
let pick: number | undefined, sel = 0, reroll = false;

canvas.addEventListener('pointerdown', (e) => {
  sfx.unlock();
  if (mode !== 'play' || !s.offer) return;
  e.preventDefault();
  const x = e.offsetX, y = e.offsetY, rb = rerollBox(W, H);
  if (x >= rb.x && x <= rb.x + rb.w && y >= rb.y - 4 && y <= rb.y + rb.h + 4) return void ((reroll = true), sfx.ui('pick'));
  if (y < cardTop(H) - 8) return;
  const k = [0, 1, 2].find((i) => x / W >= cardBox(i).x0 - 0.01 && x / W <= cardBox(i).x1 + 0.01);
  if (k !== undefined && s.offer[k]) (pick = k), sfx.ui('pick');
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

addEventListener('keydown', (e) => {
  sfx.unlock();
  if (e.code === 'KeyM') return toggleMute();
  if (mode === 'play') {
    if (e.code === 'Escape' || e.code === 'KeyP') return pause(true);
    if (!s.offer) return;
    const n = s.offer.length;
    // 고르는 칸: 카드 0..n-1, 그다음 n = 다시 뽑기 버튼
    if (/^(Digit|Numpad)[123]$/.test(e.code) && Number(e.code.slice(-1)) <= n) (pick = Number(e.code.slice(-1)) - 1), sfx.ui('pick');
    else if (e.code === 'KeyR') (reroll = true), sfx.ui('pick');
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA') (sel = (sel + n) % (n + 1)), e.preventDefault();
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') (sel = (sel + 1) % (n + 1)), e.preventDefault();
    else if (e.code === 'Enter' || e.code === 'Space') (sel === n ? (reroll = true) : (pick = sel)), sfx.ui('pick'), e.preventDefault();
  } else if (mode === 'pause' && (e.code === 'Escape' || e.code === 'KeyP')) pause(false);
});
addEventListener('blur', () => pause(true));
document.addEventListener('visibilitychange', () => document.hidden && pause(true));

function input(): Input {
  const out: Input = { pick, reroll };
  if (pick !== undefined) sel = 0;
  pick = undefined;
  reroll = false;
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
  // C010: 무엇에 끝났나 + 다음 판 목표 한 줄 ('몸으로 N'은 조작이 없어져 뺐다)
  const h = s.lastHit;
  $('r-cause').textContent = h ? `${h.wave}웨이브에서 ${h.big ? '거대 운석' : h.maxHp > 1 ? `단단한 운석(체력 ${h.maxHp})` : '운석'}에 마지막 방어막이 깨졌어요` : '';
  const turretLv = s.sites.filter((x) => x.kind === '포탑').reduce((a, x) => a + x.level, 0);
  // C010: 다음 판 한 줄은 끝난 원인에 묶는다 (FUN QA: 2/3가 같은 문장, 사인과 무관했다) + 숫자 목표
  const tip =
    h?.big ? (turretLv < 5 ? '거대 운석은 단단해요 — 포탑을 더 짓거나 강화해 보세요' : '거대 운석이 늘어나요 — 위성으로 막는 각도를 넓혀 보세요')
      : h && h.maxHp > 1 ? '단단한 운석은 여러 발 필요해요 — 포탑 강화로 연사를 올려 보세요'
        : s.allies === 0 ? '여기저기서 와요 — 위성을 하나 더 골라 막는 각도를 늘려 보세요'
          : s.spinLv === 0 ? '틈이 생겨요 — 궤도 가속으로 위성을 빠르게 돌려 보세요'
            : '빈틈을 메울 카드가 없으면 광석으로 다시 뽑아 보세요';
  $('r-next').textContent = `다음 목표 ${s.wave + 1}웨이브 · ${tip}`;
  $('r-stats').innerHTML = [
    ['버틴 웨이브', `${s.wave}`],
    ['부순 운석', `${s.kills}`],
    ['광산', lv('광산')],
    ['포탑', lv('포탑')],
    ['위성', `${crew(s).length}기`],
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
  // 선택 표시: 카드면 0~2, 다시 뽑기 버튼이면 3
  setSelected(mode === 'play' && s.offer && !touchOnly ? (sel === s.offer.length ? 3 : sel) : -1);
  if (W) draw(ctx, s, j, W, H, frame, mode !== 'title');
  requestAnimationFrame(loop);
}

/** 확인용(스크린샷 스크립트) — 상태 읽기만 */
(globalThis as unknown as { __pg: object }).__pg = { state: () => s, mode: () => mode };

const touchOnly = matchMedia?.('(any-pointer: fine)').matches === false;
setTouchOnly(touchOnly);
resize();
show('title');
$('best').textContent = store.get('pg.best') ? `최고 기록 ${store.get('pg.best')}` : '';
requestAnimationFrame(loop);
