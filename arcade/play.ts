/**
 * 브라우저 플레이어 (실험 0011). 계기판 아티팩트·제품 페이지 공용.
 * <div data-game="<id>"> 안에 캔버스를 만들고, 시뮬레이션과 같은 코드로 60fps 고정 틱을 돌린다.
 * 조작: 원버튼 = 화면 탭·스페이스, 좌우 = 드래그·화살표 키.
 */
import { TICK, type GameDef, type Input, type Theme } from './core.ts';
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
  canvas.setAttribute('aria-label', `${g.name} 게임 화면. ${g.controls === 'tap' ? '스페이스나 화면 탭' : '좌우 화살표나 드래그'}로 조작`);
  const overlay = document.createElement('button');
  overlay.type = 'button';
  overlay.className = 'g-overlay';
  root.append(canvas, overlay);
  const ctx = canvas.getContext('2d')!;
  let s: any = null, seed = 1, running = false, acc = 0, last = 0, tapQueued = false, aim: number | undefined;
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
  const draw = () => s && g.draw(ctx, s, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1), g.art?.palette ?? theme(root));
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
      const input: Input = { tap: tapQueued, dir, aim };
      tapQueued = false;
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
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!running) return;
    if (g.controls === 'tap') tapQueued = true;
    else aim = toAim(e);
  });
  canvas.addEventListener('pointermove', (e) => g.controls === 'leftright' && running && (e.buttons || e.pointerType === 'mouse') && (aim = toAim(e)));
  canvas.addEventListener('pointerleave', () => (aim = undefined));
  canvas.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Enter') e.preventDefault();
    if (!running && (e.key === ' ' || e.key === 'Enter')) return start();
    if (g.controls === 'tap' && (e.key === ' ' || e.key === 'ArrowUp') && !e.repeat) tapQueued = true;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') (keys.add(e.key), (aim = undefined));
  });
  canvas.addEventListener('keyup', (e) => keys.delete(e.key));
  overlay.addEventListener('click', start);
  s = g.create(1);
  size();
  show(`<b>시작</b><span>${g.controls === 'tap' ? '탭 / 스페이스' : '드래그 / ← →'}</span>`);
  new ResizeObserver(size).observe(root);
}

for (const el of document.querySelectorAll<HTMLElement>('[data-game]')) {
  const e = GAMES.find((x) => x.game.id === el.dataset.game);
  if (e) mount(el, e.game);
}
