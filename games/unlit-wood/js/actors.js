// 배우들: 전구 머리 아이, 나방, 그림자, 감시자, 그리고 움직이는 소품
// 자세는 1초에 12번만 바뀐다 (스톱모션의 '두 프레임에 한 번').
import * as THREE from '../vendor/three.module.min.js';
import { rng, clayify, roundBox, clayMat, clayMesh } from './clay.js';
import { P, CRATE } from './world.js';

const V2 = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y));
const lathe = (pts, seg, o) => clayify(new THREE.LatheGeometry(V2(pts), seg), o);
const capsule = (r, len, o) => { const g = new THREE.CapsuleGeometry(r, len, 4, 8); g.translate(0, -len / 2 - r * 0.6, 0); return clayify(g, o); };
const glow = (tex, color, scale, opacity = 1) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity, fog: false }));
  s.scale.setScalar(scale);
  return s;
};
const WARM = 0xffb657;

// ───────── 주인공: 전구 머리를 한 점토 아이 ─────────
export function makeHero(tex) {
  const g = new THREE.Group(), rig = new THREE.Group(), pose = new THREE.Group();
  g.add(rig); rig.add(pose);
  const cloth = clayMat({ rough: 0.66, bump: 1.0, boil: 0.011 });
  const body = clayMesh(lathe([[0, 0.25], [0.2, 0.26], [0.24, 0.33], [0.205, 0.5], [0.15, 0.68], [0.1, 0.81], [0, 0.85]], 14, { amp: 0.026, freq: 3.2, fine: 0.008, color: 0xd8d0c0, color2: 0xb4aa98, uv: 1.0 }), cloth);
  pose.add(body);
  const limb = (x, y, r, len, col, foot) => {
    const piv = new THREE.Group(); piv.position.set(x, y, 0);
    piv.add(clayMesh(capsule(r, len, { amp: 0.008, freq: 5, color: col, color2: 0x6e665c, uv: 2 }), cloth));
    const e = new THREE.IcosahedronGeometry(1, 1); e.scale(foot[0], foot[1], foot[2]); e.translate(0, -len - r * 1.4, foot[3]);
    piv.add(clayMesh(clayify(e, { amp: 0.008, color: foot[4], uv: 2 }), cloth));
    pose.add(piv);
    return piv;
  };
  const legL = limb(-0.08, 0.31, 0.05, 0.17, 0x8c8376, [0.062, 0.045, 0.1, 0.035, 0x3b3530]);
  const legR = limb(0.08, 0.31, 0.05, 0.17, 0x8c8376, [0.062, 0.045, 0.1, 0.035, 0x3b3530]);
  const armL = limb(-0.185, 0.71, 0.042, 0.2, 0xa69c8a, [0.05, 0.05, 0.05, 0, 0xe0d8c8]);
  const armR = limb(0.185, 0.71, 0.042, 0.2, 0xa69c8a, [0.05, 0.05, 0.05, 0, 0xe0d8c8]);
  // 목도리
  const scarfMat = clayMat({ rough: 0.7, bump: 1.1, boil: 0.012 });
  const ring = new THREE.TorusGeometry(0.115, 0.05, 7, 14); ring.rotateX(Math.PI / 2); ring.translate(0, 0.83, 0);
  pose.add(clayMesh(clayify(ring, { amp: 0.012, freq: 6, color: 0xc4572c, color2: 0x96391f, uv: 2 }), scarfMat));
  const tail = new THREE.Group(); tail.position.set(0.05, 0.82, -0.12);
  const tg = roundBox(0.085, 0.3, 0.035, 0.015, 0.08); tg.translate(0, -0.15, 0);
  tail.add(clayMesh(clayify(tg, { amp: 0.008, color: 0xc4572c, color2: 0x96391f, uv: 2 }), scarfMat));
  pose.add(tail);
  // 소켓과 전구
  const head = new THREE.Group(); pose.add(head);
  const sock = new THREE.CylinderGeometry(0.082, 0.095, 0.1, 12, 2); sock.translate(0, 0.9, 0);
  head.add(clayMesh(clayify(sock, { amp: 0.006, fine: 0.004, color: 0x6a6052, color2: 0x4a4339, uv: 3 }), clayMat({ rough: 0.5, metal: 0.35, boil: 0.006 })));
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xdfe9ec, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.4, emissive: 0xff9a3c, emissiveIntensity: 0, depthWrite: false });
  const glass = new THREE.Mesh(new THREE.LatheGeometry(new THREE.SplineCurve(V2([[0.062, 0.94], [0.085, 0.985], [0.155, 1.05], [0.2, 1.13], [0.19, 1.21], [0.13, 1.27], [0.001, 1.297]])).getPoints(22), 28), glassMat);
  head.add(glass);
  const filMat = new THREE.MeshBasicMaterial({ color: 0x2a2622 });
  const fil = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.011, 5, 12, Math.PI * 1.5), filMat); fil.position.y = 1.12; fil.rotation.z = Math.PI * 0.75;
  const stemG = new THREE.CylinderGeometry(0.008, 0.008, 0.16, 4); stemG.translate(0, 1.02, 0);
  head.add(fil, new THREE.Mesh(stemG, filMat));
  const cpts = []; for (let i = 0; i <= 9; i++) { const y = 1.27 - i * 0.026, a = -0.5 + i * 0.23 + (i % 2 ? 0.22 : -0.12), rr = 0.205 * Math.sqrt(Math.max(0.05, 1 - ((y - 1.13) / 0.175) ** 2)); cpts.push(new THREE.Vector3(Math.sin(a) * rr, y, Math.cos(a) * rr)); }
  const crack = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cpts, false, 'catmullrom', 0.1), 24, 0.007, 4), new THREE.MeshBasicMaterial({ color: 0x15110e }));
  crack.visible = false; head.add(crack);
  const halo = glow(tex, 0xffb860, 1.15, 0.6), aura = glow(tex, 0xffb060, 6.5, 0.12);
  halo.position.y = 1.13; aura.position.y = 1.13; g.add(halo, aura);

  const S = { phase: 0, pq: 0, lastTick: -1, squash: 0, pop: 0, fall: 0, lit: 0, idle: 0 };
  return {
    group: g,
    headPos: new THREE.Vector3(),
    land(drop) { S.squash = Math.min(1, 0.35 + drop * 0.18); },
    lightPop() { S.pop = 1; },
    reset() { S.fall = 0; S.squash = 0; pose.rotation.set(0, 0, 0); pose.position.set(0, 0, 0); head.visible = true; },
    update(p, c) {
      const dt = c.dt;
      g.position.set(p.x, -p.y, 0);
      this.headPos.set(p.x, -p.y + 1.13, 0);
      const tgt = p.face > 0 ? 1.08 : -1.08;
      rig.rotation.y += (tgt - rig.rotation.y) * Math.min(1, dt * 16);
      const sp = Math.min(1, Math.abs(p.vx) / P.RUN);
      S.phase += Math.abs(p.vx) * dt * 3.7 * (p.vx * p.face < 0 ? -1 : 1);
      S.squash = Math.max(0, S.squash - dt * 6); S.pop = Math.max(0, S.pop - dt * 5);
      S.idle = sp < 0.05 && p.ground ? S.idle + dt : 0;
      // 빛
      const on = p.lit && !p.dead;
      S.lit += ((on ? 1 : 0) - S.lit) * Math.min(1, dt * 22);
      let fl = 1 + Math.sin(c.tick * 7.3) * 0.03;
      if (p.cracked) fl *= 0.62 + 0.38 * Math.abs(Math.sin(c.tick * 12.9898) * 43758.5453 % 1);
      this.flicker = fl * S.lit;
      glassMat.emissiveIntensity = 0.62 * this.flicker; glassMat.opacity = 0.4 + 0.45 * S.lit;
      filMat.color.setHex(on ? 0xfff2d0 : 0x2a2622);
      halo.visible = aura.visible = S.lit > 0.02 && !p.dead;
      halo.material.opacity = 0.55 * this.flicker; halo.scale.setScalar(1.15 + S.pop * 0.9);
      aura.material.opacity = 0.12 * this.flicker;
      crack.visible = p.cracked && !p.dead;
      pose.visible = p.dead || !(p.inv > 0 && c.tick % 2 === 0);      // 다친 직후에는 깜빡인다
      head.visible = !p.dead;
      if (p.dead) {       // 머리가 깨지고, 몸은 그 자리에 쓰러진다
        S.fall = Math.min(1, S.fall + dt * 3.2);
        const k = Math.round(S.fall * 5) / 5;
        pose.rotation.set(-1.45 * k, 0, 0); pose.position.y = -0.02 * k;
        return;
      }
      if (c.tick === S.lastTick) return;      // 자세는 12fps 로만
      S.lastTick = c.tick; S.pq = S.phase;
      const sw = Math.sin(S.pq), air = !p.ground && p.coyote <= 0;
      let lean = 0.16 * sp, aL, aR, lL, lR, az = 0.34, bob = 0;
      if (air) {
        const up = p.vy < 0;
        lL = up ? -0.75 : -0.2; lR = up ? 0.5 : 0.35; aL = up ? -1.5 : -0.4; aR = up ? 0.7 : -0.4; az = up ? 0.25 : 1.75; lean = up ? 0.2 : -0.08;
      } else {
        lL = sw * 0.8 * sp; lR = -sw * 0.8 * sp; aL = -sw * 0.6 * sp; aR = sw * 0.6 * sp; bob = Math.abs(Math.cos(S.pq)) * 0.035 * sp;
        if (p.grab || p.pushing) {
          const pull = p.pushing && p.grab && p.pushing === -p.grabSide;
          aL = aR = -1.3; lean = pull ? -0.28 : p.pushing ? 0.34 : 0.08; az = 0.12;
          lL = sw * 0.55; lR = -sw * 0.55;
        } else if (sp < 0.05) { aL = 0.06 + Math.sin(c.tick * 0.5) * 0.04; aR = 0.06 - Math.sin(c.tick * 0.5) * 0.04; }
      }
      legL.rotation.x = lL; legR.rotation.x = lR; armL.rotation.x = aL; armR.rotation.x = aR; armL.rotation.z = -az; armR.rotation.z = az;
      const sq = Math.round(S.squash * 4) / 4;
      pose.rotation.x = lean; pose.position.y = bob - 0.02;
      pose.scale.set(1 + sq * 0.14, 1 - sq * 0.2 + (S.idle > 0 ? Math.sin(c.tick * 0.45) * 0.012 : 0), 1 + sq * 0.14);
      tail.rotation.x = -0.25 - sp * 1.15 - (air ? 0.5 : 0) + Math.sin(c.tick * 1.3) * 0.08;
      head.rotation.z = S.idle > 2.5 ? Math.sin(c.tick * 0.21) * 0.1 : 0;
    },
  };
}

// 깨진 유리 조각 (머리가 깨질 때 튄다)
export function makeGlassBurst() {
  const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: 0xdfe9ec, roughness: 0.1, transparent: true, opacity: 0.7 });
  const bits = [], geo = new THREE.TetrahedronGeometry(0.07);
  for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(geo, mat); m.visible = false; g.add(m); bits.push({ m, vx: 0, vy: 0, vz: 0, floor: 0, rx: 0, rz: 0 }); }
  const r = rng(99);
  return {
    group: g,
    burst(x, y, floor) {
      for (const b of bits) {
        b.m.visible = true; b.m.position.set(x + (r() - 0.5) * 0.2, y + (r() - 0.5) * 0.2, (r() - 0.5) * 0.2);
        b.m.scale.set(0.5 + r() * 1.3, 0.4 + r(), 0.5 + r());
        b.vx = (r() - 0.5) * 5; b.vy = 1 + r() * 4.5; b.vz = (r() - 0.5) * 3.5; b.floor = floor + 0.04; b.rx = (r() - 0.5) * 14; b.rz = (r() - 0.5) * 14;
      }
    },
    clear() { for (const b of bits) b.m.visible = false; },
    update(dt) {
      for (const b of bits) {
        if (!b.m.visible || (b.vy === 0 && b.vx === 0)) continue;
        b.vy -= 22 * dt; b.m.position.x += b.vx * dt; b.m.position.y += b.vy * dt; b.m.position.z += b.vz * dt;
        b.m.rotation.x += b.rx * dt; b.m.rotation.z += b.rz * dt;
        if (b.m.position.y < b.floor) { b.m.position.y = b.floor; if (Math.abs(b.vy) < 1.5) { b.vx = b.vy = b.vz = 0; b.rx = b.rz = 0; } else { b.vy *= -0.3; b.vx *= 0.5; b.vz *= 0.5; } }
      }
    },
  };
}

// ───────── 등불 (다시 서는 곳) ─────────
export function makeLantern(l, tex) {
  const g = new THREE.Group(); g.position.set(l.x, -l.y, -0.95);
  const iron = clayMat({ rough: 0.6, boil: 0.005 });
  const post = new THREE.CylinderGeometry(0.05, 0.075, 2.1, 7, 4); post.translate(-0.42, 1.0, 0);
  const arm = new THREE.CylinderGeometry(0.035, 0.04, 0.5, 6, 2); arm.rotateZ(Math.PI / 2); arm.translate(-0.2, 2.0, 0);
  const capG = new THREE.ConeGeometry(0.2, 0.16, 6, 1); capG.translate(0, 1.84, 0);
  const baseG = new THREE.CylinderGeometry(0.15, 0.17, 0.07, 6, 1); baseG.translate(0, 1.42, 0);
  for (const gg of [post, arm, capG, baseG]) g.add(clayMesh(clayify(gg, { amp: 0.014, freq: 3, color: 0x3d3a37, color2: 0x26231f, uv: 1.5 }), iron));
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x8f989a, roughness: 0.2, transparent: true, opacity: 0.5, emissive: WARM, emissiveIntensity: 0 });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 9), coreMat); core.position.y = 1.62; core.scale.y = 1.25; g.add(core);
  const halo = glow(tex, 0xffbe6e, 2.4); halo.position.y = 1.62; halo.visible = false; g.add(halo);
  let k = 0;
  return {
    group: g, pos: new THREE.Vector3(l.x, -l.y + 1.62, -0.6),
    update(lit, c) {
      k += ((lit ? 1 : 0) - k) * Math.min(1, c.dt * 5);
      const f = k * (1 + Math.sin(c.tick * 3.1 + l.x) * 0.06);
      coreMat.emissiveIntensity = 2.2 * f; coreMat.opacity = 0.5 + 0.45 * k;
      halo.visible = k > 0.02; halo.material.opacity = f; halo.scale.setScalar(2.4 + (lit && k < 0.9 ? (1 - k) * 2.5 : 0));
      this.level = f;
    },
  };
}

// ───────── 빛꽃 ─────────
export function makeFlower(f, tex) {
  const g = new THREE.Group(); g.position.set(f.x, -f.y, -0.55);
  const mat = clayMat({ rough: 0.7, boil: 0.008 });
  const stem = new THREE.CylinderGeometry(0.022, 0.03, 0.4, 5, 3); stem.translate(0, 0.2, 0);
  g.add(clayMesh(clayify(stem, { amp: 0.01, color: 0x4d5a3f, uv: 2 }), mat));
  const leaf = new THREE.IcosahedronGeometry(1, 1); leaf.scale(0.12, 0.02, 0.05); leaf.translate(0.1, 0.12, 0);
  g.add(clayMesh(clayify(leaf, { amp: 0.006, color: 0x4d5a3f, uv: 2 }), mat));
  const headG = new THREE.Group(); headG.position.y = 0.42; g.add(headG);
  const petMat = clayMat({ rough: 0.6, boil: 0.008, emissive: 0xfff0c8, emissiveIntensity: 0 });
  const petals = [];
  for (let i = 0; i < 6; i++) {
    const pv = new THREE.Group(); pv.rotation.y = i / 6 * Math.PI * 2;
    const pg = new THREE.IcosahedronGeometry(1, 1); pg.scale(0.035, 0.1, 0.06); pg.translate(0, 0.1, 0);
    const pm = clayMesh(clayify(pg, { amp: 0.006, color: 0xbfc4c9, color2: 0x9aa3ad, uv: 2 }), petMat, false);
    pv.add(pm); headG.add(pv); petals.push(pm);
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0x3a3a35 })); headG.add(core);
  const halo = glow(tex, 0xfff0c0, 1.5); halo.position.y = 0.45; halo.visible = false; g.add(halo);
  let k = f.on ? 1 : 0;
  const apply = () => {
    const q = Math.round(k * 6) / 6;
    for (const pm of petals) pm.rotation.x = 0.12 + q * 1.15;
    petMat.emissiveIntensity = q * 0.55; core.material.color.setHex(q > 0.3 ? 0xfff6dc : 0x3a3a35);
    halo.visible = q > 0.1; halo.material.opacity = q * 0.75;
  };
  apply();
  return { group: g, update(on, c) { const t = on ? 1 : 0; if (k !== t) { k = Math.min(1, Math.max(0, k + (t > k ? 1 : -1) * c.dt * 2)); apply(); } if (on) halo.scale.setScalar(1.5 + Math.sin(c.tick * 0.7 + f.x) * 0.12); } };
}

// ───────── 유리 조각 밭, 상자 ─────────
export function makeShards(s, seed) {
  const g = new THREE.Group(), r = rng(seed * 31 + 5);
  const mat = new THREE.MeshStandardMaterial({ color: 0xa9c0c6, roughness: 0.12, metalness: 0.25, transparent: true, opacity: 0.62, flatShading: true });
  for (let i = 0; i < 11; i++) {
    const hgt = 0.14 + r() * 0.26, geo = new THREE.ConeGeometry(0.05 + r() * 0.05, hgt, 3, 1);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(s.x + 0.12 + r() * 0.76, -(s.y + 1) + hgt / 2 - 0.02, -1.0 + r() * 2.0);
    m.rotation.set((r() - 0.5) * 0.7, r() * 6.3, (r() - 0.5) * 0.7);
    g.add(m);
  }
  return g;
}
export function makeCrate() {
  const g = new THREE.Group(), mat = clayMat({ rough: 0.66, bump: 1.1, boil: 0.006 });
  g.add(clayMesh(clayify(roundBox(CRATE, CRATE, 1.1, 0.07, 0.24), { amp: 0.022, freq: 2.2, color: 0x77593b, color2: 0x54402c, uv: 0.9 }), mat));
  for (const y of [-0.3, 0, 0.3]) { const b = roundBox(CRATE + 0.03, 0.03, 1.13, 0.01, 0.5); b.translate(0, y, 0); g.add(clayMesh(clayify(b, { amp: 0.004, color: 0x2e2218 }), mat, false)); }
  for (const x of [-0.4, 0.4]) { const b = roundBox(0.1, CRATE + 0.04, 1.14, 0.02, 0.5); b.translate(x, 0, 0); g.add(clayMesh(clayify(b, { amp: 0.008, color: 0x3d3a37, color2: 0x26231f }), mat, false)); }
  return g;
}

// ───────── 나방 떼 ─────────
export function makeMoths(m, seed) {
  const g = new THREE.Group(), r = rng(seed * 17 + 3), N = 7;
  const mat = clayMat({ rough: 0.85, boil: 0.01, side: THREE.DoubleSide, emissive: 0xbfc8d8, emissiveIntensity: 0.05 });
  const bodyG = clayify((() => { const b = new THREE.CapsuleGeometry(0.035, 0.1, 3, 6); b.rotateX(Math.PI / 2); return b; })(), { amp: 0.004, color: 0x8d8478, color2: 0x5f574e, uv: 3 });
  const wingG = clayify((() => { const w = new THREE.CircleGeometry(0.095, 12); w.scale(1.2, 0.85, 1); w.rotateX(-Math.PI / 2); w.translate(0.105, 0, 0.01); return w; })(), { amp: 0.004, color: 0xcfc4ad, color2: 0x94897a, uv: 3 });
  const list = [];
  for (let i = 0; i < N; i++) {
    const mo = new THREE.Group(), wl = new THREE.Mesh(wingG, mat), wr = new THREE.Mesh(wingG, mat);
    wr.scale.x = -1; mo.add(new THREE.Mesh(bodyG, mat), wl, wr);
    const a = i / N * 6.283;
    list.push({ mo, wl, wr, a, f1: 2.1 + r() * 2.3, f2: 1.7 + r() * 2.1, f3: 1.3 + r() * 1.7, ph: r() * 6.3, roost: new THREE.Vector3(Math.cos(a) * 0.3, -0.05 - (i % 3) * 0.07, Math.sin(a) * 0.26 - 0.2) });
    g.add(mo);
  }
  let fly = 0;
  return {
    group: g,
    update(s, c) {
      const flying = s.state !== 'roost';
      fly += ((flying ? 1 : 0) - fly) * Math.min(1, c.dt * 5);
      g.position.set(s.x, -s.y, 0.15 * fly);
      const tq = c.tick / 12, stir = Math.min(1, s.alert / P.MOTH_ALERT), chase = s.state === 'chase' ? 0.7 : 1;
      for (let i = 0; i < list.length; i++) {
        const o = list[i];
        const fx = Math.sin(tq * o.f1 * 3 + o.ph) * 0.5 * chase, fy = Math.cos(tq * o.f2 * 3 + o.ph * 2) * 0.36 * chase, fz = Math.sin(tq * o.f3 * 3 + o.ph) * 0.45;
        const jit = !flying && stir > 0 ? Math.sin(c.tick * 2.7 + i) * 0.03 * stir : 0;
        o.mo.position.set(o.roost.x * (1 - fly) + fx * fly + jit, o.roost.y * (1 - fly) + fy * fly, o.roost.z * (1 - fly) + fz * fly);
        o.mo.rotation.y = fly > 0.5 ? Math.atan2(Math.cos(tq * o.f1 * 3 + o.ph), 0.4) : o.a;
        const flap = fly > 0.3 ? ((c.tick + i) % 2 ? 0.95 : -0.35) : (stir > 0 && (c.tick + i) % 3 === 0 ? 0.8 : 1.25);
        o.wl.rotation.z = flap; o.wr.rotation.z = -flap;
      }
      mat.emissiveIntensity = 0.05 + 0.25 * Math.max(fly, stir);
    },
  };
}

// ───────── 그림자 ─────────
export function makeStalker() {
  const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig);
  const mat = clayMat({ rough: 0.42, bump: 1.4, boil: 0.016 });
  const o = { amp: 0.06, freq: 2.2, fine: 0.012, color: 0x1a1624, color2: 0x0e0c14, uv: 0.8 };
  rig.add(clayMesh(lathe([[0, 0], [0.36, 0.0], [0.38, 0.22], [0.28, 0.68], [0.22, 1.02], [0.26, 1.24], [0.2, 1.44], [0, 1.52]], 12, o), mat));
  const arm = (x) => { const pv = new THREE.Group(); pv.position.set(x, 1.02, 0.05); pv.add(clayMesh(capsule(0.055, 0.82, { ...o, amp: 0.015 }), mat)); rig.add(pv); return pv; };
  const aL = arm(-0.27), aR = arm(0.27);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd6e6ff, fog: false });
  const eyes = new THREE.Group();
  for (const x of [-0.085, 0.085]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), eyeMat); e.position.set(x, 1.3, 0.22); eyes.add(e); }
  rig.add(eyes);
  let last = -1;
  return {
    group: g,
    update(s, c) {
      g.position.set(s.x, -s.y, 0.05);
      const k = Math.round(s.sink * 6) / 6;
      g.scale.set(1 + k * 0.75, Math.max(0.05, 1 - k * 0.95), 1 + k * 0.75);
      eyes.scale.setScalar(Math.max(0.001, 1 - k * 1.3));
      const tgt = s.face > 0 ? 1.0 : -1.0;
      rig.rotation.y += (tgt - rig.rotation.y) * Math.min(1, c.dt * 8);
      if (c.tick === last) return; last = c.tick;
      const sw = Math.sin(c.tick * (s.moving ? 0.9 : 0.3) + s.home);
      rig.rotation.z = sw * (s.moving ? 0.07 : 0.03); rig.rotation.x = s.moving ? 0.16 : 0.04;
      aL.rotation.x = s.moving ? -0.5 + sw * 0.5 : sw * 0.08; aR.rotation.x = s.moving ? -0.5 - sw * 0.5 : -sw * 0.08;
      aL.rotation.z = -0.12; aR.rotation.z = 0.12;
    },
  };
}

// ───────── 감시자: 장대 끝의 눈 ─────────
export function makeWatcher(wt) {
  const g = new THREE.Group(), headG = new THREE.Group();
  headG.position.set(wt.x, -wt.y, -0.2); g.add(headG);
  const mat = clayMat({ rough: 0.55, boil: 0.008 });
  const ball = new THREE.SphereGeometry(0.62, 18, 12);
  headG.add(clayMesh(clayify(ball, { amp: 0.04, freq: 2.2, color: 0x363941, color2: 0x23252b, uv: 0.9 }), mat, false));
  const hood = new THREE.CylinderGeometry(0.5, 0.66, 0.5, 14, 2, true); hood.rotateX(Math.PI / 2); hood.translate(0, 0, 0.55);
  headG.add(clayMesh(clayify(hood, { amp: 0.02, color: 0x2b2d33, color2: 0x1b1c20, uv: 0.9 }), clayMat({ rough: 0.6, boil: 0.006, side: THREE.DoubleSide }), false));
  const lensMat = new THREE.MeshBasicMaterial({ color: 0xd8e6ff, fog: false });
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.4, 20), lensMat); lens.position.z = 0.6; headG.add(lens);
  const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.15, 14), new THREE.MeshBasicMaterial({ color: 0x0b0c10, fog: false })); pupil.position.z = 0.61; headG.add(pupil);
  const cg = new THREE.CylinderGeometry(0.2, 1, 1, 28, 1, true); cg.translate(0, -0.5, 0);
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xbcd4ff, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const cone = new THREE.Mesh(cg, coneMat); cone.position.copy(headG.position); cone.renderOrder = 5; g.add(cone);
  const tgt = new THREE.Vector3(), dir = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0), cool = new THREE.Color(0xbcd4ff), hot = new THREE.Color(0xff5a44), col = new THREE.Color();
  return {
    group: g, pos: headG.position, target: tgt, color: col, heat: 0,
    update(s, c) {
      tgt.set(s.gx, -s.gy, 0);
      headG.lookAt(tgt);
      dir.subVectors(tgt, headG.position); const len = dir.length();
      cone.quaternion.setFromUnitVectors(down, dir.normalize());
      const rad = P.WATCH_HALF * 1.25 * (0.9 + 0.1 * len / 10);
      cone.scale.set(rad, len + 0.4, rad);
      this.heat += ((s.seen > 0 || s.sees ? 1 : 0) - this.heat) * Math.min(1, c.dt * 14);
      col.copy(cool).lerp(hot, this.heat);
      coneMat.color.copy(col); coneMat.opacity = 0.05 + 0.07 * this.heat; lensMat.color.copy(col);
      this.angle = Math.atan2(rad, len);
    },
  };
}

// ───────── 승강대 ─────────
export function makeLift(lf) {
  const g = new THREE.Group(), mat = clayMat({ rough: 0.78, boil: 0.006 });
  const deck = roundBox(lf.w - 0.04, P.LIFT_H, 2.5, 0.08, 0.4);
  const plat = new THREE.Group(); g.add(plat);
  plat.add(clayMesh(clayify(deck, { amp: 0.025, freq: 1.8, color: 0x6d5238, color2: 0x4b3827, uv: 0.8 }), mat));
  for (const x of [-lf.w / 2 + 0.12, lf.w / 2 - 0.12]) { const pg = new THREE.CylinderGeometry(0.045, 0.05, 1.0, 6, 2); pg.translate(x, 0.7, -1.1); plat.add(clayMesh(clayify(pg, { amp: 0.008, color: 0x4a3a2c }), mat)); }
  const rail = new THREE.CylinderGeometry(0.04, 0.04, lf.w - 0.2, 6, 2); rail.rotateZ(Math.PI / 2); rail.translate(0, 1.15, -1.1);
  plat.add(clayMesh(clayify(rail, { amp: 0.008, color: 0x4a3a2c }), mat));
  const cellMat = new THREE.MeshStandardMaterial({ color: 0x7f8c90, roughness: 0.15, transparent: true, opacity: 0.6, emissive: WARM, emissiveIntensity: 0 });
  const cell = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8, 0, 6.3, 0, 1.6), cellMat); cell.position.set(0, 1.19, -1.1); plat.add(cell);
  const ropeMat = clayMat({ vertexColors: false, color: 0x6b5d48, rough: 0.9, boil: 0.004 });
  const ropes = [];
  for (const x of [-lf.w / 2 + 0.12, lf.w / 2 - 0.12]) { const rg = new THREE.CylinderGeometry(0.022, 0.022, 1, 5, 1); rg.translate(0, 0.5, 0); const rm = new THREE.Mesh(rg, ropeMat); rm.position.set(lf.x + lf.w / 2 + x, 0, -1.1); g.add(rm); ropes.push(rm); }
  let k = 0;
  return {
    group: g,
    update(s, c) {
      plat.position.set(s.x + s.w / 2, -s.y - P.LIFT_H / 2, -0.05);
      const top = -s.y + 1.2;
      for (const rm of ropes) { rm.position.y = top; rm.scale.y = Math.max(0.05, -4.75 - top); }
      k += ((s.lit ? 1 : 0) - k) * Math.min(1, c.dt * 8);
      cellMat.emissiveIntensity = 2.4 * k;
    },
  };
}

// ───────── 밀물: 뒤에서 덮쳐 오는 어둠 ─────────
export function makeTide(baseY) {
  const g = new THREE.Group(), r = rng(4242);
  const mat = clayMat({ rough: 0.4, bump: 1.4, boil: 0.03 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd6e6ff, fog: false });
  const lumps = [];
  for (let i = 0; i < 22; i++) {
    const rad = 0.9 + r() * 1.1, geo = new THREE.IcosahedronGeometry(rad, 2);
    const m = clayMesh(clayify(geo, { amp: 0.16, freq: 1.1, color: 0x15121d, color2: 0x08070c, uv: 0.5 }), mat, false);
    const hx = -0.4 - r() * 2.6, hy = baseY - 5 + (i / 22) * 15 + (r() - 0.5), hz = -3.2 + r() * 5.6;
    m.position.set(hx, hy, hz); g.add(m);
    const n = r() < 0.7 ? 2 : 0;
    for (let k = 0; k < n; k++) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05 + r() * 0.03, 6, 5), eyeMat); e.position.set(rad * 0.82, (r() - 0.3) * rad * 0.6, (k ? 0.16 : -0.16) + (r() - 0.5) * 0.5); m.add(e); }
    lumps.push({ m, hx, hy, hz, ph: r() * 6.3, f: 0.6 + r() * 0.8 });
  }
  const wall = new THREE.Mesh(new THREE.BoxGeometry(90, 70, 16), new THREE.MeshBasicMaterial({ color: 0x030305, fog: false }));
  wall.position.set(-46.6, baseY, -1); g.add(wall);
  g.visible = false;
  let k = 0, last = -1;
  return {
    group: g,
    update(td, ended, c) {
      const want = td.on && !ended ? 1 : 0;
      k += (want - k) * Math.min(1, c.dt * (want ? 6 : 1.3));
      g.visible = k > 0.01;
      if (!g.visible) return;
      if (td.on) g.position.x = td.x; else g.position.x -= c.dt * 5;
      g.scale.set(1, 1, 1); wall.visible = k > 0.5;
      if (c.tick === last) return; last = c.tick;
      for (const l of lumps) {
        const a = c.tick * 0.5 * l.f + l.ph;
        l.m.position.set(l.hx + Math.sin(a) * 0.45 + (1 - k) * -3, l.hy + Math.cos(a * 0.8) * 0.3, l.hz);
        l.m.scale.setScalar(k * (1 + Math.sin(a * 1.3) * 0.08));
      }
    },
  };
}

// ───────── 큰 등 ─────────
export function makeGreatLamp(lm, tex) {
  const g = new THREE.Group(); g.position.set(lm.x, -lm.y + 1.7, -1.55);
  const sock = new THREE.CylinderGeometry(0.42, 0.55, 0.6, 14, 3); sock.translate(0, 0.25, 0);
  g.add(clayMesh(clayify(sock, { amp: 0.025, color: 0x6a6052, color2: 0x4a4339, uv: 1 }), clayMat({ rough: 0.5, metal: 0.3, boil: 0.005 })));
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xaab6ba, roughness: 0.12, transparent: true, opacity: 0.34, emissive: 0xffc070, emissiveIntensity: 0, depthWrite: false });
  const glass = new THREE.Mesh(new THREE.LatheGeometry(new THREE.SplineCurve(V2([[0.36, 0.5], [0.5, 0.75], [0.95, 1.2], [1.25, 1.8], [1.3, 2.3], [1.15, 2.85], [0.75, 3.3], [0.001, 3.5]])).getPoints(30), 36), glassMat);
  g.add(glass);
  const filMat = new THREE.MeshBasicMaterial({ color: 0x2a2622 });
  const fil = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 6, 16, Math.PI * 1.5), filMat); fil.position.y = 2.1; fil.rotation.z = Math.PI * 0.75; g.add(fil);
  const stemG = new THREE.CylinderGeometry(0.03, 0.03, 1.4, 5); stemG.translate(0, 1.25, 0); g.add(new THREE.Mesh(stemG, filMat));
  const halo = glow(tex, 0xffd9a0, 6, 0); halo.position.y = 2.2; g.add(halo);
  return {
    group: g, pos: new THREE.Vector3(lm.x, -lm.y + 3.9, -0.6), level: 0,
    update(lit, endT, c) {
      const k = lit ? Math.min(1, endT / 2.2) : 0;
      this.level = k * k * (3 - 2 * k);
      glassMat.emissiveIntensity = 3.2 * this.level; glassMat.opacity = 0.34 + 0.6 * this.level;
      filMat.color.setHex(lit ? 0xfff2d0 : 0x2a2622);
      halo.material.opacity = this.level; halo.scale.setScalar(6 + this.level * 16 + Math.sin(c.tick * 0.6) * 0.3 * this.level);
    },
  };
}
