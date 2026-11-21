// 3D 장면. 2D 장면(Scene)의 연출 로직(기체 움직임, 시선, 들킴 추격, 효과)을 그대로 물려받고,
// 세계(무대·기체·지구인·표본·빔)는 three.js 로 그린다. 숫자 팝업·말풍선·고리·반짝이는 위의 투명 2D 층에 그린다.
import { FORMS, WATCHERS } from '../data/content.js';
import { Scene } from '../render/scene.js';
import { C, clamp, lerp, easeIn, easeOut, easeBack, circle, star, withAlpha, label } from '../render/draw.js';
import { THREE, PAL, canvasTexture, cloud3d } from './kit.js';
import { Engine, PX } from './engine.js';

export { webglAvailable } from './engine.js';
import { createUfo, UFO_TILT } from './ufo3d.js';
import { createWatcher } from './people3d.js';
import { createSpecimen } from './specimens3d.js';
import { buildStage } from './stages.js';
import { renderIcon3d } from './studio.js';
import { setIconRenderer } from '../render/iconcache.js';

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

/** 두 점을 잇는 원뿔(빔·시선). 위(y+) = 넓은 쪽. */
function makeCone() {
  const geo = new THREE.CylinderGeometry(1, 0.12, 1, 24, 1, true);
  geo.translate(0, 0.5, 0);
  const m = new THREE.MeshBasicMaterial({
    map: beamTexture(),
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
    if (this.stageFade > 0) this.stageFade = Math.max(0, this.stageFade - dt / 0.8);
    this.engine.stage?.update?.(this.t, dt);
  }

  render() {
    this._sync3d();
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
    const s = this.ufoScale * u.scale * u.k;
    this._w(u.x, u.y, ufo.root.position);
    ufo.root.scale.setScalar(s);
    ufo.root.rotation.set(UFO_TILT, 0, -u.rot);
    const beaming = world.specimens.some((sp) => sp.state === 'beam' || sp.state === 'caught');
    ufo.update({ t, mood: this._mood(), lit: this.lit, beam: beaming ? 1 : 0 });
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
      this._w(x, y, root.position);
      root.scale.setScalar(Math.max(scale, 0.001));
      root.rotation.set(0, spin, 0);
      entry.obj.update(t + sp.phase, sp.dir);
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
    const ufoW = ufo.root.position;
    const seen = new Set();
    for (const hmn of world.humans) {
      seen.add(hmn.id);
      let entry = this.watchers.get(hmn.id);
      if (!entry) {
        const pool = this.watcherPool.get(hmn.type);
        const obj = pool && pool.length ? pool.pop() : createWatcher(hmn.type);
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
        const cone = this.beams[bi] || this._newCone(this.beams);
        bi++;
        cone.visible = true;
        // 좁은 끝 = 기체 배, 넓은 끝 = 표본
        placeCone(cone, bellyW, target, 0.32);
        cone.material.color.set(color);
        cone.material.opacity = 0.55 * strength;
      }
    }
    for (; bi < this.beams.length; bi++) this.beams[bi].visible = false;

    // 시선 원뿔: 머리 → 기체
    let ci = 0;
    for (const hmn of world.humans) {
      if (hmn.state !== 'look' && !(found && hmn.spotted)) continue;
      const entry = this.watchers.get(hmn.id);
      if (!entry || !visible) continue;
      const head = entry.obj.headWorld(new THREE.Vector3());
      const cone = this.cones[ci] || this._newCone(this.cones);
      ci++;
      cone.visible = true;
      // 넓은 끝이 기체를 감싸도록
      placeCone(cone, head, ufoW, Math.min((this.home.r / PX) * 0.6, 0.55));
      const color = cloaked ? CONE_CLOAKED : hmn.spotted ? CONE_SPOTTED : CONE;
      cone.material.color.set(color);
      cone.material.opacity = cloaked ? 0.12 : hmn.spotted ? 0.36 : 0.22;
    }
    for (; ci < this.cones.length; ci++) this.cones[ci].visible = false;

    // 연줄
    let si = 0;
    if (!this.airborne) {
      for (const sp of world.specimens) {
        if (sp.kind !== 'kite' || sp.state === 'beam') continue;
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
  }

  _newCone(list) {
    const cone = makeCone();
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
    ctx.save();
    ctx.translate(sx, sy);
    const found = game.phase === 'discovered';
    const cloaked = game.cloaked;
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
    ctx.restore();
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
  }
}
