/**
 * 곱셈 폭포 (0029, 13라운드) — 곱하기 문 × 받아내기 · 가리키기 · 영구 해금(이월).
 * 오너 12라운드 이유: 와우 약함 · 바로 재미가 안 옴 · 손맛 · 목표·보상 부족 →
 *  - 첫 손짓에 바로 터진다: 누르고 있는 곳에서 구슬이 쏟아지고, ×2·×3 문을 지나며 몇 개가 수백 개로 불어난다.
 *  - 판마다 목표(N개 담기)와 별 1~3개. **많이 담을수록 다음 판 구슬이 늘어난다** — 잘한 만큼 다음 판이 쉬워진다.
 *  - 판이 갈수록 하는 일이 바뀐다: 나쁜 문(÷2) 피하기 → 핀 → 움직이는 병 → 좁은 ×5 → 도는 막대 → 황금 구슬.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5, MR = 0.011, PEG = 0.014, G = 1.5 / 3600, VMAX = 0.02, SPOUT_Y = 0.13, RIM = A - 0.16, POUR = 9, CAP = 320;
type Op = 'x' | '+' | '/';
interface Gate { id: number; x0: number; x1: number; y: number; op: Op; n: number; cnt: number; flash: number }
interface Wall { x: number; y0: number; y1: number }
interface Stage { k: number; target: number; gates: Gate[]; pegs: { x: number; y: number }[]; walls: Wall[]; cup: { x: number; w: number; amp: number; ph: number }; spin: { x: number; y: number; len: number } | null; gold: boolean }
interface Marble { x: number; y: number; vx: number; vy: number; w: number; passed: number; gold: boolean }
interface Ev { t: number; kind: string; x: number; y: number; text?: string }
export interface CascadeState {
  rng: Rng; t: number; k: number; stage: Stage; seed: number; phase: 'play' | 'clear' | 'fail'; phaseT: number;
  supply: number; poured: number; cd: number; lastPour: number; spout: number; marbles: Marble[]; cup: number; total: number; stars: number; lastStars: number;
  hearts: number; next: number; seen: Set<string>; events: Ev[]; dead: boolean;
}

const ev = (s: CascadeState, kind: string, x: number, y: number, text?: string) => s.events.push({ t: s.t, kind, x, y, text });
function see(s: CascadeState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  ev(s, 'new', 0.5, 0.55, text);
}
export const cupX = (st: Stage, t: number) => st.cup.x + st.cup.amp * Math.sin(t * 0.018 + st.cup.ph);
const spinA = (t: number) => t * 0.035;
const label = (g: Gate) => (g.op === 'x' ? `×${g.n}` : g.op === '+' ? `+${g.n}` : `÷${g.n}`);
const starLines = (target: number) => [target, Math.round(target * 1.5), Math.round(target * 2.5)];

/** k번째 판을 만든다 (같은 seed·k면 같은 판 — 실패하면 같은 판을 다시) */
function makeStage(seed: number, k: number): Stage {
  const r = mulberry32(seed * 7919 + k * 104729);
  const rows = k < 3 ? 2 : 3, ys = rows === 2 ? [0.45, 0.88] : [0.38, 0.7, 1.02];
  const gates: Gate[] = [], walls: Wall[] = [];
  let id = 0;
  for (const y of ys) {
    const n = r() < 0.5 ? 2 : 3, cuts = [0, ...[...Array(n - 1)].map((_, i) => (i + 1) / n + (r() - 0.5) * 0.12), 1];
    let good = false;
    for (let i = 0; i < n; i++) {
      const x0 = cuts[i] + 0.012, x1 = cuts[i + 1] - 0.012, roll = r();
      let op: Op = 'x', v = 2;
      if (k >= 1 && roll < 0.24 && (good || i < n - 1)) (op = '/'), (v = 2);
      else if (roll < 0.45) (op = '+'), (v = 3 + Math.floor(r() * 3));
      else if (roll < 0.7) (op = 'x'), (v = 3);
      if (op !== '/') good = true;
      gates.push({ id: id++, x0, x1, y, op, n: v, cnt: 0, flash: 0 });
      if (i > 0) walls.push({ x: cuts[i], y0: y - 0.07, y1: y + 0.02 });
    }
  }
  // 좁은 ×5 문 (5판부터): 문 하나를 반으로 쪼개 한쪽을 ×5로
  if (k >= 4) {
    const g = gates[Math.floor(r() * gates.length)], mid = (g.x0 + g.x1) / 2;
    gates.push({ id: id++, x0: mid + 0.012, x1: g.x1, y: g.y, op: 'x', n: 5, cnt: 0, flash: 0 });
    g.x1 = mid - 0.012;
    walls.push({ x: mid, y0: g.y - 0.07, y1: g.y + 0.02 });
  }
  const pegs: { x: number; y: number }[] = [];
  if (k >= 2) for (let i = 0; i < 7 + Math.min(6, k); i++) pegs.push({ x: 0.08 + r() * 0.84, y: ys[Math.floor(r() * ys.length)] + 0.09 + r() * 0.08 });
  const cw = Math.max(0.17, 0.34 - 0.014 * k);
  return {
    k, target: Math.round(12 * 1.3 ** k), gates, pegs, walls,
    cup: { x: 0.25 + r() * 0.5, w: cw, amp: k >= 3 ? Math.min(0.3, 0.12 + 0.02 * k) : 0, ph: r() * 6 },
    spin: k >= 5 ? { x: 0.3 + r() * 0.4, y: ys[0] + 0.17, len: 0.11 } : null,
    gold: k >= 6,
  };
}

function startStage(s: CascadeState, supply: number) {
  s.stage = makeStage(s.seed, s.k);
  s.phase = 'play';
  s.phaseT = 0;
  s.supply = supply;
  s.poured = 0;
  s.cup = 0;
  s.marbles = [];
  const st = s.stage;
  if (st.gates.some((g) => g.op === '/')) see(s, 'bad', '빨간 ÷2 문은 구슬을 반으로 줄여요 — 피해서 따르세요');
  if (st.pegs.length) see(s, 'pegs', '핀에 부딪히면 튕겨요');
  if (st.cup.amp) see(s, 'move', '병이 움직여요! 때 맞춰 따르세요');
  if (st.gates.some((g) => g.n === 5 && g.op === 'x')) see(s, 'x5', '좁은 금빛 ×5 문!');
  if (st.spin) see(s, 'spin', '도는 막대가 길을 막아요');
  if (st.gold) see(s, 'gold', '열 번째 구슬마다 황금 구슬 — 병에 들어가면 10개!');
}

/** 구슬 한 틱 — 게임과 봇이 같이 쓴다. 돌려주는 값: 'cup' 담김 · 'lost' 놓침 · null */
export function move(st: Stage, m: Marble, t: number): 'cup' | 'lost' | null {
  m.vy = Math.min(VMAX, m.vy + G);
  m.x += m.vx;
  m.y += m.vy;
  m.vx *= 0.995;
  if (m.x < MR || m.x > 1 - MR) (m.vx = -m.vx * 0.6), (m.x = Math.max(MR, Math.min(1 - MR, m.x)));
  for (const p of st.pegs) {
    const dy = m.y - p.y, dx = Math.abs(m.x - p.x) < 1e-4 ? 0.002 : m.x - p.x, d = Math.hypot(dx, dy); // 정확히 꼭대기면 살짝 옆으로
    if (d < PEG + MR && d > 0) {
      const nx = dx / d, ny = dy / d, dot = m.vx * nx + m.vy * ny;
      (m.x = p.x + nx * (PEG + MR)), (m.y = p.y + ny * (PEG + MR));
      if (dot < 0) (m.vx -= 1.5 * dot * nx), (m.vy -= 1.5 * dot * ny);
      m.vx += nx * 0.0015;
    }
  }
  for (const w of st.walls) if (m.y > w.y0 && m.y < w.y1 && Math.abs(m.x - w.x) < MR + 0.004) (m.vx = (m.x < w.x ? -1 : 1) * Math.max(0.002, Math.abs(m.vx) * 0.6)), (m.x = w.x + (m.x < w.x ? -1 : 1) * (MR + 0.004));
  if (st.spin) {
    const a = spinA(t), ex = Math.cos(a) * st.spin.len, ey = Math.sin(a) * st.spin.len;
    const px = m.x - (st.spin.x - ex), py = m.y - (st.spin.y - ey), L2 = 4 * st.spin.len ** 2, u = Math.max(0, Math.min(1, (px * 2 * ex + py * 2 * ey) / L2));
    const cx = st.spin.x - ex + 2 * ex * u, cy = st.spin.y - ey + 2 * ey * u, dx = m.x - cx, dy = m.y - cy, d = Math.hypot(dx, dy);
    if (d < MR + 0.006 && d > 0) (m.x = cx + (dx / d) * (MR + 0.006)), (m.y = cy + (dy / d) * (MR + 0.006)), (m.vx = (dx / d) * 0.01), (m.vy = (dy / d) * 0.01);
  }
  if (m.y >= RIM && m.y - m.vy < RIM) {
    const cx = cupX(st, t);
    if (Math.abs(m.x - cx) < st.cup.w / 2) return 'cup';
  }
  return m.y > A + 0.04 ? 'lost' : null;
}

export const cascade: GameDef<CascadeState> = {
  id: 'cascade',
  name: '곱셈 폭포',
  genes: ['multiply', 'catch', 'pointer', 'unlock'],
  twist: '따른 구슬이 ×2·×3 문을 지나며 수백 개로 쏟아진다 — 많이 담을수록 다음 판 구슬이 늘어난다',
  rules: ['누르고 있는 곳 위에서 구슬이 쏟아져요 (키보드: 화살표 + 스페이스). ×2·×3 문을 지나면 늘어나요.', '판마다 목표 개수를 병에 담으면 클리어! 별 3개까지. 많이 담을수록 다음 판 구슬이 늘어요.', '목표를 못 채우면 하트 -1, 같은 판을 다시. 하트 3개.'],
  controls: 'touch',
  hint: '누르고 있으면 쏟아져요 / 화살표 + 스페이스',
  aspect: A,
  art: {
    concept: '사탕 공장의 구슬 폭포',
    mood: '복숭앗빛 공장 벽 앞으로 사탕색 구슬이 쏟아진다. 초록 문을 지날 때마다 번쩍이며 불어나고, 유리병이 차오르며 별이 터진다.',
    palette: { bg: '#2b1d3a', ink: '#fff8f0', muted: '#9a86b0', accent: '#5cf2a0', hot: '#ff5d73', soft: '#3d2a52' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = { rng: mulberry32(seed), t: 0, k: 0, seed, phase: 'play', phaseT: 0, supply: 10, poured: 0, cd: 0, lastPour: 0, spout: 0.5, marbles: [], cup: 0, total: 0, stars: 0, lastStars: 0, hearts: 3, next: 10, seen: new Set<string>(), events: [], dead: false } as unknown as CascadeState;
    startStage(s, 10);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.phaseT++;
    s.events = s.events.filter((e) => s.t - e.t < 90);
    const st = s.stage;
    for (const g of st.gates) if (g.flash > 0) g.flash--;
    if (s.phase !== 'play') {
      if (s.phaseT < 110) return;
      if (s.phase === 'clear') (s.k++, startStage(s, s.next));
      else if (s.hearts <= 0) s.dead = true;
      else startStage(s, 10);
      return;
    }
    // 따르기: 손가락 x가 주둥이, 누르고 있는 동안 0.15초마다 한 알
    if (inp.pointer) s.spout = Math.max(0.03, Math.min(0.97, inp.pointer.x));
    if (s.cd > 0) s.cd--;
    if (inp.pointer && s.supply > 0 && s.cd === 0) {
      s.poured++;
      s.marbles.push({ x: s.spout + (s.poured % 2 ? 0.003 : -0.003), y: SPOUT_Y, vx: 0, vy: 0.004, w: 1, passed: 0, gold: st.gold && s.poured % 10 === 0 });
      s.supply--;
      s.cd = POUR;
      s.lastPour = s.t;
    }
    const born: Marble[] = [];
    for (const m of s.marbles) {
      const py = m.y, res = move(st, m, s.t);
      if (res === 'cup') {
        const v = m.w * (m.gold ? 10 : 1), before = s.cup;
        s.cup += v;
        m.w = 0;
        ev(s, 'in', m.x, RIM, m.gold ? '+10 황금!' : undefined);
        for (const [i, line] of starLines(st.target).entries()) if (before < line && s.cup >= line) ev(s, 'star', cupX(st, s.t), RIM - 0.1, '★'.repeat(i + 1));
        continue;
      }
      if (res === 'lost') (m.w = 0);
      for (const g of st.gates) {
        if (m.w <= 0 || m.passed & (1 << g.id) || !(py < g.y && m.y >= g.y && m.x >= g.x0 && m.x <= g.x1)) continue;
        m.passed |= 1 << g.id;
        g.flash = 12;
        if (g.op === '/') {
          if (m.w > 1) m.w = Math.ceil(m.w / 2);
          else if (++g.cnt % 2 === 0) (m.w = 0), ev(s, 'eat', m.x, g.y);
          continue;
        }
        const extra = g.op === 'x' ? g.n - 1 : g.n;
        if (s.marbles.length + born.length + extra > CAP) m.w = g.op === 'x' ? m.w * g.n : m.w + g.n;
        else for (let j = 0; j < extra; j++) born.push({ ...m, vx: m.vx + (j - (extra - 1) / 2) * 0.0035, vy: m.vy * 0.8, gold: false });
        if (g.flash === 12 && (s.t + g.id) % 6 === 0) ev(s, 'gate', m.x, g.y, label(g));
      }
    }
    s.marbles = [...s.marbles.filter((m) => m.w > 0), ...born];
    // 다 따르고 다 떨어지면 판정
    // 핀 위에 얹혀 멈춘 구슬이 있어도 마지막 구슬을 따른 뒤 7초면 판정한다
    if (s.supply === 0 && s.poured > 0 && (s.marbles.length === 0 || s.t - s.lastPour > 420)) {
      s.marbles = [];
      const lines = starLines(st.target), stars = lines.filter((l) => s.cup >= l).length;
      s.total += s.cup;
      s.phaseT = 0;
      if (stars > 0) {
        s.phase = 'clear';
        s.stars += stars;
        s.lastStars = stars;
        s.next = Math.max(8, Math.min(26, Math.round((10 * s.cup) / st.target)));
        ev(s, 'clear', 0.5, 0.6, `${s.k + 1}판 클리어!`);
        see(s, 'carry', `많이 담을수록 다음 판 구슬이 늘어요 → 다음 판 ${s.next}개`);
        if (stars === 3) see(s, 'star3', '별 셋! 완벽해요');
      } else {
        s.phase = 'fail';
        s.hearts--;
        s.lastStars = 0;
        ev(s, 'fail', 0.5, 0.6, `목표 ${st.target}개에 ${st.target - s.cup}개 모자라요`);
      }
    }
  },
  over: (s) => s.dead,
  score: (s) => s.total,
  draw(ctx, s, w, h, th: Theme) {
    const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, st = s.stage;
    ctx.save();
    fx.begin(ctx);
    // 공장 벽: 복숭아 → 보라 그라데이션 + 떠도는 빛망울
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#4a2f63');
    g.addColorStop(0.55, th.bg);
    g.addColorStop(1, '#3a2148');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -10, w + 20, h + 20);
    for (let k = 0; k < 14; k++) {
      const x = X(((k * 0.37 + s.t * 0.0003 * (1 + (k % 3))) % 1.2) - 0.1), y = Y(((k * 0.61) % 1) * A), r = R(0.04 + (k % 4) * 0.02);
      const b = ctx.createRadialGradient(x, y, 0, x, y, r);
      b.addColorStop(0, `hsla(${(k * 47) % 360},90%,75%,.16)`);
      b.addColorStop(1, 'hsla(0,0%,100%,0)');
      ctx.fillStyle = b;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // 문
    for (const gt of st.gates) {
      const good = gt.op !== '/', gold = gt.op === 'x' && gt.n === 5, base = gold ? '#ffcf3d' : good ? '#35d68a' : '#ff4d6a';
      ctx.shadowColor = base;
      ctx.shadowBlur = gt.flash > 0 ? 24 : 8;
      ctx.fillStyle = base;
      ctx.globalAlpha = 0.28 + (gt.flash / 12) * 0.5;
      ctx.beginPath();
      ctx.roundRect(X(gt.x0), Y(gt.y - 0.035), R(gt.x1 - gt.x0), R(0.05), 8);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = base;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${R(gt.flash > 0 ? 0.05 : 0.042)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label(gt), X((gt.x0 + gt.x1) / 2), Y(gt.y - 0.01));
    }
    ctx.fillStyle = '#c9b6e0';
    for (const wl of st.walls) ctx.fillRect(X(wl.x) - 2, Y(wl.y0), 4, R(wl.y1 - wl.y0));
    for (const p of st.pegs) {
      const pg = ctx.createRadialGradient(X(p.x) - 2, Y(p.y) - 2, 1, X(p.x), Y(p.y), R(PEG));
      pg.addColorStop(0, '#ffffff');
      pg.addColorStop(1, '#8f7bb0');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), R(PEG), 0, Math.PI * 2);
      ctx.fill();
    }
    if (st.spin) {
      const a = spinA(s.t), ex = Math.cos(a) * st.spin.len, ey = Math.sin(a) * st.spin.len;
      ctx.strokeStyle = '#ff9f43';
      ctx.lineWidth = R(0.012);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(X(st.spin.x - ex), Y(st.spin.y - ey));
      ctx.lineTo(X(st.spin.x + ex), Y(st.spin.y + ey));
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
    // 유리병: 목표선·별 선, 차오르는 구슬
    const cx = cupX(st, s.t), cw = st.cup.w, lines = starLines(st.target), fill = Math.min(1, s.cup / lines[2]);
    const jarTop = RIM, jarH = A - RIM - 0.01;
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(X(cx - cw / 2), Y(jarTop), R(cw), R(jarH), [4, 4, 14, 14]);
    ctx.fill();
    ctx.stroke();
    const fg = ctx.createLinearGradient(0, Y(A), 0, Y(jarTop));
    fg.addColorStop(0, '#ff7ab6');
    fg.addColorStop(0.5, '#ffd36e');
    fg.addColorStop(1, '#6ef2c0');
    ctx.fillStyle = fg;
    ctx.fillRect(X(cx - cw / 2) + 3, Y(A - 0.01) - R(jarH) * fill, R(cw) - 6, R(jarH) * fill - 2);
    lines.forEach((l, i) => {
      const y = Y(A - 0.01) - R(jarH) * (l / lines[2]);
      ctx.strokeStyle = s.cup >= l ? '#ffe066' : 'rgba(255,255,255,.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(X(cx - cw / 2), y);
      ctx.lineTo(X(cx + cw / 2), y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = s.cup >= l ? '#ffe066' : 'rgba(255,255,255,.6)';
      ctx.font = `800 ${R(0.026)}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${'★'.repeat(i + 1)} ${l}`, X(cx + cw / 2) + 4, y);
    });
    ctx.fillStyle = th.ink;
    ctx.font = `900 ${R(0.05)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(String(s.cup), X(cx), Y(jarTop + jarH * 0.45));
    // 구슬 (사탕색 광택)
    for (const [i, m] of s.marbles.entries()) {
      const r = R(MR) * 1.35 * (m.w > 1 ? Math.min(2.2, 1 + Math.log2(m.w) * 0.25) : 1), hue = m.gold ? 48 : (i * 47 + m.passed * 13) % 360;
      const mg = ctx.createRadialGradient(X(m.x) - r * 0.3, Y(m.y) - r * 0.35, r * 0.1, X(m.x), Y(m.y), r);
      mg.addColorStop(0, '#ffffff');
      mg.addColorStop(0.35, `hsl(${hue},95%,${m.gold ? 60 : 68}%)`);
      mg.addColorStop(1, `hsl(${hue},85%,40%)`);
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(X(m.x), Y(m.y), r, 0, Math.PI * 2);
      ctx.fill();
    }
    // 주둥이 (손가락 위치)
    ctx.fillStyle = '#f2e6ff';
    ctx.beginPath();
    ctx.moveTo(X(s.spout) - R(0.05), Y(0.06));
    ctx.lineTo(X(s.spout) + R(0.05), Y(0.06));
    ctx.lineTo(X(s.spout) + R(0.018), Y(SPOUT_Y - 0.01));
    ctx.lineTo(X(s.spout) - R(0.018), Y(SPOUT_Y - 0.01));
    ctx.fill();
    ctx.fillStyle = th.bg;
    ctx.font = `900 ${R(0.032)}px system-ui, sans-serif`;
    ctx.fillText(String(s.supply), X(s.spout), Y(0.085));
    const seenT = fx.memo.t ?? -1;
    for (const e of s.events) {
      if (e.t <= seenT) continue;
      if (e.kind === 'gate') fx.pop(X(e.x), Y(e.y) - 18, e.text!, '#ffffff', 15), fx.burst(X(e.x), Y(e.y), '#9dffcf', 5, 2, 2);
      if (e.kind === 'eat') fx.burst(X(e.x), Y(e.y), th.hot, 8, 2, 2);
      if (e.kind === 'in') fx.burst(X(e.x), Y(e.y), '#ffe066', e.text ? 18 : 3, 2, 2), e.text && fx.pop(X(e.x), Y(e.y) - 20, e.text, '#ffe066', 16);
      if (e.kind === 'star') fx.ring(X(e.x), Y(e.y), '#ffe066', 110, 6), fx.burst(X(e.x), Y(e.y), '#ffe066', 30, 4, 3), fx.pop(X(e.x), Y(e.y) - 20, e.text!, '#ffe066', 26), fx.kick(4);
      if (e.kind === 'clear') {
        fx.blink('#fff6c8', 0.3);
        for (let k = 0; k < 6; k++) fx.burst(X(0.15 + k * 0.14), Y(0.3), `hsl(${k * 60},95%,65%)`, 16, 5, 3.5);
        fx.pop(w / 2, h * 0.42, e.text!, '#ffe066', 28);
      }
      if (e.kind === 'fail') fx.kick(10), fx.blink(th.hot, 0.3), fx.pop(w / 2, h * 0.42, e.text!, th.hot, 18);
      if (e.kind === 'new') fx.pop(w / 2, h * 0.5, e.text!, '#9dffcf', 15);
    }
    fx.memo.t = s.t;
    ctx.restore();
    // 머리말: 판·목표 · 하트 · 총합·별
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = th.ink;
    ctx.font = `900 ${R(0.05)}px system-ui, sans-serif`;
    ctx.fillText(`${s.k + 1}판 · 목표 ${st.target}`, 10, 10);
    ctx.font = `700 ${R(0.032)}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffe066';
    ctx.fillText(`★ ${s.stars} · 모은 구슬 ${s.total + (s.phase === 'play' ? s.cup : 0)}`, 10, 14 + R(0.05));
    ctx.textAlign = 'right';
    ctx.fillStyle = th.hot;
    ctx.font = `700 ${R(0.045)}px system-ui, sans-serif`;
    ctx.fillText('♥'.repeat(Math.max(0, s.hearts)), w - 10, 12);
    if (s.phase === 'clear') {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe066';
      ctx.font = `900 ${R(0.09)}px system-ui, sans-serif`;
      ctx.fillText('★'.repeat(s.lastStars) + '☆'.repeat(3 - s.lastStars), w / 2, h * 0.5);
      ctx.fillStyle = th.ink;
      ctx.font = `700 ${R(0.038)}px system-ui, sans-serif`;
      ctx.fillText(`다음 판 구슬 ${s.next}개`, w / 2, h * 0.5 + R(0.11));
    }
    if (s.k === 0 && s.poured === 0) (ctx.textAlign = 'center'), (ctx.fillStyle = th.ink), (ctx.font = `800 ${R(0.042)}px system-ui, sans-serif`), ctx.fillText('👆 초록 문 위를 꾹 누르고 있어 보세요', w / 2, Y(0.22));
  },
};

const memo = new WeakMap<object, { x: number; on: boolean }>();
/** 봇: 아무 데서나 따르다 말다 한다 */
export const cascadeRandom: Bot<CascadeState> = {
  name: '아무 데나',
  act(s, rng) {
    let m = memo.get(s);
    if (!m || s.t % 50 === 0) memo.set(s, (m = { x: rng(), on: rng() < 0.6 }));
    return { tap: false, dir: 0, pointer: m.on ? { x: m.x, y: 0.05 } : null };
  },
};

/** 봇: 주둥이 자리 31곳에서 구슬 한 알을 굴려 보고(÷2는 반으로 셈) 병에 가장 많이 들어갈 자리에서 따른다 */
const best = new WeakMap<object, { at: number; x: number }>();
export const cascadeSmart: Bot<CascadeState> = {
  name: '폭포 장인',
  act(s) {
    if (s.phase !== 'play' || s.supply === 0) return { tap: false, dir: 0, pointer: null };
    let b = best.get(s);
    if (!b || s.t - b.at > 30) {
      let top = { x: 0.5, v: -1 };
      for (let i = 0; i <= 30; i++) {
        const x = 0.04 + i * 0.03;
        let ms: { m: Marble; w: number }[] = [{ m: { x, y: SPOUT_Y, vx: 0, vy: 0.004, w: 1, passed: 0, gold: false }, w: 1 }], got = 0;
        for (let t = 0; t < 260 && ms.length; t++) {
          const nextMs: typeof ms = [];
          for (const it of ms) {
            const py = it.m.y, res = move(s.stage, it.m, s.t + t + 6);
            if (res === 'cup') { got += it.w; continue; }
            if (res === 'lost') continue;
            for (const g of s.stage.gates) {
              if (it.m.passed & (1 << g.id) || !(py < g.y && it.m.y >= g.y && it.m.x >= g.x0 && it.m.x <= g.x1)) continue;
              it.m.passed |= 1 << g.id;
              if (g.op === '/') it.w /= 2;
              else if (ms.length < 6) for (let j = 0; j < (g.op === 'x' ? g.n - 1 : g.n); j++) nextMs.push({ m: { ...it.m, vx: it.m.vx + (j - 1) * 0.0035 }, w: it.w });
              else it.w *= g.op === 'x' ? g.n : 1 + g.n;
            }
            nextMs.push(it);
          }
          ms = nextMs;
        }
        if (got > top.v) top = { x, v: got };
      }
      best.set(s, (b = { at: s.t, x: top.x }));
    }
    return { tap: false, dir: 0, pointer: { x: b.x, y: 0.05 } };
  },
};
