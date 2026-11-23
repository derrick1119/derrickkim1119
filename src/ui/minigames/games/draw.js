// 따라 그리기: 밀밭에 점선 원을 손가락으로 따라 그려 미스터리 서클을 만든다. (crop)
import { TAU, withAlpha, rrect } from '../../../render/draw.js';
import { circlePath, traceAccuracy, distToStrokes, clamp01 } from '../score.js';
import { ufo, vgrad, vignette, twinkle, cone, bold, OL } from '../art.js';

const TARGET = [circlePath(0, 0, 1, 96)];
const GUIDE_SAMPLES = 72;

export function createDraw(env) {
  const { tune, fx, sfx, haptic, say, form } = env;
  const strokes = [];
  let active = null; // { id, pts }
  let cx = 0;
  let cy = 0;
  let R = 100;
  let acc = { score: 0, coverage: 0, precision: 0 };
  let accT = 0;
  let dirty = false;
  let finger = null; // 화면 좌표
  let ufoX = 0;
  let ufoY = 0;
  let sparkT = 0;
  let closed = false;
  let lastNear = true;
  const covered = new Array(GUIDE_SAMPLES).fill(false);

  const layout = (w, h) => {
    R = Math.min(w * 0.36, h * 0.25);
    cx = w / 2;
    cy = h * 0.53;
  };
  const toUnit = (p) => [(p.x - cx) / R, (p.y - cy) / R];
  const recompute = () => {
    const list = active ? [...strokes, active.pts] : strokes;
    acc = traceAccuracy(list, TARGET, tune);
    for (let i = 0; i < GUIDE_SAMPLES; i++) {
      if (covered[i]) continue;
      const a = -Math.PI / 2 + (i / GUIDE_SAMPLES) * TAU;
      covered[i] = distToStrokes(Math.cos(a), Math.sin(a), list) <= tune.reach;
    }
    dirty = false;
  };

  return {
    resize: layout,
    down(p) {
      if (active || p.key) return; // 그리기는 손가락(마우스)으로만
      active = { id: p.id, pts: [toUnit(p)] };
      finger = { x: p.x, y: p.y };
      dirty = true;
      sfx('poke');
      haptic('tap');
    },
    move(p) {
      if (!active || p.id !== active.id) return;
      const u = toUnit(p);
      const last = active.pts[active.pts.length - 1];
      if (Math.hypot(u[0] - last[0], u[1] - last[1]) < 0.015) return;
      active.pts.push(u);
      if (active.pts.length > 900) active.pts.splice(1, 1);
      finger = { x: p.x, y: p.y };
      dirty = true;
    },
    up(p) {
      if (!active || p.id !== active.id) return;
      strokes.push(active.pts);
      active = null;
      finger = null;
      recompute();
    },
    release() {
      if (active) strokes.push(active.pts);
      active = null;
      finger = null;
    },
    update(dt) {
      accT -= dt;
      if (dirty && accT <= 0) {
        recompute();
        accT = 0.08;
      }
      if (!closed && acc.coverage >= 0.97) {
        closed = true;
        fx.pop(say('pop.done'), cx, cy, { color: '#ffe04f', size: 34 });
        fx.burst(cx, cy - R, '#fff6b2', 18, { star: true, gravity: 60 });
        sfx('ready');
        haptic('good');
      }
      // 손가락 가까이에서 밀이 눕는 반짝이(선에 가까우면 금빛, 멀면 흙먼지)
      if (finger && active) {
        sparkT -= dt;
        const [ux, uy] = toUnit(finger);
        const d = Math.abs(Math.hypot(ux, uy) - 1);
        const near = d < tune.reach;
        if (sparkT <= 0) {
          sparkT = 0.05;
          fx.burst(finger.x, finger.y, near ? '#fff2a8' : '#a8742e', near ? 2 : 1, {
            speed: 70,
            size: near ? 3.4 : 3,
            gravity: near ? -30 : 120,
            life: 0.5,
            star: near,
          });
        }
        if (!near && lastNear) haptic('warn');
        lastNear = near;
      }
      const tx = finger ? finger.x : cx;
      const ty = finger ? finger.y - R * 0.55 - 26 : cy - R - 58;
      const k = Math.min(1, dt * 14);
      ufoX += (tx - ufoX) * k;
      ufoY += (ty - ufoY) * k;
    },
    idle(dt, info) {
      if (info.phase === 'end') return;
      const k = Math.min(1, dt * 5);
      ufoX += (cx - ufoX) * k;
      ufoY += (cy - R - 58 - ufoY) * k;
    },
    probe: () => ({ coverage: acc.coverage, precision: acc.precision }),
    done: () => closed && !active,
    score: () => {
      if (dirty) recompute();
      return acc.score;
    },
    meter: () => ({ v: acc.score, text: `${Math.round(clamp01(acc.coverage) * 100)}%` }),
    draw(ctx, w, h, info) {
      if (!R || cx !== w / 2) layout(w, h);
      const t = info.clock;
      // 달밤의 밀밭(위에서 내려다본다)
      vgrad(ctx, 0, 0, w, h, [
        [0, '#a5772a'],
        [0.45, '#c99a3c'],
        [1, '#9a6a22'],
      ]);
      // 밀 이랑: 바람에 살랑이는 굵은 띠 + 이삭 점
      ctx.save();
      ctx.lineCap = 'round';
      const gap = 22;
      for (let i = -Math.ceil(h / gap); i < Math.ceil((w + h) / gap); i++) {
        const sway = env.reduced ? 0 : Math.sin(t * 1.4 + i * 0.4) * 4;
        const x0 = i * gap + sway;
        ctx.strokeStyle = 'rgba(110,62,12,0.28)';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(x0, 0);
        ctx.lineTo(x0 + h * 0.4, h);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,226,140,0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x0 + 8, 0);
        ctx.lineTo(x0 + 8 + h * 0.4, h);
        ctx.stroke();
      }
      ctx.restore();
      drawFarm(ctx, w, h, t);
      // 달빛(오른쪽 위에서 비춘다)
      const g = ctx.createRadialGradient(w * 0.8, h * 0.08, 10, w * 0.8, h * 0.08, h * 0.75);
      g.addColorStop(0, 'rgba(225,240,255,0.3)');
      g.addColorStop(0.5, 'rgba(160,180,255,0.08)');
      g.addColorStop(1, 'rgba(40,40,120,0.25)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // 그린 자국(눕힌 밀)
      const list = active ? [...strokes, active.pts] : strokes;
      for (const pass of [
        [R * 0.2, '#8a5a18'],
        [R * 0.15, '#f3d27a'],
        [R * 0.05, 'rgba(255,250,220,0.75)'],
      ]) {
        ctx.lineWidth = pass[0];
        ctx.strokeStyle = pass[1];
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const s of list) {
          ctx.beginPath();
          s.forEach(([x, y], i) => (i ? ctx.lineTo(cx + x * R, cy + y * R) : ctx.moveTo(cx + x * R, cy + y * R)));
          if (s.length === 1) ctx.lineTo(cx + s[0][0] * R + 0.1, cy + s[0][1] * R);
          ctx.stroke();
        }
      }

      // 점선 안내(지나간 곳은 금빛 점으로 바뀐다)
      const guideA = info.phase === 'play' ? tune.guide : 0.95;
      for (let i = 0; i < GUIDE_SAMPLES; i++) {
        const a = -Math.PI / 2 + (i / GUIDE_SAMPLES) * TAU;
        const x = cx + Math.cos(a) * R;
        const y = cy + Math.sin(a) * R;
        if (covered[i]) {
          twinkle(ctx, x, y, 5, '#fff6b2', 0.95);
        } else {
          const pulse = 0.6 + 0.4 * Math.sin(t * 6 - i * 0.35);
          ctx.fillStyle = withAlpha('#ffffff', guideA * pulse);
          ctx.beginPath();
          ctx.arc(x, y, 3.4, 0, TAU);
          ctx.fill();
        }
      }
      // 시작점과 방향 화살표
      if (!closed) {
        const sx = cx;
        const sy = cy - R;
        const pulse = 1 + 0.15 * Math.sin(t * 7);
        ctx.fillStyle = withAlpha('#6ff2ff', 0.35);
        ctx.beginPath();
        ctx.arc(sx, sy, 16 * pulse, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = OL;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx, sy, 8, 0, TAU);
        ctx.fill();
        ctx.stroke();
        if (!list.length) {
          // 시계 방향 화살표
          ctx.save();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(cx, cy, R, -Math.PI / 2 + 0.18, -Math.PI / 2 + 0.62);
          ctx.stroke();
          const ea = -Math.PI / 2 + 0.66;
          const ex = cx + Math.cos(ea) * R;
          const ey = cy + Math.sin(ea) * R;
          ctx.translate(ex, ey);
          ctx.rotate(ea + Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(-9, -8);
          ctx.lineTo(4, 0);
          ctx.lineTo(-9, 8);
          ctx.stroke();
          ctx.restore();
        }
      }
      vignette(ctx, w, h, '#1a1440', 0.5);

      // UFO 와 견인 빔
      if (finger) cone(ctx, ufoX, ufoY + 10, finger.x, finger.y, 10, R * 0.12, '#6ff2ff', 0.42);
      ufo(ctx, ufoX, ufoY, 40, { form, t, mood: finger ? (lastNear ? 'happy' : 'alert') : 'idle', lit: 1 });
      if (closed) bold(ctx, '★', cx, cy, R * 0.5, '#ffe04f');
    },
  };
}

/** 구석의 헛간(위에서 본 지붕)·사일로와 울타리. */
function drawFarm(ctx, w, h, t) {
  ctx.save();
  // 울타리
  ctx.fillStyle = '#6a3e1c';
  ctx.fillRect(0, h - 22, w, 4);
  ctx.strokeStyle = '#3e2410';
  ctx.lineWidth = 2;
  for (let x = 10; x < w; x += 34) {
    rrect(ctx, x, h - 27, 10, 13, 3);
    ctx.fillStyle = '#8a5a2a';
    ctx.fill();
    ctx.stroke();
  }
  // 헛간 지붕: 가운데 용마루를 두고 두 쪽이 다른 밝기
  const x = 16;
  const y = h - 150;
  const bw = 92;
  const bh = 74;
  ctx.fillStyle = 'rgba(30,20,60,0.3)';
  rrect(ctx, x + 8, y + 10, bw, bh, 8);
  ctx.fill();
  ctx.fillStyle = '#e2483c';
  rrect(ctx, x, y, bw, bh / 2, 6);
  ctx.fill();
  ctx.fillStyle = '#b8332b';
  rrect(ctx, x, y + bh / 2, bw, bh / 2, 6);
  ctx.fill();
  ctx.strokeStyle = '#6e1e1a';
  ctx.lineWidth = 3;
  rrect(ctx, x, y, bw, bh, 6);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#fff3d6';
  ctx.beginPath();
  ctx.moveTo(x + 4, y + bh / 2);
  ctx.lineTo(x + bw - 4, y + bh / 2);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(110,30,26,0.5)';
  for (let k = 1; k < 6; k++) {
    ctx.beginPath();
    ctx.moveTo(x + (bw * k) / 6, y + 3);
    ctx.lineTo(x + (bw * k) / 6, y + bh - 3);
    ctx.stroke();
  }
  // 사일로(동그란 지붕)
  const sx = x + bw + 26;
  const sy = y + 22;
  ctx.fillStyle = '#c9cfe8';
  ctx.strokeStyle = '#5a6496';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(sx, sy, 20, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(sx - 6, sy - 6, 6, 0, TAU);
  ctx.fill();
  // 창문 불빛이 새어 나온다
  const on = 0.6 + 0.4 * Math.sin(t * 2.2);
  const g = ctx.createRadialGradient(x + bw / 2, y + bh + 6, 2, x + bw / 2, y + bh + 6, 44);
  g.addColorStop(0, withAlpha('#ffe9a0', 0.45 * on));
  g.addColorStop(1, withAlpha('#ffe9a0', 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x + bw / 2, y + bh + 6, 44, 0, TAU);
  ctx.fill();
  ctx.restore();
}
