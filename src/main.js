// 진입점: 저장본을 읽고, 게임·장면·UI 를 만들고, 프레임을 돌린다.
import { Game } from './core/game.js';
import { World } from './core/world.js';
import { sanitize } from './core/state.js';
import { setLang, detectLang, t } from './i18n/index.js';
import { Scene } from './render/scene.js';
import { GameAudio } from './audio/audio.js';
import { Storage, localDay } from './platform/storage.js';
import { Haptics, registerServiceWorker, prefersReducedMotion } from './platform/device.js';
import { UI } from './ui/ui.js';
import { showDaily, showOffline } from './ui/modals.js';

const SAVE_EVERY_SECONDS = 5;
const OFFLINE_MIN_SECONDS = 60;

/** @param {object} hotData 미리보기 환경이 새 버전으로 갈아 끼울 때 넘겨주는 직전 상태(없으면 빈 객체) */
function start(hotData) {
  const storage = new Storage();
  let { state } = storage.load();
  if (hotData && typeof hotData === 'object' && typeof hotData.v === 'number') state = sanitize(hotData);
  setLang(state.lang || detectLang());

  const game = new Game(state);
  if (game.phase === 'ending') game.finishEnding(); // 엔딩을 보던 중에 꺼졌으면 다음 대원부터 이어 간다
  game.busy = true; // 첫 화면 동안은 세계를 멈춰 둔다
  const awayAtBoot = state.lastSeen > 0 ? (Date.now() - state.lastSeen) / 1000 : 0;

  const stage = document.getElementById('stage');
  const canvas = document.getElementById('scene');
  const world = new World(game);
  const scene = new Scene(canvas, game, world, { reducedMotion: prefersReducedMotion() });
  const audio = new GameAudio(state.settings);
  const haptics = new Haptics(state.settings.haptics);

  const save = () => {
    game.state.lastSeen = Date.now();
    storage.save(game.state);
  };

  /** 자리를 비운 동안의 성장과 출석 보급품을 확인한다. */
  const checkRewards = (awaySeconds) => {
    if (game.phase !== 'play') return;
    const offline = awaySeconds >= OFFLINE_MIN_SECONDS ? game.applyOffline(awaySeconds) : null;
    if (offline) {
      ui.sizeShown = game.run.size;
      showOffline(ui, offline);
    }
    // 아직 한 번도 들키지 않은 첫 판에는 보급품으로 흐름을 끊지 않는다.
    if (game.state.stats.discoveries > 0) {
      const daily = game.claimDaily(localDay());
      if (daily) showDaily(ui, daily);
    }
    if (offline) save();
  };

  let bootChecked = false;
  const ui = new UI({
    stage,
    game,
    world,
    scene,
    audio,
    haptics,
    storageOk: storage.available,
    save,
    onEnter: () => {
      checkRewards(bootChecked ? 0 : awayAtBoot);
      bootChecked = true;
    },
  });

  const relayout = () => {
    scene.resize();
    ui.measure();
  };
  relayout();
  if (typeof ResizeObserver === 'function') new ResizeObserver(relayout).observe(stage);
  window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', () => setTimeout(relayout, 250));
  document.fonts?.ready?.then(relayout).catch(() => {});
  // 화면은 한 장으로 고정이다. 입력창 포커스 등으로 밀려 올라가면 곧바로 되돌린다.
  const pin = () => {
    if (stage.scrollTop !== 0 || stage.scrollLeft !== 0) stage.scrollTo(0, 0);
    if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
  };
  stage.addEventListener('scroll', pin, { passive: true });
  window.addEventListener('scroll', pin, { passive: true });

  // 프레임
  let last = performance.now();
  let saveT = 0;
  let hiddenAt = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(Math.max((now - last) / 1000, 0), 0.1);
    last = now;
    if (ui.started) game.tick(dt);
    world.update(dt);
    scene.update(dt);
    scene.render();
    ui.update(dt);
    if (ui.started) {
      saveT += dt;
      if (saveT >= SAVE_EVERY_SECONDS) {
        saveT = 0;
        save();
      }
    }
  }
  requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      if (ui.started) save();
      audio.suspend();
      return;
    }
    last = performance.now();
    audio.resume();
    const away = hiddenAt ? (Date.now() - hiddenAt) / 1000 : 0;
    if (ui.started && !ui.modals.active && !ui.transitioning && !game.busy) checkRewards(away);
  });
  window.addEventListener('pagehide', () => {
    if (ui.started) save();
  });

  // 미리보기 환경이 새 버전으로 갈아 끼울 때 진행 상황을 넘겨준다.
  window.claude?.hot?.snapshot?.(() => {
    game.state.lastSeen = Date.now();
    return JSON.parse(JSON.stringify(game.state));
  });

  registerServiceWorker(() => ui.toast(t('toast.update'), 'info'));

  if (new URLSearchParams(location.search).has('debug')) window.__ufo = { game, world, scene, ui, audio, save };

  document.getElementById('boot')?.remove();
  ui.showTitle(() => ui.begin());
}

function boot(hotData) {
  try {
    start(hotData);
  } catch (err) {
    console.error(err);
    const el = document.getElementById('boot');
    if (el) el.textContent = '게임을 시작하지 못했어요. 새로 고침해 주세요. / Could not start. Please reload.';
  }
}

if (window.claude?.hot?.ready) window.claude.hot.ready(boot);
else boot(window.claude?.hot?.data ?? {});
