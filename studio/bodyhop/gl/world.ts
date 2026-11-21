/**
 * 월드 1 「풀밭 씨름 마당」 무대와 몸 — 전부 코드로 빚는다(🖌️ ART v1).
 * 좌표: 마당 가운데가 원점, 마당 반지름 0.452(시뮬레이션과 같은 단위), 위가 +y, 카메라는 +z 쪽에서 내려다본다.
 * 캐릭터는 '반지름 1' 단위로 빚고 그릴 때 시뮬 반지름 r로 키운다. 발바닥이 y = 0.
 */
import { trs, type V3 } from './m4.ts';
import { Batch, cap, ell, hex, lathe, mix3, rbox, rcone, sdfMesh, smax, smin, sph, terrain, torus, vnoise, type Mesh, type Paint, type SDF } from './mesh.ts';

export const ARENA = 0.452;
const P = (c: string, rough = 0.7, sss = 0) => { const h = hex(c); return () => [...h, rough, sss]; };
/** 점 p를 z축으로 a만큼 돌린 좌표(부품을 기울일 때) */
/** 원 둘레 각 a에 선 것이 마당 가운데를 보게 하는 Y 회전 */
const face = (a: number) => Math.atan2(-Math.cos(a), -Math.sin(a));
const rz = (x: number, y: number, a: number): [number, number] => [x * Math.cos(a) + y * Math.sin(a), -x * Math.sin(a) + y * Math.cos(a)];

// ───────────────────────── 무대 ─────────────────────────
export interface Stage { ground: Mesh; arena: Mesh; props: Mesh; crowd: Mesh; foliage: Mesh; lamp: Mesh; clouds: Mesh }

function grass(x: number, _y: number, z: number): number[] {
  const n = vnoise(x * 2.2, 0, z * 2.2) * 0.55 + vnoise(x * 9, 1, z * 9) * 0.3 + vnoise(x * 40, 2, z * 40) * 0.15, far = Math.min(1, Math.hypot(x, z) / 5);
  const stripe = Math.hypot(x, z) < 2.2 ? 0.1 * Math.sign(Math.sin((x * 0.8 + z * 0.6) * 9)) : 0;
  const c = mix3(mix3(hex('#3f7a2a'), hex('#86b850'), Math.min(1, Math.max(0, n + stripe))), hex('#9fb7c0'), far * 0.5);
  return [...c, 0.92, 0.15];
}
export function buildStage(): Stage {
  const R = ARENA;
  // 땅: 마당 둘레는 평평, 멀리 갈수록 둥근 언덕(뒤쪽이 높다 — 화면 위를 채운다)
  const hf = (x: number, z: number) => {
    const d = Math.hypot(x, z), far = Math.max(0, d - 1.1);
    const back = Math.max(0, -z - 1.6) * 0.32;
    return -0.05 + far * far * 0.02 * (0.5 + vnoise(x * 0.8, 3, z * 0.8)) + back * (0.6 + 0.8 * vnoise(x * 0.6, 5, z * 0.4)) + 0.015 * vnoise(x * 4, 7, z * 4);
  };
  const ground = terrain(7, 160, hf, grass, (x, z) => {
    const d = Math.hypot(x, z);
    return d < R + 0.1 ? 0.55 + 0.45 * Math.min(1, (d - R - 0.03) / 0.07) : 1;
  });
  // 마당: 모래 판(살짝 솟음) + 흙 옆면 + 짚 줄 테두리 + 하얀 씨름 금
  const sand: Paint = (x, y, z) => {
    const d = Math.hypot(x, z), n = vnoise(x * 18, 0, z * 18) * 0.5 + vnoise(x * 60, 2, z * 60) * 0.5;
    let c = mix3(hex('#d9a564'), hex('#e9bf80'), n);
    c = mix3(c, hex('#c48a4c'), Math.max(0, d / R - 0.75) * 1.2);
    if (Math.abs(d - 0.13) < 0.006 || (Math.abs(z) < 0.004 && Math.abs(x) > 0.05 && Math.abs(x) < 0.1)) c = mix3(c, hex('#fffaf0'), 0.85);
    if (y < -0.004) c = mix3(hex('#a56f42'), hex('#8a5a36'), vnoise(x * 30, y * 30, z * 30));
    return [...c, y < -0.004 ? 0.95 : 0.88, 0];
  };
  const arena = new Batch();
  arena.add(lathe([[0, 0.001], [R - 0.02, 0.001], [R + 0.004, -0.004], [R + 0.014, -0.02], [R + 0.03, -0.05], [R + 0.06, -0.056]], 96, sand, (y, r) => (r > R - 0.03 && y > -0.006 ? 0.72 : 1)));
  arena.add(torus(R + 0.004, 0.017, 128, 10, (x, y, z) => {
    const a = Math.atan2(z, x), s = Math.sin(a * 140 + y * 260) * 0.5 + 0.5;
    return [...mix3(hex('#c99a45'), hex('#f2d27a'), s), 0.8, 0.1];
  }), trs(0, 0.004, 0));
  // 소품: 관중석(뒤쪽 반원 3단) · 문 · 깃발 줄 · 짚단 · 울타리
  const props = new Batch(), crowd = new Batch(), foliage = new Batch();
  const wood: Paint = (x, y, z) => [...mix3(hex('#b77b45'), hex('#d9a066'), vnoise(x * 40, y * 8, z * 40)), 0.75, 0.05];
  const plank = sdfMesh((x, y, z) => rbox(x, y, z, [0, 0, 0], [0.5, 0.06, 0.18], 0.05), wood, [-0.56, -0.1, -0.22], [0.56, 0.1, 0.22], 0.03);
  const post = sdfMesh((x, y, z) => rbox(x, y, z, [0, 0.5, 0], [0.09, 0.5, 0.09], 0.05), P('#8a5a36', 0.85), [-0.13, -0.04, -0.13], [0.13, 1.04, 0.13], 0.03);
  const bird = birdMesh();
  const tints = ['#ff7a6b', '#ffd25a', '#6fb7ff', '#ffffff', '#b98aff', '#7ee08a'].map(hex);
  let bi = 0;
  for (let tier = 0; tier < 3; tier++) {
    const rr = R + 0.14 + tier * 0.085, yy = 0.018 + tier * 0.05, step = (8 * Math.PI) / 180;
    for (let a = Math.PI * 1.03; a < Math.PI * 1.97; a += step) {
      if (Math.abs(a - Math.PI * 1.5) < 0.2) continue; // 가운데는 문
      const x = Math.cos(a + step / 2) * rr, z = Math.sin(a + step / 2) * rr, ry = face(a + step / 2);
      props.add(plank, trs(x, yy, z, ry, 0, 0, step * rr * 1.02, 0.12, 0.2));
      if (tier === 2 || ((a * 10) | 0) % 2 === 0) props.add(post, trs(x, -0.05, z, ry, 0, 0, 0.1, (yy + 0.05) * 1, 0.1));
      for (let k = 0; k < 2; k++) {
        if (((bi * 7919) % 11) < 2) { bi++; continue; } // 빈자리도 조금
        const ba = a + step * (0.28 + k * 0.45), bx = Math.cos(ba) * rr, bz = Math.sin(ba) * rr, c = tints[(bi * 5) % tints.length], sc = 0.026 + 0.006 * ((bi * 13) % 3) / 2;
        crowd.add(bird, trs(bx, yy + 0.012, bz, face(ba) + ((bi % 5) - 2) * 0.15, 0, 0, sc), { tint: c, wob: [-0.006 - 0.004 * (bi % 3), bi * 1.37] });
        bi++;
      }
    }
  }
  // 문: 나무 기둥 둘 + 휜 들보 + 천 현수막(대장 판에선 색이 바뀐다)
  const gz = -(R + 0.075);
  const pillar = sdfMesh((x, y, z) => smin(rbox(x, y, z, [0, 0.13, 0], [0.018, 0.13, 0.018], 0.008), rbox(x, y, z, [0, 0.01, 0], [0.03, 0.012, 0.03], 0.008), 0.01), P('#9b2f2a', 0.55, 0.05), [-0.05, -0.02, -0.05], [0.05, 0.3, 0.05], 0.006);
  props.add(pillar, trs(-0.13, -0.05, gz, 0, 0, 0, 1, 1.15, 1));
  props.add(pillar, trs(0.13, -0.05, gz, 0, 0, 0, 1, 1.15, 1));
  const beam = sdfMesh((x, y, z) => {
    const yb = 0.27 + 0.01 * (x / 0.19) ** 2;
    return Math.min(rbox(x, y - yb, z, [0, 0, 0], [0.19, 0.016, 0.026], 0.012), rbox(x, y, z, [0, 0.225, 0], [0.15, 0.009, 0.016], 0.006));
  }, (_x, y) => [...(y > 0.25 ? hex('#3b2a26') : hex('#b23a30')), 0.5, 0.05], [-0.22, 0.2, -0.04], [0.22, 0.31, 0.04], 0.006);
  props.add(beam, trs(0, -0.03, gz));
  // 짚단 넷
  const bale = sdfMesh((x, y, z) => rbox(x, y, z, [0, 0.03, 0], [0.05, 0.03, 0.03], 0.014), (x, y, z) => [...mix3(hex('#d6a94c'), hex('#f3d886'), vnoise(x * 120, y * 300, z * 120)), 0.9, 0.1], [-0.07, -0.01, -0.05], [0.07, 0.07, 0.05], 0.006);
  for (const a of [0.2, 0.8, 1.25, 1.75].map((q) => q * Math.PI)) props.add(bale, trs(Math.cos(a) * (R + 0.09), -0.045, Math.sin(a) * (R + 0.09) + (a > Math.PI ? 0 : 0.02), -a));
  // 깃발 줄: 관중석 꼭대기를 잇는 삼각 깃발
  const flag = flagMesh();
  const fcol = ['#ff5a4e', '#ffd23f', '#3fa7ff', '#ffffff', '#4fd18b'].map(hex);
  for (let i = 0; i < 46; i++) {
    const a = Math.PI * (1.02 + (0.96 * i) / 45), rr = R + 0.34, sag = 0.02 * Math.sin(((i % 9) / 9) * Math.PI);
    props.add(flag, trs(Math.cos(a) * rr, 0.25 - sag, Math.sin(a) * rr, face(a), 0, 0, 0.022), { tint: fcol[i % fcol.length], sway: 0.25, wob: [0, i * 0.7] });
  }
  const pole = sdfMesh((x, y, z) => cap(x, y, z, [0, 0, 0], [0, 0.3, 0], 0.008), P('#e8e0d0', 0.4), [-0.02, -0.02, -0.02], [0.02, 0.32, 0.02], 0.005);
  for (const a of [1.02, 1.26, 1.5, 1.74, 1.98].map((q) => q * Math.PI)) props.add(pole, trs(Math.cos(a) * (R + 0.34), -0.05, Math.sin(a) * (R + 0.34)));
  // 나무: 뒤쪽과 옆을 둘러싼 둥근 숲(바람에 흔들림)
  const trees = [treeMesh(1), treeMesh(2), treeMesh(3)];
  let ti = 0;
  for (let k = 0; k < 150; k++) {
    const near = k < 60, a = Math.PI * (0.9 + 1.2 * ((k * 0.618) % 1)), d = near ? 0.98 + ((k * 0.37) % 1) * 0.5 : 1.5 + ((k * 0.37) % 1) * 3 + (k % 3) * 0.25;
    const x = Math.cos(a) * d, z = Math.sin(a) * d - 0.1;
    if (z > 0.25 && Math.abs(x) < 1.2) continue;
    const sc = near ? 0.1 + 0.07 * ((k * 0.73) % 1) : 0.13 + 0.08 * ((k * 0.73) % 1) + d * 0.045;
    foliage.add(trees[ti++ % 3], trs(x, hf(x, z) - 0.01, z, k, 0, 0, sc), { sway: 0.05, wob: [0, k * 1.9] });
  }
  // 앞쪽 가장자리 풀포기·꽃(전경)
  const tuft = tuftMesh(), flower = flowerMesh();
  for (let k = 0; k < 260; k++) {
    const a = ((k * 0.618) % 1) * Math.PI * 2, d = R + 0.09 + ((k * 0.414) % 1) * 0.75, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if ((z < -R - 0.05 && Math.abs(x) < 0.9) || z > 0.75) continue;
    foliage.add(k % 4 === 0 ? flower : tuft, trs(x, hf(x, z), z, k * 2.1, 0, 0, 0.03 + 0.02 * ((k * 0.31) % 1)), { sway: 0.4, wob: [0, k * 0.9], tint: k % 4 === 0 ? [hex('#ff8fb1'), hex('#fff1a8'), hex('#ffffff')][k % 3] : undefined });
  }
  // 문 위 등불(유령이 앉는 곳)
  const lamp = sdfMesh((x, y, z) => ell(x, y, z, 0, 0, 0, 1, 0.8, 1), P('#fff1c4', 0.3, 1), [-1.1, -0.9, -1.1], [1.1, 0.9, 1.1], 0.12);
  // 구름(멀리, 하늘 띠에)
  const cl = new Batch();
  const cloud = sdfMesh((x, y, z) => smax(smin(smin(sph(x, y, z, 0, 0, 0, 0.5), sph(x, y, z, 0.55, -0.1, 0, 0.38), 0.3), smin(sph(x, y, z, -0.55, -0.12, 0, 0.36), sph(x, y, z, 0.15, 0.25, 0.05, 0.36), 0.3), 0.3), -0.2 - y, 0.1), P('#ffffff', 0.95, 0.8), [-1, -0.45, -0.6], [1, 0.7, 0.6], 0.06);
  for (const [x, y, z, s] of [[-2.2, 1.6, -5.6, 0.8], [1.6, 1.9, -6, 1], [3.5, 1.4, -5, 0.7], [-4.2, 1.2, -4.6, 0.6]]) cl.add(cloud, trs(x, y, z, 0, 0, 0, s, s * 0.7, s));
  return { ground, arena: arena.done(), props: props.done(), crowd: crowd.done(), foliage: foliage.done(), lamp, clouds: cl.done() };
}

function birdMesh(): Mesh {
  const f: SDF = (x, y, z) => smin(ell(x, y, z, 0, 0.55, 0, 0.5, 0.55, 0.48), sph(x, y, z, 0, 1.15, 0.05, 0.36), 0.25);
  const g: SDF = (x, y, z) => Math.min(f(x, y, z), rcone(x, y, z, [0, 1.12, 0.32], [0, 1.08, 0.55], 0.11, 0.02));
  return sdfMesh(g, (x, y, z) => {
    if (z > 0.3 && y > 1.0 && y < 1.2 && Math.abs(x) < 0.12) return [...hex('#ffb13b'), 0.5, 0];
    if (Math.abs(Math.abs(x) - 0.15) < 0.07 && Math.abs(y - 1.24) < 0.08 && z > 0.25) return [0.08, 0.07, 0.1, 0.2, 0];
    if (z > 0.2 && y < 0.8) return [1, 0.96, 0.9, 0.9, 0.2];
    return [0.92, 0.92, 0.92, 0.85, 0.2];
  }, [-0.6, -0.05, -0.6], [0.6, 1.55, 0.7], 0.07, { aoF: (x, y, z) => Math.min(g(x, y, z), y) });
}
function flagMesh(): Mesh {
  // 얇은 삼각 천(양면)
  const v = new Float32Array(6 * 14), q = [[-0.5, 0, 0], [0.5, 0, 0], [0, -1.1, 0]];
  for (let s = 0; s < 2; s++) for (let k = 0; k < 3; k++) {
    const o = (s * 3 + k) * 14;
    v.set([q[k][0], q[k][1], q[k][2] + (s ? -0.01 : 0.01), 0, 0, s ? -1 : 1, 1, 1, 1, 1, 0.8, 0.6, 0, 0], o);
  }
  return { v, i: new Uint32Array([0, 1, 2, 3, 5, 4]) };
}
function treeMesh(seed: number): Mesh {
  const blobs: [number, number, number, number][] = [];
  for (let k = 0; k < 7; k++) {
    const a = k * 2.4 + seed, h = 1.0 + 0.35 * Math.sin(k * 1.7 + seed);
    blobs.push([Math.cos(a) * 0.32 * (k ? 1 : 0), h + (k ? 0 : 0.3), Math.sin(a) * 0.32 * (k ? 1 : 0), k ? 0.36 : 0.48]);
  }
  const canopy: SDF = (x, y, z) => {
    let d = 9;
    for (const [bx, by, bz, br] of blobs) d = smin(d, sph(x, y, z, bx, by, bz, br), 0.25);
    return d + 0.03 * (vnoise(x * 9, y * 9, z * 9) - 0.5);
  };
  const trunk: SDF = (x, y, z) => rcone(x, y, z, [0, 0, 0], [0, 1.0, 0], 0.11, 0.06);
  const f: SDF = (x, y, z) => Math.min(canopy(x, y, z), trunk(x, y, z));
  const g = [hex('#2c6a26'), hex('#4f9a2e'), hex('#8cc43e')];
  return sdfMesh(f, (x, y, z) => {
    if (trunk(x, y, z) < canopy(x, y, z)) return [...hex('#7a5232'), 0.9, 0];
    const n = vnoise(x * 5 + seed, y * 5, z * 5), up = Math.min(1, Math.max(0, (y - 0.8) / 0.9));
    return [...mix3(mix3(g[0], g[1], n), g[2], up * 0.5), 0.9, 0.25];
  }, [-0.95, -0.02, -0.95], [0.95, 1.95, 0.95], 0.07, { aoF: (x, y, z) => Math.min(f(x, y, z), y), aoD: 0.4 });
}
function tuftMesh(): Mesh {
  const f: SDF = (x, y, z) => {
    let d = 9;
    for (let k = 0; k < 5; k++) {
      const a = k * 1.26, tx = Math.cos(a) * 0.35, tz = Math.sin(a) * 0.35;
      d = Math.min(d, rcone(x, y, z, [tx * 0.2, 0, tz * 0.2], [tx, 0.9 + 0.2 * (k % 2), tz], 0.09, 0.015));
    }
    return d;
  };
  return sdfMesh(f, (_x, y) => [...mix3(hex('#4f9a35'), hex('#b5e86e'), Math.min(1, y)), 0.8, 0.5], [-0.5, -0.05, -0.5], [0.5, 1.15, 0.5], 0.06);
}
function flowerMesh(): Mesh {
  const f: SDF = (x, y, z) => {
    let d = cap(x, y, z, [0, 0, 0], [0, 0.7, 0], 0.05);
    for (let k = 0; k < 5; k++) d = smin(d, ell(x, y, z, Math.cos(k * 1.257) * 0.2, 0.8, Math.sin(k * 1.257) * 0.2, 0.16, 0.06, 0.16), 0.05);
    return smin(d, sph(x, y, z, 0, 0.83, 0, 0.1), 0.04);
  };
  return sdfMesh(f, (x, y, z) => (y < 0.7 ? [...hex('#4f9a35'), 0.8, 0.3] : Math.hypot(x, z) < 0.11 ? [...hex('#ffcf3a'), 0.6, 0.2] : [1, 1, 1, 0.6, 0.6]), [-0.45, -0.05, -0.45], [0.45, 1, 0.45], 0.045);
}

// ───────────────────────── 몸 ─────────────────────────
/** 한 몸의 그림: 몸통(얼굴 포함, 적/내 몸 표정 둘) + 따로 움직이는 부품(곰 돌주먹 등) */
export interface Rig { foe: Mesh; me: Mesh; parts: { mesh: Mesh; at: V3 }[]; h: number }
type Face = 'foe' | 'me';

/** 눈·눈썹·볼을 칠하는 공통 칠하기 — 눈 가운데(ex, ey, ez), 크기 er */
function facePaint(base: Paint, eyes: [number, number, number, number][], face: Face, cheek?: [number, number, number, number]): Paint {
  return (x, y, z) => {
    for (const [ex, ey, ez, er] of eyes) {
      const d = Math.hypot((x - ex) / er, (y - ey) / (er * 1.25), (z - ez) / er);
      if (d < 1.15) {
        const hl = Math.hypot(x - (ex - er * 0.3), y - (ey + er * 0.42)) < er * 0.33;
        if (hl) return [1, 1, 1, 0.1, 0];
        if (face === 'me' && Math.hypot(x - ex, y - ey) < er * 0.55) return [...hex('#3ee8ff'), 0.15, 0];
        return [...hex('#17131f'), 0.12, 0];
      }
    }
    if (cheek) {
      const [cx, cy, cz, cr] = cheek;
      if (Math.hypot(Math.abs(x) - cx, y - cy, z - cz) < cr) return [...mix3(base(x, y, z), hex('#ff7f9a'), 0.55), 0.6, 0.3];
    }
    return base(x, y, z);
  };
}
/** 눈썹: 적은 안쪽이 내려간 화난 눈썹, 내 몸은 올라간 신난 눈썹 */
const brow = (x: number, y: number, z: number, ex: number, ey: number, ez: number, er: number, face: Face) => {
  const ax = Math.abs(x), up = er * 1.75;
  const inY = face === 'foe' ? ey + up - er * 0.45 : ey + up + er * 0.15, outY = face === 'foe' ? ey + up + er * 0.35 : ey + up;
  return cap(ax, y, z, [ex - er * 0.95, inY, ez], [ex + er * 0.95, outY, ez - er * 0.25], er * 0.3);
};

function bean(face: Face): Mesh {
  const E: [number, number, number, number][] = [[0.36, 1.05, 0.83, 0.17], [-0.36, 1.05, 0.83, 0.17]];
  const body: SDF = (x, y, z) => smax(ell(x, y, z, 0, 0.95, 0, 1, 0.98, 0.94), 0.03 - y, 0.12);
  const leaf = (x: number, y: number, z: number, sgn: number) => {
    const [lx, ly] = rz(x - sgn * 0.3, y - 2.18, sgn * -0.5);
    return ell(lx, ly, z, 0, 0, 0, 0.34, 0.07, 0.2);
  };
  const sprout: SDF = (x, y, z) => Math.min(cap(x, y, z, [0, 1.8, 0], [0.03, 2.2, 0], 0.07), leaf(x, y, z, 1), leaf(x, y, z, -1));
  const f: SDF = (x, y, z) => {
    let d = smin(body(x, y, z), sprout(x, y, z), 0.12);
    for (const [ex, ey, ez, er] of E) d = smin(d, ell(x, y, z, ex, ey, ez - 0.04, er, er * 1.25, er * 0.7), 0.04);
    return Math.min(d, brow(x, y, z, 0.36, 1.05, 0.86, 0.17, face));
  };
  const base: Paint = (x, y, z) => {
    if (sprout(x, y, z) < body(x, y, z) - 0.02) return [...hex('#4fbf3a'), 0.45, 0.5];
    const t = Math.min(1, Math.max(0, (y - 0.1) / 1.7));
    return [...mix3(hex('#4f9e2e'), hex('#a6ea64'), t), 0.32, 0.75];
  };
  const paint = facePaint((x, y, z) => (brow(x, y, z, 0.36, 1.05, 0.86, 0.17, face) < 0.02 ? [...hex('#2c5a1c'), 0.5, 0] : (y < 0.75 && y > 0.6 && Math.abs(x) < 0.14 && z > 0.8 ? [...hex('#2a1f2a'), 0.4, 0] : base(x, y, z))), E, face, [0.58, 0.82, 0.72, 0.13]);
  return sdfMesh(f, paint, [-1.1, -0.05, -1.05], [1.1, 2.45, 1.1], 0.07, { aoF: (x, y, z) => Math.min(f(x, y, z), y + 0.02) });
}
function bear(face: Face): Mesh {
  const E: [number, number, number, number][] = [[0.24, 1.68, 0.54, 0.09], [-0.24, 1.68, 0.54, 0.09]];
  const fur = (x: number, y: number, z: number) => 0.025 * (vnoise(x * 14, y * 14, z * 14) - 0.5);
  const torso: SDF = (x, y, z) => {
    let d = smin(ell(x, y, z, 0, 0.78, 0, 0.82, 0.76, 0.72), sph(x, y, z, 0, 1.58, 0.06, 0.58), 0.3);
    d = smin(d, Math.min(sph(x, y, z, 0.44, 2.04, 0, 0.19), sph(x, y, z, -0.44, 2.04, 0, 0.19)), 0.1);
    d = smin(d, ell(x, y, z, 0, 1.44, 0.52, 0.3, 0.22, 0.22), 0.1);
    d = smin(d, Math.min(cap(x, y, z, [0.38, 0.05, 0.12], [0.38, 0.35, 0.1], 0.22), cap(x, y, z, [-0.38, 0.05, 0.12], [-0.38, 0.35, 0.1], 0.22)), 0.12);
    d = smin(d, Math.min(cap(x, y, z, [0.62, 1.1, 0.05], [0.88, 0.75, 0.3], 0.2), cap(x, y, z, [-0.62, 1.1, 0.05], [-0.88, 0.75, 0.3], 0.2)), 0.12);
    return smax(d, 0.02 - y, 0.08) + fur(x, y, z);
  };
  const f: SDF = (x, y, z) => {
    let d = torso(x, y, z);
    d = Math.min(d, ell(x, y, z, 0, 1.52, 0.74, 0.12, 0.085, 0.07));
    for (const [ex, ey, ez, er] of E) d = smin(d, sph(x, y, z, ex, ey, ez - 0.03, er), 0.02);
    return Math.min(d, brow(x, y, z, 0.24, 1.68, 0.58, 0.09, face));
  };
  const base: Paint = (x, y, z) => {
    if (ell(x, y, z, 0, 1.52, 0.74, 0.14, 0.1, 0.09) < 0) return [...hex('#1d1616'), 0.15, 0];
    if (brow(x, y, z, 0.24, 1.68, 0.58, 0.09, face) < 0.02) return [...hex('#3a2416'), 0.8, 0];
    const n = vnoise(x * 10, y * 10, z * 10);
    if ((z > 0.42 && y > 0.25 && y < 1.05 && Math.abs(x) < 0.5) || ell(x, y, z, 0, 1.44, 0.52, 0.34, 0.26, 0.26) < 0) return [...mix3(hex('#d9a774'), hex('#ecc596'), n), 0.85, 0.15];
    if (Math.hypot(Math.abs(x) - 0.44, y - 2.04) < 0.11 && z > 0.05) return [...hex('#e59a8c'), 0.8, 0.2];
    return [...mix3(hex('#7a4a2c'), hex('#a8693e'), n * 0.7 + Math.min(1, y / 2.2) * 0.3), 0.9, 0.12];
  };
  return sdfMesh(f, facePaint(base, E, face), [-1.15, -0.05, -0.85], [1.15, 2.3, 0.95], 0.065, { aoF: (x, y, z) => Math.min(f(x, y, z), y + 0.02) });
}
function fist(): Mesh {
  const f: SDF = (x, y, z) => sph(x, y, z, 0, 0, 0, 0.4) + 0.06 * (vnoise(x * 5, y * 5, z * 5) - 0.5) + 0.02 * (vnoise(x * 13, y * 13, z * 13) - 0.5);
  return sdfMesh(f, (x, y, z) => {
    const n = vnoise(x * 7, y * 7, z * 7);
    if (y > 0.22 && n > 0.62) return [...hex('#7fbf4a'), 0.9, 0.3];
    return [...mix3(hex('#7d8794'), hex('#c3ccd6'), n), 0.55, 0];
  }, [-0.5, -0.5, -0.5], [0.5, 0.5, 0.5], 0.05);
}
/** 아직 다듬기 전의 몸: 몸통 + 귀/뿔/가시 하나로 실루엣만 다르게(👁 S5에서 전부 바꿀 자리) */
function critter(face: Face, col: string, feat: 'spike' | 'eyesTop' | 'horn' | 'tusk' | 'none'): Mesh {
  const E: [number, number, number, number][] = feat === 'eyesTop' ? [[0.38, 1.45, 0.42, 0.2], [-0.38, 1.45, 0.42, 0.2]] : [[0.3, 1.12, 0.78, 0.14], [-0.3, 1.12, 0.78, 0.14]];
  const body: SDF = (x, y, z) => smax(ell(x, y, z, 0, 0.9, 0, 1, feat === 'eyesTop' ? 0.75 : 0.92, 0.92), 0.03 - y, 0.1);
  const extra: SDF = (x, y, z) => {
    if (feat === 'spike') {
      let d = 9;
      for (let k = 0; k < 9; k++) {
        const a = -1.3 + k * 0.33, bx = Math.sin(a) * 0.7, by = 1.1 + Math.cos(a) * 0.65;
        d = Math.min(d, rcone(x, y, z, [bx * 0.8, by * 0.95, -0.3], [bx * 1.35, by * 1.15 + 0.1, -0.75], 0.17, 0.02));
      }
      return d;
    }
    if (feat === 'eyesTop') return Math.min(sph(x, y, z, 0.38, 1.42, 0.3, 0.28), sph(x, y, z, -0.38, 1.42, 0.3, 0.28));
    if (feat === 'horn') return Math.min(torus2(x - 0.42, y - 1.75, z, 0.22, 0.08), torus2(x + 0.42, y - 1.75, z, 0.22, 0.08));
    if (feat === 'tusk') return Math.min(rcone(x, y, z, [0.3, 0.75, 0.75], [0.45, 1.05, 1.0], 0.08, 0.02), rcone(x, y, z, [-0.3, 0.75, 0.75], [-0.45, 1.05, 1.0], 0.08, 0.02));
    return 9;
  };
  const f: SDF = (x, y, z) => {
    let d = smin(body(x, y, z), extra(x, y, z), 0.08);
    for (const [ex, ey, ez, er] of E) d = smin(d, sph(x, y, z, ex, ey, ez - 0.05, er), 0.03);
    return Math.min(d, brow(x, y, z, E[0][0], E[0][1], E[0][2] + 0.03, E[0][3], face));
  };
  const c = hex(col);
  const base: Paint = (x, y, z) => {
    if (brow(x, y, z, E[0][0], E[0][1], E[0][2] + 0.03, E[0][3], face) < 0.02) return [...mix3(c, [0, 0, 0], 0.6), 0.8, 0];
    if (extra(x, y, z) < body(x, y, z) - 0.02) return [...(feat === 'tusk' || feat === 'horn' ? hex('#f3ead8') : mix3(c, [0, 0, 0], 0.35)), 0.5, 0];
    return [...mix3(mix3(c, [0, 0, 0], 0.25), c, Math.min(1, y / 1.6)), 0.75, 0.2];
  };
  return sdfMesh(f, facePaint(base, E, face), [-1.25, -0.05, -1.2], [1.25, 2.2, 1.25], 0.075, { aoF: (x, y, z) => Math.min(f(x, y, z), y + 0.02) });
}
const torus2 = (x: number, y: number, z: number, R: number, r: number) => Math.hypot(Math.hypot(x, y) - R, z) - r;

/** 유령 '훌': 둥근 머리 + 물결 꼬리, 큰 눈, 볼 — 반투명 발광으로 그린다 */
export function ghostMesh(): Mesh {
  const f: SDF = (x, y, z) => {
    const wave = 0.06 * Math.sin(Math.atan2(z, x) * 5) * Math.max(0, 0.5 - y);
    let d = smin(sph(x, y, z, 0, 1.0, 0, 0.72), rcone(x, y, z, [0, 0.9, 0], [0.06, 0.05, -0.3], 0.66, 0.12), 0.35) + wave;
    d = smin(d, Math.min(sph(x, y, z, 0.66, 0.78, 0.18, 0.15), sph(x, y, z, -0.66, 0.78, 0.18, 0.15)), 0.12);
    return d;
  };
  const E: [number, number, number, number][] = [[0.25, 1.05, 0.66, 0.13], [-0.25, 1.05, 0.66, 0.13]];
  const paint = facePaint((x, y, z) => (Math.abs(x) < 0.09 && y > 0.78 && y < 0.86 && z > 0.6 ? [...hex('#3b2a4a'), 0.3, 0] : [...mix3(hex('#bdf6ff'), hex('#ffffff'), Math.min(1, y / 1.5)), 0.25, 1]), E, 'foe', [0.45, 0.86, 0.56, 0.12]);
  return sdfMesh(f, paint, [-0.95, -0.4, -0.95], [0.95, 1.8, 0.95], 0.06);
}

const RIGS: Partial<Record<string, () => Rig>> = {
  bean: () => ({ foe: bean('foe'), me: bean('me'), parts: [], h: 2.3 }),
  bear: () => { const f = fist(); return { foe: bear('foe'), me: bear('me'), parts: [{ mesh: f, at: [1.05, 0.55, 0.42] }, { mesh: f, at: [-1.05, 0.55, 0.42] }], h: 2.25 }; },
};
const CRIT: Record<string, [string, 'spike' | 'eyesTop' | 'horn' | 'tusk' | 'none']> = {
  hedge: ['#b07a52', 'spike'], frog: ['#55c46a', 'eyesTop'], goat: ['#f2ede2', 'horn'], boar: ['#7a4e36', 'tusk'], mole: ['#8a6a5a', 'none'],
  turtle: ['#5fb07f', 'none'], cloud: ['#e4ecf8', 'none'], shroom: ['#e0524a', 'none'], tanuki: ['#a07a5a', 'none'], crab: ['#ff7a5c', 'none'], dragon: ['#6a7ae0', 'tusk'],
};
export function rigOf(k: string): Rig {
  const r = RIGS[k];
  if (r) return r();
  const [c, ft] = CRIT[k] ?? ['#cccccc', 'none'];
  return { foe: critter('foe', c, ft), me: critter('me', c, ft), parts: [], h: 2.1 };
}
/** 펑 섬광·충격파·바닥 고리용 기본 형상 */
export const ballMesh = () => sdfMesh((x, y, z) => sph(x, y, z, 0, 0, 0, 1), () => [1, 1, 1, 0.5, 0], [-1.1, -1.1, -1.1], [1.1, 1.1, 1.1], 0.2);
export const ringMesh = () => torus(1, 0.035, 96, 6, () => [1, 1, 1, 0.5, 0]);
export const discMesh = () => lathe([[0, 0], [1, 0]], 64, () => [1, 1, 1, 0.5, 0]);
