// 3D 장면. 2D 장면(Scene)의 연출 로직(기체 움직임, 시선, 들킴 추격, 효과)을 그대로 물려받고,
// 세계(무대·기체·지구인·표본·빔)는 three.js 로 그린다. 숫자 팝업·말풍선·고리·반짝이는 위의 투명 2D 층에 그린다.
import { FORMS, WATCHERS, CAUSE_BY_ID } from '../data/content.js';
import { Scene } from '../render/scene.js';
import { C, TAU, clamp, lerp, easeIn, easeOut, easeBack, circle, star, withAlpha, label, rrect, FONT_BODY } from '../render/draw.js';
import { t as tr, tPick } from '../i18n/index.js';
import { THREE, PAL, canvasTexture, cloud3d } from './kit.js';
import { Engine, PX } from './engine.js';

export { webglAvailable } from './engine.js';
import { createUfo, UFO_TILT } from './ufo3d.js';
import { createWatcher, WATCHER_TYPES } from './people3d.js';
import { createSpecimen } from './specimens3d.js';
import { buildStage } from './stages.js';
import { renderIcon3d } from './studio.js';
import { setIconRenderer } from '../render/iconcache.js';
import { layers as layerDefs } from './layers.js';
import './layers/index.js';

/** 형태별 화면상 기체 너비(px). 2D 장면과 같다. */
const UFO_SCREEN_W = [70, 100, 116, 150, 156, 160, 190, 232];
/** 지상 표본(닭·소)의 중심이 땅에서 떠 있는 높이(px): 모델의 발 높이(0.24·0.25) × 1.12배 × 64px. */
const GROUND_LIFT = { chicken: 17, cow: 18 };
const SPECIMEN_SCALE = 1.12;
const CHASE_SHARE = 0.32;
const CHASE_TIME = 1.3;
const BEAM = PAL.glow;
const BEAM_AUTO = '#8dffc8';
const BEAM_CAUGHT = '#ff6b5e';
const CONE = '#fff3a8';
const CONE_SPOTTED = '#ff6b5e';
const CONE_CLOAKED = '#b79cff';
const CONE_SOURCE = '#cfe9ff';
/** 엄폐 구름 모양(가로 -1..1 에 맞춘 덩어리들) */
const COVER_BLOBS = [
  [-0.72, -0.05, 0, 0.36],
  [-0.38, 0.16, 0.05, 0.48],
  [0.05, 0.24, 0, 0.56],
  [0.45, 0.12, 0.05, 0.46],
  [0.78, -0.06, 0, 0.32],
  [-0.2, -0.16, 0.25, 0.42],
  [0.25, -0.14, 0.28, 0.44],
];
const SMOKE_BLOBS = [
  [0, -0.7, 0, 0.42],
  [0.12, -0.25, 0.05, 0.5],
  [-0.1, 0.2, 0, 0.55],
  [0.08, 0.62, 0.05, 0.5],
];
/** 아직 3D 모델이 없는 지구인은 비슷한 사람으로 그린다. */
const WATCHER_FALLBACK = { hunter: 'photographer' };
const MAX_DPR = 2;
/**
 * 자동 화질 단계: 프레임이 계속 밀리면 한 단계씩 내린다(올리지는 않는다).
 * dpr = 3D 캔버스 해상도 상한, shadows = 그림자
 */
const QUALITY = [
  { dpr: 2, shadows: true },
  { dpr: 1.5, shadows: true },
  { dpr: 1.2, shadows: true },
  { dpr: 1, shadows: false },
];
const SLOW_FRAME = 1 / 42; // 이보다 평균이 느리면 화질을 내린다
const QUALITY_WINDOW = 2.5; // 초

const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

let beamTex = null;
/** 빔·시선 원뿔용: 길이 방향으로 밝다가 끝에서 옅어지는 텍스처. */
function beamTexture() {
  if (beamTex) return beamTex;
  beamTex = canvasTexture(8, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0.15)');
    g.addColorStop(0.15, 'rgba(255,255,255,0.75)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  return beamTex;
}

let ringTex = null;
/** 견인 빔용: 가장자리가 밝은 빛 고리가 줄지어 있고(위로 흘러간다), 끝으로 갈수록 옅어진다. */
function beamRingTexture() {
  if (ringTex) return ringTex;
  ringTex = canvasTexture(64, 128, (ctx, w, h) => {
    // 가로: 가장자리가 밝은 유리관 느낌
    const gx = ctx.createLinearGradient(0, 0, w, 0);
    gx.addColorStop(0, 'rgba(255,255,255,0.95)');
    gx.addColorStop(0.18, 'rgba(255,255,255,0.45)');
    gx.addColorStop(0.5, 'rgba(255,255,255,0.3)');
    gx.addColorStop(0.82, 'rgba(255,255,255,0.45)');
    gx.addColorStop(1, 'rgba(255,255,255,0.95)');
    ctx.fillStyle = gx;
    ctx.fillRect(0, 0, w, h);
    // 세로: 빛 고리 네 줄
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const y = (i + 0.5) * (h / 4);
      const g = ctx.createLinearGradient(0, y - 10, 0, y + 10);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 10, w, 20);
    }
  });
  ringTex.wrapS = ringTex.wrapT = THREE.RepeatWrapping;
  ringTex.repeat.set(3, 1.6);
  return ringTex;
}

let fadeTex = null;
/** 견인 빔 양 끝을 부드럽게 지우는 투명도 그림(흐르지 않는다). 초록 채널을 쓴다. */
function beamFadeTexture() {
  if (fadeTex) return fadeTex;
  fadeTex = canvasTexture(4, 128, (ctx, w, h) => {
    // 캔버스 위 = 텍스처 v 1(넓은 끝, 표본 쪽)
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgb(0,0,0)');
    g.addColorStop(0.16, 'rgb(255,255,255)');
    g.addColorStop(0.8, 'rgb(220,220,220)');
    g.addColorStop(1, 'rgb(90,90,90)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, { srgb: false });
  return fadeTex;
}

/** 두 점을 잇는 원뿔(빔·시선). 위(y+) = 넓은 쪽. ring = 견인 빔(흐르는 빛 고리). */
function makeCone(ring = false) {
  const geo = new THREE.CylinderGeometry(1, 0.12, 1, 24, 1, true);
  geo.translate(0, 0.5, 0);
  const m = new THREE.MeshBasicMaterial({
    map: ring ? beamRingTexture() : beamTexture(),
    alphaMap: ring ? beamFadeTexture() : null,
    color: new THREE.Color(BEAM),
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const cone = new THREE.Mesh(geo, m);
  cone.renderOrder = 6;
  cone.frustumCulled = false;
  return cone;
}

/** cone 의 좁은 끝을 a, 넓은 끝(반지름 wideR)을 b 에 맞춘다. */
function placeCone(cone, a, b, wideR) {
  const dir = tmpV.subVectors(b, a);
  const len = Math.max(dir.length(), 0.001);
  cone.position.copy(a);
  cone.quaternion.setFromUnitVectors(UP, dir.multiplyScalar(1 / len));
  cone.scale.set(wideR, len, wideR);
}

export class Scene3D extends Scene {
  constructor(canvas, game, world, opts = {}) {
    super(canvas, game, world, opts);
    // 3D 캔버스는 2D 효과 층(canvas) 바로 아래에 깐다
    const gl = document.createElement('canvas');
    gl.className = 'gl';
    gl.setAttribute('aria-hidden', 'true');
    gl.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;';
    canvas.parentNode.insertBefore(gl, canvas);
    this.glCanvas = gl;
    this.engine = new Engine(gl);
    this.stageId = null;
    this.stageFade = 0;
    this.stageFadeColor = '#9fd0ff';
    this.ufo3d = null;
    this.ufoForm = -1;
    this.watchers = new Map(); // 지구인 id → { type, obj }
    this.watcherPool = new Map(); // type → [obj]
    this.specs = new Map(); // 표본 id → { kind, obj }
    this.specPool = new Map(); // kind → [obj]
    this.beams = [];
    this.cones = [];
    this.strings = [];
    this.cloak3d = cloud3d(
      [
        [-0.75, -0.05, 0.1, 0.42],
        [-0.35, 0.22, 0.05, 0.5],
        [0.15, 0.3, 0, 0.55],
        [0.6, 0.12, 0.05, 0.45],
        [0.9, -0.08, 0.1, 0.34],
        [-0.3, -0.2, 0.3, 0.45],
        [0.3, -0.18, 0.32, 0.48],
      ],
      { fog: false },
    );
    this.cloak3d.visible = false;
    this.engine.actors.add(this.cloak3d);
    this.t3 = 0;
    // 화면이 아주 촘촘한 기기(3배 등)는 1.75 배에서 시작한다
    this.quality = (window.devicePixelRatio || 1) > 2.5 ? 1 : 0;
    this.perf = { time: 0, frames: 0, skip: 1 };
    // UI 카드·보고서의 그림도 같은 3D 모델로 찍는다
    setIconRenderer(renderIcon3d);
    // 손맛: 꿀꺽(표본을 삼킬 때 찌그러졌다 튕김), 들킴 글자, 승급 빛줄기
    this.gulp = 0;
    this.burst = null; // { t, text }
    this.rays = 0;
    this.lookTarget = new THREE.Vector3();
    this.camTarget = new THREE.Vector3();
    this.coverObjs = new Map(); // 엄폐물 id → 3D 구름
    this.culprit = null; // 들킨 순간 당겨 보여 줄 범인
    this.quote = '';
    this.focus = { x: 0, y: 0, z: 1 };
    world.on('absorbed', (sp) => {
      this.gulp = sp.auto ? 0.5 : 1;
    });
    game.on('discovered', (report) => {
      this.burst = { t: 0, text: tr('report.burst') };
      this._pickCulprit(report);
    });
    game.on('excused', () => {
      this.burst = null;
      this.culprit = null;
    });
    game.on('formUp', () => {
      this.rays = 1.6;
    });
    game.on('generation', () => {
      this.burst = null;
    });
    game.on('replaced', () => {
      this.burst = null;
    });
    // 확장 층(날씨·반짝이·사진기 등)
    this.layers = [];
    for (const def of layerDefs()) {
      try {
        const layer = def.create(this);
        if (layer) this.layers.push({ id: def.id, ...layer });
      } catch (err) {
        console.warn(`3D 층 ${def.id}`, err);
      }
    }
    if (this.stageId) for (const l of this.layers) l.stage?.(this.stageId);
  }

  /** 확장 층의 함수를 부른다. 한 층이 실패해도 나머지는 그린다. */
  _layers(fn, arg) {
    for (const l of this.layers || []) {
      if (!l[fn]) continue;
      try {
        l[fn](arg);
      } catch (err) {
        if (!l._warned) console.warn(`3D 층 ${l.id}.${fn}`, err);
        l._warned = true;
      }
    }
  }

  /** 지금 화면(3D 그림)을 사진으로 찍는다. 앨범 등이 쓴다. @returns {string|null} JPEG data URL */
  capture(maxW = 540, quality = 0.86) {
    try {
      this._sync3d();
      this.engine.render();
      const src = this.glCanvas;
      const k = Math.min(1, maxW / src.width);
      const cv = document.createElement('canvas');
      cv.width = Math.round(src.width * k);
      cv.height = Math.round(src.height * k);
      const ctx = cv.getContext('2d');
      ctx.drawImage(src, 0, 0, cv.width, cv.height);
      return cv.toDataURL('image/jpeg', quality);
    } catch {
      return null;
    }
  }

  // ───────── 배치 ─────────

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(240, Math.round(rect.width));
    const h = Math.max(320, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const bw = Math.round(w * dpr);
    const bh = Math.round(h * dpr);
    if (w === this.w && h === this.h && dpr === this.dpr && this.stageId && this.canvas.width === bw && this.canvas.height === bh) return;
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.canvas.width = bw;
    this.canvas.height = bh;
    this.layout();
  }

  layout() {
    const { w, h, insets } = this;
    const form = this.game.formIndex;
    const groundY = this._groundY();
    const targetW = Math.min(w * 0.62, UFO_SCREEN_W[form]);
    this.ufoTargetW = targetW;
    const ufoX = w / 2;
    const ufoY = Math.round(insets.top + (groundY - insets.top) * 0.37);
    const ufoR = Math.max(34, targetW * 0.42);
    this.groundY = groundY;
    this.home = { x: ufoX, y: ufoY, r: ufoR };
    this.world.setLayout({ w, h, top: insets.top, groundY, ufoX, ufoY, ufoR });
    this.engine.layout({ w, h, dpr: this._glDpr(), groundY, insetTop: insets.top });
    this._ensureUfo();
    this._swapBackdrop(!this.stageId);
  }

  /** 3D 캔버스 해상도: 화면 배율과 화질 단계 중 작은 쪽. */
  _glDpr() {
    return Math.min(this.dpr, QUALITY[this.quality].dpr);
  }

  /** 프레임 시간을 재다가 계속 느리면 화질을 한 단계 내린다. */
  _watchPerf(dt) {
    const p = this.perf;
    // 첫 몇 초(무대 준비·셰이더 컴파일)와 큰 끊김(탭 전환 등)은 세지 않는다
    if (p.skip > 0) {
      p.skip -= dt;
      return;
    }
    if (dt > 0.09) return;
    p.time += dt;
    p.frames++;
    if (p.time < QUALITY_WINDOW) return;
    const avg = p.time / p.frames;
    p.time = 0;
    p.frames = 0;
    if (avg > SLOW_FRAME && this.quality < QUALITY.length - 1) {
      this.quality++;
      const q = QUALITY[this.quality];
      this.engine.setShadows(q.shadows);
      this.engine.layout({ w: this.w, h: this.h, dpr: this._glDpr(), groundY: this.groundY, insetTop: this.insets.top });
      p.skip = 1;
    }
  }

  _ensureUfo() {
    const form = this.game.formIndex;
    if (this.ufoForm === form && this.ufo3d) return;
    if (this.ufo3d) this.engine.actors.remove(this.ufo3d.root);
    this.ufo3d = createUfo(form);
    this.ufoForm = form;
    this.engine.actors.add(this.ufo3d.root);
    this.ufoScale = this.ufoTargetW / PX / (2 * this.ufo3d.halfWidth);
  }

  _swapBackdrop(instant = false) {
    const stage = FORMS[this.game.formIndex].stage;
    if (this.stageId === stage) return;
    const st = buildStage(stage, { w: this.w, h: this.h });
    this.engine.setStage(st);
    this.stageId = stage;
    this.themeColor = st.env?.sky?.top || '#3d6fd8';
    this.stageFadeColor = st.env?.sky?.horizon || '#9fd0ff';
    this.stageFade = instant ? 0 : 1;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', this.themeColor);
    this._layers('stage', stage);
  }

  /** 빔이 나오는 자리(화면 좌표). */
  bellyPoint() {
    const u = this.ufo;
    const s = this.ufoScale * u.scale * u.k;
    const by = this.ufo3d ? this.ufo3d.bellyY * Math.cos(UFO_TILT) * s * PX : 20;
    return { x: u.x, y: u.y - by };
  }

  /** 말풍선을 붙일 자리(기체 꼭대기, 화면 좌표). */
  bubbleAnchor() {
    const s = this.ufoScale || 1;
    const top = this.ufo3d ? this.ufo3d.topY * Math.cos(UFO_TILT) * s * PX : 30;
    return { x: this.home.x, y: this.home.y - top - 8 };
  }

  // ───────── 매 프레임 ─────────

  update(dt) {
    super.update(dt);
    this.t3 += dt;
    this._watchPerf(dt);
    this.gulp = Math.max(0, this.gulp - dt / 0.38);
    this.rays = Math.max(0, this.rays - dt);
    if (this.burst) this.burst.t += dt;
    if (this.stageFade > 0) this.stageFade = Math.max(0, this.stageFade - dt / 0.8);
    this.engine.stage?.update?.(this.t, dt);
    this._layers('update', dt);
  }

  render() {
    this._sync3d();
    this._updateFocus();
    let sx = 0;
    let sy = 0;
    if (this.shakeT > 0) {
      const k = this.shakeAmp * (this.shakeT / 0.45);
      sx = (Math.random() - 0.5) * k;
      sy = (Math.random() - 0.5) * k;
    }
    this.engine.setShake(sx, sy);
    this.engine.render();
    this._renderOverlay(sx, sy);
  }

  // ───────── 들킨 순간: 범인과 기체를 당겨 보여 주기 ─────────

  _pickCulprit(report) {
    const { world } = this;
    this.culprit = null;
    this.quote = '';
    const cause = CAUSE_BY_ID[report?.cause];
    if (!cause || cause.kind === 'mission' || !this.ufoVisible) return;
    const hs = world.humans.filter((h) => !h.leaving);
    let h = hs.find((x) => x.spotted) || (report.ctx?.watcher && hs.find((x) => x.type === report.ctx.watcher));
    const src = !h && world.sources.find((x) => x.spotted);
    if (src) {
      this.culprit = { source: src };
      this.quote = tPick(`quotes.${src.kind}`);
      return;
    }
    if (!h && report.cause !== 'lightning') {
      // 표본·특수 사건: 가장 가까운 사람이 알아챈다
      for (const x of hs) if (!h || Math.abs(x.x - this.ufo.x) < Math.abs(h.x - this.ufo.x)) h = x;
    }
    if (!h) {
      this.culprit = { none: true };
      return;
    }
    h.spotted = true;
    this.culprit = { human: h.id };
    this.quote = (h.type && tPick(`quotes.${h.type}`)) || tPick('quotes.generic');
  }

  /** 범인이 서 있는 화면 자리(머리 위). */
  _culpritPoint() {
    const c = this.culprit;
    if (!c) return null;
    if (c.source) return { x: c.source.ox, y: c.source.oy };
    if (c.human) {
      const h = this.world.humans.find((x) => x.id === c.human);
      if (!h) return null;
      const entry = this.watchers.get(h.id);
      const sc = WATCHERS[h.type]?.scale || 1;
      const topY = entry ? entry.obj.topY * sc : 1;
      return { x: this._humanX(h), y: this._humanBase(h) - topY * PX };
    }
    return null;
  }

  _updateFocus() {
    const { game, w, h } = this;
    let z = 1;
    let ox = 0;
    let oy = 0;
    if (game.phase === 'discovered' && this.culprit && !this.reducedMotion) {
      const T = this.foundT;
      const k = easeOut(clamp((T - 0.1) / 0.4)) * (1 - easeIn(clamp((T - 2.1) / 0.45)));
      if (k > 0.001) {
        const u = this.ufo;
        let x0 = u.x - 80;
        let x1 = u.x + 80;
        let y0 = u.y - 130;
        let y1 = u.y + 50;
        const c = this._culpritPoint();
        if (c) {
          x0 = Math.min(x0, c.x - 70);
          x1 = Math.max(x1, c.x + 70);
          y0 = Math.min(y0, c.y - 70);
          y1 = Math.max(y1, c.y + 110);
        }
        const zt = clamp(Math.min(w / (x1 - x0), h / (y1 - y0)), 1, 1.65);
        z = 1 + (zt - 1) * k;
        const vw = w / z;
        const vh = h / z;
        ox = clamp((x0 + x1) / 2 - vw / 2, 0, w - vw);
        oy = clamp((y0 + y1) / 2 - vh / 2, 0, h - vh);
      }
    }
    this.focus.x = ox;
    this.focus.y = oy;
    this.focus.z = z;
    this.engine.setFocus(ox, oy, z);
  }

  /** 화면 좌표 → 초점(당겨 보기)이 적용된 화면 좌표 */
  _fp(x, y) {
    const f = this.focus;
    return { x: (x - f.x) * f.z, y: (y - f.y) * f.z };
  }

  /** 화면 좌표(px) → 행동 평면 위 3D 점 */
  _w(x, y, out = new THREE.Vector3()) {
    return this.engine.toWorld(x, y, out);
  }

  _sync3d() {
    const { game, world, t } = this;
    const found = game.phase === 'discovered';
    const cloaked = game.cloaked;

    // 기체
    this._ensureUfo();
    const u = this.ufo;
    const ufo = this.ufo3d;
    const visible = this.ufoVisible;
    ufo.root.visible = visible;
    // 첫 화면에서는 기체를 크게 띄우고 피포가 카메라를 보며 반긴다
    const hero = this.canvas.parentNode?.classList?.contains('is-title');
    const s = this.ufoScale * u.scale * u.k * (hero ? 1.55 : 1);
    this._w(u.x, u.y + (hero ? 10 : 0), ufo.root.position);
    // 꿀꺽: 삼키는 순간 납작해졌다가 통통 튕긴다
    const g = this.gulp;
    const sq = g > 0 ? Math.sin((1 - g) * Math.PI * 3) * 0.16 * g : 0;
    ufo.root.scale.set(s * (1 + sq), s * (1 - sq), s * (1 + sq));
    ufo.root.rotation.set(UFO_TILT, 0, -u.rot);
    const beaming = world.specimens.some((sp) => sp.state === 'beam' || sp.state === 'caught');
    ufo.update({ t, mood: hero ? 'happy' : this._mood(), lit: this.lit, beam: beaming ? 1 : 0, look: this._lookTarget(hero) });
    // 은폐 구름
    const ca = this.cloakAmt;
    this.cloak3d.visible = visible && ca > 0.02;
    if (this.cloak3d.visible) {
      const cs = s * ufo.halfWidth * (0.55 + 0.6 * ca);
      this.cloak3d.position.copy(ufo.root.position);
      this.cloak3d.position.z += 0.25 * s * ufo.halfWidth;
      this.cloak3d.scale.setScalar(cs);
      this.cloak3d.rotation.z = Math.sin(t * 0.8) * 0.05;
    }
    const belly = this.bellyPoint();
    const bellyW = this._w(belly.x, belly.y, new THREE.Vector3());
    bellyW.z = 0.2 * s;

    // 표본
    const alive = new Set();
    for (const sp of world.specimens) {
      alive.add(sp.id);
      let entry = this.specs.get(sp.id);
      if (!entry) {
        const pool = this.specPool.get(sp.kind);
        const obj = pool && pool.length ? pool.pop() : createSpecimen(sp.kind);
        entry = { kind: sp.kind, obj };
        this.specs.set(sp.id, entry);
        this.engine.actors.add(obj.root);
      }
      const root = entry.obj.root;
      let x = sp.x;
      let y = this._specimenY(sp);
      let scale = SPECIMEN_SCALE;
      let spin = 0;
      if (sp.state === 'beam') {
        const k = easeIn(sp.bt);
        x = lerp(sp.bx, belly.x, k);
        y = lerp(this._beamStartY(sp), belly.y + 6, k);
        scale *= 1 - 0.7 * k;
        spin = k * 3 * sp.dir;
      } else if (sp.state === 'fade') {
        scale *= clamp(sp.fade);
      } else if (sp.state === 'caught') {
        x += Math.sin(t * 50) * 1.5;
      }
      if (sp.age < 0.25 && sp.state === 'live') scale *= easeBack(sp.age / 0.25);
      if (sp.mode === 'ground' && sp.state !== 'beam') y = this.groundY - (GROUND_LIFT[sp.kind] || 14);
      // 꾹 누르는 중: 소는 빔에 들려 조금씩 떠오르고 버둥거린다, 풍선은 살짝 눌린다
      if (sp.held && sp.state === 'live') {
        y -= sp.hold * (sp.kind === 'cow' ? 26 : 6);
        x += Math.sin(t * 38) * 1.4 * sp.hold;
        if (sp.kind === 'balloon') scale *= 1 - 0.08 * sp.hold;
      }
      this._w(x, y, root.position);
      root.scale.setScalar(Math.max(scale, 0.001));
      root.rotation.set(0, spin, 0);
      // 세 번째 인자: 표본 상태(held·hold·flee·rec·cut·shiny·state) — 모델이 버둥거림·녹화등 등을 그린다
      entry.obj.update((sp.flee > 0 ? t * 3 : t) + sp.phase, sp.dir, sp);
    }
    for (const [id, entry] of this.specs) {
      if (alive.has(id)) continue;
      this.engine.actors.remove(entry.obj.root);
      if (!this.specPool.has(entry.kind)) this.specPool.set(entry.kind, []);
      this.specPool.get(entry.kind).push(entry.obj);
      this.specs.delete(id);
    }

    // 지구인
    const waving = game.phase === 'ending' && game.state.flags.trueEnding;
    const wk = world.weather?.kind;
    const wet = wk === 'rain' || wk === 'storm' ? 1 : 0;
    const dark = wk === 'night' ? 1 : 0;
    const ufoW = ufo.root.position;
    const seen = new Set();
    for (const hmn of world.humans) {
      seen.add(hmn.id);
      let entry = this.watchers.get(hmn.id);
      if (!entry) {
        const pool = this.watcherPool.get(hmn.type);
        const model = WATCHER_TYPES.includes(hmn.type) ? hmn.type : WATCHER_FALLBACK[hmn.type] || 'walker';
        const obj = pool && pool.length ? pool.pop() : createWatcher(model);
        entry = { type: hmn.type, obj };
        this.watchers.set(hmn.id, entry);
        this.engine.actors.add(obj.root);
      }
      const scale = WATCHERS[hmn.type].scale || 1;
      const look = this.look.get(hmn.id) ?? 0;
      const hx = this._humanX(hmn);
      const facing = look > 0.2 || found ? (this.home.x >= hx ? 1 : -1) : hmn.dir;
      const root = entry.obj.root;
      this._w(hx, this._humanBase(hmn), root.position);
      root.scale.setScalar(scale);
      entry.obj.update({
        t: t + hmn.phase,
        dir: facing,
        walk: (hmn.state === 'walk' && game.playing) || (found && this.foundT < CHASE_TIME) ? 1 : 0,
        look: waving ? 1 : look,
        shock: found,
        wave: waving,
        target: ufoW,
        umbrella: wet,
        flashlight: dark,
      });
    }
    for (const [id, entry] of this.watchers) {
      if (seen.has(id)) continue;
      this.engine.actors.remove(entry.obj.root);
      if (!this.watcherPool.has(entry.type)) this.watcherPool.set(entry.type, []);
      this.watcherPool.get(entry.type).push(entry.obj);
      this.watchers.delete(id);
    }

    // 견인 빔
    let bi = 0;
    if (visible) {
      for (const sp of world.specimens) {
        let target = null;
        let color = BEAM;
        let strength = 1;
        if (sp.state === 'beam') {
          const k = easeIn(sp.bt);
          target = this._w(lerp(sp.bx, belly.x, k), lerp(this._beamStartY(sp), belly.y + 6, k), tmpV2);
          color = sp.auto ? BEAM_AUTO : BEAM;
          strength = 1 - sp.bt * 0.4;
        } else if (sp.state === 'caught') {
          target = this._w(sp.x, this._specimenY(sp), tmpV2);
          color = BEAM_CAUGHT;
          strength = 0.6 + 0.3 * Math.sin(t * 40);
        }
        if (!target) continue;
        const cone = this.beams[bi] || this._newCone(this.beams, true);
        bi++;
        cone.visible = true;
        // 좁은 끝 = 기체 배, 넓은 끝 = 표본
        placeCone(cone, bellyW, target, 0.32);
        cone.material.color.set(color);
        cone.material.opacity = 0.55 * strength;
      }
    }
    for (; bi < this.beams.length; bi++) this.beams[bi].visible = false;
    // 빛 고리가 표본 쪽에서 기체 쪽으로 흘러 올라간다
    if (ringTex) ringTex.offset.y = (t * 1.4) % 1;

    // 시선 원뿔: 머리 → 시선이 머무는 하늘(기체 높이). 넓은 끝의 반지름 = 시선 반폭.
    // 기체를 덮으면 빨갛게, 비켜 있으면 노랗게.
    let ci = 0;
    const laneY = this.home.y;
    for (const hmn of world.humans) {
      const spottedNow = found && hmn.spotted;
      if ((hmn.state !== 'look' && !spottedNow) || hmn.gx == null) continue;
      const entry = this.watchers.get(hmn.id);
      if (!entry) continue;
      const head = entry.obj.headWorld(new THREE.Vector3());
      const cone = this.cones[ci] || this._newCone(this.cones);
      ci++;
      cone.visible = true;
      const gx = spottedNow ? u.x : hmn.gx;
      placeCone(cone, head, this._w(gx, laneY, tmpV2), Math.max(hmn.gw / PX, 0.2));
      const hot = hmn.sees || spottedNow;
      cone.material.color.set(cloaked ? CONE_CLOAKED : hot ? CONE_SPOTTED : CONE);
      cone.material.opacity = cloaked ? 0.1 : hot ? 0.34 : 0.2;
    }
    // 무대 시선: 창문·천문대 돔·우주 정거장·손전등
    for (const src of world.sources) {
      if (src.phase !== 'on' && !(found && src.spotted)) continue;
      const cone = this.cones[ci] || this._newCone(this.cones);
      ci++;
      cone.visible = true;
      const from = this._w(src.ox, src.oy, new THREE.Vector3());
      from.z = src.kind === 'iss' ? -2 : -0.5;
      placeCone(cone, from, this._w(src.gx, laneY, tmpV2), Math.max(src.gw / PX, 0.15));
      const hot = src.sees || (found && src.spotted);
      cone.material.color.set(cloaked ? CONE_CLOAKED : hot ? CONE_SPOTTED : CONE_SOURCE);
      cone.material.opacity = cloaked ? 0.08 : hot ? 0.36 : src.kind === 'flashlight' ? 0.3 : 0.22;
    }
    for (; ci < this.cones.length; ci++) this.cones[ci].visible = false;

    // 엄폐물: 기체 앞(카메라 쪽)에 떠 있어 기체를 가린다
    const liveCovers = new Set();
    for (const c of world.covers) {
      liveCovers.add(c.id);
      let obj = this.coverObjs.get(c.id);
      if (!obj) {
        obj =
          c.kind === 'smoke'
            ? cloud3d(SMOKE_BLOBS, { color: '#f1ecf6', shadeColor: '#a59cbd', opacity: 0.88, fog: false })
            : cloud3d(COVER_BLOBS, { opacity: 0.93, fog: false });
        this.coverObjs.set(c.id, obj);
        this.engine.actors.add(obj);
      }
      this._w(c.x, c.y, obj.position);
      obj.position.z = 1.1;
      const k = 0.35 + 0.65 * easeOut(clamp(c.a));
      if (c.kind === 'smoke') obj.scale.set((c.rx / PX) * k, (c.ry / PX) * 0.9 * k, (c.rx / PX) * 0.6 * k);
      else obj.scale.set((c.rx / PX) * k, (c.ry / PX) * 1.7 * k, (c.rx / PX) * 0.45 * k);
      obj.rotation.z = Math.sin(t * 0.5 + c.id) * 0.03;
    }
    for (const [id, obj] of this.coverObjs) {
      if (liveCovers.has(id)) continue;
      this.engine.actors.remove(obj);
      this.coverObjs.delete(id);
    }

    // 연줄
    let si = 0;
    if (!this.airborne) {
      for (const sp of world.specimens) {
        if (sp.kind !== 'kite' || sp.state === 'beam' || sp.cut) continue;
        const entry = this.specs.get(sp.id);
        if (!entry) continue;
        const line = this.strings[si] || this._newString();
        si++;
        line.visible = true;
        const top = entry.obj.root.position;
        const pos = line.geometry.attributes.position;
        const end = this._w(sp.ax + sp.dir * 90, this.groundY, tmpV2);
        for (let i = 0; i <= 8; i++) {
          const k = i / 8;
          const sag = Math.sin(k * Math.PI) * 0.35;
          pos.setXYZ(i, lerp(top.x, end.x, k) + sag * sp.dir * 0.4, lerp(top.y - 0.22 * SPECIMEN_SCALE, end.y, k) - sag * 0.5, 0);
        }
        pos.needsUpdate = true;
        line.material.opacity = 0.5 * (sp.state === 'fade' ? sp.fade : 1);
      }
    }
    for (; si < this.strings.length; si++) this.strings[si].visible = false;
    this._layers('sync');
  }

  /** 피포가 눈으로 따라갈 곳: 하늘을 보는 지구인 → 끌어오는 표본 → 가장 가까운 표본 → 정면. */
  _lookTarget(hero) {
    const { world } = this;
    if (hero) return this.camTarget.copy(this.engine.camera.position);
    const watcher = world.humans.find((h) => h.state === 'look' || h.state === 'notice');
    if (watcher) {
      const entry = this.watchers.get(watcher.id);
      if (entry) return entry.obj.headWorld(this.lookTarget);
    }
    let best = null;
    let bestD = Infinity;
    for (const sp of world.specimens) {
      if (sp.state === 'beam') {
        best = sp;
        break;
      }
      if (sp.state !== 'live') continue;
      const d = Math.hypot(sp.x - this.home.x, sp.y - this.home.y);
      if (d < bestD) {
        bestD = d;
        best = sp;
      }
    }
    if (best) {
      const e = this.specs.get(best.id);
      if (e) return this.lookTarget.copy(e.obj.root.position);
    }
    return null;
  }

  _newCone(list, ring = false) {
    const cone = makeCone(ring);
    this.engine.actors.add(cone);
    list.push(cone);
    return cone;
  }

  _newString() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9 * 3), 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#3a3f66', transparent: true, opacity: 0.5 }));
    line.frustumCulled = false;
    this.engine.actors.add(line);
    this.strings.push(line);
    return line;
  }

  // ───────── 위 2D 층 ─────────

  _renderOverlay(sx, sy) {
    const { ctx, w, h, dpr, game, world, t } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const f = this.focus;
    ctx.setTransform(dpr * f.z, 0, 0, dpr * f.z, -f.x * dpr * f.z, -f.y * dpr * f.z);
    ctx.save();
    ctx.translate(sx, sy);
    this._drawPlayHints();
    this._drawBeamSparkles();
    const found = game.phase === 'discovered';
    const cloaked = game.cloaked;
    // 승급: 기체 뒤로 회전하는 빛줄기
    if (this.rays > 0 && this.ufoVisible) {
      const k = Math.min(1, this.rays / 0.6);
      const cx = this.ufo.x;
      const cy = this.ufo.y;
      const R = Math.max(w, h) * 0.6;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.6);
      const gr = ctx.createRadialGradient(0, 0, 10, 0, 0, R);
      gr.addColorStop(0, withAlpha('#fff6c8', 0.55 * k));
      gr.addColorStop(1, withAlpha('#fff6c8', 0));
      ctx.fillStyle = gr;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R, a, a + TAU / 28);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    // 머리 위 말풍선
    for (const hmn of world.humans) {
      const entry = this.watchers.get(hmn.id);
      const s = WATCHERS[hmn.type].scale || 1;
      const topY = entry ? entry.obj.topY * s : 1;
      const x = this._humanX(hmn);
      const top = this._humanBase(hmn) - topY * PX;
      if (found) this._bubble(x, top, 'bang', t + hmn.phase);
      else if (hmn.state === 'notice') this._bubble(x, top, 'ask', t);
      else if (hmn.state === 'look') this._bubble(x, top, cloaked ? 'blind' : 'eye', t);
    }
    // 고리·반짝이·숫자
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
    this._layers('overlay', ctx);
    this._drawQuote();
    ctx.restore();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 화면 전체 효과
    if (this.gazeAmt > 0.01) {
      const g = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.35, w / 2, h * 0.45, Math.max(w, h) * 0.75);
      g.addColorStop(0, withAlpha(C.coral, 0));
      g.addColorStop(1, withAlpha(C.coral, 0.26 * this.gazeAmt));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    if (this.stageFade > 0.01) {
      ctx.fillStyle = withAlpha(this.stageFadeColor, Math.min(1, this.stageFade));
      ctx.fillRect(0, 0, w, h);
    }
    if (this.flashA > 0.01) {
      ctx.fillStyle = withAlpha(this.flashColor, Math.min(1, this.flashA));
      ctx.fillRect(0, 0, w, h);
    }
    if (this.burst && game.phase === 'discovered') this._drawBurst(this.burst);
  }

  // ───────── 관측 손맛 표시(2D 덧그림) ─────────

  /** 시선 예고·화면 틀·의심 게이지·표본 다루기 표시. */
  _drawPlayHints() {
    const { ctx, world, game, t } = this;
    if (!this.ufoVisible) return;
    const laneY = this.home.y;
    const playing = game.phase === 'play';
    if (playing) {
      // 고개 들 준비: 시선이 머물 자리를 미리 보여 준다(점선 띠 + ? + 남은 시간)
      for (const h of world.humans) {
        if (h.state !== 'notice' || h.gx == null || h.leaving) continue;
        const gz = WATCHERS[h.type].gaze;
        const total = Math.max(0.2, game.noticeTime * (gz.notice || 1));
        const k = 1 - clamp(h.t / total);
        this._gazeMark(h.gx, laneY, h.gw, k, h.type === 'hunter' ? '#ff5a4e' : '#ffcf4a', '?', gz.kind === 'sweep' ? Math.sign(h.gv || 1) : 0);
      }
      for (const src of world.sources) {
        if (src.phase !== 'warn') continue;
        const k = 1 - clamp(src.t / src.warn);
        const gx = clamp(src.gx, 24, this.w - 24);
        this._gazeMark(gx, laneY, src.gw, k, '#ff9a3c', '!', src.vx ? Math.sign(src.vx) : 0);
      }
    }
    for (const src of world.sources) this._sourceIcon(src, src.phase === 'warn' ? 1 - clamp(src.t / src.warn) : 1);
    // 사진작가·방송인: 하늘에 화면 틀이 보인다
    for (const h of world.humans) {
      if (h.state !== 'look' || h.gx == null) continue;
      const kind = WATCHERS[h.type].gaze.kind;
      if (kind === 'frame' || kind === 'selfie') this._viewfinder(h, laneY, kind);
    }
    // 의심 게이지
    if (playing && world.suspicion > 0.01) {
      const u = this.ufo;
      const r = this.home.r;
      const x = u.x + r * 0.95;
      const y = u.y - r * 0.75 + (world.suspicion > 0.7 ? Math.sin(t * 40) * 1.5 : 0);
      ctx.save();
      circle(ctx, x, y, 16);
      ctx.fillStyle = 'rgba(31,35,80,0.88)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 16, -Math.PI / 2, -Math.PI / 2 + TAU * world.suspicion);
      ctx.lineWidth = 4;
      ctx.strokeStyle = world.suspicion > 0.66 ? '#ff4d5e' : '#ffb02e';
      ctx.lineCap = 'round';
      ctx.stroke();
      // 눈 모양
      ctx.beginPath();
      ctx.ellipse(x, y, 9, 5.5, 0, 0, TAU);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      circle(ctx, x, y, 3);
      ctx.fillStyle = '#1f2350';
      ctx.fill();
      ctx.restore();
    }
    // 표본 다루기
    for (const sp of world.specimens) {
      if (sp.state !== 'live') continue;
      let y = sp.mode === 'ground' ? this.groundY - (GROUND_LIFT[sp.kind] || 14) : this._specimenY(sp);
      const x = sp.x;
      if (sp.held) {
        y -= sp.hold * (sp.kind === 'cow' ? 26 : 6);
        const R = sp.kind === 'cow' ? 34 : 26;
        ctx.save();
        circle(ctx, x, y, R);
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(31,35,80,0.45)';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, R, -Math.PI / 2, -Math.PI / 2 + TAU * sp.hold);
        ctx.strokeStyle = sp.kind === 'cow' ? '#7ef0ff' : '#ffb3c7';
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
      }
      if (sp.kind === 'drone') {
        const bx = x + 18;
        const by = y - 20;
        ctx.save();
        rrect(ctx, bx - 4, by - 7, 34, 14, 7);
        ctx.fillStyle = 'rgba(20,22,45,0.75)';
        ctx.fill();
        circle(ctx, bx + 4, by, 3.6);
        ctx.fillStyle = sp.rec ? (Math.sin(t * 12) > -0.3 ? '#ff3b4e' : '#7a1b26') : '#56607e';
        ctx.fill();
        ctx.font = `700 9px ${FONT_BODY}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = sp.rec ? '#ffd3d8' : '#9aa3c2';
        ctx.fillText('REC', bx + 10, by + 0.5);
        ctx.restore();
      }
      if (sp.kind === 'meteor' && sp.age < 1.15) {
        const k = sp.age / 1.15;
        circle(ctx, x, y, 18 + 34 * (1 - k));
        ctx.lineWidth = 3;
        ctx.strokeStyle = withAlpha('#ffd23f', 0.9 * (1 - k * 0.6));
        ctx.stroke();
      }
    }
  }

  /** 견인 빔 속을 타고 올라가는 반짝이. */
  _drawBeamSparkles() {
    const { ctx, world, t } = this;
    if (!this.ufoVisible) return;
    const belly = this.bellyPoint();
    ctx.save();
    for (const sp of world.specimens) {
      if (sp.state !== 'beam') continue;
      const k0 = easeIn(sp.bt);
      const sx = lerp(sp.bx, belly.x, k0);
      const sy = lerp(this._beamStartY(sp), belly.y + 6, k0);
      for (let i = 0; i < 4; i++) {
        const k = (t * 1.9 + i / 4 + sp.phase) % 1;
        const x = lerp(sx, belly.x, k) + Math.sin(t * 9 + i * 2 + sp.phase) * 6 * (1 - k);
        const y = lerp(sy, belly.y, k);
        ctx.fillStyle = withAlpha(sp.auto ? '#c8ffe4' : '#ffffff', 0.85 * (1 - k * 0.7));
        star(ctx, x, y, 4.5 - k * 2, 1.4, 4, t * 4 + i);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /** 시선이 곧 머물 자리: 기체 높이의 점선 띠, 위에 ?·! 표시와 남은 시간 고리. */
  _gazeMark(x, y, gw, k, color, glyph, sweep) {
    const { ctx, t } = this;
    const ry = Math.max(10, gw * 0.3);
    const pulse = 0.65 + 0.35 * Math.sin(t * 14);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, gw, ry, 0, 0, TAU);
    ctx.fillStyle = withAlpha(color, 0.1 + 0.12 * k);
    ctx.fill();
    ctx.setLineDash([7, 6]);
    ctx.lineDashOffset = -t * 30;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = withAlpha(color, 0.55 + 0.4 * pulse);
    ctx.stroke();
    ctx.setLineDash([]);
    // 훑는 방향
    if (sweep) {
      const ax = x + sweep * (gw + 14);
      ctx.beginPath();
      ctx.moveTo(ax - sweep * 10, y - 8);
      ctx.lineTo(ax + sweep * 4, y);
      ctx.lineTo(ax - sweep * 10, y + 8);
      ctx.lineWidth = 3.5;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = withAlpha(color, 0.9);
      ctx.stroke();
    }
    // 표시와 남은 시간
    const by = y - ry - 18;
    circle(ctx, x, by, 13);
    ctx.fillStyle = '#1f2350';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, by, 13, -Math.PI / 2, -Math.PI / 2 + TAU * k);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = color;
    ctx.stroke();
    label(ctx, glyph, x, by + 1, { size: 16, fill: color, lw: 0 });
    ctx.restore();
  }

  /** 무대 시선이 나오는 곳: 불 켜지는 창문, 지나가는 정거장, 손전등. */
  _sourceIcon(src, k) {
    const { ctx, t } = this;
    const x = src.ox;
    const y = src.oy;
    ctx.save();
    if (src.kind === 'window') {
      const on = src.phase === 'on' ? 1 : Math.sin(t * 22) > 0 ? k : k * 0.3;
      const g = ctx.createRadialGradient(x, y, 2, x, y, 30);
      g.addColorStop(0, withAlpha('#ffe9a0', 0.6 * on));
      g.addColorStop(1, withAlpha('#ffe9a0', 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - 30, y - 30, 60, 60);
      rrect(ctx, x - 8, y - 10, 16, 20, 2);
      ctx.fillStyle = withAlpha('#ffe07a', 0.35 + 0.65 * on);
      ctx.fill();
      // 창가의 사람 그림자
      circle(ctx, x, y - 2, 3.4);
      ctx.fillStyle = withAlpha('#3a2d1a', 0.8 * on);
      ctx.fill();
    } else if (src.kind === 'iss') {
      const sx = src.phase === 'warn' ? clamp(src.gx, 18, this.w - 18) : x;
      ctx.translate(sx, y);
      ctx.globalAlpha = src.phase === 'warn' ? 0.5 + 0.5 * k : 1;
      ctx.fillStyle = '#cfd8f0';
      ctx.fillRect(-5, -4, 10, 8);
      ctx.fillStyle = '#3d5fbf';
      ctx.fillRect(-22, -6, 14, 12);
      ctx.fillRect(8, -6, 14, 12);
      ctx.fillStyle = '#ffe07a';
      ctx.fillRect(-2, -1.5, 4, 3);
    } else if (src.kind === 'flashlight') {
      circle(ctx, x, y, 5);
      ctx.fillStyle = withAlpha('#fff3b0', 0.4 + 0.6 * k);
      ctx.fill();
    }
    ctx.restore();
  }

  /** 사진작가의 뷰파인더(3·2·1 뒤 찰칵), 방송인의 셀카 화면(LIVE). */
  _viewfinder(h, laneY, kind) {
    const { ctx, t } = this;
    const x0 = h.gx - h.gw;
    const x1 = h.gx + h.gw;
    const hh = h.gw * 0.62;
    const y0 = laneY - hh;
    const y1 = laneY + hh;
    const c = 14;
    const col = h.sees ? '#ff5a4e' : '#ffffff';
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = withAlpha(col, 0.9);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const [x, y, dx, dy] of [
      [x0, y0, 1, 1],
      [x1, y0, -1, 1],
      [x0, y1, 1, -1],
      [x1, y1, -1, -1],
    ]) {
      ctx.moveTo(x, y + dy * c);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * c, y);
    }
    ctx.stroke();
    if (kind === 'frame') {
      const n = Math.max(1, Math.min(3, Math.ceil((h.t / Math.max(0.1, h.lookDur)) * 3)));
      label(ctx, String(n), h.gx, y0 - 16, { size: 24, fill: col, stroke: '#1f2350', lw: 6 });
    } else {
      rrect(ctx, x0 + 6, y0 + 6, 46, 16, 8);
      ctx.fillStyle = 'rgba(255,59,78,0.9)';
      ctx.fill();
      circle(ctx, x0 + 14, y0 + 14, 3);
      ctx.fillStyle = Math.sin(t * 8) > 0 ? '#ffffff' : '#ffb3bb';
      ctx.fill();
      ctx.font = `700 10px ${FONT_BODY}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('LIVE', x0 + 20, y0 + 14.5);
    }
    ctx.restore();
  }

  /** 들킨 순간 범인의 한마디 말풍선. */
  _drawQuote() {
    const { ctx, game } = this;
    if (game.phase !== 'discovered' || !this.quote || !this.culprit) return;
    const T = this.foundT;
    if (T < 0.3 || T > 2.5) return;
    const p = this._culpritPoint();
    if (!p) return;
    const pop = easeBack(clamp((T - 0.3) / 0.22));
    const fade = 1 - clamp((T - 2.25) / 0.25);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.font = `700 13px ${FONT_BODY}`;
    const tw = Math.min(ctx.measureText(this.quote).width, 210);
    const bw = tw + 22;
    const bh = 28;
    const f = this.focus;
    const minX = f.x + 8 + bw / 2;
    const maxX = f.x + this.w / f.z - 8 - bw / 2;
    const bx = clamp(p.x, minX, Math.max(minX, maxX));
    const by = Math.max(f.y + 12 + bh / 2, p.y - 30);
    ctx.translate(bx, by);
    ctx.scale(pop, pop);
    rrect(ctx, -bw / 2, -bh / 2, bw, bh, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1f2350';
    ctx.stroke();
    // 꼬리
    const tx = clamp(p.x - bx, -bw / 2 + 14, bw / 2 - 14);
    ctx.beginPath();
    ctx.moveTo(tx - 6, bh / 2 - 1);
    ctx.lineTo(tx, bh / 2 + 9);
    ctx.lineTo(tx + 6, bh / 2 - 1);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1f2350';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.quote, 0, 1, 210);
    ctx.restore();
  }

  /** 들킨 순간 기체 옆에 쾅 찍히는 "들켰다!" — 별 모양 폭발 위에 굵은 글자. */
  _drawBurst(b) {
    const { ctx, w, t } = this;
    const k = b.t;
    if (k > 1.6) return;
    const pop = k < 0.18 ? easeBack(k / 0.18) : 1;
    const fade = k > 1.25 ? 1 - (k - 1.25) / 0.35 : 1;
    // 당황한 피포가 가려지지 않게 기체 옆 위쪽에(빈 쪽으로) 찍는다
    const fp = this._fp(this.ufo.x, this.ufo.y);
    const side = fp.x < w / 2 ? 1 : -1;
    const x = clamp(fp.x + side * 105, 96, w - 96);
    const y = Math.max(this.insets.top + 64, fp.y - 70 * this.focus.z);
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    ctx.translate(x, y);
    ctx.rotate(-0.08 + Math.sin(t * 30) * 0.01);
    ctx.scale(pop * 0.74, pop * 0.74);
    // 별 모양 폭발
    star(ctx, 0, 0, 108, 70, 14, t * 0.4);
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#1f2350';
    ctx.lineJoin = 'round';
    ctx.stroke();
    star(ctx, 0, 0, 86, 58, 14, t * 0.4);
    ctx.fillStyle = '#ff5a4e';
    ctx.fill();
    // 글자: 굵은 외곽선 + 아래 그림자
    label(ctx, b.text, 3, 5, { size: 40, fill: '#1f2350', stroke: '#1f2350', lw: 12 });
    label(ctx, b.text, 0, 0, { size: 40, fill: '#ffffff', stroke: '#1f2350', lw: 10 });
    ctx.restore();
  }
}
