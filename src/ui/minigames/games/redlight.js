// 얼음 땡: 꾹 누르면 살금살금 앞으로, 지구인(점원·망원경)이 돌아보면 손을 뗀다. (cvs, telescope)
import { TAU, withAlpha, rrect, lerp, clamp, easeInOut } from '../../../render/draw.js';
import { headOffset } from '../../../render/people.js';
import { redlightSchedule, redlightPhase, redlightSpeed, redlightState, redlightStep, redlightScore } from '../score.js';
import { ufo, person, vgrad, stars, vignette, cone, chip, bubble, OL } from '../art.js';

const PHASE_FILL = { away: '#7fd64b', tell: '#ffc21f', look: '#ff5747' };
const CLERK = 'walker';
const CLERK_SCALE = 1.05;

export function createRedlight(env) {
  const { tune, fx, sfx, haptic, say, form } = env;
  const sched = redlightSchedule(Math.random, tune);
  const rt = { ...tune, speed: redlightSpeed(sched, tune.duration, tune.margin) };
  const st = redlightState();
  const held = new Set();
  let ph = redlightPhase(sched, 0);
  let lastPhase = 'away';
  let lastCycle = 0;
  let ufoX = 0;
  let ufoY = 0;
  let caughtT = 0;
  let goalT = 0;
  let aim = -0.9; // 망원경 각도(라디안, 0 = 위)
  let w = 1;
  let h = 1;
  let feintNote = 0;
  const theme = tune.theme === 'telescope' ? 'telescope' : 'cvs';

  const track = () => ({ x0: w * 0.13, x1: w * 0.87, y: h * 0.31 });
  const domeR = () => Math.min(w, 390) * 0.2;
  const pivot = () => ({ x: w * 0.5, y: h * 0.86 - domeR() * 0.9 });
  /** 시선이 시작되는 곳: 점원의 머리, 또는 망원경 끝. */
  const eyePos = () => {
    if (theme === 'cvs') {
      const s = CLERK_SCALE * Math.min(1.3, w / 330);
      const o = headOffset(CLERK, s);
      return { x: w * 0.5 + o.x, y: h * 0.86 + o.y };
    }
    const p = pivot();
    const len = domeR() * 1.58;
    return { x: p.x + Math.sin(aim) * len, y: p.y - Math.cos(aim) * len };
  };

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
      const ev = redlightStep(st, dt, held.size > 0, sched, rt);
      ph = redlightPhase(sched, st.t);
      if (ph.phase !== lastPhase || ph.cycle !== lastCycle) {
        if (ph.phase === 'tell') {
          sfx('notice');
          haptic('warn');
        } else if (ph.phase === 'look') sfx('gaze');
        else if (lastPhase === 'tell' && ph.phase === 'away') {
          feintNote = 1.1; // 예고만 하고 돌아섰다
          sfx('safe');
        }
        lastPhase = ph.phase;
        lastCycle = ph.cycle;
      }
      feintNote = Math.max(0, feintNote - dt);
      if (ev === 'caught') {
        caughtT = 0.9;
        fx.flash(0.75);
        fx.shake(11, 0.3);
        fx.pop(say('pop.caught'), ufoX, ufoY - 40, { color: '#ff8170', size: 30 });
        fx.burst(ufoX, ufoY, '#ffffff', 14, { speed: 220, gravity: 0, life: 0.45 });
        sfx('deny');
        haptic('spotted');
      } else if (ev === 'goal') {
        goalT = 1;
        fx.pop(say('pop.goal'), ufoX, ufoY - 44, { color: '#ffe04f', size: 32 });
        fx.burst(ufoX, ufoY, '#fff6b2', 22, { star: true, gravity: 40 });
        sfx('buy');
        haptic('good');
      }
      caughtT = Math.max(0, caughtT - dt);
      goalT = Math.max(0, goalT - dt);
      void info;
    },
    probe: () => ({ watch: ph.phase, progress: st.progress, catches: st.catches }),
    done: () => st.progress >= 1 && goalT < 0.45,
    score: () => redlightScore(st),
    meter: () => ({ v: redlightScore(st), text: `${Math.round(st.progress * 100)}%` }),
    draw(ctx, nw, nh, info) {
      w = nw;
      h = nh;
      const t = info.clock;
      const tr = track();
      const goalX = tr.x1;
      ufoX = lerp(tr.x0, tr.x1, st.progress);
      const bob = env.reduced ? 0 : Math.sin(t * 3) * 3;
      ufoY = tr.y + bob;

      // 하늘과 땅
      if (theme === 'cvs') drawTown(ctx, w, h, t);
      else drawObservatorySky(ctx, w, h, t);

      // 길(점선)과 도착 깃발
      ctx.save();
      ctx.setLineDash([2, 14]);
      ctx.lineCap = 'round';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.moveTo(tr.x0, tr.y + 34);
      ctx.lineTo(tr.x1, tr.y + 34);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#6ff2ff';
      ctx.beginPath();
      ctx.moveTo(tr.x0, tr.y + 34);
      ctx.lineTo(ufoX, tr.y + 34);
      ctx.stroke();
      ctx.restore();
      drawGoal(ctx, goalX, tr.y, t, st.progress >= 1);

      // 감시자
      const looking = ph.phase === 'look';
      const tellK = ph.phase === 'tell' ? clamp(ph.since / Math.max(0.05, tune.tell)) : 0;
      if (theme === 'telescope') {
        const pv = pivot();
        const toUfo = Math.atan2(ufoX - pv.x, pv.y - ufoY);
        const rest = ph.cycle % 2 ? 1.05 : -1.05;
        let target = rest;
        if (ph.phase === 'tell') target = ph.feint ? lerp(rest, toUfo, 0.45 * Math.sin(tellK * Math.PI)) : lerp(rest, toUfo, easeInOut(tellK) * 0.8);
        else if (looking) target = toUfo;
        aim += (target - aim) * Math.min(1, info.phase === 'play' ? 0.16 : 0.08);
      }
      if (theme === 'cvs') drawStore(ctx, w, h, t, ph, tellK, caughtT);
      else drawDome(ctx, w, h, t, aim, ph, caughtT);
      const eye = eyePos();
      if (looking) {
        const caught = caughtT > 0;
        const len = Math.hypot(ufoX - eye.x, ufoY - eye.y);
        const ang = theme === 'telescope' ? aim : Math.atan2(ufoX - eye.x, eye.y - ufoY);
        const ex = eye.x + Math.sin(ang) * len * 1.05;
        const ey = eye.y - Math.cos(ang) * len * 1.05;
        cone(ctx, eye.x, eye.y, ex, ey, 6, 60, caught ? '#ff5747' : '#fff2a8', caught ? 0.55 : 0.4);
      } else if (ph.phase === 'tell' && !env.reduced) {
        // 예고: 시선이 아직 다른 곳을 향한 채 깜빡인다
        const ang = theme === 'telescope' ? aim : -0.5;
        ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 30);
        cone(ctx, eye.x, eye.y, eye.x + Math.sin(ang) * 150, eye.y - Math.cos(ang) * 150, 5, 30, '#ffc21f', 0.5);
        ctx.globalAlpha = 1;
      }

      // 말풍선(감시자 머리 위)
      const bx = eye.x + 34;
      const by = eye.y - 56;
      if (ph.phase === 'tell') bubble(ctx, bx, by, '?', { fill: '#fff6b2', scale: Math.min(1, ph.since * 6) });
      else if (looking) bubble(ctx, bx, by, '!', { fill: caughtT > 0 ? '#ff8170' : '#ffffff', scale: Math.min(1, ph.since * 8) });
      else if (theme === 'cvs' && info.phase === 'play') bubble(ctx, bx, by, '♪', { fill: '#dcffa6', size: 18, scale: 0.85 + 0.08 * Math.sin(t * 5) });

      // 들킨 횟수(빨간 눈)
      for (let i = 0; i < st.catches; i++) drawEye(ctx, tr.x0 + i * 26, tr.y + 62);

      // UFO
      const moving = st.moving;
      const mood = caughtT > 0 ? 'shock' : goalT > 0 || st.progress >= 1 ? 'happy' : moving ? 'happy' : 'hide';
      if (moving && !env.reduced) {
        for (let i = 1; i <= 3; i++) {
          ctx.fillStyle = withAlpha('#6ff2ff', 0.16 / i);
          ctx.beginPath();
          ctx.ellipse(ufoX - i * 16, ufoY + 4, 26, 8, 0, 0, TAU);
          ctx.fill();
        }
      }
      ufo(ctx, ufoX + (caughtT > 0 && !env.reduced ? Math.sin(t * 60) * 3 : 0), ufoY, 36, {
        form,
        t,
        mood,
        lit: moving || caughtT > 0 ? 1 : 0.12,
        tilt: moving && !env.reduced ? 0.12 : 0,
      });

      // 단계 표시
      if (info.phase === 'play') {
        const key = feintNote > 0 && ph.phase === 'away' ? 'feint' : ph.phase;
        const sh = ph.phase === 'tell' && !env.reduced ? Math.sin(t * 40) * 3 : 0;
        const pop = ph.since < 0.2 && !env.reduced ? 1 + (0.2 - ph.since) * 1.2 : 1;
        chip(ctx, say(`phase.${key}`), w / 2 + sh, Math.max(126, h * 0.17), { fill: PHASE_FILL[ph.phase], size: 20, scale: pop });
      }
      vignette(ctx, w, h, '#0a0d2a', looking ? 0.65 : 0.45);
      if (looking) {
        ctx.fillStyle = withAlpha('#ff2a1a', 0.07 + 0.04 * Math.sin(t * 8));
        ctx.fillRect(0, 0, w, h);
      }
    },
  };
}

function drawGoal(ctx, x, y, t, reached) {
  ctx.save();
  const r = 30 + Math.sin(t * 4) * 3;
  ctx.strokeStyle = withAlpha(reached ? '#ffe04f' : '#ffffff', 0.7);
  ctx.setLineDash([6, 8]);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  // 깃발
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 22, y + 34);
  ctx.lineTo(x + 22, y - 16);
  ctx.stroke();
  ctx.fillStyle = reached ? '#ffe04f' : '#7fd64b';
  ctx.beginPath();
  ctx.moveTo(x + 22, y - 16);
  ctx.lineTo(x + 44, y - 8 + Math.sin(t * 6) * 2);
  ctx.lineTo(x + 22, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawEye(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(x, y, 11, 7, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e93c30';
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ───────── 편의점 ─────────

function drawTown(ctx, w, h, t) {
  vgrad(ctx, 0, 0, w, h, [
    [0, '#1b2266'],
    [0.5, '#34408f'],
    [0.66, '#5a5aa8'],
    [0.67, '#2a2f63'],
    [1, '#1c2050'],
  ]);
  stars(ctx, w, h, t, { seed: 11, n: 50, area: 0.55 });
  // 달
  ctx.fillStyle = '#fff6d0';
  ctx.beginPath();
  ctx.arc(w * 0.18, h * 0.16, 20, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1f2770';
  ctx.beginPath();
  ctx.arc(w * 0.18 + 8, h * 0.16 - 5, 17, 0, TAU);
  ctx.fill();
  // 건물 그림자와 창문
  const base = h * 0.67;
  const blds = [
    [0, 0.2, 0.17],
    [0.17, 0.13, 0.11],
    [0.3, 0.16, 0.15],
    [0.62, 0.12, 0.16],
    [0.74, 0.14, 0.1],
    [0.88, 0.14, 0.19],
  ];
  for (const [x0, bw, bh] of blds) {
    const x = x0 * w;
    const y = base - bh * h;
    ctx.fillStyle = '#232a66';
    ctx.fillRect(x, y, bw * w + 1, bh * h + 1);
    for (let yy = y + 10; yy < base - 10; yy += 16) {
      for (let xx = x + 8; xx < x + bw * w - 8; xx += 14) {
        const on = Math.sin(xx * 12.9 + yy * 7.3) > 0.3;
        ctx.fillStyle = on ? 'rgba(255,226,140,0.75)' : 'rgba(120,130,200,0.25)';
        ctx.fillRect(xx, yy, 6, 8);
      }
    }
  }
  // 길
  ctx.fillStyle = '#3a3f74';
  ctx.fillRect(0, h * 0.93, w, h * 0.07);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  for (let x = ((t * 0) % 40) - 10; x < w; x += 46) ctx.fillRect(x, h * 0.965, 24, 4);
}

function drawStore(ctx, w, h, t, ph, tellK, caughtT) {
  const sw = Math.min(w * 0.86, 380);
  const x = w / 2 - sw / 2;
  const y = h * 0.6;
  const bh = h * 0.33;
  // 바닥 불빛
  const g = ctx.createRadialGradient(w / 2, y + bh, 10, w / 2, y + bh, sw * 0.7);
  g.addColorStop(0, 'rgba(255,248,200,0.5)');
  g.addColorStop(1, 'rgba(255,248,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, y, w, h - y);
  // 건물
  ctx.fillStyle = '#e9ecf8';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  rrect(ctx, x, y, sw, bh, 8);
  ctx.fill();
  ctx.stroke();
  // 간판 띠(줄무늬)
  const sh = bh * 0.16;
  const stripes = ['#4fb4ff', '#ffffff', '#7fd64b', '#ffffff', '#ff8f6a'];
  stripes.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + 3, y + 3 + (i * sh) / stripes.length, sw - 6, sh / stripes.length + 0.5);
  });
  ctx.strokeRect(x, y, sw, sh + 3);
  // 간판 '24'
  ctx.save();
  ctx.font = `${Math.round(sh * 0.72)}px "Bagel Fat One", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 5;
  ctx.strokeStyle = OL;
  ctx.strokeText('24', x + sw * 0.12, y + sh * 0.58);
  ctx.fillStyle = '#ffe04f';
  ctx.fillText('24', x + sw * 0.12, y + sh * 0.58);
  ctx.restore();
  // 큰 유리창(안이 환하다)
  const wx = x + 12;
  const wy = y + sh + 12;
  const ww = sw * 0.68;
  const wh = bh - sh - 24;
  ctx.fillStyle = '#fffbe2';
  rrect(ctx, wx, wy, ww, wh, 6);
  ctx.fill();
  ctx.save();
  rrect(ctx, wx, wy, ww, wh, 6);
  ctx.clip();
  // 진열대
  for (let i = 0; i < 3; i++) {
    const yy = wy + wh * (0.22 + i * 0.2);
    ctx.fillStyle = '#c9cfe8';
    for (const sx of [wx + ww * 0.04, wx + ww * 0.6]) {
      ctx.fillStyle = '#c9cfe8';
      ctx.fillRect(sx, yy, ww * 0.36, 5);
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = ['#ff8f6a', '#ffd23f', '#7fd64b', '#59c9ff', '#ff8fb0', '#b79cff'][(k + i + (sx > wx + 10 ? 2 : 0)) % 6];
        ctx.fillRect(sx + 4 + k * ww * 0.07, yy - 12, ww * 0.05, 12);
      }
    }
  }
  // 점원(계산대 뒤)
  const s = CLERK_SCALE * Math.min(1.3, w / 330);
  const shake = ph.phase === 'tell' ? Math.sin(t * 38) * 2.5 * (1 - tellK * 0.5) : 0;
  const look = ph.phase === 'look' ? Math.min(1, ph.since * 6) : ph.phase === 'tell' ? tellK * 0.25 : 0;
  person(ctx, CLERK, w / 2 + shake, h * 0.86, s, {
    t,
    dir: ph.phase === 'away' ? -1 : 1,
    look,
    shock: caughtT > 0,
    walk: 0,
  });
  // 계산대
  ctx.fillStyle = '#ff8f6a';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  const cw = Math.min(ww * 0.7, 150);
  rrect(ctx, w / 2 - cw / 2, h * 0.86 - 15 * s, cw, wh, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd0c0';
  ctx.fillRect(w / 2 - cw / 2 + 4, h * 0.86 - 15 * s + 4, cw - 8, 6);
  // 계산대 위 금전등록기
  ctx.fillStyle = '#5a6496';
  ctx.strokeStyle = OL;
  rrect(ctx, w / 2 - cw * 0.42, h * 0.86 - 15 * s - 20, 34, 20, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7fd64b';
  ctx.fillRect(w / 2 - cw * 0.42 + 6, h * 0.86 - 15 * s - 15, 22, 6);
  // 유리 반사
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(wx + ww * 0.1, wy);
  ctx.lineTo(wx + ww * 0.22, wy);
  ctx.lineTo(wx + ww * 0.08, wy + wh);
  ctx.lineTo(wx - ww * 0.04, wy + wh);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  rrect(ctx, wx, wy, ww, wh, 6);
  ctx.stroke();
  // 자동문
  const dx = wx + ww + 10;
  const dw = x + sw - 12 - dx;
  ctx.fillStyle = '#cfefff';
  rrect(ctx, dx, wy, dw, wh, 4);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(dx + dw / 2, wy);
  ctx.lineTo(dx + dw / 2, wy + wh);
  ctx.stroke();
}

// ───────── 천문대 ─────────

function drawObservatorySky(ctx, w, h, t) {
  vgrad(ctx, 0, 0, w, h, [
    [0, '#0d1340'],
    [0.55, '#1f2a78'],
    [0.75, '#34418f'],
    [1, '#141a4a'],
  ]);
  // 은하수
  ctx.save();
  ctx.translate(w * 0.5, h * 0.35);
  ctx.rotate(-0.5);
  const g = ctx.createLinearGradient(0, -60, 0, 60);
  g.addColorStop(0, 'rgba(190,170,255,0)');
  g.addColorStop(0.5, 'rgba(190,170,255,0.22)');
  g.addColorStop(1, 'rgba(190,170,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-w, -60, w * 2, 120);
  ctx.restore();
  stars(ctx, w, h, t, { seed: 23, n: 110, area: 0.75 });
  // 언덕
  ctx.fillStyle = '#1b2a5c';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.78);
  ctx.quadraticCurveTo(w * 0.25, h * 0.7, w * 0.5, h * 0.74);
  ctx.quadraticCurveTo(w * 0.8, h * 0.78, w, h * 0.72);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#243a6e';
  ctx.fillRect(0, h * 0.84, w, h * 0.16);
}

function drawDome(ctx, w, h, t, aim, ph, caughtT) {
  const x = w * 0.5;
  const base = h * 0.86;
  const r = Math.min(w, 390) * 0.2;
  const domeY = base - r * 0.9;
  ctx.save();
  // 망원경 통(돔 뒤)
  ctx.save();
  ctx.translate(x, domeY);
  ctx.rotate(aim);
  ctx.fillStyle = '#c9cfe8';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  rrect(ctx, -11, -r * 1.55, 22, r * 1.4, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#59c9ff';
  ctx.beginPath();
  ctx.ellipse(0, -r * 1.55, 12, 5, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  if (ph.phase === 'look') {
    ctx.fillStyle = withAlpha(caughtT > 0 ? '#ff5747' : '#fff2a8', 0.8);
    ctx.beginPath();
    ctx.arc(0, -r * 1.58, 8, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // 건물
  ctx.fillStyle = '#e9ecf8';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  rrect(ctx, x - r * 1.05, domeY, r * 2.1, base - domeY, 6);
  ctx.fill();
  ctx.stroke();
  // 돔
  const wob = ph.phase === 'tell' ? Math.sin(t * 36) * 0.03 : 0;
  ctx.save();
  ctx.translate(x, domeY);
  ctx.rotate(wob);
  const dg = ctx.createLinearGradient(-r, -r, r, 0);
  dg.addColorStop(0, '#ffffff');
  dg.addColorStop(1, '#aab3da');
  ctx.fillStyle = dg;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.1, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 틈
  ctx.save();
  ctx.rotate(aim * 0.55);
  ctx.fillStyle = '#1f2350';
  ctx.fillRect(-9, -r * 1.08, 18, r * 0.9);
  ctx.restore();
  ctx.restore();
  // 문과 창
  ctx.fillStyle = '#ffe9a0';
  rrect(ctx, x - 10, base - 34, 20, 34, 4);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
