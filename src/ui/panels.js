// 아래에서 올라오는 패널 5종: 표본 · 임무 · 장비 · 도감 · 기록
import { SPECIMENS, MISSIONS, GADGETS, CAUSES, ACHIEVEMENTS } from '../data/content.js';
import {
  cloakDuration,
  cloakCooldown,
  noticeTime,
  specimensPerMission,
  droneInterval,
  offlineCapSeconds,
} from '../core/balance.js';
import { formatSize, formatGain, formatInt, formatPercent } from '../core/format.js';
import { t, formatDuration } from '../i18n/index.js';
import { iconURL, causeIconURL } from '../render/iconcache.js';
import { h, icon, img, grantTag } from './dom.js';
import { showCause } from './modals.js';
import { hooks } from './hooks.js';

export const PANELS = ['specimens', 'missions', 'gadgets', 'archive', 'records'];

const GADGET_ICON = {
  beam: 'bolt',
  cloak: 'cloud',
  cooler: 'snow',
  radar: 'eye',
  tank: 'drop',
  drone: 'drone',
  ai: 'doc',
  autopilot: 'moon',
};

const num1 = (v) => (Math.round(v * 10) / 10).toString();

/** 장비 효과를 레벨에 맞춰 글로. 미설치(0 레벨)인 장비는 none 문구. */
function gadgetEffect(id, lv) {
  switch (id) {
    case 'beam':
      return t('gadget.beam.effect', { v: lv * 10 });
    case 'cloak':
      return t('gadget.cloak.effect', { v: num1(cloakDuration(lv)) });
    case 'cooler':
      return t('gadget.cooler.effect', { v: num1(cloakCooldown(lv)) });
    case 'radar':
      return t('gadget.radar.effect', { v: (Math.round(noticeTime(lv) * 100) / 100).toString() });
    case 'tank':
      return t('gadget.tank.effect', { v: specimensPerMission(lv) });
    case 'drone':
      return lv <= 0 ? t('gadget.drone.none') : t('gadget.drone.effect', { v: num1(droneInterval(lv)) });
    case 'ai':
      return t('gadget.ai.effect', { v: lv * 8 });
    case 'autopilot':
      return lv <= 0 ? t('gadget.autopilot.none') : t('gadget.autopilot.effect', { v: num1(offlineCapSeconds(lv) / 3600) });
    default:
      return '';
  }
}

/** 연구비로 사는 버튼. 모자라면 눌렀을 때 안내만 한다. */
function buyButton(ui, cost, label, onBuy) {
  const can = ui.game.state.grant >= cost;
  return h(
    'button',
    {
      class: `btn buy ${can ? '' : 'short'}`.trim(),
      type: 'button',
      'aria-disabled': String(!can),
      onClick: () => {
        if (ui.game.state.grant < cost) {
          ui.audio.sfx('deny');
          ui.toast(t('toast.needGrant'), 'warn');
          return;
        }
        onBuy();
      },
    },
    h('span', { class: 'buy-label', text: label }),
    grantTag(formatInt(cost)),
  );
}

/** 발각 확률 칩. 확률이 높을수록 색이 진하다. */
function riskChip(text, p) {
  const tone = p >= 0.4 ? 'risk hot' : p >= 0.1 ? 'risk' : 'risk mild';
  return h('span', { class: `chip ${tone}`, text });
}

// ───────── 표본 ─────────

function specimens(ui) {
  const game = ui.game;
  const next = game.nextSpecimen();
  const out = [h('p', { class: 'panel-hint', text: t('panel.specimens.hint') })];
  for (const sp of SPECIMENS) {
    const unlocked = game.isSpecimenUnlocked(sp.id);
    const isNext = next && next.id === sp.id;
    if (!unlocked && !isNext) continue;
    const p = sp.cause ? game.chance(sp.cause) : 0;
    const chips = [
      h('span', { class: 'chip gain', text: formatGain(game.specimenGain(sp.id)) }),
      sp.cause
        ? h('span', { class: `chip ${p >= 0.01 ? 'risk' : 'risk mild'}`, text: t('panel.specimens.risk', { p: formatPercent(p) }) })
        : h('span', { class: 'chip safe', text: t('panel.specimens.safe') }),
    ];
    if (unlocked) chips.push(h('span', { class: 'chip', text: t('panel.specimens.count', { n: formatInt(game.state.stats.bySpecimen[sp.id] || 0) }) }));
    out.push(
      h(
        'article',
        { class: `card ${unlocked ? '' : 'next'}`.trim() },
        img(iconURL('specimen', sp.id, 56), 56),
        h('div', { class: 'card-body' }, h('h3', { text: t(`specimen.${sp.id}.name`) }), h('p', { text: t(`specimen.${sp.id}.desc`) }), h('div', { class: 'chips' }, chips)),
        !unlocked &&
          buyButton(ui, sp.cost, t('panel.specimens.unlock'), () => {
            if (!game.buySpecimen(sp.id)) return;
            ui.onPurchase('specimen', sp.id, t(`specimen.${sp.id}.name`));
          }),
      ),
    );
  }
  const hidden = SPECIMENS.filter((sp) => !game.isSpecimenUnlocked(sp.id)).length - (next ? 1 : 0);
  if (hidden > 0) out.push(lockedRow(t('panel.specimens.upcoming'), t('panel.specimens.upcomingDesc'), hidden));
  if (!next) out.push(h('p', { class: 'panel-hint center', text: t('panel.specimens.all') }));
  return out;
}

function lockedRow(title, desc, count) {
  return h(
    'article',
    { class: 'card locked' },
    h('div', { class: 'lock-pic' }, icon('lock', 24)),
    h('div', { class: 'card-body' }, h('h3', { text: title }), h('p', { text: desc })),
    h('span', { class: 'chip', text: `+${count}` }),
  );
}

// ───────── 임무 ─────────

function missions(ui) {
  const game = ui.game;
  const run = game.run;
  const next = game.nextMission();
  const full = run.fuel >= 100;
  const need = Math.max(1, Math.ceil((100 - run.fuel) / (100 / game.specimensPerMission) - 1e-9));
  const out = [
    h(
      'div',
      { class: `fuel-box ${full ? 'full' : ''}`.trim() },
      h('div', { class: 'fuel-top' }, h('b', null, icon('bolt', 16), full ? t('panel.missions.fuelFull') : t('panel.missions.fuel', { p: Math.floor(run.fuel) })), h('span', { text: full ? t('panel.missions.fuelReady') : t('panel.missions.fuelHint', { n: need }) })),
      h('div', { class: 'bar' }, h('i', { style: { '--p': `${run.fuel}%` } })),
    ),
    h('p', { class: 'panel-hint', text: t('panel.missions.hint') }),
  ];
  for (const m of MISSIONS) {
    const unlocked = game.isMissionUnlocked(m.id);
    const isNext = next && next.id === m.id;
    if (!unlocked && !isNext) continue;
    const risk = game.missionRisk(m.id);
    const fresh = m.causes.some((c) => !game.state.seen[c]);
    const chips = [
      h('span', { class: 'chip gain', text: formatGain(game.missionGain(m.id)) }),
      riskChip(t('panel.missions.risk', { p: formatPercent(risk) }), risk),
    ];
    if (unlocked && fresh) chips.push(h('span', { class: 'chip new', text: t('panel.missions.newCause') }));
    let action;
    if (unlocked) {
      const can = game.canMission(m.id).ok && !game.busy;
      action = h(
        'button',
        {
          class: `btn go ${can ? 'primary' : 'short'}`,
          type: 'button',
          'aria-disabled': String(!can),
          onClick: () => ui.launchMission(m.id),
        },
        t('panel.missions.go'),
      );
    } else {
      action = buyButton(ui, m.cost, t('panel.missions.unlock'), () => {
        if (!game.buyMission(m.id)) return;
        ui.onPurchase('mission', m.id, t(`mission.${m.id}.name`));
      });
    }
    out.push(
      h(
        'article',
        { class: `card ${unlocked ? '' : 'next'}`.trim() },
        img(iconURL('emblem', m.id, 56), 56),
        h('div', { class: 'card-body' }, h('h3', { text: t(`mission.${m.id}.name`) }), h('p', { text: t(`mission.${m.id}.desc`) }), h('div', { class: 'chips' }, chips)),
        action,
      ),
    );
  }
  const hidden = MISSIONS.filter((m) => !game.isMissionUnlocked(m.id)).length - (next ? 1 : 0);
  if (hidden > 0) out.push(lockedRow(t('panel.missions.upcoming'), t('panel.missions.upcomingDesc'), hidden));
  return out;
}

// ───────── 장비 ─────────

function gadgets(ui) {
  const game = ui.game;
  const out = [h('p', { class: 'panel-hint', text: t('panel.gadgets.hint') })];
  for (const g of GADGETS) {
    const lv = game.state.gadgets[g.id];
    const cost = game.gadgetCost(g.id);
    const maxed = cost === null;
    const effect = h(
      'div',
      { class: 'effect' },
      h('span', { class: 'chip', text: gadgetEffect(g.id, lv) }),
      !maxed && icon('arrow', 14),
      !maxed && h('span', { class: 'chip gain', text: gadgetEffect(g.id, lv + 1) }),
    );
    out.push(
      h(
        'article',
        { class: 'card' },
        h('div', { class: `gadget-pic g-${g.id}` }, icon(GADGET_ICON[g.id], 28)),
        h(
          'div',
          { class: 'card-body' },
          h('h3', null, t(`gadget.${g.id}.name`), h('small', { text: maxed ? t('common.max') : t('common.level', { n: lv }) })),
          h('p', { text: t(`gadget.${g.id}.desc`) }),
          effect,
        ),
        maxed
          ? h('span', { class: 'chip safe', text: t('common.max') })
          : buyButton(ui, cost, lv === 0 && (g.id === 'drone' || g.id === 'autopilot') ? t('panel.gadgets.install') : t('panel.gadgets.upgrade'), () => {
              if (!game.upgrade(g.id)) return;
              ui.onPurchase('gadget', g.id, t(`gadget.${g.id}.name`), game.state.gadgets[g.id]);
            }),
      ),
    );
  }
  return out;
}

// ───────── 도감 ─────────

let archiveFilter = 'all';

function archive(ui) {
  const game = ui.game;
  const seen = game.state.seen;
  const kinds = ['all', 'specimen', 'gaze', 'mission', 'special'];
  // 등급(tier)이 없으면 일반, hidden 이 없으면 숨은 사건이 아니다. 문구는 progression 기능의 것을 쓴다.
  const TIERS = ['common', 'rare', 'legendary'];
  const tierOf = (c) => (TIERS.includes(c.tier) ? c.tier : 'common');
  const list = CAUSES.filter((c) => archiveFilter === 'all' || c.kind === archiveFilter);
  const filters = h(
    'div',
    { class: 'filters', role: 'group' },
    kinds.map((k) => {
      const total = CAUSES.filter((c) => k === 'all' || c.kind === k);
      const got = total.filter((c) => seen[c.id]).length;
      return h(
        'button',
        {
          class: 'seg',
          type: 'button',
          'aria-pressed': String(archiveFilter === k),
          onClick: () => {
            archiveFilter = k;
            ui.audio.sfx('click');
            ui.refreshPanel(true);
          },
        },
        t(`kind.${k}`),
        h('small', { text: `${got}/${total.length}` }),
      );
    }),
  );
  const tierCounts = h(
    'div',
    { class: 'tier-counts' },
    TIERS.map((tier) => {
      const all = CAUSES.filter((c) => tierOf(c) === tier);
      if (!all.length) return null;
      const got = all.filter((c) => seen[c.id]).length;
      return h(
        'span',
        { class: `tier-count t-${tier}` },
        h('i', { class: 'tier-gem', 'aria-hidden': 'true' }),
        h('b', { text: t(`progression.archive.tier.${tier}`) }),
        h('small', { text: `${got}/${all.length}` }),
      );
    }),
  );
  const grid = h(
    'div',
    { class: 'grid' },
    list.map((c) => {
      const got = !!seen[c.id];
      const tier = tierOf(c);
      const secret = !!c.hidden && !got;
      return h(
        'button',
        { class: ['cell', `tier-${tier}`, got ? '' : 'unknown', secret ? 'secret' : ''].filter(Boolean).join(' '), type: 'button', onClick: () => showCause(ui, c.id) },
        tier !== 'common' && h('span', { class: `tier-badge t-${tier}`, text: t(`progression.archive.tier.${tier}`) }),
        secret ? h('span', { class: 'secret-pic', 'aria-hidden': 'true' }, h('b', { text: '?' })) : img(causeIconURL(c.id, 56, !got), 56),
        h('b', { text: got ? t(`cause.${c.id}.title`) : '???' }),
        got
          ? h('small', { text: t('panel.archive.times', { n: game.state.resist[c.id] || 0 }) })
          : secret
            ? h('small', { class: 'hint' }, h('i', { class: 'secret-tag', text: t('progression.archive.hidden') }), t(`cause.${c.id}.hint`))
            : h('small', { class: 'hint', text: t(`cause.${c.id}.hint`) }),
      );
    }),
  );
  const pct = (game.uniqueCauses / CAUSES.length) * 100;
  return [
    h(
      'div',
      { class: 'archive-top' },
      h('div', { class: 'archive-count' }, h('b', { text: t('panel.archive.progress', { a: game.uniqueCauses, b: CAUSES.length }) }), h('span', { text: t('panel.archive.nextStart', { size: formatSize(game.nextStartSize) }) })),
      h('div', { class: 'bar' }, h('i', { style: { '--p': `${pct}%` } })),
      tierCounts,
      h('p', { class: 'panel-hint', text: t('panel.archive.hint') }),
    ),
    filters,
    grid,
  ];
}

// ───────── 기록 ─────────

function records(ui) {
  const game = ui.game;
  const s = game.state;
  const done = ACHIEVEMENTS.filter((a) => s.ach[a.id]).length;
  const rows = ACHIEVEMENTS.map((a) => {
    const got = !!s.ach[a.id];
    const secret = a.hidden && !got;
    const cur = Math.min(a.stat(s), a.goal);
    const key = secret ? 'hidden' : a.id;
    return h(
      'article',
      { class: `ach ${got ? 'done' : ''}`.trim() },
      h('div', { class: 'ach-mark' }, icon(got ? 'check' : secret ? 'lock' : 'star', 20)),
      h(
        'div',
        { class: 'card-body' },
        h('h3', { text: t(`ach.${key}.name`) }),
        h('p', { text: t(`ach.${key}.desc`) }),
        !got && !secret && a.goal > 1 && h('div', { class: 'bar thin' }, h('i', { style: { '--p': `${(cur / a.goal) * 100}%` } })),
      ),
      got ? h('span', { class: 'chip safe', text: t('panel.records.done') }) : grantTag(formatInt(a.reward)),
    );
  });
  const stat = (key, value) => [h('dt', { text: t(`panel.records.stat.${key}`) }), h('dd', { text: value })];
  return [
    h('h3', { class: 'sec' }, icon('records', 18), t('panel.records.achievements'), h('small', { text: `${done}/${ACHIEVEMENTS.length}` })),
    h('div', { class: 'ach-list' }, rows),
    h('h3', { class: 'sec' }, icon('doc', 18), t('panel.records.stats')),
    h(
      'dl',
      { class: 'kv stats' },
      stat('gen', formatInt(s.gen)),
      stat('discoveries', formatInt(s.stats.discoveries)),
      stat('archive', `${game.uniqueCauses} / ${CAUSES.length}`),
      stat('bestSize', formatSize(s.stats.bestSize)),
      stat('specimens', formatInt(s.stats.specimens)),
      stat('missionsOk', formatInt(s.stats.missionsOk)),
      stat('missionsFail', formatInt(s.stats.missionsFail)),
      stat('cloaks', formatInt(s.stats.cloaks)),
      stat('clears', formatInt(s.clears)),
      stat('playTime', formatDuration(s.stats.playTime)),
      stat('bestCombo', formatInt(s.stats.bestCombo || 0)),
      stat('nearMisses', formatInt(s.stats.nearMisses || 0)),
    ),
    ...hooks.recordsExtras.map((x) => x.render(ui)),
  ];
}

const RENDER = { specimens, missions, gadgets, archive, records };

/** 패널 내용을 만든다. */
export function renderPanel(ui, name) {
  return RENDER[name](ui);
}

/**
 * 패널을 다시 그려야 하는지 판단하는 지문.
 * 상태가 바뀔 때마다 통째로 다시 그리면 스크롤이 튀므로, 보이는 값이 달라졌을 때만 그린다.
 */
export function panelSignature(ui, name) {
  const game = ui.game;
  const s = game.state;
  const common = `${Math.floor(s.grant)}|${s.gen}|${s.phase}`;
  switch (name) {
    case 'specimens':
      return `${common}|${Object.keys(s.unlocked.specimens).length}|${s.gadgets.beam}|${s.stats.specimens}`;
    case 'missions':
      return `${common}|${Object.keys(s.unlocked.missions).length}|${Math.floor(s.run.fuel)}|${game.busy}|${s.gadgets.beam}|${s.gadgets.tank}`;
    case 'gadgets':
      return `${common}|${Object.values(s.gadgets).join(',')}`;
    case 'archive':
      return `${common}|${s.stats.discoveries}|${archiveFilter}`;
    case 'records':
      return `${common}|${Object.keys(s.ach).length}|${s.stats.specimens}|${s.stats.discoveries}|${Math.floor(s.stats.playTime / 60)}`;
    default:
      return common;
  }
}
