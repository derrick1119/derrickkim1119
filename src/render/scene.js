// 장면 합성. World 와 Game 의 상태를 읽어 캔버스 한 장에 그린다.
import { FORMS, WATCHERS, SPECIMEN_BY_ID, AIRBORNE_STAGES } from '../data/content.js';
import { formatGain } from '../core/format.js';
import {
  C,
  P,
  TAU,
  clamp,
  lerp,
  easeIn,
  easeOut,
  easeBack,
  paint,
  circle,
  rrect,
  poly,
  glow,
  star,
  withAlpha,
  label,
} from './draw.js';
import { drawUfo, drawCloak, UFO_HALF_WIDTH, UFO_BELLY, UFO_TOP } from './ufo.js';
import { drawWatcher, headOffset, topOffset } from './people.js';
import { drawSpecimen, drawRiskBadge } from './specimens.js';
import { makeBackdrop, STAGE_THEME } from './backdrops.js';

/** 형태별 화면상 기체 너비(px). 화면이 좁으면 더 줄인다. */
const UFO_SCREEN_W = [70, 100, 116, 150, 156, 160, 190, 232];
/** 지상 표본의 중심이 땅에서 떠 있는 높이. */
const GROUND_LIFT = { chicken: 15, cow: 16 };
const MAX_DPR = 2;
/** 견인 빔 색: 직접 쏠 때 · 수집 드론 · 들킨 순간 */
const BEAM = P.glow;
const BEAM_AUTO = '#8dffc8';
const BEAM_CAUGHT = C.coral;
/** 들킨 뒤 지구인이 잠자리채를 들고 기체 쪽으로 달려오는 거리(기체까지 거리의 비율)와 시간 */
const CHASE_SHARE = 0.32;
const CHASE_TIME = 1.3;

export class Scene {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('../core/game.js').Game} game
   * @param {import('../core/world.js').World} world
   * @param {{reducedMotion?: boolean}} [opts]
   */
  constructor(canvas, game, world, { reducedMotion = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.world = world;
    this.reducedMotion = reducedMotion;
    this.w = 390;
    this.h = 760;
    this.dpr = 1;
    this.insets = { top: 112, bottom: 150 };
    this.t = 0;
    this.ufo = { mode: 'hover', modeT: 0, x: 195, y: 300, scale: 1, k: 1, rot: 0 };
    this.lit = 1;
    this.cloakAmt = 0;
    this.gazeAmt = 0;
    this.happyT = 0;
    this.wobbleT = 0;
    this.particles = [];
    this.popups = [];
    this.rings = [];
    this.flashA = 0;
    this.flashColor = C.white;
    this.shakeT = 0;
    this.shakeAmp = 0;
    this.backdrop = null;
    this.prevBackdrop = null;
    this.fadeT = 1;
    this.look = new Map(); // 지구인 id -> 고개를 든 정도(부드럽게 따라간다)
    this.foundT = 0; // 들킨 뒤 지난 시간
    this._bind();
  }

  _bind() {
    const { game, world } = this;
    world.on('collect', ({ specimen, result, auto }) => {
      if (result.report && result.gain === 0) return;
      specimen.popup = formatGain(result.gain);
      if (!auto) this.happyT = 0.55;
      this.ring(specimen.x, this._specimenY(specimen), auto ? BEAM_AUTO : BEAM, 26);
    });
    world.on('absorbed', (sp) => {
      const p = this.bellyPoint();
      if (sp.popup) this.popup(p.x + (Math.random() - 0.5) * 30, p.y + 8, sp.popup, sp.auto ? C.mint : C.lemon, sp.auto ? 13 : 16);
      this.sparkle(p.x, p.y, sp.auto ? 3 : 6, sp.auto ? BEAM_AUTO : P.glowSoft);
    });
    world.on('poke', () => {
      this.wobbleT = 0.5;
    });
    world.on('stage', () => this._swapBackdrop());
    game.on('formUp', () => {
      this.layout();
      const { x, y } = this.ufo;
      this.ring(x, y, C.lemon, 150, 0.8);
      this.ring(x, y, BEAM, 110, 0.6);
      this.sparkle(x, y, 26, C.lemon, 190);
      this.flash(C.lemonSoft, 0.4);
      this.happyT = 1.6;
      this.ufo.k = 0.82;
    });
    game.on('discovered', () => {
      this.flash(C.white, 0.95);
      this.shake(9, 0.45);
      this.ufo.mode = 'caught';
      this.ufo.modeT = 0;
      this.foundT = 0;
    });
    game.on('cloak', ({ on }) => {
      const { x, y } = this.ufo;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        this.particles.push({
          kind: 'puff',
          x: x + Math.cos(a) * 20,
          y: y + Math.sin(a) * 12,
          vx: Math.cos(a) * (on ? 50 : 90),
          vy: Math.sin(a) * (on ? 30 : 55),
          age: 0,
          life: 0.55,
          size: 9 + Math.random() * 6,
          color: C.cloud,
        });
      }
    });
    game.on('ending', () => {
      const { x, y } = this.ufo;
      this.sparkle(x, y, 40, C.lemon, 240);
      this.flash(C.lemonSoft, 0.6);
    });
    game.on('replaced', () => {
      this.layout();
      this._swapBackdrop(true);
    });
  }

  // ───────── 배치 ─────────

  /** 화면 위아래에 UI 가 차지하는 높이. */
  setInsets(top, bottom) {
    if (Math.abs(top - this.insets.top) < 1 && Math.abs(bottom - this.insets.bottom) < 1) return;
    this.insets = { top, bottom };
    this.layout();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(240, Math.round(rect.width));
    const h = Math.max(320, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const bw = Math.round(w * dpr);
    const bh = Math.round(h * dpr);
    if (w === this.w && h === this.h && dpr === this.dpr && this.backdrop && this.canvas.width === bw && this.canvas.height === bh) return;
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.canvas.width = bw;
    this.canvas.height = bh;
    this.layout();
  }

  /** 땅의 높이. 조작부 위로 땅이 한 띠 보이게 해서 지구인의 발밑과 안내 문구 자리를 만든다. */
  _groundY() {
    const band = Math.min(Math.max(this.h * 0.065, 30), 56);
    return Math.round(this.h - this.insets.bottom - band);
  }

  layout() {
    const { w, h, insets } = this;
    const form = this.game.formIndex;
    const groundY = this._groundY();
    const targetW = Math.min(w * 0.62, UFO_SCREEN_W[form]);
    this.ufoScale = targetW / (2 * UFO_HALF_WIDTH[form]);
    const ufoX = w / 2;
    const ufoY = Math.round(insets.top + (groundY - insets.top) * 0.37);
    const ufoR = Math.max(34, targetW * 0.42);
    this.groundY = groundY;
    this.home = { x: ufoX, y: ufoY, r: ufoR };
    this.world.setLayout({ w, h, top: insets.top, groundY, ufoX, ufoY, ufoR });
    const key = `${FORMS[form].stage}|${w}|${h}|${groundY}|${this.dpr}`;
    if (!this.backdrop || this.backdrop.key !== key) {
      const sameStage = this.backdrop && this.backdrop.stage === FORMS[form].stage;
      this._swapBackdrop(sameStage || !this.backdrop);
    }
  }

  _swapBackdrop(instant = false) {
    const stage = FORMS[this.game.formIndex].stage;
    const { w, h, dpr } = this;
    const groundY = this.groundY ?? this._groundY();
    const key = `${stage}|${w}|${h}|${groundY}|${dpr}`;
    if (this.backdrop && this.backdrop.key === key) return;
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const bctx = cv.getContext('2d');
    bctx.scale(dpr, dpr);
    const bd = makeBackdrop(stage, w, h, groundY);
    bd.paint(bctx);
    this.prevBackdrop = instant ? null : this.backdrop;
    this.fadeT = instant ? 1 : 0;
    this.backdrop = { key, stage, canvas: cv, live: bd.live };
    this.themeColor = STAGE_THEME[stage];
    // 휴대폰 상태 표시줄 색을 무대의 하늘색에 맞춘다
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', this.themeColor);
  }

  // ───────── 효과 ─────────

  popup(x, y, text, color = C.lemon, size = 16) {
    this.popups.push({ x, y, text, color, size, age: 0, life: 0.95 });
    if (this.popups.length > 24) this.popups.shift();
  }

  sparkle(x, y, n, color = C.lemon, speed = 110) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const v = speed * (0.35 + Math.random() * 0.65);
      this.particles.push({
        kind: 'spark',
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 20,
        age: 0,
        life: 0.5 + Math.random() * 0.4,
        size: 3 + Math.random() * 4,
        color,
      });
    }
    if (this.particles.length > 160) this.particles.splice(0, this.particles.length - 160);
  }

  ring(x, y, color, maxR = 30, life = 0.4) {
    this.rings.push({ x, y, color, maxR, life, age: 0 });
  }

  flash(color, alpha) {
    this.flashColor = color;
    this.flashA = this.reducedMotion ? Math.min(alpha, 0.25) : alpha;
  }

  shake(amp, time) {
    if (this.reducedMotion) return;
    this.shakeAmp = amp;
    this.shakeT = time;
  }

  /** 빔이 나오는 자리(화면 좌표). */
  bellyPoint() {
    return { x: this.ufo.x, y: this.ufo.y + UFO_BELLY[this.game.formIndex] * this.ufoScale };
  }

  /** 말풍선을 붙일 자리(기체 꼭대기, 화면 좌표). */
  bubbleAnchor() {
    return { x: this.home.x, y: this.home.y + UFO_TOP[this.game.formIndex] * this.ufoScale - 8 };
  }

  // ───────── 기체 연출 ─────────

  ufoArrive() {
    this.ufo.mode = 'arrive';
    this.ufo.modeT = 0;
  }
  ufoDepart() {
    this.ufo.mode = 'depart';
    this.ufo.modeT = 0;
  }
  ufoReturn() {
    this.ufo.mode = 'return';
    this.ufo.modeT = 0;
  }
  ufoRecall() {
    this.ufo.mode = 'recall';
    this.ufo.modeT = 0;
  }
  get ufoVisible() {
    return this.ufo.mode !== 'away' && this.ufo.mode !== 'gone';
  }

  _updateUfo(dt) {
    const u = this.ufo;
    const { x: hx, y: hy } = this.home;
    const bob = this.reducedMotion ? 0 : Math.sin(this.t * 1.7) * 5;
    u.modeT += dt;
    u.scale = 1;
    u.rot = Math.sin(this.t * 1.1) * 0.035;
    switch (u.mode) {
      case 'arrive': {
        const k = clamp(u.modeT / 1.05);
        u.x = hx;
        u.y = lerp(-110, hy, easeBack(k)) + bob * k;
        if (k >= 1) u.mode = 'hover';
        break;
      }
      case 'depart': {
        const k = easeIn(u.modeT / 0.55);
        u.x = lerp(hx, this.w + 90, k);
        u.y = lerp(hy, this.insets.top - 70, k);
        u.scale = lerp(1, 0.45, k);
        u.rot = k * 0.5;
        if (u.modeT >= 0.55) u.mode = 'away';
        break;
      }
      case 'return': {
        const k = easeOut(u.modeT / 0.7);
        u.x = lerp(-90, hx, k);
        u.y = lerp(this.insets.top - 70, hy, k) + bob * k;
        u.scale = lerp(0.45, 1, k);
        u.rot = (1 - k) * -0.5;
        if (u.modeT >= 0.7) u.mode = 'hover';
        break;
      }
      case 'recall': {
        const k = easeIn(u.modeT / 0.7);
        u.x = hx + Math.sin(u.modeT * 40) * 3 * (1 - k);
        u.y = lerp(hy, -160, k);
        u.scale = lerp(1, 0.7, k);
        if (u.modeT >= 0.7) u.mode = 'gone';
        break;
      }
      case 'caught':
        u.x = hx + (this.reducedMotion ? 0 : Math.sin(this.t * 60) * Math.max(0, 3 - u.modeT * 6));
        u.y = hy;
        u.rot = 0;
        break;
      case 'away':
      case 'gone':
        break;
      default:
        u.x = hx;
        u.y = hy + bob;
    }
    if (this.wobbleT > 0) {
      this.wobbleT -= dt;
      u.rot += Math.sin(this.wobbleT * 40) * 0.12 * (this.wobbleT / 0.5);
    }
    u.k = lerp(u.k, 1, Math.min(1, dt * 6)); // 승급 때 살짝 움츠렸다 커진다
  }

  _mood() {
    const { game, world } = this;
    if (game.phase === 'discovered') return 'shock';
    if (game.phase === 'ending') return 'happy';
    if (game.cloaked) return this.happyT > 0 ? 'happy' : 'idle';
    if (world.watchers.length) return 'hide';
    if (world.noticing) return 'alert';
    if (this.happyT > 0) return 'happy';
    return 'idle';
  }

  // ───────── 갱신 ─────────

  update(dt) {
    const { game, world } = this;
    this.t += dt;
    this._updateUfo(dt);
    this.happyT = Math.max(0, this.happyT - dt);
    const watched = world.watchers.length > 0 && !game.cloaked && game.phase === 'play';
    this.lit = lerp(this.lit, watched ? 0.08 : 1, Math.min(1, dt * 10));
    this.gazeAmt = lerp(this.gazeAmt, watched ? 1 : 0, Math.min(1, dt * 8));
    this.cloakAmt = lerp(this.cloakAmt, game.cloaked ? 1 : 0, Math.min(1, dt * 9));
    if (this.fadeT < 1) {
      this.fadeT = Math.min(1, this.fadeT + dt / 0.9);
      if (this.fadeT >= 1) this.prevBackdrop = null;
    }
    this.flashA = Math.max(0, this.flashA - dt * 2.4);
    this.foundT = this.game.phase === 'discovered' ? this.foundT + dt : 0;
    this.shakeT = Math.max(0, this.shakeT - dt);

    const found = game.phase === 'discovered';
    const alive = new Set();
    for (const h of world.humans) {
      alive.add(h.id);
      const target = found ? 1 : h.state === 'look' ? 1 : h.state === 'notice' ? 0.3 : 0;
      this.look.set(h.id, lerp(this.look.get(h.id) ?? 0, target, Math.min(1, dt * 12)));
    }
    for (const id of this.look.keys()) if (!alive.has(id)) this.look.delete(id);

    for (const p of this.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'spark') p.vy += 160 * dt;
      else {
        p.vx *= 1 - dt * 3;
        p.vy *= 1 - dt * 3;
      }
    }
    this.particles = this.particles.filter((p) => p.age < p.life);
    for (const p of this.popups) {
      p.age += dt;
      p.y -= 34 * dt;
    }
    this.popups = this.popups.filter((p) => p.age < p.life);
    for (const r of this.rings) r.age += dt;
    this.rings = this.rings.filter((r) => r.age < r.life);
  }

  // ───────── 그리기 ─────────

  _specimenY(sp) {
    return sp.mode === 'ground' ? sp.y - (GROUND_LIFT[sp.kind] || 14) : sp.y;
  }

  /** 지구인을 그릴 x. 들킨 뒤에는 잠자리채를 들고 기체 쪽으로 달려온다. */
  _humanX(h) {
    if (this.game.phase !== 'discovered' || this.reducedMotion) return h.x;
    const k = easeOut(clamp(this.foundT / CHASE_TIME)) * CHASE_SHARE;
    return h.x + (this.home.x - h.x) * k;
  }

  _humanBase(h) {
    if (h.type === 'balloonist') return this.groundY - 14 + Math.sin(this.t * 1.1 + h.phase) * 4;
    if (h.type === 'astronaut') return this.groundY - 50 + Math.sin(this.t * 0.9 + h.phase) * 7;
    return this.groundY + 1;
  }

  render() {
    const { ctx, w, h, dpr, game, world, t } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!this.backdrop) return;
    ctx.save();
    if (this.shakeT > 0) {
      const k = this.shakeAmp * (this.shakeT / 0.45);
      ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
    }

    // 배경
    if (this.prevBackdrop && this.fadeT < 1) {
      ctx.drawImage(this.prevBackdrop.canvas, 0, 0, w, h);
      ctx.globalAlpha = this.fadeT;
      ctx.drawImage(this.backdrop.canvas, 0, 0, w, h);
      ctx.globalAlpha = 1;
    } else {
      ctx.drawImage(this.backdrop.canvas, 0, 0, w, h);
    }
    this.backdrop.live(ctx, t);

    const found = game.phase === 'discovered';
    const cloaked = game.cloaked;
    const belly = this.bellyPoint();
    const showUfo = this.ufoVisible;

    // 시선 원뿔
    for (const hmn of world.humans) {
      if (hmn.state !== 'look' && !(found && hmn.spotted)) continue;
      const s = WATCHERS[hmn.type].scale || 1;
      const ho = headOffset(hmn.type, s);
      const color = cloaked ? C.lilac : hmn.spotted ? C.coral : '#fff3a8';
      this._cone(ho.x + this._humanX(hmn), this._humanBase(hmn) + ho.y, color, cloaked ? 0.2 : hmn.spotted ? 0.5 : 0.42);
    }

    // 연줄
    for (const sp of world.specimens) {
      if (sp.kind !== 'kite' || sp.state === 'beam' || this.airborne) continue;
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y + 14);
      ctx.quadraticCurveTo(sp.x + sp.dir * 30, sp.y + 90, sp.ax + sp.dir * 90, this.groundY);
      ctx.lineWidth = 1;
      ctx.strokeStyle = withAlpha(P.ink, 0.3 * (sp.state === 'fade' ? sp.fade : 1));
      ctx.stroke();
    }

    // 견인 빔
    if (showUfo) {
      for (const sp of world.specimens) {
        if (sp.state === 'beam') {
          const k = easeIn(sp.bt);
          this._beam(belly, lerp(sp.bx, belly.x, k), lerp(this._beamStartY(sp), belly.y + 6, k), sp.auto ? BEAM_AUTO : BEAM, 1 - sp.bt * 0.4);
        } else if (sp.state === 'caught') {
          this._beam(belly, sp.x, this._specimenY(sp), BEAM_CAUGHT, 0.6 + 0.3 * Math.sin(t * 40));
        }
      }
    }

    // 하늘의 표본
    for (const sp of world.specimens) if (sp.mode !== 'ground') this._specimen(sp, belly, cloaked);

    // 기체
    if (showUfo) this._ufo();

    // 땅 위: 지상 표본과 지구인
    for (const sp of world.specimens) if (sp.mode === 'ground') this._specimen(sp, belly, cloaked);
    const waving = game.phase === 'ending' && game.state.flags.trueEnding;
    for (const hmn of world.humans) {
      const cfg = WATCHERS[hmn.type];
      const s = cfg.scale || 1;
      const look = this.look.get(hmn.id) ?? 0;
      const hx = this._humanX(hmn);
      const facing = look > 0.2 || found ? (this.home.x >= hx ? 1 : -1) : hmn.dir;
      const base = this._humanBase(hmn);
      ctx.save();
      ctx.translate(hx, base);
      ctx.scale(s, s);
      drawWatcher(ctx, hmn.type, {
        t: t + hmn.phase,
        dir: facing,
        walk: (hmn.state === 'walk' && game.playing) || (found && this.foundT < CHASE_TIME) ? 1 : 0,
        look: waving ? 1 : look,
        shock: found,
        wave: waving,
      });
      ctx.restore();
      const top = base + topOffset(hmn.type, s);
      if (found) this._bubble(hx, top, 'bang', t + hmn.phase);
      else if (hmn.state === 'notice') this._bubble(hx, top, 'ask', t);
      else if (hmn.state === 'look') this._bubble(hx, top, cloaked ? 'blind' : 'eye', t);
    }

    // 효과
    for (const r of this.rings) {
      const k = r.age / r.life;
      circle(ctx, r.x, r.y, r.maxR * easeOut(k));
      ctx.lineWidth = 3 * (1 - k) + 0.5;
      ctx.strokeStyle = withAlpha(r.color, 1 - k);
      ctx.stroke();
    }
    for (const p of this.particles) {
      const k = p.age / p.life;
      if (p.kind === 'spark') {
        ctx.fillStyle = withAlpha(p.color, 1 - k);
        star(ctx, p.x, p.y, p.size * (1 - k * 0.5), p.size * 0.3, 4, p.age * 6);
        ctx.fill();
      } else {
        circle(ctx, p.x, p.y, p.size * (1 + k));
        ctx.fillStyle = withAlpha(p.color, 0.8 * (1 - k));
        ctx.fill();
      }
    }
    for (const p of this.popups) {
      const k = p.age / p.life;
      ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.4 : 1;
      label(ctx, p.text, p.x, p.y, { size: p.size * pop, fill: p.color });
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // 화면 전체 효과
    if (this.gazeAmt > 0.01) {
      const g = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.35, w / 2, h * 0.45, Math.max(w, h) * 0.75);
      g.addColorStop(0, withAlpha(C.coral, 0));
      g.addColorStop(1, withAlpha(C.coral, 0.26 * this.gazeAmt));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    if (this.flashA > 0.01) {
      ctx.fillStyle = withAlpha(this.flashColor, Math.min(1, this.flashA));
      ctx.fillRect(0, 0, w, h);
    }
  }

  _beamStartY(sp) {
    return sp.mode === 'ground' ? sp.by - (GROUND_LIFT[sp.kind] || 14) : sp.by;
  }

  _ufo() {
    const { ctx, game, t } = this;
    const u = this.ufo;
    const form = game.formIndex;
    const beaming = this.world.specimens.some((sp) => sp.state === 'beam' || sp.state === 'caught');
    const s = this.ufoScale * u.scale * u.k;
    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.rotate(u.rot);
    ctx.scale(s, s);
    if (this.cloakAmt > 0.02) ctx.globalAlpha = 1 - this.cloakAmt * 0.55;
    drawUfo(ctx, { form, t, mood: this._mood(), lit: this.lit, beam: beaming ? 1 : 0 });
    ctx.globalAlpha = 1;
    if (this.cloakAmt > 0.02) drawCloak(ctx, form, t, this.cloakAmt);
    ctx.restore();
  }

  _specimen(sp, belly, cloaked) {
    const { ctx, t, game } = this;
    let x = sp.x;
    let y = this._specimenY(sp);
    let scale = 1.12;
    let alpha = 1;
    let rot = 0;
    if (sp.state === 'beam') {
      const k = easeIn(sp.bt);
      x = lerp(sp.bx, belly.x, k);
      y = lerp(this._beamStartY(sp), belly.y + 6, k);
      scale *= 1 - 0.65 * k;
      rot = k * 0.9 * sp.dir;
    } else if (sp.state === 'fade') {
      alpha = clamp(sp.fade);
    } else if (sp.state === 'caught') {
      x += Math.sin(t * 50) * 1.5;
    }
    if (sp.age < 0.25 && sp.state === 'live') scale *= easeBack(sp.age / 0.25);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    drawSpecimen(ctx, sp.kind, t + sp.phase, sp.dir);
    ctx.restore();
    if (sp.state === 'live' && !cloaked) {
      const def = SPECIMEN_BY_ID[sp.kind];
      if (def.cause && game.chance(def.cause) >= 0.01) drawRiskBadge(ctx, x + 15, y - 17, t + sp.phase);
    }
  }

  /** 기체 배에서 (x, y) 로 뻗는 빛기둥. */
  _beam(from, x, y, color, strength) {
    const { ctx } = this;
    const dx = x - from.x;
    const dy = y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const near = 5;
    const far = 20;
    const g = ctx.createLinearGradient(from.x, from.y, x, y);
    g.addColorStop(0, withAlpha(color, 0.75 * strength));
    g.addColorStop(1, withAlpha(color, 0.22 * strength));
    poly(ctx, [
      [from.x + nx * near, from.y + ny * near],
      [x + nx * far, y + ny * far],
      [x - nx * far, y - ny * far],
      [from.x - nx * near, from.y - ny * near],
    ]);
    ctx.fillStyle = g;
    ctx.fill();
    glow(ctx, x, y, 26, color, 0.4 * strength);
  }

  /** 지구인의 시선: 머리에서 기체 쪽으로 퍼지는 빛. */
  _cone(hx, hy, color, alpha) {
    const { ctx } = this;
    const tx = this.home.x;
    const ty = this.home.y;
    const dx = tx - hx;
    const dy = ty - hy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const spread = Math.min(this.home.r * 0.95, 48);
    const g = ctx.createLinearGradient(hx, hy, tx, ty);
    g.addColorStop(0, withAlpha(color, alpha));
    g.addColorStop(1, withAlpha(color, alpha * 0.18));
    poly(ctx, [
      [hx, hy],
      [tx + nx * spread, ty + ny * spread],
      [tx - nx * spread, ty - ny * spread],
    ]);
    ctx.fillStyle = g;
    ctx.fill();
  }

  /** 머리 위 말풍선: ask(?) · eye(보는 중) · blind(구름에 가려 못 봄) · bang(!) */
  _bubble(x, y, kind, t) {
    const { ctx } = this;
    const bounce = kind === 'bang' ? Math.abs(Math.sin(t * 9)) * 4 : Math.sin(t * 7) * 1.5;
    const cx = clamp(x, 22, this.w - 22);
    const cy = Math.max(this.insets.top + 16, y - 16 - bounce);
    const fill = kind === 'bang' ? C.coral : kind === 'blind' ? '#e6ebff' : C.white;
    poly(ctx, [[cx - 4, cy + 10], [cx + 4, cy + 10], [cx, cy + 17]]);
    paint(ctx, fill, 2.2);
    rrect(ctx, cx - 15, cy - 12, 30, 23, 9);
    paint(ctx, fill, 2.2);
    poly(ctx, [[cx - 3, cy + 9.5], [cx + 3, cy + 9.5], [cx, cy + 14]]);
    ctx.fillStyle = fill;
    ctx.fill();
    if (kind === 'ask') {
      label(ctx, '?', cx, cy + 0.5, { size: 17, fill: C.ink, lw: 0 });
    } else if (kind === 'bang') {
      label(ctx, '!', cx, cy + 0.5, { size: 18, fill: C.white, lw: 0 });
    } else {
      // 눈
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy);
      ctx.quadraticCurveTo(cx, cy - 9, cx + 10, cy);
      ctx.quadraticCurveTo(cx, cy + 9, cx - 10, cy);
      ctx.closePath();
      paint(ctx, kind === 'blind' ? '#e6ebff' : C.white, 2);
      if (kind === 'blind') {
        ctx.beginPath();
        ctx.moveTo(cx - 9, cy + 7);
        ctx.lineTo(cx + 9, cy - 7);
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = C.lilacDark;
        ctx.stroke();
      } else {
        circle(ctx, cx, cy, 3.6);
        ctx.fillStyle = C.coral;
        ctx.fill();
        circle(ctx, cx, cy, 1.5);
        ctx.fillStyle = C.ink;
        ctx.fill();
      }
    }
  }

  /** 포인터 이벤트 좌표를 장면 좌표로. */
  toLocal(evt) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  }

  get airborne() {
    return AIRBORNE_STAGES.has(FORMS[this.game.formIndex].stage);
  }
}
