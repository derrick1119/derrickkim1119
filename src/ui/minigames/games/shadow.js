// 그림자 숨바꼭질: UFO 를 끌어 움직이는 안전 구역(구름·피라미드 그림자·지구 그림자) 안에 머문다.
// (cloudnap, pyramid, moon)
import { TAU, withAlpha, clamp } from '../../../render/draw.js';
import { makeZonePath, sdCircle, sdPolygon, coverOf, shadowScore } from '../score.js';
import { ufo, vgrad, stars, vignette, cloudBlob, bubble, OL } from '../art.js';

export function createShadow(env) {
  const { tune, fx, sfx, haptic, say, form } = env;
  const theme = ['cloudnap', 'pyramid', 'moon'].includes(tune.theme) ? tune.theme : 'cloudnap';
  const path = makeZonePath(Math.random, tune);
  const sunPhase = Math.random() * TAU;
  const sunStart = Math.random() * TAU;
  let w = 1;
  let h = 1;
  let u = 1;
  let ox = 0;
  let oy = 0;
  // UFO 위치(구역과 같은 정규 좌표: 화면 가운데 = 0.5, 단위 = u)
  const pos = { x: 0.5, y: 0.5 };
  const goal = { x: 0.5, y: 0.5 };
  let drag = null; // { id, dx, dy }
  const keys = new Set();
  let inside = 0;
  let elapsed = 0;
  let cover = 1;
  let wasIn = true;
  let outT = 0;
  let zT = 0;
  let zoneT = 0;
  let started = false;

  const toScreen = (p) => ({ x: ox + (p.x - 0.5) * u, y: oy + (p.y - 0.5) * u });
  const fromScreen = (x, y) => ({ x: (x - ox) / u + 0.5, y: (y - oy) / u + 0.5 });
  const layout = (nw, nh) => {
    w = nw;
    h = nh;
    u = Math.min(w, h * 0.6);
    ox = w / 2;
    oy = h * 0.54;
  };

  /** 피라미드 그림자 삼각형(정규 좌표). 해가 돌면서 그림자가 피라미드를 빙 돈다. */
  const sunAngle = (t) => sunStart + tune.speed * 1.6 * (t + (0.45 / 1.1) * (1 - Math.cos(1.1 * t + sunPhase)));
  const pyramidShadow = (t) => {
    const a = sunAngle(t);
    const len = 0.48 * (1 + 0.12 * Math.sin(t * 0.9));
    const half = 0.17;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    return [
      [0.5 - dy * half, 0.5 + dx * half],
      [0.5 + dx * len, 0.5 + dy * len],
      [0.5 + dy * half, 0.5 - dx * half],
    ];
  };
  /** 안전 구역까지의 부호 있는 거리(단위 u). */
  const sdZone = (p, t) => {
    if (theme === 'pyramid') return sdPolygon(p.x, p.y, pyramidShadow(t));
    const z = path(t);
    return sdCircle(p.x, p.y, z.x, z.y, tune.radius);
  };
  const zoneCenter = (t) => {
    if (theme !== 'pyramid') return path(t);
    const tri = pyramidShadow(t);
    return { x: (tri[0][0] + tri[1][0] * 1.4 + tri[2][0]) / 3.4, y: (tri[0][1] + tri[1][1] * 1.4 + tri[2][1]) / 3.4 };
  };
  const place = () => {
    const c = zoneCenter(0);
    pos.x = goal.x = c.x;
    pos.y = goal.y = c.y;
  };
  place();

  return {
    resize: layout,
    start() {
      started = true;
    },
    down(p) {
      if (drag) return;
      const f = fromScreen(p.x, p.y);
      drag = { id: p.id, dx: pos.x - f.x, dy: pos.y - f.y };
    },
    move(p) {
      if (!drag || p.id !== drag.id) return;
      const f = fromScreen(p.x, p.y);
      goal.x = f.x + drag.dx;
      goal.y = f.y + drag.dy;
    },
    up(p) {
      if (drag && p.id === drag.id) drag = null;
    },
    key(k) {
      keys.add(k);
    },
    keyUp(k) {
      keys.delete(k);
    },
    release() {
      drag = null;
      keys.clear();
    },
    update(dt, info) {
      const t = info.t;
      zoneT = t;
      elapsed = t;
      // 키보드: 화살표로 움직인다
      const kv = 0.75 * dt;
      if (keys.has('ArrowLeft')) goal.x -= kv;
      if (keys.has('ArrowRight')) goal.x += kv;
      if (keys.has('ArrowUp')) goal.y -= kv;
      if (keys.has('ArrowDown')) goal.y += kv;
      const lim = { x: (w / 2 - 30) / u, y: (h * 0.46 - 40) / u };
      goal.x = clamp(goal.x, 0.5 - lim.x, 0.5 + lim.x);
      goal.y = clamp(goal.y, 0.5 - lim.y * 0.85, 0.5 + lim.y);
      const k = Math.min(1, dt * 16);
      pos.x += (goal.x - pos.x) * k;
      pos.y += (goal.y - pos.y) * k;
      cover = coverOf(sdZone(pos, t), tune.soft);
      inside += cover * dt;
      const isIn = cover > 0.5;
      const s = toScreen(pos);
      if (!isIn && wasIn) {
        haptic('warn');
        sfx('notice');
        fx.pop(say('pop.exposed'), s.x, s.y - 44, { color: '#ff8170', size: 24 });
        outT = 0;
      } else if (isIn && !wasIn) {
        sfx('safe');
        fx.pop(say('pop.hidden'), s.x, s.y - 44, { color: '#b8f1ff', size: 22 });
      }
      if (!isIn) {
        outT += dt;
        if (outT > 1.3) {
          outT = 0;
          fx.pop(say('pop.exposed'), s.x, s.y - 44, { color: '#ff8170', size: 22 });
          haptic('warn');
        }
      } else {
        zT -= dt;
        if (zT <= 0) {
          zT = 0.9;
          if (theme === 'cloudnap') fx.pop('Zz', s.x + 30, s.y - 26, { color: '#c6fdff', size: 20, life: 1.1, rise: 30 });
        }
      }
      wasIn = isIn;
    },
    idle(dt, info) {
      if (info.phase !== 'end' && !started) place();
    },
    probe: () => {
      const z = theme === 'pyramid' ? zoneCenter(zoneT) : path(zoneT);
      return { zone: toScreen(z), ufo: toScreen(pos), cover };
    },
    score: () => shadowScore(elapsed > 0 ? inside / Math.max(elapsed, tune.duration * 0.98) : 1),
    meter: () => ({ v: shadowScore(elapsed > 0.2 ? inside / elapsed : 1), text: `${Math.round((elapsed > 0.2 ? inside / elapsed : 1) * 100)}%` }),
    draw(ctx, nw, nh, info) {
      if (nw !== w || nh !== h) layout(nw, nh);
      const t = info.clock;
      const zt = zoneT;
      const s = toScreen(pos);
      const isIn = cover > 0.5;
      const hw = Math.min(36, u * 0.09);

      if (theme === 'cloudnap') {
        drawSky(ctx, w, h, t);
        const z = toScreen(path(zt));
        const R = tune.radius * u;
        const blobs = cloudBlobs(z.x, z.y, R, t, env.reduced);
        // 구름 그림자(땅이 없으니 살짝 아래로)
        cloudBlob(
          ctx,
          blobs.map(([x, y, r]) => [x + 8, y + 14, r]),
          { fill: 'rgba(60,90,170,0.18)', shade: 'rgba(60,90,170,0.18)', line: 'rgba(0,0,0,0)', lw: 0 },
        );
        cloudBlob(ctx, blobs, {});
        drawUfo(ctx, s, hw, t, isIn, form, env.reduced);
        // 안에 있으면 앞쪽 구름이 UFO 를 덮는다
        if (isIn)
          cloudBlob(
            ctx,
            blobs.filter((_, i) => i % 2 === 0).map(([x, y, r]) => [x, y + r * 0.35, r * 0.62]),
            { alpha: 0.5, lw: 0 },
          );
      } else if (theme === 'pyramid') {
        drawDesert(ctx, w, h, t);
        const tri = pyramidShadow(zt).map(([x, y]) => toScreen({ x, y }));
        drawPyramid(ctx, toScreen({ x: 0.5, y: 0.5 }), 0.17 * u, sunAngle(zt));
        // 그림자(피라미드의 그늘진 반쪽까지 덮는다)
        ctx.fillStyle = 'rgba(60,30,90,0.38)';
        ctx.beginPath();
        tri.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(70,40,90,0.5)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
        drawTourists(ctx, w, h, t, toScreen({ x: 0.5, y: 0.5 }), u);
        drawUfo(ctx, s, hw, t, isIn, form, env.reduced);
      } else {
        drawSpace(ctx, w, h, t);
        const mc = toScreen({ x: 0.5, y: 0.5 });
        const mr = u * 0.47;
        drawMoon(ctx, mc.x, mc.y, mr);
        const z = toScreen(path(zt));
        const R = tune.radius * u;
        // 지구 그림자(본그림자 + 반그림자)
        ctx.save();
        ctx.beginPath();
        ctx.arc(mc.x, mc.y, mr, 0, TAU);
        ctx.clip();
        const g = ctx.createRadialGradient(z.x, z.y, R * 0.6, z.x, z.y, R * 1.55);
        g.addColorStop(0, 'rgba(60,14,30,0.78)');
        g.addColorStop(0.55, 'rgba(90,24,40,0.6)');
        g.addColorStop(1, 'rgba(90,24,40,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
        ctx.strokeStyle = withAlpha('#ff9a7a', 0.55);
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 7]);
        ctx.beginPath();
        ctx.arc(z.x, z.y, R, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        drawUfo(ctx, s, hw * 0.85, t, isIn, form, env.reduced);
      }
      if (!isIn && info.phase === 'play') {
        // 들킬 것 같은 빨간 고리
        const pulse = 1 + 0.12 * Math.sin(t * 14);
        ctx.strokeStyle = withAlpha('#ff5747', 0.85);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(s.x, s.y, hw * 1.45 * pulse, 0, TAU);
        ctx.stroke();
        bubble(ctx, s.x + hw * 1.2, s.y - hw * 1.3, '!', { fill: '#ff8170', size: 18 });
      }
      vignette(ctx, w, h, '#0a0d2a', theme === 'moon' ? 0.6 : 0.35);
      if (info.phase === 'play' && !isIn) {
        ctx.fillStyle = withAlpha('#ff2a1a', 0.08);
        ctx.fillRect(0, 0, w, h);
      }
    },
  };
}

function drawUfo(ctx, s, hw, t, isIn, form, reduced) {
  ufo(ctx, s.x, s.y + (reduced ? 0 : Math.sin(t * 2.6) * 2), hw, { form, t, mood: isIn ? 'hide' : 'alert', lit: isIn ? 0.15 : 1 });
}

/** 구름 덩이: 가운데가 안전 구역을 덮고 가장자리가 몽글몽글 부푼다. */
function cloudBlobs(x, y, R, t, reduced) {
  const wob = (i) => (reduced ? 0 : Math.sin(t * 1.4 + i * 1.9) * R * 0.04);
  return [
    [x - R * 0.85, y + R * 0.2 + wob(0), R * 0.55],
    [x - R * 0.4, y - R * 0.3 + wob(1), R * 0.72],
    [x + R * 0.25, y - R * 0.45 + wob(2), R * 0.78],
    [x + R * 0.85, y + wob(3), R * 0.6],
    [x + R * 0.35, y + R * 0.4 + wob(4), R * 0.7],
    [x - R * 0.35, y + R * 0.45 + wob(5), R * 0.68],
    [x, y, R * 0.9],
  ];
}

function drawSky(ctx, w, h, t) {
  vgrad(ctx, 0, 0, w, h, [
    [0, '#3d6fd8'],
    [0.6, '#64a2f2'],
    [1, '#c4e6ff'],
  ]);
  // 해
  const sx = w * 0.82;
  const sy = h * 0.2;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(t * 0.2);
  ctx.fillStyle = 'rgba(255,240,170,0.25)';
  for (let i = 0; i < 10; i++) {
    ctx.rotate(TAU / 10);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-14, 120);
    ctx.lineTo(14, 120);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#fff1a8';
  ctx.strokeStyle = '#f2b84a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(sx, sy, 26, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // 먼 구름(천천히 흘러간다)
  for (let i = 0; i < 4; i++) {
    const x = ((i * 0.37 + t * 0.015 * (1 + i * 0.3)) % 1.3) * w * 1.1 - w * 0.15;
    const y = h * (0.18 + i * 0.2);
    const r = 18 + i * 4;
    cloudBlob(
      ctx,
      [
        [x, y, r],
        [x + r, y - r * 0.4, r * 1.1],
        [x + r * 2, y, r * 0.9],
      ],
      { alpha: 0.45, lw: 0 },
    );
  }
  // 아래 땅
  ctx.fillStyle = '#93d34f';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.94);
  ctx.quadraticCurveTo(w * 0.3, h * 0.9, w * 0.6, h * 0.93);
  ctx.quadraticCurveTo(w * 0.85, h * 0.95, w, h * 0.91);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
}

function drawDesert(ctx, w, h, t) {
  vgrad(ctx, 0, 0, w, h, [
    [0, '#f4d792'],
    [1, '#e2b766'],
  ]);
  ctx.strokeStyle = 'rgba(190,130,60,0.35)';
  ctx.lineWidth = 3;
  for (let y = -20; y < h + 40; y += 38) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 12) {
      const yy = y + Math.sin(x * 0.025 + y * 0.1) * 9 + Math.sin(t * 0.3 + y) * 1.5;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
}

/** 위에서 본 피라미드. a = 그림자가 뻗는 방향(해는 그 반대쪽). */
function drawPyramid(ctx, c, half, a) {
  const pts = [
    [c.x - half, c.y - half],
    [c.x + half, c.y - half],
    [c.x + half, c.y + half],
    [c.x - half, c.y + half],
  ];
  const faces = [
    [pts[0], pts[1], -Math.PI / 2],
    [pts[1], pts[2], 0],
    [pts[2], pts[3], Math.PI / 2],
    [pts[3], pts[0], Math.PI],
  ];
  // 바닥 그림자
  ctx.fillStyle = 'rgba(90,50,20,0.25)';
  ctx.fillRect(c.x - half + 6, c.y - half + 8, half * 2, half * 2);
  for (const [p0, p1, n] of faces) {
    // 해를 보는 면은 밝은 모래색, 반대쪽 면은 어둡다
    const lit = Math.cos(n - (a + Math.PI));
    const k = (lit + 1) / 2;
    const col = (lo, hi) => Math.round(lo + (hi - lo) * k);
    ctx.fillStyle = `rgb(${col(178, 255)},${col(122, 222)},${col(62, 150)})`;
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p1[0], p1[1]);
    ctx.lineTo(c.x, c.y);
    ctx.closePath();
    ctx.fill();
    // 돌 층(면마다 가로줄)
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(120,70,20,0.3)';
    ctx.lineWidth = 1.5;
    for (let s = 0.2; s < 1; s += 0.2) {
      ctx.beginPath();
      ctx.moveTo(c.x + (p0[0] - c.x) * s, c.y + (p0[1] - c.y) * s);
      ctx.lineTo(c.x + (p1[0] - c.x) * s, c.y + (p1[1] - c.y) * s);
      ctx.stroke();
    }
    ctx.restore();
  }
  // 모서리와 꼭대기
  ctx.strokeStyle = '#7a4a1a';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.strokeRect(c.x - half, c.y - half, half * 2, half * 2);
  ctx.beginPath();
  ctx.moveTo(c.x - half, c.y - half);
  ctx.lineTo(c.x + half, c.y + half);
  ctx.moveTo(c.x + half, c.y - half);
  ctx.lineTo(c.x - half, c.y + half);
  ctx.stroke();
  ctx.fillStyle = '#ffe9a0';
  ctx.beginPath();
  ctx.arc(c.x, c.y, 4, 0, TAU);
  ctx.fill();
}

function drawTourists(ctx, w, h, t, c, u) {
  // 관광객들(점)과 사진기 번쩍
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + 0.4;
    const r = u * (0.6 + (i % 3) * 0.06);
    const x = c.x + Math.cos(a) * r * 0.9;
    const y = c.y + Math.sin(a) * r * 1.2;
    if (x < 10 || x > w - 10 || y < 90 || y > h - 10) continue;
    ctx.fillStyle = ['#ff8f6a', '#59c9ff', '#7fd64b', '#ff8fb0'][i % 4];
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, TAU);
    ctx.fill();
    ctx.stroke();
    if ((t * 0.9 + i * 0.37) % 2.2 < 0.12) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(x, y - 6, 12, 0, TAU);
      ctx.fill();
    }
  }
}

function drawSpace(ctx, w, h, t) {
  vgrad(ctx, 0, 0, w, h, [
    [0, '#070a24'],
    [1, '#141a4a'],
  ]);
  stars(ctx, w, h, t, { seed: 41, n: 120, area: 1 });
  // 지구(구석)
  const ex = w * 0.86;
  const ey = h * 0.14 + 40;
  const er = 30;
  ctx.fillStyle = '#3f86e0';
  ctx.strokeStyle = '#1a4a9a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(ex, ey, er, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7fcb4a';
  ctx.beginPath();
  ctx.ellipse(ex - 8, ey - 6, 12, 8, 0.5, 0, TAU);
  ctx.ellipse(ex + 10, ey + 10, 9, 6, -0.3, 0, TAU);
  ctx.fill();
  // 망원경 반짝(지구에서 보고 있다)
  if (t % 1.6 < 0.2) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - er * 0.6, ey + er * 0.5, 3, 0, TAU);
    ctx.fill();
  }
}

function drawMoon(ctx, x, y, r) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, '#fbf7ea');
  g.addColorStop(0.7, '#d8d4c8');
  g.addColorStop(1, '#a9a6b8');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#7c7a96';
  ctx.lineWidth = 3;
  ctx.stroke();
  const craters = [
    [-0.4, -0.2, 0.16],
    [0.3, -0.45, 0.1],
    [0.35, 0.3, 0.2],
    [-0.2, 0.5, 0.11],
    [0.05, -0.05, 0.08],
    [-0.6, 0.25, 0.07],
  ];
  for (const [cx, cy, cr] of craters) {
    ctx.fillStyle = 'rgba(130,128,150,0.35)';
    ctx.beginPath();
    ctx.arc(x + cx * r, y + cy * r, cr * r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(110,108,130,0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
