import { W, H } from './config.js';
import { nav } from './nav.js';
import { ui } from './ui/ui.js';
import { sfx, unlockAudio } from './audio.js';
import { load, G } from './state.js';
import { preloadLooks } from './render/sprites.js';
import { inkWipe } from './render/ink.js';
import { warmIcons } from './render/icons.js';
import { TitleScene } from './scenes/title.js';
import { HeroScene } from './scenes/hero.js';
import { RunScene } from './scenes/run.js';
import { EndScene } from './scenes/end.js';
import { MetaScene } from './scenes/meta.js';
import { PrologueScene } from './scenes/prologue.js';
import { CodexScene } from './scenes/codex.js';

const canvas = document.getElementById('game');
const g = canvas.getContext('2d');
let scale = 0, rot = false;
// 가로 화면 게임. 휴대전화를 세로로 들고 있으면 화면을 90도 돌려 그려서, 기기를 눕히면 바로 맞게 보인다
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  rot = vh > vw * 1.1 && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const aw = rot ? vh : vw, ah = rot ? vw : vh, k = Math.min(aw / W, ah / H);
  const cw = Math.floor(W * k), ch = Math.floor(H * k);
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  canvas.style.transform = rot ? 'translate(-50%, -50%) rotate(90deg)' : 'translate(-50%, -50%)';
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  // 그리는 배율: 화면 크기 × 화소 밀도 (2 를 넘지 않게). 느린 기기에서는 아래 adapt() 가 더 낮춘다
  base = Math.min(2, Math.max(1, k * dpr)); floor = Math.min(base, Math.max(0.8, k));
  setScale(Math.min(base, Math.max(floor, scale > 1 && scale < base ? scale : base)));
}
function setScale(s) { scale = s; canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale); }
// 해상도 자동 조절: 최근 프레임이 오래 걸리면(45fps 아래) 그리는 화소를 15%씩 줄이고, 60fps 가 넉넉히 나오면 조금씩 다시 올린다
let ema = 16, slowT = 0, fastT = 0, base = 1, floor = 1;
const FIXRES = /[?&]fixres/.test(location.search);   // 측정용: 해상도를 고정한다
function adapt(ms, dt) {
  if (ms > 250 || FIXRES) return;   // 탭을 다녀온 긴 틈은 세지 않는다
  ema += (ms - ema) * 0.1;
  if (ema > 22) { slowT += dt; fastT = 0; } else if (ema < 17.5) { fastT += dt; slowT = 0; } else { slowT = 0; fastT = 0; }
  // 느렸던 배율 바로 아래를 새 상한으로 삼아, 올렸다 내렸다를 되풀이하지 않는다
  if (slowT > 1.2 && scale > floor + 0.01) { base = Math.max(floor, scale * 0.97); setScale(Math.max(floor, scale * 0.85)); slowT = 0; ema = 16; }
  else if (fastT > 10 && scale < base - 0.01) { setScale(Math.min(base, scale * 1.08)); fastT = 0; }
}
window.addEventListener('resize', resize); resize();

const inp = { x: 0, y: 0, px: 0, py: 0, down: false, pressed: false, released: false, dragged: false, id: null };
ui.inp = inp; ui.sfx = sfx;
function pos(e) {
  const r = canvas.getBoundingClientRect(), u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
  if (rot) { inp.x = v * W; inp.y = (1 - u) * H; } else { inp.x = u * W; inp.y = v * H; }
}
canvas.addEventListener('pointerdown', e => {
  if (inp.down) return; e.preventDefault(); unlockAudio();
  inp.id = e.pointerId; try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* 무시 */ }
  pos(e); inp.px = inp.x; inp.py = inp.y; inp.down = true; inp.pressed = true; inp.dragged = false;
});
canvas.addEventListener('pointermove', e => { if (inp.id !== null && e.pointerId !== inp.id) return; pos(e); if (inp.down && Math.hypot(inp.x - inp.px, inp.y - inp.py) > 14) inp.dragged = true; });
function up(e) { if (e.pointerId !== inp.id) return; pos(e); if (inp.down) { inp.down = false; inp.released = true; } inp.id = null; }
canvas.addEventListener('pointerup', e => { unlockAudio(); up(e); }); canvas.addEventListener('pointercancel', up);
canvas.addEventListener('click', unlockAudio); canvas.addEventListener('touchend', unlockAudio, { passive: true });
canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => { if (nav.cur && nav.cur.key) nav.cur.key(e.key); });

nav.scenes = { title: TitleScene, hero: HeroScene, prologue: PrologueScene, run: RunScene, meta: MetaScene, end: EndScene, codex: CodexScene };

let last = 0;
function frame(ts) {
  const ms = ts - last, dt = Math.min(0.05, ms / 1000 || 0.016); last = ts; if (ms > 0) adapt(ms, dt);
  g.setTransform(scale, 0, 0, scale, 0, 0);
  // 'high' 는 그림 한 장 한 장을 비싸게 다시 뽑는다 (전투 한 장면 그리는 시간의 4할). 'medium' 도 축소에 고르게 보인다
  g.imageSmoothingQuality = 'medium';
  ui.top = 0; ui.layer = 0;
  if (nav.cur) nav.cur.frame(g, dt, inp);
  if (nav.dir) {
    nav.fade = Math.max(0, Math.min(1, nav.fade + nav.dir * dt * 3.2));
    if (nav.dir > 0 && nav.fade >= 1) { const n = nav.next; nav.next = null; nav.cur = new nav.scenes[n.name](n.args); nav.dir = -1; ui.active = null; }
    else if (nav.dir < 0 && nav.fade <= 0) nav.dir = 0;
  }
  // 장면이 바뀔 때: 큰 붓이 화면을 덮고, 새 장면 위에서 걷힌다
  if (nav.fade > 0) inkWipe(g, nav.fade, nav.dir < 0 ? -1 : 1, W, H);
  if (inp.released) ui.active = null;
  inp.pressed = false; inp.released = false;
  requestAnimationFrame(frame);
}

async function boot() {
  try { await Promise.all([document.fonts.load("20px 'Yeon Sung'", '가A1'), document.fonts.load("700 20px 'Gowun Batang'", '가A1'), document.fonts.load("400 20px 'Gowun Batang'", '가A1')]); } catch (e) { /* 폰트 없이 진행 */ }
  load(); preloadLooks(); warmIcons();
  const q = new URLSearchParams(location.search);
  window.__game = { nav, inp, run: () => G.run };
  nav.now('title');
  if (q.get('debug')) { const m = await import('./debug.js'); m.debugBoot(q); }
  requestAnimationFrame(frame);
}
boot();
