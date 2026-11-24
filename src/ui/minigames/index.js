import './strings.js';
import { tuneFor } from './config.js';
import { runMinigame } from './shell.js';
import { createDraw } from './games/draw.js';
import { createRedlight } from './games/redlight.js';
import { createShadow } from './games/shadow.js';
import { createHold } from './games/hold.js';
import { createLanes } from './games/lanes.js';
import { createRhythm } from './games/rhythm.js';
import { gradeFor } from './score.js';
import { adButton } from '../ext/adButton.js';
import { h } from '../dom.js';
import { t } from '../../i18n/index.js';

// 임무 미니게임. 임무마다 짧은(약 6~9초) 손맛 놀이를 하고, 그 점수(0..1)가 임무 결과를 바꾼다.
// 점수 0.5 = 보통(예전과 같은 확률·보상), 1 = 완벽(덜 들키고 더 크게 자란다).
//
// playMinigame(ui, missionId) → Promise<number>
//   ui.stage(화면), ui.audio, ui.haptics, ui.game, ui.scene.reducedMotion 을 쓴다. 끝나면 스스로 화면을 치운다.
//   어떤 경우에도 예외를 던지지 않고, 꼭 한 번 0..1 로 끝난다(건너뛰기 = 0.5).
//
// 틀 여섯 가지(games/*.js)와 임무 짝은 config.js, 점수 계산은 score.js(순수 함수, 테스트 있음).

export const GAMES = {
  draw: createDraw,
  redlight: createRedlight,
  shadow: createShadow,
  hold: createHold,
  lanes: createLanes,
  rhythm: createRhythm,
};

/** @returns {Promise<number>} 0..1 */
export async function playMinigame(ui, missionId) {
  try {
    const tune = tuneFor(missionId);
    const create = GAMES[tune.tpl];
    if (!create) return 0.5;
    const clampScore = (v) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5);
    let score = clampScore(await runMinigame(ui, missionId, tune, create));
    // 아쉬운 결과(80% 미만)면 "광고 보고 한 번 더"를 권한다. 다시 하면 둘 중 높은 점수를 쓴다.
    if (score < 0.8 && !ui.minigameSkipped && (await askRetry(ui, score))) {
      score = Math.max(score, clampScore(await runMinigame(ui, missionId, tune, create)));
    }
    return score;
  } catch (err) {
    console.warn('미니게임', err);
    return 0.5;
  }
}

/** 한 번 더 할지 묻는다. 광고를 끝까지 봤으면 true. */
function askRetry(ui, score) {
  const fx = ui.game.fx.monetize;
  if (!ui.monetize || !fx?.canWatch('retry').ok) return Promise.resolve(false);
  return new Promise((resolve) => {
    let settled = false;
    const end = (v) => {
      if (settled) return;
      settled = true;
      entry.close();
      resolve(v);
    };
    const btn = adButton(ui, 'retry', { label: t('monetize.place.retry.btn'), cls: 'primary grow', onReward: () => end(true) });
    const body = h(
      'div',
      { class: 'mg-retry' },
      h('b', { class: 'mg-retry-grade', text: t(`minigame.grade.${gradeFor(score)}`) }),
      h('p', { text: t('monetize.place.retry.desc') }),
      h('div', { class: 'row' }, h('button', { class: 'btn ghost grow', type: 'button', onClick: () => end(false) }, t('minigame.retryNo')), btn),
    );
    const entry = ui.modals.open(body, { dismiss: false, cls: 'modal-retry', label: t('monetize.place.retry.btn') });
  });
}
