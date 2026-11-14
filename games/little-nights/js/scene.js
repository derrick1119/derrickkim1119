// THE LAMP: 작은 밤들 — 3D 장면 (three.js)
// 밤하늘에 떠 있는 작은 뜰. 전구가 실제 광원이 되어 벽과 상자의 그림자를 드리운다.
import * as THREE from '../vendor/three.module.min.js';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';
import { T_VOID, T_FLOOR, T_WALL, T_DAY, T_NIGHT, T_LANTERN, litMap, floorAt } from './rules.js';

const MOVE_T = 0.17; // 한 칸 굴러가는 데 걸리는 시간
const BULB_R = 0.3;

const THEMES = {
  1: { tile: [0x8d8474, 0x9a917f, 0x847c6e], rock: 0x4a4338, wall: 0xa59a86 },
  2: { tile: [0x6f8a78, 0x7c9784, 0x66806f], rock: 0x364a40, wall: 0x8aa392 },
  3: { tile: [0x9a8468, 0xa89172, 0x8e795f], rock: 0x4f4130, wall: 0xb39c7c },
  4: { tile: [0x7c7f9c, 0x898caa, 0x727593], rock: 0x3c3e55, wall: 0x9a9dba },
};

function hash(i) {
  let h = Math.imul(i + 1, 374761393);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function glowTexture(r, g, b) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(${r},${g},${b},1)`);
  gr.addColorStop(0.25, `rgba(${r},${g},${b},0.55)`);
  gr.addColorStop(0.6, `rgba(${r},${g},${b},0.12)`);
  gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 낮의 돌(해) · 밤의 돌(달) 윗면에 새기는 무늬
function glyphTexture(day) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.translate(64, 64);
  x.fillStyle = x.strokeStyle = day ? '#7a4a08' : '#e6ecff';
  if (day) {
    x.beginPath(); x.arc(0, 0, 20, 0, Math.PI * 2); x.fill();
    x.lineWidth = 8; x.lineCap = 'round';
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; x.beginPath(); x.moveTo(Math.cos(a) * 32, Math.sin(a) * 32); x.lineTo(Math.cos(a) * 46, Math.sin(a) * 46); x.stroke(); }
  } else {
    x.beginPath(); x.arc(0, 0, 34, 0.6, Math.PI * 2 - 0.6); x.arc(16, 0, 26, Math.PI * 2 - 0.95, 0.95, true); x.closePath(); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Scene3D {
  constructor(canvas) {
    this.ok = true;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
      this.ok = false;
      return;
    }
    const r = this.renderer;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.root = new THREE.Group();   // 스테이지마다 새로 채우는 부분
    this.scene.add(this.root);

    // 달빛 (불을 끄면 눈이 어둠에 익듯 조금 밝아진다)
    this.hemi = new THREE.HemisphereLight(0x8fa2e0, 0x1a1d30, 1.0);
    this.moon = new THREE.DirectionalLight(0xa8bcff, 1.0);
    this.moon.position.set(-4, 7, -3);
    this.scene.add(this.hemi, this.moon);

    // 별
    const n = 500, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = hash(i * 3) * Math.PI * 2, e = hash(i * 3 + 1) * 1.1 - 0.25, d = 40;
      pos[i * 3] = Math.cos(a) * Math.cos(e) * d; pos[i * 3 + 1] = Math.sin(e) * d - 6; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * d;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcdd8ff, size: 0.16, transparent: true, opacity: 0.8, sizeAttenuation: true }));
    this.scene.add(this.stars);

    this.tex = { warm: glowTexture(255, 200, 120), cool: glowTexture(140, 170, 255), violet: glowTexture(190, 150, 255), gold: glowTexture(255, 224, 150), sun: glyphTexture(true), moonMark: glyphTexture(false) };
    this.geo = {
      tile: new RoundedBoxGeometry(0.95, 0.5, 0.95, 3, 0.06),
      wall: new RoundedBoxGeometry(0.95, 1.0, 0.95, 3, 0.07),
      stone: new RoundedBoxGeometry(0.9, 0.36, 0.9, 3, 0.07),
      crate: new RoundedBoxGeometry(0.7, 0.7, 0.7, 2, 0.05),
      rock: new THREE.CylinderGeometry(0.5, 0.2, 1, 6),
      outline: new THREE.EdgesGeometry(new THREE.BoxGeometry(0.86, 0.02, 0.86)),
      mark: new THREE.PlaneGeometry(0.5, 0.5),
    };
    this.time = 0;
    this.anims = [];
    this.pulse = 0;
    this.lowPerf = false;
    this.cam = { dist: 12, target: new THREE.Vector3(), sway: 0 };
    this.shards = [];
    this.menu = false;
  }

  resize(w, h) {
    if (!this.ok) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.lowPerf ? 1.25 : 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.aspect = w / h;
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    this.fitCamera();
  }

  fitCamera() {
    if (!this.L) return;
    const { W, H } = this.L;
    // 판을 감싸는 공이 화면에 들어오도록 (세로 화면에서는 가로 폭이 기준이 된다)
    const fov = (this.camera.fov * Math.PI) / 180;
    const vHalf = fov / 2, hHalf = Math.atan(Math.tan(vHalf) * this.aspect);
    const radius = 0.5 * Math.hypot(W, H) + 0.75;
    this.cam.dist = radius / Math.sin(Math.min(vHalf, hHalf)) * (this.aspect < 1 ? 0.9 : 0.86);
    // 아래 버튼 줄에 가리지 않도록 판을 화면 위쪽으로 조금 올려 본다
    this.cam.lift = 0.5 + H * 0.06;
    if (this.menu) {
      // 타이틀에서는 글자 아래쪽에 작게 띄운다
      this.cam.dist *= this.aspect < 1 ? 1.3 : 1.7;
      this.cam.lift = -this.cam.dist * Math.tan(vHalf) * (this.aspect < 1 ? 0.55 : 0.52);
    }
  }

  cellPos(i, y = 0) {
    const { W, H } = this.L;
    return new THREE.Vector3((i % W) - (W - 1) / 2, y, ((i / W) | 0) - (H - 1) / 2);
  }

  // ---------- 스테이지 만들기 ----------
  load(L, s, chapter) {
    if (!this.ok) return;
    this.L = L;
    this.anims.length = 0;
    this.root.traverse((o) => { if (o.material && o.userData.own) o.material.dispose(); });
    this.root.clear();
    const th = THEMES[chapter] || THEMES[1];
    this.theme = th;
    const { W, H, type } = L, N = W * H;
    this.cells = new Array(N).fill(null);
    const mat = (color, opts = {}) => { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02, ...opts }); return m; };
    const rockMat = mat(th.rock, { roughness: 1 });

    for (let i = 0; i < N; i++) {
      const t = type[i];
      if (t === T_VOID) continue;
      const p = this.cellPos(i), g = new THREE.Group();
      g.position.copy(p);
      const cell = { t, g, lit: 0, a: 1 };
      if (t === T_DAY || t === T_NIGHT) {
        const day = t === T_DAY;
        const m = new THREE.MeshStandardMaterial({
          color: day ? 0xf2c468 : 0x4553b4, emissive: day ? 0xff9a20 : 0x2436b8, emissiveIntensity: day ? 0.42 : 0.55,
          roughness: 0.4, metalness: 0.05, transparent: true, opacity: 1,
        });
        const mesh = new THREE.Mesh(this.geo.stone, m);
        mesh.position.y = -0.18; mesh.receiveShadow = true; mesh.userData.own = true;
        const line = new THREE.LineSegments(this.geo.outline, new THREE.LineBasicMaterial({ color: day ? 0xffd27a : 0x8fa4ff, transparent: true, opacity: 0.4 }));
        line.position.y = -0.02; line.userData.own = true;
        // 윗면의 해·달 무늬
        const mark = new THREE.Mesh(this.geo.mark, new THREE.MeshBasicMaterial({ map: day ? this.tex.sun : this.tex.moonMark, transparent: true, opacity: 0.9, depthWrite: false }));
        mark.rotation.x = -Math.PI / 2; mark.position.y = 0.012; mark.userData.own = true;
        g.add(mesh, line, mark);
        cell.mesh = mesh; cell.line = line; cell.mark = mark; cell.a = 0;
      } else {
        const m = mat(th.tile[Math.floor(hash(i) * 3)], { emissive: 0xffa040, emissiveIntensity: 0 });
        const tile = new THREE.Mesh(this.geo.tile, m);
        tile.position.y = -0.25 - hash(i + 7) * 0.03; tile.receiveShadow = true; tile.userData.own = true;
        g.add(tile);
        cell.mesh = tile;
        // 뜰 아래로 뻗은 바위
        const rock = new THREE.Mesh(this.geo.rock, rockMat);
        const hgt = 0.5 + hash(i + 13) * 1.3;
        rock.scale.set(0.98, hgt, 0.98); rock.position.y = -0.5 - hgt / 2; rock.rotation.y = hash(i + 3) * 3;
        g.add(rock);
        if (t === T_WALL) {
          const wm = mat(th.wall);
          const wall = new THREE.Mesh(this.geo.wall, wm);
          wall.castShadow = true; wall.receiveShadow = true; wall.scale.y = 0.5 + hash(i + 5) * 0.14; wall.position.y = wall.scale.y / 2;
          wall.userData.own = true;
          g.add(wall);
        } else if (t === T_LANTERN) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.95, 8), mat(0x2a3140, { roughness: 0.6 }));
          post.position.y = 0.475; post.castShadow = true;
          const lm = new THREE.MeshStandardMaterial({ color: 0x55627e, emissive: 0xffc860, emissiveIntensity: 0, roughness: 0.4 });
          const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), lm);
          lamp.position.y = 1.04; lamp.userData.own = true;
          const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.09, 0.07, 8), mat(0x2a3140));
          cap.position.y = 1.23;
          const light = new THREE.PointLight(0xffc878, 0, 2.6, 1.6);
          light.position.y = 1.0;
          const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.warm, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
          halo.position.y = 1.02; halo.scale.setScalar(1.6);
          g.add(post, lamp, cap, light, halo);
          cell.lamp = lm; cell.light = light; cell.halo = halo; cell.on = 0;
        }
      }
      this.root.add(g);
      this.cells[i] = cell;
    }

    // 출구: 전구가 끼워질 소켓
    {
      const g = new THREE.Group();
      g.position.copy(this.cellPos(L.exit));
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.14, 20), mat(0x39445c, { roughness: 0.5, metalness: 0.4 }));
      base.position.y = 0.07; base.receiveShadow = true;
      const rm = new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xffc35e, emissiveIntensity: 0.7, roughness: 0.4 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 28), rm);
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.16; ring.userData.own = true;
      const beam = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.gold, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 }));
      beam.position.y = 0.5; beam.scale.set(0.9, 1.8, 1);
      g.add(base, ring, beam);
      this.root.add(g);
      this.exit = { g, ring, rm, beam };
    }

    // 빛꽃
    this.flowers = L.flowers.map((i, k) => {
      const g = new THREE.Group();
      g.position.copy(this.cellPos(i));
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.34, 6), mat(0x4f8a52));
      stem.position.y = 0.17;
      const pm = new THREE.MeshStandardMaterial({ color: 0xcfc49a, emissive: 0xffd27a, emissiveIntensity: 0.15, roughness: 0.5 });
      const head = new THREE.Group();
      head.position.y = 0.36;
      for (let p = 0; p < 6; p++) {
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), pm);
        const a = (p / 6) * Math.PI * 2;
        petal.scale.set(1, 0.32, 0.6); petal.position.set(Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1); petal.rotation.y = -a;
        head.add(petal);
      }
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfff8dc, emissive: 0xffe9a8, emissiveIntensity: 0.4 }));
      head.add(core);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.gold, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.18 }));
      halo.position.y = 0.36; halo.scale.setScalar(0.5);
      head.scale.setScalar(0.5);
      g.add(stem, head, halo);
      pm.userData = {}; g.userData.k = k;
      this.root.add(g);
      return { g, head, pm, halo, a: 0, on: (s.fl >> k) & 1 };
    });

    // 상자
    const crateMat = mat(0x9a6b3c, { roughness: 0.9 });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x4a2f14 });
    const crateEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.7, 0.7, 0.7));
    this.crates = s.crates.map((i) => {
      const g = new THREE.Group();
      const box = new THREE.Mesh(this.geo.crate, crateMat);
      box.castShadow = true; box.receiveShadow = true;
      g.add(box, new THREE.LineSegments(crateEdges, edgeMat));
      g.position.copy(this.cellPos(i, 0.35));
      this.root.add(g);
      return { g };
    });

    // 그림자
    this.shadows = s.sh.map((i) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.33, 18, 14), new THREE.MeshStandardMaterial({ color: 0x0a0713, roughness: 1 }));
      body.scale.set(1, 0.85, 1); body.position.y = 0.26; body.castShadow = true;
      const em = new THREE.MeshBasicMaterial({ color: 0xc9a8ff });
      const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), em), e2 = e1.clone();
      e1.position.set(-0.11, 0.42, 0.22); e2.position.set(0.11, 0.42, 0.22);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.violet, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.35 }));
      halo.position.set(0, 0.34, 0.3); halo.scale.setScalar(0.55);
      g.add(body, e1, e2, halo);
      g.position.copy(this.cellPos(i));
      this.root.add(g);
      return { g, body, eyes: [e1, e2], halo, sunk: 0, dead: false, fall: 0 };
    });

    // 나방
    this.moths = s.mo.map((i, k) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(0x2a2231));
      body.scale.set(1, 1, 2.2);
      const wm = new THREE.MeshStandardMaterial({ color: 0xb9aec8, emissive: 0xff9ac0, emissiveIntensity: 0.15, side: THREE.DoubleSide, roughness: 0.8 });
      const wg = new THREE.CircleGeometry(0.15, 14);
      wg.scale(1, 0.78, 1);
      wg.translate(0.15, 0, 0);
      const w1 = new THREE.Mesh(wg, wm), w2 = new THREE.Mesh(wg, wm);
      w1.rotation.x = -Math.PI / 2; w2.rotation.x = -Math.PI / 2; w2.scale.x = -1;
      const pv1 = new THREE.Group(), pv2 = new THREE.Group();
      pv1.add(w1); pv2.add(w2);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.violet, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.25 }));
      halo.scale.setScalar(0.5);
      g.add(body, pv1, pv2, halo);
      g.scale.setScalar(1.7);
      g.position.copy(this.cellPos(i, 0.85));
      this.root.add(g);
      return { g, wings: [pv1, pv2], halo, ph: k * 1.7, hot: 0 };
    });

    // 전구
    {
      const g = new THREE.Group();        // 위치
      const spin = new THREE.Group();     // 굴러가는 회전
      const glass = new THREE.MeshStandardMaterial({ color: 0xfff3c9, emissive: 0xffc45e, emissiveIntensity: 1.6, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.96 });
      const ball = new THREE.Mesh(new THREE.SphereGeometry(BULB_R, 28, 20), glass);
      ball.userData.own = true;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.16, 14), mat(0xa9b3c6, { roughness: 0.45, metalness: 0.25, emissive: 0x6c768c, emissiveIntensity: 0.7 }));
      cap.position.y = -BULB_R - 0.02;
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.06, 10), mat(0x5a6478, { roughness: 0.5, metalness: 0.2, emissive: 0x3a4254, emissiveIntensity: 0.7 }));
      tip.position.y = -BULB_R - 0.12;
      const fil = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.016, 6, 16), new THREE.MeshBasicMaterial({ color: 0xff8a2a }));
      fil.rotation.x = Math.PI / 2;
      const crack = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
        [0.02, 0.3, 0.05], [0.08, 0.2, 0.2], [0.08, 0.2, 0.2], [-0.02, 0.08, 0.29], [-0.02, 0.08, 0.29], [0.1, -0.02, 0.28],
        [0.08, 0.2, 0.2], [0.2, 0.17, 0.14], [-0.02, 0.08, 0.29], [-0.14, 0.1, 0.24],
      ].map((p) => new THREE.Vector3(p[0], p[1], p[2]).normalize().multiplyScalar(BULB_R * 1.01))), new THREE.LineBasicMaterial({ color: 0x3a2412 }));
      crack.visible = false;
      spin.add(ball, cap, tip, fil, crack);
      const light = new THREE.PointLight(0xffdca8, 0, 4.4, 1.4);
      light.castShadow = true;
      light.shadow.mapSize.set(1024, 1024);
      light.shadow.camera.near = 0.08; light.shadow.camera.far = 6;
      light.shadow.bias = -0.004; light.shadow.normalBias = 0.03; light.shadow.radius = 4;
      light.position.y = 0.25;
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.warm, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
      halo.scale.setScalar(2.4);
      g.add(spin, light, halo);
      g.position.copy(this.cellPos(s.p, BULB_R + 0.02));
      spin.rotation.x = Math.PI; // 꼭지가 위로 가도록 뒤집어 세워 둔다
      this.root.add(g);
      this.bulb = { g, spin, glass, fil, crack, light, halo, k: s.on ? 1 : 0, hidden: false };
    }

    this.cam.target.set(0, 0, 0);
    this.fitCamera();
    this.sync(s, true);
  }

  // ---------- 상태 맞추기 ----------
  // 논리 상태 s 에 맞게 목표값을 정한다. instant 이면 애니메이션 없이 바로 맞춘다 (무르기·처음부터).
  sync(s, instant) {
    if (!this.ok) return;
    const L = this.L, lit = litMap(L, s);
    this.state = s;
    for (let i = 0; i < this.cells.length; i++) {
      const c = this.cells[i];
      if (!c) continue;
      c.litT = lit[i];
      if (c.t === T_DAY || c.t === T_NIGHT) c.aT = floorAt(L, lit, i) ? 1 : 0;
      if (c.t === T_LANTERN) c.onT = (s.lan >> L.lanterns.indexOf(i)) & 1;
      if (instant) { c.lit = c.litT; if (c.aT !== undefined) c.a = c.aT; if (c.onT !== undefined) c.on = c.onT; }
    }
    this.flowers.forEach((f, k) => { f.on = (s.fl >> k) & 1; if (instant) f.a = f.on; });
    this.bulb.kT = s.on ? 1 : 0;
    this.bulb.crack.visible = s.cr;
    if (instant) {
      this.anims.length = 0;
      this.bulb.k = this.bulb.kT;
      this.bulb.hidden = false;
      this.bulb.g.visible = true;
      this.bulb.g.position.copy(this.cellPos(s.p, BULB_R + 0.02));
      this.crates.forEach((c, k) => c.g.position.copy(this.cellPos(s.crates[k], 0.35)));
      this.shadows.forEach((sh, k) => {
        sh.dead = s.sh[k] < 0; sh.fall = 0;
        sh.g.visible = !sh.dead;
        if (!sh.dead) { sh.g.position.copy(this.cellPos(s.sh[k])); sh.sunk = lit[s.sh[k]] ? 1 : 0; }
      });
      this.moths.forEach((m, k) => m.g.position.copy(this.cellPos(s.mo[k], 0.85)));
      for (const q of this.shards) this.scene.remove(q.m);
      this.shards.length = 0;
    }
    this.shadows.forEach((sh, k) => { if (s.sh[k] >= 0) sh.sunkT = lit[s.sh[k]] ? 1 : 0; });
    this.moths.forEach((m) => { m.hotT = s.on ? 1 : 0; });
  }

  tween(dur, fn, done) { this.anims.push({ t: 0, dur, fn, done }); }

  // 한 턴의 결과를 연출한다
  play(prev, next, events) {
    if (!this.ok) return;
    const L = this.L;
    const ease = (k) => k * k * (3 - 2 * k);
    for (const e of events) {
      if (e.type === 'move') {
        const a = this.cellPos(e.from, BULB_R + 0.02), b = this.cellPos(e.to, BULB_R + 0.02);
        const axis = new THREE.Vector3(b.z - a.z, 0, -(b.x - a.x)).normalize();
        const q0 = this.bulb.spin.quaternion.clone();
        this.tween(MOVE_T, (k) => {
          this.bulb.g.position.lerpVectors(a, b, ease(k));
          this.bulb.g.position.y = BULB_R + 0.02 + Math.sin(k * Math.PI) * 0.03;
          const q = new THREE.Quaternion().setFromAxisAngle(axis, (ease(k) * 1) / BULB_R);
          this.bulb.spin.quaternion.copy(q).multiply(q0);
        });
      } else if (e.type === 'push') {
        const c = this.crates[e.k], a = this.cellPos(e.from, 0.35), b = this.cellPos(e.to, 0.35);
        this.tween(MOVE_T, (k) => c.g.position.lerpVectors(a, b, ease(k)));
      } else if (e.type === 'shadowMove') {
        const sh = this.shadows[e.k], a = this.cellPos(e.from), b = this.cellPos(e.to);
        this.tween(MOVE_T * 1.2, (k) => { sh.g.position.lerpVectors(a, b, ease(k)); sh.g.position.y = Math.sin(k * Math.PI) * 0.08; });
      } else if (e.type === 'shadowFall') {
        const sh = this.shadows[e.k];
        sh.dead = true;
        this.tween(0.55, (k) => { sh.g.position.y = -k * k * 3.2; sh.g.scale.setScalar(1 - k * 0.5); }, () => { sh.g.visible = false; sh.g.scale.setScalar(1); });
      } else if (e.type === 'mothMove') {
        const m = this.moths[e.k], a = this.cellPos(e.from, 0.85), b = this.cellPos(e.to, e.back !== undefined ? 0.45 : 0.85);
        m.g.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
        this.tween(MOVE_T * 1.2, (k) => m.g.position.lerpVectors(a, b, ease(k)), e.back !== undefined ? () => {
          const home = this.cellPos(e.back, 0.85), from = m.g.position.clone();
          this.tween(0.3, (k) => m.g.position.lerpVectors(from, home, ease(k)));
        } : null);
      } else if (e.type === 'bite') {
        if (e.who === 'shadow') {
          const sh = this.shadows[e.k];
          sh.dead = true;
          this.tween(0.3, (k) => sh.g.scale.setScalar(1 - k), () => { sh.g.visible = false; sh.g.scale.setScalar(1); });
        }
        this.pulse = 1;
      } else if (e.type === 'shatter') {
        this.tween(MOVE_T, () => {}, () => this.shatter());
      } else if (e.type === 'win') {
        const p = this.cellPos(L.exit, BULB_R + 0.16), from = this.cellPos(L.exit, BULB_R + 0.02);
        this.tween(0.5, (k) => { this.bulb.g.position.lerpVectors(from, p, ease(k)); this.exit.win = k; }, null);
        this.exit.winT = 1;
      }
    }
    this.sync(next, false);
    // 물려서 사라지는 그림자는 sync 가 다시 보이게 하지 않도록
    this.shadows.forEach((sh, k) => { if (next.sh[k] < 0) sh.dead = true; });
  }

  shatter() {
    const b = this.bulb;
    b.hidden = true; b.g.visible = false;
    const m = new THREE.MeshStandardMaterial({ color: 0xe6f0ff, emissive: 0xffd9a0, emissiveIntensity: 0.6, roughness: 0.2, side: THREE.DoubleSide });
    const geo = new THREE.TetrahedronGeometry(0.07);
    for (let i = 0; i < 18; i++) {
      const s = new THREE.Mesh(geo, m);
      s.position.copy(b.g.position);
      const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 2.4;
      this.scene.add(s);
      this.shards.push({ m: s, v: new THREE.Vector3(Math.cos(a) * sp, 1.5 + Math.random() * 2.5, Math.sin(a) * sp), life: 1.4 });
    }
    this.pulse = 1.4;
  }

  get busy() { return this.anims.length > 0; }

  // ---------- 매 프레임 ----------
  update(dt) {
    if (!this.ok || !this.L) return;
    const t = (this.time += dt);
    // 진행 중인 연출
    for (let i = 0; i < this.anims.length; i++) {
      const a = this.anims[i];
      a.t += dt;
      const k = Math.min(1, a.t / a.dur);
      a.fn(k);
      if (k >= 1) { this.anims.splice(i--, 1); if (a.done) a.done(); }
    }
    const lerp = (a, b, k) => a + (b - a) * Math.min(1, k);

    // 칸: 빛을 받은 정도, 낮의 돌·밤의 돌의 나타남
    for (let i = 0; i < this.cells.length; i++) {
      const c = this.cells[i];
      if (!c) continue;
      c.lit = lerp(c.lit, c.litT, dt * 12);
      if (c.t === T_DAY || c.t === T_NIGHT) {
        c.a = lerp(c.a, c.aT, dt * 11);
        const m = c.mesh;
        m.visible = c.a > 0.02;
        m.material.opacity = c.a;
        m.position.y = -0.18 - (1 - c.a) * 0.35;
        m.scale.setScalar(0.82 + 0.18 * c.a);
        c.line.material.opacity = 0.42 * (1 - c.a) * (0.7 + 0.3 * Math.sin(t * 3 + i));
        c.line.visible = c.a < 0.98;
        c.mark.material.opacity = 0.22 + 0.7 * c.a;
        c.mark.position.y = 0.012 - (1 - c.a) * 0.03;
      } else {
        c.mesh.material.emissiveIntensity = 0.1 * c.lit;
        if (c.t === T_LANTERN) {
          c.on = lerp(c.on, c.onT, dt * 6);
          c.lamp.emissiveIntensity = 2.2 * c.on * (1 + 0.05 * Math.sin(t * 11 + i));
          c.light.intensity = 2.4 * c.on;
          c.halo.material.opacity = 0.75 * c.on;
        }
      }
    }

    // 빛꽃
    for (const f of this.flowers) {
      f.a = lerp(f.a, f.on, dt * 5);
      const k = f.a;
      f.head.scale.setScalar(0.5 + 0.65 * k + (f.on && k < 0.98 ? Math.sin(k * Math.PI) * 0.25 : 0));
      f.head.rotation.y = t * 0.6 * k;
      f.pm.emissiveIntensity = 0.15 + 1.5 * k;
      f.pm.color.setHex(k > 0.5 ? 0xffe9a8 : 0xcfc49a);
      f.halo.material.opacity = 0.3 + 0.4 * k + 0.08 * Math.sin(t * 3 + f.g.position.x * 5);
      f.halo.scale.setScalar(0.5 + 0.8 * k);
    }

    // 그림자
    this.shadows.forEach((sh) => {
      if (sh.dead) return;
      sh.sunk = lerp(sh.sunk, sh.sunkT || 0, dt * 9);
      const up = 1 - sh.sunk;
      sh.body.scale.set(1 + sh.sunk * 0.35, 0.85 * (0.12 + 0.88 * up) * (1 + 0.05 * Math.sin(t * 4 + sh.g.position.x)), 1 + sh.sunk * 0.35);
      sh.body.position.y = 0.26 * (0.12 + 0.88 * up);
      const blink = Math.sin(t * 1.3 + sh.g.position.z * 3) > 0.985 ? 0 : 1;
      const bp = this.bulb.g.position, lx = Math.max(-1, Math.min(1, bp.x - sh.g.position.x)) * 0.05;
      sh.eyes[0].position.x = -0.11 + lx; sh.eyes[1].position.x = 0.11 + lx;
      for (const e of sh.eyes) { e.visible = up > 0.5 && blink === 1; e.position.y = 0.42 * (0.3 + 0.7 * up); }
      sh.halo.material.opacity = 0.35 * up;
    });

    // 나방
    this.moths.forEach((m) => {
      m.hot = lerp(m.hot, m.hotT || 0, dt * 6);
      const flap = Math.sin(t * (22 + m.hot * 16) + m.ph) * 0.55 + 0.15;
      m.wings[0].rotation.z = flap; m.wings[1].rotation.z = -flap;
      if (!this.busy) m.g.position.y = lerp(m.g.position.y, 0.85 + Math.sin(t * 2.4 + m.ph) * 0.06, dt * 4);
      m.halo.material.opacity = 0.2 + 0.4 * m.hot;
    });

    // 전구의 빛
    const b = this.bulb;
    b.k = lerp(b.k, b.kT, dt * 14);
    const flick = this.state && this.state.cr ? 0.8 + 0.2 * Math.sin(t * 31) * Math.sin(t * 7.3) : 1;
    b.light.intensity = 6.5 * b.k * flick;
    b.glass.emissiveIntensity = 0.12 + 0.95 * b.k * flick;
    b.glass.color.setHex(b.k > 0.5 ? 0xfff3c9 : 0x9fb4e6);
    b.glass.emissive.setHex(b.k > 0.5 ? 0xffc45e : 0x4a64c8);
    b.glass.opacity = 0.62 + 0.36 * b.k;
    b.fil.material.color.setHex(b.k > 0.5 ? 0xff8a2a : 0x56627e);
    b.halo.material.opacity = 0.12 + 0.7 * b.k * flick;
    b.halo.material.map = b.k > 0.5 ? this.tex.warm : this.tex.cool;
    b.halo.scale.setScalar(1.3 + 1.2 * b.k);
    this.hemi.intensity = 1.25 - 0.5 * b.k;
    this.moon.intensity = 1.5 - 0.8 * b.k;

    // 출구
    const ex = this.exit;
    ex.ring.rotation.z = t * 0.8;
    const won = ex.winT ? Math.min(1, (ex.win || 0)) : 0;
    ex.rm.emissiveIntensity = 0.6 + 0.3 * Math.sin(t * 3) + won * 3;
    ex.beam.material.opacity = 0.35 + 0.12 * Math.sin(t * 2) + won * 0.6;
    ex.beam.scale.set(0.9 + won * 2.5, 1.8 + won * 3, 1);

    // 깨진 조각
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const q = this.shards[i];
      q.life -= dt;
      q.v.y -= 9 * dt;
      q.m.position.addScaledVector(q.v, dt);
      q.m.rotation.x += dt * 9; q.m.rotation.z += dt * 7;
      if (q.life <= 0) { this.scene.remove(q.m); this.shards.splice(i, 1); }
    }

    // 카메라: 살짝 비스듬히 내려다보며 아주 천천히 흔들린다
    this.pulse = Math.max(0, this.pulse - dt * 3);
    const sway = Math.sin(t * 0.25) * 0.05;
    const dir = new THREE.Vector3(0.17 + sway, 0.86, 0.6).normalize();
    const shake = this.pulse * 0.06;
    const look = new THREE.Vector3(this.cam.target.x, this.cam.target.y - 0.2, this.cam.target.z + (this.cam.lift || 0));
    this.camera.position.copy(look).addScaledVector(dir, this.cam.dist);
    this.camera.position.x += (Math.random() - 0.5) * shake; this.camera.position.y += (Math.random() - 0.5) * shake;
    this.camera.lookAt(look);
    this.stars.rotation.y = t * 0.004;
    this.renderer.render(this.scene, this.camera);
  }
}
