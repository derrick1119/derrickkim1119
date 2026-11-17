// 배우와 소품: 빛 알갱이, 깃들 수 있는 것들(등불 · 검 · 활), 어둠의 아이들, 데이와 나이트
// 자세는 1초에 12번만 바뀐다 (스톱모션).
import * as THREE from '../vendor/three.module.min.js';
import { rng, clayify, roundBox, clayMat, clayMesh } from './clay.js';
import { P, VESSEL } from './world.js';

const V2 = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y));
const lathe = (pts, seg, o) => clayify(new THREE.LatheGeometry(V2(pts), seg), o);
const ball = (rx, ry, rz, x, y, z, o, det = 1) => { const g = new THREE.IcosahedronGeometry(1, det); g.scale(rx, ry, rz); g.translate(x, y, z); return clayify(g, { amp: 0.01, uv: 2, ...o }); };
export const glow = (tex, color, scale, opacity = 1) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity, fog: false }));
  s.scale.setScalar(scale);
  return s;
};
const WARM = 0xffb657, basic = (c) => new THREE.MeshBasicMaterial({ color: c, fog: false });
const glass = (c = 0xdfe9ec) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.1, transparent: true, opacity: 0.45, emissive: 0xff9a3c, emissiveIntensity: 0, depthWrite: false });

// 깃들면 뜨는 두 눈
function makeEyes(x, y, z, gap = 0.07, r = 0.028) {
  const g = new THREE.Group(), m = basic(0xfff3d6);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), m); e.position.set(x + s * gap, y, z); g.add(e); }
  g.visible = false;
  return { g, set(on, tick) { g.visible = on; g.scale.y = on && tick % 37 === 0 ? 0.15 : 1; } };
}

// ───────── 빛 알갱이 (사도의 본모습) ─────────
export function makeWisp(tex) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 9), basic(0xfff6e0)));
  const halo = glow(tex, 0xffc884, 1.25, 0.9), aura = glow(tex, 0xffb060, 3.6, 0.16); g.add(halo, aura);
  const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 5, 1), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();
  return {
    group: g, thread,
    update(w, anchor, show, c) {
      g.visible = thread.visible = show; if (!show) return;
      const bob = Math.sin(c.tick * 0.5) * 0.04;
      g.position.set(w.x, -w.y + bob, 0.3);
      halo.scale.setScalar(1.25 + Math.sin(c.tick * 0.9) * 0.08);
      d.set(w.x - anchor.x, -(w.y - anchor.y), 0.3); const len = d.length();
      thread.visible = len > 0.4;
      thread.position.set((w.x + anchor.x) / 2, -(w.y + anchor.y) / 2, 0.15); thread.scale.set(1, len, 1);
      thread.quaternion.setFromUnitVectors(up, d.normalize());
      thread.material.opacity = 0.15 + 0.5 * Math.min(1, len / P.TETHER) ** 2;      // 멀어질수록 팽팽하게 빛난다
    },
  };
}

// ───────── 깃들 수 있는 것들 ─────────
export function makeVessel(kind, tex) {
  const g = new THREE.Group(), pose = new THREE.Group(); g.add(pose);
  const S = { phase: 0, last: -1, squash: 0, lit: 0, shoot: 0 };
  let parts = {};
  if (kind === 'lantern') {
    const iron = clayMat({ rough: 0.55, boil: 0.008 });
    pose.add(clayMesh(clayify((() => { const b = new THREE.CylinderGeometry(0.2, 0.24, 0.12, 12, 1); b.translate(0, 0.08, 0); return b; })(), { amp: 0.012, color: 0x4a443e, color2: 0x2f2b28, uv: 2 }), iron));
    pose.add(clayMesh(clayify((() => { const b = new THREE.ConeGeometry(0.22, 0.14, 10, 1); b.translate(0, 0.6, 0); return b; })(), { amp: 0.012, color: 0x4a443e, color2: 0x2f2b28, uv: 2 }), iron));
    const ring = new THREE.TorusGeometry(0.075, 0.018, 5, 12); ring.translate(0, 0.71, 0); pose.add(clayMesh(clayify(ring, { amp: 0.004, color: 0x6a6052, uv: 3 }), iron, false));
    for (const a of [0.6, 2.2, 3.8, 5.4]) { const p = new THREE.CylinderGeometry(0.014, 0.014, 0.42, 4); p.translate(Math.cos(a) * 0.2, 0.34, Math.sin(a) * 0.2); pose.add(clayMesh(clayify(p, { amp: 0.002, color: 0x3a3632 }), iron, false)); }
    parts.glassMat = glass();
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 12), parts.glassMat); gl.position.y = 0.34; gl.scale.y = 1.1; pose.add(gl);
    parts.core = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), basic(0x2a2622)); parts.core.position.y = 0.32; pose.add(parts.core);
    parts.feet = [-1, 1].map((s) => { const f = clayMesh(ball(0.07, 0.04, 0.1, 0, 0, 0.03, { color: 0x3b3530 }), iron); f.position.set(s * 0.11, 0.03, 0); g.add(f); return f; });
    parts.eyes = makeEyes(0, 0.36, 0.19, 0.065, 0.03);
    parts.halo = glow(tex, 0xffb860, 1.5, 0); parts.halo.position.y = 0.34; parts.aura = glow(tex, 0xffb060, 7.5, 0); parts.aura.position.y = 0.34; g.add(parts.halo, parts.aura);
  } else if (kind === 'sword') {
    const steel = clayMat({ rough: 0.38, metal: 0.25, boil: 0.007, bump: 0.6, emissive: 0xffe2b0, emissiveIntensity: 0 });
    const hilt = clayMat({ rough: 0.6, boil: 0.008 });
    parts.steel = steel;
    const blade = roundBox(0.13, 0.62, 0.035, 0.015, 0.2); blade.translate(0, -0.2, 0);
    pose.add(clayMesh(clayify(blade, { amp: 0.006, color: 0xd3dae0, color2: 0xa9b3bd, uv: 2 }), steel));
    const tip = new THREE.ConeGeometry(0.075, 0.16, 4, 1); tip.rotateX(Math.PI); tip.scale(1, 1, 0.3); tip.translate(0, -0.575 + 0.08, 0);
    pose.add(clayMesh(clayify(tip, { amp: 0.003, color: 0xd3dae0, uv: 2 }), steel));
    const guard = roundBox(0.4, 0.075, 0.09, 0.03, 0.2); guard.translate(0, 0.145, 0);
    pose.add(clayMesh(clayify(guard, { amp: 0.008, color: 0xb08a48, color2: 0x8a6a34, uv: 2 }), hilt));
    const grip = new THREE.CylinderGeometry(0.036, 0.04, 0.26, 7, 2); grip.translate(0, 0.31, 0);
    pose.add(clayMesh(clayify(grip, { amp: 0.006, color: 0x5d3b2a, color2: 0x44291d, uv: 3 }), hilt));
    pose.add(clayMesh(ball(0.055, 0.055, 0.055, 0, 0.475, 0, { color: 0xb08a48 }), hilt));
    parts.ribbon = new THREE.Group(); parts.ribbon.position.set(0, 0.44, -0.02);
    const rb = roundBox(0.06, 0.34, 0.02, 0.01, 0.1); rb.translate(0, -0.17, 0); parts.ribbon.add(clayMesh(clayify(rb, { amp: 0.006, color: 0xc4572c, color2: 0x96391f, uv: 2 }), hilt)); pose.add(parts.ribbon);
    parts.eyes = makeEyes(0, 0.06, 0.03, 0.035, 0.022); pose.add(parts.eyes.g);
    parts.arc = new THREE.Mesh(new THREE.RingGeometry(0.75, 1.5, 24, 1, -0.95, 1.9), new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    parts.arc.position.set(0, 0.7, 0.2); g.add(parts.arc);
    parts.halo = glow(tex, 0xffd9a0, 1.1, 0); parts.halo.position.y = 0.6; g.add(parts.halo);
  } else {
    const wood = clayMat({ rough: 0.6, boil: 0.008 });
    const limb = new THREE.TorusGeometry(0.46, 0.035, 6, 18, Math.PI * 0.86); limb.rotateZ(-Math.PI * 0.43); limb.translate(-0.3, 0, 0);
    pose.add(clayMesh(clayify(limb, { amp: 0.008, color: 0x8a6238, color2: 0x64442a, uv: 2 }), wood));
    const grip = new THREE.CylinderGeometry(0.05, 0.05, 0.18, 7, 1); grip.translate(0.16, 0, 0);
    pose.add(clayMesh(clayify(grip, { amp: 0.005, color: 0x4a3324, uv: 3 }), wood));
    parts.string = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.84, 4), basic(0xe8dcc0)); parts.string.position.set(-0.2, 0, 0); pose.add(parts.string);
    parts.nock = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.5, 5), basic(0xffe2b0)); parts.nock.rotation.z = Math.PI / 2; parts.nock.position.set(0.05, 0, 0); parts.nock.visible = false; pose.add(parts.nock);
    parts.eyes = makeEyes(0.165, 0.0, 0.05, 0.0, 0.024); parts.eyes.g.children[0].position.y = 0.045; parts.eyes.g.children[1].position.y = -0.045; pose.add(parts.eyes.g);
    parts.halo = glow(tex, 0xffd9a0, 1.0, 0); parts.halo.position.y = 0.5; g.add(parts.halo);
  }
  if (kind === 'lantern') pose.add(parts.eyes.g);
  const h = VESSEL[kind].h;
  return {
    group: g, kind,
    land() { S.squash = 0.8; },
    shot() { S.shoot = 1; },
    update(v, host, inp, c) {
      const dt = c.dt, sp = Math.min(1, Math.abs(v.vx) / P.RUN);
      g.position.set(v.x, -v.y, 0);
      S.phase += Math.abs(v.vx) * dt * 4.2; S.squash = Math.max(0, S.squash - dt * 6); S.shoot = Math.max(0, S.shoot - dt * 5);
      parts.eyes.set(host, c.tick);
      if (kind === 'lantern') {
        S.lit += ((v.on ? 1 : 0) - S.lit) * Math.min(1, dt * 22);
        const fl = S.lit * (1 + Math.sin(c.tick * 7.3) * 0.03);
        parts.glassMat.emissiveIntensity = 0.7 * fl; parts.glassMat.opacity = 0.45 + 0.4 * S.lit;
        parts.core.material.color.setHex(v.on ? 0xfff2d0 : 0x2a2622);
        parts.halo.material.opacity = 0.6 * fl; parts.aura.material.opacity = 0.1 * fl;
        this.light = fl;
      } else {
        const k = host ? 0.5 : 0;
        parts.halo.material.opacity += (k * 0.5 - parts.halo.material.opacity) * Math.min(1, dt * 6);
        this.light = parts.halo.material.opacity;
      }
      if (c.tick === S.last && !(kind === 'sword' && v.slashT > 0)) return;
      S.last = c.tick;
      const sq = Math.round(S.squash * 4) / 4, hop = v.ground ? Math.abs(Math.sin(S.phase)) * 0.09 * sp : 0;
      if (kind === 'lantern') {
        pose.rotation.set(0, v.face > 0 ? 0.5 : -0.5, v.ground ? Math.sin(S.phase) * 0.14 * sp : -v.vx * 0.03);
        pose.position.y = hop * 0.6; pose.scale.set(1 + sq * 0.15, 1 - sq * 0.2, 1 + sq * 0.15);
        parts.feet[0].position.z = Math.sin(S.phase) * 0.08 * sp; parts.feet[1].position.z = -Math.sin(S.phase) * 0.08 * sp;
        parts.feet[0].visible = parts.feet[1].visible = host || v.ground;
      } else if (kind === 'sword') {
        const sl = v.slashT > 0 ? 1 - v.slashT / P.SLASH_T : -1;
        parts.arc.material.opacity = sl >= 0 ? 0.75 * (1 - sl) : 0; parts.arc.scale.x = v.face; parts.arc.rotation.z = 0;
        parts.steel.emissiveIntensity = sl >= 0 ? 0.9 * (1 - sl) : host ? 0.08 : 0;
        if (v.stuck) { g.rotation.y = 0; pose.rotation.set(0, 0, v.stuck * Math.PI / 2); pose.position.set(v.stuck * 0.22, h / 2, 0); pose.scale.set(1, 1, 1); }
        else if (!host && v.ground) { pose.rotation.set(0, 0, 0.12); pose.position.set(0, h / 2 - 0.08, 0); pose.scale.set(1, 1, 1); }       // 땅에 꽂혀 기다린다
        else {
          g.rotation.y = v.face > 0 ? 0.3 : -0.3;
          const sweep = sl >= 0 ? (1.9 - sl * 3.3) * -v.face : 0;
          pose.rotation.set(0, 0, sweep + (sl < 0 ? -v.vx * 0.045 + Math.sin(S.phase) * 0.06 * sp : 0));
          pose.position.set(sl >= 0 ? v.face * 0.25 : 0, h / 2 + hop + (sl >= 0 ? 0.2 : 0), 0); pose.scale.set(1 + sq * 0.1, 1 - sq * 0.12, 1);
        }
        parts.ribbon.rotation.z = -v.face * (0.3 + sp * 1.0) + Math.sin(c.tick * 1.3) * 0.08;
      } else {
        const aim = host ? (inp.ay < -0.3 ? P.AIM : inp.ay > 0.3 ? -P.AIM : 0) : -0.25;
        pose.scale.set(v.face * (1 + sq * 0.1), 1 - sq * 0.12, 1);
        pose.rotation.set(0, 0, v.face * (aim + (host ? Math.sin(S.phase) * 0.07 * sp : 0)));
        pose.position.set(0, h / 2 + hop + (host ? 0 : -0.04), 0);
        const pull = Math.round(S.shoot * 3) / 3;
        parts.string.position.x = -0.2 + pull * 0.1; parts.nock.visible = host && v.cd <= 0.08;
      }
    },
  };
}

// ───────── 낮의 돌 · 밤의 돌 ─────────
export function makeBlocks(list, day) {
  const g = new THREE.Group();
  const geo = clayify(roundBox(0.97, 0.97, 3.3, 0.13, 0.5), day ? { amp: 0.04, freq: 1.3, color: 0xe3bb6c, color2: 0xbf9048, uv: 0.5 } : { amp: 0.05, freq: 1.3, color: 0x4a52a0, color2: 0x30356e, uv: 0.5 });
  const solid = clayMat({ rough: 0.6, boil: 0.006, emissive: day ? 0xffb050 : 0x5a6cff, emissiveIntensity: day ? 0.16 : 0.2 });
  const ghost = clayMat({ rough: 0.8, boil: 0.006, transparent: true, opacity: day ? 0.13 : 0.1 }); ghost.depthWrite = false;
  const ms = list.map((b) => { const m = new THREE.Mesh(geo, ghost); m.position.set(b.x + 0.5, -b.y - 0.5, -0.55); m.receiveShadow = true; g.add(m); return { m, k: 0 }; });
  return {
    group: g,
    update(states, c) {
      for (let i = 0; i < ms.length; i++) {
        const o = ms[i], t = states[i] ? 1 : 0;
        if (o.k === t && o.done) continue;
        o.k += (t - o.k) * Math.min(1, c.dt * 14); if (Math.abs(o.k - t) < 0.02) { o.k = t; o.done = true; } else o.done = false;
        const q = Math.round(o.k * 5) / 5;
        o.m.material = q > 0.5 ? solid : ghost; o.m.castShadow = q > 0.5;
        o.m.scale.setScalar(0.84 + 0.16 * q);
      }
    },
  };
}

// ───────── 수정 · 문 · 반딧불이 이끼 · 밧줄과 통나무 · 제단 · 가로등 ─────────
export function makeCrystal(c, tex, grounded) {
  const g = new THREE.Group(); g.position.set(c.x, -c.y, -0.35);
  const mat = new THREE.MeshStandardMaterial({ color: 0xa9bfd4, roughness: 0.25, flatShading: true, emissive: 0xffc070, emissiveIntensity: 0 });
  const geo = new THREE.OctahedronGeometry(1, 0); geo.scale(0.2, 0.34, 0.2);
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; g.add(m);
  const stone = clayMat({ rough: 0.7 });
  if (grounded) g.add(clayMesh(ball(0.26, 0.2, 0.26, 0, -0.52, 0, { color: 0x6a6660, color2: 0x4a4a4c }), stone));
  else { const ch = new THREE.CylinderGeometry(0.014, 0.014, 3, 4); ch.translate(0, 1.8, 0); g.add(new THREE.Mesh(ch, basic(0x2a2a30))); }
  const halo = glow(tex, 0xffd08a, 2.6, 0); g.add(halo);
  let k = 0;
  return { group: g, update(lit, c) { k += ((lit ? 1 : 0) - k) * Math.min(1, c.dt * 8); mat.emissiveIntensity = 1.8 * k; halo.material.opacity = 0.75 * k; halo.scale.setScalar(2.6 + (lit ? (1 - k) * 3 : 0)); m.rotation.y = c.tick * 0.08; m.position.y = Math.sin(c.tick * 0.3 + c.x) * 0.04; } };
}
export function makeGate(gt) {
  const g = new THREE.Group(), mat = clayMat({ rough: 0.6, boil: 0.005 });
  if (gt.trap) g.add(clayMesh(clayify(roundBox(gt.w - 0.04, 0.3, 3.2, 0.06, 0.5), { amp: 0.02, color: 0x7a5a3c, color2: 0x58402a, uv: 0.7 }), mat));
  else for (const z of [-1.6, -0.8, 0, 0.8]) { const b = new THREE.CylinderGeometry(0.09, 0.09, gt.h, 6, 3); b.translate(0, 0, z - 0.3); g.add(clayMesh(clayify(b, { amp: 0.012, color: 0x55585e, color2: 0x393b40, uv: 1 }), mat)); }
  const bx = gt.x + gt.w / 2, by = -gt.y - (gt.trap ? 0.15 : gt.h / 2);
  let k = 0;
  return { group: g, update(open, c) { k += ((open ? 1 : 0) - k) * Math.min(1, c.dt * 4); const q = Math.round(k * 8) / 8; g.position.set(bx, by + (gt.trap ? -q * 0.2 : q * (gt.h - 0.1)), gt.trap ? -0.5 - q * 0 : 0); if (gt.trap) { g.rotation.x = q * 1.45; g.position.z = -0.5 - q * 1.5; g.position.y = by - q * 1.5; } } };
}
export function makeLichen(l, tex) {
  const g = new THREE.Group(); g.position.set(l.x, -l.y - 0.38, -0.9);
  g.add(clayMesh(ball(0.55, 0.07, 0.4, 0, 0, 0, { color: 0x3f7a70, color2: 0x2c5650 }), clayMat({ rough: 0.8 }), false));
  const flies = []; const r = rng(Math.round(l.x * 13));
  for (let i = 0; i < 8; i++) { const s = glow(tex, 0xd8ff9a, 0.34, 0); g.add(s); flies.push({ s, a: r() * 6.3, f: 0.5 + r() * 0.9, rad: 0.5 + r() * 1.6, hgt: 0.3 + r() * 1.3 }); }
  return { group: g, pos: new THREE.Vector3(l.x, -l.y + 0.3, -0.5), level: 0, update(d, c) {
    const k = d.on ? 1 : Math.min(1, d.t / P.LICHEN_T); this.level += (k - this.level) * Math.min(1, c.dt * 4);
    for (const f of flies) { const a = f.a + c.tick / 12 * f.f * 2, rad = f.rad * (1.5 - this.level * 1.1); f.s.position.set(Math.cos(a) * rad, f.hgt * (1.4 - this.level * 0.7) + Math.sin(a * 1.7) * 0.15, Math.sin(a) * rad * 0.5); f.s.material.opacity = 0.12 + 0.88 * this.level; f.s.scale.setScalar(0.3 + this.level * 0.22); }
  } };
}
export function makeRope(r, slab) {
  const g = new THREE.Group(), mat = clayMat({ vertexColors: false, color: 0x8a7858, rough: 0.9, boil: 0.004 });
  const stake = new THREE.CylinderGeometry(0.06, 0.08, 0.5, 6, 1); stake.translate(r.x, -r.y1 + 0.2, -0.2);
  const st = clayMesh(clayify(stake, { amp: 0.01, color: 0x5a4632 }), clayMat({ rough: 0.7 }));
  const seg = (ax, ay, bx, by) => { const len = Math.hypot(bx - ax, by - ay), c = new THREE.CylinderGeometry(0.03, 0.03, len, 5, 1); const m = new THREE.Mesh(c, mat); m.position.set((ax + bx) / 2, (ay + by) / 2, -0.2); m.rotation.z = Math.atan2(by - ay, bx - ax) - Math.PI / 2; g.add(m); return m; };
  const topY = -slab.y + 3.2, sx = slab.x + slab.w / 2;
  const segs = [seg(r.x, -r.y1 + 0.4, r.x, topY), seg(r.x, topY, sx, topY), seg(sx, topY, sx, -slab.y)];
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 5, 10), mat); wheel.position.set(sx, topY, -0.2); g.add(wheel);
  const w2 = wheel.clone(); w2.position.x = r.x; g.add(w2);
  return { group: g, stake: st, update(cut) { for (const s of segs) s.visible = !cut; } };
}
export function makeSlab(s) {
  const g = new THREE.Group(), mat = clayMat({ rough: 0.66, boil: 0.005 });
  for (let i = 0; i < s.w; i++) { const b = roundBox(0.94, 0.9, 3.0, 0.1, 0.5); b.translate(i + 0.5 - s.w / 2, 0, -0.5); g.add(clayMesh(clayify(b, { amp: 0.03, color: 0x8a6442, color2: 0x65472e, seed: i * 3.1, uv: 0.6 }), mat)); }
  return { group: g, update(d) { g.position.set(s.x + s.w / 2, -d.y - s.h / 2, 0); } };
}
export function makeShrine(s, tex) {
  const g = new THREE.Group(); g.position.set(s.x, -s.y, -1.0);
  const stone = clayMat({ rough: 0.7, boil: 0.005 });
  for (const [wd, ht, y] of [[0.6, 0.2, 0.1], [0.26, 0.6, 0.5], [0.52, 0.12, 0.86], [0.62, 0.14, 1.4]]) { const b = roundBox(wd, ht, wd, 0.05, 0.3); b.translate(0, y, 0); g.add(clayMesh(clayify(b, { amp: 0.02, color: 0x8a8478, color2: 0x625e56, uv: 1.2 }), stone)); }
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) { const p = new THREE.CylinderGeometry(0.03, 0.03, 0.44, 5); p.translate(x, 1.13, z); g.add(clayMesh(clayify(p, { amp: 0.004, color: 0x7a7468 }), stone, false)); }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), glass(0xb8c2c6)); core.position.y = 1.13; g.add(core);
  const halo = glow(tex, 0xffc070, 2.2, 0); halo.position.y = 1.13; g.add(halo);
  let k = 0;
  return { group: g, pos: new THREE.Vector3(s.x, -s.y + 1.13, -0.6), level: 0, update(lit, c) { k += ((lit ? 1 : 0) - k) * Math.min(1, c.dt * 5); this.level = k * (1 + Math.sin(c.tick * 2.3 + s.x) * 0.05); core.material.emissiveIntensity = 2 * this.level; core.material.opacity = 0.45 + 0.5 * k; halo.material.opacity = 0.8 * this.level; halo.scale.setScalar(2.2 + (lit ? (1 - k) * 3 : 0)); } };
}
export function makeGoal(gl, tex) {
  const g = new THREE.Group(), big = !!gl.great, sc = big ? 2.1 : 1;
  g.position.set(gl.x, -gl.y, -1.1); g.scale.setScalar(sc);
  const iron = clayMat({ rough: 0.55, boil: 0.005 });
  const post = new THREE.CylinderGeometry(0.07, 0.11, 2.3, 8, 5); post.translate(0, 1.15, 0);
  const base = roundBox(0.5, 0.26, 0.5, 0.06, 0.3); base.translate(0, 0.13, 0);
  const cap = new THREE.ConeGeometry(0.34, 0.22, 8, 1); cap.translate(0, 2.88, 0);
  const cup = new THREE.CylinderGeometry(0.2, 0.12, 0.12, 8, 1); cup.translate(0, 2.34, 0);
  for (const gg of [post, base, cap, cup]) g.add(clayMesh(clayify(gg, { amp: 0.015, color: 0x4c4a48, color2: 0x302e2d, uv: 1.5 }), iron));
  const gm = glass(0xb8c2c6), bulb = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), gm); bulb.position.y = 2.6; bulb.scale.y = 1.15; g.add(bulb);
  const halo = glow(tex, 0xffd29a, 3, 0); halo.position.y = 2.6; g.add(halo);
  return { group: g, pos: new THREE.Vector3(gl.x, -gl.y + 2.6 * sc, -0.4), level: 0, dim: 1,
    update(lit, t, c) { const k = lit ? Math.min(1, t / (big ? 2.4 : 1.2)) : 0; this.level = k * k * (3 - 2 * k) * this.dim; gm.emissiveIntensity = 3 * this.level; gm.opacity = 0.45 + 0.5 * Math.min(1, this.level); halo.material.opacity = Math.min(1, this.level); halo.scale.setScalar(3 + this.level * (big ? 14 : 5) + Math.sin(c.tick * 0.6) * 0.2 * this.level); } };
}

// 빛의 화살: 날아가는 것과 나무에 꽂힌 것
export function makeArrows(tex) {
  const g = new THREE.Group(), list = [];
  for (let i = 0; i < 8; i++) {
    const a = new THREE.Group(), sh = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 5); sh.rotateZ(Math.PI / 2);
    const hd = new THREE.ConeGeometry(0.05, 0.14, 5); hd.rotateZ(-Math.PI / 2); hd.translate(0.44, 0, 0);
    a.add(new THREE.Mesh(sh, basic(0xffe9c0)), new THREE.Mesh(hd, basic(0xfff6e0)));
    const h = glow(tex, 0xffc884, 1.1, 0.8); a.add(h); a.visible = false; g.add(a); list.push(a);
  }
  return { group: g, update(S) {
    let n = 0;
    for (const a of S.arrows) { const m = list[n++]; if (!m) break; m.visible = true; m.position.set(a.x - a.dx * 0.3, -a.y + a.dy * 0.3, 0); m.rotation.z = Math.atan2(-a.dy, a.dx); }
    for (const p of S.pegs) { const m = list[n++]; if (!m) break; m.visible = true; if (p.plat) { m.position.set((p.x0 + p.x1) / 2 + p.sg * 0.05, -p.y - 0.03, 0); m.rotation.z = p.sg > 0 ? 0 : Math.PI; } else { m.position.set(p.lx, -p.ly, 0); m.rotation.z = Math.PI / 2; } }
    for (; n < list.length; n++) list[n].visible = false;
  } };
}

// ───────── 어둠의 아이들 ─────────
export function makeDusky(little) {
  const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig);
  const sc = little ? 0.58 : 1; rig.scale.setScalar(sc);
  const mat = clayMat({ rough: 0.55, bump: 1.2, boil: 0.014 });
  const o = { amp: 0.035, freq: 2.6, fine: 0.01, color: 0x2c2848, color2: 0x191630, uv: 1 };
  rig.add(clayMesh(lathe([[0, 0.02], [0.24, 0.03], [0.31, 0.2], [0.3, 0.42], [0.22, 0.6], [0.1, 0.69], [0, 0.71]], 12, o), mat));
  const tuft = new THREE.ConeGeometry(0.05, 0.2, 5, 2); tuft.translate(0.03, 0.78, 0); rig.add(clayMesh(clayify(tuft, { ...o, amp: 0.008 }), mat, false));
  const eyeW = basic(0xe8f0ff), eyes = new THREE.Group();
  const lids = [];
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), eyeW); e.position.set(s * 0.11, 0.42, 0.25); e.scale.z = 0.5; eyes.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), basic(0x0c0a16)); p.position.set(s * 0.11, 0.41, 0.29); p.scale.z = 0.4; eyes.add(p); lids.push(e, p); }
  rig.add(eyes);
  const hands = [-1, 1].map((s) => { const hnd = clayMesh(ball(0.07, 0.085, 0.06, 0, 0, 0, o), mat, false); hnd.position.set(s * 0.27, 0.26, 0.1); rig.add(hnd); return hnd; });
  const feet = [-1, 1].map((s) => { const f = clayMesh(ball(0.075, 0.04, 0.1, 0, 0, 0.02, o), mat, false); f.position.set(s * 0.12, 0.03, 0); rig.add(f); return f; });
  let last = -1, ph = Math.random() * 6;
  return {
    group: g,
    update(d, c) {
      g.position.set(d.x, -d.y, 0.25);
      rig.rotation.y += ((d.face > 0 ? 0.9 : -0.9) - rig.rotation.y) * Math.min(1, c.dt * 8);
      if (c.tick === last) return; last = c.tick;
      const st = d.state, cow = st === 'cower' || d.calm > 0, sleep = st === 'sleep', walk = st === 'stalk' || st === 'flee' || st === 'retreat';
      const b = Math.sin(c.tick * (sleep ? 0.25 : 0.7) + ph);
      rig.scale.set(sc * (cow ? 1.12 : 1 + b * 0.02), sc * (cow ? 0.8 : sleep ? 0.86 + b * 0.03 : 1 - b * 0.02), sc * (cow ? 1.12 : 1));
      rig.position.x = cow ? Math.sin(c.tick * 5.1 + ph) * 0.012 : 0;                // 떤다
      for (const e of lids) e.scale.y = sleep ? 0.12 : st === 'stalk' ? 0.55 : 1;
      for (let i = 0; i < 2; i++) { const s = i ? 1 : -1; if (cow) hands[i].position.set(s * 0.1, 0.43, 0.31); else hands[i].position.set(s * 0.27, 0.26 + (walk ? Math.sin(c.tick * 1.2 + i * 3) * 0.05 : 0), 0.1); }
      feet[0].position.z = walk ? Math.sin(c.tick * 1.2) * 0.07 : 0; feet[1].position.z = walk ? -Math.sin(c.tick * 1.2) * 0.07 : 0;
      rig.rotation.x = st === 'stalk' ? 0.2 : 0;
    },
  };
}
export function makeGuardian() {
  const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig);
  const mat = clayMat({ rough: 0.5, bump: 1.3, boil: 0.014 });
  const o = { amp: 0.06, freq: 2, fine: 0.012, color: 0x2a2646, color2: 0x17142c, uv: 0.8 };
  rig.add(clayMesh(lathe([[0, 0], [0.44, 0.0], [0.5, 0.25], [0.42, 0.75], [0.34, 1.1], [0.36, 1.32], [0.26, 1.54], [0, 1.62]], 14, o), mat));
  const arms = [-1, 1].map((s) => { const pv = new THREE.Group(); pv.position.set(s * 0.36, 1.08, 0.05); const c = new THREE.CapsuleGeometry(0.075, 0.62, 4, 8); c.translate(0, -0.36, 0); pv.add(clayMesh(clayify(c, { ...o, amp: 0.015 }), mat)); rig.add(pv); return pv; });
  const eyes = new THREE.Group();
  const lids = [];
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), basic(0xe8f0ff)); e.position.set(s * 0.13, 1.34, 0.3); e.scale.z = 0.5; const p = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), basic(0x0c0a16)); p.position.set(s * 0.13, 1.32, 0.345); p.scale.z = 0.4; eyes.add(e, p); lids.push(e, p); }
  rig.add(eyes);
  let last = -1;
  return {
    group: g,
    update(d, c) {
      g.position.set(d.x, -d.y, 0.1);
      rig.rotation.y += ((d.face > 0 ? 0.7 : -0.7) - rig.rotation.y) * Math.min(1, c.dt * 5);
      if (c.tick === last) return; last = c.tick;
      const fl = d.t > 0, b = Math.sin(c.tick * 0.35);
      rig.scale.set(fl ? 1.1 : 1, fl ? 0.86 : 1 + b * 0.015, fl ? 1.1 : 1);
      rig.position.x = fl ? Math.sin(c.tick * 5) * 0.03 : 0;
      arms[0].rotation.z = -1.25 + (fl ? Math.sin(c.tick * 4) * 0.12 : b * 0.04); arms[1].rotation.z = 1.25 - (fl ? Math.sin(c.tick * 4) * 0.12 : b * 0.04);      // 두 팔을 벌리고 막아선다
      for (const e of lids) e.scale.y = fl ? 0.3 : 1;
    },
  };
}
export function makeMoths(seed) {
  const g = new THREE.Group(), r = rng(seed * 17 + 3), N = 7;
  const mat = clayMat({ rough: 0.85, boil: 0.01, side: THREE.DoubleSide, emissive: 0xbfc8d8, emissiveIntensity: 0.08 });
  const bodyG = clayify((() => { const b = new THREE.CapsuleGeometry(0.035, 0.1, 3, 6); b.rotateX(Math.PI / 2); return b; })(), { amp: 0.004, color: 0x8d8478, color2: 0x5f574e, uv: 3 });
  const wingG = clayify((() => { const w = new THREE.CircleGeometry(0.095, 12); w.scale(1.2, 0.85, 1); w.rotateX(-Math.PI / 2); w.translate(0.105, 0, 0.01); return w; })(), { amp: 0.004, color: 0xd6ccb6, color2: 0x9c917f, uv: 3 });
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
      const flying = s.state === 'fly';
      fly += ((flying ? 1 : 0) - fly) * Math.min(1, c.dt * 5);
      g.position.set(s.x, -s.y, 0.15 * fly);
      const tq = c.tick / 12, stir = Math.min(1, s.alert / P.MOTH_ALERT);
      for (let i = 0; i < list.length; i++) {
        const o = list[i], fx = Math.sin(tq * o.f1 * 3 + o.ph) * 0.45, fy = Math.cos(tq * o.f2 * 3 + o.ph * 2) * 0.32, fz = Math.sin(tq * o.f3 * 3 + o.ph) * 0.4;
        const jit = !flying && stir > 0 ? Math.sin(c.tick * 2.7 + i) * 0.03 * stir : 0;
        o.mo.position.set(o.roost.x * (1 - fly) + fx * fly + jit, o.roost.y * (1 - fly) + fy * fly, o.roost.z * (1 - fly) + fz * fly);
        o.mo.rotation.y = fly > 0.5 ? Math.atan2(Math.cos(tq * o.f1 * 3 + o.ph), 0.4) : o.a;
        const flap = fly > 0.3 ? ((c.tick + i) % 2 ? 0.95 : -0.35) : (stir > 0 && (c.tick + i) % 3 === 0 ? 0.8 : 1.25);
        o.wl.rotation.z = flap; o.wr.rotation.z = -flap;
      }
    },
  };
}
// 꺼진 자리에 남는 것: 빛을 잃은 작은 별
let starGeo = null;
export function makeSeed(x, y, kind) {
  if (!starGeo) {
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 0.055 : 0.13; if (i) sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    starGeo = clayify(new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false }), { amp: 0.006, color: 0x6a6e86, color2: 0x4a4d62, uv: 3 });
  }
  const m = clayMesh(starGeo, clayMat({ rough: 0.7, boil: 0.006 }));
  const s = kind === 'guardian' ? 1.5 : kind === 'little' ? 0.7 : 1;
  m.scale.setScalar(0.01); m.position.set(x, -y + 0.05, 0.35 + Math.random() * 0.4); m.rotation.set(-1.25, 0, Math.random() * 6);
  return { mesh: m, t: 0, update(dt) { if (this.t < 1) { this.t = Math.min(1, this.t + dt * 2.5); m.scale.setScalar(s * this.t); } } };
}

// ───────── 데이와 나이트 ─────────
export function makeFigure(f, tex) {
  const g = new THREE.Group(); g.position.set(f.x, -f.y, -0.7);
  if (f.who === 'note') {            // 나이트가 남긴 쪽지
    const post = new THREE.CylinderGeometry(0.05, 0.06, 1.3, 6, 2); post.translate(0, 0.65, 0);
    g.add(clayMesh(clayify(post, { amp: 0.01, color: 0x5a4632 }), clayMat({ rough: 0.7 })));
    const paper = roundBox(0.5, 0.6, 0.03, 0.01, 0.2); paper.translate(0, 1.15, 0.06);
    g.add(clayMesh(clayify(paper, { amp: 0.01, color: 0xd8d2e8, color2: 0xb8b0d0, uv: 2 }), clayMat({ rough: 0.8 })));
    return { group: g, who: f.who, f, update() {} };
  }
  const day = f.who === 'day', rig = new THREE.Group(); g.add(rig);
  const mat = clayMat({ rough: 0.66, boil: 0.01 });
  const dress = day ? [0xf0c86a, 0xd9a441] : [0x343a8c, 0x20245c], hair = day ? [0xf6e2a8, 0xe0c070] : [0x1a1830, 0x0e0d1e], skin = day ? 0xf2d6b8 : 0xc9c6e0;
  rig.add(clayMesh(lathe([[0, 0.08], [0.3, 0.09], [0.33, 0.16], [0.2, 0.6], [0.12, 0.88], [0, 0.92]], 14, { amp: 0.02, freq: 3, color: dress[0], color2: dress[1], uv: 1 }), mat));
  rig.add(clayMesh(ball(0.19, 0.2, 0.185, 0, 1.08, 0, { color: skin, amp: 0.008 }, 2), mat));
  rig.add(clayMesh(ball(0.215, 0.19, 0.21, 0, 1.15, -0.05, { color: hair[0], color2: hair[1], amp: 0.02 }, 2), mat));
  if (day) for (const s of [-1, 1]) rig.add(clayMesh(ball(0.07, 0.2, 0.07, s * 0.2, 0.86, -0.04, { color: hair[0], color2: hair[1] }), mat));
  else rig.add(clayMesh(ball(0.2, 0.42, 0.12, 0, 0.82, -0.14, { color: hair[0], color2: hair[1], amp: 0.02 }, 2), mat));
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 5), basic(day ? 0x3a2a1a : 0xe8ecff)); e.position.set(s * 0.07, 1.08, 0.18); rig.add(e); }
  const arms = [-1, 1].map((s) => { const pv = new THREE.Group(); pv.position.set(s * 0.15, 0.8, 0); const c = new THREE.CapsuleGeometry(0.04, 0.3, 3, 6); c.translate(0, -0.2, 0); pv.add(clayMesh(clayify(c, { amp: 0.006, color: skin, uv: 2 }), mat)); pv.rotation.z = s * 0.25; rig.add(pv); return pv; });
  for (const s of [-1, 1]) rig.add(clayMesh(ball(0.06, 0.04, 0.09, s * 0.08, 0.04, 0.03, { color: day ? 0x8a5a3a : 0x1a1830 }), mat));
  const halo = glow(tex, day ? 0xffd9a0 : 0x8f9cff, day ? 3.2 : 2.6, day ? 0.3 : 0.16); halo.position.y = 0.9; g.add(halo);
  if (!day) { const pin = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), basic(0xe8ecff)); pin.position.set(0.14, 1.26, 0.08); rig.add(pin); }
  const st = { x: f.x, gone: false, k: f.late ? 0 : 1, last: -1 };
  g.visible = !f.late;
  return {
    group: g, who: f.who, f, st,
    update(ax, done, c) {
      if (f.flee && !st.gone && Math.abs(ax - st.x) < 7) st.run = true;                 // 사도가 다가오면 달아난다
      if (st.run) { st.x += c.dt * 5.5; if (st.x > f.x + 9) { st.gone = true; g.visible = false; } }
      if (f.late && done) { g.visible = true; st.k = Math.min(1, st.k + c.dt * 0.5); st.x = f.x - (1 - st.k) * 5; }
      g.position.x = st.x;
      const face = st.run ? 1 : f.late ? 1 : ax > st.x ? 1 : -1;
      rig.rotation.y += ((face > 0 ? 0.9 : -0.9) - rig.rotation.y) * Math.min(1, c.dt * 6);
      if (c.tick === st.last) return; st.last = c.tick;
      const moving = st.run || (f.late && done && st.k < 1), b = Math.sin(c.tick * (moving ? 1.3 : 0.3));
      rig.position.y = moving ? Math.abs(b) * 0.07 : 0; rig.rotation.x = moving ? 0.18 : 0;
      arms[0].rotation.x = moving ? b * 0.9 : day && !f.late ? -0.9 : 0; arms[1].rotation.x = moving ? -b * 0.9 : day && !f.late ? -0.9 : 0;     // 데이는 두 손을 내민다
      rig.scale.y = 1 + (moving ? 0 : b * 0.012);
    },
  };
}
