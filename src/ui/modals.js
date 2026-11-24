// 모달 창과 그 안에 들어가는 화면들: 사건 보고서, 임무, 엔딩, 설정 등.
import { CAUSES, CAUSE_BY_ID } from '../data/content.js';
import { formatSize, formatGain, formatInt, formatPercent } from '../core/format.js';
import { encodeSave, decodeSave } from '../core/state.js';
import { t, tList, tPick, formatDuration, LANGS, getLang } from '../i18n/index.js';
import { copyText, shareText } from '../platform/device.js';
import { iconURL, causeIconURL } from '../render/iconcache.js';
import { h, clear, icon, img, grantTag } from './dom.js';
import { hooks } from './hooks.js';
import { adButton } from './ext/adButton.js';

export const APP_VERSION = '1.0.0';

export class Modals {
  /** @param {HTMLElement} root */
  constructor(root) {
    this.root = root;
    this.stack = [];
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const top = this.stack[this.stack.length - 1];
      if (top && top.dismiss) top.close();
    });
  }

  get active() {
    return this.stack.length > 0;
  }

  /**
   * 모달을 연다.
   * @param {Node} content
   * @param {{dismiss?: boolean, cls?: string, onClose?: () => void, label?: string}} [o]
   *        dismiss = 바깥을 누르거나 Esc 로 닫을 수 있는지
   */
  open(content, { dismiss = true, cls = '', onClose, label } = {}) {
    const card = h('div', { class: `modal ${cls}`.trim(), role: 'dialog', 'aria-modal': 'true', 'aria-label': label }, content);
    const layer = h('div', { class: 'modal-layer' }, card);
    const entry = {
      dismiss,
      layer,
      card,
      closed: false,
      close: () => {
        if (entry.closed) return;
        entry.closed = true;
        this.stack = this.stack.filter((e) => e !== entry);
        layer.remove();
        this.root.hidden = this.stack.length === 0;
        this._syncInert();
        onClose?.();
      },
    };
    // 바깥을 눌러 닫는 것은 click 에서 한다. pointerdown 에서 닫으면 같은 터치의 click 이 아래 버튼을 누른다.
    layer.addEventListener('click', (e) => {
      if (e.target === layer && dismiss) entry.close();
    });
    this.stack.push(entry);
    this.root.hidden = false;
    this.root.append(layer);
    this._syncInert();
    // 키보드 사용자를 위해 정해 둔 버튼, 없으면 첫 버튼에 초점을 준다.
    requestAnimationFrame(() => (card.querySelector('[data-autofocus]') || card.querySelector('.btn'))?.focus({ preventScroll: true }));
    return entry;
  }

  /** 맨 위 모달만 조작할 수 있게, 그 아래 모달과 화면의 나머지는 inert 로 막는다. */
  _syncInert() {
    const top = this.stack[this.stack.length - 1];
    for (const e of this.stack) e.layer.inert = e !== top;
    const parent = this.root.parentElement;
    if (!parent) return;
    for (const el of parent.children) if (el !== this.root) el.inert = !!top;
  }

  closeAll() {
    for (const e of [...this.stack]) e.close();
  }
}

const btn = (label, onClick, cls = '') => h('button', { class: `btn ${cls}`.trim(), type: 'button', onClick }, label);

function head(title, onClose) {
  return h(
    'header',
    { class: 'modal-head' },
    h('h2', { text: title }),
    onClose && h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('common.close'), onClick: onClose }, icon('close', 20)),
  );
}

// ───────── 본부 교신(처음 한 번) ─────────

export function showIntro(ui, onDone) {
  const lines = tList('intro.lines');
  let i = 0;
  const text = h('p', { class: 'intro-text' });
  const dots = h('div', { class: 'dots' });
  const next = btn('', () => step(1), 'primary');
  const skip = h('button', { class: 'link-btn', type: 'button', text: t('intro.skip'), onClick: () => finish() });
  const body = h(
    'div',
    { class: 'intro' },
    h('div', { class: 'intro-speaker' }, img(iconURL('emblem', 'airport', 44), 44), h('b', { text: t('intro.speaker') })),
    text,
    dots,
    h('div', { class: 'row end' }, skip, next),
  );
  const entry = ui.modals.open(body, { dismiss: false, cls: 'modal-intro', label: t('intro.speaker') });
  function paint() {
    text.textContent = lines[i];
    clear(dots);
    lines.forEach((_, k) => dots.append(h('i', { class: k === i ? 'on' : '' })));
    next.textContent = i === lines.length - 1 ? t('intro.go') : t('intro.next');
    skip.hidden = i === lines.length - 1;
  }
  function finish() {
    entry.close();
    onDone();
  }
  function step(d) {
    ui.audio.sfx('click');
    if (i + d >= lines.length) return finish();
    i += d;
    paint();
  }
  paint();
}

// ───────── 사건 보고서 ─────────

export function showReport(ui, report, onNext) {
  const game = ui.game;
  const id = report.cause;
  const rows = [
    [t('report.riskChange'), `${formatPercent(report.before)} → ${formatPercent(report.after)}`, 'down'],
    [t('report.reached'), formatSize(report.size)],
    [t('report.specimens'), t('report.countForm', { n: formatInt(report.specimens) })],
    [t('report.missions'), t('report.countTimes', { n: formatInt(report.missions) })],
  ];
  if (report.isNew && report.nextStart > report.prevStart) {
    rows.push([t('report.nextStart'), `${formatSize(report.prevStart)} → ${formatSize(report.nextStart)}`, 'up']);
  }
  const shareBtn = h(
    'button',
    {
      class: 'btn ghost',
      type: 'button',
      onClick: async () => {
        const text = t('report.shareText', {
          n: report.gen,
          title: t(`cause.${id}.title`),
          size: formatSize(report.size),
          a: game.uniqueCauses,
          b: CAUSES.length,
        });
        const res = await shareText(text);
        if (res === 'copied') ui.toast(t('report.shared'), 'good');
      },
    },
    icon('share', 18),
    t('report.share'),
  );
  const body = h(
    'div',
    { class: 'report' },
    h('div', { class: 'stamp', 'aria-hidden': 'true', text: t('report.stamp') }),
    h(
      'header',
      { class: 'report-head' },
      h('span', { class: 'report-kicker', text: t('report.title') }),
      h('span', { class: 'report-officer', text: t('report.officer', { n: report.gen }) }),
    ),
    h(
      'div',
      { class: 'report-main' },
      img(causeIconURL(id, 72), 72, 'report-pic'),
      h(
        'div',
        null,
        report.isNew && h('span', { class: 'badge new', text: t('report.newBadge') }),
        h('h2', { text: t(`cause.${id}.title`) }),
      ),
    ),
    h('p', { class: 'report-text', text: t(`cause.${id}.report`) }),
    h('p', { class: 'report-lesson' }, h('b', { text: t('report.lesson') }), h('span', { text: t(`cause.${id}.lesson`) })),
    h(
      'dl',
      { class: 'kv' },
      rows.map(([k, v, tone]) => [h('dt', { text: k }), h('dd', { class: tone || '', text: v })]),
    ),
    h(
      'div',
      { class: 'report-grant' },
      h('span', { text: t('report.grant') }),
      grantTag(`+${formatInt(report.grant)}`, 'big'),
      report.isNew && h('span', { class: 'chip gain', text: t('report.grantNew') }),
    ),
    ...hooks.reportExtras.map((x) => {
      try {
        return x.render(ui, report);
      } catch (err) {
        console.warn(`보고서 ${x.id}`, err);
        return null;
      }
    }),
    h('p', { class: 'report-tip' }, h('b', { text: t('report.tip') }), h('span', { text: tPick('tips') })),
    h(
      'div',
      { class: 'row' },
      shareBtn,
      h('button', { class: 'btn primary grow', type: 'button', 'data-autofocus': '', onClick: () => done() }, t('report.next'), icon('arrow', 18)),
    ),
  );
  const entry = ui.modals.open(body, { dismiss: false, cls: 'modal-report', label: t('report.title') });
  function done() {
    entry.close();
    onNext();
  }
  return entry;
}

// ───────── 임무 ─────────

/** 출동 연출 화면. 결과는 호출한 쪽이 setResult 로 넣는다. */
export function showMission(ui, id) {
  const lines = tList('missionUi.suspense');
  const status = h('p', { class: 'mission-status', text: lines[0] });
  const body = h(
    'div',
    { class: 'mission running' },
    h('div', { class: 'mission-emblem' }, h('div', { class: 'radar' }), img(iconURL('emblem', id, 96), 96)),
    h('span', { class: 'kicker', text: t('missionUi.running') }),
    h('h2', { text: t(`mission.${id}.name`) }),
    status,
  );
  const entry = ui.modals.open(body, { dismiss: false, cls: 'modal-mission', label: t(`mission.${id}.name`) });
  let n = 0;
  const timer = setInterval(() => {
    n = (n + 1) % lines.length;
    status.textContent = lines[n];
  }, 650);
  return {
    close() {
      clearInterval(timer);
      entry.close();
    },
    /** 성공 화면으로 바꾼다. */
    setSuccess(res, onConfirm) {
      clearInterval(timer);
      body.className = 'mission success';
      clear(body);
      body.append(
        h('div', { class: 'mission-emblem' }, img(iconURL('emblem', id, 96), 96)),
        h('span', { class: 'kicker good', text: t('missionUi.success') }),
        h('h2', { text: t(`mission.${id}.name`) }),
        h('p', { class: 'mission-status', text: tPick(`mission.${id}.success`) }),
        h(
          'dl',
          { class: 'kv' },
          h('dt', { text: t('missionUi.gain') }),
          h('dd', { class: 'up', text: formatGain(res.gain) }),
          h('dt', { text: t('missionUi.grant') }),
          h('dd', null, grantTag(`+${formatInt(res.grant)}`)),
        ),
        h(
          'button',
          {
            class: 'btn primary wide',
            type: 'button',
            'data-autofocus': '',
            onClick: () => {
              entry.close();
              onConfirm();
            },
          },
          t('missionUi.confirm'),
        ),
      );
      body.querySelector('.btn')?.focus({ preventScroll: true });
    },
  };
}

// ───────── 엔딩 ─────────

export function showEnding(ui, ending, onDone) {
  const game = ui.game;
  const pages = [...tList('ending.pages')];
  if (ending.isTrue) pages.push(t('ending.truePage'));
  let i = 0;
  const text = h('p', { class: 'ending-text' });
  const extra = h('div', { class: 'ending-extra' });
  const next = btn('', () => step(), 'primary wide');
  const body = h(
    'div',
    { class: 'ending' },
    h('div', { class: 'ending-pic' }, img(iconURL('form', 7, 150), 150)),
    h('span', { class: 'kicker good', text: ending.isTrue ? t('ending.trueTitle') : t('ending.title') }),
    text,
    extra,
    next,
  );
  const entry = ui.modals.open(body, { dismiss: false, cls: 'modal-ending', label: t('ending.title') });
  function paint() {
    const last = i === pages.length - 1;
    text.textContent = pages[i];
    text.classList.toggle('ps', ending.isTrue && last);
    clear(extra);
    if (last) {
      extra.append(
        h('p', { class: 'ending-reward' }, grantTag(`+${formatInt(ending.grant)}`, 'big')),
        h('p', { class: 'note', text: t('ending.bonus') }),
      );
      const left = CAUSES.length - game.uniqueCauses;
      if (!ending.isTrue && left > 0) extra.append(h('p', { class: 'note', text: t('ending.archiveLeft', { n: left }) }));
    }
    next.textContent = last ? t('ending.again') : t('ending.next');
  }
  function step() {
    ui.audio.sfx('click');
    if (i < pages.length - 1) {
      i++;
      paint();
      return;
    }
    entry.close();
    onDone();
  }
  paint();
}

// ───────── 출석·자리 비움 ─────────

export function showDaily(ui, res) {
  ui.game.fx.monetize?.noteDaily(res.reward);
  const amount = h('p', { class: 'gift-amount' }, grantTag(`+${formatInt(res.reward)}`, 'big'));
  // 광고 보고 2배로(보상형 광고, 하루 한 번)
  const double = adButton(ui, 'daily', {
    label: t('monetize.place.daily.btn'),
    cls: 'wide',
    showLeft: false,
    ctx: { reward: res.reward },
    onReward: (r) => {
      if (r?.amount) amount.replaceChildren(grantTag(`+${formatInt(res.reward + r.amount)}`, 'big'));
      double.remove();
      ui.audio.sfx('coin');
    },
  });
  const body = h(
    'div',
    { class: 'gift' },
    h('div', { class: 'gift-pic' }, img(iconURL('emblem', 'cvs', 84), 84)),
    h('h2', { text: t('daily.title') }),
    h('p', { text: t('daily.body') }),
    amount,
    h('span', { class: 'chip', text: t('daily.streak', { n: res.streak }) }),
    double,
    h('button', { class: 'btn primary wide', type: 'button', 'data-autofocus': '', onClick: () => entry.close() }, t('daily.claim')),
  );
  const entry = ui.modals.open(body, { cls: 'modal-gift', label: t('daily.title') });
  ui.audio.sfx('coin');
}

export function showOffline(ui, res) {
  ui.game.fx.monetize?.noteOffline(res.gained);
  const gain = h('dd', { class: 'up', text: formatGain(res.gained) });
  const double = adButton(ui, 'offline', {
    label: t('monetize.place.offline.btn'),
    cls: 'wide',
    showLeft: false,
    ctx: { gained: res.gained },
    onReward: (r) => {
      if (r?.amount) gain.textContent = formatGain(res.gained + r.amount);
      double.remove();
    },
  });
  const body = h(
    'div',
    { class: 'gift' },
    h('div', { class: 'gift-pic' }, img(iconURL('emblem', 'cloudnap', 84), 84)),
    h('h2', { text: t('offline.title') }),
    h('p', { text: t('offline.body', { time: formatDuration(res.seconds) }) }),
    h('dl', { class: 'kv' }, h('dt', { text: t('offline.gain') }), gain),
    double,
    h('button', { class: 'btn primary wide', type: 'button', 'data-autofocus': '', onClick: () => entry.close() }, t('common.ok')),
  );
  const entry = ui.modals.open(body, { cls: 'modal-gift', label: t('offline.title') });
}

// ───────── 도감 상세 ─────────

export function showCause(ui, causeId) {
  const game = ui.game;
  const c = CAUSE_BY_ID[causeId];
  const seen = game.state.seen[causeId];
  const sourceName =
    c.kind === 'specimen'
      ? t(`specimen.${c.ref}.name`)
      : c.kind === 'gaze'
        ? t(`watcher.${c.ref}`)
        : c.kind === 'mission'
          ? t(`mission.${c.ref}.name`)
          : '';
  const from = t(`panel.archive.from.${c.kind}`, { name: sourceName });
  let body;
  const close = () => entry.close();
  if (seen) {
    body = h(
      'div',
      { class: 'cause' },
      head(t(`cause.${causeId}.title`), close),
      h('div', { class: 'cause-top' }, img(causeIconURL(causeId, 72), 72), h('span', { class: 'chip', text: from })),
      h('p', { class: 'report-text', text: t(`cause.${causeId}.report`) }),
      h('p', { class: 'report-lesson' }, h('b', { text: t('report.lesson') }), h('span', { text: t(`cause.${causeId}.lesson`) })),
      h(
        'dl',
        { class: 'kv' },
        h('dt', { text: t('panel.archive.detailRisk') }),
        h('dd', null, h('b', { text: formatPercent(game.chance(causeId)) }), h('small', { text: ` (${t('panel.archive.detailBase', { p: formatPercent(c.base) })})` })),
        h('dt', { text: t('panel.archive.detailTimes') }),
        h('dd', { text: t('panel.archive.times', { n: game.state.resist[causeId] || 0 }) }),
        h('dt', { text: t('panel.archive.detailFirst') }),
        h('dd', { text: t('panel.archive.detailFirstValue', { n: seen }) }),
      ),
    );
  } else {
    body = h(
      'div',
      { class: 'cause locked' },
      head(t('panel.archive.unknown'), close),
      h('div', { class: 'cause-top' }, img(causeIconURL(causeId, 72, true), 72), h('span', { class: 'chip', text: t(`kind.${c.kind}`) })),
      h('p', { class: 'report-text', text: t('toast.lockedHint', { hint: t(`cause.${causeId}.hint`) }) }),
    );
  }
  const entry = ui.modals.open(body, { cls: 'modal-cause', label: t('panel.archive.title') });
}

// ───────── 확인 ─────────

export function showConfirm(ui, { title, text, yes, danger = false, onYes }) {
  const body = h(
    'div',
    { class: 'confirm' },
    h('h2', { text: title }),
    h('p', { text }),
    h(
      'div',
      { class: 'row' },
      h('button', { class: 'btn ghost grow', type: 'button', 'data-autofocus': '', onClick: () => entry.close() }, t('common.cancel')),
      h(
        'button',
        {
          class: `btn grow ${danger ? 'danger' : 'primary'}`,
          type: 'button',
          onClick: () => {
            entry.close();
            onYes();
          },
        },
        yes,
      ),
    ),
  );
  const entry = ui.modals.open(body, { cls: 'modal-confirm', label: title });
}

// ───────── 설정 ─────────

function toggle(label, iconName, on, onChange) {
  const b = h(
    'button',
    {
      class: 'switch',
      type: 'button',
      role: 'switch',
      'aria-checked': String(on),
      onClick: () => {
        const v = b.getAttribute('aria-checked') !== 'true';
        b.setAttribute('aria-checked', String(v));
        onChange(v);
      },
    },
    h('span', { class: 'switch-label' }, icon(iconName, 20), label),
    h('span', { class: 'switch-knob', 'aria-hidden': 'true' }),
  );
  return b;
}

export function showSettings(ui) {
  const game = ui.game;
  const s = game.state.settings;
  const close = () => entry.close();

  const exportBox = h('textarea', { class: 'code', id: 'save-export', readonly: '', rows: '3', 'aria-label': t('settings.export') });
  const exportWrap = h(
    'div',
    { class: 'save-box', hidden: '' },
    exportBox,
    btn(t('settings.copy'), async () => {
      const ok = await copyText(exportBox.value);
      if (!ok) exportBox.select();
      ui.toast(t(ok ? 'settings.copied' : 'settings.copyFail'), ok ? 'good' : 'warn');
    }),
  );
  const importBox = h('textarea', {
    class: 'code',
    id: 'save-import',
    rows: '3',
    placeholder: t('settings.importPlaceholder'),
    'aria-label': t('settings.import'),
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
  });
  const importWrap = h(
    'div',
    { class: 'save-box', hidden: '' },
    importBox,
    btn(t('settings.importApply'), () => {
      const loaded = decodeSave(importBox.value);
      if (!loaded) {
        ui.audio.sfx('deny');
        ui.toast(t('settings.importBad'), 'warn');
        return;
      }
      entry.close();
      ui.replaceSave(loaded);
      ui.toast(t('settings.importOk'), 'good');
    }),
  );

  const langRow = h(
    'div',
    { class: 'segment', role: 'group', 'aria-label': t('settings.language') },
    LANGS.map((l) =>
      h(
        'button',
        {
          class: 'seg',
          type: 'button',
          'aria-pressed': String(getLang() === l.id),
          onClick: () => {
            if (getLang() === l.id) return;
            entry.close();
            ui.changeLang(l.id);
            showSettings(ui);
          },
        },
        l.label,
      ),
    ),
  );

  const body = h(
    'div',
    { class: 'settings' },
    head(t('settings.title'), close),
    !ui.storageOk && h('p', { class: 'warn-box', text: t('settings.storageWarn') }),
    h(
      'div',
      { class: 'stack' },
      toggle(t('settings.sfx'), 'sound', s.sfx, (v) => {
        game.setSetting('sfx', v);
        if (v) ui.audio.sfx('click');
      }),
      toggle(t('settings.music'), 'music', s.music, (v) => game.setSetting('music', v)),
      toggle(t('settings.haptics'), 'vibrate', s.haptics, (v) => {
        game.setSetting('haptics', v);
        if (v) ui.haptics.fire('good');
      }),
    ),
    h('h3', null, icon('globe', 18), t('settings.language')),
    langRow,
    h(
      'details',
      { class: 'fold' },
      h('summary', null, icon('help', 18), t('settings.howto')),
      h('ol', { class: 'howto' }, tList('settings.howtoLines').map((line) => h('li', { text: line }))),
    ),
    h('h3', null, icon('doc', 18), t('settings.save')),
    h('p', { class: 'note', text: t('settings.saveHint') }),
    h(
      'div',
      { class: 'row' },
      h(
        'button',
        {
          class: 'btn ghost grow',
          type: 'button',
          onClick: () => {
            exportBox.value = encodeSave(game.state);
            exportWrap.hidden = false;
            importWrap.hidden = true;
          },
        },
        t('settings.export'),
      ),
      h(
        'button',
        {
          class: 'btn ghost grow',
          type: 'button',
          onClick: () => {
            importWrap.hidden = false;
            exportWrap.hidden = true;
            importBox.focus();
          },
        },
        t('settings.import'),
      ),
    ),
    exportWrap,
    importWrap,
    h(
      'button',
      {
        class: 'btn danger wide',
        type: 'button',
        onClick: () =>
          showConfirm(ui, {
            title: t('settings.reset'),
            text: t('settings.resetConfirm'),
            yes: t('settings.resetYes'),
            danger: true,
            onYes: () => {
              entry.close();
              ui.resetSave();
              ui.toast(t('settings.resetDone'), 'good');
            },
          }),
      },
      t('settings.reset'),
    ),
    h('p', { class: 'version', text: `${t('meta.title')} · ${t('settings.version', { v: APP_VERSION })}` }),
  );
  const entry = ui.modals.open(body, { cls: 'modal-settings', label: t('settings.title') });
}
