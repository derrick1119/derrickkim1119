// 조종사 "피포(Pipo)": 은하 관측대의 신입 조종사 생도. 스스로는 최고의 잠입 요원이라 믿는다.
// 큰 찹쌀떡 머리(키의 2/3), 반짝이는 왕눈이(진짜 3D 눈이라 표본과 지구인을 눈으로 따라간다),
// 이마에 밀어 올린 조종사 고글, 주황 스카프, 기분 따라 색이 바뀌는 더듬이 전구, 조종간을 꼭 쥔 작은 손.
// 숨을 땐 코·콧수염 달린 변장 안경을 쓴다.
//
// 그리는 법
//   · 모든 부품을 머리 반지름 1 단위로 만들고 통째로 r 배 한다(그래서 도형·재질을 모두 캐시로 나눠 쓴다).
//   · 눈썹·입·볼·속눈썹 테·감은 눈은 머리 앞에 붙인 얼굴 그림(기분마다 한 장, 캐시)으로 그린다.
//     눈알만 3D(흰자 + 따라 도는 눈동자 + 고정된 반짝임 두 점)라 작아도 또렷하고 눈길이 산다.
//   · 속눈썹 테는 눈알이 얼굴 껍데기를 뚫고 나오는 경계선을 계산해 그 바깥에 그린다(어긋남 없음).
// 모델 단위: r = 머리 반지름. 원점 = 목(스카프) 높이의 몸 중심. 정면은 +z.
import { THREE, mat, mesh, sphereGeo, capsuleGeo, torusGeo, cylGeo, latheGeo, addOutline, glowSprite, faceTexture } from './kit.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js';

// ───────── 색 ─────────
const SKIN = '#dc84ff'; // 브랜드 보라(#cf8cff). 하늘빛 조명에 푸르게 보이지 않게 살짝 분홍 쪽으로
const SKIN_TOP = '#b468ff'; // 정수리 쪽은 조금 진하게
const SKIN_LOW = '#f6c4ff'; // 볼·턱 쪽은 밝게(분홍 기운)
const SPOT = '#f6b4ff'; // 머리 위·관자놀이의 연분홍 점박이
const LINE = '#2b1a5e'; // 외곽선(보라 기운 남색)
const INK = '#2a1660'; // 눈썹·입·속눈썹
const SCARF = '#ff8a3c';
const STRAP = '#8a5636';
const BRASS = '#ffc444';
const LENS = '#8ff6ff';
const KNOB = '#ff4d6a';
const IRIS = ['#231a78', '#3d4fe0', '#3cc4ff', '#9ff8ff']; // 위(남보라) → 아래(청록 빛). 작게 보여도 검은 구멍이 되지 않게 밝게
const PUPIL = '#120b3a';

/** 기분별 더듬이 전구 색. */
export const BULB = {
  idle: '#5ff0ff',
  happy: '#ffd23f',
  alert: '#ff9a3c',
  shock: '#ff4d5e',
  hide: '#5b4f8f',
};

// ───────── 머리와 얼굴 배치(머리 반지름 1) ─────────
const HEAD_Y = 0.86; // 목에서 머리 중심까지
const HS = new THREE.Vector3(1.1, 0.94, 1); // 살짝 넓적한 찹쌀떡 머리
// fwd: 눈알을 표면 법선에서 정면 쪽으로 돌리는 정도(두 눈이 나란히 같은 곳을 보게)
const EYE = { lon: 0.4, lat: -0.05, rx: 0.29, ry: 0.345, rz: 0.175, depth: 0.9, fwd: 0.35 };
const IRIS_CAP = 0.93; // 눈동자 껍데기 크기(라디안). sin(0.93) ≈ 눈 반지름의 80 %
const MOUTH_LAT = -0.5;
// 머리 구와 얼굴 껍데기는 꼭짓점을 똑같이 나눠(가로 40, 세로 30칸) 정확히 겹치게 한다.
// 그래야 눈알이 머리를 뚫고 나오는 경계와 그림의 속눈썹 테가 어느 각도에서도 맞는다.
const HEAD_SEG = [40, 30];
const FACE_SEG = [16, 20]; // 얼굴 그림이 덮는 칸 수(가로, 세로). 정면 가운데에 맞춘다
const FACE_W = (FACE_SEG[0] * Math.PI * 2) / HEAD_SEG[0]; // 얼굴 그림이 덮는 범위(라디안)
const FACE_H = (FACE_SEG[1] * Math.PI) / HEAD_SEG[1];
const FS = 384; // 얼굴 그림 크기(px). 표정 8장까지 만들어지므로 메모리를 아낀다

/**
 * 기분별 표정.
 * eye: 눈 크기, squint: 눈 세로 배율, iris: 눈동자 그림('n' 보통, 's' 작게, 't' 콩알), closed: 그림으로 그린 감은 눈
 * brow: [높이, 기울기(+ = 안쪽이 올라감 = 걱정), 아치, 두께, 길이], mouth: 입 그림, blush: 볼 진하기
 */
const FACES = {
  idle: { eye: 1, squint: 1, iris: 'n', brow: [0.06, 0.12, 0.03, 0.085, 0.17], mouth: 'smile', blush: 0.85 },
  happy: { eye: 1, squint: 1, iris: 'n', closed: 'happy', brow: [0.09, -0.08, 0.045, 0.085, 0.17], mouth: 'grin', blush: 1 },
  // 기쁠 때 ^^ 사이사이 눈을 반짝 뜨고 바라본다(첫 화면에서 눈을 맞춘다)
  happyOpen: { eye: 1.05, squint: 1.02, iris: 'n', brow: [0.08, -0.08, 0.045, 0.085, 0.17], mouth: 'grin', blush: 1 },
  alert: { eye: 1.08, squint: 1.05, iris: 's', brow: [0.07, 0.45, 0.0, 0.085, 0.17], mouth: 'eek', blush: 0.55 },
  hide: { eye: 0.96, squint: 0.8, iris: 'n', brow: [0.03, -0.42, 0.0, 0.1, 0.24], mouth: 'none', blush: 0.5 },
  shock: { eye: 1.16, squint: 1.08, iris: 't', brow: [0.12, 0.2, 0.05, 0.075, 0.16], mouth: 'o', blush: 0.45 },
};

const Z = new THREE.Vector3(0, 0, 1);

/** 경도·위도 → 단위 구 방향. 경도 + = 보는 사람의 오른쪽(+x). */
function dirOf(lon, lat, out = new THREE.Vector3()) {
  return out.set(Math.sin(lon) * Math.cos(lat), Math.sin(lat), Math.cos(lon) * Math.cos(lat));
}

/** 눈 자리(머리 중심 기준 위치·방향·크기). side: −1 = 보는 사람의 왼쪽. */
function eyeFrame(side, k = 1, squint = 1) {
  const u = dirOf(side * EYE.lon, EYE.lat);
  const pos = u.clone().multiply(HS).multiplyScalar(EYE.depth);
  const n = new THREE.Vector3(pos.x / HS.x ** 2, pos.y / HS.y ** 2, pos.z / HS.z ** 2).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(Z, n.lerp(Z, EYE.fwd).normalize());
  const scale = new THREE.Vector3(EYE.rx * k, EYE.ry * k * squint, EYE.rz * k);
  return { pos, quat, scale, inv: quat.clone().invert() };
}

// ───────── 얼굴 그림 ─────────

const TX = (lon) => FS * (0.5 + lon / FACE_W);
const TY = (lat) => FS * (0.5 - lat / FACE_H);
const PXX = FS / FACE_W; // 1 라디안 = 몇 px
const PXY = FS / FACE_H;

/** 얼굴 그림 위 한 점을 중심으로, 머리 표면 길이(반지름 1 단위)로 그릴 수 있게 좌표를 맞춘다. y 는 아래가 +. */
function local(ctx, lon, lat) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(TX(lon), TY(lat));
  ctx.scale(PXX / (HS.x * Math.cos(lat)), PXY / HS.y);
}

const footCache = new Map();
/**
 * 눈알이 머리(= 얼굴 껍데기) 표면을 뚫고 나오는 경계선(오른쪽 눈, [경도, 위도, 눈 둘레 각] 목록).
 * 그 바깥으로 속눈썹 테를 칠하면(안쪽은 눈알이 덮는다) 3D 눈과 그림이 정확히 맞는다.
 */
function eyeFootprint(k, squint) {
  const key = `${k}|${squint}`;
  if (footCache.has(key)) return footCache.get(key);
  const { pos, quat, scale } = eyeFrame(1, k, squint);
  const m = new THREE.Matrix4().compose(pos, quat, scale);
  const p = new THREE.Vector3();
  const lim = 1;
  const outside = (a, psi) => {
    p.set(Math.sin(psi) * Math.cos(a), Math.sin(psi) * Math.sin(a), Math.cos(psi)).applyMatrix4(m);
    return (p.x / HS.x) ** 2 + (p.y / HS.y) ** 2 + (p.z / HS.z) ** 2 > lim;
  };
  const pts = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    let lo = 0;
    let hi = Math.PI / 2;
    for (let s = 0; s < 22; s++) {
      const mid = (lo + hi) / 2;
      if (outside(a, mid)) lo = mid;
      else hi = mid;
    }
    outside(a, lo);
    const u = new THREE.Vector3(p.x / HS.x, p.y / HS.y, p.z / HS.z).normalize();
    pts.push([Math.atan2(u.x, u.z), Math.asin(u.y), a]);
  }
  footCache.set(key, pts);
  return pts;
}

function faceArt(mood, blink) {
  const f = FACES[mood] || FACES.idle;
  const closed = f.closed || (blink ? 'blink' : null);
  return faceTexture(
    `pipo2-face:${mood}:${closed || 'open'}`,
    (ctx, s) => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const foot = eyeFootprint(f.eye, f.squint);
      let cy = 0;
      let top = -9;
      for (const [, lat] of foot) {
        cy += lat / foot.length;
        top = Math.max(top, lat);
      }
      // 볼(눈 아래 바깥쪽)
      for (const side of [-1, 1]) {
        local(ctx, side * 0.64, -0.3);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.17);
        g.addColorStop(0, `rgba(255,92,158,${0.9 * f.blush})`);
        g.addColorStop(0.6, `rgba(255,110,170,${0.55 * f.blush})`);
        g.addColorStop(1, 'rgba(255,120,175,0)');
        ctx.fillStyle = g;
        ctx.save();
        ctx.scale(1, 0.62);
        ctx.beginPath();
        ctx.arc(0, 0, 0.17, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // 눈 둘레: 뜬 눈은 속눈썹 테(위가 두툼, 바깥 끝이 살짝 삐침), 감은 눈은 선
      for (const side of [-1, 1]) {
        const cx = side * EYE.lon;
        if (!closed) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.fillStyle = INK;
          ctx.beginPath();
          foot.forEach(([lon, lat, a], i) => {
            const up = Math.sin(a); // 눈 기준 위쪽 = +1
            const out = Math.cos(a); // 바깥쪽(오른 눈 기준) = +1
            const t = 0.016 + 0.034 * Math.max(0, up) ** 1.3 + 0.012 * Math.max(0, out * up);
            const x = TX(side * lon) + side * out * t * PXX;
            const y = TY(lat) - up * t * PXY;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.closePath();
          ctx.fill();
          // 바깥 끝 속눈썹 한 가닥
          const [lon0, lat0] = foot[Math.round(48 * 0.09)];
          local(ctx, side * lon0, lat0);
          ctx.scale(side, 1);
          ctx.beginPath();
          ctx.moveTo(-0.02, -0.035);
          ctx.quadraticCurveTo(0.05, -0.03, 0.085, -0.085);
          ctx.quadraticCurveTo(0.06, -0.01, 0.0, 0.02);
          ctx.closePath();
          ctx.fill();
        } else {
          local(ctx, cx, cy);
          ctx.strokeStyle = INK;
          ctx.lineWidth = closed === 'happy' ? 0.065 : 0.05;
          ctx.beginPath();
          if (closed === 'happy') {
            // ^^ : 위로 볼록한 웃는 눈
            ctx.moveTo(-0.2, 0.06);
            ctx.quadraticCurveTo(0, -0.2, 0.2, 0.06);
          } else {
            // 깜빡: 아래로 볼록한 감은 눈 + 바깥 속눈썹
            ctx.moveTo(-0.2, -0.01);
            ctx.quadraticCurveTo(0, 0.12, 0.2, -0.01);
            ctx.moveTo(side * 0.2, -0.01);
            ctx.lineTo(side * 0.27, -0.06);
          }
          ctx.stroke();
        }
      }
      // 눈썹
      const [bh, tilt, arch, thick, len] = f.brow;
      for (const side of [-1, 1]) {
        local(ctx, side * (EYE.lon + 0.02), top + 0.07 + bh);
        ctx.rotate(side * tilt);
        // 콩 모양 눈썹: 가운데가 도톰하고 끝이 둥글게 가늘어진다
        const col = mood === 'hide' ? '#1d1830' : INK;
        ctx.strokeStyle = col;
        ctx.fillStyle = col;
        ctx.lineWidth = thick * 0.55;
        ctx.beginPath();
        ctx.moveTo(-len / 2, 0);
        ctx.quadraticCurveTo(0, -arch * 2 - thick * 0.45, len / 2, 0);
        ctx.quadraticCurveTo(0, -arch * 2 + thick * 0.45, -len / 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      // 입(얼굴 아래쪽에 작게)
      local(ctx, 0, MOUTH_LAT);
      const mouthIn = '#5a1f5e';
      const tongue = '#ff6f9a';
      ctx.strokeStyle = INK;
      if (f.mouth === 'smile' || f.mouth === 'grin') {
        const grin = f.mouth === 'grin';
        const w = grin ? 0.22 : 0.17;
        const d = grin ? 0.32 : 0.12;
        const c = grin ? -0.02 : -0.035; // 입꼬리
        ctx.beginPath();
        ctx.moveTo(-w, c);
        ctx.quadraticCurveTo(0, grin ? 0.025 : 0.02, w, c);
        ctx.bezierCurveTo(w * 0.9, d * 0.8, -w * 0.9, d * 0.8, -w, c);
        ctx.closePath();
        ctx.fillStyle = mouthIn;
        ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.fillStyle = tongue;
        ctx.beginPath();
        ctx.ellipse(0, d * 0.62, w * 0.62, d * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        if (f.mouth === 'grin') {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(-0.09, -0.035, 0.075, 0.075, 0.02);
          ctx.fill();
        }
        ctx.restore();
        ctx.lineWidth = 0.03;
        ctx.stroke();
      } else if (f.mouth === 'eek') {
        // 이를 앙다문 조마조마한 입
        ctx.beginPath();
        ctx.roundRect(-0.16, -0.06, 0.32, 0.12, 0.055);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 0.03;
        ctx.stroke();
        ctx.lineWidth = 0.016;
        ctx.beginPath();
        ctx.moveTo(-0.14, 0);
        ctx.lineTo(0.14, 0);
        for (const x of [-0.055, 0.055]) {
          ctx.moveTo(x, -0.055);
          ctx.lineTo(x, 0.055);
        }
        ctx.stroke();
      } else if (f.mouth === 'o') {
        ctx.beginPath();
        ctx.ellipse(0, 0.03, 0.085, 0.115, 0, 0, Math.PI * 2);
        ctx.fillStyle = mouthIn;
        ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.fillStyle = tongue;
        ctx.beginPath();
        ctx.ellipse(0, 0.13, 0.07, 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.lineWidth = 0.03;
        ctx.stroke();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
    FS,
  );
}

/** 머리 전체 무늬(정수리는 진하게, 아래는 밝게 + 연보라 점박이). 구의 경위도 펼침 그림. */
function headArt() {
  return faceTexture(
    'pipo2-head',
    (ctx, s) => {
      const g = ctx.createLinearGradient(0, 0, 0, s);
      g.addColorStop(0, SKIN_TOP);
      g.addColorStop(0.3, SKIN_TOP);
      g.addColorStop(0.5, SKIN);
      g.addColorStop(0.72, SKIN_LOW);
      g.addColorStop(1, SKIN_LOW);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = SPOT;
      // [경도, 위도, 크기(라디안)]
      const spots = [[0.98, 0.4, 0.15], [1.22, 0.12, 0.08], [-1.04, 0.48, 0.11], [0.78, 1.0, 0.2], [0.3, 1.32, 0.1], [-0.95, 0.95, 0.15], [-1.45, 0.4, 0.08], [2.6, 0.7, 0.18], [-2.3, 0.6, 0.13], [3.1, 0.25, 0.1]];
      for (const [lon, lat, a] of spots) {
        const x = ((Math.PI / 2 + lon) / (Math.PI * 2)) * s;
        const y = ((Math.PI / 2 - lat) / Math.PI) * s;
        const rx = (a / (Math.PI * 2)) * s / Math.cos(lat) / HS.x;
        const ry = (a / Math.PI) * s / HS.y;
        for (const dx of [-s, 0, s]) {
          ctx.beginPath();
          ctx.ellipse(x + dx, y, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    512,
  );
}

/** 흰자: 위쪽에 눈꺼풀 그늘이 살짝. */
function eyeWhiteArt() {
  return faceTexture(
    'pipo2-white',
    (ctx, s) => {
      const g = ctx.createLinearGradient(0, 0, 0, s);
      g.addColorStop(0, '#c9bdf0');
      g.addColorStop(0.14, '#d9d0f6');
      g.addColorStop(0.3, '#ffffff');
      g.addColorStop(1, '#ffffff');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    },
    64,
  );
}

/** 눈동자 그림. kind: 'n' 보통(큰 눈동자), 's' 작게(긴장), 't' 콩알(깜짝). */
function irisArt(kind) {
  return faceTexture(
    `pipo2-iris:${kind}`,
    (ctx, s) => {
      const c = s / 2;
      const R = { n: 0.5, s: 0.38, t: 0.17 }[kind] * s;
      const P = { n: 0.235, s: 0.15, t: 0.11 }[kind] * s;
      const g = ctx.createLinearGradient(0, c - R, 0, c + R);
      g.addColorStop(0, IRIS[0]);
      g.addColorStop(0.45, IRIS[1]);
      g.addColorStop(0.85, IRIS[2]);
      g.addColorStop(1, IRIS[3]);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c, c, R, 0, Math.PI * 2);
      ctx.fill();
      // 아래쪽 빛 고리
      const gl = ctx.createRadialGradient(c, c + R * 0.55, 0, c, c + R * 0.55, R * 0.6);
      gl.addColorStop(0, 'rgba(170,250,255,0.75)');
      gl.addColorStop(1, 'rgba(170,250,255,0)');
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(c, c, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PUPIL;
      ctx.beginPath();
      ctx.arc(c, c - R * 0.04, P, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#110a33';
      ctx.lineWidth = s * 0.025;
      ctx.beginPath();
      ctx.arc(c, c, R - s * 0.012, 0, Math.PI * 2);
      ctx.stroke();
    },
    128,
  );
}

/** 반짝임 두 점(큰 것 왼쪽 위, 작은 것 오른쪽 아래). 눈이 어디를 보든 제자리. */
function glintArt() {
  return faceTexture(
    'pipo2-glint',
    (ctx, s) => {
      const k = s / (2 * Math.sin(IRIS_CAP));
      const at = (x, y) => [s / 2 + x * k, s / 2 - y * k];
      ctx.fillStyle = '#ffffff';
      const [x1, y1] = at(-0.27, 0.3);
      ctx.beginPath();
      ctx.ellipse(x1, y1, 0.16 * k, 0.185 * k, -0.5, 0, Math.PI * 2);
      ctx.fill();
      const [x2, y2] = at(0.28, -0.27);
      ctx.beginPath();
      ctx.arc(x2, y2, 0.08 * k, 0, Math.PI * 2);
      ctx.fill();
    },
    128,
  );
}

// ───────── 공유 도형·재질 ─────────

/** 몸통 옆모습(반지름, 높이). 아래(발끝)에서 위(목)로. 의상도 이 윤곽에 맞춰 입힌다. */
const BODY_CURVE = new THREE.SplineCurve([[0.001, -1.0], [0.36, -0.97], [0.56, -0.84], [0.63, -0.58], [0.58, -0.3], [0.46, -0.05], [0.32, 0.12]].map(([x, y]) => new THREE.Vector2(x, y)));

let shared = null;
function sharedParts() {
  if (shared) return shared;
  // +z 를 감싸는 구 껍데기(눈동자·반짝임). 앞에서 비춘 평면 UV.
  const capGeo = (radius) => {
    const geo = new THREE.SphereGeometry(radius, 28, 10, 0, Math.PI * 2, 0, IRIS_CAP);
    geo.rotateX(Math.PI / 2);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const k = 1 / (2 * radius * Math.sin(IRIS_CAP));
    for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) * k, 0.5 + pos.getY(i) * k);
    return geo;
  };
  const decal = (map, basic) => {
    const o = { map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
    // 반짝임은 흰자(1.15)보다 밝게: 톤 매핑 뒤 흰자 위에서 회색 얼룩으로 보이지 않게
    return basic ? new THREE.MeshBasicMaterial({ ...o, color: new THREE.Color(1.22, 1.22, 1.22) }) : new THREE.MeshStandardMaterial({ ...o, roughness: 0.22, emissive: new THREE.Color('#ffffff'), emissiveMap: map, emissiveIntensity: 0.18 });
  };
  // 더듬이 줄기(머리 꼭대기 뒤에서 앞으로 휘어 오른다)
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0.34, 0.02),
    new THREE.Vector3(0.07, 0.6, 0.12),
    new THREE.Vector3(0.2, 0.76, 0.27),
  ]);
  const seg = [(Math.PI * 2) / HEAD_SEG[0], Math.PI / HEAD_SEG[1]];
  shared = {
    // 머리 구(sphereGeo(1, 40, 30))와 같은 꼭짓점 위의 얼굴 껍데기
    faceGeo: new THREE.SphereGeometry(1, FACE_SEG[0], FACE_SEG[1], (HEAD_SEG[0] / 4 - FACE_SEG[0] / 2) * seg[0], FACE_W, (HEAD_SEG[1] / 2 - FACE_SEG[1] / 2) * seg[1], FACE_H),
    irisGeo: capGeo(1.012),
    glintGeo: capGeo(1.03),
    irisMats: { n: decal(irisArt('n')), s: decal(irisArt('s')), t: decal(irisArt('t')) },
    glintMat: decal(glintArt(), true),
    faceMats: new Map(),
    curve,
    tip: curve.getPoint(1),
    stalkGeo: new THREE.TubeGeometry(curve, 16, 0.065, 8, false),
    bodyGeo: latheGeo(
      BODY_CURVE.getPoints(18).map((v) => [v.x, v.y]),
      32,
      'pipo2-body',
    ),
    armGeo: capsuleGeo(0.075, 1, 3, 8),
  };
  return shared;
}

/**
 * 흰자 재질: 빛을 받지 않는 납작한 흰색(위쪽 눈꺼풀 그늘만 그림으로). 빛을 받으면 둥근 흰자 가장자리가
 * 하늘빛 반구광에 푸르스름해져 눈이 흐려 보인다. 밝기는 기체 불빛(lit)을 따라 조금 낮추므로 피포마다 하나.
 */
function eyeWhiteMat() {
  return new THREE.MeshBasicMaterial({ color: '#ffffff', map: eyeWhiteArt() });
}

/** 표정 그림을 입힌 얼굴 재질(표정마다 하나, 캐시). */
function faceMat(mood, blink) {
  const s = sharedParts();
  const tex = faceArt(mood, blink);
  let m = s.faceMats.get(tex);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
    s.faceMats.set(tex, m);
  }
  return m;
}

// ───────── 의상(꾸미기) ─────────
// 능력치 없는 옷차림. 본모습(none)은 그대로 두고, 부품을 덧붙이거나(모자·망토·넥타이) 본래 부품 몇 가지를
// 감추거나 옮긴다(고글·스카프·더듬이 높이). 부품은 모두 머리 반지름 1 단위로 만들고 도형·재질·그림을 캐시해
// 피포 여럿(게임 기체·아이콘 촬영)이 나눠 쓴다. 그래서 의상을 바꿔도 아무것도 지우지 않는다.
// 붙이는 곳: 머리 → squash(머리와 함께 말랑하게 찌그러지고 기운다), 몸 → rig(통통 뛰는 몸), 손에 든 것 → u.
// 얼굴을 가리지 않게 모자의 앞 가장자리는 위도 0.6 위에서 멈추고(눈썹이 0.55 까지 올라간다), 더듬이는 모자를 뚫고 나온다.

/** 고를 수 있는 피포 의상(catalog.js 의 outfit 과 같은 id). */
export const PIPO_OUTFITS = ['none', 'cadet', 'agent', 'star', 'bunny', 'raincoat', 'chef', 'astro'];

const OGEO = new Map();
/** 의상 도형 캐시(한 번 만들면 계속 쓴다). */
function og(key, make) {
  let g = OGEO.get(key);
  if (!g) OGEO.set(key, (g = make()));
  return g;
}
const YV = new THREE.Vector3(0, 1, 0);
const HSM = new THREE.Matrix4().makeScale(HS.x, HS.y, HS.z);
const rotTo = (from, to) => new THREE.Quaternion().setFromUnitVectors(from, to.clone().normalize());
const compose = (pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) =>
  new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale));
/** 위치·방향을 구워 넣은 도형 복사본. */
const baked = (geo, m) => geo.clone().applyMatrix4(m);
const sphere = (w = 20, h = 14) => new THREE.SphereGeometry(1, w, h);

/** 머리 표면(경도·위도, lift = 표면에서 띄우는 배율) 위의 점과 그 자리의 바깥 법선. 머리 중심 기준. */
function headAt(lon, lat, lift = 1) {
  const p = dirOf(lon, lat).multiply(HS).multiplyScalar(lift);
  const n = new THREE.Vector3(p.x / HS.x ** 2, p.y / HS.y ** 2, p.z / HS.z ** 2).normalize();
  return { p, n };
}

/** 표면에 붙이는 자리: z = 바깥(법선 n), y = 표면을 따라 위, x = 오른쪽. local = 그 안에서 더 옮길 행렬. */
function surfaceMatrix(p, n, local = null) {
  const z = n.clone().normalize();
  const y = YV.clone().addScaledVector(z, -z.dot(YV));
  if (y.lengthSq() < 1e-6) y.set(0, 0, -1);
  y.normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  const m = new THREE.Matrix4().makeBasis(x, y, z).setPosition(p);
  return local ? m.multiply(local) : m;
}

/** a → b 를 잇는 캡슐(반지름 rad). */
function segGeo(a, b, rad) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const g = new THREE.CapsuleGeometry(rad, Math.max(0.001, len), 4, 8);
  g.applyQuaternion(rotTo(YV, d));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

/** 매끈한 그늘: 같은 자리 꼭짓점을 합치고 법선을 다시 구한다(uv 는 0. 무늬 없는 부품용, 새로 만든 도형만). */
function smoothed(geo) {
  geo.deleteAttribute('normal');
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
  const g = mergeVertices(geo);
  g.computeVertexNormals();
  return g;
}

/**
 * 머리를 덮는 두툼한 껍데기(모자·두건·헬멧). axis = 꼭대기 방향(단위 구 기준), alpha = 꼭대기에서 가장자리까지의 각.
 * alpha 를 함수(φ → 각)로 주면 둘레를 따라 가장자리가 오르내린다(귀덮개 등). φ = 0 은 axis 를 위로 세웠을 때의 정면(+z).
 * 가장자리는 둥글게 말려 외곽선이 깔끔하다. 머리 모양(HS)대로 늘린다. uv = (둘레, 안쪽 꼭대기 → 가장자리 → 바깥 꼭대기).
 */
function shellGeo(axis, alpha, ro = 1.07, ri = 0.96, seg = 56) {
  const aOf = typeof alpha === 'function' ? alpha : () => alpha;
  const n = 18; // 바깥 면 칸 수(안쪽 면은 머리에 가려 보이지 않으므로 성글게)
  const nIn = 6;
  const pos = [];
  const uvs = [];
  let P = 0;
  for (let j = 0; j <= seg; j++) {
    const phi = (j / seg) * Math.PI * 2 - Math.PI;
    const al = aOf(phi);
    const prof = [];
    for (let i = 0; i <= nIn; i++) prof.push([ri, (i / nIn) * al]); // 안쪽 면(머리 쪽을 본다)
    const c = (ro + ri) / 2;
    const rho = (ro - ri) / 2;
    for (let k = 1; k < 8; k++) {
      // 말린 가장자리: 안 → 바깥, 가장자리 바깥으로 둥글게
      const ph = Math.PI * (1 - k / 8);
      const rr = c + rho * Math.cos(ph);
      prof.push([Math.hypot(rr, rho * Math.sin(ph)), al + Math.atan2(rho * Math.sin(ph), rr)]);
    }
    for (let i = n; i >= 0; i--) prof.push([ro, (i / n) * al]); // 바깥 면
    P = prof.length;
    prof.forEach(([r, th], i) => {
      const x = Math.max(1e-5, r * Math.sin(th));
      pos.push(x * Math.sin(phi), r * Math.cos(th), x * Math.cos(phi));
      uvs.push(j / seg, i / (P - 1));
    });
  }
  const idx = [];
  for (let j = 0; j < seg; j++) {
    for (let i = 0; i < P - 1; i++) {
      const a = j * P + i;
      const b = a + P;
      idx.push(a, b, a + 1, b + 1, a + 1, b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.applyQuaternion(rotTo(YV, axis));
  geo.applyMatrix4(HSM);
  geo.computeVertexNormals();
  // 이음매(φ = ±π) 법선을 맞춘다
  const nr = geo.attributes.normal;
  const v = new THREE.Vector3();
  for (let i = 0; i < P; i++) {
    const e = seg * P + i;
    v.set(nr.getX(i) + nr.getX(e), nr.getY(i) + nr.getY(e), nr.getZ(i) + nr.getZ(e)).normalize();
    nr.setXYZ(i, v.x, v.y, v.z);
    nr.setXYZ(e, v.x, v.y, v.z);
  }
  return geo;
}

/** 껍데기 가장자리를 따라 두르는 관(털 테·고리). alpha 는 shellGeo 와 같다. bumps = 몽글몽글한 털 결 수. */
function edgeGeo(axis, alpha, rm, tube, bumps = 0, amp = 0.3, segs = Math.max(120, bumps * 6)) {
  const aOf = typeof alpha === 'function' ? alpha : () => alpha;
  const pts = [];
  for (let k = 0; k < segs; k++) {
    const phi = (k / segs) * Math.PI * 2 - Math.PI;
    const al = aOf(phi);
    pts.push(new THREE.Vector3(rm * Math.sin(al) * Math.sin(phi), rm * Math.cos(al), rm * Math.sin(al) * Math.cos(phi)));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true);
  const geo = new THREE.TubeGeometry(curve, segs, tube, 8, true);
  if (bumps) {
    const p = geo.attributes.position;
    const c = new THREE.Vector3();
    for (let i = 0; i <= segs; i++) {
      curve.getPointAt((i % segs) / segs, c);
      const k = 1 + amp * (Math.cos((Math.PI * 2 * bumps * i) / segs) - 0.4);
      for (let j = 0; j <= 8; j++) {
        const q = i * 9 + j;
        p.setXYZ(q, c.x + (p.getX(q) - c.x) * k, c.y + (p.getY(q) - c.y) * k, c.z + (p.getZ(q) - c.z) * k);
      }
    }
  }
  geo.applyQuaternion(rotTo(YV, axis));
  geo.applyMatrix4(HSM);
  return smoothed(geo);
}

/** 둘레 φ 에서 가운데 c 둘레로 솟는 고원 모양(0..1). 귀덮개·늘어진 자락 등. */
const plateau = (phi, c, flat, fall) => 1 - smooth01(flat, flat + fall, Math.abs(Math.abs(phi) - c));
function smooth01(a, b, x) {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
}

/** 몸통 반지름(높이 y 에서). */
const BODY_SAMPLES = BODY_CURVE.getPoints(80);
function bodyR(y) {
  const s = BODY_SAMPLES;
  if (y >= s[s.length - 1].y) return s[s.length - 1].x;
  for (let i = 1; i < s.length; i++) {
    if (s[i].y >= y) {
      const a = s[i - 1];
      const b = s[i];
      return a.x + ((y - a.y) / Math.max(1e-6, b.y - a.y)) * (b.x - a.x);
    }
  }
  return 0;
}

/**
 * 납작한 판: 2D 모양을 두께 depth 로 뽑고 모서리를 둥글린다. 뒷면이 z = 0.
 * uv = 판 위의 자리 × uvScale(무늬를 그대로 입힐 수 있게). 재질 묶음: 0 = 앞뒤 면, 1 = 둥근 테두리.
 * tess = 몸에 감을 판이면 그 간격으로 잘게 나눈다(앞뒤 면이 테두리 점끼리 잇는 큰 삼각형이면 감았을 때 몸속으로 파고든다).
 */
function slabGeo(shape, { depth = 0.03, bevel = 0.02, seg = 3, curve = 12, uvScale = 1, tess = 0 } = {}) {
  if (tess) {
    // 테두리를 고른 간격으로 촘촘히(면을 나눌 때 테두리 쪽이 갈라져 틈이 생기지 않게 미리 짧게)
    const pts = shape.getSpacedPoints(Math.ceil(shape.getLength() / (tess * 0.7)));
    if (pts.length > 1 && pts[0].distanceTo(pts[pts.length - 1]) < 1e-6) pts.pop();
    shape = new THREE.Shape(pts);
  }
  let g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: seg, curveSegments: curve });
  g.translate(0, 0, bevel);
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * uvScale + 0.5, p.getY(i) * uvScale + 0.5);
  if (tess) {
    const slice = ({ start, count }) => {
      const out = new THREE.BufferGeometry();
      for (const name of ['position', 'normal', 'uv']) {
        const a = g.attributes[name];
        out.setAttribute(name, new THREE.Float32BufferAttribute(a.array.slice(start * a.itemSize, (start + count) * a.itemSize), a.itemSize));
      }
      return out;
    };
    const lids = new TessellateModifier(tess, 8).modify(slice(g.groups[0]));
    g = mergeGeometries([lids, slice(g.groups[1])], true);
  }
  return g;
}

/** 판을 몸통 둘레에 감는다. x = 둘레 길이(ref 반지름 기준 각, a0 = 가운데 각. 0 = 정면), y = 높이, z = 겉으로. */
function wrapBody(g, { a0 = 0, ref = 0.5, lift = 0.02, radius = bodyR } = {}) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const a = a0 + p.getX(i) / ref;
    const y = p.getY(i);
    const R = radius(y) + lift + p.getZ(i);
    p.setXYZ(i, Math.sin(a) * R, y, Math.cos(a) * R);
  }
  return g;
}

/** 판 마무리: 같은 자리 꼭짓점을 합쳐 매끈하게(같은 자리면 uv 도 같다). */
function finishSlab(g) {
  g.deleteAttribute('normal');
  const m = mergeVertices(g);
  m.computeVertexNormals();
  return m;
}

/** 몸 앞에 붙이는 작은 판(배지·패치)의 자리: 몸통 각 a, 높이 y. 살짝 위(화면 쪽)를 보게. */
function chestMatrix(a, y, lift = 0.03, local = null) {
  const R = bodyR(y) + lift;
  const p = new THREE.Vector3(Math.sin(a) * R, y, Math.cos(a) * R);
  const slope = (bodyR(y + 0.02) - bodyR(y - 0.02)) / 0.04;
  const n = new THREE.Vector3(Math.sin(a), -slope, Math.cos(a)).normalize().lerp(new THREE.Vector3(0, 0.3, 1).normalize(), 0.25);
  return surfaceMatrix(p, n, local);
}

function starShape(R, r, n = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i < n * 2; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / n;
    const rr = i % 2 ? r : R;
    if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  s.closePath();
  return s;
}

/** 앞면을 바로 본 평면 uv 를 가진 납작한 구(패치·렌즈). */
function discGeo() {
  const g = sphere(28, 14);
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) * 0.5, 0.5 + p.getY(i) * 0.5);
  return g;
}

/** 의상 부품 메시(그림자 없음) + 외곽선(line = 굵기, 0 이면 없음). */
function part(geo, material, line = 0) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = false;
  m.receiveShadow = false;
  m.raycast = () => {};
  if (line) addOutline(m, line, LINE);
  return m;
}

// ── 의상 그림(캐시) ──

/** 별빛 망토: 밤하늘 남색 위에 금빛·흰 별과 작은 점. 이어 붙여도 이음매가 없다. */
function capeArt() {
  const tex = faceTexture(
    'pipo-out-cape',
    (ctx, s) => {
      const g = ctx.createLinearGradient(0, 0, 0, s);
      g.addColorStop(0, '#2a2f8f');
      g.addColorStop(1, '#1c1f6a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      const star = (x, y, R, col) => {
        ctx.fillStyle = col;
        for (const dx of [-s, 0, s]) {
          for (const dy of [-s, 0, s]) {
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
              const a = -Math.PI / 2 + (i * Math.PI) / 5;
              const rr = i % 2 ? R * 0.45 : R;
              ctx.lineTo(x + dx + Math.cos(a) * rr, y + dy + Math.sin(a) * rr);
            }
            ctx.closePath();
            ctx.fill();
          }
        }
      };
      const pts = [[0.12, 0.18, 0.075, '#ffd75a'], [0.62, 0.1, 0.05, '#ffffff'], [0.4, 0.45, 0.09, '#ffd75a'], [0.85, 0.5, 0.06, '#ffe9a6'], [0.15, 0.72, 0.055, '#ffffff'], [0.66, 0.82, 0.08, '#ffd75a'], [0.9, 0.95, 0.04, '#ffffff']];
      for (const [x, y, R, col] of pts) star(x * s, y * s, R * s, col);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (const [x, y] of [[0.3, 0.06], [0.8, 0.3], [0.05, 0.45], [0.55, 0.62], [0.3, 0.9], [0.97, 0.72], [0.48, 0.25]]) {
        ctx.beginPath();
        ctx.arc(x * s, y * s, s * 0.012, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    256,
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** 토끼 털모자의 보송한 결(흰 바탕에 아주 옅은 분홍·라벤더 털 무늬). */
function furArt() {
  const tex = faceTexture(
    'pipo-out-fur',
    (ctx, s) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, s, s);
      let a = 7;
      const rnd = () => ((a = (a * 16807) % 2147483647) / 2147483647);
      ctx.lineCap = 'round';
      for (let i = 0; i < 260; i++) {
        const x = rnd() * s;
        const y = rnd() * s;
        const l = s * (0.02 + rnd() * 0.03);
        const ang = Math.PI / 2 + (rnd() - 0.5) * 0.9;
        ctx.strokeStyle = rnd() < 0.5 ? 'rgba(236,214,246,0.9)' : 'rgba(255,226,240,0.9)';
        ctx.lineWidth = s * 0.012;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(ang) * l, y + Math.sin(ang) * l);
        ctx.stroke();
      }
    },
    128,
  );
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 3);
  return tex;
}

/** 꼬마 우주복의 임무 패치: 주황 테두리 안 밤하늘에 고리 행성과 별. */
function patchArt() {
  return faceTexture(
    'pipo-out-patch',
    (ctx, s) => {
      const c = s / 2;
      ctx.fillStyle = '#ff8a3c';
      ctx.beginPath();
      ctx.arc(c, c, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createLinearGradient(0, 0, 0, s);
      g.addColorStop(0, '#2c3aa8');
      g.addColorStop(1, '#4b6ff0');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c, c, s * 0.4, 0, Math.PI * 2);
      ctx.fill();
      // 고리 행성
      ctx.save();
      ctx.translate(c - s * 0.05, c + s * 0.06);
      ctx.fillStyle = '#d58cff';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = s * 0.045;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.28, s * 0.08, -0.35, 0.15, Math.PI - 0.15, true);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = (i % 2 ? 0.035 : 0.08) * s;
        ctx.lineTo(c + s * 0.2 + Math.cos(a) * rr, c - s * 0.18 + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
    },
    128,
  );
}

/** 비행모 가죽: 흰 바탕(재질 색이 곱해진다)에 꼭대기에서 내려오는 박음질 솔기 네 줄과 아주 옅은 결. */
function leatherArt() {
  return faceTexture(
    'pipo-out-leather',
    (ctx, s) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, s, s);
      // 세로(v) = 안쪽 꼭대기(0) → 가장자리(0.5) → 바깥 꼭대기(1). 바깥 면 위쪽에 솔기
      for (let k = 0; k <= 4; k++) {
        const x = (k / 4) * s;
        ctx.fillStyle = 'rgba(70,30,10,0.45)';
        ctx.fillRect(x - s * 0.006, s * 0.55, s * 0.012, s * 0.45);
        ctx.fillStyle = 'rgba(255,230,200,0.8)';
        for (let y = s * 0.58; y < s; y += s * 0.035) ctx.fillRect(x + s * 0.012, y, s * 0.006, s * 0.018);
      }
    },
    256,
  );
}

const OUT_MATS = {};

/** 작은 금관: 두툼한 띠 위로 뾰족한 봉우리 다섯 개, 봉우리 끝마다 동그란 구슬. 밑동이 원점. */
function crownGeo() {
  const ri = 0.27;
  const ro = 0.32;
  const h = 0.15;
  const peak = 0.15;
  const e = 0.02;
  const pts = [[ri + e, h], [ri, h - e], [ri, e], [ri + e, 0], [ro - e, 0], [ro, e], [ro, h - e], [ro - e, h], [ri + e, h]].map(([x, y]) => new THREE.Vector2(x, y - 0.04));
  const band = new THREE.LatheGeometry(pts, 80);
  const p = band.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + 0.04;
    const f = Math.atan2(p.getX(i), p.getZ(i)) / (Math.PI * 2) * 5;
    const tri = 1 - Math.abs((((f % 1) + 1.5) % 1) * 2 - 1);
    p.setY(i, p.getY(i) + peak * tri * smooth01(h * 0.4, h, y));
  }
  const balls = [];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    balls.push(baked(sphere(10, 8), compose([Math.sin(a) * (ri + ro) * 0.5, h + peak - 0.01, Math.cos(a) * (ri + ro) * 0.5], [0, 0, 0], [0.042, 0.042, 0.042])));
  }
  return mergeGeometries([smoothed(band), ...balls.map((g) => smoothed(g))]);
}

/** 요리사 모자: 머리에 얹는 띠 + 주름 잡힌 몽실한 윗부분. 밑동이 원점, 머리 모양대로 가로로 조금 넓다. */
function toqueGeo() {
  const prof = new THREE.SplineCurve(
    [[0.78, 0.0], [0.8, 0.2], [0.79, 0.36], [0.85, 0.43], [0.93, 0.52], [0.96, 0.64], [0.91, 0.76], [0.73, 0.84], [0.37, 0.88], [0.0, 0.89]].map(([x, y]) => new THREE.Vector2(x, y)),
  ).getPoints(26);
  prof.unshift(new THREE.Vector2(0.0, 0.0));
  const g = new THREE.LatheGeometry(prof.map((v) => new THREE.Vector2(Math.max(1e-5, v.x), v.y)), 54);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const a = Math.atan2(x, z);
    const k = 1 + 0.075 * Math.cos(a * 9) * smooth01(0.4, 0.54, y) * (1 - smooth01(0.76, 0.88, y));
    p.setXYZ(i, x * k * 1.08, y, z * k);
  }
  return smoothed(g);
}

/** 의상의 금붙이: 고글 놋쇠와 같은 색이지만 하늘빛 반사에 푸르게 뜨지 않게 따뜻한 빛을 조금 낸다. */
const GOLD_MAT = () => mat(BRASS, { metal: 0.5, rough: 0.28, envIntensity: 1.1, emissive: '#8a5200', emissiveIntensity: 0.35 });
let whiteBasic = null;
const glintBasic = () => (whiteBasic ??= new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 1.15, 1.15) }));

/**
 * 의상 설계도. 돌려주는 값: { head, body, root: 붙일 부품들, hide: 감출 본래 부품('goggles'|'scarf'),
 *   goggles: 고글 배율(모자 위로 옮길 때), antenna: 더듬이를 올리는 높이, update(s): 매 프레임 움직임 }
 */
const OUTFIT_BUILD = {
  // 견습 비행사: 양털 테를 두른 가죽 비행모 + 귀덮개, 고글은 모자 위로, 이마 위엔 날개 배지
  cadet() {
    const axis = new THREE.Vector3(0, Math.cos(0.42), -Math.sin(0.42));
    // 가장자리: 앞은 이마 위(위도 0.75), 옆으로 내려와 귀덮개가 되어 볼 옆까지 늘어진다
    const A = (phi) => 1.22 + 0.86 * plateau(phi, 1.6, 0.1, 0.36);
    const leather = mat('#c27a45', { rough: 0.42, map: leatherArt(), emissive: '#6a3014', emissiveIntensity: 0.25 });
    const wool = mat('#fff1d8', { rough: 0.85, emissive: '#a07850', emissiveIntensity: 0.3 });
    const cap = part(og('cadet-cap', () => shellGeo(axis, A, 1.075, 0.96, 72)), leather, 0.035);
    const rim = part(og('cadet-rim', () => edgeGeo(axis, A, 1.05, 0.072, 34, 0.26)), wool, 0.022);
    const at = headAt(-0.98, 0.98, 1.08);
    const badge = part(
      og('cadet-badge', () => {
        const M = surfaceMatrix(at.p, at.n);
        const parts = [baked(sphere(16, 10), M.clone().multiply(compose([0, 0, 0], [0, 0, 0], [0.1, 0.1, 0.05])))];
        for (const s of [-1, 1]) parts.push(baked(sphere(14, 8), M.clone().multiply(compose([s * 0.17, 0.03, -0.01], [0, 0, s * 0.35], [0.15, 0.06, 0.035]))));
        return mergeGeometries(parts);
      }),
      GOLD_MAT(),
      0.022,
    );
    const gem = part(og('cadet-gem', () => baked(sphere(12, 8), surfaceMatrix(at.p, at.n, compose([0, 0, 0.04], [0, 0, 0], [0.055, 0.055, 0.035])))), mat(KNOB, { rough: 0.2 }));
    return { head: [cap, rim, badge, gem], goggles: 1.075, gogglesTilt: -0.16 };
  },

  // 본부 우수 요원: 이마 위로 올려 쓴 까만 선글라스, 흰 셔츠 깃 + 작은 넥타이, 가슴의 금별 배지
  agent() {
    const shadeMat = mat('#1b1733', { rough: 0.12, metal: 0.35, envIntensity: 1.9 });
    const lens = [-1, 1].map((side) => headAt(side * 0.4, 0.85, 1.07));
    const shades = part(
      og('agent-shades', () => {
        const parts = [];
        for (const [i, side] of [-1, 1].entries()) {
          const { p, n } = lens[i];
          parts.push(baked(sphere(24, 14), surfaceMatrix(p, n, compose([0, 0, 0.02], [0, 0, side * -0.14], [0.29, 0.2, 0.075]))));
          // 다리: 렌즈 바깥에서 관자놀이를 따라 뒤로
          parts.push(segGeo(headAt(side * 0.7, 0.86, 1.05).p, headAt(side * 1.3, 0.62, 1.03).p, 0.034));
        }
        parts.push(segGeo(headAt(-0.15, 0.9, 1.1).p, headAt(0.15, 0.9, 1.1).p, 0.045));
        return mergeGeometries(parts.map((g) => (g.index ? g : mergeVertices(g))));
      }),
      shadeMat,
      0.028,
    );
    const glints = part(
      og('agent-glints', () =>
        mergeGeometries(
          lens.flatMap(({ p, n }) => [
            baked(sphere(10, 6), surfaceMatrix(p, n, compose([-0.1, 0.06, 0.09], [0, 0, 0.55], [0.11, 0.04, 0.01]))),
            baked(sphere(8, 6), surfaceMatrix(p, n, compose([0.12, -0.08, 0.085], [0, 0, 0], [0.035, 0.035, 0.01]))),
          ]),
        ),
      ),
      glintBasic(),
    );
    const white = mat('#ffffff', { rough: 0.5, emissive: '#fff4ec', emissiveIntensity: 0.22 });
    const collar = part(
      og('agent-collar', () => {
        const band = new THREE.TorusGeometry(0.47, 0.1, 10, 36).rotateX(Math.PI / 2).translate(0, 0.03, 0);
        const flapShape = new THREE.Shape();
        flapShape.moveTo(-0.11, 0.06);
        flapShape.lineTo(0.12, 0.06);
        flapShape.lineTo(0.0, -0.2);
        flapShape.closePath();
        const flaps = [-1, 1].map((side) => {
          const g = slabGeo(flapShape, { depth: 0.02, bevel: 0.02, tess: 0.04 });
          g.applyMatrix4(compose([side * 0.12, -0.02, 0], [0, 0, side * 0.45], [1, 1, 1]));
          return finishSlab(wrapBody(g, { ref: 0.5, lift: 0.07 }));
        });
        return mergeGeometries([smoothed(band), ...flaps.map((g) => smoothed(g))]);
      }),
      white,
      0.025,
    );
    const tie = part(
      og('agent-tie', () => {
        const s = new THREE.Shape();
        s.moveTo(-0.055, 0.0);
        s.lineTo(0.055, 0.0);
        s.lineTo(0.035, -0.07);
        s.lineTo(0.085, -0.36);
        s.lineTo(0.0, -0.45);
        s.lineTo(-0.085, -0.36);
        s.lineTo(-0.035, -0.07);
        s.closePath();
        const g = slabGeo(s, { depth: 0.02, bevel: 0.022, tess: 0.04 });
        g.translate(0, -0.03, 0);
        return finishSlab(wrapBody(g, { ref: 0.5, lift: 0.045 }));
      }),
      mat('#262451', { rough: 0.35, emissive: '#1a1440', emissiveIntensity: 0.3 }),
      0.02,
    );
    const star = part(
      og('agent-star', () => {
        const g = slabGeo(starShape(0.13, 0.058), { depth: 0.025, bevel: 0.022, seg: 3 });
        g.applyMatrix4(chestMatrix(-0.62, -0.36, 0.02));
        return finishSlab(g);
      }),
      GOLD_MAT(),
      0.02,
    );
    return { head: [shades, glints], body: [collar, tie, star], hide: ['goggles', 'scarf'] };
  },

  // 별빛 망토(시즌): 별 무늬 밤하늘 망토(금빛 테) + 별 단추 + 비스듬히 얹은 작은 금관
  star() {
    const gold = GOLD_MAT();
    const at = headAt(-0.4, 1.06, 0.96);
    const crownM = new THREE.Matrix4().compose(at.p, rotTo(YV, at.n.clone().lerp(YV, 0.25)), new THREE.Vector3(1.32, 1.32, 1.32));
    const crown = part(og('star-crown', () => crownGeo().applyMatrix4(crownM)), gold, 0.022);
    const gem = part(og('star-gem', () => baked(sphere(14, 10), crownM.clone().multiply(compose([0, 0.085, 0.335], [0, 0, 0], [0.06, 0.06, 0.035])))), mat('#ff4d8a', { rough: 0.15, emissive: '#b0104a', emissiveIntensity: 0.3, envIntensity: 1.5 }));
    const capeR = (y) => (y > -0.5 ? bodyR(y) : bodyR(-0.5) + (-0.5 - y) * 0.42);
    const cape = new THREE.Group();
    cape.position.y = 0.08;
    const capeMesh = part(
      og('star-cape', () => {
        const W = 1.08;
        const s = new THREE.Shape();
        s.moveTo(-W, 0.06);
        s.quadraticCurveTo(0, 0.12, W, 0.06);
        s.lineTo(W + 0.04, -0.85);
        // 물결 끝단
        const n = 5;
        for (let i = 0; i < n; i++) {
          const x0 = W + 0.04 - ((i + 0.5) / n) * 2 * (W + 0.04);
          const x1 = W + 0.04 - ((i + 1) / n) * 2 * (W + 0.04);
          s.quadraticCurveTo(x0, -1.0, x1, -0.85);
        }
        s.closePath();
        const g = slabGeo(s, { depth: 0.015, bevel: 0.03, seg: 3, uvScale: 1.1, tess: 0.12 });
        g.translate(0, -0.08, 0);
        return finishSlab(wrapBody(g, { a0: Math.PI, ref: 0.5, lift: 0.055, radius: capeR }));
      }),
      [(OUT_MATS.cape ??= new THREE.MeshStandardMaterial({ map: capeArt(), roughness: 0.55, emissive: new THREE.Color('#1c1f6a'), emissiveIntensity: 0.35 })), gold],
      0.025,
    );
    capeMesh.position.y = -0.08;
    cape.add(capeMesh);
    const navy = mat('#2a2f8f', { rough: 0.5, emissive: '#1c1f6a', emissiveIntensity: 0.35 });
    const collar = part(og('star-collar', () => smoothed(new THREE.TorusGeometry(0.47, 0.12, 10, 36).rotateX(Math.PI / 2).translate(0, 0.04, 0))), navy, 0.03);
    const clasp = part(
      og('star-clasp', () => {
        const g = slabGeo(starShape(0.17, 0.08), { depth: 0.03, bevel: 0.025 });
        g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(0, -0.02, 0.6), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.35, 0, 0)), new THREE.Vector3(1, 1, 1)));
        return finishSlab(g);
      }),
      gold,
      0.022,
    );
    return {
      head: [crown, gem],
      body: [cape, collar, clasp],
      hide: ['scarf', 'goggles'],
      update({ t, mood }) {
        const k = mood === 'happy' ? 2.2 : mood === 'shock' ? 3 : 1;
        // 양(+)으로 기울면 망토 자락이 등 뒤로 날린다(음이면 몸을 파고든다)
        cape.rotation.set(0.03 + Math.abs(Math.sin(t * 2.1)) * 0.035 * k, Math.sin(t * 1.3) * 0.05 * k, 0);
      },
    };
  },

  // 토끼 털모자: 보송한 흰 털모자 + 몽글몽글한 털 테 + 분홍 속귀가 달린 긴 귀(기분 따라 쫑긋·축)
  bunny() {
    const axis = new THREE.Vector3(0, Math.cos(0.34), -Math.sin(0.34));
    const A = 1.22;
    const fur = mat('#fffafc', { rough: 0.85, map: furArt(), emissive: '#ffc8e4', emissiveIntensity: 0.2 });
    const hat = part(og('bunny-hat', () => shellGeo(axis, A, 1.085, 0.96)), fur, 0.035);
    const rim = part(og('bunny-rim', () => edgeGeo(axis, A, 1.07, 0.125, 15, 0.16)), fur, 0.028);
    const pink = mat('#ff9cc8', { rough: 0.6, emissive: '#c0306a', emissiveIntensity: 0.15 });
    const ears = [-1, 1].map((side) => {
      const { p, n } = headAt(side * 0.5, 1.05, 1.02);
      const ear = new THREE.Group();
      ear.position.copy(p);
      ear.userData.base = rotTo(YV, n.clone().lerp(YV, 0.55).add(new THREE.Vector3(side * 0.12, 0, 0)));
      ear.quaternion.copy(ear.userData.base);
      const outer = part(og('bunny-ear', () => baked(sphere(20, 16), compose([0, 0.46, 0], [0, 0, 0], [0.18, 0.5, 0.1]))), fur, 0.03);
      const inner = part(og('bunny-ear-in', () => baked(sphere(16, 12), compose([0, 0.44, 0.07], [0, 0, 0], [0.1, 0.36, 0.045]))), pink);
      ear.add(outer, inner);
      ear.userData.side = side;
      return ear;
    });
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    return {
      head: [hat, rim, ...ears],
      hide: ['goggles'],
      update({ t, mood }) {
        for (const ear of ears) {
          const side = ear.userData.side;
          let flop = Math.sin(t * 2.6 + side) * 0.06; // 옆으로 살랑
          let back = 0;
          if (mood === 'happy') flop = Math.sin(t * 14 + side * 0.8) * 0.16;
          else if (mood === 'shock') flop = Math.sin(t * 40) * 0.03 - side * 0.08;
          else if (mood === 'alert') flop = side * -0.06 + Math.sin(t * 9) * 0.03;
          else if (mood === 'hide') {
            flop = side * 0.35;
            back = -0.55;
          }
          // 왼쪽 귀는 끝이 늘 조금 더 꺾여 있다(짝짝이가 귀엽다)
          ear.quaternion.copy(ear.userData.base).multiply(q.setFromEuler(e.set(back, 0, side * flop + (side < 0 ? 0.22 : 0))));
        }
      },
    };
  },

  // 노란 우비: 얼굴을 동그랗게 감싸는 두건(통통한 테 + 앞 챙) + 우비 깃과 단추
  raincoat() {
    const axis = new THREE.Vector3(0, Math.sin(0.14), -Math.cos(0.14));
    const A = Math.PI - 1.08;
    const yellow = mat('#ffd13a', { rough: 0.32, emissive: '#c07000', emissiveIntensity: 0.22, envIntensity: 1.1 });
    const deep = mat('#ffbe1f', { rough: 0.32, emissive: '#b05a00', emissiveIntensity: 0.22, envIntensity: 1.1 });
    const hood = part(og('rain-hood', () => shellGeo(axis, A, 1.09, 0.96)), yellow, 0.035);
    const rim = part(og('rain-rim', () => edgeGeo(axis, A, 1.07, 0.085)), deep, 0.03);
    const coat = part(
      og('rain-coat', () => {
        const body = latheGeo(BODY_CURVE.getPoints(24).map((v) => [v.x * 1.07 + 0.03, v.y]), 40);
        const col = new THREE.TorusGeometry(0.47, 0.12, 10, 36).rotateX(Math.PI / 2).translate(0, 0.04, 0);
        return mergeGeometries([smoothed(body), smoothed(col)]);
      }),
      yellow,
      0.035,
    );
    const toggles = part(
      og('rain-toggles', () => mergeGeometries([-0.22, -0.44].map((y) => segGeo(new THREE.Vector3(-0.07, y, bodyR(y) * 1.07 + 0.07), new THREE.Vector3(0.07, y, bodyR(y) * 1.07 + 0.07), 0.035)))),
      mat('#3b4f9e', { rough: 0.35 }),
      0.015,
    );
    // 두건 끈: 턱 양옆 테에서 늘어진 끈과 동그란 끈 마개
    const strings = part(
      og('rain-strings', () =>
        mergeGeometries(
          [-1, 1].flatMap((side) => {
            const a = headAt(side * 0.56, -0.8, 1.1).p;
            const b = a.clone().add(new THREE.Vector3(side * 0.03, -0.24, 0.03));
            return [segGeo(a, b, 0.024), baked(sphere(12, 10), compose([b.x, b.y - 0.04, b.z], [0, 0, 0], [0.065, 0.085, 0.065]))];
          }),
        ),
      ),
      mat('#3b4f9e', { rough: 0.35 }),
      0.018,
    );
    return { head: [hood, rim, strings], body: [coat, toggles], hide: ['goggles', 'scarf'] };
  },

  // 우주 요리사: 주름 잡힌 높은 요리사 모자(더듬이가 모자 꼭대기로 나온다) + 흰 앞치마와 주머니 + 손에 든 작은 국자
  chef() {
    const white = mat('#ffffff', { rough: 0.55, emissive: '#fff4ec', emissiveIntensity: 0.26 });
    const hatM = compose([0, 0.47, -0.04], [-0.12, 0, 0.12], [1, 1, 1]);
    const hat = part(og('chef-hat', () => toqueGeo().applyMatrix4(hatM)), white, 0.03);
    const apron = part(
      og('chef-apron', () => {
        const s = new THREE.Shape();
        s.moveTo(-0.17, -0.06);
        s.lineTo(0.17, -0.06);
        s.lineTo(0.2, -0.34);
        s.quadraticCurveTo(0.36, -0.36, 0.4, -0.44);
        s.lineTo(0.42, -0.82);
        s.quadraticCurveTo(0.42, -0.94, 0.3, -0.95);
        s.lineTo(-0.3, -0.95);
        s.quadraticCurveTo(-0.42, -0.94, -0.42, -0.82);
        s.lineTo(-0.4, -0.44);
        s.quadraticCurveTo(-0.36, -0.36, -0.2, -0.34);
        s.closePath();
        return finishSlab(wrapBody(slabGeo(s, { depth: 0.015, bevel: 0.022, seg: 2, tess: 0.09 }), { ref: 0.55, lift: 0.02, radius: (y) => (y > -0.58 ? bodyR(y) : 0.63 + (-0.58 - y) * 0.2) }));
      }),
      white,
      0.022,
    );
    const pocket = part(
      og('chef-pocket', () => {
        const s = new THREE.Shape();
        s.moveTo(-0.13, -0.46);
        s.lineTo(0.13, -0.46);
        s.lineTo(0.13, -0.58);
        s.quadraticCurveTo(0.13, -0.64, 0.07, -0.64);
        s.lineTo(-0.07, -0.64);
        s.quadraticCurveTo(-0.13, -0.64, -0.13, -0.58);
        s.closePath();
        return finishSlab(wrapBody(slabGeo(s, { depth: 0.01, bevel: 0.015, seg: 2, tess: 0.06 }), { ref: 0.55, lift: 0.06 }));
      }),
      mat('#ff8a3c', { rough: 0.5 }),
      0.015,
    );
    // 국자: 손잡이(+y) 끝에 동그란 국자 머리, 그 안엔 주황 수프(+z 쪽, 늘 화면을 보게 돌린다)
    const ladle = new THREE.Group();
    ladle.add(
      part(
        og('chef-ladle', () =>
          mergeGeometries([
            segGeo(new THREE.Vector3(0, -0.06, 0), new THREE.Vector3(0, 0.46, 0), 0.03),
            baked(sphere(20, 14), compose([0, 0.6, 0], [0, 0, 0], [0.16, 0.16, 0.1])),
          ]),
        ),
        mat('#e8eeff', { metal: 0.6, rough: 0.22, envIntensity: 1.4, emissive: '#8890c0', emissiveIntensity: 0.2 }),
        0.022,
      ),
      part(og('chef-soup', () => baked(sphere(16, 8), compose([0, 0.6, 0.075], [0, 0, 0], [0.12, 0.12, 0.035]))), mat('#ff9a3c', { rough: 0.25, emissive: '#c04a00', emissiveIntensity: 0.3 })),
    );
    const dir = new THREE.Vector3();
    const side = new THREE.Vector3();
    const face = new THREE.Vector3();
    const VIEW = new THREE.Vector3(0, 0.45, 1).normalize();
    const basis = new THREE.Matrix4();
    return {
      head: [hat],
      body: [apron, pocket],
      root: [ladle],
      hide: ['goggles'],
      antenna: 0.3,
      update({ mood, hands }) {
        const h = hands.find((x) => x.side < 0).h;
        ladle.position.copy(h.position);
        if (mood === 'happy') dir.set(-0.25 - h.rotation.z * 0.6, 1, 0.15);
        else if (mood === 'shock') dir.set(-0.35, 1, 0.1);
        else if (mood === 'idle') dir.set(-1, -0.45, 0.2);
        else dir.set(-0.9, -0.7, 0.2);
        dir.normalize();
        // 손잡이 = dir, 수프 = 화면 쪽
        face.copy(VIEW).addScaledVector(dir, -dir.dot(VIEW)).normalize();
        side.crossVectors(dir, face);
        ladle.quaternion.setFromRotationMatrix(basis.makeBasis(side, dir, face));
      },
    };
  },

  // 꼬마 우주복: 얼굴이 동그랗게 열린 흰 헬멧(파란 고리 + 주황 귀마개 + 위로 올린 금빛 가리개), 통통한 목 고리, 임무 패치
  astro() {
    const axis = new THREE.Vector3(0, Math.sin(0.1), -Math.cos(0.1));
    const A = Math.PI - 1.1;
    const shell = mat('#ffffff', { rough: 0.24, emissive: '#fff4ec', emissiveIntensity: 0.2, envIntensity: 1.1 });
    const helmet = part(og('astro-helmet', () => shellGeo(axis, A, 1.1, 0.96)), shell, 0.035);
    const ring = part(og('astro-ring', () => edgeGeo(axis, A, 1.09, 0.1)), mat('#5f86ff', { rough: 0.3, metal: 0.3, emissive: '#2a3ab0', emissiveIntensity: 0.2, envIntensity: 1.3 }), 0.03);
    const pods = part(
      og('astro-pods', () => mergeGeometries([-1, 1].map((side) => {
        const { p, n } = headAt(side * 1.48, 0.05, 1.12);
        return baked(sphere(20, 12), surfaceMatrix(p, n, compose([0, 0, 0.03], [0, 0, 0], [0.24, 0.24, 0.12])));
      }))),
      mat('#ff8a3c', { rough: 0.35, emissive: '#c04000', emissiveIntensity: 0.2 }),
      0.028,
    );
    const collar = part(og('astro-collar', () => smoothed(new THREE.TorusGeometry(0.48, 0.14, 12, 36).rotateX(Math.PI / 2).translate(0, 0.03, 0))), shell, 0.03);
    const patch = part(og('astro-patch', () => baked(discGeo(), chestMatrix(-0.6, -0.36, 0.03, compose([0, 0, 0], [0, 0, 0], [0.17, 0.17, 0.035])))), mat('#ffffff', { rough: 0.5, map: patchArt() }), 0.018);
    return { head: [helmet, ring, pods], body: [collar, patch], hide: ['goggles', 'scarf'] };
  },
};

/**
 * 피포를 만든다.
 * @param {number} r 머리 반지름
 * @param {{outfit?: string}} [o] outfit = 입을 의상(PIPO_OUTFITS, 기본 'none' = 본모습)
 * @returns {{ group: THREE.Group, update(o: {t:number, mood:string, look?: THREE.Vector3|null, lit?: number}): void, height: number,
 *             setOutfit(id: string): void, outfit: string }}
 */
export function createPipo(r, { outfit = 'none' } = {}) {
  const S = sharedParts();
  const g = new THREE.Group();
  const u = new THREE.Group(); // 머리 반지름 1 단위 → r 배
  u.scale.setScalar(r);
  g.add(u);
  const rig = new THREE.Group(); // 통통 뛰고 움츠리는 몸
  u.add(rig);

  // 말랑한 비닐 장난감 같은 윤기 + 그늘이 회색이 아니라 보랏빛이 되게 살짝 스스로 빛나는 색
  const skin = mat(SKIN, { rough: 0.4, emissive: '#8c2c9e', emissiveIntensity: 0.22 });
  const line = (m, t) => addOutline(m, t, LINE);

  // 몸: 머리보다 훨씬 작은 젤리콩
  const body = mesh(S.bodyGeo, skin);
  line(body, 0.045);
  rig.add(body);

  // 스카프: 고리 + 매듭 + 두 갈래 꼬리(하나는 늘어지고 하나는 옆으로 휘날린다)
  const scarfMat = mat(SCARF, { rough: 0.6 });
  const scarf = new THREE.Group();
  scarf.position.y = 0.04;
  const ring = mesh(torusGeo(0.5, 0.15, 10, 28), scarfMat, { rot: [Math.PI / 2, 0, 0] });
  line(ring, 0.03);
  // 매듭은 뒤쪽 오른편에 묶고, 꼬리 둘이 어깨 너머로 휘날린다(앞은 손과 조종간 자리)
  const knot = mesh(sphereGeo(1, 14, 10), scarfMat, { pos: [0.36, 0.02, -0.42], scale: [0.16, 0.15, 0.15] });
  line(knot, 0.12);
  const tailA = new THREE.Group();
  tailA.position.set(0.42, 0.0, -0.46);
  const tailAMesh = mesh(capsuleGeo(0.09, 0.42, 4, 8), scarfMat, { pos: [0.14, -0.12, -0.04], rot: [0, 0, 0.95] });
  line(tailAMesh, 0.025);
  tailA.add(tailAMesh);
  const tailB = new THREE.Group();
  tailB.position.set(0.44, 0.06, -0.4);
  const tailBMesh = mesh(capsuleGeo(0.1, 0.58, 4, 8), scarfMat, { pos: [0.27, 0.07, -0.05], rot: [0, 0.3, Math.PI / 2 + 0.25] });
  line(tailBMesh, 0.025);
  tailB.add(tailBMesh);
  scarf.add(ring, knot, tailA, tailB);
  rig.add(scarf);

  // 머리
  const headPivot = new THREE.Group();
  headPivot.position.y = HEAD_Y;
  const squash = new THREE.Group(); // 숨쉬기·놀람의 말랑한 찌그러짐
  headPivot.add(squash);
  const head = mesh(sphereGeo(1, HEAD_SEG[0], HEAD_SEG[1]), mat('#ffffff', { rough: 0.4, map: headArt(), emissive: '#8c2c9e', emissiveIntensity: 0.22 }), { scale: [HS.x, HS.y, HS.z] });
  line(head, 0.04);
  const face = mesh(S.faceGeo, faceMat('idle', false), { cast: false, scale: [HS.x, HS.y, HS.z] });
  face.renderOrder = 2;
  face.raycast = () => {};
  squash.add(head, face);
  rig.add(headPivot);

  // 눈: 흰자 + 따라 도는 눈동자 + 고정된 반짝임
  const white = eyeWhiteMat();
  const eyes = [];
  for (const side of [-1, 1]) {
    const holder = new THREE.Group();
    const ball = mesh(sphereGeo(1, 28, 20), white);
    const pivot = new THREE.Group();
    const iris = mesh(S.irisGeo, S.irisMats.n, { cast: false });
    iris.renderOrder = 1; // 얼굴 그림(2)보다 먼저: 눈알이 얼굴 껍데기 아래로 들어가는 가장자리는 속눈썹 테가 덮는다
    pivot.add(iris);
    const glint = mesh(S.glintGeo, S.glintMat, { cast: false });
    glint.renderOrder = 1;
    holder.add(ball, pivot, glint);
    squash.add(holder);
    eyes.push({ holder, pivot, iris, glint, side, frames: {} });
  }

  // 조종사 고글: 이마 위로 밀어 올린 두 알 고글 + 가죽 끈
  const goggles = new THREE.Group();
  {
    const beta = 1.0; // 끈 고리의 각반지름
    const tau = 0.33; // 끈을 뒤로 기울인 각(앞은 높고 뒤는 낮다)
    const k = new THREE.Vector3(0, Math.cos(tau), -Math.sin(tau));
    const e1 = new THREE.Vector3(0, Math.sin(tau), Math.cos(tau));
    const strapHold = new THREE.Group();
    strapHold.scale.copy(HS).multiplyScalar(1.025);
    const strap = mesh(torusGeo(Math.sin(beta), 0.06, 6, 40), mat(STRAP, { rough: 0.7 }), { cast: false });
    strap.quaternion.setFromUnitVectors(Z, k);
    strap.position.copy(k).multiplyScalar(Math.cos(beta));
    strap.scale.set(1, 1, 0.6);
    strapHold.add(strap);
    goggles.add(strapHold);
    const brass = mat(BRASS, { metal: 0.6, rough: 0.3, envIntensity: 1.3 });
    const lens = mat(LENS, { rough: 0.08, metal: 0.2, emissive: '#3fd8ff', emissiveIntensity: 0.35, envIntensity: 1.6 });
    for (const side of [-1, 1]) {
      const psi = side * 0.4;
      const d = k.clone().multiplyScalar(Math.cos(beta)).add(e1.clone().multiplyScalar(Math.cos(psi) * Math.sin(beta))).add(new THREE.Vector3(Math.sin(psi) * Math.sin(beta), 0, 0));
      const p = d.clone().multiply(HS).multiplyScalar(1.05);
      const n = new THREE.Vector3(p.x / HS.x ** 2, p.y / HS.y ** 2, p.z / HS.z ** 2).normalize();
      const cup = new THREE.Group();
      cup.position.copy(p);
      cup.quaternion.setFromUnitVectors(Z, n.lerp(Z, 0.15).normalize());
      const rim = mesh(torusGeo(0.16, 0.055, 8, 20), brass, { cast: false });
      line(rim, 0.03);
      const glass = mesh(sphereGeo(1, 16, 10), lens, { cast: false, scale: [0.15, 0.15, 0.07], pos: [0, 0, 0.01] });
      cup.add(rim, glass);
      goggles.add(cup);
    }
  }
  squash.add(goggles);

  // 더듬이: 정수리 뒤에서 앞으로 휘어 올라가 끝에 전구
  const antenna = new THREE.Group();
  antenna.position.set(0, 0.88, -0.3);
  const stalk = mesh(S.stalkGeo, skin);
  line(stalk, 0.025);
  const bulbMat = new THREE.MeshStandardMaterial({ color: '#e6fdff', emissive: new THREE.Color(BULB.idle), emissiveIntensity: 2.2, roughness: 0.25 });
  const bulb = mesh(sphereGeo(1, 18, 14), bulbMat, { pos: [S.tip.x, S.tip.y, S.tip.z], scale: 0.19, cast: false });
  line(bulb, 0.09);
  const bulbGlow = glowSprite(BULB.idle, 1.15, 0.75);
  bulbGlow.position.copy(S.tip);
  antenna.add(stalk, bulb, bulbGlow);
  squash.add(antenna);

  // 땀방울(긴장·깜짝)
  const sweat = mesh(sphereGeo(1, 12, 10), mat('#9fe3ff', { rough: 0.15 }), { scale: [0.09, 0.12, 0.09], cast: false });
  addOutline(sweat, 0.12, '#3b7fb0');
  squash.add(sweat);

  // 변장 안경(숨을 때): 동그란 테 + 큰 코 + 콧수염
  const disguise = new THREE.Group();
  {
    const black = mat('#1d1830', { rough: 0.4 });
    for (const side of [-1, 1]) {
      const fr = eyeFrame(side);
      const rim = mesh(torusGeo(1.2, 0.13, 8, 28), black, { cast: false });
      rim.position.copy(fr.pos).add(new THREE.Vector3(0, 0, 0.17));
      rim.quaternion.copy(fr.quat);
      rim.scale.set(EYE.rx, EYE.ry, EYE.rx);
      disguise.add(rim);
    }
    const nd = dirOf(0, -0.2).multiply(HS);
    disguise.add(mesh(cylGeo(0.035, 0.035, 0.22, 8), black, { pos: [0, nd.y + 0.12, nd.z + 0.08], rot: [0, 0, Math.PI / 2], cast: false }));
    const nose = mesh(sphereGeo(1, 16, 12), mat('#ff9fb0', { rough: 0.4 }), { pos: [0, nd.y - 0.02, nd.z + 0.1], scale: [0.2, 0.17, 0.19], cast: false });
    line(nose, 0.1);
    disguise.add(nose);
    const stache = mat('#4a2a1a', { rough: 0.7 });
    for (const side of [-1, 1]) {
      disguise.add(mesh(capsuleGeo(0.1, 0.44, 4, 8), stache, { pos: [side * 0.18, nd.y - 0.19, nd.z + 0.03], rot: [0, side * 0.3, Math.PI / 2 + side * 0.32], cast: false }));
    }
  }
  squash.add(disguise);

  // 조종간(몸 앞, 바닥에서 솟은 막대 + 빨간 손잡이)과 작은 손 두 개
  const stick = new THREE.Group();
  stick.position.set(0.34, -0.6, 0.7);
  const STICK_LEN = 0.6;
  stick.add(mesh(cylGeo(0.04, 0.05, STICK_LEN, 8), mat('#3c4569', { metal: 0.5, rough: 0.35 }), { pos: [0, STICK_LEN / 2, 0], cast: false }));
  const knob = mesh(sphereGeo(1, 16, 12), mat(KNOB, { rough: 0.3 }), { pos: [0, STICK_LEN, 0], scale: 0.11, cast: false });
  line(knob, 0.12);
  stick.add(knob);
  u.add(stick);
  // 손(벙어리장갑 같은 동그란 손) + 어깨에서 손까지 이어지는 짧은 팔
  const hands = [-1, 1].map((side) => {
    const h = mesh(sphereGeo(1, 16, 12), skin);
    line(h, 0.1);
    const arm = mesh(S.armGeo, skin);
    line(arm, 0.03);
    u.add(h, arm);
    return { h, arm, side };
  });
  const Y = new THREE.Vector3(0, 1, 0);
  const shoulder = new THREE.Vector3();
  const armDir = new THREE.Vector3();

  const tmp = new THREE.Vector3();
  const aimDir = new THREE.Vector3();
  const knobAt = new THREE.Vector3();
  const inv = new THREE.Matrix4();
  let lastFace = null;
  const st = { bulb: new THREE.Color(BULB.idle), aim: [0, 0], head: [0, 0], mood: '', since: 0 };

  /** 머리 공간의 방향 d 를 보도록 눈알 안의 껍데기(눈동자·반짝임)를 돌린다. */
  function aimAt(obj, d, fr) {
    tmp.copy(d).applyQuaternion(fr.inv);
    obj.rotation.set(Math.atan2(-tmp.y, tmp.z), Math.asin(Math.max(-1, Math.min(1, tmp.x))), 0);
  }

  function setEyes(f) {
    const key = `${f.eye}|${f.squint}`;
    for (const e of eyes) {
      let fr = e.frames[key];
      if (!fr) fr = e.frames[key] = eyeFrame(e.side, f.eye, f.squint);
      e.holder.position.copy(fr.pos);
      e.holder.quaternion.copy(fr.quat);
      e.holder.scale.copy(fr.scale);
      e.fr = fr;
      // 반짝임은 늘 정면(화면 쪽) 기준 제자리
      aimAt(e.glint, Z, fr);
      e.iris.material = S.irisMats[f.iris] || S.irisMats.n;
    }
  }

  /**
   * 표정과 움직임. look = 눈으로 따라갈 세계 좌표(없으면 정면). lit = 기체 불빛 세기(0..1).
   */
  function update({ t = 0, mood = 'idle', look = null, lit = 1 } = {}) {
    if (!FACES[mood]) mood = 'idle';
    if (mood !== st.mood) {
      st.mood = mood;
      st.since = t;
    }
    // 기쁨: 처음 1.4초는 ^^, 그다음엔 3초마다 1.3초씩 눈을 뜨고 바라본다
    const since = t - st.since;
    const expr = mood === 'happy' && since > 1.4 && (since - 1.4) % 3 < 1.3 ? 'happyOpen' : mood;
    const f = FACES[expr];
    // 깜빡임(평소·긴장 때, 몇 초마다)
    const blink = (mood === 'idle' || mood === 'alert') && (t % 3.7 > 3.57 || (t + 1.3) % 5.9 > 5.79);
    const closed = !!f.closed || blink;
    // 몸짓: 숨쉬기, 기쁘면 통통, 놀라면 펄쩍 + 부르르, 숨으면 움츠림
    const breath = Math.sin(t * 2.4);
    const hopPh = Math.abs(Math.sin(t * 7));
    let y = breath * 0.012;
    if (mood === 'happy') y = hopPh * 0.12;
    else if (mood === 'shock') y = 0.12 + Math.sin(t * 40) * 0.012;
    else if (mood === 'hide') y = -0.2;
    else if (mood === 'alert') y = -0.04;
    rig.position.y = y;
    // 말랑한 찌그러짐: 착지할 때 납작, 뛰어오를 때 길쭉
    let sq = 1 + breath * 0.018;
    if (mood === 'happy') sq = 1 + (hopPh - 0.5) * 0.09;
    else if (mood === 'shock') sq = 1.06 + Math.sin(t * 30) * 0.025;
    else if (mood === 'hide') sq = 0.95;
    squash.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    squash.position.y = (sq - 1) * -0.6; // 목은 제자리, 머리 위쪽이 늘었다 줄었다
    // 눈길: 머리가 30 % 돌고 나머지는 눈이 따라간다
    let yaw = 0;
    let pitch = 0;
    if (look) {
      g.updateMatrixWorld(true);
      inv.copy(u.matrixWorld).invert();
      tmp.copy(look).applyMatrix4(inv);
      tmp.y -= HEAD_Y + y;
      yaw = Math.atan2(tmp.x, Math.max(tmp.z, 0.3));
      pitch = -Math.atan2(tmp.y, Math.max(Math.hypot(tmp.x, tmp.z), 0.3));
    }
    if (mood === 'hide') {
      yaw = Math.sin(t * 3.1) * 0.7; // 두리번두리번
      pitch = 0.05;
    }
    const clamp = (v, a) => Math.max(-a, Math.min(a, v));
    const hy = clamp(yaw * 0.3, 0.28);
    const hp = clamp(pitch * 0.25, 0.15);
    st.head[0] += (hy - st.head[0]) * 0.2;
    st.head[1] += (hp - st.head[1]) * 0.2;
    st.aim[0] += (clamp(yaw - hy, 0.45) - st.aim[0]) * 0.3;
    st.aim[1] += (clamp(pitch - hp, 0.32) - st.aim[1]) * 0.3;
    let tiltZ = Math.sin(t * 1.3) * 0.05;
    if (mood === 'happy') tiltZ = Math.sin(t * 7) * 0.12;
    else if (mood === 'shock') tiltZ = Math.sin(t * 46) * 0.04;
    else if (mood === 'alert') tiltZ = Math.sin(t * 2.2) * 0.03;
    headPivot.rotation.set(st.head[1] + (mood === 'alert' ? -0.04 : 0), st.head[0], tiltZ);
    // 눈
    setEyes(f);
    for (const e of eyes) {
      e.holder.visible = !closed;
      const [ay, ap] = st.aim;
      aimDir.set(Math.sin(ay) * Math.cos(ap), -Math.sin(ap), Math.cos(ay) * Math.cos(ap));
      aimAt(e.pivot, aimDir, e.fr);
    }
    const fm = faceMat(expr, blink);
    if (fm !== lastFace) {
      face.material = fm;
      lastFace = fm;
    }
    white.color.setScalar((0.6 + 0.4 * lit) * 1.15); // 톤 매핑에 회색으로 눌리지 않게(빛 번짐 문턱 1.25 아래)
    disguise.visible = mood === 'hide';
    sweat.visible = mood === 'alert' || mood === 'shock' || mood === 'hide';
    if (sweat.visible) {
      const k = (t * 0.8) % 1;
      sweat.position.set(0.9, 0.42 - k * 0.28, 0.42);
    }
    // 더듬이: 통통 튀는 스프링, 전구 색 = 기분
    const spring = mood === 'shock' ? Math.sin(t * 28) * 0.25 : mood === 'happy' ? Math.sin(t * 14) * 0.16 : Math.sin(t * 3.2) * 0.1 + Math.sin(t * 7.1) * 0.035;
    antenna.rotation.set(spring * 0.5 - 0.05, 0, spring);
    st.bulb.set(BULB[mood] || BULB.idle);
    const flash = mood === 'shock' ? (Math.sin(t * 18) > 0 ? 1 : 0.35) : 1;
    const on = (mood === 'hide' ? 0.15 : 1) * flash * (0.35 + 0.65 * lit);
    bulbMat.emissive.copy(st.bulb);
    bulbMat.emissiveIntensity = 0.3 + 2.2 * on;
    bulbGlow.material.color.copy(st.bulb);
    bulbGlow.material.opacity = 0.75 * on;
    // 스카프 꼬리 펄럭
    const flap = mood === 'shock' ? 30 : mood === 'happy' ? 10 : 6;
    tailA.rotation.z = Math.sin(t * 4.3) * 0.12;
    tailB.rotation.set(Math.sin(t * flap * 0.7) * 0.12, Math.sin(t * flap) * 0.22, Math.sin(t * flap * 0.8 + 1) * 0.12);
    // 조종간: 평소엔 살랑, 긴장하면 꽉 당기고, 기쁘면 신나게 흔든다
    let sx = Math.sin(t * 1.1) * 0.06;
    let sz = Math.sin(t * 0.8) * 0.05;
    if (mood === 'alert') sx = -0.22;
    else if (mood === 'happy') sz = Math.sin(t * 7) * 0.18;
    else if (mood === 'hide') sx = -0.12;
    stick.rotation.set(sx, 0, sz);
    knobAt.set(0, STICK_LEN, 0).applyEuler(stick.rotation).add(stick.position);
    for (const { h, arm, side } of hands) {
      h.rotation.set(0, 0, 0);
      h.scale.set(0.15, 0.13, 0.14);
      if (mood === 'shock') {
        // 두 손으로 볼을 감싸고 깜짝
        h.position.set(side * 0.98, 0.44 + y + Math.sin(t * 40) * 0.01, 0.4);
        h.rotation.z = side * 0.5;
      } else if (side > 0) {
        // 오른손(보는 사람 쪽 오른편)은 늘 조종간 손잡이 바로 아래를 쥔다
        h.position.set(knobAt.x + 0.01, knobAt.y - 0.1, knobAt.z + 0.03);
      } else if (mood === 'happy') {
        // 왼손은 머리 옆으로 높이 들고 흔들흔들 인사
        const w = Math.sin(t * 11);
        h.position.set(-1.1 + w * 0.05, 0.4 + y, 0.34);
        h.scale.set(0.16, 0.18, 0.11);
        h.rotation.z = -0.3 + w * 0.4;
      } else if (mood === 'alert' || mood === 'hide') {
        // 긴장하면 두 손으로 조종간을 꼭
        h.position.set(knobAt.x - 0.13, knobAt.y - 0.05, knobAt.z + 0.02);
      } else {
        // 평소엔 왼손을 배 위에 얹고 느긋하게
        h.position.set(-0.4, -0.1 + y + breath * 0.01, 0.56);
      }
      // 팔: 어깨 → 손
      shoulder.set(side * 0.4, -0.1 + y, 0.12);
      armDir.subVectors(h.position, shoulder);
      const len = Math.max(armDir.length(), 0.01);
      arm.position.copy(shoulder).addScaledVector(armDir, 0.5);
      arm.quaternion.setFromUnitVectors(Y, armDir.divideScalar(len));
      arm.scale.set(1, len, 1);
    }
    if (worn?.update) worn.update({ t, mood, y, hands, spring });
  }

  // 의상: 부품은 의상마다 한 번만 만들어 두고 갈아입을 때 붙였다 뗀다(도형·재질은 모두 공유 캐시라 지우지 않는다)
  const parents = { head: squash, body: rig, root: u };
  const wardrobe = new Map();
  let worn = null;
  let wornId = 'none';
  function setOutfit(id) {
    if (!OUTFIT_BUILD[id]) id = 'none';
    if (id === wornId) return;
    if (worn) for (const [where, obj] of worn.parts) parents[where].remove(obj);
    goggles.visible = true;
    goggles.scale.setScalar(1);
    goggles.rotation.set(0, 0, 0);
    scarf.visible = true;
    antenna.position.set(0, 0.88, -0.3);
    worn = null;
    wornId = id;
    if (id === 'none') return;
    let o = wardrobe.get(id);
    if (!o) {
      const b = OUTFIT_BUILD[id]();
      o = { ...b, parts: [] };
      for (const where of ['head', 'body', 'root']) for (const obj of b[where] || []) o.parts.push([where, obj]);
      wardrobe.set(id, o);
    }
    for (const [where, obj] of o.parts) parents[where].add(obj);
    if (o.hide?.includes('goggles')) goggles.visible = false;
    if (o.hide?.includes('scarf')) scarf.visible = false;
    if (o.goggles) goggles.scale.setScalar(o.goggles);
    if (o.gogglesTilt) goggles.rotation.x = o.gogglesTilt;
    if (o.antenna) antenna.position.y += o.antenna;
    worn = o;
  }
  setOutfit(outfit);
  update({});
  return {
    group: g,
    update,
    height: r * (HEAD_Y + 1.7),
    setOutfit,
    get outfit() {
      return wornId;
    },
  };
}
