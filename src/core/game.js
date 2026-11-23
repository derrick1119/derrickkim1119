// 게임 규칙. 화면·소리·시간과 분리되어 있어 node 에서 그대로 돌릴 수 있다.
// 상태를 바꾸는 모든 길은 이 클래스의 메서드를 지난다.
import {
  CAUSE_BY_ID as CAUSE_BY_ID_LOCAL,
  FORMS,
  GOAL_SIZE,
  SPECIMENS,
  SPECIMEN_BY_ID,
  MISSIONS,
  MISSION_BY_ID,
  WATCHERS,
  CAUSES,
  GADGETS,
  GADGET_BY_ID,
  ACHIEVEMENTS,
  TICKLE_POKES,
  SPAWN_RANK_WEIGHTS,
} from '../data/content.js';
import {
  BAL,
  detectChance,
  missionRisk,
  startSizeFor,
  gainMultiplier,
  gadgetCost,
  formCeiling,
  cloakDuration,
  cloakCooldown,
  noticeTime,
  specimensPerMission,
  droneInterval,
  grantMultiplier,
  reportGrant,
  missionGrant,
  formGrant,
  offlineGrowth,
} from './balance.js';
import { Emitter } from './emitter.js';
import { defaultRun, defaultState } from './state.js';
import { features } from './features.js';
import './featureList.js';

const POKE_WINDOW = 2.5; // 이 시간 동안 안 건드리면 간지럼 횟수가 풀린다
const COMBO_WINDOW = 2.6; // 이 시간 안에 다음 표본을 모아야 콤보가 이어진다
const COMBO_STEP = 0.025; // 콤보 하나당 성장 배율
const COMBO_MAX_STEPS = 16; // 최대 1.4배
const EXCUSE_BASE = 0.35; // 변명이 통할 기본 확률

export class Game extends Emitter {
  /**
   * @param {object} state  sanitize() 를 거친 저장 상태
   * @param {{rng?: () => number, now?: () => number}} [deps]
   */
  constructor(state, { rng = Math.random, now = Date.now } = {}) {
    super();
    this.state = state;
    this.rng = rng;
    this.now = now;
    /** 임무 연출 중처럼, 저장되지는 않지만 조작을 막아야 하는 구간. */
    this.busy = false;
    this._pokes = 0;
    this._pokeT = 0;
    this._achT = 0;
    this._lastDiscovery = null;
    /** 기능 모듈이 돌려준 API(game.fx.traits 등). 기능은 상태를 항상 game.state.ext[id] 에서 새로 읽는다. */
    this.fx = {};
    for (const f of features()) {
      if (!f.install) continue;
      try {
        this.fx[f.id] = f.install(this) || {};
      } catch (err) {
        if (typeof console !== 'undefined') console.warn(`기능 ${f.id} 을(를) 켜지 못했습니다`, err);
        this.fx[f.id] = {};
      }
    }
  }

  /** 능력치 보정: 등록된 모든 기능의 modify 를 차례로 거친다(features.js 의 키 목록 참고). */
  mod(key, value, ctx = {}) {
    let v = value;
    for (const f of features()) {
      if (!f.modify) continue;
      const out = f.modify(key, v, ctx, this);
      if (typeof out === 'number' && Number.isFinite(out)) v = out;
    }
    return v;
  }

  /** 기능 모듈의 저장 슬롯. */
  ext(id) {
    if (!this.state.ext) this.state.ext = {};
    return this.state.ext[id];
  }

  // ───────── 읽기 ─────────

  get run() {
    return this.state.run;
  }
  get phase() {
    return this.state.phase;
  }
  get playing() {
    return this.state.phase === 'play' && !this.busy;
  }
  get formIndex() {
    return this.state.run.form;
  }
  get form() {
    return FORMS[this.state.run.form];
  }
  get formBase() {
    return FORMS[this.state.run.form].min;
  }
  get ceiling() {
    return formCeiling(this.state.run.form);
  }
  /** 현재 형태 안에서의 진행도 0..1 */
  get progress() {
    const base = this.formBase;
    return Math.min(Math.max((this.state.run.size - base) / (this.ceiling - base), 0), 1);
  }
  get uniqueCauses() {
    return Object.keys(this.state.seen).length;
  }
  get archiveComplete() {
    return this.uniqueCauses >= CAUSES.length;
  }
  get gainMult() {
    const s = this.state;
    return this.mod('gainMult', gainMultiplier({ gen: s.gen, clears: s.clears, beamLevel: s.gadgets.beam }));
  }
  /** 지금 콤보 수와 그에 따른 성장 배율. */
  get combo() {
    return this.state.run.combo || 0;
  }
  get comboMult() {
    return 1 + Math.min(Math.max(this.combo - 1, 0), COMBO_MAX_STEPS) * COMBO_STEP;
  }
  get cloaked() {
    return this.state.run.cloakT > 0;
  }
  get cloakReady() {
    return this.state.run.cloakT <= 0 && this.state.run.cloakCd <= 0;
  }
  get cloakDuration() {
    return this.mod('cloakDuration', cloakDuration(this.state.gadgets.cloak));
  }
  get cloakCooldown() {
    return Math.max(4, this.mod('cloakCooldown', cloakCooldown(this.state.gadgets.cooler)));
  }
  get noticeTime() {
    return Math.max(0.15, this.mod('noticeTime', noticeTime(this.state.gadgets.radar)));
  }
  get droneInterval() {
    return droneInterval(this.state.gadgets.drone);
  }
  get specimensPerMission() {
    return specimensPerMission(this.state.gadgets.tank);
  }
  get nextStartSize() {
    return Math.max(BAL.startSize, Math.min(this.mod('startSize', startSizeFor(this.uniqueCauses)), FORMS[6].min * 0.9));
  }
  /** 표본 하나가 채우는 연료(%). */
  get fuelPerSpecimen() {
    return Math.max(1, this.mod('fuelPerSpecimen', 100 / this.specimensPerMission));
  }

  chance(causeId) {
    return Math.min(1, Math.max(0, this.mod('detect', detectChance(causeId, this.state.resist[causeId] || 0), { cause: causeId })));
  }
  missionRisk(id) {
    return Math.min(1, Math.max(0, this.mod('missionRisk', missionRisk(id, this.state.resist), { id })));
  }
  specimenGain(id, auto = false) {
    return this.mod('specimenGain', SPECIMEN_BY_ID[id].gain * this.gainMult * (auto ? BAL.droneYield : 1), { id, auto });
  }
  missionGain(id) {
    return this.mod('missionGain', MISSION_BY_ID[id].gain * this.gainMult, { id });
  }
  /** 받을 연구비에 기능 보정을 적용한다. */
  grantFor(amount, source) {
    return Math.max(0, Math.round(this.mod('grant', amount, { source })));
  }
  isSpecimenUnlocked(id) {
    return !!this.state.unlocked.specimens[id];
  }
  isMissionUnlocked(id) {
    return !!this.state.unlocked.missions[id];
  }
  unlockedSpecimens() {
    return SPECIMENS.filter((s) => this.state.unlocked.specimens[s.id]);
  }
  /** 해금한 표본과 각각의 등장 가중치. 최근에 해금한 표본일수록 자주 나온다. */
  spawnTable() {
    const pool = this.unlockedSpecimens();
    return pool.map((spec, i) => ({
      spec,
      weight: spec.rarity * (SPAWN_RANK_WEIGHTS[pool.length - 1 - i] ?? 0.1),
    }));
  }
  /** 다음에 해금할 수 있는 표본(순서대로만 해금된다). */
  nextSpecimen() {
    return SPECIMENS.find((s) => !this.state.unlocked.specimens[s.id]) || null;
  }
  nextMission() {
    return MISSIONS.find((m) => !this.state.unlocked.missions[m.id]) || null;
  }
  gadgetCost(id) {
    const lv = this.state.gadgets[id];
    return lv >= GADGET_BY_ID[id].max ? null : gadgetCost(id, lv);
  }
  /** 살 수 있는 것이 하나라도 있는지(탭 알림 점에 쓴다). */
  affordable() {
    const g = this.state.grant;
    const sp = this.nextSpecimen();
    const ms = this.nextMission();
    return {
      specimens: !!sp && g >= sp.cost,
      missions: !!ms && g >= ms.cost,
      gadgets: GADGETS.some((gd) => {
        const c = this.gadgetCost(gd.id);
        return c !== null && g >= c;
      }),
    };
  }

  // ───────── 표본 ─────────

  /**
   * 표본 하나를 모은다.
   * @param {string} id
   * @param {{watchers?: string[], auto?: boolean, bonus?: number, perfect?: boolean, shiny?: boolean, specRisk?: number}} [ctx]
   *   watchers = 지금 기체를 보고 있는 것들(지구인 종류 또는 사건 id: 창문·망원경 등). 둘 이상이면 '동시 목격'.
   *   bonus = 성장 배율(반짝이·완벽 등), specRisk = 표본 자체 사건 확률 배율(드론 녹화등 등)
   * @returns {{ok: boolean, gain: number, formUps: object[], report: object|null, ending: object|null}}
   */
  collect(id, { watchers = [], auto = false, bonus = 1, perfect = false, shiny = false, specRisk = 1 } = {}) {
    const none = { ok: false, gain: 0, formUps: [], report: null, ending: null };
    const spec = SPECIMEN_BY_ID[id];
    if (!this.playing || !spec || !this.state.unlocked.specimens[id]) return none;
    const s = this.state;

    // 수집 드론과 구름 은폐 중에는 들키지 않는다.
    if (!auto && !this.cloaked) {
      // 두 시선이 동시에 기체를 보면 '동시 목격' 이 먼저 걸린다
      if (watchers.length >= 2 && this.rng() < this.chance('viral')) {
        return { ...none, ok: true, report: this._discover('viral', { specimen: id, watcher: watchers[0] }) };
      }
      for (const w of watchers) {
        const cause = WATCHERS[w]?.cause || (CAUSE_BY_ID_LOCAL[w] ? w : null);
        if (cause && this.rng() < this.chance(cause)) {
          return { ...none, ok: true, report: this._discover(cause, { specimen: id, watcher: w }) };
        }
      }
      if (spec.cause && this.rng() < Math.min(1, this.chance(spec.cause) * specRisk)) {
        return { ...none, ok: true, report: this._discover(spec.cause, { specimen: id }) };
      }
    }

    let gain = this.specimenGain(id, auto) * bonus;
    s.stats.specimens++;
    s.stats.bySpecimen[id] = (s.stats.bySpecimen[id] || 0) + 1;
    if (!auto) {
      s.run.specimens++;
      s.run.fuel = Math.min(100, s.run.fuel + this.fuelPerSpecimen);
      if (s.run.fuel > 100 - 1e-6) s.run.fuel = 100; // 100/14 를 14번 더하면 99.999… 가 된다
      // 콤보: 제때 이어 모으면 성장 배율이 오른다
      s.run.combo = (s.run.combo || 0) + 1;
      s.run.comboT = this.mod('comboWindow', COMBO_WINDOW);
      s.stats.bestCombo = Math.max(s.stats.bestCombo || 0, s.run.combo);
      gain *= this.comboMult;
    }
    if (shiny) s.stats.shinies = (s.stats.shinies || 0) + 1;
    this.emit('collected', { id, gain, auto, combo: s.run.combo || 0, bonus, perfect, shiny });
    // 구름 은폐 중이거나 드론이 모은 것은 승급 셀카로도 들키지 않는다
    const grown = this._addSize(gain, !auto && !this.cloaked);
    this.emit('change');
    return { ok: true, gain, ...grown };
  }

  /**
   * 아슬아슬: 지구인이 이쪽을 보기 직전에 표본을 낚아챘다. 방금 얻은 만큼을 한 번 더 주고 콤보를 2 올린다.
   * @param {number} lastGain 직전 수집의 성장량
   */
  nearMiss(lastGain) {
    if (!this.playing || !(lastGain > 0)) return null;
    const s = this.state;
    s.stats.nearMisses = (s.stats.nearMisses || 0) + 1;
    s.run.combo = (s.run.combo || 0) + 2;
    s.run.comboT = this.mod('comboWindow', COMBO_WINDOW);
    const grown = this._addSize(lastGain, false);
    this.emit('nearMiss', { gain: lastGain, combo: s.run.combo });
    this.emit('change');
    return { gain: lastGain, ...grown };
  }

  /** 기능 모듈·세계가 일으키는 사건(조건부 숨은 사건, 번개, 사진 플래시 등). */
  incident(causeId, ctx = {}) {
    if (!this.playing || !CAUSE_BY_ID_LOCAL[causeId]) return null;
    return this._discover(causeId, ctx);
  }

  /** 이번 대원이 변명을 쓸 수 있는지(대원마다 한 번). */
  get canExcuse() {
    return this.state.phase === 'discovered' && !!this._lastDiscovery && !this.state.run.excuseUsed;
  }

  /** 변명이 통할 확률. */
  excuseChance(excuseId) {
    const d = this._lastDiscovery;
    return Math.min(0.95, Math.max(0.05, this.mod('excuseChance', EXCUSE_BASE, { cause: d?.cause, excuse: excuseId })));
  }

  /**
   * 변명한다. 통하면 이번 발각을 없던 일로 하고 관측을 이어 간다(대원마다 한 번).
   * @returns {{ok: boolean, success: boolean}}
   */
  excuse(excuseId) {
    if (!this.canExcuse) return { ok: false, success: false };
    const s = this.state;
    const d = this._lastDiscovery;
    s.run.excuseUsed = true;
    const success = this.rng() < this.excuseChance(excuseId);
    if (!success) {
      this.emit('excuseFailed', { cause: d.cause, excuse: excuseId });
      this.emit('change');
      return { ok: true, success: false };
    }
    if (d.isNew) delete s.seen[d.cause];
    if (d.resist > 0) s.resist[d.cause] = d.resist;
    else delete s.resist[d.cause];
    s.grant = Math.max(0, s.grant - d.grant);
    s.stats.discoveries = Math.max(0, s.stats.discoveries - 1);
    s.stats.excuses = (s.stats.excuses || 0) + 1;
    s.phase = 'play';
    s.lastReport = null;
    s.run.combo = 0;
    this._lastDiscovery = null;
    this.emit('excused', { cause: d.cause, excuse: excuseId });
    this.emit('change');
    return { ok: true, success: true };
  }

  /** 기체를 건드린다. 너무 자주 건드리면 간지럼 사건. */
  poke() {
    if (!this.playing) return { count: 0, report: null };
    this._pokes++;
    this._pokeT = POKE_WINDOW;
    if (this._pokes < TICKLE_POKES) return { count: this._pokes, report: null };
    this._pokes = 0;
    if (this.rng() < this.chance('tickle')) return { count: TICKLE_POKES, report: this._discover('tickle', {}) };
    return { count: TICKLE_POKES, report: null };
  }

  // ───────── 은폐 ─────────

  activateCloak() {
    if (!this.playing || !this.cloakReady) return { ok: false, report: null };
    const s = this.state;
    s.stats.cloaks++;
    if (this.rng() < this.chance('sneeze')) return { ok: true, report: this._discover('sneeze', {}) };
    s.run.cloakT = this.cloakDuration;
    s.run.cloakCd = this.cloakCooldown;
    this._checkAchievements();
    this.emit('cloak', { on: true });
    this.emit('change');
    return { ok: true, report: null };
  }

  // ───────── 임무 ─────────

  canMission(id) {
    if (!MISSION_BY_ID[id]) return { ok: false, reason: 'unknown' };
    if (!this.state.unlocked.missions[id]) return { ok: false, reason: 'locked' };
    if (this.state.phase !== 'play') return { ok: false, reason: 'phase' };
    if (this.state.run.fuel < 100) return { ok: false, reason: 'fuel' };
    return { ok: true, reason: null };
  }

  /**
   * 임무 결과를 정한다(연료는 여기서 쓴다). 연출은 호출하는 쪽이 맡는다.
   * @param {{score?: number}} [o] 미니게임 점수 0..1(0.5 = 보통). 높을수록 덜 들키고 더 크게 자란다.
   */
  resolveMission(id, { score = 0.5 } = {}) {
    if (!this.canMission(id).ok) return { ok: false };
    const s = this.state;
    const m = MISSION_BY_ID[id];
    const index = MISSIONS.indexOf(m);
    const shownRisk = this.missionRisk(id);
    s.run.fuel = 0;
    const cause = m.causes[Math.min(m.causes.length - 1, Math.floor(this.rng() * m.causes.length))];
    const sc = Math.min(1, Math.max(0, score));
    const risk = this.mod('missionRisk', this.chance(cause), { id }) * (1.35 - 0.7 * sc);
    if (this.rng() < Math.min(0.98, risk)) {
      s.stats.missionsFail++;
      return { ok: true, success: false, cause, report: this._discover(cause, { mission: id }) };
    }
    const gain = this.missionGain(id) * (0.7 + 0.6 * sc);
    const grant = this.grantFor(missionGrant(index, s.gadgets.ai) * (0.75 + 0.5 * sc), 'mission');
    s.run.missions++;
    s.stats.missionsOk++;
    if (shownRisk >= 0.6) s.stats.daredevil = 1;
    s.grant += grant;
    const grown = this._addSize(gain, true);
    this._checkAchievements();
    this.emit('change');
    this.emit('missionOk', { id, score: sc, gain, grant });
    return { ok: true, success: true, gain, grant, score: sc, ...grown };
  }

  // ───────── 구매 ─────────

  buySpecimen(id) {
    const next = this.nextSpecimen();
    if (!next || next.id !== id || this.state.grant < next.cost) return false;
    this.state.grant -= next.cost;
    this.state.unlocked.specimens[id] = true;
    this.emit('purchase', { kind: 'specimen', id });
    this.emit('change');
    return true;
  }

  buyMission(id) {
    const next = this.nextMission();
    if (!next || next.id !== id || this.state.grant < next.cost) return false;
    this.state.grant -= next.cost;
    this.state.unlocked.missions[id] = true;
    this.emit('purchase', { kind: 'mission', id });
    this.emit('change');
    return true;
  }

  upgrade(id) {
    const cost = GADGET_BY_ID[id] ? this.gadgetCost(id) : null;
    if (cost === null || this.state.grant < cost) return false;
    this.state.grant -= cost;
    this.state.gadgets[id]++;
    this.emit('purchase', { kind: 'gadget', id });
    this.emit('change');
    return true;
  }

  // ───────── 세대 ─────────

  /** 사건 보고서를 닫고 다음 대원을 보낸다. */
  nextGeneration() {
    if (this.state.phase !== 'discovered') return false;
    this._startRun();
    return true;
  }

  /** 엔딩을 다 본 뒤 관측을 이어 간다. */
  finishEnding() {
    if (this.state.phase !== 'ending') return false;
    this._startRun();
    return true;
  }

  _startRun() {
    const s = this.state;
    s.gen++;
    s.run = defaultRun(this.nextStartSize);
    this._lastDiscovery = null;
    s.phase = 'play';
    s.lastReport = null;
    s.stats.bestForm = Math.max(s.stats.bestForm, s.run.form);
    s.stats.bestSize = Math.max(s.stats.bestSize, s.run.size);
    this._pokes = 0;
    this.busy = false;
    this._checkAchievements();
    this.emit('generation', { gen: s.gen });
    this.emit('change');
  }

  // ───────── 시간 ─────────

  tick(dt) {
    const s = this.state;
    if (!this.playing) return;
    s.run.time += dt;
    s.stats.playTime += dt;
    if (s.run.cloakT > 0) {
      s.run.cloakT = Math.max(0, s.run.cloakT - dt);
      if (s.run.cloakT === 0) this.emit('cloak', { on: false });
    } else if (s.run.cloakCd > 0) {
      s.run.cloakCd = Math.max(0, s.run.cloakCd - dt);
      if (s.run.cloakCd === 0) this.emit('cloakReady');
    }
    if (this._pokeT > 0) {
      this._pokeT -= dt;
      if (this._pokeT <= 0) this._pokes = 0;
    }
    if (s.run.comboT > 0) {
      s.run.comboT = Math.max(0, s.run.comboT - dt);
      if (s.run.comboT === 0 && s.run.combo > 0) {
        const combo = s.run.combo;
        s.run.combo = 0;
        this.emit('comboEnd', { combo });
      }
    }
    this.emit('tick', dt);
    this._achT += dt;
    if (this._achT >= 1) {
      this._achT = 0;
      this._checkAchievements();
    }
  }

  /** 자리를 비운 시간만큼 자동 관측 성장을 더한다. 얻은 것이 없으면 null. */
  applyOffline(seconds) {
    const s = this.state;
    const lv = s.gadgets.autopilot;
    if (s.phase !== 'play' || lv <= 0 || seconds < 60) return null;
    const res = offlineGrowth(s.run.size, seconds, lv, this.gainMult);
    if (res.gained <= 0) return null;
    const grown = this._addSize(res.gained, false);
    this.emit('change');
    return { gained: res.gained, seconds: res.seconds, formUps: grown.formUps };
  }

  /**
   * 출석 보급품. day = 'YYYY-MM-DD'(기기 현지 날짜).
   * @returns {{reward: number, streak: number} | null} 오늘 이미 받았으면 null
   */
  claimDaily(day) {
    const s = this.state;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || s.daily.last === day) return null;
    let consecutive = false;
    if (s.daily.last) {
      const gap = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${s.daily.last}T00:00:00Z`)) / 86400000);
      if (gap < 0) return null; // 시계를 되돌린 경우
      consecutive = gap === 1;
    }
    s.daily.streak = consecutive ? s.daily.streak + 1 : 1;
    s.daily.last = day;
    const reward = this.grantFor(
      BAL.dailyBase * Math.min(s.daily.streak, BAL.dailyStreakCap) * (1 + s.stats.bestForm) * grantMultiplier(s.gadgets.ai),
      'daily',
    );
    s.grant += reward;
    this.emit('change');
    return { reward, streak: s.daily.streak };
  }

  // ───────── 설정·저장 ─────────

  setSetting(key, value) {
    if (!(key in this.state.settings)) return;
    this.state.settings[key] = !!value;
    this.emit('settings', { key, value: !!value });
    this.emit('change');
  }

  setLang(lang) {
    this.state.lang = lang;
    this.emit('lang', { lang });
    this.emit('change');
  }

  markTutorial(key) {
    if (this.state.tutorial[key]) return false;
    this.state.tutorial[key] = true;
    return true;
  }

  /** 불러온 저장본이나 초기화로 상태를 통째로 바꾼다. */
  replaceState(state) {
    this.state = state;
    this.busy = false;
    this._pokes = 0;
    this.emit('replaced');
    this.emit('change');
  }

  reset() {
    const fresh = defaultState();
    fresh.lang = this.state.lang;
    fresh.settings = { ...this.state.settings };
    this.replaceState(fresh);
  }

  // ───────── 내부 ─────────

  /**
   * 지름을 더하고, 형태 변화·엔딩·승급 셀카 사건을 처리한다.
   * @param {boolean} live 직접 플레이 중의 성장인지(자리 비움 성장은 false: 셀카 사건이 없다)
   */
  _addSize(amount, live) {
    const s = this.state;
    const run = s.run;
    const out = { formUps: [], report: null, ending: null };
    run.size = Math.min(run.size + amount, GOAL_SIZE);
    s.stats.bestSize = Math.max(s.stats.bestSize, run.size);
    while (run.form < FORMS.length - 1 && run.size >= FORMS[run.form + 1].min) {
      run.form++;
      const grant = this.grantFor(formGrant(run.form, s.gadgets.ai), 'form');
      s.grant += grant;
      s.stats.bestForm = Math.max(s.stats.bestForm, run.form);
      out.formUps.push({ form: run.form, grant });
    }
    for (const up of out.formUps) this.emit('formUp', up);
    if (run.size >= GOAL_SIZE) {
      out.ending = this._complete();
      return out;
    }
    if (live && out.formUps.length && this.rng() < this.chance('selfie')) {
      out.report = this._discover('selfie', {});
    }
    return out;
  }

  _discover(causeId, ctx) {
    const s = this.state;
    const run = s.run;
    const before = this.chance(causeId);
    const isNew = !s.seen[causeId];
    const prevStart = this.nextStartSize;
    if (isNew) s.seen[causeId] = s.gen;
    s.resist[causeId] = (s.resist[causeId] || 0) + 1;
    const grant = this.grantFor(reportGrant({ formIndex: run.form, progress: this.progress, isNew, aiLevel: s.gadgets.ai }), 'report');
    // 변명이 통하면 되돌릴 수 있도록 바뀌기 전 값을 남긴다
    this._lastDiscovery = { cause: causeId, isNew, resist: (s.resist[causeId] || 1) - 1, grant };
    s.grant += grant;
    s.stats.discoveries++;
    s.stats.bestRunSpecimens = Math.max(s.stats.bestRunSpecimens, run.specimens);
    run.cloakT = 0;
    run.combo = 0;
    const report = {
      cause: causeId,
      isNew,
      grant,
      before,
      after: this.chance(causeId),
      size: run.size,
      form: run.form,
      specimens: run.specimens,
      missions: run.missions,
      gen: s.gen,
      prevStart,
      nextStart: this.nextStartSize,
    };
    s.phase = 'discovered';
    s.lastReport = report;
    this._checkAchievements();
    this.emit('discovered', { ...report, ctx });
    this.emit('change');
    return { ...report, ctx };
  }

  _complete() {
    const s = this.state;
    const first = !s.flags.ending;
    const isTrue = this.archiveComplete;
    const newTrue = isTrue && !s.flags.trueEnding;
    s.phase = 'ending';
    s.clears++;
    s.flags.ending = true;
    if (isTrue) s.flags.trueEnding = true;
    s.stats.bestRunSpecimens = Math.max(s.stats.bestRunSpecimens, s.run.specimens);
    const grant = this.grantFor(BAL.clearGrant * (first ? 2 : 1) * grantMultiplier(s.gadgets.ai), 'ending');
    s.grant += grant;
    const ending = { first, isTrue, newTrue, grant, clears: s.clears, gen: s.gen };
    this._checkAchievements();
    this.emit('ending', ending);
    this.emit('change');
    return ending;
  }

  _checkAchievements() {
    const s = this.state;
    for (const a of ACHIEVEMENTS) {
      if (s.ach[a.id]) continue;
      if (a.stat(s) >= a.goal) {
        s.ach[a.id] = Math.max(1, this.now());
        s.grant += a.reward;
        this.emit('achievement', { id: a.id, reward: a.reward });
      }
    }
  }
}
