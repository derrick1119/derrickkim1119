// 미니게임 무대: 화면 덮개(DOM + 2D 캔버스), 제목 카드 → 3·2·1 → 놀이 → 결과 도장 → 정리.
// 놀이 틀(games/*.js)은 그림과 규칙만 맡고, 시간·입력·일시정지·마무리는 모두 여기서 한다.
import { h, img, icon } from '../dom.js';
import { addIcons } from '../icons.js';
import { t } from '../../i18n/index.js';
import { iconURL } from '../../render/iconcache.js';
import { clamp01, gradeFor, effectPercents } from './score.js';
import { Fx } from './fx.js';

addIcons({
  // 가리키는 손가락(놀이 방법 그림)
  finger:
    '<path d="M9.5 12.5V5a1.6 1.6 0 0 1 3.2 0v6l3.9.7a2.2 2.2 0 0 1 1.8 2.5l-.6 3.6A3.6 3.6 0 0 1 14.2 21h-2.5a3.6 3.6 0 0 1-2.9-1.5l-2.9-4a1.6 1.6 0 0 1 2.5-2l1.1 1.2"/>',
  skip: '<path d="M5 6l7 6-7 6V6z"/><path d="M13 6l7 6-7 6V6z"/>',
});

const INTRO_S = 1.9; // 제목 카드
const INTRO_FIRST_S = 3.6; // 처음 해 보는 틀이면 설명을 더 오래
const COUNT_STEP_S = 0.55; // 3·2·1 한 칸
const RESUME_S = 1.5; // 다시 시작할 때 3·2·1
const TIMEUP_S = 0.5; // '끝!'
const STAMP_HOLD_S = 1.7; // 도장을 보여 주는 시간
const OUT_MS = 260;

const SEEN_KEY = 'shh-ufo:minigames:seen';
const seenMemory = new Set();

function seenBefore(tpl) {
  if (seenMemory.has(tpl)) return true;
  try {
    const list = JSON.parse(window.localStorage.getItem(SEEN_KEY) || '[]');
    return Array.isArray(list) && list.includes(tpl);
  } catch {
    return false;
  }
}

function markSeen(tpl) {
  seenMemory.add(tpl);
  try {
    const list = JSON.parse(window.localStorage.getItem(SEEN_KEY) || '[]');
    const next = Array.isArray(list) ? list.filter((x) => typeof x === 'string').slice(0, 20) : [];
    if (!next.includes(tpl)) next.push(tpl);
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(next));
  } catch {
    /* 저장이 안 되면 이번 실행 동안만 기억한다 */
  }
}

const GRADE_SFX = { perfect: 'achievement', good: 'buy', close: 'safe', bad: 'cloakOff' };
const GRADE_STARS = { perfect: 3, good: 2, close: 1, bad: 0 };
const signed = (n) => (n > 0 ? `+${n}%` : n < 0 ? `−${Math.abs(n)}%` : '±0%');

/**
 * 미니게임 하나를 띄우고 점수(0..1)로 끝난다. 어떤 경우에도 한 번만 끝나고 덮개를 치운다.
 * @param {object} ui
 * @param {string} missionId
 * @param {object} tune config.tuneFor 결과
 * @param {(env: object) => object} create 놀이 틀의 create
 * @returns {Promise<number>}
 */
export function runMinigame(ui, missionId, tune, create) {
  return new Promise((resolve) => {
    const stage = ui && ui.stage;
    if (!stage || typeof document === 'undefined') {
      resolve(0.5);
      return;
    }
    const reduced = !!(ui.scene && ui.scene.reducedMotion);
    const tpl = tune.tpl;
    const first = !seenBefore(tpl);
    const say = (k, p) => t(`minigame.${k}`, p);
    const sfx = (name, opts) => {
      try {
        ui.audio?.sfx?.(name, opts);
      } catch {
        /* 소리는 없어도 된다 */
      }
    };
    const haptic = (name) => {
      try {
        ui.haptics?.fire?.(name);
      } catch {
        /* 진동도 없어도 된다 */
      }
    };

    // ───────── DOM ─────────
    const canvas = h('canvas', { class: 'mg-canvas', 'aria-hidden': 'true' });
    const timeFill = h('i');
    const meterFill = h('i');
    const meterText = h('b', { class: 'mg-meter-text', text: '' });
    const meter = h(
      'div',
      { class: 'mg-meter', 'aria-hidden': 'true' },
      h('span', { class: 'mg-meter-label', text: say(`meter.${tpl}`) }),
      h('span', { class: 'mg-meter-bar' }, meterFill),
      meterText,
    );
    const skipBtn = h(
      'button',
      { class: 'mg-skip', type: 'button', 'aria-label': say('skipLabel'), onClick: () => finish(0.5, true) },
      h('span', { text: say('skip') }),
      icon('skip', 14),
    );
    const top = h(
      'div',
      { class: 'mg-top' },
      h('span', { class: 'mg-top-emblem' }, img(iconURL('emblem', missionId, 96), 34)),
      h('div', { class: 'mg-top-mid' }, h('b', { class: 'mg-top-name', text: t(`mission.${missionId}.name`) }), h('span', { class: 'mg-time' }, timeFill)),
      skipBtn,
    );
    const hint = h('p', { class: 'mg-hint', text: say(`how.${missionId}`) });
    const card = h(
      'div',
      { class: 'mg-card', role: 'group' },
      h('div', { class: 'mg-card-emblem' }, img(iconURL('emblem', missionId, 96), 96)),
      h('span', { class: 'kicker', text: say(`tpl.${tpl}`) }),
      h('h2', { text: t(`mission.${missionId}.name`) }),
      h('p', { class: 'mg-how', text: say(`how.${missionId}`) }),
      h('div', { class: 'mg-demo', 'aria-hidden': 'true' }, h('i', { class: 'mg-demo-ring' }), icon('finger', 40)),
      first ? h('span', { class: 'mg-first', text: say('firstTime') }) : null,
      h('span', { class: 'mg-tap', text: say('tapStart') }),
    );
    const count = h('div', { class: 'mg-count', 'aria-live': 'assertive' });
    const pauseNote = h('div', { class: 'mg-pause', hidden: '' }, h('b', { text: say('paused') }));
    const stamp = h('div', { class: 'mg-stamp', hidden: '' });
    const root = h(
      'div',
      {
        class: `mg mg-${tpl}${reduced ? ' is-reduced' : ''}${first ? ' is-first' : ''}`,
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': t(`mission.${missionId}.name`),
        tabindex: '-1',
        dataset: { tpl, theme: tune.theme, phase: 'intro' },
      },
      canvas,
      top,
      meter,
      hint,
      card,
      count,
      pauseNote,
      stamp,
    );
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(0.5);
      return;
    }

    // ───────── 상태 ─────────
    const fx = new Fx(reduced);
    let w = 0;
    let hgt = 0;
    let dpr = 1;
    let phase = 'intro'; // intro | count | play | end
    let phaseT = 0;
    let playT = 0;
    let clock = 0;
    let resumeT = 0;
    let paused = false;
    let finished = false;
    let raf = 0;
    let lastNow = 0;
    let countShown = '';
    let goLeft = 0; // '시작!' 을 지우기까지
    let final = 0.5;
    let stampShown = false;
    let meterKey = '';
    const pointers = new Map();
    const introLen = first ? INTRO_FIRST_S : INTRO_S;
    const info = { phase, t: 0, left: tune.duration, duration: tune.duration, clock: 0 };

    const env = {
      tune,
      reduced,
      fx,
      sfx,
      haptic,
      form: Number.isFinite(ui.game?.formIndex) ? ui.game.formIndex : 0,
      say,
      size: () => ({ w, h: hgt }),
    };
    const game = create(env);
    // 자동 점검(브라우저 테스트)용: 놀이의 속 상태를 읽는다. 게임에는 영향이 없다.
    root._probe = () => ({ phase, t: playT, ...(game.probe?.() || {}) });

    const setPhase = (p) => {
      phase = p;
      phaseT = 0;
      root.dataset.phase = p;
    };

    const showCount = (text, cls = '') => {
      if (countShown === text) return;
      countShown = text;
      count.replaceChildren(text ? h('b', { class: cls, text }) : '');
    };

    // ───────── 크기 ─────────
    const fit = () => {
      const r = root.getBoundingClientRect();
      const nw = Math.max(1, Math.round(r.width));
      const nh = Math.max(1, Math.round(r.height));
      const nd = Math.min(2, window.devicePixelRatio || 1);
      if (nw === w && nh === hgt && nd === dpr) return;
      w = nw;
      hgt = nh;
      dpr = nd;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(hgt * dpr);
      game.resize?.(w, hgt);
    };

    // ───────── 입력 ─────────
    const local = (e) => {
      const r = canvas.getBoundingClientRect();
      // 이벤트가 일어난 순간의 놀이 시각(박자 판정용). 프레임 사이에 눌러도 정확하게 잰다.
      const lag = Number.isFinite(e.timeStamp) && lastNow ? Math.max(-0.05, Math.min(0.1, (e.timeStamp - lastNow) / 1000)) : 0;
      return { x: e.clientX - r.left, y: e.clientY - r.top, id: e.pointerId, time: playT + lag };
    };
    const playing = () => phase === 'play' && !paused && resumeT <= 0;

    const onDown = (e) => {
      if (finished || e.target.closest?.('.mg-skip')) return;
      if (e.cancelable) e.preventDefault();
      try {
        root.setPointerCapture?.(e.pointerId);
      } catch {
        /* 무시 */
      }
      if (phase === 'intro') {
        if (phaseT > (first ? 1.0 : 0.45)) startCount();
        return;
      }
      if (phase === 'end') {
        if (stampShown && phaseT > TIMEUP_S + 0.9) close();
        return;
      }
      if (!playing()) return;
      const p = local(e);
      pointers.set(e.pointerId, p);
      game.down?.(p, info);
    };
    const onMove = (e) => {
      if (finished || !pointers.has(e.pointerId) || !playing()) return;
      const p = local(e);
      pointers.set(e.pointerId, p);
      game.move?.(p, info);
    };
    const onUp = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (finished || !playing()) return;
      game.up?.(local(e), info);
    };
    const releaseAll = () => {
      for (const p of pointers.values()) {
        try {
          game.up?.(p, info);
        } catch {
          /* 무시 */
        }
      }
      pointers.clear();
      try {
        game.release?.();
      } catch {
        /* 무시 */
      }
    };
    const KEY_PRIMARY = new Set([' ', 'Enter', 'Spacebar']);
    const KEY_ARROW = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
    const keyHeld = new Set();
    const onKey = (e) => {
      if (finished) return;
      const down = e.type === 'keydown';
      if (e.target === skipBtn && KEY_PRIMARY.has(e.key)) return; // 건너뛰기 버튼은 그대로 눌린다
      if (!KEY_PRIMARY.has(e.key) && !KEY_ARROW.has(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      if (down && e.repeat) return;
      if (down && phase === 'intro' && KEY_PRIMARY.has(e.key)) {
        if (phaseT > 0.3) startCount();
        return;
      }
      if (!playing()) {
        if (!down) keyHeld.delete(e.key);
        return;
      }
      if (KEY_PRIMARY.has(e.key)) {
        const p = { x: w / 2, y: hgt / 2, id: 'key', time: playT, key: true };
        if (down) {
          keyHeld.add(e.key);
          game.down?.(p, info);
        } else if (keyHeld.delete(e.key)) game.up?.(p, info);
      } else if (down) game.key?.(e.key, info);
      else game.keyUp?.(e.key, info);
    };
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    const pause = () => {
      if (paused || finished) return;
      paused = true;
      releaseAll();
      keyHeld.clear();
      pauseNote.hidden = false;
    };
    const unpause = () => {
      if (!paused) return;
      paused = false;
      pauseNote.hidden = true;
      if (phase === 'play') resumeT = RESUME_S;
    };
    const guard = (fn) => (e) => {
      try {
        fn(e);
      } catch (err) {
        console.warn('미니게임 입력', err);
      }
    };
    const handlers = [
      [root, 'pointerdown', guard(onDown)],
      [root, 'pointermove', guard(onMove)],
      [root, 'pointerup', guard(onUp)],
      [root, 'pointercancel', guard(onUp)],
      [root, 'contextmenu', (e) => e.preventDefault()],
      [window, 'keydown', guard(onKey), true],
      [window, 'keyup', guard(onKey), true],
      [document, 'visibilitychange', guard(onVisibility)],
      [window, 'blur', guard(() => releaseAll())],
    ];
    for (const [el, type, fn, cap] of handlers) el.addEventListener(type, fn, cap ? { capture: true } : { passive: false });

    // ───────── 흐름 ─────────
    function startCount() {
      if (phase !== 'intro') return;
      markSeen(tpl);
      setPhase('count');
    }

    function startPlay() {
      setPhase('play');
      playT = 0;
      showCount(say('go'), 'go');
      goLeft = 0.6;
      sfx('ready');
      haptic('tap');
      game.start?.(info);
    }

    function endPlay() {
      releaseAll();
      final = clamp01(Number(game.score?.()));
      if (!Number.isFinite(final)) final = 0.5;
      setPhase('end');
      showCount(say('timeUp'), 'up');
      sfx('click');
    }

    function showStamp() {
      stampShown = true;
      const grade = gradeFor(final);
      const pc = effectPercents(final);
      const stars = h(
        'span',
        { class: 'mg-stars' },
        [0, 1, 2].map((i) => h('i', { class: i < GRADE_STARS[grade] ? 'on' : '', style: { '--i': i } }, icon('star', 26))),
      );
      stamp.replaceChildren(
        h(
          'div',
          { class: 'mg-stamp-card' },
          stars,
          h('b', { class: 'mg-grade', text: say(`grade.${grade}`) }),
          h('span', { class: 'mg-effect', text: say('effect', { risk: signed(pc.risk), gain: signed(pc.gain) }) }),
        ),
      );
      stamp.dataset.grade = grade;
      stamp.hidden = false;
      showCount('');
      setTimeout(
        () => {
          if (finished) return;
          sfx('stamp');
          haptic(grade === 'bad' ? 'warn' : grade === 'perfect' ? 'good' : 'tap');
          fx.shake(grade === 'perfect' ? 7 : 4, 0.2);
        },
        reduced ? 0 : 260,
      );
      setTimeout(
        () => {
          if (!finished) sfx(GRADE_SFX[grade]);
        },
        reduced ? 120 : 520,
      );
    }

    function close() {
      finish(final, false);
    }

    /** 한 번만 끝낸다: 정리하고, 덮개를 치우고, 점수를 넘긴다. */
    function finish(score, skipped) {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      for (const [el, type, fn, cap] of handlers) el.removeEventListener(type, fn, cap ? { capture: true } : undefined);
      try {
        game.dispose?.();
      } catch {
        /* 무시 */
      }
      if (skipped) sfx('click');
      ui.minigameSkipped = !!skipped; // 건너뛰었으면 "광고 보고 한 번 더"를 권하지 않는다
      if (ui.minigame && ui.minigame.id === missionId) ui.minigame = null;
      const out = clamp01(Number(score));
      root.classList.add('is-out');
      setTimeout(() => root.remove(), reduced ? 0 : OUT_MS);
      resolve(Number.isFinite(out) ? out : 0.5);
    }

    // ───────── 프레임 ─────────
    const meterUpdate = () => {
      let m = null;
      try {
        m = game.meter?.();
      } catch {
        m = null;
      }
      if (!m) return;
      const v = clamp01(m.v);
      const key = `${Math.round(v * 100)}|${m.text ?? ''}`;
      if (key === meterKey) return;
      meterKey = key;
      meterFill.style.width = `${(v * 100).toFixed(1)}%`;
      meter.dataset.grade = gradeFor(v);
      if (meterText.textContent !== (m.text ?? '')) meterText.textContent = m.text ?? '';
    };

    function frame(now) {
      if (finished) return;
      raf = requestAnimationFrame(frame);
      try {
        const dt = lastNow ? Math.min(0.1, Math.max(0, (now - lastNow) / 1000)) : 0;
        lastNow = now;
        fit();
        const cramped = stage.classList.contains('is-cramped');
        if (cramped || document.hidden) pause();
        else if (paused) unpause();

        if (!paused) {
          clock += dt;
          phaseT += dt;
          if (phase === 'intro') {
            if (phaseT >= introLen) startCount();
          } else if (phase === 'count') {
            const n = 3 - Math.floor(phaseT / COUNT_STEP_S);
            if (n >= 1) {
              if (countShown !== String(n)) {
                sfx('click');
                haptic('tap');
              }
              showCount(String(n), 'num');
            } else startPlay();
          } else if (phase === 'play') {
            if (resumeT > 0) {
              resumeT -= dt;
              const n = Math.ceil((resumeT / RESUME_S) * 3);
              if (resumeT > 0) showCount(String(Math.max(1, n)), 'num');
              else {
                showCount(say('go'), 'go');
                goLeft = 0.6;
              }
            } else {
              playT += dt;
              if (goLeft > 0 && (goLeft -= dt) <= 0) showCount('');
              info.phase = 'play';
              info.t = playT;
              info.left = Math.max(0, tune.duration - playT);
              game.update?.(dt, info);
              if (playT >= tune.duration || game.done?.()) endPlay();
            }
          } else if (phase === 'end') {
            if (!stampShown && phaseT >= TIMEUP_S) showStamp();
            if (stampShown && phaseT >= TIMEUP_S + STAMP_HOLD_S + (reduced ? 0 : 0.2)) close();
          }
          if (phase !== 'play') {
            info.phase = phase;
            game.idle?.(dt, info);
          }
          fx.update(dt);
        }
        info.clock = clock;

        // 그리기
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const [sx, sy] = fx.offset();
        ctx.save();
        ctx.translate(sx, sy);
        game.draw(ctx, w, hgt, info);
        fx.draw(ctx, w, hgt);
        ctx.restore();

        // 계기
        const left = phase === 'play' ? info.left / tune.duration : phase === 'end' ? 0 : 1;
        timeFill.style.transform = `scaleX(${left.toFixed(3)})`;
        root.classList.toggle('is-hurry', phase === 'play' && info.left < 2);
        meterUpdate();
      } catch (err) {
        console.warn('미니게임', err);
        finish(0.5, false);
      }
    }

    stage.append(root);
    // 덮개가 화면을 다 가리는 동안 뒤의 장면 그리기를 쉬고 싶을 때 볼 수 있는 표시
    ui.minigame = { id: missionId, tpl };
    try {
      root.focus({ preventScroll: true });
    } catch {
      /* 무시 */
    }
    fit();
    sfx('open');
    raf = requestAnimationFrame(frame);
  });
}
