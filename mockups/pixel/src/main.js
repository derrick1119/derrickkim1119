// 도트 시안. 기본 화면은 "시간 × 날씨"(치비 먹선). ?scene=live&time=night&weather=rain&outline=1&auto=1 · &shot=1 (탭 숨김) · &t=초 (멈춘 시각)
import { LW, LH } from './px.js';
import { SCENES as BASE } from './scenes.js';
import { BATTLES } from './variants.js';
import { STYLES } from './styles.js';
import { LIVE, live } from './live.js';
const SCENES = Object.assign({ live: { name: '시간 × 날씨', draw: live } }, STYLES, BATTLES, BASE);
const CTRL = [['시간', 'time', [['dawn', '새벽'], ['day', '낮'], ['dusk', '노을'], ['night', '달밤'], ['auto', '▶ 하루 흐름']]], ['날씨', 'weather', [['clear', '맑음'], ['rain', '비'], ['storm', '뇌우'], ['snow', '눈'], ['fog', '안개'], ['leaves', '낙엽']]], ['외곽선', 'outline', [['0', '먹선만'], ['1', '흰 테']]]];
const OLD = [['도트 스타일', ['tall', 'soft', 'tiny', 'paper', 'onebit', 'mini']], ['색감', ['rich', 'ink', 'mini4']], ['그 밖', ['stage', 'title', 'sheet']]];
const q = new URLSearchParams(location.search), cv = document.getElementById('cv'), g = cv.getContext('2d');
let cur = q.get('scene') || 'live'; if (!SCENES[cur]) cur = 'live'; if (q.get('shot')) document.body.classList.add('shot');
if (q.get('time')) LIVE.time = q.get('time'); if (q.get('weather')) LIVE.weather = q.get('weather'); LIVE.outline = q.get('outline') === '1'; LIVE.auto = q.get('auto') === '1';
const tabs = document.getElementById('tabs'), el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
for (const [label, key, opts] of CTRL) { const row = el('div', 'grp'); row.appendChild(el('span', '', label)); for (const [v, name] of opts) { const b = el('button', '', name); b.dataset.c = key + ':' + v; b.onclick = () => { cur = 'live'; if (key === 'time') { LIVE.auto = v === 'auto'; if (v !== 'auto') LIVE.time = v; } else if (key === 'weather') LIVE.weather = v; else LIVE.outline = v === '1'; sync(); }; row.appendChild(b); } tabs.appendChild(row); }
const more = el('button', 'more', '이전 시안 ▾'); more.onclick = () => { document.body.classList.toggle('old'); more.textContent = document.body.classList.contains('old') ? '이전 시안 ▴' : '이전 시안 ▾'; fit(); }; { const row = el('div', 'grp'); row.appendChild(more); tabs.appendChild(row); }
for (const [label, keys] of OLD) { const row = el('div', 'grp oldg'); row.appendChild(el('span', '', label)); for (const k of keys) { const b = el('button', '', SCENES[k].name); b.dataset.k = k; b.onclick = () => { cur = k; sync(); }; row.appendChild(b); } tabs.appendChild(row); }
let shown = '';
function sync() { const on = cur === 'live'; shown = LIVE.shown; for (const b of tabs.querySelectorAll('button')) { if (b.dataset.k) b.classList.toggle('on', b.dataset.k === cur); else if (b.dataset.c) { const [key, v] = b.dataset.c.split(':'); b.classList.toggle('on', on && (key === 'time' ? (v === 'auto' ? LIVE.auto : !LIVE.auto && LIVE.time === v) : key === 'weather' ? LIVE.weather === v : LIVE.outline === (v === '1'))); b.classList.toggle('now', on && key === 'time' && LIVE.auto && v === LIVE.shown); } } }
// 화면에 맞는 가장 큰 크기로. 기기 픽셀 기준 정수 배율이면 그대로, 아니면 꽉 채운다 (좁은 화면에서는 줄인다)
function fit() { const w = document.getElementById('wrap'), f = Math.min(w.clientWidth / LW, w.clientHeight / LH), d = window.devicePixelRatio || 1, ki = Math.floor(f * d) / d, k = ki >= f * 0.8 && ki > 0 ? ki : f; cv.style.width = Math.floor(LW * k) + 'px'; cv.style.height = Math.floor(LH * k) + 'px'; }
addEventListener('resize', fit);
const fixedT = q.get('t') !== null ? Number(q.get('t')) : null;
async function boot() {
  try { await Promise.all(["12px Galmuri11", "bold 12px Galmuri11", "10px Galmuri9", "40px 'Yeon Sung'"].map(f => document.fonts.load(f, '가A1열두고개'))); } catch (e) { /* 글꼴 없이 */ }
  fit(); sync(); const t0 = performance.now();
  const frame = ts => { g.imageSmoothingEnabled = false; g.clearRect(0, 0, LW, LH); SCENES[cur].draw(g, fixedT !== null ? fixedT : (ts - t0) / 1000); if (LIVE.shown !== shown) sync(); window.__ready = true; requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
}
boot();
