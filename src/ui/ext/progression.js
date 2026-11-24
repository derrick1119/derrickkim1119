// progression 기능의 화면: 대원 성격(도착 카드·HUD 칩), 이번 대원의 목표(HUD·팝오버), 변명하기(보고서 앞),
// 교훈 카드(보고서 뒤), 명예의 전당·교훈 모음(기록 탭), 보고서 덧붙임.
import '../../features/progression/index.js';
import { FORMS } from '../../data/content.js';
import { formatSize, formatInt, formatPercent } from '../../core/format.js';
import { t, tPick, formatDuration, getLang } from '../../i18n/index.js';
import { iconURL, causeIconURL } from '../../render/iconcache.js';
import { h, clear, icon, img, grantTag } from '../dom.js';
import { addIcons } from '../icons.js';
import { registerHud, registerReportStep, registerReportExtra, registerRecordsExtra, registerBind } from '../hooks.js';
import { adButton } from './adButton.js';
import { cardDef, drillCause, DRILL_STEP } from '../../features/progression/lessons.js';
import { CLEAR, RECORD_KEYS } from '../../features/progression/memorial.js';

addIcons({
  smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.2c1.9 2.1 5.1 2.1 7 0"/><path d="M9.2 9.6v.6M14.8 9.6v.6"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.1"/>',
  sparkle: '<path d="M12 3.5c.8 4.4 2.6 6.2 7 7-4.4.8-6.2 2.6-7 7-.8-4.4-2.6-6.2-7-7 4.4-.8 6.2-2.6 7-7z"/>',
  up: '<path d="M12 20V5M6 11l6-6 6 6"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  crown: '<path d="M4 8.5l4.2 3.8L12 6l3.8 6.3L20 8.5 18.4 18H5.6L4 8.5z"/><path d="M6 21h12"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
  chat: '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>',
  radar: '<path d="M12 12l5.5-5.5"/><path d="M19.5 12A7.5 7.5 0 1 1 12 4.5"/><path d="M15.5 12A3.5 3.5 0 1 1 12 8.5"/>',
  eyeoff: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><path d="M4.5 4.5l15 15"/>',
  hand: '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v7a7 7 0 0 1-7 7 6 6 0 0 1-5.2-3L3.6 14.6a1.5 1.5 0 0 1 2.6-1.5L8 15"/>',
  clover: '<path d="M12 12C9 9 6 9.5 6 12s3 3 6 0zM12 12c3-3 6-2.5 6 0s-3 3-6 0zM12 12c-3-3-2.5-6 0-6s3 3 0 6zM12 12c-3 3-2.5 6 0 6s3-3 0-6z"/><path d="M13 17.5 15 21"/>',
  cookie: '<circle cx="12" cy="12" r="8.5"/><path d="M9 9h.01M14.5 8.5h.01M15 13.5h.01M9.5 14h.01M12 17h.01"/>',
  mask: '<path d="M4 6c2.5 1.2 5.2 1.6 8 1.6s5.5-.4 8-1.6v5c0 4.6-3.6 8.5-8 8.5S4 15.6 4 11V6z"/><path d="M8 11.2c.7-.6 1.6-.6 2.3 0M13.7 11.2c.7-.6 1.6-.6 2.3 0M9.5 15c1.4.9 3.6.9 5 0"/>',
});

const T = (key, params) => t(`progression.${key}`, params);
const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const later = (ui, ms, fn) => (typeof ui._later === 'function' ? ui._later(ms, fn) : setTimeout(fn, ms));

// ───────── 이름·글 ─────────

function traitLabel(list) {
  return (list || []).map((id) => T(`trait.list.${id}.name`)).join(T('trait.join'));
}
function cadetName(gen, list) {
  return list && list.length ? T('trait.name', { n: gen, trait: traitLabel(list) }) : t('report.officer', { n: gen });
}

const GOAL_ICON = {
  total: 'specimens',
  combo: 'bolt',
  nearMiss: 'eye',
  cloak: 'cloud',
  mission: 'missions',
  formUp: 'up',
  shiny: 'sparkle',
};
function goalIcon(g, size) {
  if (g.type === 'collect' && g.param) return img(iconURL('specimen', g.param, size), size, 'prog-gico');
  return icon(GOAL_ICON[g.type] || 'target', size);
}
function goalText(g) {
  if (g.type === 'collect') return T('goal.type.collect', { n: g.target, name: t(`specimen.${g.param}.name`) });
  if (g.type === 'formUp') return T('goal.type.formUp', { name: t(`form.${FORMS[Number(g.param)]?.id}.name`) });
  return T(`goal.type.${g.type}`, { n: g.target });
}

const CARD_ICON = {
  radar: 'radar',
  lowkey: 'eyeoff',
  eyeDrill: 'eye',
  polish: 'sparkle',
  gloves: 'hand',
  overtime: 'clock',
  brief: 'doc',
  wax: 'cloud',
  fan: 'snow',
  phrasebook: 'chat',
  snack: 'cookie',
  rhythm: 'music',
  clover: 'clover',
  paperwork: 'grant',
  warmup: 'bolt',
  growth: 'up',
  study: 'book',
  cash: 'grant',
};
const num2 = (v) => String(Math.round(v * 100) / 100);
/** 카드 효과를 단계 level 만큼 쌓았을 때의 표시 값. */
function cardValue(def, level, cash = 0) {
  if (def.cash) return formatInt(cash);
  if (def.drill) return num2(DRILL_STEP * 100 * level);
  if (def.red) return num2(def.red.step * 100 * level);
  if (def.pct) return num2(Math.abs(def.pct) * 100 * level);
  if (def.add) return num2(Math.abs(def.add) * level);
  return '';
}
function cardKey(id) {
  return drillCause(id) ? 'drill' : id;
}
function cardName(id) {
  const cause = drillCause(id);
  return cause ? T('lesson.card.drill.name', { title: t(`cause.${cause}.title`) }) : T(`lesson.card.${id}.name`);
}
function cardFx(id, level, cash = 0) {
  const def = cardDef(id);
  const cause = drillCause(id);
  const v = cardValue(def, level, cash);
  return cause ? T('lesson.card.drill.fx', { title: t(`cause.${cause}.title`), v }) : T(`lesson.card.${id}.fx`, { v });
}
function cardIcon(id, size) {
  const cause = drillCause(id);
  if (cause) return img(causeIconURL(cause, size), size, 'lc-cause');
  return icon(CARD_ICON[id] || 'star', size);
}

// ───────── 작은 연출 ─────────

/** 요소 가운데에서 별가루를 터뜨린다. */
function burst(ui, el, n = 8, colors = ['#ffe04f', '#6ff2ff', '#97e655', '#ff8170']) {
  if (!el || !ui.root || reduceMotion() || !Element.prototype.animate) return;
  const r = el.getBoundingClientRect();
  const base = ui.stage.getBoundingClientRect();
  const cx = r.left - base.left + r.width / 2;
  const cy = r.top - base.top + r.height / 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
    const d = 26 + Math.random() * 30;
    const s = h('i', { class: 'prog-spark', 'aria-hidden': 'true', style: { left: `${cx}px`, top: `${cy}px`, background: colors[i % colors.length] } });
    ui.root.append(s);
    const anim = s.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.3) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(1) rotate(160deg)`, opacity: 1, offset: 0.6 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d * 1.25}px), calc(-50% + ${Math.sin(a) * d * 1.25 + 14}px)) scale(0.2) rotate(260deg)`, opacity: 0 },
      ],
      { duration: 620 + Math.random() * 220, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' },
    );
    anim.onfinish = () => s.remove();
  }
}

// ───────── HUD: 성격 칩 + 목표 칩 셋 ─────────

const ctlMap = new WeakMap();
function ctl(ui) {
  let c = ctlMap.get(ui);
  if (!c) {
    c = { sig: '', prevN: [], strip: null, goalHost: null, traitText: null, pop: null, popT: 0, arrive: null, arriveT: 0, waitT: 0, picker: false };
    ctlMap.set(ui, c);
  }
  return c;
}

function goalChip(g, bumped) {
  const p = Math.round((Math.min(g.n, g.target) / g.target) * 100);
  return h(
    'span',
    { class: `prog-chip prog-goal ${g.done ? 'done' : ''} ${bumped ? 'bump' : ''}`.replace(/\s+/g, ' ').trim(), style: { '--p': `${p}%` } },
    g.done ? icon('check', 13) : goalIcon(g, 15),
    !g.done && h('b', { text: `${g.n}/${g.target}` }),
  );
}

function renderHud(ui, force = false) {
  const c = ctl(ui);
  if (!c.strip) return;
  const game = ui.game;
  const goals = game.fx.goals?.list?.() || [];
  const traits = game.fx.traits?.current?.() || [];
  const sig = `${game.state.gen}|${traits.join(',')}|${goals.map((g) => `${g.type}${g.param}:${g.n}/${g.target}:${g.done ? 1 : 0}`).join(';')}|${getLang()}`;
  if (!force && sig === c.sig) return;
  const sameCadet = c.sig.split('|')[0] === String(game.state.gen);
  c.sig = sig;
  // 성격이 둘이고 이름이 길면(영어 등) 칩에는 첫 성격 + 1 만 보인다. 자세한 것은 눌러서 본다.
  const label = traitLabel(traits);
  c.traitText.textContent = traits.length > 1 && label.length > 11 ? `${T(`trait.list.${traits[0]}.name`)} +${traits.length - 1}` : label;
  c.traitChip.hidden = !traits.length;
  clear(c.goalHost).append(...goals.map((g, i) => goalChip(g, sameCadet && c.prevN[i] !== undefined && g.n > c.prevN[i])));
  c.prevN = goals.map((g) => g.n);
  c.strip.hidden = !traits.length && !goals.length;
  c.strip.setAttribute('aria-label', T('goal.hud', { a: goals.filter((g) => g.done).length, b: goals.length }));
  if (c.pop) fillPop(ui);
}

// ───────── 목표 팝오버 ─────────

function traitBlock(id, cls = 'prog-trait-row') {
  return h(
    'div',
    { class: cls },
    h('b', { class: 'prog-trait-name', text: T(`trait.list.${id}.name`) }),
    h('p', { text: T(`trait.list.${id}.desc`) }),
    h(
      'div',
      { class: 'prog-pm' },
      h('span', { class: 'prog-plus' }, h('i', { text: '+' }), T(`trait.list.${id}.up`)),
      h('span', { class: 'prog-minus' }, h('i', { text: '−' }), T(`trait.list.${id}.down`)),
    ),
  );
}

function fillPop(ui) {
  const c = ctl(ui);
  if (!c.pop) return;
  const game = ui.game;
  const goals = game.fx.goals?.list?.() || [];
  const traits = game.fx.traits?.current?.() || [];
  clear(c.pop).append(
    h(
      'header',
      { class: 'prog-pop-head' },
      img(iconURL('form', game.formIndex, 36), 36, 'prog-pop-ufo'),
      h('b', { text: cadetName(game.state.gen, traits) }),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('common.close'), onClick: () => closePop(ui) }, icon('close', 18)),
    ),
    ...traits.map((id) => traitBlock(id)),
    h('h4', { class: 'prog-pop-sub' }, icon('target', 16), T('goal.title')),
    h(
      'ul',
      { class: 'prog-goal-list' },
      goals.map((g) =>
        h(
          'li',
          { class: g.done ? 'done' : '' },
          h('span', { class: 'prog-gi' }, goalIcon(g, 22)),
          h(
            'div',
            { class: 'prog-gbody' },
            h('span', { class: 'prog-gtext', text: goalText(g) }),
            h('div', { class: 'bar thin' }, h('i', { style: { '--p': `${(Math.min(g.n, g.target) / g.target) * 100}%` } })),
          ),
          g.done
            ? h('span', { class: 'chip safe', text: T('goal.done') })
            : h('span', { class: 'prog-greward' }, h('small', { text: `${g.n}/${g.target}` }), grantTag(`+${formatInt(game.grantFor(g.reward, 'goal'))}`)),
        ),
      ),
    ),
    h('p', { class: 'prog-pop-hint', text: T('goal.hint') }),
  );
}

function openPop(ui) {
  const c = ctl(ui);
  if (c.pop || !ui.root) return;
  closeArrival(ui);
  c.pop = h('div', { class: 'prog-pop', role: 'dialog', 'aria-label': T('goal.title') });
  c.popT = 9;
  fillPop(ui);
  ui.root.append(c.pop);
  c.strip?.setAttribute('aria-expanded', 'true');
  ui.audio.sfx('open');
}
function closePop(ui) {
  const c = ctl(ui);
  if (!c.pop) return;
  const el = c.pop;
  c.pop = null;
  c.strip?.setAttribute('aria-expanded', 'false');
  el.classList.add('out');
  setTimeout(() => el.remove(), 180);
}
function togglePop(ui) {
  if (!ui.started || ui.modals.active) return;
  if (ctl(ui).pop) closePop(ui);
  else openPop(ui);
}

// ───────── 새 대원 도착 카드 ─────────

function showArrival(ui) {
  const c = ctl(ui);
  const game = ui.game;
  const traits = game.fx.traits?.current?.() || [];
  if (!traits.length || !ui.root) return;
  closeArrival(ui);
  const card = h(
    'div',
    { class: 'prog-arrive', role: 'status', onClick: () => closeArrival(ui) },
    h('span', { class: 'kicker', text: T('trait.arrive') }),
    h(
      'div',
      { class: 'prog-arrive-main' },
      img(iconURL('form', game.formIndex, 48), 48, 'prog-arrive-ufo'),
      h('b', { class: 'prog-arrive-name', text: cadetName(game.state.gen, traits) }),
    ),
    ...traits.map((id) => traitBlock(id, 'prog-trait-row compact')),
  );
  ui.root.append(card);
  c.arrive = card;
  c.arriveT = traits.length > 1 ? 6.2 : 4.8;
  ui.audio.sfx('ready');
}
function closeArrival(ui) {
  const c = ctl(ui);
  if (!c.arrive) return;
  const el = c.arrive;
  c.arrive = null;
  el.classList.add('out');
  setTimeout(() => el.remove(), 240);
}

registerHud({
  id: 'progression',
  order: 30,
  mount(ui, host) {
    const c = ctl(ui);
    c.traitText = h('b');
    c.traitChip = h('span', { class: 'prog-chip prog-trait' }, icon('smile', 14), c.traitText);
    c.goalHost = h('span', { class: 'prog-goals' });
    c.strip = h(
      'button',
      { class: 'prog-strip', type: 'button', 'aria-expanded': 'false', onClick: () => togglePop(ui) },
      c.traitChip,
      c.goalHost,
    );
    host.append(h('div', { class: 'prog-hud' }, c.strip));
    c.sig = '';
    c.prevN = [];
    c.pop = null;
    c.arrive = null;
    renderHud(ui, true);
  },
  update(ui, dt) {
    const c = ctl(ui);
    if (!c.strip) return;
    const game = ui.game;
    renderHud(ui);
    if (c.arrive) {
      c.arriveT -= dt;
      if (c.arriveT <= 0) closeArrival(ui);
    }
    if (c.pop) {
      c.popT -= dt;
      if (c.popT <= 0 || ui.modals.active || game.phase !== 'play') closePop(ui);
    }
    const calm = ui.started && !ui.titleCb && game.phase === 'play' && !game.busy && !ui.modals.active && !ui.transitioning;
    if (!calm || c.picker) {
      c.waitT = 0;
      return;
    }
    c.waitT += dt;
    if (c.waitT < 0.9) return;
    // 보고서를 보다 앱을 닫았다가 돌아오면 보고서 뒤 단계가 건너뛰어진다: 남은 교훈 카드를 이때 고르게 한다
    const pend = game.fx.lessons?.pending?.();
    if (pend && pend.gen < game.state.gen) {
      c.waitT = 0;
      c.picker = true;
      game.busy = true;
      showLessons(ui, true).then(() => {
        c.picker = false;
        if (game.phase === 'play') game.busy = false;
        ui.save();
      });
      return;
    }
    if (game.fx.traits?.needsAnnounce?.()) {
      game.fx.traits.markAnnounced();
      showArrival(ui);
    }
  },
});

// ───────── 이벤트 ─────────

registerBind({
  id: 'progression',
  bind(ui) {
    const { game, world } = ui;
    game.on('progression:goal', (e) => {
      const c = ctl(ui);
      ui.toast(T('goal.toast', { goal: goalText(e.goal) }), 'grant', grantTag(`+${formatInt(e.grant)}`));
      ui.audio.sfx('achievement');
      ui.haptics.fire('good');
      renderHud(ui, true);
      burst(ui, c.goalHost?.children[e.index] || c.strip, e.all ? 14 : 9);
      if (e.all) {
        later(ui, 450, () => {
          ui.toast(T('goal.allDone'), 'good');
          burst(ui, c.strip, 18);
        });
      }
    });
    const hush = () => {
      closePop(ui);
      closeArrival(ui);
    };
    game.on('discovered', hush);
    game.on('ending', hush);
    world.on('notice', hush);
    game.on('replaced', () => {
      const c = ctl(ui);
      c.sig = '';
      c.prevN = [];
      c.picker = false;
      hush();
    });
    // 팝오버 바깥을 누르면 닫는다(그 터치는 빔으로 넘기지 않는다)
    document.addEventListener(
      'pointerdown',
      (e) => {
        const c = ctl(ui);
        if (!c.pop) return;
        if (c.pop.contains(e.target) || c.strip?.contains(e.target)) return;
        closePop(ui);
        e.stopPropagation();
      },
      true,
    );
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && ctl(ui).pop) closePop(ui);
    });
  },
});

// ───────── 변명하기(보고서 앞) ─────────

function fitTag(o) {
  if (o.perfect) return 'perfect';
  if (o.fit >= 0.08) return 'good';
  if (o.fit > -0.05) return 'meh';
  return 'bad';
}

function showExcuse(ui, report, opts) {
  const game = ui.game;
  const cause = report.cause;
  return new Promise((resolve) => {
    let chosen = false;
    const status = h('p', { class: 'ex-status', 'aria-live': 'polite' });
    const stamp = h('div', { class: 'ex-stamp', 'aria-hidden': 'true', hidden: '' });
    const buttons = opts.map((o, i) => {
      const tag = fitTag(o);
      const b = h(
        'button',
        { class: `ex-opt fit-${tag}`, type: 'button', 'data-autofocus': i === 0 ? '' : null, onClick: () => choose(o, b) },
        h('span', { class: 'ex-say', text: T(`excuse.list.${o.id}`) }),
        h(
          'span',
          { class: 'ex-meta' },
          h('span', { class: 'ex-fit', text: tag === 'perfect' ? T('excuse.perfect') : T(`excuse.fit.${tag}`) }),
          o.used > 0 && h('span', { class: 'ex-used', text: T('excuse.used') }),
        ),
        h('b', { class: 'ex-chance', text: formatPercent(o.chance) }),
      );
      return b;
    });
    const skip = h('button', { class: 'link-btn ex-skip', type: 'button', onClick: () => finish(null) }, T('excuse.skip'));
    // 본부 긴급 무마(보상형 광고): 확률 없이 없던 일로. 변명과 따로, 대원당 한 번.
    const coverSlot = h('div', { class: 'ex-cover' });
    const makeCover = () => {
      if (!game.canCoverUp) return null;
      return adButton(ui, 'coverUp', {
        label: t('monetize.place.coverUp.btn'),
        cls: 'grow',
        onReward: (r) => {
          if (!r?.ok) return;
          chosen = true;
          for (const x of buttons) x.setAttribute('aria-disabled', 'true');
          coverSlot.replaceChildren();
          skip.hidden = true;
          stamp.hidden = false;
          stamp.className = 'ex-stamp ok';
          stamp.textContent = T('excuse.ok');
          status.className = 'ex-status ok';
          status.textContent = t('monetize.place.coverUp.desc');
          burst(ui, stamp, 16);
          if (report.ctx?.mission && game.busy) {
            game.busy = false;
            ui.scene.ufoReturn?.();
          }
          later(ui, 1400, () => finish({ excused: true }));
        },
      });
    };
    const firstCover = makeCover();
    if (firstCover) {
      coverSlot.append(firstCover);
      ui._coverUpOffered = report.gen;
    }
    const body = h(
      'div',
      { class: 'excuse' },
      stamp,
      h('span', { class: 'kicker ex-kicker', text: T('excuse.kicker') }),
      h(
        'div',
        { class: 'ex-culprit' },
        img(causeIconURL(cause, 72), 72, 'ex-pic'),
        h('div', { class: 'ex-who' }, h('small', { text: T('excuse.title') }), h('h2', { text: t(`cause.${cause}.title`) })),
      ),
      h('p', { class: 'ex-prompt' }, icon('chat', 18), T('excuse.prompt')),
      h('div', { class: 'ex-opts', role: 'group', 'aria-label': T('excuse.prompt') }, buttons),
      status,
      coverSlot,
      skip,
    );
    const entry = ui.modals.open(body, { dismiss: false, cls: 'modal-excuse', label: T('excuse.title') });
    ui.audio.sfx('open');

    function finish(out) {
      entry.close();
      resolve(out);
    }
    function choose(o, b) {
      if (chosen) return;
      chosen = true;
      for (const x of buttons) {
        x.setAttribute('aria-disabled', 'true');
        x.classList.toggle('chosen', x === b);
        x.classList.toggle('dim', x !== b);
      }
      skip.hidden = true;
      status.className = 'ex-status thinking';
      status.textContent = tPick('progression.excuse.thinking');
      ui.audio.sfx('suspense');
      ui.haptics.fire('tap');
      later(ui, reduceMotion() ? 500 : 1350, () => {
        const r = game.excuse(o.id);
        const ok = !!(r.ok && r.success);
        stamp.hidden = false;
        stamp.className = `ex-stamp ${ok ? 'ok' : 'fail'}`;
        stamp.textContent = T(ok ? 'excuse.ok' : 'excuse.fail');
        status.className = `ex-status ${ok ? 'ok' : 'fail'}`;
        status.textContent = T(ok ? 'excuse.okLine' : 'excuse.failLine');
        b.classList.add(ok ? 'won' : 'lost');
        ui.audio.sfx(ok ? 'success' : 'stamp');
        ui.haptics.fire(ok ? 'good' : 'stamp');
        if (ok) {
          burst(ui, stamp, 16);
          // 임무에서 들킨 경우 출동 연출이 조작을 막아 둔 채(busy)라, 관측을 이어 가려면 풀어 주고 기체를 불러온다
          if (report.ctx?.mission && game.busy) {
            game.busy = false;
            ui.scene.ufoReturn?.();
          }
        }
        if (ok) {
          coverSlot.replaceChildren();
          later(ui, 1500, () => finish({ excused: true }));
          return;
        }
        // 안 통했다: 긴급 무마를 한 번 더 권하고, 아니면 보고서로
        const again = makeCover();
        if (again) {
          coverSlot.replaceChildren(again);
          skip.hidden = false;
          skip.textContent = T('excuse.skip');
        } else {
          coverSlot.replaceChildren();
          later(ui, 1700, () => finish(null));
        }
      });
    }
  });
}

registerReportStep({
  id: 'progression-excuse',
  phase: 'before',
  order: 40,
  run(ui, report) {
    const game = ui.game;
    if (!game.canExcuse) return undefined;
    const opts = game.fx.excuses?.options?.() || [];
    if (!opts.length) return undefined;
    return showExcuse(ui, report, opts);
  },
});

// ───────── 교훈 카드(보고서 뒤) ─────────

function lessonCard(ui, id, offer, index, onPick) {
  const game = ui.game;
  const def = cardDef(id);
  const lv = game.fx.lessons.level(id);
  const themed = offer.themed === index;
  const next = def.cash ? 0 : Math.min(def.max, lv + 1);
  const fx = def.cash ? cardFx(id, 0, game.grantFor(offer.cash, 'lesson')) : cardFx(id, next);
  const pips = def.cash
    ? null
    : h(
        'span',
        { class: 'lc-pips', 'aria-label': T('lesson.levelUp', { a: lv, b: next }) },
        Array.from({ length: def.max }, (_, k) => h('i', { class: k < lv ? 'on' : k === lv ? 'new' : '' })),
      );
  const b = h(
    'button',
    {
      class: `lcard r-${def.rarity} ${themed ? 'themed' : ''}`.trim(),
      type: 'button',
      'aria-disabled': 'true',
      'aria-label': `${cardName(id)}. ${fx}. ${T(`lesson.rarity.${def.rarity}`)}`,
      onClick: () => onPick(id, b),
    },
    h(
      'span',
      { class: 'lc-inner' },
      h('span', { class: 'lc-back', 'aria-hidden': 'true' }, h('b', { text: '?' })),
      h(
        'span',
        { class: 'lc-front' },
        themed && h('span', { class: 'lc-ribbon', text: T('lesson.themed') }),
        h('span', { class: 'lc-rarity', text: T(`lesson.rarity.${def.rarity}`) }),
        h('span', { class: 'lc-medal' }, cardIcon(id, def.drill ? 40 : 30)),
        h('b', { class: 'lc-name', text: cardName(id) }),
        h('span', { class: 'lc-fx', text: fx }),
        pips,
        h('small', { class: 'lc-quip', text: T(`lesson.card.${cardKey(id)}.quip`) }),
      ),
    ),
  );
  return b;
}

/** 카드 세 장 고르기. resumed = 보고서 없이 나중에 고르는 경우(본부 지원 선택권도). */
export function showLessons(ui, resumed = false) {
  const game = ui.game;
  const offer = game.fx.lessons?.pending?.();
  if (!offer) return Promise.resolve();
  return new Promise((resolve) => {
    let ready = false;
    let done = false;
    const cards = offer.ids.map((id, i) => lessonCard(ui, id, offer, i, pick));
    const row = h('div', { class: 'lc-row', role: 'group', 'aria-label': T('lesson.prompt') }, cards);
    const result = h('p', { class: 'lc-result', 'aria-live': 'polite' });
    // 광고 보고 다시 뽑기: 카드가 다 뒤집힌 뒤에 나온다
    const rerollSlot = h('div', { class: 'lc-reroll', hidden: '' });
    const reroll = adButton(ui, 'reroll', {
      label: t('monetize.place.reroll.btn'),
      onReward: (r) => {
        if (!r?.offer || done) return;
        done = true;
        entry.close();
        showLessons(ui, resumed).then(resolve);
      },
    });
    if (reroll) rerollSlot.append(reroll);
    const body = h(
      'div',
      { class: 'lessons' },
      h('span', { class: 'kicker good', text: T('lesson.kicker') }),
      h('h2', { text: T('lesson.title') }),
      h('p', { class: 'lc-prompt', text: resumed ? T('lesson.later') : T('lesson.prompt') }),
      row,
      result,
      rerollSlot,
    );
    const entry = ui.modals.open(body, { dismiss: false, cls: 'modal-lessons', label: T('lesson.title') });
    // 방향키로 카드 사이를 옮겨 다닌다
    row.addEventListener('keydown', (e) => {
      const i = cards.indexOf(document.activeElement);
      if (i < 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const j = (i + (e.key === 'ArrowRight' ? 1 : cards.length - 1)) % cards.length;
        cards[j].focus();
      }
    });
    // 한 장씩 뒤집는다
    const flipGap = reduceMotion() ? 0 : 170;
    cards.forEach((c, i) => {
      later(ui, 260 + i * flipGap, () => {
        c.classList.add('flipped');
        ui.audio.sfx('pop');
        const r = cardDef(offer.ids[i]).rarity;
        if (r !== 'common') later(ui, 200, () => burst(ui, c, r === 'epic' ? 12 : 7, r === 'epic' ? ['#ffe04f', '#b79cff', '#ffffff'] : ['#6ff2ff', '#bfeaff', '#ffffff']));
      });
    });
    later(ui, 260 + cards.length * flipGap + 380, () => {
      ready = true;
      if (reroll && !done) rerollSlot.hidden = false;
      for (const c of cards) c.setAttribute('aria-disabled', 'false');
      cards[0]?.focus({ preventScroll: true });
    });

    function pick(id, el) {
      if (!ready || done) return;
      done = true;
      rerollSlot.hidden = true;
      const r = game.fx.lessons.pick(id);
      for (const c of cards) c.classList.toggle(c === el ? 'picked' : 'passed', true);
      ui.audio.sfx('achievement');
      ui.haptics.fire('good');
      burst(ui, el, 16);
      result.textContent = r.cash ? T('lesson.pickedCash', { n: formatInt(r.cash) }) : T('lesson.picked', { name: cardName(id) });
      result.classList.add('show');
      later(ui, reduceMotion() ? 500 : 1050, () => {
        entry.close();
        ui.save();
        resolve();
      });
    }
  });
}

registerReportStep({
  id: 'progression-lessons',
  phase: 'after',
  order: 40,
  run(ui) {
    return showLessons(ui, false);
  },
});

// ───────── 보고서 덧붙임: 대원 기록 ─────────

registerReportExtra({
  id: 'progression',
  order: 40,
  render(ui, report) {
    const game = ui.game;
    const pend = game.fx.memorial?.pending?.();
    const entry = pend && pend.gen === report.gen ? pend : null;
    const traits = entry ? entry.traits : game.fx.traits?.current?.() || [];
    const time = entry ? entry.time : game.run.time;
    const name = cadetName(report.gen, traits);
    const broken = entry ? game.fx.memorial.recordsBroken(entry) : [];
    const goals = game.fx.goals?.list?.() || [];
    return h(
      'section',
      { class: 'prog-file' },
      h(
        'p',
        { class: 'prog-file-line' },
        icon('smile', 18),
        h('span', { text: T('memorial.report', { name, time: formatDuration(time), size: formatSize(report.size) }) }),
      ),
      broken.length > 0 &&
        h(
          'div',
          { class: 'prog-file-recs' },
          broken.map((k) => h('span', { class: 'prog-rec-badge' }, icon('crown', 13), `${T('memorial.recordNew')} · ${T(`memorial.recordShort.${k}`)}`)),
        ),
      goals.length > 0 &&
        h(
          'ul',
          { class: 'prog-file-goals', 'aria-label': T('goal.title') },
          goals.map((g) =>
            h('li', { class: g.done ? 'done' : '' }, h('span', { class: 'prog-gmark' }, icon(g.done ? 'check' : 'close', 12)), h('span', { text: goalText(g) })),
          ),
        ),
    );
  },
});

// ───────── 기록 탭: 교훈 모음 + 명예의 전당 ─────────

function ownedLessons(ui) {
  const owned = ui.game.fx.lessons?.owned?.() || [];
  return [
    h('h3', { class: 'sec' }, icon('book', 18), T('lesson.owned'), h('small', { text: T('lesson.ownedCount', { n: owned.reduce((a, o) => a + o.level, 0) }) })),
    owned.length
      ? h(
          'div',
          { class: 'prog-owned' },
          owned.map((o) => {
            const def = cardDef(o.id);
            return h(
              'div',
              { class: `prog-own r-${def.rarity} ${o.level >= o.max ? 'maxed' : ''}`.trim() },
              h('span', { class: 'prog-own-ico' }, cardIcon(o.id, def.drill ? 26 : 18)),
              h('span', { class: 'prog-own-body' }, h('b', { text: cardName(o.id) }), h('small', { text: cardFx(o.id, o.level) })),
              h('span', { class: 'prog-own-lv', text: o.level >= o.max ? T('lesson.max') : T('lesson.level', { a: o.level, b: o.max }) }),
            );
          }),
        )
      : h('p', { class: 'panel-hint', text: T('lesson.ownedNone') }),
  ];
}

function causeLine(e) {
  if (e.cause === CLEAR) return T('memorial.clear');
  return e.cause ? t(`cause.${e.cause}.title`) : '—';
}

function trophy(ui, key, e) {
  const value = key === 'size' ? formatSize(e.size) : key === 'time' ? formatDuration(e.time) : T('memorial.specimens', { n: formatInt(e.specimens) });
  return h(
    'div',
    { class: `prog-trophy k-${key}` },
    h('span', { class: 'prog-trophy-ico' }, icon(key === 'size' ? 'up' : key === 'time' ? 'clock' : 'specimens', 18)),
    h('small', { text: T(`memorial.record.${key}`) }),
    h('b', { text: value }),
    h('span', { class: 'prog-trophy-who', text: cadetName(e.gen, e.traits) }),
  );
}

function memorialWall(ui) {
  const m = ui.game.fx.memorial;
  if (!m) return [];
  const list = m.list().reverse();
  const rec = m.records();
  const total = m.total();
  const out = [h('h3', { class: 'sec' }, icon('crown', 18), T('memorial.title'), h('small', { text: total > list.length ? T('memorial.sub', { n: formatInt(total), m: list.length }) : T('memorial.subAll', { n: formatInt(total) }) }))];
  if (!list.length && !RECORD_KEYS.some((k) => rec[k])) {
    out.push(h('p', { class: 'panel-hint', text: T('memorial.empty') }));
    return out;
  }
  out.push(h('div', { class: 'prog-trophies' }, RECORD_KEYS.filter((k) => rec[k]).map((k) => trophy(ui, k, rec[k]))));
  out.push(
    h(
      'div',
      { class: 'prog-wall' },
      list.map((e) => {
        const holds = m.holds(e);
        return h(
          'article',
          { class: `prog-cadet ${holds.length ? 'record' : ''} ${e.cause === CLEAR ? 'clear' : ''}`.replace(/\s+/g, ' ').trim() },
          h('span', { class: 'prog-cadet-no', text: `#${e.gen}` }),
          holds.length > 0 && h('span', { class: 'prog-cadet-crown', title: holds.map((k) => T(`memorial.record.${k}`)).join(', ') }, icon('crown', 14)),
          e.cause && e.cause !== CLEAR ? img(causeIconURL(e.cause, 40), 40, 'prog-cadet-pic') : img(iconURL('form', e.form, 40), 40, 'prog-cadet-pic'),
          h('b', { class: 'prog-cadet-name', text: traitLabel(e.traits) || `#${e.gen}` }),
          h('small', { class: 'prog-cadet-size', text: formatSize(e.size) }),
          h('small', { class: 'prog-cadet-time' }, icon('clock', 11), formatDuration(e.time)),
          h('small', { class: 'prog-cadet-cause', text: causeLine(e) }),
        );
      }),
    ),
  );
  return out;
}

registerRecordsExtra({
  id: 'progression',
  order: 30,
  render(ui) {
    return h('div', { class: 'prog-records' }, ...ownedLessons(ui), ...memorialWall(ui));
  },
});
