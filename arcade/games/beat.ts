/**
 * 박자 포탑 — 타워 디펜스 × 리듬 게임 × 원버튼.
 * 적이 세 줄로 내려온다. 누르면 포탑이 가장 급한 적을 쏜다. 박자에 맞춰 쏘면 두 배 위력으로 그 줄 전체를 꿰뚫는다.
 * 박자 맞춘 사격이 이어지면 무작위 강화. 적이 바닥 선에 닿으면 끝.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';

const H = 1.4, BASE = 1.22, LANES = 3, BEAT = 30, COOL = 6, JAM = 36;
export type Boost = '넓은 박자' | '두 줄' | '느린 행진';
interface Foe { lane: number; y: number; hp: number; max: number }
export interface BeatState {
  rng: Rng;
  t: number;
  foes: Foe[];
  spawnIn: number;
  cool: number;
  win: number;
  wide: boolean;
  slow: number;
  combo: number;
  /** 이미 정박 사격을 한 박자 번호 (박자마다 정박은 한 발) */
  usedBeat: number;
  kills: number;
  shot: { lane: number; strong: boolean; t: number } | null;
  last: { name: Boost; t: number } | null;
  dead: boolean;
}

const beatNo = (s: BeatState) => Math.round(s.t / BEAT);
export const onBeat = (s: BeatState) => {
  const p = s.t % BEAT;
  return (p <= s.win || p >= BEAT - s.win) && beatNo(s) !== s.usedBeat;
};
const laneX = (l: number) => (l + 0.5) / LANES;
const target = (s: BeatState) => (s.foes.length ? s.foes.reduce((a, f) => (f.y > a.y ? f : a)) : null);

function spawn(s: BeatState) {
  const min = s.t / 3600;
  const hp = 1 + Math.floor(s.rng() * Math.min(5, 1 + min * 2));
  s.foes.push({ lane: Math.floor(s.rng() * LANES), y: -0.05, hp, max: hp });
  s.spawnIn = Math.max(8, Math.round(64 - 40 * min - s.rng() * 18));
}

function boost(s: BeatState) {
  const all: Boost[] = ['넓은 박자', '두 줄', '느린 행진'];
  const b = all[Math.floor(s.rng() * 3)];
  s.last = { name: b, t: s.t };
  if (b === '넓은 박자') s.win = Math.min(6, s.win + 1);
  else if (b === '두 줄') s.wide = true;
  else s.slow = 60 * 8;
}

function fire(s: BeatState) {
  const tg = target(s);
  if (!tg || s.cool > 0) return;
  s.cool = COOL;
  const strong = onBeat(s);
  s.shot = { lane: tg.lane, strong, t: s.t };
  if (strong) {
    s.usedBeat = beatNo(s);
    const lanes = s.wide ? [tg.lane - 1, tg.lane, tg.lane + 1] : [tg.lane];
    for (const f of s.foes) if (lanes.includes(f.lane)) f.hp -= 2;
    if (++s.combo % 6 === 0) boost(s);
  } else {
    // 박자를 놓친 사격: 약하고, 포탑이 잠깐 멈춘다 (마구 누르기 방지)
    tg.hp -= 1;
    s.combo = 0;
    s.cool = JAM;
  }
  const before = s.foes.length;
  s.foes = s.foes.filter((f) => f.hp > 0);
  s.kills += before - s.foes.length;
}

export const beat: GameDef<BeatState> = {
  id: 'beat',
  name: '박자 포탑',
  genes: ['defense', 'rhythm', 'onebutton'],
  twist: '포탑은 아무 때나 쏘지만, 박자에 맞춰 쏘면 두 배로 강하고 줄 전체를 꿰뚫는다',
  rules: ['누르면 포탑이 가장 가까운 적을 쏩니다.', '고리가 번쩍일 때 쏘면 두 배로 강하게 줄 전체를 꿰뚫고, 놓치면 포탑이 잠깐 멈춰요.', '적이 바닥 선에 닿으면 끝. 박자를 6번 이어 맞추면 무작위 강화!'],
  controls: 'tap',
  aspect: 1.4,
  art: {
    concept: '한밤의 클럽',
    mood: '보랏빛 무대 위 네온 스피커. 박자마다 바닥 고리가 울리고, 정박 사격은 레이저처럼 꽂힌다.',
    palette: { bg: '#120a24', ink: '#f5e9ff', muted: '#4b2f7a', accent: '#00f5d4', hot: '#ff2e88', soft: '#24133f' },
  },
  create(seed) {
    return {
      rng: mulberry32(seed), t: 0, foes: [], spawnIn: 60, cool: 0, win: 3, wide: false, slow: 0, combo: 0, usedBeat: -1, kills: 0,
      shot: null, last: null, dead: false,
    };
  },
  step(s, input: Input) {
    if (s.dead) return;
    s.t++;
    if (s.cool > 0) s.cool--;
    if (s.slow > 0) s.slow--;
    if (--s.spawnIn <= 0) spawn(s);
    const v = ((0.1 + 0.2 * (s.t / 3600)) / 60) * (s.slow > 0 ? 0.7 : 1);
    for (const f of s.foes) f.y += v;
    if (input.tap) fire(s);
    if (s.foes.some((f) => f.y >= BASE)) s.dead = true;
  },
  over: (s) => s.dead,
  score: (s) => s.kills,
  draw(ctx, s, w, h, th: Theme) {
    const sc = Math.min(w, h / H), ox = (w - sc) / 2, X = (x: number) => ox + x * sc, Y = (y: number) => y * sc;
    const pulse = 1 - (s.t % BEAT) / BEAT;
    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, w, h);
    // 줄(무대 조명)
    for (let l = 0; l < LANES; l++) {
      ctx.fillStyle = th.soft;
      ctx.fillRect(X(l / LANES) + 3, 0, sc / LANES - 6, Y(BASE));
    }
    // 바닥 선 + 박자 고리
    ctx.strokeStyle = th.hot;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(BASE));
    ctx.lineTo(X(1), Y(BASE));
    ctx.stroke();
    const tx = X(0.5), ty = Y(1.31);
    const p = s.t % BEAT, inWin = p <= s.win || p >= BEAT - s.win;
    ctx.strokeStyle = inWin ? th.accent : th.muted;
    ctx.lineWidth = inWin ? 5 : 2;
    ctx.beginPath();
    ctx.arc(tx, ty, sc * (0.05 + 0.06 * pulse), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = th.ink;
    ctx.beginPath();
    ctx.arc(tx, ty, sc * 0.035, 0, Math.PI * 2);
    ctx.fill();
    // 적
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(sc * 0.045)}px system-ui, sans-serif`;
    for (const f of s.foes) {
      const x = X(laneX(f.lane)), y = Y(f.y), r = sc * (0.04 + 0.008 * f.max);
      ctx.fillStyle = th.hot;
      ctx.globalAlpha = 0.35 + 0.65 * (f.hp / f.max);
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = th.ink;
      ctx.fillText(String(f.hp), x, y);
    }
    // 사격 레이저
    if (s.shot && s.t - s.shot.t < 8) {
      const lanes = s.shot.strong && s.wide ? [s.shot.lane - 1, s.shot.lane, s.shot.lane + 1] : [s.shot.lane];
      ctx.strokeStyle = s.shot.strong ? th.accent : th.ink;
      ctx.lineWidth = s.shot.strong ? 6 : 2;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = s.shot.strong ? 18 : 0;
      for (const l of lanes) {
        if (l < 0 || l >= LANES) continue;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(X(laneX(l)), 0);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = th.ink;
    ctx.textAlign = 'left';
    ctx.font = `800 ${Math.round(sc * 0.07)}px system-ui, sans-serif`;
    ctx.fillText(String(s.kills), X(0.03), Y(0.06));
    ctx.textAlign = 'right';
    ctx.font = `700 ${Math.round(sc * 0.045)}px system-ui, sans-serif`;
    ctx.fillStyle = s.combo ? th.accent : th.muted;
    ctx.fillText(`정박 연속 ${s.combo}`, X(0.97), Y(0.06));
    if (s.last && s.t - s.last.t < 90) {
      ctx.textAlign = 'center';
      ctx.fillStyle = th.accent;
      ctx.font = `800 ${Math.round(sc * 0.08)}px system-ui, sans-serif`;
      ctx.fillText(`🎲 ${s.last.name}!`, X(0.5), Y(0.6));
    }
  },
};

export const beatRandom: Bot<BeatState> = { name: '막누르기', act: (_s, rng) => ({ tap: rng() < 1 / 18, dir: 0 }) };

/** 봇: 박자 창 안에서만 쏘고, 박자를 기다리면 늦을 때만 그냥 쏜다 */
export const beatSmart: Bot<BeatState> = {
  name: '박자 맞추기',
  act(s) {
    const tg = target(s);
    if (!tg || s.cool > 0) return { tap: false, dir: 0 };
    if (onBeat(s)) return { tap: true, dir: 0 };
    const toNext = BEAT - (s.t % BEAT) - s.win;
    const v = (0.1 + 0.2 * (s.t / 3600)) / 60;
    return { tap: tg.y + v * (toNext + 4) >= BASE - 0.02, dir: 0 };
  },
};
