// 박자 맞추기: 불꽃이 터지는 순간·기상캐스터가 손짓하는 순간에 톡. 빛을 맞춰 섞여 든다. (fireworks, forecast)
import { TAU, withAlpha, rrect, lerp, clamp, easeOut } from '../../../render/draw.js';
import { rhythmChart, rhythmState, rhythmTap, rhythmExpire, rhythmScore, WINDOWS } from '../score.js';
import { ufo, person, vgrad, stars, vignette, bubble, bold, twinkle, OL } from '../art.js';

const JUDGE_COLOR = { perfect: '#ffe04f', good: '#97e655', ok: '#b8f1ff', miss: '#ff8170' };
const FIRE_COLORS = ['#ff6b5e', '#ffd23f', '#6ff2ff', '#ff8fb0', '#97e655', '#b79cff'];
const ICONS = ['sun', 'cloud', 'rain', 'snow', 'bolt'];

export function createRhythm(env) {
  const { tune, fx, sfx, haptic, say, form } = env;
  const theme = tune.theme === 'forecast' ? 'forecast' : 'fireworks';
  const notes = rhythmChart(Math.random, tune);
  const st = rhythmState(notes);
  // 음표마다 자리(정규 좌표)와 색
  const spots = [];
  let prev = { x: 0.5, y: 0.4 };
  for (let i = 0; i < notes.length; i++) {
    let p;
    for (let k = 0; k < 12; k++) {
      p = { x: 0.2 + Math.random() * 0.6, y: theme === 'forecast' ? 0.3 + Math.random() * 0.3 : 0.24 + Math.random() * 0.3 };
      if (Math.hypot(p.x - prev.x, (p.y - prev.y) * 1.6) > 0.24) break;
    }
    spots.push({ ...p, color: FIRE_COLORS[i % FIRE_COLORS.length], icon: ICONS[i % ICONS.length], fired: false });
    prev = p;
  }
  let w = 1;
  let h = 1;
  let playT = 0;
  let glowT = 0;
  let glowColor = '#ffffff';
  let pointT = -9; // 기상캐스터가 마지막으로 손짓한 때
  let pointAt = { x: 0.5, y: 0.4 };
  const field = () => ({ x0: w * 0.08, x1: w * 0.92, y0: h * 0.2, y1: theme === 'forecast' ? h * 0.66 : h * 0.62 });
  const at = (s) => {
    const f = field();
    return { x: lerp(f.x0, f.x1, s.x), y: lerp(h * 0.1, h * 0.9, s.y) };
  };
  const ufoPos = () => (theme === 'forecast' ? { x: w * 0.36, y: h * 0.5 } : { x: w * 0.5, y: h * 0.7 });

  const judgeFx = (i, judge) => {
    const p = at(spots[i]);
    const c = JUDGE_COLOR[judge];
    fx.pop(say(`pop.${judge}`), p.x, p.y - 38, { color: c, size: judge === 'perfect' ? 28 : 23 });
    if (judge !== 'miss') {
      glowT = 0.45;
      glowColor = spots[i].color;
      if (judge === 'perfect') fx.burst(p.x, p.y, '#fff6b2', 10, { star: true, gravity: 30, speed: 140 });
      sfx(judge === 'perfect' ? 'collect' : judge === 'good' ? 'coin' : 'poke', { tier: Math.min(9, st.combo) });
      haptic(judge === 'perfect' ? 'good' : 'tap');
      if (st.combo >= 3 && st.combo % 2 === 1) {
        const u = ufoPos();
        fx.pop(say('pop.combo', { n: st.combo }), u.x, u.y + 50, { color: '#ffffff', size: 18, rise: 20 });
      }
    } else haptic('warn');
  };

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    down(p) {
      const r = rhythmTap(st, p.time);
      if (r.judge === 'stray') {
        fx.pop(say('pop.stray'), p.x, p.y - 20, { color: '#c9cfe8', size: 16, life: 0.5, rise: 20 });
        sfx('deny');
        return;
      }
      judgeFx(r.index, r.judge);
    },
    update(dt, info) {
      playT = info.t;
      for (const i of rhythmExpire(st, playT)) judgeFx(i, 'miss');
      for (let i = 0; i < notes.length; i++) {
        const s = spots[i];
        if (!s.fired && playT >= notes[i]) {
          s.fired = true;
          const p = at(s);
          if (theme === 'fireworks') {
            fx.ring(p.x, p.y, s.color, 34, 170, 1.1);
            fx.burst(p.x, p.y, '#fff6b2', 10, { speed: 110, gravity: 50, life: 0.8, size: 3, star: true });
          } else {
            pointT = playT;
            pointAt = s;
            fx.burst(p.x, p.y, '#ffffff', 8, { speed: 100, gravity: 0, life: 0.4, size: 3, star: true });
          }
        }
      }
      glowT = Math.max(0, glowT - dt);
    },
    probe: () => {
      const i = st.judged.findIndex((j) => !j);
      return { next: i >= 0 ? notes[i] - playT : null, credit: st.credit, strays: st.strays };
    },
    done: () => notes.length > 0 && st.judged.every(Boolean) && playT > notes[notes.length - 1] + WINDOWS.ok + 0.35,
    score: () => {
      rhythmExpire(st, Infinity);
      return rhythmScore({ credit: st.credit, total: notes.length, strays: st.strays });
    },
    meter: () => {
      const n = st.judged.filter(Boolean).length;
      const hit = st.judged.filter((j) => j && j !== 'miss').length;
      const v = n ? clamp((st.credit - 0.25 * st.strays) / (n * 0.95)) : 0;
      return { v, text: `${hit}/${notes.length}` };
    },
    draw(ctx, nw, nh, info) {
      w = nw;
      h = nh;
      const t = info.clock;
      const pt = info.phase === 'play' ? playT : 0;
      if (theme === 'fireworks') drawFestival(ctx, w, h, t);
      else drawStudio(ctx, w, h, t);

      // 음표: 다가오는 고리 + 과녁
      for (let i = 0; i < notes.length; i++) {
        const lead = notes[i] - pt;
        if (lead > tune.approach || st.judged[i]) continue;
        if (lead < -WINDOWS.ok) continue;
        const p = at(spots[i]);
        const k = clamp(1 - lead / tune.approach);
        const R = 26;
        if (theme === 'fireworks') {
          // 솟아오르는 폭죽
          const ry = lerp(h * 0.9, p.y, easeOut(k));
          ctx.strokeStyle = withAlpha(spots[i].color, 0.6);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(p.x, Math.min(h * 0.9, ry + 50));
          ctx.lineTo(p.x, ry);
          ctx.stroke();
          ctx.fillStyle = '#fff6b2';
          ctx.beginPath();
          ctx.arc(p.x, ry, 4, 0, TAU);
          ctx.fill();
        } else {
          drawWeatherIcon(ctx, p.x, p.y, spots[i].icon, 0.5 + k * 0.5, k);
        }
        // 과녁
        ctx.strokeStyle = withAlpha('#ffffff', 0.85);
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 6]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, R, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        // 다가오는 고리
        const rr = lerp(R * 3.2, R, k);
        ctx.strokeStyle = withAlpha(spots[i].color, 0.35 + 0.6 * k);
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(R * 0.6, rr), 0, TAU);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = OL;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(R * 0.6, rr) + 3.5, 0, TAU);
        ctx.stroke();
      }

      // 기상캐스터
      if (theme === 'forecast') {
        const since = pt - pointT;
        const pointing = since >= 0 && since < 0.35;
        const cx = w * 0.8;
        person(ctx, 'worker', cx, h * 0.86, Math.min(1.6, w / 250), { t, dir: -1, look: 0, wave: pointing, walk: 0 });
        if (pointing) {
          const p = at(pointAt);
          ctx.strokeStyle = withAlpha('#ffffff', 0.5 * (1 - since / 0.35));
          ctx.lineWidth = 3;
          ctx.setLineDash([4, 7]);
          ctx.beginPath();
          ctx.moveTo(cx - 30, h * 0.86 - 95);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // UFO: 박자를 맞추면 그 색으로 빛나 섞여 든다
      const u = ufoPos();
      const missRecent = st.judged.some((j, i) => j === 'miss' && pt - notes[i] < 0.9 && pt - notes[i] > 0);
      if (glowT > 0) {
        const gr = 46 + (0.45 - glowT) * 90;
        const g = ctx.createRadialGradient(u.x, u.y, 4, u.x, u.y, gr);
        g.addColorStop(0, withAlpha(glowColor, Math.min(1, glowT * 2)));
        g.addColorStop(1, withAlpha(glowColor, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(u.x, u.y, gr, 0, TAU);
        ctx.fill();
      }
      ufo(ctx, u.x, u.y + (env.reduced ? 0 : Math.sin(t * 3) * 3), theme === 'forecast' ? 30 : 34, {
        form,
        t,
        mood: missRecent ? 'shock' : glowT > 0 ? 'happy' : 'idle',
        lit: glowT > 0 ? 1 : 0.35,
        alpha: theme === 'forecast' ? (glowT > 0 ? 0.55 : missRecent ? 1 : 0.8) : 1,
      });
      if (missRecent && theme === 'fireworks') bubble(ctx, w * 0.2, h * 0.84, '?', { fill: '#fff6b2', size: 18 });

      drawBeatBar(ctx, w, h, notes, st, pt, tune);
      vignette(ctx, w, h, '#05071e', theme === 'fireworks' ? 0.45 : 0.3);
    },
  };
}

/** 아래쪽 박자 띠: 음표가 오른쪽에서 와서 왼쪽 과녁에 닿을 때 톡. */
function drawBeatBar(ctx, w, h, notes, st, pt, tune) {
  const y = h - 100;
  const x0 = w * 0.16;
  const x1 = w * 0.92;
  const span = 2.2; // 띠에 보이는 시간(초)
  ctx.save();
  rrect(ctx, w * 0.06, y - 20, w * 0.88, 40, 20);
  ctx.fillStyle = 'rgba(17,20,58,0.65)';
  ctx.fill();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  ctx.stroke();
  // 과녁
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x0, y, 15, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#6ff2ff';
  ctx.beginPath();
  ctx.arc(x0, y, 8, 0, TAU);
  ctx.fill();
  for (let i = notes.length - 1; i >= 0; i--) {
    const d = notes[i] - pt;
    if (d > span || d < -0.25) continue;
    const j = st.judged[i];
    if (j && j !== 'miss') continue;
    const x = lerp(x0, x1, d / span);
    ctx.fillStyle = j === 'miss' ? '#ff8170' : '#ffe04f';
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  void tune;
  ctx.restore();
}

function drawFestival(ctx, w, h, t) {
  vgrad(ctx, 0, 0, w, h, [
    [0, '#0b0f3a'],
    [0.7, '#2a2f78'],
    [0.71, '#1b1f52'],
    [1, '#10143a'],
  ]);
  stars(ctx, w, h, t, { seed: 5, n: 50, area: 0.6 });
  // 도시 윤곽
  const base = h * 0.71;
  ctx.fillStyle = '#161a4a';
  let x = 0;
  let i = 0;
  while (x < w) {
    const bw = 26 + ((i * 37) % 30);
    const bh = 30 + ((i * 53) % 70);
    ctx.fillRect(x, base - bh, bw, bh);
    x += bw + 2;
    i++;
  }
  // 강물 반사
  for (let k = 0; k < 6; k++) {
    ctx.fillStyle = `rgba(255,220,150,${0.08 + (k % 2) * 0.05})`;
    ctx.fillRect(((k * 71 + t * 20) % (w + 60)) - 30, base + 12 + k * 14, 50, 3);
  }
  // 관객 머리
  ctx.fillStyle = '#0a0d2a';
  for (let px = -10; px < w + 20; px += 22) {
    const hy = h * 0.95 + Math.sin(px * 0.7) * 6;
    ctx.beginPath();
    ctx.arc(px, hy, 14, 0, TAU);
    ctx.fill();
  }
  ctx.fillRect(0, h * 0.95, w, h * 0.05);
}

function drawStudio(ctx, w, h, t) {
  vgrad(ctx, 0, 0, w, h, [
    [0, '#2a2f63'],
    [1, '#1c2050'],
  ]);
  // 날씨 지도(초록 화면 위에 합성된 지도)
  const mx = w * 0.05;
  const my = h * 0.16;
  const mw = w * 0.9;
  const mh = h * 0.6;
  rrect(ctx, mx, my, mw, mh, 16);
  const g = ctx.createLinearGradient(0, my, 0, my + mh);
  g.addColorStop(0, '#4fa8f0');
  g.addColorStop(1, '#2f74c8');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  rrect(ctx, mx, my, mw, mh, 16);
  ctx.clip();
  // 땅덩이
  ctx.fillStyle = '#7fcb4a';
  ctx.strokeStyle = '#3f8f3e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(mx + mw * 0.3, my + mh * 0.05);
  ctx.bezierCurveTo(mx + mw * 0.6, my + mh * 0.0, mx + mw * 0.68, my + mh * 0.35, mx + mw * 0.58, my + mh * 0.6);
  ctx.bezierCurveTo(mx + mw * 0.52, my + mh * 0.85, mx + mw * 0.3, my + mh * 0.95, mx + mw * 0.26, my + mh * 0.7);
  ctx.bezierCurveTo(mx + mw * 0.2, my + mh * 0.45, mx + mw * 0.1, my + mh * 0.2, mx + mw * 0.3, my + mh * 0.05);
  ctx.fill();
  ctx.stroke();
  // 기압선
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  for (let k = 1; k < 4; k++) {
    ctx.beginPath();
    ctx.arc(mx + mw * 0.85, my + mh * 0.2, k * 34 + Math.sin(t + k) * 2, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = OL;
  ctx.lineWidth = 4;
  rrect(ctx, mx, my, mw, mh, 16);
  ctx.stroke();
  // 바닥
  ctx.fillStyle = '#3a3f74';
  ctx.fillRect(0, h * 0.86, w, h * 0.14);
  // 녹화 중 표시
  const on = Math.sin(t * 4) > 0;
  ctx.fillStyle = on ? '#ff5747' : '#7a2a24';
  ctx.beginPath();
  ctx.arc(mx + 22, my + 22, 8, 0, TAU);
  ctx.fill();
  bold(ctx, 'REC', mx + 54, my + 22, 15, '#ffffff', { lw: 4 });
}

function drawWeatherIcon(ctx, x, y, kind, s, k) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.globalAlpha = 0.4 + 0.6 * k;
  ctx.strokeStyle = OL;
  ctx.lineWidth = 3;
  const cloud = (fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(-10, 2, 12, 0, TAU);
    ctx.arc(4, -6, 15, 0, TAU);
    ctx.arc(16, 4, 10, 0, TAU);
    ctx.stroke();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(2, 8, 24, 8, 0, 0, TAU);
    ctx.stroke();
    ctx.fill();
  };
  if (kind === 'sun') {
    ctx.fillStyle = '#ffd23f';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 18, Math.sin(a) * 18);
      ctx.lineTo(Math.cos(a) * 26, Math.sin(a) * 26);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, TAU);
    ctx.fill();
    ctx.stroke();
  } else if (kind === 'cloud') cloud('#ffffff');
  else if (kind === 'rain' || kind === 'snow') {
    cloud('#dfe6ff');
    for (let i = 0; i < 3; i++) {
      if (kind === 'rain') {
        ctx.strokeStyle = '#2b9df0';
        ctx.beginPath();
        ctx.moveTo(-10 + i * 10, 18);
        ctx.lineTo(-13 + i * 10, 27);
        ctx.stroke();
      } else twinkle(ctx, -10 + i * 10, 22, 5, '#ffffff');
    }
  } else {
    cloud('#c9cfe8');
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(2, 10);
    ctx.lineTo(-6, 24);
    ctx.lineTo(2, 22);
    ctx.lineTo(-2, 34);
    ctx.lineTo(10, 18);
    ctx.lineTo(3, 19);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
