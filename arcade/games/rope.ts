/**
 * 밧줄 동굴 (0023, 10라운드 '탐험 쪽') — 밧줄 그네 × 피하기 · 가리키기 · 깊어지는 판.
 *  - 조작: 누르면 손가락에서 가장 가까운 고리에 밧줄이 걸려 그쪽으로 끌려가며 흔들리고, 떼면 놓는다. 손가락을 다른 고리로 옮기면 바꿔 건다.
 *  - 위에서 동굴이 무너져 내려온다 → 계속 내려가야 한다. 가시 바위·가시 턱에 닿으면 하트 -1.
 *  - 깊이마다 새 구역이 열린다(수정 → 박쥐 굴 → 얼음 → 지하 폭포 → 용암 → 고대 유적). 옆 깊이계에 못 본 구역이 "???"로 예고된다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { drift as dust, juice } from '../juice.ts';

const A = 1.5, ROW = 0.05, BODY = 0.018, REACH = 0.5, G = 0.9 / 3600, VMAX = 0.0155, REEL = 0.5 / 60;
/** 구역이 열리는 깊이(m) — 처음엔 빨리, 갈수록 길게 */
const ZONE_AT = [0, 80, 180, 300, 440, 600, 800];
interface Zone { name: string; rock: string; glow: string; note: string }
const ZONES: Zone[] = [
  { name: '이끼 동굴', rock: '#1d3b2f', glow: '#7be0a0', note: '고리를 눌러 내려가요' },
  { name: '수정 동굴', rock: '#3a1d4a', glow: '#ff7ce0', note: '수정 가시가 빽빽해요!' },
  { name: '박쥐 굴', rock: '#2a2233', glow: '#c9a0ff', note: '박쥐가 날아다녀요!' },
  { name: '얼음 동굴', rock: '#1b3550', glow: '#9ee8ff', note: '얼음 고리는 금방 깨져요!' },
  { name: '지하 폭포', rock: '#123a4a', glow: '#5cc8ff', note: '물살이 옆으로 밀어요!' },
  { name: '용암 동굴', rock: '#4a1a12', glow: '#ff8a3d', note: '용암 기둥이 솟구쳐요!' },
  { name: '고대 유적', rock: '#3d3418', glow: '#ffd75e', note: '금 고리는 두 배로 당겨요!' },
];
type PegKind = 'peg' | 'ice' | 'gold';
interface Peg { x: number; y: number; kind: PegKind; crack: number; gone: boolean }
interface Thorn { x: number; y: number; r: number }
interface Ledge { y: number; x0: number; x1: number }
interface Bat { y: number; mid: number; amp: number; ph: number }
interface Gem { x: number; y: number; heart: boolean; taken: boolean }
interface Band { y0: number; y1: number; push: number }
interface Geyser { x: number; y: number; ph: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string }
export interface Body { x: number; y: number; px: number; py: number; peg: Peg | null; len: number }
export interface RopeState {
  rng: Rng; t: number; p: Body; cam: number; fall: number; hp: number; inv: number;
  rows: { c: number; hw: number }[]; cv: number; genY: number;
  pegs: Peg[]; thorns: Thorn[]; ledges: Ledge[]; bats: Bat[]; gems: Gem[]; bands: Band[]; geysers: Geyser[];
  nextLedge: number; ledgeLeft: boolean; ptr: { x: number; y: number } | null; started: boolean;
  best: number; gemCount: number; zone: number; seen: Set<string>; events: Ev[]; dead: boolean;
}

const zoneAt = (y: number) => ZONE_AT.filter((m) => m <= y * 10).length - 1;
const row = (s: RopeState, y: number) => s.rows[Math.max(0, Math.min(s.rows.length - 1, Math.floor(y / ROW)))];
const batX = (b: Bat, t: number) => b.mid + b.amp * Math.sin(t * 0.035 + b.ph);
const geyserOn = (g: Geyser, t: number) => Math.sin(t * 0.04 + g.ph) > 0.35;
const ev = (s: RopeState, kind: string, x: number, y: number, text?: string) => s.events.push({ t: s.t, kind, x, y, text });

/** 아래쪽 동굴을 미리 만들어 둔다 (플레이어보다 3칸 아래까지) */
function extend(s: RopeState) {
  const r = s.rng;
  while (s.genY < s.p.y + 3) {
    const y = s.genY, z = zoneAt(y), last = s.rows.at(-1)!;
    const hw = Math.max(0.21, 0.4 - y * 0.005), hard = Math.min(1, y / 120); // 깊을수록 좁고 빽빽하다
    s.cv = (s.cv + (r() - 0.5) * 0.006) * 0.96;
    let c = last.c + s.cv;
    if (c < hw + 0.03 || c > 1 - hw - 0.03) (s.cv = -s.cv), (c = Math.max(hw + 0.03, Math.min(1 - hw - 0.03, c)));
    s.rows.push({ c, hw });
    const i = s.rows.length;
    if (i % 6 === 0) {
      const kind: PegKind = z === 6 && r() < 0.4 ? 'gold' : (z === 3 && r() < 0.6) || (z > 3 && r() < 0.2) ? 'ice' : 'peg';
      s.pegs.push({ x: c + (r() - 0.5) * hw * 1.4, y, kind, crack: 0, gone: false });
    }
    if (y >= s.nextLedge) {
      const f = 0.5 + r() * 0.2, left = s.ledgeLeft;
      const x0 = left ? c - hw : c + hw - 2 * hw * f, x1 = left ? c - hw + 2 * hw * f : c + hw;
      s.ledges.push({ y, x0, x1 });
      const gap = left ? (x1 + c + hw) / 2 : (c - hw + x0) / 2;
      s.pegs.push({ x: gap, y: y - 0.3, kind: 'peg', crack: 0, gone: false });
      s.ledgeLeft = !left;
      s.nextLedge = y + 1.2 + r() * 0.5 - 0.55 * hard;
    } else if (y > 1 && Math.abs(s.nextLedge - y) > 0.3 && y - (s.ledges.at(-1)?.y ?? -9) > 0.25 && (i % 15 === 7 || (z === 1 && i % 15 === 0)) && r() < 0.5 + 0.5 * hard) s.thorns.push({ x: c + (r() - 0.5) * hw * 1.2, y, r: 0.022 + r() * 0.015 });
    if (i % 12 === 3 && r() < 0.7) for (let k = 0; k < 3; k++) s.gems.push({ x: c + (k - 1) * 0.06 + (r() - 0.5) * 0.1, y: y + k * 0.04, heart: false, taken: false });
    if (z >= 1 && i % 360 === 180) s.gems.push({ x: c, y, heart: true, taken: false });
    if (z >= 2 && i % 26 === 13 && r() < 0.5 + 0.5 * hard) s.bats.push({ y, mid: c, amp: hw * 0.8, ph: r() * 6 });
    if (z >= 4 && i % 40 === 20 && r() < 0.75) s.bands.push({ y0: y, y1: y + 0.3, push: (r() < 0.5 ? -1 : 1) * 0.3 / 3600 });
    if (z >= 5 && i % 30 === 15 && Math.abs(s.nextLedge - y) > 0.4 && r() < 0.8) s.geysers.push({ x: c + (r() - 0.5) * hw, y, ph: r() * 6 });
    s.genY += ROW;
  }
}

/** 몸 한 틱 (게임과 봇의 내다보기가 같이 쓴다). 돌려주는 값: 다쳤으면 'hurt' */
export function physics(s: RopeState, b: Body, t: number): 'hurt' | null {
  const vx0 = b.x - b.px, vy0 = b.y - b.py;
  let vx = vx0, vy = vy0 + G;
  for (const band of s.bands) if (b.y > band.y0 && b.y < band.y1) vx += band.push;
  const sp = Math.hypot(vx, vy);
  if (sp > VMAX) (vx *= VMAX / sp), (vy *= VMAX / sp);
  b.px = b.x;
  b.py = b.y;
  b.x += vx;
  b.y += vy;
  if (b.peg) {
    b.len = Math.max(0.04, b.len - REEL * (b.peg.kind === 'gold' ? 2 : 1));
    const dx = b.x - b.peg.x, dy = b.y - b.peg.y, d = Math.hypot(dx, dy);
    if (d > b.len) (b.x = b.peg.x + (dx / d) * b.len), (b.y = b.peg.y + (dy / d) * b.len);
  }
  let hurt: 'hurt' | null = null;
  const rw = row(s, b.y), lo = rw.c - rw.hw + BODY, hi = rw.c + rw.hw - BODY;
  if (b.x < lo || b.x > hi) {
    const x = b.x < lo ? lo : hi;
    b.px = x + (x - b.px) * 0.4; // 벽에 튕김
    b.x = x;
  }
  for (const l of s.ledges) {
    if (Math.abs(l.y - b.y) > 0.05 || b.x < l.x0 - BODY || b.x > l.x1 + BODY) continue;
    if ((b.py <= l.y && b.y + BODY >= l.y) || Math.abs(b.y - l.y) < BODY) {
      b.y = l.y - BODY - 0.002;
      b.py = b.y + 0.008; // 위로 튕김
      hurt = 'hurt';
    }
  }
  for (const th of s.thorns) {
    if (Math.abs(th.y - b.y) > 0.08) continue;
    const dx = b.x - th.x, dy = b.y - th.y, d = Math.hypot(dx, dy);
    if (d < th.r + BODY) (b.x = th.x + (dx / d) * (th.r + BODY)), (b.y = th.y + (dy / d) * (th.r + BODY)), (b.px = b.x - dx / d * 0.006), (b.py = b.y - dy / d * 0.006), (hurt = 'hurt');
  }
  for (const bt of s.bats) if (Math.abs(bt.y - b.y) < 0.03 && Math.abs(batX(bt, t) - b.x) < 0.035) hurt = 'hurt';
  for (const g of s.geysers) if (geyserOn(g, t) && Math.abs(g.x - b.x) < 0.03 && b.y > g.y - 0.35 && b.y < g.y) hurt = 'hurt';
  return hurt;
}

/** 손가락(화면 좌표)에서 가장 가까운, 닿는 고리 */
function pegNear(s: RopeState, ptr: { x: number; y: number }): Peg | null {
  const wx = ptr.x, wy = s.cam + ptr.y * A;
  let best: Peg | null = null, bd = 1e9;
  for (const p of s.pegs) {
    if (p.gone || Math.hypot(p.x - s.p.x, p.y - s.p.y) > REACH) continue;
    const d = Math.hypot(p.x - wx, p.y - wy);
    if (d < bd) (bd = d), (best = p);
  }
  return best;
}

function grab(s: RopeState, peg: Peg | null) {
  s.p.peg = peg;
  if (peg) (s.p.len = Math.max(0.04, Math.hypot(peg.x - s.p.x, peg.y - s.p.y))), ev(s, 'grab', peg.x, peg.y);
}

export const rope: GameDef<RopeState> = {
  id: 'rope',
  name: '밧줄 동굴',
  genes: ['grapple', 'dodge', 'pointer', 'depth'],
  twist: '그네 타기를 아래로 — 위에서 무너지는 동굴에 쫓기며, 누른 고리로 끌려가 흔들려 내려간다. 깊이마다 새 구역',
  rules: ['누르면 손가락 가까운 고리에 밧줄을 걸어 끌려가고, 떼면 놓아요 (키보드: 화살표 + 스페이스).', '위에서 동굴이 무너져요. 계속 내려가요! 가시·박쥐에 닿으면 하트 -1.', '내려갈수록 새 구역이 열려요. 보석을 모으고 더 깊이!'],
  controls: 'touch',
  hint: '고리를 눌러 밧줄 걸기 · 떼면 놓기 / 화살표 + 스페이스',
  aspect: A,
  art: {
    concept: '깊어지는 동굴 탐험',
    mood: '헬멧 등불 하나로 내려가는 세로 동굴. 이끼의 초록에서 수정의 분홍, 얼음의 하늘색, 용암의 주황, 유적의 금빛으로 구역마다 색이 바뀐다.',
    palette: { bg: '#0b0f14', ink: '#f4f1e8', muted: '#4b5866', accent: '#7be0a0', hot: '#ff5a5a', soft: '#1a222c' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s: RopeState = {
      rng: mulberry32(seed), t: 0, p: { x: 0.5, y: 0.3, px: 0.5, py: 0.3, peg: null, len: 0 }, cam: -0.2, fall: -0.9, hp: 3, inv: 0,
      rows: [{ c: 0.5, hw: 0.4 }], cv: 0, genY: ROW, pegs: [], thorns: [], ledges: [], bats: [], gems: [], bands: [], geysers: [],
      nextLedge: 2, ledgeLeft: true, ptr: null, started: false, best: 0, gemCount: 0, zone: 0, seen: new Set(), events: [], dead: false,
    };
    s.pegs.push({ x: 0.5, y: 0.15, kind: 'peg', crack: 0, gone: false });
    extend(s);
    s.p.peg = s.pegs[0];
    s.p.len = 0.15;
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.events = s.events.filter((e) => s.t - e.t < 90);
    // 누르는 순간, 또는 누른 채 손가락을 다른 고리 쪽으로 옮기면 건다. 떼면 놓는다
    const ptr = inp.pointer ?? null;
    if (ptr) s.started = true;
    if (!ptr) {
      if (s.started) s.p.peg = null; // 처음 누르기 전까지는 첫 고리에 매달려 기다린다
    } else if (!s.ptr || Math.hypot(ptr.x - s.ptr.x, ptr.y - s.ptr.y) > 0.03) {
      const peg = pegNear(s, ptr);
      if (peg !== s.p.peg) grab(s, peg);
    }
    if (ptr && (!s.ptr || Math.hypot(ptr.x - s.ptr.x, ptr.y - s.ptr.y) > 0.03)) s.ptr = { ...ptr };
    if (!ptr) s.ptr = null;
    if (s.p.peg?.kind === 'ice' && ++s.p.peg.crack > 70) (s.p.peg.gone = true), ev(s, 'crack', s.p.peg.x, s.p.peg.y, '쩍!'), (s.p.peg = null);
    if (s.inv > 0) s.inv--;
    if (physics(s, s.p, s.t) && s.inv === 0) {
      s.hp--;
      s.inv = 60;
      ev(s, 'hurt', s.p.x, s.p.y, '아야!');
    }
    for (const g of s.gems) {
      if (g.taken || Math.hypot(g.x - s.p.x, g.y - s.p.y) > BODY + 0.02) continue;
      g.taken = true;
      if (g.heart) {
        if (s.hp < 3) s.hp++;
        ev(s, 'heart', g.x, g.y, '♥ +1');
        if (!s.seen.has('heart')) (s.seen.add('heart'), ev(s, 'new', 0.5, 0, '하트를 찾았어요!'));
      } else (s.gemCount++, ev(s, 'gem', g.x, g.y, '+5'));
    }
    // 무너짐: 점점 빨라지고, 너무 멀어지지는 않는다
    s.fall = Math.max(s.fall + (0.1 + 0.006 * (s.t / 60)) / 60, s.p.y - 2.2);
    if (s.p.y < s.fall + BODY) s.dead = true;
    if (s.hp <= 0) s.dead = true;
    s.best = Math.max(s.best, s.p.y);
    const z = zoneAt(s.p.y);
    if (z > s.zone) {
      s.zone = z;
      s.seen.add('zone' + z);
      ev(s, 'zone', 0.5, s.p.y, `${ZONES[z].name} — ${ZONES[z].note}`);
    }
    s.cam += (s.p.y - 0.55 - s.cam) * 0.12;
    extend(s);
    const cut = Math.min(s.fall, s.cam) - 0.3;
    if (s.t % 30 === 0) {
      s.pegs = s.pegs.filter((p) => p.y > cut || p === s.p.peg);
      s.thorns = s.thorns.filter((x) => x.y > cut);
      s.ledges = s.ledges.filter((x) => x.y > cut);
      s.bats = s.bats.filter((x) => x.y > cut);
      s.gems = s.gems.filter((x) => x.y > cut && !x.taken);
      s.bands = s.bands.filter((x) => x.y1 > cut);
      s.geysers = s.geysers.filter((x) => x.y > cut);
    }
  },
  over: (s) => s.dead,
  score: (s) => Math.floor(s.best * 10) + s.gemCount * 5,
  draw(ctx, s, w, h, th: Theme) {
    const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => (y - s.cam) * w, R = (r: number) => r * w;
    const z = zoneAt(s.p.y), zn = ZONES[z], nx = ZONES[Math.min(ZONES.length - 1, z + 1)];
    ctx.save();
    fx.begin(ctx);
    // 배경: 지금 구역 → 아래쪽은 다음 구역 색이 비친다 (예고)
    const toNext = z < ZONES.length - 1 ? (s.p.y * 10 - ZONE_AT[z]) / (ZONE_AT[z + 1] - ZONE_AT[z]) : 0;
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#05070a');
    bg.addColorStop(0.7, zn.rock);
    bg.addColorStop(1, z < ZONES.length - 1 && toNext > 0.6 ? nx.rock : zn.rock);
    ctx.fillStyle = bg;
    ctx.fillRect(-10, -10, w + 20, h + 20);
    dust(ctx, w, h, -s.cam * 400, zn.glow, 40, 1);
    // 먼 배경 바위 기둥 (반 속도로 지나간다)
    ctx.fillStyle = 'rgba(255,255,255,.035)';
    for (let k = 0; k < 6; k++) {
      const y = ((k * 0.55 - s.cam * 0.5) % 3.3 + 3.3) % 3.3 - 0.3;
      ctx.beginPath();
      ctx.ellipse(X(((k * 0.37) % 1)), Y(s.cam + y), R(0.09 + (k % 3) * 0.04), R(0.3), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // 동굴 벽 (바깥을 바위로 칠한다)
    const i0 = Math.max(0, Math.floor(s.cam / ROW) - 1), i1 = Math.min(s.rows.length - 1, Math.ceil((s.cam + A) / ROW) + 1);
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#0a0c10';
      ctx.beginPath();
      ctx.moveTo(side < 0 ? -10 : w + 10, Y(i0 * ROW));
      for (let i = i0; i <= i1; i++) ctx.lineTo(X(s.rows[i].c + side * s.rows[i].hw), Y(i * ROW));
      ctx.lineTo(side < 0 ? -10 : w + 10, Y(i1 * ROW));
      ctx.fill();
      ctx.strokeStyle = zn.glow;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = i0; i <= i1; i++) ctx.lineTo(X(s.rows[i].c + side * s.rows[i].hw), Y(i * ROW));
      ctx.stroke();
      ctx.globalAlpha = 1;
      // 벽에 돋은 결정·종유석 (구역 색)
      ctx.fillStyle = zn.glow;
      ctx.globalAlpha = 0.55;
      for (let i = i0 - (i0 % 4); i <= i1; i += 4) {
        const rw = s.rows[i], x = X(rw.c + side * rw.hw), y = Y(i * ROW), len = R(0.015 + ((i * 37) % 7) * 0.004);
        ctx.beginPath();
        ctx.moveTo(x, y - 4);
        ctx.lineTo(x - side * len, y);
        ctx.lineTo(x, y + 4);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    for (const b of s.bands) {
      ctx.strokeStyle = 'rgba(120,200,255,.35)';
      ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        const y = Y(b.y0 + (k + 0.5) * 0.075), off = ((s.t * 2 * Math.sign(b.push)) % 40) + k * 10;
        ctx.beginPath();
        for (let x = -40; x < w + 40; x += 20) ctx.lineTo(x + off, y + Math.sin((x + off) / 12) * 3);
        ctx.stroke();
      }
    }
    for (const l of s.ledges) {
      ctx.fillStyle = '#2b2f36';
      ctx.fillRect(X(l.x0), Y(l.y), R(l.x1 - l.x0), R(0.025));
      ctx.fillStyle = th.hot;
      for (let x = l.x0; x < l.x1 - 0.01; x += 0.022) {
        ctx.beginPath();
        ctx.moveTo(X(x), Y(l.y));
        ctx.lineTo(X(x + 0.011), Y(l.y) - R(0.018));
        ctx.lineTo(X(x + 0.022), Y(l.y));
        ctx.fill();
      }
    }
    for (const t of s.thorns) {
      ctx.fillStyle = '#3a2a2a';
      ctx.strokeStyle = th.hot;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2 + s.t * 0.01, r = R(k % 2 ? t.r : t.r * 1.45);
        ctx.lineTo(X(t.x) + Math.cos(a) * r, Y(t.y) + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    for (const g of s.geysers) {
      const on = geyserOn(g, s.t);
      ctx.fillStyle = on ? 'rgba(255,120,40,.75)' : 'rgba(255,120,40,.25)';
      ctx.fillRect(X(g.x) - R(on ? 0.025 : 0.012), Y(g.y - (on ? 0.35 : 0.03)), R(on ? 0.05 : 0.024), R(on ? 0.35 : 0.03));
      if (on && s.t % 4 === 0) fx.burst(X(g.x), Y(g.y - 0.3), '#ffb347', 2, 2, 2);
    }
    for (const g of s.gems) {
      if (g.taken) continue;
      const x = X(g.x), y = Y(g.y), r = R(0.014) * (1 + 0.15 * Math.sin(s.t / 8 + g.x * 20));
      ctx.fillStyle = g.heart ? th.hot : zn.glow;
      ctx.beginPath();
      if (g.heart) ctx.arc(x, y, r * 1.3, 0, Math.PI * 2);
      else (ctx.moveTo(x, y - r * 1.3), ctx.lineTo(x + r, y), ctx.lineTo(x, y + r * 1.3), ctx.lineTo(x - r, y));
      ctx.fill();
    }
    for (const p of s.pegs) {
      if (p.gone) continue;
      const near = Math.hypot(p.x - s.p.x, p.y - s.p.y) <= REACH;
      ctx.strokeStyle = p.kind === 'gold' ? '#ffd75e' : p.kind === 'ice' ? '#bff3ff' : near ? th.ink : th.muted;
      ctx.lineWidth = p === s.p.peg ? 4 : 3;
      ctx.globalAlpha = near ? 1 : 0.45;
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), R(0.016), 0, Math.PI * 2);
      ctx.stroke();
      if (p.kind === 'ice' && p.crack > 0) (ctx.beginPath(), ctx.moveTo(X(p.x) - 5, Y(p.y) - 5), ctx.lineTo(X(p.x) + 4, Y(p.y) + 5), ctx.stroke());
      ctx.globalAlpha = 1;
    }
    for (const b of s.bats) {
      const x = X(batX(b, s.t)), y = Y(b.y), f = Math.sin(s.t / 3 + b.ph) * R(0.015);
      ctx.fillStyle = '#4a2f73';
      ctx.strokeStyle = '#c9a0ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - R(0.035), y - f);
      ctx.lineTo(x - R(0.01), y - R(0.004));
      ctx.lineTo(x, y + R(0.012));
      ctx.lineTo(x + R(0.01), y - R(0.004));
      ctx.lineTo(x + R(0.035), y - f);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ff6b81';
      ctx.fillRect(x - 3, y - 2, 2, 2);
      ctx.fillRect(x + 1, y - 2, 2, 2);
    }
    // 밧줄과 탐험가 (헬멧 등불이 아래를 비춘다)
    const px = X(s.p.x), py = Y(s.p.y);
    const cone = ctx.createRadialGradient(px, py, 0, px, py + R(0.2), R(0.3));
    cone.addColorStop(0, 'rgba(255,240,200,.28)');
    cone.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - R(0.2), py + R(0.45));
    ctx.lineTo(px + R(0.2), py + R(0.45));
    ctx.fill();
    if (s.p.peg) {
      ctx.strokeStyle = '#e8d6a8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(X(s.p.peg.x), Y(s.p.peg.y));
      ctx.stroke();
    }
    ctx.globalAlpha = s.inv > 0 && s.t % 8 < 4 ? 0.4 : 1;
    // 탐험가: 주황 옷 + 노란 헬멧 + 등불
    ctx.fillStyle = '#e07a3a';
    ctx.beginPath();
    ctx.arc(px, py + R(0.004), R(BODY * 1.15), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(px, py - R(0.006), R(BODY * 0.95), Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#fff6c8';
    ctx.beginPath();
    ctx.arc(px, py - R(0.012), 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // 무너짐: 위에서 떨어지는 돌무더기
    const fy = Y(s.fall);
    if (fy > -40) {
      ctx.fillStyle = '#2a2420';
      ctx.fillRect(-10, -10, w + 20, fy + 10);
      for (let k = 0; k < 12; k++) {
        const x = ((k * 97 + s.t * 3) % (w + 40)) - 20, y = fy + ((k * 31 + s.t * 4) % 30);
        ctx.fillRect(x, y, 6 + (k % 3) * 3, 6 + (k % 3) * 3);
      }
      if (py - fy < R(0.5)) fx.kick(2);
    }
    const seenT = fx.memo.t ?? -1;
    for (const e of s.events) {
      if (e.t <= seenT) continue;
      if (e.kind === 'gem') fx.burst(X(e.x), Y(e.y), zn.glow, 12, 2.5), fx.pop(X(e.x), Y(e.y) - 10, e.text!, zn.glow, 14);
      if (e.kind === 'heart') fx.burst(X(e.x), Y(e.y), th.hot, 18, 3), fx.pop(X(e.x), Y(e.y) - 10, e.text!, th.hot);
      if (e.kind === 'grab') fx.burst(X(e.x), Y(e.y), '#e8d6a8', 5, 1.5, 2);
      if (e.kind === 'crack') fx.burst(X(e.x), Y(e.y), '#bff3ff', 14, 3), fx.pop(X(e.x), Y(e.y) - 10, e.text!, '#bff3ff');
      if (e.kind === 'hurt') fx.kick(10), fx.blink(th.hot, 0.3), fx.pop(px, py - 16, e.text!, th.hot);
      if (e.kind === 'zone') fx.blink(zn.glow, 0.35), fx.pop(w / 2, h * 0.22, e.text!, zn.glow, 17), fx.burst(w / 2, h * 0.22, zn.glow, 30, 4);
      if (e.kind === 'new') fx.pop(w / 2, h * 0.3, e.text!, th.hot, 16);
    }
    fx.memo.t = s.t;
    ctx.restore();
    // 머리말: 깊이·보석·하트, 오른쪽 깊이계 (못 본 구역은 ???)
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = th.ink;
    ctx.font = `800 ${R(0.075)}px system-ui, sans-serif`;
    ctx.fillText(`${Math.floor(s.p.y * 10)}m`, 10, 8);
    ctx.font = `700 ${R(0.04)}px system-ui, sans-serif`;
    ctx.fillStyle = zn.glow;
    ctx.fillText(`◆ ${s.gemCount} · ${zn.name}`, 10, 10 + R(0.08));
    ctx.fillStyle = th.hot;
    ctx.fillText('♥'.repeat(Math.max(0, s.hp)), 10, 14 + R(0.13));
    const gx = w - 14, gy0 = R(0.06), gh = h - R(0.12);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fillRect(gx - 2, gy0, 4, gh);
    ctx.textAlign = 'right';
    ctx.font = `700 ${R(0.028)}px system-ui, sans-serif`;
    for (let k = 0; k < ZONES.length; k++) {
      const y = gy0 + (gh * ZONE_AT[k]) / 900;
      ctx.fillStyle = k <= s.zone ? ZONES[k].glow : th.muted;
      ctx.fillRect(gx - 5, y, 10, 2);
      ctx.fillText(k <= s.zone ? ZONES[k].name : k === s.zone + 1 ? `??? ${ZONE_AT[k] - Math.floor(s.p.y * 10)}m` : '???', gx - 8, y - 4);
    }
    ctx.fillStyle = th.ink;
    ctx.beginPath();
    ctx.arc(gx, gy0 + gh * Math.min(1, (s.p.y * 10) / 900), 5, 0, Math.PI * 2);
    ctx.fill();
  },
};

const memo = new WeakMap<object, Input>();
/** 봇: 0.7초쯤마다 아무 데나 누르거나 뗀다 */
export const ropeRandom: Bot<RopeState> = {
  name: '아무 데나',
  act(s, rng) {
    if (s.t % 40 === 0 || !memo.has(s)) memo.set(s, { tap: false, dir: 0, pointer: rng() < 0.5 ? { x: rng(), y: rng() } : null });
    return memo.get(s)!;
  },
};

/** 봇: "놓기 / 닿는 고리마다 잠깐·오래 걸기"를 0.8초씩 굴려 보고, 덜 다치고 더 깊이·보석을 얻는 쪽 */
export const ropeSmart: Bot<RopeState> = {
  name: '내다보기',
  act(s) {
    const options: (Peg | null)[] = [null, ...s.pegs.filter((p) => !p.gone && Math.hypot(p.x - s.p.x, p.y - s.p.y) <= REACH).sort((a, b) => Math.hypot(a.x - s.p.x, a.y - s.p.y) - Math.hypot(b.x - s.p.x, b.y - s.p.y)).slice(0, 5)];
    let best = { v: -1e9, peg: null as Peg | null };
    for (const peg of options) for (const hold of peg ? [8, 20, 32, 48] : [0]) {
      const b: Body = { ...s.p, peg: peg === s.p.peg ? s.p.peg : null };
      if (peg && peg !== s.p.peg) b.peg = peg, (b.len = Math.max(0.04, Math.hypot(peg.x - b.x, peg.y - b.y)));
      let hurt = 0, gems = 0, fall = s.fall;
      for (let k = 0; k < 48; k++) {
        if (k === hold) b.peg = null;
        if (physics(s, b, s.t + k)) hurt++;
        fall += (0.1 + 0.006 * ((s.t + k) / 60)) / 60;
        for (const g of s.gems) if (!g.taken && Math.hypot(g.x - b.x, g.y - b.y) < BODY + 0.02) gems++;
      }
      // 아래 가시 턱 위에 서 있으면 틈까지 거리만큼 감점 (틈 쪽으로 가게)
      let block = 0;
      for (const l of s.ledges) if (l.y > b.y && l.y - b.y < 0.7 && b.x > l.x0 - BODY && b.x < l.x1 + BODY) block = Math.max(block, Math.min(b.x - l.x0 + BODY, l.x1 + BODY - b.x));
      const v = (b.y - s.p.y) * 30 - (hurt ? 60 + hurt : 0) + Math.min(gems, 6) * 1.5 - (b.y - fall < 0.5 ? (0.5 - (b.y - fall)) * 80 : 0) - block * 100 + (peg && peg === s.p.peg ? 1 : 0);
      if (v > best.v) best = { v, peg };
    }
    if (!best.peg) return { tap: false, dir: 0, pointer: null };
    return { tap: false, dir: 0, pointer: { x: best.peg.x, y: (best.peg.y - s.cam) / A } };
  },
};
