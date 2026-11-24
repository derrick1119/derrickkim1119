// 3D 기체 8형태. 조종사는 피포(pipo.js). 사탕처럼 래커 칠한 남보라 접시(칠한 광택 줄, 옅은 판 이음매)에 반들한 금빛 테,
// 통통한 범퍼 고리에 박힌 알약 모양 청록 조명, 아래쪽 발광부, 유리 돔(피포의 더듬이가 돔을 뚫고 나와 있다). 외곽선은 피포와 같은 색.
// 모델 단위: 원점 = 기체 중심, 윗면이 +y. 장면이 화면 너비에 맞춰 배율을 정하고, 윗면이 보이게 앞으로 기울인다.
import {
  THREE,
  PAL,
  tone,
  mat,
  mesh,
  sphereGeo,
  capsuleGeo,
  cylGeo,
  torusGeo,
  latheGeo,
  roundBoxGeo,
  addOutline,
  glowSprite,
  canvasTexture,
} from './kit.js';
import { createPipo } from './pipo.js';
import './outfits/index.js'; // 더 많은 피포 의상(pipo.js 의 registerOutfit 으로 더한다)
import { BEAM_STYLES, beamColor } from './beams.js';
import { DECO_BUILD, buildDeco } from './decos.js';

/** 윗면이 카메라를 보도록 앞으로 기울이는 각도(라디안). */
export const UFO_TILT = 0.36;
/**
 * 조종석: 피포 머리 반지름 = 돔 반지름 × PILOT_K, 유리 높이 = 돔 반지름 × DOME_SY.
 * 피포가 주인공이므로 돔을 크게, 피포를 돔에 꽉 차게 둔다(작은 화면에서도 표정이 보이게).
 */
export const PILOT_K = 0.6;
export const DOME_SY = 1.26;
/** 위층 접시 반지름(맨 아래 접시 R 에 대한 비율): 1층, 2층. */
export const TIER_R = [0.62, 0.46];

// 선체: 사탕처럼 래커 칠한 남보라(피포의 보라와 어울리게) + 반들반들한 금빛 테 + 청록 알약 조명.
// 재질 문법: 윗면은 꼭대기로 갈수록 밝아지는 칠한 그라데이션에 아주 옅은 판 이음매, 투명 코팅(clearcoat)으로
// 하늘이 매끈하게 비친다. 아랫면은 더 짙은 남색 래커. 테두리는 통통한 범퍼 고리에 알약 조명이 박혀 있다.
const HULL = '#352c94';
const HULL_DARK = '#1a1a54';
const BUMPER = '#22216a';
const GOLD = '#ffc444';
const AMBER = '#ffb347';
const DIM = '#24505c';
/** 외곽선 색: 피포와 같은 보라 기운 남색(조종사와 기체가 한 장난감처럼 보이게). */
const LINE = '#2b1a5e';

// ───────── 선체 재질(모든 기체가 함께 쓴다) ─────────

/** 판 이음매 8줄 + 동심 홈 한 줄(새긴 선: 짙은 선 + 옆의 밝은 선). 캔버스 아래 = 테두리(v=0). */
function hullSeams(ctx, w, h, dark = 'rgba(40,36,90,0.42)', light = 'rgba(255,255,255,0.35)') {
  const y0 = h * 0.08;
  const y1 = h * 0.52;
  for (let i = 0; i < 8; i++) {
    const x = ((i + 0.5) / 8) * w;
    ctx.fillStyle = dark;
    ctx.fillRect(x - 1.5, h - y1, 3, y1 - y0);
    ctx.fillStyle = light;
    ctx.fillRect(x + 1.5, h - y1, 2, y1 - y0);
  }
  ctx.fillStyle = dark.replace(/[\d.]+\)$/, '0.35)');
  ctx.fillRect(0, h - h * 0.3 - 2, w, 3);
  ctx.fillStyle = light.replace(/[\d.]+\)$/, '0.3)');
  ctx.fillRect(0, h - h * 0.3 + 1, w, 2);
}

const hullTexCache = new Map();
/**
 * 윗면 칠. 기본은 회색 그라데이션(테두리 v=0 은 조금 짙고 꼭대기 v=1 로 갈수록 밝다)이라 재질 색이 곱해진다.
 * 도색이 grad(테두리 → 꼭대기 색. 색만 늘어놓으면 고르게, [자리, 색] 이면 그 자리에)나 galaxy(별·성운)·pattern(무늬,
 * HULL_PATTERNS)을 가지면 색 그림을 그린다(재질 색은 흰색). seams = 판 이음매(false 면 없음, [짙은 선, 밝은 선] 이면 그 색).
 */
function hullTexture(paint = PAINTS.navy) {
  const pattern = paint.pattern || (paint.galaxy ? 'galaxy' : '');
  const stops = paint.grad || (paint.galaxy ? ['#24125e', '#3a2088', '#5a34b4'] : null);
  const key = `${pattern}|${stops ? stops.join() : 'grey'}|${paint.seams ?? ''}`;
  let tex = hullTexCache.get(key);
  if (tex) return tex;
  tex = canvasTexture(512, 256, (ctx, w, h) => {
    // 캔버스 아래 = 테두리(v=0), 위 = 꼭대기(v=1)
    const g = ctx.createLinearGradient(0, h, 0, 0);
    if (stops) stops.forEach((c, i) => (Array.isArray(c) ? g.addColorStop(c[0], c[1]) : g.addColorStop(i / (stops.length - 1), c)));
    else {
      g.addColorStop(0, '#b4b4c8');
      g.addColorStop(0.35, '#d6d6e4');
      g.addColorStop(0.75, '#f4f4fa');
      g.addColorStop(1, '#ffffff');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (pattern) HULL_PATTERNS[pattern](ctx, w, h);
    if (paint.seams === false) return;
    if (paint.seams) hullSeams(ctx, w, h, ...paint.seams);
    else if (stops) hullSeams(ctx, w, h, 'rgba(60,20,60,0.3)', 'rgba(255,255,255,0.3)');
    else hullSeams(ctx, w, h);
  });
  tex.anisotropy = 8;
  hullTexCache.set(key, tex);
  return tex;
}

/** 은하수 칠: 분홍·하늘빛 성운 얼룩과 반짝이는 별(가로로 이어 붙여도 이음매 없이). */
function galaxyPaint(ctx, w, h) {
  let a = 11;
  const rnd = () => ((a = (a * 16807) % 2147483647) / 2147483647);
  const wrap = (fn) => {
    for (const dx of [-w, 0, w]) fn(dx);
  };
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, r, col] of [[0.1, 0.35, 0.16, '255,90,200'], [0.38, 0.6, 0.2, '90,170,255'], [0.62, 0.3, 0.17, '255,120,220'], [0.86, 0.62, 0.18, '110,140,255'], [0.25, 0.8, 0.12, '200,110,255']]) {
    wrap((dx) => {
      const g = ctx.createRadialGradient(x * w + dx, (1 - y) * h, 0, x * w + dx, (1 - y) * h, r * w);
      g.addColorStop(0, `rgba(${col},0.42)`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 120; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = 0.8 + rnd() * 2;
    ctx.fillStyle = rnd() < 0.25 ? '#ffe9a0' : '#ffffff';
    ctx.globalAlpha = 0.55 + rnd() * 0.45;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // 큰 별 몇 개(네 갈래 반짝)
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 9; i++) {
    const x = rnd() * w;
    const y = h * (0.2 + rnd() * 0.7);
    const R = 5 + rnd() * 4;
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const ang = (k * Math.PI) / 4;
      const rr = k % 2 ? R * 0.28 : R;
      ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }
}

// ───────── 무늬 칠(도색 pattern) ─────────
// 윗면 uv: u = 둘레(u 0 = 정면이라 캔버스 양 끝이 기체 정면에서 맞붙는다. 무늬는 가로로 이음매 없이 이어져야 한다),
// v = 테두리(0, 캔버스 아래) → 꼭대기(1, 캔버스 위). v 는 윤곽 점 번호를 따라 고르게 나뉘어 캔버스의 동그라미가 선체에서는
// 지름 방향으로 납작해진다. 보이는 곳: 바깥 비탈 v 0.05..0.36, 솟은 단의 벽 0.36..0.73(가파르고 좁다),
// 단 위 0.73..0.85(그 안쪽은 돔·받침에 가린다). 캔버스 위쪽 = 화면 위쪽(정면에서 볼 때 무늬가 바로 선다).

const TAU = Math.PI * 2;
/** 씨앗이 있는 난수(무늬가 늘 같게). */
function seeded(seed) {
  let a = seed;
  return () => (a = (a * 16807) % 2147483647) / 2147483647;
}

/** v 자리별로 캔버스 동그라미를 세로로 몇 배 늘여야 선체에서 동그랗게 보이는지(단 있는 윗면 윤곽에서 잰 값). */
const V_STRETCH = [[0, 3.6], [0.1, 2.7], [0.2, 2.3], [0.33, 2.4], [0.38, 5], [0.7, 5], [0.76, 2.4], [0.86, 1]];
function vStretch(v) {
  const T = V_STRETCH;
  if (v <= T[0][0]) return T[0][1];
  for (let i = 1; i < T.length; i++) {
    if (v <= T[i][0]) {
      const [v0, k0] = T[i - 1];
      const [v1, k1] = T[i];
      return k0 + ((v - v0) / (v1 - v0)) * (k1 - k0);
    }
  }
  return T[T.length - 1][1];
}

/**
 * (u, v) 자리에 무늬 하나를 찍는다. draw(c) 는 원점 둘레에 가로 px 단위의 고른 좌표로 그린다(선체에서 동그랗게 보이게
 * 세로로 k 배 늘여 찍는다). 가로로 이어 붙도록 캔버스 왼쪽·오른쪽 너머에도 한 번씩 더 찍는다.
 */
function stamp(ctx, w, h, u, v, draw, k = vStretch(v)) {
  for (const dx of [-w, 0, w]) {
    ctx.save();
    ctx.translate(u * w + dx, h * (1 - v));
    ctx.scale(1, k);
    draw(ctx);
    ctx.restore();
  }
}

function disc(c, x, y, r) {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
}

/** 삼색 얼룩: 크림 바탕에 주황·밤색 고양이 얼룩(동그라미 몇 개를 겹친 덩어리, 밤색이 주황에 맞닿아 겹친다). */
function calicoPaint(ctx, w, h) {
  const rnd = seeded(29);
  const patch = (u, v, r, col) => {
    const blobs = [[0, 0, r]];
    for (let i = 0; i < 4; i++) {
      const a = rnd() * TAU;
      blobs.push([Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.5, r * (0.45 + rnd() * 0.35)]);
    }
    stamp(ctx, w, h, u, v, (c) => {
      c.fillStyle = col;
      c.beginPath();
      for (const [x, y, rr] of blobs) {
        c.moveTo(x + rr, y);
        c.arc(x, y, rr, 0, TAU);
      }
      c.fill();
    });
  };
  for (const [u, v, r] of [[0.03, 0.21, 22], [0.2, 0.27, 18], [0.36, 0.19, 21], [0.53, 0.26, 19], [0.7, 0.2, 20], [0.87, 0.25, 17], [0.12, 0.78, 12], [0.45, 0.8, 12], [0.78, 0.78, 11]]) {
    patch(u, v, r, '#f5913a');
  }
  for (const [u, v, r] of [[0.1, 0.29, 12], [0.27, 0.16, 10], [0.45, 0.3, 11], [0.62, 0.17, 10], [0.79, 0.3, 12], [0.94, 0.15, 9], [0.3, 0.79, 8], [0.62, 0.8, 8], [0.93, 0.79, 8]]) {
    patch(u, v, r, '#5e3524');
  }
}

/** 공룡 정글: 잎빛 바탕에 짙은 초록 둥근 비늘 점(큰 점 곁에 작은 점이 붙기도 한다). 점마다 위 왼쪽에 옅은 윤기. */
function junglePaint(ctx, w, h) {
  const rnd = seeded(5);
  for (const [j, [v, n, r]] of [[0.15, 12, 9], [0.29, 11, 8], [0.5, 12, 4.5], [0.79, 9, 7]].entries()) {
    for (let i = 0; i < n; i++) {
      const u = (i + (j % 2) * 0.5 + (rnd() - 0.5) * 0.35) / n;
      const vv = v + (rnd() - 0.5) * 0.04;
      const rr = r * (0.75 + rnd() * 0.5);
      const sat = rnd() < 0.55;
      const sa = rnd() * TAU;
      stamp(ctx, w, h, u, vv, (c) => {
        c.fillStyle = '#23874a';
        disc(c, 0, 0, rr);
        if (sat) disc(c, Math.cos(sa) * rr * 1.7, Math.sin(sa) * rr * 1.7, rr * 0.4);
        c.fillStyle = 'rgba(200,255,190,0.35)';
        disc(c, -rr * 0.32, -rr * 0.3, rr * 0.38);
      });
    }
  }
}

/** 꿀벌 줄무늬: 노란 바탕에 옅은 벌집 무늬 + 굵은 검은 띠(동심 고리 = 캔버스 가로줄). */
function honeyPaint(ctx, w, h) {
  // 벌집: 열 24 개(짝수라 엇갈린 줄까지 가로로 이어진다), 선체에서 정육각형으로 보이게 세로로 늘인다
  const cols = 24;
  const dx = w / cols;
  const r = dx / 1.5;
  const k = 2.4;
  const dy = Math.sqrt(3) * r * k;
  ctx.strokeStyle = 'rgba(196,112,0,0.3)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i <= cols; i++) {
    for (let y = -dy; y < h + dy; y += dy) {
      ctx.save();
      ctx.translate(i * dx, y + (i % 2) * dy * 0.5);
      ctx.scale(1, k);
      ctx.beginPath();
      for (let a = 0; a < 6; a++) ctx.lineTo(Math.cos((a * Math.PI) / 3) * r * 0.97, Math.sin((a * Math.PI) / 3) * r * 0.97);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }
  // 검은 띠(위 가장자리에 래커 윤기 한 줄)
  for (const [v0, v1] of [[0.19, 0.29], [0.47, 0.62], [0.8, 0.9]]) {
    const y0 = h * (1 - v1);
    const y1 = h * (1 - v0);
    ctx.fillStyle = '#2a1d16';
    ctx.fillRect(0, y0, w, y1 - y0);
    ctx.fillStyle = 'rgba(255,226,160,0.2)';
    ctx.fillRect(0, y0 + 2, w, 2);
  }
}

/** 마법 밤하늘: 남보라 바탕에 은은한 보랏빛 안개, 별 가루, 금빛 초승달과 별. */
function magicPaint(ctx, w, h) {
  const rnd = seeded(41);
  ctx.globalCompositeOperation = 'lighter';
  for (const [u, v, r] of [[0.08, 0.3, 0.13], [0.42, 0.22, 0.15], [0.72, 0.3, 0.14]]) {
    stamp(ctx, w, h, u, v, (c) => {
      const g = c.createRadialGradient(0, 0, 0, 0, 0, r * w);
      g.addColorStop(0, 'rgba(150,80,255,0.3)');
      g.addColorStop(1, 'rgba(150,80,255,0)');
      c.fillStyle = g;
      disc(c, 0, 0, r * w);
    }, 1);
  }
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 70; i++) {
    const u = rnd();
    const v = 0.04 + rnd() * 0.85;
    const r = 0.7 + rnd() * 1.1;
    const col = rnd() < 0.4 ? '#ffe9a0' : '#ffffff';
    const a = 0.5 + rnd() * 0.5;
    stamp(ctx, w, h, u, v, (c) => {
      c.globalAlpha = a;
      c.fillStyle = col;
      disc(c, 0, 0, r);
    });
  }
  const GOLD_HI = '#ffe58a';
  const moon = (u, v, r, rot) =>
    stamp(ctx, w, h, u, v, (c) => {
      c.rotate(rot);
      // 초승달 = 큰 동그라미 안에서 비껴 놓인 동그라미 바깥
      c.beginPath();
      c.arc(0, 0, r, 0, TAU);
      c.clip();
      c.beginPath();
      c.rect(-2 * r, -2 * r, 4 * r, 4 * r);
      c.arc(r * 0.55, -r * 0.25, r * 0.85, 0, TAU);
      c.clip('evenodd');
      c.fillStyle = '#ffc93c';
      c.fillRect(-r, -r, 2 * r, 2 * r);
      // 등 쪽 안에 밝은 금빛(광택)
      c.fillStyle = GOLD_HI;
      disc(c, -r * 0.62, r * 0.1, r * 0.22);
    });
  const star = (u, v, r, rot) =>
    stamp(ctx, w, h, u, v, (c) => {
      c.rotate(rot);
      c.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const rr = k % 2 ? r * 0.46 : r;
        c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      c.closePath();
      c.fillStyle = '#ffc93c';
      c.fill();
      c.fillStyle = GOLD_HI;
      disc(c, -r * 0.08, -r * 0.1, r * 0.3);
    });
  for (const [u, v, r, rot] of [[0.04, 0.22, 13, -0.5], [0.3, 0.26, 12, -0.3], [0.55, 0.2, 13, -0.6], [0.8, 0.25, 12, -0.4], [0.18, 0.79, 8, -0.4], [0.68, 0.8, 8, -0.5]]) moon(u, v, r, rot);
  for (const [u, v, r, rot] of [[0.13, 0.17, 7, 0.2], [0.2, 0.3, 5, -0.1], [0.4, 0.17, 8, 0.1], [0.45, 0.3, 5, 0.3], [0.65, 0.29, 7, -0.2], [0.9, 0.16, 8, 0.15], [0.94, 0.31, 5, 0], [0.36, 0.52, 4, 0], [0.86, 0.55, 4, 0.2], [0.42, 0.8, 6, 0.1], [0.92, 0.79, 6, -0.1]]) star(u, v, r, rot);
}

/** 눈꽃 하나(여섯 갈래, 갈래마다 가지 두 쌍). 원점 둘레, 반지름 r. */
function snowflake(c, r, col, lw) {
  c.strokeStyle = col;
  c.lineWidth = lw;
  c.lineCap = 'round';
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - Math.PI / 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    c.moveTo(0, 0);
    c.lineTo(ca * r, sa * r);
    for (const [t, l] of [[0.48, 0.36], [0.76, 0.22]]) {
      const bx = ca * r * t;
      const by = sa * r * t;
      for (const s of [-1, 1]) {
        const b = a + s * 0.85;
        c.moveTo(bx, by);
        c.lineTo(bx + Math.cos(b) * r * l, by + Math.sin(b) * r * l);
      }
    }
  }
  c.stroke();
}

/** 눈꽃: 얼음빛 → 흰 그라데이션 위에 또렷한 눈꽃(옅은 파란 그림자로 흰 바탕에서도 보인다)과 눈 가루. */
function snowPaint(ctx, w, h) {
  const rnd = seeded(23);
  for (let i = 0; i < 60; i++) {
    const u = rnd();
    const v = 0.04 + rnd() * 0.82;
    const r = 0.8 + rnd() * 1.2;
    stamp(ctx, w, h, u, v, (c) => {
      c.fillStyle = 'rgba(255,255,255,0.85)';
      disc(c, 0, 0, r);
    });
  }
  const flake = (u, v, r, rot) =>
    stamp(ctx, w, h, u, v, (c) => {
      c.rotate(rot);
      // 파란 테두리를 두른 흰 눈꽃(흰 바탕·하늘빛 반사 속에서도 또렷하게)
      snowflake(c, r, '#4f98d6', 3.6);
      c.fillStyle = '#4f98d6';
      disc(c, 0, 0, r * 0.2 + 1);
      snowflake(c, r, '#ffffff', 1.9);
      c.fillStyle = '#ffffff';
      disc(c, 0, 0, r * 0.2);
    });
  for (const [u, v, r, rot] of [[0.02, 0.22, 14, 0], [0.14, 0.29, 9, 0.3], [0.24, 0.18, 12, 0.15], [0.37, 0.27, 10, 0], [0.49, 0.2, 13, 0.4], [0.62, 0.28, 10, 0.1], [0.73, 0.19, 12, 0.25], [0.86, 0.27, 10, 0.05], [0.93, 0.17, 8, 0.3], [0.08, 0.53, 4.5, 0], [0.33, 0.55, 4.5, 0.2], [0.58, 0.52, 4.5, 0], [0.83, 0.55, 4.5, 0.2], [0.2, 0.79, 8, 0.1], [0.53, 0.8, 8, 0.3], [0.8, 0.79, 8, 0]]) {
    flake(u, v, r, rot);
  }
}

/** 해적선: 둘레를 따라 놓인 짙은 나무 판자(판자마다 결·이음매·놋쇠 못). */
function piratePaint(ctx, w, h) {
  const rnd = seeded(13);
  const tones = ['#8a4a22', '#783e1b', '#95572a', '#81451f'];
  // 판자 경계(v). 가파른 단 벽은 선체에서 좁아지므로 v 를 넓게 잡는다
  const edges = [0, 0.075, 0.15, 0.225, 0.3, 0.37, 0.49, 0.61, 0.73, 0.8, 0.87, 1];
  for (let i = 0; i < edges.length - 1; i++) {
    const y0 = h * (1 - edges[i + 1]);
    const y1 = h * (1 - edges[i]);
    const vm = (edges[i] + edges[i + 1]) / 2;
    ctx.fillStyle = tones[i % tones.length];
    ctx.fillRect(0, y0, w, y1 - y0);
    // 나뭇결: 둘레를 따라 정수 번 출렁이는 가는 줄(가로로 이어 붙는다)
    ctx.strokeStyle = 'rgba(40,16,4,0.3)';
    ctx.lineWidth = 1;
    for (let g = 0; g < 3; g++) {
      const yy = y0 + (y1 - y0) * (0.25 + g * 0.25);
      const f = 2 + ((i + g) % 3);
      const ph = rnd() * TAU;
      const amp = (0.6 + rnd()) * Math.min(1.5, (y1 - y0) / 14);
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) ctx.lineTo(x, yy + Math.sin((x / w) * TAU * f + ph) * amp);
      ctx.stroke();
    }
    // 판자 이음(줄마다 엇갈리게)과 이음 양쪽의 놋쇠 못
    const off = (i % 2) * 0.5 + rnd() * 0.08;
    const k = vStretch(vm);
    for (let j = 0; j < 3; j++) {
      const u = (j + off) / 3;
      for (const dx of [-w, 0, w]) {
        const x = u * w + dx;
        ctx.fillStyle = 'rgba(30,12,4,0.75)';
        ctx.fillRect(x - 1, y0, 2, y1 - y0);
        ctx.fillStyle = 'rgba(255,214,160,0.18)';
        ctx.fillRect(x + 1, y0, 1, y1 - y0);
      }
      for (const s of [-1, 1]) {
        stamp(ctx, w, h, u + (s * 5) / w, vm, (c) => {
          c.fillStyle = '#3a1d0c';
          disc(c, 0.4, 0.4, 2);
          c.fillStyle = '#f0c46a';
          disc(c, 0, 0, 1.6);
        }, k);
      }
    }
  }
  // 판자 사이 틈(짙은 줄 + 아래 밝은 모서리)
  for (const v of edges.slice(1, -1)) {
    const y = h * (1 - v);
    ctx.fillStyle = 'rgba(28,10,2,0.85)';
    ctx.fillRect(0, y - 1, w, 2);
    ctx.fillStyle = 'rgba(255,210,150,0.22)';
    ctx.fillRect(0, y + 1, w, 1);
  }
}

/** 딸기우유: 분홍 바탕에 흰 물방울(줄마다 엇갈리게, 옅은 분홍 그림자). */
function berryPaint(ctx, w, h) {
  for (const [j, [v, n, r]] of [[0.06, 14, 5.5], [0.19, 13, 8], [0.32, 12, 7], [0.47, 12, 4.5], [0.61, 12, 4.5], [0.79, 10, 6.5]].entries()) {
    for (let i = 0; i < n; i++) {
      stamp(ctx, w, h, (i + (j % 2) * 0.5) / n, v, (c) => {
        c.fillStyle = 'rgba(214,70,128,0.28)';
        disc(c, 0.8, 1, r);
        c.fillStyle = '#ffffff';
        disc(c, 0, 0, r);
      });
    }
  }
}

/** 사탕: 분홍·민트·레몬 줄 사이사이 흰 줄이 비스듬히 휘감는다(한 바퀴에 정수 번 돌아 가로로 이어진다). */
function candyPaint(ctx, w, h) {
  const cols = ['#ff7fb8', '#fff8f0', '#5fdcb6', '#fff8f0', '#ffdc3c', '#fff8f0'];
  const n = 18; // 3 바퀴 × 6 줄(색 수의 배수)
  const sw = w / n;
  const k = 0.55; // 비스듬함(캔버스 세로 1px 에 가로 k px)
  for (let i = -Math.ceil((k * h) / sw) - 1; i <= n; i++) {
    const x0 = i * sw;
    ctx.fillStyle = cols[((i % 6) + 6) % 6];
    ctx.beginPath();
    ctx.moveTo(x0, h);
    ctx.lineTo(x0 + sw + 0.6, h);
    ctx.lineTo(x0 + sw + 0.6 + k * h, 0);
    ctx.lineTo(x0 + k * h, 0);
    ctx.fill();
  }
}

let auroraLayer = null;
/**
 * 오로라 빛 커튼(투명 바탕 한 겹): 둘레를 따라 출렁이는 세로 빛줄기(아래 초록, 위 보랏빛). 1px 기둥마다 그라데이션을 만들어
 * 무거우므로 한 번만 그려 두고 칠·발광 지도에 덧그린다(addAurora).
 */
function auroraCurtains(w, h) {
  if (auroraLayer) return auroraLayer;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.globalCompositeOperation = 'lighter';
  const curtain = (v0, len, f, ph, low, high, amt) => {
    // 2px 기둥(가는 결은 그래도 남고 그리기는 절반)
    for (let x = 0; x < w; x += 2) {
      const p = ((x + 1) / w) * TAU;
      // 모두 정수 번 출렁이므로 캔버스 양 끝이 맞붙는다. 둘레 대부분을 덮고 밝기만 출렁인다
      let b = 0.42 + 0.4 * Math.sin(p * f[0] + ph) + 0.22 * Math.sin(p * f[1] + ph * 2.1) + 0.14 * Math.sin(p * f[2] + ph * 0.7);
      b = Math.min(1, Math.max(0, b)) * (0.72 + 0.18 * Math.sin(p * 41 + ph) + 0.1 * Math.sin(p * 97 + ph * 3));
      if (b <= 0.01) continue;
      // 커튼 아랫단이 뱀처럼 굽이친다
      const a = v0 + 0.03 * Math.sin(p * 3 + ph) + 0.015 * Math.sin(p * 8 + ph * 1.7);
      const top = a + len * (0.7 + 0.3 * Math.sin(p * 5 + ph * 1.3));
      const y0 = h * (1 - top);
      const y1 = h * (1 - a);
      const g = ctx.createLinearGradient(0, y1, 0, y0);
      g.addColorStop(0, `rgba(${low},0)`);
      g.addColorStop(0.06, `rgba(${low},${amt * b})`);
      g.addColorStop(0.3, `rgba(${low},${amt * 0.7 * b})`);
      g.addColorStop(0.65, `rgba(${high},${amt * 0.45 * b})`);
      g.addColorStop(1, `rgba(${high},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x, y0, 2, y1 - y0);
    }
  };
  curtain(0.15, 0.24, [3, 7, 2], 0.6, '70,255,170', '170,120,255', 1);
  curtain(0.42, 0.36, [4, 9, 2], 2.2, '100,255,200', '235,110,255', 0.85);
  auroraLayer = cv;
  return cv;
}
/** 오로라 빛 커튼을 k 세기로 빛처럼 더한다. */
function addAurora(ctx, w, h, k) {
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = k;
  ctx.drawImage(auroraCurtains(w, h), 0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/** 오로라: 짙은 청록 → 보라 바탕에 빛 커튼과 별 몇 개. */
function auroraPaint(ctx, w, h) {
  const rnd = seeded(17);
  addAurora(ctx, w, h, 1);
  addAurora(ctx, w, h, 0.5);
  for (let i = 0; i < 26; i++) {
    const u = rnd();
    const v = 0.15 + rnd() * 0.72;
    const r = 0.8 + rnd() * 1.1;
    stamp(ctx, w, h, u, v, (c) => {
      c.fillStyle = 'rgba(255,255,255,0.9)';
      disc(c, 0, 0, r);
    });
  }
}

/** 크롬: 비친 하늘·땅을 흉내 낸 동심 띠는 grad 가 맡고, 여기서는 가는 결(둘레를 따라 문지른 금속 결)만 더한다. */
function chromePaint(ctx, w, h) {
  const rnd = seeded(31);
  for (let i = 0; i < 90; i++) {
    const y = rnd() * h;
    ctx.fillStyle = rnd() < 0.5 ? `rgba(255,255,255,${0.08 + rnd() * 0.1})` : `rgba(30,36,52,${0.06 + rnd() * 0.08})`;
    ctx.fillRect(0, y, w, 1);
  }
  // 판 이음매 양 끝의 둥근 리벳(이음매 8줄과 같은 자리)
  for (let i = 0; i < 8; i++) {
    for (const v of [0.12, 0.47]) {
      stamp(ctx, w, h, (i + 0.5) / 8 + 6 / w, v, (c) => {
        c.fillStyle = 'rgba(20,26,44,0.6)';
        disc(c, 0.6, 0.6, 2.6);
        c.fillStyle = '#f4f7fc';
        disc(c, 0, 0, 2.2);
      });
    }
  }
}

const HULL_PATTERNS = {
  galaxy: galaxyPaint,
  calico: calicoPaint,
  jungle: junglePaint,
  honey: honeyPaint,
  magic: magicPaint,
  snow: snowPaint,
  pirate: piratePaint,
  berry: berryPaint,
  candy: candyPaint,
  aurora: auroraPaint,
  chrome: chromePaint,
};
/** 무늬 중 스스로 빛나는 부분(도색의 glow: true). 발광 지도(hullGloss) 위에 더한다. */
const HULL_GLOWS = {
  aurora: (ctx, w, h) => addAurora(ctx, w, h, 0.75),
};

const hullGlossCache = new Map();
/**
 * 윗면의 칠한 광택(발광 지도): 바탕은 아주 짙은 제 색(그늘에서도 색이 살아 있게, 도색마다 다르다), 앞 왼쪽 비탈에는
 * 장난감 래커처럼 또렷한 흰 반사 줄 하나와 작은 점 하나. 기체는 y 축으로 돌지 않으므로 반사가 늘 왼쪽 위에 머문다.
 * u = 0 이 정면(+z), u = 0.75 가 왼쪽(−x). glow = 무늬 이름이면 그 무늬의 빛나는 부분(HULL_GLOWS)도 스스로 빛난다
 * (비친 하늘빛에 묻히지 않게).
 */
function hullGloss(base = '#100f48', glow = null) {
  const key = `${base}|${glow || ''}`;
  let tex = hullGlossCache.get(key);
  if (tex) return tex;
  tex = canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    if (glow) HULL_GLOWS[glow](ctx, w, h);
    const streak = (u0, u1, v, th, a) => {
      // 캔버스 아래 = 테두리(v=0)
      const y = h * (1 - v);
      const g = ctx.createLinearGradient(0, y - th, 0, y + th);
      g.addColorStop(0, 'rgba(220,226,255,0)');
      g.addColorStop(0.5, `rgba(220,226,255,${a})`);
      g.addColorStop(1, 'rgba(220,226,255,0)');
      ctx.fillStyle = g;
      ctx.save();
      ctx.beginPath();
      // 끝이 가늘어지는 줄: 가로로 긴 타원
      ctx.ellipse(((u0 + u1) / 2) * w, y, ((u1 - u0) / 2) * w, th, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    streak(0.69, 0.92, 0.25, 20, 1);
    streak(0.76, 0.9, 0.86, 13, 0.8);
  });
  hullGlossCache.set(key, tex);
  return tex;
}

const hullMats = new Map();
/** 래커 칠 재질(투명 코팅). kind: top(윗면, 칠 그라데이션) | plain | gold */
function lacquer(color, kind = 'plain') {
  const key = `${color}|${kind}`;
  let m = hullMats.get(key);
  if (m) return m;
  if (kind === 'gold') {
    m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), metalness: 0.8, roughness: 0.28, clearcoat: 0.5, clearcoatRoughness: 0.2, envMapIntensity: 0.95 });
  } else {
    // 피포처럼 제 색으로 살짝 스스로 빛나게(그늘에서도 잿빛이 아니라 진한 남보라로 남는다)
    const top = kind === 'top';
    m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      map: top ? hullTexture() : null,
      metalness: 0.1,
      roughness: 0.34,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      envMapIntensity: 0.85,
      emissive: top ? new THREE.Color('#ffffff') : new THREE.Color(color).multiplyScalar(0.55),
      emissiveMap: top ? hullGloss() : null,
      emissiveIntensity: top ? 1 : 0.3,
    });
  }
  hullMats.set(key, m);
  return m;
}

// ───────── 도색(꾸미기) ─────────

/**
 * 기체 도색(catalog.js 의 paint 와 같은 id). 능력치 없음. 모양은 그대로 두고 선체 재질만 바꾼다(메시를 더하지 않는다).
 * top = 윗면 색(grad 가 있으면 테두리 → 꼭대기 색 그림. 무늬 칠에서는 대표 색), pattern = 윗면 무늬(HULL_PATTERNS),
 * seams = 판 이음매(false 면 없음), under = 아랫면, bumper = 범퍼·받침, trim = 장식 테(trimKind: gold 금속(은빛 색이면 은) |
 * plain 래커), fin = 순찰선 날개, light = 알약 조명·청록 선 빛, pill = 켜진 알약 색, dim = 꺼진 알약 색,
 * gloss = 윗면 그늘 빛 바탕, glow = 무늬의 빛나는 부분도 스스로 빛남(HULL_GLOWS), metal = 윗면도 금속(true 면 살짝,
 * 숫자면 그 금속성), rough = 윗면 거칠기, env = 윗면에 비치는 하늘 세기, deck = 창문 갑판 색.
 */
export const PAINTS = {
  navy: { top: HULL, under: HULL_DARK, bumper: BUMPER, trim: GOLD, trimKind: 'gold', fin: '#ec3d52', light: PAL.glow, pill: '#bffaff', dim: DIM, gloss: '#100f48', deck: tone(HULL, 0.05) },
  sunset: { top: '#ff8a6a', grad: ['#ff5f6d', '#ff8466', '#ffb35c', '#ffd772'], under: '#c63f5f', bumper: '#e2546a', trim: '#fff1d6', trimKind: 'plain', fin: '#ffd25a', light: '#ffd36b', pill: '#fff4d6', dim: '#5c3a2c', gloss: '#4a1424', deck: '#ff9c6a' },
  mint: { top: '#8ff2b4', under: '#3cb488', bumper: '#f6fff8', trim: '#ffffff', trimKind: 'plain', fin: '#ff8fc4', light: '#ff7fcf', pill: '#ffe2f2', dim: '#5c3550', gloss: '#0c3a22', deck: '#a6f5c6' },
  galaxy: { top: '#ffffff', galaxy: true, under: '#1d0f47', bumper: '#2b1766', trim: GOLD, trimKind: 'gold', fin: '#ff6fd0', light: '#d48cff', pill: '#f3dcff', dim: '#3c2a5c', gloss: '#1a0a3a', deck: '#3e2690' },
  gold: { top: '#ffc23a', metal: true, under: '#e09a1c', bumper: '#22216a', trim: '#262a78', trimKind: 'plain', fin: '#262a78', light: PAL.glow, pill: '#bffaff', dim: DIM, gloss: '#6a3600', deck: '#ffcf52' },
  // 삼색 얼룩(고양이 세트): 크림 바탕에 주황·밤색 얼룩, 주황 배, 흰 테, 복숭아빛 조명
  calico: { top: '#ffe6c2', grad: ['#ffd6a2', '#ffe3bc', '#fff0d8'], pattern: 'calico', seams: false, under: '#f4a35a', bumper: '#ffe9cc', trim: '#ffffff', trimKind: 'plain', fin: '#f5913a', light: '#ffa98a', pill: '#fff0e8', dim: '#6a4234', gloss: '#3a2416', deck: '#ffe6c8' },
  // 공룡 정글(공룡 세트): 잎빛 초록에 짙은 둥근 비늘 점, 연한 배, 주황 테, 라임 조명
  jungle: { top: '#64d687', grad: ['#3cbc68', '#5cd27f', '#8fe8a0'], pattern: 'jungle', seams: false, under: '#d6f4b0', bumper: '#2f9e58', trim: '#ff9a2e', trimKind: 'plain', fin: '#ff8a3d', light: '#c4ff3c', pill: '#f2ffd0', dim: '#33502a', gloss: '#0b3a1c', deck: '#7ee39a' },
  // 꿀벌 줄무늬(꿀벌 세트): 노란 바탕에 굵은 검은 띠와 옅은 벌집 무늬, 검은 테, 호박색 조명
  honey: { top: '#ffc928', grad: ['#ffb01a', '#ffc52c', '#ffd94e'], pattern: 'honey', seams: false, under: '#2b2018', bumper: '#ffbf22', trim: '#2b2018', trimKind: 'plain', fin: '#fff2c8', light: '#ffae1c', pill: '#fff2c8', dim: '#5a4020', gloss: '#4a2a00', deck: '#ffd03a' },
  // 마법 밤하늘(마법사 세트): 남보라 바탕에 금빛 초승달·별, 금 테, 보랏빛 조명
  magic: { top: '#33208a', grad: ['#22156a', '#31208c', '#472cae'], pattern: 'magic', seams: false, under: '#1c1250', bumper: '#2c1a70', trim: GOLD, trimKind: 'gold', fin: '#ffcf4a', light: '#b97cff', pill: '#efdcff', dim: '#3a2a5c', gloss: '#1a0c44', deck: '#40289a' },
  // 눈꽃: 얼음빛 → 흰 그라데이션에 또렷한 눈꽃, 은 테, 얼음빛 조명
  snow: { top: '#c6e6ff', grad: ['#7fc2f5', '#a8d7fb', '#d8eeff', '#ffffff'], pattern: 'snow', seams: false, under: '#86c0ec', bumper: '#f4fbff', trim: '#e4ecf6', trimKind: 'gold', fin: '#8fd2ff', light: '#86e4ff', pill: '#eefcff', dim: '#3c5a70', gloss: '#14304a', deck: '#dff2ff' },
  // 해적선(해적 세트): 짙은 나무 판자, 금 테, 빨간 날개, 따뜻한 호박색 조명
  pirate: { top: '#86481f', grad: ['#783e1b', '#86481f'], pattern: 'pirate', seams: false, under: '#4a2816', bumper: '#3a2012', trim: GOLD, trimKind: 'gold', fin: '#e0353c', light: '#ffb347', pill: '#fff0d0', dim: '#5c3a22', gloss: '#2a1206', deck: '#8a5432' },
  // 딸기우유: 분홍 바탕에 흰 물방울, 흰 테, 분홍 조명
  berry: { top: '#ff94bd', grad: ['#ff6aa4', '#ff8cbb', '#ffb0cf'], pattern: 'berry', seams: false, under: '#ff82ae', bumper: '#fff4f8', trim: '#ffffff', trimKind: 'plain', fin: '#ff5f97', light: '#ff7fc6', pill: '#ffe4f2', dim: '#6a3450', gloss: '#4a1028', deck: '#ffc0d6' },
  // 사탕: 분홍·민트·레몬·흰 줄이 비스듬히 휘감는 사탕 칠, 흰 테, 라일락 조명
  candy: { top: '#ffc6e0', grad: ['#ffffff', '#ffffff'], pattern: 'candy', seams: false, under: '#ff9fca', bumper: '#9eeed2', trim: '#ffffff', trimKind: 'plain', fin: '#ffeb70', light: '#c99cff', pill: '#f3e6ff', dim: '#4e3a66', gloss: '#3a1a3a', deck: '#fff3a0' },
  // 오로라: 청록 → 보라 바탕에 출렁이는 빛 커튼과 별, 은 테, 청록 조명
  aurora: { top: '#1d5a96', grad: ['#0a5868', '#123f80', '#2c2a8e', '#5a2cb0'], pattern: 'aurora', glow: true, seams: false, under: '#142a62', bumper: '#1d2f74', trim: '#e2eaf4', trimKind: 'gold', fin: '#56f0cf', light: '#4ff0d8', pill: '#ddfff8', dim: '#1f4a52', gloss: '#08203a', deck: '#2b4fa0' },
  // 크롬 은빛: 비친 하늘·땅을 흉내 낸 동심 띠(살짝 푸른 은)로 하늘 앞에서도 또렷하게, 남색 테, 청록 조명
  chrome: {
    top: '#d6deea',
    grad: [[0, '#3c4456'], [0.07, '#8f99ac'], [0.15, '#e8edf5'], [0.22, '#ffffff'], [0.28, '#a9b2c2'], [0.33, '#3f4759'], [0.37, '#7c8699'], [0.43, '#e2e7ef'], [0.55, '#ffffff'], [0.66, '#b6bfcd'], [0.72, '#545e72'], [0.77, '#d9dfe8'], [1, '#ffffff']],
    pattern: 'chrome',
    seams: ['rgba(26,34,70,0.5)', 'rgba(255,255,255,0.6)'],
    metal: 0.18,
    rough: 0.2,
    env: 0.5,
    under: '#8c92a0',
    bumper: '#262a78',
    trim: '#262a78',
    trimKind: 'plain',
    fin: '#262a78',
    light: PAL.glow,
    pill: '#bffaff',
    dim: DIM,
    gloss: '#182034',
    deck: '#c6d0df',
  },
};

const paintMats = new Map();
/** 도색 재질(캐시). role: top(윗면, amt = 위층마다 밝히는 정도) | under | bumper | trim | fin | deck */
function paintMat(id, role, amt = 0) {
  const P = PAINTS[id] || PAINTS.navy;
  if (P === PAINTS.navy) {
    // 기본 남색은 원래 재질 그대로
    if (role === 'top') return lacquer(amt ? tone(HULL, amt) : HULL, 'top');
    if (role === 'trim') return lacquer(GOLD, 'gold');
    if (role === 'deck') return lacquer(P.deck);
    return lacquer({ under: HULL_DARK, bumper: BUMPER, fin: P.fin }[role] || HULL);
  }
  const key = `${id}|${role}|${amt}`;
  let m = paintMats.get(key);
  if (m) return m;
  if (role === 'top') {
    const colored = !!(P.grad || P.galaxy || P.pattern);
    m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(colored ? (amt ? tone('#ffffff', amt * 0.5) : '#ffffff') : amt ? tone(P.top, amt) : P.top),
      map: hullTexture(P),
      // 금빛 칠은 금속성을 조금만: 하늘이 비치면 빛이 바래 베이지가 된다. 반짝임은 투명 코팅이 맡는다.
      // 크롬처럼 금속성을 숫자로 주면 그만큼(비친 하늘에 묻히지 않게 명암은 칠 그림이 맡는다)
      metalness: typeof P.metal === 'number' ? P.metal : P.metal ? 0.32 : 0.1,
      roughness: P.rough ?? (P.metal ? 0.26 : 0.34),
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      envMapIntensity: P.env ?? (P.metal ? 1.1 : 0.85),
      emissive: new THREE.Color('#ffffff'),
      emissiveMap: hullGloss(P.gloss, P.glow ? P.pattern : null),
      emissiveIntensity: 1,
    });
  } else if (role === 'trim') {
    m = lacquer(P.trim, P.trimKind === 'gold' ? 'gold' : 'plain');
  } else {
    m = lacquer({ under: P.under, bumper: P.bumper, fin: P.fin, deck: P.deck }[role] || P.top);
  }
  paintMats.set(key, m);
  return m;
}

/** 도색이 바뀌는 메시를 만든다(어떤 역할인지 기억해 두었다가 setPaint 가 재질을 갈아 끼운다). */
function pmesh(o, geo, role, opts, amt = 0) {
  const m = mesh(geo, paintMat(o.paint, role, amt), opts);
  m.userData.paint = [role, amt];
  o.painted.push(m);
  return m;
}

// ───────── 부품 ─────────

/**
 * 접시 하나. 윤곽을 R 배로 키운다. 돌려주는 값: 부품과 윗면 높이(돔을 올릴 자리).
 */
function saucer(o, R, { pills = 10, ambers = 3, topTone = 0, emitter = true, tier = true }) {
  const g = new THREE.Group();
  const P = (pts) => pts.map(([r, y]) => [r * R, y * R]);
  const ol = 0.026 * R;
  // 아랫면: 배꼽에서 테두리까지 매끈한 사발(짙은 남색 래커)
  const under = pmesh(o, latheGeo(P([[0.0, -0.2], [0.2, -0.196], [0.4, -0.178], [0.6, -0.145], [0.76, -0.105], [0.87, -0.066], [0.94, -0.03], [0.965, 0.0]]), 44, `ufoUnder${R}`), 'under');
  // 테두리 범퍼: 통통한 고리(알약 조명이 박힌다)
  const bumper = pmesh(o, torusGeo(R * 0.955, R * 0.052, 10, 60), 'bumper', { rot: [Math.PI / 2, 0, 0], pos: [0, R * 0.012, 0] });
  // 윗면 + 가운데 솟은 단(둥글린 턱)
  const topPts = tier
    ? [[0.975, 0.045], [0.94, 0.085], [0.86, 0.12], [0.76, 0.152], [0.67, 0.178], [0.64, 0.19], [0.625, 0.21], [0.615, 0.24], [0.59, 0.262], [0.52, 0.276], [0.3, 0.286], [0.001, 0.29]]
    : [[0.975, 0.045], [0.93, 0.09], [0.8, 0.14], [0.62, 0.185], [0.42, 0.215], [0.2, 0.232], [0.001, 0.236]];
  const upper = pmesh(o, latheGeo(P(topPts), 52, `ufoTop${R}|${tier}`), 'top', undefined, topTone);
  addOutline(under, ol, LINE);
  addOutline(bumper, ol * 0.8, LINE);
  addOutline(upper, ol, LINE);
  g.add(under, bumper, upper);
  // 금빛 장식: 윗면 가장자리 테 + 솟은 단 밑동 테 + 단 둘레 둥근 징(적고 크게)
  const trim = pmesh(o, torusGeo(R * 0.9, R * 0.02, 6, 56), 'trim', { rot: [Math.PI / 2, 0, 0], pos: [0, R * 0.107, 0], cast: false });
  g.add(trim);
  if (tier) {
    g.add(pmesh(o, torusGeo(R * 0.648, R * 0.018, 6, 48), 'trim', { rot: [Math.PI / 2, 0, 0], pos: [0, R * 0.188, 0], cast: false }));
    for (let i = 0; i < 8; i++) {
      const a = ((i + 0.5) / 8) * Math.PI * 2;
      g.add(pmesh(o, sphereGeo(1, 10, 6), 'trim', { pos: [Math.sin(a) * R * 0.622, R * 0.226, Math.cos(a) * R * 0.622], scale: [R * 0.03, R * 0.03, R * 0.022], cast: false }));
    }
  }
  // 범퍼 위 청록 선
  const line = mesh(torusGeo(R * 1.0, R * 0.006, 4, 56), o.lineMat, { cast: false, rot: [Math.PI / 2, 0, 0], pos: [0, R * 0.052, 0] });
  g.add(line);
  // 알약 조명(범퍼 앞에 반쯤 박힘)
  const sprites = [];
  for (let i = 0; i < pills; i++) {
    const a = (i / pills) * Math.PI * 2;
    const holder = new THREE.Group();
    holder.rotation.y = a;
    const p = mesh(capsuleGeo(R * 0.04, R * 0.16, 3, 10), o.pillMat, { cast: false, rot: [0, 0, Math.PI / 2], pos: [0, R * 0.012, R * 0.995] });
    holder.add(p);
    const sp = glowSprite(o.light(), R * 0.24, 0.6);
    o.lightSprites.push(sp);
    sp.position.set(0, R * 0.012, R * 1.07);
    holder.add(sp);
    sprites.push({ sp, i });
    g.add(holder);
  }
  // 호박색 작은 등(윗면 가장자리)
  const amberSprites = [];
  for (let i = 0; i < ambers; i++) {
    const a = -0.9 + (1.8 * i) / Math.max(1, ambers - 1);
    const x = Math.sin(a) * R * 0.8;
    const z = Math.cos(a) * R * 0.8;
    // 금테 두른 호박색 보석 등
    const b = mesh(sphereGeo(1, 10, 6), o.amberMat, { cast: false, pos: [x, R * 0.136, z], scale: [R * 0.03, R * 0.022, R * 0.03] });
    const rim = pmesh(o, torusGeo(R * 0.032, R * 0.008, 6, 18), 'trim', { cast: false, pos: [x, R * 0.132, z], rot: [Math.PI / 2 - 0.12, 0, 0] });
    const sp = glowSprite(AMBER, R * 0.09, 0.5);
    sp.position.set(x, R * 0.15, z);
    g.add(b, rim, sp);
    amberSprites.push(sp);
  }
  // 아래 발광부 + 금빛 테
  let bowl = null;
  if (emitter) {
    bowl = mesh(sphereGeo(1, 24, 10), o.bowlMat, { cast: false, pos: [0, -R * 0.19, 0], scale: [R * 0.3, R * 0.1, R * 0.3] });
    g.add(bowl);
    g.add(pmesh(o, torusGeo(R * 0.3, R * 0.022, 6, 36), 'trim', { rot: [Math.PI / 2, 0, 0], pos: [0, -R * 0.19, 0], cast: false }));
  }
  /** 윗면 높이(가운데에서 반지름 r 떨어진 자리, 모델 단위). 장식을 윗면에 얹을 때 쓴다. */
  const surfaceY = (r) => {
    const x = Math.abs(r) / R;
    const pts = topPts;
    if (x >= pts[0][0]) return pts[0][1] * R;
    for (let i = 1; i < pts.length; i++) {
      if (pts[i][0] <= x) {
        const [x0, y0] = pts[i - 1];
        const [x1, y1] = pts[i];
        return (y1 + ((x - x1) / Math.max(1e-6, x0 - x1)) * (y0 - y1)) * R;
      }
    }
    return pts[pts.length - 1][1] * R;
  };
  return { group: g, sprites, amberSprites, topY: (tier ? 0.29 : 0.236) * R, bellyY: -0.27 * R, surfaceY };
}

/** 조종석 유리: 가운데는 거의 투명(피포가 또렷이 보이게), 가장자리 가는 테두리만 하늘빛(돔에 꽉 찬 피포를 가리지 않게). */
let pilotGlassMat = null;
function pilotGlass() {
  if (pilotGlassMat) return pilotGlassMat;
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#c6f6ff'),
    transparent: true,
    roughness: 0.04,
    metalness: 0.1,
    envMapIntensity: 1.8,
    depthWrite: false,
  });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float glassF = 1.0 - saturate( dot( geometryNormal, geometryViewDir ) );
      diffuseColor.a = mix( 0.03, 0.5, pow( glassF, 3.2 ) );
      outgoingLight += vec3( 0.55, 0.92, 1.0 ) * pow( glassF, 3.6 ) * 0.4;
      #include <opaque_fragment>`,
    );
  };
  m.customProgramCacheKey = () => 'pipoGlass';
  pilotGlassMat = m;
  return m;
}

/** 돔 유리의 반짝 줄: 화면에서 본 돔 테두리의 왼쪽 위를 따라 휘는 흰 줄(긴 것 + 짧은 것). */
let glintMat = null;
function domeGlints(r, sy) {
  glintMat ??= new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false });
  const g = new THREE.Group();
  g.scale.set(1, sy, 1);
  // 기체가 앞으로 기울어 있으므로 카메라는 돔을 앞 조금 위에서 본다. 그 시선 둘레의 원 위에 줄을 얹는다.
  const view = new THREE.Vector3(0, Math.sin(UFO_TILT), Math.cos(UFO_TILT));
  const gam = 1.18;
  for (const [from, len, tube] of [[1.95, 0.85, 0.028], [2.95, 0.16, 0.024]]) {
    const arc = mesh(torusGeo(r * Math.sin(gam) * 1.01, r * tube, 6, 16, len), glintMat, { cast: false });
    arc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), view);
    arc.rotateZ(from);
    arc.position.copy(view).multiplyScalar(r * Math.cos(gam) * 1.01);
    arc.renderOrder = 4;
    g.add(arc);
  }
  return g;
}

/** 유리 돔과 조종사. y = 돔 바닥. */
function dome(o, y, r, withPilot = true) {
  const g = new THREE.Group();
  g.position.y = y;
  const collar = mesh(torusGeo(r * 1.02, r * 0.07, 10, 40), mat(PAL.hullLight, { metal: 0.6, rough: 0.3, envIntensity: 1.2 }), {
    rot: [Math.PI / 2, 0, 0],
    pos: [0, r * 0.03, 0],
  });
  g.add(collar);
  let pilot = null;
  // 조종석 돔은 큰 머리가 들어가게 높게(동그란 사탕 유리병처럼)
  const sy = withPilot ? DOME_SY : 1;
  if (withPilot) {
    pilot = createPipo(r * PILOT_K, { outfit: o.outfit });
    const seat = new THREE.Group();
    seat.position.y = r * 0.08; // 스카프·조종간 손잡이가 받침 위로 보이게
    seat.rotation.x = -0.16; // 의자에 살짝 기대 앉아 얼굴이 화면을 향한다(기체가 앞으로 기울어 있으므로)
    seat.add(pilot.group);
    g.add(seat);
  } else {
    const inner = mesh(sphereGeo(1, 16, 10), mat(PAL.glow, { emissive: PAL.glow, emissiveIntensity: 0.8 }), { cast: false, scale: [r * 0.5, r * 0.4, r * 0.5], pos: [0, r * 0.2, 0] });
    g.add(inner);
  }
  const glass = mesh(new THREE.SphereGeometry(r, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2), withPilot ? pilotGlass() : o.glassMat, { cast: false });
  if (withPilot) {
    glass.scale.y = sy;
    g.add(domeGlints(r, sy));
  }
  glass.renderOrder = 3;
  g.add(glass);
  return { group: g, pilot, baseY: y };
}

function antenna(o, x, y, len, lean, color) {
  const g = new THREE.Group();
  g.position.set(x, y, 0);
  g.rotation.z = lean;
  const rod = pmesh(o, cylGeo(0.014, 0.02, len, 8), 'trim', { pos: [0, len / 2, 0] });
  g.add(pmesh(o, sphereGeo(1, 10, 8), 'bumper', { pos: [0, 0.01, 0], scale: 0.035 }));
  const lit = color !== AMBER;
  const tipMat = lit ? o.pillMat : o.amberMat;
  const tip = mesh(sphereGeo(1, 12, 8), tipMat, { cast: false, pos: [0, len, 0], scale: 0.035 });
  const sp = glowSprite(lit ? o.light() : color, 0.22, 0.7);
  if (lit) o.lightSprites.push(sp);
  sp.position.set(0, len, 0);
  g.add(rod, tip, sp);
  return { group: g, sprite: sp };
}

// ───────── 형태 ─────────

/**
 * 형태별 설계: R = 접시 반지름, dome = 조종석 돔 반지름(R 에 대한 비율), hw = 화면 배율용 반폭(고리·호위선 포함).
 * 화면에서 기체 너비는 형태마다 정해져 있으므로(scene3d UFO_SCREEN_W), 돔이 클수록 피포가 크게 보인다.
 */
const SPECS = [
  { R: 0.5, dome: 0.7, pills: 6, ambers: 0, hw: 0.52 },
  { R: 0.78, dome: 0.6, pills: 10, ambers: 3, hw: 0.8 },
  { R: 0.9, dome: 0.56, pills: 12, ambers: 3, hw: 0.95, antennas: true },
  { R: 0.8, dome: 0.58, pills: 10, ambers: 2, hw: 1.2, ring: true },
  { R: 1.0, dome: 0.48, pills: 14, ambers: 2, hw: 1.1, tiers: 1, fins: true },
  { R: 1.15, dome: 0.46, pills: 14, ambers: 2, hw: 1.2, sideDomes: true, radar: true },
  { R: 1.4, dome: 0.44, pills: 18, ambers: 3, hw: 1.42, deck: true, antennas: true },
  { R: 1.7, dome: 0.44, pills: 20, ambers: 4, hw: 1.98, tiers: 2, escorts: true, antennas: true },
];

/**
 * 기체를 만든다.
 * @param {number} form 형태(0..7)
 * @param {{paint?: string, outfit?: string, beam?: string, deco?: string}} [look] paint = 도색(PAINTS), outfit = 피포 의상,
 *   beam = 빔 색(beams.js), deco = 기체 장식(decos.js)
 * @returns {{ root: THREE.Group, update(o: {t:number, mood?:string, lit?:number, beam?:number}): void,
 *             halfWidth: number, bellyY: number, topY: number, body: THREE.Group, pilot: object,
 *             setPaint(id: string): void, setOutfit(id: string): void, setBeam(id: string): void, setDeco(id: string): void,
 *             paint: string, deco: string }}
 *   bellyY = 빔이 나오는 자리, topY = 꼭대기(말풍선 자리). 둘 다 기울이기 전 모델 단위.
 */
export function createUfo(form, { paint = 'navy', outfit = 'none', beam = 'cyan', deco = 'none' } = {}) {
  const spec = SPECS[Math.min(Math.max(form, 0), SPECS.length - 1)];
  if (!PAINTS[paint]) paint = 'navy';
  // 이 기체만 쓰는 빛 재질(밝기를 매 프레임 바꾼다)
  const o = {
    paint,
    outfit,
    painted: [], // 도색이 바뀌는 메시
    lightSprites: [], // 조명 빛 번짐(도색의 빛 색을 따른다)
    lightMats: [], // 에너지 고리처럼 조명 색을 따르는 재질
    light: () => PAINTS[o.paint].light,
    pillMat: new THREE.MeshStandardMaterial({ color: PAINTS[paint].pill, emissive: new THREE.Color(PAINTS[paint].light), emissiveIntensity: 2, roughness: 0.3 }),
    lineMat: new THREE.MeshBasicMaterial({ color: new THREE.Color(PAINTS[paint].light), transparent: true, opacity: 0.9 }),
    amberMat: new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: new THREE.Color(AMBER), emissiveIntensity: 1.6, roughness: 0.4 }),
    bowlMat: new THREE.MeshStandardMaterial({ color: '#d8fdff', emissive: new THREE.Color(PAL.glow), emissiveIntensity: 1.2, roughness: 0.25 }),
    glassMat: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#bdf4ff'),
      transparent: true,
      opacity: 0.3,
      roughness: 0.04,
      metalness: 0.1,
      envMapIntensity: 2.2,
      depthWrite: false,
    }),
  };
  const root = new THREE.Group();
  const body = new THREE.Group(); // 기울임·흔들림은 장면이 root 에, 모양은 body 에
  root.add(body);
  const R = spec.R;
  const main = saucer(o, R, { pills: spec.pills, ambers: spec.ambers });
  body.add(main.group);
  const sprites = [...main.sprites];
  const ambers = [...main.amberSprites];
  const blinkers = [];
  let topY = main.topY;
  let domeY = main.topY - 0.01;

  // 위층
  const tierInfo = [];
  if (spec.tiers) {
    for (let k = 0; k < spec.tiers; k++) {
      const r2 = R * TIER_R[k];
      const t = saucer(o, r2, { pills: Math.round(spec.pills * (k === 0 ? 0.7 : 0.5)), ambers: 0, emitter: false, topTone: 0.06 + k * 0.05 });
      t.group.position.y = topY - r2 * 0.02;
      tierInfo.push({ r2, y0: t.group.position.y });
      body.add(t.group);
      sprites.push(...t.sprites);
      topY = t.group.position.y + t.topY;
    }
    domeY = topY - 0.01;
  }
  // 창문 갑판(대형 모선)
  if (spec.deck) {
    const deckR = R * 0.55;
    const deckH = R * 0.12;
    const deck = pmesh(o, latheGeo([[deckR * 1.04, 0], [deckR * 1.05, deckH * 0.15], [deckR * 1.03, deckH * 0.85], [deckR * 0.99, deckH], [0.001, deckH]], 56, `ufoDeck${R}`), 'deck', { pos: [0, topY - 0.01, 0] });
    addOutline(deck, 0.02 * R, LINE);
    body.add(deck);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const holder = new THREE.Group();
      holder.rotation.y = a;
      holder.add(mesh(roundBoxGeo(0.1, 0.075, 0.03, 0.025, 2), o.pillMat, { cast: false, pos: [0, topY + deckH / 2 - 0.01, deckR * 1.055] }));
      body.add(holder);
    }
    const cap = pmesh(o, torusGeo(deckR * 0.99, R * 0.016, 8, 64), 'trim', { rot: [Math.PI / 2, 0, 0], pos: [0, topY + deckH - 0.005, 0] });
    body.add(cap);
    topY += deckH;
    domeY = topY;
  }
  // 돔과 조종사
  const domeR = R * spec.dome * (spec.tiers === 2 ? 0.86 : 1);
  const d = dome(o, domeY, domeR);
  body.add(d.group);
  // 조종석 받침: 돔 고리 바깥을 두르는 금빛 테와 남색 래커 받침(돔 자체는 건드리지 않는다)
  const seatRing = pmesh(o, torusGeo(domeR * 1.13, domeR * 0.055, 8, 48), 'trim', { rot: [Math.PI / 2, 0, 0], pos: [0, domeY + domeR * 0.005, 0], cast: false });
  const seatBase = pmesh(o, cylGeo(domeR * 1.17, domeR * 1.2, domeR * 0.07, 48), 'bumper', { pos: [0, domeY - domeR * 0.03, 0], cast: false });
  addOutline(seatBase, 0.012 * R, LINE);
  body.add(seatBase, seatRing);
  const pilot = d.pilot;
  topY = domeY + domeR * DOME_SY; // 조종석 유리는 둥글게 높다

  // 안테나
  const antennaX = Math.max(R * (spec.deck ? 0.42 : 0.3), domeR * 1.34);
  if (spec.antennas) {
    for (const s of [-1, 1]) {
      // 커진 돔 바깥(받침 테 밖)에 세운다
      const a = antenna(o, s * antennaX, main.surfaceY(antennaX) - R * 0.01, R * 0.42, -s * 0.35, s < 0 ? o.light() : AMBER);
      body.add(a.group);
      blinkers.push(a.sprite);
    }
    topY = Math.max(topY, main.topY + R * 0.42);
  }
  // 날개(순찰선)
  if (spec.fins) {
    for (const s of [-1, 1]) {
      // 뒤로 젖힌 사탕빛 날개: 납작한 구를 옆으로 늘이고 뒤로 비스듬히 민 모양(매끈해서 외곽선이 깨끗하다)
      const fg = new THREE.SphereGeometry(1, 22, 12);
      fg.scale(0.21, 0.05, 0.12);
      fg.translate(s * 0.17, 0, 0);
      fg.applyMatrix4(new THREE.Matrix4().set(1, 0, 0, 0, 0, 1, 0, 0, -0.55 * s, 0, 1, 0, 0, 0, 0, 1));
      const fin = pmesh(o, fg, 'fin', { pos: [s * R * 0.93, 0.02, 0.02], rot: [0, 0, s * 0.22] });
      addOutline(fin, 0.016, LINE);
      fin.add(pmesh(o, sphereGeo(1, 10, 8), 'trim', { pos: [s * 0.36, 0.0, -0.2], scale: [0.04, 0.04, 0.04], cast: false }));
      body.add(fin);
    }
  }
  // 옆 관측 돔과 레이더(관측선)
  if (spec.sideDomes) {
    for (const s of [-1, 1]) {
      // 커진 조종석 받침 바깥 비탈에
      const sx = Math.max(R * 0.58, domeR * 1.2 + R * 0.16);
      const sd = dome(o, main.surfaceY(sx) - R * 0.012, R * 0.15, false);
      sd.group.position.x = s * sx;
      body.add(sd.group);
    }
  }
  let radar = null;
  if (spec.radar) {
    radar = new THREE.Group();
    // 조종석 받침 바깥 왼쪽 뒤
    const rr = Math.max(R * 0.52, domeR * 1.24 + R * 0.06);
    radar.position.set(-rr * 0.88, main.surfaceY(rr) - R * 0.01, -rr * 0.47);
    radar.add(pmesh(o, cylGeo(0.016, 0.022, 0.2, 8), 'trim', { pos: [0, 0.1, 0] }));
    const dish = mesh(latheGeo([[0.001, 0], [0.08, 0.02], [0.15, 0.07], [0.17, 0.09]], 24, 'radar'), mat('#eef0ff', { rough: 0.35, side: THREE.DoubleSide, envIntensity: 1.1 }), { pos: [0, 0.22, 0], rot: [-0.9, 0, 0] });
    addOutline(dish, 0.009, LINE);
    dish.add(mesh(sphereGeo(1, 8, 6), o.pillMat, { pos: [0, 0.1, 0], scale: 0.025, cast: false }));
    radar.add(dish);
    body.add(radar);
  }
  // 에너지 고리(고리 접시)
  let ring = null;
  const ringSprites = [];
  if (spec.ring) {
    ring = new THREE.Group();
    ring.rotation.set(Math.PI / 2 + 0.12, 0.1, 0);
    ring.add(mesh(torusGeo(R * 1.42, 0.018, 8, 96), new THREE.MeshBasicMaterial({ color: '#e8ffff' }), { cast: false }));
    const haze = new THREE.MeshBasicMaterial({ color: o.light(), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
    o.lightMats.push(haze);
    ring.add(mesh(torusGeo(R * 1.42, 0.06, 10, 96), haze, { cast: false }));
    for (let i = 0; i < 3; i++) {
      const sp = glowSprite(o.light(), 0.3, 0.9);
      o.lightSprites.push(sp);
      ring.add(sp);
      ringSprites.push(sp);
    }
    body.add(ring);
  }
  // 호위선(은하 모선)
  const escorts = [];
  if (spec.escorts) {
    for (let i = 0; i < 2; i++) {
      const e = saucer(o, 0.2, { pills: 6, ambers: 0, emitter: true, tier: false });
      const d2 = dome(o, e.topY - 0.005, 0.07, false);
      e.group.add(d2.group);
      body.add(e.group);
      escorts.push(e.group);
      sprites.push(...e.sprites);
    }
  }

  const bellyY = main.bellyY;

  // 장식(decos.js)을 얹을 자리
  const anchor = {
    form: Math.min(Math.max(form, 0), SPECS.length - 1),
    spec,
    R,
    surfaceY: main.surfaceY, // 맨 아래 접시 윗면 높이(반지름 r 에서)
    rimY: R * 0.045, // 윗면 가장자리 높이
    mainTopY: main.topY, // 맨 아래 접시 가운데 높이
    domeY, // 조종석 돔 바닥
    domeR, // 돔 반지름(세로는 1.1 배)
    domeTop: domeY + domeR * DOME_SY, // 돔 꼭대기
    domeSY: DOME_SY, // 돔 유리 높이 / 돔 반지름
    tiers: tierInfo, // 위층 접시 [{ r2, y0 }]
    antennaX: spec.antennas ? antennaX : 0, // 안테나 밑동의 가로 자리(양쪽)
    topY, // 기체 꼭대기(안테나 포함)
    bellyY,
    o, // 재질 묶음(pillMat, lightSprites 등. 도색 빛 색을 따르려면 o.light())
    // 도색을 따르는 메시(role: top | under | bumper | trim | fin | deck). 도색을 바꾸면 재질이 함께 바뀐다
    pmesh: (geo, role, opts, amt = 0) => pmesh(o, geo, role, opts, amt),
    paint: () => PAINTS[o.paint], // 지금 도색 값(light·trim 색 등)
  };
  let decoId = 'none';
  let decoObj = null;

  /** look = 피포가 눈으로 따라갈 세계 좌표(없으면 정면). */
  function update({ t = 0, mood = 'idle', lit = 1, beam = 0, look = null } = {}) {
    const L = Math.min(Math.max(lit, 0), 1);
    // 빛 번짐은 블룸이 맡으므로 조명 자체와 스프라이트는 은은하게
    o.pillMat.emissiveIntensity = 0.15 + 1.1 * L;
    o.pillMat.color.set(L > 0.3 ? PAINTS[o.paint].pill : PAINTS[o.paint].dim);
    if (beamStyle.hue || beamStyle.grad || beamStyle.stripes) beamColor(beamId, t, 0, undefined, o.bowlMat.emissive); // 움직이는 빔은 발광부도 따라 바뀐다
    o.lineMat.opacity = 0.15 + 0.8 * L;
    o.amberMat.emissiveIntensity = 0.1 + 1.5 * L;
    o.bowlMat.emissiveIntensity = 0.15 + Math.max(beam * 1.9, L * 0.9);
    for (const { sp, i } of sprites) sp.material.opacity = L * (0.12 + 0.2 * (0.5 + 0.5 * Math.sin(t * 4 - i * 0.9)));
    ambers.forEach((sp, i) => {
      sp.material.opacity = L > 0.3 && Math.sin(t * 3 + i * 2) > -0.4 ? 0.6 : 0;
    });
    blinkers.forEach((sp, i) => {
      sp.material.opacity = L > 0.3 && Math.sin(t * 4 + i * 1.7) > -0.2 ? 0.8 : 0.05;
    });
    // 피포: 표정·몸짓·눈길
    pilot.update({ t, mood, look, lit: L });
    // 움직이는 부품
    if (radar) radar.rotation.y = Math.sin(t * 0.9) * 0.6;
    if (ring) {
      ring.rotation.z = t * 0.6;
      ringSprites.forEach((sp, i) => {
        const a = t * 1.6 + (i * Math.PI * 2) / 3;
        sp.position.set(Math.cos(a) * R * 1.42, Math.sin(a) * R * 1.42, 0);
        sp.material.opacity = 0.3 + 0.6 * L;
      });
    }
    escorts.forEach((e, i) => {
      const a = t * 0.7 + i * Math.PI;
      e.position.set(Math.cos(a) * R * 1.12, R * 0.02 + Math.sin(a * 2) * 0.04, Math.sin(a) * R * 0.7);
      e.rotation.y = -a;
    });
    decoObj?.update?.({ t, mood, lit: L, beam });
  }

  /** 기체 장식을 바꾼다(decos.js). 장식은 기체마다 새로 만들고, 바꾸면 이전 것은 떼어 낸다. */
  function setDeco(id) {
    if (!DECO_BUILD[id]) id = 'none';
    if (id === decoId && (decoObj || id === 'none')) return;
    if (decoObj) {
      body.remove(decoObj.group);
      // 도색이 바뀌는 메시 목록에서도 뺀다
      const gone = new Set();
      decoObj.group.traverse((m) => gone.add(m));
      o.painted = o.painted.filter((m) => !gone.has(m));
      o.lightSprites = o.lightSprites.filter((m) => !gone.has(m));
    }
    decoObj = null;
    decoId = id;
    if (id === 'none') return;
    decoObj = buildDeco(id, anchor);
    if (!decoObj) {
      decoId = 'none';
      return;
    }
    decoObj.group.traverse((m) => {
      if (m.isMesh) m.castShadow = false;
    });
    body.add(decoObj.group);
  }

  /** 도색을 바꾼다(선체 재질만 갈아 끼운다. 재질은 도색마다 캐시해 함께 쓰므로 지우지 않는다). */
  function setPaint(id) {
    if (!PAINTS[id]) id = 'navy';
    if (id === o.paint) return;
    o.paint = id;
    for (const m of o.painted) m.material = paintMat(id, ...m.userData.paint);
    const P = PAINTS[id];
    o.pillMat.emissive.set(P.light);
    o.pillMat.color.set(P.pill);
    o.lineMat.color.set(P.light);
    for (const sp of o.lightSprites) sp.material.color.set(P.light);
    for (const m of o.lightMats) m.color.set(P.light);
  }
  /** 빔 색(beams.js)에 맞춰 아래 발광부 빛을 바꾼다. */
  let beamId = 'cyan';
  let beamStyle = BEAM_STYLES.cyan;
  function setBeam(id) {
    beamId = BEAM_STYLES[id] ? id : 'cyan';
    beamStyle = BEAM_STYLES[beamId];
    o.bowlMat.emissive.set(beamStyle.color);
  }
  setBeam(beam);
  setDeco(deco);
  update({});

  // 기체는 높이 떠 있어 땅에 그림자를 드리우지 않는다(컨셉에도 없다)
  root.traverse((m) => {
    if (m.isMesh) m.castShadow = false;
  });
  return {
    root,
    update,
    halfWidth: spec.hw,
    hullR: R, // 맨 아래 접시 반지름(구름 방석 크기)
    bellyY,
    topY,
    body,
    pilot,
    setPaint,
    setBeam,
    setDeco,
    /** 조종사 피포의 의상을 바꾼다. */
    setOutfit: (id) => pilot.setOutfit(id),
    get paint() {
      return o.paint;
    },
    get deco() {
      return decoId;
    },
  };
}
