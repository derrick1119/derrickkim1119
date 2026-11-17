// 무대: 조명, 카메라, 그리고 세계의 상태를 점토 인형들에게 옮겨 주는 일
import * as THREE from '../vendor/three.module.min.js';
import { boil, makeGlowTexture, makeSkyTexture } from './clay.js';
import { buildSet } from './set.js';
import { makeHero, makeGlassBurst, makeLantern, makeFlower, makeShards, makeCrate, makeMoths, makeStalker, makeWatcher, makeLift, makeTide, makeGreatLamp } from './actors.js';
import { CRATE } from './world.js';

const CAM = {     // 구역마다 다른 거리와 눈높이
  forest: { d: 15.5, up: 2.3, ahead: 1.4 }, burrow: { d: 13.5, up: 1.9, ahead: 1.6 }, hollow: { d: 16.5, up: 2.4, ahead: 1.5 },
  yard: { d: 23, up: 4.6, ahead: 1.2 }, cliff: { d: 18, up: 2.6, ahead: 1.3 }, bridge: { d: 21, up: 2.6, ahead: -1.8 },
};
const FOV = 30, TAN = Math.tan(FOV * Math.PI / 360);

export class Scene3D {
  constructor(canvas, L) {
    this.L = L;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.08;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    const s = this.scene = new THREE.Scene();
    s.background = new THREE.Color(0x0a0f18);
    s.fog = new THREE.FogExp2(0x111a27, 0.021);
    this.camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.5, 220);
    this.cam = { x: L.start.x, y: -L.start.y + 1.5, d: 20, up: 1.5, ahead: 0, aspect: 16 / 9 };
    this.quality = 'high'; this.t = 0; this.slow = 0; this.frames = 0; this.shake = 0;

    // 하늘과 달무리
    const sky = this.sky = new THREE.Mesh(new THREE.PlaneGeometry(520, 110), new THREE.MeshBasicMaterial({ map: makeSkyTexture(), fog: false, depthWrite: false }));
    sky.position.set(0, -8, -90); sky.renderOrder = -10; s.add(sky);
    const glowTex = this.glowTex = makeGlowTexture();
    const moon = this.moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x9fb8dc, transparent: true, opacity: 0.5, depthWrite: false, fog: false }));
    moon.scale.setScalar(60); moon.position.set(0, 6, -88); moon.renderOrder = -9; s.add(moon);

    // 빛: 뒤에서 비추는 달빛(윤곽), 옅은 하늘빛, 그리고 전구
    s.add(this.hemi = new THREE.HemisphereLight(0x6f86ad, 0x16110d, 0.5));
    const m = this.moon = new THREE.DirectionalLight(0xa9c2ee, 1.7);
    m.castShadow = true; m.shadow.mapSize.set(2048, 2048);
    const sc = m.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 70;
    m.shadow.bias = -0.0005; m.shadow.normalBias = 0.05;
    s.add(m, m.target);
    s.add(this.fill = new THREE.DirectionalLight(0x8ea4c8, 0.3));
    const b = this.bulb = new THREE.PointLight(0xffc27a, 0, 12, 1.7);
    b.castShadow = true; b.shadow.mapSize.set(512, 512); b.shadow.camera.near = 0.15; b.shadow.camera.far = 11; b.shadow.bias = -0.004; b.shadow.normalBias = 0.03;
    s.add(b);
    this.lanternLights = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xffb060, 0, 9, 1.8); s.add(l); return l; });
    const sp = this.spot = new THREE.SpotLight(0xbcd4ff, 0, 30, 0.2, 0.45, 1.2);
    sp.castShadow = true; sp.shadow.mapSize.set(1024, 1024); sp.shadow.camera.near = 1; sp.shadow.camera.far = 30; sp.shadow.bias = -0.002;
    s.add(sp, sp.target);
    this.lampLight = new THREE.PointLight(0xffd29a, 0, 60, 1.4); s.add(this.lampLight);

    // 세트와 배우
    const set = buildSet(L); s.add(set.group);
    this.hero = makeHero(glowTex); s.add(this.hero.group);
    this.burst = makeGlassBurst(); s.add(this.burst.group);
    this.lanterns = L.lanterns.map((l) => { const a = makeLantern(l, glowTex); s.add(a.group); return a; });
    this.flowers = L.flowers.map((f) => { const a = makeFlower(f, glowTex); s.add(a.group); return a; });
    L.shards.forEach((sh, i) => s.add(makeShards(sh, i)));
    this.crates = L.crates.map(() => { const g = makeCrate(); s.add(g); return g; });
    this.moths = L.roosts.map((m2, i) => { const a = makeMoths(m2, i); s.add(a.group); return a; });
    this.stalkers = L.stalkers.map(() => { const a = makeStalker(); s.add(a.group); return a; });
    this.watchers = L.watchers.map((wt) => { const a = makeWatcher(wt); s.add(a.group); return a; });
    this.lifts = L.lifts.map((lf) => { const a = makeLift(lf); s.add(a.group); return a; });
    this.tide = makeTide(-L.lamp.y); s.add(this.tide.group);
    this.lamp = makeGreatLamp(L.lamp, glowTex); s.add(this.lamp.group);
  }

  zoneKind(x) { for (const z of this.L.zones) if (x <= z.x1 + 0.999) return z.kind; return 'bridge'; }

  resize(w, h, dpr = 1) {
    this.cam.aspect = w / h;
    this.dpr = Math.min(dpr, this.quality === 'high' ? 2 : 1.25);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  setQuality(q) {
    this.quality = q;
    this.bulb.castShadow = q === 'high';
    this.moon.shadow.mapSize.set(q === 'high' ? 2048 : 1024, q === 'high' ? 2048 : 1024);
    if (this.moon.shadow.map) { this.moon.shadow.map.dispose(); this.moon.shadow.map = null; }
    this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  }

  events(list, w) {
    for (const e of list) {
      if (e.type === 'shatter') { this.burst.burst(e.x, -e.y + 1.13, -e.y); this.shake = 1; }
      else if (e.type === 'crack') this.shake = 0.7;
      else if (e.type === 'respawn') { this.burst.clear(); this.hero.reset(); this.snap(w); }
      else if (e.type === 'land') this.hero.land(e.drop);
      else if (e.type === 'light' && e.on) this.hero.lightPop();
    }
  }

  // 카메라를 주인공에게 바로 붙인다 (시작, 되살아남)
  snap(w) {
    const c = CAM[this.zoneKind(w.p.x)], cam = this.cam;
    cam.d = c.d; cam.up = c.up; cam.ahead = c.ahead * w.p.face;
    cam.x = w.p.x + cam.ahead; cam.y = -w.p.y + cam.up;
  }

  frame(w, dt, title = false) {
    this.t += dt;
    const tick = Math.floor(this.t * 12), c = { dt, t: this.t, tick };
    boil.value = Math.floor(this.t * 9) * 1.37;
    const p = w.p, cam = this.cam, L = this.L;

    // 배우들
    this.hero.update(p, c);
    this.burst.update(dt);
    for (let i = 0; i < this.lanterns.length; i++) this.lanterns[i].update(w.lanterns[i].lit, c);
    for (let i = 0; i < this.flowers.length; i++) this.flowers[i].update(w.flowers[i].on, c);
    for (let i = 0; i < this.crates.length; i++) { const cr = w.crates[i]; this.crates[i].position.set(cr.x, -cr.y + CRATE / 2, 0); }
    for (let i = 0; i < this.moths.length; i++) { const vis = Math.abs(w.moths[i].x - cam.x) < 34; this.moths[i].group.visible = vis; if (vis) this.moths[i].update(w.moths[i], c); }
    for (let i = 0; i < this.stalkers.length; i++) { const vis = Math.abs(w.stalkers[i].x - cam.x) < 34; this.stalkers[i].group.visible = vis; if (vis) this.stalkers[i].update(w.stalkers[i], c); }
    for (let i = 0; i < this.lifts.length; i++) this.lifts[i].update(w.lifts[i], c);
    this.tide.update(w.tide, w.ended, c);
    this.lamp.update(w.lamp.lit, w.endT, c);

    // 전구의 빛
    const hp = this.hero.headPos, fl = this.hero.flicker || 0;
    this.bulb.position.set(hp.x, hp.y + 0.05, 1.75);
    this.bulb.intensity = 17 * fl;
    // 가까운 등불 셋에만 실제 광원을 준다
    const lit = [];
    for (let i = 0; i < this.lanterns.length; i++) if (w.lanterns[i].lit) lit.push(this.lanterns[i]);
    lit.sort((a, b2) => Math.abs(a.pos.x - cam.x) - Math.abs(b2.pos.x - cam.x));
    for (let i = 0; i < 3; i++) { const l = this.lanternLights[i], a = lit[i]; if (a && Math.abs(a.pos.x - cam.x) < 30) { l.position.copy(a.pos); l.intensity = 9 * a.level; } else l.intensity = 0; }
    // 감시자의 시선
    let wa = null;
    for (let i = 0; i < this.watchers.length; i++) { this.watchers[i].update(w.watchers[i], c); if (Math.abs(w.watchers[i].x - cam.x) < 40) wa = this.watchers[i]; }
    if (wa) {
      this.spot.position.copy(wa.pos); this.spot.target.position.copy(wa.target);
      this.spot.angle = wa.angle * 1.25; this.spot.color.copy(wa.color); this.spot.intensity = 420 + 260 * wa.heat;
      this.spot.shadow.autoUpdate = true;
    } else { this.spot.intensity = 0; this.spot.shadow.autoUpdate = false; }
    this.lampLight.position.copy(this.lamp.pos); this.lampLight.intensity = 900 * this.lamp.level;
    this.hemi.intensity = 0.5 + 1.4 * this.lamp.level;

    // 카메라
    const z = CAM[this.zoneKind(p.x)], k = 1 - Math.exp(-dt * 1.6);
    cam.d += (z.d - cam.d) * k; cam.up += (z.up - cam.up) * k;
    cam.ahead += ((z.ahead < 0 ? z.ahead : z.ahead * p.face) - cam.ahead) * (1 - Math.exp(-dt * 1.8));
    if (!p.dead) {
      const tx = Math.max(9, Math.min(L.w - 7, p.x + cam.ahead)), ty = -p.y + cam.up;
      cam.x += (tx - cam.x) * (1 - Math.exp(-dt * 4.2));
      cam.y += (ty - cam.y) * (1 - Math.exp(-dt * (p.ground ? 3.2 : 1.6)));
    }
    const D = Math.max(cam.d, 9.5 / (2 * TAN * cam.aspect)) * (title ? 0.82 : 1);
    this.scene.fog.density = 0.021 * Math.min(1, 19 / D);
    const tOff = title ? Math.min(3.6, 1.2 + cam.aspect * 1.3) : 0;     // 첫 화면: 글자에 가리지 않게 오른쪽으로
    let sx = 0, sy = 0;      // 흔들림도 12fps 로
    if (this.shake > 0.01) { const a = tick * 2.399; sx = Math.sin(a * 7.1) * this.shake * 0.22; sy = Math.cos(a * 5.3) * this.shake * 0.22; this.shake *= Math.exp(-dt * 7); }
    this.camera.position.set(cam.x + sx - tOff, cam.y + D * 0.1 + sy, D);
    this.camera.lookAt(cam.x + sx - tOff, cam.y + sy, 0);
    this.sky.position.x = cam.x; this.moonGlow.position.x = cam.x + 24;
    this.moon.target.position.set(cam.x, cam.y, 0);
    this.moon.position.set(cam.x - 11, cam.y + 17, -13);
    this.fill.position.set(cam.x + 4, cam.y + 6, 20); this.fill.target = this.moon.target;

    this.renderer.render(this.scene, this.camera);

    // 느리면 스스로 가볍게
    this.frames++;
    if (this.frames > 40 && this.quality === 'high' && !this.locked) {
      this.slow = dt > 0.034 ? this.slow + 1 : Math.max(0, this.slow - 2);
      if (this.slow > 70) { this.setQuality('low'); this.resize(this.renderer.domElement.clientWidth, this.renderer.domElement.clientHeight, this.dpr); this.onQuality && this.onQuality('low'); }
    }
  }
}
