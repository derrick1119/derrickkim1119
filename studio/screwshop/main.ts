/**
 * 나사 풀기 공방 — 플레이 빌드 진입점 (M0: 발견 공장 arcade/play.ts의 'touch' 조작부를 이 게임 전용으로 옮김).
 * 시뮬레이션과 같은 코드로 60fps 고정 틱. 조작: 나사를 누르고 있으면 미리 보기, 떼면 풀기 · 화살표로 커서 + 스페이스.
 */
import { TICK, type Input } from './core.ts';
import { juice, peek } from './juice.ts';
import { sfx } from './sfx.ts';
import { STAGES, setAspect, setCue, setLearn, startStage, screwshop as g, type ShopState } from './game.ts';

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
// 판 고르기(📋 M2 · ✏️ S011): 제목 화면의 '🗺️ 판 고르기' → 월드 3 × 10칸. 실린 판만 고를 수 있고 별은 판 id로 저장(🎨 ART M2 §6 와이어)
const pickBtn = document.createElement('button'), pick = document.createElement('div');
pickBtn.type = 'button';
pickBtn.className = 'g-pickbtn';
pickBtn.textContent = '🗺️ 판 고르기';
pick.className = 'g-pick';
pick.hidden = true;
pick.setAttribute('role', 'dialog');
pick.setAttribute('aria-label', '판 고르기');
root.append(canvas, overlay, pickBtn, pick);
const WORLDS = ['아기방 장난감 상자', '바닷가 언덕 마을', '동화 성 놀이공원'];
let world = 1;
const ctx = canvas.getContext('2d')!;
let aspect = g.aspect ?? 1.45; // ✏️ S013: 화면 높이로 늘림(🎨 ART §6 390 레이아웃 · 1.45~1.90)

let s: ShopState = g.create(1), running = false, acc = 0, last = 0, keyboard = false, spaceDown = false;
let pointer: { x: number; y: number } | null = null, latch: { x: number; y: number } | null = null, cursor = { x: 0.5, y: 0.6 };
const keys = new Set<string>();
let learnSaved = -1;
let W = 0, H = 0, steps = 0, slow = false; // slow: 슬로모 틱 번갈이(프레임을 넘어 유지해야 한다 — 프레임마다 되돌리면 60Hz에서 멈춘다)
const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// 소리·진동 (🎨 ART §5): 헤더 오른쪽 🔊 · 📳(진동 API가 있을 때만). 저장, M키. 첫 소리는 '시작' 누름에서
setCue((c, v) => sfx.play(c, v));
sfx.muted = store.get('mute') === 1;
sfx.noBuzz = store.get('nobuzz') === 1;
const soundBtn = document.getElementById('sound') as HTMLButtonElement, buzzBtn = document.getElementById('buzz') as HTMLButtonElement;
buzzBtn.hidden = typeof navigator.vibrate !== 'function';
function showToggles() {
  soundBtn.textContent = sfx.muted ? '🔇' : '🔊';
  soundBtn.setAttribute('aria-pressed', String(!sfx.muted));
  soundBtn.setAttribute('aria-label', sfx.muted ? '소리 켜기' : '소리 끄기');
  buzzBtn.style.opacity = sfx.noBuzz ? '.4' : '1';
  buzzBtn.setAttribute('aria-pressed', String(!sfx.noBuzz));
}
function toggleSound() {
  sfx.setMuted(!sfx.muted);
  store.set('mute', sfx.muted ? 1 : 0);
  if (!sfx.muted) sfx.wake(), sfx.play('in', 1); // 켜는 누름도 사용자 입력 — 미리 듣기 쏙
  showToggles();
}
soundBtn.addEventListener('click', toggleSound);
buzzBtn.addEventListener('click', () => {
  sfx.noBuzz = !sfx.noBuzz;
  store.set('nobuzz', sfx.noBuzz ? 1 : 0);
  if (!sfx.noBuzz) sfx.wake(), sfx.buzz('done');
  showToggles();
});
showToggles();
document.addEventListener('visibilitychange', () => (document.hidden ? sfx.sleep() : running && sfx.wake()));

function size() {
  const dpr = window.devicePixelRatio || 1;
  const head = document.querySelector('header')?.getBoundingClientRect().height ?? 44;
  const avail = window.innerHeight - head - 8, w0 = Math.max(240, Math.min(root.clientWidth, 460));
  aspect = setAspect(avail / w0);
  W = Math.max(240, Math.min(w0, avail / aspect));
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
  peek(s)?.render(ctx, W, H, steps); // 공용 연출은 여기서 한 번에 — 이번 프레임에 흐른 1/60초 조각 수만큼만 움직인다(120Hz 폰 보정)
  steps = 0;
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

/** 판별 최고 별을 판 id로 저장(판 순서가 바뀌어도 그대로) */
function keepStars() {
  s.bestSt.forEach((v, i) => v > store.get('st' + STAGES[i].id) && store.set('st' + STAGES[i].id, v));
}
function showPick(w = world) {
  world = Math.max(1, Math.min(3, w));
  // 📋 S018 R5: 월드 3은 8판 — 칸 수 = 그 월드에 실린 마지막 판 번호(빈 자리는 '준비 중')
  const cells = Array.from({ length: Math.max(...STAGES.filter((d) => d.slot.startsWith(`${world}-`)).map((d) => +d.slot.split('-')[1])) }, (_, n) => {
    const slot = `${world}-${n + 1}`, k = STAGES.findIndex((d) => d.slot === slot);
    if (k < 0) return `<button type="button" disabled aria-label="${slot} 준비 중"><i>${slot}</i><em>🔒</em><small>준비 중</small></button>`;
    const d = STAGES[k], st = store.get('st' + d.id);
    return `<button type="button" data-k="${k}" aria-label="${slot} ${d.name}, 별 ${st}개"><i>${slot}</i><em>${d.emoji}</em><small>${d.name}</small><b>${'★'.repeat(st)}${'☆'.repeat(3 - st)}</b></button>`;
  }).join('');
  pick.innerHTML = `<nav><button type="button" data-w="${world - 1}" aria-label="앞 월드"${world > 1 ? '' : ' disabled'}>◀</button><span>월드 ${world} · ${WORLDS[world - 1]}</span><button type="button" data-w="${world + 1}" aria-label="다음 월드"${world < 3 ? '' : ' disabled'}>▶</button></nav><div>${cells}</div><button type="button" data-x="1">닫기</button>`;
  pick.hidden = false;
  pickBtn.hidden = true;
  (pick.querySelector('[data-k]') as HTMLElement | null)?.focus({ preventScroll: true });
}
pick.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('button');
  if (!b || b.disabled) return;
  if (b.dataset.w) return showPick(Number(b.dataset.w));
  pick.hidden = true;
  if (b.dataset.k) return start(Number(b.dataset.k));
  pickBtn.hidden = false;
  overlay.focus({ preventScroll: true });
});
pick.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') (pick.hidden = true), (pickBtn.hidden = false), overlay.focus({ preventScroll: true });
  if (e.key === 'q' || e.key === 'Q' || e.key === 'e' || e.key === 'E') showPick(world + (e.key.toLowerCase() === 'e' ? 1 : -1));
});
pickBtn.addEventListener('click', () => showPick());

function title() {
  const b = store.get('best'), st = store.get('stars');
  show(`<em>🐹🔩</em><b>나사 풀기 공방</b>
<ul><li>🔩 나사를 <i>톡</i> → 같은 색 상자로 쏙!</li><li>🎐 나사 하나 남은 판자는 매달려 빙글 — 다른 나사를 덮거나 드러내요</li><li>🧺 빈칸 5개가 다 차면 실패, 판자를 다 떨구면 완성</li></ul>
<strong>시작</strong><span>누르고 있으면 갈 곳이 보여요 · 키보드: 화살표 + 스페이스</span>${b ? `<span class="best">최고 ${b}점 · ★${st}</span>` : ''}`);
}

function start(pickK?: number) {
  pickBtn.hidden = true;
  sfx.wake(); // 첫 AudioContext는 여기서(자동재생 정책)
  sfx.play('press');
  const q = new URLSearchParams(location.search), fixed = Number(q.get('seed')), st = Number(q.get('stage')); // ?seed=N: 같은 판 다시 보기 · ?stage=N: N판부터(스크린샷·버그 제보)
  s = g.create(fixed > 0 ? fixed : (Date.now() % 1_000_000) + 1);
  if (st > 1 && st <= STAGES.length) startStage(s, st - 1);
  if (typeof pickK === 'number') startStage(s, pickK);
  setLearn(s, store.get('learn')); // ✏️ S024: 배운 별(단계별 배우기) — 저장이 없으면 처음부터
  if (Number(q.get('fails')) > 0) s.sf = Number(q.get('fails')); // ?fails=N: 이 판에서 N번 진 것으로(귀띔 단추 보기 · 스크린샷)
  if (q.get('hint')) (s.sf = 3), (s.hint = true); // ?hint=1: 귀띔 켠 판
  juice(s).calm = calm;
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
  keepStars();
  pickBtn.hidden = false;
  draw();
  const head = s.won ? `🎉 실린 ${STAGES.length}판 모두 완성!` : `🐹 ${STAGES[s.stage].slot} ${STAGES[s.stage].emoji} ${STAGES[s.stage].name}에서 멈췄어요`;
  show(`<b>${sc}점</b><span class="msg">${head}</span><span>★ ${s.stars} / ${STAGES.length * 3} · 최고 ${b}점</span><strong>다시 하기</strong>`);
}

function loop(now: number) {
  if (!running) return;
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (acc >= TICK) {
    acc -= TICK;
    steps++;
    // 히트스톱(🎨): 시뮬만 멈추고 연출은 흐른다. 누른 입력은 latch에 남아 다음 틱에 들어간다
    const j = peek(s);
    if (j?.stop) {
      j.stop--;
      continue;
    }
    // 마지막 나사 슬로모(🎨): 판이 다 풀리는 순간 40틱을 0.5배로
    if (s.phase === 'settle' && s.ok && s.pt < 40 && !calm && (slow = !slow)) continue;
    const kx = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0), ky = (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0);
    cursor = { x: Math.max(0, Math.min(1, cursor.x + kx * 0.012)), y: Math.max(0, Math.min(1, cursor.y + ky * 0.012)) };
    if (spaceDown) pointer = { ...cursor };
    // 아주 짧은 탭(한 프레임 안에 눌렀다 뗌)도 최소 한 틱은 '누름'으로 보이게
    const input: Input = { tap: false, dir: 0, pointer: pointer ?? latch };
    latch = null;
    const st0 = s.stage;
    g.step(s, input);
    if (s.learn !== learnSaved) store.set('learn', (learnSaved = s.learn));
    if (s.menu) (s.menu = false), showPick(); // 도구 줄 🗺️ 판(✏️ S013)
    if (s.stage !== st0) keepStars();
    if (g.over(s)) return end();
  }
  draw();
  requestAnimationFrame(loop);
}

/** ✏️ S027 🧪 🟡③: 별 카드가 떠 있으면 첫 누름은 카드를 닫는다 — 카드 위를 누른 것은 판에 안 넘긴다(가린 나사가 몰래 톡 되지 않게 · 시뮬 밖 화면 몫) */
const closeCard = (p: { x: number; y: number }) => {
  const b = s.cardBox;
  if (!b || s.phase !== 'play' || s.taps > 0 || s.cardOff) return false;
  s.cardOff = true;
  return p.x >= b[0] && p.x <= b[2] && p.y >= b[1] && p.y <= b[3];
};
const toPoint = (e: PointerEvent) => {
  const r = canvas.getBoundingClientRect();
  return { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) };
};
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!running) return;
  keyboard = false;
  const p = toPoint(e);
  if (closeCard(p)) return;
  pointer = latch = p;
});
canvas.addEventListener('pointermove', (e) => void (pointer && e.buttons && (pointer = toPoint(e))));
canvas.addEventListener('pointerleave', () => void (pointer = null));
window.addEventListener('pointerup', () => void (pointer = null));
window.addEventListener('pointercancel', () => void (pointer = null));
window.addEventListener('pointerup', () => running && sfx.wake());
window.addEventListener('keydown', (e) => {
  if ((e.key === 'm' || e.key === 'M') && !e.repeat) toggleSound();
});
canvas.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key.startsWith('Arrow') || e.key === 'Enter') e.preventDefault();
  if (!running) return;
  if (e.key.startsWith('Arrow')) (keys.add(e.key), (keyboard = true));
  if ((e.key === ' ' || e.key === 'Enter') && !e.repeat && !closeCard(cursor)) (spaceDown = true), (keyboard = true), (pointer = { ...cursor });
});
canvas.addEventListener('keyup', (e) => {
  keys.delete(e.key);
  if (e.key === ' ' || e.key === 'Enter') (spaceDown = false), (pointer = null);
});
canvas.addEventListener('blur', () => (keys.clear(), (spaceDown = false), (pointer = null)));
overlay.addEventListener('click', () => start());
window.addEventListener('resize', size);
size();
title();
