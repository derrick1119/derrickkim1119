// 하늘을 올려다보는 지구인들. 컨셉 아트의 꼬마(머리 큰) 3D 카툰 인물.
// 원점: 보통 사람은 발밑 가운데, 열기구는 바구니 바닥 가운데, 우주비행사는 몸 중심.
// 바라보는 쪽(dir)으로 좌우를 뒤집어 한 벌만 그린다. 빛은 언제나 화면 왼쪽 위에서 오므로
// 뒤집힌 좌표에서 빛이 오는 쪽(LX)을 따로 챙긴다.
import { P, TAU, tone, edge, shade, gloss, groundShadow, withAlpha, lerp, clamp, ellipse, circle, rrect, poly } from './draw.js';

/**
 * @typedef {object} Pose
 * @property {number} t      애니메이션 시계(초)
 * @property {number} dir    바라보는 방향 -1 | 1
 * @property {number} walk   걷는 정도 0..1
 * @property {number} look   고개를 든 정도 0..1
 * @property {boolean} [shock] 들켰을 때(잠자리채를 꺼내 휘두른다)
 * @property {boolean} [wave]  손을 흔든다(진엔딩)
 */

let LX = -1; // 지금 좌표에서 빛이 오는 x 쪽(-1 왼쪽, +1 오른쪽)

// 몸의 뼈대(엉덩이 기준). 서 있을 때 엉덩이는 발밑에서 14 위.
const HIP = 14;
const LEG = 11.4; // 엉덩이 → 발목
const HEAD_Y = -31; // 머리 중심
const HEAD_R = 13;
const SH_X = 7.2; // 어깨
const SH_Y = -16;
const FACE_X = 2.8; // 얼굴은 바라보는 쪽으로 치우친다(3/4 시점)
const FACE_Y = 1.2;

const MOUTH = '#8a2c3c';
const TONGUE = '#ff8f8f';
const METAL = '#b4bcdc';
const WHITE_LINE = '#a3a8d2';

/** 사람마다 생김새. skin = P.skin 번호 */
const LOOKS = {
  farmer: { skin: 1, hair: P.hairBrown, top: '#f7f1e3', sleeve: 'short', bottom: '#4f74c4', shoe: '#8a5a3a', head: 'straw', body: 'overalls', face: 'mustache', item: 'fork' },
  kid: { skin: 0, hair: '#8a5233', top: '#e04a42', sleeve: 'puff', bottom: null, shoe: '#8c2f3f', head: 'bonnet', body: 'dress' },
  walker: { skin: 2, hair: '#3a2a2a', top: '#8a6ad8', bottom: '#2f3d7a', shoe: '#f6f4fb', head: 'ponytail', body: 'hoodie', item: 'leash' },
  camper: { skin: 1, hair: '#b0582e', top: '#4f9e58', bottom: '#8a6440', shoe: '#6b4428', head: 'beanie', body: 'jacket', face: 'freckles', item: 'mug' },
  fisher: { skin: 2, hair: '#efebe6', top: '#ffd23f', bottom: '#3d4f86', shoe: '#3f9a62', head: 'bucket', body: 'raincoat', face: 'beard', item: 'rod' },
  worker: { skin: 0, hair: '#2e2638', top: '#4a5a9c', bottom: '#3c4a86', shoe: '#5a3526', head: 'neat', body: 'suit', item: 'case' },
  streamer: { skin: 3, hair: '#3a2a2a', top: '#ff8fb0', bottom: '#5f86d6', shoe: '#f6f4fb', head: 'buns', body: 'hoodie2', item: 'stick' },
  astronomer: { skin: 0, hair: '#c98a55', top: '#f4f5fb', bottom: '#56608f', shoe: '#6b4428', head: 'bald', body: 'labcoat', face: 'glasses', item: 'scope' },
  photographer: { skin: 2, hair: '#4a2c22', top: '#2fb5a6', bottom: '#454b7d', shoe: '#5a3526', head: 'beret', body: 'vest', item: 'camera' },
};

/** 머리 꼭대기(모자 포함) 높이, 발밑 기준. */
const TOPS = {
  farmer: -67,
  kid: -63,
  walker: -60,
  camper: -66,
  fisher: -65,
  worker: -61,
  streamer: -64,
  astronomer: -60,
  photographer: -64,
};

// ───────── 칠하기 도구 ─────────

const lineCache = new Map();
/** 외곽선 색: 같은 계열의 어두운 색. 흰 옷은 차가운 연보라 선. */
function ln(c) {
  let v = lineCache.get(c);
  if (!v) {
    const n = parseInt(c.slice(1), 16);
    const l = 0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255);
    v = l > 236 ? WHITE_LINE : edge(c, l > 200 ? 0.45 : 0.55);
    lineCache.set(c, v);
  }
  return v;
}

/** 공 모양 면(뒤집힌 좌표에서도 빛이 화면 왼쪽 위에서 온다). */
function orb(ctx, x, y, r, base, lw = 1.8, light = 0.4, dark = 0.28) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(r, 0.01), 0, TAU);
  const g = ctx.createRadialGradient(x + LX * r * 0.38, y - r * 0.42, r * 0.05, x, y, r * 1.05);
  g.addColorStop(0, tone(base, light));
  g.addColorStop(0.55, base);
  g.addColorStop(1, tone(base, -dark));
  ctx.fillStyle = g;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = ln(base);
    ctx.stroke();
  }
}

/** 방금 만든 경로를 상자(x0..x1, y0..y1)의 왼쪽 위 → 오른쪽 아래로 입체 칠한다. */
function fill(ctx, base, x0, y0, x1, y1, o = {}) {
  const opt = { lw: 1.7, line: ln(base), ...o };
  if (LX < 0) shade(ctx, base, x0, y0, x1, y1, opt);
  else shade(ctx, base, x1, y0, x0, y1, opt);
}

/** 반짝임(왼쪽 위). x 는 이미 LX 를 곱한 값. */
function shine(ctx, x, y, rx, ry, a = 0.6) {
  gloss(ctx, x, y, rx, ry, 0.5 * LX, a);
}

function trace(ctx, pts, dx = 0, dy = 0) {
  ctx.beginPath();
  ctx.moveTo(pts[0] + dx, pts[1] + dy);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] + dx, pts[i + 1] + dy);
}

/** 굵은 팔다리: 겉선 → 속 → 빛 받는 쪽 한 줄. pts = [x0,y0, x1,y1, ...] */
function limb(ctx, pts, color, w) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  trace(ctx, pts);
  ctx.lineWidth = w + 3.2;
  ctx.strokeStyle = ln(color);
  ctx.stroke();
  ctx.lineWidth = w;
  ctx.strokeStyle = color;
  ctx.stroke();
  trace(ctx, pts, LX * w * 0.17, -w * 0.17);
  ctx.lineWidth = w * 0.36;
  ctx.strokeStyle = tone(color, 0.3);
  ctx.stroke();
}

/** 가는 막대(낚싯대·손잡이). */
function stick(ctx, x0, y0, x1, y1, color, w) {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineWidth = w + 1.6;
  ctx.strokeStyle = ln(color);
  ctx.stroke();
  ctx.lineWidth = w;
  ctx.strokeStyle = color;
  ctx.stroke();
}

/** 몸통: 어깨는 좁고 아래가 넓은 둥근 사다리꼴. */
function torsoPath(ctx, tw, bw, top, bot) {
  const r = 4;
  const mid = (top + bot) / 2 + 2;
  ctx.beginPath();
  ctx.moveTo(-tw + r, top);
  ctx.lineTo(tw - r, top);
  ctx.quadraticCurveTo(tw, top, tw + 0.4, top + r);
  ctx.quadraticCurveTo(bw + 1.2, mid, bw, bot - r);
  ctx.quadraticCurveTo(bw, bot, bw - r, bot);
  ctx.lineTo(-bw + r, bot);
  ctx.quadraticCurveTo(-bw, bot, -bw, bot - r);
  ctx.quadraticCurveTo(-bw - 1.2, mid, -tw - 0.4, top + r);
  ctx.quadraticCurveTo(-tw, top, -tw + r, top);
  ctx.closePath();
}

const smooth = (k) => k * k * (3 - 2 * k);

/** 머리 좌표(머리 중심 기준, 고개 젖힘 tilt) → 엉덩이 좌표. */
function fromHead(x, y, tilt) {
  const c = Math.cos(-tilt);
  const s = Math.sin(-tilt);
  return [x * c - y * s, HEAD_Y + x * s + y * c];
}

// ───────── 얼굴 ─────────

/**
 * 얼굴. (x, y) = 두 눈 사이, k = 크기.
 * f.mode: walk | look | shock | wave
 */
function face(ctx, x, y, k, f) {
  const m = f.mode;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // 볼
  ctx.fillStyle = withAlpha(P.cheek, 0.45);
  ellipse(ctx, -5.7, 4.5, 2.7, 1.8);
  ctx.fill();
  ellipse(ctx, 6.1, 4.5, 2.4, 1.8);
  ctx.fill();
  if (f.extra === 'freckles') {
    ctx.fillStyle = withAlpha(tone(f.skin, -0.45), 0.7);
    for (const [fx, fy] of [[-6.6, 3.6], [-5, 4.2], [-6, 5.2], [5.4, 3.7], [6.9, 4.3]]) {
      circle(ctx, fx, fy, 0.45);
      ctx.fill();
    }
  }
  // 눈
  const ey = -1.1 * f.look;
  for (const dx of [-3.9, 3.9]) {
    if (m === 'wave') {
      ctx.beginPath();
      ctx.arc(dx, 1.4, 2, Math.PI * 1.15, Math.PI * 1.85);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = P.ink;
      ctx.stroke();
    } else if (m === 'gasp') {
      // 휘둥그레진 눈
      ellipse(ctx, dx, ey - 0.2, 2.6, 3.1);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = P.ink;
      ctx.stroke();
      circle(ctx, dx + 0.3, ey - 0.6, 1.4);
      ctx.fillStyle = P.ink;
      ctx.fill();
    } else if (f.blink && m !== 'shock') {
      ctx.beginPath();
      ctx.moveTo(dx - 1.9, 0.4);
      ctx.quadraticCurveTo(dx, 1.5, dx + 1.9, 0.4);
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = P.ink;
      ctx.stroke();
    } else {
      const b = m === 'shock' ? 1.15 : 1;
      ellipse(ctx, dx, ey, 2.05 * b, 2.75 * b);
      ctx.fillStyle = P.ink;
      ctx.fill();
      circle(ctx, dx + LX * 0.65 * b, ey - 1.1 * b, 0.85 * b);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }
  // 눈썹
  const by = -4.8 + (m === 'look' ? -1.1 : 0) + (m === 'wave' ? -0.6 : 0) + (m === 'gasp' ? -1.6 : 0);
  ctx.strokeStyle = f.brow;
  ctx.lineWidth = 1.7;
  for (let i = 0; i < 2; i++) {
    const dx = i === 0 ? -3.9 : 3.9;
    const inner = i === 0 ? 1 : -1;
    ctx.beginPath();
    if (m === 'shock') {
      ctx.moveTo(dx - inner * 2.2, by - 1.3);
      ctx.lineTo(dx + inner * 2.0, by + 1.1);
    } else {
      ctx.moveTo(dx - 2, by + 0.5);
      ctx.quadraticCurveTo(dx, by - (m === 'look' || m === 'gasp' ? 1.4 : 0.8), dx + 2, by + 0.5);
    }
    ctx.stroke();
  }
  // 코
  if (f.extra !== 'beard') {
    const nr = f.extra === 'mustache' ? 2.5 : 1.5;
    orb(ctx, 1.2, 3 + (f.extra === 'mustache' ? 0.4 : 0), nr, tone(f.skin, -0.04), 1, 0.35, 0.2);
  }
  // 입
  const mx = 0.5;
  const my = f.extra === 'mustache' || f.extra === 'beard' ? 8 : 6.6;
  if (m === 'shock') {
    ctx.beginPath();
    ctx.moveTo(mx - 3, my - 1.3);
    ctx.quadraticCurveTo(mx, my - 2.1, mx + 3, my - 1.3);
    ctx.quadraticCurveTo(mx + 2.8, my + 3.4, mx, my + 3.6);
    ctx.quadraticCurveTo(mx - 2.8, my + 3.4, mx - 3, my - 1.3);
    ctx.closePath();
    ctx.fillStyle = MOUTH;
    ctx.fill();
    ellipse(ctx, mx + 0.3, my + 2.3, 1.7, 1);
    ctx.fillStyle = TONGUE;
    ctx.fill();
  } else if (m === 'wave') {
    ctx.beginPath();
    ctx.moveTo(mx - 2.8, my - 0.8);
    ctx.quadraticCurveTo(mx, my - 0.2, mx + 2.8, my - 0.8);
    ctx.quadraticCurveTo(mx + 2.4, my + 2.8, mx, my + 2.9);
    ctx.quadraticCurveTo(mx - 2.4, my + 2.8, mx - 2.8, my - 0.8);
    ctx.closePath();
    ctx.fillStyle = MOUTH;
    ctx.fill();
    ellipse(ctx, mx + 0.2, my + 1.8, 1.4, 0.8);
    ctx.fillStyle = TONGUE;
    ctx.fill();
  } else if (m === 'gasp') {
    ellipse(ctx, mx, my + 0.8, 1.9, 2.5);
    ctx.fillStyle = MOUTH;
    ctx.fill();
  } else if (m === 'look') {
    ellipse(ctx, mx, my + 0.4, 1.25, 1.6);
    ctx.fillStyle = MOUTH;
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(mx - 1.8, my);
    ctx.quadraticCurveTo(mx, my + 1.4, mx + 1.8, my);
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = MOUTH;
    ctx.stroke();
  }
  // 콧수염
  if (f.extra === 'mustache' || f.extra === 'beard') {
    const c = f.extra === 'beard' ? f.hair : '#5a3522';
    const sx = 1.1;
    const sy = 5.4;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 1.5);
    ctx.bezierCurveTo(sx + 3, sy - 3.4, sx + 7.6, sy - 1.6, sx + 6.6, sy + 2.6);
    ctx.bezierCurveTo(sx + 5, sy + 0.7, sx + 2.6, sy + 1.4, sx, sy + 0.6);
    ctx.bezierCurveTo(sx - 2.6, sy + 1.4, sx - 5, sy + 0.7, sx - 6.6, sy + 2.6);
    ctx.bezierCurveTo(sx - 7.6, sy - 1.6, sx - 3, sy - 3.4, sx, sy - 1.5);
    ctx.closePath();
    fill(ctx, c, sx - 7, sy - 3, sx + 7, sy + 3, { lw: 1.2 });
    if (f.extra === 'beard') orb(ctx, 1.4, 3, 1.6, tone(f.skin, -0.04), 1, 0.35, 0.2);
  }
  // 안경
  if (f.extra === 'glasses') {
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = P.navy;
    for (const dx of [-3.9, 3.9]) {
      circle(ctx, dx, ey + 0.1, 3.4);
      ctx.fillStyle = 'rgba(220,240,255,0.28)';
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-0.5, ey - 0.3);
    ctx.quadraticCurveTo(0, ey - 1.2, 0.5, ey - 0.3);
    ctx.moveTo(-7.3, ey - 0.4);
    ctx.lineTo(-12.4, 0.2);
    ctx.stroke();
  }
  ctx.restore();
}

// ───────── 머리카락과 모자(머리 중심 기준, 반지름 13) ─────────

/** 짧은 머리 덮개: 정수리·뒤통수를 덮고 이마에 앞머리. */
function hairCap(ctx, color, { r = 13.7, fringe = -6.4, nape = 6.5, a1 = 1.95 } = {}) {
  ctx.beginPath();
  ctx.moveTo(-11.2, nape);
  ctx.arc(0, 0, r, Math.PI * 0.8, Math.PI * a1);
  ctx.quadraticCurveTo(9.6, fringe + 0.2, 4.6, fringe);
  ctx.quadraticCurveTo(-1, fringe - 1.2, -4.4, fringe + 2.6);
  ctx.quadraticCurveTo(-6.8, -1.2, -7.1, 3.6);
  ctx.lineTo(-8.6, nape);
  ctx.closePath();
  fill(ctx, color, -r, -r, r, nape, { lw: 1.7 });
}

function ear(ctx, skin) {
  ellipse(ctx, -10.8, 2.6, 2.2, 2.8);
  fill(ctx, skin, -13, -0.5, -8.6, 5.6, { lw: 1.3 });
  ctx.beginPath();
  ctx.arc(-10.6, 2.8, 1.1, Math.PI * 0.6, Math.PI * 1.5);
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = tone(skin, -0.3);
  ctx.stroke();
}

/** 뒤에 오는 머리(머리통보다 먼저 그린다). */
function backHair(ctx, L, p) {
  switch (L.head) {
    case 'bonnet': {
      // 보닛 밑으로 내려오는 갈색 머리(뒤쪽)
      ellipse(ctx, -7.4, 4.6, 7.8, 9.6, 0.15);
      fill(ctx, L.hair, -15, -5, 0, 14, { lw: 1.6 });
      break;
    }
    case 'ponytail': {
      const sw = Math.sin(p.t * 9) * 0.22 * p.walk + Math.sin(p.t * 2.2) * 0.05;
      ctx.save();
      ctx.translate(-10.5, -6.5);
      ctx.rotate(0.35 + sw);
      ctx.beginPath();
      ctx.moveTo(0, -3.2);
      ctx.bezierCurveTo(-7.5, -2.5, -9.5, 8, -5.5, 14.5);
      ctx.bezierCurveTo(-4, 9, -1, 5, 2.6, 2.6);
      ctx.closePath();
      fill(ctx, L.hair, -9, -3, 3, 15, { lw: 1.6 });
      ctx.restore();
      break;
    }
    case 'buns': {
      orb(ctx, -7.8, -10.6, 5, L.hair, 1.6);
      orb(ctx, 6.6, -12.2, 5, L.hair, 1.6);
      break;
    }
  }
}

function frontHair(ctx, L, skin) {
  switch (L.head) {
    case 'straw':
      hairCap(ctx, L.hair, { fringe: -6.6 });
      ear(ctx, skin);
      // 구레나룻
      ctx.beginPath();
      ctx.moveTo(-7.2, -1);
      ctx.quadraticCurveTo(-6.4, 3, -7.6, 6);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = L.hair;
      ctx.stroke();
      break;
    case 'bonnet':
      hairCap(ctx, L.hair, { r: 13.3, fringe: -5.8 });
      break;
    case 'ponytail':
      hairCap(ctx, L.hair, { fringe: -6.2 });
      ear(ctx, skin);
      rrect(ctx, -13.4, -9.5, 4.6, 4.6, 2);
      fill(ctx, P.yellow, -13.4, -9.5, -8.8, -4.9, { lw: 1.2 });
      shine(ctx, LX * 5, -9.5, 3.4, 1.4, 0.35);
      break;
    case 'beanie':
      hairCap(ctx, L.hair, { fringe: -5.6 });
      ear(ctx, skin);
      break;
    case 'bucket':
      hairCap(ctx, L.hair, { fringe: -7 });
      ear(ctx, skin);
      break;
    case 'neat':
      hairCap(ctx, L.hair, { r: 14.3, fringe: -7.2, a1: 1.97 });
      ear(ctx, skin);
      ctx.beginPath();
      ctx.moveTo(-3.4, -13.4);
      ctx.quadraticCurveTo(-2, -10, 1.4, -7.8);
      ctx.lineWidth = 1;
      ctx.strokeStyle = tone(L.hair, 0.3);
      ctx.stroke();
      shine(ctx, LX * 4.6, -10.4, 3.6, 1.5, 0.35);
      break;
    case 'buns':
      hairCap(ctx, L.hair, { fringe: -6 });
      ear(ctx, skin);
      shine(ctx, LX * 4.6, -9.8, 3.4, 1.4, 0.3);
      break;
    case 'bald': {
      // 옆머리와 정수리의 작은 꼬불
      ctx.beginPath();
      for (const [x, y, r] of [[-11.8, -2, 3.1], [-12, 3.2, 2.7], [-9.4, -6.2, 2.5], [9.4, -6.6, 1.9]]) {
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, TAU);
      }
      ctx.lineWidth = 3;
      ctx.strokeStyle = ln(L.hair);
      ctx.stroke();
      fill(ctx, L.hair, -15, -9, 11, 6, { lw: 0 });
      ear(ctx, skin);
      ctx.beginPath();
      ctx.moveTo(0.5, -12.6);
      ctx.quadraticCurveTo(-1.5, -16.8, 2.8, -16.4);
      ctx.quadraticCurveTo(0.8, -15.2, 2.4, -12.8);
      ctx.closePath();
      fill(ctx, L.hair, -1.5, -17, 3, -12.5, { lw: 1.1 });
      shine(ctx, LX * 4, -8.6, 4.4, 2.2, 0.55);
      break;
    }
    case 'beret': {
      // 어깨까지 오는 곱슬 단발
      ctx.beginPath();
      ctx.moveTo(-6, 8);
      ctx.arc(0, 0, 14, Math.PI * 0.62, Math.PI * 1.95);
      ctx.quadraticCurveTo(9.6, -6, 4.6, -6.4);
      ctx.quadraticCurveTo(-1, -7.6, -4.4, -3.8);
      ctx.quadraticCurveTo(-6.6, 0, -6.4, 4);
      ctx.closePath();
      fill(ctx, L.hair, -14, -14, 14, 12, { lw: 1.7 });
      for (const [x, y, r] of [[-12.6, 6.6, 2.6], [-8.4, 10.4, 2.4]]) orb(ctx, x, y, r, L.hair, 1.2);
      ear(ctx, skin);
      shine(ctx, LX * 5, -10, 3.4, 1.4, 0.3);
      break;
    }
  }
}

function hat(ctx, L, p) {
  switch (L.head) {
    case 'straw': {
      const S = '#f2d27e';
      // 챙
      ellipse(ctx, 0.6, -9.6, 19.6, 5.2, LX * 0.04);
      fill(ctx, S, -19, -15, 20, -4.4, { lw: 1.7, light: 0.3 });
      ctx.beginPath();
      ctx.ellipse(0.6, -9.6, 15.5, 3.7, LX * 0.04, Math.PI * 0.1, Math.PI * 0.9);
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = tone(S, -0.2);
      ctx.stroke();
      // 모자 머리
      ctx.beginPath();
      ctx.moveTo(-9.8, -10.2);
      ctx.bezierCurveTo(-10.6, -22.6, 10.6, -23.2, 10.2, -10.6);
      ctx.quadraticCurveTo(0, -8.4, -9.8, -10.2);
      ctx.closePath();
      fill(ctx, S, -10, -22, 10, -9, { lw: 1.7, light: 0.32 });
      // 띠
      ctx.beginPath();
      ctx.moveTo(-9.8, -10.2);
      ctx.lineTo(-10, -13.4);
      ctx.quadraticCurveTo(0, -11.4, 10.2, -13.8);
      ctx.lineTo(10.2, -10.6);
      ctx.quadraticCurveTo(0, -8.4, -9.8, -10.2);
      ctx.closePath();
      fill(ctx, '#a35a34', -10, -14, 10, -9, { lw: 1.2 });
      shine(ctx, LX * 4, -18.6, 3.6, 1.8, 0.45);
      break;
    }
    case 'bonnet': {
      const B = '#fbf8f2';
      ctx.save();
      ctx.beginPath();
      ctx.rect(-20, -22, 40, 28.5);
      ctx.clip();
      ctx.beginPath();
      ctx.arc(-1.2, -1.6, 15.8, 0, TAU);
      ctx.moveTo(4 + 10.6, 2.2);
      ctx.arc(4, 2.2, 10.6, 0, TAU, true);
      fill(ctx, B, -17, -17, 14, 6, { lw: 1.7 });
      ctx.restore();
      // 얼굴 둘레 주름 장식
      ctx.beginPath();
      ctx.arc(4, 2.2, 10.9, Math.PI * 0.9, Math.PI * 1.97);
      ctx.lineCap = 'round';
      ctx.lineWidth = 4.4;
      ctx.strokeStyle = WHITE_LINE;
      ctx.stroke();
      ctx.lineWidth = 2.8;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      // 빨간 리본
      ctx.save();
      ctx.translate(-8.6, -11.4);
      for (const s of [-1, 1]) {
        ellipse(ctx, s * 3.2, 0, 3.4, 2.2, s * 0.5);
        fill(ctx, P.red, -6, -3, 6, 3, { lw: 1.3 });
      }
      orb(ctx, 0, 0, 1.8, P.red, 1.2);
      ctx.restore();
      break;
    }
    case 'beanie': {
      const B = P.orange;
      ctx.beginPath();
      ctx.moveTo(-13.6, -4.4);
      ctx.bezierCurveTo(-14.6, -18.6, 14.4, -19.4, 13.8, -4.6);
      ctx.closePath();
      fill(ctx, B, -14, -17, 14, -4, { lw: 1.7 });
      // 골지
      ctx.strokeStyle = withAlpha(tone(B, -0.3), 0.5);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (const x of [-7, -2, 3, 8]) {
        ctx.moveTo(x, -9);
        ctx.quadraticCurveTo(x * 0.9, -13, x * 0.6, -15.4);
      }
      ctx.stroke();
      // 접은 단
      rrect(ctx, -14.4, -9.4, 28.8, 5.6, 2.8);
      fill(ctx, P.cream, -14, -9.4, 14, -3.8, { lw: 1.5 });
      ctx.strokeStyle = withAlpha(tone(P.cream, -0.25), 0.7);
      ctx.beginPath();
      for (let x = -12; x <= 12; x += 3) {
        ctx.moveTo(x, -8.4);
        ctx.lineTo(x, -4.8);
      }
      ctx.stroke();
      orb(ctx, -0.6, -17, 4.2, P.cream, 1.5);
      break;
    }
    case 'bucket': {
      const H = '#8f9a52';
      ellipse(ctx, 0.4, -6.8, 16, 4.6);
      fill(ctx, H, -16, -11, 16, -2, { lw: 1.7 });
      ctx.beginPath();
      ctx.moveTo(-9.6, -7.6);
      ctx.lineTo(-8.2, -17);
      ctx.quadraticCurveTo(0.6, -19.4, 9, -17.2);
      ctx.lineTo(10.4, -7.8);
      ctx.quadraticCurveTo(0.4, -5.4, -9.6, -7.6);
      ctx.closePath();
      fill(ctx, H, -10, -19, 10, -6, { lw: 1.7, light: 0.28 });
      ctx.beginPath();
      ctx.moveTo(-9.4, -8.2);
      ctx.lineTo(-9.1, -10.6);
      ctx.quadraticCurveTo(0.5, -8.6, 10.1, -10.8);
      ctx.lineTo(10.3, -8.4);
      ctx.quadraticCurveTo(0.4, -6, -9.4, -8.2);
      ctx.closePath();
      fill(ctx, tone(H, -0.3), -9, -11, 10, -6, { lw: 1 });
      // 낚시 찌 장식
      orb(ctx, 6, -10.2, 1.7, P.red, 1);
      break;
    }
    case 'beret': {
      ctx.beginPath();
      ctx.ellipse(-2.4, -11.4, 12.6, 5.6, LX * 0.18 + 0.02, 0, TAU);
      fill(ctx, P.red, -15, -17, 10, -6, { lw: 1.7, light: 0.3 });
      stick(ctx, -2.6, -16.6, -2.2, -19, tone(P.red, -0.2), 1.6);
      shine(ctx, -2.4 + LX * 5, -14, 3.4, 1.4, 0.4);
      break;
    }
    case 'aviator': {
      const C = '#9a5a34';
      ctx.beginPath();
      ctx.moveTo(-11.4, 7);
      ctx.arc(0, 0, 13.6, Math.PI * 0.78, Math.PI * 1.96);
      ctx.quadraticCurveTo(6, -8.6, -2, -6.4);
      ctx.quadraticCurveTo(-6.6, -4, -6.8, 4.2);
      ctx.quadraticCurveTo(-7.4, 8, -11.4, 7);
      ctx.closePath();
      fill(ctx, C, -13, -13, 13, 8, { lw: 1.7 });
      // 고글
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = tone(C, -0.35);
      ctx.beginPath();
      ctx.arc(0, 0, 13.4, Math.PI * 1.08, Math.PI * 1.5);
      ctx.stroke();
      for (const [x, y] of [[0.8, -9.8], [7.2, -8.6]]) {
        orb(ctx, x, y, 3.3, METAL, 1.3);
        circle(ctx, x + 0.2, y + 0.2, 2.1);
        ctx.fillStyle = '#6fd8f2';
        ctx.fill();
        shine(ctx, x + LX * 0.8, y - 0.8, 0.9, 0.6, 0.8);
      }
      break;
    }
  }
}

/** 수염(어부): 턱을 덮는 흰 털 뭉치. 얼굴보다 먼저 그린다. */
function beard(ctx, color) {
  const blobs = [[-6, 6.6, 3.6], [-2, 10.2, 4.4], [3.4, 11.8, 4.8], [8.4, 9.8, 4.2], [11.2, 5.2, 3]];
  ctx.beginPath();
  for (const [x, y, r] of blobs) {
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = ln(color);
  ctx.stroke();
  fill(ctx, color, -9, 3, 14, 16, { lw: 0, dark: 0.25 });
}

/** 머리 전체(머리 중심 기준). */
function head(ctx, L, p, mode) {
  const skin = P.skin[L.skin];
  backHair(ctx, L, p);
  orb(ctx, 0, 0, HEAD_R, skin, 1.7, 0.32, 0.2);
  frontHair(ctx, L, skin);
  if (L.face === 'beard') beard(ctx, L.hair);
  face(ctx, FACE_X, FACE_Y - (mode === 'look' ? 1.6 : 0), L.head === 'bonnet' ? 1.06 : 1, {
    mode,
    look: mode === 'look' ? 1 : 0,
    blink: p.t % 3.7 < 0.12,
    brow: L.face === 'beard' ? '#c9c2d8' : tone(L.hair, -0.3),
    skin,
    hair: L.hair,
    extra: L.face,
  });
  hat(ctx, L, p);
}

// ───────── 들고 다니는 것 ─────────

/** 잠자리채: (x, y) 를 쥐고 각도 a 로 든다. 흰 그물 주머니가 아래로 처진다. */
function net(ctx, x, y, a) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  stick(ctx, -4, 0, 23, 0, P.wood, 2);
  const x0 = 22;
  const len = 20;
  const w = 9;
  // 그물 주머니(테 아래로 처진 원뿔)
  const tip = [x0 + len * 0.42, w + 11];
  const bag = () => {
    ctx.beginPath();
    ctx.moveTo(x0 + 1, 1.5);
    ctx.quadraticCurveTo(x0 + 1, tip[1] - 3, tip[0], tip[1]);
    ctx.quadraticCurveTo(x0 + len + 1, tip[1] - 6, x0 + len, 0);
    ctx.closePath();
  };
  bag();
  ctx.fillStyle = 'rgba(214,222,248,0.5)';
  ctx.fill();
  ctx.beginPath();
  for (let i = 1; i < 6; i++) {
    const k = i / 6;
    ctx.moveTo(x0 + len * k, Math.sin(k * Math.PI) * w * 0.9);
    ctx.lineTo(tip[0], tip[1]);
  }
  for (const k of [0.35, 0.68]) {
    ctx.moveTo(lerp(x0 + 1, tip[0], k), lerp(1.5, tip[1], k));
    ctx.quadraticCurveTo(lerp(x0 + len * 0.5, tip[0], k), lerp(w, tip[1], k) + 1.5, lerp(x0 + len, tip[0], k), lerp(0, tip[1], k));
  }
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.stroke();
  bag();
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.stroke();
  // 물방울 모양 테
  const mesh = (x1, y1, x2, y2, gap) => {
    const h = y2 - y1;
    ctx.beginPath();
    for (let i = x1 - h; i <= x2; i += gap) {
      ctx.moveTo(i, y1);
      ctx.lineTo(i + h, y2);
      ctx.moveTo(i + h, y1);
      ctx.lineTo(i, y2);
    }
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.stroke();
  };
  const hoop = () => {
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.bezierCurveTo(x0 + 3, -w * 1.25, x0 + len + 2, -w * 1.15, x0 + len, 0);
    ctx.bezierCurveTo(x0 + len + 2, w * 1.15, x0 + 3, w * 1.25, x0, 0);
    ctx.closePath();
  };
  hoop();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fill();
  ctx.save();
  ctx.clip();
  mesh(x0, -w, x0 + len, w, 4);
  ctx.restore();
  hoop();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = '#5a3a2a';
  ctx.stroke();
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = '#b08458';
  ctx.stroke();
  ctx.restore();
}

/** 쇠스랑(농부, 뒷손). */
function pitchfork(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.3);
  stick(ctx, 0, 9, 0, -30, P.wood, 2.2);
  ctx.beginPath();
  ctx.moveTo(-4.4, -36.5);
  ctx.lineTo(-4.4, -31.2);
  ctx.quadraticCurveTo(-4.4, -29.5, 0, -29.5);
  ctx.quadraticCurveTo(4.4, -29.5, 4.4, -31.2);
  ctx.lineTo(4.4, -36.5);
  ctx.moveTo(0, -29.5);
  ctx.lineTo(0, -37.5);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = ln(METAL);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = METAL;
  ctx.stroke();
  ctx.restore();
}

/** 김이 나는 머그(캠핑족, 뒷손). */
function mug(ctx, x, y, t, steam) {
  const M = P.red;
  ctx.beginPath();
  ctx.arc(x - 3.8, y - 4, 2.4, 0, TAU);
  ctx.lineWidth = 2.8;
  ctx.strokeStyle = ln(M);
  ctx.stroke();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = M;
  ctx.stroke();
  rrect(ctx, x - 3.6, y - 8, 7.4, 8, 1.8);
  fill(ctx, M, x - 3.6, y - 8, x + 3.8, y, { lw: 1.5, light: 0.32 });
  ellipse(ctx, x + 0.1, y - 7.8, 3.5, 1.1);
  fill(ctx, '#ffffff', x - 3.5, y - 9, x + 3.6, y - 6.7, { lw: 1 });
  circle(ctx, x + 1.5, y - 3.2, 0.8);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fill();
  if (steam > 0) {
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    for (const [dx, ph] of [[-1.2, 0], [1.6, 1.7]]) {
      const k = (t * 0.9 + ph * 0.3) % 1;
      ctx.beginPath();
      ctx.moveTo(x + dx, y - 10);
      ctx.bezierCurveTo(x + dx + 2.4, y - 12.5, x + dx - 2.4, y - 14.5, x + dx + Math.sin(t * 3 + ph) * 1.2, y - 17);
      ctx.strokeStyle = `rgba(255,255,255,${(0.75 * steam * (1 - k * 0.5)).toFixed(2)})`;
      ctx.stroke();
    }
  }
}

/** 낚싯대(어부, 뒷손으로 어깨에 메고 다닌다). */
function rod(ctx, x, y, t) {
  const dx = -0.5;
  const dy = -0.866;
  const tip = [x + dx * 44, y + dy * 44];
  stick(ctx, x - dx * 4, y - dy * 4, x + dx * 22, y + dy * 22, '#6b4428', 2.2);
  stick(ctx, x + dx * 22, y + dy * 22, tip[0], tip[1], '#6b4428', 1.2);
  // 낚싯줄과 찌
  const by = tip[1] + 21 + Math.sin(t * 2.4) * 1.2;
  const bx = tip[0] - 2 + Math.sin(t * 1.7) * 1.4;
  ctx.beginPath();
  ctx.moveTo(tip[0], tip[1]);
  ctx.quadraticCurveTo(tip[0] - 1, tip[1] + 10, bx, by - 2);
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.arc(bx, by, 2.4, 0, TAU);
  ctx.clip();
  ctx.fillStyle = P.red;
  ctx.fillRect(bx - 3, by - 3, 6, 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bx - 3, by, 6, 3);
  ctx.restore();
  circle(ctx, bx, by, 2.4);
  ctx.lineWidth = 1;
  ctx.strokeStyle = edge(P.red);
  ctx.stroke();
  // 릴
  orb(ctx, x + 1.6, y + 1.2, 2.3, METAL, 1.1);
}

/** 서류 가방(회사원, 뒷손). */
function briefcase(ctx, x, y) {
  const B = '#8a5634';
  ctx.beginPath();
  ctx.arc(x, y + 1.6, 2.6, Math.PI, TAU);
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = ln(B);
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = B;
  ctx.stroke();
  rrect(ctx, x - 7, y + 1.4, 14, 10, 2);
  fill(ctx, B, x - 7, y + 1.4, x + 7, y + 11.4, { lw: 1.6, light: 0.3 });
  ctx.beginPath();
  ctx.moveTo(x - 6.6, y + 5);
  ctx.lineTo(x + 6.6, y + 5);
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = tone(B, -0.3);
  ctx.stroke();
  rrect(ctx, x - 1.5, y + 3.8, 3, 2.6, 0.6);
  fill(ctx, P.yellow, x - 1.5, y + 3.8, x + 1.5, y + 6.4, { lw: 0.8 });
}

/** 셀카봉과 휴대폰(스트리머, 뒷손). */
function selfie(ctx, x, y, look, t) {
  const a = lerp(-0.42, -0.08, look);
  const len = 27;
  const tx = x + Math.sin(a) * len;
  const ty = y - Math.cos(a) * len;
  stick(ctx, x, y + 2, tx, ty, '#3a3f6a', 1.4);
  ctx.save();
  ctx.translate(tx, ty);
  ctx.rotate(a);
  rrect(ctx, -4.2, -11, 8.4, 12, 2);
  fill(ctx, P.purple, -4.2, -11, 4.2, 1, { lw: 1.4 });
  rrect(ctx, -3, -9.8, 6, 9.6, 1.2);
  const g = ctx.createLinearGradient(0, -9.8, 0, -0.2);
  g.addColorStop(0, '#d8fbff');
  g.addColorStop(1, '#6fd8f2');
  ctx.fillStyle = g;
  ctx.fill();
  if (Math.sin(t * 5) > -0.3) {
    circle(ctx, 1.6, -8.2, 1);
    ctx.fillStyle = P.red;
    ctx.fill();
  }
  ctx.restore();
}

/** 작은 망원경. (x, y) 는 접안렌즈, a 는 방향. */
function scope(ctx, x, y, a) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  const T = '#3f5fb8';
  ctx.beginPath();
  ctx.moveTo(1, -2.2);
  ctx.lineTo(19, -3.8);
  ctx.lineTo(19, 3.8);
  ctx.lineTo(1, 2.2);
  ctx.closePath();
  fill(ctx, T, 1, -4, 19, 4, { lw: 1.5, light: 0.3 });
  rrect(ctx, 17.6, -4.8, 4.6, 9.6, 1.4);
  fill(ctx, T, 17.6, -4.8, 22.2, 4.8, { lw: 1.4, light: 0.3 });
  for (const bx of [4.5, 12]) {
    rrect(ctx, bx, -3 - bx * 0.07, 2, 6 + bx * 0.14, 0.8);
    fill(ctx, P.yellow, bx, -4, bx + 2, 4, { lw: 0.9 });
  }
  ellipse(ctx, 22.2, 0, 1.4, 4);
  fill(ctx, P.glass, 21, -4, 23.6, 4, { lw: 1 });
  rrect(ctx, -2.2, -1.6, 3.6, 3.2, 0.8);
  fill(ctx, '#2f3550', -2.2, -1.6, 1.4, 1.6, { lw: 0.8 });
  ctx.restore();
}

/** 사진기. (x, y) = 몸체 가운데. */
function camera(ctx, x, y) {
  const B = '#3a4062';
  rrect(ctx, x - 6, y - 4, 12, 8, 2);
  fill(ctx, B, x - 6, y - 4, x + 6, y + 4, { lw: 1.4, light: 0.3 });
  rrect(ctx, x - 5, y - 5.6, 4, 2.4, 0.8);
  fill(ctx, METAL, x - 5, y - 5.6, x - 1, y - 3.2, { lw: 0.9 });
  orb(ctx, x + 2, y + 0.4, 3.2, '#2a2f4a', 1.1, 0.3, 0.3);
  circle(ctx, x + 2, y + 0.4, 1.7);
  ctx.fillStyle = '#5fb8e8';
  ctx.fill();
  circle(ctx, x + 2 + LX * 0.6, y - 0.3, 0.6);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

// ───────── 몸통(엉덩이 기준) ─────────

function body(ctx, L, type) {
  switch (L.body) {
    case 'overalls': {
      torsoPath(ctx, 7.4, 9.6, -19.5, 1.5);
      fill(ctx, L.top, -10, -19.5, 10, 1.5);
      ctx.save();
      torsoPath(ctx, 7.4, 9.6, -19.5, 1.5);
      ctx.clip();
      // 허리 아래 바지 + 가슴받이
      ctx.beginPath();
      ctx.moveTo(-12, -3.5);
      ctx.lineTo(-6, -3.5);
      ctx.lineTo(-6, -12.6);
      ctx.quadraticCurveTo(0, -13.6, 6, -12.6);
      ctx.lineTo(6, -3.5);
      ctx.lineTo(12, -3.5);
      ctx.lineTo(12, 4);
      ctx.lineTo(-12, 4);
      ctx.closePath();
      fill(ctx, L.bottom, -10, -13, 10, 2, { lw: 1.4 });
      ctx.restore();
      // 멜빵
      for (const s of [-1, 1]) {
        trace(ctx, [s * 5.2, -12.4, s * 5.8, -19.2]);
        ctx.lineWidth = 3.4;
        ctx.strokeStyle = ln(L.bottom);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = L.bottom;
        ctx.stroke();
        orb(ctx, s * 5, -12, 1.2, P.yellow, 0.8);
      }
      rrect(ctx, -3, -10.4, 6, 4.4, 1);
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = tone(L.bottom, -0.3);
      ctx.stroke();
      torsoPath(ctx, 7.4, 9.6, -19.5, 1.5);
      ctx.lineWidth = 1.7;
      ctx.strokeStyle = ln(L.bottom);
      ctx.stroke();
      break;
    }
    case 'dress': {
      // 치마
      ctx.beginPath();
      ctx.moveTo(-7.4, -8);
      ctx.lineTo(7.4, -8);
      ctx.quadraticCurveTo(11, -2, 12.6, 4.6);
      ctx.quadraticCurveTo(0, 7.2, -12.6, 4.6);
      ctx.quadraticCurveTo(-11, -2, -7.4, -8);
      ctx.closePath();
      fill(ctx, L.top, -12.6, -8, 12.6, 6);
      // 윗옷
      torsoPath(ctx, 7, 7.6, -19.5, -5.5);
      fill(ctx, L.top, -8, -19.5, 8, -5.5);
      // 앞치마
      ctx.beginPath();
      ctx.moveTo(-5, -15);
      ctx.lineTo(5, -15);
      ctx.lineTo(5.2, -7);
      ctx.quadraticCurveTo(8.4, -1, 8.6, 3.6);
      ctx.quadraticCurveTo(0, 5.6, -8.6, 3.6);
      ctx.quadraticCurveTo(-8.4, -1, -5.2, -7);
      ctx.closePath();
      fill(ctx, '#fbf8f2', -8.6, -15, 8.6, 5);
      ctx.beginPath();
      ctx.moveTo(-6.6, -7.4);
      ctx.lineTo(6.6, -7.4);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = WHITE_LINE;
      ctx.stroke();
      break;
    }
    case 'hoodie':
    case 'hoodie2': {
      torsoPath(ctx, 7.6, 9.8, -19.5, 1.5);
      fill(ctx, L.top, -10, -19.5, 10, 1.5);
      // 앞주머니
      ctx.beginPath();
      ctx.moveTo(-5.6, -2);
      ctx.lineTo(-4, -7.4);
      ctx.lineTo(4, -7.4);
      ctx.lineTo(5.6, -2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = tone(L.top, -0.3);
      ctx.stroke();
      // 밑단
      ctx.beginPath();
      ctx.moveTo(-9.4, -1.4);
      ctx.lineTo(9.4, -1.4);
      ctx.stroke();
      if (L.body === 'hoodie') {
        for (const s of [-1.6, 1.8]) stick(ctx, s, -17.5, s + 0.2, -12.6, '#ffffff', 0.9);
      } else {
        // 별 무늬
        ctx.save();
        ctx.translate(0.4, -12.4);
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? 1.3 : 3;
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
        // 목에 건 헤드폰
        ctx.beginPath();
        ctx.ellipse(0, -18.8, 7.6, 2.8, 0, 0, Math.PI);
        ctx.lineWidth = 3.4;
        ctx.strokeStyle = ln(P.teal);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#5fe0c8';
        ctx.stroke();
        for (const s of [-1, 1]) orb(ctx, s * 7.8, -18.4, 3, '#5fe0c8', 1.3);
      }
      break;
    }
    case 'jacket': {
      torsoPath(ctx, 7.6, 9.8, -19.5, 1.5);
      fill(ctx, L.top, -10, -19.5, 10, 1.5);
      stick(ctx, 0.6, -16, 0.6, 1, tone(L.top, -0.25), 0.6);
      // 털 깃
      poly(ctx, [[-6, -19.6], [0.6, -19.4], [-1.6, -14.6]]);
      fill(ctx, P.cream, -6, -19.6, 0.6, -14.6, { lw: 1.1 });
      poly(ctx, [[6.8, -19.6], [0.6, -19.4], [2.8, -14.6]]);
      fill(ctx, P.cream, 0.6, -19.6, 6.8, -14.6, { lw: 1.1 });
      // 배낭끈
      for (const s of [-1, 1]) stick(ctx, s * 5.6, -18.6, s * 6.6, -5, '#6b4428', 1.6);
      // 주머니
      rrect(ctx, 2.6, -8, 4.6, 3.6, 0.8);
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = tone(L.top, -0.3);
      ctx.stroke();
      break;
    }
    case 'raincoat': {
      torsoPath(ctx, 7.6, 11, -19.5, 5);
      fill(ctx, L.top, -11, -19.5, 11, 5);
      stick(ctx, 0.8, -15.5, 1, 4.6, tone(L.top, -0.28), 0.6);
      for (const y of [-12.5, -7.5, -2.5]) orb(ctx, 2.6, y, 1, '#e08a2a', 0.7);
      // 깃
      poly(ctx, [[-6.4, -19.8], [0.8, -19.6], [-2, -15]]);
      fill(ctx, L.top, -6.4, -19.8, 0.8, -15, { lw: 1.1 });
      poly(ctx, [[7.4, -19.8], [0.8, -19.6], [3.4, -15]]);
      fill(ctx, L.top, 0.8, -19.8, 7.4, -15, { lw: 1.1 });
      break;
    }
    case 'suit': {
      torsoPath(ctx, 7.6, 9.6, -19.5, 2.5);
      fill(ctx, L.top, -10, -19.5, 10, 2.5);
      // 셔츠와 넥타이
      poly(ctx, [[-3.6, -19.5], [4.4, -19.5], [0.6, -8]]);
      fill(ctx, '#ffffff', -3.6, -19.5, 4.4, -8, { lw: 1 });
      poly(ctx, [[-0.6, -18.6], [1.8, -18.6], [2.2, -11.6], [0.6, -9.6], [-1, -11.6]]);
      fill(ctx, P.red, -1, -18.6, 2.2, -9.6, { lw: 0.9 });
      // 옷깃
      poly(ctx, [[-3.6, -19.5], [-5, -16], [-2.2, -14.6], [0.6, -8]]);
      fill(ctx, tone(L.top, -0.12), -5, -19.5, 0.6, -8, { lw: 1 });
      poly(ctx, [[4.4, -19.5], [5.8, -16], [3, -14.6], [0.6, -8]]);
      fill(ctx, tone(L.top, -0.12), 0.6, -19.5, 5.8, -8, { lw: 1 });
      for (const y of [-6, -2.4]) orb(ctx, 1.4, y, 0.9, tone(L.top, -0.35), 0);
      break;
    }
    case 'labcoat': {
      // 셔츠·넥타이가 보이는 긴 흰 가운
      torsoPath(ctx, 7.6, 11, -19.5, 6);
      fill(ctx, L.top, -11, -19.5, 11, 6, { light: 0.15, dark: 0.22 });
      poly(ctx, [[-3.2, -19.5], [4.2, -19.5], [0.6, -7.5]]);
      fill(ctx, '#a9c8f0', -3.2, -19.5, 4.2, -7.5, { lw: 1 });
      poly(ctx, [[-0.4, -18.8], [1.6, -18.8], [1.9, -12], [0.6, -10.4], [-0.7, -12]]);
      fill(ctx, P.navy, -0.7, -18.8, 1.9, -10.4, { lw: 0.8 });
      ctx.beginPath();
      ctx.moveTo(-3.2, -19.5);
      ctx.lineTo(0.6, -7.5);
      ctx.lineTo(4.2, -19.5);
      ctx.moveTo(0.6, -7.5);
      ctx.lineTo(0.9, 5.8);
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = WHITE_LINE;
      ctx.stroke();
      // 가슴 주머니와 펜
      stick(ctx, -5.4, -14.6, -5.4, -11.8, P.blue, 0.9);
      stick(ctx, -4, -14.4, -4, -11.8, P.red, 0.9);
      rrect(ctx, -6.8, -12.6, 4.6, 3.8, 0.8);
      fill(ctx, L.top, -6.8, -12.6, -2.2, -8.8, { lw: 0.9 });
      break;
    }
    case 'vest': {
      torsoPath(ctx, 7.6, 9.6, -19.5, 1.5);
      fill(ctx, L.top, -10, -19.5, 10, 1.5);
      const V = '#d9c08a';
      ctx.save();
      torsoPath(ctx, 7.6, 9.6, -19.5, 1.5);
      ctx.clip();
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * 2.6 + 0.6, -19.5);
        ctx.lineTo(s * 1.4 + 0.6, 3);
        ctx.lineTo(s * 13, 3);
        ctx.lineTo(s * 13, -19.5);
        ctx.closePath();
        fill(ctx, V, -10, -19.5, 10, 2, { lw: 1.2 });
      }
      ctx.restore();
      for (const s of [-1, 1]) {
        rrect(ctx, s * 5.4 - 2.2 + 0.4, -6.6, 4.4, 3.8, 0.8);
        fill(ctx, tone(V, -0.08), -8, -7, 8, -3, { lw: 0.9 });
      }
      torsoPath(ctx, 7.6, 9.6, -19.5, 1.5);
      ctx.lineWidth = 1.7;
      ctx.strokeStyle = ln(V);
      ctx.stroke();
      break;
    }
  }
}

/** 등 뒤에 붙는 것(몸통보다 먼저). */
function behind(ctx, L) {
  if (L.body === 'hoodie') {
    // 등 뒤 모자
    ellipse(ctx, -5.4, -19, 7.4, 4.6, 0.25);
    fill(ctx, L.top, -12, -23, 2, -15);
  }
  if (L.body === 'jacket') {
    // 큰 배낭과 그 위에 묶은 침낭
    const BP = '#c98a4a';
    rrect(ctx, -18.4, -21, 13, 22, 4.5);
    fill(ctx, BP, -18.4, -21, -5.4, 1);
    rrect(ctx, -18, -10, 4.6, 7, 1.6);
    fill(ctx, tone(BP, -0.1), -18, -10, -13.4, -3, { lw: 1 });
    ctx.save();
    ctx.translate(-13.6, -23.4);
    ctx.rotate(-0.12);
    rrect(ctx, -8.4, -3.6, 15, 7.2, 3.6);
    fill(ctx, P.blue, -8.4, -3.6, 6.6, 3.6, { lw: 1.4 });
    ellipse(ctx, -8.2, 0, 2, 3.4);
    fill(ctx, tone(P.blue, 0.2), -10, -3.4, -6, 3.4, { lw: 1 });
    ctx.restore();
  }
}

// ───────── 사람 ─────────

function person(ctx, type, p) {
  const L = LOOKS[type];
  const skin = P.skin[L.skin];
  const t = p.t;
  const walk = clamp(p.walk);
  const shock = !!p.shock;
  const wave = !shock && !!p.wave;
  const look = shock || wave ? 0 : clamp(p.look);
  const lk = smooth(look);
  const ph = t * 9;
  const hop = shock ? Math.abs(Math.sin(t * 7)) * 3.4 : 0;
  const aF = shock ? 0.2 + Math.sin(t * 14) * 0.08 : Math.sin(ph) * 0.55 * walk;
  const aB = shock ? -0.2 - Math.sin(t * 14) * 0.08 : -aF;
  const hipY = -2.6 - Math.cos(aF) * LEG - Math.abs(Math.cos(ph)) * 1.3 * walk - hop;
  const sw = -Math.sin(ph) * walk; // 팔 흔들기(앞다리와 반대)
  const tilt = shock ? 0.16 : wave ? 0.08 : lk * 0.38;
  const mode = shock ? 'shock' : wave ? 'wave' : look > 0.5 ? 'look' : 'walk';
  const sleeve = L.body === 'vest' ? L.top : L.top;
  const shortSleeve = L.sleeve === 'short' || L.sleeve === 'puff';

  groundShadow(ctx, 0, 0.6, 14 - hop * 0.7, 3.4, 0.24);
  if (L.item === 'leash') dog(ctx, t, walk, look, shock);

  ctx.save();
  ctx.translate(0, hipY);

  // 등 뒤
  behind(ctx, L);

  // 뒤팔과 뒷손 물건
  let be;
  let bh;
  if (L.item === 'fork') {
    be = [-10.4, -10];
    bh = [-10.6 - sw * 1.5, -6.5];
  } else if (L.item === 'leash') {
    be = [-10, -10];
    bh = [-11.6 - sw * 2, -5.4];
  } else if (L.item === 'mug') {
    be = [-12, -9.4];
    bh = [-11, -10.6];
  } else if (L.item === 'rod') {
    be = [-11, -11];
    bh = [-9.6, -9];
  } else if (L.item === 'stick') {
    be = [-12.4, -12];
    bh = [-12.6, -17.6 - lk * 2];
  } else if (L.item === 'case') {
    be = [-9.8, -10.4];
    bh = [-10.6 - sw * 3.2, shock ? -6 : -4.6];
  } else if (shock) {
    const pump = Math.sin(t * 14) * 1.8;
    be = [-13.4, -13];
    bh = [-12.4, -20 + pump];
  } else {
    be = [-9.6, -10.4];
    bh = [-10.4 - sw * 3.2, -4.6];
  }
  if (L.item === 'case') briefcase(ctx, bh[0], bh[1]);
  if (L.item === 'stick') selfie(ctx, bh[0], bh[1], shock ? 0.6 : lk, t);
  if (L.item === 'fork') pitchfork(ctx, bh[0], bh[1]);
  if (L.item === 'leash') {
    // 목줄: 손 → 개 목걸이
    const dogHop = shock ? Math.abs(Math.sin(t * 9)) * 2.5 : 0;
    const cx = -19.6;
    const cy = -10.4 - dogHop - hipY;
    ctx.beginPath();
    ctx.moveTo(bh[0], bh[1]);
    ctx.quadraticCurveTo((bh[0] + cx) / 2, Math.max(bh[1], cy) + 4, cx, cy);
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = P.red;
    ctx.stroke();
  }
  const backArm = tone(L.top, -0.08);
  if (shortSleeve) {
    limb(ctx, [-SH_X, SH_Y, be[0], be[1], bh[0], bh[1]], tone(skin, -0.06), 4.6);
    limb(ctx, [-SH_X, SH_Y, lerp(-SH_X, be[0], 0.55), lerp(SH_Y, be[1], 0.55)], backArm, L.sleeve === 'puff' ? 6.4 : 5.4);
  } else {
    limb(ctx, [-SH_X, SH_Y, be[0], be[1], bh[0], bh[1]], backArm, 5);
  }
  if (L.item === 'rod') rod(ctx, bh[0], bh[1], t);
  if (L.item === 'mug') mug(ctx, bh[0] + 0.4, bh[1] - 1, t, 1 - lk * 0.6);
  if (L.item === 'scope' && shock) scope(ctx, bh[0] - 5, bh[1] + 2, 0.3);
  orb(ctx, bh[0], bh[1], 2.9, tone(skin, -0.06), 1.4);

  // 다리와 신발
  const legs = [
    [-3.7, aB, true],
    [3.7, aF, false],
  ];
  for (const [x, a, back] of legs) {
    const ax = x + Math.sin(a) * LEG;
    const ay = Math.cos(a) * LEG;
    const k = back ? -0.08 : 0;
    const legColor = L.bottom || skin;
    limb(ctx, [x, -1, ax, ay], tone(legColor, k), 5.6);
    if (L.body === 'dress') limb(ctx, [lerp(x, ax, 0.5), ay * 0.55, ax, ay], tone('#ffffff', k), 5.4);
    if (L.body === 'raincoat') limb(ctx, [lerp(x, ax, 0.4), ay * 0.4, ax, ay], tone(L.shoe, k), 6.6);
    ellipse(ctx, ax + 1.5, ay + 0.4, 4.5, 2.7);
    fill(ctx, tone(L.shoe, k), ax - 3, ay - 2.4, ax + 6, ay + 3.1, { lw: 1.5, light: 0.3 });
  }

  // 몸통
  body(ctx, L, type);
  if (L.item === 'camera' && (look < 0.5 || shock)) {
    ctx.beginPath();
    ctx.moveTo(-4.4, -19);
    ctx.lineTo(-2.2, -11);
    ctx.moveTo(5, -19);
    ctx.lineTo(6.4, -11);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = P.red;
    ctx.stroke();
    camera(ctx, 1.6, -8.6);
  }

  // 앞팔: 평소엔 흔들고, 올려다볼 땐 손 차양, 들켰으면 잠자리채, 진엔딩엔 손 인사
  const hangE = L.item === 'scope' ? [10.4, -10] : [9.6, -10.4];
  const hangH = L.item === 'scope' ? [11.6 + sw * 1.5, -6] : [10.4 + sw * 3.2, -4.6];
  let fe;
  let fh;
  let visor = false; // 손 차양: 팔은 머리 뒤로, 손바닥만 이마 앞에
  if (shock) {
    fe = [16.6, -21];
    fh = [16.2, -30.5];
  } else if (wave) {
    const wv = Math.sin(t * 10) * 3.4;
    fe = [16.6, -23];
    fh = [17.6 + wv, -35];
  } else {
    let le;
    let lh;
    if (L.item === 'scope') {
      lh = fromHead(FACE_X + 10, FACE_Y - 7, tilt);
      le = [15.6, -20];
    } else if (L.item === 'camera') {
      lh = fromHead(FACE_X + 9, FACE_Y + 3.4, tilt);
      le = [14.6, -16];
    } else {
      lh = fromHead(FACE_X + 9.4, FACE_Y - 7.6, tilt);
      le = [17.6, -26];
      visor = look > 0.05;
    }
    fe = [lerp(hangE[0], le[0], lk), lerp(hangE[1], le[1], lk)];
    fh = [lerp(hangH[0], lh[0], lk), lerp(hangH[1], lh[1], lk)];
  }
  const frontArm = () => {
    if (shortSleeve) {
      limb(ctx, [SH_X, SH_Y, fe[0], fe[1], fh[0], fh[1]], skin, 4.6);
      limb(ctx, [SH_X, SH_Y, lerp(SH_X, fe[0], 0.55), lerp(SH_Y, fe[1], 0.55)], sleeve, L.sleeve === 'puff' ? 6.4 : 5.4);
    } else {
      limb(ctx, [SH_X, SH_Y, fe[0], fe[1], fh[0], fh[1]], sleeve, 5);
    }
  };
  frontArm(); // 팔은 머리 뒤로 지나가고 손만 머리 앞에 온다

  // 머리
  ctx.save();
  ctx.translate(0, HEAD_Y);
  ctx.rotate(-tilt);
  head(ctx, L, p, mode);
  if (L.item === 'camera' && look >= 0.5 && !shock) camera(ctx, FACE_X + 4.4, FACE_Y + 0.6);
  ctx.restore();

  if (L.item === 'scope' && !shock) {
    if (look >= 0.5) {
      const eye = fromHead(FACE_X + 3.9, FACE_Y - 0.5, tilt);
      scope(ctx, eye[0] + 1.5, eye[1] - 0.5, -0.95 - tilt);
    } else {
      scope(ctx, fh[0] - 6, fh[1] - 3.4, 0.32);
    }
  }
  if (shock) net(ctx, fh[0], fh[1], -1.02 + Math.sin(t * 7) * 0.4);
  if (visor && look > 0.4) {
    ctx.save();
    ctx.translate(fh[0], fh[1]);
    ctx.rotate(-tilt - 0.12);
    ellipse(ctx, 1.2, 0, 4.6, 2.2);
    fill(ctx, skin, -3.4, -2.2, 5.8, 2.2, { lw: 1.4 });
    ctx.restore();
  } else {
    orb(ctx, fh[0], fh[1], wave ? 3.2 : 2.9, skin, 1.4);
  }
  ctx.restore();
}

/** 산책하는 개(시바). 원점은 산책하는 사람의 발밑, 개는 뒤쪽에 선다. */
function dog(ctx, t, walk, look, alert) {
  const F = '#e8964a';
  const W = '#fff1dc';
  const ph = t * 11;
  const hop = alert ? Math.abs(Math.sin(t * 9)) * 2.5 : 0;
  ctx.save();
  ctx.translate(-26, 0);
  groundShadow(ctx, 0, 0.5, 10.5, 2.4, 0.2);
  ctx.translate(0, -hop);
  ctx.lineCap = 'round';
  // 다리
  const legs = [[-5.6, 1], [4.4, -1], [-3.2, -1], [6.8, 1]];
  legs.forEach(([x, s], i) => {
    const a = Math.sin(ph) * 0.5 * walk * s;
    const back = i < 2;
    limb(ctx, [x, -6, x + Math.sin(a) * 5, -1.2], back ? tone(F, -0.15) : F, 2.8);
  });
  // 꼬리
  const wag = Math.sin(t * (alert ? 24 : 10)) * 0.35;
  ctx.save();
  ctx.translate(-8, -11);
  ctx.rotate(wag);
  orb(ctx, -0.6, -2.6, 3.4, F, 1.4);
  circle(ctx, -0.4, -2.4, 1.4);
  ctx.fillStyle = W;
  ctx.fill();
  ctx.restore();
  // 몸
  ellipse(ctx, 0, -8.6, 9, 5);
  fill(ctx, F, -9, -13.6, 9, -3.6, { lw: 1.6 });
  ellipse(ctx, 2.6, -6.2, 5.4, 2.2);
  ctx.fillStyle = W;
  ctx.fill();
  // 머리
  const up = alert ? -2.4 : look > 0.3 ? -1.2 : 0;
  ctx.save();
  ctx.translate(8.4, -13.6 + up);
  ctx.rotate(alert ? -0.32 : -look * 0.3);
  for (const [x, rot] of [[-3.6, -0.25], [1.6, 0.2]]) {
    ctx.save();
    ctx.translate(x, -3.6);
    ctx.rotate(rot);
    poly(ctx, [[-2.4, 1], [0, -4.6], [2.4, 1]]);
    fill(ctx, F, -2.4, -4.6, 2.4, 1, { lw: 1.3 });
    ctx.restore();
  }
  orb(ctx, 0, 0, 5.8, F, 1.6, 0.35, 0.22);
  ellipse(ctx, 3.6, 1.6, 3.4, 2.5);
  fill(ctx, W, 0.4, -1, 7, 4, { lw: 1.1 });
  circle(ctx, 6.6, 0.4, 1.3);
  ctx.fillStyle = P.ink;
  ctx.fill();
  ellipse(ctx, 1.6, -1.6, 1.05, 1.4);
  ctx.fill();
  circle(ctx, 1.6 + LX * 0.4, -2.1, 0.45);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  if (alert) {
    // 멍멍!
    const open = 0.6 + Math.abs(Math.sin(t * 12)) * 0.8;
    ctx.beginPath();
    ctx.moveTo(2.6, 3.2);
    ctx.lineTo(6.8, 2.8);
    ctx.lineTo(5.6, 3.2 + open * 2.4);
    ctx.closePath();
    ctx.fillStyle = MOUTH;
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    for (const a of [-0.55, 0, 0.55]) {
      ctx.moveTo(9.4 + Math.cos(a) * 1.5, 1 + Math.sin(a) * 4);
      ctx.lineTo(9.4 + Math.cos(a) * 4.5, 1 + Math.sin(a) * 6.5);
    }
    ctx.stroke();
  }
  ctx.restore();
  // 목걸이
  ctx.beginPath();
  ctx.ellipse(6.4, -10.6 + up * 0.5, 1.4, 3.2, 0.5, 0, TAU);
  fill(ctx, P.red, 5, -14, 8, -7, { lw: 1 });
  ctx.restore();
}

// ───────── 열기구 ─────────

/** 열기구. 원점은 바구니 바닥 가운데. */
function balloonist(ctx, p) {
  const t = p.t;
  const shock = !!p.shock;
  const wave = !shock && !!p.wave;
  const look = shock || wave ? 0 : clamp(p.look);
  const lk = smooth(look);
  const mode = shock ? 'shock' : wave ? 'wave' : look > 0.5 ? 'look' : 'walk';

  // 밧줄
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = '#8a6a4a';
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(s * 12.6, -19);
    ctx.lineTo(s * 8.2, -46);
    ctx.moveTo(s * 5, -19);
    ctx.lineTo(s * 4, -45);
  }
  ctx.stroke();

  // 풍선
  const env = () => {
    ctx.beginPath();
    ctx.moveTo(-8, -46);
    ctx.bezierCurveTo(-20, -53, -34, -65, -33.5, -81);
    ctx.bezierCurveTo(-33, -99, -18, -111, 0, -111);
    ctx.bezierCurveTo(18, -111, 33, -99, 33.5, -81);
    ctx.bezierCurveTo(34, -65, 20, -53, 8, -46);
    ctx.closePath();
  };
  env();
  ctx.fillStyle = P.red;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // 세로 줄무늬(경선): 가운데 빨강, 그다음 노랑, 바깥 빨강
  ctx.beginPath();
  ctx.ellipse(0, -80, 33.5 * 0.74, 31, 0, 0, TAU);
  ctx.moveTo(33.5 * 0.33, -80);
  ctx.ellipse(0, -80, 33.5 * 0.33, 31, 0, 0, TAU);
  ctx.fillStyle = P.yellow;
  ctx.fill('evenodd');
  ctx.beginPath();
  for (const k of [0.33, 0.74]) {
    ctx.moveTo(33.5 * k, -80);
    ctx.ellipse(0, -80, 33.5 * k, 31, 0, 0, TAU);
  }
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = withAlpha(tone(P.red, -0.4), 0.45);
  ctx.stroke();
  // 입체 그늘
  const g = ctx.createRadialGradient(LX * 13, -95, 2, 0, -80, 42);
  g.addColorStop(0, 'rgba(255,252,240,0.5)');
  g.addColorStop(0.45, 'rgba(255,252,240,0)');
  g.addColorStop(1, 'rgba(27,29,74,0.4)');
  ctx.fillStyle = g;
  ctx.fillRect(-36, -114, 72, 70);
  ctx.restore();
  env();
  ctx.lineWidth = 2;
  ctx.strokeStyle = edge(P.red);
  ctx.stroke();
  shine(ctx, LX * 15, -97, 6, 3.4, 0.55);
  // 아래 치마와 버너
  poly(ctx, [[-8.4, -47.5], [8.4, -47.5], [6.4, -42.5], [-6.4, -42.5]]);
  fill(ctx, tone(P.red, -0.15), -8.4, -47.5, 8.4, -42.5, { lw: 1.4 });
  const fl = 1 + Math.sin(t * 17) * 0.25 + Math.sin(t * 31) * 0.1;
  ctx.save();
  ctx.translate(0, -40);
  ctx.beginPath();
  ctx.moveTo(-2.6, 0);
  ctx.quadraticCurveTo(-2.4, -4 * fl, 0, -7.5 * fl);
  ctx.quadraticCurveTo(2.4, -4 * fl, 2.6, 0);
  ctx.closePath();
  ctx.fillStyle = P.orange;
  ctx.fill();
  ellipse(ctx, 0, -2, 1.2, 2.4 * fl);
  ctx.fillStyle = '#fff2ae';
  ctx.fill();
  ctx.restore();
  rrect(ctx, -3.6, -40.5, 7.2, 3.6, 1);
  fill(ctx, METAL, -3.6, -40.5, 3.6, -36.9, { lw: 1 });

  // 조종사
  const skin = P.skin[1];
  const tilt = shock ? 0.14 : wave ? 0.06 : lk * 0.36;
  const HY = -29;
  const toBody = (x, y) => {
    const c = Math.cos(-tilt);
    const s = Math.sin(-tilt);
    return [x * c * 0.8 - y * s * 0.8, HY + x * s * 0.8 + y * c * 0.8];
  };
  // 목도리 꼬리(바람에 날린다)
  const fly = Math.sin(t * 6) * 1.6;
  ctx.beginPath();
  ctx.moveTo(-4, -20);
  ctx.quadraticCurveTo(-11, -22 + fly, -17, -19 - fly);
  ctx.lineTo(-16, -15.6 - fly);
  ctx.quadraticCurveTo(-10, -18 + fly, -3, -17);
  ctx.closePath();
  fill(ctx, P.red, -17, -22, -3, -15, { lw: 1.3 });
  // 어깨
  torsoPath(ctx, 6.6, 8, -21.6, -14);
  fill(ctx, '#4f7fd0', -8, -21.6, 8, -14);
  rrect(ctx, -5.4, -22.4, 11, 3.4, 1.7);
  fill(ctx, P.red, -5.4, -22.4, 5.6, -19, { lw: 1.2 });
  // 팔: 앞팔은 머리 뒤로 지나가고 손만 머리 앞에 온다
  let fh;
  let fe;
  let palm = false;
  if (shock) {
    fe = [13.6, -24];
    fh = [14, -32];
  } else if (wave) {
    fe = [13.6, -26];
    fh = [14.6 + Math.sin(t * 10) * 3, -37];
  } else {
    const lh = toBody(FACE_X + 9.4, FACE_Y - 7.6);
    fe = [lerp(9.6, 14.6, lk), lerp(-18.6, -26, lk)];
    fh = [lerp(10.6, lh[0], lk), lerp(-19, lh[1], lk)];
    palm = look > 0.4;
  }
  limb(ctx, [-5.6, -19.6, -9.4, -18.2, -10.6, -19.2], '#4f7fd0', 4.2);
  limb(ctx, [5.8, -19.8, fe[0], fe[1], fh[0], fh[1]], '#4f7fd0', 4.2);

  // 머리
  const L = { hair: '#7a4a2e', head: 'aviator' };
  ctx.save();
  ctx.translate(0, HY);
  ctx.rotate(-tilt);
  ctx.scale(0.8, 0.8);
  orb(ctx, 0, 0, HEAD_R, skin, 1.9, 0.32, 0.2);
  face(ctx, FACE_X, FACE_Y - (mode === 'look' ? 1.6 : 0), 1, {
    mode,
    look: mode === 'look' ? 1 : 0,
    blink: t % 4.1 < 0.12,
    brow: '#5a3522',
    skin,
    hair: L.hair,
  });
  hat(ctx, L, p);
  ctx.restore();

  // 바구니
  const B = '#c98a52';
  ctx.beginPath();
  ctx.moveTo(-13, -18);
  ctx.lineTo(13, -18);
  ctx.lineTo(11.2, -2.4);
  ctx.quadraticCurveTo(11, 0, 8.6, 0);
  ctx.lineTo(-8.6, 0);
  ctx.quadraticCurveTo(-11, 0, -11.2, -2.4);
  ctx.closePath();
  fill(ctx, B, -13, -18, 13, 0, { lw: 1.8 });
  ctx.beginPath();
  for (const y of [-12, -6]) {
    ctx.moveTo(-12.3, y);
    ctx.lineTo(12.3, y);
  }
  for (let row = 0; row < 3; row++) {
    const y0 = -18 + row * 6;
    for (let x = -10 + (row % 2) * 2; x <= 10; x += 4) {
      ctx.moveTo(x, y0 + 1.4);
      ctx.lineTo(x, y0 + 4.6);
    }
  }
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = withAlpha(tone(B, -0.4), 0.6);
  ctx.stroke();
  rrect(ctx, -14.6, -20.6, 29.2, 4.8, 2.4);
  fill(ctx, '#8f5a32', -14.6, -20.6, 14.6, -15.8, { lw: 1.5, light: 0.3 });
  // 모래주머니
  stick(ctx, -12.4, -16, -14, -11.4, '#8a6a4a', 0.7);
  orb(ctx, -14.4, -9.4, 2.6, '#e8d3a0', 1.2);

  // 손: 뒷손은 바구니 테를 잡고, 앞손은 테 위나 이마 앞에
  orb(ctx, -10.6, -19.2, 2.5, skin, 1.2);
  if (shock) net(ctx, fh[0], fh[1], -1.1 + Math.sin(t * 7) * 0.45);
  if (palm) {
    ctx.save();
    ctx.translate(fh[0], fh[1]);
    ctx.rotate(-tilt - 0.12);
    ellipse(ctx, 1, 0, 3.8, 1.9);
    fill(ctx, skin, -2.6, -1.9, 5, 1.9, { lw: 1.2 });
    ctx.restore();
  } else {
    orb(ctx, fh[0], fh[1], 2.6, skin, 1.2);
  }
}

// ───────── 우주비행사 ─────────

/** 우주비행사. 원점은 몸 중심. */
function astronaut(ctx, p) {
  const t = p.t;
  const shock = !!p.shock;
  const wave = !shock && !!p.wave;
  const look = shock || wave ? 0 : clamp(p.look);
  const lk = smooth(look);
  const mode = shock ? 'gasp' : wave ? 'wave' : look > 0.5 ? 'look' : 'walk';
  const SUIT = '#f4f5fb';
  const ACC = '#ff7a5c';
  const drift = Math.sin(t * 1.4) * 0.14;

  // 생명줄
  ctx.beginPath();
  ctx.moveTo(-10, 6);
  ctx.bezierCurveTo(-30, 26, -8, 50, -44, 80);
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = withAlpha('#a3a8d2', 0.7);
  ctx.stroke();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = withAlpha('#ffffff', 0.85);
  ctx.stroke();

  ctx.save();
  ctx.rotate(drift - lk * 0.12);
  // 배낭
  rrect(ctx, -16, -8, 9, 21, 3.5);
  fill(ctx, '#d6d9ee', -16, -8, -7, 13);
  // 다리
  for (const s of [-1, 1]) {
    const a = s * 0.16 + Math.sin(t * 1.9 + s) * 0.14 + (shock ? -s * 0.2 : 0);
    const fx = s * 4.6 + Math.sin(a) * 10;
    const fy = 11 + Math.cos(a) * 10;
    limb(ctx, [s * 4.6, 10, fx, fy], s < 0 ? tone(SUIT, -0.08) : SUIT, 6.4);
    ellipse(ctx, fx + 1.2, fy + 1.6, 4.2, 3);
    fill(ctx, ACC, fx - 3, fy - 1.4, fx + 5.4, fy + 4.6, { lw: 1.4 });
  }
  // 뒤팔
  const bh = shock ? [-14, -6] : [-13.4, 8 + Math.sin(t * 1.7) * 1.5];
  limb(ctx, [-8, -1, -12.4, 3, bh[0], bh[1]], tone(SUIT, -0.08), 5.8);
  orb(ctx, bh[0], bh[1], 3.2, ACC, 1.3);
  // 몸
  torsoPath(ctx, 8.6, 10, -3.5, 12.5);
  fill(ctx, SUIT, -10, -3.5, 10, 12.5, { light: 0.15, dark: 0.25 });
  rrect(ctx, -3.6, 1, 8.6, 6.2, 1.6);
  fill(ctx, P.blue, -3.6, 1, 5, 7.2, { lw: 1.1 });
  for (const [x, c] of [[-1.4, ACC], [1, P.yellow], [3.2, '#5fe0c8']]) {
    circle(ctx, x, 3.2, 0.9);
    ctx.fillStyle = c;
    ctx.fill();
  }
  stick(ctx, -2.6, 5.6, 4, 5.6, '#9fe8ff', 0.6);
  rrect(ctx, -9.6, 9, 19.6, 3, 1.4);
  fill(ctx, '#d6d9ee', -9.6, 9, 10, 12, { lw: 1 });

  // 헬멧
  const tilt = shock ? 0.12 : wave ? 0.06 : lk * 0.3;
  ctx.save();
  ctx.translate(0, -14);
  ctx.rotate(-tilt);
  orb(ctx, 0, 0, 14, SUIT, 1.8, 0.25, 0.3);
  orb(ctx, -11.6, 1, 3.4, '#d6d9ee', 1.2);
  orb(ctx, -7.6, -11.6, 1.8, ACC, 1);
  // 유리 안의 얼굴
  const gx = 2.4;
  const gy = 0.6;
  ctx.save();
  circle(ctx, gx, gy, 10.4);
  const v = ctx.createLinearGradient(0, -10, 0, 11);
  v.addColorStop(0, '#2b3a78');
  v.addColorStop(1, '#4f6fc2');
  ctx.fillStyle = v;
  ctx.fill();
  ctx.clip();
  const skin = P.skin[2];
  orb(ctx, gx + 1, gy + 2.4, 9.4, skin, 0, 0.3, 0.2);
  ctx.beginPath();
  ctx.arc(gx + 1, gy + 2.4, 9.8, Math.PI * 1.02, Math.PI * 1.98);
  ctx.quadraticCurveTo(gx + 3, gy - 3.6, gx - 2, gy - 3);
  ctx.quadraticCurveTo(gx - 6, gy - 2.4, gx - 8.8, gy + 2.4);
  ctx.closePath();
  fill(ctx, P.hairDark, -8, -8, 10, 2, { lw: 0 });
  face(ctx, gx + 2.4, gy + 3, 0.8, {
    mode,
    look: mode === 'look' ? 1 : 0,
    blink: t % 3.3 < 0.12,
    brow: P.hairDark,
    skin,
    hair: P.hairDark,
  });
  // 유리 빛
  const gl = ctx.createLinearGradient(gx + LX * 10, gy - 10, gx - LX * 8, gy + 10);
  gl.addColorStop(0, 'rgba(159,232,255,0.45)');
  gl.addColorStop(0.5, 'rgba(159,232,255,0.08)');
  gl.addColorStop(1, 'rgba(159,232,255,0.2)');
  ctx.fillStyle = gl;
  ctx.fillRect(gx - 11, gy - 11, 22, 22);
  ctx.restore();
  circle(ctx, gx, gy, 10.4);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#a3a8d2';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(gx, gy, 7.8, LX < 0 ? Math.PI * 1.1 : Math.PI * 1.6, LX < 0 ? Math.PI * 1.4 : Math.PI * 1.9);
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.stroke();
  ctx.restore();

  // 앞팔: 가리키기 / 손 인사 / 하늘로 손 뻗기
  let fe;
  let fh;
  if (shock) {
    fe = [15, -6];
    fh = [20, -14];
  } else if (wave) {
    fe = [15, -8];
    fh = [16 + Math.sin(t * 10) * 3, -18];
  } else {
    fe = [lerp(12, 15.4, lk), lerp(4, -5, lk)];
    fh = [lerp(12.6, 18, lk), lerp(10 + Math.sin(t * 1.5) * 1.2, -13, lk)];
  }
  limb(ctx, [8, -1, fe[0], fe[1], fh[0], fh[1]], SUIT, 5.8);
  if (shock) {
    // 검지로 가리킨다
    const a = Math.atan2(fh[1] - fe[1], fh[0] - fe[0]);
    stick(ctx, fh[0], fh[1], fh[0] + Math.cos(a) * 5.4, fh[1] + Math.sin(a) * 5.4, ACC, 2);
  }
  orb(ctx, fh[0], fh[1], 3.4, ACC, 1.3);
  ctx.restore();
}

/** 지구인 한 명을 그린다. */
export function drawWatcher(ctx, type, pose) {
  const p = { t: 0, dir: 1, walk: 0, look: 0, shock: false, wave: false, ...pose };
  const dir = p.dir < 0 ? -1 : 1;
  ctx.save();
  ctx.scale(dir, 1);
  LX = -dir;
  if (type === 'balloonist') balloonist(ctx, p);
  else if (type === 'astronaut') astronaut(ctx, p);
  else if (LOOKS[type]) person(ctx, type, p);
  ctx.restore();
  LX = -1;
}

/** 머리 중심(원점 기준). 시선 원뿔이 여기서 시작한다. */
export function headOffset(type, scale = 1) {
  if (type === 'balloonist') return { x: 0, y: -29 * scale };
  if (type === 'astronaut') return { x: 0, y: -14 * scale };
  return { x: 0, y: (HEAD_Y - HIP) * scale };
}

/** 머리(모자) 꼭대기 높이. 말풍선이 이 위에 뜬다. */
export function topOffset(type, scale = 1) {
  if (type === 'balloonist') return -112 * scale;
  if (type === 'astronaut') return -30 * scale;
  return (TOPS[type] ?? -62) * scale;
}
