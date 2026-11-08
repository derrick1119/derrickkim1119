/**
 * 도미노 도시 (0030, 14라운드 · 오너가 고른 메뉴 3번) — 연쇄 × 그리기 · 가리키기.
 * 와우: 손가락으로 선을 그으면 그 길을 따라 도미노가 줄지어 깔리고, 초록 도미노를 톡 치면 도시 전체를 도는 연쇄 쇼.
 * 첫 3초: 첫 판은 이미 다 깔려 있다 — 톡 치기만 하면 우르르 넘어가 종이 울린다. 둘째 판부터 끊긴 곳을 그어 잇는다.
 * 목표·보상: 판마다 목표(종·풍선·버튼) 전부, 남긴 도미노가 많을수록 별. 실패하면 하트 -1, 같은 판 다시.
 * 하는 일이 바뀐다: 풍선(여러 갈래) → 버튼과 문(버튼을 먼저 넘어뜨려야 문이 열림) → 대포(멀리 한 방에) → 떠다니는 풍선 → 황금 종.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.35, SP = 0.03, REACH = 0.042, DELAY = 5, BUILD_TIME = 60 * 40;
type TKind = 'bell' | 'balloon' | 'switch' | 'cannon' | 'goldbell';
interface Dom { x: number; y: number; a: number; mine: boolean; fell: number; start?: boolean }
interface Target { kind: TKind; x: number; y: number; hit: number; gate?: number; dir?: number; drift?: number }
interface Gate { x0: number; y0: number; x1: number; y1: number; open: boolean }
interface Box { x0: number; y0: number; x1: number; y1: number; h: number }
interface Ball { x: number; y: number; vx: number; vy: number; life: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string }
export interface DominoState {
  rng: Rng; t: number; k: number; seed: number; phase: 'build' | 'run' | 'clear' | 'fail'; phaseT: number;
  doms: Dom[]; targets: Target[]; gates: Gate[]; boxes: Box[]; balls: Ball[]; budget: number; left: number; last: { x: number; y: number } | null; down: boolean;
  tapAt: { x: number; y: number; t: number } | null; ptr: { x: number; y: number } | null;
  chain: number; lastFall: number; hearts: number; stars: number; lastStars: number; total: number; seen: Set<string>; events: Ev[]; dead: boolean;
}

const ev = (s: DominoState, kind: string, x: number, y: number, text?: string) => s.events.push({ t: s.t, kind, x, y, text });
function see(s: DominoState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  ev(s, 'new', 0.5, A * 0.45, text);
}
const inBox = (s: { boxes: Box[] }, x: number, y: number, pad = 0.012) => s.boxes.some((b) => x > b.x0 - pad && x < b.x1 + pad && y > b.y0 - pad && y < b.y1 + pad);
const cross = (ax: number, ay: number, bx: number, by: number, g: Gate) => {
  const d = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
  return d(ax, ay, bx, by, g.x0, g.y0) * d(ax, ay, bx, by, g.x1, g.y1) < 0 && d(g.x0, g.y0, g.x1, g.y1, ax, ay) * d(g.x0, g.y0, g.x1, g.y1, bx, by) < 0;
};
export const tPos = (q: Target, t: number) => (q.drift ? { x: q.x + Math.sin(t * 0.02 + q.drift) * 0.06, y: q.y } : { x: q.x, y: q.y });

/** 선을 따라 도미노를 놓는다 (p → q). 건물 안·다른 도미노와 너무 가까운 곳은 건너뛴다 */
function lay(s: Pick<DominoState, 'doms' | 'boxes' | 'left'>, from: { x: number; y: number }, to: { x: number; y: number }, mine: boolean) {
  const d = Math.hypot(to.x - from.x, to.y - from.y), a = Math.atan2(to.y - from.y, to.x - from.x), n = Math.floor(d / SP);
  let placed = 0;
  for (let i = 1; i <= n; i++) {
    if (mine && s.left <= 0) break;
    const x = from.x + Math.cos(a) * SP * i, y = from.y + Math.sin(a) * SP * i;
    if (x < 0.02 || x > 0.98 || y < 0.1 || y > A - 0.03 || inBox(s, x, y) || s.doms.some((o) => Math.hypot(o.x - x, o.y - y) < SP * 0.7)) continue;
    s.doms.push({ x, y, a, mine, fell: -1 });
    placed++;
    if (mine) s.left--;
  }
  // 끝점까지 반 칸 넘게 남으면 끝점에 하나 더 (선 끝이 목표에 꼭 닿게)
  if (d - SP * n > SP * 0.45 && (!mine || s.left > 0) && !inBox(s, to.x, to.y) && !s.doms.some((o) => Math.hypot(o.x - to.x, o.y - to.y) < SP * 0.7)) {
    s.doms.push({ x: to.x, y: to.y, a, mine, fell: -1 });
    placed++;
    if (mine) s.left--;
    return { placed, end: { x: to.x, y: to.y } };
  }
  return { placed, end: { x: from.x + Math.cos(a) * SP * n, y: from.y + Math.sin(a) * SP * n } };
}

function build(s: DominoState) {
  const r = mulberry32(s.seed * 7919 + s.k * 104729), k = s.k;
  s.doms = [];
  s.targets = [];
  s.gates = [];
  s.boxes = [];
  s.balls = [];
  // 건물 (2판부터): 길을 막는 블록
  for (let i = 0; i < (k >= 1 ? Math.min(6, 1 + k) : 0); i++) {
    const x0 = 0.08 + r() * 0.7, y0 = 0.3 + r() * (A - 0.55), bw = 0.08 + r() * 0.12, bh = 0.06 + r() * 0.12;
    s.boxes.push({ x0, y0, x1: Math.min(0.94, x0 + bw), y1: Math.min(A - 0.08, y0 + bh), h: 0.02 + r() * 0.03 });
  }
  const free = (x: number, y: number) => !inBox(s, x, y, 0.05);
  const spot = (y0: number, y1: number) => {
    for (let t = 0; t < 60; t++) {
      const x = 0.12 + r() * 0.76, y = y0 + r() * (y1 - y0);
      if (free(x, y) && !s.targets.some((q) => Math.hypot(q.x - x, q.y - y) < 0.16)) return { x, y };
    }
    return { x: 0.5, y: (y0 + y1) / 2 };
  };
  const st = spot(0.16, 0.3);
  s.doms.push({ x: st.x, y: st.y, a: Math.PI / 2, mine: false, fell: -1, start: true });
  // 목표
  const goals: TKind[] = ['bell'];
  if (k >= 1) goals.push('balloon');
  if (k >= 2) goals.push('balloon');
  if (k >= 6) goals.push('balloon');
  if (k >= 6) goals[0] = 'goldbell';
  for (const kind of goals) {
    const p = spot(0.55, A - 0.1);
    s.targets.push({ kind, x: p.x, y: p.y, hit: -1, drift: kind === 'balloon' && k >= 5 && s.targets.length === 1 ? r() * 6 : 0 });
  }
  // 버튼과 문 (4판부터): 종 앞을 문이 막고, 버튼을 넘어뜨려야 열린다
  if (k >= 3) {
    const b = s.targets[0], p = spot(0.35, 0.6);
    s.gates.push({ x0: b.x - 0.07, y0: b.y - 0.06, x1: b.x + 0.07, y1: b.y - 0.06, open: false });
    s.gates.push({ x0: b.x - 0.07, y0: b.y - 0.06, x1: b.x - 0.07, y1: b.y + 0.07, open: false });
    s.gates.push({ x0: b.x + 0.07, y0: b.y - 0.06, x1: b.x + 0.07, y1: b.y + 0.07, open: false });
    s.gates.push({ x0: b.x - 0.07, y0: b.y + 0.07, x1: b.x + 0.07, y1: b.y + 0.07, open: false });
    s.targets.push({ kind: 'switch', x: p.x, y: p.y, hit: -1, gate: 0 });
  }
  // 대포 (5판부터): 넘어지면 바라보는 쪽으로 공을 쏜다
  if (k >= 4) {
    const p = spot(0.3, 0.5), far = s.targets.find((q) => q.kind === 'balloon') ?? s.targets[0];
    s.targets.push({ kind: 'cannon', x: p.x, y: p.y, hit: -1, dir: Math.atan2(far.y - p.y, far.x - p.x) });
  }
  // 미리 깔린 도미노 줄: 첫 판은 시작부터 종까지 다 깔림(톡만 하면 됨), 그 뒤엔 목표 앞 짧은 줄만
  if (k === 0) lay({ doms: s.doms, boxes: s.boxes, left: 99 }, st, { x: s.targets[0].x, y: s.targets[0].y - 0.035 }, false);
  else {
    lay({ doms: s.doms, boxes: s.boxes, left: 99 }, st, { x: st.x + (r() - 0.5) * 0.2, y: st.y + 0.12 }, false);
    for (const q of s.targets) if (q.kind !== 'cannon') lay({ doms: s.doms, boxes: s.boxes, left: 99 }, { x: q.x + (r() - 0.5) * 0.12, y: q.y - 0.14 }, { x: q.x, y: q.y - 0.035 }, false);
  }
  s.budget = s.left = k === 0 ? 30 : 22 + 16 * s.targets.length - k;
  s.phase = 'build';
  s.phaseT = 0;
  s.chain = 0;
  s.last = null;
  if (k === 1) see(s, 'draw', '끊긴 곳에 선을 그어 도미노를 이어 주세요');
  if (s.targets.some((q) => q.kind === 'balloon')) see(s, 'balloon', '풍선도 터뜨려야 해요 — 길을 두 갈래로!');
  if (s.boxes.length) see(s, 'box', '건물엔 도미노를 놓을 수 없어요');
  if (s.gates.length) see(s, 'gate', '종이 울타리에 갇혔어요 — 버튼을 먼저 넘어뜨리면 열려요');
  if (s.targets.some((q) => q.kind === 'cannon')) see(s, 'cannon', '대포! 넘어지면 멀리 한 방에 날려요');
  if (s.targets.some((q) => q.drift)) see(s, 'drift', '풍선이 떠다녀요 — 때를 맞추세요');
  if (s.targets.some((q) => q.kind === 'goldbell')) see(s, 'gold', '황금 종 — 울리면 별 하나 더!');
}

/** 넘어짐 전파 한 틱 (게임과 봇의 시험 운전이 같이 쓴다) */
export function propagate(s: Pick<DominoState, 't' | 'doms' | 'targets' | 'gates' | 'balls' | 'chain' | 'lastFall'>, onEvent?: (kind: string, x: number, y: number, text?: string) => void) {
  const fresh = s.doms.filter((d) => d.fell >= 0 && s.t - d.fell === DELAY);
  for (const d of fresh) {
    for (const o of s.doms) {
      if (o.fell >= 0 || Math.hypot(o.x - d.x, o.y - d.y) > REACH) continue;
      if (s.gates.some((g) => !g.open && cross(d.x, d.y, o.x, o.y, g))) continue;
      o.fell = s.t;
      s.chain++;
      s.lastFall = s.t;
      if (s.chain % 10 === 0) onEvent?.('combo', o.x, o.y, `연쇄 ${s.chain}!`);
    }
    for (const q of s.targets) {
      const p = tPos(q, s.t);
      if (q.hit >= 0 || Math.hypot(p.x - d.x, p.y - d.y) > 0.06) continue;
      if (s.gates.some((g) => !g.open && cross(d.x, d.y, p.x, p.y, g))) continue;
      q.hit = s.t;
      s.lastFall = s.t;
      onEvent?.(q.kind, p.x, p.y);
      if (q.kind === 'switch') for (const g of s.gates) g.open = true;
      if (q.kind === 'cannon') s.balls.push({ x: q.x, y: q.y, vx: Math.cos(q.dir!) * 0.012, vy: Math.sin(q.dir!) * 0.012, life: 90 });
    }
  }
  // 문이 열리면 막혀 있던 도미노가 기대어 있다가 넘어간다
  if (s.gates.some((g) => g.open)) for (const d of s.doms) if (d.fell >= 0 && s.t - d.fell > DELAY && s.doms.some((o) => o.fell < 0 && Math.hypot(o.x - d.x, o.y - d.y) <= REACH)) d.fell = s.t - DELAY + 1;
  for (const b of s.balls) {
    b.x += b.vx;
    b.y += b.vy;
    b.life--;
    for (const o of s.doms) if (o.fell < 0 && Math.hypot(o.x - b.x, o.y - b.y) < 0.03) (o.fell = s.t), s.chain++, (s.lastFall = s.t);
    for (const q of s.targets) {
      const p = tPos(q, s.t);
      if (q.hit < 0 && q.kind !== 'cannon' && Math.hypot(p.x - b.x, p.y - b.y) < 0.05) (q.hit = s.t), (s.lastFall = s.t), onEvent?.(q.kind, p.x, p.y);
    }
  }
  s.balls = s.balls.filter((b) => b.life > 0);
}

const goalsOf = (s: Pick<DominoState, 'targets'>) => s.targets.filter((q) => q.kind === 'bell' || q.kind === 'balloon' || q.kind === 'goldbell');

export const domino: GameDef<DominoState> = {
  id: 'domino',
  name: '도미노 도시',
  genes: ['chain', 'territory', 'pointer'],
  twist: '그은 선을 따라 도미노가 줄지어 깔리고, 초록 도미노를 톡 치면 도시 전체를 도는 연쇄 쇼가 펼쳐진다',
  rules: ['손가락으로 그으면 그 길을 따라 도미노가 깔려요. 초록 도미노를 톡 치면 넘어가기 시작! (키보드: 화살표 + 스페이스)', '종과 풍선을 모두 울리고 터뜨리면 다음 판. 도미노를 적게 쓸수록 별이 많아요.', '못 닿으면 하트 -1, 같은 판 다시. 왼쪽 위 ↺ 를 누르면 내가 깐 도미노를 걷어요.'],
  controls: 'touch',
  hint: '그어서 깔기 · 초록 도미노 톡 / 화살표 + 스페이스',
  aspect: A,
  art: {
    concept: '장난감 도시의 도미노 쇼',
    mood: '위에서 내려다본 밤의 장난감 도시. 상아색 도미노가 골목을 따라 줄지어 서 있고, 넘어갈 때마다 딸깍 불빛이 번지며 종과 풍선이 차례로 터진다.',
    palette: { bg: '#1c2433', ink: '#fff8ec', muted: '#6c7a92', accent: '#52e08a', hot: '#ff5d6c', soft: '#2a3448' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = { rng: mulberry32(seed), t: 0, k: 0, seed, hearts: 3, stars: 0, lastStars: 0, total: 0, chain: 0, lastFall: 0, down: false, seen: new Set<string>(), events: [], dead: false, tapAt: null, ptr: null } as unknown as DominoState;
    build(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.phaseT++;
    s.events = s.events.filter((e) => s.t - e.t < 90);
    const p = inp.pointer ? { x: inp.pointer.x, y: inp.pointer.y * A } : null, press = !!p && !s.down;
    s.down = !!p;
    if (s.phase === 'clear' || s.phase === 'fail') {
      if (s.phaseT >= 120) {
        if (s.phase === 'clear') s.k++;
        else if (s.hearts <= 0) return void (s.dead = true);
        build(s);
      }
      return;
    }
    if (s.phase === 'build') {
      const start = s.doms.find((d) => d.start)!;
      // 톡(눌렀다 바로 뗌)과 긋기(누른 채 움직임)를 가른다: 초록 도미노·↺는 톡일 때만
      if (press && p) s.tapAt = { x: p.x, y: p.y, t: s.t };
      if (p && s.tapAt && Math.hypot(p.x - s.tapAt.x, p.y - s.tapAt.y) > 0.018) s.tapAt = null;
      const tap = !p && s.tapAt && s.t - s.tapAt.t < 30 ? s.tapAt : null;
      if (!p) s.tapAt = null;
      if (tap && tap.x > 0.86 && tap.y < 0.09) {
        // ↺ 내가 깐 도미노 걷기
        s.left = s.budget;
        s.doms = s.doms.filter((d) => !d.mine);
        ev(s, 'undo', 0.93, 0.05, '걷었어요');
      } else if ((tap && Math.hypot(tap.x - start.x, tap.y - start.y) < 0.06) || s.phaseT >= BUILD_TIME) {
        s.phase = 'run';
        s.phaseT = 0;
        start.fell = s.t;
        s.lastFall = s.t;
        s.last = null;
        ev(s, 'push', start.x, start.y, '톡!');
        return;
      } else if (p && !(p.x > 0.86 && p.y < 0.09)) {
        if (!s.last) s.last = p;
        else if (Math.hypot(p.x - s.last.x, p.y - s.last.y) >= SP) {
          const before = s.doms.length;
          s.last = lay(s, s.last, p, true).end;
          if (s.doms.length > before) ev(s, 'lay', p.x, p.y);
        }
      }
      if (!p) {
        // 손을 뗄 때 마지막 자리까지 반 칸 넘게 남았으면 거기에 하나 더 (선 끝이 꼭 닿게)
        if (s.last && s.ptr && Math.hypot(s.ptr.x - s.last.x, s.ptr.y - s.last.y) > SP * 0.45) lay(s, s.last, s.ptr, true);
        s.last = null;
      }
      s.ptr = p;
      return;
    }
    // 연쇄
    propagate(s, (kind, x, y, text) => {
      if (kind === 'combo') ev(s, 'combo', x, y, text);
      else ev(s, 'hit', x, y, kind === 'bell' || kind === 'goldbell' ? '딩동!' : kind === 'balloon' ? '펑!' : kind === 'switch' ? '문이 열려요!' : '쾅!');
    });
    if (s.t - s.lastFall > 50 && !s.balls.length) {
      const goals = goalsOf(s), ok = goals.every((q) => q.hit >= 0);
      s.phaseT = 0;
      s.total += s.chain;
      if (ok) {
        const ratio = s.left / s.budget, stars = Math.min(3, (ratio >= 0.5 ? 3 : ratio >= 0.25 ? 2 : 1) + (goals.some((q) => q.kind === 'goldbell') ? 1 : 0));
        s.phase = 'clear';
        s.stars += stars;
        s.lastStars = stars;
        ev(s, 'clear', 0.5, A * 0.4, `${s.k + 1}판 클리어! 연쇄 ${s.chain}`);
      } else {
        s.phase = 'fail';
        s.hearts--;
        ev(s, 'fail', 0.5, A * 0.4, `${goals.filter((q) => q.hit < 0).length}곳에 못 닿았어요 — 하트 -1`);
      }
    }
  },
  over: (s) => s.dead,
  score: (s) => s.total + s.stars * 10,
  draw(ctx, s, w, h, th: Theme) {
    const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
    ctx.save();
    fx.begin(ctx);
    // 밤의 장난감 도시: 아스팔트 + 골목 격자 + 가로등 빛
    ctx.fillStyle = th.bg;
    ctx.fillRect(-10, -10, w + 20, h + 20);
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    ctx.lineWidth = R(0.05);
    for (let k = 1; k < 5; k++) (ctx.beginPath(), ctx.moveTo(X(k * 0.2), 0), ctx.lineTo(X(k * 0.2), h), ctx.stroke(), ctx.beginPath(), ctx.moveTo(0, Y(k * 0.27)), ctx.lineTo(w, Y(k * 0.27)), ctx.stroke());
    for (let k = 0; k < 6; k++) {
      const x = X(((k * 0.37) % 1) * 0.9 + 0.05), y = Y(((k * 0.61) % 1) * A), lg = ctx.createRadialGradient(x, y, 0, x, y, R(0.16));
      lg.addColorStop(0, `rgba(255,214,140,${0.1 + 0.03 * Math.sin(s.t / 30 + k)})`);
      lg.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(x - R(0.16), y - R(0.16), R(0.32), R(0.32));
    }
    // 건물: 윗면 + 옆면 + 창문 불빛
    for (const b of s.boxes) {
      ctx.fillStyle = '#323d55';
      ctx.fillRect(X(b.x0), Y(b.y0) + R(b.h), R(b.x1 - b.x0), R(b.y1 - b.y0));
      ctx.fillStyle = '#4b5a7a';
      ctx.fillRect(X(b.x0), Y(b.y0), R(b.x1 - b.x0), R(b.y1 - b.y0));
      for (let wx = b.x0 + 0.015; wx < b.x1 - 0.01; wx += 0.025) for (let wy = b.y0 + 0.015; wy < b.y1 - 0.01; wy += 0.025) {
        ctx.fillStyle = (Math.floor(wx * 97 + wy * 61) + Math.floor(s.t / 90)) % 3 ? 'rgba(255,220,130,.75)' : 'rgba(20,25,40,.6)';
        ctx.fillRect(X(wx), Y(wy), R(0.01), R(0.01));
      }
    }
    for (const g of s.gates) {
      ctx.strokeStyle = g.open ? 'rgba(82,224,138,.25)' : '#ff9f43';
      ctx.lineWidth = g.open ? 2 : 4;
      ctx.setLineDash(g.open ? [4, 6] : []);
      ctx.beginPath();
      ctx.moveTo(X(g.x0), Y(g.y0));
      ctx.lineTo(X(g.x1), Y(g.y1));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // 목표
    for (const q of s.targets) {
      const p = tPos(q, s.t), x = X(p.x), y = Y(p.y), hit = q.hit >= 0;
      if (q.kind === 'bell' || q.kind === 'goldbell') {
        const sw = hit ? Math.sin((s.t - q.hit) / 3) * Math.max(0, 1 - (s.t - q.hit) / 90) * 0.6 : 0;
        ctx.save();
        ctx.translate(x, y - R(0.02));
        ctx.rotate(sw);
        ctx.shadowColor = '#ffd23f';
        ctx.shadowBlur = hit ? 24 : 10;
        ctx.fillStyle = q.kind === 'goldbell' ? '#ffcf3d' : '#f2c14e';
        ctx.beginPath();
        ctx.moveTo(-R(0.03), R(0.03));
        ctx.quadraticCurveTo(-R(0.03), -R(0.035), 0, -R(0.035));
        ctx.quadraticCurveTo(R(0.03), -R(0.035), R(0.03), R(0.03));
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#8a5a1a';
        ctx.beginPath();
        ctx.arc(0, R(0.034), R(0.008), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (q.kind === 'balloon') {
        if (hit) continue;
        const bob = Math.sin(s.t / 20 + q.x * 10) * 3;
        ctx.strokeStyle = 'rgba(255,255,255,.5)';
        ctx.beginPath();
        ctx.moveTo(x, y + R(0.03) + bob);
        ctx.lineTo(x, y + R(0.06));
        ctx.stroke();
        ctx.fillStyle = `hsl(${(q.x * 900) % 360},85%,62%)`;
        ctx.beginPath();
        ctx.ellipse(x, y + bob, R(0.024), R(0.03), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.beginPath();
        ctx.arc(x - R(0.008), y - R(0.01) + bob, R(0.006), 0, Math.PI * 2);
        ctx.fill();
      } else if (q.kind === 'switch') {
        ctx.fillStyle = '#2a2f3a';
        ctx.fillRect(x - R(0.025), y - R(0.015), R(0.05), R(0.03));
        ctx.fillStyle = hit ? th.accent : th.hot;
        ctx.beginPath();
        ctx.arc(x, y, R(hit ? 0.009 : 0.014), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(q.dir!);
        ctx.fillStyle = '#555c6b';
        ctx.fillRect(0, -R(0.012), R(0.05), R(0.024));
        ctx.fillStyle = '#3a3f4a';
        ctx.beginPath();
        ctx.arc(0, 0, R(0.022), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    // 도미노 (위에서 본 모습): 서 있으면 길을 가로지르는 얇은 패, 넘어지면 앞으로 누운 넓은 패
    for (const d of s.doms) {
      const fall = d.fell < 0 ? 0 : Math.min(1, (s.t - d.fell) / DELAY);
      ctx.save();
      ctx.translate(X(d.x), Y(d.y));
      ctx.rotate(d.a);
      const across = R(0.03), along = R(0.008) + fall * R(0.028), fwd = fall * R(0.014);
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.fillRect(fwd - along / 2 + 2, -across / 2 + 2, along, across);
      if (fall > 0 && fall < 1) (ctx.shadowColor = '#ffe9a0'), (ctx.shadowBlur = 16);
      ctx.fillStyle = d.start ? '#52e08a' : fall >= 1 ? (d.mine ? '#d9ccaa' : '#c8bb98') : d.mine ? '#fff6dc' : '#ece0c4';
      ctx.fillRect(fwd - along / 2, -across / 2, along, across);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#2a2a2a';
      if (fall >= 0.5) for (const py of [-0.3, 0, 0.3]) ctx.fillRect(fwd - 1, py * across - 1, 2.5, 2.5);
      else ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    }
    const start = s.doms.find((d) => d.start);
    if (start && s.phase === 'build') {
      ctx.strokeStyle = th.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(X(start.x), Y(start.y), R(0.035 + 0.008 * Math.sin(s.t / 8)), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffcf6a';
    for (const b of s.balls) (ctx.beginPath(), ctx.arc(X(b.x), Y(b.y), R(0.012), 0, Math.PI * 2), ctx.fill(), fx.burst(X(b.x), Y(b.y), '#ffcf6a', 1, 1, 2));
    const seenT = fx.memo.t ?? -1;
    for (const e of s.events) {
      if (e.t <= seenT) continue;
      if (e.kind === 'lay') fx.burst(X(e.x), Y(e.y), '#fff6dc', 2, 1.2, 1.5);
      if (e.kind === 'push') fx.ring(X(e.x), Y(e.y), th.accent, 60, 4), fx.pop(X(e.x), Y(e.y) - 16, e.text!, th.accent, 18);
      if (e.kind === 'combo') fx.pop(X(e.x), Y(e.y) - 12, e.text!, '#ffe9a0', 16), fx.kick(3);
      if (e.kind === 'hit') fx.ring(X(e.x), Y(e.y), '#ffd23f', 90, 6), fx.burst(X(e.x), Y(e.y), e.text === '펑!' ? '#ff8fc8' : '#ffd23f', 26, 4.5, 3), fx.pop(X(e.x), Y(e.y) - 22, e.text!, '#ffffff', 20), fx.kick(6);
      if (e.kind === 'clear') {
        fx.blink('#fff6c8', 0.3);
        for (let k = 0; k < 7; k++) fx.burst(X(0.1 + k * 0.13), Y(0.2), `hsl(${k * 50},95%,65%)`, 16, 5, 3.5);
        fx.pop(w / 2, h * 0.4, e.text!, '#ffe066', 24);
      }
      if (e.kind === 'fail') fx.kick(10), fx.blink(th.hot, 0.3), fx.pop(w / 2, h * 0.4, e.text!, th.hot, 16);
      if (e.kind === 'undo') fx.pop(X(e.x) - 20, Y(e.y) + 20, e.text!, th.ink, 13);
      if (e.kind === 'new') fx.pop(w / 2, h * 0.5, e.text!, '#9dffcf', 15);
    }
    fx.memo.t = s.t;
    ctx.restore();
    // 머리말
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = th.ink;
    ctx.font = `900 ${R(0.045)}px system-ui, sans-serif`;
    ctx.fillText(`${s.k + 1}판 · 도미노 ${s.left}/${s.budget}`, 10, 10);
    ctx.font = `700 ${R(0.032)}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffe066';
    ctx.fillText(`★ ${s.stars} · 총 연쇄 ${s.total + (s.phase === 'run' ? s.chain : 0)}`, 10, 14 + R(0.045));
    ctx.textAlign = 'right';
    ctx.fillStyle = th.hot;
    ctx.font = `700 ${R(0.042)}px system-ui, sans-serif`;
    ctx.fillText('♥'.repeat(Math.max(0, s.hearts)), w - 46, 12);
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    ctx.fillRect(X(0.88), 8, X(0.1), R(0.07));
    ctx.fillStyle = th.ink;
    ctx.font = `900 ${R(0.05)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('↺', X(0.93), 10);
    if (s.phase === 'clear') (ctx.fillStyle = '#ffe066'), (ctx.font = `900 ${R(0.09)}px system-ui, sans-serif`), ctx.fillText('★'.repeat(s.lastStars) + '☆'.repeat(3 - s.lastStars), w / 2, h * 0.46);
    if (s.phase === 'build' && s.k === 0) (ctx.fillStyle = th.ink), (ctx.font = `800 ${R(0.042)}px system-ui, sans-serif`), ctx.fillText('👆 초록 도미노를 톡!', start ? X(start.x) : w / 2, start ? Y(start.y) + R(0.05) : h / 2);
  },
};

const memo = new WeakMap<object, { x: number; y: number; a: number }>();
/** 봇: 아무렇게나 긋다가 아무 때나 초록 도미노를 친다 */
export const dominoRandom: Bot<DominoState> = {
  name: '아무 데나',
  act(s, rng) {
    if (s.phase !== 'build') return { tap: false, dir: 0, pointer: null };
    let m = memo.get(s);
    if (!m) memo.set(s, (m = { x: 0.5, y: 0.5, a: 0 }));
    if (s.phaseT > 60 * 8 && rng() < 0.02) {
      const st = s.doms.find((d) => d.start)!;
      return { tap: false, dir: 0, pointer: s.down ? null : { x: st.x, y: st.y / A } };
    }
    m.a += (rng() - 0.5) * 0.7;
    m.x = Math.max(0.03, Math.min(0.97, m.x + Math.cos(m.a) * 0.01));
    m.y = Math.max(0.1, Math.min(0.97, m.y + Math.sin(m.a) * 0.01));
    if (m.x <= 0.03 || m.x >= 0.97 || m.y <= 0.1 || m.y >= 0.97) m.a += Math.PI / 2;
    return { tap: false, dir: 0, pointer: s.t % 90 < 60 ? { x: m.x, y: m.y } : null };
  },
};

/** 시험 운전: 지금 깔린 대로 톡 치면 어디까지 넘어가나 (봇용) */
function dryRun(s: DominoState, extra: Dom[]) {
  const sim = { t: 0, doms: [...s.doms, ...extra].map((d) => ({ ...d, fell: d.start ? 0 : -1 })), targets: s.targets.map((q) => ({ ...q, hit: -1 })), gates: s.gates.map((g) => ({ ...g, open: false })), balls: [] as Ball[], chain: 0, lastFall: 0 };
  for (; sim.t < 1200 && sim.t - sim.lastFall < 60; sim.t++) propagate(sim);
  return sim;
}

/** 건물을 돌아가는 길 (0.03 격자 너비 우선 탐색 → 꺾이는 점만 남김) */
function detour(s: DominoState, from: { x: number; y: number }, to: { x: number; y: number }) {
  const G = 0.03, W = Math.ceil(1 / G), H = Math.ceil(A / G), idx = (x: number, y: number) => y * W + x;
  const cell = (p: { x: number; y: number }) => [Math.min(W - 1, Math.max(0, Math.round(p.x / G))), Math.min(H - 1, Math.max(0, Math.round(p.y / G)))];
  const [sx, sy] = cell(from), [tx, ty] = cell(to), prev = new Int32Array(W * H).fill(-2), q = [idx(sx, sy)];
  prev[q[0]] = -1;
  while (q.length) {
    const c = q.shift()!, x = c % W, y = Math.floor(c / W);
    if (x === tx && y === ty) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy, n = idx(nx, ny);
      if (nx < 1 || nx >= W - 1 || ny < 4 || ny >= H - 1 || prev[n] !== -2 || inBox(s, nx * G, ny * G, 0.035)) continue;
      prev[n] = c;
      q.push(n);
    }
  }
  if (prev[idx(tx, ty)] === -2) return null;
  const cells: number[] = [];
  for (let c = idx(tx, ty); c >= 0; c = prev[c]) cells.unshift(c);
  const pts = [from];
  for (let i = 1; i < cells.length - 1; i++) {
    const a0 = cells[i - 1], a1 = cells[i], a2 = cells[i + 1];
    if (a1 - a0 !== a2 - a1) pts.push({ x: (a1 % W) * G, y: Math.floor(a1 / W) * G });
  }
  pts.push(to);
  return pts;
}

/**
 * 봇: 시험 운전으로 아직 못 닿는 목표(버튼·대포 먼저)를 찾고, 이미 넘어가는 도미노 중 가장 가까운 것에서 그 목표까지
 * 곧게(건물이 막으면 ㄱ자로) 잇는 선을 계획한다. 계획한 선을 사람 손 빠르기로 긋고, 다 그으면 초록 도미노를 톡.
 */
const plans = new WeakMap<object, { k: number; lines: { x: number; y: number }[][]; li: number; pi: number; pushed: boolean; gap: boolean }>();
export const dominoSmart: Bot<DominoState> = {
  name: '도미노 장인',
  act(s) {
    if (s.phase !== 'build') return { tap: false, dir: 0, pointer: null };
    let pl = plans.get(s);
    if (!pl || pl.k !== s.k * 100 + s.hearts) {
      const lines: { x: number; y: number }[][] = [], extra: Dom[] = [];
      let left = s.left;
      const skip = new Set<Target>();
      for (let guard = 0; guard < 10; guard++) {
        const sim = dryRun(s, extra), fallen = sim.doms.filter((d) => d.fell >= 0);
        // 작은 틈(한 칸 반 이내)은 가운데에 도미노 하나로 메운다
        const standing = sim.doms.filter((d) => d.fell < 0);
        const gap = fallen.flatMap((f) => standing.map((o) => ({ f, o, d: Math.hypot(o.x - f.x, o.y - f.y) }))).filter((g) => g.d > REACH && g.d < REACH * 1.9).sort((x, y) => x.d - y.d)[0];
        if (gap && left > 0) {
          const m = { x: (gap.f.x + gap.o.x) / 2, y: (gap.f.y + gap.o.y) / 2 };
          if (!inBox(s, m.x, m.y)) {
            extra.push({ x: m.x, y: m.y, a: Math.atan2(gap.o.y - gap.f.y, gap.o.x - gap.f.x), mine: true, fell: -1 });
            left--;
            lines.push([{ x: gap.f.x, y: gap.f.y }, m]);
            continue;
          }
        }
        const pick = (q: Target) => !skip.has(s.targets[sim.targets.indexOf(q)]);
        const need = [...sim.targets.filter((q) => q.hit < 0 && pick(q) && (q.kind === 'switch' || q.kind === 'cannon')), ...sim.targets.filter((q) => q.hit < 0 && pick(q) && q.kind !== 'switch' && q.kind !== 'cannon')];
        if (!need.length || left <= 0) break;
        let best: { from: Dom; q: Target; d: number } | null = null;
        for (const q of need) for (const f of fallen) {
          const d = Math.hypot(q.x - f.x, q.y - f.y);
          if (!best || d < best.d) best = { from: f, q, d };
        }
        if (!best) break;
        const to = { x: best.q.x, y: best.q.y - (best.q.kind === 'bell' || best.q.kind === 'goldbell' ? 0.035 : 0.03) };
        const tryLine = (pts: { x: number; y: number }[]) => {
          const tmp = { doms: [...s.doms, ...extra], boxes: s.boxes, left };
          const n0 = tmp.doms.length;
          for (let i = 1; i < pts.length; i++) lay(tmp, pts[i - 1], pts[i], true);
          return { added: tmp.doms.slice(n0), left: tmp.left, blocked: pts.some((p, i) => i > 0 && [...Array(10).keys()].some((j) => inBox(s, pts[i - 1].x + ((p.x - pts[i - 1].x) * j) / 9, pts[i - 1].y + ((p.y - pts[i - 1].y) * j) / 9))) };
        };
        const from = { x: best.from.x, y: best.from.y };
        let plan = [from, to], res = tryLine(plan);
        if (res.blocked) {
          const route = detour(s, from, to);
          if (route) (plan = route), (res = tryLine(plan));
        }
        if (!res.added.length) { skip.add(s.targets[sim.targets.indexOf(best.q)]); continue; }
        extra.push(...res.added);
        left = res.left;
        lines.push([from, ...res.added.map((d) => ({ x: d.x, y: d.y }))]); // 그을 점 = 시작 도미노 + 계획한 도미노 자리들
      }
      plans.set(s, (pl = { k: s.k * 100 + s.hearts, lines, li: 0, pi: 0, pushed: false, gap: false }));
    }
    // 선 긋기: 계획한 도미노 자리를 한 칸씩(0.05초에 한 칸 ≈ 사람 손 빠르기) 짚어 가고, 선 사이엔 한 번 뗀다
    if (pl.li < pl.lines.length) {
      if (pl.gap) return (pl.gap = false), { tap: false, dir: 0, pointer: null };
      const line = pl.lines[pl.li], pt = line[pl.pi];
      if (++pl.pi >= line.length) (pl.li++, (pl.pi = 0), (pl.gap = true));
      return { tap: false, dir: 0, pointer: { x: pt.x, y: pt.y / A } };
    }
    if (s.down) return { tap: false, dir: 0, pointer: null };
    const st = s.doms.find((d) => d.start)!;
    return { tap: false, dir: 0, pointer: { x: st.x, y: st.y / A } };
  },
};
