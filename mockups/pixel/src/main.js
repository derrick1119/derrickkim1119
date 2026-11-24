// 도트 시안: 네 장면을 탭으로 넘겨 본다. ?scene=battle|stage|title|sheet &shot=1 (탭 숨김) &t=초 (멈춘 시각)
import { LW, LH } from './px.js';
import { SCENES as BASE } from './scenes.js';
import { BATTLES } from './variants.js';
const SCENES = Object.assign({}, BATTLES, BASE);
const q = new URLSearchParams(location.search), cv = document.getElementById('cv'), g = cv.getContext('2d');
let cur = q.get('scene') || 'rich'; if (!SCENES[cur]) cur = 'dusk'; if (q.get('shot')) document.body.classList.add('shot');
const tabs = document.getElementById('tabs');
for (const [k, sc] of Object.entries(SCENES)) { const b = document.createElement('button'); b.textContent = sc.name; b.onclick = () => { cur = k; sync(); }; b.dataset.k = k; tabs.appendChild(b); }
function sync() { for (const b of tabs.children) b.classList.toggle('on', b.dataset.k === cur); }
function fit() { const w = document.getElementById('wrap'), f = Math.min(w.clientWidth / LW, w.clientHeight / LH), d = window.devicePixelRatio || 1, ki = Math.max(1, Math.floor(f * d) / d), k = ki < f * 0.8 ? Math.max(1, f) : ki; cv.style.width = LW * k + 'px'; cv.style.height = LH * k + 'px'; }
addEventListener('resize', fit);
const fixedT = q.get('t') !== null ? Number(q.get('t')) : null;
async function boot() {
  try { await Promise.all(["12px Galmuri11", "bold 12px Galmuri11", "10px Galmuri9", "40px 'Yeon Sung'"].map(f => document.fonts.load(f, '가A1열두고개'))); } catch (e) { /* 글꼴 없이 */ }
  fit(); sync(); const t0 = performance.now();
  const frame = ts => { g.imageSmoothingEnabled = false; g.clearRect(0, 0, LW, LH); SCENES[cur].draw(g, fixedT !== null ? fixedT : (ts - t0) / 1000); window.__ready = true; requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
}
boot();
