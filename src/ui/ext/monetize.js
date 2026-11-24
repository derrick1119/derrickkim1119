// 보상형 광고 자리들의 화면: 관측 부스터·본부 지원 도장(오른쪽 버튼), 본부 보급 풍선, 구름 즉시 충전,
// 보고서 연구비 ×3, 본부 긴급 무마(변명 화면 밖에서). 변명 화면의 긴급 무마·교훈 카드 다시 뽑기는 progression.js,
// 자리 비움·출석 ×2 는 modals.js, 임무 한 번 더는 minigames/index.js 에 있다.
// 광고 띄우기와 보상은 ui.monetize(src/monetize/service.js)가, 규칙은 game.fx.monetize 가 맡는다.
import { t, formatDuration } from '../../i18n/index.js';
import { formatInt } from '../../core/format.js';
import { h, icon, grantTag } from '../dom.js';
import { registerBind, registerHud, registerReportExtra, registerReportStep } from '../hooks.js';
import { adButton } from './adButton.js';
import { showLessons } from './progression.js';
import { BOOST, LADDER } from '../../features/monetize/catalog.js';

const T = (k, p) => t(`monetize.${k}`, p);

/** 남은 시간 '12:34' / '1:02:03'. */
function clock(sec) {
  const s = Math.max(0, Math.ceil(sec));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const p = (n) => String(n).padStart(2, '0');
  return hh > 0 ? `${hh}:${p(mm)}:${p(ss)}` : `${mm}:${p(ss)}`;
}

/** 'outfit:knight' → 꾸미기 이름. */
const keyName = (key) => {
  const [kind, id] = String(key).split(':');
  return T(`cosmetic.${kind}.${id}`);
};

/** 단계 보상 한 줄 설명. */
function rewardText(ui, rw) {
  const fx = ui.game.fx.monetize;
  const out = [];
  if (rw.grant) out.push(T('ladder.rewards.grant', { n: formatInt(ui.game.grantFor(fx.grantUnit() * rw.grant, 'ladder')) }));
  if (rw.shinyNext) out.push(T('ladder.rewards.shinyNext'));
  if (rw.lessonTicket) out.push(T('ladder.rewards.lessonTicket'));
  if (rw.boost) out.push(T('ladder.rewards.boost', { n: Math.round(rw.boost / 60) }));
  if (rw.piece) out.push(T('ladder.rewards.piece', { n: rw.piece }));
  return out.join(' · ');
}

/** 작은 안내 창(제목·설명·내용·닫기). */
function sheet(ui, { title, desc, cls = '', body = [], onClose }) {
  const close = h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('common.close'), onClick: () => entry.close() }, icon('close', 20));
  const card = h(
    'div',
    { class: `mz-sheet ${cls}`.trim() },
    h('header', { class: 'modal-head' }, h('h2', { text: title }), close),
    desc && h('p', { class: 'mz-desc', text: desc }),
    ...body,
  );
  const entry = ui.modals.open(card, { cls: 'modal-mz', label: title, onClose });
  return entry;
}

// ───────── 관측 부스터 ─────────

function openBoost(ui) {
  const fx = ui.game.fx.monetize;
  const left = h('b', { class: 'mz-boost-left' });
  const bar = h('i');
  const refresh = () => {
    const s = fx.boostLeft();
    left.textContent = s > 0 ? T('place.boost.active', { t: clock(s) }) : '×1';
    bar.style.setProperty('--p', `${Math.min(100, (s / BOOST.max) * 100).toFixed(1)}%`);
  };
  refresh();
  const timer = setInterval(refresh, 1000);
  const slot = h('div', { class: 'mz-actions' });
  const fill = () => {
    slot.replaceChildren();
    if (fx.boostLeft() > BOOST.max - BOOST.perAd + 1) {
      slot.append(h('p', { class: 'mz-note', text: T('place.boost.full') }));
      return;
    }
    const b = adButton(ui, 'boost', {
      label: `+${Math.round(BOOST.perAd / 60)}${t('unit.m')} ×2`,
      cls: 'primary wide',
      onReward: () => {
        refresh();
        ui.toast(T('toast.boost', { t: formatDuration(fx.boostLeft()) }), 'good');
        fill();
      },
    });
    slot.append(b || h('p', { class: 'mz-note', text: T('ad.cap') }));
  };
  fill();
  sheet(ui, {
    title: T('place.boost.title'),
    desc: T('place.boost.desc'),
    cls: 'mz-boost',
    body: [h('div', { class: 'mz-boost-meter' }, icon('rocket', 26), left, h('span', { class: 'bar' }, bar)), slot],
    onClose: () => clearInterval(timer),
  });
}

// ───────── 본부 지원 도장 ─────────

function openLadder(ui) {
  const fx = ui.game.fx.monetize;
  const list = h('div', { class: 'mz-ladder' });
  const head = h('div', { class: 'mz-ladder-head' });
  const extra = h('div', { class: 'mz-ladder-extra' });
  const render = () => {
    const stamps = fx.stamps();
    const max = LADDER[LADDER.length - 1].at;
    head.replaceChildren(
      h('b', { class: 'mz-stamps', text: T('ladder.today', { n: stamps }) }),
      h('span', { class: 'bar' }, h('i', { style: { '--p': `${Math.min(100, (stamps / max) * 100).toFixed(1)}%` } })),
    );
    list.replaceChildren(
      ...fx.ladder().map((st) =>
        h(
          'div',
          { class: `mz-step ${st.claimed ? 'claimed' : st.reached ? 'ready' : 'locked'}` },
          h('span', { class: 'mz-step-at' }, icon('stamp', 18), h('b', { text: T('ladder.at', { n: st.at }) })),
          h('span', { class: 'mz-step-reward', text: rewardText(ui, st.reward) }),
          st.claimed
            ? h('span', { class: 'chip safe', text: T('ladder.claimed') })
            : st.reached
              ? h(
                  'button',
                  {
                    class: 'btn primary small',
                    type: 'button',
                    onClick: () => {
                      const r = fx.claim(st.at);
                      if (r) celebrate(ui, r);
                      render();
                    },
                  },
                  T('ladder.claim'),
                )
              : h('span', { class: 'chip', text: T('ladder.at', { n: st.at }) }),
        ),
      ),
    );
    const w = fx.week();
    const pieces = fx.pieces();
    const tickets = fx.lessonTickets();
    extra.replaceChildren(
      h(
        'div',
        { class: `mz-weekly ${w.ready ? 'ready' : ''}` },
        h('b', { text: T('ladder.weekly') }),
        h('small', { text: T('ladder.weeklyDesc') }),
        w.ready
          ? h(
              'button',
              {
                class: 'btn primary small',
                type: 'button',
                onClick: () => {
                  const r = fx.claimWeekly();
                  if (r) celebrate(ui, r);
                  render();
                },
              },
              T('ladder.claim'),
            )
          : h('span', { class: 'chip', text: T('ladder.weeklyProgress', { n: Math.min(w.streak, w.days) }) }),
      ),
      h(
        'p',
        { class: 'mz-note' },
        pieces.target ? `${T('ladder.pieces', { a: pieces.have, b: pieces.need })} · ${T('ladder.next', { name: keyName(pieces.target) })}` : T('ladder.allMade'),
      ),
      tickets > 0 &&
        h(
          'div',
          { class: 'mz-ticket' },
          h('b', { text: T('ladder.ticket', { n: tickets }) }),
          h(
            'button',
            {
              class: 'btn small',
              type: 'button',
              disabled: ui.game.phase !== 'play' || ui.game.fx.lessons?.pending?.() ? '' : null,
              onClick: () => {
                if (!fx.useLessonTicket()) return;
                entry.close();
                showLessons(ui, true);
              },
            },
            T('ladder.ticketUse'),
          ),
        ),
    );
  };
  // 이 창에서 바로 도장 받기: 부스터 광고가 남아 있으면 그것으로
  const quick = adButton(ui, 'boost', {
    label: T('place.boost.title'),
    cls: 'wide',
    onReward: () => {
      ui.toast(T('toast.boost', { t: formatDuration(fx.boostLeft()) }), 'good');
      render();
    },
  });
  render();
  const off = ui.game.on('monetize:change', render);
  const entry = sheet(ui, { title: T('ladder.title'), desc: T('ladder.desc'), cls: 'mz-ladder-sheet', body: [head, list, extra, quick], onClose: off });
}

/** 받은 보상 알림. */
function celebrate(ui, r) {
  ui.audio.sfx('achievement');
  ui.haptics.fire('good');
  for (const key of r.made || []) ui.toast(T('ladder.made', { name: keyName(key) }), 'good');
  if (r.shinyNext) ui.toast(T('toast.shinyNext'), 'good');
  if (r.boostUntil) ui.toast(T('toast.boost', { t: formatDuration(ui.game.fx.monetize.boostLeft()) }), 'good');
}

// ───────── 오른쪽 버튼(부스터·도장) ─────────

registerHud({
  id: 'monetize-rail',
  order: 90,
  mount(ui, host) {
    if (!ui.monetize) return;
    const hud = host.parentElement || host;
    this.boostTime = h('small', { class: 'mz-rail-time' });
    this.boost = h(
      'button',
      { class: 'mz-rail-btn boost', type: 'button', 'aria-label': T('place.boost.title'), onClick: () => ui.started && !ui.modals.active && openBoost(ui) },
      icon('rocket', 24),
      this.boostTime,
    );
    this.stampCount = h('small', { class: 'mz-rail-time' });
    this.stampDot = h('i', { class: 'dot', hidden: '' });
    this.stamps = h(
      'button',
      { class: 'mz-rail-btn stamps', type: 'button', 'aria-label': T('ladder.title'), onClick: () => ui.started && !ui.modals.active && openLadder(ui) },
      icon('stamp', 24),
      this.stampCount,
      this.stampDot,
    );
    this.rail = h('div', { class: 'mz-rail' }, this.boost, this.stamps);
    hud.append(this.rail);
    this.t = 0;
  },
  update(ui, dt) {
    if (!this.rail) return;
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 0.5;
    const fx = ui.game.fx.monetize;
    const left = fx.boostLeft();
    this.boost.classList.toggle('on', left > 0);
    this.boostTime.textContent = left > 0 ? clock(left) : '×2';
    this.stampCount.textContent = String(fx.stamps());
    this.stampDot.hidden = fx.claimable() === 0;
    // 구름 은폐 대기 중에는 광고 표시(즉시 충전)
    const cloakAd = ui.cloakBtn?.dataset.state === 'wait' && fx.canWatch('cloak').ok;
    ui.cloakBtn?.classList.toggle('mz-can-ad', !!cloakAd);
  },
});

// ───────── 구름 즉시 충전 ─────────

/** 은폐 대기 중에 은폐 버튼을 누르면 부른다. 권할 게 없으면 false. */
export function openCloakOffer(ui) {
  const fx = ui.game.fx.monetize;
  if (!ui.monetize || !fx?.canWatch('cloak').ok || ui.modals.active) return false;
  const b = adButton(ui, 'cloak', {
    label: T('place.cloak.title'),
    cls: 'primary wide',
    onReward: () => {
      entry.close();
      // 충전되자마자 바로 켠다
      if (ui.game.cloakReady) {
        ui.game.activateCloak();
        ui.haptics.fire('good');
      }
    },
  });
  if (!b) return false;
  const entry = sheet(ui, { title: T('place.cloak.title'), desc: T('place.cloak.desc'), cls: 'mz-cloak', body: [b] });
  return true;
}

// ───────── 보고서 연구비 ×3 ─────────

registerReportExtra({
  id: 'monetize-report',
  order: 5,
  render(ui, report) {
    const fx = ui.game.fx.monetize;
    if (!fx || !(report.grant > 0)) return null;
    const extra = Math.round(report.grant * 2);
    const box = h('div', { class: 'mz-report' });
    const b = adButton(ui, 'report', {
      label: T('place.report.btn'),
      cls: 'wide',
      ctx: { report },
      onReward: (r) => {
        if (!r?.ok) return;
        box.replaceChildren(h('p', { class: 'mz-report-done' }, T('place.report.done', { n: formatInt(r.amount || extra) }), grantTag(`+${formatInt(r.amount || extra)}`)));
        ui.audio.sfx('coin');
      },
    });
    if (!b) return null;
    box.append(b);
    return box;
  },
});

// ───────── 본부 긴급 무마(변명 화면이 권하지 않았을 때) ─────────

registerReportStep({
  id: 'monetize-coverup',
  phase: 'before',
  order: 60,
  run(ui, report) {
    const game = ui.game;
    const fx = game.fx.monetize;
    if (ui._coverUpOffered === report.gen || !fx || !game.canCoverUp || !fx.canWatch('coverUp').ok) return undefined;
    if (report.ctx?.mission) return undefined; // 임무 실패는 미니게임 '한 번 더'가 맡는다
    return new Promise((resolve) => {
      let out = null;
      const b = adButton(ui, 'coverUp', {
        label: T('place.coverUp.btn'),
        cls: 'primary wide',
        onReward: (r) => {
          if (r?.ok) out = { excused: true };
          entry.close();
        },
      });
      if (!b) {
        resolve(undefined);
        return;
      }
      const entry = sheet(ui, {
        title: T('place.coverUp.title'),
        desc: T('place.coverUp.desc'),
        cls: 'mz-cover',
        body: [b, h('button', { class: 'btn ghost wide', type: 'button', onClick: () => entry.close() }, t('excuse.skip'))],
        onClose: () => resolve(out),
      });
    });
  },
});

// ───────── 본부 보급 풍선 ─────────

registerBind({
  id: 'monetize-supply',
  bind(ui) {
    const { world, game } = ui;
    if (!ui.monetize) return;
    world.on('supplySpawn', () => ui.audio.sfx('ready'));
    world.on('supplyTap', () => {
      if (ui.modals.active || !game.playing) return;
      const b = adButton(ui, 'supply', {
        label: T('ad.watch'),
        cls: 'primary wide',
        onReward: (r) => {
          entry.close();
          world.openSupply();
          if (r.kind === 'grant') ui.toast(T('supply.grant', { n: formatInt(r.amount) }), 'grant');
          else if (r.kind === 'fuel') ui.toast(T('supply.fuel', { n: r.amount }), 'good');
          else ui.toast(T('supply.shiny'), 'good');
          const su = world.supply;
          if (su) ui.scene.sparkle?.(su.x, su.y, 18, '#ffe066', 180);
        },
      });
      if (!b) {
        world.dismissSupply();
        return;
      }
      const entry = sheet(ui, {
        title: T('place.supply.title'),
        desc: T('place.supply.desc'),
        cls: 'mz-supply',
        body: [
          b,
          h(
            'button',
            {
              class: 'btn ghost wide',
              type: 'button',
              onClick: () => {
                world.dismissSupply();
                entry.close();
              },
            },
            T('place.supply.later'),
          ),
        ],
      });
    });
    // 도장 단계에 닿으면 한 줄 알림
    game.on('monetize:ladder', ({ at }) => ui.toast(`${T('ladder.title')} ${T('ladder.at', { n: at })}!`, 'grant'));
    // 업적으로 꾸미기를 얻으면 알림(상점 꾸미기 탭에서 바로 장착할 수 있다)
    game.on('monetize:unlock', ({ key }) => ui.toast(T('toast.unlock', { name: keyName(key) }), 'good'));
  },
});

// ───────── 광고·결제 중 멈춤 ─────────

registerBind({
  id: 'monetize-core',
  order: 1,
  bind(ui) {
    const m = ui.monetize;
    if (!m) return;
    let prevBusy = false;
    m.hooks.pause = () => {
      prevBusy = ui.game.busy;
      ui.game.busy = true;
      ui.audio.suspend();
    };
    m.hooks.resume = () => {
      ui.game.busy = prevBusy;
      ui.audio.resume();
      ui.save();
    };
  },
});
