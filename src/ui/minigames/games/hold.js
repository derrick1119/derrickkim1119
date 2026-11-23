// 꾹 버티기: 누르면 밝아지고 떼면 어두워진다. 흔들리는 밝기를 초록 칸 안에 붙잡는다. (streetlamp, stadium)
import { TAU, withAlpha, rrect, lerp, clamp } from '../../../render/draw.js';
import { holdState, holdStep, holdBand, bandCover, holdScore } from '../score.js';
import { ufo, person, vgrad, stars, vignette, bubble, bold, OL } from '../art.js';

export function createHold(env) {
  const { tune, fx, sfx, haptic, say, form } = env;
  const theme = tune.theme === 'streetlamp' ? 'streetlamp' : 'stadium';
  const bandTune = { ...tune, phase: Math.random() * TAU };
  const phys = { ...tune, phase: Math.random() * TAU };
  const st = holdState(0.3);
  const held = new Set();
  let band = holdBand(0, bandTune);
  let cover = 0;
  let inside = 0;
  let elapsed = 0;
  let w = 1;
  let h = 1;
  let noteT = 0;
  let offT = 0;
  let inT = 0;
  // 홈런 공(경기장): 정해진 때에 UFO 를 툭 친다
  const kicks = [];
  for (let i = 0; i < (tune.kicks || 0); i++) {
    const span = (tune.duration - 2.6) / tune.kicks;
    kicks.push({ t: 1.6 + span * i + Math.random() * span * 0.6, dir: Math.random() < 0.5 ? -1 : 1, done: false });
  }
  const BALL_FLIGHT = 0.75;

  const gauge = () => ({ x: w - 58, y0: Math.max(118, h * 0.2), y1: h * 0.8, gw: 40 });
  const ufoAt = () => (theme === 'streetlamp' ? { x: w * 0.38, y: h * 0.42 } : { x: w * 0.4, y: h * 0.3 });

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    down(p) {
      held.add(p.id);
    },
    up(p) {
      held.delete(p.id);
    },
    release() {
      held.clear();
    },
    update(dt, info) {
      const t = info.t;
      elapsed = t;
      band = holdBand(t, bandTune);
      let kick = 0;
      for (const k of kicks) {
        if (!k.done && t >= k.t) {
          k.done = true;
          kick = k.dir * 1.1;
          const u = ufoAt();
          fx.pop(say('pop.kick'), u.x, u.y - 50, { color: '#ffd23f', size: 22 });
          fx.burst(u.x, u.y, '#ffffff', 10, { speed: 180, gravity: 200 });
          fx.shake(6, 0.2);
          sfx('poke');
          haptic('warn');
        }
      }
      // 큰 dt 에서도 물리가 튀지 않게 잘게 나눈다
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      for (let i = 0; i < steps; i++) holdStep(st, dt / steps, held.size > 0, phys, t - dt + ((i + 1) * dt) / steps, i === 0 ? kick : 0);
      cover = bandCover(st.v, band);
      inside += cover * dt;
      const u = ufoAt();
      if (cover > 0.5) {
        inT += dt;
        offT = 0;
        if (inT > 0.9 && noteT <= 0) {
          fx.burst(u.x, u.y + 20, '#dcffa6', 3, { star: true, gravity: -20, speed: 60 });
          noteT = 0.5;
        }
      } else {
        inT = 0;
        offT += dt;
        if (offT > 0.45 && noteT <= 0) {
          const above = st.v > band.center;
          fx.pop(say(above ? 'pop.bright' : 'pop.dim'), u.x, u.y - 52, { color: above ? '#ffe04f' : '#b8f1ff', size: 21 });
          haptic('tap');
          noteT = 1.3;
        }
      }
      noteT -= dt;
    },
    idle(dt, info) {
      band = holdBand(0, bandTune);
      void info;
    },
    probe: () => ({ v: st.v, vel: st.vel, center: band.center, half: band.half }),
    score: () => holdScore(elapsed > 0 ? inside / Math.max(elapsed, tune.duration * 0.98) : 0),
    meter: () => {
      const f = elapsed > 0.2 ? inside / elapsed : 0;
      return { v: elapsed > 0.2 ? holdScore(f) : 0, text: `${Math.round(f * 100)}%` };
    },
    draw(ctx, nw, nh, info) {
      w = nw;
      h = nh;
      const t = info.clock;
      const u = ufoAt();
      const lvl = st.v;
      const ok = cover > 0.5;
      if (theme === 'streetlamp') drawAlley(ctx, w, h, t, band.center, u, lvl, ok, cover, info, form, env.reduced);
      else drawStadium(ctx, w, h, t, band.center, u, lvl, ok, info, form, kicks, BALL_FLIGHT, env.reduced);
      vignette(ctx, w, h, '#0a0d2a', 0.4);
      drawGauge(ctx, gauge(), band, lvl, ok, t, held.size > 0);
      // 누르는 중 표시
      if (info.phase === 'play' && held.size > 0) {
        ctx.fillStyle = withAlpha('#fff6b2', 0.08);
        ctx.fillRect(0, 0, w, h);
      }
    },
  };
}

/** 세로 계기: 초록 칸과 지금 밝기. */
function drawGauge(ctx, g, band, lvl, ok, t, pressing) {
  const { x, y0, y1, gw } = g;
  const H = y1 - y0;
  const yOf = (v) => y1 - v * H;
  ctx.save();
  // 홈
  rrect(ctx, x - gw / 2, y0 - 6, gw, H + 12, gw / 2);
  ctx.fillStyle = OL;
  ctx.fill();
  rrect(ctx, x - gw / 2 + 4, y0 - 2, gw - 8, H + 4, gw / 2 - 4);
  const g2 = ctx.createLinearGradient(0, y0, 0, y1);
  g2.addColorStop(0, '#fff6b2');
  g2.addColorStop(1, '#2b3176');
  ctx.fillStyle = g2;
  ctx.fill();
  // 초록 칸
  const by0 = yOf(band.center + band.half);
  const by1 = yOf(band.center - band.half);
  rrect(ctx, x - gw / 2 + 2, by0, gw - 4, by1 - by0, 8);
  ctx.fillStyle = ok ? '#97e655' : 'rgba(127,214,75,0.75)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = ok ? '#dcffa6' : '#2a7a17';
  ctx.stroke();
  // 지금 밝기(화살표)
  const y = yOf(lvl);
  const px = x - gw / 2 - 6;
  ctx.fillStyle = ok ? '#ffffff' : '#ff8170';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px, y);
  ctx.lineTo(px - 18, y - 12);
  ctx.lineTo(px - 18, y + 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - gw / 2 + 3, y);
  ctx.lineTo(x + gw / 2 - 3, y);
  ctx.lineWidth = 5;
  ctx.strokeStyle = OL;
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = ok ? '#ffffff' : '#ff8170';
  ctx.stroke();
  // 위·아래 그림(해·달)
  bold(ctx, '☀', x, y0 - 22, 20, '#ffe04f');
  bold(ctx, '☾', x, y1 + 24, 20, '#b8f1ff');
  if (pressing) {
    ctx.fillStyle = withAlpha('#ffe04f', 0.25 + 0.15 * Math.sin(t * 20));
    ctx.beginPath();
    ctx.arc(px - 10, y, 22, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** 가로등 불빛(원뿔 + 땅의 동그라미). */
function lampLight(ctx, x, y, ground, k) {
  const a = clamp(k);
  const spread = 38 + a * 50;
  const g = ctx.createLinearGradient(0, y, 0, ground);
  g.addColorStop(0, withAlpha('#fff2a8', 0.15 + a * 0.55));
  g.addColorStop(1, withAlpha('#fff2a8', 0.02 + a * 0.12));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x + 10, y);
  ctx.lineTo(x + spread, ground);
  ctx.lineTo(x - spread, ground);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = withAlpha('#fff2a8', 0.1 + a * 0.4);
  ctx.beginPath();
  ctx.ellipse(x, ground, spread, 12, 0, 0, TAU);
  ctx.fill();
  softGlow(ctx, x, y, 22 + a * 34, 0.25 + a * 0.75);
}

function lampPost(ctx, x, top, ground) {
  ctx.fillStyle = '#3c4569';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  rrect(ctx, x - 5, top, 10, ground - top, 4);
  ctx.fill();
  ctx.stroke();
  rrect(ctx, x - 13, ground - 10, 26, 12, 4);
  ctx.fill();
  ctx.stroke();
}

function drawAlley(ctx, w, h, t, target, u, lvl, ok, cover, info, form, reduced) {
  vgrad(ctx, 0, 0, w, h, [
    [0, '#151b55'],
    [0.6, '#2e3784'],
    [1, '#1d2152'],
  ]);
  stars(ctx, w, h, t, { seed: 7, n: 40, area: 0.45 });
  const ground = h * 0.82;
  // 집들
  const houses = [
    [-0.02, 0.3, 0.2],
    [0.27, 0.24, 0.16],
    [0.5, 0.26, 0.22],
    [0.75, 0.3, 0.18],
  ];
  for (const [x0, hw, hh] of houses) {
    const x = x0 * w;
    const y = ground - hh * h;
    ctx.fillStyle = '#2a3170';
    ctx.fillRect(x, y, hw * w, hh * h);
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x + (hw * w) / 2, y - 30);
    ctx.lineTo(x + hw * w + 6, y);
    ctx.fillStyle = '#3a2a5a';
    ctx.fill();
    for (let k = 0; k < 2; k++) {
      const on = Math.sin(x0 * 40 + k * 3) > -0.2;
      ctx.fillStyle = on ? '#ffd97a' : '#3d4690';
      rrect(ctx, x + hw * w * (0.2 + k * 0.4), y + hh * h * 0.25, hw * w * 0.22, hh * h * 0.25, 3);
      ctx.fill();
    }
  }
  // 길
  ctx.fillStyle = '#383d70';
  ctx.fillRect(0, ground, w, h - ground);
  ctx.fillStyle = '#4a5090';
  ctx.fillRect(0, ground, w, 6);
  // 진짜 가로등 둘: 깜빡이며 밝기가 바뀐다(이게 목표 밝기)
  const flick = reduced ? 0 : Math.sin(t * 31) * 0.03;
  for (const lx of [w * 0.1, w * 0.64]) {
    lampPost(ctx, lx, h * 0.45, ground);
    lampLight(ctx, lx, h * 0.45, ground, target + flick);
    ctx.fillStyle = '#5a6496';
    ctx.strokeStyle = OL;
    ctx.lineWidth = 3;
    rrect(ctx, lx - 18, h * 0.45 - 14, 36, 14, 6);
    ctx.fill();
    ctx.stroke();
  }
  // UFO 가로등(기둥 위에 앉았다)
  lampPost(ctx, u.x, u.y + 18, ground);
  lampLight(ctx, u.x, u.y + 16, ground, lvl);
  ufo(ctx, u.x, u.y, 30, { form, t, mood: ok ? 'hide' : 'alert', lit: 0.2 + lvl * 0.8 });
  // 지나가는 사람(어긋나면 고개를 든다)
  const px = ((t * 26) % (w + 120)) - 60;
  const look = info.phase === 'play' && cover < 0.4 ? 1 : 0;
  person(ctx, 'walker', px, h * 0.93, Math.min(1.15, w / 340), { t, dir: 1, walk: look ? 0 : 1, look });
  if (look && Math.abs(px - u.x) < 140) bubble(ctx, px + 26, h * 0.93 - 90, '?', { fill: '#fff6b2', size: 18 });
}

function drawStadium(ctx, w, h, t, target, u, lvl, ok, info, form, kicks, flight, reduced) {
  vgrad(ctx, 0, 0, w, h, [
    [0, '#0f1446'],
    [0.42, '#26307a'],
    [0.43, '#3b2f6e'],
    [0.62, '#2a2460'],
    [0.63, '#3f9a4a'],
    [1, '#2f7a3a'],
  ]);
  stars(ctx, w, h, t, { seed: 13, n: 30, area: 0.3 });
  // 관중석(점점이 사람들, 사진기 번쩍)
  for (let r = 0; r < 5; r++) {
    const y = h * (0.45 + r * 0.033);
    for (let x = 8 + (r % 2) * 7; x < w; x += 14) {
      const k = Math.sin(x * 0.37 + r * 2.1);
      ctx.fillStyle = ['#ff8f6a', '#ffd23f', '#59c9ff', '#ff8fb0', '#f4f5fb'][Math.floor((k + 1) * 2.49)];
      const wave = reduced ? 0 : Math.max(0, Math.sin(t * 4 - x * 0.03)) * 3;
      ctx.beginPath();
      ctx.arc(x, y - wave, 4.5, 0, TAU);
      ctx.fill();
      if ((t * 1.3 + x * 0.7 + r) % 3.1 < 0.05) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y - 4, 7, 0, TAU);
        ctx.fill();
      }
    }
  }
  // 전광판
  const jw = Math.min(w * 0.32, 130);
  const jx = w * 0.64;
  const jy = h * 0.32;
  ctx.fillStyle = '#1b1f4a';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  rrect(ctx, jx - jw / 2, jy, jw, jw * 0.5, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = withAlpha('#ff8fb0', 0.6 + 0.3 * Math.sin(t * 3));
  ctx.font = `${Math.round(jw * 0.2)}px "Bagel Fat One", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♥ ♥', jx, jy + jw * 0.25);
  // 경기장(다이아몬드)
  const fy = h * 0.8;
  ctx.fillStyle = '#c9925a';
  ctx.beginPath();
  ctx.moveTo(w / 2, fy - h * 0.1);
  ctx.lineTo(w / 2 + w * 0.22, fy);
  ctx.lineTo(w / 2, fy + h * 0.1);
  ctx.lineTo(w / 2 - w * 0.22, fy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4fae52';
  ctx.beginPath();
  ctx.moveTo(w / 2, fy - h * 0.065);
  ctx.lineTo(w / 2 + w * 0.14, fy);
  ctx.lineTo(w / 2, fy + h * 0.065);
  ctx.lineTo(w / 2 - w * 0.14, fy);
  ctx.closePath();
  ctx.fill();
  for (const [bx, by] of [
    [0, -0.1],
    [0.22, 0],
    [0, 0.1],
    [-0.22, 0],
  ]) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w / 2 + bx * w - 5, fy + by * h - 5, 10, 10);
  }
  // 진짜 조명탑(목표 밝기)
  for (const lx of [w * 0.1]) {
    ctx.fillStyle = '#3c4569';
    ctx.strokeStyle = OL;
    ctx.lineWidth = 3;
    rrect(ctx, lx - 4, h * 0.14, 8, h * 0.3, 3);
    ctx.fill();
    ctx.stroke();
    lightBank(ctx, lx, h * 0.14, target);
  }
  // 조명탑 흉내 UFO(기둥 위)
  ctx.fillStyle = '#3c4569';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  rrect(ctx, u.x - 4, u.y + 14, 8, h * 0.44 - u.y, 3);
  ctx.fill();
  ctx.stroke();
  // 경기장으로 쏟아지는 빛
  ctx.fillStyle = withAlpha('#fff6c8', 0.05 + lvl * 0.22);
  ctx.beginPath();
  ctx.moveTo(u.x - 16, u.y + 8);
  ctx.lineTo(u.x + 16, u.y + 8);
  ctx.lineTo(w / 2 + w * 0.3, fy + h * 0.05);
  ctx.lineTo(w / 2 - w * 0.2, fy + h * 0.08);
  ctx.closePath();
  ctx.fill();
  softGlow(ctx, u.x, u.y + 6, 30 + lvl * 50, 0.15 + lvl * 0.75);
  ufo(ctx, u.x, u.y, 32, { form, t, mood: ok ? 'hide' : 'alert', lit: 0.2 + lvl * 0.8 });
  // 날아오는 홈런 공
  if (info.phase === 'play') {
    for (const k of kicks) {
      const dtk = k.t - info.t;
      if (dtk < 0 || dtk > flight) continue;
      const a = 1 - dtk / flight;
      const sx = w / 2;
      const sy = fy;
      const bx = lerp(sx, u.x, a);
      const by = lerp(sy, u.y, a) - Math.sin(a * Math.PI) * h * 0.18;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(bx, by, 7 + a * 4, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#e93c30';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(bx - 4, by, 5, -0.8, 0.8);
      ctx.stroke();
    }
  }
}

/** 둥글게 번지는 빛. */
function softGlow(ctx, x, y, r, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, withAlpha('#fff8d8', clamp(a)));
  g.addColorStop(0.4, withAlpha('#fff2a8', clamp(a) * 0.45));
  g.addColorStop(1, withAlpha('#fff2a8', 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function lightBank(ctx, x, y, k) {
  const a = clamp(k);
  softGlow(ctx, x, y, 40 + a * 50, 0.15 + a * 0.75);
  ctx.fillStyle = '#5a6496';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  rrect(ctx, x - 22, y - 16, 44, 26, 5);
  ctx.fill();
  ctx.stroke();
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      ctx.fillStyle = withAlpha('#fff6c8', 0.35 + a * 0.65);
      ctx.beginPath();
      ctx.arc(x - 12 + c * 12, y - 8 + r * 11, 4.2, 0, TAU);
      ctx.fill();
    }
  }
}
