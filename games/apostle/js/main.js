// THE LAMP: 빛의 사도 — 메인 루프, 이야기, 화면
import { LEVELS, TOTAL_STARS } from './levels.js';
import { World, DT, P, VESSEL } from './world.js';
import { Scene3D } from './scene.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { t, setLang, getLang, apply as applyI18n } from './i18n.js';
import { loadSave, storeSave } from './save.js';

const $ = (id) => document.getElementById(id);
const save = loadSave();
setLang(save.lang || ((navigator.language || 'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en'));
const INTRO = [['s_pro1', 's_pro2'], ['s_in1'], ['s_in2'], ['s_in3']], OUTRO = [['s_out0'], ['s_out1'], ['s_out2'], null];

const sound = new Sound(); sound.muted = !!save.mute;
let scene;
try { scene = new Scene3D($('gl')); }
catch (e) { $('boot').textContent = 'WebGL 을 쓸 수 없어 화면을 띄우지 못했습니다. (WebGL unavailable)'; throw e; }
if (save.quality === 'low') { scene.setQuality('low'); scene.locked = true; }
if (save.quality === 'high') scene.locked = true;
scene.onQuality = () => refreshMenu();

let stage = 0, world = new World(LEVELS[0]), state = 'title';
scene.load(LEVELS[0]); scene.snap(world);
const inp = { ax: 0, ay: 0, jump: false, act: false, pos: false }, idle = { ax: 0, ay: 0, jump: false, act: false, pos: false };
const seen = { kinds: new Set(), acted: new Set() };
let fadeIn = 1, flash = 0, cards = [], cardDone = null, tipT = 0, endK = -1, endPhase = 0;

const input = new Input(
  { left: $('tLeft'), right: $('tRight'), up: $('tUp'), down: $('tDown'), jump: $('tJump'), act: $('tAct'), pos: $('tPos') },
  { pause: () => { if (state === 'play') pause(); else if (state === 'pause') resume(); }, any: () => { sound.unlock(); if (input && input.usedTouch) document.body.classList.add('touch'); }, next: () => { if (state === 'story') nextCard(); } },
);
if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');

function show(id) { for (const el of document.querySelectorAll('.screen')) el.classList.toggle('hidden', el.id !== id); document.body.dataset.state = state; }
function persist() { storeSave(save); }
const fmtTime = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const starRow = (el, alive, total) => { el.textContent = ''; for (let i = 0; i < total; i++) { const s = document.createElement('span'); s.className = 'star' + (i < alive ? ' on' : ''); s.textContent = i < alive ? '★' : '✦'; el.appendChild(s); } };

function refreshMenu() {
  $('btnContinue').classList.toggle('hidden', !(save.stage > 0));
  $('btnChapters').classList.toggle('hidden', !(save.stage > 0 || save.results[0]));
  $('optSound').textContent = `${t('sound')} · ${t(sound.muted ? 'off' : 'on')}`;
  $('optQuality').textContent = `${t('quality')} · ${t(scene.quality === 'high' ? 'high' : 'low')}`;
  for (const el of document.querySelectorAll('[data-lang]')) el.textContent = t('lang');
  const list = $('chapterList'); list.textContent = '';
  LEVELS.forEach((L, i) => {
    const b = document.createElement('button'), r = save.results[i], open = i <= save.stage;
    b.className = 'btn chapter'; b.disabled = !open; b.dataset.i = i;
    const n = document.createElement('span'); n.textContent = `${i + 1}. ${t('ch' + i)}`; b.appendChild(n);
    const s = document.createElement('small'); s.textContent = r ? `★ ${r.alive} / ${r.total}` : open ? '' : t('locked'); b.appendChild(s);
    b.addEventListener('click', () => startStage(i));
    list.appendChild(b);
  });
}

// ── 이야기 카드 ──
function showCards(keys, done) { cards = keys.slice(); cardDone = done; state = 'story'; show('none'); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); nextCard(); }
function nextCard() {
  if (!cards.length) { $('story').classList.remove('on'); const d = cardDone; cardDone = null; if (d) d(); return; }
  $('storyText').textContent = t(cards.shift()); $('story').classList.add('on');
}
$('story').addEventListener('click', () => { sound.unlock(); if (state === 'story') nextCard(); });

function startStage(i, intro = true) {
  sound.unlock();
  stage = i; world = new World(LEVELS[i]); scene.load(LEVELS[i]); scene.snap(world);
  seen.kinds.clear(); fadeIn = 1; endK = -1; endPhase = 0; tipT = 0;
  $('tip').classList.remove('on'); $('whisper').classList.remove('on');
  const go = () => { state = 'play'; show('none'); last = performance.now(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); };
  if (intro && INTRO[i]) showCards(INTRO[i], go); else go();
}
function pause() { if (state !== 'play') return; state = 'pause'; show('screen-pause'); refreshMenu(); }
function resume() { state = 'play'; show('none'); last = performance.now(); }
function totals() { let a = 0; LEVELS.forEach((L, i) => { const r = i === stage ? { alive: world.alive } : save.results[i]; a += r ? r.alive : L.creatures.length; }); return a; }
function clearStage() {
  save.results[stage] = { alive: world.alive, total: world.total, t: world.playT, fades: world.fades };
  save.stage = Math.max(save.stage, Math.min(LEVELS.length - 1, stage + 1)); persist();
  if (stage === LEVELS.length - 1) { state = 'ending'; endPhase = 1; showCards(['s_end1'], () => { endPhase = 2; endK = 0; scene.showStars(totals(), TOTAL_STARS); state = 'ending'; setTimeout(() => showCards(['s_end2', 's_end3'], finale), 2600); }); return; }
  state = 'clear';
  $('clearName').textContent = t('ch' + stage); $('clearTime').textContent = fmtTime(world.playT);
  starRow($('clearStars'), world.alive, world.total);
  $('clearLabel').classList.toggle('hidden', stage < 2);
  show('screen-clear');
}
function finale() {
  state = 'ending'; endPhase = 3; save.ended = true; persist();
  const a = totals();
  $('endCount').textContent = `${a} / ${TOTAL_STARS}`;
  $('endLine').textContent = t(a === TOTAL_STARS ? 'e_all' : 'e_some');
  starRow($('endStars'), a, TOTAL_STARS);
  show('screen-end');
}

$('btnStart').addEventListener('click', () => startStage(0));
$('btnContinue').addEventListener('click', () => startStage(Math.min(save.stage, LEVELS.length - 1)));
$('btnChapters').addEventListener('click', () => { sound.unlock(); state = 'chapters'; refreshMenu(); show('screen-chapters'); });
for (const el of document.querySelectorAll('[data-title]')) el.addEventListener('click', () => { state = 'title'; stage = 0; world = new World(LEVELS[0]); scene.load(LEVELS[0]); scene.snap(world); endK = -1; refreshMenu(); show('screen-title'); });
$('btnPause').addEventListener('click', () => { sound.unlock(); pause(); });
$('btnResume').addEventListener('click', resume);
$('btnRetry').addEventListener('click', () => { world.S = JSON.parse(world.snap); world.refresh(); world.events.push({ type: 'respawn' }); resume(); fadeIn = 1; });
$('btnRestart').addEventListener('click', () => startStage(stage, false));
$('btnNext').addEventListener('click', () => { const i = stage; if (OUTRO[i]) showCards(OUTRO[i], () => startStage(i + 1)); else startStage(i + 1); });
$('btnReplay').addEventListener('click', () => startStage(stage, false));
$('btnAgain').addEventListener('click', () => startStage(0));
$('optSound').addEventListener('click', () => { sound.unlock(); sound.setMuted(!sound.muted); save.mute = sound.muted; persist(); refreshMenu(); });
$('optQuality').addEventListener('click', () => { const q = scene.quality === 'high' ? 'low' : 'high'; scene.setQuality(q); scene.locked = true; save.quality = q; persist(); onResize(); refreshMenu(); });
$('optFull').addEventListener('click', () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) { /* 막힌 곳 */ } });
for (const el of document.querySelectorAll('[data-lang]')) el.addEventListener('click', () => { setLang(getLang() === 'ko' ? 'en' : 'ko'); save.lang = getLang(); persist(); refreshMenu(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (state === 'play') pause(); sound.suspend(true); } else sound.suspend(false); });

function onResize() { scene.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1); }
window.addEventListener('resize', onResize); onResize();
{       // 필름 알갱이
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), im = g.createImageData(128, 128);
  for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); $('fx-grain').style.backgroundImage = `url(${c.toDataURL()})`;
}

// 화면 위의 안내: 빛(체력) 세 알, 길에서 들리는 속삭임, 지금 누를 수 있는 것
function hud() {
  const S = world.S, a = world.pos(), hv = world.host, L = world.L, playing = state === 'play';
  const pips = $('pips').children; for (let i = 0; i < pips.length; i++) pips[i].classList.toggle('on', i < S.pips);
  let wk = '';
  if (playing && !S.done) for (const w of L.whispers) if (a.x >= w.x0 && a.x <= w.x1) { wk = w.key; break; }
  const we = $('whisper'); if (we.dataset.k !== wk) { we.dataset.k = wk; if (wk) we.textContent = t(wk); we.classList.toggle('on', !!wk); }
  let hk = '', label = '';
  if (playing && !S.done && S.fade <= 0) {
    const g = L.goal, nearGoal = Math.hypot(a.x - g.x, a.y - (g.y - 0.8)) < P.GOAL_R;
    if (nearGoal) { hk = 'pos'; label = t('h_goal'); }
    else if (!hv) { if (S.vessels.some((v) => Math.hypot(v.x - a.x, v.y - VESSEL[v.kind].h / 2 - a.y) < P.ENTER_R)) { hk = 'pos'; label = t('h_pos'); } }
    else if (!seen.acted.has(hv.kind)) { hk = 'act'; label = t('h_act_' + hv.kind); }
  }
  const he = $('hint'); if (he.dataset.k !== hk + label) { he.dataset.k = hk + label; he.classList.toggle('on', !!hk); $('hintKey').textContent = hk === 'pos' ? 'E' : 'X'; $('hintLabel').textContent = label; $('tPos').classList.toggle('pulse', hk === 'pos'); $('tAct').classList.toggle('pulse', hk === 'act'); }
}

let last = performance.now(), acc = 0, grainTick = -1;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const live = state === 'play', drift = state === 'ending' || state === 'clear' || (state === 'story' && world.S.done);
  if (live || drift) {
    acc += dt;
    if (acc >= DT && live) input.poll(inp);
    let n = 0;
    while (acc >= DT && n < 8) { world.step(live ? inp : idle, DT); acc -= DT; n++; }
    if (acc > DT) acc = 0;
  }
  const ev = world.events;
  if (ev.length) {
    scene.events(ev, world); sound.consume(ev);
    for (const e of ev) {
      if (e.type === 'enter') { if (!seen.kinds.has(e.kind)) { seen.kinds.add(e.kind); $('tip').textContent = t('v_' + e.kind); $('tip').classList.add('on'); tipT = 5; } }
      else if (e.type === 'light' || e.type === 'slash' || e.type === 'shoot') { const hv = world.host; if (hv) seen.acted.add(hv.kind); }
      else if (e.type === 'hurt') flash = 0.6;
      else if (e.type === 'respawn') fadeIn = 1;
    }
    ev.length = 0;
  }
  if (tipT > 0) { tipT -= dt; if (tipT <= 0) $('tip').classList.remove('on'); }
  if (state === 'play' && world.S.done && world.S.doneT > (stage === LEVELS.length - 1 ? 3.2 : 2.4)) clearStage();
  if (endK >= 0) { endK = Math.min(1, endK + dt / 3.5); const k = endK * endK * (3 - 2 * endK); scene.night = k; scene.goal.dim = 1 - 0.86 * k; }

  scene.frame(world, dt, { title: state === 'title' || state === 'chapters', inp });

  const S = world.S, hv = world.host, a = world.pos();
  let moth = 0, creep = 0;
  world.L.creatures.forEach((c, i) => { const d = S.creatures[i]; if (!d.alive || d.gone) return; if (c.kind === 'moth') { if (d.state === 'fly') moth = Math.max(moth, 1 - Math.min(1, Math.hypot(d.x - a.x, d.y - a.y) / 9)); } else if (d.state === 'stalk') creep = Math.max(creep, 1 - Math.min(1, Math.abs(d.x - a.x) / 7)); });
  sound.levels({ lit: !!(hv && hv.kind === 'lantern' && hv.on) && state !== 'title', moth, creep, inside: false });
  sound.lullaby(dt, world.total ? world.alive / world.total : 1, state === 'play' || state === 'ending' || state === 'clear');

  fadeIn = Math.max(0, fadeIn - dt * 1.4); flash = Math.max(0, flash - dt * 3.5);
  let black = fadeIn;
  if (S.fade > 0) black = Math.max(black, Math.min(1, (P.FADE_T - S.fade) / 0.8));
  const white = stage === LEVELS.length - 1 && S.done && endPhase < 2 ? Math.min(0.85, Math.max(0, (S.doneT - 1.4) / 1.6)) : endPhase >= 2 ? Math.max(0, 0.85 * (1 - endK * 2.5)) : 0;
  const f = $('fx-fade').style;
  f.opacity = Math.max(black, white, flash * 0.3);
  f.background = white > black && white > 0 ? '#fff6e2' : flash * 0.3 > black ? '#fff' : '#000';
  const tick = Math.floor(now / 83);
  if (tick !== grainTick) { grainTick = tick; $('fx-grain').style.backgroundPosition = `${(tick * 53) % 128}px ${(tick * 97) % 128}px`; }
  hud();
}

if (!/\/games\/apostle\//.test(location.pathname)) for (const el of document.querySelectorAll('a.link[href="../../"]')) el.classList.add('hidden');
applyI18n(); refreshMenu(); show('screen-title');
$('boot').remove();
requestAnimationFrame(frame);

// 자동 검증과 스크린샷에서 들여다보는 창
window.__lamp = {
  get world() { return world; }, set world(w) { world = w; }, get state() { return state; }, get stage() { return stage; },
  scene, sound, save, LEVELS, startStage, noFade() { fadeIn = 0; }, skipStory() { while (state === 'story' && (cards.length || cardDone)) nextCard(); },
};
