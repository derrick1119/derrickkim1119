/**
 * 착시 속 정답 (2026-11-08, 오너 아이디어) — 착시 그림 × 두더지 잡기(빨리 누르기) · 가리키기.
 * 오너: "직접 착시 효과를 만들고 착시 효과 속에 정답을 숨겨 놓는 게임"
 *  - 공장이 문제마다 착시 그림을 새로 만든다. 정답은 착시가 가장 강하게 속이는 자리에 숨긴다
 *    (진짜 가장 큰 원에는 큰 이웃을 둘러 작아 보이게, 진짜 가장 밝은 네모는 밝은 바탕에 둬서 어두워 보이게…).
 *  - 고르면 착시를 걷어 내고 진실을 보여 준다(이웃 원이 사라지고, 바탕이 같은 회색이 되고, 자가 그어진다) — "속았다!"의 순간.
 *  - 문제마다 새 종류의 착시가 섞여 나온다: 크기 → 길이 → 밝기 → 이어지는 선 → 움직일 때만 보이는 숫자 → 기울어진 벽.
 * 봇 계기판은 사람 눈을 흉내 내지 못한다 — 잘하는 봇은 "어려울수록 자주 속는 사람"으로 근사한다(그림자일 뿐).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.45, BAND0 = 0.22, BAND = 0.4, REVEAL = 80;
type Kind = 'size' | 'length' | 'shade' | 'line' | 'motion' | 'wall';
const KINDS: { kind: Kind; from: number; ask: string; name: string }[] = [
  { kind: 'size', from: 0, ask: '가운데 원이 진짜 가장 큰 것은?', name: '크기 착시' },
  { kind: 'length', from: 3, ask: '진짜 가장 긴 선은?', name: '길이 착시' },
  { kind: 'shade', from: 6, ask: '진짜 가장 밝은 네모는?', name: '밝기 착시' },
  { kind: 'line', from: 9, ask: '막대 뒤에서 이어지는 선은?', name: '이어지는 선 착시' },
  { kind: 'motion', from: 12, ask: '움직이는 점 속에 숨은 숫자는?', name: '움직일 때만 보이는 숫자' },
  { kind: 'wall', from: 15, ask: '진짜로 기울어진 벽은?', name: '기울어 보이는 벽' },
];
interface Q { kind: Kind; n: number; ans: number; hard: number; diff: number; limit: number; start: number; seed: number; vals: number[]; digits?: number[] }
interface Ev { t: number; kind: string; x: number; y: number; text?: string }
export interface IllusionState {
  rng: Rng; t: number; q: Q; n: number; lives: number; score: number; combo: number; phase: 'ask' | 'reveal'; phaseT: number;
  chosen: number | null; right: boolean; wasDown: boolean; seen: Set<string>; events: Ev[]; dead: boolean;
}

const ev = (s: IllusionState, kind: string, x: number, y: number, text?: string) => s.events.push({ t: s.t, kind, x, y, text });
const shuffle3 = (r: Rng) => { const a = [0, 1, 2]; for (let i = 2; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/** 정답을 고를 자리(세계 좌표) — 띠 셋, 또는 아래 버튼 셋 */
export function boxes(q: Q) {
  if (q.kind === 'line' || q.kind === 'motion') return [0, 1, 2].map((k) => ({ x0: 0.04 + k * 0.32, x1: 0.04 + k * 0.32 + 0.28, y0: 1.06, y1: 1.38 }));
  return [0, 1, 2].map((k) => ({ x0: 0.02, x1: 0.98, y0: BAND0 + k * BAND, y1: BAND0 + k * BAND + BAND - 0.02 }));
}

function nextQ(s: IllusionState) {
  const r = s.rng, n = s.n++, hard = Math.min(1, n / 32);
  const open = KINDS.filter((k) => k.from <= n), fresh = open.find((k) => k.from === n);
  const kind = fresh ? fresh.kind : open[Math.floor(r() * open.length)].kind;
  if (fresh && n > 0) s.seen.add(kind), ev(s, 'new', 0.5, 0.5, `새 착시: ${fresh.name}!`);
  const ans = Math.floor(r() * 3), diff = { size: 0.22 - 0.16 * hard, length: 0.16 - 0.11 * hard, shade: 0.13 - 0.09 * hard, line: 0.085 - 0.05 * hard, motion: 0.95 - 0.35 * hard, wall: 0.05 - 0.032 * hard }[kind];
  const q: Q = { kind, n, ans, hard, diff, limit: Math.round(Math.max(150, 420 - 9 * n)), start: s.t, seed: Math.floor(r() * 1e9), vals: [r(), r(), r(), r()] };
  if (kind === 'motion') {
    const d = shuffle3(r).map((k) => [3, 5, 8, 2, 6, 9, 4, 7][(Math.floor(r() * 8) + k * 3) % 8]);
    if (new Set(d).size < 3) d[1] = (d[0] + 1) % 10, d[2] = (d[0] + 4) % 10;
    q.digits = d;
  }
  s.q = q;
  s.phase = 'ask';
  s.phaseT = 0;
  s.chosen = null;
}

function answer(s: IllusionState, k: number | null) {
  const q = s.q, right = k === q.ans;
  s.chosen = k;
  s.right = right;
  s.phase = 'reveal';
  s.phaseT = 0;
  const b = boxes(q)[k ?? q.ans];
  if (right) {
    const left = Math.max(0, q.limit - (s.t - q.start)) / 60;
    const gain = 10 + Math.ceil(left) * 2 + s.combo * 2;
    s.score += gain;
    s.combo++;
    ev(s, 'right', (b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, `정답! +${gain}`);
  } else {
    s.lives--;
    s.combo = 0;
    ev(s, 'wrong', (b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, k === null ? '시간 끝!' : '속았다!');
  }
  if (!s.seen.has('truth')) (s.seen.add('truth'), ev(s, 'new', 0.5, 0.5, '착시를 걷어 내면… 진실이 보여요'));
}

export const illusion: GameDef<IllusionState> = {
  id: 'illusion',
  name: '착시 속 정답',
  genes: ['illusion', 'whack', 'pointer'],
  twist: '정답을 착시가 가장 세게 속이는 자리에 숨긴다 — 고르고 나면 착시를 걷어 내고 진실을 보여 준다',
  rules: ['눈을 속이는 그림 속에 진짜 정답이 숨어 있어요. 정답을 누르세요 (키보드 1 2 3).', '틀리거나 시간이 다 되면 하트 -1. 고른 뒤엔 착시를 걷어 내고 진실을 보여 줘요.', '문제마다 새 착시가 섞여 나와요. 하트 3개가 다 없어지면 끝.'],
  controls: 'touch',
  hint: '정답 누르기 / 숫자 1 2 3',
  aspect: A,
  origin: '오너 아이디어 (2026-11-08): "직접 착시 효과를 만들고 착시 효과 속에 정답을 숨겨 놓는 게임"',
  art: {
    concept: '눈속임 갤러리',
    mood: '어두운 전시실에 조명 받은 착시 그림이 한 점씩 걸린다. 고르는 순간 조명이 바뀌며 착시가 걷히고, 숨어 있던 진실이 드러난다.',
    palette: { bg: '#14121c', ink: '#f7f3ea', muted: '#6b6680', accent: '#ffcc4d', hot: '#ff5470', soft: '#2a2638' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = { rng: mulberry32(seed), t: 0, n: 0, lives: 3, score: 0, combo: 0, phase: 'ask', phaseT: 0, chosen: null, right: false, wasDown: false, seen: new Set<string>(), events: [], dead: false } as unknown as IllusionState;
    nextQ(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.phaseT++;
    s.events = s.events.filter((e) => s.t - e.t < 90);
    const down = !!inp.pointer, press = down && !s.wasDown;
    s.wasDown = down;
    if (s.phase === 'reveal') {
      if (s.phaseT >= REVEAL) (s.lives <= 0 ? (s.dead = true) : nextQ(s));
      return;
    }
    let pick: number | null | undefined = inp.pick;
    if (press && inp.pointer) {
      const p = { x: inp.pointer.x, y: inp.pointer.y * A };
      const k = boxes(s.q).findIndex((b) => p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1);
      if (k >= 0) pick = k;
    }
    if (pick !== undefined && pick !== null && pick >= 0 && pick < 3) answer(s, pick);
    else if (s.t - s.q.start >= s.q.limit) answer(s, null);
  },
  over: (s) => s.dead,
  score: (s) => s.score,
  draw(ctx, s, w, h, th: Theme) {
    const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, q = s.q;
    const truth = s.phase === 'reveal' ? Math.min(1, s.phaseT / 25) : 0; // 0 = 착시 그대로, 1 = 착시를 걷어 낸 진실
    ctx.save();
    fx.begin(ctx);
    // 전시실: 어두운 벽 + 그림을 비추는 조명 원뿔 + 떠도는 먼지
    ctx.fillStyle = th.bg;
    ctx.fillRect(-10, -10, w + 20, h + 20);
    const spot = ctx.createRadialGradient(w / 2, Y(0.1), 0, w / 2, Y(0.75), R(0.95));
    spot.addColorStop(0, s.phase === 'reveal' ? (s.right ? 'rgba(255,220,120,.22)' : 'rgba(255,84,112,.2)') : 'rgba(255,240,210,.14)');
    spot.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 30; k++) {
      ctx.fillStyle = `rgba(255,240,210,${0.15 + 0.25 * Math.abs(Math.sin(s.t / 50 + k))})`;
      ctx.fillRect(((k * 7919) % 997) / 997 * w, ((((k * 104729) % 991) / 991) * h - s.t * 0.15 * (1 + (k % 3))) % h + (k % 2 ? 0 : 0), 1.5, 1.5);
    }
    const bx = boxes(q);
    // 고를 자리: 액자
    bx.forEach((b, k) => {
      const mark = s.phase === 'reveal' && (k === q.ans || k === s.chosen);
      ctx.strokeStyle = mark ? (k === q.ans ? '#7cff9a' : th.hot) : 'rgba(255,255,255,.12)';
      ctx.lineWidth = mark ? 4 : 2;
      ctx.beginPath();
      ctx.roundRect(X(b.x0), Y(b.y0), R(b.x1 - b.x0), R(b.y1 - b.y0), 12);
      ctx.stroke();
      if (q.kind !== 'line' && q.kind !== 'motion') (ctx.fillStyle = 'rgba(255,255,255,.35)'), (ctx.font = `700 ${R(0.035)}px system-ui, sans-serif`), (ctx.textAlign = 'left'), (ctx.textBaseline = 'top'), ctx.fillText(String(k + 1), X(b.x0) + 8, Y(b.y0) + 6);
    });
    const vr = mulberry32(q.seed);
    const bandY = (k: number) => BAND0 + k * BAND + (BAND - 0.02) / 2;
    if (q.kind === 'size') {
      // 에빙하우스: 진짜 가장 큰 원(정답)에 큰 이웃을, 나머지엔 작은 이웃을
      for (let k = 0; k < 3; k++) {
        const cx = 0.3 + vr() * 0.4, cy = bandY(k), r = 0.055 * (k === q.ans ? 1 + q.diff : 1 - vr() * 0.03), big = k === q.ans;
        ctx.globalAlpha = 1 - truth;
        ctx.fillStyle = '#9aa3b5';
        const nn = big ? 6 : 9, rr = big ? 0.052 : 0.02, dd = r + rr + (big ? 0.012 : 0.008);
        for (let i = 0; i < nn; i++) (ctx.beginPath(), ctx.arc(X(cx + Math.cos((i / nn) * Math.PI * 2) * dd), Y(cy + Math.sin((i / nn) * Math.PI * 2) * dd), R(rr), 0, Math.PI * 2), ctx.fill());
        ctx.globalAlpha = 1;
        ctx.fillStyle = th.accent;
        ctx.shadowColor = th.accent;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(X(cx + (0.5 - cx) * truth), Y(cy), R(r), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    } else if (q.kind === 'length') {
      // 뮐러-라이어: 정답(가장 긴 선)엔 바깥 화살촉(짧아 보임), 나머지엔 안쪽 꼬리(길어 보임)
      for (let k = 0; k < 3; k++) {
        const L = 0.4 * (k === q.ans ? 1 + q.diff : 1 - vr() * 0.02), cx = 0.44 + vr() * 0.12, cy = bandY(k);
        const x0 = cx - L / 2 + (0.3 - (cx - L / 2)) * truth, x1 = x0 + L, f = 0.055, inward = k === q.ans;
        ctx.strokeStyle = th.ink;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(X(x0), Y(cy));
        ctx.lineTo(X(x1), Y(cy));
        ctx.stroke();
        ctx.globalAlpha = 1 - truth;
        ctx.strokeStyle = th.accent;
        for (const [ex, sgn] of [[x0, 1], [x1, -1]] as const) {
          const dir = inward ? sgn : -sgn;
          for (const up of [-1, 1]) (ctx.beginPath(), ctx.moveTo(X(ex), Y(cy)), ctx.lineTo(X(ex + dir * f * 0.8), Y(cy + up * f * 0.6)), ctx.stroke());
        }
        ctx.globalAlpha = 1;
      }
      if (truth > 0.5) {
        const L = 0.4 * (1 + q.diff);
        ctx.strokeStyle = 'rgba(124,255,154,.7)';
        ctx.setLineDash([6, 6]);
        for (const x of [0.3, 0.3 + L]) (ctx.beginPath(), ctx.moveTo(X(x), Y(BAND0)), ctx.lineTo(X(x), Y(BAND0 + 3 * BAND)), ctx.stroke());
        ctx.setLineDash([]);
      }
    } else if (q.kind === 'shade') {
      // 동시 대비: 정답(가장 밝은 네모)은 밝은 바탕에, 나머지는 어두운 바탕에
      const g0 = 0.48;
      for (let k = 0; k < 3; k++) {
        const b = bx[k], bg = k === q.ans ? 0.86 : 0.08 + vr() * 0.14, sq = k === q.ans ? g0 + q.diff : g0 - vr() * 0.02;
        const bgv = bg + (0.5 - bg) * truth, gr = ctx.createLinearGradient(X(b.x0), 0, X(b.x1), 0), c = (v: number) => `rgb(${Math.round(v * 255)},${Math.round(v * 255)},${Math.round(v * 255)})`;
        gr.addColorStop(0, c(Math.max(0, bgv - 0.06)));
        gr.addColorStop(0.5, c(bgv));
        gr.addColorStop(1, c(Math.min(1, bgv + 0.06)));
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.roundRect(X(b.x0) + 3, Y(b.y0) + 3, R(b.x1 - b.x0) - 6, R(b.y1 - b.y0) - 6, 10);
        ctx.fill();
        ctx.fillStyle = c(sq);
        ctx.fillRect(X(0.5 - 0.09), Y(bandY(k) - 0.09), R(0.18), R(0.18));
      }
    } else if (q.kind === 'line') {
      // 포겐도르프: 막대 뒤로 들어간 선이 오른쪽 셋 중 어디로 나오나
      const m = (0.45 + q.vals[0] * 0.3) * (q.vals[1] < 0.5 ? 1 : -1), y0 = m > 0 ? 0.32 : 0.92, yT = y0 + m * 0.52;
      const offs = [[0, 1, 2], [-1, 0, 1], [-2, -1, 0]][q.ans].map((o) => yT + o * q.diff); // 위에서부터 1·2·3, 정답 자리는 q.ans
      ctx.strokeStyle = th.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(X(0.06), Y(y0));
      ctx.lineTo(X(0.42 + 0.16 * truth), Y(y0 + m * (0.36 + 0.16 * truth)));
      ctx.stroke();
      offs.forEach((yy, k) => {
        ctx.strokeStyle = k === q.ans && truth > 0 ? `rgba(124,255,154,${0.5 + 0.5 * truth})` : th.ink;
        ctx.beginPath();
        ctx.moveTo(X(0.58), Y(yy));
        ctx.lineTo(X(0.94), Y(yy + m * 0.36));
        ctx.stroke();
        ctx.fillStyle = th.accent;
        ctx.font = `800 ${R(0.04)}px system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(k + 1), X(0.955), Y(yy + m * 0.36));
      });
      bx.forEach((b, k) => {
        ctx.fillStyle = th.ink;
        ctx.font = `800 ${R(0.1)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(k + 1), X((b.x0 + b.x1) / 2), Y((b.y0 + b.y1) / 2));
      });
      ctx.globalAlpha = 1 - truth * 0.85;
      const bar = ctx.createLinearGradient(X(0.42), 0, X(0.58), 0);
      bar.addColorStop(0, '#5c5872');
      bar.addColorStop(0.5, '#7a7594');
      bar.addColorStop(1, '#5c5872');
      ctx.fillStyle = bar;
      ctx.fillRect(X(0.42), Y(0.26), R(0.16), R(0.72));
      ctx.globalAlpha = 1;
    } else if (q.kind === 'motion') {
      // 움직일 때만 보이는 숫자: 숫자 안의 점은 위로, 밖의 점은 아래로 흐른다. 멈춘 화면에선 안 보인다
      const digit = q.digits![q.ans], fx0 = 0.12, fy0 = 0.26, fw = 0.76, fh = 0.72;
      const inDigit = (u: number, v: number) => { const col = Math.floor(((u - 0.2) / 0.6) * 5), row = Math.floor(((v - 0.1) / 0.8) * 7); return col >= 0 && col < 5 && row >= 0 && row < 7 && FONT[digit][row][col] === '1'; };
      const life = 24, speed = 0.004, still = s.phase === 'reveal' ? s.t - s.phaseT : s.t;
      if (truth > 0) {
        ctx.fillStyle = `rgba(255,204,77,${0.28 * truth})`;
        for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) if (FONT[digit][row][col] === '1') ctx.fillRect(X(fx0 + (0.2 + (col / 5) * 0.6) * fw), Y(fy0 + (0.1 + (row / 7) * 0.8) * fh), R((0.6 / 5) * fw) - 1, R((0.8 / 7) * fh) - 1);
      }
      for (let i = 0; i < 520; i++) {
        const off = (i * 37) % life, cyc = Math.floor((still + off) / life), age = (still + off) % life;
        const hr = mulberry32(q.seed ^ (i * 2654435761) ^ (cyc * 40503));
        const u = hr(), v0 = hr(), coherent = hr() < q.diff, inside = inDigit(u, v0);
        const dir = coherent ? (inside ? -1 : 1) : hr() < 0.5 ? -1 : 1, v = (((v0 + dir * speed * age) % 1) + 1) % 1;
        ctx.fillStyle = truth > 0 && inside ? th.accent : '#d8d2c4';
        ctx.globalAlpha = 0.85;
        ctx.fillRect(X(fx0 + u * fw) - 1.5, Y(fy0 + v * fh) - 1.5, 3, 3);
      }
      ctx.globalAlpha = 1;
      bx.forEach((b, k) => {
        ctx.fillStyle = th.ink;
        ctx.font = `800 ${R(0.12)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(q.digits![k]), X((b.x0 + b.x1) / 2), Y((b.y0 + b.y1) / 2));
      });
    } else {
      // 카페 벽: 엇갈린 흑백 타일 때문에 모든 벽이 기울어 보인다. 진짜로 기운 건 하나
      for (let k = 0; k < 3; k++) {
        const cy = bandY(k), ang = k === q.ans ? q.diff * (q.vals[2] < 0.5 ? 1 : -1) : 0, tile = 0.07, rowH = 0.055;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(X(0.5), Y(cy), R(0.45), R(0.165), 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.translate(X(0.5), Y(cy));
        ctx.rotate(ang);
        for (let row = -3; row < 3; row++) {
          const shift = [0, 0.25, 0.5, 0.25][(row + 8) % 4] * tile;
          for (let x = -0.6; x < 0.6; x += tile) {
            ctx.fillStyle = Math.round((x + 0.6) / tile) % 2 ? '#111' : '#f2f2f2';
            ctx.fillRect(R(x + shift), R(row * rowH), R(tile) + 0.5, R(rowH - 0.004));
          }
          ctx.fillStyle = '#888';
          ctx.fillRect(R(-0.6), R(row * rowH + rowH - 0.004), R(1.2), R(0.004));
        }
        if (truth > 0) (ctx.strokeStyle = k === q.ans ? '#7cff9a' : 'rgba(124,255,154,.6)'), (ctx.lineWidth = 3), ctx.beginPath(), ctx.moveTo(R(-0.5), 0), ctx.lineTo(R(0.5), 0), ctx.stroke();
        ctx.restore();
        if (truth > 0) (ctx.strokeStyle = th.hot), (ctx.lineWidth = 2), ctx.setLineDash([5, 5]), ctx.beginPath(), ctx.moveTo(X(0.06), Y(cy)), ctx.lineTo(X(0.94), Y(cy)), ctx.stroke(), ctx.setLineDash([]);
      }
    }
    const seenT = fx.memo.t ?? -1;
    for (const e of s.events) {
      if (e.t <= seenT) continue;
      if (e.kind === 'right') fx.burst(X(e.x), Y(e.y), th.accent, 26, 4), fx.ring(X(e.x), Y(e.y), '#7cff9a', 120, 6), fx.pop(X(e.x), Y(e.y), e.text!, '#7cff9a', 20);
      if (e.kind === 'wrong') fx.kick(12), fx.blink(th.hot, 0.35), fx.pop(X(e.x), Y(e.y), e.text!, th.hot, 22);
      if (e.kind === 'new') fx.pop(w / 2, h * 0.5, e.text!, th.accent, 20);
    }
    fx.memo.t = s.t;
    ctx.restore();
    // 머리말: 문제 · 남은 시간 막대 · 점수 · 하트
    const left = s.phase === 'ask' ? Math.max(0, 1 - (s.t - q.start) / q.limit) : 0;
    ctx.fillStyle = 'rgba(255,255,255,.1)';
    ctx.fillRect(0, 0, w, 5);
    ctx.fillStyle = left < 0.3 ? th.hot : th.accent;
    ctx.fillRect(0, 0, w * left, 5);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = th.ink;
    ctx.font = `800 ${R(0.06)}px system-ui, sans-serif`;
    ctx.fillText(String(s.score), 10, 12);
    ctx.textAlign = 'right';
    ctx.fillStyle = th.hot;
    ctx.font = `700 ${R(0.045)}px system-ui, sans-serif`;
    ctx.fillText('♥'.repeat(Math.max(0, s.lives)), w - 10, 14);
    ctx.textAlign = 'center';
    ctx.fillStyle = th.ink;
    ctx.font = `800 ${R(0.048)}px system-ui, sans-serif`;
    ctx.fillText(s.phase === 'reveal' ? (s.right ? '정답! 착시를 걷어 내면…' : s.chosen === null ? '시간 끝! 진실은…' : '속았다! 진실은…') : KINDS.find((k) => k.kind === q.kind)!.ask, w / 2, Y(0.1));
    ctx.font = `600 ${R(0.03)}px system-ui, sans-serif`;
    ctx.fillStyle = th.muted;
    const next = KINDS.find((k) => k.from > s.n - 1);
    ctx.fillText(`${s.n}번째 그림${s.combo > 1 ? ` · 연속 ${s.combo}` : ''}${next ? ` · ${next.from + 1}번째 그림부터 새 착시 ???` : ''}`, w / 2, Y(0.165));
  },
};

/** 5×7 숫자 글꼴 (움직일 때만 보이는 숫자용) */
const FONT: Record<number, string[]> = {
  2: ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
};

const plan = new WeakMap<object, { n: number; at: number; pick: number }>();
/** 봇: 아무 때나 아무거나 누른다 */
export const illusionRandom: Bot<IllusionState> = {
  name: '찍기',
  act(s, rng) {
    let p = plan.get(s);
    if (!p || p.n !== s.q.n) plan.set(s, (p = { n: s.q.n, at: s.q.start + 20 + Math.floor(rng() * s.q.limit * 1.1), pick: Math.floor(rng() * 3) }));
    return { tap: false, dir: 0, pick: s.phase === 'ask' && s.t >= p.at ? p.pick : undefined };
  },
};

/** 봇: 꼼꼼히 보는 사람 흉내 — 1~2초(움직이는 숫자·벽은 더 오래) 보고 고르고, 어려워질수록 착시에 더 자주 속는다 */
export const illusionSmart: Bot<IllusionState> = {
  name: '눈썰미',
  act(s, rng) {
    let p = plan.get(s);
    if (!p || p.n !== s.q.n) {
      const slow = s.q.kind === 'motion' || s.q.kind === 'wall' ? 70 : 0, fooled = rng() < 0.03 + 0.5 * s.q.hard ** 1.5;
      plan.set(s, (p = { n: s.q.n, at: s.q.start + 45 + slow + Math.floor(rng() * (60 + 40 * s.q.hard)), pick: fooled ? (s.q.ans + 1 + Math.floor(rng() * 2)) % 3 : s.q.ans }));
    }
    return { tap: false, dir: 0, pick: s.phase === 'ask' && s.t >= p.at ? p.pick : undefined };
  },
};
