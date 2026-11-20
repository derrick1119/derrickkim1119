// 캐릭터: 주인공 '초침', 태엽 병정, 톱니, 스프링
import * as THREE from 'three';
import { texFolds } from './lib.js';
import { V, PI, ST, tone, withKeep, vinyl, lacquer, metal, matte, basicHDR, mesh, sph, rbox, cyl, torus, lathe, limb, onSphere, onEllipsoid, sweep, texWood, texEndGrain } from './lib.js';

let WOOD = null;
const woodTex = () => (WOOD ||= texWood());

// ================= 주인공 '초침' =================
export function buildHero({ pose = 'ready' } = {}) {
  return withKeep(true, () => {
    const H = new THREE.Group();
    const navy = vinyl(0x2f3d92, { roughness: 0.48, clearcoat: 0.5 });
    const navyD = vinyl(0x1f2760, { roughness: 0.55, clearcoat: 0.35 });
    const band = vinyl(0x3a4796, { roughness: 0.45 });
    const skin = vinyl(0xfcd0b4, { roughness: 0.5, clearcoat: 0.55, clearcoatRoughness: 0.3 });
    const folds = texFolds(); folds.repeat.set(3, 1);
    const teal = vinyl(0x17cdbd, { roughness: 0.42, clearcoat: 0.6, side: THREE.DoubleSide, bumpMap: folds, bumpScale: 14 });
    const gold = metal(0xf2b54a, { roughness: 0.22 });
    const eyeM = lacquer(0x161a33, { roughness: 0.15 });
    const irisM = lacquer(0x2f7fe6, { roughness: 0.2, emissive: new THREE.Color(0x0a2a66), emissiveIntensity: 0.6 });
    const white = basicHDR(0xffffff, 1.0);
    const blushM = new THREE.MeshBasicMaterial({ color: 0xff8f9e, transparent: true, opacity: 0.55, depthWrite: false });
    const mouthM = lacquer(0x7a2f45);
    const leather = vinyl(0x5b3a2c, { roughness: 0.5 });
    const steel = metal(0xeef3f8, { roughness: 0.12 });
    const footM = vinyl(0x1a1d33, { roughness: 0.5 });

    // 다리·발
    const step = pose === 'ready' ? 0.09 : 0.03;
    H.add(limb([-0.1, 0.2, -step], [-0.11, 0.08, -step - 0.02], 0.068, navy));
    H.add(limb([0.1, 0.2, step], [0.11, 0.08, step + 0.02], 0.068, navy));
    H.add(sph(1, footM, [-0.11, 0.045, -step + 0.02], [0.085, 0.055, 0.125]));
    H.add(sph(1, footM, [0.11, 0.045, step + 0.04], [0.085, 0.055, 0.125]));
    // 몸통 (종 모양 도복)
    H.add(lathe([[0, 0], [0.17, 0], [0.215, 0.03], [0.225, 0.1], [0.205, 0.21], [0.165, 0.31], [0.11, 0.38], [0, 0.4]], navy, [0, 0.16, 0]));
    // 옷깃 V
    const lapel = vinyl(0x3b4a9c);
    H.add(limb([-0.1, 0.53, 0.12], [0, 0.37, 0.205], 0.022, lapel));
    H.add(limb([0.1, 0.53, 0.12], [0, 0.37, 0.205], 0.022, lapel));
    // 허리띠 + 금 버클
    H.add(torus(0.214, 0.028, leather, [0, 0.31, 0], [PI / 2, 0, 0], PI * 2, [1, 1, 1.2]));
    H.add(rbox(0.07, 0.055, 0.03, 0.01, gold, [0, 0.31, 0.215]));

    // 팔
    const hr = pose === 'ready' ? [-0.34, 0.3, -0.12] : [-0.36, 0.42, 0.12];
    const hl = pose === 'ready' ? [0.26, 0.42, 0.2] : [0.27, 0.38, 0.12];
    H.add(limb([-0.17, 0.5, 0], hr, 0.06, navy));
    H.add(limb([0.17, 0.5, 0], hl, 0.06, navy));
    H.add(sph(0.068, skin, hr)); H.add(sph(0.068, skin, hl));

    // 칼 (시곗바늘 칼)
    const s = new THREE.Shape();
    s.moveTo(0.026, 0); s.lineTo(0.017, 0.263);
    s.absarc(0, 0.31, 0.05, -1.22, 1.12, false);
    s.lineTo(0, 0.53); s.lineTo(-0.022, 0.355);
    s.absarc(0, 0.31, 0.05, 2.02, 4.36, false);
    s.lineTo(-0.026, 0); s.closePath();
    const hole = new THREE.Path(); hole.absarc(0, 0.31, 0.022, 0, PI * 2, true); s.holes.push(hole);
    const bg = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.005, bevelSegments: 3, curveSegments: 24 });
    bg.translate(0, 0, -0.006);
    const sword = new THREE.Group();
    sword.add(mesh(bg, steel, [0, 0.03, 0]));
    sword.add(cyl(0.048, 0.048, 0.022, gold, [0, 0.02, 0]));
    sword.add(cyl(0.018, 0.018, 0.12, navyD, [0, -0.05, 0]));
    sword.add(sph(0.026, gold, [0, -0.115, 0]));
    sword.position.set(...hr);
    const dir = pose === 'ready' ? V(-0.55, 0.15, -1).normalize() : V(-1, 0.25, 0.35).normalize();
    sword.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
    sword.scale.setScalar(1.6);
    H.add(sword);

    // 머리 (두건 + 가로로 넓은 얼굴창)
    const head = new THREE.Group(); head.position.set(0, 0.86, 0.02); H.add(head);
    head.add(sph(0.32, navy, [0, 0, 0]));
    const FC = [0, -0.035, 0.1], FA = [0.302, 0.208, 0.262];
    head.add(sph(1, skin, FC, FA));
    // 이마 띠 + 회중시계
    head.add(torus(0.292, 0.024, band, [0, 0.1, -0.01], [PI / 2 - 0.42, 0, 0], PI * 2, [1, 1, 1.5]));
    const watch = new THREE.Group();
    watch.add(cyl(0.066, 0.066, 0.032, gold, [0, 0, 0], [PI / 2, 0, 0]));
    watch.add(mesh(new THREE.CircleGeometry(0.052, 32), new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xfff1d0, emissiveIntensity: 0.35, roughness: 0.3 }), [0, 0, 0.0175]));
    watch.add(rbox(0.009, 0.04, 0.004, 0.002, eyeM, [0.007, 0.015, 0.02], [0, 0, -0.5]));
    watch.add(rbox(0.009, 0.03, 0.004, 0.002, eyeM, [-0.01, 0.008, 0.02], [0, 0, 1.1]));
    watch.add(sph(0.018, gold, [0, 0.078, 0]));
    watch.add(torus(0.017, 0.0055, gold, [0, 0.1, 0]));
    watch.position.set(0, 0.205, 0.268); watch.rotation.x = -0.6;
    head.add(watch);
    // 두건 매듭 + 짧은 끈
    head.add(sph(0.058, navyD, [0.0, 0.16, -0.25]));
    head.add(mesh(sweep([V(0, 0.16, -0.27), V(0.07, 0.12, -0.4), V(0.04, 0.05, -0.5), V(0.1, 0.0, -0.6)], { radius: (t) => 0.042 * (1 - 0.5 * t), flat: 0.35, segs: 40 }), navyD));
    head.add(mesh(sweep([V(0, 0.16, -0.27), V(-0.06, 0.19, -0.4), V(-0.03, 0.15, -0.5)], { radius: (t) => 0.038 * (1 - 0.5 * t), flat: 0.35, segs: 30 }), navyD));

    // 눈 (크고 반짝)
    for (const sx of [-1, 1]) {
      const eye = new THREE.Group();
      onEllipsoid(eye, FC, FA, sx * 0.108, 0.018, -0.006);
      eye.add(sph(0.07, eyeM, [0, 0, 0], [0.78, 1.0, 0.3]));
      eye.add(sph(0.05, irisM, [0, -0.026, 0.009], [0.66, 0.5, 0.3]));
      eye.add(sph(0.022, white, [0.015, 0.03, 0.022]));
      eye.add(sph(0.01, white, [-0.018, -0.03, 0.021]));
      const lash = mesh(new THREE.TorusGeometry(0.06, 0.009, 6, 24, PI * 0.78), eyeM, [0, 0.004, 0.012], [0, 0, PI * 0.11], [0.95, 1.18, 1]);
      eye.add(lash);
      head.add(eye);
      // 눈썹 (당찬)
      const brow = new THREE.Group(); onEllipsoid(brow, FC, FA, sx * 0.112, 0.128, 0.003);
      const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.042, 6, 12), navyD); b.rotation.z = PI / 2 + sx * 0.3; brow.add(b); head.add(brow);
      // 볼터치
      const bl = new THREE.Group(); onEllipsoid(bl, FC, FA, sx * 0.19, -0.06, 0.004);
      bl.add(mesh(new THREE.CircleGeometry(0.04, 32), blushM, [0, 0, 0], [0, 0, 0], [1, 0.6, 1], false)); head.add(bl);
    }
    // 입
    const mouth = new THREE.Group(); onEllipsoid(mouth, FC, FA, 0.004, -0.105, 0.0);
    mouth.add(mesh(new THREE.TorusGeometry(0.022, 0.0075, 8, 24, PI), mouthM, [0, 0.01, 0], [0, 0, PI]));
    head.add(mouth);

    // 목도리 (청록) + 두 가닥 꼬리
    H.add(torus(0.168, 0.05, teal, [0, 0.585, 0.0], [PI / 2 + 0.16, 0, 0.05], PI * 2, [1, 1, 1.45]));
    H.add(torus(0.172, 0.046, teal, [0, 0.645, -0.005], [PI / 2 - 0.1, 0, -0.08], PI * 2, [1, 1, 1.3]));
    H.add(sph(1, teal, [0.17, 0.6, -0.02], [0.06, 0.07, 0.075]));
    const w1 = pose === 'ready' ? 1 : 0.6;
    const tailA = [V(0.18, 0.6, -0.03), V(0.25, 0.66, -0.32), V(0.22, 0.79, -0.64 * w1 - 0.1), V(0.36, 0.75, -0.88 * w1 - 0.1), V(0.42, 0.88, -1.08 * w1 - 0.1)];
    const tailB = [V(0.17, 0.57, -0.04), V(0.16, 0.5, -0.36), V(0.17, 0.56, -0.6 * w1 - 0.05), V(0.15, 0.48, -0.8 * w1 - 0.05)];
    const tailR = (w) => (t) => w * (1 - 0.25 * t) * (t > 0.9 ? Math.sqrt(Math.max(0, 1 - ((t - 0.9) / 0.1) ** 2)) : 1);
    H.add(mesh(sweep(tailA, { radius: tailR(0.07), flat: 0.26, segs: 90, twist: (t) => 0.7 * Math.sin(t * 4) }), teal));
    H.add(mesh(sweep(tailB, { radius: tailR(0.062), flat: 0.26, segs: 70, twist: (t) => -0.6 * Math.sin(t * 3.5) }), teal));

    H.userData.head = head;
    return H;
  });
}

// ================= 태엽 병정 =================
export function buildSoldier(type = 'sword', { keep = false, face = 'blank' } = {}) {
  return withKeep(keep, () => {
    const G = new THREE.Group();
    const jacketHex = { sword: 0x3d68d8, bow: 0xe58f2a, shield: 0x8a59c8 }[type];
    const jacket = lacquer(jacketHex);
    const cream = lacquer(0xf5eddc);
    const black = lacquer(0x22222c, { roughness: 0.3 });
    const skin = lacquer(0xf6c9a2, { roughness: 0.42 });
    const gold = metal(0xe8b04c, { roughness: 0.28 });
    const brass = metal(0xd8a345, { roughness: 0.32 });
    const wood = new THREE.MeshPhysicalMaterial({ map: woodTex(), color: tone(0xd7a46c), roughness: 0.55, clearcoat: 0.5, clearcoatRoughness: 0.3 });
    if (ST.clip) { wood.clippingPlanes = ST.clip; wood.clipShadows = true; }
    const blush = new THREE.MeshBasicMaterial({ color: tone(0xff8a8a), transparent: true, opacity: 0.6, depthWrite: false });
    const eyeM = lacquer(0x111118, { roughness: 0.12 });
    const white = basicHDR(ST.slow && !ST.keep ? 0xd8e0ea : 0xffffff, 1.0);

    // 다리·장화
    G.add(cyl(0.058, 0.055, 0.15, cream, [-0.075, 0.12, 0]));
    G.add(cyl(0.058, 0.055, 0.15, cream, [0.075, 0.12, 0]));
    G.add(sph(1, black, [-0.075, 0.045, 0.025], [0.072, 0.052, 0.095]));
    G.add(sph(1, black, [0.075, 0.045, 0.025], [0.072, 0.052, 0.095]));
    // 몸통 (원통형 나무 몸)
    G.add(lathe([[0, 0], [0.17, 0], [0.2, 0.03], [0.212, 0.12], [0.2, 0.24], [0.17, 0.32], [0.1, 0.36], [0, 0.37]], jacket, [0, 0.17, 0]));
    G.add(torus(0.207, 0.026, black, [0, 0.27, 0], [PI / 2, 0, 0], PI * 2, [1, 1, 1.25]));
    G.add(rbox(0.06, 0.05, 0.03, 0.01, gold, [0, 0.27, 0.212]));
    for (const y of [0.36, 0.44]) G.add(sph(0.02, gold, [0, y, 0.2 - (y - 0.36) * 0.25]));
    G.add(torus(0.1, 0.025, cream, [0, 0.52, 0], [PI / 2, 0, 0]));
    if (type === 'sword') for (const sx of [-1, 1]) G.add(sph(1, gold, [sx * 0.19, 0.5, 0], [0.07, 0.035, 0.07]));

    // 머리
    const HC = [0, 0.72, 0], HR = 0.215;
    G.add(sph(HR, skin, HC));
    for (const sx of [-1, 1]) {
      const e = new THREE.Group(); onSphere(e, HC, HR, sx * 0.075, 0.02, -0.004);
      e.add(cyl(0.031, 0.031, 0.02, eyeM, [0, 0, 0], [PI / 2, 0, 0]));
      e.add(sph(0.009, white, [sx * 0.01, 0.012, 0.012]));
      G.add(e);
      const c = new THREE.Group(); onSphere(c, HC, HR, sx * 0.128, -0.045, 0.002);
      c.add(mesh(new THREE.CircleGeometry(0.036, 28), blush, [0, 0, 0], [0, 0, 0], 1, false)); G.add(c);
    }
    const nose = new THREE.Group(); onSphere(nose, HC, HR, 0, -0.025, 0); nose.add(sph(0.026, lacquer(0xf0a888), [0, 0, 0])); G.add(nose);
    if (face === 'oops') {
      const m = new THREE.Group(); onSphere(m, HC, HR, 0, -0.085, 0); m.add(mesh(new THREE.TorusGeometry(0.018, 0.007, 8, 20), lacquer(0x6a2a2a), [0, 0, 0])); G.add(m);
    } else {
      const m = new THREE.Group(); onSphere(m, HC, HR, 0, -0.085, 0); m.add(mesh(new THREE.TorusGeometry(0.02, 0.006, 8, 20, PI), lacquer(0x6a2a2a), [0, 0.008, 0], [0, 0, PI])); G.add(m);
    }
    if (type === 'sword') { // 콧수염
      const ms = new THREE.Group(); onSphere(ms, HC, HR, 0, -0.052, 0.006);
      ms.add(mesh(new THREE.TorusGeometry(0.03, 0.011, 8, 20, PI * 0.9), lacquer(0x3a2418), [-0.03, 0.0, 0], [0, 0, PI * 1.05]));
      ms.add(mesh(new THREE.TorusGeometry(0.03, 0.011, 8, 20, PI * 0.9), lacquer(0x3a2418), [0.03, 0.0, 0], [0, 0, PI * 0.95 - PI * 0.85]));
      G.add(ms);
    }

    // 모자
    if (type === 'sword') {
      const hat = lacquer(0xd23f55);
      G.add(cyl(0.16, 0.175, 0.24, hat, [0, 0.98, -0.01]));
      G.add(sph(1, hat, [0, 1.1, -0.01], [0.16, 0.035, 0.16]));
      G.add(cyl(0.18, 0.18, 0.03, black, [0, 0.87, -0.01]));
      G.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.016, 32, 1, false, -PI / 2.2, PI / 1.1), black, [0, 0.87, 0.04], [0.15, 0, 0]));
      G.add(cyl(0.045, 0.045, 0.012, gold, [0, 0.99, 0.165], [PI / 2 - 0.05, 0, 0]));
      G.add(sph(0.05, cream, [0, 1.15, -0.01]));
    } else if (type === 'bow') {
      const hat = lacquer(0x3e9c5a);
      G.add(mesh(new THREE.ConeGeometry(0.235, 0.36, 40), hat, [0.02, 1.02, -0.02], [-0.12, 0, -0.14]));
      G.add(torus(0.215, 0.03, hat, [0, 0.86, 0], [PI / 2 - 0.05, 0, 0]));
      G.add(sph(0.045, lacquer(0xf2c84a), [0.07, 1.2, -0.05]));
    } else {
      const pot = metal(0xb9c3cf, { roughness: 0.25 });
      G.add(mesh(new THREE.SphereGeometry(0.225, 40, 20, 0, PI * 2, 0, PI / 2), pot, [0, 0.79, 0], [0.08, 0, 0.12]));
      G.add(torus(0.225, 0.02, pot, [0, 0.79, 0], [PI / 2 + 0.08, 0.12, 0]));
      G.add(cyl(0.03, 0.04, 0.05, black, [0.03, 1.02, 0.02], [0.08, 0, 0.12]));
      G.add(sph(0.032, black, [0.033, 1.05, 0.022]));
    }

    // 팔 + 무기
    if (type === 'sword') {
      const hR = [-0.28, 0.62, 0.1], hL = [0.25, 0.36, 0.1];
      G.add(limb([-0.19, 0.48, 0], hR, 0.05, jacket)); G.add(limb([0.19, 0.48, 0], hL, 0.05, jacket));
      G.add(sph(0.055, cream, hR)); G.add(sph(0.055, cream, hL));
      const sw = new THREE.Group();
      sw.add(rbox(0.065, 0.42, 0.026, 0.012, wood, [0, 0.27, 0]));
      sw.add(mesh(new THREE.ConeGeometry(0.046, 0.07, 4, 1), wood, [0, 0.515, 0], [0, PI / 4, 0], [1, 1, 0.4]));
      sw.add(rbox(0.17, 0.03, 0.045, 0.012, lacquer(0x8a5a32), [0, 0.06, 0]));
      sw.add(cyl(0.02, 0.02, 0.1, lacquer(0x6b4426), [0, 0, 0]));
      sw.position.set(...hR); sw.rotation.set(0.25, 0, 0.35); G.add(sw);
    } else if (type === 'bow') {
      const hL = [0.14, 0.48, 0.24], hR = [-0.04, 0.5, 0.02];
      G.add(limb([0.19, 0.48, 0], hL, 0.05, jacket)); G.add(limb([-0.19, 0.48, 0], hR, 0.05, jacket));
      G.add(sph(0.055, cream, hL)); G.add(sph(0.055, cream, hR));
      const bow = new THREE.Group();
      bow.add(mesh(new THREE.TorusGeometry(0.24, 0.018, 12, 48, 2.3), wood, [0, 0, 0], [0, 0, -1.15]));
      const a = 1.15; const p1 = V(0.24 * Math.cos(a), 0.24 * Math.sin(a), 0), p2 = V(0.24 * Math.cos(a), -0.24 * Math.sin(a), 0);
      bow.add(limb([p1.x, p1.y, 0], [p2.x - 0.12, 0, 0], 0.004, cream)); bow.add(limb([p2.x, p2.y, 0], [p2.x - 0.12, 0, 0], 0.004, cream));
      bow.position.set(hL[0] - 0.24, hL[1], hL[2]); bow.rotation.y = -PI / 2 + 0.05;
      G.add(bow);
      // 흡착컵 화살
      const ar = new THREE.Group();
      ar.add(cyl(0.011, 0.011, 0.46, wood, [0, 0, 0], [PI / 2, 0, 0]));
      ar.add(mesh(new THREE.ConeGeometry(0.045, 0.045, 24, 1, true), lacquer(0xff7a3c, { side: THREE.DoubleSide }), [0, 0, 0.245], [-PI / 2, 0, 0]));
      ar.position.set(0.05, 0.5, 0.2); G.add(ar);
    } else {
      const hL = [0.12, 0.4, 0.26], hR = [-0.27, 0.5, 0.12];
      G.add(limb([0.19, 0.48, 0], hL, 0.05, jacket)); G.add(limb([-0.19, 0.48, 0], hR, 0.05, jacket));
      G.add(sph(0.055, cream, hR));
      const lid = metal(0xc6cfd9, { roughness: 0.22 });
      const sh = new THREE.Group();
      sh.add(mesh(new THREE.SphereGeometry(0.5, 48, 12, 0, PI * 2, 0, 0.5), lid, [0, 0, -0.44], [PI / 2, 0, 0]));
      sh.add(torus(0.24, 0.016, lid, [0, 0, 0]));
      sh.add(cyl(0.03, 0.04, 0.035, black, [0, 0, 0.06], [PI / 2, 0, 0]));
      sh.add(sph(0.04, black, [0, 0, 0.085]));
      sh.position.set(0.1, 0.38, 0.3); sh.rotation.set(-0.1, 0.25, 0); G.add(sh);
      // 나무 국자
      const sp = new THREE.Group();
      sp.add(cyl(0.016, 0.016, 0.34, wood, [0, 0.12, 0]));
      sp.add(sph(1, wood, [0, 0.31, 0.02], [0.06, 0.075, 0.03]));
      sp.position.set(...hR); sp.rotation.set(0.3, 0, 0.45); G.add(sp);
    }

    // 등의 태엽 열쇠
    const key = new THREE.Group();
    key.add(cyl(0.026, 0.026, 0.2, brass, [0, 0, -0.1], [PI / 2, 0, 0]));
    key.add(sph(0.04, brass, [0, 0, -0.2]));
    for (const sx of [-1, 1]) key.add(mesh(new THREE.TorusGeometry(0.1, 0.03, 14, 40), brass, [sx * 0.15, 0, -0.205], [PI / 2, 0, 0], [1.2, 1, 1]));
    key.add(rbox(0.14, 0.04, 0.04, 0.014, brass, [0, 0, -0.205]));
    key.position.set(0, 0.46, -0.18); key.rotation.z = 0.3; key.rotation.x = -0.45;
    G.add(key);
    G.userData.key = key;
    return G;
  });
}

// 톱니
export function gearGeo(R = 0.1, teeth = 10, depth = 0.025) {
  const s = new THREE.Shape(), r0 = R * 0.8;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * PI * 2, w = (PI * 2) / teeth;
    const pts = [[r0, a], [R, a + w * 0.18], [R, a + w * 0.45], [r0, a + w * 0.62]];
    pts.forEach(([r, aa], k) => { const x = Math.cos(aa) * r, y = Math.sin(aa) * r; (i === 0 && k === 0) ? s.moveTo(x, y) : s.lineTo(x, y); });
  }
  s.closePath();
  const h = new THREE.Path(); h.absarc(0, 0, R * 0.22, 0, PI * 2, true); s.holes.push(h);
  for (let k = 0; k < 4; k++) { const a = k * PI / 2 + PI / 4, p = new THREE.Path(); p.absarc(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5, R * 0.14, 0, PI * 2, true); s.holes.push(p); }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.005, bevelSegments: 2, curveSegments: 16 });
  g.translate(0, 0, -depth / 2);
  return g;
}
export function springGeo(r = 0.045, turns = 6, len = 0.3, tube = 0.009) {
  class Helix extends THREE.Curve { getPoint(t, o = new THREE.Vector3()) { const a = t * turns * PI * 2; return o.set(Math.cos(a) * r, t * len, Math.sin(a) * r); } }
  return new THREE.TubeGeometry(new Helix(), 200, tube, 8, false);
}
export { texEndGrain };
