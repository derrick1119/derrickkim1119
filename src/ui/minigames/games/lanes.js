// 이리저리 피하기: 세 갈래 길에서 좌우로 옮겨 헤드라이트·비행기·레이더를 피한다. (highway, airport)
import { TAU, withAlpha, rrect, clamp } from '../../../render/draw.js';
import { laneWaves, lanesScore } from '../score.js';
import { ufo, vgrad, vignette, OL } from '../art.js';

const CAR_COLORS = ['#ff6b5e', '#59c9ff', '#ffd23f', '#7fd64b', '#f4f5fb', '#b79cff'];

export function createLanes(env) {
  const { tune, fx, sfx, haptic, say, form } = env;
  const theme = tune.theme === 'airport' ? 'airport' : 'highway';
  const waves = laneWaves(Math.random, tune).map((wv, i) => ({ ...wv, color: CAR_COLORS[i % CAR_COLORS.length], judged: false, hit: false }));
  let lane = 1;
  let ux = 0;
  let w = 1;
  let h = 1;
  let hits = 0;
  let judged = 0;
  let shockT = 0;
  let playT = 0;
  let dragId = null;

  const road = () => {
    const rw = Math.min(w * 0.86, 360);
    return { x0: w / 2 - rw / 2, lw: rw / 3, rw };
  };
  const laneX = (i) => {
    const r = road();
    return r.x0 + r.lw * (i + 0.5);
  };
  const ufoY = () => h * 0.76;
  const speed = () => (ufoY() + 120) / tune.approach; // 화면 위에서 UFO 줄까지 approach 초
  const pick = (x) => {
    const r = road();
    return clamp(Math.floor((x - r.x0) / r.lw), 0, 2);
  };
  const setLane = (n) => {
    if (n === lane) return;
    lane = n;
    sfx('click');
    haptic('tap');
  };

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      ux = laneX(lane);
    },
    down(p) {
      if (p.key) return; // 키보드는 화살표로 옮긴다
      dragId = p.id;
      setLane(pick(p.x));
    },
    move(p) {
      if (p.id === dragId) setLane(pick(p.x));
    },
    up(p) {
      if (p.id === dragId) dragId = null;
    },
    key(k) {
      if (k === 'ArrowLeft') setLane(Math.max(0, lane - 1));
      else if (k === 'ArrowRight') setLane(Math.min(2, lane + 1));
    },
    release() {
      dragId = null;
    },
    update(dt, info) {
      playT = info.t;
      for (const wv of waves) {
        if (wv.judged || playT < wv.t) continue;
        wv.judged = true;
        judged++;
        if (wv.lanes.includes(lane)) {
          wv.hit = true;
          hits++;
          shockT = 0.6;
          fx.flash(0.6, theme === 'airport' && wv.kind === 'sweep' ? '#b8ffcf' : '#fff8d0');
          fx.shake(10, 0.28);
          fx.pop(say('pop.hit'), ux, ufoY() - 46, { color: '#ff8170', size: 28 });
          sfx('deny');
          haptic('spotted');
        } else {
          const near = wv.lanes.some((l) => Math.abs(l - lane) === 1);
          if (near) fx.pop(say('pop.dodge'), ux + (Math.random() < 0.5 ? -40 : 40), ufoY() - 30, { color: '#b8f1ff', size: 18, life: 0.6 });
          sfx('auto');
        }
      }
      shockT = Math.max(0, shockT - dt);
    },
    probe: () => {
      const next = waves.find((wv) => !wv.judged);
      const free = next ? [0, 1, 2].filter((l) => !next.lanes.includes(l)) : [lane];
      return { lane, free: free.includes(lane) ? lane : free[0], hits, until: next ? next.t - playT : null };
    },
    score: () => lanesScore({ hits, total: waves.length }),
    meter: () => ({ v: lanesScore({ hits, total: waves.length }), text: `${judged - hits}/${judged}` }),
    draw(ctx, nw, nh, info) {
      w = nw;
      h = nh;
      const t = info.clock;
      const dt = 1 / 60;
      ux += (laneX(lane) - ux) * Math.min(1, dt * 22);
      const r = road();
      const y = ufoY();
      const v = speed();
      const scroll = (info.phase === 'play' ? playT : 0) * v;
      if (theme === 'highway') drawHighway(ctx, w, h, r, scroll, t);
      else drawRunway(ctx, w, h, r, scroll, t);

      // 다가오는 것들
      for (const wv of waves) {
        const dy = (wv.t - playT) * v; // UFO 줄까지 남은 거리
        if (dy > y + 200 || dy < -h * 0.4) continue;
        if (wv.kind === 'sweep') drawSweep(ctx, r, wv, y - dy, t);
        else for (const l of wv.lanes) (theme === 'highway' ? drawCar : drawPlane)(ctx, laneX(l), y - dy, r.lw, wv.color, wv.hit);
      }

      // 칸 표시(지금 칸이 빛난다)
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = withAlpha(i === lane ? '#6ff2ff' : '#ffffff', i === lane ? 0.22 : 0.06);
        rrect(ctx, laneX(i) - r.lw * 0.42, y - 30, r.lw * 0.84, 60, 14);
        ctx.fill();
      }
      // UFO
      const bob = env.reduced ? 0 : Math.sin(t * 4) * 2;
      ctx.fillStyle = 'rgba(10,12,40,0.35)';
      ctx.beginPath();
      ctx.ellipse(ux, y + 30, 30, 9, 0, 0, TAU);
      ctx.fill();
      ufo(ctx, ux + (shockT > 0 && !env.reduced ? Math.sin(t * 70) * 3 : 0), y + bob, Math.min(36, r.lw * 0.38), {
        form,
        t,
        mood: shockT > 0 ? 'shock' : 'idle',
        lit: shockT > 0 ? 1 : 0.4,
        tilt: (laneX(lane) - ux) * -0.004,
      });
      // 화살표 힌트(첫 1.5초)
      if (info.phase !== 'play' || playT < 1.5) {
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = OL;
        ctx.lineWidth = 3;
        for (const s of [-1, 1]) {
          const ax = ux + s * (r.lw * 0.62 + (env.reduced ? 0 : Math.sin(t * 6) * 4));
          ctx.beginPath();
          ctx.moveTo(ax + s * 12, y);
          ctx.lineTo(ax - s * 4, y - 12);
          ctx.lineTo(ax - s * 4, y + 12);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
      vignette(ctx, w, h, '#05071e', 0.5);
    },
  };
}

// ───────── 고속도로 ─────────

function drawHighway(ctx, w, h, r, scroll, t) {
  vgrad(ctx, 0, 0, w, h, [
    [0, '#1e2a3c'],
    [1, '#2b3a4c'],
  ]);
  // 길가 풀밭과 나무(지나간다)
  ctx.fillStyle = '#1f4a3a';
  ctx.fillRect(0, 0, r.x0 - 8, h);
  ctx.fillRect(r.x0 + r.rw + 8, 0, w, h);
  for (const side of [0, 1]) {
    for (let k = -1; k < h / 90 + 1; k++) {
      const y = ((k * 90 + scroll * 0.9) % (h + 90)) - 45;
      const x = side ? r.x0 + r.rw + 26 : r.x0 - 26;
      ctx.fillStyle = '#2f6a44';
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, TAU);
      ctx.fill();
      // 가로등 불빛
      if (k % 2 === 0) {
        ctx.fillStyle = 'rgba(255,220,140,0.18)';
        ctx.beginPath();
        ctx.arc(side ? r.x0 + r.rw : r.x0, y + 40, 40, 0, TAU);
        ctx.fill();
      }
    }
  }
  // 아스팔트
  ctx.fillStyle = '#3a4152';
  ctx.fillRect(r.x0, 0, r.rw, h);
  // 가드레일
  ctx.fillStyle = '#c9cfe8';
  ctx.fillRect(r.x0 - 8, 0, 6, h);
  ctx.fillRect(r.x0 + r.rw + 2, 0, 6, h);
  // 차선(점선)
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 1; i < 3; i++) {
    const x = r.x0 + r.lw * i - 3;
    for (let y = (scroll % 70) - 70; y < h; y += 70) ctx.fillRect(x, y, 6, 36);
  }
  void t;
}

function drawCar(ctx, x, y, lw, color, hit) {
  const cw = lw * 0.5;
  const cl = cw * 1.7;
  const beam = cl * 1.25;
  // 헤드라이트(아래쪽으로 뻗는다): 빛의 가운데가 y 에 온다
  const front = y - beam / 2;
  const g = ctx.createLinearGradient(0, front, 0, front + beam);
  g.addColorStop(0, withAlpha(hit ? '#ffffff' : '#fff6b2', 0.75));
  g.addColorStop(1, withAlpha('#fff6b2', 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - cw * 0.4, front);
  ctx.lineTo(x + cw * 0.4, front);
  ctx.lineTo(x + cw * 0.95, front + beam);
  ctx.lineTo(x - cw * 0.95, front + beam);
  ctx.closePath();
  ctx.fill();
  // 차체(위에서 본 모습)
  const top = front - cl;
  ctx.fillStyle = color;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  rrect(ctx, x - cw / 2, top, cw, cl, cw * 0.3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#9fe8ff';
  rrect(ctx, x - cw * 0.36, top + cl * 0.55, cw * 0.72, cl * 0.22, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  rrect(ctx, x - cw * 0.36, top + cl * 0.12, cw * 0.72, cl * 0.32, 4);
  ctx.fill();
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#fff8d0';
    ctx.beginPath();
    ctx.arc(x + s * cw * 0.3, front - 2, 4, 0, TAU);
    ctx.fill();
  }
}

// ───────── 공항 ─────────

function drawRunway(ctx, w, h, r, scroll, t) {
  vgrad(ctx, 0, 0, w, h, [
    [0, '#101640'],
    [1, '#1c2558'],
  ]);
  // 풀밭과 유도로 불빛
  ctx.fillStyle = '#183a3a';
  ctx.fillRect(0, 0, r.x0 - 10, h);
  ctx.fillRect(r.x0 + r.rw + 10, 0, w, h);
  // 활주로
  ctx.fillStyle = '#343a58';
  ctx.fillRect(r.x0 - 10, 0, r.rw + 20, h);
  // 가장자리 파란 불빛
  for (let y = (scroll % 48) - 48; y < h; y += 48) {
    for (const x of [r.x0 - 4, r.x0 + r.rw + 4]) {
      ctx.fillStyle = 'rgba(90,150,255,0.35)';
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#9fc4ff';
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, TAU);
      ctx.fill();
    }
  }
  // 칸 사이 선과 가운데 숫자 표시
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 1; i < 3; i++) {
    const x = r.x0 + r.lw * i - 2;
    for (let y = (scroll % 90) - 90; y < h; y += 90) ctx.fillRect(x, y, 4, 50);
  }
  const ny = ((scroll * 1) % (h + 300)) - 150;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.font = `${Math.round(r.lw * 0.6)}px "Bagel Fat One", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('09', w / 2, ny);
  ctx.restore();
  // 관제탑 불빛(오른쪽 위)
  const on = 0.5 + 0.5 * Math.sin(t * 3);
  ctx.fillStyle = withAlpha('#ff5747', 0.4 + on * 0.5);
  ctx.beginPath();
  ctx.arc(w - 22, 120, 6, 0, TAU);
  ctx.fill();
}

function drawPlane(ctx, x, y, lw, color, hit) {
  const s = lw * 0.62;
  const beam = s * 1.3;
  const front = y - beam / 2;
  // 착륙등
  const g = ctx.createLinearGradient(0, front, 0, front + beam);
  g.addColorStop(0, withAlpha(hit ? '#ffffff' : '#e8f4ff', 0.8));
  g.addColorStop(1, withAlpha('#e8f4ff', 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.15, front);
  ctx.lineTo(x + s * 0.15, front);
  ctx.lineTo(x + s * 0.6, front + beam);
  ctx.lineTo(x - s * 0.6, front + beam);
  ctx.closePath();
  ctx.fill();
  // 비행기(위에서 본 모습, 코가 아래)
  ctx.save();
  ctx.translate(x, front - s * 0.9);
  ctx.fillStyle = '#f4f5fb';
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  // 날개
  ctx.beginPath();
  ctx.moveTo(-s * 0.95, -s * 0.05);
  ctx.lineTo(s * 0.95, -s * 0.05);
  ctx.lineTo(s * 0.12, s * 0.35);
  ctx.lineTo(-s * 0.12, s * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 꼬리날개
  ctx.beginPath();
  ctx.moveTo(-s * 0.4, -s * 0.78);
  ctx.lineTo(s * 0.4, -s * 0.78);
  ctx.lineTo(0, -s * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 몸통
  rrect(ctx, -s * 0.14, -s * 0.9, s * 0.28, s * 1.8, s * 0.14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillRect(-s * 0.13, -s * 0.2, s * 0.26, s * 0.12);
  // 날개 끝 불빛
  ctx.fillStyle = '#ff5747';
  ctx.beginPath();
  ctx.arc(-s * 0.95, -s * 0.05, 3.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#7fd64b';
  ctx.beginPath();
  ctx.arc(s * 0.95, -s * 0.05, 3.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawSweep(ctx, r, wv, y, t) {
  // 레이더 띠: 막힌 칸을 가로지르는 초록 빛, 빈 칸은 비어 있다
  for (const l of wv.lanes) {
    const x = r.x0 + r.lw * l;
    const g = ctx.createLinearGradient(0, y - 36, 0, y + 36);
    g.addColorStop(0, 'rgba(90,255,160,0)');
    g.addColorStop(0.5, wv.hit ? 'rgba(220,255,230,0.85)' : 'rgba(90,255,160,0.6)');
    g.addColorStop(1, 'rgba(90,255,160,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x + 2, y - 36, r.lw - 4, 72);
    ctx.fillStyle = 'rgba(200,255,220,0.9)';
    ctx.fillRect(x + 2, y - 2, r.lw - 4, 4);
    // 주사선
    ctx.fillStyle = 'rgba(200,255,220,0.35)';
    for (let k = -30; k < 30; k += 8) ctx.fillRect(x + 4, y + k + ((t * 40) % 8), r.lw - 8, 1.5);
  }
}
