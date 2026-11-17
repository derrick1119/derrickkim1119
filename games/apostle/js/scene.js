// 무대: 조명, 카메라, 그리고 세계의 상태를 점토 인형들에게 옮겨 주는 일
import * as THREE from '../vendor/three.module.min.js';
import { boil, makeGlowTexture } from './clay.js';
import { buildSet, THEME } from './set.js';
import { makeWisp, makeVessel, makeBlocks, makeCrystal, makeGate, makeLichen, makeRope, makeSlab, makeShrine, makeGoal, makeArrows, makeDusky, makeGuardian, makeMoths, makeSeed, makeFigure, glow } from './actors.js';
import { VESSEL, P } from './world.js';

const CAM = { forest: { d: 15.5, up: 2.2 }, castle: { d: 17, up: 2.4 }, cliff: { d: 17.5, up: 2.6 }, garden: { d: 16.5, up: 2.3 } };
const FOV = 30, TAN = Math.tan(FOV * Math.PI / 360);

export class Scene3D {
  constructor(canvas) {
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    const s = this.scene = new THREE.Scene();
    s.background = new THREE.Color(0x0a0f18);
    s.fog = new THREE.FogExp2(0x16233a, 0.019);
    this.camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.5, 240);
    this.cam = { x: 5, y: -12, d: 16, up: 2.2, ahead: 0, aspect: 16 / 9 };
    this.quality = 'high'; this.t = 0; this.slow = 0; this.frames = 0; this.shake = 0; this.night = 0;
    this.glowTex = makeGlowTexture();
    // 하늘: 길마다 색이 다른 밤안개, 달무리, 그리고 끝에 뜨는 별
    this.skyCanvas = document.createElement('canvas'); this.skyCanvas.width = 8; this.skyCanvas.height = 256;
    this.skyTex = new THREE.CanvasTexture(this.skyCanvas); this.skyTex.colorSpace = THREE.SRGBColorSpace;
    this.sky = new THREE.Mesh(new THREE.PlaneGeometry(560, 120), new THREE.MeshBasicMaterial({ map: this.skyTex, fog: false, depthWrite: false }));
    this.sky.position.set(0, -6, -95); this.sky.renderOrder = -10; s.add(this.sky);
    this.moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xaec4e6, transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
    this.moonGlow.scale.setScalar(64); this.moonGlow.renderOrder = -9; s.add(this.moonGlow);
    this.stars = new THREE.Group(); this.stars.renderOrder = -8; s.add(this.stars);
    // 빛: 뒤에서 비추는 달빛, 하늘빛, 앞에서 살짝 채우는 빛, 사도의 빛, 그리고 켜진 것들에 나눠 주는 빛 여섯
    s.add(this.hemi = new THREE.HemisphereLight(0x7f96c0, 0x1c1612, 0.8));
    const m = this.moon = new THREE.DirectionalLight(0xb4c8f0, 2.1);
    m.castShadow = true; m.shadow.mapSize.set(2048, 2048);
    const sc = m.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 70;
    m.shadow.bias = -0.0005; m.shadow.normalBias = 0.05;
    s.add(m, m.target);
    s.add(this.fill = new THREE.DirectionalLight(0x9db0d4, 0.42)); this.fill.target = m.target;
    const b = this.main = new THREE.PointLight(0xffc27a, 0, 13, 1.7);
    b.castShadow = true; b.shadow.mapSize.set(512, 512); b.shadow.camera.near = 0.15; b.shadow.camera.far = 12; b.shadow.bias = -0.004; b.shadow.normalBias = 0.03;
    s.add(b);
    this.pool = [0, 1, 2, 3, 4, 5].map(() => { const l = new THREE.PointLight(0xffb060, 0, 9, 1.8); s.add(l); return l; });
    this.flashes = [0, 1, 2].map(() => { const f = glow(this.glowTex, 0xffe2b0, 1, 0); f.visible = false; s.add(f); return { s: f, t: 0, r: 1 }; });
    this.level = new THREE.Group(); s.add(this.level);
  }

  // 길 하나를 무대에 세운다 (앞의 것은 치운다)
  load(L) {
    const s = this.scene, tex = this.glowTex;
    s.remove(this.level);
    this.level.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    const g = this.level = new THREE.Group(); s.add(g);
    this.L = L;
    const th = THEME[L.theme], cv = this.skyCanvas.getContext('2d'), gr = cv.createLinearGradient(0, 0, 0, 256);
    [0, 0.42, 0.68, 0.86, 1].forEach((p, i) => gr.addColorStop(p, th.sky[i])); cv.fillStyle = gr; cv.fillRect(0, 0, 8, 256); this.skyTex.needsUpdate = true;
    s.fog.color.set(th.fog);
    const set = buildSet(L); g.add(set.group);
    const T = (x, y) => (x >= 0 && x < L.w && y >= 0 && y < L.h ? L.tiles[Math.floor(y) * L.w + Math.floor(x)] : 0);
    const add = (a) => { g.add(a.group); return a; };
    this.wisp = add(makeWisp(tex)); g.add(this.wisp.thread);
    this.vessels = L.vessels.map((v) => add(makeVessel(v.kind, tex)));
    this.day = add(makeBlocks(L.day, true)); this.nightB = add(makeBlocks(L.night, false));
    this.crystals = L.crystals.map((c) => add(makeCrystal(c, tex, !!T(c.x, c.y + 0.9))));
    this.gates = L.gates.map((gt) => add(makeGate(gt)));
    this.lichens = L.lichens.map((l) => add(makeLichen(l, tex)));
    this.ropes = L.ropes.map((r) => { const a = add(makeRope(r, L.slabs[r.slab])); g.add(a.stake); return a; });
    this.slabs = L.slabs.map((sl) => add(makeSlab(sl)));
    this.shrines = L.shrines.map((sh) => add(makeShrine(sh, tex)));
    this.goal = add(makeGoal(L.goal, tex));
    this.arrows = add(makeArrows(tex));
    this.creatures = L.creatures.map((c, i) => add(c.kind === 'moth' ? makeMoths(i) : c.kind === 'guardian' ? makeGuardian() : makeDusky(c.kind === 'little')));
    this.figures = L.figures.map((f) => add(makeFigure(f, tex)));
    this.seeds = []; this.puffs = [];
    this.stars.clear(); this.night = 0; this.goal.dim = 1;
    for (const f of this.flashes) f.s.visible = false;
  }

  resize(w, h, dpr = 1) {
    this.cam.aspect = w / h;
    this.dpr = Math.min(dpr, this.quality === 'high' ? 2 : 1.25);
    this.renderer.setPixelRatio(this.dpr); this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  setQuality(q) {
    this.quality = q; this.main.castShadow = q === 'high';
    this.moon.shadow.mapSize.set(q === 'high' ? 2048 : 1024, q === 'high' ? 2048 : 1024);
    if (this.moon.shadow.map) { this.moon.shadow.map.dispose(); this.moon.shadow.map = null; }
    this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  }

  events(list, w) {
    for (const e of list) {
      if (e.type === 'putOut') {          // 꺼진 자리: 작은 한숨 같은 연기, 그리고 빛을 잃은 별 하나
        if (e.kind !== 'moth') { const sd = makeSeed(e.x, e.y, e.kind); this.level.add(sd.mesh); this.seeds.push(sd); }
        for (let i = 0; i < 6; i++) { const p = glow(this.glowTex, e.kind === 'moth' ? 0xffc890 : 0x8088c8, 0.5, 0.5); p.material.blending = THREE.NormalBlending; p.position.set(e.x + (Math.random() - 0.5) * 0.5, -e.y + 0.3 + Math.random() * 0.4, 0.4); this.level.add(p); this.puffs.push({ p, vx: (Math.random() - 0.5) * 1.2, vy: 0.5 + Math.random() * 0.9, t: 1 }); }
        if (this.creatures[e.i]) this.creatures[e.i].group.visible = false;
      } else if (e.type === 'flash' || e.type === 'slash' || e.type === 'crystal' || e.type === 'goal') {
        const f = this.flashes.find((q) => q.t <= 0) || this.flashes[0];
        f.t = 1; f.r = e.type === 'flash' ? P.FLASH_R * 2.4 : e.type === 'goal' ? 9 : 3; f.s.position.set(e.x ?? this.L.goal.x, -(e.y ?? this.L.goal.y - 2.4), 0.6); f.s.visible = true;
      } else if (e.type === 'hurt') this.shake = 0.8;
      else if (e.type === 'fade') this.shake = 1;
      else if (e.type === 'land' && e.host && this.vessels[w.S.host]) this.vessels[w.S.host].land();
      else if (e.type === 'shoot' && this.vessels[w.S.host]) this.vessels[w.S.host].shot();
      else if (e.type === 'slabLand') this.shake = 0.5;
      else if (e.type === 'respawn') { for (const sd of this.seeds) this.level.remove(sd.mesh); this.seeds = []; this.snap(w); }
    }
  }

  snap(w) { const a = w.pos(), hv = w.host, c = CAM[this.L.theme]; this.cam.d = c.d; this.cam.up = c.up; this.cam.ahead = 0; this.cam.x = Math.max(8, Math.min(this.L.w - 8, a.x)); this.cam.y = -(hv ? hv.y : a.y + 0.9) + c.up; }

  // 끝: 큰 등을 낮추면 살아남은 아이들 수만큼 별이 뜬다
  showStars(alive, total) {
    this.stars.clear(); this.starList = [];
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < total; i++) {
      const on = i < alive, sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: on ? 0xfff4d8 : 0x5a6488, transparent: true, opacity: 0, depthWrite: false, fog: false }));
      sp.position.set((rnd() - 0.5) * 46, 4 + rnd() * 15, -70); sp.scale.setScalar(on ? 1.5 + rnd() * 1.2 : 0.7);
      this.stars.add(sp); this.starList.push({ sp, on, at: 0.3 + (i / total) * 4.5 + rnd() * 0.3 });
    }
    this.starT = 0;
  }

  frame(w, dt, o = {}) {
    this.t += dt;
    const tick = Math.floor(this.t * 12), c = { dt, t: this.t, tick }, S = w.S, L = this.L, cam = this.cam;
    boil.value = Math.floor(this.t * 9) * 1.37;
    const a = w.pos(), hv = w.host, inp = o.inp || { ax: 0, ay: 0 };

    // 인형들
    this.wisp.update(S.wisp, w.anchor(), S.host < 0 && !S.done, c);
    for (let i = 0; i < this.vessels.length; i++) this.vessels[i].update(S.vessels[i], i === S.host, inp, c);
    this.day.update(S.day, c); this.nightB.update(S.night, c);
    for (let i = 0; i < this.crystals.length; i++) this.crystals[i].update(S.crystals[i].lit, { ...c, x: L.crystals[i].x });
    for (let i = 0; i < this.gates.length; i++) this.gates[i].update(S.gates[i].open, c);
    for (let i = 0; i < this.lichens.length; i++) this.lichens[i].update(S.lichens[i], c);
    for (let i = 0; i < this.ropes.length; i++) this.ropes[i].update(S.ropes[i].cut);
    for (let i = 0; i < this.slabs.length; i++) this.slabs[i].update(S.slabs[i]);
    for (let i = 0; i < this.shrines.length; i++) this.shrines[i].update(S.shrines[i].lit, c);
    this.goal.update(S.done, S.doneT, c);
    this.arrows.update(S);
    for (let i = 0; i < this.creatures.length; i++) { const d = S.creatures[i], vis = d.alive && !d.gone && Math.abs(d.x - cam.x) < 36; this.creatures[i].group.visible = vis; if (vis) this.creatures[i].update(d, c); }
    for (const f of this.figures) f.update(a.x, S.done, c);
    for (const sd of this.seeds) sd.update(dt);
    for (let i = this.puffs.length - 1; i >= 0; i--) { const p = this.puffs[i]; p.t -= dt * 1.4; p.p.position.x += p.vx * dt; p.p.position.y += p.vy * dt; p.p.material.opacity = Math.max(0, p.t * 0.5); p.p.scale.setScalar(0.5 + (1 - p.t) * 0.9); if (p.t <= 0) { this.level.remove(p.p); this.puffs.splice(i, 1); } }
    for (const f of this.flashes) { if (f.t <= 0) continue; f.t -= dt * 4; f.s.material.opacity = Math.max(0, f.t) * 0.8; f.s.scale.setScalar(f.r * (1.15 - f.t * 0.6)); if (f.t <= 0) f.s.visible = false; }

    // 사도의 빛: 깃든 몸에 따라 다르다
    let mi = 0;
    if (hv) { const ves = this.vessels[S.host]; mi = hv.kind === 'lantern' ? 0.7 + 17 * ves.light : 2.4 + (hv.slashT > 0 ? 14 : 0); this.main.position.set(hv.x, -hv.y + VESSEL[hv.kind].h * 0.6, 1.75); }
    else if (!S.done) { mi = 5; this.main.position.set(S.wisp.x, -S.wisp.y, 1.4); }
    else { mi = 0; }
    this.main.intensity += (mi - this.main.intensity) * Math.min(1, dt * 20);
    // 그 밖의 켜진 것들: 카메라에서 가까운 여섯에만 실제 광원
    const src = [];
    S.vessels.forEach((v, i) => { if (v.kind === 'lantern' && v.on && i !== S.host) src.push([v.x, -v.y + 0.4, 1.2, 15, 0xffb657]); });
    for (const p of S.pegs) src.push([p.lx, -p.ly, 0.8, 5, 0xffc884]);
    for (const ar of S.arrows) src.push([ar.x, -ar.y, 0.8, 5, 0xffc884]);
    L.crystals.forEach((cr, i) => { if (S.crystals[i].lit) src.push([cr.x, -cr.y, 0.5, 6, 0xffc070]); });
    this.shrines.forEach((sh) => { if (sh.level > 0.05) src.push([sh.pos.x, sh.pos.y, sh.pos.z, 5 * sh.level, 0xffb060]); });
    this.lichens.forEach((li) => { if (li.level > 0.3) src.push([li.pos.x, li.pos.y, li.pos.z, 3.5 * li.level, 0xc8ff90]); });
    if (this.goal.level > 0.02) src.push([this.goal.pos.x, this.goal.pos.y, this.goal.pos.z + 1, (L.goal.great ? 320 : 60) * this.goal.level, 0xffd29a, L.goal.great ? 60 : 16]);
    src.sort((p, q) => Math.abs(p[0] - cam.x) - Math.abs(q[0] - cam.x));
    for (let i = 0; i < this.pool.length; i++) { const l = this.pool[i], p = src[i]; if (p && Math.abs(p[0] - cam.x) < 30) { l.position.set(p[0], p[1], p[2]); l.intensity = p[3]; l.color.setHex(p[4]); l.distance = p[5] || 9; } else l.intensity = 0; }
    this.hemi.intensity = 0.8 + 0.5 * Math.min(1, this.goal.level) - 0.25 * this.night;

    // 카메라
    const z = CAM[L.theme], face = hv ? hv.face : 0;
    cam.ahead += (face * 1.4 - cam.ahead) * (1 - Math.exp(-dt * 1.8));
    const tx = Math.max(8, Math.min(L.w - 8, a.x + cam.ahead)), ty = -(hv ? hv.y : a.y + 0.9) + z.up;      // 발 높이를 기준으로
    cam.x += (tx - cam.x) * (1 - Math.exp(-dt * 4.2));
    cam.y += (ty - cam.y) * (1 - Math.exp(-dt * (hv && hv.ground ? 3 : 1.8)));
    const D = Math.max(cam.d, 9.5 / (2 * TAN * cam.aspect)) * (o.title ? 0.8 : 1) * (1 + 0.5 * this.night);
    this.scene.fog.density = 0.019 * Math.min(1, 19 / D);
    const tOff = o.title ? Math.min(3.4, 1.2 + cam.aspect * 1.25) : 0;
    let sx = 0, sy = 0;
    if (this.shake > 0.01) { const q = tick * 2.399; sx = Math.sin(q * 7.1) * this.shake * 0.2; sy = Math.cos(q * 5.3) * this.shake * 0.2; this.shake *= Math.exp(-dt * 7); }
    const lift = this.night * 3.2;
    this.camera.position.set(cam.x + sx - tOff, cam.y + D * 0.1 + sy + lift * 0.3, D);
    this.camera.lookAt(cam.x + sx - tOff, cam.y + sy + lift, 0);
    this.sky.position.x = cam.x; this.sky.position.y = cam.y + 4; this.moonGlow.position.set(cam.x + 24, cam.y + 15, -92);
    this.moon.target.position.set(cam.x, cam.y, 0); this.moon.position.set(cam.x - 11, cam.y + 17, -13);
    this.fill.position.set(cam.x + 4, cam.y + 6, 20);
    if (this.starList) { this.starT += dt; this.stars.position.set(cam.x, cam.y, 0); for (const st of this.starList) { const k = Math.max(0, Math.min(1, (this.starT - st.at) * 1.5)); st.sp.material.opacity = k * (st.on ? 0.95 + Math.sin(tick * 0.5 + st.at * 9) * 0.05 : 0.22); } }

    this.renderer.render(this.scene, this.camera);
    this.frames++;
    if (this.frames > 40 && this.quality === 'high' && !this.locked) {
      this.slow = dt > 0.034 ? this.slow + 1 : Math.max(0, this.slow - 2);
      if (this.slow > 70) { this.setQuality('low'); this.resize(this.renderer.domElement.clientWidth, this.renderer.domElement.clientHeight, this.dpr); this.onQuality && this.onQuality('low'); }
    }
  }
}
