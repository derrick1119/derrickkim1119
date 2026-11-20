/**
 * 느린 시간 닌자 — 플레이 빌드 진입점 (M0: 발견 공장 arcade/play.ts의 'touch' 조작부를 이 게임 전용으로 옮김).
 * 시뮬레이션과 같은 코드로 60fps 고정 틱. 조작: 꾹 누르고(누른 채 손가락으로 겨눔) 떼면 돌진 · 키보드 화살표로 커서 + 스페이스.
 */
import { TICK } from './core.ts';
import { peek } from './juice.ts';
import { STAGES, STAGE_COUNT, TRIAL, WORLD_LOCK, slowdash as g, startStage, useOwl, worldStars, type DashState } from './game.ts';
import { sfx } from './sfx.ts';

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
// ✏️ M2 S4 판 고르기·부엉이 귀띔 카드(단추가 여럿이라 overlay(단추 하나)와 따로)
const picker = document.createElement('div');
picker.className = 'g-overlay g-pick';
picker.setAttribute('role', 'dialog');
picker.hidden = true;
root.append(canvas, overlay, picker);
const ctx = canvas.getContext('2d', { alpha: false })!;
const aspect = g.aspect ?? 1.52;
const pal = g.art!.palette;

// 소리 (✏️ S005 · 🎨 ART §4.1): 헤더 소리 단추 · M키 · 저장. 첫 소리는 '시작' 누름에서
const soundBtn = document.getElementById('sound') as HTMLButtonElement | null;
sfx.muted = store.get('mute') === 1;
function showSound() {
  if (!soundBtn) return;
  soundBtn.textContent = sfx.muted ? '소리 끔' : '소리'; // S012 QC④ 이모지 0
  soundBtn.setAttribute('aria-pressed', String(!sfx.muted));
  soundBtn.setAttribute('aria-label', sfx.muted ? '소리 켜기' : '소리 끄기');
}
function toggleSound() {
  sfx.setMuted(!sfx.muted);
  store.set('mute', sfx.muted ? 1 : 0);
  showSound();
}
soundBtn?.addEventListener('click', toggleSound);
showSound();
document.addEventListener('visibilitychange', () => (document.hidden ? sfx.sleep() : running && sfx.wake()));
/** 이번 틱에 생긴 사건 → 소리 (시뮬은 소리를 모른다) */
let wasDown = false;
function cues() {
  // 🧪 S005: 먹먹함은 실제 느린 시간일 때만(게이지 0 · 결과 화면에서는 안 걸림)
  const slowNow = s.down && s.g > 0 && s.phase === 'play';
  if (slowNow !== wasDown) ((wasDown = slowNow), slowNow && sfx.play('press'), sfx.slow(slowNow));
  for (let i = s.events.length - 1; i >= 0 && s.events[i].t === s.t; i--) {
    const e = s.events[i];
    if (e.kind === 'dash') (sfx.play('dash'), (e.n ?? 0) > 0 && sfx.play('slash', e.n));
    else if (e.kind === 'bounce') sfx.play('clink');
    else if (e.kind === 'ding' || e.kind === 'tok') sfx.play('clink');
    else if (e.kind === 'sweep') sfx.play('wave'), sfx.play('slash', 8); // 오너 피드백: 한 획 싹쓸이(🧪: 별 소리와 헷갈려 북 + 가장 높은 챙) // M2 S6 🔔 댕 · S7 🎋 툭
    else if (e.kind === 'shotcut') sfx.play('shotcut');
    else if (e.kind === 'hurt') sfx.play('hurt');
    else if (e.kind === 'fail') sfx.play('fail');
    else if (e.kind === 'clear') sfx.play('clear');
    else if (e.kind === 'wave') sfx.play('wave');
    else if (e.kind === 'strike') sfx.play('strike');
    else if (e.kind === 'whiffme') sfx.play('whiff');
  }
  if (s.phase === 'result' && s.ok) for (let j = 0; j < 3; j++) if (s.pt === 12 + j * 12 && s.starOk[j]) sfx.play('star', j + 1);
}

const q = new URLSearchParams(location.search);
// ✏️ M2 S1: ?trial=1 이면 월드 2 시험 판(🍃 2-1 '첫 기와')을 11판으로 붙여 바로 시작 — 오너·스크린샷용(판 목록엔 아직 없음)
const trial = q.get('trial') === '1';
// ✏️ M2 S4 별 저장(판마다 가장 좋은 별) · 월드 잠금: 월드 1 별 18개면 월드 2(지금은 2-1 시험 판)가 판 목록에 붙는다
const W1 = STAGES.slice(0, STAGE_COUNT).map((d) => d.key);
const bestOf = () => Object.fromEntries(STAGES.map((d) => [d.key, store.get('st:' + d.key)]));
const w2Open = () => trial || worldStars(bestOf(), W1) >= WORLD_LOCK;
const openW2 = () => { if (STAGES.length === STAGE_COUNT && w2Open()) STAGES.push(...TRIAL); };
openW2();
let paused = false, saved = -1;
let s: DashState = g.create(1), running = false, acc = 0, last = 0, keyboard = false, spaceDown = false;
let pointer: { x: number; y: number } | null = null, latch: { x: number; y: number } | null = null, cursor = { x: 0.5, y: 0.55 };
const keys = new Set<string>();
let W = 0, H = 0;

// M3 S1 오너 "렉이 좀 걸리는거 같고": 프레임이 50fps 밑으로 ¾초 넘게 처지면 캔버스 해상도를 한 단계 낮춘다(2 → 1.5 → 1.25, 다시 올리지 않음)
let dprCap = Number(q.get('dpr')) || 2, slowN = 0, ema = 16.7; // ?dpr=N: 측정용으로 해상도를 고정(🧪 M3 S1: 자동으로 내려간 값과 섞이지 않게)
const DPR_MIN = 1.25, fixedDpr = q.has('dpr');
const qualityTick = (ms: number) => {
  if (fixedDpr || ms > 100 || dprCap <= DPR_MIN) return; // 탭이 숨었거나 멈췄던 프레임은 빼고
  ema += (ms - ema) * 0.05;
  if (ema <= 21) return void (slowN = 0);
  if (++slowN < 45) return;
  dprCap = dprCap > 1.6 ? 1.5 : DPR_MIN; // 바닥 1.25(🧪: 1까지 내리면 그림이 흐려진다)
  (slowN = 0), (ema = 16.7);
  size();
};
function size() {
  const w = Math.min(root.clientWidth || 390, 460), dpr = Math.min(dprCap, window.devicePixelRatio || 1);
  (window as unknown as { __slowdashDpr?: number }).__slowdashDpr = dpr;
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
    `<b>느린 시간 닌자</b>` +
      `<ul><li><i>꾹</i>세상이 느려짐</li><li><i>긋기</i>꺾어 그린 길로</li><li><i>떼기</i>번쩍! 여럿 베기</li></ul>` + // S012 QC④ 이모지 0 · 한붓을 첫 화면에
      `<strong>시작</strong>` +
      (best ? `<span class="best">최고 ${best}점</span>` : '') +
      `<span class="kbd">키보드: 화살표로 겨누고 스페이스 눌렀다 떼기</span>`,
  );
}

function start() {
  const seed = Number(q.get('seed')) || (Date.now() % 1_000_000) + 1;
  s = g.create(seed);
  { const st = Math.floor(Number(q.get('stage'))) || (trial ? STAGE_COUNT + 1 : 0); if (st > 1 && st <= STAGES.length) startStage(s, st - 1); } // ✏️ S009 시험·스크린샷용 ?stage=N · M2 ?trial=1
  if (q.get('owl') === '1') s.owlAsk = true; // M2 S4 스크린샷용: 부엉이 카드부터
  sfx.wake();
  wasDown = false;
  running = true;
  overlay.hidden = true;
  (window as unknown as { __slowdashStarted?: number }).__slowdashStarted = performance.now(); // S3 측정: 켜고 누를 수 있을 때까지
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
    `<b>${sc}점</b>` + // S3 QC④ 이모지 0
      `<span class="msg">${s.won ? '시계탑 광장까지 다 지나갔어요!' : `${cleared}판까지 지나갔어요`} · ★ ${stars}</span>` +
      `<span class="best">최고 ${best}점</span><strong>다시</strong>`,
  );
}

/** M2 S4 부엉이 귀띔 카드: 길을 보여 줄까(★★★ 없음)? */
function askOwl() {
  paused = true;
  pointer = latch = null;
  picker.innerHTML = `<b>부엉!</b><span class="msg">길을 보여 줄까요? ★★까지 받을 수 있어요</span><span>(★★★는 혼자 해야 받아요)</span><div class="row"><button type="button" data-owl="1">길 보여 줘</button><button type="button" data-owl="0">혼자 할래</button></div>`;
  picker.hidden = false;
  picker.querySelector('button')?.focus();
}
/** M2 S4 판 고르기: 월드마다 판과 가장 좋은 별 · 잠긴 월드는 모을 별 수 */
function openPicker() {
  if (!running) return;
  paused = true;
  pointer = latch = null;
  const best = bestOf(), w1 = worldStars(best, W1), st = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);
  const btn = (i: number) => {
    // M2 S5 ㊳: 칸마다 판 이름 · 받은 별 · 못 받은 별 이름(다시 할 판을 고를 수 있게)
    const d = STAGES[i], b = best[d.key] ?? 0, m = store.get('sm:' + d.key), miss = d.stars.filter((_, j) => !(m & (1 << j))).map((q) => q.label);
    const note = b === 0 ? '아직 안 깸' : miss.length && b < 3 ? `못 받음: ${miss.join(' · ')}` : '별 다 받았어요';
    return `<button type="button" data-k="${i}"><span class="n"><i>${i < STAGE_COUNT ? i + 1 : `2-${i - STAGE_COUNT + 1}`}</i> ${d.name} <em>${st(b)}</em></span><small>${note}</small></button>`;
  };
  picker.innerHTML =
    `<b>판 고르기</b><span class="msg">태엽 마을 · ★ ${w1}/30</span><div class="grid">${W1.map((_, i) => btn(i)).join('')}</div>` +
    (STAGES.length > STAGE_COUNT
      ? `<span class="msg">기와 지붕 마을</span><div class="grid">${STAGES.slice(STAGE_COUNT).map((_, j) => btn(STAGE_COUNT + j)).join('')}</div>`
      : `<span class="msg">기와 지붕 마을 — 잠김</span><span>태엽 마을 별 ${WORLD_LOCK}개면 열려요 · 지금 ${w1}개</span>`) +
    `<div class="row"><button type="button" data-close="1">닫기</button></div>`;
  picker.hidden = false;
  picker.querySelector('button')?.focus();
}
picker.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('button');
  if (!b) return;
  if (b.dataset.owl) useOwl(s, b.dataset.owl === '1');
  else if (b.dataset.k) {
    const seed = (Date.now() % 1_000_000) + 1;
    s = g.create(seed);
    startStage(s, Number(b.dataset.k));
    const had = store.get('st:' + STAGES[Number(b.dataset.k)].key);
    if (had >= 1 && had < 3) s.owlAsk = true; // 🧪 S4: 이미 깬 판을 다시 하면 부엉이가 묻는다(★★까지 — 별 모으기)
    saved = -1;
  }
  picker.hidden = true;
  paused = false;
  last = performance.now();
  canvas.focus({ preventScroll: true });
});
const pickBtn = document.getElementById('pick');
pickBtn?.addEventListener('click', () => (picker.hidden ? openPicker() : (picker.hidden = true, (paused = false), (last = performance.now()))));

function loop(now: number) {
  if (!running) return;
  acc += Math.min(0.25, (now - last) / 1000);
  qualityTick(now - last);
  last = now;
  while (acc >= TICK) {
    const kx = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0), ky = (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0);
    cursor = { x: Math.max(0, Math.min(1, cursor.x + kx * 0.012)), y: Math.max(0, Math.min(1, cursor.y + ky * 0.012 / aspect * 1.4)) };
    if (spaceDown) pointer = { ...cursor };
    // 아주 짧은 탭도 최소 한 틱은 '누름'으로 보이게
    if (paused) { acc = 0; break; } // 판 고르기·귀띔 카드가 떠 있는 동안 세상이 멈춘다
    g.step(s, { tap: false, dir: 0, pointer: pointer ?? latch });
    cues();
    latch = null;
    acc -= TICK;
    if (s.phase === 'result' && s.ok && saved !== s.t) { // M2 S4: 깬 판의 별을 저장(가장 좋은 것만)
      saved = s.t;
      const k = 'st:' + STAGES[s.stage].key;
      if (s.got > store.get(k)) store.set(k, s.got);
      const mk = 'sm:' + STAGES[s.stage].key; // M2 S5 ㊳: 어떤 별을 받았는지(1 = 한 번에 N · 2 = 안 맞기)
      store.set(mk, store.get(mk) | (s.starOk[1] ? 1 : 0) | (s.starOk[2] ? 2 : 0));
      openW2();
    }
    if (s.owlAsk && !paused) askOwl();
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
  sfx.wake(); // 켜자마자 시작이라 첫 누름에 소리를 깨운다
  pointer = latch = toPoint(e);
});
canvas.addEventListener('pointermove', (e) => void (pointer && (pointer = toPoint(e))));
const release = () => void (pointer = null);
window.addEventListener('pointerup', release);
window.addEventListener('pointercancel', release);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => void (e.key === 'm' || e.key === 'M' ? toggleSound() : 0));
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !picker.hidden && !s.owlAsk) (picker.hidden = true), (paused = false), (last = performance.now()); }); // M2 S4 판 고르기 닫기
canvas.addEventListener('keydown', (e) => {
  if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault();
  if (!running) return;
  if (e.key.startsWith('Arrow')) (keys.add(e.key), (keyboard = true));
  if (e.key === ' ' && !e.repeat) (spaceDown = true), (keyboard = true), (pointer = { ...cursor }), sfx.wake();
});
canvas.addEventListener('keyup', (e) => {
  keys.delete(e.key);
  if (e.key === ' ') (spaceDown = false), (pointer = null);
});
canvas.addEventListener('blur', () => (keys.clear(), (spaceDown = false)));
overlay.addEventListener('click', start);
window.addEventListener('resize', size);

size();
// ✏️ M2 S3 켜자마자 1-1(GDD §7 · M2 허들 1): 타이틀 없이 바로 판이 흐른다 — 제목은 1-1을 깬 뒤 화면에 한 번. 소리는 첫 누름에 깨운다(브라우저 규칙)
//   ?title=1 이면 예전처럼 타이틀부터(스크린샷·비교용)
if (q.get('title') === '1') title();
else start();
// M3 S5 렉(🧪: 첫 '번쩍'이 판마다 한 번 끊김 — 트레이스로 보니 그 프레임만 게임 코드가 23~25ms, 평소 6~11ms):
//   처음 도는 돌진·베기·그리기 코드를 브라우저가 그때 처음 컴파일하는 비용이다 → 켜자마자 화면 밖 가짜 판에서 한 번 베고 그려 둔다(시드·저장·소리는 안 건드림)
//   🧪 S5: 한 번에 하면 켠 뒤 0.2~0.4초 멈춘다 → 프레임마다 3ms씩 나눠 한다
{
  const t = g.create(7), c = document.createElement('canvas').getContext('2d')!;
  if (s.stage) startStage(t, s.stage); // 지금 하는 판의 적·장치 코드까지(대장 휙 · 대나무 쓰러짐)
  let i = 0;
  (c.canvas.width = W), (c.canvas.height = H);
  const warm = () => {
    try {
      for (const t0 = performance.now(); i < 240 && performance.now() - t0 < 3; i++) { // 꺾은 획 한 번 + 곧은 획 한 번
        const pt = i >= 60 && i < 100 ? { x: 0.3, y: 0.5 } : i >= 100 && i < 130 ? { x: 0.7, y: 0.3 } : i >= 160 && i < 190 ? { x: 0.5, y: 0.25 } : null;
        g.step(t, { tap: false, dir: 0, pointer: pt });
        if ((i > 125 && i < 145) || (i > 185 && i < 205)) (g.draw(c, t, W, H, pal), (i += 1)); // 그리기는 한 조각에 한 번
      }
      if (i < 240) requestAnimationFrame(warm);
    } catch { /* 예열이 실패해도 게임은 그대로 */ }
  };
  requestAnimationFrame(warm);
}
// 타이틀 뒤에서도 달밤이 흐르게(시뮬은 멈춘 채 그림만)
(function idle() {
  if (!running) draw();
  requestAnimationFrame(idle);
})();
