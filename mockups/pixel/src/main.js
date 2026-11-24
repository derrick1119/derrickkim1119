// 도트 시안: 네 장면을 탭으로 넘겨 본다. ?scene=battle|stage|title|sheet &shot=1 (탭 숨김) &t=초 (멈춘 시각)
import { LW, LH } from './px.js';
import { SCENES as BASE } from './scenes.js';
import { BATTLES } from './variants.js';
import { STYLES } from './styles.js';
const SCENES = Object.assign({}, STYLES, BATTLES, BASE);
const GROUPS = [['도트 스타일', ['chibi', 'tall', 'soft', 'tiny', 'paper', 'onebit', 'mini']], ['색감', ['dusk', 'rich', 'night', 'day', 'ink', 'mini4']], ['그 밖', ['stage', 'title', 'sheet']]];
const q = new URLSearchParams(location.search), cv = document.getElementById('cv'), g = cv.getContext('2d');
let cur = q.get('scene') || 'chibi'; if (!SCENES[cur]) cur = 'chibi'; if (q.get('shot')) document.body.classList.add('shot');
const tabs = document.getElementById('tabs');
for (const [label, keys] of GROUPS) { const row = document.createElement('div'); row.className = 'grp'; const l = document.createElement('span'); l.textContent = label; row.appendChild(l); for (const k of keys) { const b = document.createElement('button'); b.textContent = SCENES[k].name; b.onclick = () => { cur = k; sync(); }; b.dataset.k = k; row.appendChild(b); } tabs.appendChild(row); }
function sync() { for (const b of tabs.querySelectorAll('button')) b.classList.toggle('on', b.dataset.k === cur); }
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
