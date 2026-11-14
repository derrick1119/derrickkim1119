// THE LAMP 2 — 진입점: 화면 전환, 고정 스텝 루프, 저장
import { LEVELS, levelIndex } from './levels.js';
import { World, T } from './world.js';
import { Renderer, SKINS } from './render.js';
import { Sound } from './audio.js';
import { Input } from './input.js';
import { UI, nextIndex, totalFlowers, SKIN_NEED } from './ui.js';
import { loadSave, writeSave } from './save.js';
import { setLang, getLang } from './i18n.js';

const STEP = 1 / 120;
const $ = (id) => document.getElementById(id);
const canvas = $('game');
const save = loadSave();
setLang(save.lang || ((navigator.language || 'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en'));

const renderer = new Renderer(canvas);
const sound = new Sound();
sound.enabled = save.sound !== false;
if (!SKINS[save.skin] || totalFlowers(save) < (SKIN_NEED[save.skin] || 0)) save.skin = 'warm';
renderer.skin = SKINS[save.skin];

let mode = 'menu';   // menu | play
let world = null;
let levelIdx = 0;
let paused = false;
let clearT = -1, clearShown = false;
let acc = 0, last = 0;
const demo = { t: 0, phase: 0 };

const ui = new UI(save, {
  click: () => { sound.unlock(); sound.ui(); },
  start: () => {
    sound.unlock(); sound.ui();
    const n = nextIndex(save);
    if (n < 0) ui.show('select'); else play(n);
  },
  play: (i) => { sound.unlock(); sound.ui(); play(i); },
  next: () => { sound.ui(); if (levelIdx + 1 < LEVELS.length) play(levelIdx + 1); else toMenu('select'); },
  restart: () => { sound.ui(); play(levelIdx); },
  checkpoint: () => {
    sound.ui();
    if (mode !== 'play' || world.state === 'clear') return;
    if (paused) togglePause();
    if (world.state === 'play') world.respawn();
  },
  stages: () => { sound.ui(); toMenu('select'); },
  pause: () => togglePause(),
  skin: (id) => {
    sound.ui();
    save.skin = id; writeSave(save);
    renderer.skin = SKINS[id];
    ui.renderStages();
  },
  sound: () => {
    sound.unlock();
    save.sound = !save.sound;
    sound.setEnabled(save.sound);
    ui.setSound(save.sound);
    writeSave(save);
    sound.ui();
  },
  lang: () => {
    sound.unlock(); sound.ui();
    save.lang = getLang() === 'ko' ? 'en' : 'ko';
    setLang(save.lang);
    writeSave(save);
    ui.applyLang();
  },
  fullscreen: () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
    } catch (e) { /* 지원하지 않는 환경 */ }
  },
});

const input = new Input(
  { left: $('btnLeft'), right: $('btnRight'), jump: $('btnJump'), light: $('btnLight') },
  {
    any: () => sound.unlock(),
    pause: () => togglePause(),
    restart: () => ui.h.checkpoint(),
    mute: () => ui.h.sound(),
  },
);
window.addEventListener('touchstart', () => ui.setTouch(), { passive: true, once: true });

function resize() { renderer.resize(window.innerWidth, window.innerHeight); if (world) renderer.clampCam(); }
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode === 'play' && !paused && world.state !== 'clear') togglePause();
});

// ---------- 흐름 ----------
function toMenu(screen = 'title') {
  mode = 'menu';
  paused = false;
  sound.stopMusic();
  sound.setLit(true);
  ui.hud(false); ui.hidePause(); ui.hideClear();
  // 타이틀 뒤에서는 낮의 돌 다리 앞에서 전구가 혼자 불을 켰다 껐다 한다
  world = new World(LEVELS[Math.max(0, levelIndex('1-2'))]);
  demo.t = 0; demo.phase = 0;
  renderer.setLevel(world);
  ui.show(screen);
}

function play(i) {
  levelIdx = i;
  mode = 'play';
  paused = false; clearT = -1; clearShown = false; acc = 0;
  world = new World(LEVELS[i]);
  renderer.setLevel(world);
  ui.show(null);
  ui.hidePause(); ui.hideClear();
  ui.hud(true);
  sound.unlock();
  sound.setLit(true);
  sound.intensity = world.boss ? 1 : 0.15 + 0.08 * LEVELS[i].chapter;
  sound.startMusic();
}

function togglePause() {
  if (mode !== 'play' || world.state === 'clear') return;
  paused = !paused;
  sound.ui();
  if (paused) ui.showPause(world); else ui.hidePause();
}

function finish() {
  clearShown = true;
  const lv = LEVELS[levelIdx], prev = save.levels[lv.id];
  const rec = prev ? { ...prev } : { done: false, flowers: 0, best: Infinity, flawless: false };
  const newBest = !!prev && prev.done && world.time < prev.best - 0.05;
  rec.done = true;
  rec.flowers = Math.max(rec.flowers || 0, world.got);
  rec.best = Math.min(rec.best ?? Infinity, world.time);
  rec.flawless = rec.flawless || world.flawless;
  save.levels[lv.id] = rec;
  writeSave(save);
  sound.stopMusic();
  ui.hud(false);
  const last = levelIdx + 1 >= LEVELS.length;
  ui.showClear({ level: lv, got: world.got, time: world.time, breaks: world.breaks, flawless: world.flawless, newBest, hasNext: !last, final: last });
}

function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* 막혀 있으면 무시 */ } }

let slowT = 0, fastT = 0;
function adaptQuality(dt) {
  if (renderer.lowPerf) return;
  if (dt > 0.03) slowT += dt; else fastT += dt;
  if (fastT > 4) { slowT = 0; fastT = 0; }
  if (slowT > 2.5) { renderer.lowPerf = true; resize(); }
}

function hints() {
  const w = world, b = w.bulb;
  if (w.state !== 'play') { ui.hideTip(); return; }
  const x = b.x / T, y = b.y / T;
  for (const h of w.level.hints || []) {
    if (x >= h.a && x <= h.b && (h.ya === undefined || y >= h.ya) && (h.yb === undefined || y <= h.yb)) { ui.tip(h.key); return; }
  }
  ui.hideTip();
}

// 타이틀 배경용 자동 연기
function demoStep(dt) {
  const w = world, b = w.bulb, inp = w.input;
  demo.t += dt;
  inp.jump = false; inp.light = false; inp.ax = 0;
  const x = b.x / T;
  const P = demo.phase;
  if (P === 0) { inp.ax = x < 6.2 ? 1 : 0; if (x >= 6.2 && Math.abs(b.vx) < 20) { demo.phase = 1; demo.t = 0; } }
  else if (P === 1) { if (demo.t > 1.1) { inp.light = true; demo.phase = 2; demo.t = 0; } }
  else if (P === 2) { if (demo.t > 1.5) { inp.light = true; demo.phase = 3; demo.t = 0; } }
  else if (P === 3) { if (demo.t > 1.2) { demo.phase = 4; demo.t = 0; } }
  else if (P === 4) { inp.ax = x > 3.4 ? -1 : 0; if (x <= 3.4 && Math.abs(b.vx) < 20) { demo.phase = 5; demo.t = 0; } }
  else if (P === 5) { if (demo.t > 0.5) { inp.jump = demo.t < 0.8; if (demo.t > 1.6) { demo.phase = 0; demo.t = 0; } } }
  if (w.state !== 'play') { demo.phase = 0; demo.t = 0; }
}

// ---------- 루프 ----------
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, Math.max(0, (ts - last) / 1000));
  last = ts;
  if (!document.hidden && dt > 0) adaptQuality(dt);

  if (mode === 'play') {
    if (!paused) {
      input.poll(world.input);
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 10) {
        world.step(STEP);
        acc -= STEP; n++;
        for (const ev of world.events) {
          if (ev.type === 'crack') buzz(40);
          else if (ev.type === 'shatter') buzz(120);
        }
        sound.consume(world);
        renderer.consume(world);
        world.events.length = 0;
      }
      if (n === 10) acc = 0;
      hints();
      if (world.state === 'clear' && !clearShown) {
        if (clearT < 0) clearT = 1.5;
        clearT -= dt;
        if (clearT <= 0) finish();
      }
    }
    renderer.draw(world, paused ? 0 : dt);
    if (!clearShown) ui.updateHud(world);
  } else {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 10) {
      demoStep(STEP);
      world.step(STEP);
      acc -= STEP; n++;
      renderer.consume(world);
      world.events.length = 0;
    }
    if (n === 10) acc = 0;
    renderer.draw(world, dt);
  }
}

resize();
toMenu();
requestAnimationFrame((ts) => { last = ts; frame(ts); });

// 자동 테스트와 디버깅용 손잡이
window.__lamp = { get world() { return world; }, get mode() { return mode; }, save, play, renderer, T };
