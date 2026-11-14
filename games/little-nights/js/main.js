// THE LAMP: 작은 밤들 — 진입점: 턴 진행, 무르기, 힌트, 화면 전환, 저장
import { LEVELS, CHAPTERS } from './levels.js';
import { parseLevel, initialState, step } from './rules.js';
import { solve } from './solver.js';
import { Scene3D } from './scene.js';
import { Sound } from './audio.js';
import { loadSave, writeSave } from './save.js';
import { t, has, setLang, getLang } from './i18n.js';

const $ = (id) => document.getElementById(id);
const save = loadSave();
setLang(save.lang || ((navigator.language || 'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en'));

const scene = new Scene3D($('game'));
const sound = new Sound();
sound.enabled = save.sound !== false;
let touch = !!(window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches);
if (touch) document.body.classList.add('touch');

let mode = 'menu';     // menu | play
let idx = 0;           // 지금 스테이지
let L = null, s = null;
let history = [];      // 무르기용: 지난 상태들
let cracks = [];       // 각 턴까지 금이 간 횟수 (무르면 함께 되돌린다)
let won = false, failed = false;
let queued = null;     // 연출 중에 들어온 입력 하나
let clearT = -1;
const demo = { i: 0, t: 0, lv: 0 };

// ---------- 저장된 진행 ----------
const rec = (id) => save.levels[id];
const unlocked = (i) => i === 0 || !!(rec(LEVELS[i - 1].id) && rec(LEVELS[i - 1].id).done);
const nextIndex = () => { for (let i = 0; i < LEVELS.length; i++) if (!(rec(LEVELS[i].id) && rec(LEVELS[i].id).done)) return i; return -1; };
const totalFlowers = () => Object.values(save.levels).reduce((n, r) => n + (r.flowers || 0), 0);

// ---------- 화면 ----------
function applyLang() {
  document.documentElement.lang = getLang();
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  $('howKeys').textContent = t(touch ? 'how.keys.touch' : 'how.keys.pc');
  $('btnSound').textContent = t(save.sound ? 'btn.sound.on' : 'btn.sound.off');
  $('turnLabel').textContent = t('hud.turn'); $('parLabel').textContent = t('hud.par');
  refreshTitle();
  renderStages();
  if (mode === 'play') updateHud(true);
}

function refreshTitle() {
  const n = nextIndex(), fresh = Object.keys(save.levels).length === 0;
  $('btnStart').textContent = fresh ? t('btn.start') : n < 0 ? t('btn.stages') : `${t('btn.continue')} · ${LEVELS[n].id}`;
  $('titleFlowers').textContent = `${totalFlowers()}/${LEVELS.length * 3}`;
}

function show(name) {
  for (const n of ['title', 'select', 'how']) $('screen-' + n).classList.toggle('hidden', n !== name);
  if (name === 'title') refreshTitle();
  if (name === 'select') renderStages();
}

function renderStages() {
  const box = $('stageList');
  box.textContent = '';
  $('selFlowers').textContent = `${totalFlowers()}/${LEVELS.length * 3}`;
  const next = nextIndex();
  for (const ch of CHAPTERS) {
    const sec = document.createElement('div'); sec.className = 'chapter';
    const h3 = document.createElement('h3'); h3.textContent = `${ch.id}. ${t(ch.key)}`;
    const row = document.createElement('div'); row.className = 'row';
    LEVELS.forEach((lv, i) => {
      if (lv.chapter !== ch.id) return;
      const r = rec(lv.id), open = unlocked(i);
      const b = document.createElement('button');
      b.className = 'stage' + (open ? '' : ' locked') + (i === next ? ' next' : '');
      const no = document.createElement('span'); no.className = 'nm'; no.textContent = lv.id;
      const meta = document.createElement('span'); meta.className = 'smeta';
      const fl = document.createElement('span'); fl.className = 'fl3';
      for (let k = 0; k < 3; k++) { const d = document.createElement('i'); if (r && r.flowers > k) d.className = 'on'; fl.appendChild(d); }
      meta.appendChild(fl);
      meta.appendChild(document.createTextNode(r && r.done ? `${r.best}/${lv.par}` : `${t('hud.par')} ${lv.par}`));
      b.appendChild(no); b.appendChild(meta);
      if (r && r.perfect) { const f = document.createElement('span'); f.className = 'flaw'; f.title = t('clear.perfect'); b.appendChild(f); }
      if (open) b.onclick = () => { click(); play(i); }; else b.title = t('sel.locked');
      row.appendChild(b);
    });
    sec.appendChild(h3); sec.appendChild(row);
    box.appendChild(sec);
  }
}

let toastTimer = 0;
function toast(key, calm) {
  const el = $('toast');
  el.textContent = t(key);
  el.className = calm ? 'calm' : '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
}
function hideToast() { clearTimeout(toastTimer); $('toast').classList.add('hidden'); }

function updateHud(force) {
  const lv = LEVELS[idx];
  if (force) $('stageName').textContent = `${lv.id} · ${t(CHAPTERS[lv.chapter - 1].key)}`;
  [...$('flowers').children].forEach((el, k) => el.classList.toggle('on', !!((s.fl >> k) & 1)));
  $('turns').textContent = s.t;
  $('par').textContent = lv.par;
  $('crack').classList.toggle('hidden', !s.cr);
  $('crack').textContent = t('hud.cracked');
  $('btnLight').classList.toggle('on', s.on);
  $('btnUndo').disabled = history.length === 0;
  const tipEl = $('tip');
  const key = lv.tip && (has(lv.tip) ? lv.tip : lv.tip + (touch ? '.touch' : '.pc'));
  const showTip = !!key && !won && !(rec(lv.id) && rec(lv.id).done);
  tipEl.classList.toggle('hidden', !showTip);
  if (showTip) tipEl.textContent = t(key);
}

// ---------- 흐름 ----------
function click() { sound.unlock(); sound.ui(); }

function toMenu(screen = 'title') {
  mode = 'menu';
  sound.stopMusic(); sound.setLit(true);
  $('hud').classList.add('hidden'); $('overlay-clear').classList.add('hidden');
  hideToast();
  startDemo();
  show(screen);
}

function load(i) {
  idx = i;
  L = parseLevel(LEVELS[i]);
  s = initialState(L);
  history = []; cracks = [0];
  won = false; failed = false; queued = null; clearT = -1;
  scene.menu = false;
  scene.load(L, s, LEVELS[i].chapter);
}

function play(i) {
  mode = 'play';
  load(i);
  show(null);
  $('overlay-clear').classList.add('hidden');
  $('hud').classList.remove('hidden');
  hideToast();
  updateHud(true);
  sound.unlock(); sound.setLit(true);
  sound.intensity = 0.1 + 0.08 * LEVELS[i].chapter;
  sound.startMusic();
}

function act(a) {
  if (mode !== 'play' || won) return;
  if (failed) { $('btnUndo').classList.remove('nope'); void $('btnUndo').offsetWidth; $('btnUndo').classList.add('pulse'); setTimeout(() => $('btnUndo').classList.remove('pulse'), 2000); return; }
  if (scene.busy) { queued = a; return; }
  const r = step(L, s, a);
  if (!r.ok) {
    sound.consume([{ type: 'bump' }]);
    if (r.why === 'floor') { toast('msg.floor'); const b = $('btnLight'); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); }
    return;
  }
  hideToast();
  history.push(s);
  cracks.push(cracks[cracks.length - 1] + r.ev.filter((e) => e.type === 'crack').length);
  const prev = s;
  s = r.s;
  scene.play(prev, s, r.ev);
  sound.consume(r.ev);
  try { if (navigator.vibrate && r.ev.some((e) => e.type === 'crack' || e.type === 'shatter')) navigator.vibrate(r.fail ? 120 : 40); } catch (e) { /* 무시 */ }
  if (r.win) { won = true; clearT = 1.1; }
  if (r.fail) { failed = true; toast('msg.shatter'); }
  updateHud(false);
}

function undo() {
  if (mode !== 'play' || won || !history.length) return;
  s = history.pop(); cracks.pop();
  failed = false; queued = null;
  scene.sync(s, true);
  sound.consume([{ type: 'undo' }]);
  sound.setLit(s.on);
  hideToast();
  updateHud(false);
}

function restart() {
  if (mode !== 'play') return;
  sound.ui();
  load(idx);
  $('overlay-clear').classList.add('hidden');
  hideToast();
  updateHud(true);
}

// 힌트: 지금 자리에서 풀이기를 돌려 다음 한 수를 알려 준다
function hint() {
  if (mode !== 'play' || won || failed || scene.busy) return;
  toast('msg.thinking', true);
  setTimeout(() => {
    const r = solve(L, { from: s, max: 250000 });
    const sol = r.full || r.any;
    if (!sol) { toast('msg.nohint'); return; }
    hideToast();
    sound.consume([{ type: 'hint' }]);
    showHint(sol.path[0]);
  }, 30);
}

function showHint(a) {
  if (a === 'T') {
    const b = $('btnLight');
    b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
    setTimeout(() => b.classList.remove('pulse'), 2000);
  } else {
    const el = $('toast');
    el.textContent = { U: '↑', R: '→', D: '↓', L: '←' }[a];
    el.className = 'calm arrow';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
  }
}

function finish() {
  const lv = LEVELS[idx], prev = rec(lv.id);
  const flowers = [0, 1, 2].filter((k) => (s.fl >> k) & 1).length;
  const perfect = flowers === 3 && s.t <= lv.par;
  const nocrack = cracks[cracks.length - 1] === 0;
  const r = prev ? { ...prev } : { done: false, flowers: 0, best: Infinity, perfect: false };
  r.done = true;
  r.flowers = Math.max(r.flowers || 0, flowers);
  r.best = Math.min(r.best ?? Infinity, s.t);
  r.perfect = r.perfect || perfect;
  save.levels[lv.id] = r;
  writeSave(save);
  const last = idx + 1 >= LEVELS.length;
  $('clearTitle').textContent = t(last ? 'clear.final' : 'clear.title');
  $('clearSub').textContent = `${lv.id} · ${t(CHAPTERS[lv.chapter - 1].key)}`;
  [...$('clearFlowers').children].forEach((el, k) => { el.className = ''; void el.offsetWidth; if (k < flowers) el.className = 'on'; });
  const grid = $('clearGrid');
  grid.textContent = ''; grid.className = 'res-grid three';
  const cell = (label, val) => { const d = document.createElement('div'); const b = document.createElement('b'); b.textContent = val; d.appendChild(b); d.appendChild(document.createTextNode(label)); grid.appendChild(d); };
  cell(t('clear.turns'), s.t); cell(t('clear.par'), lv.par); cell(t('clear.flowers'), `${flowers}/3`);
  const bd = $('clearBadges');
  bd.textContent = '';
  const badge = (key, cls) => { const el = document.createElement('span'); if (cls) el.className = cls; el.textContent = t(key); bd.appendChild(el); };
  if (flowers === 3) badge('clear.all', 'gold');
  if (perfect) badge('clear.perfect', 'gold');
  if (nocrack) badge('clear.nocrack');
  $('btnNext').classList.toggle('hidden', last);
  $('btnRetry').classList.toggle('primary', last);
  $('tip').classList.add('hidden');
  $('overlay-clear').classList.remove('hidden');
  sound.stopMusic();
}

// 타이틀 뒤에서는 풀이기가 찾은 풀이를 그대로 틀어 준다
function startDemo() {
  demo.lv = (demo.lv + 2) % LEVELS.length;
  L = parseLevel(LEVELS[demo.lv]);
  s = initialState(L);
  demo.i = 0; demo.t = 1.2;
  scene.menu = true;
  scene.load(L, s, LEVELS[demo.lv].chapter);
}

function demoStep(dt) {
  demo.t -= dt;
  if (demo.t > 0 || scene.busy) return;
  const path = LEVELS[demo.lv].sol;
  if (demo.i >= path.length) { startDemo(); return; }
  const r = step(L, s, path[demo.i++]);
  if (!r.ok) { startDemo(); return; }
  const prev = s;
  s = r.s;
  scene.play(prev, s, r.ev);
  demo.t = r.win ? 2.2 : 0.42;
}

// ---------- 입력 ----------
const KEY = {
  ArrowUp: 'U', KeyW: 'U', ArrowRight: 'R', KeyD: 'R', ArrowDown: 'D', KeyS: 'D', ArrowLeft: 'L', KeyA: 'L',
  Space: 'T', Enter: 'T', ShiftLeft: 'T', ShiftRight: 'T', KeyE: 'T', KeyF: 'T',
};
window.addEventListener('keydown', (e) => {
  sound.unlock();
  if (mode !== 'play') return;
  const a = KEY[e.code];
  if (a) { e.preventDefault(); if (a === 'T' && e.repeat) return; act(a); return; }
  if (e.repeat) return;
  if (e.code === 'KeyZ' || e.code === 'KeyU' || e.code === 'Backspace') { e.preventDefault(); undo(); }
  else if (e.code === 'KeyR') restart();
  else if (e.code === 'KeyH') hint();
  else if (e.code === 'Escape') { click(); toMenu('select'); }
});

// 밀어서 굴리기
{
  const cv = $('game');
  let sx = 0, sy = 0, id = null;
  cv.addEventListener('pointerdown', (e) => { sound.unlock(); id = e.pointerId; sx = e.clientX; sy = e.clientY; });
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.hypot(dx, dy) < 22) return;
    act(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U'));
  };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', () => { id = null; });
}
window.addEventListener('touchstart', () => { if (!touch) { touch = true; document.body.classList.add('touch'); applyLang(); } }, { passive: true, once: true });

$('btnLight').onclick = () => { sound.unlock(); act('T'); };
$('btnUndo').onclick = () => { sound.unlock(); undo(); };
$('btnRestart').onclick = () => { sound.unlock(); restart(); };
$('btnHint').onclick = () => { sound.unlock(); hint(); };
$('btnBack').onclick = () => { click(); toMenu('select'); };
$('btnStart').onclick = () => { click(); const n = nextIndex(); if (n < 0) show('select'); else play(n); };
$('btnStages').onclick = () => { click(); show('select'); };
$('btnHow').onclick = () => { click(); show('how'); };
for (const b of document.querySelectorAll('[data-back]')) b.onclick = () => { click(); show('title'); };
$('btnNext').onclick = () => { click(); if (idx + 1 < LEVELS.length) play(idx + 1); else toMenu('select'); };
$('btnRetry').onclick = () => { click(); play(idx); };
$('btnClearStages').onclick = () => { click(); toMenu('select'); };
$('btnSound').onclick = () => {
  sound.unlock();
  save.sound = !save.sound; sound.setEnabled(save.sound); writeSave(save);
  $('btnSound').textContent = t(save.sound ? 'btn.sound.on' : 'btn.sound.off');
  sound.ui();
};
$('btnLang').onclick = () => { click(); save.lang = getLang() === 'ko' ? 'en' : 'ko'; setLang(save.lang); writeSave(save); applyLang(); };
$('btnFull').onclick = () => {
  try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); } catch (e) { /* 지원하지 않는 환경 */ }
};
if (!document.documentElement.requestFullscreen) $('btnFull').classList.add('hidden');

// ---------- 루프 ----------
function resize() { scene.resize(window.innerWidth, window.innerHeight); }
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

let last = 0, slowT = 0, fastT = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, Math.max(0, (ts - last) / 1000));
  last = ts;
  if (!document.hidden && dt > 0 && !scene.lowPerf) {
    if (dt > 0.034) slowT += dt; else fastT += dt;
    if (fastT > 4) { slowT = 0; fastT = 0; }
    if (slowT > 2.5) { scene.lowPerf = true; resize(); }
  }
  if (mode === 'play') {
    if (queued && !scene.busy) { const a = queued; queued = null; act(a); }
    if (won && clearT >= 0) { clearT -= dt; if (clearT < 0) finish(); }
  } else demoStep(dt);
  scene.update(dt);
}

if (!scene.ok) {
  $('nogl').classList.remove('hidden');
  $('screen-title').classList.add('hidden');
} else {
  resize();
  applyLang();
  toMenu();
  requestAnimationFrame((ts) => { last = ts; frame(ts); });
}

// 자동 테스트와 디버깅용 손잡이
window.__lamp = { get s() { return s; }, get L() { return L; }, get mode() { return mode; }, get idx() { return idx; }, get won() { return won; }, get failed() { return failed; }, save, play, act, undo, scene, LEVELS };
