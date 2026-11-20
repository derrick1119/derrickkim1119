import { W, H } from './config.js';
import { nav } from './nav.js';
import { ui } from './ui/ui.js';
import { sfx, unlockAudio } from './audio.js';
import { load, G } from './state.js';
import { preloadLooks } from './render/sprites.js';
import { warmIcons } from './render/icons.js';
import { TitleScene } from './scenes/title.js';
import { HeroScene } from './scenes/hero.js';
import { RunScene } from './scenes/run.js';
import { EndScene } from './scenes/end.js';
import { MetaScene } from './scenes/meta.js';
import { PrologueScene } from './scenes/prologue.js';

const canvas = document.getElementById('game');
const g = canvas.getContext('2d');
let scale = 1, rot = false;
// 가로 화면 게임. 휴대전화를 세로로 들고 있으면 화면을 90도 돌려 그려서, 기기를 눕히면 바로 맞게 보인다
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  rot = vh > vw * 1.1 && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const aw = rot ? vh : vw, ah = rot ? vw : vh, k = Math.min(aw / W, ah / H);
  const cw = Math.floor(W * k), ch = Math.floor(H * k);
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  canvas.style.transform = rot ? 'translate(-50%, -50%) rotate(90deg)' : 'translate(-50%, -50%)';
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  scale = Math.min(2.5, Math.max(1, k * dpr));
  canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
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

nav.scenes = { title: TitleScene, hero: HeroScene, prologue: PrologueScene, run: RunScene, meta: MetaScene, end: EndScene };

let last = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts;
  g.setTransform(scale, 0, 0, scale, 0, 0);
  g.imageSmoothingQuality = 'high';
  ui.top = 0; ui.layer = 0;
  if (nav.cur) nav.cur.frame(g, dt, inp);
  if (nav.dir) {
    nav.fade = Math.max(0, Math.min(1, nav.fade + nav.dir * dt * 4.5));
    if (nav.dir > 0 && nav.fade >= 1) { const n = nav.next; nav.next = null; nav.cur = new nav.scenes[n.name](n.args); nav.dir = -1; ui.active = null; }
    else if (nav.dir < 0 && nav.fade <= 0) nav.dir = 0;
  }
  if (nav.fade > 0) { g.globalAlpha = nav.fade; g.fillStyle = '#1f2a44'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  if (inp.released) ui.active = null;
  inp.pressed = false; inp.released = false;
  requestAnimationFrame(frame);
}

async function boot() {
  try { await Promise.all([document.fonts.load("20px 'Yeon Sung'", '가A1'), document.fonts.load("700 20px 'Gowun Batang'", '가A1'), document.fonts.load("400 20px 'Gowun Batang'", '가A1'), document.fonts.load("900 20px 'Hanja Seal'", '甲')]); } catch (e) { /* 폰트 없이 진행 */ }
  load(); preloadLooks(); warmIcons();
  const q = new URLSearchParams(location.search);
  window.__game = { nav, inp, run: () => G.run };
  nav.now('title');
  if (q.get('debug')) { const m = await import('./debug.js'); m.debugBoot(q); }
  requestAnimationFrame(frame);
}
boot();
