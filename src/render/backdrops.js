// 무대 배경 7종. 배경은 외곽선 없는 실루엣으로만 그려서, 외곽선이 있는 게임 요소가 눈에 띄게 한다.
// makeBackdrop() 은 한 번만 그리면 되는 paint 와 매 프레임 그리는 live 를 돌려준다.
import { C, TAU, circle, ellipse, rrect, poly, glow, withAlpha, mix, star } from './draw.js';
import { seededRng, rand } from '../core/rng.js';

const STAGE_SEED = { farm: 11, suburb: 23, camp: 37, city: 41, observatory: 53, cloudsea: 67, orbit: 79 };

const SKY = {
  farm: [[0, '#1b1848'], [0.45, '#3c2b74'], [0.78, '#8a4a86'], [1, '#f2936b']],
  suburb: [[0, '#12174a'], [0.55, '#27337e'], [1, '#6a6fc4']],
  camp: [[0, '#0d2440'], [0.5, '#17485e'], [1, '#3f8f88']],
  city: [[0, '#170f3d'], [0.5, '#3d1d6a'], [1, '#b0477c']],
  observatory: [[0, '#060a26'], [0.6, '#131a50'], [1, '#2f2c72']],
  cloudsea: [[0, '#262e6c'], [0.45, '#7a55a2'], [0.8, '#f08a7a'], [1, '#ffc98a']],
  orbit: [[0, '#04051a'], [1, '#0d1040']],
};

const CLOUD_TINT = {
  farm: '#8a62a6',
  suburb: '#44509c',
  camp: '#2d6a7a',
  city: '#6a3888',
  observatory: '#2a3078',
};

/** 무대별 대표 색(브라우저 테마 색 등에 쓴다). */
export const STAGE_THEME = {
  farm: '#1b1848',
  suburb: '#12174a',
  camp: '#0d2440',
  city: '#170f3d',
  observatory: '#060a26',
  cloudsea: '#262e6c',
  orbit: '#04051a',
};

function skyColorAt(stops, k) {
  for (let i = 1; i < stops.length; i++) {
    if (k <= stops[i][0]) {
      const [a, ca] = stops[i - 1];
      const [b, cb] = stops[i];
      return mix(ca, cb, (k - a) / (b - a));
    }
  }
  return stops[stops.length - 1][1];
}

function fillSky(ctx, stops, w, groundY) {
  const g = ctx.createLinearGradient(0, 0, 0, groundY);
  for (const [k, c] of stops) g.addColorStop(k, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, groundY + 2);
}

function stars(ctx, rng, n, w, maxY, tint = C.white) {
  for (let i = 0; i < n; i++) {
    const x = rng() * w;
    const y = rng() * maxY;
    const r = 0.5 + rng() * 1.1;
    ctx.fillStyle = withAlpha(tint, 0.35 + rng() * 0.55);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
}

function moon(ctx, x, y, r, stops, groundY, crescent) {
  glow(ctx, x, y, r * 3.2, C.cream, 0.22);
  circle(ctx, x, y, r);
  ctx.fillStyle = '#fff6dc';
  ctx.fill();
  if (crescent) {
    circle(ctx, x + r * 0.42, y - r * 0.18, r * 0.92);
    ctx.fillStyle = skyColorAt(stops, y / groundY);
    ctx.fill();
  } else {
    ctx.fillStyle = withAlpha('#e6cf9c', 0.7);
    for (const [dx, dy, k] of [[-0.3, -0.2, 0.2], [0.25, 0.3, 0.26], [0.3, -0.35, 0.12], [-0.4, 0.4, 0.13]]) {
      circle(ctx, x + dx * r, y + dy * r, k * r);
      ctx.fill();
    }
  }
}

/** 굽이진 언덕 실루엣. */
function hills(ctx, w, baseY, amp, freq, phase, color, bottom) {
  ctx.beginPath();
  ctx.moveTo(0, bottom);
  for (let x = 0; x <= w; x += 6) {
    const k = x / w;
    ctx.lineTo(x, baseY - Math.sin(k * Math.PI * freq + phase) * amp - Math.sin(k * 9 + phase * 2) * amp * 0.12);
  }
  ctx.lineTo(w, bottom);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function hillY(w, baseY, amp, freq, phase, x) {
  const k = x / w;
  return baseY - Math.sin(k * Math.PI * freq + phase) * amp - Math.sin(k * 9 + phase * 2) * amp * 0.12;
}

function pine(ctx, x, baseY, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 1.5, baseY - h * 0.2, 3, h * 0.2);
  for (let i = 0; i < 3; i++) {
    const y0 = baseY - h * 0.15 - (h * 0.8 * i) / 3;
    const half = h * (0.3 - i * 0.07);
    poly(ctx, [[x - half, y0], [x, y0 - h * 0.42], [x + half, y0]]);
    ctx.fill();
  }
}

function ground(ctx, w, h, groundY, fill, edge, edgeH = 3) {
  ctx.fillStyle = fill;
  ctx.fillRect(0, groundY, w, h - groundY);
  ctx.fillStyle = edge;
  ctx.fillRect(0, groundY, w, edgeH);
}

function cloudShape(ctx, x, y, s, color, alpha) {
  ctx.fillStyle = withAlpha(color, alpha);
  for (const [dx, dy, r] of [[-22, 4, 12], [-8, -3, 16], [10, -1, 14], [24, 5, 10]]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
    ctx.fill();
  }
  rrect(ctx, x - 30 * s, y + 3 * s, 62 * s, 12 * s, 6 * s);
  ctx.fill();
}

// ───────── 무대별 그림 ─────────

const PAINT = {
  farm(ctx, env, rng) {
    const { w, h, groundY } = env;
    fillSky(ctx, SKY.farm, w, groundY);
    stars(ctx, rng, 55, w, groundY * 0.6);
    moon(ctx, w * 0.8, groundY * 0.2, 19, SKY.farm, groundY, true);
    hills(ctx, w, groundY - 34, 26, 1.4, 0.4, '#4a2f78', groundY);
    hills(ctx, w, groundY - 14, 20, 1.9, 2.2, '#34245f', groundY);
    // 헛간과 사일로
    const bx = w * 0.2;
    const by = hillY(w, groundY - 14, 20, 1.9, 2.2, bx) + 4;
    ctx.fillStyle = '#231a4a';
    ctx.fillRect(bx - 22, by - 26, 44, 28);
    poly(ctx, [[bx - 25, by - 26], [bx - 15, by - 40], [bx + 15, by - 40], [bx + 25, by - 26]]);
    ctx.fill();
    poly(ctx, [[bx - 15, by - 40], [bx, by - 48], [bx + 15, by - 40]]);
    ctx.fill();
    rrect(ctx, bx + 27, by - 44, 14, 46, 7);
    ctx.fill();
    ctx.fillStyle = C.lemon;
    ctx.fillRect(bx - 5, by - 36, 10, 8);
    glow(ctx, bx, by - 32, 20, C.lemon, 0.28);
    ctx.fillStyle = '#3a2b6b';
    ctx.fillRect(bx - 8, by - 16, 16, 18);
    // 풍차 탑(날개는 live 에서 돈다)
    const mx = w * 0.82;
    const my = hillY(w, groundY - 14, 20, 1.9, 2.2, mx) + 4;
    ctx.strokeStyle = '#231a4a';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(mx - 9, my);
    ctx.lineTo(mx - 2, my - 46);
    ctx.moveTo(mx + 9, my);
    ctx.lineTo(mx + 2, my - 46);
    ctx.moveTo(mx - 7, my - 14);
    ctx.lineTo(mx + 5, my - 28);
    ctx.moveTo(mx + 7, my - 14);
    ctx.lineTo(mx - 5, my - 28);
    ctx.stroke();
    env.mill = { x: mx, y: my - 48 };
    ground(ctx, w, h, groundY, '#22364f', '#3f7a6a');
    // 밭고랑
    ctx.strokeStyle = withAlpha('#3f7a6a', 0.45);
    ctx.lineWidth = 1.5;
    for (let x = -40; x < w + 40; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x, groundY + 4);
      ctx.lineTo(x - 26, h);
      ctx.stroke();
    }
    // 울타리
    ctx.fillStyle = '#5a4a8a';
    ctx.fillRect(0, groundY - 10, w, 2);
    ctx.fillRect(0, groundY - 5, w, 2);
    for (let x = 8; x < w; x += 28) ctx.fillRect(x, groundY - 14, 3.5, 14);
  },

  suburb(ctx, env, rng) {
    const { w, h, groundY } = env;
    fillSky(ctx, SKY.suburb, w, groundY);
    stars(ctx, rng, 50, w, groundY * 0.65);
    moon(ctx, w * 0.2, groundY * 0.17, 20, SKY.suburb, groundY, false);
    // 먼 나무 줄
    ctx.fillStyle = '#1e2760';
    for (let x = -10; x < w + 20; x += 20) {
      ctx.beginPath();
      ctx.arc(x + rng() * 8, groundY - 44 - rng() * 8, 16 + rng() * 8, 0, TAU);
      ctx.fill();
    }
    ctx.fillRect(0, groundY - 46, w, 46);
    // 전봇대와 전선
    const poles = [w * 0.08, w * 0.56, w * 1.04];
    ctx.strokeStyle = '#141a48';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < poles.length - 1; i++) {
      for (const dy of [0, 7]) {
        ctx.beginPath();
        ctx.moveTo(poles[i], groundY - 96 + dy);
        ctx.quadraticCurveTo((poles[i] + poles[i + 1]) / 2, groundY - 80 + dy, poles[i + 1], groundY - 96 + dy);
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#141a48';
    for (const x of poles) {
      ctx.fillRect(x - 2, groundY - 100, 4, 100);
      ctx.fillRect(x - 11, groundY - 98, 22, 3);
      ctx.fillRect(x - 8, groundY - 91, 16, 3);
    }
    // 집들
    env.windows = [];
    let x = -12;
    let i = 0;
    while (x < w + 10) {
      const bw = 58 + rng() * 26;
      const bh = 36 + rng() * 18;
      const body = i % 2 ? '#2a3478' : '#242c6a';
      ctx.fillStyle = body;
      ctx.fillRect(x, groundY - bh, bw, bh);
      ctx.fillStyle = '#181e52';
      poly(ctx, [[x - 6, groundY - bh], [x + bw / 2, groundY - bh - 22 - rng() * 8], [x + bw + 6, groundY - bh]]);
      ctx.fill();
      ctx.fillRect(x + bw * 0.68, groundY - bh - 24, 7, 16);
      for (let k = 0; k < 2; k++) {
        const wx = x + bw * (0.2 + k * 0.42);
        const wy = groundY - bh + 9;
        const lit = rng() < 0.62;
        ctx.fillStyle = lit ? (rng() < 0.75 ? C.lemon : C.aqua) : '#1a2058';
        ctx.fillRect(wx, wy, 11, 12);
        if (lit) {
          glow(ctx, wx + 5.5, wy + 6, 16, C.lemon, 0.22);
          env.windows.push({ x: wx, y: wy, w: 11, h: 12 });
        }
        ctx.fillStyle = body;
        ctx.fillRect(wx + 5, wy, 1.2, 12);
      }
      x += bw + 6 + rng() * 10;
      i++;
    }
    // 가로등
    const lx = w * 0.46;
    ctx.fillStyle = '#141a48';
    ctx.fillRect(lx - 1.5, groundY - 56, 3, 56);
    ctx.fillRect(lx - 1.5, groundY - 57, 13, 3);
    poly(ctx, [[lx + 9, groundY - 54], [lx - 12, groundY], [lx + 30, groundY]]);
    ctx.fillStyle = withAlpha(C.lemon, 0.16);
    ctx.fill();
    ellipse(ctx, lx + 9, groundY - 54, 5, 2.6);
    ctx.fillStyle = C.lemonSoft;
    ctx.fill();
    ground(ctx, w, h, groundY, '#232a5c', '#5560b0', 4);
    ctx.fillStyle = '#2e3670';
    ctx.fillRect(0, groundY + 4, w, 9);
    ctx.fillStyle = withAlpha(C.lemonSoft, 0.5);
    for (let dx = 10; dx < w; dx += 46) ctx.fillRect(dx, groundY + 30, 22, 3);
  },

  camp(ctx, env, rng) {
    const { w, h, groundY } = env;
    fillSky(ctx, SKY.camp, w, groundY);
    stars(ctx, rng, 85, w, groundY * 0.7);
    const mx = w * 0.76;
    moon(ctx, mx, groundY * 0.2, 19, SKY.camp, groundY, false);
    // 산
    const peaks = (color, snow, baseY, list) => {
      for (const [px, ph, pw] of list) {
        ctx.fillStyle = color;
        poly(ctx, [[px * w - pw, baseY], [px * w, baseY - ph], [px * w + pw, baseY]]);
        ctx.fill();
        ctx.fillStyle = snow;
        poly(ctx, [[px * w - pw * 0.2, baseY - ph * 0.8], [px * w, baseY - ph], [px * w + pw * 0.2, baseY - ph * 0.8], [px * w + pw * 0.06, baseY - ph * 0.72], [px * w - pw * 0.08, baseY - ph * 0.76]]);
        ctx.fill();
      }
    };
    peaks('#1c4660', withAlpha('#bfe6e0', 0.45), groundY - 30, [[0.18, 120, 120], [0.62, 150, 150], [0.95, 105, 110]]);
    peaks('#143449', withAlpha('#bfe6e0', 0.25), groundY - 30, [[0.38, 86, 110], [0.82, 96, 120], [0.02, 70, 90]]);
    // 호수와 달빛
    ctx.fillStyle = '#1b5368';
    ctx.fillRect(0, groundY - 34, w, 34);
    ctx.fillStyle = withAlpha('#fff6dc', 0.5);
    for (let i = 0; i < 6; i++) {
      const lw = 30 - i * 3.6 + rng() * 6;
      ctx.fillRect(mx - lw / 2 + rand(rng, -4, 4), groundY - 30 + i * 4.6, lw, 1.8);
    }
    env.lake = { x: mx, y: groundY - 30 };
    for (const [px, ph] of [[0.04, 64], [0.11, 46], [0.9, 58], [0.97, 76], [0.84, 40]]) pine(ctx, px * w, groundY - 2, ph, '#0e2630');
    ground(ctx, w, h, groundY, '#173630', '#2f6a58');
    // 텐트
    const tx = w * 0.27;
    poly(ctx, [[tx - 27, groundY], [tx, groundY - 33], [tx + 27, groundY]]);
    ctx.fillStyle = '#e0584f';
    ctx.fill();
    poly(ctx, [[tx - 8, groundY], [tx, groundY - 20], [tx + 8, groundY]]);
    ctx.fillStyle = '#5a2a3a';
    ctx.fill();
    poly(ctx, [[tx, groundY - 33], [tx + 27, groundY], [tx + 12, groundY]]);
    ctx.fillStyle = withAlpha('#2b1d4f', 0.22);
    ctx.fill();
    // 장작
    const fx = w * 0.55;
    ctx.strokeStyle = '#5a3a2a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(fx - 9, groundY - 1);
    ctx.lineTo(fx + 9, groundY - 5);
    ctx.moveTo(fx + 9, groundY - 1);
    ctx.lineTo(fx - 9, groundY - 5);
    ctx.stroke();
    env.fire = { x: fx, y: groundY - 6 };
  },

  city(ctx, env, rng) {
    const { w, h, groundY } = env;
    fillSky(ctx, SKY.city, w, groundY);
    stars(ctx, rng, 26, w, groundY * 0.4);
    moon(ctx, w * 0.84, groundY * 0.14, 13, SKY.city, groundY, true);
    glow(ctx, w * 0.5, groundY, w * 0.9, '#ff7aa8', 0.22);
    env.windows = [];
    env.beacons = [];
    const row = (color, minH, maxH, minW, maxW, winAlpha, litRate, track) => {
      let x = -8;
      while (x < w + 8) {
        const bw = minW + rng() * (maxW - minW);
        const bh = minH + rng() * (maxH - minH);
        const top = groundY - bh;
        ctx.fillStyle = color;
        ctx.fillRect(x, top, bw, bh);
        if (rng() < 0.3) {
          ctx.fillRect(x + bw * 0.3, top - 8, bw * 0.4, 8);
          if (track && rng() < 0.7) {
            ctx.fillRect(x + bw * 0.5 - 1, top - 26, 2, 18);
            env.beacons.push({ x: x + bw * 0.5, y: top - 27 });
          }
        }
        const cols = Math.max(2, Math.floor((bw - 8) / 8));
        const rows = Math.floor((bh - 10) / 10);
        const gap = (bw - 8) / cols;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (rng() > litRate) continue;
            const pick = rng();
            const col = pick < 0.62 ? C.lemon : pick < 0.82 ? C.aqua : C.pink;
            ctx.fillStyle = withAlpha(col, winAlpha * (0.6 + rng() * 0.4));
            const wx = x + 5 + c * gap;
            const wy = top + 7 + r * 10;
            ctx.fillRect(wx, wy, 4, 5.5);
            if (track && rng() < 0.05) env.windows.push({ x: wx, y: wy, w: 4, h: 5.5, color });
          }
        }
        x += bw + 2 + rng() * 5;
      }
    };
    row('#33206a', 70, 170, 24, 42, 0.4, 0.3, false);
    row('#20154d', 40, 118, 34, 58, 0.95, 0.42, true);
    // 전광판
    const bx = w * 0.3;
    const by = groundY - 62;
    ctx.fillStyle = '#150e38';
    ctx.fillRect(bx - 2, by + 22, 4, 40);
    rrect(ctx, bx - 24, by - 6, 48, 30, 4);
    ctx.fill();
    env.board = { x: bx, y: by + 9 };
    ground(ctx, w, h, groundY, '#241d4c', '#6a55b0', 4);
    ctx.fillStyle = '#322a66';
    ctx.fillRect(0, groundY + 4, w, 8);
    ctx.fillStyle = withAlpha(C.white, 0.35);
    for (let dx = w * 0.62; dx < w * 0.62 + 60; dx += 12) ctx.fillRect(dx, groundY + 16, 7, 40);
  },

  observatory(ctx, env, rng) {
    const { w, h, groundY } = env;
    fillSky(ctx, SKY.observatory, w, groundY);
    // 은하수
    ctx.save();
    ctx.translate(w * 0.45, groundY * 0.36);
    ctx.rotate(-0.55);
    const band = ctx.createLinearGradient(0, -70, 0, 70);
    band.addColorStop(0, withAlpha(C.lilac, 0));
    band.addColorStop(0.5, withAlpha(C.lilac, 0.16));
    band.addColorStop(1, withAlpha(C.lilac, 0));
    ctx.fillStyle = band;
    ctx.fillRect(-w, -70, w * 2, 140);
    for (let i = 0; i < 220; i++) {
      const x = rand(rng, -w, w);
      const y = (rng() + rng() + rng() - 1.5) * 60;
      ctx.fillStyle = withAlpha(rng() < 0.2 ? C.aqua : C.white, 0.25 + rng() * 0.5);
      ctx.fillRect(x, y, 1.1, 1.1);
    }
    ctx.restore();
    stars(ctx, rng, 130, w, groundY * 0.85);
    // 언덕과 천문대
    hills(ctx, w, groundY - 22, 34, 1.0, 3.6, '#1b2054', groundY);
    hills(ctx, w, groundY - 2, 18, 1.7, 1.0, '#151945', groundY);
    const ox = w * 0.74;
    const oy = hillY(w, groundY - 22, 34, 1.0, 3.6, ox) + 3;
    ctx.fillStyle = '#3d4388';
    ctx.fillRect(ox - 24, oy - 22, 48, 24);
    ctx.fillStyle = '#c9c4e0';
    ctx.beginPath();
    ctx.arc(ox, oy - 22, 24, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = '#0a0d30';
    poly(ctx, [[ox - 2, oy - 22], [ox + 5, oy - 45], [ox + 13, oy - 41], [ox + 8, oy - 22]]);
    ctx.fill();
    ctx.fillStyle = C.lemon;
    ctx.fillRect(ox - 4, oy - 12, 8, 14);
    glow(ctx, ox, oy - 5, 16, C.lemon, 0.25);
    ctx.fillStyle = '#3d4388';
    ctx.fillRect(ox - 52, oy - 6, 20, 10);
    ctx.fillStyle = '#a9a3c9';
    ctx.beginPath();
    ctx.arc(ox - 42, oy - 6, 10, Math.PI, TAU);
    ctx.fill();
    for (const [px, ph] of [[0.06, 56], [0.14, 40], [0.24, 48], [0.95, 44]]) pine(ctx, px * w, groundY, ph, '#0d1036');
    ground(ctx, w, h, groundY, '#12163e', '#2f3a80');
  },

  cloudsea(ctx, env, rng) {
    const { w, h, groundY } = env;
    fillSky(ctx, SKY.cloudsea, w, groundY);
    stars(ctx, rng, 30, w, groundY * 0.3);
    const sx = w * 0.68;
    const sy = groundY - 40;
    glow(ctx, sx, sy, w * 0.7, '#ffe6a0', 0.5);
    circle(ctx, sx, sy, 26);
    ctx.fillStyle = '#fff3c4';
    ctx.fill();
    const rowOf = (y, color, minR, maxR, step) => {
      ctx.fillStyle = color;
      for (let x = -20; x < w + 30; x += step * (0.7 + rng() * 0.6)) {
        ctx.beginPath();
        ctx.arc(x, y + rng() * 8, minR + rng() * (maxR - minR), 0, TAU);
        ctx.fill();
      }
      ctx.fillRect(0, y + 4, w, h - y);
    };
    rowOf(groundY - 44, '#b889c2', 18, 30, 30);
    rowOf(groundY - 22, '#e3aec6', 16, 28, 28);
    rowOf(groundY + 4, '#fde4dc', 14, 24, 24);
  },

  orbit(ctx, env, rng) {
    const { w, h, groundY } = env;
    fillSky(ctx, SKY.orbit, w, h);
    ctx.fillStyle = '#0d1040';
    ctx.fillRect(0, groundY, w, h - groundY);
    glow(ctx, w * 0.2, groundY * 0.3, w * 0.6, C.lilac, 0.16);
    glow(ctx, w * 0.85, groundY * 0.55, w * 0.5, '#3fd0c0', 0.1);
    for (let i = 0; i < 170; i++) {
      const x = rng() * w;
      const y = rng() * groundY;
      const pick = rng();
      ctx.fillStyle = withAlpha(pick < 0.12 ? C.aqua : pick < 0.2 ? C.pink : C.white, 0.35 + rng() * 0.6);
      ctx.beginPath();
      ctx.arc(x, y, 0.5 + rng() * 1.2, 0, TAU);
      ctx.fill();
    }
    // 지구
    const R = w * 1.25;
    const cx = w / 2;
    const cy = groundY + R - 52;
    const halo = ctx.createRadialGradient(cx, cy, R * 0.985, cx, cy, R * 1.06);
    halo.addColorStop(0, withAlpha('#7fd4ff', 0.75));
    halo.addColorStop(1, withAlpha('#7fd4ff', 0));
    ctx.fillStyle = halo;
    circle(ctx, cx, cy, R * 1.06);
    ctx.fill();
    ctx.save();
    circle(ctx, cx, cy, R);
    ctx.clip();
    const sea = ctx.createLinearGradient(0, cy - R, 0, cy - R + 160);
    sea.addColorStop(0, '#3f86e0');
    sea.addColorStop(1, '#1d3f94');
    ctx.fillStyle = sea;
    ctx.fillRect(0, cy - R, w, h);
    ctx.fillStyle = '#58b874';
    for (const [px, py, rx, ry, rot] of [[0.2, 34, 62, 24, 0.2], [0.34, 62, 36, 18, -0.4], [0.72, 28, 54, 20, -0.2], [0.9, 62, 44, 26, 0.5], [0.55, 84, 30, 12, 0.1]]) {
      ellipse(ctx, px * w, cy - R + py, rx, ry, rot);
      ctx.fill();
    }
    ctx.fillStyle = withAlpha(C.white, 0.75);
    for (const [px, py, cw] of [[0.1, 20, 70], [0.48, 40, 90], [0.8, 52, 60], [0.3, 86, 80], [0.66, 14, 50]]) {
      rrect(ctx, px * w - cw / 2, cy - R + py, cw, 7, 3.5);
      ctx.fill();
      rrect(ctx, px * w - cw / 4, cy - R + py + 6, cw * 0.7, 6, 3);
      ctx.fill();
    }
    ctx.restore();
  },
};

// ───────── 움직이는 부분 ─────────

const LIVE = {
  farm(ctx, env, t) {
    if (!env.mill) return;
    ctx.save();
    ctx.translate(env.mill.x, env.mill.y);
    ctx.rotate(t * 0.9);
    ctx.fillStyle = '#231a4a';
    for (let i = 0; i < 6; i++) {
      ctx.rotate(TAU / 6);
      poly(ctx, [[0, -1.5], [15, -4.5], [15, 4.5], [0, 1.5]]);
      ctx.fill();
    }
    ctx.restore();
  },
  suburb(ctx, env, t) {
    // 텔레비전을 보는 집: 창문 빛이 가끔 바뀐다.
    const list = env.windows || [];
    for (let i = 0; i < list.length; i += 3) {
      const wd = list[i];
      const k = Math.sin(t * 5 + i * 3) * Math.sin(t * 1.3 + i);
      if (k > 0.25) {
        ctx.fillStyle = withAlpha(C.aqua, 0.55 * k);
        ctx.fillRect(wd.x, wd.y, wd.w, wd.h);
      }
    }
  },
  camp(ctx, env, t) {
    if (!env.fire) return;
    const { x, y } = env.fire;
    const f = 1 + Math.sin(t * 13) * 0.12 + Math.sin(t * 7.3) * 0.08;
    glow(ctx, x, y - 6, 54 * f, '#ffb04a', 0.3);
    ctx.fillStyle = '#ff8a3a';
    ctx.beginPath();
    ctx.moveTo(x - 7, y);
    ctx.quadraticCurveTo(x - 8, y - 10 * f, x + Math.sin(t * 9) * 2, y - 19 * f);
    ctx.quadraticCurveTo(x + 8, y - 10 * f, x + 7, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.lemon;
    ctx.beginPath();
    ctx.moveTo(x - 3.5, y);
    ctx.quadraticCurveTo(x - 4, y - 6 * f, x, y - 11 * f);
    ctx.quadraticCurveTo(x + 4, y - 6 * f, x + 3.5, y);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.6 + i / 3) % 1;
      ctx.fillStyle = withAlpha('#ffd08a', 1 - k);
      ctx.fillRect(x + Math.sin(k * 9 + i * 2) * 7, y - 18 - k * 34, 1.6, 1.6);
    }
    if (env.lake) {
      ctx.fillStyle = withAlpha('#fff6dc', 0.25 + 0.2 * Math.sin(t * 2));
      ctx.fillRect(env.lake.x - 9 + Math.sin(t * 1.4) * 3, env.lake.y + 27, 18, 1.6);
    }
  },
  city(ctx, env, t) {
    for (const [i, b] of (env.beacons || []).entries()) {
      const on = Math.sin(t * 3 + i * 1.7) > 0.2;
      if (on) glow(ctx, b.x, b.y, 8, C.coral, 0.7);
      ctx.fillStyle = on ? C.coral : '#6a3a5a';
      ctx.fillRect(b.x - 1.5, b.y - 1.5, 3, 3);
    }
    if (env.board) {
      const { x, y } = env.board;
      const phase = Math.floor(t / 2.4) % 3;
      const cols = [C.mint, C.lemon, C.pink];
      glow(ctx, x, y, 34, cols[phase], 0.22);
      ctx.fillStyle = cols[phase];
      rrect(ctx, x - 20, y - 11, 40, 22, 2);
      ctx.fill();
      ctx.fillStyle = '#150e38';
      if (phase === 0) {
        circle(ctx, x, y, 6.5);
        ctx.fill();
      } else if (phase === 1) {
        star(ctx, x, y, 8, 3.4, 5, t);
        ctx.fill();
      } else {
        for (const dx of [-10, 0, 10]) ctx.fillRect(x + dx - 2.5, y - 6 + Math.sin(t * 5 + dx) * 2, 5, 12);
      }
    }
    const list = env.windows || [];
    for (let i = 0; i < list.length; i++) {
      if (Math.sin(t * 0.7 + i * 2.1) > 0.92) {
        ctx.fillStyle = '#20154d';
        ctx.fillRect(list[i].x, list[i].y, list[i].w, list[i].h);
      }
    }
  },
  observatory(ctx, env, t) {
    // 가끔 지나가는 유성
    const k = (t % 9) / 0.7;
    if (k < 1) {
      const x = env.w * (0.15 + 0.5 * k);
      const y = env.groundY * (0.12 + 0.16 * k);
      const g = ctx.createLinearGradient(x, y, x - 44, y - 14);
      g.addColorStop(0, withAlpha(C.white, 0.9 * (1 - k)));
      g.addColorStop(1, withAlpha(C.white, 0));
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 44, y - 14);
      ctx.stroke();
    }
  },
  cloudsea(ctx, env, t) {
    const { w, groundY } = env;
    for (let i = 0; i < 3; i++) {
      const x = ((t * (5 + i * 2) + i * 170) % (w + 160)) - 80;
      cloudShape(ctx, x, groundY - 70 - i * 46, 0.9 + i * 0.25, '#ffe9e0', 0.26);
    }
  },
  orbit(ctx, env, t) {
    const { w, groundY } = env;
    // 멀리 지나가는 작은 위성 불빛
    const x = (t * 14) % (w + 60) - 30;
    const y = groundY * 0.18 + Math.sin(x * 0.01) * 12;
    if (Math.sin(t * 6) > 0) {
      ctx.fillStyle = withAlpha(C.white, 0.9);
      ctx.fillRect(x, y, 2, 2);
    }
  },
};

/**
 * 무대 배경을 만든다.
 * @returns {{paint: (ctx: CanvasRenderingContext2D) => void, live: (ctx: CanvasRenderingContext2D, t: number) => void}}
 */
export function makeBackdrop(stage, w, h, groundY) {
  const env = { w, h, groundY };
  const seed = STAGE_SEED[stage] || 1;
  // 반짝이는 별과 떠가는 구름의 자리는 무대마다 고정한다.
  const lr = seededRng(seed * 7 + 3);
  const twinkles = Array.from({ length: stage === 'cloudsea' ? 5 : 14 }, () => ({
    x: lr() * w,
    y: lr() * groundY * (stage === 'cloudsea' ? 0.25 : 0.62),
    ph: lr() * TAU,
    sp: 1.2 + lr() * 2,
    r: 2.2 + lr() * 2.4,
  }));
  const tint = CLOUD_TINT[stage];
  const clouds = tint
    ? Array.from({ length: 3 }, (_, i) => ({
        y: groundY * (0.16 + i * 0.17) + lr() * 20,
        speed: 3.5 + lr() * 4,
        off: lr() * (w + 200),
        s: 0.8 + lr() * 0.7,
        a: 0.34 + lr() * 0.2,
      }))
    : [];
  return {
    paint(ctx) {
      PAINT[stage](ctx, env, seededRng(seed));
    },
    live(ctx, t) {
      for (const s of twinkles) {
        const k = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
        if (k < 0.35) continue;
        ctx.fillStyle = withAlpha(C.white, k * 0.9);
        star(ctx, s.x, s.y, s.r * k, s.r * k * 0.28, 4, 0);
        ctx.fill();
      }
      for (const c of clouds) {
        const x = ((t * c.speed + c.off) % (w + 200)) - 100;
        cloudShape(ctx, x, c.y, c.s, tint, c.a);
      }
      LIVE[stage]?.(ctx, env, t);
    },
  };
}
