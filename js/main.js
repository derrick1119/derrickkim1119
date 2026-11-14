// THE LAMP: 마지막 불씨 — 진입점. 화면 전환, 고정 스텝 루프, 저장을 묶는다.
import { NIGHTS, META } from './config.js';
import { Game } from './game.js';
import { Renderer } from './render.js';
import { Sound } from './audio.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { loadSave, writeSave } from './save.js';
import { setLang, getLang } from './i18n.js';

const STEP = 1 / 60;
const canvas = document.getElementById('game');
const save = loadSave();
setLang(save.lang || ((navigator.language || 'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en'));

const renderer = new Renderer(canvas);
const sound = new Sound();
sound.enabled = save.sound !== false;

let mode = 'menu';       // menu | run
let game = null;         // 지금 그리고 있는 게임 (메뉴에서는 배경용 데모)
let paused = false;
let ended = false, endT = 0, resultShown = false;
let acc = 0, last = 0;
let runNight = 0;
let tut = null;
const demo = { cyc: 0, target: null, t: 0, age: 0 };

const ui = new UI(save, {
  click: () => { sound.unlock(); sound.ui(); },
  start: (night) => { sound.unlock(); sound.ui(); startRun(night); },
  retry: () => { sound.ui(); startRun(runNight); },
  next: () => { sound.ui(); startRun(Math.min(NIGHTS.length - 1, runNight + 1)); },
  menu: () => { sound.ui(); toMenu(); },
  quit: () => { sound.ui(); toMenu(); },
  pause: () => togglePause(),
  toggle: () => toggleLamp(),
  pick: (i) => pick(i),
  reroll: () => reroll(),
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
    const el = document.documentElement;
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else el.requestFullscreen().catch(() => {});
    } catch (e) { /* 지원하지 않는 환경 */ }
  },
  buy: (id) => {
    const def = META[id], lvl = save.meta[id] || 0;
    if (lvl >= def.max || save.lumen < def.cost[lvl]) return;
    save.lumen -= def.cost[lvl];
    save.meta[id] = lvl + 1;
    writeSave(save);
    sound.unlock();
    if (sound.ok('buy')) sound.bell([72, 79, 84], 0.09, 0.5, 0.05);
    ui.renderWorkshop();
  },
});

const input = new Input(canvas, document.getElementById('stick'), {
  any: () => sound.unlock(),
  toggle: () => toggleLamp(),
  pause: () => togglePause(),
  pick: (i) => pick(i),
  reroll: () => reroll(),
  mute: () => ui.h.sound(),
});

function resize() {
  renderer.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode === 'run' && !paused && game.state === 'playing') togglePause();
});
resize();

// ---------- 흐름 ----------
function newDemo() {
  game = new Game({ night: 0, meta: {}, seed: (Math.random() * 1e9) >>> 0 });
  demo.cyc = 0; demo.target = null; demo.t = 0; demo.age = 0;
  renderer.reset();
  renderer.snap(game.p);
}

function toMenu() {
  mode = 'menu';
  paused = false;
  sound.stopMusic();
  sound.setLit(true);
  input.setActive(false);
  ui.hud(false); ui.hideLevel(); ui.hidePause(); ui.hideResult(); ui.clearToasts();
  newDemo();
  ui.show('title');
}

function startRun(night) {
  runNight = night;
  mode = 'run';
  paused = false; ended = false; resultShown = false; acc = 0;
  game = new Game({ night, meta: save.meta });
  tut = { moved: 0, darks: 0, darkT: 0, guardT: 0, guardDone: false, stalkT: 0, stalkDone: false, cur: null, shown: {} };
  renderer.reset();
  renderer.snap(game.p);
  ui.show(null);
  ui.hideLevel(); ui.hidePause(); ui.hideResult(); ui.clearToasts();
  ui.cache = {};
  ui.hud(true);
  input.setActive(true);
  sound.unlock();
  sound.setLit(true);
  sound.intensity = 0;
  sound.startMusic();
}

function togglePause() {
  if (mode !== 'run' || ended || game.state === 'levelup' || game.state === 'dawn') return;
  paused = !paused;
  sound.ui();
  input.setActive(!paused);
  if (paused) ui.showPause(game); else ui.hidePause();
}

function toggleLamp() {
  if (mode !== 'run' || paused || game.state !== 'playing') return;
  game.input.toggle = true;
}

function pick(i) {
  if (mode !== 'run' || game.state !== 'levelup' || !ui.canPick()) return;
  if (!game.choices || !game.choices[i]) return;
  game.choose(i);
  sound.consume(game); renderer.consume(game); game.events.length = 0;
  if (game.state === 'levelup') ui.showLevel(game);
  else { ui.hideLevel(); input.setActive(true); }
}

function reroll() {
  if (mode !== 'run' || game.state !== 'levelup' || !ui.canPick()) return;
  if (game.reroll()) { sound.ui(); ui.showLevel(game); }
}

function finishRun() {
  resultShown = true;
  const won = game.state === 'won';
  const lumen = game.lumenEarned(), score = game.score();
  const b = save.best[runNight] || { time: 0, win: false, score: 0 };
  const newBest = score > b.score && save.runs > 0;
  b.score = Math.max(b.score, score);
  b.time = Math.max(b.time, game.clock);
  b.win = b.win || won;
  save.best[runNight] = b;
  save.lumen += lumen;
  save.runs++;
  let unlocked = null;
  if (won && runNight + 1 < NIGHTS.length && save.unlocked < runNight + 2) {
    save.unlocked = runNight + 2;
    unlocked = runNight + 1;
    ui.night = unlocked;
  }
  for (const k in tut.shown) save.tips[k] = (save.tips[k] || 0) + 1;
  writeSave(save);
  sound.stopMusic();
  input.setActive(false);
  ui.hud(false);
  ui.hideLevel();
  ui.showResult({
    won, time: game.clock, kills: game.kills, level: game.p.level, lamps: game.lampsLit, lampTotal: game.lamps.length,
    score, lumen, newBest, unlocked, night: runNight, hasNext: won && runNight + 1 < NIGHTS.length,
  });
}

function buzz(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* 막혀 있으면 무시 */ }
}

// 프레임이 계속 밀리면 해상도와 장식 효과를 낮춘다
let slowT = 0, fastT = 0;
function adaptQuality(dt) {
  if (renderer.lowPerf) return;
  if (dt > 0.03) slowT += dt; else fastT += dt;
  if (fastT > 4) { slowT = 0; fastT = 0; }
  if (slowT > 2.5) { renderer.lowPerf = true; resize(); }
}

// ---------- 게임 이벤트 → 알림 ----------
function notices() {
  const evs = game.events;
  for (let i = 0; i < evs.length; i++) {
    const ev = evs[i];
    switch (ev.type) {
      case 'dark': sound.setLit(false); tut.darks++; break;
      case 'hurt': buzz(35); break;
      case 'flare': buzz(18); break;
      case 'ignite': sound.setLit(true); break;
      case 'revive': sound.setLit(true); ui.toast('toast.revive'); break;
      case 'tide': ui.toast('toast.tide', null, 'warn'); break;
      case 'elite': ui.toast('toast.elite', null, 'warn'); break;
      case 'boss': ui.toast('toast.boss', null, 'cool'); break;
      case 'shield': ui.toast('toast.shield', null, 'cool'); break;
      case 'shieldBreak': ui.toast('toast.break'); break;
      case 'bossDead': ui.toast('toast.bossdead'); break;
      case 'lampLit': if (!game.allLit) ui.toast('toast.lamp', { a: game.lamps.filter((l) => l.lit).length, b: game.lamps.length }); break;
      case 'allLit': ui.toast('toast.all'); break;
      case 'lampOut': ui.toast('toast.out', null, 'warn'); break;
      case 'dawn': sound.setLit(true); ui.toast('toast.dawn'); ui.hideTip(); break;
      case 'dead': sound.setLit(true); break;
    }
  }
}

// 처음 몇 판 동안만 보여 주는 한 줄 안내
const TIPS = [
  { id: 'move', key: () => (ui.touch ? 'tip.move.touch' : 'tip.move.pc'), on: (g, s) => g.t > 0.8 && s.moved < 1.0 },
  { id: 'lamp', key: () => 'tip.lamp', on: (g, s) => s.moved >= 1.0 && g.lampsLit === 0 && g.t < 70 },
  { id: 'dark', key: () => (ui.touch ? 'tip.dark.touch' : 'tip.dark.pc'), on: (g, s) => (g.lampsLit >= 1 || g.t >= 26) && s.darks === 0 },
  { id: 'flare', key: () => 'tip.flare', on: (g, s) => s.darks >= 1 && g.flares === 0 && s.darkT < 10 },
  { id: 'guard', key: () => 'tip.guard', on: (g, s) => s.guardT > 0 },
  { id: 'stalker', key: () => 'tip.stalker', on: (g, s) => s.stalkT > 0 },
];

function tutorial(dt) {
  const g = game, s = tut, p = g.p;
  if (g.state !== 'playing') return;
  if (p.moving) s.moved += dt;
  if (s.darks >= 1) s.darkT += dt;
  s.guardT -= dt; s.stalkT -= dt;
  if (!s.guardDone || !s.stalkDone) {
    for (const e of g.enemies) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (!s.guardDone && e.mode === 'sleep' && d < 430) { s.guardDone = true; s.guardT = 7; }
      if (!s.stalkDone && e.kind === 'stalker' && d < 420) { s.stalkDone = true; s.stalkT = 7; }
    }
  }
  let next = null;
  for (const tip of TIPS) {
    if ((save.tips[tip.id] || 0) >= 2) continue;
    if (tip.on(g, s)) { next = tip; break; }
  }
  if (next) { s.shown[next.id] = true; ui.tip(next.key()); }
  else ui.hideTip();
}

// 타이틀 뒤에서 혼자 걸어 다니는 등불지기
function demoStep(dt) {
  const g = game, p = g.p;
  demo.age += dt; demo.t -= dt; demo.cyc += dt;
  if (g.state === 'levelup') { g.choose((Math.random() * 3) | 0); return; }
  if (g.state !== 'playing' || demo.age > 150) { newDemo(); return; }
  p.inv = 1;
  p.oil = Math.max(p.oil, g.stat.maxOil * 0.85);
  if (!demo.target || demo.target.lit || demo.t <= 0) {
    let best = null, bd = 1e9;
    for (const L of g.lamps) {
      if (L.lit) continue;
      const d = Math.hypot(L.x - p.x, L.y - p.y);
      if (d < bd) { bd = d; best = L; }
    }
    demo.target = best || g.lamps[(Math.random() * g.lamps.length) | 0];
    demo.t = 16;
  }
  const L = demo.target;
  let fx = L.x - p.x, fy = L.y + 26 - p.y;
  const d = Math.hypot(fx, fy) || 1;
  if (d < 12) { fx = 0; fy = 0; } else { fx /= d; fy /= d; }
  g.input.mx = fx * 0.75; g.input.my = fy * 0.75;
  if (p.lit && demo.cyc > 10) { g.input.toggle = true; demo.cyc = 0; }
  else if (!p.lit && demo.cyc > 2.6) { g.input.toggle = true; demo.cyc = 0; }
}

// ---------- 루프 ----------
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, Math.max(0, (ts - last) / 1000));
  last = ts;
  if (!document.hidden && dt > 0) adaptQuality(dt);

  if (mode === 'run') {
    if (!paused) {
      input.poll(game.input);
      if (game.state === 'playing' || game.state === 'dawn') {
        acc += dt;
        let n = 0;
        while (acc >= STEP && n < 5) {
          game.update(STEP);
          acc -= STEP; n++;
          if (game.state !== 'playing' && game.state !== 'dawn') { acc = 0; break; }
        }
        if (n === 5) acc = 0;
        tutorial(dt);
        sound.intensity = Math.min(1, game.t / game.night.duration + (game.boss && !game.boss.dead ? 0.4 : 0));
      }
      notices();
      sound.consume(game);
      renderer.consume(game);
      game.events.length = 0;

      if (ui.levelOpen && game.state !== 'levelup') { ui.hideLevel(); input.setActive(true); }
      if (game.state === 'levelup' && !ui.levelOpen) {
        input.setActive(false);
        game.input.mx = 0; game.input.my = 0;
        ui.hideTip();
        ui.showLevel(game);
      }
      if ((game.state === 'dead' || game.state === 'won') && !ended) {
        ended = true;
        endT = game.state === 'dead' ? 1.7 : 0.9;
        ui.hideTip();
      }
      if (ended && !resultShown) {
        if (game.state === 'dead') game.p.lr *= Math.pow(0.02, dt);
        endT -= dt;
        if (endT <= 0) finishRun();
      }
    }
    renderer.draw(game, paused ? 0 : dt);
    if (!resultShown) ui.updateHud(game);
  } else {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 4) { demoStep(STEP); game.update(STEP); acc -= STEP; n++; }
    if (n === 4) acc = 0;
    renderer.consume(game);
    game.events.length = 0;
    renderer.draw(game, dt);
  }
}

toMenu();
requestAnimationFrame((ts) => { last = ts; frame(ts); });

// 자동 테스트와 디버깅용 손잡이
window.__lamp = { get game() { return game; }, get mode() { return mode; }, save, startRun, renderer };
