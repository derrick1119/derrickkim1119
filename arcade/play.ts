/**
 * 브라우저 플레이어 (실험 0011). 계기판 아티팩트·제품 페이지 공용.
 * <div data-game="<id>"> 안에 캔버스를 만들고, 시뮬레이션과 같은 코드로 60fps 고정 틱을 돌린다.
 * 조작: 원버튼 = 화면 탭·스페이스, 좌우 = 드래그·화살표 키.
 */
import { TICK, type GameDef, type Input, type Theme } from './core.ts';
import { peek } from './juice.ts';
import { GAMES } from './registry.ts';

function theme(el: HTMLElement): Theme {
  const cs = getComputedStyle(el);
  const v = (k: string, d: string) => cs.getPropertyValue(k).trim() || d;
  return { bg: v('--g-bg', '#f4f7f6'), ink: v('--g-ink', '#142427'), muted: v('--g-muted', '#8a9b9e'), accent: v('--g-accent', '#0b7285'), hot: v('--g-hot', '#d9480f'), soft: v('--g-soft', '#dde7e7') };
}

const store = {
  get(k: string) { try { return Number(localStorage.getItem('arcade:' + k) ?? 0); } catch { return 0; } },
  set(k: string, v: number) { try { localStorage.setItem('arcade:' + k, String(v)); } catch { /* 저장 불가여도 동작 */ } },
};

function mount(root: HTMLElement, g: GameDef<any>) {
  const aspect = g.aspect ?? (g.controls === 'leftright' ? 1.5 : 1);
  const canvas = document.createElement('canvas');
  canvas.className = 'g-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', `${g.name} 게임 화면. ${g.hint ?? (g.controls === 'tap' ? '스페이스나 화면 탭' : g.controls === 'hold' ? '스페이스나 화면을 꾹 눌렀다 떼기' : g.controls === 'touch' ? '화면 왼쪽·오른쪽 누르기와 카드 탭(또는 ← →, 숫자 1 2 3)' : g.controls === 'swipe' ? '밀기와 탭(또는 화살표·스페이스)' : '좌우 화살표나 드래그')}로 조작`);
  const overlay = document.createElement('button');
  overlay.type = 'button';
  overlay.className = 'g-overlay';
  root.append(canvas, overlay);
  const ctx = canvas.getContext('2d')!;
  let s: any = null, seed = 1, running = false, acc = 0, last = 0, tapQueued = false, holding = false, aim: number | undefined, pointer: { x: number; y: number } | null = null, pick: number | undefined, move: Input['move'], swipeFrom: { x: number; y: number } | null = null, cursor = { x: 0.5, y: 0.5 }, spaceDown = false;
  const keys = new Set<string>();

  function size() {
    const w = Math.min(root.clientWidth, 380), dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${w * aspect}px`;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(w * aspect * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  let keyboard = false;
  const draw = () => {
    if (!s) return;
    const w = canvas.width / (window.devicePixelRatio || 1), h = canvas.height / (window.devicePixelRatio || 1);
    g.draw(ctx, s, w, h, g.art?.palette ?? theme(root));
    peek(s)?.render(ctx, w, h); // 공용 연출은 여기서 한 번에 (게임이 빠뜨리지 않게)
    // 'touch' 게임을 키보드로 할 때만: 가상 커서 고리
    if (keyboard && running && g.controls === 'touch') {
      ctx.strokeStyle = spaceDown ? '#ffffff' : 'rgba(255,255,255,.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cursor.x * w, cursor.y * h, spaceDown ? 7 : 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  };
  function show(text: string) {
    overlay.innerHTML = text;
    overlay.hidden = false;
  }
  function start() {
    seed = (Date.now() % 1_000_000) + 1;
    s = g.create(seed);
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
      const dir = ((keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0)) as -1 | 0 | 1;
      // 'touch' 게임 키보드: 화살표로 가상 커서를 움직이고, 스페이스를 누르고 있으면 그 자리를 누른 것
      if (g.controls === 'touch') {
        const kx = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0), ky = (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0);
        cursor = { x: Math.max(0, Math.min(1, cursor.x + kx * 0.012)), y: Math.max(0, Math.min(1, cursor.y + ky * 0.012)) };
        if (spaceDown) pointer = { ...cursor };
      }
      const input: Input = { tap: tapQueued, hold: holding, dir: g.controls === 'touch' && spaceDown ? 0 : dir, aim, pointer, pick, move };
      tapQueued = false;
      pick = undefined;
      move = undefined;
      g.step(s, input);
      acc -= TICK;
      if (g.over(s)) {
        running = false;
        const sc = g.score(s), best = Math.max(sc, store.get(g.id));
        store.set(g.id, best);
        draw();
        show(`<b>${sc}점</b><span>최고 ${best}점 · 누르면 다시</span>`);
        return;
      }
    }
    draw();
    requestAnimationFrame(loop);
  }
  const toAim = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  };
  const toPoint = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) };
  };
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!running) return;
    if (g.controls === 'touch') return void (pointer = toPoint(e));
    if (g.controls === 'swipe') return void (swipeFrom = toPoint(e));
    if (g.controls === 'tap') tapQueued = true;
    else if (g.controls === 'hold') (tapQueued = true), (holding = true);
    else aim = toAim(e);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (g.controls === 'touch') return void (pointer && e.buttons && (pointer = toPoint(e)));
    if (g.controls === 'leftright' && running && (e.buttons || e.pointerType === 'mouse')) aim = toAim(e);
  });
  canvas.addEventListener('pointerleave', () => ((aim = undefined), (holding = false), (pointer = null)));
  window.addEventListener('pointerup', (e) => {
    holding = false;
    pointer = null;
    if (g.controls !== 'swipe' || !swipeFrom || !running) return;
    const q = toPoint(e), dx = q.x - swipeFrom.x, dy = q.y - swipeFrom.y;
    swipeFrom = null;
    if (Math.hypot(dx, dy) < 0.05) tapQueued = true;
    else move = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  });
  canvas.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Enter') e.preventDefault();
    if (!running && (e.key === ' ' || e.key === 'Enter')) return start();
    if (g.controls === 'tap' && (e.key === ' ' || e.key === 'ArrowUp') && !e.repeat) tapQueued = true;
    if (g.controls === 'hold' && (e.key === ' ' || e.key === 'ArrowUp')) (holding = true), e.repeat || (tapQueued = true);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') (keys.add(e.key), (aim = undefined));
    if (g.controls === 'touch' && ['1', '2', '3'].includes(e.key)) pick = Number(e.key) - 1;
    if (g.controls === 'touch' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) (e.preventDefault(), keys.add(e.key));
    if (g.controls === 'touch' && e.key.startsWith('Arrow')) keyboard = true;
    if (g.controls === 'touch' && e.key === ' ' && running) (spaceDown = true), (pointer = { ...cursor });
    if (g.controls === 'swipe' && !e.repeat) {
      const m = ({ ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' } as const)[e.key as 'ArrowLeft'];
      if (m) move = m;
      if (e.key === ' ') tapQueued = true;
    }
  });
  canvas.addEventListener('keyup', (e) => {
    keys.delete(e.key);
    if (e.key === ' ' || e.key === 'ArrowUp') holding = false;
    if (g.controls === 'touch' && e.key === ' ') (spaceDown = false), (pointer = null);
  });
  overlay.addEventListener('click', start);
  s = g.create(1);
  size();
  show(`<b>시작</b><span>${g.hint ?? (g.controls === 'tap' ? '탭 / 스페이스' : g.controls === 'hold' ? '꾹 눌렀다 떼기 / 스페이스' : g.controls === 'touch' ? '화면 왼쪽·오른쪽 누르기 · 카드 탭 / ← → · 1 2 3' : g.controls === 'swipe' ? '밀기(스와이프) · 탭 / 화살표 · 스페이스' : '드래그 / ← →')}</span>`);
  new ResizeObserver(size).observe(root);
}

for (const el of document.querySelectorAll<HTMLElement>('[data-game]')) {
  const e = GAMES.find((x) => x.game.id === el.dataset.game);
  if (e) mount(el, e.game);
}
