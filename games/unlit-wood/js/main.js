// THE LAMP: 불 꺼진 숲 — 메인 루프와 화면
import { LEVEL } from './levels.js';
import { World, DT, P } from './world.js';
import { Scene3D } from './scene.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { t, setLang, getLang, apply as applyI18n } from './i18n.js';
import { loadSave, storeSave } from './save.js';

const $ = (id) => document.getElementById(id);
const save = loadSave();
setLang(save.lang || ((navigator.language || 'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en'));

const sound = new Sound(); sound.muted = !!save.mute;
const canvas = $('gl');
let scene;
try { scene = new Scene3D(canvas, LEVEL); }
catch (e) { $('boot').textContent = 'WebGL 을 쓸 수 없어 화면을 띄우지 못했습니다. (WebGL unavailable)'; throw e; }
if (save.quality === 'low') { scene.setQuality('low'); scene.locked = true; }
if (save.quality === 'high') scene.locked = true;
scene.onQuality = () => refreshMenu();

let world = new World(LEVEL);
world.p.lit = true;                    // 첫 화면에서는 불을 켠 채 서 있다
let state = 'title';
const inp = { ax: 0, jump: false, light: false, grab: false };
const hint = { light: false, moved: false, jumped: false, grabbed: false };
let fadeIn = 1, flash = 0, flashCol = '255,255,255';

const input = new Input(
  { left: $('tLeft'), right: $('tRight'), jump: $('tJump'), light: $('tLight'), grab: $('tGrab') },
  { pause: () => { if (state === 'play') pause(); else if (state === 'pause') resume(); }, any: () => { sound.unlock(); if (input && input.usedTouch) document.body.classList.add('touch'); } },
);
if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');

function show(id) { for (const el of document.querySelectorAll('.screen')) el.classList.toggle('hidden', el.id !== id); document.body.dataset.state = state; }
function persist() { storeSave(save); }
function fmtTime(s) { const m = Math.floor(s / 60); return m + ':' + String(Math.floor(s % 60)).padStart(2, '0'); }

function refreshMenu() {
  $('btnContinue').classList.toggle('hidden', !save.progress);
  $('btnStart').textContent = t(save.progress ? 'fresh' : 'start');
  $('optSound').textContent = `${t('sound')} · ${t(sound.muted ? 'off' : 'on')}`;
  $('optQuality').textContent = `${t('quality')} · ${t(scene.quality === 'high' ? 'high' : 'low')}`;
  for (const el of document.querySelectorAll('[data-lang]')) el.textContent = t('lang');
}

function begin(progress) {
  sound.unlock();
  world = new World(LEVEL, progress || null);
  scene.burst.clear(); scene.hero.reset(); scene.snap(world);
  hint.light = !!progress; hint.moved = !!progress; hint.jumped = !!progress; hint.grabbed = false;
  if (!progress) { save.progress = null; persist(); }
  state = 'play'; fadeIn = 1; show('none');
}
function pause() { if (state !== 'play') return; state = 'pause'; show('screen-pause'); refreshMenu(); }
function resume() { state = 'play'; show('none'); last = performance.now(); }
function finish() {
  state = 'end';
  $('endFlowers').textContent = `${world.bloomed} / ${LEVEL.flowers.length}`;
  $('endDeaths').textContent = String(world.deaths);
  $('endTime').textContent = fmtTime(world.playT);
  save.done = true; save.progress = null;
  if (!save.best || world.bloomed > save.best.flowers || (world.bloomed === save.best.flowers && world.playT < save.best.t)) save.best = { flowers: world.bloomed, t: world.playT, deaths: world.deaths };
  persist(); show('screen-end');
}

$('btnStart').addEventListener('click', () => begin(null));
$('btnContinue').addEventListener('click', () => begin(save.progress));
$('btnPause').addEventListener('click', () => { sound.unlock(); pause(); });
$('btnResume').addEventListener('click', resume);
$('btnRetry').addEventListener('click', () => { world.spawn(); world.events.push({ type: 'respawn' }); resume(); fadeIn = 1; });
$('btnRestart').addEventListener('click', () => begin(null));
$('btnAgain').addEventListener('click', () => begin(null));
$('optSound').addEventListener('click', () => { sound.unlock(); sound.setMuted(!sound.muted); save.mute = sound.muted; persist(); refreshMenu(); });
$('optQuality').addEventListener('click', () => { const q = scene.quality === 'high' ? 'low' : 'high'; scene.setQuality(q); scene.locked = true; save.quality = q; persist(); onResize(); refreshMenu(); });
$('optFull').addEventListener('click', () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) { /* 막힌 곳 */ } });
for (const el of document.querySelectorAll('[data-lang]')) el.addEventListener('click', () => { setLang(getLang() === 'ko' ? 'en' : 'ko'); save.lang = getLang(); persist(); refreshMenu(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (state === 'play') pause(); sound.suspend(true); } else sound.suspend(false); });

function onResize() { scene.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1); }
window.addEventListener('resize', onResize);
onResize();

// 필름 알갱이: 작은 잡음 무늬를 1초에 12번 옮긴다
{
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), im = g.createImageData(128, 128);
  for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0);
  $('fx-grain').style.backgroundImage = `url(${c.toDataURL()})`;
}

// 말 없이 알려 주는 것: 지금 필요한 버튼만 잠깐 비춘다
function hints() {
  const p = world.p;
  let want = '';
  if (state === 'play' && !p.dead && !world.ended) {
    if (p.lit) hint.light = true;
    if (Math.abs(p.x - LEVEL.start.x) > 2.5) hint.moved = true;
    if (p.x > 16.5) hint.jumped = true;
    if (p.grab) hint.grabbed = true;
    if (!hint.light) want = 'light';
    else if (!hint.moved) want = 'move';
    else if (!hint.jumped && p.x > 10.5 && p.x < 14.2) want = 'jump';
    else if (!hint.grabbed && world.crates.some((c) => Math.abs(c.x - p.x) < 1.3 && Math.abs(c.y - p.y) < 0.5)) want = 'grab';
    else if (!p.lit && Math.abs(p.x - world.lamp.x) < 4) want = 'light';
    else if (!p.lit && p.ground && world.lifts.some((l) => l.y >= l.y0 - 0.01 && p.x > l.x && p.x < l.x + l.w && Math.abs(p.y - l.y) < 0.1)) want = 'light';
  }
  const el = $('hint');
  if (el.dataset.k !== want) { el.dataset.k = want; el.classList.toggle('on', !!want); for (const k of ['light', 'jump', 'grab']) $('t' + k[0].toUpperCase() + k.slice(1)).classList.toggle('pulse', want === k); $('tLeft').classList.toggle('pulse', want === 'move'); $('tRight').classList.toggle('pulse', want === 'move'); }
}

let last = performance.now(), acc = 0, grainTick = -1;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state === 'play') {
    acc += dt;
    if (acc >= DT) input.poll(inp);
    let n = 0;
    while (acc >= DT && n < 8) { world.step(inp, DT); acc -= DT; n++; }
    if (acc > DT) acc = 0;
  }
  const ev = world.events;
  if (ev.length) {
    scene.events(ev, world); sound.consume(ev);
    for (const e of ev) {
      if (e.type === 'checkpoint' || e.type === 'bloom') { save.progress = world.progress(); persist(); }
      else if (e.type === 'shatter') { save.progress = world.cp >= 0 ? world.progress() : save.progress; if (save.progress) { save.progress.deaths = world.deaths; persist(); } if (e.cause === 'watcher') { flash = 1; flashCol = '255,70,50'; } }
      else if (e.type === 'crack') { flash = 0.5; flashCol = '255,255,255'; }
      else if (e.type === 'respawn') fadeIn = 1;
    }
    ev.length = 0;
  }
  if (state === 'play' && world.ended && world.endT > 4.2) finish();

  scene.frame(world, dt, state === 'title');

  // 이어지는 소리
  const p = world.p;
  let moth = 0, creep = 0, watch = 0;
  for (const m of world.moths) if (m.state === 'chase' || m.state === 'lost') moth = Math.max(moth, 1 - Math.min(1, Math.hypot(m.x - p.x, m.y - p.y) / 9)); else if (m.alert > 0) moth = Math.max(moth, 0.3 * m.alert / P.MOTH_ALERT);
  for (const s of world.stalkers) if (s.sink < 0.5) creep = Math.max(creep, 1 - Math.min(1, Math.abs(s.x - p.x) / 6));
  for (const wt of world.watchers) watch = Math.max(watch, wt.seen / P.WATCH_T);
  sound.levels({ lit: p.lit && !p.dead && state !== 'title', moth, creep, watch, tide: world.tide.on ? Math.max(0.15, 1 - Math.min(1, (p.x - world.tide.x) / 14)) : 0, inside: p.x > 64 && p.x < 91 });

  // 화면 위에 덧씌우는 것: 암전, 번쩍임, 끝의 흰빛
  fadeIn = Math.max(0, fadeIn - dt * 1.4); flash = Math.max(0, flash - dt * 3.5);
  let black = fadeIn;
  if (p.dead) black = Math.max(black, Math.min(1, (0.85 - p.deadT) / 0.55));
  const white = world.ended ? Math.min(1, Math.max(0, (world.endT - 1.6) / 2.2)) : 0;
  const f = $('fx-fade').style;
  f.opacity = Math.max(black, white, flash * 0.35);
  f.background = white > black && white > 0 ? '#fff6e2' : flash * 0.35 > black ? `rgb(${flashCol})` : '#000';
  const tick = Math.floor(now / 83);
  if (tick !== grainTick) { grainTick = tick; $('fx-grain').style.backgroundPosition = `${(tick * 53) % 128}px ${(tick * 97) % 128}px`; }
  hints();
}

// 저장소 밖(단독 페이지)에서는 모음 화면으로 가는 링크를 숨긴다
if (!/\/games\/unlit-wood\//.test(location.pathname)) for (const el of document.querySelectorAll('a.link[href="../../"]')) el.classList.add('hidden');
applyI18n(); refreshMenu(); show('screen-title');
$('boot').remove();
requestAnimationFrame(frame);

// 자동 검증과 스크린샷에서 들여다보는 창
window.__lamp = { get world() { return world; }, set world(w) { world = w; }, scene, sound, save, begin, get state() { return state; }, LEVEL, noFade() { fadeIn = 0; } };
