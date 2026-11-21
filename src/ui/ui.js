// 화면 위의 UI 전체와 연출의 순서(들킴 → 보고서 → 다음 대원, 임무 출동 등)를 맡는다.
import { FORMS, SPECIMENS, SPECIMEN_BY_ID, TICKLE_POKES } from '../data/content.js';
import { formatSize, formatInt } from '../core/format.js';
import { t, tList, tPick, setLang, getLang, detectLang, LANGS } from '../i18n/index.js';
import { h, clear, icon, grantTag } from './dom.js';
import { Modals, showIntro, showReport, showMission, showEnding, showSettings } from './modals.js';
import { PANELS, renderPanel, panelSignature } from './panels.js';

const MISSION_SUSPENSE_MS = 2100;
const REPORT_DELAY_MS = 1250;
const RECALL_MS = 650;
const TOAST_MS = 2600;

function setText(el, value) {
  if (el._text !== value) {
    el.textContent = value;
    el._text = value;
  }
}

export class UI {
  /**
   * @param {object} o
   * @param {HTMLElement} o.stage
   * @param {import('../core/game.js').Game} o.game
   * @param {import('../core/world.js').World} o.world
   * @param {import('../render/scene.js').Scene} o.scene
   * @param {import('../audio/audio.js').GameAudio} o.audio
   * @param {import('../platform/device.js').Haptics} o.haptics
   * @param {boolean} o.storageOk
   * @param {() => void} o.save
   * @param {() => void} o.onEnter  플레이 화면에 들어설 때(출석·자리 비움 보상 확인)
   */
  constructor(o) {
    this.stage = o.stage;
    this.game = o.game;
    this.world = o.world;
    this.scene = o.scene;
    this.audio = o.audio;
    this.haptics = o.haptics;
    this.storageOk = o.storageOk;
    this.save = o.save;
    this.onEnter = o.onEnter;

    this.root = null;
    this.panel = null;
    this.panelSig = '';
    this.sizeShown = this.game.run.size;
    this.grantShown = this.game.state.grant;
    this.tickT = 0;
    this.bubbleT = 0;
    this.chatT = 9;
    this.coachT = 0;
    this.gazeKey = '';
    this.holdReport = false;
    this.pending = null;
    this.transitioning = false;
    this.started = false;
    this.timers = new Set();

    this._build();
    this._bindGame();
    this.scene.canvas.addEventListener('pointerdown', (e) => this._onPointer(e));
  }

  /** 화면이 꺼지거나 UI 를 다시 만들 때 취소되는 타이머. */
  _later(ms, fn) {
    const id = setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, ms);
    this.timers.add(id);
    return id;
  }

  // ───────── 만들기 ─────────

  _build() {
    this.root?.remove();
    const game = this.game;

    this.genText = h('span');
    this.clearText = h('span');
    this.clearMark = h('span', { class: 'clears', hidden: '' }, icon('star', 14), this.clearText);
    this.genPill = h('div', { class: 'pill gen' }, this.genText, this.clearMark);
    this.grantText = h('b');
    this.sizeNum = h('span', { class: 'num' });
    this.sizeUnit = h('span', { class: 'unit' });
    this.formLabel = h('span', { class: 'on-sky form-name' });
    this.nextLabel = h('span', { class: 'on-sky next' });
    this.barFill = h('i');
    this.hud = h(
      'header',
      { class: 'hud' },
      h(
        'div',
        { class: 'hud-row' },
        this.genPill,
        h(
          'div',
          { class: 'hud-right' },
          h('div', { class: 'pill grant-pill', 'aria-label': t('hud.grant') }, icon('grant', 16), this.grantText),
          h(
            'button',
            { class: 'icon-btn round', type: 'button', 'aria-label': t('hud.settings'), onClick: () => this._openSettings() },
            icon('settings', 20),
          ),
        ),
      ),
      h('div', { class: 'hud-size', 'aria-label': t('hud.size') }, this.sizeNum, this.sizeUnit),
      h('div', { class: 'hud-progress' }, this.formLabel, h('div', { class: 'bar' }, this.barFill), this.nextLabel),
    );

    this.gazeText = h('span');
    this.gaze = h('div', { class: 'gaze', role: 'status', hidden: '' }, icon('eye', 18), this.gazeText);
    this.bubble = h('div', { class: 'bubble', hidden: '' });
    this.coach = h('div', { class: 'coach', role: 'status', hidden: '' });
    this.toasts = h('div', { class: 'toasts', 'aria-live': 'polite' });

    // 아래쪽: 임무·은폐 버튼과 탭
    this.missionSub = h('small');
    this.missionBtn = h(
      'button',
      { class: 'action mission', type: 'button', onClick: () => this._onMissionButton() },
      icon('missions', 26),
      h('span', { class: 'action-text' }, h('b', { text: t('action.mission') }), this.missionSub),
    );
    this.cloakSub = h('small');
    this.cloakBtn = h(
      'button',
      { class: 'action cloak', type: 'button', onClick: () => this._onCloakButton() },
      icon('cloud', 26),
      h('span', { class: 'action-text' }, h('b', { text: t('action.cloak') }), this.cloakSub),
    );
    this.tabButtons = {};
    this.tabDots = {};
    const tabs = h(
      'nav',
      { class: 'tabs', 'aria-label': t('meta.title') },
      PANELS.map((name) => {
        const dot = h('i', { class: 'dot', hidden: '' });
        const b = h(
          'button',
          { class: 'tab', type: 'button', 'aria-pressed': 'false', onClick: () => this.togglePanel(name) },
          icon(name, 22),
          h('span', { text: t(`tabs.${name}`) }),
          dot,
        );
        this.tabButtons[name] = b;
        this.tabDots[name] = dot;
        return b;
      }),
    );
    this.dock = h('div', { class: 'dock' }, h('div', { class: 'actions' }, this.missionBtn, this.cloakBtn), tabs);

    this.sheetTitle = h('h2');
    this.sheetBody = h('div', { class: 'sheet-body' });
    this.sheet = h(
      'section',
      { class: 'sheet', 'aria-hidden': 'true' },
      h(
        'header',
        { class: 'sheet-head' },
        this.sheetTitle,
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('common.close'), onClick: () => this.closePanel() }, icon('close', 20)),
      ),
      this.sheetBody,
    );

    this.modalRoot = h('div', { class: 'modal-root', hidden: '' });
    this.modals = new Modals(this.modalRoot);
    this.titleHost = h('div', { class: 'title-host' });

    this.root = h('div', { class: 'ui' }, this.hud, this.gaze, this.bubble, this.toasts, this.coach, this.sheet, this.dock, this.titleHost, this.modalRoot);
    this.stage.append(this.root);
    document.title = t('meta.title');
    this.gazeKey = '';
    this.panelSig = '';
    this.sizeShown = game.run.size;
    this.grantShown = game.state.grant;
    this.update(0);
    this.measure();
  }

  /** 언어를 바꿨을 때처럼 글자가 전부 바뀌면 UI 를 새로 만든다. */
  rebuild() {
    const panel = this.panel;
    const title = this.titleCb;
    this.modals.closeAll();
    this.panel = null;
    this.stage.classList.remove('sheet-open');
    this._build();
    if (title) this.showTitle(title);
    else if (panel) this.openPanel(panel, true);
  }

  /** UI 가 차지한 위아래 높이를 재서 장면에 알려 준다. */
  measure() {
    if (!this.root) return;
    const hudH = this.hud.offsetHeight;
    const dockH = this.dock.offsetHeight;
    if (hudH <= 0 || dockH <= 0) return;
    // 시선 경고·알림·안내의 자리는 계기판과 조작부 높이에 맞춘다.
    this.stage.style.setProperty('--hud-h', `${hudH}px`);
    this.stage.style.setProperty('--dock-h', `${dockH}px`);
    this.scene.setInsets(hudH + 30, dockH);
  }

  // ───────── 첫 화면 ─────────

  showTitle(onStart) {
    this.titleCb = onStart;
    this.stage.classList.add('is-title');
    const fresh = this.game.state.gen === 1 && this.game.state.stats.specimens === 0 && !this.game.state.flags.intro;
    const lang = h(
      'div',
      { class: 'segment small', role: 'group' },
      LANGS.map((l) =>
        h(
          'button',
          {
            class: 'seg',
            type: 'button',
            'aria-pressed': String(getLang() === l.id),
            onClick: () => {
              if (getLang() !== l.id) this.changeLang(l.id);
            },
          },
          l.label,
        ),
      ),
    );
    const start = h(
      'button',
      {
        class: 'btn primary start',
        type: 'button',
        onClick: () => {
          this.audio.unlock();
          this.audio.sfx('click');
          this.titleCb = null;
          clear(this.titleHost);
          this.stage.classList.remove('is-title');
          onStart();
        },
      },
      t(fresh ? 'title.start' : 'title.resume'),
    );
    clear(this.titleHost).append(
      h(
        'div',
        { class: 'title' },
        h('div', { class: 'title-top' }, lang),
        h('h1', { class: 'logo', 'aria-label': t('meta.title') }, h('span', { class: 'logo-shh', text: getLang() === 'ko' ? '쉿!' : 'Shh!' }), h('span', { class: 'logo-ufo', text: 'UFO' })),
        h('p', { class: 'on-sky tagline', text: t('meta.tagline') }),
        h('div', { class: 'title-bottom' }, start, h('p', { class: 'on-sky rule', text: t('title.rule') })),
      ),
    );
  }

  /** 첫 화면을 지나 게임에 들어간다. */
  begin() {
    this.started = true;
    const enter = () => this._enter();
    if (!this.game.state.flags.intro) {
      showIntro(this, () => {
        this.game.state.flags.intro = true;
        this.save();
        enter();
      });
    } else enter();
  }

  _enter() {
    const game = this.game;
    game.busy = false;
    if (game.phase === 'discovered' && game.state.lastReport) {
      // 보고서를 보던 중에 앱이 꺼졌던 경우
      this.scene.ufo.mode = 'caught';
      showReport(this, { ...game.state.lastReport }, () => this._nextGeneration());
      return;
    }
    this.scene.ufoArrive();
    this.audio.sfx('arrive');
    this._runHints();
    this.onEnter?.();
  }

  // ───────── 매 프레임 ─────────

  update(dt) {
    const game = this.game;
    const run = game.run;
    const s = game.state;

    // 지름: 숫자가 부드럽게 따라 올라간다
    const diff = run.size - this.sizeShown;
    this.sizeShown = Math.abs(diff) < run.size * 2e-4 ? run.size : this.sizeShown + diff * Math.min(1, dt * 12);
    const [num, unit] = formatSize(this.sizeShown).split(' ');
    setText(this.sizeNum, num);
    setText(this.sizeUnit, unit);
    const gd = s.grant - this.grantShown;
    this.grantShown = Math.abs(gd) < 1 ? s.grant : this.grantShown + gd * Math.min(1, dt * 10);
    setText(this.grantText, formatInt(this.grantShown));

    const last = game.formIndex === FORMS.length - 1;
    setText(this.genText, t('hud.gen', { n: s.gen }));
    setText(this.clearText, String(s.clears));
    if (this.clearMark.hidden !== (s.clears === 0)) {
      this.clearMark.hidden = s.clears === 0;
      this.clearMark.setAttribute('aria-label', t('hud.clears', { n: s.clears }));
    }
    setText(this.formLabel, t(`form.${game.form.id}.name`));
    setText(this.nextLabel, t(last ? 'hud.toGoal' : 'hud.toNext', { size: formatSize(game.ceiling) }));
    const p = `${(game.progress * 100).toFixed(1)}%`;
    if (this.barFill._p !== p) {
      this.barFill.style.setProperty('--p', p);
      this.barFill._p = p;
    }

    // 임무 버튼(연료)
    const full = run.fuel >= 100;
    const need = Math.max(1, Math.ceil((100 - run.fuel) / (100 / game.specimensPerMission) - 1e-9));
    setText(this.missionSub, full ? t('action.fuelFull') : t('action.fuelNeed', { n: need }));
    this._progress(this.missionBtn, run.fuel / 100);
    this.missionBtn.classList.toggle('ready', full && game.phase === 'play');

    // 은폐 버튼
    let cloakState;
    if (run.cloakT > 0) {
      cloakState = 'on';
      setText(this.cloakSub, `${t('action.cloakOn')} ${run.cloakT.toFixed(1)}`);
      this._progress(this.cloakBtn, run.cloakT / game.cloakDuration);
    } else if (run.cloakCd > 0) {
      cloakState = 'wait';
      setText(this.cloakSub, t('action.cloakWait', { s: Math.ceil(run.cloakCd) }));
      this._progress(this.cloakBtn, 1 - run.cloakCd / game.cloakCooldown);
    } else {
      cloakState = 'ready';
      setText(this.cloakSub, t('action.cloakReady'));
      this._progress(this.cloakBtn, 1);
    }
    if (this.cloakBtn.dataset.state !== cloakState) this.cloakBtn.dataset.state = cloakState;

    this._updateGaze();

    // 말풍선과 혼잣말
    if (this.bubbleT > 0) {
      this.bubbleT -= dt;
      if (this.bubbleT <= 0) this.bubble.hidden = true;
    }
    if (this.started && game.playing && !this.modals.active && !this.panel) {
      this.chatT -= dt;
      if (this.chatT <= 0) {
        this.chatT = 11 + Math.random() * 9;
        if (this.bubble.hidden && !this.world.watchers.length && !this.world.noticing) this.say(tPick('chatter'), 3);
      }
    }
    if (this.coachT > 0) {
      this.coachT -= dt;
      if (this.coachT <= 0) this.hideCoach();
    }

    // 0.25초마다: 패널·알림 점 새로 고침
    this.tickT -= dt;
    if (this.tickT <= 0) {
      this.tickT = 0.25;
      this.refreshPanel();
      const can = game.affordable();
      this.tabDots.specimens.hidden = !can.specimens;
      this.tabDots.missions.hidden = !can.missions;
      this.tabDots.gadgets.hidden = !can.gadgets;
      if (can.specimens && this.started && game.playing && !this.modals.active) this.showCoach('shop');
    }
  }

  _progress(el, k) {
    const v = `${Math.round(Math.min(Math.max(k, 0), 1) * 100)}%`;
    if (el._p !== v) {
      el.style.setProperty('--p', v);
      el._p = v;
    }
  }

  _updateGaze() {
    const { game, world } = this;
    let key = '';
    let who = '';
    if (game.phase === 'play' && this.started) {
      const looking = world.watchers[0];
      const noticing = world.humans.find((hm) => hm.state === 'notice');
      if (looking) {
        key = game.cloaked ? 'cloaked' : 'look';
        who = looking.type;
      } else if (noticing) {
        key = 'notice';
        who = noticing.type;
      }
    }
    const id = `${key}:${who}`;
    if (id === this.gazeKey) return;
    this.gazeKey = id;
    this.gaze.hidden = !key;
    if (!key) return;
    this.gaze.dataset.state = key;
    this.gazeText.textContent = t(`gaze.${key}`, { who: t(`watcher.${who}`) });
  }

  // ───────── 작은 알림들 ─────────

  /** @param {string} text  @param {'info'|'good'|'warn'|'grant'} [kind]  @param {Node} [extra] 글 뒤에 붙일 요소 */
  toast(text, kind = 'info', extra = null) {
    const el = h('div', { class: `toast ${kind}` }, h('span', { text }), extra);
    this.toasts.append(el);
    while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
    setTimeout(() => el.remove(), TOAST_MS);
  }

  /** 조종사의 말풍선. */
  say(text, seconds = 2.4) {
    if (!text || !this.scene.ufoVisible) return;
    const a = this.scene.bubbleAnchor();
    this.bubble.textContent = text;
    this.bubble.style.left = `${a.x}px`;
    this.bubble.style.top = `${a.y}px`;
    this.bubble.hidden = false;
    this.bubbleT = seconds;
  }

  /** 처음 한 번만 보여 주는 안내. */
  showCoach(key) {
    if (!this.game.markTutorial(key)) return;
    this.coach.textContent = t(`tutorial.${key}`);
    this.coach.hidden = false;
    this.coach.dataset.key = key;
    this.coachT = 7;
  }

  hideCoach(key) {
    if (key && this.coach.dataset.key !== key) return;
    this.coach.hidden = true;
    this.coachT = 0;
  }

  _runHints() {
    const s = this.game.state;
    if (s.gen === 1 && s.stats.specimens === 0) this.showCoach('tap');
    else if (s.gen >= 2 && s.stats.cloaks === 0) this.showCoach('cloak');
  }

  // ───────── 패널 ─────────

  togglePanel(name) {
    if (this.panel === name) this.closePanel();
    else this.openPanel(name);
  }

  openPanel(name, silent = false) {
    if (!this.started || this.modals.active) return;
    this.panel = name;
    this.sheet.classList.add('open');
    this.sheet.setAttribute('aria-hidden', 'false');
    this.stage.classList.add('sheet-open');
    for (const [k, b] of Object.entries(this.tabButtons)) b.setAttribute('aria-pressed', String(k === name));
    this.sheetTitle.textContent = t(`panel.${name}.title`);
    this.sheetBody.scrollTop = 0;
    this.refreshPanel(true);
    this.hideCoach(name === 'specimens' ? 'shop' : name === 'missions' ? 'fuel' : undefined);
    if (!silent) this.audio.sfx('open');
  }

  closePanel() {
    if (!this.panel) return;
    this.panel = null;
    this.sheet.classList.remove('open');
    this.sheet.setAttribute('aria-hidden', 'true');
    this.stage.classList.remove('sheet-open');
    for (const b of Object.values(this.tabButtons)) b.setAttribute('aria-pressed', 'false');
  }

  refreshPanel(force = false) {
    if (!this.panel) return;
    const sig = panelSignature(this, this.panel);
    if (!force && sig === this.panelSig) return;
    this.panelSig = sig;
    const top = this.sheetBody.scrollTop;
    clear(this.sheetBody).append(...renderPanel(this, this.panel));
    this.sheetBody.scrollTop = top;
  }

  onPurchase(kind, id, name, level) {
    this.audio.sfx('buy');
    this.haptics.fire('good');
    this.toast(kind === 'gadget' ? t('toast.upgraded', { name, n: level }) : t('toast.unlocked', { name }), 'good');
    this.refreshPanel(true);
    this.save();
    if (kind === 'specimen' && SPECIMEN_BY_ID[id].cause) this.showCoach('risky');
  }

  _openSettings() {
    if (this.modals.active) return;
    this.audio.sfx('open');
    showSettings(this);
  }

  // ───────── 조작 ─────────

  _onPointer(e) {
    if (!this.started || this.modals.active || this.titleCb) return;
    if (this.panel) {
      this.closePanel();
      return;
    }
    const p = this.scene.toLocal(e);
    const hit = this.world.tap(p.x, p.y);
    if (!hit) this.scene.ring(p.x, p.y, '#ffffff', 14, 0.25);
  }

  _onMissionButton() {
    if (!this.started) return;
    this.openPanel('missions');
  }

  _onCloakButton() {
    const game = this.game;
    if (!this.started || !game.playing) return;
    if (!game.cloakReady) {
      this.audio.sfx('deny');
      return;
    }
    this.haptics.fire('good');
    game.activateCloak();
    this.hideCoach('cloak');
  }

  /** 임무 출동: 떠남 → 두근두근 → 결과. */
  launchMission(id) {
    const { game, scene, audio } = this;
    const can = game.canMission(id);
    if (!can.ok || game.busy || this.transitioning) {
      audio.sfx('deny');
      this.toast(t(can.reason === 'fuel' ? 'toast.fuelShort' : 'toast.missionBusy'), 'warn');
      return;
    }
    this.closePanel();
    this.hideCoach();
    this.bubble.hidden = true;
    game.busy = true;
    this.holdReport = true;
    this.pending = null;
    scene.ufoDepart();
    audio.sfx('launch');
    audio.setTension(0);
    const view = showMission(this, id);
    this._later(380, () => audio.sfx('suspense'));
    this._later(MISSION_SUSPENSE_MS, () => {
      const res = game.resolveMission(id);
      const flush = () => {
        this.holdReport = false;
        const p = this.pending;
        this.pending = null;
        return p;
      };
      if (!res.ok) {
        view.close();
        flush();
        game.busy = false;
        scene.ufoReturn();
        return;
      }
      if (!res.success) {
        view.close();
        const p = flush();
        if (p) this._presentDiscovery(p.report);
        return;
      }
      audio.sfx('success');
      this.haptics.fire('good');
      view.setSuccess(res, () => {
        scene.ufoReturn();
        audio.sfx('arrive');
        const p = flush();
        if (p?.type === 'report') this._later(500, () => this._presentDiscovery(p.report));
        else if (p?.type === 'ending') this._presentEnding(p.ending);
        else game.busy = false;
        this.save();
      });
    });
  }

  // ───────── 게임 이벤트 ─────────

  _bindGame() {
    const { game, world, audio, haptics } = this;

    world.on('collect', ({ specimen, result, auto }) => {
      if (result.report && result.gain === 0) return;
      if (auto) {
        audio.sfx('auto');
        return;
      }
      audio.sfx('collect', { tier: SPECIMENS.findIndex((sp) => sp.id === specimen.kind) });
      haptics.fire('tap');
      if (game.state.stats.specimens >= 3) this.hideCoach('tap');
      if (game.run.fuel >= 100 && game.phase === 'play') this.showCoach('fuel');
      if (Math.random() < 0.05 && this.bubble.hidden) this.say(tPick('cheer'), 1.3);
    });
    world.on('poke', (r) => {
      audio.sfx('poke');
      haptics.fire('tap');
      if (r.report) return;
      const lines = tList('pokes');
      const i = Math.min(lines.length - 1, Math.floor((r.count / TICKLE_POKES) * lines.length));
      this.say(lines[i], 1.3);
    });
    world.on('notice', () => {
      audio.sfx('notice');
      haptics.fire('warn');
      this.showCoach('gaze');
    });
    world.on('look', () => {
      if (game.cloaked) return;
      audio.sfx('gaze');
      audio.setTension(1);
      if (Math.random() < 0.6) this.say(tPick('hush'), 1.5);
    });
    world.on('lookEnd', () => {
      audio.setTension(0);
      if (game.phase === 'play' && !game.cloaked) audio.sfx('safe');
    });
    world.on('stage', ({ form }) => {
      this.toast(t('toast.stage', { name: t(`stage.${FORMS[form].stage}`) }), 'info');
    });

    game.on('formUp', ({ form }) => {
      audio.sfx('formUp');
      haptics.fire('good');
      this.toast(t('toast.formUp', { name: t(`form.${FORMS[form].id}.name`) }), 'good');
      this._later(500, () => this.say(t(`form.${FORMS[form].id}.desc`), 3.4));
    });
    game.on('achievement', ({ id, reward }) => {
      this.toast(t('toast.achievement', { name: t(`ach.${id}.name`) }), 'grant', grantTag(`+${formatInt(reward)}`));
      audio.sfx('achievement');
    });
    game.on('cloak', ({ on }) => {
      audio.sfx(on ? 'cloakOn' : 'cloakOff');
      if (on) audio.setTension(0);
      else if (world.watchers.length && game.phase === 'play') audio.setTension(1);
    });
    game.on('cloakReady', () => audio.sfx('ready'));
    game.on('discovered', (report) => {
      if (this.holdReport) this.pending = { type: 'report', report };
      else this._presentDiscovery(report);
    });
    game.on('ending', (ending) => {
      if (this.holdReport) this.pending = { type: 'ending', ending };
      else this._presentEnding(ending);
    });
    game.on('settings', ({ key, value }) => {
      if (key === 'sfx') audio.setSfx(value);
      else if (key === 'music') audio.setMusic(value);
      else if (key === 'haptics') haptics.set(value);
      this.save();
    });
  }

  /** 들켰다: 번쩍 → 잠깐 멈춤 → 사건 보고서. */
  _presentDiscovery(report) {
    const { audio } = this;
    this.transitioning = true;
    this.closePanel();
    this.hideCoach();
    this.bubble.hidden = true;
    audio.setTension(0);
    audio.sfx('spotted');
    this.haptics.fire('spotted');
    this.save();
    this._later(REPORT_DELAY_MS, () => {
      audio.sfx('stamp');
      this.haptics.fire('stamp');
      showReport(this, report, () => this._nextGeneration());
    });
  }

  /** 들킨 대원은 올라가고, 다음 대원이 내려온다. */
  _nextGeneration() {
    const { game, world, scene, audio } = this;
    scene.ufoRecall();
    audio.sfx('recall');
    this._later(RECALL_MS, () => {
      game.nextGeneration();
      world.reset();
      scene.layout();
      scene.ufoArrive();
      audio.sfx('arrive');
      this.sizeShown = game.run.size;
      this.transitioning = false;
      this.save();
      this._runHints();
    });
  }

  _presentEnding(ending) {
    const { game, world, scene, audio } = this;
    this.transitioning = true;
    this.closePanel();
    this.hideCoach();
    audio.setTension(0);
    audio.sfx('ending');
    this.haptics.fire('good');
    this.save();
    this._later(1500, () => {
      showEnding(this, ending, () => {
        game.finishEnding();
        world.reset();
        scene.layout();
        scene.ufoArrive();
        audio.sfx('arrive');
        this.sizeShown = game.run.size;
        this.transitioning = false;
        this.save();
      });
    });
  }

  // ───────── 설정에서 부르는 것들 ─────────

  changeLang(lang) {
    this.game.setLang(lang);
    setLang(lang);
    this.rebuild();
    this.save();
  }

  /** 불러온 저장본으로 통째로 바꾼다. */
  replaceSave(state) {
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
    this.holdReport = false;
    this.pending = null;
    this.transitioning = false;
    this.game.replaceState(state);
    setLang(state.lang || detectLang());
    this.audio.setSfx(state.settings.sfx);
    this.audio.setMusic(state.settings.music);
    this.haptics.set(state.settings.haptics);
    this.world.reset();
    this.scene.layout();
    this.scene.ufo.mode = 'hover';
    this.panel = null;
    this.stage.classList.remove('sheet-open');
    this.rebuild();
    this.save();
    this.begin();
  }

  resetSave() {
    this.game.reset();
    this.replaceSave(this.game.state);
  }
}
