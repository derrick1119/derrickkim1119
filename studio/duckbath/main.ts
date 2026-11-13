/**
 * 플레이 빌드의 브라우저 쪽 — arcade/play.ts의 'touch' 부분을 옮겨 왔다.
 * 조작: 물을 꾹 누르면 미리 보기, 떼면 찰박 · 키보드 화살표로 커서, 스페이스를 누르는 동안 미리 보기 → 떼면 찰박.
 */
import { TICK, type Input } from './core.ts';
import { STAGES, advance, duckbath as g, failText, hintPoint, precomputeHint, startStage, type DuckState } from './game.ts';
import { peek } from './juice.ts';
import { makeStore } from './save.ts';

/** D005: 판별 최고 별·열린 판 저장 (막히면 메모리) */
const save = makeStore(STAGES.length);
/** 이번 세션의 판별 ↺ 횟수 (판 고르기를 다녀와도 👆 유지, 🧪 D005) */
const tries: number[] = STAGES.map(() => 0);

const root = document.getElementById('game')!;
const aspect = g.aspect ?? 1;
const canvas = document.createElement('canvas');
canvas.className = 'g-canvas';
canvas.tabIndex = 0;
canvas.setAttribute('aria-label', `${g.name} 게임 화면. ${g.rules.join(' ')} 키보드는 화살표로 고르고 스페이스.`);
const overlay = document.createElement('button');
overlay.type = 'button';
overlay.className = 'g-overlay';
// D004 (ART 10장 ⑥): 결과·실패 카드는 DOM — 버튼을 Tab·Enter·R로 누를 수 있게
const card = document.createElement('div');
card.className = 'card';
card.setAttribute('role', 'dialog');
card.setAttribute('aria-live', 'polite');
card.hidden = true;
// D005: 판 고르기 화면 (욕실 하나 = 판 8개, 별로 다음 판이 열린다)
const levels = document.createElement('section');
levels.className = 'levels';
levels.setAttribute('aria-label', '판 고르기');
levels.hidden = true;
root.append(canvas, overlay, card, levels);
const ctx = canvas.getContext('2d')!;
let s: DuckState = g.create(1), running = false, acc = 0, last = 0, keyboard = false, spaceDown = false;
let pointer: { x: number; y: number } | null = null, latch: { x: number; y: number } | null = null, cursor = { x: 0.5, y: 0.5 };
const keys = new Set<string>();
// 확인용(shots.ts): 상태 보기 · i번째 판으로 건너뛰기
(globalThis as any).__duck = { state: () => s, running: () => running, jump: (i: number) => (startStage(s, i), (card.hidden = true), (cardFor = '')), levels: () => showLevels(false), save: () => save.data };

function size() {
  // D001 (ART 10장 ①): 머리 44px를 뺀 화면 높이에 맞춘다 — 390×844에서 390×593(화면 70%)
  const w = Math.min(root.clientWidth, 440, Math.floor((innerHeight - 44 - 8) / aspect)), dpr = window.devicePixelRatio || 1;
  canvas.style.borderRadius = w >= 440 ? '14px' : '0';
  canvas.style.width = `${w}px`;
  canvas.style.height = `${w * aspect}px`;
  root.style.setProperty('--cw', `${w}px`);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(w * aspect * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
function draw() {
  const dpr = window.devicePixelRatio || 1, w = canvas.width / dpr, h = canvas.height / dpr;
  g.draw(ctx, s, w, h, g.art!.palette);
  peek(s)?.render(ctx, w, h);
  // D004 ↺2 손가락: 같은 판을 두 번 넘게 실패하면 숙련 봇의 첫 톡 자리를 두드린다
  const hp = running ? hintPoint(s) : null;
  if (hp) {
    const k = (performance.now() / 800) % 1, bob = Math.sin(k * Math.PI * 2) * 6;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(hp.x * w, hp.y * h, 10 + k * 18, 0, Math.PI * 2);
    ctx.globalAlpha = 0.9 * (1 - k);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = '28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👆', hp.x * w + 4, hp.y * h + 30 + bob);
    ctx.restore();
  }
  if (keyboard && running) {
    ctx.strokeStyle = spaceDown ? '#ffffff' : 'rgba(255,255,255,.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cursor.x * w, cursor.y * h, spaceDown ? 7 : 10, 0, Math.PI * 2);
    ctx.stroke();
  }
}
function show(html: string) {
  overlay.innerHTML = html;
  overlay.hidden = false;
}
const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
let cardFor = '';
/** 결과 카드: 별마다 이유 한 줄 · 실패 카드: 원인별 웃긴 제목 + 팁 + 남은 오리 (ART 10장 ⑥, 하트 없음) */
function renderCard() {
  const key = `${s.stage}:${s.tries}:${s.ok}:${s.got}`;
  if (cardFor === key) return;
  cardFor = key;
  const d = STAGES[s.stage], last = s.stage === STAGES.length - 1;
  if (s.ok) {
    const [, tapOk, goldOk] = s.starOk, n = s.got;
    const line = (ok: boolean, yes: string, no: string) => `<li class="${ok ? 'ok' : 'todo'}"><i>${ok ? '★' : '☆'}</i>${esc(ok ? yes : no)}</li>`;
    save.clear(s.stage, n); // D005: 깬 판 저장 → 다음 판이 열린다
    card.className = 'card win';
    card.innerHTML = `<h2>${last ? '목욕 다 끝! 🛁' : n === 3 ? '깨끗!' : n === 2 ? '뽀득!' : '목욕 끝!'}</h2><ul>${line(true, '오리 모두 둥지에 쏙', '')}${line(tapOk, `톡 ${s.used}번 — ${d.par}번 안에!`, `톡 ${s.used}번 · ${d.par}번 안이면 ★`)}${line(goldOk, '황금 오리 먼저 쏙!', '👑 황금 오리가 꼴찌만 아니면 ★')}</ul><div class="row"><button type="button" class="ico" data-a="levels" aria-label="판 고르기">▦</button><button type="button" class="btn2" data-a="retry">↺ 다시</button><button type="button" class="btn" data-a="next">${last ? '판 고르기 ▶' : '다음 목욕 ▶'}</button></div>`;
  } else {
    // 🎨 D004: 뿅 규칙 뒤로 실패는 늘 '톡 다 씀' — 문구는 톡을 가져간 주범으로 고른다
    // D005: 주범이 클 때만 주범 제목, 아니면 '톡 바닥' + 그 판의 교훈(failText, 🧪 N4)
    const { title, tip } = failText(s);
    tries[s.stage] = s.stageTries; // D005: 판 고르기를 다녀와도 이 판의 ↺ 횟수(👆)를 기억
    const soon = s.stageTries >= 2 ? '<p class="soon">👆 다음엔 손가락이 첫 자리를 알려 줘요</p>' : '';
    const left = s.objs.filter((o) => o.st === -1 && (o.k === 0 || o.k === 2)).length;
    const why = [left ? `🦆 ${left}마리 남음` : '', s.sucks ? `꼬르륵 ×${s.sucks}` : '', s.chomps ? `냠 ×${s.chomps}` : ''].filter(Boolean).join(' · ');
    card.className = 'card lose';
    card.innerHTML = `<h2>${esc(title)}</h2><p class="tip">💡 ${esc(tip)}</p>${why ? `<p class="why">${esc(why)}</p>` : ''}${soon}<div class="row"><button type="button" class="ico" data-a="levels" aria-label="판 고르기">▦</button><button type="button" class="btn" data-a="retry">↺ 같은 목욕 다시</button></div>`;
  }
  card.hidden = false;
  placeCard();
  if (!s.ok) setTimeout(() => precomputeHint(s), 50); // D005: 다음 시도의 👆를 카드가 떠 있는 동안 계산
  card.querySelector<HTMLButtonElement>('.btn')!.focus({ preventScroll: true });
}
/** 🎨 D004 '엄지 도킹': 캔버스 아래 빈 자리가 넉넉하면 거기, 모자라면 캔버스 아래쪽 위로 올라와 겹친다 */
function placeCard() {
  if (card.hidden) return;
  const r = canvas.getBoundingClientRect();
  card.style.top = `${Math.round(Math.max(r.top + 52, Math.min(r.bottom + 12, innerHeight - 12 - card.offsetHeight)))}px`;
}
window.addEventListener('resize', placeCard);
function act(a: 'next' | 'retry') {
  if (!running || s.phase !== 'result') return;
  advance(s, a);
  card.hidden = true;
  cardFor = '';
  canvas.focus({ preventScroll: true });
}
card.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest('button')?.dataset.a;
  if (a === 'next' || a === 'retry') act(a);
  if (a === 'levels') showLevels(false);
});

/** 판마다 처음 나오는 새것 (잠긴 칸 예고, FUN S9) */
const NEW_ICON: Record<number, string> = { 1: '🫧', 2: '🕳️', 3: '🎨', 4: '⛵', 5: '🦈', 6: '🚰', 7: '🧼' };
/** D005 판 고르기: 열린 판은 번호 + 최고 별, 잠긴 판은 거품. Tab·Enter·화살표 */
function showLevels(done: boolean) {
  running = false;
  card.hidden = true;
  cardFor = '';
  overlay.hidden = true;
  const b = save.data.best, total = b.reduce((x, y) => x + y, 0), open = save.data.open;
  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);
  levels.innerHTML = `<h2>${done ? '목욕 다 끝! 🛁' : '🛁 민트 욕실'}</h2><p class="sum">★ ${total} / ${STAGES.length * 3}</p><div class="grid">${STAGES.map((_, i) =>
    i < open
      ? `<button type="button" class="lv${i === open - 1 && !b[i] ? ' next' : ''}" data-i="${i}" aria-label="${i + 1}번째 목욕, 별 ${b[i]}개"><b>${i + 1}</b><span>${stars(b[i])}</span></button>`
      : `<button type="button" class="lv" disabled aria-label="${i + 1}번째 목욕, 잠김"><b>${NEW_ICON[i] ?? '🫧'}</b><span>${i + 1} · 잠김</span></button>`, // 🧪 D005 S9: 잠긴 칸이 그 판의 새것을 예고
  ).join('')}</div>${save.persistent ? '' : '<p class="note">이 브라우저에선 진행이 저장되지 않아요</p>'}`;
  levels.hidden = false;
  const focus = levels.querySelector<HTMLButtonElement>('.lv.next') ?? levels.querySelectorAll<HTMLButtonElement>('.lv:not([disabled])')[Math.max(0, Math.min(open, STAGES.length) - 1)];
  focus?.focus({ preventScroll: true });
}
levels.addEventListener('click', (e) => {
  const i = (e.target as HTMLElement).closest<HTMLButtonElement>('button.lv:not([disabled])')?.dataset.i;
  if (i !== undefined) play(Number(i));
});
levels.addEventListener('keydown', (e) => {
  const d = ({ ArrowRight: 1, ArrowLeft: -1, ArrowDown: 4, ArrowUp: -4 } as Record<string, number>)[e.key];
  if (!d) return;
  e.preventDefault();
  const bs = [...levels.querySelectorAll<HTMLButtonElement>('.lv')], k = bs.indexOf(document.activeElement as HTMLButtonElement);
  const t = bs[Math.max(0, Math.min(bs.length - 1, k + d))];
  if (t && !t.disabled) t.focus();
});
window.addEventListener('keydown', (e) => {
  if (!card.hidden && (e.key === 'r' || e.key === 'R')) (e.preventDefault(), act('retry'));
});

/** 처음 오는 사람은 바로 1판(GDD §8), 다녀간 사람은 판 고르기 */
function start() {
  if (save.data.open <= 1 && !save.data.best[0]) play(0);
  else showLevels(false);
}
function play(i: number) {
  s = g.create((Date.now() % 1_000_000) + 1);
  s.manual = true; // D004: 결과·실패 카드에서 버튼을 기다린다
  s.best = save.data.best.slice();
  s.stars = s.best.reduce((x, y) => x + y, 0);
  if (i > 0) startStage(s, i);
  s.stageTries = tries[i];
  levels.hidden = true;
  card.hidden = true;
  cardFor = '';
  running = true;
  overlay.hidden = true;
  last = performance.now();
  acc = 0;
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
    const input: Input = { tap: false, dir: 0, pointer: pointer ?? latch };
    latch = null;
    g.step(s, input);
    acc -= TICK;
    // 결과는 잠깐 연출을 본 뒤(성공 0.7초 · 실패 1초) 카드
    if (s.phase === 'result' && s.pt >= (s.ok ? 30 : 60)) renderCard();
    if (g.over(s)) {
      draw();
      return showLevels(true); // D005: 마지막 판 뒤엔 판 고르기(별 모음)로
    }
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
  if (running) pointer = latch = toPoint(e);
});
canvas.addEventListener('pointermove', (e) => void (pointer && e.buttons && (pointer = toPoint(e))));
window.addEventListener('pointerup', () => (pointer = null));
canvas.addEventListener('pointercancel', () => (pointer = null));
canvas.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter' || e.key.startsWith('Arrow')) e.preventDefault();
  if (!running && (e.key === ' ' || e.key === 'Enter')) return start();
  if (e.key.startsWith('Arrow')) (keys.add(e.key), (keyboard = true));
  if (e.key === ' ' && running) (spaceDown = true), (pointer = { ...cursor });
});
canvas.addEventListener('keyup', (e) => {
  keys.delete(e.key);
  if (e.key === ' ') (spaceDown = false), (pointer = null);
});
overlay.addEventListener('click', start);
overlay.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') (e.preventDefault(), start());
});
size();
// 규칙 2줄(GDD §2)은 머리 대신 시작 카드에 (ART 10장 ①·⑤ 1차)
const touchFirst = !matchMedia('(hover:hover) and (pointer:fine)').matches;
show(`<b>🦆 목욕 시작</b><span>물을 톡! 찰박 물결이 오리를 둥지로</span><span>${touchFirst ? '👆 꾹 누르면 갈 길 · 떼면 찰박!' : '⌨️ 화살표 · 스페이스 꾹 → 떼면 찰박'}</span>`);
new ResizeObserver(size).observe(root);
