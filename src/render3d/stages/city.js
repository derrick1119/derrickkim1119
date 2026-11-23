// 4. 도시(노을 진 시내): 창문 격자가 있는 빌딩 블록(불 켜진 창은 블룸), 두툼한 옥상 난간과 소품(물탱크·실외기·안테나),
//    네온 간판 가게, 광고판, 불 켜진 가로등, 왼쪽 뒤 전구가 반짝이는 대관람차, 오른쪽 뒤 첨탑 빌딩,
//    그리고 탐조등 원뿔로 거리를 훑으며 맴도는 경찰 헬기.
//    값 구조: 앞 보도는 따뜻한 밝은 돌, 가게 줄은 진한 색과 빛, 뒤 빌딩은 노을 안개에 잠긴 연보라 실루엣.
import {
  THREE, P, G, bake, bakeV, terrain, cloudLayer, cloudMat, roundTree, bush, streetLamp, car, stripGround, speckle,
  halfW, smooth, rgb, mixv, rng, TAU, cachedTex, glowPoints, mix, screenModel, sphereGeo, boxGeo, roundBoxGeo, cylGeo,
  coneGeo, capsuleGeo, torusGeo, LEAF, glowS, sharedMat, scatter, partsGeo, inkLine, dimWithWeather,
} from './common.js';
import { glowTexture } from '../kit.js';

// ───────── 창문 무늬 ─────────

const CELLS = 8;
function windowTextures() {
  const r = rng(41);
  const lit = [];
  for (let i = 0; i < CELLS * CELLS; i++) lit.push(r() < 0.2 ? 1 + ((r() * 3) | 0) : 0);
  const S = 64;
  const rr = (ctx, x, y, w, h, k) => {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, k);
    else ctx.rect(x, y, w, h);
    ctx.fill();
  };
  // 장난감 빌딩 창: 큼직한 둥근 창 하나씩, 벽과 창의 대비는 낮게(멀리서 잔무늬가 되지 않게)
  const map = cachedTex('cityWin3', S * CELLS, S * CELLS, (ctx) => {
    for (let j = 0; j < CELLS; j++) {
      for (let i = 0; i < CELLS; i++) {
        const x = i * S;
        const y = j * S;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, S, S);
        // 층 띠(아래 살짝 그늘)
        ctx.fillStyle = '#ece8f2';
        ctx.fillRect(x, y + S - 7, S, 7);
        const L = lit[j * CELLS + i];
        const gx = x + 11;
        const gy = y + 9;
        const gw = S - 22;
        const gh = S - 22;
        ctx.fillStyle = '#e4deee';
        rr(ctx, gx - 3, gy - 3, gw + 6, gh + 6, 9);
        if (L) {
          const g = ctx.createLinearGradient(0, gy, 0, gy + gh);
          g.addColorStop(0, ['#ffeab0', '#ffdc9a', '#ffd6b8'][L - 1]);
          g.addColorStop(1, ['#ffcc70', '#ffbb66', '#ffa88a'][L - 1]);
          ctx.fillStyle = g;
        } else {
          const g = ctx.createLinearGradient(gx, gy, gx + gw, gy + gh);
          g.addColorStop(0, '#a8b0e0');
          g.addColorStop(1, '#6a72b4');
          ctx.fillStyle = g;
        }
        rr(ctx, gx, gy, gw, gh, 7);
        if (!L) {
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          rr(ctx, gx + 5, gy + 5, gw * 0.22, gh * 0.5, 4);
        }
      }
    }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const emi = cachedTex('cityWinE3', S * CELLS, S * CELLS, (ctx) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, S * CELLS, S * CELLS);
    for (let j = 0; j < CELLS; j++) {
      for (let i = 0; i < CELLS; i++) {
        const L = lit[j * CELLS + i];
        if (!L) continue;
        ctx.fillStyle = ['#ffd27a', '#ffb860', '#ff9a7a'][L - 1];
        rr(ctx, i * S + 11, j * S + 9, S - 22, S - 22, 7);
      }
    }
  });
  emi.wrapS = emi.wrapT = THREE.RepeatWrapping;
  return { map, emi };
}

/** 빌딩 재질 하나(색은 꼭짓점 색으로) → 굽기 때 모든 빌딩이 한 덩어리(그리기 1번)로 합쳐진다. */
function towerMat() {
  return sharedMat('city:tower', () => {
    const { map, emi } = windowTextures();
    // 불 켜진 창은 방출 1.5 → 가장 밝은 노란 창만 블룸 문턱을 살짝 넘는다(군데군데 반짝)
    return new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, map, emissiveMap: emi, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 1.5, roughness: 0.62, envMapIntensity: 0.75 });
  });
}

/** 창문 격자가 맞게 UV 를 늘린 상자. 위·아래 면은 벽색 칸 하나. */
function towerGeo(w, h, d, colW, floorH, ou, ov) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const faceSize = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [fw, fh] = faceSize[f];
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      if (f === 2 || f === 3) {
        uv.setXY(i, 0.02 + ou / CELLS, 0.97);
        continue;
      }
      uv.setXY(i, (uv.getX(i) * Math.max(1, Math.round(fw / colW)) + ou) / CELLS, (uv.getY(i) * Math.max(1, Math.round(fh / floorH)) + ov) / CELLS);
    }
  }
  return g;
}

function tower(parent, x, z, w, h, d, tint, r, { colW = 0.62, floorH = 0.68, ry = 0, trim = true, ink = 0 } = {}) {
  const geo = towerGeo(w, h, d, colW, floorH, (r() * CELLS) | 0, (r() * CELLS) | 0);
  const c = new THREE.Color(tint);
  const col = new Float32Array(geo.attributes.position.count * 3);
  for (let i = 0; i < col.length; i += 3) col.set([c.r, c.g, c.b], i);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(geo, towerMat());
  m.position.set(x, h / 2, z);
  m.rotation.y = ry;
  m.userData.ownGeometry = true;
  if (ink) {
    m.userData.ol = ink;
    m.userData.olCol = mix(tint, '#2a2058', 0.62);
  }
  parent.add(m);
  if (trim) {
    // 두툼한 옥상 난간 + 1층 받침(빌딩 덩어리를 또렷하게)
    const dark = mix(tint, '#2a2a5a', 0.42);
    const cap = P(roundBoxGeo(w + 0.16, 0.24, d + 0.16, 0.06, 1), '', { pos: [x, h + 0.06, z], rot: [0, ry, 0], fin: 'soft', tt: [dark, mix(tint, '#ffffff', 0.25)] });
    parent.add(cap);
    parent.add(P(roundBoxGeo(w + 0.06, 0.5, d + 0.06, 0.04, 1), dark, { pos: [x, 0.25, z], rot: [0, ry, 0], fin: 'soft' }));
    if (ink) inkLine(cap, ink);
  }
  return m;
}

// ───────── 소품 ─────────

function waterTank(parent, x, y, z, s) {
  const g = G(parent, x, y, z, 0, s);
  for (const [lx, lz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) g.add(P(cylGeo(0.035, 0.035, 0.5, 5), '#5a3a2a', { pos: [lx, 0.25, lz] }));
  g.add(P(cylGeo(0.4, 0.4, 0.62, 14), '', { pos: [0, 0.8, 0], tt: ['#7a4a30', '#c8905a'] }));
  for (const yy of [0.62, 0.95]) g.add(P(torusGeo(0.405, 0.022, 4, 18), '#4a2a1a', { pos: [0, yy, 0], rot: [Math.PI / 2, 0, 0] }));
  g.add(P(coneGeo(0.45, 0.32, 14), '', { pos: [0, 1.27, 0], tt: ['#4a3028', '#8a5a44'] }));
  return g;
}

function billboard(parent, x, y, z, ry, s, tex, bulbs, legs = true) {
  const g = G(parent, x, y, z, ry, s);
  if (legs) for (const lx of [-0.7, 0.7]) g.add(P(roundBoxGeo(0.08, 0.62, 0.08, 0.02, 1), '#2e3768', { pos: [lx, 0.3, 0] }));
  g.add(P(roundBoxGeo(2.2, 1.2, 0.12, 0.05, 1), '#2e3768', { pos: [0, 1.1, -0.04], fin: 'soft' }));
  const panel = new THREE.Mesh(sharedMat('city:billGeo', () => {
    const pg = new THREE.PlaneGeometry(1.96, 0.96);
    pg.userData.shared = true;
    return pg;
  }), billMat(tex));
  panel.position.set(0, 1.1, 0.03);
  g.add(panel);
  // 테두리 전구(블룸)
  g.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  for (let i = 0; i < 22; i++) {
    const t = i / 22;
    const per = t * 6.2;
    const px = per < 2.1 ? -1.05 + per : per < 3.1 ? 1.05 : per < 5.2 ? 1.05 - (per - 3.1) : -1.05;
    const py = per < 2.1 ? 0.55 : per < 3.1 ? 0.55 - (per - 2.1) * 1.1 : per < 5.2 ? -0.55 : -0.55 + (per - 5.2) * 1.1;
    v.set(px, 1.1 + py, 0.08).applyMatrix4(g.matrixWorld);
    bulbs.push([v.x, v.y, v.z, i % 2 ? '#fff0a0' : '#ffb0d0']);
  }
  for (const lx of [-0.6, 0, 0.6]) g.add(P(roundBoxGeo(0.14, 0.06, 0.16, 0.02, 1), '#2e3768', { pos: [lx, 0.52, 0.14] }));
  if (!legs) g.add(P(roundBoxGeo(1.6, 0.08, 0.5, 0.02, 1), '#2e3768', { pos: [0, 0.5, -0.2] }));
  return g;
}
function billMat(tex) {
  return sharedMat(`city:bill${tex.uuid}`, () => new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 1.15, roughness: 0.6 }));
}

function adTexture() {
  return cachedTex('cityAd', 512, 256, (ctx, W, Hh) => {
    const g = ctx.createLinearGradient(0, 0, W, Hh);
    g.addColorStop(0, '#ff6fa8');
    g.addColorStop(1, '#ffb347');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, Hh);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(140, 150, 78, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#7fe0ff';
    ctx.beginPath();
    ctx.ellipse(140, 92, 70, 52, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ff4f7a';
    ctx.beginPath();
    ctx.arc(140, 50, 16, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(62, 150, 156, 18);
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SNOW', 260, 118);
    ctx.fillText('ICE!', 270, 190);
    ctx.fillStyle = '#fff59a';
    for (const [sx, sy, sr] of [[470, 40, 14], [240, 40, 9], [480, 210, 10]]) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU - Math.PI / 2;
        const rr = i % 2 ? sr * 0.45 : sr;
        ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
      }
      ctx.fill();
    }
  });
}

function shop(parent, x, z, w, floors, wall, awning, r, lamps) {
  const g = G(parent, x, 0, z, 0, 1);
  const h = 0.62 + floors * 0.6;
  g.add(P(roundBoxGeo(w, h, 1.4, 0.04, 1), '', { pos: [0, h / 2, 0], fin: 'soft', tt: [mix(wall, '#3a2a6a', 0.3), mix(wall, '#fff4e0', 0.15)] }));
  g.add(P(roundBoxGeo(w + 0.14, 0.18, 1.54, 0.05, 1), mix(wall, '#2e3768', 0.45), { pos: [0, h + 0.07, 0], fin: 'soft' }));
  // 1층 진열창(불 켜짐, 블룸)
  g.add(P(roundBoxGeo(w * 0.8, 0.42, 0.05, 0.02, 1), '#f2b45e', { pos: [0, 0.3, 0.71], fin: 'warm', cast: false }));
  g.add(P(roundBoxGeo(w * 0.86, 0.06, 0.08, 0.02, 1), '#2e3768', { pos: [0, 0.53, 0.73], cast: false }));
  g.add(P(roundBoxGeo(0.05, 0.42, 0.07, 0.02, 1), '#2e3768', { pos: [0, 0.3, 0.73], cast: false }));
  // 줄무늬 차양(끝이 둥근 물결)
  const n = Math.max(3, Math.round(w / 0.24));
  for (let i = 0; i < n; i++) {
    const ax = -w / 2 + (w / n) * (i + 0.5);
    const col = i % 2 ? '#ffffff' : awning;
    g.add(P(boxGeo(w / n + 0.002, 0.045, 0.44), col, { pos: [ax, 0.68, 0.87], rot: [0.5, 0, 0], fin: 'soft' }));
    g.add(P(sphereGeo(1, 8, 5), col, { pos: [ax, 0.58, 1.06], scale: [w / n / 2, 0.06, 0.03], fin: 'soft', cast: false }));
  }
  // 위층 창
  const cols = Math.max(2, Math.round(w / 0.42));
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const on = r() < 0.45;
      const wx = -w / 2 + (w / cols) * (c + 0.5);
      const wy = 0.95 + f * 0.6;
      g.add(P(roundBoxGeo(0.28, 0.34, 0.04, 0.015, 1), '#f4ece0', { pos: [wx, wy, 0.705], fin: 'soft', cast: false }));
      g.add(P(boxGeo(0.2, 0.26, 0.05), on ? '#f6c070' : '#4a5aa0', { pos: [wx, wy, 0.715], fin: on ? 'warm' : 'gloss', cast: false }));
    }
  }
  // 네온 간판(블룸)
  const neon = ['#ff6fa8', '#5ff0ff', '#ffd23f', '#9fff8a', '#c88aff'][(r() * 5) | 0];
  g.add(P(roundBoxGeo(w * 0.52, 0.2, 0.05, 0.04, 1), '#2e3768', { pos: [0, 0.8, 0.72], fin: 'soft', cast: false }));
  g.add(P(roundBoxGeo(w * 0.44, 0.1, 0.06, 0.04, 1), neon, { pos: [0, 0.8, 0.74], fin: 'neon', cast: false }));
  if (r() < 0.7) g.add(P(roundBoxGeo(0.42, 0.28, 0.38, 0.04, 1), '', { pos: [(r() - 0.5) * w * 0.5, h + 0.3, -0.2], fin: 'soft', tt: ['#8a86a8', '#e0dcf0'] }));
  lamps.push([x, 0.3, z + 0.95, '#ffcf7a']);
  inkLine(g, 0.03);
  return { g, h };
}

function helicopter(parent) {
  const root = G(parent);
  root.userData.dynamic = true;
  const body = G(root);
  const navy = '#2b3a78';
  // 경찰 헬기 장난감: 흰 몸통에 남색 띠, 큰 하늘빛 앞유리
  body.add(P(sphereGeo(1, 22, 16), '', { scale: [0.62, 0.44, 0.44], fin: 'soft', tt: ['#9aa4d8', '#ffffff'] }));
  body.add(P(sphereGeo(1, 20, 14), '', { pos: [0.3, 0.06, 0], scale: [0.36, 0.32, 0.37], fin: 'soft', tt: ['#4a8ad8', '#bff0ff'] }));
  body.add(P(sphereGeo(1, 16, 10), navy, { pos: [-0.05, -0.1, 0], scale: [0.6, 0.14, 0.45], fin: 'soft' }));
  body.add(P(capsuleGeo(0.09, 1.1, 4, 10), '', { pos: [-0.85, 0.08, 0], rot: [0, 0, Math.PI / 2 - 0.08], fin: 'soft', tt: ['#9aa4d8', '#ffffff'] }));
  body.add(P(roundBoxGeo(0.24, 0.34, 0.05, 0.02, 1), navy, { pos: [-1.38, 0.24, 0], rot: [0, 0, 0.3], fin: 'soft' }));
  for (const sz of [-0.3, 0.3]) {
    body.add(P(capsuleGeo(0.03, 0.95, 3, 6), '#3c4569', { pos: [0.02, -0.5, sz], rot: [0, 0, Math.PI / 2] }));
    body.add(P(cylGeo(0.02, 0.02, 0.18, 5), '#3c4569', { pos: [0.18, -0.4, sz] }));
    body.add(P(cylGeo(0.02, 0.02, 0.18, 5), '#3c4569', { pos: [-0.18, -0.4, sz] }));
  }
  body.add(P(cylGeo(0.06, 0.08, 0.14, 10), '#3c4569', { pos: [0, 0.46, 0] }));
  body.add(P(sphereGeo(0.06, 8, 6), '#ff3a4a', { pos: [-0.1, 0.42, 0.18], fin: 'neon' }));
  body.add(P(sphereGeo(0.06, 8, 6), '#3a8aff', { pos: [-0.1, 0.42, -0.18], fin: 'neon' }));
  body.add(P(cylGeo(0.09, 0.11, 0.13, 10), '#e9e4f2', { pos: [0.45, -0.3, 0], rot: [0, 0, 0.6], fin: 'soft' }));
  body.add(P(cylGeo(0.075, 0.075, 0.03, 10), '#fff6d8', { pos: [0.49, -0.36, 0], rot: [0, 0, 0.6], fin: 'glow' }));
  for (let i = 0; i < 2; i++) body.add(P(roundBoxGeo(0.4, 0.04, 0.02, 0.01, 1), '#e9e4f2', { pos: [-1.42, 0.25, 0.06], rot: [0, 0, (i * Math.PI) / 2 + 0.4], fin: 'soft' }));
  inkLine(body, 0.035);
  bakeV(body, { ao: 0 });
  const rotor = G(root, 0, 0.55, 0);
  for (let i = 0; i < 4; i++) rotor.add(P(roundBoxGeo(1.5, 0.025, 0.09, 0.01, 1), '#3c4569', { pos: [Math.cos((i * TAU) / 4) * 0.75, 0, -Math.sin((i * TAU) / 4) * 0.75], rot: [0, (i * TAU) / 4, 0] }));
  rotor.add(P(cylGeo(0.07, 0.07, 0.05, 10), '#3c4569'));
  bakeV(rotor, { ao: 0 });
  // 꼬리 날개는 몸통에 붙여 같이 굽는다(그리기 한 번 아끼기)
  const tail = G(root, -1.42, 0.25, 0.06);
  return { root, rotor, tail };
}

/** 대관람차(전구가 반짝인다). 바퀴는 천천히 돈다. 반환: { g, wheel, bulbs(바퀴 기준 좌표) } */
function ferrisWheel(parent, x, y, z, s) {
  const g = G(parent, x, y, z, 0.35, s);
  const R = 3.0;
  const legTT = ['#3a2a74', '#9a88e0'];
  for (const sz of [-0.5, 0.5]) {
    for (const sx of [-1, 1]) g.add(P(cylGeo(0.12, 0.16, 4.2, 10), '', { pos: [sx * 1.0, 1.95, sz], rot: [0, 0, sx * 0.26], fin: 'soft', tt: legTT }));
  }
  g.add(P(roundBoxGeo(3.0, 0.34, 1.5, 0.12, 2), '', { pos: [0, 0.17, 0], fin: 'soft', tt: ['#2a2a68', '#5a58a8'] }));
  inkLine(g, 0.06);
  // 바퀴(돈다): 통통한 바깥 테 두 겹 + 굵은 살 8쌍 + 금빛 축
  const wheel = G(g, 0, 3.9, 0);
  wheel.userData.dynamic = true;
  const rim = torusGeo(R, 0.13, 8, 56);
  const rimTT = ['#b8a8f0', '#ffffff'];
  wheel.add(P(rim, '', { pos: [0, 0, 0.34], fin: 'soft', tt: rimTT }));
  wheel.add(P(rim, '', { pos: [0, 0, -0.34], fin: 'soft', tt: rimTT }));
  wheel.add(P(torusGeo(R * 0.52, 0.07, 6, 36), '', { pos: [0, 0, 0.34], fin: 'soft', tt: ['#ff7aa8', '#ffc0d8'] }));
  wheel.add(P(cylGeo(0.42, 0.42, 0.95, 18), '', { rot: [Math.PI / 2, 0, 0], fin: 'soft', tt: ['#3a2a74', '#7a68c8'] }));
  wheel.add(P(cylGeo(0.26, 0.26, 1.0, 16), '#ffc444', { rot: [Math.PI / 2, 0, 0], fin: 'soft' }));
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    for (const sz of [-0.34, 0.34]) {
      wheel.add(P(cylGeo(0.05, 0.05, R, 6), '#e8e0ff', { pos: [Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5, sz], rot: [0, 0, a - Math.PI / 2], fin: 'soft' }));
    }
  }
  inkLine(wheel, 0.05);
  // 칸(인스턴스 하나, 늘 아래로 매달리게 매 프레임 자리만 옮긴다): 사탕색 둥근 곤돌라
  const cabCols = ['#ff6fa8', '#5fd0ff', '#ffd23f', '#9fe870', '#c88aff', '#ff9a5a'];
  const nc = 10;
  const cabGeo = partsGeo('ferrisCab2', [
    [cylGeo(0.03, 0.03, 0.3, 5), '#e0d8ff', { pos: [0, -0.15, 0] }],
    [roundBoxGeo(0.56, 0.48, 0.52, 0.2, 3), '#ffffff', { pos: [0, -0.5, 0], grad: [0.72, 1.12] }],
    [roundBoxGeo(0.4, 0.16, 0.54, 0.06, 2), '#fff6c8', { pos: [0, -0.46, 0] }],
    [sphereGeo(1, 12, 6), '#ffffff', { pos: [0, -0.25, 0], scale: [0.3, 0.07, 0.28] }],
  ]);
  const cabins = scatter(g, cabGeo, Array.from({ length: nc }, (_, i) => [0, 3.9, 0, 1, 0, cabCols[i % cabCols.length]]), { fin: 'soft' });
  cabins.userData.dynamic = true;
  const bulbs = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    bulbs.push([Math.cos(a) * R, Math.sin(a) * R, 0.5, ['#fff2a0', '#ff9ad0', '#9fe8ff'][i % 3]]);
  }
  const o3 = new THREE.Object3D();
  const spin = (th) => {
    for (let i = 0; i < nc; i++) {
      const a = (i / nc) * TAU + th;
      o3.position.set(Math.cos(a) * R, 3.9 + Math.sin(a) * R, 0);
      o3.updateMatrix();
      cabins.setMatrixAt(i, o3.matrix);
    }
    cabins.instanceMatrix.needsUpdate = true;
    wheel.rotation.z = th;
  };
  spin(0);
  return { g, wheel, spin, bulbs };
}

/** 탐조등 빛기둥(덧그리기, 끝으로 갈수록 옅어짐). 꼭짓점은 원점, −y 쪽으로 길이 1. */
function beamCone() {
  const tex = cachedTex('beamGrad', 4, 128, (ctx, W, Hh) => {
    const g = ctx.createLinearGradient(0, 0, 0, Hh);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.4)');
    g.addColorStop(1, 'rgba(255,255,255,0.08)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, Hh);
  }, { mip: false });
  const geo = sharedMat('city:beamGeo', () => {
    const cg = new THREE.CylinderGeometry(0.04, 1, 1, 24, 1, true);
    cg.translate(0, -0.5, 0);
    cg.userData.shared = true;
    return cg;
  });
  // 빛 색을 HDR 로 키워 빔 머리 쪽이 블룸에 걸린다
  const m = new THREE.Mesh(geo, sharedMat('city:beam', () => new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff3c8').multiplyScalar(1.6), map: tex, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })));
  m.renderOrder = 6;
  return m;
}

// 보도·찻길
function drawStreet(ctx, W, Hh, row) {
  const r = rng(13);
  const px = W / 8;
  const fill = (z0, z1, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(0, row(z0), W, row(z1) - row(z0) + 1);
  };
  // 앞 보도(넓은 판석, 판마다 밝기 조금씩) — 멀리서 가까이 갈수록 살짝 어둡게
  fill(9, -0.85, '#ecdcc2');
  const tw = px * 0.5;
  for (let z = 8.5, j = 0; z > -0.85; z -= 0.5, j++) {
    for (let x = (j % 2) * tw * 0.5 - tw; x < W; x += tw) {
      ctx.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '150,120,140'},${0.05 + r() * 0.1})`;
      ctx.fillRect(x, row(z), tw, row(z - 0.5) - row(z));
    }
  }
  ctx.strokeStyle = 'rgba(110,90,120,0.32)';
  ctx.lineWidth = 2;
  for (let z = 8.5, j = 0; z > -0.85; z -= 0.5, j++) {
    ctx.beginPath();
    ctx.moveTo(0, row(z));
    ctx.lineTo(W, row(z));
    for (let x = (j % 2) * tw * 0.5; x <= W; x += tw) {
      ctx.moveTo(x, row(z));
      ctx.lineTo(x, row(Math.max(z - 0.5, -0.85)));
    }
    ctx.stroke();
  }
  const dk = ctx.createLinearGradient(0, row(0.5), 0, row(9));
  dk.addColorStop(0, 'rgba(60,40,90,0)');
  dk.addColorStop(1, 'rgba(60,40,90,0.4)');
  ctx.fillStyle = dk;
  ctx.fillRect(0, 0, W, row(0.5));
  speckle(ctx, 0, 0, W, row(-0.85), 200, ['rgba(90,70,100,0.08)', 'rgba(255,255,255,0.25)'], r, [1.5, 3]);
  // 연석(윗면 밝게, 옆면 그늘)
  fill(-0.85, -1.02, '#f6eef0');
  fill(-1.0, -1.1, '#8a7f9a');
  const rg = ctx.createLinearGradient(0, row(-1.1), 0, row(-4.6));
  rg.addColorStop(0, '#53577a');
  rg.addColorStop(1, '#4a4e70');
  ctx.fillStyle = rg;
  ctx.fillRect(0, row(-1.1), W, row(-4.6) - row(-1.1));
  const sh = ctx.createLinearGradient(0, row(-1.1), 0, row(-1.5));
  sh.addColorStop(0, 'rgba(20,10,40,0.35)');
  sh.addColorStop(1, 'rgba(20,10,40,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, row(-1.1), W, row(-1.5) - row(-1.1));
  // 가운데 노란 겹선, 차선
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(0, row(-2.78), W, 3);
  ctx.fillRect(0, row(-2.9), W, 3);
  ctx.fillStyle = '#f4efe2';
  for (let x = 0; x < W; x += px * 2) {
    ctx.fillRect(x + px * 0.2, row(-1.95), px, 3);
    ctx.fillRect(x + px * 1.2, row(-3.75), px, 3);
  }
  // 건널목, 맨홀
  ctx.fillStyle = 'rgba(250,246,236,0.92)';
  for (let k = 0; k < 7; k++) ctx.fillRect(px * 5 + k * px * 0.32, row(-1.2), px * 0.18, row(-4.45) - row(-1.2));
  ctx.fillStyle = '#3e4262';
  ctx.beginPath();
  ctx.ellipse(px * 2.2, row(-3.2), px * 0.22, (row(-3.4) - row(-3.0)) * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.stroke();
  fill(-4.6, -4.8, '#f6eef0');
  fill(-4.8, -6.4, '#d6c8d4');
  ctx.strokeStyle = 'rgba(110,90,120,0.3)';
  for (let x = 0; x <= W; x += px * 0.5) {
    ctx.beginPath();
    ctx.moveTo(x, row(-4.8));
    ctx.lineTo(x, row(-6.4));
    ctx.stroke();
  }
}

// ───────── 무대 ─────────

/** @param {{w:number,h:number}} size */
export function buildCity({ w, h }) {
  const r = rng(41);
  const root = new THREE.Group();
  const props = G(root);
  const hw0 = halfW(w, 0);

  const street = stripGround({ key: 'city2', zNear: 9, zFar: -6.4, period: 8, draw: drawStreet });
  const ground = terrain({ H: () => 0, C: (x, y, z) => mixv(rgb('#8a7f96'), rgb('#b493a6'), smooth(-20, -120, z)), zNear: -6.2, zFar: -340, rows: 40, cols: 40 });

  const lamps = [];
  const bulbs = [];
  // 앞줄 가게
  const tints = ['#f4dccb', '#c3d0f2', '#b6a4dc', '#e9b49c', '#9aa4d8', '#f2e6c8'];
  const shopWalls = ['#f08a6a', '#8fb4e6', '#f6d27a', '#b99ae0', '#7fcf9f', '#f5a3b8'];
  const awnings = ['#e2483c', '#2fb5a6', '#4f6fc2', '#ff9a3c', '#8a6ad8'];
  const spanF = halfW(w, -7.6) + 1.5;
  let sx = -spanF;
  let si = 0;
  while (sx < spanF) {
    const sw = 1.3 + r() * 0.8;
    shop(props, sx + sw / 2, -7.4 - r() * 0.3, sw, 1 + ((r() * 3) | 0), shopWalls[si % shopWalls.length], awnings[si % awnings.length], r, lamps);
    sx += sw + 0.04;
    si++;
  }
  // 빌딩: 화면에서 지붕이 닿는 높이를 정해 두고(가운데는 낮게 = 기체 자리, 양옆은 높게) 거기서 높이를 거꾸로 구한다
  const sm = screenModel(h);
  const topAt = (x, z, yScreen) => sm.Yat(sm.frac((yScreen - 150) / 489), z);
  const sideK = (x, z) => smooth(0.35, 0.95, Math.abs(x) / halfW(w, z));
  const roofs = [];
  // 대관람차 자리(왼쪽 앞쪽 빌딩 두 줄을 비우고 화면 가장자리에 반쯤 걸치게)
  const FW = { x: -halfW(w, -16) * 0.8, z: -16 };
  const midRows = [
    { z: -12.5, n: 6, d: 1.8 },
    { z: -19, n: 7, d: 2.2 },
    { z: -28, n: 8, d: 2.6 },
    { z: -40, n: 9, d: 3 },
  ];
  midRows.forEach((row, ri) => {
    const span = halfW(w, row.z) + 2.5;
    for (let i = 0; i < row.n; i++) {
      const x = -span + ((i + 0.5 + (r() - 0.5) * 0.6) / row.n) * 2 * span;
      const z = row.z + (r() - 0.5) * 2;
      const bw = (2 * span) / row.n * (0.75 + r() * 0.3);
      if (ri < 2 && x - bw / 2 < FW.x + 3.4) continue;
      // 가운데는 낮게(기체 뒤로 하늘이 열리게), 양옆은 높게
      const yS = 432 - 150 * sideK(x, z) - ri * 6 - r() * 22;
      const hh = Math.max(2.5, topAt(x, z, yS));
      const dd = row.d + r();
      tower(props, x, z, bw, hh, dd, tints[(i * 3 + ri) % tints.length], r, { trim: ri < 3, ink: ri < 2 ? 0.06 : 0 });
      roofs.push([x, hh, z, bw, dd]);
    }
  });
  // 먼 빌딩 숲(옅은 실루엣)
  for (let i = 0; i < 30; i++) {
    const z = -60 - r() * 60;
    const span = halfW(w, z) * 1.15;
    const x = (r() * 2 - 1) * span;
    const hh = Math.max(4, topAt(x, z, 425 - 165 * sideK(x, z) - r() * 26));
    tower(props, x, z, 3 + r() * 3, hh, 3 + r() * 2, ['#c9b2d6', '#b9b0dc', '#d8b6c6'][(r() * 3) | 0], r, { colW: 0.8, floorH: 0.9, trim: false });
  }
  // 랜드마크 첨탑 빌딩(오른쪽 뒤): 층층이 좁아지는 꼭대기 + 빛나는 왕관 + 붉은 항공등
  {
    const x = halfW(w, -44) * 0.72;
    const z = -44;
    const th = topAt(x, z, 260);
    tower(props, x, z, 3.2, th, 3.2, '#c7d3f0', r);
    const tp = G(props, x, th, z, 0, 1);
    tp.add(P(roundBoxGeo(2.6, 1.2, 2.6, 0.1, 1), '', { pos: [0, 0.7, 0], fin: 'soft', tt: ['#7f86c0', '#dfe4ff'] }));
    tp.add(P(roundBoxGeo(1.8, 1.0, 1.8, 0.1, 1), '', { pos: [0, 1.75, 0], fin: 'soft', tt: ['#7f86c0', '#dfe4ff'] }));
    tp.add(P(roundBoxGeo(1.9, 0.14, 1.9, 0.05, 1), '#ffe9a8', { pos: [0, 2.3, 0], fin: 'glow', cast: false }));
    tp.add(P(coneGeo(0.9, 1.6, 4), '', { pos: [0, 3.1, 0], rot: [0, Math.PI / 4, 0], fin: 'soft', tt: ['#5a62a8', '#c0c8ff'] }));
    tp.add(P(cylGeo(0.05, 0.1, 2.4, 6), '#8890b8', { pos: [0, 4.9, 0] }));
    lamps.push([x, th + 6.1, z, '#ff4a5a', 3.5]);
  }
  // 대관람차(왼쪽)
  const fw = ferrisWheel(props, FW.x, 0, FW.z, 1.0);
  // 옥상 소품
  for (const [x, hh, z, bw] of roofs) {
    const k = r();
    if (k < 0.3 && z > -35) waterTank(props, x + (r() - 0.5) * bw * 0.4, hh + 0.18, z, 0.9);
    else if (k < 0.6) {
      props.add(P(roundBoxGeo(0.5, 0.32, 0.42, 0.05, 1), '', { pos: [x + (r() - 0.5) * bw * 0.5, hh + 0.34, z], fin: 'soft', tt: ['#8a86a8', '#e0dcf0'] }));
      props.add(P(roundBoxGeo(0.4, 0.26, 0.4, 0.05, 1), '', { pos: [x + (r() - 0.5) * bw * 0.5, hh + 0.31, z + 0.3], fin: 'soft', tt: ['#8a86a8', '#e0dcf0'] }));
    } else if (k < 0.85) {
      props.add(P(cylGeo(0.035, 0.05, 1.2, 5), '#5a5f80', { pos: [x, hh + 0.78, z] }));
      lamps.push([x, hh + 1.4, z, '#ff4a5a', 3.5]);
    }
  }
  // 광고판(옥상)
  const ad = adTexture();
  // 오른쪽 앞 빌딩 벽에 건 광고판(가운데 하늘은 기체 자리라 비워 둔다)
  const cand = roofs.filter(([x, , z, bw]) => z > -15 && x > 1.5 && x < halfW(w, z) - 0.4);
  const bb = (cand.length ? cand : roofs).reduce((a, b) => (b[0] < a[0] ? b : a));
  billboard(props, bb[0] - 0.2, Math.min(bb[1] - 2.1, 2.5), bb[2] + bb[4] / 2 + 0.14, -0.05, 1.05, ad, bulbs, false);

  // 가로수·가로등·차
  for (let x = -hw0 * 1.8; x <= hw0 * 1.8; x += 2.8) {
    streetLamp(props, x + 0.3, 0, -5.0, 1.05, { lit: true, pole: '#2b3a78' });
    lamps.push([x + 0.3, 1.88 * 1.05, -5.0, '#ffd98a']);
  }
  for (const x of [-hw0 * 1.1, hw0 * 1.05]) {
    roundTree(props, x, 0, -5.6, 0.95, r, { leaf: LEAF.city, seg: 12 });
    props.add(P(cylGeo(0.46, 0.46, 0.08, 16), '', { pos: [x, 0.04, -5.6], tt: ['#5a4a5a', '#a89aa8'] }));
  }
  car(props, -1.0, 0, -3.6, Math.PI, 1, '#ffd23f');
  car(props, hw0 + 0.2, 0, -1.9, 0, 1, '#e2483c');
  // 화분(보도 뒤쪽)
  for (const x of [-hw0 + 0.4, hw0 - 0.5]) {
    const g = G(props, x, 0, -1.55, 0, 1);
    g.add(P(cylGeo(0.22, 0.17, 0.32, 14), '', { pos: [0, 0.16, 0], fin: 'soft', tt: ['#a8402a', '#f07a46'] }));
    g.add(P(torusGeo(0.21, 0.035, 6, 16), '#f6c09a', { pos: [0, 0.32, 0], rot: [Math.PI / 2, 0, 0], fin: 'soft' }));
    bush(g, 0, 0.28, 0, 0.7, r, { flowers: 5, flowerColor: '#ff8fb0', seg: 9 });
  }
  bake(props, { zMin: -10 });
  bakeV(fw.wheel, { ao: 0 });
  root.add(street, ground);

  // 불빛(가로등·간판·안테나·광고판 전구) 한 번에 — HDR 로 키워 블룸
  const lampPts = glowPoints(lamps.map(([x, y, z, c, b]) => [x, y, z + 0.05, c, b ?? 1.2]), { size: 0.7, atten: true, opacity: 0.75 });
  root.add(lampPts);
  const bulbPts = glowPoints(bulbs, { size: 0.28, atten: true, opacity: 0.9, boost: 1.5 });
  root.add(bulbPts);
  // 관람차 전구(바퀴와 함께 돈다)
  const wheelBulbs = glowPoints(fw.bulbs, { size: 0.5, atten: true, opacity: 0.9, boost: 1.5 });
  fw.wheel.add(wheelBulbs);
  // 노을 해
  const sun = glowS('city:sun', '#ffc27a', 46, 0.75);
  sun.position.set(-26, 12, -260);
  dimWithWeather('city:sun', sun.material);
  root.add(sun);

  // 헬기 + 탐조등
  const heli = helicopter(root);
  heli.root.scale.setScalar(1.2);
  const beam = beamCone();
  root.add(beam);
  const poolGeo = sharedMat('city:poolGeo', () => {
    const cg = new THREE.CircleGeometry(1, 32);
    cg.userData.shared = true;
    return cg;
  });
  const pool = new THREE.Mesh(poolGeo, sharedMat('city:pool', () => new THREE.MeshBasicMaterial({ map: glowTexture(), color: new THREE.Color('#fff0c0').multiplyScalar(1.3), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })));
  pool.rotation.x = -Math.PI / 2;
  pool.renderOrder = 5;
  root.add(pool);
  const spot = glowS('city:spot', '#fff6d8', 1.1, 0.95, 2.4);
  root.add(spot);

  // 노을 구름(가늘고 길게)
  const cm = cloudMat('#ffd2b4', '#8a68c0', { light: [-0.8, 0.2, -0.2], mid: '#f39aa8' });
  const sky = G(root);
  const drift = cloudLayer(sky, 43, [
    { x: -26, y: 26, z: -130, w: 30, h: 6, n: 16, seg: 12, speed: 0.12, span: 80, flat: 0.15 },
    { x: 24, y: 36, z: -150, w: 34, h: 6, n: 16, seg: 12, speed: 0.1, span: 85, flat: 0.15 },
    { x: -6, y: 58, z: -180, w: 40, h: 6, n: 14, seg: 10, speed: 0.08, span: 95, flat: 0.15 },
  ], cm);

  const env = {
    sky: { top: '#33358f', mid: '#c87098', horizon: '#ffb068', sunDir: [-0.1, 0.03, -1], sunColor: '#ffb070', sunStrength: 0.8, sunSize: 0.0015 },
    fog: { color: '#f2ae94', near: 40, far: 320 },
    sun: { color: '#ffc49a', intensity: 2.2, dir: [-0.85, 0.65, 0.45] },
    hemi: { sky: '#aea4e2', ground: '#9a8078', intensity: 0.85 },
    exposure: 1.0,
    grade: { saturation: 1.12, contrast: 1.1, vignette: 0.26, bloom: 0.36 },
  };

  const src = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  return {
    group: root,
    env,
    update(t) {
      // 헬기: 화면 뒤쪽을 천천히 8자로 돈다
      const a = t * 0.22;
      const hx = Math.sin(a) * 4.2;
      const hz = -10 + Math.sin(a * 2) * 0.8;
      const hy = 4.5 + Math.sin(t * 0.9) * 0.15;
      heli.root.position.set(hx, hy, hz);
      const vx = Math.cos(a) * 4.5;
      const vz = Math.cos(a * 2) * 1.6;
      heli.root.rotation.set(0, Math.atan2(-vz, vx), -Math.cos(a) * 0.12);
      heli.rotor.rotation.y = t * 22;
      // 탐조등: 헬기 배에서 거리로, 좌우로 훑는다
      const tx = hx * 0.4 + Math.sin(t * 0.7) * 2.6;
      const tz = -3 + Math.sin(t * 0.45) * 1.2;
      src.set(hx + 0.2, hy - 0.45, hz);
      dir.set(tx - src.x, 0.02 - src.y, tz - src.z);
      const len = dir.length();
      beam.position.copy(src);
      beam.quaternion.setFromUnitVectors(up, dir.multiplyScalar(-1 / len));
      beam.scale.set(1.1, len, 1.1);
      pool.position.set(tx, 0.03, tz);
      pool.scale.set(1.5, 1.1, 1);
      spot.position.copy(src);
      // 관람차: 천천히 돌고 칸은 늘 아래로
      fw.spin(t * 0.12);
      drift(t);
    },
  };
}
